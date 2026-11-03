// sample-blocks.mjs — draw a fixed-size sample of tier-B functions from every block.
//
// Exhaustive verification of 26,034 functions is not reachable, so "explained" is measured the way any audit measures
// a population: a deterministic sample per block, adjudicated function by function, then block purity with a
// confidence interval. A block whose sampled purity is high is counted as explained and the extrapolation is stated;
// a block that fails is demoted, not guessed at.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT_DIR = path.join(INV, "bsamples");
const PER = Number(process.argv[2] || 12);

const idx = fs.readFileSync(path.join(INV, "bblocks/INDEX.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t"));
fs.mkdirSync(OUT_DIR, { recursive: true });
const index = [["block", "functions", "insns", "sampled", "file"]];
for (const [b, fns, insns, , , file] of idx) {
  const rows = fs.readFileSync(path.join(INV, "bblocks", file), "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
  const k = Math.min(PER, rows.length);
  const picked = [];
  for (let i = 0; i < k; i++) picked.push(rows[Math.floor((i * rows.length) / k)]);
  fs.writeFileSync(path.join(OUT_DIR, `s${b}.txt`), picked.map((r) => `${r[0]}\t${r[1]}\t${r[2]}`).join("\n") + "\n");
  index.push([b, fns, insns, String(k), `s${b}.txt`]);
}
fs.writeFileSync(path.join(OUT_DIR, "INDEX.tsv"), index.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`sampled ${PER} per block over ${idx.length} blocks -> ${OUT_DIR}`);
