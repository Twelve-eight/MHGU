# docs/data/json/ — 派生 JSON（mhgu.db 导出 + 映射表）

由 `docs/data/mhgu.db`（MHGenDatabase）导出的 20 表 + 手工对拍的映射表。

## 映射表（知识库核心资产）

### `monster-slot-map.json` — 存档怪物槽位 ↔ 名字 ↔ 数据库 全链
**93 条**，字段 `{slot, cn, en, db_id}`：
- `slot` = 存档怪物计数器下标 0..92（MonsterForm `array[]` 顺序 = `obj+0x72C/0x83E` u16 计数器槽）
- `cn` = 中文名（MonsterForm 数组 / wiki 页名）
- `en` = 英文名（mhgu.db `monsters.name`）
- `db_id` = mhgu.db `monsters._id`（关联 HP/肉质/弱点/任务）

**已验证**：93/93 全部 db_id 都能取到 `base_hp` + `monster_damage` 肉质行，无孤儿。
- **关键确认**：`slot92=阁螳螂(Ahtal-Ka)`，其计数器在 `char_off 24414`——这正是 MonsterForm「删跳槽」修复的字节判据（clean=38/dirty=317 非零即阁螳螂击杀数）。
- 93 槽全是**大型怪物**；db 还有 4097-4144 的小怪（Aptonoth/Jaggi 等）不在此计数器组（另有小型怪计数器）。

### `monster-name-map.json` — db monsters EN→JA + HP
129 条 `{id, ja, base_hp, sort}`——`name_ja` 覆盖不全（MHGenDatabase 是英文应用，部分 JA 字段空）。

## 导出表（mhgu.db → JSON，供编辑器/文档直读）
见 `docs/data/README.md` 的表清单。`monsters/quests/items/weapons/armor/skills/skill_trees/decorations/combining/gathering/monster_damage/monster_weakness/monster_status/monster_to_quest/quest_rewards/horn_melodies/palico_weapons/palico_armor/locations`。

## 待建映射（下一步）
- **EN↔JA↔CN 全名表**：quests/items/skills 的 `name_ja` 在 db 全空，需用 wiki 中文页 + db EN 名对拍补齐（同 monster-slot-map 的做法，逐域建）
- **任务 id ↔ 存档位号**：quests._id（稀疏游戏 id）↔ 存档 cleared/seen bit（记录序号）——服务任务解锁
- **道具 id ↔ MHGU_item(uni).txt**：db items._id（type='' 2624 条）↔ 编辑器日文表 2930 行
