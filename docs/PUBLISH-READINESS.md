# 发布就绪与后续工作计划（2026-11-04 制定）

用途：把"已有什么、离公开发布还差什么、哪些只能由用户做"写成一张可执行的表。状态分三档：**已具备 / 待补（我能做）/ 需用户**。

## 零、发布状态（2026-11-04 核实，改写了整个前提）

**2026-11-04 更新：已推送。**  = 当前工作树，公开树 664 个文件，不含镜像/数据库/存档/vendor， 为 MIT。以下已公开/未推送的统计是推送前的快照，保留作为记录。

**仓库已经是公开的。** `curl` `https://github.com/Twelve-eight/MHGU` 返回 200，页面标题为 "MHGU (Switch 1.4.0) reverse-engineering notes, tools, save layout, patches"。`origin/master` = `f199842`（2026-10-29/30），本地领先 **242 个提交未推送**。

已推送的树里**没有**：`main.140.flat.bin`、`docs/data/mhgu.db`、`save-snapshots/`、`tools/mhgu/vendor/`（`git ls-tree -r origin/master` 逐项为空）。所以"把不该发的发出去"这件事，就这几类而言没有发生。

**已经公开的问题**：`DEVELOP.md`（在 `origin/master` 里）第 10 行写着 `I:\BaiduNetdiskDownload\…xci` 的下载路径，第 12 行写着 yuzu 用户目录 id `85A7D07F6ED7C1D6F6045DE67FE969F1`。这类内容无法通过改 HEAD 撤回，只能改为占位符并记录"历史提交仍含此内容"。

**未推送的 242 个提交里有** `tools/mhgu/vendor/` 的 101 个 MIT 文件（`VENDOR-NOTICE.md` 自己记了这件事）。MIT 允许再分发，但项目口径是"公开仓只放自己的东西"，所以推送前二选一：加 `NOTICE` 保留署名，或 `git filter-repo` 清历史（**必须先 `git bundle` 备份**）。



## 一、当前产物盘点

| 产物 | 位置 | 状态 |
|---|---|---|
| 覆盖率计量与七类证据 | `docs/analysis/code/coverage/METER.md` + `inventory/` | 口径 58.0% / ≥90% 口径 66.2%，12 道门 ALL PASS |
| 函数级标签 | `inventory/function-labels.tsv`（40,374 行） | 五类 provenance，可逐行回镜像重算 |
| 存档布局 | `docs/save-layout/` | 结构级 87.8%、字段级 14.9%；边界与分解本轮修完 |
| 机制文档 | `docs/mechanics/` | 状态机 1,223 行状态（9.7% 有 motion 名）、怪物表/任务/装备 |
| 数据库 | `docs/data/mhgu.db`（未入库，18MB） | 129 怪 / 21,153 道具 / 1,355 任务；外键 0 真孤儿 |
| 编辑器规格 | `docs/editor-spec/` | 禁写规则 + 未决项 G-01..G-07 |
| 审计链 | `docs/analysis/audit/` | 六份关联审查 + 处置表 `LINK-STATUS.tsv` |
| 工具 | `tools/**/*.mjs` | 部分需镜像/库/存档，未逐个标注依赖 |

## 二、公开发布还差什么（待补，我来做）

1. **仓库卫生**：`tools/mhgu/vendor` 等第三方内容是否已在历史里；`LICENSE`；`.gitignore` 对 18MB 库/大二进制/临时目录的覆盖；历史清理前必须先 `git bundle` 备份。
2. **入口文档**：`README.md` 面向外人的第一屏是否讲清"这是什么 / 证明了什么 / 没有游戏镜像怎么复核"。
3. **工具依赖表**：每个 `tools/*.mjs` 的输入（镜像/库/存档）、输出、自检；标出"离了镜像跑不了"的那些。
4. **数据来源与许可**：`docs/data/**` 的出处（自库导出 / 镜像提取 / Kiranico 爬取），哪些**不能**随公开仓库发。
5. **可复现性声明**：哪些数字**他人可独立复算**（有命令），哪些**只能复核逻辑**（需镜像）。**已核实（2026-11-04，主会话亲自跑）**：
   - `node tools/mhgu/coverage/canonical-metric.mjs` → `canonical total 58.0% (target >= 90%, not met)`，并打印"raw spine 会给出 58.1%，其中 473 个函数已被裁定推翻"。
   - `node tools/mhgu/coverage/independent-coverage.mjs` → `covered at >=90% independently: 3460532 = 66.19%`，末行 `PASS independent recomputation reproduces the report partition`。
   - `node tools/audit/check.mjs` → 12 道门 ALL PASS。
   这三条不需要镜像，是陌生人可以自己跑的入口。其余（retile / stringxref / fingerprints / vtable-scan / immscan）需要 `main.140.flat.bin`。

## 三、只能由用户做的（需实机/录像）

**2026-11-04 06:39–06:56 实机窗口的结果**：导出 exe 两次启动都到标题，帧率 45–97 fps；两次启动/退出后四个存档逐字节未变（`Lay1nn_HR198.hnt` = `69392be8…42e5e2`）。**但没有到达存档选择画面**——把 `qt-config.ini` 的 `keyboard_enabled` 改为 `true` 后，`C`(=A) 仍无法把 "PRESS A" 推进到主菜单，每次按 A 都重播片头。所以下面 U1/U3 仍然只能由你手点。

| 编号 | 事项 | 为什么只能你做 | 产出 |
|---|---|---|---|
| U1 | 编辑器实机验证：打开道具/装备页，改一个道具数量并存回，进游戏确认 | 存档选择必须手点；键盘自动化在 30 分钟里不可靠 | 录屏 30–60s |
| U2 | DLC 页验证：用 `export-dlc-table.mjs` 生成 `MHGU_DLC.txt` 后能否列出 166 条任务 | 同上 | 截图 |
| U3 | 存档选择 → 载入 HR198 存档，确认改名/数值生效 | 同上 | 录屏 |
| U4 | 覆盖率讲解素材：`check.mjs` 全绿 + `canonical-metric.mjs` 打印 58.0% | 需在镜头前跑一次 | 终端录屏 |
| U5 | 怪物机制演示（可选）：状态机/派发表与游戏内动作对照 | 需要实机 | 录屏 |

> 记录在此即可；等你要录的时候按表逐条走。**不要再派"自动按键驱动编辑器"的实机尝试**，这条路已经用掉一个窗口且没有产出。

## 四、接下来一段的工作顺序

| 阶段 | 内容 | 执行者 |
|---|---|---|
| A | 第二波关联审查（5 个切片）→ 回收、复核、处置 | 子代理 + 主会话复核 |
| B | 发布就绪四切片（仓库卫生 / 入口文档 / 工具依赖 / 数据许可） | 子代理 |
| C | 按 B 的结论补文档：`README` 首屏、工具依赖表、许可声明 | 主会话 |
| D | 继续审查未覆盖文档簇（`analysis/fields`、`reference`、`history`） | 子代理 |
| E | 把 U1–U5 的"需要你"清单固化进 `HANDOFF.md` 的"下一步" | 主会话 |

## 五、判定标准

- 发布就绪 = 陌生人能在**没有游戏镜像**的前提下：看懂结论、跑通不依赖镜像的工具、知道哪些数字需镜像才能复核、不误拿到不该公开的数据。
- 每条"已具备"必须有命令或 artifact 支撑；没有的写进"待补"。
