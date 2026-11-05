// stringxref.mjs — rebuild string references from the code itself, instead of trusting the strings column.
//
// Two reference forms exist in this binary and the first version only handled one:
//   A. absolute: the literal word IS the string address (rodata)
//   B. delta:    the literal word is a small offset; `add rD, pc, rX` turns it into the address
// The pilot measured the miss: 4,717 functions use form B, 2,420 of them were absent from the first pass. Both forms
// need register tracking, so this version follows one register at a time inside a basic block and drops the state at
// every branch.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { bodyOf, starts } from "../fn-body.mjs";

const ROOT = "G:/omp works/MHGU";
const OUT = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_END = 0x13f1dec;
const IMG_END = buf.length - 0x100;
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const byte = (v) => buf[v + 0x100];
const inText = (v) => v > 0x100 && v < TEXT_END;
const inRodata = (v) => v > TEXT_END && v < IMG_END - 8;
const isAscii = (b) => b >= 0x20 && b < 0x7f;

const readStr = (v) => {
  if (!inRodata(v)) return "";
  if (byte(v - 1) !== 0) return ""; // strings start after a NUL; this kills data-blob hits
  let n = 0;
  while (n < 96 && isAscii(byte(v + n))) n++;
  if (n < 4 || byte(v + n) !== 0) return "";
  return buf.slice(v + 0x100, v + 0x100 + n).toString("latin1");
};

const fns = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),/.exec(l);
  if (m) fns.push({ s: parseInt(m[1], 16), e: parseInt(m[2], 16) });
}

const allStarts = [...new Set([...starts, ...fns.map((f) => f.s)])].sort((a, b) => a - b);
const capFor = (s) => { let lo = 0, hi = allStarts.length - 1, cap = 0x13f1dec; while (lo <= hi) { const m = (lo + hi) >> 1; if (allStarts[m] > s) { cap = allStarts[m]; hi = m - 1; } else lo = m + 1; } return cap; };

const rows = [["start", "string", "via", "site"]];
let withRefs = 0, viaAbs = 0, viaDelta = 0, viaTable = 0;
for (const f of fns) {
  const set = new Set();
  const delta = new Map(); // reg -> literal value (possible pc bias)
  const sites = new Map(); // string -> first referencing instruction
  const viaOf = new Map(); // string -> "code" wins over "code-gap"
  // The body is the CFG-reachable set, not [f.s, f.e): f.e was "the next known start", so a push-less
  // leaf getter had its references charged to the function before it (W6-P126).
  const cap = capFor(f.s, starts);
  const body = bodyOf(f.s, cap);
  // Everything between this row's own exit and the next known start is code that belongs to NEITHER this
  // row nor any other entry (a vtable-reached leaf, typically). Its references are real but cannot be
  // attributed to a function, so they are kept and marked `code-gap` instead of being charged to the
  // function above (W6-P126) or dropped.
  const inBody = new Set(body);
  const gap = [];
  for (let a = f.s; a + 4 <= cap; a += 4) if (!inBody.has(a)) gap.push(a);
  for (const [v, via] of [...body.map((x) => [x, "code"]), ...gap.map((x) => [x, "code-gap"])]) {
    const w = rd(v);
    // branch or bl: basic block ends, register state is gone
    if (((w >>> 25) & 7) === 5 || (w >>> 24) === 0xea || (w >>> 24) === 0xeb) { delta.clear(); continue; }
    if ((w >>> 16) === 0xe59f) {
      const rdN = (w >>> 12) & 0xf;
      const L = v + 8 + (w & 0xfff);
      if (L + 4 > IMG_END) continue;
      const V = rd(L);
      const s = readStr(V);
      if (s) { set.add(s); viaAbs++; }
      else if (false) {
        // data table: entries that point at ASCII strings
        for (let k = 0; k < 256; k++) {
          const E = rd(V + k * 4);
          if (!(E > TEXT_END && E < IMG_END)) break;
          const s2 = readStr(E);
          if (s2) { set.add(s2); viaTable++; }
        }
      } else {
        // a pc bias can be any 32-bit value (often negative, stored two's complement); keep it signed and let the
        // add resolve it. Rejecting large values silently dropped 29% of member-name references.
        const signed = V | 0;
        if (Math.abs(signed) < 0x4000000) delta.set(rdN, signed);
        // a pc bias can itself land inside rodata, which used to send it down the table-hop branch and lose it, so the
        // value is always kept as a candidate delta as well
        if (Math.abs(V | 0) < 0x10000000) delta.set(rdN, V | 0);
      }
      continue;
    }
    // add rD, rM, pc  (Rn is the operand register, Rm = 15) -- the mirror of add rD, pc, rM and just as common
    if ((w & 0x0fe00000) === 0x00800000 && (w & 0xf) === 0xf) {
      const rnN = (w >>> 16) & 0xf;
      if (delta.has(rnN)) {
        const t = (v + 8 + delta.get(rnN)) >>> 0;
        const s2 = readStr(t);
        if (s2) { set.add(s2); viaDelta++; }
        delta.delete(rnN);
      }
      continue;
    }
    if ((w >>> 16) === 0xe08f) { // add rD, pc, rM
      const rm = w & 0xf;
      if (!delta.has(rm)) continue;
      const t = (v + 8 + delta.get(rm)) >>> 0;
      const s = readStr(t);
      if (s) { set.add(s); if (!viaOf.has(s) || via === "code") { viaOf.set(s, via); sites.set(s, v); } if (via === "code") viaDelta++; }
      delta.delete(rm);
    }
  }
  if (set.size) {
    withRefs++;
    for (const s of set) {
      const via = viaOf.get(s) ?? "code";
      // A gap reference has no owning function: emitting the enclosing row's start would let a consumer that
      // ignores `via` read it as attribution - the very failure this pass exists to stop.
      rows.push([via === "code" ? `0x${f.s.toString(16)}` : "", s.replace(/[\t"]/g, " "), via, sites.has(s) ? `0x${sites.get(s).toString(16)}` : ""]);
    }
  }
}
// Overlapping caps made the same reference show up in two rows: measured 2026-11-06, 92,519 gap rows held only
// 13,501 distinct ones. Dedupe before anything reports or writes a count (W6-P132).
{
  const seen = new Set();
  const keep = [rows[0]];
  for (const r of rows.slice(1)) {
    const k = r.join("\t");
    if (seen.has(k)) continue;
    seen.add(k);
    keep.push(r);
  }
  rows.length = 0;
  rows.push(...keep);
}

const WRITE = process.argv.includes("--write");
const GAP_OUT = OUT.replace(/\.tsv$/, ".gap.tsv");
const codeRows = rows.filter((r, i) => i === 0 || r[2] === "code");
const gapRows = [rows[0], ...rows.filter((r, i) => i > 0 && r[2] === "code-gap")];
if (WRITE) {
  fs.writeFileSync(OUT, codeRows.map((r) => r.join("\t")).join("\n") + "\n");
  fs.writeFileSync(GAP_OUT, gapRows.map((r) => r.join("\t")).join("\n") + "\n");
}
console.log(`functions with refs: ${withRefs}/${fns.length} (${((100 * withRefs) / fns.length).toFixed(1)}%)`);
console.log(`attributed rows (via=code): ${codeRows.length - 1}; unattributable gap rows: ${gapRows.length - 1} -> ${path.basename(GAP_OUT)}`);
// Controls from the W6-P123 adjudication. A reference whose site sits past the credited function's own exit
// must NOT be listed under that function as `code`.
const ctl = [
  ["0x3818cc", "cResourceSample", "0x38194c"],
  ["0x15004c", "cResourceSample", "0x150dc8"],
];
let bad = 0;
for (const [fn, str, site] of ctl) {
  const hit = codeRows.find((r) => r[0] === fn && r[1] === str && r[2] === "code");
  const ok = hit && hit[3] === site;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${fn} owns "${str}" at ${hit ? hit[3] : "no row"} (want ${site})`);
}
for (const [fn, str] of [["0x69eb18", "areaseldat"], ["0x191bd4", "deco"], ["0x381738", "cResourceSample"]]) {
  const ok = !codeRows.some((r) => r[0] === fn && r[1] === str);
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${fn} no longer claims "${str}"`);
}
console.log(bad ? `STRINGXREF CHECK: ${bad} mismatch(es)` : "STRINGXREF CHECK: all pass");
if (!WRITE) console.log("(dry: pass --write to regenerate stringxref.tsv and stringxref.gap.tsv)");
if (bad) process.exit(1);
console.log(`via absolute ${viaAbs}, via pc-delta ${viaDelta}, via table ${viaTable}`);
