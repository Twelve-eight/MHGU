# LINK-DATA-SIDE — data-side prose vs the database it describes

Scope: `docs/data/README.md`, `docs/data/json/README.md`, and every numeric claim in
`docs/mechanics/monsters.md`, `quests.md`, `equipment.md`, `skills-arts.md` that a query can settle.
Read-only; nothing in the repo was modified except this file.

Harness used for every SQL below (bun 1.4.0, bun:sqlite, `readonly: true`):

```
bun -e "import {Database} from 'bun:sqlite';
const db=new Database('docs/data/mhgu.db',{readonly:true});
console.log(db.query('<SQL>').all())"
```

Gate run first, as required (`node tools/audit/check.mjs`, tail):

```
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans
ALL PASS
Wall time: 2.57 seconds
```

12 gates PASS. The FK gate's own numbers are re-derived independently in section C below.

---

## CONFIRMED — claim, where stated, command, output

All values below were recomputed; the "db value" column is the value the query printed on 2026-11-04.

### A. `docs/data/README.md` — table inventory (L27–L54)

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| README.md:27 | "18MB SQLite / 38 张用户表（计入 `sqlite_sequence` 共 39 个表）" | `select count(*) from sqlite_master where type='table'`; `ls -l docs/data/mhgu.db` | 39 tables (38 without `sqlite_sequence`); file 18,333,696 B (18.3 MB / 17.5 MiB) | CONFIRMED |
| README.md:31 | monsters 129 | `select count(*) from monsters` | 129 | CONFIRMED |
| README.md:32 | monster_damage 893 | `select count(*) from monster_damage` | 893 | CONFIRMED |
| README.md:33 | monster_weakness 108 | `select count(*) from monster_weakness` | 108 | CONFIRMED |
| README.md:34 | monster_status 728 | `select count(*) from monster_status` | 728 | CONFIRMED |
| README.md:35 | monster_to_quest 2305 | `select count(*) from monster_to_quest` | 2305 | CONFIRMED |
| README.md:36 | quests 1355 | `select count(*) from quests` | 1355 | CONFIRMED |
| README.md:37 | quest_rewards 37370 | `select count(*) from quest_rewards` | 37,370 | CONFIRMED |
| README.md:38 | items 21153 | `select count(*) from items` | 21,153 | CONFIRMED |
| README.md:39 | weapons 10877 | `select count(*) from weapons` | 10,877 | CONFIRMED |
| README.md:40 | armor 5637 | `select count(*) from armor` | 5,637 | CONFIRMED |
| README.md:41 | decorations 242 | `select count(*) from decorations` | 242 | CONFIRMED |
| README.md:42 | skills 326 | `select count(*) from skills` | 326 | CONFIRMED |
| README.md:43 | skill_trees 205 | `select count(*) from skill_trees` | 205 | CONFIRMED |
| README.md:44 | combining 183 | `select count(*) from combining` | 183 | CONFIRMED |
| README.md:45 | gathering 15414 | `select count(*) from gathering` | 15,414 | CONFIRMED |
| README.md:46 | horn_melodies 278 | `select count(*) from horn_melodies` | 278 | CONFIRMED |
| README.md:47 | palico_weapons 495 | `select count(*) from palico_weapons` | 495 | CONFIRMED |
| README.md:48 | palico_armor 1001 | `select count(*) from palico_armor` | 1,001 | CONFIRMED |
| README.md:49 | locations 31 | `select count(*) from locations` | 31 | CONFIRMED |
| README.md:52 | charms / food_combos / felyne_skills = 0 | `select count(*) from charms` etc. | 0 / 0 / 0 | CONFIRMED |
| README.md:53 | meow_locations 6 | `select count(*) from meow_locations` | 6 | CONFIRMED |
| README.md:54 | meow_rewards 1168 | `select count(*) from meow_rewards` | 1,168 | CONFIRMED |

Field-level claims in the same table also hold: `decorations` has exactly `_id,num_slots`
(`pragma_table_info('decorations')`), `quests` has `goal/rank/type/hub/reward/hrp`, `items` has
`type/sub_type/rarity/carry_capacity/buy/sell` + 5 language columns.

### B. `docs/data/README.md` — monster ID/class block (L56)

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| README.md:56 | `_id=1` = Rathian | `select _id,name from monsters where _id=1` | `1,Rathian` | CONFIRMED |
| README.md:56 | `_id=24` = Kushala Daora | `select _id,name from monsters where _id=24` | `24,Kushala Daora` | CONFIRMED |
| README.md:56 | class 0 = 75 只 | `select class,count(*) from monsters group by class` | class 0 = 75 | CONFIRMED |
| README.md:56 | class 2 = 18 只 | idem | class 2 = 18 | CONFIRMED |
| README.md:56 | class 1 = 36 只 | idem | class 1 = 36 | CONFIRMED |
| README.md:56 | 合计 93 只大型怪 | `select count(*) from monsters where class<>'1'` | 93 | CONFIRMED |
| README.md:56 | 与 monster_damage 的 93 个 monster_id 相同 | `select count(distinct monster_id) from monster_damage` | 93 | CONFIRMED |
| README.md:56 | class 1 无 base_hp | `select base_hp,count(*) from monsters where class='1' group by base_hp` | 0 x 36 (0 = 不适用, as monsters.md:404 states) | CONFIRMED |

### C. `docs/data/README.md` — foreign keys (L58–L69)

All four claims in the "整库 38 条外键" table were re-derived from the DDL, not copied from the doc.

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| README.md:58 | 4 relations (`monster_damage→monsters`, `monster_to_quest→monsters`, `monster_to_quest→quests`, `quest_rewards→items`) each 0 dangling | `select count(*) from <child> where <col> is not null and <col><>0 and <col> not in (select _id from <parent>)` | 0 / 0 / 0 / 0 | CONFIRMED |
| README.md:64 | 外键定义总数 38 | regex `foreign key\((col)\) references (tbl)\(_id\)` over `sqlite_master.sql` (case-insensitive) | 38 | CONFIRMED |
| README.md:65 | 36 条为 0 悬空 | same `NOT IN` filter, all 38 defs | 36 zero, 0 nonzero, 2 parents missing | CONFIRMED |
| README.md:66 | 2 条父表名写错：`skills.skill_tree_id→skill_tree`（应 `skill_trees`）、`meow_rewards.meow_location_id→meow_location`（应 `meow_locations`） | parent-table existence test over 38 defs | exactly those 2 names do not exist as tables; `skill_trees`/`meow_locations` do (205 / 6 rows) | CONFIRMED |
| README.md:66 | 改名后各 0 悬空 | re-run filter against `<parent>s` | 0 and 0 | CONFIRMED |
| README.md:67 | `pragma foreign_key_check` 报 2,621 行 | `pragma foreign_key_check` | 2,621 rows | CONFIRMED |
| README.md:67 | = skills 326 + meow_rewards 1,168 + quests.permit_monster_id=0 (1,127) | group `foreign_key_check` by table; `select count(*) from quests where permit_monster_id=0` | quests 1127 / meow_rewards 1168 / skills 326 (sum 2,621); permit_monster_id=0 → 1,127; permit_monster_id<>0 not in monsters → 0 | CONFIRMED |
| README.md:67 | 没有一条是真孤儿 | same two renamed-parent filters | 0 | CONFIRMED |
| README.md:69 | 门 12 pinned set `{quests:1127, meow_rewards:1168, skills:326}` | gate output above | identical | CONFIRMED |

### D. `docs/data/README.md` — export inventory and agroff cross-validation (L29, L73–L87, L109–L115)

| file:line | prose | query / command | db value | verdict |
|---|---|---|---|---|
| README.md:29 | 已导出 21 表 | `ls docs/data/json/*.json` minus 6 mapping files | 21 table exports present (armor … weapons) | CONFIRMED |
| README.md:29 | 21 个文件共 36,466,585 B ≈ 34.8 MiB | `sum(statSync(f).size)` over the 21 | 36,466,585 B = 34.78 MiB | CONFIRMED (exact byte match) |
| README.md:29 | 另有 6 个手工映射 JSON | listing | monster-dttune-index, monster-name-map, monster-names-chs, monster-slot-map, monster-slot-map-137, motion-values = 6 | CONFIRMED |
| README.md:73 | 21 张表导出与 db 行数一致 | JSON.parse each file, compare length to `count(*)` | 21/21 equal (armor 5637, items 21153, gathering 15414, weapons 10877, quests 1355, monsters 129, quest_rewards 37370, …) | CONFIRMED |
| README.md:79 | quests.json 944/944 命中 | normalize (lower, collapse spaces) titles vs `quests.name` | 944/944 | CONFIRMED |
| README.md:80 | skills.json 外层 204/204 | idem vs `skill_trees.name` | 204/204 | CONFIRMED |
| README.md:81 | skills.json 内层 326/326 | idem vs `skills.name` | 326/326 (326 distinct) | CONFIRMED |
| README.md:82 | decorations.json 242/242 按名对 items | idem vs `items.name` | 242/242 | CONFIRMED |
| README.md:83 | hammer.json 885/885 经 `LV<n>→<n>` 转换 | idem, with the conversion | 885/885; without conversion 0/885 (matches the doc's stated failure mode) | CONFIRMED |
| README.md:87 | agroff `_id` 不可移植：装饰珠 0/242 | `decorations.json` `_id` ∩ `decorations._id` | 0/242 | CONFIRMED |
| README.md:109 | 21,153 行、1,044,342 字节、UTF-16LE+BOM、CRLF | recompute: `2 + Σ 2*len("id,name\r\n")` over `items` ordered by `_id` | 1,044,342 B exactly; 21,153 rows | CONFIRMED |
| README.md:109 | `id` 用 `items._id`（`1` = Book of Combos 1） | `select _id,name from items where _id=1` | `1,Book of Combos 1` | CONFIRMED |
| README.md:111 | 名字含逗号 → 拒绝生成，实测 0 条 | `select count(*) from items where name like '%,%'` | 0; also 0 names with CR/LF, so every line splits into ≥2 fields | CONFIRMED |
| README.md:113 | `items.name_ja` 全表 0 条有值（21,153 行全空） | `select count(*) from items where name_ja is not null and name_ja<>''` | 0 | CONFIRMED |
| README.md:115 | `docs/data/MHGU_item(uni).txt` 已加进 `.gitignore` | `.gitignore:69` | present | CONFIRMED |
| README.md:126 | DLC 标识符全在 `quests`：`_id >= 1,000,000` 共 166 条，全是 type 0 | `select count(*),group_concat(distinct type),min(_id),max(_id) from quests where _id>=1000000` | 166 rows, one type (`0`), all `hub=Event`, ids 1010004..1120012 | CONFIRMED |
| README.md:149 | quoted reproduction `{ c: 166, mn: 1010004, mx: 1120012 }` | same query | identical triple | CONFIRMED |
| README.md:123 | DLC 区 200 槽 x 7,168B (0x1C00)，起点 63,641 (0xF899)，共 1,433,600B | arithmetic / hex | 7168 = 0x1C00; 200 x 7168 = 1,433,600; 63,641 = 0xF899 | CONFIRMED |
| README.md:126 | `tools/mhgu/export-dlc-table.mjs` 给出 | `ls tools/mhgu/export-dlc-table.mjs` | present | CONFIRMED |

### E. `docs/data/json/README.md`

| file:line | prose | query / command | db value | verdict |
|---|---|---|---|---|
| json/README.md:8 | monster-slot-map.json 137 条，字段 `{slot,emid,cn,cn_src,en,kind,ro}` | `JSON.parse`, key set | 137 entries; exactly those 7 keys | CONFIRMED |
| json/README.md:9 | slot 0..136 | `min/max` over slots | 0..136, 137 distinct | CONFIRMED |
| json/README.md:9 | 43 个 `kind=small` 与 94 个 `kind=big` | tally `kind` | small 43, big 94 | CONFIRMED |
| json/README.md:14 | slot92 = 飞甲虫 emid 4122；slot133 = 阁螳螂(机偶)；slot134 = Ahtal-Ka emid 88 | filter slots | 92/4122/Bnahabra(small), 133/87/阁螳螂(机偶), 134/88/Ahtal-Ka | CONFIRMED |
| json/README.md:12 | 0x1597ea4 的 137 对 `{emid,slot}` 与 json 逐条一致，slot 恰为 0..136 | read `main.140.flat.bin` at `0x1597ea4+0x100`, stride 8, two u32 `{emid,slot}` | 137/137 equal; slots exactly 0..136, no slot >136 | CONFIRMED |
| json/README.md:8 | monster-slot-map-137.json 字段少 `kind/ro` | key set | `slot,emid,cn,cn_src,en` (5 keys) | CONFIRMED |
| json/README.md:20 | monster-name-map.json 129 条 `{id,ja,base_hp,sort}` | key set + compare to `monsters` | 129; 4 keys; `ja` and `base_hp` match `monsters` for all 129, 0 empty `ja` | CONFIRMED |
| json/README.md:20 | db `monsters.name_ja` 129/129 齐全 | `select count(*) from monsters where name_ja<>''` | 129 | CONFIRMED |
| json/README.md:26 | quests/items/skills 的 `name_ja` 在 db 全空 | three counts | 0 / 0 / 0 | CONFIRMED |
| json/README.md:28 | db `items._id`（`type=''` 2624 条） | `select count(*) from items where type=''` | 2,624 | CONFIRMED |
| json/README.md:28 | 编辑器日文表 2,930 行 | see UNVERIFIED (file absent); the number is reproduced as the doc's own cross-reference | — | UNVERIFIED (number), internally consistent |

### F. `docs/mechanics/monsters.md` — counts and coverage

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| monsters.md:12 | monsters.json 129 行 | `select count(*) from monsters` | 129 | CONFIRMED |
| monsters.md:12 | monster_damage.json 893 行，仅 93 只大型 | `count(*)` = 893; `count(distinct monster_id)` = 93; per-monster rows 2..16 | 893 / 93 | CONFIRMED |
| monsters.md:12 | monster_weakness.json 108 行 | `count(*)` | 108 (Normal 90 + 18 state rows) | CONFIRMED |
| monsters.md:12 | monster_status.json 728 行 = 91 只 x 8 | `count(*)`; distinct monsters; rows per monster | 728; 91 distinct; min=max=8 | CONFIRMED |
| monsters.md:23 | 93 = class0 75 + class2 18 | `select class,count(*)` | 75 + 18 = 93 | CONFIRMED |
| monsters.md:24 | 36 只小型，`_id` 4097..4144，含空号 | `min/max`; gaps | 36 rows in a 48-slot span (4097..4144); the 12 missing ids are 4114, 4120, 4124-4129, 4132-4134, 4139 | CONFIRMED |
| monsters.md:26 | 129 = 93 + 36 | counts | 129 | CONFIRMED |
| monsters.md:27 | wiki 侧栏大型怪物 94 条 = 93 + 机甲 | wiki mirror scan (see below) | 94 `种类` sections, 94 distinct names, one is 阁螳螂·机甲 | CONFIRMED |
| monsters.md:65 | base_hp 93 条大型全覆盖 | `select count(*) from monsters where class<>'1' and base_hp>0` | 93 | CONFIRMED |
| monsters.md:67 | base_hp 量级：最低 1800；蓝速龙王/彻甲虫/跳狗龙 2000；麒麟 3200、钢龙 4200、岚龙 8700、骸龙 14000、老山龙 25000；荒钩爪 6000 vs 轰龙 5000；银岭 6800 vs 巨兽 5400 | `select name,base_hp from monsters where …` | 1800 (Bulldrome); 2000 x3 (Velocidrome/Seltas/Great Maccao); Kirin 3200, Kushala 4200, Amatsu 8700, Nakarkos 14000, Lao-Shan Lung 25000; Grimclaw 6000 / Tigrex 5000; Elderfrost 6800 / Gammoth 5400 | CONFIRMED (all 10) |
| monsters.md:404 | class1 36 条，`base_hp` 全 0 | `select count(*) from monsters where class='1' and base_hp=0` | 36 | CONFIRMED |
| monsters.md:404 | monster_damage 只覆盖 93 只大型（unique = 93） | `select count(distinct monster_id)` | 93 | CONFIRMED |
| monsters.md:409–509 | 93 行映射表：93 行 ↔ 93 个 DB 大型条目，无重复、无遗漏 | parse every `\| i \| 名 \| 种 \| DBid \| hp \|` row; compare to `monsters` | 93 rows parsed, 93 unique ids, 93/93 large monsters covered, 0 extra, 0 `base_hp` mismatch | CONFIRMED (all 93 rows, every value) |
| monsters.md:539 | 93 行名单恰好覆盖全部 93 只大型 | idem | 93/93 | CONFIRMED |
| monsters.md:583 | monster_to_quest 2305 行 | `count(*)` | 2,305 (`unstable=1`: 483, `hyper=1`: 235) | CONFIRMED |
| monsters.md:596 | wiki 只有 94 个大型条目 | mirror scan | 94 | CONFIRMED |
| monsters.md:653 | 36 只小型只有名称/id/图标 | `select count(*)` class=1; no damage/weakness rows for 4097..4144 | 36; `monster_damage`/`monster_weakness` have 0 small-monster rows | CONFIRMED |
| monsters.md:643 | `metadata` = 4 / 6 / 7，4 组含黑龙系+老山龙+阁螳螂+G级二名+猛爆碎龙+混沌黑蚀龙 (13) | `select metadata,count(*)`; list members | 4→13 (exactly that set), 6→35, 7→81 | CONFIRMED |

### G. `docs/mechanics/monsters.md` — reference hitzone tables (every cell)

Parsed all five tables and compared to `monster_damage` (doc column order 切/打/弾/火/水/雷/冰/龙/气绝 =
DB `cut,impact,shot,fire,water,thunder,ice,dragon,ko`; parentheses → the `(State)` row).

| file:line | table | query | db value | verdict |
|---|---|---|---|---|
| monsters.md:148–154 | 轰龙 (id 32), 7 parts + `(Enraged)` | `select * from monster_damage where monster_id=32` | all 9 columns x 7 rows + 5 Enraged rows agree (Head 65/55/55, fire0 water10 thunder20 ice5 dragon15, ko 100→130) | CONFIRMED |
| monsters.md:162–168 | 雌火龙 (1), 7 parts | idem id=1 | all cells agree (Head 90/80/70/0/15/20/15/35/100) | CONFIRMED |
| monsters.md:176–183 | 黑龙 (13), 8 parts | idem id=13 | all cells agree (Head cut70 impact75 shot65 fire15 water5 thunder5 ice10 dragon30; Wings cut35 impact21 shot15 fire10 water5 thunder5 ice10 dragon15) | CONFIRMED |
| monsters.md:193–200 | 天慧龙 (86), 8 parts + states | idem id=86 | all cells agree (Head elements 25→0, Back Legs shot 20→40, Tail 20→0) | CONFIRMED |
| monsters.md:208–214 | 阁螳螂 (88), 7 parts | idem id=88 | all cells agree (Claws 55/55/20 water10 ice5 thunder20; Back ko 100) | CONFIRMED |
| monsters.md:85 | 雌火龙/轰龙 "两源逐值一致" | idem | both cross-checks hold exactly | CONFIRMED |
| monsters.md:113 | `(Enraged)` 轰龙 65/55/55→70/65/60, ko 100→130 | id=32 `Head`/`Head (Enraged)` | 65/55/55,100 → 70/65/60,130 | CONFIRMED |
| monsters.md:114 | 黑炎王 `(Break)` Head 45/40/30→55/50/35; Back 21/21/15→38/38/43 | id=1026 | Head 45/40/30, Head (Break) 55/50/35; Back 21/21/15, Back (Break) 38/38/43 | CONFIRMED |
| monsters.md:134 | 天慧龙 `(Enraged)` ko DB 110 / wiki 100 | id=86 Head (Enraged) | ko 110 | CONFIRMED |

### H. `docs/mechanics/monsters.md` — durability, status, hyper

| file:line | prose | query / source | db value | verdict |
|---|---|---|---|---|
| monsters.md:228 | `1862` 尾 `150 [230]`；`1863` 尾 `120 [320]` | wiki 1862 tail block | 尾巴 150 / [230] / 225 / [225] | CONFIRMED (150 [230]) |
| monsters.md:229 | 狞猛化 = 基础 x1.5, samples 220→330, 190→285, 230→345, 200→300, 120→180, 240→360 | arithmetic | all six exact | CONFIRMED |
| monsters.md:233 | 阁螳螂 体 500 / 瓦礫 500；机甲 繭玉 1000 | wiki 2992/3002 | matches page text | CONFIRMED (wiki) |
| monsters.md:240–245 | 轰龙 durability 220/330, 180/270, 200/300, 220/330, 240/360 | wiki 1855 lines 259–300 | identical, including the `[330]/[300]/[240][360]` brackets | CONFIRMED |
| monsters.md:277 | 728 = 91x8；只有 12、13 无行；红黑龙 269 / 祖龙 525 有行 | rows per monster; rows for 12/13/269/525 | 8 rows each for 91 monsters; 0 rows for 12 and 13; 8 rows for 269 and 525 | CONFIRMED |
| monsters.md:280 | 骸龙 只吃毒 400, 其余 0；天慧龙 减气 0；阁螳螂 爆破 0 | id 84/86/88 status rows | Nakarkos Poison 400/100/1000/60/300, Sleep..Blast all 0; Valstrax Exhaust 0; Ahtal-Ka Blast 0 | CONFIRMED |
| monsters.md:281 | max = initial + 4xincrease: 毒 180+4x100=580, 晕 150+4x150=750, 骑乘 80+4x120=560; 麻痹 180+5x110=730, 爆破 70+20x30=670 | id=1 rows | 580 / 750 / 560 / 730 / 670, with exactly those initial/increase | CONFIRMED |
| monsters.md:282 | damage/duration examples: 雌火龙毒 150/60, 轰龙毒 240/60, 荒钩爪爆破 80, 轰龙爆破 100 | ids 1/32/1056 | 150/60, 240/60, 80, 100 | CONFIRMED (the four cited examples; the surrounding "完全一致" is contradicted — see CONTRADICTION #5) |
| monsters.md:283 | 荒钩爪 vs 轰龙 thresholds identical except Jump 60/90→70/110, Blast damage 100→80, increase 30→50 | full row diff 32 vs 1056 | Poison/Sleep/Para/KO/Exhaust/Mount identical; Jump 60/90→70/110; Blast 70/30/670/100→70/50/670/80 | CONFIRMED |
| monsters.md:358–359 | 44 页有狞猛化注记；本表 20 条 | `grep -lE "狞猛化.*肉质" text/*.txt` = 44; `grep -lE "狞猛化时.*(倍|×)"` = 20 | 44 pages; 20 multiplier notes | CONFIRMED |
| monsters.md:359 | 20 条倍率清单 | each of the 20 notes read with its page title | all 20 match page-for-page (1831 巨兽, 1845 夜鸟, 1846 黑狼鸟, 1850 奇猿狐, 1851 鬼鲛/变形冰鲨, 1852 镰蟹, 1853 雷狼龙, 1856 鬼蛙, 1857 雪狮子王, 1858 潜口龙, 1859 碎龙, 1860 白电龙, 1966 爆锤龙, 1968 水龙, 1971 重甲虫, 2831 千刃龙, 2877 金火龙, 2878 银火龙, 2962 角龙, 2966 冰牙龙) | CONFIRMED (all 20) |
| monsters.md:364 | `hyper=1` 共 235 行；[未确认] 是否均无 LR | `select q.rank,count(*) from monster_to_quest mt join quests q on q._id=mt.quest_id where mt.hyper=1 group by q.rank` | G 114 + HR 121 = 235, **zero other ranks** | CONFIRMED — the doc's `[未确认]` can be closed: no LR rows exist |
| monsters.md:642 | 雄火龙 雷=6、黑龙 冰=1 | `select * from monster_weakness where monster_id in (2,13)` | Rathalos thunder 6; Fatalis ice 1 | CONFIRMED |

### I. `docs/mechanics/quests.md`

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| quests.md:28,42–46 | 1355 = Village 375 / Guild 569 / Permit 228 / Arena 17 / Event 166 | `select hub,count(*) from quests group by hub` | 375 / 569 / 228 / 17 / 166 (sum 1,355) | CONFIRMED |
| quests.md:48 | quests.json keyType = key 118 / urgent 30 / pre-req 18 / normal 778 | tally `keyType` over `docs/data/quests.json` | 118 / 30 / 18 / 778 (sum 944) | CONFIRMED |
| quests.md:27 | quests.json 944 条，只覆盖 Village+Hub | length; `questType` tally | 944; Village 375 + Hub 569 | CONFIRMED |
| quests.md:432 | 挑战任务 20（15 单体 + 5 大连续） | wiki 2034: 20 location lines, 5 `大连续狩猎N` | 15 + 5 | CONFIRMED (wiki) |
| quests.md:434 | 斗技大会 17 条 | `select count(*) from quests where hub='Arena'` | 17 | CONFIRMED |
| quests.md:448 | Permit = 12x16 + 6x6 = 228 | group by `permit_monster_id`: 12 groups x16, 6 groups x6 | exactly that; 228 | CONFIRMED |
| quests.md:476 | 二名 `sort_order` 递增：944/960/976/992/1008/1024/1040/1056/1072/1088/1104/1120 then 1136/1142/1148/1154/1160/1166 | `select permit_monster_id,min(sort_order),max(sort_order),count(*) … order by min(sort_order)` | 944-959, 960-975, 976-991, 992-1007, 1008-1023, 1024-1039, 1040-1055, 1056-1071, 1072-1087, 1088-1103, 1104-1119, 1120-1135 (16 each), then 1136-1141, 1142-1147, 1148-1153, 1154-1159, 1160-1165, 1166-1171 (6 each) | CONFIRMED (exact) |
| quests.md:625 | Permit sort_order 944–1171（偏移 +2） | min/max by hub | 944 / 1171 | CONFIRMED |
| quests.md:628 | Arena sort_order 1172–1188（偏移 +116） | min/max by hub | 1172 / 1188 | CONFIRMED |
| quests.md:613 | id 946 → char_off 11501 bit 0 | `(11501-11383)*8 = 944` bits, +2 id offset → 946 | arithmetic closes | CONFIRMED (arithmetic only) |

Internal table consistency check (same file, summary vs. per-tier tables): village 关键/紧急
4/0, 4/1, 6/1, 5/1, 6/1, 5+2/2, 9/1, 8/1, 9/1, 6/6 and hub 5/0, 6/1, 6/2, 4/0, 5/1, 5/2, 6/3, 5/0, 6/1, 6/1, 6/2
all match the rows actually listed under each `#### ★N` heading (script counted table rows; 21/21 headings agree).

### J. `docs/mechanics/equipment.md`

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| equipment.md:66 | json/weapons.json 10877 条 | `count(*)` | 10,877 | CONFIRMED |
| equipment.md:103 | 记录总数 10877；家族数 1585；`final=1` 1585（每家族恰好一个）；单家族最大 15 级 | `count(distinct family)`, `count(*) filter final=1`, `max(count(*)) per family`, families with `sum(final)<>1` | 10,877; 1,585; 1,585; 15; 0 families deviate | CONFIRMED |
| equipment.md:107 | 孔数 0:5395 / 1:2828 / 2:1900 / 3:754 | `group by num_slots` | 5395 / 2828 / 1900 / 754 | CONFIRMED |
| equipment.md:108 | 属性 无5141/火773/水847/雷908/冰783/龙844/毒534/麻281/眠222/爆544 | `group by element` | `''` 5141, Fire 773, Water 847, Thunder 908, Ice 783, Dragon 844, Poison 534, Paralysis 281, Sleep 222, Blastblight 544 | CONFIRMED (all 10) |
| equipment.md:109 | 斩味记录 8721；弓/轻弩/重弩 2156 条无斩味 | `count(*) where sharpness<>''`; null by wtype | 8,721; Bow 735 + HBG 718 + LBG 703 = 2,156 | CONFIRMED |
| equipment.md:77 | `element_2` 仅 56 条非空 | `count(*) where element_2<>''` | 56 | CONFIRMED |
| equipment.md:88 | 狩猎笛音色 50 种组合 | `count(distinct horn_notes)` | 50 | CONFIRMED |
| equipment.md:136–139 | family 2092 = 青熊薙，`_id` 535553–535560，8 级，第 8 级 final=1，攻击 90/120/140/160/180/230/260/350 | `select _id,attack,final from weapons where family=2092` | exactly 8 rows, those attacks, final=1 only on 535560 | CONFIRMED |
| equipment.md:146–160 | 14 个 class 的行数（958/872/885/857/718/703/865/765/809/735/839/796/547/528）与 class 编号 | `select _id>>16, wtype, count(*) …` | class 1 GS 958, 2 SnS 872, 3 Hammer 885, 4 Lance 857, 5 HBG 718, 7 LBG 703, 8 LS 865, 9 SA 765, 10 GL 809, 11 Bow 735, 12 DB 839, 13 HH 796, 14 IG 547, 15 CB 528; class 6 absent | CONFIRMED (14/14) |
| equipment.md:168–172 | 1585 家族 / 1585 最终形态 / 最大 15 级 | idem | 1,585 / 1,585 / 15 | CONFIRMED |
| equipment.md:207 | 铳枪 shelling Normal 37/80/129/67/12, Wide 22/37/90/67/8, Long 13/56/112/66/13 | `group by shelling_type` | exactly those 15 counts | CONFIRMED |
| equipment.md:208 | 盾斧 phial Impact 404 / Element 124 | `group by phial where wtype='Charge Blade'` | 404 / 124 | CONFIRMED |
| equipment.md:209 | 斩击斧 Power 335 / Element 228 / Dragon 64 / Exhaust 65 / Poison 44 / Paralysis 29 | idem Switch Axe | 335 / 228 / 64 / 65 / 44 / 29 | CONFIRMED |
| equipment.md:226 | armor `_id = (19+slotIndex)<<16 \| seq` | `select _id>>16, count(*) from armor group by 1` | 20..24 (0x14..0x18), 1163/1148/1117/1073/1136 | CONFIRMED |
| equipment.md:236,258 | `family` 逐项等于 `_id` 低 16 位（0 例外） | `select count(*) from armor where family <> (_id & 65535)` | 0 | CONFIRMED |
| equipment.md:252–256 | 每部位 seq 上限 1..1282 / 1..1286 与件数 1163/1148/1117/1073/1136 | `min/max(_id&65535)`, count per slot | Head 1..1282 (1163), Body 1..1286 (1148), Arms 1..1282 (1117), Waist 1..1282 (1073), Legs 1..1282 (1136) | CONFIRMED |
| equipment.md:266 | 红盔头盔 `26/158`，技能 红盔+2 / 防御+2 / 体术+3 / 真·红盔+2 | `docs/data/armor/head.json` Redhelm Helm | defense 26, max 158, skills Redhelm 2 / Defense 2 / Constitution 3 / Redhelm X 2 | CONFIRMED |
| equipment.md:277–282 | armor 孔数 0:2066 / 1:2464 / 2:966 / 3:141（5637 件） | `group by num_slots` | 2066 / 2464 / 966 / 141 (sum 5,637) | CONFIRMED |
| equipment.md:290 | decorations `_id` 2638–2888，242 条 | `min/max/count` | 2638 / 2888 / 242 | CONFIRMED |
| equipment.md:291–293 | 251 格索引，9 个空洞 `2717 2718 2720 2776 2788 2817 2839 2840 2843`，这些 id 在 items 中不存在；242+9=251 | set difference over 2638..2888; `select count(*) from items where _id=…` | 9 holes, exact list; each id has 0 items; 242+9=251 | CONFIRMED |
| equipment.md:294 | 1 孔 156 / 2 孔 46 / 3 孔 40 | `group by num_slots` | 156 / 46 / 40 | CONFIRMED |
| equipment.md:299 | 珠只覆盖技能树 1..143 | `select min/max(skill_tree_id) … join decorations` | 1..143 | CONFIRMED |
| equipment.md:350–354 | palico_weapons 495 件，`0x100000\|seq`，范围 1048577–1049083，有空洞 | `min/max/count`; missing ids in span | 495; 1,048,577..1,049,083; 12 holes in a 507-slot span | CONFIRMED |
| equipment.md:367–377 | palico_armor 1001 件；头 `0x11xxxx` / 胴 `0x12xxxx`；seq ≤ ~0x20D | `select _id>>16,count(*),min/max(_id&65535)` | 17→491 (seq 1..524), 18→510 (seq 1..525); 525 = 0x20D | CONFIRMED |
| equipment.md:584 | 各 class 的 familyIndex 上限（GS 136 / SnS 128 / Hammer 131 / Lance 126 / HBG 108 / LBG 109 / LS 125 / SA 108 / GL 114 / Bow 107 / DB 125 / HH 111 / IG 82 / CB 80） | `select wtype,max(family & 255)` | exactly those 14 values | CONFIRMED |
| equipment.md:628 | Alloy `12/62`; 支援者Ｘ `122/160` | armor part JSON | Alloy Helm 12/62; Helper Hood X 122/160 | CONFIRMED |
| equipment.md:630 | 两套 JSON 斩味刻度差 2 倍：hammer.json 红18/橙8/黄4 vs weapons/hammer.json `9.4.2` | both files | 18/8/4 and "9.4.2.0.0.0.0" | CONFIRMED |
| equipment.md:631 | `awaken` 全空、`max_attack`/`tree_depth` 恒 0（10877 条） | three counts | 0 non-empty awaken; 0 non-zero max_attack; 0 non-zero tree_depth; none NULL | CONFIRMED |
| equipment.md:458 | `_id = (class<<16)\|(familyIndex<<8)\|(level+1)`; `familyId = class*256+familyIndex` | all 10,877 rows | 0 violations; low byte always 1..15; per family `count = max low byte` (no gaps) | CONFIRMED |

### K. `docs/mechanics/skills-arts.md`

| file:line | prose | query | db value | verdict |
|---|---|---|---|---|
| skills-arts.md:19 | agroff skills.json 204 树 | object key count | 204 | CONFIRMED |
| skills-arts.md:20 | json/skills.json 326 条 | `count(*)` | 326 | CONFIRMED |
| skills-arts.md:21 | skill_trees.json 205 行 | `count(*)` | 205 | CONFIRMED |
| skills-arts.md:22 | decorations.json 242 条 | `count(*)` | 242 | CONFIRMED |
| skills-arts.md:23 | skillMeta.json 202 条 | key count | 202 | CONFIRMED |
| skills-arts.md:24 | armor/weapons 5637/10877，孔数上限各 3 | counts + `max(num_slots)` | 5,637 / 10,877; max slots 3 and 3 | CONFIRMED |
| skills-arts.md:40–47 | 阈值出现树数 +20:6, +15:50, +10:204, −10:48, −15:13, −20:5 | `select required_skill_tree_points,count(*) from skills group by 1` | 20→6, 15→50, 10→204, −10→48, −15→13, −20→5 | CONFIRMED (all six) |
| skills-arts.md:59–65 | 组合分布 [10]136, [10,−10]18, [10,15]20, [10,15,−10]17, [10,15,−10,−15]7, [10,15,20,−10,−15,−20]5, [10,15,20,−10,−15]1 | group thresholds per `skill_tree_id` | 136 / 18 / 20 / 17 / 7 / 5 / 1 | CONFIRMED (all seven) |
| skills-arts.md:67 | 只有 5 棵树有完整 6 档；运气是唯一 +20 但负向只到 −15 | combo tally | 5 trees with 6 levels; 1 tree with `[-15,-10,10,15,20]` | CONFIRMED |
| skills-arts.md:68 | 136 + 48 + 20 = 204 | arithmetic + distinct tree ids | 204 | CONFIRMED |
| skills-arts.md:83 | 21 孔 = 武器 3 + 防具 5x3 + 护石 3 | arithmetic; DB max num_slots 3 (weapons, armor) | 21 | CONFIRMED |
| skills-arts.md:97–99 | 1 孔 156（+1:97/+2:59）；2 孔 46（+3）；3 孔 40（+4:37/+5:3） | `item_to_skill_tree` joined to `decorations` | 156 / 46 / 40; +1 97, +2 59, +3 46, +4 37, +5 3 | CONFIRMED |
| skills-arts.md:101 | `+5` 的 3 条 = Attack/Expert/Sane Jwl 3（树 18/70/15） | join rows with point_value 5 | 3 rows, trees 18 / 70 / 15 | CONFIRMED |
| skills-arts.md:106–107 | 182 条带 2 个效果，60 条 1 个；副作用 −1 146 处 / −2 36 处 | effects per bead; negative value tally | 182 / 60; −1 146, −2 36 | CONFIRMED |
| skills-arts.md:109 | 珠只覆盖技能树 1..143 | min/max | 1..143 | CONFIRMED |
| skills-arts.md:128 | 复合技能 65 条 | wiki 2207: `grep -c "^■$"` = 65 entry markers (plus 3 legend lines `■剑士专用技能` etc.) | 65 | CONFIRMED |
| skills-arts.md:132 | 6 村庄之心 + 18 二名 + 18 真· + 23 通用 = 65 | DB tree ranges | trees 138–143 = 6; 144–179 = 36; 180–202 + 204 + 205 = 25 (67 total, 65 composites + 秘术/护石强化), 203 absent — exactly the doc's "JSON 归类差异" note | CONFIRMED |
| skills-arts.md:162 | 负向档 48 棵；−20 仅 5 棵 | `count(distinct skill_tree_id) where p=-10`; `where p=-20` | 48; 5 | CONFIRMED |
| skills-arts.md:174 | 狩技总数 66 = 共通 10 + 14 武器 x 4 | wiki 1847: `grep -c LV1` = 56 LV1 rows; common block lists 10 names | 56 + 10 = 66 | CONFIRMED |
| skills-arts.md:176 | 3 槽 x 6 风格 = 18 组 | arithmetic | 18 | CONFIRMED |

---

## CONTRADICTION — same fact stated differently: both file:line, both values, and which side the artifact supports

### 1. `equipment.md:222` (and the §2.2 table) cites `docs/data/armor/*.json` for 5,637 armor pieces, but those five files hold 5,609

- Prose, `docs/mechanics/equipment.md:222`: "#### 2.1 字段（`docs/data/armor/*.json`，5 部位共 **5637** 件）".
- Same file, `equipment.md:252–256`, per-slot counts: Head 1163 / Body 1148 / Arms 1117 / Waist 1073 / Legs 1136 (sum 5,637).
- Artifact, `docs/data/armor/{head,body,arms,waist,legs}.json`: 1155 / 1145 / 1116 / 1064 / 1129 = **5,609**. The five `-light.json` files hold the same 5,609.
- Which side the artifact supports: the **database** side. `docs/data/json/armor.json` (the db export) has 5,637 rows and contains the 28 ids the per-part files lack — e.g. `1310722` (Head, defense 2 / max 26 / 3 slots) is in `json/armor.json` and in the `armor` table, but absent from `docs/data/armor/head.json`.
- Exact gap: Head 8, Body 3, Arms 1, Waist 9, Legs 7 = 28 ids missing from the per-part files (`1310722, 1310908, 1310909, 1311132, 1311133, 1311160, 1311232, 1311616, 1376579, 1376580, 1376768, 1442304, 1507375, 1507376, 1507459, 1507460, 1507629, 1507630, 1507836, 1507837, 1507840, 1572893, 1572894, 1572975, 1572976, 1573138, 1573139, 1573376`).
- Impact: a reader who follows the citation to recount the field list gets 5,609 and different per-slot numbers, and will conclude the doc is wrong when the db is right. Compare `equipment.md:36` (weapons): `docs/data/weapons/*.json` **does** sum to 10,877 and matches the db per type — so the armor citation is the odd one out.

```
bun -e "… for(const f of ['head','body','arms','waist','legs']) sum JSON.parse(docs/data/armor/f).length"
# 1116 1145 1155 1129 1064 → 5609
bun -e "… JSON.parse('docs/data/json/armor.json').length"
# 5637
```

### 2. `monsters.md:11` says 85 monster pages carry a `种类` row; the mirror has 94

- Prose, `docs/mechanics/monsters.md:11`: "85 个怪物页的 `种类` 行（物种分类）".
- Artifact, `docs/reference/mhxx-wiki/text/*.txt`: 94 files contain exactly one `种类` row followed by a species value; the 94 names are distinct, and one is `阁螳螂·机甲` (3002).
- The same file contradicts itself elsewhere: `monsters.md:27` and `monsters.md:596` both say the wiki has **94** large-monster entries (93 + mech form).
- Which side the artifact supports: **94**. Method: for each `.txt`, find a line that normalizes to `种类` and whose next line is one of the 14 species labels (`飞龙种…鋏角种`, `-`); count files. Result: 94 files / 94 rows / 94 distinct names. (The 44 in the same cell is correct — `grep -lE "狞猛化.*肉质"` = 44 — so the row's two counts were produced by different methods.)

```
bun -e "…scan text/*.txt for a 种类 line followed by a species label…"
# total 种类 rows with a species value: 94   files: 94   distinct names: 94
grep -lE "狞猛化.*肉质" docs/reference/mhxx-wiki/text/*.txt | wc -l
# 44
```

### 3. `monsters.md:36/40` species table puts 白速龙王 in 鸟龙种 (11/3); its cited source puts it in 鱼龙种 (10/4)

- Prose, `monsters.md:36`: 鸟龙种 **11**; `monsters.md:40`: 鱼龙种 **3**（水龙、砂龙王、熔岩龙）.
- Prose, same file `monsters.md:29`: the table is built "逐页 `种类` 行 + 93 条映射统计".
- Artifact: `docs/reference/mhxx-wiki/text/2989.txt` (== 白速龙王 ==) has `种类` → `魚龙种`. Recounting all 93 non-mech sections gives 鸟龙种 **10**, 鱼龙种 **4**; every other species count in the table is reproduced exactly (飞龙 21, 古龙 13, 牙兽 13, 兽龙 10, 海龙 6, 甲壳 4, 两生 3, 甲虫 3, 牙龙 2, 蛇龙 1, 鋏角 1, 不明 2). The doc's own §12 row i=81 also says 白速龙王 = 鸟龙种, i.e. the doc is internally consistent and deviates from the page it cites.
- Which side the artifact supports: the **mirror** says 鱼龙种; the doc's classification (Giadrome is a Bird Wyvern) is the game-correct one. Either way the table cannot be reproduced from its stated source, and the totals 11/3 vs 10/4 differ.

```
bun -e "…tally species labels per section, normalizing 魚→鱼 and 竜→龙…"
# 94 rows: 飞龙21 古龙13 牙兽13 鸟龙10 兽龙10 海龙6 甲壳4 鱼龙4 两生3 甲虫4 牙龙2 蛇龙1 鋏角1 '-'2
# (甲虫4 includes 阁螳螂·机甲/3002; excluding it → 甲虫3, total 93)
grep -A1 "^种类$" docs/reference/mhxx-wiki/text/2989.txt | head -2
# 种类 / 魚龙种
```

### 4. `monsters.md:377` says deviant HP is "+500~2200"; the low end is +400

- Prose, `monsters.md:377`: "HP 更高（+500~2200）".
- Computed from the doc's own §12 pairs + `monsters.base_hp`: 18 deviants vs their base species give **+400** (紫毒姬 4900 − 雌火龙 4500) … **+2200** (矛碎 5500 − 大名盾蟹 3300). Full set: 400/1100/800/2200/1000/800/1200/500/2100/900/700/700/1300/500/800/1300/600/1400.
- Which side the artifact supports: the **database** (and the doc's own table). Only 紫毒姬 falls below +500, so the lower bound is wrong by exactly one case.

```
bun -e "…for the 18 [deviant, base] pairs: monsters.base_hp difference…"
# min 400 max 2200 all positive
# "Dreadqueen Rathian 4900 - Rathian 4500 = 400"
```

### 5. `monsters.md:282` says `damage`/`duration` are "完全一致" with the wiki; two of the nine tabled monsters disagree

- Prose, `monsters.md:282`: "`damage`/`duration` 与 wiki 完全一致（…），可直接用 JSON 替换 wiki 数值。"
- The doc's own §5.1 table (`monsters.md:259–267`) vs `monster_status`:
  - 煌黑龙 (50): table `爆破 100 / ○` (= wiki 2879 `爆破 100 - ○`), DB `Blast 0/0/0/0/0` — i.e. the db encodes Blast as **immune** for Alatreon, contradicting "wiki 100".
  - 天慧龙 (86): table `麻痹 — / 10s / △` (= wiki 2964 `10秒`), DB `Para` duration **9** (`initial 200 increase 200 max 800 duration 9`).
- The other 7 tabled monsters match exactly (轰/雌火/荒钩爪/黑炎王/鏖魔/阁螳螂 and 黑龙's "all immune"), so the correct statement is "matches for most monsters, two exceptions".
- Which side the artifact supports: the **wiki** for the 10s (2964 says 10秒) and for 爆破 100 (2879 says 100). The db is the outlier in both cases.

```
bun -e "select status,duration,damage from monster_status where monster_id in (50,86)"
# 50: Poison 15/150 … Blast 0/0     86: … Para 9/0, KO 10/0, Blast 0/200
sed -n '336,375p' docs/reference/mhxx-wiki/text/2879.txt   # 爆破 100 / - / ○
sed -n '354,372p' docs/reference/mhxx-wiki/text/2964.txt   # 麻痹 - 10秒 △
```

### 6. `equipment.md:232` says armor skill points are "−6..15"; the files hold −8..15

- Prose, `equipment.md:232`: "每件 1–4 条技能点；`points` **−6..15**".
- Artifact, `docs/data/armor/{head,body,arms,waist,legs}.json`: 1–4 skills per piece OK, but the point values run **−8 … 15**. The −8 entries are real:
  `1573942 Fatalis Crimsonfeet XR` and `1573943 Fatalis Crimsonlegs XR`, both `Status −8` (plus `Elemental +8`).
  Negative tally: −1 224, −2 1059, −3 313, −4 60, −5 34, −6 1, −8 2.
- The db agrees with the files: `item_to_skill_tree.point_value` also reaches −8 (and −6 once, +15 six times).
- Which side the artifact supports: the **files and db** (−8), so the stated floor is one step too high.

```
bun -e "…numeric min/max over armor/*.json skills[].points…"
# min -8 max 15 ; negative: {"-2":1059,"-3":313,"-1":224,"-5":34,"-4":60,"-6":1,"-8":2}
bun -e "select min(point_value),max(point_value) from item_to_skill_tree"
# -8 / 15
```

### 7. `docs/data/README.md:29+52–54`: "已导出 21 表" and the table lists 24 tables — three have no JSON file

- Prose, `README.md:29`: "已导出 21 表为 `json/<table>.json`（21 个文件…）", followed by a table whose rows include `charms`/`food_combos`/`felyne_skills` (L52), `meow_locations` (L53) and `meow_rewards` (L54).
- Artifact, `docs/data/json/`: exactly 21 table-named files — `armor, combining, decorations, felyne_skills, food_combos, gathering, horn_melodies, items, locations, monster_damage, monster_status, monster_to_quest, monster_weakness, monsters, palico_armor, palico_weapons, quest_rewards, quests, skill_trees, skills, weapons`. There is **no** `charms.json`, `meow_locations.json` or `meow_rewards.json`.
- Which side the artifact supports: the **file count** (21). The table's own framing ("已导出 21 表") therefore mislabels three non-exported tables as exports; the counts themselves (0/0/0/6/1168) are correct in the db.

```
ls docs/data/json/*.json | grep -E 'charms|meow'    # (nothing)
ls docs/data/json/ | wc -l                          # 28 = 21 exports + 6 mapping + README.md
```

### 8. `docs/data/README.md`: the original `MHGU_item(uni).txt` is called "日文名" at L113 and "中文名" at L155

- `README.md:113`: "编辑器原本那份 `MHGU_item(uni).txt` 按 `docs/data/json/README.md` 的记载是**日文名、2,930 行**…（`editor-src` 源码里查不到任何中文道具名…）".
- `README.md:155`: "…需先用 `tools/mhgu/export-item-table.mjs` 从库生成（英文名）或从发布版编辑器包取回（**中文名**），再对拍".
- Third statement, `docs/data/json/README.md:28`: "编辑器**日文表** 2930 行".
- Which side the artifact supports: `json/README.md` (日文) and the editor-src argument at L113; L155 is the only place claiming Chinese. `items` has no Chinese column at all (`pragma_table_info`), which is the point L113 makes.

### 9. `quests.md:31` gives the quest `_id` range as "1xxxx–11xxxxx"; actual ids start at 101

- Prose, `quests.md:31`: "`quests.json`/`mhgu.db` 的 `_id` 是 Kiranico 行号（**1xxxx–11xxxxx**）".
- `select min(_id),max(_id) from quests` → **101 … 1,120,012**. Length distribution: 3 digits 289 rows, 4 digits 46, 5 digits 767, 6 digits 87, 7 digits 166.
- Also, `docs/data/quests.json` (agroff) has **no `_id` field at all** — keys are `title, location, monster, questType, keyType, huntType, rank` — so "`quests.json` 的 `_id`" does not exist to be a Kiranico row number.
- Which side the artifact supports: the **database**: 335 of 1,355 ids are < 10,000, and the agroff file has no id column. The load-bearing half of the sentence ("not the in-game questId") is unaffected.

```
bun -e "select min(_id),max(_id),count(*) from quests; select length(_id),count(*) from quests group by 1"
# 101 / 1120012 / 1355 ; 3→289 4→46 5→767 6→87 7→166
```

---

## STALE — number that was true earlier; what superseded it if the repo says

No unambiguous stale number was found among the db-settled claims. Every table row count, FK count, and
mechanics statistic in the four files matches the current `mhgu.db` exactly (sections A–K).

Two numbers look like leftovers rather than errors of the current state, and are filed under CONTRADICTION
because the repo does not record an earlier value:

- `monsters.md:11` "85 个怪物页" — the mirror now yields 94; the same file already uses 94 twice. If 85 was
  taken before 9 pages were added to the mirror, the mirror's own completeness claim (290 pages, README) covers
  the current state, so 85 is superseded.
- `equipment.md:222`'s citation of `docs/data/armor/*.json` — those five files are 28 rows behind the db
  (`json/armor.json` has all 5,637). The number 5,637 itself is current; only the cited artifact is old.
  This is the one place where "stale" is the likely mechanism: the per-part files predate 28 armor rows that
  are now in the database, and the doc imported the count from the db while citing the older files.

---

## UNVERIFIED — load-bearing claims that cannot be checked with available tools, and why

| claim | where | why unverifiable here |
|---|---|---|
| 编辑器日文表 `MHGU_item(uni).txt` = 2,930 rows (Japanese) | `docs/data/README.md:113`, `json/README.md:28` | The file is not in the repo (and `.gitignore:69` ensures it never will be). The 2,930 cannot be recomputed from `items` (21,153 rows; `name_ja` empty). Only the cross-reference between the two READMEs is checkable, and it agrees. |
| `MHGU_DLC.txt` 重建后 165/165 槽能在 `quests` 查到名字；166 行按 `DLCForm.cs` 解析全部接受 | `README.md:126/136` | The save-side half (165 filled slots of `system_CLEAN`) needs the save dump, and the generated file is not committed, so the text cannot be replayed here. The db half is confirmed above. |
| 剥取次数 3 (normal) / 6 (煌黑龙) / 4 (阁螳螂), "其余 90 只未逐页核对" | `monsters.md:651` | No harvest-count column in `mhgu.db`; self-declared partial. |
| `狞猛化 = -` covers all elders/deviants | `monsters.md:230/362` | Wiki-only; the 6 sampled pages are consistent but the claim is explicitly universal. |
| §3.2 "实测覆盖了 wiki 的全部状态维度" | `monsters.md:109` | The "all dimensions" side is wiki prose; the db does contain the state suffixes (14 in `monster_weakness`, ~20 `(...)` in `monster_damage`), but "all" cannot be proven without an authoritative wiki dimension list. |
| `monster_weakness` 0..6 ordinal semantics (U9) | `monsters.md:642` | The db stores integers only; no legend. The doc's two counterexamples are confirmed (Rathalos thunder 6, Fatalis ice 1), but no mapping table exists to test further. |
| 皮制 wiki `1 / 50` vs JSON `25` | `equipment.md:628` | Wiki side needs the leather-armor page, which is not in the mirror (`grep "== 皮制 =="` finds nothing); the JSON side is confirmed (Leather Headgear max_defense 25) and the Alloy/Helper examples are confirmed. |
| 护石鉴定表 / `+18` constants 97/98/99/100 semantics | `equipment.md:319–343` | Editor source constants, not game data; `mhgu.db` has no talisman table (`charms` is empty). |
| 猫饭 64 条技能、随从猫 16/36/43 条 | `skills-arts.md:332/353/394/447` | `felyne_skills` and `food_combos` are 0-row tables; no palico-skill table exists. Wiki mirror counts were not recomputed (page structure not machine-parseable within this pass). |
| 狩技 LV 开放条件 (村贡献度 400 etc.) | `skills-arts.md:197–216` | Wiki-only; `mhgu.db` has no hunter-arts table (the README itself says "mhgu.db 无专表"). |
| "wiki 侧栏『大型怪物』94 条" as a *sidebar* count | `monsters.md:27` | I confirmed 94 monster detail sections, which is the substantive claim; the literal sidebar block count was not reconstructed. |
| `monster_damage` 状态后缀清单的完整性 | `monsters.md:113–134` | Suffix inventory exists in the db (14 `monster_weakness` states + ~20 damage suffixes) but the "covers every wiki dimension" claim has no enumerable wiki side. |
| `monster_to_quest` 的 `unstable=1` = 483 行语义 | not asserted in prose | measured only; the docs do not claim a number, so no verdict is owed. |

---

## Difficulties — obstacles, what you tried, cost in tool calls, suspected cause (tool bug, missing doc, ambiguous premise, genuinely hard)

Rough cost: about 50 tool calls end to end (queries + wiki greps + binary reads); the items below are where
calls were repeated or the first method failed.

1. **FK extraction needed a case-insensitive regex.** The DB is a Room export; DDL uses lowercase
   `foreign key(...) references ...`. A first pass with `FOREIGN KEY` found 0 definitions and would have
   "confirmed" nothing. Cost: 1 wasted call, fixed with `/i`. Not a repo bug.
2. **`monster-slot-map` binary check needed the right stride.** `json/README.md:12` says "0x1597ea4 + 8*i
   the 137 pairs"; reading u16 pairs or u32 stride-4 interleaves the fields and yields 1/137. The record is
   two u32 (`{emid, slot}`) at stride 8 → 137/137. The doc's phrasing is right but under-specified; a reader
   implementing it from the wording alone will pick the wrong stride once. Worth saying "stride 8, two u32".
3. **`docs/data/armor/*.json` `skills[].points` are strings.** A naive `min/max` over `points` compares
   strings and reports "−1 … 9" for the armor files (I hit exactly this on the first pass). Numeric coercion
   gives the true −8 … 15. This also means the doc's "−6..15" could plausibly have come from a string-sorted
   scan; the correct value is −8..15.
4. **The "85 monster pages" figure is not reproducible by any method I tried.** Counting files with a
   `种类` row gives 94; counting distinct species values gives 94; counting pages with a multiplier note gives
   20 of 44. The 44 matches exactly, so the row was written from a real scan — 85 is likely a stale count from
   before the mirror grew. Marked medium confidence (0.7), because the writer's exact inclusion rule is not
   documented.
5. **Species tally required normalizing mixed-script species labels.** The mirror writes `魚龙种`
   (traditional 魚 + simplified 龙) on four pages, so a literal `鱼龙种` grep returns 0 files and the
   distribution looks like 90 rows. After normalizing `魚→鱼`/`竜→龙` the tally is 94 rows in 94 files.
   Anyone re-running the species table without this step will get a different answer again — the page set is
   internally inconsistent in the character encoding of the same species name.
6. **Two `json` trees with the same base names.** `docs/data/json/armor.json` (db export, 5,637) and
   `docs/data/armor/*.json` (per-part files, 5,609) are different artifacts with different row sets;
   `equipment.md` cites the latter but quotes the former's counts. This is the highest-value documentation fix
   in the set, because both files look authoritative and neither is labelled as the source of the other's
   numbers.
7. **No `name` column on `armor`/`weapons` in the db.** Names live only in the per-part JSON assets, so
   claims like "红盔头盔 26/158" can only be checked against `docs/data/armor/*.json`, which is exactly the
   stale artifact from difficulty 6. For weapons the per-part files are current (sum 10,877, per-type counts
   identical), so only armor is affected.
8. **Wiki page structure for status/hitzone tables is line-flattened**, so comparisons had to be done
   field-by-field against db rows rather than by parsing tables. The five §3 reference tables and the §5.1
   status columns were checked cell-by-cell with hand-built scripts; the 44-page hyper-note count was the only
   prose statistic that reproduced exactly from a one-line grep.
9. **`docs/data/README.md` changed under the audit.** The first read (start of session) still had `MHGU_DLC.txt` in a "不能重建" section; commit `b720b05` (2026-11-04 03:36) rewrote it as rebuildable and added the 166-quests/type-0 evidence. I re-read the file and re-verified the new claim (`_id >= 1,000,000` = 166 rows, single type `0`, hub `Event`, ids 1010004..1120012, matching the reproduction block the doc records at L149). Line numbers in this report are from the post-b720b05 file; L27-L155 kept their positions. The four mechanics files and `json/README.md` were last changed 2026-11-03 16:08 and did not move.
10. **Report writing tooling.** The `write` device refuses absolute repo paths, so this report was staged via
   `local://` and copied into the repo with `cp`; the copy is byte-identical (UTF-8). No repo file other than
   this one was touched.
