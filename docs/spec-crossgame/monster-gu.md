# 跨游戏怪物内容规范 - GU 侧

> Engine-agnostic monster content spec, GU half.
> Status: draft for mapping. 本文件只定义**字段结构**：含义、单位/值域、GU 存放处与来源。per-monster 数值不进本文件。
> 引用路径相对 `MHGU/` 仓库根。文中所有 `U#` 编号只指 `docs/mechanics/monsters.md` §15 的 U1..U20（:630-653）。

## 0. 使用约定

### 0.1 范围

本文件把 MHGU 的怪物拆成与引擎无关的记录，分 10 组：身份与分类（§1）、体力与伤害链（§2）、肉质-部位-状态（§3）、部位耐久与破坏（§4）、状态异常（§5）、道具效力（§6）、威胁特征（§7）、体型与冠（§8）、AI 参数（§9）、存档侧链接（§10）。描述对象是「一只怪物有哪些可观测属性、各自什么单位、跨游戏映射时必须保留哪些维度」，不是 MT Framework 的实现细节。

不在本文件内：

- **per-monster 数值表**（肉质、体力、耐久、陷阱秒数、异常阈值）。公开仓只写结构与来源，取数按下表回源文档。
- **素材掉落 / 剥取 / 捕获报酬 / 生息地 / 任务编排**。字段级描述在 `docs/mechanics/monsters.md:384-399`，属 quest / loot 领域，不在此重复。
- **体型表本体数值**。公开仓只写字段结构，数值在私有副本（见 0.1.2）。

#### 0.1.1 取数索引（source map）

| 内容 | 取数处 |
|---|---|
| 分类与规模、物种分布 | `docs/mechanics/monsters.md:19-46` |
| 93 只大型怪 i <-> db_id <-> 槽位映射 | `docs/mechanics/monsters.md:409-511` |
| 体力模型 | `docs/mechanics/monsters.md:61-68` |
| 肉质（含全部状态行） | `docs/mechanics/monsters.md:72-219` |
| 部位耐久与浸出物 | `docs/mechanics/monsters.md:221-247` |
| 状态异常 | `docs/mechanics/monsters.md:251-283` |
| 道具效力 | `docs/mechanics/monsters.md:287-306` |
| 威胁特征、专属状态名 | `docs/mechanics/monsters.md:310-350` |
| 狞猛化、二名 | `docs/mechanics/monsters.md:354-380` |
| 存档侧（计数/尺寸/映射假设） | `docs/mechanics/monsters.md:513-598` |
| 最小数据模型 | `docs/mechanics/monsters.md:600-627` |
| 体型表 / 冠阈值 / 尺寸分布 | `docs/analysis/monsters/mon-size-calc.md:290-352` |
| `mParam.*` 字段名表 | `docs/mechanics/monster-ai-params.md:23-198` |
| 单元名 `uEm###_00` | `docs/mechanics/monster-ai-params.md:286-383` |

#### 0.1.2 数据边界

公开仓（MIT）只收结构：per-monster 数值表与本规范分离；体型表本体数值不入公开仓（`mon-size-calc.md:344`）。本文件因此**不含**任何一只怪的具体肉质 / HP / 耐久 / 秒数。

### 0.2 状态标记

| 标记 | 含义 |
|---|---|
| `GU-confirmed` | 源文档明确给出该字段语义，且未标为未确认（多数同时有第二信源：机读库、字节实测或第二份页面） |
| `GU-unconfirmed (U#)` | `monsters.md` §15 的未确认项，编号照抄（U1..U20） |
| `GU-unconfirmed (-)` | 源文档没有对应 U 项，但字段本身无 offset / size / 语义（主要是 `monster-ai-params.md` 的字段名表，`:5` 明示只登记名字），或解析不可靠 |

注意：`docs/analysis/monsters/mon-size-calc.md` 有**自己一套** U1..U5（`:326-335`），与本文件的 U 编号不同源。本文件引用体型侧未知项时只给行号 + 文字描述，不用裸 U 号。

### 0.3 编码约定

- 百分比：整数 0..100。
- 时间：秒（s）。
- 系数 / 倍率：无量纲。
- 体型：百分比整数（100 = 100%）或无量纲倍率，视字段而定（§8）。
- 存档坐标：`char_off` = 猎人块内偏移（`monsters.md:515`）；另给 `obj+0xNNN` 形式（`monsters.md:517-521`）。
- 等级：属性弱点用源文档的五档（`monsters.md:56`：最有效 > 次 > 中 > 弱 > 无），本规范写作 `rank 1..5`，1 = 最有效、5 = 无；易生效度只有四档加 `无效`（`monsters.md:255`），写作 `rank 1..4` / `无效`。`无效`（完全免疫）不占等级。
- 残缺标记：源文档的 `-` = 无该项数据；道具 / 异常表另用 `无效` 表示完全免疫，与五档等级分开记。
- 字段名：对外字段用英文 snake_case；GU 原生字段（`mParam.*`、`m*`、`obj+0xNNN`）保留原名，便于回查。

### 0.4 记录形状（字段名示例，不含任何数值）

```text
Monster {
  monster_index, db_id, species, class, scale_class,
  flags { deviant, variant, elder, capturable, hyper_capable },
  names { name, name_ja, icon_name }, em_unit, em_type, form_group,

  base_hp, quest_hp_multiplier, quest_defense_rate, capture_hp_threshold,

  parts [ { part, part_state, cut, impact, shot,
            fire, water, thunder, ice, dragon, ko } ],
  durability [ { part, value, cutting_value, hyper_value, aura_value,
                 break_repeat_count, extract_flag } ],
  status [ { ailment_kind, initial, increase, max, duration, damage, ease } ],
  items [ { item, effect_seconds[normal|enraged|fatigued], valid_bit, condition } ],
  threat { roar, wind_pressure, tremor, bind, blight[], inflicted_ailment },

  size { mMonsterIndex, mTrueSize, mSmallScale, mBigScale, mKingScale,
         mQuestSizeMin, mQuestSizeMax, mScaleRate, mProbability },
  ai { mParam.* },                       // 仅字段名，见 §9
  save { kill_count, capture_count, size_mini_pct, size_maxi_pct }
}
```

字段名基线取自最小数据模型 `monsters.md:603-621`；§2-§10 按同一命名风格补足分组，新增字段在各自表格里注明来源。

---

## 1. 身份与分类（Identity & taxonomy）

一只怪物在跨游戏映射里的最小身份集合。要点：GU 侧主键是**存档槽号** `monster_index`，既不是 wiki 顺序、也不是机读库 `db_id` 顺序（`monsters.md:48-51`、`:509`）。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `monster_index` | 内容主键：存档槽号，也是编辑器 `MonsterForm` 的 0-based 行号 | u8；大型怪 0..92；底层三表共用键空间 0..136 | `monsters.md:411`（i 定义）、`:604`（u8, 0..92）、`:547`（137 槽容量）；`mon-size-calc.md:309-311`、`:348`（表内 0..136 连续） | GU-confirmed | |
| `db_id` | 机读库 `monsters.json` 的 `_id`，用于取多语言名与图标 | u16；基础段 1..88，变种 269 / 513 / 514 / 525，二名 1025..1351，小型 4097..4144 | `monsters.md:411`、`:605`、`:24`、`:413-507` | GU-confirmed | |
| `species` | 物种（`种类`）：飞龙 / 古龙 / 牙兽 / 鸟龙 / 兽龙 / 海龙 / 甲壳 / 鱼龙 / 两生 / 甲虫 / 牙龙 / 蛇龙 / 鋏角 / 不明 | 枚举，14 值（闭集） | `monsters.md:29-46`、`:606` | GU-confirmed（`不明` 两只见 U16） | |
| `class` | 机读库分类（`monsters.json` 的 `class`）：普通大型 / 小型 / 二名 | 枚举 {0, 1, 2} | `monsters.md:23-25`、`:24` | GU-confirmed | |
| `scale_class` | 大型（可狩猎目标）或小型（不进怪物统计，仅任务副目标 / 生态对象） | bool | `monsters.md:23-24`、`:405` | GU-confirmed | |
| `flags.deviant` | 二名怪（特殊许可） | bool | `monsters.md:25`、`:372` | GU-confirmed | |
| `flags.variant` | 特殊个体（激昂 / 怒食 / 临界 / 浑沌） | bool | `monsters.md:437`、`:450`、`:499`、`:501` | GU-confirmed | |
| `flags.elder` | 古龙种 | bool | `monsters.md:34`、`:303` | GU-confirmed | |
| `flags.hyper_capable` | 是否存在狞猛化个体 | bool | `monsters.md:358-362`、`:364`（`hyper=1` 任务关联，2305 行表） | GU-unconfirmed (-) | |
| `flags.capturable` | 是否可捕获 | bool | `monsters.md:607`（最小模型列此 flag）、`:68`（阈值无信源） | GU-unconfirmed (U6) | |
| `names.name` / `names.name_ja` / `names.icon_name` | 展示名、日文名、图标键 | 字符串 | `monsters.md:411`、`:605` | GU-confirmed | |
| `em_unit` | 引擎单元名：大型 `uEm###_00`、小型 `uEms###_00`，另有控制单元 / 岩块等派生名 | 字符串（命名规则） | `monster-ai-params.md:286-383`（含 `:375-383` 的 `uEm087_088_ControlUnit`、`uEm087_Rubble`、`uEm088_Rubble`） | GU-confirmed（名字存在） | |
| `em_unit_map` | `db_id` -> `uEm###` 编号的对照 | 映射 | 源文档未建立（`monster-ai-params.md:5` 只登记名字） | GU-unconfirmed (-) | |
| `em_type` | 运行期 em 类型号 | 枚举（值域未记录） | `monster-ai-params.md:198`（`0x155c198`） | GU-unconfirmed (-) | |
| `form_group` | 同槽多形态归组（例：阁螳螂与机甲形态共用 1 槽） | 组 id | `monsters.md:380`、`:507` | GU-confirmed（采掘细节见 U14） | |

补充（建模约束，非字段）：

- 93 行名单与 93 只大型怪一一对应、无重复无遗漏；`i` 序不是 `db_id` 序（`monsters.md:509`）。
- wiki 侧有 94 个「大型」条目，多出的一个是同场战斗的形态（`monsters.md:27`、`:380`），映射时按 `form_group` 合并，不新增记录。
- 36 只小型怪只有身份（名 / id / 图标），无肉质与弱点（`monsters.md:404`、U20）。

---

## 2. 体力与伤害链（Health & damage chain）

GU 的体力是「怪物固有基础值 x 任务倍率」，伤害是「武器侧数值 x 肉质 / 100 x 全体防御率 x 其它」。两个任务倍率都不在任何现有数据源里（`monsters.md:66`），因此本节的链式结构可跨游戏复用，因子需要另找信源。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `base_hp` | 基础体力（怪物固有，不含任务倍率） | u32；约 1.8e3..2.5e4（量级说明见 `monsters.md:67`，本文件不复制） | `monsters.md:65`、`:608`（`monsters.json` 的 `base_hp`） | GU-confirmed | |
| `quest_hp_multiplier` | 任务体力倍率 | 无量纲，正数；值域无信源 | `monsters.md:63`、`:66` | GU-unconfirmed (U5) | |
| `quest_defense_rate` | 全体防御率：任务内对玩家伤害的独立减伤系数 | 系数；值域无信源 | `monsters.md:63`、`:66`、`:624` | GU-unconfirmed (U5) | |
| `effective_hp` | 实际体力 = `base_hp` x `quest_hp_multiplier` | 派生值 | `monsters.md:66`、`:624` | GU-confirmed（公式）；因子见 U5 | |
| `damage_formula` | 实际伤害 = 武器攻击力 x 动作值 x 肉质 / 100 x 全体防御率 x 其它 | 派生值 | `monsters.md:624` | GU-confirmed（结构） | |
| `capture_hp_threshold` | 进入捕获判定的体力百分比 | 百分比 0..100 | `monsters.md:68`、`:639` | GU-unconfirmed (U6) | |
| `vitality_axis` | 任务强度条的两条轴：体力倍率、全体防御率 | 定性（两轴） | `monsters.md:63` | GU-confirmed（两轴存在） | |
| `hp_vital` | 运行期当前体力字段名（`mParam.hp_vital`） | 未知（名表） | `monster-ai-params.md:163`（`0x1559578`） | GU-unconfirmed (-) | |
| `hokaku_point` | 捕获/拘束类阈值字段名（`mParam.hokaku_point`） | 未知（名表） | `monster-ai-params.md:74`（`0x15599e2`） | GU-unconfirmed (-) | |

建模约束：

- `base_hp` 只用于同游戏内比较与量级判断；跨怪绝对值不可比（`monsters.md:63`）。
- 捕获判定不要从 `base_hp` 推：源文档明确无阈值（`monsters.md:68`），运行期字段名 `mParam.hokaku_point` 是否即该阈值未证实（`monster-ai-params.md:74`）。
- `quests.json` 只有报酬 / HRP / 限制，没有 HP 倍率；`monster_to_quest.json` 只有 `unstable` / `hyper` 两个标志（`monsters.md:66`），不要把任务标志当倍率。

---

## 3. 肉质：部位 x 状态（Hitzones per part and state）

GU 的肉质是「部位 x 9 列」再加一个**状态维度**：同一部位在一次狩猎内可以有 2..3 套肉质（`monsters.md:331`）。跨游戏映射时状态维度必须保留，否则伤害模型无法对齐。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `part` | 部位键：基础部位名，或「基础名 + 状态后缀」 | 字符串 | `monsters.md:87`、`:610` | GU-confirmed | |
| `part_base_vocabulary` | 基础部位名词表（Head / Neck / Body / Chest / Breast / Torso / Back / Belly / Wings / Wing / Wing Talons / Wing Claws / Wing Arms / Legs / Upper Legs / Lower Body / Upper Body / Thigh / Front Legs / L. Front Leg / R. Front Leg / Claw / Claws / Back Legs / Left Hind Leg / Right Hind Leg / Tail / Tail Tip / Tail Base / Horn / Horns / Fangs / Dorsal Horns / Stinger / Shell / Softshell / Shell Flesh / Gills / Fin / Nose / Mouth / Blowhole 等） | 枚举，逐条对照见源表 | `monsters.md:89-105` | GU-confirmed | |
| `part_state` | 该行肉质所属状态：`normal` / `enraged` / `broken` / `special(<name>)` | 枚举 + 状态名 | `monsters.md:611`、`:314-329` | GU-confirmed | |
| `part_state_vocabulary` | 状态后缀词表：`(Enraged)` `(Break)` `(Charged)` `(Cool)` `(Heating)` `(Hot/Break)` `(Fire Form)` `(Ice/Thunder Form)` `(Ice Armor)` `(Snow)` `(Mud)` `(Virus)` `(Virused)` `(Fatigued)` `(Fatigue)` `(Inflated)` `(No Hide)` `(No Shell)` `(Break Shell)` `(Skull Shell)` `(Guarding)` `(Wind Barrier)` `(Invisible)` `(Fished Out)` `(Wounded Belly)` `(Rage 1)` `(Rage 2)` `(Red Slime)` `(Bubbles)` `(Mucus Covered)` | 枚举（是否闭集无信源） | `monsters.md:109-132` | GU-confirmed | |
| `cut` | 斩击肉质 | 0..100（% 伤害倍率） | `monsters.md:78`、`:80`、`:612` | GU-confirmed | |
| `impact` | 打击肉质 | 0..100 | `monsters.md:78`、`:80`、`:612` | GU-confirmed | |
| `shot` | 弹肉质 | 0..100 | `monsters.md:78`、`:80`、`:612` | GU-confirmed | |
| `fire` / `water` / `thunder` / `ice` / `dragon` | 五属性肉质；0 = 完全免疫该属性 | 0..100 | `monsters.md:78`、`:80`、`:612` | GU-confirmed | |
| `ko` | 气绝（眩晕）值；仅少数部位非 0 | u8；0..255 | `monsters.md:82`、`:613` | GU-confirmed（DB 与 wiki 冲突时以 DB 为准，`:134`） | |
| `melee_weak_point` | 斩 / 打 / 弹 各自的最有效部位（可并列两个） | 部位名 | `monsters.md:55`、`:138` | GU-confirmed | |
| `element_weak_rank` | 五属性相对等级，只在同一只怪内比较 | rank 1..5（1 = 最有效，5 = 无） | `monsters.md:56`、`:138-139` | GU-confirmed | |
| `element_ordinal` | 机读库 `monster_weakness.json` 的 0..6 序数，另一套量表 | 0..6 | `monsters.md:140`、`:642` | GU-unconfirmed (U9) | |
| `hyper_part_multiplier` | 狞猛化时指定部位的肉质倍率 | 五档倍率（1.1 / 1.2 / 1.35 / 1.4 / 1.5 量级，逐怪见源） | `monsters.md:358-359`、`:644` | GU-unconfirmed (U11) | |
| `hitzone_set_count` | 单部位在一次狩猎内可切换的肉质套数 | 2..3 | `monsters.md:331` | GU-confirmed | |
| `state_overlay_rule` | 两个状态同时成立时的取值规则（例：双形态弱点并列） | 规则 | `monsters.md:650` | GU-unconfirmed (U17) | |
| `part_unparsable` | 肉质表列错位、需回原始 HTML 解析的怪 | 标记 | `monsters.md:646` | GU-unconfirmed (U13) | |
| `part_missing_in_db` | wiki 有、机读库无对应行的部位（瓦砾类岩块护甲） | 标记 | `monsters.md:105` | GU-unconfirmed (-) | |

建模约束：

- 两源可互替：wiki 肉质与机读库逐值一致，wiki 只多出状态括注（`monsters.md:85`）。
- 状态维度是必需列，不是可选注释（`monsters.md:331`）；每只怪的状态名不同（`:314-329`），故 `part_state` 用开放枚举 + 名称。
- 跨怪比较只能用绝对肉质数值；`element_ordinal` 与 `element_weak_rank` 不同源、禁止互转（`monsters.md:140`、`:626`、U9）。
- 全 0 部位 = 完全无敌，用于引导破坏前置（`monsters.md:215`、`:217`）。

---

## 4. 部位耐久与破坏（Part durability / breaks）

耐久值是「部位累计伤害阈值」，到 0 触发硬直与部位破坏（`monsters.md:227`）。它是独立于肉质的第二套部位数据，跨游戏映射时与部位键共用。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `durability` | 部位耐久阈值；到 0 触发硬直 + 部位破坏 | 正整数；常规量级 10^2..10^3（示例表见 `monsters.md:236-245`，本文件不复制） | `monsters.md:223`、`:227`、`:615` | GU-confirmed | |
| `cutting_durability` | 切断属性专用的第二阈值（源文档记作「下段 = 切断耐久值」）；镜像扁平化后与方括号值不可 100% 区分 | 正整数 | `monsters.md:228` | GU-confirmed | |
| `hyper_durability` | 狞猛化时的耐久值 = 基础值 x 1.5 | 正整数 | `monsters.md:229`、`:360` | GU-confirmed | |
| `aura_durability` | 斗气（光环）发生时的耐久值（方括号值）；狞猛化解除前该部位更硬 | 正整数；与 `hyper_durability` 并列，大小关系不固定 | `monsters.md:229`、`:361`、`:245` | GU-confirmed | |
| `state_durability` | 二名专属状态下的耐久值（随专属状态上升，可远高于基础值） | 正整数 | `monsters.md:234`、`:377` | GU-confirmed | |
| `break_repeat_count` | 触发破坏所需「耐久归零」次数 | 正整数；源文档示例为 1 或 2 | `monsters.md:247` | GU-confirmed | |
| `break_side_rule` | 左右成对部位（爪）破坏条件：任一侧归零一次 / 同部位两次 | 枚举 | `monsters.md:247` | GU-confirmed | |
| `extract_flag` | 该部位存在浸出物标记（每格一个记号） | bool | `monsters.md:232`、`:645` | GU-unconfirmed (U12) | |
| `durability_absent` | 整表 `-` = 无部位破坏数据，只能靠伤害累积 | bool | `monsters.md:231` | GU-confirmed | |
| `part_mining` | 部位采掘（唯一一例：机甲形态第二形态，从头 / 胴 / 脚采掘） | 次数 | `monsters.md:380`、`:647` | GU-confirmed | |
| `durability_outlier` | 远超常规量级的部位耐久（特例，逐怪见源） | 标记 | `monsters.md:233` | GU-confirmed | |
| `all_parts_vital` | 运行期「全部位耐久」字段名（`mParam.all_parts_vital`） | 未知（名表） | `monster-ai-params.md:168` | GU-unconfirmed (-) | |

建模约束：

- 破坏 -> 报酬（素材与概率）属 loot 领域，不在本规范（`monsters.md:247`）。
- 「狞猛化 = -」（该怪无狞猛化个体）的覆盖范围：已抽样 6 只古龙 / 二名为 `-`，其余未逐一核对（`monsters.md:230`；§15 未为此立 U 项）。
- 阁螳螂 / 机甲形态的耐久与采掘是同一槽的两个形态，`form_group` 相同的记录要分开存部位表（`monsters.md:380`）。

---

## 5. 状态异常（Status ailments）

两套互补数据：wiki 给「伤害 / 持续 / 易生效度」，机读库给「蓄积阈值曲线」（`monsters.md:255`、`:277`）。跨游戏映射需要保留三件事：种类枚举、蓄积曲线（initial / increase / max）、免疫编码。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `ailment_kind` | 蓄积型异常种类（机读库固定 8 行） | 枚举 8：Poison / Sleep / Para / KO / Exhaust / Mount / Jump / Blast | `monsters.md:277` | GU-confirmed | |
| `ailment_kind_wiki` | wiki「状态异常耐性」固定 7 行：毒 / 麻痹 / 睡眠 / 气绝 / 爆破 / 减气 / 骑乘 | 枚举 7 | `monsters.md:255` | GU-confirmed | |
| `ailment_kind_map` | 两套枚举的对应关系（机读库多出 Jump，wiki 无对应行） | 映射 | `monsters.md:255`、`:277`、`:283` | GU-unconfirmed (-) | |
| `initial` | 首次触发所需蓄积 | 正整数（点） | `monsters.md:277`、`:279` | GU-confirmed | |
| `increase` | 第 k 次触发阈值的增量 | 正整数 | `monsters.md:279` | GU-confirmed | |
| `max` | 阈值上限 | 正整数 | `monsters.md:279`、`:281` | GU-confirmed | |
| `threshold_formula` | 第 k 次阈值 = `initial` + (k-1) x `increase`，封顶 `max` | 公式 | `monsters.md:279` | GU-confirmed | |
| `trigger_count_model` | 由 `max` 反推的可触发次数口径（各状态收口次数不同） | 整数 | `monsters.md:281` | GU-unconfirmed (-) | |
| `duration` | 该状态持续秒数 | s | `monsters.md:272`、`:277` | GU-confirmed | |
| `damage` | 毒 = 状态期间总伤害；爆破 = 引爆一次伤害 | 点 | `monsters.md:271`、`:277` | GU-confirmed | |
| `ease` | 易生效度 | rank 1..5 / 无效 | `monsters.md:255` | GU-confirmed | |
| `immunity_encoding` | 整行 0/0/0/0/0 = 该状态无效 | 5 个 0 | `monsters.md:280` | GU-confirmed | |
| `status_table_absent` | 无 8 行记录 = 不设异常蓄积（巨型 / 攻城战） | 标记 | `monsters.md:277` | GU-confirmed | |
| `status_immune_all` | 七种状态全部无效（机甲形态，全场唯一特例） | bool | `monsters.md:268`、`:273` | GU-confirmed | |
| `deviant_status_delta` | 二名 vs 正体：毒 / 麻 / 眠 / 晕 / 减气 / 骑乘阈值相同，差异只在 Jump 与 Blast | 定性 | `monsters.md:283` | GU-confirmed | |
| `poison_point` / `sleep_point` / `mahi_point` / `piyo_point` | 运行期各类蓄积阈值字段名 | 未知（名表） | `monster-ai-params.md:73`、`:71`、`:72`、`:75` | GU-unconfirmed (-) | |
| `stamina_point` / `bomb_point` | 运行期减气 / 爆破阈值字段名 | 未知 | `monster-ai-params.md:70`、`:79` | GU-unconfirmed (-) | |
| `stamina_dmg_point` / `jump_dmg_point` / `nori_dmg_point` | 运行期减气伤害 / 跳跃 / 载乘类阈值字段名 | 未知 | `monster-ai-params.md:76`、`:77`、`:78` | GU-unconfirmed (-) | |
| `fight_point` / `gekkou_point` | 运行期战斗 / 激昂类阈值字段名 | 未知 | `monster-ai-params.md:80`、`:81` | GU-unconfirmed (-) | |
| `poison_count` / `bomb_count` | 运行期已触发次数（名） | 未知 | `monster-ai-params.md:174`、`:175` | GU-unconfirmed (-) | |
| `poison_timer` | 运行期毒计时（名） | 未知 | `monster-ai-params.md:180` | GU-unconfirmed (-) | |

建模约束：

- 阈值表数值不复制进本规范（公开仓边界，见 0.1.2）；需要数值时取 `monsters.md:257-268`（wiki 侧）或机读库 `monster_status.json`（阈值侧）。
- 免疫有两条编码：整行 0（`monsters.md:280`）与 wiki 的「无效」（`:255`），二者逐条对应；新增游戏若只有布尔免疫位，映射时用整行 0 判定。
- 公式细节（触发次数）未确认（`monsters.md:281`）；实现伤害模型时按 `initial` / `increase` / `max` 三点插值，别外推次数。
- 二名的异常蓄积基本等于正体，差异主要体现在体力 / 肉质 / 耐久 / 抗骑乘（`monsters.md:283`）。

---

## 6. 道具效力（Traps / flash / sonic / meat）

单页 `道具效果` 表 = `道具 x 通常 / 怒时 / 疲劳 x 前置任务`，数值是**效果持续秒数**；无效用末档符号表示（`monsters.md:289`）。机读库另有 0/1 布尔有效位（`monsters.md:305`）。两者不可互算。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `item` | 道具类别 | 枚举：麻痹陷阱 / 落穴陷阱 / 闪光玉 / 音爆弹 / 陷阱肉 / 肥料玉 | `monsters.md:291`、`:617` | GU-confirmed | |
| `effect_state_axis` | 效力随怪物状态分三档：通常 / 怒时 / 疲劳 | 枚举 3 | `monsters.md:289` | GU-confirmed | |
| `effect_seconds` | 效果持续秒数；源文档用独立符号表示无效（不要用 0 秒代替） | s，或无效 | `monsters.md:289`、`:617` | GU-confirmed | |
| `shock_trap` | 麻痹陷阱：三档时长 | s x 3 | `monsters.md:291-300` | GU-confirmed | |
| `pitfall_trap` | 落穴陷阱：三档时长 | s x 3 | `monsters.md:291-300` | GU-confirmed | |
| `flash_bomb` | 闪光玉：三档时长 | s x 3 | `monsters.md:291-300` | GU-confirmed | |
| `sonic_bomb` | 音爆弹：有效 / 无效 | bool | `monsters.md:291`、`:305` | GU-confirmed | |
| `meat` | 陷阱肉：条件有效（仅疲劳时 / 仅未发现时）或无效 | bool + 条件 | `monsters.md:293-294`、`:306` | GU-confirmed | |
| `dung_bomb` | 肥料玉：有效 / 无效 | bool | `monsters.md:291` | GU-confirmed | |
| `valid_bit` | 机读库 0/1 布尔有效位（不是秒数） | 0 = 无效，1 = 有效 | `monsters.md:305` | GU-confirmed | |
| `condition` | 条件列的存在与取值（仅疲劳时 / 仅未发现时）；机读库布尔位不表达条件（见本节约束） | 文本 | `monsters.md:293-294`、`:306` | GU-confirmed | |
| `prerequisite` | 表内「前置任务」列 | 未知 | `monsters.md:289` | GU-unconfirmed (-) | |
| `trap_immunity_rule` | 古龙 / 二名 / 大型甲虫普遍陷阱免疫；黑龙系全道具无效 | 定性规则 | `monsters.md:303` | GU-confirmed | |
| `fatigue_direction` | 疲劳通常延长时间，存在反例（缩短） | 定性规则 | `monsters.md:304` | GU-confirmed | |

建模约束：

- 两个信号各管一段：布尔位做「能否被影响」的快速过滤，秒数做表现与 AI 停顿；不要由布尔位反推秒数（`monsters.md:305`）。
- 条件有效不能丢：机读库 `meat = 0` 与 wiki「条件有效」存在单点矛盾，`0` 必须回查 wiki 条件列（`monsters.md:306`）。
- 疲劳档不是单调函数（多数延长、个别缩短，`monsters.md:304`），三档必须分别存。

---

## 7. 威胁特征（Roar / wind / tremor）

一张表同时给出六列：咆哮、风压、振动、拘束、属性异常、状态异常；取值形态是 `大 / 小 / 无 / 有 / 具体属性[等级]`（`monsters.md:335`）。这一节描述**怪物给玩家上的**效果，方向与 §5（玩家给怪物上的异常）相反（`monsters.md:348`）。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `roar` | 咆哮强度 | 大 / 小 / 无 | `monsters.md:335`、`:618` | GU-confirmed | |
| `wind_pressure` | 风压强度 | 大 / 小 / 无 | `monsters.md:335`、`:618` | GU-confirmed | |
| `tremor` | 振动（有 / 无） | bool | `monsters.md:335`、`:618` | GU-confirmed | |
| `bind` | 拘束（有 / 无） | bool | `monsters.md:335`、`:618` | GU-confirmed | |
| `blight` | 它给玩家上的属性异常，可带等级 | 属性列表；等级 小 / 大 | `monsters.md:340-344`、`:348` | GU-confirmed | |
| `inflicted_ailment` | 它给玩家上的状态异常（毒 / 雪人 / 丝缠等） | 文本枚举 | `monsters.md:340-346` | GU-confirmed | |
| `defense_down` | 防御下降（作为状态异常的一种出现） | 等级 | `monsters.md:346` | GU-confirmed | |
| `skill_gate` | 对应的免除技能门槛（耳栓等级、风压无效等级、耐震） | 定性 | `monsters.md:350` | GU-confirmed | |
| `threat_direction` | 方向语义：威胁特征 = 它给你上的；不要与 §5 的「你能给它上的」混用 | 定性 | `monsters.md:348` | GU-confirmed | |
| `unique_status` | 运行期专属状态字段名（`mParam.unique_status`） | 未知（名表） | `monster-ai-params.md:169` | GU-unconfirmed (-) | |
| `threat_runtime_field` | 咆哮 / 风压 / 振动的运行期承载字段 | 未知 | 源文档的字段名表未登记对应名字（`monster-ai-params.md:23-198`） | GU-unconfirmed (-) | |

建模约束：

- 等级不是数值：`大` 只意味着需要最高档免除技能（`monsters.md:350`），不要换算成半径或硬直帧。
- 属性异常列可以为空而状态异常非空（机甲形态即此例，`monsters.md:346`），两列独立。
- 该维度在本仓库**没有**对应的运行期字段名，跨游戏映射时只能走内容表，不能从 §9 的结构里读（见 `threat_runtime_field`）。

---

## 8. 体型与冠（Size / crowns）

体型是内容侧唯一有「真实尺寸表 + 任务区间 + 随机分布 + 存档观测值」四层的数据（`mon-size-calc.md:290-324`）。跨游戏映射时四层都要保留：否则冠、任务体型区间、模型缩放无法复现。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `mMonsterIndex` | 体型表元素键 = 137 槽号 | u32；0..136 连续 | `mon-size-calc.md:341`、`:348` | GU-confirmed | |
| `mTrueSize` | 该怪的标准全长（真实尺寸基准） | f32；单位（m 或 cm）未定 | `mon-size-calc.md:341`、`:317` | GU-confirmed | |
| `mTrueSize_unit` | `mTrueSize` 的量纲 | 未知 | `mon-size-calc.md:332`、`:343` | GU-unconfirmed (-) | |
| `mSmallScale` / `mBigScale` / `mKingScale` | 体型阈值：小体型 / 大型 / 王冠级；同一倍率轴上的三个门限 | f32 无量纲倍率；满足 `mQuestSizeMin <= mSmallScale < 1 < mBigScale <= mKingScale <= mQuestSizeMax` | `mon-size-calc.md:341`、`:350`、`:320-321` | GU-confirmed | |
| `mQuestSizeMin` / `mQuestSizeMax` | 任务体型区间：出怪倍率被夹在该区间内 | f32 无量纲倍率 | `mon-size-calc.md:341`、`:316` | GU-confirmed | |
| `mScaleRate` | 单次出怪抽到的体型倍率 | f32 无量纲 | `mon-size-calc.md:65`、`:316` | GU-confirmed | |
| `mProbability` | 尺寸分布表中该倍率的权重 | 权重；类型与量纲未定（分布表本体未解） | `mon-size-calc.md:66`、`:301`、`:339` | GU-confirmed | |
| `model_scale` | 实际模型缩放 = `mTrueSize` x `mScaleRate` | f32 | `mon-size-calc.md:317` | GU-unconfirmed (-) | |
| `size_mini_pct` / `size_maxi_pct` | 存档记录的历史最小 / 最大体型倍率 | u16；百分比整数（100 = 100%） | `monsters.md:521`、`:534`；`mon-size-calc.md:99-100`、`:305-306` | GU-confirmed | |
| `size_record_capacity` | 存档体型记录容量 | 物理 137 条 / 有效 129 条 | `mon-size-calc.md:298`、`:305`；`monsters.md:521` | GU-confirmed | |
| `crown_small` / `crown_large` | 冠判定结果：观测倍率与 `mSmallScale` / `mBigScale` / `mKingScale` 比大小 | bool | `monsters.md:535`、`:640`；`mon-size-calc.md:320-321` | GU-unconfirmed (U7) | |
| `crown_compare_direction` | 冠判定的比较方向与等号归属 | 规则 | `mon-size-calc.md:333` | GU-unconfirmed (-) | |
| `size_high_byte` | 存档记录高字节：两档 137 条实测全为 0，故值域 = 整数百分比；是否恒 0 未定 | 实测 0 | `mon-size-calc.md:100`；`monsters.md:534`、`:641` | GU-unconfirmed (U8) | |
| `size_table_resource` | 体型表资源：`rEmSizeCalcTblElement` / `.emsizetbl`，载体 `em_size_scale_data` | 资源；`f32 1.0 + u32 count + 137 x 28 B` | `mon-size-calc.md:83`、`:339-341` | GU-confirmed | |
| `size_record_layout` | 每条 28 B = 7 x 4 B，顺序同成员名串 | 布局 | `mon-size-calc.md:341-342` | GU-confirmed | |
| `size_yure_resource` | 尺寸分布表资源：`rEmSizeYureTbl` / `.emyure`，载体 `em_size_yure_data` | 资源；本体未解 | `mon-size-calc.md:85`、`:339` | GU-confirmed | |
| `size_table_valid_rows` | 表内有效行 / 全零占位行 | 83 / 54（共 137 行） | `mon-size-calc.md:349` | GU-confirmed | |
| `size_table_private` | 表内数值与私有副本不入公开仓 | 策略 | `mon-size-calc.md:344` | GU-confirmed | |

建模约束：

- 存档百分比 = 表内倍率 x 100（`mon-size-calc.md:351`）；两者共用一个 137 槽键空间（`:309-311`）。
- 体型表是**单份**资源、按 `mMonsterIndex` 索引，不是每怪一份文件（`mon-size-calc.md:297`、`:307-308`）。
- 存档只存「遇到过的最小 / 最大」两个观测值；冠是派生量，不能反向写入（`monsters.md:535`）。
- 字段顺序有三重互证：成员名串顺序 + 28 B 结构闭合 + 有效行全部满足上述不等式（`mon-size-calc.md:341-342`、`:350`）。

---

## 9. AI 参数（只收 `monster-ai-params.md` 能支持的部分）

来源是 `main.140.flat.bin` rodata 里的反射/调试字段名表：**名字顺序 = 结构声明序**，但**不含 offset / size**（`monster-ai-params.md:3-5`）。`vaddr` 是字符串自身的地址，`flat_off = vaddr + 0x100`（`:3`）。因此本节只登记「字段存在与命名」，语义除行动后缀表（`:516-529`，源文档自标推断）外基本未记录。

> 本节所有行的状态都是 `GU-unconfirmed (-)`：**名字已证实，语义 / 偏移 / 值域未证实**。用途是行为建模与运行时观察，不是内容表，也不能当存档布局。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `mParam.size` | 运行期体型值（与 §8 倍率的关系未记录） | 未知 | `monster-ai-params.md:104`（`0x1559b14`） | GU-unconfirmed (-) | |
| `mParam.type` | 怪物类型号 | 未知 | `monster-ai-params.md:105`（`0x1559b20`） | GU-unconfirmed (-) | |
| `mParam.master_id` / `mParam.mMasterId` | 主 id 及其成员副本 | 未知 | `monster-ai-params.md:109`（`0x1559b89`）、`:103`（`0x155997e`） | GU-unconfirmed (-) | |
| `mParam.net_em.master_id` / `.type` / `.prio` / `.uid` | 网络实体的主 id / 类型 / 优先级 / uid | 未知 | `monster-ai-params.md:101-102`、`:154-155` | GU-unconfirmed (-) | |
| `mParam.em_type` | em 类型号 | 未知 | `monster-ai-params.md:198`（`0x155c198`） | GU-unconfirmed (-) | |
| `mParam.idx` / `mParam.num` | 槽内索引 / 数量 | 未知 | `monster-ai-params.md:110-111` | GU-unconfirmed (-) | |
| `mParam.nando_h` / `.nando_a` / `.nando_o` | 难度三档（h / a / o 各一） | 未知 | `monster-ai-params.md:106-108` | GU-unconfirmed (-) | |
| `mParam.hp_vital` | 当前体力 | 未知 | `monster-ai-params.md:163`（`0x1559578`） | GU-unconfirmed (-) | |
| `mParam.all_parts_vital` | 全部位耐久（疑为合计） | 未知 | `monster-ai-params.md:168`（`0x15595f0`） | GU-unconfirmed (-) | |
| `mParam.status` / `status_bit` / `unique_status` | 状态值 / 状态位 / 专属状态 | 未知 | `monster-ai-params.md:94`、`:87`、`:169` | GU-unconfirmed (-) | |
| `mParam.em_mode` | 行动模式 | 未知 | `monster-ai-params.md:88`（`0x155966b`） | GU-unconfirmed (-) | |
| `mParam.act_st` / `act_no` | 行动状态 / 行动编号 | 未知 | `monster-ai-params.md:170-171` | GU-unconfirmed (-) | |
| `mParam.action_count` | 行动计数 | 未知 | `monster-ai-params.md:90`（`0x15596d1`） | GU-unconfirmed (-) | |
| `mParam.pre_condition_bit` | 行动前置条件位 | 位域 | `monster-ai-params.md:89`（`0x15596b8`） | GU-unconfirmed (-) | |
| `mParam.cmd_flag[i]` | 指令标志数组 | 位域数组 | `monster-ai-params.md:93`（`0x1559af3`） | GU-unconfirmed (-) | |
| `mParam.atk_cancel_ok_flag` | 攻击是否可取消 | bool | `monster-ai-params.md:92`（`0x155998f`） | GU-unconfirmed (-) | |
| `mParam.flag` | 通用标志字 | 位域 | `monster-ai-params.md:95`（`0x1559b70`） | GU-unconfirmed (-) | |
| `mParam.target_type` / `target_id` | 当前目标类型 / 目标 id | 未知 | `monster-ai-params.md:63-64` | GU-unconfirmed (-) | |
| `mParam.target_type[i]` / `target_sel[i]` / `target_selID[i]` | 逐槽目标类型 / 选择 / 选择 id | 数组 | `monster-ai-params.md:59`、`:60`、`:58` | GU-unconfirmed (-) | |
| `mParam.target_rand_keep[i]` / `target_rand_status[i]` | 目标随机保持 / 随机状态 | 数组 | `monster-ai-params.md:57`、`:61` | GU-unconfirmed (-) | |
| `mParam.tar_param[i].id` / `.max` / `.num` / `.clr_param` | 目标参数表：id / 上限 / 数量 / 清除参数 | 数组 | `monster-ai-params.md:191`、`:192`、`:112`、`:190` | GU-unconfirmed (-) | |
| `mParam.waypointStatus` / `way_move_type` / `way_move_rno0` / `way_move_rno1` | 寻路状态 / 移动类型 / 两个移动随机号 | 未知 | `monster-ai-params.md:32`、`:33`、`:34-35` | GU-unconfirmed (-) | |
| `mParam.way_goto_pos.x` / `.y` / `.z` | 寻路目标点 | 坐标 | `monster-ai-params.md:37-39` | GU-unconfirmed (-) | |
| `mParam.area_move_req_type` / `area_move_total_timer` | 区域间移动请求类型 / 总计时 | 未知 / s（疑） | `monster-ai-params.md:36`、`:208` | GU-unconfirmed (-) | |
| `mParam.area_no` / `mParam.floor_id` / `mParam.jimen_Y` | 当前区域 / 楼层 / 地面高度 | 未知 | `monster-ai-params.md:172`、`:176`、`:165` | GU-unconfirmed (-) | |
| `mParam.em_set_id` / `par_em_set_id` / `head.em_set_id` / `hosyoku_em_set_id` | 组编成 id（本体 / 父组 / 头部 / 补食组） | 未知 | `monster-ai-params.md:137`、`:136`、`:133`、`:134` | GU-unconfirmed (-) | |
| `mParam.set_type` / `sub_type` | 组类型 / 子类型 | 未知 | `monster-ai-params.md:138-139` | GU-unconfirmed (-) | |
| `mParam.mure_id` / `mure_status` / `mure_head.*` / `yobi_attr` / `yobi_area` | 群（mure）编成与预备属性 / 区域 | 未知 | `monster-ai-params.md:140-147`、`:141-142` | GU-unconfirmed (-) | |
| `mParam.host_flag` / `local_ck_flag` / `enemyNetFlags` | 主机标志 / 本地校验 / 同步标志 | 位域 | `monster-ai-params.md:119`、`:127`、`:118` | GU-unconfirmed (-) | |
| `mParam.sysSendData.*` | 同步负载（`em_set_id` / `rev_count` / `escape_count` / `send_status` / `set_num` / `q_target_type` / `zako_set_idx`） | 未知 | `monster-ai-params.md:120-126`、`:62` | GU-unconfirmed (-) | |
| `mParam.quest_st` / `gekitai_st` / `sub_flag` | 任务状态 / 激昂状态 / 子任务标志 | 未知 | `monster-ai-params.md:193-195` | GU-unconfirmed (-) | |
| `mParam.call_status` / `call_area` | 呼出状态 / 呼出区域 | 未知 | `monster-ai-params.md:185`、`:187` | GU-unconfirmed (-) | |
| `mParam.mDouMouKaRandom` | 狞猛化（DouMouKa）随机数 | 未知 | `monster-ai-params.md:181`（`0x1559b59`） | GU-unconfirmed (-) | |
| `mParam.ret_time` / `ret_time20` / `clr_timer` | 回归 / 回归 20 / 清除计时 | s（疑） | `monster-ai-params.md:196-197`、`:189` | GU-unconfirmed (-) | |
| `mParam.mData[i]` / `mParam.param` / `free_work[i]` / `mSyncParam` | 通用数据槽 / 参数块 / 自由工作区 / 同步参数 | 未知 | `monster-ai-params.md:184`、`:182`、`:177`、`:188` | GU-unconfirmed (-) | |
| `mParam.poison_count` / `bomb_count` / `eye_damage_count` | 已触发毒 / 爆破 / 眼部伤害计数 | 计数 | `monster-ai-params.md:174`、`:175`、`:173` | GU-unconfirmed (-) | |
| `emUniqueActMain` / `emUniqueActParamSet` | 行动主函数 / 行动参数注册函数 | 符号 | `monster-ai-params.md:11-12` | GU-unconfirmed (-) | |
| `move_suffix` | 行动后缀语义：`fw_move` 前进 / `action_move` 一般行动 / `move_move` 移动 / `moguri_move` 潜地 / `attack_move` 攻击 / `revival_move` 复活 / `fly_move` 飞行 / `demo_move` 演出 / `hover_move` 悬停 / `pre_catch_move` + `catch_move` 拘束前摇与拘束 | 枚举 | `monster-ai-params.md:516-529`（源文档自标推断）、`:232-233` | GU-unconfirmed (-) | |

建模约束：

- 名表是「声明序」而非「偏移表」：要拿到 offset 必须反推注册函数（`emUniqueActParamSet`，`monster-ai-params.md:5`、`:12`）。
- `mParam.*` 是运行期结构，不是内容表；跨游戏映射时把它当「行为参数占位清单」，不要在存档侧找对应字节。
- 同一字段出现多次（例：`way_move_type` 在 `:33` 与 `:204` 各一次、`area_move_req_type` 在 `:36` 与 `:207`），说明它同时出现在 mParam 与行动名两处，映射时按 §1 的 `em_unit` 区分。
- 单元名清单（`uEm###_00` / `uEms###_00`，以及 `uEm087_088_ControlUnit`、`uEm087_Rubble`、`uEm088_Rubble` 这些派生名）在 `monster-ai-params.md:286-383`，已归入 §1 的 `em_unit`，本表不重复。

---

## 10. 存档侧链接（Save-side links）

存档把怪物统计放进三张定长表：击杀计数、捕获计数、尺寸记录；三者共用同一套槽号（`monsters.md:519-521`、`mon-size-calc.md:309-311`）。`char_off` 是猎人块内偏移，`obj+0xNNN` 是对象侧偏移（`monsters.md:515`）。

| field | meaning | unit / range | GU storage / source (file:line) | status | RS mapping |
|---|---|---|---|---|---|
| `kill_count[i]` | 该槽的击杀计数；跨下位 / 上位 / G 级累计，不分级 | u16；0..65535 | `monsters.md:519`（`obj+0x72C`，char_off `0x5EA2..0x5FB4`）、`:526`（读点 `24230 + 2*i`）、`:533`（u16 语义） | GU-confirmed | |
| `capture_count[i]` | 该槽的捕获计数；同构 | u16；0..65535 | `monsters.md:520`（`obj+0x83E`，`0x5FB4..0x60C6`）、`:527`（`24504 + 2*i`） | GU-confirmed | |
| `size_mini_pct[i]` | 遇到过的最小体型百分比 | u16；百分比整数 | `monsters.md:521`（`[obj+0x950]` 表 / `[obj+0x954]` 条数）、`:528`（`24778 + 4*i`）、`:534` | GU-confirmed | |
| `size_maxi_pct[i]` | 遇到过的最大体型百分比 | u16；百分比整数 | `monsters.md:521`、`:529`（`24778 + 4*i + 2`） | GU-confirmed | |
| `slot_key_space` | 三表共用键空间；物理容量 137、有效 129 | 137 槽 | `mon-size-calc.md:298`、`:309-311`；`monsters.md:547` | GU-confirmed | |
| `counter_block_capacity` | 计数块容量口径：`137 x u16` 还是 `4 + 135 x u16`（字节等价） | 274 B | `monsters.md:519-520`、`:547` | GU-unconfirmed (U1) | |
| `size_block_capacity` | 尺寸块容量口径：`4 + 137 x 4` 还是 `138 x 4` | 552 B | `monsters.md:521`、`:547` | GU-unconfirmed (U1) | |
| `slot_index_offset` | 编辑器读点相对块首 `+4`：是否等于「跳过 2 槽」 | 槽偏移 | `monsters.md:532`、`:635` | GU-unconfirmed (U2) | |
| `unknown_slots` | 无名字、但至少部分仍有真实计数的槽（93..134） | 42 槽 | `monsters.md:538-546`、`:636` | GU-unconfirmed (U3) | |
| `slot_92` | 槽 92（`24414 / 24688 / 25146`）归属 | 槽 | `monsters.md:540`、`:637` | GU-unconfirmed (U4) | |
| `slot_order_hypothesis` | 槽序来源三候选（族谱式 / `db_id` 序 / 预留），未定论 | 假设 | `monsters.md:561-576` | GU-unconfirmed (-) | |
| `slot_order_tests` | 判定实验：捕获零对角（T1）/ 表头判定（T2）/ 单事件标定（T3）/ 小型怪验证（T4） | 实验 | `monsters.md:561-576` | GU-unconfirmed (-) | |
| `permit_level` | 二名许可等级；名字表 `mPermitLv[N]` 容量 16 | 0..15 | `monsters.md:375`、`:582`、`:648` | GU-unconfirmed (U15) | |
| `quest_link` | 怪物 x 任务关联表，带 `unstable` / `hyper` 两个标志 | 表（2305 行） | `monsters.md:583`、`:364` | GU-confirmed | |
| `ui_order` | 图鉴 / 狩猎记录界面顺序，不可当索引证据 | 约束 | `monsters.md:584` | GU-confirmed | |
| `size_write_width` | 尺寸写回只写低字节，高字节非 0 时产生 x256 错值 | 写规则 | `monsters.md:534`、`:641` | GU-unconfirmed (U8) | |
| `crown_threshold` | 冠判定阈值的来源（见 §8 三阈值） | 派生 | `monsters.md:535`、`:640` | GU-unconfirmed (U7) | |
| `slot_map_137` | 137 槽号 <-> 怪物名的对照文件 | 文件 | `mon-size-calc.md:348`（`monster-slot-map-137.json`） | GU-confirmed | |

建模约束：

- 三张表同键空间、不同容量口径：计数表 274 B、尺寸表 552 B，二者对 135 / 137 / 138 的口径尚未统一（U1），实现在读到块尾前不要假设长度。
- 槽 0..92 可映射到 93 只大型怪；93..134 无名字（U3），编辑器只应写 0..92。
- 尺寸记录是「观测最小 / 最大」，不与体型表（§8）互写；写回必须保留高字节（U8）。
- `monster_to_quest.json` 的 `hyper` 标志是判断狞猛化任务的唯一字段（`monsters.md:364`、`:583`），不要从怪物记录本身推。

---

维护规则（新增字段时逐条满足）：

1. 每行必须有 `file:line` 来源，且来源限于 0.1.1 的取数索引。
2. 状态只能取 `GU-confirmed` / `GU-unconfirmed (U#)` / `GU-unconfirmed (-)`；`U#` 只指 `monsters.md` §15。
3. 数值不进本文件：只写单位与值域；per-monster 表一律回源文档。
4. `RS mapping` 列由 RS 半填写；GU 半不预填、不猜。
