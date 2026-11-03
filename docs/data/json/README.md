# docs/data/json/ — 派生 JSON（mhgu.db 导出 + 映射表）

由 `docs/data/mhgu.db`（MHGenDatabase）导出的 21 表 + 手工对拍的映射表。

## 映射表（知识库核心资产）

### `monster-slot-map.json` — 存档怪物槽位 ↔ 名字 ↔ 数据库 全链
**137 条**，字段 `{slot, emid, cn, cn_src, en, kind, ro}`（同目录另有 `monster-slot-map-137.json`，字段少 `kind/ro`）：
- `slot` = 0..136，**不是** 93 个大型怪的老编号：文件含 43 个小怪（`kind=small`）与 94 个 `kind=big`，`emid` 是游戏内部怪物 id
- `cn`/`en` = 名字，`cn_src` 记录来源（`chS/arc/resident_chS.arc :: monsterName_chS #N`，即名字表下标 = slot）
- `ro` = 只读标记（多数为 null）
- 来历：exe `0x1597ea4` 的 137 对 `{emid, slot}` + `resident_chS.arc` 名字表逐条对拍。**2026-11-04 独立复核**：直接从镜像读 `0x1597ea4 + 8*i` 的 137 对，与 json 的 `emid@slot` 逐条比对，**137/137 一致、0 反例**，slot 取值恰为 0..136（`node .tmp-slotcheck` 类脚本，读 `main.140.flat.bin` 偏移 +0x100）

**已核对的锚点**：`slot92 = 飞甲虫(Bnahabra, emid 4122)`、`slot133 = 阁螳螂(机偶)`、`slot134 = 阁螳螂(Ahtal-Ka, emid 88)`。

> **更正（2026-11-03）**：本节旧文写"93 条 / `slot92=阁螳螂` / 计数器在 `char_off 24414`"。那是 **93 个大型怪**的老编号空间，与当前 137 槽空间不是同一套下标：在 137 空间里 92 号是飞甲虫、阁螳螂是 134 号。若按 `0x5EA6 + 2×slot` 读计数器，阁螳螂落在 `char_off 0x5FB2`，而旧文写的 24414 (`0x5F5E`) 对应 137 空间的 92 号。
> 两个编号空间哪一个与存档计数器数组一致，**尚未用字节证实**——`obj+0x72C/0x83E` 两块各 274 B = 137×u16，长度与 137 空间吻合，但"长度吻合"不等于"下标吻合"。MonsterForm 的写点（24230/24504/24778）只证明块首，不证明序号。下游按 slot 直址读写计数器前必须先做这一次验证。

### `monster-name-map.json` — db monsters EN→JA + HP
129 条 `{id, ja, base_hp, sort}`——`name_ja` 在 db 中 129/129 齐全（本映射无空 JA 名）。

## 导出表（mhgu.db → JSON，供编辑器/文档直读）

**2026-11-04 复核：这份 JSON 是 `mhgu.db` 的*部分*镜像，不能反向重建数据库。** 数据库 39 张表里 21 张有导出，另有 10 张非空表没有（`components` 73,187 行、`meow_rewards` 1,168 行等），仓库里也没有导出脚本。`mhgu.db` 本身不入库（`docs/data/README.md:25`），所以克隆者拿到的是一组派生 JSON，而不是可重建的源。要补就得先补导出脚本，再决定哪些表可以公开——当前没有做，是有意为之：更多表只会把更多第三方文本带进公开仓库。
见 `docs/data/README.md` 的表清单。`monsters/quests/items/weapons/armor/skills/skill_trees/decorations/combining/gathering/monster_damage/monster_weakness/monster_status/monster_to_quest/quest_rewards/horn_melodies/palico_weapons/palico_armor/locations`。

## 待建映射（下一步）
- **EN↔JA↔CN 全名表**：quests/items/skills 的 `name_ja` 在 db 全空，需用 wiki 中文页 + db EN 名对拍补齐（同 monster-slot-map 的做法，逐域建）
- **任务 id ↔ 存档位号**：quests._id（稀疏游戏 id）↔ 存档 cleared/seen bit（记录序号）——服务任务解锁
- **道具 id ↔ MHGU_item(uni).txt**：db items._id（type='' 2624 条）↔ 编辑器日文表 2930 行。**该表不在仓库里**，且 `items.name_ja` 全表为空，数据库造不出它的日文名；见 `docs/data/README.md`「编辑器运行时数据文件」
