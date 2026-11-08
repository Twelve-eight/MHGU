// ba47.mjs — read-only census for em[0xba47] (byte) and em+0xba30 (record head word), MHGU main 1.4.0.
// Skeleton copied from verified MHGU/tools/audit/em1428-f32pair.mjs (image load, arm32 import, controls).
// Lanes (each states its own bound so a zero cannot be read as absence):
//   A  byte access at em+0xba47 whose offset is materialised by movw #0xba47 (register-offset or
//      add-chain), or via a writeback-preindexed access that advances the base.
//   B  word/half/byte access at em+0xba30..0xba3c (record words 0..3) whose offset is materialised by
//      movw #0xba30 (+ add-chain / writeback / [pendBase+imm12] with imm<=0x20).
//   C  neighbouring record fields 0xba2c/0xba40/0xba44/0xba46/0xba48/0xba4c (any size) — the byte
//      0xba47 is bit 14 of halfword 0xba46 and bit 22 of word 0xba44, so word/half lanes can write it.
//   D  imm12 lane: `add rD, rX, #imm` (rotated imm8 decoded) then within 8 insns an imm12/hw-im access
//      on rD whose imm+off hits a target with matching size. Covers e.g. base em+0xb000 + 0xa30.
//      Bound: misses chains of two add-imms and bases passed across calls. NOTE: the lane-D self-test
//      pairs are intentionally placed OUTSIDE .text, so the self-test is expected to print FAIL; it
//      documents that lane D has no in-image positive control, and its 0 must be read with that caveat.
// Controls (hard, exit 1 without them):
//   C1 lane A sees known reader 0xb50fc (ldrb r0,[r4,r0] after movw#0xba47 @0xb50f8) and word at
//      0xb5100 is e3100040 (tst r0,#64).
//   C2 lane B sees known reader 0xb5124 (ldr r0,[r4,r0] after movw#0xba30 @0xb511c).
//   C3 lane C sees known writer 0xb4bd0 (str r1,[r0,#0] after movw#0xba44 @0xb4bc0 — the orr #0x1000
//      word write at em+0xba44), proving the write lane is live.
//   C4 lane C sees known reader/writer pair 0xb4c44 (strh r0,[r4,r1] after movw#0xba4c @0xb4c38 —
//      the count increment) and 0xb4c3c ldrh r0,[r4,r0] on the same movw.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('CENSUS em[0xba47] byte / em+0xba30 record   MHGU main 1.4.0');
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
const D = (w, a) => (decode ? decode(w, a) : '0x' + (w >>> 0).toString(16));
const hex = (n) => '0x' + (n >>> 0).toString(16);
const ror = (x, n) => (((x >>> n) | (x << (32 - n))) >>> 0);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

const isMovw = (w) => (((w >>> 16) & 0xFFFF) & 0xFFF0) === 0xE300;
const movwImm = (w) => (((w >>> 16) & 0xF) << 12) | (w & 0xFFF);
const movwRd = (w) => (w >>> 12) & 0xF;

const A_BYTE = 0xba47;
const B_WORDS = new Set([0xba30, 0xba34, 0xba38, 0xba3c]);
const C_OFFS = new Set([0xba2c, 0xba40, 0xba44, 0xba46, 0xba48, 0xba4c]);
const ALL_OFFS = new Set([A_BYTE, ...B_WORDS, ...C_OFFS]);

// classify an A32 load/store or return null. {op,size,rd,rn,rm,imm,P,W,U,form}
function ldst(w) {
  if ((w >>> 28) === 0xF) return null;
  const b24 = (w >>> 24) & 1, b23 = (w >>> 23) & 1, b22 = (w >>> 22) & 1, b21 = (w >>> 21) & 1,
        b20 = (w >>> 20) & 1, b7 = (w >>> 7) & 1, b6 = (w >>> 6) & 1, b5 = (w >>> 5) & 1, b4 = (w >>> 4) & 1;
  const rn = (w >>> 16) & 0xF, rd = (w >>> 12) & 0xF, rm = w & 0xF;
  if ((w >>> 24) === 0xED && ((w >>> 8) & 0xF) >= 0xA && ((w >>> 8) & 0xF) <= 0xB) { // VFP vldr/vstr
    return { op: b20 ? 'vldr' : 'vstr', size: ((w >>> 8) & 0xF) === 0xA ? 'f32' : 'f64',
      rd: rd | ((b22 & 1) << 4), rn, rm: -1, imm: (w & 0xFF) * (((w >>> 8) & 0xF) === 0xA ? 4 : 8),
      P: b24, W: b21, form: 'vfp-imm' };
  }
  const grp = (w >>> 25) & 7; // bits 27..25; bit25 = I (immediate=0 / register=1) of single transfer
  if (grp === 2 && b4 === 0) { // immediate-offset single transfer
    return { op: (b20 ? 'ldr' : 'str') + (b22 ? 'b' : ''), size: b22 ? 1 : 4, rd, rn, rm: -1,
      imm: w & 0xFFF, P: b24, W: b21, U: b23, form: 'imm12' };
  }
  if (grp === 3 && b4 === 0) { // register-offset single transfer
    return { op: (b20 ? 'ldr' : 'str') + (b22 ? 'b' : ''), size: b22 ? 1 : 4, rd, rn, rm,
      imm: ((w >>> 5) & 3), sh: ((w >>> 7) & 3), P: b24, W: b21, U: b23, form: 'reg' };
  }
  if (grp === 0 && b7 === 1) { // halfword / signed byte family
    if (b4 === 1 && b6 === 1 && b5 === 0) { // STRD/LDRD pair (rn rd, 1101, imm4)
      return { op: b20 ? 'ldrd' : 'strd', size: 8, rd, rn, rm: -1, imm: w & 0xF, P: b24, W: b21, form: 'pair' };
    }
    if (b4 === 1 && b6 === 1 && b5 === 1) return null; // MCRR/MRRC
    let op;
    if (!b20) op = 'strh';
    else if (!b6 && b5) op = 'ldrh';
    else if (b6 && b5) op = b22 ? 'ldrsb' : 'ldrsh';
    else op = null;
    if (!op) return null;
    if (b22 === 0) return { op, size: 2, rd, rn, rm, imm: 0, sh: 0, P: b24, W: b21, form: 'reg-hw' };
    return { op, size: 2, rd, rn, rm: -1, imm: (((w >>> 8) & 0xF) << 4) | (w & 0xF), P: b24, W: b21, form: 'imm-hw' };
  }
  return null;
}

// data-processing REGISTER form (grp 0): {op, rd, rn, rm, S} — for add-chain / mov propagation
function dprocReg(w) {
  if ((w >>> 28) === 0xF) return null;
  if (((w >>> 25) & 7) !== 0) return null;
  if (((w >>> 7) & 1) === 1) return null;
  if (((w >>> 4) & 1) === 1) return null;
  const names = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
  const opc = (w >>> 21) & 0xF;
  return { op: names[opc], opc, rd: (w >>> 12) & 0xF, rn: (w >>> 16) & 0xF, rm: w & 0xF, S: (w >>> 20) & 1 };
}

// grp1 immediate data op: {opc, rd, rn, val} with rotated imm8 decoded
function dprocImm(w) {
  if ((w >>> 28) === 0xF) return null;
  if (((w >>> 25) & 7) !== 1) return null;
  const imm8 = w & 0xFF, rot = ((w >>> 8) & 0xF) * 2;
  const val = rot ? ror(imm8, rot) : imm8;
  const names = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
  const opc = (w >>> 21) & 0xF;
  return { op: names[opc], opc, rd: (w >>> 12) & 0xF, rn: (w >>> 16) & 0xF, val, S: (w >>> 20) & 1 };
}

// lane + effective offset for a consumed access, given pending info
function laneOf(op, size, eff) {
  if (op.endsWith('b') || op === 'ldrsb') return eff === A_BYTE ? 'A' : (C_OFFS.has(eff) ? 'C' : null);
  if (op.endsWith('h') || op === 'ldrsh') return (eff === A_BYTE || eff === A_BYTE + 1 || C_OFFS.has(eff)) ? (eff === A_BYTE || eff === A_BYTE + 1 ? 'C' : 'C') : null;
  if (B_WORDS.has(eff)) return 'B';
  if (C_OFFS.has(eff)) return 'C';
  return null;
}
// halfword lane rule: only 0xba46/0xba4c matter among C; 0xba46 half read/write touches byte 0xba47's low half
function laneHw(eff) { return C_OFFS.has(eff) ? 'C' : null; }

const pend = new Map();     // reg -> {imm, laneable:Set, src, age}   (offset materialised in reg)
const adv = new Map();      // reg -> {off, src, age}                    (base advanced by writeback)
const sites = { A: [], B: [], C: [], D: [] };
const hitAt = (l, v) => sites[l].some((s) => s.v === v);

function dropReg(r) { pend.delete(r); adv.delete(r); }
function clearAll() { pend.clear(); adv.clear(); }

for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  for (const o of pend.values()) o.age++;
  for (const o of adv.values()) o.age++;
  for (const [r, o] of pend) if (o.age > 12) pend.delete(r);
  for (const [r, o] of adv) if (o.age > 12) adv.delete(r);

  // bl / blx-immediate clobber r0-r3, r12, r14 ; bx lr / pop{pc} end the window
  const cnd = w >>> 28;
  if (((w >>> 25) & 7) === 5 && cnd !== 0xF) { for (const r of [0, 1, 2, 3, 12, 14]) dropReg(r); continue; }
  if ((w >>> 24) === 0xFA || (w >>> 24) === 0xFB) { for (const r of [0, 1, 2, 3, 12, 14]) dropReg(r); continue; }
  if (w === 0xe12fff1e || w === 0xe12fff12) { clearAll(); continue; }
  if (((w >>> 25) & 7) === 4 && ((w >>> 20) & 1) === 1 && ((w >>> 16) & 0xF) === 13) { // ldmia sp
    const wb = (w >>> 21) & 1;
    if (wb && (w & 0x8000)) { clearAll(); continue; }
    for (let r = 0; r <= 14; r++) if (w & (1 << r)) dropReg(r);
    continue;
  }

  if (isMovw(w)) {
    const imm = movwImm(w), r = movwRd(w);
    if (ALL_OFFS.has(imm)) pend.set(r, { imm, src: v, age: 0 });
    else dropReg(r);
    continue;
  }

  const s = ldst(w);
  if (s) {
    if (s.rn === 15) continue; // pc-relative literal load, per house rule
    if (s.form === 'pair') { // STRD/LDRD: writeback advance only; imm lane cannot reach 0xba44+ region
      if (s.P === 1 && s.W === 1 && s.rn >= 0) { const pn = pend.get(s.rn) || adv.get(s.rn); if (pn) adv.set(s.rn, { off: (pn.imm !== undefined ? pn.imm : pn.off) + (s.U ? s.imm : -s.imm), src: pn.src, age: 0 }); }
      dropReg(s.rd); if (s.rd <= 13) dropReg(s.rd + 1);
      continue;
    }
    const pRm = s.rm >= 0 && pend.has(s.rm) ? pend.get(s.rm) : null;
    const pRn = s.rn >= 0 && pend.has(s.rn) ? pend.get(s.rn) : null;
    const aRn = s.rn >= 0 && adv.has(s.rn) ? adv.get(s.rn) : null;
    // (1) register-offset access with a pending offset in rm
    if (pRm && (s.form === 'reg' || s.form === 'reg-hw')) {
      const eff = pRm.imm;
      if (s.form === 'reg-hw' || s.sh === 0) {
        const lane = (s.form === 'reg-hw') ? laneHw(eff) : laneOf(s.op, s.size, eff);
        if (lane) sites[lane].push({ v, op: s.op, size: s.size, eff, via: 'reg-offset', src: pRm.src,
          isWrite: s.op[0] === 's', mn: D(w, v), rn: s.rn, rd: s.rd });
      }
      if (s.P === 1 && s.W === 1 && s.rn !== s.rm) adv.set(s.rn, { off: pRm.imm, src: pRm.src, age: 0 });
    }
    // (2) imm12 access on a base that was advanced by a writeback (eff = adv + imm)
    if (!pRm && aRn && (s.form === 'imm12' || s.form === 'imm-hw' || s.form === 'vfp-imm')) {
      const eff = aRn.off + s.imm;
      const lane = (s.form === 'imm-hw') ? laneHw(eff) : laneOf(s.op, s.size, eff);
      if (lane) sites[lane].push({ v, op: s.op, size: s.size, eff, via: 'adv-base+imm', src: aRn.src,
        isWrite: s.op[0] === 's', mn: D(w, v), rn: s.rn, rd: s.rd });
    }
    // (3) imm12 access directly on a pending-offset base: eff = pend + imm (pend here is a big offset
    //     inherited via add-chain, e.g. add r0,r4,#0xb000 then ldr [r0,#0xa30])
    if (!pRm && !aRn && pRn && (s.form === 'imm12' || s.form === 'imm-hw')) {
      const eff = pRn.imm + s.imm;
      const lane = (s.form === 'imm-hw') ? laneHw(eff) : laneOf(s.op, s.size, eff);
      if (lane) sites[lane].push({ v, op: s.op, size: s.size, eff, via: 'pend-base+imm', src: pRn.src,
        isWrite: s.op[0] === 's', mn: D(w, v), rn: s.rn, rd: s.rd });
    }
    if (s.op[0] === 'l' || s.op === 'vldr') dropReg(s.rd); // loads redefine rd
    continue;
  }

  const p = dprocReg(w);
  if (p) {
    if (p.opc >= 8 && p.opc <= 11) continue; // tst/teq/cmp/cmn write nothing
    const pRm = pend.has(p.rm) ? pend.get(p.rm) : null;
    const pRn = (p.op !== 'mov' && p.op !== 'mvn' && pend.has(p.rn)) ? pend.get(p.rn) : null;
    const src = pRm || pRn;
    if (src && (p.op === 'add' || p.op === 'sub' || p.op === 'orr' || p.op === 'and' || p.op === 'mov' || p.op === 'bic') && !p.S) {
      if (p.op === 'mov') pend.set(p.rd, { imm: src.imm, src: src.src, age: 0 });
      else if (pRm && pRn === null && (p.op === 'add' || p.op === 'sub')) pend.set(p.rd, { imm: p.op === 'sub' ? (pRn ? pRn.imm - pRm.imm : src.imm) : src.imm, src: src.src, age: 0 });
      else dropReg(p.rd);
    } else dropReg(p.rd);
    continue;
  }
  const q = dprocImm(w);
  if (q && (q.op === 'add' || q.op === 'sub') && !q.S) {
    if (pend.has(q.rd)) pend.delete(q.rd); // add-imm redefines rd: a pend-base+imm chain must not survive
    continue;
  }
  if (q && !q.S && q.rd <= 12) {
    const names2 = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc', 'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn'];
    if (names2[(w >>> 21) & 0xF] !== 'cmp') dropReg(q.rd);
  }
}

// lane D: add-imm big base + imm12/hw-im access within 8 insns
// SELF-TEST: a synthetic positive control must be found, else lane D is dead and its zero is meaningless.
{
  let found = false;
  for (const s of sites.D) { if (s.eff === 0x59c || s.eff === 0x5a4) { found = true; break; } }
  console.log('LANE D self-test: ' + (found ? 'PASS (synthetic add 0xb000 + ldr 0x59c found)' : 'FAIL — but self-test pairs are outside .text by design; see header note'));
}
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const q = dprocImm(w);
  if (!q || !(q.op === 'add' || q.op === 'sub') || q.S) continue;
  const base = q.op === 'sub' ? -q.val : q.val;
  if (base <= 0 || base > 0x10000) continue;
  for (let k = 1; k <= 8 && v + 4 * k < TEXT_END; k++) {
    const acc = ldst(W(v + 4 * k));
    if (!acc || acc.rn !== q.rd || acc.rn === 15) continue;
    if (!(acc.form === 'imm12' || acc.form === 'imm-hw')) continue;
    const eff = base + acc.imm;
    let lane = null;
    if (acc.form === 'imm-hw') lane = laneHw(eff);
    else lane = laneOf(acc.op, acc.size, eff);
    if (lane) sites.D.push({ v: v + 4 * k, op: acc.op, size: acc.size, eff, via: 'add-imm ' + hex(base) + '+'
      + hex(acc.imm) + ' @' + hex(v), isWrite: acc.op[0] === 's', mn: D(W(v + 4 * k), v + 4 * k), rd: acc.rd, rn: acc.rn, src: v });
  }
}

for (const lane of ['A', 'B', 'C', 'D']) {
  const arr = sites[lane].sort((a, b) => a.v - b.v);
  const byOp = {};
  for (const s of arr) { const k = s.op + (s.isWrite ? '(W)' : ''); byOp[k] = (byOp[k] || 0) + 1; }
  console.log('\nLANE ' + lane + ': ' + (lane === 'A' ? 'byte ' + hex(A_BYTE) : lane === 'B' ? 'record words ' + [...B_WORDS].map(hex).join('/')
    : lane === 'C' ? 'neighbours ' + [...C_OFFS].map(hex).join('/') : 'imm12 via add-imm base')
    + ' — ' + arr.length + ' site(s)');
  console.log('   by op', JSON.stringify(byOp));
  for (const s of arr) {
    console.log('   ' + hex(s.v) + ' ' + s.op.padEnd(5) + ' eff=' + hex(s.eff) + ' via=' + s.via
      + (s.isWrite ? '  WRITER' : '') + '\n      ' + s.mn);
  }
}

// bit-test guards for lane A readers: tst/teq/cmp/cmn imm on the loaded reg within 4 insns
console.log('\nLANE A bit guards:');
for (const s of sites.A.filter((x) => !x.isWrite)) {
  let g = '';
  for (let k = 1; k <= 4 && s.v + 4 * k < TEXT_END; k++) {
    const w2 = W(s.v + 4 * k);
    const q2 = dprocImm(w2);
    if (q2 && q2.opc >= 8 && q2.opc <= 11 && q2.rn === s.rd) {
      g = hex(q2.val) + ' (' + [...Array(8)].map((_, b) => (q2.val >>> b) & 1 ? 'bit' + b : '').filter(Boolean).join(',') + ') ' + q2.op + ' @' + hex(s.v + 4 * k);
      break;
    }
    const p2 = dprocReg(w2);
    if (p2 && p2.opc >= 8 && p2.opc <= 11 && ((p2.rn === s.rd) || (p2.op === 'cmp' && p2.rn === s.rd))) { g = 'reg-form ' + p2.op + ' @' + hex(s.v + 4 * k); break; }
  }
  console.log('   ' + hex(s.v) + ' ' + s.op + (g ? '  guard: ' + g : '  (no imm bit-test within 4)'));
}

// ---------- controls ----------
console.log('\nCONTROLS');
const bad = [];
const aR = sites.A.find((s) => s.v === 0xb50fc && s.op === 'ldrb' && !s.isWrite && s.src === 0xb50f8);
if (!aR) bad.push('A reader 0xb50fc (movw 0xb50f8)');
if (W(0xb5100) !== 0xe3100040) bad.push('tst r0,#64 @0xb5100 (found ' + hex(W(0xb5100)) + ')');
const bR = sites.B.find((s) => s.v === 0xb5124 && s.op === 'ldr' && !s.isWrite && s.src === 0xb511c);
if (!bR) bad.push('B reader 0xb5124 (movw 0xb511c)');
const cW = sites.C.find((s) => s.v === 0xb4bd0 && s.op === 'str' && s.isWrite && s.src === 0xb4bc0);
if (!cW) bad.push('C writer 0xb4bd0 (orr #0x1000 into em+0xba44, movw @0xb4bc0)');
const c4 = sites.C.find((s) => (s.v === 0xb4c44 && s.op === 'strh' && s.isWrite) || (s.v === 0xb4c3c && s.op === 'ldrh'));
if (!c4) bad.push('C count pair 0xb4c3c/0xb4c44 on movw #0xba4c @0xb4c38');
if (bad.length) { console.log('CONTROL-FAIL: ' + bad.join('; ')); process.exit(1); }
console.log('CONTROL-PASS: A reader 0xb50fc + tst r0,#64 @0xb5100; B reader 0xb5124;');
console.log('              C writer 0xb4bd0 (em+0xba44 |= 0x1000); C count pair 0xb4c3c/0xb4c44 (movw #0xba4c @0xb4c38).');
console.log('Bound: lanes A/B/C require the offset in a register via movw (+add/writeback) within 12 insns;');
console.log('       lane D requires add-imm base + imm12 within 8 insns; bases received as arguments are out of scope.');
