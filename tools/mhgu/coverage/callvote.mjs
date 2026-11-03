// callvote.mjs — extend labels by a validated one-hop inference, kept in its own class.
//
// A function that calls two or more "high-purity" callees (callees whose A-direct callers are >=85% one label, with >=12
// callers) and gets one unambiguous label from them is very likely that subsystem. This is inference, not observation, so
// it is written to attr-callvote.tsv as confidence "V" and never merged into A-direct.
//
// It is only used because it was validated first: holding out one evidence file at a time and predicting that file's own
// labels from the other files, the rule scores 1757/1831 = 96.0% (confusions: otomo-ot->ui 53, item->ui 5, ui->render-gfx
// 5, physics-math->render-gfx 4). That number is printed on every run so a later reader can see it without re-deriving.
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

// ---- high-purity callees from the full anchor set
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

// ---- validation: hold out one file, predict its labels from the rest
let tested = 0, correct = 0;
const confusion = new Map();
for (const holdFile of anchorsByFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of anchorsByFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const pure = purity(anchor);
  for (const [s, truth] of anchorsByFile.get(holdFile)) {
    const f = byStart.get(s);
    if (!f) continue;
    const votes = new Map();
    for (const c of new Set(f.callees)) { const h = pure.get(c); if (h) votes.set(h.lab, (votes.get(h.lab) || 0) + 1); }
    if (votes.size !== 1) continue;
    const [lab, n] = [...votes][0];
    if (n < 2) continue;
    tested++;
    if (lab === truth) correct++;
    else confusion.set(truth + "->" + lab, (confusion.get(truth + "->" + lab) || 0) + 1);
  }
}
const loo = tested ? (100 * correct / tested).toFixed(1) : "n/a";

// ---- emit for functions with no direct evidence
const pure = purity(direct);
const out = [["start", "label", "conf", "evidence"]];
const perLabel = new Map();
for (const f of fns) {
  if (direct.has(f.s)) continue;
  const votes = new Map();
  for (const c of new Set(f.callees)) { const h = pure.get(c); if (h) { const v = votes.get(h.lab) || []; v.push(h); votes.set(h.lab, v); } }
  if (votes.size !== 1) continue;
  const [lab, hits] = [...votes][0];
  if (hits.length < 2) continue;
  perLabel.set(lab, (perLabel.get(lab) || 0) + 1);
  out.push([f.s, lab, "V", "callee vote: " + hits.map((h) => "0x" + h.n + "/" + h.tot).length + " high-purity callees agree on " + lab +
    " (" + hits.map((h) => h.n + "/" + h.tot).join(", ") + "); rule validated leave-one-file-out at " + loo + "% on " + tested + " cases"]);
}
fs.writeFileSync(path.join(INV, "attr-callvote.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`leave-one-file-out ${correct}/${tested} = ${loo}%`);
console.log("confusions:", [...confusion].sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x.join(":")).join(" "));
console.log(`wrote ${out.length - 1} inferred rows:`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
