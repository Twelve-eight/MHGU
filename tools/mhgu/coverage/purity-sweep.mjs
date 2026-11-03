// purity-sweep.mjs — how low can the callee-purity floor go before the one-vote rule stops being 90% accurate?
//
// Five shifted 1 MB grids; the purity table is rebuilt per window from A-evidence outside it; the truth is the window's own
// A rows. Reports the pool of all labels, because that is what the coverage line needs.
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
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const callers = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!callers.has(k)) callers.set(k, []); callers.get(k).push(f.s); }
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
const PURITIES = [0.5, 0.6, 0.65, 0.7, 0.75];
const stat = new Map(PURITIES.map((p) => [p, { n: 0, ok: 0 }]));
const WIN = 0x100000;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inside = fns.filter((f) => f.a >= w && f.a < w + WIN);
    if (inside.length < 20) continue;
    const inSet = new Set(inside.map((f) => f.s));
    const anchor = new Map([...direct].filter(([s]) => !inSet.has(s)));
    // purity per callee, restricted to anchors
    const purity = new Map();
    for (const [k, users] of callers) {
      const cnt = new Map();
      let tot = 0;
      for (const u of users) { if (inSet.has(u)) continue; const l = anchor.get(u); if (l) { tot++; cnt.set(l, (cnt.get(l) || 0) + 1); } }
      if (tot < 8) continue;
      const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
      purity.set(k, { lab: top[0], share: top[1] / tot });
    }
    for (const f of inside) {
      const truth = direct.get(f.s);
      if (!truth) continue;
      for (const minP of PURITIES) {
        const votes = new Map();
        for (const c of f.callees) {
          if (inSet.has(c)) continue;
          const p = purity.get("0x" + c.toString(16));
          if (!p || p.share < minP) continue;
          votes.set(p.lab, (votes.get(p.lab) || 0) + 1);
        }
        if (!votes.size) continue;
        const top = [...votes].sort((a, b) => b[1] - a[1]);
        if (top.length > 1 && top[0][1] === top[1][1]) continue;
        const e = stat.get(minP);
        e.n++;
        if (top[0][0] === truth) e.ok++;
      }
    }
  }
}
for (const p of PURITIES) {
  const e = stat.get(p);
  console.log(`purity >= ${p.toFixed(2)} over >=8 callers: ${e.ok}/${e.n} = ${((100 * e.ok) / (e.n || 1)).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
}
