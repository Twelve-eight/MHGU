// seeds-from-registrar.mjs — class registration is a direct identity: `bl 0x7aedcc` plus the class name.
//
// Two agents independently confirmed the idiom: a function that calls the class-registration helper 0x7aedcc passes the
// class name as a pc-delta string (e.g. 0x644d50 registers cUIOUnderKeyAssign, 0x65fbb8 registers uUICommonUtility).
// So: a function containing `bl 0x7aedcc` and referencing a class-looking string is a registrar, and the class name
// gives the subsystem through the curated prefix map (224 families) before the taxonomy regexes.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { labelOf } from "./taxonomy.mjs";

const ROOT = "G:/omp works/MHGU";
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-registrar.tsv");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const TEXT_END = 0x13f1dec;

const xref = new Map(); // start -> [strings]
for (const l of fs.readFileSync(path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, str] = l.split("\t");
  if (!xref.has(start)) xref.set(start, []);
  xref.get(start).push(str);
}

const PREFIX = fs.readFileSync(path.join(ROOT, "docs/analysis/code/classprefix-map.tsv"), "utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const [prefix, label] = l.split("\t"); return { prefix, label }; })
  .filter((p) => p.prefix && p.label && p.label !== "unknown")
  .sort((a, b) => b.prefix.length - a.prefix.length);
const atBoundary = (cls, prefix) => {
  let i = cls.indexOf(prefix);
  while (i >= 0) { if (i === 0 || /[^A-Za-z0-9_]/.test(cls[i - 1])) return true; i = cls.indexOf(prefix, i + 1); }
  return false;
};

const rows = [["start", "label", "conf", "evidence"]];
const unknownClasses = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),/.exec(l);
  if (!m) continue;
  const s = parseInt(m[1], 16), e = parseInt(m[2], 16);
  let isRegistrar = false;
  for (let v = s; v + 4 <= e && v < s + 4000; v += 4) {
    const w = rd(v);
    if ((w >>> 24) !== 0xeb) continue;
    let off = (w & 0xffffff) << 2; if (off & 0x02000000) off -= 0x04000000;
    if ((((v + 8 + off) >>> 0) === 0x7aedcc)) { isRegistrar = true; break; }
  }
  if (!isRegistrar) continue;
  const strs = xref.get(m[1]) || [];
  const cls = strs.find((x) => /^[a-z][A-Za-z0-9_]{2,40}$/.test(x) || /^[A-Z][A-Za-z0-9_]{2,40}$/.test(x));
  if (!cls) continue;
  const byPrefix = (PREFIX.find((p) => atBoundary(cls, p.prefix)) || {}).label || null;
  const lab = labelOf(cls) || byPrefix;
  if (!lab) { unknownClasses.push(cls); continue; }
  rows.push([m[1], lab, "A", `registrar bl 0x7aedcc, class "${cls}" (${labelOf(cls) ? "taxonomy" : "prefix map"})`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`registrar seeds: ${rows.length - 1}; classes with no rule: ${unknownClasses.length}`);
console.log(`sample: ${rows.slice(1, 6).map((r) => r[0] + " " + r[3]).join(" | ")}`);
