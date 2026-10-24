// SPDX-License-Identifier: GPL-3.0-or-later
// Spec 01: character header at char_off 0x0000..0x002A (name, playtime, gold, HR with
// its 0x00B1 second copy, gender). Every writer touches only the bytes of its field.

import { BLOCK_SIZE } from './container.mjs';

export const NAME_OFF = 0x0000;
export const NAME_FIELD_BYTES = 32;
export const PLAYTIME_OFF = 0x0020;
export const GOLD_OFF = 0x0024;
export const HR_OFF = 0x0028;
export const GENDER_OFF = 0x002A;

const utf8Decoder = new TextDecoder('utf-8');
const utf8Encoder = new TextEncoder();

// The plain maxima are the spec 01 valid ranges and are what the writers enforce.
// The *UiCap values are UNCONFIRMED placeholders for the in-game caps; they belong to
// the UI and must not be used to reject a value the spec calls structurally valid.
export const LIMITS = Object.freeze({
  nameFieldBytes: NAME_FIELD_BYTES,
  nameMaxBytes: 31, // UNCONFIRMED: 32 B field minus the mandatory NUL
  nameMaxChars: 16, // UNCONFIRMED: spec 01 safe limit (notes also mention 20 B / ~16 B)
  playtime: 0xFFFFFFFF,
  playtimeUiCap: 359999999, // UNCONFIRMED placeholder
  gold: 0xFFFFFFFF,
  goldUiCap: 99999999, // UNCONFIRMED placeholder
  hr: 0xFFFF,
  hrUiCap: 999, // UNCONFIRMED placeholder
});

function readU16LE(u8, off) {
  return u8[off] | (u8[off + 1] << 8);
}

function readU32LE(u8, off) {
  return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
}

function writeU16LE(u8, off, value) {
  u8[off] = value & 0xFF;
  u8[off + 1] = (value >>> 8) & 0xFF;
}

function writeU32LE(u8, off, value) {
  u8[off] = value & 0xFF;
  u8[off + 1] = (value >>> 8) & 0xFF;
  u8[off + 2] = (value >>> 16) & 0xFF;
  u8[off + 3] = (value >>> 24) & 0xFF;
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

// An unpaired surrogate would be replaced by U+FFFD by TextEncoder, silently changing
// the name, so it is rejected instead.
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

function countChars(s) {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) i += 1; // a validated surrogate pair is one character
    n += 1;
  }
  return n;
}

// Reads the NUL-terminated UTF-8 name from the 32 B field. A field without a NUL is
// decoded whole; invalid UTF-8 becomes U+FFFD instead of throwing.
export function readName(view) {
  const off = fieldAt(view, 'name', NAME_OFF, NAME_FIELD_BYTES);
  const end = off + NAME_FIELD_BYTES;
  const u8 = view.u8;
  let terminator = off;
  while (terminator < end && u8[terminator] !== 0) terminator += 1;
  return utf8Decoder.decode(u8.subarray(off, terminator));
}

// Clears all 32 B first, then writes the UTF-8 name, so at least one NUL always remains
// and no bytes of a previous name survive. An over-long name is rejected, never cut, so
// a multi-byte sequence is never split.
export function writeName(view, name) {
  const off = fieldAt(view, 'name', NAME_OFF, NAME_FIELD_BYTES);
  if (typeof name !== 'string') {
    throw new TypeError('name: expected a string');
  }
  if (name.includes('\u0000')) {
    throw new RangeError('name: must not contain U+0000');
  }
  if (!isWellFormed(name)) {
    throw new RangeError('name: contains an unpaired UTF-16 surrogate');
  }
  const chars = countChars(name);
  if (chars > LIMITS.nameMaxChars) {
    throw new RangeError(`name: ${chars} characters exceeds the safe limit of ${LIMITS.nameMaxChars}`);
  }
  const encoded = utf8Encoder.encode(name);
  if (encoded.length > LIMITS.nameMaxBytes) {
    throw new RangeError(`name: ${encoded.length} UTF-8 bytes exceeds the ${LIMITS.nameMaxBytes} B capacity`);
  }
  view.u8.fill(0, off, off + NAME_FIELD_BYTES);
  view.u8.set(encoded, off);
}

export function readPlaytime(view) {
  const off = fieldAt(view, 'playtime', PLAYTIME_OFF, 4);
  return readU32LE(view.u8, off);
}

// The mirror at char_off 140427 belongs to the member specs and is left untouched.
export function writePlaytime(view, seconds) {
  const off = fieldAt(view, 'playtime', PLAYTIME_OFF, 4);
  requireUint(seconds, LIMITS.playtime, 'playtime');
  writeU32LE(view.u8, off, seconds);
}

export function readGold(view) {
  const off = fieldAt(view, 'gold', GOLD_OFF, 4);
  return readU32LE(view.u8, off);
}

// The gold mirror at char_off 10255 belongs to the member specs and is left untouched.
export function writeGold(view, gold) {
  const off = fieldAt(view, 'gold', GOLD_OFF, 4);
  requireUint(gold, LIMITS.gold, 'gold');
  writeU32LE(view.u8, off, gold);
}

// Reads the 0x0028 copy. The 0x00B1 "second copy" in spec 01 is refuted by data: in all
// 14 private saves (HR 5 and 198) the u16 at 0x00B1 is 0, so it is not a mirror.
export function readHr(view) {
  const off = fieldAt(view, 'hr', HR_OFF, 2);
  return readU16LE(view.u8, off);
}

// Writes 0x0028 only; 0x00B1 lies in the opaque 224 B block and is preserved byte-exact.
export function writeHr(view, hr) {
  const off = fieldAt(view, 'hr', HR_OFF, 2);
  requireUint(hr, LIMITS.hr, 'hr');
  writeU16LE(view.u8, off, hr);
}

// Returns the raw byte, including the game-produced value 2. Other values are reported
// unchanged as well; none of them is normalised.
export function readGender(view) {
  const off = fieldAt(view, 'gender', GENDER_OFF, 1);
  return view.u8[off];
}

// Only 0 and 1 are writable. Value 2 is produced by the game and must be preserved by
// every other writer, so it is refused here instead of being copied back.
export function writeGender(view, gender) {
  const off = fieldAt(view, 'gender', GENDER_OFF, 1);
  if (gender !== 0 && gender !== 1) {
    throw new RangeError(
      `gender: ${gender} is not writable; only 0 or 1 may be written (2 is game-produced)`,
    );
  }
  view.u8[off] = gender;
}

// SPEC GAPS:
// - HR width conflict: spec 01 types HR as u16 LE at 0x0028 and its second copy as
//   u16 LE at 0x00B1..0x00B2, while the spec 03 field table describes both as u8.
//   Spec 01 is the header authority, so both copies are written as 16 bit values. A
//   value above 0xFF therefore writes the bytes 0x0029 and 0x00B2; the 0x00B1..0x00B2
//   exception of spec 01 covers the mirror, 0x0029 is part of the HR field itself.
// - Name width is UNCONFIRMED (spec 01 Gap 5): the field is 32 B, the safe write limit
//   is 16 characters and 31 B, and longer names are rejected instead of truncated.
// - Gender value 2 is game-produced (spec 01 Gap 8): readGender returns it, writeGender
//   refuses it. No UI may offer it as a choice.
// - The 632 B header is a write-only summary that the game rebuilds and discards on
//   load (spec 01 invariant 4), so header edits can be reverted by the next in-game
//   save. Nothing outside 0x0000..0x002A and the 0x00B1 mirror is written by this file.
// - Gold (char_off 10255) and playtime (char_off 140427) mirrors are documented editor
//   targets but are not implemented here (spec 01 Gap 7); they belong to the member
//   specs, so the two values written above can differ from those mirrors.
