// immscan.mjs — sweep 32-bit constants assembled by movw/movt in .text, score each by how exclusively it belongs to one
// label, then use the winners as field-offset fingerprints.
//
// The constant is the *effective* one: a movw followed by a movt on the same register gives movw | movt<<16, and that is
// what gets scored. Reading only the movw half would conflate a genuine 0xc08 offset with the low half of 0x10c08 — the
// 0xc08/0xc07 sites are followed by a movt at 59%/34%, so a large share of them are 32-bit constants, and the earlier
// version of this scan could not tell the two apart.
//
// Adoption bar: at least 15 labelled carriers, at least 99% agreement on one label, and the precision of the rule itself
// measured by holding one evidence file out at a time (printed on every run, and stored with the rows). Softer settings
// were tried and rejected: >=10 carriers at >=90% scored 91.0% fold-wise, >=20 at >=95% scored 94.7%; >=15 at >=99% scores 97.0% fold-wise and 97.5% region-held-out (>=30 at >=99% scores 98.3%, so the looser bar trades 0.8 points for 425 more rows).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_START = 0x218, TEXT_END = 0x13f1dec;
const MIN_CARRIERS = 15, MIN_SHARE = 0.99;

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16) }; });
fns.sort((a, b) => a.s - b.s);
const fnAt = (a) => {
  let lo = 0, hi = fns.length - 1, best = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (fns[m].s <= a) { best = fns[m]; lo = m + 1; } else hi = m - 1; }
  return best && a < best.e ? best : null;
};

const perFile = new Map();
const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))) {
  if (!fs.existsSync(path.join(INV, f))) continue;
  const m = new Map();
  for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c] = l.split("\t");
    if (c !== "A" || !lab || lab === "unknown") continue;
    const k = "0x" + parseInt(s, 16).toString(16);
    m.set(k, lab);
    if (!direct.has(k)) direct.set(k, lab);
  }
  perFile.set(f, m);
}

const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const imm = (w) => (((w >> 16) & 0xf) << 12) | (w & 0xfff);
const isMovw = (w) => (w & 0x0ff00000) === 0x03000000;
const isMovt = (w) => (w & 0x0ff00000) === 0x03400000;
const regOf = (w) => (w >> 12) & 0xf;

// function -> set of effective constants
const constOf = new Map();
for (let a = TEXT_START; a + 8 <= TEXT_END; a += 4) {
  const w = rd(a);
  if (!isMovw(w)) continue;
  const f = fnAt(a);
  if (!f) continue;
  const nxt = rd(a + 4);
  let value = imm(w);
  if (isMovt(nxt) && regOf(nxt) === regOf(w)) value += imm(nxt) * 0x10000;
  const k = "0x" + f.s.toString(16);
  if (!constOf.has(k)) constOf.set(k, new Set());
  constOf.get(k).add(value);
}

// ---- fold-wise precision of the rule itself
let tested = 0, correct = 0;
const confusion = new Map();
for (const holdFile of perFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of perFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const stat = new Map();
  for (const [s, lab] of anchor) for (const v of constOf.get(s) || []) { if (!stat.has(v)) stat.set(v, new Map()); const m = stat.get(v); m.set(lab, (m.get(lab) || 0) + 1); }
  const pure = new Map();
  for (const [v, m] of stat) { const tot = [...m.values()].reduce((a, b) => a + b, 0); if (tot < MIN_CARRIERS) continue; const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0]; if (n / tot >= MIN_SHARE) pure.set(v, lab); }
  for (const [s, truth] of perFile.get(holdFile)) {
    const votes = new Map();
    for (const v of constOf.get(s) || []) { const l = pure.get(v); if (l) votes.set(l, (votes.get(l) || 0) + 1); }
    if (votes.size !== 1) continue;
    const [lab] = [...votes][0];
    tested++; if (lab === truth) correct++;
    else confusion.set(truth + "->" + lab, (confusion.get(truth + "->" + lab) || 0) + 1);
  }
}
const pct = tested ? (100 * correct / tested).toFixed(1) : "n/a";

// ---- emit for functions with no direct evidence
const already = new Set(direct.keys());
for (const f of fs.readdirSync(INV).filter((x) => /^attr-.*vote\.tsv$/.test(x))) {
  for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, , c] = l.split("\t");
    if (c === "V") already.add("0x" + parseInt(s, 16).toString(16));
  }
}
const stat = new Map();
for (const [s, lab] of direct) for (const v of constOf.get(s) || []) { if (!stat.has(v)) stat.set(v, new Map()); const m = stat.get(v); m.set(lab, (m.get(lab) || 0) + 1); }
const pure = new Map();
for (const [v, m] of stat) { const tot = [...m.values()].reduce((a, b) => a + b, 0); if (tot < MIN_CARRIERS) continue; const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0]; if (n / tot >= MIN_SHARE) pure.set(v, { lab, n, tot }); }

const out = [["start", "label", "conf", "evidence"]];
const score = [["constant", "carriers", "labelled", "top_label", "share", "adopted"]];
let rows = 0;
const carriersOf = new Map();
for (const [, set] of constOf) for (const v of set) carriersOf.set(v, (carriersOf.get(v) || 0) + 1);
for (const [v, h] of [...pure].sort((a, b) => b[1].tot - a[1].tot).slice(0, 60)) {
  score.push(["0x" + v.toString(16), carriersOf.get(v) || 0, h.tot, h.lab, (h.n / h.tot).toFixed(2), "adopt"]);
}
for (const [v, h] of pure) {
  for (const [s, set] of constOf) {
    if (!set.has(v) || already.has(s)) continue;
    rows++;
    out.push([s, h.lab, "S", `constant 0x${v.toString(16)} only (assembled movw/movt; ${h.n}/${h.tot} = ${(100 * h.n / h.tot).toFixed(0)}% of its labelled carriers are ${h.lab}); rule validated fold-wise at ${pct}% and this function has no other evidence`]);
  }
}
fs.writeFileSync(path.join(INV, "attr-immscan.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-immscan-score.tsv"), score.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`constants at >=${MIN_CARRIERS} labelled carriers and >=${MIN_SHARE * 100}%: ${pure.size}`);
console.log(`fold-wise precision of this rule: ${correct}/${tested} = ${pct}% (confusions: ${[...confusion].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x.join(":")).join(" ")})`);
console.log(`rows written ${rows}`);
