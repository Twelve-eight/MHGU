// spread-grid.mjs — spread precision by (label, vote count), on the independent yardstick.
//
// The pooled spread figure is 72.4% and the per-label figures swing from 99.8 to 5.5. If precision also depends on how many
// neighbours voted, a (label, >=N votes) cell may clear 90% with enough rows to publish, while the label as a whole cannot.
// Truth is A-direct only; votes come from outside the 1 MB window that contains the target; five shifted grids.
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
  .map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2], callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};

const MIN = Number(process.env.MIN || 3);
const cells = new Map(); // label -> {n, ok, ins}
const WIN = 0x100000;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const wEnd = w + WIN;
    const inWin = (a) => a >= w && a < wEnd;
    for (const f of fns) {
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue;
      const votes = new Map();
      for (const c of f.callees) { if (inWin(c)) continue; const lab = A.get("0x" + c.toString(16)); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
      for (const p of rev.get(f.s) || []) { if (inWin(parseInt(p, 16))) continue; const lab = A.get(p); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      if (top[0][1] < MIN) continue;
      const e = cells.get(top[0][0]) || { n: 0, ok: 0, ins: 0 };
      e.n++; if (top[0][0] === truth) e.ok++; e.ins += f.n;
      cells.set(top[0][0], e);
    }
  }
}
console.log(`spread rule, >=${MIN} votes, independent truth, per label:`);
for (const [lab, e] of [...cells].sort((a, b) => b[1].n - a[1].n)) {
  const p = (100 * e.ok) / e.n;
  console.log(`  ${lab.padEnd(14)} ${String(e.ok).padStart(5)}/${String(e.n).padEnd(5)} = ${p.toFixed(1).padStart(5)}%  CP95 ${cp(e.ok, e.n).toFixed(1).padStart(5)}  ${p >= 90 && cp(e.ok, e.n) >= 90 ? "PUBLISH" : ""}`);
}

// Selection / report halves (LABEL selects the cell): the meter's rule is that the half used to pick the cell may not be the half used to report it.
if (process.env.HALVES) {
  const h = [{ n: 0, ok: 0 }, { n: 0, ok: 0 }];
  for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
    for (let w = off; w < 0x1400000; w += WIN) {
      const wEnd = w + WIN;
      const inWin = (a) => a >= w && a < wEnd;
      for (const f of fns) {
        if (!inWin(f.a)) continue;
        const truth = A.get(f.s);
        if (!truth) continue;
        const votes = new Map();
        for (const c of f.callees) { if (inWin(c)) continue; const lab = A.get("0x" + c.toString(16)); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
        for (const p of rev.get(f.s) || []) { if (inWin(parseInt(p, 16))) continue; const lab = A.get(p); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
        if (!votes.size) continue;
        const top = [...votes].sort((a, b) => b[1] - a[1]);
        if (top.length > 1 && top[0][1] === top[1][1]) continue;
        if (top[0][1] < MIN || top[0][0] !== (process.env.LABEL || "render-gfx")) continue;
        const k = (f.a >> 2) & 1;
        h[k].n++; if (truth === (process.env.LABEL || "render-gfx")) h[k].ok++;
      }
    }
  }
  for (const k of [0, 1]) console.log(`  half ${k}: ${h[k].ok}/${h[k].n} = ${h[k].n ? ((100 * h[k].ok) / h[k].n).toFixed(1) : "-"}%  CP95 ${cp(h[k].ok, h[k].n).toFixed(1)}`);
}
