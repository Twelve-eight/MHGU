# 怪物栖息地与异常状态

> **数据源**：`docs/data/mhgu.db`（MHGenDatabase v2.4.0 的 `mhgu.db`，社区整理的官方数据提取）。本页全部数值属第三方库，按项目约定标 **[I]**；每条都带 `表名 / 行号（_id）`，可用文末 SQL 原样回查。
> **范围**：只转写 `monster_habitat`（303 行）与 `monster_ailment`（233 行）两张表 + 它们依赖的 `locations` / `monsters` / `items` / `skills` 表；不写 em 编号、不写存档槽位（映射见 `monsters-index.md`）。
> **相关页**：`monsters-index.md`（怪物名 / 槽位）、`monster-status.md`（异常**阈值**：多少伤害触发、持续多久）、`monsters.md`（肉质 / 弱点 / 陷阱效力）。

---

## 0 速览

| 项 | 数值 | 回查（mhgu.db） |
|---|---|---|
| `monster_habitat` 行数 | **303** | `SELECT COUNT(*) FROM monster_habitat` |
| 有栖息记录的怪物 | **81** 只 | `SELECT COUNT(DISTINCT monster_id) FROM monster_habitat` |
| 栖息地用到的地图 | **15** 张（`locations._id` 1–14、22–24） | `GROUP BY location_id` |
| 无栖息记录的怪物 | **48** 只 = 12 只大型 + 36 只小型（§5） | `NOT EXISTS` 反查 |
| `monster_ailment` 行数 | **233** | `SELECT COUNT(*) FROM monster_ailment` |
| 会施加异常的怪物 | **66** 只 | `SELECT COUNT(DISTINCT monster_id)` |
| 异常状态标签种类 | **30** 种（英文自由文本） | `GROUP BY ailment` |
| 表内「解除方法」字段 | **没有** | 表结构仅 `monster_id` / `ailment` |

**读表口径**

- `start_area`（起始区）、`move_area`（移动区）、`rest_area`（休息 / 巢区）都是**区域编号字符串**，多值以半角逗号分隔，例如 `6,7`；不是数组下标。
- 编号是该地图内的**区域号**（如古代森林 1–11），与 `locations.map` 的缩略图（`01.png`…`27.png`）配套使用。
- 地图 `_id` 1–27 为白天 / 通用，**101–104 是同一张图的夜版**（`name` 末尾带 `(N)`，`map` 与日版同图）。`monster_habitat` 一行夜版都没用到。

---

### 0.1 中文名的来源（重要）

| 名称类别 | 来源 | 说明 |
|---|---|---|
| 怪物中文名 | `chS/table/MonsterDemo_chS.gmd.json`（96 条，游戏内短名） | 例：`#0` 雌火龙、`#5` 黑炎王雄火龙、`#12` 矛碎大名盾蟹、`#30` 红盔青熊兽、`#58` 砂龙王、`#91` 天彗龙、`#95` 阁螳螂 |
| 道具中文名 | `chS/table/itemData_chS.gmd.json`，索引 `i = 2 × items._id` | 例：`#26` 解毒药（items 13）、`#50` 消散剂（25）、`#610` 打消果实（305） |
| 地图中文名 | `chS/table/GuestHunterMsg_chS.gmd.json` `#6`–`#20`（游荡猎人的地图倾向表，15 张图与 `monster_habitat` 用到的 15 张一一对应） | 例：`#6` 古代森林 / `#8` 山林 / `#12` 沼泽 / `#20` 无人山岭。`chS/table/MapName_chS.gmd` 本身仍是模板桩（只 2 条，1 条为 `@`），不能用 |

`MonsterDemo_chS` 里金火龙 / 银火龙两条是 `@` 占位符（`#1` / `#4`），所以这两个名字只能沿用仓库通用写法 `[U]`。

---

## 1 地图表（栖息地用到的 15 张）

地图中文名改用**官方 chS 文本**（`GuestHunterMsg_chS` 的地图标签），括号里保留仓库/玩家惯用旧译名便于对照。`name` 为库内英文名，`map` 为缩略图文件。

| `_id` | 官方中文（chS） | 仓库旧译名 | English (`locations.name`) | 缩略图 | 怪物数 | chS 索引 |
|---:|---|---|---|---|---:|---:|
| 1 | **古代森林** | 古代林 | Jurassic Frontier | `01.png` | 31 | `#6` |
| 2 | **山林** | 森丘 | Verdant Hills | `02.png` | 16 | `#8` |
| 3 | **雪山** | 雪山 | Arctic Ridge | `03.png` | 16 | `#9` |
| 4 | **溪流** | 溪流 | Misty Peaks | `04.png` | 19 | `#10` |
| 5 | **旧沙漠** | 旧沙漠 | Dunes | `05.png` | 18 | `#7` |
| 6 | **孤岛** | 孤岛 | Deserted Island | `06.png` | 21 | `#11` |
| 7 | **沼泽** | 沼地 | Marshlands | `07.png` | 20 | `#12` |
| 8 | **火山** | 火山 | Volcano | `08.png` | 20 | `#13` |
| 11 | **遗迹平原** | 遗迹平原 | Ancestral Steppe | `11.png` | 19 | `#14` |
| 12 | **地底火山** | 地底火山 | Volcanic Hollow | `12.png` | 17 | `#17` |
| 13 | **原生林** | 原生林 | Primal Forest | `13.png` | 21 | `#15` |
| 14 | **冰海** | 冰海 | Frozen Seaway | `14.png` | 16 | `#16` |
| 22 | **沙漠** | 沙漠 | Desert | `22.png` | 18 | `#18` |
| 23 | **密林** | 密林 | Jungle | `23.png` | 25 | `#19` |
| 24 | **无人山岭** | 遗群岭 | Ruined Pinnacle | `24.png` | 26 | `#20` |

> 上表 15 行之和 = 303，与 `monster_habitat` 总行数闭合，说明**没有任何一只怪把栖息地写在这 15 张图之外**。
> **映射依据**：`GuestHunterMsg_chS` 的标签是英文语义标签（`OldForest` / `Forest` / `MistyPeaks` / `DesertIsland` / `DosDesert` / `DosJungle` / `Highland`…），与 `locations.name` 的英文逐条对应；其中 `Highland`= 24 号图另有旁证：`npc_014_td_chS` 写「在"无人山岭"狩猎"桃毛兽王"」，而桃毛兽王（`monster_id` 21）的 5 张图里只有 `_id=24` 是 MH4 系地图。该对应属 `[I]`（按标签与旁证推定，不是同一张表的直连）。
**从未被 `monster_habitat` 引用的另外 16 行 `locations`**（官方 chS 名可查到的都列出）：

| `_id` | English (`locations.name`) | 官方中文 | 依据 |
|---:|---|---|---|
| 9 | Arena | 斗技场 | `HN_HunterTipsMsg_chS` `HTM_Colosseum_P1`「在斗技场、立体斗技场等地图中……」 |
| 10 | V. Slayground | 立体斗技场 | 同上 |
| 15 | F. Slayground | 水上斗技场 `[I]` | chS 全文检索无「水上斗技场」，按仓库旧译名推断 `[I]` |
| 16 | Sanctuary | 禁入区域 | `GC_Title_1_chS` `#99`（`name1_100`） |
| 17 | Forlorn Arena | 塔之秘境 | `GC_Title_1_chS` `#100`（`name1_101`） |
| 18 | Sacred Pinnacle | 灵峰 | `GC_Title_1_chS` `#101`（`name1_102`） |
| 19 | Ingle Isle | 熔岩岛 | `GC_Title_1_chS` `#102`（`name1_103`）；官方用「熔」，仓库 `systems.md:630` 写「溶」 |
| 20 | Polar Field | 极圈 | `GC_Title_1_chS` `#103`（`name1_104`） |
| 21 | Wyvern's End | 龙之坟场 | `GC_Title_1_chS` `#104`（`name1_105`）；**不是**「龙之墓场」 |
| 25 | Castle Schrade | 修雷德城 | `GC_Title_1_chS` `RabbitName1_TXT_6`「完成20次修雷德城的任务」 |
| 26 | Fortress | 要塞 | `GC_Title_1_chS` `name1_605`「要塞」 |
| 27 | Forlorn Citadel | 要塞废墟 | `GC_Title_1_chS` `RabbitName1_5`「要塞废墟」 |
| 101–104 | 夜版 1–4 号图 | 同名 +（夜晚） | `GC_Title_1_chS` `#80`「古代森林（夜晚）」、`#83`「山林（夜晚）」、`#86`「雪山（夜晚）」、`#89`「溪流（夜晚）」 |

> 「仓库旧译名」列的 **森丘 / 遗群岭 / 禁足地 / 水上斗技场** 在 chS 文本里没有对应串，只是仓库与玩家惯用写法，一律 `[I]`；本页正文与表头只用官方名（山林 / 无人山岭 / 禁入区域 …）。

> 这些图不出现在 `monster_habitat`，所以不影响 §2 的表；列出只为把 `locations` 31 行讲全。

---

## 2 栖息地总表（`monster_habitat`，303 行）

按 `monster_id` 升序、`location_id` 升序排列；每组一张小表，末列是该行的 `_id`（即本页的引用凭据）。

### 2.1 飞龙 / 鸟龙 / 牙兽等（`monster_id` 1–43）

**1 雌火龙 Rathian**（`monster_id=1`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 6,7 | 2,3,5,6,8 | 7 | 1 |
| 山林（2） | 5 | 2,3,4,9,10 | 5 | 2 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 3 |
| 旧沙漠（5） | 2 | 1,4,7,10 | 5 | 10 |
| 孤岛（6） | 8 | 2,3,5,7 | 8 | 6 |
| 沼泽（7） | 8 | 1,2,5,6 | 4 | 9 |
| 遗迹平原（11） | 3 | 2,4,6,7,8 | 5 | 7 |
| 原生林（13） | 3 | 2,4,5,6 | 8 | 8 |
| 沙漠（22） | 4 | 1,2,3,5,7 | 9 | 11 |
| 密林（23） | 2 | 1,3,4,5,6,8,9 | 7 | 4 |
| 无人山岭（24） | 2 | 1,5,6,7 | 8 | 5 |

**2 火龙 Rathalos**（`monster_id=2`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 7 | 2,3,5,6,9,10 | 7 | 15 |
| 山林（2） | 5 | 2,3,4,9,10 | 5 | 14 |
| 孤岛（6） | 8 | 2,3,5,7 | 8 | 12 |
| 火山（8） | 10 | 2,6,7,9 | 8 | 13 |
| 遗迹平原（11） | 4 | 2,6,7,8 | 5 | 18 |
| 地底火山（12） | 8 | 1,2,4,6 | 9 | 16 |
| 无人山岭（24） | 7 | 1,2,5,6 | 8 | 17 |

**3 白电 Khezu**（`monster_id=3`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8 | 1,6,7 | 3 | 19 |
| 沼泽（7） | 9,4 | 3,4,6,7,9 | 2 | 20 |
| 冰海（14） | 6 | 3,4,5,9 | 6 | 21 |

**4 岩龙 Basarios**（`monster_id=4`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 4 | 5,6,8 | 2 | 22 |
| 火山（8） | 7 | 3,4,5,6 | 2 | 24 |
| 无人山岭（24） | 6 | 1,2,5 | 7 | 23 |

**5 铠龙 Gravios**（`monster_id=5`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 4,8 | 5,6 | 2 | 25 |
| 火山（8） | 7 | 3,4,5 | 6 | 28 |
| 地底火山（12） | 8,2 | 6,7 | 9 | 27 |
| 原生林（13） | 5 | 1,3,4 | 9 | 29 |
| 无人山岭（24） | 2 | 1,6,7 | 5 | 26 |

**7 角龙 Diablos**（`monster_id=7`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 7,1 | 1,2,3,4,10 | 5 | 30 |

**8 怪鸟 Yian Kut-Ku**（`monster_id=8`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 5 | 2,3,4,6 | 7 | 31 |
| 山林（2） | 9 | 2,3,4,10 | 5 | 32 |
| 沼泽（7） | 8 | 1,4,5,6 | 2 | 33 |
| 遗迹平原（11） | 3 | 2,4,6,7,8 | 5 | 35 |
| 密林（23） | 6 | 1,2,3,4,5,9 | 6 | 36 |
| 无人山岭（24） | 7 | 1,2,6 | 5 | 34 |

**9 毒怪鸟 Gypceros**（`monster_id=9`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4,2 | 2,3,4,5,6 | 7 | 37 |
| 山林（2） | 2 | 3,4,9,10 | 5 | 39 |
| 沼泽（7） | 8 | 1,4,5,6 | 2 | 38 |
| 遗迹平原（11） | 4 | 2,6,7,8 | 9 | 42 |
| 原生林（13） | 2,8 | 2,5,6,7,8 | 9 | 40 |
| 密林（23） | 6,9 | 1,2,3,4,5 | 6 | 43 |
| 无人山岭（24） | 2,6 | 1,7 | 5 | 41 |

**10 水龙 Plesioth**（`monster_id=10`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 7 | 6 | 8 | 45 |
| 孤岛（6） | 10 | 5,9 | 7 | 47 |
| 沙漠（22） | 7 | 6 | 6 | 48 |
| 密林（23） | 3 | 4 | 3 | 46 |
| 无人山岭（24） | 3 | 2 | 4 | 44 |

**11 麒麟 Kirin**（`monster_id=11`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 11 | 9,10 | （空） | 49 |
| 雪山（3） | 6 | 7,8 | （空） | 50 |
| 无人山岭（24） | 8 | 2,7 | （空） | 51 |

> 麒麟是唯一 `rest_area` 写成空字符串的怪（3 行全空），说明古龙没有固定的巢区记录，不是缺数据 `[I]`。

**14 蓝速龙王 Velocidrome**（`monster_id=14`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 5,8 | 2,3,4,8,10 | 5 | 52 |
| 原生林（13） | 6 | 2,5 | 9 | 54 |
| 密林（23） | 8 | 3,5,7 | 6 | 53 |

**15 黄速龙王 Gendrome**（`monster_id=15`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 1,10 | 4,7,10 | 3 | 55 |
| 原生林（13） | 6,9 | 2,5,6 | 9 | 57 |
| 沙漠（22） | 3 | 1,2,5,6,7 | 4 | 56 |

**16 红速龙王 Iodrome**（`monster_id=16`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 6,1 | 1,2,5,6,8 | 4 | 58 |
| 火山（8） | 7 | 5,6 | 3 | 59 |
| 地底火山（12） | 2 | 1,3,4 | 9 | 60 |
| 原生林（13） | 6,9 | 2,5,6 | 9 | 61 |

**17 砂龙王 Cephadrome**（`monster_id=17`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 7 | 2 | 3 | 62 |
| 沙漠（22） | 2,5 | （空） | 7 | 63 |

> `_id=63` 是全表**唯一** `move_area` 为空的行；同一只怪在旧沙漠（`_id=62`）只有 1 个移动区（`2`），二者属同一类「潜沙不换区」记录，不要当作缺字段 `[I]`。

**18 黑狼鸟 Yian Garuga**（`monster_id=18`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,6,7,8 | 9 | 64 |
| 山林（2） | 10,4 | 2,3,4,9,10 | 5 | 65 |
| 地底火山（12） | 7 | 1,4,6 | 7 | 67 |
| 密林（23） | 2,3 | 1,4,5,7,8,9 | 6 | 66 |

**19 大名盾蟹 Daimyo Hermitaur**（`monster_id=19`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 3 | 1,2,4,7 | 3 | 68 |
| 孤岛（6） | 5 | 2,7,9,10 | 6 | 69 |
| 沙漠（22） | 3 | 1,2,5,7,9 | 3 | 70 |
| 密林（23） | 3,10 | 1,2,4 | 9 | 72 |
| 无人山岭（24） | 3 | 1,2,6 | 4 | 71 |

**20 将军镰蟹 Shogun Ceanataur**（`monster_id=20`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 9 | 4,5,6,7 | 3 | 73 |
| 火山（8） | 6 | 3,4,5,7 | 6 | 74 |
| 无人山岭（24） | 3 | 1,2,6 | 4 | 75 |

**21 桃毛兽王 Congalala**（`monster_id=21`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 5 | 2,4,6,7,8 | 9 | 77 |
| 沼泽（7） | 4,6 | 1,2,5,8 | 4 | 79 |
| 原生林（13） | 2 | 5,7 | 6 | 80 |
| 密林（23） | 2 | 1,3,6,9 | 10 | 78 |
| 无人山岭（24） | 6 | 1,3,7 | 2 | 76 |

**22 雪狮子王 Blangonga**（`monster_id=22`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 6 | 7,8 | 3 | 81 |

**23 金狮子 Rajang**（`monster_id=23`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 5 | 6,8,9,10 | 11 | 87 |
| 雪山（3） | 8 | 1,6,7 | 3 | 85 |
| 旧沙漠（5） | 7 | 2,4 | 10 | 84 |
| 火山（8） | 2 | 4,5,6,7 | 8 | 86 |
| 遗迹平原（11） | 4 | 2,3,8 | 9 | 83 |
| 沙漠（22） | 7 | 1,2,3,5 | 9 | 82 |

**24 钢龙 Kushala Daora**（`monster_id=24`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8 | 1,3,6,7 | 8 | 88 |
| 冰海（14） | 2 | 1,3,9 | 4 | 89 |

**25 霞龙 Chameleos**（`monster_id=25`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 3 | 2,4,10 | 5 | 90 |
| 沼泽（7） | 8 | 4,5,6 | 2 | 91 |

**27 炎王龙 Teostra**（`monster_id=27`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 火山（8） | 8 | 2,4,7 | 6 | 92 |
| 地底火山（12） | 2 | 8 | 9 | 93 |

**30 野猪王 Bulldrome**（`monster_id=30`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 7 | 6,8 | 7 | 94 |
| 溪流（4） | 5,7 | 2,4,6,7 | 5 | 95 |
| 沼泽（7） | 8 | 4,5,6 | 7 | 96 |
| 密林（23） | 2,7 | 3,5 | 9 | 98 |
| 无人山岭（24） | 6 | 1,7 | 2 | 97 |

**32 轰龙 Tigrex**（`monster_id=32`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 3 | 2,5,6,9,10,11 | 8 | 101 |
| 雪山（3） | 3,8 | 1,6,7,8 | 3 | 100 |
| 旧沙漠（5） | 4 | 1,2,7,10 | 3 | 99 |
| 沼泽（7） | 5 | 6,8 | 4 | 105 |
| 遗迹平原（11） | 9 | 2,3,4,7,8 | 9 | 103 |
| 原生林（13） | 5 | 2,3,7,8 | 9 | 106 |
| 冰海（14） | 3,9 | 1,3,4,6,9 | 7 | 104 |
| 沙漠（22） | 5 | 1,2,3,7 | 9 | 102 |

**34 白速龙王 Giadrome**（`monster_id=34`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 7,6 | 8 | 7 | 107 |
| 冰海（14） | 2,5 | 1,6,7 | 5 | 108 |

**36 熔岩龙 Lavasioth**（`monster_id=36`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 火山（8） | 9,10 | 9 | 10 | 109 |

**37 迅龙 Nargacuga**（`monster_id=37`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,9,10 | 11 | 110 |
| 溪流（4） | 6 | 2,5,7,8 | 9 | 111 |
| 孤岛（6） | 6 | 2,3,5,8 | 7 | 113 |
| 密林（23） | 6 | 1,2,3,5,10 | 7 | 112 |

**42 冰牙龙 Barioth**（`monster_id=42`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8,6 | 7 | 3 | 115 |
| 冰海（14） | 1 | 2,3,6,7 | 9 | 114 |

**43 恐暴龙 Deviljho**（`monster_id=43`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 2 | 3,5,6,8 | 7 | 123 |
| 山林（2） | 3 | 2,4,10 | 5 | 117 |
| 雪山（3） | 6 | 7,8 | 3 | 118 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 116 |
| 旧沙漠（5） | 7 | 1,2,4,10 | 3 | 124 |
| 孤岛（6） | 7 | 2,3,5,6 | 7 | 129 |
| 沼泽（7） | 7 | 3,4,5,6,8 | 9 | 127 |
| 火山（8） | 6 | 3,5,7,9,10 | 8 | 128 |
| 遗迹平原（11） | 4 | 3,6,8 | 5 | 121 |
| 地底火山（12） | 8 | 1,2,3 | 9 | 126 |
| 原生林（13） | 4 | 1,3,9 | 5 | 122 |
| 冰海（14） | 6 | 1,3,7,9 | 4 | 125 |
| 沙漠（22） | 2 | 1,3,5,7,9 | 6 | 120 |
| 密林（23） | 3 | 1,2,5,7,8,9 | 6 | 130 |
| 无人山岭（24） | 6 | 1,2,3,4,7 | 5 | 119 |

### 2.2 后续怪物（`monster_id` 44–1351）

**44 土砂龙 Barroth**（`monster_id=44`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 7 | 1,2,4,6 | 3 | 132 |
| 沙漠（22） | 1 | 2,3,5,10 | 1 | 131 |

**45 爆锤龙 Uragaan**（`monster_id=45`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 火山（8） | 6 | 3,4,5,7 | 6 | 133 |
| 地底火山（12） | 3 | 4,6,8 | 9 | 134 |

**46 海龙 Lagiacrus**（`monster_id=46`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 7 | 4,5,6 | 8 | 135 |
| 孤岛（6） | 7 | 5,6,9 | 10 | 136 |
| 密林（23） | 10 | 3,4 | 10 | 137 |
| 无人山岭（24） | 3 | 2 | 4 | 138 |

**47 水兽 Royal Ludroth**（`monster_id=47`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 7 | 4,5,6 | 8 | 139 |
| 孤岛（6） | 7 | 2,5,6,9 | 10 | 140 |
| 无人山岭（24） | 3 | 2 | 4 | 141 |

**49 炎戈龙 Agnaktor**（`monster_id=49`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 火山（8） | 3 | 4,5,7,9 | 6 | 142 |
| 地底火山（12） | 8 | 2 | 9 | 143 |

**55 尾槌龙 Duramboros**（`monster_id=55`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 5 | 4,6,7 | 9 | 144 |
| 沼泽（7） | 4 | 2,5,6 | 8 | 145 |
| 密林（23） | 9 | 1,2,3 | 5 | 146 |

**56 潜口龙 Nibelsnarf**（`monster_id=56`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 7 | 2 | 3 | 147 |
| 沙漠（22） | 5 | 2 | 1 | 148 |

**57 雷狼龙 Zinogre**（`monster_id=57`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,6,7,9,10,11 | 8 | 149 |
| 溪流（4） | 5,6 | 2,4,5,6,7,8 | 9 | 150 |
| 孤岛（6） | 5 | 3,6,9 | 2 | 154 |
| 冰海（14） | 3 | 5,6,7,9 | 4 | 153 |
| 密林（23） | 5 | 1,2,3,9,10 | 5 | 151 |
| 无人山岭（24） | 5 | 1,2,3,4,6 | 7 | 152 |

**60 青熊兽 Arzuros**（`monster_id=60`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 5 | 6,7,8,9 | 2 | 155 |
| 孤岛（6） | 2 | 3,5,6,9 | 7 | 156 |
| 无人山岭（24） | 6,7 | 1 | 2 | 157 |

**61 白兔兽 Lagombi**（`monster_id=61`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8 | 6 | 7 | 158 |
| 冰海（14） | 2,3 | 1,2,3,6,7,9 | 5 | 159 |

**62 赤甲兽 Volvidon**（`monster_id=62`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 3 | 2,4,6 | 7 | 160 |
| 旧沙漠（5） | 4 | 2,3,7 | 6 | 161 |
| 火山（8） | 2 | 3,5,6,7 | 8 | 162 |
| 沙漠（22） | 7 | 1,3,5,9 | 10 | 164 |
| 无人山岭（24） | 6 | 1,7 | 2 | 163 |

**63 碎龙 Brachydios**（`monster_id=63`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 孤岛（6） | 5 | 2 | 6 | 165 |
| 火山（8） | 3 | 4,5,6,7 | 8 | 166 |
| 地底火山（12） | 2 | 6,8 | 9 | 167 |

**65 奇猿狐 Kecha Wacha**（`monster_id=65`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 遗迹平原（11） | 4 | 2,8 | 9 | 168 |
| 原生林（13） | 2 | 1,4,5 | 7 | 169 |

**66 鬼蛙 Tetsucabra**（`monster_id=66`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 3,4 | 2,3,4,7,8 | 9 | 170 |
| 孤岛（6） | 3,7 | 2,3,5,7 | 6 | 171 |
| 地底火山（12） | 2,8 | 1,2,3,8 | 9 | 173 |
| 冰海（14） | 6,9 | 3,4,5,7,9 | 6 | 172 |

**67 化鲛 Zamtrios**（`monster_id=67`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 冰海（14） | 2,6 | 1,2,3,6 | 7 | 174 |

**68 绞蛇龙 Najarala**（`monster_id=68`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 5 | 3,10 | 5 | 175 |
| 沼泽（7） | 6 | 4,5,8 | 2 | 176 |
| 原生林（13） | 5 | 1,3,4 | 8 | 177 |

**69 彻甲虫 Seltas Queen**（`monster_id=69`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 2 | 4,5,7 | 8 | 180 |
| 原生林（13） | 5 | 1,2,4 | 9 | 178 |
| 密林（23） | 2 | 3,5 | 7 | 179 |

**70 影蜘蛛 Nerscylla**（`monster_id=70`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 6 | 4,5,8 | 2 | 182 |
| 原生林（13） | 2,7 | 5,6 | 7 | 181 |

**71 黑蚀龙 Gore Magala**（`monster_id=71`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 6 | 2,3,5 | 4 | 183 |
| 遗迹平原（11） | 4 | 3,5,6,7,8 | 9 | 186 |
| 原生林（13） | 5 | 1,2,3,4 | 8 | 185 |
| 无人山岭（24） | 7 | 1,2,5,6 | 8 | 184 |

**76 重甲虫 Seltas**（`monster_id=76`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 2 | 4,5,7 | 8 | 190 |
| 遗迹平原（11） | 4 | 8,9 | 7 | 188 |
| 原生林（13） | 5 | 1,2,4,6,9 | 3 | 187 |
| 密林（23） | 2 | 3,5,7,9 | 1 | 189 |

**77 千刃龙 Seregios**（`monster_id=77`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 2 | 1,3,4,7,10 | 5 | 191 |
| 地底火山（12） | 7 | 1,2,5,6,8 | 9 | 192 |

**79 夜鸟 Malfestio**（`monster_id=79`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4,9 | 2,3,5,7,8,9 | 4 | 193 |
| 孤岛（6） | 3,5 | 2,5,7,8 | 3 | 194 |
| 原生林（13） | 1,3 | 1,3,4,5,9 | 8 | 196 |
| 无人山岭（24） | 2 | 1,3,6,7 | 5 | 195 |

**80 斩龙 Glavenus**（`monster_id=80`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 2 | 3,4,6,7,9,10 | 11 | 197 |
| 旧沙漠（5） | 4 | 1,5,7,10 | 3 | 198 |
| 火山（8） | 6 | 3,4,5,7 | 6 | 201 |
| 地底火山（12） | 8 | 1,2 | 9 | 202 |
| 沙漠（22） | 2,5 | 1,3,7 | 4 | 199 |
| 密林（23） | 4 | 1,2,3,5,9 | 10 | 200 |

**81 电龙 Astalos**（`monster_id=81`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 4 | 2,3,10 | 5 | 203 |
| 沼泽（7） | 4 | 1,2,5,6 | 4 | 205 |
| 遗迹平原（11） | 7 | 2,3,4,5,8 | 9 | 206 |
| 密林（23） | 3 | 1,2,5,6,9 | 7 | 204 |

**82 泡狐龙 Mizutsune**（`monster_id=82`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 4 | 6,7,8 | 5 | 207 |
| 原生林（13） | 3 | 1,4,5 | 3 | 210 |
| 密林（23） | 10 | 2,3,4,7 | 5 | 209 |
| 无人山岭（24） | 3 | 1,2 | 4 | 208 |

**83 巨兽 Gammoth**（`monster_id=83`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8,6 | 6,8 | 7 | 211 |
| 冰海（14） | 3 | 6,7,9 | 5 | 212 |

**85 跳狗龙王 Great Maccao**（`monster_id=85`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 5 | 2,3,4,6,7 | 8 | 213 |
| 遗迹平原（11） | 3 | 2,4,6,8 | 9 | 215 |
| 无人山岭（24） | 2,6 | 1,7 | 5 | 214 |

**86 天彗龙 Valstrax**（`monster_id=86`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 无人山岭（24） | 2 | 1,3,6,7 | 9 | 216 |

**513 金火龙 Gold Rathian**（`monster_id=513`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 7 | 2,3,5,6,8 | 7 | 218 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 217 |

**514 银火龙 Silver Rathalos**（`monster_id=514`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 7 | 2,3,5,6,9,10 | 7 | 220 |
| 山林（2） | 5 | 2,3,4,9,10 | 5 | 219 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 221 |

**1025 紫毒姬雌火龙 Dreadqueen Rathian**（`monster_id=1025`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 7 | 2,3,5,6,8 | 7 | 224 |
| 山林（2） | 5 | 2,3,4,9,10 | 5 | 223 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 227 |
| 旧沙漠（5） | 2 | 1,4,7,10 | 5 | 226 |
| 沼泽（7） | 8 | 1,2,5,6 | 4 | 222 |
| 遗迹平原（11） | 3 | 2,4,6,7,8 | 5 | 225 |
| 沙漠（22） | 4 | 1,2,3,5,7 | 9 | 229 |
| 密林（23） | 2 | 1,3,4,5,6,8,9 | 7 | 228 |

**1026 黑炎王雄火龙 Dreadking Rathalos**（`monster_id=1026`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 7 | 2,3,5,6,9,10 | 7 | 235 |
| 山林（2） | 5 | 2,3,4,9,10 | 5 | 230 |
| 孤岛（6） | 8 | 2,3,5,7 | 8 | 232 |
| 火山（8） | 10 | 2,6,7,9 | 8 | 233 |
| 遗迹平原（11） | 4 | 2,6,7,8 | 5 | 231 |
| 地底火山（12） | 8 | 1,2,4,6 | 9 | 234 |

**1031 鏖魔角龙 Bloodbath Diablos**（`monster_id=1031`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沙漠（22） | 7 | 1,2,3,4,10 | 5 | 236 |

**1042 独眼黑狼鸟 Deadeye Yian Garuga**（`monster_id=1042`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,6,7,8 | 9 | 239 |
| 山林（2） | 10 | 2,3,4,9 | 5 | 237 |
| 地底火山（12） | 7 | 1,4,6 | 7 | 238 |
| 无人山岭（24） | 8 | 2,6,7 | 5 | 240 |

**1043 矛碎大名盾蟹 Stonefist Hermitaur**（`monster_id=1043`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 旧沙漠（5） | 7 | 1,2,4 | 3 | 242 |
| 孤岛（6） | 5 | 2,7,10 | 6 | 241 |
| 沙漠（22） | 3 | 1,2,5,7,9 | 3 | 243 |

**1044 铠裂镰蟹 Rustrazor Ceanataur**（`monster_id=1044`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 沼泽（7） | 9 | 4,5,6,7 | 3 | 245 |
| 火山（8） | 6 | 3,4,5,7 | 6 | 244 |

**1056 荒钩爪轰龙 Grimclaw Tigrex**（`monster_id=1056`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 3,8 | 1,6,7,8 | 3 | 246 |
| 旧沙漠（5） | 4 | 1,2,7,10 | 3 | 248 |
| 遗迹平原（11） | 8 | 2,3,4,7 | 9 | 250 |
| 原生林（13） | 5 | 2,3,7,8 | 9 | 247 |
| 沙漠（22） | 5 | 1,2,3,7 | 9 | 249 |

**1061 白疾风迅龙 Silverwind Nargacuga**（`monster_id=1061`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,9,10 | 11 | 252 |
| 溪流（4） | 6 | 2,5,7,8 | 9 | 251 |
| 孤岛（6） | 6 | 2,3,5,8 | 7 | 253 |
| 密林（23） | 10 | 1,2,3,5,6 | 7 | 254 |

**1069 宝缠爆锤龙 Crystalbeard Uragaan**（`monster_id=1069`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 火山（8） | 6 | 3,4,5,7 | 6 | 255 |
| 地底火山（12） | 3 | 6,8 | 9 | 256 |

**1081 金雷公雷狼龙 Thunderlord Zinogre**（`monster_id=1081`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4 | 2,5,6,7,9,10,11 | 8 | 259 |
| 溪流（4） | 5,6 | 2,4,5,6,7,8 | 9 | 257 |
| 孤岛（6） | 5 | 3,6,9 | 2 | 261 |
| 冰海（14） | 3 | 5,6,7,9 | 4 | 258 |
| 密林（23） | 5 | 1,2,3,9,10 | 5 | 262 |
| 无人山岭（24） | 5 | 1,2,3,4,6 | 7 | 260 |

**1084 红盔青熊兽 Redhelm Arzuros**（`monster_id=1084`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 5 | 6,7,8,9 | 2 | 264 |
| 孤岛（6） | 2 | 3,5,6,9 | 7 | 263 |
| 密林（23） | 3 | 1,2,9 | 10 | 265 |

**1085 大雪主白兔兽 Snowbaron Lagombi**（`monster_id=1085`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8 | 6 | 7 | 266 |
| 冰海（14） | 7 | 1,2,6 | 5 | 267 |

**1090 岩穿鬼蛙 Drilltusk Tetsucabra**（`monster_id=1090`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 3,4 | 2,3,4,7,8 | 9 | 270 |
| 孤岛（6） | 3,7 | 2,3,5,7 | 6 | 268 |
| 地底火山（12） | 2,8 | 1,2,8 | 9 | 269 |
| 冰海（14） | 3,9 | 3,4,9 | 7 | 271 |

**1103 朧隠夜鸟 Nightcloak Malfestio**（`monster_id=1103`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 4,9 | 2,3,5,7,8,9 | 4 | 272 |
| 孤岛（6） | 3,5 | 2,5,7,8 | 3 | 273 |
| 原生林（13） | 1,3 | 1,3,4,5,9 | 8 | 275 |
| 无人山岭（24） | 2 | 1,3,6,7 | 5 | 274 |

**1104 烬灭刃斩龙 Hellblade Glavenus**（`monster_id=1104`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 2 | 3,4,6,7,9,10 | 11 | 276 |
| 旧沙漠（5） | 4 | 1,5,7,10 | 3 | 277 |
| 火山（8） | 6 | 3,4,5,7 | 6 | 279 |
| 地底火山（12） | 8 | 1,2 | 9 | 278 |
| 沙漠（22） | 2,5 | 1,3,7 | 4 | 281 |
| 密林（23） | 4 | 2,3,5,9 | 10 | 280 |

**1105 青电主电龙 Boltreaver Astalos**（`monster_id=1105`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 4 | 2,3,10 | 2 | 282 |
| 沼泽（7） | 4 | 1,2,5,6 | 4 | 283 |
| 遗迹平原（11） | 7 | 2,3,4,5,8 | 9 | 284 |

**1106 天眼泡狐龙 Soulseer Mizutsune**（`monster_id=1106`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 溪流（4） | 4 | 6,7,8 | 5 | 285 |
| 原生林（13） | 3 | 1,4,5 | 3 | 287 |
| 密林（23） | 10 | 2,3,4,7 | 5 | 286 |

**1107 银岭巨兽 Elderfrost Gammoth**（`monster_id=1107`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 雪山（3） | 8,6 | 6,8 | 7 | 289 |
| 冰海（14） | 3 | 6,7,9 | 5 | 288 |

**1303 金狮子（激昂）Furious Rajang**（`monster_id=1303`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 古代森林（1） | 5,8 | 6,8,9,10 | 11 | 291 |
| 火山（8） | 2 | 4,5,6,7 | 8 | 290 |
| 遗迹平原（11） | 4 | 2,3,8 | 9 | 292 |

**1323 恐暴龙（怒食）Savage Deviljho**（`monster_id=1323`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 山林（2） | 3 | 2,4,10 | 5 | 295 |
| 雪山（3） | 6 | 7,8 | 3 | 296 |
| 溪流（4） | 8 | 2,4,5,6,7,9 | 8 | 297 |
| 旧沙漠（5） | 7 | 1,2,4,10 | 3 | 294 |
| 孤岛（6） | 7 | 2,3,5,6 | 7 | 298 |
| 火山（8） | 6 | 3,5,7,9,10 | 8 | 299 |
| 遗迹平原（11） | 3 | 4,6,8 | 5 | 301 |
| 冰海（14） | 6 | 1,3,7,9 | 4 | 293 |
| 沙漠（22） | 2 | 1,3,5,7,9 | 6 | 300 |

**1351 混沌黑蚀龙 Chaotic Gore Magala**（`monster_id=1351`）

| 地图 | 起始区 | 移动区 | 休息区 | 行 `_id` |
|---|---|---|---|---|
| 遗迹平原（11） | 3 | 4,5,6,7,8 | 9 | 303 |
| 原生林（13） | 5 | 1,2,3,4 | 8 | 302 |

---

## 3 异常状态（`monster_ailment`，233 行 / 66 只）

`monster_ailment` 只回答「**这只怪会施加哪些异常**」，不含触发阈值、持续时间和解除方式；阈值见 `monster-status.md`，解除见 §4。

- 标签是**英文自由文本**（30 种），库内没有中文列；下表「中文参考」是按标签字面翻译，**不是**官方 chS 文本，仅供参考 `[U]`。
- 括号内数字是该行的 `_id`，可单独回查。

| 怪物（`monster_id`） | 会施加的异常（行 `_id`） | 条数 |
|---|---|---:|
| 雌火龙 Rathian（1） | Small Roar(1), Large Wind Pressure(2), Poison(3), Fireblight(4) | 4 |
| 火龙 Rathalos（2） | Small Roar(15), Large Wind Pressure(16), Poison(17), Fireblight(18) | 4 |
| 白电 Khezu（3） | Large Roar(29), Large Wind Pressure(30), Paralysis(31), Thunderblight(32) | 4 |
| 怪鸟 Yian Kut-Ku（8） | Small Wind Pressure(33), Fireblight(34) | 2 |
| 毒怪鸟 Gypceros（9） | Small Wind Pressure(35), Poison(36), Stun(37) | 3 |
| 水龙 Plesioth（10） | Small Wind Pressure(38), Sleep(39), Waterblight(40) | 3 |
| 麒麟 Kirin（11） | Paralysis(41), Thunderblight(42) | 2 |
| 黄速龙王 Gendrome（15） | Paralysis(43) | 1 |
| 红速龙王 Iodrome（16） | Poison(44) | 1 |
| 砂龙王 Cephadrome（17） | Paralysis(45), Iceblight(46) | 2 |
| 黑狼鸟 Yian Garuga（18） | Small Roar(47), Small Wind Pressure(48), Poison(49), Fireblight(50) | 4 |
| 大名盾蟹 Daimyo Hermitaur（19） | Small Wind Pressure(58), Iceblight(59) | 2 |
| 将军镰蟹 Shogun Ceanataur（20） | Bleeding(64), Waterblight(65) | 2 |
| 雪狮子王 Blangonga（22） | Small Roar(66), Tremor(67), Snowman(68), Iceblight(69) | 4 |
| 金狮子 Rajang（23） | Small Roar(70), Large Roar(71), Tremor(72), Thunderblight(73) | 4 |
| 钢龙 Kushala Daora（24） | Small Roar(74), Large Wind Pressure(75), Dragon Wind Pressure(76), Snowman(77), Iceblight(78) | 5 |
| 霞龙 Chameleos（25） | Large Wind Pressure(79), Poison(80) | 2 |
| 炎王龙 Teostra（27） | Small Roar(81), Dragon Wind Pressure(82), Blastblight(83), Fireblight(84) | 4 |
| 轰龙 Tigrex（32） | Special Roar(85), Large Wind Pressure(86), Environmental(87) | 3 |
| 霸龙 Akantor（33） | Special Roar(92), Tremor(93), Defense Down(94), Fireblight(95), Dragonblight(96) | 5 |
| 熔岩龙 Lavasioth（36） | Tremor(97), Fireblight(98) | 2 |
| 迅龙 Nargacuga（37） | Small Roar(99), Small Wind Pressure(100), Large Wind Pressure(101) | 3 |
| 崩龙 Ukanlos（38） | Special Roar(106), Tremor(107), Snowman(108), Iceblight(109) | 4 |
| 恐暴龙 Deviljho（43） | Large Roar(110), Tremor(111), Defense Down(112), Dragonblight(113), Environmental(114) | 5 |
| 爆锤龙 Uragaan（45） | Small Roar(120), Tremor(121), Sleep(122), Fireblight(123) | 4 |
| 海龙 Lagiacrus（46） | Small Roar(129), Thunderblight(130) | 2 |
| 水兽 Royal Ludroth（47） | Waterblight(131) | 1 |
| 炎戈龙 Agnaktor（49） | Small Roar(132), Tremor(133), Fireblight(134) | 3 |
| 煌黑龙 Alatreon（50） | Large Roar(135), Dragon Wind Pressure(136), Tremor(137), Snowman(138), Fireblight(139), Dragonblight(140), Thunderblight(141), Iceblight(142) | 8 |
| 尾槌龙 Duramboros（55） | Large Roar(143), Tremor(144), Stun(145) | 3 |
| 潜口龙 Nibelsnarf（56） | Waterblight(146) | 1 |
| 雷狼龙 Zinogre（57） | Small Roar(147), Large Wind Pressure(148), Thunderblight(149) | 3 |
| 岚龙 Amatsu（58） | Small Roar(154), Large Wind Pressure(155) | 2 |
| 白兔兽 Lagombi（61） | Tremor(159), Snowman(160), Iceblight(161) | 3 |
| 赤甲兽 Volvidon（62） | Tremor(166), Paralysis(167), Soiled(168) | 3 |
| 碎龙 Brachydios（63） | Small Roar(169), Blastblight(170) | 2 |
| 奇猿狐 Kecha Wacha（65） | Small Roar(171), Tremor(172), Iceblight(173) | 3 |
| 鬼蛙 Tetsucabra（66） | Small Roar(174), Tremor(175), Environmental(176) | 3 |
| 化鲛 Zamtrios（67） | Large Roar(180), Tremor(181), Snowman(182), Iceblight(183), Waterblight(184) | 5 |
| 绞蛇龙 Najarala（68） | Large Roar(185), Paralysis(186), Stun(187) | 3 |
| 彻甲虫 Seltas Queen（69） | Tremor(188), Soiled(189), Waterblight(190) | 3 |
| 黑蚀龙 Gore Magala（71） | Large Roar(191), Small Wind Pressure(192), Tremor(193), Frenzy Virus(194) | 4 |
| 天廻龙 Shagaru Magala（72） | Large Roar(195), Tremor(196), Frenzy Virus(197) | 3 |
| 重甲虫 Seltas（76） | Defense Down(198) | 1 |
| 千刃龙 Seregios（77） | Small Roar(199), Large Wind Pressure(200), Bleeding(201) | 3 |
| 夜鸟 Malfestio（79） | Small Roar(202), Small Wind Pressure(203), Confusion(204), Sleep(205) | 4 |
| 斩龙 Glavenus（80） | Small Roar(206), Fireblight(207) | 2 |
| 电龙 Astalos（81） | Small Roar(212), Small Wind Pressure(213), Thunderblight(214), Paralysis(215) | 4 |
| 泡狐龙 Mizutsune（82） | Small Roar(216), Bubbles(217), Waterblight(218) | 3 |
| 巨兽 Gammoth（83） | Small Roar(219), Large Wind Pressure(220), Small Wind Pressure(221), Tremor(222), Snowman(223), Iceblight(224) | 6 |
| 骸龙 Nakarkos（84） | Large Roar(225), Tremor(226), Boned(227), Mucus(228), Paralysis(229), Blastblight(230), Fireblight(231), Thunderblight(232), Dragonblight(233) | 9 |
| 金火龙 Gold Rathian（513） | Large Roar(5), Large Wind Pressure(6), Poison(7), Fireblight(8) | 4 |
| 银火龙 Silver Rathalos（514） | Large Roar(19), Large Wind Pressure(20), Poison(21), Stun(22), Fireblight(23) | 5 |
| 紫毒姬雌火龙 Dreadqueen Rathian（1025） | Large Roar(9), Large Wind Pressure(10), Poison(11), Noxious Poison(12), Deadly Poison(13), Fireblight(14) | 6 |
| 黑炎王雄火龙 Dreadking Rathalos（1026） | Large Roar(24), Large Wind Pressure(25), Noxious Poison(26), Stun(27), Fireblight(28) | 5 |
| 独眼黑狼鸟 Deadeye Yian Garuga（1042） | Small Special Roar(51), Small Wind Pressure(52), Large Wind Pressure(53), Poison(54), Noxious Poison(55), Deadly Poison(56), Fireblight(57) | 7 |
| 矛碎大名盾蟹 Stonefist Hermitaur（1043） | Large Wind Pressure(60), Tremor(61), Stun(62), Iceblight(63) | 4 |
| 荒钩爪轰龙 Grimclaw Tigrex（1056） | Special Roar(88), Large Wind Pressure(89), Tremor(90), Environmental(91) | 4 |
| 白疾风迅龙 Silverwind Nargacuga（1061） | Small Roar(102), Small Wind Pressure(103), Large Wind Pressure(104), Bleeding(105) | 4 |
| 宝缠爆锤龙 Crystalbeard Uragaan（1069） | Small Roar(124), Tremor(125), Sleep(126), Stun(127), Fireblight(128) | 5 |
| 金雷公雷狼龙 Thunderlord Zinogre（1081） | Small Roar(150), Large Roar(151), Stun(152), Thunderblight(153) | 4 |
| 红盔青熊兽 Redhelm Arzuros（1084） | Small Roar(156), Small Wind Pressure(157), Tremor(158) | 3 |
| 大雪主白兔兽 Snowbaron Lagombi（1085） | Small Roar(162), Tremor(163), Snowman(164), Iceblight(165) | 4 |
| 岩穿鬼蛙 Drilltusk Tetsucabra（1090） | Small Roar(177), Tremor(178), Environmental(179) | 3 |
| 烬灭刃斩龙 Hellblade Glavenus（1104） | Large Roar(208), Large Wind Pressure(209), Blastblight(210), Fireblight(211) | 4 |
| 恐暴龙（怒食）Savage Deviljho（1323） | Large Roar(115), Tremor(116), Defense Down(117), Dragonblight(118), Environmental(119) | 5 |

### 3.1 30 个标签与施加者数

| 标签（库内原文） | 中文参考 `[U]` | 施加怪物数 |
|---|---|---:|
| Small Roar | 小咆哮 | 28 |
| Tremor | 震动 | 27 |
| Large Wind Pressure | 大风压 | 20 |
| Fireblight | 火属性异常 | 19 |
| Large Roar | 大咆哮 | 17 |
| Small Wind Pressure | 小风压 | 13 |
| Iceblight | 冰属性异常 | 12 |
| Poison | 毒 | 10 |
| Thunderblight | 雷属性异常 | 9 |
| Stun | 气绝 | 8 |
| Snowman | 雪人 | 8 |
| Paralysis | 麻痹 | 8 |
| Waterblight | 水属性异常 | 7 |
| Environmental | 地形 / 环境伤害 | 6 |
| Dragonblight | 龙属性异常 | 5 |
| Special Roar | 特殊咆哮 | 4 |
| Sleep | 睡眠 | 4 |
| Defense Down | 防御力下降 | 4 |
| Blastblight | 爆破属性异常 | 4 |
| Noxious Poison | 剧毒（与 Deadly Poison 的中文区分未证实） | 3 |
| Dragon Wind Pressure | 龙风压 | 3 |
| Bleeding | 裂伤 | 3 |
| Soiled | 污损（臭气） | 2 |
| Frenzy Virus | 狂龙病毒 | 2 |
| Deadly Poison | 猛毒（同上） | 2 |
| Small Special Roar | 小特殊咆哮 | 1 |
| Mucus | 粘液 | 1 |
| Confusion | 混乱 | 1 |
| Bubbles | 泡 | 1 |
| Boned | 骨化 / 骨缠（语义未证实） | 1 |

> 计数校验：28+27+20+19+17+13+12+10+9+8+8+8+7+6+5+4+4+4+4+3+3+3+2+2+2+1+1+1+1+1 = 233。

---

## 4 解除方式（道具 / 技能）

`monster_ailment` **没有**解除字段，所以本节不引用该表，而是引用两张有描述的库表：`items`（道具英文说明，`description`）与 `skills`（技能名与说明）。**db 里查不到对应条目的，一律标 [U]，不填空话。**

| 异常标签 | 解除道具（官方中文名 / `items._id`） | 无效化技能（`skills._id`） | 证据 |
|---|---|---|---|
| Poison | **解毒药**（13）、**汉方药**（27） | Negate Poison（1，毒耐性 10 点） | items 13 `Removes all traces of poison from your system.`；items 27 `Removes all traces of poison and restores a slight amount of Health.`；skills 1 `Weakens the effects of Deadly Poison and completely prevents lesser Poisons.` |
| Deadly Poison / Noxious Poison | **未证实**：库内没有任何道具说明写「解猛毒 / 剧毒」 | Negate Poison（1）只**弱化**上级毒，不免疫 | skills 1 同句 |
| Fireblight / Waterblight / Thunderblight / Iceblight / Dragonblight | **打消果实**（305） | Blightproof（`skills._id` 60，10 点） | items 305 `A mysterious berry that cures various Blights and also protects from unknown viruses.` |
| Frenzy Virus | **打消果实**（305，同句 `protects from unknown viruses`） | Antivirus（`skills._id` 24，10 点） | items 305 同句；skills 24 技能名 |
| Paralysis | **未证实**（库内无解除麻痹的道具说明） | Negate Paralysis（`skills._id` 3，10 点） | skills 3 技能名 |
| Sleep | **振奋饮料**（30） | Negate Sleep（`skills._id` 5，10 点） | items 30 `A Guild-approved beverage that boosts your Stamina. Helps shake off sleep, too!` |
| Stun | **未证实** | Halve Stun（`skills._id` 8，10 点）/ Negate Stun（7，15 点） | skills 8 / 7 技能名 |
| Bleeding | **刺身鱼**（363） | Negate Bleeding（`skills._id` 27，10 点） | items 363 `A fatty fish that can restore a small amount of Health. Helps cure Bleeding.` |
| Snowman | **消散剂**（25） | **未证实**（无对应技能行） | items 25 `Immediately removes any ice or webbing on your body.`；官方中文提示 `HN_MonsterListMsg_chS #213`（`P2_3_hint_204`）「若被白速龙王吐出的冰液击中，会陷入雪人状态。事先准备好"消散剂"的话……」 |
| Bubbles | **消散剂**（25） | **未证实** | 官方中文提示 `HN_MonsterListMsg_chS #143`（`P2_3_hint_134`）「【消散剂是应对泡沫的法宝！】……使用"消散剂"也十分有效。」；items 25 的 `description_fr` 也写 `la glace et les bulles` |
| Soiled（臭气） | **除臭球**（74） | **未证实** | 官方中文提示 `HN_MonsterListMsg_chS #115`（`P2_3_hint_106`）「一旦沾染臭气，全身都会奇臭无比，以至于连肉和药都臭得难以入口。可能的话，还望常备"除臭球"。」；`#207`（`P2_3_hint_198`）桃毛兽王条目同 |
| Small Roar / Large Roar / Special Roar / Small Special Roar | 道具无（音爆类道具对吼叫无效，db 无对应道具） | Earplugs（`skills._id` 11，10 点）/ HG Earplugs（10，15 点） | skills 11 / 10 技能名 |
| Small Wind Pressure / Large Wind Pressure / Dragon Wind Pressure | 道具无 | Windproof (Lo)（`skills._id` 13，10 点）/ Windproof (Hi)（12，15 点） | skills 13 / 12 技能名 |
| Tremor | 道具无 | Tremor Res（`skills._id` 14，10 点） | skills 14 技能名 |
| Environmental / Confusion / Mucus / Boned / Defense Down | **未证实**：库内没有任何道具或技能说明提到这 5 个标签；忍耐种子（304）只写「临时提升防御」，不是解除 | **未证实** | [U] |

**中文道具名出处**（romfs 官方 chS 文本，`i = 2 × items._id`，文件 `MHGU-private/romfs-extract/gmd/table/itemData_chS.gmd.json`）：

| `items._id` | 英文名 | 官方中文 | chS 索引 |
|---:|---|---|---:|
| 13 | Antidote | 解毒药 | `#26` |
| 27 | Herbal Medicine | 汉方药 | `#54` |
| 30 | Energy Drink | 振奋饮料 | `#60` |
| 25 | Cleanser | 消散剂 | `#50` |
| 74 | Deodorant | 除臭球 | `#148` |
| 304 | Adamant Seed | 忍耐种子 | `#608` |
| 305 | Nulberry | 打消果实 | `#610` |
| 363 | Sushifish | 刺身鱼 | `#726` |

---

## 5 缺口与注意事项

### 5.1 有 12 只大型怪完全没有栖息地行

`monster_habitat` 覆盖的 81 只全为大型怪；大型怪共 93 只（81 + 12），下列 12 只**没有**任何行（多为古龙 / 最终 boss / 特殊个体）：

| `monster_id` | 名字 | 说明 |
|---:|---|---|
| 12 | Lao-Shan Lung 老山龙 | 要塞战专用，无常规地图栖息记录 |
| 13 | Fatalis 黑龙 | 古龙，无栖息行 |
| 33 | Akantor 霸龙 | 有异常行（§3），无栖息行 |
| 38 | Ukanlos 崩龙 | 有异常行，无栖息行 |
| 50 | Alatreon 煌黑龙 | 有异常行，无栖息行 |
| 58 | Amatsu 岚龙 | 有异常行，无栖息行 |
| 72 | Shagaru Magala 天廻龙 | 有异常行，无栖息行 |
| 84 | Nakarkos 骸龙 | 有异常行，无栖息行 |
| 88 | Ahtal-Ka 阁螳螂 | 最终 boss |
| 269 | Crimson Fatalis 红黑龙 | 古龙 |
| 525 | Old Fatalis 祖龙 | 古龙 |
| 1343 | Raging Brachydios | 特殊个体；库内无中文名，故只给英文 `[U]` |

### 5.2 36 只小型怪也没有栖息行

`monster_id` 4097–4144 段共 36 只小型怪（草食龙、灵鹿、速龙、巨蜂、甲虫等）全部没有 `monster_habitat` 行；小型怪不参与本表的「起始区 / 移动区 / 巢区」机制，**不要**把这 36 只当成数据缺失。

### 5.3 有栖息地但库内没有异常行 → 是库的覆盖缺口，不是「不会施加异常」

21 只怪有栖息行但 `monster_ailment` 无行：`4` 岩龙、`5` 铠龙、`7` 角龙、`14` 蓝速龙王、`21` 桃毛兽王、`30` 野猪王、`34` 白速龙王、`42` 冰牙龙、`44` 土砂龙、`60` 青熊兽、`70` 影蜘蛛、`85` 跳狗龙王、`86` 天彗龙、`1031` 鏖魔角龙、`1044` 铠裂镰蟹、`1103` 朧隠夜鸟、`1105` 青电主电龙、`1106` 天眼泡狐龙、`1107` 银岭巨兽、`1303` 金狮子（激昂）、`1351` 混沌黑蚀龙。

> 其中岩龙 / 铠龙（毒气）、桃毛兽王（臭气）、青熊兽等在实际游戏里明显带异常，而 db 该表无行 ⇒ **`monster_ailment` 只覆盖 66 只，属第三方库的收录不全** `[I]`，玩家向结论要回查 `monster-status.md` 或实测。

### 5.4 字段语义的边界

- `start_area` / `move_area` / `rest_area` 的中文叫法（起始 / 移动 / 休息·巢）是**按列名直译** `[I]`；db 没有任何 schema 注释能证明「起点是否等于出生点」。
- `rest_area` 可以不在 `move_area` 里（例：雌火龙古代森林 `rest=7`、`move=2,3,5,6,8`），说明巢区是独立的一站，不是移动区子集。
- 夜版地图（`locations._id` 101–104）在本表零引用；`locations.map` 对日夜是同一张图。

---

## 6 回查 SQL（照抄即可复现）

```sql
-- 303 行全表（本页 §2 的排序）
SELECT h._id, h.monster_id, m.name, h.location_id, l.name, h.start_area, h.move_area, h.rest_area
FROM monster_habitat h
JOIN monsters m ON m._id = h.monster_id
JOIN locations l ON l._id = h.location_id
ORDER BY h.monster_id, h.location_id;

-- 地图分布（本页 §1 的计数，合计 303）
SELECT h.location_id, l.name, COUNT(*)
FROM monster_habitat h JOIN locations l ON l._id = h.location_id
GROUP BY h.location_id ORDER BY h.location_id;

-- 有栖息行但无异常行（本页 §5.3）
SELECT m._id, m.name FROM monsters m
WHERE EXISTS (SELECT 1 FROM monster_habitat h WHERE h.monster_id = m._id)
  AND NOT EXISTS (SELECT 1 FROM monster_ailment a WHERE a.monster_id = m._id);

-- 233 行异常（本页 §3）
SELECT a._id, a.monster_id, m.name, a.ailment
FROM monster_ailment a JOIN monsters m ON m._id = a.monster_id
ORDER BY a.monster_id, a._id;
```

**标记约定**：本页数值全部来自第三方库 `mhgu.db`，按项目口径标 `[I]`；`[U]` 用于「库里查不到、本文不臆造」的条目（5 个异常标签的解除方式、2 个毒标签的中文区分、若干怪物中文名）。
