// hub-degree.mjs — does the size of the supporting hub change how right the vote is?
//
// A hub with 400 callers that are 80% one label is used by everybody; a hub with 12 callers that are 100% one label is a
// private helper. Both pass a purity bar, but only the second is evidence about the caller. This measures held-out accuracy
// against hub degree so the rule can cap it if the worry is real.
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
const buckets = new Map();
const WIN = 0x100000;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inside = fns.filter((f) => f.a >= w && f.a < w + WIN);
    if (inside.length < 20) continue;
    const inSet = new Set(inside.map((f) => f.s));
    const anchor = new Map([...direct].filter(([s]) => !inSet.has(s)));
    const purity = new Map();
    for (const [k, users] of callers) {
      const cnt = new Map();
      let tot = 0;
      for (const u of users) { if (inSet.has(u)) continue; const l = anchor.get(u); if (l) { tot++; cnt.set(l, (cnt.get(l) || 0) + 1); } }
      if (tot < 8) continue;
      const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
      if (top[1] / tot < 0.7) continue;
      purity.set(k, { lab: top[0], tot });
    }
    for (const f of inside) {
      const truth = direct.get(f.s);
      if (!truth) continue;
      const votes = new Map();
      let maxDeg = 0;
      for (const c of f.callees) {
        if (inSet.has(c)) continue;
        const p = purity.get("0x" + c.toString(16));
        if (!p) continue;
        votes.set(p.lab, (votes.get(p.lab) || 0) + 1);
        if (p.tot > maxDeg) maxDeg = p.tot;
      }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      const key = maxDeg < 15 ? "8-14" : maxDeg < 40 ? "15-39" : maxDeg < 100 ? "40-99" : "100+";
      const e = buckets.get(key) || { n: 0, ok: 0 };
      e.n++;
      if (top[0][0] === truth) e.ok++;
      buckets.set(key, e);
    }
  }
}
for (const k of ["8-14", "15-39", "40-99", "100+"]) {
  const e = buckets.get(k);
  if (!e) continue;
  console.log(`largest supporting hub has ${k} labelled callers: ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
}
