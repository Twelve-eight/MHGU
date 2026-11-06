# Tier B 裁定报告 — slice-15（新抽样：2,686 个 conf-A 候选存量）

**这不是被截断的那四张表的续写。** `tierB2-slice-04/06/09/10` 各自的 120 成员样本已丢失，且它们的表头范围
框不住自己的行（`W6-P135`），所以"补到 120 行"没有可定义的成员集合。本表是**一次新的、规则可复现的抽样**，
不与那四张表合并语义。

## 池规则（可复现）

1. 候选池：`.tmp/mhgu/tierB/slice-01..14.txt`（TSV：`vaddr | insns | callers | callees | callee_label_votes | strings`），
   共 14,863 行 = Tier B 总数。
2. 去掉已被任何 `tierB*.md` 切片表裁定的 vaddr → 10,859 未裁定。
3. 只留"在**修好的**提取器（`coverage/stringxref.mjs --dump-json`，`via=code`）下至少拥有一个字符串"的函数 → 4,660。
4. 再只留其中至少拥有一条**类名或资源路径形状**字符串的函数 → **2,686**（成员名 `mJntNo`、格式串 `%s\\%s.%s`、
   小写键名 `type/name` 都不够 `conf A`，见每块的 `string shapes:` 行）。
5. 排序：有 class/path 字符串者优先 → callee 票数降序 → 地址升序；按 90 个一片切分后由主会话并表。

复现命令：

```bash
node MHGU/tools/mhgu/slice-pack.mjs --slice tierB-slice-15 \
  --pool-from .tmp/mhgu/tierB --order evidence --limit 180 --parts 2 --exclude-target --out G:/tmp/tb15
node MHGU/tools/mhgu/slice-assemble.mjs --slice tierB-slice-15 \
  --rows-dir G:/tmp/tb15 --parts 2 --prior-only-to-unknown
```

## 判定规则

与其它 Tier B 切片一致：`A` = 该函数体（CFG 可达，`tools/mhgu/fn-body.mjs`）内部直接引用的字符串点名子系统实体
（类名 `cResourceSample`/`aGameBase`、资源名 `arc.xml`/`rMovie`/`.mp4` 等）；`B` = 非通用 callee 票有明确优势
（≥3 且 ≥2 倍次高票）或票数与结构同向；`C` = 票数接近、只有通用访问器族票、或只靠地址邻域；
`unknown` = 无字符串、非通用票 <2、且无结构特征。`role`：无 callee 且 `insns_body`≤16 → leaf；≤4 → thunk；
去重 callee ≥8 → orchestrator；其余 worker。

**证据字段全部由字节重算**，不继承任何已发布列：`insns_body` 与 callees 来自 `fn-body.mjs`（不用
`functions-retile.csv.gz` 第 5 列，见 `W6-P128`）；字符串来自修好的提取器（见 `W6-P126`）；callee 标签取自
`function-labels.tsv` 并标出通用访问器族。`string shapes:` 行是机械分类，只作提示，判定仍由人做。

<!-- TABLE -->
