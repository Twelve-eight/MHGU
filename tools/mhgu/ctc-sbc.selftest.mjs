// Independent positive/negative self-test suite for Wave 11 clean-room MHGU CTC & SBC tools:
//   - MHGU/tools/mhgu/ctc-sbc.mjs (`parseCtc`/`serializeCtc`/`summarizeCtcDiff`, `parseSbc`/`serializeSbc`/`summarizeSbcDiff`, CLI)
//   - Synthetic positive + negative mutant controls (bad magic, bad version, truncated, OOB count/offset, mutated parameter SHA + diff detection)
//   - Optional real RomFS byte-exact round-trip across >= 10 real CTC entries and >= 5 real SBC entries when present
//   - MHGU/tools/mhgu/mod-diff.mjs semantic diff integration for `CTC` and `SBC`
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readArc, inflateEntry, packArc } from './arc.mjs';
import { diffArcs, runSelfTest as modDiffSelfTest } from './mod-diff.mjs';
import {
  TYPE_CTC,
  TYPE_SBC,
  CTC_HEADER_SIZE,
  SBC_HEADER_SIZE,
  SBC_BVHC_MAGIC,
  SBC_BVHC_VERSION,
  SBC_GRCO_MAGIC,
  SBC_GRCO_VERSION,
  parseCtc,
  serializeCtc,
  summarizeCtcDiff,
  parseSbc,
  serializeSbc,
  summarizeSbcDiff,
} from './ctc-sbc.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'ctc-sbc.mjs');
const ROMFS_ARC_DIR = 'G:/mhgu-romfs/romfs/nativeNX/arc';
const TMP_ROOT = `G:/tmp/mhgu-wave11-selftest-${process.pid}`;

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TEMP: 'G:/tmp', TMP: 'G:/tmp' },
  });
}

function makeSyntheticCtc({ damping = 0.25, radius = 5.0, boneId = 202 } = {}) {
  return {
    paramScale: 1000,
    deltaTime: 1 / 60,
    groups: [
      {
        chainNodeCount: 2,
        flags: 0x300,
        collisionType: -1,
        gravity: [0, 150, 0, 0],
        damping,
        stiffness: 0.75,
        drag: 0.05,
        mass: 1.0,
        maxLimit: 100.0,
        windScale: 0.0,
        windRandom: 0.1,
      },
    ],
    nodes: [
      {
        boneId,
        flags02: 1,
        colShape: 1,
        limitShape: 0,
        unk06: 1,
        unk07: 1,
        radius,
        angleLimit: 1.570796,
        mass: 1.0,
        elasticity: 1.0,
      },
      {
        boneId: boneId + 1,
        flags02: 1,
        colShape: 1,
        limitShape: 0,
        unk06: 1,
        unk07: 1,
        radius: radius + 1.5,
        angleLimit: 1.0,
        mass: 1.0,
        elasticity: 0.8,
      },
    ],
  };
}

function makeSyntheticSbc({ zMax = 355.0, surfaceAttr = 0x10000 } = {}) {
  return {
    topType: 0,
    groupType: 2,
    bboxMin: [-100, 0, -100, 0],
    bboxMax: [100, 50, zMax, 0],
    allocHint: 160,
    groups: [
      {
        bboxMin: [-100, 0, -100, 0],
        bboxMax: [100, 50, zMax, 0],
        subBoxCount: 2,
        faceCount: 2,
        adjCount: 2,
      },
    ],
    groupAux: [
      {
        kind: 'subBoxes',
        subBoxes: [
          { min: [-100, 0, -100], flags: 0, max: [0, 50, zMax] },
          { min: [0, 0, -100], flags: 1, max: [100, 50, zMax] },
        ],
      },
    ],
    topAux: {
      kind: 'bvhc',
      bvhc: {
        magic: SBC_BVHC_MAGIC,
        version: SBC_BVHC_VERSION,
        mode: 1,
        flags0c: 0,
        bboxMin: [-100, 0, -100, 0],
        bboxMax: [100, 50, zMax, 0],
        boxCount: 1,
        boxStride: 112,
        headerRest: '101010100000000000000000',
        boxesHex: '00'.repeat(112),
      },
    },
    faces: [
      { normal: [0, 1, 0], v0: 0, v1: 1, v2: 2, pad12: 0, attr14: 0, surfaceAttr, attr1c: 0 },
      { normal: [0, 1, 0], v0: 0, v1: 2, v2: 3, pad12: 0, attr14: 0, surfaceAttr: surfaceAttr + 1, attr1c: 0 },
    ],
    vertices: [
      [-100, 0, -100, 0],
      [100, 0, -100, 0],
      [100, 0, zMax, 0],
      [-100, 0, zMax, 0],
    ],
    links: ['00'.repeat(32)],
    adjacencies: [
      { faceIndex: 0, edges: [-1, 1, -1], flags: 0 },
      { faceIndex: 1, edges: [0, -1, -1], flags: 0 },
    ],
    groupGrids: [
      {
        magic: SBC_GRCO_MAGIC,
        version: SBC_GRCO_VERSION,
        bboxMin: [-100, 0, -100, 0],
        bboxMax: [100, 50, zMax, 0],
        gridX: 2,
        gridZ: 2,
        indexType: 1,
        hasFlatCells: 1,
        cellsHex: '0000000002000000'.repeat(4),
        indexCount: 4,
        indicesHex: '0000010000000100',
      },
    ],
  };
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS [${passed}] ${name}`);
}

const summary = { realCtcCount: 0, realSbcCount: 0 };

try {
  await check('CTC synthetic roundtrip + semantic parse', () => {
    const bin = serializeCtc(makeSyntheticCtc({ damping: 0.25, radius: 5.0, boneId: 202 }));
    const parsed = parseCtc(bin, 'synthetic.ctc');
    assert.equal(parsed.groupCount, 1);
    assert.equal(parsed.nodeCount, 2);
    assert.equal(parsed.groups[0].damping, 0.25);
    assert.equal(parsed.nodes[0].boneId, 202);
    assert.equal(parsed.nodes[0].radius, 5.0);
    const rt = serializeCtc(parsed);
    assert.ok(rt.equals(bin), 'CTC synthetic byte-exact roundtrip');
  });

  await check('CTC negative mutant controls (bad magic, bad version, truncated, OOB count)', () => {
    const valid = serializeCtc(makeSyntheticCtc());
    const badMagic = Buffer.from(valid);
    badMagic.write('BAD\0', 0, 'latin1');
    assert.throws(() => parseCtc(badMagic), /bad CTC magic/);

    const badVer = Buffer.from(valid);
    badVer.writeUInt32LE(0x99, 0x04);
    assert.throws(() => parseCtc(badVer), /unsupported CTC version/);

    assert.throws(() => parseCtc(valid.subarray(0, CTC_HEADER_SIZE - 1)), /buffer too small/);
    assert.throws(() => parseCtc(valid.subarray(0, valid.length - 4)), /out of bounds/);

    const oobCount = Buffer.from(valid);
    oobCount.writeUInt32LE(5000, 0x10);
    assert.throws(() => parseCtc(oobCount), /out of bounds/);
  });

  await check('CTC semantic diff + mutant SHA inequality', () => {
    const binA = serializeCtc(makeSyntheticCtc({ damping: 0.25, radius: 5.0, boneId: 202 }));
    const binB = serializeCtc(makeSyntheticCtc({ damping: 0.6, radius: 9.0, boneId: 205 }));
    assert.notEqual(sha256(binB), sha256(binA), 'mutated CTC SHA must differ from baseline');
    const diff = summarizeCtcDiff(binA, binB);
    assert.equal(diff.changedGroupCount, 1);
    assert.equal(diff.changedNodeCount, 2);
    assert.ok(Math.abs(diff.changedGroups[0].diffs.damping[1] - 0.6) < 1e-5);
    assert.equal(diff.changedNodes[0].diffs.boneId[1], 205);
    assert.equal(diff.changedNodes[0].diffs.radius[1], 9.0);
  });

  await check('SBC synthetic roundtrip + semantic parse', () => {
    const bin = serializeSbc(makeSyntheticSbc({ zMax: 355.0, surfaceAttr: 0x10000 }));
    const parsed = parseSbc(bin, 'synthetic.sbc');
    assert.equal(parsed.groupCount, 1);
    assert.equal(parsed.faceCount, 2);
    assert.equal(parsed.vertexCount, 4);
    assert.equal(parsed.adjCount, 2);
    assert.equal(parsed.linkCount, 1);
    assert.equal(parsed.faces[0].surfaceAttr, 0x10000);
    assert.equal(parsed.vertices[2][2], 355.0);
    const rt = serializeSbc(parsed);
    assert.ok(rt.equals(bin), 'SBC synthetic byte-exact roundtrip');
  });

  await check('SBC negative mutant controls (bad magic, bad version, truncated, OOB count)', () => {
    const valid = serializeSbc(makeSyntheticSbc());
    const badMagic = Buffer.from(valid);
    badMagic.write('NOPE', 0, 'latin1');
    assert.throws(() => parseSbc(badMagic), /bad SBC magic/);

    const badVer = Buffer.from(valid);
    badVer.writeUInt32LE(0x12345678, 0x04);
    assert.throws(() => parseSbc(badVer), /unsupported SBC version/);

    assert.throws(() => parseSbc(valid.subarray(0, SBC_HEADER_SIZE - 1)), /buffer too small/);
    assert.throws(() => parseSbc(valid.subarray(0, SBC_HEADER_SIZE + 8)), /out of bounds/);

    const oobCount = Buffer.from(valid);
    oobCount.writeUInt32LE(999999, 0x18);
    assert.throws(() => parseSbc(oobCount), /out of bounds/);
  });

  await check('SBC semantic diff + mutant SHA inequality', () => {
    const binA = serializeSbc(makeSyntheticSbc({ zMax: 355.0, surfaceAttr: 0x10000 }));
    const binB = serializeSbc(makeSyntheticSbc({ zMax: 420.0, surfaceAttr: 0x20000 }));
    assert.notEqual(sha256(binB), sha256(binA), 'mutated SBC SHA must differ from baseline');
    const diff = summarizeSbcDiff(binA, binB);
    assert.equal(diff.bboxChanged, true);
    assert.equal(diff.changedFaceCount, 2);
    assert.equal(diff.changedVertexCount, 2);
    assert.equal(diff.changedFaces[0].surfaceAttr[1], 0x20000);
    assert.equal(diff.changedVertices[0].mod[2], 420.0);
  });

  await check('mod-diff diffArcs semantic integration for CTC & SBC', () => {
    const arcA = packArc([
      { name: 'enemy\\em085\\em085_00\\mod\\em085_00', typeHash: TYPE_CTC, data: serializeCtc(makeSyntheticCtc({ damping: 0.25, radius: 5.0 })) },
      { name: 'stage\\m00d\\m00a02d\\collision\\m00a02d-a-g00-s00', typeHash: TYPE_SBC, data: serializeSbc(makeSyntheticSbc({ zMax: 355.0, surfaceAttr: 0x10000 })) },
    ]);
    const arcB = packArc([
      { name: 'enemy\\em085\\em085_00\\mod\\em085_00', typeHash: TYPE_CTC, data: serializeCtc(makeSyntheticCtc({ damping: 0.6, radius: 9.0 })) },
      { name: 'stage\\m00d\\m00a02d\\collision\\m00a02d-a-g00-s00', typeHash: TYPE_SBC, data: serializeSbc(makeSyntheticSbc({ zMax: 420.0, surfaceAttr: 0x20000 })) },
    ]);
    const diff = diffArcs(arcA, arcB);
    assert.equal(diff.modified.length, 2);
    const ctcMod = diff.modified.find(m => m.semantic.kind === 'CTC');
    const sbcMod = diff.modified.find(m => m.semantic.kind === 'SBC');
    assert.ok(ctcMod && ctcMod.semantic.changedGroupCount === 1 && ctcMod.semantic.changedNodeCount === 2);
    assert.ok(sbcMod && sbcMod.semantic.bboxChanged === true && sbcMod.semantic.changedFaceCount === 2);
  });

  await check('CLI inspect, verify-roundtrip, diff & negative exit 2', () => {
    fs.mkdirSync(TMP_ROOT, { recursive: true });
    const ctcA = path.join(TMP_ROOT, 'a.ctc');
    const ctcB = path.join(TMP_ROOT, 'b.ctc');
    const sbcA = path.join(TMP_ROOT, 'a.sbc');
    const sbcB = path.join(TMP_ROOT, 'b.sbc');
    fs.writeFileSync(ctcA, serializeCtc(makeSyntheticCtc({ damping: 0.25 })));
    fs.writeFileSync(ctcB, serializeCtc(makeSyntheticCtc({ damping: 0.5 })));
    fs.writeFileSync(sbcA, serializeSbc(makeSyntheticSbc({ zMax: 355.0 })));
    fs.writeFileSync(sbcB, serializeSbc(makeSyntheticSbc({ zMax: 420.0 })));

    const r1 = runCli(['inspect', ctcA, '--json']);
    assert.equal(r1.status, 0, r1.stderr);
    assert.equal(JSON.parse(r1.stdout).kind, 'CTC');

    const r2 = runCli(['verify-roundtrip', sbcA, '--json']);
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(JSON.parse(r2.stdout).ok, true);

    const r3 = runCli(['diff', ctcA, ctcB, '--json']);
    assert.equal(r3.status, 0, r3.stderr);
    assert.equal(JSON.parse(r3.stdout).changedGroupCount, 1);

    const r4 = runCli(['diff', sbcA, sbcB, '--json']);
    assert.equal(r4.status, 0, r4.stderr);
    assert.equal(JSON.parse(r4.stdout).bboxChanged, true);

    const rBad = runCli(['unknown', ctcA]);
    assert.equal(rBad.status, 2);
  });

  await check('Real RomFS roundtrip when available (>=10 real CTC + >=5 real SBC)', () => {
    if (!fs.existsSync(ROMFS_ARC_DIR)) {
      console.log('  note: RomFS arc dir absent; real-archive check skipped cleanly');
      return;
    }

    const ctcArcs = [
      'enemy/em085_00.arc',
      'otomo/mod/018/h.arc',
      'otomo/mod/019/h.arc',
      'otomo/mod/020/h.arc',
      'otomo/mod/021/h.arc',
      'otomo/mod/022/h.arc',
      'otomo/mod/029/h.arc',
      'otomo/mod/036/h.arc',
      'otomo/mod/037/h.arc',
      'otomo/mod/042/b.arc',
    ];
    for (const rel of ctcArcs) {
      const p = path.join(ROMFS_ARC_DIR, rel);
      if (!fs.existsSync(p)) continue;
      const abuf = fs.readFileSync(p);
      const arc = readArc(abuf, p);
      for (const e of arc.entries) {
        if ((e.typeHash >>> 0) !== TYPE_CTC) continue;
        const raw = inflateEntry(abuf, e, p);
        const parsed = parseCtc(raw, `${rel}::${e.name}`);
        const rt = serializeCtc(parsed);
        assert.ok(rt.equals(raw), `${rel}::${e.name} CTC byte-exact roundtrip failed`);
        summary.realCtcCount++;
      }
    }

    const sbcArcs = [
      'stage/m00d/a02.arc',
      'stage/m05d/m05d.arc',
      'stage/m11d/m11d.arc',
      'stage/m19d/m19d.arc',
      'stage/m20d/m20d.arc',
      'enemy/em012_00.arc',
      'enemy/em087_00.arc',
    ];
    for (const rel of sbcArcs) {
      const p = path.join(ROMFS_ARC_DIR, rel);
      if (!fs.existsSync(p)) continue;
      const abuf = fs.readFileSync(p);
      const arc = readArc(abuf, p);
      for (const e of arc.entries) {
        if ((e.typeHash >>> 0) !== TYPE_SBC) continue;
        const raw = inflateEntry(abuf, e, p);
        const parsed = parseSbc(raw, `${rel}::${e.name}`);
        const rt = serializeSbc(parsed);
        assert.ok(rt.equals(raw), `${rel}::${e.name} SBC byte-exact roundtrip failed`);
        summary.realSbcCount++;
      }
    }

    assert.ok(summary.realCtcCount >= 10, `expected >=10 real CTC files verified, got ${summary.realCtcCount}`);
    assert.ok(summary.realSbcCount >= 5, `expected >=5 real SBC files verified, got ${summary.realSbcCount}`);
  });

  await check('mod-diff.mjs --selftest passes 100%', async () => {
    const res = await modDiffSelfTest();
    assert.equal(res.ok, true, `mod-diff selftest failed: ${res.failures.join('; ')}`);
  });
} finally {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
}

console.log(`SELFTEST OK (${passed} checks passed, realCtc=${summary.realCtcCount}, realSbc=${summary.realSbcCount})`);
