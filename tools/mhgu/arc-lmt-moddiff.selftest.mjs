// Independent positive/negative self-test suite for Wave 2C clean-room MHGU tools:
//   - MHGU/tools/mhgu/arc.mjs (packArc + CLI extract/pack order preservation + em001_00 0..548 + negative controls)
//   - MHGU/tools/mhgu/lmt.mjs (+0x34 4-slot frame events + <8B/flags&2/count=0/CLI --bogus exit 2)
//   - MHGU/tools/mhgu/mod-diff.mjs (0x454F46 IPS collision, trailing bytes, lazy arm32/no-FLAT, LMT keyframe diff, 2B rawHex, flags/order/nsobid)
//   - Rigorous CLI exit code closure (0 / 1 / 2) across all three tools.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readArc, inflateEntry, packArc, ORDER_MANIFEST } from './arc.mjs';
import { readLmt, readMotionEvents, EVENT_SLOT_OFFSETS } from './lmt.mjs';
import { parsePchtxt, parseIps, disassemblePatch, diffArcs, diffModDirectory, EXPECTED_NSOBID_140, runSelfTest as modDiffSelfTest } from './mod-diff.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARC_CLI = path.join(HERE, 'arc.mjs');
const LMT_CLI = path.join(HERE, 'lmt.mjs');
const MODDIFF_CLI = path.join(HERE, 'mod-diff.mjs');

const W07_ARC = 'G:/mhgu-romfs/romfs/nativeNX/arc/player/quest/w07.arc';
const EM001_ARC = 'G:/mhgu-romfs/romfs/nativeNX/arc/enemy/em001_00.arc';
const TMP_ROOT = `G:/tmp/mhgu-wave2c-selftest-${process.pid}`;

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

function runCli(script, args, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TEMP: 'G:/tmp', TMP: 'G:/tmp', ...extraEnv },
  });
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS [${passed}] ${name}`);
}

try {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  assert.ok(fs.existsSync(W07_ARC), `missing test fixture ${W07_ARC}`);
  assert.ok(fs.existsSync(EM001_ARC), `missing test fixture ${EM001_ARC}`);

  const w07Buf = fs.readFileSync(W07_ARC);
  const em001Buf = fs.readFileSync(EM001_ARC);

  // -------------------------------------------------------------------------
  // 1. ARC roundtrip + exact 0..548 order + stage fallback + Major 4 checks
  // -------------------------------------------------------------------------
  await check('arc library roundtrip on real w07.arc (175 entries) & em001_00.arc (549 entries)', () => {
    for (const [label, origBuf, expectedCount] of [['w07.arc', w07Buf, 175], ['em001_00.arc', em001Buf, 549]]) {
      const a1 = readArc(origBuf, label);
      assert.equal(a1.count, expectedCount, `${label} count`);
      const items = a1.entries.map(e => {
        const data = inflateEntry(origBuf, e, label);
        return { name: e.name, typeHash: e.typeHash, flags: e.flags, data, hash: sha256(data) };
      });
      const repacked = packArc(items.map(({ name, typeHash, flags, data }) => ({ name, typeHash, flags, data })));
      const a2 = readArc(repacked, `${label}:repacked`);
      assert.equal(a2.count, a1.count);
      assert.equal(a2.entries[0].offset % 32, 0, `${label} first payload 32B aligned`);
      for (let i = 0; i < a1.count; i++) {
        assert.equal(a2.entries[i].name, items[i].name);
        assert.equal(a2.entries[i].typeHash, items[i].typeHash);
        assert.equal(a2.entries[i].flags, items[i].flags);
        const reData = inflateEntry(repacked, a2.entries[i], `${label}:repacked`);
        assert.equal(Buffer.compare(reData, items[i].data), 0, `${label} entry[${i}] ${items[i].name}`);
        assert.equal(sha256(reData), items[i].hash);
      }
    }
  });

  await check('arc CLI extract -> pack preserves exact 0..548 order on em001_00.arc + TEX->MRL->MOD fallback', () => {
    const extDir = path.join(TMP_ROOT, 'em001-ext');
    const packedPath = path.join(TMP_ROOT, 'em001-repacked.arc');
    const rExt = runCli(ARC_CLI, ['extract', EM001_ARC, extDir]);
    assert.equal(rExt.status, 0, rExt.stderr);
    assert.ok(fs.existsSync(path.join(extDir, ORDER_MANIFEST)), `${ORDER_MANIFEST} written on extract`);

    const rPack = runCli(ARC_CLI, ['pack', extDir, packedPath]);
    assert.equal(rPack.status, 0, rPack.stderr);
    const rChk = runCli(ARC_CLI, ['roundtrip-check', packedPath]);
    assert.equal(rChk.status, 0, rChk.stderr);

    const orig = readArc(em001Buf, 'orig');
    const repBuf = fs.readFileSync(packedPath);
    const rep = readArc(repBuf, 'rep');
    assert.equal(rep.count, 549);
    for (let i = 0; i < 549; i++) {
      assert.equal(rep.entries[i].name, orig.entries[i].name, `order mismatch at [${i}]`);
      assert.equal(rep.entries[i].typeHash, orig.entries[i].typeHash, `typeHash mismatch at [${i}]`);
      assert.equal(rep.entries[i].flags, orig.entries[i].flags, `flags mismatch at [${i}]`);
      assert.equal(Buffer.compare(inflateEntry(repBuf, rep.entries[i]), inflateEntry(em001Buf, orig.entries[i])), 0, `payload [${i}]`);
    }

    // Fallback stage order check when _arc_order.json is absent: TEX -> MRL -> MOD -> others
    fs.unlinkSync(path.join(extDir, ORDER_MANIFEST));
    const fallbackArcPath = path.join(TMP_ROOT, 'em001-fallback.arc');
    const rFallback = runCli(ARC_CLI, ['pack', extDir, fallbackArcPath]);
    assert.equal(rFallback.status, 0, rFallback.stderr);
    const fb = readArc(fs.readFileSync(fallbackArcPath), 'fallback');
    const stageOf = h => (h === 0x241f5deb ? 0 : h === 0x2749c8a8 ? 1 : h === 0x58a15856 ? 2 : 3);
    for (let i = 1; i < fb.entries.length; i++) {
      assert.ok(stageOf(fb.entries[i - 1].typeHash) <= stageOf(fb.entries[i].typeHash), `stage inversion at [${i}]`);
    }
  });

  await check('arc negative controls: magic, version, zlib, size, 64B name, non-Latin1, embedded NUL', () => {
    assert.throws(() => readArc(Buffer.from('NOPE\x11\x00\x00\x00\x00\x00\x00\x00', 'latin1')), /bad magic/);
    assert.throws(() => readArc(Buffer.from('ARC\0\x12\x00\x00\x00\x00\x00\x00\x00', 'latin1')), /unsupported arc version/);
    assert.throws(() => packArc([{ name: 'a'.repeat(64), typeHash: 1, data: Buffer.from('x') }]), /exceeds 63 bytes/);
    assert.throws(() => packArc([{ name: 'a\u4e2d', typeHash: 1, data: Buffer.from('x') }]), /invalid char/);
    assert.throws(() => packArc([{ name: 'a\0b', typeHash: 1, data: Buffer.from('x') }]), /invalid char/);

    // 63-byte valid name succeeds and keeps trailing NUL byte at offset +63
    const ok63 = packArc([{ name: 'a'.repeat(63), typeHash: 1, data: Buffer.from('x') }]);
    assert.equal(ok63[12 + 63], 0);

    const tiny = packArc([{ name: 'test\\sample', typeHash: 0x12345678, data: Buffer.from('hello mhgu clean-room') }]);
    const parsedTiny = readArc(tiny);
    const badZlib = Buffer.from(tiny);
    badZlib[parsedTiny.entries[0].offset + 2] ^= 0xff;
    assert.throws(() => inflateEntry(badZlib, parsedTiny.entries[0]), /zlib inflate failed/);

    const badSize = Buffer.from(tiny);
    badSize.writeUInt32LE((0x40000000 | (parsedTiny.entries[0].size + 1)) >>> 0, 12 + 72);
    const parsedBadSize = readArc(badSize);
    assert.throws(() => inflateEntry(badSize, parsedBadSize.entries[0]), /size field/);
  });

  // -------------------------------------------------------------------------
  // 2. LMT +0x34 events & boundary hardening (Nit 5)
  // -------------------------------------------------------------------------
  const w07Arc = readArc(w07Buf, W07_ARC);
  const w07LmtEntry = w07Arc.entries.find(e => e.name === 'player\\mot\\w07\\w07');
  const w07LmtBuf = inflateEntry(w07Buf, w07LmtEntry, W07_ARC);

  const em001Arc = readArc(em001Buf, EM001_ARC);
  const em001LmtEntry = em001Arc.entries.find(e => e.name.endsWith('em001_00_0'));
  const em001LmtBuf = inflateEntry(em001Buf, em001LmtEntry, EM001_ARC);

  await check('LMT +0x34 events positive control: w07.arc player\\mot\\w07\\w07 has non-empty 4-slot events', () => {
    const lmt = readLmt(w07LmtBuf, 'w07');
    const used = lmt.motions.filter(Boolean);
    assert.equal(used.length, 80);
    const withNonZero = used.filter(m => m.eventSlots && m.eventSlots.some(s => s.nonZeroCount > 0));
    assert.equal(withNonZero.length, 80);
    const m2 = lmt.motions[2];
    assert.equal(m2.frameCount, 71);
    assert.deepEqual(m2.eventSlots.map(s => s.relOffset), EVENT_SLOT_OFFSETS);
    assert.deepEqual(
      m2.eventSlots[0].entries.map(e => [e.mask, e.duration, e.startFrame, e.endFrame]),
      [[0x1, 15, 0, 15], [0x2, 39, 15, 54], [0x4, 16, 54, 70], [0x0, 1, 70, 71]],
    );
    for (const m of used) {
      for (const slot of m.eventSlots) {
        assert.equal(slot.matchesFrameCount, true);
      }
    }
  });

  await check('LMT +0x34 events sentinel control: em001_00_0 has 0 non-zero event motions', () => {
    const lmt = readLmt(em001LmtBuf, 'em001_00_0');
    assert.equal(lmt.motions.length, 31);
    const used = lmt.motions.filter(Boolean);
    assert.equal(used.length, 30);
    const withNonZero = used.filter(m => m.eventSlots && m.eventSlots.some(s => s.nonZeroCount > 0));
    assert.equal(withNonZero.length, 0);
    for (const m of used) {
      for (const s of m.eventSlots) {
        assert.equal(s.isSentinelOnly, true);
        assert.equal(s.count, 1);
        assert.equal(s.entries[0].mask, 0);
        assert.equal(s.entries[0].duration, m.frameCount);
      }
    }
  });

  await check('LMT boundary checks: <8B header, bad magic, negative eventOffset, count=0 sentinel, flags&2 skip', () => {
    assert.throws(() => readLmt(Buffer.from('LMT')), /too small/);
    assert.throws(() => readLmt(Buffer.from('NOPE\x43\x00\x00\x00', 'latin1')), /not an LMT/);
    assert.throws(() => readMotionEvents(Buffer.alloc(32), 16, 60), /extends past EOF/);
    assert.throws(() => readMotionEvents(Buffer.alloc(32), -1, 60), /invalid eventOffset/);

    // count=0 slot must have isSentinelOnly: false
    const cnt0Buf = Buffer.alloc(0x200, 0);
    const slots = readMotionEvents(cnt0Buf, 0x20, 60, 'cnt0');
    assert.equal(slots[0].count, 0);
    assert.equal(slots[0].isSentinelOnly, false);

    // flags & 2 skips dereferencing eventOffset
    const flg2Buf = Buffer.alloc(0x80, 0);
    flg2Buf.write('LMT\0', 0, 'latin1');
    flg2Buf.writeUInt16LE(0x43, 4);
    flg2Buf.writeUInt16LE(1, 6);
    flg2Buf.writeUInt32LE(0x10, 8);
    flg2Buf.writeUInt32LE(0x50, 0x10); // trackList (0 tracks)
    flg2Buf.writeUInt32LE(60, 0x18);
    flg2Buf[0x10 + 0x33] = 2; // flags & 2
    flg2Buf.writeUInt32LE(0xdeadbeef, 0x10 + 0x34);
    const lmtFlg2 = readLmt(flg2Buf, 'flag2');
    assert.equal(lmtFlg2.motions[0].eventsSkippedFlag2, true);
    assert.equal(lmtFlg2.motions[0].eventSlots, null);
  });

  // -------------------------------------------------------------------------
  // 3. mod-diff.mjs: IPS 0x454F46, trailing bytes, lazy FLAT, LMT keyframe diff, 2B rawHex
  // -------------------------------------------------------------------------
  await check('mod-diff.mjs built-in --selftest passes', async () => {
    const res = await modDiffSelfTest();
    assert.equal(res.ok, true, JSON.stringify(res.failures));
  });

  await check('mod-diff.mjs IPS 0x454F46 collision, trailing garbage rejection, and no-FLAT graceful degradation', async () => {
    const ips3Path = path.join(TMP_ROOT, 'collision3.ips');
    const ips3Buf = Buffer.concat([
      Buffer.from('PATCH', 'latin1'),
      Buffer.from([0x00, 0x10, 0x00, 0x00, 0x04, 0x00, 0x00, 0xa0, 0xe1]),
      Buffer.from([0x45, 0x4f, 0x46, 0x00, 0x04, 0x01, 0x00, 0xa0, 0xe1]), // offset === 0x454F46 ("EOF")
      Buffer.from([0x00, 0x20, 0x00, 0x00, 0x02, 0xaa, 0xbb]),             // 2-byte non-word hunk
      Buffer.from('EOF', 'latin1'),
    ]);
    fs.writeFileSync(ips3Path, ips3Buf);

    const parsed3 = parseIps(ips3Buf, 'collision3.ips');
    assert.equal(parsed3.records.length, 3);
    assert.equal(parsed3.records[1].offset, 0x454f46);
    assert.throws(() => parseIps(Buffer.concat([ips3Buf, Buffer.from('\x01\x02\x03')])), /truncated|missing EOF/);

    // Run CLI with nonexistent FLAT -> must NOT crash, degrades gracefully to rawHex
    const rNoFlat = runCli(MODDIFF_CLI, ['patch', ips3Path, '--json'], { FLAT: 'G:/tmp/nonexistent.bin' });
    assert.equal(rNoFlat.status, 0, rNoFlat.stderr);
    const jNoFlat = JSON.parse(rNoFlat.stdout);
    assert.equal(jNoFlat.flatAvailable, false);
    assert.equal(jNoFlat.disasmAvailable, false);
    assert.equal(jNoFlat.recordCount, 3);
    assert.equal(jNoFlat.hunks[2].unalignedOrNonWord, true);
    assert.equal(jNoFlat.hunks[2].rawHex, 'aabb');

    // Run `arc` subcommand with nonexistent FLAT -> must succeed without needing flat image
    const rArcNoFlat = runCli(MODDIFF_CLI, ['arc', W07_ARC, W07_ARC, '--json'], { FLAT: 'G:/tmp/nonexistent.bin' });
    assert.equal(rArcNoFlat.status, 0, rArcNoFlat.stderr);
    assert.equal(JSON.parse(rArcNoFlat.stdout).identicalCount, 175);
  });

  await check('mod-diff.mjs LMT keyframe-only mutation detected + end-to-end modRoot + error collection', async () => {
    // Keyframe-only mutation on real w07 LMT (motion[1] track[0] first keyframe byte flipped)
    const kfBaseArc = packArc([{ name: 'player\\mot\\w07\\w07', typeHash: 0x76820d81, data: w07LmtBuf }]);
    const mutKfLmt = Buffer.from(w07LmtBuf);
    const lmtParsed = readLmt(mutKfLmt, 'w07');
    const tIdx = lmtParsed.motions[1].tracks.findIndex(t => t.keyOffset > 0 && t.byteSize > 0);
    assert.ok(tIdx >= 0, 'w07 motion[1] has at least one keyed track');
    const t0 = lmtParsed.motions[1].tracks[tIdx];
    mutKfLmt[t0.keyOffset] ^= 0x01;
    const kfModArc = packArc([{ name: 'player\\mot\\w07\\w07', typeHash: 0x76820d81, data: mutKfLmt }]);
    const kfDiff = diffArcs(kfBaseArc, kfModArc);
    assert.equal(kfDiff.modified.length, 1);
    assert.equal(kfDiff.modified[0].semantic.kind, 'LMT');
    assert.equal(kfDiff.modified[0].semantic.changedCount, 1);
    assert.equal(kfDiff.modified[0].semantic.changedMotions[0].index, 1);
    assert.equal(kfDiff.modified[0].semantic.changedMotions[0].trackDataChanged, true);
    assert.deepEqual(kfDiff.modified[0].semantic.changedMotions[0].changedTracks, [tIdx]);

    // End-to-end modRoot with PCHTXT (NSOBID check), IPS32, corrupt auxiliary IPS (resilient error list), and mutated w07.arc
    const modRoot = path.join(TMP_ROOT, 'fake-mod');
    const exefsPatchDir = path.join(modRoot, 'exefs_patches', 'testmod');
    const romfsArcDir = path.join(modRoot, 'contents', '0100770008DD8000', 'romfs', 'nativeNX', 'arc', 'player', 'quest');
    fs.mkdirSync(exefsPatchDir, { recursive: true });
    fs.mkdirSync(romfsArcDir, { recursive: true });

    fs.writeFileSync(path.join(exefsPatchDir, `${EXPECTED_NSOBID_140}.pchtxt`), [
      `@nsobid-${EXPECTED_NSOBID_140}`,
      '@flag offset_shift -0x100',
      '@enabled',
      '00b4a0e8 0000A0E1 // mov r0, r0 at vaddr 0x00b49fe8',
      '00b4a0ec AABB // 2B non-word hunk',
      '@stop',
    ].join('\n'));

    const ipsRec = Buffer.alloc(19);
    ipsRec.write('IPS32', 0, 'latin1');
    ipsRec.writeUInt32BE(0x00b49fe8 + 0x100, 5);
    ipsRec.writeUInt16BE(4, 9);
    ipsRec.writeUInt32LE(0xe1a00000, 11);
    ipsRec.write('EEOF', 15, 'latin1');
    fs.writeFileSync(path.join(exefsPatchDir, 'test.ips'), ipsRec);
    fs.writeFileSync(path.join(exefsPatchDir, 'broken_aux.ips'), Buffer.from('BADIPS'));

    const modEntries = w07Arc.entries.map(e => ({
      name: e.name,
      typeHash: e.typeHash,
      flags: e.flags,
      data: inflateEntry(w07Buf, e, W07_ARC),
    }));
    const lmtIdx = modEntries.findIndex(e => e.name === 'player\\mot\\w07\\w07');
    const mutLmt = Buffer.from(modEntries[lmtIdx].data);
    const m2Off = mutLmt.readUInt32LE(8 + 4 * 2);
    const p34 = mutLmt.readUInt32LE(m2Off + 0x34);
    const arr0 = mutLmt.readUInt32LE(p34 + 0x44);
    mutLmt.writeUInt32LE(0x8, arr0);
    modEntries[lmtIdx].data = mutLmt;

    const hdpIdx = modEntries.findIndex(e => e.name === 'player\\hit\\pl_we07_hitdata');
    const mutHdp = Buffer.from(modEntries[hdpIdx].data);
    mutHdp.writeUInt32LE(mutHdp.readUInt32LE(16) + 10, 16);
    modEntries[hdpIdx].data = mutHdp;

    const removedName = modEntries[modEntries.length - 1].name;
    modEntries.pop();
    modEntries.push({ name: 'player\\pma\\w07\\w07_999', typeHash: 0x18a9225c, data: Buffer.from('synthetic') });
    fs.writeFileSync(path.join(romfsArcDir, 'w07.arc'), packArc(modEntries));

    const outDir = path.join(TMP_ROOT, 'diff-out');
    const rMod = runCli(MODDIFF_CLI, ['mod', modRoot, '--romfs', 'G:/mhgu-romfs/romfs', '--out', outDir, '--json']);
    assert.equal(rMod.status, 0, rMod.stderr);
    const json = JSON.parse(rMod.stdout);
    assert.equal(json.patches.length, 2);
    assert.equal(json.errors.length, 1, 'corrupt auxiliary IPS collected in errors without aborting');
    const pchOut = json.patches.find(p => p.format === 'PCHTXT');
    assert.equal(pchOut.nsobidMatch, true);
    assert.equal(pchOut.hunks[0].vaddr, 0x00b49fe8);
    assert.equal(pchOut.hunks[1].unalignedOrNonWord, true);
    assert.equal(pchOut.hunks[1].rawHex, 'aabb');
    const ad = json.arcDiffs[0];
    assert.equal(ad.identicalCount, 172);
    assert.equal(ad.added.length, 1);
    assert.equal(ad.removed.length, 1);
    assert.equal(ad.removed[0].name, removedName);
    assert.equal(ad.modified.length, 2);
    assert.ok(fs.existsSync(path.join(outDir, 'DIFF-REPORT.md')));
    assert.ok(fs.existsSync(path.join(outDir, 'diff.json')));
  });

  // -------------------------------------------------------------------------
  // 4. Rigorous CLI exit code closure (0 / 1 / 2) for all 3 tools
  // -------------------------------------------------------------------------
  await check('CLI exit code closure (0 / 1 / 2) for arc.mjs, lmt.mjs, mod-diff.mjs', () => {
    const w07LmtPath = path.join(TMP_ROOT, 'w07.76820d81');
    const em001LmtPath = path.join(TMP_ROOT, 'em001_00_0.76820d81');
    fs.writeFileSync(w07LmtPath, w07LmtBuf);
    fs.writeFileSync(em001LmtPath, em001LmtBuf);

    // arc.mjs: 0, 1, 2
    assert.equal(runCli(ARC_CLI, ['roundtrip-check', W07_ARC]).status, 0);
    assert.equal(runCli(ARC_CLI, ['list', path.join(TMP_ROOT, 'does-not-exist.arc')]).status, 1);
    assert.equal(runCli(ARC_CLI, []).status, 2);
    assert.equal(runCli(ARC_CLI, ['unknown-cmd']).status, 2);

    // lmt.mjs: 0, 1, 2 (including --bogus -> 2)
    const rW07Ev = runCli(LMT_CLI, ['events', w07LmtPath]);
    assert.equal(rW07Ev.status, 0);
    assert.equal(JSON.parse(rW07Ev.stdout).withNonZeroEvents, 80);
    const rEmEv = runCli(LMT_CLI, ['events', em001LmtPath]);
    assert.equal(rEmEv.status, 0);
    assert.equal(JSON.parse(rEmEv.stdout).withNonZeroEvents, 0);
    assert.equal(runCli(LMT_CLI, ['events', w07LmtPath, '9999']).status, 1);
    assert.equal(runCli(LMT_CLI, []).status, 2);
    assert.equal(runCli(LMT_CLI, ['events', w07LmtPath, '--bogus']).status, 2);

    // mod-diff.mjs: 0, 1, 2
    assert.equal(runCli(MODDIFF_CLI, ['--selftest']).status, 0);
    assert.equal(runCli(MODDIFF_CLI, ['arc', W07_ARC, path.join(TMP_ROOT, 'missing.arc')]).status, 1);
    assert.equal(runCli(MODDIFF_CLI, []).status, 2);
    assert.equal(runCli(MODDIFF_CLI, ['patch', '--bogus']).status, 2);
  });

  console.log(`\nALL SELFTESTS PASSED (${passed}/${passed} checks)`);
} finally {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
}
