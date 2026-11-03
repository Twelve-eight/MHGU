// drift-gap11.mjs — measure which member#4 offsets are actually displaced in the save snapshots.
//
// Gap 11 (editor-spec 01) used to say the 134-row layout table was off by 4 B "somewhere after 0x3157".
// The table was regenerated on 2026-10-24 with a 4 B nested read inserted at row 107 (file 0x5057). This script
// tests that localisation against the bytes: a field between 0x3157 and 0x5057 (medal B) must decode only at the
// unshifted coordinate, a field after 0x5057 (the 12 B runtime bitmap pair) only at the +4 coordinate, and the
// monster arrays must satisfy their small-slot invariants only at 0x5EA6, not at the old 0x5EA2.
//
// Command: node tools/audit/drift-gap11.mjs
import fs from "node:fs";

const CLEAN = "save-snapshots/20261022-clean-reference/system_CLEAN";
const DIRTY = "save-snapshots/20261022-v6-ready/system";
const SLOT = [0x18CC9C, 0x2AC560];           // hunterAdds for slots 0/1
const clean = fs.readFileSync(CLEAN), dirty = fs.readFileSync(DIRTY);
const at = (buf, slot, off, n) => buf.subarray(SLOT[slot] + off, SLOT[slot] + off + n);
const popcount = (b) => { let n = 0; for (const x of b) for (let i = 0; i < 8; i++) n += (x >> i) & 1; return n; };
const zeros = (b) => b.reduce((n, x) => n + (x === 0 ? 1 : 0), 0);
let fails = 0;
const ok = (m) => console.log(`PASS ${m}`);
const bad = (m) => { console.log(`FAIL ${m}`); fails++; };

// [1] medal B: 20 B block, 132 bits in the first 17 B, byte +16 uses the low nibble, +17..+19 are zero.
function medalShape(buf, slot, off) {
  const b = at(buf, slot, off, 20);
  return { zeroTail: zeros(b.subarray(17, 20)) === 3, highNibble: (b[16] & 0xF0) === 0, bits: popcount(b.subarray(0, 17)) };
}
console.log("## medal_B structure at 0x316B (table row after 0x3157) vs the +4 alternative");
for (const [label, off] of [["0x316B", 0x316B], ["0x316F", 0x316F]]) {
  const r = medalShape(clean, 0, off), r1 = medalShape(clean, 1, off);
  console.log(`  ${label}: slot0 zeroTail=${r.zeroTail} highNibbleZero=${r.highNibble} bits=${r.bits}; slot1 zeroTail=${r1.zeroTail} highNibbleZero=${r1.highNibble} bits=${r1.bits}`);
}
const m0 = medalShape(clean, 0, 0x316B), m1 = medalShape(clean, 1, 0x316B);
const n0 = medalShape(clean, 0, 0x316F), n1 = medalShape(clean, 1, 0x316F);
if (!(m0.zeroTail && m0.highNibble && m1.zeroTail && m1.highNibble)) bad("medal_B does not decode at 0x316B");
else if (n0.zeroTail && n0.highNibble && n1.zeroTail && n1.highNibble) bad("medal_B also decodes at 0x316F; test is not discriminating");
else ok("medal B decodes at 0x316B and fails at 0x316F: no displacement after 0x3157");

// [2] after 0x5057: rows 111/112 are two 12 B slots at 0x507B/0x5087. A nonzero 12 B repeat is only expected there.
console.log("\n## 12 B block repeat around the 0x5057 insert (rows 111/112 at 0x507B/0x5087)");
function repeats(buf, slot, from, to) {
  const out = [];
  for (let o = from; o + 24 <= to; o++) {
    const a = at(buf, slot, o, 12), b = at(buf, slot, o + 12, 12);
    if (!a.some((x) => x) || !b.some((x) => x)) continue;   // zero stretches repeat trivially
    let same = 0; for (let i = 0; i < 12; i++) if (a[i] === b[i]) same++;
    if (same === 12) out.push(`0x${o.toString(16).toUpperCase()}`);
  }
  return out;
}
for (const [name, buf, slot] of [["clean slot0", clean, 0], ["dirty slot0", dirty, 0]]) {
  const r = repeats(buf, slot, 0x5060, 0x50A0);
  console.log(`  ${name}: identical nonzero 12 B neighbours at ${r.join(", ") || "(none)"}`);
}
const rc = repeats(clean, 0, 0x5060, 0x50A0), rd = repeats(dirty, 0, 0x5060, 0x50A0);
if (!rc.includes("0x507B") || !rd.includes("0x507B")) bad("no identical nonzero 12 B pair at 0x507B");
else if (rc.includes("0x5077") || rd.includes("0x5077")) bad("identical nonzero 12 B pair also at 0x5077; test is not discriminating");
else ok("the 12 B pair starts at 0x507B, not the old 0x5077: +4 applies at rows 111/112");

// [3] quest bitmaps at 0x2C77/0x2D77: cleared must be a subset of seen.
function questViolations(buf, slot, a, b) {
  const c = at(buf, slot, a, 256), s = at(buf, slot, b, 256);
  let n = 0;
  for (let i = 0; i < 2048; i++) if ((c[i >> 3] >> (i & 7)) & 1 && !((s[i >> 3] >> (i & 7)) & 1)) n++;
  return n;
}
console.log("\n## quest bitmaps: cleared bits whose seen bit is 0 (must be 0 at the table coordinates)");
for (const [label, a, b] of [["-4", 0x2C73, 0x2D73], ["table 0x2C77/0x2D77", 0x2C77, 0x2D77], ["+4", 0x2C7B, 0x2D7B]]) {
  console.log(`  clean slot1 ${label}: ${questViolations(clean, 1, a, b)}`);
}
const qv = questViolations(clean, 1, 0x2C77, 0x2D77);
if (qv !== 0) bad(`quest bitmaps do not decode at 0x2C77/0x2D77 (${qv} cleared⊄seen bits)`);
else ok("clean slot1 quest bitmaps give 0 cleared⊄seen bits at 0x2C77/0x2D77");

// [4] monster arrays: the same 137-slot layout must give the documented counts at 0x5EA6, and the small-monster
// slots must be empty, which the old 0x5EA2 alignment violates (1 small size record, 22 size-only slots).
const SMALL = []; for (let i = 71; i <= 111; i++) SMALL.push(i); SMALL.push(135, 136);
function counters(buf, slot, killOff) {
  const kill = [], cap = [], size = [];
  for (let i = 0; i < 137; i++) { kill.push(buf.readUInt16LE(SLOT[slot] + killOff + i * 2)); cap.push(buf.readUInt16LE(SLOT[slot] + killOff + 274 + i * 2)); }
  for (let i = 0; i < 137; i++) size.push([buf.readUInt16LE(SLOT[slot] + killOff + 548 + i * 4), buf.readUInt16LE(SLOT[slot] + killOff + 548 + i * 4 + 2)]);
  return {
    killN: kill.filter((x) => x).length, killMax: Math.max(...kill),
    capN: cap.filter((x) => x).length, capMax: Math.max(...cap),
    smallCap: SMALL.reduce((n, i) => n + (cap[i] ? 1 : 0), 0),
    smallSize: SMALL.reduce((n, i) => n + (size[i][0] || size[i][1] ? 1 : 0), 0),
    sizeOnly: kill.reduce((n, v, i) => n + (v === 0 && (size[i][0] || size[i][1]) ? 1 : 0), 0),
  };
}
console.log("\n## monster counters, clean slot1 (reference: 62 kill / max 45, 26 capture / max 3, 9 size-only)");
const old = counters(clean, 1, 0x5EA2), tab = counters(clean, 1, 0x5EA6);
console.log(`  old 0x5EA2: kill ${old.killN}/max ${old.killMax}, capture ${old.capN}/max ${old.capMax}, small-capture ${old.smallCap}, small-size ${old.smallSize}, size-only ${old.sizeOnly}`);
console.log(`  table 0x5EA6: kill ${tab.killN}/max ${tab.killMax}, capture ${tab.capN}/max ${tab.capMax}, small-capture ${tab.smallCap}, small-size ${tab.smallSize}, size-only ${tab.sizeOnly}`);
if (tab.killN !== 62 || tab.killMax !== 45) bad(`kill block at 0x5EA6 gives ${tab.killN}/max ${tab.killMax}, expected 62/45`);
else if (tab.capN !== 26 || tab.capMax !== 3) bad(`capture block at 0x5EA6 gives ${tab.capN}/max ${tab.capMax}, expected 26/3`);
else if (tab.smallCap !== 0 || tab.smallSize !== 0 || tab.sizeOnly !== 9) bad(`small-slot invariants fail at 0x5EA6 (capture ${tab.smallCap}, size ${tab.smallSize}, size-only ${tab.sizeOnly})`);
else if (old.sizeOnly === 9 && old.smallSize === 0) bad("old 0x5EA2 also satisfies the size invariants; test is not discriminating");
else ok(`monster arrays decode at 0x5EA6 exactly as coverage-map records (old 0x5EA2 gives small-size ${old.smallSize}, size-only ${old.sizeOnly})`);

// [5] table tiling: row sizes sum to 11,595 B = 11,591 static + the 4 B nested read; rows 66/67 are read 21x and
// rows 68/69 15x (20 B each, only +0/+40 stored), adding 1,360 B => 12,955 B from 0x2C0B => 0x5EA6.
const layout = fs.readFileSync("docs/save-layout/member4-file-layout.txt", "utf8").split(/\r?\n/);
let sum = 0, rows = 0;
for (const l of layout) { const m = /^(0x[0-9a-f]+)\s+(\S+)\s+sz=(\d+)/.exec(l.trim()); if (m) { sum += +m[3]; rows++; } }
const loops = 20 * 20 * 2 + 20 * 14 * 2;
const total = sum + loops;
console.log(`\n## layout table: ${rows} rows = 134 static + 1 nested 4 B; row sizes sum to ${sum} B; loop expansion ${loops} B; total ${total} B (0x${total.toString(16).toUpperCase()}); 0x2C0B + ${total} = 0x${(0x2C0B + total).toString(16).toUpperCase()}`);
if (total !== 12955) bad(`layout table tiles to ${total} B, expected 12,955`);
else ok("layout table tiles to 12,955 B = 0x329B, ending at 0x5EA6; without the 4 B row it is 12,951 B and ends at 0x5EA2");

console.log(fails ? `\n${fails} drift check(s) failed` : "\nGAP 11 LOCALISATION CONFIRMED");
process.exit(fails ? 1 : 0);
