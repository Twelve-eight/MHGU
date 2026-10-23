# Tier B pass2 — slice-03 裁定

输入：`.tmp/mhgu/tierB2/slice-03.txt`（120 函数，按 insns 降序；地址范围 0x4cfa24..0xb8692c）。汇总见文末 `## 汇总`（追加式写入，故置于末尾）。

判据：conf `A`=字符串/反汇编硬证据（类名字串、资源文件名字串、类注册 0x7aedcc、存档原语 0x3df2a8/0x3df378、已知单例 GOT、特征立即数）；`B`=votes 主导（top ≥ 1.6×次席）或明确结构模式；`C`=votes 分票（次席 ≥ 0.6×top）或无线索。Pia 网络库区 0x1311000..0x13AB000 归 `online-nex`（沿用 tierB-slice-14 的既定归属）。

## 表（1-30）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x4cfa24 | unknown | worker | C | votes otomo-ot:1 与 quest:1 平票；callees 仅 0x887810（分配器）与 0x13efdac（运行库壳）；反汇编为多基类构造：str 0x136ed50+8 → [r4,#0]、0x136ed44+8 → [r4,#28]，并把 r5..r12/lr 全置为对象基址；无子系统线索 |
| 0x8cc64c | render-gfx | orchestrator | B | votes render-gfx:5 vs quest:3（1.67×）；callees 含 0xb0804c/0xb09098/0xb091ec/0xb03ff4/0xbd5cc8（0xafx-0xc0x 渲染簇）；入口为 VFP 协处理器指令，段内小函数经 0x7aa47c 单例取 [r1,#32] 并以 r1=504/r2=16 调 blx（资源分配） |
| 0xb24828 | quest | orchestrator | B | votes quest:7 vs otomo-ot:1；对 +0x2fc8/+0x30f0/+0x3218/+0x3340 四个子对象各 bl 0xb25680 构造，再 bl 0x13efdc4 两次 memset（388/64 字节，偏移 +0x2de8/+0x41d8），str -1 → [r4,#0x41c8] |
| 0xbf416c | quest | worker | C | votes quest:1（唯一但极弱）；唯一 callee 0x13efe18 为运行库导入壳；ldr [r2,#16] 后 cmp #49/bhi 走 50 项跳转表（0xbf4190 起 .word 偏移），为消息/类型 id 分派，无子系统旁证 |
| 0x66e6dc | quest | orchestrator | B | votes quest:8 vs otomo-ot:3（2.7×）；callees 含 0x65ca7c/0x65ca84/0x65cb3c（0x65 表访问簇）与 0x570688/0x570710（栈对象构造）；bl 0x65ca84(r4,4,全局 0x11ce198,缓冲,32)，取全局 0x11d218c→[r8]，栈帧 240 |
| 0x199e98 | quest | orchestrator | B | votes quest:7（唯一票源）；入口 cmp r1,#6/bhi 走 7 项跳转表，取全局 0x169eea0→[r0]→bl 0x525878，随后 movw #0x59f2、r9=300 作初始化；callees 0x194228/0x194c80/0x1938bc/0x19c58c 同属 0x19x 簇 |
| 0x54d030 | quest | orchestrator | C | votes quest:5 vs otomo-ot:4（分票）；ldr [r11,#84] 判空后按 [r9,#56] 逐项 bl 0x39b848(...,0)，取全局 0x12ebd18/0x12ebcfc；callees 含 0x618324/0x618b58/0x616ba0（0x61x 簇） |
| 0x6b2aa4 | otomo-ot | orchestrator | B | votes otomo-ot:15 vs monster-em:1；ldrb [r4,#76] tst #1 早退，[r4,#80]==1 时 bl 0x56ea08(r4,3,1,0)；callees 为 0x56e5xx/0x56dxxx/0x56eaxx 簇（0x56 otomo 命令/UI 注册族），取全局 0x11860e8 后 bl 0x55bd0c |
| 0x78ded0 | quest | orchestrator | B | votes quest:12（唯一票源）；取全局 0x10ac934→[r0]→bl 0x19aa88，栈上 +104 处 bl 0x2fcb0 构造；全局 0x10aae9c，movw #0x967f/movt #0x98，and #31 后 ldr [r7,#3900] 索引查表 |
| 0xce8ad4 | render-gfx | orchestrator | B | votes render-gfx:3（唯一票源）；入口 VFP 保存（ed2d8b08），bl 0xb15aa8 访问器返回对象后 cmp [r0,#4],#6，读 [r5,#60]/[r7,#16]；callees 0xb15aa8/0xceb1b4 与 0xcea95c 同一模板 |
| 0x3b123c | monster-em | orchestrator | B | votes monster-em:4 vs quest:2（2×）；ldrb [r6,#80] cmp #4 与 tst [r6,#186],#4 判状态，movw #0x1740/#0x1748 处 strb/str 清零；callees 含 0x27bcd0/0x275a30/0x276140（0x27x 角色对象簇） |
| 0x71a838 | quest | orchestrator | B | votes quest:16 vs otomo-ot:5（3.2×）；ldr [r4,#128] 按 0/1/2 三路分派；全局 0x111eaa4→[r0] 后 ldr [r0,#0x6bfc] tst #16384/#8192、ldr [r0,#0x6c34]（0x6bfc/0x6c34 单例字段）；callees 含 0x72884c/0x729008 |
| 0x433b68 | monster-em | orchestrator | B | votes monster-em:4 vs quest:2（2×）；+0x16d0/+0x16dc/+0x16e0/+0x16e4 处 VFP vldr/vcmp/bge，bl 0x7aedcc（类注册）+ bl 0x7aa47c 单例；callees 0x43bcc4/0x4a2a50（0x43x/0x4a2x 事件行为簇） |
| 0xd175c | item | worker | A | 字符串 "cArmorBuildBase"（防具/装备类名）；反汇编为流写入器：ldr [r4,#12] 位置与 [r4,#16] 上限比较，ldrb [r5,#4]/[r5,#5] 逐字节 strb [r1,r0] 并递增 [r4,#12]，缓冲不足时 blx [r0,#56] 扩容；votes quest:4 与类名不一致，按类名取 item |
| 0x30225c | monster-em | orchestrator | B | votes monster-em:10 vs render-gfx:3（3.3×）；cmp r8,#3 后取 [r5+0x28a8] 子对象并 blx [r0,#1440] 虚调用，bl 0x2f4760；随后把 0 → [r5+0x28b4/+0x28b0/+0x28ac/+0x28a4]；callees 含 0x299f24/0x2a3fdc/0x2a42f0/0x2f53cc（0x29x-0x2ax 角色簇） |
| 0x57ee34 | quest | worker | B | votes quest:4（唯一票源）；and r6,#8/#16/#64 三个标志位分别控制可选字段：bl 0xdb594 取长度、读 ldrh [r0,#4]、再走 0xdae68/0xdaf18/0xdb070（0xdaxxx-0xdbxxx quest 数据簇）；4 callees |
| 0x81b938 | online-nex | orchestrator | A | callees 0x130dc60/0x130e254/0x134f43c/0x1374504/0x138e9ac/0x138e9d8/0x13ae6b8 全落在 Pia 网络库区 0x1311000..0x13AB000（已核验种子），仅 0x13efe00/0x13efe30/0x13efd88 为导入壳；栈帧 420+2048，按 [r11,#396] 0/1 两路分派；votes otomo-ot:14 与之冲突，按 Pia 区取 online-nex |
| 0xa867d8 | render-gfx | orchestrator | C | votes quest:10 vs render-gfx:9（分票，次席 0.9×top）；bl 0x13efdc4 清 192 字节后 bl 0x8c98b4，再 bl 0x8cc64c（本片 render-gfx），取 [r4,#52] 对象 blx [r1,#156]；callees 含 0xaeeb70/0xaed74c/0xaf938c（0xae-0xaf 渲染簇） |
| 0x58910c | quest | worker | C | votes quest:1（弱）；唯一 callee 0xdd468；r4/r6 双非空后 ldrb [r5,#81] tst #64，连续 bl 0xdd468(r4,0)/0xdd468(r4,1) 与 r6 比较（0xddxxx quest 数据簇访问器） |
| 0x72db48 | quest | orchestrator | B | votes quest:17 vs otomo-ot:1；连续 bl 0x65ca84(r4, idx, 全局表 0x1111acc/0x1111ab4/0x1111984, 0) 以 idx=0/1/2 逐项注册（0x65ca84 表项注册模式）；callees 含 0x72e294/0x72e970/0x730110/0x72f13c（0x72x 簇） |
| 0xb47b1c | render-gfx | orchestrator | B | 字符串 "MetaSet"（渲染资源元数据族，同级 rMaterial 0xb455d0/rModel 0xb49c1c 资源簇）；反汇编按键值去重：blx [vtable+20] 取键后比较 [r0,#28] 与 [r4,#20]，命中则 bl 0x7bb3ec 在栈上构造属性描述符并 blx [vtable+16]，再遍历 [r4,#32]；callees 含 0xc88f8c/0xc88f94/0xc88fb0（MetaSet 属性数据簇）与 0x7bb7b8/0x7bb638；votes quest:18 系 0xb4x 资源簇整体传播，取独立证据 |
| 0xc646b0 | render-gfx | orchestrator | B | votes render-gfx:9 vs quest:2（4.5×）；比较 [r10,#60] 与 [r10,#68] 后在容器内查找：blx [r0,#80] 取项，按 [r9,#12]/[r9,#16] 与 [r6,#12]/[r6,#16] 成对比较，命中后 add r8,r6,#64；callees 含 0x8e7724/0x8e76d0/0x8e281c/0xa57f14（0x8ex/0xa57x 簇） |
| 0x6e1368 | quest | orchestrator | B | votes quest:11 vs monster-em:2（5.5×）；ldrb [r4,#60] 作索引取 ldrsb [r4+r0,#2]，全局 0x11579ec→[r0]→bl 0x275a30；两次 bl 0x13efdc4 各清 36 字节栈结构，全局 0x1157fd4→[r0]→bl 0x148880；callees 含 0x148340/0x1488bc/0x1488e8（0x148x 数据簇）与 0x143894/0x1444b4 |
| 0x773cf4 | quest | orchestrator | B | votes quest:17 vs otomo-ot:1；ldrh [r5,#176] 与 ldrb [r5,-3]/[r5,-2]/[r5,-291] 经 mla 合成索引后 ldrb [pc,r0,ror r0] 查字节表；ldrb [r4,#63] cmp #2 分派，全局 0x10c4e74→bl 0x2613c0；callees 含 0x2603fc/0x26015c/0x25d5d8（0x25x-0x26x 簇） |
| 0x8a4358 | quest | worker | B | votes quest:3 vs monster-em:1/render-gfx:1（3×）；VFP 保存后取全局 0xf9da14→bl 0x7aa47c 单例，经 vtable+52 释放 [r4,#248] 并清零 [r4,#248]/[r4,#268]；[r4,#244] 非空时 ldrsh [r1,#4] 并处理 +252 数组；callees 0x7cc110/0x7cbfe8（0x7cx 簇） |
| 0xa8b3a8 | render-gfx | orchestrator | B | votes render-gfx:5 vs quest:3（1.67×）；bl 0xa6a2cc 后读 [r4,#18] tst #2、[r4,#144]、tst r7,#64，再取 [r5,#52]→[r0,#68] lsr#16 作计数循环；callees 含 0xaed74c/0xaf938c（0xae-0xaf 渲染簇）与 0xa6a2cc/0xa6a434/0xa6b21c |
| 0xb55cc8 | quest | orchestrator | B | votes quest:5（唯一票源）；析构 3 字长对象数组：基址 [r9,#28]，[r0,#-4] 为元素数，sub #24/#20/#4 取各字段，sub r0,r1,r1,lsl#2 算步长，逐项 str vtable 0xcee5e8+8 到 [r6,r7] 并读 ldrb [r5,r7]；callees 0x7bb638/0x8870b8/0x13efdc4 |
| 0xcea95c | render-gfx | orchestrator | B | votes quest:8 vs render-gfx:2（票数与结构冲突）；与 0xce8ad4 完全同模板：bl 0xb15aa8 取记录后 ldr [r0,#4]，此处 cmp #19（0xce8ad4 为 #6），读 [r5,#60]/[r10,#16]；callees 0xb15aa8/0xceb1b4（0xb15x/0xcebx 记录簇）与 0x7bb3ec/0x7bb408/0x7afafc；按同模板取 render-gfx（详见汇总冲突条目） |
| 0x19c58c | quest | worker | C | votes quest:1（弱）；入口 mov r2,#0 后 b 0x19c594（并入同一函数体），唯一 callee 0x194228；全局 0x169c60c→[r0]→bl 0x194228 按 id 查找，随后 ldrh [r7,#26] 与入参 r4 比较、add r10,r7,#96 遍历子表；无独立子系统证据 |
| 0x410df8 | monster-em | orchestrator | B | votes monster-em:10 vs quest:2（5×）；VFP 保存（ed2d8b0a）后 bl 0x4a1b6c，把 [r4,#64]/[r4,#68]/[r4,#72] 拷到 [r4+0x1000]/[r4+0x1004]/[r4+0x1008] 并清 [r4+0x100c]；callees 0x43bcc4/0x4a2a50/0x4a1d34/0x4a1e50/0x40b10/0x40b50（0x4ax/0x40x 事件簇），含 bl 0x7aedcc |

## 表（31-60）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x7a0230 | quest | orchestrator | B | votes quest:18 vs otomo-ot:4（4.5×）；ldr [r4,#128] 后 tst #16384/#8192 两路分支，add r5,r4,#340、ldr [r4,#132]；入口 cmp r1,#4/bhi 走 5 项跳转表；callees 含 0x79f620/0x7a60dc/0x7a6554/0x7a69cc（0x79x-0x7ax 簇） |
| 0xb39448 | filesystem | worker | B | votes quest:5 与 kernel-os:1（票数弱且与结构冲突）；构造函数清零 [r0,#12]/[r0,#60]/[r0,#92..100]/[r0,#4]、写 [r0,#24]/[#28]/[#56]，随后 b 0x121dc7c(r1=pc 相对表, r2=56)；callees 0x121fbd4/0x121dd8c（0x121dd8c 即 zlib inflate worker）→ 0x121x 压缩/流簇，取 filesystem |
| 0x1181ef0 | render-gfx | orchestrator | B | votes render-gfx:7 vs monster-em:4（1.75×）；movw #0x274a 处 ldrb [r1,r0]/[r2,#-1]/[r2,#2] 经 orr 拼 24 位并 orr #64 → strb [r2,#0]，清 [r1,#230]，再 cmp #3 走跳转表 —— 与 slice-02 的 0x11bde84 完全同模板（该处判 render-gfx） |
| 0x29244 | otomo-ot | orchestrator | B | votes otomo-ot:6 vs monster-em:3（2×）；[r5,#2140] 判空后写 1.0f(1065353216)→[r5,#1152]、40.0f(0x42200000)→[r5,#1148]、strb 1→[r5,#1136]、strb 0→[r5,#1082]、清 [r5,#1140]/[#1144]/[#1160]；bl 0x22780/0x1c6d4/0x1eadc/0x1c5fc（0x1cx 簇） |
| 0x43144c | monster-em | orchestrator | B | votes monster-em:13（唯一主导）；VFP 保存（ed2d8b0e），cmp r1,#3/#2/#1 三路状态分派，movw r8,#0xffff，ldr [r4+0x15e0] 后 bl 0x4a2744；callees 含本片 0x433b68 及 0x4330dc/0x433198/0x4338c4/0x43b870/0x4a1d34（0x43x/0x4ax 簇） |
| 0x68dff8 | quest | orchestrator | C | votes quest:8 与 otomo-ot:8 平票；cmp r2,#8/bhi 走 9 项跳转表；取全局 0x11ab2f4→[r0]→ldr [r0,#0x6bfc]（quest 单例 0x6bfc 字段）后按表项 add pc 分派；callees 含 0x65cb3c/0x65f118/0x65f190/0x6b6d0c/0x6b6b98 |
| 0xb8f1c0 | quest | worker | C | votes quest:3（弱）；清零 8 个栈槽后 bl 0x7bb638 分配对象，写入 pc 相对 vtable/数据指针 [r0,#0] 与打包字 0x01000006、[r0,#4]=r10；callees 仅 0x7bb638/0x7aedcc（类注册）/0x7aa47c，无子系统指向 |
| 0x53d3e4 | quest | orchestrator | B | votes quest:7 vs monster-em:3（2.3×）；bl 0x9232c8 后取全局 0x1301b0c+8 → [r0,#0] 作 vtable，清零 [r0,#976]/[r0,#984]/[r0,#52] 并 strb [r0,#980]；callees 含 0x92289c/0x921ea4（0x92x 成员簇）与 0x7aedcc 类注册 |
| 0xcb8c0c | render-gfx | worker | C | votes render-gfx:1 与 monster-em:1 平票；VFP 保存后取全局 0xb7ff18→[r2,#0]，ldm {r4,r8}，再读 [r6,#112]→ldrb [r1,#80]/[r1,#84]，movw #0xfffe 与 VFP 转换后 cmp #2；callee 0xafa6dc 属 0xafx 渲染簇 |
| 0x215aa0 | monster-em | worker | B | votes monster-em:2 vs quest:1（2×，票数很少）；在 sp+4 构造 16 字节描述符：bl 0x9fba6c，全局 0x1625f8c+8 → [sp,#4]，把 r5/r7/r6 与栈参数依次写 [sp,#12]/[#16]/[#20]/[#24]/[#28]；callees 0x9fba6c/0x9fc3d8/0x7bb638 |
| 0x7c98c4 | online-nex | worker | C | votes online-nex:1（唯一但极弱）；唯一 callee 0x13efd88 为导入壳；反汇编为 UTF-16 串长度扫描：ldrh r6,[r12,#0] 后循环 ldrh r2,[r0,#2]/add r1,#1 直到 0，movw #0xfffe 作哨兵；无独立子系统证据 |
| 0x131b4c8 | online-nex | orchestrator | A | 函数地址 0x131b4c8 与 callee 0x1395368 均落在 Pia 网络库区 0x1311000..0x13AB000（已核验种子）；反汇编为构造：vtable 全局 0x52c6f4+8/0x525ae0+8 → [r4,#0]/[r4,#572]，strh 0xffff → [r4,#8]/[r4,#10]，[r4,#580]=128 其余清零；votes otomo-ot:1 与 online-nex:1 平票，按 Pia 区取 online-nex |
| 0x258800 | quest | orchestrator | C | votes quest:4 与 otomo-ot:4 平票；析构式释放：movw #0x2b2c/#0x2b30/#0x2b34 逐个取 [r4+off]，非空则 bl 0x887660 释放并清 [r5,#0]；callees 含 0x3f8a20/0x3f8398/0x3f8678/0x3f8634（0x3f8x 簇）与 0x26fe44/0x26fddc |
| 0x4d5e90 | monster-em | orchestrator | B | votes monster-em:6 vs quest:3（2×）；ldrb [r11,#4] 与 [r11,#356] 判空后取 [r1,#12] and #7、sub #1/cmp #1（类型 1/2 门控），再读 [r11,#8]；add r0,r11,#432、movw lr,#0x4b4、VFP 装载；callees 全为 0x4d6xxx/0x4d9xxx/0x4f0xxx/0x4f1xxx 行为簇 |
| 0x744bc0 | quest | orchestrator | B | votes quest:7（唯一票源）；movw #0x15d8 取子对象存 [sp,#24]、对象基址 [sp,#32]，随后 bl 0x524b98/0x4ca72c/0xe51c/0x4c050c（0x4cxxxx/0x524x 簇）与 0x7aa47c 单例、bl 0x13efd7c/0x13efdd0；栈帧 52 |
| 0x9ee244 | quest | worker | C | votes quest:3（弱）；callees 仅 0x13efdc4/0x7aa47c/0x887660；反汇编为字节字段归并：ldrb [r0,#148..#153] 依次比较取最大值并 str → [r0,#696]；无子系统线索 |
| 0xc3804c | render-gfx | orchestrator | B | votes render-gfx:9 vs quest:4（2.25×）；callees 全为 0xc1xxx/0xc2xxx/0xc4xxx（0xc17a14/0xc1c4a8/0xc47f50/0xc1703c/0xb79968/0xc1bf24/0xc1c2e0，与 slice-02 的 0xc26af0/0xc411cc 同族）；VFP 保存（ed2d8b10）+ 648 字节栈帧，mov r0,#21、vtable 0xc029f8+8 |
| 0x13e7eec | online-nex | worker | A | 字符串 "stale"/"realm"/"opaque"/"algorithm"（HTTP Digest 认证参数，libcurl 原文）→ Nexus HTTP 层；反汇编为哈希桶链表删除：ldr [r5,#8] 取表头，比较 [r1,#0] 与 r4 后 bl 0x13e404c 并把 [r5,#4] 计数减 1；callees 0x13cbe80/0x13d7484/0x13d74ac（libcurl 区 0x13c3044..0x13e8b58） |
| 0xa06fc | monster-em | orchestrator | B | votes monster-em:13（唯一主导）；movw #0x1428 取角色对象，ldrb [r0,#1360] 判空，ldr [r0,#1356] tst #2/#4 分别 bl 0xc0644/0xb1534；callees 含 0xb0a24/0xbf7d8/0xc0410/0xc10cc/0xbd570（0xbx-0xcx 簇） |
| 0x1cd470 | quest | worker | B | 字符串 "cMediate"（类名）+ bl 0x7aedcc 类注册/0x7aa47c 单例；反汇编对 [r0,#4]/[r0,#8]/[r0,#12] 三个子对象在 [r2,#16]==1 时把 [r2,#8..14] 四个 halfword 置 0xff7f 哨兵；votes quest:2 vs monster-em:1，票数少，类名不指向具体子系统 |
| 0x70d08c | quest | orchestrator | B | votes quest:15 vs otomo-ot:2；取全局 0x112c270→[r0]，同时 ldr [r0,#0x6bfc] 与 ldr [r0,#0x6c34] 并 orr（quest 单例字段），VFP 比较后取全局 0x112bca8；callees 含 0x70cb30/0x70cee8/0x70d748 与 0x199e98（本片 quest）、0x1990dc/0x19c21c |
| 0xbfd2b0 | quest | worker | C | votes quest:2（弱）；callees 仅 0x13efd7c（清块）/0x13efdc4（memset）；把 0 写入两个输出参数 [r2]/[r3]，再比较 [r4,#852] 与 [r4,#864] 并 blx [vtable+12] 取状态 cmp #1；字段 820/836 无子系统指向 |
| 0xa8d90 | monster-em | worker | B | votes monster-em:2 vs otomo-ot:1（2×，票数少）；movw #0x1428 与 #0x1054 取角色对象/子对象（0x1428 为角色对象标志偏移），r1 按 0/1 两路分派；全局 0x178ffb8→bl 0x276748 取对象后比较 ldrb [r5,#0x1054] 与 [r4,#0]；callees 0x276748/0x2f7ad8/0x2f7ae4 |
| 0xc12de0 | quest | worker | C | votes quest:1（弱）；唯一 callee 0xc99360；按 20 字节步长遍历（add r0,r0,r0,lsl#2 再 lsl#2）从 +1008 起的数组，逐项取 [r6,#852] 指针与 +864 指针数组 ldr [r0,r10,lsl#2]；无字符串 |
| 0x5b15dc | ui | orchestrator | A | 字符串 "cUIOHunterNote"（UI 类名，cUIO 前缀）；首段 ldrb [r0,#88] cmp #2 返回 0/1；第二段经 0x7aa47c 单例取 [r1,#32] 并以 r1=92/r2=16 调 blx（资源分配），bl 0x56d97c 后清 [r0,#76]/[r0,#84] 并装 vtable 0x128e15c+8；votes otomo-ot:12 与类名冲突，按字符串取 ui |
| 0x67e6b4 | otomo-ot | orchestrator | B | votes otomo-ot:7 vs quest:1（7×）；ldr [r5,#4] 后 cmp #20 置标志、cmp #8/bhi 走 9 项跳转表；取全局 0x11bac24→[r0]→ldr [r0,#0x6bfc]（单例字段）+ 常量 0x01002000；callees 含 0x65f118/0x65f190/0x65f270/0x65e794/0x54f260（0x54x/0x65x 簇） |
| 0x8320a8 | quest | orchestrator | B | votes quest:10 vs audio:2（5×）；哈希表插入/查找：r6 非空时经 blx [vtable+20] 取键 ldr [r3,#28]，与 [r9,#268] 表项（ldr [r1,r2,lsl#2]→[r3,#0]）比较，必要时自递归 0x8320a8 扩容；callees 含 0x7bb3ec/0x7bb408/0x7bb7b8/0x7b18f0 |
| 0xaf4280 | render-gfx | worker | C | votes quest:7 与 render-gfx:7 平票；callees 全为 0xaexxxx/0xafxxxx（0xaefe60/0xaec63c/0xaf04c0/0xaf10fc/0xaf488c 等 14 个，其中 0xaf10fc 本片判 render-gfx）；反汇编 bl 0xaefe60 后装 vtable 0xd4f860+8 → [r0,#0]，把 +536 起 5 个 dword 重写并 orr #134217728（构造）；按簇取 render-gfx，票数平票故 C |
| 0xbcb6bc | filesystem | worker | B | votes quest:4 vs online-nex:1，但与本片 0xbcb0d0 指令模板完全一致：同样取 [sp,#40..#48] 参数、tst #32768/#16384/#8192 选 1024/768/512/256 并写 [r9,#92]/[r8,#88]；0xbcb0d0 含路径格式串 "%s\%s.%s" 与 0x82xx-0x83xx 文件流 callees（A 证据），故按同族取 filesystem（票数存疑） |
| 0xc24b94 | render-gfx | orchestrator | B | votes render-gfx:8 vs monster-em:1/quest:1（8×）；VFP 保存（ed2d8b10），ldrb [r4,#644]/[r4,#808] 两道门控，ldr [r4,#760]、add r8,r4,#736，再从 +812 起 vldr 6 个浮点做向量运算；callees 0xc47f50/0xc1703c/0xb79968/0xc1bf24/0xc1c2e0（0xc1x/0xb79x 渲染簇） |

## 表（61-92）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xf0ab0 | otomo-ot | worker | A | 字符串 "cOtArmorProcBase"（cOt 前缀 = otomo 防具处理基类）；首段构造：bl 0xda0cc 后 [r0,#4]=0、vtable 全局 0x1749454+8 → [r0,#0]；后续段装 vtable 0x174941c+8/0x1749414+8 并经 0x7aa47c 单例取 [r1,#52] 尾调用；votes quest:6 与类名冲突，按字符串取 otomo-ot |
| 0x40d600 | monster-em | orchestrator | B | votes monster-em:15 vs quest:1（15×）；入口 str vtable 0x142f8b8+8 → [r0,#0] 后尾跳 b 0x43b488；第二段以 vtable 0x142f898+8 构造并 bl 0x43b488，再经全局 0x142f884→bl 0x7aa47c 单例取 [r1,#52] 尾调用；callees 0x4a1c78/0x4a1b6c/0x4a1d34/0x4a1e50/0x4a2744（0x4ax 簇） |
| 0x9b5158 | quest | worker | B | votes quest:3 vs monster-em:1/render-gfx:1（3×）；析构：vtable 0xe8d964+8 → [r4,#0]，[r4,#244] 非空则 bl 0x887660 释放并清零，末尾尾跳 b 0x8a770c；callees 0x7aa47c/0x72ea8/0x29d48 |
| 0x9f481c | unknown | worker | C | votes render-gfx:1 与 quest:1 平票；callees 仅 0x887a24/0x7bb638；构造：bl 0x887a24 后 bl 0x7bb638 分配，写 pc 相对 vtable（0x9f4de4→0xb82c6c）与打包字 0x08000006、[r0,#12]=全局 0xe4e83c、[r0,#16..#24]=0、[r0,#28]=88（子块大小）、[r0,#32]=1；无子系统线索 |
| 0xb10f98 | render-gfx | worker | B | votes render-gfx:2（唯一票源）；取全局 0xd2dff0 两次并把两者之和写 [r3,#4]，cmp r2,#12 分派；callees 0x86a438/0x882674（0x86x/0x88x 数学/渲染簇）；movw #0x1360/#0xbaf3/#0x1afa 特征立即数 |
| 0x70301c | quest | orchestrator | B | votes quest:21 vs otomo-ot:3（7×）；movw #0x20bc/#0x20bd/#0x20be/#0x20bf 取四个 ldrb 并用 mla/mul 与 ldrh [r9,#177] 合成多维索引（表内定位），movw #0x1f71 再取一字节；callees 大量 0xdaxxx-0xddxxx（quest 数据簇）+0x143894/0x147b80/0x1990dc |
| 0x78565c | quest | orchestrator | B | votes quest:19 vs otomo-ot:2（9.5×）；析构：vtable 全局 0x10bb630+8 → [r4,#0]，movw #0x3b80 处成员非空则 blx [vtable+4] 释放并清零，随后对 +0x3af8/+15040/+0x39f0 子对象逐个 bl 0x53e820/0x53e198/0x53f378；callees 含 0x56dfac/0x570688/0x65ca84 |
| 0x196604 | quest | worker | C | votes quest:1/otomo-ot:1/monster-em:1 三方平票；callees 0x14bba8/0xdad24/0x3f8358（0xdad24 属 quest 数据簇）；入口 cmp r1,#9/bhi，mla r2,r1,#500,r0 按 500 字节步长定位后 ldrsb [r2,#3] cmp #5 走 6 项跳转表，movw #0x103c/#0x161 作行内偏移；票数平票故 C |
| 0x25c288 | quest | orchestrator | B | votes quest:15 vs otomo-ot:2（7.5×）；movw #0x8a7e/movt #0x4 与 ldrh [r0,#177] 判空，随后用 +0x48a7d/+0x48a7c/+0x48a79 三个成员偏移、ldrb 与 cmp #83 走跳转表；callees 大量 0xe8xxx/0xe9xxx（0xe8x-0xe9x 簇）+0x256e4c/0x25c884/0x3f8344 |
| 0x588b10 | quest | worker | C | votes quest:1（弱）；唯一 callee 0xdd634（0xddx quest 数据簇）；入口 cmp r10,#0、cmp r6,#11/bhi 后 12 项跳转表（0x588b50 起 .word 偏移），无字符串/无其他线索 |
| 0xc4d86c | otomo-ot | worker | C | votes otomo-ot:1（唯一但极弱）；唯一 callee 0x13effc8 为导入壳；反汇编按 [r11,#0x5a1c] 计数与 +0x4384 指针表做 add r1,r0,r2,lsl#2 索引，再检查 [r4,#0x5a48] 与 [r12,#0]；无子系统旁证 |
| 0x344c4 | filesystem | worker | B | 字符串 "cDLCUpdateInfo"（DLC 更新信息记录类名；同族 rDLCPackage/DLC 路径表在 slice-07 判 filesystem）；反汇编为记录赋值：拷贝 [r5,#4]→[r4,#4]，比较 [r5,#8]/[r4,#8] 后按项循环，元素数==1 时经 0x7aa47c 单例取 [vtable+52]；callees 0x7bb638/0x7aedcc/0x33e60；votes quest:6 与类名不一致 |
| 0x3fa930 | monster-em | orchestrator | B | votes monster-em:8 vs quest:2（4×）；VFP 保存（ed2d8b0c）后 bl 0x4a1b6c，movw #0x15e8 处 ldr [r4,r0] tst #2，movw #0x15f0 起 VFP 转换；callees 0xbe5d4/0x3fa7c4/0x43bcc4/0x4a2a50/0x4a1b6c（0x3fx/0x4ax 事件簇） |
| 0x1a8d70 | otomo-ot | worker | B | callees 含 0x1c55f4 与 0x1c6984 —— 类表登记为 rMonNyanAdventItem / rMonNyanLotAdvent 的构造函数（MonNyan=otomo 猫探险资源），0x1c8b00/0x1c8b08/0x1ba6bc 同簇；反汇编 mov #456/#76 与 ldrb [r0,#8]/[r0,#9]/[r0,#10] 标志判定；votes quest:7 与 callee 类簇冲突，按资源类取 otomo-ot |
| 0x828cf8 | filesystem | worker | A | 字符串 "Folder"（目录/资源句柄名）；反汇编为释放：比较 [r4,#56] 与全局 0x10183d8（同值则返回），[r4,#64] 非空时经全局 0x101071c→[r0,#32]→blx [vtable+52] 释放并清零，再 bl 0x13f03e8([r4,#56]) 关闭句柄、[r4,#60]=0；votes quest:2/save-data:1 |
| 0x889478 | quest | worker | C | votes quest:2 vs render-gfx:1（票数很少）；callees 0x7aedcc（类注册）/0x7aa47c/0x887958；反汇编为双向链表摘除：取 [r1,#4] 顺 ldr r3,[r4,#0] 走到表尾，再回写 [r12,#8]=[r4,#8]；通用容器代码，无子系统线索 |
| 0x2bc10 | quest | orchestrator | B | votes quest:21 vs otomo-ot:2（10.5×）；流式写出器：虚拟 blx [r0,#12]，取 [r4,#12] 位置与 [r4,#16] 上限比较，满则 blx [r0,#56] 扩容，strb [r1,r0] 后位置 +1；callees 含 0x8260d4/0x826130/0x82772c/0x827998/0x8277c4（0x82x 文件流簇）与 0x7aedcc/0x7bb638 |
| 0x1da264 | quest | orchestrator | B | votes quest:8 vs otomo-ot:3（2.7×）；ldrb [r4,#1048] cmp #6/bhi 门控，bl 0x80ca9c(r5,栈缓冲,40) 填 40 字节，再 bl 0x80c958(...,19,缓冲,40)，索引用 rsb r0,r0,r0,lsl#4（×15）；callees 含 0x80c710/0x80c958/0x8103b8/0x8389e0（0x80x-0x83x 簇） |
| 0x410808 | monster-em | orchestrator | B | votes monster-em:18 vs quest:1；入口 str vtable 0x142c6f8+8 → [r0,#0] 后尾跳 b 0x43b488；第二段用 vtable 0x142c6d8+8，bl 0x43b488 后经全局 0x142c6c4→bl 0x7aa47c 取 [r1,#52] 尾调用；callees 含 0x4a1b6c/0x4a1c78/0x4a1d34/0x4a1e50/0x4a2744/0x410df8（本片） |
| 0x72e970 | quest | orchestrator | B | votes quest:14 vs otomo-ot:4（3.5×）；取全局 0x110a98c→[r0]，同时 ldr [r0,#0x6bfc]/[r0,#0x6c34] 并 orr（quest 单例），cmp r7,#4 走 5 项跳转表，str 0 → [r0,#1672]；callees 含 0x72fe84/0x72ff20/0x72f13c（0x72x）与 0x19d740/0x19b7fc/0x19c21c |
| 0xd31e4 | save-io | worker | C | 唯一 callee 0x8261fc（存档/文件流原语，与 slice-02 的 0x104978/0x10c588/0x395850 同模板）；流反序列化：[r5,#12] 位置与 [r5,#16] 上限比较，满则 bl 0x8261fc 重填，ldrb [r1,r0] → strb [r4,#4] 并递增位置，随后重复写 [r4,#5]；votes otomo-ot:1 为传播票，按结构判 save-io |
| 0x275a68 | quest | orchestrator | B | votes quest:32 vs online-nex:6（5.3×）；cmp r7,#5/bhi 走 6 项跳转表、cmp r6,#3/bhi 门控，add r0,r9,r6,lsl#2 后 ldr [r0,#28] 判空；callees 含 0x2b33b4/0x298b40/0x28edc0/0x26e600/0x288248/0x27acd8（0x26x-0x2bx 簇） |
| 0x474674 | monster-em | orchestrator | B | votes monster-em:12 vs quest:2（6×）；movw #0x136c 取子对象，ldrh [r5,#32] 与全局 0x13c4530→[r0]→bl 0x5ceb4（sEnemy 类域 0x5c970..0x5caa8），ldrsh [r5,#2] 与 255 哨兵比较后 blx [r1,#84]；callees 含 0x4a1b6c/0x4a3060/0x4a31f0/0x53a058 |
| 0x4ad8cc | quest | orchestrator | B | votes quest:12 vs otomo-ot:3（4×）；取全局 0x138b49c→[r0]→[r0] 判空后，ldr [r4,#36] cmp #17 走 18 项跳转表（多项指向同一 0x48 偏移）；callees 含 0x4ac7e8/0x4afb98/0x4afaa4（0x4ax 行为簇）与 0xdaba4/0xdcba8/0xdaf90（0xdaxx 数据簇） |
| 0xb0bf7c | quest | worker | B | votes quest:3（唯一票源）；callees 0x7aa47c/0xb04a68/0xb0bcb4；1024 字节栈缓冲，取全局 0xd33008 两次求和后 str [r10,#4]，[r10,#20] 判空后经全局 0xd37c58→bl 0x7aa47c；无字符串 |
| 0xbcb0d0 | filesystem | orchestrator | A | 字符串 "%s\%s.%s"（Windows 路径拼接格式）；反汇编取 [sp,#1648..#1656] 三参后按 tst #32768/#16384/#8192 选 4/3/1/2 模式并写 [r4,#92]/[r8,#88]，随后调用 0x8296e0/0x82a440/0x838008/0x83805c/0x83824c/0x838168（0x82x-0x83x 文件流簇）；votes save-data:7 vs quest:5 分票，按字符串取 filesystem |
| 0x134da98 | online-nex | orchestrator | A | 函数地址 0x134da98 与 callees（0x130cdcc/0x130ca20/0x130ca48/0x130cb64/0x13101e0/0x13128f4/0x134cc8c/0x134ce38/0x134d28c/0x13a7be4，除 0x13f0f7c 导入壳）均落在 Pia 网络库区 0x1311000..0x13AB000；反汇编 bl 0x130cdcc(r5+832) cmp #1，再对 +952/+1000 调 0x13a7be4 并写 [r5,#1048]/[r5,#1052]；votes online-nex:29 一致 |
| 0x13b63c0 | online-nex | worker | C | votes quest:4 与 online-nex:4 平票（render-gfx:3 次之）；callees 0x7e6b0c/0x7e6ecc/0x7f081c/0x7f0ab4/0x7f0da8/0x7f1cb4/0x7f2148/0x7f2324（0x7ex-0x7fx 簇，与 slice-02 的 0x7e493c online-nex 同簇）；反汇编为单例转发：全局 0x492244→bl 0x7aa47c→ldr [r1,#32]→bx r12；按 callee 簇取 online-nex，票数平票故 C |
| 0x2bbc1c | render-gfx | orchestrator | C | votes render-gfx:13 vs monster-em:9（分票，次席 0.69×top）；movw #0x2749/#0x274a 处 ldrb [r3,r2]/[r1,r0]/[r3,#2] 后 orr 拼 24 位、orr #256、lsr #8、strb [r1,#0] —— 与 slice-02 的 0x11bde84（render-gfx）同一位域模板；callees 0x2a6760/0x282fd8/0x2a25a8/0x2b71ac（0x2ax 簇） |
| 0x4eaac0 | quest | orchestrator | B | votes quest:8（唯一票源）；ldr [r11,#356] 后 bl 0x27b3f4 cmp #1 门控，movw #0x1052 取 ldrb，全局 0x134e0b4→[r0]→bl 0x3f8634，movw #0x1119 处 strb 0；callees 含 0x4d5dc0/0x4d5e30（0x4dx 行为簇）与 0x152960/0xdf814 |
| 0x77174c | quest | orchestrator | B | votes quest:25 vs otomo-ot:3（8.3×）；ldr [r4,#4] 后按 r1=2/1/0 三路分派，主路 ldr [r4,#76] 依次 tst #16384/#8192/#4096，mov #352、ldr [r4,#80]、ldrb [r4,#350]/[r4,#349]；callees 含本片 0x773cf4 与 0x2613c0/0x773c68/0x76f9dc/0x76ff9c（0x76x-0x77x 簇） |
| 0xb7591c | render-gfx | worker | B | votes render-gfx:2（唯一票源）；与 0xb75f04/0xb764ec/0xb76ad4 四联同模板：124 字节栈、ldr [r9,#88]、cmp r0,#6 后 ldm/stm {r3,r5,r7} 传 3 参、bl 0xb770bc，pc 相对表 0xcced58；无字符串 |

## 表（93-120）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xb75f04 | render-gfx | worker | B | votes render-gfx:2（唯一票源）；同族模板（见 0xb7591c）：指令序列逐条一致，仅尾调 0xb77538、pc 相对表 0xcce770；cmp r0,#6 门控 + ldm/stm 传参 |
| 0xb764ec | render-gfx | worker | B | votes render-gfx:2（唯一票源）；同族模板：尾调 0xb779b4、pc 相对表 0xcce188；124 字节栈、ldr [r9,#88]、cmp #6 |
| 0xb76ad4 | render-gfx | worker | B | votes render-gfx:2（唯一票源）；同族模板：尾调 0xb77e30、pc 相对表 0xccdba0；其余指令与 0xb7591c 逐条一致 |
| 0xbe61c8 | quest | orchestrator | B | votes quest:6 vs online-nex:2（3×）；全局 0xc569dc→[r0]→[r0,#0]→[r0,#28] 取管理器，经 blx [r1,#8]([r5,#208]) 取得对象存 [r5,#2640]，非空时 ldrb [r5,#2656] tst #15 → blx [vtable+12]；含自递归 0xbe61c8 与 0xbe67b0/0xbe6b84/0xbe696c |
| 0x14d9f8 | quest | worker | C | votes quest:1 与 monster-em:1 平票；callees 0x3ea2b0/0x3ae744；ldr [r5,#28] 按 3/2/1 三路分派，主路取全局 0x16eb188→[r0]→[r0,#28] 再 cmp #6/#3，并取全局 0x16eb2d8→bl 0x3ea2b0(...,2,r4)；无字符串 |
| 0x3cfd74 | quest | worker | B | votes quest:4 vs monster-em:1（4×）；按 16 字节元素操作表：比较 [r6,#4] 与 r8 索引，ldr [r6,#12] 后 add r5,r0,r8,lsl#4，bl 0x3cebdc(r5)，再以 [r5,#8] 更新 [r6,#32] 上限；callees 0x3cebdc/0x7aedcc/0x2b8f0 |
| 0x7d9060 | render-gfx | worker | B | votes render-gfx:2（唯一票源）；VFP 保存（ed2d8b06）后把栈缓冲交 bl 0x2332ac 变换，再从 [sp] 起 vldr 8 个浮点做 vmul/vsub（矩阵/向量运算），读 [r5,#64]；含自递归；callee 0x2332ac |
| 0x7e74f4 | quest | worker | C | votes online-nex:1 与 quest:1 平票；callees 0x7d15b8/0x7e7ad8（0x7e7ad8 在 slice-07 判 quest 且同模板）；VFP 保存（ed2d8b02）+1056 字节栈，取 [r11,#8..#16] 参数后连续 vsub/vcmp 并 bpl 分支，读 [r5,#64]；按 callee 取 quest，票数平票故 C |
| 0x87642c | quest | orchestrator | B | votes quest:11 vs audio:2（5.5×）；析构 84 字节步长数组：[r4,#112] 基址、[r4,#108] 计数，循环 ldr [r0,r7] 非空则 bl 0x887660 释放并 str 0，r7+=84；callees 含 0x8260d4/0x826130/0x82710c/0x82772c/0x827998/0x827cd0（0x82x 簇），含自递归 |
| 0x1191da0 | render-gfx | orchestrator | C | votes render-gfx:6 vs monster-em:4（分票，次席 0.67×top）；与 0x1181ef0 同一位域模板：movw #0x274a/ldrb [r2,#-1]/[r2,#2] → orr 24 位、orr #64、strb [r2,#0]，清 [r1,#230]，再按 r1==1/0 两路分派；callees 0x282fd8/0x283238/0x281998/0x2a2db4（0x28x-0x2ax 簇） |
| 0x2b29dc | unknown | worker | C | votes online-nex:2/save-data:1/otomo-ot:1/monster-em:1（票数少且无共识）；callees 0xe1a74/0x2ee144/0x27c6f8/0x282f58/0x2e1348；反汇编为标志读取：ldr [r0,#0x13c4] 后 add #4、bl 0xe1a74，ldrh [r0,#4] and #1 返回；同段还有若干 `mov r0,#0; bx lr` 空桩与一个 blx [r1,#348](27) 转发；无子系统指向 |
| 0x321f9c | quest | orchestrator | B | votes quest:9 vs audio:2（4.5×）；容量增长：ldr [r5,#8] 与 r4 比较，不足时取全局 0x1516b9c→bl 0x7aa47c 单例→blx [r1,#28] 分配 r4*4 字节（r2=16 对齐），bl 0x13efd7c 清块后拷贝 [r7,#4]/[r7,#12]；callees 0x82772c/0x827998/0x827cd0/0x8277c4/0x7aedcc |
| 0x3c5568 | quest | worker | B | votes quest:3（唯一票源）；清表：strb 0 → [r4,#2832]/[r4,#2833]，ldr [r4,#2776] 后 r1=0..600 步长 8 循环把 [r2,#4]/[#6]/[#2]/[#177] 置 0，再清 [r4,#2784] 起 4 个 halfword；callees 0x7aa47c/0x13efdac/0x13efd7c |
| 0x66cd14 | quest | orchestrator | B | votes quest:15 vs otomo-ot:3（5×）；ldr [r4,#4] 后按 r3=0..3 走 4 项跳转表，取全局 0x11cc5d8→[r0]→[r0]→ldr [r2,#0x6bfc]（单例字段），再读 ldrh [r4,#116]/ldrb [r4,#113]/[r4,#114]；callees 含 0x66cc38/0x66cac8/0x65cb3c/0x65c7e8 |
| 0x73e21c | quest | orchestrator | B | votes quest:14 vs otomo-ot:2（7×）；ldrb [r4,#5] cmp #3/bhi 走 4 项跳转表，取全局 0x10fb0b8→[r0]→ldr [r1,#0x6bfc] 后 tst #16384/#8192，r5=2；callees 含 0x742414/0x742e4c/0x7437bc/0x740a90/0x741efc 与 0x199e98（本片 quest） |
| 0xac0ec | monster-em | orchestrator | B | votes monster-em:11（唯一票源）；全局 0x178cc44→[r0]→ldrb [r0,#50] 门控后 bl 0x71340 两次；callees 含 0x5c970（sEnemy 类构造函数，类表 0x5c970..0x5caa8）与 0x31b6e0/0x319358/0x318f84（0x31x 簇） |
| 0x235c80 | save-io | worker | C | 唯一 callee 0x8261fc（存档/文件流原语，与 0xd31e4/slice-02 的 0x104978 同模板）；先 blx [vtable+28] 取 id 存 [r4,#4]，再按 [r5,#12]/[r5,#16] 位置/上限读流，满则 bl 0x8261fc 重填，ldrb → strb [r4,#8]；votes otomo-ot:1 为传播票 |
| 0x2e8c24 | monster-em | orchestrator | B | votes monster-em:6 vs online-nex:2（3×）；字符串 "sxdigit"，把全局 0x15505a4 的 3 个 dword 拷到 [sp,#64..72]，movw #0x5000/movt #0xc7c3 → 0xc7c35000（-100000.0f 哨兵）写 [sp,#52]（与 slice-02 的 0x11c1048 同常量）；callees 0x27bcd0/0x282f58/0x2f7ad8/0x53a058/0x53aa84 |
| 0x7ee00c | render-gfx | worker | B | votes render-gfx:2 vs quest:1/monster-em:1（2×）；VFP 保存（ed2d8b0a）+192 字节栈，对 [r5,#0x40..#0x48] 三个向量做 vsub 并写 [sp,#0xa0..]，清 [sp,#172]；callees 0x2332ac/0x7edb2c/0x7cf934（0x7dx/0x7ex 簇） |
| 0x86a8a8 | quest | worker | B | votes quest:8 vs audio:1（8×）；析构两个句柄：[r4,#8] 非空则 bl 0x13f0a30 并清零，[r4,#4] 非空则 bl 0x13f0a3c 并清零后返回；callees 含 0x8260d4/0x82710c/0x826130（0x82x 流簇）与 0x7aedcc |
| 0x301890 | quest | orchestrator | C | votes quest:5 vs monster-em:4/otomo-ot:3/render-gfx:2（分票）；字符串 "i_move"（动作/移动参数名，不指向子系统）；反汇编先经 0x15374cc→bl 0x227ba8 与 0x15374b0→bl 0x227a98 均 ==1 门控，再对 +0x26e0 起浮点做 vcmp/bgt；callees 含 0x283060/0x2831e0/0x28813c（0x28x 簇） |
| 0x3d0fd4 | quest | worker | B | votes quest:3 vs online-nex:1/otomo-ot:1（3×）；字符串 "[BELNA]"/"[BED]"/"[BAR]"/"[HR]"（方括号标签）；反汇编解析以 '['(91) 开头的串：ldrb [r0,#0] cmp #91、[r1,#4] cmp #2，再按 [r1,#9]==66('B')/87('W') 分派；callees 0x276278/0x277454/0x27c6f8 与导入壳 0x13efef0/0x13effa4 |
| 0x5424d0 | render-gfx | worker | C | votes quest:5 vs render-gfx:4（分票，次席 0.8×top）；缓冲重建：ldrb [r4,#196] 与 r5 比较，[r4,#184] 非空则 blx [vtable+92] 释放并清零，r5 非零时按 r5×r5×16 调 blx [vtable+88] 重新分配存 [r4,#184]；callees 0x883f74/0x8826fc/0x882674（0x88x 数学/渲染簇）、0xa483b0/0xba2544 |
| 0x77c47c | otomo-ot | orchestrator | B | votes otomo-ot:10 vs quest:5（2×）；取全局 0x10bce84→[r0]→[r0]→ldr [r0,#0x6bfc] 与 [r0,#0x6c34]，bl 0x65d9e8；ldr [r4,#4] 后按 r2=0..4 走 5 项跳转表；callees 含 0x65cc0c/0x65cb3c/0x65d464/0x65f118/0x65f190（0x65x 簇）与 0x56e528/0x56e538/0x56e4d8 |
| 0xa0c264 | quest | worker | C | votes quest:2（弱）；callees 0x7aa47c 与自递归 0xa0c264；反汇编为赋值/比较：ldrh [r11,#6]→[r4,#6]、[r11,#48..#56]→[r4,#48..#56]、[r4,#60]=0，再比较 ldrb [r11,#4]/[r4,#4]，不同时经全局 0xe36e74 处理 [r4,#8]；无子系统线索 |
| 0xaf10fc | render-gfx | orchestrator | B | votes render-gfx:18 vs quest:4（4.5×）；ldr [r8,#36]→ldr [r3,#12] 取标志，eor #50331648(0x03000000) 与 tst #67108864(0x04000000) 拆索引位，add r7,r1,#32 后逐项搬 3 个 dword 并清 [r7,#12]；callees 22 个全为 0xaexxxx/0xafxxxx（0xae-0xaf 渲染簇） |
| 0x916eec | quest | orchestrator | B | votes quest:6 vs monster-em:2（3×）；双 vtable 析构：全局 0xf2b320+8 → [r4,#0]，add r1,r4,#2288 并经全局 0xf21e50→bl 0xbd04dc，再装 vtable 0xf2b2f0+8 → [r4,#0] 并 bl 0xbd5d64，最后释放 [r4,#1988]（bl 0x887660）；callees 0xbd04dc/0xbd5d64/0xc5b990 |
| 0xb8692c | quest | orchestrator | B | votes quest:4 vs otomo-ot:1（4×）；movw #0x2420 取子对象后 ldrb [r0,#52] 门控（非 0 即返回），全局 0xcb245c/0xcb2a6c 各经 0x7aa47c 单例并 blx [vtable+28]；字符串 "Unknown"（占位类型名）；callees 0xbbe154/0xb86ef8/0x7b6da4/0x7bb638 |

## 汇总

- 覆盖：120/120 函数（`.tmp/mhgu/tierB2/slice-03.txt` 全部 `=== ` 条目，按文件顺序）。
- label 计数：quest 57、render-gfx 23、monster-em 15、otomo-ot 7、online-nex 6、filesystem 5、unknown 3、save-io 2、item 1、ui 1。
- conf：A 9、B 80、C 31。
- role：orchestrator 70、worker 50、thunk 0、leaf 0（本片按 insns 排序，最小 371 指令）。
- A 级证据（9 条，均来自本片字符串或已核验区段）：
  1. `0xd175c` — 类名 "cArmorBuildBase"（防具/装备）→ item。
  2. `0x81b938` — callees 与 0x130dc60/0x134f43c/0x1374504/0x138e9ac/0x13ae6b8 全在 Pia 区 0x1311000..0x13AB000 → online-nex。
  3. `0x131b4c8` — 函数地址与 callee 0x1395368 均在 Pia 区 → online-nex。
  4. `0x13e7eec` — "stale"/"realm"/"opaque"/"algorithm"（libcurl Digest 认证原文）→ online-nex。
  5. `0x5b15dc` — "cUIOHunterNote"（cUIO UI 类名）→ ui。
  6. `0xf0ab0` — "cOtArmorProcBase"（cOt = otomo）→ otomo-ot。
  7. `0x828cf8` — "Folder"（目录句柄）→ filesystem。
  8. `0xbcb0d0` — "%s\%s.%s"（Windows 路径格式）→ filesystem。
  9. `0x134da98` — 函数地址与 callees 全在 Pia 区 → online-nex。
- 票数与独立证据冲突、已按独立证据改判（10 条）：
  1. `0x81b938` otomo-ot:14 → online-nex（Pia 区）。
  2. `0x5b15dc` otomo-ot:12 → ui（类名）。
  3. `0xf0ab0` quest:6 → otomo-ot（类名）。
  4. `0x344c4` quest:6 → filesystem（"cDLCUpdateInfo"，DLC 包路径族见 slice-07 的 0xcee3d8）。
  5. `0xbcb0d0` save-data:7/quest:5 → filesystem（路径格式串）。
  6. `0xbcb6bc` quest:4 → filesystem（与 0xbcb0d0 指令模板逐条同构）。
  7. `0xb47b1c` quest:18 → render-gfx（"MetaSet"/rMetaSet 资源族；此条把握最低，见下）。
  8. `0xcea95c` quest:8 → render-gfx（与 0xce8ad4 同模板，仅类型 id 6/19 不同）。
  9. `0x1a8d70` quest:7 → otomo-ot（callees 0x1c55f4/0x1c6984 为 rMonNyanAdventItem/rMonNyanLotAdvent 构造）。
  10. `0x828cf8` quest:2/save-data:1 → filesystem（"Folder"）。
- 最不确定的 5 个：
  1. `0x13b63c0` — quest:4/online-nex:4/render-gfx:3 三方分票，仅凭 0x7ex-0x7fx callee 簇取 online-nex，C。
  2. `0x301890` — quest:5/monster-em:4/otomo-ot:3/render-gfx:2 分票；字符串 "i_move" 像动作参数但不指向子系统，暂随首席票标 quest/C。
  3. `0x2b29dc` — 4 方弱票（online-nex:2 最高），主体是 0x13c4 字段取位 + 空桩，标 unknown/C。
  4. `0xb47b1c` — 字符串 "MetaSet" 明确指向 rMetaSet/uMetaSet 资源族（0xb4 资源簇），但本片无法区分它属 render-gfx 还是文件/资源层；取 render-gfx/B，若复核认为资源记录归 filesystem 则本行应改。
  5. `0x344c4` — "cDLCUpdateInfo" 只证明 DLC 记录类，filesystem 的归属依赖 slice-07 对 rDLCPackage 路径表的先例。
- 其他记录：`0xd31e4`/`0x235c80` 与 slice-02 的 0x104978/0x10c588/0x395850 为同一「0x8261fc 流读取器」模板，标 save-io/C；`0xb7591c`/`0xb75f04`/`0xb764ec`/`0xb76ad4` 为四联同模板，统一 render-gfx/B。
- 无 UNCONFIRMED 占位；本片未写任何代码，未 build/未 git。

