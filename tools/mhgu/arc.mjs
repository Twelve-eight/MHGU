// MHGU `.arc` container (romfs, e.g. nativeNX/loc/arc/resident.arc).
// Header: "ARC\0" | u16 version @4 (0x11) | u16 count @6 | u32 pad @8 ; entries @0x0C, 80 B each.
// Entry: name[64] (latin1, NUL padded, `\` = dir sep) | u32 type hash | u32 compressed size
//        | u32 size|flags (low 29 bits = uncompressed size, flag 0x40000000 observed) | u32 payload offset.
//        Payload = zlib stream (inflate), offset absolute from file start [I: absolute per MH arc convention].
// Payload offsets are only bounds-checked where they are used (inflateEntry / list warning), so readArc()
// also accepts a header+table-only buffer.
// Usage:
//   node tools/mhgu/arc.mjs list <file.arc>
//   node tools/mhgu/arc.mjs extract <file.arc> <outdir> [nameRegex]
//   node tools/mhgu/arc.mjs find <romfsDir> <nameRegex>
//   node tools/mhgu/arc.mjs pack <indir> <out.arc>
//   node tools/mhgu/arc.mjs roundtrip-check <file.arc>
// Library: readArc(buf), inflateEntry(buf, entry), packArc(entries, opts).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'ARC\0';
export const VERSION = 0x11;
export const HEADER_SIZE = 0x0c;
export const ENTRY_SIZE = 80;
export const DEFAULT_FLAGS = 0x40000000;
export const ORDER_MANIFEST = '_arc_order.json';
const SIZE_MASK = 0x1fffffff; // low 29 bits = uncompressed size
const FLAG_MASK = 0xe0000000; // high 3 bits = flags
const STAGE_RANK = new Map([
  [0x241f5deb, 0], // rTexture (TEX)
  [0x2749c8a8, 1], // rMaterial (MRL)
  [0x58a15856, 2], // rModel (MOD)
]);

const hex32 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');

export function readArc(buf, label = '<buffer>') {
  if (buf.length < HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is too small for an arc header`);
  if (buf.toString('latin1', 0, 4) !== MAGIC) throw new Error(`${label}: bad magic (expected "ARC\\0")`);
  const version = buf.readUInt16LE(4);
  if (version !== VERSION) {
    throw new Error(`${label}: unsupported arc version 0x${version.toString(16).padStart(4, '0')} (expected 0x0011)`);
  }
  const count = buf.readUInt16LE(6);
  const tableEnd = HEADER_SIZE + count * ENTRY_SIZE;
  if (tableEnd > buf.length) {
    throw new Error(`${label}: entry table ends at 0x${tableEnd.toString(16)} but buffer holds only ${buf.length} B`);
  }
  const entries = [];
  for (let i = 0; i < count; i++) {
    const base = HEADER_SIZE + i * ENTRY_SIZE;
    const raw = buf.toString('latin1', base, base + 64);
    const nul = raw.indexOf('\0');
    const name = nul < 0 ? raw : raw.slice(0, nul);
    const typeHash = buf.readUInt32LE(base + 64);
    const csize = buf.readUInt32LE(base + 68);
    const field = buf.readUInt32LE(base + 72);
    entries.push({
      index: i,
      name,
      typeHash,
      csize,
      size: field & SIZE_MASK,
      flags: field & FLAG_MASK,
      offset: buf.readUInt32LE(base + 76),
    });
  }
  return { version, count, entries };
}

// Inflate one entry; throws (message names the entry) if the payload is out of bounds, is not zlib,
// or does not inflate to exactly `entry.size` bytes.
export function inflateEntry(buf, entry, label = '<buffer>') {
  const who = `${label}: entry "${entry.name}"`;
  if (entry.csize === 0) {
    if (entry.size !== 0) throw new Error(`${who}: size field ${entry.size} B but compressed size is 0`);
    return Buffer.alloc(0);
  }
  const end = entry.offset + entry.csize;
  if (end > buf.length) {
    throw new Error(`${who}: payload [${hex32(entry.offset)}, ${hex32(end)}) is past EOF (${buf.length} B)`);
  }
  let data;
  try {
    data = zlib.inflateSync(buf.subarray(entry.offset, end));
  } catch (err) {
    throw new Error(`${who}: zlib inflate failed at ${hex32(entry.offset)} (csize ${entry.csize}) - ${err.message}`);
  }
  if (data.length !== entry.size) throw new Error(`${who}: inflated ${data.length} B != size field ${entry.size} B`);
  return data;
}

function alignUp(value, align) {
  if (align <= 1) return value;
  const rem = value % align;
  return rem === 0 ? value : value + (align - rem);
}

/**
 * Pack entries into an MHGU `ARC\0` v0x11 container buffer.
 * Each entry requires `{ name, typeHash, data }` and optional `flags` (default `0x40000000`).
 */
export function packArc(entries, opts = {}) {
  if (!Array.isArray(entries)) throw new TypeError('packArc: entries must be an array');
  if (entries.length > 0xffff) throw new Error(`packArc: ${entries.length} entries exceeds u16 limit (65535)`);
  const version = opts.version ?? VERSION;
  if (version !== VERSION) throw new Error(`packArc: unsupported version 0x${version.toString(16)} (expected 0x11)`);
  const level = opts.level ?? zlib.constants.Z_DEFAULT_COMPRESSION;
  const defaultFlags = (opts.defaultFlags ?? DEFAULT_FLAGS) >>> 0;
  const align = opts.align ?? 1;
  if (!Number.isInteger(align) || align < 1) throw new RangeError(`packArc: invalid align ${align}`);
  const tableEnd = HEADER_SIZE + entries.length * ENTRY_SIZE;
  const firstOffset = opts.firstOffset ?? alignUp(tableEnd, 32);
  if (!Number.isInteger(firstOffset) || firstOffset < 0) throw new RangeError(`packArc: invalid firstOffset ${firstOffset}`);
  const pad = (opts.pad ?? 0) >>> 0;

  let cursor = Math.max(tableEnd, firstOffset);
  const prepared = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || typeof entry.name !== 'string' || entry.name.length === 0) {
      throw new Error(`packArc: entry[${i}] must have a non-empty string name`);
    }
    for (let k = 0; k < entry.name.length; k++) {
      const code = entry.name.charCodeAt(k);
      if (code === 0 || code > 0xff) {
        throw new Error(`packArc: entry[${i}] name ${JSON.stringify(entry.name)} contains invalid char (must be Latin-1/ASCII without NUL)`);
      }
    }
    if (entry.name.length > 63) {
      throw new Error(`packArc: entry[${i}] name "${entry.name}" exceeds 63 bytes (${entry.name.length} B; need >= 1 NUL byte)`);
    }
    if (!Number.isInteger(entry.typeHash)) {
      throw new Error(`packArc: entry[${i}] "${entry.name}" missing integer typeHash`);
    }
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data ?? []);
    if (raw.length > SIZE_MASK) {
      throw new Error(`packArc: entry[${i}] "${entry.name}" size ${raw.length} exceeds 29-bit limit`);
    }
    const flags = (entry.flags === undefined ? defaultFlags : (entry.flags >>> 0));
    if ((flags & SIZE_MASK) !== 0) {
      throw new Error(`packArc: entry[${i}] "${entry.name}" flags 0x${flags.toString(16)} overlaps 29-bit size field`);
    }
    const compressed = (raw.length === 0 && !opts.compressEmpty)
      ? Buffer.alloc(0)
      : zlib.deflateSync(raw, { level });
    cursor = alignUp(cursor, align);
    const offset = cursor;
    cursor += compressed.length;
    prepared.push({
      name: entry.name,
      typeHash: entry.typeHash >>> 0,
      size: raw.length,
      flags: flags & FLAG_MASK,
      compressed,
      offset,
    });
  }

  if (cursor > 0xffffffff) throw new Error(`packArc: total archive size ${cursor} B exceeds u32 offset range`);
  const out = Buffer.alloc(cursor);
  out.write(MAGIC, 0, 'latin1');
  out.writeUInt16LE(version, 4);
  out.writeUInt16LE(prepared.length, 6);
  out.writeUInt32LE(pad, 8);

  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    const base = HEADER_SIZE + i * ENTRY_SIZE;
    out.write(p.name, base, 64, 'latin1');
    out.writeUInt32LE(p.typeHash, base + 64);
    out.writeUInt32LE(p.compressed.length, base + 68);
    out.writeUInt32LE((p.flags | p.size) >>> 0, base + 72);
    out.writeUInt32LE(p.offset >>> 0, base + 76);
    if (p.compressed.length > 0) p.compressed.copy(out, p.offset);
  }
  return out;
}

// `<outdir>`-relative target: backslashes become directories, `.` + 8-digit type hash is appended.
function entryRelPath(entry) {
  const parts = entry.name.split(/[\\/]+/).filter(p => p.length > 0);
  if (parts.length === 0) throw new Error(`entry ${JSON.stringify(entry.name)}: name has no path component`);
  if (parts.some(p => p === '.' || p === '..')) {
    throw new Error(`entry "${entry.name}": refusing path traversal in entry name`);
  }
  parts[parts.length - 1] += '.' + (entry.typeHash >>> 0).toString(16).padStart(8, '0');
  return path.join(...parts);
}

function compileRe(pattern) {
  try {
    return new RegExp(pattern, 'i');
  } catch (err) {
    throw new Error(`bad nameRegex ${JSON.stringify(pattern)}: ${err.message}`);
  }
}

function cmdList(file) {
  const buf = fs.readFileSync(file);
  const arc = readArc(buf, file);
  const head = ['idx', 'name', 'type_hash', 'csize', 'size', 'offset'];
  const rows = arc.entries.map(e => [String(e.index), e.name, hex32(e.typeHash), String(e.csize), String(e.size), hex32(e.offset)]);
  const w = head.map((h, c) => rows.reduce((m, r) => Math.max(m, r[c].length), h.length));
  const fmt = r => r.map((v, c) => (c === 1 ? v.padEnd(w[c]) : v.padStart(w[c]))).join('  ');
  console.log(`# ${file}: arc v0x${arc.version.toString(16)}, ${arc.count} entries`);
  console.log(fmt(head));
  for (const r of rows) console.log(fmt(r));
  for (const e of arc.entries) {
    if (e.csize && e.offset + e.csize > buf.length) {
      console.error(`WARN ${file}: entry "${e.name}" payload [${hex32(e.offset)}, +${e.csize}) is past EOF (${buf.length} B)`);
    }
  }
}

function cmdExtract(file, outdir, pattern) {
  const buf = fs.readFileSync(file);
  const arc = readArc(buf, file);
  const re = pattern === undefined ? null : compileRe(pattern);
  fs.mkdirSync(outdir, { recursive: true });
  let ok = 0, bad = 0, skipped = 0;
  const manifestEntries = [];
  for (const e of arc.entries) {
    if (re && !re.test(e.name)) { skipped++; continue; }
    let rel;
    try { rel = entryRelPath(e); } catch (err) { console.error(`ERROR ${file}: ${err.message}`); bad++; continue; }
    let data;
    try { data = inflateEntry(buf, e, file); } catch (err) { console.error(`ERROR ${err.message}`); bad++; continue; }
    try {
      const target = path.join(outdir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
    } catch (err) { console.error(`ERROR ${file}: write ${rel} failed - ${err.message}`); bad++; continue; }
    manifestEntries.push({
      file: rel.split(path.sep).join('/'),
      name: e.name,
      typeHash: hex32(e.typeHash),
      flags: hex32(e.flags),
    });
    console.log(`${rel} ${data.length}`);
    ok++;
  }
  fs.writeFileSync(
    path.join(outdir, ORDER_MANIFEST),
    JSON.stringify({ version: arc.version, pad: buf.readUInt32LE(8), entries: manifestEntries }, null, 2) + '\n',
  );
  const notes = [`${ok} extracted`, `${bad} failed`];
  if (re) notes.push(`${skipped} not matching`);
  console.error(`# ${notes.join(', ')}`);
  if (bad) process.exitCode = 1;
}

function* walk(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let items;
    try { items = fs.readdirSync(cur, { withFileTypes: true }); }
    catch (err) { console.error(`ERROR ${cur}: ${err.message}`); continue; }
    for (const it of items) {
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else if (it.isFile() && /\.arc$/i.test(it.name)) yield full;
    }
  }
}

function cmdFind(root, pattern) {
  const re = compileRe(pattern);
  let arcs = 0, hits = 0, failed = 0;
  for (const file of walk(root)) {
    arcs++;
    let arc;
    try { arc = readArc(fs.readFileSync(file), file); }
    catch (err) { console.error(`ERROR ${err.message}`); failed++; continue; }
    for (const e of arc.entries) {
      if (!re.test(e.name)) continue;
      console.log(`${file} :: ${e.name}`);
      hits++;
    }
  }
  console.error(`# ${arcs} arc files, ${hits} hits${failed ? `, ${failed} unreadable` : ''}`);
  if (failed) process.exitCode = 1;
}

function* walkFiles(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const items = fs.readdirSync(cur, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else if (it.isFile()) yield full;
    }
  }
}

function parsePackedEntryPath(indir, fullPath) {
  const rel = path.relative(indir, fullPath);
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length === 0) throw new Error(`empty relative path for ${fullPath}`);
  const last = parts[parts.length - 1];
  const m = /^(.*)\.([0-9a-fA-F]{8})$/.exec(last);
  if (!m || m[1].length === 0) {
    throw new Error(`${rel}: expected ".<8-hex-typeHash>" suffix (as written by arc extract)`);
  }
  parts[parts.length - 1] = m[1];
  return {
    relPosix: rel.split(path.sep).join('/'),
    name: parts.join('\\'),
    typeHash: parseInt(m[2], 16) >>> 0,
    data: fs.readFileSync(fullPath),
  };
}

function compareStageFallback(a, b) {
  const ra = STAGE_RANK.get(a.typeHash) ?? 3;
  const rb = STAGE_RANK.get(b.typeHash) ?? 3;
  if (ra !== rb) return ra - rb;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return a.typeHash - b.typeHash;
}

function cmdPack(indir, outFile) {
  if (!fs.existsSync(indir) || !fs.statSync(indir).isDirectory()) {
    throw new Error(`pack: input directory does not exist: ${indir}`);
  }
  const manifestPath = path.join(indir, ORDER_MANIFEST);
  const scanned = [];
  for (const full of walkFiles(indir)) {
    if (path.relative(indir, full) === ORDER_MANIFEST) continue;
    scanned.push(parsePackedEntryPath(indir, full));
  }

  let ordered;
  let packOpts = {};
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest || !Array.isArray(manifest.entries)) {
      throw new Error(`pack: invalid ${ORDER_MANIFEST} in ${indir}`);
    }
    const byRel = new Map(scanned.map(item => [item.relPosix, item]));
    const byNameHash = new Map(scanned.map(item => [`${item.name}.${item.typeHash.toString(16).padStart(8, '0')}`, item]));
    const used = new Set();
    ordered = [];
    for (const m of manifest.entries) {
      const typeHash = typeof m.typeHash === 'number' ? (m.typeHash >>> 0) : (parseInt(String(m.typeHash), 16) >>> 0);
      const item = (m.file && byRel.get(m.file)) ?? byNameHash.get(`${m.name}.${typeHash.toString(16).padStart(8, '0')}`);
      if (!item) throw new Error(`pack: manifest entry "${m.name}" (${hex32(typeHash)}) not found in ${indir}`);
      used.add(item);
      const flags = m.flags === undefined ? undefined : (typeof m.flags === 'number' ? m.flags : parseInt(String(m.flags), 16)) >>> 0;
      ordered.push({ name: item.name, typeHash: item.typeHash, flags, data: item.data });
    }
    const extras = scanned.filter(item => !used.has(item)).sort(compareStageFallback);
    for (const item of extras) ordered.push({ name: item.name, typeHash: item.typeHash, data: item.data });
    if (Number.isInteger(manifest.pad)) packOpts.pad = manifest.pad;
  } else {
    ordered = scanned.slice().sort(compareStageFallback).map(({ name, typeHash, data }) => ({ name, typeHash, data }));
  }

  const packed = packArc(ordered, packOpts);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, packed);
  console.log(`# packed ${ordered.length} entries -> ${outFile} (${packed.length} B)`);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function cmdRoundtripCheck(file) {
  const origBuf = fs.readFileSync(file);
  const origArc = readArc(origBuf, file);
  const unpacked = origArc.entries.map(e => {
    const data = inflateEntry(origBuf, e, file);
    return { name: e.name, typeHash: e.typeHash, flags: e.flags, size: e.size, data, sha256: sha256(data) };
  });
  const packedBuf = packArc(unpacked.map(({ name, typeHash, flags, data }) => ({ name, typeHash, flags, data })));
  const newArc = readArc(packedBuf, `${file} (repacked)`);
  if (newArc.count !== origArc.count) {
    throw new Error(`roundtrip-check ${file}: entry count mismatch (${newArc.count} != ${origArc.count})`);
  }
  let totalRaw = 0;
  for (let i = 0; i < origArc.count; i++) {
    const a = unpacked[i];
    const b = newArc.entries[i];
    if (b.name !== a.name || b.typeHash !== a.typeHash || b.flags !== a.flags || b.size !== a.size) {
      throw new Error(`roundtrip-check ${file}: header mismatch at entry[${i}] "${a.name}"`);
    }
    const reData = inflateEntry(packedBuf, b, `${file} (repacked)`);
    if (Buffer.compare(a.data, reData) !== 0) {
      throw new Error(`roundtrip-check ${file}: byte mismatch at entry[${i}] "${a.name}" (${a.sha256} != ${sha256(reData)})`);
    }
    totalRaw += a.data.length;
  }
  console.log(`# roundtrip-check PASS: ${file} (${origArc.count} entries, ${totalRaw} B raw, ${origBuf.length} B -> ${packedBuf.length} B)`);
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n  node tools/mhgu/arc.mjs list <file.arc>\n  node tools/mhgu/arc.mjs extract <file.arc> <outdir> [nameRegex]\n  node tools/mhgu/arc.mjs find <romfsDir> <nameRegex>\n  node tools/mhgu/arc.mjs pack <indir> <out.arc>\n  node tools/mhgu/arc.mjs roundtrip-check <file.arc>');
  process.exit(2);
}

function main(argv) {
  const [cmd, ...args] = argv;
  if (cmd === 'list') {
    if (args.length !== 1) usage('list takes exactly 1 argument');
    return cmdList(args[0]);
  }
  if (cmd === 'extract') {
    if (args.length < 2 || args.length > 3) usage('extract takes 2 or 3 arguments');
    return cmdExtract(args[0], args[1], args[2]);
  }
  if (cmd === 'find') {
    if (args.length !== 2) usage('find takes exactly 2 arguments');
    return cmdFind(args[0], args[1]);
  }
  if (cmd === 'pack') {
    if (args.length !== 2) usage('pack takes exactly 2 arguments');
    return cmdPack(args[0], args[1]);
  }
  if (cmd === 'roundtrip-check') {
    if (args.length !== 1) usage('roundtrip-check takes exactly 1 argument');
    return cmdRoundtripCheck(args[0]);
  }
  usage(cmd === undefined ? null : `unknown command ${JSON.stringify(cmd)}`);
}

// `import.meta.main` (Node >= 22.18) when present, path comparison otherwise.
const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR ${err.message}`);
    process.exitCode = 1;
  }
}
