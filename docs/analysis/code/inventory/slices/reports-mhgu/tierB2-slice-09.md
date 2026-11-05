# Tier B pass2 裁定 — slice-09（120 函数）

输入：`.tmp/mhgu/tierB2/slice-09.txt`；交叉核对 `.tmp/mhgu/inventory/tiers.csv`（tier 预测，B 级多为邻域传播）、
`inventory/tierb-labels.csv`（已裁定表）、`classified3.csv`（range→subsystem）。

## 判据与噪声处理

1. **通用 stub 票 = 噪声**（沿用同批 precedent）：`0x7aa47c/0x7aedcc/0x7bb638/0x13efd70..0x13efdf4/0x8870b8/0x887648/0x887660/
   0x65cb3c..0x65cc0c/0x54ecc0..0x54ff80/0x194228/0x525878/0x2b908/0x2b8f0` 等是成员访问器/单例取用器/memset 类，
   其“quest 票”不代表业务归属。仅由它们构成的 quest 票不计入判据。
2. 判定优先级：① 字符串/硬结构（类名串、vtable 装载、存档原语、消息码）→ conf A；
   ② 非通用 callee 票同向 + tiers 同向，或明确结构模式（构造/析构、表索引、按键掩码）→ conf B；
   ③ 票分裂 / 票与 tiers 冲突 / 仅单票 / 无票无串 → conf C（label 取票或 tiers 中较可信者，并在 evidence 注明冲突）。
3. `0x6bfc`（全局单例内的按键/输入掩码）、`0x7f7fffff`（FLT_MAX 哨兵）、`ldr [vtbl,#...]` 虚调用槽、`0x3df2a8`
   类存档原语等立即数/偏移作为结构证据。
4. role：`leaf`=无调用；`thunk`=≤4 指令且无调用；`orchestrator`=callee ≥8；其余 `worker`。

## 汇总

**label 计数（120）** — 见文末终版统计。

**A/B/C 计数** — 见文末终版统计。

**最不确定的 5 个** — 见文末终版统计。

## 明细

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xe3750 | quest | worker | B | 连续 `mov r1,#8`…`#12; bl 0xe0b54` 按索引 8-12 读同一 this 的 5 个字段（批量记录装载）；vote quest:2 且 tiers=quest，无字符串 |
| 0x27697c | monster-em | orchestrator | B | `ldr r10,[r4,#0x13c8]; cmp #5; bhi` + 6 路跳转表按 0x13c8 成员分派（约 5KB 大结构体状态机）；19 callee 全在 0x26e/0x27b 簇；vote em:12 |
| 0x75c2b8 | quest | orchestrator | B | `bl 0x65cb3c(idx 6)` 取成员后 `mla r1,r2,r10,r1`（行×列）并读 `ldrb [r4,#261/#262]` 查二维表；8 callee 全 quest 簇（0x75cb60/0x25d6bc/0xe9e8c） |
| 0xa40b00 | ui | worker | A | 字符串 `cGUIInstMessage`（GUI 消息类名）；`cmp r2,#20` 后 21 路跳转表按消息 id 分派，`tst [r4,#380],#2048`；vote quest:4 render:3 与 tiers=quest 均与之冲突，取类名串 |
| 0xb81ddc | quest | worker | B | 对 `[r4,#172/#176/#180]` 逐个 `ldr r2,[vtbl,#72]; blx r2` 释放后清零，典型成员析构/清理；callee 0x887160/0x887660 属 0x887xxx 资源簇；vote quest:3 |
| 0x2a784c | monster-em | worker | C | callee 全在 0x27bcd0/0x27c7ec/0x285e2c/0x27e774 em 簇；vote em:13 对 otomo:12 近平而 tiers=otomo-ot 相反；strings(pause/body) 疑字符串池误配 |
| 0x4a0efc | monster-em | worker | C | `ldr r6,[=0x139ce68]; bl 0x7aa47c` 取单例后 `ldr r12,[vtbl,#32]; bx r12` 尾转发壳；vote 1:1 平，随 tiers=em |
| 0x3eed68 | quest | worker | B | `ldr r1,[global,#3112]; tst #0x10000000` 判全局标志位，循环 r7=0..14 用 `[global+r7*4+3468]` 与位掩码比对 15 个条目；vote quest:10 |
| 0x4693f4 | monster-em | orchestrator | B | VFP 块 + 成员 0x1010/0x1018 浮点运算后 `str [r4,#4076]`（4KB+ 大结构体上的姿态/变换计算）；16 callee 含 0x539f4c/0x47c66c/0x4a1b6c；vote em:14 |
| 0x6ee00c | otomo-ot | worker | C | 构造函数：`str r0(vtable+8),[r5,#96]!` + `add r0,r4,#60; bl 0x54ed74` 初始化成员 + `bl 0x13efdc4` 清零；vote quest:10 对 otomo:9 平，随 tiers=otomo-ot |
| 0xce9118 | render-gfx | worker | B | 两次 `bl 0xb15aa8` 取资源对象后 `ldr [r0,#4]; cmp #8` 判类型，再取 `[r6,#60]`/`[r7,#16]`；vote render:4 唯一（0xb15aa8/0xceb1b4/0x29d48/0x2332ac） |
| 0x4149cc | monster-em | worker | B | `bl 0x4a1b6c` 取基址后连读 `[r4,#0x15d8..0x1620]` 一串紧邻成员并传 `bl 0xc1708`；vote em:6，tiers=em |
| 0x278460 | online-nex | orchestrator | B | 两级全局表索引（单例 =0x15c08fc/0x15c0724 + `bl 0x3f8398` 计数器）→ `ldr r7,[r0,#28]`，id<0 时回退第三张表(=0x15c08c8)；vote online:5 领先 |
| 0xb140e0 | quest | orchestrator | B | 字符串 `mAutoDelete`/`mpArray`/`resource` = 自动删除指针数组容器（通用容器工具，非 quest 业务）；18 callee（0x7bb3ec/0x7b716c/0x7af9b0 容器簇）；vote quest:16 |
| 0xb27988 | save-io | worker | B | 栈上构造流对象(`mov r0,sp; bl 0xb219cc`)后 `mov r2,#64; blx [vtbl,#52]` 读 64 字节，`cmp r0,#64; strbne [sp,#37]` 置错误字节，`bl 0xb21a04` 析构；vote otomo:6 仅宿主模块 |
| 0x9ddc3c | quest | worker | B | `ldr r1,[vtbl,#112]; blx r1` 取描述符后 `ldr r2,[r4,#104]`，尾 `b 0x9f5104` 转发；vote quest:7，tiers=quest |
| 0x7b2dd4 | quest | leaf | C | `ldrb r3,[r3,r2]`（this 负偏移字节）后 `cmp #46; bhi` + 47 路跳转表大分派；无 bl、无 callee 记录、无字符串，仅 tiers=quest |
| 0x170adc | monster-em | orchestrator | B | 入参结构体 `[r5,#109]≤8` 判类型，再查 `[r5,#16]`/`[r5,#110]`、`cmp #3`（事件记录分派）；22 callee（0x2772c4/0x2a2e3c/0x1784d8 em 簇）；vote em:20 |
| 0x66b1d8 | quest | orchestrator | B | 按 r1(0/1/2) 状态分支，`bl 0x65cbe8` 置三个成员，读全局 `[..,#84]` 配置位后 `bl 0x66bd0c`；18 callee 0x66xxxx quest 簇；vote quest:15 |
| 0x66eff4 | quest | orchestrator | B | 虚调用 `[vtbl,#92]` 预判后取全局按键掩码 `[global+0x6bfc]` 与 r4 `ands` 返回 0/1（按键查询）；18 callee quest 簇；vote quest:13 |
| 0x7ed2b8 | physics-math | worker | C | 6 个 VFP 浮点成员(0..0x18)做差/乘，`movw/movt #0x7f7fffff`(FLT_MAX) 作哨兵（几何查询）；vote quest:4 全为通用 stub + online:2，tiers=quest 与几何语义不符 |
| 0x7ddfd0 | physics-math | worker | C | 同族：FLT_MAX 初始化 + 3 路 float 输入 + sp+108/+112/+188 三路输出指针（min/max 查询）；仅 3 callee(0x7d9734/0x809bc0/0x13efddc)；vote online:2 弱 |
| 0x85c908 | otomo-ot | orchestrator | C | `ldrb [r4,#24]` 非 0 时 `bl 0x13efe00` 并 `[r4,#28]++`；`ldrb [r4,#780]` 时 `bl 0x80ce88(this,r5+8)`；callee 列表与 0x856404 几乎相同；vote quest:14 对 otomo:10，tiers=otomo-ot |
| 0xb608b0 | audio | worker | C | `ldr r0,[r0,#100]` 偏移表 + `ldr r5,[r0,r1,lsl#2]` + 8 字节记录(`lsl#3`)与计数 `ldrh [r5,#4]` 的表驱动播放；quest:4 票全来自通用 stub，唯一非通用 callee 为 0x690(audio) |
| 0x2b1db0 | quest | leaf | C | `cmp r1,#51; bhi` + 52 路跳转表分派，函数体内无 bl；无字符串、无投票，仅凭 tiers=quest |
| 0xab9d64 | quest | worker | C | 8 字节记录(`[r1,#96]` 起) + 位域 `tst #251658240` + `mul`/`lsr #8` 步长运算，疑 blit/解码循环；vote em:1 与 tiers=quest 冲突，callee 仅 0x13efddc |
| 0x85e5c4 | quest | orchestrator | B | `movw r2,#0x401; str r0,[sp]; bl 0x824060` 以 0x401 消息码调分派器（同族后续函数按 0x401-0x406 跳表分派）；8 callee，vote quest:7 |
| 0x1f1f50 | otomo-ot | worker | C | 栈对象 `bl 0x9fba6c` 构造后写入 vtable 指针（全局 0x1649370，+8），再按字节从 r6 拼 4 字节串；vote em:2/quest:2 平，随 tiers=otomo-ot |
| 0x6eae68 | quest | orchestrator | B | 读按键掩码 `[global+0x6bfc]`，按 r2(0/8/9) 分派并 `tst r6,#4096/#8192/#16384` 测按键位；22 callee 0x6exxxx/0x65xxxx quest 簇；vote quest:20 |
| 0x190a64 | otomo-ot | worker | B | 全局 [0x16a8300]→+96 非 0 才继续，`bl 0x3f8a20`/`bl 0x3f8634` 查全局状态，再读 `[r4,#84]`；vote otomo:4 领先 em:2，tierb-labels 已判 otomo-ot |
