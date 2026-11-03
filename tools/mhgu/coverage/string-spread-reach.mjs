// string-vs-spread independence probe: are the string voters reachable from the target through the call graph?
//
// Direct callee/caller links between a target and its string voters are absent (0 of 37,203 links), but the pipeline's
// seeds include labelOf(strings), so a string seed can travel 1-8 hops along the call graph before it lands on the target.
// If such a path exists for most rows, the agreement is forced by the same evidence and cannot be counted as confirmation.
// BFS runs in both directions over non-A-direct intermediaries, depth 8, sampling rows to keep it bounded.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || ["attr-immscan.tsv", "attr-tableseeds.tsv", "attr-offsets.tsv", "attr-offsetpairs.tsv"].includes(f)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: (c[4] || "").split("|").filter(Boolean).map((x) => "0x" + parseInt(x, 16).toString(16)) }; });
const fwd = new Map(fns.map((f) => [f.s, f.callees]));
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { if (!rev.has(c)) rev.set(c, []); rev.get(c).push(f.s); }

const lab = new Map();
for (const l of fs.readFileSync(INV + "function-labels.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t"); lab.set(c[0].toLowerCase(), { label: c[2], prov: c[3] });
}
const strs = new Map();
for (const l of fs.readFileSync(INV + "stringxref.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t"); const s = c[0].toLowerCase();
  if (!strs.has(s)) strs.set(s, new Set());
  strs.get(s).add(c[1]);
}
const voters = new Map(); // string -> [{start,label}]
for (const [s, L] of A) for (const n of strs.get(s) || []) {
  if (!voters.has(n)) voters.set(n, []);
  voters.get(n).push({ s, l: L });
}

// rows where string consensus agrees with an existing non-evidence label at >=5 unanimous voters
const rows = [];
for (const [s, names] of strs) {
  const cur = lab.get(s);
  if (!cur || A.has(s)) continue;
  const tally = new Map(), vs = new Set();
  for (const n of names) for (const v of voters.get(n) || []) { tally.set(v.l, (tally.get(v.l) || 0) + 1); vs.add(v.s + "|" + v.l); }
  if (!tally.size) continue;
  const ent = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (ent[0][1] < 5 || ent.length > 1) continue;
  if (cur.label !== ent[0][0]) continue;
  rows.push({ s, voters: [...vs].filter((x) => x.split("|")[1] === ent[0][0]).map((x) => x.split("|")[0]) });
}

const DEPTH = 8;
function reachable(from, to) {
  // both directions, intermediaries must not be A-direct
  let frontier = new Set([from]);
  const seen = new Set([from]);
  for (let d = 1; d <= DEPTH; d++) {
    const next = new Set();
    for (const n of frontier) {
      for (const m of fwd.get(n) || []) { if (seen.has(m)) continue; if (m === to) return d; if (A.has(m)) continue; seen.add(m); next.add(m); }
      for (const m of rev.get(n) || []) { if (seen.has(m)) continue; if (m === to) return d; if (A.has(m)) continue; seen.add(m); next.add(m); }
    }
    if (!next.size) return 0;
    frontier = next;
  }
  return 0;
}

const step = Math.max(1, Math.floor(rows.length / 60));
let sampled = 0, withPath = 0, noPath = 0, shortestSum = 0;
const examples = [];
for (let i = 0; i < rows.length; i += step) {
  const r = rows[i];
  sampled++;
  let best = 0;
  for (const v of r.voters.slice(0, 40)) {
    const d = reachable(v, r.s);
    if (d && (!best || d < best)) best = d;
  }
  if (best) { withPath++; shortestSum += best; if (examples.length < 5) examples.push(`${r.s} path via voter at ${best} hops`); }
  else noPath++;
}
console.log(`rows: ${rows.length}, sampled ${sampled}`);
console.log(`reachable through the call graph within ${DEPTH} hops (non-A intermediaries): ${withPath}, no path: ${noPath}`);
if (withPath) console.log(`mean shortest hop count where a path exists: ${(shortestSum / withPath).toFixed(1)}`);
for (const e of examples) console.log("  " + e);
