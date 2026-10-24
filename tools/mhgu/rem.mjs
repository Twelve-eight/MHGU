// MHGU reward tables: `rem` (quest rewards) and `hagi` (carve/break/shiny). Spec: docs/reference/formats/rem.md.
// rem : 184 B, member `quest\rem\rem_XXXXXX` (type 0x5b3c302d) of romfs nativeNX/loc/arc/quest/q<id>.arc.
// hagi: 346 B, member `enemy\hagi\hagi_sN_emNNN_XX` (type 0x33a84e14) of romfs nativeNX/arc/enemy/emNNN_XX.arc.
// Both payloads are zlib inside the arc, so read them through arc.mjs (readArc/inflateEntry), never by offset.
// Usage:
//   node tools/mhgu/rem.mjs rem <file>                 decode one extracted rem (184 B)
//   node tools/mhgu/rem.mjs arc <quest.arc> [--slot A] decode every rem member of a quest arc, labelled by questLink
//   node tools/mhgu/rem.mjs hagi <file>                decode one extracted hagi (346 B)
//   node tools/mhgu/rem.mjs hagi-arc <enemy.arc>       decode every hagi member of an enemy arc
//   add --json to any of the above for machine output
// Library: parseRem(buf) -> {version, unknown04, groups[{condition, percent, entries[{item,count,chance}]}], end, clean}
//          parseHagi(buf) -> {header, tables[[{chance,count,item}]]}
//          parseQuestLink(buf) -> {names, remMain[2], remAdd[2], remSub}
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readArc, inflateEntry } from './arc.mjs';

export const REM_SIZE = 184;
export const REM_DATA_OFF = 0x18;      // first entry; 8 B header + 8 x {u8 condition, u8 entries}
export const REM_GROUPS = 8;
export const HAGI_SIZE = 346;
export const HAGI_HEADER = 26;
export const HAGI_SLOTS = 80;          // (346 - 26) / 4
export const T_REM = 0x5b3c302d;
export const T_HAGI = 0x33a84e14;
export const T_LINK = 0x00e0bb1c;
export const LINK_SIZE = 8 + 15 * 20;
export const REM_SLOTS = ['A', 'B', 'C', 'D', 'Sub'];   // questLink order: RemMain[0..1], RemAdd[0..1], RemSub

const hex = v => '0x' + (v >>> 0).toString(16).padStart(2, '0');
const pad = (s, n) => String(s).padEnd(n);

// One rem: f32 version 1.0, u32 1, 8 x {u8 condition, u8 entries}, then per group `entries` x
// {u16 itemId, u8 count, u8 chance} and the terminator {00 00 00 FF}; the tail is zero padding.
export function parseRem(buf, label = '<buffer>') {
  if (buf.length !== REM_SIZE) throw new Error(`${label}: ${buf.length} B, expected ${REM_SIZE}`);
  const version = buf.readFloatLE(0);
  const unknown04 = buf.readUInt32LE(4);
  const groups = [];
  let off = REM_DATA_OFF;
  for (let g = 0; g < REM_GROUPS; g++) {
    const condition = buf[0x08 + 2 * g];
    const count = buf[0x08 + 2 * g + 1];
    if (count === 0) continue;                       // {0, 0} = unused group
    if (off + count * 4 + 4 > REM_SIZE) {
      throw new Error(`${label}: group ${g} (condition ${condition}) needs ${count} entries at ${hex(off)}, past the ${REM_SIZE} B file`);
    }
    const entries = [];
    for (let k = 0; k < count; k++, off += 4) {
      entries.push({ item: buf.readUInt16LE(off), count: buf[off + 2], chance: buf[off + 3] });
    }
    if (buf.readUInt32LE(off) !== 0xff000000) {   // bytes 00 00 00 FF
      throw new Error(`${label}: group ${g} (condition ${condition}, ${count} entries) has no {00 00 00 FF} terminator at ${hex(off)}`);
    }
    off += 4;
    groups.push({ condition, percent: entries.reduce((s, e) => s + e.chance, 0), entries });
  }
  let clean = true;
  for (let i = off; i < REM_SIZE && clean; i++) clean = buf[i] === 0;
  return { version, unknown04, groups, end: off, clean };
}

// One hagi: 26 B header (layout unknown), then 4 B entries {u8 chance, u8 count, u16 itemId}.
// A table closes with FF FF 00 00; 00 00 FF FF is an unused slot and ends the used region.
export function parseHagi(buf, label = '<buffer>') {
  if (buf.length !== HAGI_SIZE) throw new Error(`${label}: ${buf.length} B, expected ${HAGI_SIZE}`);
  const tables = [];
  let cur = null;
  let off = HAGI_HEADER;
  for (; off + 4 <= HAGI_SIZE; off += 4) {
    const chance = buf[off];
    const count = buf[off + 1];
    const item = buf.readUInt16LE(off + 2);
    if (chance === 0xff && count === 0xff && item === 0) {
      // FF FF 00 00 closes a table; once no table is open it is the padding that fills the rest of the file.
      if (cur === null) break;
      tables.push(cur);
      cur = null;
      continue;
    }
    if (chance > 100 || count === 0 || item === 0 || item === 0xffff) {
      throw new Error(`${label}: bad entry at ${hex(off)} {chance ${chance}, count ${count}, item ${item}}`);
    }
    if (cur === null) cur = [];
    cur.push({ chance, count, item });
    if (cur.length > HAGI_SLOTS) throw new Error(`${label}: table at ${hex(off)} exceeds ${HAGI_SLOTS} entries`);
  }
  return { header: buf.subarray(0, HAGI_HEADER), tables, end: off };
}

// questLink (308 B): 8 B header + 15 x {u32 typeHash, char[16] name}.
export function parseQuestLink(buf, label = '<buffer>') {
  if (buf.length !== LINK_SIZE) throw new Error(`${label}: ${buf.length} B, expected ${LINK_SIZE}`);
  if (buf.readUInt32LE(0) !== 0x434b0000) throw new Error(`${label}: bad magic (expected 0x434b0000)`);
  const names = [];
  for (let i = 0; i < 15; i++) {
    const base = 8 + 20 * i + 4;
    const raw = buf.toString('latin1', base, base + 16);
    const nul = raw.indexOf('\0');
    names.push(nul < 0 ? raw : raw.slice(0, nul));
  }
  return { names, remMain: names.slice(8, 10), remAdd: names.slice(10, 12), remSub: names[12] };
}

function remSlotLabels(link) {
  const map = new Map();
  const add = (name, slot) => {
    if (!name) return;
    const prev = map.get(name);
    map.set(name, prev ? `${prev}/${slot}` : slot);
  };
  add(link.remMain[0], REM_SLOTS[0]);
  add(link.remMain[1], REM_SLOTS[1]);
  add(link.remAdd[0], REM_SLOTS[2]);
  add(link.remAdd[1], REM_SLOTS[3]);
  add(link.remSub, REM_SLOTS[4]);
  return map;
}

function printRem(label, rem) {
  const head = rem.groups.length
    ? rem.groups.map(g => `cond ${g.condition}: ${g.entries.length} entries, ${g.percent} %`).join(' | ')
    : 'empty';
  console.log(`${pad(label, 28)} v${rem.version} ${hex(rem.unknown04)}  ${head}`);
  for (const g of rem.groups) {
    for (const e of g.entries) {
      console.log(`${' '.repeat(30)}cond ${g.condition}  item ${pad(e.item, 5)}x${pad(e.count, 3)}${e.chance} %`);
    }
  }
  if (!rem.clean) console.error(`WARN ${label}: non-zero bytes after the last group (${hex(rem.end)})`);
}

function cmdRem(file, opts) {
  const rem = parseRem(fs.readFileSync(file), file);
  if (opts.json) return console.log(JSON.stringify({ file, ...rem, groups: rem.groups }, null, 1));
  console.log(`# ${file}: ${REM_SIZE} B`);
  printRem(path.basename(file), rem);
}

function remMembers(buf, label) {
  const arc = readArc(buf, label);
  return { arc, members: arc.entries.filter(e => e.typeHash === T_REM) };
}

function cmdArc(file, opts) {
  const buf = fs.readFileSync(file);
  const { arc, members } = remMembers(buf, file);
  const linkEntry = arc.entries.find(e => e.typeHash === T_LINK);
  let link = null;
  if (linkEntry) {
    try { link = parseQuestLink(inflateEntry(buf, linkEntry, file), `${file}:${linkEntry.name}`); }
    catch (err) { console.error(`ERROR ${err.message}`); }
  }
  const labels = link ? remSlotLabels(link) : new Map();
  const out = [];
  for (const e of members) {
    const label = labels.get(e.name.replace(/^quest\\rem\\/, '')) ?? '?';
    if (opts.slot && !label.split('/').includes(opts.slot)) continue;
    let rem;
    try { rem = parseRem(inflateEntry(buf, e, file), `${file}:${e.name}`); }
    catch (err) { console.error(`ERROR ${err.message}`); continue; }
    out.push({ slot: label, member: e.name, ...rem });
  }
  if (opts.json) return console.log(JSON.stringify({ file, questLink: link, rem: out }, null, 1));
  console.log(`# ${file}: arc v0x${arc.version.toString(16)}, ${arc.count} entries, ${members.length} rem`);
  if (!link) console.log('# no questLink member: slot labels unknown');
  for (const r of out) printRem(`${r.slot}  ${path.basename(r.member)}`, r);
}

function hagiMembers(buf, label) {
  const arc = readArc(buf, label);
  return { arc, members: arc.entries.filter(e => e.typeHash === T_HAGI) };
}

function printHagi(label, hagi) {
  console.log(`${label}: ${hagi.tables.length} tables, header ${hagi.header.toString('hex')}`);
  hagi.tables.forEach((t, i) => {
    const sum = t.reduce((s, e) => s + e.chance, 0);
    console.log(`  table ${i}: ${t.length} entries, ${sum} %${sum === 100 ? '' : '  <-- not 100'}`);
    for (const e of t) {
      console.log(`    item ${String(e.item).padStart(5)} x${String(e.count).padStart(2)}  ${String(e.chance).padStart(3)} %`);
    }
  });
}

function cmdHagi(file, opts) {
  const hagi = parseHagi(fs.readFileSync(file), file);
  if (opts.json) return console.log(JSON.stringify({ file, header: hagi.header.toString('hex'), end: hagi.end, tables: hagi.tables }, null, 1));
  console.log(`# ${file}: ${HAGI_SIZE} B`);
  printHagi(path.basename(file), hagi);
}

function cmdHagiArc(file, opts) {
  const buf = fs.readFileSync(file);
  const { arc, members } = hagiMembers(buf, file);
  const out = [];
  for (const e of members) {
    try { out.push({ member: e.name, ...parseHagi(inflateEntry(buf, e, file), `${file}:${e.name}`) }); }
    catch (err) { console.error(`ERROR ${err.message}`); }
  }
  if (opts.json) {
    return console.log(JSON.stringify({ file, hagi: out.map(h => ({ member: h.member, header: h.header.toString('hex'), tables: h.tables })) }, null, 1));
  }
  console.log(`# ${file}: arc v0x${arc.version.toString(16)}, ${arc.count} entries, ${members.length} hagi`);
  for (const h of out) printHagi(path.basename(h.member), h);
}

function usage(msg) {
  if (msg) console.error(`rem.mjs: ${msg}`);
  console.error('usage: node tools/mhgu/rem.mjs rem <file> [--json]');
  console.error('       node tools/mhgu/rem.mjs arc <quest.arc> [--slot A|B|C|D|Sub] [--json]');
  console.error('       node tools/mhgu/rem.mjs hagi <file> [--json]');
  console.error('       node tools/mhgu/rem.mjs hagi-arc <enemy.arc> [--json]');
  process.exitCode = 2;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const opts = { json: rest.includes('--json') };
  const slotAt = rest.indexOf('--slot');
  if (slotAt >= 0) opts.slot = rest[slotAt + 1];
  const file = rest.find(a => !a.startsWith('--') && a !== opts.slot);
  if (!cmd || !file) return usage(cmd ? 'missing <file>' : 'missing command');
  try {
    if (cmd === 'rem') return cmdRem(file, opts);
    if (cmd === 'arc') return cmdArc(file, opts);
    if (cmd === 'hagi') return cmdHagi(file, opts);
    if (cmd === 'hagi-arc') return cmdHagiArc(file, opts);
    return usage(`unknown command "${cmd}"`);
  } catch (err) {
    console.error(`ERROR ${err.message}`);
    process.exitCode = 1;
  }
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
