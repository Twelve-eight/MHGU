# editor/help — 字段旁的游戏机制说明

编辑器 UI 在每个可编辑字段旁显示对应的游戏机制，数据来自本目录的 `<domain>.json`。

内容只能改写自本仓库 `docs/mechanics/*.md` 与 `docs/editor-spec/*.md` 中我们自己的结论；不复制 wiki 或游戏数据表原文，引用的数值也不得超出这些文档已写明的范围。

## 格式

每个文件是一个 JSON 数组，每条记录如下：

```json
{
  "field": "writeHr",
  "title": "猎人等级 HR",
  "summary": "机制说明，中文，最多 3 句。",
  "effect": "改了以后游戏里会发生什么（解锁、显示、联机）。",
  "risk": "风险；没有就写空字符串。",
  "source": "docs/mechanics/systems.md:870-884",
  "conf": "A"
}
```

- `field`：`editor/core/*.mjs` 中对应读写函数的导出名（例如 `writeGold`、`writeItemBoxSlot`、`writeQuestState`、`writeMonsterSize`、`writePalicoColor`）。若一个函数对应多种语义（例如任务位按区间区分），可写成 `函数名#子键`，子键沿用核心库里的常量名（如 `QUEST_RANGES` 的键名）。
- `source`：仓库相对路径加行号范围，必须能打开且行号对应正文。
- `conf`：`A` 表示已被代码或数据验证；`B` 表示文档推断；`U` 表示未确认，UI 会把它显示为“未确认”。

`index.mjs` 负责合并各领域文件，并按 `field` 查询。
