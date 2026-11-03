// MHGU (Switch) MRL v34 material reader: material list, shader hash, texture slots, parameter blocks.
// Facts: docs/reference/formats/mrl.md + the loader in main.140.flat (flat vaddr = the numbers below):
//   0xb458ec  header: u32@8 = material count, @24 = material table, descriptor stride 60 (rsb r6,r7,r7<<4)
//   0xb457e0  texture table: u32@20 = table, stride 76 (add r5,r5,#76), u32@12 = count
//   0xb45ab0  entry loop: 12 B per entry; u16@descriptor+24 & 0xfff = entry count; type = entry word & 0xf
//   0xb45b54  type 1: arg = block-relative offset (add r0,r1,r0 with r1 = block base)
//   0xb45b94  type 3: arg = 1-based texture index, checked against the texture count, record stride 76
// Runs on the player's own extracted files; contains no game data.
//
// Usage:
//   node tools/mhgu/mrl.mjs info     <file.2749c8a8>
//   node tools/mhgu/mrl.mjs dump     <file.2749c8a8> [--json] [--refs]
//   node tools/mhgu/mrl.mjs check    <file.2749c8a8...>              strict layout + tiling + size identity
//   node tools/mhgu/mrl.mjs texmap   <file.arc...> [--json]          material -> texture mapping for every MRL in the arcs
//   node tools/mhgu/mrl.mjs modnames <file.2749c8a8> <file.58a15856> resolve material names through a sibling MOD
//   node tools/mhgu/mrl.mjs corpus   <romfsRoot|arcDir> [--limit=N]  every MRL under the tree + oracle checks
//   node tools/mhgu/mrl.mjs selftest [<file.2749c8a8>]               built-in fixtures; known-bad samples must fail
// Library: readMrl(buf) -> {version, materialCount, textureCount, materials, textures, consumed}
//          crc32 / nameHash (full 32-bit ~crc32) / typeHash (& 0x7fffffff)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const MAGIC = 'MRL\0';
export const VERSION = 34;
export const HEADER_SIZE = 28, TEX_REC = 76, MAT_REC = 60, ENTRY_SIZE = 12;
export const TEXTURE_TYPE = 0x241f5deb; // rTexture, cf. 0x2749c8a8 = MRL
const align16 = n => (n + 15) & ~15;
const hex = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');

// crc32x: zlib.crc32 ^ 0xFFFFFFFF (docs/reference/formats/mrl.md, 417 materials: name hash is the full
// 32-bit form, arc type hashes are the same value with bit 31 cleared).
export const crc32 = s => (zlib.crc32(Buffer.from(s, 'latin1')) ^ 0xffffffff) >>> 0;
export const nameHash = crc32;
export const typeHash = s => crc32(s) & 0x7fffffff;

function str64(buf, o) {
  const raw = buf.toString('latin1', o, o + 64);
  const nul = raw.indexOf('\0');
  return nul < 0 ? raw : raw.slice(0, nul);
}

// Parse one MRL. strict = enforce block tiling and size identity (consumed bytes == file size).
export function readMrl(buf, label = '<buffer>', { strict = true } = {}) {
  if (buf.length < HEADER_SIZE) throw new Error(`${label}: ${buf.length} B is too small for an MRL header (${HEADER_SIZE} B)`);
  if (buf.toString('latin1', 0, 4) !== MAGIC) {
    throw new Error(`${label}: bad magic ${JSON.stringify(buf.toString('latin1', 0, 4))} (expected "MRL\\0")`);
  }
  const version = buf.readUInt32LE(4);
  if (version !== VERSION) throw new Error(`${label}: unsupported MRL version ${version} (expected ${VERSION})`);
  const materialCount = buf.readUInt32LE(8), textureCount = buf.readUInt32LE(12);
  const unk16 = buf.readUInt32LE(16), textureTable = buf.readUInt32LE(20), materialTable = buf.readUInt32LE(24);
  const texEnd = textureTable + textureCount * TEX_REC, matEnd = materialTable + materialCount * MAT_REC;
  if (textureTable < HEADER_SIZE) throw new Error(`${label}: texture table at ${textureTable} overlaps the header`);
  if (texEnd > buf.length) throw new Error(`${label}: texture table ends at ${texEnd} but the file holds ${buf.length} B`);
  if (materialTable < texEnd) throw new Error(`${label}: material table at ${materialTable} overlaps the texture table (ends ${texEnd})`);
  if (matEnd > buf.length) throw new Error(`${label}: material table ends at ${matEnd} but the file holds ${buf.length} B`);
  // Layout invariant: the texture table starts right after the header and the material table right after it
  // (3081/3081 MRLs of the stage + enemy + weapon/armor arcs; main.140 0xb457e0 / 0xb45994 read these offsets).
  if (strict && textureTable !== HEADER_SIZE) {
    throw new Error(`${label}: texture table starts at ${textureTable}, expected ${HEADER_SIZE} (right after the header)`);
  }
  if (strict && materialTable !== texEnd) {
    throw new Error(`${label}: material table starts at ${materialTable}, expected ${texEnd} (right after the ${textureCount} texture records)`);
  }

  const textures = [];
  for (let t = 0; t < textureCount; t++) {
    const o = textureTable + t * TEX_REC;
    textures.push({
      index: t, typeHash: buf.readUInt32LE(o), path: str64(buf, o + 12),
      reserved: buf.subarray(o + 4, o + 12).toString('hex'),
    });
  }

  const materials = [];
  let mainEnd = -1, extraEnd = -1;
  for (let i = 0; i < materialCount; i++) {
    const o = materialTable + i * MAT_REC;
    const d = {
      index: i, unk00: buf.readUInt32LE(o), nameHash: buf.readUInt32LE(o + 4), blockSize: buf.readUInt32LE(o + 8),
      shaderHash: buf.readUInt32LE(o + 12), hash16: buf.readUInt32LE(o + 16), hash20: buf.readUInt32LE(o + 20),
      entryWord: buf.readUInt32LE(o + 24), flags28: buf.readUInt32LE(o + 28),
      reserved32: [buf.readUInt32LE(o + 32), buf.readUInt32LE(o + 36), buf.readUInt32LE(o + 40), buf.readUInt32LE(o + 44)],
      extraSize: buf.readUInt32LE(o + 48), blockOffset: buf.readUInt32LE(o + 52), extraOffset: buf.readUInt32LE(o + 56),
    };
    d.entryCount = d.entryWord & 0xfff;
    d.flags24 = d.entryWord >>> 12;
    if (d.blockOffset === 0) throw new Error(`${label}: material ${i}: block offset 0`);
    if (d.blockOffset + d.blockSize > buf.length) {
      throw new Error(`${label}: material ${i}: block [${d.blockOffset}, ${d.blockOffset + d.blockSize}) is past EOF (${buf.length} B)`);
    }
    if (d.blockSize < d.entryCount * ENTRY_SIZE) {
      throw new Error(`${label}: material ${i}: ${d.entryCount} entries need ${d.entryCount * ENTRY_SIZE} B but the block is ${d.blockSize} B`);
    }
    const entries = [];
    for (let k = 0; k < d.entryCount; k++) {
      const e = d.blockOffset + k * ENTRY_SIZE;
      const w0 = buf.readUInt32LE(e), w1 = buf.readUInt32LE(e + 4), w2 = buf.readUInt32LE(e + 8);
      const type = w0 & 0xf;
      if (type > 4) throw new Error(`${label}: material ${i}: entry ${k}: type ${type} is not 0..4 (loader rejects >4)`);
      const ent = { index: k, type, paramId: (w0 >>> 20) & 0xfff, word: w0, arg: w1, hash: w2 };
      if (type === 1) {
        if (w1 >= d.blockSize) throw new Error(`${label}: material ${i}: entry ${k}: constant-buffer offset ${w1} is outside the ${d.blockSize} B block`);
        const prev = entries.filter(x => x.type === 1);
        if (prev.length && w1 < prev[prev.length - 1].arg) {
          throw new Error(`${label}: material ${i}: entry ${k}: constant-buffer offsets not increasing (${prev[prev.length - 1].arg} then ${w1})`);
        }
      }
      if (type === 3 && w1 > textureCount) {
        throw new Error(`${label}: material ${i}: entry ${k}: texture index ${w1} > texture count ${textureCount}`);
      }
      entries.push(ent);
    }
    // Parameter blocks: type-1 entries point at the float data area that follows the entry list.
    const dataStart = Math.min(align16(d.entryCount * ENTRY_SIZE), d.blockSize);
    const cbo = entries.filter(x => x.type === 1).map((x, n, all) => {
      const end = n + 1 < all.length ? all[n + 1].arg : d.blockSize;
      const values = [];
      for (let q = x.arg; q + 4 <= end; q += 4) values.push(buf.readFloatLE(d.blockOffset + q));
      return { offset: x.arg, size: end - x.arg, hash: x.hash, paramId: x.paramId, values };
    });
    const slots = entries.filter(x => x.type === 3).map(x => ({
      slotHash: x.hash, textureIndex: x.arg, paramId: x.paramId,
      path: x.arg > 0 ? textures[x.arg - 1].path : null,
    }));
    const refs = entries.filter(x => x.type === 0 || x.type === 2 || x.type === 4)
      .map(x => ({ type: x.type, paramId: x.paramId, arg: x.arg, hash: x.hash }));
    let extra = null;
    if (d.extraSize) {
      if (d.extraOffset + d.extraSize > buf.length) {
        throw new Error(`${label}: material ${i}: extra block [${d.extraOffset}, ${d.extraOffset + d.extraSize}) is past EOF`);
      }
      extra = { offset: d.extraOffset, size: d.extraSize, slack: 0, head: buf.subarray(d.extraOffset, d.extraOffset + Math.min(64, d.extraSize)).toString('hex') };
    } else if (d.extraOffset !== 0) {
      throw new Error(`${label}: material ${i}: extra offset ${d.extraOffset} without an extra size`);
    }

    if (strict) {
      const want = i === 0 ? align16(matEnd) : mainEnd;
      if (d.blockOffset !== want) {
        throw new Error(`${label}: material ${i}: block starts at ${d.blockOffset} but ${i === 0 ? 'the descriptor table (aligned)' : 'the previous block'} ends at ${want}`);
      }
    }
    mainEnd = d.blockOffset + d.blockSize;
    materials.push({ ...d, dataStart, entries, cbo, slots, refs, extra });
  }

  let consumed = mainEnd, extraSlack = 0, tailSlack = 0;
  if (strict) {
    // Extra blocks: offsets increase, no overlap, and the recorded size may fall short of the next offset by
    // 0/16/32/64 B (corpus: 2249 x 0, 11 x 16, 3 x 32, 1 x 64 over 2264 blocks). That slack is 0xcd padding
    // in 10 of the 15 cases and real data in 5, so it is reported, never parsed.
    const SLACKS = new Set([0, 16, 32, 64]);
    let prev = mainEnd;
    for (const m of materials) {
      if (!m.extra) continue;
      const gap = m.extra.offset - prev;
      if (gap < 0) throw new Error(`${label}: material ${m.index}: extra block at ${m.extra.offset} overlaps the previous region ending at ${prev}`);
      if (!SLACKS.has(gap)) throw new Error(`${label}: material ${m.index}: ${gap} B unexplained before its extra block (previous region ends at ${prev})`);
      m.extra.slack = gap;
      m.extra.slackKind = gap === 0 ? '' : (buf.subarray(prev, m.extra.offset).every(b => b === 0xcd) ? 'pad' : 'data');
      extraSlack += gap;
      prev = m.extra.offset + m.extra.size;
    }
    const tail = buf.length - prev;
    if (tail < 0) throw new Error(`${label}: parsed region ends at ${prev} but the file holds only ${buf.length} B`);
    if (!materials.some(m => m.extra) && tail !== 0) {
      throw new Error(`${label}: parsed ${prev} B of ${buf.length} B (${tail} B unexplained, no extra blocks) - size identity fails`);
    }
    if (!SLACKS.has(tail)) throw new Error(`${label}: parsed ${prev} B of ${buf.length} B (${tail} B unexplained) - size identity fails`);
    tailSlack = tail;
    consumed = buf.length;
  } else {
    for (const m of materials) if (m.extra) consumed = Math.max(consumed, m.extra.offset + m.extra.size);
  }

  return { version, materialCount, textureCount, unk16, textureTable, materialTable, textures, materials, consumed, extraSlack, tailSlack };
}

// Fixture writer: ONLY for the built-in self-test (a synthetic minimal MRL, no game data).
export function buildFixture() {
  const texPath = 'fixture/material_00_BM';
  const matName = 'fixture-mat';
  const nTex = 1, nMat = 1;
  const textureTable = HEADER_SIZE, materialTable = textureTable + nTex * TEX_REC;
  const blockOffset = align16(materialTable + nMat * MAT_REC);
  const entryCount = 2, dataStart = align16(entryCount * ENTRY_SIZE), blockSize = dataStart + 16;
  const buf = Buffer.alloc(blockOffset + blockSize, 0);
  buf.write(MAGIC, 0, 'latin1');
  buf.writeUInt32LE(VERSION, 4); buf.writeUInt32LE(nMat, 8); buf.writeUInt32LE(nTex, 12);
  buf.writeUInt32LE(0xb2d34c60, 16); buf.writeUInt32LE(textureTable, 20); buf.writeUInt32LE(materialTable, 24);
  buf.writeUInt32LE(TEXTURE_TYPE, textureTable);
  Buffer.from(texPath, 'latin1').copy(buf, textureTable + 12);
  const o = materialTable;
  buf.writeUInt32LE(0x5fb0ebe4, o); buf.writeUInt32LE(nameHash(matName), o + 4); buf.writeUInt32LE(blockSize, o + 8);
  buf.writeUInt32LE(0x62b2d186, o + 12); buf.writeUInt32LE(0x11110000, o + 16); buf.writeUInt32LE(0x22220000, o + 20);
  buf.writeUInt32LE(entryCount, o + 24); buf.writeUInt32LE(blockOffset, o + 52);
  // entry 0: type 3 (texture slot) -> texture 1; entry 1: type 1 (constant buffer) -> data start
  buf.writeUInt32LE(0x371dcdc3, blockOffset); buf.writeUInt32LE(1, blockOffset + 4); buf.writeUInt32LE(0xcd06f371, blockOffset + 8);
  buf.writeUInt32LE((0x214 << 20) | 0xc1, blockOffset + 12); buf.writeUInt32LE(dataStart, blockOffset + 16); buf.writeUInt32LE(0x6c801214, blockOffset + 20);
  for (let i = 0; i < 4; i++) buf.writeFloatLE([0.7, 1, 0.5, -1][i], blockOffset + dataStart + i * 4);
  return buf;
}

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const args = argv.slice(1).filter(a => !a.startsWith('--'));
const wants = k => flags.has('--' + k);

async function arcLib() { return await import('./arc.mjs'); }
async function modLib() { return await import('./mod.mjs'); }

function readFile(p) { return fs.readFileSync(p); }

// Every MRL entry of one arc: [{entry, bytes}]
async function mrlsOfArc(arcPath) {
  const { readArc, inflateEntry } = await arcLib();
  const buf = readFile(arcPath);
  const arc = readArc(buf, arcPath);
  const out = [];
  for (const e of arc.entries) {
    if (e.typeHash !== 0x2749c8a8) continue;
    out.push({ entry: e, bytes: inflateEntry(buf, e, arcPath) });
  }
  return { arc, buf, mrls: out };
}

function fmtNum(v) {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v) && Math.abs(v) < 1e6) return String(v);
  return v.toPrecision(6).replace(/0+$/, '').replace(/\.$/, '');
}

function dumpText(label, r) {
  const lines = [];
  lines.push(`${label}: MRL v${r.version}  materials ${r.materialCount}  textures ${r.textureCount}  hdr16 ${hex(r.unk16)}  consumed ${r.consumed} B`);
  lines.push('textures:');
  for (const t of r.textures) lines.push(`  [${String(t.index).padStart(2)}] ${hex(t.typeHash)}  ${t.path}`);
  lines.push('materials:');
  for (const m of r.materials) {
    lines.push(`  [${String(m.index).padStart(2)}] hash ${hex(m.nameHash)}${m.name ? '  ' + m.name : ''}  shader ${hex(m.shaderHash)}  entries ${m.entryCount}  block ${m.blockOffset}+${m.blockSize}  flags24 ${hex(m.flags24)} flags28 ${hex(m.flags28)}`);
    for (const s of m.slots) {
      lines.push(`        slot ${hex(s.slotHash)} -> ${s.textureIndex ? `tex[${s.textureIndex}] ${s.path}` : '(none)'}`);
    }
    for (const [n, c] of m.cbo.entries()) {
      const head = c.values.slice(0, 16).map(fmtNum).join(' ');
      lines.push(`        cbo[${n}] @${c.offset} ${c.size} B hash ${hex(c.hash)}: ${head}${c.values.length > 16 ? ` ... (${c.values.length} f32)` : ''}`);
    }
    const kinds = [0, 2, 4].map(t => `${m.refs.filter(x => x.type === t).length}xT${t}`).join(' ');
    lines.push(`        refs ${kinds}${m.extra ? `  extra ${m.extra.offset}+${m.extra.size} B${m.extra.slack ? ` (+${m.extra.slack} B ${m.extra.slackKind})` : ''} [U]` : ''}`);
    if (wants('refs')) for (const x of m.refs) lines.push(`          ref T${x.type} param ${x.paramId} arg ${x.arg} hash ${hex(x.hash)}`);
  }
  return lines.join('\n');
}

async function cmdInfo() {
  const r = readMrl(readFile(args[0]), args[0]);
  console.log(JSON.stringify({ file: args[0], version: r.version, materialCount: r.materialCount, textureCount: r.textureCount, consumedBytes: r.consumed, materials: r.materials.map(m => ({ hash: hex(m.nameHash), shader: hex(m.shaderHash), entries: m.entryCount, slots: m.slots.length })) }));
}

async function cmdDump() {
  const r = readMrl(readFile(args[0]), args[0]);
  if (wants('json')) console.log(JSON.stringify({ file: args[0], ...r }, null, 1));
  else console.log(dumpText(args[0], r));
}

async function cmdCheck() {
  let bad = 0;
  for (const p of args) {
    try {
      const r = readMrl(readFile(p), p);
      const sec = r.materials.reduce((a, m) => a + (m.extra ? 1 : 0), 0);
      console.log(`OK   ${p}: ${r.materialCount} materials, ${r.textureCount} textures, ${sec} extra blocks, consumed ${r.consumed} B == size ${readFile(p).length} B (slack ${r.extraSlack} + ${r.tailSlack} B)`);
    } catch (err) {
      bad++;
      console.log(`FAIL ${p}: ${err.message}`);
    }
  }
  if (bad) { console.error(`${bad} of ${args.length} MRLs failed`); process.exit(1); }
}

// romfs root of an arc path (…/romfs/nativeNX/…), for loose textures such as system\texture\DefaultCube_CM
function romfsRootOf(arcPath) {
  const i = arcPath.replace(/\\/g, '/').indexOf('/nativeNX/');
  return i < 0 ? null : arcPath.replace(/\\/g, '/').slice(0, i + '/nativeNX'.length);
}
// A texture table record resolves either to a TEX member of the same arc ('arc') or to a loose
// <romfs>/<path>.tex ('global', e.g. system\texture\DefaultCube_CM); anything else is a real failure.
function resolveTexture(pathName, texIndexMap, root) {
  const e = texIndexMap.get(pathName);
  if (e) return { status: 'arc', bytes: e.size };
  if (root && fs.existsSync(`${root}/${pathName.replace(/\\/g, '/')}.tex`)) {
    return { status: 'global', bytes: fs.statSync(`${root}/${pathName.replace(/\\/g, '/')}.tex`).size };
  }
  return { status: 'missing', bytes: 0 };
}

async function cmdTexmap() {
  const rows = [];
  const failures = [];
  let nOk = 0, nGlobal = 0, nNone = 0;
  for (const arcPath of args) {
    const { arc, mrls } = await mrlsOfArc(arcPath);
    const root = romfsRootOf(arcPath);
    const tex = new Map();
    for (const e of arc.entries) if (e.typeHash === TEXTURE_TYPE) tex.set(e.name, e);
    const mods = new Map(arc.entries.filter(e => e.typeHash === 0x58a15856).map(e => [e.name, e]));
    for (const { entry, bytes } of mrls) {
      let r;
      try { r = readMrl(bytes, entry.name); } catch (err) { failures.push(`${arcPath} :: ${entry.name}: ${err.message}`); continue; }
      let names = null;
      const modEntry = mods.get(entry.name);
      if (modEntry) {
        const { inflateEntry } = await arcLib();
        const { readMod } = await modLib();
        names = new Map(readMod(inflateEntry(readFile(arcPath), modEntry, arcPath)).materials.map(s => [crc32(s), s]));
      }
      for (const m of r.materials) {
        const mname = names ? (names.get(m.nameHash) ?? '') : '';
        if (m.slots.length === 0) rows.push([arcPath, entry.name, m.index, mname, hex(m.nameHash), hex(m.shaderHash), '', '', '', 'no-slot', '', '']);
        for (const s of m.slots) {
          if (!s.path) { nNone++; rows.push([arcPath, entry.name, m.index, mname, hex(m.nameHash), hex(m.shaderHash), hex(s.slotHash), s.textureIndex, '', 'none', '', '']); continue; }
          const hit = resolveTexture(s.path, tex, root);
          if (hit.status === 'arc') nOk++; else if (hit.status === 'global') nGlobal++;
          else failures.push(`${arcPath} :: ${entry.name} material ${m.index}: texture ${s.path} is neither a TEX member of the arc nor a loose .tex under ${root ?? '<no romfs root>'}`);
          rows.push([arcPath, entry.name, m.index, mname, hex(m.nameHash), hex(m.shaderHash), hex(s.slotHash),
            s.textureIndex, s.path, hit.status, hit.status === 'arc' ? arcPath : (hit.status === 'global' ? `${root}/${s.path}.tex`.replace(/\\/g, '/') : ''), hit.bytes ? String(hit.bytes) : '']);
        }
      }
    }
  }
  if (wants('json')) { console.log(JSON.stringify(rows, null, 1)); }
  else {
    console.log(['arc', 'mrl', 'mat', 'materialName', 'nameHash', 'shaderHash', 'slotHash', 'texIndex', 'texPath', 'texStatus', 'texFile', 'texBytes'].join('\t'));
    for (const r of rows) console.log(r.join('\t'));
    console.error(`# ${rows.length} rows: ${nOk} arc TEX, ${nGlobal} global .tex, ${nNone} empty slots`);
  }
  for (const f of failures) console.error('FAIL ' + f);
  if (failures.length) process.exit(1);
}

async function cmdModnames() {
  const { readMod } = await modLib();
  const r = readMrl(readFile(args[0]), args[0]);
  const names = new Map(readMod(readFile(args[1]), args[1]).materials.map(s => [crc32(s), s]));
  let ok = 0;
  for (const m of r.materials) {
    const n = names.get(m.nameHash);
    if (n !== undefined) ok++;
    console.log(`${String(m.index).padStart(2)}  ${hex(m.nameHash)}  ${n ?? '<no MOD name with this hash>'}`);
  }
  console.log(`${ok}/${r.materialCount} material name hashes resolve through ${args[1]}`);
  if (ok !== r.materialCount) process.exit(1);
}

function walkArcs(root) {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.arc')) out.push(p);
    }
  };
  walk(root);
  return out;
}

async function cmdCorpus() {
  const root = args[0];
  const limit = Number(([...flags].find(f => f.startsWith('--limit=')) ?? '').slice(8)) || Infinity;
  const arcs = walkArcs(root).slice(0, limit);
  const { readArc, inflateEntry } = await arcLib();
  const { readMod } = await modLib();
  let nMrl = 0, nMat = 0, nBytes = 0, nTexRec = 0, nTexArc = 0, nTexGlobal = 0, nNameQ = 0, nNameRes = 0;
  let nSlack = 0, nSlackPad = 0, nSlackData = 0;
  const failures = [];
  console.log(['arc', 'mrl', 'bytes', 'materials', 'textures', 'texArc', 'texGlobal', 'modNames', 'extraBlocks', 'slack'].join('\t'));
  for (const arcPath of arcs) {
    let buf, arc;
    try { buf = readFile(arcPath); arc = readArc(buf, arcPath); }
    catch (err) { failures.push(`${arcPath}: ${err.message}`); continue; }
    const rootOfArc = romfsRootOf(arcPath);
    const tex = new Map(arc.entries.filter(e => e.typeHash === TEXTURE_TYPE).map(e => [e.name, e]));
    const mods = new Map(arc.entries.filter(e => e.typeHash === 0x58a15856).map(e => [e.name, e]));
    for (const e of arc.entries) {
      if (e.typeHash !== 0x2749c8a8) continue;
      try {
        const bytes = inflateEntry(buf, e, arcPath);
        const r = readMrl(bytes, e.name);
        nMrl++; nMat += r.materialCount; nBytes += bytes.length;
        let texArc = 0, texGlobal = 0;
        const unresolved = [];
        for (const t of r.textures) {
          nTexRec++;
          const hit = resolveTexture(t.path, tex, rootOfArc);
          if (hit.status === 'arc') { texArc++; nTexArc++; }
          else if (hit.status === 'global') { texGlobal++; nTexGlobal++; }
          else unresolved.push(t.path);
        }
        let nameRes = '';
        const me = mods.get(e.name);
        if (me) {
          const names = new Set(readMod(inflateEntry(buf, me, arcPath)).materials.map(crc32));
          let ok = 0;
          for (const m of r.materials) { nNameQ++; if (names.has(m.nameHash)) { ok++; nNameRes++; } }
          nameRes = `${ok}/${r.materialCount}`;
        }
        const extras = r.materials.filter(m => m.extra).length;
        const slack = r.extraSlack + r.tailSlack;
        if (slack) {
          nSlack++;
          const kinds = r.materials.filter(m => m.extra && m.extra.slack).map(m => `${m.extra.slack}${m.extra.slackKind}`);
          if (kinds.some(k => k.endsWith('data')) || !kinds.length) nSlackData++; else nSlackPad++;
        }
        console.log([arcPath.replace(root, ''), e.name, bytes.length, r.materialCount, r.textureCount, `${texArc}/${r.textureCount}`, texGlobal, nameRes || '-', extras, slack].join('\t'));
        if (unresolved.length) failures.push(`${arcPath} :: ${e.name}: texture records that resolve neither to a TEX member of the arc nor to a loose .tex: ${unresolved.join(', ')}`);
      } catch (err) { failures.push(`${arcPath} :: ${e.name}: ${err.message}`); }
    }
  }
  console.log(`\n${nMrl} MRLs, ${nMat} materials, ${nBytes} B parsed with size identity, ${nTexArc}/${nTexRec} texture records resolve to a TEX entry of their arc, ${nTexGlobal} to a loose system .tex, ${nNameRes}/${nNameQ} name hashes resolve through the sibling MOD; ${nSlack} MRLs carry block-end slack (${nSlackPad} padding-class, ${nSlackData} data-class)`);
  for (const f of failures) console.error('FAIL ' + f);
  if (failures.length) process.exit(1);
}

async function cmdSelftest() {
  let bad = 0;
  const check = (name, fn, mustFail) => {
    let err = null;
    try { fn(); } catch (e) { err = e; }
    const okRes = mustFail ? !!err : !err;
    if (!okRes) bad++;
    console.log(`${okRes ? 'PASS' : 'FAIL'}  ${name}${mustFail ? ' (must fail)' : ''}${err ? ': ' + err.message : ''}`);
  };
  const good = args[0] ? readFile(args[0]) : buildFixture();
  const label = args[0] ?? 'fixture';
  const r = readMrl(good, label);
  console.log(`${label}: ${r.materialCount} materials, ${r.textureCount} textures, consumed ${r.consumed} B of ${good.length} B`);
  if (r.consumed !== good.length) { bad++; console.log(`FAIL  size identity: consumed ${r.consumed} != ${good.length}`); }
  const mut = (fn) => { const b = Buffer.from(good); fn(b); return b; };
  const matAt = (buf, i) => buf.readUInt32LE(24) + i * MAT_REC;
  const lastMat = (buf) => matAt(buf, buf.readUInt32LE(8) - 1);
  check('shorter than a header', () => readMrl(Buffer.alloc(12), 'short'), true);
  check('wrong magic', () => readMrl(mut(b => b.write('MRX\0', 0, 'latin1')), 'magic'), true);
  check('wrong version (33)', () => readMrl(mut(b => b.writeUInt32LE(33, 4)), 'version'), true);
  check('truncated tail (identity)', () => readMrl(good.subarray(0, good.length - 8), 'trunc'), true);
  check('texture table past EOF', () => readMrl(mut(b => b.writeUInt32LE(0xffff, 20)), 'texoff'), true);
  check('material table past EOF', () => readMrl(mut(b => b.writeUInt32LE(good.length, 24)), 'matoff'), true);
  check('material 0 block size shrunk (block chain)', () => readMrl(mut(b => b.writeUInt32LE(b.readUInt32LE(matAt(b, 0) + 8) - 8, matAt(b, 0) + 8)), 'block'), true);
  check('last block size shrank into the tail gap', () => readMrl(mut(b => b.writeUInt32LE(b.readUInt32LE(lastMat(b) + 8) - 8, lastMat(b) + 8)), 'blocktail'), true);
  check('entry type 7 (loader rejects >4)', () => {
    const b = mut(b2 => { const o = b2.readUInt32LE(lastMat(b2) + 52); b2.writeUInt32LE(7, o); });
    return readMrl(b, 'type');
  }, true);
  check('entry count overflowing the block', () => readMrl(mut(b => b.writeUInt32LE(0xfff, lastMat(b) + 24)), 'count'), true);
  check('texture index beyond the texture table', () => {
    const b = mut(b2 => {
      const nTex = b2.readUInt32LE(12);
      const o = b2.readUInt32LE(lastMat(b2) + 52), n = b2.readUInt32LE(lastMat(b2) + 24) & 0xfff;
      for (let k = 0; k < n; k++) if ((b2.readUInt32LE(o + k * 12) & 0xf) === 3) b2.writeUInt32LE(nTex + 1, o + k * 12 + 4);
    });
    return readMrl(b, 'texidx');
  }, true);
  check('constant-buffer offset outside the block', () => {
    const b = mut(b2 => { const o = b2.readUInt32LE(lastMat(b2) + 52), n = b2.readUInt32LE(lastMat(b2) + 24) & 0xfff; for (let k = 0; k < n; k++) if ((b2.readUInt32LE(o + k * 12) & 0xf) === 1) b2.writeUInt32LE(0x7ffff, o + k * 12 + 4); });
    return readMrl(b, 'cbo');
  }, true);
  // positive controls: a fixture parsed with strict off must still expose the fields the CLI prints
  const f = readMrl(buildFixture(), 'fixture', { strict: true });
  if (f.materials[0].slots[0]?.textureIndex !== 1 || f.materials[0].cbo.length !== 1 || Math.abs(f.materials[0].cbo[0].values[0] - 0.7) > 1e-6) {
    bad++; console.log('FAIL  fixture field decode');
  } else console.log('PASS  fixture field decode (slot 1, 1 cbo, first value 0.7)');
  if (bad) { console.error(`\n${bad} self-test case(s) failed`); process.exit(1); }
  console.log('\nself-test OK');
}

const commands = { info: cmdInfo, dump: cmdDump, check: cmdCheck, texmap: cmdTexmap, modnames: cmdModnames, corpus: cmdCorpus, selftest: cmdSelftest };
const cmd = argv[0];
if (cmd && commands[cmd]) {
  await commands[cmd]();
} else if (!cmd) {
  console.log('usage: node tools/mhgu/mrl.mjs <info|dump|check|texmap|modnames|corpus|selftest> ...');
  console.log('  info     <file.2749c8a8>');
  console.log('  dump     <file.2749c8a8> [--json] [--refs]');
  console.log('  check    <file.2749c8a8...>');
  console.log('  texmap   <file.arc...> [--json]');
  console.log('  modnames <file.2749c8a8> <file.58a15856>');
  console.log('  corpus   <romfsRoot|arcDir> [--limit=N]');
  console.log('  selftest [<file.2749c8a8>]');
  process.exit(2);
} else if (cmd === '--help' || cmd === '-h') {
  console.log('MHGU MRL v34 reader; see the header of this file for the full usage');
} else {
  console.error(`unknown command ${JSON.stringify(cmd)}`);
  process.exit(2);
}
