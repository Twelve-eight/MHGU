# armorSeriesData.asd 格式

来源：`nativeNX/table/armorSeriesData.asd`（romfs）。字段布局由主程序 `rArmorSeriesData` 的成员名池反推，交叉验证对象为 `mhgu.db`。本页只描述已有证据支持的部分，未确认项标 [B] 或 [U]。

标签含义：[A] 已与 db 或字节对拍；[B] 由成员名顺序与取值范围推断；[U] 未确认。

## 文件结构

| 区段 | 大小 | 内容 |
|---|---|---|
| 头 | 8 B | f32 `38.0`（`00 00 18 42`）+ u32 系列数 `1287`（`07 05 00 00`）[A] |
| 记录 | 1287 × 127 B | 按系列号顺序紧密排列，无填充 [A] |

校验：8 + 1287 × 127 = 163457 B，与文件大小一致 [A]。第 i 条记录（0 起）位于文件偏移 `8 + 127i`，下表的偏移均为记录内偏移。

## 字段表

| 偏移 | 类型 | 成员名（主程序池） | 证据与说明 | 标签 |
|---|---|---|---|---|
| +0x00 | u32 | 记录 id | 等于记录下标，也等于 `armor_families._id` | [A] |
| +0x04 | u16 | mSortID | 与 `armor_families` 的排序字段一致，但不是身份标识（1201 条不同，如 rec513 sort=545） | [A] |
| +0x06 | u8[5] | mEnableParts[0..4] | 头、胴、腕、腰、脚是否启用，共 18 种组合 | [A] |
| +0x0B | u16 | mModel | 模型 / 外观 id（如 皮制 1、Loc Lac 7、Redhelm 673） | [A] |
| +0x0D | u8[4] | mMale/Female/Blade/GunnerWearable | 性别、太刀、狩猎枪装备标志 | [A] |
| +0x11 | u16 | mUniqueResist（区域推断） | 0 至 14560，随稀有度上升。`items.buy` 对防具为 0，用途未确认 | [B] |
| +0x13 | u32 | mUniqueResistId | 全文件为 0 | [A] |
| +0x17 | s8[5] | mFire/Water/Thunder/Ice/DragonRes | 属性抗性，顺序 火、水、雷、冰、龙 | [A] |
| +0x1C | 5 × 15 B | m{Head,Torso,Arm,Waist,Leg}SkillType[5] 与 SkillPoint[5] 交错 | 每个部件块为 5 组 `{u16 技能树 id, s8 点数}`，块 k 位于 +0x1C + 15k | [A] |
| +0x67 | u8 | mMaxLv | 强化上限候选，0 至 10 | [B] |
| +0x68 | u8 | mMaxLvForLimit | 限制等级候选，1 至 12 | [B] |
| +0x69 | u8 | （池中无对应成员） | 0 至 5，与稀有度分组相关 | [B] |
| +0x6A | s8 | mDef | 基础防御，与 `armor.defense` 一致 | [A] |
| +0x6B | u8 | mDefLvUpTblIndex | 防御成长曲线索引，0 至 21 | [B] |
| +0x6C..0x70 | u8[5] | m{Head,Torso,Arm,Waist,Leg}SlotNum | 孔数，与 `armor.num_slots` 一致 | [A] |
| +0x71 | u8 | mSymbolCol | 0 或 1 | [B] |
| +0x72 | u8 | mUniqueBaseColorMale | 0 或 1 | [B] |
| +0x73 | u8 | mUniqueBaseColorIdMale | 0 至 26 | [B] |
| +0x74 | u8 | mBaseColMale | 0 至 121 | [B] |
| +0x75 | u8 | mUniqueBaseColorFemale | 0 或 1 | [B] |
| +0x76 | u8 | mUniqueBaseColorIdFemale | 0 至 28 | [B] |
| +0x77 | u8 | mBaseColFemale | 0 至 121 | [B] |
| +0x78 | u8 | mSeTypeMale | 0 至 28 | [B] |
| +0x79 | u8 | mUniqueSeTypeMale | 0 或 1 | [B] |
| +0x7A | u8 | mUniqueSeTypeIdMale | 0 至 136 | [B] |
| +0x7B | u8 | mSeTypeFemale | 0 至 28 | [B] |
| +0x7C | u8 | mUniqueSeTypeFemale | 0 或 1 | [B] |
| +0x7D | u8 | mUniqueSeTypeIdFemale | 0 至 136 | [B] |
| +0x7E | u8 | mGimmickDispType | 0 至 7，记录最后一个字节 | [B] |

字节核对：头部 28 B + 技能 75 B + 尾部 24 B（+0x67 至 +0x7E）= 127 B。

## 部件 id 公式

部件 id 由系列号与部位基数相加得到，0 表示该部位不存在：

- 头：`1310720 + id`
- 胴：`1376256 + id`
- 腕：`1441792 + id`
- 腰：`1507328 + id`
- 脚：`1572864 + id`

对所抽样的系列均成立 [A]。

## 名称池

成员名字符串位于主程序 `cArmorSeriesBase` / `cArmorSeriesBaseXML` 区域，虚拟地址 `0x1553ad9` 至 `0x15540dd`。注册名池位于 `0x15558bc`（`ased`）与 `0x15558c1`（`rArmorSeriesData`），与 `rAmuletData`、`rWeapon00BaseData` 等同属一个池 [A]。

## 10 系交叉核对

| 记录 | 名称（db） | 结论 |
|---|---|---|
| 1 | 皮制（Leather） | id、技能树、防御、孔数、启用位均一致 [A] |
| 2 | 锁子甲（Chainmail） | 防御、孔数、雷抗一致 [A] |
| 4 | 狩猎（太刀） | 穿戴 1110 对应 hunter_type 0，技能与防御一致 [A] |
| 5 | 狩猎（枪） | 穿戴 1101 对应 hunter_type 1，防御一致 [A] |
| 8 | Loc Lac | 启用位 01011，抗性一致 [A] |
| 11 | 骨 | 防御 6，孔数与技能一致 [A] |
| 617 | Redhelm（太刀） | 防御 26，五抗性与技能一致 [A] |
| 618 | Redhelm（枪） | 防御 13，穿戴与技能一致 [A] |
| 619 | Snowbaron（太刀） | 防御 22，五抗性与技能一致 [A] |
| 1286 | XX Diablos Jersey | 仅胴启用（1377542），防御 75，抗性一致 [A] |

另有 4 条记录（513、514、737、779）启用位与穿戴全为 0，模型为 0，推测为占位或未使用项 [B]。

## 未解项

- 技能块在主程序结构体中的精确对齐方式未确认。文件为紧凑排列，无填充。[U]
- +0x11 u16 疑似价格，用途未确认 [B]。
- +0x67、+0x68、+0x69 的成员对应关系仅凭池顺序与取值范围推断 [B]。
- +0x71 至 +0x7E 的颜色与音效相关字段仅按池顺序映射，取值未独立验证 [B]。
- 尾 id（+0x73 之后的 id 字段）的实际含义 [U]。
