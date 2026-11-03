// class-family.mjs — wire attr-class.tsv's B rows to the prefixes that classprefix-map.tsv already decided.
//
// The map holds 224 prefix -> label rows, each with a basis (example class names), and it explicitly marks `uUI` as
// ambiguous because uUIStartMenu is ui, uUISupplyBox is item and uUITalkClipScene is render-gfx. attr-class.tsv never read
// the map, so 3,329 of its rows sat at conf B while their class prefix was already decided. This pass applies the map by
// longest prefix, skips the rows the map calls ambiguous, and records which map row (with its basis) justified each label.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");

const map = fs.readFileSync(path.join(ROOT, "docs/analysis/code/classprefix-map.tsv"), "utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const [p, label, basis] = l.split("\t"); return { p, label, basis }; })
  .filter((r) => r.label && r.label !== "unknown")
  // sFestaFileLoader is mapped to save-data on the strength of its single class name, but the name itself says
  // "file loader"; wiring it would teach the meter that a loader is save code. Left out until the class is read.
  .filter((r) => r.p !== "sFestaFileLoader")
  .sort((a, b) => b.p.length - a.p.length);

const rows = fs.readFileSync(path.join(INV, "attr-class.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1);
const out = [["start", "label", "conf", "evidence"]];
const seen = new Set();
const perPrefix = new Map();
let ambiguous = 0, unmatched = 0;
for (const l of rows) {
  const c = l.split("\t");
  if (c[2] !== "B") continue;
  const m = /(?:slot-run|slot):\s*([A-Za-z0-9_]+)/.exec(c[3] || "");
  if (!m) { unmatched++; continue; }
  const cls = m[1];
  const hit = map.find((r) => cls.startsWith(r.p));
  if (!hit) { unmatched++; continue; }
  if (seen.has(c[0])) continue;
  seen.add(c[0]);
  perPrefix.set(hit.p, (perPrefix.get(hit.p) || 0) + 1);
  out.push([c[0], hit.label, "A", `${cls} class-record slot [classprefix-map ${hit.p} -> ${hit.label}, basis: ${hit.basis}]`]);
}
fs.writeFileSync(path.join(INV, "attr-class2.tsv"), out.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`labelled ${out.length - 1} functions from the existing prefix map; unmatched ${unmatched}`);
console.log("by prefix:", [...perPrefix].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
