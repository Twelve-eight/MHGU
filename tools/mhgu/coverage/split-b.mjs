// split-b.tsv.mjs — carve tier B into blocks of equal instruction weight for the verification wave.
//
// Verification cost is dominated by disassembly volume, not function count, so blocks are cut by instructions (about
// 60k each => ~35 blocks) rather than by row count. Block 0 is the pilot's range, so a block file can be handed to an
// agent verbatim and the merged result measured with the same meter.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT_DIR = path.join(INV, "bblocks");
const TARGET = Number(process.argv[2] || 60000);

const rows = fs.readFileSync(path.join(INV, "tiers-recomputed.csv"), "utf8").split("\n").slice(1).filter(Boolean)
  .map((l) => { const [start, insns, tier, label] = l.split(","); return { start, insns: Number(insns), tier, label }; })
  .filter((r) => r.tier === "B")
  .sort((a, b) => parseInt(a.start, 16) - parseInt(b.start, 16));

fs.mkdirSync(OUT_DIR, { recursive: true });
const blocks = [];
let cur = [], curIns = 0;
for (const r of rows) {
  cur.push(r); curIns += r.insns;
  if (curIns >= TARGET) { blocks.push({ list: cur, insns: curIns }); cur = []; curIns = 0; }
}
if (cur.length) blocks.push({ list: cur, insns: curIns });

const index = [["block", "functions", "insns", "first_start", "last_start", "file"]];
blocks.forEach((b, i) => {
  const name = `b${String(i).padStart(2, "0")}.txt`;
  fs.writeFileSync(path.join(OUT_DIR, name), b.list.map((r) => `${r.start}\t${r.insns}\t${r.label}`).join("\n") + "\n");
  index.push([String(i), String(b.list.length), String(b.insns), b.list[0].start, b.list[b.list.length - 1].start, name]);
});
fs.writeFileSync(path.join(OUT_DIR, "INDEX.tsv"), index.map((r) => r.join("\t")).join("\n") + "\n");
const totalIns = blocks.reduce((a, b) => a + b.insns, 0);
console.log(`tier B split into ${blocks.length} blocks of ~${TARGET} instructions (total ${totalIns} insns, ${rows.length} functions)`);
console.log(`wrote ${path.relative(ROOT, OUT_DIR).replace(/\\/g, "/")}/INDEX.tsv`);
