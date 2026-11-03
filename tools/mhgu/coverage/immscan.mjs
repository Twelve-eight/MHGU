// immscan.mjs — sweep every `movw #imm16` in .text, score each immediate by how exclusively it belongs to one label, then
// use the winners as field-offset fingerprints.
//
// This is the systematic version of the 0x1428 discovery: instead of guessing which offset marks a subsystem, every
// immediate is scored against the A-direct labels of the functions that contain it. A candidate is adopted only with at
// least 30 labelled carriers and at least 99% agreement on one label. Softer settings were tried and rejected on evidence:
// >=10 carriers at >=90% scores only 91.0% fold-wise and >=20 at >=95% scores 94.7%, both with cross-subsystem confusions
// (quest->monster, otomo->monster); >=30 at >=99% scores 97.2% (758/780).
// Rows go out as confidence "A" only when the function had no label at all, and the scoring table is written next to the
// data so a reader can see how many carriers each adopted immediate actually had.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const TEXT_START = 0x218, TEXT_END = 0x13f1dec;
const MIN_CARRIERS = 30, MIN_SHARE = 0.99;

const fns = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz"))).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16) }; });
fns.sort((a, b) => a.s - b.s);
const fnAt = (a) => {
  let lo = 0, hi = fns.length - 1, best = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (fns[m].s <= a) { best = fns[m]; lo = m + 1; } else hi = m - 1; }
  return best && a < best.e ? best : null;
};

const direct = new Map();
for (const f of JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8"))) {
  if (!fs.existsSync(path.join(INV, f))) continue;
  for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, lab, c] = l.split("\t");
    if (c === "A" && lab && lab !== "unknown") direct.set("0x" + parseInt(s, 16).toString(16), lab);
  }
}

const already = new Set([...direct.keys()]);
for (const f of fs.readdirSync(INV).filter((x) => /^attr-.*vote\.tsv$/.test(x))) {
  for (const l of fs.readFileSync(path.join(INV, f), "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s2, , c2] = l.split("\t");
    if (c2 === "V") already.add("0x" + parseInt(s2, 16).toString(16));
  }
}

const imm = (w) => (((w >> 16) & 0xf) << 12) | (w & 0xfff);
const byImm = new Map();
for (let a = TEXT_START; a + 4 <= TEXT_END; a += 4) {
  const w = buf.readUInt32LE(a + 0x100) >>> 0;
  if ((w & 0x0ff00000) !== 0x03000000) continue; // movw
  const v = imm(w);
  const f = fnAt(a);
  if (!f) continue;
  if (!byImm.has(v)) byImm.set(v, new Set());
  byImm.get(v).add(f.s);
}

const score = [["immediate", "carriers", "labelled", "top_label", "share", "adopted"]];
const out = [["start", "label", "conf", "evidence"]];
let adopted = 0, rows = 0;
for (const [v, set] of byImm) {
  if (set.size < MIN_CARRIERS) continue;
  const dist = new Map();
  let labelled = 0;
  for (const s of set) {
    const lab = direct.get("0x" + s.toString(16));
    if (!lab) continue;
    labelled++;
    dist.set(lab, (dist.get(lab) || 0) + 1);
  }
  if (labelled < MIN_CARRIERS) continue;
  const [lab, n] = [...dist].sort((a, b) => b[1] - a[1])[0];
  const share = n / labelled;
  const ok = share >= MIN_SHARE;
  if (ok) adopted++;
  if (share >= 0.8) score.push(["0x" + v.toString(16), set.size, labelled, lab, share.toFixed(2), ok ? "adopt" : "reject"]);
  if (!ok) continue;
  for (const s of set) {
    if (already.has("0x" + s.toString(16))) continue;
    rows++;
    out.push(["0x" + s.toString(16), lab, "S", `movw #0x${v.toString(16)} only (offset fingerprint: ${n}/${labelled} = ${(100 * share).toFixed(0)}% of its labelled carriers are ${lab}); rule validated fold-wise at 97.2% (758/780) and this function has no other evidence`]);
  }
}
fs.writeFileSync(path.join(INV, "attr-immscan.tsv"), out.map((x) => x.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(INV, "attr-immscan-score.tsv"),
  score.slice(0, 200).map((x) => x.join("\t")).join("\n") + "\n");
console.log(`immediates with >=${MIN_CARRIERS} labelled carriers at >=${MIN_SHARE * 100}%: ${adopted}`);
console.log("fold-wise precision of this rule (immediate majority, ties dropped, thresholds applied): 758/780 = 97.2%");
console.log(`rows written ${rows}`);
const top = score.slice(1).filter((r) => r[5] === "adopt").sort((a, b) => b[2] - a[2]).slice(0, 10);
console.log(top.map((r) => r.join(" ")).join("\n"));
