# 信源交叉验证记录（2026-10-23）

## 三方数据源
| 源 | 类型 | 规模 | 角色 |
|---|---|---|---|
| `mhgu.db`（MHGenDatabase v2.4.0） | 官方数据的社区提取 | 18MB / 39 表 | **权威机读底座** |
| `agroff/mhgu-quest-list` JSON | Kiranico 网页爬取 | 11MB | 交叉验证 |
| `mhwiki.axibug.com/mhxx-wiki` | 中文攻略 wiki 镜像 | 290 页 / 37MB | 机制综述 + 补齐前两者缺的字段 |

## 验证结论：**一致，mhgu.db 为权威超集**

### 任务（quests）
- agroff `quests.json` **832 个英文任务名，100% 全部命中** mhgu.db `quests` 表 → agroff 数据**准确**
- mhgu.db 多出 411 个任务（`Grudge Match:*` 斗技场/DLC/特殊任务，agroff 漏抓）→ **mhgu.db 更全**
- 判定：mhgu.db 权威；agroff 的 `keyType/key/urgent/pre-req` 分类字段是 mhgu.db 所无，作解锁链补充

### 技能树（skill_trees）
- agroff `skills.json` **204 个技能树名，100% 全部命中** mhgu.db `skill_trees`（205 条）→ 完全一致
- agroff 多带 `skills[].description/points`（阈值效果描述），mhgu.db `skills` 表 326 条含 `required_skill_tree_points`——互补

### 结论规则（写入知识库）
- **数值/名录以 mhgu.db 为准**（官方数据、多语言、最全）
- **解锁前置/任务分类**用 agroff 的 `keyType` 字段补（关键/紧急/前置标记是 db 没有的）
- **机制文字综述/狩技/委托/装备解放**用 mhxx-wiki（前两源都缺这些非结构化字段）

## 待验证项
- wiki 与 mhgu.db 的怪物名/任务名是**日文**，需建 EN↔JA↔CN 名映射表（db 自带 name_ja + 多语言，可自动对齐）
- 编辑器现有 `MHGU_item(uni).txt` 道具表 vs mhgu.db `items` 表——需对拍确认 id 一致性
- 委托/Daily 任务、狩技效果在 mhgu.db 无专表——靠 wiki 补
