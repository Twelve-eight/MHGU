// Symbolic field scanner for MHGU member readers (v3).
// reg -> {t:'k'|'i'|'c'|'s'|'u',n} ; k = member obj base, c = ctx, s = sp scratch, i = imm
import fs from 'node:fs';

const FLAT = process.env.FLAT || 'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
const FL = fs.readFileSync(FLAT);
export const rd32 = v => FL.readUInt32LE(v + 0x100);

const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];
const U = { t: 'u' };
const TGT = { 0x3df2a8: 'read', 0x3df378: 'write', 0x3df1b8: 'bitcap', 0x3df22c: 'bitread' };

function ex(v) {
  if (!v) return '?';
  if (v.t === 'k') return `obj+0x${(v.n >>> 0).toString(16)}`;
  if (v.t === 'i') return `0x${(v.n >>> 0).toString(16)}`;
  if (v.t === 'c') return `ctx+0x${(v.n >>> 0).toString(16)}`;
  if (v.t === 's') return v.n >= 0 ? `sp+0x${v.n.toString(16)}` : `sp-0x${(-v.n).toString(16)}`;
  if (v.t === 'n') return `${v.n}bits`;
  return '?';
}

export function scan(vaddr, opts = {}) {
  const maxInstr = opts.maxInstr || 4000;
  const regs = {};
  regs.r0 = { t: 'k', n: 0 }; regs.r1 = { t: 'c', n: 0 };
  regs.r5 = { t: 'k', n: 0 }; regs.r4 = { t: 'c', n: 0 }; regs.sp = { t: 's', n: 0 };
  const ev = [], loops = [], adds = [], mem = {}, snap = {};
  let end = vaddr, lastCmp = null;
  const set = (r, v) => { if (r >= 0 && r < 16) regs[R[r]] = v; };
  const get = r => regs[R[r]] || U;
  const addv = (a, b) => {
    if (a.t === 'i' && b.t === 'i') return { t: 'i', n: (a.n + b.n) | 0 };
    if ((a.t === 'k' || a.t === 'c' || a.t === 's') && b.t === 'i') return { t: a.t, n: a.n + b.n };
    if (a.t === 'i' && (b.t === 'k' || b.t === 'c' || b.t === 's')) return { t: b.t, n: a.n + b.n };
    return U;
  };
  const subv = (a, b) => {
    if (a.t === 'i' && b.t === 'i') return { t: 'i', n: (a.n - b.n) | 0 };
    if ((a.t === 'k' || a.t === 'c' || a.t === 's') && b.t === 'i') return { t: a.t, n: a.n - b.n };
    return U;
  };

  for (let i = 0, a = vaddr; i < maxInstr; i++, a += 4) {
    const w = rd32(a);
    const cond = w >>> 28;
    { const sm = {}; for (const r in regs) if (regs[r].t === 'i') sm[r] = regs[r].n; snap[a] = sm; }
    end = a + 4;
    const op26 = (w >>> 26) & 3;

    if ((w & 0x0FFFFFFF) === 0x012FFF1E) { ev.push({ a, kind: 'bx' }); break; }
    if ((w >>> 16) === 0xE8BD && (w & 0x8000)) { ev.push({ a, kind: 'ret' }); break; }
    if ((w >>> 16) === 0xE8BD || (w >>> 16) === 0xE92D) continue;

    if ((w >>> 24) === 0xEB) {
      const tgt = (a + 8 + (((w & 0xFFFFFF) << 8) >> 6)) >>> 0;
      const r0 = get(0), r1 = get(1), r2 = get(2), r3 = get(3);
      const k = TGT[tgt];
      const base = { a, r0: ex(r0), r1: ex(r1), r2: ex(r2), r2v: r2.t === 'i' ? r2.n : null, arg3: ex(r3) };
      if (k === 'read' || k === 'write') {
        ev.push({ ...base, kind: k, off: r1.t === 'k' ? r1.n : null, offExpr: ex(r1), size: r2.t === 'i' ? r2.n : null, sizeExpr: ex(r2), ctxOk: r0.t === 'c', tmp: r1.t === 's' });
      } else if (k) {
        ev.push({ ...base, kind: k, tgt, cap: r1.t === 'i' ? r1.n : (r1.t === 'n' ? r1.n : null), capExpr: ex(r1) });
        if (k === 'bitread') { regs.r0 = { t: 'n', n: (r1.t === 'i' ? r1.n : (r1.t === 'n' ? r1.n : 0)) }; regs.r1 = U; regs.r2 = U; regs.r3 = U; regs.r12 = U; regs.lr = U; continue; }
        if (k === 'bitcap') { regs.r0 = { t: 'n', n: r1.t === 'i' ? r1.n : 0 }; regs.r1 = U; regs.r2 = U; regs.r3 = U; regs.r12 = U; regs.lr = U; continue; }
      } else {
        ev.push({ ...base, kind: 'call', tgt });
      }
      regs.r0 = U; regs.r1 = U; regs.r2 = U; regs.r3 = U; regs.r12 = U; regs.lr = U;
      continue;
    }

    if ((w >>> 24) === 0xEA || (((w >>> 25) & 7) === 5 && cond !== 0xE)) {
      const tgt = (a + 8 + (((w & 0xFFFFFF) << 8) >> 6)) >>> 0;
      if (((w >>> 24) === 0xEA) && (TGT[tgt] === 'read' || TGT[tgt] === 'write')) {
        const r1 = get(1), r2 = get(2);
        ev.push({ a, kind: 'tailread', off: r1.t === 'k' ? r1.n : null, offExpr: ex(r1), size: r2.t === 'i' ? r2.n : null, sizeExpr: ex(r2) });
        break;
      }
      if ((w >>> 24) === 0xEA && tgt < vaddr) { ev.push({ a, kind: 'tailcall', tgt }); break; }
      ev.push({ a, kind: 'branch', tgt, cond: w >>> 28 });
      if (tgt >= vaddr && tgt < a) loops.push({ from: tgt, to: a + 4, br: a, cmp: lastCmp });
      lastCmp = null;
      continue;
    }

    if (op26 === 0) {
      const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15;
      const I = (w >>> 25) & 1, op = (w >>> 21) & 0xF;
      if ((w & 0x0FF00000) === 0x03000000) { set(rd, { t: 'i', n: ((w >>> 4) & 0xF000) | (w & 0xFFF) }); continue; }
      if ((w & 0x0FF00000) === 0x03400000) {
        const imm16 = ((w >>> 4) & 0xF000) | (w & 0xFFF);
        const cur = get(rd);
        set(rd, cur.t === 'i' ? { t: 'i', n: ((cur.n & 0xFFFF) | (imm16 << 16)) >>> 0 } : U);
        continue;
      }
      if (I) {
        let imm = w & 0xFF, rot = ((w >>> 8) & 0xF) * 2;
        imm = rot ? ((imm >>> rot) | (imm << (32 - rot))) >>> 0 : imm;
        const iv = { t: 'i', n: imm };
        if (op === 0xD) { set(rd, cond === 0xE ? iv : U); continue; }
        if (op === 0x4) { set(rd, cond === 0xE ? addv(get(rn), iv) : U); if (rd === rn && cond === 0xE) adds.push({ a, r: rd, imm }); continue; }
        if (op === 0x2) { set(rd, cond === 0xE ? subv(get(rn), iv) : U); if (rd === rn && cond === 0xE) adds.push({ a, r: rd, imm: -imm }); continue; }
        if (op === 0xA) { lastCmp = { a, l: ex(get(rn)), r: ex(iv), imm, lreg: rn }; set(rd, U); continue; }
        if (op === 0xC) { const bv = get(rn); set(rd, cond === 0xE && imm < 0x100 && (bv.t === 'k' || bv.t === 'c' || bv.t === 's') ? addv(bv, iv) : U); continue; }
        set(rd, U); continue;
      }
      const rm = w & 15;
      let v = get(rm);
      const sh = (w >>> 5) & 3, shi = (w >>> 7) & 0x1F;
      if (w & 0x10) v = U;
      else if (sh !== 0) {
        if (v.t === 'i') { const n = shi === 0 ? 32 : shi; v = { t: 'i', n: sh === 1 ? (v.n >>> n) : sh === 2 ? (v.n >> n) : ((v.n >>> n) | (v.n << (32 - n))) >>> 0 }; }
        else v = U;
      }
      if (op === 0xD) { set(rd, cond === 0xE ? v : U); continue; }
      if (op === 0x4) { set(rd, cond === 0xE ? addv(get(rn), v) : U); continue; }
      if (op === 0x2) { set(rd, cond === 0xE ? subv(get(rn), v) : U); continue; }
      if (op === 0xA) { lastCmp = { a, l: ex(get(rn)), r: ex(v), imm: v.t === 'i' ? v.n : null, lreg: rn }; set(rd, U); continue; }
      set(rd, U); continue;
    }

    if (op26 === 1) {
      const L = (w >>> 20) & 1, rd = (w >>> 12) & 15, rn = (w >>> 16) & 15;
      const Wb = (w >>> 21) & 1, P = (w >>> 24) & 1;
      const imm12 = w & 0xFFF;
      const base = get(rn);
      if (!L && (w & 0x02000000)) {
        const vv = get(rd), ix = get(w & 15), shn = (w >>> 7) & 0x1F;
        if (vv.t === 'n' && base.t === 'k' && ix.t === 'i') ev.push({ a, kind: 'bitset', off: base.n + ((ix.n << shn) >>> 0), bits: vv.n });
        continue;
      }
      if (base.t === 's' && P) {
        const key = base.n + imm12;
        if (L) set(rd, mem[key] || U);
        else if (!Wb) mem[key] = get(rd);
      } else if (L) set(rd, U);
      if (!L && Wb) set(rn, U);
      continue;
    }
    set((w >>> 12) & 15, U);
  }

  for (const L of loops) {
    L.count = L.cmp && L.cmp.imm !== null ? L.cmp.imm : null;
    if (L.count === null) {
      const cand = adds.filter(x => x.a >= L.from && x.a < L.to);
      const last = cand[cand.length - 1];
      if (last && snap[L.from] && snap[L.from][R[last.r]] !== undefined) {
        const init = snap[L.from][R[last.r]] | 0;
        if (last.imm > 0 && init < 0 && (-init) % last.imm === 0) { L.count = -init; L.stride = last.imm; L.note = 'adds-wrap'; }
      }
    }
    L.cmpTxt = L.cmp ? `${L.cmp.l} vs ${L.cmp.r}` : null;
    if (L.stride === undefined) L.stride = null;
    if (L.cmp) {
      const cand = adds.filter(x => x.a >= L.from && x.a < L.to && x.r === L.cmp.lreg && x.imm > 0);
      if (cand.length) L.stride = cand[cand.length - 1].imm;
    }
    L.iters = L.stride ? L.count / L.stride : (L.count || null);
  }
  // annotate tmp reads with following copy call dest
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    if (e.kind !== 'read' || !e.tmp) continue;
    for (let j = i + 1; j < Math.min(i + 4, ev.length); j++) {
      const c = ev[j];
      if (c.kind === 'call' && /^obj\+0x/.test(c.r0) && c.r2v !== null && c.r2v === e.size) { e.copyTo = c.r0; e.copyTgt = c.tgt; break; }
    }
  }
  return { vaddr, end, events: ev, loops, len: (end - vaddr) / 4 };
}

if (import.meta.main) {
  const v = parseInt(process.argv[2], 16);
  const r = scan(v);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r)); process.exit(0); }
  const hex = n => '0x' + (n >>> 0).toString(16);
  const encl = a => r.loops.filter(L => a >= L.from && a < L.to);
  const mult = a => encl(a).reduce((m, L) => m * (L.iters || 1), 1);
  console.log(`# ${v.toString(16)} insns=${r.len} end=${r.end.toString(16)}`);
  for (const L of r.loops) console.log(`LOOP ${L.from.toString(16)}..${L.to.toString(16)} cmp=${L.cmpTxt} stride=${L.stride} iters=${L.iters}`);
  let cum = 0, total = 0;
  for (const e of r.events) {
    if (e.kind === 'read' || e.kind === 'tailread') {
      const sz = e.size;
      const m = mult(e.a);
      const lp = encl(e.a).length ? ' x' + m : '';
      console.log(`${e.a.toString(16)} READ ${e.off === null ? (e.tmp ? 'tmp@' : '') + e.offExpr : 'obj=' + hex(e.off)} sz=${sz === null ? e.sizeExpr : sz} rel=${hex(cum)}${e.kind === 'tailread' ? ' TAIL' : ''}${e.copyTo ? ' copy->' + e.copyTo + ' via ' + hex(e.copyTgt) : ''}${e.ctxOk === false ? ' r0=' + e.r0 : ''}${lp}`);
      if (sz) { cum += sz; total += sz * m; }
    } else if (e.kind === 'write') console.log(`${e.a.toString(16)} WRITE ${e.off === null ? e.offExpr : 'obj=' + hex(e.off)} sz=${e.size === null ? e.sizeExpr : e.size}`);
    else if (e.kind === 'bitcap' || e.kind === 'bitread') console.log(`${e.a.toString(16)} ${e.kind.toUpperCase()} cap=${e.cap === null ? e.capExpr : e.cap} arg1=${e.r1}${encl(e.a).length ? ' x' + mult(e.a) : ''}`);
    else if (e.kind === 'call') console.log(`${e.a.toString(16)} CALL ${hex(e.tgt)} r0=${e.r0} r1=${e.r1} r2=${e.r2}${encl(e.a).length ? ' x' + mult(e.a) : ''}`);
    else if (e.kind === 'branch') console.log(`${e.a.toString(16)} BR ->${e.tgt.toString(16)} cond=${e.cond.toString(16)}`);
    else if (e.kind === 'bitset') console.log(`${e.a.toString(16)} BITSET obj=${hex(e.off)} bits=${e.bits}`);
    else console.log(`${e.a.toString(16)} ${e.kind}`);
  }
  console.log(`# static_total=${cum} (0x${cum.toString(16)}) looped_total=${total} (0x${total.toString(16)})`);
}
