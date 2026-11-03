// check.mjs — the MHGU tree's own gate: the denominator is complete, every doc has a verdict, and the meter runs.
//
// It asserts structure, not percentages: a percentage that moves for a legitimate reason should not fail a gate, but a
// doc that silently drops out of the manifest, or a slice whose TSV lost its header, is exactly the drift this tree
// keeps producing.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "G:/omp works/MHGU";
let failures = 0;
const ok = (m) => console.log(`PASS ${m}`);
const bad = (m) => { console.log(`FAIL ${m}`); failures++; };

// 1. manifest vs disk
const manifest = fs.readFileSync(path.join(ROOT, "docs/analysis/audit/MANIFEST.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t")[0]);
const onDisk = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, e.name);
    if (e.isDirectory()) walk(q); else if (e.name.endsWith(".md")) onDisk.push(path.relative(ROOT, q).replace(/\\/g, "/"));
  }
})(path.join(ROOT, "docs"));
const missing = manifest.filter((d) => !onDisk.includes(d));
const added = onDisk.filter((d) => !manifest.includes(d));
if (missing.length) bad(`manifest lists ${missing.length} doc(s) that no longer exist: ${missing.slice(0, 3).join(", ")}`);
else ok(`manifest covers ${manifest.length} docs, all present`);
if (added.length) console.log(`note ${added.length} doc(s) exist but are not in the frozen manifest (new since 2026-11-03): ${added.slice(0, 3).join(", ")}`);

// 2. every manifest doc has at least one verdict
const allPath = path.join(ROOT, "docs/analysis/audit/ROUND1-ALL.tsv");
if (!fs.existsSync(allPath)) bad("ROUND1-ALL.tsv missing (run tools/audit/summarize.mjs)");
else {
  const docs = new Set(fs.readFileSync(allPath, "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t")[1]));
  const un = manifest.filter((d) => !docs.has(d));
  if (un.length) bad(`${un.length} manifest doc(s) have no verdict: ${un.slice(0, 3).join(", ")}`);
  else ok(`all ${manifest.length} manifest docs carry a verdict`);
}

// 3. slice TSVs keep their contract header
for (const f of fs.readdirSync(path.join(ROOT, "docs/analysis/audit")).filter((x) => x.endsWith(".tsv") && !/^(MANIFEST|DOC-LINKS|ROUND1-ALL|TIERB-CONF-RECOUNT)/.test(x) && !/-FIXES\.tsv$/.test(x))) {
  const head = fs.readFileSync(path.join(ROOT, "docs/analysis/audit", f), "utf8").split("\n")[0];
  if (head !== "doc\titem\tverdict\tevidence\tnote") bad(`${f}: unexpected header "${head.slice(0, 60)}"`);
}
ok("slice TSV headers checked");

// 4. the meter runs and states a denominator
try {
  // No --demote here: report.mjs loads every demote-*.tsv by default, and passing one file used to look like the gate
  // was measuring a narrower tree than the one the meter publishes.
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/report.mjs"], { cwd: ROOT, encoding: "utf8" });
  const m = /denominator: (\d+) functions, (\d+) instructions/.exec(out);
  if (!m) bad("coverage meter produced no denominator line");
  else ok(`coverage meter: ${m[1]} functions / ${m[2]} instructions`);
  const a = /tier A \(verified\)\t(\d+)\t(\d+)\t([\d.]+)%/.exec(out);
  if (a) console.log(`note tier A now ${a[1]} functions / ${a[3]}% of instructions`);
} catch (e) {
  bad(`coverage meter failed: ${String(e.message).slice(0, 120)}`);
}

// 5. the evidence tables themselves: schema, real starts, and a partition that adds up to the denominator
try {
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/check-artifacts.mjs"], { cwd: ROOT, encoding: "utf8" });
  const m = /checked (\d+) evidence files, (\d+) rows, (\d+) distinct functions/.exec(out);
  if (/^PASS/m.test(out) && m) ok(`evidence tables: ${m[1]} files, ${m[2]} rows, ${m[3]} functions`);
  else bad(`evidence tables failed: ${out.split("\n").find((l) => l.startsWith("ERR")) || out.slice(0, 120)}`);
} catch (e) {
  bad(`evidence-table check failed: ${String(e.message).slice(0, 120)}`);
}

// 6. the evidence rows themselves: re-read what each sampled A row claims (string present, vtable slot holds the start,
// movw immediate in the body) instead of trusting the text. Deterministic sampling, ~0.2 s for 654 rows.
try {
  // SAMPLE is large on purpose: the full set is 8,089 rows and the pass takes 0.2 s, so there is no reason to sample.
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/verify-evidence.mjs"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, SAMPLE: "100000" } });
  const m = /total (\d+)\/(\d+) = ([\d.]+)%/.exec(out);
  if (m && m[1] === m[2]) ok(`evidence rows re-verified: ${m[2]} rows, all consistent`);
  else bad(`evidence rows re-verified: ${out.split("\n").filter((l) => l.includes("FAIL")).join(" ") || out.slice(0, 160)}`);
} catch (e) {
  bad(`evidence re-check failed: ${String(e.message).slice(0, 120)}`);
}

// 7. the inferred rows: re-derive each one from the anchors its channel used. This is the counterpart of gate 6 for the
// 16.8k rows that are not evidence but still make a checkable claim.
try {
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/verify-inferred.mjs"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, SAMPLE: "100000" } });
  const m = /total (\d+)\/(\d+) = ([\d.]+)%/.exec(out);
  if (m && Number(m[3]) >= 99.5) ok(`inferred rows re-derived: ${m[1]}/${m[2]} (${m[3]}%)`);
  else bad(`inferred rows re-derived: ${out.split("\n").filter((l) => l.includes("FAIL")).slice(0, 2).join(" ") || out.slice(0, 160)}`);
} catch (e) {
  bad(`inferred re-derivation failed: ${String(e.message).slice(0, 120)}`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nALL PASS");
process.exit(failures ? 1 : 0);
