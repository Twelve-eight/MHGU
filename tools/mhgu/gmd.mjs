// MHGU GMD text container (MT Framework "GMD 1.3.2", version 0x00010302). Facts: docs/reference/formats/gmd.md.
// Runs on the player's own extracted files; contains no game data.
//   node tools/mhgu/gmd.mjs list <file.gmd> [--all]        header + strings on stdout
//   node tools/mhgu/gmd.mjs json <file.gmd> <out.json>     one file -> one JSON
//   node tools/mhgu/gmd.mjs batch <langDir> <outDir>       every *.gmd below <langDir> -> mirrored JSON + index.json
//
// Layout (little endian), measured on chS/table/*.gmd:
//   0x00 char[4] "GMD\0" | 0x04 u32 version 0x00010302 | 0x08 u32 0 | 0x0C u32 timestamp [I]
//   0x10 u32 0 | 0x14 u32 entry count | 0x18 u32 string count | 0x1C u32 label blob bytes
//   0x20 u32 string block bytes | 0x24 u32 group name length | 0x28 char[nameLen] group name + NUL
// Variant A (entry count = label bytes = 0): the string block starts right after the group name NUL.
// Variant B: the string block is the LAST 0x20 bytes of the file (0x20 is a size, never an offset);
//   before it sits the label blob (0x1C bytes of NUL-separated ASCII labels), and before that
//   entry count x 20 B records {u32 index, u32 hashLo, u32 hashHi, u32 labelOffset, u32 unk},
//   preceded by a 1024 B (256 x u32) table whose meaning is unknown [U].
//   entry.index is the STRING index: keys are an ascending, possibly sparse subset, so entry count may
//   be smaller than the string count (MapName_chS.gmd: 1 entry, 2 strings) and strings can lack a key.
// Strings are NUL-separated UTF-8 (CRLF may appear inside a string); string count must equal 0x18.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'GMD\0';
export const VERSION = 0x00010302;
export const HEADER_SIZE = 0x28;
export const ENTRY_SIZE = 20;
export const HASH_TABLE_BYTES = 1024; // [B] 4/4 labelled files (HN_MonsterListMsg, HN_HunternoteMsg, MonsterDemo, CommonMsg)

const hex8 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const hex2 = v => '0x' + (v >>> 0).toString(16).padStart(2, '0');
const utf8 = new TextDecoder('utf-8', { fatal: true });

function decodeUtf8(bytes, label, where) {
  try {
    return utf8.decode(bytes);
  } catch {
    throw new Error(`${label}: ${where} is not valid UTF-8`);
  }
}

// NUL-separated UTF-8 strings; the block must end with a NUL. Empty strings are kept.
export function splitStrings(block, label) {
  if (block.length === 0) return [];
  if (block[block.length - 1] !== 0) {
    throw new Error(`${label}: string block (${block.length} B) does not end with a NUL byte`);
  }
  const out = [];
  let start = 0;
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== 0) continue;
    out.push(decodeUtf8(block.subarray(start, i), label, `string #${out.length}`));
    start = i + 1;
  }
  return out;
}

function readLabel(blob, offset, label, index) {
  if (offset >= blob.length) {
    throw new Error(`${label}: entry #${index} label offset ${offset} is past the ${blob.length} B label blob`);
  }
  const end = blob.indexOf(0, offset);
  if (end < 0) throw new Error(`${label}: entry #${index} label at ${offset} is not NUL-terminated`);
  for (let i = offset; i < end; i++) {
    if (blob[i] < 0x20 || blob[i] > 0x7e) {
      throw new Error(`${label}: entry #${index} label at ${offset} has non-ASCII byte ${hex2(blob[i])} at +${i - offset}`);
    }
  }
  return blob.toString('latin1', offset, end);
}

export function readGmd(buf, label = '<buffer>') {
  if (buf.length < HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is too small for a GMD header`);
  if (buf.toString('latin1', 0, 4) !== MAGIC) throw new Error(`${label}: bad magic (expected "GMD\\0")`);
  const version = buf.readUInt32LE(0x04);
  if (version !== VERSION) {
    throw new Error(`${label}: unsupported GMD version ${hex8(version)} (expected ${hex8(VERSION)})`);
  }
  const fileHash = buf.readUInt32LE(0x0c);
  const entryCount = buf.readUInt32LE(0x14);
  const stringCount = buf.readUInt32LE(0x18);
  const labelBytes = buf.readUInt32LE(0x1c);
  const stringBlockSize = buf.readUInt32LE(0x20);
  const nameLen = buf.readUInt32LE(0x24);
  const nameStart = HEADER_SIZE;
  const nameEnd = nameStart + nameLen;
  if (nameEnd >= buf.length) {
    throw new Error(`${label}: group name length ${nameLen} runs past EOF`);
  }
  if (buf[nameEnd] !== 0) throw new Error(`${label}: group name is not NUL-terminated at ${hex8(nameEnd)}`);
  const groupName = buf.toString('latin1', nameStart, nameEnd);
  const afterName = nameEnd + 1;
  const stringsStart = buf.length - stringBlockSize;
  if (stringsStart < afterName) {
    throw new Error(`${label}: string block size ${stringBlockSize} exceeds the file (${buf.length} B, data starts at ${afterName})`);
  }
  const strings = splitStrings(buf.subarray(stringsStart, buf.length), label);
  if (strings.length !== stringCount) {
    throw new Error(`${label}: header says ${stringCount} strings but the block holds ${strings.length}`);
  }

  const result = {
    size: buf.length,
    version,
    fileHash,
    groupName,
    stringCount,
    stringBlockSize,
    labelBytes,
    entryCount,
    stringsStart,
    labelsStart: null,
    hashTableSize: 0,
    entries: null,
    labels: null,
    strings,
  };
  if (entryCount === 0 && labelBytes === 0) {
    if (stringsStart !== afterName) {
      throw new Error(`${label}: unlabelled file has ${stringsStart - afterName} unexpected bytes between group name and strings`);
    }
    return result;
  }

  // Labelled variant: entryCount need NOT equal stringCount (e.g. MapName_chS.gmd: 1 entry, 2 strings),
  // and entry.index is the string index, so the keyed strings can be a sparse, ascending subset.
  const entriesStart = afterName;
  const entriesEnd = entriesStart + entryCount * ENTRY_SIZE;
  if (entriesEnd > stringsStart) {
    throw new Error(`${label}: ${entryCount} entries do not fit before the string block`);
  }
  const labelsStart = stringsStart - labelBytes;
  if (labelsStart < entriesEnd) {
    throw new Error(`${label}: label blob (${labelBytes} B) overlaps the entry table`);
  }
  result.labelsStart = labelsStart;
  result.hashTableSize = labelsStart - entriesEnd;
  if (result.hashTableSize !== HASH_TABLE_BYTES) {
    // Not fatal: the table size is only known from a handful of samples. Record, do not guess.
    result.hashTableSizeUnexpected = true;
  }

  const labelBlob = buf.subarray(labelsStart, stringsStart);
  const entries = [];
  const labels = new Array(stringCount).fill(null);
  let previous = -1;
  for (let i = 0; i < entryCount; i++) {
    const base = entriesStart + i * ENTRY_SIZE;
    const index = buf.readUInt32LE(base);
    const hashLo = buf.readUInt32LE(base + 4);
    const hashHi = buf.readUInt32LE(base + 8);
    const labelOffset = buf.readUInt32LE(base + 12);
    const unk = buf.readUInt32LE(base + 16);
    if (index >= stringCount) {
      throw new Error(`${label}: entry #${i} points at string ${index} but the file has ${stringCount}`);
    }
    if (index < previous) {
      throw new Error(`${label}: entry #${i} index ${index} goes backwards (previous ${previous})`);
    }
    previous = index;
    const entryLabel = labelBytes > 0 ? readLabel(labelBlob, labelOffset, label, i) : null;
    entries.push({ index, hashLo, hashHi, labelOffset, unk });
    const seen = labels[index];
    if (seen === null) labels[index] = entryLabel;
    else labels[index] = Array.isArray(seen) ? [...seen, entryLabel] : [seen, entryLabel];
  }
  result.entries = entries;
  result.labels = labels;
  return result;
}

export function toJson(gmd, source) {
  const out = {
    source,
    size: gmd.size,
    version: hex8(gmd.version),
    fileHash: hex8(gmd.fileHash),
    groupName: gmd.groupName,
    stringCount: gmd.stringCount,
    stringBlockSize: gmd.stringBlockSize,
    labelBytes: gmd.labelBytes,
    entryCount: gmd.entryCount,
    stringsStart: gmd.stringsStart,
    labelsStart: gmd.labelsStart,
    hashTableSize: gmd.hashTableSize,
    strings: gmd.strings.map((text, i) => {
      if (!gmd.labels) return { i, text };
      const key = gmd.labels[i];
      if (key === null) return { i, label: null, text };
      if (Array.isArray(key)) return { i, label: key[0], labels: key, text };
      return { i, label: key, text };
    }),
  };
  if (gmd.hashTableSizeUnexpected) out.hashTableSizeUnexpected = true;
  if (gmd.entries) {
    out.entries = gmd.entries.map(e => ({
      index: e.index,
      hashLo: hex8(e.hashLo),
      hashHi: hex8(e.hashHi),
      labelOffset: e.labelOffset,
      unk: e.unk,
    }));
  }
  return out;
}

function readGmdFile(file) {
  return readGmd(fs.readFileSync(file), file);
}

function summarise(gmd) {
  const bits = [
    `${gmd.groupName || '<no name>'}`,
    `${gmd.stringCount} strings`,
    `${gmd.stringBlockSize} B text`,
  ];
  if (gmd.entries) bits.push(`${gmd.labels.filter(Boolean).length}/${gmd.stringCount} keyed`);
  return bits.join(', ');
}

function cmdList(file, all) {
  const gmd = readGmdFile(file);
  console.log(`${file}`);
  console.log(`  magic GMD\\0  version ${hex8(gmd.version)}  fileId ${hex8(gmd.fileHash)}`);
  console.log(`  group "${gmd.groupName}"  size ${gmd.size} B`);
  console.log(`  strings ${gmd.stringCount}  block ${gmd.stringBlockSize} B @ ${hex8(gmd.stringsStart)}`);
  if (gmd.entries) {
    const labelled = gmd.labels.filter(Boolean).length;
    console.log(`  labels ${gmd.labelBytes} B @ ${hex8(gmd.labelsStart)}  entries ${gmd.entryCount} (${labelled}/${gmd.stringCount} strings keyed)  hash table ${gmd.hashTableSize} B`);
    if (gmd.hashTableSizeUnexpected) console.log(`  WARNING: hash table is ${gmd.hashTableSize} B, expected ${HASH_TABLE_BYTES} (format drift?)`);
  }
  const limit = all ? gmd.strings.length : 12;
  for (let i = 0; i < Math.min(limit, gmd.strings.length); i++) {
    const key = gmd.labels && gmd.labels[i] ? ` [${gmd.labels[i]}]` : '';
    const text = gmd.strings[i].replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    console.log(`  #${i}${key} ${text.length > 160 ? text.slice(0, 160) + '...' : text}`);
  }
  if (limit < gmd.strings.length) console.log(`  ... ${gmd.strings.length - limit} more (use --all)`);
}

function cmdJson(file, out) {
  const gmd = readGmdFile(file);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(toJson(gmd, path.basename(file)), null, 2) + '\n');
  console.log(`${file}: ${summarise(gmd)} -> ${out}`);
}

function* walkGmd(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkGmd(full);
    else if (entry.name.toLowerCase().endsWith('.gmd')) yield full;
  }
}

function cmdBatch(dir, outDir) {
  const root = path.resolve(dir);
  const base = path.resolve(outDir);
  const index = [];
  const failures = [];
  for (const file of walkGmd(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const target = path.join(base, rel + '.json');
    try {
      const gmd = readGmdFile(file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(toJson(gmd, rel), null, 2) + '\n');
      index.push({
        source: rel,
        size: gmd.size,
        groupName: gmd.groupName,
        stringCount: gmd.stringCount,
        labelled: gmd.entries !== null,
        labeledStrings: gmd.labels ? gmd.labels.filter(Boolean).length : 0,
        labelBytes: gmd.labelBytes,
        json: rel + '.json',
      });
      console.log(`${rel}: ${summarise(gmd)}`);
    } catch (e) {
      failures.push({ source: rel, error: e.message });
      console.error(`FAILED ${rel}: ${e.message}`);
    }
  }
  index.sort((a, b) => a.source.localeCompare(b.source));
  failures.sort((a, b) => a.source.localeCompare(b.source));
  const summary = {
    root: path.basename(root),
    generatedBy: 'tools/mhgu/gmd.mjs batch',
    files: index.length,
    failed: failures.length,
    strings: index.reduce((n, e) => n + e.stringCount, 0),
    index,
    failures,
  };
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'index.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`\n${index.length} file(s) -> ${base}, ${failures.length} failed, index.json written`);
  if (failures.length) process.exitCode = 1;
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node tools/mhgu/gmd.mjs list <file.gmd> [--all]');
  console.error('       node tools/mhgu/gmd.mjs json <file.gmd> <out.json>');
  console.error('       node tools/mhgu/gmd.mjs batch <langDir> <outDir>');
  process.exit(2);
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'list') {
    const [file, ...flags] = rest;
    if (!file) usage();
    cmdList(file, flags.includes('--all'));
  } else if (cmd === 'json') {
    const [file, out] = rest;
    if (!file || !out) usage();
    cmdJson(file, out);
  } else if (cmd === 'batch') {
    const [dir, out] = rest;
    if (!dir || !out) usage();
    cmdBatch(dir, out);
  } else {
    usage(cmd ? `unknown command "${cmd}"` : '');
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exit(1); }
}
