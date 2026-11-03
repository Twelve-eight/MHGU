// class-seeds.mjs — turn the class identity table (start, class, channel) into subsystem seeds.
//
// class-from-code resolves a class for 16,579 functions (ctor idiom, registrar name, recorded vtable slot, slot-run).
// The subsystem is then decided by the class name through the taxonomy and the curated 224-prefix map; classes that no
// rule covers are dropped, not guessed, because an unknown class name is exactly where a wrong label would hide.
import fs from "node:fs";
import path from "node:path";
import { labelOf } from "./taxonomy.mjs";

const ROOT = "G:/omp works/MHGU";
const RAW = process.argv[2] || "G:/tmp/cfc.raw";
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-class.tsv");

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
let kept = 0, unnamed = 0;
const viaChannel = {};
for (const l of fs.readFileSync(RAW, "utf8").split(/\r?\n/).filter((x) => x && !x.startsWith("#"))) {
  const [start, cls, channel] = l.split("\t");
  if (!start || !cls) continue;
  const byPrefix = (PREFIX.find((p) => atBoundary(cls, p.prefix)) || {}).label || null;
  const lab = labelOf(cls) || byPrefix;
  if (!lab) { unnamed++; continue; }
  const conf = channel === "slot" || channel === "slot-run" ? "B" : "A";
  viaChannel[channel] = (viaChannel[channel] || 0) + 1;
  rows.push([start, lab, conf, `${channel}: ${cls}`]);
  kept++;
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`class seeds: ${kept} (classes with no rule: ${unnamed}); by channel ${JSON.stringify(viaChannel)}`);
