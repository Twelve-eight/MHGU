// classvote.mjs — label a function by what the rest of its class already proves.
//
// attr-vtable-retile.tsv names a class for every one of its 13,577 rows, including the 8,360 it left unlabelled. If the
// other members of that class carry direct evidence, the class itself is evidence for the remaining members. Threshold:
// at least two evidence-bearing members agreeing at >=90%.
//
// Validated the same way as the callee rule — hold out one evidence file, build the class consensus from the rest, then ask
// it to recover the held-out file's own labels: 6218/6262 = 99.3%. That is the strongest inference channel here, which is
// why it runs before any callee vote in the report.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));

const clsOf = new Map();
for (const l of fs.readFileSync(path.join(INV, "attr-vtable-retile.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t");
  const m = /^(\S+)/.exec(c[3] || "");
  if (m && c[1] === "unknown" && m[1] !== "CONFLICTING") clsOf.set(c[0].toLowerCase(), m[1]);
}

const perFile = new Map();
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
  perFile.set(f, m);
}

const consensus = (anchors, minMembers, minShare) => {
  const stat = new Map();
  for (const [s, lab] of anchors) {
    const cls = clsOf.get(s);
    if (!cls) continue;
    if (!stat.has(cls)) stat.set(cls, new Map());
    const m = stat.get(cls);
    m.set(lab, (m.get(lab) || 0) + 1);
  }
  const pure = new Map();
  for (const [cls, m] of stat) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    if (tot < minMembers) continue;
    const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n / tot >= minShare) pure.set(cls, { lab, n, tot });
  }
  return pure;
};

// ---- validation, leave one evidence file out
let tested = 0, correct = 0;
const confusion = new Map();
for (const holdFile of perFile.keys()) {
  const anchor = new Map();
  for (const [f, m] of perFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
  const pure = consensus(anchor, 2, 0.9);
  for (const [s, truth] of perFile.get(holdFile)) {
    const cls = clsOf.get(s);
    if (!cls) continue;
    const got = pure.get(cls);
    if (!got) continue;
    tested++;
    if (got.lab === truth) correct++;
    else confusion.set(truth + "->" + got.lab, (confusion.get(truth + "->" + got.lab) || 0) + 1);
  }
}
const pct = tested ? (100 * correct / tested).toFixed(1) : "n/a";

// ---- emit
const pure = consensus(direct, 2, 0.9);
const out = [["start", "label", "conf", "evidence"]];
const perLabel = new Map();
for (const [s, cls] of clsOf) {
  if (direct.has(s)) continue;
  const got = pure.get(cls);
  if (!got) continue;
  perLabel.set(got.lab, (perLabel.get(got.lab) || 0) + 1);
  out.push([s, got.lab, "V", `class vote: ${cls} has ${got.n}/${got.tot} evidence-bearing members labelled ${got.lab}; rule validated leave-one-file-out at ${pct}%`]);
}
fs.writeFileSync(path.join(INV, "attr-classvote.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`class consensus LOO ${correct}/${tested} = ${pct}% (confusions: ${[...confusion].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x.join(":")).join(" ")})`);
console.log(`wrote ${out.length - 1} rows:`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
