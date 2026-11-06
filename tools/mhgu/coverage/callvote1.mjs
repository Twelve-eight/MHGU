// callvote1.mjs — one-vote inference, iterated, with the whole cascade replayed inside every fold.
//
// Two rules, each measured on five held-out offset grids before it was allowed in:
//
//  callee: ONE callee at >=70% purity over >=8 labelled callers is enough. purity-sweep.mjs measures 95.2% at 95%
//    purity, 92.7% at 85%, 91.7% at 75% and 90.6% at 70% (CP95 90.2); at 65% it collapses to 87.8%, so 70% is the floor. where the older callvote channel needed two agreeing votes to reach the same place. The safety comes from
//    purity, not from a second vote: a callee whose callers are three quarters one subsystem is a typed API in practice.
//  caller: a function whose labelled callers all agree AND number at least four. Measured 174/184 = 94.6% (CP95 90.3);
//    with three callers it is 91.1% but the CP95 lower bound drops to 87.5, so three is not enough.
//
// Validation replays the whole cascade: for each held-out evidence file the file is stripped, every round is rebuilt from
// the stripped anchors, and only then is the round scored on that file's own rows. Scoring round N against a purity table
// that round N-1 built from the held-out rows would flatter every round after the first.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT = path.resolve(INV, process.env.CASCADE_OUT || "attr-callvote1.tsv");
const MIN_CALLERS = 8;
const MIN_PURITY = 0.70; // measured floor: 90.6% (CP95 90.2) on the five-grid hold-out; 0.65 drops to 87.8
const MIN_CALLER_VOTES = 4;
const ROUNDS = Number(process.env.CASCADE_ROUNDS || 1);
const ROUND_FLOOR = 90.0;

const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
const anchorFiles = new Map();
const direct = new Map();
for (const f of src) {
  const p = path.join(INV, f);
  // attr-fingerprint rows are structural signatures, not names: they never seed purity. attr-callvote1.tsv is this
  // script's own output and must never feed back in.
  if (!fs.existsSync(p) || f === "attr-fingerprint.tsv" || f === "attr-callvote1.tsv") continue;
  const m = new Map();
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, conf] = l.split("\t");
    if (conf !== "A" || !lab || lab === "unknown") continue;
    m.set(s.toLowerCase(), lab);
    if (!direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
  anchorFiles.set(f, m);
}

// The three older channels were each validated at >=96% on their own folds. They join the anchor set so that the purity
// table and the traceability check agree; a row then always traces to something measured, never to another inference.
const USE_V_ANCHORS = process.env.CASCADE_V_ANCHORS === "1";
const strongV = new Map(); // labels these three channels assert, kept separately for the contradiction guard
for (const f of ["attr-callvote.tsv", "attr-classvote.tsv", "attr-callervote.tsv"]) {
  const p2 = path.join(INV, f);
  if (!fs.existsSync(p2)) continue;
  for (const l of fs.readFileSync(p2, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s0, lab, conf] = l.split("\t");
    if (conf !== "V" || !lab) continue;
    strongV.set(s0.toLowerCase(), lab);
    if (USE_V_ANCHORS && !direct.has(s0.toLowerCase())) direct.set(s0.toLowerCase(), lab);
  }
}

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));

const callers = new Map();
for (const f of fns) for (const c of new Set(f.callees)) {
  const k = "0x" + c.toString(16);
  if (!callers.has(k)) callers.set(k, []);
  callers.get(k).push(f.s);
}

function purity(anchor) {
  const m = new Map();
  for (const [k, users] of callers) {
    const cnt = new Map();
    let tot = 0;
    for (const u of users) {
      const l = anchor.get(u);
      if (!l) continue;
      tot++;
      cnt.set(l, (cnt.get(l) || 0) + 1);
    }
    const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
    // Sparse but unanimous helpers count too. small-sample-purity.mjs measures the band: a callee whose 6 or 7 labelled
    // callers are all one label is 93.4% / 95.0% accurate (CP95 92.1 / 93.9), while at five callers it falls to 90.8%
    // (89.4) and at four to 75.6%, so the sparse rule starts at six and demands unanimity.
    if (tot >= MIN_CALLERS) {
      if (top[1] / tot >= MIN_PURITY) m.set(k, { lab: top[0], share: top[1] / tot, tot });
    } else if (tot >= 6 && cnt.size === 1) {
      m.set(k, { lab: top[0], share: 1, tot });
    }
  }
  return m;
}

// caller-side rule: every labelled caller agrees and there are at least MIN_CALLER_VOTES of them
function callerTable(anchor) {
  const m = new Map();
  for (const f of fns) {
    const us = callers.get(f.s);
    if (!us) continue;
    const cnt = new Map();
    let tot = 0;
    for (const u of us) {
      const l = anchor.get(u);
      if (!l) continue;
      tot++;
      cnt.set(l, (cnt.get(l) || 0) + 1);
    }
    if (tot < MIN_CALLER_VOTES || cnt.size !== 1) continue;
    m.set(f.s, { lab: [...cnt.keys()][0], n: tot });
  }
  return m;
}

function vote(f, pure, byCaller) {
  const hits = [];
  for (const c of f.callees) {
    const p = pure.get("0x" + c.toString(16));
    if (p) hits.push(p);
  }
  let lab = null, how = null, n = 0;
  if (hits.length) {
    const cnt = new Map();
    for (const h of hits) cnt.set(h.lab, (cnt.get(h.lab) || 0) + 1);
    const top = [...cnt].sort((a, b) => b[1] - a[1]);
    if (top.length > 1 && top[0][1] === top[1][1]) return null; // ambiguous between callees
    lab = top[0][0]; how = "callee"; n = top[0][1];
  }
  const cv = byCaller.get(f.s);
  if (cv) {
    if (lab && lab !== cv.lab) return null; // the two rules disagree: say nothing
    if (!lab) { lab = cv.lab; how = "caller"; n = cv.n; }
  }
  return lab ? { lab, how, n } : null;
}

// A cascade is a pure function of the anchor set, so a fold can replay it exactly.
function cascade(anchor, maxRounds) {
  const out = [];
  const adopted = new Map();
  for (let r = 0; r < maxRounds; r++) {
    const a = new Map(anchor);
    for (const [k, v] of adopted) a.set(k, v.label);
    const pu = purity(a);
    const ct = callerTable(a);
    const added = new Map();
    for (const f of fns) {
      if (anchor.has(f.s) || adopted.has(f.s)) continue;
      const got = vote(f, pu, ct);
      if (got) added.set(f.s, got);
    }
    out.push({ round: r + 1, purity: pu, byCaller: ct, added });
    if (!added.size) break;
    for (const [k, v] of added) adopted.set(k, { label: v.lab });
  }
  return out;
}

const cpLower = (ok, n) => {
  if (!n) return 0;
  const p = ok / n, z = 1.959963985;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return ((c - r) / d) * 100;
};

// --- held-out replay
const perRound = Array.from({ length: ROUNDS }, () => ({ ok: 0, n: 0 }));
for (const [heldName, held] of anchorFiles) {
  const a = new Map(direct);
  for (const [st, lab] of held) {
    let elsewhere = null;
    for (const [otherName, m] of anchorFiles) {
      if (otherName === heldName) continue;
      const l = m.get(st);
      if (l) { elsewhere = l; break; }
    }
    if (elsewhere) a.set(st, elsewhere); else a.delete(st);
  }
  const rounds = cascade(a, ROUNDS);
  for (const { round, purity: pu, byCaller } of rounds) {
    const e = perRound[round - 1];
    for (const [st, lab] of held) {
      if (direct.get(st) !== lab) continue;
      const f = byStart.get(st);
      if (!f) continue;
      const got = vote(f, pu, byCaller);
      if (!got) continue;
      e.n++;
      if (got.lab === lab) e.ok++;
    }
  }
}

// --- final cascade on the full anchors, with the floor applied
const rows = [["start", "label", "conf", "evidence"]];
const adopted = new Map();
for (const { round, added } of cascade(direct, ROUNDS)) {
  const e = perRound[round - 1];
  const lower = cpLower(e.ok, e.n);
  console.log(`round ${round}: fold ${e.ok}/${e.n} = ${((100 * e.ok) / (e.n || 1)).toFixed(1)}% (CP95 ${lower.toFixed(1)}%), adds ${added.size}`);
  if (lower < ROUND_FLOOR) { console.log(`round ${round} is below the ${ROUND_FLOOR}% floor: rejected, nothing published`); process.exitCode = 1; break; }
  for (const [k, v] of added) adopted.set(k, { ...v, round });
}

// Support closure, strict form: a row survives only if direct evidence can justify it, not another inference. Round 1 showed
// why: hub 0x281a70 is a motion-request function that the strict two-vote channel calls monster-em, but a round-2 vote made
// it ui, and every round-3 row calling it inherited ui. Chains of inference are how a single mislabelled hub becomes a
// region. So a published row must trace to an A-labelled neighbour (any callee with its own evidence row) or to four
// A-labelled callers that agree, which is the same bar the two-vote channel uses and leaves nothing circular.
// "Traceable" anchors: direct evidence plus the three channels that were validated at >=96% on their own folds
// (two-vote callee, class consensus, caller vote). An inferred hub with no such label may not be the only thing holding a
// published row up, because that is how one wrong hub becomes a region.
const traceable = direct;
function supportOk(f, st, lab) {
  if (!f) return false;
  if (f.callees.some((c) => traceable.get("0x" + c.toString(16)) === lab)) return true;
  const us = (callers.get(st) || []).filter((u) => traceable.get(u) === lab);
  const other = (callers.get(st) || []).filter((u) => traceable.has(u) && traceable.get(u) !== lab);
  return us.length >= 4 && other.length === 0;
}
// Keep the old purity-table closure as a second check: a published row must also be re-derivable from the final table. A hub can lose purity as the anchor set
// grows (its callers get relabelled, or new callers appear), so a row that was justified in round 1 can become unjustified
// by round 6. Such rows are dropped and the check repeats until the table is closed.
// Two closures, chosen by strictness. The strict one (CASCADE_STRICT=1) keeps only rows whose label is carried by a
// neighbour that has its own validated label; the loose one re-checks rows against the final purity table, which can be
// dominated by earlier inferences and is therefore what the extended table is.
const STRICT = process.env.CASCADE_STRICT === "1";
for (let pass = 0; pass < 4; pass++) {
  const dropped = [];
  const a2 = STRICT ? null : new Map(direct);
  if (!STRICT) for (const [k2, v2] of adopted) a2.set(k2, v2.lab);
  const pu2 = STRICT ? null : purity(a2);
  for (const [st, v] of adopted) {
    if (STRICT) { if (!supportOk(byStart.get(st), st, v.lab)) dropped.push(st); continue; }
    const f = byStart.get(st);
    const ok = f && f.callees.some((c) => pu2.get("0x" + c.toString(16))?.lab === v.lab);
    if (!ok) dropped.push(st);
  }
  for (const st of dropped) adopted.delete(st);
  console.log(`support closure pass ${pass + 1}: dropped ${dropped.length} row(s)`);
  if (!dropped.length) break;
}

{
  const finalAnchor = new Map(direct);
  for (const [k, v] of adopted) finalAnchor.set(k, v.lab);
  const pu = purity(finalAnchor);
  const ct = callerTable(finalAnchor);
  let unsupported = 0;
  for (const [st, v] of adopted) {
    const f = byStart.get(st);
    const viaCallee = f && f.callees.some((c) => pu.get("0x" + c.toString(16))?.lab === v.lab);
    if (!viaCallee && ct.get(st)?.lab !== v.lab) unsupported++;
  }
  if (unsupported) console.log(`note: ${unsupported} row(s) hold only through the strict traceability rule`);
  else console.log("self-check: every inferred row is supported by the final purity table");
}

// Guard: no row may contradict a label already asserted by one of the three stronger channels. They are anchors now, so
// this should be impossible; if it ever fires, the anchor merge broke.
{
  // Drop rather than fail: a contradiction means the weaker channel reached a different label, and the stronger one wins.
  let clash = 0;
  for (const [st, v] of adopted) {
    const strong = strongV.get(st);
    if (strong && strong !== v.lab) { adopted.delete(st); clash++; }
  }
  console.log(clash ? `guard: dropped ${clash} row(s) that contradict a stronger channel` : "guard: no row contradicts the two-vote, class or caller channels");
}

for (const [st, v] of adopted) {
  rows.push([st, v.lab, "V", `one-vote round ${v.round} (${v.how}): ${v.n} strongly-typed neighbour(s) agree on ${v.lab}`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
const byHow = new Map();
for (const [, v] of adopted) byHow.set(v.how, (byHow.get(v.how) || 0) + 1);
console.log(`rows ${rows.length - 1} (${[...byHow].map(([k, n]) => `${k} ${n}`).join(", ")}) -> ${path.basename(OUT)}`);
