// table-consensus.mjs — do function-pointer tables other than vtables carry a subsystem?
//
// The vtable channel resolves tables through RTTI. A table of function pointers with no typeinfo — a callback array, a
// dispatch list — can still be evidence: if most of its members that already carry a label agree, the rest belong there
// too. This measures that rule on held-out 1 MB windows before anything is emitted.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;
const starts = new Set(zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(",")[0].toLowerCase()));
const startAddr = new Map([...starts].map((s) => [parseInt(s, 16), s]));
const isFn = (w) => w > 0x100 && w < TEXT_END && startAddr.has(w);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}

// build the runs once
const runs = [];
for (let i = 0; i + 12 <= buf.length;) {
  const vaddr = i + 0x100;
  if (vaddr < TEXT_END) { i += 4; continue; }
  if (!isFn(buf.readUInt32LE(i))) { i += 4; continue; }
  const start = i, members = [];
  while (i + 4 <= buf.length && isFn(buf.readUInt32LE(i))) { members.push(buf.readUInt32LE(i)); i += 4; }
  if (members.length >= 3) runs.push({ vaddr: start + 0x100, members });
}
const cp = (o, n) => {
  if (!n) return 0;
  const p = o / n, z = 1.959963985, d = 1 + (z * z) / n;
  return ((p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d) * 100;
};
const WIN = 0x100000;
const buckets = new Map();
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inWin = (a) => a >= w && a < w + WIN;
    for (const r of runs) {
      // vote from members outside the window only
      const votes = new Map();
      for (const m of r.members) {
        if (inWin(m)) continue;
        const lab = A.get(startAddr.get(m));
        if (lab) votes.set(lab, (votes.get(lab) || 0) + 1);
      }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      const total = [...votes.values()].reduce((a, b) => a + b, 0);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      const share = top[0][1] / total;
      const key = `${total >= 5 ? "5+" : String(total)}|${share === 1 ? "pure" : share >= 0.8 ? "80+" : "low"}`;
      for (const m of r.members) {
        if (!inWin(m)) continue;
        const s = startAddr.get(m);
        const truth = A.get(s);
        if (!truth) continue; // only score where truth exists
        const e = buckets.get(key) || { n: 0, ok: 0 };
        e.n++;
        if (top[0][0] === truth) e.ok++;
        buckets.set(key, e);
      }
    }
  }
}
console.log("members labelled outside | purity | hits/sample | point | CP95");
for (const [k, e] of [...buckets].sort()) {
  const [n, band] = k.split("|");
  if (e.n < 30) { console.log(`${n.padEnd(3)} | ${band.padEnd(4)} | ${(e.ok + "/" + e.n).padEnd(10)} | (too few)`); continue; }
  console.log(`${n.padEnd(3)} | ${band.padEnd(4)} | ${(e.ok + "/" + e.n).padEnd(10)} | ${((100 * e.ok) / e.n).toFixed(1)}% | ${cp(e.ok, e.n).toFixed(1)}%`);
}
