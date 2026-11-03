// stringxref.mjs — rebuild string references from the code itself, instead of trusting the strings column.
//
// Why: the committed `functions.csv.gz` strings column is produced by a heuristic that confuses a table access with a
// string pointer (documented in attr-library.md: `ldr rX,[pc,#imm]` then `ldr rY,[pc,rX]` makes `table - pc` land
// inside the string blob). A validator that demands a literal pointing at the exact bytes accepted only 32 of 4,461
// tokens. Meanwhile the image really does hold the names: 527 `_ZN2nn...` symbols, thousands of message strings.
//
// This pass reads the two reference mechanisms the format doc describes:
//   A. `ldr rX,[pc,#imm]`            -> literal L = aligned pc+8+imm; V = word at L; if V is a .text vaddr of ASCII -> ref
//   B. `ldr rX,[pc,#imm]` + `add rD,pc,rX` -> delta loaded, then target = instr_addr+8+delta
// Output: (function start, referenced strings) for every function in the retiled table.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const OUT = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_END = 0x13f1dec;
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const byte = (v) => buf[v + 0x100];
const inText = (v) => v > 0x100 && v < TEXT_END;
const IMG_END = buf.length - 0x100;
// strings live in rodata beyond .text, which is why restricting to .text found almost nothing
const inRodata = (v) => v > TEXT_END && v < IMG_END - 8;
const isAscii = (b) => b >= 0x20 && b < 0x7f;

const readStr = (v) => {
  // a string starts after a NUL (or at the very start of the data region); without this, pointers that land in the
  // middle of a data blob produce long runs of printable bytes that are not strings
  if (v > TEXT_END && byte(v - 1) !== 0) return "";
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
let withRefs = 0;
const seen = new Map(); // start -> Set(strings)
for (const f of fns) {
  const set = new Set();
  let prevDelta = null; // value of a delta loaded two instructions ago
  for (let v = f.s; v + 4 <= f.e; v += 4) {
    const w = rd(v);
    let thisDelta = null;
    // ldr rX,[pc,#imm]  (0xE59Fxxxx) — literal address = pc+8+imm, aligned
    if ((w >>> 16) === 0xe59f) { // ldr rD,[pc,#imm]; Rd is in bits 15-12, so compare the top half only
      const imm = w & 0xfff;
      const L = v + 8 + imm;
      if (L + 4 <= TEXT_END + 0x100) {
        const V = rd(L);
        if (inRodata(V)) {
          const s = readStr(V);
          if (s) set.add(s);
          else {
            // the literal points at a data table, not at a string: entries are .text pointers to names/messages
            for (let k = 0; k < 256; k++) {
              const E0 = rd(V + k * 4);
              if (!(E0 > TEXT_END && E0 < IMG_END)) break;
              const s2 = readStr(E0);
              if (s2) set.add(s2);
            }
          }
        } else if (inText(V)) {
          thisDelta = V | 0; // not a string: remember as a possible pc-delta
        } else if (V > TEXT_END && V < buf.length - 0x200) {
          // table hop: the function loaded a data table; entries that point at ASCII are string references
          for (let k = 0; k < 256; k++) { // message/name tables are long: stop at 256 entries
            const E0 = rd(V + k * 4);
            if (!(E0 > TEXT_END && E0 < IMG_END)) break;
            const s2 = readStr(E0); if (s2) set.add(s2);
          }
        }
      }
    }
    // add rD,pc,rX (0xE08Fxxxx family: cond 1110, opcode 0100, S=0, Rn=pc)
    if ((w >>> 16) === 0xe08f && prevDelta !== null) { // add rD, pc, rX
      const t = (v + 8 + prevDelta) >>> 0;
      const s = readStr(t);
      if (s) set.add(s);
    }
    prevDelta = thisDelta;
  }
  if (set.size) {
    withRefs++;
    seen.set(f.s, set);
    for (const s of set) rows.push([`0x${f.s.toString(16)}`, s.replace(/[\t"]/g, " "), "code", ""]);
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`functions with string refs: ${withRefs}/${fns.length} (${((100 * withRefs) / fns.length).toFixed(1)}%); rows ${rows.length - 1}`);
const uniq = new Set([...seen.values()].flatMap((s) => [...s]));
console.log(`distinct strings: ${uniq.size}`);
