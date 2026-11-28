# MHGU — 工程契约、数据管线与存档工具状态

> **2026-11-21 更新**：早期包含多轮反汇编过程记录的旧版 `DEVELOP.md`（`47,166 B`）已无损归档至 `archive/workspace-history/2026-11-21-compaction/original/MHGU/DEVELOP.md`（SHA `2b45b09094af51f4b142706137b0e2034c95447dd995a5074b5d5d6e539435fe`）。本文件为精简后的现行契约与交付状态。

## 0. 目标与资产边界

- **两条主线**：
  1. **GU 内容提取与结构研究**：从 MHGU（v1.4.0, TitleID `0100770008DD8000`）合法提取的私有镜像中解析攻击行、命中形状、状态机与体表数据，服务于工作区自制内容规格（见 `docs/data/`）。
  2. **玩家工具与补丁维护**：道具箱扩容补丁（`patch/`）、跨平台网页存档编辑器（`editor/`）与 `dttune-all.mjs` 发布工具。
- **隐私与公开仓约束（`AGENTS.md` §7b）**：真实本地安装路径（SUYU 位于 `I:\suyu`）、XCI、存档与 `main.140.flat.bin` 留在 `MHGU-private/`，不写入公开文档；详细清单见 [PRIVATE-DATA.md](docs/PRIVATE-DATA.md)。脚本通过环境变量 `FLAT`、`MHGU_DB`、`MHGU_ROMFS` 覆盖路径。

## 1. 已证实的二进制与存档事实（`[C]`）

| 对象 | 已证实事实 | 权威依据 / 工具 |
|---|---|---|
| `main.140.flat.bin` | NSO0 build-id `FB08F1D20FD1204FE7070672777F869B`，**ARM32** 指令集，装载基址 0，`file_off = vaddr + 0x100`（yuzu IPS 补丁用 **flat 偏移**，无 `offset_shift`） | `tools/mhgu/arm32.mjs`、`tools/mcp/mhgu-re.mjs` |
| 存档容器与校验和 | `system`（`5,159,100 B`）= 36 B 头 + 3 槽块；单槽 / `*.hnt` 裸拷贝 = **`1,177,760 B`**（MHXX 为 `1,173,440 B`）；**无 CRC/校验和** | [docs/save-layout/CURRENT-RULING.md](docs/save-layout/CURRENT-RULING.md) |
| 道具箱与预设布局 | 原版 `2300` 格（`0x8FC`），`0x198F04` UI 容量函数 + 运行时 `obj+0x1A` 紧接 B/C/D 聚合表（`obj` 总大小 `0x72E4`）；存档位流 19 bit/格 `{id:12 \| count:7}` LSB-first 正序（`+0x278`）；紧接 `+0x1E3A` 预设与其它结构，原地扩容余量 `0` | `docs/save-layout/coverage-map.md`、`tools/box-slot-tool.mjs` |
| V7 搬迁定案 | 道具箱扩至 **`2992` 格（`0xBB0`，`7,106 B`）**：通过 `123` 行补丁将 `obj` 内部 B/C/D/堆/预设基址整体后移 `+0xAD0`（总大小 `0x7DB4`）、预设上限 `24 -> 14`、短路 `0x199004/0x199008` 与 `30` 处内联容量（`patch/1.4.0.pchtxt`） | `tools/build-v7-final.mjs`、[patch/INSTALL.md](patch/INSTALL.md) |
| 成员#4 与高危禁写区 | 成员#4（`0x2C0B..0x5EA6`）已由 `name-dictionary.txt`（4,782 标识符）与读者迹线定案；`cleared`/`seen`/`achieve` 位图须双写（防任务卡对话）；`288B` 风格位图因引擎含不落盘中间槽 M，**严禁局部修改**；击杀/捕获/尺寸共 `137` 槽（`94` 大 + `43` 小） | [docs/save-layout/name-dictionary.txt](docs/save-layout/name-dictionary.txt) |

## 2. 当前各成果线状态与工具入口

| 成果线 | 位置 / 产物 | 离线验证状态 | 实机 / 遗留阻塞 |
|---|---|---|---|
| **网页存档编辑器** | `editor/` · [dist/mhgu-save-editor.zip](dist/mhgu-save-editor.zip)（`68,463 B`，SHA `f3477a66...`） | **PARTIAL**：已修文件乱序竞态、单行名字净化/UTF-8 校验、16 码点/BOM 边界；21 成员 `.NET` 读回与合成存档浏览器测试通过 | 缺 SUYU 真实存档导入/导出回读实机闭环 |
| **道具箱扩容 V7** | `patch/1.4.0.pchtxt` · [dist/mhgu-item-box-v7.zip](dist/mhgu-item-box-v7.zip)（`27,215 B`，SHA `7d4c00a5...`） | **PARTIAL**：生成脚本与补丁偏移已冻结；`experimental-v8` 保持试验隔离 | OpenGL 启动加载 123 行补丁通过，仍缺游戏内开箱 30 页视觉与边界实机确认；`0x19B1F4` 预设互拷缺 idx 边界（known-gap） |
| **`dttune` 同步发布** | `tools/mhgu/dttune-all.mjs` · [dttune.md](docs/reference/formats/dttune.md) | **PARTIAL**：已改全批先构建、同目录暂存替换、失败逆序回滚并保全诊断日志 | 缺真实全量发布清单与二进制语义认证 |
| **GU 怪物数据表** | `docs/data/gu-{attack-rows,hit-shapes}-em001/007/011.tsv`、`em001-bodydata.tsv`、`gu-portable-cells.tsv` | **PARTIAL**：2026-11-21 新增 `em001`（雌火龙/紫毒姬）150 行攻击、71 行形状、33 条体表入库；生成器 `rows-build.mjs` 与 SA 输入本轮已备份至 `MHGU-private/provenance-cache/em001-20261121/` | 生成器脚本尚未迁入 `MHGU/tools/` 受控目录；SA 导出的未知字段仍保留默认零值 |
| **ARM32 静态分析** | `tools/mcp/mhgu-re.mjs`、`tools/audit/check.mjs`、`tools/gu-moves/` | `movw`/`emc` 边界已补修；`P128` 分支与 `4,272/52,692 (8.11%)` 占比已独立解释 | `P126 -> P129 -> P128` 派发口径切换与旧样本池重采样保持 **HOLD**，待用户裁决；运行 `audit/check.mjs` 仅限主会话串行 |

## 3. 近期清理与工作规则

- 完整工作区当前状态与推进队列见 [CURRENT-STATUS-20261128.md](../docs/reference/CURRENT-STATUS-20261128.md) 与 [WORKSPACE-NEXT.md](../docs/project/WORKSPACE-NEXT.md)（历史留档见 [2026-11-28 归档包](../archive/workspace-history/2026-11-28-compaction/README.md)）。
- 洁净室开发铁律：外部模组统一置于 `MHGU-private/external-mods/` 仅做只读格式/地址事实对账，公开仓 `tools/mhgu/*.mjs`（MIT）严禁复制任何 GPL/ARR 代码，且每个新格式解析器均须附带无镜像合成自测 + 私有 RomFS 无损往返校验并接入 `mod-diff.mjs`。
- 对话中提及反汇编工具注意：`tools/mhgu/arm32.mjs` 的 `disasm(vaddr, count)` 第二参数是指令条数，非结束地址。
