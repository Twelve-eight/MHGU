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
const isMovw = (w) => (w & 0x0FF00000) === 0x03000000 && ((w >>> 20) & 1) === 0 && (w & 0xF) < 15;
const movwVal = (w) => (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0;

// Unconditional self-test: the movw decode must reproduce a hand-verified word on EVERY run,
// so a census whose argv does not include 0x72f4 still has an active control (re-audit F finding).
{
  const probe = 0xe30702f4 >>> 0;                       // movw r0,#0x72f4 (hand-disassembled at 0x8286c)
  const got = isMovw(probe) ? movwVal(probe) : null;
  console.log('SELFTEST movw decode: ' + (got === 0x72f4 ? 'PASS' : 'FAIL got ' + got));
  if (got !== 0x72f4) process.exit(1);
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
