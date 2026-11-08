// off505.mjs — who touches byte +0x505 of the em[0x1428] sub-object?
// Read-only. Scans .text for ldrb/ldrsb/strb with a 12-bit immediate of 0x505
// (any P/U/W combination), prints sites + enclosing function start, plus a
// same-shape census for the two f32 neighbours (+0x59c, +0x5a4) in case they help.
import fs from 'node:fs';
import crypto from 'node:crypto';

const IMG = 'G:/omp works/MHGU-private/main.140.flat.bin';
const buf = fs.readFileSync(IMG);
console.log('IMAGE', IMG);
console.log('SHA256', crypto.createHash('sha256').update(buf).digest('hex'), 'bytes', buf.length);

let decode = null;
try { const m = await import('file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs'); decode = m.decode; } catch (e) { console.log('ARM32-IMPORT-FAIL', e.message); }

const TEXT_START = 0x100, TEXT_END = 0x13f1dec;
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

// function starts: nearest preceding push {...,lr} (bit 15 of the reg list set)
function isPushLr(w) {
  // stmdb sp!, {...,lr}  == 0xE92D ....  with bit15 in the list
  return ((w & 0xFFFF0000) >>> 0) === 0xE92D0000 && (w & 0x4000) !== 0;
}
const pushStarts = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) if (isPushLr(W(v))) pushStarts.push(v);
function fnStart(v) {
  let lo = 0, hi = pushStarts.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pushStarts[mid] <= v) { best = pushStarts[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
}

// single data-transfer immediate forms: bits 27-26 = 01, bit 25 = 0
function classify(w) {
  if (((w >>> 26) & 3) !== 1) return null;     // must be a load/store
  if (((w >>> 25) & 1) !== 0) return null;     // register offset form excluded
  const imm = w & 0xFFF;
  const P = (w >>> 24) & 1, U = (w >>> 23) & 1, B = (w >>> 22) & 1, W_ = (w >>> 21) & 1, L = (w >>> 20) & 1;
  const rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
  if (!B) return null;                          // byte only
  const size = 'B';
  const op = L ? (P ? 'ldr' : 'ldr') : 'str';
  return { op, size, imm, P, U, W: W_, L, rn, rd, word: w };
}

const targets = new Map([[0x505, 'byte'], [0x59c, 'word'], [0x5a4, 'word']]);
const hits = [];
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const c = classify(w);
  if (!c) continue;
  if (!targets.has(c.imm)) continue;
  if (targets.get(c.imm) === 'byte' && c.size !== 'B') continue;
  const mn = decode ? decode(w, v) : '0x' + w.toString(16);
  hits.push({ v, imm: c.imm, mn, fn: fnStart(v), eff: c.U ? c.imm : -c.imm, pre: !!c.P, wb: !!c.W });
}
console.log('sites', hits.length);
for (const h of hits) console.log('  0x' + h.v.toString(16), 'off=0x' + h.imm.toString(16), h.pre ? 'pre' : 'post', h.wb ? 'wb' : '  ', 'fn=0x' + (h.fn < 0 ? 0 : h.fn).toString(16), h.mn);
const byImm = {};
for (const h of hits) byImm['0x' + h.imm.toString(16)] = (byImm['0x' + h.imm.toString(16)] || 0) + 1;
console.log('by offset', JSON.stringify(byImm));
