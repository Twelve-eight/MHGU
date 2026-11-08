// vt9b40.mjs — who calls slots 9/10/11 of the vtable at 0x1839b40
// (the em[0x75e8]/0x75ec / em[0x75f0] / em[0x75f4] setters 0x70a1c / 0x70a4c / 0x70a5c).
//
// Read-only. Findings baked in as HARD CONTROLS (each hand-verified via MCP disasm/read_words;
// the tool exits 1 if any control fails, because a zero over a large space is a dead matcher):
//   K1 lane-P pairs (ldr rD,[pc,#imm]; ldr rT,[pc,rD]) must re-find the four initializer pairs:
//      (0x70604,0x70608)->0x1839b40, (0x706f0,0x706f4)->0x1839b64, (0x70708,0x7070c)->0x1839b68,
//      (0x70720,0x70724)->0x1839b6c   [fn 0x7051c, words 0xe59f11dc/0xe79f1001 etc.]
//   K2 findCallsTo/findRefsTo on the setters must include bl 0x107f16c->0x70a1c (fn 0x107ebd4)
//      and ptr 0x1839b68->0x70a4c, ptr 0x1839b6c->0x70a5c (vtable words only).
//   K3 movw census for #0x75e8/#0x75ec/#0x75f0/#0x75f4 must contain 0x70a24/0x70a38/0x70a4c/0x70a5c
//      (the setter bodies' own movws, words 0xe30705e8/0xe30705ec/0xe30725f0/0xe30725f4).
//   K4 movw census for #0x76e0/#0x76e8/#0x76f0/#0x76fc must contain 0x706e8/0x70700/0x70718/0x70740
//      (initializer 0x7051c's stores of the slot copies).
//   K5 ldr-imm12+blx pair matcher must re-find ldr r1,[r0,#344]@0x707b8 ; blx r1@0x707c0 (fn 0x7051c tail).
//
// Lanes: (1) vtable dump; (2) findLiteralLoads on base+slot words; (3) movw #0x9b40 census;
// (4) lane P over base+slot words; (5) calls/refs to setters; (6) movw census for the copy offsets
// 0x76e0/0x76e8/0x76f0/0x76fc with ldr+blx classification (calls through the copies);
// (7) assignment fallback: [rY,#36|40|44]+blx pairs in 0x5ce000..0x5d2000;
// (8) whole-image census of the same pairs, flagged when the enclosing fn also materialises a
//     0x75xx/0x76xx offset (em-field user => plausible caller on this class).

import crypto from 'node:crypto';
import { buf, rd32, findLiteralLoads, findRefsTo, findCallsTo, functionStarts, nearestFunctionStart, decode } from '../mhgu/arm32.mjs';

console.log('VTABLE 0x1839b40 slots 9/10/11 caller census (v3)');
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

const hex = (n) => '0x' + (n >>> 0).toString(16);
const R = ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','sp','lr','pc'];
const TEXT_END = 0x13f1dec;
const BASE = 0x1839b40;
const WORDS = [BASE, 0x1839b64, 0x1839b68, 0x1839b6c];
const SETTERS = { 0x70a1c: 9, 0x70a4c: 10, 0x70a5c: 11 };
const SLOT_OF = { 36: 9, 40: 10, 44: 11 };

// matchers ------------------------------------------------------------------
const isLdrImm12 = (w) => // ldr rT,[rB,#imm12], word, U any, Rn!=15
  (w >>> 28) !== 0xF && ((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0 &&
  ((w >>> 22) & 1) === 0 && ((w >>> 20) & 1) === 1 && ((w >>> 16) & 0xF) !== 15;
const isLdrPcImm = (w) => // ldr rD,[pc,#imm]
  (w >>> 28) !== 0xF && ((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0 &&
  ((w >>> 22) & 1) === 0 && ((w >>> 20) & 1) === 1 && ((w >>> 16) & 0xF) === 15;
const isLdrReg = (w, rm, allowPc = false) => // ldr rT,[rB,rm] pre-index no-writeback, word, L; rB may be pc only when allowPc
  (w >>> 28) !== 0xF && ((w >>> 25) & 7) === 3 && ((w >>> 22) & 1) === 0 &&
  ((w >>> 20) & 1) === 1 && ((w >>> 4) & 1) === 0 && (w & 0xF) === rm &&
  ((w >>> 24) & 1) === 1 && ((w >>> 21) & 1) === 0 &&
  (allowPc || ((w >>> 16) & 0xF) !== 15);
const movwImm = (w) => ((w & 0x0FF00000) === 0x03000000) ? ((((w >>> 4) & 0xF000) | (w & 0xFFF)) >>> 0) : -1;
const blxReg = (t) => ((t & 0x0FFFFFF0) === 0x012FFF30) ? (t & 0xF) : -1;

const starts = functionStarts();
const window = (v, n) => { const rows = []; for (let i = 0; i < n; i++) { const a = v + i * 4, w = rd32(a); rows.push({ a, w, s: decode(w, a) }); } return rows; };
const printWindow = (v, n, ind = '    ') => { for (const r of window(v, n)) console.log(`${ind}${hex(r.a)}: ${hex(r.w)}  ${r.s}`); };

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? '  PASS' : '  FAIL'} ${name}`); if (!ok) failed++; };

// ---- 1. vtable dump -------------------------------------------------------
console.log('\n== 1. vtable words at 0x1839b40 ==');
for (let i = 0; i < 20; i++) {
  const v = rd32(BASE + i * 4);
  console.log(`  +${(i * 4).toString().padStart(2)} (${hex(BASE + i * 4)}): ${hex(v)}${i >= 9 && i <= 11 ? `  <- slot ${i}` : ''}`);
}

// ---- 2. direct materialisation lanes --------------------------------------
console.log('\n== 2. direct materialisation of 0x1839b40 / slot words ==');
const lits = findLiteralLoads(0x100, TEXT_END, WORDS);
console.log(`findLiteralLoads (ldr-literal/vldr/movw/movt): ${lits.length} hits`);
for (const h of lits) console.log(`  ${hex(h.from)} kind=${h.kind} reg=${h.reg} value=${hex(h.value)} fn=${hex(nearestFunctionStart(h.from, starts) >>> 0)}`);
let movwLo = 0;
for (let a = 0x100; a < TEXT_END; a += 4) if (movwImm(rd32(a)) === 0x9b40) movwLo++;
console.log(`movw rX,#0x9b40 in .text: ${movwLo} sites`);

// ---- 3. lane P: pc-delta LDR pairs ----------------------------------------
console.log('\n== 3. lane P: ldr rD,[pc,#imm] ; ldr rT,[pc,rD] pairs targeting base/slot words ==');
const wset = new Set(WORDS);
const laneP = [];
for (let a = 0x100; a < TEXT_END; a += 4) {
  const w = rd32(a);
  if (!isLdrPcImm(w)) continue;
  const rd = (w >>> 12) & 0xF;
  if (rd === 15) continue;
  const off = w & 0xFFF, U = (w >>> 23) & 1;
  const delta = rd32(a + 8 + (U ? off : -off));
  for (let b = a + 4; b <= a + 32 && b < TEXT_END; b += 4) {
    const t = rd32(b);
    if (!isLdrReg(t, rd, true)) continue;   // lane P second load is exactly ldr rT,[pc,Rm]
    const rt = (t >>> 12) & 0xF;
    const target = (((t >>> 23) & 1) ? b + 8 + delta : b + 8 - delta) >>> 0;
    if (wset.has(target)) laneP.push({ a, b, rt, target, delta });
    break;
  }
}
console.log(`pairs targeting one of the 4 words: ${laneP.length}`);
for (const p of laneP) console.log(`  ${hex(p.a)} -> ${hex(p.b)} ldr r${p.rt},[pc,r${(rd32(p.a) >>> 12) & 0xF}] target=${hex(p.target)} delta=${hex(p.delta)} fn=${hex(nearestFunctionStart(p.a, starts) >>> 0)}`);
const K1 = [[0x70604, 0x70608, BASE], [0x706f0, 0x706f4, 0x1839b64], [0x70708, 0x7070c, 0x1839b68], [0x70720, 0x70724, 0x1839b6c]];
console.log('K1 controls (initializer pairs in fn 0x7051c):');
for (const [a, b, t] of K1) check(`${hex(a)}/${hex(b)} -> ${hex(t)}`, laneP.some(p => p.a === a && p.b === b && p.target === t));

// ---- 4. calls/refs to the setters -----------------------------------------
console.log('\n== 4. calls/refs to setter bodies 0x70a1c/0x70a4c/0x70a5c ==');
const calls = findCallsTo(Object.keys(SETTERS).map(Number));
for (const c of calls) console.log(`  bl/blx ${hex(c.from)} -> ${hex(c.to)} (slot ${SETTERS[c.to]}) fn=${hex(nearestFunctionStart(c.from, starts) >>> 0)}`);
const refs = findRefsTo(Object.keys(SETTERS).map(Number), { pointers: true });
for (const r of refs) console.log(`  ${r.kind} ${hex(r.from)} -> ${hex(r.to)}${SETTERS[r.to] !== undefined ? ` (slot ${SETTERS[r.to]})` : ''}`);
check('K2 bl 0x107f16c -> 0x70a1c present', calls.some(c => c.from === 0x107f16c && c.to === 0x70a1c));
check('K2 ptr 0x1839b68 -> 0x70a4c present', refs.some(r => r.kind === 'ptr' && r.from === 0x1839b68 && r.to === 0x70a4c));

// ---- 5. movw censuses with controls ---------------------------------------
console.log('\n== 5. movw censuses ==');
const movwSites = (imm) => { const out = []; for (let a = 0x100; a < TEXT_END; a += 4) if (movwImm(rd32(a)) === imm) out.push(a); return out; };
const K3 = { 0x75e8: [0x70a24], 0x75ec: [0x70a38], 0x75f0: [0x70a4c], 0x75f4: [0x70a5c] };
for (const [imm, need] of Object.entries(K3)) {
  const s = movwSites(Number(imm));
  check(`K3 movw #${imm} census contains ${need.map(hex).join(',')}`, need.every(n => s.includes(n)));
}
const K4 = { 0x76e0: [0x706e8], 0x76e8: [0x70700], 0x76f0: [0x70718], 0x76fc: [0x70740] };
for (const [imm, need] of Object.entries(K4)) {
  const s = movwSites(Number(imm));
  check(`K4 movw #${imm} census contains ${need.map(hex).join(',')}`, need.every(n => s.includes(n)));
}

// ---- 6. calls through the copies em+0x76e0/0x76e8/0x76f0 (and base copy 0x76fc) ----
console.log('\n== 6. calls through the copy fields em+0x76e0/0x76e8/0x76f0 (+base copy 0x76fc) ==');
// movw rX,#imm ; ... ; ldr rT,[rB,rX] ; blx rT
const copyCalls = [];
for (let a = 0x100; a < TEXT_END; a += 4) {
  const imm = movwImm(rd32(a));
  if (!(imm === 0x76e0 || imm === 0x76e8 || imm === 0x76f0 || imm === 0x76fc)) continue;
  const rx = (rd32(a) >>> 12) & 0xF;
  if (rx === 15) continue;
  for (let b = a + 4; b <= a + 24 && b < TEXT_END; b += 4) {
    const t = rd32(b);
    if (!isLdrReg(t, rx)) continue;         // section 6: [rB,rX] with rB != pc (a real field base)
    const rt = (t >>> 12) & 0xF;
    if (rt === 15) break;
    for (let c = b + 4; c <= b + 12 && c < TEXT_END; c += 4) {
      if (blxReg(rd32(c)) === rt) { copyCalls.push({ movw: a, imm, ldr: b, blx: c, rt }); break; }
    }
    break; // first register-offset use of rX
  }
}
console.log(`movw->ldr-reg->blx chains through the copy offsets: ${copyCalls.length}`);
for (const p of copyCalls) console.log(`  ${hex(p.movw)} movw r?,#${hex(p.imm)} ; ${hex(p.ldr)} ldr r${p.rt} ; ${hex(p.blx)} blx r${p.rt} fn=${hex(nearestFunctionStart(p.movw, starts) >>> 0)}`);
if (!copyCalls.length) console.log('  (none — the copies are data-only so far as this matcher sees)');

// ---- 7. assignment fallback: resource-manager block ------------------------
console.log('\n== 7. fallback: [rY,#36|40|44]+blx pairs in 0x5ce000..0x5d2000 ==');
const pairAt = (a, off) => { // ldr rT,[rB,#off] ; blx rT within 3
  const w = rd32(a);
  if (!isLdrImm12(w) || (w & 0xFFF) !== off) return null;
  const rt = (w >>> 12) & 0xF;
  if (rt === 15) return null;
  for (let j = 1; j <= 3; j++) { const m = blxReg(rd32(a + j * 4)); if (m === rt) return { ldr: a, blx: a + j * 4, rt }; }
  return null;
};
// K5 shape control: ldr r1,[r0,#344] @0x707b8 ; blx r1 @0x707c0
const k5 = pairAt(0x707b8, 344);
check(`K5 pair matcher control ldr r1,[r0,#344]@0x707b8 ; blx r1@0x707c0 ${k5 ? 'found' : 'NOT found'}`, !!k5 && k5.blx === 0x707c0);
const fb = [];
for (let a = 0x5ce000; a < 0x5d2000; a += 4) for (const off of [36, 40, 44]) { const p = pairAt(a, off); if (p) { fb.push({ ...p, off, slot: SLOT_OF[off] }); break; } }
console.log(`pairs in resource block: ${fb.length}`);
for (const p of fb) console.log(`  ${hex(p.ldr)} ldr r${p.rt},[r?,#${p.off}] ; ${hex(p.blx)} blx r${p.rt} (slot ${p.slot}) fn=${hex(nearestFunctionStart(p.ldr, starts) >>> 0)}`);
if (!fb.length) console.log('  (no virtual slot-9/10/11 callsite in the resource-manager block)');

// ---- 8. whole-image virtual-call census for slots 9/10/11 ------------------
console.log('\n== 8. whole-image [rY,#36|40|44]+blx census, flagged when fn also uses 0x75xx/0x76xx ==');
const fnMovwRange = [];
{ // per-function memo of whether it materialises any 0x75xx/0x76xx offset
  const fnOf = (a) => nearestFunctionStart(a, starts);
  const memo = new Map();
  const usesEmField = (a) => {
    const f = fnOf(a);
    if (memo.has(f)) return memo.get(f);
    let res = false;
    for (let x = f; x < f + 0x2000 && x < TEXT_END; x += 4) { const im = movwImm(rd32(x)); if ((im >>> 12) === 0x7 && (im & 0xF00) >= 0x500 && (im & 0xF00) <= 0x700 && (im & 0xff) <= 0xff && im >= 0x7500 && im <= 0x76ff) { res = true; break; } if (x !== f && ((rd32(x) & 0xFFFF4000) >>> 0) === 0xE92D4000) break; }
    memo.set(f, res); return res;
  };
  fnMovwRange.push(usesEmField);
}
const all = [];
for (let a = 0x100; a < TEXT_END; a += 4) for (const off of [36, 40, 44]) { const p = pairAt(a, off); if (p) { all.push({ ...p, off, slot: SLOT_OF[off] }); break; } }
const bySlot = { 9: 0, 10: 0, 11: 0 };
for (const p of all) bySlot[p.slot]++;
console.log(`total pairs in .text: ${all.length}  by slot: ${JSON.stringify(bySlot)}`);
const flagged = all.filter(p => fnMovwRange[0](p.ldr));
console.log(`flagged (enclosing fn materialises a 0x75xx/0x76xx offset): ${flagged.length}`);
for (const p of flagged.slice(0, 40)) console.log(`  slot ${p.slot}: ${hex(p.ldr)} ldr r${p.rt},[r?,#${p.off}] ; ${hex(p.blx)} blx r${p.rt} fn=${hex(nearestFunctionStart(p.ldr, starts) >>> 0)}`);
if (flagged.length > 40) console.log(`  ... ${flagged.length - 40} more`);

console.log(failed ? `\nCONTROL-FAIL (${failed}) — zeros above are not quotable` : '\nALL CONTROLS PASS');
process.exit(failed ? 1 : 0);
