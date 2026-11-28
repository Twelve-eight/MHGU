// Clean-room MHGU parsers, serializers, and semantic diff helpers for:
//   - `GUI\0` (`rGUI`, typeHash 0x22948394, version 0x00022715)
//   - `MSS\0` (`rFestaSoundSequence`, typeHash 0x10ebe843, version 0x20131015)
// Derived from raw binary containers and main 1.4.0 ARM32 loaders (`0xb7f380`/`0xb7f988` and `0x4d9bec`/`0x4d9dbc`..`0x4d9e8c`).
// Zero external dependencies; MIT clean-room implementation.
//
// Usage:
//   node tools/mhgu/gui-mss.mjs gui <file> [--json]
//   node tools/mhgu/gui-mss.mjs mss <file> [--json]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TYPE_GUI = 0x22948394;
export const TYPE_MSS = 0x10ebe843;

export const GUI_MAGIC = 'GUI\0';
export const GUI_VERSION = 0x00022715;
export const GUI_HEADER_SIZE = 0x130; // 304 bytes
export const GUI_SEQ_STRIDE = 24;
export const GUI_SEQ_ITEM_STRIDE = 12;
export const GUI_OBJECT_STRIDE = 36;
export const GUI_KEYFRAME_STRIDE = 16;
export const GUI_PARAM_STRIDE = 20;
export const GUI_EXT_PARAM_STRIDE = 24;
export const GUI_FONT_STRIDE = 64;
export const GUI_MSG_STRIDE = 12;
export const GUI_TEX_STRIDE = 12;
export const GUI_ICON_STRIDE = 12;
export const GUI_FILTER_STRIDE = 16;
export const GUI_ACTION_STRIDE = 8;

export const MSS_MAGIC = 'MSS\0';
export const MSS_VERSION = 0x20131015;
export const MSS_HEADER_SIZE = 0x10;
export const MSS_LUT_SLOTS = 512;
export const MSS_DIR_START = MSS_HEADER_SIZE + MSS_LUT_SLOTS * 2; // 0x410 (1040 bytes)
export const MSS_SEQ_HEADER_SIZE = 0x10;

const hex32 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');

function asBuffer(input) {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

function readCStringAt(buf, offset, limit = buf.length) {
  if (offset < 0 || offset >= limit) return '';
  let end = offset;
  while (end < limit && buf[end] !== 0) end++;
  return buf.toString('latin1', offset, end);
}

// ---------------------------------------------------------------------------
// rGUI (`GUI\0`, 0x22948394, v0x00022715)
// ---------------------------------------------------------------------------

/**
 * Parse an MHGU `GUI\0` (`rGUI`) buffer into structured header metadata, layout objects,
 * sequences, parameters, and string table entries while preserving lossless round-trip body bytes.
 */
export function parseGui(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < GUI_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for GUI header (need ${GUI_HEADER_SIZE} B)`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== GUI_MAGIC) {
    throw new Error(`${label}: bad GUI magic ${JSON.stringify(magic)} (expected "GUI\\0")`);
  }
  const version = buf.readUInt32LE(0x04);
  if (version !== GUI_VERSION) {
    throw new Error(`${label}: unsupported GUI version ${hex32(version)} (expected ${hex32(GUI_VERSION)})`);
  }
  const fileSize = buf.readUInt32LE(0x08);
  if (fileSize !== buf.length) {
    throw new Error(`${label}: GUI header fileSize ${fileSize} != buffer length ${buf.length}`);
  }

  const flags0 = buf.readUInt32LE(0x0c);
  const timestamp = buf.readUInt32LE(0x10);
  const reserved14 = buf.readUInt32LE(0x14);

  const countsRaw = [];
  for (let o = 0x18; o < 0x94; o += 4) countsRaw.push(buf.readUInt32LE(o));

  const guiFlags = buf.readUInt32LE(0x94);
  const screenWidth = buf.readUInt32LE(0x98);
  const screenHeight = buf.readUInt32LE(0x9c);
  const rootIndex = buf.readUInt32LE(0xa0);

  const offsetsRaw = [];
  for (let o = 0xa4; o < GUI_HEADER_SIZE; o += 4) offsetsRaw.push(buf.readUInt32LE(o));

  const sequencesOffset = buf.readUInt32LE(0xa4);
  const seqItemsOffset = buf.readUInt32LE(0xa8);
  const objectsOffset = buf.readUInt32LE(0xac);
  const keyframesOffset = buf.readUInt32LE(0xb0);
  const paramsOffset = buf.readUInt32LE(0xb4);
  const extParamsOffset = buf.readUInt32LE(0xb8);
  const fontsOffset = buf.readUInt32LE(0xe8);
  const messagesOffset = buf.readUInt32LE(0xec);
  const childGuisOffset = buf.readUInt32LE(0xf0);
  const texturesOffset = buf.readUInt32LE(0xf4);
  const iconsOffset = buf.readUInt32LE(0xf8);
  const filtersOffset = buf.readUInt32LE(0xfc);
  const stringTableOffset = buf.readUInt32LE(0x104);
  const actionsOffset = buf.readUInt32LE(0x108);
  const curveTableAOffset = buf.readUInt32LE(0x10c);
  const curveTableBOffset = buf.readUInt32LE(0x110);
  const floatPoolOffset = buf.readUInt32LE(0x114);
  const stringPoolOffset = buf.readUInt32LE(0x118);
  const extraExtParamCount = buf.readUInt32LE(0x11c);
  const eofOffset = buf.readUInt32LE(0x120);

  // Offset slots (everything in [0xa4..0x120] except 0x11c which is a count per 0xb7fc48)
  for (let o = 0xa4; o <= 0x120; o += 4) {
    if (o === 0x11c) continue;
    const val = buf.readUInt32LE(o);
    if (val > buf.length) {
      throw new Error(`${label}: GUI header offset +0x${o.toString(16)} (${hex32(val)}) exceeds buffer length ${buf.length}`);
    }
  }

  const counts = {
    totalProps: buf.readUInt32LE(0x18),
    sequenceCount: buf.readUInt32LE(0x28),
    seqItemCount: buf.readUInt32LE(0x2c),
    objectCount: buf.readUInt32LE(0x30),
    keyframeCount: buf.readUInt32LE(0x34),
    paramCount: buf.readUInt32LE(0x38),
    extParamCount: buf.readUInt32LE(0x3c),
    actionCount: buf.readUInt32LE(0x40),
    fontCount: buf.readUInt32LE(0x70),
    messageCount: buf.readUInt32LE(0x74),
    childGuiCount: buf.readUInt32LE(0x78),
    textureCount: buf.readUInt32LE(0x7c),
    iconCount: buf.readUInt32LE(0x80),
    filterCount: buf.readUInt32LE(0x84),
    extraExtParamCount,
  };

  function assertTableBounds(name, off, count, stride) {
    if (count === 0 || off === 0) return;
    if (off < GUI_HEADER_SIZE || off + count * stride > buf.length) {
      throw new Error(`${label}: GUI ${name} table [0x${off.toString(16)}, 0x${(off + count * stride).toString(16)}) out of bounds (${buf.length} B)`);
    }
  }

  assertTableBounds('sequences', sequencesOffset, counts.sequenceCount, GUI_SEQ_STRIDE);
  assertTableBounds('seqItems', seqItemsOffset, counts.seqItemCount, GUI_SEQ_ITEM_STRIDE);
  assertTableBounds('objects', objectsOffset, counts.objectCount, GUI_OBJECT_STRIDE);
  assertTableBounds('keyframes', keyframesOffset, counts.keyframeCount, GUI_KEYFRAME_STRIDE);
  assertTableBounds('params', paramsOffset, counts.paramCount, GUI_PARAM_STRIDE);
  assertTableBounds('extParams', extParamsOffset, counts.extParamCount, GUI_EXT_PARAM_STRIDE);
  assertTableBounds('fonts', fontsOffset, counts.fontCount, GUI_FONT_STRIDE);
  assertTableBounds('messages', messagesOffset, counts.messageCount, GUI_MSG_STRIDE);
  assertTableBounds('textures', texturesOffset, counts.textureCount, GUI_TEX_STRIDE);
  assertTableBounds('icons', iconsOffset, counts.iconCount, GUI_ICON_STRIDE);
  assertTableBounds('filters', filtersOffset, counts.filterCount, GUI_FILTER_STRIDE);
  assertTableBounds('actions', actionsOffset, counts.actionCount, GUI_ACTION_STRIDE);

  const strBase = stringTableOffset || stringPoolOffset || buf.length;
  const strEnd = eofOffset || buf.length;

  const sequences = [];
  if (sequencesOffset && counts.sequenceCount > 0) {
    for (let i = 0; i < counts.sequenceCount; i++) {
      const o = sequencesOffset + i * GUI_SEQ_STRIDE;
      const nameOffset = buf.readUInt32LE(o + 16);
      sequences.push({
        index: i,
        raw0: buf.readUInt32LE(o + 0),
        itemCount: buf.readUInt16LE(o + 4),
        flags: buf.readUInt16LE(o + 6),
        raw8: buf.readUInt32LE(o + 8),
        objectIndex: buf.readUInt32LE(o + 12),
        nameOffset,
        name: readCStringAt(buf, strBase + nameOffset, strEnd),
        seqItemIndex: buf.readUInt32LE(o + 20),
      });
    }
  }

  const seqItems = [];
  if (seqItemsOffset && counts.seqItemCount > 0) {
    for (let i = 0; i < counts.seqItemCount; i++) {
      const o = seqItemsOffset + i * GUI_SEQ_ITEM_STRIDE;
      const nameOffset = buf.readUInt32LE(o + 8);
      seqItems.push({
        index: i,
        u0: buf.readUInt32LE(o + 0),
        u1: buf.readUInt32LE(o + 4),
        nameOffset,
        name: readCStringAt(buf, strBase + nameOffset, strEnd),
      });
    }
  }

  const objects = [];
  if (objectsOffset && counts.objectCount > 0) {
    for (let i = 0; i < counts.objectCount; i++) {
      const o = objectsOffset + i * GUI_OBJECT_STRIDE;
      const nameOffset = buf.readUInt32LE(o + 16);
      objects.push({
        index: i,
        raw0: buf.readUInt32LE(o + 0),
        paramCount: buf[o + 4],
        flags: buf.readUInt32LE(o + 4) >>> 8,
        raw8: buf.readUInt32LE(o + 8),
        raw12: buf.readUInt32LE(o + 12),
        nameOffset,
        name: readCStringAt(buf, strBase + nameOffset, strEnd),
        typeId: buf.readUInt32LE(o + 20),
        paramIndex: buf.readUInt32LE(o + 24),
        keyframeIndex: buf.readUInt32LE(o + 28),
        extOffset: buf.readInt32LE(o + 32),
      });
    }
  }

  const params = [];
  if (paramsOffset && counts.paramCount > 0) {
    for (let i = 0; i < counts.paramCount; i++) {
      const o = paramsOffset + i * GUI_PARAM_STRIDE;
      const nameOffset = buf.readUInt32LE(o + 16);
      params.push({
        index: i,
        raw0: buf.readUInt32LE(o + 0),
        raw4: buf.readUInt32LE(o + 4),
        kind: buf[o + 8],
        raw12: buf.readUInt32LE(o + 12),
        nameOffset,
        name: readCStringAt(buf, strBase + nameOffset, strEnd),
      });
    }
  }

  const strings = [];
  if (strBase >= GUI_HEADER_SIZE && strBase < strEnd) {
    let cur = strBase;
    while (cur < strEnd) {
      let end = cur;
      while (end < strEnd && buf[end] !== 0) end++;
      if (end > cur) {
        const text = buf.toString('latin1', cur, end);
        strings.push({ offset: cur - strBase, text });
      }
      cur = end + 1;
    }
  }

  return {
    format: 'GUI',
    version,
    fileSize,
    flags0,
    timestamp,
    reserved14,
    guiFlags,
    screenWidth,
    screenHeight,
    rootIndex,
    counts,
    countsRaw,
    offsetsRaw,
    sectionOffsets: {
      sequencesOffset,
      seqItemsOffset,
      objectsOffset,
      keyframesOffset,
      paramsOffset,
      extParamsOffset,
      fontsOffset,
      messagesOffset,
      childGuisOffset,
      texturesOffset,
      iconsOffset,
      filtersOffset,
      stringTableOffset,
      actionsOffset,
      curveTableAOffset,
      curveTableBOffset,
      floatPoolOffset,
      stringPoolOffset,
      eofOffset,
    },
    sequences,
    seqItems,
    objects,
    params,
    strings,
    bodyBytes: Buffer.from(buf.subarray(GUI_HEADER_SIZE)),
  };
}

/**
 * Serialize a parsed or synthetic `rGUI` document into a `GUI\0` v0x00022715 binary buffer.
 */
export function serializeGui(doc) {
  if (!doc || typeof doc !== 'object') throw new TypeError('serializeGui: doc must be an object');
  if (doc.bodyBytes) {
    const body = asBuffer(doc.bodyBytes);
    const totalSize = GUI_HEADER_SIZE + body.length;
    const out = Buffer.alloc(totalSize, 0);
    out.write(GUI_MAGIC, 0, 'latin1');
    out.writeUInt32LE((doc.version ?? GUI_VERSION) >>> 0, 0x04);
    out.writeUInt32LE(totalSize >>> 0, 0x08);
    out.writeUInt32LE((doc.flags0 ?? 0) >>> 0, 0x0c);
    out.writeUInt32LE((doc.timestamp ?? 0) >>> 0, 0x10);
    out.writeUInt32LE((doc.reserved14 ?? 0) >>> 0, 0x14);
    if (Array.isArray(doc.countsRaw)) {
      for (let i = 0; i < doc.countsRaw.length && 0x18 + i * 4 < 0x94; i++) {
        out.writeUInt32LE(doc.countsRaw[i] >>> 0, 0x18 + i * 4);
      }
    }
    out.writeUInt32LE((doc.guiFlags ?? 0) >>> 0, 0x94);
    out.writeUInt32LE((doc.screenWidth ?? 1280) >>> 0, 0x98);
    out.writeUInt32LE((doc.screenHeight ?? 720) >>> 0, 0x9c);
    out.writeUInt32LE((doc.rootIndex ?? 0) >>> 0, 0xa0);
    if (Array.isArray(doc.offsetsRaw)) {
      for (let i = 0; i < doc.offsetsRaw.length && 0xa4 + i * 4 < GUI_HEADER_SIZE; i++) {
        out.writeUInt32LE(doc.offsetsRaw[i] >>> 0, 0xa4 + i * 4);
      }
    }
    out.writeUInt32LE(totalSize >>> 0, 0x120);
    body.copy(out, GUI_HEADER_SIZE);
    return out;
  }

  // Synthetic builder path when `bodyBytes` is omitted
  const objects = Array.isArray(doc.objects) ? doc.objects : [];
  const stringsList = Array.isArray(doc.strings) ? doc.strings : [];
  const strChunks = [];
  const strOffsetMap = new Map();
  let strCursor = 0;
  const intern = s => {
    const text = String(s ?? '');
    if (strOffsetMap.has(text)) return strOffsetMap.get(text);
    const off = strCursor;
    const b = Buffer.from(`${text}\0`, 'latin1');
    strChunks.push(b);
    strOffsetMap.set(text, off);
    strCursor += b.length;
    return off;
  };
  for (const obj of objects) intern(obj.name ?? `Obj_${obj.index ?? 0}`);
  for (const s of stringsList) intern(typeof s === 'string' ? s : s.text);
  const strBuf = strChunks.length ? Buffer.concat(strChunks) : Buffer.from('\0', 'latin1');

  const objectsOffset = GUI_HEADER_SIZE;
  const objectsLen = objects.length * GUI_OBJECT_STRIDE;
  const stringTableOffset = objectsOffset + objectsLen;
  const totalSize = stringTableOffset + strBuf.length;

  const out = Buffer.alloc(totalSize, 0);
  out.write(GUI_MAGIC, 0, 'latin1');
  out.writeUInt32LE((doc.version ?? GUI_VERSION) >>> 0, 0x04);
  out.writeUInt32LE(totalSize >>> 0, 0x08);
  out.writeUInt32LE((doc.flags0 ?? 0) >>> 0, 0x0c);
  out.writeUInt32LE((doc.timestamp ?? 0) >>> 0, 0x10);
  out.writeUInt32LE((doc.reserved14 ?? 0) >>> 0, 0x14);
  out.writeUInt32LE(objects.length >>> 0, 0x30);
  out.writeUInt32LE((doc.guiFlags ?? 1) >>> 0, 0x94);
  out.writeUInt32LE((doc.screenWidth ?? 1280) >>> 0, 0x98);
  out.writeUInt32LE((doc.screenHeight ?? 720) >>> 0, 0x9c);
  out.writeUInt32LE((doc.rootIndex ?? 0) >>> 0, 0xa0);
  out.writeUInt32LE(objects.length ? objectsOffset : 0, 0xac);
  out.writeUInt32LE(stringTableOffset, 0x104);
  out.writeUInt32LE(stringTableOffset, 0x118);
  out.writeUInt32LE(totalSize, 0x120);

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const o = objectsOffset + i * GUI_OBJECT_STRIDE;
    out.writeUInt32LE((obj.raw0 ?? 0) >>> 0, o + 0);
    out[o + 4] = (obj.paramCount ?? 0) & 0xff;
    out.writeUInt32LE((obj.raw8 ?? 0) >>> 0, o + 8);
    out.writeUInt32LE((obj.raw12 ?? 0) >>> 0, o + 12);
    out.writeUInt32LE(intern(obj.name ?? `Obj_${i}`) >>> 0, o + 16);
    out.writeUInt32LE((obj.typeId ?? 0) >>> 0, o + 20);
    out.writeUInt32LE((obj.paramIndex ?? 0) >>> 0, o + 24);
    out.writeUInt32LE((obj.keyframeIndex ?? 0) >>> 0, o + 28);
    out.writeInt32LE(obj.extOffset ?? -1, o + 32);
  }
  strBuf.copy(out, stringTableOffset);
  return out;
}

/**
 * Compute a semantic diff between two `GUI\0` buffers (resolution, flags, counts, objects, strings).
 */
export function summarizeGuiDiff(baseBuf, modBuf) {
  const a = parseGui(baseBuf, 'base.gui');
  const b = parseGui(modBuf, 'mod.gui');

  const changedHeader = {};
  for (const k of ['screenWidth', 'screenHeight', 'guiFlags', 'rootIndex', 'timestamp']) {
    if (a[k] !== b[k]) changedHeader[k] = [a[k], b[k]];
  }

  const changedCounts = {};
  for (const k of Object.keys(a.counts)) {
    if (a.counts[k] !== b.counts[k]) changedCounts[k] = [a.counts[k], b.counts[k]];
  }

  const objMapA = new Map(a.objects.map(o => [`${o.index}:${o.name}`, o]));
  const objMapB = new Map(b.objects.map(o => [`${o.index}:${o.name}`, o]));
  const addedObjects = [];
  const removedObjects = [];
  const changedObjects = [];

  for (const [key, oa] of objMapA) {
    const ob = objMapB.get(key);
    if (!ob) {
      removedObjects.push({ index: oa.index, name: oa.name, typeId: oa.typeId });
      continue;
    }
    if (oa.typeId !== ob.typeId || oa.paramCount !== ob.paramCount || oa.raw0 !== ob.raw0) {
      changedObjects.push({
        index: oa.index,
        name: oa.name,
        typeId: oa.typeId !== ob.typeId ? [oa.typeId, ob.typeId] : undefined,
        paramCount: oa.paramCount !== ob.paramCount ? [oa.paramCount, ob.paramCount] : undefined,
      });
    }
  }
  for (const [key, ob] of objMapB) {
    if (!objMapA.has(key)) addedObjects.push({ index: ob.index, name: ob.name, typeId: ob.typeId });
  }

  const strA = new Set(a.strings.map(s => s.text));
  const strB = new Set(b.strings.map(s => s.text));
  const addedStrings = [...strB].filter(s => !strA.has(s));
  const removedStrings = [...strA].filter(s => !strB.has(s));

  return {
    baseSize: a.fileSize,
    modSize: b.fileSize,
    baseResolution: `${a.screenWidth}x${a.screenHeight}`,
    modResolution: `${b.screenWidth}x${b.screenHeight}`,
    baseObjectCount: a.counts.objectCount,
    modObjectCount: b.counts.objectCount,
    changedHeader,
    changedCounts,
    addedObjects,
    removedObjects,
    changedObjects,
    addedStrings,
    removedStrings,
    changedObjectCount: addedObjects.length + removedObjects.length + changedObjects.length,
  };
}

// ---------------------------------------------------------------------------
// rFestaSoundSequence (`MSS\0`, 0x10ebe843, v0x20131015)
// ---------------------------------------------------------------------------

// Observed arg-code byte widths in `pl_wpNN` call parameter payloads:
//   1 -> u8 (1 B), 2 -> u8 (1 B), 3 -> u16 (2 B), 6 -> u16 (2 B), 7 -> u32 (4 B), 11 -> u32 (4 B)
const MSS_ARG_WIDTH = new Map([
  [1, 1],
  [2, 1],
  [3, 2],
  [6, 2],
  [7, 4],
  [11, 4],
]);

function decodeMssParams(args, rawParams) {
  let expected = 0;
  for (const code of args) {
    const w = MSS_ARG_WIDTH.get(code);
    if (!w) return null;
    expected += w;
  }
  if (expected !== rawParams.length) return null;
  const out = [];
  let pos = 0;
  for (const code of args) {
    const w = MSS_ARG_WIDTH.get(code);
    let value;
    if (w === 1) value = rawParams[pos];
    else if (w === 2) value = rawParams.readUInt16LE(pos);
    else value = rawParams.readUInt32LE(pos);
    out.push({ code, width: w, value });
    pos += w;
  }
  return out;
}

function encodeMssParams(params) {
  let total = 0;
  for (const p of params) total += p.width;
  const out = Buffer.alloc(total);
  let pos = 0;
  for (const p of params) {
    if (p.width === 1) out[pos] = p.value & 0xff;
    else if (p.width === 2) out.writeUInt16LE(p.value & 0xffff, pos);
    else out.writeUInt32LE(p.value >>> 0, pos);
    pos += p.width;
  }
  return out;
}

/**
 * Parse an MHGU `MSS\0` (`rFestaSoundSequence`) buffer into structured motion-slot mappings,
 * frame groups, and sound-call records.
 */
export function parseMss(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < MSS_DIR_START) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for MSS header + 512-slot LUT (need ${MSS_DIR_START} B)`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== MSS_MAGIC) {
    throw new Error(`${label}: bad MSS magic ${JSON.stringify(magic)} (expected "MSS\\0")`);
  }
  const version = buf.readUInt32LE(0x04);
  if (version !== MSS_VERSION) {
    throw new Error(`${label}: unsupported MSS version ${hex32(version)} (expected ${hex32(MSS_VERSION)})`);
  }
  const seqCount = buf.readUInt16LE(0x08);
  const slotCount = buf.readUInt16LE(0x0a);
  const reserved = buf.readUInt32LE(0x0c);

  const dirEnd = MSS_DIR_START + seqCount * 8;
  if (dirEnd > buf.length) {
    throw new Error(`${label}: MSS directory truncated (need ${dirEnd} B, got ${buf.length} B)`);
  }

  const motionToSeq = [];
  for (let i = 0; i < MSS_LUT_SLOTS; i++) {
    motionToSeq.push(buf.readUInt16LE(MSS_HEADER_SIZE + i * 2));
  }

  const dirEntries = [];
  for (let i = 0; i < seqCount; i++) {
    const o = MSS_DIR_START + i * 8;
    const motionId = buf.readUInt32LE(o);
    const seqOffset = buf.readUInt32LE(o + 4);
    if (seqOffset < dirEnd || seqOffset + MSS_SEQ_HEADER_SIZE > buf.length) {
      throw new Error(`${label}: MSS dir[${i}] (motionId=${motionId}) seqOffset ${hex32(seqOffset)} out of bounds (${buf.length} B)`);
    }
    dirEntries.push({ index: i, motionId, seqOffset });
  }

  // Compute each sequence's byte span from sorted unique offsets
  const sortedOffsets = [...new Set(dirEntries.map(d => d.seqOffset))].sort((a, b) => a - b);
  const seqEndByOffset = new Map();
  for (let i = 0; i < sortedOffsets.length; i++) {
    seqEndByOffset.set(sortedOffsets[i], i + 1 < sortedOffsets.length ? sortedOffsets[i + 1] : buf.length);
  }

  const sequences = dirEntries.map((ent, idx) => {
    const base = ent.seqOffset;
    const seqEnd = seqEndByOffset.get(base);
    const motionId = buf.readUInt32LE(base + 0x00);
    const frameGroupCount = buf.readUInt16LE(base + 0x04);
    const maxFrame = buf.readUInt16LE(base + 0x06);
    const flags = buf.readInt32LE(base + 0x08);
    const tailOffset = buf.readUInt32LE(base + 0x0c);

    const frameDirEnd = MSS_SEQ_HEADER_SIZE + frameGroupCount * 8;
    if (base + frameDirEnd > seqEnd) {
      throw new Error(`${label}: MSS seq[${idx}] frame directory exceeds sequence span`);
    }
    if (tailOffset < MSS_SEQ_HEADER_SIZE || base + tailOffset + 4 > seqEnd) {
      throw new Error(`${label}: MSS seq[${idx}] tailOffset ${hex32(tailOffset)} out of sequence span`);
    }
    const tailSentinel = buf.readUInt32LE(base + tailOffset);

    const groupRefs = [];
    for (let g = 0; g < frameGroupCount; g++) {
      const go = base + MSS_SEQ_HEADER_SIZE + g * 8;
      const frame = buf.readUInt32LE(go);
      const groupRelOffset = buf.readUInt32LE(go + 4);
      if (base + groupRelOffset + 4 > seqEnd) {
        throw new Error(`${label}: MSS seq[${idx}] group[${g}] relOffset ${hex32(groupRelOffset)} out of bounds`);
      }
      groupRefs.push({ index: g, frame, groupRelOffset });
    }

    const sortedGroupRels = [...new Set(groupRefs.map(g => g.groupRelOffset))].sort((a, b) => a - b);
    const groupEndByRel = new Map();
    for (let i = 0; i < sortedGroupRels.length; i++) {
      groupEndByRel.set(sortedGroupRels[i], i + 1 < sortedGroupRels.length ? base + sortedGroupRels[i + 1] : seqEnd);
    }

    const frameGroups = groupRefs.map(gr => {
      const gStart = base + gr.groupRelOffset;
      const gEnd = groupEndByRel.get(gr.groupRelOffset);
      const groupFrame = buf.readUInt16LE(gStart + 0);
      const callCount = buf.readUInt16LE(gStart + 2);
      if (gStart + 4 + callCount * 4 > gEnd) {
        throw new Error(`${label}: MSS seq[${idx}] group[${gr.index}] call offsets exceed group bounds`);
      }
      const callRels = [];
      for (let c = 0; c < callCount; c++) {
        const rel = buf.readUInt32LE(gStart + 4 + c * 4);
        if (gStart + rel + 4 > gEnd) {
          throw new Error(`${label}: MSS seq[${idx}] group[${gr.index}] call[${c}] relOffset ${hex32(rel)} out of bounds`);
        }
        callRels.push(rel);
      }

      const sortedCallRels = [...new Set(callRels)].sort((a, b) => a - b);
      const callEndByRel = new Map();
      for (let i = 0; i < sortedCallRels.length; i++) {
        callEndByRel.set(sortedCallRels[i], i + 1 < sortedCallRels.length ? gStart + sortedCallRels[i + 1] : gEnd);
      }

      const calls = callRels.map((rel, cIdx) => {
        const cStart = gStart + rel;
        const cEnd = callEndByRel.get(rel);
        const soundId = buf.readUInt16LE(cStart + 0);
        const argCount = buf[cStart + 2];
        const callFlags = buf[cStart + 3];
        const argsEnd = cStart + 4 + argCount * 4;
        if (argsEnd > cEnd) {
          throw new Error(`${label}: MSS seq[${idx}] group[${gr.index}] call[${cIdx}] argCount=${argCount} exceeds call span`);
        }
        const args = [];
        for (let a = 0; a < argCount; a++) args.push(buf.readUInt32LE(cStart + 4 + a * 4));
        const rawParams = Buffer.from(buf.subarray(argsEnd, cEnd));
        const params = decodeMssParams(args, rawParams);
        return {
          index: cIdx,
          callRelOffset: rel,
          soundId,
          argCount,
          callFlags,
          args,
          params,
          rawParamsHex: rawParams.toString('hex'),
        };
      });

      return {
        index: gr.index,
        frame: gr.frame,
        groupFrame,
        groupRelOffset: gr.groupRelOffset,
        callCount,
        calls,
      };
    });

    // Check whether sequence layout is strictly canonical/packed for pure structural serialization
    let packed = ent.seqOffset === (idx === 0 ? dirEnd : dirEntries[idx - 1].seqOffset + (seqEndByOffset.get(dirEntries[idx - 1].seqOffset) - dirEntries[idx - 1].seqOffset));
    if (tailOffset !== frameDirEnd) packed = false;
    let cursor = base + tailOffset + 4;
    for (const fg of frameGroups) {
      if (base + fg.groupRelOffset !== cursor) { packed = false; break; }
      let cCursor = cursor + 4 + fg.calls.length * 4;
      for (const c of fg.calls) {
        if (cursor + c.callRelOffset !== cCursor) { packed = false; break; }
        cCursor += 4 + c.args.length * 4 + (c.rawParamsHex.length / 2);
      }
      if (!packed) break;
      cursor = cCursor;
    }
    if (cursor !== seqEnd) packed = false;

    return {
      index: idx,
      motionId,
      seqOffset: ent.seqOffset,
      maxFrame,
      flags,
      tailOffset,
      tailSentinel,
      frameGroups,
      rawSeqBytes: packed ? undefined : Buffer.from(buf.subarray(base, seqEnd)),
    };
  });

  return {
    format: 'MSS',
    version,
    seqCount,
    slotCount,
    reserved,
    motionToSeq,
    sequences,
  };
}

function serializeMssSequence(seq) {
  if (seq.rawSeqBytes) return asBuffer(seq.rawSeqBytes);
  const frameGroups = seq.frameGroups ?? [];
  const headerSize = MSS_SEQ_HEADER_SIZE + frameGroups.length * 8;
  const tailOffset = headerSize;

  const groupBufs = [];
  const groupRels = [];
  let cursor = tailOffset + 4;

  for (const fg of frameGroups) {
    groupRels.push(cursor);
    const calls = fg.calls ?? [];
    const callBufs = [];
    const callRels = [];
    let cCursor = 4 + calls.length * 4;
    for (const c of calls) {
      callRels.push(cCursor);
      const args = c.args ?? (Array.isArray(c.params) ? c.params.map(p => p.code) : []);
      let paramBuf;
      if (Array.isArray(c.params) && c.params.length === args.length) {
        paramBuf = encodeMssParams(c.params);
      } else if (typeof c.rawParamsHex === 'string' && c.rawParamsHex.length > 0) {
        paramBuf = Buffer.from(c.rawParamsHex, 'hex');
      } else {
        paramBuf = Buffer.alloc(0);
      }
      const cb = Buffer.alloc(4 + args.length * 4 + paramBuf.length);
      cb.writeUInt16LE(c.soundId & 0xffff, 0);
      cb[2] = args.length & 0xff;
      cb[3] = (c.callFlags ?? 0) & 0xff;
      for (let a = 0; a < args.length; a++) cb.writeUInt32LE(args[a] >>> 0, 4 + a * 4);
      paramBuf.copy(cb, 4 + args.length * 4);
      callBufs.push(cb);
      cCursor += cb.length;
    }

    const gHeader = Buffer.alloc(4 + calls.length * 4);
    gHeader.writeUInt16LE((fg.groupFrame ?? fg.frame) & 0xffff, 0);
    gHeader.writeUInt16LE(calls.length & 0xffff, 2);
    for (let i = 0; i < callRels.length; i++) gHeader.writeUInt32LE(callRels[i] >>> 0, 4 + i * 4);
    const gb = Buffer.concat([gHeader, ...callBufs]);
    groupBufs.push(gb);
    cursor += gb.length;
  }

  const seqHdr = Buffer.alloc(tailOffset + 4);
  seqHdr.writeUInt32LE(seq.motionId >>> 0, 0x00);
  seqHdr.writeUInt16LE(frameGroups.length & 0xffff, 0x04);
  seqHdr.writeUInt16LE((seq.maxFrame ?? 0) & 0xffff, 0x06);
  seqHdr.writeInt32LE(seq.flags ?? -1, 0x08);
  seqHdr.writeUInt32LE(tailOffset >>> 0, 0x0c);
  for (let i = 0; i < frameGroups.length; i++) {
    const o = MSS_SEQ_HEADER_SIZE + i * 8;
    seqHdr.writeUInt32LE(frameGroups[i].frame >>> 0, o);
    seqHdr.writeUInt32LE(groupRels[i] >>> 0, o + 4);
  }
  seqHdr.writeUInt32LE((seq.tailSentinel ?? 0x0000ffff) >>> 0, tailOffset);
  return Buffer.concat([seqHdr, ...groupBufs]);
}

/**
 * Serialize a structured `MSS\0` document back into a valid `MSS\0` v0x20131015 buffer.
 */
export function serializeMss(doc) {
  if (!doc || typeof doc !== 'object') throw new TypeError('serializeMss: doc must be an object');
  const sequences = doc.sequences ?? [];
  const motionToSeq = doc.motionToSeq ?? new Array(MSS_LUT_SLOTS).fill(0xffff);
  if (motionToSeq.length !== MSS_LUT_SLOTS) {
    throw new RangeError(`serializeMss: motionToSeq must have ${MSS_LUT_SLOTS} entries, got ${motionToSeq.length}`);
  }

  const dirEnd = MSS_DIR_START + sequences.length * 8;
  const seqBufs = sequences.map(serializeMssSequence);
  let cursor = dirEnd;
  const offsets = seqBufs.map(b => {
    const off = cursor;
    cursor += b.length;
    return off;
  });

  const head = Buffer.alloc(dirEnd, 0);
  head.write(MSS_MAGIC, 0, 'latin1');
  head.writeUInt32LE((doc.version ?? MSS_VERSION) >>> 0, 0x04);
  head.writeUInt16LE(sequences.length & 0xffff, 0x08);
  head.writeUInt16LE((doc.slotCount ?? MSS_LUT_SLOTS) & 0xffff, 0x0a);
  head.writeUInt32LE((doc.reserved ?? 0) >>> 0, 0x0c);
  for (let i = 0; i < MSS_LUT_SLOTS; i++) {
    head.writeUInt16LE((motionToSeq[i] ?? 0xffff) & 0xffff, MSS_HEADER_SIZE + i * 2);
  }
  for (let i = 0; i < sequences.length; i++) {
    const o = MSS_DIR_START + i * 8;
    head.writeUInt32LE(sequences[i].motionId >>> 0, o);
    head.writeUInt32LE(offsets[i] >>> 0, o + 4);
  }
  return Buffer.concat([head, ...seqBufs]);
}

function summarizeCalls(calls) {
  return calls.map(c => ({
    soundId: c.soundId,
    callFlags: c.callFlags,
    args: c.args,
    params: c.params ? c.params.map(p => p.value) : null,
    rawParamsHex: c.rawParamsHex,
  }));
}

/**
 * Compute a semantic diff between two `MSS\0` sound-sequence buffers (slot mappings + per-motion frame/SFX calls).
 */
export function summarizeMssDiff(baseBuf, modBuf) {
  const a = parseMss(baseBuf, 'base.mss');
  const b = parseMss(modBuf, 'mod.mss');

  const changedLutSlots = [];
  for (let i = 0; i < MSS_LUT_SLOTS; i++) {
    if (a.motionToSeq[i] !== b.motionToSeq[i]) {
      changedLutSlots.push({ slot: i, base: a.motionToSeq[i], mod: b.motionToSeq[i] });
    }
  }

  const seqA = new Map(a.sequences.map(s => [s.motionId, s]));
  const seqB = new Map(b.sequences.map(s => [s.motionId, s]));
  const allMotionIds = [...new Set([...seqA.keys(), ...seqB.keys()])].sort((x, y) => x - y);

  const changedMotions = [];
  for (const motionId of allMotionIds) {
    const sa = seqA.get(motionId);
    const sb = seqB.get(motionId);
    if (!sa) {
      changedMotions.push({ motionId, kind: 'ADDED', modMaxFrame: sb.maxFrame, modGroups: sb.frameGroups.length });
      continue;
    }
    if (!sb) {
      changedMotions.push({ motionId, kind: 'REMOVED', baseMaxFrame: sa.maxFrame, baseGroups: sa.frameGroups.length });
      continue;
    }

    const sigA = JSON.stringify(sa.frameGroups.map(g => ({ frame: g.frame, calls: summarizeCalls(g.calls) })));
    const sigB = JSON.stringify(sb.frameGroups.map(g => ({ frame: g.frame, calls: summarizeCalls(g.calls) })));
    if (sa.maxFrame === sb.maxFrame && sa.flags === sb.flags && sigA === sigB) continue;

    const groupsA = new Map(sa.frameGroups.map(g => [g.frame, summarizeCalls(g.calls)]));
    const groupsB = new Map(sb.frameGroups.map(g => [g.frame, summarizeCalls(g.calls)]));
    const frames = [...new Set([...groupsA.keys(), ...groupsB.keys()])].sort((x, y) => x - y);
    const changedFrames = [];
    for (const frame of frames) {
      const ca = groupsA.get(frame);
      const cb = groupsB.get(frame);
      if (!ca) changedFrames.push({ frame, kind: 'ADDED', modCalls: cb });
      else if (!cb) changedFrames.push({ frame, kind: 'REMOVED', baseCalls: ca });
      else if (JSON.stringify(ca) !== JSON.stringify(cb)) changedFrames.push({ frame, kind: 'MODIFIED', baseCalls: ca, modCalls: cb });
    }

    changedMotions.push({
      motionId,
      kind: 'MODIFIED',
      maxFrame: sa.maxFrame !== sb.maxFrame ? [sa.maxFrame, sb.maxFrame] : undefined,
      changedFrames,
    });
  }

  return {
    baseSeqCount: a.seqCount,
    modSeqCount: b.seqCount,
    slotCount: [a.slotCount, b.slotCount],
    changedLutCount: changedLutSlots.length,
    changedLutSlots,
    changedCount: changedMotions.length,
    changedMotions,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n  node tools/mhgu/gui-mss.mjs gui <file> [--json]\n  node tools/mhgu/gui-mss.mjs mss <file> [--json]');
  process.exit(2);
}

function main(argv) {
  const json = argv.includes('--json');
  const pos = argv.filter(a => a !== '--json');
  if (pos.length !== 2) usage(null);
  const [cmd, file] = pos;
  const buf = fs.readFileSync(file);
  if (cmd === 'gui') {
    const parsed = parseGui(buf, file);
    if (json) {
      const { bodyBytes: _drop, ...rest } = parsed;
      console.log(JSON.stringify(rest, null, 2));
    } else {
      console.log(`GUI v${hex32(parsed.version)} ${parsed.screenWidth}x${parsed.screenHeight} size=${parsed.fileSize} B objects=${parsed.objects.length} sequences=${parsed.sequences.length} strings=${parsed.strings.length}`);
      for (const o of parsed.objects.slice(0, 30)) {
        console.log(`  obj[${o.index}] "${o.name}" type=${hex32(o.typeId)} params=${o.paramCount} paramIdx=${o.paramIndex}`);
      }
    }
    return;
  }
  if (cmd === 'mss') {
    const parsed = parseMss(buf, file);
    if (json) {
      console.log(JSON.stringify(parsed, (k, v) => (k === 'rawSeqBytes' ? undefined : v), 2));
    } else {
      console.log(`MSS v${hex32(parsed.version)} seqCount=${parsed.seqCount} slotCount=${parsed.slotCount}`);
      for (const s of parsed.sequences.slice(0, 20)) {
        const frames = s.frameGroups.map(g => `${g.frame}(${g.calls.map(c => c.soundId).join(',')})`).join(', ');
        console.log(`  motionId=${s.motionId} maxFrame=${s.maxFrame} groups=${s.frameGroups.length}: [${frames}]`);
      }
    }
    return;
  }
  usage(`unknown subcommand ${JSON.stringify(cmd)}`);
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
