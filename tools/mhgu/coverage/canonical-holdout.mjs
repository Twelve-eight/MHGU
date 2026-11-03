// canonical-holdout.mjs — how accurate is Tier A, the number the project's goal is defined on?
//
// HANDOFF §5 defines the goal as "Tier A + Tier B conf=A over .text instructions". Tier A's accuracy was measured on
// 2026-10-23 against held-out string seeds (94.7%); the function table has been retiled since, so this re-measures it the
// same way the rest of the pipeline measures anything: hold out a region's evidence, rebuild the tiers without it, and ask
// whether the rule recovers the held-out rows as tier A.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory";
const TMP = path.join(ROOT, ".tmp-holdout");
const sources = JSON.parse(fs.readFileSync(path.join(INV, "sources.json"), "utf8")).filter((f) => !/vote\d*\.tsv$/.test(f));
fs.mkdirSync(TMP, { recursive: true });

// The spine must not move: recompute is invoked 100 times here and a single misdirected write would corrupt what report.mjs
// and the audit gate read. Record its hash and refuse to finish if it changed.
const SPINE = path.join(INV, "tiers-merged.csv");
const spineHash = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const spineBefore = spineHash(SPINE);
const WIN = 0x100000;
const OFFSETS = [0, 0x20000, 0x40000, 0x60000, 0x80000];
let ok = 0, n = 0, okTierAB = 0;
const seen = new Map();

for (const off of OFFSETS) {
  for (let w = off; w < 0x1400000; w += WIN) {
    // split every seed file into inside/outside the window
    const kept = [];
    const held = [];
    for (const f of sources) {
      const p = path.join(INV, f);
      if (!fs.existsSync(p)) continue;
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
      const out = [lines[0]];
      for (const l of lines.slice(1)) {
        const a = parseInt(l.split("\t")[0], 16);
        if (Number.isFinite(a) && a >= w && a < w + WIN) held.push(l);
        else out.push(l);
      }
      const tf = path.join(TMP, f);
      fs.writeFileSync(tf, out.join("\n") + "\n");
      kept.push("--seed", tf);
    }
    if (!held.length) continue;
    // --out is mandatory here: without it recompute writes tiers-merged.csv, the committed spine that report.mjs and the
    // gate read, and every fold would leave a partially-seeded spine behind.
    const out = path.join(TMP, "tiers-fold.csv");
    execFileSync(process.execPath, ["tools/mhgu/coverage/recompute.mjs", "--functions", "docs/data/functions-retile.csv.gz", ...kept, "--out", out], { cwd: ROOT, stdio: "ignore" });
    const tiers = new Map();
    for (const l of fs.readFileSync(out, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
      const c = l.split(",");
      tiers.set(c[0].toLowerCase(), c[2]);
    }
    for (const l of held) {
      const c = l.split("\t");
      if (c[2] !== "A" || !c[1]) continue; // only real evidence rows are truth
      const s = c[0].toLowerCase();
      const t = tiers.get(s);
      const key = `${s}|${off}`;
      if (seen.has(s)) continue; // dedupe across grids
      seen.set(s, 1);
      n++;
      if (t === "A") { ok++; okTierAB++; }
      else if (t === "B") okTierAB += 0; // kept separate on purpose
    }
  }
}
const cp = (o, m) => { if (!m) return 0; const p = o / m, z = 1.959963985, d = 1 + z * z / m; return ((p + z * z / (2 * m) - z * Math.sqrt((p * (1 - p)) / m + z * z / (4 * m * m))) / d) * 100; };
if (spineHash(SPINE) !== spineBefore) { console.error("FAIL: tiers-merged.csv changed during the holdout"); process.exitCode = 1; }
console.log(`held-out evidence rows recovered as tier A: ${ok}/${n} = ${((100 * ok) / (n || 1)).toFixed(1)}%  CP95 ${cp(ok, n).toFixed(1)}%`);
fs.rmSync(TMP, { recursive: true, force: true });
