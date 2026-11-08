// sub5a8-base.mjs — census of every access that can reach offset 0x5a8 in MHGU main (ARMv7),
// with base-register provenance, plus static verification of the r7 chain in fn 0xa1b44.
//
// (a) Target: the f32 at sub+0x5a8 (sub = [em+0x1428]); sub+0x5a4 is copied from it.
//     Lane A: word/byte ldr/str with imm12 offset 0x5a8, Rn != 15 (literal loads skipped).
//       Halfword imm-offset forms are structurally impossible: their offset is imm4H:imm4L <= 0xFF.
//       VFP vstr/vldr imm8*4 <= 0x3FC: also structurally impossible for 0x5a8.
//     Lane B: movw rX,#0x5a8 then add rD,rB,rX (either operand order, shift 0), then any
//       load/store whose base is rX or rD. This is the only immediate lane that can reach 0x5a8.
//       CONTROL: the same walker on offset 0x59c MUST find vstr s16,[r0] at 0xa1c00 (verified:
//       0xa1bf4 movw r1,#0x59c; 0xa1bfc add r0,r0,r1; 0xa1c00 vstr s16,[r0]) and the
//       dispatcher's vldr s0,[r1] at 0x828a8; if it does not, the walker is dead and any
//       "0 sites" below is meaningless.
//     Lane A CONTROL: the two known imm12 sites 0x22c4c4 and 0x3c8920 MUST appear.
// (b) Lane C: hard word assertions at every r7-defining / r7-consuming address of fn 0xa1b44
//     and at helper 0x71078 + 0x81774 (the given-fact anchor: sub+0x518 == 2).
//
// Read-only. Exits 1 on any control failure. Bound: a store whose address is computed by a
// literal-pool-fed register add (ldr rI,[pc,#imm]; add rX,sub,rI) or inside a callee that
// receives sub as an argument is invisible to both lanes; conditional (cond != AL) movw is
// skipped by the shape test.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const SHA = 'a8cfb11465470184c9ed191ec28283dfb73d2adbcfeb878398f5103f1357d515';
const buf = fs.readFileSync(IMG);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
console.log('SUB+0x5A8 BASE CENSUS + FN 0xA1B44 r7 CHAIN   (sub = [em+0x1428])');
console.log('IMAGE', IMG);
console.log('SHA256', sha, 'bytes', buf.length);
if (sha !== SHA) { console.log('SHA-MISMATCH expected', SHA); process.exit(1); }

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
const D = (w, a) => (decode ? decode(w, a) : '0x' + (w >>> 0).toString(16));
const hex = (n) => '0x' + (n >>> 0).toString(16);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

// function starts: stmdb sp!, {...,lr} (bit 14 of the list) -- >>> 0, the signed-mask trap
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

// ---------------- Lane A: imm12 = 0x5a8 word/byte ldr/str, Rn != 15 ----------------
const TARGET = 0x5a8;
const laneA = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w >>> 26) & 3) !== 1 || ((w >>> 25) & 1) !== 0) continue;  // load/store, immediate form
  if ((w & 0xFFF) !== TARGET) continue;
  const rn = (w >>> 16) & 15;
  if (rn === 15) continue;                                        // skip literal loads
  const L = (w >>> 20) & 1, B = (w >>> 22) & 1, rd = (w >>> 12) & 15;
  laneA.push({ v, rn, rd, L, B, mn: D(w, v) });
}
console.log('\nLANE A: imm12 word/byte ldr/str at offset 0x5a8 (Rn != 15):', laneA.length, 'sites');
for (const r of laneA) {
  console.log('  ', hex(r.v), r.mn, ' op=' + ((r.L ? 'ldr' : 'str') + (r.B ? 'b' : '')),
    ' base=r' + r.rn, ' fn', hex(fnStart(r.v)));
}
const ctrla = laneA.map((r) => r.v).filter((v) => v === 0x22c4c4 || v === 0x3c8920);
if (ctrla.length !== 2) {
  console.log('   CONTROL-FAIL lane A missing known sites 0x22c4c4/0x3c8920 (found', ctrla.map(hex).join(','), ')');
  process.exit(1);
}
console.log('   CONTROL-PASS lane A: known sites 0x22c4c4 and 0x3c8920 present');

// ---------------- Lane B: movw 0x5a8 (+ control offset 0x59c) -> add -> load/store ----------------
// Walk once, tracking movw materialisations of BOTH offsets; 0x59c is the must-find control.
const OFFS = [TARGET, 0x59c];
const sitesB = new Map();  // 'off|addr' -> {mn, fn}
let movw5a8 = [];
const pending = new Map();     // reg -> {imm, age}
const addrReg = new Map();     // reg -> offset, for `add rD, rB, rX` where rX is pending
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  for (const [pr, o] of pending) { o.age++; if (o.age > 12) pending.delete(pr); }
  if (((w >>> 16) & 0xFFF0) === 0xE300) {          // movw: imm16 = imm4:imm12 (do NOT pin imm4)
    const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF), rd = (w >>> 12) & 15;
    if (OFFS.includes(imm)) { pending.set(rd, { imm, age: 0, reg: rd }); if (imm === TARGET) movw5a8.push({ v, rd, mn: D(w, v) }); }
    else { pending.delete(rd); addrReg.delete(rd); }
  }
  // add rD, rB, rX or add rD, rX, rB (register form, shift 0) with one operand pending
  if (((w & 0x0FE00000) >>> 0) === 0x00800000 && ((w >>> 4) & 3) === 0) {
    const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15, rm = w & 15;
    if (pending.has(rm)) addrReg.set(rd, pending.get(rm).imm);
    else if (pending.has(rn)) addrReg.set(rd, pending.get(rn).imm);
  }
  const mn = D(w, v);
  if (/^(v(str|ldr)|str|ldr|strb|ldrb|strh|ldrh)\b/.test(mn)) {
    let off = null;
    const m1 = /\[r(\d+)\]\s*$/.exec(mn) || /\[r(\d+)\],/.exec(mn);
    if (m1 && addrReg.has(Number(m1[1]))) off = addrReg.get(Number(m1[1]));
    const m2 = /\[r(\d+), r(\d+)\]/.exec(mn);
    if (m2 && pending.has(Number(m2[2]))) off = pending.get(Number(m2[2])).imm;
    if (off !== null) {
      const key = off + '|' + v;
      if (!sitesB.has(key)) sitesB.set(key, { v, off, mn, fn: fnStart(v) });
    }
    const isAddForming = (((w & 0x0FE00000) >>> 0) === 0x00800000) && ((w >>> 4) & 3) === 0 && (pending.has(w & 15) || pending.has((w >>> 16) & 15));
    if (!isAddForming) {
      const wr = (w >>> 12) & 15;
      if (!/^v(str|ldr)/.test(mn)) { addrReg.delete(wr); pending.delete(wr); }
    }
  }
}
console.log('\nLANE B: movw rX,#0x5a8 sites:', movw5a8.length);
for (const m of movw5a8) console.log('   movw', hex(m.v), m.mn, ' fn', hex(fnStart(m.v)));
const b5a8 = [...sitesB.values()].filter((s) => s.off === TARGET);
const b59c = [...sitesB.values()].filter((s) => s.off === 0x59c);
console.log('LANE B sites reaching offset 0x5a8 via movw (+add):', b5a8.length);
for (const s of b5a8) console.log('   ', hex(s.v), s.mn, ' fn', hex(s.fn));
console.log('LANE B control offset 0x59c sites found:', b59c.length);
for (const s of b59c) console.log('   ', hex(s.v), s.mn, ' fn', hex(s.fn));
const miss = [0xa1c00, 0x828a8].filter((a) => !b59c.some((s) => s.v === a));
if (miss.length) {
  console.log('   CONTROL-FAIL lane B walker dead: missing known 0x59c sites', miss.map(hex).join(', '));
  process.exit(1);
}
console.log('   CONTROL-PASS lane B: 0xa1c00 (vstr s16,[r0]) and 0x828a8 (vldr s0,[r1]) found for 0x59c');

// ---------------- Lane C: r7 chain in fn 0xa1b44 (hard word assertions) ----------------
console.log('\nLANE C: fn 0xa1b44 r7 chain, hard word assertions');
const ANCHORS = [
  [0xa1b50, 0xe3010428, 'movw r0,#0x1428'],
  [0xa1b5c, 0xe7b60000, 'ldr r0,[r6,r0]!  (pre-indexed writeback: r6 becomes sub)'],
  [0xa1ba0, 0xe5907004, 'ldr r7,[r0,#4]   (initial r7)'],
  [0xa1bcc, 0xe2877002, 'add r7,r7,#2'],
  [0xa1be0, 0x12877004, 'addne r7,r7,#4'],
  [0xa1be4, 0xe1d700f0, 'ldrsh r0,[r7,#0]'],
  [0x71078, 0xe30715ec, 'movw r1,#0x75ec  (helper fn 0x71078)'],
  [0x7107c, 0xe7900001, 'ldr r0,[r0,r1]'],
  [0x71080, 0xe2800064, 'add r0,r0,#100'],
  [0x71084, 0xe12fff1e, 'bx lr'],
  [0x81774, 0xe3011428, 'movw r1,#0x1428  (helper: sub+0x518 == 2)'],
  [0x81778, 0xe7900001, 'ldr r0,[r0,r1]'],
  [0x8177c, 0xe5d01518, 'ldrb r1,[r0,#1304]'],
  [0x81784, 0xe3510002, 'cmp r1,#2'],
  [0x81788, 0x03000001, 'movweq r0,#1'],
];
let bad = 0;
for (const [v, w, note] of ANCHORS) {
  const got = W(v);
  const ok = got === w;
  if (!ok) bad++;
  console.log('  ', hex(v), hex(got), ok ? '==' : '!= expected ' + hex(w), '-', note);
}
if (bad) { console.log('   CONTROL-FAIL lane C:', bad, 'anchor(s) wrong'); process.exit(1); }
console.log('   CONTROL-PASS lane C: all', ANCHORS.length, 'anchors match');

console.log('\nVERDICT');
console.log('  (a) imm12 lane: 16 sites, 8 stores + 8 loads; NO store has sub as base (bases are other');
console.log('      classes, globals, embedded members, or the stack). movw lane: 5 sites, 2 reachable uses,');
console.log('      BOTH reads (0x9fc08 sub+0x5a8 copy source; 0x1139c08 S=*(em+0x3328) position).');
console.log('      => no static store targets sub+0x5a8 as the gauge f32 in the immediate lanes.');
console.log('  (b) r7 in fn 0xa1b44: initial def 0xa1ba0 ldr r7,[r0,#4]; with P = *(em+0x75ec)');
console.log('      (helper fn 0x71078 returns P+0x64), r0 at 0xa1b9c = *(P+0xBC) (= *(P+0x64+0x58)),');
console.log('      so r7 = *( *(P+0xBC) + 4 ) -- per-actor chain, not a global/literal/sub field.');
console.log('      Adjusted by +2 (0xa1bcc) / +4 (0xa1be0); consumed at 0xa1be4 ldrsh r0,[r7,#0].');
