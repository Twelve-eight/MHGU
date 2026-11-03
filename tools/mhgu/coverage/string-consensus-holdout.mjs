// string-consensus-holdout.mjs — the string-sharing rule measured with the same independent yardstick as the other channels.
//
// Rule: a function that references a string shared by >=3 A-direct functions, all with the same label, gets that label.
// Truth is A-direct evidence only (propagation never produces A-direct), and voters must sit outside the 1 MB window that
// contains the target, so no function is ever predicted from its own neighbourhood. This decides whether the rule may be
// published; the earlier leave-one-out on evidence rows was measured on a different population.
//
// Efficient form: the voter index is built once (string -> [{addr,label}]), and a window is handled by an address test
// inside the inner loop. Building voters per window made this quadratic and it never finished.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" || f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));

const strs = new Map();
for (const l of fs.readFileSync(INV + "stringxref.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t");
  const s = c[0].toLowerCase();
  if (!strs.has(s)) strs.set(s, new Set());
  strs.get(s).add(c[1]);
}

const voters = new Map(); // string -> [{addr,label}]
for (const [s, lab] of A) {
  const f = byStart.get(s);
  if (!f) continue;
  for (const n of strs.get(s) || []) {
    if (!voters.has(n)) voters.set(n, []);
    voters.get(n).push({ a: f.a, l: lab });
  }
}

const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};

const WIN = 0x100000;
let ok = 0, bad = 0, predictedNoTruth = 0, predictedNoTruthIns = 0;
const perLabel = new Map();
const wrongExamples = [];
const reachIns = [];
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const wEnd = w + WIN;
    for (const f of fns) {
      if (f.a < w || f.a >= wEnd) continue;
      const names = strs.get(f.s);
      if (!names) continue;
      const tally = new Map();
      for (const n of names) {
        for (const v of voters.get(n) || []) {
          if (v.a >= w && v.a < wEnd) continue; // voter inside the window: its own label may be the prediction
          tally.set(v.l, (tally.get(v.l) || 0) + 1);
        }
      }
      if (!tally.size) continue;
      const ent = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      if (ent[0][1] < 3 || ent.length > 1) continue;
      const pred = ent[0][0];
      const truth = A.get(f.s);
      if (!truth) { predictedNoTruth++; predictedNoTruthIns += f.n; reachIns.push(f.n); continue; }
      const t = perLabel.get(pred) || { ok: 0, bad: 0 };
      if (pred === truth) { ok++; t.ok++; } else { bad++; t.bad++; if (wrongExamples.length < 6) wrongExamples.push(`${f.s} true=${truth} pred=${pred} votes=${ent[0][1]}`); }
      perLabel.set(pred, t);
    }
  }
}
const n = ok + bad;
console.log(`string consensus, independent holdout: ${ok}/${n} = ${n ? ((100 * ok) / n).toFixed(1) : "-"}%  CP95 lower ${n ? cp(ok, n).toFixed(1) : "-"}%`);
console.log(`reach on functions without A-direct truth: ${predictedNoTruth} (${predictedNoTruthIns} instructions)`);
console.log("per predicted label: " + [...perLabel.entries()].map(([k, v]) => `${k} ${v.ok}/${v.ok + v.bad}`).join("  "));
for (const e of wrongExamples) console.log("  wrong: " + e);

// Threshold sweep: the publishable form is the one with the most reach that still clears 90% on this yardstick.
console.log("\nthreshold sweep (votes = A-direct voters outside the window, all agreeing):");
for (const MIN of [1, 2, 3, 5, 8, 12]) {
  let o = 0, b = 0, reach = 0;
  for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
    for (let w = off; w < 0x1400000; w += WIN) {
      const wEnd = w + WIN;
      for (const f of fns) {
        if (f.a < w || f.a >= wEnd) continue;
        const names = strs.get(f.s);
        if (!names) continue;
        const tally = new Map();
        for (const n of names) for (const v of voters.get(n) || []) { if (v.a >= w && v.a < wEnd) continue; tally.set(v.l, (tally.get(v.l) || 0) + 1); }
        if (!tally.size) continue;
        const ent = [...tally.entries()].sort((x, y) => y[1] - x[1]);
        if (ent[0][1] < MIN || ent.length > 1) continue;
        const truth = A.get(f.s);
        if (!truth) { reach++; continue; }
        if (ent[0][0] === truth) o++; else b++;
      }
    }
  }
  const t = o + b;
  console.log(`  >=${String(MIN).padStart(2)} votes: ${o}/${t} = ${t ? ((100 * o) / t).toFixed(1) : "-"}%  CP95 ${t ? cp(o, t).toFixed(1) : "-"}  reach(no truth) ${reach}`);
}
