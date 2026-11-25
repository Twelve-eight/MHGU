# Issue #1 (`Twelve-eight/MHGU#1`) 30-Page Item Box Sort Bug — Verified Root Cause & Reply (`2026-11-24`)

> **Issue**: `Twelve-eight/MHGU#1` — *"replacing the own item to mods item"* (`jessvin58-png`, `2026-11-23`).
> **Symptom**: 30-page item box works for storage/navigation, but clicking **Sort** replaces page 1 (hunting tools) with monster materials ("mods item"). Confirmed by reporter on **both** `patch/1.4.0.pchtxt` (V7) and `patch/experimental-v8/1.4.0.pchtxt` (V8).

---

## 1. Verified Root Cause (`[C]` from `main.140.flat.bin` + real vanilla save `system_CLEAN`)

1. **Both V7 and V8 decode legacy Item Set Presets (`charOff + 6095..7737`) as Item Box slots `2300..2991` (Pages 24–30)**:
   - Vanilla item box bitstream is `2300 * 19 bits = 5463 B` (`charOff + 0x278 .. +0x17CE`), immediately followed by **24 vanilla Item Set Presets** starting at `charOff + 6095` (`0x17CF`, `MHGU/editor/core/items.mjs:49-55`).
   - Both V7 and V8 patch the save deserializer (`0x19a668`, flat offset; `movw r5, #0xbb0`) to read **2992 slots** (`7106 B`, `charOff + 632 .. 7737`).
   - `0x3df400` (`readBits`) reads raw 12-bit `item_id` (`0..4095`) and 7-bit `count` (`0..127`) with **no upper-bound clamping**.
   - Directly verified on a real vanilla save (`MHGU-private/save-snapshots/20261022-clean-reference/system_CLEAN`, `slot[0] @0x18cc9c`):
     - Page 1 (`slots[0..5]`): `Book of Combos 1..5`, `Organizer Guide` (clean).
     - **Pages 24–30 (`slots[2300..2991]`)**: **`242` non-empty phantom slots** (`150` with `cnt > 0`), including **`37` entries with `id == 0, cnt > 0`**, **`20` out-of-bounds entries with `id >= 2991`** (e.g. `#2300: id=3712 x46`, `#2301: id=3965 x60`, `#2302: id=2991 x66`, `#2331: id=3072 x1`), plus random monster materials (`Daora Shell`, `Bloodbath Hunter I`, `Rainbow Ore`, etc.).
     - On a properly cleared/migrated V7 save (`system_V7_active`), `slots[2300..2991]` has `0` non-empty slots.

2. **Why pressing Sort immediately replaces Page 1 with phantom/monster items (identical in both V7 and V8)**:
   - Disassembly of `0x199be4` (`A -> B` rebuild/sort, flat offset; vaddr `0x199AE4`) and `0x199e6c` (`B -> A` copy-back, flat offset; vaddr `0x199D6C`) confirms:
     1. `0x199c74..0x199c80` zeroes a **`2991`-entry** local stack buffer `counts[2991]` (`0x2EBC` B at `sp + 8`).
     2. `0x199cb0..0x199cf4` loops `i = 0 .. 2991` (patched `0x199cec -> movw r0, #0xbb0`) and runs `counts[A[i].id] += A[i].count` **without bounds-checking `A[i].id < 2991` or `A[i].id != 0`**.
        - Any phantom slot with `id >= 2991` writes **past `counts[2991]` on the stack**.
        - Any phantom slot with `id == 0, cnt > 0` accumulates into `counts[0]`.
     3. `0x199d04..0x199d8c` writes stacks for every `counts[id] > 0` (`id = 0 .. 2990`) into `B[]`, and `0x199d98..0x199e48` bubble-sorts `B[]` by `getItemData(id)->sort_id` (`[r0, #0x10]`).
     4. All phantom entries from Pages 24–30 that have `sort_id == 0` or low `sort_id` (plus monster materials/unreleased IDs decoded from legacy preset bytes) sort **straight onto Page 1**, pushing/replacing the player's hunting tools!
     5. `0x199e6c` then copies `B[0..2991]` back into `A[0..2991]`.
   - Every known `itembox_198` (`0x198000..0x19C000`) & UI (`0x5B7000..0x5B9000`, `0x715000..0x720000`, `0x743000..0x745000`) `movw` site in `0x199be4` and `0x199e6c` is already patched in V8, confirming why V7 and V8 behave identically on an unconverted vanilla save.

---

## 2. GitHub Reply Posted to `Twelve-eight/MHGU#1`

See comment posted via `gh issue comment 1 -R Twelve-eight/MHGU`.

---

## 3. Follow-Up Diagnosis (`2026-11-25`, `[C]` from `0x5B8040` + `0x199AE4` disassembly)

Reporter (`jessvin58-png`, `2026-11-24T15:41:24Z`) reported two critical follow-up symptoms after reloading on Eden:

1. **Last 8 slots on Page 30 always reappear after Sort (NEW CONFIRMED BUG `[C]`)**:
   - Disassembly of `0x5B8040` (Item Box UI page render, flat `0x5B8140`) confirms the `10x10` grid (`0x553A74`) renders all `100` slots of Page 30 (`page=29`, `A[2900..2999]` = `obj + 0x2D6A .. 0x2EF9`) **without checking `slot < capacity (2992)`** (vanilla capacities `1000..2300` were always exact multiples of `100`).
   - Because `V7`/`V8` sets `N = 2992` (`0xBB0`), `A[2991]` ends at `obj + 0x2ED9`, and Sort buffer `B[0..7]` begins immediately at `obj + 0x2EDA .. 0x2EF9` — **the exact last 8 slots of Page 30 (`A[2992..2999]`) physically alias `B[0..7]`**.
   - Moving those 8 items only edits `B[0..7]`; pressing Sort runs `0x199AE4`, which refills `B[0..7]` with the first 8 sorted items, making them reappear in the last 8 boxes of Page 30 every time.
   - Clean fix options: use a multiple-of-100 capacity (`N = 3000` = 30 full pages, `7125 B` bitstream + `14 * 170 = 2380 B` presets fits with `38 B` spare before Item Pouch `charOff+10175`; or `N = 2900` = 29 full pages), or clamp Page 30 UI rendering to `92` slots.
2. **Why manually selling Pages 24–30 still left random items on Sort preview (before pressing Yes)**:
   - Our `2026-11-24T13:44:58Z` GitHub comment was truncated by shell escaping before mentioning `tools/migrate-save-v7.mjs`, so the reporter tested without migrating their save.
   - In `0x5B81F0..0x5B8214`, any slot with `getItemData(id) == NULL` or `itemData->field_0x08 == 0` is rendered **empty/invisible** in the normal UI (cannot be seen or sold), and dummy/"Program Data" items are unsellable; yet pressing Sort immediately calls `0x199AE4` to build the live preview in `B[]` (before clicking Yes), sorting any surviving phantom slots with `1 <= id < 2991` onto Page 1.
   - Verified on `system_CLEAN`: `93` of `242` phantom preset slots in `2300..2991` have `1 <= id < 2991` and pass the runtime OOB guard; `node tools/migrate-save-v7.mjs` is required to zero all `2300..2991` bits cleanly.
