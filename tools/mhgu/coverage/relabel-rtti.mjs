// relabel-rtti.mjs — promote vtable attributions that carry a C++ RTTI typeinfo name.
//
// Why this is a separate, defensible channel: 1,365 of the demoted vtable rows are keyed by an Itanium-mangled typeinfo
// string, not by a guessed class name. Decoding the mangled name gives the real namespace (`nn::nex::...`,
// `nn::pia::...`), and both are Nintendo's online middleware, so the domain follows from the symbol itself rather than
// from a naming convention. Rows keyed by a registrar's class string stay at conf B until that class has its own
// evidence; a bare /Mt/ rule is explicitly NOT used again (it swept collision and heap classes into render-gfx once).
//
// Output: attr-vtable-ns.tsv (conf A, namespace-backed) and attr-vtable-rest.tsv (the remaining B rows, unchanged).
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-fixed.tsv");
const OUTFILE = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-ns.tsv");
const OUTREST = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-rest.tsv");

// namespace prefix -> label. Every entry is middleware whose name states its domain; nothing here is inferred from a
// single letter or from the word "Mt".
const NS = [
  ["nn::nex", "online-nex", "Nintendo NEX matchmaking/data-store middleware"],
  ["nn::pia", "online-nex", "Nintendo PIA peer-to-peer middleware"],
  ["nn::nfr", "online-nex", "Nintendo NFR (friend/leaderboard) middleware"],
  ["nn::account", "online-nex", "Nintendo account service"],
  ["nn::gfx", "render-gfx", "Nintendo graphics API wrapper"],
  ["nn::hid", "kernel-os", "Nintendo HID service"],
  ["nn::oe", "kernel-os", "Nintendo OS extension service"],
  ["nn::fs", "filesystem", "Nintendo filesystem service"],
  ["nn::os", "kernel-os", "Nintendo OS primitives"],
];

function demangle(s) {
  if (!s.startsWith("N")) return s;
  const parts = [];
  let i = 1;
  while (i < s.length) {
    if (s[i] === "E") break;
    if (s[i] >= "0" && s[i] <= "9") {
      let j = i;
      while (s[j] >= "0" && s[j] <= "9") j++;
      const n = Number(s.slice(i, j));
      parts.push(s.slice(j, j + n));
      i = j + n;
    } else if (s[i] === "I") break; // template arguments: the primary name is enough for the namespace
    else i++;
  }
  return parts.join("::");
}

const rows = fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1);
const out = [["start", "label", "conf", "evidence"]];
const rest = [["start", "label", "conf", "evidence"]];
const seen = new Set();
let promoted = 0;
const byLabel = new Map();
for (const l of rows) {
  const [start, label, conf, ev] = l.split("\t");
  if (conf !== "B") continue; // conf A rows are already direct evidence and stay in the source file
  const m = /rtti-typeinfo (\S+) /.exec(ev || "");
  if (!m) { rest.push([start, label, conf, ev]); continue; }
  const full = demangle(m[1]);
  const hit = NS.find(([ns]) => full === ns || full.startsWith(ns + "::"));
  if (!hit) { rest.push([start, label, conf, ev]); continue; }
  if (seen.has(start)) continue;
  seen.add(start);
  promoted++;
  byLabel.set(hit[1], (byLabel.get(hit[1]) || 0) + 1);
  out.push([start, hit[1], "A", `${ev} [rtti ${full}: ${hit[0]} is ${hit[2]}]`]);
}
fs.writeFileSync(OUTFILE, out.map((r) => r.join("\t")).join("\n") + "\n");
fs.writeFileSync(OUTREST, rest.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`promoted ${promoted} namespace-backed rows:`, [...byLabel].map((x) => x.join(":")).join(" "));
console.log(`remaining B rows: ${rest.length - 1} -> attr-vtable-rest.tsv`);
