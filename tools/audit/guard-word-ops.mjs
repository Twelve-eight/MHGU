// want-guardwriters.mjs — independent write census for em[0x1408] with bit-7 verdicts.
// Read-only on the image; writes only its own output under G:/tmp/EMC.
// vaddr = flat - 0x100 (same convention as the MHGU RE devices).
import fs from 'node:fs';
import crypto from 'node:crypto';
import { decode as armDecode } from '../mhgu/arm32.mjs';

const IMG = process.env.MHGU_IMAGE || 'G:/omp works/MHGU-private/main.140.flat.bin';
const ALT = 'G:/omp works/MHGU/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => { const o = v + 0x100; if (o < 0 || o + 4 > buf.length) return 0; return buf.readUInt32LE(o) >>> 0; };
const hex = (n) => '0x' + (n >>> 0).toString(16);
const RD = (w) => (w >>> 12) & 15, RN = (w) => (w >>> 16) & 15, RM = (w) => w & 15;

// ---------- structured decoders ----------
const rotImm = (i8, rot) => { const r = rot * 2; return r ? (((i8 >>> r) | (i8 << (32 - r))) >>> 0) : (i8 >>> 0); };
function movw(w) { return (w & 0x0ff00000) === 0x03000000 ? { d: RD(w), v: (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0 } : null; }
function movt(w) { return (w & 0x0ff00000) === 0x03400000 ? { d: RD(w), v: (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0 } : null; }
function dpImm(w) {
  if ((w & 0x0e000000) !== 0x02000000) return null;
  return { op: (w >>> 21) & 15, s: (w >>> 20) & 1, n: RN(w), d: RD(w), imm: rotImm(w & 0xff, (w >>> 8) & 15) };
}
function dpReg(w) {
  if ((w & 0x0e000000) !== 0) return null;
  if ((w & 0x10) !== 0) return null;               // bit4 must be 0, else multiply/misc/extra
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
    if ((w & 0x10) !== 0) return { k: 'media', d: RD(w), n, rm: RM(w), w };   // bit4=1: media/extend, not memory
    return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, rm: RM(w), st: (w >>> 5) & 3, sh: (w >>> 7) & 0x1f };
  }
  return { k: 'sdt', I, P, U, B, W: Wb, L, n, t, imm: w & 0xfff };
}
function extra(w) {
  if ((w & 0x0e000000) !== 0) return null;
  if ((w & 0x02000000) !== 0) return null;          // bit25 must be 0
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
function vfp(w) {                                        // coprocessor space: touches no GPR (except sp for vpush/vpop)
  if ((w & 0x0c000000) !== 0x0c000000) return null;
  return { k: 'vfp', sp: RN(w) === 13 && (((w >>> 20) & 1) === 0 || ((w >>> 20) & 1) === 1) };
}
function misc(w) {
  if ((w & 0x0f000000) !== 0x01000000) return null;
  return { d: RD(w), n: RN(w), rm: RM(w), w };
}
const COND = (w) => (w >>> 28) & 0xf;

// ---------- tags ----------
// c = constant; i = identity(pointer to unknown object); p = pointer = base+off; w = the field word value
const isW = (t) => t && t.t === 'w';
const FIELD_OFF = (() => { const a = process.argv.find((x) => /^--offset=/.test(x)); return a ? Number(a.split('=')[1]) : 0x1408; })();
const isPtrField = (t) => t && t.t === 'p' && t.off === FIELD_OFF;
function initState() { return { regs: new Array(16).fill(null), stack: new Map(), gens: new Array(16).fill(0) }; }
function cloneState(s) { return { regs: s.regs.slice(), stack: new Map(s.stack), gens: s.gens.slice() }; }
function setReg(s, r, tag) { s.regs[r] = tag; s.gens[r] = (s.gens[r] + 1) >>> 0; }
function identOf(s, r) { return `r${r}#${s.gens[r]}`; }
function tagIdent(s, r) { const t = s.regs[r]; if (t && t.t === 'i') return t.id; if (t && t.t === 'p') return t.base; return identOf(s, r); }
function op2Const(s, w) {
  const t = s.regs[RM(w)];
  if (!t || t.t !== 'c') return null;
  let v = t.v, sh = (w >>> 7) & 0x1f, st = (w >>> 5) & 3;
  if (st === 0) return (v << sh) >>> 0;
  if (st === 1) { const q = sh || 32; return q >= 32 ? 0 : (v >>> q) >>> 0; }
  if (st === 2) { const q = sh || 32; return q >= 32 ? ((v | 0) >> 31) >>> 0 : (((v | 0) >> q) >>> 0); }
  const q = sh || 0; return ((v >>> q) | (v << (32 - q))) >>> 0;
}
function applyMask(b7, op, mask) {
  const bit = (mask & 0x80) !== 0;
  if (op === 12) return bit ? 'set' : b7;      // ORR
  if (op === 14) return bit ? 'clear' : b7;    // BIC
  if (op === 0) return bit ? b7 : 'clear';     // AND
  if (op === 1) return bit ? 'unk' : b7;       // EOR
  return b7;
}
function mergeB7(a, b) {
  const rank = { set: 3, clear: 2, unk: 1, same: 0 };
  return rank[a] >= rank[b] ? a : b;
}

// ---------- events ----------
function newSiteRun(v, reg, kind) {
  return { v, reg, kind, events: new Map(), baseIds: new Set(), flags: new Set(), steps: 0 };
}
function rec(run, ev, chain) {
  const key = `${ev.type}:${ev.at}:${ev.b7 || ''}:${ev.width || ''}`;
  if (run.events.has(key)) return;
  ev.chain = chain.slice(-14).map((c) => `${hex(c.pc)}: ${c.txt}`);
  run.events.set(key, ev);
}
function addChain(chain, pc, txt) { const c = chain.slice(); c.push({ pc, txt }); return c; }

// ---------- address helper ----------
function effAddr(s, baseReg, offConst) {
  if (offConst === null || offConst === undefined) return null;
  const t = s.regs[baseReg];
  if (t && t.t === 'p') return { base: t.base, off: (t.off + offConst) >>> 0, reg: baseReg };
  if (t && t.t === 'i') return { base: t.id, off: offConst >>> 0, reg: baseReg };
  if (t && t.t === 'c') return { base: 'abs:' + hex(t.v), off: offConst >>> 0, reg: baseReg };
  return { base: identOf(s, baseReg), off: offConst >>> 0, reg: baseReg };
}
const isFieldAddr = (a) => a && a.off === FIELD_OFF;

// ---------- per-site DFS ----------
function analyzeSite(site, out) {
  const run = newSiteRun(site.v, site.reg, site.kind);
  const start = initState();
  setReg(start, site.reg, { t: 'c', v: FIELD_OFF });
  const queue = [{ pc: (site.v + 4) >>> 0, s: start, chain: [{ pc: site.v, txt: `${site.kind} r${site.reg}, #0x1408` }] }];
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

    // decode once
    const mw = movw(w), mt = movt(w), di = dpImm(w), dr = dpReg(w), bf = bitfield(w),
      sd = sdt(w), ex = extra(w), br = branch(w), bxx = bx(w), lm = ldmstm(w), vf = vfp(w), mi = misc(w);

    // helper to run an instruction effect on a state, returns {cont, jump, exit, forked}
    const exec = (st, ch) => {
      const R = (r) => st.regs[r];
      const kill = (r) => setReg(st, r, null);
      if (mw) { setReg(st, mw.d, { t: 'c', v: mw.v }); return { cont: true }; }
      if (mt) {
        const t = R(mt.d);
        if (t && t.t === 'c') setReg(st, mt.d, { t: 'c', v: ((mt.v << 16) | (t.v & 0xffff)) >>> 0 });
        else setReg(st, mt.d, null);
        return { cont: true };
      }
      if (bf) {
        const src = bf.bfc ? null : R(bf.n);
        const cur = R(bf.d);
        let nb7 = null;
        if (isW(cur)) {
          if (bf.lsb <= 7 && 7 <= bf.msb) {
            if (bf.bfc) nb7 = 'clear';
            else if (src && src.t === 'c') nb7 = ((src.v >>> (7 - bf.lsb)) & 1) ? 'set' : 'clear';
            else nb7 = 'unk';
          } else nb7 = cur.b7;
          const nw = { t: 'w', key: cur.key, b7: nb7 };
          setReg(st, bf.d, nw);
          rec(run, { type: 'bitfield', at: pc, lsb: bf.lsb, width: bf.width, bfc: bf.bfc, b7: nb7 || 'same', srcKnown: src && src.t === 'c' ? src.v : null }, ch);
        } else {
          // dest not the word; still resolve constant result
          if (src && src.t === 'c') {
            const mask = (bf.msb === 31 ? 0xffffffff : ((1 << (bf.msb + 1)) - 1)) ^ ((1 << bf.lsb) - 1);
            const v = ((src.v << bf.lsb) & mask) | (cur && cur.t === 'c' ? (cur.v & ~mask) : 0);
            setReg(st, bf.d, cur && cur.t === 'c' ? { t: 'c', v: v >>> 0 } : null);
          } else setReg(st, bf.d, null);
        }
        return { cont: true };
      }
      if (di) {
        const { op, n, d, imm } = di;
        if (op >= 8 && op <= 11) { // tests: no write
          const t = R(n);
          if (isW(t) && (imm & 0x80)) rec(run, { type: 'test', at: pc, imm, b7: 'read' }, ch);
          return { cont: true };
        }
        if (op === 13 && n === 0) { setReg(st, d, { t: 'c', v: imm }); return { cont: true }; } // MOV imm
        if (op === 15 && n === 0) { setReg(st, d, { t: 'c', v: (~imm) >>> 0 }); return { cont: true }; } // MVN imm
        const tn = (op === 13 || op === 15) ? null : R(n), td = R(d);
        if (op === 13 || op === 15) { // MOV/MVN: Rn field is 0 and not an operand
          setReg(st, d, null); return { cont: true };
        }
        if (op === 0 || op === 1 || op === 12 || op === 14) { // AND EOR ORR BIC
          if (tn && tn.t === 'c') {
            let v;
            if (op === 0) v = (tn.v & imm) >>> 0;
            else if (op === 1) v = (tn.v ^ imm) >>> 0;
            else if (op === 12) v = (tn.v | imm) >>> 0;
            else v = (tn.v & ~imm) >>> 0;
            setReg(st, d, { t: 'c', v });
            if (isW(td) && d !== n) { /* overwritten */ }
            return { cont: true };
          }
          if (isW(tn)) {
            const nb7 = applyMask(tn.b7, op, imm);
            setReg(st, d, { t: 'w', key: tn.key, b7: nb7 });
            rec(run, { type: 'op', at: pc, op, imm, b7: nb7 }, ch);
          } else if (isW(td)) {
            setReg(st, d, { t: 'w', key: td.key, b7: op === 0 || op === 14 ? td.b7 : 'unk' });
            rec(run, { type: 'op', at: pc, op, imm, b7: op === 0 || op === 14 ? td.b7 : 'unk' }, ch);
          } else setReg(st, d, null);
          return { cont: true };
        }
        // other arithmetic
        if (isW(tn) || isW(td)) {
          const key = isW(td) ? td.key : tn.key;
          setReg(st, d, { t: 'w', key, b7: 'unk' });
        } else if (tn && tn.t === 'c' && (op === 2 || op === 4) && n !== 0) {
          const v = op === 4 ? (tn.v + imm) >>> 0 : (tn.v - imm) >>> 0;
          setReg(st, d, { t: 'c', v });
        } else if ((op === 2 || op === 4) && tn && (tn.t === 'i' || tn.t === 'p')) {
          const delta = op === 4 ? imm : (-imm) >>> 0;
          if (tn.t === 'p') setReg(st, d, { t: 'p', base: tn.base, off: (tn.off + delta) >>> 0 });
          else setReg(st, d, { t: 'p', base: tn.id, off: delta });
        } else setReg(st, d, null);
        return { cont: true };
      }
      if (dr) {
        const { op, n, d, rm } = dr;
        if (op >= 8 && op <= 11) { // tests
          const t = R(n);
          if (isW(t)) rec(run, { type: 'testreg', at: pc, rm }, ch);
          return { cont: true };
        }
        if (op === 13) { // MOV reg (with shift)
          const st0 = dr.st === 0 && dr.sh === 0;
          if (st0) {
            const t = R(rm);
            if (t) setReg(st, d, { ...t });
            else setReg(st, d, n === 0 ? null : { t: 'i', id: identOf(st, rm) });
          } else setReg(st, d, null);
          return { cont: true };
        }
        if (op === 15) { setReg(st, d, null); return { cont: true }; }
        if (op === 0 || op === 1 || op === 12 || op === 14) {
          const mask = op2Const(st, w);
          const tsrc = dr.st === 0 && dr.sh === 0 ? R(rm) : null;
          if (mask !== null) {
            const tn = R(n);
            if (tn && tn.t === 'c') {
              let v; if (op === 0) v = (tn.v & mask) >>> 0; else if (op === 1) v = (tn.v ^ mask) >>> 0;
              else if (op === 12) v = (tn.v | mask) >>> 0; else v = (tn.v & ~mask) >>> 0;
              setReg(st, d, { t: 'c', v }); return { cont: true };
            }
            if (isW(tn)) {
              const nb7 = applyMask(tn.b7, op, mask);
              setReg(st, d, { t: 'w', key: tn.key, b7: nb7 });
              rec(run, { type: 'op', at: pc, op, imm: mask, b7: nb7, reg: true }, ch);
            } else if (isW(R(d))) {
              const td = R(d); const nb7 = op === 0 ? td.b7 : 'unk';
              setReg(st, d, { t: 'w', key: td.key, b7: nb7 });
              rec(run, { type: 'op', at: pc, op, imm: mask, b7: nb7, reg: true }, ch);
            } else setReg(st, d, null);
            return { cont: true };
          }
          // unknown mask
          const tn = R(n);
          if (isW(tn) && op === 12) { setReg(st, d, { t: 'w', key: tn.key, b7: 'unk' }); rec(run, { type: 'op', at: pc, op, imm: null, b7: 'unk', reg: true }, ch); }
          else if (isW(tn) && op === 1) { setReg(st, d, { t: 'w', key: tn.key, b7: 'unk' }); rec(run, { type: 'op', at: pc, op, imm: null, b7: 'unk', reg: true }, ch); }
          else if (isW(tn) && (op === 0 || op === 14)) { setReg(st, d, { t: 'w', key: tn.key, b7: tn.b7 }); rec(run, { type: 'op', at: pc, op, imm: null, b7: tn.b7, reg: true }, ch); }
          else if (isW(R(d))) { const td = R(d); const nb7 = op === 0 || op === 14 ? td.b7 : 'unk'; setReg(st, d, { t: 'w', key: td.key, b7: nb7 }); rec(run, { type: 'op', at: pc, op, imm: null, b7: nb7, reg: true }, ch); }
          else setReg(st, d, null);
          return { cont: true };
        }
        const tn = R(n), trm = R(rm);
        const m2 = op2Const(st, w);
        if (isW(tn) || isW(trm) || isW(R(d))) {
          const key = isW(R(d)) ? R(d).key : (isW(tn) ? tn.key : trm.key);
          setReg(st, d, { t: 'w', key, b7: 'unk' });
        } else if (tn && tn.t === 'c' && trm && trm.t === 'c' && (op === 2 || op === 3 || op === 4 || op === 5)) {
          const v = op === 2 ? (tn.v - trm.v) >>> 0 : op === 3 ? (trm.v - tn.v) >>> 0 : op === 4 ? (tn.v + trm.v) >>> 0 : (tn.v + trm.v + 0) >>> 0;
          setReg(st, d, { t: 'c', v });
        } else if ((op === 2 || op === 4) && m2 !== null && dr.st === 0 && dr.sh === 0 && tn && (tn.t === 'i' || tn.t === 'p')) {
          const delta = op === 4 ? m2 : (-m2) >>> 0;
          if (tn.t === 'p') setReg(st, d, { t: 'p', base: tn.base, off: (tn.off + delta) >>> 0 });
          else setReg(st, d, { t: 'p', base: tn.id, off: delta });
        } else if (op === 3 && m2 !== null && dr.st === 0 && dr.sh === 0 && trm && (trm.t === 'i' || trm.t === 'p') && tn && tn.t === 'c') {
          if (trm.t === 'p') setReg(st, d, { t: 'p', base: trm.base, off: (trm.off - tn.v) >>> 0 });
          else setReg(st, d, { t: 'p', base: trm.id, off: (-tn.v) >>> 0 });
        } else setReg(st, d, null);
        return { cont: true };
      }
      if (sd) {
        if (sd.k === 'media') {
          const t = R(sd.rm), td = R(sd.d);
          if (isW(t) || isW(td)) setReg(st, sd.d, { t: 'w', key: isW(td) ? td.key : t.key, b7: 'unk' });
          else setReg(st, sd.d, null);
          return { cont: true };
        }
        const off = sd.I ? op2Const(st, w) : sd.imm;
        if (!sd.I && off === null) { // dynamic offset
          if (isPtrField(R(sd.n))) rec(run, { type: 'dynamic', at: pc, L: sd.L }, ch);
          if (sd.L) setReg(st, sd.t, null);
          return { cont: true };
        }
        const signedOff = sd.U ? off : (-off) >>> 0;
        const a = effAddr(st, sd.n, signedOff);
        if (sd.L) {
          if (isFieldAddr(a)) { setReg(st, sd.t, { t: 'w', key: a.base, b7: 'same' }); rec(run, { type: 'read', at: pc, width: sd.B ? 1 : 4, base: a.base, reg: sd.n }, ch); }
          else if (sd.n === 15) { setReg(st, sd.t, { t: 'c', v: W((pc + 8 + (sd.U ? sd.imm : -sd.imm)) >>> 0) }); }
          else if (sd.n === 13 && st.stack.has(off)) { setReg(st, sd.t, { ...st.stack.get(off) }); }
          else setReg(st, sd.t, null);
          if (sd.W) {
            if (sd.P) setReg(st, sd.n, a ? { t: 'p', base: a.base, off: a.off } : null);
            else if (a) setReg(st, sd.n, { t: 'p', base: a.base, off: (a.off + off) >>> 0 });
          }
          return { cont: true };
        }
        // store
        const width = sd.B ? 1 : 4;
        const src = st.regs[sd.t];
        if (isFieldAddr(a)) {
          let b7 = 'unk';
          if (src && src.t === 'c') b7 = (src.v & (width === 1 ? 0x80 : 0x80)) ? 'set' : 'clear';
          else if (isW(src)) b7 = src.b7;
          rec(run, { type: 'write', at: pc, width, b7, base: a.base, reg: sd.n, srcReg: sd.t }, ch);
        } else {
          if (isPtrField(src) && sd.n !== 13) rec(run, { type: 'escape', at: pc, how: 'pointer stored to memory' }, ch);
          if (sd.n === 13) {
            const prev = st.stack.get(signedOff >>> 0);
            if (src && (isPtrField(src) || isW(src))) st.stack.set(signedOff >>> 0, { ...src });
            else st.stack.delete(signedOff >>> 0);
          }
        }
        if (sd.W) { if (sd.P) setReg(st, sd.n, a ? { t: 'p', base: a.base, off: a.off } : null); }
        return { cont: true };
      }
      if (ex) {
        const off = ex.I ? ex.imm : op2Const(st, w);
        if (off === null) {
          if (isPtrField(R(ex.n))) rec(run, { type: 'dynamic', at: pc, kind: ex.kind }, ch);
          if (ex.L) { setReg(st, ex.t, null); if (ex.kind === 'ldrd') setReg(st, (ex.t + 1) & 15, null); }
          return { cont: true };
        }
        const signedOff = ex.U ? off : (-off) >>> 0;
        const a = effAddr(st, ex.n, signedOff);
        const width = ex.kind === 'strh' || ex.kind === 'ldrh' ? 2 : ex.kind === 'strd' || ex.kind === 'ldrd' ? 8 : 1;
        if (ex.L) {
          if (isFieldAddr(a)) { setReg(st, ex.t, { t: 'w', key: a.base, b7: 'same' }); rec(run, { type: 'read', at: pc, width, base: a.base, reg: ex.n }, ch); }
          else if (ex.n === 13 && st.stack.has(off)) setReg(st, ex.t, { ...st.stack.get(off) });
          else setReg(st, ex.t, null);
          if (ex.kind === 'ldrd') setReg(st, (ex.t + 1) & 15, null);
        } else {
          const src = st.regs[ex.t];
          if (isFieldAddr(a)) {
            let b7 = 'unk';
            if (src && src.t === 'c') b7 = (src.v & 0x80) ? 'set' : 'clear';
            else if (isW(src)) b7 = src.b7;
            rec(run, { type: 'write', at: pc, width, b7, base: a.base, reg: ex.n, srcReg: ex.t }, ch);
          } else if (isPtrField(src)) rec(run, { type: 'escape', at: pc, how: 'pointer stored to memory (extra)' }, ch);
          if (ex.kind === 'strd') rec(run, { type: 'wide-store', at: pc, kind: ex.kind }, ch);
        }
        return { cont: true };
      }
      if (lm) {
        if (lm.n === 13 && !lm.L) { st.stack.clear(); }                 // push: stack shifts
        if (lm.n === 13 && lm.L) {
          for (const r of lm.regs) setReg(st, r, null);
          st.stack.clear();
          if (lm.regs.includes(15)) return { exit: true };
          return { cont: true };
        }
        if (lm.n === 13 && lm.L && lm.P && lm.U && lm.W && false) {}
        // stm/ldm on a field pointer: multi-word write/read
        const baseTag = st.regs[lm.n];
        if (isPtrField(baseTag)) {
          if (lm.L) rec(run, { type: 'read', at: pc, width: 4 * lm.regs.length, base: baseTag.base, reg: lm.n }, ch);
          else rec(run, { type: 'write', at: pc, width: 4, b7: 'unk', base: baseTag.base, reg: lm.n, multi: true }, ch);
        }
        if (lm.L) for (const r of lm.regs) setReg(st, r, null);
        if (lm.W) setReg(st, lm.n, null);
        return { cont: true };
      }
      if (br) {
        const link = br.link === 1;
        const tgt = (pc + 8 + br.off) >>> 0;
        const isCall = link || cond === 0xf;
        if (isCall) {
          for (const r of [0, 1, 2, 3, 12]) { if (isPtrField(st.regs[r])) rec(run, { type: 'escape', at: pc, how: `pointer passed to ${hex(tgt)} in r${r}` }, ch); }
          for (const r of [0, 1, 2, 3, 12, 14]) setReg(st, r, null);
          return { cont: true };
        }
        if (cond === 0xe) return { jump: tgt };
        return { fork: { target: tgt, fall: (pc + 4) >>> 0 } };
      }
      if (bxx) {
        const t = st.regs[bxx.rm];
        if (bxx.kind === 'blx') {
          if (isPtrField(t)) rec(run, { type: 'escape', at: pc, how: `address passed to blx r${bxx.rm}` }, ch);
          for (const r of [0, 1, 2, 3, 12, 14]) setReg(st, r, null);
          return { cont: true };
        }
        // bx
        if (bxx.rm === 14) return { exit: true };
        return { exit: true };
      }
      if (vf) { if (vf.sp) { st.stack.clear(); } return { cont: true }; }
      if (mi) { setReg(st, mi.d, null); return { cont: true }; }
      // unknown
      if (isW(st.regs[0]) || isW(st.regs[1]) || isW(st.regs[2]) || isW(st.regs[3]) ||
          isPtrField(st.regs[0]) || isPtrField(st.regs[1]) || isPtrField(st.regs[2]) || isPtrField(st.regs[3]) ||
          isW(st.regs[4]) || isW(st.regs[5]) || isW(st.regs[6]) || isW(st.regs[7]) ||
          isW(st.regs[8]) || isW(st.regs[9]) || isW(st.regs[10]) || isW(st.regs[11])) {
        rec(run, { type: 'opaque', at: pc, w }, ch);
      }
      for (const r of [0, 1, 2, 3, 12]) setReg(st, r, null);
      return { cont: true };
    };

    const ch = addChain(chain, pc, armDecode(w, pc));
    if (conditional) {
      // forked: not-executed path and executed path
      const s2 = cloneState(s);
      const r2 = exec(s2, ch);
      // not-executed path continues
      if (!(br && cond !== 0xe)) {
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
    // unconditional
    const r1 = exec(s, ch);
    if (r1.exit) continue;
    if (r1.jump !== undefined) { if (queue.length < MAXQ) queue.push({ pc: r1.jump, s, chain: ch }); else dropped = true; continue; }
    if (r1.fork) { queue.push({ pc: r1.fork.target, s: cloneState(s), chain: ch }); queue.push({ pc: r1.fork.fall, s: cloneState(s), chain: ch }); continue; }
    queue.push({ pc: (pc + 4) >>> 0, s, chain: ch });
  }
  if (dropped) run.flags.add('queue-cap');
  return run;
}

// ---------- main ----------
console.log('IMAGE', IMG);
console.log('SHA256', sha);
try { const alt = fs.readFileSync(ALT); console.log('ALT_SHA256', crypto.createHash('sha256').update(alt).digest('hex'), 'equal=' + (crypto.createHash('sha256').update(alt).digest('hex') === sha)); } catch (e) { console.log('ALT missing'); }

// 1) site census
const sites = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const mw = movw(w);
  if (mw && mw.v === FIELD_OFF) { sites.push({ v, reg: mw.d, kind: 'movw' }); continue; }
  const d = dpImm(w);
  if (d && d.op === 13 && d.n === 0 && d.imm === FIELD_OFF) { sites.push({ v, reg: d.d, kind: 'movimm' }); continue; }
  const ld = sdt(w);
  if (ld && ld.k === 'sdt' && ld.L && ld.n === 15) {
    const tgt = (v + 8 + (ld.U ? ld.imm : -ld.imm)) >>> 0;
    if (W(tgt) === FIELD_OFF) sites.push({ v, reg: ld.t, kind: 'ldrlit' });
  }
}
console.log(`SITES total=${sites.length} movw=${sites.filter(s => s.kind === 'movw').length} movimm=${sites.filter(s => s.kind === 'movimm').length} ldrlit=${sites.filter(s => s.kind === 'ldrlit').length}`);
const siteSet = new Set(sites.map(s => s.v));
for (const need of [0xc3d38, 0xc435c, 0xc4380, 0xc46a4, 0x82834, 0x71940, 0x761e0]) {
  console.log(`CONTROL-SITE ${hex(need)} ${siteSet.has(need) ? 'present' : 'MISSING'}`);
}

// 2) per-site DFS
const runs = [];
for (const st of sites) runs.push(analyzeSite(st, null));

// aggregate
const writes = new Map();      // at -> {width, verdicts:Set, chains}
const ops = new Map();         // at -> {op, imm, b7, site}
const bitfields = new Map();
const reads = new Map();
const escapes = [];
const dynamics = [];
const opaques = [];
const perSite = [];
for (const r of runs) {
  const evs = [...r.events.values()];
  const ws = evs.filter(e => e.type === 'write');
  const os = evs.filter(e => e.type === 'op');
  const bfs = evs.filter(e => e.type === 'bitfield');
  const rds = evs.filter(e => e.type === 'read' || e.type === 'test' || e.type === 'testreg');
  for (const e of ws) {
    if (!writes.has(e.at)) writes.set(e.at, { at: e.at, width: e.width, verdicts: new Set(), chains: [] });
    writes.get(e.at).verdicts.add(e.b7); writes.get(e.at).chains.push({ site: r.v, chain: e.chain });
  }
  for (const e of os) if (!ops.has(e.at)) ops.set(e.at, { ...e, site: r.v });
  for (const e of bfs) if (!bitfields.has(e.at)) bitfields.set(e.at, { ...e, site: r.v });
  for (const e of rds) if (!reads.has(e.at)) reads.set(e.at, { ...e, site: r.v });
  for (const e of evs) if (e.type === 'escape') escapes.push({ site: r.v, ...e });
  for (const e of evs) if (e.type === 'dynamic') dynamics.push({ site: r.v, ...e });
  for (const e of evs) if (e.type === 'opaque') opaques.push({ site: r.v, ...e });
  perSite.push({ site: r.v, reg: r.reg, kind: r.kind, writes: ws.length, ops: os.length, bfs: bfs.length, reads: rds.length, flags: [...r.flags].join(',') });
}
console.log(`RUN sites=${runs.length} writes=${writes.size} ops=${ops.size} bitfields=${bitfields.size} reads=${reads.size} escapes=${escapes.length} dynamic=${dynamics.length} opaque=${opaques.length}`);
for (const p of perSite) {
  console.log(`SITE ${hex(p.site)} ${p.kind} r${p.reg} writes=${p.writes} ops=${p.ops} bf=${p.bfs} reads=${p.reads}${p.flags ? ' flags=' + p.flags : ''}`);
}
console.log('--- ALL FIELD WRITES (deduped by store vaddr) ---');
for (const e of [...writes.values()].sort((a, b) => a.at - b.at)) {
  console.log(`WRITE ${hex(e.at)} width=${e.width} verdicts=${[...e.verdicts].join('|')} fromSites=${[...new Set(e.chains.map(c => hex(c.site)))].join(',')}`);
}
console.log('--- IMMEDIATE / REGISTER BIT-OPS ON THE FIELD WORD ---');
for (const e of [...ops.values()].sort((a, b) => a.at - b.at)) {
  console.log(`OP ${hex(e.at)} ${['and','eor','sub','rsb','add','adc','sbc','rsc','tst','teq','cmp','cmn','orr','mov','bic','mvn'][e.op]} imm=${e.imm === null ? 'dynamic' : hex(e.imm)} b7=${e.b7} site=${hex(e.site)}${e.reg ? ' reg-form' : ''}`);
}
console.log('--- BITFIELD OPS ON THE FIELD WORD ---');
for (const e of [...bitfields.values()].sort((a, b) => a.at - b.at)) {
  console.log(`BF ${hex(e.at)} ${e.bfc ? 'bfc' : 'bfi'} lsb=${e.lsb} width=${e.width} b7=${e.b7} src=${e.srcKnown === null ? 'dynamic' : hex(e.srcKnown)} site=${hex(e.site)}`);
}
console.log('--- SETTERS (bit7 := 1) ---');
const setters = [...writes.values()].filter(e => e.verdicts.has('set'));
console.log(`SETTERS count=${setters.length}`);
for (const e of setters) { console.log(`SETTER ${hex(e.at)} width=${e.width}`); for (const c of e.chains[0].chain) console.log('   ' + c); }
console.log('--- INDETERMINATE WRITES (bit7 unknown) ---');
const unk = [...writes.values()].filter(e => e.verdicts.has('unk'));
console.log(`UNK count=${unk.length}`);
for (const e of unk) { console.log(`UNKW ${hex(e.at)} width=${e.width} fromSites=${[...new Set(e.chains.map(c => hex(c.site)))].join(',')}`); for (const c of e.chains[0].chain) console.log('   ' + c); }
console.log('--- ESCAPES / DYNAMIC / OPAQUE ---');
for (const e of escapes) console.log(`ESCAPE site=${hex(e.site)} at=${hex(e.at)} ${e.how}`);
for (const e of dynamics) console.log(`DYNAMIC site=${hex(e.site)} at=${hex(e.at)} L=${e.L} kind=${e.kind || ''}`);
for (const e of opaques) console.log(`OPAQUE site=${hex(e.site)} at=${hex(e.at)} w=${hex(e.w)}`);
console.log('--- BIT7-TOUCHING IMMEDIATE OPS ONLY ---');
const b7ops = [...ops.values()].filter(e => e.imm !== null && (e.imm & 0x80));
console.log(`B7OPS count=${b7ops.length}`);
for (const e of b7ops) console.log(`B7OP ${hex(e.at)} ${['and','eor','sub','rsb','add','adc','sbc','rsc','tst','teq','cmp','cmn','orr','mov','bic','mvn'][e.op]} imm=${hex(e.imm)} b7=${e.b7} site=${hex(e.site)}`);
console.log('--- GLOBAL BITFIELD SWEEP (every bfi/bfc in .text covering bit 7) ---');
let bfTotal = 0, bfCover = 0;
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v), b = bitfield(w);
  if (!b) continue;
  bfTotal++;
  if (!(b.lsb <= 7 && 7 <= b.msb)) continue;
  bfCover++;
  // source value one hop: scan back 8 instructions for mov/movw of the source register
  let src = null, srcAt = null;
  for (let j = 1; j <= 8; j++) {
    const ww = W(v - 4 * j), m1 = movw(ww), d1 = dpImm(ww), m2 = movt(ww);
    if (m2 && m2.d === b.n) { const prior = src; if (prior && prior.hi !== undefined) { src = { v: ((m2.v << 16) | prior.hi) >>> 0 }; srcAt = v - 4 * j; } break; }
    if (m1 && m1.d === b.n) { src = { v: m1.v, hi: m1.v }; srcAt = v - 4 * j; break; }
    if (d1 && d1.d === b.n && d1.op === 13 && d1.n === 0) { src = { v: d1.imm, hi: d1.imm }; srcAt = v - 4 * j; break; }
  }
  // nearest movw 0x1408 site before this within 0x200 bytes
  let near = null;
  for (const s of sites) if (s.v < v && v - s.v < 0x400) near = s;
  console.log(`GBF ${hex(v)} ${b.bfc ? 'bfc' : 'bfi'} r${b.d},${b.bfc ? '' : 'r' + b.n + ','}#${b.lsb},#${b.width} src=${src ? hex(src.v) : 'unknown'}${srcAt ? '@' + hex(srcAt) : ''} nearSite=${near ? hex(near.v) : 'none'} text=${armDecode(W(v), v)}`);
}
console.log(`GBF total_bitfields=${bfTotal} covering_bit7=${bfCover}`);
console.log('--- ADD #0x1000 THEN STR #0x408 LANE ---');
let add1000 = 0, add1000stores = 0;
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const d = dpImm(W(v));
  if (!d || d.op !== 4 || d.imm !== 0x1000) continue;
  add1000++;
  for (let j = 1; j <= 8; j++) {
    const w2 = W(v + 4 * j), s2 = sdt(w2);
    if (s2 && s2.k === 'sdt' && !s2.L && !s2.I && s2.n === d.d && s2.imm === 0x408) { add1000stores++; console.log(`ADD1000 ${hex(v)} -> STORE ${hex(v + 4 * j)}`); }
  }
}
console.log(`ADD1000 adds=${add1000} stores_at_0x408=${add1000stores} (first stage count is the detector control)`);
console.log('--- PUBLISHED FOUR BIC SITES ---');
for (const a of [0xc3d44, 0xc4368, 0xc4388, 0xc46b4]) {
  const e = ops.get(a);
  console.log(`PUB-BIC ${hex(a)} ${e ? `found op=${e.op} imm=${hex(e.imm)} b7=${e.b7} site=${hex(e.site)}` : 'NOT FOUND'}`);
}
console.log('--- GUARD BFI 0x82984 ---');
{ const e = bitfields.get(0x82984); console.log(e ? `GUARD-BF found bfc=${e.bfc} lsb=${e.lsb} width=${e.width} b7=${e.b7} site=${hex(e.site)}` : 'GUARD-BF NOT FOUND'); }
