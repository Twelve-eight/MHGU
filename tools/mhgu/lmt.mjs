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
// Single-axis rotations (game routines 0xaff2c4 type 11, 0xaff4b0 type 12): component c and w are
// stored as 14-bit fields, value = B + A * (raw - 8) / 16368; other components stay at B.
function axis14(b, o, A, B, c) {
  const v = b.readUInt32LE(o), value = B.slice();
  value[c] += A[c] * ((v & 0x3fff) - 8) / 16368;
  value[3] += A[3] * (((v >>> 14) & 0x3fff) - 8) / 16368;
  return { value, delta: v >>> 28 };
}

const DECODERS = {
  // 4 x signed 14 / 4096, fields from bit 0 are w,z,y,x; frame delta in the top 8 bits.
  6: { size: 8, decode(b, o) {
    const v = b.readBigUInt64LE(o), f = n => Number((v >> BigInt(n)) & 0x3fffn);
    return { value: [42, 28, 14, 0].map(s => sext(f(s), 14) / 4096), delta: Number(v >> 56n) };
  } },
  // 4 x 7 bits, x from bit 21, y bit 14, z bit 7, w bit 0; value = B + A * (raw - 8) / 112, then
  // normalised (game routine 0xafee00; 10780/10780 unit before normalising, first key = ref 515/543).
  7: { size: 4, bounds: true, decode(b, o, A, B) {
    const v = b.readUInt32LE(o);
    const q = [21, 14, 7, 0].map((s, c) => B[c] + A[c] * (((v >>> s) & 0x7f) - 8) / 112), n = Math.hypot(...q) || 1;
    return { value: q.map(x => x / n), delta: v >>> 28 };
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
  // Translation / scale: 3 x u16, value = B + A * (raw - 8) / 65520, u16 frame delta at +6
  // (game routine 0xafeb00 per the codec table at 0x179110c; 953/953 delta sums, first key = ref 888/953).
  4: { size: 8, bounds: true, decode(b, o, A, B) {
    return { value: [0, 2, 4, 6].map((k, c) => c < 3 ? B[c] + A[c] * (b.readUInt16LE(o + k) - 8) / 65520 : B[3]),
      delta: b.readUInt16LE(o + 6) };
  } },
  // Translation / scale: 3 x u8, value = B + A * (raw - 8) / 240, delta = byte 3 (game routine 0xafec80;
  // 61/61 delta sums, first key = ref 54/61; raw/255 control 5/61).
  5: { size: 4, bounds: true, decode(b, o, A, B) {
    return { value: [0, 1, 2, 3].map(c => c < 3 ? B[c] + A[c] * (b[o + c] - 8) / 240 : B[3]), delta: b[o + 3] };
  } },
  // Type 11 stores x,w; type 12 stores y,w (first key = ref 3603/3963 and 78/85; raw/16383 control 2759, 74).
  11: { size: 4, bounds: true, decode: (b, o, A, B) => axis14(b, o, A, B, 0) },
  12: { size: 4, bounds: true, decode: (b, o, A, B) => axis14(b, o, A, B, 1) },
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
