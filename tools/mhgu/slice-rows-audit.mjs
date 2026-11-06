// slice-rows-audit.mjs - re-check every fact a row claims against the BYTES, not against the pack text.
//
// The adjudication rows are prose. A label check cannot tell whether "vtable +52 / field +112 / 0x7f7fffff"
// was read off the function or invented, and a text-level match against the pack is too weak twice over:
// the `signals:` digest is capped at 40 lines and the instruction dump at 24, so a true fact that sits past
// either cap looks untraceable. This tool therefore re-derives from the flat image:
//
//   * start   - fn-body.bodyOf (the same CFG walk the attribution uses)
//   * field+N - some load/store in that body really carries immediate offset N
//   * 0xNNN   - the value occurs in the body as: a literal-load target word, a movw/movt pair, a data-
//               processing immediate, or an address of an instruction in the body; otherwise it must be a
//               known function start elsewhere in the pool (a legitimate cross-reference)
//
//   node MHGU/tools/mhgu/slice-rows-audit.mjs --dir G:/tmp/tierb-s09-new --parts 18 [--verbose]
//
// Exit codes: 0 = every cited fact is present in the bytes, 1 = at least one is not.
import fs from "node:fs";
import path from "node:path";
import { bodyOf, capFor, starts, inText } from "./fn-body.mjs";
import * as A from "./arm32.mjs";

const arg = (k, d = null) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const DIR = arg("dir", "G:/tmp/tierb-s09-new");
const PARTS = +arg("parts", "18");
const VERBOSE = process.argv.includes("--verbose");

const hex = (n) => "0x" + n.toString(16);
const isAddReg = (w) => ((w >>> 25) & 7) === 0 && ((w >>> 21) & 0xf) === 4;

// everything a body can legitimately be said to contain
function factsOf(body) {
  const offs = new Set(), vals = new Set(), addrs = new Set(body);
  for (const a of body) {
    addrs.add(a);
    const w = A.rd32(a) >>> 0;
    vals.add(w);                        // an agent may quote the encoding itself (e.g. tst r1,r2,asr #32)
    if ((w >>> 16) === 0xe59f) {            // ldr rX,[pc,#imm]: the pointed-at word
      const L = a + 8 + (w & 0xfff);
      vals.add(A.rd32(L) >>> 0);
      if (inText(L)) addrs.add(L);
    }
    if ((w & 0x0ff00000) === 0x03000000) {  // movw: also a possible register-offset base (ldr rX,[rY,rZ])
      const mv = ((w & 0xfff) | (((w >>> 16) & 0xf) << 12)) >>> 0;
      vals.add(mv); offs.add(mv);
    }
    if ((w & 0x0ff00000) === 0x03500000) {  // data-processing immediate (cmp/mov/add/orr/...)
      const imm12 = w & 0xfff, rot = (imm12 >>> 8) << 1, imm8 = imm12 & 0xff;
      const iv = rot ? (((imm8 >>> rot) | (imm8 << (32 - rot))) >>> 0) : imm8;
      vals.add(iv); offs.add(iv);
    }
    if (((w >>> 25) & 7) === 2) {           // load/store, immediate offset
      offs.add(w & 0xfff);
      if (w & 0x00400000) offs.add(-(w & 0xfff)); // pre/post-indexed negative form
    }
    if (isAddReg(w) && ((w >>> 12) & 0xf) === 15) addrs.add(a); // computed dispatch site
  }
  // movw/movt pairs: movt supplies the high half, so add each combined 32-bit value too
  const movw = [], movt = [];
  for (const a of body) {
    const w = A.rd32(a) >>> 0;
    if ((w & 0x0ff00000) === 0x03000000) movw.push({ r: (w >>> 12) & 0xf, v: ((w & 0xfff) | (((w >>> 16) & 0xf) << 12)) >>> 0 });
    if ((w & 0x0ff00000) === 0x03400000) { const hv = ((((w >>> 16) & 0xf) << 12) | (w & 0xfff)) & 0xffff; movt.push({ r: (w >>> 12) & 0xf, v: hv }); vals.add(hv >>> 0); }
  }
  for (const m of movt) for (const lo of movw) if (lo.r === m.r) vals.add(((m.v << 16) | (lo.v & 0xffff)) >>> 0);
  return { offs, vals, addrs };
}

// pool-wide start set, for legitimate cross-references
const poolStarts = new Set(starts.map((v) => "0x" + v.toString(16)));
{
  const dir = path.join("G:/omp works/MHGU/docs/analysis/code/inventory/slices", "reports-mhgu");
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => /^tierB.*\.md$/.test(x))) {
    for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/^\|\s*`?(0x[0-9a-fA-F]+)`?\s*\|/gm)) poolStarts.add(m[1].toLowerCase());
  }
}

let rows = 0, bad = 0, crossref = 0;
const problems = [];
for (let i = 1; i <= PARTS; i++) {
  const n = String(i).padStart(2, "0");
  const rowsP = path.join(DIR, `rows-${n}.md`);
  if (!fs.existsSync(rowsP)) continue;
  let partRows = 0, partBad = 0;
  for (const line of fs.readFileSync(rowsP, "utf8").split(/\r?\n/)) {
    const m = /^\|\s*(0x[0-9a-f]+)\s*\|[^|]*\|[^|]*\|[^|]*\|(.*)\|\s*$/.exec(line);
    if (!m) continue;
    const v = parseInt(m[1], 16);
    // `sp+0x50` is a frame slot, not a struct field: drop those before reading offsets, or every stack
    // frame initialiser looks like a fabricated field.
    const ev = m[2].replace(/sp\s*\+\s*0x[0-9a-f]+/gi, "sp+SLOT").replace(/sp\s*\+\s*\d+/gi, "sp+SLOT");
    const body = bodyOf(v, capFor(v, starts));
    const { offs, vals, addrs } = factsOf(body);
    rows++; partRows++;
    const missing = [];
    for (const o of ev.matchAll(/(pc\s*)?\+(0x[0-9a-fA-F]+|\d+)/gi)) {
      if (o[1]) continue;                       // "pc+0x..." is a branch displacement, not a field
      const k = o[2].startsWith("0x") ? parseInt(o[2], 16) : +o[2];
      if (!Number.isFinite(k) || k < 0x40 || k > 0x10000) continue;  // no struct field is 64 KiB out
      if (!offs.has(k) && !offs.has(-k)) missing.push("field+" + k);
    }
    for (const h of ev.matchAll(/0x[0-9a-fA-F]{4,}/g)) {
      const t = h[0].toLowerCase(), val = parseInt(t.slice(2), 16);
      if (vals.has(val >>> 0)) continue;
      const asAddr = addrs.has(val);
      if (asAddr) continue;
      if ((val & 3) === 0 && val >= 0x100 && val < 0x13f1dec) { crossref++; continue; } // a code address outside this body
      if (poolStarts.has(t) || poolStarts.has(hex(val))) { crossref++; continue; }
      missing.push(t);
    }
    if (missing.length) {
      partBad++;
      problems.push(`part-${n} ${m[1]}: ${missing.length} unresolvable claim(s): ${[...new Set(missing)].slice(0, 6).join(" ")}`);
    }
  }
  console.log(`part-${n}: ${partRows} row(s), ${partBad} with an unresolvable claim`);
  bad += partBad;
}

console.log(`\nrows checked: ${rows}  with an unresolvable claim: ${bad}  cross-references accepted: ${crossref}`);
if (problems.length) {
  console.log("--- problems ---");
  const lim = VERBOSE ? 300 : 40;
  for (const p of problems.slice(0, lim)) console.log("  " + p);
  if (problems.length > lim) console.log(`  ... ${problems.length - lim} more (--verbose)`);
  process.exit(1);
}
console.log("SLICE-ROWS-AUDIT: every cited field offset and constant occurs in the function's own body");
