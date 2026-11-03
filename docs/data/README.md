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
- **存档编辑器**：任务/技能/道具/怪物名查表（编辑器现有 `MHGU_item(uni).txt` 可与之对拍补齐）
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

**外键完整性（2026-11-04 核对，0 孤儿）**：`monster_damage→monsters`、`monster_to_quest→monsters`、`monster_to_quest→quests`、`quest_rewards→items` 四条关系全部闭合（各 0 条悬空引用）。

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

**信源验证记录**：`docs/reference/source-verification.md`
## 缺口（待补，mhgu.db 已覆盖大部分）
- 怪物数据：**已由 mhgu.db 覆盖**（monsters/monster_damage/monster_weakness/monster_status）
- 道具（item）全表：**已由 mhgu.db 覆盖**（items 21153 条）；编辑器现有 txt 表待与之对拍
- 猫/Palico：palico_weapons/palico_armor/meow_locations/meow_rewards 已有；**charms/felyne_skills/food_combos 为空表待补**
- 委托（Daily/委托任务）：wiki 有页，mhgu.db 无专表
- 狩技（Hunter Arts）效果数值：wiki `1847` 狩技一览，mhgu.db 无专表
- 地图/采集点/掉落：**已由 mhgu.db 覆盖**（locations 31 / gathering 15414 / quest_rewards 37370）

## 下一步信源
1. ~~`gatheringhallstudios/MHGenDatabase`~~ **已完成**（mhgu.db + 21 表 JSON 入库）
2. `mhwiki.axibug.com/mhxx-wiki/` **已整站镜像**（290 页/37MB + text/ 转换版）——狩技/委托/装备解放等 mhgu.db 缺的字段
3. Kiranico 网页数据——仅补前两源都缺的零碎字段
