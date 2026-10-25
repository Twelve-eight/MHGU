// ARM32 (ARMv7-A) minimal disassembler for MHGU main.140.flat.bin
// flat_offset = vaddr + 0x100
import fs from 'node:fs';

export const FLAT = process.env.FLAT || 'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
export const buf = fs.readFileSync(FLAT);
export const TEXT_END = 0x13F1DEC;

export function rd32(vaddr) { return buf.readUInt32LE(vaddr + 0x100); }
export function rd16(vaddr) { return buf.readUInt16LE(vaddr + 0x100); }
export function rdb(vaddr) { return buf[vaddr + 0x100]; }

const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];
const COND = ['eq','ne','cs','cc','mi','pl','vs','vc','hi','ls','ge','lt','gt','le','',''];
const DPOP = ['and','eor','sub','rsb','add','adc','sbc','rsc','tst','teq','cmp','cmn','orr','mov','bic','mvn'];

function shifter(w) {
  if (w & 0x10) {
    const rs = R[(w >>> 8) & 0xF], st = (w >>> 5) & 3;
    return `${R[w & 0xF]}, ${['lsl','lsr','asr','ror'][st]} ${rs}`;
  }
  const imm = (w >>> 7) & 0x1F, st = (w >>> 5) & 3;
  if (imm === 0 && st === 0) return R[w & 0xF];
  if (imm === 0 && st === 1) return `${R[w & 0xF]}, lsr #32`;
  if (imm === 0 && st === 2) return `${R[w & 0xF]}, asr #32`;
  if (imm === 0 && st === 3) return `${R[w & 0xF]}, rrx`;
  return `${R[w & 0xF]}, ${['lsl','lsr','asr','ror'][st]} #${imm}`;
}

function immRot(w) {
  let imm = w & 0xFF, rot = ((w >>> 8) & 0xF) * 2;
  return ((imm >>> rot) | (imm << (32 - rot))) >>> 0;
}

function sext24(w, lo) {
  // lo = bit offset of the 24-bit field
  let v = (w >>> lo) & 0xFFFFFF;
  if (v & 0x800000) v -= 0x1000000;
  return v;
}

export function decode(w, addr) {
  const cond = w >>> 28;
  const cc = COND[cond];

  if (cond === 0xF) {
    if (((w & 0xFE000000) >>> 0) === 0xFA000000) { // BLX imm
      let off = (w & 0xFFFFFF) << 2; // H bit
      const h = (w >>> 24) & 1;
      if (off & 0x2000000) off -= 0x4000000;
      return `blx 0x${((addr + 8 + off + h * 2) >>> 0).toString(16)}`;
    }
    if ((w & 0xFD70F000) === 0xF550F000) return `pld/pli [${R[(w>>>16)&0xF]}, #${w & 0xFFF}]`;
    if ((w & 0x0FE00000) === 0x0C400000) return `mcrr/mrrc`;
    return `.word 0x${(w>>>0).toString(16).padStart(8,'0')}`;
  }

  const b27_26 = (w >>> 26) & 3;

  // ---- ldm/stm (bits 27:25 = 100) ----
  if (((w >>> 25) & 7) === 4) {
    const P = (w >>> 24) & 1, U = (w >>> 23) & 1, Wb = (w >>> 21) & 1, L = (w >>> 20) & 1;
    const rn = R[(w >>> 16) & 0xF];
    const regs = [];
    for (let i = 0; i < 16; i++) if (w & (1 << i)) regs.push(R[i]);
    const rl = `{${regs.join(', ')}}`;
    if (rn === 'sp' && P && !U && Wb && !L) return `push${cc} ${rl}`;
    if (rn === 'sp' && !P && U && Wb && L) return `pop${cc} ${rl}`;
    return `ldm/stm${cc} ${R[(w>>>16)&0xF]}${Wb?'!':''} ${rl}`;
  }

  // ---- branch (bits 27:25 = 101) ----
  if (((w >>> 25) & 7) === 5) {
    let off = (w & 0xFFFFFF) << 2; if (off & 0x2000000) off -= 0x4000000;
    const tgt = (addr + 8 + off) >>> 0;
    return (w & 0x01000000 ? `bl${cc}` : `b${cc}`) + ` 0x${tgt.toString(16)}`;
  }

  // ---- load/store word/byte (bits 27:26 = 01) ----
  if (b27_26 === 1) {
    const I = (w >>> 25) & 1, P = (w >>> 24) & 1, U = (w >>> 23) & 1, B = (w >>> 22) & 1,
      W = (w >>> 21) & 1, L = (w >>> 20) & 1;
    const rn = R[(w >>> 16) & 0xF], rt = R[(w >>> 12) & 0xF];
    const mn = (L ? 'ldr' : 'str') + (B ? 'b' : '') + cc;
    // Media instructions (bit25 = 1 and bit4 = 1) are not loads/stores.
    if (I && ((w >>> 4) & 1)) {
      // Extend (+add): bits 27:23 = 01101, bits 9:4 = 000111; op = bits 22:20, rotate = bits 11:10 * 8.
      if (((w >>> 23) & 0x1F) === 0x0D && ((w >>> 4) & 0x3F) === 0x07) {
        const op = (w >>> 20) & 7, rn = (w >>> 16) & 0xF, rot = ((w >>> 10) & 3) * 8;
        // [plain form (Rn = pc), accumulate form]
        const name = { 0: ['sxtb16', 'sxtab16'], 2: ['sxtb', 'sxtab'], 3: ['sxth', 'sxtah'],
                       4: ['uxtb16', 'uxtab16'], 6: ['uxtb', 'uxtab'], 7: ['uxth', 'uxtah'] }[op];
        if (name) {
          const rd = R[(w >>> 12) & 0xF], rm = R[w & 0xF], r = rot ? `, ror #${rot}` : '';
          return rn === 15 ? `${name[0]}${cc} ${rd}, ${rm}${r}` : `${name[1]}${cc} ${rd}, ${R[rn]}, ${rm}${r}`;
        }
      }
      return `.word 0x${(w>>>0).toString(16).padStart(8,'0')} ; media`;
    }
    if (I) return `${mn} ${rt}, [${rn}, ${shifter(w)}]`;
    const off = w & 0xFFF;
    if (rn === 'pc') {
      const tgt = (addr + 8 + (U ? off : -off)) >>> 0;
      let lit = '';
      try { lit = ` ; [0x${tgt.toString(16)}]=0x${rd32(tgt).toString(16)}`; } catch {}
      return `${mn} ${rt}, [pc, #${U?'':'-'}${off}]${lit}`;
    }
    return `${mn} ${rt}, [${rn}, #${U?'':'-'}${off}]${P ? '' : ' (post)'}`;
  }

  // ---- bits 27:26 = 00 or 11 ----
  if (b27_26 === 0) {
    const bit25 = (w >>> 25) & 1;
    if (bit25 === 1) {
      // MOVW/MOVT: bits 24:20 = 10000 / 10100
      const opc = (w >>> 21) & 0xF, S = (w >>> 20) & 1;
      if (opc === 8 && S === 0) {
        const imm = ((w >>> 4) & 0xF000) | (w & 0xFFF);
        return `movw${cc} ${R[(w >>> 12) & 0xF]}, #0x${imm.toString(16)}`;
      }
      if (opc === 10 && S === 0) {
        const imm = ((w >>> 4) & 0xF000) | (w & 0xFFF);
        return `movt${cc} ${R[(w >>> 12) & 0xF]}, #0x${imm.toString(16)}`;
      }
      const rn = R[(w >>> 16) & 0xF], rd = R[(w >>> 12) & 0xF];
      const imm = immRot(w), m = DPOP[opc];
      if (opc >= 8 && opc <= 11) return `${m}${cc} ${rn}, #${imm}`;
      if (opc === 13 || opc === 15) return `${m}${cc} ${rd}, #${imm}`;
      return `${m}${cc} ${rd}, ${rn}, #${imm}`;
    }
    // bit25 = 0
    const bits76 = (w >>> 6) & 3, bit4 = (w >>> 4) & 1;
    // extra load/store halfword: bits 7:4 = 1xx1 and bits 6:5 != 00
    if (bit4 === 1 && bits76 !== 0) {
      const P = (w >>> 24) & 1, U = (w >>> 23) & 1, I = (w >>> 22) & 1,
        W = (w >>> 21) & 1, L = (w >>> 20) & 1, sh = (w >>> 5) & 3;
      const rn = R[(w >>> 16) & 0xF], rt = R[(w >>> 12) & 0xF];
      // Offset: immediate form (I=1) = imm4H:imm4L; register form (I=0) = Rm. P=0 is post-indexed.
      const mag = I ? `#${U ? '' : '-'}${((w >>> 4) & 0xF0) | (w & 0xF)}` : `${U ? '' : '-'}${R[w & 0xF]}`;
      const addr = P ? `[${rn}, ${mag}]${W ? '!' : ''}` : `[${rn}], ${mag}`;
      if (sh === 1) return `${L ? 'ldrh' : 'strh'}${cc} ${rt}, ${addr}`;
      if (sh === 2) return `${L ? 'ldrsb' : 'ldrd'}${cc} ${rt}, ${addr}`;
      if (sh === 3) return `${L ? 'ldrsh' : 'strd'}${cc} ${rt}, ${addr}`;
    }
    if (bits76 === 0 && bit4 === 0) {
      // data processing register (and multiply when bits 27:22 = 000000 and 7:4 = 1001 handled above)
      const opc = (w >>> 21) & 0xF, S = (w >>> 20) & 1;
      const rn = R[(w >>> 16) & 0xF], rd = R[(w >>> 12) & 0xF];
      const m = DPOP[opc];
      const sfx = S ? 's' : '';
      if (opc >= 8 && opc <= 11) return `${m}${sfx}${cc} ${rn}, ${shifter(w)}`;
      if (opc === 13 || opc === 15) {
        if (w === 0xE1A00000) return `nop`;
        return `${m}${sfx}${cc} ${rd}, ${shifter(w)}`;
      }
      return `${m}${sfx}${cc} ${rd}, ${rn}, ${shifter(w)}`;
    }
    // misc: MRS/MSR/BX/BLX/CLZ/BKPT
    if ((w & 0x0FFFFFF0) === 0x012FFF10) return `bx${cc} ${R[w & 0xF]}`;
    if ((w & 0x0FFFFFF0) === 0x012FFF30) return `blx${cc} ${R[w & 0xF]}`;
    if ((w & 0x0FFF0FF0) === 0x016F0F10) return `clz${cc} ${R[(w>>>12)&0xF]}, ${R[w & 0xF]}`;
    if ((w & 0x0FBF0FFF) === 0x010F0000) return `mrs${cc} ${R[(w>>>12)&0xF]}, cpsr`;
    if ((w & 0x0FB0FFF0) === 0x0120F000) return `msr${cc} cpsr, ${R[w & 0xF]}`;
    if ((w & 0x0FF000F0) === 0x01200070) return `bkpt #${w & 0xFFFF}`;
    if (bit4 === 1 && bits76 === 1) return `.word 0x${(w>>>0).toString(16).padStart(8,'0')} ; (media?)`;
  }

  // multiply: bits 27:22 = 000000, bits 7:4 = 1001
  if (((w >>> 22) & 0x3F) === 0 && ((w >>> 4) & 0xF) === 9) {
    const A = (w >>> 21) & 1, S = (w >>> 20) & 1;
    const rd = R[(w >>> 16) & 0xF], rn = R[(w >>> 12) & 0xF], rs = R[(w >>> 8) & 0xF], rm = R[w & 0xF];
    if (A) return `mla${S?'s':''}${cc} ${rd}, ${rm}, ${rs}, ${rn}`;
    return `mul${S?'s':''}${cc} ${rd}, ${rm}, ${rs}`;
  }

  if (b27_26 === 3) {
    if ((w & 0x0F000000) === 0x0F000000) return `svc${cc} #${w & 0xFFFFFF}`;
    const v = decodeVfp(w, addr, cc);
    if (v) return v;
    return `.word 0x${(w>>>0).toString(16).padStart(8,'0')} ; coproc`;
  }

  return `.word 0x${(w>>>0).toString(16).padStart(8,'0')}`;
}

// VFPv3 (cp10 = single, cp11 = double), A32 encodings from the ARM ARM (ARMv7-A/R, A7.5-A7.9).
// Returns null for anything not covered so the caller prints a raw `.word ; coproc`.
function decodeVfp(w, addr, cc) {
  const cp = (w >>> 8) & 0xF;
  if (cp !== 10 && cp !== 11) return null;
  const dbl = cp === 11, ty = dbl ? '.f64' : '.f32';
  const S = (v, b) => `s${(v << 1) | b}`, D = (v, b) => `d${(b << 4) | v}`;
  const vd = (w >>> 12) & 0xF, Dbit = (w >>> 22) & 1, vn = (w >>> 16) & 0xF, Nbit = (w >>> 7) & 1;
  const vm = w & 0xF, Mbit = (w >>> 5) & 1;
  const rd = dbl ? D(vd, Dbit) : S(vd, Dbit), rn = dbl ? D(vn, Nbit) : S(vn, Nbit), rm = dbl ? D(vm, Mbit) : S(vm, Mbit);
  // 64-bit transfers: vmov dM, rt, rt2 / vmov rt, rt2, dM (and the two-single form)
  if ((w & 0x0FE00FD0) === 0x0C400B10 || (w & 0x0FE00FD0) === 0x0C400A10) {
    const toCore = (w >>> 20) & 1, rt = R[(w >>> 12) & 0xF], rt2 = R[(w >>> 16) & 0xF];
    const v = dbl ? D(vm, Mbit) : `${S(vm, Mbit)}, s${((vm << 1) | Mbit) + 1}`;
    return toCore ? `vmov${cc} ${rt}, ${rt2}, ${v}` : `vmov${cc} ${v}, ${rt}, ${rt2}`;
  }
  // load/store: bits 27:25 = 110
  if (((w >>> 25) & 7) === 6) {
    const P = (w >>> 24) & 1, U = (w >>> 23) & 1, W = (w >>> 21) & 1, L = (w >>> 20) & 1;
    const rnI = (w >>> 16) & 0xF, imm8 = w & 0xFF;
    if (P === 1 && W === 0) {
      const off = imm8 * 4, sgn = U ? '' : '-';
      const tgt = rnI === 15 ? ` ; =0x${(((addr + 8) & ~3) + (U ? off : -off)).toString(16)}` : '';
      return `${L ? 'vldr' : 'vstr'}${cc} ${rd}, [${R[rnI]}${off ? `, #${sgn}0x${off.toString(16)}` : ''}]${tgt}`;
    }
    if (P === U) return null; // undefined
    const n = dbl ? imm8 >> 1 : imm8, first = dbl ? (Dbit << 4) | vd : (vd << 1) | Dbit, p = dbl ? 'd' : 's';
    const list = n === 1 ? `${p}${first}` : `${p}${first}-${p}${first + n - 1}`;
    if (rnI === 13 && W && P === 1 && !U && !L) return `vpush${cc} {${list}}`;
    if (rnI === 13 && W && P === 0 && U && L) return `vpop${cc} {${list}}`;
    return `${L ? 'vldm' : 'vstm'}${P ? 'db' : 'ia'}${cc} ${R[rnI]}${W ? '!' : ''}, {${list}}`;
  }
  if (((w >>> 24) & 0xF) !== 0xE) return null;
  if ((w >>> 4) & 1) {
    if ((w & 0x0FFF0FFF) === 0x0EF10A10) {
      const rt = (w >>> 12) & 0xF;
      return `vmrs${cc} ${rt === 15 ? 'APSR_nzcv' : R[rt]}, fpscr`;
    }
    if ((w & 0x0FFF0FFF) === 0x0EE10A10) return `vmsr${cc} fpscr, ${R[(w >>> 12) & 0xF]}`;
    if ((w & 0x0FE00F7F) === 0x0E000A10) {
      const rt = R[(w >>> 12) & 0xF], s = S(vn, Nbit);
      return (w >>> 20) & 1 ? `vmov${cc} ${rt}, ${s}` : `vmov${cc} ${s}, ${rt}`;
    }
    if ((w & 0x0F900F1F) === 0x0E000B10 && !((w >>> 22) & 1) && !((w >>> 5) & 1)) {
      const rt = R[(w >>> 12) & 0xF], d = `${D(vn, Nbit)}[${(w >>> 21) & 1}]`;
      return (w >>> 20) & 1 ? `vmov.32${cc} ${rt}, ${d}` : `vmov.32${cc} ${d}, ${rt}`;
    }
    return null;
  }
  // data processing: opc1 = bit23:bits21-20, op = bit6
  const opc1 = (((w >>> 23) & 1) << 2) | ((w >>> 20) & 3), op = (w >>> 6) & 1;
  const three = { 0: ['vmla', 'vmls'], 1: ['vnmls', 'vnmla'], 2: ['vmul', 'vnmul'], 3: ['vadd', 'vsub'], 4: ['vdiv', null] }[opc1];
  if (three) return three[op] ? `${three[op]}${cc}${ty} ${rd}, ${rn}, ${rm}` : null;
  if (opc1 !== 7) return null;
  if (!op) {
    // vmov immediate: VFPExpandImm(imm8 = abcdefgh) = (-1)^a * (1 + efgh/16) * 2^(b ? cd-3 : cd+1)
    const imm8 = (((w >>> 16) & 0xF) << 4) | (w & 0xF);
    const a = imm8 >> 7, b = (imm8 >> 6) & 1, cd = (imm8 >> 4) & 3, efgh = imm8 & 0xF;
    const val = (a ? -1 : 1) * (1 + efgh / 16) * 2 ** (b ? cd - 3 : cd + 1);
    return `vmov${cc}${ty} ${rd}, #${val}`;
  }
  const opc2 = vn, hi7 = Nbit; // bits 19:16 and bit 7
  const sm = S(vm, Mbit);
  switch (opc2) {
    case 0: return `${hi7 ? 'vabs' : 'vmov'}${cc}${ty} ${rd}, ${rm}`;
    case 1: return `${hi7 ? 'vsqrt' : 'vneg'}${cc}${ty} ${rd}, ${rm}`;
    case 4: return `${hi7 ? 'vcmpe' : 'vcmp'}${cc}${ty} ${rd}, ${rm}`;
    case 5: return `${hi7 ? 'vcmpe' : 'vcmp'}${cc}${ty} ${rd}, #0.0`;
    case 7: return hi7 ? (dbl ? `vcvt${cc}.f32.f64 ${S(vd, Dbit)}, ${rm}` : `vcvt${cc}.f64.f32 ${D(vd, Dbit)}, ${rm}`) : null;
    case 8: return `vcvt${cc}${ty}.${hi7 ? 's32' : 'u32'} ${rd}, ${sm}`;
    case 12: case 13: return `vcvt${hi7 ? '' : 'r'}${cc}.${opc2 === 13 ? 's32' : 'u32'}${ty} ${S(vd, Dbit)}, ${rm}`;
    default: return null; // half-precision and fixed-point conversions
  }
}

export function disasm(vaddr, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = vaddr + i * 4;
    if (a + 4 > buf.length - 0x100) break;
    const w = rd32(a);
    out.push(`${a.toString(16).padStart(8,'0')}: ${(w>>>0).toString(16).padStart(8,'0')}  ${decode(w, a)}`);
  }
  return out.join('\n');
}

export function findCallsTo(targets) {
  const tset = new Set(targets);
  const hits = [];
  for (let a = 0; a < TEXT_END; a += 4) {
    const w = rd32(a);
    if ((w >>> 28) !== 0xF && ((w >>> 26) & 3) === 2 && (w & 0x01000000)) {
      let off = (w & 0xFFFFFF) << 2; if (off & 0x2000000) off -= 0x4000000;
      const tgt = (a + 8 + off) >>> 0;
      if (tset.has(tgt)) hits.push({ from: a, to: tgt });
    }
    if ((w & 0xFE000000) === 0xFA000000) {
      let off = (w & 0xFFFFFF) << 2;
      const h = (w >>> 24) & 1;
      if (off & 0x2000000) off -= 0x4000000;
      const tgt = (a + 8 + off + h * 2) >>> 0;
      if (tset.has(tgt)) hits.push({ from: a, to: tgt });
    }
  }
  return hits;
}

// Find code that materialises one of the given u32 constants inside [start,end):
//   ldr rX,[pc,#imm] (any condition), vldr sX/dX,[pc,#imm], and movw rX,#lo + movt rX,#hi
//   (movt within the next 8 insns). In this binary movw/movt is the dominant form for
//   magic numbers (e.g. 0x51EB851F: ~290 movw/movt pairs, 0 ldr-literal).
export function findLiteralLoads(start, end, values) {
  const vset = new Set(values.map((v) => v >>> 0));
  const hits = [];
  for (let a = start; a < end; a += 4) {
    const w = rd32(a);
    if ((w >>> 28) === 0xF) continue;
    if (((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0 && ((w >>> 20) & 1) === 1 && ((w >>> 16) & 0xF) === 15) {
      const off = w & 0xFFF, U = (w >>> 23) & 1;
      const tgt = (a + 8 + (U ? off : -off)) >>> 0;
      const v = rd32(tgt);
      if (vset.has(v)) hits.push({ from: a, lit: tgt, value: v, reg: R[(w >>> 12) & 0xF], kind: 'ldr' });
      continue;
    }
    if ((w & 0x0F3F0E00) === 0x0D1F0A00) {
      const off = (w & 0xFF) * 4, U = (w >>> 23) & 1;
      const tgt = (a + 8 + (U ? off : -off)) >>> 0;
      const v = rd32(tgt);
      if (vset.has(v)) hits.push({ from: a, lit: tgt, value: v, reg: 'vfp', kind: 'vldr' });
      continue;
    }
    if ((w & 0x0FF00000) === 0x03000000) {
      const rd = (w >>> 12) & 0xF, lo = ((w >>> 4) & 0xF000) | (w & 0xFFF);
      for (let b = a + 4; b <= a + 32 && b < TEXT_END; b += 4) {
        const t = rd32(b);
        if ((t & 0x0FF00000) === 0x03400000 && ((t >>> 12) & 0xF) === rd) {
          const v = (((((t >>> 4) & 0xF000) | (t & 0xFFF)) << 16) | lo) >>> 0;
          if (vset.has(v)) hits.push({ from: a, lit: b, value: v, reg: R[rd], kind: 'movw/movt' });
          break;
        }
      }
    }
  }
  return hits;
}

// function starts: push {...,lr} (E92D 4xxx / E92D 4xxx with high regs)
export function functionStarts() {
  const starts = [];
  for (let a = 0; a < TEXT_END; a += 4) {
    const w = rd32(a);
    if (((w & 0xFFFF4000) >>> 0) === 0xE92D4000) starts.push(a);
  }
  return starts;
}

export function nearestFunctionStart(addr, starts) {
  let lo = 0, hi = starts.length - 1, res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= addr) { res = starts[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  return res;
}

if (import.meta.main) {
  const [, , a, n] = process.argv;
  console.log(disasm(parseInt(a, 16), parseInt(n || '40', 10)));
}
