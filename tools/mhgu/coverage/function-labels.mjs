// function-labels.mjs — one row per function saying what it is and why, in a single file.
//
// The tiers, the evidence tables and the ranked channels live in separate files, which makes the numbers auditable but the
// answers awkward to use: anyone asking "what is 0x356c34 and how do you know?" has to join four files by hand. This emits
// that join once. `reason` is the exact sentence the channel recorded, never a summary, so a reader can chase it back.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "function-labels.tsv";

const evidence = new Map(); // start -> {label, conf, file, reason}
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [s, label, conf, reason] = l.split("\t");
    if (!label || label === "unknown") continue;
    const k = s.toLowerCase();
    const prev = evidence.get(k);
    // rank: A beats V beats S, and the first file wins inside a rank so the output is deterministic
    const rank = { A: 3, V: 2, S: 1, B: 0 };
    if (!prev || (rank[conf] || 0) > (rank[prev.conf] || 0)) evidence.set(k, { label, conf, file: f, reason: reason || "" });
  }
}
const tiers = new Map();
for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  tiers.set(c[0].toLowerCase(), { insns: +c[1], tier: c[2], label: c[3] || "", src: c[4] || "" });
}
// ---- tier B adjudications: the same table report.mjs counts, so the two files cannot disagree
const adjud = new Map();
const adjudRank = { A: 3, B: 2, C: 1 };
for (const dir of ["tierb-pass1", "tierb-pass2", "tierb-pass3"]) {
  const d = ROOT + "/docs/analysis/code/" + dir;
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /slice-.*\.md$/.test(x)).sort()) {
    for (const l of fs.readFileSync(d + "/" + f, "utf8").split(/\r?\n/)) {
      const m = /^\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z-]+)\s*\|\s*(\w+)\s*\|\s*([ABC])\s*\|/.exec(l);
      if (!m) continue;
      const k = m[1].toLowerCase();
      if (m[2] === "unknown") continue;
      const prev = adjud.get(k);
      if (!prev || adjudRank[m[4]] > adjudRank[prev.conf]) adjud.set(k, { label: m[2], conf: m[4], src: dir + "/" + f });
    }
  }
}

const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), insns: +c[2] }; });

const rows = [["start", "insns", "label", "provenance", "reason"]];
const counts = new Map();
for (const f of fns) {
  const t = tiers.get(f.s) || { label: "", tier: "", src: "" };
  const ev = evidence.get(f.s);
  let label = t.label, provenance = "", reason = "";
  if (ev && ev.conf === "A") { label = ev.label; provenance = "evidence:" + ev.file; reason = ev.reason; }
  else if (ev && ev.conf === "V") { label = ev.label; provenance = "inferred:" + ev.file; reason = ev.reason; }
  else if (ev && ev.conf === "S") { label = ev.label; provenance = "signature:" + ev.file; reason = ev.reason; }
  else if (label) { provenance = "spread:" + (t.src || "spread"); reason = `tier ${t.tier}, ${t.src || "spread"}`; }
  else if (adjud.has(f.s)) { const a = adjud.get(f.s); label = a.label; provenance = "adjudication:" + a.src; reason = `manual ruling, conf ${a.conf}`; }
  else { provenance = "none"; reason = ""; }
  if (!label) continue;
  counts.set(provenance.split(":")[0], (counts.get(provenance.split(":")[0]) || 0) + 1);
  rows.push([f.s, String(f.insns), label, provenance, reason.replace(/\t/g, " ")]);
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
const labelled = rows.length - 1;
console.log(`wrote ${OUT}: ${labelled} labelled functions of ${fns.length}`);
console.log([...counts].map(([k, v]) => `${k} ${v}`).join(", "));
