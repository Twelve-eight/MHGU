// recompute.mjs — rebuild the attribution tiers from the committed function list, so the 52.2% headline has a
// recomputable derivation instead of depending on a scratch functions4.csv that no longer exists.
//
// Method (ported from tools/mhgu/tiers-all.mjs, which read .tmp/mhgu/inventory/functions4.csv):
//   1. seeds   functions whose string table matches one of the subsystem regexes
//   2. spread  label propagation over caller/callee edges, 8 rounds, majority vote
//   3. predict leave-one-out style: a function's label predicted from its nearest labelled neighbour by address
//   4. tier    A = prediction equals the propagated label, B = both exist but differ, C = one side missing
//
// Output: docs/analysis/code/inventory/tiers-recomputed.csv (start,insns,tier,label,src)
// and a summary that can be compared with tiers.csv row by row.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { RULES, LABELS, labelOf } from "./taxonomy.mjs";

const ROOT = "G:/omp works/MHGU";
const fnArg = process.argv.reduce((a, v, i) => (v === "--functions" ? process.argv[i + 1] : a), []);
const SRC = fnArg || path.join(ROOT, "docs/data/functions.csv.gz"); // use docs/data/functions-retile.csv.gz for real functions
const OLD = path.join(ROOT, "docs/analysis/code/inventory/tiers.csv");
// Two spines, never one file doing both jobs: the no-seed run keeps tiers-recomputed.csv as the reproducible baseline
// (string rules only), and any run that adds --seed evidence files writes tiers-merged.csv. Overwriting the baseline with
// a seeded run would make "what do the rules alone say" unanswerable, which is exactly how the earlier numbers drifted.
const seeded = process.argv.includes("--seed");
const OUT = path.join(ROOT, "docs/analysis/code/inventory", seeded ? "tiers-merged.csv" : "tiers-recomputed.csv");

// rules come from taxonomy.mjs (single definition shared with the evidence generators)

// ---- load
const text = zlib.gunzipSync(fs.readFileSync(SRC)).toString("utf8");
const rows = [];
for (const l of text.split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/.exec(l);
  if (!m) continue;
  rows.push({
    s: parseInt(m[1], 16),
    e: parseInt(m[2], 16),
    n: Number(m[3]),
    callees: m[5] ? m[5].split("|").filter(Boolean).map((x) => parseInt(x, 16)) : [],
    strings: m[6] || "",
  });
}
rows.sort((a, b) => a.s - b.s);

// ---- seeds (built-in string rules plus any --seed TSV: start,label,conf,evidence)
const extraSeedFiles = process.argv.reduce((a, v, i) => (v === "--seed" ? [...a, process.argv[i + 1]] : a), []);
// conf B is a suggestion, not evidence: it must not seed propagation. Pass --accept-b to opt in for an experiment; the
// per-file counters make the difference visible.
const acceptB = process.argv.includes("--accept-b");
const rank = { A: 2, B: 1 };
const startSet = new Set(rows.map((r) => r.s));
const external = new Map(); // start -> {label, conf, src}
for (const f of extraSeedFiles) {
  let acc = 0, rejStart = 0, rejLabel = 0, rejConf = 0;
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, label, conf, evidence] = l.split("\t");
    const v = parseInt(start, 16);
    if (!startSet.has(v)) { rejStart++; continue; } // attribution for a non-function start is a source bug
    if (!LABELS.has(label)) { rejLabel++; continue; }
    if (conf !== "A" && !acceptB) { rejConf = (rejConf || 0) + 1; continue; }
    const prev = external.get(v);
    if (!prev || (rank[conf] || 0) > (rank[prev.conf] || 0)) { external.set(v, { label, conf, src: path.basename(f), evidence: evidence || "" }); acc++; }
  }
  console.log(`  seed file ${path.basename(f)}: accepted ${acc}, rejected non-start ${rejStart}, rejected bad label ${rejLabel}, rejected conf-B ${rejConf}`);
}
// Demotions (docs/analysis/code/inventory/demote-*.tsv) are part of the calculation, not a display filter: a demoted
// function may not seed, may not vote and may not carry a label, otherwise its label keeps spreading even though the
// report would hide it.
const demoted = new Set();
// pins.tsv is the same mechanism as a demotion but permanent and explained per row: a hub function whose label came from
// votes may not be relabelled by those same votes.
for (const f of fs.readdirSync(path.join(ROOT, "docs/analysis/code/inventory")).filter((x) => /^(demote-.*|pins)\.tsv$/.test(x))) {
  for (const l of fs.readFileSync(path.join(ROOT, "docs/analysis/code/inventory", f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const v = parseInt(l.split("\t")[0], 16);
    if (Number.isFinite(v)) demoted.add(v);
  }
}
console.log(`demoted starts: ${demoted.size}`);
const seeds = [];
for (const r of rows) {
  if (demoted.has(r.s)) continue;
  const lab = labelOf(r.strings);
  if (lab) seeds.push({ r, lab });
}
for (const [start, e] of external) if (!demoted.has(start)) seeds.push({ r: rows.find((r) => r.s === start), lab: e.label, ext: e });
console.log(`functions ${rows.length}, seeded ${seeds.length} (${((100 * seeds.length) / rows.length).toFixed(1)}%) [${extraSeedFiles.length} external file(s)]`);

// ---- spread
const rev = new Map();
for (const r of rows) for (const c of r.callees) {
  if (!rev.has(c)) rev.set(c, []);
  rev.get(c).push(r.s);
}
const L = new Map();
for (const s of seeds) L.set(s.r.s, s.lab);
for (let it = 0; it < 8; it++) {
  let changed = 0;
  for (const r of rows) {
    if (L.has(r.s) || demoted.has(r.s)) continue;
    const vote = new Map();
    for (const c of r.callees) { if (demoted.has(c)) continue; const l = L.get(c); if (l) vote.set(l, (vote.get(l) || 0) + 1); }
    for (const p of rev.get(r.s) || []) { if (demoted.has(p)) continue; const l = L.get(p); if (l) vote.set(l, (vote.get(l) || 0) + 1); }
    if (!vote.size) continue;
    const best = [...vote.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0];
    // one agreeing neighbour is a coincidence, two is a signal: a single vote used to be enough, which let any seed
    // bleed across the whole call graph in eight iterations
    if (best[1] >= 2) { L.set(r.s, best[0]); changed++; }
  }
  if (!changed) break;
}

// ---- address-neighbour prediction, using only seeds as anchors
const train = seeds.slice().sort((a, b) => a.r.s - b.r.s);
const predict = (addr) => {
  let lo = 0, hi = train.length - 1, best = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (train[mid].r.s <= addr) { best = train[mid]; lo = mid + 1; } else hi = mid - 1; }
  let right = null;
  for (const t of train) if (t.r.s > addr) { right = t; break; }
  if (!best) return right ? right.lab : null;
  if (!right) return best.lab;
  return addr - best.r.e <= right.r.s - addr ? best.lab : right.lab;
};

// ---- tiers
const outRows = [["start", "insns", "tier", "label", "src"]];
const counts = { A: 0, B: 0, C: 0 };
let aIns = 0, totalIns = 0;
for (const r of rows) {
  totalIns += r.n;
  const pred = predict(r.s);
  const got = L.get(r.s);
  let tier, label, src;
  if (pred && got && pred === got) { tier = "A"; label = got; src = "spread+address"; }
  else if (pred && got) { tier = "B"; label = got; src = "spread"; }
  else { tier = "C"; label = got || ""; src = got ? "spread" : ""; }
  counts[tier]++;
  if (tier === "A") aIns += r.n;
  outRows.push([`0x${r.s.toString(16)}`, String(r.n), tier, label || "", src]);
}
fs.writeFileSync(OUT, outRows.map((x) => x.join(",")).join("\n") + "\n");
console.log(`recomputed: A ${counts.A} (${((100 * aIns) / totalIns).toFixed(1)}% insns), B ${counts.B}, C ${counts.C}`);
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);

// ---- compare with the committed tiers.csv
if (fs.existsSync(OLD)) {
  const old = new Map();
  for (const l of fs.readFileSync(OLD, "utf8").split("\n").slice(1)) {
    if (!l) continue;
    const [s, ins, t, lab] = l.split(",");
    old.set(s, { t, lab });
  }
  let same = 0, diffTier = 0, missing = 0;
  for (const [start, , tier, lab] of outRows.slice(1)) {
    const o = old.get(start);
    if (!o) { missing++; continue; }
    if (o.t === tier && (o.lab || "") === (lab || "")) same++;
    else diffTier++;
  }
  console.log(`vs tiers.csv: identical ${same}, differing ${diffTier}, not-in-old ${missing} (of ${outRows.length - 1})`);
}
