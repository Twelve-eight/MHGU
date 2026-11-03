// merge.mjs — fold every independent attribution file into one tier pass and report where the explained share moved.
//
// The attributions are passed to recompute.mjs as extra seeds, so they are scored by the same address-vs-propagation
// agreement rule as everything else: a file cannot raise the headline by asserting labels alone, and the report shows
// per-file accept/reject counts so a broken loader is visible instead of silently neutral.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const files = fs.readdirSync(INV).filter((f) => /^attr-.*\.tsv$/.test(f)).sort();
if (!files.length) { console.log("no attr-*.tsv yet"); process.exit(0); }

const args = ["tools/mhgu/coverage/recompute.mjs"];
const retiled = path.join(ROOT, "docs/data/functions-retile.csv.gz");
if (fs.existsSync(retiled)) args.push("--functions", retiled); // real functions once the retile has run
for (const f of files) args.push("--seed", path.join(INV, f));
console.log(`seeds from: ${files.join(", ")}`);
const out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
console.log(out.trim());

// demotions are part of the pipeline, not an optional flag: a refuted block must not re-enter the headline
const demoteFiles = fs.readdirSync(INV).filter((f) => /^demote-.*\.tsv$/.test(f)).sort();
const repArgs = ["tools/mhgu/coverage/report.mjs"];
for (const f of demoteFiles) repArgs.push("--demote", path.join(INV, f));
const rep = execFileSync(process.execPath, repArgs, { cwd: ROOT, encoding: "utf8" });
const lines = rep.split("\n");
console.log("\nheadline (report.mjs over tiers-recomputed.csv, seeds already folded in):");
console.log(lines.slice(1, 7).join("\n"));
