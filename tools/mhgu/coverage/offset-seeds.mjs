// offset-seeds.mjs — emit the struct-offset channel that offset-signature.mjs validated.
//
// Rule (measured: one agreeing pure offset 92.4%, CP95 91.6; two or more 99.4%, CP95 99.1): an offset that at least 20
// A-labelled functions touch and that at least 95% of them attribute to one subsystem is a field of that subsystem's
// objects. A function touching such offsets inherits their label when they agree and no other channel has labelled it.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "attr-offsets.tsv";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;

const A = new Map();
const anyLabel = new Set();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (f === "attr-offsets.tsv") continue; // never read its own previous output as an existing label
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

const offsetsOf = (f) => {
  const out = new Set();
  for (let i = 0; i < f.n; i++) {
    const v = f.a + i * 4;
    if (v + 4 > TEXT_END) break;
    const w = buf.readUInt32LE(v + 0x100);
    const op = (w >>> 25) & 0x7;
    if (op === 2 && ((w >>> 26) & 0x3) === 1 && !(w & (1 << 25))) {
      const imm = w & 0xfff;
      if (imm) out.add(imm);
    } else if (((w >>> 25) & 0x7) === 0 && ((w >>> 20) & 0x1f) >= 0x10) {
      const b = w & 0xf, h = (w >>> 4) & 0xf;
      if (b && h) out.add(0x1000 | ((h << 4) | b));
    }
  }
  return out;
};
const users = new Map();
for (const f of fns) for (const o of offsetsOf(f)) { if (!users.has(o)) users.set(o, []); users.get(o).push(f.s); }
const purity = new Map();
for (const [o, us] of users) {
  const cnt = new Map();
  let tot = 0;
  for (const s of us) { const lab = A.get(s); if (lab) { tot++; cnt.set(lab, (cnt.get(lab) || 0) + 1); } }
  // measured at this floor: one agreeing pure offset 91.1% (CP95 90.2), two or more 99.4% (CP95 99.1)
  if (tot < 5) continue;
  const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
  if (top[1] / tot >= 0.95) purity.set(o, { lab: top[0], tot });
}
const rows = [["start", "label", "conf", "evidence"]];
let emitted = 0;
for (const f of fns) {
  if (anyLabel.has(f.s) || tiers.has(f.s)) continue; // never restate an existing label
  const votes = new Map();
  for (const o of offsetsOf(f)) {
    const p = purity.get(o);
    if (p) votes.set(p.lab, (votes.get(p.lab) || 0) + 1);
  }
  if (!votes.size) continue;
  const top = [...votes].sort((a, b) => b[1] - a[1]);
  if (top.length > 1 && top[0][1] === top[1][1]) continue;
  // Size-conditional rule, measured: one agreeing offset is 93.6% (CP95 92.7) on functions under 200 instructions but
  // only 86.0% (84.2) on larger ones, where a big body touches enough fields to match a pure offset by chance; two
  // agreeing offsets are 99.2-99.6% at both sizes. So a single vote only counts for small functions.
  if (top[0][1] < 2 && f.n >= 200) continue;
  rows.push([f.s, top[0][0], "V", `${top[0][1]} pure struct offset(s) say ${top[0][0]} (each touched by >=5 A-labelled functions at >=95% agreement; ${f.n} insns)`]);
  emitted++;
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`pure offsets ${purity.size}; emitted ${emitted} rows -> ${OUT.split("/").pop()}`);
