# 审计：`docs/analysis/code/`（前半，文件 1-25）

范围：`docs/analysis/audit/slices/analysis-code.txt` 的前 25 行（MANIFEST.tsv 中 `analysis-code` 共 49 篇 = 1 篇 batchA + 5 篇 pass1 + 14 篇 pass2 + 29 篇 pass3；本次审 batchA、pass1 全部、pass2 全部、pass3 的 01a/01b/01c/02/03）。
表：`analysis-code-half1.tsv`（25 行，一篇文档一行）。后半（pass3 06..15c 等）由 AuditAcHalf2 负责，本文件不写 `analysis-code.tsv` 以免覆盖。

## 方法与分母

- 覆盖度分母只认一个计量器：`node tools/mhgu/coverage/report.mjs` → `denominator: 23885 functions, 5228277 instructions`（两次运行不变）。审计开始时的读数是 `tier A (verified) 9188 fn 2775341 insns 53.1%`；审计期间 `docs/analysis/code/inventory/tiers-recomputed.csv`（untracked）被并行进程重生成（A 标签行从 ~9.1k 变成 11097），同一命令现在读 `tier A 11113 fn 3246117 insns 62.1%`、`unattributed 162 fn 0.1%`。两份读数我都用同一合并规则复现过（`replica: A 9188 … 53.1%` / `replica: A 11113 … 62.1%`），所以下文引用的百分比都能定位到具体那一次运行。
- 逐行核查的数据源（均在 repo 外、README 已声明为输入）：`docs/data/functions.csv.gz`（23,885 行，含 insns/callers/callees/strings）、`docs/analysis/code/inventory/tiers.csv` 与 `tiers-recomputed.csv`（23,885 行）、`.tmp/mhgu/tierB*/slice-*.txt`（各切片的输入快照）、`.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`（flat 镜像，`vaddr = flat - 0x100`）。
- 每篇的非 OK 结论都附命令与输出；行级数字用机器重算，不跨文档比对。

## 25 篇逐篇结论

| # | doc | 表行数 | 自称规模 | 结论 |
|---|---|---|---|---|
| 1 | batchA-classname-xref.md | 771 | 1369 函数扫描 | OK |
| 2 | tierb-pass1/tierB-slice-03.md | 250 | 1062 | STALE |
| 3 | tierb-pass1/tierB-slice-05.md | 550 | 1062 | MISSING |
| 4 | tierb-pass1/tierB-slice-08.md | 78 | 1062 | MISSING |
| 5 | tierb-pass1/tierB-slice-09.md | 0 | 1062 | MISSING |
| 6 | tierb-pass1/tierB-slice-14.md | 300 | 1057 | STALE |
| 7 | tierb-pass2/tierB2-slice-01.md | 120 | 120 | STALE |
| 8 | tierb-pass2/tierB2-slice-02.md | 120 | 120 | STALE |
| 9 | tierb-pass2/tierB2-slice-03.md | 120 | 120 | STALE |
| 10 | tierb-pass2/tierB2-slice-04.md | 30 | 120 | MISSING |
| 11 | tierb-pass2/tierB2-slice-05.md | 120 | 120 | STALE |
| 12 | tierb-pass2/tierB2-slice-06.md | 60 | 120 | WRONG |
| 13 | tierb-pass2/tierB2-slice-07.md | 120 | 120 | STALE |
| 14 | tierb-pass2/tierB2-slice-08.md | 120 | 120 | STALE |
| 15 | tierb-pass2/tierB2-slice-09.md | 30 | 120 | MISSING |
| 16 | tierb-pass2/tierB2-slice-10.md | 90 | 120 | MISSING |
| 17 | tierb-pass2/tierB2-slice-11.md | 286 | 286 | STALE |
| 18 | tierb-pass2/tierB2-slice-12.md | 286 | 286 | STALE |
| 19 | tierb-pass2/tierB2-slice-13.md | 285 | 286 | WRONG |
| 20 | tierb-pass2/tierB2-slice-14.md | 282 | 282 | STALE |
| 21 | tierb-pass3/tierB3-slice-01a.md | 20 | 20 | OK |
| 22 | tierb-pass3/tierB3-slice-01b.md | 20 | 20 | OK |
| 23 | tierb-pass3/tierB3-slice-01c.md | 20 | 20 | OK |
| 24 | tierb-pass3/tierB3-slice-02.md | 60 | 60 | OK |
| 25 | tierb-pass3/tierB3-slice-03.md | 60 | 60 | OK |

计数：**OK 6 / STALE 11 / MISSING 6 / WRONG 2 / UNVERIFIABLE 0 / NA 0**（合计 25）。
合计行数：3427 条裁定，落在 3282 个不同函数上（跨文档重复 145 条，其中 29 条标签互相矛盾，18 条在排除 `unknown` 后仍矛盾）。

## Top 5 findings

### F1（WRONG）slice-13 漏掉一个已存在的块，却把原因归给生成端

`tierB2-slice-13.md:312` 写「`slice-13.txt` 头注 286 函数，重生成的 asm 文件头同样是 286，但实际块数与本表行数均为 285」「判断为生成端 1 个函数未落盘」。

```
$ grep -c '^===' "G:/omp works/.tmp/mhgu/tierB2/slice-13.asm.txt"
286
$ grep -c '^| 0x' docs/analysis/code/tierb-pass2/tierB2-slice-13.md
285
```
逐一比对块地址与表行：asm 有而表无的恰好一个 —— `0x64a198`（`insns=161`）；表里没有 asm 之外的多余行。所以是**本表漏写一行**，不是生成端漏落盘，而且文档明确写了相反的判断（这是它唯一的数据缺陷结论）。
同一文档的 conf 自报也不实：`- conf 计数：**A 35**`（:312）vs 表内实际 A=3。

```
$ node -e "…\|\s*([ABC])\s*\|…" docs/analysis/code/tierb-pass2/tierB2-slice-13.md
rows=285 {"A":3,"B":203,"C":79}
```
差 32 条正好等于表内带「→ B」降级标记的行数（`grep -c '2026-10-24'` = 32 行）。

### F2（WRONG）slice-06 声称 120 条，只有 60 条，汇总表仍按 120 计

标题/输入段：「共 120 条」；`tierB2-slice-06.md:24`：`**conf 计数**：A 12 / B 101 / C 7`（合计 120）；汇总 label 表也按 120 求和。

```
$ grep -c '^| 0x' docs/analysis/code/tierb-pass2/tierB2-slice-06.md
60
$ (conf 直方图一行式) → rows=60 {"A":1,"B":57,"C":2}
```
即 60 行数据 + 120 行的统计：一半裁定不存在，且 A 从 12 降到 1。这是本批唯一「统计与表行数矛盾且无任何降级标记可解释」的文档。

### F3（STALE，系统性）pass2 的 conf-A 自报值是 2026-10-24 降级前的旧值

11 篇 pass2 文档自报 A 合计 **181** 条，表内实际 **64** 条。逐篇差额（自报 A − 表内 A）为 01:11、02:9、03:5、05:9、06:11、07:1、08:6、11:16、12:7、13:32、14:10，与表内带「2026-10-24 区段规则机械复核 … → B」标记的行数（01:10、02:9、03:5、05:7、06:7、07:1、08:6、11:16、12:7、13:32、14:11）基本相等 —— 即「2026-10-24 把 A 降 B」这一遍只改了表、没改汇总。label 计数则基本是当前值（例如 slice-01 汇总的 13 个 label 数与表内逐一相等），所以是「改表未改统计」，而不是整段过时。

```
$ node -e "…" docs/analysis/code/tierb-pass2/tierB2-slice-11.md
rows=286 {"A":13,"B":158,"C":115}      # 文档 :364 自称 A 29、B 142、C 115
$ node -e "…" docs/analysis/code/tierb-pass2/tierB2-slice-01.md
rows=120 {"A":6,"B":85,"C":29}         # 文档 :153 自称 A 17、B 74、C 29
```
C 计数大多精确相等（01/03/05/07/08/11/12 的 C 全部相等；13 未自报 C），说明降级只动了 A↔B。

### F4（STALE）pass2 的「输入切片」已被重切，7 篇文档声明的输入文件里没有它们的行

- `tierB2-slice-02.md` 的 120 行，全部来自 `tierB3/slice-02.txt`（120/120），而非它声明的 `tierB2/slice-02.txt`：
```
$ grep -c "c26af0" "G:/omp works/.tmp/mhgu/tierB2/slice-02.txt"
0
```
- 04/06/07/08/09/10 的行在 `tierB`/`tierB2`/`tierB3`/`tierB3p` 全部输入 txt 的 3196 个块地址里**一个都找不到**（例：`grep -c b811f0 tierB2/slice-0*.txt` 全 0）。
- 现存的 pass2 输入是一条连续按 insns 排名的带：slice-01..10 = rank 2510..4618，slice-11..14 = rank 5383..7278；而文档行集落在 367..675（02）、1390..1505（06）、1625..1845（07）、1847..2054（08）、2056..2121（09）、2297..2454（10）等互不重叠的旧带上。结论：这些文档写于上一次切片，之后池子被重切，文档引用的快照已不存在（不是凭空生成；行内 99-100% 的立即数声明可在镜像中复核）。

### F5（MISSING）pass1 五篇里四篇的「汇总」从未写，slice-09 连表都是空的

```
$ sed -n '18p;20p' docs/analysis/code/tierb-pass1/tierB-slice-05.md   → ## 汇总 / <!-- SUMMARY -->
$ sed -n '10,11p' docs/analysis/code/tierb-pass1/tierB-slice-08.md   → ## 汇总 / （统计在全部行落盘后补全）
$ grep -c '^| 0x' docs/analysis/code/tierb-pass1/tierB-slice-09.md   → 0     （全文 19 行，尾部 <!-- TABLE -->）
$ sed -n '11,12p' docs/analysis/code/tierb-pass1/tierB-slice-14.md   → - 总计：1057（待回填） / - 各 label 计数：待回填
```
实际裁定覆盖：03=250/1062、05=550/1062、08=78/1062、09=0/1062、14=300/1057（合计 1178/5305 = 22.2%）。
`tierB-slice-03.md:7` 还留着「处理进度: 120 / 1062」而表已有 250 行 —— 进度计数器没有回填（STALE，与 14 同型）。

## 分项结论（可复算的正面证据）

1. **pass1 的规模声明全部精确**：按 tiers.csv 取「区间内 tier B」计数，与五篇头部的 1062/1062/1062/1062/1057 逐一相等：
```
slice-03: inRangeTierB=1062 | slice-05: 1062 | slice-08: 1062 | slice-09: 1062 | slice-14: 1057
```
   `tierB-slice-05.md` 的「slice-05.txt 第 4..1065 行」也成立（文件 1065 行 = 3 行注释 + 1062 块）。
2. **行级证据是真实的**：pass2 里带十进制立即数/字段偏移的行，99-100% 能在 `functions.csv` 边界内的反汇编中找到（01:91/91、05:110/110、06:49/49、02:101/102、03:107/108、08:66/67）。抽查明细：
   - `0xab11b8`：「真函数仅 8 条（push / bl 0xa58d7c / 装 vtable 0xd928cc+8 / pop）」—— 反汇编逐条吻合；该块 `insns=7080` 的确是被合并的 region。
   - `0xa425d4`：「32 位常量 0x4d494e40/0x52544e42/0x50534943 由 movw/movt 构造的比较链」—— 反汇编 `movw r0,#0x4e40; movt r0,#0x4d49` 等逐条吻合。
   - `0x46be08`：「bl 0x4a1b6c, movw 0x1378」；`0x3cf1c`：「字段相等运算符, bne 0x3d89c」；`0x18f07c`：「首指令 b 0x2b908，同段另一入口 bl 0x2b908 后取全局 0x16abb08」—— 三条均逐条吻合。
   - 字符串类 A 证据：`NGWordList`(0x156e3b5)、`Content-Length: %u`(0x1589674)、`[SHADERKEY]`(0x157cbbf)、`cShopListSale`(0x15567eb)、`cUIOKitchenUpBase`(0x156a9be)、`%255[^:]:%d`(0x1590d62)、`Nintendo+Pia`(0x172e5c8) 全部在镜像中命中。
   - `0x3df2a8`/`0x3df378`（save 读/写原语，被多篇当作 A 级种子）：`insns=22/19, callers=375/375`，与文档数字一致；`0x3df2a8` 的体重是「判 [this+4] → 取 [this+8] 游标 → bl 0x13efe30 拷贝 → 推进 [this+0]」，确为流读原语。
3. **batchA 全篇可复算**（771 行、指令和 58818、1.12%、363/151/41.6%、212 条不一致、等距抽 10 条 8 条 cUIO*、前缀表 224 条、769 个唯一标签、362/151/41.7%、215/145/67.4%、147 里 ui 134/otomo 6）—— 我用 `/tmp` 脚本独立重算，逐项相等。唯一无法复算的是「2291 处载入 / 2076 个类名 / 1369 函数」这组扫描规模（其扫描输出未入库，`functions.csv` 的 strings 列只有 4461 条、匹配 `[crsu][A-Z]` 的仅 338 个，既不能证实也不能否证）。
4. **pass3 五篇近乎完美**：01a/01b/01c/02/03 的 review 后 conf 与 role 计数全部与表内一致（如 01a A1/B16/C3、01b A1/B15/C4、01c A0/B16/C4、02 A1/B53/C6、03 A0/B42/C18）。仅两处 1 行偏差：01a 的 label 分布 monster-em 记 11（实 12，且 11+4+2+2=19≠20）；02 的 label 分布 quest 19/item 2（实 18/3，系汇总后又改判一行）。
5. **输出对覆盖表的实际影响很小**：按 report.mjs 规则复现，重生成 spine 之前，本批 25 篇作为「唯一 A 来源」贡献 70 个函数 / 37550 条指令（0.72% 的 .text 指令），headline 的 53.1% 不依赖这批文档；spine 被并行进程吸收这些裁定之后，同一复现只剩 16 个函数 / 5209 条指令（0.10%），因为绝大多数行已被 spine 以同标签收录。也就是说：本批文档对 headline 的边际贡献 ≤0.1%（当前），但它们是 spine 里那 11097 条 A 标签的来源之一，所以文中的 STALE/WRONG 是「账本记账错误」而不是「指标造假」。

## 组级缺陷（不属于某一篇，但影响多篇）

- **G1 切片 txt 头部的「地址域」本身是错的**，多篇照抄：`slice-13.txt` 头写 `0xb1159c..0x758d6c`（上限小于下限），`slice-06.txt` 头写 `0x7f54d4..0x13ad978`，而各自块地址的真实 min/max 与之不符（现池 slice-01..10 实为 rank 2510..4618）。凡引用该"范围"的句子（01/02/03/04/05/06/08/13/14）都继承了这个错误，不宜按「作者抄错」逐篇记 WRONG；建议从生成端修。
- **G2 跨文档重复裁定**：3427 行落在 3282 个函数上（145 条重复、29 条标签互相矛盾、18 条排除 unknown 后仍矛盾）。`report.mjs` 只按 conf 高低取胜、同分时先解析者胜（目录序 pass1 < pass2 < pass3），因此后写的 pass2 无法纠正同 conf 的 pass1 结论。例：`0x69eb18` pass1 判 unknown/A、pass2 判 save-data/A → 最终 unknown；`0x3d15a4` pass1 quest/A 胜 pass2 kernel-os/A。
- **G3 conf 语义漂移**：pass1 头部规定「conf A=直接字符串证据」，但表内 20 行（slice-05）引用字符串却记 B；这一口径在 pass2 被收紧为「字符串必须在真函数体内经 pc 相对载入」（降级行均注明），两代文档的 A 不可直接相加。审计计量器把 conf=A 计入 headline，故跨代比较 A 数时应只信表内 conf 列。
- **G4 DOC-LINKS 只有 1 行命中本批**（`tierb-pass1/tierB-slice-14.md` 的 `D:\ev1738_ts\Rabbit\...`，标 MISSING）。该值是**二进制内的构建路径字符串**（镜像 vaddr 0x13f200b），不是可读路径 —— 属误报，不应记 MISSING。真正的引用缺口一个都没有：29 个反引号路径全部可在 repo、`docs/analysis/` 或 `.tmp/mhgu/` 下解析（`analysis/qp4/fn-67b544.txt`、`analysis/m1417-xref.txt` 都在 `.tmp/mhgu/analysis/` 下，`inventory/classified3.csv` 在 `.tmp/mhgu/inventory/` 下）。

## Difficulties

- **切片输入全在 repo 外**（`.tmp/mhgu/...`），DOC-LINKS 的相对路径解析器只试 repo 根，会把 `analysis/qp4/...`、`inventory/classified3.csv` 判成 MISSING；我逐个补试 `.tmp/mhgu/` 前缀后 29/29 均可解析。代价：约 3 次工具调用 + 1 次误报排除。
- **中文输出在 bash 管道里会显示成 GBK 乱码**，一度看起来像文档被双重编码；用 `Buffer` 往返校验（`roundtrip equal true`、`replacement 0`）证明 25 篇全是合法 UTF-8，乱码只在终端侧。后续改用 `read` 工具读中文，避免误报。
- **`functions.csv` 的函数边界是「region」而非真函数**（`0xab11b8` 记 7080 条，真函数 8 条；`0x2b908` 记 41 条，真函数 1 条 `bx lr`），所以「N callee / N 指令」的行级核对必须区分「作者引用了 region 清单」与「作者亲眼看了函数体」；前 3 次误判（9 vs 8 callee、9 指令 vs 126）都因此产生，改按「evidence 首段 + 输入清单」对齐后归零。
- **审计期间 spine 被并行进程重写**：`docs/analysis/code/inventory/tiers-recomputed.csv` 从 ~9.1k 条 A 变成 11097 条 A（`coverage-report.tsv` 随之从 9188/53.1% 变 11113/62.1%）。我没有改这两个文件（`git status` 显示它们本来就 untracked）；处理方式是两次读数都跑一遍并分别复现，文档里同时给出，避免把「别人的合并」当成自己的度量。代价：多跑 2 次计量器 + 改 3 处措辞。
- **pass2 输入被重切且无版本记录**：04/06/07/08/09/10 的行在任何现存 txt 中都不存在，只能判定「引用已过时（STALE）」，无法把 7 篇逐行还原到它们当时的输入上；这部分断言的复核只能退回到镜像反汇编（已做，99-100% 命中）。
