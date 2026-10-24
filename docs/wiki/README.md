# MHGU 玩家向知识库 · 使用手册

面向「玩家提问 → 给出**有出处**的答案」的工作流。本页回答三件事：

1. [wiki 页索引](#一wiki-页索引) — 每页覆盖什么、能答哪类问题。
2. [拿到一个问题后去哪查](#二拿问题先去哪查) — 按问题类型路由到文件/SQL。
3. [mhgu.db 查询方法](#三mhgudb-查询方法) — 连接方式 + 常用 SQL 模板。
4. [覆盖缺口表](#四覆盖缺口表按玩家影响排序) — 哪些玩家问题现在还答不了、按影响排序。

数据源分四层，每个 wiki 页开头都定义了自己的**出处分级**（`[B]` 二进制实测 / `[X]` 双源一致 / `[I]` 推断或单源 / `[W]` wiki 转述 / `[U]` 未确认；以各页 §0 为准，回答时把等级一并带上）：

| 层 | 位置 | 性质 |
|---|---|---|
| 玩家向 wiki 页 | `docs/wiki/*.md`（本目录） | 面向提问的答案页，行级出处 |
| 机制深读页 | `docs/mechanics/*.md` | 系统模型 + 存档位域 + 表结构 |
| 原始数据 | `docs/data/mhgu.db` + `docs/data/json/` | 39 表 SQLite 镜像 + JSON 导出 |
| 官方中文文本 | `MHGU-private/romfs-extract/gmd/` | chS 官方名/说明 JSON（382 文件 / 61,225 串），引用格式 `chS/table/<file>.gmd #<index>` |

---

## 一、wiki 页索引

| 页 | 覆盖 | 能答的典型问题 | 出处主源 |
|---|---|---|---|
| [quests.md](quests.md) | 村★1–★10 + 集★1–★7 + G★1–★4 全部关键/紧急任务表；HR/狞猛/特殊许可解锁门槛；任务行参数 | 「村★4 关键是哪几条」「集会所怎么升星」「这个任务多少钱/多久/在哪张图」 | 关键归属 [W]，任务行 db [I]，怪名 chS [B] |
| [monsters-index.md](monsters-index.md) | 93 大怪 + 36 小怪名录；二名许可等级；村/集最早出现任务 | 「这怪叫什么、多大体型」「狞猛种有哪些」「我几星能遇到它」 | db [I] |
| [monster-habitat.md](monster-habitat.md) | 81 只怪 × 起始/移动/巢区；66 只施加异常表 + 30 标签解除对照（道具名已用 chS 官方文本） | 「这怪在哪张图哪个区」「它会上什么异常、我怎么解」 | db [I] + chS [B] |
| [monster-drops.md](monster-drops.md) | 10 封面怪 × 三档掉落全表；八通道语义；素材反查 SQL | 「逆鳞/红玉怎么刷最效率」「剥取/断尾/部位破坏各给什么、概率多少」 | db+wiki 逐条比对 [C] |
| [skills.md](skills.md) | 205 棵技能树全表；+10/+15/+20 阈值；242 颗装饰珠统计；复合技能组成（树名/技能名已用 chS） | 「这个技能几点发动」「什么珠给这个技能」「复合技能怎么配」 | chS [B] + db [I] |
| [styles-arts.md](styles-arts.md) | 6 风格按键差异；14 武器 × 风格动作差异；66 狩技全名/解锁（共通 10 技已用 chS 官方文本） | 「武士道太刀怎么玩」「XX 狩技怎么解锁、给几个槽」 | wiki [W] + chS [B] |
| [items-combat.md](items-combat.md) | 常用道具/陷阱/爆弹/弹药/瓶；调合配方入口；口袋·箱容量 | 「陷阱对怪几秒」「这个怎么做、上限几个」 | db [I] + wiki [W] |
| [damage-formula.md](damage-formula.md) | 完整伤害公式；肉质表结构 + 示例；无 bloat 三证；斩味/会心框架 | 「面板攻击怎么算」「打哪个部位疼」「这个任务血量多少（结构）」 | 结构 [C]，常数 [U] |

**在建专题页**（`monsters-index.md` 已链但未落地）：`monster-status.md`（异常状态阈值）、`hitzones.md`（全怪肉质）。目前由 `damage-formula.md` §3 + `mechanics/monsters.md` §3/§5 承接。

## 二、拿问题先去哪查

按问题关键词路由：

| 问题含 | 首查 | 次查 |
|---|---|---|
| 怎么解锁 / 升星 / HR / 二名 / EX / 狞猛 | `wiki/quests.md` §3–§6 | `mechanics/quests.md` §4–§8 |
| 关键任务 / 任务报酬 / 哪张图 / 乱入 | `wiki/quests.md` 行级表 | `mechanics/quests.md` §2（questId↔_id） |
| 某怪在哪 / 给我上什么异常 / 怎么防吼风震 | `wiki/monster-habitat.md` | `mechanics/monsters.md` §6–§7 |
| 弱点属性 / 肉质 / 打哪疼 | `wiki/damage-formula.md` §3 + 官方弱点提示 `gmd:table/HN_MonsterListMsg_chS` | `mechanics/monsters.md` §3，db `monster_damage` |
| 掉落 / 剥取 / 捕获 / 部位破坏素材 | `wiki/monster-drops.md` | db `hunting_rewards`/`quest_rewards` |
| 技能 / 珠 / 护石 / 防具 | `wiki/skills.md` | `mechanics/skills-arts.md` §5，`mechanics/equipment.md` §2 |
| 风格 / 狩技 / 某武器动作 | `wiki/styles-arts.md` | `mechanics/skills-arts.md` §6，官方效果文 `gmd:table/hunterArtsData_chS` |
| 道具 / 调合 / 弹药 / 容量 | `wiki/items-combat.md` | `mechanics/systems.md` §1，db `items`/`combining` |
| 猫饭 / 食材 / 支援猫 / 猎猫 / 笛旋律 | `mechanics/systems.md` §2/§10/§11 | `mechanics/skills-arts.md` §7–§8 |
| 伤害公式 / 动作值 / 斩味倍率 | `wiki/damage-formula.md` | `mechanics/equipment.md` §1 |
| 商店 / 山菜爷 / 点数 / 斗技 | `mechanics/systems.md` §3–§8 | — |
| 存档 / 备份 / 位域 / 改存档 | `docs/save-layout/` | `editor-spec/03-quests-monsters-palico.md` |

**中文名统一**：任何页面用到中文名时，优先 `MHGU-private/romfs-extract/gmd/`（官方 chS 文本，382 文件 / 61,225 串；提取器 `tools/mhgu/gmd.mjs`，格式 `docs/reference/formats/gmd.md`），引用格式 `chS/table/<file>.gmd #<index>`；没有的（普通任务名）用 wiki 译名并标 `[W]`。关键文件：`table/itemData_chS`（道具名+说明 5,982 串，索引 `i = 2 × items._id`）、`table/skillData_chS`（技能 656）、`table/skillTypeData_chS`（技能树 412）、`table/hunterArtsData_chS`（狩技 764，含 D 轨效果文）、`table/armorSeriesData_chS`（防具系列）、`table/weapon00..14MsgData_chS`（武器名）、`table/MonsterDemo_chS`（怪名 96，金/银火龙为 `@` 占位）、`table/HN_MonsterListMsg_chS`（弱点提示 220）、`table/HN_BasicControlMsg_chS`（操作/按键 105）、`table/guestQuestData_chS`（DLC 任务名 462；村/集普通任务名 chS 树无）。`table/MapName_chS.gmd` 提取失败（1 entries but 2 strings），地图名仍用仓库既有 15 图写法标 `[U]`。

## 三、mhgu.db 查询方法

`docs/data/mhgu.db`（18MB，39 表，SQLite）。连接任选其一：

```bash
# 命令行（推荐只读）
sqlite3 -readonly docs/data/mhgu.db

# Node（仓库已有依赖 better-sqlite3）
node -e "const db=require('better-sqlite3')('docs/data/mhgu.db',{readonly:true}); console.log(db.prepare('SELECT COUNT(*) FROM quests').get())"

# Python
python -c "import sqlite3; c=sqlite3.connect('file:docs/data/mhgu.db?mode=ro',uri=True); print(c.execute('SELECT COUNT(*) FROM quests').fetchall())"
```

`docs/data/json/` 是同数据 JSON 导出（`quests.json`/`monsters.json`/`items.json`/`skills.json`/`decorations.json`/`horn_melodies.json` 等），表名↔文件名映射见 `docs/data/README.md`。**注意：db/JSON 的 name_zh 字段是 wiki 译名 [I]，官方 chS 名见 GMD 提取。**

常用 SQL 模板（更多见 `monster-drops.md` §7）：

```sql
-- ① 某素材哪里掉（全通道反查）
SELECT m.name_zh, hr.rank_level, hr.type, hr.rate, hr.count
FROM hunting_rewards hr
JOIN items i ON i._id = hr.item_id
JOIN monsters m ON m._id = hr.monster_id
WHERE i.name_en LIKE '%Lrg Wyvern Gem%' OR i.name_zh LIKE '%鸟竜玉%';

-- ② 某怪出现在哪些任务（含乱入/狞猛标记）
SELECT q.sort_order, q.hub, q.stars, q.name_zh, m2q.unstable, m2q.hyper
FROM monster_to_quest m2q
JOIN quests q ON q._id = m2q.quest_id
JOIN monsters m ON m._id = m2q.monster_id
WHERE m.name_zh LIKE '%迅龙%';

-- ③ 某任务报酬（按 questId 即 sort_order）
SELECT qr.slot_type, i.name_zh, qr.rate, qr.count
FROM quest_rewards qr
JOIN items i ON i._id = qr.item_id
WHERE qr.quest_id = (SELECT _id FROM quests WHERE sort_order = <questId>);

-- ④ 全狞猛化任务清单
SELECT q.sort_order, q.hub, q.stars, q.name_zh
FROM monster_to_quest m2q JOIN quests q ON q._id=m2q.quest_id
WHERE m2q.hyper = 1 GROUP BY q._id;

-- ⑤ 某技能树的珠
SELECT d.name_en, d.slots, d.skill1_points, d.skill2_points
FROM decorations d JOIN skill_trees st ON st._id=d.skill1_tree
WHERE st.name_en LIKE '%Expert%';

-- ⑥ 某部位三武器肉质（状态行）
SELECT state, part, cut, impact, shot, fire, water, thunder, ice, dragon, ko
FROM monster_damage
WHERE monster_id = (SELECT _id FROM monsters WHERE name_zh LIKE '%雌火龙%');
```

`quests` 关键列：`sort_order`（=编辑器 questId，村 10k/集 20k/G 级 30k/Event 41k–44k）、`hub`、`stars`、`goal_type/target_type`、`time_limit(秒)`、`reward/fee/hrp`、`map`（map_id↔中文见 `monster-habitat.md` §1）。`hunting_rewards.type` 八通道：Carve / Carve Tail / Quest Rewards / Break <部位> / Capture / Meowster Hunter / Shiny Drops / 部位采掘。

## 四、覆盖缺口表（按玩家影响排序）

已建问题矩阵见 `/.tmp/reports-mhgu/swe2-kb-coverage.md`（129 题逐条路由）。以下是**目前知识库答不了或只有半截**的问题，按影响排序：

| 优先级 | 缺口 | 玩家会怎样问 | 现状 / 补齐路径 |
|---|---|---|---|
| ★★★★★ | 动作值表（14 武器 × 每招 %） | 「这一刀比那一刀强多少」 | 仓库无；解 `rPlayerManyAttacks` 或引入 Kiranico |
| ★★★★★ | 小型怪肉质/状态/掉落 | 「蓝速龙打哪」 | `monster_damage` 只覆盖 93 大怪；需第三方源或 romfs 解码 |
| ★★★★☆ | 斩味/会心/属性/防御率数值 | 「白比蓝强多少」「超会心加几成」 | 结构 [C]、常数 [U]；main `.rodata` f32 表未定位 |
| ★★★★☆ | 勇气/炼金风格机制 | 「勇气怎么进强化状态」 | 只证槽位存在；镜像 wiki 无 MHXX 内容 |
| ★★★★☆ | 狩技槽消耗 / SP 型名单 | 「这技要攒多久」 | `rHunterArtsData` 112B 记录未解；文本已解 |
| ★★★☆☆ | 多人联机规则（进房/人数修正/掉线） | 「联机怪会变厚吗」 | 仓库只覆盖任务池数据，网络层无玩家向文档 |
| ★★★☆☆ | 护石技能池与上限 | 「护石能刷出攻击+10 吗」 | `amuletSkillData*.amskl` 未解 |
| ★★★☆☆ | 集会所任务最低 HR | 「我 HR30 能接这任务吗」 | `questData.ext` Requirement 枚举未解 |
| ★★☆☆☆ | 捕获 HP 阈值 / 大小金冠 | 「多少血能抓」 | 存档结构有、阈值无源 |
| ★★☆☆☆ | 道具绝对数值（回复量/爆弹伤害） | 「大桶爆弹炸多少」 | 只有倍率，`cItemBase` 效果分支未解 |
| ★★☆☆☆ | DLC/Event 任务页 | 「配信任务有哪些」 | db 166 条可查 + guestQuestData_chS 官方名，未整理成页 |
| ★★☆☆☆ | 狞猛任务清单 | 「哪些任务是狞猛」 | SQL 模板 ④ 可答，未整理成页 |
| ★★☆☆☆ | 怪物 HP 绝对值 / 任务体力倍率 | 「这怪多少血」 | `base_hp` 有、任务倍率 [U] |
| ★☆☆☆☆ | 勋章获得条件 | 「这勋章怎么拿」 | 位域已测绘、条件未整理 |
| ★☆☆☆☆ | 系统设置（语言/画面/帧率） | 「怎么改按键」 | 只覆盖狩技键（styles-arts §1.2）；其余非 RE 范围 |
| — | ~~官方中文名~~ | — | **已解决**：`MHGU-private/romfs-extract/gmd/` 382 文件全量提取；habitat/skills/styles-arts/quests 已部分回写，其余页待补 |

---

## 附：提问→答案 速查流程

```
玩家问题
  ├─ 问「是什么/怎么解锁/在哪」→ 查 §二 路由表的首查页
  ├─ 问「数值/概率/列表」→ 先查 wiki 页；页上没有就按 §三 SQL 模板跑 mhgu.db
  ├─ 问中文名 → `MHGU-private/romfs-extract/gmd/`（引用 chS/table/<file>.gmd #<index>）
  └─ 命中 §四 缺口 → 如实回答「目前无信源」，引用缺口表行给出补齐路径
```

**纪律**：页面不声明「已验证」除非附可复核路径；无源数字标 `[未确认]`/`[U]`；英文镜像转述与 romfs/db 数字冲突时以 romfs/db 为准（`docs/README.md` §约定3）。
