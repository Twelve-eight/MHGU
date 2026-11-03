// sample.mjs — draw a deterministic precision sample from the current tier A, per label.
//
// The meter counts labels; it cannot tell whether they are right. The only recorded check (2026-10-24, otomo-ot) found
// 1 of 20 rows correct, which is why precision has to be measured per label and the result used to weight the
// headline. Sample by even spacing over the sorted start addresses so the draw is reproducible and cannot be
// hand-picked.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT = path.join(ROOT, "docs/analysis/code/coverage/samples.tsv");
const PER = Number(process.argv[2] || 20);

const rows = fs.readFileSync(path.join(INV, "tiers-recomputed.csv"), "utf8").split("\n").slice(1).filter(Boolean)
  .map((l) => { const [start, insns, tier, label] = l.split(","); return { start, insns: Number(insns), tier, label }; });
const demoted = new Set();
const demoteFile = path.join(INV, "demote-otomo.tsv");
if (fs.existsSync(demoteFile)) {
  for (const l of fs.readFileSync(demoteFile, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) demoted.add(l.split("\t")[0]);
}

const byLabel = new Map();
for (const r of rows) {
  if (r.tier !== "A" || !r.label || demoted.has(r.start)) continue;
  if (!byLabel.has(r.label)) byLabel.set(r.label, []);
  byLabel.get(r.label).push(r);
}

const out = [["start", "label", "insns", "sample_index", "of", "evidence_rule"]];
for (const [label, list] of [...byLabel].sort((a, b) => b[1].length - a[1].length)) {
  list.sort((a, b) => parseInt(a.start, 16) - parseInt(b.start, 16));
  const k = Math.min(PER, list.length);
  for (let i = 0; i < k; i++) {
    const r = list[Math.floor((i * list.length) / k)];
    out.push([r.start, label, String(r.insns), String(i + 1), String(k), "evenly spaced over sorted start"]);
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.map((r) => r.join("\t")).join("\n") + "\n");
const counts = {};
for (const [l, v] of byLabel) counts[l] = v.length;
console.log(`sampled ${out.length - 1} rows across ${byLabel.size} labels (max ${PER}/label)`);
console.log(JSON.stringify(counts));
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
