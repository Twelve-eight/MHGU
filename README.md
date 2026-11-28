# MHGU 研究与玩家工具仓库

面向 **Monster Hunter Generations Ultimate（Nintendo Switch v1.4.0，Build ID `FB08F1D20FD1204FE7070672777F869B`）** 的玩家增强补丁、跨平台存档工具与 MT Framework / ARM32 底层机制开源研究仓库。项目旨在帮助玩家在模拟器与原生重编译生态（[SUYU-GURecomp](https://github.com/GUReComp/SUYU-GURecomp)）中获得更丰富的可玩性与透明可复现的技术资料。

> **资产与合规声明**：本仓库不随附任何游戏镜像、密钥、版权资源文件或玩家存档。需精确说明的唯一跟踪产物为 `docs/data/functions*.csv.gz` 中的 `strings` 列：该列保存从程序二进制提取的短可打印字符串（函数名与类名），其中 51 行包含 Nintendo NEX SDK 符号片段（`Nex`、`nn::`），属于同一批提取过程中产生的第三方符号字符串。由于覆盖率管线直接读取该列，移除会影响复现性（详见 [docs/PUBLISH-READINESS.md](docs/PUBLISH-READINESS.md) 中的两种处置方案）。仓库内其余全部文件均为可独立核验的研究记录与工程工具，其核心数值均可通过下方命令重新计算验证。

---

## 一、面向玩家（For Players）—— 可用成果与风险边界

### 1. 道具箱扩容补丁 V7 / V8（实验性）

- **补丁入口**：[patch/1.4.0.pchtxt](patch/1.4.0.pchtxt)（V7 主线）/ [patch/experimental-v8/1.4.0.pchtxt](patch/experimental-v8/1.4.0.pchtxt)（V8 辅助表扩容实验分支）
- **核心改动**：将原版 `2,300` 格（23 页，`0x8FC`）道具箱扩容至 **`2,992` 格（30 页，`0xBB0`）**，道具预设上限由 24 组调整为 14 组。V7 通过 123 行 ARM32 补丁将内部结构偏移整体后移 `+0xAD0`（对象总长由 `0x72E4` 增至 `0x7DB4`），并在排序累加循环（`0x199cb8..0x199ce8`）内置 `1 <= item_id < 2991 && count > 0` 越界拦截，防止非法 ID 写穿栈缓冲或产生幽灵条目。
- **原版存档无损迁移工具**：直接用原版存档加载 V7/V8 后点击排序（Sort）会把旧预设区解码为第 24–30 页幻影道具。启用前请先备份原存档，再使用迁移脚本生成隔离测试副本：

  ```bash
  node tools/migrate-save-v7.mjs <备份的system或.hnt> --out <迁移后的system或.hnt>
  ```

  该脚本完整保留前 2,300 格道具与前 14 组预设，并将第 24–30 页与尾部填充清零。
- **使用前必读**：V7 仍存在已记录的辅助表容量不足与预设互拷边界问题（`0x19B1F4`），V8 与 PC 导出版的 [forge/itembox-v7/](forge/itembox-v7/README.md) 实验插件亦未完成完整实机验收。**当前不推荐普通玩家在唯一主存档上启用**；完整安装路径、环境区分与风险清单请参阅 [patch/INSTALL.md](patch/INSTALL.md)。

### 2. 跨平台网页存档编辑器

- **工具入口**：[editor/](editor/README.md)（零第三方依赖，需 Node.js 18+）
- **启动方式**：在 `editor/` 目录运行 `node serve.mjs`，通过终端打印的 `http://127.0.0.1:<端口>/ui/index.html` 在浏览器打开（不支持直接双击 HTML）。
- **核心特性**：
  - 仅在浏览器内存中修改副本并下载 `.edited` 文件，不自动覆盖原文件、不上传数据；
  - 支持完整 `system` 容器（`5,159,100 B`，无校验和）与单槽裸块 `.hnt`（`1,177,760 B`）解析；
  - 需按文件实际来源手动选择布局（`legacy` 2,300 槽 / 24 预设，或 `v7` 2,992 槽 / 14 预设）；
  - 支持道具箱分页编辑、幽灵槽/零数量槽/越界槽扫描清理，以及猎人名字单行控制字符与 UTF-8 码点边界净化与安全写回。
- **注意**：当前尚未完成模拟器真实导出/回读全闭环验收，仅用于备份副本实验，不可替代原版与 V7 之间的存档格式转换。

### 3. 战斗与怪物深度机制百科

基于 `main.140.flat.bin` ARM32 机器码与 RomFS 提取数据的实证文档集，所有结论均带出处分级：

- **玩家向百科索引（46 个专题页）**：[docs/wiki/README.md](docs/wiki/README.md) —— 涵盖 137 敌人槽位总览、全肉质表、部位破坏与体力倍率、状态异常阈值、动作值（[motion-values.md](docs/wiki/motion-values.md)）、武器升级树、技能/风格/狩技与全任务表；其中 42/47 页已通过数据库与 RomFS 精确复算验证。
- **系统与怪物机制深读**：[docs/mechanics/](docs/mechanics/systems.md) —— 包含 [monster-state-machine.md](docs/mechanics/monster-state-machine.md)、[monster-code-map.md](docs/mechanics/monster-code-map.md)、[monster-ai-params.md](docs/mechanics/monster-ai-params.md) 等 9 篇机制剖析。
- **二名核心机制与三阶毒实证解码**：[docs/reference/DEVIANTS-MECHANICS-RESEARCH-20261127.md](docs/reference/DEVIANTS-MECHANICS-RESEARCH-20261127.md) —— 首次完整解码游戏内三阶毒公式（普通毒 `1.00 HP/s`、猛毒 `3.00 HP/s`、紫毒姬/黑狼鸟二名专属剧毒 `5.00 HP/s`，以及「毒无效」在 `0x2f4498` 处将剧毒降级为猛毒而非免疫的精确逻辑），并完成紫毒姬、黑炎王、白疾风、青电主、荒钩爪、金雷公、铠裂七大二名的专属攻击、弹壳与裂伤/显隐机制解析。
- **全 15 类玩家武器实体与 LMT 四通道帧事件规格**：[docs/reference/PLAYER-WEAPONS-AND-LMT-EVENTS-20261128.md](docs/reference/PLAYER-WEAPONS-AND-LMT-EVENTS-20261128.md) —— 完整梳理 `w00..w15`（含猎猫 `uPlayerQuest15` 与历史空槽 `w05`）类规格、6 种狩猎风格分发入口（虚表 `+0x168` / 状态机 `+0x250a`）以及 `LMT +0x34` 四组帧事件通道（`0x00b49fe8 -> 0x00280984`）在近战、远程与猎猫模式下的消费分工。

---

## 二、项目全局开发进度矩阵（截至 2026-11-28）

以下指标区分「无需游戏镜像即可从仓库复算」与「依赖私有快照/数据库/镜像」两类，未达成目标与未完成项均如实标注：

| 板块 | 当前进度与已证实指标 `[C]` | 验证状态与主要缺口 | 权威依据 |
|---|---|---|---|
| **道具箱扩容（V7 / V8）** | `2,300 -> 2,992` 格（30 页），123 行 ARM32 补丁与 `migrate-save-v7.mjs` 离线就绪，排序越界守卫已合入 | **部分验证**：OpenGL 加载 123 行补丁通过；缺游戏内 30 页开箱/排序/保存实机验收，存在辅助表与预设拷贝已知边界 | [patch/INSTALL.md](patch/INSTALL.md)、[DEVELOP.md](DEVELOP.md) |
| **网页存档编辑器** | `system`（`5,159,100 B`）/ `.hnt`（`1,177,760 B`）解析、4 项离线安全/边界测试与 `roundtrip.mjs` 就绪 | **部分验证**：浏览器内存编辑与合成单元测试通过；缺真实模拟器存档导入/导出回读实机闭环 | [editor/README.md](editor/README.md)、[DEVELOP.md](DEVELOP.md) |
| **存档字节布局映射** | `.hnt` 猎人块 **87.8%** 结构级（`226,754 B` 成员层 100% + `950,374 B` 尾部透传缓存约 85%）、**~14.9%** 字段级（~175 KB） | **需私有快照复算**：基于私有存档快照测算（`tools/mhgu/mon/size-final.mjs`），无法直接从克隆仓库重算 | [docs/save-layout/coverage-map.md](docs/save-layout/coverage-map.md)、[docs/PROGRESS.md](docs/PROGRESS.md) |
| **ARM32 代码地图** | `.text` 共 **`52,692` 个函数 / `5,228,277` 条指令**（由 `23,885` 区域重切），识别 **`3,201` 个类** | **可无镜像核验分母**：追踪文件 `docs/data/functions-retile.csv.gz` 与 `docs/data/class-inventory.tsv` | [docs/analysis/code/inventory/RETILE.md](docs/analysis/code/inventory/RETILE.md) |
| **代码覆盖率（双口径）** | 原始口径（Tier A + Tier B conf=A）：**`58.0%`** 指令（`57.7% + 0.3%`）；独立严格口径（每标签 `>=90%` 精度）：**`66.2%` 指令 / `53.5%` 函数** | **90% 目标尚未达成**（定义于 `58.0%` 原始口径）；两口径仅代表子系统分类而非规则语义理解，数字权威在 `METER.md` | [docs/analysis/code/coverage/METER.md](docs/analysis/code/coverage/METER.md) |
| **怪物状态机与分发** | 53 张状态表（跨 2 个常量）、60 节文档、1,223 行状态表（119 行带动作名，9.7%）；**`6,777`** 处 `add pc, rX, rY` 分发站点（分布于 `4,527` 函数）；137 权威槽位 | **持续补全**：`scan-dispatch.mjs` 可扫描验证；`gu-moves/` 已覆盖 cmdtbl + L1/L2 + LMT 自动化追踪 | [docs/mechanics/monster-state-machine.md](docs/mechanics/monster-state-machine.md) |
| **二名战斗机制解码** | 三阶毒精确跳伤周期（`1/3/5 HP/s` + 毒无效降级）与七大二名攻击行、弹壳、裂伤及显隐切换实证完成 | **已完成离线实证**：为后续跨代内容模组设计提供完整原版基线 | [docs/reference/DEVIANTS-MECHANICS-RESEARCH-20261127.md](docs/reference/DEVIANTS-MECHANICS-RESEARCH-20261127.md) |
| **数据表、百科与审计** | 39 张数据表（129 怪物、21,153 道具、1,355 任务）；Wiki 42/47 页精确复算；参考指南 72 确认 / 16 矛盾 / 4 按构造未验证；138 个脚本依赖已分类 | **清理推进中**：`LINK-STATUS.tsv` 持续记录差异处置（`fixed`/`open`/`rejected`） | [docs/data/README.md](docs/data/README.md)、[docs/analysis/audit/LINK-STATUS.tsv](docs/analysis/audit/LINK-STATUS.tsv) |
| **`.arc`/`.lmt`/`.mod` 管线** | 已实现 `.arc` 解包与保序重打包（`TEX->MRL->MOD`）、`.lmt` v0x43 关键帧与 4 通道帧事件解码、`mod-diff.mjs` 补丁/容器语义对比、`.mod`/`.mrl`/`.emc`/`.hitdata`/`.dttune`/`.gmd` 解析 | **已完成洁净室闭环**：`arc-lmt-moddiff.selftest.mjs`（10/10）与 `mod-diff --selftest`（18/18）全绿 | [tools/README.md](tools/README.md)、[docs/reference/PLAYER-WEAPONS-AND-LMT-EVENTS-20261128.md](docs/reference/PLAYER-WEAPONS-AND-LMT-EVENTS-20261128.md) |

---

## 三、面向开发者（For Developers）—— 架构、复算与门禁

### 1. 无镜像一键复算命令

以下代码覆盖率核验命令**全部读取仓库内已跟踪的表格**，无需游戏镜像、无需数据库、无需存档：

| 口径 | 实测结果 | 命令 | 输出说明 |
|---|---|---|---|
| 项目原始目标口径（`HANDOFF.md` §5：Tier A 已验证 + Tier B conf=A 占 `.text` 指令比例） | **`58.0%`** 指令 | `node tools/mhgu/coverage/canonical-metric.mjs` | 打印 `Tier A verified 25584 functions, 57.7% of instructions`、`Tier B conf=A 74 functions, 0.3% of instructions` 与 `canonical total 58.0% (target >= 90%, not met)` |
| 独立重算口径（每条标签规则在其自身人群上达 `>=90%` 精度） | **`66.2%`** 指令 / **`53.5%`** 函数 | `node tools/mhgu/coverage/independent-coverage.mjs` | 逐行打印分区表，末尾输出 `covered at >=90% independently: 3460532 = 66.19% of instructions` 与 `PASS independent recomputation reproduces the report partition` |

> **口径边界**：唯一数字权威为 [docs/analysis/code/coverage/METER.md](docs/analysis/code/coverage/METER.md)，任何文档与该文件冲突时均以 `METER.md` 为准；两命令读取的汇总行位于 [docs/analysis/code/inventory/coverage-report.tsv](docs/analysis/code/inventory/coverage-report.tsv)。覆盖率仅表示代码属于哪个子系统（如 `monster-em`、`quest`、`ui`），不代表规则级语义已被完整破译。

### 2. 仓库结构与自检门禁（12 Gates）

#### 完整目录导航

| 路径 | 职责与内容 |
|---|---|
| [patch/](patch/INSTALL.md) | 模拟器用实验性道具箱扩容补丁（`1.4.0.pchtxt` 为 V7 主线，`experimental-v8/1.4.0.pchtxt` 为 V8 实验分支）；不适用于原生 PC 导出版，未提供或验证实机安装步骤 |
| [editor/](editor/README.md) | 跨平台网页存档编辑器源码（`core/` 解析写入、`ui/` 界面、`help/` 字段说明、`test/` 单元与往返测试） |
| [forge/](forge/itembox-v7/README.md) | Forge PC 原生插件实验代码（`dbgport/`、`boxprobe/`、`itembox-v7/`） |
| [tools/](tools/README.md) | 全套工具脚本导航页（存档迁移、补丁构建、`tools/mhgu/` 资产与覆盖率管线、`tools/gu-moves/` 招式追踪、`tools/audit/` 审计门禁、`tools/wiki-gen/` 与 `tools/mcp/`） |
| [tools/mhgu/](tools/mhgu/README.md) | ARM32 反汇编器、容器/模型/动画/战斗数据解码器与覆盖率流水线（`coverage/`） |
| [tools/gu-moves/](tools/gu-moves/gu-moves.mjs) | 怪物招式追踪管线：联合解析 `cmdtbl`、L1/L2 分发器、`LMT` 动作与 `attackdata` |
| [tools/audit/check.mjs](tools/audit/check.mjs) | 仓库 12 道结构与数字一致性门禁脚本 |
| [docs/](docs/README.md) | 全部研究文档总索引（地址均为 NSO vaddr，满足 `flat_off = vaddr + 0x100`） |
| [docs/PROGRESS.md](docs/PROGRESS.md) | 一页式总进度与差距账本 |
| [docs/analysis/code/coverage/METER.md](docs/analysis/code/coverage/METER.md) | 代码覆盖率计量器与三次口径更正记录（唯一数字权威） |
| [docs/analysis/code/inventory/](docs/analysis/code/inventory/RETILE.md) | 函数表、层级定案与 `coverage-report.tsv` |
| [docs/analysis/external/](docs/analysis/external/suyu-addr-check.md) | 对外部项目（SUYU-GURecomp，GPL-3.0）的地址与格式核验记录（仅记事实、不引入 GPL 代码） |
| [docs/analysis/audit/](docs/analysis/audit/LINK-STATUS.tsv) | 文档审计、数字核对、`MANIFEST.tsv` 与差异处置台账 `LINK-STATUS.tsv` |
| [docs/data/](docs/data/README.md) | 游戏数值基础表与导出产物目录（含受追踪的 `functions-retile.csv.gz` 等） |
| [DEVELOP.md](DEVELOP.md) | 工程契约、已证实二进制/存档事实与各线交付状态 |
| [HANDOFF.md](HANDOFF.md) | 长篇交接文档（方法论、各子系统证据与待解问题；§5 定义原始口径） |
| [DEVLOG.md](DEVLOG.md) | 按日期追加的工作日志（只看最新章节即可，记录每次撤回与修正原因） |

#### 12 道自检门禁

运行以下命令执行全树门禁检查（多子代理并发任务中请仅在主会话串行运行）：

```bash
node tools/audit/check.mjs
```

在完整环境中，脚本会输出 12 行 `PASS` 并以 `ALL PASS` 退出（涵盖 `MANIFEST.tsv` 文档存在性、`ROUND1-ALL.tsv` 裁决覆盖、切片 TSV 表头、覆盖率计量器分母与证据表、证据行重查、推断行重推导、独立分区复算、原始口径一致性、计量器标题交叉核对、存档结构公式、数据库外键检查、`fn-body --check` 与双读者字面量计数核对）。

在无私有输入的纯克隆环境下，有两道门禁存在特定表现：
- **Gate 6（`verify-evidence.mjs`）**：需读取 `main.140.flat.bin`；缺失时会报 `ENOENT` 失败，是唯一无法在纯克隆环境运行的门禁；
- **Gate 12（数据库外键门禁）**：需读取未入库的 `docs/data/mhgu.db`（18 MB）；缺失时会打印 `note ... skipped`。**被跳过的门禁不代表已通过**。

#### 建议阅读顺序

1. 本文件（`README.md`）全篇；
2. [docs/analysis/code/coverage/METER.md](docs/analysis/code/coverage/METER.md) —— 读开头横幅与「覆盖线（三次更正）」，了解所有被撤回的旧数字与原因；
3. [docs/PROGRESS.md](docs/PROGRESS.md) —— 掌握各板块定量进度与核心差距；
4. [docs/analysis/audit/LINK-STATUS.tsv](docs/analysis/audit/LINK-STATUS.tsv) —— 查看审计中每条差异的处置结论（`fixed` / `open` / `rejected`）；
5. [docs/README.md](docs/README.md) —— 浏览 `docs/` 各目录职责；
6. [HANDOFF.md](HANDOFF.md) —— 深入了解方法论与各子系统证据链（§9 为作者工作流程记录，非面向读者）。

### 3. 哪些数字依赖游戏镜像 / 私有输入

`main.140.flat.bin` 为游戏 ExeFS `main` 的 25 MB 平铺镜像（未随仓库分发）：

| 数据 / 指标 | 是否需要游戏镜像 | 实际来源 |
|---|---|---|
| `58.0%` 原始口径覆盖率 | **否** | `canonical-metric.mjs` 读取已跟踪的 `coverage-report.tsv`、`tiers-merged.csv`、`functions-retile.csv.gz`、`demote-*` 与 `tierb-pass*` |
| `66.2%` 指令 / `53.5%` 函数独立口径 | **否** | `independent-coverage.mjs` 读取 `sources.json` 所列 24 张已跟踪证据表、`tiers-merged.csv`、`functions-retile.csv.gz` 与 `tierb-pass*` |
| `52,692` 函数 / `5,228,277` 指令分母 | **否** | 已跟踪的 `docs/data/functions-retile.csv.gz` |
| `22,957` 条证据行 100% 重检 | **是** | `tools/mhgu/coverage/verify-evidence.mjs`（`check.mjs` Gate 6） |
| 函数表与底层特征重建（`retile`、`stringxref`、`fingerprints`、`vtable-scan`、`immscan`） | **是** | `METER.md` 管线 18 个脚本中的前 5 个需镜像，其余 13 个仅读已跟踪表（另有管线外的 `form-classify` 亦需镜像） |
| `87.8%` 结构级 / `14.9%` 字段级（存档侧） | 无需镜像，但需两份私有存档快照 | `tools/mhgu/mon/size-final.mjs` |
| `129` 怪物 / `21,153` 道具 / `1,355` 任务 | 无需镜像，但需未跟踪的 18 MB `docs/data/mhgu.db` | 详见 [docs/PUBLISH-READINESS.md](docs/PUBLISH-READINESS.md) |

### 4. 合法自备游戏镜像构建步骤（仅限正版持有者）

所有静态分析代码脚本默认在仓库根目录读取 `main.140.flat.bin`（在 NSO 文件头前填充 `0x100` 字节，使 `flat_off = vaddr + 0x100`）：

1. 使用 `hactool` 与你自己的 `prod.keys` 从合法备份的卡带/NCA 中提取 ExeFS 的 `main`（NSO0 格式）。本仓库不提供任何密钥或游戏文件的获取方式。
2. 核对 NSO 文件偏移 `0x40` 处的 Build ID：必须为 **`FB08F1D20FD1204FE7070672777F869B`**（`patch/1.4.0.pchtxt` 与本仓库全部地址均针对该版本）。
3. 运行转换脚本生成平铺镜像：

   ```bash
   node tools/mhgu/nso-flat.mjs <你的 exefs/main 路径> main.140.flat.bin
   ```

4. 共享读取器 [tools/mhgu/arm32.mjs](tools/mhgu/arm32.mjs) 与 [tools/mhgu/reader-fields.mjs](tools/mhgu/reader-fields.mjs) 默认读取 `<repo>/main.140.flat.bin`，并支持通过环境变量 `FLAT=<path>` 覆盖路径；Gate 6（`verify-evidence.mjs`）始终读取 `<repo>/main.140.flat.bin`。另有 6 个较早的脚本仍保留旧硬编码路径，在其他机器运行前需先修改脚本内路径常量：`fn-cluster`、`func-inventory5`、`member-reader-trace`、`state-motion2`、`state-motion3`、`vtable-crc`。

### 5. 克隆仓库不包含的私有输入清单

完整私有路径与影响说明见 [docs/PRIVATE-DATA.md](docs/PRIVATE-DATA.md)，下表列出缺失后会影响运行的功能：

| 缺失的私有输入 | 缺失后的影响 |
|---|---|
| `main.140.flat.bin`（25 MB） | 所有直接读二进制代码的工具无法运行：反汇编脚本、`METER.md` 管线中 5 个 `[IMG]` 脚本、`form-classify` 以及 `check.mjs` Gate 6；两条无镜像口径复算命令仍可正常运行 |
| `docs/data/mhgu.db`（18 MB 社区数据库） | 无法从数据库重算机制页与统计数字（129 怪物 / 21,153 道具 / 1,355 任务）；`check.mjs` Gate 12 打印提示并跳过 |
| `save-snapshots/` | 无法重算存档侧覆盖率（`87.8%` 结构级 / `14.9%` 字段级，`tools/mhgu/mon/size-final.mjs` 读取两份固定快照），且 `editor/test/roundtrip.mjs` 缺少真实样本（仍可运行合成内存测试） |
| `docs/data/json/*` 与 `docs/data/{armor,weapons,viewer}/` | 派生数据页缺少本地输入源（`mhgu.db` 为上游权威） |
| `docs/reference/mhxx-wiki/` | 外部交叉验证参考文本缺失；本仓库没有任何结论单独依赖该目录（[docs/README.md](docs/README.md) 已标注其仅作交叉验证） |
| `editor-src/` | 对仓库流水线无影响；仅用于本地对照的第三方编辑器参考源码，无任何跟踪脚本读取该目录 |

### 6. 后续优先事项（按顺序）

1. **完成剩余文档清扫**：按工件逐簇复核未关闭项，`LINK-STATUS.tsv` 中无法从仓库复算的数字一律降级为历史记录而非继续维护；
2. **敲定两项发布合规事项**：(a) `tools/mhgu/vendor/`（101 个 MIT 第三方音频解码依赖文件）曾出现在未推送历史中，下次公开推送前需补齐 `NOTICE` 归属声明或重写相应提交历史（详见 [tools/mhgu/VENDOR-NOTICE.md](tools/mhgu/VENDOR-NOTICE.md)）；(b) 明确 `docs/data/functions*.csv.gz` 中 `strings` 列所含 51 行第三方 SDK 符号片段的处理方式（剥离或保留并在文档中声明）；
3. **每次修改后重跑双口径与门禁**：`canonical-metric.mjs`、`independent-coverage.mjs` 与 `check.mjs` 运行成本极低，可防止文档数字与真实表格再次漂移；
4. **人工实机验收**：网页存档编辑器、DLC 页面与存档保存/重载往返无法通过自动化键盘脚本驱动（历史尝试记录于 `DEVLOG.md`），需在运行游戏的机器上人工完成闭环测试；
5. **谨慎执行公开推送**：推送前请直接通过 `git rev-list --count origin/master..HEAD` 核对真实领先提交数，避免引用很快过时的静态快照数字。

---

## 许可证与第三方声明（License）

本仓库全部自创代码、工具脚本与研究文档均采用 **MIT License**（见根目录 [LICENSE](LICENSE) 与文档目录 [docs/LICENSE](docs/LICENSE)）。本项目于 2026-11-04 由早期 GPL-3.0-or-later 重新许可为 MIT（此前亦曾采用 MIT），因此提交历史中同一文件可能先后出现两种许可证头。

第三方材料各自保留原有许可条款，不受本次重许可变更影响：
- `docs/data/` 包含社区维护数据库提取内容及由其派生的数据表；
- `tools/mhgu/vendor/` 存放以 MIT 协议分发的音频解码依赖包，并各自保留随附许可声明（未随 Git 跟踪推送，可通过 `npm i opus-decoder ogg-opus-decoder` 复现）；
- `docs/data/functions*.csv.gz` 的 `strings` 列包含 51 行提取自二进制的第三方 Nintendo NEX SDK 符号片段（`Nex`、`nn::`）。

Monster Hunter 为 Capcom 的注册商标；本项目与 Capcom 或 Nintendo 无任何隶属关系，所有游戏二进制地址与数据结构描述均仅用于技术研究与互操作性目的。
