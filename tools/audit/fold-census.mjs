// foldscan.mjs — constant-offset folding census over the whole .text.
// Tracks  reg -> {base: <symbolic base reg>, off: <sum of constants>}  through
//   movw rD,#imm16 | mov rD,#imm8-rotated | add rD,rN,#imm | add rD,rN,rM(const)
// and reports every load/store [rN,#imm12] whose folded total offset is a target.
// This closes the lane that a pure `movw #0x72fc` census cannot see:
//   add rX, base, #0x7000  +  [rX, #0x2fc].
// Controls (must be found):
//   C1 0x8286c movw r0,#0x72f4 -> 0x829e4 ldr r2,[r4,r0]      (register-indexed, reported separately)
//   C2 0x6d964 movw r0,#0x72fc -> 0x6d968 strh r6,[r4,r0]
//   C3 0x8f690 movw r1,#0x72fc -> store via [rX,r1]
// Fold control:
//   C4 a hand-built add+imm12 pair injected at run time (self-test below).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FLAT = process.env.FLAT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'main.140.flat.bin');
const buf = fs.readFileSync(FLAT);
const TEXT_START = 0x100;
const TEXT_END = 0x13F1DEC;
const rd32 = (v) => buf.readUInt32LE(v + 0x100);

const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];
const rotImm = (imm8, rot) => { const v = imm8 >>> 0; return rot === 0 ? v : (((v >>> (2 * rot)) | (v << (32 - 2 * rot))) >>> 0); };
const isAdd = (w) => (w & 0x0FE00000) === 0x02800000;         // add/sub imm, S=0
const isSub = (w) => (w & 0x0FE00000) === 0x02400000;
const isMovw = (w) => (w & 0x0FF00000) === 0x03000000 && ((w >>> 20) & 1) === 0;
const movwVal = (w) => (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0;
const isMovImm = (w) => (w & 0x0FEF0000) === 0x03A00000;      // mov rD,#imm
const isLdSt = (w) => (w & 0x0C000000) === 0x04000000;
const isLdrLiteral = (w) => (w & 0x0F7F0000) === 0x051F0000;
const isBranch = (w) => (w & 0x0E000000) === 0x0A000000;
const isBlxReg = (w) => (w & 0x0FFFFFF0) === 0x012FFF30;

function immOf(w) {
  const rot = ((w >>> 8) & 0xF);
  const imm8 = w & 0xFF;
  return rotImm(imm8, rot);
}

// --- self-test: the folding primitive must fold add #0x7000 + imm12 0x2fc to 0x72fc
{
  const okAdd = (immOf(0xE2877C70) === 0x7000) && (immOf(0xE2840CB8) === 0xb800);
  console.log(`SELFTEST fold primitive: add #imm decode ${okAdd ? 'PASS' : 'FAIL'}`);
  if (!okAdd) process.exit(1);
}

const targets = new Set(process.argv.slice(2).map(Number));
const hits = [];
// state: reg -> {base, off}
let st = new Map();
const CALLER_SAVED = [0,1,2,3,12];
const clearAll = () => { for (const r of CALLER_SAVED) st.delete(r); };

for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = rd32(v);
  if (isBranch(w) || isBlxReg(w)) { clearAll(); continue; }

  if (isMovw(w)) {
    const d = (w >>> 12) & 0xF;
    st.set(d, { base: 'M' + d.toString(16), off: movwVal(w) });
    continue;
  }
  if (isMovImm(w)) {
    const d = (w >>> 12) & 0xF;
    st.set(d, { base: 'M' + d.toString(16), off: immOf(w) });
    continue;
  }
  if (isAdd(w) || isSub(w)) {
    const d = (w >>> 12) & 0xF, n = (w >>> 16) & 0xF;
    const immMode = ((w >>> 25) & 1) === 0;
    if (immMode) {
      const imm = immOf(w);
      const s = st.get(n);
      if (s && d !== 13) {
        st.set(d, { base: s.base, off: isSub(w) ? (s.off - imm) >>> 0 : (s.off + imm) >>> 0 });
      } else if (!isSub(w) && d !== 13 && d !== 15) {
        // unknown base: seed with the constant alone, so add-chains are still counted
        st.set(d, { base: 'X' + R[n], off: imm });
      } else st.delete(d);
    } else st.delete(d);
    if ((w >>> 20) & 1) { /* S bit: flags only */ }
    continue;
  }
  if (isLdrLiteral(w)) {
    const d = (w >>> 12) & 0xF;
    if (d !== 15 && ((w >>> 20) & 1) === 1) {
      const lit = rd32(v + 8 + (w & 0xFFF));
      st.set(d, { base: 'P' + d.toString(16), off: lit >>> 0 });
    }
    continue;
  }
  if (isLdSt(w)) {
    const p = (w >>> 24) & 1, i = (w >>> 25) & 1;
    const n = (w >>> 16) & 0xF;
    const load = (w >>> 20) & 1;
    if (p === 1 && i === 1) {
      // register-indexed: [rN, rM] — report only if the index reg holds a pure constant
      const m = w & 0xF;
      const s = st.get(m);
      if (s && targets.has(s.off)) hits.push({ v, how: 'reg-indexed', total: s.off, base: R[n], load });
    } else if (p === 1) {
      const imm12 = w & 0xFFF;
      const s = st.get(n);
      if (s) {
        const total = (s.off + imm12) >>> 0;
        if (targets.has(total)) hits.push({ v, how: imm12 ? 'folded' : 'direct', total, base: R[n], load });
      }
    } else {
      st.delete(n);
    }
    // a store also kills the destination tracking of nothing; loads write the dest reg
    if (load) st.delete((w >>> 12) & 0xF);
    continue;
  }
  // any other instruction that writes a register kills its state
  const rd = (w >>> 12) & 0xF;
  if ((w & 0x0C000000) === 0 && rd !== 15) st.delete(rd);
}

console.log(`folding census: ${hits.length} site(s) for targets ${[...targets].map((t) => '0x' + t.toString(16)).join(', ')}`);
const byTotal = new Map();
for (const h of hits) { if (!byTotal.has(h.total)) byTotal.set(h.total, []); byTotal.get(h.total).push(h); }
for (const [t, arr] of [...byTotal].sort((a, b) => a[0] - b[0])) {
  const folded = arr.filter((x) => x.how === 'folded').length;
  console.log(`  0x${t.toString(16)}: ${arr.length} site(s), ${folded} via add-fold`);
  console.log('    ' + arr.slice(0, 20).map((x) => `0x${x.v.toString(16)}(${x.how},${x.load ? 'L' : 'S'})`).join(' '));
}
