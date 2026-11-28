// Clean-room MHGU parsers, serializers, and semantic diff helpers for:
//   - `CTC\0` (`rCnsTinyChain`, typeHash 0x535d969f, version 0x16)
//   - `SBC\xff` (`rCollision`, typeHash 0x51fc779f, version 0x781aca20)
// Derived from raw binary containers and main 1.4.0 ARM32 loaders (`0xb7deb0` and `0xb6e058`/`0xb6f3c4`/`0xc96e44`).
// Zero external dependencies; MIT clean-room implementation.
//
// Usage:
//   node tools/mhgu/ctc-sbc.mjs inspect <file> [--json]
//   node tools/mhgu/ctc-sbc.mjs verify-roundtrip <file> [--json]
//   node tools/mhgu/ctc-sbc.mjs diff <baseFile> <modFile> [--json]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TYPE_CTC = 0x535d969f;
export const TYPE_SBC = 0x51fc779f;

export const CTC_MAGIC = 'CTC\0';
export const CTC_VERSION = 0x16; // 22
export const CTC_HEADER_SIZE = 0x3c; // 60 bytes
export const CTC_GROUP_STRIDE = 80;
export const CTC_NODE_STRIDE = 96;

export const SBC_MAGIC_PREFIX = 'SBC';
export const SBC_DEFAULT_MAGIC = 'SBC\xff';
export const SBC_VERSION_BASE = 0x781aca20; // (version - version % 100) checked by 0xb6e0d0..0xb6e0f8
export const SBC_HEADER_SIZE = 0x54; // 84 bytes (80 B header + u32 allocHint @0x50)
export const SBC_GROUP_STRIDE = 80;
export const SBC_SUBBOX_STRIDE = 28;
export const SBC_BVHC_MAGIC = 'BVHC';
export const SBC_BVHC_VERSION = 0x77b17b24;
export const SBC_BVHC_HEADER_SIZE = 64;
export const SBC_FACE_STRIDE = 32;
export const SBC_VERTEX_STRIDE = 16;
export const SBC_LINK_STRIDE = 32;
export const SBC_ADJ_STRIDE = 10;
export const SBC_GRCO_MAGIC = 'grco';
export const SBC_GRCO_VERSION = 0x77c09c94;

const hex32 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

function asBuffer(input) {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

function sameFloatOrNaN(a, b) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Object.is(a, b);
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameFloatOrNaN(a[i], b[i])) return false;
  }
  return true;
}

function readF32Vec(buf, off, count) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) out[i] = buf.readFloatLE(off + i * 4);
  return out;
}

function writeF32Vec(buf, off, vec) {
  for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i] ?? 0, off + i * 4);
}

// ---------------------------------------------------------------------------
// rCnsTinyChain (`CTC\0`, 0x535d969f, v0x16)
// ---------------------------------------------------------------------------

/**
 * Parse an MHGU `CTC\0` (`rCnsTinyChain`) buffer into structured header,
 * chain groups (80 B each), and bone nodes (96 B each).
 */
export function parseCtc(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < CTC_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for CTC header (need ${CTC_HEADER_SIZE} B)`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== CTC_MAGIC) {
    throw new Error(`${label}: bad CTC magic ${JSON.stringify(magic)} (expected "CTC\\0")`);
  }
  const version = buf.readUInt32LE(0x04);
  if (version !== CTC_VERSION) {
    throw new Error(`${label}: unsupported CTC version ${hex32(version)} (expected ${hex32(CTC_VERSION)})`);
  }

  const unk08 = buf.readUInt32LE(0x08);
  const paramScale = buf.readUInt32LE(0x0c);
  const groupCount = buf.readUInt32LE(0x10);
  const nodeCount = buf.readUInt32LE(0x14);
  const flags18 = buf.readUInt32LE(0x18);
  const deltaTime = buf.readFloatLE(0x1c);
  const headerFloats = readF32Vec(buf, 0x20, 5); // +0x20..+0x30
  const headerFlags = [...buf.subarray(0x34, 0x3c)]; // 8 bytes

  const expectedSize = CTC_HEADER_SIZE + groupCount * CTC_GROUP_STRIDE + nodeCount * CTC_NODE_STRIDE;
  if (!Number.isSafeInteger(expectedSize) || expectedSize > buf.length) {
    throw new Error(`${label}: CTC table out of bounds (groups=${groupCount}, nodes=${nodeCount}, need ${expectedSize} B, have ${buf.length} B)`);
  }
  if (expectedSize !== buf.length) {
    throw new Error(`${label}: CTC size mismatch (expected ${expectedSize} B, buffer holds ${buf.length} B)`);
  }

  const groups = [];
  let cursor = CTC_HEADER_SIZE;
  for (let i = 0; i < groupCount; i++) {
    const o = cursor;
    cursor += CTC_GROUP_STRIDE;
    groups.push({
      index: i,
      chainNodeCount: buf.readUInt32LE(o + 0x00),
      flags: buf.readUInt32LE(o + 0x04),
      collisionType: buf.readInt32LE(o + 0x08),
      unk0c: buf.readUInt32LE(o + 0x0c),
      unk10: buf.readUInt32LE(o + 0x10),
      pad14: [buf.readUInt32LE(o + 0x14), buf.readUInt32LE(o + 0x18), buf.readUInt32LE(o + 0x1c)],
      gravity: readF32Vec(buf, o + 0x20, 4),
      damping: buf.readFloatLE(o + 0x30),
      stiffness: buf.readFloatLE(o + 0x34),
      drag: buf.readFloatLE(o + 0x38),
      mass: buf.readFloatLE(o + 0x3c),
      maxLimit: buf.readFloatLE(o + 0x40),
      windScale: buf.readFloatLE(o + 0x44),
      windRandom: buf.readFloatLE(o + 0x48),
      pad4c: buf.readUInt32LE(o + 0x4c),
    });
  }

  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const o = cursor;
    cursor += CTC_NODE_STRIDE;
    nodes.push({
      index: i,
      boneId: buf.readUInt16LE(o + 0x00),
      flags02: buf.readUInt16LE(o + 0x02),
      colShape: buf[o + 0x04],
      limitShape: buf[o + 0x05],
      unk06: buf[o + 0x06],
      unk07: buf[o + 0x07],
      radius: buf.readFloatLE(o + 0x08),
      pad0c: buf.readUInt32LE(o + 0x0c),
      matrix: readF32Vec(buf, o + 0x10, 16),
      angleLimit: buf.readFloatLE(o + 0x50),
      mass: buf.readFloatLE(o + 0x54),
      elasticity: buf.readFloatLE(o + 0x58),
      pad5c: buf.readUInt32LE(o + 0x5c),
    });
  }

  return {
    magic,
    version,
    fileSize: buf.length,
    unk08,
    paramScale,
    groupCount,
    nodeCount,
    flags18,
    deltaTime,
    headerFloats,
    headerFlags,
    groups,
    nodes,
  };
}

/**
 * Serialize a structured `CTC\0` document back into a valid `rCnsTinyChain` buffer.
 */
export function serializeCtc(doc) {
  if (!doc || typeof doc !== 'object') throw new TypeError('serializeCtc: doc must be an object');
  const groups = doc.groups ?? [];
  const nodes = doc.nodes ?? [];
  const totalSize = CTC_HEADER_SIZE + groups.length * CTC_GROUP_STRIDE + nodes.length * CTC_NODE_STRIDE;
  const out = Buffer.alloc(totalSize, 0);

  out.write(doc.magic ?? CTC_MAGIC, 0, 'latin1');
  out.writeUInt32LE((doc.version ?? CTC_VERSION) >>> 0, 0x04);
  out.writeUInt32LE((doc.unk08 ?? 0) >>> 0, 0x08);
  out.writeUInt32LE((doc.paramScale ?? 1000) >>> 0, 0x0c);
  out.writeUInt32LE(groups.length >>> 0, 0x10);
  out.writeUInt32LE(nodes.length >>> 0, 0x14);
  out.writeUInt32LE((doc.flags18 ?? 0) >>> 0, 0x18);
  out.writeFloatLE(doc.deltaTime ?? 1 / 60, 0x1c);
  writeF32Vec(out, 0x20, doc.headerFloats ?? [1, 1, 1, 1, 1]);
  const hf = doc.headerFlags ?? [1, 1, 1, 1, 1, 1, 0, 0];
  for (let i = 0; i < 8; i++) out[0x34 + i] = (hf[i] ?? 0) & 0xff;

  let cursor = CTC_HEADER_SIZE;
  for (const g of groups) {
    const o = cursor;
    cursor += CTC_GROUP_STRIDE;
    out.writeUInt32LE((g.chainNodeCount ?? 0) >>> 0, o + 0x00);
    out.writeUInt32LE((g.flags ?? 0) >>> 0, o + 0x04);
    out.writeInt32LE(g.collisionType ?? -1, o + 0x08);
    out.writeUInt32LE((g.unk0c ?? 1) >>> 0, o + 0x0c);
    out.writeUInt32LE((g.unk10 ?? 1) >>> 0, o + 0x10);
    const pad14 = g.pad14 ?? [0xcdcdcdcd, 0xcdcdcdcd, 0xcdcdcdcd];
    for (let k = 0; k < 3; k++) out.writeUInt32LE((pad14[k] ?? 0xcdcdcdcd) >>> 0, o + 0x14 + k * 4);
    writeF32Vec(out, o + 0x20, g.gravity ?? [0, 0, 0, 0]);
    out.writeFloatLE(g.damping ?? 0.1, o + 0x30);
    out.writeFloatLE(g.stiffness ?? 1.0, o + 0x34);
    out.writeFloatLE(g.drag ?? 0.05, o + 0x38);
    out.writeFloatLE(g.mass ?? 1.0, o + 0x3c);
    out.writeFloatLE(g.maxLimit ?? 100.0, o + 0x40);
    out.writeFloatLE(g.windScale ?? 0.0, o + 0x44);
    out.writeFloatLE(g.windRandom ?? 0.1, o + 0x48);
    out.writeUInt32LE((g.pad4c ?? 0xcdcdcdcd) >>> 0, o + 0x4c);
  }

  for (const n of nodes) {
    const o = cursor;
    cursor += CTC_NODE_STRIDE;
    out.writeUInt16LE((n.boneId ?? 0) & 0xffff, o + 0x00);
    out.writeUInt16LE((n.flags02 ?? 1) & 0xffff, o + 0x02);
    out[o + 0x04] = (n.colShape ?? 1) & 0xff;
    out[o + 0x05] = (n.limitShape ?? 0) & 0xff;
    out[o + 0x06] = (n.unk06 ?? 1) & 0xff;
    out[o + 0x07] = (n.unk07 ?? 1) & 0xff;
    out.writeFloatLE(n.radius ?? 5.0, o + 0x08);
    out.writeUInt32LE((n.pad0c ?? 0xcdcdcdcd) >>> 0, o + 0x0c);
    writeF32Vec(out, o + 0x10, n.matrix ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    out.writeFloatLE(n.angleLimit ?? Math.PI / 2, o + 0x50);
    out.writeFloatLE(n.mass ?? 1.0, o + 0x54);
    out.writeFloatLE(n.elasticity ?? 1.0, o + 0x58);
    out.writeUInt32LE((n.pad5c ?? 0xcdcdcdcd) >>> 0, o + 0x5c);
  }

  return out;
}

/**
 * Compute a semantic diff between two `CTC\0` physics chain buffers.
 */
export function summarizeCtcDiff(baseBuf, modBuf) {
  const a = parseCtc(baseBuf, 'base.ctc');
  const b = parseCtc(modBuf, 'mod.ctc');

  const headerChanges = [];
  if (a.paramScale !== b.paramScale) headerChanges.push({ field: 'paramScale', base: a.paramScale, mod: b.paramScale });
  if (!sameFloatOrNaN(a.deltaTime, b.deltaTime)) headerChanges.push({ field: 'deltaTime', base: a.deltaTime, mod: b.deltaTime });
  if (a.flags18 !== b.flags18) headerChanges.push({ field: 'flags18', base: a.flags18, mod: b.flags18 });
  if (!sameArray(a.headerFloats, b.headerFloats)) headerChanges.push({ field: 'headerFloats', base: a.headerFloats, mod: b.headerFloats });

  const changedGroups = [];
  const maxG = Math.max(a.groups.length, b.groups.length);
  const groupScalarFields = ['chainNodeCount', 'flags', 'collisionType', 'damping', 'stiffness', 'drag', 'mass', 'maxLimit', 'windScale', 'windRandom'];
  for (let i = 0; i < maxG; i++) {
    const ga = a.groups[i];
    const gb = b.groups[i];
    if (!ga) {
      changedGroups.push({ index: i, kind: 'ADDED', chainNodeCount: gb.chainNodeCount });
      continue;
    }
    if (!gb) {
      changedGroups.push({ index: i, kind: 'REMOVED', chainNodeCount: ga.chainNodeCount });
      continue;
    }
    const diffs = {};
    for (const f of groupScalarFields) {
      if (!sameFloatOrNaN(ga[f], gb[f])) diffs[f] = [ga[f], gb[f]];
    }
    if (!sameArray(ga.gravity, gb.gravity)) diffs.gravity = [ga.gravity, gb.gravity];
    if (Object.keys(diffs).length > 0) changedGroups.push({ index: i, kind: 'MODIFIED', diffs });
  }

  const changedNodes = [];
  const maxN = Math.max(a.nodes.length, b.nodes.length);
  const nodeScalarFields = ['boneId', 'flags02', 'colShape', 'limitShape', 'unk06', 'unk07', 'radius', 'angleLimit', 'mass', 'elasticity'];
  for (let i = 0; i < maxN; i++) {
    const na = a.nodes[i];
    const nb = b.nodes[i];
    if (!na) {
      changedNodes.push({ index: i, kind: 'ADDED', boneId: nb.boneId, radius: nb.radius });
      continue;
    }
    if (!nb) {
      changedNodes.push({ index: i, kind: 'REMOVED', boneId: na.boneId, radius: na.radius });
      continue;
    }
    const diffs = {};
    for (const f of nodeScalarFields) {
      if (!sameFloatOrNaN(na[f], nb[f])) diffs[f] = [na[f], nb[f]];
    }
    if (!sameArray(na.matrix, nb.matrix)) diffs.matrixChanged = true;
    if (Object.keys(diffs).length > 0) changedNodes.push({ index: i, kind: 'MODIFIED', boneId: nb.boneId, diffs });
  }

  return {
    baseGroupCount: a.groupCount,
    modGroupCount: b.groupCount,
    baseNodeCount: a.nodeCount,
    modNodeCount: b.nodeCount,
    headerChanges,
    changedGroupCount: changedGroups.length,
    changedGroups,
    changedNodeCount: changedNodes.length,
    changedNodes,
  };
}

// ---------------------------------------------------------------------------
// rCollision (`SBC\xff`, 0x51fc779f, v0x781aca20)
// ---------------------------------------------------------------------------

function parseBvhc(buf, offset, label) {
  if (offset + SBC_BVHC_HEADER_SIZE > buf.length) {
    throw new Error(`${label}: BVHC header at 0x${offset.toString(16)} out of bounds (${buf.length} B)`);
  }
  const magic = buf.toString('latin1', offset, offset + 4);
  if (magic !== SBC_BVHC_MAGIC) {
    throw new Error(`${label}: bad BVHC magic ${JSON.stringify(magic)} at 0x${offset.toString(16)}`);
  }
  const version = buf.readUInt32LE(offset + 0x04);
  const mode = buf.readUInt32LE(offset + 0x08);
  const flags0c = buf.readUInt32LE(offset + 0x0c);
  const bboxMin = readF32Vec(buf, offset + 0x10, 4);
  const bboxMax = readF32Vec(buf, offset + 0x20, 4);
  const boxCount = buf.readUInt32LE(offset + 0x30);
  const boxStride = mode === 1 ? 112 : mode === 2 ? 80 : 0;
  if (boxStride === 0) {
    throw new Error(`${label}: unsupported BVHC mode ${mode} at 0x${offset.toString(16)}`);
  }
  const bodySize = boxCount * boxStride;
  if (!Number.isSafeInteger(bodySize) || offset + SBC_BVHC_HEADER_SIZE + bodySize > buf.length) {
    throw new Error(`${label}: BVHC body (${boxCount} * ${boxStride} B) out of bounds at 0x${offset.toString(16)}`);
  }
  const headerRest = Buffer.from(buf.subarray(offset + 0x34, offset + SBC_BVHC_HEADER_SIZE)).toString('hex');
  const boxesHex = Buffer.from(buf.subarray(offset + SBC_BVHC_HEADER_SIZE, offset + SBC_BVHC_HEADER_SIZE + bodySize)).toString('hex');
  return {
    bvhc: { magic, version, mode, flags0c, bboxMin, bboxMax, boxCount, boxStride, headerRest, boxesHex },
    nextOffset: offset + SBC_BVHC_HEADER_SIZE + bodySize,
  };
}

function serializeBvhc(b) {
  const bodyLen = b.boxCount * b.boxStride;
  const out = Buffer.alloc(SBC_BVHC_HEADER_SIZE + bodyLen, 0);
  out.write(b.magic ?? SBC_BVHC_MAGIC, 0, 'latin1');
  out.writeUInt32LE((b.version ?? SBC_BVHC_VERSION) >>> 0, 0x04);
  out.writeUInt32LE((b.mode ?? 1) >>> 0, 0x08);
  out.writeUInt32LE((b.flags0c ?? 0) >>> 0, 0x0c);
  writeF32Vec(out, 0x10, b.bboxMin ?? [0, 0, 0, 0]);
  writeF32Vec(out, 0x20, b.bboxMax ?? [0, 0, 0, 0]);
  out.writeUInt32LE(b.boxCount >>> 0, 0x30);
  if (b.headerRest) Buffer.from(b.headerRest, 'hex').copy(out, 0x34);
  if (b.boxesHex) Buffer.from(b.boxesHex, 'hex').copy(out, SBC_BVHC_HEADER_SIZE);
  return out;
}

function parseGrco(buf, offset, label) {
  const GRCO_HDR = 46; // magic(4) + ver(4) + bboxMin(16) + bboxMax(16) + gridX(2) + gridZ(2) + idxType(1) + hasFlat(1)
  if (offset + GRCO_HDR > buf.length) {
    throw new Error(`${label}: grco header at 0x${offset.toString(16)} out of bounds (${buf.length} B)`);
  }
  const magic = buf.toString('latin1', offset, offset + 4);
  if (magic !== SBC_GRCO_MAGIC) {
    throw new Error(`${label}: bad grco magic ${JSON.stringify(magic)} at 0x${offset.toString(16)}`);
  }
  const version = buf.readUInt32LE(offset + 0x04);
  const bboxMin = readF32Vec(buf, offset + 0x08, 4);
  const bboxMax = readF32Vec(buf, offset + 0x18, 4);
  const gridX = buf.readUInt16LE(offset + 0x28);
  const gridZ = buf.readUInt16LE(offset + 0x2a);
  const indexType = buf[offset + 0x2c];
  const hasFlatCells = buf[offset + 0x2d];
  let cur = offset + GRCO_HDR;

  if (hasFlatCells !== 0) {
    const cellBytes = gridX * gridZ * 8;
    if (cur + cellBytes + 4 > buf.length) {
      throw new Error(`${label}: grco flat cells out of bounds at 0x${cur.toString(16)}`);
    }
    const cellsHex = Buffer.from(buf.subarray(cur, cur + cellBytes)).toString('hex');
    cur += cellBytes;
    const indexCount = buf.readUInt32LE(cur);
    cur += 4;
    const idxStride = indexType === 0 ? 4 : indexType === 1 ? 2 : 0;
    if (idxStride === 0) throw new Error(`${label}: unsupported grco indexType ${indexType}`);
    const idxBytes = indexCount * idxStride;
    if (!Number.isSafeInteger(idxBytes) || cur + idxBytes > buf.length) {
      throw new Error(`${label}: grco indices (${indexCount} * ${idxStride} B) out of bounds at 0x${cur.toString(16)}`);
    }
    const indicesHex = Buffer.from(buf.subarray(cur, cur + idxBytes)).toString('hex');
    cur += idxBytes;
    return {
      grid: { magic, version, bboxMin, bboxMax, gridX, gridZ, indexType, hasFlatCells, cellsHex, indexCount, indicesHex },
      nextOffset: cur,
    };
  }

  // Fallback for non-flat grco if ever present: preserve remaining slice up to caller.
  return {
    grid: { magic, version, bboxMin, bboxMax, gridX, gridZ, indexType, hasFlatCells, rawTailHex: Buffer.from(buf.subarray(cur)).toString('hex') },
    nextOffset: buf.length,
  };
}

function serializeGrco(g) {
  const GRCO_HDR = 46;
  const hdr = Buffer.alloc(GRCO_HDR, 0);
  hdr.write(g.magic ?? SBC_GRCO_MAGIC, 0, 'latin1');
  hdr.writeUInt32LE((g.version ?? SBC_GRCO_VERSION) >>> 0, 0x04);
  writeF32Vec(hdr, 0x08, g.bboxMin ?? [0, 0, 0, 0]);
  writeF32Vec(hdr, 0x18, g.bboxMax ?? [0, 0, 0, 0]);
  hdr.writeUInt16LE((g.gridX ?? 1) & 0xffff, 0x28);
  hdr.writeUInt16LE((g.gridZ ?? 1) & 0xffff, 0x2a);
  hdr[0x2c] = (g.indexType ?? 1) & 0xff;
  hdr[0x2d] = (g.hasFlatCells ?? 1) & 0xff;
  if ((g.hasFlatCells ?? 1) !== 0) {
    const cells = Buffer.from(g.cellsHex ?? '', 'hex');
    const countBuf = Buffer.alloc(4);
    countBuf.writeUInt32LE((g.indexCount ?? 0) >>> 0, 0);
    const indices = Buffer.from(g.indicesHex ?? '', 'hex');
    return Buffer.concat([hdr, cells, countBuf, indices]);
  }
  return Buffer.concat([hdr, Buffer.from(g.rawTailHex ?? '', 'hex')]);
}

/**
 * Parse an MHGU `SBC\xff` (`rCollision`) stage/monster collision container into structured
 * header, collision groups, BVHC tree, faces (32 B), vertices (16 B), links (32 B),
 * adjacencies (10 B), and spatial acceleration grids (`grco`).
 */
export function parseSbc(input, label = '<buffer>') {
  const buf = asBuffer(input);
  if (buf.length < SBC_HEADER_SIZE) {
    throw new Error(`${label}: buffer too small (${buf.length} B) for SBC header (need ${SBC_HEADER_SIZE} B)`);
  }
  const magic = buf.toString('latin1', 0, 4);
  if (!magic.startsWith(SBC_MAGIC_PREFIX)) {
    throw new Error(`${label}: bad SBC magic ${JSON.stringify(magic)} (expected "SBC*")`);
  }
  const version = buf.readUInt32LE(0x04);
  if ((version - (version % 100)) >>> 0 !== SBC_VERSION_BASE) {
    throw new Error(`${label}: unsupported SBC version ${hex32(version)} (expected ${hex32(SBC_VERSION_BASE)} + 0..99)`);
  }

  const topType = buf.readUInt32LE(0x08);
  const groupType = buf.readUInt32LE(0x0c);
  const groupCount = buf.readUInt16LE(0x10);
  const linkCount = buf.readUInt16LE(0x12);
  const adjCount = buf.readUInt32LE(0x14);
  const faceCount = buf.readUInt32LE(0x18);
  const vertexCount = buf.readUInt32LE(0x1c);
  const reserved20 = [
    buf.readUInt32LE(0x20),
    buf.readUInt32LE(0x24),
    buf.readUInt32LE(0x28),
    buf.readUInt32LE(0x2c),
  ];
  const bboxMin = readF32Vec(buf, 0x30, 4);
  const bboxMax = readF32Vec(buf, 0x40, 4);
  const allocHint = buf.readUInt32LE(0x50);

  let cur = SBC_HEADER_SIZE;
  const groupsEnd = cur + groupCount * SBC_GROUP_STRIDE;
  if (!Number.isSafeInteger(groupsEnd) || groupsEnd > buf.length) {
    throw new Error(`${label}: SBC groups (${groupCount} * ${SBC_GROUP_STRIDE} B) out of bounds (${buf.length} B)`);
  }

  const groups = [];
  for (let i = 0; i < groupCount; i++) {
    const o = cur + i * SBC_GROUP_STRIDE;
    groups.push({
      index: i,
      bboxMin: readF32Vec(buf, o + 0x00, 4),
      bboxMax: readF32Vec(buf, o + 0x10, 4),
      raw20: [buf.readUInt32LE(o + 0x20), buf.readUInt32LE(o + 0x24), buf.readUInt32LE(o + 0x28)],
      unk2c: buf.readUInt32LE(o + 0x2c),
      subBoxCount: buf.readUInt16LE(o + 0x30),
      unk32: buf.readUInt16LE(o + 0x32),
      unk34: buf.readUInt32LE(o + 0x34),
      faceCount: buf.readUInt32LE(o + 0x38),
      unk3c: buf.readUInt32LE(o + 0x3c),
      adjCount: buf.readUInt32LE(o + 0x40),
      tail44: [buf.readUInt32LE(o + 0x44), buf.readUInt32LE(o + 0x48), buf.readUInt32LE(o + 0x4c)],
    });
  }
  cur = groupsEnd;

  const groupAux = [];
  for (let i = 0; i < groupCount; i++) {
    if (groupType === 2) {
      const count = groups[i].subBoxCount;
      const bytes = count * SBC_SUBBOX_STRIDE;
      if (!Number.isSafeInteger(bytes) || cur + bytes > buf.length) {
        throw new Error(`${label}: SBC group[${i}] subBoxes (${count} * 28 B) out of bounds at 0x${cur.toString(16)}`);
      }
      const subBoxes = [];
      for (let j = 0; j < count; j++) {
        const o = cur + j * SBC_SUBBOX_STRIDE;
        subBoxes.push({
          min: readF32Vec(buf, o + 0x00, 3),
          flags: buf.readUInt32LE(o + 0x0c),
          max: readF32Vec(buf, o + 0x10, 3),
        });
      }
      groupAux.push({ kind: 'subBoxes', subBoxes });
      cur += bytes;
    } else if (groupType < 2) {
      const res = parseBvhc(buf, cur, label);
      groupAux.push({ kind: 'bvhc', bvhc: res.bvhc });
      cur = res.nextOffset;
    } else {
      throw new Error(`${label}: unsupported SBC groupType ${groupType}`);
    }
  }

  let topAux = null;
  if (topType < 2) {
    const res = parseBvhc(buf, cur, label);
    topAux = { kind: 'bvhc', bvhc: res.bvhc };
    cur = res.nextOffset;
  } else if (topType === 2) {
    const bytes = groupCount * SBC_SUBBOX_STRIDE;
    if (cur + bytes > buf.length) {
      throw new Error(`${label}: SBC topType=2 subBoxes out of bounds at 0x${cur.toString(16)}`);
    }
    const subBoxes = [];
    for (let j = 0; j < groupCount; j++) {
      const o = cur + j * SBC_SUBBOX_STRIDE;
      subBoxes.push({
        min: readF32Vec(buf, o + 0x00, 3),
        flags: buf.readUInt32LE(o + 0x0c),
        max: readF32Vec(buf, o + 0x10, 3),
      });
    }
    topAux = { kind: 'subBoxes', subBoxes };
    cur += bytes;
  } else {
    throw new Error(`${label}: unsupported SBC topType ${topType}`);
  }

  const facesBytes = faceCount * SBC_FACE_STRIDE;
  const vertsBytes = vertexCount * SBC_VERTEX_STRIDE;
  const linksBytes = linkCount * SBC_LINK_STRIDE;
  const adjBytes = adjCount * SBC_ADJ_STRIDE;
  const geomTotal = facesBytes + vertsBytes + linksBytes + adjBytes;
  if (!Number.isSafeInteger(geomTotal) || cur + geomTotal > buf.length) {
    throw new Error(`${label}: SBC geometry tables out of bounds at 0x${cur.toString(16)} (need ${geomTotal} B, have ${buf.length - cur} B)`);
  }

  const faces = [];
  for (let i = 0; i < faceCount; i++) {
    const o = cur + i * SBC_FACE_STRIDE;
    faces.push({
      index: i,
      normal: readF32Vec(buf, o + 0x00, 3),
      v0: buf.readUInt16LE(o + 0x0c),
      v1: buf.readUInt16LE(o + 0x0e),
      v2: buf.readUInt16LE(o + 0x10),
      pad12: buf.readUInt16LE(o + 0x12),
      attr14: buf.readUInt32LE(o + 0x14),
      surfaceAttr: buf.readUInt32LE(o + 0x18),
      attr1c: buf.readUInt32LE(o + 0x1c),
    });
  }
  cur += facesBytes;

  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    const o = cur + i * SBC_VERTEX_STRIDE;
    vertices.push(readF32Vec(buf, o, 4));
  }
  cur += vertsBytes;

  const links = [];
  for (let i = 0; i < linkCount; i++) {
    const o = cur + i * SBC_LINK_STRIDE;
    links.push(Buffer.from(buf.subarray(o, o + SBC_LINK_STRIDE)).toString('hex'));
  }
  cur += linksBytes;

  const adjacencies = [];
  for (let i = 0; i < adjCount; i++) {
    const o = cur + i * SBC_ADJ_STRIDE;
    adjacencies.push({
      faceIndex: buf.readUInt16LE(o + 0),
      edges: [buf.readInt16LE(o + 2), buf.readInt16LE(o + 4), buf.readInt16LE(o + 6)],
      flags: buf.readUInt16LE(o + 8),
    });
  }
  cur += adjBytes;

  const groupGrids = [];
  if (groupType === 2) {
    for (let i = 0; i < groupCount; i++) {
      const res = parseGrco(buf, cur, label);
      groupGrids.push(res.grid);
      cur = res.nextOffset;
    }
  }
  let topGrid = null;
  if (topType === 2) {
    const res = parseGrco(buf, cur, label);
    topGrid = res.grid;
    cur = res.nextOffset;
  }

  const trailingHex = cur < buf.length ? Buffer.from(buf.subarray(cur)).toString('hex') : '';

  return {
    magic,
    version,
    fileSize: buf.length,
    topType,
    groupType,
    groupCount,
    linkCount,
    adjCount,
    faceCount,
    vertexCount,
    reserved20,
    bboxMin,
    bboxMax,
    allocHint,
    groups,
    groupAux,
    topAux,
    faces,
    vertices,
    links,
    adjacencies,
    groupGrids,
    topGrid,
    trailingHex,
  };
}

/**
 * Serialize a structured `SBC` document back into a valid `rCollision` binary buffer.
 */
export function serializeSbc(doc) {
  if (!doc || typeof doc !== 'object') throw new TypeError('serializeSbc: doc must be an object');
  const groups = doc.groups ?? [];
  const faces = doc.faces ?? [];
  const vertices = doc.vertices ?? [];
  const links = doc.links ?? [];
  const adjacencies = doc.adjacencies ?? [];

  const hdr = Buffer.alloc(SBC_HEADER_SIZE + groups.length * SBC_GROUP_STRIDE, 0);
  hdr.write(doc.magic ?? SBC_DEFAULT_MAGIC, 0, 'latin1');
  hdr.writeUInt32LE((doc.version ?? SBC_VERSION_BASE) >>> 0, 0x04);
  hdr.writeUInt32LE((doc.topType ?? 0) >>> 0, 0x08);
  hdr.writeUInt32LE((doc.groupType ?? 2) >>> 0, 0x0c);
  hdr.writeUInt16LE(groups.length & 0xffff, 0x10);
  hdr.writeUInt16LE(links.length & 0xffff, 0x12);
  hdr.writeUInt32LE(adjacencies.length >>> 0, 0x14);
  hdr.writeUInt32LE(faces.length >>> 0, 0x18);
  hdr.writeUInt32LE(vertices.length >>> 0, 0x1c);
  const res20 = doc.reserved20 ?? [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) hdr.writeUInt32LE((res20[i] ?? 0) >>> 0, 0x20 + i * 4);
  writeF32Vec(hdr, 0x30, doc.bboxMin ?? [0, 0, 0, 0]);
  writeF32Vec(hdr, 0x40, doc.bboxMax ?? [0, 0, 0, 0]);
  hdr.writeUInt32LE((doc.allocHint ?? 0) >>> 0, 0x50);

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const o = SBC_HEADER_SIZE + i * SBC_GROUP_STRIDE;
    writeF32Vec(hdr, o + 0x00, g.bboxMin ?? [0, 0, 0, 0]);
    writeF32Vec(hdr, o + 0x10, g.bboxMax ?? [0, 0, 0, 0]);
    const raw20 = g.raw20 ?? [0, 0, 0];
    for (let k = 0; k < 3; k++) hdr.writeUInt32LE((raw20[k] ?? 0) >>> 0, o + 0x20 + k * 4);
    hdr.writeUInt32LE((g.unk2c ?? 0) >>> 0, o + 0x2c);
    hdr.writeUInt16LE((g.subBoxCount ?? 0) & 0xffff, o + 0x30);
    hdr.writeUInt16LE((g.unk32 ?? 0) & 0xffff, o + 0x32);
    hdr.writeUInt32LE((g.unk34 ?? 0) >>> 0, o + 0x34);
    hdr.writeUInt32LE((g.faceCount ?? 0) >>> 0, o + 0x38);
    hdr.writeUInt32LE((g.unk3c ?? 0) >>> 0, o + 0x3c);
    hdr.writeUInt32LE((g.adjCount ?? 0) >>> 0, o + 0x40);
    const tail44 = g.tail44 ?? [0, 0, 0];
    for (let k = 0; k < 3; k++) hdr.writeUInt32LE((tail44[k] ?? 0) >>> 0, o + 0x44 + k * 4);
  }

  const parts = [hdr];

  const writeSubBoxes = boxes => {
    const b = Buffer.alloc(boxes.length * SBC_SUBBOX_STRIDE, 0);
    for (let j = 0; j < boxes.length; j++) {
      const sb = boxes[j];
      const o = j * SBC_SUBBOX_STRIDE;
      writeF32Vec(b, o + 0x00, sb.min ?? [0, 0, 0]);
      b.writeUInt32LE((sb.flags ?? 0) >>> 0, o + 0x0c);
      writeF32Vec(b, o + 0x10, sb.max ?? [0, 0, 0]);
    }
    return b;
  };

  for (const aux of doc.groupAux ?? []) {
    if (aux.kind === 'subBoxes') parts.push(writeSubBoxes(aux.subBoxes ?? []));
    else if (aux.kind === 'bvhc') parts.push(serializeBvhc(aux.bvhc));
  }
  if (doc.topAux) {
    if (doc.topAux.kind === 'bvhc') parts.push(serializeBvhc(doc.topAux.bvhc));
    else if (doc.topAux.kind === 'subBoxes') parts.push(writeSubBoxes(doc.topAux.subBoxes ?? []));
  }

  const faceBuf = Buffer.alloc(faces.length * SBC_FACE_STRIDE, 0);
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const o = i * SBC_FACE_STRIDE;
    writeF32Vec(faceBuf, o + 0x00, f.normal ?? [0, 1, 0]);
    faceBuf.writeUInt16LE((f.v0 ?? 0) & 0xffff, o + 0x0c);
    faceBuf.writeUInt16LE((f.v1 ?? 0) & 0xffff, o + 0x0e);
    faceBuf.writeUInt16LE((f.v2 ?? 0) & 0xffff, o + 0x10);
    faceBuf.writeUInt16LE((f.pad12 ?? 0) & 0xffff, o + 0x12);
    faceBuf.writeUInt32LE((f.attr14 ?? 0) >>> 0, o + 0x14);
    faceBuf.writeUInt32LE((f.surfaceAttr ?? 0) >>> 0, o + 0x18);
    faceBuf.writeUInt32LE((f.attr1c ?? 0) >>> 0, o + 0x1c);
  }
  parts.push(faceBuf);

  const vertBuf = Buffer.alloc(vertices.length * SBC_VERTEX_STRIDE, 0);
  for (let i = 0; i < vertices.length; i++) writeF32Vec(vertBuf, i * SBC_VERTEX_STRIDE, vertices[i]);
  parts.push(vertBuf);

  const linkBuf = Buffer.alloc(links.length * SBC_LINK_STRIDE, 0);
  for (let i = 0; i < links.length; i++) {
    if (typeof links[i] === 'string') Buffer.from(links[i], 'hex').copy(linkBuf, i * SBC_LINK_STRIDE);
  }
  parts.push(linkBuf);

  const adjBuf = Buffer.alloc(adjacencies.length * SBC_ADJ_STRIDE, 0);
  for (let i = 0; i < adjacencies.length; i++) {
    const a = adjacencies[i];
    const o = i * SBC_ADJ_STRIDE;
    adjBuf.writeUInt16LE((a.faceIndex ?? i) & 0xffff, o + 0);
    const edges = a.edges ?? [-1, -1, -1];
    for (let k = 0; k < 3; k++) adjBuf.writeInt16LE(edges[k] ?? -1, o + 2 + k * 2);
    adjBuf.writeUInt16LE((a.flags ?? 0) & 0xffff, o + 8);
  }
  parts.push(adjBuf);

  for (const g of doc.groupGrids ?? []) parts.push(serializeGrco(g));
  if (doc.topGrid) parts.push(serializeGrco(doc.topGrid));
  if (doc.trailingHex) parts.push(Buffer.from(doc.trailingHex, 'hex'));

  return Buffer.concat(parts);
}

/**
 * Compute a semantic diff between two `SBC` stage/monster collision buffers.
 */
export function summarizeSbcDiff(baseBuf, modBuf) {
  const a = parseSbc(baseBuf, 'base.sbc');
  const b = parseSbc(modBuf, 'mod.sbc');

  const bboxChanged = !sameArray(a.bboxMin, b.bboxMin) || !sameArray(a.bboxMax, b.bboxMax);
  const changedFaces = [];
  const maxF = Math.max(a.faces.length, b.faces.length);
  for (let i = 0; i < maxF; i++) {
    const fa = a.faces[i];
    const fb = b.faces[i];
    if (!fa) changedFaces.push({ index: i, kind: 'ADDED', v: [fb.v0, fb.v1, fb.v2], surfaceAttr: fb.surfaceAttr });
    else if (!fb) changedFaces.push({ index: i, kind: 'REMOVED', v: [fa.v0, fa.v1, fa.v2], surfaceAttr: fa.surfaceAttr });
    else if (
      fa.v0 !== fb.v0 || fa.v1 !== fb.v1 || fa.v2 !== fb.v2 ||
      fa.surfaceAttr !== fb.surfaceAttr || fa.attr14 !== fb.attr14 ||
      fa.attr1c !== fb.attr1c || !sameArray(fa.normal, fb.normal)
    ) {
      changedFaces.push({
        index: i,
        kind: 'MODIFIED',
        surfaceAttr: fa.surfaceAttr !== fb.surfaceAttr ? [fa.surfaceAttr, fb.surfaceAttr] : undefined,
        indices: (fa.v0 !== fb.v0 || fa.v1 !== fb.v1 || fa.v2 !== fb.v2) ? [[fa.v0, fa.v1, fa.v2], [fb.v0, fb.v1, fb.v2]] : undefined,
        normalChanged: !sameArray(fa.normal, fb.normal),
      });
    }
  }

  const changedVertices = [];
  const maxV = Math.max(a.vertices.length, b.vertices.length);
  for (let i = 0; i < maxV; i++) {
    const va = a.vertices[i];
    const vb = b.vertices[i];
    if (!va) changedVertices.push({ index: i, kind: 'ADDED', mod: vb });
    else if (!vb) changedVertices.push({ index: i, kind: 'REMOVED', base: va });
    else if (!sameArray(va, vb)) changedVertices.push({ index: i, kind: 'MODIFIED', base: va, mod: vb });
  }

  return {
    baseGroupCount: a.groupCount,
    modGroupCount: b.groupCount,
    baseFaceCount: a.faceCount,
    modFaceCount: b.faceCount,
    baseVertexCount: a.vertexCount,
    modVertexCount: b.vertexCount,
    baseAdjCount: a.adjCount,
    modAdjCount: b.adjCount,
    bboxChanged,
    baseBbox: bboxChanged ? { min: a.bboxMin.slice(0, 3), max: a.bboxMax.slice(0, 3) } : undefined,
    modBbox: bboxChanged ? { min: b.bboxMin.slice(0, 3), max: b.bboxMax.slice(0, 3) } : undefined,
    changedFaceCount: changedFaces.length,
    changedFaces: changedFaces.slice(0, 50),
    changedVertexCount: changedVertices.length,
    changedVertices: changedVertices.slice(0, 50),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function detectFormat(buf, label) {
  if (buf.length < 4) throw new Error(`${label}: buffer too small (${buf.length} B) to detect magic`);
  const magic = buf.toString('latin1', 0, 4);
  if (magic === CTC_MAGIC) return 'CTC';
  if (magic.startsWith(SBC_MAGIC_PREFIX)) return 'SBC';
  throw new Error(`${label}: unrecognized magic ${JSON.stringify(magic)} (expected "CTC\\0" or "SBC*")`);
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error(
    'usage:\n' +
    '  node tools/mhgu/ctc-sbc.mjs inspect <file> [--json]\n' +
    '  node tools/mhgu/ctc-sbc.mjs verify-roundtrip <file> [--json]\n' +
    '  node tools/mhgu/ctc-sbc.mjs diff <baseFile> <modFile> [--json]'
  );
  process.exit(2);
}

function main(argv) {
  const json = argv.includes('--json');
  const pos = argv.filter(a => a !== '--json');
  if (pos.length < 2) usage(null);
  const [cmd, ...rest] = pos;

  if ((cmd === 'inspect' || cmd === 'ctc' || cmd === 'sbc') && rest.length === 1) {
    const file = rest[0];
    const buf = fs.readFileSync(file);
    const kind = cmd === 'ctc' ? 'CTC' : cmd === 'sbc' ? 'SBC' : detectFormat(buf, file);
    const parsed = kind === 'CTC' ? parseCtc(buf, file) : parseSbc(buf, file);
    if (json) {
      console.log(JSON.stringify({ kind, ...parsed }, null, 2));
    } else if (kind === 'CTC') {
      console.log(`CTC v${hex32(parsed.version)} size=${parsed.fileSize} B groups=${parsed.groupCount} nodes=${parsed.nodeCount} dt=${parsed.deltaTime.toFixed(5)}`);
      for (const g of parsed.groups.slice(0, 10)) {
        console.log(`  group[${g.index}] nodes=${g.chainNodeCount} damping=${g.damping} stiffness=${g.stiffness} drag=${g.drag} wind=${g.windScale}`);
      }
      for (const n of parsed.nodes.slice(0, 15)) {
        console.log(`  node[${n.index}] bone=${n.boneId} radius=${n.radius} angleLimit=${n.angleLimit.toFixed(4)} mass=${n.mass}`);
      }
    } else {
      console.log(`SBC v${hex32(parsed.version)} size=${parsed.fileSize} B groups=${parsed.groupCount} faces=${parsed.faceCount} verts=${parsed.vertexCount} adj=${parsed.adjCount} links=${parsed.linkCount}`);
      console.log(`  bbox min=[${parsed.bboxMin.slice(0, 3).map(v => v.toFixed(2)).join(', ')}] max=[${parsed.bboxMax.slice(0, 3).map(v => v.toFixed(2)).join(', ')}]`);
    }
    return;
  }

  if (cmd === 'verify-roundtrip' && rest.length === 1) {
    const file = rest[0];
    const buf = fs.readFileSync(file);
    const kind = detectFormat(buf, file);
    const rt = kind === 'CTC' ? serializeCtc(parseCtc(buf, file)) : serializeSbc(parseSbc(buf, file));
    const ok = rt.equals(buf);
    const result = { kind, file, bytes: buf.length, ok, sha256: sha256(buf), roundtripSha256: sha256(rt) };
    if (json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${kind} verify-roundtrip ${file}: ${ok ? 'EXACT MATCH' : 'MISMATCH'} (${buf.length} B, sha256=${result.sha256})`);
    if (!ok) process.exit(1);
    return;
  }

  if (cmd === 'diff' && rest.length === 2) {
    const [baseFile, modFile] = rest;
    const baseBuf = fs.readFileSync(baseFile);
    const modBuf = fs.readFileSync(modFile);
    const kA = detectFormat(baseBuf, baseFile);
    const kB = detectFormat(modBuf, modFile);
    if (kA !== kB) {
      console.error(`cannot diff mismatched kinds: ${kA} vs ${kB}`);
      process.exit(2);
    }
    const diff = kA === 'CTC' ? summarizeCtcDiff(baseBuf, modBuf) : summarizeSbcDiff(baseBuf, modBuf);
    if (json) console.log(JSON.stringify({ kind: kA, ...diff }, null, 2));
    else if (kA === 'CTC') {
      console.log(`CTC diff: groups ${diff.baseGroupCount}->${diff.modGroupCount} (changed=${diff.changedGroupCount}), nodes ${diff.baseNodeCount}->${diff.modNodeCount} (changed=${diff.changedNodeCount})`);
    } else {
      console.log(`SBC diff: faces ${diff.baseFaceCount}->${diff.modFaceCount} (changed=${diff.changedFaceCount}), verts ${diff.baseVertexCount}->${diff.modVertexCount} (changed=${diff.changedVertexCount}), bboxChanged=${diff.bboxChanged}`);
    }
    return;
  }

  usage(`unknown or invalid command ${JSON.stringify(cmd)}`);
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) main(process.argv.slice(2));
