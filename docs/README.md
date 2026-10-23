# MHGU 存档逆向知识库 — 索引

> **总进度与差距：[`PROGRESS.md`](PROGRESS.md)** · **覆盖率记分牌：[`save-layout/coverage-map.md`](save-layout/coverage-map.md)**

本 repo 只有两份「真相源」：`save-layout/`（权威布局/契约）与 `analysis/`（调查报告，含置信度）。
其余目录均为**数据/参考资料**，不是本项目的产出结论。

## 目录职责

| 目录 | 职责 | 是否本项目成果 |
|---|---|---|
| `save-layout/` | **权威布局表与定案**（file_off ↔ obj_off ↔ 语义，改动前先改这里）| ✅ |
| `analysis/members/` | 成员级调查报告（census / 各 member 的布局与语义）| ✅ |
| `analysis/fields/` | member#4 内字段族调查（288B / 68B / 128B）| ✅ |
| `analysis/save-io/` | 序列化与尾部（读/写调度、尾部容器、校验和取证）| ✅ |
| `analysis/dumps/` | 反汇编原始转储（证据，非结论）| ✅ |
| `mechanics/` | 游戏机制综述（据 mhgu.db + wiki 校验后整理）| ✅ |
| `data/` | `mhgu.db`(18MB 权威数据)、viewer 表、派生 JSON | 混合：db 权威，JSON 可再生 |
| `reference/` | 前人知识库（mhxx-wiki HTML/文本）——**只做交叉验证，不改动、不作为结论来源** | ❌ 外部资料 |
| `history/` | 历史存档 | — |

## save-layout/（权威）
| 文件 | 内容 |
|---|---|
| `coverage-map.md` | **覆盖率记分牌**：member[0..17] file 链、尾部容器 C0..C7、137 槽机制证明、632B 头、勘误记录 |
| `member4-file-layout.txt` | 成员#4 **134 行** file_off ↔ obj_off ↔ size（末行 `0x5E9E+4`；注意内层真实跨度 12,955B，见 coverage-map 勘误）|
| `member4-semantics.md` | 成员#4 134 字段语义（定案/高/中/未知分级）|
| `member4-diff.txt` | 成员#4 逐字段 clean/dirty 差分 |
| `CURRENT-RULING.md` | 任务解锁/位域定案 |
| `contradictory-bits-verdict.md` | 122 矛盾位定案（全是解锁功能涂的，0 真进度）|
| `pouch-verified.md` | 口袋 32 槽 × 19bit 定案 |
| `name-dictionary.txt` / `name-tables-key.md` | 名字池与关键表摘录 |

## analysis/members/
| 文件 | 内容 |
|---|---|
| `member-census.md` | **19 成员槽 = 18 反序列化器 + 2 fixup**、19 个 GOT 槽表、4 类读原语 |
| `member4-17-layout.md` | member[4..17] 逐字段表（86,997B）|
| `member14-17-semantics.md` | m14 运行时镜像 / m16 VFP×2.05 / m17 kind-7 快照库 |
| `member4-residual.md` | 三残留定案（128B 族仅 1 FF、3444B 全零、68B 族 544bit）+ 旧 dump 早 0x550 根源 |
| `palico-324.md` | 随从猫 324B 记录字段表（108 条 = 84+24）|
| `member15.md` / `member4-header.md` | 早期分段调查（**含早 0x550 旧坐标，见文首横幅**）|
| `review-member4-17.md` | member[4..17] 报告的独立复核（PASS + E1 修正）|

## analysis/fields/ 与 save-io/
| 文件 | 内容 |
|---|---|
| `fields/fam-288.md` | 288B 族 = cTrialArts 位图族 |
| `fields/fam-small.md` | 68B 位图 / 164B 双槽 / 20B 勋章 / 尾 3444B |
| `fields/records-128.md` | 128B 记录族内部布局 |
| `save-io/write-side-desc.md` | 写侧：18 writer 与读侧同序、632B 头只写不读 |
| `save-io/social-checksum.md` | 尾部无校验取证（扩回写窗的依据）|
| `save-io/tail-containers.md` | 尾部 C0..C7 容器表（尺寸闭合 653,472B）|
| `save-io/tail-dense-3783A.md` | 尾部 16B 网格与相位分析 |

## 约定
1. **偏移坐标**：`char_off` = `.hnt` 块内偏移（块 1,177,760B）；`file_off = hunterAdds[i] + char_off`，`hunterAdds=[1625244, 2803040, 3980836]`；`vaddr` 对应 `flat_off = vaddr + 0x100`。
2. **结论分级**：定案 / 高 / 中 / 未知；不确定标 `[INFERENCE]`。
3. **外部资料**（`reference/mhxx-wiki/`）只用于交叉验证，**不接受为唯一证据**，也不修改。

## 语言文字规范（AGENTS.md §5）
- **叙述与分析文字**只用中文/英文；**不使用假名**。历史报告已规范化（`狩猟スタイル`→狩猎风格、`揺れ`→尺寸浮动、`二つ名`→二名、`怒り`→愤怒、`・`→`·` 等）。
- **数据文件例外**：`data/viewer/monsters.txt`、`mechanics/quests.md` 中的日文是**游戏内原名（verbatim 数据）**，来自 `mhgu.db` / 前人 wiki，用于与原始资料对齐，不得翻译或删除（AGENTS.md §6 保真要求）。
- 外部资料 `reference/mhxx-wiki/` 原样保留，不改动。
