// seeds-from-xref.mjs — turn the validated string references into attribution seeds.
//
// Only a string the function actually loads counts: the reference is the evidence, not proximity in a data blob.
// Each seed records the string, so a reviewer can check any single row without re-running the extractor.
import fs from "node:fs";
import path from "node:path";
import { labelOf } from "./taxonomy.mjs";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-xref.tsv");

const rows = [["start", "label", "conf", "evidence"]];
const seen = new Map();
let matched = 0, unmatched = 0;
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, str] = l.split("\t");
  if (!str) continue;
  const lab = labelOf(str);
  if (!lab) { unmatched++; continue; }
  matched++;
  const prev = seen.get(start);
  if (prev && prev.label === lab) continue;
  if (!prev) { seen.set(start, { label: lab, str }); rows.push([start, lab, "A", `string "${str.slice(0, 70)}"`]); }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`seeds from validated refs: ${rows.length - 1} functions (matched ${matched} refs, unmatched ${unmatched})`);
const by = {};
for (const r of rows.slice(1)) by[r[1]] = (by[r[1]] || 0) + 1;
console.log(JSON.stringify(by));
