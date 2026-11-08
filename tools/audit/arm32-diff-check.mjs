// arm32-diff-check.mjs — self-test for the ARMv7 divide decode added to tools/mhgu/arm32.mjs.
// Read-only on the image. Asserts, over .text only (vaddr 0x100..0x13F1DEC, flat = vaddr + 0x100):
//   (a) the control word 0xE733F211 decodes as `udiv` (first .text occurrence must say udiv);
//   (b) UDIV word count (mask 0x0FF0F0F0 == 0x0730F010) >= 1200 (expected 1215, whole-image census);
//   (c) SDIV word count (mask 0x0FF0F0F0 == 0x0710F010) >= 200  (expected 213, whole-image census).
// Exit 0 = all pass; exit 1 = any failure.
import fs from 'node:fs';
const arm32 = await import('file:///G:/omp%20works/MHGU/tools/mhgu/arm32.mjs');

const buf = fs.readFileSync(arm32.FLAT);
const W = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const TEXT_START = 0x100, TEXT_END = 0x13F1DEC;

let udiv = 0, sdiv = 0, ctrlSites = 0, ctrlDecoded = 0, ctrlBad = 0;
for (let v = TEXT_START; v < TEXT_END; v += 4) {
  const w = W(v);
  const m = w & 0x0FF0F0F0;
  if (m === 0x0730F010) udiv++;
  if (m === 0x0710F010) sdiv++;
  if (w === 0xE733F211) {
    const d = arm32.decode(w, v);
    // exact expected string per task spec: udiv r3, r1, r2 (Rd=bits19..16, Rn=bits3..0, Rm=bits11..8)
    if (d === 'udiv r3, r1, r2') { ctrlDecoded++; if (ctrlSites === 0) console.log('control 0x' + v.toString(16) + ': ' + d); }
    else ctrlBad++;
    ctrlSites++;
  }
}

console.log('UDIV words in .text: ' + udiv + ' (expected 1215)');
console.log('SDIV words in .text: ' + sdiv + ' (expected 213)');
console.log('control 0xE733F211 sites: ' + ctrlSites + ', decoded udiv: ' + ctrlDecoded + ', wrong: ' + ctrlBad);

const fails = [];
if (ctrlSites === 0) fails.push('control word 0xE733F211 not found in .text');
if (ctrlBad !== 0) fails.push(ctrlBad + ' control site(s) did not decode as udiv');
if (udiv < 1200) fails.push('UDIV count ' + udiv + ' < 1200');
if (sdiv < 200) fails.push('SDIV count ' + sdiv + ' < 200');
if (fails.length) { for (const f of fails) console.log('FAIL ' + f); process.exit(1); }
console.log('PASS');
