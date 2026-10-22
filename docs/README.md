# MHGU 存档测绘知识库（权威副本，已入 git）

> **总进度报告：[`PROGRESS.md`](PROGRESS.md)** — 已交付成品 / 卡对话定案 / 字段测绘成果 / 剩余 6 项

这些文件原先只在 `.tmp/`（会话临时目录，会被清理）。已迁入 repo 作为权威副本。

## docs/save-layout/ — 存档布局权威表
| 文件 | 内容 |
|---|---|
| `member4-file-layout.txt` | 成员#4 **134 行** file_off ↔ obj+off ↔ size（已按循环体修正：67/68/69 特殊、70..134 +0x550）|
| `member4-diff.txt` | 成员#4 逐字段 clean/dirty 差分（42 FF / 56 PROGRESS / 36 SAME）|
| `name-dictionary.txt` | flat.bin 全量成员名字池（106 块 / 4782 标识符 / 118KB）|
| `name-tables-key.md` | 关键名字表摘录（cTrialArts / cAcPlayerEquipXML / cQuestDaily / cAmuletBase）|
| `CURRENT-RULING.md` | 任务解锁定案（位号=questId、cleared+seen 双写、矛盾向量 501）|
| `pouch-verified.md` | 口袋区定案（32 槽 × 19bit，与道具箱同编码）|

## docs/analysis/ — 逆向分析报告（子代理交付）
| 文件 | 内容 |
|---|---|
| `member4-header.md` | 成员#4 分段定案 15075B 闭合 + 134 站点表 + 尾段=怪物统计 |
| `records-128.md` | 128B 记录族（15 条，136B 槽 = 1F/1E 半槽）|
| `fam-288.md` | 288B 族 = cTrialArts 位图（18 成员 × 48B = 864 = 组步长）|
| `fam-small.md` | 68B 位图 / 164B 双槽 / 20B 勋章 / 尾 3444B |
| `member15.md` | 成员#15（6 块 28404B，B1 = zlib 占位块）|
| `reader134-dump.txt` | 0x51dc40 全程反汇编（字段表原始证据）|
| `followup-dump.txt` | 128B 族全 hex + 12 个反汇编窗口 |

## docs/mechanics/ — 游戏机制综述（信源校验后整理）
| 文件 | 行数 | 内容 |
|---|---|---|
| `quests.md` | 730 | 任务解锁链：村★1-10/集★1-7/G★1-4 关键紧急表、二名 228、7 类非任务门槛、存档映射 |
| `monsters.md` | 662 | 怪物统计：93 大怪 slot↔db_id↔HP↔肉质全映射、狞猛化、捕获、二名许可 |
| `skills-arts.md` | 594 | 技能阈值（+10/+15/+20/负）、狩技 66 项 4-track 解锁、装饰珠、护石 36B 记录 |
| `equipment.md` | 670 | 武器树/防具/护石/装饰珠面板公式、幻化字段、最终强化 |
| `systems.md` | 969 | 调合 183、猫饭 64 技能、来访猎人、斗技场、随从猫 324B 字段表 |

## docs/data/ — 机读游戏数据
| 文件 | 内容 |
|---|---|
| `mhgu.db` | MHGenDatabase 全库 18MB/39 表（**数值底座，权威**）|
| `json/` | db 导出 20 表 + `monster-slot-map.json`（93 槽↔名↔db_id，已验证）|
| `viewer/` | 编辑器查看器用精简 txt 表 |
| `quests.json`/`skills.json` | agroff/Kiranico 爬取（交叉验证用）|

## docs/reference/ — 外部信源
| 文件 | 内容 |
|---|---|
| `mhxx-wiki/` | mhwiki.axibug.com 离线镜像（HTML 未入 git；`text/` 290 页已转换）|
| `source-verification.md` | 三方数据源交叉验证记录（mhgu.db 为权威超集）|

## 坐标系铁律
- `char_off` = 猎人块内偏移；clean 档基址 `0x2AC560`，dirty 档基址 `0x18CC9C`
- **char_off ↔ obj_off 不是固定 delta**（0x42C→0x2C77 是 +0x284B，0xD24→0x2C13 是 +0x1EEF）
- 只用 `member4-file-layout.txt` 查映射，禁止用 ±常数推
- `disasm(vaddr, COUNT)` 第二参数是**条数**不是结束地址
