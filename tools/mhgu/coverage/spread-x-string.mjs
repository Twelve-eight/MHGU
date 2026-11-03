// spread-x-string.mjs — does the string-consensus agreeing with a spread label make that label trustworthy?
//
// The spread rule and the string rule are different signals, but on the rows that already carry a spread label the two
// agreed 1,060 times and disagreed zero times, which is too clean to be independent. This script answers the question that
// matters instead: among the spread predictions the pipeline makes (call-graph votes from outside a 1 MB window, measured
// against A-direct truth as in spread-precision-independent.mjs), is the subset that string consensus also endorses more
// accurate than the 72.4% pool? If it is, those rows may be published; if it is not, the agreement is structural.
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
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const strs = new Map();
for (const l of fs.readFileSync(INV + "stringxref.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t");
  const s = c[0].toLowerCase();
  if (!strs.has(s)) strs.set(s, new Set());
  strs.get(s).add(c[1]);
}
const voters = new Map(); // string -> [{addr,label}]
for (const [s, lab] of A) {
  const f = fns.find((x) => x.s === s);
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
let n = 0, ok = 0, fN = 0, fOk = 0, disagree = 0;
const byLabel = new Map();
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const wEnd = w + WIN;
    const inWin = (a) => a >= w && a < wEnd;
    for (const f of fns) {
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue;
      // spread prediction: call-graph votes from outside the window
      const votes = new Map();
      for (const c of f.callees) { if (inWin(c)) continue; const lab = A.get("0x" + c.toString(16)); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
      for (const p of rev.get(f.s) || []) { if (inWin(parseInt(p, 16))) continue; const lab = A.get(p); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      n++; if (top[0][0] === truth) ok++;
      // string consensus from outside the window
      const tally = new Map();
      for (const nm of strs.get(f.s) || []) for (const v of voters.get(nm) || []) { if (v.a >= w && v.a < wEnd) continue; tally.set(v.l, (tally.get(v.l) || 0) + 1); }
      if (!tally.size) continue;
      const ent = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      if (ent[0][1] < 5 || ent.length > 1) continue;
      if (ent[0][0] !== top[0][0]) { disagree++; continue; }
      fN++; if (top[0][0] === truth) fOk++;
      const e = byLabel.get(top[0][0]) || { n: 0, ok: 0 };
      e.n++; if (top[0][0] === truth) e.ok++;
      byLabel.set(top[0][0], e);
    }
  }
}
console.log(`spread rule alone: ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}%  CP95 ${cp(ok, n).toFixed(1)}%`);
console.log(`spread AND string consensus agreeing: ${fOk}/${fN} = ${fN ? ((100 * fOk) / fN).toFixed(1) : "-"}%  CP95 ${fN ? cp(fOk, fN).toFixed(1) : "-"}%`);
console.log(`cases where the two rules disagree: ${disagree}`);
for (const [k, e] of [...byLabel].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(16)} ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%`);
