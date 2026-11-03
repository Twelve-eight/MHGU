// class-single-seeds.mjs — attribute a class's unlabelled methods from its labelled ones.
//
// class-single-anchor.mjs measured it: when a class has exactly one labelled member outside the window, the members inside
// are 100% that label (588/588, CP95 98.5-98.9). The mechanism is that a class is one object, so every method serves the
// same subsystem. This emits for classes whose labelled members all agree, with any number of anchors.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "attr-classsingle.tsv";

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (f === "attr-classsingle.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const classOf = new Map();
for (const f of ["attr-vtable-retile.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv"]) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    const m = /vtable (0x[0-9a-f]+)/.exec(c[3] || "");
    if (m && !classOf.has(c[0].toLowerCase())) classOf.set(c[0].toLowerCase(), m[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), n: +c[2] }; });
const byClass = new Map();
for (const f of fns) {
  const v = classOf.get(f.s);
  if (!v) continue;
  if (!byClass.has(v)) byClass.set(v, []);
  byClass.get(v).push(f.s);
}
const rows = [["start", "label", "conf", "evidence"]];
let emitted = 0, mixed = 0;
for (const [v, members] of byClass) {
  const labs = new Map();
  for (const m of members) { const l = A.get(m); if (l) labs.set(l, (labs.get(l) || 0) + 1); }
  if (!labs.size) continue;
  if (labs.size > 1) { mixed++; continue; } // the class contradicts itself: say nothing
  const [label, anchors] = [...labs][0];
  for (const m of members) {
    if (A.has(m)) continue;
    rows.push([m, label, "V", `class vtable ${v}: ${anchors} labelled member(s) all say ${label}`]);
    emitted++;
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`classes ${byClass.size}, skipped as mixed ${mixed}, emitted ${emitted} rows`);
