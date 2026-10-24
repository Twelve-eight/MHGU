# MHGU GMD 文本容器（Switch 1.4.0，版本 0x00010302）

工具：`tools/mhgu/gmd.mjs`。子命令 `list <file.gmd> [--all]` / `json <file.gmd> <out.json>` / `batch <langDir> <outDir>`；`batch` 会镜像目录并把每个文件的串数写成 `outDir/index.json`。解包结果只放 `MHGU-private/`，不进仓库。

样本：`<romfs>/nativeNX/chS/table/` 下 **11 个文件的头部**逐字节实测，其中 6 个（`privilege_data`、`MonsterDemo`、`HN_MonsterListMsg`、`itemData`、`skillData`、`skillTypeData`）连串块/键表的关键区段也逐字节读过（下面标注"实测"的偏移均可复算）。证据等级：**[B]** 本次字节实测 ｜ **[A]** 算术闭合（头部字段 × 记录长 = 文件长）｜ **[I]** 推断 ｜ **[U]** 未知。

## 速览

- GMD 是 MT Framework 的文本容器：`GMD\0` + 版本 `0x00010302` + 0x28 B 头 + 组名 + （可选）键表 + **NUL 分隔的 UTF-8 串块**。
- 串块**永远在文件末尾**，长度就是头部 `0x20` 字段。`0x20` **不是偏移**：把 `0xDC86` 当起点会落在 UTF-8 续字节上（`HN_MonsterListMsg` 实测，`stringsStart = 文件长 - 0x20`）。
- 两种布局：**变体 A**（无键表，串块紧跟组名）与 **变体 B**（组名后依次是 20 B/条的键表、1024 B 未知表、标签块，再是串块）。`0x14` 与 `0x1C` **同时为 0 → A，否则 B**，并用尺寸闭合复核。
- 语言树：`nativeNX/{chS,chT,eng,fre,ger,ita,spa}`（7 种，无 jpn）。**`chS`/`chT` 没有 `quest/`、`otomo/` 目录** —— 中文没有逐任务文本，任务文本只有 eng/fre/ger/ita/spa 5 种（[B] 目录枚举）。

## 头部（小端，0x28 B）

| 偏移 | 类型 | 含义 | 依据 |
|---|---|---|---|
| 0x00 | char[4] | `GMD\0` | [B] 11/11 |
| 0x04 | u32 | 版本 `0x00010302` | [B] 11/11（`itemData`、`skillData`、`skillTypeData`、`guestQuestData`、`privilege_data`、`hunterArtsData`、`armorSeriesData`、`HN_MonsterListMsg`、`HN_HunternoteMsg`、`MonsterDemo`、`CommonMsg` 全同） |
| 0x08 | u32 | 恒 0 | [B] 11/11 |
| 0x0C | u32 | 时间戳（Unix 秒）？ | [I] 7 个样本解成时间全落在 2002-11 ～ 2006-09（如 `itemData` `0x450EDE5A` = 2006-09-18，`HN_HunternoteMsg` `0x450EE6B2` 同日；`skillData`/`skillTypeData` 同为 `0x42ECF246`） |
| 0x10 | u32 | 恒 0 | [B] 11/11 |
| 0x14 | u32 | **键条目数**（可小于串数、可稀疏）；变体 A 为 0 | [B] `MapName` 1 条 / 2 串；`Lb_TradeShopMsg`、`StartMenuMsg` 的 index 有空洞；密排文件（`HN_MonsterListMsg`、`MonsterDemo`）等于 `0x18` |
| 0x18 | u32 | **字符串数** | [B] 与串块 NUL 切分结果逐个相符（`privilege_data` 6、`HN_MonsterListMsg` 220、`CommonMsg` 198 …） |
| 0x1C | u32 | **标签块字节数**；变体 A 为 0 | [B] `HN_MonsterListMsg` = 3070 = `labelsStart` 到 `stringsStart` 的差；`MonsterDemo` = 1409 |
| 0x20 | u32 | **字符串块字节数**（不是偏移） | [B] `文件长 - 0x20 = stringsStart`，且 `stringsStart` 处是合法 UTF-8 串首字节 |
| 0x24 | u32 | 组名长度 n（不含 NUL） | [B] `itemData`=8、`HN_MonsterListMsg`=17、`armorSeriesData`=15 |
| 0x28 | char[n]+NUL | 组名（ASCII，等于文件名主干） | [B] 11/11 与文件名一致 |

## 布局 A（无键表）

串块起点 = `0x28 + n + 1`，且 `0x28 + n + 1 + 0x20 == 文件长`。实测闭合 7/7：

| 文件 | 组名长 n | 串块 | 头+组名 | 合计 | 文件长 |
|---|---|---|---|---|---|
| `itemData_chS.gmd` | 8 | 326,075 | 49 | 326,124 | 326,124 |
| `skillData_chS.gmd` | 9 | 22,946 | 50 | 22,996 | 22,996 |
| `skillTypeData_chS.gmd` | 13 | 15,325 | 54 | 15,379 | 15,379 |
| `privilege_data_chS.gmd` | 14 | 106 | 55 | 161 | 161 |
| `guestQuestData_chS.gmd` | 14 | 9,950 | 55 | 10,005 | 10,005 |
| `hunterArtsData_chS.gmd` | 14 | 64,708 | 55 | 64,763 | 64,763 |
| `armorSeriesData_chS.gmd` | 15 | 684,126 | 56 | 684,182 | 684,182 |

## 布局 B（键控表）

组名之后依次为：

| 段 | 长度 | 内容 |
|---|---|---|
| 条目表 | `0x14` × 20 B | 每条：`u32 index`（**串块下标**，严格递增但**可以不连续**）、`u32 hashLo`、`u32 hashHi`、`u32 labelOffset`（标签块内偏移）、`u32 unk` |
| 未知表 | **1024 B**（256 × u32） | 值域 0..n-1 的整型数组，含义 [U]；已测 6 个文件都是 1024 B |
| 标签块 | `0x1C` B | NUL 分隔 ASCII 标签（`p1_index_001`、`P2_3_hint_210`、`Kanji_Lioleia` …） |
| 串块 | `0x20` B | 同布局 A，文件末尾 |

推导：`stringsStart = 文件长 - 0x20`；`labelsStart = stringsStart - 0x1C`；`entriesEnd = 0x28 + n + 1 + 0x14 × 20`；`未知表 = labelsStart - entriesEnd`。

实测 6/6：

| 文件 | 文件长 | 条目数 | 0x1C | stringsStart | labelsStart | 未知表 |
|---|---|---|---|---|---|---|
| `HN_MonsterListMsg_chS.gmd` | 65,006 | 220 | 3,070 | 8,552 | 5,482 | 1,024 |
| `HN_HunternoteMsg_chS.gmd` | 4,407 | 60 | 922 | 3,203 | 2,281 | 1,024 |
| `HN_HunterTipsMsg_chS.gmd` | 72,937 | 512 | 9,500 | 20,821 | 11,321 | 1,024 |
| `MonsterDemo_chS.gmd` | 5,373 | 96 | 1,409 | 4,405 | 2,996 | 1,024 |
| `CommonMsg_chS.gmd` | 12,036 | 198 | 2,443 | 7,477 | 5,034 | 1,024 |
| `MapName_chS.gmd` | 1,124 | 1 | 14 | 1,106 | 1,092 | 1,024 |
| `Lb_TradeShopMsg_chS.gmd` | 13,020 | 145 | 2,803 | 6,783 | 3,980 | 1,024 |

`Lb_TradeShopMsg` 的闭合：56（头+组名）+ 145×20（2,900）+ 1,024 + 2,803 + 6,237（串块）= 13,020 = 文件长 [A]；145 条键对 146 个串，正好缺 1 个（index 34）。

**键 ↔ 串的对应靠 `entry.index`，不是数组位置。** 键是串块下标的**升序子集，可以稀疏**：

- `MapName_chS.gmd`：1 条 entry（index 0）、2 个串 —— 串 0 = `@` 挂着标签 `SAMPLE2_TEST0`，串 1 = `テンプレ２` **没有键**。
- `Lb_TradeShopMsg_chS.gmd`：前 34 条 index 依次 0..33，第 35 条（数组位置 34）index = 35 → 中间跳过 1 个串。
- `StartMenuMsg_chS.gmd`：第 472 条（数组位置 471）index = 476 → 跳过 5 个串。
- 反过来，`MonsterDemo` 96 条、`HN_MonsterListMsg` 220 条的 index 恰好就是 0..n-1（密排），所以"位置 == index"只在密排文件上成立；按位置配对会在稀疏文件上错位。

例（密排的 `MonsterDemo`）：`Kanji_Lioleia` ↔ 串 0 `雌火龙`，`Kanji_PurpleVenomLioleia` ↔ 串 2 `紫毒姬雌火龙`，`Kanji_LioleiaRareSpecies` ↔ 串 1 `@`。

`HN_MonsterListMsg` 的 220 个标签是 `p1_index_001..009`（9）+ `p1_class_001`（1）+ `P2_3_hint_001..210`（210 [B] 整个 3070 B 标签块逐字读出）。

## 字符串区

- UTF-8，NUL 分隔；**串内可以含 CRLF**（`\r\n`），所以只能按 `\0` 切，不能按行切。
- 允许空串（连续两个 NUL），因此"串数"必须用 `0x18` 校验，不能靠 `split('\0').filter(Boolean)`。
- 串块最后一个字节必为 NUL（9/9）。
- 组名**不计入**串表。

## 文件清单：哪些 gmd 装什么

`chS` 下与玩家知识库相关的文件（串数 = 头部 `0x18`，全部 [B] 字节实测；格式 = 变体）：

| 内容 | 文件（`nativeNX/chS/…`） | 变体 | 串数 | 结构 / 抽样 |
|---|---|---|---|---|
| **怪物名（官方中文，全量）** | `chS/arc/resident_chS.arc` → 条目 `chS\GUI\06_msg\monsterName_chS`（**不是散落文件**） | B | **268** | 键 = 罗马字种名，值是中文名。[B] 解包 JSON 实读：i=0 `Lioleia`=雌火龙、i=1 `RareLioleia`=**金火龙**、i=2 `NamedLioleia`=紫毒姬雌火龙、i=3 `Liolaes`=火龙、i=4 `RareLiolaes`=**银火龙**；串 137 起是 `KANJI_*` 同名块（i=137 `KANJI_Lioleia`=雌火龙、138 `KANJI_RareLioleia`=金火龙 …），值相同。头字段：size 12,605、`0x1C`=3,474、`0x20`=2,695、中间表 1,024 —— 与本格式完全一致。**i=0..136 是按槽位顺序的官方名**（i105..111 是机制占位单位、i133 Atlal_nest 为空），i=137..267 是 `KANJI_*` 同值块。**大小怪是两行，按各怪自己的槽位取名、绝不缩字**：i=17 `DaimyoZazami`=大名盾蟹 vs i=88 `YaoZami`=盾蟹；i=19 `ShogunGizami`=将军镰蟹 vs i=89 `GamiZami`=镰蟹；i=20 `Dodoblango`=雪狮子王 vs i=90 `Blango`=雪狮子；i=121 `Babakonga`=桃毛兽王 vs i=136 `Konga`=桃毛兽。确实用短名的单行怪：i=6 `Furfur`=白电、i=7 `Yiankutku`=怪鸟、i=100 `Skagil`=变形幼冰鲨；i=118 `MillaBoreis_AKA`=红龙（Crimson Fatalis）；块尾 i=135 大雷光虫、i=136 桃毛兽，i=137 起转 `KANJI_*`。若某变种的槽位只写基础名（如 激昂金狮子 / 怒食恐暴龙 / 混沌黑蚀龙），中文名改用 `itemData` 素材名作锚点（据 WikiHabitat / Main 核查）。**这是取中文怪名的首选源**；arc 条目要先按 `tools/mhgu/arc.mjs` 解包再跑 `gmd.mjs` |
| **怪物名（Demo 子集）** | `table/MonsterDemo_chS.gmd` | B | **96** | 只覆盖"有 Demo 文本"的怪，**不是全量表**（全量见上一行）；标签是罗马字种名键（`Kanji_Lioleia`、`Lioleia`、`Lioleus`、`Kirin`、`Rajang`、`Dinovalde`、`Tamamitsune`、`Valphalk`、`AtalKa`、`LaoShanLung` …）；串是品种名：`雌火龙`、`@`、`紫毒姬雌火龙`、`火龙`、`@`、`黑炎王雄火龙`、`怪鸟`、`毒怪鸟`、`砂龙`、`黑狼鸟`、…、`？？？`、`麒麟`、…、`老山龙`、`天彗龙`、`阁螳螂`。**96 串里含重复与占位 `@`，不是 96 个怪**；按 `index` 对齐可得到锚点（[B] 解包 JSON 实读）：`Kanji_Lioleia`=雌火龙(0)、`Kanji_PurpleVenomLioleia`=紫毒姬雌火龙(2)、`Kanji_Tenkairyu`=天廻龙(88)、`ShagalMagala`=天廻龙(89)、`Kanji_Valphalk`=天彗龙(91)、`Valphalk`=天彗龙(94) |
| **怪物说明 / 弱点提示** | `table/HN_MonsterListMsg_chS.gmd` | B | **220** | 串 0..8 = `p1_index_001..009`（`怪物列表`、`种类`、`狩猎数（捕获数）`、`危险度`、`最大纪录`、`最小纪录`、`未登录`、`★`、`%d（%d）`），串 9 = `p1_class_001` = `？？？`，串 10..219 = `P2_3_hint_001..210` = **每怪 2 段说明 × 105** [I]；实测一对里第 1 段是生态/生态+目标，第 2 段以 `【小心…】` 开头的弱点/对策提示（例 `【小心附带爆炸效果的攻击】`）[B 单例]。**此文件不含单独的怪名串**，中文名只出现在说明正文里 |
| **道具名** | `table/itemData_chS.gmd` | A | **5,982** | 名/说明成对：串 `2i` = 名、`2i+1` = 说明，`i` = `.itm` 记录下标（2991 条，`5,982 = 2 × 2991`，与 `table/itemData.itm` 的 count [A] 闭合）。串 0 = `－－－－－－`、串 1 = `dummy`（id 0 占位），串 2 = `调和书1入门`（eng 侧 `Book of Combos 1`；与 `mhgu.db.items._id = 1` 的对拍见 `docs/data/romfs-tables.md` §gmd text，非本次实测） |
| **技能名（效果）** | `table/skillData_chS.gmd` | A | **656** | 名/说明成对，`656 = 2 × 328`。串 0/1 = `无技能`/`无技能`，2/3 = `毒耐性`/`对毒耐性有强大的耐性，\r\n不会进入毒、猛毒状态。`，4/5 = `毒加倍`/`所受的毒状态伤害\r\n变为2倍。`，6/7 = `麻痺无效`/… |
| **技能系统名**（技能树分类） | `table/skillTypeData_chS.gmd` | A | **412** | 名/说明成对，`412 = 2 × 206`。串 0/1 = `无`/`无技能`，2/3 = `毒`/`此技能影响对毒攻击的耐性。`，4/5 = `麻痺`/…，6/7 = `睡眠`，8/9 = `晕眩`，10/11 = `听觉保护`，12/13 = `风压`，14/15 = `耐震` |
| **任务名（中文）** | **不存在**；`chS` 下没有 `quest/` 目录，逐任务文本只有 eng/fre/ger/ita/spa（[B] 目录枚举 + `nativeNX/*/quest/questData/*0101*` 只有 5 种语言） | — | — | 中文只有 **DLC/特别任务**：`table/guestQuestData_chS.gmd`（A，**462** 串 = 231 组名/说明；例 `狩猎蓝速龙王！` / `狩猎蓝速龙王\r\n讨伐蓝速龙`、`寻找雪山草！` / `纳纳雪山草`） |
| **地图名（中文）** | `table/GuestHunterMsg_chS.gmd` | B | **45** | 串 6..20 是一张**带键的地图表**（[B] 解包 JSON 实读）：`OldForest`=古代森林、`Desert`=旧沙漠、`Forest`=山林、`SnowyMountain`=雪山、`MistyPeaks`=溪流、`DesertIsland`=孤岛、`Swamp`=沼泽、`Volcano`=火山、`RuinsField`=遗迹平原、`VirginForest`=原生林、`IceSea`=冰海、`CaveVolcano`=地底火山、`DosDesert`=沙漠、`DosJungle`=密林、`Highland`=无人山岭；其余 30 串是同一界面的 UI 文案（[B] 解包 JSON 实读）：串 0..5 = 难度 `无指定`/`下位`/`上位`/`上位高难度`/`G级`/`G级高难度`（键 `None`、`Difficult_Low/High/Extra/G/ExtraG`），串 21..44 = `大型`/`小型･采集`/`任务等级`/`目标`/`参加人数`/`委托金` 与各武器 `…帮手`（键 `Target_Big`、`Title_QuestRank`、`Contract`、`Spare_LSWORD…`）。特殊地图名只以称号形式存在：`table/GC_Title_1_chS.gmd` 串 100 = `塔之秘境`（`name1_101`）、串 101 = `灵峰`（`name1_102`）、串 91 = `旧沙漠`（`name1_092`）[B 解包 JSON 实读]，完整昼夜/特殊地形名单见下表「称号表」行。**第三处（arc 内，最全）**：`chS/arc/resident_chS.arc` → `chS\GUI\06_msg\questMessage_chS`（120 串任务 UI 文案；已由 arc 解包为 `MHGU-private/romfs-extract/gmd-arc/resident/chS/GUI/06_msg/questMessage_chS.242bb29a`，尚未转 JSON）的串块里成串列着地图：古代森林（白天/夜晚）、山林（白天/夜晚）、雪山（白天/夜晚）、溪流（白天/夜晚）、旧沙漠、孤岛、沼泽、火山、遗迹平原、原生林、冰海、地底火山、塔之秘境、禁入区域、熔岩岛、极圈、灵峰、龙之坟场、斗技场、立体斗技场、**水上斗技场**、沙漠、密林、无人山岭、修雷德城、要塞、要塞废墟 [B] 手读整段串块（1577 B）。**`table/MapName_chS.gmd` 不是地图名表**（见下）。日文名不能替代中文名：`mhgu.db.locations`（31 行）只有 `name_ja` + 5 种西文，**没有中文列**，且日文汉字与官方简体不同字（古代林 / 古代森林、渓流 / 溪流、沼地 / 沼泽、孤島 / 孤岛、闘技場 / 斗技场；db 侧核对见 KbInventory） |
| **称号表（兼地图名 / 怪名锚点）** | `table/GC_Title_1_chS.gmd` | B | **2,618** | 串 **79..104 = 连续地图名块**（`name1_080..name1_105`，[B] 实读）：古代森林（白天）、古代森林（夜晚）、腐海、山林（白天）、山林（夜晚）、起始地、雪山（白天）、雪山（夜晚）、暴风雪、溪流（白天）、溪流（夜晚）、月下、旧沙漠、孤岛、沼泽、火山、遗迹平原、原生林、冰海、地底火山、禁入区域、塔之秘境、灵峰、熔岩岛、极圈、龙之坟场。其余是称号句 + 裸名条目，可当官方拼写锚点：`name1_548`=穿甲虫、`name1_620`=变形冰鲨、`name1_628`=雌火龙、`name1_688`=重甲虫、`name1_748`=尾锤龙、`name1_760`=麒麟、`RabbitName1_5`=要塞废墟、`RabbitName1_6`=修雷德、`RabbitName1_199`=天彗龙、`RabbitName1_203`=阁螳螂。名称异写只有一处：`彻甲虫`（繁体/异体）仅出现在 `weapon10MsgData_chS` #43 与 `weapon11MsgData_chS` #277 的武器说明里，其余全部文件都是 `穿甲虫`（全量检索 [B]） |
| 其他已测 | `table/CommonMsg_chS.gmd`（B，198）、`table/HN_HunternoteMsg_chS.gmd`（B，60）、`table/hunterArtsData_chS.gmd`（A，764）、`table/armorSeriesData_chS.gmd`（A，12,870）、`table/privilege_data_chS.gmd`（A，6，测试串 `CAPCOM` 等） | | | |

**注意 `table/MapName_chS.gmd` 是模板文件**：解包后只有 2 个串 —— 串 0 = `@`（键 `SAMPLE2_TEST0`）、串 1 = `テンプレ２`（无键）。它**不含真实地图名**，别把它当地图名表用；真实中文地图名在 `table/GuestHunterMsg_chS.gmd` 串 6..20、`table/GC_Title_1_chS.gmd` 串 79..104，以及 arc 内的 `chS\GUI\06_msg\questMessage_chS`（含竞技场，见上表）。

在**散落树**（`chS/table` 的 385 个 gmd JSON）里搜 `森丘`、`遗群岭`、`禁足`、`水上斗技场` —— 0 命中（[B] 全量检索）。**但 arc 内的文本补上了竞技场**：`questMessage_chS` 串块里有 `斗技场`、`立体斗技场`、`水上斗技场`，所以上句的 0 命中只对散落树成立。`森丘` / `遗群岭` / `禁足地` 在已读的两处地图文本（`GC_Title_1` 79..104、`questMessage_chS`）里都不存在；`禁入区域` 是否就是「禁足地」仍 [U]。

**arc.mjs 解出的成员名不是 `.gmd`**：格式是 `<原名>.<类型哈希>`，gmd 的类型哈希在本作里是 `242bb29a`（例如 `monsterName_chS.242bb29a`）；同目录里 `.3a793672`/`.7c163ff5` 一类是 `.wNNm` 武器文案索引，不是 gmd。`gmd.mjs batch` 按魔数 `GMD\0` 识别（不看扩展名），非 gmd 文件计入 `skipped`。

实测盘点（`chS/arc/resident_chS.arc` → `gmd-arc/resident/chS/table`）：**58 个成员 = 44 个 gmd + 14 个非 gmd**；`batch` 结果 **44 处理 / 14 跳过 / 0 失败**。44 个 gmd 与散落 `chS/table` 同名同尺寸（抽样：`itemData_chS` 318.5 KB、`armorSeriesData_chS` 668.1 KB 两边一致）⇒ 该 arc 的 table 部分是副本，**arc 独有的文本只有 `GUI\06_msg` 那 3 个**（`monsterName_chS`、`questMessage_chS`、`Common_chS`）。

其余 `chS/table/*.gmd`（`weaponNNMsgData`、`otArmorData`、`NpcName`、`MapName`、`QuestMsg`、`LbHelp`、`tutorial/tutoMsg*`、`npc/script/npc_*_td` 等）同容器，跑 `batch` 即可得到全量 `index.json`（路径 → 串数）。`chS/arc/*.arc` 里还有另一批文本，需先按 `tools/mhgu/arc.mjs` 解包，本工具不处理 arc。

**arc 里有没有更全的文本？**（[B] 条目表实测）**有，而且全量怪名表就在 arc 里**：`chS/arc/resident_chS.arc`（119 条目，含 `chS\GUI\06_msg\monsterName_chS` = 268 条带键怪名，见上表）+ 其他 GUI 消息表。其余 arc：`chS/arc/village/hunter_note_chS.arc` 只有 5 个条目，就是 `chS\table\HN_{Hunternote,BasicControl,MonsterList,HunterTips,WeaponControls}Msg_chS` 这 5 个已散落文件的打包副本；`chS/arc/village/common_chS.arc` 是 115 条目的 `chS\table\*` 打包副本（另有 GUI/音效）；`chS/arc/ui` 下只有 `manual/` 电子说明书与 `questUI*`。**结论：找中文名先看 `resident_chS.arc`，别只看 `chS/table/`。**（本行初稿曾据 village/ui 两处 arc 断言"romfs 没有全量名表"，那是漏查 `chS/arc/resident_chS.arc` 得出的错误结论，已更正。）

## 判读要点

1. **`0x20` 是串块字节数**，串块起点 = `文件长 - 0x20`。把它当偏移是这类文件最常见的错。
2. 变体 A / B 不要靠"看起来像文本"猜：先用 `0x28 + n + 1 + 0x20 == 文件长` 验 A，不成立才按 B 解。
3. 串数用 `0x18` 校验；不符就报错，别把切分结果当真相。
4. 不要把整个文件当文本解码：变体 B 的条目表和标签块是二进制，先按偏移切开。
5. 有的串自身含 `\r\n`；按 `\0` 切。
6. `0x08`/`0x10` 恒 0；`0x18` 与 `0x14` 在变体 B 相等，在变体 A 前者是串数、后者为 0。
7. 中文名别从 `HN_MonsterListMsg` 里抠：那是说明文；怪名表是 `MonsterDemo`。
8. `docs/data/romfs-tables.md` §gmd text 里的起点公式（`0x28+n+1`）只对**变体 A** 成立；带键表的文件（`HN_*`、`MonsterDemo`、`CommonMsg` …）以本文的 `文件长 - 0x20` 为准。
9. **别用数组位置当串下标**：键表是 `entry.index` → 串的升序稀疏映射（`MapName` 1 条键 / 2 串，串 1 没键；`Lb_TradeShopMsg`、`StartMenuMsg` 中段跳号）。按位置配对会在这些文件上整体错位。
10. **条目表不一定 4 字节对齐**：起点 = `0x28 + n + 1`，`StartMenuMsg_chS.gmd` 的 n = 12 → 起点 `0x35`（奇数）。按 `#pragma pack(1)` 逐字节读 u32（Node `Buffer.readUInt32LE`、Python `struct.unpack_from` 都是字节偏移，天然安全）；用对齐 u32 读会从第一条就错位。
11. 罗马字标签容易看混：`Kanji_Tenkairyu` = **天廻龙**（Shagaru，串 88/89），`Kanji_Valphalk` = **天彗龙**（Valstrax，串 91/94）。「廻」「彗」是两只不同的怪，别按标签形状猜。

## 复现（Python）

```python
import struct, sys

def read_gmd(path):
    b = open(path, "rb").read()
    assert b[:4] == b"GMD\0", "bad magic"
    ver, = struct.unpack_from("<I", b, 0x04)
    assert ver == 0x00010302, hex(ver)
    entry_count, count, label_bytes, block, name_len = struct.unpack_from("<5I", b, 0x14)
    name = b[0x28:0x28 + name_len].decode("ascii")
    assert b[0x28 + name_len] == 0
    start = len(b) - block                      # 串块在文件末尾
    raw = b[start:]
    assert raw[-1] == 0
    strings = [s.decode("utf-8") for s in raw.split(b"\0")[:-1]]
    assert len(strings) == count, (len(strings), count)
    labels = None
    if entry_count or label_bytes:
        after = 0x28 + name_len + 1
        end = after + entry_count * 20
        labels_start = start - label_bytes
        assert labels_start - end == 1024       # 未知表；6 个样本都是 1024
        blob = b[labels_start:start]
        labels = [None] * count
        prev = -1
        for i in range(entry_count):
            idx, hlo, hhi, loff, unk = struct.unpack_from("<5I", b, after + i * 20)
            assert prev < idx < count, (prev, idx, count)   # 升序，可跳号
            prev = idx
            labels[idx] = blob[loff:blob.index(b"\0", loff)].decode("ascii")
    return name, strings, labels

if __name__ == "__main__":
    name, strings, labels = read_gmd(sys.argv[1])
    print(name, len(strings), "labels" if labels else "no labels")
```

本机对照（工具输出应与此一致）：

```sh
node MHGU/tools/mhgu/gmd.mjs list G:/mhgu-romfs/romfs/nativeNX/chS/table/MonsterDemo_chS.gmd --all
node MHGU/tools/mhgu/gmd.mjs batch G:/mhgu-romfs/romfs/nativeNX/chS "G:/omp works/MHGU-private/romfs-extract/gmd"
```

## Unknown

1. `0x0C` 的确切语义：按 Unix 秒解释时间全部合理（2002-11 ～ 2006-09），但没有第二个独立证据 [I]。
2. 变体 B 里那 1024 B（256 × u32）表的含义：取值都在 `0..count-1`，像哈希桶或排序索引；6 个样本都是 1024 B，是否恒为 1024 B [U]（工具只在不是 1024 时打警告，不报错）。
3. 条目里的 8 B `hashLo/hashHi` 算法 [U]；末尾 `unk` 字段（`HN_MonsterListMsg` 条目 1/2 为 187/188，其余为 0）含义 [U]。
4. `MonsterDemo` 里部分串是 `@`（如 `Kanji_LioleiaRareSpecies` 对应 `@`），是占位/控制符还是别的 [U]。
5. 键为什么是稀疏子集 [U]：`MapName` 只给示例串挂了键，`Lb_TradeShopMsg` / `StartMenuMsg` 中段出现跳号。已有一条实锤线索：`StartMenuMsg` 那 5 个缺键的串（471..475）文本正是 `预备字段1..5`，即**预留占位串通常没有键**，倾向"该串本来就没有键"而不是"键被合并"。工具按 `entry.index` 定位，未挂键的串标 `label: null`。
6. `chS/arc/` 内 arc：`resident_chS.arc` 的 `monsterName_chS` 已解包核对（布局与散落文件一致，见上表）；其余条目（该 arc 共 119 条，含 `Common_chS`、`questMessage_chS`、`DialogMsg`/`OnlineMsg` 副本等，见 `MHGU-private/romfs-extract/gmd-arc/resident/`）与 `village/*`、`ui/*` 的载荷未逐条解包验证。
