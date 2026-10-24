// SPDX-License-Identifier: GPL-3.0-or-later
// Spec 03: quest progress bitfields, 137-slot monster counters and palico records.
//   sections A/B - quest cleared/seen bitfields and the documented task bit ranges
//   section C    - monster kill / capture / size counters
//   section D    - palico names and fur/clothing colours
// Every writer is a read-modify-write of one field and never paints a range.

// ---------------------------------------------------------------------------
// quest state bitfields (spec 03 A / B)
// ---------------------------------------------------------------------------

export const QUEST_CLEARED_OFF = 0x2C77; // char_off 11383, 256 B
export const QUEST_SEEN_OFF = 0x2D77; // char_off 11639, cleared + 256 B
export const QUEST_ACHIEVE_OFF = 0x2E77; // char_off 11903, read-only (G6)
export const QUEST_GATE_F1_OFF = 0x2F77; // char_off 12151, 8 B, read-only (G7)
export const QUEST_FIELD_BYTES = 256;
export const QUEST_BITS = 2048;

// CLEARED implies SEEN (invariant I1); SEEN alone is "unlocked, not completed" (I2).
export const QUEST_STATE = Object.freeze({ NONE: 0, SEEN: 1, CLEARED: 2 });

// Documented ranges over the same cleared/seen bit pair (spec 03 B). Bit numbers are
// record order i; the questId convention (G1/G3) is unverified. Informational only:
// writers accept one task bit at a time, never a range.
export const QUEST_RANGES = Object.freeze({
  // 375 Village + 569 Hub tasks; bit 0 and bit 945 are reserved.
  villageHub: Object.freeze({ first: 1, last: 944 }),
  // G4 / Guild 14: 81 + 5 bits matching the 86 G4 rows. 786..865 is the known bug.
  gStar4: Object.freeze([
    Object.freeze({ first: 782, last: 862 }),
    Object.freeze({ first: 939, last: 943 }),
  ]),
  // Permit / deviant: 12 x 16 + 6 x 6 = 228 bits; never extend to 1174.
  permit: Object.freeze({ first: 944, last: 1171 }),
  // The two Arena candidates disagree; both stay read-only until G1/G2 is settled.
  arenaCandidateA: Object.freeze({ first: 1288, last: 1304 }),
  arenaCandidateB: Object.freeze({ first: 1172, last: 1188 }),
  hunterTraining: Object.freeze({ first: 1174, last: 1180 }),
  reserved: Object.freeze([
    Object.freeze({ first: 0, last: 0 }),
    Object.freeze({ first: 945, last: 945 }),
  ]),
  undocumented: Object.freeze([
    Object.freeze({ first: 1181, last: 1287 }),
    Object.freeze({ first: 1305, last: 2047 }),
  ]),
  // The old editor's unsourced "cat village / cat hub" split (no category here).
  editorCatSplit: Object.freeze({ first: 866, last: 943 }),
});

// EX (deviant super) task bits: 959 + 16k, k = 0..11 and 1141 + 6k, k = 0..5. A
// subset of the Permit range; set only these bits, never a wider span.
export const QUEST_EX_BITS = (() => {
  const bits = [];
  for (let k = 0; k < 12; k += 1) bits.push(959 + 16 * k);
  for (let k = 0; k < 6; k += 1) bits.push(1141 + 6 * k);
  return Object.freeze(bits);
})();

// ---------------------------------------------------------------------------
// monster counters (spec 03 C)
// ---------------------------------------------------------------------------

export const MON_KILL_OFF = 0x5EA6; // char_off 24230, 274 B = 137 x u16 LE
export const MON_CAPTURE_OFF = 0x5FB8; // char_off 24504, 274 B = 137 x u16 LE
export const MON_SIZE_OFF = 0x60CA; // char_off 24778, 548 B = 137 x {u16 mini, u16 maxi}
export const MONSTER_COUNT = 137;

// Slots 0..70 and 112..134 are large monsters, 71..111 and 135..136 are small.
const SMALL_MONSTER_SLOTS = Object.freeze([
  Object.freeze({ first: 71, last: 111 }),
  Object.freeze({ first: 135, last: 136 }),
]);

// ---------------------------------------------------------------------------
// palico records (spec 03 D)
// ---------------------------------------------------------------------------

export const PALICO_RECORD_SIZE = 324; // 0x144
export const PALICO_COUNT = 108;
export const PALICO_GROUP_A_OFF = 0x23BB6; // records 0..83
export const PALICO_GROUP_A_COUNT = 84;
export const PALICO_GROUP_B_OFF = 0x2A606; // records 84..107 (span is contiguous)
export const PALICO_GROUP_B_COUNT = 24;
export const PALICO_COLOR_FUR = 0;
export const PALICO_COLOR_CLOTHING = 3;

const PALICO_COLOR_GROUPS = 9;
const PALICO_COLOR_GROUP_BYTES = 4;
const PALICO_TEXT_BYTES = 32;
// One NUL always remains inside the 32 B field, so an over-long name is rejected
// rather than cut (same rule as the hunter name in header.mjs).
const PALICO_TEXT_MAX_BYTES = PALICO_TEXT_BYTES - 1;

// Block partition of one 324 B record (spec 03 D). `writable` is authoritative for
// this module; everything false is read-only here (G12, MUST NOT 12).
export const PALICO_LAYOUT = Object.freeze({
  name: Object.freeze({ off: 0x000, size: 32, writable: true }),
  body: Object.freeze({ off: 0x020, size: 224, writable: false }),
  residue058: Object.freeze({ off: 0x058, size: 7, writable: false }),
  ownerName: Object.freeze({ off: 0x09C, size: 32, writable: true }),
  id7: Object.freeze({ off: 0x100, size: 14, writable: false }),
  block10E: Object.freeze({ off: 0x10E, size: 12, writable: false }),
  colors: Object.freeze({ off: 0x11A, size: 36, writable: true }),
  block13E: Object.freeze({ off: 0x13E, size: 4, writable: false }),
  block142: Object.freeze({ off: 0x142, size: 2, writable: false }),
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function readU16LE(u8, off) {
  return u8[off] | (u8[off + 1] << 8);
}

function writeU16LE(u8, off, value) {
  u8[off] = value & 0xFF;
  u8[off + 1] = (value >>> 8) & 0xFF;
}

// Resolves a field to a byte offset inside the view and proves it fits in the buffer.
function fieldAt(view, field, charOff, size) {
  if (
    view === null ||
    typeof view !== 'object' ||
    !(view.u8 instanceof Uint8Array) ||
    !Number.isInteger(view.base)
  ) {
    throw new TypeError(`${field}: expected a hunter view from hunterView()`);
  }
  const off = view.base + charOff;
  if (off < 0 || off + size > view.u8.length) {
    throw new RangeError(
      `field ${field} at char_off 0x${charOff.toString(16)} is outside the ${view.u8.length} B buffer`,
    );
  }
  return off;
}

function requireUint(value, max, field) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${field}: ${value} is outside 0..${max}`);
  }
}

function requireFlag(value, field) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  throw new TypeError(`${field}: expected true/false or 1/0, got ${value}`);
}

const utf8Decoder = new TextDecoder('utf-8');
const utf8Encoder = new TextEncoder();

// An unpaired surrogate would be replaced by U+FFFD by TextEncoder, silently changing
// the text, so it is rejected instead (same rule as header.mjs).
function isWellFormed(s) {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) return false;
      i += 1;
    } else if (c >= 0xDC00 && c <= 0xDFFF) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// quest bits
// ---------------------------------------------------------------------------

function requireQuestBit(bit, field) {
  if (!Number.isInteger(bit) || bit < 0 || bit >= QUEST_BITS) {
    throw new RangeError(`${field}: bit ${bit} is outside 0..2047`);
  }
}

// MUST-NOT rules of spec 03: bit 0 and bit 945 are reserved; 1172..1180 are the
// disputed Arena/Hunter Training bits (G2); 1181..1287 and 1305..2047 have no task
// identity. The writable remainder 1..1171 (bit 945 excluded) is covered by the
// documented Village+Hub 1..944, G4 782..862 + 939..943 and Permit 944..1171 ranges.
function assertQuestBitWritable(bit, field) {
  requireQuestBit(bit, field);
  if (bit === 0) {
    throw new Error(`${field}: bit 0 is reserved and is never written (spec 03 B)`);
  }
  if (bit === 945) {
    throw new Error(`${field}: bit 945 is reserved and is never written (spec 03 B / MUST NOT 5)`);
  }
  if (bit >= 1172 && bit <= 1188) {
    throw new Error(
      `${field}: bit ${bit} is read-only (Arena candidates 1172..1188 and 1288..1304, ` +
        'Hunter Training 1174..1180; spec 03 G2)',
    );
  }
  if (bit >= 1181 && bit <= 1287) {
    throw new Error(`${field}: bit ${bit} has no documented task (unknown range 1181..1287)`);
  }
  if (bit >= 1288 && bit <= 1304) {
    throw new Error(`${field}: bit ${bit} is read-only (Arena candidate A 1288..1304; spec 03 G2)`);
  }
  if (bit >= 1305) {
    throw new Error(`${field}: bit ${bit} has no documented task (unknown range 1305..2047)`);
  }
}

function readBitAt(view, field, fieldOff, bit) {
  const at = fieldAt(view, field, fieldOff + (bit >> 3), 1);
  return (view.u8[at] >> (bit & 7)) & 1;
}

/** `quest_cleared` bit at 0x2C77 (256 B, LSB-first). Every bit is readable. */
export function readQuestCleared(view, bit) {
  requireQuestBit(bit, 'quest_cleared');
  return readBitAt(view, 'quest_cleared', QUEST_CLEARED_OFF, bit);
}

/** `quest_seen` bit at 0x2D77. Every bit is readable. */
export function readQuestSeen(view, bit) {
  requireQuestBit(bit, 'quest_seen');
  return readBitAt(view, 'quest_seen', QUEST_SEEN_OFF, bit);
}

/** `quest_achieve` bit at 0x2E77. Read-only: the third state is undecided (G6). */
export function readQuestAchieve(view, bit) {
  requireQuestBit(bit, 'quest_achieve');
  return readBitAt(view, 'quest_achieve', QUEST_ACHIEVE_OFF, bit);
}

// `quest_gate_F1` (8 B). Read-only; only bit 20 is decoded (judge 0x525040 case11).
export function readQuestGateF1(view, bit) {
  if (!Number.isInteger(bit) || bit < 0 || bit > 63) {
    throw new RangeError(`quest_gate_F1: bit ${bit} is outside 0..63`);
  }
  return readBitAt(view, 'quest_gate_F1', QUEST_GATE_F1_OFF, bit);
}

/** Effective state of one task bit: NONE, SEEN or CLEARED. */
export function readQuestState(view, bit) {
  if (readQuestCleared(view, bit) !== 0) return QUEST_STATE.CLEARED;
  if (readQuestSeen(view, bit) !== 0) return QUEST_STATE.SEEN;
  return QUEST_STATE.NONE;
}

// Setting cleared also sets seen (mandatory double write, I1/I3); clearing cleared
// leaves seen untouched, because seen=1/cleared=0 is a legal state (I2).
export function writeQuestCleared(view, bit, value) {
  const on = requireFlag(value, 'quest_cleared');
  assertQuestBitWritable(bit, 'quest_cleared');
  const mask = 1 << (bit & 7);
  const clearedAt = fieldAt(view, 'quest_cleared', QUEST_CLEARED_OFF + (bit >> 3), 1);
  const seenAt = fieldAt(view, 'quest_seen', QUEST_SEEN_OFF + (bit >> 3), 1);
  if (on) {
    view.u8[seenAt] |= mask;
    view.u8[clearedAt] |= mask;
  } else {
    view.u8[clearedAt] &= ~mask;
  }
}

// Clearing seen also clears cleared of the same task, so the seen map can never become
// a proper subset of the cleared map (I1). Setting seen alone is "unlock" (I2).
export function writeQuestSeen(view, bit, value) {
  const on = requireFlag(value, 'quest_seen');
  assertQuestBitWritable(bit, 'quest_seen');
  const mask = 1 << (bit & 7);
  const seenAt = fieldAt(view, 'quest_seen', QUEST_SEEN_OFF + (bit >> 3), 1);
  const clearedAt = fieldAt(view, 'quest_cleared', QUEST_CLEARED_OFF + (bit >> 3), 1);
  if (on) {
    view.u8[seenAt] |= mask;
  } else {
    view.u8[clearedAt] &= ~mask;
    view.u8[seenAt] &= ~mask;
  }
}

// NONE clears both maps; SEEN sets seen and clears cleared; CLEARED sets both. The
// "unlock" and "complete" operations stay separate on purpose (I2).
// Writing the state that readQuestState already reports is a no-op, so an untouched field
// keeps its bytes even when the save holds a dirty cleared=1/seen=0 bit (I1); such a bit is
// only normalised when the user actually changes that quest.
export function writeQuestState(view, bit, state) {
  if (state !== QUEST_STATE.NONE && state !== QUEST_STATE.SEEN && state !== QUEST_STATE.CLEARED) {
    throw new RangeError(`quest_state: ${state} is not a QUEST_STATE value`);
  }
  assertQuestBitWritable(bit, 'quest_state');
  if (readQuestState(view, bit) === state) return;
  const mask = 1 << (bit & 7);
  const seenAt = fieldAt(view, 'quest_seen', QUEST_SEEN_OFF + (bit >> 3), 1);
  const clearedAt = fieldAt(view, 'quest_cleared', QUEST_CLEARED_OFF + (bit >> 3), 1);
  if (state === QUEST_STATE.CLEARED) {
    view.u8[seenAt] |= mask;
    view.u8[clearedAt] |= mask;
  } else if (state === QUEST_STATE.SEEN) {
    view.u8[clearedAt] &= ~mask;
    view.u8[seenAt] |= mask;
  } else {
    view.u8[clearedAt] &= ~mask;
    view.u8[seenAt] &= ~mask;
  }
}

// ---------------------------------------------------------------------------
// monster counters
// ---------------------------------------------------------------------------

function monsterSlotIndex(slot, field) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MONSTER_COUNT) {
    throw new RangeError(`${field}: slot ${slot} is outside 0..136`);
  }
  return slot;
}

// True for the 43 small-monster slots 71..111 and 135..136. They cannot be captured
// and have no size record (I7), so their capture/size writers refuse.
export function isSmallMonsterSlot(slot) {
  monsterSlotIndex(slot, 'monster slot');
  for (const range of SMALL_MONSTER_SLOTS) {
    if (slot >= range.first && slot <= range.last) return true;
  }
  return false;
}

/** `mon_kill[slot]`, u16 LE. Slot identity is the 137-row map, never array order. */
export function readMonsterKill(view, slot) {
  const index = monsterSlotIndex(slot, 'mon_kill');
  return readU16LE(view.u8, fieldAt(view, 'mon_kill', MON_KILL_OFF + index * 2, 2));
}

/** `mon_capture[slot]`, u16 LE. Small-monster slots read 0 under the current map. */
export function readMonsterCapture(view, slot) {
  const index = monsterSlotIndex(slot, 'mon_capture');
  return readU16LE(view.u8, fieldAt(view, 'mon_capture', MON_CAPTURE_OFF + index * 2, 2));
}

// `mon_size[slot]`, 4 B LE { mini, maxi }. 0 means "no recorded value"; the ordering
// and null convention are not verified offline (G10).
export function readMonsterSize(view, slot) {
  const index = monsterSlotIndex(slot, 'mon_size');
  const off = fieldAt(view, 'mon_size', MON_SIZE_OFF + index * 4, 4);
  return { mini: readU16LE(view.u8, off), maxi: readU16LE(view.u8, off + 2) };
}

// No per-slot clamp is documented beyond u16 storage, so only u16 is enforced.
export function writeMonsterKill(view, slot, kills) {
  const index = monsterSlotIndex(slot, 'mon_kill');
  const off = fieldAt(view, 'mon_kill', MON_KILL_OFF + index * 2, 2);
  requireUint(kills, 0xFFFF, 'mon_kill');
  writeU16LE(view.u8, off, kills);
}

// Slots 71..111, 135 and 136 MUST remain 0 (small monsters cannot be captured), so a
// capture write to them is refused even when the value is 0 (spec 03 C, ruling 84).
export function writeMonsterCapture(view, slot, captures) {
  const index = monsterSlotIndex(slot, 'mon_capture');
  if (isSmallMonsterSlot(index)) {
    throw new Error(
      `mon_capture: slot ${index} is a small monster; capture must stay 0 (spec 03 C)`,
    );
  }
  const off = fieldAt(view, 'mon_capture', MON_CAPTURE_OFF + index * 2, 2);
  requireUint(captures, 0xFFFF, 'mon_capture');
  writeU16LE(view.u8, off, captures);
}

// Refused for the small-monster slots (must stay 0/0) and for a non-zero record while
// `mon_kill` of the same slot is 0, per the section C write rule. G8 notes that the
// game itself produced 9 such slots, so this refusal is editorial, not a format rule.
export function writeMonsterSize(view, slot, mini, maxi) {
  const index = monsterSlotIndex(slot, 'mon_size');
  if (isSmallMonsterSlot(index)) {
    throw new Error(`mon_size: slot ${index} is a small monster; size must stay 0/0 (spec 03 C)`);
  }
  const off = fieldAt(view, 'mon_size', MON_SIZE_OFF + index * 4, 4);
  requireUint(mini, 0xFFFF, 'mon_size mini');
  requireUint(maxi, 0xFFFF, 'mon_size maxi');
  if ((mini !== 0 || maxi !== 0) && readMonsterKill(view, index) === 0) {
    throw new Error(
      `mon_size: slot ${index} has kill 0; refusing to create a size record (spec 03 C / G8)`,
    );
  }
  writeU16LE(view.u8, off, mini);
  writeU16LE(view.u8, off + 2, maxi);
}

// ---------------------------------------------------------------------------
// palico records
// ---------------------------------------------------------------------------

// char_off of record `index` (0..107). Group A starts at 0x23BB6, group B at 0x2A606;
// the two published spans are contiguous, but both bases are used as published.
export function palicoRecordOffset(index) {
  if (!Number.isInteger(index) || index < 0 || index >= PALICO_COUNT) {
    throw new RangeError(`palico index: ${index} is outside 0..107`);
  }
  if (index < PALICO_GROUP_A_COUNT) {
    return PALICO_GROUP_A_OFF + PALICO_RECORD_SIZE * index;
  }
  return PALICO_GROUP_B_OFF + PALICO_RECORD_SIZE * (index - PALICO_GROUP_A_COUNT);
}

function readUtf8Field(u8, off, size) {
  const limit = off + size;
  let end = off;
  while (end < limit && u8[end] !== 0) end += 1;
  return utf8Decoder.decode(u8.subarray(off, end));
}

// Clears the whole 32 B field first, then writes UTF-8, so at least one NUL remains
// and no byte of a previous name survives. An over-long name is rejected, never cut,
// so a multi-byte sequence is never split.
function writeNameField(view, index, charOff, name, field) {
  const off = fieldAt(view, field, palicoRecordOffset(index) + charOff, PALICO_TEXT_BYTES);
  if (typeof name !== 'string') {
    throw new TypeError(`${field}: expected a string`);
  }
  if (name.includes('\u0000')) {
    throw new RangeError(`${field}: must not contain U+0000`);
  }
  if (!isWellFormed(name)) {
    throw new RangeError(`${field}: contains an unpaired UTF-16 surrogate`);
  }
  const encoded = utf8Encoder.encode(name);
  if (encoded.length > PALICO_TEXT_MAX_BYTES) {
    throw new RangeError(
      `${field}: ${encoded.length} UTF-8 bytes exceeds the ${PALICO_TEXT_MAX_BYTES} B capacity`,
    );
  }
  view.u8.fill(0, off, off + PALICO_TEXT_BYTES);
  view.u8.set(encoded, off);
}

/** Palico name at record +0x000 (32 B UTF-8, stops at the first NUL). */
export function readPalicoName(view, index) {
  const off = fieldAt(view, 'palico_name', palicoRecordOffset(index) + PALICO_LAYOUT.name.off, 32);
  return readUtf8Field(view.u8, off, PALICO_TEXT_BYTES);
}

/** Owner name at record +0x09C (32 B UTF-8, same encoding as the palico name). */
export function readPalicoOwnerName(view, index) {
  const charOff = palicoRecordOffset(index) + PALICO_LAYOUT.ownerName.off;
  const off = fieldAt(view, 'palico_owner_name', charOff, PALICO_TEXT_BYTES);
  return readUtf8Field(view.u8, off, PALICO_TEXT_BYTES);
}

/** Rewrite the palico name field at record +0x000; never spills into +0x020. */
export function writePalicoName(view, index, name) {
  writeNameField(view, index, PALICO_LAYOUT.name.off, name, 'palico_name');
}

/** Rewrite the owner-name field at record +0x09C; the old editor had no 32 B cap. */
export function writePalicoOwnerName(view, index, name) {
  writeNameField(view, index, PALICO_LAYOUT.ownerName.off, name, 'palico_owner_name');
}

/** The 7 u16 ids at record +0x100. Read-only: no id encoding is documented. */
export function readPalicoId7(view, index) {
  const off = fieldAt(view, 'palico_id7', palicoRecordOffset(index) + PALICO_LAYOUT.id7.off, 14);
  const ids = new Array(7);
  for (let k = 0; k < 7; k += 1) ids[k] = readU16LE(view.u8, off + 2 * k);
  return ids;
}

function palicoColorCharOff(index, group) {
  if (!Number.isInteger(group) || group < 0 || group >= PALICO_COLOR_GROUPS) {
    throw new RangeError(`palico_color: group ${group} is outside 0..8`);
  }
  return palicoRecordOffset(index) + PALICO_LAYOUT.colors.off + group * PALICO_COLOR_GROUP_BYTES;
}

/** One of the 9 colour groups at record +0x11A, as { r, g, b, a }. */
export function readPalicoColor(view, index, group) {
  const off = fieldAt(view, 'palico_color', palicoColorCharOff(index, group), 4);
  return { r: view.u8[off], g: view.u8[off + 1], b: view.u8[off + 2], a: view.u8[off + 3] };
}

// Only group 0 (fur) and group 3 (clothing) have a documented label; the other 7
// groups are undocumented and their writes are refused. The 4th byte of every group
// (documented 0xFF alpha) is never written, so it stays byte-exact.
export function writePalicoColor(view, index, group, r, g, b) {
  if (group !== PALICO_COLOR_FUR && group !== PALICO_COLOR_CLOTHING) {
    throw new Error(
      `palico_color: group ${group} is undocumented; only group 0 (fur) and group 3 ` +
        '(clothing) may be written (spec 03 D)',
    );
  }
  const off = fieldAt(view, 'palico_color', palicoColorCharOff(index, group), 4);
  requireUint(r, 0xFF, 'palico_color R');
  requireUint(g, 0xFF, 'palico_color G');
  requireUint(b, 0xFF, 'palico_color B');
  view.u8[off] = r;
  view.u8[off + 1] = g;
  view.u8[off + 2] = b;
}

// SPEC GAPS:
// - Quest bit coordinate: writers take the caller's bit number as record order i (the
//   current ruling); the questId convention (G1/G3) is unverified, so callers must not
//   pass questId values.
// - Arena 1288..1304 vs 1172..1188 (G2) and Hunter Training 1174..1180 are read-only
//   here; no candidate is chosen and every write to those bits throws.
// - Bits 866..943 (the editor's unsourced "cat quest" split) expose no category here.
//   Individual bits stay writable because they lie inside the documented Village+Hub
//   range 1..944 and G4 939..943 is explicitly writable; no split write exists.
//   Flagged for review.
// - quest_achieve 0x2E77 (G6) and quest gate 0x2F77 (G7) are read-only.
// - The `seen |= cleared` repair (I1) is not offered: spec 03 forbids a blanket repair
//   without the player's task list, and `cleared &= seen` must not be run.
// - mon_size refuses a non-zero record while kill is 0, per the section C write rule;
//   G8 records that the game itself produced 9 such slots, so this is editorial.
// - Palico group B records 84..107 (G11): runtime processing is undocumented, so writes
//   there are allowed by the spec but may not take effect in game.
// - Palico body +0x020, +0x10E, +0x13E, +0x142 (G12), +0x058 residue (MUST NOT 12) and
//   the 7 u16 ids at +0x100 have no writer; only the ids have a reader. The 25 B segment
//   header at 0x23B9D..0x23BB5 is outside every record and is never touched.
// - Palico colour groups other than 0 and 3 are undocumented and refused; the 0xFF
//   alpha byte is preserved byte-exact.
// - The palico name length limit is undocumented: at most 31 UTF-8 bytes are accepted
//   so a NUL always fits the 32 B field; over-long names and unpaired surrogates are
//   rejected (header.mjs precedent), never truncated.
// - HR (char_off 0x28 / 0x0B1) and the obj+0x958 gate bit belong to header.mjs and the
//   member specs. HR is a slot summary the load path discards (spec 03 A), so no HR
//   gate helper is exported here.
