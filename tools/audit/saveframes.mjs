// saveframes.mjs — census of the two nested-call save frames at em+0x73b4/0x73b5/0x73b8
// (frame A) and em+0x73c0/0x73c1/0x73c4 (frame B), MHGU main 1.4.0 ARMv7. Read-only.
//
// All frame offsets are > 0xFFF, so the immediate-offset imm12 form cannot encode them;
// lane I proves that sweep with a decode-volume control instead of trusting the zero.
//
// Lanes:
//   W   movw rD,#imm16 (imm4:imm12) of a frame offset — the producer idiom; marked
//       W-data when the offset constant itself is immediately stored as data
//   A1  register-index access [rB,rC] with rC holding a frame movw: word/byte
//       (bits 27-25=011, bit4=0) and halfword (27-25=000, bit22=0, 11-8=0, 7-4=1011)
//   F   folded `add rD,rB,rC` (plain) or `mov rD,rC` copy forming a base; bases survive
//       one stack spill/reload pair ([sp,#imm])
//   A2  immediate access of any width on a folded base (decoder-parsed imm, U-signed)
//   WB  writeback load [rn,rm]! with rm = movw of a LIVE-mirror offset (0x72f8/0x72fc/
//       0x72fd) -> base rn, then immediate store [rn,#d] into a frame slot with the
//       same data register (the fn-0x879dc save idiom: 0x87ab4 strb [r2,#196]=0x73c1,
//       0x87abc str [r2,#199]=0x73c4)
//   B   b-tail: movw#frame immediately followed by b TARGET where a folded load lives
//       -> the shared fold+ldr reads that offset too (0x8dc90 b 0x8debc, 0x95d9c b 0x95e78)
//   I   decoder sweep: any immediate access whose decoded imm equals a frame offset (0)
// Every write is classified against the last def of its data register (160-insn walk,
// stopping at push-lr): mov #0 => [ZERO-INIT] (initializer sweeps, not nested-call saves).
// Controls: movw sites 0x8dc74 (frame A restore) and 0x8deb8 (frame B restore); exit 1
// without both.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('NESTED-CALL SAVE FRAMES em+0x73b4/73b5/73b8 (A) and em+0x73c0/73c1/73c4 (B)');
console.log('IMAGE', IMG);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
console.log('SHA256', sha, 'bytes', buf.length);
if (sha !== 'a8cfb11465470184c9ed191ec28283dfb73d2adbcfeb878398f5103f1357d515') {
  console.log('IMAGE-HASH-MISMATCH: refusing to scan');
  process.exit(1);
}

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
const D = (w, a) => (decode ? decode(w, a) : '0x' + (w >>> 0).toString(16));
const hex = (n) => '0x' + (n >>> 0).toString(16);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

// ---- function starts: stmdb sp!, {...,lr} (E92Dxxxx, bit 14 set) ----
const pushLr = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w & 0xFFFF0000) >>> 0) === 0xE92D0000 && (w & 0x4000)) pushLr.push(v);
}
const pushLrSet = new Set(pushLr);
const fnStart = (v) => {
  let lo = 0, hi = pushLr.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pushLr[mid] <= v) { best = pushLr[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
};

// ---- the two frames ----
const FRAME = { 0x73b4: 'A', 0x73b5: 'A', 0x73b8: 'A', 0x73c0: 'B', 0x73c1: 'B', 0x73c4: 'B' };
const MIRROR = {
  0x73b4: 'mirrors em[0x72fc] section', 0x73b5: 'mirrors em[0x72fd] entry', 0x73b8: 'mirrors em[0x72f8] script',
  0x73c0: 'mirrors em[0x72fc] section', 0x73c1: 'mirrors em[0x72fd] entry', 0x73c4: 'mirrors em[0x72f8] script',
};
const LIVE = new Set([0x72f8, 0x72fc, 0x72fd]);
const CONTROL = { 0x8dc74: 'frame A 0x73b4 restore', 0x8deb8: 'frame B 0x73c4 restore (folded tail)' };

// ---- state ----
const pending = new Map();    // reg -> {imm, addr, age}   frame movw results
const allMovw = new Map();    // reg -> {imm, age}         every movw (any imm)
const addrReg = new Map();    // reg -> {imm, addr, age}   bases (fold / copy / reload)
const wbBase = new Map();     // reg -> {idxOff, dataReg, age}  writeback-load bases
const spill = new Map();      // [sp,#imm] -> {imm, addr}  spilled folded bases
const bTails = [];            // {movwV, imm, target}
const sites = [];
const consumed = new Set();   // movw addresses that reached an access
const ctrlFound = new Set();
let immBig = 0;
const imm12hits = [];

const isFrameMovw = (w) =>
  ((w >>> 16) & 0xFFF0) === 0xE300 && (w & 0x0FF00000) === 0x03000000 &&
  FRAME[(((w >>> 16) & 0xF) << 12) | (w & 0xFFF)] !== undefined;

function lastDef(v, reg) {
  for (let k = 1; k <= 160; k++) {
    const a = v - 4 * k;
    if (a < TEXT_START) return null;
    if (pushLrSet.has(a)) return null;   // function boundary
    const mn = D(W(a), a);
    if (/^(str|strb|strh|stm|push)\b/.test(mn)) continue;
    const m = /^(mov|movw|mvn|ldr|ldrb|ldrh|add|sub|rsb|and|orr|eor|bic|adr|uxtab|uxtah)\s+r(\d+)\b/.exec(mn);
    if (m && Number(m[2]) === reg) {
      if (/^mov r\d+, #0$/.test(mn)) return { zero: true, at: a, mn };
      return { zero: false, at: a, mn };
    }
  }
  return null;
}

for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);

  if (pushLrSet.has(v)) {   // function boundary: no cross-fn value tracking
    pending.clear(); allMovw.clear(); addrReg.clear(); wbBase.clear(); spill.clear(); bTails.length = 0;
  }
  for (const [r, o] of pending) { o.age++; if (o.age > 12) pending.delete(r); }
  for (const [r, o] of allMovw) { o.age++; if (o.age > 12) allMovw.delete(r); }
  for (const [r, o] of addrReg) { o.age++; if (o.age > 12) addrReg.delete(r); }
  for (const [r, o] of wbBase) { o.age++; if (o.age > 12) wbBase.delete(r); }

  const mn = D(w, v);

  // ---- lane I: decoded immediate access whose imm equals a frame offset (must be 0) ----
  if (/^(ldr|str|ldrb|strb|ldrh|strh|vldr|vstr)\b/.test(mn)) {
    const im = /#(-?)(0x[0-9a-f]+|\d+)\]?$/.exec(mn);
    if (im) {
      const n = (im[1] ? -1 : 1) * (im[2].startsWith('0x') ? parseInt(im[2], 16) : parseInt(im[2], 10));
      if (Math.abs(n) >= 0x400) immBig++;
      if (FRAME[Math.abs(n)] !== undefined) imm12hits.push({ v, mn });
    }
  }

  // ---- W: movw of a frame offset (or any movw for allMovw) ----
  if (((w >>> 16) & 0xFFF0) === 0xE300 && (w & 0x0FF00000) === 0x03000000) {
    const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF);
    const rd = (w >>> 12) & 15;
    // W-data: ONLY if the very next word stores rd as data (offset-as-data table init)
    const wn = W(v + 4), mnN = D(wn, v + 4);
    const st = /^(str|strb|strh)\s+r(\d+),/.exec(mnN);
    if (FRAME[imm] !== undefined && st && Number(st[2]) === rd) {
      sites.push({ kind: 'W-data', v, imm, mn: mn + ' ; ' + mnN, note: `frame offset ${hex(imm)} stored as DATA by ${mnN}` });
      consumed.add(v);
      continue;                      // still no pending: not an em access
    }
    allMovw.set(rd, { imm, age: 0 });
    if (FRAME[imm] !== undefined) {
      sites.push({ kind: 'W', v, imm, mn, note: `movw of frame ${FRAME[imm]} offset ${hex(imm)} (${MIRROR[imm]})` });
      if (CONTROL[v]) ctrlFound.add(v);
      pending.set(rd, { imm, addr: v, age: 0 });
      addrReg.delete(rd); wbBase.delete(rd);
      // b-tail: unconditional branch next -> shared fold ahead may read this offset
      const wb2 = W(v + 4);
      if (((wb2 >>> 28) & 0xF) === 0xE && ((wb2 >>> 25) & 7) === 5) {   // b (AL)
        const off = (wb2 & 0x7FFFFF) - ((wb2 & 0x800000) ? 0x800000 : 0);
        const target = (v + 8 + (off << 2)) >>> 0;
        bTails.push({ movwV: v, imm, target });
      }
    } else {
      pending.delete(rd); addrReg.delete(rd);
    }
    continue;
  }

  // ---- F: folded add rD,rB,rC (plain, no shift) / mov rD,rC copy ----
  if (((w & 0x0FE00000) >>> 0) === 0x00800000 && (w & 0xFF0) === 0) {
    const rd = (w >>> 12) & 15, rm = w & 15;
    if (pending.has(rm)) {
      const p = pending.get(rm);
      sites.push({ kind: 'F', v, imm: p.imm, mn, note: `folds movw@${hex(p.addr)} -> base em+${hex(p.imm)}` });
      addrReg.set(rd, { imm: p.imm, addr: p.addr, age: 0 });
      pending.delete(rm);
      continue;
    }
    if (addrReg.has(rm)) {           // base copy (add)
      const a = addrReg.get(rm);
      addrReg.set(rd, { imm: a.imm, addr: a.addr, age: 0 });
      continue;
    }
  }
  // mov rD, rC (plain MOV, no shift/imm): base copy of folded bases and of any movw
  if (((w & 0x0DE00000) >>> 0) === 0x01A00000 && (w & 0xFF0) === 0) {
    const rd = (w >>> 12) & 15, rm = w & 15;
    if (addrReg.has(rm)) { const a = addrReg.get(rm); addrReg.set(rd, { imm: a.imm, addr: a.addr, age: 0 }); continue; }
    if (pending.has(rm)) {           // mov of a frame movw = un-folded copy: keep as pending-equivalent base
      const p = pending.get(rm);
      addrReg.set(rd, { imm: p.imm, addr: p.addr, age: 0 });
      pending.delete(rm);
      continue;
    }
  }
  // base spill/reload through [sp,#imm]
  if (((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0 && ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 0) {
    const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15, isL = (w >>> 20) & 1;
    if (rn === 13) {
      if (!isL && addrReg.has(rd)) spill.set(w & 0xFFF, addrReg.get(rd));
      else if (isL && spill.has(w & 0xFFF)) { const a = spill.get(w & 0xFFF); addrReg.set(rd, { imm: a.imm, addr: a.addr, age: 0 }); }
    }
  }

  // ---- A1: register-index access [rB,rC], rC = pending frame movw ----
  const b2725 = (w >>> 25) & 7;
  const wordByteReg = b2725 === 3 && (w & 0xFF0) === 0 && ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 0;
  const halfReg = b2725 === 0 && ((w >>> 22) & 1) === 0 && (w & 0xF00) === 0 && (w & 0xF0) === 0xB0;
  if (wordByteReg || halfReg) {
    const rm = w & 15;
    if (pending.has(rm)) {
      const p = pending.get(rm);
      const isL = ((w >>> 20) & 1) === 1;
      const isB = ((w >>> 22) & 1) === 1;
      const width = halfReg ? 'h' : (isB ? 'b' : 'w');
      const d = isL ? null : lastDef(v, (w >>> 12) & 15);
      sites.push({ kind: 'A', v, imm: p.imm, mn,
        note: `${isL ? 'read' : 'write'}${width} of em[${hex(p.imm)}] (${MIRROR[p.imm]}) via [rB,r${rm}], movw@${hex(p.addr)}`, zero: d && d.zero, def: d });
      consumed.add(p.addr);
      if (CONTROL[v]) ctrlFound.add(v);
    }
  }

  // ---- WB: pre-indexed writeback load [rn,rm]!, rm = any movw ----
  if (b2725 === 3 && ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 1 && (w & 0xFF0) === 0 && ((w >>> 20) & 1) === 1) {
    const rn = (w >>> 16) & 15, rm = w & 15, rd = (w >>> 12) & 15;
    if (allMovw.has(rm)) {
      wbBase.set(rn, { idxOff: allMovw.get(rm).imm, dataReg: rd, age: 0 });
    }
  }
  // WB-store: immediate store [rn,#d] on a WB base, data reg = the loaded one
  if (b2725 === 2 && ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 0) {
    const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
    if (wbBase.has(rn)) {
      const b = wbBase.get(rn);
      const d = (w & 0xFFF) * (((w >>> 23) & 1) ? 1 : -1);
      const tgt = (b.idxOff + d) >>> 0;
      if (FRAME[tgt] !== undefined && b.dataReg === rd) {
        const dd = lastDef(v, rd);
        sites.push({ kind: 'A', v, imm: tgt, mn,
          note: `write of em[${hex(tgt)}] (${MIRROR[tgt]}) via wb base em+${hex(b.idxOff)}+${d}`, zero: dd && dd.zero, def: dd });
      }
    }
  }

  // ---- A2: immediate access of any width on a folded base ----
  const wordByteImm = b2725 === 2 && ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 0;
  const halfImm = b2725 === 0 && ((w >>> 22) & 1) === 0 && (w & 0xF0) === 0xB0 && (w & 0xF00) !== 0;
  if (wordByteImm || halfImm) {
    const rn = (w >>> 16) & 15;
    if (rn !== 15 && addrReg.has(rn)) {
      const a = addrReg.get(rn);
      const isL = ((w >>> 20) & 1) === 1;
      const dd = isL ? null : lastDef(v, (w >>> 12) & 15);
      sites.push({ kind: 'A', v, imm: a.imm, mn,
        note: `${isL ? 'read' : 'write'} of em[${hex(a.imm)}] (${MIRROR[a.imm]}) via folded base (movw@${hex(a.addr)})`, zero: dd && dd.zero, def: dd });
      consumed.add(a.addr);
    }
  }

  // ---- b-tail reads: fold+consumer serving an earlier movw+b ----
  if (/^ldr\b/.test(mn)) {
    for (const bt of bTails) {
      if (bt.done) continue;
      if (bt.target <= v && v <= bt.target + 0x3C) {
        sites.push({ kind: 'A', v, imm: bt.imm, mn,
          note: `read of em[${hex(bt.imm)}] (${MIRROR[bt.imm]}) via b-tail from movw@${hex(bt.movwV)} sharing this fold` });
        consumed.add(bt.movwV);
        bt.done = true;
      }
    }
  }

  // ---- kill redefinitions ----
  if (/^(bl|blx)\b/.test(mn)) {
    for (let r = 0; r < 4; r++) { pending.delete(r); allMovw.delete(r); addrReg.delete(r); wbBase.delete(r); }
  }
  if (/^(mov|mvn|ldr|ldrb|ldrh|add|sub|rsb|and|orr|eor|bic|adr|pop|ldm|uxtah|uxtab)\b/.test(mn)) {
    const mm = /\s+r(\d+)\s*[,;{]/.exec(mn);
    if (mm && !/^(str|strb|strh|stm|push)\b/.test(mn)) {
      const rd = Number(mm[1]);
      pending.delete(rd); allMovw.delete(rd); addrReg.delete(rd); wbBase.delete(rd);
    }
  }
}

// ---- site table ----
console.log('\n== Site table (W movw producer / W-data offset-as-data / F folded base / A access) ==');
for (const s of sites) {
  const zw = s.kind === 'A' && s.note.startsWith('write')
    ? (s.zero ? ' [ZERO-INIT def@' + hex(s.def.at) + ' ' + s.def.mn + ']' : ' [def ' + (s.def ? hex(s.def.at) + ' ' + s.def.mn : 'not-found-in-walk') + ']')
    : '';
  console.log(`  ${s.kind.padEnd(7)} ${hex(s.v)}  ${s.mn}  | ${s.note}${zw} | fn ${hex(fnStart(s.v))}`);
}
console.log(`sites: ${sites.length} (W=${sites.filter(s => s.kind === 'W').length}, W-data=${sites.filter(s => s.kind === 'W-data').length}, F=${sites.filter(s => s.kind === 'F').length}, A=${sites.filter(s => s.kind === 'A').length})`);

console.log('\n== Lane I: immediate-offset accesses at a frame offset ==');
console.log(`  hits: ${imm12hits.length}` + (imm12hits.length ? ' ' + imm12hits.map(h => `${hex(h.v)} ${h.mn}`).join('; ') : ' (none — expected: offsets > 0xFFF not encodable)'));
console.log(`  lane I control: decoded immediate accesses with |imm| >= 0x400: ${immBig}` + (immBig > 1000 ? ' (matcher alive)' : ' (MATCHER SUSPECT)'));

// ---- controls ----
console.log('\n== Controls ==');
const missing = Object.keys(CONTROL).map(Number).filter(a => !ctrlFound.has(a));
if (missing.length) {
  console.log('CONTROL-FAIL missing ' + missing.map(hex).join(', ') + ' — every count above is meaningless');
  process.exit(1);
}
for (const a of Object.keys(CONTROL)) console.log(`  CONTROL-PASS ${hex(+a)} ${CONTROL[a]}`);

// ---- per-field writers / readers ----
console.log('\n== Per-field census (kind A accesses) ==');
for (const off of Object.keys(FRAME).map(Number).sort((x, y) => x - y)) {
  const wr = sites.filter(s => s.kind === 'A' && s.imm === off && s.note.startsWith('write'));
  const rd = sites.filter(s => s.kind === 'A' && s.imm === off && s.note.startsWith('read'));
  const zw = wr.filter(s => s.zero).length;
  console.log(`  em[${hex(off)}] frame ${FRAME[off]}: writers ${wr.length} (of which ZERO-INIT ${zw}) [${wr.map(s => hex(s.v)).join(' ')}]`);
  console.log(`             readers ${rd.length} [${rd.map(s => hex(s.v)).join(' ')}]`);
}

// ---- grouping by function ----
console.log('\n== Grouping by function (kind A accesses) ==');
const byFn = new Map();
for (const s of sites) {
  if (s.kind !== 'A') continue;
  const f = fnStart(s.v);
  if (!byFn.has(f)) byFn.set(f, new Map());
  const m = byFn.get(f);
  if (!m.has(s.imm)) m.set(s.imm, []);
  m.get(s.imm).push(s);
}
for (const [f, m] of [...byFn.entries()].sort((a, b) => a[0] - b[0])) {
  const all = [...m.values()].flat();
  const frames = [...new Set(all.map(s => FRAME[s.imm]))];
  const reads = all.filter(s => s.note.startsWith('read'));
  const writes = all.filter(s => s.note.startsWith('write'));
  const realWrites = writes.filter(s => !s.zero);
  const role = reads.length && realWrites.length ? 'BOTH save+restore'
    : realWrites.length ? 'SAVE only'
    : writes.length ? 'ZERO-INIT only (initializer sweep)'
    : 'RESTORE only';
  console.log(`  fn ${hex(f)}  frames[${frames.join(',')}]  role: ${role}`);
  console.log(`     reads : ${reads.map(s => `${hex(s.v)}(${hex(s.imm)})`).join(' ') || '-'}`);
  console.log(`     writes: ${writes.map(s => `${hex(s.v)}(${hex(s.imm)})${s.zero ? '[Z]' : ''}`).join(' ') || '-'}`);
}

// ---- (a) mixing ----
console.log('\n== Check (a): frame mixing inside one function (access sites) ==');
let mixed = 0;
for (const [f, m] of byFn) {
  const all = [...m.values()].flat();
  const frames = [...new Set(all.map(s => FRAME[s.imm]))];
  if (frames.length > 1) { console.log(`  MIXED fn ${hex(f)}: frames ${frames.join(',')} — sites ${all.map(s => `${hex(s.v)}:${hex(s.imm)}:${s.note.startsWith('read') ? 'R' : 'W'}${s.zero ? '(zero)' : ''}`).join(' ')}`); mixed++; }
}
console.log(mixed === 0 ? '  RESULT: no function touches both frames' : `  RESULT: ${mixed} function(s) touch both frames (see notes: zero-init and fold-sharing classify them)`);

// ---- (b) save without restore ----
console.log('\n== Check (b): saves without matching restores (per field, image-wide) ==');
for (const off of Object.keys(FRAME).map(Number).sort((x, y) => x - y)) {
  const wr = sites.filter(s => s.kind === 'A' && s.imm === off && s.note.startsWith('write') && !s.zero);
  const rd = sites.filter(s => s.kind === 'A' && s.imm === off && s.note.startsWith('read'));
  console.log(`  em[${hex(off)}]: real writers ${wr.length}, readers ${rd.length} -> ${wr.length && rd.length ? 'save+restore pair exists' : wr.length ? 'SAVE WITHOUT READER' : rd.length ? 'READ WITHOUT WRITER (pre-initialized or set elsewhere)' : 'untouched'}`);
}

// ---- unconsumed producers ----
console.log('\n== W producers never reaching an em access in these lanes ==');
const un = sites.filter(s => s.kind === 'W' && !consumed.has(s.v));
for (const s of un) console.log(`  ${hex(s.v)} ${s.mn} | fn ${hex(fnStart(s.v))} | ${s.note}`);
console.log(`  count: ${un.length}`);

console.log('\nBound: lanes require the index/base register to still hold the movw or fold result');
console.log('(12-insn window, killed by redefinition and bl clobbers; one spill/reload hop allowed).');
console.log('Invisible: offset from a literal pool, arithmetic offset, frame pointer passed as an');
console.log('argument, conditional movw (cond != AL), values crossing a call boundary, second-order');
console.log('stack copies beyond one hop. Push-lr function attribution is heuristic (leaf functions');
console.log('attribute to the preceding start); block 0x87a7c is branch-entered from 0x87a14, not');
console.log('called, and the fn 0x879dc attribution follows the heuristic.');
