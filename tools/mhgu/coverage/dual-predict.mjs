// dual-predict.mjs — re-measure the historical Tier A rule: call-graph prediction AND address-locality prediction agree.
//
// code-metrics.md reported 94.7% for that conjunction, measured against held-out string seeds. The pipeline has since moved
// to A-direct evidence as truth and a retiled function table, so the rule has to be re-measured before it can be reused.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" || f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv" || f === "attr-fingerprint.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; })
  .sort((x, y) => x.a - y.a);
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const cp = (o, n) => { if (!n) return 0; const p = o / n, z = 1.959963985, d = 1 + z * z / n; return ((p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d) * 100; };
const LOCAL = Number(process.env.LOCAL || 8);
const WIN = 0x100000;
const seen = new Map(); // function start -> {ok, n} so the five grids cannot count the same function five times
let ok = 0, n = 0;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inWin = (a) => a >= w && a < w + WIN;
    for (let i = 0; i < fns.length; i++) {
      const f = fns[i];
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue;
      // call-graph prediction
      const cv = new Map();
      for (const c of f.callees) { if (inWin(c)) continue; const l = A.get("0x" + c.toString(16)); if (l) cv.set(l, (cv.get(l) || 0) + 1); }
      for (const p of rev.get(f.s) || []) { if (inWin(parseInt(p, 16))) continue; const l = A.get(p); if (l) cv.set(l, (cv.get(l) || 0) + 1); }
      if (!cv.size) continue;
      const cTop = [...cv].sort((a, b) => b[1] - a[1]);
      if (cTop.length > 1 && cTop[0][1] === cTop[1][1]) continue;
      // locality prediction: nearest labelled neighbours by address, both directions, outside the window
      const lv = new Map();
      for (let k = 1; k <= LOCAL && (i - k >= 0 || i + k < fns.length); k++) {
        for (const j of [i - k, i + k]) {
          const g = fns[j];
          if (!g || inWin(g.a)) continue;
          const l = A.get(g.s);
          if (l) lv.set(l, (lv.get(l) || 0) + 1);
        }
      }
      if (!lv.size) continue;
      const lTop = [...lv].sort((a, b) => b[1] - a[1]);
      if (lTop.length > 1 && lTop[0][1] === lTop[1][1]) continue;
      if (cTop[0][0] !== lTop[0][0]) continue; // the conjunction: both predictions agree
      n++;
      if (cTop[0][0] === truth) ok++;
      const u = seen.get(f.s) || { n: 0, ok: 0 };
      u.n++; if (cTop[0][0] === truth) u.ok++;
      seen.set(f.s, u);
    }
  }
}
// The five grids shift the window boundaries, so the same function is measured up to five times. Report both: the pair
// count is what the loop sees, the unique count is the honest sample size for the confidence bound.
let uOk = 0, uN = 0;
for (const [, u] of seen) { uN++; if (u.ok > 0) uOk++; }
console.log(`call-graph AND locality agree: pairs ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}% (CP95 ${cp(ok, n).toFixed(1)}%); unique ${uOk}/${uN} = ${((100 * uOk) / (uN || 1)).toFixed(1)}% (CP95 ${cp(uOk, uN).toFixed(1)}%)  (locality window ${LOCAL})`);
