// seeds-from-vtables.mjs — turn the mechanically discovered vtables into labelled function evidence.
//
// Each row is (function start, class, vtable, slot): the slot word equals the retiled function start (so the function is
// that class's method) and the class name decodes from the typeinfo. Only namespaces whose name states a subsystem are
// labelled; anything else stays out rather than being guessed from a spelling pattern.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/vtables-slots.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-vtable-rtti2.tsv");

const NS = [
  ["nn::nex", "online-nex", "Nintendo NEX matchmaking/data-store middleware"],
  ["nn::pia", "online-nex", "Nintendo PIA peer-to-peer middleware"],
  ["nn::nfr", "online-nex", "Nintendo NFR friend/leaderboard middleware"],
  ["nn::account", "online-nex", "Nintendo account service"],
  ["nn::gfx", "render-gfx", "Nintendo graphics API wrapper"],
  ["nn::hid", "kernel-os", "Nintendo HID service"],
  ["nn::oe", "kernel-os", "Nintendo OS extension service"],
  ["nn::fs", "filesystem", "Nintendo filesystem service"],
  ["nn::os", "kernel-os", "Nintendo OS primitives"],
  ["pead", "kernel-os", "Nintendo pead utility library (heaps, threads, strings)"],
  ["sead", "kernel-os", "Nintendo sead utility library"],
  ["nw::", "online-nex", "Nintendo network wrapper"],
  ["nn::ngc", "online-nex", "Nintendo game-content (DLC) service"],
];

// A function that appears in the vtables of two different classes is shared boilerplate (a common getter or deleting
// thunk), so the class it is filed under depends on which vtable was read first. Those rows are dropped: the label would
// describe the vtable rather than the function.
// Overrun screen, same rule as relabel-rtti.mjs: a slot whose target is more than 256 KB from the median target of its
// own vtable is screened out, because a run read as "in-text words until the first non-code word" can walk past the
// vtable end into neighbouring rodata and hand a shared thunk to an unrelated class.
const cluster = new Map();
{
  const byVt = new Map();
  for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
    const [start, vt] = l.split("\t");
    if (!byVt.has(vt)) byVt.set(vt, []);
    byVt.get(vt).push(parseInt(start, 16));
  }
  for (const [vt, list] of byVt) {
    const sorted = list.slice().sort((a, b) => a - b);
    cluster.set(vt, sorted[Math.floor(sorted.length / 2)]);
  }
}
const classes = new Map();
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, , , cls] = l.split("\t");
  if (!classes.has(start)) classes.set(start, new Set());
  classes.get(start).add(cls);
}
const out = [["start", "label", "conf", "evidence"]];
const seen = new Set();
let shared = 0, suspect = 0;
const perLabel = new Map();
let unlabelled = 0;
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, vt, slot, cls] = l.split("\t");
  const med = cluster.get(vt);
  if (med !== undefined && Math.abs(parseInt(start, 16) - med) > 0x40000) { suspect++; continue; }
  const hit = NS.find(([p]) => cls === p || cls.startsWith(p + "::"));
  if (!hit) { unlabelled++; continue; }
  if (classes.get(start).size > 1) { shared++; continue; }
  if (seen.has(start)) continue;
  seen.add(start);
  perLabel.set(hit[1], (perLabel.get(hit[1]) || 0) + 1);
  out.push([start, hit[1], "A", `${cls} vtable 0x${vt} slot ${slot} [typeinfo-decoded class; ${hit[0]} is ${hit[2]}]`]);
}
fs.writeFileSync(OUT, out.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`labelled ${out.length - 1} functions:`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
console.log(`screened out as far from their vtable median: ${suspect}`);
console.log(`dropped as shared across classes: ${shared}`);
console.log(`slots whose class namespace has no rule: ${unlabelled}`);
