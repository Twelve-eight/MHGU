// Independent positive/negative self-test suite for Wave 6 clean-room MHGU player combat tools:
//   - MHGU/tools/mhgu/player-combat.mjs (HTS, PMA, FUP byte-exact roundtrip + PSL parser + CLI)
//   - Scans real RomFS player/quest/*.arc when present; falls back cleanly to synthetic fixtures when absent
//   - Negative controls: bad magic, bad version, truncated buffer, out-of-bounds offsets, length mismatch, CLI exit 2
//   - MHGU/tools/mhgu/mod-diff.mjs semantic diff integration for HTS/PMA/FUP/PSL
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readArc, inflateEntry, packArc } from './arc.mjs';
import { diffArcs, runSelfTest as modDiffSelfTest } from './mod-diff.mjs';
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
const CLI = path.join(HERE, 'player-combat.mjs');
const QUEST_ARC_DIR = 'G:/mhgu-romfs/romfs/nativeNX/arc/player/quest';
const TMP_ROOT = `G:/tmp/mhgu-wave6-selftest-${process.pid}`;

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TEMP: 'G:/tmp', TMP: 'G:/tmp' },
  });
}

function makeSyntheticFixtures() {
  const htsModel = {
    groups: [
      {
        items: [
          { boneA: 8, boneB: 8, shapeType: 1, subFlags: 0, condFlags: 0, radius: 52.0, p0: [0, 0, 100], pad0: 0, p1: [0, 0, 220], pad1: 0 },
          { boneA: 0xff, boneB: 0, shapeType: 0, subFlags: 1, condFlags: 0, radius: 100.0, p0: [-41, 20, 43], pad0: 0, p1: [0, 0, 0], pad1: 0 },
        ],
      },
      {
        items: [
          { boneA: 12, boneB: 12, shapeType: 5, subFlags: 0, condFlags: 0, radius: 75.5, p0: [1, 2, 3], pad0: 0, p1: [260, 0, 0], pad1: 0 },
        ],
      },
    ],
  };

  const pmaModel = {
    records: [
      { frame: 2.0, hitDataIndex: 35, hitWorkId: 0, atkType: 0 },
      { frame: 24.5, hitDataIndex: -1, hitWorkId: 1, atkType: 21 },
    ],
  };

  const fupModel = {
    ints: [-1, -2, 0, 15],
    floats: [13.3, 100.0, 0.7],
    vecs: [[0, 10, -5.5], [1.25, 2.5, 3.75]],
  };

  // Synthetic PSL with 3 slots: slot[0] populated normal, slot[1] null, slot[2] flags&2 skip
  const pslBuf = Buffer.alloc(8 + 12 + 32 + 340 + 16 + 328, 0);
  pslBuf.write('PSL\0', 0, 'latin1');
  pslBuf.writeUInt16LE(2, 4);
  pslBuf.writeUInt16LE(3, 6);
  const e0 = 20;
  const e2 = 36;
  const sub0 = 52;
  const tl0 = sub0 + 332;
  const sub2 = tl0 + 16;
  pslBuf.writeUInt32LE(e0, 8);
  pslBuf.writeUInt32LE(0, 12);
  pslBuf.writeUInt32LE(e2, 16);

  // slot[0] entry & sub with 2 channels
  pslBuf.writeUInt32LE(51, e0 + 0);
  pslBuf[e0 + 7] = 0;
  pslBuf.writeUInt32LE(sub0, e0 + 8);
  pslBuf.writeUInt32LE(0b11, sub0 + 0);
  pslBuf.writeUInt16LE(251, sub0 + 4);
  pslBuf.writeUInt16LE(252, sub0 + 6);
  pslBuf.writeUInt32LE(2, sub0 + 0x144);
  pslBuf.writeUInt32LE(tl0, sub0 + 0x148);
  pslBuf.writeUInt32LE(0, tl0 + 0);
  pslBuf.writeUInt32LE(18, tl0 + 4);
  pslBuf.writeUInt32LE(2, tl0 + 8);
  pslBuf.writeUInt32LE(33, tl0 + 12);

  // slot[2] entry with flags & 2 -> +0x148 sentinel 0xdeadbeef must NOT be dereferenced
  pslBuf.writeUInt32LE(40, e2 + 0);
  pslBuf[e2 + 7] = 2;
  pslBuf.writeUInt32LE(sub2, e2 + 8);
  pslBuf.writeUInt32LE(1, sub2 + 0);
  pslBuf.writeUInt16LE(300, sub2 + 4);
  pslBuf.writeUInt32LE(0xdeadbeef, sub2 + 0x148); // only 328 B allocated, no +0x148 deref when flags&2

  return {
    htsBuf: writeHts(htsModel),
    pmaBuf: writePma(pmaModel),
    fupBuf: writeFup(fupModel),
    pslBuf,
  };
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS [${passed}] ${name}`);
}

const summary = {
  romfsPresent: fs.existsSync(QUEST_ARC_DIR),
  romfsCounts: { hts: 0, pma: 0, fup: 0, psl: 0 },
};

try {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const syn = makeSyntheticFixtures();

  // -------------------------------------------------------------------------
  // 1. Synthetic positive controls (always runs even without private RomFS)
  // -------------------------------------------------------------------------
  await check('Synthetic HTS/PMA/FUP exact byte roundtrip & PSL parsing (including flags&2)', () => {
    const hts = readHts(syn.htsBuf, 'syn.hts');
    assert.equal(hts.groupCount, 2);
    assert.equal(hts.totalItems, 3);
    assert.equal(hts.groups[1].items[0].p1[0], 260);
    assert.equal(Buffer.compare(writeHts(hts), syn.htsBuf), 0);

    const pma = readPma(syn.pmaBuf, 'syn.pma');
    assert.equal(pma.header, 6.0);
    assert.equal(pma.count, 2);
    assert.equal(pma.records[1].hitDataIndex, -1);
    assert.equal(pma.records[1].atkType, 21);
    assert.equal(Buffer.compare(writePma(pma), syn.pmaBuf), 0);

    const fup = readFup(syn.fupBuf, 'syn.fup');
    assert.deepEqual(fup.ints, [-1, -2, 0, 15]);
    assert.equal(fup.vecs.length, 2);
    assert.equal(Buffer.compare(writeFup(fup), syn.fupBuf), 0);

    const psl = readPsl(syn.pslBuf, 'syn.psl');
    assert.equal(psl.count, 3);
    assert.equal(psl.nonEmptyCount, 2);
    assert.equal(psl.slots[1], null);
    assert.deepEqual(psl.slots[0].sub.uniqueIds, [{ channel: 0, uniqueId: 251 }, { channel: 1, uniqueId: 252 }]);
    assert.equal(psl.slots[0].sub.timeline.length, 2);
    assert.equal(psl.slots[2].skipTimelineFlag2, true);
    assert.equal(psl.slots[2].sub.timeline, null);
  });

  // -------------------------------------------------------------------------
  // 2. Real RomFS scan across all player/quest/*.arc (if present)
  // -------------------------------------------------------------------------
  if (summary.romfsPresent) {
    await check('RomFS full scan (com + w00..w14): 100% HTS/PMA/FUP roundtrip & PSL zero-OOB parsing', () => {
      const arcFiles = fs.readdirSync(QUEST_ARC_DIR).filter(f => f.endsWith('.arc')).sort();
      assert.ok(arcFiles.length >= 14, `expected >= 14 quest arcs, got ${arcFiles.length}`);
      for (const f of arcFiles) {
        const arcPath = path.join(QUEST_ARC_DIR, f);
        const arcBuf = fs.readFileSync(arcPath);
        const arc = readArc(arcBuf, arcPath);
        for (const e of arc.entries) {
          const th = e.typeHash >>> 0;
          if (th !== TYPE_HTS && th !== TYPE_PMA && th !== TYPE_FUP && th !== TYPE_PSL) continue;
          const payload = inflateEntry(arcBuf, e, `${f}::${e.name}`);
          if (th === TYPE_HTS) {
            const parsed = readHts(payload, `${f}::${e.name}`);
            const re = writeHts(parsed);
            assert.equal(Buffer.compare(re, payload), 0, `HTS roundtrip mismatch on ${f}::${e.name}`);
            summary.romfsCounts.hts++;
          } else if (th === TYPE_PMA) {
            const parsed = readPma(payload, `${f}::${e.name}`);
            const re = writePma(parsed);
            assert.equal(Buffer.compare(re, payload), 0, `PMA roundtrip mismatch on ${f}::${e.name}`);
            summary.romfsCounts.pma++;
          } else if (th === TYPE_FUP) {
            const parsed = readFup(payload, `${f}::${e.name}`);
            const re = writeFup(parsed);
            assert.equal(Buffer.compare(re, payload), 0, `FUP roundtrip mismatch on ${f}::${e.name}`);
            summary.romfsCounts.fup++;
          } else if (th === TYPE_PSL) {
            const parsed = readPsl(payload, `${f}::${e.name}`);
            assert.equal(parsed.version, 2);
            summary.romfsCounts.psl++;
          }
        }
      }
      assert.ok(summary.romfsCounts.hts > 0 && summary.romfsCounts.pma > 0 && summary.romfsCounts.fup > 0 && summary.romfsCounts.psl > 0);
      console.log(`  RomFS verified: HTS=${summary.romfsCounts.hts}, PMA=${summary.romfsCounts.pma}, FUP=${summary.romfsCounts.fup}, PSL=${summary.romfsCounts.psl}`);
    });
  } else {
    console.log('SKIP RomFS scan (G:/mhgu-romfs/romfs/nativeNX/arc/player/quest not present; synthetic controls active)');
  }

  // -------------------------------------------------------------------------
  // 3. Negative controls (>= 6 distinct failure modes)
  // -------------------------------------------------------------------------
  await check('Negative [1]: bad magic / bad PMA header rejected', () => {
    const badHts = Buffer.from(syn.htsBuf); badHts.write('BAD\0', 0, 'latin1');
    assert.throws(() => readHts(badHts), /bad HTS magic/);

    const badPma = Buffer.from(syn.pmaBuf); badPma.writeFloatLE(7.0, 0);
    assert.throws(() => readPma(badPma), /bad PMA header/);

    const badFup = Buffer.from(syn.fupBuf); badFup.write('NOPE', 0, 'latin1');
    assert.throws(() => readFup(badFup), /bad FUP magic/);

    const badPsl = Buffer.from(syn.pslBuf); badPsl.write('NOPE', 0, 'latin1');
    assert.throws(() => readPsl(badPsl), /bad PSL magic/);
  });

  await check('Negative [2]: bad version rejected for HTS, FUP, PSL', () => {
    const vHts = Buffer.from(syn.htsBuf); vHts.writeUInt32LE(0x11111111, 4);
    assert.throws(() => readHts(vHts), /unsupported HTS version/);

    const vFup = Buffer.from(syn.fupBuf); vFup.writeUInt32LE(99, 4);
    assert.throws(() => readFup(vFup), /unsupported FUP version/);

    const vPsl = Buffer.from(syn.pslBuf); vPsl.writeUInt16LE(3, 4);
    assert.throws(() => readPsl(vPsl), /unsupported PSL version/);
  });

  await check('Negative [3]: truncated buffers rejected across all 4 formats', () => {
    assert.throws(() => readHts(syn.htsBuf.subarray(0, 8)), /too small/);
    assert.throws(() => readHts(syn.htsBuf.subarray(0, syn.htsBuf.length - 4)), /extend past EOF|length/);
    assert.throws(() => readPma(syn.pmaBuf.subarray(0, 4)), /too small/);
    assert.throws(() => readPma(syn.pmaBuf.subarray(0, syn.pmaBuf.length - 2)), /length/);
    assert.throws(() => readFup(syn.fupBuf.subarray(0, 12)), /too small/);
    assert.throws(() => readFup(syn.fupBuf.subarray(0, syn.fupBuf.length - 4)), /length/);
    assert.throws(() => readPsl(syn.pslBuf.subarray(0, 4)), /too small/);
    assert.throws(() => readPsl(syn.pslBuf.subarray(0, 12)), /truncated/);
  });

  await check('Negative [4]: out-of-bounds offsets rejected (HTS payloadOffset, PSL entry/sub/+0x148 timeline)', () => {
    const oobHts = Buffer.from(syn.htsBuf);
    oobHts.writeUInt32LE(oobHts.length + 16, 16 + 4);
    assert.throws(() => readHts(oobHts), /out of bounds/);

    const oobPslEntry = Buffer.from(syn.pslBuf);
    oobPslEntry.writeUInt32LE(oobPslEntry.length - 4, 8);
    assert.throws(() => readPsl(oobPslEntry), /out of bounds/);

    const oobPslTl = Buffer.from(syn.pslBuf);
    const sub0 = 52;
    oobPslTl.writeUInt32LE(oobPslTl.length + 8, sub0 + 0x148);
    assert.throws(() => readPsl(oobPslTl), /\+0x148 timelineOffset.*out of bounds/);
  });

  await check('Negative [5]: trailing garbage / count mismatch rejected (PMA & FUP & HTS)', () => {
    assert.throws(() => readPma(Buffer.concat([syn.pmaBuf, Buffer.from([1, 2, 3, 4])])), /PMA length/);
    assert.throws(() => readFup(Buffer.concat([syn.fupBuf, Buffer.from([1, 2, 3, 4])])), /FUP length/);
    assert.throws(() => readHts(Buffer.concat([syn.htsBuf, Buffer.from([1, 2, 3, 4])])), /HTS length/);
  });

  await check('Negative [6] + CLI closure (0 / 1 / 2) for player-combat.mjs', () => {
    const pHts = path.join(TMP_ROOT, 'syn.hts');
    const pPma = path.join(TMP_ROOT, 'syn.pma');
    const pFup = path.join(TMP_ROOT, 'syn.fup');
    const pPsl = path.join(TMP_ROOT, 'syn.psl');
    fs.writeFileSync(pHts, syn.htsBuf);
    fs.writeFileSync(pPma, syn.pmaBuf);
    fs.writeFileSync(pFup, syn.fupBuf);
    fs.writeFileSync(pPsl, syn.pslBuf);

    // Valid invocations -> exit 0 + valid JSON
    for (const [cmd, file, fmt] of [['hts', pHts, 'HTS'], ['pma', pPma, 'PMA'], ['fup', pFup, 'FUP'], ['psl', pPsl, 'PSL']]) {
      const r = runCli([cmd, file]);
      assert.equal(r.status, 0, `${cmd} exit 0: ${r.stderr}`);
      assert.equal(JSON.parse(r.stdout).format, fmt);
    }

    // Missing / corrupt file -> exit 1
    assert.equal(runCli(['hts', path.join(TMP_ROOT, 'missing.hts')]).status, 1);

    // Bad CLI args -> exit 2
    assert.equal(runCli([]).status, 2);
    assert.equal(runCli(['unknown', pHts]).status, 2);
    assert.equal(runCli(['hts']).status, 2);
    assert.equal(runCli(['hts', pHts, '--extra']).status, 2);
    assert.equal(runCli(['--bogus', pHts]).status, 2);
  });

  await check('Audit hardening: HTS overlap/swapped-offset/alignment, PSL < tableEnd, writer integer bounds', () => {
    // [MAJOR-1] HTS swapped non-overlapping group offsets roundtrip byte-exact; overlapping/unaligned rejected
    const htsSwapped = Buffer.alloc(16 + 2 * 8 + 2 * 48, 0);
    htsSwapped.write('HTS\0', 0, 'latin1');
    htsSwapped.writeUInt32LE(0x20131015, 4);
    htsSwapped.writeUInt32LE(2, 8);
    htsSwapped.writeUInt32LE(1, 16);
    htsSwapped.writeUInt32LE(32 + 48, 20); // group[0] @ 80
    htsSwapped.writeUInt32LE(1, 24);
    htsSwapped.writeUInt32LE(32, 28);      // group[1] @ 32
    htsSwapped.writeFloatLE(42.0, 32 + 0x0c);
    htsSwapped.writeFloatLE(99.0, 80 + 0x0c);
    const parsedSwapped = readHts(htsSwapped, 'swapped.hts');
    assert.equal(Buffer.compare(writeHts(parsedSwapped), htsSwapped), 0);

    const htsOverlap = Buffer.from(htsSwapped);
    htsOverlap.writeUInt32LE(36, 20); // [36, 84) overlaps [32, 80)
    assert.throws(() => readHts(htsOverlap), /overlaps/);

    const htsUnaligned = Buffer.from(htsSwapped);
    htsUnaligned.writeUInt32LE(33, 20);
    assert.throws(() => readHts(htsUnaligned), /4-byte aligned/);

    assert.throws(() => writeHts({
      groups: [
        { payloadOffset: 32, items: [{ boneA: 1, boneB: 1, shapeType: 0, subFlags: 0, radius: 1 }] },
        { payloadOffset: 40, items: [{ boneA: 1, boneB: 1, shapeType: 0, subFlags: 0, radius: 1 }] },
      ],
    }), /overlaps/);

    // [MAJOR-2] PSL offsets pointing into header/table (< tableEnd) rejected
    const pslBadEntry = Buffer.from(syn.pslBuf);
    pslBadEntry.writeUInt32LE(4, 8);
    assert.throws(() => readPsl(pslBadEntry), /overlaps header\/table/);

    const pslBadSub = Buffer.from(syn.pslBuf);
    pslBadSub.writeUInt32LE(4, 20 + 8);
    assert.throws(() => readPsl(pslBadSub), /overlaps header\/table/);

    const pslBadTl = Buffer.from(syn.pslBuf);
    pslBadTl.writeUInt32LE(8, 52 + 0x148);
    assert.throws(() => readPsl(pslBadTl), /overlaps header\/table/);

    // [MINOR-2] Writers reject out-of-range integers & conflicting PMA rawFlags instead of silent truncation
    assert.throws(() => writeHts({ groups: [{ items: [{ boneA: 70000, boneB: 0, shapeType: 0, subFlags: 0, radius: 1 }] }] }), RangeError);
    assert.throws(() => writeHts({ reserved: 1, groups: [] }), /non-zero reserved/);
    assert.throws(() => writePma({ records: [{ frame: 1, hitDataIndex: 0, hitWorkId: 256, atkType: 0 }] }), RangeError);
    assert.throws(() => writePma({ records: [{ frame: 1, hitDataIndex: 0, hitWorkId: 0, atkType: -1 }] }), RangeError);
    assert.throws(() => writePma({ records: [{ frame: 1, rawFlags: 0x12345678, hitDataIndex: 1, hitWorkId: 0, atkType: 0 }] }), /conflicts/);
    assert.throws(() => writeFup({ ints: [3000000000], floats: [], vecs: [] }), RangeError);
  });

  // -------------------------------------------------------------------------
  // 4. mod-diff.mjs integration check
  // -------------------------------------------------------------------------
  await check('mod-diff.mjs --selftest passes (including HTS/PMA/FUP/PSL semantic diffs)', async () => {
    const res = await modDiffSelfTest();
    assert.equal(res.ok, true, JSON.stringify(res.failures));
  });

  console.log(`\nALL WAVE6 SELFTESTS PASSED (${passed}/${passed} checks)`);
} finally {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
}
