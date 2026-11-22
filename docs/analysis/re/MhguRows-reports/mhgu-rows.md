# MhguRows — GU 攻击行/形状解码扩展到两个新物种

派单: `MHGU/docs/analysis/re/brief-mhgu-rows.md`（阳性对照基准按 2026-11-08 Main 更正: `G:/tmp/SA/hit/em001-move-hits.tsv` + `em001-arms.tsv`）。

**交付物**（本目录报告 + 4 张 TSV）:
- `MHGU/docs/data/gu-attack-rows-em007.tsv`（152 行）/ `gu-hit-shapes-em007.tsv`（125 项）
- `MHGU/docs/data/gu-attack-rows-em011.tsv`（15 行）/ `gu-hit-shapes-em011.tsv`（15 项）
- 工具与中间产物: `G:/tmp/MhguRows/`（rows-build.mjs、em007/em011/em001-arms.tsv、em007/em011-bodydata.tsv、各表 json）

## Confirmed

### 0. 阳性对照（brief 强制，全过）

- **A（arms 逐字节）**: `arm-scan.mjs 0xcf1550 0xd12404 --out` 重跑 em001，`cmp` 与 `G:/tmp/SA/hit/em001-arms.tsv` **逐字节一致**（IDENTICAL）；统计一致: 33709 行反汇编、100 arm sites（95 行号常量）、236 motion 请求、51 个带 arm 的函数 [C]。
- **B（move-hits 逐行）**: `gu-move-hits.mjs --tsv` 重跑 em001，`diff` 与 `G:/tmp/SA/hit/em001-move-hits.tsv` **0 行差异**；43 动作、94 动作-行对、14 处窗口超长 [C]。
- **C（rows-build 全管线 vs 基准表）**: 用本任务统一脚本 `rows-build.mjs` 重跑 em001: "动作-行"对（motion, row_id，含 ≥1000 编码）与基准 94 对**集合完全相等**（0 missing / 0 extra）；共享对上 A/B/dmg/react/attr/hts 六字段 **0 差异**（118 行多 arm-site 拆分行也一致）[C]。→ 三重对照全过，解码器对 em001 成立。
- **阴性对照（两分支互换，brief 强制）**:
  - ≥1000 分支: arm site 0xd09730（motion 7）行常量 1023。正确 = 变体表 em001_04.attackdata[23] = {A8,B300,dmg50,react2,hts1}（基准同值）；错查物种表 = 下标越界（物种表只有 64 行）；错查物种表[23] = {A46,B20,dmg20,react11,hts8}——**字段完全不同** [C]。
  - <1000 分支: arm site 0xcf5f64（motion 4）行常量 19。正确 = 物种表[19] = {A98,B16,dmg10,react1,hts9}（基准同值）；错查变体表[19] = {A44,B112,dmg35,react2,hts0}——**字段完全不同** [C]。
  - 两分支错查结果可区分、正确分支与基准一致 → 行号位真的在读。

### 1. 物种选择与依据

- **em007（角龙 Diablos）= 有变体表**: `em007_00`（66 行）+ `em007_04`（51 行）attackdata（`MHRS-private/kb/gu-attackdata-all.tsv` type=attackdata 0x70bb64ba 条目 [C]）→ 可验 ≥1000 走变体表分支。名字来源: `MHRS-private/kb/gu-quest-monsters.tsv`（em007_00 → Diablos 角龙）+ `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json` [C]。
- **em011（麒麟 Kirin）= 无变体表**: 仅 `em011_00`（13 行 attackdata）[C]。名字来源同上（em011_00 → Kirin 麒麟）。arm/类体区间: `gu-l1-class-names.tsv` 行 uEm011_00（l1_fn 0xd76970, ctor 0xd7011c）+ `gu-class-bodies-20.tsv` 行 em011（body 0xd7011c..0xd782e8）[C]。
- 两者都不在 brief 禁用的 em001/em002 内；骨骼/动作数据齐全（em007 227 / em011 54 条 motion 长度，80/25 行骨骼）[C]。
- **em011 无变体表证明**: `gu-attackdata-all.tsv` 中 em011 的 attackdata 条目全部来自 `em011_00.arc`；`gu-motions-all.tsv` 中 em011 motion variant 也只有 00 [C]。

### 2. 解码结果（em007）

- 类体 0xd35e74..0xd49ee0（`gu-class-bodies-20.tsv` em007 行: body_end=0xd49ee0 = 下一类 em008 ctor）: 20507 行反汇编、**97 arm sites（89 行号常量）、110 motion 请求、40 函数带 arm** → `G:/tmp/MhguRows/em007-arms.tsv` [C]。
- **82 个动作-行对**（106 行 arm-site 拆分行）/ 151 live 表行 / 45 未引用 / 1 dead；变体表分支 66 行被装填（row_id 1000..1050）[C]。例: row_id 1044 → em007_04.attackdata[44]（A90 B18 dmg20 react2 hts21, fn 0xd3ab78 @0xd3ac48）[C]。
- 字段概览 [C]: dmg 0-140；唯一对上 react 分布 {2:39, 31:12, 1:11, 3:11, 49:5, 43/44/46/0 各 1}——出现 em001 没有的 **44/46/49**；elem_bits 只有 0x1/0x0（无属性攻击，符合官方设定）；状态字全部只有 0x40000000（疑似气绝 [I]，GU 状态函数无消费者——gu-hit-port §9）+ 值 30-70（唯一对上 50/82 对），**无任何毒/睡眠**（em007 两表 116 行中 0 行非 0x40000000 状态位）。
- 窗口超长 8 处（`rows-build` 运行输出，含 motion 7 (91f) row 34 [6,105)、motion 2334 (263f) row 1030 [40,10039)）——归属规则 v2 的已知局限，不是数据错误（gu-hit-port §2/§9 同现象）[C]。
- hitsize: em007_00 33 组 55 项（类型 0 球:12 / 1:22 / 2:21），payload 完整覆盖 0xb68；em007_04 26 组（S-A json，交叉验证见下）[C]。
- 形状概览（125 项）[C]: Head_00 x37、Tail_02/04/05 x13 各、Spine_00 x9、Spine_01 x8、L/R_Leg_02 x9 各、Cog x4、world x1；半径 42-4000 cm。**三个超大球（r2000/2500/4000, Spine_01, p0=原点）挂在 dmg=0、react=46/44/43 的行**（row 8/11 物种表、1011/1012 变体表）——吼叫/风压判定体，不是数据错误。
- bodydata（BDD 受击体）31 条 [C]: 区域（flags 低字节）分布 {torso:5, head:3, neck:2, tail:5, L/R-wing-arm:4+4, L/R-leg:4+4}——对称，符合四足角龙；几何合理（R_Arm_02 胶囊 r42、颈链 r55-72、尾胶囊 r42-68、world 锚 r135）。

### 3. 解码结果（em011）

- 类体 0xd7011c..0xd782e8: 8307 行、**16 arm sites（全常量）、43 motion 请求、13 函数带 arm** → `G:/tmp/MhguRows/em011-arms.tsv` [C]。
- **9 个动作-行对** / 13 live 行 / 2 未引用 / 2 dead [C]。
- 字段概览 [C]: dmg 10-70；react 只有 31（9 处）与 1（row 7）；row 5 attr=0x40（雷属性位——麒麟电属性）；窗口 8 fit / 2 span / 2 late（late = motion 516 只有 73 帧，窗口 126/192 起，同 v2 局限）。
- 动作号 1/2（身体撞击）、514/516、1025/1026/1036/1054——全部在 `gu-motions-all.tsv` 有 em011_00 lmt 条目（如 514 = em011_00_2/2 57f、1036 = em011_00_4/12 449f）[C]。1000+k 动作号是 lmt 动作 id 空间，与 attackdata 行号分支无关。
- hitsize: 9 组 15 项（0:4 / 1:6 / 2:5），payload 完整 0x328；关节 Spine_01 x4、Spine_00 x6、R_Arm_02 x2、L_Leg_01 x2、Cog x1；半径 30-80 cm [C]。
- bodydata 17 条 [C]: 区域只有 {torso:6, L-wing-arm:5, R-wing-arm:6}——**麒麟 bodydata 只用 3 个区域，无颈/头/尾/腿区域**（Chin/Tongue/Neck 几何在但区域位仍是 2；Head_00 是 0）。

### 4. 数据源交叉验证（三源一致）

- **源 1 vs 源 2**: 我的 `gu-hits.mjs` 解码（probe romfs 提取字节）vs S-A 全量 json（`G:/tmp/SA/hit/all/`）——em007_00 attackdata 66 行公共字段 0 差异、hitsize 33 组公共字段 0 差异（S-A json 裁剪了 b0b/b1a/b1d/b1e/b1f/p0w/p1w/u6/u10，公共字段全等）[C]。
- **源 2 vs 源 3**: S-A json vs `gu-attackdata-all.tsv` 普查（独立第三脚本）——em007_04.attackdata 47 个 attack kind 行 dmg/react/attr/hts **0 实质差异**（首次 47"差异"全是 `0x0000` vs `0x0` 十六进制格式化，归一化后 0）[C]。
- probe 提取只覆盖 _00（见 Difficulties）；em007_04 表用 S-A json（源 2+3 互证）。
- **hts 越界检查（5 张表）**: 每张 attackdata 的 live 行 hts 最大值 < 该表 hitsize 组数: em007_00 (31<33)、em007_04 (25<26)、em011_00 (7<9)、em001_00 (21<23)、em001_04 (12<13)，**0 越界** [C]。

### 5. 移植对照结论（brief 第 4 点）

- **行格式**: 0x20 B/行与字段位置三物种一致 → **em001 的字段解码规则可以直接套用** em007/em011 [C]。
- **行号分支**: <1000 物种表 / ≥1000 变体表在 em007 实测成立（50 个 1000+ 装填常量全部命中 em007_04 表，无越界）[C]。
- **反应码**: "9 个 react 值"的假设不成立——em007 用了 44/46/49。**44/46 已有映射**（`MHRS-private/kb/gu-rise-react-map.tsv`: 44 → status_13 → EarL 81153、46 → status_15 → EarL 81153，均 [I] 吼叫族，rise_type 16）——**真正未映射的只有 49**（reaction_67，rise_type `-`，tag [U]，"numeric match only with DamageReaction 67 = QuakeIndirect:173145, unverified"）。em007 的 82 个唯一对里 **5 对用 react 49**（动作 531、2326、2327）——移植时这 5 对的 `_DamageType` 无候选，其余 77 对可映射 [C][U for 49]。
- **状态字**: 语义按位解释，不按物种——0x2/0x10000/0x8（毒系）在 em007/em011 完全没有；0x40000000 在 em007 是主流（50/82 对）[C]。
- **属性位**: 0x1（物理）两物种通用；0x40 在 em011 是雷。**Rise 字段映射已建立**: GU attr 位 0x04/0x10/0x40/0x80/0x20 → `EmHitAttackRSData._BaseAttackElement`（置换: 0x04→1 Fire、0x10→3 Water、**0x40→2 Thunder**、0x80→4 Ice、0x20→5 Dragon；无位→0 None）[C，`G:/tmp/SA/hit/sem/mapping.tsv` 行 "attr: element bits"，依据 Enums_Internal.hpp:173539 + 元素链 0x1765a0-0x176628]。即 em011 row 5 → `_BaseAttackElement = 2 (Thunder)`；GU 无逐行属性值，`_BaseAttackElementValue` 沿用克隆源 [U]。
- **shape 类型**: em007 0/1/2 混用（26/51/48），em011 同（4/6/5）——与 em001 相同的三类，无新类型；cond 条件形状（断尾后消失）在 em007 的 Tail_05 组（13 项带 cond）同样出现 [C]。

### 6. ID→对象映射来源清单（brief 验收第 3 条）

| 映射 | 来源 | 级别 |
|---|---|---|
| em007 = Diablos 角龙 | `MHRS-private/kb/gu-quest-monsters.tsv`（em007_00 行，quest 数据）+ `monsterName_chS.gmd.json` | [C] |
| em011 = Kirin 麒麟 | 同上（em011_00 行） | [C] |
| uEm007_00 类体 0xd35e74..0xd49ee0 | `gu-l1-class-names.tsv` 行 uEm007_00（ctor 0xd34c50/l1_fn 0xd35e58/0xd35e74, verdict new_attribution）+ `gu-class-bodies-20.tsv` em007 行 | [C] |
| uEm011_00 类体 0xd7011c..0xd782e8 | `gu-l1-class-names.tsv` 行 uEm011_00（verdict agree）+ `gu-class-bodies-20.tsv` em011 行 | [C] |
| em007_04 = 变体表（1000+k） | `gu-attackdata-all.tsv` em007_04.arc 条目（51 行）+ em007_00.arc 的 arcs 列含 em007_04.arc | [C] |
| 动作号 → lmt 动作 | `gu-motions-all.tsv`（em+variant+bank*256+index → frames/loop） | [C] |
| gu bone id → 骨骼名 | `gu-mod-bones-all.tsv`（em007_00/em011_00 的 bone_id→index） | [C] |
| em007_04 表内容 | S-A `G:/tmp/SA/hit/all/em007_04.json`，与普查 TSV 互证（§4） | [C] |
| bodydata 区域枚举 0-7 | `gu-hit-port.md` §11（GuHurtboxLocate + S-A 对雌火龙核对） | [B]（本任务对 em007 的对称分布是旁证） |

## In progress

（无——全部完成）

## Unknown

- react **49** 对应的 Rise 受击类型（44/46 已映射到 EarL，见 gu-rise-react-map.tsv；49 = reaction_67 无候选，仅数值上撞 DamageReaction 67 = QuakeIndirect，未验证）[U]——影响 em007 的 5 对（动作 531、2326、2327）。
- 0x40000000 状态位的消费者（gu-hit-port §4 已标 [U]）；em007 的 30-70 值是否气绝值待实机验证 [U]。
- 归属规则 v2 对多段处理函数的 8 处（em007）/ 5 处（em011）窗口超长，精确归属未做（S-A GuHitAttribution 同类问题留给后续）[U]。
- em007 的 8 处窗口超长里 motion 2334 (263f) row 1030 [40,10039) 的 B=10039 疑似"常驻"行（如愤怒状态持续判定），语义待查 [U]。
- em011 的 Head_00 bodydata 区域位 0（躯干）而非 6（头）——区域枚举对麒麟的语义收缩未解 [U]。

## Difficulties

- **TSV 序列化 bug（Main 验收发现）**: 首版四张 TSV 的**表头是逗号分隔**（`[header, ...rows].join("\n")` 把 header 数组用 JS 默认逗号连接），数据行却是 tab 分隔 → 任何 TSV 消费者解析失败。修复: `rows-build.mjs` 加 `tsvEsc`（每字段内 `\t`→`\t` 字面量、换行→`\n` 字面量）+ `tsvLine`，表头与数据行都走它。**修复后重生成（未做逗号→tab 后处理）**，验收: 四张文件每行 tab 字段数 = 表头字段数（em007 rows 30/152、shapes 21/125、em011 rows 30/15、shapes 21/15，**0 rows differ**）；em007 反应直方图（唯一对）可直接计算: {2:39, 31:12, 1:11, 3:11, 49:5, 44:1, 46:1, 0:1}，见 §5。
- **修复后阳性对照复跑**（Main 要求）: `arm-scan` 与基线**逐字节一致**（cmp IDENTICAL）；`gu-move-hits` 与基线 **0 行差异**（diff）；rows-build em001 94 对集合相等、六字段 **0 差异** → 序列化修复不改变任何解码数值，生成器确定性成立 [C]。
- **probe-em007/em011 的 romfs 提取只有 _00 的 hit_data**: `probe-em001/em001_00|02|04/` 三套目录都在，但 `probe-em007/enemy/hit_data/` 只有 `em007_00_attackdata/-hitsize`；probe-em011 同（仅 em011_00）。而普查表明确记载 `em007_04.arc` 有 51 行 attackdata。解法: 用 S-A 的全量产物 `G:/tmp/SA/hit/all/em007_04.json`（同一 arc 的解码产物），并用两个独立来源交叉验证（§4 的源 1/2/3 全部 0 差异）。probe 目录布局差异: em001 是 `<variant>/enemy/hit_data`，em007/em011 是 `enemy/hit_data`（无变体层），rows-build 已兼容两种布局。若后续需要 em007_04 的独立字节源，要从 `em007_04.arc` 原件再提一次（本会话未找到现成 arc 文件）。
- **rows-build 首版 row_id 编码 bug**: 输出行的 row_index 写了表内 0 起下标，导致 ≥1000 分支在 TSV 里不可见（variant 行 0 条）。修正: row_id = 装填点常量（1000+k），另加 table_index 列。修正后 em007 变体表 66 行可见，且 em001 阳性对照 C 通过。
- **S-A json 组缺 g 字段**: `loadSAJson` 里 hitsize 组没有 g（组号）字段，首次生成的 shapes TSV group 列为空、与 rows TSV join 全 miss。修正: `g: g.g ?? gi`（按数组下标）。修正后三物种 join 0 missing。
- **bodydata 区域列错认**: census TSV 的 group 列（u16）不是区域；区域 = flags 低字节。首次统计把 group 当区域（em007 出现 L-wing:1/R-wing:8 的不对称）。修正后对称（4+4），与角龙体型吻合。em011 无腿区域的现象在修正后依然存在（是数据本身，不是解析错误）。
- **普查归并吞了 em011**: S-A `census-summary.tsv` 44 行无 em011（em010 → em012 跳过 0xd7011c..0xd782e8），`arms-all.tsv` 里有 99 行 0xd7xxxx 的条目但没有按类体切出。若直接用普查会漏掉 em011 全部装填点。解法: 用 `gu-class-bodies-20.tsv` 的区间自己跑 arm-scan。

## Self-FalsificationCheck

- 试图推翻"em001 规则可直接套用": 用第三源（普查 TSV）对 em007_04 全 47 个 attack 行逐字段比对，0 差异——未推翻，反而加固 [C]。
- 试图推翻"1000+k 编码": 若 ≥1000 是别的语义（如直接行号），em007_04 表 51 行装不下 1050；而 1000+k 全部落在 0..50，且与 hitsize 组数边界自洽——编码成立 [C]。
- 试图推翻"超大球是吼叫判定": r4000 = 40 m 半径不合常理，检查了引用行的 dmg（全 0）与 react（43/44/46 = 咆哮/风压类，em001 的 43 已知 EarL）——自洽，不是解析错误 [B]。
- 阴性对照双向做过（两分支互换），结果可区分 [C]。
- 唯一遗留: em011 bodydata 的区域枚举收缩（无头/尾区域）未解，已在 Unknown 标注 [U]；该点不驱动设计选择（移植时按区域配对 Rise 部位，em011 的区域集是它自己的数据）。

## Difficulties-附：可重跑命令

```
node G:/tmp/MhguRows/rows-build.mjs em001   # 阳性对照 C + em001 TSV
node G:/tmp/MhguRows/rows-build.mjs em007
node G:/tmp/MhguRows/rows-build.mjs em011
node G:/tmp/SA/hit/arm-scan.mjs 0xcf1550 0xd12404 --out G:/tmp/MhguRows/em001-arms.tsv   # 阳性对照 A
node G:/tmp/SA/hit/gu-move-hits.mjs --tsv G:/tmp/MhguRows/em001-move-hits-repro.tsv      # 阳性对照 B
diff G:/tmp/SA/hit/em001-move-hits.tsv G:/tmp/MhguRows/em001-move-hits-repro.tsv
cmp  G:/tmp/SA/hit/em001-arms.tsv G:/tmp/MhguRows/em001-arms-repro.tsv
```

## 交付状态（终版）

- `MHGU/docs/data/gu-attack-rows-em007.tsv`（30 列 × 152 行）、`gu-hit-shapes-em007.tsv`（21 列 × 125 行）、`gu-attack-rows-em011.tsv`（30 列 × 15 行）、`gu-hit-shapes-em011.tsv`（21 列 × 15 行）——全部 tab 分隔，每行字段数与表头一致（0 rows differ），字段内逗号保留原值（p0/p1 坐标、shapes 描述完整）。
- Main 验收交互记录: ①首版表头逗号分隔 bug → 改 `rows-build.mjs` 生成器重生成（未后处理旧文件）；②复跑三重阳性对照全部不变（生成器确定性）；③react 44/46/49 按 `gu-rise-react-map.tsv` 更正（44/46 已映射 EarL，仅 49 [U]，影响 5 对）；④em011 0x40 → `_BaseAttackElement=2 (Thunder)` 已建立映射（sem/mapping.tsv，[C]）。
