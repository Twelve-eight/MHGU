// class-single-anchor.mjs — is one labelled method enough to attribute the rest of its class?
//
// classvote needs several labelled members before it trusts a class. A class is still a strong grouping though: its methods
// share the object they operate on. This measures held-out accuracy when a class is anchored by exactly ONE A-labelled
// member, which is the population classvote leaves untouched.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const MIN_MEMBERS = Number(process.env.MIN_MEMBERS || 3);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  if (/vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" || f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv" || f === "attr-fingerprint.tsv") continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
// function -> vtable address, from the vtable evidence
const classOf = new Map();
for (const f of ["attr-vtable-retile.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv"]) {
  const p = INV + f;
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    const m = /vtable (0x[0-9a-f]+)/.exec(c[3] || "");
    if (m && !classOf.has(c[0].toLowerCase())) classOf.set(c[0].toLowerCase(), m[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16) }; });
const byClass = new Map();
for (const f of fns) {
  const v = classOf.get(f.s);
  if (!v) continue;
  if (!byClass.has(v)) byClass.set(v, []);
  byClass.get(v).push(f.s);
}
const cp = (o, n) => { if (!n) return 0; const p = o / n, z = 1.959963985, d = 1 + z * z / n; return ((p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d) * 100; };
const WIN = 0x100000;
const buckets = new Map();
for (const w0 of [0, 0x20000, 0x40000, 0x60000, 0x80000]) {
  for (let w = w0; w < 0x1400000; w += WIN) {
    const inWin = (s) => { const f = fns.find((x) => x.s === s); return f && f.a >= w && f.a < w + WIN; };
    const pos = new Map(fns.map((f) => [f.s, f.a]));
    const inside = (s) => { const a = pos.get(s); return a !== undefined && a >= w && a < w + WIN; };
    for (const [v, members] of byClass) {
      if (members.length < MIN_MEMBERS) continue;
      // The population that gets emitted is "a class whose labelled members all agree". Selecting on the number of MEMBERS
      // outside the window (as the first version did) measures only classes that straddle a window boundary, because a
      // vtable is contiguous and its members sit in one region. Select on the number of LABELLED members instead.
      const anchors = members.filter((m) => !inside(m) && A.has(m));
      if (anchors.length !== 1) continue;            // exactly one labelled anchor outside the window
      const lab = A.get(anchors[0]);
      for (const m of members) {
        if (!inside(m)) continue;
        const truth = A.get(m);
        if (!truth) continue;
        const key = members.length >= 10 ? "class>=10" : "class<10";
        const e = buckets.get(key) || { n: 0, ok: 0 };
        e.n++;
        if (truth === lab) e.ok++;
        buckets.set(key, e);
      }
    }
  }
}
for (const [k, e] of [...buckets].sort()) console.log(`${k}: ${e.ok}/${e.n} = ${((100 * e.ok) / e.n).toFixed(1)}%  CP95 ${cp(e.ok, e.n).toFixed(1)}%`);
if (!buckets.size) console.log("no class with exactly one outside anchor and an inside A row");
