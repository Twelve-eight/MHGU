// dtbase.mjs — decode MHGU rEnemyDtBase (dtb) / rEnemyDtBaseParts (dtp) resource files.
//
// Layout reverse-engineered from the Switch 1.4.0 loader (main.140, vaddr = flat - 0x100):
//   - loader fn 0x538bc; stream = {u8* base @+8, pos @+0xC, size @+0x10}; bulk read = memcpy fn 0x82710c
//   - header: "DTB\0" (u32 0x00425444) + version u32 0x15022601
//   - strictly sequential fields; see DTB_FIELDS below for code evidence addresses.
// Member names/offsets from the property-registration chain (fn 0x54028, 22 records; 0x53ea0 is
// the destructor; see docs/mechanics/monster-classes.md and docs/reference/formats/dtbase.md).
//
// Usage:
//   node tools/mhgu/dtbase.mjs <file>              decode one extracted .59d9c3da/.1bbc291e file
//   node tools/mhgu/dtbase.mjs <file.arc> [regex]  decode matching entries inside an arc (default _dtbase$|_dtbparts$)
//
// Library: decodeDtb(buf), decodeDtp(buf), decodeBuffer(buf) exported.
import fs from 'node:fs';
import { readArc, inflateEntry } from './arc.mjs';

const MAGIC_DTB = 0x00425444; // "DTB\0"
const MAGIC_DTP = 0x00505444; // "DTP\0"
const VERSION_DTB = 0x15022601;

class Rd {
  constructor(buf) { this.b = buf; this.pos = 0; }
  u8() { return this.b[this.pos++]; }
  u32() { const v = this.b.readUInt32LE(this.pos); this.pos += 4; return v; }
  f32() { const v = this.b.readFloatLE(this.pos); this.pos += 4; return v; }
  bytes(n) { const v = this.b.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  get left() { return this.b.length - this.pos; }
}

const hex = (buf) => [...buf].map(v => v.toString(16).padStart(2, '0')).join('');
const f32s = (buf) => { const out = []; for (let i = 0; i + 4 <= buf.length; i += 4) out.push(buf.readFloatLE(i)); return out; };

// Sequential prefix; evidence = loader call site (r2 = byte count, r1 = obj offset).
const DTB_PREFIX = [
  { n: 4, f: 'u32', name: 'magic' },                 // 0x53978 count=8 covers magic+version; checks @0x53980/90
  { n: 4, f: 'u32', name: 'version' },               //  == 0x15022601
  { n: 13, f: 'u8', name: 'flags13', note: 'obj+0xBC..0xC8; drive the conditional tail blocks' }, // 0x539b8..0x53aa4
  { n: 4, f: 'f32', name: 'BaseScale' },             // 0x53ab4 obj+0x64
  { n: 1, f: 'u8', name: 'Size' },                   // 0x53ac4 obj+0x68
  { n: 1, f: 'u8', name: 'Rank' },                   // 0x53ad4 obj+0x69
  { n: 1, f: 'u8', name: 'Nando' },                  // 0x53ae4 obj+0x6A
  { n: 1, f: 'u8', name: 'SpDieDamageType' },        // 0x53af4 obj+0x6B
  { n: 4, f: 'u32', name: 'DamageOnBit' },           // 0x53b04 obj+0x6C
  { n: 1, f: 'u8', name: 'DropDataCount' },          // 0x53b14 obj+0xB8
  { n: 0x14, f: 'f32x', name: 'DropData' },          // 0x53b24 obj+0x98 (raw 20B; 5 f32)
];

function decodeDtb(buf, label = 'dtb') {
  const r = new Rd(buf);
  const F = {};
  F.magic = r.u32();
  F.version = r.u32();
  if (F.magic !== MAGIC_DTB) throw new Error(`${label}: bad magic 0x${F.magic.toString(16)} (expected "DTB\\0")`);
  if (F.version !== VERSION_DTB) throw new Error(`${label}: unsupported version 0x${F.version.toString(16)} (expected 0x15022601)`);
  F.magic = 'DTB'; F.version = '0x15022601';

  for (const step of DTB_PREFIX.slice(2)) {
    if (step.n === 1 || step.f === 'f32' || step.f === 'u32') {
      if (step.f === 'f32') F[step.name] = r.f32();
      else if (step.f === 'u32') F[step.name] = '0x' + r.u32().toString(16);
      else F[step.name] = r.u8();
    } else if (step.f === 'f32x') {
      const raw = r.bytes(step.n);
      const vals = [];
      for (let i = 0; i + 4 <= raw.length; i += 4) vals.push(raw.readFloatLE(i));
      F[step.name] = vals;
    } else {
      const vals = [];
      for (let i = 0; i < step.n; i++) vals.push(r.u8());
      F[step.name] = vals;
    }
  }

  // Conditional tail. Guard sources decoded from loader 0x53b28..0x53d50 (see spec).
  // kind byte → +0x94buf[0]; template row; rows into +0x88buf; then flag/var-size blocks.
  // Guards/blocks verified for em001/em020/em022 only as far as the spec documents; the
  // remaining bytes are emitted as labeled raw sections instead of being guessed.
  const tail = {};
  const cfg = F.flags13; // [0xBC..0xC8]
  const flag = (objOff) => cfg[objOff - 0xBC] ?? 0;

  if (flag(0xC8) !== 0) tail.kindByte = r.u8();                    // 0x53b40 → +0x94buf[0]
  if (flag(0xC5) > 0) {                                            // 0x53b44..0x53bac
    // rows TOTAL = flags13[0xC5] (row 0 = template read @0x53b70; loop r7=1..count-1 @0x53b88);
    // alloc = 52*count (smulbb). First row goes to sp scratch, rows 1.. to +0x84buf[i*0x34].
    const rows = [];
    for (let i = 0; i < flag(0xC5); i++) rows.push(decodeRow(r.bytes(0x34)));
    tail.templateRow = rows[0];
    tail.rows = rows.slice(1);
  }
  // Blocks A..J (guards partially decoded, sizes partly data-dependent) — emit the rest raw.
  tail.tailRaw = { offset: '0x' + r.pos.toString(16), bytes: hex(r.bytes(r.left)) };
  return { fields: F, tail };
}

function decodeRow(buf) {
  // 0x34-byte row = u32 + 4×vec3 f32 (verified em001/em020/em022).
  const out = { u32: buf.readUInt32LE(0), vec3: [] };
  for (let i = 0; i < 4; i++) out.vec3.push([buf.readFloatLE(4 + i * 12), buf.readFloatLE(8 + i * 12), buf.readFloatLE(12 + i * 12)]);
  return out;
}

function decodeDtp(buf, label = 'dtp') {
  const r = new Rd(buf);
  const magic = r.u32();
  if (magic !== MAGIC_DTP) throw new Error(`${label}: bad magic 0x${magic.toString(16)} (expected "DTP\\0")`);
  const F = { magic: 'DTP', version: '0x' + r.u32().toString(16) };
  F.counts12 = [...r.bytes(12)];      // 0x08..0x13 (em001: 04 06 02 00 01 00 00 0e 02 05 01 01)
  F.bodyRaw = { offset: '0x' + r.pos.toString(16), bytes: hex(r.bytes(r.left)) };
  return F;
}

function decodeBuffer(buf, label = 'buffer') {
  const magic = buf.readUInt32LE(0);
  if (magic === MAGIC_DTB) return decodeDtb(buf, label);
  if (magic === MAGIC_DTP) return decodeDtp(buf, label);
  throw new Error(`${label}: unknown magic 0x${magic.toString(16)} (DTB/DTP only)`);
}

function decodeArc(arcPath, regex) {
  const buf = fs.readFileSync(arcPath);
  const arc = readArc(buf, arcPath);
  const re = new RegExp(regex ?? '_dtbase$|_dtbparts$');
  let n = 0;
  for (const e of arc.entries) {
    if (!re.test(e.name)) continue;
    const payload = inflateEntry(buf, e, `${arcPath}:${e.name}`);
    console.log(`\n=== ${e.name} (${payload.length} B, type 0x${e.typeHash.toString(16)})`);
    try {
      console.log(JSON.stringify(decodeBuffer(payload, e.name), null, 1));
      n++;
    } catch (err) {
      console.log('decode failed:', err.message);
    }
  }
  console.log(`\n# ${n} entries decoded`);
}

function main(argv) {
  const [target, regex] = argv;
  if (!target) {
    console.log('usage: node dtbase.mjs <file|file.arc> [nameRegex]   (arc regex default "_dtbase$|_dtbparts$")');
    process.exit(1);
  }
  if (target.toLowerCase().endsWith('.arc')) decodeArc(target, regex);
  else console.log(JSON.stringify(decodeBuffer(fs.readFileSync(target), target), null, 1));
}

export { decodeDtb, decodeDtp, decodeBuffer };

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
