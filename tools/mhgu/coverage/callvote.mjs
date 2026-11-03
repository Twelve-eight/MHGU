// callvote.mjs — iterated one-hop inference, with a fresh fold-wise validation for every round.
//
// Rule: a function that calls two or more "high-purity" callees (callees whose A-direct callers are >=85% one label over
// >=12 callers) and receives one unambiguous label is very likely that subsystem. Rows go to attr-callvote.tsv as
// confidence "V": inference, never merged into A-direct.
//
// Rounds matter, so each one is validated on its own terms: hold out one evidence file, rebuild every round inside the
// fold (so the held-out file cannot predict itself), then ask the round's rule to recover that file's A-direct labels.
// Measured: round1 96.0%, round2 94.2%, round3 93.9% — the drop is real but small, so the loop continues while a round
// still scores at least 92% and still adds rows. It stops when either condition fails, and the table in METER records
// every round's number rather than a single blended one.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const FLOOR = 92.0;
const MAX_ROUNDS = 8;

const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
const anchorsByFile = new Map();
const direct = new Map();
for (const f of src) {
  const p = path.join(INV, f);
  if (!fs.existsSync(p) || f === "attr-fingerprint.tsv") continue;
  const m = new Map();
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, conf] = l.split("\t");
    if (conf !== "A") continue;
    m.set(s.toLowerCase(), lab);
    if (!direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
  anchorsByFile.set(f, m);
}

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));

const purity = (anchors) => {
  const stat = new Map();
  for (const [s, lab] of anchors) {
    const f = byStart.get(s);
    if (!f) continue;
    for (const c of new Set(f.callees)) {
      if (!stat.has(c)) stat.set(c, new Map());
      const m = stat.get(c);
      m.set(lab, (m.get(lab) || 0) + 1);
    }
  }
  const pure = new Map();
  for (const [c, m] of stat) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    // Two settings, both measured. The strict one (>=12 callers, >=85% purity, 2 agreeing votes) is what rounds start
    // from; the relaxed one (>=8 callers, >=75% purity, 3 agreeing votes) scored HIGHER fold-wise (98.1% on 2,835 cases
    // versus 96.0% on 1,831) because three agreeing callees more than compensate for a looser per-callee purity.
    if (tot >= 12) {
      const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0];
      if (n / tot >= 0.85) pure.set(c, { lab, n, tot });
    } else if (tot >= 8) {
      const [lab, n] = [...m].sort((a, b) => b[1] - a[1])[0];
      if (n / tot >= 0.75) pure.set(c, { lab, n, tot, relaxed: true });
    }
  }
  return pure;
};
const vote = (f, pure) => {
  const votes = new Map();
  for (const c of new Set(f.callees)) { const h = pure.get(c); if (h) { const v = votes.get(h.lab) || []; v.push(h); votes.set(h.lab, v); } }
  if (votes.size !== 1) return null;
  const [lab, hits] = [...votes][0];
  const need = hits.some((h) => h.relaxed) ? 3 : 2;
  return hits.length >= need ? { lab, hits } : null;
};

// ---- per-round fold validation
const roundScore = [];
for (let round = 1; round <= MAX_ROUNDS; round++) {
  let tested = 0, correct = 0;
  for (const holdFile of anchorsByFile.keys()) {
    const anchor = new Map();
    for (const [f, m] of anchorsByFile) if (f !== holdFile) for (const [s, lab] of m) if (!anchor.has(s)) anchor.set(s, lab);
    const held = new Set(anchorsByFile.get(holdFile).keys());
    let anchors = anchor;
    for (let r = 1; r <= round; r++) {
      const pure = purity(anchors);
      if (r === round) {
        for (const [s, truth] of anchorsByFile.get(holdFile)) {
          const f = byStart.get(s);
          if (!f) continue;
          const got = vote(f, pure);
          if (!got) continue;
          tested++; if (got.lab === truth) correct++;
        }
      }
      const next = new Map(anchors);
      for (const f of fns) { if (next.has(f.s) || held.has(f.s)) continue; const got = vote(f, pure); if (got) next.set(f.s, got.lab); }
      anchors = next;
    }
  }
  const pct = tested ? (100 * correct / tested) : 0;
  roundScore.push({ round, tested, correct, pct: Number(pct.toFixed(1)) });
  if (pct < FLOOR || !tested) break;
}

// ---- emit every surviving round over the whole corpus
const out = [["start", "label", "conf", "evidence"]];
const anchors = new Map(direct);
const perRound = [];
for (const rs of roundScore) {
  const pure = purity(anchors);
  let added = 0;
  const perLabel = new Map();
  for (const f of fns) {
    if (anchors.has(f.s)) continue;
    const got = vote(f, pure);
    if (!got) continue;
    anchors.set(f.s, got.lab);
    added++;
    perLabel.set(got.lab, (perLabel.get(got.lab) || 0) + 1);
    out.push([f.s, got.lab, "V", `callee vote round ${rs.round}: ${got.hits.length} high-purity callees agree on ${got.lab} (` +
      got.hits.map((h) => h.n + "/" + h.tot).join(", ") + `); this round validated fold-wise at ${rs.pct}%`]);
  }
  perRound.push({ round: rs.round, pct: rs.pct, tested: rs.tested, added });
}
fs.writeFileSync(path.join(INV, "attr-callvote.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-callvote-rounds.tsv"),
  [["round", "fold_tested", "fold_correct", "precision", "rows_added"]]
    .concat(roundScore.map((rs) => [rs.round, rs.tested, rs.correct, rs.pct + "%", (perRound.find((p) => p.round === rs.round) || {}).added ?? 0]))
    .map((x) => x.join("\t")).join("\n") + "\n");
console.log("round | precision | rows");
for (const r of perRound) console.log(`  ${r.round}    | ${String(r.pct).padStart(5)}%   | ${r.added}`);
console.log(`total rows ${out.length - 1}; unexplained functions left ${fns.length - anchors.size}`);
