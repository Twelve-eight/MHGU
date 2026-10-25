# romfs 武器数据表（`nativeNX/table/`）

> 来源：`.tmp/reports-mhgu/re-weapon-tables.md`。swe2 评审（`.tmp/reports-swe2/review-weapon-tables.md`，用独立解码器 `wpdec.py`）发现 3 处主要错误，本文已按评审改正。2026-10-25 Main 抽验了 wpd 步长（w00 record 3–5）和 wcd 键序（w00 record 1–3 与 `components` 逐项一致）。
> 对照库：`MHGU/docs/data/mhgu.db` 的 `weapons`、`components`、`items` 表。

## 容器

- 所有文件都是 8 B 头：`f32 版本` + `u32 n`，后接 n 条定长记录，满足 `size = 8 + n × rs`（57/57 个文件验证通过）。
- 版本值：Base 2.1，Level/kad 1.2，wpd/wcd 1.0。
- NN 取 00–04、06–14（没有 05）。

| NN | 类型 | NN | 类型 |
|---|---|---|---|
| 00 | 大剑 | 08 | 斩击斧 |
| 01 | 片手剑 | 09 | 铳枪 |
| 02 | 大锤 | 10 | 弓 |
| 03 | 长枪 | 11 | 双剑 |
| 04 | 重弩 | 12 | 狩猎笛 |
| 06 | 轻弩 | 13 | 操虫棍 |
| 07 | 太刀 | 14 | 盾斧 |

## 与 db 武器的绑定

- `weapons._id = (NN+1) << 16 | fam << 8 | idx`。fam、idx 都从记录自己的键字节读，**不能按位置对应**：片手剑 fam 100 有 5 条记录，db 里没有对应武器 `[C]`。
- 每个类型都有一条 `(0,1)` 占位记录。文件里还有一些 db 没有的家族（开发残留）：
  - 片手剑 fam 100；
  - 太刀 fam 100 / 126；
  - 双剑 fam 99；
  - 狩猎笛 fam 88；
  - 斩击斧 fam 109；
  - 盾斧 fam 59。

## Level（`weaponNNLevelData.wNNd`）：与 db 10,877/10,877 行逐字段一致

| 记录长 | 类型 | 字段 |
|---|---|---|
| 15 B | 00/01/02/03/07/13 | +0 u32 k；+4 u8 fam；+5 u8 idx；+6 u16 斩味相关 `[U]`；+8 u16 攻击；+10 u8 防御；+11 s8 会心；+12 u8 属性 1；+13 u8 属性 2；+14 u8 孔 |
| 16 B | 09/12 | +14 = 铳枪炮击等级 0..4 / 狩猎笛音色组合 0..49；+15 孔 |
| 17 B | 08/11/14 | +13 瓶类型 `[B]`；+14 = 斩击斧瓶值 / 双剑属性 2；+16 孔 |
| 31 B | 10 | +6 u16 攻击；+8 防御；+9 s8 会心；+10 u16 属性；+12 孔；+13..+30 `[U]` |
| 100 B | 04/06 | +6 u16 攻击；+8 防御；+9 s8 会心；+10 孔；+12.. 弩专属字段 `[U]` |

- 盾斧：文件 534 条，db 528 条。

## Base（`weaponNNBaseData.wNNd`）

- 记录长度：33 B（近战）、34 B（08/09/11/13/14）、32 B（弩）。
- 字段：
  - +4 u16：名称串 id `[B]`；
  - +12 u16：生产价格。133/136 条与 `creation_cost` 相等，3 条例外（fam 75/78/121）。
  - 其余字段 `[U]`。

## 升级素材（`weaponProcessWNN.wpd`），32 B，n = Level 条数 − 1

- +0 u8 fam、+2 u8 idx（fam 在前，和 Level 同序；w00 record 1–5 = fam 1、idx 2..6，Main 核字节）。
- 素材从 +4 开始，**3 B 步长** `{u16 item, u8 count}`，最多 4 项。和 `components` 的 Improve 行对照 10,077/10,077 一致 `[C]`。原报告写的 4 B 步长对照结果是 0/10,077。

## 生产配方（`weaponCreateWNN.wcd`），38 B

- **键序与 wpd 相反**：+0 u8 idx、+2 u8 fam。
- 素材从 +6 开始，**4 B 步长** `{u16 item, u8 count, u8 pad}`，最多 4 项。和 `components` 的 Create 行对照 1,145/1,145 一致 `[C]`。
- +26..+37：3 × `{u16 item, u16 count}`，是另一组素材，例如 `6e 08 02 00` = 道具 2158 × 2 `[B]`。

## 斩味（`kireajiData.kad`）

- 164 条 × 14 B（7 × u16），全类型共用。用法见 `MHGU/docs/wiki/damage-formula.md` §4.2。

## 说明

- 素材 db 已经有了，在 `components` 表里，所以这些文件对 wiki 的价值是交叉验证，不是新数据。原报告说"wpd/wcd 是唯一素材来源"，这个说法不成立。
