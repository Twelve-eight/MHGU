// sub1b6.mjs — census of every access to sub+0x1b6 (u16), sub = *(u32*)(em+0x1428), MHGU main v1.40.
// Read-only. Lanes:
//   A  load/store immediate-offset (bits 27:25 = 010, imm12) == 0x1b6: ldr/str/ldrb/strb (+ldrt/strt);
//      Rn=15 (literal pools) skipped. NOTE: ldrh/strh cannot encode 0x1b6 as imm4H:imm4L — that family
//      is lane A2.
//   A2 extra load/store family (bits 27:26 = 00, bit7=1, bit4=1, I=1) with imm4H:imm4L == 0x1b6:
//      ldrh/strh/ldrsb/ldrsh/ldrd/strd.
//   B  movw rX,#0x1b6 (imm4:imm12 decode) consumed as a register offset: ldr*/str* [rB, rX] or
//      [rB], rX, and add rD, rB, rX (either operand order, shift 0) forming an address used by
//      ldr*/str* [rD].
// Base classification (per site, from a snapshot taken before the instruction's own defs):
//   SUB    = the base register was loaded from [<reg>+0x1428] (imm12 form or via an index register
//            holding 0x1428 from movw) or copied by `mov` from such a register, within the same
//            push-lr function, tracking window 96 instructions, invalidated on any def of the
//            register, on pop/ldm reloads, on movw/movt to the register, and r0-r3 on bl/blx.
//   OTHER  = anything else. The filter cannot identify the object: it may be em (whose +0x1b6 is a
//            DIFFERENT field), a UI struct with its own +0x1b6, or sub received as a function
//            argument (invisible to the filter).
// HARD CONTROL (per assignment): 0x684d0 and 0x2246c must be found; 0x684a4 and 0xcb014 as well.
// Self-tests assert the two known decoder traps (movw imm4:imm12 split; lane-A mask on a known str).
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('FIELD sub+0x1b6 (u16)   (sub = [em+0x1428])');
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
const D = (w, a) => (decode ? decode(w, a) : '.word 0x' + (w >>> 0).toString(16));
const hex = (n) => '0x' + (n >>> 0).toString(16);
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const pushLr = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) { const w = W(v); if (((w & 0xFFFF0000) >>> 0) === 0xE92D0000 && (w & 0x4000)) pushLr.push(v); }
const pushSet = new Set(pushLr);
const fnStart = (v) => { let lo = 0, hi = pushLr.length - 1, best = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (pushLr[mid] <= v) { best = pushLr[mid]; lo = mid + 1; } else hi = mid - 1; } return best; };

// --- self-tests: the two decoder traps that have each cost a rewrite (see memory) ---
{
  const w = W(0x22468); // e30011b6 movw r1,#0x1b6
  const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF);
  if (imm !== 0x1b6) { console.log('SELFTEST-FAIL movw imm4:imm12 at 0x22468 ->', hex(imm)); process.exit(1); }
  const w2 = W(0x68498); // e301c428 movw r12,#0x1428
  const imm2 = (((w2 >>> 16) & 0xF) << 12) | (w2 & 0xFFF);
  if (imm2 !== 0x1428) { console.log('SELFTEST-FAIL movw imm4:imm12 at 0x68498 ->', hex(imm2)); process.exit(1); }
  const w3 = W(0x22488); // e584143c str r1,[r4,#0x43c]
  if (((w3 >>> 26) & 3) !== 1 || ((w3 >>> 25) & 1) !== 0 || (w3 & 0xFFF) !== 0x43c) { console.log('SELFTEST-FAIL lane-A mask on str@0x22488 word', hex(w3)); process.exit(1); }
  console.log('SELFTEST-PASS movw imm4:imm12 (0x1b6@0x22468, 0x1428@0x68498) and lane-A mask (str 0x43c@0x22488)');
}

const stripCond = (mn) => mn.replace(/(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)$/, '');
const WRITE_MN = new Set(['ldr','ldrb','ldrh','ldrsb','ldrsh','ldrd','mov','mvn','add','sub','rsb','and','orr','eor','bic','adr','uxtb','uxth','uxtab','sxtb','sxth','vmov']);
const firstReg = (mn0) => { const t = mn0.split(/[\s,\[\]!]+/).filter(Boolean); const m = /^r(\d+)$/.exec(t[1] || ''); return m ? Number(m[1]) : -1; };

const subAt = new Map();   // reg -> {age, how}  (how: 'ldr[+0x1428]' | 'movw1428' | 'ldrvia-idx' | 'mov-copy')
const off1b6 = new Map();  // reg -> {age, at}  (movw #0x1b6 still live in that reg)
const addr1b6 = new Map(); // reg -> {at, baseReg} (add-formed address = baseReg+0x1b6)

const sites = [];
const record = (v, kind, extra) => sites.push({ v, kind, ...extra });

for (let v = TEXT_START; v < TEXT_END; v += 4) {
  if (pushSet.has(v)) { subAt.clear(); off1b6.clear(); addr1b6.clear(); } // function boundary
  for (const m of subAt.values()) m.age++;
  for (const m of off1b6.values()) m.age++;
  for (const m of off1b6) if (m[1].age > 32) off1b6.delete(m[0]);
  for (const m of subAt) if (m[1].age > 96) subAt.delete(m[0]);
  // snapshots: access checks see the state as of BEFORE this instruction's own defs
  const snapSub = new Map(subAt), snapOff = new Map(off1b6), snapAddr = new Map(addr1b6);
  const w = W(v);
  const mn = D(w, v);
  const mn0 = stripCond(mn);

  // ---- movw / movt ----
  if (((w >>> 16) & 0xFFF0) === 0xE300) {
    const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF), rd = (w >>> 12) & 15;
    if (imm === 0x1b6) off1b6.set(rd, { age: 0, at: v }); else { off1b6.delete(rd); addr1b6.delete(rd); }
    if (imm === 0x1428) subAt.set(rd, { age: 0, how: 'movw1428' }); else subAt.delete(rd);
    continue;
  }
  if (((w >>> 16) & 0xFFF0) === 0xE340) { // movt rewrites the high half: tracked values are dead
    const rd = (w >>> 12) & 15; off1b6.delete(rd); addr1b6.delete(rd); subAt.delete(rd);
    continue;
  }

  // ---- 1) dest-register invalidation for defs (access checks below use snapshots, so this is safe) ----
  {
    const base = mn0.split(/[\s,]+/)[0];
    if (WRITE_MN.has(base)) {
      const rd = firstReg(mn0);
      if (rd >= 0) {
        if (base === 'ldrd') { off1b6.delete(rd); off1b6.delete(rd + 1); subAt.delete(rd); subAt.delete(rd + 1); }
        else { off1b6.delete(rd); addr1b6.delete(rd); if (base !== 'mov') subAt.delete(rd); }
      }
    }
    const pm = /^(pop|push|ldm\/stm)\S*\s*(?:r\d+!?\s*)?\{([^}]*)\}/.exec(mn0);
    if (pm) for (const t of pm[2].split(',')) { const m2 = /^r(\d+)$/.exec(t.trim()); if (m2) { const r = Number(m2[1]); off1b6.delete(r); addr1b6.delete(r); subAt.delete(r); } }
    if (base === 'bl' || base === 'blx') for (let r = 0; r < 4; r++) subAt.delete(r); // caller-clobbered
  }

  // ---- 2) lane A: load/store immediate form, imm12 == 0x1b6 ----
  if (((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0) {
    const imm = w & 0xFFF, rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
    const L = (w >>> 20) & 1, B = (w >>> 22) & 1;
    if (imm === 0x1b6 && rn !== 15) record(v, 'A-imm12', { L, B, rn, rd, mn, base: snapSub.has(rn) ? 'SUB' : 'OTHER(r' + rn + ')' });
  }
  // ---- lane A2: extra load/store family, imm4H:imm4L == 0x1b6 ----
  if (((w >>> 26) & 3) === 0 && ((w >>> 7) & 1) === 1 && ((w >>> 4) & 1) === 1 && ((w >>> 5) & 3) !== 0 && ((w >>> 22) & 1) === 1) {
    const imm = (((w >>> 8) & 0xF) << 4) | (w & 0xF), rn = (w >>> 16) & 15, rd = (w >>> 12) & 15, L = (w >>> 20) & 1;
    if (imm === 0x1b6 && rn !== 15) record(v, 'A2-half-family', { L, rn, rd, mn, base: snapSub.has(rn) ? 'SUB' : 'OTHER(r' + rn + ')' });
  }
  // ---- lane B: register-offset access using a live movw #0x1b6 ----
  {
    const m1 = /^(ldr|str|ldrb|strb|ldrh|strh|ldrsb|ldrsh)\S*\s+r\d+,\s*\[r(\d+),\s*r(\d+)\](?!, lsl)/.exec(mn0);
    const m2 = /^(ldr|str|ldrb|strb|ldrh|strh|ldrsb|ldrsh)\S*\s+r\d+,\s*\[r(\d+)\],\s*r(\d+)\s*$/.exec(mn0);
    const mm = m1 || m2;
    if (mm && snapOff.has(Number(mm[3]))) {
      record(v, 'B-regoff', { L: mn0.startsWith('ldr'), rn: Number(mm[2]), rm: Number(mm[3]), mn, movwAt: snapOff.get(Number(mm[3])).at, base: snapSub.has(Number(mm[2])) ? 'SUB' : 'OTHER(r' + mm[2] + ')' });
    }
  }
  {
    // add forming an address whose offset register is the live 0x1b6 (either operand order, shift 0)
    const ma = /^add\S*\s+r(\d+),\s*r(\d+),\s*r(\d+)(?:,\s*lsl\s+#(\d+))?$/.exec(mn0);
    if (ma) {
      const rd = Number(ma[1]), a = Number(ma[2]), b = Number(ma[3]), sh = ma[4] ? Number(ma[4]) : 0;
      if (sh === 0 && snapOff.has(b)) addr1b6.set(rd, { at: snapOff.get(b).at, baseReg: a });
      else if (sh === 0 && snapOff.has(a)) addr1b6.set(rd, { at: snapOff.get(a).at, baseReg: b });
      else addr1b6.delete(rd);
    }
  }
  {
    const m3 = /^(ldr|str|ldrb|strb|ldrh|strh|ldrsb|ldrsh)\S*\s+r\d+,\s*\[r(\d+)\](!?)\s*$/.exec(mn0);
    if (m3 && snapAddr.has(Number(m3[2]))) {
      const e = snapAddr.get(Number(m3[2]));
      record(v, 'B-addaddr', { L: mn0.startsWith('ldr'), rn: Number(m3[2]), mn, movwAt: e.at, base: snapSub.has(e.baseReg) ? 'SUB' : 'OTHER(r' + e.baseReg + ')' });
    }
  }

  // ---- 3) establish tracking (after invalidation; source checks use snapshots) ----
  {
    // lane-A imm12 load from [x+0x1428]
    if (((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0) {
      const imm = w & 0xFFF, rn = (w >>> 16) & 15, rd = (w >>> 12) & 15, L = (w >>> 20) & 1;
      if (imm === 0x1428 && L && rn !== 15) subAt.set(rd, { age: 0, how: 'ldr[+0x1428]' });
    }
    // load via an index register holding 0x1428 (register-form ldr [rB, rX])
    const li = /^(ldr|ldrb|ldrh|ldrsb|ldrsh)\S*\s+r(\d+),\s*\[r(\d+),\s*r(\d+)\]/.exec(mn0);
    if (li && snapSub.has(Number(li[4]))) subAt.set(Number(li[2]), { age: 0, how: 'ldrvia-idx' });
    // mov-copy
    const cp = /^mov\S*\s+r(\d+),\s*r(\d+)\s*$/.exec(mn0);
    if (cp) { const rd = Number(cp[1]), rs = Number(cp[2]); if (snapSub.has(rs)) subAt.set(rd, { age: 0, how: 'mov-copy' }); else subAt.delete(rd); }
  }
}

console.log('\nBASE FILTER: SUB = base register provably reloaded from [x+0x1428] (or mov-copied /');
console.log('movw-0x1428) within the same push-lr function, window 96 insns; OTHER(rN) = filter cannot');
console.log('identify the object (may be em, a UI struct, or sub passed as an argument).');

console.log('\nSITES total:', sites.length);
const byKind = {}; for (const s of sites) { const k = s.kind + ':' + (s.L ? 'ldr' : 'str') + (s.B ? 'b' : ''); byKind[k] = (byKind[k] || 0) + 1; }
console.log('by kind/op', JSON.stringify(byKind));
const byBase = {}; for (const s of sites) { const k = (s.L ? 'R ' : 'W ') + s.base; byBase[k] = (byBase[k] || 0) + 1; }
console.log('by read/write x base', JSON.stringify(byBase));

function lastDef(v, reg, hops) {
  for (let k = 1; k <= 16; k++) {
    const a = v - 4 * k, mn = D(W(a), a), mn0 = stripCond(mn), base = mn0.split(/[\s,]+/)[0];
    if (WRITE_MN.has(base) && firstReg(mn0) === reg) {
      const mv = /^mov\S*\s+r\d+,\s*r(\d+)\s*$/.exec(mn0);
      if (mv && hops > 0) return [{ at: a, mn }, ...lastDef(a, Number(mv[1]), hops - 1)];
      return [{ at: a, mn }];
    }
  }
  return [{ at: -1, mn: '(no def within 16 insns)' }];
}

const readers = sites.filter(s => s.L), writers = sites.filter(s => !s.L);
console.log('\nREADERS', readers.length);
for (const s of readers) console.log('  R', hex(s.v), s.kind, s.mn, '| base', s.base, '| fn', hex(fnStart(s.v)), s.movwAt ? '(movw ' + hex(s.movwAt) + ')' : '');
console.log('\nWRITERS', writers.length);
for (const s of writers) {
  console.log('  W', hex(s.v), s.kind, s.mn, '| base', s.base, '| fn', hex(fnStart(s.v)), s.movwAt ? '(movw ' + hex(s.movwAt) + ')' : '');
  for (const d of lastDef(s.v, s.rd, 2)) console.log('      value <-', d.at < 0 ? d.mn : hex(d.at) + ': ' + d.mn);
  console.log('      window:');
  for (let a = s.v - 32; a <= s.v + 32; a += 4) console.log('        ', hex(a) + (a === s.v ? ' <== W' : '') + ':', D(W(a), a));
}
for (const s of sites.filter(x => x.base && x.base.startsWith('OTHER'))) {
  console.log('\n  OTHER-base window', hex(s.v), s.mn, '->');
  for (let a = s.v - 24; a <= s.v + 24; a += 4) console.log('        ', hex(a) + (a === s.v ? ' <==' : '') + ':', D(W(a), a));
}

// ---- HARD CONTROL ----
const CONTROL = [0x684d0, 0x2246c, 0x684a4, 0xcb014];
const found = new Set(sites.map(s => s.v));
const missing = CONTROL.filter((a) => !found.has(a));
if (missing.length) { console.log('CONTROL-FAIL missing ' + missing.map(hex).join(', ')); process.exit(1); }
console.log('\nCONTROL-PASS all four known sites found: ' + CONTROL.map(hex).join(', '));
