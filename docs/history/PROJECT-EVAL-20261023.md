# MHGU 项目评估报告（2026-10-23）

> 评估范围：只读分析 `G:/omp works/MHGU` 现有文档与工具说明，不做构建、不运行游戏。
> 引用格式：`doc:line`。无法从文档直接证实的判断标注 `[INFERENCE]`。

## 1. 目标 vs 实测状态

三个长期目标见 `HANDOFF.md:11` / `PROGRESS.md:3`：① 游戏代码 90%+ 可解释；② 存档编辑器可解释、可修改每字节；③ 怪物机制全部了解。

| 维度 | 文档声称 | 可复核证据（落盘产物） | 判定 | 依据 |
|---|---|---|---|---|
| 代码 L0 结构清点 | 100% | 23,885 函数 / 5,228,277 指令（函数跨度和）/ 3,201 类；`docs/data/functions.csv.gz` 468KB 在库 | ✅ | code-metrics.md:8-16、HANDOFF.md:19 |
| 代码 L2 角色 | 100% | leaf 6,239 + orchestrator 7,050 + worker 10,596 = 23,885；thunk 1,991 是 leaf 的子集 | ✅ | code-metrics.md:51-57 |
| 代码 L1 高置信层 | Tier A 8,856 函数 / 51.5% 指令，实测精度 94.7% | 10 折留出 1,155 样本上「两预测一致」正确率 94.7% | ✅（仅该子集） | code-metrics.md:115、:126 |
| 代码 90% 目标 | Tier A + Tier B(conf=A) = 52.5% 指令 / 37.3% 函数 | 缺口 37.5pp；Tier B 仍未过半 | ❌ | HANDOFF.md:21、:140 |
| 存档结构级 | `227KB(100%) + 950KB(~85%) ≈ 88%` 猎人块 | 成员层 18 成员全 file 锚定 `0x278..0x3783A`；尾部 C0..C7 尺寸闭合 | 近似达标（尾部 15.7% 为低置信度） | PROGRESS.md:13-15、:23；coverage-map.md:324-340 |
| 存档字段级 | 全块 13–15%；成员层 78% | 两种分母并存，文档未合并 | ❌ | PROGRESS.md:24、:70；coverage-map.md:37、:114 |
| 尾部性质 | 透传缓存 / 宿主残留，不参与读档 | 读侧 18 reader 止于 `0x3783A`；跨档相异 67%；无校验调用 | ✅（定性完成） | coverage-map.md:256-275 |
| 怪物机制（数据侧） | 完整 | `docs/data/mhgu.db` 17.5MB + 20 表 JSON | ✅ | HANDOFF.md:22 |
| 怪物机制（代码侧） | 110 条成员 / 53 派发器全解 / motion 41-of-53 / 137 槽 | `member-offsets.tsv`、`monster-slot-map-137.json` | ✅ 主体（共享 handler 状态未解） | monster-code-map.md:27-32、:58、:69 |
| 怪物数值表 | 阻塞 | `*.emsizetbl` / `*.emyure` 在 romfs，base NCA 缺失 | ❌ 硬边界 | monster-code-map.md:84-87 |
| 编辑器回写 | 回写窗 1,177,760，build 0 错，冒烟通过 | 只有文件级冒烟，无实机读档 | 部分（实机未验） | HANDOFF.md:102-104；PROGRESS.md:82-83 |
| Tier B 裁定吞吐 | 首轮 378 行；pass2 7 片（每片 120 函数） | `.tmp/mhgu/tierB2/` 有 14 片输入，报告只 7 片 | 进行中（50%） | HANDOFF.md:138-141；`.tmp/reports-mhgu/tierB2-slice-02.md` |

**一句话**：结构层（L0/L2、存档成员链、怪物槽表、137 槽）是站得住的资产；**两项长期目标的分母指标都没到**——代码 52.5%（目标 90%）、存档字段级 13–15%。真正的缺口不是「还不知道去哪找」，而是 **Tier B 的直接证据供给不足**（见 §4）。

## 2. 文档一致性：矛盾与过时声明

按「会不会误导规划」排序：C1–C8 与 C17 会**直接**把新会话带到错误结论；C9–C13 是硬边界/契约层面的漂移；C14–C16、C21 是陈旧行与可加性瑕疵；C18–C20 是同一事实的两套表述（需合并，否则会被当成未解问题重查）。

### C1. 95.7% 的 L1 精度仍在总账里被标 ✅
- 旧值：`PROGRESS.md:96`「L1 子系统（直接证据 1,937 函数）留出验证精度 **95.7%** ✅」，同文件 `:97` 全函数口径写 72.8%。
- 正解：`code-metrics.md:29` 明确「早期一度报出 95.7%，那是单次切分 + 未修正 taxonomy，**不可复现**」；10 折重复切分实测 mean **80.8% / min 71.7%**（`code-metrics.md:27`、`:34`）；`HANDOFF.md:133` 亦记「单次切分曾报 95.7%/83.7%，均不可复现，已作废」。
- 影响：总账（README 指向的第一入口，`docs/README.md:3` 链接 PROGRESS）仍给出「该层已达标」的错误结论。

### C2. 自动推断天花板的两个数
- `PROGRESS.md:102`：「自动推断止步 **~84%**」。
- `code-metrics.md:94`：「自动推断的天花板实测 ≈ **80.8%（min 71.7%）**」。
- `PROGRESS.md:97` 括注「字符串种子传播 ~84%」在 code-metrics 里无对应数据（该文件只有 80.8% / 72.8% / 89.7%max）。⇒ 84% 是**无出处数字**。

### C3. 存档「字段级」四个数，三个分母
- `HANDOFF.md:17` 成员层 **~78%**（分母「234KB 里的已标注部分」）；`PROGRESS.md:14` 同层 **~75%**；`PROGRESS.md:24` 同层 **78%**（分母 224,643B）；
- `PROGRESS.md:70` 全猎人块 **~13%**；`coverage-map.md:37` **~156KB（13%）**；`coverage-map.md:114` **≈14%**。
- 矛盾点：同一份 PROGRESS 里 `:14`（75%）与 `:24`（78%）不一致；且「78%」与「13%」并列出现时没有说明分母差 150 倍，外部读者会把 78% 当总进度。

### C4. 结构级覆盖率 88% vs 77%（同一份文档）
- `PROGRESS.md:23`：「`227KB(100%) + 950KB(~85%)` ≈ **88%** 猎人块」。
- `PROGRESS.md:70`：「结构级 **~77%**」。
- 88% 是 `(227,386 + 950,374×0.85)/1,177,760 = 87.9%` 的算术结果，可复核；77% 无推导过程。⇒ `:70` 应删或改。

### C5. PROGRESS D 表五行「agents 进行中」全部已完工
- 陈旧侧：`PROGRESS.md:57`（TailSparse/TailDense）、`:58`（member[14..17]）、`:59`（猫 324B）、`:60`（member#4 残留）、`:61`（写侧描述符）均标「agent 进行中」。
- 完成侧：`docs/reference/SUBAGENT-LEDGER.md:16-22` 逐行 PASS（含 `:19` WriteSideDesc、`:20` Member14to17、`:21` TailDense、`:22` Palico324）；`HANDOFF.md:26` 已把结论写成「结构层基本完成」。
- 影响：D 表是「剩余工作按杠杆」排序表，五行僵尸任务直接扭曲优先级。

### C6. 回写窗：三份文档两种状态
- 已扩展：`PROGRESS.md:82`、`HANDOFF.md:102`（`821,248 → 1,177,760`，夹紧末块 160B）。
- 仍写旧的：`coverage-map.md:23`「`821248..1177759` **永不落盘区**（回写窗口外）」；`coverage-map.md:61`「编辑器回写窗口截断在 821248 是**正确的**」；`DEVELOP.md:243`「导入尾部 356KB 超回写窗不落盘」。
- 影响：`DEVELOP.md` 是契约文档（`:1` 标题「契约文档」），其 known-limitation 会让下一个人重复扩窗工作或错误地禁止写入社交区。

### C7. 137 槽的旧行没删，且与定案节正面冲突
- 旧行：`coverage-map.md:32`「`24372..24502` 274B 怪物击杀计数器 137×u16（**93大+36小+8保留**）」；`:34`「`24778..25250` ~552B」。
- 定案：`coverage-map.md:68-71`（kill `24230`、capture `24504`、volume `24778`+548B）；`:216-236` 专节标题即「**推翻旧的「93大+36小+8保留」**」；`monster-code-map.md:69` 同结论（94 大 + 43 小，无保留槽）。
- **24372 的来源已查明**：`24372 = 24230 + 71×2 = 0x5F34`，即槽 71 的起点，也就是**旧编辑器第二循环（i=71..92）的起点**（`DEVELOP.md:470-471`：旧起点 24454/24728/25226 错位，正确值 24372/24646/25062）。⇒ 该表行是两代旧逻辑的残留，不是笔误。
- 同一文件内 kill 起点差 142 字节、槽布局结论相反，属**同页互斥**。

### C8. member#4 的字段数与跨度三套值
- `DEVELOP.md:208`：「char_off `0x2C0B..0x59AC`（**159 字段**、**0x2DA1** 字节）」。
- 正解：`coverage-map.md:241-253` 修正为内层 **12,955B**（表记 12,951B，少算 4B）；`docs/README.md`（`member4-file-layout.txt` 条目）写「**134 行**，内层真实跨度 12,955B」；`DEVELOP.md:297` 自己也写「权威表 159 行中**只有前 134 行**是真实 reader 调用」。
- 即 DEVELOP 同一文件内 `:208` 与 `:297` 矛盾；另有更旧的 `.tmp/reports-mhgu/ROUND-SUMMARY.md:14`「146 字段已提取」。
- 影响：任何按 159 行累加 file_off 的工具都会漂移（这正是 4B 漂移争议的同源问题，`HANDOFF.md:181`）。

### C9. romfs base NCA 的大小有三个版本
- `monster-code-map.md:87`「约 **12.3 GB**」；`HANDOFF.md:123`「~12.3GB 不在本机」。
- `DEVELOP.md:49`「base 在 **9.1 GB** `98abd400…nca`」；`DEVELOP.md:304`「约 **10.8GB**」。
- 影响：这是唯一的硬边界，采购/搬运数字必须唯一；三个数意味着没人真正核过 `98abd400` 的 NCA header（`.tmp/mhgu/extract/98abd400.head.bin` 存在，说明只取到头部）。

### C10. 槽表文件名：两个文件被当成一个
- `HANDOFF.md:63` 写 `em-units.py`/`counter-slots*.py` 产出「137 槽权威表 → `docs/data/json/monster-slot-map.json`」。
- 实际仓库同时有 `monster-slot-map.json` 与 `monster-slot-map-137.json`（目录清单），且 `coverage-map.md:236-237` 说明前者只是「槽 58/61 标签已修」的旧表、**新增**的 137 行权威表是 `monster-slot-map-137.json`；`tools/mhgu/README.md` 产出表同样指向 `monster-slot-map-137.json`。
- 影响：下游（编辑器/查看器/报告）可能读到旧表。`HANDOFF.md:63` 是接手指令，属高危笔误。

### C11. 尾部定性：✅ 与「中-高推断」并存
- `HANDOFF.md:18` 判定「**✅（定性完成）**」；`PROGRESS.md:18`「关键定性」。
- `coverage-map.md:393` 对同一结论标「**[INFERENCE，中-高]** 尾段主体是某次保存留下的宿主/模拟器进程内存残留」。
- 不是结论冲突，是**置信度标签冲突**——「无校验、不入读档路径」是硬证据，「宿主内存残留」是推断。对外承诺时应拆成两句。

### C12. 派发纪律：append 间隔 200 vs 30
- `SUBAGENT-LEDGER.md:31`「每 **200** 函数 append 落盘」。
- `HANDOFF.md:193`「**每 30 个** append 落盘」；`DEVLOG.md:434`「必须『每 30 个 append 落盘』」。
- 影响：下次照 ledger 派发会丢掉更多半成品（499 场景下的实际损失）。

### C13. 632B 头该不该做，两份文档结论相反
- 列为杠杆：`PROGRESS.md:63`「632B 头字段测绘（0x30..0x277）… 头部字段级 15%→60%」。
- 判为低价值：`coverage-map.md:306`「该区字段级已到 ~15%；剩余散点字段价值低（且该区不入读档路径）」；`:320-322` 已把头部性质定案为「写侧 memcpy 运行时对象、读侧整块丢弃」。
- 影响：这条任务被排进「剩余工作」第 7 位，实际收益近似 0。

### C14. 覆盖率记分牌页内新旧并存（无 superseded 标记）
- `coverage-map.md:36-39` 仍写「完全未知 ~950KB（80%）」；`:114-116` 写「完全未测绘 967KB（82%）」。
- 但同一文件后面 `:324-340` 已把尾段切成 C0..C7（尺寸闭合 653,472B）、`:360-374` 给了逐区等值率。
- 影响：README 把 coverage-map 定为「权威布局」(`docs/README.md:17`)，读者读到 1/3 处就会得到「80% 未知」的错误印象。**该文件已变成追加式日志，不是记分牌**。

### C15. 52.5% 快照落后于磁盘上的 pass2 报告
- `HANDOFF.md:140`「A + B(conf=A) = 52.5% 指令 / 37.3% 函数」。
- 磁盘现状：`.tmp/mhgu/tierB2/` 有 slice-01..14，`.tmp/reports-mhgu/` + `docs/analysis/code/tierb-pass2/` 各有 7 份报告（02/04/06/07/08/09/10）；仅 slice-02 自报「conf A 15、B 70、C 35」（`.tmp/reports-mhgu/tierB2-slice-02.md` 汇总节）。
- 反推：52.5%−51.5% = **+1.0pp ≈ +52,300 指令**，函数 +0.2pp ≈ **+53 个**（`code-metrics.md:126` 与 `HANDOFF.md:21` 相减）；若 7 片各产 ~15 个 A，应有 ~105 个 A。⇒ 该数是在 pass2 **未跑完/未全并入**时取的 [INFERENCE]。需重跑复算（见 §5 第 1 项）。

### C16. 表格可加性（次要）
- `code-metrics.md:51-57` 的 L2 四类相加 = 25,876 > 23,885；原因是 thunk（≤4 指令且无 BL）**被 leaf 包含**，文档未写明，容易被当成划分错误或直接引用错分母。
- `PROGRESS.md:24` 的成员层明细相加 `9,543+76+12,955+115,072+86,997 = 224,643`，与文中「227,386」差 2,743B（未说明余量）；同段又写「≈175KB / 1,178KB ≈ 15%」，而 `HANDOFF.md:17` 用「234KB」作分母——**234KB 不是猎人块里的任何一段**。

### C17. 「90% 达标」有三个互不等价的定义
- `code-metrics.md:106`（§6 验收口径）：批次 A+B+C 完成后，用「留出 20% 人工标注」测**全函数子系统正确率** ≥90%。
- `code-metrics.md:153-154`（§8）：达标 = **Tier A + Tier B conf=A**，分母仍是 23,885 函数 / 5,228,277 指令（指令、函数双口径，且只算 A）。
- `HANDOFF.md:141`：目标「A + confA ≥ **90% 指令**」——只提指令，不提函数。
- 三者对应的工量相差数倍（§4.1 的算术表明「只算 A」这一种不可达）。规划前必须先选定一个，否则「还差多少」无法回答。

### C18. 274B 计数器的归属：137 无表头 vs 135+4B 头
- `DEVELOP.md`（「重大修正：obj+0x72C/+0x83E 是怪物统计」段）同时写了两句互斥的话：表格写「`0x5EA2..0x5FB4`（274B）| **137×u16**」，正文写「`274 = 4 + 135×2`（**4B 头 + 135 槽**）」。274B 既可以是 137×2，也可以是 4+135×2，但不可能「有 4B 头且 137 槽」。
- `coverage-map.md:241-253`：member#4 内层到 `0x5EA6`（12,955B），计数器**无表头**、137×u16，dirty 档 `vol_only=0` 定案。
- 实际功能一致：DEVELOP 自己也算「击杀 `24230`(`0x5EA6`) = obj+0x72C + 4」，两者都落在 `0x5EA6`。分歧只是 `0x5EA2..0x5EA5` 这 4B 归 member#4 尾还是归计数器头。文档没点破这一点，容易被当成新问题再查一遍。

### C19. `cmp #384` 的两种解读：384bit vs 544bit
- `DEVELOP.md`（288B 族节）：「`cmp r4,#384` ⇒ lane 位宽 **384bit = 48B**；68B 族 = 1 lane + 20B 尾」。
- `coverage-map.md:316`：「68B 位图族 … **544 bit/槽（非 384——`cmp r4,#384` 是迭代上限）**」。
- 同一指令、相反结论，且两边都把它当证据。这正是 `tools/mhgu/README.md` 坑 5（「`cmp #N` 不是位宽」）——说明该坑在文档层仍在复发。

### C20. MonsterForm 覆盖度：71/93 vs 137
- `DEVELOP.md:406`：「真实功能缺口：容量 137 条，编辑器只暴露 **71** 条（`for i<71`，数组 93 个名字但循环 71）」。
- `coverage-map.md:237`、`HANDOFF.md:103`：名字表 129 → **137**、双循环合并为单循环。
- 两代编辑器状态并存；按 DEVELOP 读会以为还差 66 条要补。

### C21. 套装预设区 5430 vs 5440（小）
- `coverage-map.md:29`：`0x208CE..0x21E03` = **5430B**，「40×136B」。
- `coverage-map.md:104`：`0x208CE..0x21E0E` = **5440**。
- 40×136 = 5440 才自洽；5430 少 10B。属可加性瑕疵。

## 3. 方法风险

### R1. 循环论证已经发生过一次，其产物还留在 `docs/data/`
`code-metrics.md:143-150` 记录根因：首批 14 代理只拿到 `callee_label_votes`，而票数来自 Tier A 的传播标签，「用它去裁定 Tier B，等于用 Tier A 的结论验证 Tier A」。后果：378 行里 `quest` 占 222（`code-metrics.md:144`）。
**未清理**：`docs/data/tierb-labels.csv`（379 行 = 表头 + 378 行）逐行 `src=tierB-slice-03.md`，前 9 行的 conf 全是 B/C（`:2-9`），即这 378 行就是被判定为污染的批次。它现在摆在 `docs/data/`（数据目录）里，与 `functions.csv.gz`、`class-inventory.tsv` 同级，没有任何「作废」标记。

### R2. 单次切分指标仍有回流渠道
`validate-labels.mjs` / `validate-addr.mjs` 仍在工具清单里，只标了「单次切分/地址局部性对照」（`tools/mhgu/README.md` 产出表）。纪律写在 `tools/mhgu/README.md`（「单次切分不可引用」）和 `code-metrics.md:29`，但 `PROGRESS.md:96` 证明纪律没落到总账。⇒ 风险不是方法错，而是**指标有两条出口，只有一条设了闸**。

### R3. 94.7% 的外推没有验证
94.7% 是在「10 折留出、共 1,450 个被扣留字符串种子」上测的（`code-metrics.md:110-118`），样本是**有字符串的函数**；但结论被写成 8,856 个 Tier A 函数的可信精度（`code-metrics.md:126`、`HANDOFF.md:20`）。Tier A 里占多数的「地址局部性一致但无字符串」函数，其正确率**没有独立测量**。领域常识是「有字符串的函数更好判」，因此 94.7% 对 Tier A 整体是乐观上界 [INFERENCE]。

### R4. 低置信度被并入覆盖分子
尾部结构级 85%（`PROGRESS.md:15`）里含 `0xAFB0E..0xC8535`（100,903B）与 `0xCE98D..0xDA604`（48,247B）两段「**无帧证据**、置信度低」（`coverage-map.md` 容器边界表节）。合计 149,150B = 尾部 950,374B 的 **15.7%**。把它们按「已知」计入，88% 这个数就带 1.5pp 的水分。文档自己在 `PROGRESS.md:15` 括号里承认了，但汇总式（`:23`）没有扣。

### R5. 4B 偏移用单档单不变量仲裁
member#4 内层跨度 12,951 vs 12,955，最终靠 **dirty 档 `vol_only=0`** 定案（`coverage-map.md:239-253`）：假设「有体型记录 ⇒ 必然猎过该怪」。这是一条领域不变量 + **一个存档**（dirty 猎人B）的决定性判据；clean 档只作旁证（vol_only 9 vs 22）。若该档玩家用「尺寸记录」做过非常规操作，结论会翻转。
**加重**：该偏移直接决定编辑器 kill/capture/volume 三个写点（`coverage-map.md:242`），错 4B 就是错 137 个槽的整段。

### R6. 领域假设当代码证据用
137 槽布局的三重验证之一是小怪不可捕获（`coverage-map.md:229-232`：旧布局在槽 112/114/120/123/124/128 出现非零捕获 ⇒ 违反）。这条在 MHGU 机制上成立，但它是**游戏机制假设**，不是反汇编证据；另外两重（静态表 `0x1597EA4`、尺寸闭合到 `0x62EE`）才是硬证据。文档把三者并列成「三重独立验证」，权重其实不等。

### R7. 多处「完成」缺运行时证据
- 编辑器回写窗扩展：只做了「marker@0xC9000 单块 512B 写入、文件长度不变」的**文件级冒烟**（`PROGRESS.md:82`），实机读档仍是「唯一未验环节」（`HANDOFF.md:104`、`PROGRESS.md:83`、`HANDOFF.md:177`）。
- `MonsterForm` 137 槽显示：改了布局但未实机确认（`HANDOFF.md:178`）。
- 任务解锁修复（`seen|=cleared`，501 矛盾位收敛）：`DEVELOP.md` 记「待实机验证」。
- V7 道具箱补丁：实机只到「patch 123 行全应用无 ARM 异常」（`DEVELOP.md:192`），「开箱翻页看 8 个 marker、页数=30」仍交由用户视觉确认（`DEVELOP.md:193`）。
⇒ 这批结论都是**静态正确**，不是**行为已被证明**。规划时不能把编辑器算作「已交付」。

### R8. 度量管线不可由 git 重建
`coverage-final.py` 读 `.tmp/mhgu/inventory/tiers.csv` 与 `.tmp/reports-mhgu/tierB*-slice-*.md`（源码前 20 行即写明）。实测：
- `.tmp/mhgu/inventory/tiers.csv` 23,886 行（表头 + 23,885 函数）**只在工作区根的 `.tmp`**，不在 repo；
- `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` 同样只在 `.tmp`；
- `tools/mhgu/README.md` 开篇即声明「**输入不在 repo 内**」；
- `.tmp` 的定位是「可再生中间产物」「会被清理」（`HANDOFF.md:194`、`DEVELOP.md:42`）。
⇒ 换机器或 `.tmp` 被清后，**52.5% 这个数字没有任何办法从 repo 复现**；能复现的只有 L0（`functions.csv.gz` 在库）。

### R9. 两条汇合路径语义不同
- `tools/mhgu/tierb-merge.py`：按 vaddr 去重且**后者覆盖前者**（`seen[r[0]]=r`），只扫 `.tmp/reports-mhgu/tierB-slice-*.md`，产出 CSV。
- `tools/mhgu/coverage-final.py`：扫 `tierB2-slice-*.md` **和** `tierB-slice-*.md`，按 **conf 等级最高者**去重（rank A>B>C），且只统计 `tiers.csv` 里存在的 vaddr。
⇒ 同一批报告，两条路径会给不同结果；CSV 与 headline 之间没有一致性校验。docs 里的 CSV 是前者产物（378 行），headline 是后者产物。

### R10. 工具清单与磁盘不一致
`tools/mhgu/README.md` 产出表未列：`state-motion3.mjs`、`vtable-crc.mjs`、`mon/mon-fn.py`、`mon/mon-classes.py`（均在 `MHGU/tools/mhgu/` 下）。`HANDOFF.md:57` 提到的 `agreement-tier.mjs`/`tiers-all.mjs` 反而没写进 README。⇒ 下一个会话要么重写脚本（重复劳动），要么误用旧版（`state-motion2.mjs` vs `state-motion3.mjs`）。

### R11. 历史上三类事故说明证据链脆弱
- 坐标整体偏移 **0x550** 污染 5 份文档（`coverage-map.md:310`：`records-128.md`/`fam-small.md`/`fam-288.md`/`member4-semantics.md`/`followup-dump.txt`），事后只能加警示横幅；
- `arm32.mjs` 的 `disasm(vaddr, count)` 参数语义误解导致 187MB 输出 + VM 重置（`DEVELOP.md:299-300`）；
- V7 补丁误用 vaddr 当 flat 偏移，酿成 **28 处误写**（`DEVELOP.md` V7 节「30 内联容量 … **勿用 vaddr**——曾酿成 28 处误写 P0」）。
⇒ 方法上必须坚持**闭合校验**（尺寸相加=区间、边界首尾相接、语义不变量），这是本项目唯一真正有效的防错手段（`coverage-map.md:326` 的尺寸闭合、`:241` 的边界衔接都是正面例子）。

### R12. 「分配率 vs 正确率」的教训只写进了一份文档
`code-metrics.md:133` 明确「不要再用 99.3% 已分配 / 99.9% 指令加权当成果」，但 `PROGRESS.md:23` 的「结构级 88%」本质是同一类**分配式指标**（能说出属于哪类容器），且含 R4 的低置信段。两个指标名字不同、性质相同，纪律没有推广。

### R13. 「不存在反射表」的负结论建立在易假阴性的扫描方式上
`DEVELOP.md`（「名字池的真实性质」节）记：对 `rabbitNo`/`cTrialArts`/`mGuild[0..2]`/`mOld[0]` 等 7 个字符串地址做「全 `.text` ldr-literal 扫描，**0 命中** ⇒ 代码不直接引用这些字符串，不存在 `(name, ptr)` 反射表」。
但本项目已确认字符串引用走 **pc 相对 bias**（`HANDOFF.md:33-35`、`monster-code-map.md:6-19`、`tools/mhgu/README.md` 坑 3）：字面量池里存的是 bias，不是字符串地址，因此该扫描**注定 0 命中**，不能支撑「无反射表」的结论。
结论本身可能仍然正确（mSAVE 用连续描述符流，`DEVELOP.md` 已给出 152 串首尾相接的证据），但**论证方式与已知坑冲突**，属「用不可靠的负结果去封一条路」[INFERENCE]。

## 4. 瓶颈

### 4.1 代码 90%：瓶颈是「直接证据供给」，不是代理吞吐

先把算术摆出来（全部输入取自 `code-metrics.md:126-128` 与 `HANDOFF.md:21`，除法与百分比为本文计算）：

| 项 | 值 | 来源 |
|---|---|---|
| 分母（函数跨度和） | 5,228,277 指令 / 23,885 函数 | code-metrics.md:8 |
| Tier A | 2,690,231 指令（51.5%）/ 8,856 函数 | code-metrics.md:126 |
| Tier B | 2,533,932 指令（48.5%）/ 14,863 函数 | code-metrics.md:127 |
| 当前 A + confA | 52.5% 指令 / 37.3% 函数 | HANDOFF.md:21、:140 |
| 90% 目标所需指令 | 4,705,449 | 5,228,277 × 0.9 |
| 尚需从 Tier B 取得 | **2,015,218 指令 = Tier B 指令的 79.5%** | 相减 |
| 已观测 conf=A 增量 | ≈52,300 指令（1.0pp）/ 7 片 | 52.5% − 51.5% |
| 单片产率 | ≈7,470 指令 conf=A | 52,300 / 7 |

三个结论：
1. **按 7 片 840 函数的现产率**，补 2.02M 指令需要 **≈270 片 ≈ 32,400 个函数**，是 Tier B 总函数数的 2.2 倍 ⇒ 按现口径**不可达** [INFERENCE，算术]。
2. **若限定 124 片（14,863/120）把 Tier B 全裁完**，每片需产 16,250 指令 conf=A，**是现产率的 2.2 倍**；而 pass2 按 insns 降序切，后段函数更小，产率只会更低 ⇒ 同样不可达 [INFERENCE]。
3. 函数口径更糟：90% 函数 = 21,497，现有 8,909（37.3%），需 **+12,588 个 conf=A 函数**；按每片 ~7.5 个 A 计 ≈ **1,680 片** [INFERENCE]。

瓶颈的物理位置在**证据**：唯一带汇总的 slice-02 里，120 个函数只有 **15 个拿到 conf=A**，其余靠票数（`.tmp/reports-mhgu/tierB2-slice-02.md` 汇总：A 15 / B 70 / C 35；A 级证据「全部来自字符串」）。而 `HANDOFF.md:141` 的计划「top 2,400 覆盖 Tier B 指令 ~70%」讲的是**被裁定的指令占比**，不是**被 conf=A 覆盖的指令占比**——两者被混用了，这是当前路线上最大的规划错觉。

⇒ 到 90% 只有三条路，且都必须先做：(a) 把验收口径从「只算 conf=A」改为「conf=A ∪ 双人复核一致的 conf=B」；(b) 用批次 A/C（类名 xref、vtable→类）把大量 B 升级成 A，提高 A 率；(c) 明确把库代码（MT Framework / nn / NEX）整块归类，压缩「需要逐函数裁定」的分母。

### 4.2 Tier B 剩余体量（可交给代理的部分）

| 口径 | 已完成 | 剩余 |
|---|---|---|
| 函数计 | 7 片 × 120 = 840（Tier B 的 5.7%） | **14,023 函数 ≈ 117 片** |
| 指令计（pass2 规划） | 14 片 × 120 = 1,680 ≈ Tier B 指令 55–62% | 13,183 函数 ≈ 38% 指令 ≈ 963K 指令 [INFERENCE：由 code-metrics.md:156「top 1,200 覆盖 ~55%」线性外推] |
| 实际报告落盘 | 7/14 片（`docs/analysis/code/tierb-pass2/`） | 7 片（01/03/05/11–14，输入已在 `.tmp/mhgu/tierB2/`） |

注意 `HANDOFF.md:141` 写「top 2,400」，`code-metrics.md:156` 写「top 1,200」，两个计划数并存；实测切片是 14 片 × 120 = **1,680**。三份文档三个数。

### 4.3 romfs 边界（唯一硬阻塞）

- 现象：`main` 的 base romfs 载体（XCI 内 `98abd4…nca`）不在本机；已解的 `0eb59f…nca` 是 BKTR 补丁 NCA，`hactool` 报 `cannot save BKTR section without base romfs`（`monster-code-map.md:84-87`、`DEVELOP.md:303`）。
- 阻塞内容：`*.emsizetbl` / `*.emyure`（体型、三档冠阈值、尺寸浮动分布，`monster-code-map.md:75-81`）、`itemData.itm`（道具名/上限/图标，`DEVELOP.md` 知识库表）、`questData`（任务名/前置，`DEVELOP.md:304` 明确「非关键路径」）。
- 三个体积数字（9.1/10.8/12.3GB，见 C9）说明连 base 都只探到头部（`.tmp/mhgu/extract/98abd400.head.bin` 存在）。
- 缓解：任务/怪物/技能数值已可由 `mhgu.db` + 交叉验证覆盖（`HANDOFF.md:22`、`PROGRESS.md:103`）；**不可替代**的只有体型/冠阈值。

### 4.4 编辑器运行时验证（唯一未验环节）

- 扩窗后「社交区写一处 → 进游戏读档」未做（`HANDOFF.md:104`、`PROGRESS.md:83`）；137 槽显示未实机（`HANDOFF.md:178`）。
- **新增风险**：扩窗前编辑器「本就不该碰在线数据」（`coverage-map.md:61`），扩窗后**具备写该区的能力，却没有任何字段级语义**（尾部字段级 0%，`PROGRESS.md:15`）。能力已超过知识，这是当前编辑器最大的毁档面。
- 缺失工具：`.hnt` 与 system 槽一致性检查（`PROGRESS.md:78`、`HANDOFF.md:184`）——`hunterA.hnt` 与 slot1 只 86.76% 相同，用户若混用会静默丢进度。

### 4.5 上游 499 与波次吞吐

- 首批 14 代理 **11/14 因 499 失败**（`HANDOFF.md:138`）；第二批「**仍有多代理 499**」（`HANDOFF.md:139`）；更早一次「wb2api 499 秒级拒绝，两批 13 worker 全灭」（`DEVLOG.md:266`）。
- 并发上限被用户限定 ≤5（`DEVELOP.md:43`）；切片 120 函数/片才稳定（`HANDOFF.md:192`、`DEVLOG.md:434`）。
- 真实吞吐 ≈ 每波次 5 片 × 成功率；按 117 片剩余，**≈ 30–40 个波次** [INFERENCE]。499 的损失是**半成品报告**，只能靠「每 30 个 append」减少（注意 ledger 写的是每 200，见 C12）。

### 4.6 单点串行：主会话是唯一执行器

dsv 子代理**没有 exec**（`HANDOFF.md:191`、`SUBAGENT-LEDGER.md:24`），所以切片的生成、合并、复算全部由主会话代跑；主会话同时还是唯一的裁决者（`SUBAGENT-LEDGER.md:19` 主会话精确窗口复核、`:16` 主会话复核循环闭合）。⇒ 并行度受「一个执行器」限制，这比 499 更结构化、更难绕过。提升吞吐的正确做法是**把脚本执行批量化**（一次跑 5 片 + 一次 merge），而不是加大单片。

### 4.7 存档侧剩余（已基本收敛）

| 项 | 状态 | 依据 |
|---|---|---|
| 成员链 `0x278..0x3783A` | 字节级闭合 | HANDOFF.md:78-98 |
| 尾部 950KB | 定性为缓存/宿主残留，**不建议**逐字节标注 | HANDOFF.md:182、coverage-map.md:394 |
| member#4 4B 漂移 | 已界定 `0x3157..0x5EA2`，未定位 | HANDOFF.md:181 |
| 632B 头 | 性质定案，剩余散点低价值 | coverage-map.md:306、:320-322 |
| 社交区 356KB | 已证明是真实数据，字段级 0 | coverage-map.md:57-61 |
| 32 个类成员 offset 缺失 | 未做（`cEmDouMouKaData` 42 成员只解部分） | HANDOFF.md:183 |

⇒ 存档侧不再有「结构性未知」，剩下的都是**边际收益递减的字段级补全**；把人力投在这里的性价比已低于投在 Tier B 的证据杠杆（批次 A/C）上。

## 5. 下一步工作排序（Top 8）

排序原则：先做**决定方向**的（1–2），再做**提高证据供给**的（3、5），然后是**已验证可批量推进**的（4），最后是**闭合型**任务（6–8）。「可切片」列按委派纪律：每片 ≤120 函数，或 1–2 个文件。

| # | 动作 | 预期收益 | 成本 | 依赖 | 可切片 |
|---|---|---|---|---|---|
| 1 | 复算并冻结覆盖率口径 | 让所有后续数字有唯一基准；暴露 C15 的真值 | 0.5–1 人时（主会话跑 1 次） | `.tmp` 的 tiers.csv + flat.bin 仍在（R8） | 否（单次运行），产出 1 份 snapshot |
| 2 | 验收口径裁决 + 复核协议 | 决定 90% 是否在数学上可达（§4.1） | 1 文档 + 1 次评审 | 需 2 名代理交叉复核样本 | 协议 1 文件 |
| 3 | 批次 A：全类名 pc 相对 xref | 把 B→A 的证据供给做大；直接影响 A 率（现 12.5%） | 中（脚本扩展 + 全量扫描） | `arm32.mjs`、`class-inventory.tsv` | ✅ 每片 ~100 类（≈32 片） |
| 4 | pass2 收尾 7 片 | 补到 1,680 函数（Tier B 指令 55–62%），并量出中段 A 率 | 低（切片已在 `.tmp/mhgu/tierB2/`） | dsv 无 exec → 主会话代跑 | ✅ 120 函数/片 |
| 5 | 批次 C：vtable→类归属 | 批量覆盖「无字符串」函数 | 中 | 依赖 #3 的类注册表 | ✅ 每片 ~200 个 vtable run |
| 6 | 编辑器实机验证包 + `.hnt`/槽一致性检查 | 关掉唯一未验环节；防两档混用毁档 | 低（1 工具 + 1 操作单） | 用户实机 | ✅ 1–2 文件 |
| 7 | member#4 4B 漂移夹逼 | 让 134 行 file_off 全对齐（编辑器写点可信） | 小–中 | 需新语义探针（旧探针已失效） | ✅ 1 个分析文件 |
| 8 | romfs 前置件清单 | 把「硬边界」变成可执行的取数步骤 | 低（1 文档） | 用户提供 XCI | ✅ 单文件 |

### 1. 复算并冻结覆盖率口径
- 做法：`cd "G:/omp works" && <venv python> MHGU/tools/mhgu/coverage-final.py`（命令见 `HANDOFF.md:143-146`），把 stdout 原文写入 `docs/analysis/code/coverage-snapshot-20261023.md`，同时把 `.tmp/mhgu/inventory/tiers.csv` 复制进 `docs/data/`（约 23,885 行，压缩后与 `functions.csv.gz` 同量级）。
- 为什么第一：C15 表明 52.5% 与磁盘上的 7 份 pass2 报告不自洽；在数字未校准前，任何「还差多少」的估算都会错。
- 验证点：脚本输出的 `Tier B conf=A` 函数数应 ≥ slice-02 汇总的 A=15 × 片数（若显著小于，说明解析漏行——`coverage-final.py` 的 role 正则比 `tierb-merge.py` 宽，但 vaddr 必须在 `tiers.csv` 里才计指令）。

### 2. 验收口径裁决 + 复核协议
- 现状冲突：`code-metrics.md:153-154` 定「Tier A + Tier B conf=A」为达标口径；`code-metrics.md:138` 又要求「每片抽 10% 二次复核，一致率 <85% 回炉」；`code-metrics.md:106` 还有第三套（全函数正确率）。三套互斥定义见 C17。后者产生的 `agreement` 目前**不进任何指标**。
- 建议裁决（需主会话拍板）：达标 = conf=A **∪**（conf=B 且双人独立复核一致）；同时把「每片 10% 复核」升级为「每片固定抽 12 个函数双读」，使 120 函数/片正好 10%。
- 收益：把 §4.1 的 2.2× 产率要求，换成「复核一致率 ≥85% 即可计入」；并让 agent 之间的分歧成为可度量对象（而不是被 A/B 标签掩盖）。
- 风险：口径放宽会稀释 94.7% 的可信度承诺（`code-metrics.md:131`），因此必须**分列报告两套数**（严格口径 / 复核口径），不能合并成单一 headline。

### 3. 批次 A：全类名 pc 相对 xref（`code-metrics.md:98`）
- 做法：把已有的 pc 相对 xref 机制（`code-metrics.md:19-21`、`tools/mhgu/README.md` 坑 3）从「怪物池」扩到全部 3,201 个类名 + 全体 `m*` 成员名，产出「类 → 注册函数 → 字段注册函数」三列表。
- 预期收益：这批函数的子系统可由**单个类的名字**直接判定，绕开 57.4% 的「注册器多数前缀」陷阱（`code-metrics.md:49`）；是唯一能系统性抬高 conf=A 率的结构信号。量化目标：把 pass2 的 A 率从 12.5% 抬到 ≥30% [INFERENCE，目标值]。
- 切片：按类名前缀族切（`c*` 1,116 / `u*` 928 / `r*` 413 / `s*` 199 / `Mt*` 73 / 其它 472，`monster-code-map.md:96-104`），每片 ~100 类，输出 1 个 TSV；32 片可由同一代理串行完成，互不冲突。

### 4. pass2 收尾 7 片
- 输入已就绪：`.tmp/mhgu/tierB2/slice-01..14.txt`；缺报告的是 01、03、05、11、12、13、14。
- 预期收益：把 pass2 从 7/14 补到 14/14，覆盖 1,680 个 top-insns 函数（Tier B 指令 55–62%），并给出**中段函数的真实 A 率**（用于校准 §4.1 的产率曲线）。
- 成本：7 片 × 120 函数，每片一个 dsv 代理；注意并发 ≤5（`DEVELOP.md:43`）与 499 史（`HANDOFF.md:138-139`）。
- 纪律：必须带 24 条反汇编头（`code-metrics.md:157`）、唯一报告路径、每 30 个 append（`HANDOFF.md:193`）、conf=A 必须引具体指令/字符串。

### 5. 批次 C：vtable→类归属（`code-metrics.md:102`）
- 现状：vtable 成员归属单用无效（3,987 run 里仅 12 个能自证，`code-metrics.md:91`）；但 `docs/mechanics/monster-code-map.md:95` 已证「全镜像仅 62 个 RTTI 命名 vtable，无一匹配怪物类」，说明只能走注册器调用图。
- 做法：在批次 A 得到类→注册函数后，反查「谁把该 vtable 地址写进对象」，把 vtable 与类对齐。
- 预期收益：一次性覆盖所有方法函数（含无字符串者），是唯一能批量提升**函数计**覆盖率的路径。
- 切片：每片 ~200 个 run，产出 1 个映射表；与 #3 串行（依赖）。

### 6. 编辑器实机验证包 + `.hnt`/槽一致性检查
- 包内容：① 操作单（备份 → 在 char_off `0xC9000` 附近写 1 字节 → 进游戏读档 → 记录页数/道具/任务状态）；② 回滚脚本（从 `save-snapshots/20261022-clean-reference/` 还原）；③ `CheckHntMatchesSystemSlot()`（读 `.hnt` 与 `system` 槽，逐区打印等值率，参考 `PROGRESS.md:77` 的 99.31%/86.76% 判据）。
- 为什么必须做：扩窗后编辑器能写 356KB 在线数据，而该区字段级覆盖 **0%**（`coverage-map.md:57-61`、`PROGRESS.md:15`）；「有能力写、无知识解释」是当前最大的毁档面。
- 成本：1 个 WinForms 方法 + 1 个操作文档；实机 10 分钟。

### 7. member#4 4B 漂移夹逼
- 已知：`0x3157` 之前完全正确，漂移在 `0x3157..0x5EA2`（`HANDOFF.md:181`、`coverage-map.md:277-287`）；旧探针已失效——`coverage-map.md:287` 记「dirty 档已无 member4-diff 记录的 63/54/56B FF 长串，故该探针失效」。
- 新探针建议（[INFERENCE]）：用「值域/单调性」类不变量而非差分——如 128B 记录族的 `rec+0x5C..+0x7F` 9×`{u16 id,u16 value}` 中 id 必须落在道具 id 空间（≤2991，`DEVELOP.md` 决策分叉表的 id 空间定案），逐 4B 位移扫描哪个对齐使 15 条记录全合法。
- 收益：134 行 file_off 全对齐 ⇒ 编辑器所有 member#4 写点可信；也是 `.hnt`↔obj 映射工具的前提。
- 成本：1 个分析脚本 + 1 份报告。

### 8. romfs 前置件清单
- 内容：base NCA 的确切名字/大小/SHA（用 `.tmp/mhgu/extract/98abd400.head.bin` 反推，消除 C9 的 9.1/10.8/12.3GB 三值）、`hactool -r` 命令行、需要解出的 4 张表（`emsizetbl`/`emyure`/`itemData.itm`/`questData`）、每张表对应的已知消费者（`monster-code-map.md:75-81`、`DEVELOP.md` 知识库表）。
- 收益：把「阻塞」变成「等用户一个文件」；同时给出「若无 base，用 `mhgu.db` + wiki 能替到哪一步」的结论（体型/冠阈值不可替，任务名/前置可替，`DEVELOP.md:304`）。
- 成本：1 文档，0 代码。

**候补（不进 Top 8）**：批次 D 库级整块归类（`code-metrics.md:104`，MT Framework 73 类 / nn / NEX）——若验收口径按 §5-2 放宽，它能把「需逐函数裁定」的分母压掉一块，但收益依赖库边界识别，成本高于 #3/#5；32 类成员 offset（`HANDOFF.md:183`）与 632B 头（C13）收益低，建议冻结。

## 6. 委派经验（来自 ledger）

### 6.1 切片大小是硬约束，不是偏好
1,062 函数/片 → 首批 **11/14 因 499 失败**，仅存 378 行（`HANDOFF.md:138`、`code-metrics.md:143`）；120 函数/片「可稳定完成」（`HANDOFF.md:192`、`DEVLOG.md:434`）。ledger 自己记的首批分片仍是 1,062（`SUBAGENT-LEDGER.md:28`），且状态停在「进行中（首批落盘 TierB03 120 行）」（`:32`）——**ledger 没记录失败与改版**，是这份 ledger 最大的缺口。
⇒ 纪律：单片 ≤120 函数；并发 ≤5（`DEVELOP.md:43`）；14 并发是失败配方。

### 6.2 你给代理什么证据，就只能得到什么结论
- 只给 `callee_label_votes` → 代理忠实复述票数，`quest` 占 222/378，且构成循环论证（`code-metrics.md:144`、`:148-150`）。
- 改成「自带 24 条反汇编 + conf=A 必须引具体指令」→ 产物出现可核对的硬证据（zlib inflate 错误串、`cUIOHunterNoteLow`、`areaseldat`），`code-metrics.md:157`、`.tmp/reports-mhgu/tierB2-slice-02.md` 的 15 条 A 级证据全部来自字符串。
⇒ 纪律：prompt 里必须写清「可接受的证据形式」白名单（字符串 / 已知原语地址 / 类注册 `0x7aedcc` / 特征立即数），并禁止把上游标签当证据。

### 6.3 代理的「数据」可信，「解释」必须复核
- 有效监督：ReviewMemberLayout 抓到 member[7] 位宽 35136→35131（`SUBAGENT-LEDGER.md:9`）；Member4Residual 抓到旧 dump 整体早 0x550（`:16`）；Palico324 由主会话补上 24 组名字证据（`:22`）。
- 必须否决：WriteSideDesc 的全局论断「`0x14b0b0`/`0x14b1c4` 读写标签写反」被主会话精确窗口复核推翻（`0x14b0b0` 11 读 0 写、`0x14b1c4` 0 读 10 写，`SUBAGENT-LEDGER.md:19`）。
- 反向也要防：dsv 审查主张「护石 LV 钳 ≥0」，而负技能 LV 合法，属**假阳性**，主会话拦下未误修（`DEVELOP.md:242`）。
⇒ 纪律：代理报告分「观测（地址/字节/指令）」与「推断（语义）」两栏；推断必须由第二人复核，观测必须自带可复算命令。

### 6.4 共享输入的陈旧会同时污染多份产物
旧 dump 的 `file_off` 全部早 0x550，导致 `records-128.md`/`fam-small.md`/`fam-288.md`/`member4-semantics.md`/`followup-dump.txt` 五份文档同时错，事后只能加警示横幅（`coverage-map.md:310`）。
⇒ 纪律：交给代理的 dump 必须**自带闭合断言**（区间和 = 总长、首尾相接、边界锚点），报告必须回填「闭合校验」一节；没有闭合校验的字段表不得进 `docs/`。

### 6.5 dsv 无 exec：协作协议要预先固定
dsv 只有 read/grep/glob/edit/write（`HANDOFF.md:191`），因此「自建脚本」实际是「写脚本 + 求主会话跑」；ledger 的复盘也指向「预先给出脚本路径 + 主会话代跑约定」（`SUBAGENT-LEDGER.md:24`）。早期做法是主会话预生成 dump（`DEVLOG.md:308`）。
⇒ 纪律：派发单里固定三行——脚本绝对路径、运行命令（含 cwd 陷阱，如 `codec-verify.mjs` 必须在 `G:/omp works` 跑，`DEVLOG.md:309`）、输出落盘路径。

### 6.6 落盘与汇合纪律
- 唯一报告路径 + 写集互斥（`SUBAGENT-LEDGER.md:6`、`:29`）在实践中有效，未出现互相覆盖。
- append 间隔：`SUBAGENT-LEDGER.md:31` 写 200，`HANDOFF.md:193`/`DEVLOG.md:434` 写 30（C12）⇒ 取 30。
- `.tmp` 不是存档：定案必须迁 `docs/`（`HANDOFF.md:194`、`DEVELOP.md:42`）；本次评估已见 7 份 pass2 报告同时存在于 `.tmp/reports-mhgu/` 与 `docs/analysis/code/tierb-pass2/`，迁移是有效的，但**汇合脚本仍只读 `.tmp`**（R8）。

### 6.7 汇合脚本要唯一且要对账
`tierb-merge.py` 按 vaddr「后者覆盖前者」去重，`coverage-final.py` 按 conf 等级取优，两条路径对同一批报告给出不同结果（R9）。`tierb-merge.py` 只打印 `parsed rows (deduped)`，**没有与 `tiers.csv` 的 14,863 对账**。
⇒ 纪律：汇合脚本必须打印三行对账——各片行数之和、去重后行数、落在 Tier B 分母内的行数；三者不等就要解释。

### 6.8 模型路由是外部变量，任务设计要可重试
`swe2` 停用期只用 `dsv-dev`（`HANDOFF.md:190`）；上游 499 曾一次打掉 13 个 worker（`DEVLOG.md:266`）。
⇒ 纪律：任务必须幂等（按 vaddr 去重、报告可追加）、失败可续跑（读已有报告再补空缺），不要设计「一次成功」的长任务。

### 6.9 代理自建工具是资产，必须登记
`swe2` 自建符号执行器 `reader-fields.mjs`（`SUBAGENT-LEDGER.md:11`）后来成为 `tools/mhgu/` 的核心脚本；但当前仍有 4 个脚本未进 README（R10）。
⇒ 纪律：代理交付脚本时，把「脚本 + 一行用法」写进 `tools/mhgu/README.md` 作为验收条件之一。

## 附录 A：读取清单与缺口

### A.1 指定文档（全部读完，按行范围）
| 文件 | 读取范围 | 备注 |
|---|---|---|
| `HANDOFF.md` | 1-123、124-212（全文 212 行） | 唯一「接手入口」，§0 表格与 §5 Tier B 路线是本文主要引用源 |
| `docs/PROGRESS.md` | 1-120（全文） | A~G 七节；D 表陈旧（C5）、G 表 95.7% 陈旧（C1） |
| `docs/analysis/code-metrics.md` | 1-133、130-157（全文 157 行） | 唯一代码口径来源；§7/§8 是本文算术基础 |
| `docs/mechanics/monster-code-map.md` | 1-140（全文） | 怪物代码侧总图；§5 硬边界、§7 类清单 |
| `docs/save-layout/coverage-map.md` | 1-163、164-303、304-394（全文 394 行） | 存档权威页，但已是**追加式日志**（C7/C14） |
| `tools/mhgu/README.md` | 1-200（全文） | 工具 / 7 条坑 / 「输入不在 repo 内」声明（R8） |
| `DEVELOP.md` | 1-143、144-333、334-470、474-537（全文 537 行） | 契约文档；159 字段（C8）、romfs 三尺寸（C9）、known-limitation（C6）、135+4B 头（C18）、384bit（C19）、MonsterForm 71/93（C20）|
| `DEVLOG.md` | 末 200 行 | 教训段（`:427-435`）与 499 事故（`:266`） |
| `docs/reference/SUBAGENT-LEDGER.md` | 全文（32 行） | 只到首批 TierB，缺 pass2 与失败记录（6.1） |

### A.2 为核对矛盾而额外读取
`docs/README.md`（全文，权威目录声明 + 134 行表说明）、`docs/data/tierb-labels.csv:1-9`（379 行）、`.tmp/mhgu/inventory/tiers.csv:1-2`（23,886 行）、`.tmp/mhgu/inventory/tierb-labels.csv:1-2`（379 行）、`.tmp/reports-mhgu/tierB2-slice-02.md:1-33,138-161`（含汇总 A15/B70/C35）、`.tmp/reports-mhgu/tierB2-slice-10.md`（无汇总节）、`.tmp/reports-mhgu/ROUND-SUMMARY.md`（2026-10-22 旧状态）、`tools/mhgu/coverage-final.py`、`tools/mhgu/tierb-merge.py`（两者输入路径与去重语义，R8/R9）。

### A.3 磁盘事实核对（静态，无执行）
| 事实 | 结果 |
|---|---|
| `MHGU/tools/mhgu/` 脚本是否齐备 | 齐备；`state-motion3.mjs`、`vtable-crc.mjs`、`mon/mon-fn.py`、`mon/mon-classes.py` 未进 README（R10） |
| `docs/data/json/monster-slot-map*.json` | **两个文件都存在**（C10） |
| `docs/analysis/code/tierb-pass2/` | 7 份（02/04/06/07/08/09/10） |
| `.tmp/mhgu/tierB2/` | 14 份输入（01–14） |
| `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` | 存在（→ `coverage-final.py` 当前**可以**复算，R8 的失效条件是 `.tmp` 被清） |
| `.tmp/mhgu/inventory/tiers.csv` | 23,886 行（表头 + 23,885） |
| `MHGU/.tmp/` | **不存在**；`.tmp` 在工作区根 `G:/omp works/.tmp`（路径易错，`HANDOFF.md:144` 的 `cd "G:/omp works"` 正是为此） |

### A.4 未读 / 未验证（明确边界）
- 未读：`monster-state-machine.md`(31KB)、`monster-classes.md`、`monster-ai-params.md`、`quests.md`、`systems.md`、`save-layout/member4-semantics.md`、`CURRENT-RULING.md`、`analysis/members/*` 等。本文对这些文件的一切判断均来自 HANDOFF/PROGRESS/coverage-map 的转述。
- 未验证（本任务禁止执行）：任何 build / 冒烟 / 实机 / 补丁行为；所有「运行期」结论（编辑器实机、V7 补丁视觉确认、501 矛盾位收敛）只有文档声明，无独立证据。
- 任务要求的「上游不稳定」风险已按「先建骨架、读完一份写一份」处理：本文件的所有结论均已落盘，不依赖会话上下文。

### A.5 建议的复算命令（供主会话执行，不在本任务范围）
```bash
PY="G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe"
cd "G:/omp works"
# 1) 覆盖率复算（唯一权威口径）
"$PY" MHGU/tools/mhgu/coverage-final.py
# 2) 与 Tier B 分母对账（应 ≈14,863；当前 CSV 只有 378 行）
"$PY" MHGU/tools/mhgu/tierb-merge.py
# 3) 冻结输入（防 .tmp 被清；先复制再压缩）
cp .tmp/mhgu/inventory/tiers.csv MHGU/docs/data/tiers.csv
gzip -9 MHGU/docs/data/tiers.csv
```

### A.6 结论摘要（可直接进规划）
1. 结构层已收敛（L0/L2 100%、存档成员链字节级闭合、137 槽三重验证），**不要**再往存档尾部投人力（`HANDOFF.md:182`、`coverage-map.md:394`）。
2. 代码 90% 在「只算 conf=A」口径下**算术上不可达**（§4.1），必须先裁决口径（§5-2）。
3. 提高 A 率的唯一结构杠杆是批次 A（类名 xref）与批次 C（vtable→类），二者串行、可切片（§5-3、§5-5）。
4. 当前 52.5% 是未校准快照（C15），先复算再规划。
5. 委派纪律的核心是「证据白名单 + 120 函数/片 + 每 30 append + 主会话复核推断」（§6）。
