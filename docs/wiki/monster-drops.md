# 怪物掉落表：剥取 / 断尾 / 捕获 / 落物 / 部位破坏 / 任务报酬

> **能查到什么**：① MHGU 各条掉落通道各有几次结算、单次概率量级；② 十只封面怪（火龙、雌火龙、轰龙、迅龙、雷狼龙、碎龙、斩龙、电龙、泡狐龙、巨兽）在下位 / 上位 / G 级三档的稀有素材，走哪条通道最划算，并折算成"每次狩猎的到手率"；③ 每张表的来源路径与自查 SQL，可自己扩展到任意怪物。
>
> **一句话结论**：稀有素材别只靠剥取——**火龙 / 雌火龙的本体剥取表里没有逆鳞 / 红玉 / 天鳞**（只有骨髓、棘这类稀有度 5 的次级件），其余怪的顶级稀有件虽能从本体剥到，但断尾、指定部位破坏、落物的单次概率往往更高；泡狐龙是唯一"落物 > 剥取"的封面怪（落物 5% × 3 次）。
>
> **数据口径**：本页所有百分比都是**单次结算概率**。全库 2,032 个（怪物, 档位, 通道）分组中 2,030 个合计恰为 100%，唯一例外是桃毛兽王（Congalala, id 21）的 `Meowster Hunter` 上位 / G 两组为 110（3 行数据，见 §8 #7）。所以表里的数字就是"这一次结算抽中它"的概率；换算成"整场狩猎"要乘上结算次数，见 §3。

## 0. 来源标记

| 标记 | 含义 |
|---|---|
| [db] | `MHGU/docs/data/mhgu.db` 表 `hunting_rewards` / `quest_rewards`（库来源：MHGenDatabase v2.4.0，第三方数据库应用，非 romfs 解包） |
| [wiki] | `MHGU-private/docs/reference/mhxx-wiki/text/<页号>.txt`（MHXX 中文 wiki 离线镜像；MHXX 与 MHGU 机制同源，怪物页逐条列出三档掉落） |
| [C] | 上两者**逐条数值一致**（10 只封面怪的剥取 / 断尾 / 落物 / 捕获四通道全部比对；部位破坏抽查） |
| [B] | 官方 romfs 文本 / 字节实测（`chS/table/*.gmd` 提取结果、arc 条目名等） |
| [A] | 算术闭合（分组合计 = 100、每槽 = 200 等） |
| [I] | 仅 [db] 单一来源，未找到第二来源 |
| [U] | 未知 / 存疑 |

**中文名来源（官方 chS 文本）**：素材名 = `chS/table/itemData_chS.gmd`，**索引 = 2 × db `items._id`**（偶数位是名称、奇数位是说明；已用 id 1 = `#2` 调和书1入门篇 验证）；怪物名 = `chS/arc/resident_chS.arc :: chS\GUI\06_msg\monsterName_chS`（268 条带 key 的串，产物 `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json`；**`i` = 存档怪物槽位，0..136 与 `MHGU/docs/data/json/monster-slot-map-137.json` 同序**，i105..111 为机制单位、i133 为 `Atlal_nest`（空）；命名规则：取该怪**自己槽位**的名字、不做缩短——大怪沿用长名（如 `i17` 大名盾蟹、`i19` 将军镰蟹、`i20` 雪狮子王、`i121` 桃毛兽王）；`i88` Hermitaur / `i89` Ceanataur / `i90` Blango 那些短名属于小怪。确认过的短名只有 `i6` 白电、`i7` 怪鸟。本页十只的槽位 ↔ db id：火龙 `#3`/db 2、雌火龙 `#0`/db 1、轰龙 `#27`/db 32、迅龙 `#31`/db 37、雷狼龙 `#44`/db 57、碎龙 `#52`/db 63、斩龙 `#64`/db 80、电龙 `#66`/db 81、泡狐龙 `#67`/db 82、巨兽 `#68`/db 83。素材名提取产物在 `MHGU-private/romfs-extract/gmd/table/`。本页中文名全部为官方文本，行内以 `#索引` 标注（如 `#2406` 火龙的上等鳞、`#4258` 大颗龙泪、`#2780` 轰龙的颚）；§7 附 §2 那 30 件稀有素材的完整索引表。

## 1. 八条通道一览：各有几次结算

| 通道 | db 条件名 | 每次狩猎结算次数 | 触发条件 | 该档最稀件单次量级 | 来源 |
|---|---|---|---|---|---|
| 本体剥取 | `Body Carve` | 3 次（巨兽 **4 次**） | 无 | 稀有件 0–5% | [C] db↔wiki 10 只逐条比对；romfs `hagi` 剥取表字节核对（10 只 / 87 表） |
| 断尾剥取 | `Tail Carve` | 1 次 | 尾部切断（斩击系） | 2–15% | [C] 同上；romfs `hagi` 断尾表（同上 10 只；巨兽无断尾表） |
| 捕获报酬 | `Capture` | 每格一次（格数 [U]，见 §8） | 捕获而非击杀 | 2–7% | [C] 数值；格数无来源；**不在 `hagi` 内** |
| 落物 | `Shiny` | 1–3 次（各怪不同，见 §2 表注） | 壁登顶失败 / 进食 / 吃陷阱肉 / 放电状态解除 / 音爆弹等 | 1–5% | [C] 同上；romfs `hagi` 落物表（同上 10 只） |
| 部位破坏 | `Break <部位>` | 每部位 1 次（头部等多需耐久归零 2 次；两次归零是否各结算 1 次未验证 [U]） | 该部位耐久归零 | 1–40%（稀有行 1–12%） | [C] 同上 |
| 虫网 / 身体采集 | `Body Gather` / `Insect Gather Back` | 雷狼龙：**转倒时**从背部用虫网，wiki 表头记作 **∞ 回**（次数无上限） | 仅少数怪，且需倒地/特定状态 | 雷狼龙 `Insect Gather Back`：下位 超电雷光虫 90 / 带电毛 10%；上位 超电雷光虫 82 / 高电毛 10 / 带电毛 8%；G 超电雷光虫 82 / 雷电毛 10 / 高电毛 8（均 %，各组闭合 100） | [C] db 与 [wiki 1853] L490-500 逐行一致，且 romfs `hagi_s1/s2/s4_em057_00` 的**第 4 张表**逐项相同；db 条件名映射仍 [I] |
| 猫任务行 | `Meowster Hunter` | 3 行固定 50/30/20 | 随从猫任务 | 出余料（Scrap） | [I] |
| 任务报酬 | `quest_rewards` 表（按**任务**存） | 每任务 A/B 两槽 | 任务完成 | 稀有 1% 量级 | [A][db] |

补充几条硬事实：
- 同一（怪物, 档位, 通道）分组内百分比合计 = 100（全库 2,030 / 2,032 组；两组例外见 §8 #7），所以表里的数字就是"这一刀 / 这一次结算抽中它的概率"。[A]
- 上表「该档最稀件单次量级」的取数是**每只怪每档最稀有的那一件**（§2 口径）。若把 `rarity ≥ 7` 的所有行都算进去，极值会到 剥取 70% / 断尾 96% / 破坏 100%——那不是稀有件，别混用。
- db 还存了**按等级段细分**的条件名：`Body Carve Lv1-3` / `Lv1-4` / `Lv4-5` / `Lv5-8` / `Lv6-8` / `Lv9-10`（下位/上位）与 `G1-2` / `G3-4` / `G5-6`（G 级）。含义未解，本页只用不带段名的"整档表"。[U]
- **雷狼龙虫网三档的英文↔中文配对是反直觉的，别"顺手改回来"**：`Zinogre Shockfur` = 带电毛（#2482）、`Zinogre Electrofur` = 高电毛（#2484）、`Zinogre Electrofur+` = 雷电毛（#2486）。所以上位 10% 是**高电毛**、8% 是**带电毛**，G 档 10% 是**雷电毛**、8% 是**高电毛**——看起来像两档互换，实际与 db 逐行相符（[C]）。

## 2. 十只封面怪的稀有素材：单次概率

本表挑的"该档最稀有件"在十只封面怪上正好构成 稀有度 5（下位）/ 7（上位）/ 9（G 级）三档；同稀有度还有次级素材（如雌火龙的棘 = 5、雌火龙的上等棘 = 7、雌火龙的秘棘 = 9）。"—"= 该通道没有这一行（抽不到）。**本体剥取列的 10 只全部已与 romfs `hagi` 字节核对 [C]**（87 张剥取/断尾/落物表 + 雷狼龙 3 张采集表，逐项与 `hunting_rewards` 相同）；"断尾""落物"两列同理。

| 怪物（db id） | 档 | 稀有素材 | 稀有度 | 本体剥取 | 断尾 | 捕获 | 落物 | 部位破坏（部位） | 单次最优 | 来源 |
|---|---|---|---|---|---|---|---|---|---|---|
| 雌火龙 (1) | 下位 | 雌火龙的逆鳞 Rathian Plate | 5 | — | 3% | 2% | 1% | 4%（头）、1%（背） | 破坏 4% | [C] wiki 1862 |
| 雌火龙 (1) | 上位 | 雌火龙的红玉 Rathian Ruby | 7 | — | 3% | 3% | 2% | 4%（头）、1%（背） | 破坏 4% | [C] |
| 雌火龙 (1) | G | 雌火龙的天鳞 Rathian Mantle | 9 | — | 3% | 3% | 2% | 4%（头）、1%（背） | 破坏 4% | [C] |
| 火龙 (2) | 下位 | 火龙的逆鳞 Rathalos Plate | 5 | — | 3% | 2% | 2% | 4%（头）、1%（背） | 破坏 4% | [C] wiki 1863 |
| 火龙 (2) | 上位 | 火龙的红玉 Rathalos Ruby | 7 | — | 3% | 3% | 2% | 4%（头）、1%（背） | 破坏 4% | [C] |
| 火龙 (2) | G | 火龙的天鳞 Rathalos Mantle | 9 | — | 3% | 3% | 2% | 4%（头）、1%（背） | 破坏 4% | [C] |
| 轰龙 (32) | 下位 | 轰龙的头壳 Tigrex Scalp | 5 | 3% | — | 5% | — | **12%**（头） | 破坏 12% | [C] wiki 1855 |
| 轰龙 (32) | 上位 | 轰龙的颚 Tigrex Maw | 7 | 3% | — | 7% | — | 8%（头） | 破坏 8% | [C] |
| 轰龙 (32) | G | 轰龙的天鳞 Tigrex Mantle | 9 | 3% | 2% | 3% | — | 3%（头） | 剥取 / 捕获 / 头破坏 3% | [C] |
| 迅龙 (37) | 下位 | 迅龙的骨髓 Nargacuga Marrow | 5 | — | **12%** | 4% | — | 12%（尾） | 断尾 / 尾破坏 12% | [C] wiki 1839 |
| 迅龙 (37) | 上位 | 迅龙的延髓 Narga Medulla | 7 | 2% | **12%** | 4% | — | 尾 12%（头 8%） | 断尾 12% | [C] |
| 迅龙 (37) | G | 迅龙的天鳞 Nargacuga Mantle | 9 | 2% | — | 4% | 1% | 4%（头） | 捕获 / 头破坏 4% | [C] |
| 雷狼龙 (57) | 下位 | 雷狼龙的逆鳞 Zinogre Plate | 5 | **5%** | 2% | 2% | 2% | 3%（头） | 剥取 5% | [C] wiki 1853 |
| 雷狼龙 (57) | 上位 | 雷狼龙的碧玉 Zinogre Jasper | 7 | **3%** | 2% | 2% | 2% | 3%（头） | 剥取 / 头破坏 3% | [C] |
| 雷狼龙 (57) | G | 雷狼龙的天玉 Zinogre Skymerald | 9 | **3%** | 2% | 2% | 2% | 3%（头） | 剥取 / 头破坏 3% | [C] |
| 碎龙 (63) | 下位 | 碎龙的骨髓 Brach Marrow | 5 | 5% | 5% | 5% | 3% | — | 剥取 / 断尾 / 捕获 5% | [C] wiki 1859 |
| 碎龙 (63) | 上位 | 碎龙的宝玉 Brach Gem | 7 | 2% | **3%** | 2% | 1% | —（破坏行无稀有） | 断尾 3% | [C] |
| 碎龙 (63) | G | 碎龙的天壳 Brach Pallium | 9 | 2% | **3%** | 2% | 1% | —（破坏行无稀有） | 断尾 3% | [C] |
| 斩龙 (80) | 下位 | 斩龙的逆鳞 Glavenus Plate | 5 | **4%** | 2% | — | 2% | 2%（头） | 剥取 4% | [C] wiki 1829 |
| 斩龙 (80) | 上位 | 斩龙的炎玉 Glavenus Fire Orb | 7 | 3% | **4%** | — | 2% | 2%（头） | 断尾 4% | [C] |
| 斩龙 (80) | G | 斩龙的天鳞 Glavenus Pallium | 9 | 3% | **4%** | — | 2% | 2%（头） | 断尾 4% | [C] |
| 电龙 (81) | 下位 | 电龙的逆鳞 Astalos Plate | 5 | **4%** | — | 2% | 2% | 3%（头）/ 2%（背） | 剥取 4% | [C] wiki 1830 |
| 电龙 (81) | 上位 | 电龙的雷玉 Astalos Electrogem | 7 | **3%** | — | 2% | 2% | 3%（头）/ 2%（背） | 剥取 / 头破坏 3% | [C] |
| 电龙 (81) | G | 电龙的天鳞 Astalos Mantle | 9 | **3%** | — | 2% | 2% | 3%（头）/ 2%（背） | 剥取 / 头破坏 3% | [C] |
| 泡狐龙 (82) | 下位 | 泡狐龙的逆鳞 Mizutsune Plate | 5 | 2% | — | — | **5%** | 3%（头）/ 2%（尾） | 落物 5% | [C] wiki 1832 |
| 泡狐龙 (82) | 上位 | 泡狐龙的水玉 Mizutsune Water Orb | 7 | 2% | — | — | **5%** | 3%（头）/ 2%（尾） | 落物 5% | [C] |
| 泡狐龙 (82) | G | 泡狐龙的天鳞 Mizutsune Pallium | 9 | 2% | — | — | **5%** | 3%（头）/ 2%（尾） | 落物 5% | [C] |
| 巨兽 (83) | 下位 | 巨兽的头壳 Gammoth Scalp | 5 | 2% | — | 5% | — | **10%**（头） | 破坏 10% | [C] wiki 1831 |
| 巨兽 (83) | 上位 | 巨兽的冰玉 Gammoth Ice Orb | 7 | 2% | — | 5% | — | 5%（头） | 捕获 / 头破坏 5% | [C] |
| 巨兽 (83) | G | 巨兽的天壳 Gammoth Pallium | 9 | 2% | — | 3% | — | 5%（头） | 头破坏 5% | [C] |

表注（都来自 [wiki] 怪物页表头）：
- 落物次数：火龙 1 次、雌火龙 2 次、轰龙 3 次、迅龙 2 次、雷狼龙 3 次、碎龙 3 次、斩龙 3 次、电龙 3 次、泡狐龙 3 次、巨兽 3 次。
- 本体剥取次数：除巨兽 **4 次**外均为 3 次；雌火龙页写作 1 次，与系列惯例矛盾，标 [U]，不参与 §3 折算。
- G 档里上一档的稀有素材往往还在表内（例：巨兽 G 级仍可剥到冰玉 4%、捕获 5%；碎龙 G 级宝玉 3%/断尾 4%），表里只列该档**最稀有**的那一件。

## 3. 折算成"每次狩猎到手率"

单次概率乘次数，`P = 1 - (1 - p)^n`（各次独立）。下表用上表的 G 档最稀有素材，仅含**次数确定**的通道（不含捕获，格数 [U]）。

| 怪物 | G 档稀有素材 | 本体剥取 n×p → P | 断尾 | 落物 n×p → P | 指定破坏 | 每狩猎最高 |
|---|---|---|---|---|---|---|
| 火龙 | 火龙的天鳞 | —（无该行） | 3% → 3% | 1×2% → 2.0% | 头 4% | **4.0%**（破坏头） |
| 雌火龙 | 雌火龙的天鳞 | [U] | 3% → 3% | 2×2% → 3.96% | 头 4% | **4.0%**（破坏头） |
| 轰龙 | 轰龙的天鳞 | 3×3% → 8.7% | 2% → 2% | —（G 无该行） | 头 3% | **8.7%**（剥取） |
| 迅龙 | 迅龙的天鳞 | 3×2% → 5.9% | — | 2×1% → 1.99% | 头 4% | **5.9%**（剥取） |
| 雷狼龙 | 雷狼龙的天玉 | 3×3% → 8.7% | 2% → 2% | 3×2% → 5.9% | 头 3% | **8.7%**（剥取） |
| 碎龙 | 碎龙的天壳 | 3×2% → 5.9% | 3% → 3% | 3×1% → 2.97% | —（破坏行无宝玉） | **5.9%**（剥取） |
| 斩龙 | 斩龙的天鳞 | 3×3% → 8.7% | 4% → 4% | 3×2% → 5.9% | 头 2% | **8.7%**（剥取） |
| 电龙 | 电龙的天鳞 | 3×3% → 8.7% | — | 3×2% → 5.9% | 头 3%（背 2%） | **8.7%**（剥取） |
| 泡狐龙 | 泡狐龙的天鳞 | 3×2% → 5.9% | — | 3×5% → **14.3%** | 头 3%（尾 2%） | **14.3%**（落物） |
| 巨兽 | 巨兽的天壳 | 4×2% → 7.8% | — | — | 头 5% | **7.8%**（剥取） |

复算方法：`python -c "print(1-(1-0.03)**3)"` → 0.0873。下位/上位同理替换 p。

### 少见的例外：火龙两家的逆鳞 / 红玉 / 天鳞根本不在剥取表里

火龙三档的 `Body Carve` 里没有逆鳞 / 红玉 / 天鳞（下位 5 行 = 鳞 40 / 甲壳 28 / 翼膜 19 / 火炎袋 8 / 骨髓 5，合计 100%）；雌火龙同样没有（下位 5 行 = 鳞 40 / 甲壳 30 / 翼膜 15 / 火炎袋 10 / 棘 5）。romfs 侧也如此：em001 / em002 的 `hagi` 剥取表里**不含 1183 / 1184 / 1185**（逆鳞 / 红玉 / 天鳞）——字节级佐证。也就是说无论剥多少次，这些稀有件只能从断尾、头 / 背破坏、落物、捕获出。这是"剥取次数多就一定有"的反例。

## 4. 五条实用结论

1. **要火龙系稀有（逆鳞/红玉/天鳞）→ 打头**。三档都是 4%，并且完全不必浪费剥取次数在它们身上。
2. **泡狐龙反过来**：三档稀有件（逆鳞 / 水玉 / 天鳞）的**落物行都是 5%**，落物 3 次 → 14.3%，比剥取（5.9%）高 2.4 倍；前提是触发落物（滑倒时攻击等）。
3. **下位这一档的顶格是 12%，且是并列两处**：轰龙的头壳（头破坏 12%）与迅龙的骨髓（断尾 / 尾破坏 12%）并列最高；巨兽的头壳（头破坏 10%）紧随其后，且巨兽本体可剥 4 次。
4. **"断尾 = 尾破坏"的双通道只有迅龙成立**：骨髓 / 延髓断尾 12%、尾破坏也是 12%，两条路都通。碎龙**没有 `Break Tail` 表**（只有 Break Head / Break Pounder），天壳只能断尾 3% 或本体剥取 2%；斩龙的 `Break Tail` 里**不含 Pallium**（天鳞只在头破坏 2%），所以断尾 4% 才是它最好的路。
5. **雷狼龙、电龙、斩龙、轰龙**：本体剥取 3 次 × 3% ≈ 8.7%，是它们的最优通道——先剥再考虑破部位。

## 5. 完整示例：火龙（Rathalos, db id 2）三档全表

三张透视表，左侧素材、右侧各通道单次概率（"—"=该通道无此行）。每列合计 = 100%，可直接验算。来源：[db] `hunting_rewards` WHERE `monster_id=2`；数值与 [wiki] `text/1863.txt` 逐条一致 [C]；**三档 9 张表另与 romfs `enemy\hagi\hagi_s1/s2/s4_em002_00` 字节核对，逐行一致** [C]（`MHGU/docs/reference/formats/rem.md`）；中文名 = `chS/table/itemData_chS.gmd`（本节用到的锚点：`#2404` 火龙的鳞、`#2406` 火龙的上等鳞、`#2424` 火龙的韧尾、`#4258` 大颗龙泪，全表见 §7 索引）。

### 下位（LR）

| 素材 | 本体剥取 | 断尾 | 捕获 | 落物 | 头破坏 | 背破坏 | 翼破坏 |
|---|---|---|---|---|---|---|---|
| 火龙的鳞 Rathalos Scale | 40% | 20% | — | 24% | 66% | — | — |
| 火龙的甲壳 Rathalos Shell | 28% | — | 42% | — | 30% | 69% | — |
| 火龙的翼膜 Rathalos Webbing | 19% | — | 29% | — | — | — | 15% |
| 火炎袋 Flame Sac | 8% | — | — | — | — | — | — |
| 火龙的骨髓 Rath Marrow | 5% | 7% | 8% | — | — | 30% | — |
| 火龙的尾巴 Rathalos Tail | — | 70% | 19% | — | — | — | — |
| 火龙的逆鳞 Rathalos Plate | — | 3% | 2% | 2% | 4% | 1% | — |
| 火龙的翼爪 Rath Wingtalon | — | — | — | — | — | — | 75% |
| 龙爪 Wyvern Claw（×4） | — | — | — | — | — | — | 10% |
| 龙泪 Wyvern Tear | — | — | — | 74% | — | — | — |

### 上位（HR）

| 素材 | 本体剥取 | 断尾 | 捕获 | 落物 | 头破坏 | 背破坏 | 翼破坏 |
|---|---|---|---|---|---|---|---|
| 火龙的上等鳞 Rathalos Scale+ | 38% | 18% | — | 23% | 57% | — | — |
| 火龙的坚壳 Rathalos Carapace | 29% | — | 38% | — | 25% | 59% | — |
| 火龙的甲壳（×2） Rathalos Shell | — | — | — | — | 8% | — | — |
| 火龙的翼膜（×2） Rathalos Webbing | — | — | 18% | — | — | — | — |
| 爆炎袋 Inferno Sac | 15% | — | — | — | — | — | — |
| 火龙的翼 Rathalos Wing | 13% | — | 10% | — | — | — | 20% |
| 火龙的延髓 Rath Medulla | 5% | 8% | 8% | — | — | 30% | — |
| 火龙的骨髓 Rath Marrow | — | — | — | — | — | 10% | — |
| 火龙的尾巴 Rathalos Tail | — | 56% | 18% | — | — | — | — |
| 火龙的鳞 Rathalos Scale | — | 7% | — | — | — | — | — |
| 火龙的逆鳞 Rathalos Plate | — | 8% | 5% | — | 6% | — | — |
| 火龙的红玉 Rathalos Ruby | — | 3% | 3% | 2% | 4% | 1% | — |
| 火龙的翼爪 Rath Wingtalon（×4） | — | — | — | — | — | — | 70% |
| 龙爪 Wyvern Claw（×5） | — | — | — | — | — | — | 10% |
| 龙泪 Wyvern Tear | — | — | — | 38% | — | — | — |
| 大颗龙泪 Large Wyvern Tear | — | — | — | 37% | — | — | — |

### G 级

| 素材 | 本体剥取 | 断尾 | 捕获 | 落物 | 头破坏 | 背破坏 | 翼破坏 |
|---|---|---|---|---|---|---|---|
| 火龙的厚鳞 Rathalos Shard | 38% | 12% | — | 23% | 57% | — | — |
| 火龙的重壳 Rathalos Cortex | 29% | — | 40% | — | 25% | 69% | — |
| 火龙的坚壳（×2） Rathalos Carapace | — | — | — | — | 8% | — | — |
| 业炎袋 Conflagrant Sac | 15% | — | — | — | — | — | — |
| 火龙的刚翼 Rathalos Fellwing | 13% | — | 18% | — | — | — | 30% |
| 火龙的延髓 Rath Medulla | 5% | 3% | 8% | — | — | 30% | — |
| 火龙的上等鳞 Rathalos Scale+ | — | 4% | — | — | — | — | — |
| 火龙的韧尾 Rathalos Lash | — | 70% | 26% | — | — | — | — |
| 火龙的红玉 Rathalos Ruby | — | 8% | 5% | — | 6% | — | — |
| 火龙的天鳞 Rathalos Mantle | — | 3% | 3% | 2% | 4% | 1% | — |
| 火龙的刚翼爪 Rath Wingtalon+ | — | — | — | — | — | — | 40% |
| 火龙的刚翼爪（×2） | — | — | — | — | — | — | 30% |
| 大颗龙泪 Large Wyvern Tear | — | — | — | 75% | — | — | — |

三档的 `Meowster Hunter`（猫任务行）固定 50% 主素材 / 30% 余料（Scrap）×2 / 20% 次素材，三档同构。

## 6. 任务报酬：按"任务"结算，不按怪

`quest_rewards` 有 37,370 行，键是 `quest_id` + `reward_slot`（A/B），**不是** `monster_id`。每条通道一槽，槽内实际是两行：一行保底（100%）+ 一行抽选（合计 100%），所以槽合计 = 200%。[A]

示例：任务 512 `Island Heat`（下位★5，目标火龙，[db] `quests` + `monster_to_quest`）A 槽：

| 素材 | 概率 | 数量 |
|---|---|---|
| 火龙的甲壳 Rathalos Shell | 100% | 1 |
| 火龙的鳞 Rathalos Scale | 28% | 1 |
| 火龙的翼膜 Rathalos Webbing | 23% | 1 |
| 上等龙骨 Monster Bone+ | 14% | 1 |
| 龙牙 Wyvern Fang | 10% | 5 |
| 火龙的甲壳（抽选行） | 8% | 1 |
| 火龙的骨髓 Rath Marrow | 8% | 1 |
| 火炎袋 Flame Sac | 8% | 1 |
| 火龙的逆鳞 Rathalos Plate | 1% | 1 |

要点：任务报酬里的稀有素材是 **1% 量级**（只有 1 行、1 次机会），所以"刷任务报酬"通常不如"打部位破坏 + 断尾 + 落物"。romfs 侧对应物是 `loc/arc/quest/q0000512.arc :: quest\rem\rem_*`（184 B，结构见 §7 与 `rem.md`；本次未对该任务解码，表内数值取自 db）。想查某只怪出现在哪些任务里：

```sql
SELECT q._id, q.name, q.rank, q.stars
FROM monster_to_quest mq JOIN quests q ON q._id = mq.quest_id
WHERE mq.monster_id = 2 ORDER BY q._id;
```

## 7. 数据来源与如何扩展

| 内容 | 路径 / 位置 | 键 | 置信 |
|---|---|---|---|
| 怪物掉落主表 | `MHGU/docs/data/mhgu.db` → `hunting_rewards` | `monster_id` + `rank` + `condition` | [I]（库来源 MHGenDatabase v2.4.0）；与本页引用的 wiki 页比对后升 [C] |
| 任务报酬 | `MHGU/docs/data/mhgu.db` → `quest_rewards` | `quest_id` + `reward_slot` | [A] 槽合计 200%（任务 512 实测）/ [I] 明细来源 |
| 素材名 / 稀有度 | `MHGU/docs/data/mhgu.db` → `items` | `_id` = `hunting_rewards.item_id` | [I] |
| 怪物 id ↔ 英文名 | `MHGU/docs/data/mhgu.db` → `monsters`（`_id`, `name`） | 本页 10 只：1/2/32/37/57/63/80/81/82/83 | [I] |
| 中文素材名（官方） | `MHGU-private/romfs-extract/gmd/table/itemData_chS.gmd.json`（源 `chS/table/itemData_chS.gmd`，5982 串） | `.strings[2 × items._id].text`（奇数为说明文） | [B] 官方文本 |
| 中文怪物名（官方，主源） | `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json`（源 `chS/arc/resident_chS.arc :: chS\GUI\06_msg\monsterName_chS`，268 条 keyed） | `#i` = 槽位（0..136）：`#0` 雌火龙、`#3` 火龙、`#27` 轰龙、`#31` 迅龙、`#44` 雷狼龙、`#52` 碎龙、`#64` 斩龙、`#66` 电龙、`#67` 泡狐龙、`#68` 巨兽（label 依次 Lioleia / Liolaes / Tigrex / Nargacuga / Zinogre / Bracchidios / Dinovalde / Raizex / Tamamitsune / Gamute） | [B] 官方文本；取该怪自己槽位的名字，不缩短 |
| 中文名交叉校验 | `MHGU-private/docs/reference/mhxx-wiki/text/18xx.txt`；`MHGU/docs/mechanics/systems.md:600-628` | 怪物页行号 | [wiki] 与官方文本逐条一致，仅用字差异（wiki「鱗/骨髄/靭尾/大粒泪/端材」→ 官方「鳞/骨髓/韧尾/大颗龙泪/余料」；怪物名 wiki 作「雄火龙」，官方 monsterName_chS `#3` = 火龙 Liolaes） |
| romfs 侧掉落表（carve/断尾/落物） | `arc/enemy/emNNN_XX.arc :: enemy\hagi\hagi_s1/s2/s4_*`（s1 下位 / s2 上位 / s4 G；表序 剥取 → 断尾 → 落物 →（采集），缺项省略） | type `0x33a84e14`，346 B，`{chance,count,itemId}` @0x1A | [C] 10 只封面怪 87 张表 + 3 张采集表与 db 逐项一致（em001/002/032/037/057/063/080/081/082/083） |
| romfs 侧任务报酬 | `loc/arc/quest/q<7位 id>.arc :: quest\rem\rem_*` | type `0x5b3c302d`，184 B，8 组 × `{chance,count,itemId}` | [C] 任务 101/11413/11460 与 db `quest_rewards` 逐条一致（`rem.md`） |

### §2 稀有素材名 → `itemData_chS` 索引（索引 = 2 × db item_id；本表已由两名核对者独立读取一遍）

| 素材（db 名） | chS # | 素材（db 名） | chS # |
|---|---|---|---|
| 雌火龙的逆鳞 Rathian Plate | #2366 | 雌火龙的红玉 Rathian Ruby | #2368 |
| 雌火龙的天鳞 Rathian Mantle | #2370 | 火龙的逆鳞 Rathalos Plate | #2426 |
| 火龙的红玉 Rathalos Ruby | #2428 | 火龙的天鳞 Rathalos Mantle | #2430 |
| 轰龙的头壳 Tigrex Scalp | #2778 | 轰龙的颚 Tigrex Maw | #2780 |
| 轰龙的天鳞 Tigrex Mantle | #2782 | 迅龙的骨髓 Nargacuga Marrow | #2266 |
| 迅龙的延髓 Narga Medulla | #2268 | 迅龙的天鳞 Nargacuga Mantle | #2270 |
| 雷狼龙的逆鳞 Zinogre Plate | #2510 | 雷狼龙的碧玉 Zinogre Jasper | #2512 |
| 雷狼龙的天玉 Zinogre Skymerald | #2514 | 碎龙的骨髓 Brach Marrow | #2178 |
| 碎龙的宝玉 Brach Gem | #2180 | 碎龙的天壳 Brach Pallium | #2182 |
| 斩龙的逆鳞 Glavenus Plate | #2726 | 斩龙的炎玉 Glavenus Fire Orb | #2728 |
| 斩龙的天鳞 Glavenus Pallium | #2730 | 电龙的逆鳞 Astalos Plate | #2578 |
| 电龙的雷玉 Astalos Electrogem | #2580 | 电龙的天鳞 Astalos Mantle | #2582 |
| 泡狐龙的逆鳞 Mizutsune Plate | #2674 | 泡狐龙的水玉 Mizutsune Water Orb | #2676 |
| 泡狐龙的天鳞 Mizutsune Pallium | #2678 | 巨兽的头壳 Gammoth Scalp | #2624 |
| 巨兽的冰玉 Gammoth Ice Orb | #2626 | 巨兽的天壳 Gammoth Pallium | #2628 |

§5 火龙全表用到的名字另取：`#2404` 火龙的鳞、`#2406` 火龙的上等鳞、`#2408` 火龙的厚鳞、`#2410` 火龙的甲壳、`#2412` 火龙的坚壳、`#2414` 火龙的重壳、`#2416` 火龙的翼膜、`#2418` 火龙的翼、`#2420` 火龙的刚翼、`#2422` 火龙的尾巴、`#2424` 火龙的韧尾、`#2464` 火龙的翼爪、`#2466` 火龙的刚翼爪、`#2468` 火龙的骨髓、`#2470` 火龙的延髓、`#4256` 龙泪、`#4258` 大颗龙泪、`#826` 上等龙骨、`#864` 龙牙、`#866` 龙爪、`#920` 火炎袋、`#922` 爆炎袋、`#924` 业炎袋。

### SQL 食谱（`sqlite3 MHGU/docs/data/mhgu.db` 或任意客户端）

```sql
-- 1) 任意怪物任意档任意通道的完整表（以火龙 G 级本体剥取为例）
SELECT i.name, i.rarity, h.percentage, h.stack_size
FROM hunting_rewards h JOIN items i ON i._id = h.item_id
WHERE h.monster_id = 2 AND h.rank = 'G' AND h.condition = 'Body Carve'
ORDER BY h.percentage DESC;

-- 2) 全部通道清单（含等级段变体）
SELECT DISTINCT condition FROM hunting_rewards ORDER BY condition;

-- 3) 某只怪每档的最稀有素材（本页 §2 的取法）
SELECT h.rank, i.name, i.rarity,
       MAX(CASE WHEN h.condition = 'Body Carve' THEN h.percentage END) AS carve,
       MAX(CASE WHEN h.condition = 'Tail Carve' THEN h.percentage END) AS tail,
       MAX(CASE WHEN h.condition = 'Capture'    THEN h.percentage END) AS capture,
       MAX(CASE WHEN h.condition = 'Shiny'      THEN h.percentage END) AS shiny,
       MAX(CASE WHEN h.condition LIKE 'Break%'  THEN h.percentage END) AS brk
FROM hunting_rewards h JOIN items i ON i._id = h.item_id
WHERE h.monster_id = 2
  AND i.rarity = (SELECT MAX(ii.rarity) FROM items ii
                  JOIN hunting_rewards hh ON hh.item_id = ii._id
                  WHERE hh.monster_id = h.monster_id AND hh.rank = h.rank)
GROUP BY h.rank, i.name ORDER BY h.rank;

-- 4) 哪个任务给某个素材（任务报酬侧）
SELECT q._id, q.name, q.rank, qr.reward_slot, qr.percentage
FROM quest_rewards qr JOIN quests q ON q._id = qr.quest_id
JOIN items i ON i._id = qr.item_id
WHERE i.name = 'Rathalos Plate' ORDER BY qr.percentage DESC;

-- 5) 校验分组合计（应恒为 100）
SELECT monster_id, rank, condition, SUM(percentage) s
FROM hunting_rewards GROUP BY 1,2,3 HAVING s <> 100;   -- 期望 0 行

-- 6) 取官方中文名：先拿 item_id，再到 chS 文本取索引 2×id
SELECT _id, name FROM items WHERE name = 'Rathalos Mantle';   -- → 1215
-- 对应 romfs-extract/gmd/table/itemData_chS.gmd.json 的 .strings[2430].text = 火龙的天鳞
```

扩展到其它 119 只怪：把 `monster_id` 换成目标 id 即可（`monsters` 表 129 行，含亚种/二名：如 513 金火龙、1026 黑炎王、1056 荒钩爪、1105 电龙二名…）。中文名用食谱 6 取（`itemData_chS` 索引 = 2 × item_id）。

## 8. 待补（含"用哪份数据能补上"）

| # | 缺口 | 现状 | 补法 |
|---|---|---|---|
| 1 | romfs 侧掉落表载体 | **已定位并解码**：`arc/enemy/emNNN_XX.arc :: enemy\hagi\hagi_s1/s2/s4_*`（type `0x33a84e14`，346 B，zlib 存在 arc 内）；`s1`=下位、`s2`=上位、`s4`=G，表按固定顺序 **本体剥取 → 断尾 → 落物 →（虫网采集）**，缺项直接省略（巨兽无断尾表，故只有 2 表；雷狼龙有采集表，故 4 表）；行格式 `{u8 chance, u8 count, u16 itemId}` @0x1A，`FF FF 00 00` 收尾，每表合计 100。**10 只封面怪、90 张表已字节核对，与 `hunting_rewards` 逐项一致 [C]**：em001 9/9、em002 9/9、em032 9/9、em037 9/9、em057 9/9 + 采集 3/3、em063 9/9、em080 9/9、em081 9/9、em082 9/9、em083 6/6（无断尾表）。**仍缺**：(a) `Capture` / `Break *` / `Meowster Hunter` 三族**不在 hagi 内**（em002 的 LR 捕获行 db 有、hagi 无）；(b) `s0`（各怪 1–3 张低阶表，如 Rathalos 1202@35/1205@25/460@20/409@20）与 `s3`（1–3 张表，均 1716@100）语义 [U] | 任务报酬另走 `loc/arc/quest/q<id>.arc :: quest\rem\rem_*`（184 B）；解码 `node tools/mhgu/rem.mjs hagi-arc <arc> --json` / `arc <quest.arc>`。其余 128 只怪照抄同一命令即可（body/tail/shiny 三族都能这样核对） |
| 2 | 等级段条件（`Body Carve Lv1-3` … `G5-6`）的语义 | 条件名存在、行数为数千，但对应哪段任务等级未验证 | 用 `quests.level`（1..15 = ★1..G5）与本表等级段做分布交叉 |
| 3 | 捕获每次几格 | 无来源；§3 因此不折算捕获 | wiki 怪物页未标注；可从代码侧（任务结算函数，见 `MHGU/docs/analysis/code/tierb-pass1/tierB-slice-05.md` 的 `mRewardTable[0..3]`）或实机计数确认 |
| 4 | 雌火龙本体剥取次数 | wiki 文本作 1 回，与系列惯例矛盾 [U] | 实机计数，或解 §8.1 的 rem 表 |
| 5 | 二名怪 / 亚种掉落 | 本页只做 10 只封面怪；db 有 129 只（含 1025 紫毒姬、1104 烬灭刃等） | 同一 SQL 食谱 3，换 `monster_id` |
| 6 | 虫网采集 / 猫任务行 / 余料 | 雷狼龙 `Insect Gather Back` 已与 db 逐行对上（[C]，三档见 §1）；db 覆盖范围：`Body Gather` 6 只怪 / 55 行（另有 `Body Gather Lv5-8`、`Lv9-10` 各 1 只 / 6 行）、`Insect Gather Back` 仅雷狼龙 1 只（+`Lv1-4`/`Lv5-8`/`Lv9-10` 共 14 行）、`Neset Gather` 1 只 / 5 行；猫任务行与余料未展开 | 同一 SQL 换 `condition LIKE '%Gather%'` 逐怪取；猫任务/余料查 db `meow_rewards`（1168 行）与 `Meowster Hunter` 分组 |
| 7 | `hunting_rewards` 两组异常 | 桃毛兽王（Congalala, id 21）`Meowster Hunter` 上位 / G 各 3 行合计 **110**，与"每组 100"不符；其余 2,030 组均 100 | 核对源库或实机；不影响本页 10 只封面怪 |

## 9. 一句话自查清单

- 表里数字相加不是 100 → 你看的不是"整档表"（很可能是 `Lv*` / `G*-*` 分段表，或用 MAX 取了跨段最大值）。
- 稀有素材概率 0 → 先看该通道**有没有这一行**，再去算次数。
- 想算整场期望 → `1-(1-p)^n`，n 取 §2 表注的结算次数（剥取 3、巨兽 4；断尾 1；落物 1–3）。
