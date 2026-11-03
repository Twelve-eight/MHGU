# MHGU 逆向工具链（可复现）

这些脚本产出 `docs/` 下的机器可读表与 `docs/analysis/` 的度量结论。
**输入不在 repo 内**（体积/版权原因），需自行准备（见「输入」）。

## 输入
| 名称 | 路径（本机） | 说明 |
|---|---|---|
| flat 镜像 | `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` | NSO0 `main` 解压后、前加 0x100 头。`flat_off = vaddr + 0x100` |
| clean 存档 | `MHGU/save-snapshots/20261022-clean-reference/system_CLEAN` | slot1 猎人块基址 `0x2AC560` |
| dirty 存档 | `MHGU/save-snapshots/20261022-v6-ready/system` | slot0 基址 `0x18CC9C` |

> 所有脚本默认读 `G:/omp works/...` 绝对路径；换机请改脚本顶部的路径常量。

## 产出对照表
「产出」列 = 脚本**当前实际写入**的路径或写出的内容。`docs/data/` 下被 git 追踪的同名文件不一定由该脚本写到
那里，逐条见本节末的「`docs/data/` 追踪文件与生产者」。

| 脚本 | 产出 | 说明 |
|---|---|---|
| `nso-flat.mjs` | 任意 NSO0 → `*.flat.bin`（+0x100 头，LZ4 段解压）| `node tools/mhgu/nso-flat.mjs <in> <out>`；`FLAT=<out>` 让 arm32.mjs 读 sdk 等其他模块 |
| `arc.mjs` | 解包 romfs `.arc`（库 `readArc`/`inflateEntry` + CLI） | `list <file.arc>` → idx/name/type_hash/csize/size/offset；`extract <file.arc> <outdir> [nameRegex]` → 写 `<outdir>/<名称反斜杠转目录>.<typehash hex>`，逐条校验 magic/边界/解压长度=size，不符则报错点名条目并继续；`find <romfsDir> <nameRegex>` → 递归遍历 `.arc`，打印 `arc 路径 :: 条目名`（regex 不区分大小写）|
| `arm32.mjs` | —（库） | `disasm(vaddr,count)`（count=指令条数）、`findCallsTo([vaddr])`、`rd32/rd16/rdb` |
| `func-inventory5.mjs` | `.tmp/mhgu/inventory/functions4.csv`（23,885 函数） | 函数边界/指令数/callers/callees/引用字符串。**字符串 xref 必须走 pc 相对**：`ldr rB,[pc,#imm]` 或 `movw/movt` 取 bias → `add rD,pc,rB` → `target=site+8+bias` |
| `classify3.mjs` | （stdout） | 字符串关键词 → 子系统标签 + 调用图传播（**注意 taxonomy 不能有裸 `/UI/`**，会误匹配 BUILD/GUID） |
| `validate-repeat.mjs` | （stdout） | **10 折重复切分**验证传播精度（headline 指标；单次切分不可引用） |
| `validate-labels.mjs` / `validate-addr.mjs` | （stdout） | 单次切分/地址局部性对照 + 置换基线 |
| `fn-cluster.mjs` | （库） | 按 `movw #imm` 站点聚类到所属函数 |
| `gen-entrymap.mjs` | `docs/analysis/gameplay/entry-map.md` | 玩法访问面地图 |
| `reader-fields.mjs` / `member-reader-trace.mjs` | （stdout/JSON） | 成员 reader 的字段读取序列 |
| `decode-registry.py` | `.tmp/mhgu/inventory/resource-registry.txt` | cResource 注册表（`{名称 crc32, 类型 crc32}`）解码；448 行、`0x偏移\t?crc32\t名称` 三列（追踪版 `docs/data/resource-registry.tsv` 内容相同，见本节末） |
| `mon/mon-final.py` | （stdout） | `bl 0x7AEDCC` 的 `r3` = 类大小 + pc 相对取类名；打印 `fn=… @0x… size=… name=…`，不写文件 |
| `mon/mon-offsets.py` | （stdout） | 成员 `{offset,type,name}`（offset/type 是代码立即数）；输出是按**注册函数**分组的人读格式（`### fn 0x4201c` / `off=0x1ac type=0 mTimer (site 0x4234c)`），不是 `member-offsets.tsv` 的 5 列 TSV，也不写文件 |
| `mon/em-units.py` / `mon/counter-slots.py` / `mon/counter-slots3.py` | `.tmp/mhgu/mon/counter-slots.out.txt` / `.tmp/mhgu/mon/counter-slots3.out.txt`（`em-units.py` 为 stdout） | 137 槽 `{EmId,slot}` @`0x1597EA4` + 资源名表 @`0x1732050`；读 `docs/data/json/monster-slot-map{,-small}.json` 作对照，不写 `monster-slot-map-137.json` |
| `mon/size-final.mjs` | （stdout） | 体型记录（存档 `0x60CA`，137×`[mini,0,maxi,0]`）越界与语义核验 |
| `mon/quest-dispatch.mjs` / `ai-entry4.mjs` | `.tmp/mhgu/mon/quest-dispatch.out.txt`（`ai-entry4.mjs` 为 stdout） | `0x2484C0` 条件谓词表 / 怪物动作派发器 |

### `docs/data/` 追踪文件与生产者

上表给的是脚本**今天真正写入**的位置；`docs/data/` 下被追踪的同名文件并不由这些脚本写在该路径上。逐个核查
（2026-11-04，读源码 + 读文件；无脚本被执行）：

| 追踪文件 | 有脚本写到该路径吗 | 生产者 / 最接近的生产者 | 依据 |
|---|---|---|---|
| `docs/data/functions-retile.csv.gz` | **有** | `coverage/retile.mjs`（`OUT_CSV` 第 19 行，写于第 103 行 `fs.writeFileSync(OUT_CSV, …)`） | `const OUT_CSV = path.join(ROOT, "docs/data/functions-retile.csv.gz")` |
| `docs/data/functions.csv.gz` | 无 | `func-inventory5.mjs` → `.tmp/mhgu/inventory/functions4.csv`：两者同为 `start,end,insns,callers,callees,strings` 六列、23,885 数据行。`.tmp` 里另有一份更旧的 `functions.csv`，是**七列**（多 `rets`，且 `callees`/`callers` 顺序相反），不是这个 schema | 解压追踪文件得 23,886 行（含表头）；`.tmp` 两份各读首行 |
| `docs/data/resource-registry.tsv` | 无 | `decode-registry.py` → `.tmp/mhgu/inventory/resource-registry.txt`：两边同为 448 行、`0x偏移\t?crc32\t名称`，前 6 行相同 | 读两份文件的前几行 |
| `docs/data/member-offsets.tsv` | 无 | `mon/mon-offsets.py` 只打印；且它按**注册函数**分组（`### fn 0x4201c`，110 条、27 组），追踪 TSV 的 `fn` 是**包含 site 的函数**（`0x4210c`）——中间还有一步后处理，仓库里没有这段代码 | `read mon-offsets.py:60-118`；`.tmp/mhgu/mon/mon-offsets.out.txt:1-12`；追踪 TSV 表头 `fn\toffset\ttype\tmember_name\tsite` |
| `docs/data/class-inventory.tsv` | 无 | 没有生成者，只有读者（`audit/audit-new-docs.mjs:43`、`coverage/class-from-code.mjs:90`、`coverage/member-seeds.mjs:50` 等）。`mon/mon-final.py` 打印 `fn=… @0x… size=… name=…`，与追踪文件的 `family/name/size/registrar_fn/registrar_site/suspect` 六列不同 | `grep "class-inventory\.tsv" tools/` |
| `docs/data/tierb-labels.csv` | 无 | `tierb-merge.py` → `.tmp/mhgu/inventory/tierb-labels.csv`：两边同为 379 行（含表头 `vaddr,label,role,conf,evidence,src`） | 读两份文件 |

结论：这些追踪文件是从 `.tmp` 产物拷入的（或是在脚本改输出路径之前生成的）。重跑脚本只刷新 `.tmp`，
不刷新 `docs/data/`；要重新生成请显式拷贝，或改脚本顶部的输出常量。

## 已踩过的坑（必读）
1. **ARM `&` 在 JS 里返回有符号 32 位整数**：`(w & 0xFFF00000) === 0xE3000000` 永远为 false，必须 `((w & 0xFFF00000) >>> 0) === 0xE3000000`。曾因此得出「0 命中」的错误结论。
2. **BL 判定必须带 bit24**：`(w>>>25)&7 === 5` 同时匹配 `B` 与 `BL`，会多出 8 倍噪声。
3. **字符串不是绝对指针**：按「4 字节字 == 串地址」搜索得到 0 命中是假阴性。
4. **`add rD,pc,rM` 的掩码**：`(w & 0x0FFF0FF0) === 0x008F0000`（Rn=15、shift=0）；`add pc,pc,rM,lsl#2` 是跳转表，不是数据引用。
5. **`cmp #384` 之类不是位宽**：位宽 = 字节数 × 8。
6. **类大小要设上限**：`r3` 在个别调用点不是 size（8 个类的记录值 > 0x40000，已标 `SUSPECT`）。
7. **类名种子不可靠**：注册函数常跨子系统注册，按「注册器→类的多数前缀」判子系统实测仅 57.4%。
