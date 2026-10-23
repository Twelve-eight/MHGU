# Tier B pass2 — slice-02 裁定

输入：`.tmp/mhgu/tierB2/slice-02.txt`（120 函数，按文件顺序）。汇总见文末 `## 汇总`（追加式写入，故置于末尾）。

判据：conf `A`=字符串/反汇编硬证据（类名字串、文件名字串、类注册 0x7aedcc、存档原语 0x3df2a8 等）；`B`=votes 主导（top ≥ 1.6×次席）或明确结构模式；`C`=votes 分票（次席 ≥ 0.6×top）或无线索。

## 表（1-30）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xc26af0 | render-gfx | orchestrator | B | votes render-gfx:21 vs quest:12；无字符串；调 0xc178c0/0xc1c2e0/0xb79968 等渲染簇；函数体 VFP 栈帧 168+1024 字节，读 [r9,#240] 与 [r0,#24]/[r0,#20] 结构体 |
| 0x43bf1c | monster-em | orchestrator | B | votes monster-em:34；callees 含 0x7aedcc 类注册与 0x7aa47c 单例取用；入口把 r5 指向的 3 个 dword 拷到 [sp,#16..24]，再按 r4<=3、r7==1 分派 |
| 0x4eb540 | quest | orchestrator | C | votes quest:21 vs monster-em:19（分票）；反汇编为状态机：ldrb [r4,#232] 0/1 分支，36 字节步长数组初始化 strb [r7,#236..238]、str [r7,#252] |
| 0x26639c | monster-em | orchestrator | B | votes monster-em:10 vs render-gfx:5；反汇编拷贝 0x2506/0x2508/0x250a/0x250c/0x2526/0x2528 偏移字段（对象状态复制），ldrh [r2,#177]→[r0,#179] |
| 0xa15164 | quest | orchestrator | B | votes quest:7 vs monster-em:1/online-nex:1；bl 0xc8d164 取表，add r0,r0,r8,lsl#4 → ldr [r0,#8]/[r0,#4]，ldr [r4,#508] 再 ldr [r0,#72] 索引，ldrh [r0,#48] 与 ldrb [r1,#4] 比较 |
| 0x39e1a0 | otomo-ot | orchestrator | B | votes otomo-ot:23 vs quest:11；析构模式：依次检查 ldrh [r4,#14]/[#16]/[#18]/[#20]，非 0 时取全局 0x149abb8/0x149ab9c/0x149ab80 并 bl 0x153370（资源句柄释放） |
| 0x11d0688 | monster-em | orchestrator | C | votes monster-em:22 vs render-gfx:15（分票）；入口按 r1==0/1/2 三路分派，写 [r4,#4] 状态字，bl 0x282fd8/0x27bcd0（0x27-0x28 系通用对象基类） |
| 0x3b0c | monster-em | orchestrator | C | votes monster-em:8 vs quest:5（分票）；bl 0x7aedcc（类注册）+ bl 0x7aa47c，向 0x1847e60 静态区写 [r5,#48..#76] 与 strd [r5,#0]（静态表初始化） |
| 0x68584c | otomo-ot | orchestrator | C | votes otomo-ot:18 vs quest:15（分票）；取全局 0x11b3ab4 后按 0x6bfc/0x6c34/0x6bf4 偏移取 [r0,r1] 三个指针，bl 0x276790（单例字段访问） |
| 0xb9a894 | render-gfx | orchestrator | B | votes render-gfx:9 vs quest:3；全局 0xca22f4 的 ldrb [r0,#272] 开关，cmp r1,#0 后 ldr [r9,#248] 判空，[r11,#8]/[r11,#12] 参数，VFP 栈帧 48 字节 |
| 0xb562f4 | quest | orchestrator | B | votes quest:22 vs audio:9；析构形态：str vtable(0xcee070+8) 到 [r10,#0]，对 [r10,#120] 取 vtable+4 后 blx，遍历 [r10,#132]/[r10,#128]/[r10,#140] |
| 0xb39a70 | quest | orchestrator | B | votes quest:15；字符串 "1.2.1"（版本号）；析构形态：vtable 0xd0a5bc+8 → [r4,#0]，循环 [r4,#100] 数组按 [r4,#104] 计数 bl 0x887660 释放并清零 |
| 0x29cec4 | monster-em | orchestrator | B | votes monster-em:18 vs otomo-ot:4；构造函数形态：bl 0x53aa70/0x53aa84 逐成员构造，基址偏移 0x2534/0x14ac/0x27ac/0x27b0（大对象成员表） |
| 0x2fafc4 | monster-em | orchestrator | B | votes monster-em:29；取全局 0x153dda0 后 bl 0x276278；ldrh [r4,#176] 与常量 0x173/0x5e/25 比较分类（行为/状态 id 判定） |
| 0x7afafc | quest | orchestrator | B | votes quest:18；入口 tst [r4,#4],#8388608 与 [r4,#28]/[r4,#32] 判空，xor 低 16 位后 ldrb 查表（0x7axxxx 类注册域内的资源/记录匹配） |
| 0x9ef288 | filesystem | orchestrator | A | 字符串 "mpResource" 与 "resource"；反汇编 str vtable 到 [r4,#0] 与 [r4,#48]（多重继承），bl 0x9f4e20 构造基类，随后写 [r4,#0] 新 vtable（资源管理类） |
| 0x69eb18 | save-data | orchestrator | A | 字符串 "areaseldat"（area select 数据文件名）；反汇编为记录查找：循环 [r0,#116] 数组 [lr,r3,lsl#2]，ldrsb [r0,#4]/[r0,#5] 与入参 r1/r2 比较 |
| 0x513260 | quest | orchestrator | B | votes quest:12 vs monster-em:4；入口 bl 0x515a54 后 ldrb [r9,#388] 且 cmp #10 走 11 项跳转表（0x51328c 起 .word 偏移），bl 0x515a54/0x9c3834/0xc46cfc |
| 0x134a614 | online-nex | orchestrator | B | votes online-nex:34（唯一票源）；0x13xxxxx 高地址层；bl 0x12297a4 分配 12 字节节点并挂到 [r6,#148] 链表（str [r0,#8], str [r7,#4], str [r0,#0], str [r0,#4]），计数 [r7,#8]++ |
| 0x121dd8c | filesystem | worker | A | 字符串 "invalid stored block lengths"/"unknown header flags set"/"unknown compression method"/"too many length or distance symbols" → zlib inflate 状态机；callees 6 个（inflate 辅助），非 orchestrator |
| 0x2e2c64 | monster-em | orchestrator | C | votes monster-em:13 vs render-gfx:11（分票）；字符串 "way_move_rno1"/"ohol"/"eajiBase"/"ucRate[4]"（动作/参数名）；入口按 r1 0/1 分派，间接 blx [r0,#608]，bl 0x2ffea8 |
| 0x5b1be8 | ui | orchestrator | A | 字符串 "cUIOHunterNoteLow"（UI 对象类名，cUIO 前缀）；反汇编 bl 0x56dc88 后取 [r4,#76] 判空，再 ldr [r1,#60] 尾调用 bx r2（UI 对象基类调用） |
| 0x4e4224 | otomo-ot | orchestrator | B | votes otomo-ot:11 vs monster-em:3；初始化 [r8+0x1b95..0x1b9f] 一片字节（strb r5=0 / strb #255），movw r4,#0x1b1c（大对象字段清零） |
| 0xc01cf8 | quest | orchestrator | B | votes quest:23 vs monster-em:10；VFP 数学（vcmp/vdiv 0x13f00d0），取全局 0xc3ae70 后 ldr [r0,#32]，movw #0xed7c 字段偏移 |
| 0x225e58 | monster-em | orchestrator | C | votes monster-em:21 vs quest:14/otomo-ot:13（三方分票）；析构形态：vtable 0x1615f2c+8，循环 r5=248..363 对 [r4,r5,lsl#2] 取 vtable+4 后 blx 并置 0，再清全局 0x1612ecc |
| 0xb8c54 | monster-em | orchestrator | B | votes monster-em:35；入口 movw #0x1428 取 [r4,r0] 字段后 strb #1 到 [r0,#420]，movw #0x1404/0x1408 取字样并 and #0x68828，写 [r2,#0] |
| 0xa2eeac | quest | orchestrator | B | votes quest:8（唯一票源）；callees 全为 0xa3xxxx 簇（0xa327d4/0xa3318c/0xa32cb0/0xa32a3c）8 个；入口 ldr [r1,#4]，sub #2 后 cmp #19 走 20 项跳转表 |
| 0x419e50 | monster-em | orchestrator | B | votes monster-em:28；入口为尾跳 `b 0x43b488`（thunk 形态），主体 bl 0x43b4bc 后取全局 0x1423198 + bl 0x7aa47c 单例，再 ldr [r1,#52] 尾调用 |
| 0x6f31d8 | quest | orchestrator | B | votes quest:40 唯一主导；入口 bl 0x6f9a04，movw #0x320c 写 [r4,r1]=0，movw+movt #0xffffcdf8 取字段后 cmp #17 走 18 项跳转表 |
| 0x440b9c | monster-em | orchestrator | B | votes monster-em:25；入口 tst [r4,#4],#255 提前返回，bl 0x4a1b50 后 sub #12 且 cmp #14 分派，bl 0x4a3060/0x4a2744（0x4axxxx 事件/行为簇） |

## 表（31-60）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x76a6b4 | quest | orchestrator | B | votes quest:41 vs otomo-ot:6；入口 ldr [r11,#4] 后 cmp #12 走 13 项跳转表（0x76a6e8 起 .word 偏移），[r11] 为对象基址 |
| 0x74fa74 | quest | orchestrator | B | votes quest:43 vs otomo-ot:5；ldr [r9,#76] 且 cmp #13 走跳转表；取全局 0x10e9878 后按 0x6bfc/0x6c34 偏移读单例字段 |
| 0x61b0e0 | quest | orchestrator | C | votes quest:18 vs otomo-ot:18（完全平票）；bl 0x548204([r4,#36],4,...) 取 id，循环 bl 0x5483c0 并写 [r4,#128]，全局 0x1223f64 比较 |
| 0x668da8 | quest | orchestrator | B | votes quest:30 vs otomo-ot:15；入口读 [r4,#141]/[#144]/[#142]/[#114]/[#116] 并 mla/mul 计算多维索引（表内定位），取 [r4,#190] 等 |
| 0x4e666c | otomo-ot | orchestrator | B | votes otomo-ot:11 vs quest:2；bl 0x507b04(全局 0x1352930,1,...) 取状态，cmp r5,#2 后读 [r0,#0x1c0a] 且 cmp #5，再 sub #1/cmp #13 走跳转表 |
| 0x11f4220 | render-gfx | orchestrator | C | votes render-gfx:20 vs monster-em:19（分票）；movw #0x3330 ldrb tst #16 判标志，反复 bl 0x2828cc(r0,100/47/46/45/...) 后 rsb/sub 累减 —— 字符码遍历计数模式 |
| 0x74a3a8 | quest | orchestrator | B | votes quest:42 vs otomo-ot:6；ldr [r4,#76] cmp #9 走 10 项跳转表，同时取全局 0x10eef44 的 0x6bfc/0x6c34 字段并 orr（与 0x74fa74 同族） |
| 0xce1ba4 | filesystem | orchestrator | A | 字符串 "spkg"（MH 包文件名/后缀）；反汇编为哈希表查找：ldrd r4,[r1,#0] 与 (r2,r3) 做 eor 比较，命中后 ldr [r1,#8] 继续链，表基 [r1,#144]/[r12,#40]/[r12,#36]；votes quest:19 与之矛盾但串证据更强 |
| 0x46d810 | monster-em | orchestrator | B | votes monster-em:32；bl 0x4a1b6c 后连续 bl 0x4a30dc(r4,4,-1)/0x4a30dc(r4,5,-1)/0x4a30dc(r4,0,-1) 按 slot 取值，栈帧 352 字节 |
| 0x511784 | quest | orchestrator | B | votes quest:19；析构形态：vtable 0x132d384+8 → [r4,#0]，释放 [r4,#56]（bl 0x326c78），循环 [r4,#324] 计数与 [r4,#336] 指针数组逐项 blx |
| 0x1218db8 | monster-em | orchestrator | B | votes monster-em:9（唯一票源）；ldr [r0,#772] 后 blx 取类型，sub #14 且 cmp #40 走 41 项跳转表（类型分派） |
| 0x518c40 | quest | orchestrator | C | votes quest:6 vs render-gfx:2/monster-em:2（分票）；bl 0x152960(...,0x1a2,13, 0xc73f 或 tst#1 时 0xc8ab, [r0,#72]/[r0,#73]) 形如字符串/表项拼装 |
| 0x2f919c | monster-em | orchestrator | C | votes monster-em:6 与 otomo-ot:6 平票；读 [r4+0x1068] bit3，blx [r0,#636]/[r0,#632] 两次虚调用后拼 0x1060/0x1054 字段（对象状态查询） |
| 0x86c948 | render-gfx | orchestrator | B | votes render-gfx:8 vs monster-em:1；blx [r0,#52] 虚调用判非 0，浮点常量（0xfcd17c/0xfcd228 全局 + VFP 栈帧 248），r5+145 偏移 |
| 0xa02230 | quest | orchestrator | B | votes quest:19；ldrb [r4,#457] tst #1 判开关，取 [r4,#260] 作索引，blx [r0,#36]（i）与（i+1）两次取值比较 —— 邻接/序列项配对 |
| 0x11b7af4 | monster-em | orchestrator | B | votes monster-em:11 vs otomo-ot:2；写常量 1065353216(1.0f) 到 [sp,#28]，构造 [sp,#16]/[sp,#14] 与 [sp,#124]/[sp,#120]/[sp,#116] 参数（向量/矩阵入参） |
| 0x77e4a4 | quest | orchestrator | B | votes quest:31 vs otomo-ot:14；movw #0x13c8 + bl 0x13efd7c(,56) 清 56 字节子对象，再两次 bl 0x3be79c 取全局单例并把结果写 [r4,#0x13e0]/[r4,#0x13e4] |
| 0x469c88 | monster-em | orchestrator | B | votes monster-em:27；入口取全局 0x13d38d0 → bl 0x7aa47c 单例 → ldr [r0,#0] + ldr [r6,#28] + ldr [r12,#32] 后尾调用（singleton 转发） |
| 0x6f0f84 | quest | orchestrator | B | votes quest:36 vs otomo-ot:9；连续 bl 0x65ca84(r4,idx,全局表项,0,...) 按 idx=0,1,2 注册表项（全局 0x114e688/0x114e670/0x114e53c） |
| 0x697478 | render-gfx | orchestrator | C | votes render-gfx:3 与 quest:3 平票；VFP 向量运算（vldr/vadd/vcmp 0x13efd70），全局 0x11a1dc4 + ldr [r0,#84] 判空后处理，mov #432 偏移 |
| 0xafe8c0 | quest | worker | C | votes quest:3（仅 3 票）；4 个 callee；浮点分支 ldrb [r10,#0] cmp #2，浮点常量全局 0xc928b8，VFP 比较后条件选择 |
| 0xa0c834 | quest | orchestrator | B | votes quest:7；与 0xa15164 同族（bl 0xc8d164，add ...,r6,lsl#4，ldr [r4,#508]，ldr [r0,#72]，ldrh [r0,#48]）；入口 r5-1 与 r6 比较走早退 |
| 0x11bc4e0 | render-gfx | orchestrator | C | votes render-gfx:14 vs monster-em:9（分票）；按 r1==0/2 分派，写 [r4,#4] 状态，blx [r0,#1132] 虚调用，bl 0x282fd8(r4,0,1,0) 后取 pc 相对常量 0x66d464 |
| 0x11c1048 | monster-em | orchestrator | C | votes monster-em:20 vs render-gfx:17（分票）；清 5 个栈槽后从全局 0x678180 拷贝 3 个 dword 到 [sp,#64..72]，写常量 0xc7c35000 到 [sp,#52] |
| 0xcf52f8 | monster-em | orchestrator | B | votes monster-em:36；movw #0xb5f4 读 [r7+r0] 与 [r8,#1]，r1-1 后 cmp #1 且 r0==2 才继续，bl 0x9d428(r4,6)，取 [r4+0x75f0]→[r0,#100] 的 [r0,#1]/[r0,#2] |
| 0x7393b4 | quest | orchestrator | B | votes quest:47；取全局 0x1101490 → bl 0x1c9604/0x1c95f0 两个单例，判非空后 ldr [r6,#12]，再 bl 0x1c9378 + bl 0x1bafb4(栈缓冲) |
| 0x119ae1c | render-gfx | orchestrator | C | votes render-gfx:12 vs monster-em:11（分票）；按 r1==0/1/2 三路分派（与 0x11d0688/0x11bc4e0 同一状态机模板），bl 0x282fd8 |
| 0x6f5940 | quest | orchestrator | B | votes quest:36 vs otomo-ot:7；mov r1,#-1 后 cmp #22 走 23 项跳转表（大量表项指向同一 0xdb4 偏移），状态机 |
| 0x11e0584 | monster-em | orchestrator | C | votes monster-em:14 vs quest:10（分票）；ldrh [r4,#176] 与 #1 比较，sub #276 后 cmp #16（id 区间判定），bl 0x53a058 得类型后与 0x144a/0x144c 比较 |
| 0x396e40 | quest | orchestrator | A | 字符串 "cSupplyList"（支给品列表类名）；反汇编为序列化写出：blx [r0,#8] 写入 ldrh [r5,#4]，ldrb [r5,#84] 逐字节 strb [r1,r0] 并按 [r4,#12]/[r4,#16] 递增判满 |

## 表（61-92）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xc61bb4 | render-gfx | worker | A | 字符串 "mpEffectList"（特效列表成员名）与 "resource"；反汇编 5 个 callee，add r12,r1,#176 后连续 vldr 6 个浮点（[r1,#0x30..0x34]）做 vsub/vmul，cmp r2,#0 分支 |
| 0x1169a7c | monster-em | orchestrator | C | votes monster-em:10 vs render-gfx:9（分票）；ldrh [r4,#176] 且 cmp #68 走 69 项跳转表（id 分派），bl 0x2a8d10/0x29b12c/0x2ad23c |
| 0xc1d5f0 | render-gfx | orchestrator | B | votes render-gfx:7 vs monster-em:2；ldr [r5,#52] 判空 + [r5,#8] 作索引，全局 0xc1bce0 → [r2,#200] 表项 → ldr [r1,#84]；栈帧 248，[r11,#8] 输出槽清零 |
| 0x6ffd40 | quest | orchestrator | B | votes quest:27 vs otomo-ot:4；入口批量清零 strb [r5,#75]/strh [r5,#100] 与 0x2d66/0x2d7e/0x2d96/0x2dae...（步长 0x18）多组状态字段 |
| 0x90c508 | render-gfx | orchestrator | A | 字符串 "mpGrass" 与 "resource"（草地资源成员）；反汇编以 1664 字节步长循环 24 次（cmp #39936）调 0xb437b4 并清 [r7,#1664]/[#1668]，再对 0x9590/0x8f10/0x8890/0x8210 子对象调 0xb43f68 |
| 0x9ef3c | monster-em | orchestrator | B | votes monster-em:29；movw #0x1428 取 [r7,r0] 后 +0x5dfc 做 VFP 比较，ldrb [r0,#1352] 与 r9 乘加，读 [r5,#0] 判 255 哨兵 |
| 0x53fe8c | quest | orchestrator | B | votes quest:24 vs render-gfx:7；bl 0x55dd40 取全局 0x12f8d34 子系统，ldrb [r4,#59] cmp #12 走 13 项跳转表；栈帧 540 |
| 0x69c258 | quest | orchestrator | B | 字符串 "areaacttbl"/"rAreaActTblData"（area action 表资源名）；反汇编 ldr [r2,#104] 校验索引 < 计数，[r2,#116] 取表项后 blx [r0,#20]，与全局 0x11a4710 的 [r1,#4] 比较；votes audio:6/quest:5 分票，取 quest |
| 0x1215568 | monster-em | orchestrator | C | votes monster-em:17 vs render-gfx:15（分票）；浮点常量 0x42700000(60.0f)/0x428c0000(70.0f)，尾调 b 0x2a8384；主体 blx [r0,#772] 后 cmp #24/#23 分派 |
| 0x104978 | save-io | worker | C | votes otomo-ot:1（弱）；唯一 callee 0x8261fc；反汇编为流反序列化：blx [r0,#12] 读 4 字节存 [r4,#4]，再取 [r5,#8]+[r5,#12] 读 1 字节存 [r4,#8]（缓冲区对象 vtable/pos/len 布局） |
| 0x10c588 | save-io | worker | C | votes otomo-ot:1（弱）；唯一 callee 0x8261fc；与 0x104978 指令序列完全一致（同一模板的另一实例）：读 dword→[r4,#4]、读 byte→[r4,#8] |
| 0x458398 | monster-em | orchestrator | B | votes monster-em:18 vs quest:2；写入器/设置器：strb #1 → [r0,#0x16a0]，str [r1,#0] → [r0,#0x16a4]；随后静态表初始化（[r5,#48] 起连续 str） |
| 0x9c20f4 | filesystem | orchestrator | A | 字符串 "Resource(rCollision)" 与 "resource"（资源调试名）；析构：vtable 0xe80c1c+8 → [r4,#0]，按 ldrb [r4,#176] 条件 bl 0xc482a0(,ldr [r4,#56]) 释放资源句柄并写 -1，再 bl 0x887660 释放 [r4,#52] |
| 0xc3d3d0 | render-gfx | orchestrator | B | votes render-gfx:14 vs quest:6；bl 0xc16100 后 ldm r3 传参，bl 0xc25414 构造 3 个 dword，栈帧 736，[sp,#196]=7；callees 含 0xc1bf24/0xc1ef38（0xc1 渲染簇） |
| 0x13c5ce0 | kernel-os | worker | A | 字符串 "0123456789abcdefghijklmnopqrstuvwxyz"/"(nil)"/".%ld" 及 `cmp r1,#0x25('%')` 分支 → libc 风格格式串解析（printf 核心）；6 个 callee（数字转换/输出） |
| 0xb05080 | render-gfx | worker | A | 字符串 "LightMask"/"AmbientMask"/"GBuffer"/"LightAccumulation0"（渲染目标名）；vtable 0xd3eb04+8 → [r11,#0]，清 [r11,#744]/[r11,#644]，bl 0x13efd7c(,600) 清 600 字节 |
| 0x423954 | monster-em | orchestrator | B | votes monster-em:21 vs quest:3；静态 vtable 0x141976c+8 → [r2,#0x162c]，若 [r2,#0] 非空则 bl 0x7aa47c 单例并 blx [r1,#52]，尾部 b 0x43b488 |
| 0x68b5c4 | quest | orchestrator | B | votes quest:29 vs otomo-ot:8；入口 ldr [r11,#4] 后 cmp #13 走 14 项跳转表（状态机），常量 0xff00ff 作掩码 |
| 0x55515c | quest | worker | C | votes quest:2（弱）；2 个 callee；全局表 0x10d8460 按 r0 取 id，sub #38 且 cmp #82 走 83 项跳转表（大 switch 但无子系统线索） |
| 0x8c51a0 | unknown | worker | C | votes monster-em:2/quest:2/render-gfx:1 三方平票；ldr [r5,#4] sub #1 且 cmp #22 走 23 项跳转表（消息 id 分派），5 个 callee 无特征 |
| 0x3e4d4c | otomo-ot | orchestrator | B | votes otomo-ot:20 vs quest:2；[r4,#40] 惰性构造：取全局 0x14546d8 → [r0,#124]，blx [r7](r6, 0x4eb898, 16) 分配 16 字节子对象 |
| 0x6b9168 | otomo-ot | orchestrator | B | votes otomo-ot:21 vs quest:4；连续 bl 0x56e6a8(r4, idx, 3, 5, 17) 且 idx 0,1,5...（参数行注册，常量 3/5/17 为表列值） |
| 0x8a0a7c | online-nex | worker | B | votes online-nex:5 vs render-gfx:2；movt #0x7f7f + movw #0xffff → 0x7f7fffff(FLT_MAX) 写入 [sp,#288]，ldr [r5,#96]/[r5,#88] 取表与对象，栈帧 312；callees 全为 0x7d12xx/0x7cfxxx |
| 0x9cde9c | online-nex | worker | B | votes online-nex:5 vs render-gfx:2；与 0x8a0a7c 同一模板（同样 0x7f7fffff 哨兵、[sp,#288]、栈帧 312），仅表偏移不同（[r5,#144]/[r5,#136]）；callee 集合完全相同 |
| 0x8f83c8 | filesystem | orchestrator | A | 字符串 "mpResource" 与 "resource"；析构：vtable 0xf49d8c+8 → [r8,#0]，movw #0x6d58 取成员后 bl 0x887660 释放并清零，再以 0xea10ffff(-...) 步长遍历子对象重设 vtable 0xf49d30+8 |
| 0xb0e8f8 | render-gfx | orchestrator | C | votes render-gfx:4 vs quest:3（分票）；ldr [r0,#116] 判空，add r4,#340，tst [r0,#80],#32768 位测试，常量 0x3fffc 作索引掩码；VFP 常量 0x13f00d0 |
| 0x7987ac | otomo-ot | orchestrator | C | votes otomo-ot:20 与 quest:20 平票；状态切换：ldr [r4,#148] → [r4,#160]，[r4,#148]=4、[r4,#152]=0，bl 0x5584f4，cmp #14 时置 [r4,#61]=1 |
| 0x11bde84 | render-gfx | orchestrator | B | votes render-gfx:19 vs monster-em:11；字节位域重构：ldrb [r1,#0x274a]/[r2,#-1]/[r2,#2] 后 orr 成 24 位并 orr #64 → strb [r2,#0]；清 [r1,#230]；cmp #3 走分派 |
| 0x799fa0 | quest | orchestrator | B | votes quest:29 vs otomo-ot:14；取全局 0x109f360 的 0x6bfc/0x6c34 字段，再 bl 0x25f840(0)/0x26fcac 与 bl 0x25f840(1)（多单例轮询），栈帧 812 |
| 0x658ae8 | ui | orchestrator | A | 字符串 "cUIORegistSrcPanelBase"（UI 面板基类名）；反汇编 [r4,#200] 惰性初始化：bl 0x570688 构造栈上对象，vtable 0x11e66d8+8 → [sp,#0]，写 [sp,#100]/[sp,#104]=15 |
| 0x1291910 | online-nex | orchestrator | B | votes online-nex:10（唯一票源）；blx [r0,#8] 虚调用后比较 [r9,#-56] 与 [r1,#12]→[r1,#28] 上限，取全局 0x5b5998；callees 全为 0x129xxxx 簇 |
| 0x10680 | ui | orchestrator | A | 字符串 "uUIFacility"/"uUIItemShop"/"uUIKitchen"/"uLobbyNpc"（UI 类名，uUI 前缀）；反汇编 bl 0x15e0 后逐个 bl 0x5073ec/0x507084/0x505ea4/0x193fe0/0x4deaf0 初始化各 UI 单例，含 blx [r1,#44] |

## 表（93-120）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x1284cc | quest | orchestrator | B | votes quest:38 vs otomo-ot:5；字符串 "amslt"/"ased"（数据表名片段）；反汇编 ldr [r2,#100] 校验索引，[r2,#108] 表基址访问器，随后 0x8xxx 簇表初始化 + bl 0x7aedcc 类注册 |
| 0x3103c | quest | worker | C | votes quest:3（弱）；3 个 callee；主体为尾跳 thunk `b 0x2b908` 与 dtor 形态（全局 0x180838c → bl 0x7aa47c → blx [r1,#52]），无子系统线索 |
| 0x1194458 | monster-em | orchestrator | C | votes monster-em:16 vs render-gfx:11（分票）；bl 0x27bcd0 后 cmp #1 早退，bl 0x2ad4f4，add r5,r4,#11136 后 ldrb [r5,#0] 与 bl 0x2fef48 结果比 100 |
| 0x692940 | otomo-ot | orchestrator | B | votes otomo-ot:28 vs quest:8；ldrb [r4,#6] 且 cmp #23 走 24 项跳转表，另取全局 0x11a69ac 的 0x6bfc 字段；栈帧 292 |
| 0x93992c | quest | orchestrator | B | votes quest:15 vs render-gfx:3；析构形态：vtable 0xf08bf8+8 → [r6,#0]，依次对 [r6,#4032]/[r6,#4040]/[r6,#4036] 取 vtable+24 后 blx 并清零 |
| 0x52874 | monster-em | orchestrator | A | 字符串 "rEnemyDataTable"（敌数据表资源名）；反汇编从 [r4,#100] 缓冲取 ldrh [r0,#16] 作条数、[r0,#32] 起表项、条目 64 字节（lsl #6），把 ptr 写 [r4,#108]、条数写 [r4,#104]；votes quest:20 与此冲突，以字符串为准 |
| 0x7e493c | online-nex | orchestrator | B | votes online-nex:8 vs render-gfx:3；VFP 矩阵变换（vldr r7+0x04..0x18 后 vsub/vmul/vdiv），栈帧 264；callees 为 0x7d12xx/0x7e4xxx/0x7f4xxx 簇 |
| 0xc411cc | render-gfx | orchestrator | B | votes render-gfx:16；与 0xc26af0 同族 callee（0xc47f50/0xc1703c/0xb79868/0xba5770/0xc1bf24），取 [r10,#232]/[r10,#216]，ldr [r8,#64] 且 cmp #4 |
| 0x395850 | save-io | worker | C | votes otomo-ot:1（弱）；唯一 callee 0x8261fc；流反序列化：blx [r0,#8] 读 16 位 → strh [r4,#4]，再读 1 字节 → strb [r4,#84]（与 0x104978/0x10c588 同模板，宽度不同） |
| 0xc6b790 | render-gfx | orchestrator | B | votes render-gfx:10 vs quest:4；写 [r0,#1140]，再从 r3 连续拷贝 8 个 dword 到 [r0,#1232..1260]（矩阵/变换参数设置），callees 含 0x885804/0x8826fc/0x882760 |
| 0xcefbc8 | monster-em | orchestrator | B | votes monster-em:12 vs quest:3/otomo-ot:3；区域内为一串 `bx lr` 小虚函数 + 一个 bl 0x7aa47c 单例转发，callees 含 0x7aedcc 类注册与 0x9exxxx/0xbxxxx 混合 |
| 0x7f8d08 | monster-em | worker | C | votes monster-em:2（弱）；2 个 callee（0x7e174c）；纯 VFP 向量/矩阵运算（6 次 vldr + vsub/vmul/vdiv），栈帧 488，无子系统字符串 |
| 0x439470 | monster-em | orchestrator | B | votes monster-em:23 vs quest:1；入口 `b 0x43b488` 尾跳，bl 0x43b4bc 后按 [r4] 判非空，bl 0x4a1b6c；callees 含本片 0x43bf1c（同类事件/行为处理） |
| 0xb7f77c | quest | orchestrator | B | votes quest:8 vs render-gfx:3；释放循环：[r4,#100] → [r1,#232]+40 为基址、ldr [r5,r7,lsl#6] 逐项 bl 0x887660 并清零，tst [r4,#108],#1 控制 |
| 0x6d4d94 | monster-em | orchestrator | C | votes monster-em:10 vs quest:9/render-gfx:4（分票）；ldrb [r4,#5] 按 0/1/2 三路状态分派，bl 0x6c70c8(r4,40)，位域重构后写 [r4,#4]；栈帧含 VFP 常量 |
| 0x79560c | quest | orchestrator | B | votes quest:33 vs otomo-ot:10；bl 0x65d9e8 与 bl 0x65ee6c 两级早退，取全局 0x10a3ccc 的 0x6bfc 与 bl 0x65f830 结果 tst，返回 15/0xffff |
| 0x21ba6c | quest | orchestrator | B | votes quest:10 vs monster-em:6；把 r6/r5/r4 与 [sp,#40] 四个字节打包进 16 字节描述符（strb [sp,#12..15]），vtable 0x16201a8+8 → [sp,#4]，再取 [r7,#36] 与 #4160 |
| 0x7fa2c0 | monster-em | worker | C | votes monster-em:2 vs render-gfx:1（弱）；3 个 callee；VFP 向量运算（vldr r3+0x00..0x18、vsub/vmul），栈帧 488，与 0x7f8d08 同族但无字符串 |
| 0x7f77a4 | monster-em | worker | C | votes monster-em:2（弱）；2 个 callee（0x7e174c）；VFP 矩阵/向量运算模板，栈帧 456，参数经 r9/[r11,#8] 传递 |
| 0xba8aec | quest | orchestrator | B | votes quest:11；多基址构造：vtable 0xc98f10+8 → [r4,#2056]、0xc98efc+8 → [r4,#1976]，bl 0x13f0d90/0x13f0c4c 构造 +2096/+2016 子对象，再取 0xc98ec8 |
| 0x77af50 | quest | orchestrator | B | votes quest:28 vs otomo-ot:9；取全局 0x10be3ac 的 0x6bfc/0x6c34，ldrb [r8,#5] 且 cmp #9 走 10 项跳转表；栈帧 372+1024 |
| 0xadd748 | render-gfx | worker | C | votes render-gfx:2（弱）；2 个 callee（0xae0de8/0xab0ad8）；从 [r0,#52] 取 [r3,#388]/[#368]/[#396] 与 ldrh [r3,#182] 作索引，栈帧 824，无字符串 |
| 0x5dd5dc | otomo-ot | orchestrator | C | votes otomo-ot:18 vs quest:12（分票）；入口连续清 18 个栈槽（[sp,#128..180]）后 bl 0x22f0a4(1) 与 bl 0x56e6a8 族注册调用 |
| 0xc0dae4 | quest | orchestrator | B | votes quest:18；析构形态：vtable 0xc376f0+8 → [r4,#0]，bl 0xc48000，清全局 0xc2b80c，再按 [r4,#188]/[r4,#200] 循环 blx 释放 |
| 0x7318e0 | quest | orchestrator | B | votes quest:22 vs otomo-ot:4；str #23 → [r4,#60]，取全局 0x11078c0 后读 ldrb [r0,#31]/[r0,#29] 判状态，再 bl 0x1a6ec0/0x1a5bc4/0x1a5c24 |
| 0x698eb4 | quest | worker | C | votes quest:3 vs audio:1（弱）；4 个 callee；三段访问器：ldr [r0,#24] 取表、ldr [r0,r1,lsl#2] 取项，空则返回 255，否则 ldrb [项+r2,#4]（无子系统硬证据） |
| 0xa31168 | quest | orchestrator | B | votes quest:7 vs monster-em:1；VFP 向量运算（vldr r9+0x00..0x14 与 r0+0x14/0x16），callees 全为 0xa32xxx 簇（与 0xa2eeac 同族），8 个 callee |
| 0x11dea04 | monster-em | orchestrator | B | votes monster-em:12 vs render-gfx:7；bl 0x11dfeb4 填充 [sp,#228]/[sp,#236]，bl 0x40b10 构造栈对象后 VFP 运算，callees 含本片 0x2e2c64，栈帧 240 |

## 汇总

- 覆盖：120/120 函数（`.tmp/mhgu/tierB2/slice-02.txt` 全部 `=== ` 条目，按文件顺序）。
- label 计数：quest 42、monster-em 33、render-gfx 17、otomo-ot 9、filesystem 5、online-nex 5、save-io 3、ui 3、save-data 1、kernel-os 1、unknown 1。
- conf：A 15、B 70、C 35。
- role：orchestrator 102、worker 18、thunk 0、leaf 0（本片均为按 insns 排序的大函数；个别条目首指令为 `bx lr`/`b` 是因为切片把同地址段内多个小函数并入区间，role 仍按 callee 数判定）。
- A 级证据全部来自字符串（15 条）：mpResource/resource（3 处：0x9ef288、0x8f83c8、0x8f83c8 段内）、mpGrass、mpEffectList、Resource(rCollision)、areaseldat、cSupplyList、cUIOHunterNoteLow、cUIORegistSrcPanelBase、uUIFacility 等 4 个 uUI* 类名、spkg、rEnemyDataTable、zlib inflate 错误串、printf 格式串（"%ld"/"(nil)"/字符表）、LightMask/AmbientMask/GBuffer/LightAccumulation0。
- 最不确定的 5 个：
  1. `0x8c51a0` — 三方平票（monster-em:2/quest:2/render-gfx:1），仅看出是 23 路消息 id 分派，标 unknown/C。
  2. `0x3103c` — 仅 quest:3，主体是 thunk+dtor，标签基本靠票，C。
  3. `0xafe8c0` — 仅 quest:3，4 个 callee，浮点分支，无子系统特征，C。
  4. `0x104978` / `0x10c588` — 各仅 otomo-ot:1；按「vtable/pos/len 流读取器」结构判为 save-io，属结构推断而非证据，C。
  5. `0xadd748` — 仅 render-gfx:2，2 个 callee，仅能从栈帧与索引模式猜渲染，C。
- 明确冲突（字符串与票数不一致，已按纪律取字符串）：`0xce1ba4`（"spkg"，quest:19 → filesystem）、`0x52874`（"rEnemyDataTable"，quest:20 → monster-em）、`0x5b1be8`（"cUIOHunterNoteLow"，otomo-ot:20 → ui）、`0x658ae8`（"cUIORegistSrcPanelBase"，otomo-ot:31 → ui）、`0x10680`（"uUI*"，otomo-ot:31 → ui）、`0x90c508`（"mpGrass"，quest:8 → render-gfx）。
- 无 UNCONFIRMED 占位；本片未写任何代码，未 build/未 git。
