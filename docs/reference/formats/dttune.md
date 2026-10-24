# `*_dttune` (rEnemyDtTune) — format spec

> **Per-monster offsets — read this first.** Only base HP @0x38 is a fixed offset. The meat table and the status block live at variable offsets (meat seen at 0x8C/0x8E/0x8F; status at 0x1F4/0x22F/0x351/0x35C/0x3A1/0x4E8 or absent) with variable record stride and placeholder/disabled records. A monster's meat/status may be cited [C] only if the table was located in *that* file and its values cross-check against `mhgu.db`. Per-monster offsets are published in `docs/data/json/monster-dttune-index.json` (DtTuneAll).

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
| 0x3C | u16 | unknown small int (140/150/700/250/260/320/350/280) [U] |

File sizes vary per monster (1018..1966 B sampled); the runtime class is only 0x128 B, so the file is parsed by dedicated loader code, not mapped 1:1 onto the class [B].

## Meat table — locate rule [C per monster]

8 rows × 10 B somewhere in 0x8A..0x94. Each row = 9 × u8 + 1 pad byte, values 0..100:

```
cut, impact, shot, fire, water, ice, thunder, dragon, ko, pad
```

**Column order note [Main/RevHitzones]:** within the element block it is fire, water, ice, thunder (not fire/water/thunder/ice) — the order above matches `mhgu.db monster_damage` columns (fire, water, ice, thunder, then dragon, ko). Earlier drafts swapped ice/thunder; wiki pages citing dttune must use the db order shown here.

**How to locate the table in a new file** (decoder rule, works 8/8):
1. Scan byte offsets 0x8A..0x94 for the first 10-byte window where 8 consecutive rows keep all bytes ≤ 100 (0x64) and row 0's first byte (cut) is ≥ 1 — cut is non-zero in every db base row.
2. Confirm row 0 against db `monster_damage` Head row; all-100 filler rows follow the real rows.
3. The table is a **base-state table only** — conditional-state rows (Enraged / Kushala wind barrier / Zinogre charged …) are **not stored**; unused slots are all-100. db rows beyond the base state have no dttune counterpart.

Observed starts: em011 0x8C (4 real rows), em001/em002/em043 0x8E (7/7/6 real rows), em013 0x8E (8 real rows), em024/em027/em057 0x8F (8/7/8 real rows). Rathian row 0 @0x8E = `90 80 70 00 0F 0F 14 23 64 64`.

Known value outliers vs db (impact column only, likely db/romfs revision drift [U]): em024 Wings impact 20 vs db 15; em057 Tail Tip impact 20 vs db 19. Everything else matched (295/297 values).

The `pad` byte reads 100 (0x64) in all sampled rows; semantics unknown [U].

## Rage / staggered float region [B]

4-byte slots; each f32 value sits at `slot+2` (u32 at slot = bits<<16). Values (em001): 500, 6000, 1500, 1500, 300, 7000, 3000, 3000, 300, 6000, 1000, 1000, then 600, 1100, 2500, 5000, 800, 1400, 3000, 5000, zeros, 600, 1100, 2500, 5000. Fatalis: 10000, 15000, 6000, 6000, 800, 1700, 2400, 3500 ×4 blocks. Semantics unknown [U] — nothing byte-matches db status values.

## Action/flag pair table (em001) [B]

54 entries × 4 B = (u16 id, u16 0xFFF3 | 0xFFF8), ids 0x0907..0x7B07 — resembles an action/motion-id table with a per-entry flag (−13/−8 as s16). Semantics unverified.

## Status thresholds — locate rule [C per monster]

Variable block (0x1F4/0x22F/0x351/0x35C/0x3A1/0x4E8 observed; sometimes absent, e.g. Fatalis), variable length and stride. Records for a subset of Poison, Sleep, Para(ylsis), KO, Exhaust(ion), Mount, Jump, Blast (db `monster_status` order; statuses that are db-zero rows may have no active record, and a db row may be absent from the file — em027 Teostra has no Sleep record despite a non-zero db row [U why]).

Record shape (12 B = 6 × u16):

```
u16 initial      build-up to trigger (db `initial`)
u16 A            600 for timed statuses, else 0 [B]
u16 B            5 for timed statuses, else 0 [B]
u16 duration     frames (db `duration` seconds × 60): 3600=60 s, 2400=40 s, 600=10 s
u16 increase     build-up growth per application (db `increase`)
u16 max          build-up cap (db `max`)
```

Extras that break a fixed stride:
- **Poison trailing pair**: 2 extra u16 after the Poison record, value varies per monster ([5,120] em001/em002; [10,300] em011/em024; [5,60] em027/em057; [8,60] em043).
- **Placeholder/disabled records**: e.g. em011 record @0x234, em024 @0x3A9, em027 @0x26F — all-zero or sentinel-filled records that occupy a slot.
- **Compact Blast (em043)**: 5-u16 record `130/0/45/1030/300` — db Blast values initial 130/increase 45/max 1030/damage 300 all present but the record is 2 u16 shorter than standard; exact field mapping [U].
- **Blast damage [C]**: with the standard 6×u16 Blast record, the next u16 after the record is db `damage` (em001 100, em011 100, em024 100, em027 100, em057 100; em043 carries 300 inside the compact record). 6/6 db Blast-damage values reproduced.

**How to locate/parse the block in a new file** [B]: scan u16 offsets for the Poison record shape (initial = db `initial`, A=600, B=5, duration = multiple of 60, plausible increase/max) confirmed against db values; walk records sequentially, skipping the poison trailing pair and placeholder records, until Blast. Validate every record against db before citing.

Values that exist are db-exact across all 6 monsters checked (108/108 initial+increase+max, 18/18 durations = db s×60).

## After the status block [U]

Motion/part tuning: u8 runs (e.g. `150 0 20 25 16 22 16 22 14 18 14 18` @0x3B4 em001), staggered f32s (multipliers like 1.25/1.1/1.05/1.5/3/0.5/2 @0x1B6..), record structures with float pairs, all unverified against db. See decoder `--raw` dump for exact bytes.

## Cross-check verdict

| Item | dttune | mhgu.db | Verdict |
|---|---|---|---|
| base HP | 0x38 u32, fixed | monsters.base_hp | **8/8 exact** — fixed offset, cite [C] freely |
| meat | 8×10 @ 0x8C/0x8E/0x8F, per-monster | monster_damage rows | base-state rows only: decoder `--db` locates & matches the table 8/8 monsters; 2 known impact outliers (em024 Wings 20 vs 15, em057 Tail Tip 20 vs 19); cite [C] **per monster** with located offset |
| status | variable block 0x1F4..0x4E8, per-monster | monster_status rows | decoder `--db` locates & matches 6/6 monsters with db rows (all records + durations + Blast damage); em013 candidate block correctly rejected (0 db rows); cite [C] **per monster** after location+match |
| conditional-state meat | absent | monster_damage "Enraged"/"Wind Barrier"/"Charged" rows | **not in dttune** — those db rows stay [I] |
| rage/tuning floats | 0xE6+ | — | no db counterpart found [U] |

`mhgu.db` values are reproduced by the romfs file byte-for-byte wherever a table exists and was located — but because offsets and record sets are per-monster variables, only base HP is [C] without per-monster verification. Index of per-monster offsets: `docs/data/json/monster-dttune-index.json`. Decoder confidence model: without `--db`, located meat/status are positional candidates (`poison?` naming, no db claims); with `--db --emid N`, records get `dbMatch` flags, status names are only assigned on value match, and a candidate block with 0 matching records is reported as rejected.
