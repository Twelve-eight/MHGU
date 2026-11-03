// doc-scan.mjs — mechanical audit of the MHGU document tree: which referenced paths and tools still exist.
//
// Same idea as the MHRS practice gate, scoped to MHGU's 189 markdown files: a doc that cites a tool or a data file
// which is gone is stale, and a doc that cites a scratch path under G:/tmp is a claim nothing can re-check. Report
// only; the per-doc verdicts are written to a TSV so an auditor can work one slice at a time.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const WS = "G:/omp works";
const OUT_DIR = path.join(ROOT, "docs/analysis/audit");
const OUT = path.join(OUT_DIR, "DOC-LINKS.tsv");

const docs = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, e.name);
    if (e.isDirectory()) walk(q);
    else if (e.name.endsWith(".md")) docs.push(q);
  }
})(path.join(ROOT, "docs"));
docs.sort();

// index every tool by basename, because docs cite them as `mhgu.mjs` as often as `tools/mhgu/mhgu.mjs`
const toolIndex = new Map();
(function walkTools(d) {
  let kids = [];
  try { kids = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of kids) {
    const q = path.join(d, e.name);
    if (e.isDirectory()) walkTools(q);
    else if (/\.(mjs|py|js)$/.test(e.name)) toolIndex.set(e.name, q);
  }
})(path.join(ROOT, "tools"));

const resolve = (raw, docFile) => {
  // strip a :line or :line-range suffix and expand one level of {a,b} alternatives before resolving
  let p = raw.replace(/:\d+(?:-\d+)?$/, "");
  const brace = /\{([^{}]+)\}/.exec(p);
  if (brace) {
    for (const alt of brace[1].split(",")) {
      const cand = p.slice(0, brace.index) + alt.trim() + p.slice(brace.index + brace[0].length);
      if (resolve(cand, docFile)) return resolve(cand, docFile);
    }
    return "";
  }
  // absolute Windows paths, workspace-relative, repo-relative and doc-relative are all used in this tree
  const cands = [];
  const norm = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(norm)) cands.push(norm);
  else if (p.startsWith("MHGU/") || p.startsWith("MHRS/")) cands.push(path.join(WS, p));
  else if (p.startsWith("docs/") || p.startsWith("tools/")) cands.push(path.join(ROOT, p));
  else cands.push(path.join(path.dirname(docFile), p), path.join(ROOT, p));
  return cands.find((c) => fs.existsSync(c)) || "";
};

const rows = [["doc", "kind", "value", "status", "resolved"]];
let nPath = 0, nMissing = 0, nScratch = 0, nTool = 0, nToolMissing = 0;
for (const f of docs) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const text = fs.readFileSync(f, "utf8");
  const seen = new Set();
  // backticked paths only: prose paths are too noisy to check
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const v = m[1].trim();
    if (v.length < 6 || v.length > 200) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    const isTool = /^tools\/[\w./-]+\.(mjs|py|js)$/.test(v) || /\.mjs$/.test(v);
    const looksPath = /^(G:[\\/]|[A-Za-z]:[\\/]|MHGU\/|MHRS\/|docs\/|tools\/|\.\.?\/)/.test(v) && !/\s/.test(v);
    if (isTool) {
      nTool++;
      const base = v.split("/").pop();
      const ok = (/^tools\//.test(v) && fs.existsSync(path.join(ROOT, v))) || Boolean(resolve(v, f)) || toolIndex.has(base);
      if (!ok) { nToolMissing++; rows.push([rel, "tool", v, "MISSING", ""]); }
      continue;
    }
    if (!looksPath) continue;
    if (/[<>*]/.test(v)) continue; // template
    nPath++;
    if (/^G:[\\/]tmp[\\/]/.test(v)) { nScratch++; rows.push([rel, "scratch", v, "SCRATCH", ""]); continue; }
    const hit = resolve(v, f);
    if (!hit) { nMissing++; rows.push([rel, "path", v, "MISSING", ""]); }
  }
}
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`docs ${docs.length}; backticked paths ${nPath} (missing ${nMissing}), tools ${nTool} (missing ${nToolMissing}), scratch refs ${nScratch}`);
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")} (${rows.length - 1} findings)`);
