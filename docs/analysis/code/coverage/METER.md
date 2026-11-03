# 覆盖度计量器（2026-11-03 起可复算）

此前 `code-metrics.md` 的 72.8% / 52.2% 来自一次性脚本与 `.tmp` 中间表，重跑不出来。现在整条链路在仓库内，且**种子的真实性被单独验证过**。

```
node tools/mhgu/coverage/retile.mjs          # 用 46,087 个前导 + BL 目标重建函数表（52,692 个真函数）
node tools/mhgu/coverage/stringxref.mjs      # 从指令里重建字符串引用（不信任旧 strings 列）
node tools/mhgu/coverage/seeds-from-xref.mjs # 引用 → 种子（attr-xref.tsv）
node tools/mhgu/coverage/recompute.mjs --functions docs/data/functions-retile.csv.gz [--seed f]...
node tools/mhgu/coverage/report.mjs [--demote f]
```

## 分母修正

`docs/data/functions.csv.gz` 是**区域平铺**（23,885 段），不是函数表：镜像有 **46,087** 个 `push {...,lr}` 前导，28,807 个不是区域起点。这同时让 68,626 个 vtable 槽里的 62,787 个无法归属。重切后 **52,692 个函数**（守卫：BL 目标 23,195 ≈ 23,336、指令和 5,228,277、带字符串函数 1,937、旧起点全保留）。

## 种子真实性：旧 strings 列不可信

- 旧列的字符串是"区域附近出现过"的产物。抽查 `0xf8c`：旧列声称它引用 `AngleLimit`，反汇编显示它是一个纯结构体遍历循环，**没有任何字符串引用**；而 `AngleLimit` 的地址在镜像里**没有任何字指向它**。
- 需要一个字指向字符串地址才算引用：用这个口径重扫，4,461 个旧 token 里只有 **32** 个通过。
- 从指令重建引用（`ldr rD,[pc,#imm]` → rodata 指针；rodata 表 → 表项；`add rD,pc,rX` 偏移）得到 **2,380 个函数 / 4,252 条引用 / 3,214 个不同字符串**，内容包括 `_ZN2nn3ldn…`、`uShellEms101_sp_01`、`weapon\w%02d\%03d`：这是真的引用。

## 当前可信基线（重切分母，只用独立证据）

| 证据来源 | 性质 | tier A 指令 |
|---|---|---:|
| `attr-xref.tsv`（277 种子） | 指令级字符串引用 | — |
| `attr-vtable-retile.tsv`（5,197 种子，5,217 A） | 注册器/实例/RTTI → 类 → 子系统 | — |
| **合并后（vtable 按类名重标）** | 4,373 行因类名不匹配任何规则降为 B | **48.9%（24,132 函数）** |

tier B（有标签未验证）48.2%，未归属 2.9%。

**vtable 一票曾被高估 5 个百分点**：第一版按 11 条粗规则（含裸 `/Mt/`）给 5,217 行 A；换成按类名的严格规则后，4,373 行没有任何规则覆盖（`MtCollisionUtil`、`MtExHeapAllocator`、`MtTreeDTI` 之类），只能降为 B，只有 620 行原样保留、224 行改标。

**条件性证据**（依赖已被推翻的旧 strings 列，不计入上面的基线）：`attr-library.tsv`（505 A，来自旧列里的 `_ZN2nn`）与 `attr-strings.tsv`（830 A，人工判读旧列字符串）。把它们并入时 headline 为 54.1%——这个数字只能当"上限参考"。

## 到 90% 的剩余量

全部在 tier B（47.1% = 2,462,952 条指令）。可行杠杆，按可验证性排序：

1. **vtable 的 8,360 行 `unknown`**（10.8% 指令）：类名不属于现有 11 条规则（AI、碰撞、资源加载），需要扩充分类规则或按父类继承判定。
2. **逐函数反汇编特征**：立即数、可见字段偏移（`member-offsets.tsv`）、被调函数族——需要新证据，不是传播。
3. **字符串引用的表访问机制**（`ldr rX,[pc]; ldr rY,[rX,rN]`）覆盖的消息表，目前只做了 256 项窗口。

任何把 tier B 直接计入"已解释"的报法都是错的。
