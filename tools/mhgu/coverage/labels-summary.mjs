// labels-summary.mjs — one page per subsystem: how much of it is known, and on what evidence.
//
// The coverage number says how much of the image is attributed; this says what the attribution looks like from the other
// side, which is what a reader actually needs when they want "the UI code" or "the quest code". Counts come from
// coverage-report.tsv's own tiers plus the evidence files, so the two can be compared without recomputing anything.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = ROOT + "/docs/analysis/code/inventory/labels-summary.md";

const evidence = new Map(); // start -> Set(file)
const conf = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c, ev] = l.split("\t");
    if (!lab || lab === "unknown") continue;
    const k = s.toLowerCase();
    if (!evidence.has(k)) evidence.set(k, []);
    evidence.get(k).push({ file: f, conf: c, label: lab, ev: ev || "" });
  }
}
const tiers = new Map();
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  tiers.set(c[0].toLowerCase(), { insns: +c[1], tier: c[2], label: c[3] || "", src: c[4] || "" });
}
const per = new Map();
for (const [s, t] of tiers) {
  const rows = evidence.get(s) || [];
  const direct = rows.filter((r) => r.conf === "A");
  const lab = direct.length ? direct[0].label : t.label;
  if (!lab) continue;
  if (!per.has(lab)) per.set(lab, { fn: 0, insns: 0, direct: 0, files: new Map(), example: null, exampleEv: "" });
  const e = per.get(lab);
  e.fn++;
  e.insns += t.insns;
  if (direct.length) {
    e.direct++;
    for (const r of direct) e.files.set(r.file, (e.files.get(r.file) || 0) + 1);
    if (!e.example && direct[0].ev) { e.example = s; e.exampleEv = direct[0].ev; }
  }
}
const totalIns = [...tiers.values()].reduce((a, t) => a + t.insns, 0);
const rows = [...per].sort((a, b) => b[1].insns - a[1].insns);
const lines = [
  "# 子系统归属总览（自动生成，勿手改）",
  "",
  "由 `node tools/mhgu/coverage/labels-summary.mjs` 从 `tiers-merged.csv` 与 `sources.json` 列出的证据表生成。",
  "`直接证据` 指该函数自己有一行 conf=A 的依据；没有直接证据的计数来自传播或推断。",
  "",
  `分母：${totalIns.toLocaleString("en-US")} 条指令。`,
  "",
  "| 子系统 | 函数 | 指令 | 指令占比 | 直接证据 | 主要证据来源 |",
  "|---|---:|---:|---:|---:|---|",
];
for (const [lab, e] of rows) {
  const topFiles = [...e.files].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, n]) => `${f.replace(/^attr-|\.tsv$/g, "")} ${n}`).join(", ");
  lines.push(`| ${lab} | ${e.fn.toLocaleString("en-US")} | ${e.insns.toLocaleString("en-US")} | ${((100 * e.insns) / totalIns).toFixed(1)}% | ${e.direct.toLocaleString("en-US")}（${((100 * e.direct) / e.fn).toFixed(0)}%） | ${topFiles || "—"} |`);
}
lines.push("", "## 每个子系统的一个直接证据样例", "", "| 子系统 | 函数 | 证据 |", "|---|---|---|");
for (const [lab, e] of rows) {
  if (!e.example) continue;
  const ev = e.exampleEv.replace(/\|/g, "\\|").slice(0, 160);
  lines.push(`| ${lab} | \`${e.example}\` | ${ev} |`);
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`wrote ${OUT} (${rows.length} labels)`);
for (const [lab, e] of rows.slice(0, 8)) console.log(`  ${lab.padEnd(14)} ${String(e.fn).padStart(6)} fn ${String(e.insns).padStart(9)} insns  direct ${e.direct}`);
