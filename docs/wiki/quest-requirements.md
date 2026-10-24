# 任务承接条件（HR / 武器 / 风格 / 人数）（MHGU / MHXX）

> **本页能查到什么**
> 1. 每个任务记录里 `Requirement1` / `Requirement2` / `ComboRequirement` 三个字节的**完整枚举（50 个值）**，每个值给出**官方简中文本**与出处（`chS` 的 `questMessage_chS`）。
> 2. 1,849 条任务里这三个字节的**实际取值统计**，以及村 / 集会所 / 特殊许可 / 斗技大会 / 配信五个池子的**逐星级承接条件**。
> 3. 「我 HR 多少能接这条」的正确读法：字段给的是任务信息页「承接･加入条件」那一行；另有 HR35/40/70/80/90/95 这类门槛**根本不在本字段里**（§7 说明）。

**一句话结论**：村任务一律「无条件」；集会所下位无 HR 条件、上位 ★4–★6 基本都是「HR4 以上」（★6 仅 1 条例外）、★7 分 HR4/HR7/HR8 三档；G★1–G★3 一律「HR9 以上」、G★4 分 HR9/HR12/HR13；特殊许可（二名）随等级从 HR2 一路抬到 HR13，二名 EX 一律「HR100 以上」；斗技大会与配信挑战任务一律「2人以下限定」。

> 任务名一律用 `mhgu.db.quests.name`（英文）：本作 `chS` 语言树里没有普通任务的中文文本（只有 `guestQuestData` 覆盖配信任务），官方中文任务名不存在，故不编造译名。

---

## 1. 字段在哪、怎么读

| 项 | 值 |
|---|---|
| 文件 | `<romfs>/nativeNX/loc/quest/questData/questData_<7 位 id>.ext`，每个 **369 B** = 8 B 头 + 1 条 **361 B** 记录 |
| 头部 | `u32 magic = 0x434B0000` + `s32 count = 1`，故**记录内偏移 + 8 = 文件偏移** |
| `Requirement1` | 记录 `+0x012` ⇒ 文件 `+0x01A` |
| `Requirement2` | 记录 `+0x013` ⇒ 文件 `+0x01B` |
| `ComboRequirement` | 记录 `+0x014` ⇒ 文件 `+0x01C` |

字段位置来自社区逆向的 `QuestData.h`，本页用 1,849 个 `.ext` 的取值分布 + 4 个语义锚点独立交叉验证（§3）`[C]`。

**读法（Python，一条任务）**：

```python
import struct
b = open(r"<romfs>/nativeNX/loc/quest/questData/questData_%07d.ext" % qid, "rb").read()
assert len(b) == 369 and b[:4] == b"\x00\x00KC"
assert struct.unpack_from("<i", b, 12)[0] == qid      # rec+0x004 Id
req1, req2, combo = b[0x01A], b[0x01B], b[0x01C]
print(req1, req2, combo)                              # 三个 u8，见 §2 查表
```

**查一条具体任务**：先用 `mhgu.db` 把任务名/id 对上，再读文件（任务 id 7 位补零）：

```sql
-- mhgu.db
SELECT _id, hub, rank, stars, name FROM quests WHERE name LIKE '%Sky Render%';
-- -> 11401  →  romfs/.../questData/questData_0011401.ext  →  b[0x01A]=8（HR9以上）
```

**同一条记录里相邻、容易混的字段**（本页不涉及）：`Type`@`+0x008`、`SubType`@`+0x009`、`Level`（星级）@`+0x00A`、`ClearType`@`+0x015`。

---

## 2. 枚举全表：值 → 官方简中文本

**文本来源**：`chS/arc/resident_chS.arc :: GUI/06_msg/questMessage_chS`（解包 JSON：`MHGU-private/romfs-extract/gmd-arc/questMessage_chS.gmd.json`）。该串表在索引 **47** 是 `Entry`=「承接･加入条件」这个标题，紧接着 **48–97 正好 50 条条件串**，与枚举值 **0–49** 一一对应（对应关系见 §3）`[B]`。

**分段**：`0` 无条件 ｜ `1–19` HR（19 个值）｜ `20–33` 武器（14）｜ `34–35` 剑士/枪手 ｜ `36–41` 风格（6）｜ `42–49` 其它限制（8）。

> 文档 `docs/data/romfs-tables.md` 写的是「48 值枚举」，与实测不符：文本表与第三方编辑器 `MHGUQuestEditor` 的 `QuestRequirement` 列表都是 **50 项**，HR 段是 19 项（HR2–HR13 十二项 + HR20/25/30/45/50/60/100 七项）`[C]`。

| 值 | questMessage 串号 | 官方简中文本 | GMD 标签 | 本作 req1 次数 | 本作 req2 次数 |
|---:|---:|---|---|---:|---:|
| 0 | 48 | 无条件 | `Unqualified` | 942 | 1826 |
| 1 | 49 | HR2以上 | `GreaterThanHR2` | 12 | 0 |
| 2 | 50 | HR3以上 | `GreaterThanHR3` | 1 | 0 |
| 3 | 51 | HR4以上 | `GreaterThanHR4` | 276 | 4 |
| 4 | 52 | HR5以上 | `GreaterThanHR5` | 14 | 0 |
| 5 | 53 | HR6以上 | `GreaterThanHR6` | 29 | 0 |
| 6 | 54 | HR7以上 | `GreaterThanHR7` | 35 | 0 |
| 7 | 55 | HR8以上 | `GreaterThanHR8` | 82 | 0 |
| 8 | 56 | HR9以上 | `GreaterThanHR9` | 209 | 5 |
| 9 | 57 | HR10以上 | `GreaterThanHR10` | 10 | 0 |
| 10 | 58 | HR11以上 | `GreaterThanHR11` | 26 | 0 |
| 11 | 59 | HR12以上 | `GreaterThanHR12` | 20 | 0 |
| 12 | 60 | HR13以上 | `GreaterThanHR13` | 112 | 0 |
| 13 | 61 | HR20以上 | `GreaterThanHR20` | 0 | 0 |
| 14 | 62 | HR25以上 | `GreaterThanHR25` | 0 | 0 |
| 15 | 63 | HR30以上 | `GreaterThanHR30` | 0 | 0 |
| 16 | 64 | HR45以上 | `GreaterThanHR45` | 0 | 0 |
| 17 | 65 | HR50以上 | `GreaterThanHR50` | 0 | 0 |
| 18 | 66 | HR60以上 | `GreaterThanHR60` | 0 | 0 |
| 19 | 67 | HR100以上 | `GreaterThanHR100` | 18 | 0 |
| 20 | 68 | 大剑限定 | `GreatSword` | 0 | 0 |
| 21 | 69 | 太刀限定 | `LongSword` | 0 | 0 |
| 22 | 70 | 单手剑限定 | `SwordAndShield` | 0 | 0 |
| 23 | 71 | 双剑限定 | `DualBlades` | 0 | 0 |
| 24 | 72 | 长枪限定 | `Lance` | 0 | 0 |
| 25 | 73 | 铳枪限定 | `Gunlance` | 0 | 0 |
| 26 | 74 | 大锤限定 | `Hummer`（原文如此） | 0 | 0 |
| 27 | 75 | 狩猎笛限定 | `HuntingHorn` | 0 | 0 |
| 28 | 76 | 斩击斧限定 | `SwitchAxe` | 0 | 0 |
| 29 | 77 | 盾斧限定 | `ChargeAxe` | 0 | 0 |
| 30 | 78 | 操虫棍限定 | `InsectAndRod` | 0 | 0 |
| 31 | 79 | 轻弩炮限定 | `LightBowgun` | 0 | 0 |
| 32 | 80 | 重弩炮限定 | `HeavyBowgun` | 0 | 0 |
| 33 | 81 | 弓限定 | `Bow` | 0 | 0 |
| 34 | 82 | 剑士限定 | `MeleeOnly` | 0 | 0 |
| 35 | 83 | 枪手限定 | `GunnerOnly` | 0 | 0 |
| 36 | 84 | 公会风格限定 | `GuildStyle` | 0 | 0 |
| 37 | 85 | 强袭风格限定 | `StrikerStyle` | 0 | 0 |
| 38 | 86 | 空战风格限定 | `BushilStyle` | 0 | 0 |
| 39 | 87 | 武士道风格限定 | `BhushidoStyle` | 0 | 0 |
| 40 | 88 | 英勇限定 | `TatsujinStyle` | 1 | 0 |
| 41 | 89 | 炼金限定 | `KizunaStyle` | 1 | 0 |
| 42 | 90 | 禁止猎喵 | `NyanterNG` | 0 | 0 |
| 43 | 91 | 猎喵限定 | `NyanterOnly` | 0 | 0 |
| 44 | 92 | 稀有度1武器限定 | `Rare1Weapon` | 0 | 0 |
| 45 | 93 | 未装备防具･护石 | `NoArmors` | 1 | 1 |
| 46 | 94 | 只能携带弹･瓶袋进入 | `NoItem` | 0 | 13 |
| 47 | 95 | 1人限定 | `Only1` | 0 | 0 |
| 48 | 96 | 2人以下限定 | `LessThan2` | 60 | 0 |
| 49 | 97 | 3人以下限定 | `LessThan3` | 0 | 0 |

**取值统计**（1,849 个 `.ext` 全扫，§9 复现）`[C]`：

- `Requirement1` 只用到 18 个值：`0, 1…12, 19, 40, 41, 45, 48`。
- `Requirement2` 只用到 5 个值：`0`（1,826 条）、`3`（4）、`8`（5）、`45`（1）、`46`（13）。
- `ComboRequirement` **1,849 条全部为 0**——这个「组合条件」字段在本版本里完全没用上 `[C]`。

> 值 40/41/45 在 **req1** 里各只出现 1 次，而且都落在**占位任务**上：`questData_0090028` / `0090029` 的文本串只有 `@`、`dummy`、`monster dummy` 这类占位内容，`1010005` 整篇是 `DUMMY`。所以这三个 req1 值**不是**真实任务的条件；45 在 **req2** 里另有 1 条真实任务（Baki，见 §5）。

---

## 3. 值 → 文本的对应关系是怎么定下来的

对应规则是 **questMessage 串号 = 值 + 48**。四个独立锚点全部吻合 `[C]`：

| 锚点 | 数据侧（字节） | 文本侧 | 说明 |
|---|---|---|---|
| 0 | 942 条任务 req1=0，含**全部 375 条村任务**与集会所下位 ★1–★2（下位★3 仅 1 条例外） | 串 48「无条件」 | 村任务确实没有任何承接条件 |
| 46 | 13 条 req2=46：12 条 MHX 旧二名的捕获任务 + 配信任务 `Drifters: Isle of Lost Souls` | 串 94「只能携带弹･瓶袋进入」 | 该配信任务的说明文原文：`take no item into battle with you`（`questData_1011005_eng.gmd`）——一句话坐实 46 = 无道具 |
| 48 | 60 条 req1=48：**全部 17 条斗技大会** + 41 条竞技场型配信 + 2 条占位模板 | 串 96「2人以下限定」 | 斗技大会/挑战任务只允许 2 人 |
| 19 | **全部 18 条二名 EX**（Permit G★16） | 串 67「HR100以上」 | EX 是终盘内容，HR100 正是上限 |

46 这个锚点还能从任务文本反向印证：12 条二名捕获任务的说明文都写「**Supplies for capturing will be provided. Use them wisely.**」（陷阱由补给箱提供），与「不能带道具」这个限制互为因果；而没有该值的捕获任务（例：`Silverwind II: Capture`、`Redhelm G1: Capture`）说明文写的是「make sure to be equipped to capture」「Supplies will be delayed」`[C]`。

文本表与第三方编辑器的两份列表顺序**逐项一致**，而且只有「串号 = 值 + 48」这一种偏移能让上面四个锚点同时成立：偏移小 1 会让 0 落到标题串 `Entry`，偏移大 1 会让 0 落到「HR2以上」`[C]`。

---

## 4. 逐 hub / 星级汇总

统计口径：`mhgu.db.quests` 的 `hub` + `stars`（星级），条件值来自同名 `questData_<id>.ext` 的字节。括号内是条数。「—」= 该档没有任务。

**分母说明**：`mhgu.db` 五池合计 **1,355 行**（村 375 + 集会所 569 + 特殊许可 228 + 斗技大会 17 + 配信 166）；romfs 里另有 **494 个 `.ext` 在 db 中没有对应行**（训练/占位/DLC 变体等，其中 457 条 `Requirement1=0`）。下面按 db 行分星级（合计 1,355），而 §2 的计数分母是**全量 1,849** `[C]`。

**速查**：

| 想打的内容 | 承接条件（字段） |
|---|---|
| 村任务 ★1–★10 | 无条件 |
| 集会所下位 ★1–★3 | 无条件（★3 仅 1 条 HR3） |
| 集会所上位 ★4–★6 | HR4（★6 有 1 条 HR8） |
| 集会所上位 ★7 | HR4 / HR7（4 条）/ HR8（32 条狞猛·古龙档） |
| 集会所 G★1–G★3 | HR9 |
| 集会所 G★4 | HR9（30 条）/ HR12（1 条）/ HR13（55 条） |
| 二名 下位 I–III | HR2 |
| 二名 上位 I–X | HR4 → HR8（随等级逐条升） |
| 二名 G1–G5 | HR9 → HR13（逐条） |
| 二名 EX | HR100 |
| 斗技大会 / 竞技场型配信 | 2人以下（部分另需 HR4 / HR9） |

### 4.1 村（Village，375 条）：**全部「无条件」**

`mhgu.db` 里 Village 共 375 条，`stars` 1–10（同一星里下位/上位混排，如 ★6 有 25 条下位 + 20 条上位；G 级 ★10 的 16 条是 `Advanced:` 系列）。**375 条的 `Requirement1` 全部 = 0** `[C]`。

> 但**能不能看到**这些任务另有门槛（出现条件），见 §7：村★10 的终盘紧急带 HR9+、村★10 高难度族要「HR 解放后」，这些都**不写在任务记录里** `[W]`。

### 4.2 集会所（Guild，569 条）

| 星级 | 条数 | `Requirement1` 分布 | 承接条件（HR） |
|---|---:|---|---|
| 下位 ★1 | 31 | 0×31 | — |
| 下位 ★2 | 35 | 0×35 | — |
| 下位 ★3 | 38 | 0×37, 2×1 | — / HR3（`Two-headed Carcass`） |
| 上位 ★4 | 38 | 3×38 | HR4 |
| 上位 ★5 | 51 | 3×51 | HR4 |
| 上位 ★6 | 71 | 3×70, 7×1 | HR4 / HR8（`Watch Your Steppe`） |
| 上位 ★7 | 75 | 3×39, 6×4, 7×32 | HR4 / HR7 / HR8 |
| G★1 | 32 | 8×32 | HR9 |
| G★2 | 53 | 8×53 | HR9 |
| G★3 | 59 | 8×59 | HR9 |
| G★4 | 86 | 8×30, 11×1, 12×55 | HR9 / HR12（`Castle on the Run`） / HR13 |

要点 `[C]`：

- **上位解禁就是 HR4**：上位 ★4–★5 的每一条、★6 的 70/71 条都是「HR4以上」，和「集会所上位从 HR4 开始」吻合。
- **★7 内部分三档**：HR4 是普通任务；**HR7** 只有 4 条（`Hellfire Star`、`Ring of the Silver Sol`、`Ring of the Golden Lune`、`Usurpers of the Throne`）；**HR8** 32 条是 MHXX 追加的高难度档（狞猛化与古龙级，如 `Kushala Daora Strikes`、`Emperor of Flame`、`Absolute Zero`、`Child of Destruction`）。
- **G 级底为 HR9**：G★1–G★3 的 144 条**无一例外**是「HR9以上」；G★4 里 30 条仍是 HR9（含该星的关键/紧急与多条猎喵用任务），55 条抬到 **HR13**，1 条（`Castle on the Run`）HR12。

### 4.3 特殊许可 / 二名（Permit，228 条）

| 星级 | 条数 | `Requirement1` 分布 | 承接条件（HR） |
|---|---:|---|---|
| 下位 ★1–★3 | 4 / 4 / 4 | 1×4（每星） | HR2 |
| 上位 ★1–★3 | 8 / 8 / 8 | 3×1, 4×3, 5×4（每星） | HR4×1, HR5×3, HR6×4 |
| 上位 ★4 | 12 | 3×4, 4×4, 5×4 | HR4 / HR5 / HR6 各 4 |
| 上位 ★5 | 12 | 3×3, 4×1, 5×1, 6×7 | HR4×3, HR5×1, HR6×1, HR7×7 |
| 上位 ★6–★8 | 12 / 12 / 12 | 5×4, 6×8（每星） | HR6×4, HR7×8 |
| 上位 ★9–★10 | 12 / 12 | 7×12（每星） | HR8 |
| G★1–G★2 | 18 / 18 | 8×4, 9×4, 10×7, 11×2, 12×1（每星） | HR9×4, HR10×4, HR11×7, HR12×2, HR13×1 |
| G★3 | 18 | 10×11, 11×6, 12×1 | HR11×11, HR12×6, HR13×1 |
| G★4 | 18 | 11×8, 12×10 | HR12×8, HR13×10 |
| G★5 | 18 | 12×18 | HR13 |
| EX（db ★16） | 18 | 19×18 | **HR100** |

要点 `[C]`：

- 二名**下位段（I–III）统一 HR2**；wiki 只对 4 只二名写了「HR2+」，其余首关没写 HR 文案，与本数据不冲突 `[C]+[W]`。
- 同一星级内不同二名的 HR 不同（例：上位★1 是 1 只 HR4 + 3 只 HR5 + 4 只 HR6），所以**不能按星级一刀切**，必须逐条查。
- G 段从 HR9 一路抬到 HR13，**EX 全部 HR100**。

### 4.4 斗技大会（Arena，17 条）与配信挑战任务

| 池 / 星级 | 条数 | 条件 |
|---|---:|---|
| 斗技大会 ★2–★3（下位） | 6 | 2人以下 |
| 斗技大会 ★4–★6（上位） | 3 | 2人以下 + HR4（3 条全部带第二条件） |
| 斗技大会 ★7（上位） | 3 | 2人以下（2 条）/ 2人以下 + HR4（1 条） |
| 斗技大会 G★1–G★4 | 5 | 2人以下 + HR9 |

细节（17 条全部列出）`[C]`：

| id | 任务 | req1 / req2 | 条件 |
|---|---|---|---|
| 20001–20004 | Grudge Match: Malfestio / Khezu / Najarala / Rathalos | 48 / 0 | 2人以下 |
| 20005 | Grudge Match: Kecha Wacha | 48 / 3 | 2人以下 + HR4 |
| 20006 | Grudge Match: Plesioth | 48 / 3 | 2人以下 + HR4 |
| 20007 | Grudge Match: Brachydios | 48 / 3 | 2人以下 + HR4 |
| 20008 | Grudge Match: Barioth | 48 / 0 | 2人以下 |
| 20009–20011 | Grudge Match: Yian Garuga / Uragaan / Seregios | 48 / 8 | 2人以下 + HR9 |
| 120001–120002 | Grudge Match: Great Maccao / Gypceros（猎喵用） | 48 / 0 | 2人以下 |
| 120003 | Grudge Match: Bird Wyverns（猎喵用） | 48 / 3 | 2人以下 + HR4 |
| 120004 | Grudge Match: Barroth（猎喵用） | 48 / 0 | 2人以下 |
| 120005–120006 | Grudge Match: Tetsucabra / Congalala（猎喵用） | 48 / 8 | 2人以下 + HR9 |

> 「斗技大会最多 2 人」是游戏规则，本字段的文本「2人以下限定」与之吻合；`req2` 的 3/8 分别等于「HR4以上」「HR9以上」，但**为什么只有 9 条斗技大会写了第二条件、另外 8 条没写，没有代码层证据** ⇒ 该分配逻辑 `[U]`。

### 4.5 配信（Event，166 条）

| 星级 | 条数 | 条件分布 |
|---|---:|---|
| 下位 ★2–★3 | 7 | 无条件 |
| 上位 ★4 | 8 | 2人以下×5 / HR4×3 |
| 上位 ★5 | 5 | HR4×5 |
| 上位 ★6 | 18 | 2人以下×13 / HR4×5 |
| 上位 ★7 | 61 | HR4×37 / HR8×22 / 2人以下×2 |
| G★1 | 2 | HR9×2 |
| G★2 | 12 | HR9×6 / 2人以下×6 |
| G★3 | 19 | 2人以下×12 / HR9×7 |
| G★4 | 34 | HR13×23 / HR9×8 / 2人以下×3 |

要点 `[C]`：

- 配信任务里数量最多的两类是「HR 门槛」与「2人以下」——**挑战任务（Challenge）与竞技场型配信一律 2 人以下**，其余按等级给 HR。
- 两条配信任务还有**非 HR 的特殊限制**：`Baki: Biggest vs. Strongest`（1010103）为 HR4 + **未装备防具･护石**（req2=45）；`Drifters: Isle of Lost Souls`（1011005）为 HR9 + **只能携带弹･瓶袋进入**（req2=46）。
- 41 条配信是 2 人以下（竞技场型/挑战型），外加 2 条占位模板也写着 48：`1020030`（标题 `@Arena Instructor`）与 `1120013`（标题 `Quest Template`），两者正文都是 dummy。

---

## 5. 只有 23 条任务有「第二条件」

`Requirement2` 与 `Requirement1` **共用同一枚举**（同一张文本表，§2）；非 0 的只有 23 条 `[C]`：

| 值 / 文本 | 条数 | 任务 |
|---|---:|---|
| 3 = HR4以上 | 4 | 斗技大会 20005 / 20006 / 20007 / 120003 |
| 8 = HR9以上 | 5 | 斗技大会 20009 / 20010 / 20011 / 120005 / 120006 |
| 45 = 未装备防具･护石 | 1 | 配信 `Baki: Biggest vs. Strongest`（1010103） |
| 46 = 只能携带弹･瓶袋进入 | 13 | 配信 `Drifters: Isle of Lost Souls`（1011005） + 12 条 MHX 旧二名的捕获任务 |

**12 条「无道具」二名捕获任务 = MHX 时代的 12 只二名各一条**（「提供捕获用补给」的那一关，通常是 VII 关；MHXX 追加的 6 只二名没有这一档，它们的 G1 捕获关写「补给延迟、请自备」）`[C]`：

`Redhelm VII: Capture`(40107)、`Snowbaron VII: Capture`(40207)、`Stonefist VII: Capture`(40307)、`Dreadqueen VII: Capture`(40407)、`Drilltusk VII: Capture`(40507)、`Silverwind VII: Capture`(40607)、`Crystalbeard VII: Capture`(40707)、`Deadeye VII: Capture`(40807)、`Dreadking VII: Capture`(40907)、`Thunderlord VIII: Capture`(41008)、`Grimclaw VIII: Capture`(41108)、`Hellblade VIII: Capture`(41208)。

这 12 条的说明文一律写「Supplies for capturing will be provided. Use them wisely.」，与「不能自带道具、陷阱由补给箱发」互为印证；其余捕获关（如 `Silverwind II: Capture`、`Redhelm G1: Capture`，以及 MHXX 6 只二名的 `Nightcloak G1: Capture`）明确要求自备捕获道具，因此没有这个限制 `[C]`。

---

## 6. 本作**没有**用到的值（`[U]`）

| 值段 | 文本 | 状态 |
|---|---|---|
| 13–18 | HR20 / HR25 / HR30 / HR45 / HR50 / HR60 | 文本存在，**本作 0 条任务使用** `[C]`；是否在别处（如 DLC 未随包、活动任务）使用 `[U]` |
| 20–33 | 14 种武器限定 | 0 条 `[C]`；斗技大会的武器限制走 `ArenaEquipId`（记录 `+0x010`），不走本字段 `[I]` |
| 34–35 | 剑士 / 枪手限定 | 0 条 `[U]` |
| 36–41 | 6 种风格限定 | 仅值 40/41 出现在占位任务（`DUMMY`）上，**真实任务 0 条** `[C]` |
| 42 | 禁止猎喵 | 0 条 `[U]` |
| 43 | 猎喵限定 | 0 条 `[C]`——猎喵专属任务在本作改用记录 `+0x009 SubType = 9` 标记（120 条，其中 103 条在 `mhgu.db` 有行）；另有 18 条 db 标 `hunter_type=1` 的任务 SubType 是 10，说明猎喵限制还有其它表示方式 `[U]` |
| 44 | 稀有度1武器限定 | 0 条 `[U]` |
| 47 / 49 | 1人限定 / 3人以下 | 0 条 `[U]` |

> 结论：**MHGU 的真实任务只用到 17 个值**（`0`、`1–12`、`19`、`45`、`46`、`48`），即「无条件 / HR / 无防具 / 无道具 / 2人以下」五类；**其余 33 个枚举值全部**（13–18、20–44、47、49）在本版本里没有任何真实任务使用 `[C]` 计数 / `[U]` 使用面。

---

## 7. 字段里查不到的 HR 门槛：出现条件 ≠ 承接条件

这是本页最容易踩的坑：

1. **枚举里根本没有 HR35 / HR40 / HR70 / HR80 / HR90 / HR95**。HR 段只有 19 个值，最大到 HR100（§2）。所以 wiki 上「G★4 某任务 HR40以上」这类门槛**不可能**存在本字段里 `[C]`。
2. 实际也确实如此：G★4 的 86 条里 55 条写「HR13以上」、30 条写「HR9以上」、1 条写「HR12以上」，而 wiki 给这些任务标的出现门槛是 HR35–100 `[C]+[W]`。
3. 「前置任务 / 解锁链」也不在任务记录里——整条 361 B 记录没有任何 prerequisite 字段 `[B]`。解锁判定在 `main` 侧（谓词 + 少量硬编码门禁 id）`[I]`。

因此回答「我 HR 多少能接 X」要分两层：

```
能否在任务列表看到 X  ← 出现条件（wiki / main 谓词：HR35、狞猛计数、前置任务、HR解放…）  [W]/[I]
能否点「承接」（以及队友加入）  ← 本字段 Requirement1/2（HR / 人数 / 无防具 / 无道具）      [C]
```

wiki 侧的出现条件（`docs/mechanics/quests.md` §5，`[W]`）：

| 任务 | 出现条件 |
|---|---|
| 村★10 终盘紧急（如 `Grave Peril`、`Stormlord`） | HR9+ 且 ★10 关键全清 |
| 村★10 高难度族 | 「HR 解放后」 |
| G★4 部分任务 | HR35 / HR40 / HR45 / HR50 / HR60 / HR70 / HR80 / HR90 / HR95 / HR100（逐条） |
| 二名 EX | HR100+（与本字段一致） |
| 集★7 的 MHXX 追加任务 | HR8+ 且集★6 狞猛化 ≥2 |
| 集★7 `Ring of the Golden Lune` / `Usurpers of the Throne` | HR9+ 且大型怪物 200 体以上（本字段写的是 HR7） |

---

## 8. 未确认 / 局限

| # | 项 | 状态 |
|---|---|---|
| 1 | `req2` 与 `req1` 并存时，游戏是否把两条都显示在「承接･加入条件」行 | 推断（文本表只有一个标题串，值 3/8/45/46 与 req1 组合自洽）`[I]` |
| 2 | 斗技大会 9 条为什么额外写 HR4/HR9 第二条件（另 8 条没写） | `[U]` |
| 3 | 值 13–18（HR20–HR60）是否被任何未随包/未登场任务使用 | `[U]` |
| 4 | 值 47/49（1 人 / 3 人以下）是否有任务用 | `[U]` |
| 5 | 武器/风格/剑枪限定在本作是否真的完全未用（还是由 `ArenaEquipId`、装备 UI 侧限制） | `[U]` |
| 6 | 4 个语义锚点覆盖 0/19/46/48；中间 1–12 的 HR 段靠「枚举顺序 + 编辑器列表 + 星级分布」三重一致性支持，未逐条实机核对 | `[I]`→`[C]` 之间 |
| 7 | 本页任务名用英文（`mhgu.db`），官方中文任务名不存在 | `[B]` 负面 |

---

## 9. 复现

脚本：`G:/omp works/.tmp/mhgu/questreq_scan.py`（输出 `questreq-scan.txt` + `questreq.csv`）。

```python
import os, struct, collections
ROM = r"<romfs>/nativeNX/loc/quest/questData"
c1, c2, c3 = collections.Counter(), collections.Counter(), collections.Counter()
for fn in os.listdir(ROM):
    if not fn.endswith(".ext"):
        continue
    b = open(os.path.join(ROM, fn), "rb").read()
    assert len(b) == 369 and b[:4] == b"\x00\x00KC"   # magic 0x434B0000
    c1[b[0x01A]] += 1; c2[b[0x01B]] += 1; c3[b[0x01C]] += 1
print(sorted(c1.items())); print(sorted(c2.items())); print(sorted(c3.items()))
```

结果与 §2 的计数一致：req1 `{0:942, 1:12, 2:1, 3:276, 4:14, 5:29, 6:35, 7:82, 8:209, 9:10, 10:26, 11:20, 12:112, 19:18, 40:1, 41:1, 45:1, 48:60}`、req2 `{0:1826, 3:4, 8:5, 45:1, 46:13}`、combo 全 0。
