// fix-member-fn.mjs — re-anchor member-offsets' `fn` column to the retiled function list.
//
// The column predates the 2026-11-03 retile: `site` still lies in the same function, but the recorded `fn` is the old
// tiling region start, so a lookup by `fn` finds nothing and every consumer (member-seeds, the class schemas) sees a
// phantom. `site` is the authoritative field — the store instruction — so `fn` is recomputed from it.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/data/member-offsets.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/member-offsets-refn.tsv");

const starts = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  const m = /^(0x[0-9a-f]+),/.exec(l || "");
  if (m) starts.push(parseInt(m[1], 16));
}
starts.sort((a, b) => a - b);
const atOrBefore = (addr) => {
  let lo = 0, hi = starts.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= addr) { best = starts[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
};

const lines = fs.readFileSync(SRC, "utf8").split(/\r?\n/);
const out = [lines[0]];
let changed = 0;
for (const l of lines.slice(1)) {
  if (!l) continue;
  const c = l.split("\t");
  const site = parseInt(c[4], 16);
  const fn = atOrBefore(site);
  const oldFn = parseInt(c[0], 16);
  if (fn !== oldFn) changed++;
  c[0] = "0x" + fn.toString(16);
  out.push(c.join("\t"));
}
fs.writeFileSync(OUT, out.join("\n") + "\n");
console.log(`member-offsets: ${out.length - 1} rows, ${changed} fn values re-anchored (site is authoritative)`);
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")} (review before replacing the source)`);
