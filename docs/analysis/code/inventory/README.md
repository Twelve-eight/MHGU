# 函数归属清单：入口与读法

这个目录是"每个函数是什么、凭什么这么说"的落地处。口径（哪个数字能引用）只认
`docs/analysis/code/coverage/METER.md`；本文件只说**文件之间怎么配合**和**读的时候会踩什么坑**。

## 先看哪个

| 你想知道 | 读这个 |
|---|---|
| 某个地址属于哪个子系统、依据是什么 | `function-labels.tsv`（见下） |
| 各子系统有多大、多少靠自己的证据 | `labels-summary.md`（生成物） |
| 当前覆盖率与它怎么算出来 | `../coverage/METER.md` |
| 每条通道各产出多少、精度多少 | `../coverage/METER.md` 的通道表（**快照**）+ `sources.json`（**当前清单**） |

## function-labels.tsv

每行一个已标注函数：`start / insns / label / provenance / reason`。

- `provenance` **五类**，对应报告的分区顺序：`evidence:`（conf A，函数自己有一行依据）→ `inferred:`（conf V，由通道推断）→ `signature:`（conf S，立即数签名）→ `spread:`（邻域传播）→ `adjudication:`（Tier B 切片里的人工裁定；它**不计入 ≥90% 验证桶**，见 METER「三次更正」）。
- `reason` 是通道当时写下的**原句**，不是摘要；想复核就去 `provenance` 指向的那个文件里按 `start` 找同一行。
- **没有出现的函数就是没标签的**，共 **12,318 个（23.4% 函数 / 10.0% 指令）**。不要把它当成"全表"。

重新生成：`node tools/mhgu/coverage/function-labels.mjs`。

## 文件角色

| 文件 | 角色 |
|---|---|
| `sources.json` | **唯一清单**。报告只统计清单里的文件；加通道＝加进这里，不加就不计数（这条是 2026-11-04 两次"通道产出无人计数"事故的直接教训） |
| `attr-tableseeds.tsv` | 没有 RTTI 的函数指针表：表内已标注成员全同向 → 其余成员继承（1 个已标注成员 94.1%/CP95 92.5，2 个以上 98%+；混合表 45% 整张跳过） |
| `attr-offsets.tsv` | 结构偏移签名：2 个以上一致纯偏移一律采用；**只有 1 个时仅接受 <200 条指令的函数**（≥200 条只有 86.0%，合并值 91.1% 会掩盖它） |
| `attr-*.tsv` | 通道产出，`start / label / conf / evidence`。conf A 才是证据；V/S 是推断与签名；B 是建议，永不计数 |
| `tiers-merged.csv` | 传播后的挂账（`start,insns,tier,label,src`）。**不要**直接引用它的标签当结论 |
| `demote-*.tsv` | 降级表：列出的函数不许再被投票改写 |
| `cov-report.tsv` / `coverage-report.tsv` | 生成物，读它不要改它 |

## 坑

- `docs/data/functions-retile.csv.gz` 是 **gzip**，直接当 utf8 读会得到乱码，所有 `starts.has()` 静默为假。
- 镜像 `MHGU/main.140.flat.bin` 的 **flat 偏移 = vaddr + 0x100**。`tools/mhgu/arm32.mjs` 的 `disasm(vaddr, n)` 收的是 **vaddr**，不要再加 0x100（加过，样本整体前移 0x100，白做一轮盲读）。
- `disasm()` 返回**字符串**，不是数组。
- 函数表的 `c[2]` 才是指令数（`c[1]` 不是）。
- 终端里对含中文的行做 `cut -c` 会截断多字节字符、显示成 GBK 乱码；文件本身没问题，用 `read` 核对。
- 通道间的标签冲突是真实的分类边界模糊（约 2.7%），不是 bug，见 METER 的冲突表。

## 改动顺序

加一条通道时：`table-consensus.mjs` 那样**先量精度再产出**（1 MB × 5 网格、只用窗外证据、给 CP95 下界），
过 90% 下界才接进 `sources.json`，然后按顺序跑
`recompute.mjs`（读 `sources.json` 的 --seed 展开）→ `report.mjs` → `check-artifacts.mjs` → `function-labels.mjs`
→ `labels-summary.mjs` → `tools/audit/check.mjs`。
