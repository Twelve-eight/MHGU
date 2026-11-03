// validate-strings.mjs — check every string the seed rules rely on against the function's own code.
//
// Origin: `attr-library.md` found that the strings column can contain a string that the function never references,
// because a table access (`ldr rX,[pc,#imm]` then `ldr rY,[pc,rX]`) makes `table - pc` land numerically inside the
// string blob (754 provable cases). Those false strings become propagation seeds, so they do not just add noise —
// they inject a wrong label into the whole call graph.
//
// Test for each (function, string): does some word in the function's own literal pool equal the vaddr of that string?
// If yes, the reference is real. If not, the string came from the broken heuristic.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_END = 0x13f1dec;
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const OUT = path.join(ROOT, "docs/analysis/code/inventory/strings-validated.tsv");

// index every NUL-terminated ascii string >= 4 chars by its vaddr (bounded: only within 32 MB)
const strVaddr = new Map(); // string -> [vaddr...]
{
  let i = 0;
  while (i < buf.length) {
    if (buf[i] >= 0x20 && buf[i] < 0x7f) {
      let j = i;
      while (j < buf.length && buf[j] >= 0x20 && buf[j] < 0x7f) j++;
      if (j - i >= 4 && buf[j] === 0) {
        const s = buf.slice(i, j).toString("latin1");
        const v = i - 0x100;
        if (v >= 0 && !strVaddr.has(s)) strVaddr.set(s, []);
        if (v >= 0 && strVaddr.get(s).length < 4) strVaddr.get(s).push(v);
      }
      i = j;
    } else i++;
  }
}

const rows = fs.readFileSync(path.join(ROOT, "docs/analysis/code/inventory/tiers-recomputed.csv"), "utf8")
  .split("\n").slice(1).filter(Boolean).map((l) => l.split(","));

// walk the string-bearing functions of the retiled table and validate every token
const out = [["start", "string", "strings_found", "literal_hit", "verdict"]];
let total = 0, real = 0, fake = 0, unknown = 0;
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/.exec(l);
  if (!m || !m[6]) continue;
  const start = parseInt(m[1], 16), end = parseInt(m[2], 16);
  // literal pool words inside the function span+tail
  const words = new Set();
  for (let v = start; v + 4 <= Math.min(end + 0x100, TEXT_END); v += 4) words.add(rd(v));
  for (const token of m[6].split("|")) {
    if (!token) continue;
    total++;
    const addrs = strVaddr.get(token) || [];
    if (!addrs.length) { unknown++; out.push([m[1], token.replace(/"/g, "'"), "0", "", "no-string-in-image"]); continue; }
    const hit = addrs.some((a) => words.has(a >>> 0));
    if (hit) { real++; out.push([m[1], token.replace(/"/g, "'"), String(addrs.length), "yes", "real"]); }
    else { fake++; out.push([m[1], token.replace(/"/g, "'"), String(addrs.length), "no", "NO-REFERENCE"]); }
  }
}
fs.writeFileSync(OUT, out.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`string tokens ${total}: real ${real} (${((100 * real) / total).toFixed(1)}%), NO-REFERENCE ${fake} (${((100 * fake) / total).toFixed(1)}%), not-in-image ${unknown}`);
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
