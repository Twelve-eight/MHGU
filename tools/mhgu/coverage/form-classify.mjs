// form-classify.mjs — for functions whose subsystem is unknown, say at least what shape they are.
//
// The no-label bucket is 13k functions with no subsystem attribution and no relational signal left. Its shape is still
// knowable from the code itself, and that is a different axis from the subsystem label: a tail thunk, a leaf accessor, a
// predicate and a virtual dispatch are all describable without knowing which system owns them. This emits that as a
// separate column-shaped artefact, never as a subsystem label and never in the coverage number.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "function-forms.tsv";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;

const labelled = new Set();
for (const l of fs.readFileSync(INV + "function-labels.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  labelled.add(l.split("\t")[0].toLowerCase());
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), n: +c[2] }; });

const word = (v) => buf.readUInt32LE(v + 0x100);

function classify(f) {
  const ins = [];
  for (let i = 0; i < f.n && i < 400; i++) {
    const v = f.a + i * 4;
    if (v + 4 > TEXT_END) break;
    ins.push(word(v));
  }
  if (!ins.length) return ["unknown", ""];
  const isBl = (w) => (w >>> 24) === 0xeb || (w >>> 24) === 0xfa; // bl / blx immediate
  const isBlxR = (w) => (w & 0x0ffffff0) === 0x012fff30;
  const isB = (w) => (w >>> 24) === 0xea;
  const isBxLr = (w) => w === 0xe12fff1e;
  const calls = ins.filter(isBl).length;
  const indirect = ins.filter(isBlxR).length;
  // ARM single data transfer: bits 27-26 = 01, bit 25 = 0 for the immediate form, bit 20 is L (1 = load). Using bit 25 as
  // the load flag (as the first version did) swapped accessors and mutators.
  const immTransfer = (w) => ((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0;
  const loads = ins.filter((w) => immTransfer(w) && ((w >>> 20) & 1) === 1).length;
  const stores = ins.filter((w) => immTransfer(w) && ((w >>> 20) & 1) === 0).length;
  const cmps = ins.filter((w) => ((w >>> 24) & 0xf) === 0xe && ((w >>> 21) & 0xf) >= 0xa && ((w >>> 21) & 0xf) <= 0xf).length;
  const last = ins[ins.length - 1];
  // A function whose first instruction is an unconditional branch hands its body to another function: the retiled size can
  // still be large because the follower was merged in, but the shape is a jump.
  if (isB(ins[0])) return ["tail-jump", "first instruction branches to another function"];
  if (f.n <= 3 && isB(last)) return ["thunk", "tail branch only"];
  if (f.n <= 3 && calls === 0) return ["stub", "<=3 instructions, no call"];
  if (indirect > 0 && calls === 0) return ["dispatch", "indirect call, no direct call"];
  if (calls === 0 && f.n <= 12 && loads >= 1 && stores === 0) return ["accessor", "no call, loads only, <=12 insns"];
  if (calls === 0 && f.n <= 12 && stores >= 1) return ["mutator", "no call, stores only, <=12 insns"];
  if (calls === 0 && cmps >= 1 && f.n <= 16) return ["predicate", "no call, compare-only, <=16 insns"];
  if (calls === 1 && isB(last)) return ["forwarder", "one call then tail branch"];
  if (calls >= 8) return ["orchestrator", ">=8 direct calls"];
  if (f.n >= 200) return ["large-body", ">=200 insns"];
  // The catch-all is split by size, because "worker" over two thirds of the bucket says nothing. Call density stays as the
  // tie-breaker between a small helper and a mid-size routine.
  if (f.n <= 12) return ["small-worker", "<=12 insns with calls"];
  if (f.n <= 60) return ["mid-worker", "13-60 insns with calls"];
  return ["worker", ">60 insns with calls"];
}

const rows = [["start", "insns", "form", "why"]];
const counts = new Map();
for (const f of fns) {
  if (labelled.has(f.s)) continue;
  const [form, why] = classify(f);
  counts.set(form, (counts.get(form) || 0) + 1);
  rows.push([f.s, String(f.n), form, why]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`unlabelled ${rows.length - 1} functions classified -> ${OUT.split("/").pop()}`);
console.log([...counts].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
