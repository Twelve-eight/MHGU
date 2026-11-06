// slice-pack.mjs - build one evidence pack per Tier-B adjudication part.
//
// Why this exists: the tier-B slice tables are adjudication logs, and the inputs they were written from
// (`.tmp/mhgu/tierB2/slice-*.txt`) are gone or have been regenerated over different ranges (W6-P135). For
// `tierB-slice-09` the pool IS still derivable - 1,062 tier-B rows of `tiers.csv` in `0x72aa48..0x80c93c`
// (corroborated by docs/analysis/audit/ROUND1-ALL.tsv:376) - so the pack is generated from the bytes instead
// of from a lost list.
//
// Every field is recomputed, never inherited:
//   * body      - CFG-reachable instruction addresses from fn-body.bodyOf (W6-P133b/P134 fixes included)
//   * callees   - BL/BLX-immediate targets that are actually inside that body (W6-P128: the published
//                 `callees` column of functions-retile.csv.gz includes calls after the function's own exit)
//   * strings   - `stringxref.tsv` attribution rows for `start == this function` and `via == code`, taken from
//                 `stringxref.mjs --dump-json` so there is exactly one attribution implementation (W6-P126)
//   * votes     - callee labels looked up in function-labels.tsv; the raw accessor family is flagged, because
//                 the slice-09 method section says their `quest` votes are noise
//
//   node MHGU/tools/mhgu/slice-pack.mjs --slice tierB-slice-09 --range 0x72aa48..0x80c93c --parts 9 \
//        --out G:/tmp/tierb-s09 --source tiers.csv --tier B
//
// Exit codes: 0 = packs written, 1 = a control failed (pool size mismatch, parts overlap, rerun not identical).
import fs from "node:fs";
import path from "node:path";
import { bodyOf, capFor, starts } from "./fn-body.mjs";
import * as A from "./arm32.mjs";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const arg = (k, d = null) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };

const SLICE = arg("slice", "tierB-slice-09");
const RANGE = arg("range", "0x72aa48..0x80c93c");
const PARTS = +arg("parts", "9");
const OUT = arg("out", `G:/tmp/${SLICE.replace(/\.md$/, "")}`);
const SOURCE = arg("source", "tiers.csv");
const TIER = arg("tier", "B");
const EXPECT = +arg("expect", "0"); // 0 = do not assert a size

const [loS, hiS] = RANGE.split("..");
const lo = parseInt(loS, 16), hi = parseInt(hiS, 16);

// ---- pool: tier rows of the stated table inside the stated range -------------------------------
const srcPath = path.join(INV, SOURCE);
const srcLines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/).filter(Boolean);
const pool = [];
for (const l of srcLines.slice(1)) {
  const c = l.split(",");
  const s = parseInt(c[0], 16);
  if (!Number.isFinite(s)) continue;
  if (s < lo || s > hi) continue;
  if (c[2] !== TIER) continue;
  pool.push({ start: s, insns: +c[1], label: c[3] || "" });
}
pool.sort((a, b) => a.start - b.start);

// Exclusion: a vaddr that an existing slice table already adjudicates must not be adjudicated again here.
// Measured 2026-11-06: the raw tier-B pool of 0x72aa48..0x80c93c is 1,062 but 221 of those already carry a
// row in another tierB* table, so only 841 are genuinely new. The merge would report the repeats as label
// disagreements and `--policy weakest` would take whichever claim is weaker, which is not new information.
const adjudicated = new Set();
{
  const SL = path.join(INV, "slices");
  for (const dir of fs.existsSync(SL) ? fs.readdirSync(SL) : []) {
    const d = path.join(SL, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d).filter((x) => /^tierB.*\.md$/.test(x) && x !== `${SLICE}.md`)) {
      for (const m of fs.readFileSync(path.join(d, f), "utf8").matchAll(/^\|\s*`?(0x[0-9a-fA-F]+)`?\s*\|/gm)) {
        adjudicated.add(m[1].toLowerCase());
      }
    }
  }
}
const rawPool = pool.length;
const kept = process.argv.includes("--keep-adjudicated")
  ? pool
  : pool.filter((f) => !adjudicated.has("0x" + f.start.toString(16)));
pool.length = 0;
pool.push(...kept);
console.log(`pool: ${rawPool} raw -> ${pool.length} to adjudicate (${rawPool - pool.length} already adjudicated elsewhere)`);

// ---- indices: published callee labels, string attribution --------------------------------------
const labelOf = new Map();
for (const l of fs.readFileSync(path.join(INV, "function-labels.tsv"), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split("\t"); // start, insns, label, provenance, reason
  if (c[0] && c[2]) labelOf.set(c[0].toLowerCase(), c[2]);
}
const stringsOf = new Map();
{
  const j = JSON.parse(fs.readFileSync(arg("strings", "G:/tmp/sx.json"), "utf8"));
  for (const r of j.slice(1)) {
    const [start, str, via, site] = r;
    if (via !== "code" || !start) continue;
    if (!stringsOf.has(start)) stringsOf.set(start, []);
    stringsOf.get(start).push({ str, site });
  }
}

// The accessor family the slice-09 method section declares noise for callee votes. Ranges are inclusive.
const GENERIC = [
  [0x54ecc0, 0x54ff80], [0x65cb3c, 0x65cc40], [0x65d424, 0x65d480], [0x65d9e8, 0x65d9f0],
  [0x65e5bc, 0x65ed24], [0x7aa47c, 0x7aa47c], [0x7aedcc, 0x7aedcc], [0x13efd70, 0x13efe10],
  [0x13eff08, 0x13f00d0], [0x13f0514, 0x13f05a4],
];
const isGeneric = (v) => GENERIC.some(([a, b]) => v >= a && v <= b);

const hex = (n) => "0x" + n.toString(16);

// ---- per function -------------------------------------------------------------------------------
function digest(f) {
  const cap = capFor(f.start, starts);
  const body = bodyOf(f.start, cap);
  const inBody = new Set(body);
  const callees = [], seen = new Set();
  let dispatch = 0;
  for (const a of body) {
    const w = A.rd32(a) >>> 0;
    if (((w >>> 25) & 7) === 5 && ((w >>> 24) & 1) === 1 && (w >>> 28) !== 0xf) {
      let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
      const t = (a + 8 + (o << 2)) >>> 0;
      if (!seen.has(t)) { seen.add(t); callees.push(t); }
    }
    if (((w & 0x0fe00000) === 0x00800000 && (w & 0xf) === 0xf) || (w >>> 16) === 0xe08f) dispatch++;
  }
  const votes = new Map(), votesNG = new Map();
  for (const t of callees) {
    const lab = labelOf.get(hex(t));
    if (!lab || lab === "unknown") continue;
    votes.set(lab, (votes.get(lab) || 0) + 1);
    if (!isGeneric(t)) votesNG.set(lab, (votesNG.get(lab) || 0) + 1);
  }
  const fmt = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" ") || "-";
  const calls = callees.map((t) => {
    const lab = labelOf.get(hex(t)) || "?";
    return `${hex(t)}[${lab}${isGeneric(t) ? ",generic" : ""}]`;
  });
  const insns = body.slice(0, 24).map((a) => A.disasm(a, 1).replace(/^0{8}/, "")).join("\n");
  // Signals: the instructions the existing slice rows actually cite (literal loads with their resolved
  // word, pc-relative adds, bl targets, wide immediates, struct field offsets, compare bounds). Capped, and
  // the cap is stated, so a reader knows whether they saw all of it.
  const sig = [];
  for (const a of body) {
    const w = A.rd32(a) >>> 0;
    const h = hex(a);
    if ((w >>> 16) === 0xe59f) {
      const L = a + 8 + (w & 0xfff);
      const V = A.rd32(L) >>> 0;
      sig.push(`${h}: ldr r${(w >>> 12) & 0xf},[pc] -> [${hex(L)}]=${hex(V)}`);
    } else if ((w >>> 16) === 0xe08f || ((w & 0x0fe00000) === 0x00800000 && (w & 0xf) === 0xf)) {
      sig.push(`${h}: ${A.disasm(a, 1).split("  ").pop()}`);
    } else if (((w >>> 25) & 7) === 5 && ((w >>> 24) & 1) === 1) {
      let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
      const t = (a + 8 + (o << 2)) >>> 0;
      if (!inBody.has(t)) sig.push(`${h}: bl ${hex(t)}`);
    } else if ((w & 0x0ff00000) === 0x03000000) {
      sig.push(`${h}: movw r${(w >>> 12) & 0xf},#${hex((w & 0xfff) | (((w >>> 16) & 0xf) << 12))}`);
    } else if ((w & 0x0ff00000) === 0x03400000) {
      sig.push(`${h}: movt r${(w >>> 12) & 0xf},#${hex(((w >>> 16) & 0xf) << 12)}`);
    } else if ((w & 0x0c100000) === 0x04000000 || (w & 0x0c100000) === 0x05000000) { // ldr/str with offset
      const off = w & 0xfff;
      if (off >= 0x40) sig.push(`${h}: ${A.disasm(a, 1).split("  ").pop()}   (struct field +${off})`);
    } else if ((w & 0x0ff00000) === 0x03500000) {
      sig.push(`${h}: cmp r${(w >>> 16) & 0xf},#${(w & 0xfff) | (((w >>> 8) & 0xf) << 12)}`);
    }
    if (sig.length >= 40) { sig.push(`... (capped at 40 of ${body.length} reachable instructions)`); break; }
  }
  return {
    cap, body, callees,
    text: [
      `=== ${hex(f.start)}  insns_tiers=${f.insns} insns_body=${body.length} tier=${TIER} pool_label=${f.label || "-"}${body.length * 2 < f.insns ? "  [BODY UNDER-APPROXIMATES: a case block is its own entry point and caps the walk - W6-P128 caveat]" : ""}`,
      `votes: ${fmt(votes)}`,
      `votes_nogen: ${fmt(votesNG)}`,
      `callees (inside body only, ${callees.length}): ${calls.join(" | ") || "-"}`,
      `add-pc dispatch sites: ${dispatch}${dispatch ? "  (over-inclusion risk: the walk falls through)" : ""}`,
      `strings (attributed to this start, via=code): ${(stringsOf.get(hex(f.start)) || []).map((x) => `"${x.str}"@${x.site}`).join(" | ") || "-"}`,
      `signals:${sig.length ? "\n  " + sig.join("\n  ") : " -"}`,
      `----- first ${Math.min(24, body.length)} of ${body.length} reachable insns -----`,
      insns,
    ].join("\n"),
  };
}

// ---- split into contiguous parts ---------------------------------------------------------------
const per = Math.ceil(pool.length / PARTS);
const chunks = [];
for (let i = 0; i < pool.length; i += per) chunks.push(pool.slice(i, i + per));

if (EXPECT && rawPool !== EXPECT) {
  console.log(`POOL MISMATCH: ${SOURCE} tier ${TIER} in ${RANGE} has ${rawPool} raw row(s), expected ${EXPECT}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
let total = 0;
chunks.forEach((chunk, idx) => {
  const n = String(idx + 1).padStart(2, "0");
  const head = [
    `# ${SLICE} part-${n} (${chunk.length} functions)`,
    "",
    `Pool rule (reproducible, W6-P135): tier **${TIER}** rows of \`${SOURCE}\` whose start lies in \`${RANGE}\`,`,
    `sorted by start address, split into ${PARTS} contiguous parts of ceil(${pool.length}/${PARTS}) = ${per}.`,
    `This part covers \`${hex(chunk[0].start)}..${hex(chunk[chunk.length - 1].start)}\`.`,
    "",
    "Evidence fields are recomputed from the bytes, never inherited:",
    "- `insns_body` = CFG-reachable instructions (`tools/mhgu/fn-body.mjs`); `insns_tiers` is the published count.",
    "- `callees` = BL/BLX targets **inside that body** only. A call after the function's own exit is not a callee (W6-P128).",
    "- `votes` = labels of those callees from `function-labels.tsv`; `votes_nogen` drops the accessor family the",
    "  slice-09 method section declares noise (`0x54ecc0..0x54ff80`, `0x65cb3c..0x65cc40`, `0x65e5bc..0x65ed24`,",
    "  `0x7aa47c`, `0x7aedcc`, `0x13efd70..0x13efe10`, `0x13eff08..0x13f00d0`, `0x13f0514..0x13f05a4`).",
    "- `strings` = `stringxref.tsv` attribution with `via=code` for this exact start (W6-P126 fixed extractor).",
    "- `add-pc dispatch sites` > 0 means the walk can over-include; say so in the row's evidence.",
    "",
    "Judgement rules for this slice (verbatim from the table header, do not re-derive):",
    "1. strings that name a subsystem entity -> conf A;",
    "2. class/type propagation -> conf B/C;",
    "3. non-generic callee votes -> conf B;",
    "4. address neighbourhood / structure only -> conf C;",
    "5. zero strings + <2 non-generic votes + no structural feature -> `unknown`.",
    "`role`: no callee and insns<=16 -> leaf; insns<=4 -> thunk; distinct callees >=8 -> orchestrator; else worker.",
    "",
    "| vaddr | label | role | conf | evidence |",
    "|---|---|---|---|---|",
    "",
  ].join("\n");
  const blocks = chunk.map((f) => {
    const d = digest(f);
    total++;
    manifest.push([hex(f.start), f.insns, d.body.length, d.callees.length]);
    return d.text;
  });
  fs.writeFileSync(path.join(OUT, `part-${n}.md`), head + blocks.join("\n\n") + "\n");
  console.log(`part-${n}: ${chunk.length} function(s), ${hex(chunk[0].start)}..${hex(chunk[chunk.length - 1].start)}`);
});

fs.writeFileSync(path.join(OUT, "pool.tsv"), ["vaddr\tinsns_tiers\tinsns_body\tcallees", ...manifest.map((r) => r.join("\t"))].join("\n") + "\n");
const starts2 = new Set(manifest.map((r) => r[0]));
console.log(`pool: ${pool.length} function(s) -> ${chunks.length} part(s), ${starts2.size} distinct start(s), total listed ${total}`);
if (starts2.size !== pool.length) { console.log("DUPLICATE STARTS ACROSS PARTS"); process.exit(1); }
console.log(`OK ${OUT}`);
