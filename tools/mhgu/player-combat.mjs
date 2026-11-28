// Clean-room MHGU player combat data parsers & writers (HTS, PMA, FUP, PSL).
// Formats verified against nativeNX/arc/player/quest/*.arc and main 1.4.0 loaders.
// Zero external dependencies; MIT clean-room implementation.
//
// Usage:
//   node tools/mhgu/player-combat.mjs hts <file>
//   node tools/mhgu/player-combat.mjs pma <file>
//   node tools/mhgu/player-combat.mjs fup <file>
//   node tools/mhgu/player-combat.mjs psl <file>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TYPE_HTS = 0x5653c1b0;
export const TYPE_PMA = 0x18a9225c;
export const TYPE_FUP = 0x496f8f22;
export const TYPE_PSL = 0x254309c9;

export const HTS_MAGIC = 'HTS\0';
export const HTS_VERSION = 0x20131015;
export const HTS_HEADER_SIZE = 16;
export const HTS_GROUP_ENTRY_SIZE = 8;
export const HTS_ITEM_SIZE = 48;

export const PMA_HEADER_F32 = 6.0;
export const PMA_HEADER_RAW = 0x40c00000;
export const PMA_HEADER_SIZE = 8;
export const PMA_RECORD_SIZE = 8;

export const FUP_MAGIC = 'FUP\0';
export const FUP_VERSION = 2;
export const FUP_HEADER_SIZE = 20;

export const PSL_MAGIC = 'PSL\0';
export const PSL_VERSION = 2;
export const PSL_HEADER_SIZE = 8;
export const PSL_ENTRY_SIZE = 16;
export const PSL_SUB_HEADER_SIZE = 328; // 0x148 bytes before +0x148 timelineOffset

const hex32 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');

function asBuffer(buf) {
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

function assertIntRange(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label}: expected integer in [${min}, ${max}], got ${JSON.stringify(value)}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// HTS\0 (0x5653c1b0) - Hitbox geometry groups (48 B records)
// ---------------------------------------------------------------------------

/**
 * Parse an `HTS\0` hitsize table buffer into structured groups and 48 B capsule/sphere records.
 */
export function readHts(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < HTS_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for HTS header`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== HTS_MAGIC) {
    throw new Error(`${label}: bad HTS magic ${JSON.stringify(magic)} (expected "HTS\\0")`);
  }
  const version = buf.readUInt32LE(4);
  if (version !== HTS_VERSION) {
    throw new Error(`${label}: unsupported HTS version ${hex32(version)} (expected ${hex32(HTS_VERSION)})`);
  }
  const groupCount = buf.readUInt32LE(8);
  const reserved = buf.readUInt32LE(12);
  if (reserved !== 0) {
    throw new Error(`${label}: unexpected HTS header +0x0C reserved value ${hex32(reserved)}`);
  }
  const tableEnd = HTS_HEADER_SIZE + groupCount * HTS_GROUP_ENTRY_SIZE;
  if (tableEnd > buf.length) {
    throw new Error(`${label}: HTS group table truncated (need ${tableEnd} B, got ${buf.length} B)`);
  }

  const groups = [];
  const spans = [];
  let totalItems = 0;
  for (let g = 0; g < groupCount; g++) {
    const entryOff = HTS_HEADER_SIZE + g * HTS_GROUP_ENTRY_SIZE;
    const itemCount = buf.readUInt32LE(entryOff);
    const payloadOffset = buf.readUInt32LE(entryOff + 4);
    if (payloadOffset < tableEnd || payloadOffset > buf.length) {
      throw new Error(`${label}: HTS group[${g}] payloadOffset ${hex32(payloadOffset)} out of bounds (${buf.length} B)`);
    }
    if (payloadOffset % 4 !== 0) {
      throw new Error(`${label}: HTS group[${g}] payloadOffset ${hex32(payloadOffset)} is not 4-byte aligned`);
    }
    const groupEnd = payloadOffset + itemCount * HTS_ITEM_SIZE;
    if (groupEnd > buf.length) {
      throw new Error(`${label}: HTS group[${g}] items extend past EOF (${groupEnd} > ${buf.length})`);
    }
    if (itemCount > 0) {
      spans.push({ group: g, start: payloadOffset, end: groupEnd });
    }
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      const o = payloadOffset + i * HTS_ITEM_SIZE;
      items.push({
        boneA: buf.readUInt16LE(o + 0x00),
        boneB: buf.readUInt16LE(o + 0x02),
        shapeType: buf.readUInt16LE(o + 0x04),
        subFlags: buf.readUInt16LE(o + 0x06),
        condFlags: buf.readUInt32LE(o + 0x08),
        radius: buf.readFloatLE(o + 0x0c),
        p0: [buf.readFloatLE(o + 0x10), buf.readFloatLE(o + 0x14), buf.readFloatLE(o + 0x18)],
        pad0: buf.readFloatLE(o + 0x1c),
        p1: [buf.readFloatLE(o + 0x20), buf.readFloatLE(o + 0x24), buf.readFloatLE(o + 0x28)],
        pad1: buf.readFloatLE(o + 0x2c),
      });
    }
    totalItems += itemCount;
    groups.push({ index: g, itemCount, payloadOffset, items });
  }

  spans.sort((a, b) => a.start - b.start);
  for (let k = 1; k < spans.length; k++) {
    if (spans[k].start < spans[k - 1].end) {
      throw new Error(
        `${label}: HTS group[${spans[k].group}] [${hex32(spans[k].start)}, ${hex32(spans[k].end)}) `
        + `overlaps group[${spans[k - 1].group}] [${hex32(spans[k - 1].start)}, ${hex32(spans[k - 1].end)})`
      );
    }
  }

  const expectedLen = tableEnd + totalItems * HTS_ITEM_SIZE;
  if (buf.length !== expectedLen) {
    throw new Error(`${label}: HTS length ${buf.length} B != expected ${expectedLen} B`);
  }

  return { format: 'HTS', version, groupCount, reserved, totalItems, groups };
}

/**
 * Serialize a parsed or constructed HTS model back to an exact `HTS\0` binary buffer.
 */
export function writeHts(model) {
  if (!model || typeof model !== 'object' || !Array.isArray(model.groups)) {
    throw new Error('writeHts: model.groups array is required');
  }
  const version = model.version ?? HTS_VERSION;
  if (version !== HTS_VERSION) {
    throw new Error(`writeHts: unsupported HTS version ${hex32(version)}`);
  }
  const reserved = model.reserved ?? 0;
  assertIntRange(reserved, 0, 0xffffffff, 'writeHts: reserved');
  if (reserved !== 0) {
    throw new Error(`writeHts: unexpected non-zero reserved value ${hex32(reserved)}`);
  }

  const groupCount = model.groups.length;
  const tableEnd = HTS_HEADER_SIZE + groupCount * HTS_GROUP_ENTRY_SIZE;
  let totalItems = 0;
  let hasCustomOffsets = false;
  let missingCustomOffsets = false;
  for (const g of model.groups) {
    if (!g || !Array.isArray(g.items)) {
      throw new Error('writeHts: every group must have an items array');
    }
    if (g.payloadOffset !== undefined) hasCustomOffsets = true;
    else missingCustomOffsets = true;
    totalItems += g.items.length;
  }
  if (hasCustomOffsets && missingCustomOffsets) {
    throw new Error('writeHts: partial group payloadOffset specification is ambiguous');
  }

  const offsets = [];
  const spans = [];
  let maxEnd = tableEnd + totalItems * HTS_ITEM_SIZE;
  if (hasCustomOffsets) {
    for (let g = 0; g < groupCount; g++) {
      const items = model.groups[g].items;
      const off = assertIntRange(model.groups[g].payloadOffset, tableEnd, 0xffffffff, `writeHts: group[${g}].payloadOffset`);
      if (off % 4 !== 0) {
        throw new Error(`writeHts: group[${g}].payloadOffset ${hex32(off)} is not 4-byte aligned`);
      }
      const end = off + items.length * HTS_ITEM_SIZE;
      if (end > maxEnd) maxEnd = end;
      if (items.length > 0) spans.push({ group: g, start: off, end });
      offsets.push(off);
    }
    spans.sort((a, b) => a.start - b.start);
    for (let k = 1; k < spans.length; k++) {
      if (spans[k].start < spans[k - 1].end) {
        throw new Error(
          `writeHts: group[${spans[k].group}] [${hex32(spans[k].start)}, ${hex32(spans[k].end)}) `
          + `overlaps group[${spans[k - 1].group}] [${hex32(spans[k - 1].start)}, ${hex32(spans[k - 1].end)})`
        );
      }
    }
  } else {
    let cursor = tableEnd;
    for (let g = 0; g < groupCount; g++) {
      offsets.push(cursor);
      cursor += model.groups[g].items.length * HTS_ITEM_SIZE;
    }
  }

  const out = Buffer.alloc(maxEnd, 0);
  out.write(HTS_MAGIC, 0, 'latin1');
  out.writeUInt32LE(version >>> 0, 4);
  out.writeUInt32LE(groupCount >>> 0, 8);
  out.writeUInt32LE(0, 12);

  for (let g = 0; g < groupCount; g++) {
    const items = model.groups[g].items;
    const entryOff = HTS_HEADER_SIZE + g * HTS_GROUP_ENTRY_SIZE;
    const payloadOffset = offsets[g];
    out.writeUInt32LE(items.length >>> 0, entryOff);
    out.writeUInt32LE(payloadOffset >>> 0, entryOff + 4);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const o = payloadOffset + i * HTS_ITEM_SIZE;
      out.writeUInt16LE(assertIntRange(it.boneA, 0, 0xffff, `writeHts: group[${g}].items[${i}].boneA`), o + 0x00);
      out.writeUInt16LE(assertIntRange(it.boneB, 0, 0xffff, `writeHts: group[${g}].items[${i}].boneB`), o + 0x02);
      out.writeUInt16LE(assertIntRange(it.shapeType, 0, 0xffff, `writeHts: group[${g}].items[${i}].shapeType`), o + 0x04);
      out.writeUInt16LE(assertIntRange(it.subFlags, 0, 0xffff, `writeHts: group[${g}].items[${i}].subFlags`), o + 0x06);
      out.writeUInt32LE(assertIntRange(it.condFlags ?? 0, 0, 0xffffffff, `writeHts: group[${g}].items[${i}].condFlags`), o + 0x08);
      out.writeFloatLE(it.radius, o + 0x0c);
      const p0 = it.p0 ?? [0, 0, 0];
      const p1 = it.p1 ?? [0, 0, 0];
      out.writeFloatLE(p0[0], o + 0x10);
      out.writeFloatLE(p0[1], o + 0x14);
      out.writeFloatLE(p0[2], o + 0x18);
      out.writeFloatLE(it.pad0 ?? 0, o + 0x1c);
      out.writeFloatLE(p1[0], o + 0x20);
      out.writeFloatLE(p1[1], o + 0x24);
      out.writeFloatLE(p1[2], o + 0x28);
      out.writeFloatLE(it.pad1 ?? 0, o + 0x2c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PMA (0x18a9225c) - rPlayerManyAttacks frame -> HDP index triggers
// ---------------------------------------------------------------------------

/**
 * Parse a `PMA` (`0x18a9225c`) attack trigger list buffer.
 */
export function readPma(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < PMA_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for PMA header`);
  }
  const headerRaw = buf.readUInt32LE(0);
  const header = buf.readFloatLE(0);
  if (headerRaw !== PMA_HEADER_RAW) {
    throw new Error(`${label}: bad PMA header ${header} (${hex32(headerRaw)}, expected 6.0 / ${hex32(PMA_HEADER_RAW)})`);
  }
  const count = buf.readUInt32LE(4);
  const expectedLen = PMA_HEADER_SIZE + count * PMA_RECORD_SIZE;
  if (buf.length !== expectedLen) {
    throw new Error(`${label}: PMA length ${buf.length} B != 8 + ${count}*8 = ${expectedLen} B`);
  }

  const records = [];
  for (let i = 0; i < count; i++) {
    const o = PMA_HEADER_SIZE + i * PMA_RECORD_SIZE;
    records.push({
      frame: buf.readFloatLE(o),
      rawFlags: buf.readUInt32LE(o + 4),
      hitDataIndex: buf.readInt16LE(o + 4),
      hitWorkId: buf.readUInt8(o + 6),
      atkType: buf.readUInt8(o + 7),
    });
  }
  return { format: 'PMA', header, headerRaw, count, records };
}

/**
 * Serialize a parsed or constructed PMA model back to an exact `PMA` binary buffer.
 */
export function writePma(model) {
  if (!model || typeof model !== 'object' || !Array.isArray(model.records)) {
    throw new Error('writePma: model.records array is required');
  }
  if (model.headerRaw !== undefined && model.headerRaw !== PMA_HEADER_RAW) {
    throw new Error(`writePma: unsupported PMA headerRaw ${hex32(model.headerRaw)}`);
  }
  if (model.header !== undefined && model.header !== PMA_HEADER_F32) {
    throw new Error(`writePma: unsupported PMA header ${model.header} (expected 6.0)`);
  }

  const count = model.records.length;
  const out = Buffer.alloc(PMA_HEADER_SIZE + count * PMA_RECORD_SIZE, 0);
  out.writeUInt32LE(PMA_HEADER_RAW, 0);
  out.writeUInt32LE(count >>> 0, 4);

  for (let i = 0; i < count; i++) {
    const r = model.records[i];
    const o = PMA_HEADER_SIZE + i * PMA_RECORD_SIZE;
    if (typeof r.frame !== 'number') {
      throw new TypeError(`writePma: record[${i}].frame must be a number`);
    }
    out.writeFloatLE(r.frame, o);
    const hasSemantic = r.hitDataIndex !== undefined || r.hitWorkId !== undefined || r.atkType !== undefined;
    if (r.rawFlags !== undefined && !hasSemantic) {
      out.writeUInt32LE(assertIntRange(r.rawFlags, 0, 0xffffffff, `writePma: record[${i}].rawFlags`), o + 4);
    } else if (!hasSemantic) {
      throw new Error(`writePma: record[${i}] requires rawFlags or hitDataIndex/hitWorkId/atkType`);
    } else {
      const hitDataIndex = assertIntRange(r.hitDataIndex ?? 0, -32768, 32767, `writePma: record[${i}].hitDataIndex`);
      const hitWorkId = assertIntRange(r.hitWorkId ?? 0, 0, 0xff, `writePma: record[${i}].hitWorkId`);
      const atkType = assertIntRange(r.atkType ?? 0, 0, 0xff, `writePma: record[${i}].atkType`);
      const packed = ((hitDataIndex & 0xffff) | (hitWorkId << 16) | (atkType << 24)) >>> 0;
      if (r.rawFlags !== undefined) {
        const raw = assertIntRange(r.rawFlags, 0, 0xffffffff, `writePma: record[${i}].rawFlags`);
        if (raw !== packed) {
          throw new Error(
            `writePma: record[${i}] rawFlags (${hex32(raw)}) conflicts with semantic fields (${hex32(packed)})`
          );
        }
      }
      out.writeUInt32LE(packed, o + 4);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUP\0 (0x496f8f22) - Weapon / common parameter table (ints, floats, vec3s)
// ---------------------------------------------------------------------------

/**
 * Parse a `FUP\0` (`0x496f8f22`) parameter container buffer.
 */
export function readFup(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < FUP_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for FUP header`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== FUP_MAGIC) {
    throw new Error(`${label}: bad FUP magic ${JSON.stringify(magic)} (expected "FUP\\0")`);
  }
  const version = buf.readUInt32LE(4);
  if (version !== FUP_VERSION) {
    throw new Error(`${label}: unsupported FUP version ${version} (expected ${FUP_VERSION})`);
  }
  const intCount = buf.readUInt32LE(8);
  const floatCount = buf.readUInt32LE(12);
  const vec3Count = buf.readUInt32LE(16);
  const expectedLen = FUP_HEADER_SIZE + intCount * 4 + floatCount * 4 + vec3Count * 12;
  if (buf.length !== expectedLen) {
    throw new Error(`${label}: FUP length ${buf.length} B != expected ${expectedLen} B`);
  }

  let off = FUP_HEADER_SIZE;
  const ints = [];
  for (let i = 0; i < intCount; i++) {
    ints.push(buf.readInt32LE(off));
    off += 4;
  }
  const floats = [];
  for (let i = 0; i < floatCount; i++) {
    floats.push(buf.readFloatLE(off));
    off += 4;
  }
  const vecs = [];
  for (let i = 0; i < vec3Count; i++) {
    vecs.push([buf.readFloatLE(off), buf.readFloatLE(off + 4), buf.readFloatLE(off + 8)]);
    off += 12;
  }
  return { format: 'FUP', version, intCount, floatCount, vec3Count, ints, floats, vecs };
}

/**
 * Serialize a parsed or constructed FUP model back to an exact `FUP\0` binary buffer.
 */
export function writeFup(model) {
  if (!model || typeof model !== 'object') {
    throw new Error('writeFup: model object is required');
  }
  const version = model.version ?? FUP_VERSION;
  if (version !== FUP_VERSION) {
    throw new Error(`writeFup: unsupported FUP version ${version}`);
  }
  const ints = model.ints ?? [];
  const floats = model.floats ?? [];
  const vecs = model.vecs ?? [];
  if (!Array.isArray(ints) || !Array.isArray(floats) || !Array.isArray(vecs)) {
    throw new Error('writeFup: ints, floats, and vecs must be arrays');
  }

  const out = Buffer.alloc(FUP_HEADER_SIZE + ints.length * 4 + floats.length * 4 + vecs.length * 12, 0);
  out.write(FUP_MAGIC, 0, 'latin1');
  out.writeUInt32LE(version >>> 0, 4);
  out.writeUInt32LE(ints.length >>> 0, 8);
  out.writeUInt32LE(floats.length >>> 0, 12);
  out.writeUInt32LE(vecs.length >>> 0, 16);

  let off = FUP_HEADER_SIZE;
  for (let i = 0; i < ints.length; i++) {
    out.writeInt32LE(assertIntRange(ints[i], -2147483648, 2147483647, `writeFup: ints[${i}]`), off);
    off += 4;
  }
  for (let i = 0; i < floats.length; i++) {
    out.writeFloatLE(floats[i], off);
    off += 4;
  }
  for (let i = 0; i < vecs.length; i++) {
    const v = vecs[i];
    out.writeFloatLE(v[0], off);
    out.writeFloatLE(v[1], off + 4);
    out.writeFloatLE(v[2], off + 8);
    off += 12;
  }
  return out;
}

// ---------------------------------------------------------------------------
// PSL\0 (0x254309c9) - rProofEffectMotSequenceList (VFX motion slots)
// ---------------------------------------------------------------------------

/**
 * Parse a `PSL\0` (`0x254309c9`) effect motion sequence list buffer (read-only).
 */
export function readPsl(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < PSL_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for PSL header`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== PSL_MAGIC) {
    throw new Error(`${label}: bad PSL magic ${JSON.stringify(magic)} (expected "PSL\\0")`);
  }
  const version = buf.readUInt16LE(4);
  if (version !== PSL_VERSION) {
    throw new Error(`${label}: unsupported PSL version ${version} (expected ${PSL_VERSION})`);
  }
  const count = buf.readUInt16LE(6);
  const tableEnd = PSL_HEADER_SIZE + count * 4;
  if (tableEnd > buf.length) {
    throw new Error(`${label}: PSL slot table truncated (need ${tableEnd} B, got ${buf.length} B)`);
  }

  const slots = [];
  let nonEmptyCount = 0;
  for (let i = 0; i < count; i++) {
    const entryOffset = buf.readUInt32LE(PSL_HEADER_SIZE + i * 4);
    if (entryOffset === 0) {
      slots.push(null);
      continue;
    }
    if (entryOffset < tableEnd) {
      throw new Error(`${label}: PSL slot[${i}] entry @${hex32(entryOffset)} overlaps header/table (< ${hex32(tableEnd)})`);
    }
    if (entryOffset + PSL_ENTRY_SIZE > buf.length) {
      throw new Error(`${label}: PSL slot[${i}] entry @${hex32(entryOffset)} out of bounds (${buf.length} B)`);
    }
    nonEmptyCount++;
    const frameCount = buf.readUInt32LE(entryOffset + 0x00);
    const param4 = buf.readUInt16LE(entryOffset + 0x04);
    const param6 = buf.readUInt8(entryOffset + 0x06);
    const flags = buf.readUInt8(entryOffset + 0x07);
    const subOffset = buf.readUInt32LE(entryOffset + 0x08);
    const reserved = buf.readUInt32LE(entryOffset + 0x0c);
    const skipTimelineFlag2 = (flags & 2) !== 0;

    let sub = null;
    if (subOffset !== 0) {
      const minSubSize = skipTimelineFlag2 ? PSL_SUB_HEADER_SIZE : PSL_SUB_HEADER_SIZE + 4;
      if (subOffset < tableEnd) {
        throw new Error(`${label}: PSL slot[${i}] sub @${hex32(subOffset)} overlaps header/table (< ${hex32(tableEnd)})`);
      }
      if (subOffset + minSubSize > buf.length) {
        throw new Error(`${label}: PSL slot[${i}] sub @${hex32(subOffset)} out of bounds (${buf.length} B)`);
      }
      const channelFlags = buf.readUInt32LE(subOffset + 0x00);
      const uniqueIds = [];
      if (channelFlags !== 0 && channelFlags !== 0xffffffff) {
        for (let ch = 0; ch < 32; ch++) {
          if (((channelFlags >>> ch) & 1) !== 0) {
            const uidOff = subOffset + 4 + ch * 2;
            if (uidOff + 2 <= subOffset + 0x144) {
              uniqueIds.push({ channel: ch, uniqueId: buf.readUInt16LE(uidOff) });
            }
          }
        }
      }

      const timelineCount = buf.readUInt32LE(subOffset + 0x144);
      let timelineOffset = null;
      let timeline = null;
      if (!skipTimelineFlag2) {
        timelineOffset = buf.readUInt32LE(subOffset + 0x148);
        if (timelineOffset > buf.length) {
          throw new Error(`${label}: PSL slot[${i}] +0x148 timelineOffset ${hex32(timelineOffset)} out of bounds (${buf.length} B)`);
        }
        if (timelineCount > 0) {
          if (timelineOffset < tableEnd) {
            throw new Error(
              `${label}: PSL slot[${i}] +0x148 timeline @${hex32(timelineOffset)} overlaps header/table (< ${hex32(tableEnd)})`
            );
          }
          if (timelineOffset + timelineCount * 8 > buf.length) {
            throw new Error(
              `${label}: PSL slot[${i}] +0x148 timeline @${hex32(timelineOffset)} (${timelineCount} entries) out of bounds (${buf.length} B)`
            );
          }
          timeline = [];
          let frame = 0;
          for (let k = 0; k < timelineCount; k++) {
            const pos = timelineOffset + k * 8;
            const mask = buf.readUInt32LE(pos);
            const duration = buf.readUInt32LE(pos + 4);
            timeline.push({ index: k, startFrame: frame, duration, endFrame: frame + duration, mask });
            frame += duration;
          }
        } else {
          timeline = [];
        }
      }

      sub = {
        subOffset,
        channelFlags,
        uniqueIds,
        timelineCount,
        timelineOffset,
        timeline,
      };
    }

    slots.push({
      slot: i,
      entryOffset,
      frameCount,
      param4,
      param6,
      flags,
      skipTimelineFlag2,
      subOffset,
      reserved,
      sub,
    });
  }

  return { format: 'PSL', version, count, nonEmptyCount, slots };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node tools/mhgu/player-combat.mjs <hts|pma|fup|psl> <file>');
  process.exit(2);
}

function main(argv) {
  if (argv.length !== 2) usage(argv.length === 0 ? null : 'expected exactly <cmd> <file>');
  const [cmd, file] = argv;
  if (cmd.startsWith('-') || file.startsWith('-')) usage(`unexpected option`);
  const readers = { hts: readHts, pma: readPma, fup: readFup, psl: readPsl };
  const reader = readers[cmd];
  if (!reader) usage(`unknown command ${JSON.stringify(cmd)}`);
  const buf = fs.readFileSync(file);
  console.log(JSON.stringify(reader(buf, file), null, 2));
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR ${err.message}`);
    process.exit(1);
  }
}
