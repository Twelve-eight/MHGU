// literal-counts-check.mjs — "two independent readers must agree with each other AND with the published number".
//
// History (2026-11-09), because this file has already been wrong once:
//   * The session published "298 sites" for em[0x1404] and "exactly 3 writers" for em[0x73e0]. The MCP
//     literal_loads tool under-reports even over the whole text (0x1404: 298 vs 301, 0xba44: 126 vs 127),
//     and a writer census missed the strh lane and pre-index writeback. No step compared two readers
//     before a number reached a document.
//   * The first version of THIS file then "fixed" isMovw by requiring cond == 0xE and re-pinned 0x73e0 to
//     634. That was wrong: A32 MOVW carries a condition field, and `disasm 0xe90998` prints
//     `movweq r0, #0x73e0`, `0xe05050` prints `movwne r0, #0x73e0`. Conditional MOVW materialises the
//     constant just as well. The only invalid condition value is 0xF, which is not a condition at all
//     but the unconditional/coprocessor space.
// So both readers now accept cond 0x0..0xE and reject 0xF, and the mutant test below proves the gate can
// actually fail instead of merely printing.
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
const condOf = (w) => (w >>> 28) & 0xF;
// A32 MOVW: cond 0011 0000 imm4 Rd imm12. Any cond except 0xF, Rd < 15 (Rd=15 is not a register).
const isMovw = (w) => condOf(w) !== 0xF && (w & 0x0FF00000) === 0x03000000 && ((w >>> 20) & 1) === 0 && (w & 0xF) < 15;
const movwVal = (w) => (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0;
function readerA(c) {
  const out = [];
  for (let v = TEXT_START; v < TEXT_END; v += 4) {
    const w = rd32(v);
    if (isMovw(w) && movwVal(w) === c) out.push(v);
  }
  return out;
}

// ---- reader B: raw byte search for every legal encoding --------------------------------------
// 15 condition codes (0x0..0xE; 0xF is never a conditional MOVW) x 15 destination registers.
// The search is over the file bytes, so it must also enforce 4-byte alignment: an unaligned hit would be
// a phantom site that reader A cannot see.
function readerB(c) {
  const imm4 = (c >>> 12) & 0xF, imm12 = c & 0xFFF;
  const found = new Set();
  for (let cond = 0; cond < 15; cond++) {
    for (let rd = 0; rd < 15; rd++) {
      const word = (((cond << 28) | 0x03000000 | (imm4 << 16) | (rd << 12) | imm12) >>> 0);
      const pat = Buffer.alloc(4);
      pat.writeUInt32LE(word, 0);
      let p = 0;
      while ((p = buf.indexOf(pat, p)) >= 0) {
        if (p % 4 === 0) {                  // aligned; flat = vaddr + 0x100 and 0x100 is a multiple of 4
          const v = p - 0x100;
          if (v >= TEXT_START && v < TEXT_END) found.add(v);
        }
        p++;
      }
    }
  }
  return [...found].sort((a, b) => a - b);
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---- control: a constant with a known conditional materialisation must be found by both ----------
// 0x73e0 has movweq at 0xe90998 and movwne at 0xe05050. If either reader stops honouring the cond field
// it will drop these and the two readers will disagree -> the gate fails. This is the regression that the
// first version of this file introduced and did not detect.
{
  const a = readerA(0x73e0), b = readerB(0x73e0);
  const hasEq = a.includes(0xe90998), hasNe = a.includes(0xe05050);
  console.log(`SELFTEST conditional movw visible: movweq@0xe90998=${hasEq} movwne@0xe05050=${hasNe}`);
  if (!hasEq || !hasNe) { console.log("FAIL a reader dropped the condition field"); process.exit(1); }
  console.log(`SELFTEST readers agree on 0x73e0: ${same(a, b) ? "PASS" : "FAIL"} (A=${a.length} B=${b.length})`);
  if (!same(a, b)) process.exit(1);
}

// ---- mutant: a deliberately broken reader must be detected --------------------------------------
// Neither decoder-side mutation tried here was a no-op-free choice: dropping the Rd<15 guard and dropping
// the bit-20 test both changed nothing on this image, because no word of this shape exercises them. The
// mutation that matters is the one that actually happened: restricting the search to cond == 0xE, which is
// exactly how this file's first version silently dropped the four conditional materialisations of 0x73e0.
{
  const brokenB = (c) => {
    const imm4 = (c >>> 12) & 0xF, imm12 = c & 0xFFF, found = new Set();
    for (let rd = 0; rd < 15; rd++) {
      const pat = Buffer.alloc(4);
      pat.writeUInt32LE((0xE3000000 | (imm4 << 16) | (rd << 12) | imm12) >>> 0, 0);
      let p = 0;
      while ((p = buf.indexOf(pat, p)) >= 0) { if (p % 4 === 0) { const v = p - 0x100; if (v >= TEXT_START && v < TEXT_END) found.add(v); } p++; }
    }
    return [...found].sort((a, b) => a - b);
  };
  const m = brokenB(0x73e0), a = readerA(0x73e0);
  if (same(m, a)) { console.log("FAIL mutant test: the cond==0xE-only search matched reader A, the comparison is blind"); process.exit(1); }
  console.log(`SELFTEST mutant (cond==0xE only) detected: mutant=${m.length} vs readerA=${a.length}`);
}

if (!fs.existsSync(TSV)) { console.log(`FAIL pinned table missing: ${TSV}`); process.exit(1); }

let failures = 0;
const rows = fs.readFileSync(TSV, "utf8").split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l && !l.startsWith("#"));
const header = rows.shift();
if (!/const\tpinned\tnote/.test(header)) { console.log(`FAIL unexpected header: ${header}`); process.exit(1); }
for (const line of rows) {
  const [cs, ps, ...rest] = line.split("\t");
  const c = Number(cs), pinned = Number(ps);
  const a = readerA(c), b = readerB(c);
  const agree = same(a, b), match = a.length === pinned;
  if (agree && match) {
    console.log(`PASS 0x${c.toString(16)}: ${a.length} sites, both readers agree, equals the pinned count`);
  } else {
    failures++;
    console.log(`FAIL 0x${c.toString(16)}: readerA=${a.length} readerB=${b.length} pinned=${pinned}`);
    if (!agree) {
      console.log(`     onlyA: ${a.filter((v) => !b.includes(v)).slice(0, 8).map((v) => "0x" + v.toString(16)).join(" ")}`);
      console.log(`     onlyB: ${b.filter((v) => !a.includes(v)).slice(0, 8).map((v) => "0x" + v.toString(16)).join(" ")}`);
    }
    if (!match) console.log(`     the published number is stale: recompute it, correct the document, then re-pin`);
  }
  if (rest.length) console.log(`     note: ${rest.join("\t")}`);
}
console.log(failures ? `LITERAL-COUNTS: ${failures} failure(s)` : "LITERAL-COUNTS: all pinned counts reproduce");
process.exit(failures ? 1 : 0);
