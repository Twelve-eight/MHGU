// SPDX-License-Identifier: GPL-3.0-or-later
// Spec 01: system container, slot offset table, slot blocks and the .hnt single-slot
// export. Slot block starts are derived from the file header, never hard-coded.

export const BLOCK_SIZE = 1177760; // 0x11F8A0, one hunter block / one .hnt file
export const SYSTEM_SIZE = 5159100; // 0x4EB8BC, fixed size of the system container
export const HNT_SIZE = BLOCK_SIZE; // .hnt is a bare slot block, no header, no footer
export const SLOT_COUNT = 3;

const SLOT_TABLE_OFF = 0x0034; // 3 x u32 LE, one per slot, payload relative
const SLOT_RECORD_PREFIX = 0x24; // bytes before char_off 0 inside a slot record

function readU32LE(u8, off) {
  return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
}

function assertBytes(u8, what) {
  if (!(u8 instanceof Uint8Array)) {
    throw new TypeError(`${what}: expected a Uint8Array`);
  }
}

// A table value addresses a slot record; the hunter block (char_off 0) starts 0x24 B
// later (spec 02 "Resolved by main session"). The value is only trusted after it is
// proven to address a complete block inside this file.
function blockOffFromRecord(u8, index, headerOff) {
  const recordOff = readU32LE(u8, headerOff);
  const blockOff = recordOff + SLOT_RECORD_PREFIX;
  if (recordOff === 0 || blockOff + BLOCK_SIZE > u8.length) {
    throw new RangeError(
      `system: slot ${index} header 0x${headerOff.toString(16)} holds ${recordOff}, ` +
        `which does not address a ${BLOCK_SIZE} B hunter block inside the ${u8.length} B file`,
    );
  }
  return blockOff;
}

// Returns { kind: 'system', bytes, slots: [{ index, headerOff, blockOff }] }.
// The bytes are not copied; writers mutate this image in place.
export function openSystem(u8) {
  assertBytes(u8, 'system');
  if (u8.length !== SYSTEM_SIZE) {
    throw new RangeError(`system: file is ${u8.length} B, expected ${SYSTEM_SIZE} B`);
  }
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const headerOff = SLOT_TABLE_OFF + 4 * i;
    slots.push({ index: i, headerOff, blockOff: blockOffFromRecord(u8, i, headerOff) });
  }
  return { kind: 'system', bytes: u8, slots };
}

// Returns { kind: 'hnt', bytes, slots: [{ index: 0, blockOff: 0 }] }.
export function openHnt(u8) {
  assertBytes(u8, 'hnt');
  if (u8.length !== HNT_SIZE) {
    throw new RangeError(`hnt: file is ${u8.length} B, expected ${HNT_SIZE} B`);
  }
  return { kind: 'hnt', bytes: u8, slots: [{ index: 0, blockOff: 0 }] };
}

// Field readers and writers address bytes as view.base + char_off, so the same code
// works for a system slot and for a .hnt.
export function hunterView(file, slotIndex) {
  if (
    file === null ||
    typeof file !== 'object' ||
    !Array.isArray(file.slots) ||
    !(file.bytes instanceof Uint8Array)
  ) {
    throw new TypeError('hunterView: expected the result of openSystem() or openHnt()');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= file.slots.length) {
    throw new RangeError(`hunterView: slot index ${slotIndex} is outside 0..${file.slots.length - 1}`);
  }
  const base = file.slots[slotIndex].blockOff;
  if (!Number.isInteger(base) || base < 0 || base + BLOCK_SIZE > file.bytes.length) {
    throw new RangeError(
      `hunterView: slot ${slotIndex} block at ${base} does not fit in the ${file.bytes.length} B buffer`,
    );
  }
  return { u8: file.bytes, base };
}

// SPEC GAPS:
// - Slot-used flags (system 0x0028 + slot) and slot state words (system 0x0050 + 4*slot)
//   are not read or written: the flag semantics are still open (spec 01 Gaps 2, spec 02
//   "Still open"). The only permitted flag change is setting 1 together with a complete
//   block, and writing it is left to a later feature that must also verify the state
//   word and the readable block. This module never writes any container byte.
// - The 36 B file prefix, the format stamp (0x0014) and the payload length (0x001C) are
//   not verified: spec 01 says the stamp must be neither verified nor recomputed, and
//   the only structural check the editor may make is the exact total file size.
// - The representation of an empty slot record is unconfirmed (spec 01 Gaps 3): a table
//   entry of 0 is rejected as corrupt instead of being replaced by a guessed origin,
//   because the fixed origins must not be hard-coded (spec 02 "Resolved by main
//   session").
// - Import/export of a .hnt into a system slot is not implemented here. Spec 01 (M10)
//   requires a byte-for-byte comparison of the two 1,177,760 B snapshots before any
//   operation combines them; this module only opens images and never copies bytes
//   between two files.
