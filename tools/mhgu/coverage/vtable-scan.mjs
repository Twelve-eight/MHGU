// vtable-scan.mjs — discover vtables mechanically from the image, without trusting any earlier attribution.
//
// Key: an Itanium-ABI vtable V stores &typeinfo at V-4, and the typeinfo object stores the mangled class name at +4. So a
// run of function pointers preceded by a typeinfo pointer whose name field points at a printable C-string is a vtable for
// a known class, and each slot word that equals a retiled function start is a class-method fact. This is the same keying
// that attr-vtable-*.tsv used, but discovered exhaustively over rodata instead of from a seed list.
// Output: vtables-discovered.tsv (vtable, slot count, class name, namespace, first name-site) and vtables-slots.tsv
//         (start, vtable, slot, class) for every slot that lands on a function start.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = "G:/omp works/MHGU";
const buf = fs.readFileSync(path.join(ROOT, "main.140.flat.bin"));
const rd = (v) => buf.readUInt32LE(v + 0x100) >>> 0;
const rdb = (v) => buf[v + 0x100];

const TEXT_END = 0x13f1dec;
const limits = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "docs/data/functions-retile.csv.gz")))
  .toString("utf8").split(/\r?\n/).filter(Boolean).slice(1)
  .map((l) => { const c = l.split(","); return { s: parseInt(c[0], 16), e: parseInt(c[1], 16) }; });
const startSet = new Set(limits.map((r) => r.s));

function cstr(v) {
  if (v < TEXT_END || v + 0x100 >= buf.length) return null;
  let s = "";
  for (let i = 0; i < 200; i++) {
    const c = buf[v + 0x100 + i];
    if (c === 0) break;
    if (c < 0x20 || c > 0x7e) return null; // names are ASCII; a non-printable byte means this is not a name string
    s += String.fromCharCode(c);
  }
  return s.length >= 4 && s.length < 200 ? s : null;
}

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
    } else if (s[i] === "I") break;
    else i++;
  }
  return parts.join("::");
}

// Scan rodata word by word: a candidate vtable start is a word that is a function start whose preceding word points at a
// typeinfo whose name is a printable string.
const vt = [];
const slots = [["start", "vtable", "slot", "class"]];
let scanned = 0;
// A vtable is identified by the typeinfo pointer immediately before its first slot, but the first slot need not be a
// function start (shared destructor thunks and mid-function labels are common), so the run is walked while entries stay
// inside .text and only the entries that equal a retiled start become evidence.
for (let V = TEXT_END + 8; V + 0x100 < buf.length; V += 4) {
  const T = rd(V - 4);
  if (T < TEXT_END || T + 8 + 0x100 >= buf.length) continue;
  const namePtr = rd(T + 4);
  const name = cstr(namePtr);
  if (!name) continue;
  let n = 0, starts = 0;
  while (n < 0x400) {
    const w = rd(V + n * 4);
    if (w < 0x100 || w >= TEXT_END) break;
    if (startSet.has(w)) starts++;
    n++;
  }
  if (n < 2 || starts === 0) continue;
  scanned++;
  const cls = demangle(name);
  vt.push([V.toString(16), n, name, cls]);
  for (let k = 0; k < n; k++) if (startSet.has(rd(V + k * 4))) slots.push([rd(V + k * 4).toString(16), V.toString(16), k, cls]);
}

fs.writeFileSync(path.join(ROOT, "docs/analysis/code/inventory/vtables-discovered.tsv"),
  [["vtable", "slots", "mangled", "class"], ...vt].map((r) => r.join("\t")).join("\n") + "\n");
fs.writeFileSync(path.join(ROOT, "docs/analysis/code/inventory/vtables-slots.tsv"),
  slots.map((r) => r.join("\t")).join("\n") + "\n");
const fns = new Set(slots.slice(1).map((r) => r[0]));
console.log(`vtables ${scanned}, slots ${slots.length - 1}, distinct functions ${fns.size}`);
const ns = new Map();
for (const [, , , cls] of vt) {
  const top = cls.split("::").slice(0, 2).join("::");
  ns.set(top, (ns.get(top) || 0) + 1);
}
console.log("top class namespaces:", [...ns].sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x.join(":")).join(" "));
