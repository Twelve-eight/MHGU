# retileString-slice-01 — 传播漏掉的字符串持有函数（822 行）

**为什么有这张表。** Tier B 池（`tiers.csv` 粒度，14,863 行）里"拥有字符串"的函数只有 239 个，且已全部被裁定（`W6-P135`/`W6-P137`；区间包含 join 在 site-in-body 与 owner-in-body 两级都被否决）。但字符串归属本身是 **retile 粒度**（52,692 个函数）的划分：在这个粒度上，**有 822 个函数拥有字符串、却既没有标签也没被任何切片表裁定过**，而且它们在 `tiers-merged.csv` 里只有 tier C 这条弱先验。它们是传播通道在最强证据类型上的盲区 —— 逐个人工读一遍就能拿到 A/B，而不是又一批 C。

**这不是 Tier B 表。** 它是 retile 划分上的独立产物，文件名不匹配 `tierb-merge.py` 的 `tierB-slice-*/*2/*3` 模式，因此**不会**进入 `tierb-labels.csv`，已发布的 4,183 行 / 28.1% 不受影响。是否并表由用户决定。

## 池规则（可复现）

```bash
# 822 = 字符串归属者 ∩ tiers-merged tier C ∩ function-labels.tsv 无标签 ∩ 未被任何 tierB* 切片表裁定
node MHGU/tools/mhgu/slice-pack.mjs --slice retileString-slice-01 \
  --start-list G:/tmp/retile-unlabelled.txt --parts 9 --out G:/tmp/rs01
```
822 个函数的 `string shapes:` 分布：353 个带 class/path 形状（够 conf A），其余为成员名/格式串/小写键。

## 判定规则

与其它切片相同：`A` = 该行可达体内直接引用的字符串点名子系统实体（类名或资源文件/目录路径），**且该串所属族与本行标签一致**；
串与票冲突时不能抬置信度，停在 B/C 并把张力写进证据栏；堆/分配器标记与格式模板永不支撑 A。
`B` = 非通用 callee 票 ≥3 且 ≥2 倍次高；`C` = 票弱或只靠通用族/邻域；`unknown` = 无串、非通用票 <2、无结构特征。
`role`：无 callee 且 `insns_body`≤16 → leaf；≤4 → thunk；去重 callee ≥8 → orchestrator；其余 worker。

证据字段全部由字节重算（`fn-body.mjs` + `stringxref.mjs --dump-json` + `function-labels.tsv` 的票），不继承任何已发布列。

## 与既有表的桶选择冲突（一处，已裁定）

`cRapidshotBase` 在本表 `0xf4420` 判 **weapon-wp**（弩用速射数据），而 `slices/w6-pass12/tierB2-slice-12.md:36`
把同一类的另一个注册点 `0xf427c` 判 **item**。**这是有意修订，不是笔误**：那条旧行自己的证据栏就写着
"字符串 cRapidshotBase（弩用速射数据类名）"，即已认出是弩数据却按 `item` 归类——那是 `weapon-wp` 尚未用于
装备数据时的桶选择。本表与 `tierB-slice-09` 一致按 `weapon-wp` 处理装备类数据，因此按类聚合的消费者会看到
同一个类两个标签；差异与理由记录在此，供合并/复核时定位。

（注意 `weapon-wp` 在本批承担的是**装备数据**语义——护甲与武器商店列表、试用装备都在内——因为词汇表没有
单独的 equipment 桶。所以本批 107 条 `weapon-wp` 是"装备桶"计数，不是 107 个武器专属函数。）

<!-- TABLE -->
