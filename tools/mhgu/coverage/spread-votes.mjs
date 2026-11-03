// spread-votes.mjs — how many independent neighbours back each spread label, and in which direction.
//
// spread-precision.mjs showed that the vote count is the thing that decides whether a spread row is trustworthy: ui is 73%
// right at one agreeing neighbour and 94% at three, while kernel-os is 38% at one and 97% at two. The tiers file only keeps
// the label, so this recomputes the vote behind every spread row at production anchor density and writes the count next to
// it. report.mjs then admits a row only when its label's measured threshold is met.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "spread-votes.tsv";

const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p) || /vote\d*\.tsv$/.test(f)) continue; // inference never votes here
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c] = l.split("\t");
    if (c === "A" && lab && lab !== "unknown" && !direct.has(s.toLowerCase())) direct.set(s.toLowerCase(), lab);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const rev = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!rev.has(k)) rev.set(k, []); rev.get(k).push(f.s); }

const rows = [["start", "votes", "label", "agrees"]];
let spread = 0, agree = 0;
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  const s = c[0].toLowerCase();
  if (!c[4] || !c[4].startsWith("spread")) continue;
  spread++;
  const f = fns.find((x) => x.s === s);
  if (!f) continue;
  const votes = new Map();
  for (const cal of f.callees) { const lab = direct.get("0x" + cal.toString(16)); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
  for (const p of rev.get(s) || []) { const lab = direct.get(p); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
  const top = [...votes].sort((a, b) => b[1] - a[1]);
  const winner = top.length ? top[0][0] : "";
  const n = top.length ? top[0][1] : 0;
  const ok = winner === c[3];
  if (ok) agree++;
  rows.push([c[0], String(n), winner, ok ? "yes" : "no"]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`spread rows ${spread}, production vote reproduces the stored label on ${agree} (${((100 * agree) / spread).toFixed(1)}%)`);
const hist = new Map();
for (const r of rows.slice(1)) {
  const k = r[3] === "yes" ? "agree" : "differ";
  const n = Number(r[1]);
  const bucket = n >= 3 ? "3+" : String(n);
  const key = `${k}:${bucket}`;
  hist.set(key, (hist.get(key) || 0) + 1);
}
console.log([...hist].sort().map(([k, v]) => `${k}=${v}`).join(" "));
