// 0x2484c0 — 114-way jump-table dispatch: decode table, bodies, callees, global slots.
// Run: node .tmp/mhgu/mon/quest-dispatch.mjs
// Writes .tmp/mhgu/mon/quest-dispatch.out.txt (and prints a short summary).
import fs from 'node:fs';
import { decode, rd32, findCallsTo } from '../tools/arm32.mjs';

const OUT = 'G:/omp works/.tmp/mhgu/mon/quest-dispatch.out.txt';
const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];
const L = [];
const P = (s = '') => L.push(s);
const hx = n => '0x' + (n >>> 0).toString(16);
const bl = (w, a) => {
  let off = (w & 0xFFFFFF) << 2;
  if (off & 0x2000000) off -= 0x4000000;
  return (a + 8 + off) >>> 0;
};

// ---- annotated formatter: fixes two decode bugs of tools/arm32.mjs ----
// (a) extra load/store with I=0 is register-offset, tool prints a bogus "#imm"
// (b) 0xE6FF0070 family (uxtb/uxth/sxtb/sxth) prints as "ldrb [pc,...]"
function fmt(a) {
  const w = rd32(a);
  const txt = decode(w, a);
  if ((w & 0x0E000090) === 0x00000090) {
    const I = (w >>> 22) & 1;
    const Ld = (w >>> 20) & 1, U = (w >>> 23) & 1;
    const sh = (w >>> 5) & 3;
    const rn = R[(w >>> 16) & 0xF], rt = R[(w >>> 12) & 0xF];
    const mn = sh === 1 ? (Ld ? 'ldrh' : 'strh') : sh === 2 ? (Ld ? 'ldrsb' : 'ldrd') : sh === 3 ? (Ld ? 'ldrsh' : 'strd') : null;
    if (mn) {
      if (I === 0) {
        const rm = R[w & 0xF];
        return `${mn} ${rt}, [${rn}, ${U ? '' : '-'}${rm}]   ; (reg-offset form)`;
      }
      const imm = (((w >>> 8) & 0xF) << 4) | (w & 0xF);
      return `${mn} ${rt}, [${rn}, #${U ? '' : '-'}${imm}]`;
    }
  }
  const n = w & 0x0FFF0FF0;
  if (n === 0x06FF0070 || n === 0x06EF0070 || n === 0x06AF0070 || n === 0x06BF0070) {
    const kind = n === 0x06FF0070 ? 'uxth' : n === 0x06EF0070 ? 'uxtb' : n === 0x06AF0070 ? 'sxtb' : 'sxth';
    const rot = (w >>> 10) & 3;
    return `${kind} ${R[(w >>> 12) & 0xF]}, ${R[w & 0xF]}${rot ? `, ror #${rot * 8}` : ''}`;
  }
  return txt;
}

function litOf(a) {
  const w = rd32(a);
  if ((w & 0xFF7F0000) !== 0xE51F0000) return null;
  const U = (w >>> 23) & 1, off = w & 0xFFF;
  return { lit: (a + 8 + (U ? off : -off)) >>> 0, reg: R[(w >>> 12) & 0xF] };
}
function asciiAt(v) {
  // read bytes straight out of the flat image via rd32 chunks
  if (!(v >= 0x1000 && v < 0x1840000)) return null;
  let s = '';
  for (let i = 0; i < 96; i++) {
    const a = (v + i) & ~3, sh = ((v + i) & 3) * 8;
    const b = (rd32(a) >>> sh) & 0xFF;
    if (b === 0) break;
    if (b < 0x20 || b > 0x7E) return null;
    s += String.fromCharCode(b);
  }
  return s.length >= 3 ? s : null;
}
function noteLiteral(a) {
  const l = litOf(a);
  if (!l) return null;
  const v = rd32(l.lit);
  const s = asciiAt(v);
  return `lit@${hx(l.lit)}=${hx(v)}${s ? ` "${s}"` : ''}`;
}
function dis(a, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ad = a + i * 4, w = rd32(ad);
    let line = `  ${hx(ad)}: ${(w >>> 0).toString(16).padStart(8, '0')}  ${fmt(ad)}`;
    const nl = noteLiteral(ad);
    if (nl) line += `   ; ${nl}`;
    out.push(line);
  }
  return out;
}

// ---------------- Section A: dispatch decode ----------------
const FN = 0x2484c0;
P('## A. dispatch prologue 0x2484c0');
P(...dis(FN, 16));
P('');
P('table base: 0x2484e0 `add r2,pc,#8` -> pc=0x2484e8 +8 = 0x2484f0 (entries are base-relative)');
P('dispatch key: r1 = r3-1 ; cmp r1,#113 (0x71) ; bhi 0x2487e4 ; target = 0x2484f0 + entry');
P('');

// ---------------- Section B: table ----------------
const TB = 0x2484f0, N = 114;
const ents = [];
for (let i = 0; i < N; i++) ents.push(rd32(TB + i * 4));
P('## B. table (cond = i+1)');
P('cond idx  entry    target    group');
const groups = new Map();
for (let i = 0; i < N; i++) {
  const t = (TB + ents[i]) >>> 0;
  groups.set(ents[i], (groups.get(ents[i]) || 0) + 1);
  P(`${String(i + 1).padStart(4)} ${String(i).padStart(3)}  0x${ents[i].toString(16).padStart(4, '0')}  ${hx(t)}`);
}
P('');
P('## B2. shared-target groups (entry -> #cases -> target)');
for (const [e, c] of [...groups.entries()].sort((x, y) => x[0] - y[0])) {
  P(`  0x${e.toString(16).padStart(4, '0')}  x${String(c).padStart(3)}  -> ${hx((TB + e) >>> 0)}`);
}
P('');

// ---------------- Section C: per-target body scan ----------------
const tset = [...new Set(ents.map(e => (TB + e) >>> 0))].sort((a, b) => a - b);
P('## C. unique targets = ' + tset.length);
for (const t of tset) {
  const next = tset.find(x => x > t) || 0x248f4c;
  const end = Math.min(next, 0x248f4c);
  const bls = [], movws = [], movts = [], strings = [], pcs = [];
  for (let a = t; a < end; a += 4) {
    const w = rd32(a);
    if ((w >>> 28) === 0xE && ((w >>> 25) & 7) === 5) bls.push(hx(bl(w, a)));
    if ((w & 0xFFF00000) === 0xE3000000) movws.push('0x' + ((((w >>> 4) & 0xF000) | (w & 0xFFF)) >>> 0).toString(16));
    if ((w & 0xFFF00000) === 0xE3400000) movts.push('0x' + ((((w >>> 4) & 0xF000) | (w & 0xFFF)) >>> 0).toString(16));
    const l = litOf(a);
    if (l) { const v = rd32(l.lit); const s = asciiAt(v); if (s) strings.push(`"${s}"`); }
    if (/add\s+pc/.test(fmt(a)) || /ldr\s+pc/.test(fmt(a))) pcs.push(hx(a));
  }
  const conds = [];
  for (let i = 0; i < N; i++) if (((TB + ents[i]) >>> 0) === t) conds.push(i + 1);
  P(`--- ${hx(t)}  len=${(end - t) / 4} insn  conds=[${conds.join(',')}]`);
  if (bls.length) P(`    bl: ${bls.join(' ')}`);
  if (movws.length) P(`    movw: ${movws.join(' ')}   movt: ${movts.join(' ')}`);
  if (strings.length) P(`    strings: ${strings.join(' | ')}`);
  if (pcs.length) P(`    pc-branch sites: ${pcs.join(' ')}`);
}
P('');

// ---------------- Section D: callee disassembly ----------------
const CALLEES = [0xe8458, 0x249004, 0x2493c8, 0x52308c, 0x526348, 0x523504, 0x526564,
  0x1418e0, 0x142a38, 0x3b1e24, 0x3b1fd0, 0x166aac, 0x50b64];
P('## D. callee disassembly');
for (const c of CALLEES) {
  P(`### callee ${hx(c)}`);
  P(...dis(c, 110));
  P('');
}

// ---------------- Section E: callers of callees ----------------
P('## E. callers of callees (first 14 each)');
const hits = findCallsTo(CALLEES);
const byT = new Map();
for (const h of hits) { if (!byT.has(h.to)) byT.set(h.to, []); byT.get(h.to).push(h.from); }
P(`0x2484c0 callers: ${(byT.get(0x2484c0) || []).map(hx).join(' ') || '(none)'}`);
for (const c of CALLEES) {
  const arr = (byT.get(c) || []).sort((a, b) => a - b);
  P(`${hx(c)}: n=${arr.length}  ${arr.slice(0, 14).map(hx).join(' ')}`);
}
P('');

// ---------------- Section F: data arrays ----------------
P('## F. data array read by 0x2486b8 / 0x2486d0');
const arrays = [
  ['case 0x2486b8 (cond 28..41, r1=0): base 0x1627a6c', 0x1627a6c],
  ['case 0x2486d0 (cond 42..55, r1=1): base 0x1627a34', 0x1627a34],
];
for (const [label, base] of arrays) {
  P(label);
  for (let i = 20; i < 60; i += 2) {
    const a = base + 4 * i, b = base + 4 * (i + 1);
    P(`  idx ${i}=${hx(rd32(a))} (${rd32(a)})   idx ${i + 1}=${hx(rd32(b))} (${rd32(b)})   [${hx(a)}]`);
  }
}
P('');

// ---------------- Section G: global slots ----------------
P('## G. global singleton slots used by case bodies');
P('  (pattern: ldr rX,[pc,#k]=OFFSET ; ldr rX,[pc,rX]  ->  slot = (addr of 2nd insn)+8+OFFSET)');
const seen = new Set();
for (let a = 0x2484f0; a < 0x248f4c; a += 4) {
  const l = litOf(a);
  if (!l) continue;
  const v = rd32(l.lit);
  if (v < 0x1000000 || v > 0x1800000) continue;
  const slot = (a + 12 + v) >>> 0;   // next insn addr = a+4, its pc = a+12
  if (slot >= 0x1840000) continue;
  if (seen.has(slot)) continue;
  seen.add(slot);
  const w = rd32(slot);
  let line = `  site ${hx(a)} off=${hx(v)} slot=${hx(slot)} -> ${hx(w)}`;
  if (w > 0x1000000 && w < 0x1840000) {
    const vt = rd32(w);
    line += `  obj=${hx(w)} [obj+0]=${hx(vt)}`;
    if (vt > 0x100000 && vt < 0x1400000) {
      const rtti = rd32((vt - 4) >>> 0);
      line += ` rtti=${hx(rtti)}`;
      const s1 = asciiAt(rtti), s2 = asciiAt((rtti + 8) >>> 0), s3 = asciiAt((rtti + 12) >>> 0);
      if (s1) line += ` "${s1}"`;
      if (s2) line += ` +8:"${s2}"`;
      if (s3) line += ` +12:"${s3}"`;
    }
  }
  P(line);
}
P('');

fs.mkdirSync('G:/omp works/.tmp/mhgu/mon', { recursive: true });
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(`wrote ${OUT}  lines=${L.length}  uniqueTargets=${tset.length}`);
console.log(`table entries: ${ents.map(e => '0x' + e.toString(16)).join(' ')}`);
