// MHGU enemy command table `enemy\cmd_tbl\emNNN_00_cmdtbl` (class rEnemyCmd, type hash 0x3aabba02).
// Header 0x10 B: "EMC\0" | u32 version 0x20120804 | u32 section count (21) | u32 0.
// Section descriptors @0x10, 16 B each: u32 entry count | u32 offset of entry table | u32 0 | u32 0.
// Entry table: count x 16 B: u32 script length | u32 script offset | u32 0 | u32 0 (offsets from file start).
// Loader 0x520a0 checks magic/version and turns every entry offset into base+offset.
// Script = byte code run by interpreter 0x82f80 (MHGU 1.4.0 main, vaddr). Instruction length comes from
// 0x50ce0 / 0x50c64 and the 167-byte table LEN_TABLE (main 0x1732c8c, pointer at 0x1839998):
//   op > 0xa6                 -> end of script (0xff in all files)
//   t = LEN_TABLE[op], bit7=0 -> leaf command, t operand bytes follow the opcode
//   bit7=1 (block op)         -> next byte = sub: 0 begin  ((t+1)&15 bytes incl. sub)
//                                               1 case   (2 bytes; 3/4/5 if t&0xf0 = 0x90/0xa0/0xb0)
//                                               other (2 default, 0xff end) -> 1 byte
// Usage:
//   node tools/mhgu/emc.mjs <file|dir> [...]      parse, print per-entry opcode lists
//   node tools/mhgu/emc.mjs --summary <file|dir>  parse, print one line per file and totals
// Library: parseEmc(buf) -> {version, sections[{index, offset, entries[{index, offset, length, ins[]}]}]}
//          decodeScript(bytes) -> ins[] ({pos, op, kind, sub?, args[]})
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'EMC\0';
export const VERSION = 0x20120804;
export const HEADER_SIZE = 0x10;
export const DESC_SIZE = 0x10;
export const TYPE_HASH = 0x3aabba02;

// Copied byte-for-byte from main 1.4.0 vaddr 0x1732c8c (167 entries, ops 0x00..0xa6).
export const LEN_TABLE = Uint8Array.from(Buffer.from(
  '0204800201800280808080818000800300818081018081808100010680820180018080808080808080808001030181' +
  '0100828081828002008000808001808080808180808080808000808083820180008080808080018081818002818000' +
  '8080018081800180808080808000838180818182818181818182829081808081810380038180828080800081808080' +
  '0080818080808102020201800202808080020202018002000100', 'hex'));
if (LEN_TABLE.length !== 167) throw new Error('LEN_TABLE must have 167 entries');

// Names backed by handler code in 0x82f80 (see docs/reference/formats/emc.md for evidence tags).
export const OP_NAMES = {
  0x0b: 'sw_target_dist_rot', // block, matcher mode 4 (sub 0): rotated-offset distance to target slot
  0x17: 'sw_dist_3d',         // block, mode 6: |p(+0x30) - p(+0x40)| of [em+0x1428]
  0x57: 'sw_target_dist_rot2',// block, mode 14: rotated-offset distance to target slot
  0x5c: 'sw_dist_xz',         // block, mode 16: XZ distance p(+0x30) - p(+0x40) of [em+0x1428]
  0x7c: 'sw_min_dist6',       // block, mode 24: min of 6 floats [em+0x1428]+0x2e8..0x304
};

const hex = (v, n = 2) => (v >>> 0).toString(16).padStart(n, '0');

// Bytes following the opcode at d[i]; null = end of script. Mirrors 0x50ce0.
export function insLength(d, i) {
  const op = d[i];
  if (op > 0xa6) return null;
  const t = LEN_TABLE[op];
  if (!(t & 0x80)) return t;
  if (i + 1 >= d.length) throw new Error(`block op 0x${hex(op)} at ${i} has no sub byte`);
  const sub = d[i + 1];
  if (sub === 1) { const h = t & 0xf0; return h === 0x90 ? 3 : h === 0xa0 ? 4 : h === 0xb0 ? 5 : 2; }
  if (sub === 0) return (t + 1) & 15;
  return 1;
}

export function decodeScript(d) {
  const ins = [];
  let i = 0;
  for (;;) {
    if (i >= d.length) throw new Error(`script runs past its length ${d.length} without terminator`);
    const n = insLength(d, i);
    if (n === null) {
      if (i !== d.length - 1) throw new Error(`terminator 0x${hex(d[i])} at ${i}, ${d.length - 1 - i} bytes left over`);
      ins.push({ pos: i, op: d[i], kind: 'end', args: [] });
      return ins;
    }
    if (i + 1 + n > d.length) throw new Error(`op 0x${hex(d[i])} at ${i} needs ${n} bytes, script has ${d.length - i - 1}`);
    const op = d[i];
    if (LEN_TABLE[op] & 0x80) {
      const sub = d[i + 1];
      const kind = sub === 0 ? 'begin' : sub === 1 ? 'case' : sub === 2 ? 'default' : sub === 0xff ? 'endblock' : 'blk?';
      ins.push({ pos: i, op, kind, sub, args: [...d.subarray(i + 2, i + 1 + n)] });
    } else {
      ins.push({ pos: i, op, kind: 'cmd', args: [...d.subarray(i + 1, i + 1 + n)] });
    }
    i += 1 + n;
  }
}

export function parseEmc(buf, label = '<buffer>') {
  if (buf.length < HEADER_SIZE || buf.toString('latin1', 0, 4) !== MAGIC) throw new Error(`${label}: not an EMC file`);
  const version = buf.readUInt32LE(4);
  if (version !== VERSION) throw new Error(`${label}: version 0x${hex(version, 8)} != 0x${hex(VERSION, 8)}`);
  const nsec = buf.readUInt32LE(8);
  const sections = [];
  for (let s = 0; s < nsec; s++) {
    const d = HEADER_SIZE + s * DESC_SIZE;
    if (d + DESC_SIZE > buf.length) throw new Error(`${label}: section ${s} descriptor out of bounds`);
    const count = buf.readUInt32LE(d), off = buf.readUInt32LE(d + 4);
    if (count && off + count * 16 > buf.length) throw new Error(`${label}: section ${s} entry table out of bounds`);
    const entries = [];
    for (let j = 0; j < count; j++) {
      const e = off + j * 16;
      const length = buf.readUInt32LE(e), offset = buf.readUInt32LE(e + 4);
      if (offset + length > buf.length) throw new Error(`${label}: section ${s} entry ${j} script out of bounds`);
      let ins;
      try { ins = decodeScript(buf.subarray(offset, offset + length)); }
      catch (err) { throw new Error(`${label}: section ${s} entry ${j} @0x${hex(offset, 1)}: ${err.message}`); }
      entries.push({ index: j, offset, length, ins });
    }
    sections.push({ index: s, offset: off, entries });
  }
  return { version, sections };
}

export function formatIns(x) {
  const name = OP_NAMES[x.op] ? `${OP_NAMES[x.op]}` : `op${hex(x.op)}`;
  if (x.kind === 'end') return 'end';
  if (x.kind === 'cmd') return x.args.length ? `${name}(${x.args.join(',')})` : name;
  if (x.kind === 'case') return `${name}.case(${x.args.join(',')})`;
  return `${name}.${x.kind}${x.args.length ? `(${x.args.join(',')})` : ''}`;
}

function* files(p) {
  if (fs.statSync(p).isDirectory()) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) yield* files(path.join(p, e.name));
  } else if (/\.3aabba02$|cmdtbl$/i.test(p)) yield p;
}

function main(argv) {
  const summary = argv[0] === '--summary';
  const targets = summary ? argv.slice(1) : argv;
  if (!targets.length) {
    console.error('usage:\n  node tools/mhgu/emc.mjs <file|dir> [...]\n  node tools/mhgu/emc.mjs --summary <file|dir> [...]');
    process.exit(2);
  }
  let ok = 0, bad = 0, nEnt = 0, nIns = 0;
  for (const t of targets) for (const f of files(t)) {
    try {
      const r = parseEmc(fs.readFileSync(f), f);
      const ents = r.sections.reduce((a, s) => a + s.entries.length, 0);
      const ins = r.sections.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.ins.length, 0), 0);
      ok++; nEnt += ents; nIns += ins;
      if (summary) { console.log(`OK ${f} sections=${r.sections.length} entries=${ents} ins=${ins}`); continue; }
      console.log(`# ${f} sections=${r.sections.length} entries=${ents}`);
      for (const s of r.sections) for (const e of s.entries) {
        console.log(`s${s.index}.e${e.index} @0x${hex(e.offset, 1)} len=${e.length}: ${e.ins.map(formatIns).join(' ')}`);
      }
    } catch (err) { bad++; console.log(`ERROR ${err.message}`); }
  }
  console.log(`parsed ${ok}/${ok + bad} files, errors ${bad}, entries ${nEnt}, instructions ${nIns}`);
  if (bad) process.exitCode = 1;
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) {
  try { main(process.argv.slice(2)); } catch (err) { console.error(`ERROR ${err.message}`); process.exitCode = 1; }
}
