# GOAL：夜间自主推进清单（2026-10-24 起）

用户在睡觉，suyu 导出在本机跑一整夜。**想结束工作前先读本文件**：从上往下找第一个「可做」项继续；「阻塞」项跳过。每完成或变化一项就改这里的状态并提交。

规则摘要：subagent 只用 dsv-dev（effort hi）或 glm-re（仅逆向，≤9 并发），每个实现配一个审查；报告逐步落盘；不碰 suyu/导出目录、不启动游戏、不动用户存档（只用 MHGU-private 里的样本副本）；不写 C:。

## CPU
- 导出期间 CPU 100%。子代理是远端模型不占本机；本机只跑短命令（MCP 反汇编、roundtrip 测试），不跑长时间本地计算，不开新的编译。

## 绝对不要碰
- `G:\suyu\`（导出进行中，suyu PID 15592）。不要杀它、不要读写 `G:\suyu\export`。
- yuzu 原存档目录、`E:\`、Steam 目录。

## 工作项

| # | 状态 | 项目 | 产出 / 验收 |
|---|---|---|---|
| 1 | 完成 | Tier A otomo-ot 无偏抽样（DsvOtA1/A2 + DsvOtAReview） | `.tmp/reports-mhgu/otomoA-sample-{1,2,review}.md`；审查 PASS 后把错误率写进 DEVLOG 与 `docs/analysis/code-metrics.md` 注记 |
| 2 | 完成（剩 3 个 LOW 未修） | 编辑器 UI：本地单页 `editor/ui/`（零依赖 HTML+ESM），读入存档副本 → 显示无效槽警告 → 字段旁显示 `editor/help` 说明 → 改完导出新文件 | 能用浏览器打开样本副本，看到 ghost 槽警告与 help 文字；导出文件过 roundtrip |
| 3 | 完成 | 插件规格 `docs/patches/item-box-v7-plugin-spec.md` 剩余行抽查审计 | 审计报告；错误行原地修正并提交 |
| 4 | 进行中(GlmVtblPilot+Review 先导 10 类) | 批次 C：vtable → 类归属（逆向，glm-re + dsv 审查） | 候选表，只作 B 级，不计入达标 |
| 5 | 可做 | 批次 A 改进：类名→子系统人工映射表取代关键词规则 | 映射表 + 重算一致率 |
| 6 | 进行中(DsvRszCrc+Review: typeCRC)；内容规格未开始 | MHRS：RSZ typeCRC 抽样核对、引擎无关内容规格 GU/RS 半部 | 只读静态工作，不写 Steam 目录 |
| 7 | 阻塞 | suyu 导出 + 存档互通 | 等导出完成 + 用户在场 |
| 8 | 阻塞 | V8 补丁实机测试、编辑器实机验证、Forge 实测 | 等用户在场 |
| 9 | 阻塞 | G-14 当前穿戴装备位置 | 需实机读内存 |
