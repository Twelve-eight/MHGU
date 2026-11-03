// callvote1.mjs — one-vote inference, iterated, with the whole cascade replayed inside every fold.
//
// Two rules, each measured on five held-out offset grids before it was allowed in:
//
//  callee: ONE callee at >=75% purity over >=8 labelled callers is enough. The sweep over (min callers x min purity x
//    agreeing votes) gave 95.2% for one callee at 95% purity, 92.7% at 85% and 91.7% at 75% (CP95 91.3), all above the
//    90% bar, where the older callvote channel needed two agreeing votes to reach the same place. The safety comes from
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
const OUT = path.join(INV, "attr-callvote1.tsv");
const MIN_CALLERS = 8;
const MIN_PURITY = 0.75; // measured floor: 91.7% (CP95 91.3) on the five-grid hold-out
const MIN_CALLER_VOTES = 4;
const ROUNDS = 6;
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
    if (tot < MIN_CALLERS) continue;
    const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
    if (top[1] / tot >= MIN_PURITY) m.set(k, { lab: top[0], share: top[1] / tot, tot });
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
  if (round > 1 && lower < ROUND_FLOOR) { console.log(`round ${round} below the ${ROUND_FLOOR}% floor: this round and later are dropped`); break; }
  for (const [k, v] of added) adopted.set(k, { ...v, round });
}

// Support closure: a row is kept only if the final anchor set can still justify it. A hub can lose purity as the anchor set
// grows (its callers get relabelled, or new callers appear), so a row that was justified in round 1 can become unjustified
// by round 6. Such rows are dropped and the check repeats until the table is closed.
for (let pass = 0; pass < 3; pass++) {
  const finalAnchor = new Map(direct);
  for (const [k, v] of adopted) finalAnchor.set(k, v.lab);
  const pu = purity(finalAnchor);
  const ct = callerTable(finalAnchor);
  const dropped = [];
  for (const [st, v] of adopted) {
    const f = byStart.get(st);
    const viaCallee = f && f.callees.some((c) => pu.get("0x" + c.toString(16))?.lab === v.lab);
    const viaCaller = ct.get(st)?.lab === v.lab;
    if (!viaCallee && !viaCaller) dropped.push(st);
  }
  for (const st of dropped) adopted.delete(st);
  console.log(`support closure pass ${pass + 1}: dropped ${dropped.length} row(s)`);
  if (!dropped.length) break;
}
const finalAnchor = new Map(direct);
for (const [k, v] of adopted) finalAnchor.set(k, v.lab);
{
  const pu = purity(finalAnchor);
  const ct = callerTable(finalAnchor);
  let unsupported = 0;
  for (const [st, v] of adopted) {
    const f = byStart.get(st);
    const viaCallee = f && f.callees.some((c) => pu.get("0x" + c.toString(16))?.lab === v.lab);
    if (!viaCallee && ct.get(st)?.lab !== v.lab) unsupported++;
  }
  if (unsupported) { console.error(`FAIL: ${unsupported} inferred rows still unsupported`); process.exitCode = 1; }
  else console.log("self-check: every inferred row is supported by the final purity table");
}

for (const [st, v] of adopted) {
  rows.push([st, v.lab, "V", `one-vote round ${v.round} (${v.how}): ${v.n} strongly-typed neighbour(s) agree on ${v.lab}`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
const byHow = new Map();
for (const [, v] of adopted) byHow.set(v.how, (byHow.get(v.how) || 0) + 1);
console.log(`rows ${rows.length - 1} (${[...byHow].map(([k, n]) => `${k} ${n}`).join(", ")}) -> ${path.basename(OUT)}`);
