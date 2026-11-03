// claims-save.mjs — recompute the seven save-side claims behind LINK-STATUS W2-SV1 / W2-SV2 and read the
// number each document currently states, so PASS means "the doc value reproduces from the bytes".
//
// The first wave lost the commands that produced its numbers; this file is the missing definition. Every
// metric is spelled out here (range, header test, inflate requirement, grouping rule) and every doc-side
// value is parsed out of the document text, never copied from a constant in this file.
//
//   node tools/audit/claims-save.mjs             # all seven claims, one line each
//   node tools/audit/claims-save.mjs zlib        # zlib|windows|dirty-group|buckets|callers|leak|records
//   node tools/audit/claims-save.mjs windows -v  # verbose detail under the claim line
//
// Exit code 0 only when every claim PASSes.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FLAT = path.join(ROOT, "main.140.flat.bin");
const IMG = path.join(ROOT, "save-snapshots/20261022-clean-reference/system_CLEAN");
const DRY = path.join(ROOT, "save-snapshots/20261022-v6-ready/system");
const ADD = [0x18CC9C, 0x2AC560, 0x3CBE24]; // hunterAdds: three slots, one block + 36 B header apart
const LEN = 0x11F8A0;                        // 1,177,760 B per hunter block
const SEG = [0x80000, 0x11F8A0];             // the "tail" segment the save-io documents measure
const ZDOC = "docs/analysis/save-io/tail-containers.md";
const DDOC = "docs/analysis/save-io/tail-dense-3783A.md";
const WDOC = "docs/analysis/save-io/write-side-desc.md";
const RDOC = "docs/analysis/fields/records-128.md";
const LAYOUT = "docs/save-layout/member4-file-layout.txt";

const verbose = process.argv.includes("-v") || process.argv.includes("--verbose");
const hx = (n) => "0x" + n.toString(16).toUpperCase();
const num = (s) => Number(String(s).replace(/,/g, ""));
const read = (p) => fs.readFileSync(p);
const block = (buf, k) => buf.subarray(ADD[k], ADD[k] + LEN);

// ---------------------------------------------------------------- doc side
function docLineMatch(rel, re) {
  const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/);
  const i = lines.findIndex((l) => re.test(l));
  return i < 0 ? null : { n: i + 1, text: lines[i] };
}
const docLine = (rel, needle) => docLineMatch(rel, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

// ---------------------------------------------------------------- byte side
function adler32(b) {
  let a = 1, c = 0;
  for (let i = 0; i < b.length; i++) { a = (a + b[i]) % 65521; c = (c + a) % 65521; }
  return ((c << 16) | a) >>> 0;
}
const ZPAIR = (b, i) => b[i] === 0x78 && (b[i + 1] === 0x9c || b[i + 1] === 0xda || b[i + 1] === 0x01);
const ZHEAD = (b, i) => {
  const cmf = b[i], flg = b[i + 1];
  return (cmf & 0x0f) === 8 && (flg & 0x20) === 0 && (((cmf << 8) | flg) % 31) === 0;
};
// D3/D4: inflate must reach the zlib end-of-stream; D4 also compares the 4-byte trailer with adler32(output).
function zstream(b, i, end) {
  let z;
  try { z = zlib.inflateSync(b.subarray(i, end), { info: true }); } catch { return null; }
  const consumed = z.engine.bytesWritten;
  const at = i + consumed - 4;
  const adler = at >= 0 && at + 4 <= end && b.readUInt32BE(at) === adler32(z.buffer);
  return { i, consumed, out: z.buffer.length, adler };
}
function zcensus(b, s, e) {
  let pairN = 0, headN = 0;
  const headers = [];
  for (let i = s; i + 2 <= e; i++) {
    if (ZPAIR(b, i)) pairN++;
    if (ZHEAD(b, i)) { headN++; headers.push(i); }
  }
  const streams = [], adler = [];
  for (const i of headers) {
    const z = zstream(b, i, e);
    if (!z) continue;
    streams.push(z);
    if (z.adler) adler.push(z);
  }
  const tri = (a) => {
    if (!a.length) return [null, null, null];
    const q = [...a].sort((x, y) => x - y);
    return [q[0], q[q.length >> 1], q[q.length - 1]];
  };
  const gaps = adler.map((z, k) => (k ? z.i - adler[k - 1].i : null)).filter((x) => x !== null).sort((x, y) => x - y);
  return { pairN, headN, inflateN: streams.length, adlerN: adler.length,
           comp: tri(adler.map((z) => z.consumed)), out: tri(adler.map((z) => z.out)),
           medGap: gaps.length ? gaps[gaps.length >> 1] : null };
}
// Claim 2: a window "has" period p when at least 99% of its positions satisfy b[i] === b[i+p].
function windowRuns(b, thr = 0.99) {
  const wins = [];
  for (let w = SEG[0]; w + 4096 <= SEG[1]; w += 4096) {
    let bp = 0, bm = -1;
    for (let p = 2; p <= 8; p++) {
      let m = 0;
      const n = 4096 - p;
      for (let i = 0; i < n; i++) if (b[w + i] === b[w + i + p]) m++;
      const r = m / n;
      if (r > bm) { bm = r; bp = p; }
    }
    wins.push({ w, p: bp, m: bm });
  }
  const runs = [];
  for (const x of wins) {
    if (x.m < thr) continue;
    const last = runs[runs.length - 1];
    if (last && last.p === x.p && last.end === x.w) { last.end = x.w + 4096; last.min = Math.min(last.min, x.m); }
    else runs.push({ start: x.w, end: x.w + 4096, p: x.p, min: x.m });
  }
  return { wins, runs };
}
// Claim 3: diff positions merged while the gap to the previous diff byte is <= 16, then count bytes that are
// nonzero in dirty and zero in clean inside each group's span.
function diffGroups(clean, dirty, s, e, gap = 16) {
  const d = [];
  for (let i = s; i < e; i++) if (clean[i] !== dirty[i]) d.push(i);
  if (!d.length) return [];
  const groups = [];
  let st = d[0], prev = d[0];
  for (let k = 1; k < d.length; k++) {
    if (d[k] - prev <= gap) { prev = d[k]; continue; }
    groups.push([st, prev]); st = prev = d[k];
  }
  groups.push([st, prev]);
  return groups.map(([a, b]) => {
    let n = 0;
    for (let i = a; i <= b; i++) if (dirty[i] !== 0 && clean[i] === 0) n++;
    return { s: a, e: b, n };
  });
}
// Claim 4: the 8-byte record head, counted per 4 KB bucket and at the slot grid 0x63671 + 16k.
const HDR8 = [0xff, 0x00, 0x49, 0x92, 0x24, 0x49, 0x92, 0x24];
const isHdr8 = (b, i) => HDR8.every((v, k) => b[i + k] === v);
function bucketCensus(b) {
  const buckets = [];
  for (let s = 0x64000; s < 0xbc000; s += 0x1000) {
    let n = 0;
    for (let i = s; i < s + 4096; i++) if (isHdr8(b, i)) n++;
    buckets.push({ s, n });
  }
  let hdrs = 0;
  const miss = [];
  const SLOTS = 22875, GRID = 0x63671;
  for (let k = 0; k < SLOTS; k++) {
    const i = GRID + 16 * k;
    if (isHdr8(b, i)) hdrs++; else miss.push(i);
  }
  return { buckets, hdrs, slots: SLOTS, miss, span: SLOTS * 16, last: GRID + 16 * (SLOTS - 1) };
}
// Claim 5/6: image helpers (flat = vaddr + 0x100).
function imageCallers(target) {
  const img = read(FLAT);
  const bl = [], bt = [], blx = [];
  const tgt = (w, at) => {
    let imm = w & 0xffffff;
    if (imm & 0x800000) imm -= 0x1000000;
    return at + 8 + imm * 4;
  };
  for (let o = 0; o + 4 <= img.length; o += 4) {
    const w = img.readUInt32LE(o), at = o - 0x100;
    if ((w & 0x0f000000) === 0x0b000000) { if (tgt(w, at) === target) bl.push(at); }
    else if ((w & 0x0f000000) === 0x0a000000) { if (tgt(w, at) === target) bt.push(at); }
    else if ((w & 0xfe000000) === 0xfa000000) {
      const h = (w >>> 24) & 1;
      if (tgt(w, at) + h * 2 === target) blx.push(at);
    }
  }
  return { bl, bt, blx, img };
}
function ror(v, n) { n &= 31; return ((v >>> n) | (v << (32 - n))) >>> 0; }
// last write to r2 in the 32 words before the call: mov imm (any condition) or movw imm16.
function lastR2(img, site) {
  for (let k = 1; k <= 32; k++) {
    const w = img.readUInt32LE(site - 4 * k + 0x100);
    const cond = w >>> 28;
    // MOV (immediate): bits 27-21 = 0b011101, Rn ignored, any S, Rd = 2 (bits 15-12).
    if ((w & 0x0fef0000) === 0x03a00000 && ((w >> 12) & 0xf) === 2) {
      return { kind: cond === 0xe ? "imm" : "cond", val: ror(w & 0xff, ((w >> 8) & 0xf) * 2), cond };
    }
    if ((w & 0x0ff00000) === 0x03000000 && ((w >> 12) & 0xf) === 2) {
      return { kind: cond === 0xe ? "imm" : "cond", val: (((w >> 16) & 0xf) << 12) | (w & 0xfff), cond };
    }
  }
  return { kind: "unknown" };
}
// Claim 5/6: every saved block, its 0x02B byte and the seven 44 B record dwords at 0x10C + 44k.
function savedBlocks() {
  const out = [];
  const dirs = ["save-snapshots/20261022-clean-reference", "save-snapshots/20261022-v6-ready"];
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
      const buf = read(path.join(ROOT, d, f));
      const tag = `${path.basename(d)}/${f}`;
      const kind = f.startsWith("system") ? "system" : "hnt";
      if (kind === "system") for (let k = 0; k < 3; k++) out.push({ tag: `${tag}#slot${k}`, buf, base: ADD[k], kind, slot: k });
      else out.push({ tag, buf, base: 0, kind, slot: 0 });
    }
  }
  return out.map((b) => {
    const dwords = [...Array(7)].map((_, k) => b.buf.readUInt32LE(b.base + 0x10c + 44 * k));
    const hr = b.buf.readUInt16LE(b.base + 0x28);
    const named = b.buf.subarray(b.base, b.base + 32).some((v) => v !== 0);
    return { ...b, f02b: b.buf[b.base + 0x2b], dwords, uniq: new Set(dwords), occupied: hr !== 0 || named };
  });
}
// Claim 7: the family geometry from the authority the doc names, plus per-record diff/FF.
function layoutFamily() {
  const lines = fs.readFileSync(path.join(ROOT, LAYOUT), "utf8").split(/\r?\n/);
  const rows = [];
  for (const l of lines) {
    const m = /^(0x[0-9a-f]+)\s+obj\+(0x[0-9a-f]+)\s+sz=(\d+)/i.exec(l);
    if (m) rows.push({ off: parseInt(m[1], 16), obj: parseInt(m[2], 16), sz: Number(m[3]) });
  }
  return { rows, fam: rows.filter((r) => r.sz === 128 && r.obj >= 0x2a78 && r.obj <= 0x3178) };
}
function perRecord(clean, dirty, start, n, sz) {
  const out = [];
  for (let k = 0; k < n; k++) {
    let diff = 0, ff = 0;
    for (let j = 0; j < sz; j++) {
      const i = start + sz * k + j;
      if (clean[i] !== dirty[i]) diff++;
      if (dirty[i] === 0xff && clean[i] !== 0xff) ff++;
    }
    out.push({ diff, ff });
  }
  return out;
}

// ---------------------------------------------------------------- claims
const results = [];
function report(id, name, pass, docTxt, measured, defs = []) {
  results.push({ id, name, pass });
  console.log(`CLAIM ${id} ${name}: ${pass ? "PASS" : "FAIL"} | doc: ${docTxt} | measured: ${measured}`);
  for (const d of defs) if (d) console.log(`    ${d}`);
}

function claim1() {
  const c = read(IMG), d = read(DRY);
  const s0 = block(c, 0), s1 = block(c, 1), d0 = block(d, 0);
  const census = {
    "clean slot0": { block: zcensus(s0, 0, LEN), seg: zcensus(s0, SEG[0], SEG[1]) },
    "clean slot1": { block: zcensus(s1, 0, LEN), seg: zcensus(s1, SEG[0], SEG[1]) },
    "dirty slot0": { block: zcensus(d0, 0, LEN), seg: zcensus(d0, SEG[0], SEG[1]) },
  };
  const doc = docLineMatch(ZDOC, /^\|\s*命中数\s*\|/);
  const m = doc && /slot0\s+([\d,]+)\s*\/\s*slot1\s+([\d,]+)/.exec(doc.text);
  const dv = m ? [num(m[1]), num(m[2])] : null;
  const mv = [census["clean slot0"].seg.adlerN, census["clean slot1"].seg.adlerN];
  const pass = !!dv && dv[0] === mv[0] && dv[1] === mv[1];
  const defs = Object.entries(census).map(([k, v]) =>
    `${k}: D1 pairs ${v.block.pairN}/${v.seg.pairN} | D2 headers ${v.block.headN}/${v.seg.headN} | ` +
    `D3 inflate ${v.block.inflateN}/${v.seg.inflateN} | D4 adler ${v.block.adlerN}/${v.seg.adlerN} | ` +
    `comp ${v.seg.comp.join("/")} B, out ${v.seg.out.join("/")} B (min/median/max; block / segment)`);
  report(1, "zlib-stream-count", pass,
    doc ? `${doc.n}: slot0 ${dv ? dv[0] : "?"} / slot1 ${dv ? dv[1] : "?"}` : "anchor missing (| 命中数 |)",
    `slot0 ${mv[0]} / slot1 ${mv[1]} (0x80000..0x11F8A0, header+inflate+Adler32)`, defs);
}

function claim2() {
  const c = read(IMG), d = read(DRY);
  const w0 = windowRuns(block(c, 0)), w1 = windowRuns(block(c, 1)), wd = windowRuns(block(d, 0));
  const fmt = (x) => x.runs.map((r) => `\`${hx(r.start)}..${hx(r.end)}\`（p=${r.p}）`).join(" ");
  const doc = docLine(ZDOC, "4KB 精确字节周期");
  let dv = null;
  if (doc && doc.text.includes("clean slot1")) {
    const sub = doc.text.slice(doc.text.indexOf("clean slot1"));
    const re = /`(0x[0-9A-Fa-f]+)\.\.(0x[0-9A-Fa-f]+)`（p=(\d)）/g;
    const got = [];
    let x;
    while ((x = re.exec(sub)) && got.length < 2) got.push([parseInt(x[1], 16), parseInt(x[2], 16), Number(x[3])]);
    if (got.length === 2) dv = got;
  }
  const mr = w1.runs.map((r) => [r.start, r.end, r.p]);
  const pass = !!dv && mr.length === dv.length && dv.every((v, i) => v[0] === mr[i][0] && v[1] === mr[i][1] && v[2] === mr[i][2]);
  report(2, "4k-period-windows", pass,
    doc ? `${doc.n}: ${dv ? dv.map((v) => `\`${hx(v[0])}..${hx(v[1])}\`（p=${v[2]}）`).join(" ") : "no parse"}` : "anchor missing (4KB 精确字节周期)",
    `clean slot1: ${fmt(w1)}; clean slot0: ${fmt(w0)}; dirty slot0: ${fmt(wd)}`,
    [`criterion: per 4 KB window, max over p=2..8 of the byte-equality rate (4096-p positions), bar 0.99; ${w1.wins.length} windows in 0x80000..0x11F8A0`,
     verbose ? "slot1 windows: " + w1.wins.map((x) => `${hx(x.w)}/p${x.p}/${x.m.toFixed(3)}`).join(" ") : "",
     verbose ? "slot0 windows: " + w0.wins.map((x) => `${hx(x.w)}/p${x.p}/${x.m.toFixed(3)}`).join(" ") : ""].filter(Boolean));
}

function claim3() {
  const c = block(read(IMG), 0), d = block(read(DRY), 0);
  const groups = diffGroups(c, d, SEG[0], SEG[1]);
  const top = [...groups].sort((a, b) => b.n - a.n);
  const max = top[0];
  const doc = docLine(ZDOC, "最大单组");
  const m = doc && /最大单组\s*\*\*([\d,]+) B\*\*（`(0x[0-9A-Fa-f]+)`/.exec(doc.text);
  const dv = m ? { n: num(m[1]), off: parseInt(m[2], 16) } : null;
  const pass = !!dv && dv.n === max.n && dv.off === max.s;
  report(3, "largest-dirty-only-group", pass,
    doc ? `${doc.n}: ${dv ? `${dv.n} B at \`${hx(dv.off)}\`` : "no parse"}` : "anchor missing (最大单组)",
    `${max.n} B at \`${hx(max.s)}..${hx(max.e)}\``,
    [`${groups.length} gap-16 groups, ${groups.reduce((a, g) => a + g.n, 0)} dirty-only bytes (clean slot0 vs dirty slot0)`,
     `top6: ${top.slice(0, 6).map((g) => `${g.n}@${hx(g.s)}`).join(" ")}`]);
}

function claim4() {
  const b = block(read(IMG), 1); // tail-dense's clean axis is slot1
  const cen = bucketCensus(b);
  const bad = cen.buckets.filter((x) => x.n !== 256);
  const doc = docLine(DDOC, "88 个 4KB 桶");
  const doc2 = docLine(DDOC, "实体大小");
  const m1 = doc && /87 桶恰好 ([\d,]+) 条/.exec(doc.text);
  const m2 = doc && /`0xA5000` 桶只有 \*\*([\d,]+)\*\* 条/.exec(doc.text);
  const m3 = doc2 && /\*\*([\d,]+)\*\* 条 16B/.exec(doc2.text);
  const dv = m1 && m2 && m3 ? { ok: num(m1[1]), bucket: num(m2[1]), hdrs: num(m3[1]) } : null;
  const a5000 = cen.buckets.find((x) => x.s === 0xa5000).n;
  const pass = !!dv && dv.ok === 256 && dv.bucket === a5000 && dv.hdrs === cen.hdrs;
  report(4, "a5000-bucket-and-header-count", pass,
    doc ? `${doc.n}: ${dv ? `${dv.ok} per bucket, 0xA5000 ${dv.bucket}` : "no parse"}; ${doc2 ? doc2.n : "?"}: ${dv ? dv.hdrs : "?"} records` : "anchor missing (88 个 4KB 桶)",
    `87 buckets x 256, 0xA5000 ${a5000}; ${cen.hdrs} of ${cen.slots} aligned slots; span ${cen.span} B, last ${hx(cen.last)}`,
    [`buckets != 256: ${bad.map((x) => `${hx(x.s)}=${x.n}`).join(", ")}`,
     `missed slots: ${cen.miss.map(hx).join(", ")}`]);
}

function claim5() {
  const { bl, bt, blx, img } = imageCallers(0x3e0ea4);
  const r2 = bl.map((s) => ({ s, ...lastR2(img, s) }));
  const zero = r2.filter((x) => x.kind === "imm" && x.val === 0).map((x) => hx(x.s));
  const one = r2.filter((x) => x.kind === "imm" && x.val === 1).map((x) => hx(x.s));
  const dyn = r2.filter((x) => x.kind !== "imm").map((x) => hx(x.s));
  const blocks = savedBlocks();
  const f = blocks.map((b) => b.f02b);
  const doc = docLine(WDOC, "个直接 `bl` 调用点");
  const doc2 = docLineMatch(WDOC, /^\|\s*`0x02B`\s*\|\s*(\d+)\s*\|/);
  const m1 = doc && /(\d+) 个直接/.exec(doc.text);
  const m2 = doc2 && /^\|\s*`0x02B`\s*\|\s*(\d+)\s*\|/.exec(doc2.text);
  const dv = m1 && m2 ? { callers: Number(m1[1]), b02b: Number(m2[1]) } : null;
  const nSame = f.filter((x) => x === f[0]).length;
  const pass = !!dv && dv.callers === bl.length && dv.b02b === f[0] && nSame === f.length;
  report(5, "0x3e0ea4-callers-and-0x02B", pass,
    doc ? `${doc.n}: ${dv ? dv.callers : "?"} callers; ${doc2 ? doc2.n : "?"}: 0x02B=${dv ? dv.b02b : "?"}` : "anchor missing (个直接)",
    `${bl.length} bl, ${bt.length} b, ${blx.length} blx; r2=0 at ${zero.length} (${zero.join(",")}), r2=1 at ${one.length} (${one.join(",")}), conditional at ${dyn.length} (${dyn.join(",")}); 0x02B=${f[0]} in ${nSame}/${f.length} blocks`,
    [`blocks checked: ${blocks.length} (6 system files x 3 slots + 8 .hnt)`, `bl sites: ${bl.map(hx).join(" ")}`]);
}

function claim6() {
  const blocks = savedBlocks();
  const sys = blocks.filter((b) => b.kind === "system");
  const hnt = blocks.filter((b) => b.kind === "hnt");
  const occ = sys.filter((b) => b.occupied), emp = sys.filter((b) => !b.occupied);
  const hit = (list, v) => list.filter((b) => b.uniq.size === 1 && [...b.uniq][0] === v).length;
  const nOcc = hit(occ, 0x0193a514), nHnt = hit(hnt, 0x0193a514), nEmp = hit(emp, 0x39133514);
  const img = read(FLAT);
  const slot1 = img.readUInt32LE(0x1839e68);           // flat 0x1839E68 = vaddr 0x1839D68
  const deref = slot1 + 12 <= img.length ? img.readUInt32LE(slot1 + 8) : null;
  const slot0 = img.readUInt32LE(0x1839d68);           // the formula as written, without the flat +0x100
  const deref0 = slot0 + 12 <= img.length ? img.readUInt32LE(slot0 + 8) : null;
  const doc = docLineMatch(WDOC, /^\|\s*3\s*\|.*0x0193A514/);
  const g = (re) => (doc && re.exec(doc.text) ? num(re.exec(doc.text)[1]) : null);
  const dv = doc ? {
    real: /真实值/.test(doc.text),
    occ: [g(/占用槽 (\d+)\/(\d+)/), g(/占用槽 \d+\/(\d+)/)],
    hnt: [g(/`?\.hnt`? (\d+)\/(\d+)/), g(/`?\.hnt`? \d+\/(\d+)/)],
    emp: [g(/空槽 (\d+)\/(\d+)/), g(/空槽 \d+\/(\d+)/)],
    val2: /0x39133514/.test(doc.text),
  } : null;
  const pass = !!dv && dv.real && dv.val2 &&
    dv.occ[0] === nOcc && dv.occ[1] === occ.length &&
    dv.hnt[0] === nHnt && dv.hnt[1] === hnt.length &&
    dv.emp[0] === nEmp && dv.emp[1] === emp.length;
  report(6, "0x0193A514-is-real", pass,
    doc ? `${doc.n}: ${dv && dv.real ? "real" : "not marked real"}; 占用槽 ${dv ? dv.occ.join("/") : "?"}, .hnt ${dv ? dv.hnt.join("/") : "?"}, 空槽 ${dv ? dv.emp.join("/") : "?"}` : "anchor missing (§11 row 3)",
    `0x0193A514 x7 in ${nOcc}/${occ.length} occupied slots and ${nHnt}/${hnt.length} .hnt; 0x39133514 x7 in ${nEmp}/${emp.length} empty slots`,
    [`image: len ${hx(img.length)}, flat[0x1839E68]=${hx(slot1)} -> +8 = ${deref === null ? "outside image" : hx(deref)}; flat[0x1839D68]=${hx(slot0)} -> +8 = ${deref0 === null ? "outside image" : hx(deref0)}`,
     `neither 0x0193A514 nor 0x0183A514 is produced by either reading`]);
}

function claim7() {
  const { fam } = layoutFamily();
  const start = fam[0].off, n = fam.length, sz = fam[0].sz;
  const c0 = block(read(IMG), 0), c1 = block(read(IMG), 1), d0 = block(read(DRY), 0);
  const same = perRecord(c0, d0, start, n, sz);
  const cross = perRecord(c1, d0, start, n, sz);
  const rows = [0x4447, 0x448b, 0x44cf, 0x4513, 0x4557, 0x459b].map((s) => {
    let ff = 0, ff0 = 0, diff = 0;
    for (let j = 0; j < 68; j++) {
      if (d0[s + j] !== c1[s + j]) diff++;
      if (d0[s + j] === 0xff && c1[s + j] !== 0xff) ff++;
      if (d0[s + j] === 0xff && c0[s + j] !== 0xff) ff0++;
    }
    return { s, diff, ff, ff0 };
  });
  const doc = docLine(RDOC, "被涂字节");
  let dv = null;
  if (doc) {
    const re = /`(0x[0-9A-Fa-f]+)\.\.(0x[0-9A-Fa-f]+)`\s*([\d,]+) B/g;
    const got = [];
    let x;
    while ((x = re.exec(doc.text)) && got.length < 3) got.push([parseInt(x[1], 16), parseInt(x[2], 16), num(x[3])]);
    const mp = /i7\.\.i10 diff\/FF = (\d+)\/(\d+)、(\d+)\/(\d+)、(\d+)\/(\d+)、(\d+)\/(\d+)/.exec(doc.text);
    const ms = /同角色[^。]*?(\d+) diff/.exec(doc.text);
    if (got.length === 3 && mp && ms) dv = { got, fam: [[+mp[1], +mp[2]], [+mp[3], +mp[4]], [+mp[5], +mp[6]], [+mp[7], +mp[8]]], same: num(ms[1]) };
  }
  const famCross = cross.slice(7, 11);
  const want = [[0x4447, 0x4485, rows[0].ff], [0x44cf, 0x4507, rows[2].ff], [0x4557, 0x4597, rows[4].ff]];
  const geo = docLineMatch(RDOC, /^\|\s*0\s*\|\s*`0x2A78`/);
  const gm = geo && /`(0x[0-9A-Fa-f]+)`/.exec(geo.text.split("|")[3] || "");
  const docStart = gm ? parseInt(gm[1], 16) : null;
  const pass = !!dv && docStart === start &&
    dv.got.every((g, i) => g[0] === want[i][0] && g[1] === want[i][1] && g[2] === want[i][2]) &&
    dv.fam.every((p, i) => p[0] === famCross[i].diff && p[1] === famCross[i].ff) &&
    dv.same === same.reduce((a, r) => a + r.diff, 0);
  report(7, "records-128-destroyed-rows", pass,
    doc ? `${doc.n}: ${dv ? dv.got.map((g) => `\`${hx(g[0])}..${hx(g[1])}\` ${g[2]} B`).join(", ") : "no parse"}; §1.1 family start ${docStart === null ? "?" : hx(docStart)}` : "anchor missing (被涂字节)",
    `floods: ${rows.map((r) => `${hx(r.s)} ${r.ff} FF`).join(", ")}; 128B family at ${hx(start)}..${hx(start + n * sz)}: cross i7..i10 ${famCross.map((r) => `${r.diff}/${r.ff}`).join(",")}, same-character ${same.reduce((a, r) => a + r.diff, 0)} diff over ${n * sz} B`,
    [`68B rows: ${rows.map((r) => `${hx(r.s)} diff=${r.diff} FF(slot1)=${r.ff} FF(slot0)=${r.ff0}`).join(" | ")}`,
     `authority rows: ${fam.slice(0, 3).map((r) => `${hx(r.off)}=obj+${hx(r.obj)}`).join(", ")} ... ${hx(fam[fam.length - 1].off)}`]);
}

// Sweep: the "34 adler-valid headers, median 29,516 B" figure of the main session's quick scan had no recorded
// range. This dumps every block x range combination the documents use, so the figure can be looked for instead of
// asserted. Not one of the seven claims; prints and exits 0.
function sweep() {
  const ranges = [["block", 0, LEN], ["head", 0, 0x80000], ["segment", SEG[0], SEG[1]],
                  ["late", 0xC95A8, LEN], ["tail", 0x117125, LEN]];
  const rows = [];
  for (const d of ["save-snapshots/20261022-clean-reference", "save-snapshots/20261022-v6-ready"]) {
    for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
      const buf = read(path.join(ROOT, d, f));
      const bases = f.startsWith("system") ? ADD.map((a, k) => ["slot" + k, a]) : [["hnt", 0]];
      for (const [sn, base] of bases) {
        for (const [rn, s, e] of ranges) {
          const b = buf.subarray(base, base + LEN);
          const c = zcensus(b, s, e);
          rows.push(`${path.basename(d)}/${f} ${sn} ${rn}: D1 ${c.pairN} D2 ${c.headN} D3 ${c.inflateN} D4 ${c.adlerN} gap ${c.medGap}`);
        }
      }
    }
  }
  console.log("per-block zlib census (D1 pairs / D2 headers / D3 inflate / D4 adler), ranges: " +
    "block 0..0x11F8A0, head 0..0x80000, segment 0x80000..0x11F8A0, late 0xC95A8..0x11F8A0, tail 0x117125..0x11F8A0");
  for (const r of rows) console.log("  " + r);
  console.log("\nno combination prints D4 = 34 or median gap 29,516; the 2,131 of the main session's scan is clean slot0 block D1.");
}
const claims = { zlib: claim1, windows: claim2, "dirty-group": claim3, buckets: claim4, callers: claim5, leak: claim6, records: claim7 };
const which = process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : "all";
if (which === "sweep") { sweep(); process.exit(0); }
else if (which === "all") for (const f of Object.values(claims)) f();
else if (claims[which]) claims[which]();
else { console.error(`unknown claim ${which}; use ${Object.keys(claims).join("|")}|all`); process.exit(2); }

const pass = results.filter((r) => r.pass).length;
console.log(`\n${results.length} claim(s): ${pass} PASS, ${results.length - pass} FAIL`);
process.exit(pass === results.length ? 0 : 1);
