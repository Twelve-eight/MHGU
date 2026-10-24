# SUYU-GURecomp 内部机制（研究归档）

- `internals.md`：DsvSuyuInternals 的报告，研究对象是本地克隆的 SUYU-GURecomp 和 forge-pc 源码，2026-10-24。
- `internals-review.md`：DsvSuyuInternalsReview 的复核，与报告有冲突时以复核为准。复核共降级 25 处：
  - 2 处是事实错误：查找缓存是 4096 项（`kLookupCache`），报告写的 64 项不对；64 是 `kChainBudget`。
  - 1 处是机制描述有误：JIT 取指按页缓存，换页或执行 ISB 时才重新取。
  - 其余 22 处只是引用行号偏了，事实本身没错。

## 对 MHGU 原生版补丁的结论（已复核）
- 往客机代码内存写字节，不会改变已重编译代码的行为。立即数直接写死在生成的 C 代码里（`forge_pc.h:229-231`）。
- hook 只能挂在重编译块的起点（`is_block` 检查）。
- 没有对应重编译块的代码由 dynarmic JIT 执行，注入到客机内存的代码也一样可以运行。
- 一处 `movw` 立即数修改有三种改法：
  - 在之后的某个块起点上挂 hook，改写寄存器的值；
  - 用 `hook_override` 替换整个函数；
  - 如果这条指令本身就是块起点，用 `FORGE_HOOK_JUMP` 跳到一段由 JIT 执行的替身代码。
- 待确认：`mem_write` 写代码后是否会刷掉 dynarmic 已经翻译好的代码块。在 `Memory::WriteBlock` 路径上没找到 `InvalidateCacheRange` 调用。
