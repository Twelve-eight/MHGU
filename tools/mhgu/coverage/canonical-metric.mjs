// canonical-metric.mjs — the project's own definition of "code explained", as fixed in HANDOFF.md §5.
//
// 主指标 = Tier A + Tier B conf=A over .text instructions. The pipeline's headline (">=90% precision, traceable") is a
// different and stricter metric, so both are reported: this one for continuity with the recorded goal, that one because it
// is what the current evidence supports. The tier-B conf=A count is parsed from the slice tables, which are the record of
// the manual rulings.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const DEN = 5228277;
const tiers = fs.readFileSync(ROOT + "/docs/analysis/code/inventory/tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1);
let tierAIns = 0, tierA = 0;
for (const l of tiers) {
  const c = l.split(",");
  if (c[2] !== "A") continue;
  tierA++;
  tierAIns += +c[1];
}
const fns = new Map(zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return [c[0].toLowerCase(), +c[2]]; }));
const uniq = new Set();
let confAIns = 0;
for (const d of ["tierb-pass1", "tierb-pass2", "tierb-pass3"]) {
  const dir = `${ROOT}/docs/analysis/code/${d}`;
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    for (const line of fs.readFileSync(dir + "/" + f, "utf8").split(/\r?\n/)) {
      const m = /^\|\s*(0x[0-9a-fA-F]+)\s*\|[^|]*\|[^|]*\|\s*A\s*\|/.exec(line);
      if (!m) continue;
      const s = m[1].toLowerCase();
      if (uniq.has(s)) continue;
      uniq.add(s);
      confAIns += fns.get(s) || 0;
    }
  }
}
const pct = (x) => ((100 * x) / DEN).toFixed(1);
console.log(`canonical metric (HANDOFF §5: Tier A + Tier B conf=A over .text instructions)`);
console.log(`  Tier A            ${tierA} functions, ${pct(tierAIns)}% of instructions`);
console.log(`  Tier B conf=A     ${uniq.size} functions, ${pct(confAIns)}% of instructions`);
console.log(`  canonical total   ${pct(tierAIns + confAIns)}% (target >= 90%, not met)`);
