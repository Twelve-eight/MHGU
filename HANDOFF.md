# MHGU 逆向 — 交接文档（2026-10-23 收盘）

> 新会话读这一份即可接手。所有结论都已落盘到 repo，`.tmp` 只存可再生中间产物与未归档的代理报告。
> 仓库：`G:/omp works/MHGU` = **公开** https://github.com/Twelve-eight/MHGU（代码 GPL-3.0-or-later，2026-10-24 由 MIT 改；docs CC-BY-4.0）。不可发内容在本地私有仓 `G:/omp works/MHGU-private`（永不推送），原路径经联接/硬链接可用，见 `docs/PRIVATE-DATA.md`。2026-10-23 已用 filter-repo 重写历史（旧哈希作废；改写前备份 `G:/backups/MHGU-pre-filter-20261023{,.bundle}`）。

---

## 0. 长期目标与当前判定

**目标**：① 游戏代码 90%+ 可解释（口径见 §5：Tier A + Tier B conf=A 的 `.text` 指令占比，函数数并列）；② 存档编辑器可解释/修改每字节；③ 怪物机制全部了解。

**当前实测（诚实口径）**：

| 维度 | 数字 | 是否达标 |
|---|---|---|
| 存档：成员层 file 链 | `0x278..0x3783A` = 227,386B **100% 结构级** | ✅ |
| 存档：成员层字段级 | ~78%（分母 = 成员层已标注段合计 **224,643B**；~~234KB~~ 不是猎人块里的任何一段，勿再引用）| 部分 |
| 存档：尾部 950KB | 容器表 C0..C7 尺寸闭合。**硬证据**：无校验、不在读档路径、跨档相异 67%（`system_CLEAN` slot1 vs v6-ready `system` slot0，跨槽位比；见 `coverage-map.md:279`）；**[INFERENCE，中-高]** 透传缓存 = 宿主/模拟器进程内存残留（`coverage-map.md:393`）| ✅ 硬证据；性质仍属推断 |
| 代码：L0 结构清点 | **52,692 函数**（重切后的当前分母；旧口径 23,885）/ 5,228,277 指令 / 3,201 类 | **100%** ✅ |
| 代码：L1 子系统（**2026-10-23 历史值，勿引用**）| Tier A 8,856 函数 / 51.5% 指令，当时实测精度 94.7%——函数表重切后都不适用 | 历史记录 |
| 代码：L1（**2026-11-04 重测**，见 `docs/analysis/code/coverage/METER.md`；Tier A 精度重测 78.3%） | 分母已按重切函数表变成 **52,692 函数**（指令分母不变 5,228,277）：直接证据 **23.9%**；≥90% 精度可溯源覆盖 **66.2% 指令 / 53.5% 函数**；按各通道实测精度加权的**期望解释比例 75.0%**；摊开未验 23.8%（逐标签 5.5–83.6%）；无标签 10.0% | 口径收紧后**未达 90%**（见 §5 顶部说明） |
| 代码：L1 覆盖率（含 Tier B conf=A）| **58.0% 指令**（Tier A verified 57.7% + B 切片 conf=A 0.3%；函数口径见 §5）| ❌（目标 90% **指令**，函数并列；见 §5 口径）|
| 怪物机制：数据侧 | mhgu.db 全表（HP/肉质/异常/弱点/掉落/栖息地/任务出现）| ✅ |
| 怪物机制：代码侧 | 类成员 `{名,offset,type}` 110 条 / 状态机 state→handler 全解 / motion 名 41/53 派发器 | ✅ 主要结构 |
| 怪物机制：数值表 | 体型/冠阈值在 **romfs**，被 base NCA（`98abd400…nca`，**12,168,003,584 B = 12.17 GB / 11.33 GiB**）缺失阻塞 | ❌ 硬边界 |

**结论**：存档与怪物机制的结构层已基本完成；**代码 90% 的缺口在 Tier B 的 48.5% 指令**，只能靠逐函数裁定（批次化进行中）。

---

## 0b. 两条主线（2026-10-23 定）
- **A 模拟器版**：继续理解代码/存档/机制，产出资料、`.pchtxt`、存档编辑器（编辑器源码在私有仓）。
- **B 原生重编译版**（SUYU-GURecomp，GPL-3.0，只吸收事实）：用 Forge PC 插件（`mod_host_api.h`，MIT）实现新玩法；验证存档与模拟器互通。其导出版**不支持 pchtxt**（其 INSTALL.md:161）。
- 实机测试只在用户授权的离开时段进行（AGENTS.md §2e）。

## 1. 坐标系（最易出错，务必先读）

| 名称 | 定义 |
|---|---|
| `vaddr` | NSO 虚拟地址。`flat_off = vaddr + 0x100`（`main.140.flat.bin` 含 0x100 头）|
| `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
| `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
| system 文件偏移 | `hunterAdds[i] + char_off`，`hunterAdds = [1625244, 2803040, 3980836]` |
| 存档锚点 | clean = `save-snapshots/20261022-clean-reference/system_CLEAN`（**slot1 基址 0x2AC560**）；dirty = `save-snapshots/20261022-v6-ready/system`（**slot0 基址 0x18CC9C**）|

**⚠ 三条必须先知道的坑**：
1. **字符串引用走 pc 相对**：`ldr rB,[pc,#imm]`（或 `movw/movt`）取 **bias** → `add rD,pc,rB` → `target = 该 add 地址 + 8 + bias`。
   按「4 字节字 == 串地址 / movw+movt 直接编码」搜索会得 **0 命中（假阴性）**。另有 cName 哈希机制：`crc32(name)`（poly 0xEDB88320、init 0xFFFFFFFF、无最终异或）。
2. **ARM JS 掩码陷阱**：`(w & 0xFFF00000) === 0xE3000000` 永远 false（`&` 返回有符号 int）。必须 `((w & 0xFFF00000) >>> 0) === 0xE3000000`。曾因它得出「0 命中」。
3. **BL 判定必须带 bit24**：`((w>>>25)&7)===5 && ((w>>>24)&1)===1`，否则 `B` 也会算进去（8 倍噪声）。

---

## 2. 工具链（**已入 repo**：`MHGU/tools/mhgu/`）

`README.md` 里列了产出对照表 + **7 条已踩过的坑**。核心：

| 脚本 | 作用 |
|---|---|
| `arm32.mjs` | `disasm(vaddr,count)`（count=指令条数）、`findCallsTo`、`rd32/rd16/rdb` |
| `func-inventory5.mjs` | 全函数清单 → `docs/data/functions.csv.gz` |
| `classify3.mjs` / `validate-repeat.mjs` | 子系统标签 + **10 折重复切分验证**（headline 指标只能用它）|
| `agreement-tier.mjs` / `tiers-all.mjs` | 双预测一致性分层（Tier A/B/C）+ 规模统计 |
| `tierb-gen.mjs` | **Tier B 切片生成器（唯一有效版）**：`node tools/mhgu/tierb-gen.mjs <OFF> <COUNT> <NPROC> <OUTDIR>`，每函数带 24 条反汇编头；文件名与 header 用同一 index；生成后自检 header |
| `tierb-merge.py` | 把 `tierB*-slice-*.md` 报告解析成 CSV（**按 vaddr 去重，忽略报告里的 slice 号**）|
| `coverage-final.py` | 覆盖率合成（Tier A + Tier B conf=A）|
| `mon/mon-final.py` | 类大小表 → `docs/data/class-inventory.tsv`（3,201 类，含 `SUSPECT` 标记）|
| `mon/mon-offsets.py` | 成员 `{offset,type,name}` → `docs/data/member-offsets.tsv`（110 条）|
| `mon/em-units.py` / `counter-slots*.py` | 137 槽权威表 → `docs/data/json/monster-slot-map-137.json`（`monster-slot-map.json` 是旧表，~~勿引~~ superseded 2026-10-23）|
| `state-motion2.mjs` | 怪物 state→handler→motion → `docs/mechanics/monster-state-machine.md` |

运行环境：`"G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe"`（系统 python 会挂）；
node 用 `G:/omp works` 为 cwd。

---

## 3. 存档侧成果（已定案）

### 3.1 成员 census — `docs/analysis/members/member-census.md`
- 顶层调度器 `0x3e77b0`：**19 成员对象槽 = 18 反序列化器 + 2 post-load fixup**
- rodata 表 `[0x3e7938..0x3e7980]` 存 **PC 相对偏移**（不是指针）；`GOT_k = 0x3e77bc+20k+8 + offset_k`，19 个 GOT 槽表已列出（道具箱 `0x183A81C→0x1858438`、口袋 `0x183A828→0x18584B8` 双点验证）
- 4 类读原语：`0x3df2a8`(定长读) `0x3df378`(定长写) `0x3df1b8`(位宽=容纳 cap 的最小位宽) `0x3df22c`(位流读)

### 3.2 成员 file 链（字节级闭合）
```
0x0000..0x0277  632B 头（名字@0x00/时长秒@0x20/金币@0x24/HR@0x28/性别@0x2A；HR 第二副本@0x0B1；
                0x10C+44k = 7×44B 运行时对象 dump（vptr 0x0193A514 落盘）；0x270..0x273 栈残留）
0x0278          member[0] 道具箱（2300 位流 + 组名块 24×170）
0x27BF          member[1] 口袋（32 槽 × 成对位流 id≤2991/cnt≤99）
0x280B          member[2] 外层头 1024B（0x280B+1024 = 0x2C0B 精确接内层）
0x2C0B          member[2] 内层 member#4（12955B，134 字段；layout 表少算 4B，漂移在 0x3157 之后）
0x5EA6          kill 137×u16 (274B)   ← 编辑器锚点，已三重验证
0x5FB8          capture 274B
0x60CA          volume 137×[u16 mini,u16 maxi] (548B) → 25326 = 0x62EE
0x62EE          member[3] 装备箱 2000×36 + 猫装备 1000×36 + 5440 + 1632
0x2246E         member[4..11] 41526B（[7]=随从猫 35131B，含 84×324B）
0x2C6A4         member[12] 16B
0x2C6B4         member[13] 28404B（画廊/卡片，6 块；含 zlib blob）
0x335A8         member[14] 6248B（13×470B 运行时镜像，×2.05 归一化在 m16）
0x34E10         member[15] 160B
0x34EB0         member[16] 263B（VFP ×2.05；obj+0xac=迁移级别）
0x34FB7         member[17] 10371B（99×104B kind-7 master-data 快照库）
0x3783A         成员结束
0x3783A..0x11F8A0  尾部 950KB = 透传缓存（16B 记录网格 0x63671..0xBCC20；zlib 网格 50×73B；android Binder 串=宿主残留【INFERENCE 中-高，非硬结论】）
```

### 3.3 编辑器（`editor-src/MHGU存档修改/`）
- **回写窗已扩展到 1,177,760**（原 821,248），末块 `Math.Min(512, N-i)` 夹紧（`1,177,760 = 2300×512+160`）；build 0 错；冒烟通过
- **`MonsterForm.cs` 已改为 137 槽真实布局 + 单循环**（原槽 71..128 名字/计数整体错位）
- **待实机验证**：扩窗后在社交区写一处 → 进游戏读档确认正常（唯一未验环节）

---

## 4. 怪物机制成果

| 文档 | 内容 |
|---|---|
| `docs/mechanics/monster-code-map.md` | 代码侧总图：149 动作派发器 / 58 方法表 / 477 个读 `u8[+0x73E0]` 的函数 / 166 项主表 / 137 槽 / 类注册 |
| `docs/mechanics/monster-state-machine.md` | **state→handler 53 派发器全解**；motion 名 41/53 解出（`em003_00ActionMove` 等），共享 handler 状态未解 |
| `docs/mechanics/monster-ai-params.md` | `mParam.*` 131 字段（移动/索敌/蓄积阈值/行动控制/网络）+ 44 动作名 + 225 uEm 单元名 |
| `docs/mechanics/monster-classes.md` | 27 个类的成员 `{offset,type,name}`（110 条，offset/type 是代码立即数） |
| `docs/data/class-inventory.tsv` | 3,201 类名+大小（8 个 >0x40000 标 `SUSPECT`）|
| `docs/data/json/monster-slot-map-137.json` | **137 条权威表**（slot/emid/cn/en/kind；94 大 + 43 小）；`monster-slot-map.json` 是旧表（~~137 条权威~~ superseded 2026-10-23）|
| `docs/analysis/monsters/` | 6 份调查报告（类映射/em 单元/计数器槽/任务派发/AI 入口/体型）|

**137 槽布局（定案，推翻旧的 93+36+8）**：`0..70` 大怪 71 / `71..111` 小怪 41 / `112..134` 大怪 23 / `135..136` 小怪 2。
三重验证：① 小怪不可捕获（旧布局在槽 112/114/120/123/124/128 出现非零捕获 → 违反）；② volume 137×4=548 精确接 `0x62EE`；③ 静态表 `0x1597EA4` + 资源表 `0x1732050` 一致。

**硬边界**：体型/冠阈值数值表在 romfs（`*.emsizetbl`/`*.emyure`），需原始 XCI + hactool（base NCA `98abd400588fccb68509fed7e55e4a47.nca` = **12,168,003,584 B（12.17 GB / 11.33 GiB）**，取自 XCI secure 分区范围 `0x182bbe00..0x2ed70be00`（`.tmp/mhgu/xci-info.txt:50`）；不在本机）。~~12.3GB / 9.1GB / 10.8GB~~ 三个旧值均作废（superseded 2026-10-23）。

---

## 5. 代码 90% 目标的现状与路线

> **2026-11-04 口径重述（先读这段，再读下面的历史记录）**
>
> 本节的度量口径（Tier A + Tier B conf=A，分母 5,228,277 指令）仍然是**目标口径**，但实现已经换成 `docs/analysis/code/coverage/METER.md` 的流水线，原因有三：
>
> 1. 函数表重切（前导 + BL 目标重建），函数分母从 23,885 变成 **52,692**；**指令分母不变**，所以百分比仍可比。
> 2. 旧的 Tier A 是"调用图 + 地址局部性双预测一致"，它的 94.7% 是对**留出的字符串种子**测的。换成独立真值（只用 A 级证据）后，同类的"邻域传播"通道只有 **72.4%**（逐标签 5.5–83.6%），因此不再单独计入。
> 3. 现在只发布**每条规则按自己的人群测过**的通道：
>    - 直接证据 **23.9% 指令**（30,167 行 A 证据里 **22,957 行已回到镜像逐行重算、100% 一致**；4,479 行只有类名/分类学依据，2,731 行是现有处理器解析不了的形状——按指令算，直接证据桶里 **95.3% 至少有一条断言能回到镜像重算**，完全没有的只有 762 个函数 / 5.0% 指令）；
>    - 单跳推断（单票/双票/调用者/类共识，各自冻结在 ≥92% 的下界）**36.3%**；
>    - 立即数签名 **2.8%**；
>    - 已验摊开（online-nex 99.8 / weapon-wp 98.4）**3.3%**；
>    - 合计 **≥90% 精度 66.2% 指令 / 53.5% 函数**；
>    - 剩余：摊开未验 23.8%（合并 72.4%）、无标签 10.0%（12,318 函数）。
>    - 按各通道实测精度加权的**期望解释比例 = 75.0%（保守）– 82.5%（乐观）**。
>
> **2026-11-04 追加（本会话新增，均已实测）**
>
> - **剩下 10% 不是缺一条通道，是缺正面证据**：12,318 个未标函数里只有 **958 个（7.8%）引用任何字符串**（旧写 247 / 2.0% 是 `strings` 列——该列由旧表按包含关系搬来、从未重新提取；958 与 2.38% 的指令占比出自指令级重建的 `stringxref.tsv`），其余 **92.2%** 一个都不引用；这 958 个引用的 233 个类名里，**没有任何一个类在别处有 ≥2 个标签一致的已标成员**，所以同类名共识产出 **0 个候选**。类名前缀规则在已标函数上仍测得 108 一致 / 7 不一致 = **93.9%**，但对未标函数只剩 **4 个**可套——产量已经吃干净。
> - **剩余大块在哪**：未标 524,143 条指令里，≥100 条的仅 **1,002 个函数却占 254,129 条（48%）**，集中在 `0x1120000–0x11d0000`，**同块已标的是 monster-em 与 render-gfx**；它们不构成封闭岛（只有 3.3% 的被调引用落在本群内部），也不是跨子系统基础设施（353 个助手里 216 个只被未标代码调用）。
> - **vtable 机制已查清，那条路是死的**：6,095 个 vtable 地址里 **.text 只有 142 次**（绝对字面量，117 个函数）而**数据段 6,096 次**；9,206 处"算地址存 [rN+0]"既不直接也不间接命中任何 vtable。看 `0xc3c` 的实际指令：地址经 **GOT 表项（`ldr r4,[pc,r1]`）**取到再交给注册器 `0x7aedcc`——**不存在就地写 vptr 的任何形式**。与 `precision-A.md` Difficulty #3（没有任何字指向类型名池）一致，类名归因本来就不可能。
> - **门 6 之前只覆盖 44% 的 A 证据**（6 张表、且把"无断言"行当通过）。现在覆盖**全部 24 张表**：**22,957 行逐行重算 100% 一致**（补上运动签名 +1,354、块纯度 +2,225 两个处理器后；旧写 19,378 / 10,789 是那两个处理器之前的分法），**4,479 行只有类名或分类学依据**、**2,731 行是现有处理器解析不了的形状**，断言 `checked + taxonomy + unparsed == 30,167`；任一张表 100% 落空即 FAIL。
> - **标签文件与报告已加对账门**：`function-labels.tsv` 行数必须等于"分母 − 报告无标签数"，用必失败样本验证过。
>
> 也就是说：**目标（≥90%）未达成**，且差距不是执行问题——见 `METER.md` 里十余条被实测否决的通道。下面的 2026-10-23 记录保留作历史。
>
> **按本文件自己的口径（Tier A + Tier B conf=A）重算当前值**：Tier A **verified 57.7%** + B 切片 conf=A **0.3%** = **58.0% 指令**（`node tools/mhgu/coverage/canonical-metric.mjs`）。**Tier A 的精度已在 2026-11-04 重测：78.3%（CP95 77.8，随机扣留 20% × 5 次，25,123 行）**，不是 94.7%——后者是旧函数表上的测量，不能沿用，见 METER「Tier A 的精度：地理留出测的是召回，随机留出测的才是精度」。两个数要一起读：58.0% 是与历史记录可比的项目口径，66.2% 是当前证据支持的"≥90% 精度"口径。

**度量口径（`docs/analysis/code-metrics.md` 为准；下面的主指标定义仍然有效，其余是该页 2026-10-23 的历史记录）**：
- **主指标** = Tier A + Tier B conf=A，分母 = `.text` 指令 **5,228,277**（唯一主指标）；函数口径（分母 **23,885**）作为第二指标并列报出，不混用、不取平均；「留出 20% 人工标注测全函数子系统正确率 ≥90%」是**验证门（validation gate）**，不是主指标；conf=B/C 不计入。（`docs/analysis/code-metrics.md` §6 验收口径，2026-10-23 定案）
- **2026-11-04 的两处修订**：① **Tier A 取"已验证"版**——`demote-*.tsv` / `pins.tsv` 里登记评审推翻或 pin 住的函数不计入，即取 `coverage-report.tsv` 的 `tier A (verified)` 行（57.7%）；未扣降级的原始脊柱是 58.1%，两者相差 473 个函数 / 0.61% 指令，**发布口径用前者**（`canonical-metric.mjs` 已按此实现，缺该行直接 exit 2）。② **函数分母已重切为 52,692**（指令分母不变），所以本段下面的 `23,885`、`8,856 / 51.5%`、`94.7%` 全部是旧函数表上的历史记录。
- 分母：23,885 函数 / 5,228,277 指令；3,201 类
- **Tier A**（调用图 + 地址局部性**双预测一致**）：8,856 函数 / **51.5% 指令** / **实测精度 94.7%**（10 折留出 1,155 样本）
- **Tier B**（两预测分歧）：14,863 函数 / 48.5% 指令 → 必须逐函数裁定
- 单次切分曾报 95.7%/83.7%，**均不可复现**，已作废；`ui` 曾因裸 `/UI/` 误匹配 `BUILD/GUID` 虚增到 8,710 函数（bug，已修）

**已排除的捷径（勿重复尝试）**：`add pc,#imm` xref（+14 函数）、vtable 成员归属（12/3987 决定性）、类名种子（57.4%）、地址局部性单用（88.1% 上限）、crc32 邻近命名 vtable（0/3987）。

**Tier B 裁定进展与教训**：
- 第一批 14 代理（1,062 函数/片、仅元数据）→ **11/14 因上游 499 超时失败**，存 378 行；且 `callee 票数` 递归继承 Tier A 错分（循环论证），`quest` 虚占 222
- 第二批（120 函数/片 + **自带 24 条反汇编**）→ 产出质量显著提升（conf=A 引具体字符串/指令，例如 zlib inflate 状态机、`cUIOHunterNoteLow`）；但仍有多代理 499
- **当前汇合**：A + B(conf=A) = **52.5% 指令 / 37.3% 函数**
- **复算（2026-10-23，repo 内输入）**：`tools/mhgu/coverage-final.py` 从 `docs/analysis/code/inventory/tiers.csv`、`docs/analysis/code/tierb-pass1/`、`docs/analysis/code/tierb-pass2/` 重跑，结果仍为 **52.5% 指令 / 37.3% 函数**，并入的 conf=A 只有 **54 个函数**。`PROJECT-EVAL-20261023.md` §C15 反推的「7 片各 ~15 个 A ⇒ 应有 ~105 个 A」不成立（它把 52.5%−51.5% 的 +1.0pp 全当成 A 的产量）。
- **下一步**：继续 pass2 波次（top 2,400 覆盖 Tier B 指令 ~70%），再 pass3；**达标 = A + confA ≥ 90% `.text` 指令**（函数数并列报出，conf=B/C 不计入），之后过**验证门**（留出 20% 人工标注子系统正确率 ≥90%）再请 swe2 审计

**报告汇合命令**：
```
cd "G:/omp works" && "G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe" MHGU/tools/mhgu/coverage-final.py
```

---

## 6. 目录结构（已重构）

```
MHGU/
  docs/
    README.md            ← 主索引（含语言规范与外部资料定位）
    PROGRESS.md          ← 总进度与差距（A~G 节）
    save-layout/         ← 权威布局（coverage-map / member4-* / CURRENT-RULING / pouch-verified / 位域定案）
    analysis/
      members/ fields/ save-io/ dumps/ gameplay/ monsters/
      code-metrics.md    ← 代码可解释度度量（唯一口径）
    mechanics/           ← quests/monsters/skills-arts/equipment/systems + monster-*
    data/                ← mhgu.db、class-inventory.tsv、member-offsets.tsv、functions.csv.gz、json/
    reference/mhxx-wiki/ ← **外部资料，只做交叉验证，不要改动**
    history/
  tools/mhgu/            ← 可复现工具链 + README
  editor-src/MHGU存档修改/ ← WinForms 编辑器
  save-snapshots/        ← clean/dirty 存档快照
```

---

## 7. 未完成 / 已知问题

| # | 项 | 状态 |
|---|---|---|
| 1 | Tier B 裁定 → 代码 90% | 进行中（**58.0% 指令**，2026-11-04 口径；52.5% 是 2026-10-23 旧函数表的值）|
| 2 | 编辑器扩窗实机验证 | **待用户**（唯一未验环节）|
| 3 | `MonsterForm` 137 槽显示实机确认 | 待用户 |
| 4 | 体型/冠阈值数值 | **阻塞**：需 romfs base NCA |
| 5 | state→motion 剩余 12 个派发器 + 共享 handler 状态 | 未解（可能数据驱动）|
| 6 | member#4 layout 表 4B 漂移确切位置 | **已解决 2026-10-24**：第 107 行 0x5057 嵌套 4 B 读，第 107..134 行 +4，见 coverage-map.md |
| 7 | 尾部 928KB 剩余结构 | 已定性为缓存；逐字节标注**不建议**做 |
| 8 | 32 个类的成员 offset 缺失（`cEmDouMouKaData` 42 成员只解出部分平面）| 未完成 |
| 9 | `.hnt` 与 system 槽不同步（`hunterA.hnt` vs slot1 仅 86.76% 相同）| 已记录警示，未做一致性检查工具 |
| 10 | **V7 pchtxt 已知缺陷（R2，2026-10-24 裁定：有害且可达）**：B 区仍是 0x23F0（2300 条），D 区仍是 0x8FE（V7 位于 `obj+0x64C2..0x6DC0`），但补丁把 3 个循环的界都改成了 2992。① 初始化循环 `0x199B30..0x199B70`（界 `0x199B68`，pchtxt `00199c68`）多写 0xAD0 B 进 C 区，C 区随后会重建；② D 区填充 `0x199E98` 的 3 个 case（界在 pchtxt `0019a034`/`0019a09c`/`0019a120`）每次写 0xBB0 B，**越过 D 区尾部 0x2B2 B（690 B）**，盖掉 `obj+0x6DC0` 处的 A 区备份堆指针，以及道具预设区（`0x6DC4` 起）前 686 B（预设 0..3 全部 + 预设 4 的 6 B）。**可达**：道具箱重建 fn `0x7437BC` 先在 `0x744184` 调用 `bl 0x199ae4`，紧接着在 `0x744194` 调用 `bl 0x199e98`（case 1）；case 2 由 `0x71B5BC`（fn `0x71B190`）调用；对象都来自 GOT `0x183A81C`→`0x1858438`。R5：`0x5B807C`/`0x5B8084` 是道具箱 B/D 页基址，这两行补丁有效。 | **已确认（静态，MCP 反汇编复核）**：DsvFillOrderReview 裁定；主会话复核调用顺序 `0x744184→0x744194`、D 区循环界 `0x199F9C` 与 GOT。实机现象未观测（预设丢失或指针损坏）。**修补：把 D 区填充的 3 个 inline capacity 回退为 2300，或扩大 D 区并让预设区后移**，待定 |

---

## 8. 子代理与模型路由经验（重要）

- 用户指定：**swe2 不可用期间只用 `dsv-dev`（wb2api/global:deepseek-v4.1-flash，effort 恒定 hi/med）**
- **dsv 子代理没有 exec**（只有 read/grep/glob/edit/write）→ 必须由主会话代跑脚本，并把输出落到它能读的路径
- **切片必须小**：1,062 函数/片 → 大面积 499 超时；**120 函数/片**可稳定完成
- 每个任务必须给：唯一报告路径、固定 label 集合、`conf=A/B/C` 定义、**「每 30 个 append 落盘」**要求
- 报告落 `.tmp/reports-mhgu/`；**定案内容必须迁入 `docs/`**（`.tmp` 会被清理）

---

## 9. 快速上手（新会话前 10 分钟）

**当前口径与工具链**（`code-metrics.md` 已降为历史文档，只有需要旧测量方法时才读）：

1. 读 `DEVLOG.md` **最后一段**（2026-11-04 三次更正 + 审计加固）：当前数字、今天改了什么、哪些结论被推翻，都写在那。
2. 读 `docs/analysis/code/coverage/METER.md` 的**抬头 + 「覆盖线（三次更正）」节**：当前口径与全部更正记录。
3. 跑 `node tools/audit/check.mjs`（**12 道门**，约 5 s），**全绿再动手**。
4. 要重算或改通道，按顺序跑：`recompute → report → function-labels → form-classify → labels-summary → summarize → check.mjs`（命令块见 METER 顶部）。改 `sources.json` 或任何 `attr-*.tsv` 之后**必须整链重跑**。
5. 存档侧权威布局 `docs/save-layout/coverage-map.md`；代码侧资产入口 `docs/analysis/code/inventory/README.md`；数据侧 `docs/data/README.md`；怪物机制下一步见 `docs/mechanics/monster-code-map.md`（romfs 部分需用户提供 XCI）。
6. 提交规范：`git -c user.name=Twelve-eight -c user.email=Twelve-eight@users.noreply.github.com commit`。

**历史工作流（已停用，勿按此开工）**：旧的 Tier B 逐函数裁定用 `tools/mhgu/tierb-gen.mjs` 切片、`coverage-final.py` 汇总——那条链的分母是 23,885 个区域平铺（真函数 52,692），结果不可复算。切片文本仍保留在 `docs/analysis/code/tierb-pass*/`，因为门 4 与门 8 还会读它（人工裁定是当前标签的来源之一），但**不要再生成新切片**。

### 7 #10 修补方案（2026-10-24 主会话推导，待用户选择）
每格大小按溢出量反推：A 4 B/格（0x2EC0 = 2992×4）；B 4 B/格（原 2300 条）；C 2 B/格（溢出 0x568 = 692×2）；D 1 B/格（溢出 0x2B2，D 原长 0x8FE = 2302）。
1. **只回退 3 处 D 区填充的界为 2300**（vaddr `0x199F34`/`0x199F9C`/`0x19A020`，即 pchtxt 第 57-59 行）：只修了填充时的越界；2300 号以后的格子在 D 区没有存储位置，读写这些格子的 D 区标记照样越界。**不推荐**。
2. **B/C/D 全部扩到 2992**：B +0xAD0、C +0x568、D +0x2B4，合计 **+0x1E4C**。B 区之后的所有字段（预设、堆指针、对象尾 0x7DB4）都要再后移，对象分配大小、序列化以及所有引用这些偏移的指令都要改，规模和 V7 当初那次 0xAD0 搬移相当或更大。**正确但工作量大**，需要先做一次完整的偏移引用普查（MCP literal_loads/movw 搜索）。
3. **回退到 V6 的 2300 格**，放弃扩容：最安全。
插件路线（Forge）同样受此影响：hook 方案必须连同 B/C/D 的存储一起扩容，或者改为外置存储（插件自己 malloc 一块 2992 格的 B/C/D，并重定向所有 B/C/D 的访问）。外置存储在插件里比在 pchtxt 里容易做，倾向在插件里实现。
