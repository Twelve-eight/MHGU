// attr-vtable-registrar-fix.mjs - make the `registrar 0x...` token in attr-vtable-retile.tsv name the
// function that actually owns the registrar site (the downstream half of W6-P127).
//
// W6-P127 fixed `docs/data/class-inventory.tsv` (registrar_fn = the function whose CFG-reachable body owns
// registrar_site; 3,143 / 3,200 rows rewritten). `inventory/attr-vtable-retile.tsv` was generated before
// that fix and still quotes the old ancestor address in its evidence prose - LINK-STATUS W6-P127:
// "STALE DOWNSTREAM: attr-vtable-retile.tsv still quotes the old value (line 3904 says cResourceSample
// registrar 0x381738) - regenerate it with its own pass before citing."
//
// Why this cannot change a label or a vote (checked against both consumers, 2026-11-06):
//   coverage/classvote.mjs:18   -> clsOf uses /^(\S+)/ on the evidence, i.e. the CLASS NAME only;
//   coverage/relabel-vtable.mjs -> cls() uses /([A-Za-z_][\w:]*)\s+registrar/, again the name only.
// Neither reads the hex address, so rewriting the address is inert to the vote channels and to the
// derived attr-vtable-fixed.tsv. That is the acceptance condition: the diff must be confined to the
// stale registrar address in the evidence column, columns 1-3 byte-identical, and no channel re-run.
//
//   node MHGU/tools/mhgu/attr-vtable-registrar-fix.mjs            # report only (default)
//   node MHGU/tools/mhgu/attr-vtable-registrar-fix.mjs --write    # rewrite in place
//   node MHGU/tools/mhgu/attr-vtable-registrar-fix.mjs --selftest # synthetic controls
//
// Exit codes: 0 = as asked, 1 = a guard failed (site mismatch / unknown class / self-test failure).
import fs from "node:fs";

const ROOT = "G:/omp works/MHGU";
const CI = `${ROOT}/docs/data/class-inventory.tsv`;
// Every published table that quotes a `registrar 0x...` in its evidence prose. attr-vtable-retile.tsv is
// the upstream one; attr-vtable-fixed.tsv (sources.json item 4) and attr-vtable-unknown.tsv are generated
// from it by later passes and carried the same stale addresses (measured 2026-11-06: 3,807/3,852 and
// 3,201/3,244), so fixing only the upstream file would leave three tables disagreeing with
// class-inventory.tsv. None of these consumers parses the address (see the note above), so all three are
// token-only edits under the same column-1-3 invariant.
const FILES = (() => {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === "--file" && process.argv[i + 1]) out.push(process.argv[i + 1]);
  return out.length ? out : [
    `${ROOT}/docs/analysis/code/inventory/attr-vtable-retile.tsv`,
    `${ROOT}/docs/analysis/code/inventory/attr-vtable-fixed.tsv`,
    `${ROOT}/docs/analysis/code/inventory/attr-vtable-unknown.tsv`,
  ];
})();

const hex = (v) => "0x" + parseInt(v, 16).toString(16);
const WRITE = process.argv.includes("--write");
const SELFTEST = process.argv.includes("--selftest");

// ---- class-inventory: name -> { fn, site } -------------------------------------------------
export function loadInventory(path = CI) {
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const hdr = lines[0].split("\t");
  const iName = hdr.indexOf("name"), iSite = hdr.indexOf("registrar_site"), iFn = hdr.indexOf("registrar_fn");
  if (iName < 0 || iSite < 0 || iFn < 0) throw new Error(`class-inventory header changed: ${hdr.join("|")}`);
  const out = new Map();
  for (const l of lines.slice(1)) {
    const c = l.split("\t");
    if (c[iName]) out.set(c[iName], { fn: c[iFn] || "", site: c[iSite] || "" });
  }
  return out;
}

// ---- one evidence line -> { cls, cited, rest } ----------------------------------------------
const RE = /^(\S+) registrar (0x[0-9a-fA-F]+)(?=\s|$)/;
const RE_SITE = /\(class-record vtable written by str at (0x[0-9a-fA-F]+)\)/;

export function plan(inventory, lines) {
  const stats = { rows: 0, citing: 0, stale: 0, already: 0, noClass: 0, emptyFn: 0, siteChecked: 0, siteMismatch: 0 };
  const mismatches = [];
  const out = [];
  for (const line of lines) {
    if (!line) { out.push(line); continue; }
    const c = line.split("\t");
    if (c.length < 4 || c[0] === "start") { out.push(line); continue; } // header or malformed: never touched
    stats.rows++;
    const ev = c[3];
    const m = RE.exec(ev);
    if (!m) { out.push(line); continue; }
    stats.citing++;
    const inv = inventory.get(m[1]);
    if (!inv) { stats.noClass++; out.push(line); continue; }
    if (!inv.fn) { stats.emptyFn++; out.push(line); continue; }
    // guard: the site recorded in the prose must be the site class-inventory attributes to this class
    const ms = RE_SITE.exec(ev);
    if (ms) {
      stats.siteChecked++;
      if (hex(ms[1]) !== hex(inv.site)) {
        stats.siteMismatch++;
        if (mismatches.length < 5) mismatches.push(`${m[1]}: retile site ${hex(ms[1])} vs inventory ${hex(inv.site)}`);
      }
    }
    if (hex(m[2]) === hex(inv.fn)) { stats.already++; out.push(line); continue; }
    stats.stale++;
    c[3] = m[1] + " registrar " + hex(inv.fn) + ev.slice(m[0].length);
    out.push(c.join("\t"));
  }
  return { stats, mismatches, out };
}

function selftest() {
  const inv = new Map([
    ["cResourceSample", { fn: "0x3818cc", site: "0x381954" }],
    ["cAngleLimitData", { fn: "0xb9c", site: "0xc3c" }],
  ]);
  const lines = [
    "start\tlabel\tconf\tevidence",
    // must change: stale registrar, site matches
    "0x3810ac\tunknown\tB\tcResourceSample registrar 0x381738 vtable 0x17532e4 slot 2 (class-record vtable written by str at 0x381954)",
    // must NOT change: already correct
    "0x2a0\tunknown\tB\tcAngleLimitData registrar 0xb9c vtable 0x172f04c slot 2 (class-record vtable written by str at 0xc3c)",
    // must NOT change: class absent from the inventory
    "0x9\tunknown\tC\tnoSuchClass registrar 0x1234 vtable 0x1 slot 1",
    // must NOT change, and must be reported: site disagrees with the inventory
    "0xa\tunknown\tC\tcResourceSample registrar 0x381738 vtable 0x1 slot 1 (class-record vtable written by str at 0xdead)",
    // must NOT change: no registrar token at all
    "0xb\tquest\tA\tplain prose, no registrar here",
  ];
  const { stats, mismatches, out } = plan(inv, lines);
  const D = 0; // out[k] corresponds to lines[k] (both start with the header)
  const checks = [
    ["stale rows rewritten", stats.stale === 2, `stale=${stats.stale} (want 2: the stale one and the site-mismatch one)`],
    ["already-correct row untouched", out[2 + D] === lines[2], (out[2 + D] || "").slice(0, 60)],
    ["unknown class untouched", out[3 + D] === lines[3], (out[3 + D] || "").slice(0, 60)],
    ["registrar replaced by the owning function", /registrar 0x3818cc vtable/.test(out[1 + D] || ""), (out[1 + D] || "").slice(0, 90)],
    ["site mismatch detected", stats.siteMismatch === 1 && mismatches.length === 1, `siteMismatch=${stats.siteMismatch}`],
    ["no-token row untouched", out[5 + D] === lines[5], out[5 + D]],
    ["columns 1-3 preserved", out[1 + D].split("\t").slice(0, 3).join("\t") === lines[1].split("\t").slice(0, 3).join("\t"), ""],
    ["row count preserved", out.length === lines.length, `${out.length} vs ${lines.length}`],
  ];
  let bad = 0;
  for (const [name, ok, detail] of checks) { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); if (!ok) bad++; }
  console.log(bad ? `SELFTEST: ${bad} failure(s)` : "SELFTEST: all pass");
  return bad === 0;
}

if (SELFTEST) process.exit(selftest() ? 0 : 1);

const inventory = loadInventory();
let anyFail = false;
for (const src of FILES) {
  if (!fs.existsSync(src)) { console.log(`${src}: missing, skipped`); continue; }
  const raw = fs.readFileSync(src, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const { stats, mismatches, out } = plan(inventory, raw.split(/\r?\n/));
  const name = src.split(/[\\/]/).pop();
  console.log(`${name}: ${stats.rows} data row(s)`);
  console.log(`  citing a registrar : ${stats.citing}`);
  console.log(`  STALE (would change): ${stats.stale}`);
  console.log(`  already correct    : ${stats.already}`);
  console.log(`  class not in inventory: ${stats.noClass}   registrar_fn empty: ${stats.emptyFn}`);
  console.log(`  site token checked : ${stats.siteChecked}  disagreement: ${stats.siteMismatch}`);
  for (const m of mismatches) console.log(`    ${m}`);
  if (stats.siteMismatch !== 0 || stats.noClass !== 0 || stats.emptyFn !== 0) {
    console.log("  GUARD FAILED for this file: not writing it");
    anyFail = true;
    continue;
  }
  if (WRITE) {
    fs.writeFileSync(src, out.join(eol), "utf8");
    console.log(`  WROTE ${stats.stale} registrar address(es)`);
  }
}
if (anyFail) process.exit(1);
if (!WRITE) console.log("report only; pass --write to apply");
