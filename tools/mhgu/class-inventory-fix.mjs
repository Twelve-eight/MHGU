// class-inventory-fix.mjs - make `registrar_fn` name the function that actually owns `registrar_site` (W6-P127).
//
// The defect: registrar_fn was recorded as the start of the enclosing *family* function, while the class-name
// load recorded as registrar_site sits in a different function (a sub-function that is a bl target, so it is
// its own entry). Measured 2026-11-06: 3,143 of 3,201 rows disagree, and the owner is always a known entry.
// Two independent anchors from the W6-P123 adjudication agree with the body walk:
//   sFestaResource  fn 0x3dee74 -> 0x3def5c   (the name loads at 0x3defe4, inside 0x3def5c)
//   cResourceSample fn 0x381738 -> 0x3818cc   (0x381954 is inside 0x3818cc, 55 instructions)
//
//   node MHGU/tools/mhgu/class-inventory-fix.mjs [--check] [--report <md>]
//
// The owner is computed by tools/mhgu/fn-body.mjs's rule (CFG reachability, capped at the next known entry).
// Exit codes: 0 = wrote/verified, 1 = an anchor or an invariant failed.
import fs from "node:fs";

const ROOT = "G:/omp works/MHGU";
const TSV = `${ROOT}/docs/data/class-inventory.tsv`;
const FLAT = "G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin";
const CHECK = process.argv.includes("--check");
const ri = process.argv.indexOf("--report");
const REPORT = ri >= 0 ? process.argv[ri + 1] : null;

// One implementation, imported from fn-body.mjs: a duplicated decoder here carried the same `blx` mask bug
// (an indirect call read as a return) and would have drifted again (AGENTS 1b).
const { bodyOf, capFor, starts, inText } = await import("./fn-body.mjs");
const body = (s) => new Set(bodyOf(s, capFor(s, starts)));
function owner(site) {
  let lo = 0, hi = starts.length - 1, idx = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= site) { idx = m; lo = m + 1; } else hi = m - 1; }
  for (let i = idx; i >= 0 && i > idx - 40; i--) if (body(starts[i]).has(site)) return starts[i];
  return null;
}

const rawText = fs.readFileSync(TSV, "utf8");
const EOL = rawText.includes("\r\n") ? "\r\n" : "\n";
const lines = rawText.split(/\r?\n/);
const header = lines[0].replace(/\r$/, "");
if (!header.startsWith("family\tname\tsize\tregistrar_fn\tregistrar_site")) throw new Error(`unexpected header: ${header}`);
const rows = [header];
let changed = 0, noSite = 0, noOwner = 0, alreadyRight = 0;
const changes = [];
for (const line of lines.slice(1)) {
  if (!line.trim()) { rows.push(line); continue; }
  const f = line.split("\t");
  const site = parseInt(f[4], 16);
  if (!inText(site)) { noSite++; rows.push(line); continue; }
  const o = owner(site);
  if (o === null) { noOwner++; rows.push(line); continue; }
  const hex = "0x" + o.toString(16);
  if (hex !== f[3]) { changes.push([f[1], f[3], hex, f[4]]); f[3] = hex; changed++; } else alreadyRight++;
  rows.push(f.join("\t"));
}

// anchors from the W6-P123 adjudication
const want = { sFestaResource: ["0x3def5c", "0x3defe4"], cResourceSample: ["0x3818cc", "0x381954"] };
const fails = [];
for (const [name, [fn, site]] of Object.entries(want)) {
  const out = rows.find((l) => l.split("\t")[1] === name);
  if (!out) { fails.push(`${name}: row missing`); continue; }
  const f = out.split("\t");
  if (f[3] !== fn) fails.push(`${name}: registrar_fn ${f[3]} != ${fn} (site ${f[4]})`);
}
// invariant: every remaining row's site is still inside its (possibly new) registrar_fn body
let unowned = 0;
for (const l of rows) {
  if (!l.trim()) continue;
  const f = l.split("\t");
  const fn = parseInt(f[3], 16), site = parseInt(f[4], 16);
  if (!inText(site)) continue;
  if (!inText(fn) || !body(fn).has(site)) unowned++;
}
if (unowned) fails.push(`${unowned} row(s) still have a registrar_site outside their registrar_fn`);

const summary = [
  `# class-inventory-fix report (W6-P127)`,
  ``,
  `rows: ${rows.filter((l) => l.trim()).length - 1}`,
  `registrar_fn rewritten: **${changed}**`,
  `already correct: ${alreadyRight}`,
  `site outside .text (left alone): ${noSite}`,
  `site owned by no known entry (left alone): ${noOwner}`,
  ``,
  `## anchors`,
  ...Object.entries(want).map(([n, [fn]]) => `- ${n}: ${rows.find((l) => l.split("\t")[1] === n)?.split("\t")[3] ?? "MISSING"} (expected ${fn})`),
  ``,
  `## changes (first 40)`,
  ...changes.slice(0, 40).map((c) => `- ${c[0]}: ${c[1]} -> ${c[2]}  (site ${c[3]})`),
  changes.length > 40 ? `- ... ${changes.length - 40} more` : ``,
  "",
];
if (REPORT) fs.writeFileSync(REPORT, summary.join("\n"));

console.log(summary.slice(0, 6).join("\n"));
console.log(`controls: ${fails.length ? "FAIL" : "pass"}`);
for (const f of fails) console.log("  FAIL " + f);
if (!CHECK && !fails.length) { fs.writeFileSync(TSV, rows.join(EOL)); console.log(`wrote ${TSV}`); }
else console.log(CHECK ? "(check mode: file not written)" : "(not written: controls failed)");
process.exit(fails.length ? 1 : 0);
