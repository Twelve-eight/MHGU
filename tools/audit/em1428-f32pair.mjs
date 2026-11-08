// em1428-f32pair.mjs — census + writer classification for the f32 pair at sub+0x59c / sub+0x5a4
// (sub = [em+0x1428]), the two fields the dispatcher tests `> 0` for section 8.
//
// Read-only on the image. Replaces an earlier, never-executed v2 left behind by a subagent.
// Lanes covered explicitly (and each one states its own bound so a zero cannot be read as absence):
//   A  imm12 word ldr/str with offset 0x59c or 0x5a4  (ARM A1/A2 form, P=1)
//   B  VFP vldr/vstr with register offset after `movw rX,#0x59c|0x5a4` (imm8*4 <= 0x3FC cannot
//      reach these offsets, so this is the only VFP lane that can)
//   C  writer classification: last def of the stored register within 12 instructions
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('FIELD PAIR sub+0x59c / sub+0x5a4   (sub = [em+0x1428])');
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }
const D = (w, a) => (decode ? decode(w, a) : '0x' + (w >>> 0).toString(16));
const hex = (n) => '0x' + (n >>> 0).toString(16);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

// function starts: stmdb sp!, {...,lr}  (bit 14 of the list)  -- note >>> 0, the signed-mask trap
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

const OFFS = [0x59c, 0x5a4];
const rows = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w >>> 26) & 3) !== 1 || ((w >>> 25) & 1) !== 0) continue;  // load/store, immediate form
  const imm = w & 0xFFF;
  if (!OFFS.includes(imm)) continue;
  const L = (w >>> 20) & 1, B = (w >>> 22) & 1;
  const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
  rows.push({ v, imm, L, B, rn, rd, mn: D(w, v) });
}
console.log('\nA: imm12 word sites', rows.length);
const byOp = {};
for (const r of rows) { const k = (r.L ? 'ldr' : 'str') + (r.B ? 'b' : ''); byOp[k] = (byOp[k] || 0) + 1; }
console.log('   by op', JSON.stringify(byOp));

// control: the dispatcher's own reads must be in the list
const control = [0x828a8 - 4, 0x828c0 - 4];  // the ldr r0,[r4,r0] that feeds the vldr (register lane)
console.log('   control note: the dispatcher reaches these fields only through the movw+add lane (0x8289c-0x828a8),');
console.log('   so it is NOT expected in lane A; lane B below covers it.');

// lane B: movw rX,#0x59c|0x5a4 then a register-offset VFP access using rX
let laneB = 0;
const seen = new Set();   // lane B addresses, used for the hard control assertion
const pending = new Map();      // reg -> {imm, age} from movw, expires after 4 instructions
const addrReg = new Map();      // reg -> offset, for `add rD, rB, rX` where rX is pending
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  for (const [r, o] of pending) { o.age++; if (o.age > 4) pending.delete(r); }
  if (((w >>> 16) & 0xFFF0) === 0xE300) {          // movw: imm16 = imm4:imm12 (do NOT pin imm4)
    const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF), rd = (w >>> 12) & 15;
    if (OFFS.includes(imm)) { pending.set(rd, { imm, age: 0 }); addrReg.delete(rd); }
    else { pending.delete(rd); addrReg.delete(rd); }
  }
  // add rD, rB, rX  (register form, shift 0) with rX pending -> rD is an address at that offset
  if (((w & 0x0FE00000) >>> 0) === 0x00800000 && ((w >>> 4) & 3) === 0) {
    const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15, rm = w & 15;
    if (pending.has(rm)) { addrReg.set(rd, pending.get(rm).imm); }
  }
  const mn = D(w, v);
  if (/^v(str|ldr)\b/.test(mn)) {
    let off = null;
    const m1 = /\[r(\d+)\]\s*$/.exec(mn) || /\[r(\d+)\],/.exec(mn);
    if (m1 && addrReg.has(Number(m1[1]))) off = addrReg.get(Number(m1[1]));
    const m2 = /\[r(\d+), r(\d+)\]/.exec(mn);
    if (m2 && pending.has(Number(m2[2]))) off = pending.get(Number(m2[2])).imm;
    if (off !== null) { console.log('   B', hex(v), mn, ' offset', hex(off), ' fn', hex(fnStart(v))); laneB++; seen.add(v); }
    // cleanup must not delete the register the add just defined, and must not touch vldr/vstr
    const wr = (w >>> 12) & 15;
    const isAddForming = (((w & 0x0FE00000) >>> 0) === 0x00800000) && ((w >>> 4) & 3) === 0 && pending.has(w & 15);
    if (!/^v(str|ldr)/.test(mn) && !isAddForming) addrReg.delete(wr);
  }
}
console.log('\nB: VFP sites reaching these offsets via movw (+add) or register offset:', laneB);
// HARD CONTROL: the dispatcher pair must be in lane B, else the matcher is dead and every zero below is meaningless.
const CONTROL = [0x828a8, 0x828c0];
const missing = CONTROL.filter((a) => !seen.has(a));
if (missing.length) {
  console.log('   CONTROL-FAIL missing ' + missing.map(hex).join(', '));
  process.exit(1);
}
console.log('   CONTROL-PASS both 0x828a8 and 0x828c0 found in lane B');

// lane C: classify each store by the last def of its data register within 12 insns
function lastDef(v, reg) {
  for (let k = 1; k <= 12; k++) {
    const a = v - 4 * k, w = W(a);
    const mn = D(w, a);
    const m = /^(mov|movw|ldr|add|vldr|sub|orr|and|mvn|lsr|lsl)\s+r(\d+)\b/.exec(mn);
    if (m && Number(m[2]) === reg) return { at: a, mn };
    const mv = /^mov r(\d+), r(\d+)$/.exec(mn);
    if (mv && Number(mv[1]) === reg) return { at: a, mn };
  }
  return null;
}
console.log('\nC: writer classification (stores only)');
let zero = 0, other = 0;
for (const r of rows.filter(x => !x.L)) {
  const d = lastDef(r.v, r.rd);
  const isZero = d && /^mov r\d+, #0$|^mov r\d+, #0x0$/.test(d.mn);
  if (isZero) zero++;
  else other++;
  console.log('  ', hex(r.v), r.mn, ' fn', hex(fnStart(r.v)), '| last def r' + r.rd + ':', d ? hex(d.at) + ' ' + d.mn : 'none in 12', isZero ? '[ZERO]' : '[OTHER]');
}
console.log('\nC summary: constant-zero writers', zero, '| other/untraced', other);
console.log('Bound: lane A cannot see movw+add+vstr writes, lane B only sees those whose index register is still');
console.log('the movw target; a writer that receives sub as a function argument is invisible to both.');
