// MHGU hunter-arts parameter table `nativeNX/table/hunterArtsData.hta` decoder.
// Spec: .tmp/reports-mhgu/arts-params.md (all offsets below are code-derived from main 1.4.0).
//
// Resource identity [C]:
//   resource tag "hta" in the name pool next to the class name "rHunterArtsData"
//   (pool 0x1567e94 "cskd", 0x1567e99 "rHunterArtsData", 0x1567ea9 "hta"; the sibling tags
//   "skd"/"skt"/"cskd" match table/skillData.skd, table/skillTypeData.skt, table/catSkillData.cskd).
//   Class registration: 0x4ce6b0 (`mov r3,#112` + `bl 0x7aedcc`, class name resolved to 0x1567e99).
//
// File layout [C] (8 + 191*25 == 4783 == file size, both exact):
//   0x00  f32   version/scale   (= 1.4, 0x3FB33333 in the retail file)
//   0x04  u32   record count    (= 191)
//   0x08  ..    191 records x 25 bytes, packed (no padding, records are not 4-byte aligned)
//
// Record layout [C]: the 25 bytes are exactly what the arts serializer 0x4cc09c writes for the
// cHunterArtsBase struct (u32,u32,u32,u8,f32,u8,u8,u16,f32), and the 7 named slots come from the
// member-registration function 0x4cbc10..0x4cbf10 (type codes: 4=u8, 5=u16, 12=f32, 0x10004=u8,
// 0x1000A=4-byte int). "disk" = offset inside the 25-byte record, "obj" = offset in the runtime
// struct.
//   disk 0x00 u32 -> obj +0x04  (unnamed)  record index, 0..190 sequential
//   disk 0x04 u32 -> obj +0x08  (unnamed)  per-art number, 250..2000 in steps of 10
//   disk 0x08 u32 -> obj +0x0C  mArtsCategory       arts id (1..10 common, 11..30 + 35..70 weapon)
//   disk 0x0C u8  -> obj +0x10  mOtMsgType
//   disk 0x0D f32 -> obj +0x14  mOtMsgTimer         (unaligned inside the record)
//   disk 0x11 u8  -> obj +0x18  mArtsGaugeType
//   disk 0x12 u8  -> obj +0x19  mArtsGaugeSPType
//   disk 0x13 u16 -> obj +0x1A  mPointSP
//   disk 0x15 f32 -> obj +0x1C  mXTimer             (unaligned; equals 3.5 * mPointSP on retail data)
//
// Only the 7 registered slots have engine-side names. The two unnamed u32s are real record fields
// (they are part of the same 25-byte serialization) but no mnemonic exists for them, so they are
// printed positionally and never renamed here.
//
// Names: `hunterArtsData_chS.gmd` holds 4 strings per record — 4n = name, 4n+1 = name (long form),
// 4n+2 = short description, 4n+3 = long description. Cross-checked against the citations in
// docs/wiki/styles-arts.md, which uses exactly 4 x recordIndex (拖刀斩Ⅰ = #44 = 4*11,
// 间歇爆炸Ⅰ = #332 = 4*83, 盾锯Ⅰ = #752 = 4*188).
//
// Usage:
//   node tools/mhgu/arts.mjs <hunterArtsData.hta> [--gmd <hunterArtsData_chS.gmd.json>] [--tsv]
//   --tsv   print one line per art instead of JSON
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const HEADER_SIZE = 8;
const RECORD_SIZE = 25;
const RECORD_OFF = {
  index: 0x00, // unnamed u32
  unk04: 0x04, // unnamed u32
  mArtsCategory: 0x08,
  mOtMsgType: 0x0c,
  mOtMsgTimer: 0x0d,
  mArtsGaugeType: 0x11,
  mArtsGaugeSPType: 0x12,
  mPointSP: 0x13,
  mXTimer: 0x15,
};

// Arts-id -> weapon. Each weapon owns 4 consecutive arts ids; the ids 31..34 have no art at all
// (their 12 records are the `@` placeholder groups in the zh gmd). The weapon of every other group
// is the one docs/wiki/styles-arts.md lists those 4 official names under.
const WEAPONS = [
  [11, 14, '大剑'],
  [15, 18, '片手剑'],
  [19, 22, '大锤'],
  [23, 26, '长枪'],
  [27, 30, '重弩'],
  [31, 34, null], // 4 dummy arts between 重弩 and 轻弩 (no zh text, all "@")
  [35, 38, '轻弩'],
  [39, 42, '太刀'],
  [43, 46, '斩击斧'],
  [47, 50, '铳枪'],
  [51, 54, '弓'],
  [55, 58, '双剑'],
  [59, 62, '狩猎笛'],
  [63, 66, '操虫棍'],
  [67, 70, '盾斧'],
];

const FIELD_NOTES = {
  mPointSP: 'arts id points (u16). Engine member name [C]; whether this is the activation cost is [U]',
  mXTimer: 'f32 timer field. Engine member name [C]; semantics [U]. Equals 3.5 * mPointSP on retail data',
  unk04: 'unnamed u32 record field, 250..2000 in steps of 10 — only unregistered numeric slot, likely the arts-gauge cost [I]',
  index: 'unnamed u32 record field, strictly 0..190 — a record/level index',
  mArtsGaugeType: 'u8 gauge-type enum (0..4)',
  mArtsGaugeSPType: 'u8 SP gauge-type enum (0..3)',
  mOtMsgType: 'u8 message-type enum (0..2)',
  mOtMsgTimer: 'f32 message timer',
  slotCost: 'no per-art slot-cost field exists in this file (3 equip slots are a save/equip-side concept) [U]',
};

function fail(msg) { throw new Error(`arts: ${msg}`); }

export function weaponOf(artsId) {
  for (const [lo, hi, name] of WEAPONS) if (artsId >= lo && artsId <= hi) return name;
  return undefined;
}

export function readRecord(buf, index) {
  const o = HEADER_SIZE + index * RECORD_SIZE;
  if (o + RECORD_SIZE > buf.length) fail(`record ${index} out of bounds`);
  return {
    record: index,
    offset: o,
    index: buf.readUInt32LE(o + RECORD_OFF.index),
    unk04: buf.readUInt32LE(o + RECORD_OFF.unk04),
    mArtsCategory: buf.readUInt32LE(o + RECORD_OFF.mArtsCategory),
    mOtMsgType: buf.readUInt8(o + RECORD_OFF.mOtMsgType),
    mOtMsgTimer: buf.readFloatLE(o + RECORD_OFF.mOtMsgTimer),
    mArtsGaugeType: buf.readUInt8(o + RECORD_OFF.mArtsGaugeType),
    mArtsGaugeSPType: buf.readUInt8(o + RECORD_OFF.mArtsGaugeSPType),
    mPointSP: buf.readUInt16LE(o + RECORD_OFF.mPointSP),
    mXTimer: buf.readFloatLE(o + RECORD_OFF.mXTimer),
  };
}

export function readHeader(buf) {
  if (buf.length < HEADER_SIZE) fail('file shorter than the 8-byte header');
  const version = buf.readFloatLE(0);
  const count = buf.readUInt32LE(4);
  const expected = HEADER_SIZE + count * RECORD_SIZE;
  if (expected !== buf.length) {
    fail(`record count ${count} implies ${expected} bytes, file is ${buf.length} bytes`
      + ' (not a 25-byte-record hunterArtsData.hta)');
  }
  return { version, count, size: buf.length };
}

// `gmd` = parsed hunterArtsData_chS.gmd.json (optional). Returns record index -> {name, longName,
// descShort, descLong}.
export function namesFromGmd(gmd) {
  const s = gmd && Array.isArray(gmd.strings) ? gmd.strings : [];
  const at = i => (s[i] && typeof s[i].text === 'string' ? s[i].text : null);
  const max = Math.floor(s.length / 4);
  const out = new Map();
  for (let n = 0; n < max; n++) {
    out.set(n, { name: at(4 * n), longName: at(4 * n + 1), descShort: at(4 * n + 2), descLong: at(4 * n + 3) });
  }
  return out;
}

function stripLevelSuffix(name) {
  return typeof name === 'string' ? name.replace(/[ⅠⅡⅢ]+$/, '') : name;
}

export function decodeArts(buf, { gmd = null, file = null } = {}) {
  const header = readHeader(buf);
  const names = gmd ? namesFromGmd(gmd) : new Map();

  const records = [];
  for (let i = 0; i < header.count; i++) {
    const rec = readRecord(buf, i);
    const nm = names.get(i) || {};
    records.push({
      ...rec,
      weapon: weaponOf(rec.mArtsCategory),
      name: nm.name ?? null,
      longName: nm.longName ?? null,
      descShort: nm.descShort ?? null,
      descLong: nm.descLong ?? null,
    });
  }

  // Group by mArtsCategory (arts id). Records order inside a group is ascending record index, which
  // is the Ⅰ/Ⅱ/Ⅲ order of the official names.
  const byId = new Map();
  for (const rec of records) {
    if (rec.mArtsCategory === 0) continue; // record 0 = the `无装备` dummy
    if (!byId.has(rec.mArtsCategory)) byId.set(rec.mArtsCategory, []);
    byId.get(rec.mArtsCategory).push(rec);
  }

  const arts = [];
  for (const [artsId, recs] of [...byId.entries()].sort((a, b) => a[0] - b[0])) {
    const lv1 = recs[0];
    const placeholder = recs.every(r => r.name === '@');
    arts.push({
      id: artsId,
      weapon: lv1.weapon ?? null,
      name: placeholder ? null : stripLevelSuffix(lv1.name),
      placeholder,
      levelCount: recs.length,
      // The two numbers the wiki asks for. `gauge` is the only unregistered numeric record slot
      // (see FIELD_NOTES.unk04); mPointSP/mXTimer are the named fields and are printed per level.
      gauge: lv1.unk04,
      gaugeField: 'record+0x04 (obj+0x08, unnamed u32)',
      gaugeConfidence: 'I',
      slotCost: null,
      slotCostConfidence: 'U',
      levels: recs.map((r, i) => ({
        level: i + 1,
        record: r.record,
        offset: `0x${r.offset.toString(16)}`,
        name: r.name,
        descShort: r.descShort,
        descLong: r.descLong,
        mArtsCategory: r.mArtsCategory,
        mOtMsgType: r.mOtMsgType,
        mOtMsgTimer: r.mOtMsgTimer,
        mArtsGaugeType: r.mArtsGaugeType,
        mArtsGaugeSPType: r.mArtsGaugeSPType,
        mPointSP: r.mPointSP,
        mXTimer: r.mXTimer,
        unk04: r.unk04,
        index: r.index,
      })),
    });
  }

  return {
    file,
    size: header.size,
    header: { version: header.version, count: header.count },
    recordSize: RECORD_SIZE,
    fieldNotes: FIELD_NOTES,
    artCount: arts.filter(a => !a.placeholder).length,
    arts,
    records,
  };
}

function tsv(decoded) {
  const lines = ['id\tweapon\tname\tlv\trecord\toffset\tmPointSP\tmXTimer\tunk+0x04\tmArtsGaugeType\tmArtsGaugeSPType\tmOtMsgType\tmOtMsgTimer'];
  for (const art of decoded.arts) {
    for (const lv of art.levels) {
      lines.push([
        art.id,
        art.weapon ?? '-',
        lv.name ?? '-',
        lv.level,
        lv.record,
        lv.offset,
        lv.mPointSP,
        lv.mXTimer,
        lv.unk04,
        lv.mArtsGaugeType,
        lv.mArtsGaugeSPType,
        lv.mOtMsgType,
        lv.mOtMsgTimer,
      ].join('\t'));
    }
  }
  return lines.join('\n');
}

function usage(msg) {
  const text = `${msg}\n`
    + 'usage: node tools/mhgu/arts.mjs <hunterArtsData.hta> [--gmd <hunterArtsData_chS.gmd.json>] [--tsv]\n'
    + '  --gmd  hunterArtsData_chS.gmd.json, adds the official zh name/description per record\n'
    + '  --tsv  one tab-separated line per art level instead of JSON';
  process.stderr.write(`${text}\n`);
  process.exit(2);
}

function main(argv) {
  let file = null;
  let gmdPath = null;
  let asTsv = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--gmd') { gmdPath = argv[++i]; if (!gmdPath) usage('--gmd needs a path'); }
    else if (a === '--tsv') asTsv = true;
    else if (a.startsWith('-')) usage(`unknown option ${a}`);
    else if (file === null) file = a;
    else usage(`unexpected argument ${a}`);
  }
  if (file === null) usage('missing <hunterArtsData.hta>');

  const buf = fs.readFileSync(file);
  const gmd = gmdPath === null ? null : JSON.parse(fs.readFileSync(gmdPath, 'utf8'));
  const decoded = decodeArts(buf, { gmd, file });
  process.stdout.write(`${asTsv ? tsv(decoded) : JSON.stringify(decoded, null, 2)}\n`);
}

// `import.meta.main` (Node >= 22.18) when present, path comparison otherwise — same guard as arc.mjs,
// so `import { decodeArts } from './arts.mjs'` does not run the CLI.
const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
