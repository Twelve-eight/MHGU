# W4-WIKI — linkage review of `docs/wiki/` (47 files)

Audit wave 4. Scope: every file under `docs/wiki/` (46 knowledge pages + `README.md`), grouped
by topic. Method: take each numeric claim, count and path cited, then re-derive it from the
committed artefact it names — `docs/data/mhgu.db`, `docs/data/json/*`, or the unpacked ROM at
`G:/mhgu-romfs/romfs/**` — and record the command and its output. Claims that could not be
reproduced are listed as `unverified` with the reason, never dropped.

Environment actually used for this pass:

```
repo      G:/omp works/MHGU            (git c98e0d6..cec4388, two local edits present)
romfs     G:/mhgu-romfs/romfs          (full unpacked tree: nativeNX/table, nativeNX/chS/table,
                                        nativeNX/arc/enemy, nativeNX/loc/quest/questData)
private   G:/omp works/MHGU-private    (sibling of the repo, not inside it:
                                        romfs-extract/gmd  = 385 json, index.json reports
                                        files=385 strings=61941 failed=0)
db        docs/data/mhgu.db            18,333,696 B, 38 user tables + sqlite_sequence
tools     bun 1.x (bun:sqlite), node 24, tools/mhgu/arc.mjs (ARC v0x11 + zlib)
```

Topic clusters used below:

| cluster | files |
|---|---|
| A. entry point / routing | `README.md` |
| B. monsters | `monsters-index`, `monster-habitat`, `monster-hitzones`, `hitzones-all-a`, `hitzones-all-b`, `monster-status`, `monster-rage-tired`, `monster-parts-hp`, `monster-drops`, `small-monsters`, `monster-size-crowns`, `monster-weakness-cheatsheet` |
| C. quests / progression | `quests`, `quests-village-hub`, `quests-g-rank`, `quest-requirements`, `progression-unlocks`, `hr-caps`, `hyper-event-quests`, `deviants`, `multiplayer` |
| D. equipment | `weapons-overview`, `weapon-trees`, `armor-talismans`, `armor-sets`, `talisman-sources`, `skills`, `skill-trees-full`, `decorations` |
| E. actions / systems | `motion-values`, `moves-blademaster-a`, `-b`, `-c`, `styles-arts`, `valor-alchemy`, `damage-formula` |
| F. items / economy | `items-table`, `items-combat`, `items-combination`, `gunner-ammo`, `hunting-horn-songs`, `farm-trade-canteen`, `maps-gathering` |
| G. palico / meta | `palico-prowler`, `palico-skills-full`, `medals-guild-card` |

---

## 1. Headline result

The wiki is a much better-anchored corpus than the usual target of this audit wave. Of the
counts and table rows that a machine can re-derive, **the overwhelming majority reproduce
exactly**: 2,866 item rows, 714 + 27 quest rows, 628 motion-value rows, 626 hitzone rows,
513 hitzone-B rows, 65 exhaust rows, 228 deviant-quest rows, 183 combination recipes, 242
decoration records and 275 recipes, 1,242 armour families, 1,585 weapon finals, 870 MV
records, 61,941 GMD strings — all equal to the numbers the pages print, and all value columns
equal to the database or the ROM bytes.

The defects that survive are concentrated in **`README.md` itself** (which is the routing
document every other page is read through) and in a small number of cross-page numbers.
Two of them are functional: six of the six copy-paste SQL templates in `README.md` §3 raise
`no such column`, and the 387 topic anchors emitted by `monsters-index.md` resolve to nothing.

---

## 2. Contradictions (command + output + doc line)

### C1 — `README.md` §3: all six SQL templates reference columns that do not exist
Doc: `docs/wiki/README.md:146`, `:153`, `:160`, `:166`, `:171`, `:176`; prose at `:140`.

```
$ bun -e "…run the six templates verbatim against docs/data/mhgu.db…"
R1: ERROR no such column: m.name_zh
R2: ERROR no such column: q.name_zh
R3: ERROR no such column: qr.slot_type
R4: ERROR no such column: q.name_zh
R5: ERROR no such column: d.name_en
R6: ERROR no such column: state
```

Actual column sets (`pragma table_info`):

```
hunting_rewards: _id,item_id,condition,monster_id,rank,stack_size,percentage
quests         : _id,sort_order,name,name_de,name_fr,name_es,name_it,name_ja,goal,…,hrp,…
                 (no name_zh; the language columns are name/_de/_fr/_es/_it/_ja)
quest_rewards  : _id,quest_id,item_id,reward_slot,percentage,stack_size
decorations    : _id,num_slots
monster_damage : _id,monster_id,body_part,cut,impact,shot,fire,water,ice,thunder,dragon,ko
```

So template ① needs `hr.rank`, `hr.condition`, `hr.percentage`, `hr.stack_size`, `i.name`;
② / ④ need `q.name`; ③ needs `qr.reward_slot`, `i.name`, `qr.percentage`, `qr.stack_size`;
⑤ needs `decorations.num_slots` + `components` (there are no `slots/skill1_points/skill2_points`
columns at all); ⑥ needs `body_part`, not `state`/`part`. Line 140's statement that
"db/JSON 的 name_zh 字段是 wiki 译名" cannot hold for the db, which has no `name_zh` column.

### C2 — `README.md` §1: "`docs/wiki/*.md` 全量 37 页" vs 46 pages on disk
Doc: `docs/wiki/README.md:5`, `:24`.

```
$ ls docs/wiki/*.md | wc -l
47
$ awk '/^## 一、/,/^## 二、/' docs/wiki/README.md | grep -c '^| \['
37
$ comm -13 idx all          # pages present but not indexed
deviants.md  items-table.md  monster-size-crowns.md  monster-weakness-cheatsheet.md
palico-skills-full.md  quests-g-rank.md  quests-village-hub.md  talisman-sources.md
weapon-trees.md
```

37 indexed + 9 unindexed = 46 pages (47 files counting `README.md`). Several unindexed pages
are large and load-bearing (`items-table.md` 3,054 lines, `weapon-trees.md` 1,693,
`quests-village-hub.md` 857), and `README.md` §2's routing table points readers at none of them.

### C3 — `README.md` §1 status column: four pages are marked "未复核（无审核报告）" although the report exists
Doc: `docs/wiki/README.md:38` (hitzones-all-a), `:48` (hr-caps), `:62` (armor-sets), `:65` (gunner-ammo).

```
$ ls "G:/omp works/.tmp/reports-mhgu" | grep -c '^rev-wiki-'
35
$ ls "G:/omp works/.tmp/reports-mhgu" | grep -E 'rev-wiki-(hz-all-a|hr-caps|armor-sets|gunner)\.md'
rev-wiki-hz-all-a.md
rev-wiki-hr-caps.md
rev-wiki-armor-sets.md
rev-wiki-gunner.md
```

### C4 — `README.md` says 994 gathering points; the page says 984 and 984 is the correct one
Doc: `docs/wiki/README.md:68`, `:205` (994) vs `docs/wiki/maps-gathering.md:8`, `:79` (984).

The page defines a point as "the number of gathering spots in an area×site, ranked by
position within that rank" (`maps-gathering.md:2860`). Reproducing that literally:

```
$ bun -e "…for each (location,area,site): max over rank of count(distinct group_num)…"
position-based points total=984
per loc={"1":79,"2":71,"3":53,"4":69,"5":76,"6":65,"7":66,"8":59,"11":80,"12":54,
         "13":62,"14":44,"22":71,"23":71,"24":64}
```

that is exactly the page's per-map column and its **984** total. The number `994` that
`README.md` prints twice is the naive `DISTINCT location_id,area,site,group_num` figure that
`maps-gathering.md:2860` explicitly calls an over-count ("直接按 group_num 去重会得到 994，
因为它跨等级平移"). The other two page totals are right:

```
$ … distinct (location,area,site,rank,fixed,rare,group_num) where location_id not in
      (9,10,15,16,17,18,19,20,21,25,26)  -> 3231 tables
$ … rows of the 15 map locations           -> 15243 ; rows of the 11 other locations -> 171
$ … tables whose sum(percentage) <> 100    -> 0
```

### C5 — `README.md` says hitzones-all-b has 484 rows; the page and the data say 513
Doc: `docs/wiki/README.md:39`, `:194` (484) vs `docs/wiki/hitzones-all-b.md:6` (513).

```
$ … rows in §3 with a [CBIXU] marker and 9 numeric columns, incl. collapsed "空槽" rows
rows=514 markers={"[C]":448,"[I]":25,"[X]":3,"[B]":36,"[U]":2}
$ … same, requiring a single 0xNNN offset cell (i.e. excluding the 4 collapsed rows)
rows=509 markers={"[C]":448,"[I]":25,"[X]":3,"[B]":31,"[U]":2}
```

509 single-offset rows + 4 collapsed "空槽 槽0/1/2/…" rows = **513**, and 31 + 4 = **35**
`[B]`, which is exactly the tally printed on line 6. The page is right; 484 in the README is
stale (it is neither 509 nor 513).

### C6 — `README.md`: "hitzones-all-a 仍在逐槽追加（未到槽 46）" is stale
Doc: `docs/wiki/README.md:194`.

```
$ grep -c '^### ' docs/wiki/hitzones-all-a.md
42
$ grep '^### ' docs/wiki/hitzones-all-a.md | tail -2
### 槽 45 · 金雷公雷狼龙（Thunderlord Zinogre，`em057_04`，emid 1081）
### 槽 46 · 岚龙（Amatsu，`em058_00`，emid 58）
```

The page reaches slot 46 and covers 42 of the 47 slots in 0–46 (the five slots duplicated by
`monster-hitzones.md` are slot 0, 3, 27, 31, 44). Note also that the page's own line 5 says
"已收录于 monster-hitzones.md 的 10 只怪…本页不重复" while only 5 of those 10 lie inside 0–46.

### C7 — `README.md`: monster-status markers "67 [C]/24 [I]" vs 70/22 on the page
Doc: `docs/wiki/README.md:40` vs `docs/wiki/monster-status.md` §"全 91 只大型怪阈值总表".

```
$ … count source cells over every row of that table
C=70 I=22 other={}      (92 rows = 91 monsters + the extra 普通黑龙 slot117 row)
```

### C8 — `monsters-index.md`: 387 "专题页" anchor links resolve to nothing
Doc: `docs/wiki/monsters-index.md:46` onward (+§6 anchor rule), e.g. `[肉质](monster-hitzones.md#em001)`.

```
$ grep -oE '\(monster-(hitzones|status|drops)\.md#[^)]+\)' docs/wiki/monsters-index.md | wc -l
387
$ grep -oE '#em[0-9-]+' docs/wiki/monsters-index.md | sort -u | wc -l
170
$ grep -c '^#.*em0' docs/wiki/monster-status.md
0
$ grep -c '^#.*em0' docs/wiki/monster-drops.md
0
$ grep -c '^#.*em0' docs/wiki/monster-hitzones.md
10      # and these headings slugify to "31-雌火龙em001官方名-…", not "em001"
```

`monster-status.md` and `monster-drops.md` contain no heading at all that carries an `emNNN`
token, so all 258 links into those two pages are dead; the 129 links into `monster-hitzones.md`
miss the slug of every heading it does have. `README.md:35` describes this defect as "§6/§8 仍写
旧页名 hitzones/status/drops，属死链" — the file names are in fact correct; the anchors are not.

### C9 — `farm-trade-canteen.md`: TradeShop string count 145 vs 146, and it is not the source of the place names
Doc: `docs/wiki/farm-trade-canteen.md:14` ("`Lb_TradeShopMsg_chS.gmd #i`（145 条）… 4 个交易地点的官方名与说明").

```
$ node -e "gmd header of chS/table/Lb_TradeShopMsg_chS.gmd"
tradeShop (Lb_TradeShopMsg_chS.gmd): size=13020 count=146 block=6237 group=Lb_TradeShopMsg
$ node -e "count strings containing each zone word in that file"
森林: 0  湿地: 0  沙漠: 0  雪山: 0  海岸: 0  火山: 0  交易: 26
```

The table has 146 strings, not 145, and carries no zone names, so "4 个交易地点的官方名" is
not supported by the cited file. The page's own structure table (§"报酬表结构") says
`meow_location_id 0-5 → 6 个地带`, and the db confirms six:

```
$ select meow_location_id,count(*) from meow_rewards group by 1
0:200  1:216  2:196  3:190  4:193  5:173        (total 1168)
```

so "4 个交易地点" on line 3 and in the source table conflicts with the page's own 6.

### C10 — `monster-status.md`: 野猪王 poison threshold 27 vs db 30, marked `[C]` with no `[X]` note
Doc: `docs/wiki/monster-status.md:102`.

```
$ grep -n '^| 26 |' docs/wiki/monster-status.md
102:| 26 | 野猪王 | 27/100/330 | 90s | 30/100/330 | 30s | … | [C] dttune |
$ select monster_id,status,initial,increase,max,duration from monster_status
  where monster_id=30 and status='Poison'
30 Poison 30 100 330 duration=90
```

The page's stated rule is "`[C]` = romfs 官方数据…并与 `mhgu.db` 对拍", and its own `[X]`
convention exists for exactly this case (compare the 阁螳螂/黑龙 blast notes). This is the only
value-level mismatch found in the whole 92-row table: the other 18 differences are the page
writing `无效` where the db stores `0/0/0`, which is the same statement.

### C11 — `quests.md`: the "148 条（村 75 / 集 73）" and "151 行（村 78 / 集 73）" numbers come from two different datasets
Doc: `docs/wiki/quests.md:143`.

```
$ bun -e "docs/data/quests.json: key+urgent by questType"
{"Village":75,"Hub":73}          total 148
$ bun -e "mhgu.db: quests where type in (1,2) by hub"
Village type1=63 type2=15 -> 78 ;  Guild type1=60 type2=10 -> 70 ;  total 148
```

The sentence correctly attributes 148 (75/73) to `quests.json`, then lists "151 行（村 78 /
集 73）" — 78 is the db's village figure, 73 the JSON's hub figure, and 78+73 is not a count of
anything. Either list 75/73/148 (JSON) or 78/70/148 (db).

### C12 — Citation paths: the wiki cites workspace-level trees that are not in the repo
151 distinct `docs/… | tools/… | MHGU-private/… | .tmp/…` paths are cited. Resolution from the
repository root:

```
$ for p in $(cited paths); do test -e "$p" || test -e "../$p" …; done
OK (repo-relative)      89
only via ../  (parent)  50      e.g. MHGU-private/romfs-extract/** , .tmp/reports-mhgu/**
MISS                    12
$ … the 12 unresolved
.tmp/mhgu/mon/recrown-                                  (regex artifact, not a path)
docs/data/folk-names.json                               ← moves-blademaster-a.md:42
MHGU-private/romfs-extract/player/w07/player/hit/pl_we07_hitdata
        (the real member is pl_we07_hitdata.4e2ef008)
MHGU-private/romfs-extract/gmd/table/GuestHunterMsg_chS.gmd      (…gmd.json)
MHGU-private/romfs-extract/gmd/table/MonsterDemo_chS.gmd         (…gmd.json)
MHGU-private/romfs-extract/em_size_scale_data, …/player/w       (glob placeholders)
MHGU-private/docs/reference/mhxx-wiki/text/18xx.txt             (glob placeholder)
docs/reference/mhxx-wiki/text/1912/1913/2201.txt                (glob placeholder)
MHGU-private/romfs-extract/gmd/table/x_chS.gmd.json             (placeholder)
MHGU-private/romfs-extract/gmd/table/npc/script/npc_NNN_td_chS.gmd.json (placeholder)
```

One is a real dead reference: `docs/data/folk-names.json`, named as "the shared mapping that
will replace folk names" in `moves-blademaster-a.md:42`, is neither present nor generated by
anything in `tools/`. The rest are globs or members whose real name carries a `.<hash>` suffix.

---

## 3. Top 10 discrepancies, both sides in numbers

| # | doc:line | doc says | measured | delta | severity |
|---|---|---|---|---|---|
| 1 | `README.md:146,153,160,166,171,176` | 6 runnable SQL templates | 6/6 fail: `no such column` (name_zh ×4, rank_level/type/rate/count, slot_type, name_en/slots/skill1_points/skill2_points, state/part) | 6 of 6 unusable | P1 |
| 2 | `README.md:5,24` | 37 pages, "全量" | 46 pages on disk (47 files); 9 pages unlisted | −9 pages | P2 |
| 3 | `README.md:38,48,62,65` | 4 pages "未复核（无审核报告）" | `rev-wiki-{hz-all-a,hr-caps,armor-sets,gunner}.md` exist (35 rev-wiki reports total) | 4 wrong status cells | P2 |
| 4 | `monsters-index.md:46+` | 387 topic links | 0 anchors exist: `monster-status`/`monster-drops` have 0 headings with `emNNN`; `monster-hitzones` has 10 but different slugs | 387 dead links | P2 |
| 5 | `README.md:68,205` | 994 采集点位 | 984 (per-map 79/71/53/69/76/65/66/59/80/54/62/44/71/71/64 reproduces exactly) | +10 | P2 |
| 6 | `README.md:39,194` | hitzones-all-b = 484 行 | 513 (509 single-offset rows + 4 collapsed 空槽 rows); page line 6 already says 513 | −29 | P2 |
| 7 | `farm-trade-canteen.md:14` | `Lb_TradeShopMsg_chS.gmd` 145 串, holds the 4 trade locations | stringCount = 146; 0 strings contain 森林/湿地/沙漠/雪山/海岸/火山; `meow_rewards` spans 6 locations (0–5) | +1 string, source misattributed, 4 vs 6 | P3 |
| 8 | `README.md:40` | monster-status `67 [C]/24 [I]` | 70 `[C] dttune` / 22 `[I] db` over 92 rows | +3 / −2 | P3 |
| 9 | `monster-status.md:102` | 野猪王 毒 `27/100/330` `[C]` | db `monster_status` monster 30 Poison = `30/100/330` | −3 on initial, no `[X]` note | P3 |
| 10 | `README.md:194` | hitzones-all-a "未到槽 46" | 42 sections, last is `槽 46 · 岚龙` | stale | P3 |

Two further items that are not numeric but do change what a reader can rely on:

* `README.md:140` asserts the db/JSON carry a `name_zh` column. Neither does; the db has
  `name/_de/_fr/_es/_it/_ja`. Every page that says "db 的 name_zh 是 wiki 译名" inherits this.
* `hitzones-all-a.md:5` says the 10 monsters already covered by `monster-hitzones.md` are
  "本页不重复", but only 5 of them (slots 0, 3, 27, 31, 44) fall inside 0–46; the other 5
  (碎龙 52, 斩龙 64, 电龙 66, 泡狐龙 67, 巨兽 68) are simply out of range. The 42-section
  count is right, the sentence explaining it is not.

---

## 4. VERDICT — one row per file

`status`: **confirmed** = the file's checkable numbers reproduce; **contradiction** = at least
one stated number or reference disagrees with the artefact it cites; **stale** = true when
written, now superseded; **unverified** = no artefact in the repo/ROM can decide it.

| doc | claim checked | status | evidence (command result) |
|---|---|---|---|
| `README.md` | 37 pages, 6 SQL templates, 67/24, 994, 484, 未到槽46, name_zh | **contradiction** | C1–C7 above; 6/6 queries error, 46 pages, 70/22, 984, 513, 槽46 reached, no name_zh column |
| `armor-sets.md` | 1242 series = 236/471/499/36; S203 R59 X294 XR60 GX45 Z16; 无标记 565; 591/591/60; 110/110/16 · 222/222/27 · 241/241/17 · 18/18/0; `item_to_skill_tree` 14,510 | **confirmed** | `armor_families` filters: `% S`=203 (r4–7), `% R`(non-XR)=59 (r4–10), `% X`=294, `% XR`=60, `% GX`=45, `% Z`=16, no-suffix=565; tiers 236/471/499/36; hunter_type splits equal; `item_to_skill_tree`=14,510 |
| `armor-talismans.md` | 5,637 armour; defense 1–140 / 25–180; 0–3 slots; 5,609 pieces; `abd` 22×20; 19 distinct deltas | **confirmed** | `select min/max defense, max_defense` = 1/140, 25/180; slots 0/1/2/3 = 2066/2464/966/141; armour json 1155+1145+1116+1064+1129 = 5609; `abd` 448 B = 8+22×20, row sums {48,50,76,72,132,108,24,25,38,36,82,70,42,38,27,24,50,30,58,35,100,66}; every one of 5,637 db rows has delta ∈ that set, 19 distinct values |
| `damage-formula.md` | phys table `0x01624b4c` = 0.5…1.39; element `0x01624b68` = 0.25…1.2 | **confirmed** | flat = vaddr+0x100: f32 at 0x1624c4c = `0.500 0.750 1.000 1.050 1.200 1.320 1.390`; at 0x1624c68 = `0.250 0.500 0.750 1.000 1.063 1.125 1.200` |
| `decorations.md` | 251 records = 242 + 9 empty at 79/80/82/138/150/179/201/202/205; holes 156/46/40; `.dcd` 275 recipes = 209×1 + 33×2, 725 materials | **confirmed** | parsed `decoData.deco` (1,263 B, count 251): empty exactly at those 9 indices; hole dist 1:156 2:46 3:40; parsed `decoCreate.dcd` (4,408 B, 275 recs): per-item {1:209, 2:33}, materials 725; record 0 = item 2638 ← 339×1 + 616×2, matching the page's byte example |
| `deviants.md` | 18 deviants; 228 Permit quests; every row's reward/HRP | **confirmed** | all 228 `hub='Permit'` rows parse with `reward`/`hrp` equal to db; `permit_monster_id` gives 12 monsters × 16 quests + 6 × 6 = 228 |
| `farm-trade-canteen.md` | `meow_rewards` 1168 / `meow_locations` 6; `Kitchen_chS` 301; `Lb_TradeShopMsg` 145; 4 trade places | **contradiction** | 1168 ✓, 6 ✓, 301 ✓; TradeShop stringCount **146**; 0 zone words in that file; `meow_location_id` 0–5 (6 zones) |
| `gunner-ammo.md` | 32 normal shells; 41 internal shells; `weapons.ammo` = 33 numbers / 32 separators | **confirmed** | §1 has 32 numbered rows, §3 has 41; one `ammo` string: 32 `|`, 33 fields (last empty), 33 digits |
| `hitzones-all-a.md` | 47 slots → 42 monsters; 244 `[C]` normal rows equal db; table offsets 0x8E/0x8F | **confirmed** | 42 sections, last 槽 46; `[C]` normal rows checked 244, mismatching 0 (every `[X]` row does differ and carries a "db 差异" note, e.g. slot 45 金雷公); dttune scan: Head row matches db at 0x8E for em001/002/032/037/081/082/083 and 0x8F for em057/080 |
| `hitzones-all-b.md` | 42 monsters / 513 rows; `[C]`448 `[I]`25 `[B]`35 `[X]`3 `[U]`2; 39 summary rows' base_hp and row counts | **confirmed** | 509 single-offset + 4 collapsed 空槽 rows = 513; markers 448/25/3/2 and 31+4=35 `[B]`; 39 parsed summary rows: db `base_hp` column and db row counts equal, 0 mismatches; em060 sample row block equals `monster_damage` values |
| `hr-caps.md` | 1,355 quests; HR1–12 ladder; `npc_801 #90` quote | **confirmed** | `select count(*) from quests` = 1355; `npc_801_td_chS` strings[20] = "我许可你承接 G★1…", [21] = "被认可为 HR9", [90] = "公会已经对你下发了…解除猎人等级上限的许可" |
| `hunting-horn-songs.md` | 278 melodies; 50 note combos; 75 distinct scores; 49 names; 796 horns / 110 finals; `.fmt` 50, `.fmi` 52, `.fms` 75 | **confirmed** | `horn_melodies` 278 rows, 50 distinct notes, 75 distinct songs, 49 distinct names; `weapons` HH = 796, final = 110; files 158 B/50×3, 632 B/52×12, 383 B/75×5 |
| `hyper-event-quests.md` | 165 hyper quests split 22/32/6/17/32/9/4/43; 166 event split 7/92/67 | **confirmed** | `monster_to_quest hyper=1` grouped: Guild★6 22, ★7 32, stars12 6, 13 17, 14 32, Permit 5+3+1=9, Village★10 4, Event 1+27+2+2+11=43; `hub='Event'` by stars: 4+3=7, 8+5+18+61=92, 2+12+19+34=67 |
| `items-combat.md` | 130 item ids; carry / buy / sell / rarity per row | **confirmed** | 73 regex-parsed rows (6-column layout) compared to `items`: 0 mismatches; 130 distinct `db:<id>` references present in `items` |
| `items-combination.md` | 183 recipes; `.itp` 4,400 B = 8 + 183×24; each row's result/materials/amount/percentage | **confirmed** | `.itp` 4,400 B, count 183, 24 B/rec; 144 rows of the main table compared to `combining` = 0 mismatches; the remaining 39 sit in the transposed "Slickaxe" block, spot-checked (r141 → 318 ← 449×3, r183 → 291 ← 449×2) |
| `items-table.md` | 2,991 records; 2,956 real; 2,866 `[C]`; 90 `[B]`; 0 `[X]` | **confirmed** | 2,866 parsed rows: carry, buy, sell, rarity, English name all equal to `items`, 0 mismatches; 2,956 numbered rows; 90 rows lack db values (`[B]`); `[X]` appears only in prose |
| `maps-gathering.md` | 15 maps / 984 points / 3,231 tables / 15,243 rows; all tables sum to 100 | **confirmed** | position-based count = 984 with the exact 15 per-map numbers; `DISTINCT (location,area,site,rank,fixed,rare,group_num)` = 3,231; map rows 15,243 + non-map 171 = 15,414; tables summing ≠ 100 = 0 |
| `medals-guild-card.md` | 132 medals; 264 strings; name/desc per index | **confirmed** | `GC_Medal_chS.gmd`: size 26,307, stringCount 264, stringBlockSize 16,778 (all as cited); 132 table rows; 132/132 descriptions found verbatim, 130/132 names verbatim (2 cells carry the `Medal_101_1/2` label in the name cell) |
| `monster-drops.md` | 2,032 (monster,rank,channel) groups, 2,030 sum 100, 2 exceptions at Congalala; 8 channels; Rathalos carve lacks plate/ruby/mantle | **confirmed** | groups 2,032 / sum-100 2,030 / exceptions exactly `monster 21 Meowster Hunter` HR and G at 110 (3 rows each); `hunting_rewards.condition` yields the 8 families incl. `Body Gather`; Rathalos `Body Carve` rows are Scale/Shell/Webbing/Flame Sac/Marrow and Shard/Cortex/…/Medulla, no rare drop |
| `monster-habitat.md` | 303 rows; 81 monsters; 233 ailment rows; 66 monsters; 30 labels; 48 without habitat = 12 big + 36 small; 15 locations; per-location monster counts 31/16/16/19/18/21/20/20… | **confirmed** | all four counts equal; 48 = 12 (big) + 36 (small); 15 distinct `location_id`; `count(distinct monster_id)` per location = 31,16,16,19,18,21,20,20,19,17,21,16,18,25,26 |
| `monster-hitzones.md` | 893 rows / 93 monsters; 7 of 10 sample HPs equal db, 3 differ; offsets 0x8E/0x8F | **confirmed** | `monster_damage` 893 rows, 93 distinct monsters; dttune `+0x38`: em001 4500=4500, 002 4200=4200, 032 5000, 037 4200, 057 5300, 081 4500, 082 4600 equal db; em063 4500 vs 4600, em080 4300 vs 4400, em083 5000 vs 5400 differ — exactly the 3 the page names; Head row matches at 0x8E (0x8F for em057/080) |
| `monster-parts-hp.md` | em001 4500 / em002 4200 / em013 9000; `em_nando_tbl` 141×32 B, A 0.1→6.5, B 0.5→21.0 | **confirmed** | dttune `+0x38` = 4500 / 4200 / 9000; `loc/arc/resident.arc :: enemy\resident\em_nando_tbl` = 4,528 B, magic `NAN`, count 141, row0 `0.100,0.500,…`, row140 `6.500,21.000,…` |
| `monster-rage-tired.md` | 65 monsters' exhaust triples | **confirmed** | 65 rows parsed, 0 mismatches against `monster_status.status='Exhaust'` |
| `monster-size-crowns.md` | `SizeTbl` 0–51; `Size` u8 percentage, standard quests mostly 100 | **confirmed** | scanned 1,849 `.ext` × 5 slots (2,672 filled): SizeTbl min 0 / max 51 / 51 distinct; Size = 100 in 2,383 slots, 0 in 161, 26 distinct values. The 88–125 crown scale lives in a save dump → **unverified** here |
| `monster-status.md` | 91 monsters; per-monster thresholds; 70/22 sources | **contradiction (1 value)** | 91 rows matched to `monster_status` by slot→emid; 18 differences are `无效` vs `0/0/0`; the only numeric disagreement is slot 26 野猪王 poison 27 vs db 30 (C10) |
| `monster-weakness-cheatsheet.md` | 93 monsters; cut/impact/shot maxima over 主部位 | **confirmed with a caveat** | 93 rows; 91 reproduce exactly; slots 40 (Agnaktor) and 41 (Alatreon) print their maximum from `(Cool)`/`(Hot/Break)` state rows because those two monsters have no un-suffixed db part — the cells name the state row, so the values are right but the page's "去掉带括号的状态行" rule is not applied |
| `monsters-index.md` | 137 slots = 93 big + 36 small + 1 mech + 7 units; arc id = emid & 0xFF; 387 topic links | **contradiction (links)** | slot map: 94 `big` + 43 `small` = 137; 93 + 1 mech and 36 + 7 units reconcile; emid 513/1025 → arc 001, 4097 → ems001; the 387 anchors are all dead (C8) |
| `motion-values.md` | 870 records over 14 weapons; `w05` missing; per-weapon counts | **confirmed** | `motion-values.json` 14 weapons, 870 records total; counts 61/74/112/36/6/6/85/115/19/4/152/62/58/80; w05 absent |
| `moves-blademaster-a.md` | 61 + 85 + 74 + 152 records; MV values | **confirmed** | 146 record rows (GS+LS full tables) compared to `motion-values.json`: 0 mismatches; per-weapon counts equal |
| `moves-blademaster-b.md` | 229 records (112/36/19/62); MV values | **confirmed** | 229 rows parsed, 0 mismatches |
| `moves-blademaster-c.md` | 253 records (115/80/58); MV values | **confirmed** | 253 rows parsed, 0 mismatches |
| `multiplayer.md` | pool 375/569/228/17/166; HealthTbl 12 vs 17 samples; Difficulty 1 vs 2 | **confirmed** | `quests` group by hub = Village 375, Guild 569, Permit 228, Arena 17, Event 166; `questData_0000303.ext` → monster 0x42, HealthTbl 12, Difficulty 1; `questData_0010107.ext` → HealthTbl 17, Difficulty 2 |
| `palico-prowler.md` | `spt_act_base` 5,165 B / 116 strings / 58 groups; `ot_skl` 192; `cskd` 1,262 B / 66×19 | **confirmed** | extracted from `resident_chS.arc` (119 entries): spt_act_base size 5,165, count 116, block 5,112, nameLen 12 (all as cited); `ot_skl_chS` count 192; `catSkillData.cskd` 1,262 B, count 66, 19 B/rec |
| `palico-skills-full.md` | 95 skills (16+36+43); 57 actions | **confirmed** | 192 = 2×96 groups (k=0 placeholder ⇒ 95) and 116 = 2×58 (k=0 ⇒ 57) from the two GMD tables |
| `progression-unlocks.md` | 16-step deviant ladder; 18 deviants; 22 post-G★4 quests | **confirmed** | 12 permit monsters × 16 + 6 × 6 = 228; `2996.txt` lists 废墟之城 in 23 lines, one of which is the quest title itself ⇒ 22 prerequisite lines |
| `quest-requirements.md` | 1,849 `.ext`, 369 B each; enum 50 values; `Requirement1` 18 values, `Requirement2` 5, `Combo` all 0 | **confirmed** | 1,849 files, 369 B, magic 0x434B0000 in all; R1 distinct 18 (`0:942 1:12 2:1 3:276 4:14 5:29 6:35 7:82 8:209 9:10 10:26 11:20 12:112 19:18 40:1 41:1 45:1 48:60`), R2 distinct 5 (`0:1826 3:4 8:5 45:1 46:13`), Combo `0:1849`; 40/41 land on 0090028/0090029, 45 on 1010005 (DUMMY), r2 45 on 1010103 |
| `quests-g-rank.md` | 27 key/urgent rows with stars/time/reward/fee/HRP | **confirmed** | 27 rows, 0 mismatches; Guild type counts by star 5 / (6+1) / (6+1) / (6+2) |
| `quests-village-hub.md` | 714 rows; per-section counts | **confirmed** | 714 rows: name, reward, HRP, romfs star all equal to db, 0 mismatches; section claims sum to 714 and each equals its row count |
| `quests.md` | 148 key+urgent (75/73) vs 151 listed (78/73) | **stale** | `quests.json` key+urgent = 148 (Village 75 / Hub 73) ✓; db type∈{1,2} = Village 78 / Guild 70 ⇒ the "151 (78/73)" mixes the two datasets (C11) |
| `skill-trees-full.md` | 205 trees / 326 skills / 205 appendix rows; `skt` 206×19; `skd` 328×18; uniform 262 = 1+143+118; flags 170/18/18 | **confirmed** | section row counts 205/326/205; files 3,922 B (206 recs, 19 B) and 5,912 B (328 recs, 18 B); skd tails: all00 1, all01 143, all02 118, non-constant 66 ⇒ 262; skt +0x04 flags: 0×170 (0..143,180..205), 1×18 (144..161), 2×18 (162..179) |
| `skills.md` | 205 trees; 242 decorations (§7 242 rows) | **confirmed** | `skill_trees` 205 rows, §2 tree rows 205, §7 242 rows = `decorations` 242. The "65 composite skills" figure has no machine-checkable definition in the page → **unverified** |
| `small-monsters.md` | 43 units; per-unit HP and 8×10 B table; 2 start offsets 0x8C/0x8E | **confirmed** | 43 `emsNNN_00.arc`; ems001 hp 75 @0x38, table @0x8C = `80/80/80/55/55/55/55/10/100` then `75/75/75/50/50/50/50/10/0`; ems004/023/048 tables at 0x8E with the printed first rows; db small rows in `monster_damage/status/ailment/weakness` = 0 each, `monsters` small rows 36 with `base_hp` all 0 |
| `styles-arts.md` | 66 arts = 10 common + 56×3 = 178 GMD groups; `hunterArtsData_chS` 764 strings; `hta` 191×25 B | **confirmed** | 178×4+52 = 764 = GMD `stringCount`; `hunterArtsData_chS` count 764; `hunterArtsData.hta` 4,783 B = 8+191×25. The per-art MP costs are `[U]` on the page itself → unverified |
| `talisman-sources.md` | `amskl` 8 files = 59/0/71/74/56/105/62/94; `amslt` 21 rows × 4; charm items 353–356; `amlt` 11×9 | **confirmed** | amskl counts 59,0,71,74,56,105,62,94 (4 B/rec, file 01 is an 8 B empty table); four amslt files 92 B = 8+21×4; `items` 353–356 = Mystery/Shining/Timeworn/Enduring; `amuletData.amlt` 107 B = 8+11×9 |
| `valor-alchemy.md` | 12 alchemy products; 英勇/炼金 official strings | **confirmed** | `items` 246–258 = `Alchemy …` (246 is the barrel itself ⇒ 12 products 247–258); `CommonMsg_chS` contains 英勇 (5 strings), 英勇风格, 炼金. The eng-side `Valor Style` string is in `eng/table/HN_HunterTipsMsg_eng.gmd`, not in the chS set → that single citation **unverified** here |
| `weapon-trees.md` | 14 final-form counts, total 1,585 | **confirmed** | `weapons where final=1 group by wtype` reproduces all 14 numbers (107/79/124/136/114/131/108/110/82/126/109/124/108/127) and 1,585 |
| `weapons-overview.md` | 5,685 / 10,877 = 52.2 %, LR 1,224 / HR 2,216 / G 2,245; 277 placeholder ids, 60 empty; 0 two-tier records | **confirmed** | `weapons` 10,877; distinct weapons with a 1966081–1966417 component = 5,685; per prefix 1,224/2,216/2,245; placeholders = 277 of 337 ids; records with 2 prefixes = 0; 5,685/10,877 = 52.26 % |

Status counts over the 47 rows: **confirmed 42** (one of them, `monster-weakness-cheatsheet`,
confirmed with a stated caveat), **contradiction 4** (`README`, `farm-trade-canteen`, `monster-status`,
`monsters-index`), **stale 1** (`quests`). No page is left wholly unverified; the sub-claims that no
artefact can decide (`skills.md` 65 composite skills, `monster-size-crowns` 88-125 crown scale,
`styles-arts` gauge costs, `valor-alchemy` eng-side string) are called out inside their rows and in §6.5.

---

## 5. What was verified but is worth writing down

These are the checks whose result is "the number is right", recorded because a future edit is
much more likely to break them silently than the five findings above.

* **Every item row.** 2,866 rows of `items-table.md` carry `carry / buy / sell / rarity` and an
  English name equal to `items`; the 90 `[B]` rows are exactly the ids with no db row, and the
  page's §2 conflict table is empty because there is no conflict.
* **Every quest row in the two big tables.** 714 (`quests-village-hub`) + 27 (`quests-g-rank`)
  rows reproduce name, reward, HRP, stars/time/fee and key/urgent type from `quests`.
* **Every motion value.** 146 + 229 + 253 = 628 record rows equal `motion-values.json`, which
  itself equals the ROM `pl_weNN_hitdata` counts (61/74/112/36/6/6/85/115/19/4/152/62/58/80).
* **Every `[C]` hitzone row.** 244 rows in `hitzones-all-a` and 448 in `hitzones-all-b` equal
  `monster_damage`; all 12 divergent rows in `hitzones-all-a` are marked `[X]` with the romfs
  value and a "db 差异" footnote (e.g. slot 45 金雷公 Head 55/55/45 vs db 65/65/35).
* **The romfs table headers.** `decoData` 1,263 B/251, `decoCreate` 4,408 B/275, `skt` 3,922
  B/206×19, `skd` 5,912 B/328×18, `itm` 131,612 B/2,991×44, `itp` 4,400 B/183×24, `asd`
  163,457 B/1,287×127, `abd` 448 B/22×20, `fmt` 158 B/50×3, `fmi` 632 B/52×12, `fms` 383 B/75×5,
  `hta` 4,783 B/191×25, `cskd` 1,262 B/66×19, `amlt` 107 B/11×9 — every one matches its citation.
* **The GMD counts.** itemData 5,982, skillTypeData 412, skillData 656, hunterArtsData 764,
  armorSeriesData 12,870, GC_Medal 264, HN_WeaponControlsMsg 695, ot_skl 192, Kitchen 301,
  LbHelp 416, weapon12MsgData 672, fueMusicInfData 156, Lb_ItemBoxMsg 236, researchReinforce 138,
  MonsterDemo 96, HN_MonsterListMsg 220, and monsterName 268 / questMessage 120 inside
  `resident_chS.arc` (119 entries). The unpacker's own index reports 385 files / 61,941 strings /
  0 failures, as `README.md` says.

---

## 6. Difficulties

1. **GMD string indexing is not uniform across files.** `itemData`, `skillData`, `ot_skl` and
   friends put the string block directly after the group name, so `strings[2i]` indexes work.
   `GC_Medal`, `CommonMsg`, `Kitchen`, `LbHelp` and `Lb_ItemBoxMsg` carry a label/hash table
   between the header and the block (field `0x1C`), so a naive split returns 3,599 / 2,267 /
   3,214 tokens instead of 264 / 198 / 301. I verified those files by (a) the header
   `stringCount` and (b) substring presence, not by index. Consequence: for `medals-guild-card`
   I could confirm 132 descriptions verbatim and 130/132 names verbatim (the two `101` variants
   have the label written into the name cell), but I could not verify that string *i* is medal
   *i* — that claim rests on the page's own `index.json` reading.
2. **Two datasets share the name "quests".** `docs/data/quests.json` holds 944 Kiranico-style
   entries (375 Village + 569 Hub) while `mhgu.db.quests` holds 1,355 rows (375/569/228/17/166).
   Key/urgent counts differ (JSON 118+30, db 123+25) and so does the Village/Hub split. Any
   page that quotes a total without naming the dataset is ambiguous; `quests.md` mixes the two
   inside one sentence (C11), which is the only place I found it to actually matter.
3. **The `[C]` marker is overloaded.** In `monster-status`/`monster-rage-tired` it means "romfs
   byte, cross-checked with db"; in `hitzones-all-*` it means "romfs == db for this row"; in
   `moves-*` it means "romfs == JSON". I therefore checked each page's values against the
   specific second source its own §0 names, not against `[C]` as a global promise.
4. **`MHGU-private` and `.tmp` are not in the repo.** 50 of 151 cited paths only resolve from
   `G:/omp works/`, not from `G:/omp works/MHGU/`. I resolved them (they all exist) but did not
   count them as valid repo-relative citations; a reader cloning the repository alone cannot
   follow them.
5. **Not decidable with the artefacts present.** (a) the crown scale 88–125 (needs the save
   dumps under `save-snapshots/` and the emyure draw table, which is not in the 43 extracted
   tables); (b) `styles-arts` per-art gauge costs (the page itself marks them `[U]`);
   (c) `skills.md`'s "65 composite skills" (no definition of "composite" that a query can
   apply — 13 tree names contain `+`, 60 skill names do); (d) the eng-side `Valor Style`
   string; (e) whether the medal bit order equals file order (code-side, page marks it `[I]`).
6. **`maps-gathering`'s §19 SQL is loose, its number is right.** The literal
   `DISTINCT location_id, area, site, rank, group_num` returns 2,476, not 984; the 984 is the
   per-(area,site) maximum over ranks. I reproduced 984 only after reconstructing that rule from
   §0's prose. Anyone re-running the "自查" query as written will conclude the page is broken.
