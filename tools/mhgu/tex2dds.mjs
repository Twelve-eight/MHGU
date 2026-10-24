// MHGU (Switch) TEX -> DDS (DX10 header, mip 0, deswizzled). Facts: docs/reference/formats/tex.md.
// Runs on the player's own extracted files; contains no game data.
//   node tools/mhgu/tex2dds.mjs <file.241f5deb> <out.dds>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// format code -> [DXGI, bytes per 4x4 block (0 = uncompressed 4 B/pixel)]
export const FORMATS = {
  0x07: [28, 0],  // R8G8B8A8_UNORM [I: 64 B per 4x4 block = 4 B/pixel]
  0x17: [77, 16], // BC3_UNORM [C visual]
  0x19: [80, 8],  // BC4_UNORM [C visual]
  0x1f: [83, 16], // BC5_UNORM [C visual, normal map]
};

export function readTex(buf, label = '<buffer>') {
  if (buf.toString('latin1', 0, 4) !== 'TEX\0') throw new Error(`${label}: not a TEX file`);
  const c = buf.readUInt32LE(8), d = buf.readUInt32LE(12);
  const mips = c & 0x3f, width = (c >>> 6) & 0x1fff, height = (c >>> 19) & 0x1fff;
  const faces = d & 0xff, format = (d >>> 8) & 0xff;
  const dataStart = 20 + mips * 4;
  const mipOffsets = [];
  for (let m = 0; m < mips; m++) mipOffsets.push(dataStart + buf.readUInt32LE(20 + m * 4));
  return { width, height, mips, faces, format, dataSize: buf.readUInt32LE(16), dataStart, mipOffsets };
}

// Tegra X1 block-linear -> linear. Elements are 4x4 blocks (or pixels); GOB = 64 B x 8 rows.
export function deswizzle(src, pitch, rows, gobHeight = 16) {
  const dst = Buffer.alloc(pitch * rows), gobsX = Math.ceil(pitch / 64), blockRows = gobHeight * 8;
  for (let y = 0; y < rows; y++) {
    const by = Math.floor(y / blockRows), gy = (y % blockRows) >> 3, yi = y & 7;
    for (let x = 0; x < pitch; x++) {
      const xi = x & 63;
      const inGob = ((xi & 32) << 3) + ((yi & 6) << 5) + ((xi & 16) << 1) + ((yi & 1) << 4) + (xi & 15);
      const addr = ((by * gobsX + (x >> 6)) * gobHeight + gy) * 512 + inGob;
      if (addr < src.length) dst[y * pitch + x] = src[addr];
    }
  }
  return dst;
}

export function texToDds(buf, label) {
  const t = readTex(buf, label), f = FORMATS[t.format];
  if (!f) throw new Error(`${label}: unsupported TEX format 0x${t.format.toString(16)}`);
  const [dxgi, bpb] = f;
  const pitch = bpb ? Math.ceil(t.width / 4) * bpb : t.width * 4, rows = bpb ? Math.ceil(t.height / 4) : t.height;
  const end = t.mips > 1 ? t.mipOffsets[1] : buf.length;
  const data = deswizzle(buf.subarray(t.mipOffsets[0], end), pitch, rows);
  const hdr = Buffer.alloc(148);
  hdr.write('DDS ', 0); hdr.writeUInt32LE(124, 4); hdr.writeUInt32LE(0x1007, 8);
  hdr.writeUInt32LE(t.height, 12); hdr.writeUInt32LE(t.width, 16); hdr.writeUInt32LE(1, 28);
  hdr.writeUInt32LE(32, 76); hdr.writeUInt32LE(4, 80); hdr.write('DX10', 84); hdr.writeUInt32LE(0x1000, 108);
  hdr.writeUInt32LE(dxgi, 128); hdr.writeUInt32LE(3, 132); hdr.writeUInt32LE(1, 140);
  return Buffer.concat([hdr, data]);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inp, out] = process.argv.slice(2);
  if (!inp || !out) { console.error('usage: node tools/mhgu/tex2dds.mjs <file> <out.dds>'); process.exit(2); }
  try { fs.writeFileSync(out, texToDds(fs.readFileSync(inp), inp)); console.log(`wrote ${out}`); }
  catch (e) { console.error(e.message); process.exit(1); }
}
