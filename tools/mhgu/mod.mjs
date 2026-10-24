// MHGU MOD v212 reader (Switch, little endian). Facts and evidence: docs/formats/mod.md.
// Runs on the player's own extracted files; contains no game data.
//   node tools/mhgu/mod.mjs info <file.58a15856>
//   node tools/mhgu/mod.mjs obj  <file.58a15856> <out.obj> [--lod=1]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MAGIC = 'MOD\0';
export const VERSION = 212;
const MESH_SIZE = 48, BONE_SIZE = 24, MAT_NAME_SIZE = 128, GROUP_SIZE = 32;
// Vertex formats whose position is 3 x f32 instead of quantised 3 x u16.
const FLOAT_POSITION = new Set([0x5e7f2030]);

export function readMod(buf, label = '<buffer>') {
  if (buf.toString('latin1', 0, 4) !== MAGIC) throw new Error(`${label}: not a MOD file`);
  const u8 = o => buf[o], u16 = o => buf.readUInt16LE(o), u32 = o => buf.readUInt32LE(o), f32 = o => buf.readFloatLE(o);
  const version = u8(4);
  if (version !== VERSION) throw new Error(`${label}: MOD version ${version}, expected ${VERSION}`);
  const h = {
    version, boneCount: u16(6), meshCount: u16(8), materialCount: u16(10),
    vertexCount: u32(12), faceCount: u32(20), vertexBufferSize: u32(24), groupCount: u32(32),
    boneOffset: u32(36), groupOffset: u32(40), materialOffset: u32(44), meshOffset: u32(48),
    vertexOffset: u32(52), faceOffset: u32(56), eofOffset: u32(60),
    bboxMin: [f32(80), f32(84), f32(88)], bboxMax: [f32(96), f32(100), f32(104)],
  };
  // Quantised positions live in a cube anchored at bboxMin whose edge is the largest bbox extent.
  h.quantScale = (Math.max(...h.bboxMax) - Math.min(...h.bboxMin)) / 32767;
  const materials = [];
  for (let i = 0; i < h.materialCount; i++) {
    const o = h.materialOffset + i * MAT_NAME_SIZE;
    materials.push(buf.toString('latin1', o, o + MAT_NAME_SIZE).replace(/\0.*$/s, ''));
  }
  const bones = [];
  for (let i = 0; i < h.boneCount; i++) {
    const o = h.boneOffset + i * BONE_SIZE;
    // +1 = parent index (255 = root), +2 = mirror partner index (self for centreline bones).
    bones.push({ id: u8(o), parent: u8(o + 1), mirror: u8(o + 2), length: f32(o + 8), offset: [f32(o + 12), f32(o + 16), f32(o + 20)] });
  }
  const meshes = [];
  for (let i = 0; i < h.meshCount; i++) {
    const o = h.meshOffset + i * MESH_SIZE;
    meshes.push({
      // u16@4 low 12 bits = group, material = u16@4 >> 12 | u8@6 << 4 (values 0..materialCount-1 on 4/4 models).
      vertexCount: u16(o + 2), group: u16(o + 4) & 0xfff, material: (u16(o + 4) >> 12) | (u8(o + 6) << 4), lod: u8(o + 7), stride: u8(o + 10),
      vertexStart: u32(o + 12), vertexBase: u32(o + 16), format: u32(o + 20),
      indexStart: u32(o + 24), indexCount: u32(o + 28), boneRemapCount: u8(o + 37),
      minIndex: u16(o + 40), maxIndex: u16(o + 42),
    });
  }
  return { header: h, materials, bones, meshes };
}

export function vertexPosition(buf, mod, mesh, v) {
  const h = mod.header, o = h.vertexOffset + mesh.vertexBase + v * mesh.stride;
  if (FLOAT_POSITION.has(mesh.format)) return [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)];
  return [0, 1, 2].map(k => h.bboxMin[k] + buf.readUInt16LE(o + 2 * k) * h.quantScale);
}

// Index buffer is u16 triangle strips; 0xFFFF restarts a strip. Returns triangles with consistent winding.
export function meshTriangles(buf, mod, mesh) {
  const tris = [];
  let strip = [];
  const flush = () => {
    for (let k = 0; k + 2 < strip.length; k++) {
      const [a, b, c] = k & 1 ? [strip[k + 1], strip[k], strip[k + 2]] : [strip[k], strip[k + 1], strip[k + 2]];
      if (a !== b && b !== c && a !== c) tris.push([a, b, c]);
    }
    strip = [];
  };
  const base = mod.header.faceOffset + mesh.indexStart * 2;
  for (let k = 0; k < mesh.indexCount; k++) {
    const v = buf.readUInt16LE(base + k * 2);
    if (v === 0xffff) flush(); else strip.push(v);
  }
  flush();
  return tris;
}

function toObj(buf, mod, lodBit) {
  const lines = ['# MHGU MOD v212 export (positions + faces)'];
  let next = 1;
  mod.meshes.forEach((m, i) => {
    if (!(m.lod & lodBit)) return;
    lines.push(`o mesh${i}_g${m.group}`, `usemtl ${mod.materials[m.material] ?? `mat${m.material}`}`);
    const remap = new Map();
    for (let v = m.minIndex; v <= m.maxIndex; v++) {
      const p = vertexPosition(buf, mod, m, v);
      lines.push(`v ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
      remap.set(v, next++);
    }
    for (const t of meshTriangles(buf, mod, m)) lines.push(`f ${t.map(v => remap.get(v)).join(' ')}`);
  });
  return lines.join('\n') + '\n';
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage:\n  node tools/mhgu/mod.mjs info <file>\n  node tools/mhgu/mod.mjs obj <file> <out.obj> [--lod=1]');
  process.exit(2);
}

function main(argv) {
  const [cmd, file, out, ...rest] = argv;
  if (!file) usage(cmd ? 'missing file' : null);
  const buf = fs.readFileSync(file), mod = readMod(buf, file);
  if (cmd === 'info') {
    const { header: h } = mod;
    console.log(JSON.stringify({ ...h, materials: mod.materials, formats: [...new Set(mod.meshes.map(m => m.format.toString(16) + '/' + m.stride))] }, null, 1));
    return;
  }
  if (cmd === 'obj') {
    if (!out) usage('obj needs <out.obj>');
    const lod = Number((rest.find(a => a.startsWith('--lod=')) ?? '--lod=1').slice(6));
    fs.writeFileSync(out, toObj(buf, mod, lod));
    console.log(`wrote ${out}`);
    return;
  }
  usage(`unknown command ${JSON.stringify(cmd)}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
