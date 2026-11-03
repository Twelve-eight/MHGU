# W7 — inventory / coverage / batchA 数字修正（W6 复核落地）

范围：`W6-INVENTORY.md` 判为 contradiction / stale 的 11 个可复算缺陷，落在
`docs/analysis/code/coverage/{METER,attr-members,attr-bverify-pilot}.md`、
`docs/analysis/code/inventory/{README,RETILE}.md`、`docs/analysis/code/inventory/bsamples/verdict-14_20.md`、
`docs/analysis/code/batchA-classname-xref.md` 七个文件里。

方法：**先重跑每个缺陷对应的命令/查询，再改文档**；每个新数字都来自本次会话在该机器上的一次运行，
输出贴在下面。改完再跑门与口径，并把两个头条口径原样贴回。没有改任何 TSV、CSV、镜像或工具。

## 0. 门与口径（改完之后）

```
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 34 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): docs/analysis/audit/LINK-DATA-SIDE.md, docs/analysis/audit/LINK-INVENTORY.md, docs/analysis/audit/LINK-MECHANICS-CODE.md
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
note tier A now 25584 functions / 57.7% of instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

```
$ node tools/mhgu/coverage/canonical-metric.mjs
  Tier A verified   25584 functions, 57.7% of instructions
  Tier B conf=A     74 functions, 0.3% of instructions
  canonical total   58.0% (target >= 90%, not met)
  (raw spine tier A would be 26057 functions / 58.1% -- it still carries the label of
   473 functions a recorded review refuted, so it is not the published number)
```

METER 头部那八个门读数字（66.2 / 53.5 / 90.0 / 76.6 / 75.0 / 82.5 / 10.0 / 23.4）与 58.0% 都没动：
本轮只改二级表和历史段，`coverage-report.tsv`、`tiers-merged.csv`、`function-labels.tsv` 一个字节没写。

## 1. 一次跑完全部口径（read-only，可整段复现）

除 §0 两条与 `offset-signature.mjs` / `member-seeds.mjs` / `ctor-vtable.mjs` / `class-from-code.mjs` 之外，
本报告的数字全由一条命令从提交物读出。这条命令随本轮一起提交（`tools/audit/inventory-numbers.mjs`，只读，
ROOT 由自身路径解析，在任意 cwd 下都能跑），理由就是 W6 的 F10：数字不能只活在 scratch 里。

```
$ node tools/audit/inventory-numbers.mjs
== A. channel table rows
attr-prefix.tsv      rows 2140 A 2140 real-label rows 1619 real-label functions 900
attr-uifamily.tsv    rows 2289 A 1772 real-label rows 2289 real-label functions 2289
attr-strings2.tsv    rows 444 A 444 real-label rows 444 real-label functions 444
attr-registrar.tsv   rows 843 A 843 real-label rows 843 real-label functions 843
uifamily A composition {"ctor":429,"slot":1145,"other":198} all {"other":715,"ctor":429,"slot":1145}

== B. A-direct conflicts
A-direct starts 13061 with >=2 labels 346 (2.65%)
top pairs: otomo-ot+ui=203 render-gfx+ui=48 audio+quest=29 item+ui=14 save-data+ui=9 player-pl+weapon-wp=9

== E. hub 0x7bb638
callers 1185 call sites 10268
(unlabelled) 547, render-gfx 184, weapon-wp 130, quest 61, otomo-ot 54, physics-math 51, ui 34, item 33, monster-em 32, audio 23, player-pl 15, online-nex 14, save-data 4, kernel-os 3

== G. bverify pilot vs stringxref
stringxref rows 46/60, class-or-field name 43/60; retile strings non-empty 3: 0x127bb8=amlt, 0x12806c=amskl, 0x1284cc=amslt|ased

== H. batchA prefix remap
rows 771 insns 58818; prefixes 225; labelled 770; in tier A 363, agree 161 (44.4%)
otomo band 147 {"ui":134,"otomo-ot":6,"item":2,"quest":3,"weapon-wp":2}; outside 216 agree 155 (71.8%)

== D. vtable union
files 12, distinct vtable addresses 6095
```

三条单独工具的输出（各自独立跑）：

```
$ node tools/mhgu/coverage/offset-signature.mjs
agreeing pure offsets 1|big: 1343/1549 = 86.7%  CP95 84.9%
agreeing pure offsets 1|small: 2895/3036 = 95.4%  CP95 94.5%
agreeing pure offsets 2+|big: 1385/1390 = 99.6%  CP95 99.2%
agreeing pure offsets 2+|small: 1923/1938 = 99.2%  CP95 98.7%
（合并 1 个 = 4,238/4,585 = 92.4%，同一 CP 公式给下界 91.6%）

$ node tools/mhgu/coverage/member-seeds.mjs | head
xref cross-check: 454/454 qualifying functions have a row, but only 5808/6526 (89%) of their member names are visible to stringxref.tsv
qualifying functions (>=3 member names): 454
already attributed elsewhere: 143
seeds emitted: 7  (A 0, B 7)  new 0  unknown 447  conflicts 1
by label: {"otomo-ot":5,"render-gfx":2}
by source: {"member-vocab":7}
must-fail gate: PASS (11 cases)

$ node tools/mhgu/coverage/class-from-code.mjs | tail -1
# 52692 functions in range; class hits: none=36113 ctor=5560 slot=7636 name=1443 slot-run=1940
```

`ctor-vtable.mjs` 的输出（它会把 `attr-ctor-vtable.tsv` 重写成表头，跑完已 `git checkout --` 还原）：

```
$ node tools/mhgu/coverage/ctor-vtable.mjs
vtables with a single known class: 2373
resolved 30279 pc-relative addresses, 9201 stored to [rN+0], 0 matched a known vtable
wrote G:/omp works/MHGU/docs/analysis/code/inventory/attr-ctor-vtable.tsv
```

## 2. 逐行修正

| # | 文档 | 原文 | 改成 | 依据（本次运行） |
|---:|---|---|---|---|
| 1 | `coverage/METER.md` 通道表四行 | 类前缀表 587 / UI 家族 551 / 字符串词表 423 / 注册器名 162 | **900 / 2,289 / 444 / 843** | `attr-prefix` 2,140 行→1,619 行带真实标签→**900 个函数**；`attr-uifamily` **2,289 行**（A 1,772 / B 517）；`attr-strings2` **444**（全 A）；`attr-registrar` **843**（全 A）。依据列同时写明两种口径（前缀按去重函数、UI 家族按全部行） |
| 2 | 同上 冲突段 | 356 个（2.7%），表 148+37+21+21+21+108 | **346 个（2.65%）**，表重算为 **231 / 48 / 29 / 1 / 37 = 346** | 24 张 `sources.json` 表里 conf=A 且标签非 `unknown`，按起点归并：13,061 个 A-direct 起点里 346 个有 ≥2 标签（344 个两标签 + 1 个四标签 + 1 个十二标签） |
| 3 | 同上 偏移签名表 | 1 个：91.1 / 86.0 / 93.6 | **92.4（91.6）/ 86.7（84.9）/ 95.4（94.5）** | `offset-signature.mjs` 原样输出；2+ 那一行（99.4/99.6/99.2）本来就对，未动。正文里两处 91.1% / 86.0% 同步改成 92.4% / 86.7% |
| 4 | 同上 构造器 vtable 段 | 6,104 个已知 vtable（5,531 带类名）；17 个构造器、5 里对 2、新增 1 | **6,095 个已知 vtable**；**9,201 个存 [rN+0] 站点、命中已知 vtable 0 个**（证据改为「上限是零」，结论仍是"不采用"） | 12 张 `attr-vtable*.tsv` 的证据列按 `vtable 0x…` 去重 = **6,095**（与 METER §静态字面量 同一批地址）；`ctor-vtable.mjs` 现输出 `9201 stored to [rN+0], 0 matched`，输出文件只有表头。`5,531 个带类名` 无法从任何提交物复现（三种合理口径分别是 2,373 = 只有一个已知类的 vtable、3,917 = 任一非 `unknown` 行覆盖的 vtable、3,162 = retile 证据里出现的不同类名个数），已删 |
| 5 | 同上 0x7bb638 段 | 1,185 个调用者；render-gfx 154、weapon-wp 129、quest 54、otomo 54、physics 49、item 33、monster 32、ui 31、audio 23、player 15、online 14、save 3、kernel 3、无标签 591 | 调用者 **1,185**（**10,268 次调用**）；render-gfx **184**、weapon-wp **130**、quest **61**、otomo-ot 54、physics-math **51**、ui **34**、item 33、monster-em 32、audio 23、player-pl 15、online-nex 14、save-data **4**、kernel-os 3、无标签 **547** | `functions-retile.csv.gz` 的 `callees` 列（以竖线分隔）里含 0x7bb638 的行数 1,185、出现次数 10,268，标签取 `tiers-merged.csv`。新分布加总 = 1,185。`18 个 >2,000 条指令（最大 18,767）` 本次也复核为真，未动 |
| 6 | `coverage/attr-members.md` | 9 seeds（1 A, 8 B）、10 个 must-fail、382/454 xref、71%（4,666/6,526）、445 unknown | **7 seeds（0 A, 7 B）**、**11 个 must-fail**、**454/454**、**89%（5,808/6,526）**、447 unknown | `member-seeds.mjs` 原样输出（见 §1）；`attr-members.tsv` 现在 7 行数据（otomo-ot 5、render-gfx 2） |
| 7 | `coverage/attr-bverify-pilot.md` | `stringxref.tsv` 有 0/60；retile `strings` 列 60 行全空；1,737 / 2,420 / 813 工作项 | **46/60**（其中 **43/60** 带类名或字段名，正是文档手测的那 43 个）；retile 列 **3/60** 非空；工作项标为**已完成/作废** | §1 的 G 段。1,737 那条投影来自未提交的 scratch 复现，文档已明确写成"历史、不可从提交物复算、不要再花一波" |
| 8 | `batchA-classname-xref.md` 前缀映射段 | 224 个前缀；769 唯一标签；362 在 Tier A；151 一致（41.7%）；otomo 段外 215 / 145（67.4%） | **225 个前缀**；**770**；**363**；**161（44.4%）**；段外 **216 / 155（71.8%）**；段内 147 保持（ui 134、otomo 6，补上其余 7） | §1 的 H 段。口径写进文档：最长前缀取标签 + `tiers.csv` 里「起点不晚于该函数」的最近区段，只算 tier=A 的行。该口径同时复现原文的 147 / ui 134 / otomo 6 |
| 9 | `inventory/bsamples/verdict-14_20.md` 类表 | none **36,112** | **36,113** | `class-from-code.mjs` 尾行 `none=36113`；同文档结尾段本来就写 36,113 |
| 10 | `inventory/RETILE.md` | 见 `attr-library.md` §findings | 见 **`../coverage/LIBFINGERPRINT.md` §1** | `attr-library.md` 全仓不存在（只有 `attr-library.tsv`）；754 条假阳性的分解（855 = 754 + 101）在 `LIBFINGERPRINT.md` §1 |
| 11 | `inventory/README.md` 文件角色表 | `cov-report.tsv` / `coverage-report.tsv` | 只留 **`coverage-report.tsv`**（注明由 `report.mjs` 写） | `cov-report.tsv` 在仓库与 `git log --all` 里都不存在 |

### 2.1 冲突表为什么按标签对重排

原表五行的 148+37+21+21+21+108 加总确实是 356，但它不是"每个函数只进一格"的划分（148 与 37 是同一形态的两个子桶，
三行 21 又分别对应三种不同通道组合），而 356 本身也已不是当前文件能产生的数。新的五行由标签对直接生成、
一个函数只进一格、加总等于 346：

```
otomo-ot+ui 203 + item+ui 14 + save-data+ui 9 + quest+ui 3 + monster-em+ui 1 + player-pl+ui 1 = 231   UI 壳 vs 主题域
render-gfx+ui                                                                               =  48   渲染 vs UI
audio+quest                                                                                 =  29   音频 vs 任务
player-pl+quest                                                                             =   1   任务 vs 玩家
其余（多为 ≥3 标签并存，含 0x15004c 的 12 标签）                                              =  37
                                                                                             ------
                                                                                              346
```

"任务 vs 玩家"从 21 掉到 1 有直接原因：`attr-prefix` 已经把 `uPlayerQuest` 系按"主题域优先"改判 quest
（证据原文写着 `theme domain wins … the registrar taxonomy already says quest`），这类函数不再产生冲突。
其余几个例子的地址都换成当前表里真实存在的那一行（`0x44c468` uShellOtomo、`0x541cd4` cGUIObjBlendTextureSample、
`0xb64354` rSoundPhysicsJoint::cSoundJointRequestData、`0x3b6790` sQuestSelector、`0x15004c`）。

## 3. 同一缺陷的连带修正（都写进同一批文档，未另开范围）

| 文档 | 原文 | 改成 | 依据 |
|---|---|---|---|
| `coverage/METER.md` `attr-uifamily` 构成段 | "1,772 行：429 ctor + 1,145 slot + 715 其他"（三项和是全部行 2,289，与句首 1,772 自相矛盾） | "2,289 行（conf A 1,772 / B 517）：429 + 1,145 + 715；只看 conf A 的 1,772 行是 429 + 1,145 + **198**" | §1 A 段的 composition 两行 |
| 同上 类族行 | "224 条前缀表" | **225 条** | `classprefix-map.tsv` 225 行、225 个不同前缀 |
| 同上 表后说明 | "2026-11-04 核对过一次，其中三行是旧数字" | 写明**两次**核对、**七行**（三行 + 本轮四行）是旧数字 | 本节 1–5 行 |
| `coverage/attr-members.md` §1 | "110 条记录、**27** 个注册 run" | "110 条记录（**87** 个不同成员名）、**37** 个 run" | `member-offsets.tsv`: 110 行 / 87 名 / **37** 个 `fn` 组；§6 缺陷 2 说旧值是 27 |
| 同上 §4 | "seed file accepted: **9**" + 未标注日期的 26,704 / 25,924 一段 | accepted **7**；旧数标为"当日脊柱下的一次记录（随脊柱变）"，并写明**本节可复现的结论只有 Δ=0** | `member-seeds.mjs` 输出 7；`new 0` |
| 同上 §6 / §8 | 两个缺陷写成"现在仍然复现"，建议 1、2 仍待办 | 两个都标为**已修**（`566c882` 修 add-pc、`fix-member-fn.mjs` 修 `fn` 列；**110/110** 站点落在本行 `fn` 内，37 组，两文件 md5 相同） | 见 §1 与 `git log --oneline -- docs/data/member-offsets.tsv`（8b78500） |
| `coverage/attr-bverify-pilot.md` 难点 2 | "两个字符串来源对 43/60 行都是空的……先修工具再派 agent" | 改为"曾经是空的，已修；46/60 可见，1,737 行工作项作废" | §1 G 段 |
| `inventory/README.md` 坑第 5 条 | "标签冲突…约 2.7%" | "**346** 个函数，**2.65%**" | §1 B 段 |
| 同上 `attr-offsets` 行 | "≥200 条只有 86.0%，合并值 91.1%" | "**86.7%** / **92.4%**" | `offset-signature.mjs` |

## 4. 没有动的（本轮明确不改）

- METER 偏移段里 "38 个大函数（平均 701 条指令、最大 7,406）"：W6 没有测过它，本轮也无法从提交物复算；
  它描述的是人口属性而非精度单元格，本轮没有猜。同一句里的 86.0% / 91.1% 已按 §1 改。
- W6 判 `unverified` 的那些（投票桶 M8、地理留出 M32、LIBFINGERPRINT 的 3,216/16,317/11,857、BA3 的
  2,291/2,076、BS8 的 2,454 类 / 6,582 labelFor）：依赖未提交 scratch，文档已注明来源，本轮不动。
- `attr-vtable.md` 的两块 "denominator: 23885"：W6 判为自带分母、不会被误读，已由后一节取代。
- 任何 TSV / CSV / 镜像或已有工具：本轮只改文档。唯一新增的代码是只读复核脚本
  `tools/audit/inventory-numbers.mjs`（它不改任何文件，只打印上面 §1 的那六段）。

## VERDICT

行	状态	证据
1 METER 通道表四行	fixed	attr-prefix 900 个函数（1,619 行带真实标签）/ attr-uifamily 2,289（A 1,772）/ attr-strings2 444 / attr-registrar 843；§1 A 段
2 METER 冲突 356→346	fixed	13,061 个 A-direct 起点里 346 个有 ≥2 标签 = 2.65%；新表 231+48+29+1+37=346；§1 B 段
3 METER 单偏移单元格	fixed	86.7%（84.9）/ 95.4%（94.5）/ 合并 92.4%（91.6）；2+ 行原样；offset-signature.mjs 输出
4 METER ctor-vtable 6,104→6,095	fixed	12 张 vtable 表去重 6,095；ctor-vtable.mjs「9201 stored, 0 matched」，输出只有表头；不可复现的 5,531 已删
5 METER 0x7bb638 分布	fixed	1,185 调用者 / 10,268 调用；547 无标签、184/130/61/54/51/34/33/32/23/15/14/4/3，加总 1,185
6 attr-members 7 seeds	fixed	member-seeds.mjs：454/454、5,808/6,526（89%）、seeds 7（A 0, B 7）、unknown 447、conflicts 1、must-fail 11、already 143；正表与 §2/§3/§4/§6/§8 同步
7 attr-bverify 46/60	fixed	stringxref 46/60、类名或字段名 43/60、retile strings 3/60（amlt/amskl/amslt|ased）；1,737 行工作项标作废
8 batchA 161/363	fixed	225 前缀、771 行、770 有标签、363 在 Tier A、161 一致 = 44.4%、段外 216/155 = 71.8%、段内 147 复现
9 verdict-14_20 none	fixed	class-from-code.mjs：none=36113，同表 1,443+5,560+7,636+1,940+36,113 = 52,692
10 RETILE 死链	fixed	attr-library.md 不存在；改指 ../coverage/LIBFINGERPRINT.md §1（855=754+101 的分解在该节）
11 README cov-report.tsv	fixed	该文件在仓库与 git log --all 中都不存在；只剩 coverage-report.tsv（report.mjs 的产物）
12 门与口径	fixed	node tools/audit/check.mjs = ALL PASS（含 METER 头部 66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4）；canonical-metric.mjs = 58.0%
