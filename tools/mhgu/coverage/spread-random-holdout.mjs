// spread-random-holdout.mjs — is the geographic construction's 72.4% an artefact of window boundaries?
//
// Every channel was measured by holding out a 1 MB window and predicting the functions inside from outside evidence. That is
// a legitimate precision measurement as long as a prediction is made at all, but window edges change neighbourhoods. This
// repeats the spread rule under a random holdout - withhold 20% of the evidence rows, predict them from the rest - which has
// no geometry at all. If the two agree, the geographic numbers are not boundary artefacts.
import fs from "node:fs";
import crypto from "node:crypto";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const SHARE = Number(process.env.SHARE || 0.2);
const REPS = Number(process.env.REPS || 3);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" || f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv" || f === "attr-fingerprint.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const cp = (o, n) => { if (!n) return 0; const p = o / n, z = 1.959963985, d = 1 + z * z / n; return ((p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d) * 100; };
let n = 0, ok = 0;
for (let rep = 0; rep < REPS; rep++) {
  const held = new Set();
  for (const s of A.keys()) {
    const h = crypto.createHash("sha1").update(`${rep}:${s}`).digest();
    if (h[0] / 256 < SHARE) held.add(s);
  }
  for (const f of fns) {
    if (!held.has(f.s)) continue;
    const truth = A.get(f.s);
    const votes = new Map();
    for (const c of f.callees) { const k = "0x" + c.toString(16); if (held.has(k)) continue; const l = A.get(k); if (l) votes.set(l, (votes.get(l) || 0) + 1); }
    for (const p of rev.get(f.s) || []) { if (held.has(p)) continue; const l = A.get(p); if (l) votes.set(l, (votes.get(l) || 0) + 1); }
    if (!votes.size) continue;
    const top = [...votes].sort((a, b) => b[1] - a[1]);
    if (top.length > 1 && top[0][1] === top[1][1]) continue;
    n++;
    if (top[0][0] === truth) ok++;
  }
}
console.log(`spread rule, random ${(SHARE * 100).toFixed(0)}% holdout x ${REPS}: ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}%  CP95 ${cp(ok, n).toFixed(1)}%`);
