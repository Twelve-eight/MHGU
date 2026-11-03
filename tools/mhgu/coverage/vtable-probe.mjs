// vtable-probe.mjs — settle how a vtable address reaches code, with counts instead of guesses.
//
// Four questions, all answered against the same 6,095 vtable addresses that attr-vtable-retile.tsv cites:
//   A. as a little-endian dword, where does each vtable address occur in the image? .text literal pool vs data.
//   B. the sites that compute an address and store it to [rN+0]: is the word AT that address a vtable?
//   C. every ldr-pc in .text: does its literal value, used directly with no pc add, land on a vtable? (absolute form)
//   D. ground truth: rows whose evidence says "written by str at 0xADDR" name both the instruction and the vtable,
//      so the pairs are a test set for any scanner.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const img = fs.readFileSync(ROOT + "/main.140.flat.bin");
const T = 0x100;                  // flat = vaddr + 0x100
const TEXT_END = 0x13f1dec;
const word = (v) => img.readUInt32LE(v + T);

// ---- the vtable set
const all = new Map();   // addr -> {labels:Map, writtenBy:Set}
for (const l of fs.readFileSync(INV + "attr-vtable-retile.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t");
  const v = /vtable (0x[0-9a-f]+)/.exec(c[3] || "");
  if (!v) continue;
  const e = all.get(v[1]) || { labels: new Map(), writtenBy: new Set() };
  e.labels.set(c[1], (e.labels.get(c[1]) || 0) + 1);
  const w = /written by str at (0x[0-9a-f]+)/.exec(c[3] || "");
  if (w) e.writtenBy.add(parseInt(w[1], 16));
  all.set(v[1], e);
}
const set = new Set(all.keys());
const labelled = new Set([...all].filter(([, e]) => e.labels.size === 1 && !e.labels.has("unknown")).map(([a]) => a));
console.log(`[set] vtable addresses ${set.size}, of which a single known class ${labelled.size}`);

// ---- A. where do those addresses occur as literal dwords?
const occ = new Map();
for (let v = 0; v + 4 <= img.length; v += 4) {
  const k = "0x" + img.readUInt32LE(v).toString(16);
  if (!set.has(k)) continue;
  const e = occ.get(k) || { text: 0, data: 0 };
  if (v - T < TEXT_END) e.text++; else e.data++;
  occ.set(k, e);
}
let aText = 0, aData = 0, anyText = 0;
for (const [, e] of occ) { aText += e.text; aData += e.data; if (e.text) anyText++; }
console.log(`[A] of ${set.size} vtable addresses, ${occ.size} occur as a dword; ${aText} occurrences in .text, ${aData} in data; ${anyText} addresses occur in .text`);

// ---- functions
const starts = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => parseInt(l.split(",")[0], 16)).sort((a, b) => a - b);
const fnOf = (a) => {
  let lo = 0, hi = starts.length - 1, best = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= a) { best = m; lo = m + 1; } else hi = m - 1; }
  return best >= 0 ? starts[best] : -1;
};

// ---- B and C
const lastLdr = new Map();
let ldrPc = 0, addPc = 0, stored = 0, cHits = 0;
const cFns = new Set();
const storedAddrs = [];
for (let a = 0x100; a < TEXT_END; a += 4) {
  const w = word(a);
  if ((w & 0x0fff0000) === 0x059f0000 || (w & 0x0fff0000) === 0x051f0000) {
    ldrPc++;
    const rt = (w >> 12) & 15, imm = w & 0xfff, up = (w & 0x00800000) !== 0;
    const lit = up ? a + 8 + imm : a + 8 - imm;
    if (lit + 4 > TEXT_END) continue;
    const val = word(lit);
    lastLdr.set(rt, { a, val });
    if (set.has("0x" + val.toString(16))) { cHits++; cFns.add(fnOf(a)); }   // C: absolute literal
    continue;
  }
  if ((w & 0x0fe00000) === 0x00800000) {
    const rn = (w >> 16) & 15, rr = w & 15;
    let rd = -1, rm = -1;
    if (rn === 15 && rr !== 15) { rd = (w >> 12) & 15; rm = rr; }
    else if (rr === 15 && rn !== 15) { rd = (w >> 12) & 15; rm = rn; }
    if (rm >= 0 && lastLdr.has(rm)) {
      addPc++;
      const base = lastLdr.get(rm);
      const abs = base.val + a + 8;
      let ok = false;
      for (let k = 4; k <= 16; k += 4) {
        const w2 = word(a + k);
        if ((w2 & 0x0ff00000) === 0x05800000 && ((w2 >> 12) & 15) === rd && (w2 & 0xfff) === 0 && ((w2 >> 16) & 15) !== 15) { ok = true; break; }
      }
      if (ok) { stored++; storedAddrs.push(abs); }
      lastLdr.delete(rm);
      continue;
    }
  }
  if ((w & 0x0c000000) === 0x04000000 && (w & 0x00200000) === 0) lastLdr.clear();
}
console.log(`[C] ldr-pc ${ldrPc}, add-pc ${addPc}; literal value used directly hits a vtable: ${cHits} sites in ${cFns.size} functions`);
console.log(`[B] add-pc sites that store to [rN+0]: ${stored}`);

let bDirect = 0, bDeref = 0, bDerefFns = 0;
const bDerefSet = new Set();
for (const abs of storedAddrs) {
  if (set.has("0x" + abs.toString(16))) bDirect++;
  if (abs + 4 > img.length) continue;
  const inner = "0x" + word(abs).toString(16);
  if (set.has(inner)) { bDeref++; bDerefSet.add(inner); }
}
console.log(`[B] stored value is itself a vtable: ${bDirect}; the word AT the stored address is a vtable: ${bDeref} (${bDerefSet.size} distinct)`);

// ---- D. ground truth pairs
let gt = 0, gtInFn = 0, gtNotInFn = 0;
for (const [addr, e] of all) for (const site of e.writtenBy) {
  gt++;
  if (fnOf(site) >= 0) gtInFn++; else gtNotInFn++;
}
console.log(`[D] "written by str at" pairs: ${gt}, site inside a known function ${gtInFn}, outside ${gtNotInFn}`);
const sample = [...all].slice(0, 3).map(([a, e]) => `${a}=>${[...e.writtenBy].map((x) => "0x" + x.toString(16)).join(",")}`);
console.log(`[D] sample ${sample.join(" ")}`);
