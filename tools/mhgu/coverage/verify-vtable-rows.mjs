// verify-vtable-rows.mjs — check that every vtable attribution is mechanically true for its own slot.
//
// The retile agent reported that attr-vtable-retile mixes three keying modes and only `vtable V slot N` is a
// function-level fact: the slot word must equal the function start. A row that fails this is a class-block attribution,
// not a function attribution, and must not count as direct evidence for that function. This pass decides per row.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-fixed.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-verified.tsv");
const BLOCK = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-classblock.tsv");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;

let ok = 0, slotMismatch = 0, noSlot = 0;
const rowsOk = [["start", "label", "conf", "evidence"]];
const rowsBlock = [["start", "label", "conf", "evidence"]];
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, label, conf, ev] = l.split("\t");
  const m = /vtable (0x[0-9a-f]+) slot (\d+)/.exec(ev || "");
  if (!m) { noSlot++; rowsBlock.push([start, label, "B", `${ev} [no slot address: class-block keying, not a function fact]`]); continue; }
  const vt = parseInt(m[1], 16), slot = Number(m[2]);
  const word = rd(vt + slot * 4);
  if (word === parseInt(start, 16)) { ok++; rowsOk.push([start, label, conf, ev]); }
  else { slotMismatch++; rowsBlock.push([start, label, "B", `${ev} [slot word ${"0x" + word.toString(16)} != start]`]); }
}
fs.writeFileSync(OUT, rowsOk.map((r) => r.join("\t")).join("\n") + "\n");
fs.writeFileSync(BLOCK, rowsBlock.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`slot-verified ${ok}, slot mismatch ${slotMismatch}, no slot address ${noSlot}`);
console.log(`wrote attr-vtable-verified.tsv (${ok}) and attr-vtable-classblock.tsv (${slotMismatch + noSlot})`);
