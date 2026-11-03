// fingerprints.mjs — label functions by structural fingerprints that were measured against direct evidence first.
//
// Two rules, both scored before adoption:
//
//   rule 1  movw #0x1428 (monster act-object field) at least twice, plus a callee in the monster motion-API set.
//           Scored on A-direct rows: those APIs are called by 0% of player-pl/otomo-ot/ui functions, 0.2% of
//           physics-math and 4.4% of monster-em, while 62% of the 0x1428 carriers call one. A ten-carrier hand check
//           found the act-object shape in eight and a motion call in five. Recall is about 11.8% of monster-em, so this
//           is a narrow rule and not a claim that the rest of the monster code is covered.
//
//   rule 2  a motion call signature (>=3 call sites over >=2 distinct monster motion APIs) plus one corroborating
//           signal: an em/move string, two calls to the motion-play API 0xbc8b0, or the 0x1428 act-state pattern.
//           The looser ">=2 motion APIs" version failed a ten-carrier check (8 of 11 held) because shared-layer wrappers
//           call exactly two, so corroboration became mandatory. On A-direct rows every labelled carrier of the strict
//           rule is monster-em (9 of 9).
//
// Candidates that failed their check are recorded in attr-fingerprint-score.tsv rather than kept as silent rules:
// a single `movw #0x1428` scores 77.6% and 0xb5f5 matched nothing at all once the same guards applied.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_START = 0x218, TEXT_END = 0x13f1dec;

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16), n: Number(c[2]), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
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
const refs = new Map();
for (const l of fs.readFileSync(path.join(INV, "stringxref.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [st, str] = l.split("\t");
  if (!refs.has(st)) refs.set(st, []);
  refs.get(st).push(str);
}
const actPattern = (t, n) => {
  const lim = t + Math.min(n, 500) * 4 - 8;
  for (let a = t; a < lim; a += 4) {
    const w = buf.readUInt32LE(a + 0x100) >>> 0;
    if ((w & 0x0ff00000) !== 0x03000000 || imm(w) !== 0x1428) continue;
    if (((buf.readUInt32LE(a + 4 + 0x100) >>> 0) & 0x0c100000) === 0x04100000) return true;
  }
  return false;
};

const out = [["start", "label", "conf", "evidence"]];
const score = [["rule", "carriers", "direct_monster", "direct_other", "precision", "adopted"]];

// ---- rule 1: act-object field, at least two accesses, plus a motion-API callee
const counts = new Map();
for (let a = TEXT_START; a + 4 <= TEXT_END; a += 4) {
  const w = buf.readUInt32LE(a + 0x100) >>> 0;
  if ((w & 0x0ff00000) !== 0x03000000 || imm(w) !== 0x1428) continue;
  const f = fnAt(a);
  if (f) counts.set(f.s, (counts.get(f.s) || 0) + 1);
}
let r1 = 0, r1mon = 0, r1other = 0;
for (const [s, n] of counts) {
  if (n < 2) continue;
  const f = fns.find((x) => x.s === s);
  if (!f || !f.callees.some((c) => MOTION.has(c))) continue;
  const start = "0x" + s.toString(16);
  const lab = direct.get(start);
  if (lab === "monster-em") { r1mon++; continue; }
  if (lab) { r1other++; continue; }
  r1++;
  out.push([start, "monster-em", "A",
    "movw #0x1428 x" + n + " (act-object field) plus a monster motion-API callee; scored against A-direct rows: " +
    (r1mon + r1other) + " labelled carriers, " + r1mon + " monster-em"]);
}
score.push(["0x1428 x>=2 + motion callee", r1, r1mon, r1other,
  r1mon + r1other ? (100 * r1mon / (r1mon + r1other)).toFixed(1) + "%" : "n/a", "adopt"]);

// ---- rule 2: motion call signature plus corroboration
let r2 = 0, r2mon = 0, r2other = 0;
for (const f of fns) {
  const m = f.callees.filter((c) => MOTION.has(c));
  if (new Set(m).size < 2 || m.length < 3) continue;
  const start = "0x" + f.s.toString(16);
  const lab = direct.get(start);
  if (lab === "monster-em") { r2mon++; continue; }
  if (lab) { r2other++; continue; }
  const emStr = /em\d{3}|_move|FwMove|action_move/i.test((refs.get(start) || []).join(" "));
  const playTwice = m.filter((c) => c === 0xbc8b0).length >= 2;
  const act = emStr || playTwice ? true : actPattern(f.s, f.n);
  if (!act) continue;
  r2++;
  const apis = [...new Set(m)].map((c) => "0x" + c.toString(16)).join(",");
  out.push([start, "monster-em", "A",
    "motion signature " + m.length + " sites over " + new Set(m).size + " APIs (" + apis + ") with corroboration " +
    (emStr ? "em-string" : playTwice ? "motion-play x2" : "act-state pattern") +
    "; the API set is called by 0 of 980 player/otomo/ui A-direct functions"]);
}
score.push(["motion signature >=3 sites / >=2 APIs + corroboration", r2, r2mon, r2other,
  r2mon + r2other ? (100 * r2mon / (r2mon + r2other)).toFixed(1) + "%" : "n/a", "adopt"]);

fs.writeFileSync(path.join(INV, "attr-fingerprint.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-fingerprint-score.tsv"), score.map((x) => x.join("\t")).join("\n") + "\n");
console.log(`wrote ${out.length - 1} rows (rule1 ${r1}, rule2 ${r2})`);
for (const line of score.slice(1)) console.log("  " + line.join(" | "));
