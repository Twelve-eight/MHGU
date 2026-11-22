// h1-writers — close Q43's H1: is 0x76154 the ONLY writer of the (state,variant) bytes?
//
//   node MHGU/tools/mhgu/h1-writers.mjs [image]
//
// Method (a whole-image scan, not "walk the callers of the one setter I know"):
//   1. every `movw rX, #0x73e0` anywhere in .text (the state field offset),
//   2. within the next 12 instructions, every `strb rD, [rB, rX]` that uses THAT register as the
//      offset - the exact form the known setter uses at 0x76868/0x76870,
//   3. also `movw rX, #0x73e1` for the variant byte,
//   4. group the resulting write sites by enclosing function and print them.
//
// A writer outside {0x76154} that stores a byte to em+0x73E0/0x73E1 means the 236/257 model is
// incomplete. Exit 0 always; the caller reads the report.
//
// vaddr = flat - 0x100 (the workspace convention for this image).

import fs from "node:fs";

const IMG = process.argv[2] ?? "MHGU-private/main.140.flat.bin";
const buf = fs.readFileSync(IMG);
const N = Math.floor(buf.length / 4);
const W = (i) => buf.readUInt32LE(i * 4);
// flat_offset = vaddr + 0x100 for this image, so vaddr = flat_offset - 0x100.
// (The first version wrote +0x100, which reported every site 0x200 too high: the known setter's
// store at vaddr 0x76868 came out as 0x76a68 and looked like a second writer.)
const va = (i) => i * 4 - 0x100;
const hex = (n) => "0x" + n.toString(16);

const movwValue = (w) => {
  if ((w & 0xfff00000) >>> 0 !== 0xe3000000) return null; // cond=1110, 0011 0000
  const imm4 = (w >>> 16) & 0xf;
  const rd = (w >>> 12) & 0xf;
  const imm12 = w & 0xfff;
  return { rd, value: (imm4 << 12) | imm12 };
};
const strbReg = (w) => {
  // STRB (immediate=0) with P=1,U=1,B=1: fixed bits are 31-20 = 0xE7C and 11-4 = 0;
  // Rn (19-16), Rd (15-12) and Rm (3-0) are the variable fields.
  // (The first version masked 0xFFFFF000, which keeps Rn/Rd, so it matched nothing: e7c92000.)
  if ((w >>> 20) !== 0xe7c || (w & 0xff0) !== 0) return null;
  return { rd: (w >>> 12) & 0xf, rn: (w >>> 16) & 0xf, rm: w & 0xf };
};

// Extra fields let the caller run a NEGATIVE control, e.g. H1_FIELD=0x73ff must find zero writes.
// Without such a control "no second writer" is indistinguishable from "the decoder matches nothing",
// which is exactly how the first version of this script returned 0 (mask 0xFFFFF000 kept Rn/Rd).
const FIELDS = new Map([[0x73e0, "state"], [0x73e1, "variant"]]);
for (const extra of (process.env.H1_FIELD ?? "").split(",").filter(Boolean)) {
  FIELDS.set(parseInt(extra, 16), "probe-" + extra);
}
const writes = [];
let movwSites = 0;

for (let i = 0; i < N; i++) {
  const m = movwValue(W(i));
  if (!m || !FIELDS.has(m.value)) continue;
  movwSites++;
  for (let k = 1; k <= 12 && i + k < N; k++) {
    const w = W(i + k);
    // the offset register must not be overwritten before the store
    const mv = movwValue(w);
    if (mv && mv.rd === m.rd) break;
    const s = strbReg(w);
    if (s && s.rm === m.rd) {
      writes.push({ field: FIELDS.get(m.value), movw: va(i), strb: va(i + k), rn: s.rn, rd: s.rd, dist: k });
      break;
    }
  }
}

// Group by enclosing write address, then by rough function cluster.
const byFn = new Map();
for (const w of writes) {
  const k = w.strb;
  byFn.set(k, w);
}
const known = 0x76868;
console.log(`image ${IMG}: ${hex(buf.length)} bytes, ${movwSites} movw #0x73e0/#0x73e1 site(s)`);
console.log(`writes found: ${writes.length}`);
console.log(`\n${"strb".padEnd(12)}${"field".padEnd(9)}${"base reg".padEnd(10)}movw site`);
for (const w of writes.sort((a, b) => a.strb - b.strb)) {
  const mark = w.strb === known || w.strb === 0x76870 ? "  <-- the known setter (0x76154)" : "";
  console.log(`${hex(w.strb).padEnd(12)}${w.field.padEnd(9)}r${w.rn}`.padEnd(31) + `${hex(w.movw)}${mark}`);
}
// --- second shape: the same field reached as [base, #0x3e0] where base was built as em + 0x7000 ---
// Reported, not resolved: a store through a dereferenced pointer is indistinguishable statically from
// one through em+0x7000 without a full provenance pass.
let immSites = 0, addSites = 0, addFedStore = 0;
const add7000 = [];
for (let i = 0; i < N; i++) {
  const w = W(i);
  if ((w >>> 20) === 0xe5c && ((w & 0xfff) === 0x3e0 || (w & 0xfff) === 0x3e1)) immSites++;
  if ((w >>> 20) === 0xe28) {
    const imm = w & 0xfff;
    const rot = ((imm >>> 8) & 0xf) * 2;
    const v = rot === 0 ? imm & 0xff : (((imm & 0xff) >>> rot) | ((imm & 0xff) << (32 - rot))) >>> 0;
    if (v >>> 0 === 0x7000) { addSites++; add7000.push({ i, rd: (w >>> 12) & 0xf }); }
  }
}
for (const a of add7000) {
  for (let k = 1; k <= 12 && a.i + k < N; k++) {
    const w = W(a.i + k);
    if ((w >>> 20) === 0xe5c && (w & 0xfff) === 0x3e0 && ((w >>> 16) & 0xf) === a.rd) { addFedStore++; break; }
  }
}
console.log(`second shape: ${immSites} strb [rB,#0x3e0|0x3e1] site(s); ${addSites} 'add rD,rN,#0x7000' site(s); ${addFedStore} of those feed such a store`);
console.log("  -> a nonzero add-fed count would be a further writer; 0 means this shape contributes none, and the imm sites must be read by hand to see whose +0x3e0 they touch.");

const outside = writes.filter((w) => w.strb !== 0x76868 && w.strb !== 0x76870);
console.log(`\noutside the known setter: ${outside.length}`);
if (outside.length) {
  console.log("These are candidates for a SECOND writer. Each needs its enclosing function read before it counts.");
  const set = new Set(outside.map((w) => w.strb));
  fs.writeFileSync("G:/tmp/h1-writers.json", JSON.stringify([...set].map(hex), null, 0));
}
