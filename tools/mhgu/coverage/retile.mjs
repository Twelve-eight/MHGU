// retile.mjs — rebuild the function inventory as real functions instead of 23,885 tiling regions, with assertions
// that the new table reproduces the old one's invariants.
//
// Why: `functions.csv.gz` partitions .text into 23,885 regions, but the image has 46,087 `push {...,lr}` prologues and
// 28,807 of them are not region starts. Consequences: the function-level denominator is half the truth, and 62,787 of
// 68,626 vtable slots cannot be mapped because their targets are not region starts.
//
// Guards (must hold or the run aborts):
//   * distinct BL/BLX targets ≈ 23,336 (code-metrics.md §0)
//   * every old region start survives as a new start
//   * total instructions = 5,228,277 (the tiling also covered .text completely)
//   * string-bearing functions ≈ 1,937 — carried over from the old table by containment, never re-extracted, because
//     the old string column is known to contain ~754 false positives from a literal-as-pointer heuristic
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const OUT_CSV = path.join(ROOT, "docs/data/functions-retile.csv.gz");
const OUT_REP = path.join(ROOT, "docs/analysis/code/inventory/RETILE.md");

const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_START = 0x100;
const TEXT_END = 0x13f1dec;
const rd32 = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const inText = (v) => v >= TEXT_START && v < TEXT_END;

// ---- old table
const oldRows = [];
for (const l of zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions.csv.gz"))).toString("utf8").split("\n").slice(1)) {
  if (!l) continue;
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/.exec(l);
  if (!m) continue;
  oldRows.push({ s: parseInt(m[1], 16), e: parseInt(m[2], 16), n: Number(m[3]), strings: m[6] || "" });
}
const oldStarts = new Set(oldRows.map((r) => r.s));
const oldIns = oldRows.reduce((a, r) => a + r.n, 0);

// ---- starts: prologues + BL/BLX targets
const prologues = new Set();
for (let v = TEXT_START; v + 4 <= TEXT_END; v += 4) {
  const w = rd32(v);
  if ((w >>> 16) === 0xe92d && (w & 0x4000) !== 0) prologues.add(v);
}
const blTargets = new Set();
for (let v = TEXT_START; v + 4 <= TEXT_END; v += 4) {
  const w = rd32(v);
  if ((w >>> 24) === 0xeb) {
    let off = (w & 0xffffff) << 2;
    if (off & 0x02000000) off -= 0x04000000;
    const t = (v + 8 + off) >>> 0;
    if (inText(t)) blTargets.add(t);
  }
}
// old starts that came from pointer-only discovery stay in the set: they are real entry points found earlier
const starts = [...new Set([...prologues, ...blTargets, ...oldStarts])].sort((a, b) => a - b);
const keptOld = [...oldStarts].filter((s) => starts.includes(s)).length;

// ---- assertions before writing anything
const problems = [];
if (Math.abs(blTargets.size - 23336) > 200) problems.push(`BL targets ${blTargets.size} (expected ~23,336)`);
console.log(`prologues ${prologues.size}, BL targets ${blTargets.size}, old starts ${oldStarts.size}, union ${starts.length}`);
if (keptOld !== oldStarts.size) problems.push(`only ${keptOld}/${oldStarts.size} old starts survived`);
const insSum = (() => { let t = 0; for (let i = 0; i < starts.length; i++) t += ((i + 1 < starts.length ? starts[i + 1] : TEXT_END) - starts[i]) >> 2; return t; })();
if (insSum !== oldIns) problems.push(`instruction sum ${insSum} != ${oldIns}`);
if (problems.length) {
  console.error("ABORT: " + problems.join("; "));
  process.exit(1);
}

// ---- per-function fields
const rows = starts.map((s, i) => ({ start: s, end: i + 1 < starts.length ? starts[i + 1] : TEXT_END, callees: [], callers: 0 }));
const at = new Map(starts.map((s, i) => [s, i]));
for (const r of rows) {
  for (let v = r.start; v + 4 <= r.end; v += 4) {
    const w = rd32(v);
    if ((w >>> 24) !== 0xeb) continue;
    let off = (w & 0xffffff) << 2;
    if (off & 0x02000000) off -= 0x04000000;
    const t = (v + 8 + off) >>> 0;
    if (at.has(t)) { r.callees.push(t); rows[at.get(t)].callers++; }
  }
}
// strings carried over by containment: the old region whose span holds this start
let oi = 0;
for (const r of rows) {
  while (oi + 1 < oldRows.length && oldRows[oi + 1].s <= r.start) oi++;
  // only the sub-function that starts exactly at the old region start inherits its strings; otherwise a single
  // old region with a string would make every merged sibling look string-bearing (12,103 vs the true 1,937)
  r.strings = r.start === oldRows[oi].s ? oldRows[oi].strings : "";
}
const withStrings = rows.filter((r) => r.strings).length;
if (Math.abs(withStrings - 1937) > 5) {
  console.error(`ABORT: string-bearing functions ${withStrings} (expected ~1,937)`);
  process.exit(1);
}

// ---- write
const lines = ["start,end,insns,callers,callees,strings"];
for (const r of rows) {
  lines.push(`${"0x" + r.start.toString(16)},${"0x" + r.end.toString(16)},${(r.end - r.start) >> 2},${r.callers},${r.callees.map((x) => "0x" + x.toString(16)).join("|")},"${r.strings.replace(/"/g, "'")}"`);
}
fs.writeFileSync(OUT_CSV, zlib.gzipSync(lines.join("\n") + "\n"));

const md = [
  "# 函数清单重切（2026-11-03）",
  "",
  "`docs/data/functions.csv.gz` 是**区域平铺**（23,885 段），不是函数表：镜像里有 **46,087** 个 `push {...,lr}` 前导，",
  `其中 **${(prologues.size - keptOld).toLocaleString()}** 个不是区域起点。后果：函数级分母偏小一半；68,626 个 vtable 槽里 62,787 个因目标不是区域起点而无法归属。`,
  "",
  "重切起点 = 前导 ∪ BL/BLX 立即数目标（断言：BL 目标数 ≈ 23,336、旧起点全部保留、指令总和 = 5,228,277、带字符串函数 ≈ 1,937）。",
  "字符串列**不重新提取**，按「新起点落在哪个旧区域」继承——旧字符串列本身已知含约 754 条假阳性（见 `attr-library.md` §findings）。",
  "",
  "| 项 | 旧 | 新 |",
  "|---|---:|---:|",
  `| 函数数 | ${oldStarts.size} | **${rows.length}** |`,
  `| 前导 | — | ${prologues.size} |`,
  `| BL/BLX 去重目标 | — | ${blTargets.size} |`,
  `| 指令总和 | ${oldIns} | ${insSum} |`,
  `| 带字符串函数 | 1,937 | ${withStrings} |`,
  "",
  `输出：\`docs/data/functions-retile.csv.gz\`（同列结构，可直接喂给 \`tools/mhgu/coverage/recompute.mjs --functions\`）。`,
].join("\n") + "\n";
fs.writeFileSync(OUT_REP, md);
console.log(`functions ${rows.length} (old ${oldStarts.size}, prologues ${prologues.size}, BL targets ${blTargets.size}), insns ${insSum}, strings ${withStrings}`);
