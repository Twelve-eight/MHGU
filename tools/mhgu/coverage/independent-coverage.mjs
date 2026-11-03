// independent-coverage.mjs — recompute the headline from the raw inputs with a separate implementation.
//
// report.mjs merges five sources into a best-label map and partitions on that. If the merge has a bug, every number it
// prints is wrong and its own checks still pass, because they compare the report to itself. This re-derives the same
// partition from the raw files, in a different shape (per-function scan instead of a best-map with precedence), and
// prints the difference. Agreement is the corroboration; a mismatch names the function and the two verdicts.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INV = ROOT + "/docs/analysis/code/inventory/";
const CONF_RANK = { A: 3, V: 2, S: 1 };
const VALID_SPREAD = new Set(["online-nex", "weapon-wp"]);   // read from report.mjs by hand; must match METER
const LABELS = new Set(["audio", "debug-dev", "filesystem", "item", "kernel-os", "monster-em", "online-nex", "otomo-ot",
  "physics-math", "player-pl", "quest", "render-gfx", "save-data", "ui", "weapon-wp"]);

// ---- the population
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => {
    const c = l.split(",");
    return { s: c[0].toLowerCase(), insns: +c[2] };
  });
const byStart = new Map(fns.map((f) => [f.s, f]));

// ---- per-function verdicts, collected independently
const verdicts = new Map();   // start -> {kind, label, conf}  (evidence A/V/S only)
const best = new Map();       // start -> {label, rank, kind}   (spine plus adjudications)
function offer(start, kind, label, conf) {
  if (!label || label === "unknown" || !LABELS.has(label)) return;
  const cur = verdicts.get(start);
  const rank = conf ? (CONF_RANK[conf] || 0) : 0;
  if (!cur || rank > (CONF_RANK[cur.conf] || 0)) verdicts.set(start, { kind, label, conf });
}

// 1. evidence tables listed in sources.json
const SRC = process.env.SOURCES ? INV + process.env.SOURCES : INV + "sources.json";
for (const f of JSON.parse(fs.readFileSync(SRC, "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, label, conf] = l.split("\t");
    if (!CONF_RANK[conf]) continue;
    offer(s.toLowerCase(), conf === "A" ? "direct" : conf === "V" ? "inferred" : "signature", label, conf);
  }
}

// 2. the propagation spine
const SPINE = process.env.SPINE ? INV + process.env.SPINE : INV + "tiers-merged.csv";
for (const l of fs.readFileSync(SPINE, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [s, , , label] = l.split(",");
  if (!label || !LABELS.has(label)) continue;
  const tier = l.split(",")[2];
  const k = s.toLowerCase();
  const prev = best.get(k);
  const rank = tier === "A" ? 3 : 2;          // report.mjs treats a tier-A spine label as conf A
  if (!prev || rank > prev.rank) best.set(k, { label, rank, kind: "spread" });
}

// 3. manual slice adjudications
const ARANK = { A: 3, B: 2, C: 1 };
const adjud = new Map();
for (const dir of ["tierb-pass1", "tierb-pass2", "tierb-pass3"]) {
  const d = ROOT + "/docs/analysis/code/" + dir;
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /slice-.*\.md$/.test(x))) {
    for (const l of fs.readFileSync(d + "/" + f, "utf8").split(/\r?\n/)) {
      const m = /^\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z-]+)\s*\|\s*(\w+)\s*\|\s*([ABC])\s*\|/.exec(l);
      if (!m || !LABELS.has(m[2])) continue;
      const k = m[1].toLowerCase();
      const prev = adjud.get(k);
      if (!prev || ARANK[m[4]] > ARANK[prev.rank]) adjud.set(k, { label: m[2], rank: ARANK[m[4]] });
    }
  }
}
for (const [k, a] of adjud) {
  // an adjudication beats the spine only when its confidence rank is higher, exactly as report.mjs merges them
  const cur = best.get(k);
  if (!cur || a.rank > cur.rank) best.set(k, { label: a.label, rank: a.rank, kind: "adjudication" });
}

// ---- partition by instruction count
const buckets = new Map();
const add = (k, insns) => buckets.set(k, (buckets.get(k) || 0) + insns);
let total = 0;
for (const f of fns) {
  total += f.insns;
  const v = verdicts.get(f.s);
  const b = best.get(f.s);
  if (v && v.kind === "direct") add("direct evidence", f.insns);
  else if (v && v.kind === "inferred") add("inferred only", f.insns);
  else if (v && v.kind === "signature") add("signature only", f.insns);
  // the validated bucket is propagation only: a slice adjudication names a label but was never in the population the
  // 99.8/98.4 precision was measured on, so it cannot be counted as validated
  else if (b && b.kind !== "adjudication") add(VALID_SPREAD.has(b.label) ? "spread validated labels" : "spread unvalidated", f.insns);
  else if (b) add("spread unvalidated", f.insns);
  else add("no label", f.insns);
}

if (process.env.SPINE) {
  const coveredCf = (buckets.get("direct evidence") || 0) + (buckets.get("inferred only") || 0) + (buckets.get("signature only") || 0) + (buckets.get("spread validated labels") || 0);
  console.log("counterfactual spine " + process.env.SPINE);
  for (const [k, v] of [...buckets].sort()) console.log("  " + k.padEnd(26) + String(v).padStart(8));
  console.log("  covered " + coveredCf + " = " + ((100 * coveredCf) / total).toFixed(2) + "%");
  process.exit(0);
}

// ---- the report's own numbers, for comparison
const rep = fs.readFileSync(INV + "coverage-report.tsv", "utf8").split(/\r?\n/);
const reportRow = (name) => {
  const l = rep.find((x) => x.startsWith("partition: ") && x.split("\t")[0] === "partition: " + name);
  return l ? Number(l.split("\t")[2]) : null;
};
console.log(`denominator from the function table: ${total} instructions over ${fns.length} functions`);
let ok = true;
for (const name of ["direct evidence", "inferred only", "signature only", "spread validated labels", "spread unvalidated", "no label"]) {
  const mine = buckets.get(name) || 0;
  const theirs = reportRow(name);
  const same = theirs === mine;
  if (!same) ok = false;
  console.log(`${same ? "match" : "DIFF "} ${name.padEnd(26)} independent ${String(mine).padStart(8)}  report ${String(theirs).padStart(8)}${same ? "" : "   <-- differs by " + (mine - theirs)}`);
}
const covered = (buckets.get("direct evidence") || 0) + (buckets.get("inferred only") || 0) + (buckets.get("signature only") || 0) + (buckets.get("spread validated labels") || 0);
console.log(`covered at >=90% independently: ${covered} = ${((100 * covered) / total).toFixed(2)}% of instructions`);
console.log(ok ? "PASS independent recomputation reproduces the report partition" : "FAIL independent recomputation disagrees with the report");
process.exit(ok ? 0 : 1);
