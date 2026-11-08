// cluster75.mjs — em pointer cluster em[0x75ec] / em[0x75f0] / em[0x75f4]: getters, writers, linkage.
// (em = monster actor object.) Read-only on the image.
//
// Offsets 0x75ec..0x75f4 exceed imm12 (<=0xFFF), so EVERY direct [em+off] access must
// materialise the offset with movw (imm4:imm12) -- literal-pool lane is scanned as a bound.
// Lane M tracks movw rP,#off (+ optional add) then ldr/str [rN(+imm) | rN,rP], with dataflow
// kills: pend dies on any branch/bx, on any load or data-proc write to the same register.
//
// MUST-PASS CONTROL: getter 0x7109c (ldr [r0,r1] after movw r1,#0x75f4) must appear as a
// +0x75f4 read, and 0x71078 (+0x75ec) likewise; else exit 1.
// Getter table, setter words, factory-id site, vtable and EMC-loader words are each verified
// against the image; any mismatch -> exit 1.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('CLUSTER em+0x75ec / em+0x75f0 / em+0x75f4');
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const hex = (n) => '0x' + (n >>> 0).toString(16);
const OFFS = { 0x75ec: '75ec', 0x75f0: '75f0', 0x75f4: '75f4' };

let fails = 0;
const expectWords = (name, list) => {
  for (const [v, w] of list) {
    const got = W(v);
    if (got !== w) { console.log('WORD-FAIL ' + name + ' ' + hex(v) + ' want ' + hex(w) + ' got ' + hex(got)); fails++; }
  }
  console.log('   words ok: ' + name + ' (' + list.length + ')');
};

// ---- function starts (push {...,lr}) ----
const pushLr = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  if (((w & 0xFFFF0000) >>> 0) === 0xE92D0000 && (w & 0x4000)) pushLr.push(v);
}
const fnStart = (v) => {
  let lo = 0, hi = pushLr.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pushLr[mid] <= v) { best = pushLr[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
};

// ---- getter table (verified by expected words; descriptions from disassembly) ----
console.log('\nGETTER TABLE (every function in 0x71050..0x71240 that reads one of the three fields):');
const G = [
  [0x71078, 0x75ec, 'return em[0x75ec] + 0x64', [[0x71078, 0xe30715ec], [0x7107c, 0xe7900001], [0x71080, 0xe2800064], [0x71084, 0xe12fff1e]]],
  [0x71088, 0x75ec, 'return byte [em[0x75ec] + r1 + 0xF8]', [[0x71088, 0xe30725ec], [0x7108c, 0xe7900002], [0x71090, 0xe0800001], [0x71094, 0xe5d000f8], [0x71098, 0xe12fff1e]]],
  [0x7109c, 0x75f4, 'null-checked; return em[0x75f4] + 0x68', [[0x7109c, 0xe30715f4], [0x710a0, 0xe7900001], [0x710a4, 0xe3500000], [0x710a8, 0x12800068], [0x710ac, 0xe12fff1e]]],
  [0x710f0, 0x75ec, 'return em[em[0x75ec]+0x6C] object used for 3-byte sign-char search', [[0x710f0, 0xe30725ec], [0x710f4, 0xe7900002], [0x710f8, 0xe590006c]]],
  [0x71144, 0x75ec, 'return em[em[0x75ec]+0x78] + sub[585]*32', [[0x71144, 0xe3011428], [0x71148, 0xe30725ec], [0x7114c, 0xe7901001], [0x71150, 0xe7900002], [0x71154, 0xe5d11249], [0x71158, 0xe5900078], [0x7115c, 0xe0800281], [0x71160, 0xe12fff1e]]],
  [0x71164, 0x75ec, 'return em[em[0x75ec]+0x7C] + r1*16 (when byte[+0xFA] > r1)', [[0x71164, 0xe30725ec], [0x71168, 0xe7900002], [0x7116c, 0xe590207c]]],
  [0x71190, 0x75ec, 'copy out 3 words at em[em[0x75ec]+0x80][byte[+0xFB]]*12', [[0x71190, 0xe30735ec], [0x71194, 0xe7903003], [0x71198, 0xe5930080]]],
  [0x711e8, 0x75ec, 'return word at em[em[0x75ec]+0x94]', [[0x711e8, 0xe30715ec], [0x711ec, 0xe7900001], [0x711f0, 0xe5900094]]],
  [0x711f8, 0x75ec, 'return em[em[0x75ec]+0x68] + r1*10 + 2', [[0x711f8, 0xe30725ec], [0x711fc, 0xe0811101], [0x71200, 0xe7900002], [0x71204, 0xe5900068], [0x71208, 0xe0800081], [0x7120c, 0xe2800002]]],
  [0x71228, 0x75ec, 'return byte at em[em[0x75ec]+0x68] + r1*10 + 8', [[0x71228, 0xe30725ec], [0x7122c, 0xe0811101], [0x71230, 0xe7900002], [0x71234, 0xe5900068], [0x71238, 0xe0800081], [0x7123c, 0xe5d00008]]],
];
for (const [g, off, desc, words] of G) { console.log('  ' + hex(g) + '  em[+' + hex(off) + ']  ' + desc); expectWords('getter ' + hex(g), words); }
console.log('  (no getter reads em[0x75f0] anywhere in 0x71050..0x71240; em[0x75f0] consumers are inlined loads, see Lane M)');

// ---- lane M census ----
function accessKind(w) {
  const cond = (w >>> 28) & 0xF; if (cond === 0xF) return null;
  if ((w >>> 26 & 3) !== 1) return null;
  const I = (w >>> 25) & 1, P = (w >>> 24) & 1, U = (w >>> 23) & 1, B = (w >>> 22) & 1, L = (w >>> 20) & 1;
  return { I, P, U, B, L, rn: (w >>> 16) & 15, rd: (w >>> 12) & 15, rm: w & 15, sh: (w >>> 5) & 3, shamt: (w >>> 7) & 31 };
}
const ror32 = (x, r) => r ? (((x >>> r) | (x << (32 - r))) >>> 0) : x;
const imm12of = (w) => { const rot = ((w >>> 8) & 0xF) * 2; return ror32(w & 0xFF, rot); };

const sites = [];
const pend = new Map();
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  for (const [r, o] of pend) { if (++o.age > 12) pend.delete(r); }
  if (((w >>> 16) & 0xFFF0) === 0xE300) {
    const imm = (((w >>> 16) & 0xF) << 12) | (w & 0xFFF), rd = (w >>> 12) & 15;
    if (OFFS[imm]) pend.set(rd, { base: imm, add: 0, age: 0, at: v });
    else pend.delete(rd);
    continue;
  }
  if (((w & 0x0F000000) === 0x0A000000) || (w & 0x0FFFFFF0) === 0x012FFF10 || (w & 0x0FFFFFF0) === 0x012FFF30) { pend.clear(); continue; }
  if ((w & 0x0FE00000) === 0x02800000) {
    const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15, p = pend.get(rn);
    if (p) { pend.set(rd, { base: p.base, add: p.add + imm12of(w), age: 0, at: v }); if (rd !== rn) pend.delete(rn); }
    continue;
  }
  if ((w & 0x0FE000F0) === 0x00800000) {
    const rd = (w >>> 12) & 15, rn = (w >>> 16) & 15, rm = w & 15;
    const pm = pend.get(rm), pn = pend.get(rn);
    if (pm && !pn) { pend.set(rd, { base: pm.base, add: pm.add, age: 0, at: v }); pend.delete(rm); }
    else if (pn && !pm) { pend.set(rd, { base: pn.base, add: pn.add, age: 0, at: v }); pend.delete(rn); }
    continue;
  }
  const dp = ((w & 0x0C000000) === 0x00000000) && (((w >>> 24) & 0xF) <= 0xF);
  const ld = ((w >>> 26 & 3) === 1) && ((w >>> 20) & 1) === 1 && ((w >>> 15) & 0x1FFFF) !== 0x7FFF;
  const killReg = dp ? (w >>> 12) & 15 : (ld ? (w >>> 12) & 15 : -1);
  if (killReg >= 0) { if (killReg === 15) pend.clear(); else pend.delete(killReg); }
  const a = accessKind(w);
  if (!a) continue;
  let row = null;
  if (a.I === 0 && a.P === 1) {
    const p = pend.get(a.rn);
    if (p && p.at !== v) row = { base: p.base, off: (p.base + p.add) >>> 0, kind: (a.L ? 'ldr' : 'str') + (a.B ? 'b' : '') };
  } else if (a.I === 1 && a.P === 1 && a.sh === 0 && a.shamt === 0) {
    const p = pend.get(a.rm);
    if (p) row = { base: p.base, off: (p.base + p.add) >>> 0, kind: (a.L ? 'ldr' : 'str') + (a.B ? 'b' : '') };
  }
  if (row && OFFS[row.base]) {
    row.v = v; row.w = w; row.fn = fnStart(v);
    sites.push(row);
    console.log('  M', hex(v), 'word', hex(w), row.kind, 'em[+' + hex(row.off) + ']', 'fn', hex(row.fn), row.fn === -1 ? '[NO-FN-START]' : '');
  }
}
console.log('\nLane M sites:', sites.length, '(reads', sites.filter(s => s.kind.startsWith('ldr')).length + ', writes', sites.filter(s => s.kind.startsWith('str')).length + ')');

// hard control
const CONTROL = [[0x7107c, 0x75ec], [0x710a0, 0x75f4]];
const bad = CONTROL.filter(([v, o]) => !sites.some(s => s.v === v && s.off === o && s.kind === 'ldr'));
if (bad.length) { console.log('CONTROL-FAIL missing ' + bad.map(([v, o]) => hex(v) + '/+' + hex(o)).join(', ')); process.exit(1); }
console.log('CONTROL-PASS 0x7107c (+0x75ec read) and 0x710a0 (+0x75f4 read) both found');

// literal-pool bound
console.log('\nLiteral-pool bound (u32 == offset in .text):');
for (const o of Object.keys(OFFS)) {
  const ov = Number(o); const hits = [];
  for (let v = TEXT_START; v < TEXT_END; v += 4) if (W(v) === ov) hits.push(v);
  console.log('  ' + hex(ov), 'pool-word sites', hits.length, hits.slice(0, 8).map(hex).join(' '));
}

// writers
console.log('\nWRITERS (lane M stores):');
const writes = sites.filter(s => s.kind.startsWith('str'));
for (const s of writes) console.log('  ', hex(s.v), 'word', hex(s.w), s.kind, 'em[+' + hex(s.off) + ']', 'fn', hex(s.fn), s.fn === -1 ? '[NO-FN-START]' : '');

// setter + factory + vtable verification
console.log('\nSETTER / FACTORY / VTABLE:');
expectWords('setter block', [
  [0x70a1c, 0xe92d4830], [0x70a38, 0xe30705ec], [0x70a3c, 0xe7854000],          // pair setter: 0x75e8=r1, 0x75ec=r2
  [0x70a4c, 0xe30725f0], [0x70a50, 0xe7801002],                                  // 0x75f0 = r1
  [0x70a5c, 0xe30725f4], [0x70a60, 0xe7801002],                                  // 0x75f4 = r1
]);
expectWords('factory-id call site', [
  [0x107f12c, 0xe3081390], [0x107f134, 0xebc34e09],   // movw r1,#0x8390 ; bl 0x152960
  [0x107f148, 0xe3081391], [0x107f14c, 0xebc34e03],   // movw r1,#0x8391 ; bl 0x152960
  [0x107f16c, 0xebbfc62a],                            // bl 0x70a1c (pair setter)
]);
const VT = 0x1839b40;
const vt = []; for (let i = 0; i < 14; i++) vt.push(W(VT + 4 * i));
console.log('  vtable words @' + hex(VT) + ':', vt.map(hex).join(' '));
if (vt[9] !== 0x70a1c || vt[10] !== 0x70a4c || vt[11] !== 0x70a5c) { console.log('VTABLE-FAIL'); fails++; }
else console.log('  vtable ok: slots 9/10/11 = 0x70a1c (75e8+75ec pair) / 0x70a4c (75f0) / 0x70a5c (75f4)');

// EMC loader verification
console.log('\nEMC LOADER 0x520a0:');
expectWords('emc loader key stores', [
  [0x5213c, 0xe3041d45], [0x52140, 0xe3401043],      // magic 0x00434D45 = "EMC"+NUL (NOT "EMCE" = 0x43454D45 — that reading was refuted in FOR-SE-REPLY 238)
  [0x52154, 0xe3001804], [0x52158, 0xe3421012],      // version 0x20120804
  [0x52190, 0xe5810064],                              // str r0,[r1,#100]  -> obj+0x64
  [0x5220c, 0xe5a10068],                              // str r0,[r1,#104]! -> obj+0x68+4i
]);

if (fails) { console.log('FAILURES:', fails); process.exit(1); }
console.log('\nALL CHECKS PASS');
