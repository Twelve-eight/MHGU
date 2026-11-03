// promote-blocks.mjs — turn block-purity samples into promotions, with the extrapolation stated.
//
// A block is promoted only when the sampled functions agree on one label and almost none are unidentifiable:
//   confirm+relabel >= 10 of 12 and unknown <= 2 and one label holds >= 10
// Promoted rows are the block's B functions whose current label equals that label. Each keeps an evidence string
// naming the block, the sample file and the purity, so a reviewer can overturn one block without touching others.
//
// Output: docs/analysis/code/inventory/attr-blocks.tsv (start,label,conf,evidence) + a printed table.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT = path.join(INV, "attr-blocks.tsv");

const verdicts = fs.readdirSync(path.join(INV, "bsamples")).filter((f) => /^verdict-.*\.tsv$/.test(f));
if (!verdicts.length) { console.log("no verdict files yet"); process.exit(0); }

const perBlock = new Map(); // block -> {rows:[{start,label,verdict}]}
for (const f of verdicts) {
  for (const l of fs.readFileSync(path.join(INV, "bsamples", f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [block, start, label, verdict] = l.split("\t");
    if (!perBlock.has(block)) perBlock.set(block, []);
    perBlock.get(block).push({ start, label, verdict, file: f });
  }
}

// block membership from the block files
const blockOf = new Map(); // start -> block
for (const f of fs.readdirSync(path.join(INV, "bblocks")).filter((x) => /^b\d+\.txt$/.test(x))) {
  for (const l of fs.readFileSync(path.join(INV, "bblocks", f), "utf8").split("\n").filter(Boolean)) {
    blockOf.set(l.split("\t")[0], f.replace(/^b|\.txt$/g, "").replace(/^0+/, "") || "0");
  }
}

const rows = [["start", "label", "conf", "evidence"]];
const report = [];
for (const [block, list] of [...perBlock].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const conf = list.filter((r) => r.verdict === "confirm");
  const relab = list.filter((r) => r.verdict.startsWith("relabel:"));
  const unknown = list.filter((r) => r.verdict === "unknown");
  const labels = {};
  for (const r of conf) labels[r.label] = (labels[r.label] || 0) + 1;
  for (const r of relab) { const t = r.verdict.split(":")[1]; labels[t] = (labels[t] || 0) + 1; }
  const [topLabel, topN] = Object.entries(labels).sort((a, b) => b[1] - a[1])[0] || ["", 0];
  const settled = conf.length + relab.length;
  const promote = settled >= 10 && unknown.length <= 2 && topN >= 10 && blockOf.size > 0;
  report.push({ block, sampled: list.length, confirm: conf.length, relabel: relab.length, unknown: unknown.length, topLabel, topN, promote });
  if (!promote) continue;
  // promote every B row of this block to the label the sample settled on -- including rows whose current label differs,
  // because a unanimous relabel means the propagation label was the error, not the evidence
  const bFile = path.join(INV, "bblocks", `b${block.padStart(2, "0")}.txt`);
  if (!fs.existsSync(bFile)) continue;
  for (const l of fs.readFileSync(bFile, "utf8").split("\n").filter(Boolean)) {
    const [start, , label] = l.split("\t");
    if (label === topLabel) continue; // already carries the settled label; nothing to change
    rows.push([start, topLabel, "A", `block ${block} purity ${topN}/${list.length} (${conf.length} confirm, ${relab.length} relabel, ${unknown.length} unknown) sample ${list[0].file}`]);
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log("block\tsampled\tconfirm\trelabel\tunknown\tlabel\ttopN\tpromote\tpromoted_rows");
for (const r of report) console.log(`${r.block}\t${r.sampled}\t${r.confirm}\t${r.relabel}\t${r.unknown}\t${r.topLabel}\t${r.topN}\t${r.promote ? "yes" : "no"}`);
console.log(`promoted rows: ${rows.length - 1} -> ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
