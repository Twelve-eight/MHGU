// relabel-vtable.mjs — re-label the vtable attribution by CLASS NAME under the current taxonomy.
//
// The first vtable pass embedded its own label rules, where a bare /Mt/ matched every engine class into render-gfx
// (MtCollisionUtil, MtExHeapAllocator, MtTreeDTI...). The taxonomy now names those separately, so the vtable rows can
// be re-derived from the class name in their evidence without redoing the extraction.
//
// A row whose class name matches no rule keeps its old label but is marked conf B: the old label is what is now in
// doubt, not the vtable membership.
import fs from "node:fs";
import path from "node:path";
import { labelOf } from "./taxonomy.mjs";

// the class-prefix map covers 224 families; the taxonomy only 14. Longest prefix wins.
const PREFIX = fs.readFileSync("G:/omp works/MHGU/docs/analysis/code/classprefix-map.tsv", "utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const [prefix, label] = l.split("\t"); return { prefix, label }; })
  .filter((p) => p.prefix && p.label && p.label !== "unknown")
  .sort((a, b) => b.prefix.length - a.prefix.length);
// match at a name boundary only: the class start, after "::", or at a CamelCase seam -- substring matching turned
// "cQuickUI" into a UI class and moved 95 quest rows into ui
const atBoundary = (cls, prefix) => {
  let i = cls.indexOf(prefix);
  while (i >= 0) {
    const before = i === 0 ? ":" : cls[i - 1];
    if (i === 0 || cls.startsWith("::", i - 2) || /[A-Z0-9_]/.test(before) === false) return true;
    i = cls.indexOf(prefix, i + 1);
  }
  return false;
};
const byPrefix = (cls) => (PREFIX.find((p) => atBoundary(cls, p.prefix)) || {}).label || null;

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-retile.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-fixed.tsv");

const cls = (ev) => { const m = /([A-Za-z_][\w:]*)\s+registrar/.exec(ev || ""); return m ? m[1] : ""; };

const rows = [["start", "label", "conf", "evidence"]];
let kept = 0, relabelled = 0, demoted = 0, dropped = 0;
const moves = {};
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, label, conf, ev] = l.split("\t");
  if (label === "unknown") { dropped++; continue; } // stays unknown; not evidence
  const c = cls(ev);
  const byName = c ? (labelOf(c) || byPrefix(c)) : null;
  if (byName && byName !== label) {
    rows.push([start, byName, conf, `${ev} [relabelled ${label} -> ${byName} by class name]`]);
    moves[`${label}->${byName}`] = (moves[`${label}->${byName}`] || 0) + 1;
    relabelled++;
  } else if (byName === label) {
    rows.push([start, label, conf, ev]);
    kept++;
  } else {
    // no rule for this class: the vtable membership stands, the old label does not
    rows.push([start, label, "B", `${ev} [class not covered by any rule; label demoted to B]`]);
    demoted++;
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`rows ${rows.length - 1}: unchanged ${kept}, relabelled ${relabelled}, demoted ${demoted}, unknown dropped ${dropped}`);
console.log("moves: " + JSON.stringify(moves));
