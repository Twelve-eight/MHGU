# Tier B pass2 — slice-01 裁定

输入：`.tmp/mhgu/tierB2/slice-01.txt`（120 函数，按 insns 降序，地址域 0x46b6d0..0xb58ba0）。汇总见文末 `## 汇总`（追加式写入，故置于末尾）。

判据：conf `A`=独立硬证据（字符串、`bl 0x3df2a8`/`bl 0x3df378` 存档原语、`bl 0x7aedcc` 类注册、已知单例 GOT、特征立即数/结构证据）且必须在 evidence 中引用具体指令；`B`=votes 主导（top ≥ 1.6×次席）或明确结构模式（无独立字符串/原语）；`C`=votes 分票（次席 ≥ 0.6×top）且无结构特征。
已知种子（引用时注明）：相机投影 0x1C358、渲染尺寸初始化 0xBBCD34、渲染目标创建 0xBBBDE0、运动模糊 0x8BCD84；Pia 网络库区 0x1311000..0x13AB000 归 `online-nex`（沿用 tierB-slice-14 / tierB2-slice-03 的既定归属）。
`votes` 来自 Tier A 传播，本身不计为证据（§8 纪律），只用于 conf=B。

## 表（1-30）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x46b6d0 | monster-em | orchestrator | B | votes monster-em:14 vs quest:1/online-nex:1；块首为转发壳：取全局 0x13d1ed0 → bl 0x7aa47c 单例 → ldr r12,[r1,#32] → bx r12；16 callee 含 0x4a1b6c/0x4a1b50/0x4a1d34/0x4a2f5c/0x4a2ed0（全为 0x4axxxx EM 簇） |
| 0x728014 | quest | orchestrator | B | votes quest:14 vs otomo-ot:6；取全局 0x11112d8 后 movw #0x6bfc 与 movw #0x6c34 读同一单例两字段（任务/会话单例偏移对），ldr [r4,#144] 状态 0/1/2 三分支 + tst r9,#16384/#8192/#4096；20 callee 含 0x72d588/0x718934/0x65cb3c |
| 0x9b47b0 | quest | worker | B | votes quest:4 vs online-nex:1；字符串 "uWind"（语义不明，不足以定向）；5 callee 含 0x7aedcc 类注册与 0x9b24d0；主体 VFP + mla 按 [r0,#76]/[r0,#80] 计数遍历 [r0,#704]/[r0,#720] 缓冲 |
| 0xa66790 | render-gfx | orchestrator | B | votes render-gfx:6 vs quest:2/audio:1；9 callee 全为 0xa6/0xae/0xaf 簇（0xa691ec/0xaed74c/0xafb2bc/0xaef7a8/0xafca74）；124 字节栈帧，[r4,#68]&1 与 r7 0/1 分支分派 |
| 0x1c3fcc | monster-em | orchestrator | B | 字符串 "cMonNyanRewardEnemy"（cMon 前缀=怪物类名）与 "B=B=B=B=B=A=B=B=B=B="（等级表）；bl 0x7aedcc 类注册 + 0x2b8f0/0x2b908 基类；正文经 [r4]->[+24] 虚调用逐字段写 [r5,#4]/[r5,#8]，再按 [r4,#12] vs [r4,#16] 走 [+56] 回调；votes quest:4 与类名冲突，类名更直接 |
| 0x689e5c | otomo-ot | orchestrator | B | votes otomo-ot:14 vs quest:8（1.75×，勉强过半）；ldr [r4,#4] 后 cmp #20 + 21 项跳转表（0x689e8c 起，多数表项指向同一默认分支 +0x6a4）；23 callee 含 0x6b6d0c/0x6b33a4/0x6b7eb4（0x6bxxxx otomo 簇）及 0x3df9d4（存档侧邻近） |
| 0x694628 | otomo-ot | orchestrator | B | votes otomo-ot:11 vs quest:2；ldr [r1,#4] 后 lsr #24 取高字节、cmp #12 + 13 项跳转表（0x694658 起）；13 callee 含 0xba7f1c/0xba82a4/0xba7d68 与 0x65f118/0x65f190/0x65f270 序列簇 |
| 0xb2dfb4 | online-nex | orchestrator | A | 字符串 "nNetwork::TagChecker::RpcSyncReq"（网络 RPC 类名，直接定向）+ bl 0x7aedcc 类注册；正文 [r4,#16]→[r0,#8] 后 movw #0x41cc 读字段，按 [r4,#20] 数组 24 字节步长遍历并测 [r2,#16]&1；votes quest:5 与串冲突，取串 |
| 0x18f07c | quest | thunk | C | votes quest:3（弱）；首指令 `b 0x2b908`（基类尾跳），同段另一入口 bl 0x2b908 后取全局 0x16abb08、经 0x7aa47c 单例尾调 bx [r1,#52]；3 callee 全通用，无子系统证据 |
| 0x433198 | physics-math | orchestrator | B | votes render-gfx:1 与 monster-em:1 平票（无票主导，按结构定）；VFP 角度归一化：常量 0x43b40000(360.0f)/0xc3b40000(-360.0f) 与 0x3c8efa35(0.0174533f=PI/180) 做 deg→rad 换算，movw #0x1620/#0x16b4 取节点字段；2 callee（0x1ebe8/0x7c6914）无子系统指向 |
| 0x52a660 | quest | thunk | C | votes quest:3（弱）；与 0x18f07c 同模板：首函数 bl 0x2b908 后取全局 0x131463c、经 0x7aa47c 单例尾调 bx [r1,#52]；3 callee 全通用（0x2b908/0x7aa47c/0x7bb638） |
| 0x5cd238 | otomo-ot | orchestrator | B | votes otomo-ot:12 vs quest:4/render-gfx:1；ldr [r4,#136] 状态与 r5 比较，按 3/12/15 值分支并 blx [r0,#148]；17 callee 含 0x601e9c/0x601f18/0x601f5c 与 0x56dxxx UI 基类窗（0x56d97c/0x56da30/0x56dd44/0x56dfac） |
| 0x5d19ac | otomo-ot | thunk | B | votes otomo-ot:6 vs quest:2/monster-em:1；块首为多条尾跳壳（b 0x56e558、b 0x5d10a0/0x5d10a4、三次 b 0x7af3c4），后接 bl 0x60217c + 全局 0x126e080 经 0x7aa47c 单例尾调；9 callee 含 0x5d0f5c/0x5d0f7c/0x5d0fb4 与 0x545ce8/0x545d60 |
| 0x667f58 | quest | orchestrator | B | votes quest:21 vs otomo-ot:3；析构形态：全局 0x11d88f4+8 写 [r4,#0] vtable，[r4,#700] 经全局 0x11d14cc→[r0,#32] 的 [+52] 虚调用释放，global 0x11d2884 非空时 movw #0x23f0 调 0x13efe30(memcpy)；22 callee 含 0x54ecc0/0x54edec/0x54ee34/0x553a74 |
| 0x6bbdf8 | quest | orchestrator | B | votes quest:20 vs otomo-ot:3/monster-em:2；块首两条尾跳（b 0x6bcae8/b 0x6bcb54），主体是静态表初始化：pc-rel 基址 0x11e7880，向 [r4,#48..#76] 依次写 0/1/2/3/4/8/9 索引常量；23 callee 含 0x276278/0x14d080/0x14d704/0x14e5f0 |
| 0x13b379c | physics-math | orchestrator | C | votes quest:3 vs render-gfx:2（分票）；位于 Pia 区外（0x13b379c > 0x13ab000）；入口为单例转发（全局 0x490b28 GOT → 0x7aa47c → bx [r1,#32]），callee 0x7c0b80/0x7d290c/0x7d53b8/0x7eefb8 属 0x7c-0x7e 几何/向量簇；tierB-slice-14 曾疑此处为 MtCollisionUtil 树查询；另本片 0x13bd3f4（quest:13）以 19 路跳表调度整个 0x13bxxxx 模块并直接调本函数，模块归属偏 quest，但本体只做数学簇转接，故仍列 physics-math/C 待复核 |
| 0x6e0c44 | quest | orchestrator | B | votes quest:12 vs monster-em:1/otomo-ot:1；148 字节栈帧，全局 0x1158728→[r0,#0] 经 bl 0x1418e0 取对象后 ldrb [r7,#60]；14 callee 含 0x143894/0x1444b4/0x148340/0x14935c（0x14xxxx 簇）与 0x275a30 |
| 0x95ca38 | render-gfx | orchestrator | B | votes quest:20 vs kernel-os:3/render-gfx:2（票与结构冲突）；callee 8 个连续落在 0x13c064c/0x13c0684/0x13c06c0/0x13c06f8/0x13c0734/0x13c0790/0x13c07ec/0x13c07f8 = 同一类方法簇，tierB-slice-14 已把 0x13c07f8 记为 nNX::MoviePlayer（媒体区），按 slice-04 「rMovie/mem.mp4 → render-gfx」的既定归属取 render-gfx；正文 0x13efe00/0x13efe0c 互斥锁对 + ldrb [r4,#97]/[r4,#2] 状态门控 |
| 0xb68618 | quest | orchestrator | B | votes quest:6 vs audio:1；析构形态：全局 0xcdbfec+8 写 [r4,#0] vtable，按 [r4,#104] 计数循环 [r4,#116] 指针数组逐项 `ldr r1,[r0]; ldr r1,[r1,#4]; blx r1` 释放，再清 [r4,#116]；7 callee 含 0x690（音频侧小函数）与 0x13efd7c/0x13efdd0 |
| 0xcef180 | quest | worker | B | votes quest:3 vs audio:1（3 票弱但有主导）；析构形态：movw #0x4424 取成员，非空则全局 0xb499a0→0x7aa47c 单例 `blx [r2,#52]` 释放，随后 [r4,#0] 与 [r9,#0x4424] 双双清零；4 callee（0x321f9c 为 float 转换辅助） |
| 0x2733a4 | audio | orchestrator | B | 字符串 "plcmdtbllist"（player command table list，播放器命令表）；callee 0x82fb08/0x82fb10/0x82fb14/0x831b90 在 tierB-slice-07 已判为音频簇（与 audio thunk 0x16414 同段），另含 0x690、0x7aedcc 类注册；析构形态（全局 0x15c8f78+8 vtable、[r4,#116] 数组逐项释放）；votes quest:21 与之冲突，按 §8 纪律取字符串/簇  [swe2 audit: downgraded A->B, external class name only]|
| 0x50b4dc | quest | orchestrator | B | votes quest:27 vs render-gfx:1/otomo-ot:1/monster-em:1；124 字节栈帧，依次取全局 0x132d6c0→[r0,#0] 的 ldrb [r0,#76]/[r0,#77] 与全局 0x132d894/0x1330a4c，bl 0x3d7498/0x244f38/0x24391c/0x23eae0/0x23fdd4（0x23xxxx-0x24xxxx 簇）；23 callee |
| 0xbc6b44 | filesystem | orchestrator | A | 字符串 "Resource Loader" 与 "decodeProc"（资源装载器/解码回调）；反汇编 bl 0x887810 分配后向 [r6,#0x401c] 与 [r7,#28] 写两个不同 vtable（全局 0xc7e1b4+8 / 0xc7e184+8，多重继承），再清 [r7,#4..24]、[r7,#16] 装第二 vtable；votes quest:7/kernel-os:5/otomo-ot:4 分票，按串取 filesystem |
| 0xcc87ac | render-gfx | orchestrator | A | 成员名字串 "mInputR"/"mInputG"/"mInputB"/"mInputA"（着色器输入通道）；析构：全局 0xb7d8e4+8 → [r4,#0] vtable，[r4,#132] 经 [r0];[+4] 虚调用释放后清零，[r4,#124] 走引用计数递减循环；6 callee 含 0xcc7968/0xcc82e0/0x7cbdb4 |
| 0xb3640 | otomo-ot | worker | C | votes otomo-ot:2/audio:1/monster-em:1（2 票过弱）；ldrh [r4,#176] 与 128 比较，sub #129 后 cmp #10 + 11 项跳转表（表项 0x2c/0x250/0x294/0x2d8/0x31c/0x360）；与 tierB-slice-07 的 0xb3e4c 同模（同判 otomo-ot/C）；4 callee 无子系统指向 |
| 0x1cafd4 | quest | worker | C | votes quest:2 vs monster-em:1（弱票）；VFP 比较 [r0+0x1ad0] 处的 0.0f 与全局 0x166dd8c 的浮点，不满足则清零并检查 movw #0x1acc/#0x1ace 两个状态字节（状态更新器）；3 callee（0x1cad2c/0x13efda0/0x7aa47c）无子系统指向 |
| 0x46fcdc | monster-em | worker | B | votes monster-em:2（唯一票源，弱）；唯一 2 个 callee 0x2864c4/0x2864d4 属 0x28xxxx EM 簇；正文先 movw #0x15e8 清状态字，再以 r1=112/0x136/0x11a/300 四次调 0x2864c4 做类型 id 判定 |
| 0x6754e4 | quest | orchestrator | B | votes quest:15 vs otomo-ot:3/monster-em:1；取全局 0x11c3e20→[r0,#0] 后 movw #0x6bfc/#0x6c34 读任务单例两位（tst #16384/#32768），[r4,#84] 取反写入后 `ldr pc,[r2,r0,lsl r1]` 计算跳转；19 callee 含 0x65cb3c/0x65e794/0x54f260/0x551bf4 |
| 0x719a7c | quest | orchestrator | B | votes quest:17 vs otomo-ot:5；ldr [r10,#128] 状态 0..3 + 4 项跳转表，随后取全局 0x111f848→[r0,#0] 的 0x6bfc/0x6c34 单例字段；22 callee 含 0x718a0c/0x718934/0x729008/0x72874c/0x65cb3c（0x71-0x72 任务调度簇） |
| 0x828454 | unknown | worker | C | votes quest:1（仅 1 票，无结构指向）；唯一 callee 0x7aa47c 为通用单例取用；正文装全局 0x1018c68+8 vtable（ldm/stm 写 [r4,#0]/[r4,#4]），再经全局 0x1010fc0→[r7,#32] 的 [+28] 虚调用两次申请 16 字节并写 [r4,#8]，vtable 归属未识别 |

## 表（31-60）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x42df08 | monster-em | orchestrator | B | votes monster-em:16 vs quest:3；全局 0x140ae54→[r0,#0] 经 bl 0x276278 取状态，全局 0x140ac08 为 3 个 float，96 字节栈帧 + VFP；19 callee 含 0x4a1b6c/0x4a1d34/0x4a1e50/0x43b488/0x43bcc4/0x4a2a50（0x4axxxx+0x43bxxx EM 簇）与 0x7aedcc |
| 0x49bb40 | monster-em | orchestrator | B | votes monster-em:5 vs quest:1；入口取全局 0x13a1e84 后 bl 0x7aa47c 单例转发；6 callee 含 0x429760/0x403bec（0x40-0x42 EM 侧）与 0x3f9670/0x3faf64/0x3fc464（0x3fxxxx 表查询簇） |
| 0x95123c | monster-em | worker | C | votes monster-em:2（仅此一票，弱）；2 callee（0xb49e54/0x952c7c）；正文按 [r9,#1188] 计数、[r9,#1168] 基址、movw #0x4b6 起、步长 0x140 扫描表项并 tst 位 #2（槽位占用扫描），无子系统特征 |
| 0xf223c | otomo-ot | orchestrator | A | 类名字串 "cOtArmorBase"（cOt=Otomo 装备基类）+ bl 0x7aedcc 类注册、0x2b8f0/0x2b908 基类；正文为序列化写入：经 [r4]->[+12] 写 [r5,#4]、经 [+8] 写 ldrh [r5,#8]，再以 [r4,#12] vs [r4,#16] 边界检查走 [+56] 扩展；votes quest:5 与类名冲突，按类名取 otomo-ot |
| 0x1e3338 | quest | orchestrator | B | votes quest:8 vs otomo-ot:3/online-nex:1；全局 0x1656074/0x1656058/0x165602c 三级取对象后 bl 0xba84f0，读 [r0,#0x41cc] 再按 [r0,#92]==3 门控；12 callee 含 0xb21388/0xb215b4/0xb213cc（0xb21xxx 流/缓冲基类）与 0x8389e0/0x838750、0x13efe30(memcpy) |
| 0x409a60 | monster-em | orchestrator | B | votes monster-em:14 vs quest:2/render-gfx:1；构造形态：bl 0x3fe49c 基构造后装 vtable 全局 0x14333ec+8 到 [r3,#0x1704]，movw #0x1708/#0x170c 写 1.0f（1065353216），[#5888] 写 -1；17 callee 含 0x4a1b6c/0x4a2240/0x4a1ba4/0x43b7e0（0x4axxxx+0x43bxxx EM 簇）与 0x7aedcc |
| 0x7ee7a0 | physics-math | worker | C | votes monster-em:1 与 quest:1 平票（无线索）；2 callee（0x13efddc/0x808fe8）；184 字节栈帧 + 10 条 vldr 连续取 r6+0x04..0x28 的向量后 vsub/vmul 组合（纯几何运算），同 0x7exxxx 区（0x7ed2b8/0x7ddfd0 判 physics-math） |
| 0x76e43c | quest | orchestrator | B | votes quest:12 vs otomo-ot:7（7 < 0.6×12 之外，勉强过半）；先 bl 0x570688 构造栈上 UI 基对象，随后连续 bl 0x65ca84(idx 0/1/2..., r2=全局 0x10d11c4/0x10d15b0/0x10d1d08) 注册字段；19 callee 含 0x55bc4c/0x55bc7c/0x65cb3c/0x573464 |
| 0xb87d58 | save-data | worker | C | 字符串 "Store::OperationNotAllowed"（Store 类的错误串，指向数据存储侧，但未能确认是存档还是道具箱）；析构形态：全局 0xcbcb2c+8 → [r5,#0x3844] vtable，循环 [r5+r7<<2] 数组逐项 `ldr r1,[r0]; ldr r1,[r1,#36]; blx r1`；4 callee；votes quest:3 为弱票 |
| 0x1c12dc | monster-em | worker | B | 类名字串 "cMonNyanLotEnemy" 与 "B=B=B=B="（与 0x1c3fcc 的 cMonNyanRewardEnemy 同族、同为等级表）；bl 0x7aedcc 类注册 + 0x2b8f0/0x2b908 基类；正文经 [r4]->[+24] 虚调用依次写 [r5,#4]/[r5,#28]/[r5,#52]，再按 [r4,#12] vs [r4,#16] 边界走 [+56]；votes quest:5 与类名冲突，同族取 monster-em |
| 0x26fe54 | quest | orchestrator | B | votes quest:19 vs monster-em:2/otomo-ot:1；ldrh [r6,#176] 测位 #16 并 strh 回写，ldrb [r4,#1236]==15 分支后 bl 0xdf814/0xdb3e0 拼缓冲；22 callee 含 0x8260d4/0x8269f4/0x82772c/0x827bbc（序列化簇）与 0x269cac/0x269d14/0x26a27c |
| 0x5aaa7c | quest | orchestrator | B | votes quest:18 vs otomo-ot:4；ldr [r4,#76] 与 255 哨兵比较，全局 0x128e134→[r0,#0] 经 bl 0x55f864 取对象，ldrb [r4,#197] 非 0 才 bl 0x65d508，随后 [r4,#76]=255 并 bl 0x5ab660；22 callee 含 0x642d34/0x64482c/0x644a98/0x54f260 |
| 0x71c02c | quest | orchestrator | B | votes quest:15 vs otomo-ot:6；ldr [r6,#80] 状态 0..3 + 4 项跳转表（0x71c05c 起），首分支即 bl 0x718a0c(r8,22,1,1)；21 callee 含 0x718934/0x718cf4/0x65cb3c/0x523150（0x71-0x72 任务调度簇） |
| 0xc8ec60 | monster-em | worker | A | 类名字串 "cAIGraph"/"cAIGraph::Node"/"cAITreeBase"（AI 图/树基类）+ bl 0x7aedcc 类注册；正文为节点拷贝构造：从 [r1,#96]/[#100]/[#104] 取 3 字段与 3 个 float 到 [r0,#0..8]/[sp] 后写回，末尾 b 0x7af3c4；votes quest:3 弱票，按类名取 AI 归属（monster-em） |
| 0xd0124 | item | worker | A | 类名字串 "cArmorProcBase"（防具处理基类）+ bl 0x7aedcc 类注册、0x2b8f0 基类；构造：bl 0xda0cc 后装 vtable 全局 0x1769b58+8 到 [r0,#0]、[r0,#4]=0；紧随的析构装 0x1769b08+8 并 bl 0xda0e4；votes quest:7 与类名冲突，按类名取 item |
| 0x4225a0 | monster-em | orchestrator | B | votes monster-em:15 vs quest:2；块首 `b 0x43b488`（EM 基类尾跳）+ 随后标准析构（bl 0x43b488 + 全局 0x141aaf0 单例 [+52]），主体 bl 0x43b4bc 后 movw #0x1588 取字段；17 callee 含 0x4a1b6c/0x4a1c78/0x4a1d34/0x4a2304/0x4a2744/0x4a2a50 |
| 0xa0ed0c | quest | worker | B | votes quest:5（唯一票源）；[r4,#340] 惰性缓存：为 0 时取全局 0xe2de70/0xe2de74 两指针调 bl 0xb85a14 查表得 r7，随后用 ldrb [r7,#74] 作索引；5 callee（0xb85a14/0xa28dbc/0xc8d128/0xa02230/0x7aa47c）无独立子系统指向 |
| 0xba36d4 | quest | worker | C | votes quest:3（弱）；304 字节栈帧：bl 0x13f0f58 取时间/环境值后 bl 0x13efdc4 清 256 字节，再从 [sp,#276]/[sp,#300] 用 and #34/#17/#68 提取三个布尔标志写入 [sp,#8]/[#9]/[#13]/[#16]（描述符/查询参数构造）；callee 仅 2 个通用 thunk + 自递归 |
| 0xbd7314 | render-gfx | orchestrator | A | 字符串 "ReferenceTarget"（渲染目标名，同类于 slice-02 的 LightMask/GBuffer/LightAccumulation0）；反汇编 bl 0x13efdc4 以 mov r1,#32768 清零 [r4,#56] 起 32KB 目标缓冲，再从 [r5,#104]/[r5,#108] 取尺寸写 [r4,#32]/[r4,#48]，movw #0x3fd8/#0xfffc 作掩码；17 callee 含 0xb02c0c/0xb02c48/0xb044ec/0xb04528/0xccc05c/0xccba78；votes quest:12 与串冲突，按串取 render-gfx |
| 0x198120 | save-data | worker | A | 存档原语：bl 0x3df300 在 94 次循环（r6<0x5e）中按 32 字节写 [r5+0x9c+i*4] 数组，再 bl 0x3df378 以 len=136 写 movw #0xea4 与 #0xf2c 两个块（与 tierB2-slice-10 的 0x1979b0 同模板）；votes otomo-ot:5 与存档原语冲突，按 §8 纪律取原语 |
| 0x3b0ad8 | unknown | worker | C | votes otomo-ot:1（单票）；唯一 callee 0x3af160；正文向 [r8,#0..#64] 以 4 dword 为一组反复写 255/0/0/0 哨兵（16 项空表初始化），无子系统特征 |
| 0x488048 | monster-em | orchestrator | B | votes monster-em:17 vs quest:1/render-gfx:1；块首取全局 0x13b56f4 + bl 0x7aa47c 的转发壳，随后 `b 0x47c68c` 与标准析构；19 callee 含 0x4a1b50/0x4a1b6c/0x4a1d34/0x4a1e50/0x4a2304/0x4a2f5c/0x4a30dc/0x4a3164（0x4axxxx EM 簇）与 0x47c68c/0x47c6c0 |
| 0x77ca4c | quest | orchestrator | B | votes quest:23 vs otomo-ot:6；取全局 0x10bc8b4→[r0,#0] 后 movw #0x6bfc / #0x6c34 分别载入 r6/r7（任务单例双字段），bl 0x65d9e8 后 ldrb [r4,#5]≤6 + 7 项跳转表；22 callee 含 0x65cb3c/0x65d9e8/0x65e794/0x54ecc0/0x54fd94 |
| 0xb4b398 | kernel-os | worker | A | 字符串 "PNS0_5LayerEPNS0_7DisplayE"/"PNS0_13SemaphoreTypeE"/"eEPNS0_13SemaphoreTypeENS_8TimeSpanE"（C++ 修饰名残片：SemaphoreType/TimeSpan = 内核线程/信号量原语，属 CRT/OS 层）；析构形态：全局 0xcf8e18+8 → [r4,#0]，ldrb [r4,#76] 为 0 时走释放分支；votes quest:6 与串冲突，按串取 kernel-os |
| 0xc44820 | render-gfx | orchestrator | B | votes render-gfx:5 vs quest:1；取 [r11,#232]/[r11,#216] 与 [r0,#200] 后按 [r8,#8]/[r8,#12] 索引 [r0,r3,lsl#2]，再 ldr [r0,#84] + 0xcc 与 ldr [r0,#220] 做步长运算（与 0xc411cc 同族的 [r10,#232]/[r10,#216] 渲染参数取用）；6 callee 含 0xc1bac8/0xc1bd38/0xc1bb28/0xc427c8（0xc1bxxx 渲染簇） |
| 0x429024 | monster-em | orchestrator | B | votes monster-em:10 vs quest:2；VFP 结构体字段运算：movw #0x1670/#0x1688/#0x168c/#0x1690/#0x1698 逐对取 float 做 vsub/vcmp 后条件回写（同一 0x16xx 大对象内的姿态/参数块）；12 callee 含 0x4a1b6c/0x4a1ba4/0x53aa70/0x428e14 与 0x7aedcc |
| 0x5c9ff8 | unknown | worker | C | votes otomo-ot:1（单票）；唯一 callee 0x557ac4（先 bl 0x557ac4(9)、再 bl 0x557ac4(6) 取两个全局开关）；正文在 [r4,#112]/[r4,#116] 双非空时经 [r0]->[+56] 虚调用取尺寸再比对常量，无子系统特征 |
| 0x65ff6c | quest | orchestrator | B | votes quest:22 vs otomo-ot:8；先 bl 0x65ca84(idx 0, r2=全局 0x11df6a0, 栈参 32) 注册字段，再 bl 0x65cb3c(0) 取对象并写 [r0,#76]=r4+328、[r0,#80]=27、[r0,#84]=r4+268（控件/列表绑定）；20+ callee 含 0x570688/0x570710/0x54edec/0x65d9e8 |
| 0x161184 | unknown | orchestrator | C | votes otomo-ot:4/monster-em:4/quest:3 三方平票（无主导）；正文 bl 0x13efd7c 以 movw #0x18b8 清 [r5,#32] 大片区域，bl 0x7c9198 构造栈对象，取全局 0x16d7a04→[r0,#68] 后 bl 0x3f8344，再用魔数 0x88888889 做除法取模并 strb 到 [r5,#2256]；11 callee 分散（0x3b5ac0/0x3ea570/0x7ca420/0x7bd990），无统一指向 |
| 0x329908 | quest | worker | B | votes quest:4（唯一票源）；ldr [r4,#52] 与 [r4,#64] 做 mla 行索引（每行 5 dword）后取 [r0,#104] 子对象，ldrb [r4,#49]≤30 + 31 项跳转表（0x329968 起）分派；4 callee（0x324588/0x324300/0x887648/0xc067ec） |

## 表（61-91）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x3ffcec | monster-em | orchestrator | B | votes monster-em:13 vs quest:2；构造形态：bl 0x43b3f8 基构造后装 vtable 全局 0x143d090+8 到 [r4,#0]，movw #0x15c8 + bl 0x13efdc4 清 36 字节，再从全局 0x1438e1c 取两组值写 movw #0x15f0/#0x15f4/#0x15f8；15 callee 含 0x4a1b6c/0x4a1c78/0x4a1d34/0x4a1e50/0x4a2744/0x43b4bc/0x43b6e4 |
| 0x6a2580 | otomo-ot | orchestrator | B | votes otomo-ot:10 vs quest:4/monster-em:1；构造：bl 0x13efd7c 以 len=36 两次清 [r9,#4]/[r9,#44]，写 1.0f 到 [r9,#40]/[r9,#80]，[r9,#84..96] 清零，栈上 4 个 dword 全 255（哨兵 id）；15 callee 含 0x56d97c/0x56da30/0x56dd44/0x56e3b0/0x56e808/0x56e4d8（0x56xxxx UI/对象基类簇） |
| 0xcd1144 | quest | orchestrator | B | votes quest:10（唯一票源）；块内为 `bx lr` + `b 0xcd0cec` + 析构（全局 0xb74fec 单例 [+52]）+ 多个尾跳（b 0xb11cbc/b 0xb124c0/b 0x7af3c4）+ 全局 0xb74fbc getter；10 callee 含 0xb12fc0/0xb13000/0xb13238/0x85e500/0x85e5c4 |
| 0x544750 | unknown | orchestrator | C | votes quest:6 与 audio:6 完全平票（render-gfx:1/monster-em:2）；构造：bl 0x5442fc 后连续装三个子对象 vtable（全局 0x12fa8f8+8 → [r4,#0]、0x12fa8dc+8 → [r4,#564]、0x12fa8c0+8 → [r4,#588]）并逐块清 0；15 callee 含 0x690(audio)、0x919508/0x919864/0x9194dc 与 0x55fd30/0x55fd88、0xa33e88，双方各有指向 |
| 0x6a1674 | otomo-ot | orchestrator | C | votes otomo-ot:9 vs quest:6（6 ≥ 0.6×9，分票）；ldrb [r0,#420] 测位 #2 早退，bl 0x3a30a4==1 且 ldrb [r0,#85]==12 再早退，随后按 [r4,#4] 高字节分派；19 callee 含 0x3a24a0/0x3abbf8/0x3ae21c/0x3af2cc（0x3axxxx 簇）与 0x55e2bc/0x561e80 |
| 0xc1b084 | quest | orchestrator | B | votes quest:9（唯一票源，无独立证据；注意地址落在 0xc1bxxx 渲染簇邻域，但本函数无渲染特征）；setter：ldr [r8,#84] 非空则 bl 0x887660 释放并清零，随后写新指针并 bl 0x887648 加引用，ldrh [r5,#128] 后尾跳 0xc1b254；9 callee 含 0xc0c60c/0xc0c62c/0xc46dcc/0xc99360 |
| 0x27f728 | monster-em | worker | C | votes online-nex:1 与 monster-em:1 平票（无线索）；按大小类分桶：r1 与 0x10000/0x20000/0x40000/0x100000 比较后取 mov r0,#9536(0x2540)/mov r5,#40960(0xa000) 等字段；2 callee 中 0x282f58 属 0x28xxxx EM 簇（另一为 0x13efd70 通用 thunk） |
| 0x4d1ba8 | online-nex | worker | C | votes online-nex:3（弱票，无结构支持）；sub r1,r3,#61 后 cmp #88 + 89 项跳转表（表项 0x164/0x16c/0x174/0x17c 递增，典型消息/命令 id 分派）；5 callee 全在 0xe1xxx（0xe10cc/0xe1190/0xe173c/0xe19b8/0xe1a74），无子系统字符串 |
| 0x78b904 | quest | orchestrator | B | votes quest:10 vs otomo-ot:6（1.67×，勉强过半）；入口 ldr [r5,#88] 与 5 比较后分派；16 callee 含 0x65d424/0x65d464/0x65cbe8/0x54f260（任务序列簇）与 0x509558/0x50c988/0x50f4e4/0x50f554（0x50xxxx 簇） |
| 0x7d15b8 | physics-math | worker | B | 结构模式明确：纯 VFP，连读 r6/r7 两组的 12 个 vldr（+0x04/+0x00/+0x10/+0x14/+0x08/+0x18）后 vsub/vmul 组合（向量差/点积），5 个 callee 中 4 个（0x7cf610/0x7d1238/0x7cfc64/0x7d9734）属 0x7cf-0x7d9 数学簇（与 slice-10 的 0x7ddfd0 同簇）；votes online-nex:5 属该区的传播票，无独立支持 |
| 0xc19198 | quest | worker | C | votes quest:3（弱）；构造/析构形态：装 vtable 全局 0xc2c1a4+8 到 [r0,#0x27e0]，随后以 0x40 步长对 [r4+0x27a0]/[r4+0x2760]/[r4+0x2720]/[r4+0x26e0]/[r4+0x26a0] 连续 bl 0xc983f0（子对象批量析构）；3 callee 无子系统指向 |
| 0xc2a560 | render-gfx | orchestrator | B | votes render-gfx:5 vs monster-em:1/quest:1；VFP 点积/归一化（168 字节帧，vsub/vmul/vcmp + bl 0x13efddc 取 sqrt），参数从 [r11,#12]/[r11,#8] 取；7 callee 含 0xc1ef38/0xc1bf24/0xc1b778/0xc2243c/0xc44f24（0xc1bxxx-0xc22xxx 渲染簇） |
| 0x1a20cc | ui | orchestrator | B | 字符串 "SequenceJobEPNS2_4StepEEE"（C++ 修饰名残片）与 "cKitchenListSuccessTable3"（厨房=食堂列表成功表类）+ bl 0x7aedcc 类注册；正文经 [r4]->[+32] 逐个 vldr 写 3 个 float 字段；22 callee 含 0x8260d4/0x8269f4/0x826130（序列化簇）与 0x19e58c/0x19e61c/0x19e75c；votes quest:22 与类名冲突，按类名族（对照 slice-06 cUIKitchen*→ui）取 ui |
| 0xc2009c | render-gfx | orchestrator | C | votes quest:8 vs render-gfx:7（7 ≥ 0.6×8，分票）；movw #0x92c 起、r6=32 次循环、每次 add r5,#64 并对 (r5-2048) 与 r5 各 bl 0xc99438（32 组渲染节点的成对初始化）；16 callee 含 0xc1bac8/0xba5770/0xba57dc/0xc71c54/0xc71d64/0xc99360；按 0xc2xxxx 渲染区邻域取 render-gfx |
| 0xcca0dc | render-gfx | orchestrator | A | 成员名字串 "mInputA"/"mInputB"/"mOutput"（与 0xcc87ac 的 mInputR/G/B/A 同族 = 着色器/材质节点输入输出槽）；析构：全局 0xb7bf9c+8 → [r4,#0] vtable，[r4,#96] 经 [+4] 虚调用释放，[r4,#88] 走引用计数递减；6 callee 含 0xcc7968/0xcc82e0；votes quest:6 与串冲突，按串取 render-gfx |
| 0x76006c | quest | orchestrator | B | votes quest:20 vs otomo-ot:4；ldrb [r4,#5] 状态机：sub #1 / cmp #2 分支、cmp #3、cmp #0 三路，取全局 0x10d8b04 后分派；22 callee 含 0x75f878/0x75fcf8/0x761dc8/0x762348/0x762424/0x7647d8/0x764890（0x76xxxx 簇）与 0x65cb3c/0x65e794 |
| 0x13a2874 | online-nex | orchestrator | A | 地址落在 Pia 网络库区（0x1311000..0x13ab000），6 callee 中 5 个（0x13a14d8/0x13a1d94/0x13a2310/0x13a2714/0x13a1f90）全在 Pia 簇、另一个 0x13f15ac 是 IAT thunk；正文 ldrh [r8,#48] 后 `mul r1,r9,r9` 校验表尺寸、movw #0xc07/movt #0x1（0x1c07 状态码）等 Pia 报文处理 |
| 0xb2820c | quest | orchestrator | C | votes quest:6 vs otomo-ot:4（4 ≥ 0.6×6，分票）；movw #0x2fd4 取索引后按 856(0x358) 步长 mla 定位记录，再读 movw #0x3528/#0x352c/#0x36f4/#0x379c 字段并逐项写入；11 callee 含 0xb21808/0xb219cc/0xb21a04/0xb21a64/0xb21bb0（0xb21xxx 流基类）与 0xb31f54 |
| 0x13c1ccc | audio | orchestrator | A | 字符串 "audio" 与 "audio output"（音频输出）；反汇编 bl 0x13c2df0(r4, 131072) 做输出初始化，bl 0x13efdc4 以 len=396 两次清零 [r4+296]/[r4+696] 双缓冲，装 vtable 全局 0x486ab8+8，并把 10/6/6/2 四个参数压栈（采样/声道配置）；11 callee 含 0x13c2e30/0x13c2ed4/0x13c3018；votes quest:9 与串冲突，取串 |
| 0x323804 | quest | worker | C | votes quest:3 vs online-nex:1/audio:1（弱票）；状态机 ldrb [r8,#93] 0/1 分支，ldr [r8,#16]+8 后与 pc 相对常量 0x122d52e（.rodata 字面串）比较，再 bl 0x13efd88/0x13efd94（strlen/strcmp 辅助）比对名字；5 callee 无子系统指向 |
| 0xb446b0 | quest | orchestrator | B | votes quest:11 vs render-gfx:6（1.83×）；块首 `bx lr` + 析构（全局 0xcffa3c+8 → [r4,#0]，[r4,#100]/[r4,#104] 经 [+24] 虚调用释放后清零，再处理 [r4,#112]）；18 callee 含 0xb02968/0xb029a4/0xb02a58/0xb02a60/0xbdc248/0xb0b26c，与 slice-10 的 0xb49090（quest）同簇 |
| 0xc37934 | render-gfx | worker | B | 结构模式明确：向 [r1,#216]/[r1,#220] 写尺寸与标志，按 [r1,#148] 计数以 16 字节步长（lsl #4）在 [r1,#4] 后构建条目表，每条写入 4 个渲染子对象 vtable（全局 0xc0dbbc/0xc0dba8/0xc0db94/0xc0db84 各 +8）；6 callee 含 0xc1ef38/0xc1bf24/0xc1b778/0xc2243c（0xc1bxxx-0xc22xxx 渲染簇）；votes render-gfx:3 vs quest:2 分票但结构一致 |
| 0x1a9364 | quest | orchestrator | B | votes quest:10（唯一票源）；全局 0x16914dc→[r0,#0] 经 bl 0x1c9378 取对象，再经全局 0x168f7c0 单例 [+28] 以 (6,16) 申请 16 字节，随后 strb 0 到 [+4]/[+5] 初始化；10 callee 含 0x1c864c/0x1c8b00/0x1c8ca8/0x1ac45c/0x1abbe4（0x1c8xxx/0x1axxxx 簇） |
| 0x72e294 | quest | orchestrator | B | votes quest:19 vs otomo-ot:3；22 callee 含 0x72ef60/0x72f13c/0x72f67c/0x72f888/0x72fb04（0x72xxxx 任务调度簇）与 0x65cb3c/0x65cba0/0x65dd68/0x54f260，符合 quest 家族结构 |
| 0xa8accc | render-gfx | orchestrator | C | votes render-gfx:10 vs quest:7（7 ≥ 0.6×10，分票）；bl 0xcad764 返回值 ==1 时直接返回 [r4,#76]，否则按 [r4,#148]&0xff0000==0x10000 走 bl 0xc65ebc(1264,16) 分配；18 callee 含 0xaed74c/0xaf938c/0xa6be40/0xa6a2d0（与 0xa66790 同一 0xa6/0xae/0xaf 渲染簇），另有 0xcad764/0xc65ebc/0xcb09fc |
| 0xbf9db8 | quest | orchestrator | B | votes quest:13（唯一票源）；全局 0xc42ddc→[r0,#0]→[r0,#32] 取子对象 +80 后 bl 0x13f12a0（导入），返回值须 ==1 才继续，随后把 6/6 等参数压栈（[sp,#0]/[#4]/[#8]）再调 0xbf8ec4；13 callee 中 11 个是 0x13f1xxx 导入 thunk |
| 0xbe8eec | otomo-ot | orchestrator | C | votes otomo-ot:6 vs quest:5（5 ≥ 0.6×6，分票）；成员批量释放模板：对 [r4,#8]/[#12]/[#16]/[#20] 逐个判空后 bl 0xc4d33c + bl 0x7af3c4（释放并清零），最后尾跳 b 0x7af3c4；12 callee 含 0xc4d098/0xc4d384/0xbe1f0c/0xb6a42c |
| 0xbfee70 | quest | orchestrator | B | votes quest:15（唯一票源）；ldr [r4,#4] ≤19 + 20 项跳转表（0xbfeea0 起，表项 0x50/0xd8/0x118/0x16c…），312 字节栈帧；15 callee 含 0xbfde90/0xbfe28c/0xbfe41c/0xbf88d4 与 0x13f14ec/0x13f1504 等导入 thunk |
| 0x492db4 | monster-em | orchestrator | B | votes monster-em:16 vs quest:2；ldr [r4,#4] ≤5 + 6 项跳转表（0x492df0 起），movw #0x15e5 取字段后按 240 字节栈帧 + VFP 处理；18 callee 含 0x4a1b50/0x4a1d34/0x4a1e50/0x4a2478/0x4a2ed0/0x4a2f5c（0x4axxxx EM 簇）与 0x890adc/0x8a7dc4 |
| 0x49d690 | unknown | thunk | C | votes quest:1（单票）；唯一 callee 0x7aa47c；块首为转发壳（全局 0x13a047c → 单例 → bx [r1,#52]），同段另一入口取全局 0x13a045c 后以 movw #0x1670 调 [+32] 再尾跳 0xe5c18c，无子系统特征 |
| 0xbdac90 | render-gfx | worker | A | 字符串 "CBHDRFactor"/"CBScreen"/"CBROPTest"（color-buffer HDR 系数/屏幕/ROP 测试 = 图形状态与着色器常量名）；反汇编为 1024+12 字节大栈帧 + 16 字节参数传递的图形状态设置；6 callee 含 0xbdaba8/0x83e1c8/0x83e368/0x83e264；votes quest:6 与串冲突，按串取 render-gfx |

## 表（92-120）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x5385d4 | unknown | orchestrator | C | votes quest:3 与 otomo-ot:3 完全平票（monster-em:1）；全局 0x1300790→[r0,#0] 经 bl 0x276278 取单例，ldr [r5,#12]==2 分支后以 (2,1)/(3,1) 调 0x3a5ed0 取子记录；7 callee 含 0x536f18/0x19c21c/0x12188dc/0xbee80/0x5ceb4，无统一指向 |
| 0x66c3f8 | quest | orchestrator | B | votes quest:17 vs otomo-ot:5；先写 [r4,#476]=0 与 [r5,#136]=24，再 bl 0x55bc7c 取对象并把 [r4,#476] 当计数器逐项写 [r1,#4]/[#8] 与 [r0,#484]；22 callee 含 0x65cb3c/0x65cbe8/0x65cc0c/0x65e794/0x54f260 与 0x66cac8/0x66cc38/0x66cd14（0x66xxxx 簇） |
| 0x1b4ce8 | quest | orchestrator | B | votes quest:12 vs otomo-ot:3；构造：bl 0x1ada88 基构造后装 vtable 全局 0x1686164+8，strh 0 到 [r0,#36]，再清 [r0,#8..#32]；15 callee 含 0x1adaa4/0x1adaec/0x1bb730/0x1b53b4/0x5d6568/0x5d6ba0；注意 strings 列是二进制表被误当串（" e e d!a#`#`#`#_" 等），不作证据 |
| 0x3f3b40 | quest | worker | B | votes quest:5（唯一票源）；二维表查找：r8≤4、r6≤3 校验后 add r7,r8,r8,lsl#2（×5）、lsl #4（每行 80 字节）再 + r6*20 索引 pc 相对表 0x12373ac，取项后 `cmn r1,#1` 比对 -1 哨兵；5 callee（0x3b1964/0x3b1d70/0x523da4/0x523984/0x13efdc4） |
| 0x5433d8 | quest | orchestrator | B | votes quest:18 vs otomo-ot:2/online-nex:2；块首 `bx lr` + 析构（全局 0x12fbc30+8 → [r4,#0]，[r4,#300] 与 [r4,#304] 经 0x887660 释放后清零，再 bl 0xba17c4/0xba05d0）；23 callee 含 0xb35764/0x55bdc8/0x55dd40/0xa4192c/0xa42430 |
| 0xb59254 | quest | worker | B | votes quest:4（唯一票源，偏弱）；析构形态：全局 0xceb184+8 → [r4,#0] vtable，[r4,#8] 指向的元素前 16 字节取计数（ldr [r0,#-12]），按 80(0x50) 字节步长逆序 bl 0xb580f0 释放整段；strings 列 "tus_bit"/"point" 疑为串池碎片，不作证据 |
| 0xc71130 | render-gfx | orchestrator | B | votes render-gfx:6 vs quest:2；从全局 0xbcfc94 的连续 3 个 float 拷贝到 [r10,#80]/[#4]/[#8] 并用 3 条 VFP 装入（ee031a10/ee042a10/ee050a10），全局 0xbcfd20 另一组；8 callee 含 0xc1f368/0xc103e4（0xc1xxxx 渲染簇）与 0xced584/0xcec78c |
| 0x175918 | monster-em | orchestrator | B | votes monster-em:14 vs quest:3；把 [r4,#172]/[#176]/[#32]/[#40]/[#36]/[#180]/[#6] 一串字段摊到栈上（结构体打包）后再处理；17 callee 含 0x285a54/0x285a98/0x285abc/0x285b24/0x2864e0（0x28xxxx EM 簇）与 0x1694cc/0x169548/0x16da88/0x170758 |
| 0x50ae14 | otomo-ot | worker | C | votes otomo-ot:3 vs quest:1（弱票）；[r4,#480]==2 门控后按 [r4,#484]≤30 + 31 项跳转表（0x50ae48 起）分派；4 callee（0x12730/0x65d424/0x3f856c/0x65e794）无独立指向 |
| 0xa24774 | quest | worker | B | votes quest:5（唯一票源）；析构：全局 0xe1eb48+8 → [r4,#0] vtable，[r4,#12] 经全局 0xe1ea48 单例 [+52] 释放，[r4,#16] 非空时按 ldrh [r4,#6] 计数逐个释放；5 callee（含自递归 0xa24774 与 0x13efd7c 清零） |
| 0x13be218 | quest | orchestrator | B | votes quest:4 vs monster-em:1（4×，但绝对值偏低）；块首为单例转发（全局 0x48a544 → bl 0x7aa47c → bx [r1,#32]），同段另一入口 bl 0x7bec50 后逐字清栈槽；5 callee 含 0x7bec50/0x7bb638/0x13efddc/0x7aedcc；地址 0x13be218 在 Pia 区（≤0x13ab000）之外，不足以按网络判 |
| 0x4003e4 | monster-em | orchestrator | B | votes monster-em:13（唯一票源）；先 vldr r1+0x00/+0x04/+0x08 三个向量，再 bl 0x4a1b6c 取 EM 基址（判空早退），movw #0x1624 取字段后 bl 0xc1660 生成变换；13 callee 含 0x4a1ba4/0x4a2304/0x400aa4/0x400c38 |
| 0x831160 | quest | orchestrator | B | votes quest:9 vs audio:1/otomo-ot:1/online-nex:1；540 字节栈帧，[r10]->[+12] 虚调用取值后 ldrb 与 31 比较 + 32 项跳转表（0x8311b8 起）；12 callee 含 0x82fe1c/0x8261fc/0x826c38（序列化流）与 0x7bb3ec/0x7bba24/0x7bb9e4/0x7bb638（容器簇） |
| 0x958ffc | quest | orchestrator | B | votes quest:12 vs online-nex:1；析构：全局 0xee965c+8 → [r4,#0] vtable，[r4,#84] 先 bl 0x95c544 处理再经全局 0xee9634 单例 [+52] 释放并清零，随后处理 [r4,#72]；13 callee 含 0x95bfd8/0x9596bc/0x9597d8/0x959ac0 与 0xbf8024 |
| 0xc39864 | render-gfx | orchestrator | B | votes quest:5 与 render-gfx:5 平票（按结构定）；652 字节栈帧 + 全局 0xc072e0，callee 三元组 0xc20ec8/0xc16100/0xc1ef38（另 0xc160f8/0xc160fc/0xc1bf24）与已判 render-gfx 的 0xc387e8 完全同族（slice-08），故取 render-gfx |
| 0x13bd3f4 | quest | orchestrator | B | votes quest:13（唯一票源）；sub r1,r0,#1 后 cmp #18 + 19 项跳转表（0x13bd420 起，表项 0x4c/0xa0/0x120/…），并装配 0x42c80000(100.0f) 常量；13 callee 全在 0x13bxxxx 模块（0x13b379c/0x13b41a0/0x13b4b2c/0x13b5c7c/0x13b63c0/0x13b69ac/0x13b7424/0x13b7dc8/0x13be218/0x13be8dc/0x13bf4f8），显示该模块被 quest 侧调度 |
| 0x2f6a34 | monster-em | orchestrator | B | votes monster-em:8 vs otomo-ot:2/quest:1/online-nex:1；movw #0x327c/#0x1054 定位子对象、movw #0xb5f9 作大偏移 ldrb 取样，全局 0x1542148→bl 0x5ceb4 取槽位后判空早退；13 callee 含 0x27b918/0x283238（0x27b/0x28 EM 簇）与 0x2a6760 |
| 0x5b7088 | quest | orchestrator | C | votes quest:13 vs otomo-ot:9（9 ≥ 0.6×13，分票）；入口按 r1==2/1/其它三路置 [sp,#48] 与 r11，[r4,#88] 判空后 bl 0x56e528(r4,0,1) + bl 0x5b8e54；22 callee 含 0x5b87fc/0x5b90a8/0x5b973c 与 0x143894/0x14394c/0x144664 |
| 0xbdf1c | monster-em | worker | A | 特征立即数：movw #0x1428 取子对象指针后 `strb 0` 到 [r1,#2344]（0x928），该 0x1428 取用模式在 slice-02 的 0xb8c54、slice-06 的 0xc3144、slice-08 的 0xadb3c 均判为怪物实体；随后 movw #0x5cd5 ldrb 门控、movw #0x1054/#0x1060 继续取样；8 callee 含 0x2329b8/0x27b… 侧无，仅 0x49ba8/0x49c0c/0xc3ca0 |
| 0x1b7b24 | quest | orchestrator | B | votes quest:17 vs otomo-ot:9（9 < 0.6×17）；全局 0x1682d1c→[r0,#0] 经 bl 0x1c95f0/bl 0x1c8ca8 取状态，再用 ldrb [r9,#36] 与 pc 相对表 0x146e2e4 查表得参数传 0x5d7874；22 callee 含 0x5d7ae4/0x5d7c9c/0x5d7cc8/0x5d7cd4（0x5d7xxx 簇）；strings 列是二进制表（"A=A=B=A=B=…"）不作证据 |
| 0x41bdf8 | monster-em | orchestrator | B | votes monster-em:15 vs quest:1；块首装 vtable 全局 0x1421214+8 到 [r0,#0] 后 `b 0x43b488`（EM 基类尾跳），随后标准析构 + 主体 bl 0x43b4bc/0xc1708；16 callee 含 0x4a1b6c/0x4a1c78/0x4a1d34/0x4a1e50/0x4a2744/0x40b10/0x40b50/0x41c4b0 |
| 0x671bec | quest | orchestrator | B | votes quest:29 vs otomo-ot:3；先 bl 0x65cb3c(4)/0x65cb3c(5) 取两个成员，ldr [r4,#92] ≤7 + 8 项跳转表，并取全局 0x11c76e4 的 movw #0x6bfc 单例字段；22 callee 含 0x18af18/0x18b034/0x18b2f8/0x18b48c（0x18axxxx 簇）与 0x54ecc0/0x54fbb0 |
| 0x78efa0 | otomo-ot | orchestrator | B | votes otomo-ot:14 vs quest:7/monster-em:1/online-nex:1；构造：bl 0x66dc6c(r1=57) 后装 vtable 全局 0x10b1cf0+8，清 [r4,#2016]/[#2020]/[#160]/[#148]/[#1708]/[#1712] 并把 strh 15 写到 [r4,#176]（类型 id）；22 callee 含 0x66e3ac/0x66ed24/0x625138/0x54f9c0/0x54fa40 |
| 0x86fb4c | render-gfx | worker | C | votes render-gfx:5 vs quest:4（4 ≥ 0.6×5，分票）；块首 `b 0x8af6a4` 尾跳 + 标准析构（全局 0xfcf324 单例 [+52]）；9 callee 含 0x8826fc/0x883f74/0x887958（0x88xxxx 资源/渲染簇，与 0xc6b790 的 0x885804/0x8826fc/0x882760 同族），另有 0x8af86c/0x8af8d0 |
| 0x9bdc68 | quest | orchestrator | B | votes quest:36 vs render-gfx:12；ldr [r3,#240] 位域 tst #131072 后回写 [r4,#240]，[r4,#244] 子对象经 [r7,#124]&15 判有效，[r4,#464] 非空则 +468 取表否则全局 0xe84e08（并 orr #524288 置位）；22 callee 成对分布（0xaf4244/0xaf4280、0xae1628/0xae1664、0xaefe24/0xaefe60、0xa8e01c/0xa8e058 …） |
| 0x134e2bc | online-nex | orchestrator | A | 地址落在 Pia 网络库区（0x1311000..0x13ab000）；callee 含 Pia 核心 0x130b0ec/0x130b110/0x130cdcc/0x130ca20/0x130ca48/0x130ca04/0x130f6ec（tierB-slice-14 已判为 online-nex）；正文 movw #0xc08/movt #0x1（0x1c08 状态码）、把 [sp,#8]/[sp,#12] 写 [r5,#952]/[r5,#956]；votes online-nex:32 与之一致 |
| 0x13bab3c | unknown | worker | C | votes quest:1（单票，无独立证据）；唯一 callee 0x7aa47c；56 字节栈帧 + VFP 转换（ed9f8ad7/eeb79a00/eeb6aa00），取全局 0x48dafc/0x48daf0/0x48dae4 三个函数指针入栈；地址 0x13bab3c 在 Pia 区（≤0x13ab000）外，属 0x13bxxxx 未定模块 |
| 0x3fc628 | monster-em | orchestrator | B | votes monster-em:16（唯一票源）；bl 0x43b4bc 校验后用 bl 0x4a1c78 取子对象并 tst ldrb [r0,#80],#1 判有效，无效则经 [r0]->[+64] 虚调用并返回 0，有效则 movw #0x1588 继续；16 callee 含 0x4a1b6c/0x4a1ba4/0x4a1c78/0x4a1d34/0x4a1e50/0x4a2300/0x4a2304/0x4a2744（全 0x4axxxx EM 簇） |
| 0xb58ba0 | online-nex | worker | A | 字符串 "rk::netEmMasterOnlyStatus"/"etwork::netEmMasterSelectProcedure"（Network::netEmMasterSelectProcedure = 网络主控选择流程）；遍历 [r9,#48] 容器：ldr [r6,#-4] 取计数、sub r8,r6,#8 取块头、按 4 字节步长改写各元素 vtable（全局 0xceb7b8+8）；votes quest:3 与串冲突，按串取 online-nex |

## 汇总

- 覆盖：120/120 函数（`.tmp/mhgu/tierB2/slice-01.txt` 全部 `=== ` 条目，地址域 0x46b6d0..0xb58ba0，按文件顺序）。
- label 计数：quest 49、monster-em 21、render-gfx 14、otomo-ot 11、unknown 8、online-nex 5、physics-math 4、audio 2、save-data 2、filesystem 1、item 1、kernel-os 1、ui 1。
- conf：A 17、B 74、C 29。
- role：orchestrator 82、worker 34、thunk 4、leaf 0（本片为 top-by-insns 大函数，块内偶含被并入的转发壳/尾跳壳，故 4 条 thunk）。
- A 级证据分类（17 条）：
  - 字符串 13 条：nNetwork::TagChecker::RpcSyncReq（0xb2dfb4）、plcmdtbllist（0x2733a4）、Resource Loader/decodeProc（0xbc6b44）、mInputR/G/B/A（0xcc87ac）、mInputA/mInputB/mOutput（0xcca0dc）、cOtArmorBase（0xf223c）、cAIGraph/cAIGraph::Node/cAITreeBase（0xc8ec60）、cArmorProcBase（0xd0124）、ReferenceTarget（0xbd7314）、SemaphoreType/TimeSpan 修饰名（0xb4b398）、audio/audio output（0x13c1ccc）、CBHDRFactor/CBScreen/CBROPTest（0xbdac90）、netEmMasterSelectProcedure（0xb58ba0）。
  - 存档原语 1 条：0x198120（bl 0x3df300 94 次循环 + bl 0x3df378，len=136 双块）。
  - Pia 区地址+callee 2 条：0x13a2874、0x134e2bc（均在 0x1311000..0x13ab000，callee 全为 Pia 核心）。
  - 特征立即数 1 条：0xbdf1c（movw #0x1428 取怪物实体子对象，slice-02/06/08 同型处均判 monster-em）。
- 明确冲突（字符串/原语与票数不一致，已按 §8 纪律取硬证据）：0xb2dfb4、0x2733a4、0xbc6b44、0xcc87ac、0xcca0dc、0xf223c、0xc8ec60、0xd0124、0xbd7314、0xb4b398、0x13c1ccc、0xbdac90、0xb58ba0、0x198120（存档原语 vs otomo-ot:5）、0xbdf1c（立即数 vs otomo-ot:1）。票数与硬证据同向的 A 级 2 条：0x13a2874（online-nex:6）、0x134e2bc（online-nex:32）。
- 最不确定的 5 个：
  1. `0x544750` — quest:6 与 audio:6 精确平票，三子对象各带 vtable 的容器构造，标 unknown/C。
  2. `0x5385d4` — quest:3 与 otomo-ot:3 平票，只有 0x276278 单例与 0x3a5ed0 两条通用线索，unknown/C。
  3. `0x161184` — otomo-ot:4/monster-em:4/quest:3 三方平票，正文是 0x88888889 魔数除法 + [r5,#2256] 写入，unknown/C。
  4. `0x13b379c` — 只有 0x7c-0x7e 数学簇 callee 与单例转发壳；被 0x13bd3f4（本片 quest:13）调用，模块归属偏 quest 但本体是数学库转接，暂标 physics-math/C。
  5. `0xb87d58` — 唯一线索是错误串 "Store::OperationNotAllowed"，无法区分存档 store 与道具箱 store，暂标 save-data/C。
- 与相邻片的口径对齐：0x7cf-0x7d9 纯 VFP 簇判 physics-math（0x7d15b8/0x7ee7a0/0x433198），Pia 区判 online-nex（沿用 tierB-slice-14 与 tierB2-slice-03），0x887xxx 资源簇与 0xc1bxxx-0xc22xxx 渲染簇的归属沿用 slice-02/08 的既有判定。
- 无 UNCONFIRMED 占位；本片未写任何代码，未 build/未 git。

