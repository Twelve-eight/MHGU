// report.mjs — the coverage meter for "how much of .text is explained".
//
// One meter, one denominator (23,885 functions / 5,228,277 instructions from docs/analysis/code/inventory/tiers.csv),
// so every new attribution source is measured the same way and cannot inflate the headline by claiming coverage
// twice. Sources are additive inputs, each a TSV of  start  label  conf(A|B)  evidence :
//
//   tiers.csv                 tier A/B/C + label (the original spine)
//   tierb-pass*/tierB*-slice  Tier B adjudications (parsed from the markdown tables)
//   --source <file>           extra attributions from new evidence (vtables, class registrars, library blocks)
//
// A function is counted once, at its best confidence: A beats B, B beats nothing. Output prints instructions and
// functions separately because a handful of 10k-instruction functions dominates the instruction percentage.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const CODE = path.join(ROOT, "docs/analysis/code");
const OUT = path.join(INV, "coverage-report.tsv");

const LABELS = new Set([
  "online-nex", "save-data", "save-io", "render-gfx", "audio", "ui", "monster-em", "player-pl", "weapon-pw",
  "weapon-wp", "otomo-ot", "quest", "item", "physics-math", "filesystem", "kernel-os", "debug-dev", "unknown",
]);

// ---- spine
const tiers = new Map(); // start -> {insns, tier, label}
// Preference: the seeded merge wins because it is the current best answer; the no-seed recompute is the reproducible
// baseline behind it; tiers.csv is the legacy spine and only a fallback.
const spine = ["tiers-merged.csv", "tiers-recomputed.csv", "tiers.csv"].find((f) => fs.existsSync(path.join(INV, f)));
console.log(`spine: ${spine}`);
const lines = fs.readFileSync(path.join(INV, spine), "utf8").split(/\r?\n/).filter(Boolean).slice(1);
for (const l of lines) {
  const [s, ins, t, lab] = l.split(",");
  tiers.set(s, { insns: Number(ins), tier: t, label: lab || "" });
}
const totalFn = tiers.size;
let totalIns = 0;
for (const v of tiers.values()) totalIns += v.insns;

// ---- tier B adjudications from the markdown slices
const adjud = new Map();
const rank = { A: 3, B: 2, C: 1 };
for (const dir of ["tierb-pass1", "tierb-pass2", "tierb-pass3"]) {
  const d = path.join(CODE, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /slice-.*\.md$/.test(x)).sort()) {
    for (const l of fs.readFileSync(path.join(d, f), "utf8").split(/\r?\n/)) {
      const m = /^\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z-]+)\s*\|\s*(\w+)\s*\|\s*([ABC])\s*\|/.exec(l);
      if (!m) continue;
      const [, start, label, , conf] = m;
      if (!LABELS.has(label) || label === "unknown") continue;
      const prev = adjud.get(start);
      if (!prev || rank[conf] > rank[prev.conf]) adjud.set(start, { conf, label, src: `${dir}/${f}` });
    }
  }
}

// ---- extra sources: start, label, conf, evidence
const extraArgs = process.argv.reduce((a, v, i) => (v === "--source" ? [...a, process.argv[i + 1]] : a), []);
const extra = new Map();
for (const f of extraArgs) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, label, conf, evidence] = l.split("\t");
    if (!tiers.has(start)) continue; // an attribution for a non-function start is a bug in the source
    if (!LABELS.has(label) || label === "unknown") continue;
    const prev = extra.get(start);
    if (!prev || rank[conf] > rank[prev.conf]) extra.set(start, { conf, label, src: path.basename(f), evidence: evidence || "" });
  }
}

// ---- demotions: rows that a recorded review refuted keep their label but stop counting as verified
// Demotions are part of the meter, not an optional flag: every docs/analysis/code/inventory/demote-*.tsv is loaded by
// default, and --demote only adds a file from elsewhere. A challenge that must be remembered at every invocation is a
// challenge that will be forgotten, and the report would quietly drift back up.
// pins.tsv is the same mechanism (recompute.mjs reads `^(demote-.*|pins)\.tsv$`), and until 2026-11-04 this file read only
// demote-*, so a pinned function would still have counted as verified here while recompute refused to seed it -- the same
// policy read two ways. The four pins happen to be tier C today, which is why the numbers did not differ; the asymmetry
// would have surfaced only once one of them gained a label.
const demoteArg = [
  ...fs.readdirSync(INV).filter((f) => /^(demote-.*|pins)\.tsv$/.test(f)).map((f) => path.join(INV, f)),
  ...process.argv.reduce((a, v, i) => (v === "--demote" ? [...a, process.argv[i + 1]] : a), []),
];
console.log(`demotions: ${demoteArg.length} file(s)`);
const demoted = new Set();
for (const f of demoteArg) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const start = parseInt(l.split("\t")[0], 16);
    if (Number.isFinite(start)) demoted.add(start);
  }
}

// ---- merge at best confidence
const best = new Map(); // start -> {conf, label, src}
for (const [start, t] of tiers) {
  if (t.label && t.label !== "unknown" && !demoted.has(parseInt(start, 16))) {
    // tier A = address prediction agreed with propagation; tier B = propagation only. Both are recorded so the
    // report can separate "verified" from "labelled but unverified" instead of hiding the second group.
    best.set(start, { conf: t.tier === "A" ? "A" : "B", label: t.label, src: "spine", fromSpine: true });
  }
}
for (const [start, a] of adjud) {
  const cur = best.get(start);
  if (!cur || rank[a.conf] > rank[cur.conf]) best.set(start, { conf: a.conf, label: a.label, src: a.src, fromSpine: false });
}
for (const [start, a] of extra) {
  const cur = best.get(start);
  if (!cur || rank[a.conf] > rank[cur.conf]) best.set(start, { conf: a.conf, label: a.label, src: a.src, evidence: a.evidence });
}

const sum = (pred) => {
  let fn = 0, ins = 0;
  for (const [start, b] of best) if (pred(b)) { fn++; ins += tiers.get(start).insns; }
  return { fn, ins };
};
const pct = (x, t) => (t ? ((100 * x) / t).toFixed(1) + "%" : "-");

// direct evidence: a row in an attr-*.tsv with conf A. This is separable from the prediction-agreement heuristic,
// which is what tier A has meant so far; conflating them is how a seed could fail to raise the headline.
// Every evidence table in the inventory is a source by default. The old behaviour took --direct flags only, so the audit
// gate (which runs the meter without arguments) rewrote coverage-report.tsv with A-direct = 0, and the committed artefact
// then contradicted METER. Sources are discovered, not supplied.
// The list is explicit rather than globbed on purpose: the inventory also holds superseded tables (attr-vtable-retile has
// 8,360 rows labelled unknown, attr-vtable.tsv is the first 1,375-row pass that relabel-vtable refuted) and globbing them
// back in would restore labels that were deliberately demoted. Adding a channel means adding it here.
const SOURCES = fs.existsSync(path.join(INV, "sources.json"))
  ? JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))
  : [];
// A source listed in sources.json but missing on disk is a broken meter, not a smaller one: fail loudly instead of
// silently reporting a lower A-direct (the failure mode that once published A-direct = 0).
const missingSources = SOURCES.filter((f) => !fs.existsSync(path.join(INV, f)));
if (missingSources.length) {
  console.error("sources.json lists " + missingSources.length + " file(s) that do not exist: " + missingSources.join(", "));
  process.exit(2);
}
const directArgs = [
  ...SOURCES.map((f) => path.join(INV, f)),
  ...process.argv.reduce((a, v, i) => (v === "--direct" ? [...a, process.argv[i + 1]] : a), []),
];
console.log(`direct sources: ${directArgs.length}`);
const direct = new Set();
for (const f of directArgs) {
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [rawStart, label, conf] = l.split("\t");
    // normalise: one channel used to write bare hex while the spine keys are 0x-prefixed, and those rows then never
    // matched the function table (1,673 rows were invisible to A-direct before this)
    const start = "0x" + parseInt(rawStart, 16).toString(16);
    if (conf === "A" && label && label !== "unknown") direct.add(start);
  }
}
const A = sum((b) => b.conf === "A");
const D = (() => { let fn = 0, ins = 0; for (const start of direct) { const t = tiers.get(start); if (t) { fn++; ins += t.insns; } } return { fn, ins }; })();
const B = sum((b) => b.conf === "B");
const rows = [["class", "functions", "insns", "pct_insns", "pct_functions"]];
rows.push(["A-direct (evidence row)", String(D.fn), String(D.ins), pct(D.ins, totalIns), pct(D.fn, totalFn)]);
rows.push(["tier A (verified)", String(A.fn), String(A.ins), pct(A.ins, totalIns), pct(A.fn, totalFn)]);
rows.push(["conf B (unverified)", String(B.fn), String(B.ins), pct(B.ins, totalIns), pct(B.fn, totalFn)]);
// Inferred labels are a separate class on purpose: a callee vote is inference, and mixing it into A-direct would repeat
// the mistake that got tier A inflated. The rule that produces them was validated leave-one-file-out at 96.0%.
//
// The class membership used to be decided by filename (a /^attr-.*vote\d*\.tsv$/ glob here, a hardcoded immscan path
// below), so a new inference or signature table added to sources.json would silently fall outside every class and the
// published partition would quietly lose it. The classes are named explicitly now, checked against the conf column, and a
// file that carries V or S rows without being classified is reported loudly instead of disappearing.
const VOTE_FILES = ["attr-callvote.tsv", "attr-callvote1.tsv", "attr-callervote.tsv", "attr-classvote.tsv"];
const SIG_FILES = ["attr-immscan.tsv"];
{
  const confOf = (f) => {
    const p = path.join(INV, f);
    if (!fs.existsSync(p)) return new Set();
    const s = new Set();
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) s.add(l.split("\t")[2]);
    return s;
  };
  const unclassified = SOURCES.filter((f) => {
    const c = confOf(f);
    const hasV = c.has("V"), hasS = c.has("S");
    if (hasV && !VOTE_FILES.includes(f)) return true;
    if (hasS && !SIG_FILES.includes(f)) return true;
    return false;
  });
  if (unclassified.length) {
    console.log(`WARNING unclassified conf-V/S source(s): ${unclassified.join(", ")}`);
    console.log(`        their rows belong to no per-class row; add them to VOTE_FILES or SIG_FILES, or state in METER that`);
    console.log(`        they are recorded but never counted as a class`);
  }
  for (const f of [...VOTE_FILES, ...SIG_FILES]) {
    if (!SOURCES.includes(f)) console.log(`WARNING ${f} is classified but not listed in sources.json`);
  }
}
let _voteStarts = null;
const voteStarts = () => {
  if (_voteStarts) return _voteStarts;
  _voteStarts = new Set();
  for (const f of VOTE_FILES) {
    const p = path.join(INV, f);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, label, conf] = l.split("\t");
      if (conf === "V" && label) _voteStarts.add(start);
    }
  }
  return _voteStarts;
};
const CV = (() => {
  const files = VOTE_FILES.filter((f) => fs.existsSync(path.join(INV, f)));
  let fn = 0, ins = 0, rows = 0;
  const seen = new Set();
  for (const f of files) {
    for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, label, conf] = l.split("\t");
      if (conf !== "V" || !label) continue;
      rows++;
      if (direct.has(start) || seen.has(start)) continue;
      seen.add(start);
      const t = tiers.get(start);
      if (t) { fn++; ins += t.insns; }
    }
  }
  return { fn, ins, rows };
})();
rows.push(["A-inferred (callee/caller/class vote channels, per-round 92.8-99.3%)", String(CV.fn), String(CV.ins), pct(CV.ins, totalIns), pct(CV.fn, totalFn)]);
// Single-immediate signatures are their own class: the rule is weaker than a call vote (97.2% fold-wise versus 93.6-99.3%)
// and was selected on the same labels it predicts, so it stays separable and withdrawable.
const SG = (() => {
  const files = SIG_FILES.filter((f) => fs.existsSync(path.join(INV, f)));
  let fn = 0, ins = 0, rows = 0;
  const seen = new Set();
  for (const f of files) {
    for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, label, conf] = l.split("\t");
      if (conf !== "S" || !label) continue;
      rows++;
      if (direct.has(start) || voteStarts().has(start) || seen.has(start)) continue;
      seen.add(start);
      const t = tiers.get(start);
      if (t) { fn++; ins += t.insns; }
    }
  }
  return { fn, ins, rows };
})();
rows.push(["A-signature (32-bit constant, fold 97.1%)", String(SG.fn), String(SG.ins), pct(SG.ins, totalIns), pct(SG.fn, totalFn)]);
rows.push(["headline A only", String(A.fn), String(A.ins), pct(A.ins, totalIns), pct(A.fn, totalFn)]);
// The four classes below are a partition: each function counts once. "unattributed" used to be total - A - B, which left
// the inferred rows inside it while also printing them on their own line.
// The signature channel is read from sources.json like every other channel: it used to be a hardcoded path, which meant
// the schema gate never saw its 3,067 rows and the function-level table could not say "signature" anywhere.
const Sset = (() => {
  const s = new Set();
  for (const f of JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))) {
    const p = path.join(INV, f);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, label, conf] = l.split("\t");
      if (conf === "S" && label) s.add(start);
    }
  }
  return s;
})();
// Inferred rows come from the same adopted-source list as everything else. It used to be a filename pattern, which meant
// a channel that did not happen to be called "*vote.tsv" produced rows nothing counted (attr-tableseeds did exactly that).
const Vset = (() => {
  const s = new Set();
  for (const f of JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))) {
    for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const [start, label, conf] = l.split("\t");
      if (conf === "V" && label) s.add(start);
    }
  }
  return s;
})();
const dumpNone = (() => { const i = process.argv.indexOf("--dump-none"); return i >= 0 ? process.argv[i + 1] : null; })();
const noneStarts = [];
let pDir = 0, pDirIns = 0, pInf = 0, pInfIns = 0, pSig = 0, pSigIns = 0, pSpV = 0, pSpVIns = 0, pSpVote = 0, pSpVoteIns = 0, pSpU = 0, pSpUIns = 0, pNone = 0, pNoneIns = 0;
// Re-measured on the current tiers by spread-precision.mjs (five shifted 1 MB grids, evidence from outside the window only).
// Individual CP95: online-nex 91.5, monster-em 91.6, render-gfx 89.0, weapon-wp 80.3. render-gfx and weapon-wp miss on their
// own but the pool of the four is 7,464/8,146 = 91.6% (CP95 91.1), so the four stay together as one validated class and no
// further label is admitted: quest 70.3, physics-math 72.3, ui 80.7, otomo-ot 51.4, player-pl 61.0, item 45.8, save-data 60.1.
// Independently measured (spread-precision-independent.mjs: truth is A-direct evidence, which propagation never produces):
// online-nex 99.8% (CP95 99.3) and weapon-wp 98.4% (96.5) hold; render-gfx falls to 83.6% (81.7) and monster-em to 22.6%
// (15.9). The old 90.1/92.8 numbers came from scoring the propagation against its own output, so only the first two stay.
const VALID_SPREAD = new Set(["online-nex", "weapon-wp"]);
// Second, vote-count-based rule for labels whose overall precision is too low but whose high-vote rows are not: ui is 73%
// at one agreeing neighbour, 86% at two and 94.1% at three (CP95 92.9); kernel-os is 38% at one, 97.2% at two (90.3);
// audio 3+ is 100% (90.6); weapon-wp 3+ is 96.9% (92.4). Measured by spread-precision.mjs with the same held-out windows.
// Production votes use every anchor, the calibration removed the window's own: a production count of k corresponds to the
// measured k-1 cell, so every threshold is shifted up by one. ui therefore needs 4 (measured cell 3+ = 94.1%, CP95 92.9),
// kernel-os 3 (2 = 97.2/90.3), audio 4 (3+ = 100/90.6), weapon-wp 4 (3+ = 96.9/92.4).
// Disabled: those cells were measured against propagation-produced labels, which is the same self-consistency problem the
// spread class had. They stay listed so the shape is not lost, and the partition counts zero until an independent
// measurement replaces them.
const VOTE_THRESHOLD = {};
const VOTE_THRESHOLD_UNCALIBRATED = { ui: 4, "kernel-os": 3, audio: 4, "weapon-wp": 4 };
const spreadVotes = new Map();
if (fs.existsSync(path.join(INV, "spread-votes.tsv"))) {
  for (const l of fs.readFileSync(path.join(INV, "spread-votes.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s0, votes, lab, agrees] = l.split("\t");
    spreadVotes.set(s0.toLowerCase(), { votes: Number(votes), lab, agrees: agrees === "yes" });
  }
}
for (const [start, t] of tiers) {
  const ins = t.insns;
  const b = best.get(start);
  if (direct.has(start)) { pDir++; pDirIns += ins; }
  else if (Vset.has(start)) { pInf++; pInfIns += ins; }
  else if (Sset.has(start)) { pSig++; pSigIns += ins; }
  // A function can hold a spread label at tier A (two-vote agreement plus address prediction) or at tier B; both are
  // propagation, so they get their own buckets. "No label" means exactly that: no label of any kind.
  // Spread labels are only trusted per label, because their cross-region precision is wildly uneven: online-nex 147/147,
  // weapon-wp 36/37, render-gfx 139/146 clear 90%, while ui 174/210, kernel-os 0/24, otomo-ot 14/19, physics-math 11/15
  // and quest 9/12 do not (256 KB folds). Only the three validated labels count toward the >=90% line.
  else if (b && b.label && VALID_SPREAD.has(b.label) && b.fromSpine !== false) { pSpV++; pSpVIns += ins; }
  else if (b && b.label && VOTE_THRESHOLD[b.label]) {
    const v = spreadVotes.get(start);
    if (v && v.agrees && v.votes >= VOTE_THRESHOLD[b.label]) { pSpVote++; pSpVoteIns += ins; }
    else { pSpU++; pSpUIns += ins; }
  }
  else if (b && b.label) { pSpU++; pSpUIns += ins; }
  else { pNone++; pNoneIns += ins; if (dumpNone) noneStarts.push(start); }
}
rows.push(["partition: direct evidence", String(pDir), String(pDirIns), pct(pDirIns, totalIns), pct(pDir, totalFn)]);
rows.push(["partition: inferred only", String(pInf), String(pInfIns), pct(pInfIns, totalIns), pct(pInf, totalFn)]);
rows.push(["partition: signature only", String(pSig), String(pSigIns), pct(pSigIns, totalIns), pct(pSig, totalFn)]);
rows.push(["partition: spread validated labels", String(pSpV), String(pSpVIns), pct(pSpVIns, totalIns), pct(pSpV, totalFn)]);
rows.push(["partition: spread validated by vote count", String(pSpVote), String(pSpVoteIns), pct(pSpVoteIns, totalIns), pct(pSpVote, totalFn)]);
rows.push(["partition: spread unvalidated", String(pSpU), String(pSpUIns), pct(pSpUIns, totalIns), pct(pSpU, totalFn)]);
if (dumpNone) { fs.writeFileSync(dumpNone, ["start", ...noneStarts].join("\n") + "\n"); console.log(`--dump-none: ${noneStarts.length} unlabelled starts -> ${dumpNone}`); }
rows.push(["partition: no label", String(pNone), String(pNoneIns), pct(pNoneIns, totalIns), pct(pNone, totalFn)]);
// Everything except the no-label bucket carries some label whose precision has been measured: direct evidence and the two
// validated inference classes are above 93%, and the spread labels score 91.7% (1,198/1,307) when checked against the
// functions that also carry their own evidence. Quoting this line always means "covered at >=90% measured precision".
// Strict line: classes whose precision clears 90% at the 95% lower bound. Measured with 1 MB held-out windows over five
// shifted grids (same window size, more samples, no looser ruler): online-nex 322/322 = 100% (CP95 99.1), weapon-wp
// 106/108 = 98.1% (94.3), render-gfx 384/416 = 92.3% (89.8), pooled 812/846 = 96.0% (CP95 94.7). render-gfx misses alone
// but the pooled estimate for the three validated labels clears the bar, so those labels count.
// One curve, two rungs, each with the number that was actually measured for it. The >=90 rung includes every class whose own
// measurement clears 90 (evidence, traceable inference, signature, the four pooled spread labels, and the vote-count rows).
// The >=85 rung adds the rest of the spread bucket; it is a POOLED 86.0% (CP95 85.5) and its weakest label is item at 58.6%,
// so it must never be quoted as "every label is at least 85%".
// A single expected-explained fraction, which uses every class at the precision it was measured with instead of deciding
// in or out at a threshold. Evidence rows were re-verified against the image (100% of 8,089), inference folds at 99.3%
// (class), 96.4% (caller) and 94.9% (callee), signature at 97.1%, the validated spread labels at 99.8/98.4, and the rest of
// the spread class at 72.4% (CP95 71.3). The no-label bucket contributes nothing.
// Direct evidence is not assumed perfect: the three rule families agree on 94.0-97.9% of the functions where they overlap
// (string vs class-name 840/894, class-name vs structural 937/958), so 0.97 is the defensible value rather than 1.0.
const precisions = { dir: 0.97, inf: 0.95, sig: 0.971, spv: 0.99, none: 0 };
// The spread class is NOT weighted by one pooled figure: its per-label accuracies range from 99.8% (online-nex) to 5.5%
// (otomo-ot), and the big labels sit at the bottom (monster-em 22.6%, quest 14.0%). spread-accuracy.tsv is written by
// spread-precision-independent.mjs. A label missing from the table falls back to the pooled 0.724.
const spreadAcc = new Map();
{
  const p2 = path.join(INV, "spread-accuracy.tsv");
  if (fs.existsSync(p2)) for (const l of fs.readFileSync(p2, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [lab, acc] = l.split("\t");
    if (lab && acc) spreadAcc.set(lab, Number(acc));
  }
}
let spreadWeighted = 0;
for (const [start, t] of tiers) {
  const b = best.get(start);
  if (!b || !b.label || direct.has(start) || Vset.has(start) || Sset.has(start)) continue;
  if (VALID_SPREAD.has(b.label)) continue; // counted at 0.99 above
  spreadWeighted += t.insns * (spreadAcc.get(b.label) ?? 0.724);
}
// Optimistic counterpart: the same weighting with per-label accuracies from the random holdout, which keeps neighbours in
// place and therefore overstates. The pair brackets the truth; the conservative end is the one quoted.
const spreadAccOpt = new Map();
{
  const p3 = path.join(INV, "spread-accuracy-random.tsv");
  if (fs.existsSync(p3)) for (const l of fs.readFileSync(p3, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [lab, acc] = l.split("\t");
    if (lab && acc) spreadAccOpt.set(lab, Number(acc));
  }
}
let spreadWeightedOpt = 0;
for (const [start, t] of tiers) {
  const b = best.get(start);
  if (!b || !b.label || direct.has(start) || Vset.has(start) || Sset.has(start)) continue;
  if (VALID_SPREAD.has(b.label)) continue;
  spreadWeightedOpt += t.insns * (spreadAccOpt.get(b.label) ?? 0.884);
}
const explainedOpt = pDirIns * precisions.dir + pInfIns * precisions.inf + pSigIns * precisions.sig + pSpVIns * precisions.spv + pSpVoteIns * precisions.spv + spreadWeightedOpt;
const explained = pDirIns * precisions.dir + pInfIns * precisions.inf + pSigIns * precisions.sig + pSpVIns * precisions.spv + pSpVoteIns * precisions.spv + spreadWeighted;
// Instructions only: a function-level version would need a per-function weight, and inventing one (e.g. 0.85 x labelled)
// would be a made-up number in the one row that exists to avoid made-up numbers.
rows.push(["expected explained fraction (precision-weighted, instructions only)", "—", String(Math.round(explained)),
  pct(explained, totalIns), "—"]);
rows.push(["expected explained fraction (optimistic, random-holdout weights)", "—", String(Math.round(explainedOpt)),
  pct(explainedOpt, totalIns), "—"]);
rows.push(["covered at >=90% precision", String(pDir + pInf + pSig + pSpV + pSpVote), String(pDirIns + pInfIns + pSigIns + pSpVIns + pSpVoteIns),
  pct(pDirIns + pInfIns + pSigIns + pSpVIns + pSpVoteIns, totalIns), pct(pDir + pInf + pSig + pSpV + pSpVote, totalFn)]);
// Named for what it is: a POOLED 72.4% over a bucket whose labels range from 5.5% (otomo-ot) to 99.8% (online-nex). Calling
// it ">=72% precision" would repeat the pooling mistake one row above it.
rows.push(["covered, spread pooled at 72.4% (per-label range 5.5-99.8%)", String(pDir + pInf + pSig + pSpV + pSpVote + pSpU), String(pDirIns + pInfIns + pSigIns + pSpVIns + pSpVoteIns + pSpUIns),
  pct(pDirIns + pInfIns + pSigIns + pSpVIns + pSpVoteIns + pSpUIns, totalIns), pct(pDir + pInf + pSig + pSpV + pSpVote + pSpU, totalFn)]);
rows.push(["spread labels (independent 72.4% overall, CP95 71.3)", String(pSpU), String(pSpUIns),
  pct(pSpUIns, totalIns), pct(pSpU, totalFn)]);
// Guard: the five buckets must account for every function and every instruction. Two earlier bugs (spread-A falling into
// "no label", and the inferred class double-counted) would both have been caught here.
const pFn = pDir + pInf + pSig + pSpV + pSpVote + pSpU + pNone;
const pIns = pDirIns + pInfIns + pSigIns + pSpVIns + pSpVoteIns + pSpUIns + pNoneIns;
if (pFn !== totalFn || pIns !== totalIns) {
  console.error(`partition does not close: ${pFn}/${totalFn} functions, ${pIns}/${totalIns} instructions`);
  process.exit(3);
}

const byLabel = new Map();
for (const [start, b] of best) {
  if (b.conf !== "A") continue;
  const k = b.label;
  const v = byLabel.get(k) || { fn: 0, ins: 0 };
  v.fn++; v.ins += tiers.get(start).insns;
  byLabel.set(k, v);
}
const bySrc = new Map();
for (const [, b] of best) {
  if (b.conf !== "A") continue;
  const v = bySrc.get(b.src) || { fn: 0, ins: 0 };
  v.fn++; v.ins += tiers.get(b.src) ? 0 : 0;
  bySrc.set(b.src, v);
}

// The denominator goes into the file so that check-artifacts.mjs can verify the partition against it instead of trusting
// the partition to be complete on its own.
fs.writeFileSync(OUT, `denominator:\t${totalFn} functions,\t${totalIns} instructions\t\t\n` + rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`denominator: ${totalFn} functions, ${totalIns} instructions`);
console.log(rows.map((r) => r.join("\t")).join("\n"));
console.log("\ntier A by label (instructions desc):");
for (const [k, v] of [...byLabel].sort((a, b) => b[1].ins - a[1].ins)) {
  console.log(`  ${k.padEnd(14)} ${String(v.fn).padStart(6)} fn  ${(v.ins / 1e6).toFixed(2).padStart(6)} M  ${pct(v.ins, totalIns).padStart(6)}`);
}
if (extraArgs.length) {
  console.log("\ncontribution of the extra sources (A only):");
  for (const f of extraArgs) {
    const name = path.basename(f);
    const c = sum((b) => b.conf === "A" && b.src === name);
    console.log(`  ${name.padEnd(28)} ${String(c.fn).padStart(6)} fn  ${pct(c.ins, totalIns)}`);
  }
}
console.log(`\nwrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
