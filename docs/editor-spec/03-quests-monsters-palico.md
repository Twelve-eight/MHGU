# 03 - Quests / Monsters / Palico Field SPEC

Status: draft for implementation. Every row is derived only from the clean-room source set:
`docs/save-layout/*`, `docs/mechanics/*`, `docs/data/json/monster-slot-map-137.json`, `DEVELOP.md`,
`HANDOFF.md`. `docs/analysis/`, `editor-src/` and `MHGU-private/` were not used.

## Scope

In scope, per hunter block (`char_off`, 0..1,177,759):

1. Persistent quest state: `cleared` / `seen` / `achieve` bitfields, bit addressing, the documented
   G★4 / Permit / EX / Arena / Hunter-Training bit ranges, and the double-write rule that keeps
   `cleared` a subset of `seen`.
2. Monster counters: 137-slot kill / capture / size arrays and the slot layout they share.
3. Palico: the 108 x 324 B records (84 + 24), their documented 7-block offsets, and the documented
   colour/residue fields.
4. Hunter arts: the three 24 B records at `0x2C13 / 0x2C2B / 0x2C43`.
5. Medals: the 132-bit A/B bitfield pair at `0x3157 / 0x316B`.
6. Supporting gate fields that the quest rules depend on (HR, the `obj+0x958` gate bit), with the
   documented limitations.

Out of scope: item box / pouch, equipment box, 128B / 288B / 68B / 164B / 3444B families,
member[13], the 950 KB tail, palico equipment box. They appear here only in `## MUST NOT write`.

### Coordinates

| Term | Definition | Source |
|---|---|---|
| `char_off` | Offset inside a hunter block; block length **1,177,760 B** | HANDOFF.md:41 |
| system file offset | `hunterAdds[i] + char_off`, `hunterAdds = [1625244, 2803040, 3980836]` (= `0x18CC9C`, `0x2AC560`, `0x3CBE24`) | HANDOFF.md:42-43 |
| container | `system` = 36 B header + 3 slot blocks; slot header u32 at `0x34/0x38/0x3C`; slot stride `0x11F8C4` | DEVELOP.md:58 |
| anchors | dirty sample slot0 base `0x18CC9C`; clean sample slot1 base `0x2AC560` | HANDOFF.md:43 |
| bit order | LSB-first inside each byte: `off = base + (bit >> 3)`, `mask = 1 << (bit & 7)` | quests.md:610 |
| checksum | **none** (no CRC/hash; any byte may be edited) | DEVELOP.md:160 |

Bit numbers in this spec are **record order i** (`sort_order` coordinates) unless a row says
"questId convention". The M1 hypothesis (`i ~ questId`) is accepted by the current ruling but is not
hardware-verified; see `## Gaps` G1. Consequences of that ambiguity are called out per range.

The slot-table / "which slot is live" flag semantics are **not** documented; see G16.

## Fields

### A. Quest state bitfields

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| `quest_cleared` | char_off `0x2C77` (11383), 256 B | 2048 bits, LSB-first; bit b -> `0x2C77 + (b>>3)`, mask `1<<(b&7)`; bit number = record order i (M1: i ~ questId) | bit 0..2047 addressable; only documented task bits (see B) may be set; bit 0 never written | Read-modify-write, set only (`|=`); NEVER memset / paint 0xFF. Every bit set here MUST also be set in `quest_seen` at the same bit. | member4-semantics.md:54; quests.md:605,610-614; CURRENT-RULING.md:6 |
| `quest_seen` | char_off `0x2D77` (11639), 256 B | 2048 bits, LSB-first; same encoding; = cleared + 256 B | bit 0..2047; superset of `quest_cleared` | Set bit (`|=`). `seen=1, cleared=0` is legal ("unlocked, not completed"). Never clear a bit that is set in `cleared`. | member4-semantics.md:55; quests.md:606,614-615 |
| `quest_achieve` | char_off `0x2E77` (11903), 256 B | 2048 bits, same encoding; third state | bit 0..2047; semantic undetermined | **Read-only in this spec.** Do not write until the third-state semantics are decided. | member4-semantics.md:77; quests.md:607,720 |
| `quest_gate_F1` | char_off `0x2F77` (12151), 8 B | 64-bit field; only bit 20 is documented (judge `0x525040` case11) | bit 20 only | **Read-only.** Setting it is not a substitute for the level legs of composite gates (G7). | member4-semantics.md:78; CURRENT-RULING.md:36 |
| `HR` (summary) | char_off `0x28` (u8) and second copy `char_off 0x0B1` (u8) | u8 each; observed 8 / 198 | 0..255 storage; HR gate thresholds in the wiki rules: 2, 8, 9, 35, 40, 45, 50, 60, 70, 80, 90, 95, 100 | **UNCONFIRMED for gameplay.** The 632 B header is written by the save code but discarded on load (`0x3e0db8` memcpy -> discard), so this is a slot-summary value. If written at all, write both copies identically. Do not use it to satisfy HR gates. | coverage-map.md:303,312,334; quests.md:687 |

### B. Documented quest bit ranges

These are ranges over the same `cleared` / `seen` bitfields (section A). They are **not** independent
storage; they are the task-id ranges the current ruling authorises. Set or clear whole tasks inside a
range; never fill a range blindly.

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| Village + Hub tasks | `quest_cleared`/`quest_seen` bits **1..944** | 944 bits = 375 Village + 569 Hub | 1..944; bit 0 reserved; bit 945 reserved | Per-task RMW only. NEVER set bit 0 or bit 945. Do not use the old editor partition table (VgLow 1-175 etc.) as authority; it is the editor's own split. | quests.md:624,643-648 |
| G★4 (Guild 14) | bits **782..862** and **939..943** | 81 + 5 = 86 bits, matching the 86 G★4 rows | exactly those two ranges | Set both ranges exactly; NEVER use the historical `786..865` (misses head, paints tail). RMW only. | CURRENT-RULING.md:88; contradictory-bits-verdict.md:12,24; quests.md:670 |
| Permit / deviant | bits **944..1171** | 228 bits = 12x16 + 6x6 | 944..1171 (sort_order coordinates) | Set individual Permit tasks or the whole documented range; NEVER extend to 1174 (old bug painted Arena's first 3 bits). | CURRENT-RULING.md:89; contradictory-bits-verdict.md:10,24; quests.md:625 |
| EX (deviant super) | bits **959 + 16k** (k=0..11) and **1141 + 6k** (k=0..5) | 18 bits | exactly 18 bit numbers | Set only these bits, and only together with the matching `seen` bits. They are a subset of Permit 944..1171. | CURRENT-RULING.md:90 |
| Arena / 斗技大会 | candidate A: bits **1288..1304**; candidate B: bits **1172..1188** | 17 bits either way | the two candidates disagree; see G2 | **Read-only until G1/G2 is settled.** Do not bulk-paint; the historical 1288..1304 write point is not proven to be in bit coordinates. | quests.md:628,653; CURRENT-RULING.md:42; contradictory-bits-verdict.md:11 |
| Hunter Training | bits **1174..1180** | 7 bits | 1174..1180 | Read-only unless a training feature is implemented. Clean `seen` hits these bits, but no write point was ever validated. | quests.md:626,667 |
| Unknown gap | bits **1181..1287** and **1305..2047** | 107 + 743 bits | no documented task identity | **NEVER write.** No task mapping exists. | quests.md:627; contradictory-bits-verdict.md:27 |
| Editor "cat quest" split | bits 866..943 | 78 bits | not documented | **Read-only / do not implement.** The "cat village / cat hub" labels have no source outside the editor. | quests.md:650-651,714 |

### C. Monster counters (137 slots)

The three arrays are contiguous and end exactly at member[3] = `0x62EE`:

`kill 0x5EA6..0x5FB7` (274 B) | `capture 0x5FB8..0x60C9` (274 B) | `size 0x60CA..0x62ED` (548 B) | `0x62EE` member[3].

The documented slot layout is shared by all three arrays and is authoritative in
`docs/data/json/monster-slot-map-137.json` (137 rows: slot / emid / cn / en):

| slots | count | kind |
|---|---|---|
| 0..70 | 71 | large monster |
| 71..111 | 41 | small monster |
| 112..134 | 23 | large monster |
| 135..136 | 2 | small monster (Great Thunderbug 4113, Conga 4118) |

94 large + 43 small = 137, **no reserved slots**. Source: coverage-map.md:228-243,248;
monster-slot-map-137.json:1-824.

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| `mon_kill[137]` | char_off `0x5EA6` (24230) .. `0x5FB7` | 274 B = 137 x u16 LE; no per-array header. The 4 B before `0x5EA6` (`0x5EA2..0x5EA5`) are the alignment delta, not part of the array | u16 storage; no per-slot clamp is documented. coverage-map reports 62 nonzero / max 45 for the 274 B kill block | RMW per u16 only; slot index is fixed by the 137-row map, never by array position in an older map. Do not shift or reorder. | coverage-map.md:80,221,242-243 |
| `mon_capture[137]` | char_off `0x5FB8` (24504) .. `0x60C9` | 274 B = 137 x u16 LE | u16 storage; coverage-map reports 26 nonzero / max 3 for the 274 B capture block | RMW per u16. **Slots 71..111, 135, 136 MUST remain 0** (small monsters cannot be captured; 0 violations under this layout) | coverage-map.md:81,222,242; CURRENT-RULING.md:84 |
| `mon_size[137]` | char_off `0x60CA` (24778) .. `0x62ED` | 548 B = 137 x `{u16 mini, u16 maxi}` LE; ends exactly at `0x62EE` | two u16 per slot; 0 = no recorded value (the null convention is not stated in the allowed sources) | RMW per 4 B record. **Slots 71..111, 135, 136 MUST stay 0/0.** Do not create a size record with `size > 0` while `kill == 0` (see G8) | coverage-map.md:82,242-243,263; CURRENT-RULING.md:84 |
| slot identity | n/a (reference table) | 137 rows, one per array element | 0..136 | Use `docs/data/json/monster-slot-map-137.json` directly; the older `monster-slot-map.json` + `monster-slot-map-small.json` pair is shifted after slot 70 and must not be used | coverage-map.md:247-248 |

### D. Palico records (108 x 324 B)

Record base (char_off): group A `0x23BB6 + 324*i` for i = 0..83; group B `0x2A606 + 324*j` for
j = 0..23 (record index 84..107). Stride 324. Reader vaddr `0x263368` (this is a code address, **not**
a `char_off`). The 25 B header at `0x23B9D..0x23BB5` is not part of any record and MUST NOT be edited
(coverage-map.md:192,388).

Both groups are real 324 B records with UTF-8 names. Only the 7-block partition is documented in the
allowed source set; the semantics inside the 224 B body and the 12 B block are **not** (G12), and
runtime processing of the 24-record group is also undocumented (G11).

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| `palico_records` | char_off `0x23BB6` + 324*i (i=0..83); char_off `0x2A606` + 324*j (j=0..23) | 108 records x 324 B | index 0..107 | Fixed-size array: never insert/delete/shift. Do not write the 25 B segment header. | coverage-map.md:355-358,388 |
| `block_name` | record +0x000 | 32 B | UTF-8 palico name (block label only; length limit not documented in the allowed sources) | Clear field, write UTF-8, NUL-pad, cap 32 B. Never spill into +0x020. | coverage-map.md:389 |
| `block_body` | record +0x020 | 224 B | block labelled "主体"; internal layout not in the allowed source set | Read-only until the internal layout is specified (G12). | coverage-map.md:389 |
| `block_id7` | record +0x100 | 14 B = 7 x u16; each entry resolved through `0x143894` | 7 u16 ids; the empty sentinel is not documented in the allowed sources | Preserve existing ids; do not invent ids. | coverage-map.md:389 |
| `block_10E` | record +0x10E | 12 B | undocumented | Read-only (G12). | coverage-map.md:389 |
| `block_colors` | record +0x11A | 36 B = 9 x `{R,G,B,0xFF}` | 9 four-byte colour groups; the 4th byte was `0xFF` in 27 samples | Preserve the 4th byte `0xFF` in every group. The 1st group = fur colour, the 4th group = clothing colour; other groups are undocumented. | coverage-map.md:390 |
| `block_13E` | record +0x13E | 4 B | undocumented | Read-only (G12). | coverage-map.md:389 |
| `block_142` | record +0x142 | 2 B | undocumented | Read-only (G12). | coverage-map.md:389 |
| `owner_name` | record +0x09C | 32 B owner-name field (implied by the 32 B write cap) | observed `idx("猎人A") = 156 = 0x9C` in three records | Clear field, write UTF-8, NUL-pad, cap 32 B. The old editor's master-name copy had no 32 B cap and overwrote the +188 introduction area. | coverage-map.md:392; DEVELOP.md:234 |
| `residue_058` | record +0x058 | 7 B | pointer-like residue (`0x066025E9`, `0x047759EA`) | **MUST NOT write.** This is not a DLC/distribution flag; the decimal `+88..+91 == 0` test is unreliable. | coverage-map.md:391 |

### E. Hunter arts (3 x 24 B)

The three records are read by the member#4 reader in file order; all three are persisted.
Encoding is documented only structurally: `24 B = 5 x 4 B entries + 4 B tail`. The meaning of the five
entries is **not** decided (see G13), so this spec does not authorise inventing values.

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| `arts_x1` | char_off `0x2C13` (11283) | 24 B = 5 x u32 + 4 B tail; engine name `mSupperArtsX1[0..4]` | no documented value space | Whole 24 B record only. If a reference save supplies a record, copy it atomically; otherwise read-only. | member4-semantics.md:51; skills-arts.md:516,520-522 |
| `arts_x2` | char_off `0x2C2B` (11307) | same | same | Same. NEVER repeat the historical partial write (only 46 of 72 B, leaving X2 tail 2 B and all of X3 untouched). | member4-semantics.md:52; skills-arts.md:517,523-525; DEVELOP.md:243 |
| `arts_x3` | char_off `0x2C43` (11331) | same | same | Same; this record had **no** write point in the old editor. | member4-semantics.md:53; skills-arts.md:518,523-525 |

### F. Medals (132-bit A/B pair)

`0x3157` and `0x316B` are the same 132-bit domain in two slots. In the clean sample both are byte-identical;
the writing rule is therefore a mirror write, not an OR of two different states.

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| `medal_A` | char_off `0x3157` (12631) | 20 B stored; **132 bits** in the first 17 B; byte +16 uses only the low 4 bits; bytes +17..+19 are zero | bit 0..131 | RMW with `|=`. When setting the final nibble use `|= 0x0F`; NEVER assign `15` (the old bug cleared the high 4 bits of the neighbouring field). NEVER paint `0xFF` over the 20 B. | member4-semantics.md:58; coverage-map.md:296; DEVELOP.md:240 |
| `medal_B` | char_off `0x316B` (12651) | same 20 B / 132-bit layout | bit 0..131 | Write the **same** 132 bits as `medal_A`, byte for byte. The clean sample has A == B; dirty A=132 bits / B=33 bits is a defect, not a legal state. | member4-semantics.md:79; DEVELOP.md:316 |

## Invariants

I1. **`cleared` is a subset of `seen` at every bit.** This is the one hard quest invariant. The dirty
sample's 122 contradictory bits had `cleared=1 / seen=0`; the judge `0x525040` feeds NPCs an impossible
state and dialogue deadlocks.
Repair is `seen |= cleared` only (reversible, adds at most "unlocked but not completed" tasks). Do not
run `cleared &= seen` without the player's actual task list.
Sources: quests.md:614; CURRENT-RULING.md:14,45; contradictory-bits-verdict.md:18.

I2. **`seen=1 / cleared=0` is legal; `cleared=1 / seen=0` is not.** "Unlock" writes `seen` only;
"complete" writes both. The two operations must not share one button silently.
Sources: quests.md:614-615,702.

I3. **Same bit number in both fields.** For any task bit b: `cleared` byte `0x2C77+(b>>3)`,
`seen` byte `0x2D77+(b>>3)`, mask `1<<(b&7)`. The +256 B delta is fixed.
Sources: quests.md:609-611; member4-semantics.md:54-55.

I4. **All bit writes are read-modify-write.** No range may be produced by memset, `0xFF` fill, or a
constant block copy. Every documented "brush" bug in this area came from absolute-offset painting.
Sources: CURRENT-RULING.md:17,93; contradictory-bits-verdict.md:5-13; DEVELOP.md:210.

I5. **Runtime quest bitmaps are not persisted state.** `obj+0x35F0` / `+0x35FC` / `+0x3608` are rebuilt
on load (`0x524e58`) and only ever gain bits; clearing a task in the file has no effect until the game
is restarted. Do not write these 12 B fields directly.
Sources: CURRENT-RULING.md:7,31; quests.md:612,616; member4-semantics.md:221-222.

I6. **Monster slot identity is the 137-row map, not array order in older maps.** All three arrays use
the same slot; slots 0..70 and 112..134 are large monsters, 71..111 and 135..136 are small.
Sources: coverage-map.md:234-243.

I7. **Small monsters cannot be captured and have no size record.** Capture `[71..111,135,136] == 0`
and size `[71..111,135,136] == {0,0}`. This invariant is what selected the current layout (0 violations,
vs 6 violations under the old layout).
Sources: coverage-map.md:242; CURRENT-RULING.md:84.

I8. **Size records are 4 B each.** 137 x `{u16 mini, u16 maxi}`, ending exactly at `0x62EE`. The
ordering of the two values and their null convention are not documented in the allowed sources (G10).
Source: coverage-map.md:82,243.

I9. **Medal A and B are a mirror pair.** After any medal write, the first 17 B of `0x3157` and `0x316B`
must be equal (and the last 3 B of each 20 B block remain zero).
Sources: member4-semantics.md:58,79; DEVELOP.md:316.

I10. **Hunter arts are 3 x 24 B and must be written atomically.** The historical editor wrote only
46 of 72 B, leaving X2's last 2 B and all of X3 stale; never repeat that. With no decided entry
semantics, the only safe operation is a whole-record copy from a reference save.
Sources: skills-arts.md:520-525; DEVELOP.md:243.

I11. **Palico records are fixed-size and not repacked.** 108 x 324 B; never insert, delete, or shift a
record. `+0x058..+0x05E` is pointer-like residue and is never a flag. Every colour group keeps alpha
`0xFF`.
Sources: coverage-map.md:355-358,390-391.

I12. **Write scope is bounded even though there is no checksum.** No CRC/hash exists, so the game will
accept any bytes; that does not make writes to undecoded ranges safe. Only the fields in this spec may
be changed by a quest/monster/palico feature.
Source: DEVELOP.md:160.

I13. **The 632 B header is a write-only summary.** The reader copies it to the stack and discards it, so
HR/name/gold there are display metadata, not the gameplay source of truth.
Source: coverage-map.md:303.

## MUST NOT write

1. **Never paint `0xFF` (or any constant) across an absolute range.** Confirmed historical damage:
   `0x4447..0x4598` received 182 `0xFF` bytes from the old "cat equipment unlock"; the 68 B family at
   `0x4447..0x45DF` was hit. The earlier claim that the 128 B family was painted was a coordinate
   artifact and is withdrawn.
   Sources: CURRENT-RULING.md:93; DEVELOP.md:210,290,311-317; member4-semantics.md:224-231.
2. **Never write `cleared` without `seen`.** The `SetBits` double-write (+256 B) is mandatory.
   Sources: DEVELOP.md:217,202; quests.md:701.
3. **Never write `quest_achieve` (`0x2E77`)** while its semantics are undecided.
   Source: quests.md:607,720.
4. **Never write the runtime bitmaps** `obj+0x35F0` / `+0x35FC` / `+0x3608`. Only the A and B slots
   persist (char_off `0x505F` and `0x506B`); `+0x35FC` has no file bytes, and `0x5077` is a different
   field (`obj+0x3614`). Never address these by questId.
   Source: member4-semantics.md:221-222; member4-file-layout.txt:115-117.
5. **Never write undecoded bit ranges:** bit 0, bit 945, 1181..1287, 1305..2047, and the disputed
   boundaries 1173 / 1174. Never write the "cat quest" 866..943 split.
   Sources: quests.md:624,627,650-651,657,733.
6. **Never write the Permit progress blocks** `0x31A7` (36 B A), `0x31CB` (36 B B), `0x31FF` (56 B A),
   `0x3237` (56 B B), `0x326F` (20 B A), `0x3283` (20 B B), nor the `mPermitLv[16]` candidate. Their
   semantics are undetermined; only a capacity coincidence (`36 B = 18 x u16`) exists.
   Sources: member4-semantics.md:39-48; quests.md:675-683,726.
7. **Never write the `cTrialArts` 288 B family** `0x3907..0x4447`. Only slices 1 and 3 persist; the
   middle slice (`mAirhike` + `mBushi`) is recomputed and has no file bytes, so a partial write creates
   an engine-impossible state. Whole-slot copy from a clean reference is the only fallback, and this
   spec does not authorise it.
   Sources: DEVELOP.md:312,320; quests.md:526-529; member4-semantics.md:59-61.
8. **Never write the 68 B id-bitmap family** `0x4447..0x45DF` (6 x 68 B; ids from class codes 50/51/52).
   The old editor polluted it and the semantic owner is still unknown.
   Sources: member4-semantics.md:80-85; DEVELOP.md:290.
9. **Never write the 164 B pair** `0x2FC7` / `0x306B`, the 16/20/32/40 B bitfield pairs, or the 3444 B
   block `0x50BA..0x5E2D`. They are undecoded raw bitfields; several have a non-persisted middle slot.
   Sources: member4-semantics.md:56-57,257-263,313; DEVELOP.md:311-313,320.
10. **Never write `0x2C6B4..0x335A8`** (member[13]). Its B2/B3/B5 blocks are variable content; the same
    hunter's two saves already differ by 9,570 B there.
    Source: DEVELOP.md:278.
11. **Never write the tail `0x3783A..0x11F8A0`.** It is passthrough cache / host residue, not read by
    the load path; modifying it has no support and can only add noise.
    Sources: coverage-map.md:271-278,405-406.
12. **Never write palico `+0x058..+0x05E`** (pointer-like residue) and never treat the record as padded
    there. Never use decimal `+88..+91` (record bytes `+0x058..+0x05B`) `== 0` as a DLC test.
    Source: coverage-map.md:391.
13. **Never write the cat equipment box** `0x17C2E..0x208AD` (1000 x 36 B capacity); the old
    `chkBoxCatArmsUnlock` range `17479..17816` (decimal) is disabled and must stay disabled.
    Sources: DEVELOP.md:290,496-500; coverage-map.md:118.
14. **Never move, insert, or delete records** in any fixed-size array in this spec (quest bits,
    137 counters, 108 palico records, 3 arts records, 2 medal slots).
15. **Never bulk-write decoded-but-unknown fields.** The rows marked "unknown / 未标注" in
    `member4-semantics.md` §4 (e.g. `0x2F87..0x2FC7`, `0x317F..0x319F`, `0x3297..0x32E7`,
    `0x5E2E..0x5EA2`) are individual fields, not padding. They are read-only for this feature; do not
    fill them to "unlock everything".

## Gaps

| # | item | status / risk | how to close | source |
|---|---|---|---|---|
| G1 | Quest bit coordinate: `bit = record order i` (sort_order) vs `bit = questId` (M1) | Current ruling accepts M1 for the repair formula, but never hardware-verified. A 2-bit shift changes Permit boundaries and all EX bits | Set questId 946 in a test save: sort_order maps it to `char_off 11501` bit 0, questId maps it to bit 2. Read back in-game | CURRENT-RULING.md:11,42; contradictory-bits-verdict.md:8 |
| G2 | Arena range: 1288..1304 (editor/questId convention) vs 1172..1188 (db sort_order; 3 contradiction bits fall at 1172..1174) | Unresolved. The sort_order candidate overlaps the documented Hunter Training bits 1174..1180, which is itself evidence that the two candidates are in different coordinate systems. This spec therefore leaves Arena read-only | Same M1/M2 probe plus a 17-entry Arena list read in-game | quests.md:628,653; CURRENT-RULING.md:42; contradictory-bits-verdict.md:11 |
| G3 | Permit boundary 944..1171 (sort_order) vs 946..1173 (questId); EX formulas `959+16k` / `1141+6k` and the deviant id formula `946+16k` are `[INFERENCE]` | The 6eb1e8a fix uses sort_order. If the true coordinate is questId, every Permit bit is shifted by +2 relative to this range | M1/M2 probe + compare a clean save's Permit `seen` bits with the player's deviant list | CURRENT-RULING.md:88-90; quests.md:625,633-634,716 |
| G4 | First Village bit: 0 reserved (editor starts at 1); whether the real first quest is bit 1 or 2 | Unconfirmed; a 1-bit offset shifts the whole 1..944 village/hub block | Diff a save after completing the first village quest | quests.md:733 |
| G5 | Bits 1181..1287 (107 ids) and the 20 challenge quests have no confirmed task ids | Guessed as Event/DLC; challenge range explicitly "not 1288..1304" | Extract `romfs questData_*` (blocked: base NCA missing) or a memory dump of the quest table | quests.md:627,718-719 |
| G6 | `achieve` (`0x2E77`) semantics | Unknown; clean popcount = 3. It may share the medal/title flow | Diff after a known title/achievement unlock | quests.md:607,720; member4-semantics.md:77; coverage-map.md:295 |
| G7 | Composite gate level legs: `case12 [mgr+0x3618]&0x7F000`, `case2/3/4/15` level bytes | Not reachable from the hunter block. Double-writing quest bits is necessary but insufficient, so "unlock" can still fail to open the NPC menu | Locate the other manager in the save; otherwise scope the feature to "pure quest bits" and warn the user | CURRENT-RULING.md:36-40; quests.md:692-697 |
| G8 | `size > 0` with `kill == 0` is not a hard invariant | Clean sample has 9 such slots under the authoritative alignment (33 kill&size / 9 size-only); dirty has 0 | More save samples; understand when the game writes a size record | coverage-map.md:258-263 |
| G9 | "Large monster 200 hunts" aggregation: which arrays and slots feed it | Unknown; kill sum is the leading candidate, capture inclusion unknown | Disassemble the quest predicate or use a controlled hunt-count save | quests.md:724 |
| G10 | Size/crown caps live in romfs (`*.emsizetbl` / `*.emyure`); 8 slot-map entries are unnamed (87 = Ahtal-Ka mech; 4196..4202 share `roEms100.cro`) | Per-monster caps, the mini/maxi ordering and their null convention cannot be validated offline | Base NCA / romfs extraction | HANDOFF.md:24,128; coverage-map.md:247 |
| G11 | Palico group B (records 84..107): runtime processing is undocumented | coverage-map confirms these are real records, not reserved; whether the game post-processes them at load is not stated in the allowed source set, so edits may not take effect | In-game edit of a group-B palico, or a new allowed-source analysis | coverage-map.md:358 |
| G12 | Palico sub-fields inside `+0x020/224` and `+0x10E/12` | The allowed sources give only the block sizes and the name/colour labels; exp/level/skill/equipment sub-offsets are not in the allowed set, so no field editor may be written from this spec | Publish a field-level palico layout in an allowed doc | coverage-map.md:389 |
| G13 | Hunter arts 24 B: five 4 B entries have no decided meaning | No art-id-to-value encoding. Whole-record copy is the only safe operation; partial writes are forbidden | Change one art in-game and diff the 24 B record | skills-arts.md:520-525,568; member4-semantics.md:51-53 |
| G14 | Medal 132 bits: no bit-to-medal name table | Only "132 bits, 6 strongholds" is documented | Unlock one medal, diff A/B | member4-semantics.md:58 |
| G15 | Permit progress blocks (`0x31A7/0x31CB` 36 B, `0x31FF/0x3237` 56 B, `0x326F/0x3283` 20 B) and `mPermitLv[16]` | Semantics undetermined; only capacity coincidences. Do not write | Complete one deviant level and diff these blocks | member4-semantics.md:39-48; quests.md:726 |
| G16 | `system` slot table / active-slot flags | Container header and slot headers (`0x34/0x38/0x3C`) documented, but which slot is live and the flag semantics are not. The old editor write `0x04+slot` polluted the header | Trace the save-slot reader or compare headers across three-slot saves | DEVELOP.md:58,220; HANDOFF.md:42-43 |
| G17 | Stale/conflicting published statements | `coverage-map.md:42-44` still carries the struck-through 93 large + 36 small + 8 reserved row; `CURRENT-RULING.md:83-85` says 94 large in slots 0..92 and 43 small in 93..128 plus 8 reserved (itself inconsistent with those slot counts). Both are superseded by `coverage-map.md:228-243` | Doc cleanup; no code needed | coverage-map.md:42-44,228-243; CURRENT-RULING.md:83-85 |
| G18 | member#4 layout-table 4 B drift between `0x3157` and `0x5EA2` | Not localized. Anchors used in this spec (quest bits, medals A/B, kill/capture/size, arts) are independently verified, but fields sourced only from `member4-file-layout.txt` after `0x3157` may need +4 | Use `obj+0x2DF8` family or `obj+0x446C` to bracket the drift | coverage-map.md:265,296-299 |
| G19 | Dirty `FF` in `0x2FC7` / `0x306B` / `0x311F` / `0x50BA` cannot be attributed to the current editor's 5 write points | A third writer exists; do not "clean" these ranges, and do not treat `dirty=FF` as proof of an editor bug | Provenance analysis of the dirty sample | DEVELOP.md:317; member4-semantics.md:237-240 |
| G20 | Commission (委托) completion bits not located | Without them, a task can be `cleared` while its commission chain stays blocked; next commission never appears | Diff after accepting/completing one commission | quests.md:542-543,728 |
| G21 | Village contribution (400 for arts LV2, 1500 for village 6 high-difficulty) | No save offset; `mVillagePoint` is in the quest-definition structure, not player state | Diff contribution changes; trace the unlock predicate | quests.md:725; skills-arts.md:583 |
| G22 | Gameplay HR / HRP source | The 632 B header is discarded on load; the real HR field is not located. Editing `char_off 0x28` cannot satisfy HR gates | Locate HR in a member object and verify by level-up diff | coverage-map.md:303,334; quests.md:687 |
| G23 | Palico equipment box: 160 declared name slots vs 1000 x 36 B save capacity | Adjacent to this spec, unresolved; do not expose a palico-equipment editor yet | Fill cat equipment in-game and dump the box | DEVELOP.md:494-500 |
