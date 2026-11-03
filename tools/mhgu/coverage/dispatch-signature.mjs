// dispatch-signature.mjs — do functions dispatching through the same virtual slot belong together?
//
// A dispatch shell loads a global object, dereferences the vtable and calls one slot: `ldr rX,[pc,#lit]` -> `ldr rX,[rX]`
// -> `ldr rX,[rX,#off]` -> `blx rX`. The (global, offset) pair names the interface being called, so shells that use the same
// pair very likely serve the same subsystem. Measured the usual way: five shifted windows, labels from outside only, truth
// from A-direct rows inside.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;
const MIN_GROUP = Number(process.env.MIN_GROUP || 3);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" || f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2] }; });
const word = (v) => buf.readUInt32LE(v + 0x100);

// signature = "global|offset" for each virtual slot the function calls through
function signatures(f) {
  const out = new Set();
  let global = null;
  for (let i = 0; i < f.n && i < 400; i++) {
    const v = f.a + i * 4;
    if (v + 4 > TEXT_END) break;
    const w = word(v);
    // ldr rX,[pc,#imm] gives us a literal address; remember the value it points at
    if ((w >>> 26 & 3) === 1 && (w >>> 25 & 1) === 0 && (w >>> 20 & 1) === 1) {
      const rn = (w >>> 16) & 0xf;
      if (rn === 15) {
        const imm = w & 0xfff;
        const litAddr = v + 8 + (w & 0x800000 ? -imm : imm);
        if (litAddr + 4 <= TEXT_END + 0x100) global = word(litAddr);
      }
    }
    // blx rX: take the most recent small load offset as the slot
    if ((w & 0x0ffffff0) === 0x012fff30 && global) {
      let slot = null;
      for (let j = i - 1; j >= 0 && j > i - 6; j--) {
        const v2 = f.a + j * 4;
        const w2 = word(v2);
        if ((w2 >>> 26 & 3) === 1 && (w2 >>> 25 & 1) === 0 && (w2 >>> 20 & 1) === 1 && ((w2 >>> 16) & 0xf) !== 15) {
          const off = w2 & 0xfff;
          if (off) { slot = off; break; }
        }
      }
      if (slot !== null) out.add(`${global}|${slot}`);
    }
  }
  return out;
}

const sigs = new Map();
for (const f of fns) sigs.set(f.s, signatures(f));
const members = new Map();
for (const [s, set] of sigs) for (const k of set) { if (!members.has(k)) members.set(k, []); members.get(k).push(s); }
console.log(`signatures ${members.size}; groups with >=${MIN_GROUP} members: ${[...members.values()].filter((m) => m.length >= MIN_GROUP).length}`);

const cp = (o, n) => { if (!n) return 0; const p = o / n, z = 1.959963985, d = 1 + z * z / n; return ((p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d) * 100; };
const WIN = 0x100000;
let ok = 0, n = 0;
for (const off of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = off; w < 0x1400000; w += WIN) {
    const inWin = (a) => a >= w && a < w + WIN;
    for (const f of fns) {
      if (!inWin(f.a)) continue;
      const truth = A.get(f.s);
      if (!truth) continue;
      const votes = new Map();
      for (const k of sigs.get(f.s)) {
        const others = (members.get(k) || []).filter((m) => m !== f.s && !inWin(parseInt(m, 16)));
        if (others.length < MIN_GROUP - 1) continue;
        const labs = others.map((m) => A.get(m)).filter(Boolean);
        if (labs.length < MIN_GROUP - 1) continue;
        const cnt = new Map();
        for (const l of labs) cnt.set(l, (cnt.get(l) || 0) + 1);
        if (cnt.size !== 1) continue; // only unanimous groups vote
        votes.set([...cnt.keys()][0], (votes.get([...cnt.keys()][0]) || 0) + 1);
      }
      if (!votes.size) continue;
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      if (top.length > 1 && top[0][1] === top[1][1]) continue;
      n++;
      if (top[0][0] === truth) ok++;
    }
  }
}
console.log(`dispatch-signature vote: ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}%  CP95 ${cp(ok, n).toFixed(1)}%`);
