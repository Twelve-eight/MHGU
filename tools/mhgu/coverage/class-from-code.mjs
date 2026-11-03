// class-from-code.mjs — recover a function's class identity from the code itself, without the (known noisy)
// string column of functions*.csv.gz.
//
// Two idioms are decoded; a third channel reuses the vtable tables as a cross-check:
//
//   ctor  : PIC global access. `ldr rX,[pc,#imm]` loads a *byte offset*, then `ldr rD,[pc,rX]` reads the GOT word
//           at (site+8+offset); the word holds a class-record global and the vtable is that word + 8 (RE Engine
//           class-record layout: [vtable][name][...]). The +8 vtable is looked up in the attr-vtable* tables.
//           Verified on 0x60f894 -> cUIOPostListWindow, 0x69d78c -> rAreaCommonLink, 0x667f58 -> uUINyanjiro.
//   name  : `ldr rX,[pc,#imm]` (byte offset) then `add rD,pc,rX` computes a real address; when that address holds a
//           class-ish identifier and the function also calls the class registrar 0x7aedcc (or the identifier is a
//           known class name from class-inventory.tsv) the string is the class name. Verified on 0x644d50 ->
//           "cUIOUnderKeyAssign" and 0x65fbb8 -> "uUICommonUtility".
//   slot  : the function is a method slot of a vtable known to attr-vtable*. `slot` = the exact slot recorded there;
//           `slot-run` = an uncovered slot of the same contiguous code-pointer array, anchored at a known base and
//           bounded by the next known base (weaker: the array may contain a later class's vtable).
//
// usage:
//   node tools/mhgu/coverage/class-from-code.mjs [--start 0x..] [--end 0x..]
//        [--channels ctor,name,slot,slot-run] [--functions docs/data/functions-retile.csv.gz] [--tsv]
//
// prints one line per function that got a class: `<start>\t<class>\t<channel>`; with --tsv it emits
// `start	label	conf	evidence` rows ready for recompute.mjs --seed (label from the class-prefix rule).
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import * as A from "../../mhgu/arm32.mjs";

const ROOT = "G:/omp works/MHGU";
const INV = path.join(ROOT, "docs/analysis/code/inventory");
const { buf, TEXT_END, rd32 } = A;
const IMG = buf.length - 0x100;
const REGISTRAR = 0x7aedcc;

const arg = (k, d) => process.argv.reduce((a, v, i) => (v === k ? process.argv[i + 1] : a), d);
const hex = (s) => parseInt(s, 16);

// ---- tables ------------------------------------------------------------------------------------------------
const functions = new Map(); // start -> {end, insns}
{
  const src = arg("--functions", path.join(ROOT, "docs/data/functions-retile.csv.gz"));
  const text = zlib.gunzipSync(fs.readFileSync(src)).toString("utf8").trim().split("\n");
  const re = /^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+)/;
  for (const l of text.slice(1)) {
    const m = re.exec(l);
    if (m) functions.set(hex(m[1]), { end: hex(m[2]), insns: +m[3] });
  }
}
// vtable base -> class, from every attribution table the repo already has
const vbase = new Map();
for (const f of ["attr-vtable-retile.tsv", "attr-vtable-fixed.tsv", "attr-vtable.tsv"]) {
  const p = path.join(INV, f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split("\n").slice(1)) {
    const c = l.split("\t");
    if (!c[3]) continue;
    for (const m of c[3].matchAll(/([A-Za-z_][\w:]*)\s+registrar 0x[0-9a-f]+ vtable 0x([0-9a-f]+) slot (\d+)/g)) {
      const v = hex("0x" + m[2]);
      if (!vbase.has(v)) vbase.set(v, m[1].split("::")[0]);
    }
  }
}
// exact slots: the attribution tables name the function first and its vtable slot second, so the row itself is the
// strongest form of the slot channel. The array extension covers methods of the same vtable the tables never listed.
const exactSlot = new Map(); // function start -> class
for (const f of ["attr-vtable-retile.tsv", "attr-vtable-fixed.tsv", "attr-vtable.tsv"]) {
  const p = path.join(INV, f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, "utf8").split("\n").slice(1)) {
    const c = l.split("\t");
    if (!c[0] || !c[3]) continue;
    for (const m of c[3].matchAll(/([A-Za-z_][\w:]*)\s+registrar 0x[0-9a-f]+ vtable 0x([0-9a-f]+) slot (\d+)/g)) {
      const fn = hex(c[0]);
      if (!exactSlot.has(fn)) exactSlot.set(fn, m[1].split("::")[0]);
    }
  }
}
const bases = [...vbase.keys()].sort((a, b) => a - b);
const runSlot = new Map();
for (let i = 0; i < bases.length; i++) {
  const v = bases[i], limit = Math.min(v + 400, i + 1 < bases.length ? bases[i + 1] : IMG);
  for (let a = v; a < limit; a += 4) {
    const w = rd32(a) >>> 0;
    if (w >= 0x1000 && w < TEXT_END && !runSlot.has(w) && !exactSlot.has(w)) runSlot.set(w, vbase.get(v));
  }
}
// class names the repo already knows, used to vet a name-channel hit that has no registrar call
const knownClasses = new Set();
{
  const p = path.join(ROOT, "docs/data/class-inventory.tsv");
  if (fs.existsSync(p)) for (const l of fs.readFileSync(p, "utf8").split("\n").slice(1)) {
    const c = l.split("\t");
    if (c[1]) knownClasses.add(c[1].split("::")[0]);
  }
}

// ---- code scanners -----------------------------------------------------------------------------------------
const STR = (c) => c >= 0x20 && c < 0x7f;
function strAt(a, max = 80) {
  if (a < 0 || a + 2 > IMG) return null;
  let s = "";
  for (let i = 0; i < max; i++) { const c = buf[a + 0x100 + i]; if (!c) break; if (!STR(c)) return null; s += String.fromCharCode(c); }
  return s.length >= 4 ? s : null;
}
// identifier shape of an RE Engine class name: cUIOFoo, uUICommonUtility, rAreaCommonLink, sPastKitchen, aQuest, MtArray
const className = (s) => (s && /^(c|u|r|s|a|n|Mt|em|wp)[A-Z][A-Za-z0-9_]{2,60}$/.test(s) ? s.split("::")[0] : null);

const clsOf = (v) => vbase.get(v) || vbase.get((v + 8) >>> 0) || vbase.get((v - 8) >>> 0) || null;

function scan(start, end) {
  const out = { ctor: null, names: [], registrar: false };
  for (let a = start; a < end; a += 4) {
    const w = rd32(a);
    if ((w >>> 28) === 0xF) continue;
    if (((w >>> 25) & 7) === 5 && (w & 0x01000000)) { // bl imm
      let o = (w & 0xFFFFFF) << 2; if (o & 0x2000000) o -= 0x4000000;
      if (((a + 8 + o) >>> 0) === REGISTRAR) out.registrar = true;
      continue;
    }
    // ldr rX,[pc,#imm] — PIC offset
    if (((w >>> 26) & 3) === 1 && ((w >>> 25) & 1) === 0 && ((w >>> 20) & 1) === 1 && ((w >>> 16) & 0xF) === 15) {
      const off = w & 0xFFF, U = (w >>> 23) & 1, rx = (w >>> 12) & 0xF;
      const lit = (a + 8 + (U ? off : -off)) >>> 0;
      if (lit + 4 > IMG) continue;
      const d = rd32(lit) >>> 0;
      for (let b = a + 4; b <= a + 44 && b < end; b += 4) {
        const t = rd32(b);
        // ldr rD,[pc, rX] (register-offset, P=1 U=1 W=0 L=1 Rn=15)
        if (((t & 0x0FF00000) >>> 0) === 0x07900000 && (((t >>> 16) & 0xF) === 0xF) && (t & 0xF) === rx) {
          const slot = (b + 8 + d) >>> 0;
          if (slot + 4 <= IMG) {
            const v = rd32(slot) >>> 0;
            const cls = clsOf(v);
            if (cls && !out.ctor) {
              // a bare GOT read is not a class claim: the value must be used as a vtable, i.e. either stored into an
              // object (+0, or +8 after an add) or handed to the registrar. Otherwise it may be a name/parent slot.
              const rd = (t >>> 12) & 0xF;
              let used = false;
              for (let k = b + 4; k <= b + 40 && k < end; k += 4) {
                const u = rd32(k);
                if ((u >>> 28) === 0xF) continue;
                const isAdd8 = ((u >>> 21) & 0xF) === 4 && ((u >>> 16) & 0xF) === rd && ((u & 0xFFF) === 8);
                const isStr = ((u >>> 26) & 3) === 1 && ((u >>> 25) & 1) === 0 && ((u >>> 20) & 1) === 0 && ((u >>> 12) & 0xF) === rd;
                if (isAdd8 || isStr) { used = true; break; }
              }
              if (used) out.ctor = { site: a, slot, value: v, cls };
            }
          }
          break;
        }
        // add rD, pc, rX / add rD, rX, pc — string address
        if ((t & 0x0FE00FF0) === 0x00800000) {
          const rn = (t >>> 16) & 0xF, rm = t & 0xF;
          if ((rn === 15 && rm === rx) || (rm === 15 && rn === rx)) {
            const addr = (b + 8 + d) >>> 0;
            const s = className(strAt(addr));
            if (s) out.names.push({ site: a, addr, s });
            break;
          }
        }
        if ((((t >>> 12) & 0xF) === rx && ((t >>> 26) & 3) !== 2) || ((t & 0xF) === rx && ((t >>> 26) & 3) !== 2)) break;
      }
    }
  }
  return out;
}

// ---- classify one function ---------------------------------------------------------------------------------
export function classify(start, end) {
  const hits = [];
  const sc = scan(start, end);
  // a registrar string is the class naming itself, so it outranks a vtable resolved through the tables
  for (const n of sc.names) {
    if (sc.registrar) hits.push({ cls: n.s, channel: "name", why: `"${n.s}"@0x${n.addr.toString(16)} with bl 0x7aedcc` });
    else if (knownClasses.has(n.s)) hits.push({ cls: n.s, channel: "name", why: `"${n.s}"@0x${n.addr.toString(16)} (known class name)` });
  }
  if (sc.ctor) hits.push({ cls: sc.ctor.cls, channel: "ctor", why: `GOT 0x${sc.ctor.slot.toString(16)}=0x${sc.ctor.value.toString(16)}+8` });
  if (exactSlot.has(start)) hits.push({ cls: exactSlot.get(start), channel: "slot", why: `recorded method slot` });
  else if (runSlot.has(start)) hits.push({ cls: runSlot.get(start), channel: "slot-run", why: `unrecorded slot of a known vtable array` });
  return hits;
}

// ---- class -> subsystem label (only where the rule is documented) -------------------------------------------
const PREFIX = new Map(); // explicit class -> label, from classprefix-map.tsv
{
  const p = path.join(INV, "..", "classprefix-map.tsv");
  if (fs.existsSync(p)) for (const l of fs.readFileSync(p, "utf8").split("\n").slice(1)) {
    const c = l.split("\t");
    if (c[0] && c[1] && c[1] !== "unknown") PREFIX.set(c[0], c[1]);
  }
}
export function labelFor(cls) {
  if (!cls) return null;
  if (PREFIX.has(cls)) return PREFIX.get(cls);      // explicit exception, e.g. uUINyanjiro -> otomo-ot
  if (/^(cUI|cUIO|uUI|sUI|cUIObject)/.test(cls)) return "ui";
  if (/^cMon/.test(cls)) return "monster-em";
  if (/^cItem|^sItem|^rItem/.test(cls)) return "item";
  if (/^cQuest|^aQuest|^cNpcQuest/.test(cls)) return "quest";
  if (/^cOtomo|^cNyan/.test(cls)) return "otomo-ot";
  if (/^cWeapon|^rWeapon/.test(cls)) return "weapon-wp";
  if (/^r|^sPast|^cSave/.test(cls)) return "save-data";
  return null; // unidentified family: do not guess
}
// a class whose name names a game domain rather than the UI framework: a ui row here would overwrite a
// domain-flavoured label the project may want to keep
export const DOMAINITY = /Item|Quest|Trade|Money|Shop|Kitchen|Pouch|Equip|Weapon|Armor|HunterNote|HNActivity|MonNyan|Nyanjiro|Style|Kizuna|Supply|Guild|Lobby|Chat|Post|Save|Alchemy|Delivery|Facility|Arena|Festa|Otomo|Nyan|Juke|Page/;

// ---- CLI ---------------------------------------------------------------------------------------------------
const invoked = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
if (invoked.endsWith("class-from-code.mjs")) {
  const start = arg("--start") ? hex(arg("--start")) : 0;
  const end = arg("--end") ? hex(arg("--end")) : TEXT_END;
  const want = new Set((arg("--channels", "ctor,name,slot,slot-run")).split(","));
  const tsv = process.argv.includes("--tsv");
  const starts = [...functions.keys()].filter((s) => s >= start && s < end).sort((a, b) => a - b);
  const per = new Map();
  let emitted = 0;
  for (const s of starts) {
    const f = functions.get(s);
    const hits = classify(s, f.end).filter((h) => want.has(h.channel));
    if (!hits.length) { per.set("none", (per.get("none") || 0) + 1); continue; }
    const best = hits[0]; // ctor and name outrank slot channels
    const label = labelFor(best.cls);
    per.set(best.channel, (per.get(best.channel) || 0) + 1);
    if (!label) continue;
    const conf = best.channel === "slot-run" ? "B" : "A";
    emitted++;
    if (tsv) console.log([`0x${s.toString(16)}`, label, conf, `${best.channel}: ${best.cls} (${best.why})`].join("\t"));
    else console.log([`0x${s.toString(16)}`, best.cls, best.channel].join("\t"));
  }
  if (tsv) console.error(`# ${emitted} rows emitted from ${starts.length} functions in [0x${start.toString(16)},0x${end.toString(16)})`);
  else console.error(`# ${starts.length} functions in range; class hits: ` + [...per.entries()].map(([k, v]) => `${k}=${v}`).join(" "));
}
