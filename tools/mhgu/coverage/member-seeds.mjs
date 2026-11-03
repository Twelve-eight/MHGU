// member-seeds.mjs — attribute functions from the *member schema* they register or read.
//
// Why this exists: an inline property builder enumerates a class's members by name before storing their byte
// offsets (`bl 0x7bb638` new record, name string, type code, `add r1,rBASE,#OFFSET`). The member-name set is
// therefore a fingerprint of the *class schema*, and the class fixes the subsystem. 0x122e8c registering
// mKireType/mKireLevel/mAttack/mDefense/mAffinity/mElementValue/mSlotCount is the weapon-stat block, and the
// same reading applies to every other schema.
//
// Three things this tool does NOT trust, because each one produced false labels in earlier passes:
//   * the `strings` column of functions-retile (a table access makes `table - pc` land inside the string blob);
//   * `stringxref.tsv` for add-pc references: it only pairs `add rD,pc,rX` with a delta loaded in the *immediately
//     preceding* instruction, and it treats a delta whose value falls in .rodata as a table pointer. Most deltas
//     are > TEXT_END, so those references are dropped (0x54028's BaseScale/Nando/Rank never appear in xref).
//     This tool resolves the delta by *register* with a 4-instruction lookahead instead.
//   * the `fn` column of member-offsets.tsv: it was built against the pre-retile function boundaries, so the
//     registration sites of e.g. run 0x53ea0 actually live in 0x54028. Runs are re-keyed by enclosing function
//     of each `site`, but the *class* still comes from the original registrar entry.
//
// Label mapping is taxonomy.mjs labelOf() only. A class that no rule covers stays `unknown`; nothing here invents
// a label from a class-name prefix. Two independent label sources are tried, in this order:
//   R  registrar class: the member-offsets registrar is a class-inventory registrar -> labelOf(class)
//   M  member vocabulary: the member names themselves hit a taxonomy rule (mActionNo -> monster-em,
//      mOtomo*/mNyanter* -> otomo-ot, mShader*/mTexture* -> render-gfx, mBGMType -> audio)
// A label that disagrees with a higher-or-equal existing attribution (attr-vtable-fixed/attr-xref) is not
// emitted: the schema may legitimately mention a foreign name (0x3b6790 is a quest class that carries
// mPoolAcNyanterEquip), so agreement is required, not assumed.
//
// Output: docs/analysis/code/inventory/attr-members.tsv  (start, label, conf, evidence)
//         conf A = schema is unambiguous for one class/label (>=3 supporting names, >=80% of the labelled ones)
//         conf B = class maps but the overlap is partial (2 names, or <80%)
//
// The must-fail gate runs by default against docs/analysis/code/coverage/mustfail-members.json (10 hand-picked
// ambiguous functions) and exits 1 if any of them is promoted to A.
//
// Usage:
//   node tools/mhgu/coverage/member-seeds.mjs                    (scan, emit, run the gate)
//   node tools/mhgu/coverage/member-seeds.mjs --mustfail other.json
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { labelOf } from "./taxonomy.mjs";

const ROOT = "G:/omp works/MHGU";
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const FNS = arg("--functions", path.join(ROOT, "docs/data/functions-retile.csv.gz"));
const MEMBERS = arg("--members", path.join(ROOT, "docs/data/member-offsets.tsv"));
const CLASSES = arg("--classes", path.join(ROOT, "docs/data/class-inventory.tsv"));
const XREF = arg("--xref", path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv"));
const OUT = arg("--out", path.join(ROOT, "docs/analysis/code/inventory/attr-members.tsv"));
const EXISTING = arg("--existing", "attr-vtable-fixed.tsv,attr-xref.tsv").split(",");
const MUSTFAIL = arg("--mustfail", path.join(ROOT, "docs/analysis/code/coverage/mustfail-members.json"));

const IMG = path.join(ROOT, "main.140.flat.bin");
const buf = fs.readFileSync(IMG);
const TEXT_END = 0x13f1dec;
const IMG_END = buf.length - 0x100;
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const byte = (v) => buf[v + 0x100];
const isAscii = (b) => b >= 0x20 && b < 0x7f;

// A string starts after a NUL (or at the very start of rodata); otherwise a pointer into a data blob yields a
// long run of printable bytes that is not a string. Same rule as stringxref.mjs.
function readStr(v) {
  if (v <= TEXT_END || v >= IMG_END - 1) return "";
  if (byte(v - 1) !== 0) return "";
  let n = 0;
  while (n < 96 && isAscii(byte(v + n))) n++;
  if (n < 4 || byte(v + n) !== 0) return "";
  return buf.slice(v + 0x100, v + 0x100 + n).toString("latin1");
}

// ---- functions
const funcs = [];
for (const l of zlib.gunzipSync(fs.readFileSync(FNS)).toString("utf8").split("\n").slice(1)) {
  const m = /^(0x[0-9a-f]+),(0x[0-9a-f]+),/.exec(l);
  if (m) funcs.push({ s: parseInt(m[1], 16), e: parseInt(m[2], 16) });
}
funcs.sort((a, b) => a.s - b.s);
const starts = funcs.map((f) => f.s);
function enclosing(addr) {
  let lo = 0, hi = funcs.length - 1, best = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (funcs[m].s <= addr) { best = m; lo = m + 1; } else hi = m - 1; }
  if (best < 0 || addr >= funcs[best].e) return null;
  return funcs[best].s;
}

// ---- string references, register-aware (this is the part stringxref.mjs gets wrong)
const refs = new Map(); // start -> Set(string)
for (const f of funcs) {
  const set = new Set();
  const n = Math.floor((f.e - f.s) / 4);
  for (let i = 0; i < n; i++) {
    const v = f.s + i * 4, w = rd(v);
    if ((w >>> 28) === 0xf) continue;
    if (((w >>> 26) & 3) !== 1) continue;      // single data-processing / ldr
    if (((w >>> 25) & 1) !== 0) continue;      // ldr rD,[pc,#imm] form only
    if (((w >>> 20) & 1) !== 1) continue;      // L=1
    if (((w >>> 16) & 0xf) !== 15) continue;   // Rn = pc
    if (((w >>> 24) & 1) !== 1) continue;      // P=1
    if (((w >>> 21) & 1) !== 0) continue;      // W=0
    const off = w & 0xfff, U = (w >>> 23) & 1;
    const L = (v + 8 + (U ? off : -off)) >>> 0;
    if (L + 4 > IMG_END) continue;
    const V = rd(L);
    const reg = (w >>> 12) & 0xf;
    const direct = readStr(V);
    if (direct) set.add(direct);
    for (let k = 1; k <= 4 && i + k < n; k++) {
      const w2 = rd(v + k * 4);
      if ((w2 & 0x0fff0ff0) === 0x008f0000 && (w2 & 0xf) === reg) { // add rD,pc,rX with X = the loaded reg
        const s2 = readStr((v + k * 4 + 8 + V) >>> 0);
        if (s2) set.add(s2);
      }
    }
  }
  if (set.size) refs.set(f.s, set);
}

// ---- member vocabulary: mXxx names seen in code + every name member-offsets already recovered
const MEMBER_RE = /^m[A-Z][A-Za-z0-9_]*(\[\d*\])?$/;
const vocab = new Set();
for (const set of refs.values()) for (const s of set) if (MEMBER_RE.test(s)) vocab.add(s);
const memberRows = [];
for (const l of fs.readFileSync(MEMBERS, "utf8").split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const [fn, off, type, name, site] = l.split("\t");
  if (!name) continue;
  vocab.add(name);
  memberRows.push({ fn, name, site: parseInt(site, 16) });
}
const memOf = new Map(); // start -> Set(member names)
for (const [s, set] of refs) {
  const m = new Set();
  for (const str of set) if (vocab.has(str)) m.add(str);
  if (m.size) memOf.set(s, m);
}

// ---- class registrars (class-inventory) and member runs
const classOfRegistrar = new Map(); // "0x..." -> [class names]
for (const l of fs.readFileSync(CLASSES, "utf8").split(/\r?\n/).slice(1)) {
  if (!l) continue;
  const p = l.split("\t");
  if (p.length < 4) continue;
  const [, name, , fn] = p;
  if (!classOfRegistrar.has(fn)) classOfRegistrar.set(fn, []);
  classOfRegistrar.get(fn).push(name);
}
const runs = [];
{
  const byFn = new Map();
  for (const r of memberRows) {
    if (!byFn.has(r.fn)) byFn.set(r.fn, { members: new Set(), builders: new Set() });
    const run = byFn.get(r.fn);
    run.members.add(r.name);
    const b = enclosing(r.site);
    if (b != null) run.builders.add(b);
  }
  for (const [fn, run] of byFn) {
    const classes = classOfRegistrar.get(fn) || [];
    const labels = [...new Set(classes.map((c) => labelOf(c)).filter(Boolean))];
    runs.push({ fn, members: run.members, builders: run.builders, classes, labels });
  }
}

// ---- existing attributions, so a schema label never silently contradicts stronger evidence
const rank = { A: 3, B: 2, C: 1 };
const existing = new Map();
for (const f of EXISTING) {
  const p = path.join(ROOT, "docs/analysis/code/inventory", f.trim());
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).slice(1)) {
    const q = l.split("\t");
    if (q.length < 3 || !/^0x[0-9a-f]+$/.test(q[0])) continue;
    const prev = existing.get(q[0]);
    if (!prev || (rank[q[2]] || 0) > (rank[prev.conf] || 0)) existing.set(q[0], { label: q[1], conf: q[2], src: f.trim() });
  }
}

// ---- qualifying functions and verdicts
const out = ["start\tlabel\tconf\tevidence"];
const stats = { qualifying: 0, attributedElsewhere: 0, newSeeds: 0, A: 0, B: 0, unknown: 0, byLabel: {}, bySource: {}, conflicts: 0 };
const unknowns = [];
const decided = new Map();
for (const f of funcs) {
  const mem = memOf.get(f.s);
  if (!mem || mem.size < 3) continue;
  stats.qualifying++;
  const key = "0x" + f.s.toString(16);
  const ex = existing.get(key);
  if (ex && ex.label !== "unknown") stats.attributedElsewhere++;

  // M: member names themselves hit a taxonomy rule
  const hits = new Map(); // label -> names
  for (const m of mem) {
    const l = labelOf(m);
    if (!l) continue;
    if (!hits.has(l)) hits.set(l, []);
    hits.get(l).push(m);
  }
  const labelled = [...hits.entries()].sort((a, b) => b[1].length - a[1].length);
  let label = null, conf = null, why = null, source = null;
  if (labelled.length) {
    const [top, names] = labelled[0];
    const total = labelled.reduce((a, b) => a + b[1].length, 0);
    const share = names.length / total;
    if (names.length >= 2 && share >= 0.6) {
      label = top; source = "member-vocab";
      // B, not A: the member vocabulary names the subsystem's data domain but not a class, and the ticket
      // reserves A for "unambiguous for one class". Only the registrar-run path below can claim A.
      conf = "B";
      why = `member names ${names.slice(0, 4).join(",")}${names.length > 4 ? ",..." : ""} (${names.length}/${total} labelled names, ${(100 * share).toFixed(0)}%) match taxonomy rules -> ${label} (domain only, class not named)`;
    }
  }

  // R: the member run belongs to a class whose registrar is in class-inventory
  if (!label) {
    let best = null;
    for (const run of runs) {
      let ov = 0;
      for (const m of run.members) if (mem.has(m)) ov++;
      if (!ov) continue;
      const isBuilder = run.builders.has(f.s);
      if (ov < 3 && !isBuilder) continue;
      if (!best || ov > best.ov) best = { run, ov, isBuilder };
    }
    if (best && best.run.labels.length === 1) {
      label = best.run.labels[0];
      source = "registrar-run";
      const cover = best.ov / best.run.members.size;
      conf = cover >= 0.8 && best.ov >= 3 ? "A" : "B";
      why = `member run of ${best.run.classes[0]} (registrar ${best.run.fn}): ${best.ov}/${best.run.members.size} names${best.isBuilder ? ", registration sites in this function" : ""} -> labelOf=${label}`;
    }
  }

  if (!label) { stats.unknown++; if (unknowns.length < 40) unknowns.push(key); continue; }
  if (ex && ex.label !== label) {
    // schema mentions a foreign name (e.g. a quest class carrying mPoolAcNyanterEquip): keep the existing label
    stats.conflicts++;
    stats.unknown++;
    if (unknowns.length < 40) unknowns.push(key);
    continue;
  }
  const text = `${conf === "A" ? "unambiguous" : "partial"}: ${why}${ex ? `; agrees with ${ex.src}` : ""}`.replace(/\t/g, " ");
  out.push([key, label, conf, text].join("\t"));
  stats.byLabel[label] = (stats.byLabel[label] || 0) + 1;
  stats.bySource[source] = (stats.bySource[source] || 0) + 1;
  stats[conf]++;
  if (!ex) stats.newSeeds++;
  decided.set(key, { label, conf });
}
fs.writeFileSync(OUT, out.join("\n") + "\n");

// ---- xref cross-check (the ticket's other input): the committed xref only pairs an add-pc delta with the
// instruction immediately before it, so most member references are invisible to it. Quantify, do not assume.
let xrefSeen = 0;
if (fs.existsSync(XREF)) {
  const xs = new Map();
  for (const l of fs.readFileSync(XREF, "utf8").split(/\r?\n/).slice(1)) { const [st, str] = l.split("\t"); if (!st || st === "start") continue; if (!xs.has(st)) xs.set(st, new Set()); if (str) xs.get(st).add(str); }
  let memTotal = 0, memSeen = 0;
  for (const [st, mem] of memOf) {
    if (mem.size < 3) continue;
    const k = "0x" + st.toString(16);
    if (xs.has(k)) xrefSeen++;
    for (const m of mem) { memTotal++; if (xs.get(k) && xs.get(k).has(m)) memSeen++; }
  }
  console.log(`xref cross-check: ${xrefSeen}/${stats.qualifying} qualifying functions have a row, but only ${memSeen}/${memTotal} (${(100*memSeen/memTotal).toFixed(0)}%) of their member names are visible to stringxref.tsv`);
}
console.log(`qualifying functions (>=3 member names): ${stats.qualifying}`);
console.log(`already attributed elsewhere: ${stats.attributedElsewhere}`);
console.log(`seeds emitted: ${out.length - 1}  (A ${stats.A}, B ${stats.B})  new ${stats.newSeeds}  unknown ${stats.unknown}  conflicts ${stats.conflicts}`);
console.log(`by label: ${JSON.stringify(stats.byLabel)}`);
console.log(`by source: ${JSON.stringify(stats.bySource)}`);
console.log(`wrote ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
if (unknowns.length) console.log(`unknown examples: ${unknowns.slice(0, 12).join(" ")}`);

// ---- must-fail gate: hand-picked ambiguous functions must never come out A
if (MUSTFAIL) {
  const list = JSON.parse(fs.readFileSync(MUSTFAIL, "utf8")); // [{start, why, expect:"unknown"|"B"|"A"}]
  let bad = 0;
  for (const item of list) {
    const got = decided.get(item.start);
    const verdict = got ? got.conf : "unknown";
    const expect = item.expect || "not-A";
    const ok = expect === "not-A" ? verdict !== "A" : verdict === expect;
    if (!ok) bad++;
    console.log(`  mustfail ${ok ? "PASS" : "FAIL"} ${item.start} got=${verdict} expect=${expect} (${item.why})`);
  }
  if (bad) { console.error(`must-fail gate: ${bad} regression(s)`); process.exit(1); }
  console.log(`must-fail gate: PASS (${list.length} cases)`);
}
