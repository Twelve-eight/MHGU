# MHGU 玩家向知识库 · 使用手册

面向「玩家提问 → 给出**有出处**的答案」的工作流。本页回答四件事：

1. [wiki 页索引](#一wiki-页索引) — 46 个页面各自覆盖什么、复核到什么程度。
2. [拿到一个问题后去哪查](#二拿问题先去哪查) — 按问题类型路由到页面 / 文件 / SQL。
3. [mhgu.db 查询方法](#三mhgudb-查询方法) — 连接方式 + 常用 SQL 模板。
4. [覆盖缺口表](#四覆盖缺口表按玩家影响排序) — 哪些玩家问题现在仍答不了、按影响排序。

数据源分四层，每个 wiki 页开头都定义了自己的**出处分级**（`[C]` 双源核对过的 romfs 字节 / main 代码地址 ｜ `[B]` 二进制实测 ｜ `[X]` 双源一致 ｜ `[I]` 推断或单源 ｜ `[W]` wiki 转述 ｜ `[U]` 未确认；以各页 §0 为准，回答时把等级一并带上）：

| 层 | 位置 | 性质 |
|---|---|---|
| 玩家向 wiki 页 | `docs/wiki/*.md`（本目录） | 面向提问的答案页，行级出处 |
| 机制深读页 | `docs/mechanics/*.md` | 系统模型 + 存档位域 + 表结构 |
| 原始数据 | `docs/data/mhgu.db` + `docs/data/json/` | SQLite 镜像（38 张用户表；计入 `sqlite_sequence` 共 39 个表）+ JSON 导出 |
| 官方中文文本 | `MHGU-private/romfs-extract/gmd*/` | chS 官方名/说明 JSON（`gmd/` 385 文件 / 61,941 串 / 0 失败 + `gmd-arc/` resident 119 条），引用格式 `chS/table/<file>.gmd #<index>` 或 `monsterName_chS #i (label)` |
| 动作值 raw | `MHGU-private/romfs-extract/player/` | `wNN/player/hit/pl_weNN_hitdata` 56 B/条 + 16 B 头，字段已解（`wiki/motion-values.md`） |

---

## 一、wiki 页索引

**索引口径**：一行 = 一个实际存在的页面（`docs/wiki/*.md` 全量 46 页；不列计划页，也不留占位行）。「复核状态」取自 `.tmp/reports-mhgu/` 的 `rev-wiki-*.md` / `rev-motion-values.md` 审核报告、`docs/analysis/audit/W4-WIKI.md` §4 的逐页 verdict（`confirmed` / `contradiction` / `stale`）与各页作者报告：

- `PASS` = 审核结论通过（可能余非阻断建议）；
- `已修` = 审核判「需修」，页面已按报告改过（本表逐条回读确认）；
- `复核中` = 审核报告已存在但未给出通过终判（仍标 IN PROGRESS / pending，或只列了确认项）；
- `W4 PASS` = 没有 rev-wiki 报告，改由 `docs/analysis/audit/W4-WIKI.md` §4 从 db/romfs 逐页重算，verdict = `confirmed`；
- `未复核` = 尚无审核报告。

顺序：怪物（名录/栖息/肉质[含两个总表]/状态/愤怒/体力/掉落/弱点速查/小怪/冠级）→ 任务与推进（含 HR 上限、狞猛、配信与二名许可）→ 勋章 → 技能/技能树/装饰珠/风格（含勇气/炼金）/武器（总览→升级树）/动作值/装备（防具→护石来源）/道具（战斗→总表→调合→弹药）/笛旋律 → 地图/村庄/随从猫/联机 → 伤害总表。状态只说明「页面与审核报告是否一致」，不等于全量验证——各页自己的 `[U]` 待补项仍以该页 §0 为准。

| 页 | 中文标题 | 一句话覆盖 | 复核状态 |
|---|---|---|---|
| [monsters-index.md](monsters-index.md) | 怪物总览 | 137 个敌人槽位一次列全：93 大怪 + 36 小怪 + 机偶/机制单元，给 arc 编号、中英名、变体归类与最早出现档次 | 已修（RevIndex：槽 118 改「红龙」、§5 名称勘误 39 行已落；§6/§8 的 387 个 `#emNNN` 死锚点已按目标页实际结构改成页级链接，见 W4-WIKI C8） |
| [monster-habitat.md](monster-habitat.md) | 怪物栖息地与异常状态 | 81 只怪的起始/移动/巢区（`monster_habitat` 303 行）+ 66 只怪施加的异常与 30 种解除道具 | PASS（RevHabitat 35/35；复核期间已按报告改过） |
| [monster-hitzones.md](monster-hitzones.md) | 怪物肉质 | 肉质表在 romfs 的存放位置与逐怪偏移 + 10 只代表怪的 9 列肉质（含愤怒/带电/积雪行） | 已修（RevHitzones：冰/雷 两列已换回；轰龙 2 行 romfs 独有数据仍未标「db 无行」） |
| [hitzones-all-a.md](hitzones-all-a.md) | 大型怪物肉质总表（槽 0–46） | 槽 0–46 逐槽全量肉质行（常态 8 槽 + 愤怒/破坏/带电/积雪等状态组），逐行给字节偏移与 `[C]`/`[X]`/`[B]` 对拍结论 | 复核中（RevHzAllA：8 只抽检逐字节 CONFIRMED，报告无 pending 条目、未写终判；已收 42 只，末节 = 槽 46 岚龙） |
| [hitzones-all-b.md](hitzones-all-b.md) | 全怪物肉质表 B（槽 47–136） | 槽 47–136 的 42 只大型怪全部肉质行（513 行含状态组），逐行给字节偏移与 `[C]`/`[B]`/`[I]`/`[X]` 标记 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 513 行与 448/25/35/3/2 标记全对） |
| [monster-status.md](monster-status.md) | 怪物状态异常 | 91 只大型怪的毒/眠/麻痹/减气/骑乘/爆破阈值、持续时间与陷阱/闪光反应 | 已修（RevStatus 5 项：红黑龙归 `em013_01`、爆破 180/100/2180、70 `[C]`/22 `[I]`；槽 26 野猪王毒初值 romfs 27 ↔ db 30 的差额已在表注写明） |
| [monster-rage-tired.md](monster-rage-tired.md) | 怪物的愤怒与疲惫 | 愤怒/疲惫的触发与持续、对攻防与动作速度的影响、65 只怪的疲惫蓄积表 | 已修（RevRage：状态区间改 `0x73E1` + 110..114、疲惫判定标 `[U]`） |
| [monster-parts-hp.md](monster-parts-hp.md) | 怪物部位与体力 | 基础 HP（`*_dttune +0x38`）与 `em_nando_tbl` 任务倍率、部位破坏耐久、捕获/断尾的可证结论 | 已修（RevPartsHP：12 B 头、二名 +200…+1100、0.35/0.65 改判插值权重） |
| [monster-drops.md](monster-drops.md) | 怪物掉落表 | 各掉落通道（剥取/断尾/捕获/落物/部位破坏 + 任务报酬）的结算次数与概率量级；十只封面怪 LR/HR/G 稀有素材，折算成「每次狩猎的到手率」 | PASS（RevDrops 终判；三轮缺陷已修，无遗留） |
| [monster-weakness-cheatsheet.md](monster-weakness-cheatsheet.md) | 大型怪弱点速查表 | 93 只怪的物理/属性弱点与主部位最大值（db 值 `[I]`，生成器 `tools/wiki-gen/gen-weakness.py` 复现）+ 肉质页的 `[C]/[X]` 去向 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 93 行中 91 行精确复现，槽 40/41 取自带括号的状态行且页内已具名） |
| [small-monsters.md](small-monsters.md) | 小型怪物数据 | 43 个小型单元的基础体力、9 列肉质、异常阈值记录与剥取表 | 已修（RevSmallMon：数值 43/43 全对，7 条 `[B]`/计数/图例断言已改） |
| [monster-size-crowns.md](monster-size-crowns.md) | 怪物体型与冠级 | 体型比例的抽取与 S/B/K 冠级阈值（`SizeTbl` 0–51、83 行按槽） | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 83 行按 idx=slot 0 差异；88–125 冠级刻度需存档样本，页内已标 `[U]`） |
| [quests.md](quests.md) | 任务与星级推进 | 村★1–★10 / 集★1–★7 / G★1–★4 全部关键与紧急任务的时限/报酬/HRP/地图/出现条件 | PASS（RevQuests：13 项改名与 q11130 地图已改；§5 仍余 1 处「红黑龙」） |
| [quests-village-hub.md](quests-village-hub.md) | 村与集会所下位/上位任务全表 | 村★1–★10 + 集★1–★7 的 714 条任务行级表（目标/怪物/地图/时限/报酬/HRP/狞猛标记），生成器 `gen-quests-vh.py` 复现 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 714 行名称/报酬/HRP/romfs 星级 0 差异） |
| [quests-g-rank.md](quests-g-rank.md) | 集会所 G 级关键/紧急任务 | G★1–G★4 的 27 条关键/紧急任务 + 每星收口计数与主线推进顺序 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 27 行星级/时限/报酬/契约金/HRP 0 差异） |
| [quest-requirements.md](quest-requirements.md) | 任务承接条件 | `Requirement1`/`Requirement2`/`ComboRequirement` 的 50 值枚举 + 1,849 条任务的实际取值与逐星级条件 | 复核中（RevQuestReq 报告仍标 IN PROGRESS，枚举已 PASS） |
| [progression-unlocks.md](progression-unlocks.md) | 推进与解锁总表 | 村/集会所/G/特殊许可四条线的主流程、HR 与贡献度/狞猛门槛、22 条追加任务与狩技解锁轨 | 已修（RevProgress：F01–F03 已改；F04/F05 未抽查） |
| [hr-caps.md](hr-caps.md) | HR 上限与等级解放 | HR1–HR12 逐级紧急阶梯、G★4 后解除上限（改由 HRP 累积至 999）、1,355 条任务的 HRP 分布与「每级所需 HRP 无源」的四路否定证据 | 复核中（RevHrCaps 报告已建、标 `Verdict: pending`；`npc_502/520/801` 引文与 1,355 条计数已对过） |
| [hyper-event-quests.md](hyper-event-quests.md) | 狞猛化任务与配信任务 | 165 条狞猛化任务 + 166 条配信任务，逐条星级、报酬金、HRP 与狞猛化怪物 | 复核中（RevHyperEvent：计数与报酬 3 项 PASS，名字/标签项未跑完） |
| [deviants.md](deviants.md) | 二名怪物与许可任务 | 18 只二名怪的 228 条特殊许可任务（等级/星级/目标/地图/报酬/HRP/承接条件） | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 228 条全部解析，reward/HRP 与 db 相等） |
| [medals-guild-card.md](medals-guild-card.md) | 勋章与公会卡片 | 132 条勋章的官方名与条件原文 + 132 bit 位域与存档偏移 | PASS（RevMedals 8/8；4 处小文本已改，含 38 张表与 `§4.1` 引用） |
| [skills.md](skills.md) | 技能全表 | 205 棵技能树的中文名/档位/效果、242 颗装饰珠、65 条复合技能组成 | PASS（RevSkills：205/205、65/65、242/242 全对；英文列与串号注已补正） |
| [skill-trees-full.md](skill-trees-full.md) | 技能树全表（数据表体） | 205 棵树的档位链与各档发动技能（chS 名）、326 条技能的官方说明/英文名/串号、romfs `skt`/`skd` 字节布局 | 已修（RevSkillTrees 复审 PASS：§4.2 uniform 262 = all0 1 + all1 143 + all2 118，行数 205/326 与原始字节一致） |
| [decorations.md](decorations.md) | 装饰珠全表 | 242 颗珠的官方名、孔数、技能点增减、完整制作配方，以及「解锁」只看原珠档位这一结论 | 复核中（RevDecos：字节与 12 行样本检查在跑，verdict pending） |
| [styles-arts.md](styles-arts.md) | 狩猎风格与狩技 | 6 风格的按键差异、14 武器 × 4 风格表、66 狩技官方名与解锁轨、`mPointSP` 参数表 | PASS（RevArts2 六项复检全 PASS；E1「表内格数」措辞待改） |
| [valor-alchemy.md](valor-alchemy.md) | 勇气与炼金风格 | 两风格的槽/状态/SP 规则、逐武器专属动作（`HN_WeaponControlsMsg_chS`）、奇异炼金桶 12 种产物与分档 | 复核中（RevValorAlchemy：已跑 8 组检查当前全 PASS，3 组未完） |
| [weapons-overview.md](weapons-overview.md) | 武器总览 | 14 种武器的官方名、核心机制、LR/HR/G 面板区间与升级树导航 | 已修（RevWeapons：大锤改「空战空中蓄力」、LV9 档位、§2.3 例） |
| [weapon-trees.md](weapon-trees.md) | 武器升级树（终形） | 14 种武器 1,585 条升级树的终形（攻击/会心/属性/斩味/稀有度），由 `tools/wiki-gen/gen-weapon-trees.py` 从 db 生成 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 14 个终形计数与 1,585 全对，生成器输出逐字节相同） |
| [motion-values.md](motion-values.md) | 动作值 | `pl_weNN_hitdata` 的 56 B 记录格式 + 大剑 61 条 / 太刀 85 条全部动作值 | PASS（RevMV：改版后 61/61、85/85、16/16；§0.3 步长已改 ×12） |
| [moves-blademaster-a.md](moves-blademaster-a.md) | 近战动作值（一）：大剑 / 太刀 / 单手剑 / 双剑 | 4 把武器逐条动作值（61/85/74/152 条）+ 招名与按键（镜像 wiki `[W]`；大剑/太刀有锚点，单手剑/双剑全 `[U]`） | 复核中（RevMoves：A 页必检 8 样本与 w11 152/152 PASS；A 的 JSON 对拍未完） |
| [moves-blademaster-b.md](moves-blademaster-b.md) | 近战动作值（二）：大锤 / 长枪 / 铳枪 / 狩猎笛 | 4 把武器 229 条记录的动作值 + 官方招名，铳枪/笛的少数候选归属 `[I]` | 复核中（RevMoves：同批审核在跑，B 页未见结论） |
| [moves-blademaster-c.md](moves-blademaster-c.md) | 近战动作值（三）：斩击斧 / 盾斧 / 操虫棍 | 3 把武器 253 条记录的动作值（115/80/58）+ 官方招名（绑定仅少数签名可辨者 `[I]`，其余 `[U]`）；瓶/精华附加伤害只写有出处者 | 复核中（RevMoves：同批审核在跑，C 页未见结论） |
| [armor-talismans.md](armor-talismans.md) | 防具与护石 | 5,637 件防具的面板/强化档（`asd`/`abd`）+ 护石技能池（`amskl`）与孔数概率（`amslt`） | PASS（RevArmor：表 07 界限已改 −7…−1 / 3–13） |
| [talisman-sources.md](talisman-sources.md) | 护石来源与生成 | 护符 353–356 → `amskl` 8 表 → 技能/点数 → `amslt` 孔数表的整条 roll 链 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 `amskl` 59/0/71/74/56/105/62/94、`amslt` 4×21 行、`amlt` 11×9 全对） |
| [armor-sets.md](armor-sets.md) | 防具系列与套装 | 1,242 个防具系列按等级分组（下位 236 / 上位 471 / G 499 / 二名 36）：五件防御/耐性/孔/技能点与按阈值实际发动的技能 | 复核中（RevArmorSets 报告已建、标 `Verdict: pending`；等级闭合 236/471/499/36 = 1,242 已 PASS） |
| [items-combat.md](items-combat.md) | 战斗道具 | 回复/状态/攻防/陷阱/爆弹/弹药/瓶的数值、调合配方入口与容量 | PASS（RevItems：117 行全对；§5「monsters.md 已订正」的注记仍不成立） |
| [items-table.md](items-table.md) | 道具总表（数据表体） | romfs `itemData.itm` 全量 2,991 条（2,956 有效：2,866 `[C]` + 90 `[B]`）的官方名/携带/买卖价/稀有度/功能标记 | W4 PASS（无 rev-wiki 报告；W4-WIKI §4 复核 2,866 行五列与 `items` 全等） |
| [items-combination.md](items-combination.md) | 调合全配方 | 183 条调合配方（结果 / 两条素材 / 个数 / 成功率），`itemPreData.itp` 与 `mhgu.db.combining` 183/183 全等 | 已修（RevItemsComb 判 FAIL 的计数 12→9 与素材球排行已核；余 4 项标注未抽查） |
| [gunner-ammo.md](gunner-ammo.md) | 弩炮弹药与弓瓶 | 32 种常规弩弹 + 41 种武器内藏弹官方名、装填数字段、后坐/装填/弹道枚举、速射与蹲射、弓 4 段蓄力与 12 种瓶 | 复核中（RevGunner 报告已建、仍标 IN PROGRESS：C5 名称 41/41 PASS，C1–C4/C6 未完） |
| [hunting-horn-songs.md](hunting-horn-songs.md) | 狩猎笛音色与旋律 | 8 音色 × 50 组合 → 25 旋律组，49 条旋律的时长/官方名/效果与逐笛分组 | 已修（RevHorn：§4 WBY 格、`.fmt` 记录序号、狩技名改 `[W]`） |
| [farm-trade-canteen.md](farm-trade-canteen.md) | 农场·交易·食堂 | 交易窗口「增加道具」的 4 地点 / 1,168 行报酬、猫饭食材与酱汁技能、设施强化与容量 | 已修（RevFarm 11 项；`meow_rewards` 样例已核为 G 档 6 行） |
| [maps-gathering.md](maps-gathering.md) | 地图与采集点全表 | 15 张图的区域/营地/秘境 + 984 个采集点位（逐 (area,site) 取各 rank 的最大点位数）、3,231 张掉落表、15,243 行道具（表内合计 100% 全过） | 复核中（RevMaps：图名/闭合总数/样本表检查在跑） |
| [palico-prowler.md](palico-prowler.md) | 随从猫与猎喵 | 8 种支援倾向、57 条支援行动官方文、95 个随从技能、猎喵按键与支援槽/SP | 已修（RevPalico：D1–D6 引用已重排为 G1–G4 来源块） |
| [palico-skills-full.md](palico-skills-full.md) | 随从猫全表（数据表体） | 支援行动 57 条 + 随从技能 95 个（固有 16 + 组技 36 + 其他 43）的官方中文名与效果文 | 复核中（RevPalicoSkills：C1–C6 已逐项确认，报告未写终判；支援 id 顺序 `[I]`） |
| [multiplayer.md](multiplayer.md) | 多人联机 | 集会所任务池计数、每任务 `HealthTbl` 与人数无关的字节证据、待证项 | PASS（RevMulti：两版 FAIL 已修；§5「只含 base_hp」措辞与 `[C]` 范围待收） |
| [damage-formula.md](damage-formula.md) | 伤害计算 | 面板 × 动作值 × 肉质 × 锋利度 × 会心 × 任务修正的完整链条，附 romfs 常量地址 | 已修（RevDamage：1.25/0.75 例址、`0x1624b3c` 去掉误列） |

---

## 二、拿问题先去哪查

按问题关键词路由：

| 问题含 | 首查 | 次查 |
|---|---|---|
| 怎么解锁 / 升星 / HR / 二名 / EX / 狞猛 | `wiki/progression-unlocks.md` §2–§8 | `wiki/quests.md` §3–§6、`wiki/deviants.md`（18 只二名的 228 条许可任务）、`mechanics/quests.md` §4–§8 |
| HR 上限 / 等级解放 / 每级要多少 HRP | `wiki/hr-caps.md` | `wiki/progression-unlocks.md` §6、db `quests.hrp` |
| 关键任务 / 任务报酬 / 哪张图 / 乱入 | `wiki/quests.md` 行级表、`wiki/quests-village-hub.md`（714 条村/集全表）、`wiki/quests-g-rank.md`（G 级 27 条） | `mechanics/quests.md` §2（questId↔`_id`） |
| 这任务我能不能接（HR / 武器 / 风格 / 人数） | `wiki/quest-requirements.md` §2–§7 | `mechanics/quests.md`、db `quests` |
| 狞猛任务有哪些 / 配信（Event）任务 | `wiki/hyper-event-quests.md` §1–§5 | db `monster_to_quest.hyper`、`quests.hub='Event'` |
| 某怪在哪 / 给我上什么异常 / 怎么防吼风震 | `wiki/monster-habitat.md` | `mechanics/monsters.md` §6–§7 |
| 弱点属性 / 肉质 / 打哪疼 | `wiki/monster-weakness-cheatsheet.md`（93 只速查）、`wiki/hitzones-all-a.md`（槽 0–46）、`wiki/hitzones-all-b.md`（槽 47–136）、`wiki/monster-hitzones.md` §3（格式与 10 只样板） | 官方弱点提示 `gmd:table/HN_MonsterListMsg_chS`，db `monster_damage`；romfs `arc/enemy/emNNN_00.arc :: *_dttune` |
| 要打多少异常值 / 持续多久 / 陷阱吃不吃 | `wiki/monster-status.md` | db `monster_status`；romfs `*_dttune` 状态区 |
| 什么时候发怒 / 怒时多疼 / 疲惫多久 | `wiki/monster-rage-tired.md` | romfs `*_dttune` Exhaust/参数区 |
| 这怪多少血 / 部位破坏 / 断尾 / 捕获 | `wiki/monster-parts-hp.md` | `wiki/multiplayer.md` §2、romfs `em_nando_tbl` |
| 大小金冠 / 体型 | `wiki/monster-size-crowns.md` | 存档样本（本仓库尚未收录） |
| 掉落 / 剥取 / 捕获 / 部位破坏素材 | `wiki/monster-drops.md` | db `hunting_rewards`/`quest_rewards` |
| 小怪（速龙/甲虫/草食）打哪、掉什么 | `wiki/small-monsters.md` | romfs `arc/enemy/emsNNN_00.arc :: *_dttune` |
| 技能 / 珠 / 护石 / 防具 | `wiki/skills.md`、`wiki/skill-trees-full.md`（逐树档位与技能说明）、`wiki/decorations.md`、`wiki/armor-talismans.md`、`wiki/armor-sets.md`、`wiki/talisman-sources.md`（护石来源与 roll） | `mechanics/skills-arts.md` §5、`mechanics/equipment.md` §2 |
| 风格 / 狩技 / 某武器动作 | `wiki/styles-arts.md` | `mechanics/skills-arts.md` §6，官方效果文 `gmd:table/hunterArtsData_chS` |
| 勇气 / 炼金怎么玩（槽、状态、炼金桶） | `wiki/valor-alchemy.md` | `gmd:table/HN_WeaponControlsMsg_chS`（`WC_*_skillnote_*`）、`CommonMsg_chS` 风格说明 |
| 武器面板 / 升级树 / 这把要什么素材 | `wiki/weapons-overview.md`、`wiki/weapon-trees.md`（1,585 条终形） | db `weapons`、`docs/data/weapons/*.json` |
| 这一招多少动作值 | `wiki/moves-blademaster-a.md` / `-b` / `-c`（11 把近战逐条）；记录格式见 `wiki/motion-values.md` | romfs `player/wNN/player/hit/`、`table/weaponProcessWNN.wpd` |
| 道具 / 调合 / 弹药 / 容量 | `wiki/items-combat.md`、`wiki/items-table.md`（2,991 条全量）、`wiki/items-combination.md`（183 条配方）、`wiki/gunner-ammo.md`（弩弹/弓瓶/箭种） | `mechanics/systems.md` §1，db `items`/`combining`、`weapons.ammo` |
| 笛子旋律 / 音色组合 / 哪把笛吹什么 | `wiki/hunting-horn-songs.md` | db `horn_melodies`、`gmd:table/fueMusicInfData_chS` |
| 交易 / 猫饭 / 食材 / 点数 | `wiki/farm-trade-canteen.md` | `mechanics/systems.md` §2/§3，db `meow_rewards` |
| 采集点 / 这张图有什么 / 秘境在哪 | `wiki/maps-gathering.md` | db `gathering`/`locations`；官方地图名见 §二 的 GuestHunterMsg 表 |
| 随从猫 / 支援行动 / 猎喵 | `wiki/palico-prowler.md`、`wiki/palico-skills-full.md`（支援行动 57 + 技能 95 全表） | `mechanics/systems.md` §10–§11 |
| 勋章 / 公会卡片 | `wiki/medals-guild-card.md` | `docs/save-layout/`、`docs/analysis/fields/records-128.md` |
| 联机 / 集会所几个人 / 怪会不会变厚 | `wiki/multiplayer.md` | db `quests` 池计数、`mechanics/systems.md` |
| 伤害公式 / 斩味 / 会心 | `wiki/damage-formula.md` | `mechanics/equipment.md` §1；常量见 §4.3/§5.2 |
| 某怪叫什么 / 一共多少怪 | `wiki/monsters-index.md` | `monsterName_chS`、`docs/data/json/monster-slot-map.json` |
| 存档 / 备份 / 位域 / 改存档 | `docs/save-layout/` | `editor-spec/03-quests-monsters-palico.md` |

**命名口径（不设转换要求）**：中文名只要读得通、且指同一对象，就**直接可用**——官方 chS 写法与常见民间叫法（如 勇气 / 英勇、彻甲虫 / 穿甲虫）**都算合格，不因命名判 FAIL，也不做批量改写**；本地化统一留待后续专项。下表给出官方写法与出处，仅用于核对与括注：`MHGU-private/romfs-extract/gmd/`（官方 chS 文本，385 文件 / 61,941 串 / 0 失败；提取器 `tools/mhgu/gmd.mjs`，格式 `docs/reference/formats/gmd.md`），引用格式 `chS/table/<file>.gmd #<index>`；没有官方名的（普通任务名）用 wiki 译名并标 `[W]`。关键文件：`table/itemData_chS`（道具名+说明 5,982 串，索引 **名 = `2 × items._id`，说明 = `2 × items._id + 1`**，三锚点已验）、`table/skillData_chS`（技能 656）、`table/skillTypeData_chS`（技能树 412）、`table/hunterArtsData_chS`（狩技 764，含 D 轨效果文）、`table/armorSeriesData_chS`（防具系列）、`table/weapon00..14MsgData_chS`（武器名）、`table/HN_MonsterListMsg_chS`（弱点提示 220）、`table/HN_BasicControlMsg_chS`（操作/按键 105）、`table/HN_WeaponControlsMsg_chS`（武器操作页的招名与按键，`WC_<武器>_skilltitle_*` / `commandnote_*`）、`table/guestQuestData_chS`（DLC 任务名 462；村/集普通任务名 chS 树无）。

**风格名**：**勇气 / 英勇 两种写法都可用**（官方 chS：英勇，`CommonMsg_chS #181`；`#183` memo 写「英勇槽」、`#185` = 「英勇风格」；`skillData_chS #401/#403` 写「狩技槽、英勇槽和炼金槽」；镜像 `docs/reference/mhxx-wiki/text/2201.txt` 作「勇气」）。**炼金** 两套写法一致（`#182`／`#186` = 炼金风格）。逐武器/机制细节见 `wiki/valor-alchemy.md`。

**官方怪名（第一信源）**：`chS/arc/resident_chS.arc :: GUI/06_msg/monsterName_chS`，268 条带 label（`Lioleia`/`RareLioleia`/`NamedLioleia` 等），JSON 在 `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json`，仓库副本 `docs/data/json/monster-names-chs.json`；金火龙/银火龙在此有正式名（`MonsterDemo_chS` 的 `@` 占位被它覆盖）。引用格式 `monsterName_chS #i (label)`。社区叫法见镜像 `docs/reference/mhxx-wiki/text/1829.txt` 的怪物一览（彻甲虫 / 大怪鸟 / 白电龙 / 天慧龙 等）；官方写法与社区写法**两种都算合格，不设转换要求**。`resident_chS.arc`（119 条）已解包在 `gmd-arc/resident/chS/`，还含其他 GUI 消息表——**判某中文名缺失前先查这里**。

**官方地图名**：`table/MapName_chS` 只是模板占位（两条占位串：一条 `@`、一条日文模板字样），**不是**地图名表；真正的官方地图名在 `table/GuestHunterMsg_chS.gmd`（带 label）：OldForest=古代森林、Desert=旧沙漠、Forest=山林、SnowyMountain=雪山、MistyPeaks=溪流、DesertIsland=孤岛、Swamp=沼泽、Volcano=火山、RuinsField=遗迹平原、VirginForest=原生林、IceSea=冰海、CaveVolcano=地底火山、DosDesert=沙漠、DosJungle=密林、Highland=无人山岭；另 `GC_Title_1_chS` 的 `name1_101`=塔之秘境、`name1_102`=灵峰。**mhgu.db `locations.name_ja` 是日文汉字（渓流/沼地/孤島/闘技場），不要当中文用**——与官方名不一致处（溪流 vs 渓流、孤岛 vs 孤島）以 GMD 为准。**森丘/遗群岭/禁足地/水上斗技场** 4 个图名在 GMD 无官方源，维持仓库写法标 `[I]`（`wiki/quests.md` §1 用键控名 + 排除法，把这 4 个的 `[I]` 口径写清了）。

**怪名锚点与口径**：
- `monsterName_chS` i=0..136 = 官方名（按槽序对应怪物）；i105..111 为占位单位、i133 `Atlal_nest` 为空串。**取怪自身槽位的名字逐字发布，绝不截短**。
- **大型怪保留长名**：i17 大名盾蟹（Daimyo Hermitaur）、i19 将军镰蟹（Shogun Ceanataur）、i20 雪狮子王（Blangonga）、i121 桃毛兽王（Congalala）；短名 盾蟹/镰蟹/雪狮子/桃毛兽 是**小怪**（i88 Hermitaur / i89 Ceanataur / i90 Blango / i136 Conga）。
- **正确短形**（槽位本身就短）：i6 白电、i7 怪鸟（镜像 wiki 作 白电龙 / 大怪鸟，见 `1829.txt`；两种写法都可用）；变形幼冰鲨（= Skagil，槽 100）两边同形。
- **变体怪**（激昂金狮子/怒食恐暴龙/混沌黑蚀龙）槽位只含基础名，名字取 itemData 锚点；红龙 = Crimson Fatalis（i118）。
- **天彗龙 = Valphalk**（`Kanji_Valphalk`，i=91 / slot 132；镜像作「天慧龙」）；天廻龙 = Shagaru Magala（`Kanji_Tenkairyu`）是**不同**怪，勿合并。
- **穿甲虫 = Seltas**（slot 61 主导名：`HN_MonsterListMsg` hint_123/124、`itemData` #2030–2041、`GC_Title_1` name1_548）；镜像 wiki 作「彻甲虫」（`weapon10 #43` / `weapon11 #277` 亦见），两种写法都可用。重甲虫 = Seltas Queen（slot 58）不变。

## 三、mhgu.db 查询方法

`docs/data/mhgu.db`（18MB，38 张用户表 / 计入 `sqlite_sequence` 共 39 个表，SQLite）。连接任选其一：

```bash
# 命令行（本机装了 sqlite3 时最省事，只读打开）
sqlite3 -readonly docs/data/mhgu.db

# bun（本站跑模板用的就是它：自带 bun:sqlite，无需 npm install）
bun -e "const {Database}=require('bun:sqlite'); const db=new Database('docs/data/mhgu.db',{readonly:true}); console.log(db.query('SELECT COUNT(*) AS n FROM quests').get())"

# Node（仓库没有 better-sqlite3 依赖，需先 npm i better-sqlite3）
node -e "const db=require('better-sqlite3')('docs/data/mhgu.db',{readonly:true}); console.log(db.prepare('SELECT COUNT(*) AS n FROM quests').get())"

# Python
python -c "import sqlite3; c=sqlite3.connect('file:docs/data/mhgu.db?mode=ro',uri=True); print(c.execute('SELECT COUNT(*) FROM quests').fetchall())"
```

`docs/data/json/` 是同数据 JSON 导出（`quests.json`/`monsters.json`/`items.json`/`skills.json`/`decorations.json`/`horn_melodies.json` 等），表名↔文件名映射见 `docs/data/README.md`。**注意：`mhgu.db` 与 JSON 都没有 `name_zh` 列——原名/英文名在 `name`，`name_de/_fr/_es/_it/_ja` 是多语列；中文名一律取 GMD 提取（`chS/table/*_chS`、`monsterName_chS`），`locations.name_ja` 是日文汉字不是中文。**

常用 SQL 模板（更多见 `monster-drops.md` §7）：

```sql
-- ① 某素材哪里掉（全通道反查；`items.name` 是英文名，中文名只在 chS GMD 里）
SELECT m.name AS monster, hr.rank, hr.condition, hr.percentage, hr.stack_size
FROM hunting_rewards hr
JOIN items i ON i._id = hr.item_id
JOIN monsters m ON m._id = hr.monster_id
WHERE i.name = 'Lrg Wyvern Gem'
ORDER BY hr.rank, m.name, hr.percentage DESC;

-- ② 某怪出现在哪些任务（`unstable` = 乱入，`hyper` = 狞猛化）
SELECT q.sort_order, q.hub, q.stars, q.name, m2q.unstable, m2q.hyper
FROM monster_to_quest m2q
JOIN quests q ON q._id = m2q.quest_id
JOIN monsters m ON m._id = m2q.monster_id
WHERE m.name = 'Nargacuga'
ORDER BY q.sort_order;

-- ③ 某任务报酬（外键是 `quests._id`；只知道 `sort_order` 时先反查 _id）
SELECT qr.reward_slot, i.name, qr.percentage, qr.stack_size
FROM quest_rewards qr
JOIN items i ON i._id = qr.item_id
WHERE qr.quest_id = (SELECT _id FROM quests WHERE sort_order = 0);

-- ④ 全狞猛化任务清单（同一任务可能登记多只狞猛怪，按 q._id 去重）
SELECT q.sort_order, q.hub, q.stars, q.name
FROM monster_to_quest m2q
JOIN quests q ON q._id = m2q.quest_id
WHERE m2q.hyper = 1
GROUP BY q._id
ORDER BY q.sort_order;

-- ⑤ 某技能树的珠（孔数在 `decorations.num_slots`，点数在 `item_to_skill_tree.point_value`）
SELECT i.name, d.num_slots AS slots, its.point_value
FROM decorations d
JOIN items i ON i._id = d._id
JOIN item_to_skill_tree its ON its.item_id = d._id
JOIN skill_trees st ON st._id = its.skill_tree_id
WHERE st.name LIKE '%Expert%' AND its.point_value > 0
ORDER BY d.num_slots;

-- ⑥ 某怪的状态行肉质（「状态行」= `body_part` 的括号后缀，如 `Head (Enraged)`；没有独立 state 列）
SELECT body_part, cut, impact, shot, fire, water, thunder, ice, dragon, ko
FROM monster_damage
WHERE monster_id = (SELECT _id FROM monsters WHERE name = 'Tigrex')
  AND body_part LIKE '%(%)';
```

`quests` 关键列：`_id`（Kiranico 行号，101–1,120,012；`quest_rewards.quest_id` / `monster_to_quest.quest_id` 的外键）、`sort_order`（0–1,354 的任务顺序号，与游戏内位号空间同构：村/集 1–944、二名 946–1,173、斗技大会 1,288–1,304，见 `mechanics/quests.md` §2）、`hub`、`type`（`0` 普通 / `1` 关键 / `2` 紧急）、`stars`、`goal_type`、`time_limit`（分）、`reward/fee/hrp`、`location_id`（↔ 官方中文名按 §二 的 GuestHunterMsg 表）。`hunting_rewards.condition` 是通道列（`Body Carve` / `Body Gather` / `Tail Carve` / `Break <部位>` / `Capture` / `Shiny` / `Meowster Hunter` / `Mining`·`Insect`·`Neset`＝部位采掘），八通道口径见 `wiki/monster-drops.md` §1。

以上六个模板 2026-11-04 已按本页原样对 `docs/data/mhgu.db` 跑通（6/6），逐条输出与行数见 `docs/analysis/audit/W4-WIKI-FIXES.md` §3；改模板前先用 `pragma table_info(<表>)` 核列名。

---

## 四、覆盖缺口表（按玩家影响排序）

已建问题矩阵见 `/.tmp/reports-mhgu/swe2-kb-coverage.md`（129 题逐条路由）。下表只列**现在仍答不了或只有半截**的问题；已被新页关闭的行按本表既有写法划掉并注明承接页。凡「数值」类缺口，页面上的 `[U]` 就是它。

| 优先级 | 缺口 | 玩家会怎样问 | 现状 / 补齐路径 |
|---|---|---|---|
| ★★★☆☆ | 动作值缺射手三武器 / 记录↔招名无官方键 | 「这一刀比那一刀强多少」 | 近战 11 把已逐条落地（`wiki/motion-values.md` + `moves-blademaster-a/b/c.md`，合计 854 条，动作值 = 记录 `+0x04` `[C]`）；射手 w04/w06/w10 的伤害在弹表，`weaponProcessWNN.wpd` 只给派生顺序 ⇒ 逐招归属仍 `[U]` |
| ★★★☆☆ | 会心乘算点 / 任务级全体防御率 | 「白比蓝强多少」「会心乘在哪条指令上」 | 锋利度与会心的**数值**已定位（`wiki/damage-formula.md` §4.3/§5.2，`.rodata` 表 + 指针数组）；乘算点与全体防御率 `[U]` |
| ★★★☆☆ | 狩技槽消耗 / SP 型名单 | 「这技要攒多久」 | `wiki/styles-arts.md` §8 已给 `hunterArtsData.hta`（191 × 25 B）的 `mPointSP` 与 `mXTimer = 3.5 × mPointSP`；SP 型名单与实际冷却 `[U]` |
| — | ~~槽 0–46 肉质表仍在追加~~ | — | **已关闭**：槽 47–136 由 `wiki/hitzones-all-b.md` 全列（42 只 / 513 行）；槽 0–46 由 `wiki/hitzones-all-a.md` 收到槽 46（42 只，末节 = 槽 46 岚龙），另 5 只（槽 0/3/27/31/44）的 `_00` 正体表在 `wiki/monster-hitzones.md` §3.1–3.5 |
| ★★☆☆☆ | 勇气 / 炼金的数值（槽容量 / 秒数） | 「勇气槽要攒多久」「炼金桶几次一充」 | 机制已由 `wiki/valor-alchemy.md` 从官方文本落地（收刀持续 → 勇气槽 → 勇气状态、炼金桶 12 种产物与分档、SP 强化）；官方只给定性规则，槽容量/时长/消耗速率仓库内无源 ⇒ `[U]`，逐武器按键表亦无源 |
| ★★☆☆☆ | 捕获 HP 阈值 / 大小金冠 | 「多少血能抓」 | `wiki/monster-parts-hp.md` 把 `0xF513A0/A4` 的 0.35/0.65 改判为插值权重（`[I]`），捕获阈值本身 `[U]` |
| ★★☆☆☆ | 任务级 HP 倍率的函数级证据 | 「这怪多少血」 | 表本体已解（`em_nando_tbl` 141 × 32 B，col A 0.1→6.5）且任务只存表号（`wiki/monster-parts-hp.md` §2、`wiki/multiplayer.md` §2）；「col A 就是 HP 倍率」仍缺 `rEnemyNandoData` 的读取函数交叉引用 |
| ★★☆☆☆ | 集会所任务的 HR35–100 门槛来源 | 「我 HR40 能接这条吗」 | `wiki/quest-requirements.md` §7：这些数字不在任务记录里（枚举最大到 HR100，G★4 实际只写 HR9/12/13），出现条件在 main 侧 `[I]` |
| ★★☆☆☆ | 道具绝对数值（回复量 / 爆弹伤害） | 「大桶爆弹炸多少」 | `wiki/items-combat.md` 只有倍率与官方说明文；`cItemBase` 效果分支未解 |
| ★★☆☆☆ | 网络层（进房 / 掉线 / 延迟） | 「联机怎么进房、掉了怎么办」 | `wiki/multiplayer.md` 已覆盖任务侧（每任务 `HealthTbl` 与人数无关、集会所池计数）；进房/掉线规则仍无玩家向文档 |
| ★☆☆☆☆ | 系统设置（语言 / 画面 / 帧率） | 「怎么改按键」 | 只覆盖武器按键与狩技键（`wiki/styles-arts.md` §1.3、`wiki/weapons-overview.md`）；系统层非 RE 范围 |
| — | ~~调合配方~~ | — | **已关闭**：`wiki/items-combination.md`（183 条，`itemPreData.itp` ↔ db 183/183 全等） |
| — | ~~装饰珠制作素材~~ | — | **已关闭**：`wiki/decorations.md`（242 颗的孔数/点数/完整配方；「珠没有独立解锁位」） |
| — | ~~防具系列 / 套装总表~~ | — | **已关闭**：`wiki/armor-sets.md`（1,242 系列；G 499 / 二名 36 逐条） |
| — | ~~地图与采集点~~ | — | **已关闭**：`wiki/maps-gathering.md`（15 图 / 984 点位 / 3,231 表 / 15,243 行，表内合计 100% 全过） |
| — | ~~小型怪肉质/状态/掉落~~ | — | **已关闭**：`wiki/small-monsters.md` 覆盖 43 个小型单元（肉质 8×10 B 起点 0x8C/0x8E、异常 6×u16、hagi 剥取 5 表） |
| — | ~~DLC / Event 任务页~~ | — | **已关闭**：`wiki/hyper-event-quests.md` §5（166 条，7/92/67 难度分档） |
| — | ~~狞猛任务清单~~ | — | **已关闭**：`wiki/hyper-event-quests.md` §1–§4（165 条，逐条报酬与 HRP） |
| — | ~~勋章获得条件~~ | — | **已关闭**：`wiki/medals-guild-card.md`（132 条，官方说明即条件；位域/存档偏移已测绘） |
| — | ~~护石技能池与上限~~ | — | **已关闭**：`wiki/armor-talismans.md` §5.4–§5.5（`amskl` 8 文件 59/0/71/74/56/105/62/94 条、`amslt` 84 行概率） |
| — | ~~大怪肉质/状态阈值单源 [I]~~ | — | **已升级 [C]（逐怪）**：`*_dttune` 肉质/状态与 db 逐字节一致；只有 HP `@0x38` 是固定偏移，肉质/状态偏移随怪变化，逐怪偏移见 `docs/data/json/monster-dttune-index.json`（已产出） |
| — | ~~官方中文名（道具/技能/武器/防具/怪/地图）~~ | — | **已解决**：`romfs-extract/gmd/` 385 文件 + `gmd-arc/monsterName_chS` + `GuestHunterMsg_chS`；名字口径见 §二 |

---

## 附：提问→答案 速查流程

```
玩家问题
  ├─ 问「是什么/怎么解锁/在哪」→ 查 §二 路由表的首查页
  ├─ 问「数值/概率/列表」→ 先查 wiki 页；页上没有就按 §三 SQL 模板跑 mhgu.db
  ├─ 问中文名 → `romfs-extract/gmd*`（引用 chS/table/<file>.gmd #<index> 或 monsterName_chS #i (label)）
  └─ 命中 §四 缺口 → 如实回答「目前无信源」，引用缺口表行给出补齐路径
```

**纪律**：页面不声明「已验证」除非附可复核路径；无源数字标 `[未确认]`/`[U]`；英文镜像转述与 romfs/db 数字冲突时以 romfs/db 为准（`docs/README.md` §约定3）。
