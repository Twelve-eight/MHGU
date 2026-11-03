// offset-signature.mjs — can a struct offset inside a function name its subsystem?
//
// This is the last intra-function signal with any mass: the immediate offsets in `ldr/str [rX, #imm]` describe which fields
// a function touches, and a subsystem's objects tend to share field layouts (the monster action object at 0x1428 is the
// known example). Measured the same way as every other channel: five shifted 1 MB windows, labels from outside the window
// only, truth from A rows inside it, and a Clopper-Pearson bound on every cell.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2] }; });

// offsets used by each function: ldr/str with a 12-bit immediate, and ldrh/strh/ldrb/strb with 8-bit
const offsetsOf = (f) => {
  const out = new Set();
  for (let i = 0; i < f.n; i++) {
    const v = f.a + i * 4;
    if (v + 4 > TEXT_END) break;
    const w = buf.readUInt32LE(v + 0x100);
    const op = (w >>> 25) & 0x7;
    if (op === 2 && ((w >>> 26) & 0x3) === 1 && !(w & (1 << 25))) { // single data transfer, immediate
      const imm = w & 0xfff;
      if (imm) out.add(imm);
    } else if (((w >>> 25) & 0x7) === 0 && ((w >>> 20) & 0x1f) >= 0x10) { // halfword/byte transfers
      const b = w & 0xf;
      const h = (w >>> 4) & 0xf;
      if (b && h) out.add(0x1000 | (h << 4 | b));
    }
  }
  return out;
};
const off = new Map(); // offset -> Map(functionStart -> 1)
for (const f of fns) {
  for (const o of offsetsOf(f)) {
    if (!off.has(o)) off.set(o, new Set());
    off.get(o).add(f.s);
  }
}
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
// purity per offset, recomputed per window
const WIN = 0x100000;
const buckets = new Map();
for (const w0 of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = w0; w < 0x1400000; w += WIN) {
    const inWin = (a) => a >= w && a < w + WIN;
    const purity = new Map();
    for (const [o, users] of off) {
      const cnt = new Map();
      let tot = 0;
      for (const s of users) {
        if (inWin(parseInt(s, 16))) continue;
        const lab = A.get(s);
        if (lab) { tot++; cnt.set(lab, (cnt.get(lab) || 0) + 1); }
      }
      if (tot < Number(process.env.MIN_CARRIERS || 20)) continue;
      const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
      if (top[1] / tot >= Number(process.env.MIN_PURITY || 0.95)) purity.set(o, { lab: top[0], tot, share: top[1] / tot });
    }
    for (const f of fns) {
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue;
      const votes = new Map();
      let best = 0;
      for (const o of offsetsOf(f)) {
        const p = purity.get(o);
        if (!p) continue;
        votes.set(p.lab, (votes.get(p.lab) || 0) + 1);
        if (p.tot > best) best = p.tot;
      }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      for (const [k, e] of [[top[0][1] >= 2 ? "2+" : "1", null]]) {
        const key = k + (f.n >= 200 ? "|big" : "|small");
        const cur = buckets.get(key) || { n: 0, ok: 0 };
        cur.n++;
        if (top[0][0] === truth) cur.ok++;
        buckets.set(key, cur);
      }
    }
  }
}
for (const [k, e] of [...buckets].sort()) console.log(`agreeing pure offsets ${k}: ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
