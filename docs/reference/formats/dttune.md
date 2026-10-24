# `*_dttune` (rEnemyDtTune) — format spec

Source files: `romfs/nativeNX/arc/enemy/emNNN_00.arc` → entry `enemy\dt_tune\emNNN_00_dttune`, type hash `0x48e8ac29`, zlib-compressed inside the arc. Extract with `node tools/mhgu/arc.mjs extract <arc> <outdir> "_dttune$"`; decode with `node tools/mhgu/dttune.mjs <file>`.

Resource class: `rEnemyDtTune`, tag `dtt`, class size `0x128`, registered in fn `0x564bc` (docs/analysis/monsters/mon-class-map.md §5 line 126, §5bis line 195, name pool §7 line 364). Unlike `rEnemyDtBase` (26 named property readers), fn `0x564bc` registers only the tag and class name — no member names are known from the registration framework, so field names below come from byte cross-checks against `mhgu.db` unless marked otherwise.

Evidence tags: [C] = verified against bytes + db; [B] = inferred from data shape; [U] = unknown.

## Header

| Offset | Type | Value (em001/em002/em013) | Meaning |
|---|---|---|---|
| 0x00 | char[4] | `DTT\0` | magic [C] |
| 0x04 | u8[4] | `6c a0 33 01` (all 3 files) | unknown [U] |
| 0x08 | u8[] | — | small header, layout monster-dependent [U] |
| 0x38 | u32 | 4500 / 4200 / 9000 | monster base HP — byte-equal `mhgu.db monsters.base_hp` for Rathian(1)/Rathalos(2)/Fatalis(13) [C] |
| 0x3C | u16 | 140 / 150 / 700 | unknown small int [U] |

File sizes vary per monster (1594 B Rathian/Rathalos, 1122 B Fatalis); the runtime class is only 0x128 B, so the file is parsed by dedicated loader code, not mapped 1:1 onto the class [B].

## Meat / hitzone table @0x8E [C]

8 rows × 10 B. Each row = 9 × u8 + 1 pad byte, values 0..100:

```
cut, impact, shot, fire, water, ice, thunder, dragon, ko, pad
```

- Column order equals `mhgu.db monster_damage` columns (cut/impact/shot/fire/water/ice/thunder/dragon/ko).
- Rows 0..7 correspond to the monster's damageable parts; byte-equal to db rows for Rathian (rows 0..6 = Head/Neck/Back/Belly/Tail/Wings/Legs), Rathalos (same part order) and Fatalis (Head/Neck/Belly/Back/Tail/Front Legs/Back Legs/Wings — 72/72 values exact).
- Rathian row 0 (Head) = `90 80 70 00 0F 0F 14 23 64 64` @0x8E.
- The `pad` byte reads 100 (0x64) in sampled rows; likely part of an adjacent field, semantics unknown [U].
- Row 7 of Rathian/Rathalos is all-100; Fatalis rows 0..7 all carry real part values [C as data].

## Rage / staggered float region 0xE6..0x18A [B]

4-byte slots; each f32 value sits at `slot+2` (i.e. u32 at slot = bits<<16). Values (em001): 500, 6000, 1500, 1500, 300, 7000, 3000, 3000, 300, 6000, 1000, 1000, then 600, 1100, 2500, 5000, 800, 1400, 3000, 5000, zeros, 600, 1100, 2500, 5000. Fatalis: 10000, 15000, 6000, 6000, 800, 1700, 2400, 3500 ×4 blocks. Semantics unknown [U] — candidates: rage/strategy tuning (nothing byte-matches db status values). No db cross-check succeeded for this region.

## Action/flag pair table 0x280..0x358 (em001) [B]

54 entries × 4 B = (u16 id, u16 0xFFF3 | 0xFFF8), ids 0x0907..0x7B07 — resembles an action/motion-id table with a per-entry flag (−13/−8 as s16). Terminated by `FF FF FF 00` before 0x35C. Semantics unverified.

## Status thresholds @0x35C [C]

8 records for Poison, Sleep, Para(ylsis), KO, Exhaust(ion), Mount, Jump, Blast — same order as `mhgu.db monster_status` rows:

```
u16 initial      build-up to trigger (db `initial`)
u16 A            600 for timed statuses, else 0 [B]
u16 B            5 for timed statuses, else 0 [B]
u16 duration     frames (db `duration` seconds × 60): 3600=60 s, 2400=40 s, 600=10 s
u16 increase     build-up growth per application (db `increase`)
u16 max          build-up cap (db `max`)
```

- Rathian: Poison(180, 600, 5, 3600, 100, 580) Sleep(180, …, 2400, 100, 580) Para(180, …, 600, 110, 730) KO(150, …, 600, 150, 750) Exhaust(180, …, 0, 75, 480) Mount(80, 0, 0, 0, 120, 560) Jump(60, 0, 0, 0, 100, 800) Blast(70, 0, 0, 0, 30, 670) — every initial/increase/max byte-equal to db [C].
- Rathalos: identical except Mount max 530, Jump(50, 80, 800) — db-exact [C].
- Records are 12 B each, but the Poison record is followed by 2 extra u16 `[5, 120]` (identical in em001+em002) before Sleep's `initial`; the status block is therefore not uniformly strided [B].
- db `Blast damage` (100) has no confirmed slot; 100 @0x3CC starts the next region [B].
- Fatalis (em013) does not use this layout (region is zeros/floats) and `mhgu.db` has no `monster_status` rows for it — status data availability is per-monster [U].

## After 0x3CC [U]

Motion/part tuning: u8 runs (e.g. `150 0 20 25 16 22 16 22 14 18 14 18` @0x3B4 em001 — differing per monster), staggered f32s (multipliers like 1.25/1.1/1.05/1.5/3/0.5/2 @0x1B6..), record structures with float pairs, all unverified against db. See decoder `--raw` dump for exact bytes.

## Cross-check verdict

| Item | dttune | mhgu.db | Verdict |
|---|---|---|---|
| base HP | 0x38 u32 | monsters.base_hp | exact ×3 (Rathian/Rathalos/Fatalis) [C] |
| meat 8×9 | 0x8E | monster_damage rows | exact ×24 values ×3 monsters [C] |
| status init/inc/max ×8 | 0x35C..0x3CB | monster_status rows | exact ×16 fields ×2 monsters [C] |
| status duration | frames = s×60 | monster_status.duration | consistent ×5 timed statuses [C] |
| rage/tuning floats | 0xE6+ | — | no db counterpart found [U] |

`mhgu.db` (MHGenDatabase v2.4.0) values are reproduced by the romfs file byte-for-byte everywhere both exist, so dttune is a [C]-grade source for meat, HP and status thresholds on sampled monsters.
