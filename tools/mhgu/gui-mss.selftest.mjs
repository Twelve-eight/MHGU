// Independent positive/negative self-test suite for Wave 10 clean-room MHGU GUI & MSS tools:
//   - MHGU/tools/mhgu/gui-mss.mjs (`parseGui`/`serializeGui`, `parseMss`/`serializeMss`, CLI)
//   - Synthetic positive + negative mutant controls (bad magic, bad version, truncated, size mismatch, mutated frame/soundId)
//   - Optional real RomFS byte-exact round-trip across `w00..w15.arc` (`MSS\0`) and `rGUI` (`GUI\0`) when present
//   - MHGU/tools/mhgu/mod-diff.mjs semantic diff integration for `GUI` and `MSS`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readArc, inflateEntry, packArc } from './arc.mjs';
import { diffArcs, runSelfTest as modDiffSelfTest } from './mod-diff.mjs';
import {
  TYPE_GUI,
  TYPE_MSS,
  GUI_HEADER_SIZE,
  MSS_DIR_START,
  MSS_LUT_SLOTS,
  parseGui,
  serializeGui,
  summarizeGuiDiff,
  parseMss,
  serializeMss,
  summarizeMssDiff,
} from './gui-mss.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'gui-mss.mjs');
const ROMFS_ARC_DIR = 'G:/mhgu-romfs/romfs/nativeNX/arc';
const TMP_ROOT = `G:/tmp/mhgu-wave10-selftest-${process.pid}`;

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TEMP: 'G:/tmp', TMP: 'G:/tmp' },
  });
}

function makeSyntheticMss({ frame = 16, soundId = 358, hitParam = 12 } = {}) {
  const lut = new Array(MSS_LUT_SLOTS).fill(0xffff);
  lut[0] = 0;
  lut[1] = 1;
  return {
    slotCount: 512,
    reserved: 0,
    motionToSeq: lut,
    sequences: [
      {
        motionId: 5000,
        maxFrame: 300,
        flags: -1,
        tailSentinel: 0x0000ffff,
        frameGroups: [],
      },
      {
        motionId: 5002,
        maxFrame: 70,
        flags: -1,
        tailSentinel: 0x0000ffff,
        frameGroups: [
          {
            frame,
            calls: [
              {
                soundId,
                args: [3, 6],
                params: [
                  { code: 3, width: 2, value: hitParam },
                  { code: 6, width: 2, value: 1 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeSyntheticGui({ width = 1280, height = 720, extraLabel = 'HudMain' } = {}) {
  return {
    screenWidth: width,
    screenHeight: height,
    guiFlags: 5,
    timestamp: 0x5a20bd1a,
    objects: [
      { name: 'RootNull', typeId: 1, paramCount: 2 },
      { name: extraLabel, typeId: 4, paramCount: 3 },
    ],
    strings: ['DEFAULT', 'SELECT', extraLabel],
  };
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS [${passed}] ${name}`);
}

const summary = { mssSyntheticOk: false, guiSyntheticOk: false, realMssCount: 0, realGuiCount: 0 };

try {
  await check('MSS synthetic roundtrip + semantic parse', () => {
    const doc = makeSyntheticMss({ frame: 16, soundId: 358, hitParam: 12 });
    const bin = serializeMss(doc);
    const parsed = parseMss(bin, 'synthetic.mss');
    assert.equal(parsed.seqCount, 2);
    assert.equal(parsed.slotCount, 512);
    assert.equal(parsed.sequences[1].motionId, 5002);
    assert.equal(parsed.sequences[1].frameGroups[0].frame, 16);
    assert.equal(parsed.sequences[1].frameGroups[0].calls[0].soundId, 358);
    assert.equal(parsed.sequences[1].frameGroups[0].calls[0].params[0].value, 12);
    const rt = serializeMss(parsed);
    assert.ok(rt.equals(bin), 'MSS synthetic byte-exact roundtrip');
    summary.mssSyntheticOk = true;
  });

  await check('MSS negative mutant controls (bad magic, bad version, truncated, OOB offset)', () => {
    const valid = serializeMss(makeSyntheticMss());
    const badMagic = Buffer.from(valid);
    badMagic.write('BAD\0', 0, 'latin1');
    assert.throws(() => parseMss(badMagic), /bad MSS magic/);

    const badVer = Buffer.from(valid);
    badVer.writeUInt32LE(0xdeadbeef, 4);
    assert.throws(() => parseMss(badVer), /unsupported MSS version/);

    assert.throws(() => parseMss(valid.subarray(0, MSS_DIR_START - 1)), /buffer too small/);
    assert.throws(() => parseMss(valid.subarray(0, MSS_DIR_START + 4)), /directory truncated/);

    const badOff = Buffer.from(valid);
    badOff.writeUInt32LE(0x7fffffff, MSS_DIR_START + 4);
    assert.throws(() => parseMss(badOff), /out of bounds/);
  });

  await check('MSS semantic diff detects mutated trigger frame & soundId', () => {
    const binA = serializeMss(makeSyntheticMss({ frame: 16, soundId: 358, hitParam: 12 }));
    const binB = serializeMss(makeSyntheticMss({ frame: 22, soundId: 360, hitParam: 19 }));
    const diff = summarizeMssDiff(binA, binB);
    assert.equal(diff.changedCount, 1);
    assert.equal(diff.changedMotions[0].motionId, 5002);
    assert.equal(diff.changedMotions[0].changedFrames.length, 2);
    assert.deepEqual(diff.changedMotions[0].changedFrames.map(f => [f.frame, f.kind]), [[16, 'REMOVED'], [22, 'ADDED']]);
  });

  await check('GUI synthetic roundtrip + semantic parse', () => {
    const bin = serializeGui(makeSyntheticGui({ width: 1280, height: 720, extraLabel: 'HudMain' }));
    const parsed = parseGui(bin, 'synthetic.gui');
    assert.equal(parsed.screenWidth, 1280);
    assert.equal(parsed.screenHeight, 720);
    assert.equal(parsed.objects.length, 2);
    assert.equal(parsed.objects[1].name, 'HudMain');
    assert.ok(parsed.strings.some(s => s.text === 'HudMain'));
    const rt = serializeGui(parsed);
    assert.ok(rt.equals(bin), 'GUI synthetic byte-exact roundtrip');
    summary.guiSyntheticOk = true;
  });

  await check('GUI negative mutant controls (bad magic, bad version, truncated, size mismatch, OOB offset)', () => {
    const valid = serializeGui(makeSyntheticGui());
    const badMagic = Buffer.from(valid);
    badMagic.write('NOPE', 0, 'latin1');
    assert.throws(() => parseGui(badMagic), /bad GUI magic/);

    const badVer = Buffer.from(valid);
    badVer.writeUInt32LE(0x12345678, 4);
    assert.throws(() => parseGui(badVer), /unsupported GUI version/);

    assert.throws(() => parseGui(valid.subarray(0, GUI_HEADER_SIZE - 1)), /buffer too small/);

    const badSize = Buffer.from(valid);
    badSize.writeUInt32LE(valid.length + 16, 0x08);
    assert.throws(() => parseGui(badSize), /fileSize/);

    const badOff = Buffer.from(valid);
    badOff.writeUInt32LE(0x7fffffff, 0xac);
    assert.throws(() => parseGui(badOff), /exceeds buffer length/);
  });

  await check('GUI semantic diff detects mutated layout/object/string', () => {
    const binA = serializeGui(makeSyntheticGui({ width: 1280, height: 720, extraLabel: 'HudMain' }));
    const binB = serializeGui(makeSyntheticGui({ width: 1920, height: 1080, extraLabel: 'HudAlt' }));
    const diff = summarizeGuiDiff(binA, binB);
    assert.equal(diff.baseResolution, '1280x720');
    assert.equal(diff.modResolution, '1920x1080');
    assert.ok(diff.addedStrings.includes('HudAlt'));
    assert.ok(diff.removedStrings.includes('HudMain'));
    assert.ok(diff.changedObjectCount >= 2);
  });

  await check('mod-diff diffArcs semantic integration for GUI & MSS', () => {
    const arcA = packArc([
      { name: 'sound\\call\\pl\\pl_wp07', typeHash: TYPE_MSS, data: serializeMss(makeSyntheticMss({ frame: 16, soundId: 358 })) },
      { name: 'GUI\\01_quest\\hud', typeHash: TYPE_GUI, data: serializeGui(makeSyntheticGui({ width: 1280, height: 720, extraLabel: 'HudMain' })) },
    ]);
    const arcB = packArc([
      { name: 'sound\\call\\pl\\pl_wp07', typeHash: TYPE_MSS, data: serializeMss(makeSyntheticMss({ frame: 20, soundId: 360 })) },
      { name: 'GUI\\01_quest\\hud', typeHash: TYPE_GUI, data: serializeGui(makeSyntheticGui({ width: 1920, height: 1080, extraLabel: 'HudAlt' })) },
    ]);
    const diff = diffArcs(arcA, arcB);
    assert.equal(diff.modified.length, 2);
    const mssMod = diff.modified.find(m => m.semantic.kind === 'MSS');
    const guiMod = diff.modified.find(m => m.semantic.kind === 'GUI');
    assert.ok(mssMod && mssMod.semantic.changedCount === 1);
    assert.ok(guiMod && guiMod.semantic.modResolution === '1920x1080');
  });

  await check('CLI smoke + negative exit 2', () => {
    fs.mkdirSync(TMP_ROOT, { recursive: true });
    const mssPath = path.join(TMP_ROOT, 'test.mss');
    const guiPath = path.join(TMP_ROOT, 'test.gui');
    fs.writeFileSync(mssPath, serializeMss(makeSyntheticMss()));
    fs.writeFileSync(guiPath, serializeGui(makeSyntheticGui()));

    const r1 = runCli(['mss', mssPath, '--json']);
    assert.equal(r1.status, 0, r1.stderr);
    assert.equal(JSON.parse(r1.stdout).seqCount, 2);

    const r2 = runCli(['gui', guiPath, '--json']);
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(JSON.parse(r2.stdout).screenWidth, 1280);

    const rBad = runCli(['unknown', mssPath]);
    assert.equal(rBad.status, 2);
  });

  await check('Real RomFS roundtrip when available (player/quest/w00..w15.arc MSS + sample GUI)', () => {
    if (!fs.existsSync(ROMFS_ARC_DIR)) {
      console.log('  note: RomFS arc dir absent; real-archive check skipped cleanly');
      return;
    }
    for (let i = 0; i <= 15; i++) {
      const p = path.join(ROMFS_ARC_DIR, `player/quest/w${String(i).padStart(2, '0')}.arc`);
      if (!fs.existsSync(p)) continue;
      const abuf = fs.readFileSync(p);
      const arc = readArc(abuf, p);
      for (const e of arc.entries) {
        if ((e.typeHash >>> 0) !== TYPE_MSS) continue;
        const raw = inflateEntry(abuf, e, p);
        const parsed = parseMss(raw, e.name);
        const rt = serializeMss(parsed);
        assert.ok(rt.equals(raw), `${p}::${e.name} MSS byte-exact roundtrip failed`);
        summary.realMssCount++;
      }
    }
    for (const rel of ['enemy/em001_00.arc']) {
      const p = path.join(ROMFS_ARC_DIR, rel);
      if (!fs.existsSync(p)) continue;
      const abuf = fs.readFileSync(p);
      const arc = readArc(abuf, p);
      for (const e of arc.entries) {
        if ((e.typeHash >>> 0) !== TYPE_MSS) continue;
        const raw = inflateEntry(abuf, e, p);
        const parsed = parseMss(raw, e.name);
        const rt = serializeMss(parsed);
        assert.ok(rt.equals(raw), `${rel}::${e.name} MSS byte-exact roundtrip failed`);
        summary.realMssCount++;
      }
    }
    for (const rel of ['debug/dbgResident.arc', 'ev/000.arc']) {
      const p = path.join(ROMFS_ARC_DIR, rel);
      if (!fs.existsSync(p)) continue;
      const abuf = fs.readFileSync(p);
      const arc = readArc(abuf, p);
      for (const e of arc.entries) {
        if ((e.typeHash >>> 0) !== TYPE_GUI) continue;
        const raw = inflateEntry(abuf, e, p);
        const parsed = parseGui(raw, e.name);
        const rt = serializeGui(parsed);
        assert.ok(rt.equals(raw), `${rel}::${e.name} GUI byte-exact roundtrip failed`);
        summary.realGuiCount++;
      }
    }
    assert.ok(summary.realMssCount >= 14, `expected >=14 real MSS files verified, got ${summary.realMssCount}`);
    assert.ok(summary.realGuiCount >= 2, `expected >=2 real GUI files verified, got ${summary.realGuiCount}`);
  });

  await check('mod-diff.mjs --selftest passes 100%', async () => {
    const res = await modDiffSelfTest();
    assert.equal(res.ok, true, `mod-diff selftest failed: ${res.failures.join('; ')}`);
  });
} finally {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
}

console.log(`SELFTEST OK (${passed} checks passed, realMss=${summary.realMssCount}, realGui=${summary.realGuiCount})`);
