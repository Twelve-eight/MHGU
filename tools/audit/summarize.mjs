// summarize.mjs — aggregate the per-slice audit TSVs into one verdict table and a summary document.
//
// Every slice writes `<SLICE>.tsv` with the same header, so the denominator and the verdict counts are mechanical:
// a doc that appears twice is a slice bug, and a doc in the manifest with no verdict is a hole. The summary states
// both, so "189 docs reviewed" can be checked rather than believed.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const DIR = path.join(ROOT, "docs/analysis/audit");
const MANIFEST = path.join(DIR, "MANIFEST.tsv");
const OUT = path.join(DIR, "ROUND1-SUMMARY.md");

const manifest = new Set(fs.readFileSync(MANIFEST, "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t")[0]));
// slice TSVs only: *-FIXES.tsv carry a different header (doc/item/old/new/command/note) and would pollute the counts
const files = fs.readdirSync(DIR).filter(
  (f) => f.endsWith(".tsv") && !["MANIFEST.tsv", "DOC-LINKS.tsv", "ROUND1-ALL.tsv"].includes(f) && !/-FIXES\.tsv$/.test(f)
);

const all = [];
for (const f of files.sort()) {
  for (const l of fs.readFileSync(path.join(DIR, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [doc, item, verdict, evidence, note] = l.split("\t");
    all.push({ slice: f.replace(/\.tsv$/, ""), doc, item, verdict, evidence, note });
  }
}

const bySlice = {};
const byVerdict = {};
const docVerdict = new Map(); // doc -> worst verdict
const rank = { MISSING: 5, WRONG: 4, STALE: 3, UNVERIFIABLE: 2, NA: 1, OK: 0 };
for (const r of all) {
  bySlice[r.slice] = bySlice[r.slice] || {};
  bySlice[r.slice][r.verdict] = (bySlice[r.slice][r.verdict] || 0) + 1;
  byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  if (r.doc && manifest.has(r.doc)) {
    const cur = docVerdict.get(r.doc);
    if (!cur || (rank[r.verdict] || 0) > (rank[cur] || 0)) docVerdict.set(r.doc, r.verdict);
  }
}

const missingDocs = [...manifest].filter((d) => !docVerdict.has(d));
const md = [
  "# MHGU 文档补审总账（2026-11-03）",
  "",
  `分母：\`docs/analysis/audit/MANIFEST.tsv\` 的 ${manifest.size} 篇；已有裁决 **${docVerdict.size}** 篇，未覆盖 **${missingDocs.length}** 篇。`,
  "",
  "| 切片 | " + Object.keys(byVerdict).join(" | ") + " |",
  "|---|" + Object.keys(byVerdict).map(() => "---:").join("|") + "|",
  ...Object.entries(bySlice).map(([s, v]) => `| ${s} | ${Object.keys(byVerdict).map((k) => v[k] || 0).join(" | ")} |`),
  `| **合计（行）** | ${Object.keys(byVerdict).map((k) => byVerdict[k] || 0).join(" | ")} |`,
  "",
  "## 未覆盖的文档",
  "",
  ...(missingDocs.length ? missingDocs.map((d) => `- ${d}`) : ["（无）"]),
  "",
  "## 说明",
  "",
  "- 行级裁决可能多于文档数（一个文档多个条目）；上面的\"已有裁决\"按文档计。",
  "- 每个非 OK 裁决在对应切片 TSV 里带命令证据；本表只做汇总，不替代证据。",
].join("\n") + "\n";
fs.writeFileSync(OUT, md);
fs.writeFileSync(path.join(DIR, "ROUND1-ALL.tsv"), ["slice\tdoc\titem\tverdict\tevidence\tnote", ...all.map((r) => [r.slice, r.doc, r.item, r.verdict, r.evidence, r.note].join("\t"))].join("\n") + "\n");
console.log(`rows ${all.length}; docs adjudicated ${docVerdict.size}/${manifest.size}; uncovered ${missingDocs.length}`);
console.log(JSON.stringify(byVerdict));
for (const [s, v] of Object.entries(bySlice)) console.log(`  ${s.padEnd(20)} ${JSON.stringify(v)}`);
