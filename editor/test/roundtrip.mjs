// Offline checks for selected writable fields; input files are never modified.
// Every probe starts from the original image and checks same-value writes, a valid
// alternate, the exact writable bytes/bits, and restoration where it is possible.
// Both item layouts are exercised explicitly as hypotheses, not detected from data.
// This is not coverage of every writer or proof of the real save layout.
// usage: node editor/test/roundtrip.mjs [samplesDir]   (default MHGU/save-snapshots)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.join(HERE, '..', 'core');
const imp = (f) => import(pathToFileURL(path.join(CORE, f)).href);
const C = await imp('container.mjs');
const H = await imp('header.mjs');
const I = await imp('items.mjs');
const P = await imp('progress.mjs');

const ROOT = process.argv[2] ?? path.join(HERE, '..', '..', 'save-snapshots');
const HNT = C.HNT_SIZE;
const SYS = C.SYSTEM_SIZE;

function samples(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...samples(p));
    else if (e.isFile()) {
      const n = fs.statSync(p).size;
      if (n === HNT || n === SYS) out.push(p);
      else if (/\.(hnt|system)$/i.test(e.name)) {
        throw new Error(`${p}: unrecognised container size ${n}`);
      }
    } else if (e.isSymbolicLink() && /\.(hnt|system)$/i.test(e.name)) {
      throw new Error(`${p}: symbolic-link sample is not traversed`);
    }
  }
  return out;
}

let pass = 0;
let fail = 0;
let validChecks = 0;
const failures = [];
const normalised = [];
function check(ok, label) {
  if (ok) pass += 1;
  else {
    fail += 1;
    if (failures.length < 40) failures.push(label);
  }
  return ok;
}

// Masks are absolute file offsets. They are derived from the documented field
// geometry, not by asking a writer what it changed.
function bytes(view, off, size) {
  return Array.from({ length: size }, (_, n) => [view.base + off + n, 0xff]);
}
function bits(view, off, start, count) {
  const masks = new Map();
  for (let bit = start; bit < start + count; bit += 1) {
    const at = view.base + off + Math.floor(bit / 8);
    masks.set(at, (masks.get(at) ?? 0) | (1 << (bit % 8)));
  }
  return [...masks];
}
function firstDifference(a, b) {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return i;
  return -1;
}
function locality(before, after, allowed) {
  const sorted = [...allowed].sort((a, b) => a[0] - b[0]);
  let start = 0;
  for (const [at, mask] of sorted) {
    if (!before.subarray(start, at).equals(after.subarray(start, at))) {
      return `outside field at 0x${(start + firstDifference(before.subarray(start, at), after.subarray(start, at))).toString(16)}`;
    }
    if (((before[at] ^ after[at]) & ~mask) !== 0) return `outside mask at 0x${at.toString(16)}`;
    start = at + 1;
  }
  if (!before.subarray(start).equals(after.subarray(start))) {
    return `outside field at 0x${(start + firstDifference(before.subarray(start), after.subarray(start))).toString(16)}`;
  }
  return null;
}
function checkImage(expected, actual, label) {
  if (actual.equals(expected)) return check(true, label);
  return check(false, `${label} at 0x${firstDifference(expected, actual).toString(16)}`);
}
function equalValue(actual, expected) {
  return expected !== null && typeof expected === 'object'
    ? actual !== null && typeof actual === 'object' && Object.keys(expected).every((k) => actual[k] === expected[k])
    : actual === expected;
}

const encoder = new TextEncoder();
function fitsName(value, maxBytes, maxChars = Infinity) {
  return Array.from(value).length <= maxChars && encoder.encode(value).length <= maxBytes;
}
// Name writers clear their field before encoding. Preset names may truncate at a
// UTF-8 code-point boundary; header/palico names instead refuse overlong input.
function nameIdentity(expected, at, size, value) {
  const encoded = [];
  for (const ch of value) {
    const part = encoder.encode(ch);
    if (encoded.length + part.length > size) break;
    encoded.push(...part);
  }
  expected.fill(0, at, at + size);
  expected.set(encoded, at);
}

// Only the listed fields/indices are probed. Derived reader keys are ignored for
// item slots, while strings and all supplied colour components compare exactly.
function probes(view, layoutName) {
  const layout = I.ITEM_BOX_LAYOUTS[layoutName];
  const list = [
    { name: 'name', read: () => H.readName(view), write: (v) => H.writeName(view, v), alt: (v) => (v === 'RT' ? 'RU' : 'RT'), allowed: bytes(view, H.NAME_OFF, H.NAME_FIELD_BYTES), nameField: [H.NAME_OFF, H.NAME_FIELD_BYTES], refusesSame: (v) => !fitsName(v, H.LIMITS.nameMaxBytes, H.LIMITS.nameMaxChars) },
    { name: 'playtime', read: () => H.readPlaytime(view), write: (v) => H.writePlaytime(view, v), alt: (v) => (v === H.LIMITS.playtime ? 0 : v + 1), allowed: bytes(view, H.PLAYTIME_OFF, 4) },
    { name: 'gold', read: () => H.readGold(view), write: (v) => H.writeGold(view, v), alt: (v) => (v > 0 ? v - 1 : 1), allowed: bytes(view, H.GOLD_OFF, 4) },
    { name: 'hr', read: () => H.readHr(view), write: (v) => H.writeHr(view, v), alt: (v) => (v > 1 ? v - 1 : 2), allowed: bytes(view, H.HR_OFF, 2) },
    { name: 'gender', read: () => H.readGender(view), write: (v) => H.writeGender(view, v), alt: (v) => (v === 0 ? 1 : 0), allowed: bytes(view, H.GENDER_OFF, 1), refusesSame: (v) => v !== 0 && v !== 1 },
  ];
  const itemWritable = ({ id, count }) => Number.isInteger(id) && Number.isInteger(count)
    && id >= 0 && id <= I.ITEM_ID_MAX && count >= 0 && count <= I.ITEM_COUNT_MAX
    && (id === 0 ? count === 0 : count > 0);
  const itemAlt = (v) => (!itemWritable(v) || v.id === 0 ? { id: 1, count: 1 } : { id: v.id, count: v.count === 1 ? 2 : 1 });
  for (const i of [0, 1, 7, layout.slotCount - 1]) {
    list.push({
      name: `itemBox[${i}]`,
      read: () => I.readItemBoxSlot(view, layoutName, i),
      write: (v) => I.writeItemBoxSlot(view, layoutName, i, v),
      alt: itemAlt, allowed: bits(view, I.ITEM_BOX_BASE, i * 19, 19),
      refusesSame: (v) => !itemWritable(v),
    });
  }
  for (const i of [0, I.POUCH_SLOT_COUNT - 1]) {
    list.push({
      name: `pouch[${i}]`, read: () => I.readPouchSlot(view, i),
      write: (v) => I.writePouchSlot(view, i, v), alt: itemAlt,
      allowed: bits(view, I.POUCH_BASE, i * 19, 19), refusesSame: (v) => !itemWritable(v),
    });
  }
  for (const i of [0, layout.presetCount - 1]) {
    const off = layout.presetStart + i * I.ITEM_PRESET_RECORD_SIZE;
    list.push({
      name: `presetName[${i}]`, read: () => I.readItemPresetName(view, layoutName, i),
      write: (v) => I.writeItemPresetName(view, layoutName, i, v),
      alt: (v) => (v === 'RT' ? 'RU' : 'RT'),
      allowed: bytes(view, off, I.ITEM_PRESET_NAME_SIZE), nameField: [off, I.ITEM_PRESET_NAME_SIZE],
    });
  }
  for (const bit of [0, 1, 100]) {
    const clearedAt = view.base + P.QUEST_CLEARED_OFF + Math.floor(bit / 8);
    const seenAt = view.base + P.QUEST_SEEN_OFF + Math.floor(bit / 8);
    const mask = 1 << (bit % 8);
    list.push({
      name: `quest[${bit}]`, read: () => P.readQuestState(view, bit),
      write: (v) => P.writeQuestState(view, bit, v),
      alt: (v) => (v === P.QUEST_STATE.NONE ? P.QUEST_STATE.SEEN : P.QUEST_STATE.NONE),
      allowed: [[clearedAt, mask], [seenAt, mask]],
      refusesSame: () => bit === 0, refusesAlt: () => bit === 0,
      dirty: (snapshot) => (snapshot[clearedAt] & mask) !== 0 && (snapshot[seenAt] & mask) === 0,
      normalise: (snapshot) => { snapshot[seenAt] |= mask; },
    });
  }
  for (const s of [0, 1, 136]) {
    list.push(
      { name: `kill[${s}]`, read: () => P.readMonsterKill(view, s), write: (v) => P.writeMonsterKill(view, s, v), alt: (v) => (v ? v - 1 : 1), allowed: bytes(view, P.MON_KILL_OFF + s * 2, 2) },
      // Spec 03 C: of the sampled slots 0/1/136, only 136 is a non-capturable slot.
      // Do not ask the writer's own classification helper to validate its refusal.
      { name: `capture[${s}]`, read: () => P.readMonsterCapture(view, s), write: (v) => P.writeMonsterCapture(view, s, v), alt: (v) => (v ? v - 1 : 1), allowed: bytes(view, P.MON_CAPTURE_OFF + s * 2, 2), refusesSame: () => s === 136, refusesAlt: () => s === 136 },
    );
  }
  for (const i of [0, P.PALICO_COUNT - 1]) {
    const record = P.palicoRecordOffset(i);
    const nameOff = record + P.PALICO_LAYOUT.name.off;
    const furOff = record + P.PALICO_LAYOUT.colors.off + P.PALICO_COLOR_FUR * 4;
    list.push(
      { name: `palicoName[${i}]`, read: () => P.readPalicoName(view, i), write: (v) => P.writePalicoName(view, i, v), alt: (v) => (v === 'RT' ? 'RU' : 'RT'), allowed: bytes(view, nameOff, P.PALICO_LAYOUT.name.size), nameField: [nameOff, P.PALICO_LAYOUT.name.size], refusesSame: (v) => !fitsName(v, P.PALICO_LAYOUT.name.size - 1) },
      {
        name: `palicoFur[${i}]`, read: () => P.readPalicoColor(view, i, P.PALICO_COLOR_FUR),
        write: (v) => P.writePalicoColor(view, i, P.PALICO_COLOR_FUR, v.r, v.g, v.b),
        alt: (v) => ({ ...v, r: v.r === 0 ? 1 : v.r - 1 }), allowed: bytes(view, furOff, 3),
      },
    );
  }
  return list;
}

function tryWrite(p, value) {
  try { p.write(value); return null; } catch (error) { return error; }
}
function runProbe(p, tag, pristine, work, expected, view) {
  pristine.copy(work);
  pristine.copy(expected);
  let value;
  try { value = p.read(); } catch (error) {
    check(false, `${tag}: read failed: ${error.message}`);
    return;
  }
  const sameRefused = p.refusesSame?.(value) ?? false;
  const sameError = tryWrite(p, value);
  if (sameError) {
    check(sameRefused, `${tag}: unexpected identity refusal: ${sameError.message}`);
    check(work.equals(pristine), `${tag}: refused identity changed bytes`);
    if (!sameRefused || !work.equals(pristine)) return;
  } else {
    check(!sameRefused, `${tag}: identity accepted a value that must be refused`);
    if (p.nameField) nameIdentity(expected, view.base + p.nameField[0], p.nameField[1], value);
    if (!checkImage(expected, work, `${tag}: identity differs from its exact expected image`)) return;
  }

  const alternate = p.alt(value);
  const altRefused = p.refusesAlt?.(alternate) ?? false;
  const altError = tryWrite(p, alternate);
  if (altError) {
    check(altRefused, `${tag}: unexpected alternate refusal: ${altError.message}`);
    check(work.equals(expected), `${tag}: refused alternate changed bytes`);
    return;
  }
  check(!altRefused, `${tag}: alternate accepted a value that must be refused`);
  let back;
  try { back = p.read(); } catch (error) {
    check(false, `${tag}: alternate read failed: ${error.message}`);
    return;
  }
  const valueOk = check(equalValue(back, alternate), `${tag}: read-back ${JSON.stringify(back)} != ${JSON.stringify(alternate)}`);
  const changed = check(!work.equals(expected), `${tag}: alternate changed no bytes`);
  const spill = locality(expected, work, p.allowed);
  const local = check(spill === null, `${tag}: alternate ${spill}`);
  let exact = true;
  if (p.nameField) {
    nameIdentity(expected, view.base + p.nameField[0], p.nameField[1], alternate);
    exact = checkImage(expected, work, `${tag}: alternate differs from exact expected image`);
    pristine.copy(expected);
    if (!sameError) nameIdentity(expected, view.base + p.nameField[0], p.nameField[1], value);
  }
  if (valueOk && changed && local && exact && !altRefused) validChecks += 1;

  // An unwriteable original cannot be restored through the writer; the next probe
  // is nevertheless reset from pristine. Do not claim a restore was exercised.
  if (sameError) return;
  const restoreError = tryWrite(p, value);
  if (!check(!restoreError, `${tag}: restore refused: ${restoreError?.message}`)) return;
  const dirty = p.dirty?.(pristine) ?? false;
  if (dirty) p.normalise(expected);
  if (checkImage(expected, work, `${tag}: restore differs from exact expected image`) && dirty) normalised.push(tag);
}

let files = [];
try { files = samples(ROOT); } catch (error) { check(false, `sample discovery failed: ${error.message}`); }
console.log(`samples: ${files.length} under ${ROOT}`);
if (files.length === 0) check(false, 'no candidate samples');
let opened = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f);
  let pristine;
  let work;
  let file;
  try {
    pristine = fs.readFileSync(f);
    work = Buffer.from(pristine);
    if (work.length === SYS) file = C.openSystem(work);
    else if (work.length === HNT) file = C.openHnt(work);
    else throw new Error(`size changed to ${work.length}`);
  } catch (error) {
    check(false, `${rel}: cannot read/open sample: ${error.message}`);
    continue;
  }
  opened += 1;
  const expected = Buffer.from(pristine);
  const checksBeforeSample = validChecks;
  for (const slot of file.slots) {
    let view;
    try { view = C.hunterView(file, slot.index); } catch (error) {
      check(false, `${rel} slot${slot.index}: hunterView ${error.message}`);
      continue;
    }
    for (const layoutName of ['legacy', 'v7']) {
      for (const p of probes(view, layoutName)) {
        runProbe(p, `${rel} slot${slot.index} ${layoutName} ${p.name}`, pristine, work, expected, view);
      }
    }
  }
  if (validChecks === checksBeforeSample) check(false, `${rel}: no effective alternate write checks`);
}
if (opened === 0) check(false, 'no readable, structurally valid sample');
if (validChecks === 0) {
  check(false, 'no effective alternate write checks');
  console.error('FAIL: no effective alternate write checks');
}
console.log(`PASS ${pass}  FAIL ${fail}  effective alternate checks ${validChecks}`);
for (const l of normalised) console.log('normalised dirty quest bit (isolated probe): ' + l);
for (const l of failures) console.log('FAIL: ' + l);
process.exitCode = fail ? 1 : 0;
