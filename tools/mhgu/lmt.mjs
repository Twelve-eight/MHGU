// MHGU LMT v0x43 reader (Switch). Facts and evidence: docs/reference/formats/lmt.md.
// Key decoders follow the game's own routines (main 1.4.0: type 14 at 0xaff884, type 15 at 0xaffb8c,
// type 7 at 0xafee00, type 6 at 0xaff2dc family); verified on all em001/002/007/011 motions.
// Also parses 64B motion header +0x34 embedded 4-group frame event block (+0x40/+0x88/+0xd0/+0x118,
// per main 1.4.0 loader 0x00b49fe8..0x00b4a054).
// Runs on the player's own extracted files; contains no game data.
//   node tools/mhgu/lmt.mjs info <file.76820d81>
//   node tools/mhgu/lmt.mjs dump <file.76820d81> <motionIndex>
//   node tools/mhgu/lmt.mjs events <file.76820d81> [motionIndex]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ENTRY_SIZE = 0x40, TRACK_SIZE = 0x24;
export const EVENT_SLOT_OFFSETS = [0x40, 0x88, 0xd0, 0x118];

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

/**
 * Parse the 4 embedded frame-event slots at +0x40/+0x88/+0xd0/+0x118 inside a motion's +0x34 block.
 * Each slot stores `{ count, arrayOffset }` followed (at `arrayOffset`) by `count` pairs of
 * `{ u32 mask, u32 duration }` where durations sum to `frameCount` (ending in `{0, remaining}` sentinel).
 */
export function readMotionEvents(buf, eventOffset, frameCount, label = '<buffer>') {
  if (!eventOffset) return null;
  if (!Number.isInteger(eventOffset) || eventOffset < 0) {
    throw new Error(`${label}: invalid eventOffset ${eventOffset}`);
  }
  if (eventOffset + 0x120 > buf.length) {
    throw new Error(`${label}: event block @0x${eventOffset.toString(16)} extends past EOF (${buf.length} B)`);
  }
  const slots = [];
  for (let s = 0; s < EVENT_SLOT_OFFSETS.length; s++) {
    const rel = EVENT_SLOT_OFFSETS[s];
    const slotOffset = eventOffset + rel;
    const count = buf.readUInt32LE(slotOffset);
    const arrayOffset = buf.readUInt32LE(slotOffset + 4);
    const entries = [];
    let frame = 0;
    if (count > 0) {
      if (!arrayOffset || arrayOffset + count * 8 > buf.length) {
        throw new Error(`${label}: event slot ${s} array @0x${arrayOffset.toString(16)} (${count} entries) out of bounds`);
      }
      for (let k = 0; k < count; k++) {
        const pos = arrayOffset + k * 8;
        const mask = buf.readUInt32LE(pos);
        const duration = buf.readUInt32LE(pos + 4);
        entries.push({ index: k, startFrame: frame, duration, endFrame: frame + duration, mask });
        frame += duration;
      }
    }
    const nonZero = entries.filter(e => e.mask !== 0);
    slots.push({
      slot: s,
      relOffset: rel,
      slotOffset,
      count,
      arrayOffset,
      totalFrames: frame,
      matchesFrameCount: frame === frameCount,
      nonZeroCount: nonZero.length,
      isSentinelOnly: count > 0 && nonZero.length === 0,
      entries,
    });
  }
  return slots;
}

export function readLmt(buf, label = '<buffer>') {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length < 8) throw new Error(`${label}: buffer too small (${buf.length} B) for LMT header`);
  if (buf.toString('latin1', 0, 3) !== 'LMT') throw new Error(`${label}: not an LMT file`);
  const version = buf.readUInt16LE(4);
  if (version !== 0x43) throw new Error(`${label}: LMT version 0x${version.toString(16)}, expected 0x43`);
  const motionCount = buf.readUInt16LE(6);
  if (8 + 4 * motionCount > buf.length) throw new Error(`${label}: motion table truncated (${buf.length} B)`);
  const u32 = o => buf.readUInt32LE(o), f32 = o => buf.readFloatLE(o);
  const motions = [];
  for (let i = 0; i < motionCount; i++) {
    const e = u32(8 + 4 * i);
    if (!e) { motions.push(null); continue; }
    if (e + ENTRY_SIZE > buf.length) throw new Error(`${label}: motion[${i}] header @0x${e.toString(16)} out of bounds`);
    if (!u32(e)) { motions.push(null); continue; }
    const trackList = u32(e), trackCount = u32(e + 4), frameCount = u32(e + 8);
    if (trackList + trackCount * TRACK_SIZE > buf.length) {
      throw new Error(`${label}: motion[${i}] track list @0x${trackList.toString(16)} (${trackCount} tracks) out of bounds`);
    }
    const flags = buf[e + 0x33];
    const eventOffset = u32(e + 0x34);
    const floatTrackOffset = u32(e + 0x38);
    const tracks = [];
    for (let t = 0; t < trackCount; t++) {
      const o = trackList + t * TRACK_SIZE;
      tracks.push({ type: buf[o], usage: buf[o + 1], bone: buf[o + 3], weight: f32(o + 4),
        byteSize: u32(o + 8), keyOffset: u32(o + 12), ref: [16, 20, 24, 28].map(k => f32(o + k)), boundsOffset: u32(o + 32) });
    }
    const eventsSkippedFlag2 = Boolean(eventOffset && (flags & 2) !== 0);
    const eventSlots = (eventOffset && !eventsSkippedFlag2)
      ? readMotionEvents(buf, eventOffset, frameCount, `${label} motion[${i}]`)
      : null;
    motions.push({ index: i, frameCount, flags, eventOffset, floatTrackOffset, eventsSkippedFlag2, tracks, eventSlots });
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

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node tools/mhgu/lmt.mjs info|dump|events <file> [motionIndex|--all]');
  process.exit(2);
}

function main(argv) {
  const [cmd, file, idx, ...extra] = argv;
  if (!cmd || cmd.startsWith('-') || !file || file.startsWith('-')) usage(null);
  if (extra.length > 0) usage(`unexpected argument ${JSON.stringify(extra[0])}`);
  if (cmd !== 'info' && cmd !== 'dump' && cmd !== 'events') usage(`unknown command ${JSON.stringify(cmd)}`);
  if (cmd === 'info' && idx !== undefined) usage(`unexpected argument ${JSON.stringify(idx)}`);
  if (cmd === 'dump' && (idx === undefined || idx.startsWith('-'))) usage('dump requires <motionIndex>');
  if (cmd === 'events' && idx !== undefined && idx.startsWith('-') && idx !== '--all') usage(`unknown option ${idx}`);

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
  if (cmd === 'events') {
    if (idx !== undefined && idx !== '--all') {
      const m = lmt.motions[Number(idx)];
      if (!m) throw new Error(`motion ${idx} is empty or out of range`);
      console.log(JSON.stringify({ index: m.index, frameCount: m.frameCount, eventOffset: m.eventOffset, flags: m.flags, eventsSkippedFlag2: m.eventsSkippedFlag2, slotOffsets: EVENT_SLOT_OFFSETS, eventSlots: m.eventSlots }));
      return;
    }
    const includeAll = idx === '--all';
    const used = lmt.motions.filter(Boolean);
    const withEventBlock = used.filter(m => m.eventSlots !== null);
    const withNonZero = withEventBlock.filter(m => m.eventSlots.some(s => s.nonZeroCount > 0));
    const list = (includeAll ? withEventBlock : withNonZero).map(m => ({
      index: m.index,
      frameCount: m.frameCount,
      eventOffset: m.eventOffset,
      eventSlots: m.eventSlots,
    }));
    console.log(JSON.stringify({
      motions: lmt.motions.length,
      used: used.length,
      withEventBlock: withEventBlock.length,
      withNonZeroEvents: withNonZero.length,
      sentinelOnlyMotions: withEventBlock.length - withNonZero.length,
      slotOffsets: EVENT_SLOT_OFFSETS,
      items: list,
    }));
    return;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
