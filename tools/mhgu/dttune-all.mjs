// MHGU enemy `*_dttune` batch decoder + mhgu.db cross-check.
//
// For every arc in romfs `nativeNX/arc/enemy/*.arc` (137 files) this tool:
//   1. inflates the `*_dttune` entry (type hash 0x48e8ac29) in memory, nothing raw hits disk;
//   2. decodes it with tools/mhgu/dttune.mjs (fixed-offset view);
//   3. re-localizes the two monster-dependent tables against mhgu.db:
//        - meat   : 8 rows x 10 B (9 x u8 + pad), start offset varies (0x8C / 0x8E / 0x8F seen)
//        - status : 8 records x 12 B with variable strides (poison +4 B, variable pad after jump,
//                   immune rows omitted), start offset varies and is not u16-aligned (0x1F4 /
//                   0x35C / 0x3F5 seen, absent on some monsters); records are anchored on db
//                   values, never on the A/B fields
//      Only HP @0x38 is a fixed offset (spec docs/reference/formats/dttune.md);
//   4. writes one JSON per arc, the public index and a generated report section.
//
// Arc -> slot pairing: the slot map is authoritative for emid. A slot's enemy-table number is
// `emid - 4096` for small monsters and `emid & 0xFF` for large ones (docs/wiki/monsters-index.md
// §1, verified against 129 db rows). Slots sharing a number are ordered by slot index, the arcs
// sharing that number are ordered by variant suffix; the two lists pair up positionally.
// HP then acts as an independent check on the pairing.
//
// Usage:
//   node tools/mhgu/dttune-all.mjs                 # all arcs, writes every artifact
//   node tools/mhgu/dttune-all.mjs --one em011_00  # one arc, print the decoded record
//   node tools/mhgu/dttune-all.mjs --no-write      # full run without touching files
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { readArc, inflateEntry } from './arc.mjs';
import { decodeDttune } from './dttune.mjs';

const ROOT = 'G:/omp works';
const ARC_DIR = 'G:/mhgu-romfs/romfs/nativeNX/arc/enemy';
const DB_PATH = `${ROOT}/MHGU/docs/data/mhgu.db`;
const SLOT_MAP = `${ROOT}/MHGU/docs/data/json/monster-slot-map.json`;
const NAMES_JSON = `${ROOT}/MHGU/docs/data/json/monster-names-chs.json`;
const OUT_DIR = `${ROOT}/MHGU-private/romfs-extract/dttune-all`;
const INDEX = `${ROOT}/MHGU/docs/data/json/monster-dttune-index.json`;
const REPORT = `${ROOT}/.tmp/reports-mhgu/dttune-all.md`;
const REPORT_BEGIN = '<!-- BEGIN GENERATED dttune-all -->';
const REPORT_END = '<!-- END GENERATED dttune-all -->';

const DTTUNE_TAG = 0x48e8ac29;
const HP_OFF = 0x38;
const MEAT_COLS = ['cut', 'impact', 'shot', 'fire', 'water', 'ice', 'thunder', 'dragon', 'ko'];
const MEAT_STRIDE = 10;
const MEAT_PAD = 100;              // pad byte reads 100 on every sampled row (spec 0x8E)
const MEAT_WINDOW = [0x60, 0x140]; // observed starts 0x8C..0x8F; window covers header slack
const STATUS_ORDER = ['Poison', 'Sleep', 'Para', 'KO', 'Exhaust', 'Mount', 'Jump', 'Blast'];
const STATUS_FIELDS = ['initial', 'a', 'b', 'durationFrames', 'increase', 'max'];
const STATUS_ANCHOR = 4;           // db-comparable fields per record: initial / duration / increase / max
const STATUS_MIN_ANCHOR = 3;       // a record must reproduce 3 of the 4, 4 preferred
const STATUS_WINDOW = 64;          // per-record forward search window: 12 B stride, the 4 B poison
                                   // pair and the post-Jump pad (12 B in the surveyed arcs)

const hex = v => '0x' + v.toString(16);

// ---------------------------------------------------------------- source data

function loadDb() {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const monsters = new Map();
  for (const r of db.prepare('SELECT _id, name, base_hp FROM monsters').all()) monsters.set(r._id, r);
  const damage = new Map();
  for (const r of db.prepare('SELECT _id, monster_id, body_part, cut, impact, shot, fire, water, ice, thunder, dragon, ko FROM monster_damage ORDER BY _id').all()) {
    if (!damage.has(r.monster_id)) damage.set(r.monster_id, []);
    damage.get(r.monster_id).push(r);
  }
  const status = new Map();
  for (const r of db.prepare('SELECT _id, monster_id, status, initial, increase, max, duration, damage FROM monster_status ORDER BY _id').all()) {
    if (!status.has(r.monster_id)) status.set(r.monster_id, new Map());
    status.get(r.monster_id).set(r.status, r);
  }
  db.close();
  return { monsters, damage, status };
}

// db monster_damage lists every state (base first, then Enraged/Charged/... variants of the same
// part). The dttune table only holds the base state, so cut the list at the first repeated part.
function baseDamageRows(rows) {
  const norm = s => String(s).replace(/\s*[（(].*$/, '').trim().toLowerCase();
  const seen = new Set();
  const base = [];
  for (const r of rows || []) {
    const k = norm(r.body_part);
    if (seen.has(k)) break;
    seen.add(k);
    base.push(r);
  }
  return base;
}

function loadSlotMap() {
  const slots = JSON.parse(fs.readFileSync(SLOT_MAP, 'utf8'));
  return slots.slice().sort((a, b) => a.slot - b.slot);
}

// monsterName_chS (slot order, verbatim) when published, else the slot map's cn.
function loadNames(slots) {
  const names = new Map();
  for (const s of slots) names.set(s.slot, s.cn ?? null);
  if (!fs.existsSync(NAMES_JSON)) return { names, source: 'monster-slot-map.json (monster-names-chs.json absent)' };
  const raw = JSON.parse(fs.readFileSync(NAMES_JSON, 'utf8'));
  let n = 0;
  const put = (i, text) => {
    if (Number.isInteger(i) && i >= 0 && i < slots.length && typeof text === 'string' && text.trim()) {
      names.set(i, text.trim());
      n++;
    }
  };
  if (Array.isArray(raw)) {
    raw.forEach((e, i) => {
      if (typeof e === 'string') put(i, e);
      else if (e && typeof e === 'object') put(Number.isInteger(e.i) ? e.i : (Number.isInteger(e.slot) ? e.slot : i), e.text ?? e.name ?? e.chs ?? '');
    });
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string') put(Number(k), v);
      else if (v && typeof v === 'object') put(Number.isInteger(v.i) ? v.i : Number(k), v.text ?? v.name ?? v.chs ?? '');
    }
  }
  return { names, source: n ? `monster-names-chs.json (${n} slots)` : 'monster-slot-map.json (names json unreadable)' };
}

// ---------------------------------------------------------------- arc naming

function arcNumber(emid) {
  return emid >= 4096 ? emid - 4096 : emid & 0xff;
}

// Small monsters live in their own arc family (emsNNN, emid 4096+NNN), large ones in emNNN
// (emid & 0xFF). Grouping must keep the two families apart: Aptonoth (4097) and Rathian (1)
// both have number 1 but are different arcs.
function groupKey(family, num) {
  return `${family}${String(num).padStart(3, '0')}`;
}

function slotGroupKey(slot) {
  return groupKey(slot.emid >= 4096 ? 'ems' : 'em', arcNumber(slot.emid));
}

function parseArcName(file) {
  const m = /^(em|ems)(\d{3})_(\d{2})\.arc$/i.exec(file);
  if (!m) return null;
  return { file, stem: m[1].toLowerCase() + m[2] + '_' + m[3], family: m[1].toLowerCase(), num: Number(m[2]), variant: Number(m[3]) };
}

// Slots grouped by enemy-table number + arc family, arcs grouped the same way; pair by position.
function pairArcs(arcs, slots) {
  const byNum = new Map();
  for (const s of slots) {
    const key = slotGroupKey(s);
    if (!byNum.has(key)) byNum.set(key, []);
    byNum.get(key).push(s);
  }
  const arcsByNum = new Map();
  for (const a of arcs) {
    const key = groupKey(a.family, a.num);
    if (!arcsByNum.has(key)) arcsByNum.set(key, []);
    arcsByNum.get(key).push(a);
  }
  const pairing = new Map();
  const warnings = [];
  for (const [key, list] of arcsByNum) {
    list.sort((a, b) => a.variant - b.variant);
    const owners = (byNum.get(key) || []).slice();
    list.forEach((a, idx) => {
      const owner = owners[idx];
      pairing.set(a.stem, owner ?? null);
      if (!owner) warnings.push(`${a.stem}: no slot left for group ${key} (${list.length} arcs vs ${owners.length} slots)`);
    });
    if (owners.length > list.length) {
      for (const s of owners.slice(list.length)) warnings.push(`slot ${s.slot} (emid ${s.emid}, ${s.en}): no arc for group ${key}`);
    }
  }
  return { pairing, warnings, byNum };
}

// ---------------------------------------------------------------- table location

// Meat table: rows of 9 values + 1 pad byte, start offset varies per monster (0x8C / 0x8E / 0x8F /
// 0x90 seen). Every offset in the window is scored by how many db base rows it reproduces (LCS
// alignment of the 8 slots), so a monster whose row 0 differs from db by a point still anchors at
// the right place, and an offset that happens to repeat a common row cannot win over the real one.
function buildMeatRows(buf, offset) {
  const rows = [];
  for (let k = 0; k < 8; k++) {
    const o = offset + k * MEAT_STRIDE;
    if (o + 10 > buf.length) break;
    const row = { offset: o };
    MEAT_COLS.forEach((c, i) => { row[c] = buf[o + i]; });
    row.pad = buf[o + 9];
    row.db_body_part = null;
    row.ok = null;
    rows.push(row);
  }
  return rows;
}

function scoreMeatOffset(buf, offset, baseRows) {
  const rows = buildMeatRows(buf, offset);
  const align = alignMeatRows(rows, baseRows);
  const pad = rows.filter(r => r.pad === MEAT_PAD).length;
  const row0bytes = rows[0] ? MEAT_COLS.reduce((n, c) => n + (rows[0][c] === (baseRows[0]?.[c] ?? 0) ? 1 : 0), 0) : 0;
  return { offset, matched: align.matched, pad, row0bytes, rows, align };
}

function locateMeat(buf, baseRows) {
  const res = { offset: null, matched: 0, compared: 0, candidates: [], near: [] };
  if (!baseRows.length) return res;
  res.compared = baseRows.length;
  const scan = (from, to) => {
    const hits = [];
    for (let o = Math.max(0, from); o + MEAT_STRIDE * 2 <= Math.min(to, buf.length); o++) {
      const s = scoreMeatOffset(buf, o, baseRows);
      if (s.matched > 0) hits.push(s);
    }
    return hits;
  };
  let pool = scan(MEAT_WINDOW[0], MEAT_WINDOW[1]);
  if (!pool.length || Math.max(...pool.map(h => h.matched)) < 2) pool = pool.concat(scan(0, buf.length));
  pool.sort((a, b) => b.matched - a.matched || b.pad - a.pad || b.row0bytes - a.row0bytes || a.offset - b.offset);
  res.candidates = pool.slice(0, 5).map(c => ({ offset: c.offset, matched: c.matched, pad: c.pad, row0bytes: c.row0bytes }));
  res.near = res.candidates;
  if (pool.length) {
    const best = pool[0];
    res.offset = best.offset;
    res.matched = best.matched;
    res.rows = best.rows;
    res.align = best.align;
    res.row0_bytes = best.row0bytes;
  }
  return res;
}

// Status block: 12 B per record, immune rows omitted, +4 B after Poison, variable pad after Jump.
// The block start is per-monster and NOT u16-aligned — 18 of the 137 arcs start on an odd byte
// (em007_04 0x3F5, em024_00 0x351, em025_00 0x1F7, em057_00 0x3A1, ...) — so every byte offset is a
// candidate. A record is anchored on mhgu.db monster_status the way
// MHRS/tools/gu2rise-params.mjs readStatusBlock does it: initial / increase / max /
// floor(durationFrames / 60) are compared with the db row, 4 of 4 preferred and 3 of 4 accepted,
// and every record is searched in a forward window from the end of the previous one because the
// post-Jump pad before Blast is not a fixed length. A and B are never part of the anchor: they vary
// per monster (600/5, 300/10, 150/10, 0/0, ...; docs/reference/formats/dttune.md), so a shape gate
// on them drops real blocks. A block whose records cannot be anchored stays "not located" and its
// best partial walk is reported, never guessed from record shape alone.

// How many of the four db-comparable fields the 12-byte record at `o` reproduces for db row `row`.
function statusRecordHits(buf, o, row) {
  return (buf.readUInt16LE(o) === row.initial)
    // mhgu.db stores whole seconds, romfs keeps frames: 464 f = 7.73 s is recorded as 7.
    + (Math.floor(buf.readUInt16LE(o + 6) / 60) === (row.duration ?? 0))
    + (buf.readUInt16LE(o + 8) === row.increase)
    + (buf.readUInt16LE(o + 10) === row.max);
}

// Walk the whole block from `start`: every present status row must find its record within
// STATUS_WINDOW bytes of the previous record's end. `complete` turns false as soon as one record
// cannot be anchored, so a start that only happens to reproduce the first row cannot claim the block.
function walkStatusBlock(buf, start, dbStatus, present) {
  const records = [];
  let pos = start;
  for (const st of present) {
    const row = dbStatus.get(st);
    const limit = Math.min(pos + STATUS_WINDOW, buf.length - 12);
    let off = -1;
    for (let want = STATUS_ANCHOR; want >= STATUS_MIN_ANCHOR && off < 0; want--) {
      for (let o = pos; o <= limit; o++) {
        if (statusRecordHits(buf, o, row) === want) { off = o; break; }
      }
    }
    if (off < 0) return { records, complete: false };
    records.push({ status: st, offset: off, hits: statusRecordHits(buf, off, row) });
    pos = off + 12;
    if (st === 'Poison') pos += 4; // the poison record is followed by its 2-u16 trailing pair
  }
  return { records, complete: true };
}

function locateStatus(buf, dbStatus) {
  const res = { offset: null, matched: 0, total: 0, records: [], full: [], best: null };
  if (!dbStatus || !dbStatus.size) return res;
  const present = statusLayout(dbStatus);
  if (!present.length) return res;
  res.total = present.length;
  const need = present.length * STATUS_ANCHOR;
  // Candidate starts are the byte offsets that reproduce the first present db row (3 of 4 fields);
  // the whole block is then walked from each. The first-row test is only a filter — a candidate
  // counts when every record anchors — and the block is the walk that reproduces the most db
  // fields, earliest start first.
  const first = dbStatus.get(present[0]);
  const walks = [];
  for (let p = 0x30; p + 12 <= buf.length; p++) {
    if (statusRecordHits(buf, p, first) < STATUS_MIN_ANCHOR) continue;
    const w = walkStatusBlock(buf, p, dbStatus, present);
    w.offset = p;
    w.hits = w.records.reduce((n, r) => n + r.hits, 0);
    walks.push(w);
  }
  walks.sort((a, b) => ((b.complete ? 1 : 0) - (a.complete ? 1 : 0)) || b.hits - a.hits || a.offset - b.offset);
  res.full = walks.filter(w => w.complete && w.hits === need).map(w => w.offset).sort((a, b) => a - b);
  const win = walks[0]?.complete ? walks[0] : null;
  if (!win) {
    const best = walks[0] ?? null;
    if (best) {
      res.best = { offset: best.offset, hits: best.hits, need };
      res.bestRows = best.records.map(r => ({
        status: r.status,
        values: [0, 1, 2, 3, 4, 5].map(i => buf.readUInt16LE(r.offset + i * 2)),
      }));
    }
    return res;
  }
  res.offset = win.offset;
  let matched = 0;
  for (const { status: st, offset: o } of win.records) {
    const rec = { status: st, offset: o };
    STATUS_FIELDS.forEach((f, i) => { rec[f] = buf.readUInt16LE(o + i * 2); });
    const r = dbStatus.get(st);
    rec.db = { initial: r.initial, duration: r.duration, increase: r.increase, max: r.max };
    rec.diffs = [];
    if (rec.initial !== r.initial) rec.diffs.push(`initial ${rec.initial}/${r.initial}`);
    const durSec = r.duration ?? 0;
    if (rec.durationFrames === durSec * 60) {
      // exact
    } else if (Math.floor(rec.durationFrames / 60) === durSec) {
      rec.durationRemainderFrames = rec.durationFrames % 60; // db rounds the duration down to whole seconds
    } else {
      rec.diffs.push(`duration ${rec.durationFrames}f/${durSec}s`);
    }
    if (rec.increase !== r.increase) rec.diffs.push(`increase ${rec.increase}/${r.increase}`);
    if (rec.max !== r.max) rec.diffs.push(`max ${rec.max}/${r.max}`);
    rec.ok = rec.diffs.length === 0;
    if (rec.ok) matched++;
    res.records.push(rec);
  }
  res.matched = matched;
  return res;
}

// Statuses that occupy a record, in db order: an absent or all-zero db row is immune and takes no
// space in the file.
function statusLayout(dbStatus) {
  const present = [];
  for (const st of STATUS_ORDER) {
    const r = dbStatus?.get(st);
    if (!r) continue;
    if (r.initial === 0 && r.increase === 0 && r.max === 0) continue; // immune, row omitted
    present.push(st);
  }
  return present;
}

// Some monsters carry an unused extra row in the 8-slot meat table (Mizutsune row 5 repeats Front
// Legs before Neck/Fin; Kushala pads row 7 with 100s where db has Wings). Align db base rows to
// dttune rows by longest common subsequence so a skipped slot does not turn into a value mismatch,
// while a genuinely different value still leaves its db part unmatched.
function alignMeatRows(rows, baseRows) {
  const n = baseRows.length;
  const m = rows.length;
  const eq = (i, j) => rows[j] && MEAT_COLS.every(c => rows[j][c] === (baseRows[i][c] ?? 0));
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1] + (eq(i - 1, j - 1) ? 1 : 0));
    }
  }
  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (eq(i - 1, j - 1) && dp[i][j] === dp[i - 1][j - 1] + 1) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  pairs.reverse();
  const dbUsed = new Set(pairs.map(p => p[0]));
  const rowUsed = new Set(pairs.map(p => p[1]));
  return {
    pairs,
    matched: pairs.length,
    unmatchedDb: baseRows.map((r, k) => k).filter(k => !dbUsed.has(k)),
    extraRows: rows.map((r, k) => k).filter(k => !rowUsed.has(k)),
  };
}

// ---------------------------------------------------------------- per-arc work

function readDttuneEntry(arcFile) {
  const buf = fs.readFileSync(path.join(ARC_DIR, arcFile));
  let arc;
  try {
    arc = readArc(buf, arcFile);
  } catch (err) {
    return { error: `arc header: ${err.message}` };
  }
  const entries = arc.entries.filter(e => /(^|[\\/])[^\\/]*_dttune$/i.test(e.name));
  if (!entries.length) return { error: `no *_dttune entry among ${arc.count} entries` };
  // A few arcs ship more than one *_dttune (em084_00 has two): take the one named after the arc.
  const stem = path.basename(arcFile, '.arc');
  const own = entries.filter(e => {
    const base = e.name.split(/[\\/]+/).pop();
    return base === `${stem}_dttune`;
  });
  const entry = (own.length === 1 ? own[0] : entries[0]);
  const siblings = entries.filter(e => e !== entry).map(e => e.name);
  if (entry.size === 0) return { error: `dttune entry is empty` };
  let data;
  try {
    data = inflateEntry(buf, entry, arcFile);
  } catch (err) {
    return { error: `inflate: ${err.message}` };
  }
  return { data, entry, siblings, arcCount: arc.count, typeHash: entry.typeHash };
}

function analyseArc(arc, ctx) {
  const rec = {
    arc: arc.stem,
    arc_file: arc.file,
    entry: null,
    size: null,
    type_hash: null,
    hp: null,
    hp_offset: hex(HP_OFF),
    small_int_0x3c: null,
    header_bytes: null,
    meat: null,
    status: null,
    layout: 'raw',
    db_match: { hp: null, meat: null, status: null },
    offsets: { hp: hex(HP_OFF), meat: null, status: null },
    db_values: null,
    notes: [],
  };
  const owner = ctx.pairing.get(arc.stem) ?? null;
  rec.slot = owner ? owner.slot : null;
  rec.emid = owner ? owner.emid : null;
  rec.db_monster_id = owner ? owner.emid : null;
  rec.en = owner ? owner.en ?? null : null;
  rec.chs = owner ? (ctx.names.get(owner.slot) ?? owner.cn ?? null) : null;

  const dtt = readDttuneEntry(arc.file);
  if (dtt.error) {
    rec.notes.push(dtt.error);
    return rec;
  }
  rec.entry = dtt.entry.name;
  rec.type_hash = hex(dtt.typeHash);
  if (dtt.siblings && dtt.siblings.length) rec.notes.push(`extra dttune entries in arc: ${dtt.siblings.join(', ')}`);
  if (dtt.typeHash !== DTTUNE_TAG) rec.notes.push(`unexpected type hash ${hex(dtt.typeHash)}`);
  rec.size = dtt.data.length;

  let decoded = null;
  try {
    decoded = decodeDttune(dtt.data, arc.file);
  } catch (err) {
    rec.notes.push(`decoder: ${err.message}`);
    return rec;
  }
  rec.hp = decoded.baseHp;
  rec.small_int_0x3c = decoded.smallInt0x3C;
  rec.header_bytes = decoded.headerBytes;

  const dbMon = rec.db_monster_id !== null ? ctx.db.monsters.get(rec.db_monster_id) : null;
  const baseRows = dbMon ? baseDamageRows(ctx.db.damage.get(rec.db_monster_id)) : [];
  const dbStatus = rec.db_monster_id !== null ? ctx.db.status.get(rec.db_monster_id) ?? null : null;
  rec.db_values = {
    base_hp: dbMon ? dbMon.base_hp : null,
    damage_rows: ctx.db.damage.get(rec.db_monster_id)?.length ?? 0,
    base_rows: baseRows.length,
    status_rows: dbStatus ? dbStatus.size : 0,
  };

  // --- meat
  const meat = locateMeat(dtt.data, baseRows);
  if (meat.offset !== null) {
    const rows = [];
    for (let k = 0; k < 8; k++) {
      const o = meat.offset + k * MEAT_STRIDE;
      if (o + 10 > dtt.data.length) break;
      const row = { offset: o };
      MEAT_COLS.forEach((c, i) => { row[c] = dtt.data[o + i]; });
      row.pad = dtt.data[o + 9];
      row.db_body_part = null;  // set by alignMeatRows for the rows that pair with a db part
      row.ok = null;
      rows.push(row);
    }
    rec.offsets.meat = hex(meat.offset);
    const align = alignMeatRows(rows, baseRows);
    for (const [dbIdx, rowIdx] of align.pairs) {
      rows[rowIdx].db_body_part = baseRows[dbIdx].body_part;
      rows[rowIdx].ok = true;
    }
    const unmatchedParts = align.unmatchedDb.map(k => baseRows[k].body_part);
    const extraRows = align.extraRows;
    // Leftover db rows and leftover dttune slots usually describe the same part with one divergent
    // value (Kushala Wings impact 20/15, Zinogre Tail Tip impact 20/19). Pair them positionally and
    // report the field-level difference instead of calling the slot "extra".
    const valueDiffs = [];
    const pairedExtra = new Set();
    for (let k = 0; k < Math.min(align.unmatchedDb.length, extraRows.length); k++) {
      const dbRow = baseRows[align.unmatchedDb[k]];
      const rowIdx = extraRows[k];
      const diffs = MEAT_COLS
        .filter(c => rows[rowIdx][c] !== (dbRow[c] ?? 0))
        .map(c => `${c} ${rows[rowIdx][c]}/${dbRow[c] ?? 0}`);
      pairedExtra.add(rowIdx);
      valueDiffs.push({ part: dbRow.body_part, row: rowIdx, diffs });
    }
    const trueExtras = extraRows.filter(k => !pairedExtra.has(k));
    rec.meat = {
      offset: meat.offset,
      stride: MEAT_STRIDE,
      matched: align.matched,
      compared: baseRows.length,
      row0_bytes: meat.row0_bytes ?? null,
      unmatched_db_parts: unmatchedParts,
      unmatched_db_values: align.unmatchedDb.map(k => ({ part: baseRows[k].body_part, v: MEAT_COLS.map(c => baseRows[k][c] ?? 0) })),
      value_diffs: valueDiffs,
      extra_dttune_rows: trueExtras,
      extra_dttune_values: trueExtras.map(k => ({ row: k, v: MEAT_COLS.map(c => rows[k][c]), pad: rows[k].pad })),
      rows,
    };
    rec.meat_rows = align.matched;
    if (meat.candidates.length > 1) rec.notes.push(`${meat.candidates.length} meat anchors in range`);
    if (meat.offset !== 0x8e) rec.notes.push(`meat table starts at ${hex(meat.offset)} (not 0x8e)`);
    const stillUnmatched = unmatchedParts.slice(valueDiffs.length);
    const realDiffs = valueDiffs.filter(v => v.diffs.length);
    // A pure permutation (same values, different slot order - Chaotic Gore swaps Body and R. Wing
    // Talon) is not a value conflict; the alignment still labels every part correctly.
    const pureReorder = valueDiffs.length > 0 && !realDiffs.length && !stillUnmatched.length && !trueExtras.length;
    rec.db_match.meat = baseRows.length ? (align.matched === baseRows.length || pureReorder) : null;
    if (realDiffs.length) rec.notes.push(`meat value diffs: ${realDiffs.map(v => `${v.part}[${v.diffs.join(', ')}]`).join(' ')}`);
    if (pureReorder) rec.notes.push(`meat row order differs from db, values identical: ${valueDiffs.map(v => v.part).join(', ')}`);
    if (stillUnmatched.length) rec.notes.push(`meat unmatched db parts: ${stillUnmatched.join(', ')}`);
    if (trueExtras.length) rec.notes.push(`dttune meat rows with no db part: ${trueExtras.join(',')}`);
  } else {
    rec.meat_rows = 0;
    rec.notes.push(dbMon
      ? 'meat table not located (db base row 0 pattern not found)'
      : 'no db monster for this arc — meat table not locatable without db anchors');
    if (meat.near && meat.near.length) {
      rec.meat_scan = meat.near.map(c => ({ offset: hex(c.offset), rows_matched: c.matched, pad_rows: c.pad, row0_bytes: c.row0bytes }));
    }
  }

  // --- status
  const st = locateStatus(dtt.data, dbStatus);
  if (st.offset !== null) {
    rec.offsets.status = hex(st.offset);
    rec.status = { offset: st.offset, matched: st.matched, total: st.total, records: st.records, ambiguous_hits: st.full.length };
    rec.status_records = st.records.length;
    if (st.full.length > 1) rec.notes.push(`${st.full.length} full status blocks match (using ${hex(st.offset)})`);
    if (st.offset !== 0x35c) rec.notes.push(`status block starts at ${hex(st.offset)} (not 0x35c)`);
    rec.db_match.status = st.matched === st.total;
    const bad = st.records.filter(r => !r.ok).map(r => `${r.status}[${r.diffs.join(', ')}]`);
    if (bad.length) rec.notes.push(`status mismatch: ${bad.join(' ')}`);
  } else {
    rec.status_records = 0;
    if (dbStatus && dbStatus.size) {
      const bestTxt = st.best ? `, best partial ${st.best.hits}/${st.best.need} @${hex(st.best.offset)}` : '';
      rec.notes.push(`status block not located (db has ${dbStatus.size} rows${bestTxt})`);
      if (st.best) rec.status_scan = { offset: hex(st.best.offset), hits: st.best.hits, need: st.best.need, rows: st.bestRows ?? null };
    } else {
      rec.notes.push('db has no monster_status rows (not comparable)');
    }
  }

  if (!dbMon) {
    rec.db_match.hp = null;
    rec.notes.push('no db monster row (hp not comparable)');
  } else if (!(dbMon.base_hp > 0)) {
    // Small monsters and dummy units have base_hp 0/absent in mhgu.db; the romfs value is still real.
    rec.db_match.hp = null;
    rec.notes.push(`db base_hp ${dbMon.base_hp} (db carries no HP for this unit); romfs @0x38 = ${rec.hp}`);
  } else {
    rec.db_match.hp = rec.hp === dbMon.base_hp;
    if (!rec.db_match.hp) {
      rec.notes.push(`hp ${rec.hp} != db ${dbMon.base_hp}`);
      // A pairing error and a real data conflict look identical here; distinguish them by asking
      // whether another slot in the same enemy-table group carries this HP.
      const group = ctx.byNum.get(groupKey(arc.family, arc.num)) || [];
      const alt = group.filter(s => s.slot !== rec.slot && ctx.db.monsters.get(s.emid)?.base_hp === rec.hp);
      if (alt.length) rec.notes.push(`hp equals db of slot ${alt.map(s => `${s.slot}/${s.en}`).join(', ')} (pairing suspect)`);
    }
  }

  rec.layout = rec.offsets.meat !== null && rec.offsets.status !== null ? 'std' : 'raw';
  if (rec.layout === 'raw' && decoded.status && decoded.status._note) rec.notes.push('decoder sentinel failed (raw layout)');
  return rec;
}

// ---------------------------------------------------------------- outputs

function publicIndexEntry(r) {
  return {
    arc: r.arc,
    emid: r.emid,
    slot: r.slot,
    db_monster_id: r.db_monster_id,
    en: r.en,
    chs: r.chs,
    hp: r.hp,
    meat_rows: r.meat_rows ?? 0,
    status_records: r.status_records ?? 0,
    layout: r.layout,
    db_match: r.db_match,
    offsets: r.offsets,
  };
}

function fmtBool(v) {
  return v === true ? 'ok' : v === false ? 'MISMATCH' : 'n/a';
}

function buildReport(results, ctx, meta) {
  const lines = [];
  const push = s => lines.push(s);
  push(REPORT_BEGIN);
  push('');
  push(`Generated by \`tools/mhgu/dttune-all.mjs\` on ${new Date().toISOString()} — ${results.length} arcs.`);
  push('');
  push('| # | arc | slot | emid | name (chs) | hp | db hp | meat @ | rows | status @ | recs | layout | hp | meat | status |');
  push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  results.forEach((r, i) => {
    push(`| ${i} | ${r.arc} | ${r.slot ?? '—'} | ${r.emid ?? '—'} | ${r.chs ?? '—'} | ${r.hp ?? '—'} | ${r.db_values?.base_hp ?? '—'} | ${r.offsets.meat ?? '—'} | ${r.meat_rows ?? 0}/${r.meat?.compared ?? 0} | ${r.offsets.status ?? '—'} | ${r.status_records ?? 0} | ${r.layout} | ${fmtBool(r.db_match.hp)} | ${fmtBool(r.db_match.meat)} | ${fmtBool(r.db_match.status)} |`);
  });
  push('');
  const counts = {
    arcs: results.length,
    hp_ok: results.filter(r => r.db_match.hp === true).length,
    hp_bad: results.filter(r => r.db_match.hp === false).length,
    hp_na_db_has_no_hp: results.filter(r => r.db_match.hp === null && r.db_values && !(r.db_values.base_hp > 0)).length,
    meat_ok: results.filter(r => r.db_match.meat === true).length,
    meat_bad: results.filter(r => r.db_match.meat === false).length,
    meat_na: results.filter(r => r.db_match.meat === null).length,
    status_ok: results.filter(r => r.db_match.status === true).length,
    status_bad: results.filter(r => r.db_match.status === false).length,
    status_na: results.filter(r => r.db_match.status === null).length,
    std: results.filter(r => r.layout === 'std').length,
    raw: results.filter(r => r.layout === 'raw').length,
  };
  push('## Totals');
  push('');
  for (const [k, v] of Object.entries(counts)) push(`- ${k}: ${v}`);
  push('');
  const mismatch = results.filter(r => r.db_match.hp === false || r.db_match.meat === false || r.db_match.status === false);
  push(`## Mismatches (${mismatch.length})`);
  push('');
  if (!mismatch.length) push('- none');
  for (const r of mismatch) {
    const flags = ['hp', 'meat', 'status'].filter(k => r.db_match[k] === false).join('+');
    push(`- ${r.arc} (slot ${r.slot}, emid ${r.emid}, ${r.chs} / ${r.en}): ${flags} — ${r.notes.join('; ')}`);
  }
  push('');
  const hpOnly = mismatch.filter(r => r.db_match.hp === false);
  push(`## Base-HP conflicts only (${hpOnly.length})`);
  push('');
  if (!hpOnly.length) push('- none');
  for (const r of hpOnly) push(`- ${r.arc} slot ${r.slot} emid ${r.emid} ${r.chs} / ${r.en}: romfs ${r.hp} vs db ${r.db_values?.base_hp}`);
  push('');
  const notLocated = results.filter(r => r.offsets.meat === null || r.offsets.status === null);
  push(`## Tables not located / layouts outside the standard one (${notLocated.length})`);
  push('');
  if (!notLocated.length) push('- none');
  for (const r of notLocated) push(`- ${r.arc} (slot ${r.slot}, ${r.chs}): meat ${r.offsets.meat ?? 'not found'}, status ${r.offsets.status ?? 'not found'} — ${r.notes.join('; ')}`);
  push('');
  const meatDiff = results.filter(r => r.meat && (((r.meat.value_diffs || []).length) || ((r.meat.unmatched_db_parts || []).length)));
  push(`## Meat rows where romfs and db disagree (${meatDiff.length} arcs)`);
  push('');
  push('Values are cut/impact/shot/fire/water/ice/thunder/dragon/ko, romfs value first. "row order differs,');
  push('values identical" is a slot permutation and not a value conflict; "absent from the dttune table" means');
  push('the 8-slot table has no row reproducing that db part.');
  push('');
  if (!meatDiff.length) push('- none');
  for (const r of meatDiff) {
    const parts = [];
    for (const v of r.meat.value_diffs || []) {
      parts.push(v.diffs.length ? `${v.part}: ${v.diffs.join(', ')} (dttune/db)` : `${v.part}: row order differs, values identical`);
    }
    const still = (r.meat.unmatched_db_parts || []).slice((r.meat.value_diffs || []).length);
    if (still.length) parts.push(`db part(s) absent from the dttune table: ${still.join(', ')}`);
    const extra = (r.meat.extra_dttune_values || []).map(u => `row ${u.row} = ${u.v.join('/')} (pad ${u.pad})`);
    if (extra.length) parts.push(`unpaired dttune rows: ${extra.join('; ')}`);
    push(`- ${r.arc} ${r.chs}: ${parts.join(' | ') || '(see notes)'}`);
  }
  push('');
  const noDb = results.filter(r => r.db_values && !(r.db_values.base_hp > 0) && r.db_values.damage_rows === 0 && r.db_values.status_rows === 0);
  push(`## Units with no usable db monster row (${noDb.length})`);
  push('');
  push('Small monsters and mechanism units: mhgu.db carries base_hp 0 and no damage/status rows, so no');
  push('dttune field can be cross-checked for them. Their romfs @0x38 HP is still recorded in the index.');
  push('');
  if (!noDb.length) push('- none');
  for (const r of noDb) push(`- ${r.arc} slot ${r.slot} emid ${r.emid} ${r.chs}: romfs hp ${r.hp ?? '—'}`);
  push('');
  push(`## Pairing warnings (${ctx.warnings.length})`);
  push('');
  if (!ctx.warnings.length) push('- none');
  for (const w of ctx.warnings) push(`- ${w}`);
  push('');
  push('## Name source');
  push('');
  push(`- ${meta.nameSource}`);
  push('');
  push(REPORT_END);
  return lines.join('\n');
}

function spliceReport(section) {
  let text = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, 'utf8') : '# dttune batch decode — all enemy arcs\n';
  const b = text.indexOf(REPORT_BEGIN);
  const e = text.indexOf(REPORT_END);
  if (b >= 0 && e > b) text = text.slice(0, b) + section + text.slice(e + REPORT_END.length);
  else text = text.trimEnd() + '\n\n' + section + '\n';
  fs.writeFileSync(REPORT, text);
}

function main(argv) {
  const write = !argv.includes('--no-write');
  const oneIdx = argv.indexOf('--one');
  const one = oneIdx >= 0 ? argv[oneIdx + 1] : null;

  const slots = loadSlotMap();
  const db = loadDb();
  const arcs = fs.readdirSync(ARC_DIR, { withFileTypes: true })
    .filter(d => d.isFile() && /\.arc$/i.test(d.name))
    .map(d => parseArcName(d.name))
    .filter(Boolean)
    .sort((a, b) => a.stem.localeCompare(b.stem));
  const { pairing, warnings, byNum } = pairArcs(arcs, slots);
  const { names, source: nameSource } = loadNames(slots);
  const ctx = { db, pairing, warnings, names, byNum };
  const meta = { nameSource };

  if (one) {
    const arc = arcs.find(a => a.stem === one);
    if (!arc) throw new Error(`no arc ${one} in ${ARC_DIR}`);
    const r = analyseArc(arc, ctx);
    console.log(JSON.stringify(r, null, 2));
    return;
  }

  const results = [];
  for (const arc of arcs) {
    let r;
    try {
      r = analyseArc(arc, ctx);
    } catch (err) {
      r = { arc: arc.stem, notes: [`crash: ${err.message}`], layout: 'raw', db_match: { hp: null, meat: null, status: null }, offsets: { hp: hex(HP_OFF), meat: null, status: null } };
    }
    results.push(r);
    console.error(`[${results.length}/${arcs.length}] ${r.arc} slot=${r.slot ?? '-'} hp=${r.hp ?? '-'} meat=${r.offsets.meat ?? '-'} status=${r.offsets.status ?? '-'}`);
  }

  const section = buildReport(results, ctx, meta);
  if (write) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const r of results) {
      const detail = {
        arc: r.arc,
        arc_file: r.arc_file,
        entry: r.entry,
        type_hash: r.type_hash,
        size: r.size,
        slot: r.slot,
        emid: r.emid,
        db_monster_id: r.db_monster_id,
        en: r.en,
        chs: r.chs,
        hp: r.hp,
        hp_offset: r.hp_offset,
        small_int_0x3c: r.small_int_0x3c,
        header_bytes: r.header_bytes,
        layout: r.layout,
        meat: r.meat,
        meat_scan: r.meat_scan ?? null,
        status: r.status,
        status_scan: r.status_scan ?? null,
        db_values: r.db_values,
        db_match: r.db_match,
        notes: r.notes,
      };
      fs.writeFileSync(path.join(OUT_DIR, `${r.arc}.json`), JSON.stringify(detail, null, 1) + '\n');
    }
    fs.writeFileSync(INDEX, JSON.stringify(results.map(publicIndexEntry), null, 1) + '\n');
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    spliceReport(section);
  }

  const bad = results.filter(r => r.db_match.hp === false || r.db_match.meat === false || r.db_match.status === false);
  console.log(`arcs: ${results.length}`);
  console.log(`hp ok/bad/n.a.: ${results.filter(r => r.db_match.hp === true).length}/${results.filter(r => r.db_match.hp === false).length}/${results.filter(r => r.db_match.hp === null).length}`);
  console.log(`meat ok/bad/n.a.: ${results.filter(r => r.db_match.meat === true).length}/${results.filter(r => r.db_match.meat === false).length}/${results.filter(r => r.db_match.meat === null).length}`);
  console.log(`status ok/bad/n.a.: ${results.filter(r => r.db_match.status === true).length}/${results.filter(r => r.db_match.status === false).length}/${results.filter(r => r.db_match.status === null).length}`);
  console.log(`layout std/raw: ${results.filter(r => r.layout === 'std').length}/${results.filter(r => r.layout === 'raw').length}`);
  console.log(`mismatches: ${bad.length}${bad.length ? ' -> ' + bad.map(r => r.arc).join(' ') : ''}`);
  if (warnings.length) console.log(`pairing warnings: ${warnings.length}`);
  if (write) console.log(`wrote ${results.length} per-arc json -> ${OUT_DIR}`);
  if (write) console.log(`wrote index -> ${INDEX}`);
  if (write) console.log(`wrote report section -> ${REPORT}`);
}

// `import.meta.main` (Node >= 22.18) when present, path comparison otherwise — same guard as arc.mjs.
const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
