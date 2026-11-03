// vtable-class-consensus.mjs — label the remaining vtable rows by what their own class already proves.
//
// The 1,024 rows in attr-vtable-rest.tsv are functions whose class has no prefix rule; their only direct evidence is the
// class name, which is not enough. But a class usually has other members that DO carry evidence rows, so the class can
// speak for itself: if at least three of a class's members hold the same direct-evidence label and that label covers most
// of the class's evidence-bearing members, the remaining rows inherit it and the evidence names the members that decided.
// Anchors are direct A rows only — spread labels are never used, otherwise the class would be voting for itself.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const DIRECT = ["attr-xref.tsv", "attr-prefix.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv", "attr-vtable-rtti2.tsv",
  "attr-strings2.tsv", "attr-blocks.tsv", "attr-registrar.tsv", "attr-uifamily.tsv", "attr-class.tsv", "attr-class2.tsv"];

const direct = new Map(); // start -> label (conf A only)
for (const f of DIRECT) {
  const p = path.join(INV, f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, label, conf] = l.split("\t");
    if (conf !== "A") continue;
    if (!direct.has(start)) direct.set(start, label);
  }
}

const rows = fs.readFileSync(path.join(INV, "attr-vtable-rest.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1);
const byClass = new Map();
for (const l of rows) {
  const [start, , , ev] = l.split("\t");
  const m = /^(\S+) /.exec(ev || "");
  if (!m) continue;
  const cls = m[1];
  if (!byClass.has(cls)) byClass.set(cls, []);
  byClass.get(cls).push(start);
}

const out = [["start", "label", "conf", "evidence"]];
const sheet = [["class", "members", "evidence_members", "label", "share", "verdict"]];
for (const [cls, members] of byClass) {
  const votes = new Map();
  for (const s of members) {
    const lab = direct.get(s);
    if (!lab) continue;
    votes.set(lab, (votes.get(lab) || 0) + 1);
  }
  const evidenced = [...votes.values()].reduce((a, b) => a + b, 0);
  if (!evidenced) { sheet.push([cls, members.length, 0, "-", "0.00", "no-evidence"]); continue; }
  const [label, n] = [...votes].sort((a, b) => b[1] - a[1])[0];
  const share = n / evidenced;
  const verdict = n >= 3 && share >= 0.6 ? "adopt" : "reject";
  sheet.push([cls, members.length, evidenced, `${label} (${n})`, share.toFixed(2), verdict]);
  if (verdict !== "adopt") continue;
  for (const s of members) {
    if (direct.has(s)) continue;
    out.push([s, label, "A", `${cls} class consensus: ${n}/${evidenced} of the class's evidence-bearing members are ${label}`]);
  }
}
fs.writeFileSync(path.join(INV, "attr-vtable-classconsensus.tsv"), out.map((r) => r.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-vtable-classconsensus-sheet.tsv"), sheet.map((r) => r.join("\t")).join("\n") + "\n");
const adopted = sheet.filter((r) => r[5] === "adopt");
console.log(`classes ${byClass.size}, adopted ${adopted.length}, rows ${out.length - 1}`);
console.log(adopted.map((r) => r[0] + ":" + r[2] + "->" + r[3]).slice(0, 15).join(" "));
