// Arc-side data for one GU monster: the cmdtbl, the LMT frame tables and the attackdata records.
//
// LMT: motion id = bank * 256 + index; index 0 and holes are null in the file. Every sibling arc of
// the same monster is searched (em001_00 also ships em001_02/em001_04), because a class is shared by
// the base monster and its variants (em001_04 = Dreadqueen carries the bank-9 set). The arc that
// supplied a motion is recorded, so "GU-absent" means "no shipped LMT of this monster has it".
import fs from 'node:fs';
import path from 'node:path';
import { readArc, inflateEntry } from 'file:///G:/omp works/MHGU/tools/mhgu/arc.mjs';
import { readLmt } from 'file:///G:/omp works/MHGU/tools/mhgu/lmt.mjs';
import { cmdtblFromArc } from './trees.mjs';

export const ENEMY_ARC_DIR = 'G:/mhgu-romfs/romfs/nativeNX/arc/enemy';

export function monsterArcs(guEmSub) {
  const em = guEmSub.slice(0, 5);
  const dir = ENEMY_ARC_DIR;
  const names = fs.readdirSync(dir)
    .filter(n => new RegExp(`^${em}_\\d\\d\\.arc$`).test(n))
    .sort((a, b) => (a.endsWith('_00.arc') ? -1 : b.endsWith('_00.arc') ? 1 : a.localeCompare(b)));
  const out = [];
  for (const n of names) {
    const sub = n.slice(6, 8);
    const p = path.join(dir, n);
    out.push({ sub, path: p, name: n, buf: fs.readFileSync(p) });
  }
  if (!out.length) throw new Error(`no arc for ${guEmSub} in ${dir}`);
  return out;
}

export function arcEntry(arcBuf, name) {
  const arc = readArc(arcBuf, name);
  const want = name.toLowerCase();
  return arc.entries.find(e => e.name.toLowerCase() === want) ?? null;
}

// Load the monster's cmdtbl (falls back to any *_cmdtbl entry of the base arc).
export function loadCmdtbl(arcs, guEmSub) {
  const base = arcs.find(a => a.sub === '00') ?? arcs[0];
  const want = `enemy\\cmd_tbl\\${guEmSub}_cmdtbl`;
  let e = arcEntry(base.buf, want);
  if (!e) {
    const arc = readArc(base.buf, base.name);
    e = arc.entries.find(x => /cmd_tbl/i.test(x.name)) ?? null;
  }
  if (!e) throw new Error(`${base.name}: no cmdtbl entry`);
  const bytes = inflateEntry(base.buf, e, base.name);
  const doc = cmdtblFromArc(base.buf, e.name, base.name).doc;
  return { doc, entry: e, bytes, arcName: base.name };
}

// motion id -> { frames, bank, index, entry, arc }
export function loadLmts(arcs, guEmSub) {
  const em = guEmSub.slice(0, 5);
  const map = new Map();
  const arcOf = new Map(); // bank -> provenance per sub preference
  for (const a of arcs) {
    let arc;
    try { arc = readArc(a.buf, a.name); } catch { continue; }
    for (const e of arc.entries) {
      const m = /(?:^|[\\/])mot[\\/]([^\\/]+)$/i.exec(e.name);
      if (!m) continue;
      const base = m[1];
      const bm = new RegExp(`^(${em}_(\\d\\d))_(\\d+)$`).exec(base);
      if (!bm) continue;
      const sub = bm[2];
      const bank = +bm[3];
      if (bank > 255) continue;
      let data;
      try { data = inflateEntry(a.buf, e, a.name); } catch { continue; }
      let lmt;
      try { lmt = readLmt(data, base); } catch { continue; }
      if (!lmt || !Array.isArray(lmt.motions)) continue;
      for (const mo of lmt.motions) {
        if (!mo) continue;
        const id = bank * 256 + mo.index;
        // prefer the arc whose sub matches the base monster's own sub, then the lowest sub
        const prev = map.get(id);
        const rank = (s) => (s === guEmSub.slice(6) ? 0 : 1 + +s);
        if (prev && rank(prev.sub) <= rank(sub)) continue;
        map.set(id, { id, frames: mo.frameCount, bank, index: mo.index, entry: base, arc: a.name, sub });
      }
      arcOf.set(bank, arcOf.get(bank) ?? a.name);
    }
  }
  return map;
}

export function motionLmtText(m) {
  return m ? `${m.entry}#${m.index}` : 'bank' + (m?.bank ?? '?') + '#absent';
}

// attackdata: HDE\0, count@8, records at 0x10 + i*0x20.
//   +0x00 u16 start A, +0x02 u16 duration B, +0x04 u16 dmg, +0x06 u16 react,
//   +0x08 u16 flag word, +0x0C u32 attr, +0x10/+0x14 u32 ailment words, +0x18 u16 ailment value
export function parseAttackdata(buf, label) {
  if (buf.length < 0x10 || buf.toString('latin1', 0, 4) !== 'HDE\0') throw new Error(`${label}: no HDE magic`);
  const count = buf.readUInt32LE(8);
  const recs = [];
  for (let i = 0; i < count; i++) {
    const o = 0x10 + i * 0x20;
    if (o + 0x20 > buf.length) break;
    recs.push({
      index: i,
      start: buf.readUInt16LE(o + 0x00),
      dur: buf.readUInt16LE(o + 0x02),
      dmg: buf.readUInt16LE(o + 0x04),
      react: buf.readUInt16LE(o + 0x06),
      flags: buf.readUInt16LE(o + 0x08),
      attr: buf.readUInt32LE(o + 0x0c),
      ail1: buf.readUInt32LE(o + 0x10),
      ail2: buf.readUInt32LE(o + 0x14),
      ailval: buf.readUInt16LE(o + 0x18),
      raw: buf.subarray(o, o + 0x20).toString('hex'),
    });
  }
  const sep = recs.findIndex(r => r.start === 0xffff);
  return { label, count, recs, separator: sep, size: buf.length };
}

export function loadAttackdata(arcs, guEmSub) {
  const em = guEmSub.slice(0, 5);
  const want = `enemy\\hit_data\\${guEmSub}_attackdata`;
  let base = null;
  let variant = null;
  for (const a of arcs) {
    let arc;
    try { arc = readArc(a.buf, a.name); } catch { continue; }
    for (const e of arc.entries) {
      if (!/hit_data/i.test(e.name) || !/attackdata$/i.test(e.name)) continue;
      const m = /(em\d{3}_(\d\d))_attackdata$/i.exec(e.name);
      if (!m) continue;
      const label = `${m[1]}_attackdata`;
      let data;
      try { data = inflateEntry(a.buf, e, a.name); } catch { continue; }
      let parsed;
      try { parsed = parseAttackdata(data, `${a.name}:${e.name}`); } catch { continue; }
      if (m[1] === guEmSub) { if (!base) base = parsed; }
      else if (!variant) variant = parsed;
    }
  }
  return { base, variant };
}
