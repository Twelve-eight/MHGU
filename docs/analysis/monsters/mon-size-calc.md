# 体型计算（mini/maxi/king 冠）机制 — `cEmSizeCalcTblElement` 逆向

> worker: `EmSizeCalc` ｜ 生成 2026-10-23 ｜ 坐标：`vaddr`（`flat_off = vaddr + 0x100`）；`char_off` = 猎人块内偏移，
> `system` 绝对 = `hunterAdds[slot] + char_off`，`hunterAdds = [0x18CC9C, 0x2AC560, 0x3CBE24]`（slot0 猎人B / slot1 猎人A）。
> clean = `MHGU/save-snapshots/20261022-clean-reference/system_CLEAN`（slot1 @0x2AC560）；
> dirty = `MHGU/save-snapshots/20261022-v6-ready/system`（slot0 @0x18CC9C）。
> 证据等级：**[D]** 反汇编原文 ｜ **[B]** 存档/镜像字节实测 ｜ **[A]** 算术闭合 ｜ **[I]** 推断 ｜ **[U]** 未知。
> 本 worker 无 exec：镜像/存档字节由 Main 代跑脚本产出。
>
> **直接看结论** → 文末 [§结论速览]（体型相关表 → 地址 → 条目数 → 值域 → 与存档对拍 → 置信度）与 [§机制模型]。

脚本与输出（除 `size-final.mjs` 外均已跑，产物在 `.tmp/mhgu/mon/`）：
| 脚本 | 输出 | 内容 |
|---|---|---|
| `size-calc.py` | `size-calc.out.txt` | 字符串块原文、指针引用扫描、索引序列表、f32/u16 数组、概率对、资源名、存档解码 |
| `size-find.mjs` | `size-find.out.txt` | `movw/movt` 寻址扫描 + 对照组 + 资源名区 hexdump |
| `size-hash.mjs` | `size-hash.out.txt` | 9 种哈希 × 3 大小写 × 带/不带 NUL 的常量搜索（发现 `crc32raw`） |
| `size-hash2.mjs` | `size-hash2.out.txt` | 全部 26,282 个 rodata 串建 `hash→串` 表并全镜像反查 + 注册表边界 |
| `size-load.mjs` | `size-load.out.txt` | 19 个锚点常量在 `.text` 的字面量/`movw/movt` 反查（全 0 命中） |
| `size-index.mjs` | `size-index.out.txt` | 2 字节步长穷举索引序列表 + cm 量级 f32 连跑 + 计数常量上下文 |
| `size-manifest.mjs` | `size-manifest.out.txt` | 资源清单表边界/条目数/类型直方图 + 工厂指针表搜索 |
| `size-final.mjs` | `size-final.out.txt` | 资源名哈希反解尝试 + 击杀/捕获/体型三表按槽并排校验 |

复现（cwd = `G:/omp works`）：
```bash
PY="archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe"
"$PY" .tmp/mhgu/mon/size-calc.py > .tmp/mhgu/mon/size-calc.out.txt
for f in size-find size-hash size-hash2 size-load size-index size-manifest size-final; do
  node .tmp/mhgu/mon/$f.mjs > .tmp/mhgu/mon/$f.out.txt 2>&1
done
```

---

## 已确认（有证据）

### 1. rodata 成员名块精确顺序（`size-calc.out.txt` §S1）— [B] 字节实测

块内**紧邻无填充**（每串后立刻接下一串，`addr_next = addr + len + 1`），说明是**单一字符串池**，不是每类独占一段：

| vaddr | 名称 | 归属（按 `cEm*` 类名分隔推断） |
|---|---|---|
| 0x1552600 | `iWaza_OtherParts_Bias` | （前一块，`cEm` 部位参数） |
| 0x1552616 | `Support_OtherParts_Bias` | 同上 |
| 0x155262e | `MeatChange_OtherParts_Bias` | 同上 |
| 0x1552649 | `StaminaSubRate` | 同上 |
| 0x1552658 | `IkariRate` | 同上 |
| 0x1552662 | `EatRateChange` | 同上 |
| 0x1552670 | `StaminaTimeVal` | 同上 |
| 0x155267f | `BuiFirstRandomFlag` | 同上 |
| 0x1552692 | `mPartsChangeData` | 同上 |
| 0x15526a3 | `mPartsAuraData` | 同上 |
| 0x15526b2 | `mModifyData` | 同上 |
| **0x15526be** | **`cEmSizeCalcTblElement`** | ← 类名，体型表元素 |
| **0x15526d4** | **`mMonsterIndex`** | 成员 1 |
| **0x15526e2** | **`mTrueSize`** | 成员 2 |
| **0x15526ec** | **`mSmallScale`** | 成员 3 |
| **0x15526f8** | **`mBigScale`** | 成员 4 |
| **0x1552702** | **`mKingScale`** | 成员 5 |
| **0x155270d** | **`mQuestSizeMin`** | 成员 6 |
| **0x155271b** | **`mQuestSizeMax`** | 成员 7 |
| 0x1552729 | `cEmSizeCalcTblElementXML` | ← XML 绑定子类名（暗示存在 XML 装载路径 [I]） |
| **0x1552742** | **`cEmSizeYureTblElement`** | ← 第二个类：尺寸浮动（尺寸分布）表元素 |
| 0x1552758 | `cEmSizeYureTbl` | ← 容器类 |
| **0x1552767** | **`mScaleRate`** | 成员 1 |
| **0x1552772** | **`mProbability`** | 成员 2 |
| 0x155277f | `cEnemyDebugSetData` | 下一块 |
| 0x1552792 | `mPropName` | 同上 |
| 0x155279c | `mMonsterType` | 同上 |
| 0x15527a9 | `cEnemyDebugSetDataXML` | 同上 |
| 0x15527bf | `cEnemyResourceBroker` | 同上 |
| 0x15527d4 | `uEm001_00` | 资源名区起点 |

⇒ **成员顺序定案**：`cEmSizeCalcTblElement` 有 **7 个成员**（`mMonsterIndex, mTrueSize, mSmallScale, mBigScale, mKingScale, mQuestSizeMin, mQuestSizeMax`），
`cEmSizeYureTblElement` 有 **2 个成员**（`mScaleRate, mProbability`）。
串的书写顺序 = 类声明顺序（MT Framework 属性系统按声明序登记），但**字段字节偏移必须由描述符表证明**（见 §3）。

### 2. 资源名（`size-calc.out.txt` §S8）— [B] 字节实测

| vaddr | 字符串 | 判读 |
|---|---|---|
| 0x1553068 | `rEmSizeCalcTblElement` | 资源**类型**名（`r` 前缀 = resource class） |
| **0x155307e** | **`emsizetbl`** | 该资源的**扩展名/类型 token**（`.emsizetbl`），体型表本体即此类型的 romfs 文件 |
| 0x1553088 | `rEmSizeYureTbl` | 资源类型名 |
| **0x1553097** | **`emyure`** | 扩展名/类型 token（`.emyure`），尺寸分布表 |

⇒ **体型表本体不在 exe 里**，而是从 romfs 载入 `emsizetbl` / `emyure` 两份资源。
（本仓库只解出 exefs；`0eb59fa8…nca` 是 **Patch RomFS（BKTR）**，`nca-info.txt` 明写 `cannot save BKTR section without base romfs`，故无 base romfs 可查 —— 见 §未知 U1。）

### 3. 字符串引用方式：**零绝对指针** — [B] 机器扫描

- `size-calc.out.txt` §S2：块内 30 个名字在 25.4 MB 镜像里 **u32 绝对指针引用 = 0**（连基址 0x1552600 也是 0）。
- §S3：全镜像 **没有任何 ≥3 长的连续 u32 字符串指针表**（`runs found: 0`），与"exe 内 16,201 个 rodata 串"的规模不符
  ⇒ 本作**不使用静态字符串指针表**，属性/资源名一律走 **`cName` 32 位哈希**（MT Framework 惯例）。
- **对照组已跑（`size-find.out.txt` §B）**：`system`/`system_backup`/`rabbitNo` 的字面量加载**也都是 0**
  （而 `*(0x145159c)` 有 1 处 `0x3e77dc`，证明扫描口径没问题）⇒ "哈希定名"成立、字符串池只服务于调试反查。

### 4. 存档体型记录实测（`size-calc.out.txt` §S9）— [B] 字节实测
块头 `0x60C6..0x60CA` = `00 00 00 00`（两档相同）；记录自 `0x60CA` 起，**每条 `[u16 mini, u16 maxi]`**（4 B），
`+1 / +3` 高字节**恒 0**（137 条全查）⇒ 值域 = 整数百分比。

| 档 | 非零记录 | 非零下标 | mini 取值集合 | maxi 取值集合 | 说明 |
|---|---|---|---|---|---|
| clean 猎人A (slot1) | **42 / 137** | 全部 ≤ 70（0,3,6,7,8,9,11,12,14,15,17,19,20,21,26,27,30,31,36,38,39,40,42,43,44,49,52,53,54,56,57,58,59,60,61,62,63,64,66,67,68,70） | **92..124** | **93..125** | 与 CONTRACT"前 71 条有数据"一致（71 条内 42 条非零）；合计值域 92..125 |
| dirty 猎人B (slot0) | **74 / 137** | 0..70（多数）+ **112..132** | **88..110** | **97..125** | 另有 i=26 `maxi=154`（**异常值**，超常见上界 130，见 U4）；合计值域 88..125（不含 154） |

- **新发现（超出 CONTRACT）**：dirty 档在 **下标 112..132** 有 21 条非零尺寸记录（char_off `0x62C6..0x62DA`），
  而 clean 档该区段全 0。下标 93..128 按 CONTRACT 是 36 只小怪 + 129..136 保留；**112..132 有值说明这 21 个槽对应的实体
  确实会被写入尺寸记录**（要么是小怪也记尺寸，要么 slot-map 的 93..132 归属需修正）。
- 记录区尾部 `0x62CE..0x62EE` 在 clean 全 0；dirty 的 `0x62CE..0x62DA` 即上条 i=128..132，之后到 `0x62EE` 全 0。
  ⇒ **块长 552 B = 4 B 头 + 137 × 4 B 完全吻合**，129 条（0..128）只是"有意义的槽数"，物理容量 137。

### 5. 名字引用方式定案：`cName` = **CRC-32（raw）** — [B] 机器扫描 + 值对冲

1. `size-find.out.txt` §A：全 `.text` 的 `movw/movt` 配对里，合成值落在 `0x1550000..0x1560000` 的**只有 9 处 `0x15555555`**
   （= 浮点常数 `1.0/3.0` 一类的位型），**没有任何一处指向真实 rodata 地址** ⇒ 名字不是用 `movw/movt` 取址的。
2. 同报告 §B 对照组（关键）：`findLiteralLoads` 对
   `0x156430d`（`"system"`）、`0x1564314`（`"system_backup"`）、`0x156922b`（`"rabbitNo"`）→ **各 0 处**；
   对 `0x145159c`（成员#4 obj 单例）→ **1 处**（`0x3e77dc`）。
   ⇒ 扫描口径正确：**数据地址会被字面量引用，字符串地址不会**。exe 里没有任何代码按地址取这些名字。
3. `size-hash.out.txt` §H1 反查哈希常量，得到**成对、相邻 8 字节**的两个命中：

   | 命中地址 | 常量 | 对应字符串 | 算法 |
   |---|---|---|---|
   | `0x160fdd4` | `0x5adc692c` | `rEmSizeCalcTblElement` | `crc32raw` |
   | `0x160fddc` | `0x1800eb37` | `rEmSizeYureTbl` | `crc32raw` |

   `crc32raw(s)` = 反射 CRC-32（多项式 `0xEDB88320`，init `0xFFFFFFFF`，**无** 最终异或）。
   两串在字符串池里也是先后关系（`0x1553068` → `0x1553088`），命中地址也相邻 ⇒ 不是巧合（单命中偶然概率 ≈1.3 次/全盘，成对同族 ≈1e-9）。
4. 结论：**MHGU 用 `cName` 哈希（= `crc32raw`）做资源/属性名标识，字符串池只服务调试反查**，所以按地址 xref 永远 0 命中 —
   这是本报告对全项目的方法论价值（后续查任何 `cXxx`/`mXxx` 必须走哈希常量，而不是字符串地址）。

### 6. 资源类型名 + 扩展名对照（rodata `0x1553000..0x15530a0`，`size-find.out.txt` §D）— [B] 字节实测

原样 dump（`.` = NUL）：

```
0x1553000  .roEm070.cro .roEm086.cro .roEm087.cro .roEms017.cro .roEms022.cro
0x1553044  rBodyData   .bdd
0x155304f  rEmDouMouKaData  .mpData  .mdd
0x1553068  rEmSizeCalcTblElement  .emsizetbl
0x1553088  rEmSizeYureTbl  .emyure
0x155309e  rEnemyCmd  .emc
0x15530aa  rEnemyDataTable  .edt
0x15530c0  rEnemyDebugSetData  .des
0x15530d8  rEnemyDtBase  .BaseScale .Size .Rank .Nando .SpDieDamageType .DamageOnBit .DropData...
```

⇒ 每行 = `资源类名 + 默认扩展名（4 字符 MT 资源类型）`。体型相关的两条：
- **`rEmSizeCalcTblElement` ↔ `emsizetbl`**（体型表本体）
- **`rEmSizeYureTbl` ↔ `emyure`**（尺寸浮动分布表）

`rEnemyDtBase` 后面跟的 `BaseScale/Size/Rank/Nando/SpDieDamageType/DamageOnBit/DropData…` 是**XML 属性名**（`r` 前缀资源的属性表风格），
说明这套 XML 资源的属性名是"不带 `m` 前缀的驼峰名"。⇒ **体型表的 XML 属性名很可能是 `MonsterIndex/TrueSize/...`（去 `m`）**，
但该写法在字符串池里**不存在**（`size-calc.out.txt` §S8 全盘搜 `truesize` 只命中 `mTrueSize`）⇒ 属性名来自 romfs 的 XML 文件本身 [INFERENCE]。

### 8. `cName` 哈希值清单（可复用的锚点）— [B] 计算 + 值对冲

`crc32raw(s)`（同上；等价于 `zlib.crc32(s) ^ 0xFFFFFFFF`）：

| 字符串 | `crc32raw` | 文件内出现 |
|---|---|---|
| `cEmSizeCalcTblElement` | `0x8ee2f85e` | 0 处（仅字符串池里有原文） |
| `mMonsterIndex` | `0xe25af394` | 0 处 |
| `mTrueSize` | `0x62ca819b` | 0 处 |
| `mSmallScale` | `0x34f37a9c` | 0 处 |
| `mBigScale` | `0x3f18837b` | 0 处 |
| `mKingScale` | `0x8ed2cbc4` | 0 处 |
| `mQuestSizeMin` | `0xa32e9404` | 0 处 |
| `mQuestSizeMax` | `0x9f23ab5d` | 0 处 |
| `cEmSizeCalcTblElementXML` | `0xac51a82e` | 0 处 |
| `cEmSizeYureTblElement` | `0x43452644` | 0 处 |
| `cEmSizeYureTbl` | `0xe3bd362d` | 0 处 |
| `mScaleRate` | `0x7068fdf4` | 0 处 |
| `mProbability` | `0x01620406` | 0 处 |
| **`rEmSizeCalcTblElement`** | **`0x5adc692c`** | **1 处：`0x160fdd4`** |
| `emsizetbl` | `0x493a1571` | 0 处 |
| **`rEmSizeYureTbl`** | **`0x1800eb37`** | **1 处：`0x160fddc`** |
| `emyure` | `0x137ab847` | 0 处 |

**[I] 判读**：13 个"类名/成员名"的哈希在镜像里**一个都不存在** ⇒ 成员不是按名字注册的：
`cEmSizeCalcTblElement` 的字段绑定不经过名称哈希（要么按**序号**绑定，要么绑定表在 romfs 的 XML 里）。
只有**资源类型名**的哈希存在，说明哈希机制服务于"资源装载"，不是属性系统。

### 9. `.data 0x160fdd0` 资源清单表（`{名称哈希, 类型哈希}`）— [B] 字节实测

```
0x160fdc0  0x036e997e  0x7f2e2ee0   -> rAreaActTblData
0x160fdc8  0xc781bab9  0x1ee1ed64
0x160fdd0  0x681b7312  0x5adc692c   -> rEmSizeCalcTblElement   ★ 体型表
0x160fdd8  0x081b9089  0x1800eb37   -> rEmSizeYureTbl          ★ 尺寸浮动表
0x160fde0  0x6ad25aeb  0x540d49c1
0x160fde8  0x86702612  0x540d49c1   (0x540d49c1 在后续 ~20 条里重复 -> 按"类型"分组)
```

- 第二列 = 资源**类型**哈希（与 `rEmSizeCalcTblElement` / `rEmSizeYureTbl` 的 `crc32raw` 精确相等）；
  第一列 = 资源**名称**哈希（对应的字符串不在字符串池里 ⇒ 名称含路径/前缀，运行时拼出）。
- **全镜像里 `0x5adc692c` 只出现 1 次、`0x1800eb37` 只出现 1 次** ⇒ **romfs 中体型表与尺寸浮动表各只有一份**（不是每怪一份）。
  这与"`mMonsterIndex` 作为元素字段"完全自洽：**一张表，137 个元素，用怪物号索引**。
- 表按"类型"成簇（同一类型的条目相邻）⇒ 这是资源清单/装载清单，不是哈希索引表。
- **旁证（另一 worker 的独立扫描，`.tmp/mhgu/mon/mon-desc.out.txt` §B）**：同一张表里
  `rEnemyDtTune` / `rEnemyDtBaseParts`（"每怪物"数据）各 **138** 条，而 `rEmSizeCalcTblElement` / `rEmSizeYureTbl` 各 **1** 条。
  ⇒ **体型表是全局单例、按 `mMonsterIndex` 索引**；每怪物各自的资源是 `rEnemyDtTune`/`rEnemyDtBaseParts`，不是体型表。
  138 条 vs 存档 137 槽的差 1，可能是 id 0 保留（未证实）。

### 7. 负面结果：exe 内**没有**静态的「每怪物体型表」— [B] 全盘扫描

| 检测器 | 条件 | 结果 |
|---|---|---|
| 索引序列表（`size-calc` §S4） | 任意 stride 0x10..0x40 × 宽度 u8/u16/u32，字段值 0,1,2,… 连续 ≥20 项 | **仅 1 处** `0x1651008`（stride 0x10, u8, n=128），内容见 §H4；与"每怪 0..92"不符 |
| f32 数组（§S5） | ≥60 连续、值域 [0.5,80]、≥90% 是"一位小数" | **0 处** |
| u16 数组（§S6） | ≥60 连续、值域 [80,140] | 13 处，全是 `[80,80,81,81,…]` 型**连续递增对**（生成表/占位），无业务含义 |
| f32 概率对（§S7） | ≥5 对 (rate,prob) 且概率和 ∈ [0.98,1.02] | **0 处** |
| 索引序列表·补齐版（`size-index` §A） | **2 字节步长**穷举 base + stride 0x08..0x80 × u8/u16/u32，25 连以上 | 26 处，**全是 ID 表**（28/29/112/137/153/214/128 项），无一构成 93/129 项的怪物体型结构体数组 |
| cm 量级 f32 连跑（`size-index` §B） | ≥40 连续、值域 [100,6000]、≥90% 一位小数 | **1 处** `0x1818660`（110/206/120/549/130/928… 经验/阈值表，非体型） |
| `.data` 计数常量上下文（§C） | 137/129/93 各 61 处 | 全部为孤立常量或字节串巧合，无"指针+计数"对 |

⇒ 与 §6 互证：**「每怪物真实体型 / 冠倍率 / 任务体型区间」这三组数据不在 exe**，它们是 romfs 资源 `*.emsizetbl` / `*.emyure` 的内容。

### 10. 与存档对拍（`monster-slot-map.json` slot 直配）— [B] 字节 + [A] 表

clean 猎人A（slot1，42 条非零，全部位于 0..70）：

| slot | 怪物 | mini | maxi | | slot | 怪物 | mini | maxi |
|---|---|---|---|---|---|---|---|---|
| 0 | 雌火龙 Rathian | 96 | 105 | | 44 | 雷狼龙 Zinogre | 93 | 106 |
| 3 | 火龙 Rathalos | 98 | 115 | | 49 | 白兔兽 Lagombi | 100 | 100 |
| 6 | 白电龙 Khezu | 99 | 102 | | 52 | 碎龙 Brachydios | 107 | 107 |
| 7 | 大怪鸟 Yian Kut-Ku | 102 | 121 | | 53 | 奇猿狐 Kecha Wacha | 114 | 114 |
| 8 | 毒怪鸟 Gypceros | 97 | 120 | | 54 | 鬼娃 Tetsucabra | 100 | 111 |
| 9 | 水龙 Plesioth | 99 | 99 | | 56 | 化鲛 Zamtrios | 123 | 125 |
| 11 | 蓝速龙王 Velocidrome | 101 | 101 | | 57 | 绞蛇龙 Najarala | 97 | 113 |
| 12 | 黄速龙王 Gendrome | 100 | 105 | | 58 | 重甲虫 Seltas | 105 | 105 |
| 14 | 砂龙王 Cephadrome | 96 | 96 | | 59 | 黑蚀龙 Gore Magala | 99 | 99 |
| 15 | 黑狼鸟 Yian Garuga | 98 | 113 | | 60 | 天迴龙 Shagaru Magala | 124 | 124 |
| 17 | 大名盾蟹 Daimyo Hermitaur | 98 | 107 | | 61 | 徹甲虫 Seltas Queen | 101 | 104 |
| 19 | 镰蟹 Shogun Ceanataur | 101 | 101 | | 62 | 千刃龙 Seregios | 106 | 113 |
| 20 | 雪狮子王 Blangonga | 93 | 93 | | 63 | 夜鸟 Malfestio | 93 | 111 |
| 21 | 金狮子 Rajang | 118 | 118 | | 64 | 斩龙 Glavenus | 102 | 104 |
| 26 | 大野猪王 Bulldrome | 105 | 105 | | 66 | 电龙 Astalos | 97 | 105 |
| 27 | 轰龙 Tigrex | 99 | 116 | | 67 | 泡狐龙 Mizutsune | 97 | 111 |
| 30 | 熔岩龙 Lavasioth | 103 | 103 | | 68 | 巨兽 Gammoth | 101 | 110 |
| 31 | 迅龙 Nargacuga | 96 | 109 | | 70 | 跳狗龙 Great Maccao | 100 | 115 |
| 36 | 爆锤龙 Uragaan | 100 | 114 | | | | | |
| 38 | 海龙 Lagiacrus | 96 | 96 | | | | | |
| 39 | 水兽 Royal Ludroth | 102 | 104 | | | | | |
| 40 | 炎戈龙 Agnaktor | 96 | 96 | | | | | |
| 42 | 尾槌龙 Duramboros | 105 | 105 | | | | | |
| 43 | 潜口龙 Nibelsnarf | 92 | 101 | | | | | |

**对拍结论**
1. 42 条记录里 **17 条 `mini == maxi`**（0/9/11/14/19/20/21/26/30/38/40/42/49/52/53/58/59/60）——与"只猎过一次 ⇒ 最小=最大"完全吻合，
   这是 `[u16 观测最小%, u16 观测最大%]` 语义的**独立佐证**（不是"任务区间"，任务区间不会单点相等）。
2. 全部值域 **92..125**，`mini ≤ maxi` 恒成立（137 条逐条验证，无例外）。
3. 与"村任务进度"自洽：0/3/6/7/8/9/11..15/17/19/20 = 村/集会所下位常客，56/60 这类高编号条目只有 1 条记录（124/124）⇒ 一次性遭遇。
4. **没有任何一条 `maxi > 128`**（clean）⇒ 该档没打出过大金冠级别的极端体型。
5. **量纲判定（关键）**：这些值跨物种几乎不变（88..125），而物种间的绝对体型差一个数量级（草食龙 vs 老山龙）。
   若记录的是"绝对尺寸"或"基础体型"，绝不会这么窄 ⇒ **记录的是无量纲倍率（百分比整数）**，
   与 `mScaleRate` 同一量纲。这直接否掉了"`maxi` = 基础体型 × 冠倍率"这一假设的前提（存档里没有基础体型参与运算）。

dirty 猎人B（slot0，74 条非零）：`mini ≤ maxi` 同样恒成立（唯一例外见 U4）；值域 **88..125**，
**下标 112..132 有 14 条记录**（112 镰虫 Ceanataur 101/104、113 Conga 101/110、114 Blango 89/123、120 Ludroth 97/115、
121 Uroktor 106/111、122 Slagtoth 90/97、123 Gargwa 92/110、124 Zamite 94/110、126 Maccao 89/116、128 Moofah 104/112，
129..132 无 slot 映射）—— 见 U5。

### 11. 代码侧：19 个锚点常量在 `.text` 里**全部 0 命中** — [B] `size-load.out.txt`

| 常量类别 | 值 | `.text` 字面量 | `movw/movt` 合成 |
|---|---|---|---|
| 资源名（清单） | `0x681b7312`（emsizetbl）、`0x081b9089`（emyure） | **0** | **0** |
| 资源类型 | `0x5adc692c`、`0x1800eb37` | **0** | **0** |
| 资源扩展 | `0x493a1571`、`0x137ab847` | **0**（全镜像 0 处） | 0 |
| 类名 | `0x8ee2f85e`、`0xac51a82e`、`0x43452644`、`0xe3bd362d` | **0** | 0 |
| 成员名 ×9 | `0x62ca819b` 等 | **0**（全镜像 0 处） | 0 |

- 全镜像里只有 4 个常量存在，且**每个只出现 1 次**，全在清单表 `0x160fdd0..0x160fddc`（§9）。
- ⇒ **代码从不按名字/类型/哈希请求体型表**：`emsizetbl` 是由**数据文件**（任务/场景的资源清单）拉起的；
  `cEmSizeCalcTblElement` 的字段绑定既不按名字也不按哈希（成员名哈希全盘 0 命中）。
- ⇒ 判定：**单靠 exe 无法再往下定位"谁消费体型表"**。元素结构布局与全部数值都只能从 romfs 的 `*.emsizetbl` / `*.emyure` 取。
  这是硬边界，不是没查够（4 类检测器 + 2 种寻址方式 + 19 个锚点全部negative）。

## 进行中

- `size-final.mjs`（已写好，**尚未跑**）：F1 用大小写/前缀/后缀组合反解清单里的名称哈希 `0x681b7312`/`0x081b9089`
  （成功即得到 romfs 里体型表的真实路径）；F2 把两档的击杀/捕获/体型三表按槽并排，统计
  "有击杀无体型记录""有体型记录无击杀"的槽数（slot 直配的独立校验）。
  命令：`node .tmp/mhgu/mon/size-final.mjs > .tmp/mhgu/mon/size-final.out.txt`
  即便跑出来也不改变 §结论速览 的任何一行（F1 只影响"要不要给文件名"，F2 只做加固）。

## 结论速览：体型相关表 → 地址 → 条目数 → 值域 → 与存档对拍 → 置信度

| # | 表 / 结构 | 地址（vaddr） | 条目数 | 值域 | 与存档对拍 | 置信度 |
|---|---|---|---|---|---|---|
| 1 | `cEmSizeCalcTblElement` 成员名块 | `0x15526be..0x1552728` | 类名 1 + 成员 7 | — | 字段名与"每怪 1 条记录"语义相符 | **高**（字节实测） |
| 2 | `cEmSizeYureTblElement` 成员名块 | `0x1552742..0x1552779` | 类名 1 + 成员 2 | — | 分布表与"同一怪不同体型"相符 | **高** |
| 3 | 资源类型 ↔ 扩展名 | `0x1553068..0x155309d` | 2 组（`rEmSizeCalcTblElement`/`emsizetbl`、`rEmSizeYureTbl`/`emyure`） | — | — | **高** |
| 4 | 资源清单 `{名称哈希, 类型哈希}` | `0x160fdd0`、`0x160fdd8` | 体型表 **1** 条、尺寸浮动表 **1** 条 | — | 单份表 ⇒ 必须用 `mMonsterIndex` 索引 | **高** |
| 5 | 存档体型记录 | char_off `0x60CA`（块头 `0x60C6`，止 `0x62EE`） | 物理 **137**，有效 **129** | clean 92..125 / dirty 88..125（高字节恒 0） | **逐条对拍通过**：42 条 clean 记录与 slot 表名一一对应；`mini ≤ maxi` 恒成立；17 条 `mini == maxi`（只猎过一次） | **高**（字节实测） |
| 6 | 静态「每怪物真实体型」表 | **不存在于 exe** | 0 | — | — | **高**（4 类检测器全 negative） |
| 7 | 冠阈值 `mSmallScale/mBigScale/mKingScale` | **不在 exe**，在 romfs `*.emsizetbl` | 每怪 1 组 | — | 无法对拍 | **中**（由"表不在 exe"推出） |
| 8 | 尺寸分布 `mScaleRate/mProbability` | **不在 exe**，在 romfs `*.emyure` | 每怪 N 对 | — | 无法对拍 | **中** |

## 机制模型（分区标注置信度）

**[已证实·布局]** 存档侧：每怪一条 `[u16, u16]`，4 B，137 槽物理容量、129 槽有效（0..128）。
**[强推断·语义]** 两个 u16 = "该怪历史最小/最大倍率%"（依据：17 条 `mini == maxi`、跨物种值域几乎不变、`mini ≤ maxi` 恒成立）。
**[已证实]** 游戏侧：`emsizetbl` / `emyure` **各只有一份资源**（资源清单里各 1 条），元素类 `cEmSizeCalcTblElement`
带 `mMonsterIndex` 字段 ⇒ 表是"一表多元素、按怪物号索引"，不是每怪一份文件。
同一怪物 id 空间被三张 137 槽表共用（击杀 `obj+0x72C`、捕获 `obj+0x83E`、体型 `0x60CA`，均 137 项）
⇒ **[推断 I]** `emsizetbl` 的元素数应为 137，`mMonsterIndex` ∈ 0..136；存档里 0..128 有 slot 映射，
129..136 无映射但在 dirty 档出现了 129..132 四条非零记录（U5）。

**[推断 I]** 一次狩猎的数值链路（4 步，均未在机器码中直接读到，因为消费者由数据文件拉起）：

1. 任务/场景加载 `emsizetbl` → 得到 `N` 个 `cEmSizeCalcTblElement`，按 `mMonsterIndex` 建立索引。
2. 出怪时按 `emyure` 的 `(mScaleRate, mProbability)` 分布抽一个倍率，并夹进该怪的 `[mQuestSizeMin, mQuestSizeMax]`。
3. 实际模型缩放 = `mTrueSize × mScaleRate`（`mTrueSize` = 该怪的"标准全長"，这也解释了为什么它必须按怪存）。
4. 结算：把本次倍率取整写回存档 —— 比 `mini` 更小则更新 `mini`，比 `maxi` 更大则更新 `maxi`（与 §10 的"只猎一次 ⇒ mini==maxi"一致）。

**[推断 I]** 冠：`mSmallScale` / `mBigScale` / `mKingScale` 是同一倍率轴上的三个阈值（小冠 / 金冠 / 王冠）；
判定只是拿倍率与阈值比大小，不需要额外数据。方向（≤ 还是 <、是否含等号）**未证实**。

**[已证实]** 因此"92..125"这类型值**不是**由基础体型算出来的，而是**倍率本身**（百分比整数）；
怀疑"maxi = 基础体型 × 冠倍率"的假设 **不成立** —— 存档里存的就是倍率，基础体型只在游戏侧用来算真实尺寸。

## 未知

- **U1 体型表本体不可得（硬边界）**：`emsizetbl` / `emyure` 是 **romfs** 资源；本仓库只解出 exefs。
  唯一的 base romfs 载体是 XCI secure 分区里的 `98abd400588fccb68509fed7e55e4a47.nca`（`0x182bbe00..0x2ed70be00`，**12,168,003,584 B ≈ 12.17 GB**（~~12.3 GB~~），见 `.tmp/mhgu/xci-info.txt:50`），
  **该 XCI 不在磁盘上**（`*.xci` 全盘 0 命中），已解出的 `0eb59fa8…nca` 只是 **Patch RomFS（BKTR）**，`nca-info.txt` 明写 `cannot save BKTR section without base romfs`。
  ⇒ 要拿到数值表，需要原始 XCI（或已解密的 base NCA）+ `hactool -r --romfsdir=…`，然后找 `*.emsizetbl` / `*.emyure`。
- **U2** `mTrueSize` 的单位（米 or 厘米）与 `mSmall/Big/KingScale` 是"百分比阈值"还是"倍率"—— 需 romfs 才能定。
- **U3** 冠判定的比较方向与等号归属 —— 需 romfs 或实机。
- **U4** dirty i=26 `maxi=154` 是脏数据还是合法极值（clean 同槽为 105/105）。
- **U5** 槽 112..132 的尺寸记录对应哪些实体（129..132 无 slot 映射）。

## romfs 实测：`em_size_scale_data`（2026-10-23，硬边界解除）

- 载体：romfs `nativeNX/loc/arc/resident.arc` → 条目 `enemy\resident\em_size_scale_data`（type hash `0x5adc692c`，zlib，3,844 B）；同包 `enemy\resident\em_size_yure_data`（type `0x1800eb37`，35,381 B，魔数 `XFS\0`，未解）。base NCA 由用户本机 XCI + hactool 解出（`--basenca` 合并 update NCA），数据只存私有仓。
- 布局 [B][A]：`f32 1.0` + `u32 count=137` + 137 × 28 B；`8 + 137×28 = 3,844` 闭合；137 = 怪物槽数。
- 每条 28 B = 上文 rodata 成员顺序 7 × 4 B：`u32 mMonsterIndex | f32 mTrueSize | f32 mSmallScale | f32 mBigScale | f32 mKingScale | f32 mQuestSizeMin | f32 mQuestSizeMax`。
- 例（idx 0）：（示例值已移除，§7b）
- 解析工具：`tools/mhgu/arc.mjs`（待入库）；数据表本体不公开（Capcom 数据，§7b）。
