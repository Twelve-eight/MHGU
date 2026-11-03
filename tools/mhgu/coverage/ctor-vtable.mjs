// ctor-vtable.mjs — find class constructors by the vptr they store, measured and kept for the record.
//
// Idea: a constructor writes its vtable pointer into [this+0], so if the vtable's class is known the constructor
// inherits that label. In ARM the idiom is a pc-relative load of the vtable address, an add that turns the pc delta
// into an absolute address, and a store of that register to offset 0 of the object.
//
// Measured 2026-11-04: 30,306 pc-relative address computations, 9,206 of them stored to [rN+0], ZERO landing on an
// address in attr-vtable-retile.tsv. The reason is not the decoder. Byte-searching the image for one such vtable
// address (0x172f04c) finds it exactly once, at vaddr 0x13f20d4 - in the data section just past the end of .text
// (0x13f1dec), i.e. a registrar table. Constructors do not embed the vptr in .text; the data table holds it.
// So a future attempt has to start from the registrar table, not from a scan of constructors. Kept, not deleted,
// because the numbers here are the evidence for that statement.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const MIRROR = ROOT + "/main.140.flat.bin";
const OUT = INV + "attr-ctor-vtable.tsv";

// ---- vtables whose class is known, from the vtable channel's own evidence text
const vt = new Map();
for (const l of fs.readFileSync(INV + "attr-vtable-retile.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t");
  const v = /vtable (0x[0-9a-f]+)/.exec(c[3] || "");
  if (!v) continue;
  if (!c[1] || c[1] === "unknown") continue;
  const e = vt.get(v[1]) || { n: 0, labs: new Map() };
  e.n++;
  e.labs.set(c[1], (e.labs.get(c[1]) || 0) + 1);
  vt.set(v[1], e);
}
const vtableLabel = new Map();
for (const [a, e] of vt) if (e.labs.size === 1) vtableLabel.set(a, [...e.labs.keys()][0]);
console.log(`vtables with a single known class: ${vtableLabel.size}`);

// ---- function boundaries
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); const s = parseInt(c[0], 16); return { s, e: s + 4 * (+c[2]), n: +c[2] }; })
  .sort((a, b) => a.s - b.s);
const starts = fns.map((f) => f.s);
const fnAt = (a) => {
  let lo = 0, hi = starts.length - 1, best = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= a) { best = m; lo = m + 1; } else hi = m - 1; }
  if (best < 0) return null;
  const f = fns[best];
  return a < f.e ? f : null;
};

// ---- sweep .text
const img = fs.readFileSync(MIRROR);
const TEXT_START = 0x100;            // flat 0 == vaddr -0x100, so vaddr v lives at flat v+0x100
const TEXT_END = 0x13f1dec;
const word = (v) => img.readUInt32LE(v + TEXT_START);

const hits = new Map();
let resolved = 0, stored = 0;
const lastLdr = new Map();
const FLUSH = 12;
for (let a = 0x100; a < TEXT_END; a += 4) {
  const w = word(a);
  if ((w & 0x0fff0000) === 0x059f0000 || (w & 0x0fff0000) === 0x051f0000) {
    const rt = (w >> 12) & 15;
    const imm = w & 0xfff;
    const up = (w & 0x00800000) !== 0;
    const lit = up ? a + 8 + imm : a + 8 - imm;   // address of the literal, not the value
    if (lit + 4 > TEXT_END) continue;
    lastLdr.set(rt, { a, value: img.readUInt32LE(lit + TEXT_START) });
    continue;
  }
  if ((w & 0x0fe00000) === 0x00800000) {          // add with pc as an operand
    const rn = (w >> 16) & 15, rr = w & 15;
    let rd = -1, rm = -1;
    if (rn === 15 && rr !== 15) { rd = (w >> 12) & 15; rm = rr; }        // add rD, pc, rX
    else if (rr === 15 && rn !== 15) { rd = (w >> 12) & 15; rm = rn; }   // add rD, rX, pc
    if (rm >= 0 && lastLdr.has(rm) && a - lastLdr.get(rm).a <= 4 * FLUSH) {
      const base = lastLdr.get(rm);
      const abs = base.value + a + 8;
      resolved++;
      // does the register reach [rX+0] within a few instructions?
      let storedToObj = false;
      for (let k = 4; k <= 16; k += 4) {
        const w2 = word(a + k);
        if ((w2 & 0x0ff00000) === 0x05800000 && ((w2 >> 12) & 15) === rd && (w2 & 0xfff) === 0 && ((w2 >> 16) & 15) !== 15) {
          storedToObj = true;
          break;
        }
      }
      if (storedToObj) stored++;
      const key = "0x" + abs.toString(16);
      if (vtableLabel.has(key)) {
        const f = fnAt(a);
        if (f && !hits.has(f.s)) hits.set(f.s, { label: vtableLabel.get(key), vtable: key, site: a });
      }
      lastLdr.delete(rm);
      continue;
    }
  }
  if ((w & 0x0c000000) === 0x04000000 && (w & 0x00200000) === 0) lastLdr.clear();
}

const rows = [["start", "label", "conf", "evidence"]];
for (const [s, h] of [...hits].sort((a, b) => a[0] - b[0])) {
  rows.push(["0x" + s.toString(16), h.label, "V",
    `constructor writes vtable ${h.vtable} (class label ${h.label}) at 0x${h.site.toString(16)}`]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`resolved ${resolved} pc-relative addresses, ${stored} stored to [rN+0], ${hits.size} matched a known vtable`);
console.log(`wrote ${OUT}`);
