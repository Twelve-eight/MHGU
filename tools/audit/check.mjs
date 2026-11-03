// check.mjs — the MHGU tree's own gate: the denominator is complete, every doc has a verdict, and the meter runs.
//
// It asserts structure, not percentages: a percentage that moves for a legitimate reason should not fail a gate, but a
// doc that silently drops out of the manifest, or a slice whose TSV lost its header, is exactly the drift this tree
// keeps producing.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Resolved from this file so a clone runs the gate wherever it lives (audit W6-ROOTDOCS C9).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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

// 3. slice TSVs keep their contract header. LINK-STATUS.tsv is a disposition tracker for the linkage review, not a
// slice table, so it carries its own header and is exempt by name rather than by shape.
for (const f of fs.readdirSync(path.join(ROOT, "docs/analysis/audit")).filter((x) => x.endsWith(".tsv") && !/^(MANIFEST|DOC-LINKS|ROUND1-ALL|TIERB-CONF-RECOUNT|LINK-STATUS)/.test(x) && !/-FIXES\.tsv$/.test(x))) {
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
  const sk = /(\d+) further A rows carry no machine-checkable claim/.exec(out);
  const un = /(\d+) unparsed/.exec(out);
  if (m && m[1] === m[2]) ok(`evidence rows re-verified: ${m[2]} rows, all consistent` + (sk ? `; ${sk[1]} rest on a class-name or taxonomy judgement` : "") + (un ? `; ${un[1]} carry a claim shape no handler parses` : ""));
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

// 8. the headline itself: recompute the partition from the raw inputs with a second implementation. Gates 1-7 all
// compare artefacts to each other; if report.mjs merged its five sources wrongly, every one of them would still pass.
try {
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/independent-coverage.mjs"], { cwd: ROOT, encoding: "utf8" });
  const m = /covered at >=90% independently: (\d+) = ([\d.]+)%/.exec(out);
  if (/^PASS /m.test(out)) ok(`independent recomputation reproduces the report partition (${m?.[2]}% of instructions)`);
  else bad("independent recomputation: " + out.split("\n").filter((l) => l.startsWith("DIFF")).slice(0, 3).join("; "));
} catch (e) {
  const out = String(e.stdout || "");
  const diffs = out.split("\n").filter((l) => l.startsWith("DIFF")).slice(0, 3).join("; ");
  bad(`independent recomputation disagrees with the report: ${diffs || String(e.message).slice(0, 120)}`);
}

// 9. the published project calibre must equal what canonical-metric.mjs prints. The 58.4% figure survived for a day
// because every document hand-copied it while the script counted 512 functions a recorded review had refuted; nothing
// compared the two. A number that is retyped into five files needs one place that reads it back.
try {
  const out = execFileSync(process.execPath, ["tools/mhgu/coverage/canonical-metric.mjs"], { cwd: ROOT, encoding: "utf8" });
  const cm = /canonical total\s+([\d.]+)%/.exec(out);
  if (!cm) bad("canonical-metric.mjs printed no 'canonical total' line");
  else {
    const want = cm[1];
    const stated = [];
    for (const f of ["docs/analysis/code/coverage/METER.md", "HANDOFF.md", "docs/PROGRESS.md", "docs/analysis/code-metrics.md"]) {
      const lines = fs.readFileSync(path.join(ROOT, f), "utf8").split(/\r?\n/);
      lines.forEach((l, i) => {
        if (!/(项目原始口径|Tier B conf=A)/.test(l)) return;
        // the calibre is always written as "Tier A ... + B conf=A"; a passing mention of 项目原始口径 that quotes some
        // other percentage (e.g. the precision of a rule family) must not be read as the calibre
        if (!/Tier\s*A[^。]{0,60}B/.test(l)) return;
        const pcts = [...l.matchAll(/(\d+\.\d)%/g)].map((x) => x[1]);
        if (!pcts.length) return; // a definition line ("主指标 = Tier A + Tier B conf=A") states no value
        if (!pcts.includes(want)) { bad(`${f}:${i + 1} states the project calibre as ${pcts.join("/") || "no percentage"} but canonical-metric.mjs says ${want}%`); return; }
        // A line that carries the right total can still carry a stale part, or parts that do not add up (HANDOFF once said
        // 57.7 + 0.3 = 58.0 and, in the same sentence, "58.4% is the comparable calibre"). Check the formula itself.
        const sum = /(\d+\.\d)%\**\s*\+\s*.{0,80}?(\d+\.\d)%\**\s*=\s*\**\s*(\d+\.\d)%/.exec(l);
        if (sum) {
          const [x, y, z] = [+sum[1], +sum[2], +sum[3]];
          if (Math.abs(x + y - z) > 0.15) bad(`${f}:${i + 1} calibre does not add up: ${x} + ${y} = ${z}`);
          else if (Math.abs(z - +want) > 0.001) bad(`${f}:${i + 1} calibre sum ends in ${z} but the script says ${want}`);
        }
        stated.push(`${f}:${i + 1}`);
      });
    }
    if (stated.length) ok(`published project calibre matches canonical-metric.mjs (${want}%) at ${stated.length} site(s)`);
    else bad(`no document states the project calibre ${want}% next to 项目原始口径`);
  }
} catch (e) {
  bad(`canonical metric failed: ${String(e.message).slice(0, 120)}`);
}

// 10. the other four headline numbers in METER's header line come from four report rows, and were retyped by hand just
// like the calibre. The optimistic end had drifted to 82.6% while the report says 82.5% (4,315,652/5,228,277 = 82.54%),
// in a section that itself claims both endpoints have one source. Read them back.
try {
  const rows = fs.readFileSync(path.join(ROOT, "docs/analysis/code/inventory/coverage-report.tsv"), "utf8").split(/\r?\n/);
  const row = (prefix) => rows.find((l) => l.startsWith(prefix));
  const numCell = (l, i) => (l ? l.split("\t")[i] : null);
  const src = [
    numCell(row("covered at >=90% precision"), 3), numCell(row("covered at >=90% precision"), 4),
    numCell(row("covered, spread pooled at 72.4%"), 3), numCell(row("covered, spread pooled at 72.4%"), 4),
    numCell(row("expected explained fraction (precision-weighted"), 3),
    numCell(row("expected explained fraction (optimistic"), 3),
    numCell(row("partition: no label"), 3), numCell(row("partition: no label"), 4),
  ].map((x) => (x || "").replace("%", ""));
  if (src.some((x) => !/^\d+\.\d$/.test(x))) bad(`coverage-report.tsv headline rows unreadable: ${JSON.stringify(src)}`);
  else {
    const allowed = new Set([...src, "72.4"]); // 72.4 is the pooled precision quoted in the row's own label
    const line = fs.readFileSync(path.join(ROOT, "docs/analysis/code/coverage/METER.md"), "utf8")
      .split(/\r?\n/).find((l) => l.includes("当前口径"));
    if (!line) bad("METER.md has no 当前口径 line");
    else {
      const got = [...line.matchAll(/(\d+\.\d)%/g)].map((m) => m[1]);
      const missing = src.filter((x) => !got.includes(x));
      const extra = got.filter((x) => !allowed.has(x));
      if (missing.length || extra.length) bad(`METER.md header does not match the report: missing ${missing.join("/") || "-"}, unexpected ${extra.join("/") || "-"}`);
      else ok(`METER.md header numbers match coverage-report.tsv (${src.join("/")})`);
    }
  }
} catch (e) {
  bad(`headline cross-check failed: ${String(e.message).slice(0, 120)}`);
}

// 11. the save-side structural formula had the same shape of error as the calibre: PROGRESS wrote
// (227,386 + 950,374*0.85)/1,177,760 = 87.9%, but 227,386 is the END OFFSET 0x3783A, not the member-layer length, so the
// 632-byte header (measured ~40% structural) was silently counted at 100%. The length is 226,754 and the result is 87.84%.
// Any line that multiplies the tail by 0.85 must use the length.
try {
  let checked = 0;
  const before = failures;
  for (const f of ["docs/PROGRESS.md", "docs/save-layout/coverage-map.md"]) {
    fs.readFileSync(path.join(ROOT, f), "utf8").split(/\r?\n/).forEach((l, i) => {
      if (!/×\s*0\.85|x\s*0\.85/.test(l)) return;
      checked++;
      if (/227,386\s*\+/.test(l)) bad(`${f}:${i + 1} uses 227,386 (the 0x3783A end offset) as the member length in the structural formula`);
      if (!/226,754/.test(l)) bad(`${f}:${i + 1} structural formula does not use the member length 226,754`);
    });
  }
  if (!checked) bad("no save-side structural formula found to check");
  else if (failures === before) ok(`save-side structural formula uses the member length, not the end offset (${checked} site(s))`);
} catch (e) {
  bad(`save-side formula check failed: ${String(e.message).slice(0, 120)}`);
}

// 12. data side: the database is the authority for the mechanics documents and had no gate. `pragma foreign_key_check`
// reports 2,621 violations and all of them are known and explained -- two foreign keys name a parent table that does not
// exist (`skill_tree` for `skill_trees`, `meow_location` for `meow_locations`) and one uses 0 as a "none" sentinel. The
// point of the gate is not to demand zero; it is to pin the known set, so a genuinely new dangling reference fails here
// instead of being waved through under cover of the 2,621. MHGU_DB overrides the path, which is how the must-fail sample
// runs against a doctored copy.
try {
  const dbPath = process.env.MHGU_DB || path.join(ROOT, "docs/data/mhgu.db");
  if (!fs.existsSync(dbPath)) {
    console.log(`note database ${path.relative(ROOT, dbPath)} is not present (it is an untracked 18 MB artefact); foreign-key gate skipped`);
  } else {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const KNOWN = { quests: 1127, meow_rewards: 1168, skills: 326 };
    const got = {};
    let total = 0;
    for (const r of db.prepare("pragma foreign_key_check").all()) { got[r.table] = (got[r.table] || 0) + 1; total++; }
    // the three known groups must still be exactly the three known groups
    const unknown = Object.keys(got).filter((t) => !(t in KNOWN));
    const changed = Object.keys(KNOWN).filter((t) => (got[t] || 0) !== KNOWN[t]);
    if (unknown.length) bad(`database foreign keys: new dangling table(s) ${unknown.join(", ")} (${unknown.map((t) => got[t]).join("/")})`);
    else if (changed.length) bad(`database foreign keys: known table(s) changed count ${changed.map((t) => `${t} ${got[t] || 0} != ${KNOWN[t]}`).join(", ")}`);
    else {
      // and filtering the two misnamed parents and the sentinel must still leave zero real orphans
      const real = db.prepare(`select
        (select count(*) from skills where skill_tree_id>0 and skill_tree_id not in (select _id from skill_trees)) +
        (select count(*) from meow_rewards where meow_location_id>0 and meow_location_id not in (select _id from meow_locations)) +
        (select count(*) from quests where permit_monster_id>0 and permit_monster_id not in (select _id from monsters)) as n`).get().n;
      if (real !== 0) bad(`database foreign keys: ${real} real orphan(s) after correcting the two misnamed parents and the 0 sentinel`);
      else ok(`database foreign keys: ${total} known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans`);
    }
  }
} catch (e) {
  bad(`database foreign-key check failed: ${String(e.message).slice(0, 120)}`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nALL PASS");
process.exit(failures ? 1 : 0);
