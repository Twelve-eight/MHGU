# 派单：MHGU 侧第二批攻击行（走出 em001）

## 目标
把"GU 攻击行 → 形状/judgment"的解码从 em001（雌火龙/紫毒姬）扩到**至少两个新物种**，
产出可直接喂移植流水线的表。

## 已有基础（读这些，不要重造）
- `MHRS/docs/reference/gu-hit-port.md` **§2**：GU attackdata（HDE，0x20 B/行）与 hitsize（HTS）格式，
  含 `+0x19 = 形状组号` 的指令依据、形状记录 48 B 的字段布局、半径/点的缩放依据。
- `MHRS/docs/reference/gu-hit-port.md` **§10/§12**：`body_data/<em>_bodydata`（受击体，BDD）格式与
  "记录标志低字节 = 身体区域枚举"（0 躯干 1 左翼臂 2 右翼臂 3 左腿 4 右腿 5 颈 6 头 7 尾）。
- 现成表：`MHRS-private/kb/gu-mod-bones-all.tsv`（GU 骨骼偏移）、`MHRS-private/kb/gu-atk2-filler.tsv`、
  `MHGU/docs/data/gu-portable-cells.tsv`。
- GU 侧 digest：`MHGU/docs/analysis/re/GU-DIGEST.md`，以及 `Q5b-gu-attack-row.md`。

## 要做的事
1. 选**两个**新物种（不要 em001/em002；优先有"变体表"的和没有的**各一个**，因为行号 <1000 走物种表、
   ≥1000 走变体表，这条分支目前只在 em001 上验过）。说明你怎么选、依据是什么。
2. 对每个物种解出：
   - 每条攻击行：动作号、A/B 窗口、伤害、反应、标志、属性位、状态位与状态值、形状组号；
   - 每个形状：骨骼 A/B、形状类型、半径、p0、p1（厘米）；
   - 受击体 BDD：记录数、区域分布、几何；
   - **每条攻击行归属哪个动作**（用"同函数最近一次请求的动作"这条规则时，必须标出它不适用的情况）。
3. 输出 `MHGU/docs/data/gu-attack-rows-<em>.tsv`（每物种一张），列：
   `em, action_no, row_index, window_a, window_b, damage, reaction, flags, elem_bits, state_bits_1, state_val_1, state_bits_2, state_val_2, shape_group, source_func, confidence`。
   形状表 `MHGU/docs/data/gu-hit-shapes-<em>.tsv`。
4. **与 em001 的对照**：同一个字段在不同物种里的取值范围、有没有结构性差异（例如某物种的机制导致字段含义不同）。
   这部分是给移植用的，写清楚"能不能套用 em001 的规则"。

## 强制的对照
- **阳性对照**：用你的脚本跑 em001，结果必须与**已有的 GU 攻击行数据**逐行一致。注意选对基准，下面三个里按可得性取第一个：
  1. `G:/tmp/SA/hit/em001-move-hits.tsv`、`G:/tmp/SA/hit/em001-arms.tsv`（em001 的"动作-行"配对与装填点，**这是真正的攻击行表**）。
     这两个在临时目录，可能已被清掉；先看在不在。
  2. 若上面不在：`MHRS/docs/analysis/re/Q53-reports/Q53e-hit-rows.md` §1 —— 它逐条列出了**具体动作对应的 GU 行号**
     （例如某 motion 装填行 5、另一 motion 与其共用行 5），可直接当断言集。
  3. 再退一步：`MHRS/docs/reference/gu-hit-port.md` §2 里的 94 对"动作-行"与 14 处窗口超长清单。

  **不要**拿 `MHRS/docs/data/em001-hit-track-slots.tsv`（那是 Rise 侧的槽位-命中轨道普查）
  或 `MHGU/docs/data/gu-portable-cells.tsv`（那是动作表**格子**，不是攻击行）当基准——它们量的不是同一件事，
  "对上"了也只说明你复现了另一张表。
- **负控**：行号 <1000 与 ≥1000 的分支，各构造一个"查错表"的情形（比如强制走物种表），
  结果必须与正确分支不同，否则说明你没有真的在读那个位。

## 交付
- 报告 `MHGU/docs/analysis/re/MhguRows-reports/mhgu-rows.md`（增量追加，Confirmed / In progress / Unknown / Difficulties）
- 两张 TSV 每物种
- `## Difficulties` 必写

## 约束
- 不启动模拟器、不碰存档；只读静态数据。
- 结论分级 `[C]/[B]/[U]`；**任何 ID→对象的映射必须附来源**（枚举文件+行号 / 官方文本+索引 / db 表+行），
  没有来源一律 `[U]`，且 `[U]` 不得驱动设计选择。
- 改 markdown 用 `edit`/`write`，不要用 shell 里的 `node -e` 写中文。
