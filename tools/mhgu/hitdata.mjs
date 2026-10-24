// MHGU player attack hit data (`pl_weNN_hitdata`, magic "HDP\0") - motion values per weapon.
// Facts: docs/wiki/motion-values.md §0.1/§0.2. Runs on the player's own romfs; contains no game data.
//   node tools/mhgu/hitdata.mjs list <wNN.arc>                     hitdata + hitsize entries of one weapon arc
//   node tools/mhgu/hitdata.mjs dump <wNN.arc|pl_weNN_hitdata.*> [--limit N]
//   node tools/mhgu/hitdata.mjs json [--out f] [--arcs d] [--gmd d] [--extract d] [--from-extract]
//                                 [--strict] [--dry-run]
// `json` decodes all 14 weapon arcs and writes docs/data/json/motion-values.json.
//
// Container: nativeNX/arc/player/quest/wNN.arc, entry `player\hit\pl_weNN_hitdata` (type 0x4E2EF008, zlib).
// Header (16 B): "HDP\0" | u32 version 0x20160209 | u32 count | u32 0
// Record (56 B). Field offsets come from the runtime copier at main vaddr 0x168e98:
//   +0x00 s16 dirA (ldrsh [r5,#0])   | +0x02 s16 dirB (ldrsh [r5,#2])
//   +0x04 u16 MOTION VALUE  -> ldrh [r5,#4]  = strh [r4,#56] (runtime +0x38)   <- the value this tool reports
//   +0x06 u8  hit type      -> ldrb [r5,#6]  = strb [r4,#58] (+0x3A); 0 is rewritten to 1
//   +0x19 u8  hitsize group index - NOT read by that copier; it indexes `pl_weNN_hitsize` (see below)
//   +0x30 u16 is a SEPARATE field (ldrh [r5,#48] = strh [r4,#168]). It happens to equal +0x04 on several
//     blade weapons (w00, w11, ...) but not on w04/w10, so "mirror of the motion value" is NOT a safe rule.
//   +0x36 u16 is not a constant either (0x004B on w00 records, 0x0008 on w11 rec0, 0x0000 on w04 rec0).
// File length is always 16 + count*56; a mismatch is an error, never a silent truncation.
//
// Hitsize table `pl_weNN_hitsize` (type 0x5653C1B0): "HTS\0" | u32 version 0x20131015 | u32 group count |
// u32 0 | count x {u32 itemCount, u32 payloadOffset}[]. The first payload offset equals 16 + count*8 in
// w00 (7 groups -> 0x48) and w11 (12 groups -> 0x70), which is what this tool checks it against; every
// record's +0x19 must then be < count, otherwise the index would run off the hitbox list.
//
// Weapon slots 0..14 map to `table/CommonMsg_chS.gmd` strings i=85..99 in weapon-id order
// (WEAPON_LSWORD .. WEAPON_GAXE). Slot 5 is WEAPON_MBOWGUN `中等弩（缺号）`: no w05.arc and no
// weapon05MsgData_chS.gmd, so the 14 shipped weapon arcs are w00..w04 plus w06..w14.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readArc, inflateEntry } from './arc.mjs';

export const MAGIC = 'HDP\0';
export const VERSION = 0x20160209;
export const HEADER_SIZE = 0x10;
export const RECORD_SIZE = 56;
export const TYPE_HITDATA = 0x4e2ef008;

export const HTS_MAGIC = 'HTS\0';
export const HTS_VERSION = 0x20131015;
export const HTS_HEADER_SIZE = 0x10;
export const HTS_ENTRY_SIZE = 8;
export const TYPE_HITSIZE = 0x5653c1b0;

// Record field offsets (see header comment).
export const OFF = Object.freeze({ dirA: 0x00, dirB: 0x02, mv: 0x04, hitType: 0x06, hitsize: 0x19 });

// 14 weapon arcs; slot 5 (WEAPON_MBOWGUN) has no arc in MHGU.
export const WEAPON_IDS = Object.freeze([
  'w00', 'w01', 'w02', 'w03', 'w04', 'w06', 'w07',
  'w08', 'w09', 'w10', 'w11', 'w12', 'w13', 'w14',
]);
// CommonMsg_chS: 15 consecutive WEAPON_* labels at i=85..99, in weapon-id order.
export const WEAPON_LABEL_BASE = 85;
export const WEAPON_SLOT_COUNT = 15;

// Repo defaults (see tools/mhgu/README.md: scripts carry absolute paths, override on the CLI).
export const DEFAULT_ARCS = 'G:/mhgu-romfs/romfs/nativeNX/arc/player/quest';
export const DEFAULT_GMD = 'G:/omp works/MHGU-private/romfs-extract/gmd/table';
export const DEFAULT_EXTRACT = 'G:/omp works/MHGU-private/romfs-extract/player';
export const DEFAULT_OUT = 'G:/omp works/MHGU/docs/data/json/motion-values.json';

const hex = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');

// Decode one HDP buffer -> {version, count, records:[{i, mv, hitType, hitsize}], zeroMv}.
// A bad magic/version/length throws: a wrong length means the caller inflated the wrong entry.
export function parseHitdata(buf, label = '<buffer>') {
  if (buf.length < HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is too small for an HDP header`);
  if (buf.toString('latin1', 0, 4) !== MAGIC) {
    throw new Error(`${label}: bad magic ${JSON.stringify(buf.toString('latin1', 0, 4))} (expected "HDP\\0")`);
  }
  const version = buf.readUInt32LE(4);
  if (version !== VERSION) {
    throw new Error(`${label}: unsupported HDP version ${hex(version)} (expected ${hex(VERSION)})`);
  }
  const count = buf.readUInt32LE(8);
  const trailer = buf.readUInt32LE(12);
  if (trailer !== 0) throw new Error(`${label}: header +0x0C is ${hex(trailer)}, expected 0`);
  const want = HEADER_SIZE + count * RECORD_SIZE;
  if (buf.length !== want) {
    throw new Error(`${label}: ${buf.length} B != 16 + ${count}*56 = ${want} B (count field disagrees with file size)`);
  }
  const records = [];
  let zeroMv = 0;
  for (let i = 0; i < count; i++) {
    const base = HEADER_SIZE + i * RECORD_SIZE;
    const mv = buf.readUInt16LE(base + OFF.mv);
    if (mv === 0) zeroMv++;
    records.push({
      i,
      mv,
      hitType: buf.readUInt8(base + OFF.hitType),
      hitsize: buf.readUInt8(base + OFF.hitsize),
    });
  }
  return { version, count, records, zeroMv };
}

// Decode one HTS buffer -> {version, count, firstOffset}.
export function parseHitsize(buf, label = '<buffer>') {
  if (buf.length < HTS_HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is too small for an HTS header`);
  if (buf.toString('latin1', 0, 4) !== HTS_MAGIC) {
    throw new Error(`${label}: bad magic ${JSON.stringify(buf.toString('latin1', 0, 4))} (expected "HTS\\0")`);
  }
  const version = buf.readUInt32LE(4);
  if (version !== HTS_VERSION) {
    throw new Error(`${label}: unsupported HTS version ${hex(version)} (expected ${hex(HTS_VERSION)})`);
  }
  const count = buf.readUInt32LE(8);
  const tableEnd = HTS_HEADER_SIZE + count * HTS_ENTRY_SIZE;
  if (buf.length < tableEnd) throw new Error(`${label}: ${count} groups need ${tableEnd} B, file holds ${buf.length} B`);
  const firstOffset = count ? buf.readUInt32LE(HTS_HEADER_SIZE + 4) : tableEnd;
  if (firstOffset !== tableEnd) {
    throw new Error(`${label}: first group payload at ${hex(firstOffset)}, expected ${hex(tableEnd)} `
      + `(16 + ${count}*8); the HTS layout assumption does not hold here`);
  }
  return { version, count, firstOffset };
}

function findEntry(arc, weapon, typeHash, label = '<arc>') {
  const want = `pl_we${weapon.slice(1)}_${typeHash === TYPE_HITDATA ? 'hitdata' : 'hitsize'}`;
  const typed = arc.entries.filter(e => (e.typeHash >>> 0) === typeHash);
  const named = typed.find(e => e.name.split(/[\\/]+/).pop().toLowerCase() === want);
  if (named) return named;
  if (typed.length === 1) return typed[0];
  const have = typed.map(e => JSON.stringify(e.name)).join(', ');
  throw new Error(`${label}: no ${want} entry; type ${hex(typeHash)} entries: ${have || 'none'}`);
}

// Bytes of one per-weapon file: the arc entry (default) or an extracted copy (`--from-extract`).
// Falls back to the other source when the preferred one is absent, saying so in `note`.
// w06.arc ships its hit data under the LEGACY name `pl_we04_hitdata` (byte-identical payload to w04),
// so the entry name, not the weapon id, is what gets matched; both sources report such a name in `note`.
export function loadWeaponFile(weapon, typeHash, {
  arcsDir = DEFAULT_ARCS,
  extractDir = DEFAULT_EXTRACT,
  preferExtract = false,
} = {}) {
  const nn = weapon.slice(1);
  const kind = typeHash === TYPE_HITDATA ? 'hitdata' : 'hitsize';
  const own = `pl_we${nn}_${kind}`.toLowerCase();
  const suffix = (typeHash >>> 0).toString(16);
  const hitDir = path.join(extractDir, weapon, 'player', 'hit');
  const arcPath = path.join(arcsDir, `${weapon}.arc`);

  const fromExtract = () => {
    if (!fs.existsSync(hitDir)) return null;
    const names = fs.readdirSync(hitDir).filter(f => new RegExp(`^pl_we\\d+_${kind}\\.${suffix}$`, 'i').test(f));
    const pick = names.find(f => f.toLowerCase() === `${own}.${suffix}`) ?? (names.length === 1 ? names[0] : null);
    if (!pick) return null;
    const file = path.join(hitDir, pick);
    const note = pick.toLowerCase() === `${own}.${suffix}` ? null : `${weapon}: extract holds legacy entry ${pick}`;
    return { buf: fs.readFileSync(file), label: file, source: 'extract', note };
  };
  const fromArc = () => {
    if (!fs.existsSync(arcPath)) return null;
    const arcBuf = fs.readFileSync(arcPath);
    const arc = readArc(arcBuf, arcPath);
    const entry = findEntry(arc, weapon, typeHash, arcPath);
    const leaf = entry.name.split(/[\\/]+/).pop();
    const note = leaf.toLowerCase() === own ? null : `${weapon}: arc entry is ${leaf} (legacy/shared name)`;
    return { buf: inflateEntry(arcBuf, entry, arcPath), label: `${arcPath} :: ${entry.name}`, source: 'arc', note };
  };

  const first = preferExtract ? fromExtract() : fromArc();
  if (first) return first;
  const second = preferExtract ? fromArc() : fromExtract();
  if (second) return { ...second, note: `${preferExtract ? 'arc' : 'extract'} fallback: preferred source missing` };
  throw new Error(`${weapon}: neither ${arcPath} nor ${hitDir} holds ${own}.${suffix}`);
}

function readStringsJson(file) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file}: ${err.message}`);
  }
  if (!json || !Array.isArray(json.strings)) throw new Error(`${file}: no "strings" array`);
  const byIndex = new Map();
  for (const s of json.strings) if (typeof s.i === 'number') byIndex.set(s.i, s);
  return byIndex;
}

// weapon slot (0..14) -> {i, label, zh} from CommonMsg_chS's WEAPON_* run.
export function weaponTypes(gmdDir = DEFAULT_GMD) {
  const file = path.join(gmdDir, 'CommonMsg_chS.gmd.json');
  const byIndex = readStringsJson(file);
  const types = new Map();
  for (let slot = 0; slot < WEAPON_SLOT_COUNT; slot++) {
    const i = WEAPON_LABEL_BASE + slot;
    const rec = byIndex.get(i);
    const where = `CommonMsg_chS.gmd.json i=${i} (weapon slot ${slot})`;
    if (!rec) throw new Error(`${where}: no such string`);
    if (!/^WEAPON_/.test(rec.label ?? '')) {
      throw new Error(`${where}: label ${JSON.stringify(rec.label)} is not WEAPON_*; the 85..99 run moved`);
    }
    if (typeof rec.text !== 'string' || rec.text === '') throw new Error(`${where}: empty text`);
    types.set(slot, { i, label: rec.label, zh: rec.text });
  }
  return types;
}

// Starter-weapon name (i=6) + type description (i=7) of weaponNNMsgData_chS, used to prove the id->type map.
export function weaponMsgNames(gmdDir, weapon) {
  const file = path.join(gmdDir, `weapon${weapon.slice(1)}MsgData_chS.gmd.json`);
  if (!fs.existsSync(file)) return null;
  const byIndex = readStringsJson(file);
  return { file, starter: byIndex.get(6)?.text ?? null, desc: byIndex.get(7)?.text ?? null };
}

// `重弩炮`/`轻弩炮` appear in weapon text as `重弩`/`轻弩`; every other type name is used verbatim.
const typeStem = zh => zh.replace(/炮$/, '');

// All 14 weapons: records + zh name. Throws on any structural disagreement instead of guessing.
export function buildMotionValues({
  arcsDir = DEFAULT_ARCS,
  gmdDir = DEFAULT_GMD,
  extractDir = DEFAULT_EXTRACT,
  preferExtract = false,
  strict = false,
  log = () => {},
} = {}) {
  const types = weaponTypes(gmdDir);
  const weapons = [];
  for (const weapon of WEAPON_IDS) {
    const slot = Number(weapon.slice(1));
    const { zh, label } = types.get(slot);

    const msg = weaponMsgNames(gmdDir, weapon);
    if (!msg) throw new Error(`${weapon}: weapon${weapon.slice(1)}MsgData_chS.gmd.json is missing under ${gmdDir}`);
    if (msg.desc && !msg.desc.includes(typeStem(zh))) {
      throw new Error(`${weapon}: ${path.basename(msg.file)} i=7 does not mention ${JSON.stringify(typeStem(zh))} `
        + `(CommonMsg_chS i=${WEAPON_LABEL_BASE + slot} ${label} = ${JSON.stringify(zh)}); id->type map is wrong`);
    }

    const opts = { arcsDir, extractDir, preferExtract };
    const hit = loadWeaponFile(weapon, TYPE_HITDATA, opts);
    const parsed = parseHitdata(hit.buf, hit.label);

    let groups = null;
    let outOfRange = 0;
    let sizeNote = 'hitsize table absent';
    try {
      const htsFile = loadWeaponFile(weapon, TYPE_HITSIZE, opts);
      groups = parseHitsize(htsFile.buf, htsFile.label).count;
      const maxIdx = parsed.records.reduce((m, r) => Math.max(m, r.hitsize), 0);
      for (const r of parsed.records) if (r.hitsize >= groups) outOfRange++;
      sizeNote = `hitsize groups ${groups}, idx 0..${maxIdx}`;
      if (outOfRange) {
        sizeNote += `, ${outOfRange} record(s) index past it`;
        if (strict) throw new Error(`${weapon}: ${outOfRange}/${parsed.count} records have +0x19 >= ${groups} groups`);
      }
    } catch (err) {
      if (strict) throw err;
      sizeNote = `hitsize check skipped: ${err.message}`;
    }

    weapons.push({ weapon, zh, label, count: parsed.count, records: parsed.records });
    log(`${weapon} ${zh} [${label}] ${parsed.count} records via ${hit.source} | ${sizeNote}`);
    if (hit.note) log(`${weapon}: ${hit.note}`);
  }
  return weapons;
}

// Public file: array of {weapon, zh, count, records:[{i, mv, hitType, hitsize}]}, one record per line.
// `count` is just records.length (derived), kept so a reader can check completeness without parsing the list.
// Numbers are decoded game values only - no offsets, no file paths.
export function serialise(weapons) {
  const blocks = weapons.map(w => {
    const recs = w.records
      .map(r => `      {"i": ${r.i}, "mv": ${r.mv}, "hitType": ${r.hitType}, "hitsize": ${r.hitsize}}`)
      .join(',\n');
    return `  {\n    "weapon": ${JSON.stringify(w.weapon)},\n    "zh": ${JSON.stringify(w.zh)},\n`
      + `    "count": ${w.count},\n    "records": [\n${recs}\n    ]\n  }`;
  });
  return `[\n${blocks.join(',\n')}\n]\n`;
}

function summarise(parsed) {
  const hitTypes = new Map();
  const hitsizes = new Set();
  for (const r of parsed.records) {
    hitTypes.set(r.hitType, (hitTypes.get(r.hitType) ?? 0) + 1);
    hitsizes.add(r.hitsize);
  }
  const types = [...hitTypes.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `0x${k.toString(16)}x${n}`).join(' ');
  const mvs = parsed.records.map(r => r.mv);
  const maxMv = mvs.length ? Math.max(...mvs) : 0;
  const hs = hitsizes.size ? `[${Math.min(...hitsizes)}..${Math.max(...hitsizes)}]` : '[]';
  return `count=${parsed.count} zeroMv=${parsed.zeroMv} maxMv=${maxMv} hitType{${types}} hitsize${hs}`;
}

function cmdList(file) {
  const buf = fs.readFileSync(file);
  const arc = readArc(buf, file);
  console.log(`# ${file}: arc v0x${arc.version.toString(16)}, ${arc.count} entries`);
  for (const e of arc.entries) {
    const t = e.typeHash >>> 0;
    if (t === TYPE_HITDATA) {
      const parsed = parseHitdata(inflateEntry(buf, e, file), `${file} :: ${e.name}`);
      console.log(`${e.name}  csize=${e.csize}  size=${e.size}  ${summarise(parsed)}`);
    } else if (t === TYPE_HITSIZE) {
      const hts = parseHitsize(inflateEntry(buf, e, file), `${file} :: ${e.name}`);
      console.log(`${e.name}  csize=${e.csize}  size=${e.size}  groups=${hts.count}`);
    }
  }
}

function cmdDump(target, limit) {
  let buf;
  let label = target;
  let hts = null;
  if (/\.arc$/i.test(target)) {
    const arcBuf = fs.readFileSync(target);
    const arc = readArc(arcBuf, target);
    const typed = arc.entries.filter(e => (e.typeHash >>> 0) === TYPE_HITDATA);
    if (typed.length !== 1) throw new Error(`${target}: expected exactly 1 hitdata entry, found ${typed.length}`);
    label = `${target} :: ${typed[0].name}`;
    buf = inflateEntry(arcBuf, typed[0], target);
    const sizeEntry = arc.entries.filter(e => (e.typeHash >>> 0) === TYPE_HITSIZE);
    if (sizeEntry.length === 1) {
      hts = parseHitsize(inflateEntry(arcBuf, sizeEntry[0], target), `${target} :: ${sizeEntry[0].name}`);
    }
  } else {
    buf = fs.readFileSync(target);
  }
  const parsed = parseHitdata(buf, label);
  console.log(`# ${label}`);
  console.log(`# ${summarise(parsed)}${hts ? ` | hitsize groups=${hts.count}` : ''}`);
  const n = limit === undefined ? parsed.records.length : Math.min(limit, parsed.records.length);
  console.log('idx\tmv\thitType\thitsize');
  for (let i = 0; i < n; i++) {
    const r = parsed.records[i];
    console.log(`${r.i}\t${r.mv}\t0x${r.hitType.toString(16)}\t${r.hitsize}`);
  }
  if (n < parsed.records.length) console.log(`# ... ${parsed.records.length - n} more`);
}

function parseFlags(args, spec) {
  const out = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) { rest.push(a); continue; }
    const name = a.slice(2);
    if (!(name in spec)) throw new Error(`unknown flag ${a}`);
    if (spec[name] === 'bool') { out[name] = true; continue; }
    const v = args[++i];
    if (v === undefined) throw new Error(`${a} needs a value`);
    out[name] = v;
  }
  return { out, rest };
}

function cmdJson(args) {
  const { out, rest } = parseFlags(args, {
    out: 'value', arcs: 'value', gmd: 'value', extract: 'value',
    'from-extract': 'bool', strict: 'bool', 'dry-run': 'bool',
  });
  if (rest.length) throw new Error(`json takes no positional arguments (got ${rest.join(' ')})`);
  const dest = out.out ?? DEFAULT_OUT;
  const weapons = buildMotionValues({
    arcsDir: out.arcs ?? DEFAULT_ARCS,
    gmdDir: out.gmd ?? DEFAULT_GMD,
    extractDir: out.extract ?? DEFAULT_EXTRACT,
    preferExtract: out['from-extract'] === true,
    strict: out.strict === true,
    log: msg => console.error(`# ${msg}`),
  });
  const text = serialise(weapons);
  const total = weapons.reduce((n, w) => n + w.count, 0);
  console.error(`# ${weapons.length} weapons, ${total} records -> ${out['dry-run'] === true ? '(dry run)' : dest}`);
  if (out['dry-run'] !== true) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text);
  }
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n'
    + '  node tools/mhgu/hitdata.mjs list <wNN.arc>\n'
    + '  node tools/mhgu/hitdata.mjs dump <wNN.arc|pl_weNN_hitdata.*> [--limit N]\n'
    + '  node tools/mhgu/hitdata.mjs json [--out <file>] [--arcs <dir>] [--gmd <dir>] [--extract <dir>]'
    + ' [--from-extract] [--strict] [--dry-run]');
  process.exit(2);
}

function main(argv) {
  const [cmd, ...args] = argv;
  try {
    if (cmd === 'list') {
      if (args.length !== 1) usage('list takes exactly 1 argument');
      return cmdList(args[0]);
    }
    if (cmd === 'dump') {
      const { out, rest } = parseFlags(args, { limit: 'value' });
      if (rest.length !== 1) usage('dump takes exactly 1 file argument');
      const limit = out.limit === undefined ? undefined : Number(out.limit);
      if (limit !== undefined && !Number.isInteger(limit)) usage(`--limit ${out.limit} is not an integer`);
      return cmdDump(rest[0], limit);
    }
    if (cmd === 'json') return cmdJson(args);
    usage(cmd === undefined ? null : `unknown command ${JSON.stringify(cmd)}`);
  } catch (err) {
    console.error(`ERROR ${err.message}`);
    process.exitCode = 1;
  }
}

// `import.meta.main` (Node >= 22.18) when present, path comparison otherwise.
const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
