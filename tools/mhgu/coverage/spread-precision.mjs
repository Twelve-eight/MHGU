// spread-precision.mjs — how well does a neighbourhood spread label survive when the whole 1 MB region is held out?
//
// Five shifted grids, fixed 1 MB windows, evidence from outside the window only, and the tiers' own label as truth. The
// per-label numbers decide which spread labels may be counted toward the >=90% coverage line, so they are printed with
// the Clopper-Pearson lower bound rather than a point estimate.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  if (!fs.existsSync(INV + f)) continue;
  for (const l of fs.readFileSync(INV + f, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c] = l.split("\t");
    if (c === "A" && lab && lab !== "unknown" && !direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
}
const tiers = new Map();
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  if (c[3] && c[3] !== "unknown") tiers.set(c[0].toLowerCase(), c[3]);
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
const per = new Map();
let ok = 0, n = 0;
const WIN = 0x100000;
const GRIDS = (process.env.GRIDS || "0,2,4").split(",").map(Number);
const OFFSETS = [0, 0x20000, 0x40000, 0x60000, 0x80000];
for (const gi of GRIDS) { const off = OFFSETS[gi];
  for (let w = off; w < 0x1400000; w += WIN) {
    const inside = fns.filter((f) => f.a >= w && f.a < w + WIN);
    if (inside.length < 20) continue;
    const inSet = new Set(inside.map((f) => f.s));
    for (const f of inside) {
      if (direct.has(f.s)) continue; // spread rows only
      const truth = tiers.get(f.s);
      if (!truth) continue;
      const votes = new Map();
      for (const c of f.callees) { const k = "0x" + c.toString(16); if (inSet.has(k)) continue; const l = direct.get(k); if (l) votes.set(l, (votes.get(l) || 0) + 1); }
      for (const p of rev.get(f.s) || []) { if (inSet.has(p)) continue; const l = direct.get(p); if (l) votes.set(l, (votes.get(l) || 0) + 1); }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      n++;
      const hit = top[0][0] === truth;
      if (hit) ok++;
      const e = per.get(truth) || { n: 0, ok: 0 };
      e.n++; if (hit) e.ok++;
      per.set(truth, e);
    }
  }
}
console.log(`spread label recovery (current tiers, 1 MB x five grids): ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}% (CP95 ${cp(ok, n).toFixed(1)}%)`);
const rows = [...per].sort((a, b) => b[1].n - a[1].n);
for (const [lab, e] of rows) console.log(`  ${lab.padEnd(16)} ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%  ${cp(e.ok, e.n) >= 90 ? "QUALIFIES" : ""}`);
