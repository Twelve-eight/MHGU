// want-7420.mjs — write / read / escape census for the BYTE at em[0x7420]
// (guard: 0x82958 movw r1,#0x7420 ; ldrb ; cmp r1,#0  -> "!= 0" at 0x82958-0x82964).
//
// Adapted from the proven 0x1408 census (MHGU/tools/audit/guard-word-ops.mjs); the field is
// a BYTE, so the tracked quantity is the low byte of whatever is stored at/over 0x7420 and
// the state lattice is {zero, nonzero, exact, unknown} instead of bit7 {clear, set, same}.
//
// Read-only on the image; writes nothing.  Run:  node G:/tmp/EMC/want-7420.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';

const FIELD = 0x7420;                       // byte offset inside the em object
let armDecode = (w) => '0x' + (w >>> 0).toString(16).padStart(8, '0');
try {
  const m = await import('../mhgu/arm32.mjs');
  if (typeof m.decode === 'function') armDecode = (w, a) => m.decode(w, a);
} catch (e) { console.log('ARM32-IMPORT-FAIL ' + e.message); }

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
let IMG = null, buf = null;
for (const c of ['G:/omp works/MHGU-private/main.140.flat.bin', 'G:/omp works/MHGU/main.140.flat.bin']) {
  try { buf = fs.readFileSync(c); IMG = c; break; } catch { /* next */ }
}
console.log('FIELD 0x' + FIELD.toString(16).toUpperCase() + '  sem u8 != 0');
console.log('IMAGE', IMG);
if (!buf) { console.log('NO-IMAGE'); process.exit(1); }
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);
const W = (v) => { const o = v + 0x100; if (o < 0 || o + 4 > buf.length) return 0; return buf.readUInt32LE(o) >>> 0; };
const hex = (n) => '0x' + (n >>> 0).toString(16);
const RD = (w) => (w >>> 12) & 15, RN = (w) => (w >>> 16) & 15, RM = (w) => w & 15;

// ---------- structured decoders (same as the 0x1408 tool) ----------
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
  const st = (w >>> 5) & 3, imm = (w >>> 7) & 0x1f;
  return { op: (w >>> 21) & 15, s: (w >>> 20) & 1, n: RN(w), d: RD(w), rm: RM(w), st, sh: imm };
}
function bitfield(w) {
  if ((w & 0x0fe00000) !== 0x07c00000) return null;
  if ((w & 0x70) !== 0x10) return null;
  const msb = (w >>> 16) & 0x1f, lsb = (w >>> 7) & 0x1f;
  return { d: RD(w), n: RM(w), lsb, msb, width: msb - lsb + 1, bfc: RM(w) === 15 };
}
function sdt(w) {
  if ((w & 0x0c000000) !== 0x04000000) return null;
  const I = (w >>> 25) & 1, P = (w >>> 24) & 1, U = (w >>> 23) & 1, B = (w >>> 22) & 1;
  const Wb = (w >>> 21) & 1, L = (w >>> 20) & 1, n = RN(w), t = RD(w);
  if (I) {
    if ((w & 0x10) !== 0) return { k: 'media', d: RD(w), n, rm: RM(w), w };
    return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, rm: RM(w), st: (w >>> 5) & 3, sh: (w >>> 7) & 0x1f };
  }
  return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, imm: w & 0xfff };
}
function extra(w) {
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
  if (!I) return { k: 'extra', kind, P, U, I, W: Wb, L, n, t, rm: RM(w) };
  return { k: 'extra', kind, P, U, I, W: Wb, L, n, t, imm: ((w >>> 4) & 0xf0) | (w & 0xf) };
}
function branch(w) {
  if ((w & 0x0e000000) !== 0x0a000000) return null;
  let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
  return { cond: (w >>> 28) & 0xf, link: (w >>> 24) & 1, off: (o << 2) | 0 };
}
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
function vfp(w) { if ((w & 0x0c000000) !== 0x0c000000) return null; return { k: 'vfp', sp: RN(w) === 13 }; }
function misc(w) { if ((w & 0x0f000000) !== 0x01000000) return null; return { d: RD(w), n: RN(w), rm: RM(w), w }; }
const COND = (w) => (w >>> 28) & 0xf;

// ---------- tags ----------
// c = constant ; i = identity pointer (em or another object) ; p = base+off pointer
// y = the BYTE VALUE held at em[0x7420] (state lattice below)
const isY = (t) => t && t.t === 'y';
const isPtrField = (t) => t && t.t === 'p' && t.off === FIELD;
const norm = (v) => { v &= 0xff; return v === 0 ? { s: 'zero' } : { s: 'exact', v }; };
const ZS = { s: 'zero' }, NS = { s: 'nz' }, US = { s: 'unk' };
function yAnd(st, m) {
  m &= 0xff;
  if (m === 0) return ZS;
  if (st.s === 'exact') return norm(st.v & m);
  if (st.s === 'zero') return ZS;
  return US;
}
function yApply(st, op, mask) {
  const m = mask & 0xff;
  if (op === 12) return m !== 0 ? NS : st;                 // ORR
  if (op === 14) return yAnd(st, (~mask) & 0xff);          // BIC
  if (op === 0) return yAnd(st, m);                        // AND
  if (op === 1) {                                          // EOR
    if (m === 0) return st;
    if (st.s === 'exact') return norm(st.v ^ m);
    if (st.s === 'zero') return NS;
    return US;
  }
  return US;
}
const stVerdict = (st) => st.s === 'zero' ? 'zero' : (st.s === 'exact' || st.s === 'nz') ? 'nonzero' : 'unknown';
function initState() { return { regs: new Array(16).fill(null), stack: new Map(), gens: new Array(16).fill(0) }; }
function cloneState(s) { return { regs: s.regs.slice(), stack: new Map(s.stack), gens: s.gens.slice() }; }
function setReg(s, r, tag) { s.regs[r] = tag; s.gens[r] = (s.gens[r] + 1) >>> 0; }
function identOf(s, r) { return `r${r}#${s.gens[r]}`; }
function op2Const(s, w) {
  const t = s.regs[RM(w)];
  if (!t || t.t !== 'c') return null;
  const v = t.v, sh = (w >>> 7) & 0x1f, st = (w >>> 5) & 3;
  if (st === 0) return (v << sh) >>> 0;
  if (st === 1) { const q = sh || 32; return q >= 32 ? 0 : (v >>> q) >>> 0; }
  if (st === 2) { const q = sh || 32; return q >= 32 ? ((v | 0) >> 31) >>> 0 : (((v | 0) >> q) >>> 0); }
  const q = sh || 0; return ((v >>> q) | (v << (32 - q))) >>> 0;
}

// ---------- events ----------
function newSiteRun(v, reg, kind) { return { v, reg, kind, events: new Map(), flags: new Set(), steps: 0, stores: [], fieldBases: new Set() }; }
function rec(run, ev, chain) {
  const key = `${ev.type}:${ev.at}:${ev.verdict || ''}:${ev.width || ''}`;
  if (run.events.has(key)) return;
  ev.chain = chain.slice(-14);
  run.events.set(key, ev);
}
const addChain = (chain, pc, w) => { const c = chain.slice(); c.push({ pc, w }); return c; };
const fmtChain = (chain) => chain.map((c) => `${hex(c.pc)}: ${armDecode(c.w, c.pc)}`);

// nearest preceding definition of `reg` (gives the value when it is a mov/movw immediate)
function backScan(reg, from, maxIns = 220) {
  for (let j = 1; j <= maxIns; j++) {
    const v = from - 4 * j;
    if (v < TEXT_START) break;
    const w = W(v);
    const q = movw(w); if (q && q.d === reg) return { v: q.v, at: v, how: 'movw #' + hex(q.v) };
    const d = dpImm(w); if (d && d.d === reg && d.op === 13 && d.n === 0) return { v: d.imm, at: v, how: 'mov #' + hex(d.imm) };
    const m2 = movt(w); if (m2 && m2.d === reg) return { v: null, at: v, how: 'movt' };
    const r3 = dpReg(w); if (r3 && r3.d === reg) return { v: null, at: v, how: 'dpReg op=' + r3.op };
    const b = bitfield(w); if (b && b.d === reg) return { v: null, at: v, how: 'bfi/bfc' };
    const sx = sdt(w); if (sx && sx.k === 'sdt' && sx.L && sx.t === reg) return { v: null, at: v, how: 'ldr' };
    const e2 = extra(w); if (e2 && e2.L && (e2.t === reg || (e2.kind === 'ldrd' && ((e2.t + 1) & 15) === reg))) return { v: null, at: v, how: 'ldr-extra' };
    const l2 = ldmstm(w); if (l2 && l2.L && l2.regs.includes(reg)) return { v: null, at: v, how: 'ldm' };
  }
  return null;
}
function fnStartOf(v) {
  for (let a = v; a >= TEXT_START && a > v - 0x8000; a -= 4) {
    const lw = ldmstm(W(a));
    if (lw && lw.n === 13 && !lw.L && lw.P && !lw.U && lw.regs.includes(14)) return a;
  }
  return null;
}

// ---------- address helper ----------
function effAddr(s, baseReg, offConst) {
  if (offConst === null || offConst === undefined) return null;
  const t = s.regs[baseReg];
  if (t && t.t === 'p') return { base: t.base, off: (t.off + offConst) >>> 0 };
  if (t && t.t === 'i') return { base: t.id, off: offConst >>> 0 };
  if (t && t.t === 'c') return { base: 'abs:' + hex(t.v), off: offConst >>> 0 };
  return { base: identOf(s, baseReg), off: offConst >>> 0 };
}
// a store of `width` bytes at a.off covers FIELD iff a.off <= FIELD <= a.off+width-1
const covers = (a, width) => a && a.off <= FIELD && FIELD <= a.off + width - 1;
const isFieldAddr = (a) => a && a.off === FIELD;

// ---------- per-site DFS ----------
function analyzeSite(site) {
  const run = newSiteRun(site.v, site.reg, site.kind);
  const start = initState();
  setReg(start, site.reg, { t: 'c', v: FIELD });
  const queue = [{ pc: (site.v + 4) >>> 0, s: start, chain: [{ pc: site.v, w: W(site.v) }] }];
  const visits = new Map();
  let dropped = false;
  const MAXQ = 60, MAXSTEP = 2500, MAXVISIT = 3;
  while (queue.length) {
    const { pc, s, chain } = queue.shift();
    if (run.steps++ > MAXSTEP) { run.flags.add('truncated'); break; }
    if (pc < TEXT_START || pc >= TEXT_END) { run.flags.add('left-text'); continue; }
    const vc = visits.get(pc) || 0;
    if (vc >= MAXVISIT) { run.flags.add('loop-cap'); continue; }
    visits.set(pc, vc + 1);
    const w = W(pc);
    const cond = COND(w);
    const conditional = cond !== 0xe && cond !== 0xf;
    const mw = movw(w), mt = movt(w), di = dpImm(w), dr = dpReg(w), bf = bitfield(w),
      sd = sdt(w), ex = extra(w), br = branch(w), bxx = bx(w), lm = ldmstm(w), vf = vfp(w), mi = misc(w);

    const exec = (st, ch) => {
      const Rg = (r) => st.regs[r];
      if (mw) { setReg(st, mw.d, { t: 'c', v: mw.v }); return { cont: true }; }
      if (mt) {
        const t = Rg(mt.d);
        if (t && t.t === 'c') setReg(st, mt.d, { t: 'c', v: ((mt.v << 16) | (t.v & 0xffff)) >>> 0 });
        else setReg(st, mt.d, null);
        return { cont: true };
      }
      if (bf) {
        const cur = Rg(bf.d);
        const src = bf.bfc ? null : Rg(bf.n);
        if (isY(cur)) {
          let ns;
          if (bf.lsb > 7) ns = { s: cur.s, v: cur.v };                       // does not touch the low byte
          else if (bf.bfc && bf.lsb === 0 && bf.msb >= 7) ns = ZS;            // clears all of bits 0..7
          else if (bf.bfc) ns = US;                                           // clears some low bits
          else if (src && src.t === 'c' && cur.s === 'exact') {
            const mask = (bf.msb === 31 ? 0xffffffff : ((1 << (bf.msb + 1)) - 1)) ^ ((1 << bf.lsb) - 1);
            ns = norm(((src.v << bf.lsb) & mask) | (cur.v & ~mask));
          } else ns = US;
          setReg(st, bf.d, { t: 'y', key: cur.key, ...ns });
          rec(run, { type: 'bitfield', at: pc, lsb: bf.lsb, width: bf.width, bfc: bf.bfc, verdict: stVerdict(ns), srcKnown: src && src.t === 'c' ? src.v : null }, ch);
        } else setReg(st, bf.d, null);
        return { cont: true };
      }
      if (di) {
        const { op, n, d, imm } = di;
        if (op >= 8 && op <= 11) {
          const t = Rg(n);
          if (isY(t)) rec(run, { type: 'test', at: pc, imm, verdict: 'read' }, ch);
          return { cont: true };
        }
        if (op === 13 && n === 0) { setReg(st, d, { t: 'c', v: imm }); return { cont: true }; }
        if (op === 15 && n === 0) { const v = (~imm) >>> 0; setReg(st, d, { t: 'c', v }); return { cont: true }; }
        if (op === 13 || op === 15) { setReg(st, d, null); return { cont: true }; }
        const tn = Rg(n);
        if (op === 0 || op === 1 || op === 12 || op === 14) {
          if (tn && tn.t === 'c') {
            let v;
            if (op === 0) v = (tn.v & imm) >>> 0; else if (op === 1) v = (tn.v ^ imm) >>> 0;
            else if (op === 12) v = (tn.v | imm) >>> 0; else v = (tn.v & ~imm) >>> 0;
            setReg(st, d, { t: 'c', v }); return { cont: true };
          }
          if (isY(tn)) {
            const ns = yApply(tn, op, imm);
            setReg(st, d, { t: 'y', key: tn.key, ...ns });
            rec(run, { type: 'op', at: pc, op, imm, verdict: stVerdict(ns) }, ch);
          } else setReg(st, d, null);
          return { cont: true };
        }
        if (isY(tn)) { setReg(st, d, { t: 'y', key: tn.key, ...US }); return { cont: true }; }
        if (tn && tn.t === 'c' && (op === 2 || op === 4) && n !== 0) {
          const v = op === 4 ? (tn.v + imm) >>> 0 : (tn.v - imm) >>> 0;
          setReg(st, d, { t: 'c', v }); return { cont: true };
        }
        if (op === 2 || op === 4) {
          const delta = op === 4 ? imm : (-imm) >>> 0;
          if (tn && tn.t === 'p') setReg(st, d, { t: 'p', base: tn.base, off: (tn.off + delta) >>> 0, syn: tn.syn });
          else if (tn && tn.t === 'i') setReg(st, d, { t: 'p', base: tn.id, off: delta, syn: true });
          else if (!tn) setReg(st, d, { t: 'p', base: 'syn:' + identOf(st, n), off: delta, syn: true });
          else setReg(st, d, null);
          return { cont: true };
        }
        setReg(st, d, null);
        return { cont: true };
      }
      if (dr) {
        const { op, n, d, rm } = dr;
        if (op >= 8 && op <= 11) {
          const t = Rg(n);
          if (isY(t)) rec(run, { type: 'test', at: pc, imm: null, verdict: 'read' }, ch);
          return { cont: true };
        }
        if (op === 13) {
          if (dr.st === 0 && dr.sh === 0) { const t = Rg(rm); if (t) setReg(st, d, { ...t }); else setReg(st, d, null); }
          else setReg(st, d, null);
          return { cont: true };
        }
        if (op === 15) { setReg(st, d, null); return { cont: true }; }
        if (op === 0 || op === 1 || op === 12 || op === 14) {
          const mask = op2Const(st, w);
          const tn = Rg(n), td = Rg(d);
          if (mask !== null) {
            if (tn && tn.t === 'c') {
              let v; if (op === 0) v = (tn.v & mask) >>> 0; else if (op === 1) v = (tn.v ^ mask) >>> 0;
              else if (op === 12) v = (tn.v | mask) >>> 0; else v = (tn.v & ~mask) >>> 0;
              setReg(st, d, { t: 'c', v }); return { cont: true };
            }
            if (isY(tn)) {
              const ns = yApply(tn, op, mask);
              setReg(st, d, { t: 'y', key: tn.key, ...ns });
              rec(run, { type: 'op', at: pc, op, imm: mask, verdict: stVerdict(ns), reg: true }, ch);
            } else if (isY(td)) {
              const ns = (op === 0 || op === 14) ? { s: td.s, v: td.v } : US;
              setReg(st, d, { t: 'y', key: td.key, ...ns });
              rec(run, { type: 'op', at: pc, op, imm: mask, verdict: stVerdict(ns), reg: true }, ch);
            } else setReg(st, d, null);
            return { cont: true };
          }
          if (isY(tn)) { setReg(st, d, { t: 'y', key: tn.key, ...US }); rec(run, { type: 'op', at: pc, op, imm: null, verdict: 'unknown', reg: true }, ch); }
          else if (isY(td) && (op === 0 || op === 14)) { setReg(st, d, { t: 'y', key: td.key, ...{ s: td.s, v: td.v } }); rec(run, { type: 'op', at: pc, op, imm: null, verdict: stVerdict(td), reg: true }, ch); }
          else setReg(st, d, null);
          return { cont: true };
        }
        const tn = Rg(n), trm = Rg(rm), m2 = op2Const(st, w);
        if (isY(tn) || isY(trm) || isY(Rg(d))) {
          const key = isY(Rg(d)) ? Rg(d).key : (isY(tn) ? tn.key : trm.key);
          setReg(st, d, { t: 'y', key, ...US });
        } else if (tn && tn.t === 'c' && trm && trm.t === 'c' && (op === 2 || op === 3 || op === 4 || op === 5)) {
          const v = op === 2 ? (tn.v - trm.v) >>> 0 : op === 3 ? (trm.v - tn.v) >>> 0 : (tn.v + trm.v) >>> 0;
          setReg(st, d, { t: 'c', v });
        } else if ((op === 2 || op === 4) && m2 !== null && dr.st === 0 && dr.sh === 0) {
          const delta = op === 4 ? m2 : (-m2) >>> 0;
          if (tn && tn.t === 'p') setReg(st, d, { t: 'p', base: tn.base, off: (tn.off + delta) >>> 0, syn: tn.syn });
          else if (tn && tn.t === 'i') setReg(st, d, { t: 'p', base: tn.id, off: delta, syn: true });
          else if (!tn) setReg(st, d, { t: 'p', base: 'syn:' + identOf(st, n), off: delta, syn: true });
          else setReg(st, d, null);
        } else setReg(st, d, null);
        return { cont: true };
      }
      if (sd) {
        if (sd.k === 'media') { setReg(st, sd.d, null); return { cont: true }; }
        const off = sd.I ? op2Const(st, w) : sd.imm;
        if (sd.I && off === null) {
          if (isPtrField(Rg(sd.n))) rec(run, { type: 'dynamic', at: pc, L: sd.L }, ch);
          if (sd.L) setReg(st, sd.t, null);
          return { cont: true };
        }
        const signedOff = sd.U ? off : (-off) >>> 0;
        const a = effAddr(st, sd.n, signedOff);
        const width = sd.B ? 1 : 4;
        if (sd.L) {
          if (isFieldAddr(a)) {
            run.fieldBases.add(a.base);
            setReg(st, sd.t, { t: 'y', key: a.base, ...US });
            rec(run, { type: 'read', at: pc, width, base: a.base }, ch);
          } else if (sd.n === 15) setReg(st, sd.t, { t: 'c', v: W((pc + 8 + (sd.U ? sd.imm : -sd.imm)) >>> 0) });
          else if (sd.n === 13 && st.stack.has(off)) setReg(st, sd.t, { ...st.stack.get(off) });
          else setReg(st, sd.t, null);
          if (sd.W) { if (sd.P) setReg(st, sd.n, a ? { t: 'p', base: a.base, off: a.off } : null); else if (a) setReg(st, sd.n, { t: 'p', base: a.base, off: (a.off + off) >>> 0 }); }
          return { cont: true };
        }
        const src = st.regs[sd.t];
        run.stores.push({ at: pc, base: a ? a.base : '?', off: a ? a.off : -1, width, srcKind: src ? (src.t === 'c' ? 'const' : src.t) : 'null' });
        if (covers(a, width)) {
          run.fieldBases.add(a.base);
          const pos = FIELD - a.off;
          let vd;
          if (src && src.t === 'c') vd = stVerdict(norm((src.v >>> (8 * pos)) & 0xff));
          else if (isY(src) && pos === 0) vd = stVerdict(src);
          else vd = 'unknown';
          rec(run, { type: 'write', at: pc, width, verdict: vd, base: a.base, syn: a.syn ? 1 : 0, srcReg: sd.t, pos, srcVal: src && src.t === 'c' ? src.v : null, srcKind: src ? src.t : 'null' }, ch);
        } else {
          if (isPtrField(src) && sd.n !== 13) rec(run, { type: 'escape', at: pc, how: 'field pointer stored to memory' }, ch);
          if (sd.n === 13) {
            if (src && (isPtrField(src) || isY(src))) st.stack.set(signedOff >>> 0, { ...src });
            else st.stack.delete(signedOff >>> 0);
          }
        }
        if (sd.W) { if (sd.P) setReg(st, sd.n, a ? { t: 'p', base: a.base, off: a.off } : null); }
        return { cont: true };
      }
      if (ex) {
        const off = ex.I ? ex.imm : op2Const(st, w);
        if (off === null) {
          if (isPtrField(Rg(ex.n))) rec(run, { type: 'dynamic', at: pc, kind: ex.kind }, ch);
          if (ex.L) { setReg(st, ex.t, null); if (ex.kind === 'ldrd') setReg(st, (ex.t + 1) & 15, null); }
          return { cont: true };
        }
        const signedOff = ex.U ? off : (-off) >>> 0;
        const a = effAddr(st, ex.n, signedOff);
        const width = ex.kind === 'strh' || ex.kind === 'ldrh' ? 2 : ex.kind === 'strd' || ex.kind === 'ldrd' ? 8 : 1;
        if (ex.L) {
          if (isFieldAddr(a)) { run.fieldBases.add(a.base); setReg(st, ex.t, { t: 'y', key: a.base, ...US }); rec(run, { type: 'read', at: pc, width, base: a.base }, ch); }
          else if (ex.n === 13 && st.stack.has(off)) setReg(st, ex.t, { ...st.stack.get(off) });
          else setReg(st, ex.t, null);
          if (ex.kind === 'ldrd') setReg(st, (ex.t + 1) & 15, null);
        } else {
          const src = st.regs[ex.t];
          run.stores.push({ at: pc, base: a ? a.base : '?', off: a ? a.off : -1, width, srcKind: src ? (src.t === 'c' ? 'const' : src.t) : 'null' });
          if (covers(a, width)) {
            run.fieldBases.add(a.base);
            const pos = FIELD - a.off;
            let vd;
            if (src && src.t === 'c') vd = stVerdict(norm((src.v >>> (8 * pos)) & 0xff));
            else if (isY(src) && pos === 0) vd = stVerdict(src);
            else vd = 'unknown';
            rec(run, { type: 'write', at: pc, width, verdict: vd, base: a.base, syn: a.syn ? 1 : 0, srcReg: ex.t, pos, srcVal: src && src.t === 'c' ? src.v : null, srcKind: src ? src.t : 'null' }, ch);
          } else if (isPtrField(src)) rec(run, { type: 'escape', at: pc, how: 'field pointer stored to memory (extra)' }, ch);
        }
        return { cont: true };
      }
      if (lm) {
        if (lm.n === 13 && !lm.L) { st.stack.clear(); return { cont: true }; }
        if (lm.n === 13 && lm.L) {
          for (const r of lm.regs) setReg(st, r, null);
          st.stack.clear();
          return lm.regs.includes(15) ? { exit: true } : { cont: true };
        }
        const baseTag = st.regs[lm.n];
        if (isPtrField(baseTag)) {
          if (lm.L) rec(run, { type: 'read', at: pc, width: 4 * lm.regs.length, base: baseTag.base }, ch);
          else rec(run, { type: 'write', at: pc, width: 4, verdict: 'unknown', base: baseTag.base, multi: true }, ch);
        }
        if (lm.L) for (const r of lm.regs) setReg(st, r, null);
        if (lm.W) setReg(st, lm.n, null);
        return { cont: true };
      }
      if (br) {
        const link = br.link === 1;
        const tgt = (pc + 8 + br.off) >>> 0;
        if (link || cond === 0xf) {
          for (const r of [0, 1, 2, 3, 12]) if (isPtrField(st.regs[r])) rec(run, { type: 'escape', at: pc, how: `field pointer passed to ${hex(tgt)} in r${r}` }, ch);
          for (const r of [0, 1, 2, 3, 12, 14]) setReg(st, r, null);
          return { cont: true };
        }
        if (cond === 0xe) return { jump: tgt };
        return { fork: { target: tgt, fall: (pc + 4) >>> 0 } };
      }
      if (bxx) {
        const t = st.regs[bxx.rm];
        if (bxx.kind === 'blx') {
          if (isPtrField(t)) rec(run, { type: 'escape', at: pc, how: `field pointer passed to blx r${bxx.rm}` }, ch);
          for (const r of [0, 1, 2, 3, 12, 14]) setReg(st, r, null);
          return { cont: true };
        }
        return { exit: true };
      }
      if (vf) { if (vf.sp) st.stack.clear(); return { cont: true }; }
      if (mi) { setReg(st, mi.d, null); return { cont: true }; }
      // undecoded: kill caller-saved, note if anything live was in them
      let live = false;
      for (const r of [0, 1, 2, 3, 12]) if (isY(st.regs[r]) || isPtrField(st.regs[r])) live = true;
      for (const r of [4, 5, 6, 7, 8, 9, 10, 11]) if (isY(st.regs[r]) || isPtrField(st.regs[r])) live = true;
      if (live) rec(run, { type: 'opaque', at: pc, w }, ch);
      for (const r of [0, 1, 2, 3, 12]) setReg(st, r, null);
      return { cont: true };
    };

    const ch = addChain(chain, pc, w);
    if (conditional) {
      const s2 = cloneState(s);
      const r2 = exec(s2, ch);
      if (!(br && conditional)) {
        if (queue.length < MAXQ) queue.push({ pc: (pc + 4) >>> 0, s: cloneState(s), chain: ch });
        else dropped = true;
      }
      if (r2.exit) continue;
      if (r2.jump !== undefined) { if (queue.length < MAXQ) queue.push({ pc: r2.jump, s: s2, chain: ch }); else dropped = true; continue; }
      if (r2.fork) {
        if (queue.length < MAXQ) { queue.push({ pc: r2.fork.target, s: cloneState(s2), chain: ch }); queue.push({ pc: r2.fork.fall, s: cloneState(s2), chain: ch }); }
        else dropped = true;
        continue;
      }
      if (queue.length < MAXQ) queue.push({ pc: (pc + 4) >>> 0, s: s2, chain: ch }); else dropped = true;
      continue;
    }
    const r1 = exec(s, ch);
    if (r1.exit) continue;
    if (r1.jump !== undefined) { if (queue.length < MAXQ) queue.push({ pc: r1.jump, s, chain: ch }); else dropped = true; continue; }
    if (r1.fork) { queue.push({ pc: r1.fork.target, s: cloneState(s), chain: ch }); queue.push({ pc: r1.fork.fall, s: cloneState(s), chain: ch }); continue; }
    queue.push({ pc: (pc + 4) >>> 0, s, chain: ch });
  }
  if (dropped) run.flags.add('queue-cap');
  return run;
}

// ================= 1) site census =================
const sites = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const q = movw(w);
  if (q && q.v === FIELD) { sites.push({ v, reg: q.d, kind: 'movw' }); continue; }
  const d = dpImm(w);
  if (d && d.op === 13 && d.n === 0 && d.imm === FIELD) { sites.push({ v, reg: d.d, kind: 'movimm' }); continue; }
  const ld = sdt(w);
  if (ld && ld.k === 'sdt' && ld.L && ld.n === 15) {
    const tgt = (v + 8 + (ld.U ? ld.imm : -ld.imm)) >>> 0;
    if (W(tgt) === FIELD) sites.push({ v, reg: ld.t, kind: 'ldrlit' });
  }
}
console.log(`SITES total=${sites.length} movw=${sites.filter(s => s.kind === 'movw').length} movimm=${sites.filter(s => s.kind === 'movimm').length} ldrlit=${sites.filter(s => s.kind === 'ldrlit').length}`);
console.log('SITES first=' + (sites.length ? hex(sites[0].v) : 'none') + ' last=' + (sites.length ? hex(sites[sites.length - 1].v) : 'none'));
const siteSet = new Set(sites.map(s => s.v));
for (const need of [0x82958, 0x82588, 0xc4758, 0xc47d4, 0xc3a68]) {
  console.log(`CONTROL-SITE ${hex(need)} ${siteSet.has(need) ? 'present' : 'MISSING'}`);
}
// lane: is FIELD even encodable as a rotated immediate?  (detector control)
let rotHits = 0;
for (let v = TEXT_START; v < TEXT_END; v += 4) { const d = dpImm(W(v)); if (d && d.imm === FIELD) rotHits++; }
console.log(`LANE-ROTIMM mov-#0x7420 sites=${rotHits} (0 expected: 0x7420 is not an ARM rotated imm; nonzero would expose a decoder bug)`);

// ================= 2) per-site DFS =================
const runs = [];
for (const st of sites) { try { runs.push(analyzeSite(st)); } catch (e) { const r = newSiteRun(st.v, st.reg, st.kind); r.flags.add('error'); r.err = e.message; runs.push(r); } }

const writes = new Map(), ops = new Map(), bfs = new Map(), reads = new Map();
const escapes = [], dynamics = [], opaques = [], perSite = [];
for (const r of runs) {
  const evs = [...r.events.values()];
  const ws = evs.filter(e => e.type === 'write');
  const os = evs.filter(e => e.type === 'op');
  const bs = evs.filter(e => e.type === 'bitfield');
  const rs = evs.filter(e => e.type === 'read' || e.type === 'test');
  for (const e of ws) {
    if (!writes.has(e.at)) writes.set(e.at, { at: e.at, width: e.width, verdicts: new Set(), pos: new Set(), chains: [] });
    const t = writes.get(e.at); t.verdicts.add(e.verdict); t.pos.add(e.pos);
    if (t.chains.length < 4) t.chains.push({ site: r.v, chain: e.chain, srcVal: e.srcVal, srcKind: e.srcKind, srcReg: e.srcReg, width: e.width, at: e.at, syn: e.syn });
  }
  for (const e of os) if (!ops.has(e.at)) ops.set(e.at, { ...e, site: r.v });
  for (const e of bs) if (!bfs.has(e.at)) bfs.set(e.at, { ...e, site: r.v });
  for (const e of rs) if (!reads.has(e.at)) reads.set(e.at, { ...e, site: r.v });
  for (const e of evs) if (e.type === 'escape') escapes.push({ site: r.v, ...e });
  for (const e of evs) if (e.type === 'dynamic') dynamics.push({ site: r.v, ...e });
  for (const e of evs) if (e.type === 'opaque') opaques.push({ site: r.v, ...e });
  perSite.push({ site: r.v, reg: r.reg, kind: r.kind, writes: ws.length, ops: os.length, bf: bs.length, reads: rs.length, flags: [...r.flags].join(','), fieldBases: [...r.fieldBases], stores: r.stores, err: r.err });
}
console.log(`RUN sites=${runs.length} writes=${writes.size} ops=${ops.size} bitfields=${bfs.size} reads=${reads.size} escapes=${escapes.length} dynamic=${dynamics.length} opaque=${opaques.length}`);
const noField = perSite.filter(p => p.writes === 0 && p.ops === 0 && p.bf === 0 && p.reads === 0);
console.log(`NOFIELD count=${noField.length} (sites that never reach base+0x7420: the must-fail control)`);
console.log('NOFIELD-LIST ' + noField.map(p => hex(p.site)).join(' '));
const flagged = perSite.filter(p => p.flags);
console.log(`FLAGGED count=${flagged.length} ` + flagged.map(p => `${hex(p.site)}:${p.flags}`).join(' '));
const errs = perSite.filter(p => p.err);
for (const p of errs) console.log(`ERROR ${hex(p.site)} ${p.err}`);

console.log('=========== WRITERS (store addresses that cover byte 0x7420) ===========');
for (const e of [...writes.values()].sort((a, b) => a.at - b.at)) {
  const c = e.chains[0];
  const instr = c ? armDecode(W(e.at), e.at) : '?';
  console.log(`WRITER ${hex(e.at)} width=${e.width} pos=${[...e.pos].join(',')} verdict=${[...e.verdicts].join('|')} syn=${c ? c.syn : '?'} fn=${hex(fnStartOf(e.at) || 0)} srcKind=${c ? c.srcKind : '?'} srcVal=${c && c.srcVal !== null && c.srcVal !== undefined ? hex(c.srcVal) : '-'} srcReg=r${c ? c.srcReg : '?'} site=${hex(c ? c.site : 0)} instr="${instr}"`);
  if (c) { const bs = backScan(c.srcReg, e.at); console.log(`WRITER-SRC ${hex(e.at)} srcReg=r${c.srcReg} nearestDef=${bs ? bs.how + ' @' + hex(bs.at) : 'none-in-220'} value=${bs && bs.v !== null && bs.v !== undefined ? hex(bs.v) : '?'}`); }
}
console.log('--- WRITER CHAINS ---');
for (const e of [...writes.values()].sort((a, b) => a.at - b.at)) {
  const c = e.chains[0];
  console.log(`CHAIN-FOR ${hex(e.at)}`);
  for (const l of fmtChain(c.chain)) console.log('   ' + l);
}
console.log('--- MANUAL MUST-PASS WRITER CONTROLS (hand-disassembled from the image) ---');
for (const a of [...new Set([0xb1674, 0xb16cc, 0xb17a4, 0xb1654, 0xb16b8, 0xb1784, 0xaf388, 0x6dae8])]) {
  const e = writes.get(a);
  console.log(`MANUAL-WRITE ${hex(a)} ${e ? `FOUND width=${e.width} verdict=${[...e.verdicts].join('|')}` : 'MISSING'} instr="${armDecode(W(a), a)}"`);
}
console.log(`WRITERS-VIA-SYNTHETIC-BASE ${[...writes.values()].filter(e => e.chains[0] && e.chains[0].syn).length} of ${writes.size}`);
console.log('=========== IMMEDIATE / REGISTER OPS ON THE BYTE ===========');
for (const e of [...ops.values()].sort((a, b) => a.at - b.at)) {
  console.log(`OP ${hex(e.at)} ${['and','eor','sub','rsb','add','adc','sbc','rsc','tst','teq','cmp','cmn','orr','mov','bic','mvn'][e.op]} imm=${e.imm === null ? 'dynamic' : hex(e.imm)} verdict=${e.verdict} site=${hex(e.site)}${e.reg ? ' reg-form' : ''} instr="${armDecode(W(e.at), e.at)}"`);
}
console.log('=========== BITFIELD OPS COVERING THE BYTE ===========');
for (const e of [...bfs.values()].sort((a, b) => a.at - b.at)) {
  console.log(`BF ${hex(e.at)} ${e.bfc ? 'bfc' : 'bfi'} lsb=${e.lsb} width=${e.width} verdict=${e.verdict} src=${e.srcKnown === null ? 'dynamic' : hex(e.srcKnown)} site=${hex(e.site)}`);
}
console.log('=========== READS / TESTS (first 80) ===========');
let rc = 0;
for (const e of [...reads.values()].sort((a, b) => a.at - b.at)) {
  if (rc++ >= 80) break;
  console.log(`READ ${hex(e.at)} ${e.type} width=${e.width || '?'} imm=${e.imm === undefined || e.imm === null ? '-' : hex(e.imm)} site=${hex(e.site)} instr="${armDecode(W(e.at), e.at)}"`);
}
console.log(`READ-TOTAL ${reads.size}`);

// ================= 3) control (a): the guard read at 0x82958 =================
console.log('=========== CONTROL (a): GUARD READ 0x82958 ===========');
for (let v = 0x82940; v <= 0x82994; v += 4) console.log(`GUARD-DIS ${hex(v)}: ${armDecode(W(v), v)}`);
{
  const r = runs.find(x => x.v === 0x82958);
  if (!r) console.log('GUARD-SITE 0x82958 MISSING');
  else {
    const evs = [...r.events.values()];
    const rd = evs.filter(e => e.type === 'read');
    const wr = evs.filter(e => e.type === 'write');
    const ts = evs.filter(e => e.type === 'test');
    console.log(`GUARD-SITE 0x82958 reads=${rd.length} writes=${wr.length} tests=${ts.length} flags=${[...r.flags].join(',') || 'none'}`);
    for (const e of rd) console.log(`GUARD-READ at=${hex(e.at)} width=${e.width} instr="${armDecode(W(e.at), e.at)}"`);
    for (const e of ts) console.log(`GUARD-TEST at=${hex(e.at)} imm=${e.imm === null ? '-' : hex(e.imm)} instr="${armDecode(W(e.at), e.at)}"`);
    for (const e of wr) console.log(`GUARD-WRITE at=${hex(e.at)} verdict=${e.verdict} instr="${armDecode(W(e.at), e.at)}"`);
    for (const e of evs.filter(x => x.type === 'escape')) console.log(`GUARD-ESCAPE at=${hex(e.at)} ${e.how}`);
    for (const e of evs.filter(x => x.type === 'op')) console.log(`GUARD-OP at=${hex(e.at)} imm=${e.imm === null ? 'dynamic' : hex(e.imm)} verdict=${e.verdict}`);
    for (const e of evs.filter(x => x.type === 'bitfield')) console.log(`GUARD-BF at=${hex(e.at)} lsb=${e.lsb} width=${e.width} verdict=${e.verdict}`);
  }
}

// ================= 4) control (b): other fields written through the same base =================
console.log('=========== CONTROL (b): OTHER-FIELD STORES THROUGH A BASE THAT ALSO HOLDS em+0x7420 ===========');
const fieldBaseSet = new Set();
for (const p of perSite) for (const b of p.fieldBases) fieldBaseSet.add(b);
let others = 0;
for (const p of perSite) {
  for (const s of p.stores) {
    if (!fieldBaseSet.has(s.base)) continue;
    if (s.off >= FIELD && s.off < FIELD + 4) continue;
    if (s.off >= 0 && s.off < 0x8000 && Math.abs(s.off - FIELD) <= 0x40) {
      others++;
      if (others <= 40) console.log(`OTHERFIELD ${hex(s.at)} off=${hex(s.off)} width=${s.width} base=${s.base} site=${hex(p.site)} instr="${armDecode(W(s.at), s.at)}"`);
    }
  }
}
console.log(`OTHERFIELD count(nearby, within 0x40) = ${others}   (base+offset attribution control: nonzero proves the walk attributes other offsets on the same object)`);

// ================= 5) offset-only lane (independent of the movw sites) =================
console.log('=========== LANE: every STORE in .text whose immediate offset range covers 0x7420 ===========');
let lane = 0, laneAttributed = 0, regOffStores = 0;
const attributed = new Set([...writes.keys()]);
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v), sd = sdt(w), ex = extra(w);
  let rec2 = null;
  if (sd && sd.k === 'sdt' && !sd.L) rec2 = { width: sd.B ? 1 : 4, off: sd.I ? null : sd.imm, U: sd.U, base: sd.n, kind: 'sdt' };
  else if (ex && !ex.L) rec2 = { width: ex.kind === 'strh' ? 2 : ex.kind === 'strd' ? 8 : 1, off: ex.I ? ex.imm : null, U: ex.U, base: ex.n, kind: ex.kind };
  if (!rec2) continue;
  if (rec2.off === null) { regOffStores++; continue; }
  const off = rec2.U ? rec2.off : (-rec2.off) >>> 0;
  if (!(off <= FIELD && FIELD <= off + rec2.width - 1)) continue;
  lane++;
  const isA = attributed.has(v);
  if (isA) laneAttributed++;
  console.log(`LANEOFF ${hex(v)} off=${hex(off)} width=${rec2.width} base=r${rec2.base} attributed=${isA ? 'yes' : 'NO'} instr="${armDecode(w, v)}"`);
}
console.log(`LANEOFF total=${lane} attributed=${laneAttributed} unattributed=${lane - laneAttributed} regOffsetStores(dynamic, not enumerable)=${regOffStores}`);
console.log('NOTE: an immediate offset > 0xFFF is not encodable in ARM imm12, so LANEOFF is structurally 0 for 0x7420; it is NOT evidence.');
console.log('=========== LANE: stores whose OFFSET REGISTER is `movw #0x7420` (nearest prior def, no dataflow) ===========');
let laneN = 0;
const laneFound = new Set();
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v), sx = sdt(w);
  if (!sx || sx.k !== 'sdt' || sx.L || !sx.I) continue;
  const width = sx.B ? 1 : 4;
  const bs = backScan(sx.rm, v, 12);
  if (bs && bs.v === FIELD) {
    laneN++; laneFound.add(v);
    console.log(`LANE-REG ${hex(v)} width=${width} base=r${sx.n} defAt=${hex(bs.at)} instr="${armDecode(w, v)}"`);
  }
}
console.log(`LANE-REG total=${laneN}`);
for (const a of [0xb1654, 0xb16b8, 0xb1784, 0x6dae8, 0xaf388]) console.log(`LANE-REG-CONTROL ${hex(a)} ${laneFound.has(a) ? 'found' : 'MISSING'}`);

// ================= 6) summary =================
console.log('=========== SUMMARY ===========');
const byV = { zero: [], nonzero: [], unknown: [] };
for (const e of writes.values()) {
  if (e.verdicts.has('nonzero')) byV.nonzero.push(e.at);
  else if (e.verdicts.has('zero') && e.verdicts.size === 1) byV.zero.push(e.at);
  else byV.unknown.push(e.at);
}
console.log(`WRITERS-TOTAL ${writes.size}`);
console.log(`WRITERS-NONZERO ${byV.nonzero.length} ` + byV.nonzero.map(hex).join(' '));
console.log(`WRITERS-ZERO ${byV.zero.length} ` + byV.zero.map(hex).join(' '));
console.log(`WRITERS-UNKNOWN ${byV.unknown.length} ` + byV.unknown.map(hex).join(' '));
console.log(`ESCAPES ${escapes.length}`);
for (const e of escapes) console.log(`ESCAPE site=${hex(e.site)} at=${hex(e.at)} ${e.how}`);
for (const e of dynamics) console.log(`DYNAMIC site=${hex(e.site)} at=${hex(e.at)} L=${e.L} kind=${e.kind || ''}`);
for (const e of opaques) console.log(`OPAQUE site=${hex(e.site)} at=${hex(e.at)} w=${hex(e.w)}`);
console.log('DONE');
