// inventory-numbers.mjs — re-measure the numbers the W6 audit found drifted and W7 corrected.
//
// Read-only: it opens the committed tables and the function list and prints the cells, so a reader of
// docs/analysis/audit/W7-INVENTORY-FIXES.md can re-run one command instead of trusting the prose. Each block is one
// defect: A the METER channel table, B the A-direct conflict count, D the vtable union, E the 0x7bb638 hub,
// G the bverify pilot's string visibility, H the batchA prefix remap. The other three numbers (offset-signature,
// member-seeds, ctor-vtable) belong to tools of their own and W7 quotes their output verbatim.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INV = ROOT + "/docs/analysis/code/inventory/";
const rd = (p) => fs.readFileSync(INV + p, "utf8").trim().split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split("\t"));

console.log("== A. channel table rows");
for (const f of ["attr-prefix.tsv", "attr-uifamily.tsv", "attr-strings2.tsv", "attr-registrar.tsv"]) {
  const rows = rd(f);
  const real = rows.filter((r) => r[1] !== "unknown");
  console.log(f.padEnd(20), `rows ${rows.length}`, `A ${rows.filter((r) => r[2] === "A").length}`,
    `real-label rows ${real.length}`, `real-label functions ${new Set(real.map((r) => r[0])).size}`);
}
const uf = rd("attr-uifamily.tsv");
const kind = (r) => (r[3].startsWith("ctor:") ? "ctor" : r[3].startsWith("slot:") ? "slot" : "other");
const comp = (rows) => rows.reduce((a, r) => ((a[kind(r)] = (a[kind(r)] || 0) + 1), a), {});
console.log("uifamily A composition", JSON.stringify(comp(uf.filter((r) => r[2] === "A"))), "all", JSON.stringify(comp(uf)));

console.log("\n== B. A-direct conflicts");
{
  const srcs = JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"));
  const m = new Map();
  for (const f of srcs) for (const c of rd(f)) { if (c[2] !== "A" || c[1] === "unknown") continue; (m.get(c[0]) || m.set(c[0], new Set()).get(c[0])).add(c[1]); }
  let multi = 0; const pair = {};
  for (const [, labs] of m) if (labs.size > 1) { multi++; const key = [...labs].sort().join("+"); pair[key] = (pair[key] || 0) + 1; }
  console.log(`A-direct starts ${m.size} with >=2 labels ${multi} (${(100 * multi / m.size).toFixed(2)}%)`);
  console.log("top pairs:", Object.entries(pair).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a, b]) => `${a}=${b}`).join(" "));
}

console.log("\n== E. hub 0x7bb638");
{
  const lines = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString().split(/\r?\n/).filter(Boolean);
  const h = lines[0].split(","); const ci = h.indexOf("callees");
  const tiers = new Map();
  for (const l of fs.readFileSync(INV + "tiers-merged.csv", "utf8").split(/\r?\n/).slice(1).filter(Boolean)) { const c = l.split(","); tiers.set(c[0], c[3] || ""); }
  const callers = []; let sites = 0;
  for (const l of lines.slice(1)) { const c = l.split(","); const arr = (c[ci] || "").split("|"); const n = arr.filter((x) => x === "0x7bb638").length; if (n) { callers.push(c[0]); sites += n; } }
  const dist = {};
  for (const s of callers) { const lab = tiers.get(s) || "(unlabelled)"; dist[lab] = (dist[lab] || 0) + 1; }
  console.log(`callers ${callers.length} call sites ${sites}`);
  console.log(Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(", "));
}

console.log("\n== G. bverify pilot vs stringxref");
{
  const pilot = rd("attr-bverify-pilot.tsv");
  const sx = new Map();
  for (const r of rd("stringxref.tsv")) { if (!sx.has(r[0])) sx.set(r[0], []); sx.get(r[0]).push(r[1]); }
  const isCls = (s) => /^[a-z]{1,3}[A-Z][A-Za-z0-9_]*$/.test(s) || /^m[A-Z]/.test(s);
  let has = 0, cls = 0;
  for (const r of pilot) { const ss = sx.get(r[0]); if (!ss) continue; has++; if (ss.some(isCls)) cls++; }
  const t = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString().split(/\r?\n/).filter(Boolean);
  const split = (line) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === "\"") { if (line[i + 1] === "\"") { cur += "\""; i++; } else q = false; } else cur += ch; } else if (ch === "\"") q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
  const hh = split(t[0]); const si = hh.indexOf("start"), stri = hh.indexOf("strings");
  const map = new Map(); for (const l of t.slice(1)) { const c = split(l); map.set(c[si], c[stri]); }
  const ne = pilot.filter((r) => (map.get(r[0]) || "").trim());
  console.log(`stringxref rows ${has}/60, class-or-field name ${cls}/60; retile strings non-empty ${ne.length}: ${ne.map((r) => r[0] + "=" + map.get(r[0])).join(", ")}`);
}

console.log("\n== H. batchA prefix remap");
{
  const md = fs.readFileSync(ROOT + "/docs/analysis/code/batchA-classname-xref.md", "utf8").split(/\r?\n/);
  const rows = [];
  for (const l of md) { const m = l.match(/^\|\s*(0x[0-9a-f]+)\s*\|\s*([a-z-]+)\s*\|\s*(\d+)\s*\|\s*([^|]*)\|$/); if (m) rows.push({ fn: parseInt(m[1], 16), insns: +m[3], names: m[4].trim() }); }
  const mp = fs.readFileSync(ROOT + "/docs/analysis/code/classprefix-map.tsv", "utf8").trim().split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split("\t"));
  const prefixes = mp.map((r) => [r[0], r[1]]).sort((a, b) => b[0].length - a[0].length);
  const labOf = (r) => { for (const n of r.names.split(",").map((s) => s.trim()).filter(Boolean)) for (const [p, l] of prefixes) if (n.startsWith(p)) return l; return "none"; };
  const regs = fs.readFileSync(INV + "tiers.csv", "utf8").split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), tier: c[2], label: c[3] }; }).sort((a, b) => a.s - b.s);
  const near = (a) => { let lo = 0, hi = regs.length - 1, b = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (regs[m].s <= a) { b = regs[m]; lo = m + 1; } else hi = m - 1; } return b; };
  let inA = 0, agree = 0, bandN = 0, outN = 0, outAg = 0; const band = {};
  for (const r of rows) { const g = near(r.fn); if (!g || g.tier !== "A" || !g.label) continue; const l = labOf(r); inA++; if (g.label === l) agree++; if (g.label === "otomo-ot") { bandN++; band[l] = (band[l] || 0) + 1; } else { outN++; if (g.label === l) outAg++; } }
  console.log(`rows ${rows.length} insns ${rows.reduce((a, r) => a + r.insns, 0)}; prefixes ${mp.length}; labelled ${rows.filter((r) => !["unknown", "none"].includes(labOf(r))).length}; in tier A ${inA}, agree ${agree} (${(100 * agree / inA).toFixed(1)}%)`);
  console.log(`otomo band ${bandN} ${JSON.stringify(band)}; outside ${outN} agree ${outAg} (${(100 * outAg / outN).toFixed(1)}%)`);
}

console.log("\n== D. vtable union");
{
  const files = fs.readdirSync(INV).filter((f) => /^attr-vtable.*\.tsv$/.test(f));
  const V = new Set();
  for (const f of files) for (const c of rd(f)) { const m = c[3] && c[3].match(/vtable (0x[0-9a-f]+)/); if (m) V.add(m[1]); }
  console.log(`files ${files.length}, distinct vtable addresses ${V.size}`);
}
