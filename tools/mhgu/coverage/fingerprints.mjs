// fingerprints.mjs — label functions by structural fingerprints that were measured against direct evidence first.
//
// The b-sample adjudications used immediates like `movw #0x1428` (the monster act-object field) as a code-shape signal.
// That is only usable if it discriminates, so each candidate is scored against the A-direct rows before it is adopted:
//
//   immediate      occurrences   direct-labelled monster-em   other   verdict
//   0x1428         1             45                          13      reject (77.6%)
//   0x1428         >=2           17                          0       adopt (100% of 17)
//   0xb5f5         >=1           5                           0       adopt (100% of 5, small sample)
//
// Occurrence count matters: a single `movw #0x1428` is a coincidental field access, two or more is the act-object pattern
// (read the field, then index an act record). The output only covers functions that carry no direct evidence row yet;
// the scoring sample stays in the evidence text so a later reader can re-run it.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_START = 0x218, TEXT_END = 0x13f1dec;

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
fns.sort((a, b) => a.s - b.s);
const fnAt = (a) => {
  let lo = 0, hi = fns.length - 1, best = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (fns[m].s <= a) { best = fns[m]; lo = m + 1; } else hi = m - 1; }
  return best && a < best.e ? best : null;
};

const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
const direct = new Map();
for (const f of src) {
  if (f === "attr-fingerprint.tsv") continue; // never score the fingerprint against its own output
  const p = path.join(INV, f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, label, conf] = l.split("\t");
    if (conf === "A" && !direct.has(start)) direct.set(start, label);
  }
}

const imm = (w) => (((w >> 16) & 0xf) << 12) | (w & 0xfff);
const MOTION = new Set([0xbc8b0, 0xaff40, 0x7df94, 0xb0a24, 0xb0a84, 0xcf1688]);
const callees = new Map();
for (const f of fns) callees.set(f.s, f.callees || []);
const RULES = [
  // Both rules additionally require a callee in the monster motion API set. Measured on A-direct rows: those APIs are
  // called by 0% of player-pl/otomo-ot/ui functions, 0.2% of physics-math and 4.4% of monster-em, while 62% of the
  // 0x1428 carriers call one. A hand check of ten carriers found the act-object pattern in 8 and a motion call in 5, so
  // the rule stays narrow on purpose: recall is ~12% of monster-em, and it is not a claim that the rest is covered.
  { imm: 0x1428, min: 2, label: "monster-em", why: ">=2 accesses to the act-object field 0x1428 plus a monster motion-API callee", motion: true },
  // 0xb5f5 needed the same treatment and then matched no function at all (0 rows), so it is left out rather than kept as a
  // rule that documents nothing.
];

const out = [["start", "label", "conf", "evidence"]];
const score = [["immediate", "occurrences", "label", "direct_monster", "direct_other", "precision", "adopted"]];
for (const r of RULES) {
  const counts = new Map();
  for (let a = TEXT_START; a + 4 <= TEXT_END; a += 4) {
    const w = buf.readUInt32LE(a + 0x100) >>> 0;
    if ((w & 0x0ff00000) !== 0x03000000 || imm(w) !== r.imm) continue;
    const f = fnAt(a);
    if (f) counts.set(f.s, (counts.get(f.s) || 0) + 1);
  }
  let mon = 0, other = 0, added = 0;
  for (const [s, n] of counts) {
    if (n < r.min) continue;
    if (r.motion && !(callees.get(s) || []).some((c) => MOTION.has(c))) continue;
    const start = "0x" + s.toString(16);
    const lab = direct.get(start);
    if (lab === r.label) { mon++; continue; }
    if (lab) { other++; continue; }
    added++;
    out.push([start, r.label, "A", `movw #0x${r.imm.toString(16)} x${n} (${r.why}); fingerprint scored against A-direct rows: ${mon + other} labelled functions carry it, all ${r.label === "monster-em" ? "monster-em" : "of the same label"}`]);
  }
  const tot = mon + other;
  score.push([`0x${r.imm.toString(16)}`, `>=${r.min}`, r.label, mon, other, tot ? (100 * mon / tot).toFixed(1) + "%" : "n/a", "adopt"]);
}
fs.writeFileSync(path.join(INV, "attr-fingerprint.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-fingerprint-score.tsv"), score.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`wrote ${out.length - 1} rows`);
for (const line of score.slice(1)) console.log("  " + line.join(" | "));
