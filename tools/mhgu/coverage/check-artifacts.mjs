// check-artifacts.mjs — schema and integrity gate for every coverage artefact.
//
// The meter has been wrong twice in ways no reader could see: a partition that did not add up, and an evidence file whose
// start column used bare hex so 1,673 rows silently failed to match the function table. This checks the things that would
// have caught both: every row parses, every start is a real function start, confidences are from the known set, channels
// listed in sources.json exist, and the inference channels do not contradict direct evidence.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const errors = [];
const warn = [];

const starts = new Set(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(",")[0].toLowerCase()));

const sources = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
for (const f of sources) if (!fs.existsSync(path.join(INV, f))) errors.push(`sources.json names a missing file: ${f}`);

const seen = new Map(); // start -> Map(label -> files)
// Only the adopted sources are checked: the directory also holds score tables and superseded passes, and a confidence of B
// inside a source file is normal (it marks the rows that do not count as evidence).
let files = 0, rows = 0;
const perConf = new Map(); // conf -> {rows, starts}
const confStarts = new Map();
for (const f of sources) {
  const p = path.join(INV, f);
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) { warn.push(`${f}: empty`); continue; }
  const head = lines[0].split("\t");
  if (head[0] !== "start" || head[1] !== "label" || head[2] !== "conf") { errors.push(`${f}: unexpected header ${head.join(",")}`); continue; }
  files++;
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split("\t");
    if (c.length < 3) { errors.push(`${f}:${i + 1}: fewer than 3 columns`); break; }
    const start = "0x" + parseInt(c[0], 16).toString(16);
    if (!Number.isFinite(parseInt(c[0], 16))) { errors.push(`${f}:${i + 1}: start does not parse (${c[0]})`); break; }
    if (!starts.has(start)) { errors.push(`${f}:${i + 1}: ${start} is not a function start`); break; }
    if (!["A", "B", "V", "S"].includes(c[2])) { errors.push(`${f}:${i + 1}: confidence ${c[2]} not in A/B/V/S`); break; }
    if (!c[1]) { errors.push(`${f}:${i + 1}: empty label`); break; }
    if (c[2] === "B" || c[1] === "unknown") continue; // present but not evidence
    rows++;
    if (!perConf.has(c[2])) { perConf.set(c[2], { rows: 0, starts: new Set() }); }
    perConf.get(c[2]).rows++;
    perConf.get(c[2]).starts.add(start);
    if (!seen.has(start)) seen.set(start, new Map());
    seen.get(start).set(f, c[1]);
  }
}

// inference rows must not contradict direct evidence
let contradictions = 0;
for (const [start, m] of seen) {
  const labs = new Set(m.values());
  if (labs.size > 1) {
    const direct = [...m].filter(([f]) => !/vote\.tsv$|immscan\.tsv$/.test(f));
    const inferred = [...m].filter(([f]) => /vote\.tsv$|immscan\.tsv$/.test(f));
    if (direct.length && inferred.length) contradictions++;
  }
}

const report = fs.readFileSync(path.join(INV, "coverage-report.tsv"), "utf8").trim().split(/\r?\n/);
const partitions = report.filter((l) => l.startsWith("partition:")).map((l) => [l.split("\t")[0], Number(l.split("\t")[2])]);
if (partitions.length) {
  const sum = partitions.reduce((a, [, n]) => a + n, 0);
  // the denominator is not a row: read it from the report header line "denominator: N functions, M instructions"
  const hdr = fs.readFileSync(path.join(INV, "coverage-report.tsv"), "utf8").match(/denominator:\s*(\d+)\s*functions,\s*(\d+)\s*instructions/);
  if (!hdr) { errors.push("coverage-report.tsv has no denominator line, so the partition cannot be checked"); }
  const total = hdr ? Number(hdr[2]) : sum;
  if (sum !== total) errors.push(`partition instructions sum ${sum} != denominator ${total}`);
}

// Report the confidence split, not one merged total: a merged number lets 15k inference rows be quoted as if they were
// evidence, and 29,091 is more than twice the 13,060 functions that actually carry an evidence row.
const split = [...perConf].sort((a, b) => (b[1].rows - a[1].rows)).map(([c, e]) => `conf ${c}: ${e.rows} rows / ${e.starts.size} functions`).join("; ");
console.log(`checked ${files} evidence files, ${rows} rows, ${seen.size} distinct functions`);
console.log(`  ${split}`);
if (contradictions) warn.push(`${contradictions} function(s) have a direct label and a different inferred label`);
for (const w of warn) console.log("WARN " + w);
for (const e of errors.slice(0, 10)) console.log("ERR  " + e);
console.log(errors.length ? `FAIL: ${errors.length} error(s)` : "PASS");
process.exit(errors.length ? 1 : 0);
