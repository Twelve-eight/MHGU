// MHGU enemy `*_dttune` batch decoder + mhgu.db cross-check.
//
// For every arc in romfs `nativeNX/arc/enemy/*.arc` (137 files) this tool:
//   1. inflates the `*_dttune` entry (type hash 0x48e8ac29) in memory, nothing raw hits disk;
//   2. decodes it with tools/mhgu/dttune.mjs (fixed-offset view);
//   3. re-localizes the two monster-dependent tables against mhgu.db:
//        - meat   : 8 rows x 10 B (9 x u8 + pad), start offset varies (0x8C / 0x8E / 0x8F seen)
//        - status : 8 records x 12 B with variable strides (poison +4 B, jump +12 B, immune rows
//                   omitted), start offset varies (0x324 / 0x35C seen, absent on some monsters)
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

function parseArcName(file) {
  const m = /^(em|ems)(\d{3})_(\d{2})\.arc$/i.exec(file);
  if (!m) return null;
  return { file, stem: m[1].toLowerCase() + m[2] + '_' + m[3], family: m[1].toLowerCase(), num: Number(m[2]), variant: Number(m[3]) };
}

// Slots grouped by enemy-table number, arcs grouped the same way; pair by position.
function pairArcs(arcs, slots) {
  const byNum = new Map();
  for (const s of slots) {
    const n = arcNumber(s.emid);
    if (!byNum.has(n)) byNum.set(n, []);
    byNum.get(n).push(s);
  }
  const arcsByNum = new Map();
  for (const a of arcs) {
    if (!arcsByNum.has(a.num)) arcsByNum.set(a.num, []);
    arcsByNum.get(a.num).push(a);
  }
  const pairing = new Map();
  const warnings = [];
  for (const [num, list] of arcsByNum) {
    list.sort((a, b) => a.variant - b.variant);
    const owners = (byNum.get(num) || []).slice();
    for (const a of list) {
      const idx = list.indexOf(a);
      const owner = owners[idx];
      pairing.set(a.stem, owner ?? null);
      if (!owner) warnings.push(`${a.stem}: no slot left for enemy-table number ${num} (${list.length} arcs vs ${owners.length} slots)`);
    }
    if (owners.length > list.length) {
      for (const s of owners.slice(list.length)) warnings.push(`slot ${s.slot} (emid ${s.emid}, ${s.en}): no arc for enemy-table number ${num}`);
    }
  }
  return { pairing, warnings, byNum };
}

// ---------------------------------------------------------------- table location

function bytesEq(buf, off, pat) {
  if (off < 0 || off + pat.length > buf.length) return false;
  for (let i = 0; i < pat.length; i++) if (buf[off + i] !== pat[i]) return false;
  return true;
}

// Meat table: rows of 9 values + 1 pad byte. Anchor = first db base row; the window scan keeps
// every hit and scores the following rows, so a table starting 1-2 B early/late still resolves.
function locateMeat(buf, baseRows) {
  if (!baseRows.length) return { offset: null, matched: 0, compared: 0, candidates: [] };
  const pats = baseRows.map(r => MEAT_COLS.map(c => (r[c] ?? 0) & 0xff));
  const scan = (from, to) => {
    const hits = [];
    for (let o = Math.max(0, from); o + 9 <= Math.min(to, buf.length); o++) {
      if (!bytesEq(buf, o, pats[0])) continue;
      let matched = 1;
      let pad = buf[o + 9] === MEAT_PAD ? 1 : 0;
      for (let k = 1; k < Math.min(pats.length, 8); k++) {
        const p = o + k * MEAT_STRIDE;
        if (p + 9 > buf.length) break;
        if (bytesEq(buf, p, pats[k])) matched++;
        if (buf[p + 9] === MEAT_PAD) pad++;
      }
      hits.push({ offset: o, matched, pad });
    }
    return hits;
  };
  let hits = scan(MEAT_WINDOW[0], MEAT_WINDOW[1]);
  if (!hits.length) hits = scan(0, buf.length); // header wider than the window on this monster
  if (!hits.length) return { offset: null, matched: 0, compared: Math.min(baseRows.length, 8), candidates: [] };
  hits.sort((a, b) => b.matched - a.matched || b.pad - a.pad || a.offset - b.offset);
  const best = hits[0];
  return { offset: best.offset, matched: best.matched, compared: Math.min(baseRows.length, 8), candidates: hits };
}

// Status block: 12 B per record, immune rows omitted, +4 B after Poison and +12 B after Jump.
function statusLayout(dbStatus) {
  const present = [];
  for (const st of STATUS_ORDER) {
    const r = dbStatus?.get(st);
    if (!r) continue;
    if (r.initial === 0 && r.increase === 0 && r.max === 0) continue; // immune, row omitted
    present.push(st);
  }
  const rel = new Map();
  let off = 0;
  for (const st of present) {
    rel.set(st, off);
    off += 12;
    if (st === 'Poison') off += 4;
    if (st === 'Jump') off += 12;
  }
  return { present, rel };
}

function scoreStatusAt(buf, p, dbStatus, layout) {
  let hits = 0;
  for (const st of layout.present) {
    const o = p + layout.rel.get(st);
    if (o + 12 > buf.length) return { hits: -1, need: layout.present.length * 4 };
    const r = dbStatus.get(st);
    if (buf.readUInt16LE(o) === r.initial) hits++;
    if (buf.readUInt16LE(o + 6) === (r.duration ?? 0) * 60) hits++;
    if (buf.readUInt16LE(o + 8) === r.increase) hits++;
    if (buf.readUInt16LE(o + 10) === r.max) hits++;
  }
  return { hits, need: layout.present.length * 4 };
}

function locateStatus(buf, dbStatus) {
  if (!dbStatus || !dbStatus.size) return { offset: null, matched: 0, total: 0, records: [], full: [] };
  const layout = statusLayout(dbStatus);
  if (!layout.present.length) return { offset: null, matched: 0, total: 0, records: [], full: [] };
  const need = layout.present.length * 4;
  const full = [];
  for (let p = 0x30; p + 4 * 12 <= buf.length; p += 2) {
    const { hits } = scoreStatusAt(buf, p, dbStatus, layout);
    if (hits === need) full.push(p);
  }
  const at = full.length ? full[0] : null;
  const records = [];
  let matched = 0;
  if (at !== null) {
    for (const st of layout.present) {
      const o = at + layout.rel.get(st);
      const rec = { status: st, offset: o };
      STATUS_FIELDS.forEach((f, i) => { rec[f] = buf.readUInt16LE(o + i * 2); });
      const r = dbStatus.get(st);
      rec.db = { initial: r.initial, duration: r.duration, increase: r.increase, max: r.max };
      rec.ok = rec.initial === r.initial && rec.durationFrames === (r.duration ?? 0) * 60
        && rec.increase === r.increase && rec.max === r.max;
      if (rec.ok) matched++;
      records.push(rec);
    }
  }
  return { offset: at, matched, total: layout.present.length, records, full };
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
  if (entries.length > 1) return { error: `${entries.length} *_dttune entries (expected 1)` };
  const entry = entries[0];
  if (entry.size === 0) return { error: `dttune entry is empty` };
  let data;
  try {
    data = inflateEntry(buf, entry, arcFile);
  } catch (err) {
    return { error: `inflate: ${err.message}` };
  }
  return { data, entry, arcCount: arc.count, typeHash: entry.typeHash };
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
      const exp = baseRows[k];
      row.db_body_part = exp ? exp.body_part : null;
      row.ok = exp ? MEAT_COLS.every(c => row[c] === (exp[c] ?? 0)) : null;
      rows.push(row);
    }
    rec.offsets.meat = hex(meat.offset);
    rec.meat = { offset: meat.offset, stride: MEAT_STRIDE, matched: meat.matched, compared: meat.compared, rows };
    rec.meat_rows = meat.matched;
    if (meat.candidates.length > 1) rec.notes.push(`${meat.candidates.length} meat anchors in range`);
    if (meat.offset !== 0x8e) rec.notes.push(`meat table starts at ${hex(meat.offset)} (not 0x8e)`);
    rec.db_match.meat = baseRows.length ? meat.matched === meat.compared && meat.compared > 0 : null;
    if (baseRows.length && !rec.db_match.meat) {
      const diff = rows.filter(r => r.ok === false).map(r => `${r.db_body_part ?? '?'}@${hex(r.offset)}`);
      rec.notes.push(`meat mismatch rows: ${diff.join(', ')}`);
    }
  } else {
    rec.meat_rows = 0;
    rec.notes.push(dbMon
      ? 'meat table not located (db base row 0 pattern not found)'
      : 'no db monster for this arc — meat table not locatable without db anchors');
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
    const bad = st.records.filter(r => !r.ok).map(r => r.status);
    if (bad.length) rec.notes.push(`status mismatch: ${bad.join(', ')}`);
  } else {
    rec.status_records = 0;
    if (dbStatus && dbStatus.size) rec.notes.push(`status block not located (db has ${dbStatus.size} rows)`);
    else rec.notes.push('db has no monster_status rows (not comparable)');
  }

  rec.db_match.hp = dbMon ? rec.hp === dbMon.base_hp : null;
  if (rec.db_match.hp === false) {
    rec.notes.push(`hp ${rec.hp} != db ${dbMon.base_hp}`);
    // A pairing error and a real data conflict look identical here; distinguish them by asking
    // whether another slot in the same enemy-table group carries this HP.
    const group = ctx.byNum.get(arc.num) || [];
    const alt = group.filter(s => s.slot !== rec.slot && ctx.db.monsters.get(s.emid)?.base_hp === rec.hp);
    if (alt.length) rec.notes.push(`hp equals db of slot ${alt.map(s => `${s.slot}/${s.en}`).join(', ')} (pairing suspect)`);
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
    push(`| ${i} | ${r.arc} | ${r.slot ?? '—'} | ${r.emid ?? '—'} | ${r.chs ?? '—'} | ${r.hp ?? '—'} | ${r.db_values?.base_hp ?? '—'} | ${r.offsets.meat ?? '—'} | ${r.meat_rows ?? 0}/${r.db_values?.base_rows ?? 0} | ${r.offsets.status ?? '—'} | ${r.status_records ?? 0} | ${r.layout} | ${fmtBool(r.db_match.hp)} | ${fmtBool(r.db_match.meat)} | ${fmtBool(r.db_match.status)} |`);
  });
  push('');
  const counts = {
    arcs: results.length,
    hp_ok: results.filter(r => r.db_match.hp === true).length,
    hp_bad: results.filter(r => r.db_match.hp === false).length,
    meat_ok: results.filter(r => r.db_match.meat === true).length,
    meat_bad: results.filter(r => r.db_match.meat === false).length,
    status_ok: results.filter(r => r.db_match.status === true).length,
    status_bad: results.filter(r => r.db_match.status === false).length,
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
  const notLocated = results.filter(r => r.offsets.meat === null || r.offsets.status === null);
  push(`## Tables not located / layouts outside the standard one (${notLocated.length})`);
  push('');
  if (!notLocated.length) push('- none');
  for (const r of notLocated) push(`- ${r.arc} (slot ${r.slot}, ${r.chs}): meat ${r.offsets.meat ?? 'not found'}, status ${r.offsets.status ?? 'not found'} — ${r.notes.join('; ')}`);
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
        status: r.status,
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
