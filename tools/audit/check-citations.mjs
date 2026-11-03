// check-citations.mjs — resolve every `file:line` citation in docs/editor-spec/*.md against the file it names.
//
// A citation is a claim that line N of a named document says what the sentence says. The gate opens the target,
// prints the line, and fails when the target is missing, past EOF, blank, a code fence, or a table separator —
// a citation that cannot be read is not a citation. It also scores the line against the identifiers the citing
// sentence carries (hex offsets and counted numbers) and prints those that do not appear on the cited line, so a
// drifted table row is visible even when the target line is a valid row.
//
// Usage: node tools/audit/check-citations.mjs [--all] [--json]
//   --all   also print the OK rows (default: problems + summary)
//   --json  machine-readable array of every resolved reference
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC_DIR = path.resolve(process.argv.find((a) => a.endsWith("/")) || path.join(ROOT, "docs/editor-spec"));
const args = new Set(process.argv.slice(2));
const SHOW_ALL = args.has("--all");
const AS_JSON = args.has("--json");

// ---------------------------------------------------------------------------------------------------------------
// Target index: a citation names a bare file (`coverage-map.md`) that may live in any docs/ subtree. Index every
// file under the repo once, then resolve by basename with a fixed precedence so the answer is deterministic.
const PREF = [
  "docs/save-layout/", "docs/mechanics/", "docs/analysis/", "docs/data/", "docs/editor-spec/",
  "docs/", "tools/", "",
];
const index = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules" || e.name === ".tmp") continue;
    const q = path.join(dir, e.name);
    if (e.isDirectory()) { walk(q); continue; }
    const rel = path.relative(ROOT, q).replace(/\\/g, "/");
    if (!index.has(e.name)) index.set(e.name, []);
    index.get(e.name).push(rel);
  }
})(ROOT);
function resolveTarget(ref) {
  const clean = ref.replace(/^\.\//, "");
  if (clean.includes("/")) return fs.existsSync(path.join(ROOT, clean)) ? [clean] : [];
  const cands = index.get(clean) || [];
  const rank = (p) => { const i = PREF.findIndex((x) => p.startsWith(x)); return i < 0 ? PREF.length : i; };
  return cands.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// ---------------------------------------------------------------------------------------------------------------
// Citation syntax: `<file>.<ext>:<n>` and `<ext>:<a>-<b>`, with comma-continued specs attributed to the same file,
// e.g. `social-checksum.md:200, 284-285` or `coverage-map.md:268-299, 374-386`.
const REF_RE = /([A-Za-z0-9_][A-Za-z0-9_./+-]*\.(?:md|txt|tsv|mjs|json|py|sh)):([0-9]+(?:-[0-9]+)?(?:,\s*[0-9]+(?:-[0-9]+)?)*)/g;
const FENCE_RE = /^\s*(?:```|~~~)/;
const SEP_RE = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

// Hex offsets are written with or without leading zeros (`0x0B1` vs `0xB1`), so compare them numerically.
const normHex = (h) => "0x" + BigInt(h).toString(16);
// Identifiers carried by the citing sentence: offsets and counted values. Rule ids (EQ-03, MN-07) are excluded on
// purpose — every table row carries its own id, but source documents do not use the same id, so it would never match.
function claimTokens(text) {
  const out = new Map();
  for (const m of text.matchAll(/0x[0-9A-Fa-f]{2,}/g)) out.set(normHex(m[0]), m[0]);
  for (const m of text.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g)) out.set(m[0].replace(/,/g, ""), m[0]);
  for (const m of text.matchAll(/\b\d{5,}\b/g)) out.set(m[0], m[0]);
  return [...out.entries()].map(([key, shown]) => ({ key, shown }));
}
function lineHexes(line) {
  const s = new Set();
  for (const m of line.matchAll(/0x[0-9A-Fa-f]+/g)) s.add(normHex(m[0]));
  return s;
}
function lineHas(line, key) {
  if (/^0x/.test(key)) return lineHexes(line).has(key);
  return line.toLowerCase().replace(/,/g, "").includes(key);
}
// Only score a citation when both sides speak in offsets or numbers; a prose source that supports the claim in
// words has no identifier to repeat and must not be reported as drift.
function scoreClaims(citingLine, targetLine) {
  const claims = claimTokens(citingLine);
  const hayHex = lineHexes(targetLine);
  const hayNums = /[\d,]{3,}/.test(targetLine);
  const relevant = claims.filter((c) => (/^0x/.test(c.key) ? hayHex.size > 0 : hayNums));
  const missing = relevant.filter((c) => !lineHas(targetLine, c.key));
  return { claims: relevant, missing };
}

// ---------------------------------------------------------------------------------------------------------------
const specFiles = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith(".md")).sort();
const rows = [];
let nBad = 0, nWarn = 0, nOk = 0, nRefs = 0;

for (const spec of specFiles) {
  const specPath = path.join(SPEC_DIR, spec);
  const lines = fs.readFileSync(specPath, "utf8").split(/\r?\n/);
  lines.forEach((text, li) => {
    for (const m of text.matchAll(REF_RE)) {
      const refFile = m[1];
      const specs = m[2].split(",").map((s) => s.trim());
      const targets = resolveTarget(refFile);
      const where = `${spec}:${li + 1}`;
      if (!targets.length) {
        nRefs++; nBad++;
        rows.push({ where, ref: `${refFile}:${m[2]}`, resolved: null, status: "MISSING", detail: `no file named ${refFile} in the repo`, text: "" });
        continue;
      }
      const target = targets[0];
      const tlines = fs.readFileSync(path.join(ROOT, target), "utf8").split(/\r?\n/);
      for (const specStr of specs) {
        nRefs++;
        const [a, b] = specStr.split("-").map(Number);
        const label = `${refFile}:${specStr}`;
        const base = { where, ref: label, resolved: `${target}:${specStr}`, target };
        const eof = tlines.length;
        if (!Number.isFinite(a) || a < 1 || (b !== undefined && b < a)) {
          nBad++; rows.push({ ...base, status: "RANGE", detail: `unusable line spec "${specStr}"`, text: "" }); continue;
        }
        if (b !== undefined && b > eof) {
          nBad++; rows.push({ ...base, status: "EOF", detail: `range end ${b} > ${eof} lines`, text: (tlines[a - 1] || "").trim().slice(0, 60) }); continue;
        }
        if (a > eof) {
          nBad++; rows.push({ ...base, status: "EOF", detail: `line ${a} > ${eof} lines`, text: "" }); continue;
        }
        const tl = tlines[a - 1];
        const shown = tl.trim().slice(0, 60);
        if (tl.trim() === "") {
          nBad++; rows.push({ ...base, status: "BLANK", detail: `line ${a} is blank`, text: "" }); continue;
        }
        if (FENCE_RE.test(tl)) {
          nBad++; rows.push({ ...base, status: "FENCE", detail: `line ${a} opens/closes a code fence`, text: shown }); continue;
        }
        if (SEP_RE.test(tl)) {
          nBad++; rows.push({ ...base, status: "SEP", detail: `line ${a} is a table separator`, text: shown }); continue;
        }
        // strip the citation groups themselves: their line numbers ("547,636") look like counted claims
        const { claims, missing } = scoreClaims(text.replace(REF_RE, " "), tl);
        if (claims.length && missing.length === claims.length) {
          let near = "";
          for (let d = -3; d <= 3 && !near; d++) {
            if (d === 0) continue;
            const k = a - 1 + d;
            if (k < 0 || k >= eof) continue;
            if (claims.some((c) => lineHas(tlines[k], c.key))) near = `claim appears at line ${k + 1}`;
          }
          nWarn++;
          rows.push({ ...base, status: near ? "NEAR" : "IDMISS", detail: `${near || "no claim identifier on the line"}: ${claims.slice(0, 6).map((c) => c.shown).join(" ")}`, text: shown });
          continue;
        }
        nOk++;
        rows.push({ ...base, status: "OK", detail: "", text: shown });
      }
    }
  });
}

if (AS_JSON) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const bad = rows.filter((r) => ["MISSING", "EOF", "BLANK", "FENCE", "SEP", "RANGE"].includes(r.status));
  const warn = rows.filter((r) => r.status === "NEAR" || r.status === "IDMISS");
  const ok = rows.filter((r) => r.status === "OK");
  console.log(`# citation resolver: ${specFiles.length} specs, ${nRefs} references\n`);
  console.log(`## FAIL (${bad.length}) — missing file / past EOF / blank / fence / separator`);
  for (const r of bad) console.log(`FAIL ${r.where} -> ${r.ref}  [${r.status}] ${r.detail}${r.text ? `  | ${r.text}` : ""}`);
  console.log(`\n## WARN (${warn.length}) — target line does not carry the sentence's identifier`);
  for (const r of warn) console.log(`WARN ${r.where} -> ${r.resolved}  [${r.status}] ${r.detail}  | ${r.text}`);
  if (SHOW_ALL) {
    console.log(`\n## OK (${ok.length})`);
    for (const r of ok) console.log(`OK   ${r.where} -> ${r.resolved}  | ${r.text}`);
  }
  console.log(`\nresolved ${nRefs} references: ${nOk} ok, ${warn.length} warn, ${bad.length} fail`);
  const byKind = {};
  for (const r of bad) byKind[r.status] = (byKind[r.status] || 0) + 1;
  if (bad.length) console.log(`failures by kind: ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(bad.length ? "CITATION CHECK FAILED" : "CITATION CHECK PASSED");
}
process.exit(nBad ? 1 : 0);
