// MHGU enemy `*_dttune` (arc type 0x48e8ac29, resource class rEnemyDtTune) decoder.
// Spec: docs/reference/formats/dttune.md (offsets verified against em001_00/em002_00/em013_00).
//
// Usage:
//   node tools/mhgu/dttune.mjs <file_dttune>              # JSON to stdout
//   node tools/mhgu/dttune.mjs <file_dttune> --raw        # + hex dump of unmapped regions
//
// Verified layout ([C] = byte cross-checked vs mhgu.db monster_damage / monster_status /
// monsters.base_hp for Rathian em001, Rathalos em002, Fatalis em013):
//   NOTE: only base HP @0x38 is a fixed offset; meat/status offsets vary per monster
//   (Main IRC: meat 0x8C/0x8E/0x8F, status 0x324/0x35C or absent). Offsets below are
//   the em001/em002 variants (meat @0x8E verified for em013 too).
//   0x00  char[4]  "DTT\0" magic
//   0x04  u8[4]    header bytes (6c a0 33 01 in sampled files) [unknown]
//   0x38  u32      monster base HP (== db monsters.base_hp)   ← fixed offset
//   0x3C  u16      small int, meaning unknown
//   0x40  ..       fixed records (u16 view) [semantics unknown]
//   0x8E  meat[8]  8 rows x 10 B = 9 x u8 + pad (cut,impact,shot,fire,water,ice,thunder,dragon,ko)
//   0xDE  ..       structured tune data [semantics unknown]
//   0x280 0x358    (em001/em002) action/flag pairs (u16 id, u16 0xFFF3|0xFFF8) [B]
//   0x35C status[8]: Poison,Sleep,Para,KO,Exhaust,Mount,Jump,Blast
//         record = u16 initial, A, B, duration(frames), increase, max
//         (initial/increase/max byte-equal db monster_status; A=600,B=5 on timed statuses,
//          0 otherwise; poison record followed by 2 extra u16 in em001/em002)
//         em013 (Fatalis) does NOT use this layout; region dumped raw.
//
// Everything not marked [C] in the spec is dumped positionally without invented names.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MEAT_OFF = 0x8e;
const MEAT_ROWS = 8;
const MEAT_COLS = ['cut', 'impact', 'shot', 'fire', 'water', 'ice', 'thunder', 'dragon', 'ko'];
const STATUS_OFF = 0x35c;
const STATUS_NAMES = ['poison', 'sleep', 'para', 'ko', 'exhaust', 'mount', 'jump', 'blast'];

function fail(msg) { throw new Error(`dttune: ${msg}`); }

function readMeat(buf) {
  const rows = [];
  for (let r = 0; r < MEAT_ROWS; r++) {
    const off = MEAT_OFF + r * 10;
    if (off + 10 > buf.length) fail(`meat row ${r} at 0x${off.toString(16)} past EOF (${buf.length} B)`);
    const row = { _offset: off };
    for (let i = 0; i < MEAT_COLS.length; i++) row[MEAT_COLS[i]] = buf[off + i];
    row._pad = buf[off + 9];
    rows.push(row);
  }
  return rows;
}

// Status records: 6 x u16 each. Verified walk for em001/em002 (spec 0x35C):
//   poison  @0x35C, 16 B total (6 fields + trailing u16 [5, 120])
//   sleep   @0x36C, 12 B   para @0x378, ko @0x384, exhaust @0x390,
//   mount   @0x39C, 12 B   jump @0x3A8, 12 B
//   blast   @0x3C0, 12 B (0x3B4..0x3BF is a separate u8/u16 region, not a record)
// em013 (Fatalis) does not use this layout; dump raw instead.
function readStatus(buf) {
  if (buf.length < STATUS_OFF + 12) return null;
  const offs = [0x35c, 0x36c, 0x378, 0x384, 0x390, 0x39c, 0x3a8, 0x3c0];
  const recs = [];
  for (let i = 0; i < STATUS_NAMES.length; i++) {
    const o = offs[i];
    if (o + 12 > buf.length) break;
    const v = [];
    for (let k = 0; k < 6; k++) v.push(buf.readUInt16LE(o + k * 2));
    recs.push({ v, o });
  }
  // Layout sentinel: timed statuses carry A=600, B=5 (poison..exhaust). If that fails
  // (e.g. em013 Fatalis), the monster does not use this layout — report raw instead.
  const valid = recs.length === STATUS_NAMES.length && recs[0].v[1] === 600 && recs[0].v[2] === 5;
  if (!valid) return null;
  return recs.map((r, i) => ({
    status: STATUS_NAMES[i],
    _offset: r.o,
    initial: r.v[0], a: r.v[1], b: r.v[2], durationFrames: r.v[3], increase: r.v[4], max: r.v[5],
  }));
}

function u16View(buf, from, to) {
  const out = [];
  for (let o = from; o + 2 <= to; o += 2) out.push(buf.readUInt16LE(o));
  return out;
}

// Heuristic: byte offsets where a "clean" f32 (multiple of 0.001, 0.1..1e6) starts.
function floatCandidates(buf, from, to) {
  const seen = new Map();
  for (let o = from; o + 4 <= to; o++) {
    const f = buf.readFloatLE(o);
    if (!Number.isFinite(f) || Math.abs(f) < 0.1 || Math.abs(f) >= 1e6) continue;
    const scaled = f * 1000;
    if (Math.abs(scaled - Math.round(scaled)) > 1e-3) continue;
    const v = Math.round(scaled) / 1000;
    const cur = seen.get(v);
    if (!cur || o < cur.offset) seen.set(v, { offset: o, value: v });
  }
  return [...seen.values()].sort((a, b) => a.offset - b.offset);
}

export function decodeDttune(buf, file = null) {
  if (buf.length < 0x40 || buf.toString('latin1', 0, 4) !== 'DTT\0') {
    fail(`bad magic (expected "DTT\\0"), got ${JSON.stringify(buf.toString('latin1', 0, 4))} (${buf.length} B)`);
  }
  const status = readStatus(buf);
  const statusOk = status && status.length === STATUS_NAMES.length;
  return {
    file,
    size: buf.length,
    magic: 'DTT',
    headerBytes: [...buf.slice(4, 8)],
    baseHp: buf.readUInt32LE(0x38),
    smallInt0x3C: buf.readUInt16LE(0x3c),
    meat: readMeat(buf),
    records0x40_u16: u16View(buf, 0x40, MEAT_OFF),   // semantics unknown
    actionPairs_0x280: buf.length >= 0x358
      ? u16View(buf, 0x280, 0x358)                   // (id, flag) pairs [B]
      : undefined,
    status: statusOk
      ? status
      : { _note: 'layout not recognized for this monster (see spec 0x35C)', raw_u16_0x35c_0x3cc: u16View(buf, STATUS_OFF, Math.min(0x3cc, buf.length & ~1)) },
    tuneFloats: floatCandidates(buf, 0xde, buf.length), // heuristic, unmapped regions
  };
}

// `import.meta.main` (Node >= 22.18) when present, path comparison otherwise — same guard as arc.mjs,
// so `import { decodeDttune } from './dttune.mjs'` does not run the CLI.
const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) {
  const argv = process.argv.slice(2).filter(a => a !== '--raw');
  const raw = process.argv.includes('--raw');
  if (!argv[0] || process.argv.includes('-h') || process.argv.includes('--help')) {
    console.error('usage: node tools/mhgu/dttune.mjs <file_dttune> [--raw]');
    process.exit(argv[0] ? 0 : 1);
  }
  const buf = fs.readFileSync(argv[0]);
  console.log(JSON.stringify(decodeDttune(buf, argv[0]), null, 2));
  if (raw) {
    console.error('== 0x40..0x8e (records0x40) ==');
    console.error(buf.slice(0x40, Math.min(0x8e, buf.length)).toString('hex').replace(/(..)/g, '$1 '));
    console.error('== 0xde..end (unmapped) ==');
    console.error(buf.slice(0xde).toString('hex').replace(/(..)/g, '$1 '));
  }
}
