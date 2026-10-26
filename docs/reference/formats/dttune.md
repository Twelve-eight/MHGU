# `*_dttune` (rEnemyDtTune) — format spec

> **Per-monster offsets — read this first.** Only base HP @0x38 is a fixed offset. The meat table and the status block live at variable offsets (meat seen at 0x8C/0x8E/0x8F; status at 0x1F4/0x22F/0x351/0x35C/0x3A1/0x4E8 or absent) with variable record stride, a 12-B non-record slot before Blast, and bases that may sit on an odd byte offset. A monster's meat/status may be cited [C] only if the table was located in *that* file and its values cross-check against `mhgu.db`. Per-monster offsets are published in `docs/data/json/monster-dttune-index.json` (DtTuneAll).

Source files: `romfs/nativeNX/arc/enemy/emNNN_00.arc` → entry `enemy\dt_tune\emNNN_00_dttune`, type hash `0x48e8ac29`, zlib-compressed inside the arc. Extract with `node tools/mhgu/arc.mjs extract <arc> <outdir> "_dttune$"`; decode with `node tools/mhgu/dttune.mjs <file>`.

Resource class: `rEnemyDtTune`, tag `dtt`, class size `0x128`, registered in fn `0x564bc` (docs/analysis/monsters/mon-class-map.md §5 line 126, §5bis line 195, name pool §7 line 364). Unlike `rEnemyDtBase` (26 named property readers), fn `0x564bc` registers only the tag and class name — no member names are known from the registration framework, so field names below come from byte cross-checks against `mhgu.db` unless marked otherwise.

Evidence tags: [C] = verified against bytes + db; [B] = inferred from data shape; [U] = unknown.

Evidence base: 8 monsters byte-checked so far. em001 Rathian 雌火龙, em002 Rathalos 火龙, em013 Fatalis 黑龙 (this spec's author; zh from `chS/arc/resident_chS.arc :: monsterName_chS` — the primary name source — at slot indices #0/#3/#117) and em011 Kirin / em024 Kushala Daora / em027 Teostra / em043 Deviljho / em057 Zinogre (independent review `rev-dttune.md`, 5/5 HP, 295/297 meat values, 108/108 status values db-exact). Decoder re-run over all 8 with `--db`: HP 8/8, meat tables located & value-matched 8/8 (em024/em057 have one impact outlier each), status blocks located & value-matched 6/6 where db rows exist (em013 correctly rejected as false positive).

## Header [C]

| Offset | Type | Meaning |
|---|---|---|
| 0x00 | char[4] | `DTT\0` magic [C] |
| 0x04 | u8[4] | `6c a0 33 01` in all 8 sampled files — unknown [U] |
| 0x08 | u8[] | small header, layout monster-dependent [U] |
| 0x38 | u32 | **monster base HP** — byte-equal `mhgu.db monsters.base_hp` on 8/8 monsters (fixed offset) [C] |
| 0x3C | u16 + u16 | durability of the body part 胴 (em001 140, em002 150) + an unknown u16 (non-zero in 16/138 files) — head of the part-durability block below [C, 138 files] |

File sizes vary per monster (1018..1966 B sampled); the runtime class is only 0x128 B, so the file is parsed by dedicated loader code, not mapped 1:1 onto the class [B].

## Part durability block (fixed 80 B at 0x3C) [C 138 files, 2026-10-26]

GU uses one durability value per part for both flinch and break (`MHGU-private/.../mhxx-wiki/text/1862.txt:174`). Sources: `.tmp/reports-rds/gu-break-values.md` and its review `.tmp/reports-rds/rev-gu-break-values.md` (loader `0x57740` reads exactly 80 B after the 4-byte HP).

- 0x3C: `{u16 胴 durability, u16 unknown}`.
- From 0x40: 10-byte entries `{u16 prefix, u16 marker, u16 kind [U], u16 durability, u16 tailFlag}`. Prefix/marker is usually `0, 0xFFFF` but deviates in 44/138 files (`0xFF7E`, `0x0AFF`, `0x0000`). The block size cuts an 8th entry at 0x86.
- A sever entry has prefix `0xFF01` and is an ordinary 10-byte entry whose own durability is the sever value. In 49/49 files it immediately follows the entry with tailFlag = 1; elsewhere it can sit at any entry index (em027 e2, em032 e3, em043/em080 e6). Monsters without a severable tail have none (em011 Kirin).
- em001 Rathian: 胴 140, then 100, 100, 180, 180, 90, 190, 150 (kinds 2,4,4,3,3,1,1), sever 230. em002 Rathalos: 胴 150, then 100, 100, 190, 190, 90, 230, 120, sever 320. em007 Diablos: 350 + 150, 150, 250, 250, 150, 250, 250, sever 500. All match the wiki multisets. Entry → part order [B] (翼L, 翼R, 脚L, 脚R, 首, 头, 尾 for em001).

## Meat table — locate rule [C per monster]

8 rows × 10 B starting at 0x8C or later (the part-durability block occupies 0x3C..0x8B in every
arc, so the grid cannot start earlier). Each row = 9 × u8 + 1 pad byte:

```
cut, impact, shot, fire, water, ice, thunder, dragon, ko, pad
```

**Column order note [Main/RevHitzones]:** within the element block it is fire, water, ice, thunder (not fire/water/thunder/ice) — the order above matches `mhgu.db monster_damage` columns (fire, water, ice, thunder, then dragon, ko). Earlier drafts swapped ice/thunder; wiki pages citing dttune must use the db order shown here.

Value ranges [C, byte-verified em003 Chameleos]: element columns 0..100, but the **KO column can exceed 100** (Chameleos head ko=150) and pads are 0/100/200/255 — a "values ≤ 100" assumption is wrong for this file family.

**Conditional layers [C, byte-verified em003/em081/em019/em011]**: after the base 8×10 group there can be more groups of 10-B rows at `meatStart + 80·k` (em003 layer 2 @0xDC = base 0x8C + 0x50, re-read 2026-10-26 — the old text said 0x10C, which is row 5 of that same group and not on the 80-B grid; em081 layer 2 @0xDE; em019 table is 15 rows so layer 1 is truncated at 0x124 with the pre-float record `00 00 32 3c 28 14 0a 23 19 00`). A layer is **per-part conditional overrides**, not a whole-body state snapshot: em019 layer 1 = 6 Guarding rows + 1 Break row; em020 layer 1 carries only Skull-Shell/Softshell slots. Empty slots take three forms: all-`0x64`, all-zero, or copy-of-base. `db` conditional rows (`Head (Enraged)` etc.) correspond to these layers — Kirin layer 1 row 0 `40/40/35/5/5/5/0/5/100` = db `Head (Enraged)` exact. Which byte/timer selects a layer at runtime is unknown [U].

**How to locate the table in a new file** (decoder rule, 138/138 extracted arcs):
1. Scan byte offsets 0x8C..0x94 and take the first 10-byte window where all 8 rows satisfy: cut/impact/shot ≤ 200, fire/water/ice/thunder/dragon ≤ 100, ko ≤ 200, and row 0's cut ≥ 1. Do **not** start at 0x8A: in 10 arcs (em008_00, em009_00, em010_00, em012_00, em017_00, em020_00, em030_00, em066_00, em066_04, em069_00) the 0x8A window is a 2-byte-shifted grid that also satisfies a value gate and steals the hit (2026-10-26 fix in `MHGU/tools/mhgu/dttune.mjs`). The `02 00`/`04 00`/`00 00` u16 at 0x8A is the *kind* field of the truncated 8th durability entry, not grid data.
2. Confirm row 0 against db `monster_damage` Head row; filler rows (all-100) follow the real rows. em012_00 (Lao-Shan Lung) proof: the 0x8A window reads 2/0/28/21/30/20/5/5/15 and matches 0 db rows, while 0x8C reads 28/21/30/20/5/5/15/20 = db row 136 (Head) and rows 1..7 reproduce db 137/138/139/140/141 + 142, plus one extra row 32/37/25/20/5/5/15/20 that has no db counterpart. The physical cap must stay at 200, not 255: 0xFF is the durability-marker byte that sits right in front of the grid (ems099_00 @0x8C `7e ff`, em045_00 @0x8C `01 00 ff`), and a ≤ 255 cap puts 64 large arcs on a shifted 0x8C window.
3. Walk further groups at +80 B; emit every group (`meatLayers` in decoder JSON); rows are tagged `_form`: `empty-100` / `empty-zero` / `copy-of-base` / `values`. A group that is only empty slots is the fill region, not a layer (em022_00/em088_00 all-0x64 from base+0x50 to the float block, em012_00 all-zero from 0xDC); a real layer may be mostly empty with one overridden part (em012_00 row 3, em020_00 rows 2 and 6, em087_00 row 6).

Observed base starts (138 arcs of `.tmp/mhgu/emall/enemy/dt_tune/`): 0x8C ×70, 0x8E ×49, 0x8F ×18, 0x90 ×1 — em011 0x8C, em001/em002/em043/em013 0x8E, em024/em027/em057 0x8F, em003 0x8C, em049_00 0x90 (the only 0x90). Rathian row 0 @0x8E = `90 80 70 00 0F 0F 14 23 64 64`. The extra 0/2/3/4 bytes before the grid are the sever entry (`01 ff` = 0xFF01) and deviant entry tails (`7e ff` = 0xFF7E in ems099_00, `01 00 ff` em045_00, `01 7e ff` em007_04).

**Small monsters (`ems*`, 44 arcs) [C 2026-10-26]**: the same 8×10 grid is present (emid = 4096 + N, no `monster_damage` rows in `mhgu.db`), but the physical columns exceed 100 — ems020_00/ems021_00 row 0 @0x8C = 80/**110**/50/30/5/20/60/0/**200**/100 (`50 6e 32 1e 05 14 3c 00 c8 64`), ems004_00 row 0 @0x8E = **150/150/120**/100/100/100/100/10/0/100 (`96 96 78 64 64 64 64 0a 00 64`) — which is why a cut/impact/shot ≤ 100 gate skipped ems020_00/ems021_00 entirely and mislocated ems004_00 at 0x91. Cross-check against Rise's own small-monster meat files (`natives/stm/enemy/emsNNN/00/user_data/emsNNN_00_meat_data.user.2`, 27 extracted, 22 with a GU arc of the same id): 15 reproduce the Rise slot-0 row 9/9 at the located offset (ems007/008/009/019/020/021/025/027/034/035/039/040/041/042/044, exact incl. `_Piyo`), 3 match 8/9 with only the last column differing (ems005_00/ems006_00/ems026_00: GU ko 0 vs Rise `_Piyo` 100), and 4 differ outright because Rise rebalanced those species (ems003/ems013/ems014/ems016, e.g. ems013 100/100/100/50/50/40/100/10 in GU vs 70/85/75/20/20/20/60/5 in Rise). All 44 small arcs locate: 40 at 0x8C, 4 at 0x8E (ems004, ems023, ems048, ems099).

`em087_00` **is not block-less**: its grid is at 0x8C with pad 0 and ko 0 (`05 05 05 00 00 00 00 00 00 00` row 0, row 6 `78 78 96 0f 19 0a 0a 00 00 00` = 120/120/150), it was skipped by the old physical ≤ 100 cap. The status block is still absent there.

Known value outliers vs db (impact column only, likely db/romfs revision drift [U]): em024 Wings impact 20 vs db 15; em057 Tail Tip impact 20 vs db 19. Everything else matched (295/297 values).

The `pad` byte is **not** constant 100: 1561 of the 1640 located rows carry 100, and 15 arcs deviate — 0 (em012_00, em084_00, ems099_00, and rows of em019_04/em058_00/em062_00/em066_00/em066_04/em087_00/em088_00), 120 (em055_00, em070_00), 130 and 150 and 200 (em070_00), 200 (em003_00, em067_00), 255 (em003_00 layer rows), 10 (ems045_00 layer). Semantics unknown [U] — it is **not** a usable locator signal and must not be gated.

## Rage / staggered float region [B]

4-byte slots; each f32 value sits at `slot+2` (u32 at slot = bits<<16). Values (em001): 500, 6000, 1500, 1500, 300, 7000, 3000, 3000, 300, 6000, 1000, 1000, then 600, 1100, 2500, 5000, 800, 1400, 3000, 5000, zeros, 600, 1100, 2500, 5000. Fatalis: 10000, 15000, 6000, 6000, 800, 1700, 2400, 3500 ×4 blocks. Semantics unknown [U] — nothing byte-matches db status values.

## Action/flag pair table (em001) [B]

54 entries × 4 B = (u16 id, u16 0xFFF3 | 0xFFF8), ids 0x0907..0x7B07 — resembles an action/motion-id table with a per-entry flag (−13/−8 as s16). Semantics unverified.

## Status thresholds — locate rule [C per monster]

Variable block (0x1F4/0x22F/0x351/0x35C/0x3A1/0x4E8 observed; sometimes absent, e.g. em087_00 and the `ems*` small-monster arcs — `.tmp/reports-dsv/stat-ofs-E.md` §0), variable length and stride. Records for a subset of Poison, Sleep, Para(ylsis), KO, Exhaust(ion), Mount, Jump, Blast (db `monster_status` order; statuses that are db-zero rows may have no active record, and a db row may be absent from the file). A "missing" record is usually a **locator** miss, not an absent record: em027 Teostra does carry Sleep @0x22F (`200/600/5/2400/100/600`, db-exact) behind its odd-aligned base 0x21F, and em013 Fatalis carries a full 6-record block @0x232 although db has no `monster_status` rows for emid 13 at all (`.tmp/reports-rds/rev-stat-ofs-C.md` #8, `rev-stat-ofs-B.md` C2/C4).

Record shape (12 B = 6 × u16):

```
u16 initial      build-up to trigger (db `initial`)
u16 A            decay period in frames, reloaded into the per-status f32 timer on expiry (`0xa3bf4 ldrsh r0,[r7,#2]` → `0xa3c00 vstr`; Poison instance `0xa3a80`) [C disassembly]; varies per monster, not a shape gate [B] — see the A/B note below
u16 B            points removed from the build-up counter per period (`0xa3bdc ldrh r0,[r7,#4]` / `0xa3be4 sub` / clamp 0 `0xa3bec`; Poison instance `0xa3a68`) [C disassembly]; varies per monster, not a shape gate [B] — see the A/B note below
u16 duration     frames (db `duration` seconds × 60): 3600=60 s, 2400=40 s, 600=10 s
u16 increase     build-up growth per application (db `increase`)
u16 max          build-up cap (db `max`)
```

**A/B semantics [C for Exhaust/Poison, [U] elsewhere]**: the GU walker ticks the per-status f32 timer at X+0x5D88 down by dt·1.0 (`0xa3bc8 bl 0x72128` with `vmov.f32 s0,#1`), and when the timer reaches 0 the counter loses B and the timer reloads A (`0xa3be4 sub`, `0xa3c00 vstr`; exhaust instance `0xa3b88..0xa3c04`, poison instance `0xa3a60..0xa3a8c` — `.tmp/reports-rds/rev-gu-stamina.md` §H, re-disassembled 2026-10-26). So A = decay period in frames, B = points removed per period; A=0/B=0 (Mount/Jump/Blast in em001) makes the tick fire every frame and remove nothing, i.e. no decay [B]. Whether Sleep/Para/KO/Mount/Jump consume A/B the same way is not disassembled [U].

**A/B note [B]**: A/B are **not constant** per monster, so they are not a shape gate. Across the full 89 arcs with a non-trivial db Poison row (88 strict db matches + em030_00, whose file initial reads 27 against db 30) the observed (A,B) pairs are 600/5 ×44, 300/10 ×17, 600/10 ×17, 150/10 ×1, 300/5 ×10 (`.tmp/reports-rds/rev-ab-doc.md` #3, byte-granular sweep — the earlier 70-record figures came from a u16-grid scan); in em001 the Mount/Jump/Blast records carry 0/0. A gate on 600/5 keeps only the 44 records that carry exactly that pair (45 of 89 rejected), and em004 then loses 7 of 8 records while em011 drifts into float data and "finds" an invented Blast.

Extras that break a fixed stride:
- **Poison trailing pair**: 2 extra u16 after the Poison record, value varies per monster ([5,120] em001/em002; [10,300] em011/em024; [5,60] em027/em057; [8,60] em043).
- **Non-record slot before Blast (S)**: 12 B of `0x0096` + 10 tuning u8, or a `ff ff`-led filler (em027 @0x26B `ff ff 10 ff 0c ff 0c ff 08 ff 08 ff`; em011 @0x234; em024 @0x3A9) — a slot, not a sextet: skip it by position, never parse it. S = 1 in 31 of the 32 block-bearing arcs of the em060..em088 slice, S = 0 only in em088_00 (`.tmp/reports-dsv/stat-ofs-E.md` §1). Earlier drafts called these "placeholder records" and put em027's slot at 0x26F — it starts at 0x26B (`.tmp/reports-rds/rev-stat-ofs-C.md` Difficulties).
- **em043 Blast is standard, not compact [C]**: em043_00 and em043_05 both carry the normal 7-u16 shape at 0x54C — `82 00 00 00 00 00 00 00 2d 00 06 04 2c 01` = `130/0/0/0/45/1030` plus damage u16 `2c 01` = 300 @0x558. The old "5-u16 `130/0/45/1030/300`" reading dropped the two zero u16; no shortened variant exists (`.tmp/reports-rds/rev-ab-doc.md`, secondary note; bytes re-read 2026-10-26).
- **Blast damage [C]**: with the standard 6×u16 Blast record, the next u16 after the record is db `damage` (em001 100, em011 100, em024 100, em027 100, em057 100; em043 300 @0x558). 6/6 db Blast-damage values reproduced.

**How to locate/parse the block in a new file** [B]: scan **byte** offsets — every offset, not the u16 grid — for the Poison record shape (initial = db `initial`, duration = multiple of 60, plausible increase/max, A/B unrestricted — they are per-monster, see the A/B note) confirmed against db values. **18 of the 89** db-verified Poison records start on an odd byte offset (em024_00 0x351, em027_00 0x21F, em057_00 0x3A1, em063_00 0x2F5, em071_00 0x329, em080_00 0x34B, em086_00 0x1F7, … — full list `.tmp/reports-rds/rev-ab-doc.md` #10), so a u16-grid scan is blind to them; most index entries with `layout: "raw"` / `status: null` are such misses rather than missing blocks (em087_00 is the one block-less arc of the em060..em088 slice).

**Block-start marker — a hint, never the rule [C]**: in most non-Fatalis arcs the 4 bytes immediately before the block read `ff ff ff 00` (em014_00 0x262..0x265, base 0x266), but the pattern is **not unique**: a non-Fatalis file carries 3 hits (em014_00 @0x219 / 0x262 / 0x369) and only the middle one precedes the base — the others sit inside `ff ff ff ff 00 00 00 00` runs. The Fatalis family has **no** marker in front: em013_00 starts its first record at 0x232, right after three f32 `1.0` (`00 00 80 3f` @0x226/0x22A/0x22E), and its single `ff ff ff 00` hit (@0x35F) is a decoy. em011_00 is the same shape (no pad; poison follows ten 1.0 floats). Use the marker only to confirm a base already found by content (`.tmp/reports-rds/rev-stat-ofs-A.md` Errata 1, `rev-stat-ofs-B.md` C1b/C2b).

**Offset-shift rule once `p` = Poison start is known [C]**: `blast = p + 16 + 12·(N + S)` and `damage = blast + 12`, where N = the 12-B records physically present after the poison pair (Sleep/Para/KO/Exhaust/Mount/Jump in that order, an absent status costing 0 B — em084_00 carries one leftover record although its db has only Poison) and S = the non-record slot above (1 normally). With S = 1 this is the convenient `blast = p + 28 + 12·N` (em001_00 p=0x35C, N=6 → blast 0x3C0, damage 0x3CC). S = 0 occurs in em050_00 and em058_00 (`.tmp/reports-rds/rev-stat-ofs-D.md`, 13 of that slice's 15 arcs have S = 1) and em088_00 (p=0x340, N=6 → blast 0x398 `130/0/0/0/50/1030`, damage 0x3A4 = 100), where `p + 28 + 12·N` would land on the damage u16 (`.tmp/reports-dsv/stat-ofs-E.md` §1, re-read from bytes). So never use the S = 1 shortcut as a locator. Where the emid's db Blast row is all-zero (em088, em084) the pair at that position is a disabled default and must not be ported. Walk records sequentially, skipping the poison trailing pair and the S slot, until Blast. Validate every record against db before citing.

Values that exist are db-exact across all 6 monsters checked (108/108 initial+increase+max, 18/18 durations = db s×60).

## After the status block [U]

Motion/part tuning: u8 runs (the 12-B S slot itself reads as one — `150 0 20 25 16 22 16 22 14 18 14 18` @0x3B4 em001), staggered f32s (multipliers like 1.25/1.1/1.05/1.5/3/0.5/2 @0x1B6..), record structures with float pairs, all unverified against db. See decoder `--raw` dump for exact bytes.

## Cross-check verdict

| Item | dttune | mhgu.db | Verdict |
|---|---|---|---|
| base HP | 0x38 u32, fixed | monsters.base_hp | **8/8 exact** — fixed offset, cite [C] freely |
| meat | 8×10 @ 0x8C/0x8E/0x8F/0x90, per-monster, + conditional layers at +80·k; same grid in all 44 small-monster arcs | monster_damage rows (large monsters only — db has none for emid > 4000) | base rows + per-part conditional layers both stored; decoder `--db` locates & matches the base table for every large arc (93/94 offsets agree with `monster-dttune-index.json`, the 94th is em087_00 which the index still lists as null); 2 known impact outliers (em024 Wings 20 vs 15, em057 Tail Tip 20 vs 19); small-monster rows validated against Rise's `emsNNN_00_meat_data.user.2` (18/25 sampled arcs 9/9); cite [C] **per monster** with located offset; conditional layers are per-part overrides (not whole-body states), and a fill-only group is not a layer |
| status | variable block 0x1F4..0x4E8, per-monster (base may be odd) | monster_status rows | decoder `--db` locates & matches 6/6 monsters with db rows (all records + durations + Blast damage); em013's 6-record block @0x232 is rejected as a *db match* only because emid 13 has no db rows at all; cite [C] **per monster** after location+match |
| conditional-state meat | conditional layers at +80·k (per-part overrides) | monster_damage "Enraged"/"Wind Barrier"/"Charged" rows | **stored** — layer rows byte-match db conditional rows (Kirin L1 = Head (Enraged) exact); cite [C] per matched layer |
| rage/tuning floats | 0xE6+ | — | no db counterpart found [U] |

`mhgu.db` values are reproduced by the romfs file byte-for-byte wherever a table exists and was located — but because offsets and record sets are per-monster variables, only base HP is [C] without per-monster verification. Index of per-monster offsets: `docs/data/json/monster-dttune-index.json`. Decoder confidence model: without `--db`, located meat/status are positional candidates (`poison?` naming, no db claims); with `--db --emid N`, records get `dbMatch` flags, status names are only assigned on value match, and a candidate block with 0 matching records is reported as rejected.
