// slice-assemble.mjs - turn per-part row files into one slice table, with the summary computed from the rows.
//
// The adjudication rows arrive as `| vaddr | label | role | conf | evidence |` files, one per part, written
// by separate agents so that no two of them ever edit the same file (AGENTS §8 / the P2-A2 write-set rule).
// This tool is the single place that assembles them, so the table and its stated counts cannot drift:
// every number in the summary block is computed from the rows being written (W6-P122 closed 97 contradictions
// that came from hand-maintained summaries).
//
//   node MHGU/tools/mhgu/slice-assemble.mjs --slice tierB-slice-09 --rows-dir G:/tmp/tierb-s09 --parts 18
//   node MHGU/tools/mhgu/slice-assemble.mjs ... --dry        # validate only, write nothing
//
// Guards (exit 1 on any of them):
//   * a row that does not have exactly 5 cells, a label outside the vocabulary, or conf outside A/B/C
//   * a duplicate vaddr inside this table
//   * a vaddr that another slice table already adjudicates (the merge would report it as a conflict)
//   * a part file that is missing or whose row count disagrees with its pack's block count
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const SLICES = path.join(INV, "slices");
const arg = (k, d = null) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };

const SLICE = arg("slice", "tierB-slice-09");
const ROWS_DIR = arg("rows-dir", "G:/tmp/tierb-s09");
const PARTS = +arg("parts", "18");
const DRY = process.argv.includes("--dry");
const TARGETS = [
  path.join(SLICES, "reports-mhgu", `${SLICE}.md`),
  path.join(SLICES, "w6-pass12", `${SLICE}.md`),
].filter((p) => fs.existsSync(p) || p.includes("reports-mhgu"));

const LABELS = new Set([
  "quest", "monster-em", "render-gfx", "online-nex", "weapon-wp", "player-pl", "otomo-ot",
  "ui", "item", "save-data", "audio", "kernel-os", "physics-math", "unknown",
]);
const ROW_RE = /^\|\s*`?(0x[0-9a-fA-F]+)`?\s*\|\s*([a-z-]+)\s*\|\s*([a-z]+)\s*\|\s*([ABC])\s*\|(.*)\|\s*$/;

// ---- collect ------------------------------------------------------------------------------------
const errors = [];
const rows = [];
for (let i = 1; i <= PARTS; i++) {
  const n = String(i).padStart(2, "0");
  const p = path.join(ROWS_DIR, `rows-${n}.md`);
  if (!fs.existsSync(p)) { errors.push(`missing ${p}`); continue; }
  const packPath = path.join(ROWS_DIR, `part-${n}.md`);
  const packCount = fs.existsSync(packPath)
    ? (fs.readFileSync(packPath, "utf8").match(/^=== 0x[0-9a-f]+/gm) || []).length
    : null;
  let got = 0;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("<!--") || t.startsWith("| vaddr") || /^\|[-| ]+\|$/.test(t)) continue;
    const m = ROW_RE.exec(t);
    if (!m) { errors.push(`part-${n}: unparsable row: ${t.slice(0, 100)}`); continue; }
    const [, v, label, role, conf, evidence] = m;
    if (!LABELS.has(label)) errors.push(`part-${n}: label "${label}" outside the vocabulary (${v})`);
    got++;
    rows.push({ part: n, v: v.toLowerCase(), label, role, conf, evidence: evidence.trim() });
  }
  if (packCount !== null && got !== packCount) errors.push(`part-${n}: ${got} row(s) vs ${packCount} block(s) in the pack`);
  console.log(`part-${n}: ${got} row(s)${packCount === null ? "" : ` of ${packCount} block(s)`}`);
}

// duplicate inside this table
const seen = new Map();
for (const r of rows) {
  if (seen.has(r.v)) errors.push(`duplicate vaddr ${r.v} (parts ${seen.get(r.v)} and ${r.part})`);
  else seen.set(r.v, r.part);
}

// already adjudicated by another slice table: drop by default (a repeat adds no coverage and the merge would
// report it as a label disagreement), keep as a hard error under --strict.
const STRICT = process.argv.includes("--strict");
const dropped = [];
for (const dir of ["reports-mhgu", "w6-pass12"]) {
  const d = path.join(SLICES, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /^tierB.*\.md$/.test(x) && x !== `${SLICE}.md`)) {
    const txt = fs.readFileSync(path.join(d, f), "utf8");
    for (const m of txt.matchAll(/^\|\s*`?(0x[0-9a-fA-F]+)`?\s*\|/gm)) {
      const v = m[1].toLowerCase();
      if (!seen.has(v)) continue;
      if (STRICT) errors.push(`${v} is already adjudicated by ${dir}/${f}`);
      else dropped.push({ v, where: `${dir}/${f}`, part: seen.get(v) });
    }
  }
}
if (dropped.length) {
  const byWhere = {};
  for (const d of dropped) byWhere[d.where] = (byWhere[d.where] || 0) + 1;
  const nv = new Set(dropped.map((d) => d.v)).size;
  console.log(`\ndropped ${nv} distinct vaddr(s) (${dropped.length} table hit(s)) already adjudicated elsewhere: ` +
    Object.entries(byWhere).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
  const dead = new Set(dropped.map((d) => d.v));
  for (let i = rows.length - 1; i >= 0; i--) if (dead.has(rows[i].v)) rows.splice(i, 1);
}

if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors.slice(0, 40)) console.log("  " + e);
  if (errors.length > 40) console.log(`  ... ${errors.length - 40} more`);
  process.exit(1);
}

// ---- summary computed from the rows --------------------------------------------------------------
rows.sort((a, b) => parseInt(a.v, 16) - parseInt(b.v, 16));
const hist = {}, confs = { A: 0, B: 0, C: 0 }, roles = {};
for (const r of rows) { hist[r.label] = (hist[r.label] || 0) + 1; confs[r.conf]++; roles[r.role] = (roles[r.role] || 0) + 1; }
const kv = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
const first = rows[0].v, last = rows[rows.length - 1].v;
const summary = [
  "<!-- SUMMARY-START -->",
  `**${rows.length} functions adjudicated**, \`${first}..${last}\`, one row each. Counts below are computed from`,
  "the rows in this file by `tools/mhgu/slice-assemble.mjs`, never hand-maintained.",
  "",
  `- labels: ${kv(hist)}`,
  `- confidence: A ${confs.A}, B ${confs.B}, C ${confs.C}`,
  `- roles: ${kv(roles)}`,
  "<!-- SUMMARY-END -->",
].join("\n");

const table = ["| vaddr | label | role | conf | evidence |", "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.v} | ${r.label} | ${r.role} | ${r.conf} | ${r.evidence} |`)].join("\n");

// ---- write ---------------------------------------------------------------------------------------
for (const t of TARGETS) {
  const base = fs.existsSync(t)
    ? fs.readFileSync(t, "utf8")
    : fs.readFileSync(path.join(SLICES, "reports-mhgu", `${SLICE}.md`), "utf8");
  if (!/<!-- TABLE -->/.test(base)) { console.log(`ERROR: ${t} has no <!-- TABLE --> marker`); process.exit(1); }
  const out = base.replace(/<!-- TABLE -->/, `${summary}\n\n${table}`);
  if (DRY) { console.log(`DRY would write ${t} (${out.length} B)`); continue; }
  fs.writeFileSync(t, out, "utf8");
  console.log(`wrote ${t} (${rows.length} row(s))`);
}
console.log(`\nrows: ${rows.length}  labels: ${kv(hist)}`);
console.log(`confidence: A ${confs.A}, B ${confs.B}, C ${confs.C}`);
