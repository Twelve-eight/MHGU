// Path-sensitive abstract interpreter over one (state, variant) handler.
//
// It starts at the variant's L2 case body (or at the state handler itself for compare-chain
// dispatchers), keeps a value-set per register, forks on undecidable conditional branches, expands
// `add pc, rX, rY` jump tables, and records every request into the motion-play family, the
// attack-row family and the shell spawner. `bl` targets inside the class body - and shared helpers
// that themselves reach one of those families - are walked; engine functions are opaque.
//
// Time cost: one walk is a few thousand instructions; the whole em001 class is ~1e6 steps.
import { insAt, parseMem, parseRegList, immVal, regNum } from './arm.mjs';
import { rd32, buf } from 'file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs';
import { PLAY, ARM, SHELL, STUB, inBody, isRelevantFunction } from './classinfo.mjs';

// Addressable image range (vaddr = flat offset - 0x100). Reads below MEM_LO are the null page and
// the 0x100-byte image header - a register that happens to hold 0 turns `ldrh r1,[r1,#16]` into a
// header read and invents ids (0x10 -> 45048, 364); reads above the image are out of the file.
// Jump tables and literal pools live *inside* .text, so the floor must not be TEXT_END.
const MEM_LO = 0x1000;
const MEM_HI = buf.length - 0x100;

const PLAY_SET = new Set(Object.keys(PLAY).map(Number));
const ARM_SET = new Set(Object.keys(ARM).map(Number));
const STUB_SET = new Set(Object.keys(STUB).map(Number));

// ---- values ---------------------------------------------------------------------------------
const C = (v) => ({ k: 'c', v: v >>> 0 });
const U = (why) => ({ k: 'u', why });
const UNDEF = U('undef');

function vkey(v) {
  switch (v.k) {
    case 'c': return 'c' + v.v;
    case 'u': return 'u' + (v.why ?? '');
    case 'tw': return 't' + v.base;
    case 'rd': return 'r' + v.base + ':' + v.stride + ':' + (v.idx?.k === 'c' ? v.idx.v : '?');
    case 'mk': return 'm' + v.lo;
    default: return '?';
  }
}

function setOf(...vals) { return vals; }
function uniq(vals, cap = 6) {
  const out = [];
  const seen = new Set();
  for (const v of vals) {
    const k = vkey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= cap) break;
  }
  return out.length ? out : [UNDEF];
}

const REG_NAMES = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'sp', 'lr', 'pc'];

// ---- machine state --------------------------------------------------------------------------
export function newState(regs = {}) {
  const st = { regs: Array.from({ length: 16 }, () => [UNDEF]), flag: null };
  for (const [k, v] of Object.entries(regs)) st.regs[regNum(k)] = [C(v)];
  return st;
}

function cloneState(st) {
  return { regs: st.regs.map(a => a.slice()), flag: st.flag };
}

const _sigCache = new WeakMap();
function setSig(arr) {
  let s = _sigCache.get(arr);
  if (s === undefined) { s = arr.map(vkey).join(','); _sigCache.set(arr, s); }
  return s;
}
function sig(st) {
  let s = '';
  for (let i = 0; i < 13; i++) s += i + ':' + setSig(st.regs[i]) + ';';
  return s;
}

function getConst(st, r) {
  const set = st.regs[r];
  if (!set || set.length !== 1) return null;
  const v = set[0];
  return v.k === 'c' ? v.v : null;
}

function valSet(st, r) { return st.regs[r] ?? [UNDEF]; }
// movw materialises the low half; a following movt may set the high half. Any other consumer sees the
// value as the constant (high half zero) - without this, a conditional movw of 1 followed by a shift
// stayed opaque and every table read indexed by that register was dropped (em060 0xf195e0 / 0xf19cd4).
function normVal(v) { return v.k === 'mk' ? { k: 'c', v: v.lo >>> 0, gate: v.gate } : v; }
function normSet(vals) { return vals.map(normVal); }

// Evaluate an ALU operand ("r4", "#0x10", "r1, lsl #2" style second operand) to a value set.
function opVal(st, op) {
  const parts = op.split(',').map(x => x.trim());
  const r = regNum(parts[0]);
  if (r >= 0) {
    let vals = normSet(valSet(st, r));
    if (parts[1]) {
      const sh = /^(lsl|lsr|asr|ror)\s+/.exec(parts[1]);
      const amt = parts[1].split(/\s+/)[1] ?? '';
      let n = immVal(amt);
      if (n === null) { const rr = regNum(amt); if (rr >= 0) n = getConst(st, rr); }
      const shiftKind = sh ? sh[1] : null;
      if (shiftKind && n !== null) {
        vals = vals.map(v => {
          if (v.k !== 'c') return v;
          let x = v.v;
          if (shiftKind === 'lsl') x = (x << n) >>> 0;
          else if (shiftKind === 'lsr') x = (x >>> n) >>> 0;
          else if (shiftKind === 'asr') x = (x | 0) >> n;
          else if (shiftKind === 'ror') x = ((x >>> n) | (x << (32 - n))) >>> 0;
          return C(x);
        });
      } else {
        vals = [U('shifted')];
      }
    }
    return vals;
  }
  const iv = immVal(parts[0]);
  if (iv !== null) return [C(iv)];
  return [U('operand')];
}

function fold2(a, b, fn) {
  const out = [];
  for (const x of a) for (const y of b) {
    if (x.k === 'c' && y.k === 'c') out.push(fn(x.v, y.v));
    else out.push(U('alu'));
  }
  return uniq(out);
}

function readWord(addr) {
  try { return rd32(addr >>> 0); } catch { return null; }
}

// ---- flags / conditions ---------------------------------------------------------------------
function cmpRels(st, a, b) {
  const sgn = new Set(), uns = new Set();
  for (const x of a) {
    for (const y of b) {
      if (x.k !== 'c' || y.k !== 'c') return null;
      const xs = x.v | 0, ys = y.v | 0;
      const xu = x.v >>> 0, yu = y.v >>> 0;
      sgn.add(xs === ys ? 'eq' : xs < ys ? 'lt' : 'gt');
      uns.add(xu === yu ? 'eq' : xu < yu ? 'lo' : 'hi');
    }
  }
  return { sgn, uns };
}

// true / false / null for a condition given the possible relations of the last cmp.
// Signed conditions read the signed relation set, unsigned ones the unsigned set; a pair of
// constants gives one definite answer per interpretation (0xFFFFFFFE vs 10 is signed-lt AND
// unsigned-hi, so mixing the two sets - the bug this replaces - forks a decided branch).
function condValue(cond, rel) {
  if (!rel) return null;
  const set = ['hi', 'ls', 'cs', 'cc'].includes(cond) ? rel.uns : rel.sgn;
  const ev = (r) => {
    switch (cond) {
      case 'eq': return r === 'eq';
      case 'ne': return r !== 'eq';
      case 'lt': return r === 'lt';
      case 'le': return r === 'lt' || r === 'eq';
      case 'gt': return r === 'gt';
      case 'ge': return r === 'gt' || r === 'eq';
      case 'hi': return r === 'hi';
      case 'ls': return r === 'lo' || r === 'eq';
      case 'cs': return r === 'hi' || r === 'eq';
      case 'cc': return r === 'lo';
      case 'mi': return false;
      case 'pl': return true;
      case 'vs': return false;
      case 'vc': return true;
      default: return null;
    }
  };
  const vals = new Set([...set].map(ev));
  if (vals.size === 1) return [...vals][0];
  return null;
}

// ---- jump-table expansion -------------------------------------------------------------------
// At `add pc, rX, rY`: resolve targets. When rX is not concrete, look back for the table idiom
// (`add rY,pc,#imm` + `ldr rX,[rX,rY]`) and the guard `cmp rI,#max` that bounds the index; then
// enumerate every word of the table.
function jumpTargets(pc, st, aReg, bReg) {
  const base = getConst(st, bReg);
  const avals = valSet(st, aReg);
  const out = [];
  const concrete = avals.every(v => v.k === 'c');
  if (base !== null && concrete) {
    for (const v of avals) out.push({ target: (base + v.v) >>> 0, idx: null });
    return out;
  }
  if (base === null) return null;
  // table idiom lookback: `add rY,pc,#imm` gives the base, the `ldr rX,[rX,rY]` the word, and the
  // nearest preceding `cmp rI,#max` the entry count.
  let tbl = null;
  let count = null;
  for (let k = 1; k <= 10; k++) {
    const x = insAt(pc - 4 * k);
    if (!x) break;
    if (tbl === null && x.mn === 'add' && regNum(x.ops[1]) === 15) {
      const off = immVal(x.ops[2]);
      if (off !== null && regNum(x.ops[0]) === bReg) { tbl = (x.addr + 8 + off) >>> 0; continue; }
    }
    if (tbl === null && x.mn === 'ldr' && x.ops.length === 2) {
      const mm = parseMem(x.ops[1]);
      if (mm && mm.idx === bReg && mm.off === null) continue;
    }
    if (x.mn === 'cmp' && x.ops.length === 2) {
      const m = immVal(x.ops[1]);
      if (m !== null && count === null) count = m + 1;
      break;
    }
  }
  if (tbl === null || count === null || count > 512) return null;
  for (let i = 0; i < count; i++) {
    const w = readWord(tbl + i * 4);
    if (w === null) break;
    out.push({ target: (base + w) >>> 0, idx: i });
  }
  return out;
}

// ---- the walk -------------------------------------------------------------------------------
// events: {t:'motion', id, gate, site, src} | {t:'arm', row, kind, gate, site}
//         {t:'shell', site, arg} | {t:'stub', site} | {t:'unres', site, why} | {t:'escaped', site, to}
export function walk({ start, klass, state, variant, maxSteps = 200000, maxDepth = 6, events, trace = null, initState = null, depth0 = 0 }) {
  const st0 = initState ? cloneState(initState) : newState({ r0: undefined });
  if (!initState) {
    // r0 = em: unknown but distinct
    st0.regs[0] = [U('em')];
    st0.regs[4] = [U('r4')];
  }
  const work = [{ pc: start, st: st0, depth: depth0 }];
  const seen = new Set();
  let steps = 0;
  let overflow = false;
  while (work.length) {
    let { pc, st, depth } = work.pop();
    if (depth > maxDepth) continue;
    if (work.length > 4000) { events.push({ t: 'unres', site: pc, why: 'work-cap' }); continue; }
    for (;;) {
      if (++steps > maxSteps) { overflow = true; break; }
      const key = pc + '|' + depth + '|' + sig(st);
      if (seen.has(key)) break;
      seen.add(key);
      const ins = insAt(pc);
      if (trace) trace.push(pc);
      if (!ins) { events.push({ t: 'escaped', site: pc, to: null }); break; }
      const r = exec(ins, st, { klass, state, variant, depth, events, work, trace });
      if (r.stop) break;
      if (r.fork) break;
      pc = r.next;
      if (pc === null) break;
    }
  }
  return { steps, overflow };
}

function writeReg(st, r, vals) { if (r >= 0 && r < 16) st.regs[r] = uniq(vals); }

function condGate(st, cond) {
  const f = st.flag;
  return `${cond}(${f ? f.text : '?'})`;
}

function setFlag(st, ins, aSet, bSet) {
  st.flag = { lhs: aSet, rhs: bSet, text: ins.text };
}

function exec(ins, st, ctx) {
  const { events } = ctx;
  const ops = ins.ops;
  const cond = ins.cond;
  // evaluate a conditional instruction: true -> run, false -> skip, null -> fork/union
  let condRes = true;
  if (cond) {
    condRes = st.flag ? condValue(cond, cmpRels(st, st.flag.lhs, st.flag.rhs)) : null;
  }
  const skip = () => ({ next: ins.addr + 4 });

  switch (ins.mn) {
    case 'nop': case 'pld': case 'pldw': case 'svc': case 'dmb': case 'dsb': case 'isb': case 'wfi': case 'wfe':
      return skip();
    case 'push': case 'vpush': case 'stm': case 'vstm': case 'str': case 'strb': case 'strh': case 'strd':
      return skip();
    case 'vldr': case 'vstr': case 'vmov': case 'vadd': case 'vsub': case 'vmul': case 'vdiv': case 'vcmp':
    case 'vcvt': case 'vmrs': case 'vmsr': case 'vldm': case 'vneg': case 'vabs': case 'vsqrt': case 'vmax':
    case 'vmin': case 'vmla': case 'vmls':
      // VFP compare / APSR transfer rewrites the integer condition flags in a way this walker does
      // not model: invalidate them so the next conditional branch forks instead of trusting stale bits.
      if (ins.mn === 'vcmp' || ins.mn === 'vmrs') st.flag = null;
      return skip();
    case 'movw': case 'movt': {
      const rd = regNum(ops[0]);
      const imm = immVal(ops[1]);
      if (rd < 0 || imm === null) return skip();
      if (condRes === false) return skip();
      if (ins.mn === 'movw') {
        const nv = { k: 'mk', lo: imm & 0xffff, gate: condRes === null ? condGate(st, cond) : undefined };
        writeReg(st, rd, condRes === null ? [...valSet(st, rd), nv] : [nv]);
      } else {
        const cur = valSet(st, rd);
        const vals = cur.map(v => C(((imm & 0xffff) << 16) | (v.k === 'mk' ? v.lo : 0)));
        writeReg(st, rd, condRes === null ? [...cur, ...vals] : vals);
      }
      return skip();
    }
    case 'mov': case 'mvn': {
      const rd = regNum(ops[0]);
      if (rd < 0) return skip();
      if (condRes === false) return skip();
      let vals;
      if (ops.length === 1) vals = valSet(st, rd); // mov rX, rX with shift handled below
      else if (rd === 15) {
        // mov pc, rX -> indirect jump
        events.push({ t: 'indirect', site: ins.addr, via: 'mov pc' });
        return { stop: true };
      } else vals = opVal(st, ops.slice(1).join(', '));
      if (ins.mn === 'mvn') vals = vals.map(v => v.k === 'c' ? C(~v.v >>> 0) : U('mvn'));
      if (condRes === null) {
        const g = condGate(st, cond);
        vals = [...valSet(st, rd), ...vals.map(v => ({ ...v, gate: g }))];
      }
      writeReg(st, rd, vals);
      return skip();
    }
    case 'add': case 'sub': case 'rsb': case 'and': case 'orr': case 'eor': case 'bic': case 'adc':
    case 'sbc': case 'mul': case 'lsl': case 'lsr': case 'asr': case 'ror': {
      if (condRes === false) return skip();
      const rd = regNum(ops[0]);
      if (rd === 15) {
        // add pc, rX, rY -> jump table
        if (ins.mn !== 'add' || ops.length !== 3) { events.push({ t: 'indirect', site: ins.addr, via: 'pc alu' }); return { stop: true }; }
        if (condRes === null) {
          // conditional pc write: both the branch and the fallthrough
          const tg = jumpTargets(ins.addr, st, regNum(ops[1]), regNum(ops[2]));
          if (tg) for (const x of tg) if (x.target >= 0x100) ctx.work.push({ pc: x.target, st: cloneState(st), depth: ctx.depth });
          return skip();
        }
        const tg = jumpTargets(ins.addr, st, regNum(ops[1]), regNum(ops[2]));
        if (!tg) { events.push({ t: 'indirect', site: ins.addr, via: 'add pc unknown' }); return { stop: true }; }
        if (tg.length === 1) return { next: tg[0].target };
        for (let i = 1; i < tg.length; i++) {
          ctx.work.push({ pc: tg[i].target, st: cloneState(st), depth: ctx.depth, tblIdx: tg[i].idx });
        }
        return { next: tg[0].target };
      }
      if (rd < 0) return skip();
      const rn = regNum(ops[1]);
      const a = rn >= 0 ? normSet(valSet(st, rn)) : [U('op1')];
      const b = opVal(st, ops.slice(2).join(', '));
      const fn = {
        add: (x, y) => C((x + y) >>> 0), sub: (x, y) => C((x - y) >>> 0), rsb: (x, y) => C((y - x) >>> 0),
        and: (x, y) => C((x & y) >>> 0), orr: (x, y) => C((x | y) >>> 0), eor: (x, y) => C((x ^ y) >>> 0),
        bic: (x, y) => C((x & ~y) >>> 0), adc: (x, y) => C((x + y) >>> 0), sbc: (x, y) => C((x - y) >>> 0),
        mul: (x, y) => C(Math.imul(x | 0, y | 0) >>> 0),
        lsl: (x, y) => C((x << (y & 31)) >>> 0), lsr: (x, y) => C((x >>> (y & 31)) >>> 0),
        asr: (x, y) => C((x | 0) >> (y & 31)), ror: (x, y) => C(((x >>> (y & 31)) | (x << (32 - (y & 31)))) >>> 0),
      }[ins.mn];
      let vals;
      if (ins.mn === 'add' && ops.length >= 3 && regNum(ops[1]) === 15) {
        // add rD, pc, #imm  (adr) or add rD, pc, rX (pc-delta literal idiom)
        const other = opVal(st, ops.slice(2).join(', '));
        vals = uniq(other.map(v => (v.k === 'c' ? C((ins.addr + 8 + v.v) >>> 0) : U('pc+reg'))));
      } else if (ins.mn === 'add' && ops.length === 3 && regNum(ops[1]) >= 0 && !ops[2].startsWith('#')) {
        vals = fold2(valSet(st, regNum(ops[1])), opVal(st, ops.slice(2).join(', ')), fn);
      } else {
        vals = fold2(a, b, fn);
      }
      if (condRes === null) vals = [...valSet(st, rd), ...vals.map(v => ({ ...v, gate: condGate(st, cond) }))];
      writeReg(st, rd, vals);
      return skip();
    }
    case 'cmp': case 'cmn': case 'tst': case 'teq': {
      if (condRes === false) return skip();
      // a conditionally executed flag-setter leaves the flags ambiguous: force the next branch to fork
      if (condRes === null) { st.flag = null; return skip(); }
      const a = valSet(st, regNum(ops[0]));
      const b = opVal(st, ops.slice(1).join(', '));
      if (ins.mn === 'cmn') {
        const sumv = fold2(a, b, (x, y) => C((x + y) >>> 0));
        setFlag(st, ins, sumv, [C(0)]);
      } else if (ins.mn === 'tst' || ins.mn === 'teq') {
        // Z flag: fold (a & b) / (a ^ b) against 0 so cond eq/ne decide directly
        const fn = ins.mn === 'tst' ? (x, y) => x & y : (x, y) => x ^ y;
        const andv = fold2(a, b, (x, y) => C(fn(x, y) >>> 0));
        setFlag(st, ins, andv, [C(0)]);
      } else {
        setFlag(st, ins, a, b);
      }
      return skip();
    }
    case 'uxth': case 'uxtb': case 'sxth': case 'sxtb': {
      const rd = regNum(ops[0]);
      if (rd < 0) return skip();
      if (condRes === false) return skip();
      const vals = opVal(st, ops.slice(1).join(', ')).map(v => {
        if (v.k !== 'c') return v;
        const x = v.v;
        if (ins.mn === 'uxth') return C(x & 0xffff);
        if (ins.mn === 'uxtb') return C(x & 0xff);
        if (ins.mn === 'sxth') return C((x << 16) >> 16);
        return C((x << 24) >> 24);
      });
      writeReg(st, rd, condRes === null ? [...valSet(st, rd), ...vals.map(v => ({ ...v, gate: condGate(st, cond) }))] : vals);
      return skip();
    }
    case 'ldr': case 'ldrb': case 'ldrh': case 'ldrsb': case 'ldrsh': case 'ldrd': case 'ldrex': {
      if (condRes === false) return skip();
      const rd = regNum(ops[0]);
      if (rd === 15) {
        const mm = parseMem(ops[1]);
        if (mm && mm.off !== null) {
          const t = readWord(ins.addr + 8 + mm.off);
          if (t !== null) return { next: t >>> 0 };
        }
        events.push({ t: 'indirect', site: ins.addr, via: 'ldr pc' });
        return { stop: true };
      }
      if (rd < 0) return skip();
      const mm = parseMem(ops[1]);
      if (!mm) return skip();
      const baseC = getConst(st, mm.base);
      // 0x73E0 / 0x73E1 seeds: the L1 state and L2 variant bytes are known for this walk
      const idxC = mm.idx !== null ? getConst(st, mm.idx) : null;
      const offOrIdx = mm.idx !== null ? idxC : mm.off;
      if (offOrIdx === 0x73e0 && ins.mn === 'ldrb') { writeReg(st, rd, [C(ctx.state)]); return skip(); }
      if (offOrIdx === 0x73e1 && ins.mn === 'ldrb') { writeReg(st, rd, [C(ctx.variant)]); return skip(); }
      // A register set can hold several constant addresses (conditional movw/mov + a sum); read *all*
      // of them and keep every value, because the play site needs each candidate (em060 7:114: base
      // 0x16a6504 + 2*r6 with r6 in {0,1} -> halfwords +0x20/+0x22 = 534/524). When the index register
      // is not constant at all but the base is a constant *data* address, enumerate the index 0..3 and
      // keep the plausible halfword/word motion ids (the 0/1 selector shape; tagged via src so the
      // enumeration is visible downstream).
      const truncate = (w) => {
        if (ins.mn === 'ldrb') return w & 0xff;
        if (ins.mn === 'ldrh') return w & 0xffff;
        if (ins.mn === 'ldrsb') return (w << 24) >> 24;
        if (ins.mn === 'ldrsh') return (w << 16) >> 16;
        return w;
      };
      const baseSet = normSet(valSet(st, mm.base)).filter(v => v.k === 'c').slice(0, 4);
      const idxSet = mm.idx !== null ? normSet(valSet(st, mm.idx)) : null;
      const idxConsts = idxSet ? idxSet.filter(v => v.k === 'c').slice(0, 4) : null;
      const stride = 1 << (typeof mm.shift === 'number' ? mm.shift : 0);
      let vals = null;
      // Only the loaded image is addressable data: a register-held "constant" below MEM_LO is the
      // null page / image header (a zero base -> ldrh [0x10] invents 45048 and 364), not a table.
      const readOne = (addr, gate, tag = 'tbl') => {
        if (!(addr >= MEM_LO && addr + 4 <= MEM_HI)) return null;
        const w = readWord(addr);
        if (w === null) return null;
        const out = C(truncate(w));
        if (gate) out.gate = gate;
        out.why = tag + ':0x' + (addr >>> 0).toString(16);
        return out;
      };
      if (mm.base === 15 && mm.off !== null) {
        const w = readWord(ins.addr + 8 + mm.off);
        if (w !== null) vals = [C(w)];
      } else if (mm.off !== null && baseSet.length) {
        const rs = [];
        for (const b of baseSet) { const r = readOne(b.v + mm.off, b.gate); if (r) rs.push(r); }
        if (rs.length) vals = rs;
      } else if (mm.idx !== null && baseSet.length && idxConsts && idxConsts.length) {
        const rs = [];
        for (const b of baseSet) for (const i of idxConsts) { const r = readOne(b.v + i.v * stride, i.gate ?? b.gate); if (r) rs.push(r); }
        if (rs.length) vals = rs;
        if (mm.writeback) writeReg(st, mm.base, [C((baseSet[0].v + idxConsts[0].v * stride) >>> 0)]);
      } else if (mm.idx !== null && baseSet.length) {
        vals = [{ k: 'rd', base: baseSet[0].v, stride, idx: valSet(st, mm.idx)[0] }];
      }
      if (vals === null) vals = [U('mem')];
      if (condRes === null) vals = [...valSet(st, rd), ...vals.map(v => ({ ...v, gate: condGate(st, cond) }))];
      writeReg(st, rd, vals);
      return skip();
    }
    case 'pop': case 'ldm': {
      const list = parseRegList(ops[0]) ?? [];
      if (condRes === false) return skip();
      // a conditional return (pop<cond> {...,pc}) ends the path only when taken
      if (list.includes(15)) {
        if (condRes === null) {
          // not-taken path: nothing is popped, registers keep their values
          ctx.work.push({ pc: ins.addr + 4, st: cloneState(st), depth: ctx.depth });
        }
        return { stop: true };
      }
      for (const r of list) if (r < 13) writeReg(st, r, [U('popped')]);
      if (!list.includes(14)) writeReg(st, 14, [U('lr')]);
      return skip();
    }
    case 'bx': case 'blx': {
      if (condRes === false) return skip();
      const r = regNum(ops[0]);
      if (r < 0) { events.push({ t: 'indirect', site: ins.addr, via: ins.mn }); return { stop: true }; }
      // bx lr / conditionless return
      if (r === 14) return { stop: true };
      const c = getConst(st, r);
      if (c !== null) {
        if (STUB_SET.has(c)) { events.push({ t: 'stub', site: ins.addr }); return { stop: true }; }
        if (PLAY_SET.has(c) || ARM_SET.has(c)) return { stop: true };
        if (inBody(ctx.klass, c) || isRelevantFunction(c)) {
          if (ins.mn === 'blx' && ctx.depth < 5) {
            walk({ start: c, klass: ctx.klass, state: ctx.state, variant: ctx.variant, events, maxDepth: 3, initState: st, depth0: ctx.depth + 1 });
            clobber(st);
            return skip();
          }
          return { next: c };
        }
      }
      events.push({ t: 'indirect', site: ins.addr, via: ins.mn });
      // blx rN is a *call*: it returns, so keep walking with a clobbered argument set.
      // bx rN is a dispatch/return: the path ends here.
      if (ins.mn === 'blx') { clobber(st); return skip(); }
      return { stop: true };
    }
    case 'b': {
      const t = parseInt(ops[0], 16);
      if (cond === '') {
        if (PLAY_SET.has(t)) { recordMotion(t, ins.addr, st, ctx); return { stop: true }; }
        if (ARM_SET.has(t)) { recordArm(t, ins.addr, st, ctx); return { stop: true }; }
        if (t === SHELL) { recordShell(ins.addr, st, ctx); return { stop: true }; }
        if (STUB_SET.has(t)) { events.push({ t: 'stub', site: ins.addr }); return { stop: true }; }
        if (inBody(ctx.klass, t) || isRelevantFunction(t)) return { next: t };
        events.push({ t: 'escaped', site: ins.addr, to: t });
        return { stop: true };
      }
      // conditional branch
      if (condRes === true) return { next: t };
      if (condRes === false) return skip();
      ctx.work.push({ pc: t, st: cloneState(st), depth: ctx.depth, gate: condGate(st, cond) });
      return skip();
    }
    case 'bl': {
      const t = parseInt(ops[0], 16);
      if (condRes === false) return skip();
      if (PLAY_SET.has(t)) { recordMotion(t, ins.addr, st, ctx); clobber(st); return skip(); }
      if (ARM_SET.has(t)) { recordArm(t, ins.addr, st, ctx); clobber(st); return skip(); }
      if (t === SHELL) { recordShell(ins.addr, st, ctx); clobber(st); return skip(); }
      if (STUB_SET.has(t)) { events.push({ t: 'stub', site: ins.addr }); clobber(st); return skip(); }
      if (condRes === null) {
        // both outcomes: call happens or not; registers clobber either way
        ctx.work.push({ pc: t, st: cloneState(st), depth: ctx.depth + 1 });
        clobber(st);
        return skip();
      }
      if (inBody(ctx.klass, t) || isRelevantFunction(t)) {
        if (!inBody(ctx.klass, t)) events.push({ t: 'follow', site: ins.addr, to: t });
        if (ctx.depth < 5) {
          walk({ start: t, klass: ctx.klass, state: ctx.state, variant: ctx.variant, events, maxDepth: 3, initState: st, depth0: ctx.depth + 1 });
        } else {
          ctx.work.push({ pc: t, st: cloneState(st), depth: ctx.depth + 1, callee: true });
        }
        clobber(st);
        return skip();
      }
      clobber(st);
      return skip();
    }
    default:
      // unknown/failed decode: it may set flags, so do not let a later branch trust the last cmp
      st.flag = null;
      return skip();
  }
}

function clobber(st) {
  for (const r of [0, 1, 2, 3, 12]) st.regs[r] = [U('call')];
}

function recordMotion(fn, site, st, ctx) {
  const { events, trace } = ctx;
  const at = trace ? trace.length : 0;
  const vals = valSet(st, 1);
  for (const v of vals) {
    const id = resolveValue(v);
    events.push({ t: 'motion', id, gate: v.gate ?? '', site, fn, src: v.why ?? v.k, at });
  }
  if (!vals.length) events.push({ t: 'unres', site, why: 'r1 empty' });
}

function recordArm(fn, site, st, ctx) {
  const { events, trace } = ctx;
  const at = trace ? trace.length : 0;
  const kinds = valSet(st, 1);
  const rows = valSet(st, 2);
  for (const k of kinds) for (const r of rows) {
    events.push({
      t: 'arm', kind: resolveValue(k), row: resolveValue(r),
      gate: r.gate ?? k.gate ?? '', site, fn, at,
    });
  }
}

function recordShell(site, st, ctx) {
  const { events } = ctx;
  const ids = valSet(st, 1).map(resolveValue);
  const r2 = valSet(st, 2).map(resolveValue);
  events.push({ t: 'shell', site, id: ids, arg: r2 });
}

function resolveValue(v) {
  if (v.k === 'c') return v.v;
  if (v.k === 'mk') return v.lo;
  return null;
}

export { C as constValue, UNDEF };
