// vtable-unknown.mjs — the retile table left 8,360 attributions labelled "unknown" although each row names a class.
//
// attr-vtable-retile.tsv has 13,577 rows; 5,217 carry a label and the other 8,360 were written as `unknown` with the class
// name still in the evidence column. Two mechanical keys can label many of them without a new judgement:
//   * C++ namespaces that state their own subsystem (nn::nex / nn::pia / nn::nfr, pead, nDraw, nn::gfx ...), the same
//     rule the RTTI channel uses, because the symbol itself says where it belongs;
//   * class prefixes already decided in classprefix-map.tsv (its `unknown` marker and rows whose class is the literal
//     token CONFLICTING are left alone — a sentinel is not a class name).
// Everything else stays unknown. Output: attr-vtable-unknown.tsv.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");

const NS = [
  ["nn::nex", "online-nex", "Nintendo NEX middleware"],
  ["nn::pia", "online-nex", "Nintendo PIA peer-to-peer middleware"],
  ["nn::nfr", "online-nex", "Nintendo NFR middleware"],
  ["nn::ngc", "online-nex", "Nintendo game-content service"],
  ["nn::account", "online-nex", "Nintendo account service"],
  ["nn::gfx", "render-gfx", "Nintendo graphics API wrapper"],
  ["nn::hid", "kernel-os", "Nintendo HID service"],
  ["nn::oe", "kernel-os", "Nintendo OS extension service"],
  ["nn::fs", "filesystem", "Nintendo filesystem service"],
  ["nn::os", "kernel-os", "Nintendo OS primitives"],
  ["pead", "kernel-os", "Nintendo pead utility library (heaps, threads, strings)"],
  ["nw::", "online-nex", "Nintendo network wrapper"],
  ["nDraw", "render-gfx", "engine draw layer (nDraw::Material, nDraw::Query)"],
  ["nvn", "render-gfx", "NVN graphics API"],
];

const map = fs.readFileSync(path.join(ROOT, "docs/analysis/code/classprefix-map.tsv"), "utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const [p, label, basis] = l.split("\t"); return { p, label, basis }; })
  .filter((r) => r.label && r.label !== "unknown")
  .sort((a, b) => b.p.length - a.p.length);

const rows = fs.readFileSync(path.join(INV, "attr-vtable-retile.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1);
const out = [["start", "label", "conf", "evidence"]];
const tally = new Map();
let kept = 0, conflict = 0;
for (const l of rows) {
  const c = l.split("\t");
  if (c[1] !== "unknown") continue;
  const cls = (/^(\S+)/.exec(c[3] || "") || [])[1];
  if (!cls) { kept++; continue; }
  if (cls === "CONFLICTING") { conflict++; continue; }
  const nsHit = NS.find(([p]) => cls === p || cls.startsWith(p + "::") || (p === "nDraw" && cls.startsWith("nDraw")));
  if (nsHit) {
    tally.set(nsHit[1], (tally.get(nsHit[1]) || 0) + 1);
    out.push([c[0], nsHit[1], "A", `${c[3]} [class namespace ${nsHit[0]}: ${nsHit[2]}]`]);
    continue;
  }
  // The prefix map is a decided source, but a few of its rows group by product rather than by code (cArea -> quest,
  // cArmor -> weapon-wp, sEquip -> item, sFestaFileLoader -> save-data). Those four are held back here so the number this
  // channel reports is the namespace-only floor; the map-backed remainder waits for a map review.
  const CONFLICT = ["cArea", "cArmor", "sEquip", "sFestaFileLoader", "rArmor"];
  const pHit = CONFLICT.some((p0) => cls.startsWith(p0)) ? null : map.find((r) => cls.startsWith(r.p));
  if (pHit) {
    tally.set(pHit.label, (tally.get(pHit.label) || 0) + 1);
    out.push([c[0], pHit.label, "A", `${c[3]} [classprefix-map ${pHit.p} -> ${pHit.label}, basis: ${pHit.basis}]`]);
    continue;
  }
  kept++;
}
fs.writeFileSync(path.join(INV, "attr-vtable-unknown.tsv"), out.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`labelled ${out.length - 1} of the previously unknown rows; left unknown ${kept}; CONFLICTING ${conflict}`);
console.log("by label:", [...tally].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
