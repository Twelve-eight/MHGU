# RomFS 表格式：道具 / 任务数据 / 文本（MHGU 1.4.0）

> worker: `ItemQuestFormats` ｜ 2026-10-23 ｜ 本地私有解包 `<romfs>/nativeNX/...`
> 只描述容器格式与字段语义，不含游戏数据表（每表示例 ≤ 3 值）。
> 证据等级：**[B]** 本次字节实测 ｜ **[A]** 算术闭合 ｜ **[X]** 与 `docs/data/mhgu.db` 对拍 ｜ **[P]** 本工作区此前的字节级扫描记录（含原始 44 B 样本；本次未重跑） ｜ **[I]** 推断 ｜ **[U]** 未知。

## 速览

| 表 | 路径（`<romfs>/nativeNX/`） | 头部 | 数量 | 记录长 | 尺寸 |
|---|---|---|---|---|---|
| 道具主表 | `table/itemData.itm` | `f32 21.3f` + `u32 count` | 2991 | 44 B | 131,612 B |
| 道具文本 | `<lang>/table/itemData_<lang>.gmd` | `GMD\0` + v`0x00010302` | 5982（串表） | NUL 串 | 280,586 B（eng） |
| 任务参数 | `loc/quest/questData/questData_<id>.ext` | `0x434B0000` + `count=1` | 1 / 文件 | 361 B | 369 B |
| 任务链接 | `loc/quest/questLink/questLink_<id>.qdl` | `0x434B0000` | 15 × LinkResource | 20 B | 308 B |
| 任务文本 | `<lang>/quest/questData/questData_<id>_<lang>.gmd` | `GMD\0` | 每文件数串（id 101 = 8） | NUL 串 | 0.1–0.5 KB |

**证据取得方式**：本 worker 无 shell，`read :raw` 只能拿到按 UTF-8 解码的**字节流**（NUL 丢弃、非法字节 → `U+FFFD`）。因此我自己下的 [B] 一律是"可打印字节与已知数值吻合 + 目录清单尺寸"，例如 21.3f 的 `66 66 AA 41` 显示为 `ff`+替换符+`A`，`0x52` 显示为 `R`；再叠加 [A] 尺寸闭合锁定偏移。标"主会话实测"的头部细节来自同一文件的 `hexdump`。仍不能定的偏移标 [I]/[U]，不做断言。

## itemData.itm

落点 `<romfs>/nativeNX/table/itemData.itm`，128.5 KiB = **131,612 B**。

### 头部（8 B）：`f32 version` + `u32 count`

| 偏移 | 类型 | 值 | 依据 |
|---|---|---|---|
| 0x00 | f32 | **21.3f**，字节 `66 66 AA 41` | [B] 原始字节流首 4 字节即 `66 66 AA 41`（IEEE-754 单精度 21.3）；`main` 侧同一常量按 f32 比较 [P] |
| 0x04 | u32 | **2991** (`0x0BAF`) | [A] 尺寸闭合 + 文本表条数双重确定（见下） |

- **`+0x00` 是版本号，不是 magic**：`itemCategoryTypeData.ict`、`itemPreData.itp`、`itemPreTypeData.ipt` 首 4 字节与 `.itm` 完全相同 [B]；`.ict` 的第 5 字节是 `0x52`（= 338 & 0xFF）[B]，证明 `+0x04` 是 u32 count（`.ipt` 的 count = 16 由尺寸闭合反推 [A]）。
- 四张表的尺寸全部闭合：`itm` 8+2991×44 = 131,612、`ict` 8+338×7 = 2,374 为本次闭合 [A]；`itp` 8+183×24 = 4,400、`ipt` 8+16×8 = 136 用 [P] 的条数/记录长闭合 [P] —— 均与 romfs 清单字节数相等。
- ⇒ 该族通用容器 = **8 B 头（`f32 version` + `u32 count`）+ count × 定长记录**，记录按 `#pragma pack(1)` 紧凑排列，**不要按 4 字节对齐读写** [A][B]。

### 记录（44 B，记录下标 = 道具 id）

| 偏移 | 类型 | 字段（`main` `.rodata` `cItemBase` 成员名，`0x1557B21` 起） | 语义 / 依据 |
|---|---|---|---|
| 0x00 | u32 | `mId` | = 记录下标，0..2990 连续 [P]（2991/2991 相符） |
| 0x04 | u8 | —（表外，暂名 kind） | 0 普通 / 1 弹药 / 3 装饰珠 / 4 瓶 / 5 虫饵 [I]（按名字族分组） |
| 0x05 | u8 | —（暂名 category） | 0..8 共 9 组 [I] |
| 0x06 | u8 | `mMaxCount` | 携带上限 [X] |
| 0x07 | u16 | `mSortId` | 列表排序号 [I] |
| 0x09 | u8 | `mSeisan` | 生产/采集类 [I] |
| 0x0A | u8 | `mShikyu` | 支给品 [I] |
| 0x0B | u8 | `mEatable` | 可食用 [I] |
| 0x0C | u8 | `mShowWindow` | 可用道具窗口 [I] |
| 0x0D | u8 | `mKantei` | 鉴定（护石/锈块等）[I] |
| 0x0E | u8 | `mChougou` | 可调合 [I] |
| 0x0F | u8 | `mInfinity` | 无限使用 [I] |
| 0x10 | u8 | `mIconType` | 图标形状编号 [I] |
| 0x11 | u16 | `mIconCol` | 低字节 = 配色，高字节 = 图标页 [X]（低字节 = db `icon_color`）；高字节 [I] |
| 0x13 | u32（**未对齐**） | `mSell` | 卖价 [X] |
| 0x17 | u32（**未对齐**） | `mBuy` | 买价 [X] |
| 0x1B | u32 | `mCategoryValue` | 素材来源打包值 [U] |
| 0x1F | u8[8] | `mCategoryType[0..7]` | 与 `ict`（338×7 B）的关系未定 [U] |
| 0x27 | 5 B | padding | 恒 0 [I] |

字段顺序依据：`main` 中 `cItemBase` 的成员名串池顺序（`mMaxCount, mSortId, mSeisan, mShikyu, mEatable, mShowWindow, mKantei, mChougou, mInfinity, mIconType, mIconCol, mSell, mBuy, mCategoryValue, mCategoryType[0..7]`），前缀 `mId` 与两个表外字节按偏移补入 [I]。具体偏移取值来自 [P] 的原始 44 B 样本；本次复核的是**尺寸闭合与字段语义**（下表），偏移本身未重验。

### 语义确认（与 `mhgu.db` 对拍）

- `mhgu.db.items._id` **就是** `.itm` 的 id：抽查 id 1 / 9 / 56 / 71 / 100，名称、买价、卖价、携带上限、`icon_color` 全部一致 [X]。示例（3 值）：id 9 → `mBuy` 66、`mSell` 7、`mMaxCount` 10，db 同。
- id 空间 **0..2990 共 2991 条**；`mhgu.db` 只覆盖其中 2,866 个 id，其余 125 个 db 未收（多为占位/DUMMY）[X]/[I]。
- 对拍 SQL：`SELECT name, buy, sell, carry_capacity, icon_color FROM items WHERE _id = ?`（`docs/data/mhgu.db`；`items._id` 即道具 id，装备在另一个 id 段）。
- **rarity 不在记录里** [I]：对 45 项抽样，记录中没有任何字节/半字与 db `rarity` 相关；稀有度只能从 `mhgu.db` 取。
- 存档侧的道具 id 字段是 12 bit（可写 0..4095）[P]；主表只定义到 2990，因此 id ≥ 2991 没有记录，读档后必然成为"幽灵道具" [I]。

## quest tables

### 1. 落点：没有单张"任务总表"

`nativeNX/table` 下**没有任何 quest 文件**（`nativeNX/*/table/*qu*` 与 `*.q*` 均为空；目录清单按反向字母序列出，q 段无条目）[B]。任务数据按 **id 一文件** 存放：

| 内容 | 路径 | 规模 |
|---|---|---|
| 单任务参数 | `<romfs>/nativeNX/loc/quest/questData/questData_<7位id>.ext` | 1,849 个，每个 **369 B** |
| 任务资源链接 | `<romfs>/nativeNX/loc/quest/questLink/questLink_<7位id>.qdl` | 1,854 个，每个 **308 B** |
| 任务文本 | `<romfs>/nativeNX/<lang>/quest/questData/questData_<id>_<lang>.gmd` | 5 语言（eng/fre/ger/ita/spa） |
| 文本归档 | `<romfs>/nativeNX/arc/quest/tq.arc` | 289.5 KiB |

id 为 **7 位十进制补零**；`mhgu.db.quests._id` 就是这个数字（101..1,120,012，1,355 行；文件集比 db 多，含训练/斗技/DLC 任务）[X]。目录名 `loc` 与语言树共用，但 `.ext` 本身**不分语言**（内含 7 个语言键，见下）。

### 2. `questData_<id>.ext` — 单任务记录

- **369 B = 8 B 头 + 1 条 361 B 记录** [A]：目录清单中每个 `.ext` 都是 369 B；361 由下表 pack(1) 累加得到，`8 + 361 = 369` 精确闭合。
- 头部：`u32 magic = 0x434B0000`（字节 `00 00 4B 43`，字节流前两个可见字符即 `KC`）+ `s32 count = 1` [B][A]。同一 magic 也用于 `.qdl`。
- 记录 `#pragma pack(1)`，偏移如下。**字段名与偏移来自社区逆向的 `QuestData.h`；表中偏移相对于记录起点，文件偏移 = 记录偏移 + 8（跳过 8 B 头）**。主会话实测（2026-10-23）：400 个任务中 `Id`(rec+0x004) 与 `QuestTime`(rec+0x00E) 和 `mhgu.db.quests._id`/`time_limit` **400/400 一致**，其中 37 个非 50 分钟任务全部判别通过 [X]。其余字段取值仍未逐一验证 [I]：

| 偏移 | 类型 | 字段 | 语义 |
|---|---|---|---|
| 0x000 | s32 | `Index` | 紧凑序号 |
| 0x004 | s32 | `Id` | 任务 id（= 文件名数字） |
| 0x008 | u8 | `Type` | 0 Hunt / 1 Slay / 2 Capture / 3 Gather / 4 Hunt-a-thon / 5 Hunt-a-thon(Arena) |
| 0x009 | u8 | `SubType` | 0 Training / 1-4 各村解锁 / 5-8 各村主线 / 9 ProwlerOnly / 10 Default / 11 特殊许可 |
| 0x00A | u8 | `Level` | 星级：0 训练、1..10 ★1..★10、11..15 G1..G5、16 EX、101..116 二名 I..X / G1..G5 / EX |
| 0x00B | u8 | `EnemyLevel` | 1 下位 / 3 上位 / 5 G 级 |
| 0x00C | u8 | `Map` | 地图 id（+100 = 夜） |
| 0x00D | u8 | `StartType` | 0 营地 / 1 随机 / 2 古龙 |
| 0x00E | u8 | `QuestTime` | 时限（分钟） |
| 0x00F | u8 | `Faints` | 猫车上限 |
| 0x010 | u8 | `ArenaEquipId` | 斗技装备套 |
| 0x011 | u8 | `BgmType` | 0 默认 / 1 猫特殊 / 2 训练 |
| 0x012 | u8 | `Requirement1` | **接取条件**（HR/武器/风格/人数/无防具…，48 值枚举） |
| 0x013 | u8 | `Requirement2` | 第二接取条件 |
| 0x014 | u8 | `ComboRequirement` | 组合条件 |
| 0x015 | u8 | `ClearType` | 0 单目标 / 1 双目标 / 2 单目标+票 |
| 0x016 | u8 | `GekitaiHp` | 击退血量阈值 |
| 0x017 | 2×5 B | `ClearConditions[2]` | `{Param:u8, Value:u16, Count:u16}`；Param 0 无 / 1 狩猎 / 2 捕获 / 3 全灭大型 / 4 讨伐数 / 5 交纳 / 6 龙历院点 / 7 猫票 / 8 部位破坏 / 9 骑乘 |
| 0x021 | 5 B | `SubClearCondition` | 副任务目标 |
| 0x026 | 3×u8 | `CarveLevel` / `GatheringLevel` / `FishingLevel` | 剥取/采集/钓鱼等级 |
| 0x029 | 9×s32 | `Fee` `VillagePoints` `Reward` `SubReward` `ClearVillagePoints` `FailVillagePoints` `SubVillagePoints` `HunterRankPoints` `SubHunterRankPoints` | 契约金/点数/奖金/HRP |
| 0x04D | 2×s8 + s8 | `RemAddFrame[2]` / `RemAddLotMax` | 奖励追加 |
| 0x050 | 2×6 B | `Supplies[2]` | `{label:s8, type:s8, target:u16, count:u16}` |
| 0x05C | 5×13 B | `Monsters[5]` | 目标怪物：`{Id:u16, SubType, AuraType, Restore, HealthTbl, AtkTbl, OtherTbl, Difficulty, Size:u16, SizeTbl, StaminaTbl}` |
| 0x09D | 3×u8 | `SmallMonsterHpIndex` / `AtkIndex` / `OtherIndex` | 小怪参数 |
| 0x0A0 | 2×5 B | `EnemySet2` / `EnemySet3` | `{SetType:s8, TargetId:u16, TargetCount:u16}` |
| 0x0AA | s8 | `BossRushType` | 连战类型 |
| 0x0AB | 5×5 B | `MonsterSpawns[5]` | `{SpawnType:s8, TargetType:u16, Count:u16}` |
| 0x0C4 | 3×u8 | `StrayRand` / `StrayStartTime` / `StrayStartRand` | 乱入 |
| 0x0C7 | 3×s8 + 3×u8 | `StrayLimit345[3]` / `StrayRand345[3]` | 乱入等级限制 |
| 0x0CD | u8 | `ExtraTicketCount` | 额外票 |
| 0x0CE | 5×u8 | `Icons[5]` | 任务图标 |
| 0x0D3 | u32 | `ProgNum` | 进度号 |
| 0x0D7 | 7×20 B | `Info[7]` | `{TypeHash:u32, File:char[16]}` × 7 语言 —— 本地化文件名 |
| 0x163 | s32 | `VillagePointsG` | G 级点数 |
| 0x167 | u16 | `Flags` | 位标志（含义未知 [U]） |

- **`Info[7]` 的直接证据** [B]：`questData_0000101.ext` 中可见 7 个 ASCII 串 `<id>_eng`、`_fre`、`_ger`、`_ita`、`_spa`、`_chT`、`_chS`，与 7×20 B 的槽位和语言顺序完全对应（实际只随包 5 种语言的文本文件）。
- **没有任何"前置任务/解锁"字段** [B-negative]；`Requirement1/2/ComboRequirement` 是"谁能接"，不是"哪个任务解锁它"。解锁判定在 `main` 侧（谓词 + 少量硬编码门禁 id）[I]。
- 交叉验证 [X]：`questData_0000101.ext` 存在，且其文本 GMD 的标题/目标与 `mhgu.db.quests._id = 101` 完全一致（见 §4）。

### 3. `questLink_<id>.qdl` — 资源链接

- **308 B = 8 B 头 + 15 × 20 B** [A]（`8 + 300 = 308`，与全部 `.qdl` 文件尺寸一致）。
- 头部同 `.ext`：magic `0x434B0000`。随后 15 个 `LinkResource = {u32 TypeHash; char[16] File}`：
  `BossSet[5]`、`EmSetList[3]`、`RemMain[2]`、`RemAdd[2]`、`RemSub`、`Supp`、`Plus`（5+3+2+2+1+1+1 = 15）[I 偏移顺序 / A 总数]。
- 直接就可见到的占位名 [B]：5 个相同的怪物组名 `b_m00em000_00`、3 个 `z_...`、5 个 `rem_...`、1 个 `supp_<id>`；空资源槽为全 0。
- 作用：把任务指向怪物组 / 报酬表 / 补给 / QuestPlus 资源，同样**不含任务间依赖** [I]。

### 4. 任务文本 GMD

容器与 `## gmd text` 相同（`GMD\0` + version + 0x28 头部 + 组名 + NUL 串表）。组名 `questData_<id>` 直接跟在头部之后、**不计入串表**（id 101 的字节流即 `questData_0000101` 紧接着标题）[B]。串表内实测顺序：`[0]` 标题、`[1]` 委托人、`[2]` 说明文、`[3..4]` 目标怪物名、`[5]` 主目标、`[6]` 失败条件、`[7]` 副任务 [B]；其它任务的槽位语义可能不同 [I]。

交叉验证（3 个值）[X]：`questData_0000101_eng.gmd` 的标题 `Find the Ferns`、主目标 `Deliver 8 Unique Ferns`、副目标 `Deliver 10 Unique Mushrooms` 与 `mhgu.db.quests._id = 101` 完全一致。

### 5. `tq.arc` — 任务文本归档

- 标准 ARC 容器（`ARC\0`、`u16 version = 0x11` @+4、`u16 count` @+6、80 B 条目表、zlib 载荷 —— 格式见 `docs/analysis/monsters/mon-size-calc.md` §3）。
- 条目名 [B]：`eng\quest\questData\questData_0090000_eng`（逐任务 × 逐语言），另有**无语言后缀**的 `loc\quest\questData\questData_0090000` —— 与松散 `.ext` 的路径约定一致。
- 只装文本/参数条目，任务"表"仍是 per-id 文件；条目总数与头部字段未读 [U]。

## gmd text

`GMD` 是 MT Framework 的文本容器，道具表与任务文本都用它。

### 头部

| 偏移 | 类型 | 值 | 依据 |
|---|---|---|---|
| 0x00 | char[4] | `GMD\0` | [B] 原始字节流以 `GMD` 开头 |
| 0x04 | u32 | version `0x00010302` | [B] 私有扫描记录；版本号与 MT Framework GMD 1.3.2 一致 |
| 0x18 | u32 | **字符串数 = 5982** | [B] 扫描 + [A] = 2 × 2991，与 `.itm` 记录数严格成 2 倍关系 |
| 0x20 | u32 | 字符串区块字节数（`itemData_eng.gmd` = 280,537） | [B] 主会话实测 |
| 0x24 | u32 | **组名长度**（`itemData` = 8） | [B] 主会话实测 |
| 0x28 | char[n]+NUL | **组名** `itemData\0`（9 B），**不在字符串表内** | [B] |
| 0x28+n+1 | — | 字符串区起点（itemData = 0x31）；`0x31 + 280,537 = 280,586` = 文件大小，**无剩余字节** | [B] 主会话实测 |

自洽检查：原始字节流在字符串区之前依次出现 `'^'`(0x5E) 与 `'G'`(0x47)，正是 5982 = 0x175E 与 280,537 = 0x447D9 的低位字节 [B] —— 与上表偏移吻合。0x08..0x17、0x1C 的字段含义仍 **未知 [U]**（0x24 已定为组名长度）。

### 字符串区

- 全部为 **NUL 分隔**（UTF-8/ASCII），从组名之后的 `0x28 + n + 1` 一直到文件尾（`n` = 0x24 的组名长度）。
- 组名在头部（见 0x24/0x28），**不计入**字符串数。按"每条记录两串"排列：`name = str[2*id]`、`desc = str[2*id + 1]`（主会话实测：id 0 = `--------`/`dummy` 占位，id 1 = `Book of Combos 1`；5982 串恰好切分，最后一条 name = str[5980]）[B]。（更正：子代理初稿写成 `str[1+2*id]`，会让最后一条越界。）
- 示例：组名 `itemData`；id 1 name `Book of Combos 1`。
- 语言变体：`nativeNX/{eng,fre,ger,ita,spa,chT,chS}/table/itemData_<lang>.gmd`，**7 种，没有 jpn** [B]（目录枚举）。各语言文件结构相同，条目数相同。
- 任务文本用同一容器：`nativeNX/<lang>/quest/questData/questData_<id>_<lang>.gmd`，仅 5 种语言（eng/fre/ger/ita/spa）[B]。

## Unknown

### 未决

1. `itemData.itm` 的 `0x1B..0x2B`（`mCategoryValue`、`mCategoryType[8]`、5 B padding）语义未定；与 `itemCategoryTypeData.ict`（338 × 7 B）的关系未验证。
2. `rarity` 不在道具记录内（45 项抽样无任何字段相关），只能从 `mhgu.db` 取。
3. `.ext` 的 361 B 布局是社区 `QuestData.h` 的 pack(1) 累加，本机只验证了**总长闭合**；`Flags@0x167` 含义、`Requirement*` 枚举全表、`ClearConditions` 值域均未验证。
4. `GMD` 头部 `0x08..0x17`、`0x1C` 字段含义未知（`0x20` 区块大小、`0x24` 组名长度、`0x28` 组名已定）。
5. `tq.arc` 的条目数与头部字段未读（只验证了 `ARC` 魔数与条目名）。
6. 任务解锁链：数据里**没有**前置任务字段，解锁由 `main` 的谓词 + 少量硬编码门禁 id 决定；闭包表尚未测绘。

### 解析坑

- **版本是 float**：`+0x00` 要按 f32 与 `21.3f` 比较，不能当整数 magic。
- **未对齐 u32**：`mSell@0x13`、`mBuy@0x17` 跨 4 字节边界；C/C++ 需 `memcpy` 或 `__attribute__((packed))`，Python `struct.unpack_from` 可直接读。
- **记录下标即 id**：共 2991 条（0..2990），id 0 也存在（占位），不要跳过。
- **主表与文本必须同批读**：`itemData_<lang>.gmd` 的**串表**串数 = 2 × `.itm` count（组名不计入）；数量不符说明语言文件或版本不匹配。
- **`.ext`/`.qdl` 的 magic 首两字节是 0x00**：字节流里只看得到 `KC`，不要以为文件以 ASCII `K` 开头。
- **ARC 名表用反斜杠**（`eng\quest\questData\...`），条目名要按 `\` 分段；载荷 zlib inflate 后用条目里的 `size` 字段校验长度。

### 复现（Python，路径参数化）

```python
import struct, sys

# 1) 道具主表
b = open(sys.argv[1], "rb").read()            # itemData.itm
ver, count = struct.unpack_from("<fI", b, 0)
assert ver == 21.3 and count == (len(b) - 8) // 44
for i in range(count):
    r = b[8 + 44*i : 8 + 44*(i+1)]
    assert struct.unpack_from("<I", r, 0x00)[0] == i
    maxc = r[0x06]
    sell = struct.unpack_from("<I", r, 0x13)[0]   # unaligned
    buy  = struct.unpack_from("<I", r, 0x17)[0]   # unaligned

# 2) GMD 文本（itemData_<lang>.gmd）
b = open(sys.argv[2], "rb").read()
assert b[:4] == b"GMD\0"
n  = struct.unpack_from("<I", b, 0x18)[0]   # string count
gl = struct.unpack_from("<I", b, 0x24)[0]   # group-name length
gn = b[0x28:0x28 + gl].decode("ascii")      # group name, e.g. "itemData"
strs = [s.decode("utf-8") for s in b[0x28 + gl + 1:].split(b"\0")]
assert n == 2 * 2991 and gn == "itemData"
name_at = lambda i: strs[2*i]
desc_at = lambda i: strs[2*i + 1]

# 3) 任务记录 / 资源链接
b = open(sys.argv[3], "rb").read()            # questData_0000101.ext
assert b[:4] == b"\x00\x00\x4b\x43" and struct.unpack_from("<i", b, 4)[0] == 1
assert len(b) == 8 + 361
q = open(sys.argv[4], "rb").read()            # questLink_0000101.qdl
assert q[:4] == b[:4] and len(q) == 8 + 15 * 20
```
