# docs/data/ — 机读游戏数据（外部信源）

来自开源项目 `agroff/mhgu-quest-list`（其 `scraper.js` 从 Kiranico 爬取 MHGU 全量数据成 JSON）。
**许可**：上游为社区爬虫整理，属卡普空游戏数据的衍生汇编；仓库自用/参考可，正式分发需用户自行获取。
**校验状态**：见 `docs/reference/source-verification.md`——子代理已抽核关键字段对照游戏内/其他源。

## 文件清单
| 文件 | 规模 | 内容 |
|---|---|---|
| `quests.json` | 944 条 | 任务表（title/location/monster/questType=Hub\|Village/keyType=key\|normal\|urgent\|pre-req/huntType/rank 含 G 级）|
| `skills.json` | 204 条 | 技能树（id/name/category/rating/skills[]=name+description+points）|
| `skillMeta.json` | — | 技能元数据/分类 |
| `decorations.json` | 242 条 | 装饰珠（技能点/制作材料）|
| `hammer.json` | 885 条 | 武器示例（锤子全树：atk/affinity/slots/sharpness/制作）|
| `weapons.json` | 14 类 | 武器类型枚举 |
| `weapons/` | 目录 | 各武器类型分文件 |
| `armor/` | 目录 | 防具五件套（head/body/arms/waist/legs，各 -light 摘要 + 全量）|

## 用途
- **存档编辑器**：任务/技能/道具/怪物名查表（对拍方法与现状见上一节：该文件不在仓库里，需先用 `tools/mhgu/export-item-table.mjs` 从库里生成）
- **知识库**：机制综述的数值底（如任务解锁前置、技能点数阈值、武器面板公式）
- **校验**：对照存档字段（任务 id、技能点、猫装备）做交叉验证

## docs/data/mhgu.db + docs/data/json/ — MHGenDatabase 全库（权威机读源）

来源：`gatheringhallstudios/MHGenDatabase` release `mhgu_database_v2.4.0.apk` 内 `assets/databases/mhgu.db`。
**18MB SQLite / 38 张用户表（计入 `sqlite_sequence` 共 39 个表）**，卡普空官方数据的干净社区提取，是本知识库的**数值底座**。

已导出 21 表为 `json/<table>.json`（21 个文件共 36,466,585 B ≈ 34.8 MiB；另有 6 个手工映射 JSON 不在表导出内）：

| 表 | 行数 | 内容 |
|---|---|---|
| `monsters` | 129 | 怪物：base_hp、多语言名(name/name_de/fr/es/it/ja)、icon_name、metadata |
| `monster_damage` | 893 | 肉质：每怪每部位 cut/impact/shot + fire/water/ice/thunder/dragon + ko |
| `monster_weakness` | 108 | 弱点：属性+异常状态+落穴/麻痹/闪光耐性 |
| `monster_status` | 728 | 异常状态阈值（毒/麻/眠/晕 per monster） |
| `monster_to_quest` | 2305 | 怪物↔任务关联（unstable/hyper 标志） |
| `quests` | 1355 | 任务：多语言名+goal+rank+type+奖励 |
| `quest_rewards` | 37370 | 任务奖励（item+slot+percentage+stack） |
| `items` | 21153 | 道具全表（type/sub_type/rarity/carry_capacity/buy/sell+多语言） |
| `weapons` | 10877 | 武器树（parent_id/wtype/attack/max_attack/element/sharpness/num_slots/制作） |
| `armor` | 5637 | 防具（slot/defense/5属性耐/num_slots/技能点） |
| `decorations` | 242 | 装饰珠（仅 _id/num_slots；技能点见 item_to_skill_tree.point_value，制作材料见 item_to_material/components） |
| `skills` | 326 | 技能（skill_tree_id/required_skill_tree_points/name/description 多语言） |
| `skill_trees` | 205 | 技能树名（多语言） |
| `combining` | 183 | 调合配方 |
| `gathering` | 15414 | 采集点（item/location/area/site/rank/percentage） |
| `horn_melodies` | 278 | 笛旋律 |
| `palico_weapons` | 495 | 随从猫武器 |
| `palico_armor` | 1001 | 随从猫防具 |
| `locations` | 31 | 地图名（多语言） |
| `charms`/`food_combos`/`felyne_skills` | 0 | 空表（护石存档生成/食物猫技能 v2.4 未填） |
| `meow_locations` | 6 | 猫探险地（有实数据） |
| `meow_rewards` | 1168 | 猫探险奖励（有实数据） |

**ID 约定（2026-11-04 核对）**：`monsters._id` 就是 `emNNN` 的 EnemyTypeIndex——`_id=1` = Rathian、`_id=24` = Kushala Daora，与 `AGENTS.md` §2f 记下的枚举事实完全一致（em001 = Rathian，em024 = Kushala Daora）。按 `class` 分组：class 0 = 75 只、class 2 = 18 只（合计 **93 只大型怪**，与 `monster_damage` 的 93 个 `monster_id` 相同），class 1 = 36 只无 `base_hp` 的小型怪。

**外键完整性（2026-11-04 核对）**：最早就这 4 条关系逐个核对过，全部闭合（各 0 条悬空引用）：`monster_damage→monsters`、`monster_to_quest→monsters`、`monster_to_quest→quests`、`quest_rewards→items`。**那 4 条不等于整库结论**；整库的完整口径在下表。

**整库 38 条外键的实测（2026-11-04）**：用"`列 IS NOT NULL AND 列 <> 0 AND 列 NOT IN (SELECT _id FROM 父表)`"逐条数，**36 条为 0 悬空**，剩下的 2 条与 `foreign_key_check` 报的 2,621 行是同一件事：

| 项 | 结果 |
|---|---|
| 外键定义总数 | **38** |
| 0 悬空的 | **36** |
| 父表名写错（库里的真名是复数） | **2**：`skills.skill_tree_id → skill_tree`（应为 `skill_trees`，205 行）、`meow_rewards.meow_location_id → meow_location`（应为 `meow_locations`，6 行）。改名后各 **0** 悬空 |
| `pragma foreign_key_check` 报的 2,621 行 | = 上述两条父表名不存在（`skills` 326 + `meow_rewards` 1,168）+ `quests.permit_monster_id=0` 被当成引用（1,127）。**没有一条是真孤儿** |

复现：`pragma foreign_key_check`（2,621 行）；逐条计数见上表的过滤式。生成库的脚本不在本仓库（`mhgu.db` 也未入库，18MB 二进制产物），所以这两处 DDL 名字错要在**重建库时**改，不能靠改数据补救。**这道检查已做成门 12**：已知违规集合被钉死为 `{quests:1127, meow_rewards:1168, skills:326}`，出现第四张表或计数变化即 FAIL，并对三条过滤式后再确认 0 真孤儿。

**与 agroff JSON 的关系**：agroff 944 任务/204 技能是 Kiranico 网页爬取（英文为主）；mhgu.db 是更全的官方数据（1355 任务、多语言、含肉质/掉落/采集）。**mhgu.db 为权威**，agroff 作交叉验证。

**导出完整性（2026-11-04，不是交叉验证）**：`docs/data/json/` 是**本库自己的导出**（见本节开头"已导出 21 表为 json/<table>.json"），所以拿它跟 `mhgu.db` 比行数**必然相等**——逐表比过：quest_rewards 37,370、items 21,153、gathering 15,414、weapons 10,877、armor 5,637、quests 1,355、monsters 129 等 21 张表全部一致，另有 6 个手工映射 JSON 本就不在导出内。这只能证明**导出没坏**，不能当作两个独立来源互相印证（这正是 §4d 说的自证）。

**真正的交叉验证（agroff，独立来源；2026-11-04 实测）**：`docs/data/` 下另有 6 个 agroff 文件，来自 `agroff/mhgu-quest-list` 从 **Kiranico 网页爬取**，与 Capcom 数据包是两次独立抽取。按名字归一化后逐项比对：

| 项 | agroff | db | 命中 |
|---|---:|---:|---:|
| 任务 `quests.json` | 944 | 1,355 | **944/944 = 100%** |
| 技能树 `skills.json` 外层 | 204 | 205 | **204/204 = 100%** |
| 技能 `skills.json` 内层 | 326 | 326 | **326/326 = 100%** |
| 装饰珠 `decorations.json`（按名对 items）| 242 | 21,153 | **242/242 = 100%** |
| 锤 `hammer.json`（`LV<n>`→`<n>` 转换后）| 885 | 21,153 | **885/885 = 100%** |

两条必须记住的结论：

- **名字可移植，`_id` 不可移植**。agroff 的 `_id` 与 db 完全不在一个编号空间（装饰珠 0/242 命中），跨源只用名字 + 归一化。
- **两边命名有系统性差异**：agroff 用 `Petrified Hammer LV1`，db 用 `Petrified Hammer 1`；不转换会把 885 条全判成不一致（我第一版就是这样得到 0% 的）。

## 编辑器运行时数据文件：两个都缺，一个能重建、一个不能（2026-11-04 审计）

`editor-src` 的界面在启动时读两个外部文本文件（UTF-16），**两个都不在仓库里**：

| 文件 | 谁读 | 格式 | 现状 |
|---|---|---|---|
| `MHGU_item(uni).txt` | `ItemsForm.cs:365` | 每行 `id,name`，`Split(',')`，读到长度 ≤2 的行就 `break` | **可从 `mhgu.db` 重建**（见下） |
| `MHGU_DLC.txt` | `DLCForm.cs:57` | 每行 `identifier, address(hex), checked(hex), name`（`DLCForm.cs:70-73`） | **重建不了**：装的是存档里 DLC 标志的**地址**，不是数据库能给的数值 |

本 README 此前写的"编辑器现有 `MHGU_item(uni).txt` 可与之对拍补齐"**不成立**——那份文件从来没有进过仓库，所以这条对拍一直跑不了。

### 能重建的那个（但有语言限制）

`tools/mhgu/export-item-table.mjs` 从 `mhgu.db` 的 `items` 表生成该文件，**输出路径必填**（工具会拒绝无参运行）：

```
node tools/mhgu/export-item-table.mjs "编辑器目录/MHGU_item(uni).txt"
```

- 21,153 行、1,044,342 字节、UTF-16LE + BOM、CRLF，`id` 用数据库的 `items._id`（`1` = Book of Combos 1，与游戏 id 空间一致）；
- 自检：名字含逗号就**拒绝生成**（`ItemsForm` 按逗号切分，否则名字被截断），实测 0 条；语言列可用 `LANG_COL=name_ja` 切换，但**除英文 `name` 外其余列在 items 表里是空的**（`name_ja` 全表 0 条有值），所以实际只能产出英文名；
- 按 `ItemsForm` 的读法回放，21,153 行全部被接受。

**语言限制必须说清楚**：`items` 表只有 `name/name_de/name_fr/name_es/name_it/name_ja`，**没有中文列**，而且 `name_ja` 全表 **0 条有值**（21,153 行全部为空），所以德法西意日五列都造不出名字，只有英文 `name` 可用。编辑器原本那份 `MHGU_item(uni).txt` 按 `docs/data/json/README.md` 的记载是**日文名、2,930 行**（不是全量 21,153 行）（`editor-src` 源码里查不到任何中文道具名，说明名字全部来自这个外部文件）。所以生成出来的是**功能可用的英文名替身**，不是原资产：编辑器能跑、id 对得上，但界面里显示英文、条目数也从 2,930 变成 21,153。要恢复原样，只能从**发布版的编辑器包**里取回那份 `MHGU_item(uni).txt`——本仓库里没有，也没法从数据库造（缺日文名，也缺那 2,930 条的取舍标准）。

- **派生产物，不提交**：`docs/data/MHGU_item(uni).txt` 已加进 `.gitignore`，改了 `mhgu.db` 就重跑一次。

### 不能重建的那个

`MHGU_DLC.txt` 里每一行的第 2、3 字段是**存档内的地址**（`id_Address` / `id_checked`），属于存档布局知识，`mhgu.db` 里没有这类数据，本仓库的文档里也没有 DLC 地址分析。所以编辑器 DLC 页现在是**静默降级**：`DLCForm.cs:63-66` 对长度 ≤10 的行 `continue`，文件缺失时 `dlc` 一直是 `null`，导出会 NRE（代码注释里 `DLC-1` 记的就是这个坑）。

要补，必须先做 DLC 标志位的存档定位（属于成员/存档侧逆向），不是"补一个数据文件"能解决的。记为待办，不假装已覆盖。

**信源验证记录**：`docs/reference/source-verification.md`
## 缺口（待补，mhgu.db 已覆盖大部分）
- 怪物数据：**已由 mhgu.db 覆盖**（monsters/monster_damage/monster_weakness/monster_status）
- 道具（item）全表：**已由 mhgu.db 覆盖**（items 21153 条）；编辑器用的 `MHGU_item(uni).txt` 仓库里没有，需先用 `tools/mhgu/export-item-table.mjs` 从库生成（英文名）或从发布版编辑器包取回（中文名），再对拍；见上文「编辑器运行时数据文件」
- 猫/Palico：palico_weapons/palico_armor/meow_locations/meow_rewards 已有；**charms/felyne_skills/food_combos 为空表待补**
- 委托（Daily/委托任务）：wiki 有页，mhgu.db 无专表
- 狩技（Hunter Arts）效果数值：wiki `1847` 狩技一览，mhgu.db 无专表
- 地图/采集点/掉落：**已由 mhgu.db 覆盖**（locations 31 / gathering 15414 / quest_rewards 37370）

## 下一步信源
1. ~~`gatheringhallstudios/MHGenDatabase`~~ **已完成**（mhgu.db + 21 表 JSON 入库）
2. `mhwiki.axibug.com/mhxx-wiki/` **已整站镜像**（290 页/37MB + text/ 转换版）——狩技/委托/装备解放等 mhgu.db 缺的字段
3. Kiranico 网页数据——仅补前两源都缺的零碎字段
