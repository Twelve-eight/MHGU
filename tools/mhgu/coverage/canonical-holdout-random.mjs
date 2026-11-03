// canonical-holdout-random.mjs — Tier A precision, measured the way the historical 94.7% was measured.
//
// A geographic holdout (canonical-holdout.mjs) measures recall, not precision: removing a whole 1 MB window removes the
// evidence for the functions inside it, so most come back as tier C and the number says nothing about correctness. The
// 2026-10-23 figure came from RANDOM folds: withhold a share of the evidence rows, propagate from the rest, and ask what
// the withheld rows are predicted to be. Five repetitions with different draws.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory";
const TMP = path.join(ROOT, ".tmp-holdout-random");
const SPINE = path.join(INV, "tiers-merged.csv");
const spineHash = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const spineBefore = spineHash(SPINE);
const SHARE = Number(process.env.SHARE || 0.2);
const REPS = Number(process.env.REPS || 5);
const sources = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8")).filter((f) => !/vote\d*\.tsv$/.test(f));
fs.mkdirSync(TMP, { recursive: true });

const cp = (o, n) => { if (!n) return 0; const p = o / n, z = 1.959963985, d = 1 + z * z / n; return ((p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d) * 100; };
let n = 0, matched = 0, tierA = 0, both = 0;

for (let rep = 0; rep < REPS; rep++) {
  let k = 0;
  const kept = [];
  const held = [];
  for (const f of sources) {
    const p = path.join(INV, f);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
    const out = [lines[0]];
    for (const l of lines.slice(1)) {
      // deterministic per (rep, line) draw so the whole run is reproducible
      const h = crypto.createHash("sha1").update(`${rep}:${f}:${l}`).digest();
      if (h[0] / 256 < SHARE) held.push(l); else out.push(l);
    }
    fs.writeFileSync(path.join(TMP, f), out.join("\n") + "\n");
    kept.push("--seed", path.join(TMP, f));
  }
  const outFile = path.join(TMP, `tiers-rep${rep}.csv`);
  execFileSync(process.execPath, ["tools/mhgu/coverage/recompute.mjs", "--functions", "docs/data/functions-retile.csv.gz", ...kept, "--out", outFile], { cwd: ROOT, stdio: "ignore" });
  const tiers = new Map();
  for (const l of fs.readFileSync(outFile, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split(",");
    tiers.set(c[0].toLowerCase(), { tier: c[2], label: c[3] || "" });
  }
  for (const l of held) {
    const c = l.split("\t");
    if (c[2] !== "A" || !c[1]) continue;
    const got = tiers.get(c[0].toLowerCase());
    if (!got) continue;
    n++; k++;
    const match = got.label && got.label === c[1];
    if (match) matched++;
    if (got.tier === "A") { tierA++; if (match) both++; }
  }
  console.log(`rep ${rep}: withheld ${k}`);
}
if (spineHash(SPINE) !== spineBefore) { console.error("FAIL: tiers-merged.csv changed"); process.exitCode = 1; }
console.log(`held-out evidence rows ${n} (random ${(SHARE * 100).toFixed(0)}% x ${REPS} reps)`);
console.log(`  label match (any tier)  ${matched}/${n} = ${((100 * matched) / n).toFixed(1)}%  CP95 ${cp(matched, n).toFixed(1)}%`);
console.log(`  came back as tier A     ${tierA}/${n} = ${((100 * tierA) / n).toFixed(1)}%  CP95 ${cp(tierA, n).toFixed(1)}%`);
console.log(`  tier A AND label match  ${both}/${n} = ${((100 * both) / n).toFixed(1)}%  CP95 ${cp(both, n).toFixed(1)}%`);
fs.rmSync(TMP, { recursive: true, force: true });
