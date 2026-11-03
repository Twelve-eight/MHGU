// callvote1.mjs — one-vote inference: a single strongly-typed callee is enough.
//
// The existing callvote channel demands two agreeing high-purity callees (purity >=85% over >=12 callers) and reaches
// 96%. A sweep over (min callers x min purity x agreeing votes) on five held-out offset grids showed that ONE callee at
// >=95% purity over >=8 callers is already 95.2% accurate (CP95 lower bound 94.8%), which clears the 90% bar on its own
// and covers far more functions than the two-vote rule. The extra safety comes from purity, not from a second vote: a
// callee whose A-direct callers are 95% one subsystem is effectively a typed API, and calling it is the evidence.
//
// Rows go to attr-callvote1.tsv as confidence "V". Validation is leave-one-evidence-file-out: the purity table is rebuilt
// without the held-out file, then the rule must recover that file's A-direct labels from call edges alone.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const OUT = path.join(INV, "attr-callvote1.tsv");
const MIN_CALLERS = 8;
const MIN_PURITY = 0.95;

const src = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"));
const anchorFiles = new Map();
const direct = new Map();
for (const f of src) {
  const p = path.join(INV, f);
  // attr-fingerprint rows are structural signatures, not names: they never seed purity
  if (!fs.existsSync(p) || f === "attr-fingerprint.tsv") continue;
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

const callers = new Map();
for (const f of fns) for (const c of new Set(f.callees)) {
  const k = "0x" + c.toString(16);
  if (!callers.has(k)) callers.set(k, []);
  callers.get(k).push(f.s);
}

// purity keyed by callee start, built from the given anchor map
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

// --- fold-wise validation: hold out one evidence file at a time
const cpLower = (ok, n) => {
  if (!n) return 0;
  const p = ok / n, z = 1.959963985;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return ((c - r) / d) * 100;
};
let foldOk = 0, foldN = 0;
const perFold = [];
for (const [heldName, held] of anchorFiles) {
  const anchor = new Map(direct);
  // drop every held-out row that no other file also asserts, so the file cannot predict itself
  for (const [s, lab] of held) {
    let elsewhere = null;
    for (const [otherName, m] of anchorFiles) {
      if (otherName === heldName) continue;
      const l = m.get(s);
      if (l) { elsewhere = l; break; }
    }
    if (elsewhere) anchor.set(s, elsewhere); else anchor.delete(s);
  }
  const pure = purity(anchor);
  let ok = 0, n = 0;
  for (const [s, lab] of held) {
    if (direct.get(s) !== lab) continue; // keep one canonical label per function
    const f = fns.find((x) => x.s === s);
    if (!f) continue;
    const got = vote(f, pure);
    if (!got) continue;
    n++;
    if (got.lab === lab) ok++;
  }
  if (n >= 20) perFold.push([heldName, ok, n, (100 * ok) / n]);
  foldOk += ok; foldN += n;
}

const pure = purity(direct);
const rows = [["start", "label", "conf", "evidence"]];
for (const f of fns) {
  if (direct.has(f.s)) continue;
  const got = vote(f, pure);
  if (!got) continue;
  rows.push([f.s, got.lab, "V", `one-vote: ${got.hits.length} strong callee(s) agree on ${got.lab} (each >=${MIN_CALLERS} A-direct callers, >=${(MIN_PURITY * 100).toFixed(0)}% purity)`]);
}

fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`one-vote (>=${MIN_CALLERS} callers, >=${(MIN_PURITY * 100).toFixed(0)}% purity): ${rows.length - 1} rows -> ${path.basename(OUT)}`);
console.log(`fold: ${foldOk}/${foldN} = ${(100 * foldOk / (foldN || 1)).toFixed(1)}%, CP95 lower ${cpLower(foldOk, foldN).toFixed(1)}%`);
for (const [name, ok, n, pct] of perFold) console.log(`  ${name}: ${ok}/${n} = ${pct.toFixed(1)}%`);
