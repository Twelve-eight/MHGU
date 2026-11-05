# Tier B pass2 slice-04 裁定报告

来源：`.tmp/mhgu/tierB2/slice-04.txt`，120 个函数（按 insns 降序），范围 `0x6b3460..0x13b8d1c`。
本文件每 30 个函数落盘一次。

## 判定规则（全程一致）

1. **A** = 函数直接引用的字符串点名子系统实体（`mpBaseMap`/`rMovie`/`rFreeUseParam` 等类名或资源名），或反汇编里出现已知硬地址（0x3df2a8 存档原语、0x7aedcc 类注册）。
2. **B** = 票数有明确优势（最高票 ≥3 且 ≥2 倍次高票），或票数与反汇编结构同向。
3. **C** = 票数接近或全来自通用 stub，只能靠地址邻域 / 结构模式推断；或反汇编与票数冲突时以反汇编为准并降级为 C。
4. **通用 stub 名单**（横穿全库、不具子系统指向性，其票不计）：`0x7aa47c`（单例取用器）、`0x7aedcc`（类注册）、`0x7bb638`、`0x2b8f0`、`0x2b908`、`0x13efd70`、`0x13efd7c`、`0x13efd88`、`0x13efd94`、`0x13efda0`、`0x13efdac`、`0x13efdb8`、`0x13efdc4`、`0x13efdd0`、`0x13efddc`、`0x13efde8`、`0x13efdf4`、`0x13efe00`、`0x13efe0c`、`0x13efe30`、`0x13eff08`、`0x13eff80`、`0x13eff8c`、`0x13effb0`、`0x13efff8`、`0x13f004c`、`0x13f00d0`、`0x13f0118`、`0x13f0514`~`0x13f05a4` 系列、`0x13f614`、`0x887648`、`0x887660`、`0x8870b8`、`0x887100`、`0x887958`、`0x8879ac`、`0x8879b4`、`0x887a24`、`0x8878e4`、`0x8871d8`、`0x65cb3c`、`0x65cba0`、`0x65cbc4`、`0x65cbe8`、`0x65cc0c`、`0x65e5bc`、`0x65e794`、`0x65e874`、`0x65e938`、`0x65f118`、`0x65f270`、`0x54ecc0`、`0x54edec`、`0x54ee34`、`0x54ee98`、`0x54f260`、`0x54fd94`、`0x53aa70`、`0x53aa84`、`0x2332ac`、`0x3f8344`、`0x3f8534`、`0x3f856c`、`0x3f85fc`、`0x3f86b4`、`0x40b10`、`0x40b50`、`0x8a7b50`、`0x8a7dc4`、`0x7c6914`、`0x7af630`、`0x7af6e4`、`0x7af4d4`、`0x227a98`、`0x227ba8`、`0x276278`、`0x2ad190`、`0x690`、`0x72ea8`、`0x2b908`。
5. 区域先验（本切片内由票数与字符串反复验证）：`0x80-0x85`/`0xb0`/`0xc0-0xc6`/`0x94-0x9b` 混 render-gfx 与 quest；`0xa0-0xae`、`0x28-0x2f`、`0x44-0x4a`、`0x17` 偏 monster-em；`0x68-0x7a` 偏 quest/otomo-ot；`0x82xxxx` 一串 quest；`0x7c-0x7f` 偏 online-nex；`0xb9a/0xb16` 偏 render-gfx（字体/几何）。
6. `unknown` 只给「零字符串 + 非通用票 <2 + 无结构特征」的函数。

`role`：`leaf` 无 callee；`thunk` ≤4 指令且无 callee；`orchestrator` 有调用且 callee 去重后 ≥8；其余 `worker`。

## 汇总

<!-- SUMMARY-START -->
汇总在全部 120 个函数处理完后回填。
<!-- SUMMARY-END -->

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x98357c | render-gfx | worker | C | 析构器：`ldr r5,[r4,#72]`，经 0x7aa47c 单例取 vtable `[r1,#52]` 再 `blx r2` 销毁并 `str 0`；对 `[r4,#76]` 重复同套路。6 个 callee 中 3 个是 0xb08xxx 簇（render-gfx 区），但票 quest:4/render-gfx:3 接近，降 C |
| 0x696440 | quest | orchestrator | B | 构造函数：`bl 0x65c7e8`(基类 ctor) 后 `str` vtable（pc-rel `[0x69649c]=0x11aa4b4`+8）；成员 ctor `add r0,r4,#56; bl 0x54ed74`；立即数 `movt r1,#0x42f0`(120.0f) 存 `[r4,#96]`、`movt r1,#0x4040`(3.0f) 存 `[r4,#100]`、`strb r1,[r4,#94]=1`。quest:16 vs otomo:7 |
| 0xb28b40 | quest | orchestrator | B | 逐字段初始化：`strb r2,[r0,#8]`、`str r2,[r0,#16]`、`str r2,[r0,#4]`；`movw r2,#0x41d0; ldr r2,[r3,r2]` 读源结构大偏移；`tst r5,#4` / `tst r5,#8` 按 flag 决定两路。quest:12 vs monster-em:3 |
| 0x11e66a0 | monster-em | orchestrator | B | 虚调用取状态 `ldr r1,[r0,#772]; blx r1`，`sub r0,#1; cmp #6` 后 7 路跳转表；分支体 `mov r1,#27; bl 0x2828cc`（0x28xxxx = monster-em 主体）。monster-em:14 |
| 0x714e34 | quest | worker | C | 二级派发：`if [r4,#60]==1` 用 `[r4,#112]` 索引单例 `[0x715e4c]=0x112bdd8` 取表项，再 `sub r0,#2; cmp #4` 5 路跳转；callee 全在 0x14xxxx（0x147e10/0x148880/0x142b5c）。quest:4/otomo:2 无压倒性 |
| 0x9b7d8c | quest | worker | C | 块首是 `bx lr` 与 `b 0x9b8ef8` 尾跳，其后是标准析构：`bl 0x9b90f8` + 单例 `[0x9b7dc0]=0xe8ad3c` 取 vtable `[r1,#52]`。0x9bxxxx 区（0x9bf9f8 quest:14）同向，但函数体本身无字符串 |
| 0x4632ec | monster-em | worker | B | 转发 thunk：`bl 0x7aa47c` 取单例后 `ldr r12,[r1,#32]`（vtable+0x20）、`pop {r4,r5,r6,lr}; bx r12`，把 (r5,r4) 两参转给虚函数。monster-em:27 压倒性 |
| 0xb42788 | render-gfx | worker | B | VFP 几何：`add r2,r6,#56; ldm/stm r2 {r0,r1,r2}` 取三元组，`add r0,r1,r0; adds r5,r2,r0` 求分量和，随后 `ldrb r1,[r9,#24]` 与 `ldr r0,[r9,#8]` 做空判；后段调 0xb0b26c/0xb0b2a8/0xb0b358/0xb0b360（0xb0b 簇）。render-gfx:5 |
| 0x781e60 | otomo-ot | orchestrator | B | 状态机派发：`add r5,r4,#60; bl 0x782e70`（返回非 0 即退），`ldrb r0,[r5,#0]; cmp #16` 后 17 路跳转表；callee 含 0x7838c0/0x784288/0x78450c/0x784630/0x784734 同族。otomo-ot:24 vs quest:21 |
| 0xb4ce54 | quest | orchestrator | B | 取 `[r10,#132]` 子对象后两次虚调 `ldr r2,[r1,#12] ... blx r2`，再 `ldr r0,[pc,#2168]=0xa03eca` 拼字符串指针调 0x827c9c；callee 为 0x827c9c/0x82fb08/0x831c14/0x82fb10（0x82xxxx quest 串，见 tierB-slice-05 对 0x324aa8 的结论）。quest:11 |
| 0xc606b0 | render-gfx | orchestrator | B | 构造：`bl 0x887958`(基类) → `str` vtable `[0xc60854]=0xbe50d4`+8；`str r5`(0) 清 `[r4,#140/156/172/188/220]`，`strb r5/r6` 交错写 `[r4,#48..#55]`(0,1,0,0,0,1,0,0)，`str r5,[r4,#56]`。callee 含 0xc616bc/0xc067ec/0x9bd6b4 等。render-gfx:7 |
| 0xcc6964 | unknown | worker | C | 静态初始化遍历器：pc-rel 取 `[0xcc69b8]=0x146259c`，若 `[r0,#4]!=0` 且 `[r0,#0]^1 & 1 == 0`，则循环 `i<[r5,#4]` 逐个 `blx [r5+i*4+8]`。三个 callee（0x13efd7c/0x13effb0/0x7aa47c）全通用，quest:3 无指向性 |
| 0x11e22d8 | monster-em | orchestrator | B | `movw r1,#0x334f; ldrb r1,[r0,r1]` 读大偏移状态位，`add r2,r1,#1; cmp #7/8` 环形计数后 `strb r2,[r0,#0]`；另一入口按 `r3∈{145,146,147,268}` 返回 1。callee 全在 0x28-0x2f（monster-em 主体）。monster-em:9 vs otomo:3 |
| 0x42e8f0 | monster-em | orchestrator | B | 尾调 ctor/dtor：`ldr r1,[pc,#12]; ldr r1,[pc,r1]; add r1,#8; str r1,[r0,#0]` 装 vtable 后 `b 0x43b488`；后随版本 `bl 0x43b488` 再单例 `[r2,#52]` 销毁。callee 含 0x4a1c78/0x4a1d34/0x4a2304/0x43b7e0。monster-em:24 |
| 0x785c5c | otomo-ot | orchestrator | B | `ldr r0,[r8,#4]` 后 `cmp r1,#21` 22 路跳转表（表项 0x58/0xd0/0x1b0/.../0xad8，多个分支共用一个 default）；callee 含 0x3b9868/0x3b9ff8/0x3ba100/0x3ba50c/0x3c0208/0x3c06f8/0x3bf84c/0x3c0454 同族，另有存档侧 0x3dfa2c。otomo-ot:17 vs quest:12 |
| 0x75e89c | quest | orchestrator | B | 三参 clamp 到 99（`cmp r8,#99; movcs r8,#99` ×3），`bl 0x65cba0` 建对象，再 `bl 0x5d0d7c(obj,2,r8)` / `(obj,1,r6)` 两路写入。callee 含 0x5fabd4/0x5fb648/0x70e880/0x76006c/0x7612a4/0x761618/0x76195c。quest:27 |
| 0x52e9f8 | unknown | thunk | C | 首指令即 `b 0x2b908`（通用基类析构），4 条指令内无其它调用；紧随的 0x52e9fc 是标准 dtor+单例 `[r2,#52]`。三个 callee（0x2b908/0x7aa47c/0x7bb638）全通用，quest:3 无指向性 |
| 0x7fda44 | quest | worker | C | VFP 帧 40 字节，`ldr r0,[r5,#0]; sub r0,#1; cmp #3` 4 路跳转表（表项 0xf68/0x20/0x784/0xbc8）——按枚举值分类处理；callee 0x7febf4/0x7fea18 为 0x7f 邻域。quest:2/monster-em:1 皆弱 |
| 0xae42c | monster-em | orchestrator | B | `movw r0,#0x1428; ldr r0,[r6,r0]` 与 `movw r1,#0x61a0; ldrb r1,[r6,r1]` 读实体状态块，`ldrsh r0,[r0,#1]; cmps r0,r7(-1)` 判有效，`bl 0x81c6c`；callee 含 0xa4158/0xa4274/0xa45d4/0xa62d4/0xaf3f8。monster-em:26 |
| 0xb4a3d4 | render-gfx | worker | B | **字符串 `rMovie` / `mem.mp4` / `mem.webm` / `webm`** = 影片资源类；反汇编为引用计数串释放（`ldrne r2,[pc,#172]; addne r1,r0,#8` 比对静态空串哨兵后循环 `sub r2,r1,#1` 递减）。票 quest:6 来自通用 0x13efd88/0x13efd94，取字符串 |
| 0x94b3dc | render-gfx | worker | A | **字符串 `mpBaseMap` / `mpMontage` / `resource`** = 地图/拼图资源类；vtable `[0x94b424]=0xef7190`+8，`movw r0,#0x13d0; ldr r0,[r5,r0]` 取资源指针后 `bl 0x887660` 释放并清零，尾跳 0x93992c |
| 0x11a857c | monster-em | worker | B | 三字节紧凑编码：`ldrb r0,[r1,r0(#0x274a)]`、`ldrb r3,[r2,#-1]`、`ldrb r5,[r2,#2]`，`orr r3,r3,r0,lsl#8`、`orr r3,r3,r5,lsl#16`、`orr r3,r3,#64` 后回写 `[r2,#0]`；随后 `ldr r0,[r1,#-0xd8ba]`。callee 全 0x28-0x30。monster-em:8 |
| 0x68fdb0 | otomo-ot | orchestrator | B | `ldr r0,[r9,#4]` 后 `cmp r1,#20` 21 路跳转表（表项 0x188/0x1e8/0x27c/0x328/0x3bc/0x480/0x544/0x640/0xb94/...）；callee 含 0x6bb820/0x693f84/0x694d58/0x694f20/0x3e7f4c/0x3e6434。otomo-ot:17 vs quest:3 |
| 0x85d3bc | quest | orchestrator | B | 拷贝构造：`str r1,[r4,#0]`(vtable `[0x85d55c]=0xfe3e30`+8)、`str r0,[r4,#44]`(sing+100)；`bl 0x85eff4`；`ldrb r0,[r4,#24]` 为真时 `bl 0x13efe00`(引用计数加) 并 `[r4,#28]++`；再虚调 `[r0,#56]`。callee 含 0x85f128/0x85f3f8/0x85f368/0x85f290/0x85f588/0x85f494。quest:11 vs online-nex:7 |
| 0x13b4cc8 | quest | orchestrator | B | `bl 0x7c0b80` 后 `bl 0x7bb638` 取缓冲区，装 vtable（pc-rel `[0x13b4e54]=0x1da9ec`），`movw r1,#0x14; movt r1,#0x2000; ldm/stm r0 {r1,r11}` 写标志+入参，`add r12,r0,#24` 挂到栈上临时对象。callee 含 0x7cf4a4/0x7d0e8c/0x7d1efc/0x7d6324/0x7d9734/0x7cdbf8。quest:11 |
| 0x7dd02c | render-gfx | worker | C | 打包颜色 lerp：`movw r8,#0xffff; movt r8,#0x7f7f7f7f` 饱和掩码，连续 `ed96aa00/ed969a01/ed951a01/ed950a00/ed968a02/ed952a02` 载 6 个 VFP 分量再做插值，`str r8,[sp,#256]`。票 online-nex:3 vs quest:2 不构成优势，按反汇编取 render-gfx |
| 0x73d190 | quest | orchestrator | B | `ldr r0,[pc,#3908]; ldr r0,[pc,r0]; ldr r1,[r0,#0]` 取全局，`movw r0,#0x6bf4; ldr r9,[r1,r0]` 与 `movw r3,#0x6bfc; ldr r7,[r1,r3]`；`cmp r2,#5` 6 路跳转表。callee 含 0x73f5fc/0x73fe44/0x73cf58/0x740144/0x740270/0x740688/0x740864。quest:29 |
| 0x1b3d18 | quest | orchestrator | B | 组包：`add r0,sp; bl 0x1bb9fc` 初始化栈结构，`str [r4,#28]→[sp,#4]`，`add r0,r4,r5,lsl#2; ldr r0,[r0,#272]` 取槽位指针存 `[sp,#8]`，再按 `r5*16` 取 `[+133/+135/+136]` 三字节存 `[sp,#12..20]`，`ldrh r0,[r4,#52]; ldrb r1,[r4,#49]; ldrb r2,[r4,#50]; mla` 算索引。quest:35 |
| 0x2a07a8 | otomo-ot | worker | B | `bl 0x27bcd0` 判 `==1`，`bl 0x53a058` 比对 id 与 r5，`movw r0,#0x27b4; add r0,r6,r0; vldr ... vcmp ... vmrs` 比浮点阈值（`bgt` 退出），再 `movw r0,#0x14a0; ldr r8,[r6,r0]`。otomo-ot:5 vs monster-em:3 |
| 0x7a85ac | quest | worker | B | 全局单例 `[0x7a93d4]=0x10907c0` → `bl 0x524cc8` 判空/失败即退；参数范围 `sub r2,r7,#1; cmp r2,#62` 后按 r2*4 查表（`[0x7a93d8]=0x10909b0`，`movw r1,#0x3e2` 尺寸校验）。quest:5 vs otomo:1 |
<!-- APPEND-1 -->
