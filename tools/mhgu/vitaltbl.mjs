// MHGU quest-side monster rate tables (HealthTbl/AtkTbl/... indices from questData rec+0x05C).
// Key fact: an .arc entry's type_hash equals crc32x(resource-reader-name), where
// crc32x(s) = zlib.crc32(s) ^ 0xFFFFFFFF (docs/analysis/monsters/mon-ai-entry.md §4.4).
// So we can search candidate resource names ("rVitalTbl", "rEm...", English/Japanese gamedev
// spellings) and match them against type hashes observed in romfs .arc files.
//
// Usage:
//   node vitaltbl.mjs scan <dir>            # collect type_hash -> {arc, entry} registry
//   node vitaltbl.mjs names <dir> <names...># crc32x each name, report registry hits
//   node vitaltbl.mjs dump  <file>          # hex/float dump of a table file
//   node vitaltbl.mjs rows  <file> [n]      # dump f32 rows (stride from NAN header)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { readArc, inflateEntry } from './arc.mjs';

export const crc32x = (s) => zlib.crc32(Buffer.from(s, 'latin1')) ^ 0xFFFFFFFF;

// Walk every .arc under dir, index type_hash -> list of {arc, name}.
export function scanArcs(dir) {
  const reg = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.arc')) {
        let arc;
        try { arc = readArc(fs.readFileSync(p), p); } catch { continue; }
        for (let i = 0; i < arc.entries.length; i++) {
          const t = arc.entries[i].typeHash >>> 0;
          if (!reg.has(t)) reg.set(t, []);
          reg.get(t).push({ arc: p, name: arc.entries[i].name, idx: i });
        }
      }
    }
  };
  walk(dir);
  return reg;
}

// Extract one entry from an arc to a Buffer.
export function extractEntry(arcPath, idx) {
  const arc = readArc(fs.readFileSync(arcPath), arcPath);
  return inflateEntry(fs.readFileSync(arcPath), arc.entries[idx]);
}

const hex = (u) => '0x' + u.toString(16).padStart(8, '0');

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'scan') {
    const reg = scanArcs(rest[0]);
    const lines = [...reg.entries()].sort((a, b) => a[0] - b[0])
      .map(([t, v]) => `${hex(t)}  ${v.length}x  ${v[0].arc.replace(/^.*[\\/]nativeNX[\\/]/, '')} :: ${v[0].name}`);
    console.log(lines.join('\n'));
    return;
  }
  if (cmd === 'names') {
    const reg = scanArcs(rest[0]);
    for (const n of rest.slice(1)) {
      const c = crc32x(n) >>> 0;
      const hits = reg.get(c);
      console.log(`${hex(c)}  ${n}${hits ? '  -> ' + hits.map(h => h.arc + ' :: ' + h.name).join(' ; ') : '  (no arc entry)'}`);
    }
    return;
  }
  if (cmd === 'dump') {
    const b = fs.readFileSync(rest[0]);
    for (let o = 0; o < Math.min(b.length, 256); o += 16)
      console.log(o.toString(16).padStart(4, '0'), b.subarray(o, o + 16).toString('hex').replace(/(..)/g, '$1 '));
    return;
  }
  if (cmd === 'rows') {
    const b = fs.readFileSync(rest[0]);
    const n = Number(rest[1] ?? NaN);
    const hdr = b.readUInt32LE(4);       // 0x14082501 : 0x14 = f32*8 row, 0x08 count1, 0x25 flags
    const stride = (hdr >>> 24) === 0x14 ? 32 : NaN;
    if (!stride) throw new Error('not a NAN table (header ' + hex(b.readUInt32LE(4)) + ')');
    const count = (b.length - 16) / stride;
    for (let r = 0; r < count; r++) {
      const o = 16 + r * stride;
      const f = Array.from({ length: 8 }, (_, i) => b.readFloatLE(o + i * 4));
      console.log(String(r).padStart(3), f.map(x => x.toFixed(2)).join(' '));
    }
    return;
  }
  console.error('usage: node vitaltbl.mjs scan|names|dump|rows ...');
  process.exit(2);
}
if (import.meta.url === 'file://' + process.argv[1].replace(/\\/g, '/') || process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) main(process.argv.slice(2));
