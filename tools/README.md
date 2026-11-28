# MHGU 工具链导航（Tools Directory）

本目录收录 MHGU v1.4.0 的补丁构建、存档迁移、游戏二进制与 RomFS 资产解析、怪物招式追踪、Wiki 生成以及仓库质量门禁脚本。

> **输入与路径说明**：本仓库不随附游戏镜像、RomFS 提取目录或玩家存档。多数解析脚本可通过环境变量 `FLAT`（覆盖 `main.140.flat.bin` 路径）、`MHGU_DB`（覆盖 `docs/data/mhgu.db` 路径）与 `MHGU_ROMFS` 指定本地路径；详细私有依赖清单见 [docs/PRIVATE-DATA.md](../docs/PRIVATE-DATA.md)。

---

## 一、补丁、存档迁移与发布脚本（根目录 `tools/`）

| 脚本 | 用途 | 常用调用方式 |
|---|---|---|
| [migrate-save-v7.mjs](migrate-save-v7.mjs) | 将原版存档（2,300 格 / 24 预设）无损迁移至 V7/V8 布局（2,992 格 / 14 预设，清空第 24–30 页防排序读出幻影道具） | `node tools/migrate-save-v7.mjs <system或.hnt> --out <输出路径> [--slot=0\|1\|2\|all]` |
| [box-slot-tool.mjs](box-slot-tool.mjs) | 按 19-bit LSB-first 位流读写 `.hnt` 猎人块的道具箱（`0x278`，2,992 槽）或道具袋（`+10175`，32 槽） | `node tools/box-slot-tool.mjs read <save.hnt> [start] [end] [--pouch]` |
| [build-v7.mjs](build-v7.mjs) | 早期 V7 道具箱补丁生成器 | `node tools/build-v7.mjs` |
| [build-v7-final.mjs](build-v7-final.mjs) | 补丁站点与 V8 辅助表扩容实验生成脚本 | `node tools/build-v7-final.mjs` |
| [dump-shift.mjs](dump-shift.mjs) | 转储与核对补丁偏移搬迁表 | `node tools/dump-shift.mjs` |
| [release/package-release.mjs](release/package-release.mjs) | 打包实验性补丁与网页存档编辑器压缩包（`dist/*.zip`）并输出校验和 | `node tools/release/package-release.mjs [--out dist]` |

---

## 二、核心二进制与资产解析工具链（`tools/mhgu/`）

更多管线产出对照与历史排坑记录请参阅 [tools/mhgu/README.md](mhgu/README.md)。

### 1. ARM32 镜像与函数结构分析

| 脚本 | 用途 |
|---|---|
| [nso-flat.mjs](mhgu/nso-flat.mjs) | 将 ExeFS `main`（NSO0）解压并前置 `0x100` 字节头，生成 `main.140.flat.bin`（`flat_off = vaddr + 0x100`） |
| [arm32.mjs](mhgu/arm32.mjs) | 最小化 ARM32（ARMv7-A）共享反汇编库：`disasm(vaddr, count)`、`findCallsTo`、`rd32`/`rd16`/`rdb`（注意第二参数为指令条数） |
| [fn-body.mjs](mhgu/fn-body.mjs) | 基于 CFG 遍历校验函数边界，内置 `--check` 门禁防止无栈帧叶函数归属漂移 |
| [fn-cluster.mjs](mhgu/fn-cluster.mjs) | 按 `movw #imm` 立即数站点聚类至所属函数 |
| [func-inventory5.mjs](mhgu/func-inventory5.mjs) | 扫描函数边界、指令数、调用关系与 PC 相对字符串交叉引用 |
| [reader-fields.mjs](mhgu/reader-fields.mjs) / [member-reader-trace.mjs](mhgu/member-reader-trace.mjs) | 追踪存档序列化成员读取器（reader）访问的对象字段序列 |

### 2. RomFS 容器与格式解码器

| 脚本 | 对应格式 / 资产 | 主要 CLI 用法 |
|---|---|---|
| [arc.mjs](mhgu/arc.mjs) | `.arc` 容器（`ARC\0` v0x11）解包与保序重打包 | `list <file.arc>`、`extract <file.arc> <outdir> [regex]`（写出 `_arc_order.json`）、`pack <indir> <out.arc>`（保序或 `TEX->MRL->MOD` 阶段序）、`roundtrip-check <file.arc>`、`find <romfsDir> <regex>` |
| [lmt.mjs](mhgu/lmt.mjs) | `.lmt` 动作关键帧与 `+0x34` 四通道帧事件（v0x43） | `info <file>`、`dump <file> <motionIndex>`、`events <file> [motionIndex\|--all]`（详见 [玩家武器与 LMT 事件规格](../docs/reference/PLAYER-WEAPONS-AND-LMT-EVENTS-20261128.md)） |
| [mod-diff.mjs](mhgu/mod-diff.mjs) | `.pchtxt` / IPS / IPS32 代码补丁与 `.arc`（内嵌 `LMT`/`HDP`/`HTS`）语义对比审计 | `patch <file>`、`arc <base.arc> <mod.arc>`、`mod <modRoot> --romfs <romfsDir> [--json]`、`--selftest`（配套回归 [arc-lmt-moddiff.selftest.mjs](mhgu/arc-lmt-moddiff.selftest.mjs)） |
| [mod.mjs](mhgu/mod.mjs) | `.mod` 三维模型（v212） | `info <file>`、`obj <file> <out.obj> [--lod=1]` |
| [mrl.mjs](mhgu/mrl.mjs) | `.mrl` 材质库（v34） | 解析材质列表、着色器哈希与贴图槽位 |
| [gmd.mjs](mhgu/gmd.mjs) | `.gmd` 多语言文本容器 | `list <file.gmd>`、`json <file.gmd> <out.json>`、`batch <dir> <outDir>` |
| [hitdata.mjs](mhgu/hitdata.mjs) | 玩家攻击判定 `pl_weNN_hitdata` | `list <wNN.arc>`、`dump <file>`、`json`（提取全武器动作值） |
| [dtbase.mjs](mhgu/dtbase.mjs) / [dttune.mjs](mhgu/dttune.mjs) | 怪物基础表 `DTB\0` 与调优表 `DTT\0` | 解码基础属性、肉质表、异常耐性与 HP |
| [dttune-all.mjs](mhgu/dttune-all.mjs) | 全怪物 `*_dttune` 批处理与校验 | `--expected-stems <manifest.json>`、`--one em011_00`、`--no-write` |
| [emc.mjs](mhgu/emc.mjs) | 怪物 AI 指令表 `EMC\0` | 解析 21 段脚本结构与条件/动作节点 |
| [rem.mjs](mhgu/rem.mjs) | 任务报酬 `rem` 与剥取表 `hagi` | `rem <file>` 等解码命令 |
| [sdl.mjs](mhgu/sdl.mjs) | 关卡场景对象 `SDL\0`（v22） | 解析场景对象属性与资源引用 |
| [stqr.mjs](mhgu/stqr.mjs) / [guopus.mjs](mhgu/guopus.mjs) | 音频清单 `STQR` 与 NX Opus BGM | `list`/`tsv`/`check`（清单）与 `info`/`packets`/`ogg`/`wav`（音频解码；音频解码依赖见 [VENDOR-NOTICE.md](mhgu/VENDOR-NOTICE.md)） |
| [arts.mjs](mhgu/arts.mjs) / [quest-ext.mjs](mhgu/quest-ext.mjs) / [export-dlc-table.mjs](mhgu/export-dlc-table.mjs) / [export-item-table.mjs](mhgu/export-item-table.mjs) | 狩技、任务扩展、DLC 与道具表导出 | 用于生成或交叉核对 `docs/data/` 派生数据 |

### 3. 代码覆盖率管线（`tools/mhgu/coverage/`）

- **无需镜像直接复算**：
  - `node tools/mhgu/coverage/canonical-metric.mjs` —— 计算项目原始口径（Tier A + Tier B conf=A = `58.0%` 指令）；
  - `node tools/mhgu/coverage/independent-coverage.mjs` —— 独立从 24 张证据表重算 `>=90%` 精度分区（`66.2%` 指令 / `53.5%` 函数）；
  - `node tools/mhgu/coverage/report.mjs` / `check-artifacts.mjs` / `recompute.mjs` —— 汇总与校验覆盖率表。
- **需要 `main.140.flat.bin` 的上游重建脚本**：`retile.mjs`、`stringxref.mjs`、`fingerprints.mjs`、`vtable-scan.mjs`、`immscan.mjs`、`form-classify.mjs`（完整 18 步管线顺序见 [METER.md](../docs/analysis/code/coverage/METER.md)）。

### 4. 怪物槽位与专用分析（`tools/mhgu/mon/`）

- `size-final.mjs`：核验存档中 137 槽大型/小型怪物体型上下限记录（`0x60CA`）；
- `quest-dispatch.mjs` / `ai-entry4.mjs`：分析任务条件谓词表与怪物动作入口；
- `em-units.py`、`counter-slots.py`、`counter-slots3.py`、`mon-final.py`、`mon-offsets.py`、`mon-classes.py`：提取 137 槽映射、类注册大小与成员偏移。

---

## 三、怪物招式与状态机追踪器（`tools/gu-moves/`）

面向动作解析的一体化工具，联合读取 RomFS 与 ARM32 代码还原怪物每一招的完整数据链：

- **主入口**：`node tools/gu-moves/gu-moves.mjs <emNNN_SS> [outdir] [--host emNNN] [--all-variants] [--quiet]`
- **工作流**：
  1. 解码 `enemy\cmd_tbl\emNNN_SS_cmdtbl` 的 `op14` 叶子节点与 `reset(state, variant)` 可达性；
  2. 定位怪物类与 L1 状态分发器（`movw rX, #0x73e0` + 18 项表）及各状态 L2 变体分发器；
  3. 路径敏感地追踪动作请求（`r1` 播放编号）、攻击行绑定（`kind`/`row`）与弹壳生成；
  4. 关联怪物 `.arc` 内的 `.lmt` 帧数与 `attackdata` 伤害/异常/硬直行，输出 `variants.tsv`、`motions.tsv`、`moves.tsv`、`census.tsv` 与 `facts.json`。
- **辅助与回归脚本**：[annotate-reach.mjs](gu-moves/annotate-reach.mjs)、[annotate-reach-selftest.mjs](gu-moves/annotate-reach-selftest.mjs)、[regress.mjs](gu-moves/regress.mjs)，底层库位于 `tools/gu-moves/lib/`。

---

## 四、质量门禁与自动化审计（`tools/audit/`）

| 脚本 | 职责 |
|---|---|
| [check.mjs](audit/check.mjs) | 仓库 **12 道总门禁**（校验 `MANIFEST.tsv`、`ROUND1-ALL.tsv`、TSV 表头、覆盖率计量器、证据/推断重核、独立口径、`canonical-metric`、存档结构公式、数据库外键、`fn-body` 与字面量双读一致性）。注：多代理协作时仅由主会话串行运行 |
| [scan-dispatch.mjs](audit/scan-dispatch.mjs) | 扫描 `.text` 全量 `add pc, rX, rY` 跳转表分发站点（`6,777` 处 / `4,527` 函数） |
| [literal-counts-check.mjs](audit/literal-counts-check.mjs) | 以“指令解码 + 原始字节搜索”双读核对文档引用的常量出现次数 |
| [audit-new-docs.mjs](audit/audit-new-docs.mjs) / [check-citations.mjs](audit/check-citations.mjs) / [doc-scan.mjs](audit/doc-scan.mjs) | 文档引用、声明与新增章节自动化审计 |
| [manifest.mjs](audit/manifest.mjs) / [summarize.mjs](audit/summarize.mjs) | 维护 `MANIFEST.tsv` 与汇总 `ROUND1-ALL.tsv` 裁决结果 |

---

## 五、Wiki 生成器与只读 MCP 服务

- **`tools/wiki-gen/`**：基于数据库与提取结果生成部分 `docs/wiki/` 页面的 Python 脚本，包含 `deviant-data.py`、`gen-deviants.py`、`gen-quests-vh.py`、`gen-weakness.py`、`gen-weapon-trees.py`。
- **`tools/mcp/mhgu-re.mjs`**：零外部依赖的只读 stdio MCP 服务（JSON-RPC 2.0），向无 shell 权限的分析代理提供受白名单限制的反汇编、调用/字面量交叉引用、函数起止启发式与有界字节读取（严格屏蔽 `.keys` 等敏感路径）。
