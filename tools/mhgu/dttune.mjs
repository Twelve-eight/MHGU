// MHGU enemy `*_dttune` (arc type 0x48e8ac29, resource class rEnemyDtTune) decoder.
// Spec: docs/reference/formats/dttune.md (rev after rev-dttune.md: per-monster offsets).
//
// Usage:
//   node tools/mhgu/dttune.mjs <file_dttune>              # JSON to stdout
//   node tools/mhgu/dttune.mjs <file_dttune> --raw        # + hex dump of unmapped regions
//   node tools/mhgu/dttune.mjs <file_dttune> --db <path>  # cross-check against mhgu.db
//
// Fixed facts (8/8 monsters): magic "DTT\0" @0x00, header bytes 6c a0 33 01 @0x04,
// base HP u32 @0x38 (== db monsters.base_hp).
// Everything else is located by scanning (offsets are per-monster variables):
//   meat:   8 rows x 10 B (9 x u8 + pad) starting in 0x8A..0x92; first window with all
//           bytes <= 100. Base-state rows only (conditional rows are not stored; unused
//           slots are all-100).
//   status: variable block somewhere in 0x1F4..0x4E8 (or absent). Poison-shaped record
//           located by scanning; walk forward: 6 x u16 per record
//           [initial, A, B, durationFrames, increase, max], optional trailing u16 pair
//           after Poison, placeholder records skipped, Blast record, then Blast damage u16.
//           Layout validated per record; anything unrecognized is reported raw.
import fs from 'node:fs';

const MEAT_SCAN_LO = 0x8a;
const MEAT_SCAN_HI = 0x94;
const MEAT_ROWS = 8;
const MEAT_COLS = ['cut', 'impact', 'shot', 'fire', 'water', 'ice', 'thunder', 'dragon', 'ko'];
const STATUS_SCAN_LO = 0x1e0;
const STATUS_SCAN_HI = 0x520;
const STATUS_NAMES = ['poison', 'sleep', 'para', 'ko', 'exhaust', 'mount', 'jump', 'blast'];

function fail(msg) { throw new Error(`dttune: ${msg}`); }

// ---- meat: locate the 8x10 base-state table --------------------------------------------
function locateMeat(buf) {
  for (let off = MEAT_SCAN_LO; off <= MEAT_SCAN_HI; off++) {
    let ok = true;
    for (let r = 0; r < MEAT_ROWS && ok; r++) {
      const row = off + r * 10;
      if (row + 10 > buf.length) { ok = false; break; }
      // base-state rows: all 10 bytes in 0..100; row 0 must not start with a zero byte
      // (the 0x8A/0x8B lead-in before a 0x8C table can be zeros; true row 0 starts with
      // the cut value which is >= 1 for every db base row we checked)
      if (r === 0 && buf[row] === 0) { ok = false; break; }
      for (let k = 0; k < 10; k++) if (buf[row + k] > 100) { ok = false; break; }
    }
    if (ok) return off;
  }
  return null;
}

function readMeat(buf, off) {
  const rows = [];
  for (let r = 0; r < MEAT_ROWS; r++) {
    const o = off + r * 10;
    const row = { _offset: o };
    for (let i = 0; i < MEAT_COLS.length; i++) row[MEAT_COLS[i]] = buf[o + i];
    row._pad = buf[o + 9];
    row._all100 = MEAT_COLS.every(c => row[c] === 100);
    rows.push(row);
  }
  return rows;
}

// ---- status: locate Poison record by db-validated walk ---------------------------------
// Record: [initial, A, B, durationFrames, increase, max]. A/B vary per record/monster
// (em011 Poison A=300,B=10 / Sleep A=1200,B=5; em001 Poison A=600,B=5), so shape-only
// detection needs guards. Observed invariants across 8 monsters: duration is 0 or a
// multiple of 60 < 7201; db Poison initial >= 50 (min sampled 100); the record always
// starts 4-aligned relative to 0x1F4-type block bases seen so far is NOT guaranteed
// (em024 base 0x351, em057 0x3A1 — odd alignments), so scan on every u16 offset.
function isPlausibleRecord(buf, o) {
  if (o + 12 > buf.length) return false;
  const initial = buf.readUInt16LE(o), a = buf.readUInt16LE(o + 2), b = buf.readUInt16LE(o + 4);
  const dur = buf.readUInt16LE(o + 6), inc = buf.readUInt16LE(o + 8), max = buf.readUInt16LE(o + 10);
  // db initial/max across all sampled statuses are < 1000 (max seen: KO 750, Jump 850,
  // Blast max 1030) — cap initial at 2000 so u8-run garbage (e.g. em001 0x3BE
  // [4622,70,0,0,0,30]) cannot pass as a record. max must be > 0: every enabled status
  // has a positive cap (post-blast garbage like em011 [100,1036,0,0,0,0] fails this).
  return a <= 2000 && b <= 2000 && (dur === 0 || (dur % 60 === 0 && dur < 7201)) &&
         initial >= 1 && initial <= 2000 && inc <= 999 && max > 0 && max <= 9999 && max >= inc;
}

function isPlausiblePoison(buf, o) {
  if (!isPlausibleRecord(buf, o)) return false;
  // db Poison initial min sampled = 100; timed duration must be > 0 (poison is timed
  // in every db row we checked) — rejects tuning garbage like [6,0,600,420,55,500].
  return buf.readUInt16LE(o) >= 50 && buf.readUInt16LE(o + 6) > 0;
}

function locateStatus(buf) {
  // block bases can be ODD (em024 0x351, em057 0x3A1) — scan every byte offset
  for (let o = STATUS_SCAN_LO; o <= STATUS_SCAN_HI; o++) {
    if (isPlausiblePoison(buf, o)) return o;
  }
  return null;
}

// Walk from poisonOff: sequential 12-B records; after Poison there may be a trailing
// u16 pair; placeholder records (all-zero, or 0xFFFF-filled) are reported as such;
// a db row may have no record (record skipped). Stop after Blast.
function readStatus(buf, poisonOff) {
  const recs = [];
  let o = poisonOff;
  for (let i = 0; i < STATUS_NAMES.length && o + 12 <= buf.length; i++) {
    const v = [];
    for (let k = 0; k < 6; k++) v.push(buf.readUInt16LE(o + k * 2));
    const placeholder = v.every(x => x === 0) || v.every(x => x === 0xffff) ||
                        (v[0] === 0 && v[3] === 0 && v[5] === 0);
    // Blast = last record, untimed (A=0, B=0, duration 0). Jump is ALSO untimed, so
    // this rule fires one record too early if applied at the first untimed record —
    // only treat an untimed record as Blast if the next plausible slot is NOT another
    // record (i.e. nothing follows but the damage u16 / next region).
    const untimed = !placeholder && v[1] === 0 && v[2] === 0 && v[3] === 0 && i >= 4;
    let isBlast = false;
    if (untimed) {
      // check hops 12..24 for another plausible/disabled record; records in a block are
      // mutually 2-aligned (bases 0x1F4/0x351/0x35C/0x3A1/0x4E8 all %2==1 consistently
      // within a file), so step 2 from the current record offset
      const step = 2;
      let follower = false;
      for (let hop = 12; hop <= 24 && o + hop + 12 <= buf.length; hop += step) {
        const t = o + hop;
        const w = [];
        for (let k = 0; k < 6; k++) w.push(buf.readUInt16LE(t + k * 2));
        const disabled = w.every(x => x === 0xffff) || (w[0] === 0xffff && w[5] === 0xffff);
        if (isPlausiblePoison(buf, t) || isPlausibleRecord(buf, t) || disabled) { follower = true; break; }
      }
      isBlast = !follower;
    }
    recs.push({
      // name is CANDIDATE ONLY: records may be absent (db-zero statuses) and
      // placeholders present, so the k-th record is not guaranteed to be the k-th
      // status. Validate against db per value before publishing names.
      status: STATUS_NAMES[i] + '?',
      _offset: o,
      initial: v[0], a: v[1], b: v[2], durationFrames: v[3], increase: v[4], max: v[5],
      _placeholder: placeholder,
      _untimed: !placeholder && v[1] === 0 && v[2] === 0 && v[3] === 0,
    });
    // advance: next record may be (a) directly adjacent, (b) after the poison trailing
    // pair, (c) after a placeholder/disabled record (0xFFFF-filled), or (d) absent.
    // Placeholder runs can be long (e.g. em027 0x26B..0x276), so hop up to 6 records.
    let next = null;
    for (let hop = 12; hop <= 72 && o + hop + 12 <= buf.length; hop += 1) {
      const t = o + hop;
      const w = [];
      for (let k = 0; k < 6; k++) w.push(buf.readUInt16LE(t + k * 2));
      const disabled = w.every(x => x === 0xffff) || (w[0] === 0xffff && w[5] === 0xffff);
      if (isPlausiblePoison(buf, t) || (i > 0 && isPlausibleRecord(buf, t)) || disabled) { next = t; break; }
    }
    if (next === null) break;
    o = next;
  }
  // Blast = the LAST non-placeholder untimed record (Jump is untimed too, so we can
  // only know which one is last once the walk ends). Its damage u16 follows the record.
  const lastUntimed = [...recs].reverse().find(r => r._untimed);
  if (lastUntimed) {
    lastUntimed.status = 'blast?';
    if (lastUntimed._offset + 14 <= buf.length) {
      recs.push({
        status: 'blast_damage',
        _offset: lastUntimed._offset + 12,
        value: buf.readUInt16LE(lastUntimed._offset + 12),
      });
    }
  }
  return recs;
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
  const meatOff = locateMeat(buf);
  const statusOff = locateStatus(buf);
  const meat = meatOff !== null ? readMeat(buf, meatOff) : null;
  let status = statusOff !== null ? readStatus(buf, statusOff) : null;
  // False-positive guard: monsters without db status rows (e.g. Fatalis) can still have
  // u8-run garbage that mimics records. A real block has >= 2 records and NO record
  // with max === 0 among non-placeholders (db max is always >= increase > 0 when a
  // status is enabled). If that fails, drop to raw.
  if (status) {
    const act = status.filter(r => !r._placeholder && r.status !== 'blast_damage');
    const badMax = act.some(r => r.max === 0);
    if (act.length < 2 || badMax) {
      status = null;
    }
  }
  const afterMeat = meatOff !== null ? meatOff + MEAT_ROWS * 10 : 0x8e + 0x50;
  const out = {
    file,
    size: buf.length,
    magic: 'DTT',
    headerBytes: [...buf.slice(4, 8)],
    baseHp: buf.readUInt32LE(0x38),           // fixed offset [C 8/8]
    smallInt0x3C: buf.readUInt16LE(0x3c),
    meat: meat ?? { _note: '8x10 base-state table not located in 0x8A..0x94', raw_u16: u16View(buf, 0x8a, 0xdc) },
    meatOffset: meatOff,
    status: status ?? { _note: 'status block not located by Poison-record scan', raw_u16_0x35c_0x3cc: u16View(buf, 0x35c, Math.min(0x3cc, buf.length & ~1)) },
    statusOffset: statusOff,
    records0x40_u16: u16View(buf, 0x40, 0x8a),   // semantics unknown
    tuneFloats: floatCandidates(buf, afterMeat, buf.length), // heuristic, unmapped regions
  };
  return out;
}

// ---- db cross-check (optional) ----------------------------------------------------------
// --db mhgu.db --emid N: tag each located table dbMatch true/false. Status names are
// assigned only when the value-match against db succeeds; otherwise status stays raw.
function checkDb(d, dbPath, emid) {
  let DatabaseSync;
  try {
    DatabaseSync = process.getBuiltinModule?.('node:sqlite')?.DatabaseSync;
    if (!DatabaseSync) {
      // ESM-safe fallback to CJS require
      const req = (0, eval)('typeof require === "function" ? require : null');
      if (!req) return { _note: 'node:sqlite unavailable' };
      ({ DatabaseSync } = req('node:sqlite'));
    }
  } catch { return { _note: 'node:sqlite unavailable' }; }
  const db = new DatabaseSync(dbPath);
  const mon = db.prepare('SELECT _id,name,base_hp FROM monsters WHERE _id=?').get(emid);
  if (!mon) return { _note: `no monsters row _id=${emid}` };
  const out = { monster: mon.name, hpMatch: mon.base_hp === d.baseHp };

  if (d.meatOffset !== null) {
    const cols = ['cut', 'impact', 'shot', 'fire', 'water', 'ice', 'thunder', 'dragon', 'ko'];
    const dbRows = db.prepare('SELECT body_part,cut,impact,shot,fire,water,ice,thunder,dragon,ko FROM monster_damage WHERE monster_id=? ORDER BY _id').all(emid);
    let matched = 0;
    const used = new Set();
    for (const row of d.meat) {
      if (row._all100) continue; // filler rows have no db counterpart
      const si = dbRows.findIndex((x, ix) => !used.has(ix) && cols.every(c => x[c] === row[c]));
      if (si >= 0) { matched++; used.add(si); row.dbPart = dbRows[si].body_part; }
    }
    out.meat = { rows: d.meat.filter(r => !r._all100).length, matched, dbMatch: matched === d.meat.filter(r => !r._all100).length };
  }

  if (Array.isArray(d.status)) {
    const dbSt = db.prepare('SELECT status,initial,increase,max,duration,damage FROM monster_status WHERE monster_id=? ORDER BY _id').all(emid);
    let matched = 0;
    const used = new Set();
    for (const r of d.status) {
      if (r._placeholder || r.status === 'blast_damage') continue;
      const si = dbSt.findIndex((x, ix) => !used.has(ix) && x.initial === r.initial && x.increase === r.increase &&
        x.max === r.max && (x.duration === 0 ? r.durationFrames === 0 : r.durationFrames === x.duration * 60));
      if (si >= 0) {
        matched++; used.add(si);
        r.status = dbSt[si].status.toLowerCase(); // confirmed name
        r.dbMatch = true;
      }
    }
    const bd = d.status.find(x => x.status === 'blast_damage');
    const dbBd = dbSt.find(x => x.status === 'Blast');
    if (bd && dbBd) { bd.dbMatch = bd.value === dbBd.damage; bd.expected = dbBd.damage; }
    const active = d.status.filter(r => !r._placeholder && r.status !== 'blast_damage').length;
    // A "block" where zero records match the db is a false positive (e.g. em013
    // Fatalis: motion-value garbage mimics records; db has no status rows at all).
    if (matched === 0) {
      d.status = { _note: `candidate block at 0x${d.statusOffset.toString(16)} rejected: 0/${active} records match db monster_status`, raw: d.status };
      out.status = { records: 0, matched: 0, dbMatch: false, rejected: true };
    } else {
      out.status = { records: active, matched, dbMatch: matched === active };
    }
  }
  return out;
}

// ---- CLI (only when run directly; importing modules like dttune-all.mjs must not trigger it)
import { pathToFileURL } from 'node:url';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const argv = process.argv.slice(2).filter(a => a !== '--raw');
  const raw = process.argv.includes('--raw');
  const dbIdx = argv.indexOf('--db');
  const idIdx = argv.indexOf('--emid');
  const dbPath = dbIdx >= 0 ? argv[dbIdx + 1] : null;
  const emid = idIdx >= 0 ? Number(argv[idIdx + 1]) : null;
  if (!argv[0] || process.argv.includes('-h') || process.argv.includes('--help')) {
    console.error('usage: node tools/mhgu/dttune.mjs <file_dttune> [--raw] [--db mhgu.db --emid N]');
    process.exit(argv[0] ? 0 : 1);
  }
  const buf = fs.readFileSync(argv[0]);
  const d = decodeDttune(buf, argv[0]);
  if (dbPath && emid) d.db = checkDb(d, dbPath, emid);
  console.log(JSON.stringify(d, null, 2));
  if (raw) {
    const meatOff = locateMeat(buf);
    console.error(`== meat table @0x${meatOff !== null ? meatOff.toString(16) : '??'} ==`);
    if (meatOff !== null) console.error(buf.slice(meatOff, meatOff + 80).toString('hex').replace(/(..)/g, '$1 '));
    console.error('== 0x40..0x8a ==');
    console.error(buf.slice(0x40, Math.min(0x8a, buf.length)).toString('hex').replace(/(..)/g, '$1 '));
    console.error('== unmapped tail ==');
    console.error(buf.slice(0xde).toString('hex').replace(/(..)/g, '$1 '));
  }
}
