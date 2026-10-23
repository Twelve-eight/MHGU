// NSO0 -> flat image with a 0x100 header pad (flat_off = vaddr + 0x100), same convention as main.140.flat.bin.
// Usage: node tools/mhgu/nso-flat.mjs <in.nso> <out.flat.bin>
import fs from 'fs';

function lz4Block(src, outLen) {
  const out = Buffer.alloc(outLen);
  let i = 0, o = 0;
  while (i < src.length) {
    const tok = src[i++];
    let lit = tok >> 4;
    if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
    src.copy(out, o, i, i + lit); i += lit; o += lit;
    if (i >= src.length) break;
    const off = src[i] | (src[i + 1] << 8); i += 2;
    let ml = tok & 15;
    if (ml === 15) { let b; do { b = src[i++]; ml += b; } while (b === 255); }
    ml += 4;
    for (let k = 0; k < ml; k++, o++) out[o] = out[o - off];
  }
  if (o !== outLen) throw new Error(`lz4 size ${o} != ${outLen}`);
  return out;
}

const [inp, outp] = process.argv.slice(2);
const b = fs.readFileSync(inp);
if (b.toString('latin1', 0, 4) !== 'NSO0') throw new Error('not NSO0');
const flags = b.readUInt32LE(0xC);
let end = 0;
const segs = [0, 1, 2].map(k => {
  const h = 0x10 + k * 0x10;
  const fileOff = b.readUInt32LE(h), memOff = b.readUInt32LE(h + 4), size = b.readUInt32LE(h + 8);
  const csize = b.readUInt32LE(0x60 + k * 4);
  const raw = b.subarray(fileOff, fileOff + csize);
  const data = (flags >> k) & 1 ? lz4Block(raw, size) : Buffer.from(raw.subarray(0, size));
  end = Math.max(end, memOff + size);
  return { memOff, data };
});
const flat = Buffer.alloc(0x100 + end);
for (const s of segs) s.data.copy(flat, 0x100 + s.memOff);
fs.writeFileSync(outp, flat);
console.log(segs.map((s, k) => `seg${k} mem=0x${s.memOff.toString(16)} size=0x${s.data.length.toString(16)}`).join('\n'));
