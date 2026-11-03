// small-sample-purity.mjs — is a private helper that only two or three labelled functions call still evidence?
//
// purity() discards any callee with fewer than eight labelled callers, which throws away the ideal case: a helper that is
// called by exactly three functions of one subsystem and nothing else. This measures held-out accuracy for those small
// hubs, bucketed by how many labelled callers they have and how pure they are, so a lower floor can be admitted on numbers
// rather than on intuition.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p) || /vote\d*\.tsv$/.test(f)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c] = l.split("\t");
    if (c === "A" && lab && lab !== "unknown" && !direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const callers = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!callers.has(k)) callers.set(k, []); callers.get(k).push(f.s); }
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
// buckets: labelled-caller count x purity band
const buckets = new Map();
const WIN = 0x100000;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inside = fns.filter((f) => f.a >= w && f.a < w + WIN);
    if (inside.length < 20) continue;
    const inSet = new Set(inside.map((f) => f.s));
    const small = new Map();
    for (const [k, users] of callers) {
      let tot = 0;
      const cnt = new Map();
      for (const u of users) { if (inSet.has(u)) continue; const l = direct.get(u); if (l) { tot++; cnt.set(l, (cnt.get(l) || 0) + 1); } }
      if (tot < 1 || tot > 7) continue;
      const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
      small.set(k, { lab: top[0], tot, share: top[1] / tot, distinct: cnt.size });
    }
    for (const f of inside) {
      const truth = direct.get(f.s);
      if (!truth) continue;
      for (const c of f.callees) {
        if (inSet.has(c)) continue;
        const p = small.get("0x" + c.toString(16));
        if (!p) continue;
        const band = p.share === 1 && p.distinct === 1 ? "pure" : p.share >= 0.75 ? "75+" : "low";
        const key = `${p.tot}|${band}`;
        const e = buckets.get(key) || { n: 0, ok: 0 };
        e.n++;
        if (p.lab === truth) e.ok++;
        buckets.set(key, e);
      }
    }
  }
}
const rows = [...buckets].sort((a, b) => (a[0] < b[0] ? -1 : 1));
console.log("labelled callers | purity band | hits/sample | point | CP95");
for (const [k, e] of rows) {
  const [tot, band] = k.split("|");
  console.log(`${tot.padStart(2)} | ${band.padEnd(4)} | ${(e.ok + "/" + e.n).padEnd(12)} | ${((100 * e.ok) / e.n).toFixed(1)}% | ${cp(e.ok, e.n).toFixed(1)}%`);
}
