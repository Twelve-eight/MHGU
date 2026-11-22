# 派单：GU 反应码 49 到底是什么（`reaction_67`，全表唯一还标 `U` 的大户）

## 现状
`MHRS-private/kb/gu-rise-react-map.tsv` 第 49 行：

```
gu_react  gu_name      gu_rows  rise_type  rise_enum_line  basis
49        reaction_67  134      -          -               gu=0x2f0118 -> 0x2f22e8(r1=2,67,67), player-motion ids
                                                           (gu-react-ids.tsv:51); numeric match only with
                                                           DamageReaction 67 = QuakeIndirect:173145,
                                                           unverified -> no DamageType candidate     tag=U
```

**134 条 GU 攻击行**用它，是这张表里未映射的码中最大的一档。em007（角龙）实测出现 44/46/49，
其中 44/46 已有映射（`status_13`/`status_15` → `EarL`），**只有 49 是空的**。

## 目标
把 49 的语义钉下来，或者证明它在本移植范围内不可映射（并说明为什么）。

## 已知线索
- `gu-react-ids.tsv:51`：GU 侧 `0x2f0118 -> 0x2f22e8`，参数 `r1=2, 67, 67`；67 是玩家动作 id 的候选。
- 数字巧合指向 Rise `DamageReaction 67 = QuakeIndirect`（枚举行 173145），但从未验证。
- GU 主镜像的 ARMv7 反汇编工具有 `mcp__mhgu_re_*` 系列（`disasm` / `refs_to` / `literal_loads` / `function_start` / `calls_to` /
  `read_bytes` / `read_words`），vaddr = flat − 0x100。
- GU 攻击行的反应码在 attackdata（HDE，0x20 B/行）里；解码格式见 `MHRS/docs/reference/gu-hit-port.md` §2。

## 要做的事
1. **确定 49 在 GU 侧触发什么**：从 `0x2f22e8` 这个"反应处理表"项出发，读它的消费点——
   它把玩家推进哪个动作/状态？是击退、是地震、是"抓取"还是别的？
   （注意：反应码本身只是一张表的下标，**表的消费者才定义语义**。别只按数值猜。）
2. **判它该映到 Rise 哪个 `DamageType`/`DamageReaction`**：给出候选与**反例**。
   若候选多于一个无法区分，明确说"需要实机"并给出最小实机方案（打哪只怪、记什么字段）。
3. **交叉核对**：134 条用 49 的 GU 行里，有没有"同一动作同时用别的反应码"的情形？若有，说明 49 是"额外叠加"还是"替代"。

## 强制对照
- 阳性：用同一个方法解一个**已经定过**的反应码（例如 44 = `status_13` → `EarL`），必须复现已有结论；
  复现不出来说明方法错，先修方法。
- 阴性：把 49 硬套 `QuakeIndirect`，必须能给出至少一条**反对**它的证据或说明为什么给不出。

## 交付
- 报告 `MHGU/docs/analysis/re/React49-reports/react49.md`（增量追加，含 `## Difficulties`）
- 若结论成立，**只改 `gu-rise-react-map.tsv` 第 49 行**（填 `rise_type` / `rise_enum_line` / `basis` / `tag`），
  不要动别的行；改完跑该表的任何既有校验（若没有，至少证明 134 行仍能按列解析、列数不变）。

## 约束
- 只读静态数据，不启动模拟器、不碰存档。
- 结论分级 `[C]/[B]/[U]`；ID→对象映射必须附来源（枚举文件+行号 / 官方文本+索引 / db 表+行），无来源一律 `[U]`。
- 改 markdown 用 `edit`/`write`，不要用 shell 的 `node -e` 写中文。
