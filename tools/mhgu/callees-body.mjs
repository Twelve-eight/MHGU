// callees-body.mjs - W6-P128: publish the callee set computed from the CFG-reachable body, WITHOUT touching
// docs/data/functions-retile.csv.gz.
//
// Why a separate file: column 5 (`callees`) of the retile table is the input to every vote channel -
// callvote.mjs, callvote1.mjs's purity table, callervote.mjs and verify-inferred.mjs all read it - so rewriting
// it in place would invalidate attr-callvote* / attr-callervote and re-open the cascade reconciliation in
// W6-P129 in the same breath. Measured 2026-11-06: 374 of a 3000-row sample (12.5%) carry at least one callee
// that the true body never calls, always in the direction of too many, because `end` was the next known start.
//
//   node MHGU/tools/mhgu/callees-body.mjs [--out <path>] [--check]
//
// Output TSV: start, in_table, in_body, added, dropped   (the last four are comma-separated call targets)
// `--check` prints the comparison and the controls without writing.
import fs from "node:fs";
import zlib from "node:zlib";
import { bodyOf, capFor, starts, rd, inText } from "./fn-body.mjs";

const opt = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = opt("--out", "G:/omp works/MHGU/docs/data/functions-callees-body.tsv.gz");
const CHECK = process.argv.includes("--check");
const IN = "G:/omp works/MHGU/docs/data/functions-retile.csv.gz";

const rows = zlib.gunzipSync(fs.readFileSync(IN)).toString().split(/\r?\n/).filter(Boolean).slice(1);
const hex = (n) => "0x" + n.toString(16);

function calleesInBody(s) {
  const body = bodyOf(s, capFor(s, starts));
  const out = new Set();
  for (const a of body) {
    const w = rd(a);
    if (((w >>> 25) & 7) === 5 && ((w >>> 24) & 1) === 1 && ((w >>> 28) & 0xf) !== 0xf) {
      let o = w & 0xffffff; if (o & 0x800000) o -= 0x1000000;
      const t = (a + 8 + (o << 2)) >>> 0;
      if (inText(t)) out.add(t);
    }
  }
  return out;
}

const lines = ["start\tin_table\tin_body\tadded\tdropped"];
let changed = 0, addedEdges = 0, droppedEdges = 0, identical = 0;
const samples = [];
for (const line of rows) {
  const m = /^([^,]+),([^,]+),([^,]+),([^,]+),([^,]*),/.exec(line);
  if (!m) continue;
  const s = parseInt(m[1], 16);
  const table = new Set(m[5] ? m[5].split("|").map((x) => parseInt(x, 16)) : []);
  const body = calleesInBody(s);
  const added = [...body].filter((x) => !table.has(x));
  const dropped = [...table].filter((x) => !body.has(x));
  if (!added.length && !dropped.length) { identical++; continue; }
  changed++; addedEdges += added.length; droppedEdges += dropped.length;
  if (samples.length < 5 && (added.length || dropped.length)) samples.push(`${m[1]}: +${added.length} -${dropped.length} (table ${table.size}, body ${body.size})`);
  lines.push([m[1], [...table].map(hex).join("|"), [...body].map(hex).join("|"), added.map(hex).join("|"), dropped.map(hex).join("|")].join("\t"));
}

console.log(`rows ${rows.length}: identical ${identical}, differ ${changed} (${(100 * changed / rows.length).toFixed(1)}%)`);
console.log(`edges: ${addedEdges} missing from the table, ${droppedEdges} claimed but not called by the body`);
for (const s of samples) console.log("  " + s);
if (!CHECK) {
  fs.writeFileSync(OUT, zlib.gzipSync(Buffer.from(lines.join("\n") + "\n", "utf8"), { level: 9 }));
  console.log(`wrote ${OUT} (${lines.length - 1} rows)`);
} else {
  console.log("(check mode: not written)");
}
