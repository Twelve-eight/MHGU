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
| 脚本 | 产出 | 说明 |
|---|---|---|
| `arm32.mjs` | —（库） | `disasm(vaddr,count)`（count=指令条数）、`findCallsTo([vaddr])`、`rd32/rd16/rdb` |
| `func-inventory5.mjs` | `docs/data/functions.csv.gz`（23,885 函数） | 函数边界/指令数/callers/callees/引用字符串。**字符串 xref 必须走 pc 相对**：`ldr rB,[pc,#imm]` 或 `movw/movt` 取 bias → `add rD,pc,rB` → `target=site+8+bias` |
| `classify3.mjs` | （stdout） | 字符串关键词 → 子系统标签 + 调用图传播（**注意 taxonomy 不能有裸 `/UI/`**，会误匹配 BUILD/GUID） |
| `validate-repeat.mjs` | （stdout） | **10 折重复切分**验证传播精度（headline 指标；单次切分不可引用） |
| `validate-labels.mjs` / `validate-addr.mjs` | （stdout） | 单次切分/地址局部性对照 + 置换基线 |
| `fn-cluster.mjs` | （库） | 按 `movw #imm` 站点聚类到所属函数 |
| `gen-entrymap.mjs` | `docs/analysis/gameplay/entry-map.md` | 玩法访问面地图 |
| `reader-fields.mjs` / `member-reader-trace.mjs` | （stdout/JSON） | 成员 reader 的字段读取序列 |
| `decode-registry.py` | `docs/data/resource-registry` 相关 | cResource 注册表（`{名称 crc32, 类型 crc32}`）解码 |
| `mon/mon-final.py` | `docs/data/class-inventory.tsv`（3,201 类） | `bl 0x7AEDCC` 的 `r3` = 类大小 + pc 相对取类名 |
| `mon/mon-offsets.py` | `docs/data/member-offsets.tsv`（110 条） | 成员 `{offset,type,name}`（offset/type 是代码立即数） |
| `mon/em-units.py` / `counter-slots*.py` | `docs/data/json/monster-slot-map-137.json` | 137 槽 `{EmId,slot}` @`0x1597EA4` + 资源名表 @`0x1732050` |
| `mon/size-final.mjs` | （stdout） | 体型记录（存档 `0x60CA`，137×`[mini,0,maxi,0]`）越界与语义核验 |
| `mon/quest-dispatch.mjs` / `ai-entry4.mjs` | （stdout） | `0x2484C0` 条件谓词表 / 怪物动作派发器 |

## 已踩过的坑（必读）
1. **ARM `&` 在 JS 里返回有符号 32 位整数**：`(w & 0xFFF00000) === 0xE3000000` 永远为 false，必须 `((w & 0xFFF00000) >>> 0) === 0xE3000000`。曾因此得出「0 命中」的错误结论。
2. **BL 判定必须带 bit24**：`(w>>>25)&7 === 5` 同时匹配 `B` 与 `BL`，会多出 8 倍噪声。
3. **字符串不是绝对指针**：按「4 字节字 == 串地址」搜索得到 0 命中是假阴性。
4. **`add rD,pc,rM` 的掩码**：`(w & 0x0FFF0FF0) === 0x008F0000`（Rn=15、shift=0）；`add pc,pc,rM,lsl#2` 是跳转表，不是数据引用。
5. **`cmp #384` 之类不是位宽**：位宽 = 字节数 × 8。
6. **类大小要设上限**：`r3` 在个别调用点不是 size（8 个类的记录值 > 0x40000，已标 `SUSPECT`）。
7. **类名种子不可靠**：注册函数常跨子系统注册，按「注册器→类的多数前缀」判子系统实测仅 57.4%。
