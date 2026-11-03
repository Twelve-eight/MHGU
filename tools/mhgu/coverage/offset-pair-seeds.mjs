// offset-pair-seeds.mjs — emit the pair rule that offset-pairs.mjs validated.
//
// Measured: two or more agreeing pure offset pairs are 94.6% (CP95 93.9) on functions under 200 instructions and 84.0%
// (82.7) on larger ones; a single pair is 36.7-59.0% and is never used. A pair is much more specific than a single offset,
// which is why the vocabulary is larger than the 26 single offsets.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "attr-offsetpairs.tsv";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;
const MIN_CARRIERS = 5, COMMON = 100;

const A = new Map();
const anyLabel = new Set();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (f === "attr-offsetpairs.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (!c[1] || c[1] === "unknown") continue;
    anyLabel.add(c[0].toLowerCase());
    if (c[2] === "A" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const tiers = new Set();
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  if (c[3] && c[3] !== "unknown") tiers.add(c[0].toLowerCase());
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2] }; });
const offsOf = (f) => {
  const out = new Set();
  for (let i = 0; i < f.n; i++) {
    const v = f.a + i * 4;
    if (v + 4 > TEXT_END) break;
    const w = buf.readUInt32LE(v + 0x100);
    const op = (w >>> 25) & 0x7;
    if (op === 2 && ((w >>> 26) & 0x3) === 1 && !(w & (1 << 25))) { const imm = w & 0xfff; if (imm) out.add(imm); }
    else if (((w >>> 25) & 0x7) === 0 && ((w >>> 20) & 0x1f) >= 0x10) { const b = w & 0xf, h = (w >>> 4) & 0xf; if (b && h) out.add(0x1000 | ((h << 4) | b)); }
  }
  return out;
};
const offs = new Map();
for (const f of fns) offs.set(f.s, offsOf(f));
const freq = new Map();
for (const [, s] of offs) for (const o of s) freq.set(o, (freq.get(o) || 0) + 1);
const common = new Set([...freq].filter(([, n]) => n >= COMMON && n < 20000).map(([o]) => o));
const pairsOf = (s) => {
  const list = [...s].filter((o) => common.has(o)).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push(list[i] * 4096 + list[j]);
  return out;
};
const users = new Map();
for (const [s, set] of offs) for (const p of pairsOf(set)) { if (!users.has(p)) users.set(p, []); users.get(p).push(s); }
const purity = new Map();
for (const [p, us] of users) {
  const cnt = new Map();
  let tot = 0;
  for (const s of us) { const lab = A.get(s); if (lab) { tot++; cnt.set(lab, (cnt.get(lab) || 0) + 1); } }
  if (tot < MIN_CARRIERS || cnt.size !== 1) continue;
  purity.set(p, [...cnt.keys()][0]);
}
const rows = [["start", "label", "conf", "evidence"]];
let emitted = 0;
for (const f of fns) {
  if (anyLabel.has(f.s) || tiers.has(f.s)) continue;
  const votes = new Map();
  for (const p of pairsOf(offs.get(f.s))) { const lab = purity.get(p); if (lab) votes.set(lab, (votes.get(lab) || 0) + 1); }
  if (!votes.size) continue;
  const top = [...votes].sort((a, b) => b[1] - a[1]);
  if (top.length > 1 && top[0][1] === top[1][1]) continue;
  if (top[0][1] < 2 || f.n >= 200) continue; // measured cells only
  rows.push([f.s, top[0][0], "V", `${top[0][1]} pure offset pair(s) say ${top[0][0]} (${f.n} insns)`]);
  emitted++;
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`pure pairs ${purity.size}; emitted ${emitted} rows`);
