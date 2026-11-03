// manifest.mjs — the review denominator for the MHGU tree: every doc, its size, and the slice it belongs to.
//
// Mirrors what round 1 did for MHRS: freeze the denominator first so "reviewed" is countable and later additions
// cannot silently change the percentage. Slices are directory-based (docs/analysis/code, docs/analysis/members,
// docs/save-layout, ...), because the audits are per-area: an auditor needs the area's data files at hand.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const OUT_DIR = path.join(ROOT, "docs/analysis/audit");
const MANIFEST = path.join(OUT_DIR, "MANIFEST.tsv");
const SLICES = path.join(OUT_DIR, "slices");

const docs = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, e.name);
    if (e.isDirectory()) walk(q);
    else if (e.name.endsWith(".md")) docs.push(q);
  }
})(path.join(ROOT, "docs"));
docs.sort();

const sliceOf = (rel) => {
  const parts = rel.split("/");
  // docs/analysis/<area>/... -> analysis-<area>; docs/<area>/... -> <area>
  if (parts[1] === "analysis" && parts.length > 3) return `analysis-${parts[2]}`;
  if (parts.length > 2) return parts[1];
  return "root";
};

const rows = [["doc", "lines", "bytes", "slice"]];
const bySlice = new Map();
for (const f of docs) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const text = fs.readFileSync(f, "utf8");
  const lines = text.split("\n").length;
  const slice = sliceOf(rel);
  rows.push([rel, String(lines), String(Buffer.byteLength(text)), slice]);
  if (!bySlice.has(slice)) bySlice.set(slice, []);
  bySlice.get(slice).push(rel);
}
fs.mkdirSync(SLICES, { recursive: true });
fs.writeFileSync(MANIFEST, rows.map((r) => r.join("\t")).join("\n") + "\n");
for (const [s, list] of bySlice) fs.writeFileSync(path.join(SLICES, `${s}.txt`), list.join("\n") + "\n");

console.log(`manifest: ${docs.length} docs, ${bySlice.size} slices`);
for (const [s, list] of [...bySlice].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${s.padEnd(28)} ${String(list.length).padStart(3)} docs`);
}
