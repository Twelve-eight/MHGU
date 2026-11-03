// dup-channel.mjs — duplicate machine code as a label source: measured, then rejected (2026-11-04).
//
// Idea: template instantiation and copy-paste leave many functions identical once address-bearing immediates are masked, so
// an unlabelled function could inherit a labelled twin's subsystem. The rule was measured before being wired into
// `sources.json` and it does not pay: the loose (majority) form decides 1,376 rows at 85.5%, and the strict (unanimous)
// form reaches 92.2% but transfers only 326 unlabelled functions / 3,048 instructions, which is 0.06 points of the
// denominator. Among already-labelled rows the same rule confirms 39 and contradicts 52 -- a signal weaker than its own
// headline precision. Kept so the next session does not rebuild it.
//
// Normalisation: branch displacement, pc-relative load/store offsets, movw/movt immediates and adr are replaced by tokens;
// the condition field is kept, because `ldrne` is not the same code as `ldr`.
import fs from "node:fs";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const IMG = fs.readFileSync(ROOT + "/main.140.flat.bin");
const BIAS = 0x100;
const w32 = (vaddr) => IMG.readUInt32LE(vaddr + BIAS);

const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16), n: +c[2] }; });
const ins = new Map(fns.map((f) => [f.s, f.n]));

const tier = new Map();
for (const l of fs.readFileSync(ROOT + "/docs/analysis/code/inventory/tiers-merged.csv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const c = l.split(",");
  tier.set(parseInt(c[0], 16), { t: c[2], label: c[3] });
}
const isA = (x) => x && x.t === "A" && x.label && x.label !== "unknown";

function token(w) {
  if ((w & 0x0e000000) === 0x0a000000) return "BR" + ((w >>> 24) & 1);          // b / bl / blx immediate
  if ((w & 0x0e000f00) === 0x08000f00) return "PCMEM" + ((w >>> 20) & 0x1f) + "." + ((w >>> 12) & 0x0f); // ldr/str [pc]
  if ((w & 0x0fb00000) === 0x03000000) return "MOV16" + ((w >>> 20) & 0x0f);     // movw / movt
  if ((w & 0x0fff0000) === 0x028f0000 || (w & 0x0fff0000) === 0x024f0000) return "ADR";
  return w.toString(16).padStart(8, "0");
}

const groups = new Map();
let skipped = 0;
for (const f of fns) {
  if (f.e <= f.s || f.e - f.s > 0x4000) { skipped++; continue; }
  const parts = [];
  let ok = true;
  for (let a = f.s; a < f.e; a += 4) {
    try { parts.push(token(w32(a))); } catch { ok = false; break; }
  }
  if (!ok) { skipped++; continue; }
  const k = parts.join(",");
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(f.s);
}

// 1. loose rule: majority of the other labelled members
let lo = 0, lb = 0, ln = 0;
// 2. strict rule: predict only when the other labelled members are unanimous
let so = 0, sb = 0, sn = 0;
for (const [, members] of groups) {
  if (members.length < 2) continue;
  for (const m of members) {
    const self = tier.get(m);
    if (!isA(self)) continue;
    const others = members.filter((x) => x !== m).map((s) => tier.get(s)).filter(isA);
    if (!others.length) continue;
    const tally = new Map();
    for (const o of others) tally.set(o.label, (tally.get(o.label) || 0) + 1);
    const [top, cnt] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (cnt * 2 > others.length) { if (top === self.label) lo++; else lb++; } else ln++;
    if (tally.size === 1) { if (top === self.label) so++; else sb++; } else sn++;
  }
}

// 3. yield: what the rule could actually transfer, and what it says about rows that already carry a label
let pureGroups = 0, unlabFns = 0, unlabIns = 0, agree = 0, agreeIns = 0, contra = 0;
for (const [, members] of groups) {
  if (members.length < 2) continue;
  const lab = new Set();
  for (const s of members) { const t = tier.get(s); if (isA(t)) lab.add(t.label); }
  if (lab.size !== 1) continue;
  pureGroups++;
  const L = [...lab][0];
  for (const s of members) {
    const t = tier.get(s);
    if (!t || !t.label || t.label === "unknown") { unlabFns++; unlabIns += ins.get(s) || 0; }
    else if (!isA(t)) { if (t.label === L) { agree++; agreeIns += ins.get(s) || 0; } else contra++; }
  }
}

console.log(`functions ${fns.length}, skipped ${skipped}, distinct code shapes ${groups.size}`);
console.log(`loose (majority): decided ${lo + lb}, correct ${lo} = ${(100 * lo / Math.max(1, lo + lb)).toFixed(1)}%, wrong ${lb}, no majority ${ln}`);
console.log(`strict (unanimous): decided ${so + sb}, correct ${so} = ${(100 * so / Math.max(1, so + sb)).toFixed(1)}%, wrong ${sb}, abstained ${sn}`);
console.log(`unanimous groups ${pureGroups}; transferable unlabelled ${unlabFns} functions (${unlabIns} instructions, ${(100 * unlabIns / 5228277).toFixed(2)}% of the denominator)`);
console.log(`already-labelled rows: confirmed ${agree} (${agreeIns} instructions), contradicted ${contra}`);
console.log("verdict: rejected as a coverage channel -- the strict form is just under the bar and moves 0.06 points, and it");
console.log("contradicts more labelled rows than it confirms, so identity of machine code is weaker evidence than it looks.");
