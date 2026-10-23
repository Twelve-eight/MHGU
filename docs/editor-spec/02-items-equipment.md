# SPEC 02 — Item box, pouch, equipment box, set presets

Status: **draft for implementation** (Step 1 of the clean-room save editor). Written from repo-internal
research only; no third-party editor source was read (see §Scope, "Clean-room boundary").

Evidence tags: `[INFERENCE]` marks a statement derived here from cited bytes/structure but not directly
stated by a source; `UNCONFIRMED` marks a conservative placeholder used because no source supplies the
value. Unmarked rows are settled by the cited source (byte measurement, code constant or arithmetic
closure).

## Scope

Covered here (byte-level read/write contract for an editor):

1. item box slot bitstream (member[0] head) — slot field, slot count, legacy vs V7 layout;
2. item pouch (member[1]) — 32-slot 19-bit field;
3. hunter equipment box (member[3]) — 2000 x 36 B records, field layout of one record;
4. palico equipment box — base, record size and write prohibition only (semantics undecoded);
5. equipment (armor-set) presets — 40 x 136 B at char_off 133326, 42 B UTF-8 name field;
6. item set presets — 170 B records (legacy 24, V7 14), 42 B UTF-8 name field;
7. id domains used by the rows above (items, beads, weapons, armor, charms);
8. addressing: char_off inside a hunter block, and char_off -> `system` file offset.

Out of scope: quest bitmaps (`0x42C/0x52C/0x62C`), skills/arts, monster counters, member#4 fields,
palico 324 B records, the tail 950 KB passthrough cache, editor UI/CLI, the `.pchtxt` box-expansion patch.

Clean-room boundary (hard): every fact below comes from `docs/save-layout/*.md`, `DEVELOP.md`,
`HANDOFF.md`, `DEVLOG.md`, `docs/mechanics/*.md`, `docs/README.md`, `tools/box-slot-tool.mjs` or
`tools/build-v7*.mjs`. `editor-src/` and `MHGU-private/` were never opened. Where a repo doc says only
"the editor does X" without giving an offset or a byte rule, the item is recorded in `## Gaps` instead of
being guessed. `DEVLOG.md` is a chronological log rather than a ruling document: it is cited where it holds
the measurement itself (block start of the item presets) or where a later correction is only recorded there
(slot order, 3-byte write bug).

Coordinate legend used in every table:

- `char_off` — offset inside one hunter block (1,177,760 B = 0x11F8A0). `file_off = hunterAdds[slot] + char_off`.
- `file` — absolute offset in the `system` file (or inside a `.hnt`, which is a bare copy of one slot block).
- Decimal offsets are given first, the hex form in parentheses when a source uses hex.

## Fields

### A. Item box (member[0] head; char_off 632..10174)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| BOX-01 | box layout variant | char_off 632..10174 (whole box + preset area) | two layouts: **legacy** = 5463 B bitstream (2300 slots) + 4080 B item presets; **V7** = 7106 B bitstream (2992 slots) + 2437 B preset block | exactly one of the two layouts per file | detect the layout before any write; use one layout's numbers exclusively, never mix lengths from both | DEVELOP.md:63,148,159; DEVLOG.md:58; coverage-map.md:11,139 |
| BOX-02 | bitstream base | char_off 632 (0x278); `file` = hunterAdds[slot] + 632 | fixed field start | fixed | never relocate the base in a save edit; moving it is a game patch (`pchtxt`), not a save edit | DEVELOP.md:63,85,159; box-slot-tool.mjs:32 |
| BOX-03 | slot count | derived from layout | legacy 2300 (0x8FC); V7 2992 (0xBB0); byte length = ceil(N x 19 / 8) = 5463 / 7106 B | slot index 0..N-1 | reject any slot index >= N; a stray index lands in the next region | DEVELOP.md:60,159; box-slot-tool.mjs:32,52,54,73-78; coverage-map.md:11 |
| BOX-04 | slot field codec | bit address = char_off 632 x 8 + slot x 19 | 19 bits, **LSB-first**: `id` in bits 0..11, `count` in bits 12..18; window starts at byte floor(slot x 19 / 8), bit slot x 19 mod 8; spans 3 or 4 bytes | n/a | 32-bit little-endian read-modify-write at `632 + floor(slot x 19 / 8)`; mask `0x7FFFF << (slot x 19 mod 8)`; every bit outside the mask must be written back unchanged; a 3-byte implementation loses the high bits of some slots | box-slot-tool.mjs:3-4,32,90-101; DEVELOP.md:62,159; DEVLOG.md:110 |
| BOX-05 | slot order | slot index space | **FORWARD: file slot k = UI slot k** | k = 0..N-1 | index the stream directly; do not reverse slot order and do not byte-reverse the field; the earlier "reversed / 2300->0" claim is superseded and must not be implemented | DEVELOP.md:158; DEVLOG.md:103; box-slot-tool.mjs:3 (superseded: DEVLOG.md:76; DEVELOP.md:62) |
| BOX-06 | slot id | bits 0..11 of each slot window | 12-bit unsigned | item domain 0..2990 (`0` = empty); field capacity 0..4095 | write `0` only to mean empty; otherwise 1..2990; reject out-of-domain ids at the UI layer instead of letting the 12-bit mask wrap (the codec masks with 0xFFF silently) | DEVELOP.md:66; box-slot-tool.mjs:80,94,99 |
| BOX-07 | slot count | bits 12..18 of each slot window | 7-bit unsigned | field capacity 0..127; game-side bound **99** (serializer constant `mov r1,#0x63`); observed pouch counts <= 20 | `0` only together with `id == 0`; otherwise 1..99; never write 100..127 even though the field accepts them | DEVELOP.md:62; HANDOFF.md:88; box-slot-tool.mjs:81,95,99 |
| BOX-08 | empty slot | both halves of the slot window | id = 0, count = 0 | slot is "used" iff `id != 0 or count != 0` | to clear a slot set both halves to 0 in one 19-bit read-modify-write; never clear whole bytes | box-slot-tool.mjs:91-95,104,109 |
| BOX-09 | legacy-preset vs V7-bitstream overlap | char_off 6095..7737 (0x17CF..0x1E39) | in legacy this is the first 1643 B of the 4080 B item preset block; in V7 it is the bitstream tail (slots 2300..2991); char_off 7738..10174 (0x1E3A..0x27BE) is preset block in both layouts, but with 24 legacy records there vs 14 V7 records + 57 B dead zone | depends on BOX-01 | slots >= 2300 may be written only after the layout is confirmed V7; on a legacy file those bytes are preset records and are destroyed; char_off 6094 (bitstream byte index 5462) is shared by slots 2299 and 2300, so slot 2300 cannot be written without touching the last legacy byte of the bitstream | box-slot-tool.mjs:82-89; DEVELOP.md:148,216; DEVLOG.md:58 |
| BOX-10 | UI page count (derived, not stored) | none | UI pages = ceil(used / 100) | 1..30 | do not write anything for this; do not infer capacity or layout from the page count (2300 and 2992 both showed 23 pages on the same save) | DEVLOG.md:105 |

### B. Item pouch (member[1]; char_off 10175..10250)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| POUCH-01 | pouch field base and extent | char_off 10175 (0x27BF); `file` = hunterAdds[slot] + 10175 | 76 B = 32 slots x 19 bits (608 bits, byte-exact) | slot 0..31 | never write outside 10175..10250; the next field starts at 10251 | pouch-verified.md:3-4; coverage-map.md:12,140,206; HANDOFF.md:88 |
| POUCH-02 | pouch codec | bit address = 10175 x 8 + slot x 19 | identical 19-bit LSB-first codec as BOX-04 (id 12 bits + count 7 bits, window may span 3 or 4 bytes) | n/a | same 32-bit read-modify-write rule as BOX-04 with base 10175 and N = 32; reuse the item-box codec with a different base/count only | pouch-verified.md:4,11; box-slot-tool.mjs:33,50,90-101 |
| POUCH-03 | pouch id | bits 0..11 of the slot window | 12-bit unsigned | 0..2990 (`0` = empty); decoded samples 10, 88, 329, 330, ... | same as BOX-06 | pouch-verified.md:7-9; DEVELOP.md:66 |
| POUCH-04 | pouch count | bits 12..18 of the slot window | 7-bit unsigned | 0 (empty) or 1..99; decoded samples 1..20 | same as BOX-07 | pouch-verified.md:7-8; HANDOFF.md:88 |
| POUCH-05 | pouch empty slot | both halves | id = 0, count = 0 | 32 slots total; clean sample 21 occupied, dirty sample 24 occupied | clearing a pouch slot uses the same single 19-bit RMW; do not write a `0` byte run over the 76 B field (it would erase neighbouring slots' shared bytes) | pouch-verified.md:7-8; box-slot-tool.mjs:91-95 |
| POUCH-06 | pouch neighbours | char_off 10174 / 10251 | 10174 = last byte of the box preset area (both layouts); 10251 = Wycademy points u32 | n/a | this field is 76 B wide; the write helper must bound the field, not the containing block | coverage-map.md:11-13; DEVELOP.md:285 |

### C. Hunter equipment box (member[3]; char_off 25326..97325)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| EQ-01 | equipment box base and stride | char_off 25326 (0x62EE); `file` = hunterAdds[slot] + 25326 | 2000 records x 36 B = 72000 B, ends at 97326 (0x17C2E); `addr(i) = 25326 + 36 x i` | record index i = 0..1999 | address records by the 36 B file stride only (the in-memory stride is 44 B, a different coordinate); never write record 2000 | equipment.md:13,395,401-402; DEVELOP.md:69; coverage-map.md:28,105,144; HANDOFF.md:94 |
| EQ-02 | record size, file vs memory | record width | file 36 B/record; runtime object 44 B/record | fixed | a save edit uses 36 B; do not reuse the runtime 44 B stride (wrong coordinate system) | coverage-map.md:144; equipment.md:395 |
| EQ-03 | record byte +0 | record +0 | 1 B: `type = b0 & 0x1F`; `LV01` low 3 bits = `b0 >> 5` | hunter box: type 0..21 (0 = empty, 1-5 armor, 6 charm, 7-21 weapon with 12 reserved/empty); 22-24 only in the palico box | `b0 = ((LV01 & 7) << 5) OR type` (bitwise OR); never emit type 12 (no weapons exist for class 6) and never type 22-24 in this box | equipment.md:410,445-448,583 |
| EQ-04 | record byte +1 | record +1 | 1 B: `LV01` high 2 bits = `b1 & 0x03`; armor glamour level `LV02 = b1 >> 2` (6 bits) | `LV01` 0..31 (weapon: 0..14, i.e. display LV 1..15); `LV02` 0..63 | armor: `b1 = (LV02 << 2) OR (LV01 >> 3)`; weapon: `b1 = LV01 >> 3` (clear `LV02`); keep `LV01` within the family maximum minus 1 | equipment.md:411,584 |
| EQ-05 | record bytes +2..+3 | record +2 | u16 little-endian: weapon family index, armor part `seq`, or charm kind | weapon: per-class family max (GS 136 / SnS 128 / Hammer 131 / Lance 126 / HBG 108 / LBG 109 / LS 125 / SA 108 / GL 114 / Bow 107 / DB 125 / HH 111 / IG 82 / CB 80); armor: `seq` <= 1286 (head 1282 / body 1286 / arms 1282 / waist 1282 / legs 1282); charm: kind 1..10 | do not write an id outside the domain of the record's own `type`; ids are family/`seq` numbers, not Kiranico `_id`s | equipment.md:412-413,252-258,583-584 |
| EQ-06 | record bytes +4..+5 | record +4 | u16 little-endian glamour (transmog) armor id | armor: an id of the same part; weapons: 0 | write 0 for weapons; for armor, `fantasyId` must belong to the same `type`; only meaningful together with `LV02` | equipment.md:414-415,586 |
| EQ-07 | record bytes +6..+11 | record +6 | 3 x u16 little-endian decoration (bead) item ids, one per socket | 0 (empty socket) or 2638..2888; 9 ids inside that range are unused holes (2717, 2718, 2720, 2776, 2788, 2817, 2839, 2840, 2843) | sum of the beads' slot counts must not exceed the equipment's own socket count; the save does not store socket order or validation, so the editor must check both | equipment.md:416-418,290-298 |
| EQ-08 | charm record (+2, +12..+21) | record +2 and +12..+21 (type = 6) | `+2` kind; `+12`/`+13` skill-tree ids; `+14`/`+15` **sbyte** points; `+16` socket count; `+18` template constant; `+19` = 1 | kind 0..10; skill tree 0..255 (editor list to 179; ids <= 205 accepted per checklist); points -128..127, **negative legal**; sockets 0..3; `+18` in {97, 98, 99, 100} by kind; `+19` = 1 | write points as signed bytes (never clamp at 0); write `+18` from the kind table only, `+19` = 1, `+17` and `+20..+35` = 0; do not change `+18`/`+19` independently of the kind | equipment.md:311-321,323-338,588,636 |
| EQ-09 | insect glaive record (+12..+21, type = 20) | record +12..+21 | `+12` insect type; `+13` insect level; `+14`..`+21` eight ability bytes (power, weight, speed, fire, water, thunder, ice, dragon) | insect type 1..31; insect level 0..11 (display +1); power/weight/speed 0..19, elements 0..36 in UI terms | keep every ability inside the UI range; a non-glaive record must have `+12..+21` handled by its own branch, not by this one | equipment.md:419-430,589 |
| EQ-10 | record bytes +12..+35 (non-charm, non-glaive) | record +12..+35 | 24 B unused for armor and ordinary weapons | must be 0 for armor and non-glaive weapons | zero `+12..+35` when writing armor or a plain weapon; never copy stale bytes from a previous occupant of the record | equipment.md:429,573-576 |
| EQ-11 | record bytes +22..+35 | record +22..+35 | 14 B unparsed; for a glaive with `insectLV > 0` the editor writes a default pattern (`+27 = 3`, `+30 = 40`, `+31 = 20`, `+34 = 36`) whose meaning is undecoded | unknown for the glaive branch | for non-charm, non-glaive records write 0; for a glaive record change only the documented ability bytes (+12..+21) and preserve `+22..+35` byte-for-byte; never "clean" those bytes, they are not proven junk | equipment.md:429,510-512,640 |
| EQ-12 | empty record / whole-record clear | record +0 | empty record = type byte 0 (`b0 == 0`) | 2000 records | only clear a whole 36 B record when `b0 > 0`; a `b0 == 0` record must not be touched (it may carry foreign bytes the game ignores); never clear a record to "make room" | equipment.md:445,577 |

### D. Palico equipment box (member[3]; char_off 97326..133325) — read-only

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| CATBOX-01 | palico box base and extent | char_off 97326 (0x17C2E); `file` = hunterAdds[slot] + 97326 | 1000 records x 36 B = 36000 B, ends at 133326 (0x208CE) | record index 0..999 | must not be written at all (see CATBOX-02) | equipment.md:14,396,401-402; coverage-map.md:106 |
| CATBOX-02 | palico record semantics | record +0 | 36 B stride, structure looks like the hunter record; first three records are `16 00 02 00` / `17 00 01 00` / `18 00 01 00`; three competing readings (palico 36 B equipment record with type 22/23/24; `{u16 id, u16 count}` item list; decoration-bead area) | undecided | **do not write**; a reader must not expose it as editable until the semantics are settled by a real save with palico gear | equipment.md:536-545,633 |
| CATBOX-03 | palico capacity mismatch | record count | save area holds 1000 slots; the engine name table `cAcNyanterEquip` declares `mItemType/mItemNum` indices 0..159 (160) | 160 vs 1000 unresolved | use 1000 only as the byte extent; do not implement a 1000-row editor on the assumption that all rows are used | equipment.md:545,634 |

### E. Equipment (armor-set) presets (char_off 133326..138765)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| EQSET-01 | preset array | char_off 133326 (0x208CE); `file` = hunterAdds[slot] + 133326 | 40 records x 136 B = 5440 B, ends at 138766 (0x21E0E); `addr(s) = 133326 + 136 x s` | preset index s = 0..39 | never write record 40; the region start/end are fixed by three-way arithmetic closure (EQSET-05) | equipment.md:397,401; coverage-map.md:30,108; DEVELOP.md:71,519 |
| EQSET-02 | preset name | record +0..+41 | 42 B, UTF-8, NUL padded (sample record 0: `设置01` = 8 bytes, zero padding up to +42) | 0..42 bytes; a full 42 B name has **no** NUL terminator | clear all 42 B first, then copy whole UTF-8 code points while the byte count stays <= 42 (never split a multi-byte sequence, never truncate by characters); a reader must bound the name at 42 B and must not require a NUL | CURRENT-RULING.md:52-53; equipment.md:532-533; DEVELOP.md:221 |
| EQSET-03 | preset body | record +42..+135 | 94 B, undecoded (contains the 5 armor pieces + charm + beads per doc, but no field table exists) | unknown | **do not write**; any body edit requires mapping first | equipment.md:532,534,649 |
| EQSET-04 | name write breadth | all 40 records | editor precedent: every save rewrites all 40 names (clear 42 B, then write, truncate) | n/a | rewriting unchanged names is allowed only if the resulting bytes are identical; all bytes outside the 40 x 42 B name fields must remain byte-identical | equipment.md:533,578 |
| EQSET-05 | region closure checks | boundaries | 0x62EE + 0x11940 = 0x17C2E; 0x17C2E + 0x8CA0 = 0x208CE; 0x208CE + 0x1540 = 0x21E0E | n/a | run these three sums as an assertion after loading a file; a mismatch means the wrong layout/offset is in use | equipment.md:401; coverage-map.md:105-108 |

### F. Item set presets (170 B records)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| ITSET-01 | preset block, legacy layout | char_off 6095 (0x17CF); `file` = hunterAdds[slot] + 6095 | 24 records x 170 B = 4080 B (0xFF0), ends exactly at 10175 (pouch start) | record index 0..23 | use only when the file is the legacy 2300-slot layout; the block must end at 10175 | DEVLOG.md:38-49; DEVELOP.md:64,148; coverage-map.md:11 |
| ITSET-02 | preset block, V7 layout | char_off 7738 (0x1E3A); `file` = hunterAdds[slot] + 7738 | 14 records = 2380 B inside a 2437 B block; block ends at 10175; 57 B dead zone at 10118..10174 | record index 0..13 | use only on a V7 file; never write the 57 B dead zone as if it were a record; never grow the block back to 24 records | DEVELOP.md:148,159; DEVLOG.md:58; build-v7-final.mjs:14-15,44 |
| ITSET-03 | preset record layout | record +0..+169 | 170 B = **42 B name at +0** + **128 B body at +42** | n/a | keep the record width 170 B; name and body are written by separate rules (ITSET-04, ITSET-05) | CURRENT-RULING.md:52; DEVELOP.md:64; coverage-map.md:11 |
| ITSET-04 | preset name | record +0..+41 | 42 B, UTF-8, NUL padded; the same width as EQSET-02 | 0..42 bytes, no NUL when full | same algorithm as EQSET-02; structural check for V7: last record (index 13) starts at 9948 and its name ends at 9989 | CURRENT-RULING.md:52; coverage-map.md:11; DEVELOP.md:285 |
| ITSET-05 | preset body | record +42..+169 | 128 B; the legacy sample shows a u16 pair table starting exactly at record +42 (char_off 6137 = 0x17F9) | unknown; `[INFERENCE]` 128 B = 32 x `{u16 item id, u16 count}` pairs, UNCONFIRMED | **do not write**; only the name field may be edited until the pair layout is verified | DEVELOP.md:64 |
| ITSET-06 | preset count / navigation bound | record index | legacy 24, V7 14 | 0..(count-1) | bound every loop and every index by the layout's count; a hard-coded 23 index overran the array on V7 files (crash) | DEVELOP.md:148,228; DEVLOG.md:58-60 |
| ITSET-07 | runtime mirror (context only) | runtime `obj+0x6320` (V7 patch moves the preset base to `obj+0x6DC4`) | array element stride 0xAA = 170 B, count 24 (V7: 14) | n/a | an editor writes the save file only; do not model runtime offsets as file offsets | DEVLOG.md:69; DEVELOP.md:144-145 |

### G. ID domains (shared by the rows above)

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| ID-01 | item id domain | item box / pouch / item preset bodies | integer | **0..2990** = 2991 entries (`MAX = 0xBAE`); the serialization bound is 2991 (`0xBAF`); the real item list holds 2940 entries and its largest real id is 2976; the 12-bit field itself holds 0..4095 | accept only 0 (empty) or 1..2990; treat 2991 as a table bound, not as an item (see Gaps G-13); never rely on the 12-bit mask to bound the value | DEVELOP.md:66,67,62; pouch-verified.md:9 |
| ID-02 | decoration (bead) id domain | equipment record `+6..+11` | u16 | 0 (empty) or **2638..2888**; 242 real beads + 9 holes inside the range | never write an id outside 2638..2888; for the 9 holes keep the socket empty | equipment.md:290-293,298 |
| ID-03 | weapon identity | equipment record `type`/`id`/`LV01` | `type = class + 6`; `id` = family index; `LV01` = level - 1 | class 1..15 with **class 6 empty** (no type 12 record); family index up to 136 depending on class; level 0..14 | write only combinations that exist in the weapon table (class/family/level); `_id` and `familyId` are derived, never stored | equipment.md:16,132-136,583-584 |
| ID-04 | armor identity | equipment record `type` 1..5 and `id` | part = `type`; `id` = Kiranico `seq` (low 16 bits) | head 1..1282, body 1..1286, arms 1..1282, waist 1..1282, legs 1..1282; `_id = ((0x13 + type) << 16) OR seq` `[INFERENCE]` for the seq mapping | keep `id` inside the part's own `seq` range; a glamour id must come from the same part | equipment.md:252-259 |
| ID-05 | charm parameters | equipment record `type = 6` | kind, two skill-tree ids, two signed points, socket count, template constant | kind 0..10; skill tree 0..255 (UI list to 179, ids <= 205 accepted); points -128..127; sockets 0..3; `+18` in {97,98,99,100}; `+19` = 1 | see EQ-08; do not clamp negative points and do not derive `+18` from anything except the kind | equipment.md:311-321,323-338,588 |
| ID-06 | preset counts | EQSET-01 / ITSET-06 | record counts | equipment presets **40**; item presets **24** (legacy) or **14** (V7) | bound every array and every UI list by these counts and by the detected layout | equipment.md:397; DEVELOP.md:148,228 |

### H. Addressing and container

| id | name | location | size / encoding | valid range | write rule | source |
|---|---|---|---|---|---|---|
| ADDR-01 | hunter block and file mapping | whole slot | block length **1,177,760 B** (0x11F8A0); `file_off = hunterAdds[slot] + char_off`; `hunterAdds = [1625244, 2803040, 3980836]` = `[0x18CC9C, 0x2AC560, 0x3CBE24]` | `char_off` 0..1,177,759; slot 0..2 | compute the file offset once in the block reader; all rows in this spec are `char_off` and must not be used as file offsets directly | HANDOFF.md:41-42; docs/README.md:58; DEVELOP.md:57-59 |
| ADDR-02 | `.hnt` vs `system` | container | `.hnt` = bare copy of one slot block; `system` = small file header + 3 slot blocks; per-slot header u32 at `0x34/0x38/0x3C`; slot stride `0x11F8C4` (= 1,177,760 + 36) | 3 slots in `system` | for a `.hnt` use `char_off` directly; for `system` add `hunterAdds[slot]`; never mix the two coordinate systems | DEVELOP.md:57-59; equipment.md:391; HANDOFF.md:42-43 |
| ADDR-03 | reference anchors (samples) | `system` file | dirty sample slot0 base `0x18CC9C`; clean sample slot1 base `0x2AC560` | n/a | use these two as regression anchors: the clean sample must decode with 0 invariant violations, the dirty sample is known to contain editor damage | HANDOFF.md:43; pouch-verified.md:6 |
| ADDR-04 | checksum | whole save | **none** (no CRC/hash/MAC over the slot data) | n/a | do not add, compute or "refresh" any checksum field; a whole-slot write is legal as far as the format is concerned | DEVELOP.md:65,160; equipment.md:579 |
| ADDR-05 | slot flag bytes | `file 0x04 + slot_index` | one byte per slot, historically written by the editor as a "slot flag" | not documented | **do not write**; that offset is inside the file header and writing it dirties the header (documented editor bug). No field-level slot table is documented -> see Gaps G-07 | DEVELOP.md:220 |

## Invariants

- **INV-01 (bitstream tiling).** 8 slots occupy exactly 19 bytes (8 x 19 = 152 bits), so slot index 0, 8, 16, ... starts on a byte boundary and there is no padding inside the stream. Byte length = ceil(N x 19 / 8): legacy 2300 slots -> 5463 B (last byte half used), V7 2992 slots -> 7106 B (exact). Any write that shifts the stream by one bit invalidates every later slot. (`DEVELOP.md:63,159`; `coverage-map.md:11`; arithmetic.)
- **INV-02 (region closure).** 632 + 5463 = 6095 (0x17CF, legacy preset start); 632 + 7106 = 7738 (0x1E3A, V7 preset start); the preset block always ends at 10175 (0x27BF), which is the pouch start; the pouch ends at 10250 and 10251 is the next field. These sums are assertions to run on load. (`DEVELOP.md:63,148,159`; `coverage-map.md:11-13`; `pouch-verified.md:3`.)
- **INV-03 (empty vs used slot).** Empty = `id == 0` and `count == 0`. Used = `id != 0`; a used slot must have `count >= 1`. `id == 0` with `count > 0` is not a legal item slot. (`box-slot-tool.mjs:91-95,104,109`; `pouch-verified.md:7-8`.)
- **INV-04 (shared bytes).** A 19-bit window is not byte aligned, so two neighbouring slots always share at least one byte; a single-slot edit is therefore a read-modify-write of a 32-bit word with a 19-bit mask, and no byte-level "set slot" operation exists. A 3-byte implementation silently drops the top bits of some slots (observed with slots 2402 and 2901). (`box-slot-tool.mjs:4,90-101`; `DEVLOG.md:110`.)
- **INV-05 (equipment region closure).** 0x62EE + 0x11940 = 0x17C2E (equipment box -> palico box); 0x17C2E + 0x8CA0 = 0x208CE (palico box -> preset array); 0x208CE + 0x1540 = 0x21E0E (preset array end, member[4] start). (`equipment.md:401`; `coverage-map.md:105-108`; `HANDOFF.md:94-95`.)
- **INV-06 (signed charm points).** The two charm skill point bytes are `sbyte`; negative values are legal (a charm with attack -5 is valid). Any clamp at 0 is a data corruption. (`equipment.md:316-317`.)
- **INV-07 (42 B names).** Both preset families store the name in the first 42 bytes of the record as UTF-8, NUL padded, but a 42-byte name needs no NUL. Readers must bound at the field width (the historical crash was a 20-byte read without a NUL). Writers clear the whole field first, then copy whole code points only. (`CURRENT-RULING.md:52-53`; `equipment.md:532-533`; `DEVELOP.md:218,221`.)
- **INV-08 (LV split).** `LV01` is 5 bits split across record `+0` (low 3) and `+1` (high 2). Read it by recombining both bytes; when writing, recompute both bytes from the intended pair (`type`, `LV01`) so the halves can never desync. (`equipment.md:410-411`.)
- **INV-09 (id domain on read).** A clean save decodes with every box and pouch id inside the documented item domain and every count in a plausible 1..99 range (`pouch-verified.md:7-9`); the boundary value 2991 seen in the samples is handled per G-13. A file that violates the domain is either a legacy/V7 layout mismatch or editor damage: surface the raw value as invalid, never "repair" it by writing a guessed id.
- **INV-10 (write locality).** Because the save has no checksum (`DEVELOP.md:65,160`), the only safety property left is locality: after any edit, every byte outside the intended field must be identical to before. The implementation must diff before writing, not rewrite regions it did not intend to change.

## MUST NOT write

Rules marked "NEVER" are hard prohibitions for the editor; each is grounded in a documented failure of the earlier editor.

- **MN-01 — NEVER fill a range with `0xFF` (or any constant) as a bulk "unlock", "max" or "clear" operation.** Documented damage: the item form wrote a 2300-slot specification onto a V7 save, truncating the bitstream and wiping the preset block (`DEVELOP.md:216`); blanket writes hit arts, medals, quest permits and the 128 B record family (`CURRENT-RULING.md:64-69`); a "palico unlock" wrote `0xFF` across the palico record area, leaving 182 `0xFF` bytes in `0x4447..0x4598` where the clean save has zeros (`CURRENT-RULING.md:93`); `chkBoxCatArmsUnlock` painted the absolute range 17479..17816 across record boundaries (`DEVELOP.md:290`). All writes in this spec are single-field, value-checked writes.
- **MN-02 — NEVER write item-box slots >= 2300 on a file that is not confirmed V7.** On a legacy save those bytes are the item preset block; the tool already refuses this without an explicit layout confirmation (`box-slot-tool.mjs:82-89`; `DEVELOP.md:148`).
- **MN-03 — NEVER relocate the bitstream base, shrink the preset block, or change the slot count from the editor.** Those are game-patch operations (`DEVELOP.md:85,148`; the rejected "shrink the 0xFF0 block" plan is `DEVELOP.md:83`). A save editor edits within the layout the file already has.
- **MN-04 — NEVER write a whole byte, word or block for a single slot.** Only the 19-bit window may change (`box-slot-tool.mjs:99-100`; INV-04).
- **MN-05 — NEVER pass unvalidated values into the codec.** `id` must be 0 or 1..2990, `count` 0..99, slot index < N; the bit masks (`0xFFF`, `0x7F`) and the 19-bit shift would otherwise accept 4095 and 127 silently (`box-slot-tool.mjs:79-81,94-95`).
- **MN-06 — NEVER write the palico equipment box (`0x17C2E..0x208AD`).** Semantics are contested three ways and the capacity (160 declared vs 1000 stored) is unresolved (`equipment.md:536-545,633-634`).
- **MN-07 — NEVER write preset bodies or undecoded blocks.** Prohibited: equipment preset body 94 B (`equipment.md:649`); item preset body 128 B (`DEVELOP.md:64`); the 24 x 68 B set-item block at `0x21E0E` and the following bytes up to `0x22612` (`coverage-map.md:109`; `equipment.md:398`).
- **MN-08 — NEVER write the `24 x 170 B` block claimed at `0x2EFF..0x3FEF`.** It is documented as interleaved with the member#4 inner region, so its bytes are ambiguous (`coverage-map.md:102-103`).
- **MN-09 — NEVER write the "slot flag" byte at `file 0x04 + slot`.** It is inside the file header and was a documented bug (`DEVELOP.md:220`).
- **MN-10 — NEVER emit equipment type 12 or types 22..24 into the hunter box.** Class 6 has no weapons (type 12 is the reserved gap) and 22..24 only occur in the palico box (`equipment.md:448,583`).
- **MN-11 — NEVER use writes as an unlock mechanism for equipment.** The save has no per-equipment unlock bit; unlocks are driven by quest/permit state (`equipment.md:651`). Do not "unlock" by writing ids into empty records.
- **MN-12 — NEVER clear a record whose type byte is already 0, and never clear a 36 B record to free a slot.** Clearing is defined only for `b0 > 0`; empty records may hold foreign bytes the game ignores (`equipment.md:445,577`).
- **MN-13 — NEVER write the 57 B V7 dead zone (`10118..10174`) or the 33 B gap (`0x208AD..0x208CE`) as if it were a record.** They are padding between structures (`DEVLOG.md:58`; `coverage-map.md:107`).
- **MN-14 — NEVER write a preset name without clearing its 42 B field first.** Otherwise bytes of a previous, longer name survive (`equipment.md:533`; `CURRENT-RULING.md:53`).
- **MN-15 — NEVER write one side of a paired state.** The quest "cleared without seen" corruption (editor set `cleared` but not `seen`, producing an impossible state the game could not consume: `DEVELOP.md:217`) is the general lesson, and it applies here in three forms: a used slot must be written as `{id, count}` together (never id alone); a charm must be written with its `+18`/`+19` constants and `+16` socket count consistent with its kind (EQ-08); a preset name must be written as a cleared-then-filled 42 B field (MN-14). Never leave a half-written record for the game to interpret.

## Gaps

Each item states what is missing, what the conservative rule is until it is resolved, and whether it blocks
implementation. "BLOCKING" means the corresponding feature must not ship (or must ship read-only).

- **G-01 — item preset body (128 B) undecoded.** Only one observation exists: the legacy record 0 body starts with a u16 pair table exactly at record +42 (`DEVELOP.md:64`). The pair count, the meaning of the second u16 of each pair, the terminator and whether the pairs are `{item id, count}` are unknown; "32 x `{u16 id, u16 count}`" is `[INFERENCE]` from 128 / 4, **UNCONFIRMED**. Conservative rule: ITSET-05 read-only; only the name may be edited. **BLOCKING** for preset content editing.
- **G-02 — item preset block anchor conflict.** `DEVLOG.md:38-49` places the block at char_off 6095 (0x17CF) with 24 x 170 B; `DEVELOP.md:64` describes "+0x17CF: 8 B unknown, zero padding, u16 pair table at 0x17F9, records from 0x1879". The two descriptions reconcile arithmetically: 0x1879 = 0x17CF + 170 = record 1, 0x17F9 = 0x17CF + 42 = record 0 body, and the 8 "unknown" bytes at 0x17CF would then be the 8-byte UTF-8 name `设置01` measured for a preset record 0 in `CURRENT-RULING.md:52`; 6095 + 24 x 170 = 10175 also closes exactly. No byte dump records the exact extent of record 0, so the reconciliation is `[INFERENCE]`. Conservative rule: treat 6095 as the block start (arithmetic closure), keep bodies read-only. **BLOCKING** only for body editing.
- **G-03 — equipment preset body (94 B) undecoded.** The docs say it holds "5 armor pieces + charm + beads" but give no offsets (`equipment.md:534,649`). Conservative rule: EQSET-03 read-only. **BLOCKING** for set-content editing.
- **G-04 — the 24 x 68 B set-item block at 0x21E0E and the 432 B after it.** `coverage-map.md:109` reports "24 x 68 + unknown" for 0x21E0E..0x2C6B4; `equipment.md:398` reports a 2064 B unparsed block at 0x21E0E..0x22612 and `HANDOFF.md:94` reports 1632 B after the 5440 B preset array. 24 x 68 = 1632 and 1632 + 432 = 2064, so the readings are compatible `[INFERENCE]`, but no field map exists. Conservative rule: never write. Not blocking for the rows above.
- **G-05 — the `24 x 170 B` block claimed at 0x2EFF..0x3FEF.** `coverage-map.md:102` says a 24 x 170 B group-name block sits at 0x2EFF and is interleaved with the member#4 inner region, while `coverage-map.md:103` says member#4 occupies 0x2C0B..0x59AC and shares those bytes. The row is also internally inconsistent: 0x2EFF..0x3FEF is 4336 B but the size column says 4080 B, and 0x2EFF lies inside the member#4 inner range. No byte map resolves the interleaving. Conservative rule: MN-08, never write that range.
- **G-06 — V7 vs legacy layout detection is not documented at byte level.** A single-slot probe is ambiguous because an empty box reads as zeros under both layouts; the recorded approach is a heuristic first guess plus explicit user confirmation plus a periodic zero-block self-check (`DEVELOP.md:227`). No documented discriminator exists (e.g. no version byte or flag is cited anywhere in the allowed sources). Conservative rule: never write slots >= 2300 or presets until the user confirms the layout; make the choice a saved per-file setting rather than re-guessing silently. **BLOCKING** for any write to the overlap region (BOX-09) and for preset edits.
- **G-07 — slot table / slot flags not documented.** `DEVELOP.md:58` gives only "36 B header + 3 slot blocks; slot header u32 at 0x34/0x38/0x3C; slot stride 0x11F8C4". There is no field table for those u32s, no per-slot flag semantics, and no documented way to derive the three block starts from the file; the `hunterAdds` values in `HANDOFF.md:42` are measured constants, not a decoded table. Conservative rule: hard-code the three starts as constants, never write header bytes. **BLOCKING** for any slot-manager UI (create/delete/copy slot) or for deriving offsets from the file.
- **G-08 — slot 2 base hex disagrees across docs.** `HANDOFF.md:42` gives 3980836 (= 0x3CBE24); `member15.md:4` gives 0x3CBE84; `member4-residual.md:349` gives 0x3CBD44. Only slot 0 and slot 1 are needed by this spec's anchors. Conservative rule: read/write only slots 0 and 1 until the slot 2 constant is re-measured. Not blocking for a single-slot editor.
- **G-09 — palico equipment box semantics and capacity.** Three competing readings and 160 (declared) vs 1000 (stored) (`equipment.md:536-545,633-634`). Conservative rule: CATBOX read-only. **BLOCKING** for palico equipment editing.
- **G-10 — equipment preset range off-by-10 in older docs.** `DEVELOP.md:519` and `coverage-map.md:30` write the range as 0x208CE..0x21E03 (5430 B) while 40 x 136 = 5440 B and `equipment.md:397` closes at 0x21E0E. This spec uses 5440 B. Not blocking, but the two older rows should be corrected.
- **G-11 — legacy item-preset name width history.** `DEVLOG.md:39` records an older editor model of "20 B name + 150 B items"; the measured width is 42 B (`CURRENT-RULING.md:52`). Whether saves written by that older model carry stale bytes at name offsets +20..+41 is unknown. Conservative rule: display the name up to the first NUL inside 42 B and never write a name without clearing 42 B first (MN-14).
- **G-12 — behaviour of `count` > 99 unknown.** The field holds 0..127 and the serializer constant is 99 (`DEVELOP.md:62`); whether the game clamps, hides or corrupts such a slot is untested. Conservative rule: MN-05, never write above 99.
- **G-13 — item id 2991 is not classified.** `pouch-verified.md:9` reports decoded ids "1..2991", while the item domain is documented as 0..2990 (`DEVELOP.md:66`) with 2991 (0xBAF) used as a serialization bound. Conservative rule: 2991 is **UNCONFIRMED**; exclude it from writes and show it as invalid on read.
- **G-14 — current equipped loadout is not located.** `cAcPlayerEquip` member names exist but no char_off was found, and it is unknown whether `mWepNo/mEqNo` store equipment ids or box indices (`equipment.md:635`). Conservative rule: never move or delete equipment-box records (an index-based loadout would silently change worn gear). **BLOCKING** for sort/move/delete features on the equipment box (in-place edit only).
- **G-15 — pouch slot index to UI row mapping not documented.** The pouch codec, base and 32-slot count are settled, and the tool lists slots in file order (`box-slot-tool.mjs:33,50,103-104`), but no doc states which UI row slot k corresponds to. Conservative rule: present slots in file order and label them by index until a runtime check maps rows.
- **G-16 — preset name constraints unknown.** The only measured name is record 0 (`设置01`, `CURRENT-RULING.md:52`); there is no evidence about empty names, duplicate names, or maximum character count, only the 42-byte width. Conservative rule: allow any UTF-8 string that fits in 42 bytes, do not enforce uniqueness.

### Not gaps (recorded here to stop re-investigation)

- Slot order is settled as **forward** (`DEVELOP.md:158`; `DEVLOG.md:103`; `box-slot-tool.mjs:3`). The reversed claim (`DEVLOG.md:76`; `DEVELOP.md:62`) is superseded; the marker check at `DEVLOG.md:110-112` is the build's runtime verification step for the expansion patch, not an open format question.
- Record size of the equipment box is 36 B in the file and 44 B in memory (`coverage-map.md:144`); this is a coordinate distinction, not an open question.
- There is no checksum (`DEVELOP.md:65,160`); nothing needs to be recomputed after a write.

### Resolved by main session (2026-10-23, byte-level on 6 private `system` samples, all 5,159,100 B)
- **G-07 resolved (offsets only).** File header u32 LE at `0x34`, `0x38`, `0x3C` = start of slot records 0/1/2: `0x18CC78`, `0x2AC53C`, `0x3CBE00` in all six samples (clean, V6, V7, extra). Stride `0x2AC53C - 0x18CC78 = 0x11F8C4` = `DEVELOP.md:58`. Each slot record starts with 0x24 B of zeros, then the hunter block (char_off 0 = name, UTF-8) ⇒ hunter block start = `header_u32 + 0x24` = `0x18CC9C` / `0x2AC560` / `0x3CBE24`. Rule: derive starts from the header, do not hard-code; never write the header.
- **G-08 resolved.** Slot 2 hunter block = `0x3CBE24` (= `HANDOFF.md:42` 3980836); `0x3CBE84` and `0x3CBD44` are wrong.
- **Still open:** the "slot used" byte meaning. Header u32 at `0x28` reads `01 01 00 01` (LE bytes) in 3 samples and `01 01 00 00` in the other 3 while both slot names are present; its semantics are not slot-occupancy alone. Keep MN-09.
