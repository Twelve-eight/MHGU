# Tier B 裁定报告 — slice-09 (1062 函数, 0x72aa48..0x80c93c)

状态：**未完成**（2026-11-04 补审确认）。表格从未落盘，本页只有方法与规则，没有裁决行。这段范围 `0x72aa48..0x80c93c` 的当前归属见 `docs/analysis/code/inventory/function-labels.tsv`（按地址查）与 `coverage-report.tsv` 的统计口径，不要引用本页当作已裁定。

## 方法与证据等级
本切片的 `callee_label_votes` 存在系统性偏差，已核对 `inventory/classified3.csv` 与 `inventory/tiers.csv`：

1. **通用访问器族**（0x54ecc0..0x54ff80、0x65cb3c/0x65cb48/0x65cb74/0x65cba0/0x65cbc4/0x65cbe8/0x65cc0c、
   0x65d424/0x65d464/0x65d9e8、0x65e5bc..0x65ed24、0x7aa47c、0x7aedcc、0x13efd70..0x13efdac 等）
   在 `classified3.csv` 中全部标记为 `prop`（成员属性 getter，`(this, index)` 形式，典型反汇编见
   `analysis/qp4/fn-67b544.txt`：`mov r1,#5; bl 0x65cba0`）。它们在 `tiers.csv` 里被统一标成 `quest`，
   因此**凡是只由这些地址产生的 quest 票一律视为噪声**，不计入判据。
2. 因此判定优先级：① 字符串（conf A）→ ② 类型/类传播子系统（`classified3.csv` 的 subsystem，
   conf B/C）→ ③ 非通用 callee 票（conf B/C）→ ④ 地址邻域与结构（conf C）→ ⑤ `unknown`。
3. `classified3.csv` 中 `ui` 对短访问器是兜底值，对 ≥100 指令的函数才当作真实 UI 证据。
4. `role`：无 callee 且 `insns<=16` → leaf；`insns<=4` → thunk；callee 数 ≥8 → orchestrator；其余 worker。

（表格从未生成，2026-11-04 补审时确认；本切片的方法与证据等级判断仍然有效，可直接复用。）
