// movwscan.mjs — movw-literal census over the WHOLE .text with hard positive controls.
// Text base: arm32.mjs convention flat = vaddr + 0x100, so vaddr runs 0x100 .. 0x13F1DEC.
// movw decode = imm4:imm12 = ((w>>>4)&0xf000)|(w&0xfff), the same formula as
// MHGU/tools/audit/emc-section-census.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const FLAT = process.env.FLAT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'main.140.flat.bin');
const buf = fs.readFileSync(FLAT);
const TEXT_START = 0x100;
const TEXT_END = 0x13F1DEC;
const rd32 = (v) => buf.readUInt32LE(v + 0x100);
const rdOf = (w) => (w >>> 12) & 0xF;
const isMovw = (w) => ((w >>> 28) & 0xF) !== 0xF && (w & 0x0FF00000) === 0x03000000 && ((w >>> 20) & 1) === 0 && rdOf(w) !== 0xF;
const movwVal = (w) => ((((w >>> 16) & 0xF) << 12) | (w & 0xFFF)) >>> 0;

// Unconditional self-test: the movw decode must reproduce a hand-verified word on EVERY run,
// so a census whose argv does not include 0x72f4 still has an active control (re-audit F finding).
{
  const probe = 0xe30702f4 >>> 0;                       // movw r0,#0x72f4 (hand-disassembled at 0x8286c)
  const got = isMovw(probe) ? movwVal(probe) : null;
  console.log('SELFTEST movw decode: ' + (got === 0x72f4 ? 'PASS' : 'FAIL got ' + got));
  if (got !== 0x72f4) process.exit(1);
}
// Encoding boundaries: a low imm12 nibble of 0xf is legal, while Rd15 and condF are not.
{
  const controls = [
    [0xe301040f, true, 0x140f, "imm12 low nibble 0xf"],
    [0xe301f404, false, null, "Rd15"],
    [0xf3010404, false, null, "condF"],
  ];
  for (const [word, expected, value, label] of controls) {
    const actual = isMovw(word), decoded = actual ? movwVal(word) : null;
    const pass = actual === expected && (!expected || decoded === value);
    const shown = decoded === null ? "none" : "0x" + decoded.toString(16);
    console.log(`SELFTEST ${label}: ${pass ? "PASS" : "FAIL"} isMovw=${actual} value=${shown}`);
    if (!pass) process.exit(1);
  }
}
const targets = process.argv.slice(2).map(Number);
const results = new Map();
for (const off of targets) {
  const sites = [];
  for (let v = TEXT_START; v < TEXT_END; v += 4) {
    const w = rd32(v);
    if (isMovw(w) && movwVal(w) === off) sites.push(v);
  }
  results.set(off, sites);
  console.log(`0x${off.toString(16)}: ${sites.length} movw site(s)`);
  console.log('  ' + sites.map((v) => '0x' + v.toString(16)).join(' '));
}

// Hard controls: hand-disassembled sites that MUST appear.
const controls = [[0x72f4, 0x8286c], [0x72f4, 0x829e0], [0x72f4, 0x8fab68], [0x72f4, 0x8f826c]];
let ok = true;
for (const [off, site] of controls) {
  if (!results.has(off)) continue;            // only assert controls whose target was requested
  const hit = (results.get(off) || []).includes(site);
  console.log(`CONTROL ${hit ? 'PASS' : 'FAIL'} 0x${site.toString(16)} for 0x${off.toString(16)}`);
  if (!hit) ok = false;
}
process.exit(ok ? 0 : 1);
