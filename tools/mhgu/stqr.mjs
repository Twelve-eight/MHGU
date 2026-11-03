// MHGU (Switch) "STQR" BGM manifest reader + track catalogue. Contains no game data.
//
//   node MHGU/tools/mhgu/stqr.mjs list     [--romfs DIR] [--kind battle] [--filter TXT]
//   node MHGU/tools/mhgu/stqr.mjs tsv      [--romfs DIR] [--out FILE]
//   node MHGU/tools/mhgu/stqr.mjs check    [--romfs DIR] [--no-opus]   exit 1 on any problem
//   node MHGU/tools/mhgu/stqr.mjs dump     <file.stqr> [--words N]
//   node MHGU/tools/mhgu/stqr.mjs selftest [--romfs DIR] [--fixtures DIR]
//
//   --romfs   romfs root of the extracted GU dump (default: $MHGU_ROMFS or G:/mhgu-romfs/romfs/nativeNX)
//   --no-opus do not open the referenced .opus files (header cross-check off)
//
// Layout (little endian), byte-verified on all 44 *.stqr under romfs/nativeNX/sound/bgm (514 records):
//   0x00 char[4] "STQR"
//   0x04 u32     version = 8                                            (44/44)
//   0x08 u32     entryCount N
//   0x0C u32     slotCount >= N; 63 for battle's 61, 47 for com's 36, 12 for m24d's 12 [U: reserved size]
//   0x10..0x1C u32 x4 = 0                                               (44/44)
//   0x20 u32     recordStart = 0x38 (header size)                       (44/44)
//   0x24 u32     paramStart  = recordStart + 36*N                       (44/44, so records are 36 B)
//   0x28 u32     stringStart
//   0x2C..0x34 u32 x4 = stringStart, four identical copies              (44/44)
//   recordStart + 36*i -> record i
// Record (36 B), cross-checked against the .opus file it names (514/514):
//   +0x00 u32 pathOffset   absolute file offset of a NUL-terminated ASCII path, e.g.
//                          "sound\bgm\battle\wav\bgm_em032_Tigrex" - backslashes, NO extension (.opus implied)
//   +0x04 u32 opusBytes    == the .opus file size on disk                        (514/514)
//   +0x08 u32 trackId      == .opus u32@0x00                                     (514/514)
//   +0x0C u32 fileVersion  == .opus u32@0x04; 2 in 511 of 512 files, 1 in event_055 (a 336 B
//                          single-packet placeholder, 8 kHz)                      (514/514)
//   +0x10 u32 sampleRate   48000 x427 / 24000 x86 / 8000 x1; only here, the .opus header has it in its
//                          info chunk instead (see guopus.mjs)
//   +0x14 u32 loopStart    samples @sampleRate; 0xFFFFFFFF = one-shot (no loop, 180/514 records)
//   +0x18 u32 loopEnd      samples @sampleRate; 0xFFFFFFFF = one-shot
//                          NOTE: this is NOT "totalSamples" - see guopus.mjs; the stream is longer.
//   +0x1C u32 0x15542770   constant in all 514 records                  [U]
//   +0x20 u32 0            constant in all 514 records                  [U]
// paramStart..stringStart: one variable-length settings block per record (entry index first, then
//   2,5,1,0x00020001,...; 140 B/entry in map/m24d, 144.4 B/entry in battle). Not needed to find a
//   track - exposed as a byte range and as a "starts at a u32 equal to the record index" scan [U].
// stringStart..EOF: the path strings, in record order (record i's pathOffset is ascending).
//
// Entry counts vs. directories (the dossier's acceptance check). A stqr is a *loaded set*, not a
// directory: two entries point outside their own wav dir (title -> battle/wav/bgm_..., v07 -> battle),
// so "entries in this set" >= "files in this dir". `check` prints both numbers per stqr.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'STQR';
export const VERSION = 8;
export const HEADER_SIZE = 0x38;
export const RECORD_SIZE = 36;
export const ONE_SHOT = 0xffffffff;
export const UNKNOWN_RECORD_FIELD = 0x15542770;
export const PATH_PREFIX = 'sound\\bgm\\';
export const KNOWN_RATES = [8000, 12000, 16000, 24000, 48000];

const hex8 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const esc = s => JSON.stringify(s);

function u32(buf, off, label) {
  if (off + 4 > buf.length) throw new Error(`${label}: read of u32 at 0x${off.toString(16)} is past EOF (${buf.length} B)`);
  return buf.readUInt32LE(off);
}

// ---------------------------------------------------------------- parse

export function parseStqr(buf, label = 'stqr') {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`${label}: ${buf.length} B is shorter than the ${HEADER_SIZE} B STQR header`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== MAGIC) throw new Error(`${label}: magic is ${esc(magic)} at 0, expected "STQR"`);
  const version = u32(buf, 4, label);
  if (version !== VERSION) throw new Error(`${label}: version ${version} at 0x04, expected ${VERSION}`);
  const entryCount = u32(buf, 8, label);
  const slotCount = u32(buf, 0x0c, label);
  if (slotCount < entryCount) {
    throw new Error(`${label}: slotCount ${slotCount} at 0x0C is smaller than entryCount ${entryCount} at 0x08`);
  }
  const recordStart = u32(buf, 0x20, label);
  const paramStart = u32(buf, 0x24, label);
  const stringStart = u32(buf, 0x28, label);
  const stringCopies = [u32(buf, 0x2c, label), u32(buf, 0x30, label), u32(buf, 0x34, label)];
  if (recordStart !== HEADER_SIZE) {
    throw new Error(`${label}: recordStart ${recordStart} at 0x20, expected the header size ${HEADER_SIZE}`);
  }
  const expectParam = recordStart + entryCount * RECORD_SIZE;
  if (paramStart !== expectParam) {
    throw new Error(`${label}: paramStart ${paramStart} at 0x24 != recordStart + ${entryCount}*${RECORD_SIZE} = ${expectParam}`
      + ' (entryCount or the record size is wrong)');
  }
  if (stringStart < paramStart || stringStart > buf.length) {
    throw new Error(`${label}: stringStart ${stringStart} at 0x28 is outside [${paramStart}, ${buf.length}]`);
  }
  for (const [i, v] of stringCopies.entries()) {
    if (v !== stringStart) {
      throw new Error(`${label}: word at 0x${(0x2c + 4 * i).toString(16)} = ${v} != stringStart ${stringStart}`
        + ' (all four copies are equal in the 44 shipped files)');
    }
  }

  const entries = [];
  const seen = new Map();
  for (let i = 0; i < entryCount; i++) {
    const rec = recordStart + i * RECORD_SIZE;
    const where = `${label}: record #${i} @0x${rec.toString(16)}`;
    const pathOffset = u32(buf, rec + 0x00, where);
    const opusBytes = u32(buf, rec + 0x04, where);
    const trackId = u32(buf, rec + 0x08, where);
    const fileVersion = u32(buf, rec + 0x0c, where);
    const sampleRate = u32(buf, rec + 0x10, where);
    const loopStart = u32(buf, rec + 0x14, where);
    const loopEnd = u32(buf, rec + 0x18, where);
    const unknown1c = u32(buf, rec + 0x1c, where);
    const unknown20 = u32(buf, rec + 0x20, where);
    if (pathOffset < stringStart || pathOffset >= buf.length) {
      throw new Error(`${where}: pathOffset ${pathOffset} is outside the string table [${stringStart}, ${buf.length})`);
    }
    let end = pathOffset;
    while (end < buf.length && buf[end] !== 0) end++;
    if (end >= buf.length) throw new Error(`${where}: path at ${pathOffset} is not NUL-terminated`);
    const raw = buf.subarray(pathOffset, end);
    for (const c of raw) {
      if (c < 0x20 || c > 0x7e) throw new Error(`${where}: path at ${pathOffset} holds byte 0x${c.toString(16)} (not printable ASCII)`);
    }
    const stqrPath = raw.toString('latin1');
    if (!stqrPath.startsWith(PATH_PREFIX)) {
      throw new Error(`${where}: path ${esc(stqrPath)} does not start with ${esc(PATH_PREFIX)}`);
    }
    if (stqrPath.endsWith('.opus')) throw new Error(`${where}: path ${esc(stqrPath)} already carries an extension (the shipped paths do not)`);
    if (fileVersion !== 1 && fileVersion !== 2) throw new Error(`${where}: fileVersion ${fileVersion}, expected 1 or 2 (the .opus word @0x04)`);
    if (!KNOWN_RATES.includes(sampleRate)) throw new Error(`${where}: sampleRate ${sampleRate} is not one of ${KNOWN_RATES.join('/')}`);
    const oneShot = loopStart === ONE_SHOT || loopEnd === ONE_SHOT;
    if (oneShot) {
      if (loopStart !== loopEnd) throw new Error(`${where}: loopStart 0x${loopStart.toString(16)} and loopEnd 0x${loopEnd.toString(16)} must both be 0xFFFFFFFF for a one-shot`);
    } else if (loopStart >= loopEnd) {
      throw new Error(`${where}: loopStart ${loopStart} >= loopEnd ${loopEnd}`);
    }
    if (seen.has(stqrPath)) {
      throw new Error(`${where}: path ${esc(stqrPath)} is already record #${seen.get(stqrPath)} (duplicate entry)`);
    }
    seen.set(stqrPath, i);
    const parts = stqrPath.split('\\');
    entries.push({
      index: i,
      recordOffset: rec,
      pathOffset,
      path: stqrPath,
      name: parts[parts.length - 1],
      group: parts.slice(2, parts.length - 1).join('/'), // "battle/wav", "map/m24d/wav", ...
      opusBytes,
      trackId,
      fileVersion,
      sampleRate,
      loopStart,
      loopEnd,
      oneShot,
      unknown1c,
      unknown20,
    });
  }
  return {
    label,
    size: buf.length,
    version,
    entryCount,
    slotCount,
    recordStart,
    paramStart,
    stringStart,
    paramBytes: stringStart - paramStart,
    entries,
  };
}

export function stqrPathToOpus(romfs, stqrPath) {
  return path.join(romfs, stqrPath.replace(/\\/g, '/') + '.opus');
}

// Kind of a set, from its position under sound/bgm (the dossier's vocabulary).
export function kindOf(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'battle/bgm_bt.stqr') return 'battle';
  if (p === 'com/bgm_com.stqr') return 'com';
  if (p === 'event/quest/event_quest.stqr') return 'event_quest';
  if (p === 'event/village/event_village/event_village.stqr') return 'event_village';
  if (p === 'title/bgm_title.stqr') return 'title';
  let m = /^map\/(m\d\d)d\/bgm_\1d\.stqr$/.exec(p);
  if (m) return 'map_day';
  m = /^map\/(m\d\d)n\/bgm_\1n\.stqr$/.exec(p);
  if (m) return 'map_night';
  m = /^map\/(v\d\d)\/bgm_\1\.stqr$/.exec(p);
  if (m) return 'village';
  return 'other';
}

// ---------------------------------------------------------------- romfs walk

export function defaultRomfs() {
  return process.env.MHGU_ROMFS || 'G:/mhgu-romfs/romfs/nativeNX';
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// { stqr: [{rel, abs}], opusByDir: Map<absDir, [abs..]>, opusFiles: [abs..] }
export function scanRomfs(romfs) {
  const bgm = path.join(romfs, 'sound', 'bgm');
  if (!fs.existsSync(bgm)) throw new Error(`no sound/bgm under ${romfs} (pass --romfs <romfs root>)`);
  const all = walk(bgm, []);
  const stqr = [];
  const opusByDir = new Map();
  const opusFiles = [];
  for (const abs of all) {
    const rel = path.relative(bgm, abs).replace(/\\/g, '/');
    if (abs.endsWith('.stqr')) stqr.push({ rel, abs });
    else if (abs.endsWith('.opus')) {
      opusFiles.push(abs);
      const d = path.dirname(abs);
      if (!opusByDir.has(d)) opusByDir.set(d, []);
      opusByDir.get(d).push(abs);
    }
  }
  stqr.sort((a, b) => a.rel.localeCompare(b.rel));
  return { bgm, stqr, opusByDir, opusFiles };
}

function readOpusHead(abs) {
  const fd = fs.openSync(abs, 'r');
  try {
    const head = Buffer.alloc(0x20);
    const n = fs.readSync(fd, head, 0, 0x20, 0);
    if (n < 0x20) return null;
    return { trackId: head.readUInt32LE(0), fileVersion: head.readUInt32LE(4), loopStart: head.readUInt32LE(8), loopEnd: head.readUInt32LE(0x0c) };
  } finally {
    fs.closeSync(fd);
  }
}

// ---------------------------------------------------------------- check

// Full corpus check. Returns { sets, problems, totals } - never throws for per-file problems.
export function checkCorpus(romfs, { crossCheckOpus = true } = {}) {
  const scan = scanRomfs(romfs);
  const problems = [];
  const sets = [];
  const referenced = new Set();
  for (const { rel, abs } of scan.stqr) {
    const buf = fs.readFileSync(abs);
    let parsed;
    try {
      parsed = parseStqr(buf, rel);
    } catch (e) {
      problems.push(`${rel}: ${e.message}`);
      continue;
    }
    // A set's .opus files live in a sibling "wav" directory: sound/bgm/<group>/wav/<name>.opus
    const ownDir = path.join(path.dirname(abs), 'wav');
    let localEntries = 0;
    let crossRefs = 0;
    for (const en of parsed.entries) {
      const opus = stqrPathToOpus(romfs, en.path);
      if (path.dirname(opus) === ownDir) localEntries++;
      else crossRefs++;
      referenced.add(opus);
      let st;
      try {
        st = fs.statSync(opus);
      } catch {
        problems.push(`${rel}[${en.index}]: ${en.path} -> ${opus} does not exist`);
        continue;
      }
      if (st.size !== en.opusBytes) {
        problems.push(`${rel}[${en.index}]: record says ${en.opusBytes} B, ${path.basename(opus)} is ${st.size} B`);
      }
      if (!crossCheckOpus) continue;
      const head = readOpusHead(opus);
      if (!head) {
        problems.push(`${rel}[${en.index}]: ${path.basename(opus)} is shorter than 32 B`);
        continue;
      }
      if (head.trackId !== en.trackId) problems.push(`${rel}[${en.index}]: trackId ${en.trackId} != .opus u32@0x00 ${head.trackId}`);
      if (head.fileVersion !== en.fileVersion) problems.push(`${rel}[${en.index}]: fileVersion ${en.fileVersion} != .opus u32@0x04 ${head.fileVersion}`);
      if (head.loopStart !== en.loopStart) problems.push(`${rel}[${en.index}]: loopStart ${en.loopStart} != .opus u32@0x08 ${head.loopStart}`);
      if (head.loopEnd !== en.loopEnd) problems.push(`${rel}[${en.index}]: loopEnd ${en.loopEnd} != .opus u32@0x0c ${head.loopEnd}`);
    }
    sets.push({
      rel,
      kind: kindOf(rel),
      entries: parsed.entryCount,
      localEntries,
      crossRefs,
      dir: path.relative(romfs, ownDir).replace(/\\/g, '/'),
      dirFiles: (scan.opusByDir.get(ownDir) || []).length,
      sampleRates: [...new Set(parsed.entries.map(e => e.sampleRate))].sort((a, b) => a - b),
      oneShots: parsed.entries.filter(e => e.oneShot).length,
      paramBytes: parsed.paramBytes,
    });
    if (localEntries !== sets[sets.length - 1].dirFiles) {
      problems.push(`${rel}: ${localEntries} local entries but ${sets[sets.length - 1].dirFiles} .opus files in ${sets[sets.length - 1].dir}`);
    }
  }
  const orphans = scan.opusFiles.filter(f => !referenced.has(f));
  for (const f of orphans) problems.push(`${path.relative(romfs, f)}: .opus file not referenced by any stqr`);
  return {
    sets,
    problems,
    totals: {
      stqrFiles: scan.stqr.length,
      entries: sets.reduce((n, s) => n + s.entries, 0),
      opusFiles: scan.opusFiles.length,
      opusDirs: scan.opusByDir.size,
      referenced: referenced.size,
      crossRefs: sets.reduce((n, s) => n + s.crossRefs, 0),
      oneShots: sets.reduce((n, s) => n + s.oneShots, 0),
    },
  };
}

// ---------------------------------------------------------------- commands

function fmtSet(s) {
  const pad = (v, n) => String(v).padEnd(n);
  return `${pad(s.kind, 14)}${pad(s.rel, 46)}${pad(s.entries, 8)}${pad(s.localEntries, 7)}${pad(s.dirFiles, 7)}`
    + `${pad(s.crossRefs || '', 7)}${pad(s.sampleRates.join('/'), 13)}${pad(s.oneShots || '', 6)}${s.dir}`;
}

const SET_HEAD = `${'kind'.padEnd(14)}${'stqr'.padEnd(46)}${'entries'.padEnd(8)}${'local'.padEnd(7)}${'files'.padEnd(7)}${'xdir'.padEnd(7)}${'rates'.padEnd(13)}${'shot'.padEnd(6)}dir`;

function cmdList(romfs, filter, kindFilter) {
  const { sets, problems } = checkCorpus(romfs, { crossCheckOpus: false });
  const rows = sets.filter(s => (!kindFilter || s.kind === kindFilter) && (!filter || s.rel.includes(filter)));
  console.log(SET_HEAD);
  for (const s of rows) console.log(fmtSet(s));
  const t = rows.reduce((a, s) => ({
    entries: a.entries + s.entries,
    files: a.files + s.dirFiles,
    local: a.local + s.localEntries,
    xdir: a.xdir + s.crossRefs,
  }), { entries: 0, files: 0, local: 0, xdir: 0 });
  console.log(`\n${rows.length} stqr, ${t.entries} entries (${t.local} local + ${t.xdir} cross-dir), ${t.files} .opus files in the dirs they name`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s) - run "check" for the full list`);
    process.exitCode = 1;
  }
}

function cmdTsv(romfs, out) {
  const scan = scanRomfs(romfs);
  const lines = ['kind\tcontainer\ttrackId\tsampleRate\tloopStart\tloopEnd\topusBytes\tpath\tname\tstqrIndex\toneShot'];
  let n = 0;
  for (const { rel, abs } of scan.stqr) {
    const parsed = parseStqr(fs.readFileSync(abs), rel);
    const kind = kindOf(rel);
    for (const e of parsed.entries) {
      const opus = stqrPathToOpus(romfs, e.path);
      let bytes = '';
      try { bytes = String(fs.statSync(opus).size); }
      catch { bytes = 'MISSING'; }
      lines.push([kind, rel, e.trackId, e.sampleRate, e.loopStart, e.loopEnd, bytes, e.path, e.name, e.index, e.oneShot ? 1 : 0].join('\t'));
      n++;
    }
  }
  const text = lines.join('\n') + '\n';
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(`${n} rows -> ${out}`);
  } else {
    process.stdout.write(text);
  }
}

function cmdCheck(romfs, crossCheckOpus) {
  const { sets, problems, totals } = checkCorpus(romfs, { crossCheckOpus });
  console.log(SET_HEAD);
  for (const s of sets) console.log(fmtSet(s));
  console.log(`\n${totals.stqrFiles} stqr files, ${totals.entries} records, ${totals.opusFiles} .opus files in ${totals.opusDirs} dirs,`
    + ` ${totals.referenced} referenced, ${totals.crossRefs} cross-dir entries, ${totals.oneShots} one-shot records`);
  console.log(`header cross-check against the .opus files: ${crossCheckOpus ? 'on' : 'off (--no-opus)'}`);
  if (problems.length) {
    console.log(`\nFAIL - ${problems.length} problem(s):`);
    for (const p of problems.slice(0, 60)) console.log('  ' + p);
    if (problems.length > 60) console.log(`  ... ${problems.length - 60} more`);
    process.exitCode = 1;
  } else {
    console.log('\nPASS - every stqr parses, every record matches its .opus file, every dir count matches');
  }
  return problems.length === 0;
}

function cmdDump(romfs, file, words) {
  const buf = fs.readFileSync(file);
  const p = parseStqr(buf, path.basename(file));
  console.log(`${file}: ${buf.length} B, version ${p.version}, ${p.entryCount} entries (slotCount ${p.slotCount})`);
  console.log(`  recordStart 0x${p.recordStart.toString(16)}  paramStart 0x${p.paramStart.toString(16)} (${p.paramBytes} B)`
    + `  stringStart 0x${p.stringStart.toString(16)} (${buf.length - p.stringStart} B of paths)`);
  console.log('  words 0x00..0x38:', [0, 4, 8, 0x0c, 0x10, 0x14, 0x18, 0x1c, 0x20, 0x24, 0x28, 0x2c, 0x30, 0x34]
    .map(o => hex8(buf.readUInt32LE(o))).join(' '));
  const w = words || 12;
  console.log(`\n  per-record parameter blocks (first ${w} words each, scanned by "u32 == record index, next word 2"):`);
  const starts = [];
  for (let i = 0; i < p.entryCount; i++) {
    let found = -1;
    for (let o = p.paramStart; o + 8 <= p.stringStart; o += 4) {
      if (buf.readUInt32LE(o) === i && buf.readUInt32LE(o + 4) === 2) { found = o; break; }
    }
    starts.push(found);
  }
  for (const [i, o] of starts.entries()) {
    if (o < 0) { console.log(`    #${i}: not found`); continue; }
    const next = starts[i + 1] > 0 ? starts[i + 1] : p.stringStart;
    const vals = [];
    for (let k = 0; k < w && o + 4 * k + 4 <= Math.min(p.stringStart, next + 4 * w); k++) vals.push(hex8(buf.readUInt32LE(o + 4 * k)));
    console.log(`    #${i} @0x${o.toString(16)} (+${next - o} B): ${vals.join(' ')}`);
  }
  console.log('\n  records:');
  for (const e of p.entries) {
    const opus = stqrPathToOpus(romfs, e.path);
    let line = `    [${String(e.index).padStart(2)}] ${e.path}  track ${hex8(e.trackId)} size ${e.opusBytes} ${e.sampleRate} Hz`;
    line += e.oneShot ? '  one-shot' : `  loop ${e.loopStart}..${e.loopEnd}`;
    try {
      const st = fs.statSync(opus);
      const h = readOpusHead(opus);
      const ok = st.size === e.opusBytes && h && h.trackId === e.trackId && h.loopStart === e.loopStart && h.loopEnd === e.loopEnd;
      line += ok ? '  [.opus ok]' : `  [.opus MISMATCH size ${st.size}]`;
    } catch {
      line += '  [.opus missing]';
    }
    console.log(line);
  }
}

// ---------------------------------------------------------------- selftest

// Mutations of a real stqr that MUST be rejected. Each returns the mutated buffer.
const STQR_MUTATIONS = [
  ['bad-magic', b => { b.write('STQr', 0, 'latin1'); }],
  ['bad-version', b => { b.writeUInt32LE(7, 4); }],
  ['entry-count+1', b => { b.writeUInt32LE(b.readUInt32LE(8) + 1, 8); }],
  ['entry-count-1', b => { b.writeUInt32LE(b.readUInt32LE(8) - 1, 8); }],
  ['slotCount<count', b => { b.writeUInt32LE(0, 0x0c); }],
  ['recordStart!=0x38', b => { b.writeUInt32LE(0x3c, 0x20); }],
  ['paramStart!=rec+36N', b => { b.writeUInt32LE(b.readUInt32LE(0x24) + 36, 0x24); }],
  ['stringCopies differ', b => { b.writeUInt32LE(b.readUInt32LE(0x28) + 4, 0x30); }],
  ['stringStart past EOF', b => { b.writeUInt32LE(b.length + 64, 0x28); }],
  ['pathOffset out of range', b => { b.writeUInt32LE(b.length + 8, b.readUInt32LE(0x20)); }],
  ['pathOffset into param block', b => { b.writeUInt32LE(1, b.readUInt32LE(0x20)); }],
  ['duplicate entry', b => { b.writeUInt32LE(b.readUInt32LE(b.readUInt32LE(0x20)), b.readUInt32LE(0x20) + 36); }],
  ['fileVersion!=1,2', b => { b.writeUInt32LE(3, b.readUInt32LE(0x20) + 0x0c); }],
  ['sampleRate 44100', b => { b.writeUInt32LE(44100, b.readUInt32LE(0x20) + 0x10); }],
  ['loopStart>=loopEnd', b => { b.writeUInt32LE(b.readUInt32LE(b.readUInt32LE(0x20) + 0x18), b.readUInt32LE(0x20) + 0x14); }],
  ['one-shot half-set', b => { b.writeUInt32LE(0xffffffff, b.readUInt32LE(0x20) + 0x14); b.writeUInt32LE(1234, b.readUInt32LE(0x20) + 0x18); }],
  ['truncated', b => b.subarray(0, 40)],
];

const applyMutation = (base, mutate) => {
  const copy = Buffer.from(base);
  const replacement = mutate(copy);
  return Buffer.isBuffer(replacement) ? replacement : copy;
};

function expectThrow(label, fn) {
  try {
    fn();
  } catch (e) {
    return { label, ok: true, message: e.message };
  }
  return { label, ok: false, message: 'no error raised' };
}

function cmdSelftest(romfs, fixtures) {
  const results = [];
  let scan;
  try {
    scan = scanRomfs(romfs);
  } catch (e) {
    console.error(`selftest: ${e.message}`);
    process.exit(2);
  }
  // 1. real corpus
  const { sets, problems, totals } = checkCorpus(romfs, { crossCheckOpus: true });
  results.push({
    label: `corpus: ${totals.stqrFiles} stqr / ${totals.entries} records / ${totals.opusFiles} .opus`,
    ok: problems.length === 0,
    message: problems.length ? `${problems.length} problem(s): ${problems[0]}` : `${sets.length} sets clean`,
  });
  // 2. per-set count equality (the acceptance rule), reported per set
  const badCounts = sets.filter(s => s.localEntries !== s.dirFiles);
  results.push({
    label: 'per-set entry count == .opus count in its dir',
    ok: badCounts.length === 0,
    message: badCounts.length ? badCounts.map(s => `${s.rel}: ${s.localEntries} vs ${s.dirFiles}`).join('; ') : `${sets.length} sets`,
  });
  // 3. known-good bytes: the largest set must have the documented shape
  const bt = sets.find(s => s.rel === 'battle/bgm_bt.stqr');
  results.push({
    label: 'battle/bgm_bt.stqr has 61 entries and 61 files',
    ok: !!bt && bt.entries === 61 && bt.dirFiles === 61,
    message: bt ? `entries ${bt.entries}, files ${bt.dirFiles}` : 'set missing',
  });
  // 4. known-bad mutations of a real file: every one must throw
  const samplePath = path.join(scan.bgm, 'map', 'm24d', 'bgm_m24d.stqr');
  const sample = fs.readFileSync(samplePath);
  const baseline = expectThrow('unmutated sample', () => parseStqr(sample, 'm24d'));
  results.push({ label: 'unmutated m24d parses', ok: !baseline.ok, message: baseline.ok ? 'threw: ' + baseline.message : 'ok' });
  for (const [name, mutate] of STQR_MUTATIONS) {
    const copy = applyMutation(sample, mutate);
    const r = expectThrow(name, () => parseStqr(copy, 'm24d/' + name));
    results.push({ label: `reject ${name}`, ok: r.ok, message: r.message.slice(0, 120) });
  }
  // 5. persisted known-bad samples (optional dir of *.stqr files that must all be rejected)
  if (fixtures) {
    if (!fs.existsSync(fixtures)) {
      results.push({ label: `fixtures ${fixtures}`, ok: false, message: 'directory does not exist' });
    } else {
      const files = fs.readdirSync(fixtures).filter(f => f.endsWith('.stqr'));
      results.push({ label: `fixtures dir holds ${files.length} known-bad stqr`, ok: files.length > 0, message: fixtures });
      for (const f of files) {
        const r = expectThrow(f, () => parseStqr(fs.readFileSync(path.join(fixtures, f)), f));
        results.push({ label: `reject fixture ${f}`, ok: r.ok, message: r.message.slice(0, 120) });
      }
    }
  }
  let fails = 0;
  for (const r of results) {
    if (!r.ok) fails++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.message ? ' - ' + r.message : ''}`);
  }
  console.log(`\n${results.length - fails}/${results.length} checks passed`);
  if (fails) process.exitCode = 1;
  return fails === 0;
}

// ---------------------------------------------------------------- cli

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node MHGU/tools/mhgu/stqr.mjs list     [--romfs DIR] [--kind K] [--filter TXT]');
  console.error('       node MHGU/tools/mhgu/stqr.mjs tsv      [--romfs DIR] [--out FILE]');
  console.error('       node MHGU/tools/mhgu/stqr.mjs check    [--romfs DIR] [--no-opus]');
  console.error('       node MHGU/tools/mhgu/stqr.mjs dump     <file.stqr> [--words N]');
  console.error('       node MHGU/tools/mhgu/stqr.mjs selftest [--romfs DIR] [--fixtures DIR]');
  process.exit(2);
}

function opt(args, name, dflt) {
  const i = args.indexOf(name);
  return i < 0 ? dflt : args[i + 1];
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const romfs = opt(rest, '--romfs', defaultRomfs());
  if (!cmd) usage();
  if (cmd === 'list') cmdList(romfs, opt(rest, '--filter'), opt(rest, '--kind'));
  else if (cmd === 'tsv') cmdTsv(romfs, opt(rest, '--out'));
  else if (cmd === 'check') cmdCheck(romfs, !rest.includes('--no-opus'));
  else if (cmd === 'dump') {
    const file = rest.find(a => !a.startsWith('--') && a !== opt(rest, '--words') && a !== opt(rest, '--romfs'));
    if (!file) usage('dump needs a .stqr file');
    cmdDump(romfs, file, opt(rest, '--words') ? Number(opt(rest, '--words')) : undefined);
  } else if (cmd === 'selftest') cmdSelftest(romfs, opt(rest, '--fixtures'));
  else usage(`unknown command "${cmd}"`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exit(1); }
}
