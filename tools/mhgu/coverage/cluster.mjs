// cluster.mjs — group functions into call-graph communities so "explained" can be judged per community instead of
// per function.
//
// Why: 46.8% of instructions carry a propagated label (tier B) that no single function has evidence for. Asking an
// auditor to justify 14,531 functions one by one is not feasible; asking for 10 sampled functions per community, and
// then applying the community verdict to its members, is the standard compromise and is falsifiable (the sample is
// recorded and can be re-drawn).
//
// Method: deterministic label propagation over the undirected call graph, then connected-component cleanup; a hub
// guard prevents the 200 highest-degree nodes from merging everything into one blob.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/data/functions.csv.gz");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/communities.tsv");

const text = zlib.gunzipSync(fs.readFileSync(SRC)).toString("utf8");
const nodes = new Map(); // start -> {insns, callees[]}
for (const l of text.split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/.exec(l);
  if (!m) continue;
  nodes.set(parseInt(m[1], 16), { insns: Number(m[3]), callees: m[5] ? m[5].split("|").filter(Boolean).map((x) => parseInt(x, 16)) : [] });
}
const ids = [...nodes.keys()].sort((a, b) => a - b);

// undirected adjacency, dropping edges to hub nodes (they carry little community information and merge everything)
const deg = new Map();
for (const [s, n] of nodes) for (const c of n.callees) {
  if (!nodes.has(c)) continue;
  deg.set(s, (deg.get(s) || 0) + 1);
  deg.set(c, (deg.get(c) || 0) + 1);
}
const hubs = new Set([...deg].sort((a, b) => b[1] - a[1]).slice(0, 200).map(([s]) => s));
const adj = new Map(ids.map((s) => [s, []]));
for (const [s, n] of nodes) {
  if (hubs.has(s)) continue;
  for (const c of n.callees) {
    if (!nodes.has(c) || hubs.has(c)) continue;
    adj.get(s).push(c);
    adj.get(c).push(s);
  }
}

// label propagation: every node starts with its own id; a node adopts the smallest id among its neighbours'
// communities in each round (deterministic, converges fast on this graph)
let label = new Map(ids.map((s) => [s, s]));
for (let round = 0; round < 20; round++) {
  let changed = 0;
  for (const s of ids) {
    if (hubs.has(s)) continue;
    const nb = adj.get(s);
    if (!nb.length) continue;
    let best = label.get(s);
    for (const c of nb) { const l = label.get(c); if (l < best) best = l; }
    if (best !== label.get(s)) { label.set(s, best); changed++; }
  }
  if (!changed) { console.log(`converged after ${round + 1} rounds`); break; }
}

// stats
const comm = new Map();
for (const s of ids) {
  const l = label.get(s);
  if (!comm.has(l)) comm.set(l, { fn: 0, ins: 0, members: [] });
  const c = comm.get(l);
  c.fn++; c.ins += nodes.get(s).insns; c.members.push(s);
}
const sizes = [...comm.values()].map((c) => c.ins).sort((a, b) => b - a);
const totalIns = sizes.reduce((a, b) => a + b, 0);
console.log(`communities: ${comm.size}; largest ${(100 * sizes[0] / totalIns).toFixed(1)}% of .text, top10 ${(100 * sizes.slice(0, 10).reduce((a, b) => a + b, 0) / totalIns).toFixed(1)}%`);

// write: community id (min member addr), size, insns, member list hash
const rows = [["community", "functions", "insns", "pct_insns", "hub_members"]];
for (const [l, c] of [...comm].sort((a, b) => b[1].ins - a[1].ins)) {
  const hubCount = c.members.filter((s) => hubs.has(s)).length;
  rows.push([`0x${l.toString(16)}`, String(c.fn), String(c.ins), ((100 * c.ins) / totalIns).toFixed(2), String(hubCount)]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
