// em1428-byte424.mjs — read-only census for BYTE 424 (0x1a8) of the sub-object at em[0x1428].
//
// The guard handshake does:
//     movw r1,#0x1428 ; ldr r1,[em,r1] ; ldrb r1,[r1,#424] ; tst r1,#8
// Question: who else reads/writes that byte, and what do its other bits do.
//
// Sections
//   A  handshake listing + hard pattern control (known sites must be found)
//   B  every em[0x1428] load site in .text + forward pointer-alias walk inside the function:
//      accesses at [sub+off] (byte 424 included), pointer escapes, offset histogram
//   C  global immediate-offset lane: every load/store whose immediate range covers 424
//   D  pre-folded address lane: movw #0x1a8 and add rX,rY,#424 sites
//   E  writes covering byte 424: constant / read-modify-write verdicts for bit 3
//   F  bit usage: masks tested after a load at [x+424]  (per-bit table)
//   G  writers of em[0x1428] itself (who installs the sub-object) + preceding call targets
//   H  best-effort name search: data words == 424 with nearby image pointers to ASCII names
//   I  summary
//
// Decoders/helpers follow MHGU/tools/audit/guard-gate-7420.mjs and guard-word-ops.mjs.
// Read-only on the image; writes nothing.  Run:  node MHGU/tools/audit/em1428-byte424.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const SUB_OFF = 0x1428;   // dword field of the em object -> sub-object pointer
const FIELD = 424;        // 0x1a8 : the byte inside the sub-object
const BIT = 3;            // bit the handshake tests (mask 8)
const MAXPRINT = 400;

let armDecode = (w) => '0x' + (w >>> 0).toString(16).padStart(8, '0');
try {
  const m = await import('./../mhgu/arm32.mjs');
  if (typeof m.decode === 'function') armDecode = (w, a) => m.decode(w, a);
} catch (e) { console.log('ARM32-IMPORT-FAIL ' + e.message); }

let IMG = null, buf = null;
for (const c of ['G:/omp works/MHGU-private/main.140.flat.bin', 'G:/omp works/MHGU/main.140.flat.bin']) {
  try { buf = fs.readFileSync(c); IMG = c; break; } catch { /* next */ }
}
console.log('OBJECT em[0x' + SUB_OFF.toString(16).toUpperCase() + '] + byte ' + FIELD + ' (0x' + FIELD.toString(16) + '), tested bit ' + BIT);
console.log('IMAGE', IMG);
if (!buf) { console.log('NO-IMAGE'); process.exit(1); }
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

const W = (v) => { const o = v + 0x100; return (o < 0 || o + 4 > buf.length) ? 0 : buf.readUInt32LE(o) >>> 0; };
const hex = (n) => '0x' + ((n >>> 0)).toString(16);
const RD = (w) => (w >>> 12) & 15, RN = (w) => (w >>> 16) & 15, RM = (w) => w & 15;
const COND = (w) => (w >>> 28) & 0xf;

// ---------- structured decoders (same shapes as the guard-gate-7420 template) ----------
const rotImm = (i8, rot) => { const r = rot * 2; return r ? (((i8 >>> r) | (i8 << (32 - r))) >>> 0) : (i8 >>> 0); };
function movw(w) { return (w & 0x0ff00000) === 0x03000000 ? { d: RD(w), v: (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0 } : null; }
function movt(w) { return (w & 0x0ff00000) === 0x03400000 ? { d: RD(w), v: (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0 } : null; }
function dpImm(w) {
  if ((w & 0x0e000000) !== 0x02000000) return null;
  return { op: (w >>> 21) & 15, s: (w >>> 20) & 1, n: RN(w), d: RD(w), imm: rotImm(w & 0xff, (w >>> 8) & 15) };
}
function dpReg(w) {
  if ((w & 0x0e000000) !== 0) return null;
  if ((w & 0x10) !== 0) return null;
  return { op: (w >>> 21) & 15, s: (w >>> 20) & 1, n: RN(w), d: RD(w), rm: RM(w), st: (w >>> 5) & 3, sh: (w >>> 7) & 0x1f };
}
function bitfield(w) {                       // BFI / BFC
  if ((w & 0x0fe00000) !== 0x07c00000) return null;
  if ((w & 0x70) !== 0x10) return null;
  const msb = (w >>> 16) & 0x1f, lsb = (w >>> 7) & 0x1f;
  return { d: RD(w), n: RM(w), lsb, msb, width: msb - lsb + 1, bfc: RM(w) === 15 };
}
function ubfx(w) {                           // UBFX (bit21=1)
  if ((w & 0x0fe00070) !== 0x07e00050) return null;
  const msb = (w >>> 16) & 0x1f, lsb = (w >>> 7) & 0x1f;
  return { d: RD(w), n: RM(w), lsb, width: msb - lsb + 1 };
}
function sbfx(w) {                           // SBFX (bit21=0)
  if ((w & 0x0fe00070) !== 0x07a00050) return null;
  const msb = (w >>> 16) & 0x1f, lsb = (w >>> 7) & 0x1f;
  return { d: RD(w), n: RM(w), lsb, width: msb - lsb + 1 };
}
function sdt(w) {                            // single data transfer / media (bit25=1,bit4=1 -> media)
  if ((w & 0x0c000000) !== 0x04000000) return null;
  const I = (w >>> 25) & 1, P = (w >>> 24) & 1, U = (w >>> 23) & 1, B = (w >>> 22) & 1;
  const Wb = (w >>> 21) & 1, L = (w >>> 20) & 1, n = RN(w), t = RD(w);
  if (I) {
    if ((w & 0x10) !== 0) return { k: 'media', d: RD(w), n, rm: RM(w), w };
    return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, rm: RM(w), st: (w >>> 5) & 3, sh: (w >>> 7) & 0x1f };
  }
  return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, imm: w & 0xfff };
}
function extra(w) {                          // extra load/store: I(bit22)=1 -> immediate (imm8 split)
  if ((w & 0x0e000000) !== 0) return null;
  if ((w & 0x02000000) !== 0) return null;
  const nib = (w >>> 4) & 0xf;
  if (nib !== 0xb && nib !== 0xd && nib !== 0xf) return null;
  const P = (w >>> 24) & 1, U = (w >>> 23) & 1, I = (w >>> 22) & 1, Wb = (w >>> 21) & 1, L = (w >>> 20) & 1;
  const n = RN(w), t = RD(w), op2 = (w >>> 5) & 3;
  let kind;
  if (op2 === 1) kind = L ? 'ldrh' : 'strh';
  else if (op2 === 2) kind = L ? 'ldrsb' : 'ldrd';
  else kind = L ? 'ldrsh' : 'strd';
  const o = { k: 'extra', kind, P, U, I, W: Wb, L, n, t, rm: RM(w) };
  if (I) o.imm = ((w >>> 4) & 0xf0) | (w & 0xf);
  return o;
}
function branch(w) {
  if ((w & 0x0e000000) !== 0x0a000000) return null;
  let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
  return { cond: (w >>> 28) & 0xf, link: (w >>> 24) & 1, off: o };
}
function btarget(w, pc) { const b = branch(w); return b ? ((pc + 8 + b.off) >>> 0) : 0; }
function bx(w) {
  const m = (w & 0x0ffffff0) >>> 0;
  if (m === 0x012fff10) return { kind: 'bx', cond: (w >>> 28) & 15, rm: RM(w) };
  if (m === 0x012fff30) return { kind: 'blx', cond: (w >>> 28) & 15, rm: RM(w) };
  return null;
}
function ldmstm(w) {
  if ((w & 0x0e000000) !== 0x08000000) return null;
  const P = (w >>> 24) & 1, U = (w >>> 23) & 1, Wb = (w >>> 21) & 1, L = (w >>> 20) & 1;
  const n = RN(w), regs = [];
  for (let i = 0; i < 16; i++) if (w & (1 << i)) regs.push(i);
  return { P, U, W: Wb, L, n, regs };
}
function vfp(w) { return ((w & 0x0c000000) === 0x0c000000) ? { k: 'vfp', sp: RN(w) === 13 } : null; }
function misc(w) { return ((w & 0x0f000000) === 0x01000000) ? { d: RD(w), n: RN(w), rm: RM(w) } : null; }
function bitsOf(m) { const r = []; for (let b = 0; b < 8; b++) if (m & (1 << b)) r.push(b); return r.join(','); }

// ---------- helpers ----------
function fnStartOf(v) {                      // nearest preceding push {...,lr}
  for (let a = v; a >= TEXT_START && a > v - 0x20000; a -= 4) {
    const lw = ldmstm(W(a));
    if (lw && lw.n === 13 && !lw.L && lw.P && !lw.U && lw.regs.includes(14)) return a;
  }
  return null;
}
function isReturn(w) {
  if (w === 0xe12fff1e) return true;                        // bx lr
  const lw = ldmstm(w);
  if (lw && lw.L && lw.regs.includes(15)) return true;      // pop {...,pc} / ldm ..,{..,pc}
  return false;
}
function cstrAt(v) {                        // NUL-terminated printable ASCII at vaddr
  let s = '';
  for (let i = 0; i < 48; i++) {
    const o = v + i + 0x100;
    if (o < 0 || o >= buf.length) return null;
    const c = buf[o];
    if (c === 0) return (s.length >= 3 && /^[\x20-\x7e]+$/.test(s)) ? s : null;
    if (c < 0x20 || c > 0x7e) return null;
    s += String.fromCharCode(c);
  }
  return null;
}
function nearString(v) {                    // image pointers near v that point at ASCII names
  const out = [];
  for (let d = -32; d <= 32; d += 4) {
    if (d === 0) continue;
    const o = v + d + 0x100;
    if (o < 0 || o + 4 > buf.length) continue;
    const p = buf.readUInt32LE(o) >>> 0;
    if (p < 0x1000 || p >= buf.length) continue;
    const s = cstrAt(p);
    if (s) out.push({ at: (v + d) >>> 0, p, s });
  }
  return out;
}

// ================= Section A: the handshake =================
const HANDSHAKE_FNS = [0xb161c, 0xb167c, 0xb16e0];
const A_EXPECT = [
  { f: 0xb161c, movw: 0xb1634, ldr: 0xb1638, ldrb: 0xb163c, tst: 0xb1640 },
  { f: 0xb167c, movw: 0xb1698, ldr: 0xb169c, ldrb: 0xb16a0, tst: 0xb16a4 },
  { f: 0xb16e0, movw: 0xb16e8, ldr: 0xb16f0, ldrb: 0xb16f4, tst: 0xb16f8 },
];
console.log('\n=========== A. HANDSHAKE FUNCTIONS (em[0x1428] -> byte 424) ===========');
for (const f of HANDSHAKE_FNS) {
  const start = fnStartOf(f);
  console.log('--- FN ' + hex(f) + ' (fnStartOf=' + (start === null ? 'none' : hex(start)) + ') ---');
  let n = 0;
  for (let v = f; v < TEXT_END && n < 90; v += 4, n++) {
    const w = W(v);
    console.log('DIS ' + hex(v) + ': ' + armDecode(w, v));
    if (isReturn(w)) break;
  }
}
console.log('--- A control: exact pattern per handshake site ---');
for (const e of A_EXPECT) {
  const mw = movw(W(e.movw)), ld = sdt(W(e.ldr)), lb = sdt(W(e.ldrb)), ts = dpImm(W(e.tst));
  const okMw = !!(mw && mw.v === SUB_OFF);
  const ldReg = (ld && ld.k === 'sdt') ? ld.t : -1;
  const okLdr = !!(ld && ld.k === 'sdt' && ld.L === 1 &&
    ((ld.I === 1 && ld.rm === (mw ? mw.d : -1) && ld.st === 0) || (ld.I === 0 && ld.imm === SUB_OFF)));
  const okLdrb = !!(lb && lb.k === 'sdt' && lb.L === 1 && lb.B === 1 && lb.I === 0 && lb.imm === FIELD && lb.n === ldReg);
  const okTst = !!(ts && ts.op === 8 && ts.imm === (1 << BIT));
  console.log(`A-CONTROL fn=${hex(e.f)} movw@${hex(e.movw)}=${okMw ? 'ok' : 'BAD'} ldr@${hex(e.ldr)}=${okLdr ? 'ok' : 'BAD'} ` +
    `ldrb@${hex(e.ldrb)}=${okLdrb ? 'ok' : 'BAD'} tst@${hex(e.tst)}=${okTst ? 'ok' : 'BAD'} => ` +
    `${(okMw && okLdr && okLdrb && okTst) ? 'PASS' : 'FAIL'}`);
}
console.log('A-NOTE byte 424 (0x1a8) < 0x1000: it is encoded in the ldrb imm12 itself, no add pre-fold.');

// ================= Section B: em[0x1428] load sites + pointer walk =================
console.log('\n=========== B. em[0x1428] LOAD SITES AND WHAT THEY DO TO THE SUB-OBJECT ===========');
const subLoads = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const mw = movw(W(v));
  if (!mw || mw.v !== SUB_OFF) continue;
  for (let k = 1; k <= 4; k++) {
    const u = v + 4 * k;
    const d = sdt(W(u));
    if (!d || d.k !== 'sdt' || !d.L) continue;
    if ((d.I === 1 && d.rm === mw.d && d.st === 0) || (d.I === 0 && d.imm === SUB_OFF)) {
      subLoads.push({ at: u, fn: fnStartOf(u), dst: d.t, movwAt: v });
      break;
    }
  }
}
console.log(`B-SITES em[${hex(SUB_OFF)}] pointer loads = ${subLoads.length}`);

const OFFSET_HIST = new Map();
function noteOffset(off, site) {
  if (!OFFSET_HIST.has(off)) OFFSET_HIST.set(off, new Set());
  OFFSET_HIST.get(off).add(site);
}
const CLOBBER = [0, 1, 2, 3, 12, 14];

function walkFrom(site) {
  const alias = new Map(), tag = new Map(), constv = new Map();
  const hits = [], escapes = [];
  alias.set(site.dst, 0);
  let steps = 0;
  for (let v = site.at + 4; v < TEXT_END && steps < 400; v += 4, steps++) {
    const w = W(v);
    if (isReturn(w)) break;
    const mw = movw(w), mt = movt(w), di = dpImm(w), dr = dpReg(w), bf = bitfield(w),
      ux = ubfx(w), sx = sbfx(w), sd = sdt(w), ex = extra(w), br = branch(w), bxr = bx(w), lm = ldmstm(w), vf = vfp(w);

    if (br) {
      if (br.link) { for (const r of CLOBBER) { alias.delete(r); tag.delete(r); constv.delete(r); } continue; }
      if (br.cond === 0xe) break;        // unconditional b: leaves this listing
      continue;                          // conditional b: keep walking the fall-through
    }
    if (bxr) { for (const r of CLOBBER) { alias.delete(r); tag.delete(r); constv.delete(r); } continue; }
    if (lm) {
      if (lm.L) {
        if (lm.regs.some((r) => alias.has(r))) escapes.push({ at: v, how: 'ldm into alias reg(s) ' + lm.regs.join(',') });
        for (const r of lm.regs) { alias.delete(r); tag.delete(r); constv.delete(r); }
      } else if (lm.regs.some((r) => alias.has(r))) escapes.push({ at: v, how: 'stm of alias reg(s) ' + lm.regs.join(',') });
      continue;
    }
    if (mw) { constv.set(mw.d, mw.v); tag.delete(mw.d); alias.delete(mw.d); continue; }
    if (mt) { const p = constv.get(mt.d); if (p !== undefined) constv.set(mt.d, ((mt.v << 16) | (p & 0xffff)) >>> 0); else constv.delete(mt.d); tag.delete(mt.d); alias.delete(mt.d); continue; }
    if (bf) { tag.delete(bf.d); alias.delete(bf.d); constv.delete(bf.d); continue; }
    if (ux || sx) {
      const q = ux || sx, t = tag.get(q.n);
      if (t && t.t === 'field' && q.lsb <= 7 && q.lsb + q.width > 7) tag.set(q.d, { t: 'fieldbit', lsb: q.lsb, width: q.width });
      else tag.delete(q.d);
      alias.delete(q.d); constv.delete(q.d); continue;
    }
    if (di) {
      const { op, n, d, imm } = di;
      if (op >= 8 && op <= 11) {
        const t = tag.get(n);
        if (t && (t.t === 'field' || t.t === 'fieldbit' || t.t === 'fieldop')) hits.push({ at: v, kind: 'test', off: FIELD, width: 1, dir: 'r', mask: imm, tag: t });
        continue;
      }
      if (op === 13 && n === 0) { constv.set(d, imm); tag.delete(d); alias.delete(d); continue; }
      if (op === 15 && n === 0) { constv.set(d, (~imm) >>> 0); tag.delete(d); alias.delete(d); continue; }
      if (op === 13 || op === 15) { tag.delete(d); alias.delete(d); constv.delete(d); continue; }
      if (op === 12 || op === 14 || op === 0 || op === 1) {
        const t = tag.get(n);
        if (t && t.t === 'field') tag.set(d, { t: 'fieldop', op, mask: imm, prev: null });
        else if (t && t.t === 'fieldop') tag.set(d, { t: 'fieldop', op, mask: imm, prev: t });
        else tag.delete(d);
        const c = constv.get(n);
        if (c !== undefined) constv.set(d, op === 12 ? (c | imm) >>> 0 : op === 14 ? (c & ~imm) >>> 0 : op === 0 ? (c & imm) >>> 0 : (c ^ imm) >>> 0);
        else constv.delete(d);
        alias.delete(d);
        continue;
      }
      if (op === 4 || op === 2) {
        const base = alias.get(n);
        if (base !== undefined) alias.set(d, (base + (op === 4 ? imm : -imm)) >>> 0);
        else alias.delete(d);
        tag.delete(d); constv.delete(d);
        continue;
      }
      tag.delete(d); alias.delete(d); constv.delete(d);
      continue;
    }
    if (dr) {
      const { op, n, d, rm } = dr;
      if (op >= 8 && op <= 11) {
        const t = tag.get(n);
        if (t && (t.t === 'field' || t.t === 'fieldbit' || t.t === 'fieldop')) {
          const c = constv.get(rm);
          hits.push({ at: v, kind: 'test', off: FIELD, width: 1, dir: 'r', mask: (c === undefined ? null : c), tag: t });
        }
        continue;
      }
      if (op === 13) {
        if (dr.st === 0 && dr.sh === 0) {
          if (alias.has(rm)) alias.set(d, alias.get(rm)); else alias.delete(d);
          if (tag.has(rm)) tag.set(d, tag.get(rm)); else tag.delete(d);
          if (constv.has(rm)) constv.set(d, constv.get(rm)); else constv.delete(d);
        } else { alias.delete(d); tag.delete(d); constv.delete(d); }
        continue;
      }
      if (op === 12 || op === 14 || op === 0 || op === 1) {
        const c = (constv.has(rm) && dr.st === 0 && dr.sh === 0) ? constv.get(rm) : undefined;
        const t = tag.get(n);
        if (t && t.t === 'field' && c !== undefined) tag.set(d, { t: 'fieldop', op, mask: c, prev: null });
        else if (t && t.t === 'fieldop' && c !== undefined) tag.set(d, { t: 'fieldop', op, mask: c, prev: t });
        else tag.delete(d);
        const a = constv.get(n);
        if (a !== undefined && c !== undefined) constv.set(d, op === 12 ? (a | c) >>> 0 : op === 14 ? (a & ~c) >>> 0 : op === 0 ? (a & c) >>> 0 : (a ^ c) >>> 0);
        else constv.delete(d);
        alias.delete(d);
        continue;
      }
      if ((op === 4 || op === 2) && alias.has(n) && constv.has(rm) && dr.st === 0 && dr.sh === 0) {
        alias.set(d, (alias.get(n) + (op === 4 ? constv.get(rm) : -constv.get(rm))) >>> 0);
        tag.delete(d); constv.delete(d); continue;
      }
      tag.delete(d); alias.delete(d); constv.delete(d);
      continue;
    }
    if (sd) {
      if (sd.k === 'media') { tag.delete(sd.d); alias.delete(sd.d); constv.delete(sd.d); continue; }
      const base = alias.get(sd.n);
      if (sd.I === 1) {
        if (alias.has(sd.rm)) {                     // [reg + subPointer] -> pointer table indexed by it
          hits.push({ at: v, kind: 'regindex', off: null, width: sd.B ? 1 : 4, dir: sd.L ? 'r' : 'w' });
          alias.delete(sd.t); tag.delete(sd.t); constv.delete(sd.t);
          continue;
        }
        if (sd.L) { alias.delete(sd.t); tag.delete(sd.t); constv.delete(sd.t); }
        continue;
      }
      const off = sd.U ? sd.imm : ((-sd.imm) >>> 0);
      if (base !== undefined) {
        const a = (base + off) >>> 0;
        if (sd.L) {
          hits.push({ at: v, kind: sd.B ? 'ldrb' : 'ldr', off: a, width: sd.B ? 1 : 4, dir: 'r' });
          noteOffset(a, site.at);
          if (a === FIELD) tag.set(sd.t, { t: 'field' }); else tag.delete(sd.t);
          alias.delete(sd.t); constv.delete(sd.t);
          if (sd.W) alias.set(sd.n, sd.P ? a : (a + off) >>> 0);
        } else {
          const t = tag.get(sd.t), c = constv.get(sd.t);
          hits.push({ at: v, kind: sd.B ? 'strb' : 'str', off: a, width: sd.B ? 1 : 4, dir: 'w', tag: t || null, const: (c === undefined ? null : c) });
          noteOffset(a, site.at);
          if (sd.W) alias.set(sd.n, sd.P ? a : (a + off) >>> 0);
        }
        continue;
      }
      if (!sd.L && alias.has(sd.t)) { escapes.push({ at: v, how: 'str of alias r' + sd.t + ' to memory' }); continue; }
      if (sd.L) { alias.delete(sd.t); tag.delete(sd.t); constv.delete(sd.t); }
      continue;
    }
    if (ex) {
      if (ex.I !== 1) {                              // register-offset form of the extra class
        if (alias.has(ex.n) && alias.has(ex.rm)) hits.push({ at: v, kind: 'regindex', off: null, width: 2, dir: ex.L ? 'r' : 'w' });
        if (ex.L) { alias.delete(ex.t); tag.delete(ex.t); constv.delete(ex.t); }
        continue;
      }
      const off = ex.U ? ex.imm : ((-ex.imm) >>> 0);
      const width = (ex.kind === 'strh' || ex.kind === 'ldrh') ? 2 : (ex.kind === 'strd' || ex.kind === 'ldrd') ? 8 : 1;
      const base = alias.get(ex.n);
      if (base !== undefined) {
        const a = (base + off) >>> 0;
        if (ex.L) { hits.push({ at: v, kind: ex.kind, off: a, width, dir: 'r' }); noteOffset(a, site.at); }
        else { const c = constv.get(ex.t); hits.push({ at: v, kind: ex.kind, off: a, width, dir: 'w', const: (c === undefined ? null : c) }); noteOffset(a, site.at); }
      }
      if (ex.L) {
        alias.delete(ex.t); tag.delete(ex.t); constv.delete(ex.t);
        if (ex.kind === 'ldrd') { const t2 = (ex.t + 1) & 15; alias.delete(t2); tag.delete(t2); constv.delete(t2); }
      }
      continue;
    }
    if (vf) continue;
    const mi = misc(w);
    if (mi) { constv.delete(mi.d); tag.delete(mi.d); alias.delete(mi.d); continue; }
  }
  return { hits, escapes };
}

const allHits = [], allEscapes = [];
for (const s of subLoads) {
  const r = walkFrom(s);
  for (const h of r.hits) { h.site = s.at; h.fn = s.fn; allHits.push(h); }
  for (const e of r.escapes) { e.site = s.at; e.fn = s.fn; allEscapes.push(e); }
}
const hitsAtField = allHits.filter((h) => h.off === FIELD);
console.log(`B-WALK hits=${allHits.length} atByte${FIELD}=${hitsAtField.length} escapes=${allEscapes.length}`);
console.log('B-OFFSET-HIST (offset on the sub-object -> distinct em[0x1428] load sites touching it, top 60)');
{
  const rows = [...OFFSET_HIST.entries()].sort((a, b) => b[1].size - a[1].size || a[0] - b[0]);
  for (const [off, set] of rows.slice(0, 60)) console.log(`B-OFF ${hex(off)} sites=${set.size}`);
  console.log(`B-OFFSETS-DISTINCT ${rows.length}`);
}
console.log('--- B accesses at byte ' + FIELD + ' reached from em[0x1428] ---');
for (const h of hitsAtField) {
  const tg = h.tag ? (h.tag.t + (h.tag.op !== undefined ? ' op=' + h.tag.op + ' mask=' + hex(h.tag.mask) : '') + (h.tag.lsb !== undefined ? ' lsb=' + h.tag.lsb + ' w=' + h.tag.width : '')) : '-';
  console.log(`B-FIELD site=${hex(h.site)} fn=${h.fn === null ? '?' : hex(h.fn)} at=${hex(h.at)} ${h.kind} dir=${h.dir} tag=${tg} ` +
    `const=${(h.const === null || h.const === undefined) ? '-' : hex(h.const)} mask=${h.mask === undefined || h.mask === null ? '-' : hex(h.mask)} instr="${armDecode(W(h.at), h.at)}"`);
}
if (!hitsAtField.length) console.log('B-FIELD none');
console.log('--- B reg-indexed accesses on the sub pointer ---');
for (const h of allHits.filter((x) => x.kind === 'regindex')) console.log(`B-REGIDX site=${hex(h.site)} at=${hex(h.at)} width=${h.width} dir=${h.dir}`);
console.log('--- B escapes (the pointer leaves the tracked registers) ---');
for (const e of allEscapes.slice(0, MAXPRINT)) console.log(`B-ESCAPE site=${hex(e.site)} fn=${e.fn === null ? '?' : hex(e.fn)} at=${hex(e.at)} ${e.how}`);
console.log(`B-ESCAPE-TOTAL ${allEscapes.length}`);

// ================= Section C: global immediate-offset lane =================
console.log('\n=========== C. GLOBAL LANE: insns whose immediate offset range covers byte ' + FIELD + ' ===========');
const laneC = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const sd = sdt(w);
  // n === 15 is a pc-relative literal (`ldr rX,[pc,#424]`), n === 13 is a stack slot, and a
  // post-indexed form (`str rX,[rB],#424`) stores at [rB] and adds the offset afterwards:
  // none of them addresses an object field, so all are excluded from this lane.
  if (sd && sd.k === 'sdt' && sd.I === 0 && sd.n !== 15 && sd.n !== 13 && sd.P === 1) {
    const width = sd.B ? 1 : 4, off = sd.U ? sd.imm : ((-sd.imm) >>> 0);
    if (off <= FIELD && FIELD <= off + width - 1)
      laneC.push({ at: v, kind: sd.B ? (sd.L ? 'ldrb' : 'strb') : (sd.L ? 'ldr' : 'str'), base: sd.n, off, width, dir: sd.L ? 'r' : 'w', exact: off === FIELD });
  }
  const ex = extra(w);
  if (ex && ex.I === 1 && ex.n !== 15 && ex.n !== 13 && ex.P === 1) {
    const width = (ex.kind === 'strh' || ex.kind === 'ldrh') ? 2 : (ex.kind === 'strd' || ex.kind === 'ldrd') ? 8 : 1;
    const off = ex.U ? ex.imm : ((-ex.imm) >>> 0);
    if (off <= FIELD && FIELD <= off + width - 1)
      laneC.push({ at: v, kind: ex.kind, base: ex.n, off, width, dir: ex.L ? 'r' : 'w', exact: off === FIELD });
  }
}
console.log(`C-COUNT ${laneC.length} (exact=${laneC.filter((x) => x.exact).length} overlapping=${laneC.filter((x) => !x.exact).length})`);
for (const c of laneC) {
  const f = fnStartOf(c.at);
  console.log(`C-SITE ${hex(c.at)} fn=${f === null ? '?' : hex(f)} ${c.kind} off=${c.off} width=${c.width} dir=${c.dir} ` +
    `${c.exact ? 'EXACT' : 'OVERLAP'} instr="${armDecode(W(c.at), c.at)}"`);
}
const cSet = new Set(laneC.map((x) => x.at));
for (const m of [0xb163c, 0xb16a0, 0xb16f4, 0xb1770])
  console.log(`C-CONTROL ${hex(m)} ${cSet.has(m) ? 'present' : 'MISSING'} (hand-verified ldrb #424 in a handshake)`);

// ================= Section D: pre-folded address lane =================
console.log('\n=========== D. PRE-FOLDED ADDRESS LANE (movw #0x1a8 / add-sub rX,rY,#424) ===========');
let dCount = 0;
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const mw = movw(w);
  if (mw && mw.v === FIELD) { dCount++; console.log(`D-MOVW ${hex(v)} r${mw.d} fn=${hex(fnStartOf(v) || 0)}`); continue; }
  const di = dpImm(w);
  if (di && (di.op === 4 || di.op === 2) && di.imm === FIELD) { dCount++; console.log(`D-ADD ${hex(v)} ${di.op === 4 ? 'add' : 'sub'} r${di.d},r${di.n},#${FIELD} fn=${hex(fnStartOf(v) || 0)}`); }
}
console.log(`D-COUNT ${dCount}`);

// ================= Section E: writes covering byte 424 =================
console.log('\n=========== E. WRITES COVERING BYTE ' + FIELD + ' ===========');
const writes = laneC.filter((c) => c.dir === 'w');
const W3 = [];
for (const c of writes) {
  const ins = W(c.at), sd = sdt(ins), ex = extra(ins);
  const srcReg = (sd && sd.k === 'sdt') ? sd.t : (ex ? ex.t : -1);
  const pos = FIELD - c.off;
  let constVal = null, how = '';
  const fstart = fnStartOf(c.at) || TEXT_START;
  for (let k = 1; k <= 40 && c.at - 4 * k > fstart; k++) {
    const u = c.at - 4 * k, w = W(u);
    const mw = movw(w), di = dpImm(w), dr = dpReg(w), ld = sdt(w);
    if (mw && mw.d === srcReg) { constVal = mw.v; how = 'movw @' + hex(u); break; }
    if (di && di.op === 13 && di.n === 0 && di.d === srcReg) { constVal = di.imm; how = 'mov @' + hex(u); break; }
    if (di && di.d === srcReg) { how = 'dpImm op=' + di.op + ' imm=' + hex(di.imm) + ' @' + hex(u); break; }
    if (dr && dr.d === srcReg) { how = 'dpReg op=' + dr.op + ' @' + hex(u); break; }
    if (ld && ld.k === 'sdt' && ld.L && ld.t === srcReg) { how = 'ldr @' + hex(u); break; }
    const br = branch(w);
    if (br && br.link) { how = 'clobbered by bl @' + hex(u); break; }
  }
  let verdict;
  if (constVal !== null) {
    const b = (constVal >>> (8 * pos)) & 0xff;
    verdict = b === 0 ? 'ZERO' : ('EXACT ' + hex(b) + ' bit3=' + ((b >> BIT) & 1));
  } else if (/^ldr/.test(how)) verdict = 'READ-MODIFY-WRITE? (source loaded at ' + how + ')';
  else verdict = 'COMPUTED (' + (how || 'no def in 40 insns') + ')';
  W3.push({ ...c, verdict, how });
  console.log(`E-WRITE ${hex(c.at)} fn=${hex(fnStartOf(c.at) || 0)} ${c.kind} off=${c.off} pos=${pos} ${verdict} instr="${armDecode(ins, c.at)}"`);
}
console.log(`E-WRITE-COUNT ${writes.length} bit3-SET=${W3.filter((w) => /bit3=1/.test(w.verdict)).length} bit3-CLEAR=${W3.filter((w) => /bit3=0/.test(w.verdict)).length} other=${W3.filter((w) => !/bit3=/.test(w.verdict)).length}`);
for (const a of [0xb1648, 0xb1664, 0xb16ac, 0xb16c8, 0xb177c, 0xb1794])
  console.log(`E-HANDSHAKE-STORE ${hex(a)} "${armDecode(W(a), a)}" (writes em[0x7424], not byte ${FIELD})`);

// ================= Section F: bit usage of the byte =================
console.log('\n=========== F. BIT USAGE: masks tested after a load at [x+' + FIELD + '] ===========');
const perBit = new Map();
for (let i = 0; i < 8; i++) perBit.set(i, []);
let fTests = 0;
for (const c of laneC.filter((x) => x.dir === 'r')) {
  const sd = sdt(W(c.at)), ex = extra(W(c.at));
  let reg = (sd && sd.k === 'sdt') ? sd.t : (ex ? ex.t : -1);
  for (let k = 1; k <= 10 && c.at + 4 * k < TEXT_END; k++) {
    const u = c.at + 4 * k, w = W(u);
    const di = dpImm(w), dr = dpReg(w), ux = ubfx(w), sx = sbfx(w);
    if (di && di.op >= 8 && di.op <= 11 && di.n === reg) {
      fTests++;
      const mask = di.imm & 0xff;
      for (let b = 0; b < 8; b++) if (mask & (1 << b)) perBit.get(b).push({ at: u, readAt: c.at });
      console.log(`F-TEST read@${hex(c.at)} test@${hex(u)} mask=${hex(di.imm)} bits=${bitsOf(mask)} fn=${hex(fnStartOf(u) || 0)}`);
      break;
    }
    if (dr && dr.op >= 8 && dr.op <= 11 && dr.n === reg) {
      fTests++;
      // the mask is a register value: no bit can be attributed, so no perBit entry
      console.log(`F-TEST-REG read@${hex(c.at)} test@${hex(u)} register-mask-unknown-bits fn=${hex(fnStartOf(u) || 0)} instr="${armDecode(w, u)}"`);
      break;
    }
    if ((ux || sx) && (ux || sx).n === reg) {
      const q = ux || sx;
      fTests++;
      for (let b = q.lsb; b < q.lsb + q.width && b < 8; b++) perBit.get(b).push({ at: u, readAt: c.at });
      console.log(`F-TEST read@${hex(c.at)} ${ux ? 'ubfx' : 'sbfx'}@${hex(u)} lsb=${q.lsb} width=${q.width} fn=${hex(fnStartOf(u) || 0)}`);
      break;
    }
    if (dr && dr.op === 13 && dr.st === 0 && dr.sh === 0 && dr.n === 0 && dr.rm === reg) { reg = dr.d; continue; }
    break;
  }
}
console.log(`F-TEST-COUNT ${fTests}`);
for (let b = 0; b < 8; b++) {
  const L = perBit.get(b);
  console.log(`F-BIT ${b} sites=${L.length}` + (L.length ? ' ' + L.slice(0, 8).map((x) => hex(x.readAt) + '->' + hex(x.at)).join(' ') : ''));
}

// ================= Section G: who installs em[0x1428] =================
console.log('\n=========== G. WRITERS OF em[' + hex(SUB_OFF) + '] (who installs the sub-object) ===========');
let gCount = 0;
function callsBefore(v, f) {
  const out = [];
  for (let k = 1; k <= 12 && v - 4 * k > (f || TEXT_START); k++) {
    const u = v - 4 * k, br = branch(W(u));
    if (br && br.link) out.push(hex(btarget(W(u), u)));
  }
  return out;
}
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const sd = sdt(w);
  if (sd && sd.k === 'sdt' && !sd.L && sd.I === 0 && sd.imm === SUB_OFF && !sd.B) {
    gCount++;
    const f = fnStartOf(v);
    console.log(`G-WRITE ${hex(v)} fn=${hex(f || 0)} calls=${callsBefore(v, f).join(',') || '-'} instr="${armDecode(w, v)}"`);
  }
  const mw = movw(w);
  if (mw && mw.v === SUB_OFF) {
    for (let k = 1; k <= 4; k++) {
      const u = v + 4 * k, d = sdt(W(u));
      // !d.B: a byte store at +0x1428 is a *different* field (the pointer field is 4 bytes);
      // d.P: post-indexed stores write the base, not base+0x1428.
      if (d && d.k === 'sdt' && !d.L && !d.B && d.P === 1 && ((d.I === 1 && d.rm === mw.d) || (d.I === 0 && d.imm === SUB_OFF))) {
        gCount++;
        const f = fnStartOf(v);
        console.log(`G-WRITE ${hex(u)} fn=${hex(f || 0)} calls=${callsBefore(v, f).join(',') || '-'} instr="${armDecode(W(u), u)}" (via movw @${hex(v)})`);
        break;
      }
    }
  }
}
console.log(`G-COUNT ${gCount}`);

// ================= Section H: best-effort field-name search =================
console.log('\n=========== H. NAME SEARCH: data words == ' + FIELD + ' with nearby image pointers to ASCII names ===========');
let hCand = 0;
for (let v = TEXT_END; v < buf.length; v += 4) {
  const o = v + 0x100;
  if (o + 4 > buf.length) break;
  if ((buf.readUInt32LE(o) >>> 0) !== FIELD) continue;
  const near = nearString(v);
  if (!near.length) continue;
  hCand++;
  if (hCand <= MAXPRINT) console.log(`H-CAND word@${hex(v)} value=${FIELD} names=` + near.slice(0, 4).map((x) => `"${x.s}"@${hex(x.at)}`).join(' '));
}
console.log(`H-CAND-COUNT ${hCand}`);
const suspicious = [];
for (let i = TEXT_END + 0x100; i + 3 < buf.length; i++) {
  const c = buf[i];
  if (c !== 0x65 && c !== 0x45) continue;
  const s = cstrAt(i - 0x100);
  if (!s) continue;
  if (!/^[A-Za-z_][A-Za-z0-9_:.{}\[\]]{2,47}$/.test(s)) continue;
  if (/^(em|Em|EM|enemy|Enemy|act|Act)/.test(s)) suspicious.push({ at: i - 0x100, s });
}
console.log(`H-EM-LIKE-STRINGS ${suspicious.length}`);
for (const s of suspicious.slice(0, 40)) console.log(`H-STR ${hex(s.at)} "${s.s}"`);

// ================= Section I: summary =================
console.log('\n=========== I. SUMMARY ===========');
console.log(`I-IMAGE ${IMG} bytes=${buf.length}`);
console.log(`I-SUBFIELD em[${hex(SUB_OFF)}] loads=${subLoads.length}`);
console.log(`I-BYTE ${FIELD} (0x${FIELD.toString(16)}) exact=${laneC.filter((x) => x.exact).length} reads=${laneC.filter((x) => x.dir === 'r').length} writes=${writes.length}`);
console.log(`I-BIT3 tests=${perBit.get(BIT).length} writes-set=${W3.filter((w) => /bit3=1/.test(w.verdict)).length} writes-clear=${W3.filter((w) => /bit3=0/.test(w.verdict)).length} writes-other=${W3.filter((w) => !/bit3=/.test(w.verdict)).length}`);
console.log('I-BITS ' + [0, 1, 2, 3, 4, 5, 6, 7].map((b) => 'b' + b + ':' + perBit.get(b).length).join(' '));
console.log(`I-SUB-POINTER-WRITERS ${gCount}`);
console.log('DONE');
