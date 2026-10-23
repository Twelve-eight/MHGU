// SPDX-License-Identifier: MIT
// Spec sections implemented: 02-items-equipment.md A (item box), B (pouch), C (hunter
// equipment box), D (palico box extent, read-only), F (item set presets), G (id domains).
//
// Coordinates (spec 02 H, ADDR-01/ADDR-02): every offset below is a `char_off` inside one
// 1,177,760 B hunter block. A view is `{ u8, base }` produced by container.mjs
// `hunterView(file, slotIndex)`; the file offset of a field is `view.base + char_off`.
// The same functions work on a `system` slot and on a bare `.hnt` block.
//
// Layout rule (BOX-01, G-06): the item box exists in two layouts and no byte-level
// discriminator is documented. Every item-box and item-preset function therefore takes an
// explicit `layout` argument ("legacy" or "v7"). This module never guesses a layout and
// never mixes byte lengths from the two layouts.
//
// Read-only regions (no writer is exported for them, by spec):
//   - item preset bodies, 128 B (ITSET-05, MN-07);
//   - palico equipment box, 1000 x 36 B (CATBOX-01..03, MN-06).
//
// No checksum exists over slot data (ADDR-04); every writer performs a single-field write
// and leaves every byte outside that field untouched (INV-10).

// ---------------------------------------------------------------------------
// Shared constants: item id / count domain (ID-01, BOX-06, BOX-07)
// ---------------------------------------------------------------------------

/** Largest writable item id. 0 means empty; 2991 is a table bound, not an item (G-13). */
export const ITEM_ID_MAX = 2990;

/** Largest writable stack count. The 7-bit field holds 0..127, the game bound is 99 (G-12). */
export const ITEM_COUNT_MAX = 99;

const SLOT_BITS = 19;
const SLOT_ID_BITS = 12;
const SLOT_ID_MASK = 0x0fff;
const SLOT_COUNT_MASK = 0x7f;
const SLOT_MASK = 0x7ffff;

// ---------------------------------------------------------------------------
// A. Item box (BOX-01..BOX-10), char_off 632..10174
// ---------------------------------------------------------------------------

/** Bitstream base, char_off 632 (BOX-02). Never relocate it in a save edit (MN-03). */
export const ITEM_BOX_BASE = 632;

/**
 * The two documented layouts (BOX-01). Byte lengths are ceil(slotCount * 19 / 8):
 * legacy 2300 slots -> 5463 B, V7 2992 slots -> 7106 B (INV-01).
 *
 * Region closure (INV-02): 632 + 5463 = 6095 = legacy preset start;
 * 632 + 7106 = 7738 = V7 preset start; 6095 + 24 * 170 = 7738 + 14 * 170 + 57 = 10175,
 * which is the pouch start. The V7 57 B dead zone 10118..10174 is padding (MN-13).
 */
export const ITEM_BOX_LAYOUTS = Object.freeze({
  legacy: Object.freeze({ slotCount: 2300, bitstreamBytes: 5463, presetStart: 6095, presetCount: 24 }),
  v7: Object.freeze({ slotCount: 2992, bitstreamBytes: 7106, presetStart: 7738, presetCount: 14 })
});

/**
 * Returns the frozen layout descriptor for an explicit layout name.
 * @param {"legacy"|"v7"} layout
 * @returns {{slotCount:number, bitstreamBytes:number, presetStart:number, presetCount:number}}
 */
export function itemBoxInfo(layout) {
  if (layout === "legacy" || layout === "v7") return ITEM_BOX_LAYOUTS[layout];
  throw new TypeError(`layout must be "legacy" or "v7", got ${String(layout)} (BOX-01/G-06: never guess the layout)`);
}

/**
 * Number of item-box slots of the given layout (BOX-03): 2300 legacy, 2992 V7.
 * @param {"legacy"|"v7"} layout
 * @returns {number}
 */
export function itemBoxSlotCount(layout) {
  return itemBoxInfo(layout).slotCount;
}

/**
 * Reads one item-box slot (BOX-04, BOX-05: forward order, file slot k = UI slot k).
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout explicit layout, never guessed
 * @param {number} index 0..slotCount-1
 * @returns {{id:number, count:number, used:boolean, valid:boolean}}
 *   `used` is BOX-08 (`id !== 0 || count !== 0`); `valid` is false for values outside the
 *   documented domain or for a half-set slot (INV-03, INV-09: the raw value is surfaced).
 */
export function readItemBoxSlot(view, layout, index) {
  const info = itemBoxInfo(layout);
  const u8 = viewBytes(view);
  checkIndex(index, info.slotCount, "index");
  return readSlotAt(u8, view.base, ITEM_BOX_BASE, index);
}

/**
 * Reads the whole item-box bitstream.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout
 * @returns {Array<{id:number, count:number, used:boolean, valid:boolean}>}
 */
export function readItemBox(view, layout) {
  const info = itemBoxInfo(layout);
  const u8 = viewBytes(view);
  checkField(u8, view.base, ITEM_BOX_BASE, info.bitstreamBytes);
  const out = new Array(info.slotCount);
  for (let i = 0; i < info.slotCount; i++) out[i] = readSlotAt(u8, view.base, ITEM_BOX_BASE, i);
  return out;
}

/**
 * Writes one item-box slot as a single 19-bit read-modify-write (BOX-04, INV-04, MN-04).
 * Slot indices >= 2300 are rejected on the legacy layout because those bytes are the item
 * preset block there (BOX-09, MN-02); passing the V7 layout is the only way to reach them.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout explicit layout, confirmed by the caller
 * @param {number} index 0..slotCount-1
 * @param {{id:number, count:number}} value id 0 or 1..2990, count 0 (empty) or 1..99
 * @returns {void}
 * @throws {RangeError} on an out-of-range index, id or count, or on a half-set slot
 */
export function writeItemBoxSlot(view, layout, index, value) {
  const info = itemBoxInfo(layout);
  const u8 = viewBytes(view);
  checkIndex(index, info.slotCount, "index");
  const slot = checkSlotValue(value);
  writeSlotAt(u8, view.base, ITEM_BOX_BASE, index, slot.id, slot.count);
}

// ---------------------------------------------------------------------------
// B. Item pouch (POUCH-01..POUCH-06), char_off 10175..10250
// ---------------------------------------------------------------------------

/** Pouch field base, char_off 10175 (POUCH-01). */
export const POUCH_BASE = 10175;

/** Pouch slot count (POUCH-01): 32. */
export const POUCH_SLOT_COUNT = 32;

/** Pouch field width (POUCH-01): 32 * 19 = 608 bits = 76 B exactly. */
export const POUCH_BYTES = 76;

/**
 * Reads one pouch slot with the shared 19-bit codec (POUCH-02). Slots are returned in file
 * order; no UI-row mapping is documented (G-15).
 * @param {{u8: Uint8Array, base: number}} view
 * @param {number} index 0..31
 * @returns {{id:number, count:number, used:boolean, valid:boolean}}
 */
export function readPouchSlot(view, index) {
  const u8 = viewBytes(view);
  checkIndex(index, POUCH_SLOT_COUNT, "index");
  return readSlotAt(u8, view.base, POUCH_BASE, index);
}

/**
 * Reads all 32 pouch slots.
 * @param {{u8: Uint8Array, base: number}} view
 * @returns {Array<{id:number, count:number, used:boolean, valid:boolean}>}
 */
export function readPouch(view) {
  const u8 = viewBytes(view);
  checkField(u8, view.base, POUCH_BASE, POUCH_BYTES);
  const out = new Array(POUCH_SLOT_COUNT);
  for (let i = 0; i < POUCH_SLOT_COUNT; i++) out[i] = readSlotAt(u8, view.base, POUCH_BASE, i);
  return out;
}

/**
 * Writes one pouch slot with the same 19-bit read-modify-write as the item box (POUCH-02,
 * POUCH-05). Never write a byte run over the 76 B field: neighbouring slots share bytes.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {number} index 0..31
 * @param {{id:number, count:number}} value
 * @returns {void}
 * @throws {RangeError} on an out-of-range index, id or count, or on a half-set slot
 */
export function writePouchSlot(view, index, value) {
  const u8 = viewBytes(view);
  checkIndex(index, POUCH_SLOT_COUNT, "index");
  const slot = checkSlotValue(value);
  writeSlotAt(u8, view.base, POUCH_BASE, index, slot.id, slot.count);
}

// ---------------------------------------------------------------------------
// Codec internals (shared by the item box and the pouch, BOX-04 / POUCH-02)
// ---------------------------------------------------------------------------

/**
 * Bit address = fieldCharOff * 8 + index * 19. The window starts at
 * floor(index * 19 / 8) with bit index * 19 mod 8 and spans 3 or 4 bytes; bytes outside
 * the window (and bits outside the 19-bit mask) are never written.
 */
function slotGeometry(fieldCharOff, index) {
  const bit = index * SLOT_BITS;
  const shift = bit & 7;
  return {
    charOff: fieldCharOff + (bit >>> 3),
    shift,
    // ceil((shift + 19) / 8): 3 bytes for shift 0..5, 4 bytes for shift 6..7.
    byteCount: (shift + SLOT_BITS + 7) >>> 3
  };
}

function readSlotAt(u8, base, fieldCharOff, index) {
  const g = slotGeometry(fieldCharOff, index);
  checkField(u8, base, g.charOff, g.byteCount);
  const word = readBitsLE(u8, base + g.charOff, g.byteCount);
  const id = (word >>> g.shift) & SLOT_ID_MASK;
  const count = (word >>> (g.shift + SLOT_ID_BITS)) & SLOT_COUNT_MASK;
  return {
    id,
    count,
    used: id !== 0 || count !== 0,
    valid: slotValid(id, count)
  };
}

function writeSlotAt(u8, base, fieldCharOff, index, id, count) {
  const g = slotGeometry(fieldCharOff, index);
  checkField(u8, base, g.charOff, g.byteCount);
  const at = base + g.charOff;
  const word = readBitsLE(u8, at, g.byteCount);
  const mask = SLOT_MASK << g.shift;
  const value = (((count << SLOT_ID_BITS) | id) << g.shift) >>> 0;
  const next = ((word & ~mask) | (value & mask)) >>> 0;
  writeBitsLE(u8, at, g.byteCount, next);
}

function slotValid(id, count) {
  if (id < 0 || id > ITEM_ID_MAX) return false;
  if (count < 0 || count > ITEM_COUNT_MAX) return false;
  // INV-03: empty is exactly (0, 0); a used slot has id != 0 and count >= 1.
  return (id === 0) === (count === 0);
}

function checkSlotValue(value) {
  if (value === null || typeof value !== "object") {
    throw new TypeError("value must be an object { id, count }");
  }
  const id = value.id;
  const count = value.count;
  if (!Number.isInteger(id) || id < 0 || id > ITEM_ID_MAX) {
    throw new RangeError(`id must be an integer 0 (empty) or 1..${ITEM_ID_MAX}, got ${String(id)}`);
  }
  if (!Number.isInteger(count) || count < 0 || count > ITEM_COUNT_MAX) {
    throw new RangeError(`count must be an integer 0..${ITEM_COUNT_MAX}, got ${String(count)}`);
  }
  if (id === 0 && count !== 0) {
    throw new RangeError(`count must be 0 when id is 0 (empty slot), got ${count}`);
  }
  if (id !== 0 && count === 0) {
    throw new RangeError(`count must be 1..${ITEM_COUNT_MAX} for a used slot (id ${id}), got 0`);
  }
  return { id, count };
}

// ---------------------------------------------------------------------------
// F. Item set presets (ITSET-01..ITSET-07), legacy char_off 6095..10174,
//    V7 char_off 7738..10174 (14 records + 57 B dead zone)
// ---------------------------------------------------------------------------

/** Preset name width (ITSET-04, INV-07): 42 B, UTF-8, NUL padded, no NUL when full. */
export const ITEM_PRESET_NAME_SIZE = 42;

/** Preset body width (ITSET-05): 128 B. Undecoded, read-only (G-01, MN-07). */
export const ITEM_PRESET_BODY_SIZE = 128;

/** Preset record width (ITSET-03): 170 B = 42 B name + 128 B body. */
export const ITEM_PRESET_RECORD_SIZE = 170;

/**
 * Reads the name of one item set preset. The name is bounded at 42 B and does not require a
 * NUL terminator (INV-07); decoding stops at the first NUL and never reads past the field.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout
 * @param {number} index 0..23 (legacy) or 0..13 (V7) (ITSET-06)
 * @returns {string}
 */
export function readItemPresetName(view, layout, index) {
  const u8 = viewBytes(view);
  const charOff = itemPresetCharOff(layout, index);
  checkField(u8, view.base, charOff, ITEM_PRESET_NAME_SIZE);
  return decodeName(u8, view.base + charOff, ITEM_PRESET_NAME_SIZE);
}

/**
 * Writes an item set preset name: clear all 42 B, then copy whole UTF-8 code points while the
 * byte count stays <= 42 (ITSET-04, INV-07, MN-14). A name that does not fit is truncated at a
 * code-point boundary, never in the middle of a multi-byte sequence; the returned byte count
 * lets the caller detect truncation. No byte outside the 42 B name field is changed.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout
 * @param {number} index 0..23 (legacy) or 0..13 (V7)
 * @param {string} name UTF-8 name; U+0000 is rejected because it would read back truncated
 * @returns {number} number of bytes written (0..42)
 * @throws {RangeError|TypeError} on a bad index, a non-string name or U+0000 in the name
 */
export function writeItemPresetName(view, layout, index, name) {
  const u8 = viewBytes(view);
  const charOff = itemPresetCharOff(layout, index);
  if (typeof name !== "string") throw new TypeError("name must be a string");
  if (name.indexOf("\u0000") !== -1) {
    throw new RangeError("name must not contain U+0000: the field is NUL padded and would read back truncated");
  }
  checkField(u8, view.base, charOff, ITEM_PRESET_NAME_SIZE);
  const bytes = utf8Encoder.encode(fitUtf8(name, ITEM_PRESET_NAME_SIZE));
  if (bytes.length > ITEM_PRESET_NAME_SIZE) {
    // Defensive: fitUtf8 already bounds the encoded size; keep the field invariant explicit.
    throw new RangeError(`name encodes to ${bytes.length} B, field is ${ITEM_PRESET_NAME_SIZE} B`);
  }
  const at = view.base + charOff;
  u8.fill(0, at, at + ITEM_PRESET_NAME_SIZE);
  u8.set(bytes, at);
  return bytes.length;
}

/**
 * Returns a copy of the 128 B preset body (ITSET-05). The body layout is undecoded
 * (`[INFERENCE]`, G-01), so this module exposes it read-only: no writer exists (MN-07).
 * The returned Uint8Array is a copy, not a view into the save.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout
 * @param {number} index 0..23 (legacy) or 0..13 (V7)
 * @returns {Uint8Array}
 */
export function readItemPresetBody(view, layout, index) {
  const u8 = viewBytes(view);
  const charOff = itemPresetCharOff(layout, index) + ITEM_PRESET_NAME_SIZE;
  checkField(u8, view.base, charOff, ITEM_PRESET_BODY_SIZE);
  const from = view.base + charOff;
  // new Uint8Array(...) always copies, also when `u8` is a Node Buffer (Buffer#slice would
  // return a view into the save and defeat the read-only rule).
  return new Uint8Array(u8.subarray(from, from + ITEM_PRESET_BODY_SIZE));
}

/**
 * Reads one item set preset: name plus a read-only copy of the body.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {"legacy"|"v7"} layout
 * @param {number} index
 * @returns {{index:number, name:string, body:Uint8Array}}
 */
export function readItemPreset(view, layout, index) {
  return {
    index,
    name: readItemPresetName(view, layout, index),
    body: readItemPresetBody(view, layout, index)
  };
}

function itemPresetCharOff(layout, index) {
  const info = itemBoxInfo(layout);
  checkIndex(index, info.presetCount, "preset index");
  return info.presetStart + ITEM_PRESET_RECORD_SIZE * index;
}

// ---------------------------------------------------------------------------
// C. Hunter equipment box (EQ-01..EQ-12), char_off 25326..97325
// ---------------------------------------------------------------------------

/** Equipment box base, char_off 25326 (EQ-01). */
export const EQUIP_BOX_BASE = 25326;

/** Equipment box record count (EQ-01): 2000. */
export const EQUIP_BOX_COUNT = 2000;

/** File record size (EQ-02): 36 B. The runtime object is 44 B, a different coordinate. */
export const EQUIP_RECORD_SIZE = 36;

/** Equipment box end, char_off 97326 == palico box base (EQ-01, INV-05). */
export const EQUIP_BOX_END = 97326;

/** Largest armor `seq` (EQ-05 / ID-04; the body part max is 1286). */
export const ARMOR_ID_MAX = 1286;

/** Armor `LV01` upper bound (EQ-04): 5-bit field, 0..31. */
export const ARMOR_LEVEL_MAX = 31;

/** Armor glamour level `LV02` upper bound (EQ-04): 6-bit field, 0..63. */
export const ARMOR_GLAMOUR_LEVEL_MAX = 63;

/** Weapon `LV01` upper bound (EQ-04 / ID-03): display level 1..15 means 0..14. */
export const WEAPON_LEVEL_MAX = 14;

/**
 * Weapon family index maximum per record type (EQ-05 / ID-03).
 * `type = class + 6`; class 6 is the empty gap, so type 12 has no entry (MN-10).
 * GS 136 / SnS 128 / Hammer 131 / Lance 126 / HBG 108 / LBG 109 / LS 125 / SA 108 /
 * GL 114 / Bow 107 / DB 125 / HH 111 / IG 82 / CB 80.
 */
export const WEAPON_FAMILY_MAX = Object.freeze({
  7: 136, // great sword
  8: 128, // sword and shield
  9: 131, // hammer
  10: 126, // lance
  11: 108, // heavy bowgun
  13: 109, // light bowgun
  14: 125, // long sword
  15: 108, // switch axe
  16: 114, // gunlance
  17: 107, // bow
  18: 125, // dual blades
  19: 111, // hunting horn
  20: 82, // insect glaive
  21: 80 // charge blade
});

/** Lowest writable decoration (bead) id (ID-02). */
export const BEAD_ID_MIN = 2638;

/** Highest writable decoration (bead) id (ID-02). */
export const BEAD_ID_MAX = 2888;

/** Unused holes inside the bead range: keep the socket empty (ID-02 / EQ-07). */
export const BEAD_UNUSED_IDS = Object.freeze([2717, 2718, 2720, 2776, 2788, 2817, 2839, 2840, 2843]);

/** Largest charm kind (EQ-08 / ID-05). */
export const CHARM_KIND_MAX = 10;

/** Largest charm socket count (EQ-08): 0..3. */
export const CHARM_SOCKET_MAX = 3;

/** Allowed values of charm byte +18 (EQ-08). The kind -> constant table is a spec gap. */
export const CHARM_TEMPLATE_VALUES = Object.freeze([97, 98, 99, 100]);

/** Insect glaive insect type range (EQ-09). */
export const INSECT_TYPE_MIN = 1;
export const INSECT_TYPE_MAX = 31;

/** Insect glaive insect level range (EQ-09), display level + 1. */
export const INSECT_LEVEL_MAX = 11;

/** Insect power / weight / speed range (EQ-09). */
export const INSECT_STAT_MAX = 19;

/** Insect fire / water / thunder / ice / dragon range (EQ-09). */
export const INSECT_ELEMENT_MAX = 36;

/**
 * Reads one 36 B equipment record (EQ-02..EQ-12). Domain violations are reported in
 * `problems` instead of throwing: a damaged or foreign record must be surfaced, never
 * "repaired" or silently normalised (INV-09).
 * @param {{u8: Uint8Array, base: number}} view
 * @param {number} index 0..1999
 * @returns {{
 *   index:number, type:number, empty:boolean, lv01:number, lv02:number, id:number,
 *   glamour:number, beads:number[], charm:null|object, insect:null|object, problems:string[]
 * }}
 */
export function readEquipmentRecord(view, index) {
  const u8 = viewBytes(view);
  checkIndex(index, EQUIP_BOX_COUNT, "index");
  const charOff = EQUIP_BOX_BASE + EQUIP_RECORD_SIZE * index;
  checkField(u8, view.base, charOff, EQUIP_RECORD_SIZE);
  const at = view.base + charOff;
  const b0 = u8[at];
  const b1 = u8[at + 1];
  const type = b0 & 0x1f;
  const record = {
    index,
    type,
    // EQ-12: an empty record is defined by b0 == 0, not by the masked type alone.
    empty: b0 === 0,
    lv01: ((b0 >>> 5) & 0x07) | ((b1 & 0x03) << 3),
    lv02: b1 >>> 2,
    id: u8[at + 2] | (u8[at + 3] << 8),
    glamour: u8[at + 4] | (u8[at + 5] << 8),
    beads: [
      u8[at + 6] | (u8[at + 7] << 8),
      u8[at + 8] | (u8[at + 9] << 8),
      u8[at + 10] | (u8[at + 11] << 8)
    ],
    charm: null,
    insect: null,
    problems: []
  };
  if (type === 6) {
    record.charm = {
      kind: record.id,
      skill1: u8[at + 12],
      skill2: u8[at + 13],
      points1: sbyte(u8[at + 14]),
      points2: sbyte(u8[at + 15]),
      sockets: u8[at + 16],
      template: u8[at + 18],
      marker: u8[at + 19]
    };
  }
  if (type === 20) {
    record.insect = {
      type: u8[at + 12],
      level: u8[at + 13],
      power: u8[at + 14],
      weight: u8[at + 15],
      speed: u8[at + 16],
      fire: u8[at + 17],
      water: u8[at + 18],
      thunder: u8[at + 19],
      ice: u8[at + 20],
      dragon: u8[at + 21]
    };
  }
  record.problems = equipmentProblems(record, u8, at);
  return record;
}

/**
 * Writes one 36 B equipment record in place (EQ-03..EQ-12). Bytes +0..+11 are rebuilt from
 * `type`/`lv01`/`lv02`/`id`/`glamour`/`beads`; +12..+35 are zeroed for armor and ordinary
 * weapons (EQ-10), taken from `charm` for type 6, or taken from `insect` for type 20 while
 * +22..+35 are preserved byte-for-byte (EQ-11). `type: 0` clears the record when `b0 > 0`.
 *
 * The record must already be non-empty: `b0 == 0` is refused (EQ-12, MN-11, G-14). This
 * function never moves, inserts or deletes records.
 * @param {{u8: Uint8Array, base: number}} view
 * @param {number} index 0..1999
 * @param {object} record see readEquipmentRecord for the shape; `type` is required
 * @returns {void}
 * @throws {RangeError} on a field outside its documented domain
 * @throws {TypeError} on a missing/mismatched sub-object (charm, insect)
 * @throws {Error} when the target record is empty
 */
export function writeEquipmentRecord(view, index, record) {
  const u8 = viewBytes(view);
  checkIndex(index, EQUIP_BOX_COUNT, "index");
  if (record === null || typeof record !== "object") {
    throw new TypeError("record must be an object");
  }
  const charOff = EQUIP_BOX_BASE + EQUIP_RECORD_SIZE * index;
  checkField(u8, view.base, charOff, EQUIP_RECORD_SIZE);
  const at = view.base + charOff;
  if (u8[at] === 0) {
    throw new Error(
      `refusing to write equipment record ${index}: the record is empty (b0 == 0); ` +
        "creating records in empty slots is not specified (EQ-12, MN-11, G-14)"
    );
  }

  const type = checkEquipType(record.type);
  if (type === 0) {
    clearRecordAt(u8, at, index);
    return;
  }

  const armor = type >= 1 && type <= 5;
  const charmType = type === 6;
  const weapon = type >= 7 && type <= 21; // type 12 was rejected by checkEquipType
  const glaive = type === 20;

  const lv01 = record.lv01 === undefined ? 0 : record.lv01;
  const lv02 = record.lv02 === undefined ? 0 : record.lv02;
  if (armor) {
    checkIntInRange(lv01, 0, ARMOR_LEVEL_MAX, "lv01");
    checkIntInRange(lv02, 0, ARMOR_GLAMOUR_LEVEL_MAX, "lv02");
  } else if (weapon) {
    checkIntInRange(lv01, 0, WEAPON_LEVEL_MAX, "lv01");
    // EQ-04: a weapon has no glamour level, so b1 carries only LV01 >> 3.
    if (lv02 !== 0) throw new RangeError(`lv02 must be 0 for a weapon record (EQ-04), got ${String(lv02)}`);
  } else {
    // Charm: EQ-08 does not define the level bits for type 6; refuse instead of guessing.
    if (lv01 !== 0 || lv02 !== 0) {
      throw new RangeError(
        `lv01 and lv02 must be 0 for a charm record (meaning of the level bits there is UNCONFIRMED), ` +
          `got ${String(lv01)} and ${String(lv02)}`
      );
    }
  }

  let id = 0;
  if (armor) {
    id = checkIntInRange(record.id, 1, ARMOR_ID_MAX, "id");
  } else if (weapon) {
    id = checkIntInRange(record.id, 1, WEAPON_FAMILY_MAX[type], "id");
  }

  const glamour = record.glamour === undefined ? 0 : record.glamour;
  if (armor) {
    checkIntInRange(glamour, 0, ARMOR_ID_MAX, "glamour");
  } else if (glamour !== 0) {
    throw new RangeError(`glamour must be 0 for a non-armor record (EQ-06), got ${String(glamour)}`);
  }

  const beads = [0, 0, 0];
  if (record.beads !== undefined) {
    if (!Array.isArray(record.beads) || record.beads.length !== 3) {
      throw new RangeError("beads must be an array of exactly 3 bead ids (+6..+11)");
    }
    for (let i = 0; i < 3; i++) beads[i] = checkBead(record.beads[i], i);
  }

  let charm = null;
  if (charmType) {
    const c = record.charm;
    if (c === null || typeof c !== "object") {
      throw new TypeError(
        "charm must be an object { kind, skill1, skill2, points1, points2, sockets, template } for type 6 (EQ-08)"
      );
    }
    const kind = checkIntInRange(c.kind, 0, CHARM_KIND_MAX, "charm.kind");
    if (record.id !== undefined && record.id !== kind) {
      throw new RangeError(`id must equal charm.kind (${kind}) for a charm record, got ${String(record.id)}`);
    }
    id = kind;
    const template = c.template;
    if (template !== 97 && template !== 98 && template !== 99 && template !== 100) {
      throw new RangeError(
        `charm.template must be one of ${CHARM_TEMPLATE_VALUES.join(", ")} (byte +18), got ${String(template)}`
      );
    }
    charm = {
      skill1: checkIntInRange(c.skill1, 0, 255, "charm.skill1"),
      skill2: checkIntInRange(c.skill2, 0, 255, "charm.skill2"),
      // INV-06: the two point bytes are signed; negative values are legal.
      points1: checkIntInRange(c.points1, -128, 127, "charm.points1"),
      points2: checkIntInRange(c.points2, -128, 127, "charm.points2"),
      sockets: checkIntInRange(c.sockets, 0, CHARM_SOCKET_MAX, "charm.sockets"),
      template
    };
  } else if (record.charm !== undefined && record.charm !== null) {
    throw new TypeError("charm is only valid for a type 6 record");
  }

  let insect = null;
  if (glaive) {
    const s = record.insect;
    if (s === null || typeof s !== "object") {
      throw new TypeError(
        "insect must be an object { type, level, power, weight, speed, fire, water, thunder, ice, dragon } for type 20 (EQ-09)"
      );
    }
    insect = {
      type: checkIntInRange(s.type, INSECT_TYPE_MIN, INSECT_TYPE_MAX, "insect.type"),
      level: checkIntInRange(s.level, 0, INSECT_LEVEL_MAX, "insect.level"),
      power: checkIntInRange(s.power, 0, INSECT_STAT_MAX, "insect.power"),
      weight: checkIntInRange(s.weight, 0, INSECT_STAT_MAX, "insect.weight"),
      speed: checkIntInRange(s.speed, 0, INSECT_STAT_MAX, "insect.speed"),
      fire: checkIntInRange(s.fire, 0, INSECT_ELEMENT_MAX, "insect.fire"),
      water: checkIntInRange(s.water, 0, INSECT_ELEMENT_MAX, "insect.water"),
      thunder: checkIntInRange(s.thunder, 0, INSECT_ELEMENT_MAX, "insect.thunder"),
      ice: checkIntInRange(s.ice, 0, INSECT_ELEMENT_MAX, "insect.ice"),
      dragon: checkIntInRange(s.dragon, 0, INSECT_ELEMENT_MAX, "insect.dragon")
    };
  } else if (record.insect !== undefined && record.insect !== null) {
    throw new TypeError("insect is only valid for a type 20 record");
  }

  const bytes = new Uint8Array(EQUIP_RECORD_SIZE);
  bytes[0] = ((lv01 & 0x07) << 5) | type;
  bytes[1] = ((lv02 & 0x3f) << 2) | ((lv01 >>> 3) & 0x03);
  bytes[2] = id & 0xff;
  bytes[3] = (id >>> 8) & 0xff;
  bytes[4] = glamour & 0xff;
  bytes[5] = (glamour >>> 8) & 0xff;
  bytes[6] = beads[0] & 0xff;
  bytes[7] = (beads[0] >>> 8) & 0xff;
  bytes[8] = beads[1] & 0xff;
  bytes[9] = (beads[1] >>> 8) & 0xff;
  bytes[10] = beads[2] & 0xff;
  bytes[11] = (beads[2] >>> 8) & 0xff;

  if (charm !== null) {
    bytes[12] = charm.skill1;
    bytes[13] = charm.skill2;
    bytes[14] = charm.points1 & 0xff;
    bytes[15] = charm.points2 & 0xff;
    bytes[16] = charm.sockets;
    bytes[17] = 0;
    bytes[18] = charm.template;
    bytes[19] = 1;
    // +20..+35 stay 0 (EQ-08).
  } else if (insect !== null) {
    bytes[12] = insect.type;
    bytes[13] = insect.level;
    bytes[14] = insect.power;
    bytes[15] = insect.weight;
    bytes[16] = insect.speed;
    bytes[17] = insect.fire;
    bytes[18] = insect.water;
    bytes[19] = insect.thunder;
    bytes[20] = insect.ice;
    bytes[21] = insect.dragon;
    // EQ-11: +22..+35 of a glaive record are not decoded; preserve them byte-for-byte.
    for (let i = 22; i < EQUIP_RECORD_SIZE; i++) bytes[i] = u8[at + i];
  }

  u8.set(bytes, at);
}

/**
 * Clears one equipment record to 36 zero bytes. Refused when `b0 == 0`: an empty record may
 * carry foreign bytes the game ignores, and a record must never be cleared to "make room"
 * (EQ-12, MN-12).
 * @param {{u8: Uint8Array, base: number}} view
 * @param {number} index 0..1999
 * @returns {void}
 * @throws {Error} when the record is already empty
 */
export function clearEquipmentRecord(view, index) {
  const u8 = viewBytes(view);
  checkIndex(index, EQUIP_BOX_COUNT, "index");
  const charOff = EQUIP_BOX_BASE + EQUIP_RECORD_SIZE * index;
  checkField(u8, view.base, charOff, EQUIP_RECORD_SIZE);
  clearRecordAt(u8, view.base + charOff, index);
}

function clearRecordAt(u8, at, index) {
  if (u8[at] === 0) {
    throw new Error(`refusing to clear equipment record ${index}: b0 is already 0 (EQ-12, MN-12)`);
  }
  u8.fill(0, at, at + EQUIP_RECORD_SIZE);
}

function checkEquipType(type) {
  if (!Number.isInteger(type) || type < 0 || type > 21) {
    throw new RangeError(
      `type must be an integer 0..21 in the hunter box; types 22..24 occur only in the palico box ` +
        `(EQ-03, MN-10), got ${String(type)}`
    );
  }
  if (type === 12) {
    throw new RangeError("type 12 is the reserved class-6 gap and has no weapon (ID-03, MN-10)");
  }
  return type;
}

function checkBead(id, socket) {
  if (!Number.isInteger(id)) {
    throw new RangeError(`beads[${socket}] must be an integer, got ${String(id)}`);
  }
  if (id === 0) return 0;
  if (id < BEAD_ID_MIN || id > BEAD_ID_MAX) {
    throw new RangeError(`beads[${socket}] must be 0 or ${BEAD_ID_MIN}..${BEAD_ID_MAX}, got ${id}`);
  }
  if (BEAD_UNUSED_IDS.indexOf(id) !== -1) {
    throw new RangeError(`beads[${socket}] = ${id} is an unused hole in the bead range; keep the socket empty (ID-02)`);
  }
  return id;
}

function equipmentProblems(r, u8, at) {
  const out = [];
  const type = r.type;
  if (u8[at] === 0) return out; // empty record: foreign bytes are legal (EQ-12)

  if (type === 0) {
    out.push(`type 0 with b0 = 0x${hex2(u8[at])}: level bits set on a type-0 record (EQ-12)`);
  } else if (type === 12) {
    out.push("type 12 is the reserved class-6 gap; no weapon exists for it (MN-10)");
  } else if (type >= 22 && type <= 24) {
    out.push(`type ${type} occurs only in the palico box (MN-10)`);
  } else if (type > 21) {
    out.push(`type ${type} is outside the hunter box domain 0..21 (EQ-03)`);
  }

  const beadNames = ["beads[0]", "beads[1]", "beads[2]"];
  for (let i = 0; i < 3; i++) {
    const b = r.beads[i];
    if (b === 0) continue;
    if (b < BEAD_ID_MIN || b > BEAD_ID_MAX) {
      out.push(`${beadNames[i]} = ${b} outside 0 or ${BEAD_ID_MIN}..${BEAD_ID_MAX} (ID-02)`);
    } else if (BEAD_UNUSED_IDS.indexOf(b) !== -1) {
      out.push(`${beadNames[i]} = ${b} is an unused hole in the bead range (ID-02)`);
    }
  }

  // Type 12 is the empty class-6 gap: it has no family table entry (MN-10).
  const weapon = type >= 7 && type <= 21 && type !== 12;
  const armor = type >= 1 && type <= 5;

  if (weapon) {
    const max = WEAPON_FAMILY_MAX[type];
    if (r.id < 1 || r.id > max) {
      out.push(`id = ${r.id} outside the family domain 1..${max} of type ${type} (EQ-05/ID-03)`);
    }
    if (r.lv01 > WEAPON_LEVEL_MAX) {
      out.push(`lv01 = ${r.lv01} outside 0..${WEAPON_LEVEL_MAX} for a weapon (EQ-04/ID-03)`);
    }
    if (r.lv02 !== 0) out.push(`lv02 = ${r.lv02} must be 0 for a weapon (EQ-04)`);
    if (r.glamour !== 0) out.push(`glamour = ${r.glamour} must be 0 for a weapon (EQ-06)`);
    if (type === 20) {
      insectProblems(r.insect, out);
    } else {
      const nz = countNonZero(u8, at + 12, at + EQUIP_RECORD_SIZE);
      if (nz !== 0) out.push(`${nz} non-zero byte(s) in +12..+35 of an ordinary weapon (EQ-10)`);
    }
  } else if (armor) {
    if (r.id < 1 || r.id > ARMOR_ID_MAX) {
      out.push(`id = ${r.id} outside the armor seq domain 1..${ARMOR_ID_MAX} (EQ-05/ID-04)`);
    }
    if (r.glamour > ARMOR_ID_MAX) {
      out.push(`glamour = ${r.glamour} outside 0..${ARMOR_ID_MAX} (EQ-06)`);
    }
    const nz = countNonZero(u8, at + 12, at + EQUIP_RECORD_SIZE);
    if (nz !== 0) out.push(`${nz} non-zero byte(s) in +12..+35 of an armor record (EQ-10)`);
  } else if (type === 6) {
    const c = r.charm;
    if (c.kind > CHARM_KIND_MAX) out.push(`charm kind ${c.kind} outside 0..${CHARM_KIND_MAX} (EQ-08/ID-05)`);
    if (c.sockets > CHARM_SOCKET_MAX) out.push(`charm sockets ${c.sockets} outside 0..${CHARM_SOCKET_MAX} (EQ-08)`);
    if (CHARM_TEMPLATE_VALUES.indexOf(c.template) === -1) {
      out.push(`charm byte +18 = ${c.template} is not one of 97..100 (EQ-08)`);
    }
    if (c.marker !== 1) out.push(`charm byte +19 = ${c.marker}, expected 1 (EQ-08)`);
    if (r.glamour !== 0) out.push(`glamour = ${r.glamour} must be 0 for a charm (EQ-06)`);
    const strayTail =
      (u8[at + 17] === 0 ? 0 : 1) + countNonZero(u8, at + 20, at + EQUIP_RECORD_SIZE);
    if (strayTail !== 0) out.push(`${strayTail} non-zero byte(s) in +17 / +20..+35 of a charm, expected 0 (EQ-08)`);
  }
  return out;
}

function insectProblems(s, out) {
  if (s.type < INSECT_TYPE_MIN || s.type > INSECT_TYPE_MAX) {
    out.push(`insect.type = ${s.type} outside ${INSECT_TYPE_MIN}..${INSECT_TYPE_MAX} (EQ-09)`);
  }
  if (s.level > INSECT_LEVEL_MAX) {
    out.push(`insect.level = ${s.level} outside 0..${INSECT_LEVEL_MAX} (EQ-09)`);
  }
  if (s.power > INSECT_STAT_MAX) out.push(`insect.power = ${s.power} outside 0..${INSECT_STAT_MAX} (EQ-09)`);
  if (s.weight > INSECT_STAT_MAX) out.push(`insect.weight = ${s.weight} outside 0..${INSECT_STAT_MAX} (EQ-09)`);
  if (s.speed > INSECT_STAT_MAX) out.push(`insect.speed = ${s.speed} outside 0..${INSECT_STAT_MAX} (EQ-09)`);
  if (s.fire > INSECT_ELEMENT_MAX) out.push(`insect.fire = ${s.fire} outside 0..${INSECT_ELEMENT_MAX} (EQ-09)`);
  if (s.water > INSECT_ELEMENT_MAX) out.push(`insect.water = ${s.water} outside 0..${INSECT_ELEMENT_MAX} (EQ-09)`);
  if (s.thunder > INSECT_ELEMENT_MAX) out.push(`insect.thunder = ${s.thunder} outside 0..${INSECT_ELEMENT_MAX} (EQ-09)`);
  if (s.ice > INSECT_ELEMENT_MAX) out.push(`insect.ice = ${s.ice} outside 0..${INSECT_ELEMENT_MAX} (EQ-09)`);
  if (s.dragon > INSECT_ELEMENT_MAX) out.push(`insect.dragon = ${s.dragon} outside 0..${INSECT_ELEMENT_MAX} (EQ-09)`);
}

// ---------------------------------------------------------------------------
// D. Palico equipment box (CATBOX-01..CATBOX-03), char_off 97326..133325
// ---------------------------------------------------------------------------

/**
 * Palico box base, char_off 97326 (CATBOX-01). The box is 1000 x 36 B = 36000 B and ends at
 * char_off 133326, where the equipment preset array starts.
 *
 * The box is read-only by rule: its semantics are contested three ways and the capacity is
 * unresolved 160 (engine table) vs 1000 (stored), so no reader and no writer is exported
 * (CATBOX-02/03, MN-06). The constants exist so callers can assert region boundaries only.
 */
export const PALICO_BOX_BASE = 97326;

/** Palico box end, char_off 133326 (CATBOX-01, INV-05). */
export const PALICO_BOX_END = 133326;

/** Palico box record count (CATBOX-01): 1000. Byte extent only, not an editor row count. */
export const PALICO_BOX_COUNT = 1000;

/** Palico record size (CATBOX-01): 36 B, same layout family as the hunter record. */
export const PALICO_RECORD_SIZE = 36;

// ---------------------------------------------------------------------------
// Internals: view, bounds, bit I/O, UTF-8 names
// ---------------------------------------------------------------------------

const utf8Encoder = new TextEncoder();
// ignoreBOM: keep a leading U+FEFF in the name instead of silently dropping it.
const utf8Decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

function viewBytes(view) {
  if (
    view === null ||
    typeof view !== "object" ||
    !(view.u8 instanceof Uint8Array) ||
    !Number.isInteger(view.base) ||
    view.base < 0
  ) {
    throw new TypeError("view must be { u8: Uint8Array, base: integer } from container.mjs hunterView()");
  }
  return view.u8;
}

function checkField(u8, base, charOff, length) {
  if (!Number.isInteger(charOff) || charOff < 0 || base + charOff + length > u8.length) {
    throw new RangeError(`char_off ${String(charOff)} (+${length} B) lies outside the loaded buffer`);
  }
}

function checkIndex(index, count, field) {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`${field} must be an integer 0..${count - 1}, got ${String(index)}`);
  }
}

function checkIntInRange(value, lo, hi, field) {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    throw new RangeError(`${field} must be an integer ${lo}..${hi}, got ${String(value)}`);
  }
  return value;
}

function readBitsLE(u8, at, byteCount) {
  let v = 0;
  for (let i = 0; i < byteCount; i++) {
    // Bytes past the end of the buffer read as 0 (the reference tool behaves the same);
    // checkField has already rejected a field that does not fit.
    v |= (u8[at + i] | 0) << (i * 8);
  }
  return v >>> 0;
}

function writeBitsLE(u8, at, byteCount, v) {
  for (let i = 0; i < byteCount; i++) u8[at + i] = (v >>> (i * 8)) & 0xff;
}

function sbyte(v) {
  return (v << 24) >> 24;
}

function hex2(v) {
  return v.toString(16).padStart(2, "0");
}

// Counts non-zero bytes in the absolute index range [from, to).
function countNonZero(u8, from, to) {
  let n = 0;
  for (let i = from; i < to; i++) if (u8[i] !== 0) n++;
  return n;
}

function decodeName(u8, at, width) {
  let n = 0;
  while (n < width && u8[at + n] !== 0) n++;
  return utf8Decoder.decode(u8.subarray(at, at + n));
}

/**
 * Longest prefix of `name` whose UTF-8 encoding fits `max` bytes, cut on a code-point
 * boundary only (INV-07). Surrogate pairs are kept whole; a lone surrogate is encoded as
 * U+FFFD by TextEncoder and counted as 3 B, so the size estimate stays exact.
 */
function fitUtf8(name, max) {
  let used = 0;
  let cut = 0;
  for (const ch of name) {
    const cp = ch.codePointAt(0);
    const n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (used + n > max) break;
    used += n;
    cut += ch.length;
  }
  return cut === name.length ? name : name.slice(0, cut);
}

// SPEC GAPS: items that spec 02 leaves open; each is handled conservatively here, never
// stubbed, and must be revisited when the spec closes the gap:
//
// 1. G-06 (layout discriminator): no byte-level test distinguishes legacy from V7. Every
//    item-box and item-preset function requires an explicit `layout`; no default, no probe.
// 2. G-01 (item preset body, 128 B): undecoded. `readItemPresetBody` returns a copy and no
//    body writer is exported (MN-07).
// 3. G-06/MN-02 (overlap region): slots >= 2300 exist only in the V7 layout; on legacy the
//    index check rejects them, so those bytes (preset records there) are never touched.
// 4. G-13 (id 2991): reads surface it as invalid (valid === false), writes reject it.
// 5. G-12 (count > 99): reads surface it as invalid, writes reject it.
// 6. G-15 (pouch row mapping): slots are read/written in file order; no UI row meaning is
//    assumed.
// 7. EQ-07 (bead socket cost): the bead -> socket-cost table and each item's socket count
//    are not in the spec, so only the bead id domain (0 or 2638..2888 minus 9 holes) is
//    checked. The caller must still verify that the beads fit the equipment's socket count.
// 8. EQ-06 (glamour part identity): the armor table that would prove "same part" is not in
//    the spec, so only the range 0..1286 is validated.
// 9. ID-04 (part-specific armor max): the type -> body-part order is not stated, so the
//    generic max 1286 is accepted for every armor type; no legal id is rejected, and head /
//    arms / waist / legs ids 1283..1286 (documented as nonexistent) are not screened out.
// 10. EQ-08 (charm byte +18): the kind -> constant table (one of 97..100) is not published,
//    so the writer requires `charm.template` from the caller and only validates the constant.
// 11. EQ-08 (charm level bits): the meaning of LV01/LV02 on a type 6 record is undocumented;
//    the writer requires both to be 0 and the reader does not flag them.
// 12. G-14 (equipped loadout): equipment records are edited in place only; no move, insert,
//    delete or swap is offered because the current loadout was never located.
