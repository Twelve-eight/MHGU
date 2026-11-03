// labels-summary.mjs — one page per subsystem: how much of it is known, and on what evidence.
//
// The coverage number says how much of the image is attributed; this says what the attribution looks like from the other
// side, which is what a reader actually needs when they want "the UI code" or "the quest code".
//
// The population comes straight from function-labels.tsv, the canonical per-function answer, rather than re-implementing
// the merge. Two implementations disagreed by three functions (quest and save-data, one each) because they resolved
// conflicting sources slightly differently — a summary that re-derives cannot be guaranteed to match the file it claims
// to summarise, so this one reads it.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "labels-summary.md";

const fns = new Map(zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return [c[0].toLowerCase(), +c[2]]; }));

// The example is what a reader sees first, so it must come from the strongest source a label has, not the first row
// encountered: a bare "ctor: <class>" line would teach that direct evidence often means only a class name.
// rank 3: a structural claim that names the mechanism (slot in a vtable, motion signature, immediate, string list)
// rank 2: a single named string or an address bracket
// rank 1: a class name alone, which is the weakest shape and the one this page must not lead with
const R3 = ["attr-fingerprint.tsv", "attr-vtable-retile.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv", "attr-vtable-rtti2.tsv", "attr-vtable-unknown.tsv", "attr-strings2.tsv", "attr-immscan.tsv"];
const R2 = ["attr-registrar.tsv", "attr-blocks.tsv", "attr-xref.tsv", "attr-prefix.tsv"];
const rankFile = (f) => R3.includes(f) ? 3 : R2.includes(f) ? 2 : 1;
const per = new Map();
let labelledFn = 0;
for (const l of fs.readFileSync(INV + "function-labels.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [s, , lab, prov, reason] = l.split("\t");
  if (!lab || lab === "unknown") continue;
  const k = s.toLowerCase();
  const direct = prov.startsWith("evidence:");
  const file = prov.includes(":") ? prov.slice(prov.indexOf(":") + 1) : "";
  if (!per.has(lab)) per.set(lab, { fn: 0, insns: 0, direct: 0, files: new Map(), example: null, exampleEv: "" });
  const e = per.get(lab);
  e.fn++;
  labelledFn++;
  e.insns += fns.get(k) || 0;
  if (direct) {
    e.direct++;
    e.files.set(file, (e.files.get(file) || 0) + 1);
    const r = rankFile(file);
    if (reason && (!e.example || r > e.exampleRank)) { e.example = k; e.exampleEv = reason; e.exampleRank = r; }
  }
}

const totalIns = [...fns.values()].reduce((a, n) => a + n, 0);
const rows = [...per].sort((a, b) => b[1].insns - a[1].insns);
const lines = [
  "# 子系统归属总览（自动生成，勿手改）",
  "",
  "由 `node tools/mhgu/coverage/labels-summary.mjs` **直接读 `function-labels.tsv`** 汇总，不再自己重跑合并逻辑——",
  "所以本页的合计与那份逐函数答案必然相等（重写前两套实现差 3 个函数）。",
  "`直接证据` 指该行的 provenance 是 `evidence:`（自己有一行可引用的 A 级依据）；其余来自传播、推断或切片裁定。",
  "",
  `分母：${totalIns.toLocaleString("en-US")} 条指令；已归属函数 **${labelledFn.toLocaleString("en-US")}** 个。`,
  "",
  "| 子系统 | 函数 | 指令 | 指令占比 | 直接证据 | 主要证据来源 |",
  "|---|---:|---:|---:|---:|---|",
];
for (const [lab, e] of rows) {
  const topFiles = [...e.files].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, n]) => `${f.replace(/^attr-|\.tsv$/g, "")} ${n}`).join(", ");
  lines.push(`| ${lab} | ${e.fn.toLocaleString("en-US")} | ${e.insns.toLocaleString("en-US")} | ${((100 * e.insns) / totalIns).toFixed(1)}% | ${e.direct.toLocaleString("en-US")}（${e.fn ? ((100 * e.direct) / e.fn).toFixed(0) : 0}%） | ${topFiles || "—"} |`);
}
lines.push("", "## 每个子系统的一个直接证据样例", "", "| 子系统 | 函数 | 证据 |", "|---|---|---|");
for (const [lab, e] of rows) {
  if (!e.example) continue;
  lines.push(`| ${lab} | \`${e.example}\` | ${e.exampleEv.replace(/\|/g, "\\|").slice(0, 160)} |`);
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`wrote ${OUT} (${rows.length} labels, ${labelledFn} labelled functions)`);
for (const [lab, e] of rows.slice(0, 8)) console.log(`  ${lab.padEnd(14)} ${String(e.fn).padStart(6)} fn ${String(e.insns).padStart(9)} insns  direct ${e.direct}`);
