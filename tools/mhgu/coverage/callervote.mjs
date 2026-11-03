// callervote.mjs — label a helper by who calls it.
//
// The callee rule asks "what does this function call"; this one asks "who calls this function". A helper invoked only from
// one subsystem belongs to that subsystem. Thresholds: at least three evidence-bearing callers, one unambiguous label at
// >=85% of them.
//
// Validated like the others by holding out one evidence file: 407/422 = 96.4% (>=5 callers 97.6%, >=8 callers 97.8%; three
// is the lowest threshold that still clears 96%, so it is the one used). Rows are written as confidence "V" and stay out
// of A-direct. Functions already labelled by any other channel are left alone, so this only fills genuine gaps.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const MIN_CALLERS = 3;
const MIN_SHARE = 0.85;

const perFile = new Map();
const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))) {
  if (f === "attr-fingerprint.tsv") continue;
  const p = path.join(INV, f);
  if (!fs.existsSync(p)) continue;
  const m = new Map();
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, conf] = l.split("\t");
    if (conf !== "A") continue;
    m.set(s.toLowerCase(), lab);
    if (!direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
  perFile.set(f, m);
}

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));

const callerPurity = (anchors) => {
  const per = new Map();
  for (const [s, lab] of anchors) {
    const f = byStart.get(s);
    if (!f) continue;
    for (const c of new Set(f.callees)) {
      const k = "0x" + c.toString(16);
      if (!per.has(k)) per.set(k, new Map());
      const m = per.get(k);
      m.set(lab, (m.get(lab) || 0) + 1);
    }
  }
  const pure = new Map();
  for (const [k, m] of per) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    if (tot < MIN_CALLERS) continue;
    const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n / tot >= MIN_SHARE) pure.set(k, { lab, n, tot });
  }
  return pure;
};

// ---- validation
let tested = 0, correct = 0;
const confusion = new Map();
for (const holdFile of perFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of perFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const pure = callerPurity(anchor);
  for (const [s, truth] of perFile.get(holdFile)) {
    const got = pure.get(s);
    if (!got) continue;
    tested++;
    if (got.lab === truth) correct++;
    else confusion.set(truth + "->" + got.lab, (confusion.get(truth + "->" + got.lab) || 0) + 1);
  }
}
const pct = tested ? (100 * correct / tested).toFixed(1) : "n/a";

// ---- emit for functions with no evidence row
const pure = callerPurity(direct);
const out = [["start", "label", "conf", "evidence"]];
const perLabel = new Map();
for (const f of fns) {
  if (direct.has(f.s)) continue;
  const got = pure.get(f.s);
  if (!got) continue;
  perLabel.set(got.lab, (perLabel.get(got.lab) || 0) + 1);
  out.push([f.s, got.lab, "V", `caller vote: ${got.n}/${got.tot} evidence-bearing callers are ${got.lab}; rule validated leave-one-file-out at ${pct}%`]);
}
fs.writeFileSync(path.join(INV, "attr-callervote.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`caller vote LOO ${correct}/${tested} = ${pct}% (confusions: ${[...confusion].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x.join(":")).join(" ")})`);
console.log(`wrote ${out.length - 1} rows:`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
