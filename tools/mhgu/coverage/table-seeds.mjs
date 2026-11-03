// table-seeds.mjs — attribute functions through the pointer tables they sit in.
//
// table-consensus.mjs measured the rule before it was allowed to emit anything: when every already-labelled member of a
// function-pointer run agrees on one subsystem, the run's other members are 94.1% (one labelled member, CP95 92.5) to
// 100% (four or more, CP95 97.3) that same subsystem; runs whose labelled members disagree are 45.1% and are skipped
// entirely. This covers callback arrays and dispatch lists that carry no RTTI, which the vtable channel cannot see.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const OUT = INV + "attr-tableseeds.tsv";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;

const starts = new Set(zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split(",")[0].toLowerCase()));
const startAddr = new Map([...starts].map((s) => [parseInt(s, 16), s]));
const isFn = (w) => w > 0x100 && w < TEXT_END && startAddr.has(w);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/^attr-tableseeds\.tsv$/.test(f)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}

const rows = [["start", "label", "conf", "evidence"]];
let runs = 0, emitted = 0, mixed = 0;
for (let i = 0; i + 12 <= buf.length;) {
  const vaddr = i + 0x100;
  if (vaddr < TEXT_END) { i += 4; continue; }
  if (!isFn(buf.readUInt32LE(i))) { i += 4; continue; }
  const start = i, members = [];
  while (i + 4 <= buf.length && isFn(buf.readUInt32LE(i))) { members.push(buf.readUInt32LE(i)); i += 4; }
  if (members.length < 3) continue;
  runs++;
  const votes = new Map();
  for (const m of members) {
    const lab = A.get(startAddr.get(m));
    if (lab) votes.set(lab, (votes.get(lab) || 0) + 1);
  }
  if (!votes.size) continue;
  if (votes.size > 1) { mixed++; continue; } // disagreement inside one table: say nothing
  const label = [...votes.keys()][0];
  const support = [...votes.values()][0];
  for (const m of members) {
    const s = startAddr.get(m);
    if (A.has(s)) continue; // already has evidence: never restate it
    rows.push([s, label, "V", `pointer table at 0x${(start + 0x100).toString(16)}: ${support} labelled member(s) all say ${label}`]);
    emitted++;
  }
}
fs.writeFileSync(OUT, rows.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`pointer runs ${runs}, skipped as mixed ${mixed}, emitted ${emitted} rows -> ${OUT.split("/").pop()}`);
