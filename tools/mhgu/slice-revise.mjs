// slice-revise.mjs -- apply a review's correction list to the per-part row files, auditable and idempotent.
//
// A review that finds a wrong row should not be re-typed by hand into nine files: the change list is data, and the
// application should be one command with a log. Each change must match the row it claims to change (old label and
// old conf), so applying a stale list refuses instead of silently rewriting something else.
//
//   node MHGU/tools/mhgu/slice-revise.mjs --changes <CHANGES.tsv> --rows-dir <dir> [--dry] [--by <who>]
//
// CHANGES.tsv: header + `address  old_label  old_conf  new_label  new_conf  evidence  verdict` (tab-separated;
// comment lines starting `#` ignored; only verdict APPLY is applied - NEEDS-EVIDENCE rows are reported and skipped).
//
// Effects per applied row: the label and conf cells are replaced, and a marker is appended to the evidence cell:
//   [revised <date> <who>: <old_label>/<old_conf> -> <new_label>/<new_conf>; <evidence>]
// A `revisions.tsv` next to the rows dir records every change as `at  file  address  old  new  evidence`.
//
// Guards (exit 1): address absent, address present in more than one part, old cells do not match, new label outside
// the vocabulary, new conf outside A/B/C, or a change that would raise a conf to A without the evidence naming a
// class/resource string (a review may not mint A rows; that needs the block's own bytes).
import fs from "node:fs";
import path from "node:path";

const arg = (k, d = null) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const CHANGES = arg("changes");
const DIR = arg("rows-dir");
const DRY = process.argv.includes("--dry");
const BY = arg("by", "main session");
if (!CHANGES || !DIR) {
  console.error("usage: node MHGU/tools/mhgu/slice-revise.mjs --changes <CHANGES.tsv> --rows-dir <dir> [--dry] [--by <who>]");
  process.exit(2);
}

const LABELS = new Set([
  "quest", "render-gfx", "weapon-wp", "item", "monster-em", "otomo-ot", "player-pl", "kernel-os",
  "physics-math", "ui", "audio", "save-data", "save-io", "online-nex", "filesystem", "debug-dev", "unknown",
]);
const CONFS = new Set(["A", "B", "C"]);

const changes = fs.readFileSync(CHANGES, "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#"))
  .slice(1) // header
  .map((l) => { const c = l.split("\t"); return { addr: c[0]?.trim(), oldLabel: c[1]?.trim(), oldConf: c[2]?.trim(), newLabel: c[3]?.trim(), newConf: c[4]?.trim(), evidence: (c[5] ?? "").trim(), verdict: (c[6] ?? "").trim() }; })
  .filter((c) => c.addr);

const files = fs.readdirSync(DIR).filter((f) => /^rows-\d+\.md$/.test(f)).sort();
const where = new Map(); // addr -> {file, line index}
const lines = new Map(); // file -> string[]
for (const f of files) {
  const L = fs.readFileSync(path.join(DIR, f), "utf8").split(/\r?\n/);
  lines.set(f, L);
  L.forEach((l, i) => {
    const m = /^\|\s*(0x[0-9a-f]+)\s*\|/.exec(l);
    if (!m) return;
    const a = m[1].toLowerCase();
    if (where.has(a)) where.set(a, { file: "DUP", i: -1 });
    else where.set(a, { file: f, i });
  });
}

const fails = [];
const applied = [];
const skipped = [];
const log = [];
const today = new Date().toISOString().slice(0, 10);

for (const c of changes) {
  const a = c.addr.toLowerCase();
  if (!/^0x[0-9a-f]+$/.test(a)) { fails.push(`${c.addr}: not an address`); continue; }
  if (c.verdict && c.verdict !== "APPLY") { skipped.push(`${a} (${c.verdict || "no verdict"})`); continue; }
  const w = where.get(a);
  if (!w) { fails.push(`${a}: no such row`); continue; }
  if (w.file === "DUP") { fails.push(`${a}: appears in more than one part file`); continue; }
  if (!LABELS.has(c.newLabel)) { fails.push(`${a}: new label "${c.newLabel}" is outside the vocabulary`); continue; }
  if (!CONFS.has(c.newConf)) { fails.push(`${a}: new conf "${c.newConf}" is not A/B/C`); continue; }
  const L = lines.get(w.file);
  const cells = L[w.i].split("|").map((s) => s.trim());
  // cells: ["", addr, label, role, conf, evidence, ""]
  if (cells[2] === c.newLabel && cells[4] === c.newConf) { skipped.push(`${a} (already ${c.newLabel}/${c.newConf})`); continue; }
  // The assembled table normalises an authored conf "unknown" to "C"; a change list written against the table
  // therefore says old_conf C while the row file still says unknown. Accept that one substitution and say so.
  const authoredUnknown = cells[4] === "unknown" && c.oldConf === "C";
  if (cells[2] !== c.oldLabel || (!authoredUnknown && cells[4] !== c.oldConf)) {
    fails.push(`${a}: row says ${cells[2]}/${cells[4]}, the change list expects ${c.oldLabel}/${c.oldConf}`);
    continue;
  }
  if (c.oldConf !== "A" && c.newConf === "A" && !/[A-Za-z_][A-Za-z0-9_]{3,}/.test(c.evidence)) {
    fails.push(`${a}: raising conf to A needs evidence naming a class or resource string`);
    continue;
  }
  cells[2] = c.newLabel;
  cells[4] = c.newConf;
  cells[5] = `${cells[5]} [revised ${today} ${BY}: ${c.oldLabel}/${c.oldConf} -> ${c.newLabel}/${c.newConf}; ${c.evidence}]`;
  L[w.i] = `| ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} |`.replace(/^\| /, "| ").replace(/ $/, " ");
  // Rebuild with the address in the first cell (the original line may have had a leading space in cell 1).
  L[w.i] = `| ${a} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${cells[5]} |`;
  applied.push({ addr: a, file: w.file, from: `${c.oldLabel}/${c.oldConf}`, to: `${c.newLabel}/${c.newConf}`, evidence: c.evidence });
  log.push([new Date().toISOString(), w.file, a, `${c.oldLabel}/${c.oldConf}`, `${c.newLabel}/${c.newConf}`, c.evidence].join("\t"));
}

if (!DRY) for (const [f, L] of lines) if (applied.some((x) => x.file === f)) fs.writeFileSync(path.join(DIR, f), L.join("\n"));

console.log(`changes: ${changes.length} | applied: ${applied.length} | skipped (not APPLY): ${skipped.length} | refused: ${fails.length}`);
if (skipped.length) console.log(`  skipped: ${skipped.join(", ")}`);
for (const x of applied) console.log(`  ${x.addr} ${x.from} -> ${x.to}  (${x.file})`);
if (fails.length) {
  console.log("\nREFUSED:");
  for (const f of fails) console.log(`  ${f}`);
  process.exitCode = 1;
}
if (!DRY && log.length) {
  const lp = path.join(DIR, "revisions.tsv");
  if (!fs.existsSync(lp)) fs.writeFileSync(lp, "at\tfile\taddress\tfrom\tto\tevidence\n");
  fs.appendFileSync(lp, log.join("\n") + "\n");
  console.log(`\nlog: ${lp}`);
}
if (DRY) console.log("\n(dry run: nothing written)");
