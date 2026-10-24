# 多人联机：任务数值、集会所规则与待证项

> **三行摘要**
> - 怪物血量**不是按人头动态翻倍**：每条任务在数据里写死一个「体力表号」(`HealthTbl`)，集会所任务和村任务用不同表号，所以同一只怪「集会所比村血厚」是**按任务固定**的，不是按人数变的 `[B]`。
> - 猫车（力尽）上限写在任务记录里，抽查的任务都是 **3 次** `[B]`；集会所大厅的进出/聊天文本有官方中文原文 `[B]`。
> - 「联机时怪会不会再变厚 / 变厚多少」**没有信源**：任务数据里没有按人数字段，倍率表本体和人数修正若存在，都在 `main` 二进制里 `[U]`，§5 给出确切位置。

状态标记：`[B]` = 本次直接读到 romfs/main 字节；`[C]` = 仓库既有文档/数据的定论；`[I]` = 推断；`[U]` = 未核实。

**用词说明**：村（Village）任务 = 单人内容；集会所（Guild/Hub）任务 = 设计给联机（也可单机进）。本作集会所同时支持**本地联机**（面联）与**网络联机**，两套入口共用同一个任务池。

---

## 1. 任务池：哪些能联机、哪些只能单人

| 池 | 条数 | 能否联机 | 出处 |
|---|---|---|---|
| 村（Village） | 375 | **单人专属**（集会所任务板不列） | `mhgu.db.quests.hub='Village'` `[C]` |
| 集会所（Guild） | 569 | 联机池（★1–★7 上位 + G★1–G★4） | 同上 `hub='Guild'` `[C]` |
| 特殊许可（Permit，二名） | 228 | 集会所侧，可联机 | 同上 `hub='Permit'` `[C]` |
| 斗技大会（Arena） | 17 | 斗技场规则，独立装备套 | 同上 `hub='Arena'` `[C]` |
| 配信（Event） | 166 | DLC 任务 | 同上 `hub='Event'` `[C]` |

- 村与集会所的**解锁链互相独立**：村推进看村关键任务，集会所推进看 HR 与集会所关键任务（`docs/mechanics/quests.md` §2–§4，`[C]`）。
- 集会所任务有 **HR 门槛**：接取条件写在任务记录的 `Requirement1/Requirement2/ComboRequirement` 三个字节里（`questData_*.ext` 记录偏移 `0x012/0x013/0x014`，枚举含「HR 以上 / 限定武器 / 限定风格 / **限定人数** / 无防具」等 48 个值，`docs/data/romfs-tables.md` §2，`[C]` 字段位置 / `[I]` 枚举明细）。**「我 HR 多少能接哪条」的逐条对照表目前没有解出** ⇒ `[U]`，数据就在这三个字节里。

---

## 2. 怪物血量：村 vs 集会所（本页核心）

### 2.1 已证实的结构

```
实际体力 = 怪物基础体力 base_hp × 任务体力倍率
任务体力倍率 由 任务记录的 HealthTbl 表号 索引（不是写死的百分比）
```

- `base_hp`：`mhgu.db` `monsters.base_hp`（93 只大型全覆盖，`docs/mechanics/monsters.md` §2，`[I]` 第三方 MHGenDatabase 源）。例：鬼蛙 3200、轰龙 5000、骸龙 14000、老山龙 25000。
- `HealthTbl`：任务记录 `Monsters[5]` 数组里每个目标怪 13 B 记录的一个字节（`questData_<7位id>.ext`，记录偏移 `0x05C` 起，每条 `{Id:u16, SubType, AuraType, Restore, HealthTbl, AtkTbl, OtherTbl, Difficulty, Size:u16, SizeTbl, StaminaTbl}`，`docs/data/romfs-tables.md` §2，`[C]` 布局）。

**直接读到的一对样本**（`[B]`，同一只怪鬼蛙 id `0x42`）：

| 任务 | 文件 | EnemyLevel | HealthTbl | Difficulty |
|---|---|---|---|---|
| 村★3「Tusked Tantrum」（制服鬼面猎人） | `questData_0000303.ext` | 0（村） | **12** | 1 |
| 集会所★1「Tackling the Tetsucabra」（鬼蛙的狩猎） | `questData_0010107.ext` | 1（下位） | **17** | 2 |

⇒ 「集会所比村血厚」在数据层的实现方式是：**村任务和集会所任务发不同的 `HealthTbl` 表号**。血量倍率是**按任务固定**的——同一个 `HealthTbl` 下，1 人进任务和 4 人进任务读到的是**同一个表号** `[B]` + `[I]`（任务记录里不存在按人数的字段，全 361 B 布局已闭合，见下）。

### 2.2 「联机怪会变厚吗」——能回答与不能回答的

| 问题 | 回答 | 依据 |
|---|---|---|
| 村任务怪 vs 集会所任务怪，谁厚？ | **集会所厚**（表号更大，方向如此） | 上表 `[B]` |
| 多人进集会所任务，怪会**再**按人数变厚吗？ | **`[U]`** | 任务数据里没有按人数字段 ⇒ 若有，只能是 `main` 里按当前人数的常量/系数；该常量未定位 |
| 倍率具体是多少（集会所是村的几倍）？ | **`[U]`** | `HealthTbl` 是表号，倍率表本体没解出来，见 §5 |

> 对玩家的大白话：本作为「集会所按多人设计数值」——你单机进集会所，面对的是**和 4 人相同的血条**，所以单机打集会所任务天然比打村任务累。这条方向性结论有任务数据支撑 `[B]`/`[I]`；精确的倍率数字 `[U]`。

### 2.3 全体防御率（另一条轴）

任务难度条其实有两条轴：绿色 = 体力倍率、橙色 = **全体防御率**（对玩家伤害的减伤，`docs/mechanics/monsters.md` §2，`[C]`）。它和 `HealthTbl` 是**不同表号**（同记录里还有 `AtkTbl`/`OtherTbl`），倍率数值同样未解 ⇒ `[U]`（`docs/wiki/damage-formula.md` §7.2）。

---

## 3. 猫车（力尽）与任务失败

- **猫车上限写在任务记录里**：偏移 `0x00F` `Faints`（`docs/data/romfs-tables.md` §2，`[C]`）。
- 抽查 3 条（村 101 采集、村 303 鬼蛙、集会所 10107 鬼蛙）均为 **3** `[B]`——即常见的「三猫失败」。是否存在非 3 的任务（如部分高难/斗技场）**未逐条扫描** ⇒ `[I]`。
- 力尽计数是**全队共享**还是按人分别，任务记录无法直接回答；字段只有一个 `Faints`，语义为「全队累计上限」 `[I]`（与「三猫出局」的玩家常识一致，但无代码地址佐证 ⇒ `[U]` 更严谨）。

## 4. 报酬 / 奖励的联机规则

- **任务报酬表**：`mhgu.db` `quest_rewards`（37,370 行 = 任务 × 奖励槽 × 道具 × 概率 × 个数），每条任务一张 `[C]`；`hunting_rewards` 另有 8,044 行剥取/部位破坏/捕获/掉落通道 `[C]`。
- 任务记录里的金钱/HRP：`0x029..0x04C` 一块连续 9 个 s32（契约金 `Fee`、村点数 `VillagePoints`、报酬 `Reward`、副任务报酬、`Clear/Fail/Sub` 点数、`HunterRankPoints` 等，`docs/data/romfs-tables.md` §2，`[C]` 字段位置）。
- **多人是否分薄报酬 / 每人独立抽奖励**：数据层看不出（奖励表是每任务一张，不含人数维度）；按机制常识每人独立结算，但**没有仓库信源** ⇒ `[U]`。

## 5. 待证项与数据位置（给下一位 RE）

| 玩家问题 | 现状 | 数据在哪 |
|---|---|---|
| 联机怪血是不是 ×N？ | `[U]` | ① 任务侧只给 `HealthTbl` 表号；② 倍率表本体是以 **CRC32 为键的资源**（`docs/analysis/monsters/mon-ai-entry.md` §4.4），运行期字段名 `mVitalTblNo_N` @`0x1562a79` 起；③ 资源读入函数 `rEnemyDataTable` @`0x52874`、`rEnemyDtBase` @`0x53ea0`（main 1.4.0 代码地址）；④ 表实体在 `romfs/arc/enemy/emNNN_00.arc` 的 `.edt`/`.dtb`/`.dtt` 成员里（`docs/analysis/monsters/mon-size-calc.md` 资源类名表） |
| 单机进集会所，血量和 4 人一样吗？ | 方向性「一样」 `[I]`（任务记录无按人数字段），精确倍率 `[U]` | 同上；另查 `main` 里按在场人数取系数的点——若有，在怪物生成/初始化路径（消费 `mVitalTblNo` 处）附近 |
| 这条任务我 HR 不够 / 要几人才能接？ | 字段在、枚举未整理 `[I]`→`[U]` | `questData_<id>.ext` `0x012/0x013/0x014`（`Requirement1/2/ComboRequirement`，48 值枚举） |
| 非 3 猫的任务有哪些？ | 未扫描 `[I]` | 同一记录 `0x00F` `Faints`，逐文件扫 1,849 个 `.ext` 即得 |
| 联机奖励分配规则 | `[U]` | 奖励表无人数维度；规则若在代码，查 `netQuestClear` 族函数（`docs/data/class-inventory.tsv`：`nFestaNetwork::netQuestClear*` 于 `0x217a30` 一带） |
| 本地 vs 网络联机差别 | `[U]` | 网络层 `sFestaNetwork` @`0x22ee68`、`nFestaNetwork::netMureEm*` 族（同文件）；玩家层面两入口共用同一任务池 `[C]` |

---

## 6. 官方文本锚点（集会所大厅）

官方简中文本已提取（`MHGU-private/romfs-extract/gmd/`）：

- `table/OnlineMsg_chS.gmd`（86 串）：集会所聊天与系统消息——`CHAT_SYSTEM_MESSAGE_PLAYER_JOINED`「%s加入集会所。」、`CHAT_SYSTEM_MESSAGE_PLAYER_LEAVED`「%s离开集会所。」、`CHAT_SYSTEM_MESSAGE_FRIEND_JOINED`「好友 %s 加入集会所。」等 `[B]`。
- 相关文件还有 `Room_s_chS.gmd`、`QuestMsg_chS.gmd`、`QuestDialog_chS.gmd`、`QuestBox_chS.gmd`（均已解成 `.gmd.json`），任务板/看板娘文案可从这里引 `[B]`。

> 文本侧只能证明「进出集会所 / 联机房间」这套功能与官方中文文案存在；联机细则（掉线、人数上限、任务中 join-in 规则）文本未逐条核 ⇒ `[U]`。

---

## 附：本页用到的数据源

| 数据 | 路径 / 表 | 覆盖 |
|---|---|---|
| 任务总表 | `docs/data/mhgu.db` → `quests`（1,355 行） | hub/type/stars/time_limit/fee/reward/hrp；**无 HP/人数列** |
| 任务↔怪 | `monster_to_quest`（2,305 行） | `unstable`/`hyper` 标志 |
| 任务奖励 | `quest_rewards`（37,370）+ `hunting_rewards`（8,044） | 全奖励槽 |
| 怪物基础体力 | `monsters.base_hp` / `docs/data/json/monsters.json` | 93 只大型 |
| 任务二进制记录 | `romfs/nativeNX/loc/quest/questData/questData_<7id>.ext`（1,849 个，369 B） | 全部战斗参数含 `Faints`/`Requirement`/`Monsters[].HealthTbl` |
| 任务资源链接 | `romfs/nativeNX/loc/quest/questLink/questLink_<id>.qdl`（1,854 个，308 B） | 怪组/报酬表/补给链接 |
| 倍率表本体 | **未定位** ⇒ `[U]` | 预期在 `main`（CRC 键资源）或 `arc/enemy/em*_00.arc` 的 `.edt/.dtb/.dtt` |
