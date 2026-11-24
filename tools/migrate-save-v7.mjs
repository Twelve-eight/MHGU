#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Losslessly migrate a vanilla MHGU (2300-slot, 24-preset) Switch `system` or `.hnt` save
// to the V7/V8 expanded item-box layout (2992-slot, 14-preset):
//   - Preserves all 2300 original item box slots (0..2299) bit-for-bit
//   - Zeroes the newly exposed slots 2300..2991 (Pages 24..30) without touching slot 2299's low 4 bits at charOff+6094
//   - Relocates legacy Item Set Presets 1..14 (charOff+6095..8474) to V7/V8 charOff+7738..10117 (14 * 170 B = 2380 B)
//   - Zeroes the 57-byte padding tail (charOff+10118..10174) before the Item Pouch (charOff+10175)
//
// Usage:
//   node tools/migrate-save-v7.mjs <input-system-or-hnt> --out <output-path> [--slot=0|1|2|all]
//   node tools/migrate-save-v7.mjs --selftest [vanilla-system-path]

import fs from "node:fs";
import path from "node:path";
import { openSystem, openHnt, hunterView, SYSTEM_SIZE, HNT_SIZE } from "../editor/core/container.mjs";
import {
  itemBoxInfo,
  readItemBoxSlot,
  writeItemBoxSlot,
  ITEM_PRESET_RECORD_SIZE,
} from "../editor/core/items.mjs";

const LEGACY = itemBoxInfo("legacy"); // slotCount=2300, presetStart=6095, presetCount=24
const V7 = itemBoxInfo("v7");         // slotCount=2992, presetStart=7738, presetCount=14
const POUCH_START = 10175;
const V7_PRESET_BYTES = V7.presetCount * ITEM_PRESET_RECORD_SIZE; // 14 * 170 = 2380
const V7_TAIL_START = V7.presetStart + V7_PRESET_BYTES;           // 7738 + 2380 = 10118

export function migrateHunterBlock(view) {
  const u8 = view.u8;
  const base = view.base;

  // Snapshot original 0..2299 item slots for post-verification
  const origSlots = [];
  for (let i = 0; i < LEGACY.slotCount; i++) origSlots.push(readItemBoxSlot(view, "legacy", i));

  // Count how many phantom entries existed in 2300..2991 under V7 interpretation before migration
  let phantomBefore = 0;
  let oobBefore = 0;
  let id0Before = 0;
  for (let i = LEGACY.slotCount; i < V7.slotCount; i++) {
    const s = readItemBoxSlot(view, "v7", i);
    if (s.id !== 0 || s.count !== 0) {
      phantomBefore++;
      if (s.count > 0 && s.id >= 2991) oobBefore++;
      if (s.count > 0 && s.id === 0) id0Before++;
    }
  }

  // Copy legacy presets 0..13 BEFORE zeroing slots 2300..2991 (regions overlap at 6095..7737)
  const presets14 = new Uint8Array(
    u8.subarray(base + LEGACY.presetStart, base + LEGACY.presetStart + V7_PRESET_BYTES),
  );

  // Zero slots 2300..2991 bit-exact (preserves low 4 bits of charOff+6094 belonging to slot 2299)
  for (let i = LEGACY.slotCount; i < V7.slotCount; i++) {
    writeItemBoxSlot(view, "v7", i, { id: 0, count: 0 });
  }

  // Write preserved presets 0..13 into V7/V8 preset area and clear the 57 B tail before pouch
  u8.set(presets14, base + V7.presetStart);
  u8.fill(0, base + V7_TAIL_START, base + POUCH_START);

  // Strict readback verification
  for (let i = 0; i < LEGACY.slotCount; i++) {
    const after = readItemBoxSlot(view, "v7", i);
    if (after.id !== origSlots[i].id || after.count !== origSlots[i].count) {
      throw new Error(`migration verification failed: slot ${i} changed (${origSlots[i].id}x${origSlots[i].count} -> ${after.id}x${after.count})`);
    }
  }
  for (let i = LEGACY.slotCount; i < V7.slotCount; i++) {
    const after = readItemBoxSlot(view, "v7", i);
    if (after.id !== 0 || after.count !== 0) {
      throw new Error(`migration verification failed: slot ${i} not zero (${after.id}x${after.count})`);
    }
  }
  for (let k = 0; k < V7_PRESET_BYTES; k++) {
    if (u8[base + V7.presetStart + k] !== presets14[k]) {
      throw new Error(`migration verification failed: preset byte ${k} mismatch`);
    }
  }

  return { phantomBefore, oobBefore, id0Before, presetsRelocated: V7.presetCount };
}

export function migrateSaveBuffer(inputBuf, slotSel = "all") {
  const out = new Uint8Array(inputBuf); // copy; never mutates caller buffer
  let container;
  if (out.length === SYSTEM_SIZE) container = openSystem(out);
  else if (out.length === HNT_SIZE) container = openHnt(out);
  else throw new RangeError(`unsupported save size ${out.length} B (expected system ${SYSTEM_SIZE} B or .hnt ${HNT_SIZE} B)`);

  const indices = slotSel === "all"
    ? container.slots.map((s) => s.index)
    : [Number(slotSel)];

  const reports = [];
  for (const idx of indices) {
    if (container.kind === "system" && out[0x28 + idx] === 0 && slotSel === "all") {
      reports.push({ slot: idx, skipped: true, reason: "slot-used flag 0" });
      continue;
    }
    const view = hunterView(container, idx);
    const r = migrateHunterBlock(view);
    reports.push({ slot: idx, skipped: false, ...r });
  }
  return { out, kind: container.kind, reports };
}

function runSelftest(samplePath) {
  // 1. Synthetic must-fail / must-pass control on a clean .hnt buffer
  const syn = new Uint8Array(HNT_SIZE);
  const synCont = openHnt(syn);
  const synView = hunterView(synCont, 0);
  // Put real items in slots 0, 1, and boundary slot 2299 (shares byte charOff+6094!)
  writeItemBoxSlot(synView, "legacy", 0, { id: 1, count: 99 });
  writeItemBoxSlot(synView, "legacy", 1, { id: 9, count: 50 });
  writeItemBoxSlot(synView, "legacy", 2299, { id: 1234, count: 77 });
  // Put synthetic vanilla presets 0..13 at charOff+6095 (non-zero bytes that decode as phantom slots 2300..2991)
  for (let p = 0; p < 14; p++) {
    const off = LEGACY.presetStart + p * ITEM_PRESET_RECORD_SIZE;
    const tag = Buffer.from(`Set${p + 1}`);
    syn.set(tag, off);
    syn.fill(0xA5 ^ p, off + 42, off + ITEM_PRESET_RECORD_SIZE);
  }
  // Put sentinel bytes in Item Pouch (charOff+10175) and Equipment Box (charOff+25326)
  syn[POUCH_START] = 0x5A;
  syn[25326] = 0xC3;

  const { out, reports } = migrateSaveBuffer(syn, "all");
  if (reports[0].phantomBefore === 0) throw new Error("selftest must-fail violated: expected phantom slots before migration");
  if (out[POUCH_START] !== 0x5A || out[25326] !== 0xC3) throw new Error("selftest failed: bytes outside item-box/preset region changed");
  const outView = hunterView(openHnt(out), 0);
  const b2299 = readItemBoxSlot(outView, "v7", 2299);
  if (b2299.id !== 1234 || b2299.count !== 77) throw new Error(`selftest failed: boundary slot 2299 corrupted (${b2299.id}x${b2299.count})`);
  console.log(`SELFTEST synthetic PASS: phantomBefore=${reports[0].phantomBefore} -> 0, slot2299=${b2299.id}x${b2299.count}, presets14 preserved, outside regions untouched`);

  // 2. Optional real vanilla save check (read-only)
  if (samplePath && fs.existsSync(samplePath)) {
    const raw = fs.readFileSync(samplePath);
    const res = migrateSaveBuffer(raw, "all");
    for (const r of res.reports) {
      if (r.skipped) continue;
      console.log(`SELFTEST real[${r.slot}] PASS: phantomBefore=${r.phantomBefore} (oob=${r.oobBefore}, id0=${r.id0Before}) -> 0, presetsRelocated=${r.presetsRelocated}`);
    }
  }
}

const args = process.argv.slice(2);
if (args.includes("--selftest")) {
  const sample = args.find((a) => !a.startsWith("--"));
  runSelftest(sample);
  process.exit(0);
}

const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
const slotArg = args.find((a) => a.startsWith("--slot="));
const slotSel = slotArg ? slotArg.slice("--slot=".length) : "all";
const force = args.includes("--force");
const inPath = args.find((a, i) => !a.startsWith("--") && i !== outIdx + 1);

if (!inPath || !outPath) {
  console.error("usage: node tools/migrate-save-v7.mjs <input-system-or-hnt> --out <output-path> [--slot=0|1|2|all] [--force]");
  console.error("       node tools/migrate-save-v7.mjs --selftest [vanilla-system-path]");
  process.exit(2);
}
if (path.resolve(inPath) === path.resolve(outPath) && !force) {
  console.error("refusing to overwrite input in-place without --force; pass a different --out path and keep a backup");
  process.exit(2);
}

const inputBuf = fs.readFileSync(inPath);
const { out, kind, reports } = migrateSaveBuffer(inputBuf, slotSel);
fs.writeFileSync(outPath, out);
console.log(`MIGRATED ${kind} (${out.length} B) -> ${outPath}`);
for (const r of reports) {
  if (r.skipped) console.log(`  slot ${r.slot}: skipped (${r.reason})`);
  else console.log(`  slot ${r.slot}: cleared ${r.phantomBefore} phantom entries in pages 24..30 (oob=${r.oobBefore}, id0=${r.id0Before}); relocated ${r.presetsRelocated} item presets`);
}
