// verify-evidence.mjs — re-check what each A row claims, against the binary and the string table.
//
// The coverage number rests on 13,060 rows that each assert something checkable: this function references these strings,
// this vtable slot holds this function start, this constant appears as a movw. The gate checks schema and start addresses;
// it does not re-read the claims. This does, on a sample per channel, so "evidence" means something a second time.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const INV = ROOT + "/docs/analysis/code/inventory/";
const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
const TEXT_END = 0x13f1dec;
const SAMPLE = Number(process.env.SAMPLE || 120);

const strs = new Map();
for (const l of fs.readFileSync(INV + "stringxref.tsv", "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [s, str] = l.split("\t");
  const k = s.toLowerCase();
  if (!strs.has(k)) strs.set(k, new Set());
  strs.get(k).add(str);
}
const fns = new Map(zlib.gunzipSync(fs.readFileSync(ROOT + "/docs/data/functions-retile.csv.gz")).toString("utf8")
  .split(/\r?\n/).filter(Boolean).slice(1).map((l) => { const c = l.split(","); return [c[0].toLowerCase(), { a: parseInt(c[0], 16), n: +c[2] }]; }));

const word = (v) => buf.readUInt32LE(v + 0x100);
const result = new Map();
let skipped = 0;
const bump = (ch, ok, note) => {
  const e = result.get(ch) || { n: 0, ok: 0, bad: [] };
  e.n++;
  if (ok) e.ok++;
  else if (e.bad.length < 4) e.bad.push(note);
  result.set(ch, e);
};

for (const file of ["attr-strings2.tsv", "attr-vtable-fixed.tsv", "attr-vtable-ns.tsv", "attr-vtable-rtti2.tsv", "attr-immscan.tsv", "attr-fingerprint.tsv", "attr-vtable-retile.tsv", "attr-vtable-unknown.tsv", "attr-xref.tsv", "attr-prefix.tsv", "attr-registrar.tsv", "attr-uifamily.tsv", "attr-class.tsv", "attr-class2.tsv", "attr-blocks.tsv", "attr-vtable-classconsensus.tsv"]) {
  const p = INV + file;
  if (!fs.existsSync(p)) continue;
  const rows = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).slice(1)
    .map((l) => l.split("\t")).filter((c) => c[2] === "A");
  if (!rows.length) continue;
  const step = Math.max(1, Math.floor(rows.length / SAMPLE));
  for (let i = 0; i < rows.length; i += step) {
    const [start, label, , evidence] = rows[i];
    const k = start.toLowerCase();
    const f = fns.get(k);
    if (!f) { bump(file, false, `${start}: not in the function table`); continue; }
    // 1. string claims: every named string must appear in this function's references
    // The list follows the label, but the label itself can contain colons inside parentheses ("(nDraw::*, mLight*,
    // rShader*): nDraw::RenderTargetView | ..."), so the list starts after the last ") " when there is one.
    if (/referenced strings/.test(evidence)) {
      const tail = evidence.includes("): ") ? evidence.slice(evidence.lastIndexOf("): ") + 3) : (/:(.+)$/.exec(evidence)?.[1] ?? "");
      const named = tail.split("|").map((s) => s.trim()).filter(Boolean);
      const have = strs.get(k) || new Set();
      const missing = named.filter((s) => !have.has(s));
      bump(file, missing.length === 0, `${start}: strings not referenced: ${missing.slice(0, 3).join(",")}`);
      continue;
    }
    // 1b. a single named string: the function must reference it (attr-xref, attr-prefix)
    const sm = /^(?:class prefix "[^"]*" \([^)]*\) )?in string "([^"]+)"$/.exec(evidence) || /^string "([^"]+)"$/.exec(evidence);
    if (sm) {
      const have = strs.get(k) || new Set();
      // the evidence writer caps long strings at 80 characters ("...cArchiveCa"), so a truncated recording is accepted
      // when it is a prefix of something the function really references - at that length a foreign match is impossible
      const hit = have.has(sm[1]) ||
        (sm[1].length >= 24 && [...have].some((x) => x.startsWith(sm[1])));
      bump(file, hit, `${start}: string not referenced by this function: ${sm[1].slice(0, 60)}`);
      continue;
    }
    // 1c. registrar: the function must call the named registrar stub
    const rm2 = /registrar bl (0x[0-9a-f]+)/.exec(evidence);
    if (rm2) {
      const want = parseInt(rm2[1], 16);
      let found = false;
      for (let j = 0; j < f.n && j < 6000; j++) {
        const w = word(f.a + j * 4);
        if ((w >>> 24) === 0xeb) {   // bl
          const off = w & 0xffffff;
          const target = f.a + j * 4 + 8 + ((off & 0x800000) ? off - 0x1000000 : off) * 4;
          if (target === want) { found = true; break; }
        }
      }
      bump(file, found, `${start}: no bl to 0x${want.toString(16)} in ${f.n} insns`);
      continue;
    }
    // 1d. bracket: the function must lie between the two anchor addresses
    const bm = /methods (0x[0-9a-f]+) \(([-+][0-9]+)\) and (0x[0-9a-f]+) \(([-+][0-9]+)\)/.exec(evidence);
    if (bm) {
      const lo = parseInt(bm[1], 16) + Number(bm[2]);
      const hi = parseInt(bm[3], 16) + Number(bm[4]);
      bump(file, f.a >= Math.min(lo, hi) && f.a <= Math.max(lo, hi), `${start}: outside the bracket [0x${lo.toString(16)},0x${hi.toString(16)}]`);
      continue;
    }
    // 2. vtable claims: the named slot must hold this function start
    const vm = /vtable (0x[0-9a-f]+) slot (\d+)/.exec(evidence);
    if (vm) {
      const v = parseInt(vm[1], 16), slot = Number(vm[2]);
      bump(file, word(v + 4 * slot) === f.a, `${start}: slot ${slot} of ${vm[1]} holds 0x${word(v + 4 * slot).toString(16)}`);
      continue;
    }
    // 3. constant claims: the movw immediate must appear in the function body
    const cm = /constant (0x[0-9a-f]+)/.exec(evidence);
    if (cm) {
      const want = parseInt(cm[1], 16) & 0xffff;
      let found = false;
      for (let j = 0; j < f.n && j < 4000; j++) {
        const w = word(f.a + j * 4);
        // movw: cond 1110, 0011 0000 imm4 imm12
        if (((w >>> 20) & 0xff) === 0x30 && ((w >>> 16) & 0xf) === 0) {
          const imm = ((w >>> 4) & 0xf000) | (w & 0xfff);
          if (imm === want) { found = true; break; }
        }
        if (w === 0xe12fff1e) break; // bx lr is a reasonable end for a leaf scan
      }
      bump(file, found, `${start}: movw #${cm[1]} not found in ${f.n} insns`);
      continue;
    }
    // 4. fingerprint claims: movw 0x1428 must appear
    if (/0x1428/.test(evidence)) {
      let found = false;
      for (let j = 0; j < f.n && j < 4000; j++) {
        const w = word(f.a + j * 4);
        if (((w >>> 20) & 0xff) === 0x30 && (((w >>> 4) & 0xf000) | (w & 0xfff)) === 0x1428) { found = true; break; }
        if (w === 0xe12fff1e) break;
      }
      bump(file, found, `${start}: movw #0x1428 not found in ${f.n} insns`);
      continue;
    }
    skipped++; // no machine-checkable claim in the text (e.g. derived by class name or a taxonomy decision)
  }
}
let total = 0, ok = 0;
for (const [ch, e] of [...result].sort()) {
  total += e.n; ok += e.ok;
  console.log(`${ch.padEnd(24)} ${e.ok}/${e.n} re-checked${e.bad.length ? "  FAIL samples: " + e.bad.join(" | ") : ""}`);
}
console.log(`total ${ok}/${total} = ${((100 * ok) / (total || 1)).toFixed(1)}% of A rows with a machine-checkable claim re-verified`);
console.log(`${skipped} further A rows carry no machine-checkable claim (class-name or taxonomy basis) and are not counted above`);
