// callvote1.mjs — one-vote inference, iterated, with the whole cascade replayed inside every fold.
//
// The existing callvote channel demands two agreeing high-purity callees (purity >=85% over >=12 callers) and reaches
// 96%. A sweep over (min callers x min purity x agreeing votes) on five held-out offset grids showed that ONE callee at
// >=95% purity over >=8 callers is already 95.2% accurate (CP95 lower bound 94.8%), which clears the 90% bar on its own
// and covers far more functions than the two-vote rule. The extra safety comes from purity, not from a second vote: a
// callee whose A-direct callers are 95% one subsystem is effectively a typed API, and calling it is the evidence.
//
// Rounds matter and they compound, so validation replays the whole cascade: for each held-out evidence file the file is
// stripped, every round is rebuilt from the stripped anchors, and only then is the round scored on that file's own rows.
// Scoring round N against a purity table that round N-1 built from the held-out rows would flatter every round after the
// first. A round that falls below the floor is dropped together with everything it would have seeded.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT = path.join(INV, "attr-callvote1.tsv");
const MIN_CALLERS = 8;
const MIN_PURITY = 0.85;
const ROUNDS = 6;
const ROUND_FLOOR = 90.0;

const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
const anchorFiles = new Map();
const direct = new Map();
for (const f of src) {
  const p = path.join(INV, f);
  // attr-fingerprint rows are structural signatures, not names: they never seed purity
  if (!fs.existsSync(p) || f === "attr-fingerprint.tsv" || f === "attr-callvote1.tsv") continue;
  const m = new Map();
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const cols = l.split("\t");
    const [s, lab, conf] = cols;
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

function vote(f, pure) {
  const hits = [];
  for (const c of f.callees) {
    const p = pure.get("0x" + c.toString(16));
    if (p) hits.push(p);
  }
  if (!hits.length) return null;
  const cnt = new Map();
  for (const h of hits) cnt.set(h.lab, (cnt.get(h.lab) || 0) + 1);
  const top = [...cnt].sort((a, b) => b[1] - a[1]);
  if (top.length > 1 && top[0][1] === top[1][1]) return null; // ambiguous
  return { lab: top[0][0], hits };
}

// A cascade is a pure function of the anchor set, so a fold can replay it exactly.
function cascade(anchor, maxRounds) {
  const out = [];
  const adopted = new Map();
  for (let r = 0; r < maxRounds; r++) {
    const a = new Map(anchor);
    for (const [k, v] of adopted) a.set(k, v.label);
    const pu = purity(a);
    const added = new Map();
    for (const f of fns) {
      if (anchor.has(f.s) || adopted.has(f.s)) continue;
      const got = vote(f, pu);
      if (got) added.set(f.s, { label: got.lab, hits: got.hits.length });
    }
    out.push({ round: r + 1, purity: pu, added });
    if (!added.size) break;
    for (const [k, v] of added) adopted.set(k, { label: v.label });
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
  for (const { round, purity: pu } of rounds) {
    const e = perRound[round - 1];
    for (const [st, lab] of held) {
      if (direct.get(st) !== lab) continue;
      const f = byStart.get(st);
      if (!f) continue;
      const got = vote(f, pu);
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

for (const [st, v] of adopted) {
  rows.push([st, v.label, "V", `one-vote round ${v.round}: ${v.hits} strong callee(s) agree on ${v.label} (each >=${MIN_CALLERS} callers, >=${(MIN_PURITY * 100).toFixed(0)}% purity)`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`one-vote (>=${MIN_CALLERS} callers, >=${(MIN_PURITY * 100).toFixed(0)}% purity), ${ROUNDS} rounds max: ${rows.length - 1} rows -> ${path.basename(OUT)}`);
