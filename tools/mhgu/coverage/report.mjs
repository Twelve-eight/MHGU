// report.mjs — the coverage meter for "how much of .text is explained".
//
// One meter, one denominator (23,885 functions / 5,228,277 instructions from docs/analysis/code/inventory/tiers.csv),
// so every new attribution source is measured the same way and cannot inflate the headline by claiming coverage
// twice. Sources are additive inputs, each a TSV of  start  label  conf(A|B)  evidence :
//
//   tiers.csv                 tier A/B/C + label (the original spine)
//   tierb-pass*/tierB*-slice  Tier B adjudications (parsed from the markdown tables)
//   --source <file>           extra attributions from new evidence (vtables, class registrars, library blocks)
//
// A function is counted once, at its best confidence: A beats B, B beats nothing. Output prints instructions and
// functions separately because a handful of 10k-instruction functions dominates the instruction percentage.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const CODE = path.join(ROOT, "docs/analysis/code");
const OUT = path.join(INV, "coverage-report.tsv");

const LABELS = new Set([
  "online-nex", "save-data", "save-io", "render-gfx", "audio", "ui", "monster-em", "player-pl", "weapon-pw",
  "weapon-wp", "otomo-ot", "quest", "item", "physics-math", "filesystem", "kernel-os", "debug-dev", "unknown",
]);

// ---- spine
const tiers = new Map(); // start -> {insns, tier, label}
const spine = fs.existsSync(path.join(INV, "tiers-recomputed.csv")) ? "tiers-recomputed.csv" : "tiers.csv"; // recomputable wins
const lines = fs.readFileSync(path.join(INV, spine), "utf8").split(/\r?\n/).filter(Boolean).slice(1);
for (const l of lines) {
  const [s, ins, t, lab] = l.split(",");
  tiers.set(s, { insns: Number(ins), tier: t, label: lab || "" });
}
const totalFn = tiers.size;
let totalIns = 0;
for (const v of tiers.values()) totalIns += v.insns;

// ---- tier B adjudications from the markdown slices
const adjud = new Map();
const rank = { A: 3, B: 2, C: 1 };
for (const dir of ["tierb-pass1", "tierb-pass2", "tierb-pass3"]) {
  const d = path.join(CODE, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /slice-.*\.md$/.test(x)).sort()) {
    for (const l of fs.readFileSync(path.join(d, f), "utf8").split(/\r?\n/)) {
      const m = /^\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z-]+)\s*\|\s*(\w+)\s*\|\s*([ABC])\s*\|/.exec(l);
      if (!m) continue;
      const [, start, label, , conf] = m;
      if (!LABELS.has(label) || label === "unknown") continue;
      const prev = adjud.get(start);
      if (!prev || rank[conf] > rank[prev.conf]) adjud.set(start, { conf, label, src: `${dir}/${f}` });
    }
  }
}

// ---- extra sources: start, label, conf, evidence
const extraArgs = process.argv.reduce((a, v, i) => (v === "--source" ? [...a, process.argv[i + 1]] : a), []);
const extra = new Map();
for (const f of extraArgs) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, label, conf, evidence] = l.split("\t");
    if (!tiers.has(start)) continue; // an attribution for a non-function start is a bug in the source
    if (!LABELS.has(label) || label === "unknown") continue;
    const prev = extra.get(start);
    if (!prev || rank[conf] > rank[prev.conf]) extra.set(start, { conf, label, src: path.basename(f), evidence: evidence || "" });
  }
}

// ---- demotions: rows that a recorded review refuted keep their label but stop counting as verified
const demoteArg = process.argv.reduce((a, v, i) => (v === "--demote" ? [...a, process.argv[i + 1]] : a), []);
const demoted = new Set();
for (const f of demoteArg) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const start = parseInt(l.split("\t")[0], 16);
    if (Number.isFinite(start)) demoted.add(start);
  }
}

// ---- merge at best confidence
const best = new Map(); // start -> {conf, label, src}
for (const [start, t] of tiers) {
  if (t.label && t.label !== "unknown" && !demoted.has(parseInt(start, 16))) {
    // tier A = address prediction agreed with propagation; tier B = propagation only. Both are recorded so the
    // report can separate "verified" from "labelled but unverified" instead of hiding the second group.
    best.set(start, { conf: t.tier === "A" ? "A" : "B", label: t.label, src: "spine" });
  }
}
for (const [start, a] of adjud) {
  const cur = best.get(start);
  if (!cur || rank[a.conf] > rank[cur.conf]) best.set(start, { conf: a.conf, label: a.label, src: a.src });
}
for (const [start, a] of extra) {
  const cur = best.get(start);
  if (!cur || rank[a.conf] > rank[cur.conf]) best.set(start, { conf: a.conf, label: a.label, src: a.src, evidence: a.evidence });
}

const sum = (pred) => {
  let fn = 0, ins = 0;
  for (const [start, b] of best) if (pred(b)) { fn++; ins += tiers.get(start).insns; }
  return { fn, ins };
};
const pct = (x, t) => (t ? ((100 * x) / t).toFixed(1) + "%" : "-");

const A = sum((b) => b.conf === "A");
const B = sum((b) => b.conf === "B");
const rows = [["class", "functions", "insns", "pct_insns", "pct_functions"]];
rows.push(["tier A (verified)", String(A.fn), String(A.ins), pct(A.ins, totalIns), pct(A.fn, totalFn)]);
rows.push(["conf B (unverified)", String(B.fn), String(B.ins), pct(B.ins, totalIns), pct(B.fn, totalFn)]);
rows.push(["headline A only", String(A.fn), String(A.ins), pct(A.ins, totalIns), pct(A.fn, totalFn)]);
rows.push(["unattributed", String(totalFn - A.fn - B.fn), String(totalIns - A.ins - B.ins), pct(totalIns - A.ins - B.ins, totalIns), pct(totalFn - A.fn - B.fn, totalFn)]);

const byLabel = new Map();
for (const [start, b] of best) {
  if (b.conf !== "A") continue;
  const k = b.label;
  const v = byLabel.get(k) || { fn: 0, ins: 0 };
  v.fn++; v.ins += tiers.get(start).insns;
  byLabel.set(k, v);
}
const bySrc = new Map();
for (const [, b] of best) {
  if (b.conf !== "A") continue;
  const v = bySrc.get(b.src) || { fn: 0, ins: 0 };
  v.fn++; v.ins += tiers.get(b.src) ? 0 : 0;
  bySrc.set(b.src, v);
}

fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`denominator: ${totalFn} functions, ${totalIns} instructions`);
console.log(rows.map((r) => r.join("\t")).join("\n"));
console.log("\ntier A by label (instructions desc):");
for (const [k, v] of [...byLabel].sort((a, b) => b[1].ins - a[1].ins)) {
  console.log(`  ${k.padEnd(14)} ${String(v.fn).padStart(6)} fn  ${(v.ins / 1e6).toFixed(2).padStart(6)} M  ${pct(v.ins, totalIns).padStart(6)}`);
}
if (extraArgs.length) {
  console.log("\ncontribution of the extra sources (A only):");
  for (const f of extraArgs) {
    const name = path.basename(f);
    const c = sum((b) => b.conf === "A" && b.src === name);
    console.log(`  ${name.padEnd(28)} ${String(c.fn).padStart(6)} fn  ${pct(c.ins, totalIns)}`);
  }
}
console.log(`\nwrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
