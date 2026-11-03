// summarize.mjs — aggregate the per-slice audit TSVs into one verdict table and a summary document.
//
// Disposition coverage: a non-OK verdict is only a finding, not a gap, if something records what was done about it.
// WRONG rows are matched by doc against the *-FIXES tables that use the doc/item schema; STALE and MISSING have their own
// ledgers with their own key columns. The summary states the coverage so "74 WRONG" cannot be read as "74 open".
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
  (f) => f.endsWith(".tsv") && !["MANIFEST.tsv", "DOC-LINKS.tsv", "ROUND1-ALL.tsv", "TIERB-CONF-RECOUNT.tsv"].includes(f) && !/-FIXES\.tsv$/.test(f)
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
  "- **43 条 STALE 已于 2026-11-04 全部关闭**：逐条处置见 `STALE-FIXES.tsv`（其中 5 条实测后发现文档已先行修正）。STALE 列是 round-1 的历史记录，不是待办。",
  // Disposition coverage: a non-OK verdict is a finding, not an open gap, only if something records what was done about
  // it. WRONG rows match the *-FIXES tables by doc; STALE and MISSING have their own ledgers with their own key column.
  ...(() => {
    const out = [];
    for (const [verdict, fixFiles, keyCol] of [
      ["WRONG", ["CODEDOCS-FIXES.tsv", "MECHANICS-FIXES.tsv", "REST-FIXES.tsv"], 0],
      ["STALE", ["STALE-FIXES.tsv"], 1],
      // MISSING items are closed either by the MISSING ledger (key column = file) or by a repair recorded in one of the
      // doc/item fix tables, so both are checked.
      ["MISSING", ["MISSING-FIXES.tsv"], 1],
    ]) {
      const rowsOf = all.filter((r) => r.verdict === verdict);
      if (!rowsOf.length) continue;
      const keys = new Set();
      const present = [];
      for (const f of fixFiles) {
        const p = path.join(DIR, f);
        if (!fs.existsSync(p)) continue;
        present.push(f);
        for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) keys.add((l.split("\t")[keyCol] || "").trim());
      }
      if (verdict === "MISSING") {
        for (const f of ["CODEDOCS-FIXES.tsv", "MECHANICS-FIXES.tsv", "REST-FIXES.tsv"]) {
          const p = path.join(DIR, f);
          if (!fs.existsSync(p)) continue;
          for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) keys.add((l.split("\t")[0] || "").trim());
        }
      }
      const covered = rowsOf.filter((r) => keys.has((r.doc || "").trim())).length;
      out.push(`- **${verdict} ${rowsOf.length} 行，${covered} 行有处置记录，${rowsOf.length - covered} 行没有**（处置表：${present.join("、") || "无"}）。`);
    }
    const unv = all.filter((r) => r.verdict === "UNVERIFIABLE").length;
    if (unv) out.push(`- **UNVERIFIABLE ${unv} 行**：按定义不作处置（静态不可核验，例如依赖外部页面或已删除的会话工件），逐行证据仍在对应切片 TSV 里。`);
    return out;
  })(),
].join("\n") + "\n";
fs.writeFileSync(OUT, md);
fs.writeFileSync(path.join(DIR, "ROUND1-ALL.tsv"), ["slice\tdoc\titem\tverdict\tevidence\tnote", ...all.map((r) => [r.slice, r.doc, r.item, r.verdict, r.evidence, r.note].join("\t"))].join("\n") + "\n");
console.log(`rows ${all.length}; docs adjudicated ${docVerdict.size}/${manifest.size}; uncovered ${missingDocs.length}`);
console.log(JSON.stringify(byVerdict));
for (const [s, v] of Object.entries(bySlice)) console.log(`  ${s.padEnd(20)} ${JSON.stringify(v)}`);
