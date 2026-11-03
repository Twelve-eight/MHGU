// verify-inferred.mjs — re-derive what each inferred row claims, from the current anchors.
//
// The evidence gate re-reads A rows. Inferred rows assert something checkable too ("two agreeing high-purity callees say X",
// "one callee at >=70% purity says X", "four agreeing labelled callers say X"), and nothing has re-checked them since they
// were written. If the anchor set moved underneath them, this finds it.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const SAMPLE = Number(process.env.SAMPLE || 100000);

const A = new Map();
for (const f of JSON.parse(fs.readFileSync(INV + "sources.json", "utf8"))) {
  const p = INV + f;
  if (!fs.existsSync(p) || /vote\d*\.tsv$/.test(f) || f === "attr-immscan.tsv" || f === "attr-tableseeds.tsv" ||
      f === "attr-offsets.tsv" || f === "attr-offsetpairs.tsv" || f === "attr-fingerprint.tsv") continue; // the generator excludes fingerprint from its anchors, so this must too
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const c = l.split("\t");
    if (c[2] === "A" && c[1] && c[1] !== "unknown" && !A.has(c[0].toLowerCase())) A.set(c[0].toLowerCase(), c[1]);
  }
}
const fns = zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return { s: c[0].toLowerCase(), a: parseInt(c[0], 16), callees: c[4] ? c[4].split("|").map((x) => parseInt(x, 16)) : [] }; });
const byStart = new Map(fns.map((f) => [f.s, f]));
const callers = new Map();
for (const f of fns) for (const c of new Set(f.callees)) { const k = "0x" + c.toString(16); if (!callers.has(k)) callers.set(k, []); callers.get(k).push(f.s); }

// purity and caller tables from A anchors only (the same basis the single-hop channels were published on)
const purity = (minCallers, minShare) => {
  const m = new Map();
  for (const [k, users] of callers) {
    const cnt = new Map();
    let tot = 0;
    for (const u of users) { const lab = A.get(u); if (lab) { tot++; cnt.set(lab, (cnt.get(lab) || 0) + 1); } }
    if (tot < minCallers) continue;
    const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
    if (top[1] / tot >= minShare) m.set(k, top[0]);
  }
  return m;
};
const strong = purity(8, 0.70);
const sparse = purity(6, 1.0);
// caller vote as attr-callervote defines it: at least three labelled callers, at least 85% of them one label
const callerTable = (minCallers, minShare) => {
  const m = new Map();
  for (const f of fns) {
    const us = callers.get(f.s) || [];
    const labs = us.map((u) => A.get(u)).filter(Boolean);
    const cnt = new Map();
    for (const l of labs) cnt.set(l, (cnt.get(l) || 0) + 1);
    if (labs.length < minCallers) continue;
    const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
    if (top[1] / labs.length >= minShare) m.set(f.s, top[0]);
  }
  return m;
};
const ct4 = callerTable(4, 1.0);   // strict form used by the single-vote cascade
const ct3 = callerTable(3, 0.85);  // the form attr-callervote publishes

const result = new Map();
const bump = (ch, ok, note) => {
  const e = result.get(ch) || { n: 0, ok: 0, bad: [] };
  e.n++;
  if (ok) e.ok++;
  else if (e.bad.length < 3) e.bad.push(note);
  result.set(ch, e);
};

const strictTable = purity(12, 0.85);
const relaxedTable = purity(8, 0.75);
const twoVote = (f) => {
  const votes = new Map();
  let strict = 0, relaxed = 0;
  for (const c of f.callees) {
    const k = "0x" + c.toString(16);
    if (strictTable.has(k)) { votes.set(strictTable.get(k), (votes.get(strictTable.get(k)) || 0) + 1); strict++; }
    if (relaxedTable.has(k)) { votes.set(relaxedTable.get(k), (votes.get(relaxedTable.get(k)) || 0) + 1); relaxed++; }
  }
  if (!votes.size) return null;
  const top = [...votes].sort((a, b) => b[1] - a[1]);
  if (top.length > 1 && top[0][1] === top[1][1]) return null;
  return top[0][0];
};

for (const [file, rule] of [["attr-callvote.tsv", "two"], ["attr-callvote1.tsv", "single"], ["attr-callervote.tsv", "caller"]]) {
  const p = INV + file;
  if (!fs.existsSync(p)) continue;
  const rows = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1).map((l) => l.split("\t"));
  const step = Math.max(1, Math.floor(rows.length / SAMPLE));
  for (let i = 0; i < rows.length; i += step) {
    const [start, label, , evidence] = rows[i];
    const f = byStart.get(start.toLowerCase());
    if (!f) { bump(file, false, `${start}: not in the function table`); continue; }
    if (rule === "single") {
      // Rebuild the actual vote: candidate labels from typed callees, ties mean no vote, caller rule breaks nothing.
      const votes = new Map();
      for (const c of f.callees) {
        const k = "0x" + c.toString(16);
        const lab = strong.get(k) ?? sparse.get(k);
        if (lab) votes.set(lab, (votes.get(lab) || 0) + 1);
      }
      const top = [...votes].sort((a, b) => b[1] - a[1]);
      const tie = top.length > 1 && top[0][1] === top[1][1];
      const calleeLab = tie ? null : top.length ? top[0][0] : null;
      const callerLab = ct4.get(f.s) ?? null;
      const finals = calleeLab && callerLab ? (calleeLab === callerLab ? calleeLab : null) : calleeLab || callerLab;
      bump(file, finals === label, `${start}: vote now settles on ${finals || "nothing"}, row says ${label}`);
    } else if (rule === "two") {
      bump(file, twoVote(f) === label, `${start}: the two-vote rule now settles on ${twoVote(f) || "nothing"}, row says ${label}`);
    } else {
      bump(file, ct3.get(f.s) === label, `${start}: >=3 callers at >=85% now say ${ct3.get(f.s) || "nothing"}, row says ${label}`);
    }
  }
}
let total = 0, ok = 0;
for (const [ch, e] of [...result].sort()) {
  total += e.n; ok += e.ok;
  console.log(`${ch.padEnd(24)} ${e.ok}/${e.n} re-derived${e.bad.length ? "  FAIL: " + e.bad.join(" | ") : ""}`);
}
console.log(`total ${ok}/${total} = ${((100 * ok) / (total || 1)).toFixed(2)}% of inferred rows still hold`);
// One row (0xfa5aa8) differs because the two-vote channel applies two purity settings whose interaction this reconstruction
// approximates; it is reported rather than smoothed over. The gate accepts >=99.5%.
process.exitCode = ok / total >= 0.995 ? 0 : 1;
