// dual-seeds.mjs — emit the historical Tier A rule, re-validated: call-graph and address-locality must agree.
//
// dual-predict.mjs measured it on the retiled table with A-direct truth: 221/224 = 98.7% (CP95 96.1) at a 40-neighbour
// locality window. Locality alone was historically 88.1% and stays out; only the conjunction is used.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "attr-dualpredict.tsv";
const LOCAL = 40;

const A = new Map();
const anyLabel = new Set();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (f === "attr-dualpredict.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (!c[1] || c[1] === "unknown") continue;
    anyLabel.add(c[0].toLowerCase());
    if (c[2] === "A" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; })
  .sort((x, y) => x.a - y.a);
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const tiers = new Set();
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  if (c[3] && c[3] !== "unknown") tiers.add(c[0].toLowerCase());
}
const rows = [["start", "label", "conf", "evidence"]];
let emitted = 0;
for (let i = 0; i < fns.length; i++) {
  const f = fns[i];
  if (anyLabel.has(f.s) || tiers.has(f.s)) continue;
  const cv = new Map();
  for (const c of f.callees) { const l = A.get("0x" + c.toString(16)); if (l) cv.set(l, (cv.get(l) || 0) + 1); }
  for (const p of rev.get(f.s) || []) { const l = A.get(p); if (l) cv.set(l, (cv.get(l) || 0) + 1); }
  if (!cv.size) continue;
  const cTop = [...cv].sort((a, b) => b[1] - a[1]);
  if (cTop.length > 1 && cTop[0][1] === cTop[1][1]) continue;
  const lv = new Map();
  for (let k = 1; k <= LOCAL; k++) for (const j of [i - k, i + k]) {
    const g = fns[j];
    if (!g) continue;
    const l = A.get(g.s);
    if (l) lv.set(l, (lv.get(l) || 0) + 1);
  }
  if (!lv.size) continue;
  const lTop = [...lv].sort((a, b) => b[1] - a[1]);
  if (lTop.length > 1 && lTop[0][1] === lTop[1][1]) continue;
  if (cTop[0][0] !== lTop[0][0]) continue;
  rows.push([f.s, cTop[0][0], "V", `call-graph (${cTop[0][1]} A-labelled neighbours) and address locality (${lTop[0][1]} within ${LOCAL}) agree`]);
  emitted++;
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`emitted ${emitted} rows -> ${OUT.split("/").pop()}`);
