// canonical-metric.mjs — the project's own definition of "code explained", as fixed in HANDOFF.md §5.
//
// 主指标 = Tier A + Tier B conf=A over .text instructions. The pipeline's headline (">=90% precision, traceable") is a
// different and stricter metric, so both are reported: this one for continuity with the recorded goal, that one because it
// is what the current evidence supports. The tier-B conf=A count is parsed from the slice tables, which are the record of
// the manual rulings.
//
// 2026-11-04 correction: this script used to count the raw spine tier A straight out of tiers-merged.csv, which still
// carries the label of every function a recorded review refuted (512 functions, 0.61% of instructions). report.mjs drops
// those from "tier A (verified)" by design -- "demotions are part of the meter, not an optional flag ... otherwise the
// report would quietly drift back up" -- so the canonical number was measuring a population the meter refuses to publish.
// The verified number now comes from coverage-report.tsv and the raw spine figure is printed beside it for contrast.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INV = ROOT + "/docs/analysis/code/inventory";
const DEN = 5228277;
const tiers = fs.readFileSync(INV + "/tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1);
let tierARaw = 0, tierARawIns = 0;
for (const l of tiers) {
  const c = l.split(",");
  if (c[2] !== "A") continue;
  tierARaw++;
  tierARawIns += +c[1];
}

// verified tier A: read the meter's own row rather than re-deriving it, so the two cannot drift apart
const reportPath = INV + "/coverage-report.tsv";
if (!fs.existsSync(reportPath)) {
  console.error(`missing ${reportPath}: run report.mjs first (the canonical metric now takes verified tier A from it)`);
  process.exit(2);
}
const reportLine = fs.readFileSync(reportPath, "utf8").split(/\r?\n/).find((l) => l.startsWith("tier A (verified)\t"));
if (!reportLine) {
  console.error("coverage-report.tsv has no 'tier A (verified)' row");
  process.exit(2);
}
const rc = reportLine.split("\t");
const tierAVer = +rc[1], tierAVerIns = +rc[2];
if (!(tierAVerIns > 0)) {
  console.error("'tier A (verified)' row has no instruction count");
  process.exit(2);
}

// demoted starts: a refuted label may not count as a manual ruling either
const demoted = new Set();
for (const f of fs.readdirSync(INV).filter((x) => /^(demote-.*|pins)\.tsv$/.test(x))) {
  for (const l of fs.readFileSync(`${INV}/${f}`, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const v = parseInt(l.split("\t")[0], 16);
    if (Number.isFinite(v)) demoted.add(v);
  }
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
let bDemoted = 0, bDemotedIns = 0;
for (const s of uniq) if (demoted.has(parseInt(s, 16))) { bDemoted++; bDemotedIns += fns.get(s) || 0; }

const pct = (x) => ((100 * x) / DEN).toFixed(1);
console.log(`canonical metric (HANDOFF §5: Tier A + Tier B conf=A over .text instructions)`);
console.log(`  Tier A verified   ${tierAVer} functions, ${pct(tierAVerIns)}% of instructions`);
console.log(`  Tier B conf=A     ${uniq.size - bDemoted} functions, ${pct(confAIns - bDemotedIns)}% of instructions`);
console.log(`  canonical total   ${pct(tierAVerIns + confAIns - bDemotedIns)}% (target >= 90%, not met)`);
console.log(`  (raw spine tier A would be ${tierARaw} functions / ${pct(tierARawIns)}% -- it still carries the label of`);
console.log(`   ${tierARaw - tierAVer} functions a recorded review refuted, so it is not the published number)`);
