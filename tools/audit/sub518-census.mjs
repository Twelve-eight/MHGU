// sub518-census.mjs — census of accesses to sub+0x518 (byte), sub = [em+0x1428]
// (ARMv7 A32, MHGU main 1.4.0, flat image; vaddr = flat - 0x100). READ-ONLY on the image.
//
// Lanes:
//   A  ldr/str/ldrb/strb with imm12 == 0x518, Rn != 15 (Rn == 15 sites listed separately, never dropped)
//   B  register-offset ldr/str(b)/vldr/vstr reaching effective offset +0x518 via `movw rX,#0x518`
//      (+ optional `add rD,rB,rX`); displacements on tracked bases are honoured, not ignored
//   L  supplementary: literal-pool / movw-movt materialisations of the constant 0x518 (arm32.findLiteralLoads)
//
// Base filter (stated, per site, nothing silently dropped):
//   DIRECT      base register was loaded from em[0x1428] earlier in the same function
//               (movw rT,#0x1428 then ldr/add; also `ldr rT,[subptr,#0]` where subptr came from a
//               `ldr rB,[rX,rT]!` writeback) with no overwrite of the base reg in between.
//   ARG         the base register at the site is fed (directly or via `mov rX,rY` chains) by a register
//               that a caller demonstrably held = sub at the bl/blx (caller loaded it from em[0x1428]
//               within 12 insns before the call and did not overwrite it before calling).
//   UNDECIDED   neither held — site still printed, with its base-register def-chain for hand review.
//
// Writers: 20-insn window printed + last def of the stored register (12-insn window, mov rX,rY alias follow <=3).
// Compares: first `cmp rD,#imm` of the loaded register within 8 insns after each load, no def of rD between.
//
// Must-pass control (hand-disassembled, see G:/tmp/EMC/G-sub518.md): 0x8177c, 0x81764, 0xc982c present in lane A
// and fnStart(0xc982c) == 0xc9818. Missing control => exit 1.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('FIELD sub+0x518 (byte)   (sub = [em+0x1428])');
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

let decode = null, findLiteralLoads = null;
try {
  const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs');
  decode = m.decode; findLiteralLoads = m.findLiteralLoads;
} catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
if (!decode) process.exit(1);
const D = (w, a) => decode(w, a);
const hex = (n) => '0x' + (n >>> 0).toString(16);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

// function starts: stmdb sp!, {..., lr}  (bit 14 of the register list set)
const pushLr = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w & 0xFFFF0000) >>> 0) === 0xE92D0000 && (w & 0x4000)) pushLr.push(v);
}
const fnStart = (v) => {
  let lo = 0, hi = pushLr.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pushLr[mid] <= v) { best = pushLr[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
};
const fnTag = (v) => { const f = fnStart(v); return f === -1 ? 'none(no push-lr prologue before)' : hex(f); };

// ---------- instruction-level helpers ----------
// registers written by a decoded instruction line (conservative)
const DEST_RE = /^(mov|mvn|ldr|add|sub|rsb|and|orr|eor|bic|mul|bfi|bfc|uxtb|uxth|sxtb|sxth|uxtab|sxtab|uxtab16|sxtab16|clz)\w* (r\d+)([, ]|$)/;
function getDefs(mn) {
  const out = new Set();
  const m = DEST_RE.exec(mn);
  if (m) out.add(m[2]);
  if (/^vmov[\w.]* (r\d+),/.test(mn)) out.add(/^vmov[\w.]* (r\d+),/.exec(mn)[1]);
  if (/\]!/.test(mn)) { const b = /\[(r\d+)[,\]]/.exec(mn); if (b) out.add(b[1]); }  // writeback base
  if (/^(pop|ldm\/stm|ldm)/.test(mn)) for (const r of mn.match(/r\d+|sp|lr|pc/g) || []) out.add(r);
  return out;
}
// was `reg` written anywhere strictly between (a, b)?
function overwritten(a, b, reg) {
  for (let v = a + 4; v < b; v += 4) if (getDefs(D(W(v), v)).has(reg)) return true;
  return false;
}
const MOVMN = /^mov\w* (r\d+), (r\d+)$/;
// last def of reg before v (12-insn window); follows mov rX,rY aliases up to 3 hops
function lastDef(v, reg, hops = 0) {
  for (let k = 1; k <= 12; k++) {
    const a = v - 4 * k; if (a < TEXT_START) break;
    const mn = D(W(a), a);
    let hit = null;
    if (DEST_RE.test(mn)) { const m = DEST_RE.exec(mn); if (m[2] === reg) hit = { at: a, mn }; }
    if (!hit && /^vmov[\w.]* (r\d+),/.test(mn) && /^vmov[\w.]* (r\d+),/.exec(mn)[1] === reg) hit = { at: a, mn };
    if (!hit && /\]!/.test(mn)) { const b = /\[(r\d+)[,\]]/.exec(mn); if (b && b[1] === reg) hit = { at: a, mn, note: 'writeback base' }; }
    if (!hit && /^(pop|ldm\/stm|ldm)/.test(mn) && (mn.match(/r\d+|sp|lr|pc/g) || []).includes(reg)) hit = { at: a, mn, note: 'pop/ldm' };
    if (hit) {
      const mv = MOVMN.exec(hit.mn);
      if (mv && hops < 3) { const up = lastDef(hit.at, mv[2], hops + 1); return up ? up : hit; }
      return hit;
    }
  }
  return null;
}
// displacement of an addressing-mode second operand, or null if it is a register / unknown
function parseDisp(s) {
  if (s === undefined) return 0;
  const m = /^#(-?)(0x[0-9a-f]+|\d+)$/.exec(s);
  if (!m) return null;
  let n = m[2].startsWith('0x') ? parseInt(m[2], 16) : parseInt(m[2], 10);
  return m[1] ? -n : n;
}

// ---------- lane A: imm12 == 0x518 word/byte ----------
const laneA = [], laneA_pc = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w >>> 26) & 3) !== 1 || ((w >>> 25) & 1) !== 0) continue;   // load/store immediate group
  const imm = w & 0xFFF;
  if (imm !== 0x518) continue;
  const L = (w >>> 20) & 1, B = (w >>> 22) & 1, rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
  const row = { v, L, B, rn: 'r' + rn, rd: 'r' + rd, mn: D(w, v), fn: fnStart(v), kind: L ? 'LOAD' : 'STORE' };
  if (rn === 15) laneA_pc.push(row); else laneA.push(row);
}
console.log('\n=== LANE A: imm12 word/byte sites ===');
console.log('count', laneA.length, '| by op', JSON.stringify(laneA.reduce((m, r) => { const k = (r.L ? 'ldr' : 'str') + (r.B ? 'b' : ''); m[k] = (m[k] || 0) + 1; return m; }, {})));
console.log('Rn==15 (literal loads etc, EXCLUDED from field census but listed):', laneA_pc.length);
for (const r of laneA_pc) console.log('   pc15', hex(r.v), r.mn);

// ---------- callers (bl/blx-immediate) for the ARG lane ----------
const siteFns = new Set(laneA.map(r => r.fn).filter(f => f !== -1));
const callersOf = new Map();   // target -> [caller vaddr]
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w >>> 25) & 7) === 5 && (w >>> 24) & 1) {
    let off = (w & 0xFFFFFF) << 2; if (off & 0x2000000) off -= 0x4000000;
    const t = (v + 8 + off) >>> 0;
    if (siteFns.has(t)) { if (!callersOf.has(t)) callersOf.set(t, []); callersOf.get(t).push(v); }
  } else if (((w & 0xFE000000) >>> 0) === 0xFA000000) {
    let off = (w & 0xFFFFFF) << 2; if (off & 0x2000000) off -= 0x4000000;
    const t = (v + 8 + off + ((w >>> 24) & 1) * 2) >>> 0;
    if (siteFns.has(t)) { if (!callersOf.has(t)) callersOf.set(t, []); callersOf.get(t).push(v); }
  }
}
// ARG lane: caller holds sub in reg R (loaded from em[0x1428] within 12 insns before the call,
// not redefined between load and call) -> callee fn may use R as a sub base.
const subArgFns = new Map();   // 'fn|reg' -> [caller addrs]
for (const [t, callers] of callersOf) {
  for (const c of callers) {
    const sp = new Map();        // reg pending = em index (#0x1428)
    const subptr = new Map();    // reg -> addr of the ldr! that made reg point at em+0x1428
    const held = new Map();      // reg -> addr where reg was proven = sub
    for (let a = Math.max(TEXT_START, c - 12 * 4); a < c; a += 4) {
      const mn = D(W(a), a);
      const mm = /^movw[a-z]{0,2} (r\d+), #0x1428$/.exec(mn);
      if (mm) { sp.set(mm[1], true); continue; }
      const lm = /^(ldr\w*) (r\d+), \[(r\d+)(?:, ([^\]]+))?\](!?)$/ .exec(mn)
               || /^(ldr\w*) (r\d+), \[(r\d+)\], ([^\s,]+)$/.exec(mn);
      if (lm) {
        const [, , rt, rb, ri] = lm;
        const riIsReg = ri !== undefined && /^r\d+$/.test(ri);
        if (riIsReg && sp.has(ri)) {
          if (lm[5] === '!') subptr.set(rb, a);
          else { held.set(rt, a); sp.delete(ri); }
        } else if (!riIsReg && parseDisp(ri) === 0 && subptr.has(rb)) {
          held.set(rt, a);   // ldr rT,[subptr,#0] reload
        }
      }
      const am = /^add[a-z]{0,2} (r\d+), (r\d+), (r\d+)$/.exec(mn);
      if (am && (sp.has(am[2]) || sp.has(am[3]))) held.set(am[1], a);
      const setReg = lm ? lm[2] : (am ? am[1] : null);
      for (const r of getDefs(mn)) if (held.has(r) && r !== setReg) held.delete(r);
    }
    for (const [reg, at] of held) {
      if (overwritten(at, c, reg)) continue;
      const k = t + '|' + reg;
      if (!subArgFns.has(k)) subArgFns.set(k, []);
      subArgFns.get(k).push(c);
    }
  }
}

// ---------- em[0x1428] loads (for the DIRECT base decision) + lane B in one pass ----------
const subLoads = [];          // {addr, fn, reg}  reg = register now holding sub
const subptrEvents = [];      // {addr, fn, reg}  reg = register now pointing at em+0x1428
const laneB = [];
const pending = new Map();    // reg -> {age} for movw #0x518
const addrReg = new Map();    // reg -> tracked offset (only kept when it is 0x518)
const subPend = new Map();    // reg -> {age} for movw #0x1428 (the em value pending)
const subptrAddr = new Map(); // reg -> addr of the ldr! that made reg point at em+0x1428
let lastFn = -2;
const MOVW_RE = /^movw[a-z]{0,2} (r\d+), #0x([0-9a-f]+)$/;
const LS_RE = /^((?:ldr|str)\w*) (\w+), \[(\w+)(?:, ([^\]]+))?\](!?)$/;
const LS_POST_RE = /^((?:ldr|str)\w*) (\w+), \[(\w+)\], ([^\s,]+)$/;
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v), mn = D(w, v);
  if (fnStart(v) !== lastFn) { pending.clear(); addrReg.clear(); subPend.clear(); subptrAddr.clear(); lastFn = fnStart(v); }
  for (const [r, o] of [...pending]) { o.age++; if (o.age > 64) { pending.delete(r); addrReg.delete(r); } }
  for (const [r, o] of [...subPend]) { o.age++; if (o.age > 32) subPend.delete(r); }

  const mm = MOVW_RE.exec(mn);
  if (mm) {
    const rd = mm[1], imm = parseInt(mm[2], 16);
    if (imm === 0x518) { pending.set(rd, { age: 0 }); addrReg.delete(rd); }
    else { pending.delete(rd); addrReg.delete(rd); }
    if (imm === 0x1428) subPend.set(rd, { age: 0 }); else subPend.delete(rd);
    continue;
  }
  const am = /^add[a-z]{0,2} (r\d+), (r\d+), (r\d+)$/.exec(mn);
  if (am) {
    const rd = am[1], ra = am[2], rb = am[3];
    if (pending.has(rb) || pending.has(ra)) addrReg.set(rd, 0x518);
    if (subPend.has(rb) || subPend.has(ra)) {
      subLoads.push({ addr: v, fn: fnStart(v), reg: rd, via: 'add' });
    }
    continue;   // keep pendings alive (the add may consume the same index reg it defines)
  }
  // integer load/store, pre/post-indexed
  const lm = LS_RE.exec(mn) || LS_POST_RE.exec(mn);
  if (lm) {
    const [, op, rt, rbase, second, wb] = lm;
    const disp = second === undefined || !/^r\d+$/.test(second) ? parseDisp(second) : null;
    let off = null;
    if (second !== undefined && /^r\d+$/.test(second) && pending.has(second)) off = 0x518;
    else if (disp !== null && addrReg.has(rbase)) off = addrReg.get(rbase) + disp;
    if (off === 0x518) laneB.push({ v, mn, kind: op.startsWith('ldr') ? 'LOAD' : 'STORE', base: rbase, fn: fnStart(v), lane: 'B' });
    // subptr tracking: pre-indexed ldr! where the index register is a pending #0x1428
    const rIdx = second && /^r\d+$/.test(second) ? second : null;
    if (op.startsWith('ldr') && rIdx && subPend.has(rIdx)) {
      if (wb === '!') {
        subptrAddr.set(rbase, v);
        subptrEvents.push({ addr: v, fn: fnStart(v), reg: rbase });
        subLoads.push({ addr: v, fn: fnStart(v), reg: rt, via: 'subptr!' });   // rT = sub, rB = &sub
      } else subLoads.push({ addr: v, fn: fnStart(v), reg: rt, via: 'ldr[' + rbase + ',' + rIdx + ']' });
    }
    // ldr rT,[subptr,#0] reloads sub
    if (op.startsWith('ldr') && disp === 0 && subptrAddr.has(rbase)) {
      subLoads.push({ addr: v, fn: fnStart(v), reg: rt, via: 'ldr[' + rbase + ',#0]@' + hex(subptrAddr.get(rbase)) });
    }
  }
  // VFP
  if (/^v(str|ldr)/.test(mn)) {
    const vb = /\[(r\d+)(?:, ([^\]]+))?\]/.exec(mn);
    if (vb) {
      const base = vb[1], second = vb[2];
      const d = parseDisp(second);
      const off = (second !== undefined && /^r\d+$/.test(second)) ? (pending.has(second) ? 0x518 : null)
                : (addrReg.has(base) ? addrReg.get(base) + (d === null ? 0 : d) : null);
      if (off === 0x518) laneB.push({ v, mn, kind: mn.startsWith('vldr') ? 'LOAD' : 'STORE', base, fn: fnStart(v), lane: 'B' });
    }
  }
  const curWbBase = (() => { const m = LS_RE.exec(mn); return m && m[5] === '!' ? m[3] : null; })();
  for (const r of getDefs(mn)) { pending.delete(r); addrReg.delete(r); subPend.delete(r); if (r !== curWbBase) subptrAddr.delete(r); }
}
console.log('\n=== em[0x1428] loads found (subLoads), restricted to site functions ===');
const siteFnSet = new Set([...laneA.map(r => r.fn), ...laneB.map(r => r.fn)]);
for (const s of subLoads.filter(s => siteFnSet.has(s.fn))) console.log('   sub <-', s.reg, 'at', hex(s.addr), 'fn', hex(s.fn), '(' + s.via + ')');
console.log('=== subptr events (ldr! making reg point at em+0x1428), site functions only ===');
for (const s of subptrEvents.filter(s => siteFnSet.has(s.fn))) console.log('   ptr', s.reg, 'at', hex(s.addr), 'fn', hex(s.fn));
console.log('=== ARG-lane (caller held sub in reg at bl) ===');
for (const [k, cs] of [...subArgFns].sort()) console.log('   fn|reg', hex(Number(k.split('|')[0])) + '|' + k.split('|')[1], 'from callers', cs.map(hex).join(','));

// ---------- base filter applied to every site ----------
function baseClass(site) {
  const cands = subLoads.filter(s => s.fn === site.fn && s.reg === site.base && s.addr < site.v);
  for (let i = cands.length - 1; i >= 0; i--) {
    const c = cands[i];
    if (!overwritten(c.addr, site.v, site.base)) return { cls: 'DIRECT', at: c.addr };
  }
  if (subArgFns.has(site.fn + '|' + site.base)) return { cls: 'ARG', via: subArgFns.get(site.fn + '|' + site.base) };
  // chain: base <- mov rBase, rY; caller held rY = sub
  const ld = lastDef(site.v, site.base);
  if (ld && MOVMN.test(ld.mn)) {
    const src = MOVMN.exec(ld.mn)[2];
    if (subArgFns.has(site.fn + '|' + src) && !overwritten(ld.at, site.v, site.base)) return { cls: 'ARG', via: subArgFns.get(site.fn + '|' + src), chain: ld };
  }
  return { cls: 'UNDECIDED' };
}
// def-chain of the base register, printed for UNDECIDED sites
function defChain(site, maxLinks = 6) {
  const out = [];
  let reg = site.base, at = site.v;
  for (let i = 0; i < maxLinks; i++) {
    const d = lastDef(at, reg);
    if (!d) { out.push('  (no def of ' + reg + ' within 12 insns before 0x' + at.toString(16) + ' => caller/earlier provenance)'); break; }
    out.push('  ' + hex(d.at) + ' ' + d.mn + (d.note ? ' [' + d.note + ']' : ''));
    if (d.mn.startsWith('ldr') || d.mn.startsWith('pop') || d.mn.startsWith('ldm')) break;
    const mv = MOVMN.exec(d.mn);
    if (mv) { reg = mv[2]; at = d.at; } else break;
  }
  return out;
}
console.log('\n=== LANE B: register-offset sites reaching +0x518 ===');
console.log('count', laneB.length);
for (const r of laneB) console.log('   B', hex(r.v), r.mn, ' fn', fnTag(r.v));

const allSites = [...laneA.map(r => ({ ...r, base: r.rn })), ...laneB];
console.log('\n=== SITE TABLE with base filter ===');
for (const s of allSites) {
  const bc = baseClass(s);
  console.log('  ', hex(s.v), s.mn, '| kind', s.kind, '| base', s.base, '| fn', fnTag(s.v), '| base-filter:', bc.cls, bc.at ? hex(bc.at) : '', bc.via ? '(caller ' + bc.via.map(hex).join(',') + ')' : '');
  if (bc.cls === 'UNDECIDED') for (const l of defChain(s)) console.log('      chain:', l.trim());
}

// ---------- lane L: literal 0x518 materialisations ----------
if (findLiteralLoads) {
  const hits = findLiteralLoads(TEXT_START, TEXT_END, [0x518]);
  console.log('\n=== LANE L: literal-pool / movw-movt constant 0x518 ===');
  console.log('count', hits.length);
  for (const h of hits.slice(0, 40)) console.log('   L', hex(h.from), h.kind, 'reg', h.reg);
  if (hits.length > 40) console.log('   ...', hits.length - 40, 'more');
}

// ---------- writers ----------
console.log('\n=== WRITERS (stores to [base+0x518]) with 20-insn windows ===');
for (const s of allSites.filter(x => x.kind === 'STORE')) {
  console.log('\n-- writer', hex(s.v), s.mn, 'fn', fnTag(s.v), '| base-filter:', baseClass(s).cls);
  const ld = lastDef(s.v, s.rd);
  console.log('   value source: last def of', s.rd, ':', ld ? hex(ld.at) + ' ' + ld.mn + (ld.note ? ' [' + ld.note + ']' : '') : 'none in 12 insns');
  for (let k = -10; k <= 10; k++) {
    const a = s.v + 4 * k; if (a < TEXT_START || a >= TEXT_END) continue;
    console.log('   ', (a === s.v ? '>>' : '  '), hex(a), D(W(a), a));
  }
}

// ---------- compares ----------
console.log('\n=== COMPARES of the loaded field value (first cmp #imm within 8 insns, no def between) ===');
for (const s of allSites.filter(x => x.kind === 'LOAD' && /^r\d+$/.test(x.rd || x.base || ''))) {
  const reg = s.rd;
  for (let k = 1; k <= 8; k++) {
    const a = s.v + 4 * k; if (a >= TEXT_END) break;
    if (fnStart(a) !== s.fn) break;
    const mn = D(W(a), a);
    const cm = /^cmp[a-z]{0,2} (\w+), #(\d+)$/.exec(mn);
    if (cm && cm[1] === reg) {
      let br = '';
      for (let j = 1; j <= 3; j++) { const bm = /^b(hi|ls|eq|ne|cs|cc|mi|pl|vs|vc|ge|lt|gt|le) 0x([0-9a-f]+)$/.exec(D(W(a + 4 * j), a + 4 * j)); if (bm) { br = 'b' + bm[1] + ' 0x' + bm[2]; break; } }
      console.log('   load', hex(s.v), '-> cmp', hex(a), mn, br ? '| ' + br : '');
      break;
    }
    if (getDefs(mn).has(reg)) break;
  }
}

// ---------- control ----------
console.log('\n=== CONTROL ===');
const CONTROL = [0x8177c, 0x81764, 0xc982c];
const present = new Set(allSites.map(s => s.v));
const missing = CONTROL.filter(a => !present.has(a));
if (missing.length) { console.log('CONTROL-FAIL missing ' + missing.map(hex).join(', ')); process.exit(1); }
if (fnStart(0xc982c) !== 0xc9818) { console.log('CONTROL-FAIL fnStart(0xc982c)=' + hex(fnStart(0xc982c)) + ' expected 0xc9818'); process.exit(1); }
console.log('CONTROL-PASS 0x8177c, 0x81764, 0xc982c all present; fnStart(0xc982c) == 0xc9818');
console.log('Bound: lanes A+B cannot see accesses whose address register arrives fully formed (e.g. sub passed');
console.log('through two call levels, or computed before this window); lane L lists only constant materialisations.');
