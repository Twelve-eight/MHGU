# MHGU 逆向 — 交接文档（2026-10-23 收盘）

> 新会话读这一份即可接手。所有结论都已落盘到 repo，`.tmp` 只存可再生中间产物与未归档的代理报告。
> 仓库：`G:/omp works/MHGU` = **公开** https://github.com/Twelve-eight/MHGU（MIT 代码 + CC-BY-4.0 docs）。不可发内容在本地私有仓 `G:/omp works/MHGU-private`（永不推送），原路径经联接/硬链接可用，见 `docs/PRIVATE-DATA.md`。2026-10-23 已用 filter-repo 重写历史（旧哈希作废；改写前备份 `G:/backups/MHGU-pre-filter-20261023{,.bundle}`）。

---

## 0. 长期目标与当前判定

**目标**：① 游戏代码 90%+ 可解释；② 存档编辑器可解释/修改每字节；③ 怪物机制全部了解。

**当前实测（诚实口径）**：

| 维度 | 数字 | 是否达标 |
|---|---|---|
| 存档：成员层 file 链 | `0x278..0x3783A` = 227,386B **100% 结构级** | ✅ |
| 存档：成员层字段级 | ~78%（234KB 里的已标注部分）| 部分 |
| 存档：尾部 950KB | 容器表 C0..C7 尺寸闭合；**判定为透传缓存/宿主残留**（不参与读档、无校验、跨档相异 67%）| ✅（定性完成）|
| 代码：L0 结构清点 | 23,885 函数 / 5,228,277 指令 / **3,201 类**（名+大小）| **100%** ✅ |
| 代码：L1 子系统（高置信层）| **Tier A 8,856 函数 / 51.5% 指令，实测精度 94.7%** | 指令加权过半 ✅ |
| 代码：L1 覆盖率（含 Tier B conf=A）| **52.5% 指令 / 37.3% 函数** | ❌（目标 90%）|
| 怪物机制：数据侧 | mhgu.db 全表（HP/肉质/异常/弱点/掉落/栖息地/任务出现）| ✅ |
| 怪物机制：代码侧 | 类成员 `{名,offset,type}` 110 条 / 状态机 state→handler 全解 / motion 名 41/53 派发器 | ✅ 主要结构 |
| 怪物机制：数值表 | 体型/冠阈值在 **romfs**，被 12.3GB base NCA 缺失阻塞 | ❌ 硬边界 |

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
| `mon/em-units.py` / `counter-slots*.py` | 137 槽权威表 → `docs/data/json/monster-slot-map.json` |
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
0x3783A..0x11F8A0  尾部 950KB = 透传缓存（16B 记录网格 0x63671..0xBCC20；zlib 网格 50×73B；android Binder 串=宿主残留）
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
| `docs/data/json/monster-slot-map.json` | **137 条权威表**（slot/emid/cn/en/kind；94 大 + 43 小）|
| `docs/analysis/monsters/` | 6 份调查报告（类映射/em 单元/计数器槽/任务派发/AI 入口/体型）|

**137 槽布局（定案，推翻旧的 93+36+8）**：`0..70` 大怪 71 / `71..111` 小怪 41 / `112..134` 大怪 23 / `135..136` 小怪 2。
三重验证：① 小怪不可捕获（旧布局在槽 112/114/120/123/124/128 出现非零捕获 → 违反）；② volume 137×4=548 精确接 `0x62EE`；③ 静态表 `0x1597EA4` + 资源表 `0x1732050` 一致。

**硬边界**：体型/冠阈值数值表在 romfs（`*.emsizetbl`/`*.emyure`），需原始 XCI + hactool（base NCA ~12.3GB 不在本机）。

---

## 5. 代码 90% 目标的现状与路线

**度量口径（`docs/analysis/code-metrics.md` 为准）**：
- 分母：23,885 函数 / 5,228,277 指令；3,201 类
- **Tier A**（调用图 + 地址局部性**双预测一致**）：8,856 函数 / **51.5% 指令** / **实测精度 94.7%**（10 折留出 1,155 样本）
- **Tier B**（两预测分歧）：14,863 函数 / 48.5% 指令 → 必须逐函数裁定
- 单次切分曾报 95.7%/83.7%，**均不可复现**，已作废；`ui` 曾因裸 `/UI/` 误匹配 `BUILD/GUID` 虚增到 8,710 函数（bug，已修）

**已排除的捷径（勿重复尝试）**：`add pc,#imm` xref（+14 函数）、vtable 成员归属（12/3987 决定性）、类名种子（57.4%）、地址局部性单用（88.1% 上限）、crc32 邻近命名 vtable（0/3987）。

**Tier B 裁定进展与教训**：
- 第一批 14 代理（1,062 函数/片、仅元数据）→ **11/14 因上游 499 超时失败**，存 378 行；且 `callee 票数` 递归继承 Tier A 错分（循环论证），`quest` 虚占 222
- 第二批（120 函数/片 + **自带 24 条反汇编**）→ 产出质量显著提升（conf=A 引具体字符串/指令，例如 zlib inflate 状态机、`cUIOHunterNoteLow`）；但仍有多代理 499
- **当前汇合**：A + B(conf=A) = **52.5% 指令 / 37.3% 函数**
- **下一步**：继续 pass2 波次（top 2,400 覆盖 Tier B 指令 ~70%），再 pass3；目标「A + confA ≥ 90% 指令」后请 swe2 审计

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
| 1 | Tier B 裁定 → 代码 90% | 进行中（52.5% 指令）|
| 2 | 编辑器扩窗实机验证 | **待用户**（唯一未验环节）|
| 3 | `MonsterForm` 137 槽显示实机确认 | 待用户 |
| 4 | 体型/冠阈值数值 | **阻塞**：需 romfs base NCA |
| 5 | state→motion 剩余 12 个派发器 + 共享 handler 状态 | 未解（可能数据驱动）|
| 6 | member#4 layout 表 4B 漂移确切位置 | 已界定在 `0x3157..0x5EA2` 之间，未定位到具体行 |
| 7 | 尾部 928KB 剩余结构 | 已定性为缓存；逐字节标注**不建议**做 |
| 8 | 32 个类的成员 offset 缺失（`cEmDouMouKaData` 42 成员只解出部分平面）| 未完成 |
| 9 | `.hnt` 与 system 槽不同步（`hunterA.hnt` vs slot1 仅 86.76% 相同）| 已记录警示，未做一致性检查工具 |

---

## 8. 子代理与模型路由经验（重要）

- 用户指定：**swe2 不可用期间只用 `dsv-dev`（wb2api/global:deepseek-v4.1-flash，effort 恒定 hi/med）**
- **dsv 子代理没有 exec**（只有 read/grep/glob/edit/write）→ 必须由主会话代跑脚本，并把输出落到它能读的路径
- **切片必须小**：1,062 函数/片 → 大面积 499 超时；**120 函数/片**可稳定完成
- 每个任务必须给：唯一报告路径、固定 label 集合、`conf=A/B/C` 定义、**「每 30 个 append 落盘」**要求
- 报告落 `.tmp/reports-mhgu/`；**定案内容必须迁入 `docs/`**（`.tmp` 会被清理）

---

## 9. 快速上手（新会话前 10 分钟）

1. 读 `docs/PROGRESS.md`（总账）+ `docs/analysis/code-metrics.md`（代码口径）
2. 读 `docs/save-layout/coverage-map.md`（存档权威布局）
3. 读 `tools/mhgu/README.md`（工具 + 7 条坑）
4. 若要继续 Tier B（**精确命令，已验证可跑**）：
   ```bash
   cd "G:/omp works/MHGU"
   node tools/mhgu/tierb-gen.mjs 1200 1200 120 .tmp/mhgu/tierB3   # OFF COUNT NPROC OUTDIR
   # 派 dsv 代理读 .tmp/mhgu/tierB3/slice-NN.txt，写 .tmp/reports-mhgu/tierB3-slice-NN.md
   cd "G:/omp works" && "G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe" MHGU/tools/mhgu/coverage-final.py
   ```
   `tierb-gen.mjs` 用绝对路径读 `tierB` 输入，cwd 无关；生成后打印每片 `slice-NN ... header=OK` 自查。
5. 若要继续怪物：`docs/mechanics/monster-code-map.md` 的「下一步」；romfs 部分需用户提供 XCI
6. 提交规范：`git -c user.name=Twelve-eight -c user.email=Twelve-eight@users.noreply.github.com commit`
