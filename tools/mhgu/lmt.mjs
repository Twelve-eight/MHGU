// MHGU LMT v0x43 reader (Switch). Facts and evidence: docs/reference/formats/lmt.md.
// Key decoders follow the game's own routines (main 1.4.0: type 14 at 0xaff884, type 15 at 0xaffb8c,
// type 7 at 0xafee00, type 6 at 0xaff2dc family); verified on all em001/002/007/011 motions.
// Runs on the player's own extracted files; contains no game data.
//   node tools/mhgu/lmt.mjs info <file.76820d81>
//   node tools/mhgu/lmt.mjs dump <file.76820d81> <motionIndex>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ENTRY_SIZE = 0x40, TRACK_SIZE = 0x24;

const sext = (v, bits) => (v << (32 - bits)) >> (32 - bits);
const lerp = (A, B, raw, scale) => raw.map((r, c) => B[c] + A[c] * (r - 8) / scale);

// Each decoder returns { value: number[4], delta: frames until the next key }.
const DECODERS = {
  // 4 x signed 14 / 4096, fields from bit 0 are w,z,y,x; frame delta in the top 8 bits.
  6: { size: 8, decode(b, o) {
    const v = b.readBigUInt64LE(o), f = n => Number((v >> BigInt(n)) & 0x3fffn);
    return { value: [42, 28, 14, 0].map(s => sext(f(s), 14) / 4096), delta: Number(v >> 56n) };
  } },
  // 4 x 7 bits; value = B + A * raw / 127 (10045/10780 unit keys, better than the (raw-8)/112 variant).
  7: { size: 4, bounds: true, decode(b, o, A, B) {
    const v = b.readUInt32LE(o);
    return { value: [0, 7, 14, 21].map((s, c) => B[c] + A[c] * ((v >>> s) & 0x7f) / 127), delta: v >>> 28 };
  } },
  // 4 x 11 bits with interleaved fields (game routine 0xaff884).
  14: { size: 6, bounds: true, decode(b, o, A, B) {
    const r2 = (b.readUInt16LE(o) | (b.readUInt16LE(o + 2) << 16)) >>> 0, r0 = b.readUInt16LE(o + 4);
    const raw = [r2 & 0x7ff, ((r2 >>> 16) & 0x3f) | (((r2 >>> 11) & 0x1f) << 6),
      (r0 & 1) | (((r2 >>> 22) & 0x3ff) << 1), (r0 >>> 1) & 0x7ff];
    return { value: lerp(A, B, raw, 2032), delta: r0 >>> 12 };
  } },
  // 4 x 9 bits with interleaved fields (game routine 0xaffb8c).
  15: { size: 5, bounds: true, decode(b, o, A, B) {
    const b0 = b[o], v = b.readUInt32LE(o + 1);
    const raw = [(v & 1) | (b0 << 1), ((v << 1) & 0x1fc) | ((v >>> 8) & 3),
      ((v >>> 7) & 0x1f8) | ((v >>> 16) & 7), ((v >>> 15) & 0x1f0) | ((v >>> 24) & 0xf)];
    return { value: lerp(A, B, raw, 496), delta: v >>> 28 };
  } },
};

export function readLmt(buf, label = '<buffer>') {
  if (buf.toString('latin1', 0, 3) !== 'LMT') throw new Error(`${label}: not an LMT file`);
  const version = buf.readUInt16LE(4);
  if (version !== 0x43) throw new Error(`${label}: LMT version 0x${version.toString(16)}, expected 0x43`);
  const u32 = o => buf.readUInt32LE(o), f32 = o => buf.readFloatLE(o);
  const motions = [];
  for (let i = 0; i < buf.readUInt16LE(6); i++) {
    const e = u32(8 + 4 * i);
    if (!e || !u32(e)) { motions.push(null); continue; }
    const trackList = u32(e), trackCount = u32(e + 4), frameCount = u32(e + 8);
    const tracks = [];
    for (let t = 0; t < trackCount; t++) {
      const o = trackList + t * TRACK_SIZE;
      tracks.push({ type: buf[o], usage: buf[o + 1], bone: buf[o + 3], weight: f32(o + 4),
        byteSize: u32(o + 8), keyOffset: u32(o + 12), ref: [16, 20, 24, 28].map(k => f32(o + k)), boundsOffset: u32(o + 32) });
    }
    motions.push({ index: i, frameCount, tracks });
  }
  return { version, motions };
}

// Decoded keys for one track; null when the codec is not supported.
export function trackKeys(buf, track) {
  const d = DECODERS[track.type];
  if (!d || !track.byteSize) return null;
  const A = d.bounds ? [0, 1, 2, 3].map(k => buf.readFloatLE(track.boundsOffset + 4 * k)) : null;
  const B = d.bounds ? [0, 1, 2, 3].map(k => buf.readFloatLE(track.boundsOffset + 16 + 4 * k)) : null;
  const keys = [];
  let frame = 0;
  for (let k = 0; k < track.byteSize / d.size; k++) {
    const { value, delta } = d.decode(buf, track.keyOffset + k * d.size, A, B);
    keys.push({ frame, value });
    frame += delta;
  }
  return keys;
}

function main([cmd, file, idx]) {
  if (!file) { console.error('usage: node tools/mhgu/lmt.mjs info|dump <file> [motionIndex]'); process.exit(2); }
  const buf = fs.readFileSync(file), lmt = readLmt(buf, file);
  if (cmd === 'info') {
    const types = {};
    for (const m of lmt.motions) for (const t of m?.tracks ?? []) types[t.type] = (types[t.type] ?? 0) + 1;
    console.log(JSON.stringify({ motions: lmt.motions.length, used: lmt.motions.filter(Boolean).length, trackTypes: types }));
    return;
  }
  if (cmd === 'dump') {
    const m = lmt.motions[Number(idx)];
    if (!m) throw new Error(`motion ${idx} is empty or out of range`);
    console.log(JSON.stringify({ frameCount: m.frameCount, tracks: m.tracks.map(t => ({ ...t, keys: trackKeys(buf, t) })) }));
    return;
  }
  throw new Error(`unknown command ${JSON.stringify(cmd)}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
