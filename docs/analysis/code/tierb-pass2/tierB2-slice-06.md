# Tier B pass2 slice-06 — 120 函数裁定

输入：`.tmp/mhgu/tierB2/slice-06.txt`，范围 0xb811f0 .. 0xb6f3c4，逐文件顺序处理，共 120 条。

## 汇总

**label 计数（120）**

| label | 数量 |
|---|---|
| quest | 52 |
| monster-em | 25 |
| render-gfx | 15 |
| filesystem | 7 |
| otomo-ot | 5 |
| unknown | 5 |
| online-nex | 4 |
| ui | 2 |
| debug-dev | 2 |
| audio | 2 |
| physics-math | 1 |
| online-nex/save-data/save-io/item/kernel-os/player-pl/weapon-wp | 0 |

**conf 计数**：A 12 / B 101 / C 7

**role 计数**：orchestrator 81 / worker 39 / leaf 0 / thunk 0

**最不确定的 5 个**

1. `0x130b6b4` — 只有 votes otomo-ot:1，反汇编是超长立即数比较链 + 跳表，看不出子系统。
2. `0xcb3014` — 唯一 callee 0x13efddc，VFP 双缓冲交替索引，无同簇旁证。
3. `0xa6d3b4` — 从单例整块复制 8192B 记录，votes audio/render-gfx/monster-em 各 1 票平票。
4. `0x872e00` — 只有 0x7bb638/0x7aedcc，VFP + 20/64 步长寻址，可能是数学或渲染辅助。
5. `0xafd42c` — 唯一 callee 0x13efddc，纯 VFP 逐分量运算 + 4 分支跳表，无旁证。
   次之：`0x9b309c`（VFP 向量运算，votes 2:2 平票）、`0x2842ac`（0x28xxxx 范围但 votes 仅 render-gfx:1）。

## 判读约定（本切片内部一致）

- 记录单位：每条 `insns` 均 ≥ 677，反汇编窗口内常见 `bx lr` 后紧接新函数，故记录实为“函数簇/小区域”；因此 role 依记录给出的 `callees` 数量机械判定（≥8 → orchestrator，其余 worker），本切片不存在 leaf/thunk。
- `0x7aa47c` = 单例/管理器访问器；其返回值 `[r1,#52]`（vtable slot 13）常为虚析构 → “析构/注销”惯用法。
- `0x7bb638` = 分配器（返回后立即 `str vtable,[r0,#0]`）；`0x887660` = 释放；`0x887648` = 加引用；`0x13efdc4` = memset 类；`0x7aedcc` = 类注册；`0x7af3c4` = 共用空桩。
- `0x826x/0x827x` 簇 = 反射/序列化字段读写（`0x827c9c` 写字符串字段）。
- `mp*` 资源类（mpResource/mpSetting/mpCollision/mpScheduler/mpCubeMap）→ `filesystem`（资源对象生命周期），统一处理以保证一致性。
- `cUIO*` 类名 → `ui`（UI 对象框架），即使调用方 votes 落在 otomo-ot。

## 明细

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xb811f0 | quest | orchestrator | B | 字符串 `%s_%02d%s`；callees 含 0x7aedcc 类注册 + 0x826x/0x827x 序列化簇（22 个）；首函数为按 id 线性查找（计数 `[r3,#128]`、表 `[r3,#248]`、步长 12、比较 `[r2,#4]==r1`）后 `bx lr` |
| 0x11d2768 | monster-em | orchestrator | B | 0x282898/0x283060/0x282850/0x27b1d0/0x2ad6fc 全属 0x27-0x2b EM 簇；`[r5,#0x23a0]` 取子对象后 `[r6,#4992]` 传 0x13f614 格式化；votes monster-em:12 |
| 0x11bf538 | monster-em | orchestrator | B | 0x282fd8/0x283238/0x281998/0x2e8c24/0x2b7ed8 EM 簇；字节合成 `[r1,#0x274a]`+`[-1]`+`[2]` 置位 0x40，`[r1,#230]` 清零，`[r1,#0xd8bb]==2` 判定；votes monster-em:11 |
| 0xb40aa0 | filesystem | orchestrator | A | 字符串 `mpSetting` / `resource` → MT 资源类；按 1696(0x6a0) 字节元素遍历 `[r9,#144]` 容器并逐个 0x887660 释放；vtable 取 `[pc+0xd03630]+8` |
| 0x6ea28c | quest | orchestrator | B | `cmp r3,#7` + 8 分支跳表（0x6ea2e0 起）；单例偏移 0x6bf4/0x6bfc；0x65cb3c/0x65e794/0x54ecc0/0x54f260 任务序列簇；votes quest:19 |
| 0xb25680 | quest | orchestrator | B | 构造函数：0x85f9ec 处理 r4+104、0x13efdc4 清 r4+40(64B)、字段 4..16 置 0/-1；0x7aedcc 类注册；votes quest:6 |
| 0x29edf4 | monster-em | orchestrator | B | 0x27bcd0 结果 ==1 分支；`ldrsh [r8]`；`[r0,#500]` 虚调用取符号；0x282f58/0x2e14b4/0x282828 EM 簇；votes monster-em:7 |
| 0xc30b20 | render-gfx | worker | B | `(state-1)<=3` 4 分支跳表（0xc30b68 起）；VFP 加载 ed950a05/ed954a09；0xc2fd0c/0xc316e4/0xc318c0 同 0xc3xxxx 图形簇，votes render-gfx:3 |
| 0xf1180 | quest | worker | B | 析构簇：`b 0x2b908` 后 `bl 0x2b908` 基类析构 + 0x7aa47c 单例后 `[r1,#52]` 虚调用；votes quest:3 为唯一线索 |
| 0x360ac8 | quest | worker | B | 与 0xf1180 同型（`b/bl 0x2b908` + `[r1,#52]` 虚析构、vtable 字 0x14dbca8）；votes quest:3 |
| 0x40a2c4 | monster-em | orchestrator | B | `b 0x43b488` 基类构造 + 0x4a1b6c/0x4a1c78/0x4a2744/0x4a2f5c 等 0x4axxxx EM 簇；votes monster-em:16 |
| 0x5bdef4 | ui | orchestrator | A | 类名串 `cUIOKitchenDownBase`；`[r5,#2126]`/`[2127]`/`[2128]` 三字节状态 + 0x56e528(…,r1=1|2)；votes otomo-ot:18 属调用方子系统 |
| 0x8a2a1c | filesystem | orchestrator | A | 字符串 `mpResource` / `resource`；ctor 装 vtable `[pc+0xf9f35c]+8`，`[r4,#248]` 经 0x7aa47c 单例 `[r2,#52]` 释放，`[r4,#244]` 走 0x887660 |
| 0xa1ae20 | quest | orchestrator | B | 析构：vtable `[pc+0xe2844c]+8`；遍历 `[r4,#52]` 容器（元素 144B，逐项 0xa1e9a0）后 0xa2102c 释放；votes quest:14 |
| 0x28b0e0 | monster-em | orchestrator | B | 0x28ab24 前置校验；`r6-31 <= 18` 跳表分发（0x28b11c 起 19 项）；0x4ef7a4/0x4ef6e4/0x4ef880/0x4ef96c 簇；votes monster-em:6 |
| 0x7437bc | quest | orchestrator | B | `[r11,#4]` 状态 ≤6 + 7 分支跳表（0x743804 起）；单例 `[r7,#0x6bfc]`；0x65e5bc/0x54fbb0/0x5530b8 任务簇；votes quest:28 |
| 0x656c7c | otomo-ot | orchestrator | B | `[r4,#140]==1` 时对 0x601e9c 连续下发 (通道 0..4, 值 1/4/1/1/1)；0x56e530/0x56ea08/0x570688/0x56dd44 0x56-0x57 簇；votes otomo-ot:24 |
| 0x2b98dc | render-gfx | orchestrator | B | 0x2ba82c/0x2bb164/0x2bc420/0x2bcfd0/0x2bd294 等 0x2bxxxx 图形簇；`[r0,#0x2544]` 表 + 半字读取；votes render-gfx:39 |
| 0xa8a128 | quest | orchestrator | B | 0xa58d7c 基构造 + vtable `[pc+0xdb98c8]+8`；0xa5b2b8/0xa6785c/0xa8accc/0xc65e38 簇；votes quest:11 |
| 0x112a904 | quest | orchestrator | B | `[r6,#0x3328]` 对象、`[r0,#968]&1` 取标志；`[r0,#2228]` 虚调用得值后 `(v-1)<=54` 跳表；votes quest:9 |
| 0x27ca28 | monster-em | worker | B | `[r6,#0x1444]&1` 分支、`[r7,#176]&0x20` 标志、0x65f93c 掩码比较；0x27d5c4/0x27db78/0x285e2c EM 簇；votes monster-em:6 |
| 0x130b6b4 | unknown | worker | C | 超长立即数比较链（0x18f6c04 / 0x18f7acd / 0x18f7bd2 / 0x18f7d89 …）+ 98 分支跳表，唯一 callee 0x13f175c；仅 votes otomo-ot:1，无法定向 |
| 0x1c9b68 | otomo-ot | orchestrator | B | `[r4,#4]` 状态 `(v-2)<=7` + 8 分支跳表（0x1c9bac 起）；0x65d464/0x65e794/0x551edc/0x55f760 0x55-0x65 簇；votes otomo-ot:16 quest:13 |
| 0x95d464 | quest | orchestrator | B | 0x95e030 基构造 + vtable `[pc+0xee5234]+8`；`[r4,#196]` 写入 {1,3,1.0f}（`stm {r0,r1,r2}`）；0x95ff14/0x95fea8/0x95fef0 簇；votes quest:13 |
| 0xa4b390 | quest | worker | B | VFP 分支：`[r0,#160]&3` 取 0/1/2 三种旋转/缩放组合（ed9f1aca、eeb03a41）；0xa4a388/0xa4ad5c/0xa37c1c 簇；votes quest:5 |
| 0xc8a858 | quest | worker | B | 首函数 `bx lr`（空占位）；后续为 0x7aa47c 单例 + `[r1,#52]` 虚析构的 dtor 簇；votes quest:2 |
| 0x4bd93c | quest | worker | B | 首函数 `bx lr`；后续 dtor 簇：0x7aa47c 单例 + `[r1,#52]` 虚调用；votes quest:2 |
| 0x1bbe04 | monster-em | worker | A | 类名串 `nMonNyanEvent::cEventDataBase` / `nMonNyanEvent::cEventDataSendTo`；ctor 装 `[pc+0x167f198]+8` 并 `stm {r1,r2=0}`，后接 16 条 `b 0x7af3c4` 桩 |
| 0x769b30 | quest | orchestrator | B | `[r11,#6]<=7` + 8 分支跳表（0x769b5c 起）；0x3f85fc 单例查询；0x761dc8/0x76cb70/0x75f878 0x75-0x76 簇；votes quest:22 |
| 0x22d8f4 | otomo-ot | orchestrator | B | `r6<=5` + 6 分支跳表（0x22d920 起）；`[r0,#520]` 子对象、0x276748/0x276700/0x25a01c/0x1cd158 簇；votes otomo-ot:6 |

| 0x16f2c | quest | worker | B | 析构：vtable `[pc+0x18222f0]+8`；遍历 `[r4,#148]` 计数、`[r4,#160]` 元素数组，逐个 `[r1,#4]` 虚析构，随后 0x690 释放；votes quest:2 audio:2 |
| 0x7a3480 | quest | orchestrator | B | `[r6,#4]>>24 <=5` + 6 分支跳表（0x7a34b4 起）；`[r6,#128]` 位标志 tst 0x2000/0x4000；0x54ee98/0x65cba0/0x5530b8 簇；votes quest:19 |
| 0xb35f70 | render-gfx | worker | B | ctor：vtable `[pc+0xd0e094]+8`；`[r6,#8]` 取自 0x3015400 索引、`[r6,#28]=25`、`[r6,#32]` 清低 28 位（and 0xF0000000）；0x87ff38/0x8814c0 图形簇 |
| 0xaf04c0 | render-gfx | orchestrator | B | 0xaecad0/0xaecae0/0xaecb10/0xaecb30/0xaece50 连续调用（0xae 图形簇）；`[r4,#72]` 游标写入 `[r4,#48]` 数组（`ldrb [pc,pc,lsl]` 索引）；votes render-gfx:8 |
| 0xb5ae10 | quest | orchestrator | B | 900B 栈帧；`[r5,#0]` → `[r0,#12]` 虚调用后再 0xb59920；0xb58ba0/0x82fb08/0x82fb88/0x13b69ac（校验）簇；votes quest:9 audio:3 |
| 0x2842ac | monster-em | worker | C | `[r4,#4992]` 与 169/206/170/82/107/108 等类型 ID 比较（0x28xxxx 范围）+ VFP 转换；唯一 callee 0x53a058，votes 仅 render-gfx:1 |
| 0xc88328 | filesystem | orchestrator | A | 属性名串 `resource` / `rtype` / `path` / `null`；getter 返回 `[r0,#12]`；setter 比较后经单例释放 `[r4,#16]` 再写 `[r4,#12]`；votes quest:15 |
| 0xe4568 | quest | orchestrator | B | `[r4,#576]`/`[r4,#577]` 字节作参数查 0x2641d0；0x285c6c/0x28813c/0x4d3a08/0x2864e0 簇；votes quest:10 |
| 0xc3144 | monster-em | orchestrator | B | `[r4,#0x1428]` 对象 `[r0,#588]`/`[590]` 清 0；`[r0,#1284]`、`[r10,#0x73e0]==14` 判定；0x10c357c/0x274ce4/0xc3d08；votes monster-em:21 |
| 0x1195aa0 | monster-em | worker | B | `[r0,#360]` 虚调用结果 ==3 或 ==1 时尾调用 0x2dff34；0x281998/0x285e2c/0x282898/0x2ad6fc/0x2a740c EM 簇；votes monster-em:6 |
| 0x89a8c8 | filesystem | worker | A | 字符串 `mpCollision` / `resource`；链表头插（`[r10,#4]` 为头，`[r0,#48]`/`[r0,#52]` 双向指针）；vtable `[pc+0xcd7a3d]` |
| 0xb9f4e0 | debug-dev | worker | B | 错误串 `on returned an error`（截断）；三块 128B 栈缓冲 0x13efdc4 清零后 0x86a438/0x882674 格式化；`[r10,#56]` 游标 |
| 0x2dab0 | debug-dev | orchestrator | A | 类名串 `cDebugActionData`；0x827c9c 连续写两个字符串字段（`[r5,#4]`/`[r5,#8]`），再 `[r0,#12]` 虚调用写 `[r5,#12]`/`[r5,#16]` 等标量 |
| 0x760754 | quest | orchestrator | B | `[r4,#5]<=5` + 6 分支跳表（0x760788 起）；0x3f85fc 单例 + 0x769b30/0x768070/0x7647d8/0x766e94 调度簇；votes quest:26 |
| 0x48950c | monster-em | orchestrator | B | 0x7aa47c 单例后 `[r1,#32]` 虚调用三参转发（`[r6,#28]` 作第 3 参）；0x4a1b6c/0x4a2744/0x4a3164/0x4a2f5c EM 簇；votes monster-em:16 |
| 0x6bed44 | quest | orchestrator | B | `[r4,#188]==15` 与 `<=14` 跳表（0x6bed90 起）；单例 `[r0,#0x6bfc]` + `[r1,#880]`；0x6d09b8/0x6d3508/0x6d0914；votes quest:18 |
| 0xb0cf3c | quest | orchestrator | B | 参数 r2 的奇偶/位分支 + `[sp,#160]` 取址；0xb0c7d0/0xb0804c/0xb08088/0xb09098/0xbdc238 0xb0-0xbd 簇；votes quest:5 render-gfx:3 |
| 0xc39f24 | render-gfx | orchestrator | B | 栈上 544B 记录交 0xc251a0 填充，`[r4,#204]`、r4+208、`[sp,#8]` 字段；0xc387e8/0xc390e4/0xc395e4/0xc39864 图形簇；votes render-gfx:6 |
| 0x34abc | quest | orchestrator | B | ctor：主 vtable `[pc+0x1804940]+8` 与次 vtable +0x74；0x13efe48/0x13efe54 构造 `[r4,#152]`/`[r4,#720]`；`[r4,#149]`/`[150]` 清 0；votes quest:43 |
| 0x19ebb8 | quest | worker | B | 同型 dtor 簇：`b/bl 0x2b908` + 0x7aa47c 单例 `[r1,#52]` 虚调用（vtable 字 0x169c0a0）；votes quest:3 |
| 0x794344 | quest | orchestrator | B | 0x65cb3c 取 46 号序列；`[r4,#152]<=4` + 5 分支跳表（0x794378 起）；单例 `[r0,#0x6bfc]` tst 0x4000；votes quest:29 |
| 0x40e820 | monster-em | orchestrator | B | 先写 vtable `[pc+0x142e6b0]+8` 再 `b 0x43b488` 基构造；0x4a1c78/0x4a2744/0x43b7e0/0x4a2ed0 EM 簇；votes monster-em:18 |
| 0x5769bc | quest | orchestrator | B | `[r0,#92]` bit2 置/清后 `b 0x576014`；`[r0,#24]` 分支；0x575e10/0x576014/0x56e528/0x56e538 0x56 簇；votes quest:13 otomo-ot:10 |
| 0x710a64 | quest | orchestrator | B | `[r9,#76]<=6` + 7 分支跳表（0x710ab8 起）；单例 `[r1,#0x6bfc]` 与 `[r1,#0x6c34]` 位域合并；0x54edec/0x19d278；votes quest:19 |
| 0x204130 | monster-em | orchestrator | B | r4<0 早退；0x27729c 查表 + `[r6,#0][r0,#136]` 虚调用 ==1 才继续；0x2649f4/0x282da8/0x9fba6c；votes monster-em:6 online-nex:4 |
| 0x654828 | ui | orchestrator | A | 类名串 `cUIOCPanelSupportBase`；0x56d97c 基构造 + vtable `[pc+0x11ebea4]+8`；`[r4,#76]`/`[r4,#80]` 清 0；0x7aa47c 后按 `r5<<2` 申请 16 字节 |
| 0x78a39c | quest | orchestrator | B | 连续取 8 个成员地址 `[r11,#68..#75]` 存入栈槽；0x78b6e4/0x78aed4/0x78b800/0x78bff4/0x78c828 0x78 簇；votes quest:17 |
| 0x2794e0 | quest | worker | B | 首函数：`r1-100<=32` 返回 0/1 的范围判定，后接 `b 0x7af3c4`；0x27a014/0x298edc/0x3f8634；votes quest:6 |
| 0xa0e1d8 | quest | orchestrator | B | ctor：0x9ff218 基构造 + vtable `[pc+0xe34f9c]+8`；`[r0,#444]=1.0f`、`[r0,#448]=4`、`strh 0x101,[r0,#177]`；0xa293d0/0xc8d5d0/0xc8d9c4；votes quest:16 |
| 0xba4be4 | quest | worker | B | 0x8878e4 前置 + 0x7bb638 分配后装 vtable `[pc+0x9d6190]`、立即数 0x1000000c 与 r8 双字入结构；votes quest:2 |

<!-- slice-06 continued -->
