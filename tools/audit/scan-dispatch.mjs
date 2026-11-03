// scan-dispatch.mjs — reproducible counts for the dispatch idioms the mechanics pages quote.
//
// Why this exists: `docs/mechanics/monster-code-map.md` said "offset-table dispatch: 3,429 sites in
// 2,546 functions" and "inline tables: 10". Both came from ad-hoc scans whose definitions were never
// recorded, and no reading of the stated signature reproduces them (audit W6-MONSTERS, 2026-11-04).
// A number a reader cannot re-run is not evidence, so this tool defines each idiom in code, prints
// the count, and prints the command that reproduces it.
//
// Usage: node tools/audit/scan-dispatch.mjs [--image <flat image>]

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argIdx = process.argv.indexOf("--image");
const IMAGE = argIdx > 0 ? process.argv[argIdx + 1] : path.join(ROOT, "main.140.flat.bin");
const FUNCS = path.join(ROOT, "docs/data/functions-retile.csv.gz");

const img = fs.readFileSync(IMAGE);
const TEXT_START = 0x100;
const TEXT_END = 0x13F1DEC + 0x100;
const N = Math.floor((TEXT_END - TEXT_START) / 4);
const W = i => img.readUInt32LE(TEXT_START + i * 4);
const rd = x => (x >>> 12) & 0xf, rn = x => (x >>> 16) & 0xf;

// data-processing, register form, opcode ADD (bits 24-21 = 0100)
const isAddReg = x => ((x >>> 25) & 7) === 0 && ((x >>> 21) & 0xf) === 4;
// add pc, pc, rM, lsl #2  (inline jump table)
const isAddPcPcLsl2 = x => isAddReg(x) && rd(x) === 15 && rn(x) === 15 && ((x >>> 7) & 0x1f) === 2 && ((x >>> 5) & 3) === 0 && ((x >>> 4) & 1) === 0;

let starts = null, ends = null;
if (fs.existsSync(FUNCS)) {
  const lines = zlib.gunzipSync(fs.readFileSync(FUNCS)).toString("utf8").trim().split("\n").slice(1);
  starts = []; ends = [];
  for (const l of lines) {
    const i = l.indexOf(",");
    if (i < 0) continue;
    const j = l.indexOf(",", i + 1);
    if (j < 0) continue;
    starts.push(parseInt(l.slice(0, i)));
    ends.push(parseInt(l.slice(i + 1, j)));
  }
}
const fnOf = vaddr => {
  if (!starts || !starts.length) return -1;
  let lo = 0, hi = starts.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= vaddr) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best >= 0 && vaddr < ends[best] ? starts[best] : -1;
};

let addPcReg = 0, addPcRegImmShift = 0, inline = 0;
const fnsA = new Set(), fnsC = new Set();
for (let i = 0; i < N; i++) {
  const x = W(i);
  if (!isAddReg(x) || rd(x) !== 15) continue;
  addPcReg++;
  if (((x >>> 4) & 0xff) === 0) addPcRegImmShift++;   // no shift
  const f = fnOf(i * 4);
  if (f >= 0) fnsA.add(f);
  if (isAddPcPcLsl2(x)) { inline++; if (f >= 0) fnsC.add(f); }
}

console.log("scan-dispatch.mjs — image:", path.relative(ROOT, IMAGE));
console.log(".text instructions:", N);
console.log("");
console.log("A. add pc, rX, rY  (register form, any shift)");
console.log("   sites:", addPcReg, "| without shift:", addPcRegImmShift, "| in functions:", fnsA.size);
console.log("C. add pc, pc, rM, lsl #2  (inline jump table)");
console.log("   sites:", inline, "| in functions:", fnsC.size);
console.log("");
console.log("NOT defined here, and deliberately not quoted: the old \"3,429 sites / 2,546 functions\"");
console.log("offset-table figure. Its definition was never recorded and no reading of the stated");
console.log("signature reproduces it (W6-MONSTERS). Treat that number as withdrawn.");
console.log("");
console.log("Reproduce: node tools/audit/scan-dispatch.mjs");
