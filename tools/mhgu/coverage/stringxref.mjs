// stringxref.mjs — rebuild string references from the code itself, instead of trusting the strings column.
//
// Two reference forms exist in this binary and the first version only handled one:
//   A. absolute: the literal word IS the string address (rodata)
//   B. delta:    the literal word is a small offset; `add rD, pc, rX` turns it into the address
// The pilot measured the miss: 4,717 functions use form B, 2,420 of them were absent from the first pass. Both forms
// need register tracking, so this version follows one register at a time inside a basic block and drops the state at
// every branch.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const OUT = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_END = 0x13f1dec;
const IMG_END = buf.length - 0x100;
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const byte = (v) => buf[v + 0x100];
const inText = (v) => v > 0x100 && v < TEXT_END;
const inRodata = (v) => v > TEXT_END && v < IMG_END - 8;
const isAscii = (b) => b >= 0x20 && b < 0x7f;

const readStr = (v) => {
  if (!inRodata(v)) return "";
  if (byte(v - 1) !== 0) return ""; // strings start after a NUL; this kills data-blob hits
  let n = 0;
  while (n < 96 && isAscii(byte(v + n))) n++;
  if (n < 4 || byte(v + n) !== 0) return "";
  return buf.slice(v + 0x100, v + 0x100 + n).toString("latin1");
};

const fns = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),/.exec(l);
  if (m) fns.push({ s: parseInt(m[1], 16), e: parseInt(m[2], 16) });
}

const rows = [["start", "string", "via", "site"]];
let withRefs = 0, viaAbs = 0, viaDelta = 0, viaTable = 0;
for (const f of fns) {
  const set = new Set();
  const delta = new Map(); // reg -> literal value (possible pc bias)
  for (let v = f.s; v + 4 <= f.e; v += 4) {
    const w = rd(v);
    // branch or bl: basic block ends, register state is gone
    if (((w >>> 25) & 7) === 5 || (w >>> 24) === 0xea || (w >>> 24) === 0xeb) { delta.clear(); continue; }
    if ((w >>> 16) === 0xe59f) {
      const rdN = (w >>> 12) & 0xf;
      const L = v + 8 + (w & 0xfff);
      if (L + 4 > IMG_END) continue;
      const V = rd(L);
      const s = readStr(V);
      if (s) { set.add(s); viaAbs++; }
      else if (inRodata(V)) {
        // data table: entries that point at ASCII strings
        for (let k = 0; k < 256; k++) {
          const E = rd(V + k * 4);
          if (!(E > TEXT_END && E < IMG_END)) break;
          const s2 = readStr(E);
          if (s2) { set.add(s2); viaTable++; }
        }
      } else if (V < 0x2000000) {
        delta.set(rdN, V); // small value: a pc bias, resolved by a following add
      }
      continue;
    }
    if ((w >>> 16) === 0xe08f) { // add rD, pc, rM
      const rm = w & 0xf;
      if (!delta.has(rm)) continue;
      const t = (v + 8 + delta.get(rm)) >>> 0;
      const s = readStr(t);
      if (s) { set.add(s); viaDelta++; }
      delta.delete(rm);
    }
  }
  if (set.size) {
    withRefs++;
    for (const s of set) rows.push([`0x${f.s.toString(16)}`, s.replace(/[\t"]/g, " "), "code", ""]);
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`functions with refs: ${withRefs}/${fns.length} (${((100 * withRefs) / fns.length).toFixed(1)}%); rows ${rows.length - 1}`);
console.log(`via absolute ${viaAbs}, via pc-delta ${viaDelta}, via table ${viaTable}`);
