#!/usr/bin/env node
// claims-code.mjs — recompute the code-side claims of ticket W3-MEMBERS from the image.
//
// The seven claims this file settles (ticket items W2-MB1, W2-MB2, W2-MP1, W2-MP2, W2-MP3 plus
// the two collateral ones the same ticket names):
//   1  member[14] size: 98 B (member15.md) vs 6,248 B (member4-17-layout.md) — reader 0x15bd3c
//      and its write twin 0x15bba0, with the nested 470 B record reader/writer inlined.
//   2  member[7] bitstream: 196 bit vs 157 bit — the width function 0x3df1b8 is *executed* here
//      on the caps the reader passes, and the returned widths are summed.
//   3  member[3] 5,440 B block: obj+259,068 vs obj+254,028 — the two `add` immediates that build
//      r1 at 0x14b198..0x14b1a8.
//   4  member-census.md read counts per member — call sites of 0x3df2a8 (bl + tail `b`).
//   5  monster-classes.md: the 0x48698 group's 7 records are in the function at 0x486c8, and the
//      tsv `fn` column is a prologue (the banner states that comparison backwards).
//   6  monster-ai-params.md: 131 NUL-delimited `mParam.` strings vs 134 `mParam.` token hits.
//   7  monster-ai-params.md §4: 225 rows are not 225 `uEm###_00` names.
//
// Everything is read from main.140.flat.bin (flat_off = vaddr + 0x100) and from the documents
// themselves; every claim prints the recomputed value next to the text it checks. Exit code 1 if
// any claim fails, so this file is also the regression check for the edited docs.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = "G:/omp works/MHGU";
const IMG = [
  process.env.FLAT,
  path.join(ROOT, "main.140.flat.bin"),
  "G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin",
].filter(Boolean).find((f) => fs.existsSync(f));
if (!IMG) { console.error("no flat image found"); process.exit(2); }
process.env.FLAT = IMG;
const A = await import(pathToFileURL(path.join(ROOT, "tools/mhgu/arm32.mjs")).href);

const buf = fs.readFileSync(IMG);
const rd32 = (v) => buf.readUInt32LE(v + 0x100);
const hex = (v) => "0x" + v.toString(16);
const n = (v) => v.toLocaleString("en-US");
const sum = (a) => a.reduce((x, y) => x + y, 0);

let fails = 0;
const ok = (m) => console.log(`  PASS ${m}`);
const bad = (m) => { console.log(`  FAIL ${m}`); fails++; };
const doc = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const lines = (rel) => doc(rel).split(/\r?\n/);

console.log(`image ${IMG} (${n(buf.length)} B)`);

// every NUL-delimited printable-ASCII string in the image, vaddr-tagged (flat_off = vaddr + 0x100)
const STRS = (() => {
  const out = [];
  let s = null;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c >= 0x20 && c < 0x7f) { if (s === null) s = i; }
    else { if (s !== null && c === 0) out.push({ v: s - 0x100, str: buf.toString("latin1", s, i) }); s = null; }
  }
  return out;
})();

// ---------------------------------------------------------------- ranges
const STARTS = A.functionStarts();
const START_SET = new Set(STARTS);
function nextPrologue(a) {
  let lo = 0, hi = STARTS.length - 1, res = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (STARTS[m] > a) { res = STARTS[m]; hi = m - 1; } else lo = m + 1; }
  return res;
}
const fnOf = (a) => A.nearestFunctionStart(a, STARTS);
const isPrologue = (a) => START_SET.has(a);

// ---------------------------------------------------------------- ARM interpreter
// Only what 0x3df1b8 needs: DP (mov/mvn/cmp/sub with immediate or immediate-shift),
// movw/movt, b/bl, bx. Anything else throws, so the interpreter can never silently guess.
const RET = 0xffffff00;
function condHolds(c, f) {
  switch (c) {
    case 0x0: return f.z === 1; case 0x1: return f.z === 0;
    case 0x2: return f.c === 1; case 0x3: return f.c === 0;
    case 0x4: return f.nn === 1; case 0x5: return f.nn === 0;
    case 0x6: return f.v === 1; case 0x7: return f.v === 0;
    case 0x8: return f.c === 1 && f.z === 0; case 0x9: return f.c === 0 || f.z === 1;
    case 0xa: return f.nn === f.v; case 0xb: return f.nn !== f.v;
    case 0xc: return f.z === 0 && f.nn === f.v; case 0xd: return f.z === 1 || f.nn !== f.v;
    case 0xe: return true; default: return false;
  }
}
const ror32 = (v, r) => (r === 0 ? v >>> 0 : ((v >>> r) | (v << (32 - r))) >>> 0);
function runArm(start, argv, { maxSteps = 4096, trace = null } = {}) {
  const r = new Uint32Array(16);
  argv.forEach((v, i) => { r[i] = v >>> 0; });
  r[14] = RET;
  let f = { nn: 0, z: 0, c: 0, v: 0 }, pc = start;
  for (let step = 0; step < maxSteps; step++) {
    const w = rd32(pc), cond = w >>> 28;
    if (trace) trace.push(`${String(pc.toString(16)).padStart(8, "0")}: ${A.decode(w, pc)}`);
    if (condHolds(cond, f) === false) { pc += 4; continue; }
    if (cond === 0xf) throw new Error(`unconditional space at ${hex(pc)}`);
    const w27 = (w & 0x0ff00000) >>> 0;
    if (w27 === 0x03000000 || w27 === 0x03400000) {        // movw / movt
      const rd = (w >>> 12) & 15, imm = (((w >>> 16) & 15) << 12) | (w & 0xfff);
      r[rd] = w27 === 0x03400000 ? (((r[rd] & 0xffff) | (imm << 16)) >>> 0) : imm;
      pc += 4; continue;
    }
    if (((w >>> 25) & 7) === 5) {                          // b / bl
      let off = (w & 0xffffff) << 2; if (off & 0x2000000) off -= 0x4000000;
      if (w & 0x01000000) r[14] = (pc + 4) >>> 0;
      pc = (pc + 8 + off) >>> 0; continue;
    }
    if ((w & 0x0ffffff0) === 0x012fff10) {                 // bx
      const t = r[w & 15];
      if (t === RET) return r[0];
      pc = t; continue;
    }
    if (((w >>> 26) & 3) === 0) {                          // data processing
      if ((w & 0x0fc000f0) === 0x00000090) throw new Error(`multiply/ls at ${hex(pc)}`);
      const op = (w >>> 21) & 15, s = (w >>> 20) & 1, rn = (w >>> 16) & 15, rd = (w >>> 12) & 15;
      let op2, setC = f.c;
      if (w & 0x02000000) {
        const imm = w & 0xff, rot = ((w >>> 8) & 15) * 2;
        op2 = ror32(imm, rot);
      } else {
        if (w & 0x10) throw new Error(`register shift at ${hex(pc)}`);
        const rm = w & 15, st = (w >>> 5) & 3, amt = (w >>> 7) & 31, src = r[rm];
        if (amt === 0) op2 = src;
        else if (st === 0) { op2 = (src << amt) >>> 0; setC = (src >>> (32 - amt)) & 1; }
        else if (st === 1) { op2 = src >>> amt; setC = (src >>> (amt - 1)) & 1; }
        else if (st === 2) { op2 = (src | 0) >> amt >>> 0; setC = (src >>> (amt - 1)) & 1; }
        else { op2 = ror32(src, amt); setC = (op2 >>> 31) & 1; }
      }
      const a = r[rn];
      let res, setV = f.v;
      switch (op) {
        case 0: res = a & op2; break;
        case 1: res = (a ^ op2) >>> 0; break;
        case 2: case 10: { const d = (a - op2) >>> 0; res = d; setC = a >= op2 ? 1 : 0; setV = ((a ^ op2) & (a ^ d)) >>> 31; break; }
        case 3: { const d = (op2 - a) >>> 0; res = d; setC = op2 >= a ? 1 : 0; setV = ((op2 ^ a) & (op2 ^ d)) >>> 31; break; }
        case 4: case 11: { const d = (a + op2) >>> 0; res = d; setC = d < a ? 1 : 0; setV = ((~(a ^ op2) & (a ^ d)) >>> 31) & 1; break; }
        case 8: res = a & op2; break;
        case 9: res = (a ^ op2) >>> 0; break;
        case 12: res = (a | op2) >>> 0; break;
        case 13: res = op2 >>> 0; break;
        case 14: res = (a & ~op2) >>> 0; break;
        case 15: res = (~op2) >>> 0; break;
        default: throw new Error(`dp op ${op} at ${hex(pc)}`);
      }
      if (s) f = { nn: (res >>> 31) & 1, z: res === 0 ? 1 : 0, c: setC, v: setV };
      if (op < 8 || op > 11) r[rd] = res >>> 0;
      pc += 4; continue;
    }
    throw new Error(`unsupported ${hex(pc)}: ${A.decode(w, pc)}`);
  }
  throw new Error("step limit");
}

// ---------------------------------------------------------------- read/write scan
// Walks a reader's or writer's body, keeps a constant for r0..r12 where the sequence allows
// it, and records every call to the four serialization primitives with the size in r2/r1.
const P_READ = 0x3df2a8, P_WRITE = 0x3df378, P_WIDTH = 0x3df1b8, P_BIT = 0x3df22c;
function scanRange(start, end) {
  const out = { start, end, reads: [], writes: [], widthCalls: [], bitReads: [], calls: [], loops: [] };
  const cst = new Map();
  const clear = (...rs) => rs.forEach((x) => cst.delete(x));
  for (let a = start; a < end; a += 4) {
    const w = rd32(a);
    if (((w >>> 25) & 7) === 5 && (w >>> 28) !== 0xf) {
      let off = (w & 0xffffff) << 2; if (off & 0x2000000) off -= 0x4000000;
      const t = (a + 8 + off) >>> 0;
      if (t < a && t >= start) out.loops.push([t, a]);
    }
  }
  const inLoop = (a) => out.loops.some(([t, b]) => t <= a && a <= b);
  for (let a = start; a < end; a += 4) {
    const w = rd32(a);
    const cond = w >>> 28;
    if (((w >>> 25) & 7) === 5 && cond !== 0xf) {
      let off = (w & 0xffffff) << 2; if (off & 0x2000000) off -= 0x4000000;
      const t = (a + 8 + off) >>> 0, tail = !(w & 0x01000000);
      if (t === P_READ) out.reads.push({ addr: a, size: cst.get(2), tail, loop: inLoop(a) });
      else if (t === P_WRITE) out.writes.push({ addr: a, size: cst.get(2), tail, loop: inLoop(a) });
      else if (t === P_WIDTH) out.widthCalls.push({ addr: a, cap: cst.get(1), loop: inLoop(a) });
      else if (t === P_BIT) out.bitReads.push({ addr: a, bits: cst.get(1), loop: inLoop(a) });
      else out.calls.push({ addr: a, target: t, tail });
      const capArg = cst.get(1);
      clear(0, 1, 2, 3, 12);
      if (t === P_WIDTH && capArg !== undefined) cst.set(0, runArm(P_WIDTH, [0, capArg]));
      continue;
    }
    if ((w & 0x0ff00000) === 0x03000000 || (w & 0x0ff00000) === 0x03400000) {
      const rd = (w >>> 12) & 15, imm = (((w >>> 16) & 15) << 12) | (w & 0xfff);
      const movt = (w & 0x0ff00000) === 0x03400000;
      if (rd <= 12) cst.set(rd, movt ? (((cst.get(rd) ?? 0) & 0xffff) | (imm << 16)) >>> 0 : imm);
      continue;
    }
    if (((w >>> 26) & 3) === 0 && (w & 0x0fc000f0) !== 0x00000090) {
      const op = (w >>> 21) & 15, rd = (w >>> 12) & 15, rn = (w >>> 16) & 15;
      if (rd > 12) continue;
      if (op === 13) {                       // mov
        if (w & 0x02000000) { const imm = w & 0xff, rot = ((w >>> 8) & 15) * 2; cst.set(rd, ror32(imm, rot)); }
        else if (!(w & 0x10) && ((w >>> 7) & 31) === 0) { const v = cst.get(w & 15); v === undefined ? cst.delete(rd) : cst.set(rd, v); }
        else cst.delete(rd);
        continue;
      }
      if (op === 4 || op === 2) {            // add / sub with immediate
        if (w & 0x02000000) {
          const imm = ror32(w & 0xff, ((w >>> 8) & 15) * 2), base = cst.get(rn);
          if (base === undefined) cst.delete(rd);
          else cst.set(rd, (op === 4 ? base + imm : base - imm) >>> 0);
          continue;
        }
      }
      if (op !== 8 && op !== 9 && op !== 10 && op !== 11) cst.delete(rd);
      continue;
    }
    if (((w >>> 26) & 3) === 1) { if (w & 0x00100000) clear((w >>> 12) & 15); continue; }
    if (((w >>> 25) & 7) === 4) { if (w & 0x00100000) for (let i = 0; i < 13; i++) if (w & (1 << i)) clear(i); continue; }
  }
  return out;
}
function fmtCalls(list) {
  return list.map((x) => `${hex(x.addr)}${x.tail ? "(tail)" : ""}=${x.size === undefined ? "?" : x.size}`).join(" ");
}

// ================================================================ CLAIM 1
console.log("\n== claim 1 — member[14] size: 98 B or 6,248 B (W2-MB1) ==");
{
  const R = 0x15bd3c, RN = 0x1599d8, W = 0x15bba0, WN = 0x159898;
  const rd = scanRange(R, nextPrologue(R));
  const rdn = scanRange(RN, nextPrologue(RN));
  const wr = scanRange(W, nextPrologue(W));
  const wrn = scanRange(WN, nextPrologue(WN));
  console.log(`reader   ${hex(R)}..${hex(rd.end)} static reads ${rd.reads.length}: ${fmtCalls(rd.reads)}`);
  console.log(`  nested reader ${hex(RN)}..${hex(rdn.end)}: ${rdn.reads.length} reads = ${sum(rdn.reads.map((x) => x.size))} B`);
  const nestedSites = rd.calls.filter((c) => c.target === RN);
  console.log(`  ${hex(R)} calls ${hex(RN)} ${nestedSites.length}x at ${nestedSites.map((c) => hex(c.addr)).join(" ")} (loop-covered: ${nestedSites.filter((c) => rd.loops.some(([t, b]) => t <= c.addr && c.addr <= b)).length})`);
  const stat = sum(rd.reads.map((x) => x.size)), nest = sum(rdn.reads.map((x) => x.size));
  const total = stat + nestedSites.length * nest;
  const tail = rd.reads.filter((x) => x.tail);
  console.log(`  static ${stat} B (tail read ${tail.map((x) => x.size).join("/")}) + ${nestedSites.length}x${nest} = ${n(total)} B`);
  console.log(`  the 98 figure = static ${stat} - tail ${sum(tail.map((x) => x.size))} = ${stat - sum(tail.map((x) => x.size))}, i.e. it drops the tail read and all ${nestedSites.length} nested calls`);
  console.log(`writer   ${hex(W)}..${hex(wr.end)} static writes ${wr.writes.length}: ${fmtCalls(wr.writes)}`);
  const wN = wr.calls.filter((c) => c.target === WN);
  const wnSum = sum(wrn.writes.map((x) => x.size));
  console.log(`  nested writer ${hex(WN)}: ${wrn.writes.length} writes = ${wnSum} B; ${hex(W)} calls it ${wN.length}x`);
  const wTotal = sum(wr.writes.map((x) => x.size)) + wN.length * wnSum;
  console.log(`  writer total ${wTotal} B`);
  const t15 = scanRange(0x539120, nextPrologue(0x539120));
  console.log(`  member[15] reads: ${fmtCalls(t15.reads)}`);
  console.log(`  chain: member[14] starts where member[13]'s B6 ends (0x335A8); 0x335A8 + ${n(total)} = ${hex(0x335A8 + total)}; member[15] ${hex(0x539120)} reads ${sum(t15.reads.map((x) => x.size))} B -> ${hex(0x34e10 + 160)}`);

  const m15 = lines("docs/analysis/members/member15.md");
  const row16 = m15.find((l) => /^\| #16 \| `0x15bd3c`/.test(l));
  const cells = row16 ? row16.split("|").map((s) => s.trim()) : [];
  const cell4 = row16 ? cells[4].replace(/[*\s]/g, "") : null;
  console.log(`  member15.md #16 row: ${row16 ? JSON.stringify(cells[4]) : "not found"}`);
  if (cell4 === "6,248") ok("member15.md states 6,248 B for reader 0x15bd3c");
  else bad(`member15.md #16 row states ${row16 ? JSON.stringify(cells[4]) : "nothing"} but the reader/writer both sum to 6,248 B`);
  if (total !== 6248 || wTotal !== 6248) bad(`reader ${total} / writer ${wTotal} disagree with 6,248`);
  else ok(`reader and writer both consume/produce 6,248 B (138 static + 13x470)`);
  if (/成员合计 \*\*6,248 B\*\*/.test(doc("docs/analysis/members/member4-17-layout.md"))) ok("member4-17-layout.md already states 6,248 B");
  else bad("member4-17-layout.md no longer states 6,248 B");
}

// ================================================================ CLAIM 2
console.log("\n== claim 2 — member[7] bitstream: 196 bit or 157 bit (W2-MB2) ==");
{
  const WIDTH = 0x3df1b8;
  const trace = [];
  const w3 = runArm(WIDTH, [0, 3], { trace });
  console.log(`  run ${hex(WIDTH)} with cap=3 -> ${w3} (${trace.length} instructions executed)`);
  for (const t of trace.slice(0, 24)) console.log(`    ${t}`);
  if (trace.length > 24) console.log(`    ... (${trace.length - 24} more, the mask-halving loop repeats until the mask is below the cap)`);
  const caps = [3, 9, 6, 10, 2, 99, 0xbaf];
  const want = [2, 4, 3, 4, 2, 7, 12];
  const got = caps.map((c) => runArm(WIDTH, [0, c]));
  console.log(`  cap -> width: ${caps.map((c, i) => `${c}->${got[i]}`).join(" ")}`);
  if (JSON.stringify(got) === JSON.stringify(want)) ok(`the executed function reproduces the hand table ${want.join("/")} (cap is not the width)`);
  else bad(`width function gives ${got.join("/")} but the hand table says ${want.join("/")}`);
  const R7 = 0x2639ac;
  const m7 = scanRange(R7, nextPrologue(R7));
  const widths = m7.widthCalls.map((c) => ({ ...c, width: runArm(WIDTH, [0, c.cap]) }));
  console.log(`  member[7] ${hex(R7)}: width calls ${widths.length} -> ${widths.map((x) => `${hex(x.addr)}=cap ${x.cap}->${x.width}bit`).join(" ")}`);
  console.log(`  bit reads ${m7.bitReads.length} -> ${m7.bitReads.map((x) => `${hex(x.addr)}=${x.bits}bit`).join(" ")}`);
  const bits = sum(m7.bitReads.map((x) => x.bits));
  console.log(`  sum = ${sum(widths.map((x) => x.width))} + ${bits - sum(widths.map((x) => x.width))} = ${bits} bit = ${(bits / 8).toFixed(3)} B -> ceil ${Math.ceil(bits / 8)} B`);
  console.log(`  bitstream starts at rel 0x0005 -> next byte read at rel ${hex(5 + Math.ceil(bits / 8))}; 84x324 from there ends at ${hex(5 + Math.ceil(bits / 8) + 84 * 324)}`);
  if (bits === 157) ok("member[7] bitstream is 157 bit = 20 B");
  else bad(`member[7] bitstream is ${bits} bit, not 157`);
  const lay = doc("docs/analysis/members/member4-17-layout.md");
  if (/(共|位流合计) 196 bit/.test(lay)) bad("member4-17-layout.md still states the bitstream as 196 bit");
  else ok("member4-17-layout.md no longer states 196 bit");
  const sec = lay.slice(lay.indexOf("## member[7] 0x2639ac"), lay.indexOf("## member[8] 0x507d44"));
  if (/157 bit/.test(sec) && /20 B/.test(sec) && /0x0019/.test(sec) && /35,131/.test(sec)) ok("the member[7] section carries 157 bit / 20 B / rel 0x0019 / 35,131");
  else bad("the member[7] section does not carry 157 bit / 20 B / rel 0x0019 / 35,131");
  const cells = sec.split(/\r?\n/).filter((l) => /^\| (\d+) \|/.test(l)).map((l) => l.split("|").map((x) => x.trim()));
  const bitRows = cells.filter((c) => /^bits\b/.test(c[2]));
  const sizeSum = bitRows.reduce((acc, c) => acc + Number(c[3]), 0);
  console.log(`  table rows 5..16: ${bitRows.length} bit fields, size column sums to ${sizeSum} B (expect ${(bits / 8).toFixed(3)})`);
  if (bitRows.length === 12 && Math.abs(sizeSum - bits / 8) < 0.001) ok("the size column of rows 5..16 sums to 157/8 = 19.625 B");
  else bad(`the size column sums to ${sizeSum} B over ${bitRows.length} bit rows, not 19.625`);
}

// ================================================================ CLAIM 3
console.log("\n== claim 3 — member[3] 5,440 B block: obj+259,068 or obj+254,028 ==");
{
  const imm = (w) => ror32(w & 0xff, ((w >>> 8) & 15) * 2);
  const at = (a) => rd32(a);
  const ins = [
    [0x14b198, "add r0,r5,#76"], [0x14b19c, "mov r2,#5440"], [0x14b1a0, "add r1,r0,#253952"], [0x14b1a8, "bl 0x3df2a8"],
    [0x14b1ac, "add r0,r5,#396"], [0x14b1b0, "mov r2,#1632"], [0x14b1b4, "add r1,r0,#259072"], [0x14b1c0, "b 0x3df2a8"],
  ];
  for (const [a, want] of ins) console.log(`  ${hex(a)}: ${A.decode(at(a), a).padEnd(22)} (${want})`);
  const base = imm(at(0x14b198));                 // add r0,r5,#76
  const o1 = (base + imm(at(0x14b1a0))) >>> 0;    // add r1,r0,#253952
  const o2 = (imm(at(0x14b1ac)) + imm(at(0x14b1b4))) >>> 0;
  const sz1 = imm(at(0x14b19c)), sz2 = imm(at(0x14b1b0));
  console.log(`  obj+${n(o1)} (${hex(o1)}) ${n(sz1)} B -> ends ${n(o1 + sz1)} (${hex(o1 + sz1)}); obj+${n(o2)} (${hex(o2)}) ${n(sz2)} B -> ends ${n(o2 + sz2)}`);
  if (o1 === 254028 && o1 + sz1 === o2) ok("the 5,440 B block is obj+254,028 and it ends exactly where the 1,632 B block starts");
  else bad(`the 5,440 B block computes to ${o1}, adjacency ${o1 + sz1} vs ${o2}`);
  const cen = doc("docs/analysis/members/member-census.md");
  if (/r5\+259,?068/.test(cen)) bad("member-census.md still states r5+259068");
  else ok("member-census.md no longer states r5+259068");
  if (/254028|254,028/.test(cen)) ok("member-census.md states 254,028"); else bad("member-census.md does not state 254,028");
}

// ================================================================ CLAIM 4
console.log("\n== claim 4 — member-census.md read counts (W2-MB1 collateral) ==");
{
  const cen = lines("docs/analysis/members/member-census.md");
  const c0 = cen.findIndex((l) => /^## 成员清单/.test(l)), c1 = cen.findIndex((l) => /^## 坐标系/.test(l));
  const rows = cen.slice(c0, c1).filter((l) => /^\| \d+ \| `0x[0-9a-f]+` \| `0x[0-9a-f]+` \|/.test(l))
    .map((l) => { const c = l.split("|").map((s) => s.trim()); return { idx: +c[1], reader: parseInt(c[2].replace(/`/g, ""), 16), cell: c[4] }; });
  const want = [[7, 17], [8, 11], [10, 1], [12, 5], [13, 6], [14, 12], [17, 4]];
  for (const [idx, exp] of want) {
    const row = rows.find((r) => r.idx === idx);
    const start = row.reader, sc = scanRange(start, nextPrologue(start));
    const bl = sc.reads.filter((x) => !x.tail).length, tail = sc.reads.filter((x) => x.tail);
    let extra = "";
    if (idx === 17) {
      const h1 = scanRange(0x55d354, nextPrologue(0x55d354)), h2 = scanRange(0x1caafc, nextPrologue(0x1caafc));
      extra = ` + ${h1.reads.length} (0x55d354) + ${h2.reads.length} (0x1caafc) = ${sc.reads.length + h1.reads.length + h2.reads.length}`;
    }
    console.log(`  [${idx}] ${hex(start)}: ${sc.reads.length} call sites (${bl} bl + ${tail.length} tail${tail.length ? " " + tail.map((x) => x.size + "B").join(",") : ""})${extra}; one-pass bytes ${n(sum(sc.reads.map((x) => x.size)))}; loop-covered ${sc.reads.filter((x) => x.loop).length}`);
    if (sc.reads.length !== exp) bad(`[${idx}] recomputed ${sc.reads.length} sites, expected ${exp}`);
    const cell = row ? row.cell : "";
    const m = /(\d+)\s*次读/.exec(cell);
    if (!m) { if (idx !== 10) bad(`[${idx}] census row has no "N 次读" cell: ${JSON.stringify(cell)}`); }
    else if (+m[1] !== sc.reads.length && idx !== 17) bad(`[${idx}] census says ${m[1]}, recomputed ${sc.reads.length}`);
    if (idx === 17) {
      const total = sc.reads.length + 15 + 3;
      if (total !== 22) bad(`[17] one-level total ${total} != 22`);
      if (m && +m[1] !== total) bad(`[17] census says ${m[1]}, recomputed one-level total ${total}`);
      if (m && +m[1] === total) ok(`[17] census states the one-level total ${total} = 4 direct + 15 + 3`);
    }
    if (idx === 10) {
      if (/40\s*B/.test(cell) && !/7B|11B/.test(cell)) ok("[10] census states the single 40 B read");
      else bad(`[10] census cell is ${JSON.stringify(cell)}; the reader is a 5-instruction stub with exactly one 40 B read`);
    }
    if (idx !== 10 && idx !== 17 && m && +m[1] === sc.reads.length) ok(`[${idx}] census matches ${sc.reads.length} read sites`);
  }
  // the layout doc's own summary table must agree as well
  const lay = lines("docs/analysis/members/member4-17-layout.md");
  const summ = lay.filter((l) => /^\| \[\d+\] \| `?0x[0-9a-f]+`? \| \d+ \|/.test(l))
    .map((l) => { const c = l.split("|").map((s) => s.trim()); return { m: +c[1].replace(/\[|\]/g, ""), reader: parseInt(c[2].replace(/`/g, ""), 16), stat: +c[3] }; });
  for (const s of summ) {
    const sc = scanRange(s.reader, nextPrologue(s.reader));
    if (s.stat !== sc.reads.length) bad(`layout summary member[${s.m}] says ${s.stat} static reads, recomputed ${sc.reads.length}`);
  }
  if (!summ.length) bad("no rows parsed from the layout summary table");
  else ok(`layout summary table agrees with the recomputed site counts (${summ.length} rows)`);
}

// ================================================================ CLAIM 5
console.log("\n== claim 5 — monster-classes.md: 0x48698 group and the tsv fn column (W2-MP1) ==");
{
  const bx = rd32(0x48698);
  console.log(`  0x48698: ${A.decode(bx, 0x48698)}  (4-byte leaf: ${hex(0x48698)}..${hex(nextPrologue(0x48698))})`);
  for (let a = 0x4869c; a < 0x486d0; a += 4) console.log(`    ${hex(a)}: ${A.decode(rd32(a), a)}`);
  if (bx === 0xe12fff1e) ok("0x48698 is a 4-byte bx lr leaf, not the registrar");
  else bad(`0x48698 is ${hex(bx)}, not bx lr`);
  if (hex(fnOf(0x4869c)) === "0x4869c" && hex(fnOf(0x486c8)) === "0x486c8") ok("0x4869c is its own 10-instruction thunk (ends 0x486c0: bx r2) and 0x486c8 is a separate prologue");
  else bad("0x4869c / 0x486c8 prologue split differs");
  const tsv = doc("docs/data/member-offsets.tsv").split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split("\t"))
    .map((c) => ({ fn: parseInt(c[0], 16), site: parseInt(c[4], 16), name: c[3] }));
  const g = tsv.filter((r) => r.fn === 0x486c8);
  console.log(`  tsv 0x486c8 rows: ${g.length} -> ${g.map((r) => `${r.name}@${hex(r.site)}=fn ${hex(fnOf(r.site))}`).join(" ")}`);
  if (g.length === 7 && g.every((r) => fnOf(r.site) === 0x486c8)) ok("all 7 records are written inside the function that starts at 0x486c8");
  else bad("the 7 records do not all sit in 0x486c8");
  const fns = [...new Set(tsv.map((r) => r.fn))];
  const notPro = fns.filter((f) => !isPrologue(f));
  const siteBad = tsv.filter((r) => fnOf(r.site) !== r.fn);
  console.log(`  tsv: ${tsv.length} rows, ${fns.length} distinct fn; fn not a prologue: ${notPro.length}; site outside its named fn: ${siteBad.length}`);
  if (!notPro.length && !siteBad.length) ok("every tsv fn value is a prologue and every site lies inside the fn the tsv names (the tsv is current)");
  else bad(`tsv fn column is not a prologue set (${notPro.map(hex).join(",")}) or sites escape (${siteBad.length})`);
  const classes = lines("docs/mechanics/monster-classes.md");
  const secs = [];
  let cur = null;
  for (const l of classes) {
    const h = /^## `(0x[0-9a-f]+)` — (\d+) 个成员/.exec(l);
    if (h) { cur = { hdr: parseInt(h[1], 16), n: +h[2], rows: [] }; secs.push(cur); continue; }
    if (/^## /.test(l)) { cur = null; continue; }
    if (!cur) continue;
    const m = /^\| `\+0x[0-9a-fA-F]+` \| \d+ \| `([^`]+)` \| `(0x[0-9a-fA-F]+)` \|/.exec(l);
    if (m) cur.rows.push({ name: m[1], site: parseInt(m[2], 16) });
  }
  const hdrPro = secs.filter((s) => isPrologue(s.hdr)).length;
  let same = 0;
  for (const s of secs) { const f = tsv.find((r) => r.site === s.rows[0].site); if (f && f.fn === s.hdr) same++; }
  console.log(`  doc: ${secs.length} group headers, ${secs.reduce((a, s) => a + s.rows.length, 0)} rows; header is a prologue: ${hdrPro}/${secs.length}; header == tsv fn: ${same}`);
  if (secs.length === 27 && same === 2) ok("25 of 27 group headers differ from the function that writes their rows (only 0x8af8d0, 0xba4be4 coincide)");
  else bad(`group headers: ${secs.length} sections, ${same} equal to their tsv fn`);
  const head = classes.filter((l) => l.startsWith("> **2026-11-04")).join(" ");
  console.log(`  banner: ${head.slice(0, 160)}...`);
  if (/0x486c8/.test(doc("docs/mechanics/monster-classes.md"))) ok("monster-classes.md names 0x486c8 as where the 7 records are");
  else bad("monster-classes.md does not name 0x486c8");
  if (/记录在 (\*\*)?`0x4869c`/.test(doc("docs/mechanics/monster-classes.md"))) bad("monster-classes.md still puts the 7 records at 0x4869c");
  else ok("monster-classes.md no longer puts the 7 records at 0x4869c");
  if (/列早于函数表重切/.test(doc("docs/mechanics/monster-classes.md"))) bad("the banner still says the tsv fn column predates the retile");
  else ok("the banner no longer blames the tsv fn column");
}

// ================================================================ CLAIM 6
console.log("\n== claim 6 — monster-ai-params.md: 131 vs 134 `mParam.` strings (W2-MP2) ==");
{
  const strs = STRS;
  const mp = strs.filter((x) => x.str.startsWith("mParam."));
  const tokPos = [];
  for (let i = 0; ;) { i = buf.indexOf("mParam.", i, "latin1"); if (i < 0) break; tokPos.push(i); i += 1; }
  const starts = new Set(mp.map((x) => x.v));
  const atStart = new Set(mp.map((x) => x.v + 0x100));
  const innerReal = tokPos.filter((p) => !atStart.has(p));
  console.log(`  NUL-delimited printable strings in the image: ${n(strs.length)}`);
  console.log(`  strings starting with mParam.: ${mp.length} (distinct ${new Set(mp.map((x) => x.str)).size})`);
  console.log(`  token occurrences of "mParam." anywhere: ${tokPos.length}`);
  for (const p of innerReal) {
    let a = p; while (a > 0 && buf[a - 1] !== 0) a--;
    let b = p; while (b < buf.length && buf[b] !== 0) b++;
    console.log(`    0x${(p - 0x100).toString(16)} inside string 0x${(a - 0x100).toString(16)} ${JSON.stringify(buf.toString("latin1", a, b))}`);
  }
  if (mp.length === 131 && new Set(mp.map((x) => x.str)).size === 131) ok("131 distinct NUL-delimited `mParam.` strings");
  else bad(`recomputed ${mp.length} strings / ${new Set(mp.map((x) => x.str)).size} distinct`);
  if (tokPos.length === 134 && innerReal.length === 3) ok("134 `mParam.` token hits = 131 string starts + 3 inside longer strings");
  else bad(`token hits ${tokPos.length}, inner ${innerReal.length}`);
  const ai = lines("docs/mechanics/monster-ai-params.md");
  const i0 = ai.findIndex((l) => /^## 1\./.test(l));
  const i1 = ai.findIndex((l, i) => i > i0 && /^## 2\./.test(l));
  const rows = ai.slice(i0 + 1, i1).filter((l) => /^\| `0x[0-9a-fA-F]+` \| `[^`]+` \|/.test(l))
    .map((l) => /^\| `0x[0-9a-fA-F]+` \| `([^`]+)` \|/.exec(l)[1]);
  const distinct = new Set(rows);
  const dup = rows.filter((x, i) => rows.indexOf(x) !== i);
  console.log(`  §1 rows ${rows.length}, distinct names ${distinct.size}; repeated rows: ${[...new Set(dup)].join(", ")}`);
  if (rows.length === 134 && distinct.size === 131) ok("§1 has 134 rows = 131 distinct names + 3 repeats");
  else bad(`§1 has ${rows.length} rows / ${distinct.size} distinct names`);
  const head = ai.slice(i0, i0 + 4).join(" ");
  console.log(`  §1 heading: ${head}`);
  if (/131/.test(head) && /134/.test(head) && /token|子串/.test(head)) ok("the §1 heading states 131 strings and 134 token hits");
  else bad("the §1 heading does not state 131 strings / 134 token hits");
}

// ================================================================ CLAIM 7
console.log("\n== claim 7 — monster-ai-params.md §4: 225 rows are not 225 uEm###_00 names (W2-MP3) ==");
{
  const ai = lines("docs/mechanics/monster-ai-params.md");
  const i0 = ai.findIndex((l) => /^## 4\./.test(l));
  const i1 = ai.findIndex((l, i) => i > i0 && /^## 5\./.test(l));
  const rows = [];
  for (let i = i0 + 1; i < i1; i++) {
    const m = /^\| `(0x[0-9a-fA-F]+)` \| `([^`]+)` \|/.exec(ai[i]);
    if (m) rows.push({ v: parseInt(m[1], 16), name: m[2] });
  }
  let mismatch = 0;
  for (const r of rows) { let e = r.v; while (buf[e + 0x100] !== 0) e++; if (buf.toString("latin1", r.v + 0x100, e + 0x100) !== r.name) mismatch++; }
  const act = rows.filter((r) => /^ems\d{3}_00/.test(r.name));
  const unit = rows.filter((r) => !/^ems\d{3}_00/.test(r.name));
  const exact = rows.filter((r) => /^uEm\d{3}_00$/.test(r.name));
  const uems = rows.filter((r) => /^uEms\d{3}_00$/.test(r.name));
  const cls = rows.filter((r) => /^uEm\d{3}_00::/.test(r.name));
  const other = unit.filter((r) => !exact.includes(r) && !uems.includes(r) && !cls.includes(r));
  console.log(`  §4 rows ${rows.length}; vaddr/name mismatches ${mismatch}`);
  console.log(`  ${unit.length} unit-name rows + ${act.length} ems###_00* action rows = ${rows.length}`);
  console.log(`  unit rows: ${exact.length} exact uEm###_00 + ${uems.length} uEms###_00 + ${cls.length} uEm###_00::class + ${other.length} uEm087/088 form (${other.map((r) => r.name).join(", ")})`);
  const imgExact = STRS.filter((x) => /^uEm\d{3}_00$/.test(x.str)).length;
  console.log(`  image strings matching ^uEm\\d{3}_00$: ${imgExact}`);
  if (rows.length === 225 && mismatch === 0) ok("all 225 §4 rows point at their string");
  else bad(`§4 rows ${rows.length}, ${mismatch} vaddr/name mismatches`);
  if (unit.length === 96 && act.length === 129) ok("225 rows = 96 unit names + 129 action names");
  else bad(`unit ${unit.length} / action ${act.length}`);
  if (exact.length === 61) ok("only 61 rows are exact `uEm###_00` names");
  else bad(`exact uEm count ${exact.length}`);
  const head = ai.slice(i0, i0 + 4).join(" ");
  console.log(`  §4 heading: ${head}`);
  if (/225/.test(head) && /96/.test(head) && /129/.test(head)) ok("the §4 heading states the 225 = 96 + 129 split");
  else bad("the §4 heading does not state the 96/129 split");
}

console.log(fails ? `\n${fails} CLAIM(S) FAIL` : "\nALL 7 CLAIMS RECOMPUTED — docs agree with the image");
process.exit(fails ? 1 : 0);
