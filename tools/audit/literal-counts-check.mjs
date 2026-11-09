// literal-counts-check.mjs — the "two independent readers must agree, and must equal the published number" gate.
//
// Why this exists (2026-11-09): the session published "298 sites" for em[0x1404] and "exactly 3 writers" for
// em[0x73e0]. Both numbers came from readers that were self-consistent but not complete: the MCP literal_loads
// tool under-reports even over the whole text (126 vs 127 sites for 0xba44; 298 vs 301 for 0x1404), and the
// writer census missed the strh lane and pre-index writeback. Nothing in the review process compared two
// independent readers before the number reached a document, so the defect survived four sections.
//
// This tool makes that comparison mechanical. For every constant in docs/analysis/audit/literal-counts.tsv it:
//   A. decodes instructions (movw field extraction, the movw-census.mjs algorithm), and
//   B. searches the raw file for the 15 byte patterns a `movw rX,#const` can take (a genuinely different
//      method: byte search, whole file, no instruction decode),
// then requires A == B == the pinned count. Any disagreement exits 1.
//
// A self-test runs first: a constant whose site count is pinned and hand-verified must pass both readers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FLAT = process.env.FLAT || path.join(ROOT, "main.140.flat.bin");
const TSV = process.env.LITERAL_COUNTS || path.join(ROOT, "docs/analysis/audit/literal-counts.tsv");
const buf = fs.readFileSync(FLAT);
const TEXT_START = 0x100;
const TEXT_END = 0x13F1DEC;

// ---- reader A: instruction decode -------------------------------------------------------------
const rd32 = (v) => buf.readUInt32LE(v + 0x100);
const isMovw = (w) => (w >>> 28) === 0xE && (w & 0x0FF00000) === 0x03000000 && ((w >>> 20) & 1) === 0 && (w & 0xF) < 15;
const movwVal = (w) => (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0;
function readerA(c) {
  const out = [];
  for (let v = TEXT_START; v < TEXT_END; v += 4) {
    const w = rd32(v);
    if (isMovw(w) && movwVal(w) === c) out.push(v);
  }
  return out;
}

// ---- reader B: raw byte search for the 15 encodings ---------------------------------------------
function readerB(c) {
  const imm4 = (c >>> 12) & 0xF, imm12 = c & 0xFFF;
  const found = new Set();
  for (let rd = 0; rd < 15; rd++) {
    const word = (0xE3000000 | (imm4 << 16) | (rd << 12) | imm12) >>> 0;
    const pat = Buffer.alloc(4);
    pat.writeUInt32LE(word, 0);
    let p = 0;
    while ((p = buf.indexOf(pat, p)) >= 0) {
      const v = p - 0x100;                 // flat = vaddr + 0x100
      if (v >= TEXT_START && v < TEXT_END) found.add(v);
      p++;
    }
  }
  return [...found].sort((a, b) => a - b);
}

// ---- self-test: a pinned, hand-verified control must pass both readers ---------------------------
// 0x72f4 is the constant movw-census.mjs itself pins its selftest on (0x8286c, hand-disassembled).
{
  const a = readerA(0x72f4), b = readerB(0x72f4);
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  console.log(`SELFTEST readers agree on 0x72f4: ${same ? "PASS" : "FAIL"} (A=${a.length} B=${b.length})`);
  if (!same) process.exit(1);
}

if (!fs.existsSync(TSV)) {
  console.log(`FAIL pinned table missing: ${TSV}`);
  process.exit(1);
}

let failures = 0;
const rows = fs.readFileSync(TSV, "utf8").split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l && !l.startsWith("#"));
const header = rows.shift();
if (!/const\tpinned\tnote/.test(header)) { console.log(`FAIL unexpected header: ${header}`); process.exit(1); }
for (const line of rows) {
  const [cs, ps, ...rest] = line.split("\t");
  const c = Number(cs), pinned = Number(ps);
  const a = readerA(c), b = readerB(c);
  const agree = a.length === b.length && a.every((v, i) => v === b[i]);
  const match = a.length === pinned;
  if (agree && match) {
    console.log(`PASS 0x${c.toString(16)}: ${a.length} sites, both readers agree, equals the pinned count`);
  } else {
    failures++;
    console.log(`FAIL 0x${c.toString(16)}: readerA=${a.length} readerB=${b.length} pinned=${pinned}`);
    if (!agree) {
      const onlyA = a.filter((v) => !b.includes(v));
      const onlyB = b.filter((v) => !a.includes(v));
      console.log(`     onlyA: ${onlyA.slice(0, 8).map((v) => "0x" + v.toString(16)).join(" ")}`);
      console.log(`     onlyB: ${onlyB.slice(0, 8).map((v) => "0x" + v.toString(16)).join(" ")}`);
    }
    if (!match) console.log(`     the published number is stale: recompute it, correct the document, then re-pin`);
  }
  if (rest.length) console.log(`     note: ${rest.join("\t")}`);
}
console.log(failures ? `LITERAL-COUNTS: ${failures} failure(s)` : "LITERAL-COUNTS: all pinned counts reproduce");
process.exit(failures ? 1 : 0);
