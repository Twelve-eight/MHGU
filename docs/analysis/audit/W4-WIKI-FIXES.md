# W4-WIKI fixes — README / monsters-index / farm-trade-canteen / monster-status

Upstream report: `docs/analysis/audit/W4-WIKI.md` (47 files, one verdict per file; 42 confirmed, the
defects concentrated in `docs/wiki/README.md`, which is the routing document every other page is read
through). This file records the **2026-11-04 repair round**: what changed, what the text said before,
what it says now, and how every replacement number was re-derived.

Environment:

```
repo   G:/omp works/MHGU        HEAD 03c6544
db     docs/data/mhgu.db        18,333,696 B, 38 user tables (+ sqlite_sequence = 39)
romfs  G:/mhgu-romfs/romfs      (em030_00.arc -> enemy\dt_tune\em030_00_dttune)
gmd    G:/omp works/MHGU-private/romfs-extract/gmd/table/*.gmd.json
runner bun 1.4.0 (bun:sqlite, readonly) — the checkout has no node_modules, so better-sqlite3 is absent
```

---

## 1. Before / after, one row per fixed item

"Before" is quoted from `git show HEAD:docs/wiki/<page>.md`; "after" is the current working copy.
Every row names the check that decides it.

| # | where (HEAD) | before | measured | after |
|---|---|---|---|---|
| 1 | `README.md:144–179` | six SQL templates using `name_zh`, `rank_level`, `rate`, `count`, `slot_type`, `name_en`, `slots`, `skill1_points`, `state`, `part` | 6 of 6 fail (§2); none of those columns exists in `pragma table_info` | rewritten against the real columns; 6/6 run, returning 36 / 39 / 24 / 165 / 3 / 5 rows (§3) |
| 2 | `README.md:5`, `:24` | 「37 个页面」 / 「`docs/wiki/*.md` 全量 37 页」 | 46 pages on disk (47 files with README); 9 pages unlisted | 「46 个页面」 / 「全量 46 页」; 9 rows added, so the index is **46 rows = 46 files, 0 missing / 0 duplicate** |
| 3 | `README.md:38` (hitzones-all-a), `:48` (hr-caps), `:62` (armor-sets), `:65` (gunner-ammo) | all four say 「未复核（无审核报告）」 | `.tmp/reports-mhgu/rev-wiki-{hz-all-a,hr-caps,armor-sets,gunner}.md` all exist | each cell replaced by what its report actually says: HzAllA 「8 monsters byte-checked CONFIRMED, no pending item, no final verdict」; HrCaps / ArmorSets `Verdict: pending`; Gunner `IN PROGRESS`, C5 PASS and C1–C4/C6 open. The legend was reworded and a `W4 PASS` level added |
| 4 | `monsters-index.md:46` onward | 387 `(monster-hitzones\|status\|drops.md#emNNN)` anchors | not one of the three target pages has an `#emNNN` heading (`monster-status`/`monster-drops` carry no heading with an em id; `monster-hitzones` titles read 「3.1 雌火龙（em001，官方名 …）」) | **315 page-level links**: 93 big monsters → hitzone page dispatched by slot (a 42 / b 41 / monster-hitzones 10) + `monster-status.md` + `monster-drops.md`; 36 small monsters → `small-monsters.md` (none of the three topic pages has small-monster rows). No fragment is left. §6 rewritten against the real page structure |
| 5 | `README.md:68`, `:205` | 994 gathering points | 984 (per (area,site), the maximum over ranks; only a naive `DISTINCT group_num` yields 994) | 984, with the counting rule spelled out in §一 |
| 6 | `README.md:39`, `:194` | hitzones-all-b 「484 行」 | 513 (509 single-offset rows + 4 collapsed 「空槽」 rows; the page's own line 6 already said 513) | 513 in both places |
| 7 | `README.md:40` | monster-status 「67 `[C]`/24 `[I]`」 | 70 `[C] dttune` / 22 `[I] db` over 92 rows (91 monsters + the extra normal-Fatalis row) | 70/22 |
| 8 | `README.md:194` | hitzones-all-a 「仍在逐槽追加（未到槽 46）」 | 42 `### 槽` sections, the last one `槽 46 · 岚龙`; slots 0/3/27/31/44 have their `_00` table in `monster-hitzones.md` §3.1–3.5 | the gap row is struck through and closed, naming 42 monsters, the last section, and where the other 5 live |
| 9 | `farm-trade-canteen.md:14` | `Lb_TradeShopMsg_chS.gmd` 「145 条」, holding 「4 个交易地点的官方名与说明」 | `stringCount = 146`; the four place names are `#22`–`#25` (暖呼呼农场 / 浆波菇菇山 / 摩加养蜂联合 / 丹治亚海鲜鱼市) and their descriptions `#89`–`#92` | 「146 条」; the citation now names `#22`–`#25` and `#89`–`#92` separately, and §2.3 gained one sentence separating `meow_locations`' six rows from these four places |
| 10 | `monster-status.md:102` | 野猪王 poison `27/100/330`, source `[C] dttune`, no note about the db | db `monster_status` (monster 30, Poison) = `30/100/330`, 90 s; romfs `em030_00@0x210` = `27/300/10/5400/100/330` → initial 27, increase 100, max 330, 5400 frames = 90 s | romfs value kept (it is the game's data); the cell now reads `27/100/330（db 30）` and a table note records it as the only romfs↔db value difference in the whole table (the other 18 are db `0/0/0` immunity rows) |

### 1.1 Further defects fixed inside the same two sections

These four are in the passages under repair (the db section and the query recipes), so they were
fixed with them rather than deferred.

| # | where | before | measured | after |
|---|---|---|---|---|
| 11 | `README.md:140` | 「db/JSON 的 `name_zh` 字段是 wiki 译名」 | `select name_zh from monsters` → `no such column`; `name_zh` occurs 0 times in `items.json` / `monsters.json` / `quests.json` (only `name` + `name_de/_fr/_es/_it/_ja`) | 「db and JSON carry no `name_zh` — the original/English name is `name`, the translations are `name_*`; Chinese names come from the GMD extract」 |
| 12 | `README.md:181` | `sort_order` = 「编辑器 questId，村 10k/集 20k/G 30k/Event 41k–44k」; also `target_type`, `map`, `hunting_rewards.type`, `time_limit(秒)` | `sort_order` is a 0–1,354 sequence number (`quests._id` is the row id, 101–1,120,012); `target_type` / `map` / `type` do not exist; `time_limit ∈ {30,35,50}`, i.e. minutes | rewritten: `_id` / `sort_order` (with the bit-id space) / `hub` / `type`(0/1/2) / `stars` / `goal_type` / `time_limit` (minutes) / `reward,fee,hrp` / `location_id`; the channel column is `hunting_rewards.condition` |
| 13 | `README.md:133–134` | 「Node（仓库已有依赖 better-sqlite3）」 | `node -e require('better-sqlite3')` → `MODULE_NOT_FOUND` (no node_modules in the checkout) | a `bun -e` recipe was added (verified working) and the Node line now says it needs `npm i better-sqlite3` |
| 14 | `README.md` §二 routing | none of the 9 unlisted pages was reachable from the routing table | — | 7 existing cells extended with 8 pages (`deviants`, `quests-village-hub`, `quests-g-rank`, `monster-weakness-cheatsheet`, `talisman-sources`, `weapon-trees`, `items-table`, `palico-skills-full`), plus one new row 「大小金冠 / 体型 → `monster-size-crowns.md`」 |

---

## 2. The six templates as they were — errors verbatim

Extracted from `git show HEAD:docs/wiki/README.md`, split on `;\n`, run readonly against
`docs/data/mhgu.db` with `bun:sqlite`. Nothing was edited before running.

```text
R1: ERROR no such column: m.name_zh
R2: ERROR no such column: q.name_zh
R3: ERROR near "<": syntax error
R4: ERROR no such column: q.name_zh
R5: ERROR no such column: d.name_en
R6: ERROR no such column: state
```

R3 reports the `<questId>` placeholder as a syntax error; with the placeholder replaced by a
subquery that resolves to a quest, the error moves to the column, matching upstream C1:

```text
SELECT ... qr.slot_type ... WHERE qr.quest_id = (SELECT _id FROM quests WHERE sort_order = 0) AND qr.slot_type IS NOT NULL
  ->  ERR no such column: qr.slot_type
```

---

## 3. The six templates as they are — outputs

Verification method: **the statements are extracted from the repaired `docs/wiki/README.md`**
(not retyped), split on `;\n` and executed one by one:

```text
$ bun .tmp/w4fix/run-tpl.cjs     # parses the sql fence out of docs/wiki/README.md
6 statements; bytes 12887
```

### T1 · ① 某素材哪里掉（全通道反查；`items.name` 是英文名，中文名只在 chS GMD 里）

rows = 36

| monster | rank | condition | percentage | stack_size |
|---|---|---|---|---|
| Agnaktor | G | Break Head | 6 | 1 |
| Agnaktor | G | Break Fin | 4 | 1 |
| Agnaktor | G | Capture | 3 | 1 |
| Barioth | G | Tail Carve | 4 | 1 |
| Barioth | G | Capture | 4 | 1 |
| Barroth | G | Tail Carve | 3 | 1 |
| Barroth | G | Mining | 3 | 1 |
| Barroth | G | Capture | 3 | 1 |
| Basarios | G | Body Carve | 3 | 1 |
| Bloodbath Diablos | G | Body Carve G1-2 | 5 | 1 |
| Bloodbath Diablos | G | Body Carve G3-4 | 5 | 1 |
| Bloodbath Diablos | G | Body Carve G5-6 | 5 | 1 |
| Bloodbath Diablos | G | Tail Carve G1-2 | 4 | 1 |
| Bloodbath Diablos | G | Tail Carve G3-4 | 4 | 1 |
| Bloodbath Diablos | G | Tail Carve G5-6 | 4 | 1 |
| Bloodbath Diablos | G | Capture G1-2 | 4 | 1 |
| Bloodbath Diablos | G | Capture G3-4 | 4 | 1 |
| Bloodbath Diablos | G | Capture G5-6 | 4 | 1 |
| Bloodbath Diablos | G | Shiny G1-2 | 2 | 1 |
| Bloodbath Diablos | G | Shiny G3-4 | 2 | 1 |
| Bloodbath Diablos | G | Shiny G5-6 | 2 | 1 |
| Crystalbeard Uragaan | G | Mining G5-6 | 8 | 1 |
| Crystalbeard Uragaan | G | Mining G1-2 | 5 | 1 |
| Crystalbeard Uragaan | G | Mining G3-4 | 5 | 1 |
| Diablos | G | Body Carve | 5 | 1 |
| Diablos | G | Tail Carve | 4 | 1 |
| Diablos | G | Capture | 4 | 1 |
| Diablos | G | Shiny | 2 | 1 |
| Gravios | G | Body Carve | 7 | 1 |
| Khezu | G | Body Carve | 4 | 1 |
| Lavasioth | G | Body Carve | 5 | 1 |
| Najarala | G | Capture | 4 | 1 |
| Plesioth | G | Body Carve | 5 | 1 |
| Plesioth | G | Capture | 3 | 1 |
| Royal Ludroth | G | Capture | 3 | 1 |
| Royal Ludroth | G | Tail Carve | 2 | 1 |

### T2 · ② 某怪出现在哪些任务（`unstable` = 乱入，`hyper` = 狞猛化）

rows = 39

| sort_order | hub | stars | name | unstable | hyper |
|---|---|---|---|---|---|
| 86 | Village | 4 | Wyvern of the Wind | 0 | 0 |
| 89 | Village | 4 | A Unique Cuppa | 0 | 0 |
| 98 | Village | 4 | Hungry Eyes | 0 | 0 |
| 157 | Village | 6 | Advanced: Fungus Fetchin' | 1 | 0 |
| 171 | Village | 6 | Advanced: Might is Right | 0 | 0 |
| 176 | Village | 6 | Advanced: Out of the Fry Pan | 0 | 0 |
| 224 | Village | 8 | Airship Upgrade: Nargacuga | 0 | 0 |
| 226 | Village | 8 | A Trace of Light | 0 | 0 |
| 235 | Village | 8 | The Furtilizer That Time Furgot | 0 | 0 |
| 242 | Village | 8 | The Way of the Nargacuga | 0 | 0 |
| 258 | Village | 9 | Soap Opera | 1 | 0 |
| 284 | Village | 9 | Jurassic Frontier Fracas | 0 | 0 |
| 321 | Village | 10 | Advanced: Moonlight Zinogre | 1 | 0 |
| 330 | Village | 10 | Advanced: Monster Hunter! | 0 | 0 |
| 380 | Guild | 2 | Operation: Secure Specimen | 0 | 0 |
| 383 | Guild | 2 | Bye Bye Jaggia | 0 | 0 |
| 385 | Guild | 2 | Wyvern of the Wind | 0 | 0 |
| 488 | Guild | 5 | Nargacuga Throwdown | 0 | 0 |
| 535 | Guild | 6 | Surrounded by Bubbles | 1 | 0 |
| 548 | Guild | 6 | Wild Gunman | 0 | 0 |
| 563 | Guild | 6 | Born of Darkness | 0 | 1 |
| 598 | Guild | 7 | The Gathering Storm | 0 | 0 |
| 693 | Guild | 12 | Face-off in the Jungle | 0 | 0 |
| 694 | Guild | 12 | Hit the Lights | 0 | 0 |
| 710 | Guild | 12 | Jumping at Shadows | 0 | 0 |
| 735 | Guild | 13 | Water Kerfuffle | 1 | 0 |
| 750 | Guild | 13 | Howl at the Moon | 1 | 0 |
| 772 | Guild | 13 | Nargacuga in the Jurassic Frontier | 0 | 1 |
| 806 | Guild | 14 | Quest of Friendship | 0 | 0 |
| 834 | Guild | 14 | Jungle Funk | 0 | 1 |
| 937 | Guild | 13 | Lucky Jungle Cat | 0 | 0 |
| 1027 | Permit | 4 | Silverwind IV: Hunt | 0 | 0 |
| 1064 | Permit | 9 | Deadeye IX: Hunt | 0 | 0 |
| 1225 | Event | 7 | Capcom: White & Black | 0 | 1 |
| 1253 | Event | 7 | The Best of the Best | 0 | 0 |
| 1306 | Event | 14 | Monster Hunter Channel I | 0 | 1 |
| 1334 | Event | 6 | Event: Hunt-a-thon 1 | 0 | 0 |
| 1341 | Event | 6 | Event: Slay a Nargacuga | 0 | 0 |
| 1345 | Event | 12 | XX Trials: Nargacuga | 0 | 0 |

### T3 · ③ 某任务报酬（外键是 `quests._id`；只知道 `sort_order` 时先反查 _id）

rows = 24

| reward_slot | name | percentage | stack_size |
|---|---|---|---|
| A | Herb | 100 | 3 |
| A | Ivy | 20 | 2 |
| A | Sap Plant | 20 | 2 |
| A | Herb | 15 | 3 |
| A | Antidote Herb | 15 | 2 |
| A | Felvine | 15 | 3 |
| A | Snow Herb | 15 | 2 |
| B | Blue Mushroom | 15 | 1 |
| B | Herb | 14 | 1 |
| B | Honey | 10 | 1 |
| B | Nitroshroom | 8 | 1 |
| B | Sap Plant | 8 | 1 |
| B | Paintberry | 8 | 1 |
| B | Bitterbug | 8 | 1 |
| B | Power Jelly | 8 | 1 |
| B | Heavy Jelly | 8 | 1 |
| B | Speed Jelly | 8 | 1 |
| B | Machalite Ore | 5 | 1 |
| Sub | Blue Mushroom | 34 | 3 |
| Sub | Mopeshroom | 20 | 2 |
| Sub | Nitroshroom | 20 | 2 |
| Sub | Toadstool | 10 | 2 |
| Sub | Mopeshroom | 8 | 3 |
| Sub | Toadstool | 8 | 3 |

### T4 · ④ 全狞猛化任务清单（同一任务可能登记多只狞猛怪，按 q._id 去重）

rows = 165

| sort_order | hub | stars | name |
|---|---|---|---|
| 331 | Village | 10 | Advanced: Proof of a Champion |
| 332 | Village | 10 | Advanced: Wycademy Challenge |
| 333 | Village | 10 | Advanced: Guild's Greatest Hit |
| 334 | Village | 10 | Advanced: Ultimate Generation |
| 555 | Guild | 6 | Miasma Attack |
| 556 | Guild | 6 | Stop the Wacha! |
| 557 | Guild | 6 | We Are Not Amused |
| 558 | Guild | 6 | Zamtrios Fight! |
| 559 | Guild | 6 | The Frog of War |
| 560 | Guild | 6 | Triple Toady Terror |
| 561 | Guild | 6 | The Coal Still Burns |
| 562 | Guild | 6 | Woe Malfestio |
| 563 | Guild | 6 | Born of Darkness |
| 564 | Guild | 6 | Nibeling on Apples |
| 565 | Guild | 6 | Warning: Hyper Yian Garuga! |
| 566 | Guild | 6 | Hyper for Holes |
| 567 | Guild | 6 | The Plesioth Adventure |
| 568 | Guild | 6 | Daimyo of the Deserted Island |
| 569 | Guild | 6 | Where the Wild Manes Are |
| 570 | Guild | 6 | Hyper Investigation |
| 571 | Guild | 6 | The Khezu and the Shadow |
| 572 | Guild | 6 | Bring On the Shogun |
| 573 | Guild | 6 | Unnerving Najarala |
| 574 | Guild | 6 | Eruption Embodied |
| 575 | Guild | 6 | The Magma's Rage |
| 576 | Guild | 6 | Minion Audition Imposition |
| 600 | Guild | 7 | Putting the Gore in Magala |
| 601 | Guild | 7 | Steppe in the Right Direction |
| 602 | Guild | 7 | Tigrex, Tigrex, Burning Bright |
| 603 | Guild | 7 | A Thousand Blades of Wrath |
| 604 | Guild | 7 | A Fiery Temper |
| 605 | Guild | 7 | The Unassailable Seltas Queen |
| 606 | Guild | 7 | Rajang's Black Spirit |
| 607 | Guild | 7 | Savage Sword of the Desert |
| 608 | Guild | 7 | Wyvernlit Evening |
| 609 | Guild | 7 | Wyverns All Around Us |
| 610 | Guild | 7 | Wild Gods, Calm Rangers |
| 611 | Guild | 7 | Into the Maelstrom |
| 612 | Guild | 7 | The Lithe and Unbreaking |
| 613 | Guild | 7 | The Peril of the Land |
| 614 | Guild | 7 | The Wolf and the Footbath |
| 615 | Guild | 7 | The Thieving Gypceros |
| 616 | Guild | 7 | Steam and Smoke |
| 617 | Guild | 7 | The Glowing Embers |
| 618 | Guild | 7 | Primal Forest Defense |
| 619 | Guild | 7 | The End of the Trials |
| 620 | Guild | 7 | The Descending Fog |
| 621 | Guild | 7 | Searching for Secret Baths |
| 622 | Guild | 7 | Show Me Your Shaka-Strength |
| 623 | Guild | 7 | The Marshlands Nightmare |
| 624 | Guild | 7 | The Birds of Prey |
| 625 | Guild | 7 | The Fanged Beasts |
| 626 | Guild | 7 | The Winged Wyverns |
| 627 | Guild | 7 | The Foes of the Deep |
| 628 | Guild | 7 | The Beasts of Brawn |
| 632 | Guild | 7 | Following the Fallen |
| 633 | Guild | 7 | Fool's Gold |
| 634 | Guild | 7 | Shining Examples |
| 721 | Guild | 12 | So Notable: Hyper Hermitaur |
| 722 | Guild | 12 | Revenge from the Skies |
| 723 | Guild | 12 | Commission: Hyper Kecha Wacha |
| 724 | Guild | 12 | Frog's Face, Demon's Heart |
| 725 | Guild | 12 | The Verdant Hills Are Alive |
| 726 | Guild | 12 | The Hype is Royal |
| 762 | Guild | 13 | Trial by Fart |
| 763 | Guild | 13 | The Pinnacle of Good Records |
| 764 | Guild | 13 | The Pinnacle of Terror |
| 765 | Guild | 13 | Eat in Pieces |
| 766 | Guild | 13 | Diabolical Deluge |
| 767 | Guild | 13 | Temnoceranophobia |
| 768 | Guild | 13 | ...Or Just Wait for It to Poop |
| 769 | Guild | 13 | Zamtrios, Right Ahead! |
| 770 | Guild | 13 | Frozen Seaway Horror Story |
| 771 | Guild | 13 | Sweets for My Sweets |
| 772 | Guild | 13 | Nargacuga in the Jurassic Frontier |
| 773 | Guild | 13 | The Mud Must Flow |
| 774 | Guild | 13 | Shhhhut Up |
| 775 | Guild | 13 | No Place to Run |
| 776 | Guild | 13 | It's a Miner's Life |
| 777 | Guild | 13 | Let the Games Begin |
| 778 | Guild | 13 | Material Old Girl |
| 809 | Guild | 14 | Pitched Pinnacle Battle |
| 810 | Guild | 14 | All Creatures Cleaved and Small |
| 811 | Guild | 14 | Backwater Battle |
| 812 | Guild | 14 | Rajang Against The Machine |
| 813 | Guild | 14 | Seeking the Sea King |
| 814 | Guild | 14 | If These Rocks Could Talk |
| 815 | Guild | 14 | Appeal from Authority |
| 816 | Guild | 14 | Neopteronophobia |
| 817 | Guild | 14 | It Takes Mizutsune to Tango |
| 818 | Guild | 14 | Something Wicked |
| 819 | Guild | 14 | Setting the Barioth High |
| 820 | Guild | 14 | The Big Push |
| 821 | Guild | 14 | What's Mine is Mine |
| 822 | Guild | 14 | Agnaktor's Deep |
| 823 | Guild | 14 | Garuga's Comeuppance |
| 824 | Guild | 14 | Seregios Exposé |
| 825 | Guild | 14 | Tigrex Trap |
| 826 | Guild | 14 | Zinogre-enthusiasm |
| 827 | Guild | 14 | Even Brachydios Need A Holiday |
| 828 | Guild | 14 | Marshland Fandango |
| 829 | Guild | 14 | Let's Get Igneous |
| 830 | Guild | 14 | R.I.P. |
| 831 | Guild | 14 | Death at My Greaves |
| 832 | Guild | 14 | Pinnacle Problems |
| 833 | Guild | 14 | A Bed of Sand |
| 834 | Guild | 14 | Jungle Funk |
| 835 | Guild | 14 | Arctic Ridge Allegiances |
| 836 | Guild | 14 | Arena Allegiances |
| 837 | Guild | 14 | Path of the Hunter |
| 841 | Guild | 14 | By the Light of the Silvery Rath |
| 842 | Guild | 14 | A Jurassic Frontier Just for You |
| 843 | Guild | 14 | A Tragedy in Silver and Gold |
| 956 | Permit | 13 | Redhelm G3: Hunt |
| 1052 | Permit | 13 | Crystalbeard G3: Hunt |
| 1102 | Permit | 15 | Thunderlord G5: Hunt |
| 1132 | Permit | 13 | Hellblade G3: Hunt |
| 1138 | Permit | 13 | Nightcloak G3: Hunt |
| 1144 | Permit | 13 | Rustrazor G3: Hunt |
| 1157 | Permit | 14 | Boltreaver G4: Hunt |
| 1163 | Permit | 14 | Elderfrost G4: Hunt |
| 1169 | Permit | 14 | Bloodbath G4: Hunt |
| 1198 | Event | 7 | Fire Emblem: Warding Despair |
| 1200 | Event | 6 | Okami: Most Wanted |
| 1201 | Event | 7 | Ghosts 'n Goblins: Seeing Red |
| 1204 | Event | 7 | Baki: Biggest vs. Strongest |
| 1206 | Event | 7 | Ushio & Tora: White Mizutsune |
| 1207 | Event | 7 | Magi: Rescue from the Fall |
| 1210 | Event | 7 | Jump: Boiling Magma |
| 1212 | Event | 7 | Dengeki: Turbulent Seas |
| 1214 | Event | 7 | Star Fox: Battle at Arctic Ridge |
| 1216 | Event | 7 | Metroid: Special Mission |
| 1218 | Event | 7 | The Voracious King |
| 1219 | Event | 7 | DMC: The Seltas Queen's Cry |
| 1220 | Event | 7 | Mega Man: Yellow Devil |
| 1221 | Event | 7 | Capcom: Brilliant Orchestra |
| 1225 | Event | 7 | Capcom: White & Black |
| 1229 | Event | 7 | All's Hair in Glove & War |
| 1230 | Event | 7 | A Golden Moon Rises |
| 1231 | Event | 7 | Silver and Gold |
| 1232 | Event | 7 | Secret Nibelsnarf Hunt |
| 1233 | Event | 7 | The Obvious Choice... |
| 1234 | Event | 7 | It Would Be a Shame If... |
| 1235 | Event | 7 | Not Stepping One Foot... |
| 1236 | Event | 7 | Picturesque Encounter |
| 1237 | Event | 7 | Absolute Power |
| 1245 | Event | 7 | The Five Kings of Destruction |
| 1246 | Event | 7 | How It's Done |
| 1255 | Event | 7 | Retreat Run-in |
| 1268 | Event | 12 | Famitsu: Kecha the Scoop! |
| 1270 | Event | 12 | Kingdom: Test of the Best! |
| 1271 | Event | 14 | Case Closed: Desert Arrest! |
| 1272 | Event | 13 | Shonen: Winged Nocturne |
| 1273 | Event | 14 | Drifters: Isle of Lost Souls |
| 1275 | Event | 14 | Into the Maw of Darkness |
| 1276 | Event | 14 | Fan Club: Climbing The Ranks |
| 1279 | Event | 13 | Nerscylla Nightmare |
| 1283 | Event | 14 | Glimmers of False Hope |
| 1285 | Event | 14 | Violence in the Verdure |
| 1286 | Event | 14 | Paws Off My Fish! |
| 1287 | Event | 14 | Big, Bad 'n' Woolly |
| 1288 | Event | 14 | Blade Blazing Brightly Black |
| 1306 | Event | 14 | Monster Hunter Channel I |
| 1307 | Event | 14 | Monster Hunter Channel II |
| 1336 | Event | 7 | Event: Hunt-a-thon 3 |

### T5 · ⑤ 某技能树的珠（孔数在 `decorations.num_slots`，点数在 `item_to_skill_tree.point_value`）

rows = 3

| name | slots | point_value |
|---|---|---|
| Expert Jwl 1 | 1 | 1 |
| Expert Jwl 2 | 2 | 3 |
| Expert Jwl 3 | 3 | 5 |

### T6 · ⑥ 某怪的状态行肉质（「状态行」= `body_part` 的括号后缀，如 `Head (Enraged)`；没有独立 state 列）

rows = 5

| body_part | cut | impact | shot | fire | water | thunder | ice | dragon | ko |
|---|---|---|---|---|---|---|---|---|---|
| Head (Enraged) | 70 | 65 | 60 | 0 | 10 | 20 | 5 | 15 | 130 |
| Neck (Enraged) | 44 | 44 | 30 | 0 | 10 | 20 | 5 | 15 | 0 |
| Belly (Enraged) | 30 | 35 | 20 | 15 | 15 | 15 | 10 | 15 | 0 |
| Back (Enraged) | 40 | 35 | 35 | 0 | 15 | 25 | 10 | 5 | 0 |
| Front Legs (Enraged) | 30 | 30 | 25 | 0 | 10 | 15 | 10 | 10 | 0 |

---

## 4. Verification

### 4.1 Columns the templates rely on

```text
pragma table_info(hunting_rewards) -> _id,item_id,condition,monster_id,rank,stack_size,percentage
pragma table_info(quests)          -> _id,sort_order,name,name_de,name_fr,name_es,name_it,name_ja,...,hub,type,stars,location_id,time_limit,...,hrp,...
pragma table_info(quest_rewards)   -> _id,quest_id,item_id,reward_slot,percentage,stack_size
pragma table_info(decorations)     -> _id,num_slots
pragma table_info(monster_damage)  -> _id,monster_id,body_part,cut,impact,shot,fire,water,ice,thunder,dragon,ko
```

The six templates use only those plus `items.name`, `monsters.name`, `monster_to_quest.unstable,hyper`,
`item_to_skill_tree.point_value` and `skill_trees.name` — every one of them exists.

### 4.2 Index and links

```text
index rows at HEAD            37
index rows now                46
docs/wiki/*.md (minus README) 46      -> 46 rows, missing 0 / extra 0 / duplicate 0
monsters-index #em fragments at HEAD  387 dead anchors (396 "#em" occurrences incl. the §6 examples)
monsters-index #em fragments now      0
monsters-index .md links now          315, every one of them fs.existsSync-true (dead 0)
```

315 = 93 big monsters × 3 + 36 small monsters × 1. The big-monster hitzone target is not a guess:
the script first builds slot sets from `### 槽 N` in `hitzones-all-a.md` and `### 3.N …（slot N，`
in `hitzones-all-b.md`, then checks that the linked page really has a section for that slot
(93/93 hit; the 10 rows pointing at `monster-hitzones.md` were checked by em id, 10/10).

### 4.3 The other numbers

```text
gathering points   per (area,site) max over ranks = 984; per map
                   79/71/53/69/76/65/66/59/80/54/62/44/71/71/64 (equal to maps-gathering.md)
                   naive DISTINCT including rank = 2,476; excluding rank = 994
hitzones-all-b     42 monsters / 513 rows (page line 6)
monster-status     92 rows: 70 [C] dttune + 22 [I] db
hyper quests       distinct q._id = 165
meow_rewards       0:200 1:216 2:196 3:190 4:193 5:173 (6 zones, 1168 rows total)
TradeShop          stringCount = 146; #22–#25 = the four place names, #89–#92 = their descriptions
em030_00           0x210 = 27/300/10/5400/100/330 (u16×6: initial/A/B/frames/increase/max)
```

### 4.4 Gate

```text
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 27 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): docs/analysis/audit/LINK-DATA-SIDE.md, docs/analysis/audit/LINK-INVENTORY.md, docs/analysis/audit/LINK-MECHANICS-CODE.md
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
note tier A now 25584 functions / 57.7% of instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

> The `note N doc(s)` line is not a failure: it counts documents created after 2026-11-03 that
> are not in the frozen `MANIFEST.tsv`, and this file is one of them (N moved from 26 to 27 while this
> round was running because another session added a document). Adding this file to MANIFEST would also
> require a verdict in `ROUND1-ALL.tsv`, so those two tables were left untouched.

Gate 4 runs `tools/mhgu/coverage/report.mjs`, which rewrites
`docs/analysis/code/inventory/coverage-report.tsv`. `git hash-object` was taken before and after for
the five tracked files those tools write: `RETILE.md`, `coverage-report.tsv`, `spread-votes.tsv`,
`tiers-merged.csv`, `docs/data/functions-retile.csv.gz` — **all five still equal HEAD**, so no
regenerated number was left behind.

---

## 5. Two places where the upstream report is wrong

1. **`farm-trade-canteen.md:14`'s 「4 个交易地点」 is not a defect.** W4-WIKI C9 searched that file for
   森林/湿地/沙漠/雪山/海岸/火山, found none, and concluded the four trade place names had no source.
   Wrong probe: the places are `#22`–`#25` — `PokapokaFarm` 暖呼呼农场, `JumboMushroomMountain`
   浆波菇菇山, `MogaBeekeepingUnion` 摩加养蜂联合, `TanjiaFishMarket` 丹治亚海鲜鱼市 — none of which
   contains a terrain word, and their descriptions sit at `#89`–`#92`. Only the count was wrong
   (145 → 146); the place-name half of the claim stands, and the citation now carries the indices.
2. **The four trade places and `meow_locations`' six rows are different objects.** The upstream report
   read them as a contradiction. In fact the six `meow_locations` rows are the Meowster Hunter
   exploration zones (`Forest`/`Wetlands`/`Desert`/`Tundra`/`Coast`/`Volcano`, as the page's §5 already
   said), while the trade window's four places come from `Lb_TradeShopMsg_chS`. §2.3 now states the
   separation so the next pass does not file it again.

---

## 6. Files changed

| file | change |
|---|---|
| `docs/wiki/README.md` | index 37 → 46 pages and 9 new rows; 4 status cells; 994 → 984; 484 → 513; 67/24 → 70/22; gap row closed; connection recipes, `name_zh` note, the six SQL templates, `quests` key columns; §二 routing extended in 7 cells + 1 new row |
| `docs/wiki/monsters-index.md` | the 「专题页」 cell of all 129 rows (387 dead anchors → 315 resolvable page-level links); §0 column definition and §6 link convention rewritten |
| `docs/wiki/farm-trade-canteen.md` | `:14` 145 → 146 with `#22`–`#25` / `#89`–`#92`; one sentence in §2.3 separating `meow_locations` |
| `docs/wiki/monster-status.md` | `:102` cell gains `（db 30）`; a table note records the slot-26 romfs↔db difference |

Untouched: `docs/patches/item-box-v7-plugin-spec.md`, `docs/reference/SUBAGENT-LEDGER.md`,
`docs/reference/formats/rem.md`, `docs/reference/re-*.md`, `docs/reference/suyu/README.md`,
`docs/analysis/audit/LINK-STATUS.tsv` — the tree was clean when this round started and those files
went dirty mid-run from other sessions; they are not part of this diff.

### Reproduction scripts (scratch, under `.tmp/`, not committed)

All replacement, sampling and execution scripts of this round live in `MHGU/.tmp/w4fix/` (`.gitignore`
line 66 excludes `.tmp/`; the directory is not a deliverable): `map.cjs` (slot → page dispatch and
per-row check), `patch-*.cjs` (one replacement per defect, each with a hit-count assertion),
`run-tpl.cjs` (parse the `sql` fence out of README and run it), `run-old.cjs` (HEAD templates, errors),
`evidence.cjs` (before/after numbers). Deleting them changes no conclusion here — every number in §1
can be re-derived with the commands in §2–§4.
