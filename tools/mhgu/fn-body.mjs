// fn-body.mjs - the true extent of one function in the MHGU main image, and who owns a given address.
//
// Why this exists (W6-P126): both `functions-retile.csv.gz`'s `strings` column and
// `docs/analysis/code/inventory/stringxref.tsv` attribute a string load to the *nearest preceding function
// start* (`push {..., lr}` or a bl target). A push-less leaf getter reached through a vtable has no bl site,
// so it is nobody's start, and its string is credited to the function before it. 6 of the 7 string-citing
// rows in the W6-P123 conflict set were wrong that way; `0x69eb18` would have been re-approved by the
// W6-P124 gate from an `areaseldat` load that sits 0x1C past its `pop`.
//
// The body is not `[start, next start)` either: functions routinely have several `pop {..., pc}` exits and
// straightforward linear clamping truncates them at the first one. This walks the CFG from the entry and
// keeps what is reachable.
//
//   node MHGU/tools/mhgu/fn-body.mjs --at 0x69eb18
//   node MHGU/tools/mhgu/fn-body.mjs --owns 0x69eb18 0x69eb7c      -> "outside" / "inside"
//   node MHGU/tools/mhgu/fn-body.mjs --check                       -> the W6-P126 control set
//
// Exit codes: 0 = as asked, 1 = --check found a mismatch.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const FLAT = "G:/omp works/MHGU/main.140.flat.bin"; // sha256 a8cfb11465470184 (shared with stringxref.mjs)
const buf = fs.readFileSync(FLAT);
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const TEXT_END = 0x13f1dec;
const inText = (v) => v >= 0x100 && v < TEXT_END;

// Only UNCONDITIONAL returns (cond === 0xe) end fallthrough; a conditional `bxeq lr` (`0x012fff1e`,
// e.g. 0x16364 in 0x1635c) falls through to `next` when the condition is false (W6-P133b).
// Single-register `pop {pc}` (`0xe49df004`) has 0 hits in .text (verified 2026-11-06) and is included for completeness.
const isExit = (w) =>
  ((w & 0xffff8000) >>> 0) === 0xe8bd8000 ||     // pop {..., pc} (unconditional)
  (w >>> 0) === 0xe49df004 ||                    // pop {pc} = ldr pc, [sp], #4 (unconditional; 0 hits in .text)
  ((w & 0xfffffff0) >>> 0) === 0xe12fff10 ||     // bx rN (incl. bx lr, unconditional; excludes blx rN 0xe12fff30
                                                 // and conditional bx<cond> rN, which truncated 1,150 functions)
  (w >>> 0) === 0xe1a0f00e ||                    // mov pc, lr (unconditional)
  ((w & 0xfffff000) >>> 0) === 0xe59ff000;       // ldr pc, [pc, #imm] (unconditional jump stub, Rd = pc)
const isPrologue = (v) => inText(v) && (((rd(v) & 0xffff4000) >>> 0) === 0xe92d4000);

// Every place the image can enter code: bl targets, plus literal words that point into .text.
function entryPoints() {
  const starts = new Set();
  for (let a = 0x100; a < TEXT_END; a += 4) {
    const w = rd(a);
    if (((w >>> 25) & 7) === 5 && ((w >>> 24) & 1) === 1 && ((w >>> 28) & 0xf) !== 0xf) {
      let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
      const t = (a + 8 + (o << 2)) >>> 0;
      if (inText(t)) starts.add(t);
    }
    // Two prologue rules: a word that POINTS at a prologue, and a prologue AT this address. The second one
    // was missing until 2026-11-06 - a push {...lr} reached only through a vtable or an indirect call is a
    // function start whether or not anything points at it, and without it `owner()` skipped past such a
    // function to an ancestor (measured on 0x1e77b4, which the publisher's table lists as a start).
    if (isPrologue(a)) starts.add(a);
    if (inText(w) && (w & 3) === 0 && isPrologue(w)) starts.add(w);
  }
  return [...starts].sort((x, y) => x - y);
}

function bodyOf(s, hard) {
  const seen = new Set([s]), stack = [s];
  const add = (v) => { if (v >= s && v < hard && inText(v) && !seen.has(v)) { seen.add(v); stack.push(v); } };
  while (stack.length) {
    const a = stack.pop();
    const w = rd(a), next = a + 4;
    if (((w >>> 25) & 7) === 5) {
      let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
      const tgt = (a + 8 + (o << 2)) >>> 0;
      const link = (w >>> 24) & 1, cond = w >>> 28;
      if (link || cond === 0xf) { add(next); continue; }   // BL / BLX: control returns here
      add(tgt);
      if (cond !== 0xe) add(next);                          // conditional: also falls through
      continue;
    }
    if (isExit(w)) continue;
    add(next);
  }
  return [...seen].sort((x, y) => x - y);
}

// A hard cap keeps a runaway walk from crossing into unrelated code: the next known entry point.
function capFor(s, starts) {
  let lo = 0, hi = starts.length - 1, cap = TEXT_END;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] > s) { cap = starts[m]; hi = m - 1; } else lo = m + 1; }
  return cap;
}

const hex = (n) => "0x" + n.toString(16);

// Controls from the W6-P123 adjudication: [function start, address that must be OUTSIDE its body, why].
const OUTSIDE = [
  ["0x69eb18", "0x69eb7c", "areaseldat load lives in the leaf getter 0x69eb78"],
  ["0x69c258", "0x69d5c4", "areaacttbl load lives in 0x69d5f0"],
  ["0x381738", "0x38194c", "cResourceSample load lives in 0x3818cc"],
  ["0x3918f8", "0x391d64", "cSetEmMain load lives in 0x391d34"],
  ["0x191bd4", "0x191c10", "deco load lives in 0x191bfc"],
];
// And a control the other way: a load that really is inside the body it is credited to.
const INSIDE = [
  ["0x3d15a4", "0x3d16d0", "strcmp over [WORK0..7]: a middle instruction of its own body"],
  ["0x1635c", "0x16368", "instruction after conditional bxeq lr (0x012fff1e at 0x16364): must fall through"],
];

const starts = entryPoints();
export { bodyOf, capFor, starts, inText, rd };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const at = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };

if (!isMain) { /* imported: expose the primitive only */ }
else if (process.argv.includes("--check")) {
  let bad = 0;
  for (const [f, site, why] of OUTSIDE) {
    const s = parseInt(f, 16), body = bodyOf(s, capFor(s, starts)), set = new Set(body);
    const ok = !set.has(parseInt(site, 16));
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${f}: ${site} must be outside (${why}) -> ${ok ? "outside" : "INSIDE"}; body ${hex(body[0])}..${hex(body[body.length - 1] + 4)} (${body.length} insns)`);
  }
  for (const [f, site, why] of INSIDE) {
    const s = parseInt(f, 16), body = bodyOf(s, capFor(s, starts)), set = new Set(body);
    const ok = set.has(parseInt(site, 16));
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${f}: ${site} must be inside (${why}) -> ${ok ? "inside" : "OUTSIDE"}`);
  }
  console.log(bad ? `FN-BODY CHECK: ${bad} mismatch(es)` : "FN-BODY CHECK: all pass");
  process.exit(bad ? 1 : 0);
}

const atArg = at("--at"), ownsArg = process.argv.indexOf("--owns");
if (!isMain) { /* imported: bodyOf/capFor/starts are the API */ }
else if (ownsArg >= 0) {
  const s = parseInt(process.argv[ownsArg + 1], 16), site = parseInt(process.argv[ownsArg + 2], 16);
  const body = bodyOf(s, capFor(s, starts));
  console.log(`body ${hex(s)}..${hex(body[body.length - 1] + 4)} (${body.length} insns); ${hex(site)} is ${body.includes(site) ? "inside" : "outside"}`);
} else if (atArg) {
  const s = parseInt(atArg, 16);
  const body = bodyOf(s, capFor(s, starts));
  console.log(`start ${hex(s)}  end ${hex(body[body.length - 1] + 4)}  insns ${body.length}  prologue ${isPrologue(s)}  cap ${hex(capFor(s, starts))}`);
} else {
  console.log("usage: --at <vaddr> | --owns <fn> <addr> | --check");
}
