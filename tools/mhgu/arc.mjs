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
// Library: readArc(buf) -> {version,count,entries[]} ; inflateEntry(buf, entry) -> Buffer.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'ARC\0';
export const VERSION = 0x11;
export const HEADER_SIZE = 0x0c;
export const ENTRY_SIZE = 80;
const SIZE_MASK = 0x1fffffff; // low 29 bits = uncompressed size
const FLAG_MASK = 0xe0000000; // high 3 bits = flags

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
    console.log(`${rel} ${data.length}`);
    ok++;
  }
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

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n  node tools/mhgu/arc.mjs list <file.arc>\n  node tools/mhgu/arc.mjs extract <file.arc> <outdir> [nameRegex]\n  node tools/mhgu/arc.mjs find <romfsDir> <nameRegex>');
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
