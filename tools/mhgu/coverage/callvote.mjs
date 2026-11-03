// callvote.mjs — extend labels by validated one-hop inference, kept in its own confidence class.
//
// Rule: a function that calls two or more "high-purity" callees (callees whose A-direct callers are >=85% one label,
// over >=12 callers) and receives one unambiguous label is very likely that subsystem. This is inference, not
// observation, so rows are written to attr-callvote.tsv as confidence "V" and are never merged into A-direct.
//
// Two rounds, each validated before use, holding out one evidence file at a time:
//   round 1  anchors = A-direct.                    1757/1831 = 96.0%
//   round 2  anchors = A-direct + round-1 rows, with the V rows REBUILT inside every fold so the held-out file cannot
//            leak into its own prediction.          2082/2210 = 94.2%
// Requiring more votes does not help (>=3 votes scores 95.5%, >=4 scores 94.0%): the votes are correlated. A third round
// is deliberately not attempted — each hop costs about two points of precision and the folds get expensive to keep clean.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));

const anchorsByFile = new Map();
const direct = new Map();
for (const f of src) {
  const p = path.join(INV, f);
  if (!fs.existsSync(p) || f === "attr-fingerprint.tsv") continue;
  const m = new Map();
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, conf] = l.split("\t");
    if (conf !== "A") continue;
    m.set(s.toLowerCase(), lab);
    if (!direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
  anchorsByFile.set(f, m);
}

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));

const purity = (anchors) => {
  const stat = new Map();
  for (const [s, lab] of anchors) {
    const f = byStart.get(s);
    if (!f) continue;
    for (const c of new Set(f.callees)) {
      if (!stat.has(c)) stat.set(c, new Map());
      const m = stat.get(c);
      m.set(lab, (m.get(lab) || 0) + 1);
    }
  }
  const pure = new Map();
  for (const [c, m] of stat) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    if (tot < 12) continue;
    const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n / tot >= 0.85) pure.set(c, { lab, n, tot });
  }
  return pure;
};
const vote = (f, pure) => {
  const votes = new Map();
  for (const c of new Set(f.callees)) { const h = pure.get(c); if (h) { const v = votes.get(h.lab) || []; v.push(h); votes.set(h.lab, v); } }
  if (votes.size !== 1) return null;
  const [lab, hits] = [...votes][0];
  return hits.length >= 2 ? { lab, hits } : null;
};

// ---- round 1 validation (A anchors, leave one file out)
let t1 = 0, c1 = 0;
const conf1 = new Map();
for (const holdFile of anchorsByFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of anchorsByFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const pure = purity(anchor);
  for (const [s, truth] of anchorsByFile.get(holdFile)) {
    const f = byStart.get(s);
    if (!f) continue;
    const v = vote(f, pure);
    if (!v) continue;
    t1++; if (v.lab === truth) c1++; else conf1.set(truth + "->" + v.lab, (conf1.get(truth + "->" + v.lab) || 0) + 1);
  }
}
const loo1 = t1 ? (100 * c1 / t1).toFixed(1) : "n/a";

// ---- round 1 rows over the whole corpus
const pure1 = purity(direct);
const r1 = new Map();
for (const f of fns) {
  if (direct.has(f.s)) continue;
  const v = vote(f, pure1);
  if (v) r1.set(f.s, v);
}

// ---- round 2 validation (A + round-1 anchors, V rebuilt inside each fold)
let t2 = 0, c2 = 0;
for (const holdFile of anchorsByFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of anchorsByFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const held = new Set(anchorsByFile.get(holdFile).keys());
  const p1 = purity(anchor);
  const v = new Map();
  for (const f of fns) {
    if (anchor.has(f.s) || held.has(f.s)) continue;
    const got = vote(f, p1);
    if (got) v.set(f.s, got);
  }
  const p2 = purity(new Map([...[...v].map(([s, g]) => [s, g.lab]), ...anchor]));
  for (const [s, truth] of anchorsByFile.get(holdFile)) {
    const f = byStart.get(s);
    if (!f) continue;
    const got = vote(f, p2);
    if (!got) continue;
    t2++; if (got.lab === truth) c2++;
  }
}
const loo2 = t2 ? (100 * c2 / t2).toFixed(1) : "n/a";

// ---- round 2 rows over the whole corpus
const anchors2 = new Map([...[...r1].map(([s, g]) => [s, g.lab]), ...direct]);
const pure2 = purity(anchors2);
const out = [["start", "label", "conf", "evidence"]];
const tally = { round1: 0, round2: 0 };
const perLabel = new Map();
for (const f of fns) {
  if (direct.has(f.s)) continue;
  const v1 = r1.get(f.s);
  const v = v1 || vote(f, pure2);
  if (!v) continue;
  const round = v1 ? 1 : 2;
  tally["round" + round]++;
  perLabel.set(v.lab, (perLabel.get(v.lab) || 0) + 1);
  out.push([f.s, v.lab, "V", `callee vote round ${round}: ${v.hits.length} high-purity callees agree on ${v.lab} (` +
    v.hits.map((h) => h.n + "/" + h.tot).join(", ") + `); rule validated leave-one-file-out at ${round === 1 ? loo1 : loo2}%`]);
}
fs.writeFileSync(path.join(INV, "attr-callvote.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`round1 LOO ${c1}/${t1} = ${loo1}% (confusions: ${[...conf1].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x.join(":")).join(" ")})`);
console.log(`round2 LOO ${c2}/${t2} = ${loo2}%`);
console.log(`wrote ${out.length - 1} rows (round1 ${tally.round1}, round2 ${tally.round2}):`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
