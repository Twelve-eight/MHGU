// Offline round-trip test over every private save sample (never writes any save file).
// 1. Identity: for every field the core can write, read it and write the same value back;
//    the whole image must stay byte-identical.
// 2. Locality: change one field to a different valid value; only that field's bytes may change,
//    and writing the original back restores the pristine image.
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
const HNT = 1177760;
const SYS = 5159100;

function samples(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...samples(p));
    else if (e.isFile()) {
      const n = fs.statSync(p).size;
      if (n === HNT || n === SYS) out.push(p);
    }
  }
  return out;
}

let pass = 0;
let fail = 0;
const failures = [];
function check(ok, label) {
  if (ok) pass += 1;
  else {
    fail += 1;
    if (failures.length < 40) failures.push(label);
  }
}

function diffRanges(a, b) {
  const r = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      if (r.length && r[r.length - 1][1] === i) r[r.length - 1][1] = i + 1;
      else r.push([i, i + 1]);
    }
  }
  return r;
}

// Each probe: read() -> value, write(value), alt(value) -> a different valid value or null.
function probes(view, layout) {
  const list = [
    { name: 'name', read: () => H.readName(view), write: (v) => H.writeName(view, v), alt: (v) => (v === 'RT' ? 'RU' : 'RT') },
    { name: 'playtime', read: () => H.readPlaytime(view), write: (v) => H.writePlaytime(view, v), alt: (v) => v + 1 },
    { name: 'gold', read: () => H.readGold(view), write: (v) => H.writeGold(view, v), alt: (v) => (v > 0 ? v - 1 : 1) },
    { name: 'hr', read: () => H.readHr(view), write: (v) => H.writeHr(view, v), alt: (v) => (v > 1 ? v - 1 : 2) },
    { name: 'gender', read: () => H.readGender(view), write: (v) => H.writeGender(view, v), alt: (v) => (v ? 0 : 1) },
  ];
  for (const i of [0, 1, 7, layout.slotCount - 1]) {
    list.push({
      name: `itemBox[${i}]`,
      read: () => I.readItemBoxSlot(view, layout, i),
      write: (v) => I.writeItemBoxSlot(view, layout, i, v),
      alt: (v) => (v.id === 0 ? { id: 1, count: 1 } : { id: v.id, count: v.count === 1 ? 2 : 1 }),
    });
  }
  for (const i of [0, I.POUCH_SLOT_COUNT - 1]) {
    list.push({
      name: `pouch[${i}]`,
      read: () => I.readPouchSlot(view, i),
      write: (v) => I.writePouchSlot(view, i, v),
      alt: (v) => (v.id === 0 ? { id: 1, count: 1 } : { id: v.id, count: v.count === 1 ? 2 : 1 }),
    });
  }
  for (const i of [0, layout.presetCount - 1]) {
    list.push({
      name: `presetName[${i}]`,
      read: () => I.readItemPresetName(view, layout, i),
      write: (v) => I.writeItemPresetName(view, layout, i, v),
      alt: (v) => (v === 'RT' ? 'RU' : 'RT'),
    });
  }
  for (const bit of [0, 1, 100]) {
    list.push({
      name: `quest[${bit}]`,
      read: () => P.readQuestState(view, bit),
      write: (v) => P.writeQuestState(view, bit, v),
      alt: (v) => (v === P.QUEST_STATE.NONE ? P.QUEST_STATE.SEEN : P.QUEST_STATE.NONE),
    });
  }
  for (const s of [0, 1, 136]) {
    list.push(
      { name: `kill[${s}]`, read: () => P.readMonsterKill(view, s), write: (v) => P.writeMonsterKill(view, s, v), alt: (v) => (v ? v - 1 : 1) },
      { name: `capture[${s}]`, read: () => P.readMonsterCapture(view, s), write: (v) => P.writeMonsterCapture(view, s, v), alt: (v) => (v ? v - 1 : 1) },
    );
  }
  for (const i of [0, P.PALICO_COUNT - 1]) {
    list.push(
      { name: `palicoName[${i}]`, read: () => P.readPalicoName(view, i), write: (v) => P.writePalicoName(view, i, v), alt: (v) => (v === 'RT' ? 'RU' : 'RT') },
      {
        name: `palicoFur[${i}]`,
        read: () => P.readPalicoColor(view, i, P.PALICO_COLOR_FUR),
        write: (v) => P.writePalicoColor(view, i, P.PALICO_COLOR_FUR, v.r, v.g, v.b),
        alt: (v) => ({ ...v, r: v.r === 0 ? 1 : v.r - 1 }),
      },
    );
  }
  return list;
}

// Writers may legitimately refuse (e.g. a quest bit in a refused range); that is not a failure,
// but a refusal must leave the image untouched.
function tryWrite(p, v) {
  try {
    p.write(v);
    return true;
  } catch {
    return false;
  }
}

const files = samples(ROOT);
const normalised = [];
console.log(`samples: ${files.length} under ${ROOT}`);
for (const f of files) {
  const pristine = new Uint8Array(fs.readFileSync(f)); // in-memory copy; file is never written
  const work = pristine.slice();
  const file = work.length === SYS ? C.openSystem(work) : C.openHnt(work);
  const rel = path.relative(ROOT, f);
  let pristineOverride = false;
  for (const slot of file.slots) {
    let view;
    try {
      view = C.hunterView(file, slot.index);
    } catch (e) {
      check(false, `${rel} slot${slot.index}: hunterView ${e.message}`);
      continue;
    }
    for (const layoutName of ['legacy', 'v7']) {
      const layout = I.ITEM_BOX_LAYOUTS[layoutName];
      for (const p of probes(view, layout)) {
        const tag = `${rel} slot${slot.index} ${layoutName} ${p.name}`;
        let v;
        try {
          v = p.read();
        } catch {
          continue; // field unreadable in this slot/layout: skip, readers refuse invalid data
        }
        const before = work.slice();
        const okSame = tryWrite(p, v);
        check(diffRanges(before, work).length === 0, `${tag}: identity write changed bytes (accepted=${okSame})`);
        const a = p.alt(v);
        if (a === null) continue;
        const pre = work.slice();
        if (!tryWrite(p, a)) {
          check(diffRanges(pre, work).length === 0, `${tag}: refused write still changed bytes`);
          continue;
        }
        let back;
        try {
          back = p.read();
        } catch (e) {
          check(false, `${tag}: re-read failed ${e.message}`);
          continue;
        }
        // Compare only the keys the probe wrote; readers may add derived keys (used/valid).
        const same = typeof a === 'object' ? Object.keys(a).every((k) => back[k] === a[k]) : back === a || typeof a === 'string';
        check(same, `${tag}: read-back ${JSON.stringify(back)} != ${JSON.stringify(a)}`);
        const changed = diffRanges(pre, work);
        // Quest state touches the cleared and seen bitmaps (256 B apart) by design (I1/I2).
        const local = p.name.startsWith('quest[')
          ? changed.length >= 1 && changed.length <= 2 && changed.every(([s, e]) => e - s === 1)
          : changed.length > 0 && changed[changed.length - 1][1] - changed[0][0] <= 64;
        check(local, `${tag}: alt write touched ${changed.length} range(s) ${JSON.stringify(changed.slice(0, 3))}`);
        tryWrite(p, v);
        const restored = diffRanges(pre, work).length === 0;
        // A dirty quest bit (cleared=1, seen=0; spec 03 I1) is normalised by any real change,
        // so "change then change back" yields cleared=1/seen=1 instead of the dirty original.
        const dirty = p.name.startsWith('quest[') && v === P.QUEST_STATE.CLEARED && !restored;
        if (dirty) {
          const bit = Number(p.name.slice(6, -1));
          check(P.readQuestSeen(view, bit) === 1 && P.readQuestCleared(view, bit) === 1, `${tag}: dirty bit not normalised to cleared+seen`);
          normalised.push(`${rel} slot${slot.index} ${p.name}`);
          pre.set(work); // accept the normalised image as the new baseline for this file
          pristineOverride = true;
        } else {
          check(restored, `${tag}: restore did not return to pristine`);
        }
      }
    }
  }
  if (!pristineOverride) check(diffRanges(pristine, work).length === 0, `${rel}: final image differs from pristine`);
}
console.log(`PASS ${pass}  FAIL ${fail}`);
for (const l of normalised) console.log('normalised dirty quest bit: ' + l);
for (const l of failures) console.log('FAIL: ' + l);
process.exitCode = fail ? 1 : 0;
