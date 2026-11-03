// direct-split.mjs — keep two-hop inference out of the "direct evidence" number.
//
// A-direct counts every function carrying a conf=A row, but two different kinds of row hide there: evidence observed on
// the function itself (it references a string, it occupies a mechanically verified vtable slot, it is the body of a class
// registrar) and labels that arrive through a chain (string -> class -> registration, or a block/class attribution).
// Mixing them repeats at function granularity the inference the seed rule already rejects at seed granularity, so this
// pass reports the two groups separately and the intersection that both cover.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const INV = "G:/omp works/MHGU/docs/analysis/code/inventory";
const HOOK = ["attr-xref.tsv", "attr-prefix.tsv", "attr-strings2.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv",
  "attr-vtable-rtti2.tsv", "attr-vtable-unknown.tsv", "attr-vtable-classconsensus.tsv", "attr-registrar.tsv",
  "attr-fingerprint.tsv"];
const BLOCK = ["attr-blocks.tsv"];
const CLASSREC = ["attr-class.tsv", "attr-class2.tsv", "attr-uifamily.tsv"];

const fns = zlib.gunzipSync(fs.readFileSync("G:/omp works/MHGU/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(","));
const insns = new Map(fns.map((c) => [parseInt(c[0], 16), Number(c[2])]));
const totalIns = fns.reduce((a, c) => a + Number(c[2]), 0);

const load = (files) => {
  const s = new Set();
  for (const f of files) {
    const p = path.join(INV, f);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, , conf] = l.split("\t");
      if (conf === "A") s.add(parseInt(start, 16));
    }
  }
  return s;
};
const hook = load(HOOK), block = load(BLOCK), cls = load(CLASSREC);
const sum = (set) => [...set].reduce((a, v) => a + (insns.get(v) || 0), 0);
const pct = (n) => ((100 * n) / totalIns).toFixed(1);
console.log(`hook on the function itself (string ref / verified vtable slot / registrar body) ${hook.size} functions / ${sum(hook)} insns = ${pct(sum(hook))}%`);
console.log(`address-block purity ${block.size} functions / ${sum(block)} insns = ${pct(sum(block))}%`);
console.log(`class-record only ${cls.size} functions / ${sum(cls)} insns = ${pct(sum(cls))}%`);
console.log(`union ${new Set([...hook, ...block, ...cls]).size} functions`);
