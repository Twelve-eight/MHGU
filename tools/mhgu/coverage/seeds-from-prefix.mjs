// seeds-from-prefix.mjs — use the curated class-prefix map as an attribution source.
//
// `docs/analysis/code/classprefix-map.tsv` already maps 224 class prefixes to subsystems with a stated basis. A
// function whose validated string reference names one of those classes can be attributed from the map instead of from
// the taxonomy regexes, which only cover 14 families. Longest prefix wins, so `uFreeCamera` beats `uCamera`.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const MAP = path.join(ROOT, "docs/analysis/code/classprefix-map.tsv");
const XREF = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-prefix.tsv");

const prefixes = fs.readFileSync(MAP, "utf8").split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const [prefix, label, basis] = l.split("\t"); return { prefix, label, basis }; })
  .filter((p) => p.prefix && p.label)
  .sort((a, b) => b.prefix.length - a.prefix.length);

const rows = [["start", "label", "conf", "evidence"]];
const used = {};
let matched = 0;
for (const l of fs.readFileSync(XREF, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, str] = l.split("\t");
  if (!str) continue;
  const hit = prefixes.find((p) => str.includes(p.prefix));
  if (!hit) continue;
  matched++;
  used[hit.label] = (used[hit.label] || 0) + 1;
  rows.push([start, hit.label, "A", `class prefix "${hit.prefix}" (${hit.basis}) in string "${str.slice(0, 60)}"`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`rows ${rows.length - 1} from ${matched} prefix hits; labels ${JSON.stringify(used)}`);
