// Read-only MHGU mod anatomy & diff inspector.
// Supports:
//   - `.pchtxt` and `.ips` / `IPS32` patch parsing + ARM32 Original-vs-Patched disassembly
//     against `main.140.flat.bin`, `functions-retile.csv.gz`, and `class-inventory.tsv`
//     (lazily loads `arm32.mjs` only when needed and the flat image exists; degrades gracefully otherwise)
//   - `.arc` container entry SHA-256 diff, order/flags diff + semantic `LMT` (keyframes + +0x34 events) & `HDP`/`HDE` diff
//   - Mod root directory scanning (`patch`, `arc`, `mod`, `--selftest`)
//
// Usage:
//   node tools/mhgu/mod-diff.mjs patch <file.pchtxt|file.ips> [--flat <path>] [--base-mode auto|nso|vaddr] [--json]
//   node tools/mhgu/mod-diff.mjs arc <base.arc> <mod.arc> [--json]
//   node tools/mhgu/mod-diff.mjs mod <modRoot> [--romfs <romfsDir>] [--flat <path>] [--out <dir>] [--json]
//   node tools/mhgu/mod-diff.mjs --selftest
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readArc, inflateEntry, packArc } from './arc.mjs';
import { readLmt, EVENT_SLOT_OFFSETS } from './lmt.mjs';
import {
  TYPE_HTS,
  TYPE_PMA,
  TYPE_FUP,
  TYPE_PSL,
  readHts,
  writeHts,
  readPma,
  writePma,
  readFup,
  writeFup,
  readPsl,
} from './player-combat.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, '..', '..', 'docs', 'data');
const DEFAULT_FUNCTIONS_CSV = path.join(DATA_DIR, 'functions-retile.csv.gz');
const DEFAULT_CLASS_TSV = path.join(DATA_DIR, 'class-inventory.tsv');
const DEFAULT_FLAT_PATH = path.resolve(HERE, '..', '..', 'main.140.flat.bin');
const DEFAULT_TEXT_END = 0x13F1DEC;
export const EXPECTED_NSOBID_140 = 'FB08F1D20FD1204FE7070672777F869B';

const TYPE_LMT = 0x76820d81;
const TYPE_HDP = 0x4e2ef008;

const hex32 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

let cachedSymbols = null;
let cachedArm32 = null;

async function loadDisassembler(flatPathOption) {
  const envFlat = process.env.FLAT;
  const candidate = flatPathOption
    ? path.resolve(flatPathOption)
    : (envFlat ? path.resolve(envFlat) : DEFAULT_FLAT_PATH);

  if (!fs.existsSync(candidate)) {
    return { available: false, flatPath: candidate, flatBuf: null, decode: null, textEnd: DEFAULT_TEXT_END };
  }
  const flatBuf = fs.readFileSync(candidate);
  if (!cachedArm32) {
    if (!process.env.FLAT || flatPathOption) process.env.FLAT = candidate;
    cachedArm32 = await import('./arm32.mjs');
  }
  return {
    available: true,
    flatPath: candidate,
    flatBuf,
    decode: cachedArm32.decode,
    textEnd: cachedArm32.TEXT_END ?? DEFAULT_TEXT_END,
  };
}

function decodeWithFlat(decodeFn, word, vaddr, flatBuf) {
  let asm = decodeFn(word, vaddr);
  if (!flatBuf) return asm;
  // Ensure `ldr rX, [pc, #imm] ; [0xaddr]=0xval` uses the caller's `flatBuf` even if `arm32.mjs` cached another buffer.
  const pcLit = /^(ldr(?:eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)?\s+\w+,\s+\[pc,\s+#(-?\d+)\])(?:\s+;\s+\[0x[0-9a-fA-F]+\]=0x[0-9a-fA-F]+)?$/.exec(asm);
  if (pcLit) {
    const off = Number.parseInt(pcLit[2], 10);
    const tgt = (vaddr + 8 + off) >>> 0;
    const flatOff = tgt + 0x100;
    if (flatOff + 4 <= flatBuf.length) {
      asm = `${pcLit[1]} ; [0x${tgt.toString(16)}]=0x${flatBuf.readUInt32LE(flatOff).toString(16)}`;
    } else {
      asm = pcLit[1];
    }
  }
  return asm;
}

export function loadSymbols({ functionsCsv = DEFAULT_FUNCTIONS_CSV, classTsv = DEFAULT_CLASS_TSV } = {}) {
  if (cachedSymbols && functionsCsv === DEFAULT_FUNCTIONS_CSV && classTsv === DEFAULT_CLASS_TSV) {
    return cachedSymbols;
  }
  const functions = [];
  if (fs.existsSync(functionsCsv)) {
    const raw = functionsCsv.endsWith('.gz')
      ? zlib.gunzipSync(fs.readFileSync(functionsCsv)).toString('utf8')
      : fs.readFileSync(functionsCsv, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const c1 = line.indexOf(',');
      const c2 = line.indexOf(',', c1 + 1);
      const c3 = line.indexOf(',', c2 + 1);
      const c4 = line.indexOf(',', c3 + 1);
      const c5 = line.indexOf(',', c4 + 1);
      if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0 || c5 < 0) continue;
      const start = Number.parseInt(line.slice(0, c1), 16);
      const end = Number.parseInt(line.slice(c1 + 1, c2), 16);
      const insns = Number.parseInt(line.slice(c2 + 1, c3), 10);
      const callers = line.slice(c3 + 1, c4);
      const callees = line.slice(c4 + 1, c5);
      let strings = line.slice(c5 + 1);
      if (strings.startsWith('"') && strings.endsWith('"')) strings = strings.slice(1, -1);
      functions.push({
        start,
        end,
        insns,
        callers: callers ? callers.split('|') : [],
        callees: callees ? callees.split('|') : [],
        strings,
      });
    }
    functions.sort((a, b) => a.start - b.start);
  }

  const classesByRegistrar = new Map();
  if (fs.existsSync(classTsv)) {
    const lines = fs.readFileSync(classTsv, 'utf8').split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split('\t');
      if (cols.length < 5) continue;
      const [family, name, sizeStr, regFnStr, regSiteStr] = cols;
      const regFn = Number.parseInt(regFnStr, 16);
      if (!Number.isFinite(regFn)) continue;
      const arr = classesByRegistrar.get(regFn) ?? [];
      arr.push({ family, name, size: Number.parseInt(sizeStr, 10), registrarFn: regFn, registrarSite: regSiteStr });
      classesByRegistrar.set(regFn, arr);
    }
  }

  const result = { functions, classesByRegistrar };
  if (functionsCsv === DEFAULT_FUNCTIONS_CSV && classTsv === DEFAULT_CLASS_TSV) {
    cachedSymbols = result;
  }
  return result;
}

export function findFunction(vaddr, functions) {
  let lo = 0;
  let hi = functions.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const fn = functions[mid];
    if (vaddr < fn.start) hi = mid - 1;
    else if (vaddr >= fn.end) lo = mid + 1;
    else return fn;
  }
  return null;
}

function parseIntSigned(token) {
  const m = /^([+-]?)(0x[0-9a-fA-F]+|[0-9]+)$/.exec(token.trim());
  if (!m) throw new Error(`invalid integer token ${JSON.stringify(token)}`);
  const sign = m[1] === '-' ? -1 : 1;
  const body = m[2];
  const val = body.startsWith('0x') || body.startsWith('0X')
    ? Number.parseInt(body.slice(2), 16)
    : Number.parseInt(body, 10);
  return sign * val;
}

/**
 * Parse a Switch Atmosphère `.pchtxt` file.
 */
export function parsePchtxt(text, label = '<pchtxt>') {
  if (typeof text !== 'string') throw new TypeError(`${label}: expected string`);
  const lines = text.split(/\r?\n/);
  let nsobid = null;
  let offsetShift = 0;
  let enabled = true;
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    let line = lines[i];
    const slashIdx = line.indexOf('//');
    if (slashIdx >= 0) line = line.slice(0, slashIdx);
    const hashIdx = line.indexOf('#');
    if (hashIdx >= 0) line = line.slice(0, hashIdx);
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('@')) {
      if (/^@stop\b/i.test(line)) break;
      if (/^@enabled\b/i.test(line)) { enabled = true; continue; }
      if (/^@disabled\b/i.test(line)) { enabled = false; continue; }
      const bid = /^@nsobid-([0-9a-fA-F]+)$/i.exec(line);
      if (bid) { nsobid = bid[1].toUpperCase(); continue; }
      const sh = /^@flag\s+offset_shift\s+(\S+)$/i.exec(line);
      if (sh) {
        offsetShift = parseIntSigned(sh[1]);
        continue;
      }
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      throw new Error(`${label}:${lineNo}: expected "<hex_offset> <hex_bytes>"`);
    }
    const offTok = parts[0];
    if (!/^(?:0x)?[0-9a-fA-F]+$/.test(offTok)) {
      throw new Error(`${label}:${lineNo}: invalid hex offset ${JSON.stringify(offTok)}`);
    }
    const rawOffset = Number.parseInt(offTok.replace(/^0x/i, ''), 16);
    const hexPayload = parts.slice(1).join('');
    if (!/^[0-9a-fA-F]+$/.test(hexPayload) || hexPayload.length % 2 !== 0) {
      throw new Error(`${label}:${lineNo}: invalid hex byte payload ${JSON.stringify(parts.slice(1).join(' '))}`);
    }
    const bytes = Buffer.from(hexPayload, 'hex');
    const effectiveOffset = rawOffset + offsetShift;
    if (effectiveOffset < 0) {
      throw new Error(`${label}:${lineNo}: negative effective offset ${effectiveOffset}`);
    }
    records.push({
      lineNo,
      rawOffset,
      offsetShift,
      offset: effectiveOffset,
      enabled,
      bytes,
    });
  }

  return { format: 'PCHTXT', nsobid, offsetShift, records };
}

/**
 * Parse a binary `.ips` (24-bit offsets, `PATCH`..`EOF`) or `IPS32` (32-bit offsets, `IPS32`..`EEOF`) patch.
 * Standard IPS treats `"EOF"` as terminator ONLY at `pos === buf.length - 3` (so mid-stream `0x454F46` offsets
 * parse cleanly as records and trailing garbage after `EOF`/`EEOF` is rejected).
 */
export function parseIps(buf, label = '<ips>') {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length < 8) throw new Error(`${label}: buffer too small (${buf.length} B) for IPS/IPS32`);
  const magic = buf.toString('latin1', 0, 5);
  let is32;
  if (magic === 'PATCH') is32 = false;
  else if (magic === 'IPS32') is32 = true;
  else throw new Error(`${label}: bad IPS magic ${JSON.stringify(magic)} (expected "PATCH" or "IPS32")`);

  const eofMarker = is32 ? 'EEOF' : 'EOF';
  const offWidth = is32 ? 4 : 3;
  const records = [];
  let pos = 5;

  while (pos < buf.length) {
    if (pos + eofMarker.length === buf.length && buf.toString('latin1', pos, buf.length) === eofMarker) {
      return { format: is32 ? 'IPS32' : 'IPS', records, trailingBytes: 0 };
    }
    if (pos + offWidth + 2 > buf.length) {
      throw new Error(`${label}: truncated record header or trailing bytes after ${eofMarker} at 0x${pos.toString(16)}`);
    }
    const offset = is32
      ? buf.readUInt32BE(pos)
      : ((buf[pos] << 16) | (buf[pos + 1] << 8) | buf[pos + 2]) >>> 0;
    pos += offWidth;
    const size = buf.readUInt16BE(pos);
    pos += 2;
    if (size === 0) {
      if (pos + 3 > buf.length) throw new Error(`${label}: truncated RLE record at 0x${pos.toString(16)}`);
      const rleSize = buf.readUInt16BE(pos);
      const rleByte = buf[pos + 2];
      pos += 3;
      if (rleSize === 0) throw new Error(`${label}: invalid zero-length RLE record at 0x${pos.toString(16)}`);
      records.push({ offset, size: rleSize, isRle: true, enabled: true, bytes: Buffer.alloc(rleSize, rleByte) });
    } else {
      if (pos + size > buf.length) {
        throw new Error(`${label}: truncated data payload at 0x${pos.toString(16)} (need ${size} B, have ${buf.length - pos} B)`);
      }
      records.push({ offset, size, isRle: false, enabled: true, bytes: buf.subarray(pos, pos + size) });
      pos += size;
    }
  }
  throw new Error(`${label}: missing ${eofMarker} terminator at EOF`);
}

function resolveAddress(rec, format, baseMode) {
  let mode = baseMode;
  if (mode === 'auto') {
    mode = (format === 'PCHTXT' && rec.offsetShift === -0x100) ? 'vaddr' : 'nso';
  }
  if (mode === 'vaddr') return { vaddr: rec.offset >>> 0, flatOffset: (rec.offset + 0x100) >>> 0, mode };
  if (mode === 'nso') return { vaddr: (rec.offset - 0x100) >>> 0, flatOffset: rec.offset >>> 0, mode };
  throw new Error(`unknown baseMode ${JSON.stringify(baseMode)} (expected auto|nso|vaddr)`);
}

function parseBranchTarget(asmText) {
  const m = /^(?:blx?|b(?:eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)?)\s+0x([0-9a-fA-F]+)$/.exec(asmText);
  return m ? Number.parseInt(m[1], 16) >>> 0 : null;
}

/**
 * Disassemble Original vs Patched ARM32 instructions and enrich with `functions-retile` & `class-inventory`.
 * Gracefully degrades to hex-only output if the flat image does not exist.
 */
export async function disassemblePatch(parsedPatch, { flatPath = null, flatBuf: explicitFlatBuf = null, baseMode = 'auto', symbols = loadSymbols() } = {}) {
  const disasm = explicitFlatBuf
    ? { available: true, flatBuf: explicitFlatBuf, ...(await loadDisassembler(flatPath)), flatBuf: explicitFlatBuf }
    : await loadDisassembler(flatPath);

  const flatBuf = disasm.flatBuf;
  const decodeFn = disasm.decode;
  const textEnd = disasm.textEnd;
  const hunks = [];

  for (const rec of parsedPatch.records) {
    const { vaddr, flatOffset, mode } = resolveAddress(rec, parsedPatch.format, baseMode);
    const len = rec.bytes.length;
    const inFlat = Boolean(flatBuf) && flatOffset + len <= flatBuf.length;
    const origBytes = inFlat ? flatBuf.subarray(flatOffset, flatOffset + len) : null;
    const fn = findFunction(vaddr, symbols.functions);
    const classes = fn ? (symbols.classesByRegistrar.get(fn.start) ?? []) : [];

    const isWordAligned = (len % 4 === 0) && (vaddr % 4 === 0);
    const instructions = [];
    const caveBranches = [];
    if (isWordAligned && decodeFn) {
      for (let off = 0; off < len; off += 4) {
        const wa = (vaddr + off) >>> 0;
        const patchedWord = rec.bytes.readUInt32LE(off);
        const patchedAsm = decodeWithFlat(decodeFn, patchedWord, wa, flatBuf);
        let origWord = null;
        let origAsm = flatBuf ? '<out-of-flat-bounds>' : '<flat-unavailable>';
        if (origBytes) {
          origWord = origBytes.readUInt32LE(off);
          origAsm = decodeWithFlat(decodeFn, origWord, wa, flatBuf);
        }
        const target = parseBranchTarget(patchedAsm);
        const isCaveJump = target !== null && (target >= textEnd || target === 0);
        if (target !== null && isCaveJump) {
          caveBranches.push({ from: wa, to: target, asm: patchedAsm });
        }
        instructions.push({
          vaddr: wa,
          origWord,
          origAsm,
          patchedWord,
          patchedAsm,
          branchTarget: target,
          isCaveJump,
        });
      }
    }

    hunks.push({
      enabled: rec.enabled !== false,
      rawOffset: rec.rawOffset ?? rec.offset,
      offset: rec.offset,
      vaddr,
      flatOffset,
      resolvedMode: mode,
      size: len,
      unalignedOrNonWord: !isWordAligned,
      rawHex: rec.bytes.toString('hex'),
      origHex: origBytes ? origBytes.toString('hex') : null,
      patchedHex: rec.bytes.toString('hex'),
      function: fn ? { start: fn.start, end: fn.end, insns: fn.insns, strings: fn.strings, callers: fn.callers.length, callees: fn.callees.length } : null,
      classes: classes.map(c => ({ family: c.family, name: c.name, size: c.size })),
      caveBranches,
      instructions,
    });
  }

  const nsobid = parsedPatch.nsobid ?? null;
  const nsobidMatch = nsobid ? nsobid === EXPECTED_NSOBID_140 : null;

  return {
    format: parsedPatch.format,
    nsobid,
    nsobidMatch,
    flatAvailable: Boolean(flatBuf),
    disasmAvailable: Boolean(decodeFn),
    offsetShift: parsedPatch.offsetShift ?? 0,
    recordCount: hunks.length,
    enabledCount: hunks.filter(h => h.enabled).length,
    hunks,
  };
}

function hashMotionTracks(buf, motion) {
  const h = crypto.createHash('sha256');
  const trackHashes = [];
  for (let i = 0; i < motion.tracks.length; i++) {
    const t = motion.tracks[i];
    const th = crypto.createHash('sha256');
    th.update(JSON.stringify({ type: t.type, usage: t.usage, bone: t.bone, weight: t.weight, byteSize: t.byteSize, ref: t.ref }));
    if (t.keyOffset && t.byteSize && t.keyOffset + t.byteSize <= buf.length) {
      th.update(buf.subarray(t.keyOffset, t.keyOffset + t.byteSize));
    }
    if (t.boundsOffset && t.boundsOffset + 32 <= buf.length) {
      th.update(buf.subarray(t.boundsOffset, t.boundsOffset + 32));
    }
    const digest = th.digest('hex');
    trackHashes.push(digest);
    h.update(digest);
  }
  return { overall: h.digest('hex'), perTrack: trackHashes };
}

function summarizeLmtDiff(baseBuf, modBuf) {
  const a = readLmt(baseBuf, 'base.lmt');
  const b = readLmt(modBuf, 'mod.lmt');
  const maxMotions = Math.max(a.motions.length, b.motions.length);
  const changedMotions = [];

  for (let i = 0; i < maxMotions; i++) {
    const ma = a.motions[i] ?? null;
    const mb = b.motions[i] ?? null;
    if (!ma && !mb) continue;
    if (!ma || !mb) {
      changedMotions.push({ index: i, kind: ma ? 'REMOVED' : 'ADDED', baseFrames: ma?.frameCount ?? null, modFrames: mb?.frameCount ?? null });
      continue;
    }
    const diffs = {};
    if (ma.frameCount !== mb.frameCount) diffs.frameCount = [ma.frameCount, mb.frameCount];
    if (ma.tracks.length !== mb.tracks.length) diffs.trackCount = [ma.tracks.length, mb.tracks.length];
    if (ma.flags !== mb.flags) diffs.flags = [ma.flags, mb.flags];
    if (ma.floatTrackOffset !== mb.floatTrackOffset) diffs.floatTrackOffset = [ma.floatTrackOffset, mb.floatTrackOffset];

    const slotChanges = [];
    for (let s = 0; s < EVENT_SLOT_OFFSETS.length; s++) {
      const sa = ma.eventSlots?.[s];
      const sb = mb.eventSlots?.[s];
      if (JSON.stringify(sa?.entries ?? []) !== JSON.stringify(sb?.entries ?? [])) {
        slotChanges.push({
          slot: s,
          relOffset: EVENT_SLOT_OFFSETS[s],
          baseEntries: sa?.entries ?? [],
          modEntries: sb?.entries ?? [],
        });
      }
    }
    if (slotChanges.length) diffs.eventSlots = slotChanges;

    const sigA = hashMotionTracks(baseBuf, ma);
    const sigB = hashMotionTracks(modBuf, mb);
    if (sigA.overall !== sigB.overall) {
      diffs.trackDataChanged = true;
      diffs.baseTrackSha256 = sigA.overall;
      diffs.modTrackSha256 = sigB.overall;
      const changedTracks = [];
      const maxT = Math.max(sigA.perTrack.length, sigB.perTrack.length);
      for (let t = 0; t < maxT; t++) {
        if (sigA.perTrack[t] !== sigB.perTrack[t]) changedTracks.push(t);
      }
      diffs.changedTracks = changedTracks;
    }

    if (Object.keys(diffs).length > 0) {
      changedMotions.push({ index: i, kind: 'MODIFIED', ...diffs });
    }
  }
  return {
    baseMotions: a.motions.length,
    modMotions: b.motions.length,
    changedCount: changedMotions.length,
    changedMotions,
  };
}

function parseHitTableHeader(buf) {
  if (buf.length < 16) return null;
  const magic = buf.toString('latin1', 0, 4);
  if (magic !== 'HDP\0' && magic !== 'HDE\0') return null;
  const version = buf.readUInt32LE(4);
  const count = buf.readUInt32LE(8);
  const body = buf.length - 16;
  const stride = count > 0 && body % count === 0 ? body / count : null;
  return { magic: magic.replace('\0', ''), version, count, stride };
}

function summarizeHitTableDiff(baseBuf, modBuf) {
  const ha = parseHitTableHeader(baseBuf);
  const hb = parseHitTableHeader(modBuf);
  if (!ha || !hb || !ha.stride || ha.stride !== hb.stride) {
    return { baseHeader: ha, modHeader: hb, note: 'non-uniform hit table header/stride' };
  }
  const stride = ha.stride;
  const maxCount = Math.max(ha.count, hb.count);
  const changedRecords = [];
  for (let i = 0; i < maxCount; i++) {
    const ra = i < ha.count ? baseBuf.subarray(16 + i * stride, 16 + (i + 1) * stride) : null;
    const rb = i < hb.count ? modBuf.subarray(16 + i * stride, 16 + (i + 1) * stride) : null;
    if (!ra || !rb) {
      changedRecords.push({ index: i, kind: ra ? 'REMOVED' : 'ADDED' });
      continue;
    }
    if (Buffer.compare(ra, rb) !== 0) {
      const wordDiffs = [];
      for (let off = 0; off + 4 <= stride; off += 4) {
        const wa = ra.readUInt32LE(off);
        const wb = rb.readUInt32LE(off);
        if (wa !== wb) {
          wordDiffs.push({
            offset: off,
            baseU32: wa,
            modU32: wb,
            baseF32: Number(ra.readFloatLE(off).toFixed(4)),
            modF32: Number(rb.readFloatLE(off).toFixed(4)),
          });
        }
      }
      changedRecords.push({ index: i, kind: 'MODIFIED', wordDiffs });
    }
  }
  return { magic: ha.magic, stride, baseCount: ha.count, modCount: hb.count, changedCount: changedRecords.length, changedRecords };
}

function roundNum(v) {
  if (Object.is(v, -0)) return -0;
  return Number.isFinite(v) ? Number(v.toFixed(4)) : v;
}

function sameVec3(a, b) {
  return Object.is(a[0], b[0]) && Object.is(a[1], b[1]) && Object.is(a[2], b[2]);
}

function summarizeHtsDiff(baseData, modData) {
  const a = readHts(baseData, 'base.hts');
  const b = readHts(modData, 'mod.hts');
  const maxGroups = Math.max(a.groups.length, b.groups.length);
  const changedGroups = [];

  for (let g = 0; g < maxGroups; g++) {
    const ga = a.groups[g] ?? null;
    const gb = b.groups[g] ?? null;
    if (!ga || !gb) {
      changedGroups.push({
        group: g,
        kind: ga ? 'REMOVED' : 'ADDED',
        baseItemCount: ga?.itemCount ?? null,
        modItemCount: gb?.itemCount ?? null,
      });
      continue;
    }
    const maxItems = Math.max(ga.items.length, gb.items.length);
    const changedItems = [];
    for (let i = 0; i < maxItems; i++) {
      const ia = ga.items[i] ?? null;
      const ib = gb.items[i] ?? null;
      if (!ia || !ib) {
        const ref = ia ?? ib;
        changedItems.push({
          item: i,
          kind: ia ? 'REMOVED' : 'ADDED',
          radius: roundNum(ref.radius),
          p0: ref.p0.map(roundNum),
          p1: ref.p1.map(roundNum),
        });
        continue;
      }
      const diffs = {};
      if (ia.boneA !== ib.boneA) diffs.boneA = [ia.boneA, ib.boneA];
      if (ia.boneB !== ib.boneB) diffs.boneB = [ia.boneB, ib.boneB];
      if (ia.shapeType !== ib.shapeType) diffs.shapeType = [ia.shapeType, ib.shapeType];
      if (ia.subFlags !== ib.subFlags) diffs.subFlags = [ia.subFlags, ib.subFlags];
      if (ia.condFlags !== ib.condFlags) diffs.condFlags = [ia.condFlags, ib.condFlags];
      if (!Object.is(ia.radius, ib.radius)) diffs.radius = [roundNum(ia.radius), roundNum(ib.radius)];
      if (!sameVec3(ia.p0, ib.p0)) diffs.p0 = [ia.p0.map(roundNum), ib.p0.map(roundNum)];
      if (!Object.is(ia.pad0, ib.pad0)) diffs.pad0 = [roundNum(ia.pad0), roundNum(ib.pad0)];
      if (!sameVec3(ia.p1, ib.p1)) diffs.p1 = [ia.p1.map(roundNum), ib.p1.map(roundNum)];
      if (!Object.is(ia.pad1, ib.pad1)) diffs.pad1 = [roundNum(ia.pad1), roundNum(ib.pad1)];
      if (Object.keys(diffs).length > 0) {
        changedItems.push({ item: i, kind: 'MODIFIED', ...diffs });
      }
    }
    if (ga.itemCount !== gb.itemCount || changedItems.length > 0) {
      changedGroups.push({
        group: g,
        kind: 'MODIFIED',
        baseItemCount: ga.itemCount,
        modItemCount: gb.itemCount,
        changedItems,
      });
    }
  }
  return {
    baseGroupCount: a.groupCount,
    modGroupCount: b.groupCount,
    baseTotalItems: a.totalItems,
    modTotalItems: b.totalItems,
    changedCount: changedGroups.length,
    changedGroups,
  };
}

function summarizePmaDiff(baseData, modData) {
  const a = readPma(baseData, 'base.pma');
  const b = readPma(modData, 'mod.pma');
  const maxCount = Math.max(a.records.length, b.records.length);
  const changedRecords = [];
  for (let i = 0; i < maxCount; i++) {
    const ra = a.records[i] ?? null;
    const rb = b.records[i] ?? null;
    if (!ra || !rb) {
      const ref = ra ?? rb;
      changedRecords.push({
        index: i,
        kind: ra ? 'REMOVED' : 'ADDED',
        frame: roundNum(ref.frame),
        hitDataIndex: ref.hitDataIndex,
        hitWorkId: ref.hitWorkId,
        atkType: ref.atkType,
      });
      continue;
    }
    const diffs = {};
    if (!Object.is(ra.frame, rb.frame)) diffs.frame = [roundNum(ra.frame), roundNum(rb.frame)];
    if (ra.hitDataIndex !== rb.hitDataIndex) diffs.hitDataIndex = [ra.hitDataIndex, rb.hitDataIndex];
    if (ra.hitWorkId !== rb.hitWorkId) diffs.hitWorkId = [ra.hitWorkId, rb.hitWorkId];
    if (ra.atkType !== rb.atkType) diffs.atkType = [ra.atkType, rb.atkType];
    if (Object.keys(diffs).length > 0) {
      changedRecords.push({ index: i, kind: 'MODIFIED', ...diffs });
    }
  }
  return {
    baseCount: a.count,
    modCount: b.count,
    changedCount: changedRecords.length,
    changedRecords,
  };
}

function diffParamSlots(arrA, arrB, equalFn, mapFn) {
  const maxLen = Math.max(arrA.length, arrB.length);
  const changes = [];
  for (let i = 0; i < maxLen; i++) {
    const hasA = i < arrA.length;
    const hasB = i < arrB.length;
    if (!hasA || !hasB) {
      changes.push({
        index: i,
        kind: hasA ? 'REMOVED' : 'ADDED',
        base: hasA ? mapFn(arrA[i]) : null,
        mod: hasB ? mapFn(arrB[i]) : null,
      });
      continue;
    }
    if (!equalFn(arrA[i], arrB[i])) {
      changes.push({
        index: i,
        kind: 'MODIFIED',
        base: mapFn(arrA[i]),
        mod: mapFn(arrB[i]),
      });
    }
  }
  return changes;
}

function summarizeFupDiff(baseData, modData) {
  const a = readFup(baseData, 'base.fup');
  const b = readFup(modData, 'mod.fup');
  const changedInts = diffParamSlots(a.ints, b.ints, Object.is, x => x);
  const changedFloats = diffParamSlots(a.floats, b.floats, Object.is, roundNum);
  const changedVecs = diffParamSlots(a.vecs, b.vecs, sameVec3, v => v.map(roundNum));
  return {
    baseCounts: { ints: a.intCount, floats: a.floatCount, vecs: a.vec3Count },
    modCounts: { ints: b.intCount, floats: b.floatCount, vecs: b.vec3Count },
    changedIntCount: changedInts.length,
    changedFloatCount: changedFloats.length,
    changedVecCount: changedVecs.length,
    changedInts,
    changedFloats,
    changedVecs,
  };
}

function summarizePslSlot(s) {
  return {
    frameCount: s.frameCount,
    param4: s.param4,
    param6: s.param6,
    flags: s.flags,
    reserved: s.reserved,
    channelFlags: s.sub?.channelFlags ?? null,
    uniqueIds: s.sub?.uniqueIds ?? [],
    timelineCount: s.sub?.timelineCount ?? null,
    timeline: s.sub?.timeline ?? null,
  };
}

function summarizePslDiff(baseData, modData) {
  const a = readPsl(baseData, 'base.psl');
  const b = readPsl(modData, 'mod.psl');
  const maxSlots = Math.max(a.slots.length, b.slots.length);
  const changedSlots = [];
  for (let i = 0; i < maxSlots; i++) {
    const sa = a.slots[i] ?? null;
    const sb = b.slots[i] ?? null;
    if (!sa && !sb) continue;
    if (!sa || !sb) {
      changedSlots.push({
        slot: i,
        kind: sa ? 'REMOVED' : 'ADDED',
        base: sa ? summarizePslSlot(sa) : null,
        mod: sb ? summarizePslSlot(sb) : null,
      });
      continue;
    }
    const pa = summarizePslSlot(sa);
    const pb = summarizePslSlot(sb);
    const diffs = {};
    if (pa.frameCount !== pb.frameCount) diffs.frameCount = [pa.frameCount, pb.frameCount];
    if (pa.param4 !== pb.param4) diffs.param4 = [pa.param4, pb.param4];
    if (pa.param6 !== pb.param6) diffs.param6 = [pa.param6, pb.param6];
    if (pa.flags !== pb.flags) diffs.flags = [pa.flags, pb.flags];
    if (pa.reserved !== pb.reserved) diffs.reserved = [pa.reserved, pb.reserved];
    if (pa.channelFlags !== pb.channelFlags) diffs.channelFlags = [pa.channelFlags, pb.channelFlags];
    if (pa.timelineCount !== pb.timelineCount) diffs.timelineCount = [pa.timelineCount, pb.timelineCount];
    if (JSON.stringify(pa.uniqueIds) !== JSON.stringify(pb.uniqueIds)) diffs.uniqueIds = [pa.uniqueIds, pb.uniqueIds];
    if (JSON.stringify(pa.timeline) !== JSON.stringify(pb.timeline)) diffs.timeline = [pa.timeline, pb.timeline];
    if (Object.keys(diffs).length > 0) {
      changedSlots.push({ slot: i, kind: 'MODIFIED', ...diffs });
    }
  }
  return {
    baseCount: a.count,
    modCount: b.count,
    baseNonEmptyCount: a.nonEmptyCount,
    modNonEmptyCount: b.nonEmptyCount,
    changedCount: changedSlots.length,
    changedSlots,
  };
}

function summarizeSemanticDiff(typeHash, baseData, modData) {
  try {
    const th = typeHash >>> 0;
    if (th === TYPE_LMT || (baseData.toString('latin1', 0, 3) === 'LMT' && modData.toString('latin1', 0, 3) === 'LMT')) {
      return { kind: 'LMT', ...summarizeLmtDiff(baseData, modData) };
    }
    const mA = baseData.subarray(0, 4).toString('latin1');
    const mB = modData.subarray(0, 4).toString('latin1');
    if (th === TYPE_HDP || ((mA === 'HDP\0' || mA === 'HDE\0') && mA === mB)) {
      return { kind: mA.replace('\0', ''), ...summarizeHitTableDiff(baseData, modData) };
    }
    if (th === TYPE_HTS || (mA === 'HTS\0' && mA === mB)) {
      return { kind: 'HTS', ...summarizeHtsDiff(baseData, modData) };
    }
    if (th === TYPE_PMA) {
      return { kind: 'PMA', ...summarizePmaDiff(baseData, modData) };
    }
    if (th === TYPE_FUP || (mA === 'FUP\0' && mA === mB)) {
      return { kind: 'FUP', ...summarizeFupDiff(baseData, modData) };
    }
    if (th === TYPE_PSL || (mA === 'PSL\0' && mA === mB)) {
      return { kind: 'PSL', ...summarizePslDiff(baseData, modData) };
    }
  } catch (err) {
    return { kind: 'PARSE_ERROR', error: err.message };
  }
  const magic = modData.length >= 4 ? modData.subarray(0, 4).toString('latin1').replace(/[^\x20-\x7e]/g, '.') : '';
  return { kind: 'RAW', magic, baseSize: baseData.length, modSize: modData.length };
}

function indexArcEntries(entries) {
  const counts = new Map();
  const map = new Map();
  const keys = [];
  for (const e of entries) {
    const baseKey = `${e.name}.${(e.typeHash >>> 0).toString(16).padStart(8, '0')}`;
    const n = counts.get(baseKey) ?? 0;
    counts.set(baseKey, n + 1);
    const key = n === 0 ? baseKey : `${baseKey}#${n}`;
    map.set(key, e);
    keys.push(key);
  }
  return { map, keys };
}

/**
 * Compare two `.arc` containers: entry additions, removals, order/flags changes, SHA-256 payload changes, and LMT/HDP diffs.
 */
export function diffArcs(baseBuf, modBuf, { baseLabel = 'base.arc', modLabel = 'mod.arc' } = {}) {
  const a = readArc(baseBuf, baseLabel);
  const b = readArc(modBuf, modLabel);
  const idxA = indexArcEntries(a.entries);
  const idxB = indexArcEntries(b.entries);

  const added = [];
  const removed = [];
  const modified = [];
  const reordered = [];
  let identicalCount = 0;

  const commonA = idxA.keys.filter(k => idxB.map.has(k));
  const commonB = idxB.keys.filter(k => idxA.map.has(k));
  const orderChanged = commonA.length !== commonB.length || commonA.some((k, idx) => commonB[idx] !== k);
  const posB = new Map(commonB.map((k, idx) => [k, idx]));
  for (let i = 0; i < commonA.length; i++) {
    const k = commonA[i];
    if (posB.get(k) !== i) {
      const ea = idxA.map.get(k);
      const eb = idxB.map.get(k);
      reordered.push({ name: ea.name, typeHash: hex32(ea.typeHash), baseIndex: ea.index, modIndex: eb.index });
    }
  }

  for (const [key, ea] of idxA.map) {
    const eb = idxB.map.get(key);
    if (!eb) {
      const da = inflateEntry(baseBuf, ea, baseLabel);
      removed.push({ name: ea.name, typeHash: hex32(ea.typeHash), size: ea.size, sha256: sha256(da) });
      continue;
    }
    const da = inflateEntry(baseBuf, ea, baseLabel);
    const db = inflateEntry(modBuf, eb, modLabel);
    const ha = sha256(da);
    const hb = sha256(db);
    if (ha === hb && ea.typeHash === eb.typeHash && ea.flags === eb.flags) {
      identicalCount++;
      continue;
    }
    const flagsChanged = ea.flags !== eb.flags ? [hex32(ea.flags), hex32(eb.flags)] : null;
    modified.push({
      name: eb.name,
      typeHash: hex32(eb.typeHash),
      baseSize: da.length,
      modSize: db.length,
      baseSha256: ha,
      modSha256: hb,
      flagsChanged,
      semantic: ha === hb && flagsChanged
        ? { kind: 'FLAGS_ONLY', flagsChanged }
        : summarizeSemanticDiff(eb.typeHash, da, db),
    });
  }

  for (const [key, eb] of idxB.map) {
    if (idxA.map.has(key)) continue;
    const db = inflateEntry(modBuf, eb, modLabel);
    added.push({ name: eb.name, typeHash: hex32(eb.typeHash), size: eb.size, sha256: sha256(db) });
  }

  return {
    baseCount: a.count,
    modCount: b.count,
    identicalCount,
    orderChanged,
    reorderedCount: reordered.length,
    reordered,
    added,
    removed,
    modified,
  };
}

function* walkDir(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const items = fs.readdirSync(cur, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(cur, it.name);
      if (it.isDirectory()) stack.push(full);
      else if (it.isFile()) yield full;
    }
  }
}

function resolveBaselineArc(relPath, romfsDir) {
  if (!romfsDir) return null;
  const norm = relPath.replace(/\\/g, '/');
  const idx = norm.toLowerCase().indexOf('romfs/');
  const sub = idx >= 0 ? norm.slice(idx + 'romfs/'.length) : norm;
  const candidate = path.join(romfsDir, sub);
  return fs.existsSync(candidate) ? candidate : null;
}

export async function diffModDirectory(modRoot, { romfsDir = null, flatPath = null, flatBuf = null, baseMode = 'auto' } = {}) {
  if (!fs.existsSync(modRoot) || !fs.statSync(modRoot).isDirectory()) {
    throw new Error(`mod root does not exist or is not a directory: ${modRoot}`);
  }
  const symbols = loadSymbols();
  const patches = [];
  const arcDiffs = [];
  const otherFiles = [];
  const errors = [];

  for (const full of walkDir(modRoot)) {
    const rel = path.relative(modRoot, full);
    const lower = full.toLowerCase();
    try {
      if (lower.endsWith('.pchtxt')) {
        const parsed = parsePchtxt(fs.readFileSync(full, 'utf8'), rel);
        patches.push({ file: rel, ...(await disassemblePatch(parsed, { flatPath, flatBuf, baseMode, symbols })) });
      } else if (lower.endsWith('.ips')) {
        const parsed = parseIps(fs.readFileSync(full), rel);
        patches.push({ file: rel, ...(await disassemblePatch(parsed, { flatPath, flatBuf, baseMode, symbols })) });
      } else if (lower.endsWith('.arc')) {
        const basePath = resolveBaselineArc(rel, romfsDir);
        if (basePath) {
          arcDiffs.push({
            file: rel,
            baseline: basePath,
            ...diffArcs(fs.readFileSync(basePath), fs.readFileSync(full), { baseLabel: basePath, modLabel: rel }),
          });
        } else {
          const modArc = readArc(fs.readFileSync(full), rel);
          arcDiffs.push({ file: rel, baseline: null, modCount: modArc.count, note: 'no matching baseline .arc found' });
        }
      } else {
        otherFiles.push({ file: rel, size: fs.statSync(full).size });
      }
    } catch (err) {
      errors.push({ file: rel, error: err.message });
    }
  }

  return { modRoot, romfsDir, patches, arcDiffs, otherFiles, errors };
}

function formatPatchMarkdown(p) {
  const lines = [`### Patch: \`${p.file ?? '<input>'}\` (${p.format}, ${p.enabledCount}/${p.recordCount} enabled)`];
  if (p.nsobid) {
    const status = p.nsobidMatch === true ? 'matches MHGU 1.4.0' : `MISMATCH (expected ${EXPECTED_NSOBID_140})`;
    lines.push(`- NSOBID: \`${p.nsobid}\` (${status})`);
  }
  if (!p.flatAvailable) lines.push('- Note: `main.140.flat.bin` not loaded; showing raw hex hunks without ARM32 disassembly.');
  for (const h of p.hunks) {
    const fnInfo = h.function ? `in \`${hex32(h.function.start)}..${hex32(h.function.end)}\` (${h.function.insns} insns)` : 'outside known function';
    const clsInfo = h.classes.length ? ` [${h.classes.map(c => c.name).join(', ')}]` : '';
    lines.push(`- \`${hex32(h.vaddr)}\` (flat \`${hex32(h.flatOffset)}\`, ${h.size} B, ${h.enabled ? 'enabled' : 'disabled'}) — ${fnInfo}${clsInfo}`);
    if (h.instructions.length > 0) {
      for (const insn of h.instructions) {
        const cave = insn.isCaveJump ? ' **[CODE CAVE JUMP]**' : '';
        lines.push(`  - \`${hex32(insn.vaddr)}\`: \`${insn.origAsm}\` -> \`${insn.patchedAsm}\`${cave}`);
      }
    } else {
      lines.push(`  - raw bytes (${h.unalignedOrNonWord ? 'non-4B/unaligned' : 'no-disasm'}): \`${h.origHex ?? 'n/a'}\` -> \`${h.rawHex}\``);
    }
  }
  return lines.join('\n');
}

function formatArcMarkdown(d, label = 'ARC Diff') {
  const lines = [
    `### ${label}`,
    `- Entries: base=${d.baseCount}, mod=${d.modCount}, identical=${d.identicalCount}, added=${d.added.length}, removed=${d.removed.length}, modified=${d.modified.length}, reordered=${d.reorderedCount ?? 0}`,
  ];
  for (const a of d.added) lines.push(`- [ADDED] \`${a.name}\` (${a.typeHash}, ${a.size} B)`);
  for (const r of d.removed) lines.push(`- [REMOVED] \`${r.name}\` (${r.typeHash}, ${r.size} B)`);
  for (const m of d.modified) {
    const flagNote = m.flagsChanged ? `, flags=${m.flagsChanged[0]}->${m.flagsChanged[1]}` : '';
    lines.push(`- [MODIFIED] \`${m.name}\` (${m.typeHash}, ${m.baseSize} -> ${m.modSize} B, kind=${m.semantic.kind}${flagNote})`);
    if (m.semantic.kind === 'LMT') {
      for (const cm of m.semantic.changedMotions.slice(0, 20)) {
        const tags = [];
        if (cm.eventSlots) tags.push(`eventSlots=[${cm.eventSlots.map(s => `slot${s.slot}`).join(',')}]`);
        if (cm.trackDataChanged) tags.push(`tracks=[${cm.changedTracks.join(',')}]`);
        if (cm.flags) tags.push(`flags=${cm.flags[0]}->${cm.flags[1]}`);
        lines.push(`  - motion[${cm.index}] (${cm.kind}) ${tags.join(' ')}`.trimEnd());
      }
    } else if (m.semantic.kind === 'HDP' || m.semantic.kind === 'HDE') {
      lines.push(`  - ${m.semantic.changedCount ?? 0} changed record(s) (stride=${m.semantic.stride ?? '?'})`);
    } else if (m.semantic.kind === 'HTS') {
      lines.push(`  - groups ${m.semantic.baseGroupCount}->${m.semantic.modGroupCount}, items ${m.semantic.baseTotalItems}->${m.semantic.modTotalItems}, changedGroups=${m.semantic.changedCount}`);
    } else if (m.semantic.kind === 'PMA') {
      lines.push(`  - triggers ${m.semantic.baseCount}->${m.semantic.modCount}, changedRecords=${m.semantic.changedCount}`);
    } else if (m.semantic.kind === 'FUP') {
      lines.push(`  - changed ints=${m.semantic.changedIntCount}, floats=${m.semantic.changedFloatCount}, vecs=${m.semantic.changedVecCount}`);
    } else if (m.semantic.kind === 'PSL') {
      lines.push(`  - nonEmpty slots ${m.semantic.baseNonEmptyCount}->${m.semantic.modNonEmptyCount}, changedSlots=${m.semantic.changedCount}`);
    } else if (m.semantic.kind === 'PARSE_ERROR') {
      lines.push(`  - parse error: ${m.semantic.error ?? 'unknown error'}`);
    }
  }
  return lines.join('\n');
}

export async function runSelfTest() {
  const failures = [];
  const assert = (cond, msg) => { if (!cond) failures.push(msg); };

  // 1. Positive + negative PCHTXT
  const pchOk = parsePchtxt([
    '@nsobid-FB08F1D20FD1204FE7070672777F869B',
    '@flag offset_shift -0x100',
    '@enabled',
    '00b49fe8 0000A0E1 // mov r0, r0',
    '@disabled',
    '00b49fec 0100A0E1',
    '@stop',
    '00b49ff0 DEADBEEF',
  ].join('\n'), 'selftest.pchtxt');
  assert(pchOk.nsobid === EXPECTED_NSOBID_140, 'pchtxt nsobid parsed');
  assert(pchOk.records.length === 2, 'pchtxt @stop halts further records');
  assert(pchOk.records[0].offset === 0x00b49ee8 && pchOk.records[0].enabled === true, 'pchtxt offset_shift & enabled');
  assert(pchOk.records[1].enabled === false, 'pchtxt @disabled flag');

  let badPchThrew = false;
  try { parsePchtxt('00b49fe8 XYZ', 'bad.pchtxt'); } catch { badPchThrew = true; }
  assert(badPchThrew, 'negative: malformed pchtxt hex rejected');

  // 2. Positive + negative IPS & IPS32 (including 0x454F46 EOF collision + trailing garbage rejection)
  const ipsCollisionBuf = Buffer.concat([
    Buffer.from('PATCH', 'latin1'),
    Buffer.from([0x00, 0x10, 0x00, 0x00, 0x04, 0x01, 0x02, 0x03, 0x04]),
    Buffer.from([0x45, 0x4f, 0x46, 0x00, 0x04, 0xaa, 0xbb, 0xcc, 0xdd]), // offset === 0x454F46 ("EOF")!
    Buffer.from([0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x04, 0xee]),       // RLE 4x 0xee
    Buffer.from('EOF', 'latin1'),
  ]);
  const ipsOk = parseIps(ipsCollisionBuf, 'collision.ips');
  assert(ipsOk.format === 'IPS' && ipsOk.records.length === 3 && ipsOk.records[1].offset === 0x454f46 && ipsOk.records[2].isRle, 'IPS 0x454F46 collision + 3 records + RLE parsed');

  const ips32Buf = Buffer.concat([
    Buffer.from('IPS32', 'latin1'),
    Buffer.from([0x00, 0xb4, 0x9f, 0xe8, 0x00, 0x04, 0x00, 0x00, 0xa0, 0xe1]),
    Buffer.from('EEOF', 'latin1'),
  ]);
  const ips32Ok = parseIps(ips32Buf, 'selftest32.ips');
  assert(ips32Ok.format === 'IPS32' && ips32Ok.records[0].offset === 0x00b49fe8, 'IPS32 parsed');

  let badIpsThrew = false;
  try { parseIps(Buffer.from('BADMAGIC', 'latin1'), 'bad.ips'); } catch { badIpsThrew = true; }
  assert(badIpsThrew, 'negative: bad IPS magic rejected');

  let trailingIpsThrew = false;
  try { parseIps(Buffer.concat([ipsCollisionBuf, Buffer.from('GARBAGE')]), 'trail.ips'); } catch { trailingIpsThrew = true; }
  assert(trailingIpsThrew, 'negative: IPS trailing garbage after EOF rejected');

  let trailingIps32Threw = false;
  try { parseIps(Buffer.concat([ips32Buf, Buffer.from('1234567')]), 'trail32.ips'); } catch { trailingIps32Threw = true; }
  assert(trailingIps32Threw, 'negative: IPS32 trailing garbage after EEOF rejected');

  // 3. Disassembly + unaligned 2B hunk rawHex fallback + missing flat graceful degradation
  const dis = await disassemblePatch(ips32Ok);
  assert(dis.hunks[0].vaddr === 0x00b49ee8, 'IPS32 NSO header subtraction -> vaddr 0x00b49ee8');
  assert(dis.hunks[0].function !== null, 'real functions-retile.csv.gz resolved LMT loader function');
  assert(dis.nsobidMatch === null, 'IPS32 nsobidMatch is null');

  const unalignedPch = parsePchtxt('00100102 AABB\n', '2b.pchtxt');
  const dis2b = await disassemblePatch(unalignedPch, { flatBuf: Buffer.alloc(0x2000) });
  assert(dis2b.hunks[0].unalignedOrNonWord === true && dis2b.hunks[0].rawHex === 'aabb', 'non-4B hunk retains rawHex');

  // 4. Synthetic ARC diff (ADDED, REMOVED, MODIFIED LMT+0x34, LMT keyframe-only change, HDP, flags/order) + negative bad magic
  function makeSyntheticLmt(maskVal, keyByte = 0x11) {
    const b = Buffer.alloc(0x240, 0);
    b.write('LMT\0', 0, 'latin1');
    b.writeUInt16LE(0x43, 4);
    b.writeUInt16LE(1, 6);
    b.writeUInt32LE(0x10, 8); // motion[0] @ 0x10
    b.writeUInt32LE(0x190, 0x10); // trackList @ 0x190
    b.writeUInt32LE(1, 0x14); // 1 track
    b.writeUInt32LE(60, 0x18); // 60 frames
    b.writeUInt32LE(0x50, 0x10 + 0x34); // p34 @ 0x50
    b.writeUInt32LE(2, 0x50 + 0x40);
    b.writeUInt32LE(0x170, 0x50 + 0x44);
    b.writeUInt32LE(maskVal, 0x170);
    b.writeUInt32LE(30, 0x174);
    b.writeUInt32LE(0, 0x178);
    b.writeUInt32LE(30, 0x17c);
    for (const rel of [0x88, 0xd0, 0x118]) {
      b.writeUInt32LE(1, 0x50 + rel);
      b.writeUInt32LE(0x180, 0x50 + rel + 4);
    }
    b.writeUInt32LE(0, 0x180);
    b.writeUInt32LE(60, 0x184);
    // Track[0] @ 0x190 (0x24 B): type=6, byteSize=8, keyOffset=0x1c0
    b[0x190] = 6;
    b.writeUInt32LE(8, 0x190 + 8);
    b.writeUInt32LE(0x1c0, 0x190 + 12);
    b[0x1c0] = keyByte;
    return b;
  }
  function makeSyntheticHdp(mvVal) {
    const b = Buffer.alloc(16 + 56, 0);
    b.write('HDP\0', 0, 'latin1');
    b.writeUInt32LE(0x20160209, 4);
    b.writeUInt32LE(1, 8);
    b.writeUInt32LE(mvVal, 16);
    return b;
  }

  function makeSyntheticPsl(slotFlags, uniqueId, timelineMask) {
    const b = Buffer.alloc(0x320, 0);
    b.write('PSL\0', 0, 'latin1');
    b.writeUInt16LE(2, 4);
    b.writeUInt16LE(2, 6);
    b.writeUInt32LE(0x10, 8); // slot[0] @ 0x10
    if (slotFlags !== null) b.writeUInt32LE(0x20, 12); // slot[1] @ 0x20
    const writeSlot = (eOff, subOff, uid, mask) => {
      b.writeUInt32LE(30, eOff);
      b[eOff + 7] = 0;
      b.writeUInt32LE(subOff, eOff + 8);
      b.writeUInt32LE(uid ? 1 : 0, subOff);
      b.writeUInt16LE(uid, subOff + 4);
      b.writeUInt32LE(1, subOff + 0x144);
      const tlOff = subOff + 0x14c;
      b.writeUInt32LE(tlOff, subOff + 0x148);
      b.writeUInt32LE(mask, tlOff);
      b.writeUInt32LE(30, tlOff + 4);
    };
    writeSlot(0x10, 0x30, 100, 1);
    if (slotFlags !== null) {
      writeSlot(0x20, 0x190, uniqueId, timelineMask);
      b[0x20 + 7] = slotFlags;
    }
    return b;
  }

  const htsA = writeHts({ groups: [{ items: [{ boneA: 8, boneB: 8, shapeType: 1, subFlags: 0, condFlags: 0, radius: 52, p0: [0, 0, 100], pad0: 0, p1: [0, 0, 220], pad1: 0 }] }] });
  const htsB = writeHts({ groups: [{ items: [{ boneA: 8, boneB: 8, shapeType: 1, subFlags: 0, condFlags: 0, radius: 75, p0: [0, 0, 100], pad0: 0, p1: [0, 0, 260], pad1: 0 }] }] });
  const pmaA = writePma({ records: [{ frame: 10, hitDataIndex: 5, hitWorkId: 0, atkType: 1 }] });
  const pmaB = writePma({ records: [{ frame: 12, hitDataIndex: 9, hitWorkId: 0, atkType: 1 }, { frame: 20, hitDataIndex: 10, hitWorkId: 1, atkType: 2 }] });
  const fupA = writeFup({ ints: [-1, 5], floats: [1.0, 2.5], vecs: [[1, 2, 3]] });
  const fupB = writeFup({ ints: [-1, 9], floats: [1.0, 3.5], vecs: [[1, 2, 4]] });
  const pslA = makeSyntheticPsl(null, 0, 0);
  const pslB = makeSyntheticPsl(0, 213, 1);

  const arcA = packArc([
    { name: 'player\\mot\\w07\\w07', typeHash: TYPE_LMT, data: makeSyntheticLmt(0x1, 0x11) },
    { name: 'player\\mot\\w07\\w07_kf', typeHash: TYPE_LMT, data: makeSyntheticLmt(0x1, 0x11) },
    { name: 'player\\hit\\pl_we07_hitdata', typeHash: TYPE_HDP, data: makeSyntheticHdp(28) },
    { name: 'player\\hit\\pl_we07_hitsize', typeHash: TYPE_HTS, data: htsA },
    { name: 'player\\pma\\w07\\w07_000', typeHash: TYPE_PMA, data: pmaA },
    { name: 'player\\param\\pl_w07', typeHash: TYPE_FUP, data: fupA },
    { name: 'effect\\psl\\player\\mot\\w07\\w07', typeHash: TYPE_PSL, data: pslA },
    { name: 'old\\removed', typeHash: 0x11111111, data: Buffer.from('old') },
    { name: 'same\\keep', typeHash: 0x22222222, data: Buffer.from('same') },
  ]);
  const arcB = packArc([
    { name: 'same\\keep', typeHash: 0x22222222, data: Buffer.from('same') }, // reordered!
    { name: 'player\\mot\\w07\\w07', typeHash: TYPE_LMT, data: makeSyntheticLmt(0x2, 0x11) },
    { name: 'player\\mot\\w07\\w07_kf', typeHash: TYPE_LMT, data: makeSyntheticLmt(0x1, 0x99) }, // keyframes only!
    { name: 'player\\hit\\pl_we07_hitdata', typeHash: TYPE_HDP, data: makeSyntheticHdp(42) },
    { name: 'player\\hit\\pl_we07_hitsize', typeHash: TYPE_HTS, data: htsB },
    { name: 'player\\pma\\w07\\w07_000', typeHash: TYPE_PMA, data: pmaB },
    { name: 'player\\param\\pl_w07', typeHash: TYPE_FUP, data: fupB },
    { name: 'effect\\psl\\player\\mot\\w07\\w07', typeHash: TYPE_PSL, data: pslB },
    { name: 'new\\added', typeHash: 0x33333333, data: Buffer.from('new') },
  ]);
  const arcDiff = diffArcs(arcA, arcB);
  assert(arcDiff.identicalCount === 1, 'arc diff identical count = 1');
  assert(arcDiff.orderChanged === true && arcDiff.reorderedCount > 0, 'arc diff detects reordering');
  assert(arcDiff.added.length === 1 && arcDiff.added[0].name === 'new\\added', 'arc diff ADDED detected');
  assert(arcDiff.removed.length === 1 && arcDiff.removed[0].name === 'old\\removed', 'arc diff REMOVED detected');
  assert(arcDiff.modified.length === 7, 'arc diff MODIFIED count = 7');
  const lmtMod = arcDiff.modified.find(m => m.name === 'player\\mot\\w07\\w07');
  assert(lmtMod && lmtMod.semantic.changedMotions[0].eventSlots[0].modEntries[0].mask === 0x2, 'LMT +0x34 event diff detected');
  const lmtKfMod = arcDiff.modified.find(m => m.name === 'player\\mot\\w07\\w07_kf');
  assert(lmtKfMod && lmtKfMod.semantic.changedCount === 1 && lmtKfMod.semantic.changedMotions[0].trackDataChanged === true, 'LMT keyframe-only change detected');
  const hdpMod = arcDiff.modified.find(m => m.semantic.kind === 'HDP');
  assert(hdpMod && hdpMod.semantic.changedRecords[0].wordDiffs[0].modU32 === 42, 'HDP record diff detected');
  const htsMod = arcDiff.modified.find(m => m.semantic.kind === 'HTS');
  assert(htsMod && htsMod.semantic.changedGroups[0].changedItems[0].radius[1] === 75, 'HTS radius/coords diff detected');
  const pmaMod = arcDiff.modified.find(m => m.semantic.kind === 'PMA');
  assert(pmaMod && pmaMod.semantic.changedCount === 2 && pmaMod.semantic.changedRecords[0].hitDataIndex[1] === 9 && pmaMod.semantic.changedRecords[1].kind === 'ADDED', 'PMA trigger diff detected');
  const fupMod = arcDiff.modified.find(m => m.semantic.kind === 'FUP');
  assert(fupMod && fupMod.semantic.changedInts[0].mod === 9 && fupMod.semantic.changedFloats[0].mod === 3.5 && fupMod.semantic.changedVecs[0].mod[2] === 4, 'FUP slot diff detected');
  const pslMod = arcDiff.modified.find(m => m.semantic.kind === 'PSL');
  assert(pslMod && pslMod.semantic.changedSlots[0].slot === 1 && pslMod.semantic.changedSlots[0].kind === 'ADDED' && pslMod.semantic.changedSlots[0].mod.uniqueIds[0].uniqueId === 213, 'PSL non-empty slot diff detected');

  let badArcThrew = false;
  try { diffArcs(Buffer.from('NOPE00000000'), arcB); } catch { badArcThrew = true; }
  assert(badArcThrew, 'negative: bad ARC magic rejected');

  // 5. Edge-case semantic diffs: NaN/-0 stability, HTS pad0/pad1, PSL flags&2 timelineCount, PARSE_ERROR markdown
  const fupEdgeA = writeFup({ ints: [1], floats: [Number.NaN, 0.0], vecs: [[Number.NaN, -0.0, 1.0]] });
  const fupEdgeB = writeFup({ ints: [2], floats: [Number.NaN, -0.0], vecs: [[Number.NaN, 0.0, 1.0]] });
  const htsPadA = writeHts({ groups: [{ items: [{ boneA: 1, boneB: 1, shapeType: 0, subFlags: 0, condFlags: 0, radius: 10, p0: [0, 0, 0], pad0: 0, p1: [0, 0, 0], pad1: 0 }] }] });
  const htsPadB = writeHts({ groups: [{ items: [{ boneA: 1, boneB: 1, shapeType: 0, subFlags: 0, condFlags: 0, radius: 10, p0: [0, 0, 0], pad0: 5, p1: [0, 0, 0], pad1: 6 }] }] });
  const pslFlag2A = makeSyntheticPsl(2, 10, 1);
  const pslFlag2B = Buffer.from(pslFlag2A);
  pslFlag2B.writeUInt32LE(5, 0x190 + 0x144); // mutate timelineCount under flags&2
  const edgeArcA = packArc([
    { name: 'player\\param\\edge', typeHash: TYPE_FUP, data: fupEdgeA },
    { name: 'player\\hit\\pad', typeHash: TYPE_HTS, data: htsPadA },
    { name: 'effect\\psl\\flag2', typeHash: TYPE_PSL, data: pslFlag2A },
    { name: 'broken\\pma', typeHash: TYPE_PMA, data: Buffer.from('BADPMA00') },
  ]);
  const edgeArcB = packArc([
    { name: 'player\\param\\edge', typeHash: TYPE_FUP, data: fupEdgeB },
    { name: 'player\\hit\\pad', typeHash: TYPE_HTS, data: htsPadB },
    { name: 'effect\\psl\\flag2', typeHash: TYPE_PSL, data: pslFlag2B },
    { name: 'broken\\pma', typeHash: TYPE_PMA, data: Buffer.from('BADPMA01') },
  ]);
  const edgeDiff = diffArcs(edgeArcA, edgeArcB);
  const fupEdgeMod = edgeDiff.modified.find(m => m.name === 'player\\param\\edge');
  assert(
    fupEdgeMod
    && fupEdgeMod.semantic.changedFloats.length === 1 && fupEdgeMod.semantic.changedFloats[0].index === 1
    && fupEdgeMod.semantic.changedVecs.length === 1 && fupEdgeMod.semantic.changedVecs[0].index === 0,
    'NaN === NaN ignored and -0 vs +0 detected in FUP floats/vecs'
  );
  const htsPadMod = edgeDiff.modified.find(m => m.name === 'player\\hit\\pad');
  assert(htsPadMod && htsPadMod.semantic.changedGroups[0].changedItems[0].pad0[1] === 5 && htsPadMod.semantic.changedGroups[0].changedItems[0].pad1[1] === 6, 'HTS pad0/pad1 diff detected');
  const pslFlag2Mod = edgeDiff.modified.find(m => m.name === 'effect\\psl\\flag2');
  assert(pslFlag2Mod && pslFlag2Mod.semantic.changedSlots[0].timelineCount[1] === 5, 'PSL flags&2 timelineCount diff detected');
  const parseErrMod = edgeDiff.modified.find(m => m.name === 'broken\\pma');
  assert(parseErrMod && parseErrMod.semantic.kind === 'PARSE_ERROR' && typeof parseErrMod.semantic.error === 'string', 'corrupt entry degrades to PARSE_ERROR');
  const edgeMd = formatArcMarkdown(edgeDiff, 'Edge');
  assert(edgeMd.includes('parse error:'), 'formatArcMarkdown prints PARSE_ERROR detail');

  return { ok: failures.length === 0, checks: 27, failures };
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n  node tools/mhgu/mod-diff.mjs patch <file.pchtxt|file.ips> [--flat <path>] [--base-mode auto|nso|vaddr] [--json]\n  node tools/mhgu/mod-diff.mjs arc <base.arc> <mod.arc> [--json]\n  node tools/mhgu/mod-diff.mjs mod <modRoot> [--romfs <romfsDir>] [--flat <path>] [--out <dir>] [--json]\n  node tools/mhgu/mod-diff.mjs --selftest');
  process.exit(2);
}

function parseFlags(args) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') flags.json = true;
    else if (a === '--flat' || a === '--base-mode' || a === '--romfs' || a === '--out') {
      if (i + 1 >= args.length) usage(`missing value for ${a}`);
      flags[a.slice(2)] = args[++i];
    } else if (a.startsWith('--')) usage(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, flags };
}

async function main(argv) {
  if (argv.includes('--selftest')) {
    const res = await runSelfTest();
    console.log(JSON.stringify(res));
    if (!res.ok) process.exit(1);
    return;
  }
  const [cmd, ...rest] = argv;
  if (!cmd) usage(null);
  const { pos, flags } = parseFlags(rest);

  if (cmd === 'patch') {
    if (pos.length !== 1) usage('patch takes <file.pchtxt|file.ips>');
    const file = pos[0];
    const parsed = file.toLowerCase().endsWith('.pchtxt')
      ? parsePchtxt(fs.readFileSync(file, 'utf8'), file)
      : parseIps(fs.readFileSync(file), file);
    const res = { file, ...(await disassemblePatch(parsed, { flatPath: flags.flat ?? null, baseMode: flags['base-mode'] ?? 'auto' })) };
    console.log(flags.json ? JSON.stringify(res, null, 2) : formatPatchMarkdown(res));
    return;
  }
  if (cmd === 'arc') {
    if (pos.length !== 2) usage('arc takes <base.arc> <mod.arc>');
    const res = diffArcs(fs.readFileSync(pos[0]), fs.readFileSync(pos[1]), { baseLabel: pos[0], modLabel: pos[1] });
    console.log(flags.json ? JSON.stringify(res, null, 2) : formatArcMarkdown(res, `${pos[0]} vs ${pos[1]}`));
    return;
  }
  if (cmd === 'mod') {
    if (pos.length !== 1) usage('mod takes <modRoot>');
    const res = await diffModDirectory(pos[0], { romfsDir: flags.romfs ?? null, flatPath: flags.flat ?? null, baseMode: flags['base-mode'] ?? 'auto' });
    const md = [
      `# MHGU Mod Diff Report: ${pos[0]}`,
      ...res.patches.map(formatPatchMarkdown),
      ...res.arcDiffs.map(d => d.baseline ? formatArcMarkdown(d, `ARC: ${d.file}`) : `### ARC: \`${d.file}\` (${d.modCount} entries, no baseline)`),
      res.otherFiles.length ? `### Other Files (${res.otherFiles.length})\n` + res.otherFiles.map(f => `- \`${f.file}\` (${f.size} B)`).join('\n') : '',
      res.errors.length ? `### Parse Errors (${res.errors.length})\n` + res.errors.map(e => `- \`${e.file}\`: ${e.error}`).join('\n') : '',
    ].filter(Boolean).join('\n\n');
    if (flags.out) {
      fs.mkdirSync(flags.out, { recursive: true });
      fs.writeFileSync(path.join(flags.out, 'DIFF-REPORT.md'), md + '\n');
      fs.writeFileSync(path.join(flags.out, 'diff.json'), JSON.stringify(res, null, 2) + '\n');
    }
    console.log(flags.json ? JSON.stringify(res, null, 2) : md);
    return;
  }
  usage(`unknown command ${JSON.stringify(cmd)}`);
}

const invoked = import.meta.main === true
  || (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href);
if (invoked) {
  main(process.argv.slice(2)).catch(err => {
    console.error(`ERROR ${err.message}`);
    process.exit(1);
  });
}
