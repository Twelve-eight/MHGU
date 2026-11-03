// spread-precision-independent.mjs — the honest version of the spread measurement.
//
// The older script scored spread predictions against tiers-merged.csv labels, but those labels are produced by the same
// neighbour-voting propagation that makes the prediction: the rule scores itself. Here the truth is A-direct evidence only,
// which no propagation produces, and the prediction for a function inside a window uses evidence from outside that window.
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
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
const per = new Map();
const buckets = new Map();
let ok = 0, n = 0;
const WIN = 0x100000;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inWin = (a) => a >= w && a < w + WIN;
    for (const f of fns) {
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue; // truth must be A-direct, which the propagation never produces
      const votes = new Map();
      for (const c of f.callees) {
        const k = "0x" + c.toString(16);
        if (inWin(c)) continue;
        const lab = A.get(k);
        if (lab) votes.set(lab, (votes.get(lab) || 0) + 1);
      }
      for (const p of rev.get(f.s) || []) {
        if (inWin(parseInt(p, 16))) continue;
        const lab = A.get(p);
        if (lab) votes.set(lab, (votes.get(lab) || 0) + 1);
      }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      n++;
      if (top[0][0] === truth) ok++;
      const bk = top[0][1] >= 3 ? "3+" : String(top[0][1]);
      const b = buckets.get(bk) || { n: 0, ok: 0 };
      b.n++; if (top[0][0] === truth) b.ok++;
      buckets.set(bk, b);
      const e = per.get(truth) || { n: 0, ok: 0 };
      e.n++;
      if (top[0][0] === truth) e.ok++;
      per.set(truth, e);
    }
  }
}
// Persist the per-label numbers: the coverage report weights the spread class by them instead of applying one pooled
// figure to every label, because monster-em (22.6%) and quest (14.0%) sit under the same pool as online-nex (99.8%).
{
  const out = ["label\taccuracy\tcp95"];
  for (const [lab, e] of per) out.push(`${lab}\t${(e.ok / e.n).toFixed(4)}\t${cp(e.ok, e.n).toFixed(1)}`);
  fs.writeFileSync(INV + "spread-accuracy.tsv", out.join("\n") + "\n");
}
console.log(`spread rule vs A-direct truth (independent): ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}%  CP95 ${cp(ok, n).toFixed(1)}%`);
for (const [k, e] of [...buckets].sort()) console.log(`  votes ${k}: ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
for (const [lab, e] of [...per].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${lab.padEnd(16)} ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
