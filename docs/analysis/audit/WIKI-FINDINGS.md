# WIKI slice — supplementary review (part 2)

Scope: `docs/wiki/` — denom fixed by `docs/analysis/audit/slices/wiki.txt` (47 pages, 28,492 lines).
Machine-readable result: `docs/analysis/audit/WIKI.tsv` (48 rows = 47 page rows + 1 item row).

## Counts

| verdict | rows |
|---|---:|
| OK | 46 |
| WRONG | 2 (1 page-level, 1 item-level) |
| STALE / MISSING / UNVERIFIABLE / NA | 0 |
| **total** | **48** |

Every page in the slice has exactly one page-level row. `damage-formula.md` additionally has one
item-level row for a mis-transcribed constant sequence.

Recompute basis: for each page the numeric table was re-derived from the artifact the page names
(romfs bytes via `arc.mjs`/zlib, `docs/data/mhgu.db`, `docs/data/json/*`, `docs/data/armor/*`,
`main.140.flat.bin`, `MHGU-private/romfs-extract/*`), 2–3 representative rows per page, plus
whole-table checks where the page states a closure.

## Generator pages (4/4 reproduce byte-identically)

| page | generator | result |
|---|---|---|
| `weapon-trees.md` | `tools/wiki-gen/gen-weapon-trees.py` | 1,585 finals; `cmp` identical, 115,812 B |
| `monster-weakness-cheatsheet.md` | `tools/wiki-gen/gen-weakness.py` | 93 monsters; identical, 16,345 B |
| `deviants.md` | `tools/wiki-gen/gen-deviants.py` | 18 groups / 228 rows; identical, 35,140 B |
| `quests-village-hub.md` | `tools/wiki-gen/gen-quests-vh.py` | 714 rows; identical, 87,541 B |

The last two write straight into `docs/wiki/`; they were copied to `G:/tmp/AuditWiki` with only the
output path changed (audited docs were not touched). No other wiki page carries a generator comment.

## Top findings

### 1. WRONG — `README.md`: "39 表 SQLite 镜像" (and "39 表" again at §三)

```
$ node -e "select count(*) from sqlite_master where type='table' and name not like 'sqlite_%'" -> 38
```
The db has **38** user tables (39 only if the `sqlite_sequence` auto-increment table is counted).
`medals-guild-card.md:22` states the same db has "38 张表", so the wiki contradicts itself.
The same README lines are otherwise correct (`18MB` = 18,333,696 B; 47 pages in this slice).

### 2. WRONG (item) — `damage-formula.md` §5.2: literal-pool sequence mis-transcribed

Page: `0x178010..0x17802c` = `100.0 / 1.2 / 1.1 / 1.4 / 0.9 / 0.05`.
Disk (`main.140.flat.bin`, flat = vaddr + 0x100):
```
0x178010 100.0 | 0x178014 1.2 | 0x178018 1.1 | 0x17801c 4.34e-38 | 0x178020 0.9 | 0x178024 1.4 | 0x178028 0.1
```
So `1.4` sits at 0x178024 (the page's own load-word claim `3FB33333` is right) and there is **no
0.05** (there is a 0.1). The page's argument — 0.75 is absent from that pool, so 0.75 must be
referenced from the data region — is unaffected. Page-level verdict stays OK.

### 3. Hard tables that recompute exactly (spot-check highlights)

- `items-table.md`: `itemData.itm` 131,612 B = 8 + 44 × 2991; page 2,956 rows = 2,866 `[C]` + 90 `[B]`,
  and all 90 `[B]` ids are indeed absent from `items` (<2991 → 2,866 rows).
- `maps-gathering.md`: 15-map rows 15,243 + 171 non-map = 15,414; 3,231/3,231 drop tables sum to 100;
  984 points is the *merged* figure the page defines (raw distinct group_num = 994, as the page says).
- `monster-hitzones.md` / `hitzones-all-a/b.md`: 9-column rows read straight from `*_dttune`, including
  the per-monster table starts 0x8C/0x8E/0x8F and the `[X]` rows (513 Head cut 19, 1025 Back 19).
- `monster-status.md`: poison/sleep/para/KO/exhaust/mount/jump/blast u16 records at the quoted offsets
  (em001 @0x35C…, em088 blast @0x398 = 130/50/1030).
- `monster-size-crowns.md`: all 83 table rows match `em_size_scale_data.txt` by idx=slot (0 mismatches).
- `armor-talismans.md`: 5,609 armor JSON items give 19 distinct `max_defense−defense` values, all
  present among the 22 `armorBuildData.abd` row sums — the page's closure claim.
- `skill-trees-full.md`: every 206×7 `skillTypeData.skt` cell checked against `skills` with the
  nearest-threshold rule → 1,442/1,442.

### 4. Counting claims that are conditional but self-consistent (no action)

- `progression-unlocks.md` ★3 "6 key" vs db `type=1` count 7: the page explicitly counts q308/q309 as
  one duplicate registration, so the number is a scoped count, not an error.
- `quests-g-rank.md` "key = type 1 / urgent = type 2, agrees with quests.json": true for the G block
  (5/0, 6/1, 6/1, 6/2); db-wide totals differ from `quests.json` keyType totals, which the page does
  not claim.

## Commands used (representative)

```bash
# dttune (meat / HP / status) straight from romfs, ARC + zlib
node G:/tmp/AuditWiki/meat.mjs em001_00 0x8e 8
node G:/tmp/AuditWiki/hp.mjs em013_00 em004_00 em010_00
node G:/tmp/AuditWiki/u16.mjs em001_00 0x35c 45
node G:/tmp/AuditWiki/find.mjs em007_00 300 600 10 600 100 800      # exhaust record
# DB recomputation
node G:/tmp/AuditWiki/q.mjs "select hub,rank,count(*),sum(hrp),max(hrp) from quests group by 1,2"
# generators
py -3.14 tools/wiki-gen/gen-weapon-trees.py docs/data/mhgu.db G:/tmp/AuditWiki/weapon-trees.md
py -3.14 tools/wiki-gen/gen-weakness.py .tmp/weak-damage.tsv .tmp/weak-weakness.tsv docs/data/json/monster-slot-map.json G:/tmp/AuditWiki/weakness.md
# binaries
node -e "…readFloatLE(0x1624b4c+0x100)…"          # main.140.flat.bin sharpness tables
node -e "…readUInt32LE(0x18) for *.gmd…"           # GMD string counts
```

## Difficulties

- `python`/`python3` on this box are the Store stubs (exit 49); the generators only run as `py -3.14`.
- `gen-deviants.py` and `gen-quests-vh.py` hard-code an output path inside `docs/wiki/`; running them
  as-is would rewrite audited docs. Copies with a temp output path were used, and the copies differ
  only in that literal.
- Node ESM rejects `G:/...` specifiers (`ERR_UNSUPPORTED_ESM_URL_SCHEME`); helpers import
  `arc.mjs` through `file:///G:/omp%20works/...`.
- Some pages carry no numeric table to re-derive (`valor-alchemy.md` is chS quotes; only its
  "HN_HunterTipsMsg = 512 strings" claim was recomputed), and `multiplayer.md`'s central claim is a
  negative ("no per-player HP field"), which was checked only through the 13 B enemy-slot layout and
  two HealthTbl samples.
