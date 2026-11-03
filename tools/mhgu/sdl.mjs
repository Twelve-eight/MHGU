// MHGU stage `SDL` (resource type 0x4c0db839, magic "SDL\0", version 22) - scene-object serialiser.
// Spec: docs/reference/formats/sdl.md. The layout below was derived from the bytes and confirmed
// against the game's loader (MHGU main, fn vaddr 0xb4f0b0: `movw r1,#0x4453 / movt r1,#0x4c` +
// `ldrheq [buf+4] == 22`, then `str poolPtr,[buf+0x14]`, `ldrh count,[buf+6]`, and a loop
// `r11 = buf + i*32` switching on the low byte of `[r11+0x18]`, relocating `[r11+0x20]`
// (pool-relative) and `[r11+0x30]/[r11+0x34]` (file-relative)).
//
// Layout (all integers little-endian):
//   0x00 char[4] "SDL\0"
//   0x04 u16 version (22)
//   0x06 u16 recordCount
//   0x08 u32 marker 0xE2316427
//   0x0C u32 unknown designer constant (0 .. 16797216 observed, round numbers; the loader ignores it)
//   0x10 u32 0
//   0x14 u32 poolOffset  (offset of the NUL string pool; == first string, "Root")
//   0x18 record[count]   (32 B each; see below)
//   then  the value area: per record a key array and a value array (offsets stored in the record)
//   poolOffset .. EOF   NUL-terminated string pool: names, class/property names, resource paths
//
// Record (32 B, at 0x18 + 32*i):
//   +0x00 u32 typeWord : u8 type(1..16), u8 mid, u16 count   (count = element count of the field)
//   +0x04 u32 owner    : field records -> index of the owning record; object records -> small id
//   +0x08 u32 nameOff  : offset into the pool of the NUL-terminated name (0 = unnamed)
//   +0x0C u32 nameHash : 0 in the file; the loader replaces it with hash(name) for type 2/3
//   +0x10 u32 reserved (0 in every stage file of the retail corpus; 5 records game-wide are nonzero)
//   +0x14 u32 reserved
//   +0x18 u32 keyOff   : file offset of the key array (count x u32, (tag<<24)|key)
//   +0x1C u32 valOff   : file offset of the value payload array
// The record's slab is [keyOff, next record's keyOff) (last slab ends at poolOffset); keyOff is 0 when
// the record has no values, and the payload runs exactly count*elemsize bytes (elemSize(): t8 = 16,
// t16 = 64, everything else 4), so the slab has no end padding.
// Size identity: 0x18 + count*32 + sum(slabs) + (EOF - poolOffset) == file size.
//
// Slot types (the loader dispatch, same switch as above):
//   1 file/root, 2 object (name + class hash), 3 object (class only), 4 separator/end-of-list,
//   5 named array (element records follow), 6 scalar/int array, 7 (unseen in the retail corpus),
//   8 float payload array, 9 float scalar/vector, 10 (unseen), 11 int list, 12 object reference,
//   13 resource reference array (pool offsets -> resources), 14 offset array, 15 struct array,
//   16 (rare, 40 records game-wide).
//
// Usage:
//   node tools/mhgu/sdl.mjs dump <file>                       # one extracted SDL (.bin / .4c0db839)
//   node tools/mhgu/sdl.mjs dump <file> --json                # machine-readable
//   node tools/mhgu/sdl.mjs arcs <stageDir>                   # every SDL in every *.arc of a stage dir
//   node tools/mhgu/sdl.mjs verify <stageDir|file...>         # strict parse + size identity, exit 1 on error
//   node tools/mhgu/sdl.mjs selftest <known-good file>        # 10 known-bad samples must all be rejected
//   common options: --exe <main.140.flat.bin>  resolve type-2/3 class hashes to engine class names
//                   --json / --quiet / --values N
// Library: parseSdl(buf, label) -> parse tree (throws on any structural violation);
//          tryParseSdl(buf, label) -> {ok, error, sdl}.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const TYPE_HASH = 0x4c0db839;
export const MAGIC = 'SDL\0';
export const VERSION = 22;
export const MARKER = 0xe2316427;
export const HEADER_SIZE = 0x18;
export const RECORD_SIZE = 32;
export const MAX_TYPE = 16;
// Record types named by the loader's dispatch cases and by the payloads observed in the corpus.
export const TYPE_NAMES = {
  1: 'file-root', 2: 'object', 3: 'object-class-only', 4: 'list-end', 5: 'named-array',
  6: 'int-array', 7: 'unseen-7', 8: 'float-array', 9: 'float-vector', 10: 'unseen-10',
  11: 'int-list', 12: 'object-ref', 13: 'resource-array', 14: 'offset-array', 15: 'struct-array',
  16: 'rare-16',
};

const hex = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const typeHashName = h => '0x' + (h >>> 0).toString(16).padStart(8, '0');

// ENGINE CLASS NAMES -------------------------------------------------------------------------------
// A type-2/3 record stores crc32x(engine class name) & 0x7fffffff (crc32x = zlib.crc32 ^ 0xffffffff).
// The exe carries every class name as a plain ASCII string, so the binary itself is the oracle.
export function crc32x(s) { return (zlib.crc32(Buffer.from(s, 'latin1')) ^ 0xffffffff) >>> 0; }
export function classHash(name) { return (crc32x(name) & 0x7fffffff) >>> 0; }
export function classNamesFromImage(buf) {
  const map = new Map();
  let run = [], start = 0;
  const flush = () => {
    if (run.length >= 3) { const s = run.join(''); const h = classHash(s); if (!map.has(h)) map.set(h, s); }
    run = [];
  };
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c >= 0x20 && c < 0x7f) { if (!run.length) start = i; run.push(String.fromCharCode(c)); } else flush();
  }
  flush();
  return map;
}

// PARSE --------------------------------------------------------------------------------------------
export function parseSdl(buf, label = '<buffer>') {
  const bad = msg => { throw new Error(`${label}: ${msg}`); };
  if (buf.length < HEADER_SIZE) bad(`${buf.length} B is too small for an SDL header (${HEADER_SIZE} B)`);
  if (buf.toString('latin1', 0, 4) !== MAGIC) bad(`bad magic ${JSON.stringify(buf.toString('latin1', 0, 4))} (expected "SDL\\0")`);
  const version = buf.readUInt16LE(4);
  if (version !== VERSION) bad(`unsupported version ${version} (expected ${VERSION})`);
  const count = buf.readUInt16LE(6);
  const marker = buf.readUInt32LE(8);
  if (marker !== MARKER) bad(`bad marker ${hex(marker)} (expected ${hex(MARKER)})`);
  const counter = buf.readUInt32LE(0x0c);
  const poolOffset = buf.readUInt32LE(0x14);
  const recEnd = HEADER_SIZE + count * RECORD_SIZE;
  if (count === 0) bad('record count 0');
  if (recEnd > buf.length) bad(`record table ends at 0x${recEnd.toString(16)} but the buffer holds ${buf.length} B`);
  if (poolOffset < recEnd) bad(`string pool at 0x${poolOffset.toString(16)} overlaps the record table (ends 0x${recEnd.toString(16)})`);
  if (poolOffset >= buf.length) bad(`string pool at 0x${poolOffset.toString(16)} is outside the file (${buf.length} B)`);
  if (buf[poolOffset] === 0) bad('string pool starts with an empty string');

  const records = [];
  for (let i = 0; i < count; i++) {
    const o = HEADER_SIZE + i * RECORD_SIZE;
    const tw = buf.readUInt32LE(o);
    const type = tw & 0xff, mid = (tw >>> 8) & 0xff, n = (tw >>> 16) & 0xffff;
    const owner = buf.readUInt32LE(o + 4);
    const nameOff = buf.readUInt32LE(o + 8);
    const nameHash = buf.readUInt32LE(o + 0x0c);
    const r10 = buf.readUInt32LE(o + 0x10);
    const r14 = buf.readUInt32LE(o + 0x14);
    const keyOff = buf.readUInt32LE(o + 0x18);
    const valOff = buf.readUInt32LE(o + 0x1c);
    if (type < 1 || type > MAX_TYPE) bad(`record ${i} (0x${o.toString(16)}): type ${type} outside 1..${MAX_TYPE}`);
    let name = null;
    if (nameOff) {
      const at = poolOffset + nameOff;
      if (at >= buf.length) bad(`record ${i}: name offset 0x${nameOff.toString(16)} leaves the file`);
      let e = at; while (e < buf.length && buf[e] !== 0) e++;
      if (e === at) bad(`record ${i}: name offset 0x${nameOff.toString(16)} points at the middle of a string`);
      name = buf.toString('latin1', at, e);
    }
    if ((keyOff === 0) !== (valOff === 0)) bad(`record ${i}: half-present value area (key=${keyOff.toString(16)} val=${valOff.toString(16)})`);
    if (keyOff) {
      if (keyOff < recEnd) bad(`record ${i}: key array at 0x${keyOff.toString(16)} is inside the record table (ends 0x${recEnd.toString(16)})`);
      if (valOff < keyOff) bad(`record ${i}: value array 0x${valOff.toString(16)} precedes its key array 0x${keyOff.toString(16)}`);
      if (valOff > poolOffset) bad(`record ${i}: value array 0x${valOff.toString(16)} runs past the string pool 0x${poolOffset.toString(16)}`);
    }
    records.push({ index: i, off: o, type, typeName: TYPE_NAMES[type], mid, count: n, owner,
      name, nameOff, nameHash, reserved: [r10, r14], keyOff, valOff });
  }

  // value slabs must be ordered and must tile [recEnd, poolOffset)
  let prev = recEnd;
  for (const r of records) {
    if (!r.keyOff) continue;
    if (r.keyOff < prev) bad(`record ${r.index}: value area 0x${r.keyOff.toString(16)} overlaps the previous one (ends 0x${prev.toString(16)})`);
    prev = r.keyOff;
  }
  const firstVal = records.find(r => r.keyOff);
  if (firstVal && firstVal.keyOff !== recEnd) bad(`first value area at 0x${firstVal.keyOff.toString(16)} does not start at the end of the record table (0x${recEnd.toString(16)})`);

  // slabs + arrays
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.keyOff) continue;
    let end = poolOffset;
    for (let j = i + 1; j < records.length; j++) if (records[j].keyOff) { end = records[j].keyOff; break; }
    const keys = [];
    for (let k = 0; k < r.count; k++) {
      const at = r.keyOff + 4 * k;
      if (at + 4 > r.valOff) break;
      const w = buf.readUInt32LE(at);
      keys.push({ tag: (w >>> 24) & 0xff, key: w & 0xffffff });
    }
    r.slab = [r.keyOff, end];
    r.keys = keys;
    r.payloadBytes = end - r.valOff;
  }
  const lastVal = [...records].reverse().find(r => r.keyOff);
  const valueEnd = lastVal ? lastVal.slab[1] : recEnd;

  // string pool: NUL-separated strings, resource references carry a 4-byte type hash before the path
  const pool = [];
  let o = poolOffset;
  while (o < buf.length) {
    let e = o; while (e < buf.length && buf[e] !== 0) e++;
    if (e === buf.length) bad(`string pool ends at ${buf.length} without a terminating NUL (string at 0x${o.toString(16)})`);
    const text = buf.toString('latin1', o, e);
    const entry = { off: o, rel: o - poolOffset, text };
    // A resource reference is stored as u32 type hash + path inside one pool string, and the hash bytes
    // are not printable, so the raw string starts with them (e.g. 56 58 a1 58 = 0x58a15856 = MOD).
    if (e - o > 5) {
      const printable = [0, 1, 2, 3].every(k => buf[o + k] >= 0x20 && buf[o + k] < 0x7f);
      if (!printable && /\\./.test(text)) {
        entry.refType = typeHashName(buf.readUInt32LE(o));
        entry.text = buf.toString('latin1', o + 4, e);
        entry.refPath = entry.text;
      }
    }
    pool.push(entry);
    o = e + 1;
  }
  if (o !== buf.length) bad(`trailing bytes after the string pool (${buf.length - o})`);

  const classes = [];
  for (const r of records) if ((r.type === 2 || r.type === 3) && r.nameHash) classes.push(r.nameHash >>> 0);

  return { label, version, count, marker, counter, poolOffset, recEnd, valueEnd, records, pool,
    classes: [...new Set(classes)], size: buf.length, buf };
}

export function tryParseSdl(buf, label) {
  try { return { ok: true, sdl: parseSdl(buf, label) }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// payload interpretation --------------------------------------------------------------------------
// Element size per record type (verified in the note, section 4): t8 = float4 (16 B), t16 = MtFCurve
// (64 B), every other type = 4 B. Types 11/15 can carry larger elements (flagged by the size identity).
export function elemSize(type) { return type === 8 ? 16 : type === 16 ? 64 : 4; }

export function elements(sdl, r, limit = 4) {
  if (!r.keyOff || !r.count) return [];
  const b = sdl.buf, out = [], sz = elemSize(r.type), n = Math.min(r.count, limit);
  for (let k = 0; k < n; k++) {
    const at = r.valOff + k * sz;
    if (at + sz > sdl.buf.length) break;
    const el = { index: k };
    if (r.type === 8) el.f32 = [0, 1, 2, 3].map(j => +b.readFloatLE(at + 4 * j).toFixed(3));
    else if (r.type === 9) el.f32 = +b.readFloatLE(at).toFixed(4);
    else if (r.type === 13) {
      const off = b.readUInt32LE(at);
      el.offset = off;
      if (off && sdl.poolOffset + off < b.length) {
        let e = sdl.poolOffset + off; while (e < b.length && b[e] !== 0) e++;
        const p = sdl.pool.find(q => q.off === sdl.poolOffset + off);
        el.resource = p ? p.text : b.toString('latin1', sdl.poolOffset + off, e);
      }
    } else el.u32 = b.readUInt32LE(at);
    out.push(el);
  }
  return out;
}

// text rendering -----------------------------------------------------------------------------------
export function describe(sdl, { exeNames = null, limitValues = 8 } = {}) {
  const lines = [];
  const cls = h => exeNames?.get(h >>> 0) ?? typeHashName(h);
  lines.push(`${sdl.label}: SDL v${sdl.version}, ${sdl.count} records, pool 0x${sdl.poolOffset.toString(16)}, ` +
    `${sdl.pool.length} strings, ${sdl.size} B`);
  lines.push(`  header: marker ${hex(sdl.marker)}, counter ${sdl.counter}, record table 0x${HEADER_SIZE.toString(16)}..0x${sdl.recEnd.toString(16)}, ` +
    `value area 0x${sdl.recEnd.toString(16)}..0x${sdl.poolOffset.toString(16)} (${sdl.poolOffset - sdl.recEnd} B)`);
  lines.push('  #  type       mid n   owner name                    hash      keys                payload');
  for (const r of sdl.records) {
    const n = (r.name ?? '').padEnd(22).slice(0, 22);
    const keys = r.keys ? r.keys.slice(0, limitValues).map(k => `${k.tag}:${k.key}`).join(',') : '';
    const pay = r.keyOff ? `@0x${r.valOff.toString(16)}+${r.payloadBytes}B` : '';
    const hash = (r.type === 2 || r.type === 3) ? cls(r.nameHash) : (r.nameHash ? hex(r.nameHash) : '');
    lines.push(`  ${String(r.index).padStart(3)} t${String(r.type).padEnd(3)}${String(r.typeName).padEnd(18)}${String(r.mid).padStart(3)} ${String(r.count).padStart(3)} ` +
      `${String(r.owner).padStart(5)} ${n} ${(hash || '').padEnd(22).slice(0, 22)} ${keys.padEnd(18).slice(0, 18)} ${pay}`);
    for (const el of elements(sdl, r, 3)) {
      const v = el.f32 !== undefined ? (Array.isArray(el.f32) ? '(' + el.f32.join(', ') + ')' : el.f32)
        : el.resource !== undefined ? `pool+0x${(el.offset || 0).toString(16)} ${el.resource}`
          : String(el.u32);
      lines.push(`        [${el.index}] ${v}`);
    }
  }
  lines.push('  pool:');
  for (const p of sdl.pool) lines.push(`    +0x${p.rel.toString(16).padStart(3, '0')} ${p.refType ? '(' + p.refType + ') ' : ''}${p.text}`);
  return lines.join('\n');
}

export function toJson(sdl, { exeNames = null } = {}) {
  const cls = h => exeNames?.get(h >>> 0) ?? typeHashName(h);
  return {
    label: sdl.label, version: sdl.version, count: sdl.count, size: sdl.size,
    marker: typeHashName(sdl.marker), counter: sdl.counter,
    poolOffset: sdl.poolOffset, recordTable: [HEADER_SIZE, sdl.recEnd], valueArea: [sdl.recEnd, sdl.poolOffset],
    records: sdl.records.map(r => ({
      index: r.index, type: r.type, typeName: r.typeName, mid: r.mid, count: r.count, owner: r.owner,
      name: r.name, nameHash: r.nameHash ? typeHashName(r.nameHash) : null,
      class: (r.type === 2 || r.type === 3) && r.nameHash ? cls(r.nameHash) : null,
      keyOff: r.keyOff || null, valOff: r.valOff || null, slab: r.slab ?? null,
      keys: (r.keys ?? []).map(k => ({ tag: k.tag, key: k.key })),
      payloadBytes: r.payloadBytes ?? 0,
      elements: elements(sdl, r, 8),
    })),
    pool: sdl.pool.map(p => ({ rel: p.rel, text: p.text, refType: p.refType ?? null })),
  };
}

// size identity: every byte belongs to exactly one region ------------------------------------------
export function sizeIdentity(sdl) {
  const records = sdl.count * RECORD_SIZE;
  const values = sdl.poolOffset - sdl.recEnd;
  const pool = sdl.size - sdl.poolOffset;
  const sum = HEADER_SIZE + records + values + pool;
  let slabSum = 0;
  for (const r of sdl.records) if (r.slab) slabSum += r.slab[1] - r.slab[0];
  return { header: HEADER_SIZE, records, values, pool, total: sum, fileSize: sdl.size, slabSum,
    ok: sum === sdl.size && slabSum === values };
}

// CLI ----------------------------------------------------------------------------------------------
function arcsOf(dir) {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.arc')) out.push(p);
  } };
  walk(dir);
  return out.sort();
}

async function loadArcSdls(arcPath) {
  const arc = await import('./arc.mjs');
  const buf = fs.readFileSync(arcPath);
  const a = arc.readArc(buf, arcPath);
  const out = [];
  for (const e of a.entries) {
    if ((e.typeHash >>> 0) !== TYPE_HASH) continue;
    const data = arc.inflateEntry(buf, e, arcPath);
    if (data.length !== e.size) throw new Error(`${arcPath} :: ${e.name}: inflated ${data.length} B != declared ${e.size} B`);
    out.push({ arcPath, entryName: e.name, data });
  }
  return out;
}

function expandTargets(args) {
  const files = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) {
      for (const p of arcsOf(a)) files.push({ kind: 'arc', path: p });
    } else if (a.endsWith('.arc')) files.push({ kind: 'arc', path: a });
    else files.push({ kind: 'file', path: a });
  }
  return files;
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n' +
    '  node tools/mhgu/sdl.mjs dump <file> [--json] [--exe <flat.bin>] [--values N]\n' +
    '  node tools/mhgu/sdl.mjs arcs <stageDir> [--json] [--exe <flat.bin>]\n' +
    '  node tools/mhgu/sdl.mjs verify <stageDir|file|arc>... [--exe <flat.bin>] [--quiet]\n' +
    '  node tools/mhgu/sdl.mjs selftest <known-good file>');
  process.exit(2);
}

function opts(argv) {
  const o = { positional: [], json: false, quiet: false, exe: null, values: 8 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--exe') o.exe = argv[++i] ?? usage('--exe needs a path');
    else if (a === '--values') o.values = Number(argv[++i]);
    else if (a.startsWith('--')) usage(`unknown option ${a}`);
    else o.positional.push(a);
  }
  return o;
}

function exeMap(o) {
  if (!o.exe) return null;
  return classNamesFromImage(fs.readFileSync(o.exe));
}

async function cmdDump(o) {
  const [file] = o.positional;
  if (!file) usage('dump needs a file');
  const names = exeMap(o);
  const sdl = parseSdl(fs.readFileSync(file), file);
  const id = sizeIdentity(sdl);
  if (!id.ok) throw new Error(`${file}: size identity broken (${JSON.stringify(id)})`);
  console.log(o.json ? JSON.stringify(toJson(sdl, { exeNames: names }), null, 1)
    : describe(sdl, { exeNames: names, limitValues: o.values }));
}

async function cmdArcs(o) {
  const [dir] = o.positional;
  if (!dir) usage('arcs needs a stage directory');
  const names = exeMap(o);
  const all = [];
  for (const p of arcsOf(dir)) {
    for (const { entryName, data } of await loadArcSdls(p)) {
      const sdl = parseSdl(data, `${path.basename(p)} :: ${entryName}`);
      const id = sizeIdentity(sdl);
      if (!id.ok) throw new Error(`${entryName}: size identity broken`);
      all.push({ arc: path.basename(p), entry: entryName, sdl });
      if (!o.json) console.log(describe(sdl, { exeNames: names, limitValues: 6 })) ;
    }
  }
  if (o.json) console.log(JSON.stringify(all.map(a => ({ arc: a.arc, entry: a.entry, ...toJson(a.sdl, { exeNames: names }) })), null, 1));
  else console.log(`\n${all.length} SDL(s) parsed, all with size identity`);
  return all;
}

async function cmdVerify(o) {
  const names = exeMap(o);
  const targets = expandTargets(o.positional.length ? o.positional : usage('verify needs a target'));
  let files = 0, failed = 0, bytes = 0;
  const typeHist = new Map(), classHist = new Map();
  for (const t of targets) {
    const list = t.kind === 'arc' ? await loadArcSdls(t.path)
      : [{ arcPath: null, entryName: t.path, data: fs.readFileSync(t.path) }];
    for (const { arcPath, entryName, data } of list) {
      files++; bytes += data.length;
      const label = arcPath ? `${path.basename(arcPath)} :: ${entryName}` : entryName;
      const r = tryParseSdl(data, label);
      if (!r.ok) { failed++; console.error('FAIL ' + r.error); continue; }
      const id = sizeIdentity(r.sdl);
      if (!id.ok) { failed++; console.error(`FAIL ${label}: size identity ${JSON.stringify(id)}`); continue; }
      for (const rec of r.sdl.records) typeHist.set(rec.type, (typeHist.get(rec.type) || 0) + 1);
      for (const h of r.sdl.classes) classHist.set(h, (classHist.get(h) || 0) + 1);
      if (!o.quiet) console.log(`ok   ${label.padEnd(46)} ${String(data.length).padStart(6)} B ` +
        `rec=${String(r.sdl.count).padStart(4)} pool=+0x${r.sdl.poolOffset.toString(16).padStart(4, '0')} ` +
        `${r.sdl.pool.length} strings`);
    }
  }
  const hdr = [...typeHist.entries()].sort((a, b) => a[0] - b[0])
    .map(([t, n]) => `t${t}${names ? ':' + TYPE_NAMES[t] : ''}=${n}`).join(' ');
  console.log(`\n${files} file(s), ${bytes} B, ${failed} failure(s)`);
  console.log('record types: ' + hdr);
  if (names) console.log('classes: ' + [...classHist.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${names.get(h) ?? typeHashName(h)}=${n}`).join(' '));
  if (failed) process.exitCode = 1;
  return { files, failed };
}

// KNOWN-BAD SAMPLES: each mutation must be rejected *for the intended reason*; the basis must parse.
function mutations(good) {
  const m = [];
  const copy = () => Buffer.from(good);
  let b;
  b = copy(); b.write('XDL\0', 0, 'latin1'); m.push(['bad magic', b, /bad magic/]);
  b = copy(); b.writeUInt16LE(23, 4); m.push(['bad version', b, /unsupported version 23/]);
  b = copy(); b.writeUInt32LE(0, 8); m.push(['bad marker', b, /bad marker/]);
  b = copy(); b.writeUInt16LE(good.readUInt16LE(6) + 8, 6); m.push(['record count past the string pool', b, /record table|inside the record table|overlaps/]);
  b = copy(); b.writeUInt32LE(good.length - 3, 0x14); m.push(['string pool outside the file', b, /string pool|leaves the file/]);
  b = copy(); b.writeUInt32LE(0, 0x18); m.push(['record 0 type 0', b, /type 0 outside/]);
  b = copy(); b.writeUInt32LE(0x7fffff, 0x18 + 8); m.push(['name offset past the pool', b, /leaves the file|point at the middle/]);
  b = copy(); b.writeUInt32LE(0x10, 0x18 + 0x18); m.push(['key array inside the record table', b, /inside the record table|half-present/]);
  b = copy(); b.subarray(good.length - 8).fill(0x41); m.push(['string pool not NUL-terminated', b, /without a terminating NUL/]);
  m.push(['truncated file', good.subarray(0, Math.max(HEADER_SIZE + RECORD_SIZE, good.length >> 1)), /record table ends|safer|too small/]);
  return m;
}

function cmdSelftest(o) {
  const [file] = o.positional;
  if (!file) usage('selftest needs a known-good SDL file');
  const good = fs.readFileSync(file);
  const ok = parseSdl(good, file);
  const id = sizeIdentity(ok);
  console.log(`basis ${file}: parses, ${ok.count} records, ${ok.pool.length} strings, size identity ${id.ok ? 'ok' : 'BROKEN'}`);
  if (!id.ok) { console.log('selftest FAILED: the basis file itself breaks size identity'); process.exitCode = 1; return; }
  let bad = 0;
  const cases = mutations(good);
  for (const [what, buf, want] of cases) {
    const r = tryParseSdl(buf, what);
    const msg = r.ok ? '' : r.error.replace(/^.*?: /, '');
    if (r.ok) { console.log(`  MISSED   ${what}`); bad++; }
    else if (!want.test(r.error)) { console.log(`  WRONG    ${what.padEnd(40)} -> ${msg} (not the intended class)`); bad++; }
    else console.log(`  rejected ${what.padEnd(40)} -> ${msg}`);
  }
  console.log(bad ? `selftest FAILED (${bad} case(s) wrong)` : `selftest ok: all ${cases.length} known-bad samples rejected for the intended reason`);
  if (bad) process.exitCode = 1;
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  const o = opts(rest);
  if (cmd === 'dump') return cmdDump(o);
  if (cmd === 'arcs') return cmdArcs(o);
  if (cmd === 'verify') return cmdVerify(o);
  if (cmd === 'selftest') return cmdSelftest(o);
  usage(`unknown command ${cmd}`);
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) await main(process.argv.slice(2));
