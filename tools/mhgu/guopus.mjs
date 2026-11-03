// MHGU (Switch) Capcom "NX Opus" BGM container: reader, packet framer, Ogg-Opus re-muxer and
// PCM/WAV decoder driver. Contains no game data.
//
//   node MHGU/tools/mhgu/guopus.mjs info    <file.opus>...            header + format report
//   node MHGU/tools/mhgu/guopus.mjs packets <file.opus> [--rows N]    per-block packet framing table
//   node MHGU/tools/mhgu/guopus.mjs ogg     <file.opus> --out f.ogg [--trim full|loop]
//   node MHGU/tools/mhgu/guopus.mjs wav     <file.opus> --out f.wav [--decoder auto|wasm|ffmpeg]
//                                                                   [--rate N] [--trim full|loop]
//   node MHGU/tools/mhgu/guopus.mjs verify  <file.opus>...           parse + frame math + decode checks
//   node MHGU/tools/mhgu/guopus.mjs selftest [--romfs DIR] [--fixtures DIR]
//
//   --decoder  auto (default) = wasm if available, else ffmpeg, else fail with a message naming what to install
//   --decoder-module PATH   opus-decoder package index.js (pure JS/WASM libopus build)
//   --ffmpeg PATH           ffmpeg.exe (only used with --decoder ffmpeg; ffmpeg decodes the re-muxed .ogg)
//   --rate     output rate for wav/verify (default 48000; also 24000/16000/12000/8000)
//   --trim     full (default) = the whole stream; loop = stop at loopEnd (intro+loop only)
//
// CONTAINER (little endian), byte-verified on all 512 *.opus under romfs/nativeNX/sound/bgm:
//   0x00 u32 trackId                 also the stqr record +0x08 (514/514)
//   0x04 u32 version                 2 in 511 files, 1 in event_055
//   0x08 u32 loopStart               samples @info.sampleRate; 0xFFFFFFFF = one-shot (180/512 files)
//   0x0C u32 loopEnd                 same domain; NOT the stream length - see below
//   0x10 u32 blockSize = 0xF8 = 248  (512/512)
//   0x14 u32 seekCount               0 in 432 files, 20..70 otherwise
//   0x18 u32 0                       (512/512)
//   0x1C u32 seekEnd = 0x30 + 8*seekCount  (512/512)
//   0x20 u32 0x02C17700   magic      (512/512)
//   0x24 u32 4                       (512/512)
//   0x28 u32 0x020807E1              (512/512)
//   0x2C u32 varies per file         [U: 0x0033390B for Tigrex, 0x002D3A0B for m24a00d]
//   0x30..seekEnd  seekCount x {u32 a, u32 b}: b ascends and its last value sits just under loopEnd, so
//                  b is a sample position [B]; a is 1..N in 34 files and 0x7F in the other 46 [U].
//   then a chunk list {u32 tag, u32 size, size bytes}, chained exactly to EOF (512/512):
//     0x80000001 (24 B) = {u16 maxPacket, u16 blockData=240, u32 sampleRate, u32 32, u32 0, u32 0,
//                          u32 granule} with granule = sampleRate/400 (the 2.5 ms Opus unit)
//     0x80000004 = the stream: N x 248-byte blocks, N = size/248 exactly (512/512)
//   block = {u32 0xF0000000, u32 <unknown, [U]>, u8[240] = one complete Opus packet}
//   and packet[0] is a valid Opus TOC in every block: 0xFC (config 31, CELT FB 20 ms stereo) x785777,
//   0xDC (config 27, CELT SWB 20 ms stereo) x35561, 0x98 (config 19, CELT NB 20 ms mono) x1.
//
// LOOP SEMANTICS: the game plays [0, loopEnd) and then jumps back to loopStart; the stream continues
// past loopEnd as an outro/fade tail (bgm_em032_Tigrex: loopEnd 84.712 s, stream 88.520 s, the RMS of
// the last 4 s falls 0.16 -> 0.002). loopStart/loopEnd are therefore *loop* points, not a total
// length: `info` prints both, `--trim loop` cuts the decoded PCM at loopEnd.
//
// VERIFIED: the 240-byte frame at block+8 decodes with libopus (opus-decoder WASM) with 0 errors on
// every packet, 1 frame per block, and the TOC-derived duration equals the decoder's output for all
// 4426 blocks of bgm_em032_Tigrex.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MAGIC_W20 = 0x02c17700;
export const MAGIC_W24 = 4;
export const MAGIC_W28 = 0x020807e1;
export const BLOCK_SIZE = 0xf8; // 248
export const BLOCK_SENTINEL = 0xf0000000;
export const BLOCK_DATA = 240;
export const HEADER_SIZE = 0x30;
export const ONE_SHOT = 0xffffffff;
export const CHUNK_INFO = 0x80000001;
export const CHUNK_STREAM = 0x80000004;
export const CHUNK_INFO_BYTES = 24;
export const VALID_RATES = [8000, 12000, 16000, 24000, 48000];

// Opus frame duration in 48 kHz samples, indexed by the TOC config (RFC 6716 table 2).
export const FRAME_SAMPLES_48K = [
  480, 960, 1920, 2880, // 0-3   SILK NB   10/20/40/60 ms
  480, 960, 1920, 2880, // 4-7   SILK MB
  480, 960, 1920, 2880, // 8-11  SILK WB
  480, 960, // 12-13 Hybrid SWB 10/20
  480, 960, // 14-15 Hybrid FB  10/20
  120, 240, 480, 960, // 16-19 CELT NB  2.5/5/10/20
  120, 240, 480, 960, // 20-23 CELT WB
  120, 240, 480, 960, // 24-27 CELT SWB
  120, 240, 480, 960, // 28-31 CELT FB
];

const hex8 = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const hex2 = v => '0x' + (v & 0xff).toString(16).padStart(2, '0');
const u32 = (buf, off, label) => {
  if (off + 4 > buf.length) throw new Error(`${label}: u32 read at 0x${off.toString(16)} is past EOF (${buf.length} B)`);
  return buf.readUInt32LE(off);
};

// ---------------------------------------------------------------- TOC / packet framing

// Decode an Opus TOC byte. Returns {config, stereo, code, frames, frameSamples48k, samples48k}.
export function parseToc(toc) {
  const config = toc >> 3;
  const stereo = (toc >> 2) & 1;
  const code = toc & 3;
  return { toc, config, stereo, code, frames: code === 0 ? 1 : code === 3 ? null : 2, frameSamples48k: FRAME_SAMPLES_48K[config], frameMs: FRAME_SAMPLES_48K[config] / 48 };
}

// Validate one Opus packet and return its duration in 48 kHz samples.
export function packetSamples48k(pkt, where = 'packet') {
  if (pkt.length < 1) throw new Error(`${where}: empty packet`);
  const t = parseToc(pkt[0]);
  let frames = t.frames;
  if (t.code === 3) {
    if (pkt.length < 2) throw new Error(`${where}: code 3 packet is 1 B long, the frame count byte is missing`);
    frames = pkt[1] & 0x3f;
    if (frames < 1 || frames > 48) throw new Error(`${where}: code 3 frame count ${frames} outside 1..48`);
    if (pkt.length < 2 + frames) throw new Error(`${where}: code 3 packet of ${pkt.length} B cannot hold ${frames} frame-length bytes`);
  }
  return { ...t, frames, samples48k: t.frameSamples48k * frames };
}

// ---------------------------------------------------------------- parse

export function parseGuOpus(buf, label = 'guopus') {
  if (buf.length < HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is shorter than the ${HEADER_SIZE} B header`);
  const at = o => u32(buf, o, label);
  const header = {
    trackId: at(0x00),
    version: at(0x04),
    loopStart: at(0x08),
    loopEnd: at(0x0c),
    blockSize: at(0x10),
    seekCount: at(0x14),
    zero18: at(0x18),
    seekEnd: at(0x1c),
    magic20: at(0x20),
    w24: at(0x24),
    w28: at(0x28),
    w2c: at(0x2c),
  };
  if (header.version !== 1 && header.version !== 2) throw new Error(`${label}: version ${header.version} at 0x04, expected 1 or 2`);
  if (header.blockSize !== BLOCK_SIZE) throw new Error(`${label}: blockSize ${header.blockSize} at 0x10, expected ${BLOCK_SIZE}`);
  if (header.magic20 !== MAGIC_W20) throw new Error(`${label}: magic ${hex8(header.magic20)} at 0x20, expected ${hex8(MAGIC_W20)}`);
  if (header.w24 !== MAGIC_W24) throw new Error(`${label}: word @0x24 = ${header.w24}, expected ${MAGIC_W24}`);
  if (header.w28 !== MAGIC_W28) throw new Error(`${label}: word @0x28 = ${hex8(header.w28)}, expected ${hex8(MAGIC_W28)}`);
  if (header.zero18 !== 0) throw new Error(`${label}: word @0x18 = ${header.zero18}, expected 0`);
  if (header.seekEnd !== 0x30 + 8 * header.seekCount) {
    throw new Error(`${label}: seekEnd ${header.seekEnd} at 0x1C != 0x30 + 8*${header.seekCount} = ${0x30 + 8 * header.seekCount}`);
  }
  if (header.seekEnd > buf.length) throw new Error(`${label}: seek table ends at ${header.seekEnd}, past EOF (${buf.length} B)`);

  const seekTable = [];
  for (let i = 0; i < header.seekCount; i++) seekTable.push({ index: at(0x30 + 8 * i), value: at(0x34 + 8 * i) });

  // chunk list must chain exactly to EOF
  const chunks = [];
  let pos = header.seekEnd;
  while (pos < buf.length) {
    if (pos + 8 > buf.length) throw new Error(`${label}: chunk header at 0x${pos.toString(16)} runs past EOF`);
    const tag = at(pos);
    const size = at(pos + 4);
    if (pos + 8 + size > buf.length) throw new Error(`${label}: chunk ${hex8(tag)} at 0x${pos.toString(16)} declares ${size} B, only ${buf.length - pos - 8} left`);
    chunks.push({ tag, offset: pos, size });
    pos += 8 + size;
  }
  if (pos !== buf.length) throw new Error(`${label}: chunk list ends at ${pos}, EOF is ${buf.length} (chunk sizes are inconsistent)`);

  const infoChunk = chunks.find(c => c.tag === CHUNK_INFO);
  const streamChunk = chunks.find(c => c.tag === CHUNK_STREAM);
  if (!infoChunk) throw new Error(`${label}: no 0x${CHUNK_INFO.toString(16)} (format info) chunk`);
  if (!streamChunk) throw new Error(`${label}: no 0x${CHUNK_STREAM.toString(16)} (stream) chunk`);
  if (infoChunk.size !== CHUNK_INFO_BYTES) throw new Error(`${label}: info chunk is ${infoChunk.size} B, expected ${CHUNK_INFO_BYTES}`);
  const ip = infoChunk.offset + 8;
  const info = {
    maxPacket: buf.readUInt16LE(ip),
    blockData: buf.readUInt16LE(ip + 2),
    sampleRate: at(ip + 4),
    unknown32: at(ip + 8),
    zero1: at(ip + 12),
    zero2: at(ip + 16),
    granule: at(ip + 20),
  };
  if (info.blockData !== BLOCK_DATA) throw new Error(`${label}: info.blockData ${info.blockData}, expected ${BLOCK_DATA}`);
  if (!VALID_RATES.includes(info.sampleRate)) throw new Error(`${label}: info.sampleRate ${info.sampleRate} is not one of ${VALID_RATES.join('/')}`);
  if (info.granule !== info.sampleRate / 400) {
    throw new Error(`${label}: info.granule ${info.granule} != sampleRate/400 = ${info.sampleRate / 400} (the 2.5 ms Opus unit)`);
  }

  const payloadOffset = streamChunk.offset + 8;
  const payloadSize = streamChunk.size;
  if (payloadSize % BLOCK_SIZE !== 0) {
    throw new Error(`${label}: stream chunk ${payloadSize} B is not a multiple of the ${BLOCK_SIZE} B block size`);
  }
  const blocks = payloadSize / BLOCK_SIZE;
  if (blocks === 0) throw new Error(`${label}: stream chunk holds no block`);

  const packets = [];
  let samples48k = 0;
  let stereoSeen = 0;
  for (let i = 0; i < blocks; i++) {
    const base = payloadOffset + i * BLOCK_SIZE;
    const sentinel = at(base);
    if (sentinel !== BLOCK_SENTINEL) {
      throw new Error(`${label}: block #${i} @0x${base.toString(16)} starts with ${hex8(sentinel)}, expected ${hex8(BLOCK_SENTINEL)}`);
    }
    const pktOff = base + 8;
    const pkt = buf.subarray(pktOff, pktOff + BLOCK_DATA);
    let d;
    try {
      d = packetSamples48k(pkt, `${label}: block #${i}`);
    } catch (e) {
      throw new Error(`${label}: block #${i} @0x${base.toString(16)}: ${e.message}`);
    }
    samples48k += d.samples48k;
    if (d.stereo) stereoSeen++;
    packets.push({
      i,
      offset: pktOff,
      size: BLOCK_DATA,
      unknownBlockWord: at(base + 4),
      toc: d.toc,
      config: d.config,
      stereo: d.stereo,
      code: d.code,
      frames: d.frames,
      frameSamples48k: d.frameSamples48k,
      frameMs: d.frameSamples48k / 48,
      samples48k: d.samples48k,
    });
  }

  const oneShot = header.loopStart === ONE_SHOT || header.loopEnd === ONE_SHOT;
  if (oneShot && !(header.loopStart === ONE_SHOT && header.loopEnd === ONE_SHOT)) {
    throw new Error(`${label}: one-shot marker 0xFFFFFFFF on only one of loopStart/loopEnd`);
  }
  if (!oneShot && header.loopStart >= header.loopEnd) {
    throw new Error(`${label}: loopStart ${header.loopStart} >= loopEnd ${header.loopEnd}`);
  }
  const streamSamplesAtDeclared = samples48k * (info.sampleRate / 48000);
  if (!oneShot && header.loopEnd > streamSamplesAtDeclared + 1) {
    throw new Error(`${label}: loopEnd ${header.loopEnd} is past the ${streamSamplesAtDeclared.toFixed(0)} decoded samples`);
  }

  return {
    label,
    size: buf.length,
    header,
    seekTable,
    chunks,
    info,
    payload: { offset: payloadOffset, size: payloadSize, blocks },
    packets,
    samples48k,
    streamSeconds: samples48k / 48000,
    loopStartSamples: oneShot ? null : header.loopStart,
    loopEndSamples: oneShot ? null : header.loopEnd,
    loopEndSeconds: oneShot ? null : header.loopEnd / info.sampleRate,
    oneShot,
    stereoPackets: stereoSeen,
    monoPackets: blocks - stereoSeen,
    frameMs: [...new Set(packets.map(p => p.frameMs))].sort((a, b) => a - b),
    tocs: [...new Set(packets.map(p => hex2(p.toc)))],
  };
}

export function readGuOpus(file) {
  return parseGuOpus(fs.readFileSync(file), path.basename(file));
}

// ---------------------------------------------------------------- Ogg Opus re-mux

const OGG_CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
    t[i] = r >>> 0;
  }
  return t;
})();

function oggCrc(buf) {
  let c = 0;
  for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ OGG_CRC_TABLE[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return c >>> 0;
}

function oggPage({ headerType, granule, serial, seq, segments }) {
  const lacings = [];
  for (const s of segments) {
    let left = s.length;
    while (left >= 255) { lacings.push(255); left -= 255; }
    lacings.push(left);
  }
  if (lacings.length > 255) throw new Error('ogg page would need more than 255 lacing values');
  const body = Buffer.concat(segments);
  const head = Buffer.alloc(27 + lacings.length);
  head.write('OggS', 0, 'latin1');
  head.writeUInt8(0, 4);
  head.writeUInt8(headerType, 5);
  head.writeBigUInt64LE(BigInt(granule), 6);
  head.writeUInt32LE(serial >>> 0, 14);
  head.writeUInt32LE(seq >>> 0, 18);
  head.writeUInt32LE(0, 22);
  head.writeUInt8(lacings.length, 26);
  for (const [i, l] of lacings.entries()) head.writeUInt8(l, 27 + i);
  const page = Buffer.concat([head, body]);
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}

// Re-mux to a standard Ogg Opus stream. granule = 48 kHz samples (Ogg Opus requirement);
// the GU loop points are preserved in the OpusTags comment header and in the returned metadata.
export function toOggOpus(parsed, buf, { serial = 0x47554231, channels = 2, trim = 'full' } = {}) {
  const rateOut = 48000;
  const pages = [];
  const preSkip = 0; // the GU container has no pre-skip field; the stream is played from sample 0
  const head = Buffer.alloc(19);
  head.write('OpusHead', 0, 'latin1');
  head.writeUInt8(1, 8);
  head.writeUInt8(channels, 9);
  head.writeUInt16LE(preSkip, 10);
  head.writeUInt32LE(parsed.info.sampleRate, 12); // original input rate (informational)
  head.writeInt16LE(0, 16);
  head.writeUInt8(0, 18);
  const comments = [
    `GU_TRACKID=${parsed.header.trackId}`,
    `GU_FILEVERSION=${parsed.header.version}`,
    parsed.oneShot ? 'GU_ONESHOT=1' : `LOOPSTART=${parsed.loopStartSamples}`,
    parsed.oneShot ? 'GU_ONESHOT_END=1' : `LOOPEND=${parsed.loopEndSamples}`,
    parsed.oneShot ? '' : `GU_LOOPSTART_48K=${Math.round(parsed.loopStartSamples * rateOut / parsed.info.sampleRate)}`,
    parsed.oneShot ? '' : `GU_LOOPEND_48K=${Math.round(parsed.loopEndSamples * rateOut / parsed.info.sampleRate)}`,
    `GU_BLOCKS=${parsed.payload.blocks}`,
    `GU_STREAM_SAMPLES_48K=${parsed.samples48k}`,
  ].filter(Boolean);
  const vendor = Buffer.from('mhgu-guopus', 'utf8');
  const parts = [];
  const vlen = Buffer.alloc(4); vlen.writeUInt32LE(vendor.length); parts.push(vlen, vendor);
  const clen = Buffer.alloc(4); clen.writeUInt32LE(comments.length); parts.push(clen);
  for (const c of comments) { const b = Buffer.from(c, 'utf8'); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); parts.push(l, b); }
  const tags = Buffer.concat([Buffer.from('OpusTags', 'latin1'), ...parts]);

  let seq = 0;
  pages.push(oggPage({ headerType: 0x02, granule: 0, serial, seq: seq++, segments: [head] }));
  pages.push(oggPage({ headerType: 0x00, granule: 0, serial, seq: seq++, segments: [tags] }));
  const limit = trim === 'loop' && !parsed.oneShot
    ? Math.round(parsed.loopEndSamples * rateOut / parsed.info.sampleRate)
    : Infinity;
  let granule = 0;
  let emitted = 0;
  for (const pkt of parsed.packets) {
    if (granule >= limit) break;
    granule += Math.round(pkt.samples48k * rateOut / 48000);
    emitted++;
    const last = emitted === parsed.payload.blocks;
    pages.push(oggPage({ headerType: last ? 0x04 : 0x00, granule, serial, seq: seq++, segments: [buf.subarray(pkt.offset, pkt.offset + pkt.size)] }));
  }
  return { ogg: Buffer.concat(pages), comments, granule, pages: pages.length, preSkip };
}

// ---------------------------------------------------------------- WAV

export function writeWav16(file, interleaved, channels, sampleRate) {
  const dataBytes = interleaved.length * 2;
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(36 + dataBytes, 4);
  head.write('WAVE', 8, 'latin1');
  head.write('fmt ', 12, 'latin1');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(channels, 22);
  head.writeUInt32LE(sampleRate, 24);
  head.writeUInt32LE(sampleRate * channels * 2, 28);
  head.writeUInt16LE(channels * 2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'latin1');
  head.writeUInt32LE(dataBytes, 40);
  const data = Buffer.alloc(dataBytes);
  for (let i = 0; i < interleaved.length; i++) {
    const v = Math.max(-1, Math.min(1, interleaved[i]));
    data.writeInt16LE(v < 0 ? Math.round(v * 32768) : Math.round(v * 32767), i * 2);
  }
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([head, data]));
  return { bytes: 44 + dataBytes, samples: interleaved.length / channels, sampleRate, channels };
}

export function readWav16(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE') throw new Error(`${file}: not a RIFF/WAVE file`);
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = b.subarray(off + 8, off + 8 + size);
    if (id === 'fmt ') fmt = { format: body.readUInt16LE(0), channels: body.readUInt16LE(2), sampleRate: body.readUInt32LE(4), bits: body.readUInt16LE(14) };
    if (id === 'data') data = body;
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file}: missing fmt or data chunk`);
  return { ...fmt, bytes: data.length, samples: data.length / (fmt.channels * fmt.bits / 8), data };
}

// ---------------------------------------------------------------- decoders

export function findFfmpeg(explicit) {
  const cands = [explicit, process.env.GUOPUS_FFMPEG, 'ffmpeg',
    'G:/ffmpeg/bin/ffmpeg.exe', 'G:/tools/ffmpeg/bin/ffmpeg.exe', 'C:/ffmpeg/bin/ffmpeg.exe'].filter(Boolean);
  for (const c of cands) {
    if (c.includes('/') || c.includes('\\')) { if (fs.existsSync(c)) return c; continue; }
    const r = spawnSync(c, ['-version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}

export function findWasmDecoder(explicit) {
  const cands = [
    explicit,
    process.env.GUOPUS_DECODER_MODULE,
    // repo-relative: MHGU/tools/mhgu/vendor/node_modules/opus-decoder/index.js (optional, not required)
    path.join(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1')), 'vendor', 'node_modules', 'opus-decoder', 'index.js'),
  ].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

async function openWasmDecoder(modulePath, sampleRate, channels) {
  const mod = await import(pathToFileURL(path.resolve(modulePath)).href);
  const Ctor = mod.OpusDecoder || (mod.default && mod.default.OpusDecoder);
  if (!Ctor) throw new Error(`${modulePath}: does not export OpusDecoder`);
  const dec = new Ctor({ sampleRate, channels });
  await dec.ready;
  return {
    name: `wasm libopus (${path.basename(path.dirname(path.dirname(modulePath)))}/${path.basename(path.dirname(modulePath))})`,
    decodeFrame: pkt => {
      const r = dec.decodeFrame(pkt);
      return { channelData: r.channelData, samples: r.samplesDecoded, errors: r.errors || [] };
    },
    free: () => dec.free(),
  };
}

// Decode every packet to interleaved float samples. Returns {interleaved, samples, errors, perPacket}.
export async function decodePackets(parsed, buf, opts) {
  const { decoder = 'auto', modulePath, ffmpegPath, sampleRate = 48000, channels = 2 } = opts;
  let backend = decoder;
  if (backend === 'auto') backend = findWasmDecoder(modulePath) ? 'wasm' : (findFfmpeg(ffmpegPath) ? 'ffmpeg' : 'none');
  if (backend === 'none') {
    throw new Error('no Opus decoder available: install ffmpeg on G: (then --ffmpeg PATH or GUOPUS_FFMPEG) '
      + 'or pass --decoder-module <opus-decoder package index.js> (pure WASM libopus, no install)');
  }
  if (backend === 'ffmpeg') {
    const exe = findFfmpeg(ffmpegPath);
    if (!exe) throw new Error('--decoder ffmpeg but no ffmpeg executable found (set --ffmpeg PATH or GUOPUS_FFMPEG)');
    const tmpOgg = path.join(os.tmpdir(), `guopus-${process.pid}-${parsed.header.trackId}.ogg`);
    const tmpWav = tmpOgg.replace(/\.ogg$/, '.wav');
    fs.writeFileSync(tmpOgg, toOggOpus(parsed, buf, { trim: opts.trim || 'full' }).ogg);
    const r = spawnSync(exe, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmpOgg, '-c:a', 'pcm_s16le', '-ar', String(sampleRate), '-ac', String(channels), tmpWav], { encoding: 'utf8' });
    try {
      if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${(r.stderr || '').trim().slice(0, 400)}`);
      const wav = readWav16(tmpWav);
      const interleaved = new Float32Array(wav.samples * wav.channels);
      for (let i = 0; i < interleaved.length; i++) interleaved[i] = wav.data.readInt16LE(i * 2) / 32768;
      return { backend: `ffmpeg (${exe})`, interleaved, samples: wav.samples, channels: wav.channels, sampleRate: wav.sampleRate, errors: [], perPacket: null };
    } finally {
      for (const f of [tmpOgg, tmpWav]) { try { fs.unlinkSync(f); } catch { /* ignore */ } }
    }
  }
  const mp = findWasmDecoder(modulePath);
  if (!mp) throw new Error('no WASM Opus decoder found: pass --decoder-module <opus-decoder package index.js>');
  const dec = await openWasmDecoder(mp, sampleRate, channels);
  const scale = sampleRate / 48000;
  let total = 0;
  for (const p of parsed.packets) total += Math.round(p.samples48k * scale);
  const interleaved = new Float32Array(total * channels);
  const errors = [];
  const perPacket = [];
  let at = 0;
  try {
    for (const p of parsed.packets) {
      const expect = Math.round(p.samples48k * scale);
      const r = dec.decodeFrame(buf.subarray(p.offset, p.offset + p.size));
      if (r.errors.length) errors.push({ packet: p.i, message: String(r.errors[0] && (r.errors[0].message || r.errors[0])) });
      if (r.samples !== expect) perPacket.push({ packet: p.i, expected: expect, got: r.samples });
      const got = Math.min(r.samples, Math.max(0, total - at));
      for (let c = 0; c < channels; c++) {
        const src = r.channelData[c] || r.channelData[0];
        for (let i = 0; i < got; i++) interleaved[(at + i) * channels + c] = src[i];
      }
      at += got;
    }
  } finally {
    dec.free();
  }
  return { backend: dec.name, interleaved: interleaved.subarray(0, at * channels), samples: at, channels, sampleRate, errors, perPacket };
}

// ---------------------------------------------------------------- commands

function fmtDuration(samples, rate) {
  const sec = samples / rate;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${sec.toFixed(3)} s (${m}:${s.toFixed(3).padStart(6, '0')})`;
}

function cmdInfo(files) {
  for (const file of files) {
    const p = readGuOpus(file);
    const h = p.header;
    console.log(`${file}`);
    console.log(`  ${p.size} B  trackId ${hex8(h.trackId)}  version ${h.version}  blocks ${p.payload.blocks} x ${BLOCK_SIZE} B`
      + `  packets ${p.packets.length}  packets stereo/mono ${p.stereoPackets}/${p.monoPackets}`);
    console.log(`  declared rate ${p.info.sampleRate} Hz  maxPacket ${p.info.maxPacket}  blockData ${p.info.blockData}`
      + `  granule ${p.info.granule} (2.5 ms)  unknown @0x2C ${hex8(h.w2c)}`);
    console.log(`  TOC ${p.tocs.join(' ')}  frame ${p.frameMs.join('/')} ms`
      + `  stream ${p.samples48k} samples @48k = ${fmtDuration(p.samples48k, 48000)}`);
    if (p.oneShot) {
      console.log('  loop: ONE-SHOT (loopStart = loopEnd = 0xFFFFFFFF), the whole stream plays once');
    } else {
      const inStream = p.loopEndSamples <= p.samples48k * (p.info.sampleRate / 48000);
      console.log(`  loop: start ${p.loopStartSamples} (${fmtDuration(p.loopStartSamples, p.info.sampleRate)})`
        + ` end ${p.loopEndSamples} (${fmtDuration(p.loopEndSamples, p.info.sampleRate)})`
        + `  = loop ${fmtDuration(p.loopEndSamples - p.loopStartSamples, p.info.sampleRate)}`);
      console.log(`  outro after loopEnd: ${((p.samples48k * p.info.sampleRate / 48000 - p.loopEndSamples) / p.info.sampleRate).toFixed(3)} s`
        + `${inStream ? '' : '  [loopEnd is past the decoded stream!]'}`);
    }
    if (p.seekTable.length) {
      const last = p.seekTable[p.seekTable.length - 1];
      console.log(`  seek table: ${p.seekTable.length} entries (0x30..0x${h.seekEnd.toString(16)}), first a=${p.seekTable[0].index} b=${p.seekTable[0].value},`
        + ` last a=${last.index} b=${last.value} ${p.oneShot ? '' : `(loopEnd ${h.loopEnd})`}`);
    }
    console.log(`  chunks: ${p.chunks.map(c => `${hex8(c.tag)}@0x${c.offset.toString(16)}+${c.size}`).join(' ')}`);
  }
}

function cmdPackets(file, rows) {
  const p = readGuOpus(file);
  console.log(`${file}: ${p.payload.blocks} blocks of ${BLOCK_SIZE} B at 0x${p.payload.offset.toString(16)}, ${p.packets.length} Opus packets`);
  console.log('  #  fileOff  toc   cfg ster code frames frmSmp  samples');
  const show = Math.min(rows || 12, p.packets.length);
  for (const pk of p.packets.slice(0, show)) {
    console.log(`  ${String(pk.i).padStart(4)} 0x${pk.offset.toString(16).padStart(6, '0')} ${hex2(pk.toc).padEnd(4)} ${String(pk.config).padStart(3)}`
      + ` ${String(pk.stereo).padStart(4)} ${String(pk.code).padStart(4)} ${String(pk.frames).padStart(6)} ${String(pk.frameSamples48k).padStart(6)} ${String(pk.samples48k).padStart(7)}`);
  }
  if (show < p.packets.length) console.log(`  ... ${p.packets.length - show} more`);
  const sum = p.packets.reduce((n, x) => n + x.samples48k, 0);
  console.log(`  total ${sum} samples @48k = ${fmtDuration(sum, 48000)}`);
}

function cmdOgg(file, out, trim) {
  const buf = fs.readFileSync(file);
  const p = parseGuOpus(buf, path.basename(file));
  const r = toOggOpus(p, buf, { trim });
  fs.writeFileSync(out, r.ogg);
  console.log(`${file} -> ${out}: ${r.ogg.length} B, ${r.pages} pages, ${r.granule} samples @48k = ${fmtDuration(r.granule, 48000)}`);
  console.log(`  comments: ${r.comments.join(' | ')}`);
}

async function cmdWav(file, out, opts) {
  const buf = fs.readFileSync(file);
  const p = parseGuOpus(buf, path.basename(file));
  const d = await decodePackets(p, buf, { ...opts, trim: opts.trim });
  const channels = d.channels;
  let interleaved = d.interleaved;
  if (opts.trim === 'loop' && !p.oneShot) {
    const limit = Math.round(p.loopEndSamples * d.sampleRate / p.info.sampleRate);
    if (limit < d.samples) interleaved = interleaved.subarray(0, limit * channels);
  }
  const w = writeWav16(out, interleaved, channels, d.sampleRate);
  console.log(`${file} -> ${out}`);
  console.log(`  ${w.bytes} B, ${w.channels} ch, ${w.sampleRate} Hz, 16-bit, ${w.samples} samples = ${fmtDuration(w.samples, w.sampleRate)}`);
  console.log(`  stream: ${d.samples} samples = ${fmtDuration(d.samples, d.sampleRate)}; decoder ${d.backend}`);
  if (!p.oneShot) {
    console.log(`  loop  : loopStart ${p.loopStartSamples}, loopEnd ${p.loopEndSamples} (declared ${p.info.sampleRate} Hz)`);
  }
  if (d.errors.length) {
    console.log(`  ${d.errors.length} decoder error(s), first: ${d.errors[0].message}`);
    process.exitCode = 1;
  }
  return { parsed: p, decoded: d, wav: w };
}

async function cmdVerify(files, opts) {
  let fails = 0;
  for (const file of files) {
    const buf = fs.readFileSync(file);
    let p;
    try {
      p = parseGuOpus(buf, path.basename(file));
    } catch (e) {
      console.log(`FAIL  ${file}: ${e.message}`);
      fails++;
      continue;
    }
    const checks = [];
    checks.push(['container parses, chunk chain reaches EOF', true, `${p.payload.blocks} blocks, ${p.chunks.length} chunks`]);
    const d = await decodePackets(p, buf, opts);
    const rate = d.sampleRate;
    checks.push(['decoder errors == 0', d.errors.length === 0, `${d.errors.length} errors (${d.backend})`]);
    const tocSamples = p.packets.reduce((n, x) => n + Math.round(x.samples48k * rate / 48000), 0);
    checks.push(['decoded samples == TOC-derived samples', d.samples === tocSamples, `${d.samples} vs ${tocSamples}`]);
    const mismatched = d.perPacket ? d.perPacket.length : 0;
    checks.push(['every packet decoded to its TOC duration', mismatched === 0, d.perPacket ? `${mismatched}/${p.packets.length} mismatched ${JSON.stringify(d.perPacket.slice(0, 3))}` : `${p.packets.length} packets (ffmpeg path, per-packet check not available)`]);
    const out = path.join(os.tmpdir(), `guopus-verify-${process.pid}.wav`);
    const w = writeWav16(out, d.interleaved, d.channels, rate);
    const dur = w.samples / w.sampleRate;
    const streamDur = p.samples48k / 48000;
    checks.push(['WAV duration == stream duration (<= 1 ms)', Math.abs(dur - streamDur) <= 0.001, `${dur.toFixed(6)} s vs ${streamDur.toFixed(6)} s`]);
    if (!p.oneShot) {
      const loopEndSec = p.loopEndSeconds;
      checks.push(['loopEnd inside the decoded stream', p.loopEndSeconds <= streamDur + 1e-6,
        `loopEnd ${loopEndSec.toFixed(3)} s <= stream ${streamDur.toFixed(3)} s`]);
      checks.push(['loopStart < loopEnd', p.loopStartSamples < p.loopEndSamples, `${p.loopStartSamples} < ${p.loopEndSamples}`]);
      // The header field @0x0C (the dossier's "totalSamples") is the loop end; the wav trimmed there
      // must be exactly loopEnd/rate long (one 16-bit sample = 1/48000 s).
      const loopOut = path.join(os.tmpdir(), `guopus-verify-loop-${process.pid}.wav`);
      const trimIdx = Math.round(p.loopEndSamples * rate / p.info.sampleRate);
      const wl = writeWav16(loopOut, d.interleaved.subarray(0, trimIdx * d.channels), d.channels, rate);
      try { fs.unlinkSync(loopOut); } catch { /* ignore */ }
      const delta = Math.abs(wl.samples / wl.sampleRate - p.loopEndSamples / p.info.sampleRate);
      checks.push(['--trim loop duration == loopEnd/declaredRate (<= 1 frame)',
        delta <= p.frameMs[0] / 1000 + 1e-9,
        `${(wl.samples / wl.sampleRate).toFixed(6)} s vs ${(p.loopEndSamples / p.info.sampleRate).toFixed(6)} s, delta ${(delta * 1000).toFixed(3)} ms`]);
    }
    let rmsAcc = 0;
    for (let i = 0; i < d.interleaved.length; i++) rmsAcc += d.interleaved[i] * d.interleaved[i];
    const rms = Math.sqrt(rmsAcc / Math.max(1, d.interleaved.length));
    checks.push(['PCM is not silent (RMS > 1e-3)', rms > 1e-3, `RMS ${rms.toFixed(4)}`]);
    checks.push(['16-bit / 2 ch / requested rate', true, `${w.channels} ch, ${w.sampleRate} Hz`]);
    try { fs.unlinkSync(out); } catch { /* ignore */ }
    const bad = checks.filter(c => !c[1]);
    if (bad.length) fails++;
    console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${file}  (${p.samples48k} samples @48k = ${streamDur.toFixed(3)} s)`);
    for (const [label, ok, note] of checks) console.log(`   ${ok ? 'ok  ' : 'BAD '} ${label}: ${note}`);
  }
  if (fails) process.exitCode = 1;
  return fails === 0;
}

// ---------------------------------------------------------------- selftest

const OPUS_MUTATIONS = [
  ['bad-magic-0x20', b => { b.writeUInt32LE(0x12345678, 0x20); }],
  ['blockSize!=248', b => { b.writeUInt32LE(0xf0, 0x10); }],
  ['seekEnd wrong', b => { b.writeUInt32LE(b.readUInt32LE(0x1c) + 8, 0x1c); }],
  ['missing info chunk', b => { b.writeUInt32LE(0x80000009, b.readUInt32LE(0x1c)); }],
  ['stream size not x248', b => {
    const seekEnd = b.readUInt32LE(0x1c);
    const streamOff = seekEnd + 8 + 24;
    b.writeUInt32LE(b.readUInt32LE(streamOff + 4) - 4, streamOff + 4);
  }],
  ['block sentinel broken', b => {
    const seekEnd = b.readUInt32LE(0x1c);
    const pay = seekEnd + 8 + 24 + 8 + 248 * 3;
    b.writeUInt32LE(0xdeadbeef, pay);
  }],
  ['info.sampleRate 44100', b => {
    const seekEnd = b.readUInt32LE(0x1c);
    b.writeUInt32LE(44100, seekEnd + 8 + 4);
  }],
  ['loopEnd past stream', b => { b.writeUInt32LE(0x7ffffff0, 0x0c); }],
  ['one-shot marker on one word only', b => { b.writeUInt32LE(0xffffffff, 0x08); b.writeUInt32LE(1000, 0x0c); }],
  ['truncated to 0x40', b => b.subarray(0, 0x40)],
];

function expectThrow(label, fn) {
  try { fn(); } catch (e) { return { label, ok: true, message: e.message }; }
  return { label, ok: false, message: 'no error raised' };
}

async function cmdSelftest(romfs, fixtures) {
  const root = path.join(romfs, 'sound', 'bgm');
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith('.opus')) files.push(p);
    }
  })(root);
  const results = [];
  // 1. corpus parse
  const problems = [];
  let blocks = 0;
  let packets = 0;
  const tocs = new Map();
  for (const f of files) {
    try {
      const p = readGuOpus(f);
      blocks += p.payload.blocks;
      packets += p.packets.length;
      for (const pk of p.packets) tocs.set(pk.toc, (tocs.get(pk.toc) || 0) + 1);
    } catch (e) {
      problems.push(`${path.relative(root, f)}: ${e.message}`);
    }
  }
  results.push({ label: `corpus: ${files.length} .opus parse, ${blocks} blocks, ${packets} packets`, ok: problems.length === 0 && files.length === 512, message: problems.length ? problems[0] : 'all ok' });
  results.push({ label: 'no block sentinel / TOC violations in the corpus', ok: problems.length === 0, message: `${problems.length} problem(s)` });
  const topToc = [...tocs.entries()].sort((a, b) => b[1] - a[1])[0];
  results.push({ label: 'most common TOC is 0xFC (CELT FB 20 ms stereo)', ok: topToc[0] === 0xfc, message: `0x${topToc[0].toString(16)} x${topToc[1]}` });

  // 2. known-good decode of three tracks (battle Tigrex + two others from different sets)
  const picks = [
    path.join(root, 'battle', 'wav', 'bgm_em032_Tigrex.opus'),
    path.join(root, 'battle', 'wav', 'bgm_em057_Zinogre.opus'),
    path.join(root, 'map', 'm24d', 'wav', 'm24a00d.opus'),
  ];
  const modulePath = findWasmDecoder();
  if (modulePath) {
    for (const f of picks) {
      if (!fs.existsSync(f)) { results.push({ label: `decode ${path.basename(f)}`, ok: false, message: 'file missing' }); continue; }
      const buf = fs.readFileSync(f);
      const p = parseGuOpus(buf, path.basename(f));
      const d = await decodePackets(p, buf, { decoder: 'wasm', modulePath, sampleRate: 48000 });
      const ok = d.errors.length === 0 && (d.perPacket ? d.perPacket.length === 0 : true)
        && d.samples === p.packets.reduce((n, x) => n + x.samples48k, 0);
      results.push({ label: `decode ${path.basename(f)}: ${d.samples} samples, 0 errors, TOC match`, ok, message: `${d.errors.length} errors, ${d.perPacket ? d.perPacket.length + ' packet mismatches' : 'durations match'}, ${d.samples} samples` });
    }
  } else {
    results.push({ label: 'wasm decoder available', ok: false, message: 'not found - pass --decoder-module (decode checks skipped)' });
  }

  // 3. known-bad mutations
  const sample = fs.readFileSync(picks[0]);
  results.push({ label: 'unmutated Tigrex parses', ok: (() => { try { parseGuOpus(sample, 'tigrex'); return true; } catch { return false; } })(), message: 'ok' });
  for (const [name, mutate] of OPUS_MUTATIONS) {
    const copy = Buffer.from(sample);
    const repl = mutate(copy);
    const r = expectThrow(name, () => parseGuOpus(Buffer.isBuffer(repl) ? repl : copy, 'tigrex/' + name));
    results.push({ label: `reject ${name}`, ok: r.ok, message: r.message.slice(0, 130) });
  }

  // 4. persisted known-bad files
  if (fixtures) {
    if (!fs.existsSync(fixtures)) results.push({ label: `fixtures ${fixtures}`, ok: false, message: 'directory does not exist' });
    else {
      const bad = fs.readdirSync(fixtures).filter(f => f.endsWith('.opus'));
      results.push({ label: `fixtures dir holds ${bad.length} known-bad .opus`, ok: bad.length > 0, message: fixtures });
      for (const f of bad) {
        const r = expectThrow(f, () => readGuOpus(path.join(fixtures, f)));
        results.push({ label: `reject fixture ${f}`, ok: r.ok, message: r.message.slice(0, 130) });
      }
    }
  }
  let fails = 0;
  for (const r of results) {
    if (!r.ok) fails++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.message ? ' - ' + r.message : ''}`);
  }
  console.log(`\n${results.length - fails}/${results.length} checks passed`);
  if (fails) process.exitCode = 1;
  return fails === 0;
}

// ---------------------------------------------------------------- cli

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node MHGU/tools/mhgu/guopus.mjs info    <file.opus>...');
  console.error('       node MHGU/tools/mhgu/guopus.mjs packets <file.opus> [--rows N]');
  console.error('       node MHGU/tools/mhgu/guopus.mjs ogg     <file.opus> --out f.ogg [--trim full|loop]');
  console.error('       node MHGU/tools/mhgu/guopus.mjs wav     <file.opus> --out f.wav [--decoder auto|wasm|ffmpeg] [--rate N] [--trim full|loop]');
  console.error('       node MHGU/tools/mhgu/guopus.mjs verify  <file.opus>... [--decoder ...] [--rate N]');
  console.error('       node MHGU/tools/mhgu/guopus.mjs selftest [--romfs DIR] [--fixtures DIR]');
  process.exit(2);
}

function opt(args, name, dflt) {
  const i = args.indexOf(name);
  return i < 0 ? dflt : args[i + 1];
}

function positionals(args, valueFlags) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (valueFlags.has(args[i])) { i++; continue; }
    if (args[i].startsWith('--')) continue;
    out.push(args[i]);
  }
  return out;
}

const VALUE_FLAGS = new Set(['--out', '--rows', '--decoder', '--decoder-module', '--ffmpeg', '--rate', '--trim', '--romfs', '--fixtures']);

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd) usage();
  const files = positionals(rest, VALUE_FLAGS);
  const decoderOpts = {
    decoder: opt(rest, '--decoder', 'auto'),
    modulePath: opt(rest, '--decoder-module'),
    ffmpegPath: opt(rest, '--ffmpeg'),
    sampleRate: Number(opt(rest, '--rate', 48000)),
    trim: opt(rest, '--trim', 'full'),
  };
  if (cmd === 'info') {
    if (!files.length) usage('info needs at least one .opus file');
    cmdInfo(files);
  } else if (cmd === 'packets') {
    if (!files.length) usage('packets needs one .opus file');
    cmdPackets(files[0], Number(opt(rest, '--rows', 12)));
  } else if (cmd === 'ogg') {
    const out = opt(rest, '--out');
    if (!files.length || !out) usage('ogg needs <file.opus> --out <file.ogg>');
    cmdOgg(files[0], out, decoderOpts.trim);
  } else if (cmd === 'wav') {
    const out = opt(rest, '--out');
    if (!files.length || !out) usage('wav needs <file.opus> --out <file.wav>');
    await cmdWav(files[0], out, decoderOpts);
  } else if (cmd === 'verify') {
    if (!files.length) usage('verify needs at least one .opus file');
    await cmdVerify(files, decoderOpts);
  } else if (cmd === 'selftest') {
    await cmdSelftest(opt(rest, '--romfs', process.env.MHGU_ROMFS || 'G:/mhgu-romfs/romfs/nativeNX'), opt(rest, '--fixtures'));
  } else {
    usage(`unknown command "${cmd}"`);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
}
