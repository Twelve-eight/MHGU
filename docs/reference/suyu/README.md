# SUYU-GURecomp 内部机制（研究归档）

- `internals.md`：DsvSuyuInternals 的报告，研究对象是本地克隆的 SUYU-GURecomp 和 forge-pc 源码，2026-10-24。
- `suyu-network-limits.md`：**只讲网络/联机链路**的限制清单（L1–L13 + 待核验 V1–V7），每条带证据与核验等级；文末第 6 节只做"范围外"索引，不作断言。2026-11-07。
- `yuzu-room-compat-review.md`：YuzuRoomAudit（dsv-remote，2026-11-07）对"用 yuzu 房间 + 第三方 UDP 端口映射能否搬到本源出、能否跨实现同房"的复核（N1–N5），并纠正三处机制描述：LDN 控制包不压缩、非 LAN 目标的 socket 不进 room、ENet 1392 是 UDP 载荷预算（IP 层约 1420）。另：版本校验分两层（传输层无门禁，LDN 透传 `local_communication_version`，游戏自己裁决），见 L13。
- `multiplayer-v6-bridge-review.md`：V6BridgeReview（dsv-remote，2026-11-07）对上面两份报告 7 条断言的独立复核（C1–C7 逐条 CONFIRMED/REFUTED、双份记录、Difficulties）；与两份报告冲突时以本文件为准。已确认的更正：RyuLdn 出货默认不开本机 30456 监听、MTU 上限不是固定 72 B、`LdnBackend` 是 8 个纯虚 + 1 个可选。
- `multiplayer-v6-bridge.md`：原生版联机的现状（suyu room / RyuLdn / NEX 自建服务器）、IPv6 全栈不支持的证据、以及"本地桥 + IPv6 直连"方案的落点、参数与问题清单，2026-11-07。
- `internals-review.md`：DsvSuyuInternalsReview 的复核，与报告有冲突时以复核为准。复核共降级 25 处：
  - 2 处是事实错误：查找缓存是 4096 项（`kLookupCache`），报告写的 64 项不对；64 是 `kChainBudget`。
  - 1 处是机制描述有误：JIT 取指按页缓存，换页或执行 ISB 时才重新取。
  - 其余 22 处只是引用行号偏了，事实本身没错。

## 对 MHGU 原生版补丁的结论（已复核）
- 往客机代码内存写字节，不会改变已重编译代码的行为（`forge_pc.h:229-231`：「Changing code bytes in guest memory does NOT change the recompiled game: use hooks for code」）。立即数直接写死在生成的 C 代码里（`a32_to_c.h:181-189` 的 `MoveWide`，`:187` 生成 `c->r[Rd] = 0x…;`）。
- hook 只能挂在重编译块的起点（`is_block` 检查）。
- 没有对应重编译块的代码由 dynarmic JIT 执行，注入到客机内存的代码也一样可以运行。
- 一处 `movw` 立即数修改有三种改法：
  - 在之后的某个块起点上挂 hook，改写寄存器的值；
  - 用 `hook_override` 替换整个函数；
  - 如果这条指令本身就是块起点，用 `FORGE_HOOK_JUMP` 跳到一段由 JIT 执行的替身代码。
- 待确认：`mem_write` 写代码后是否会刷掉 dynarmic 已经翻译好的代码块。在 `Memory::WriteBlock` 路径上没找到 `InvalidateCacheRange` 调用。
