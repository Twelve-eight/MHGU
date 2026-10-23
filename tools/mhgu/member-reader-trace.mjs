// Mini symbolic executor for member readers: track regs as {type:'r5+k',k} or {type:'imm',v}
// On bl 0x3df2a8 emit (objOff, size). On bl 0x3df1b8/0x3df22c emit bitstream read w/ r1=bitwidth-cap.
import fs from 'node:fs';
const FL = fs.readFileSync('G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin');
const rd32 = v => FL.readUInt32LE(v + 0x100);
const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];

export function traceReader(vaddr, maxInstr = 400) {
  const regs = { r0: { t: 'r5', k: 0 }, r5: { t: 'r5', k: 0 } };  // arg0/member base seeds
  const out = [];
  let lastBranch = null;
  for (let a = vaddr; a < vaddr + maxInstr * 4; a += 4) {
    const w = rd32(a);
    const cond = w >>> 28; if (cond === 0xF) continue;
    const op = (w >>> 21) & 0xF, S = (w >>> 20) & 1;
    const isDP = (w >>> 26) === 0 && ((w >>> 25) & 1 || !(w & 0x90) || (w & 0x90) !== 0x90);
    const dec = x => x === undefined ? '?' : x;

    // ---- data processing (imm operand2) ----
    if (((w >>> 26) & 3) === 0 && (w >>> 25) & 1) {
      const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15;
      let imm = w & 0xFF, rot = ((w >>> 8) & 0xF) * 2;
      imm = (imm >>> rot) | (rot ? (imm << (32 - rot)) >>> 0 : 0);
      if (op === 0xD) { // mov
        regs[R[rd]] = { t: 'imm', v: imm };
      } else if (op === 0x4) { // add
        const b = regs[R[rn]];
        regs[R[rd]] = b && b.t === 'r5' ? { t: 'r5', k: b.k + imm } : { t: 'unk' };
      } else if (op === 0x2) { // sub
        const b = regs[R[rn]];
        regs[R[rd]] = b && b.t === 'r5' ? { t: 'r5', k: b.k - imm } : { t: 'unk' };
      } else if (op === 0xA) { /* cmp, no write */ }
      else regs[R[rd]] = { t: 'unk' };
      continue;
    }
    // ---- data processing (reg operand2, no shift-by-reg) ----
    if (((w >>> 26) & 3) === 0 && !(w & 0x10) && !((w >>> 25) & 1)) {
      const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15, rm = w & 15;
      const shAmt = (w >>> 7) & 0x1F, shT = (w >>> 5) & 3;
      const b = regs[R[rn]], m = regs[R[rm]];
      const applyShift = (val, off) => {
        if (shAmt === 0) return off;
        const s = ['lsl','lsr','asr','ror'][shT];
        if (s === 'lsl') return off << shAmt;
        if (s === 'lsr') return off >>> shAmt;
        return undefined;
      };
      if (op === 0xD) { // mov reg
        regs[R[rd]] = m ? { ...m } : { t: 'reg', r: R[rm] };
      } else if (op === 0x4 && b && b.t === 'r5' && m && m.t === 'imm') { // add rX,r5,rImm
        regs[R[rd]] = { t: 'r5', k: b.k + m.v };
      } else if (op === 0x2 && b && b.t === 'r5' && m && m.t === 'imm') {
        regs[R[rd]] = { t: 'r5', k: b.k - m.v };
      } else if (op === 0x4 && m && m.t === 'r5' && b && b.t === 'imm') {
        regs[R[rd]] = { t: 'r5', k: m.k + b.v };
      } else if (op === 0xA) { /* cmp */ }
      else regs[R[rd]] = { t: 'unk' };
      continue;
    }
    // ---- movw/movt ----
    if ((w & 0x0FF00000) === 0x03000000) { // movw
      const rd = (w >>> 12) & 15;
      const imm = (w & 0xFFF) | ((w >>> 4) & 0xF000);
      const cur = regs[R[rd]];
      regs[R[rd]] = { t: 'imm', v: (cur && cur.hi ? cur.hi << 16 : 0) | imm, lo: imm };
      continue;
    }
    if ((w & 0x0FF00000) === 0x03400000) { // movt
      const rd = (w >>> 12) & 15;
      const imm = (w & 0xFFF) | ((w >>> 4) & 0xF000);
      const cur = regs[R[rd]];
      regs[R[rd]] = { t: 'imm', v: ((imm << 16) | (cur ? cur.v & 0xFFFF : 0)) >>> 0, hi: imm };
      continue;
    }
    // ---- ldr immediate offset from r5 ----
    if (((w >>> 26) & 3) === 1 && ((w >>> 20) & 1)) { // ldr
      const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15;
      const U = (w >>> 23) & 1, imm = w & 0xFFF;
      if (rn === 5) regs[R[rd]] = { t: 'mem5', k: U ? imm : -imm }; // loaded value from r5+k
      else regs[R[rd]] = { t: 'unk' };
      continue;
    }
    // ---- bl ----
    if ((w >>> 24) === 0xEB) {
      let i = w & 0xFFFFFF; if (i & 0x800000) i -= 0x1000000;
      const tgt = (a + 8 + (i << 2)) >>> 0;
      const r1 = regs['r1'], r2 = regs['r2'], r0 = regs['r0'];
      if (tgt === 0x3df2a8) {
        const off = r1 && r1.t === 'r5' ? r1.k : (r0 && r0.t === 'r5' ? r0.k : null);
        const sz = r2 && r2.t === 'imm' ? r2.v : null;
        out.push({ a, kind: 'read', objOff: off, size: sz, r1: r1 ? r1.t + ':' + (r1.k ?? r1.v) : '?' });
      } else if (tgt === 0x3df378) {
        const off = r1 && r1.t === 'r5' ? r1.k : null;
        const sz = r2 && r2.t === 'imm' ? r2.v : null;
        out.push({ a, kind: 'write', objOff: off, size: sz });
      } else if (tgt === 0x3df1b8) {
        out.push({ a, kind: 'bitcap', r1: r1 && r1.t === 'imm' ? r1.v : '?' });
      } else if (tgt === 0x3df22c) {
        out.push({ a, kind: 'bitread', r1: r1 ? r1.t : '?' });
      } else {
        out.push({ a, kind: 'call', tgt });
      }
      continue;
    }
    // ---- b / bne loop back ----
    if ((w >>> 24) === 0xEA || (w >>> 24) === 0x1A || (w >>> 24) === 0x0A) {
      let i = w & 0xFFFFFF; if (i & 0x800000) i -= 0x1000000;
      const tgt = (a + 8 + (i << 2)) >>> 0;
      if (tgt < a) out.push({ a, kind: 'loopback', to: tgt });
      continue;
    }
    // stores/other: invalidate destination regs conservatively on str r5-relative
    // pop returns
    if ((w >>> 16) === 0xE8BD && (w & 0x8000)) { out.push({ a, kind: 'ret' }); break; }
  }
  return out;
}

// CLI: node member-reader-trace.mjs <vaddr>
