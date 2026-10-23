# Tier B pass2 — slice 08 裁定报告

输入: `.tmp/mhgu/tierB2/slice-08.txt` (120 函数, 0x3cf1c..0xb6c7d4)
裁定规则: label 优先取 votes 多数(>=2x 优势) -> 其次直接字符串 -> 再次 callee 聚类 -> 否则 unknown。
conf A 仅用于有字符串/硬结构证据者。

## 汇总

- 总计: **120** 函数, 全部已裁定 (无遗漏)。
- label 计数: quest 59 / monster-em 23 / otomo-ot 9 / render-gfx 8 / online-nex 7 / filesystem 2 / item 1 / audio 1 / unknown 10
- conf 计数: A 9 / B 87 / C 24
- role 计数: orchestrator 83 / worker 21 / thunk 10 / leaf 6
- 最不确定的 5 个:
  1. `0x7ce87c` — 纯 VFP 矩阵变换, 3 个 callee, votes online-nex:2 monster-em:1, 无法归属
  2. `0xb68e60` — 仅字符串 "revr" + 表查找, 无子系统特征
  3. `0x9e69b4` — votes quest:1 render-gfx:1 平票, 仅 2 callee
  4. `0x4ac7e8` — votes quest:7 otomo-ot:7 monster-em:6 三方近平票, 只剩实现细节
  5. `0x3cf1c` — 609 条纯字段比较(相等运算符), 零 callee, 零 votes

## 表

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x3cf1c | unknown | leaf | C | 逐字段 ldr/ldrb+cmps+bne 0x3d89c 的相等运算符(off 4/8/12..15); 无 callee、无 votes |
| 0x382ffc | quest | orchestrator | B | strings "UKA<2_UF<7"/"_UF<7"; 14 callee, bl 0x3c6d44/0x3c613c/0x7aa47c; votes quest:10 |
| 0xa8ba10 | quest | orchestrator | B | 构造: bl 0xa58d7c, vptr=[0xdb7fec]+8 -> [r0], 尾 `b 0xa58e70`; votes quest:8 |
| 0x559898 | quest | worker | C | 栈数组填充消息码 0xde4b/0xde4a/0xde49/0xdea1/0xdea2(648B 帧); 仅 votes quest:2 |
| 0x6b4f34 | otomo-ot | orchestrator | B | bl 0x3c178/0x3c184/0x3c1c8 工厂, 取 [r11,#92], 调 0x56ea08/0x55bd0c; votes otomo:10 |
| 0x113aeb8 | monster-em | orchestrator | B | `ldr r0,[r4,#0x3a78]` 判空返回, bl 0x887660(释放)+str 0; 9 callee 含 0x283d48/0x2840fc |
| 0x7939cc | quest | orchestrator | B | bl 0x65d9e8 前置判定, 全局 [0x10a5920]+0x6bfc, bl 0x65cb3c/0x65ed60; votes quest:13 与 otomo:14 平, 但 callee 全为 0x65c-0x65f quest 簇 |
| 0x840b7c | unknown | leaf | C | `sub r3,r2,#1; cmp #41; bhi` + 42 项跳转表, 无 callee、无 votes |
| 0xb21e60 | quest | orchestrator | B | 构造/析构: vptr=[0xd21fa0]+8 -> [r0], [r0,#24]=[0xd21f80]+8, 清 8/12/16/20/28/32; votes quest:7 |
| 0x517de4 | monster-em | orchestrator | B | 向全局(0x137fe38)写 0..9 常量表, 含 `bl 0x7aedcc`(类注册); votes monster-em:9 |
| 0x742e4c | quest | orchestrator | B | switch(r1) 0..5 跳转表, ldr [global+0x6bfc], bl 0x54ee98/0x741828; votes quest:27 |
| 0x3a75c8 | otomo-ot | orchestrator | B | `ldrb r0,[r5,#0x1777]` 门控, bl 0x50b64/0x264240/0x227a98, movw 0x270f; votes otomo:6 |
| 0x5530b8 | quest | worker | C | `str r2,[r0,#8]; ldrh [r0,#30]==1` 分派后 `b 0x5536e8`, 主体 `tst r6,#160` 位域; 仅 votes quest:2 |
| 0x7d53b8 | render-gfx | worker | C | 连续 VFP vcmp/vmrs 比较 + 指针三选一(add r5/r0+16/r0+24) 的裁剪/排序; votes render:2 弱 |
| 0x402318 | monster-em | orchestrator | B | bl 0x4a1b6c(取变换), movw 0x15d0/0x15dc 结构体搬运, 自递归 0x402318; votes monster:12 |
| 0xa55e74 | quest | worker | B | 读 [r4,#348] 位 2048, [r4,#376] 非空, switch(r2) 0..20 跳转表; votes quest:4 |
| 0xb68e60 | unknown | worker | C | 仅 "revr" 串; [r0,#132] 计数 + [r0,#116] 指针表按索引取值, 0xffff/movw 哨兵; 无法定子系统 |
| 0x9e69b4 | unknown | worker | C | 间接调用 [vtable+112], 写 1.0f([r4,#124]), 读 [r4,#96] 的状态字节; votes quest:1 render:1 平票 |
| 0x288d10 | monster-em | orchestrator | B | movw 0x137c/0x13c4 结构体偏移, ldrb [r0,#1236], bl 0x27b918/0x28353c 等 22 个; votes monster:16 |
| 0x401688 | monster-em | thunk | B | 入口仅一条 `b 0x43b488`(基类方法尾跳), 下一函数自 0x40168c 起; votes monster:18 |
| 0xb033cc | quest | orchestrator | B | switch(r0-1) 0..13 跳转表(0xb03404), bl 0xccb860/0x86a44c/0x86a67c/0xccb898; votes quest:6 |
| 0x191bd4 | item | orchestrator | B | 含字符串 "deco"(装饰品); 23 callee 含 0x7aedcc 注册 + 0x1849e4/0x185b14 数据表; votes item:2(quest:21 为通用簇) |
| 0x47a6c0 | monster-em | orchestrator | B | movw 0x136c 取子对象, 备份 [r4,#64..72] 到 [r4+0x1000..], bl 0x4792fc/0x4a1b6c; votes monster:29 |
| 0x735300 | quest | orchestrator | B | ldrb [r4,#321] 门控, 循环 bl 0x1a3a0c 比 [obj+4]/[obj+8], 0x50d954/0x510224; votes quest:22 |
| 0x7fefdc | quest | worker | B | 写 [r4,#368]=0/[r4,#369]=1, 全局 0x1039b20/0x1041db4, VFP vldr 装载; votes quest:4 |
| 0xa55524 | quest | orchestrator | B | [r4,#12] 表项 -> 间接 [vtable+64] 查询, bl 0xb35c00/0xa520a4/0xa522e4, 调 0xa55e74; votes quest:7 |
| 0xaf4d3c | render-gfx | worker | B | 取 [r11,#44] 后写 0x477fff00(常量 65535.0f) 到 [r4,#256] 及 [r4,#544..552] 渲染参数; votes render:3 |
| 0x398918 | quest | orchestrator | B | 比较 64 位资源魔数 movw 0x5345/movt 0x44 -> 0x00445345("ESD") + 0x20151214, bl 0x32c358/0x82772c; votes quest:19 |
| 0x40fdd0 | monster-em | thunk | B | 入口仅 `b 0x43b488`, 下一函数自 0x40fdd4 起; votes monster:19 |
| 0x91a7d0 | quest | orchestrator | B | 间接 [vtable+148], 存 [r7,#240], bl 0x887648/0xba1b78/0xb344dc, 位测试 [r0,#104]&1; votes quest:14 |
| 0xc08558 | quest | orchestrator | B | 巨型宿主对象: movw 0x8718+movt 6 字节门控, 数组 [r9,#1736] 遍历, bl 0xba62a8/0x88ecc0/0x887810; votes quest:4 |
| 0x434f18 | monster-em | orchestrator | B | bl 0x276278 取全局态 + 摊平 3 个 float 到栈(0x1403bf8), bl 0x4eff24/0x4efb98/0x43b488; votes monster:18 |
| 0x13aaff4 | online-nex | orchestrator | A | 网络消息层: 检查 [global+324] 启用, 取 [r7]->[msg+0], `ldrb [msg+2]==7`/`[msg+3]<=1` 报文标签分派, bl 0x13a59d0; votes online-nex:28 |
| 0x42c770 | monster-em | orchestrator | B | bl 0x4a1b6c, movw 0x136c 子对象非空检查, 复制 7 个 float 到栈(0x140d420), bl 0x43b8d8/0x43b8f8; votes monster:15 |
| 0xc2b888 | render-gfx | orchestrator | B | 取 [r4,#128]/[r4,#64], 十余条 VFP vsub/vcmp/vmul 归一化, bl 0xc1ef38/0xc1bf24/0xc45ba8; votes render:5 |
| 0x6b8828 | otomo-ot | orchestrator | B | `[r0,#76]|=16`、清 [r0,#4..28], 尾 `b 0x13efe3c`; 16 callee 含 0x56ea08/0x55bd0c; votes otomo:13 |
| 0x751624 | quest | orchestrator | B | switch([r10,#76]) 0..3 跳转表 + 全局 0x6bfc/0x6c34 位掩码, bl 0x65cb3c/0x5f2010; votes quest:12 |
| 0xb29d64 | quest | worker | B | 析构: vptr=[0xd1a1c8]+8 -> [r4,#20], bl 0x80dbbc(子对象析构)+0x13f004c; votes quest:3(otomo:1) |
| 0x66d330 | quest | orchestrator | B | 构造: bl 0x65c7e8, vptr=[0x11d3550]+8, 全局 [..]+418 置 1, [r0,#56]=16; votes quest:18 |
| 0x6a5ae0 | otomo-ot | orchestrator | B | 取 [sp,#48] 参数, bl 0x3ae21c(模式查询)+0x551e38, movw 0x967f 常量, 调 0x56e7b8/0x55bc4c; votes otomo:9 |
| 0x2ba82c | render-gfx | orchestrator | A | strings "mTargetJointNo"/":Match"/"teNum"/"Mode"(关节匹配/动画), 读 ldrb [r4,#0x2749]/[#0x274a] 组合 24 位标记, bl 0x2a6760/0x2a8d10; votes render:16 |
| 0x3559c0 | unknown | worker | C | 流读取器: 间接 [vtable+8] 取长度 -> [r5,#4], 边界比较 [r4,#12]/[r4,#16], refill bl 0x8261fc, ldrb 写入 [r5,#6]; 仅 otomo:1 |
| 0x70e9c4 | quest | orchestrator | B | 构造: bl 0x70e7b0(基类), vptr=[0x1132230]+8, 清 [r4,#57..68], bl 0x50adfc(注册, id 26); votes quest:9 |
| 0x4269d8 | monster-em | orchestrator | B | 析构: movw 0x15e4 写 vptr, 销毁 [r2] via 0x7aa47c+vtable+52, 尾 `b 0x43b488`; votes monster:15 |
| 0x4f8220 | quest | orchestrator | A | strings "cVillageFirstPos"(村初始坐标); 3 次间接 [vtable+32] 写浮点后 bx [vtable+12], +0x7aedcc/0x82xxxx 序列化簇; votes quest:19 |
| 0x774408 | quest | orchestrator | B | switch([r4,#4]) 0..4 跳转表(0x77443c), 读 [r7,#58]/[r7,#18], bl 0x552020/0x7ca404; votes quest:25 |
| 0x4253a0 | monster-em | orchestrator | B | 析构: movw 0x1614 写 vptr, 释放 [r2] via vtable+52, 尾 `b 0x43b488`; votes monster:14 |
| 0x5b03c4 | otomo-ot | orchestrator | B | bl 0x5afed0 取状态位, 递减 [r4,#88], 比较 [r4,#96], bl 0x7aa47c+vtable+28 分配(0x10 大小); votes otomo:9 |
| 0xfc1c | otomo-ot | orchestrator | B | 写全局 [.. +163]=1, bl 0x153c, switch([r4,#220]) 0..12 跳转表, 20+ callee 含 0x14e8e0/0x244dc0; votes otomo:37 |
| 0x6db1f0 | otomo-ot | orchestrator | B | bl 0x65cb3c 取对象, bl 0x5c3fac(4,2,..)+0x5c4120, 写 [r4,#208]=1, movw 常量 992; votes otomo:17 |
| 0x915aac | quest | thunk | C | 入口仅 `bx lr`(空函数/占位), 同区 0x91a7d0 quest:14、0x91b82c quest:11; 仅 votes quest:2 |
| 0x16c0c0 | monster-em | orchestrator | B | 12 个栈槽清零 + movw 0x1428 基址, bl 0x167118/0x168370/0x168448/0x170968; votes monster:8 |
| 0x5282d8 | quest | thunk | C | 入口仅 `b 0x2b908`(基类析构尾跳); 仅 votes quest:3 |
| 0x13e572c | online-nex | worker | B | 全 -1 哨兵初始化([r11,#-32..-40]) 后遍历字符串 ldrb [r0], bl 0x13cbe80/0x13d7348, 7 callee 全在 0x13c-0x13f 网络模块; votes online:7 |
| 0x4b5674 | quest | thunk | C | 入口仅 `bx lr`; 仅 votes quest:2 |
| 0x2aeea0 | online-nex | orchestrator | A | strings "lBackgroundProcessJob::DisconnectNetwork"; 53 项跳转表(cmp r1,#53)+ [r4,#176]==0x100 早退, 18 callee; 注: votes monster:13 来自通用 0x28/0x30 工具簇, 与字符串冲突, 按 A 证据取 online-nex |
| 0x4bedac | quest | thunk | C | 入口仅 `bx lr`; 仅 votes quest:2 |
| 0x7e0ba0 | quest | orchestrator | B | 巨帧(824+1024)构造: 写 [r6,#384]=0/[r5,#369]=1, 全局 0x1057f50 -> [r5,#336], bl 0x7e2e78/0x7c0f00; votes quest:8 |
| 0x807368 | quest | orchestrator | B | 取 [r5,#0..8] 组 vec4 后 VFP, bl 0x808f88/0x808fe8/0x7f5a04/0x809164; votes quest:4 |
| 0x46be08 | monster-em | orchestrator | B | bl 0x4a1b6c, movw 0x1378/0x15d0..0x15d8 结构初始化, strh [r4,#176]=0, 22 callee 含 0x4718cc/0x46fcdc; votes monster:21 |
| 0x1190cf0 | render-gfx | orchestrator | B | movw 0x13c4 子块, bl 0x2ff984 后接 0xe19b8/0xe10f0/0xe1130(0xe1xxx 四元数/矩阵簇), bl 0x1193f38; votes render:13 |
| 0xa4192c | quest | worker | B | 316B 帧, [r10,#12]=0, 测 [r10,#32]&2 + [r10,#36], bl 0xb35764(流式写出)/0xa42430; votes quest:4 |
| 0x851f34 | quest | orchestrator | B | 构造: bl 0x85fc90(基类), 设 vptr 与 vptr+192 双继承, 连续 bl 0x80c640 构造内嵌容器(+588/+788/+1004/0x4b4..); votes quest:9 |
| 0x5db43c | otomo-ot | orchestrator | B | 入口为 setter `ldrb [r1]; strb [r0,#76]`, 主体 bl 0x56dc28, ldrb [r4,#102/103] 算区间写 [r4,#104]; votes otomo:13 |
| 0x158030 | unknown | worker | C | 流读取器同族(间接 [vtable+12] -> [r4,#4], 边界+bl 0x8261fc refill, ldrb -> [r4,#8]); 仅 otomo:1 |
| 0xbab460 | quest | orchestrator | B | 测 [r4,#8]&2, [r4,#2889]==1 分支, 反复 strh [r4,#176] 清槽(movw 0x116/0x112), 9 callee 含 0x86e980/0x86eb10; votes quest:7 |
| 0x13abaec | online-nex | orchestrator | A | 网络层: 检查 [global+324], bl 0x13a59d0/0x13a88c4/0x13a6d94 及 0x13f1564/0x13f15ac 运行时, 帧 108+1024B; votes online-nex:22 |
| 0x25c884 | quest | orchestrator | B | 摊平栈结构([sp,#8]=global+8, ldrh [r5,#20] -> [sp,#24]), bl 0xe9ed8/0xe92a8/0xe9e8c/0x4c6768; votes quest:12 |
| 0x321694 | quest | orchestrator | B | switch(r2) 0..5 跳转表(0x3216bc), 依次对 [r5]/[r5+4]/[r5+8] 调 0x13efde8 转 float, bl 0x321f9c; votes quest:7 |
| 0x858284 | quest | orchestrator | B | 与 0x851f34 同构(bl 0x85fc90 + 双 vptr + 多次 bl 0x80c640 构造内嵌容器 +588/+784/+1000); votes quest:9 |
| 0x91b82c | quest | orchestrator | B | `[r5,#84] & 0x01000008` 标志测试 + 链表遍历 [r0,#4]->[r0,#16], bl 0xa33b5c/0xb349c0/0x7bb3ec; votes quest:11 |
| 0xceb4b0 | quest | orchestrator | C | 析构: vptr=[0xb5aef0]+8, 删 [r4,#88] via vtable+4, 尾 `b 0xb1b010`; votes quest:6 与 audio:5 近平票, 取多数 |
| 0x159a4 | monster-em | worker | C | switch([r5,#49]) 0..4 跳转表(0x159e0), 写 [r6,#322]=1 与 [r4]=[r5,#64]; 仅 votes monster:3 |
| 0xc3f194 | render-gfx | worker | B | bl 0xba5770/0xba57dc 比较 `cmn r0,#1`(-1 哨兵) 后 +2 分支, bl 0xc17b90; votes render:5 |
| 0x274cf0 | quest | worker | B | 双层 switch(r5<=1, r6<=3) + `mla r0, r6, 1376, r7; add 0x1b5c`(stride 0x560 表), bl 0x22d8b4/0x26fddc; votes quest:3 |
| 0x4ac7e8 | quest | orchestrator | C | switch([r4,#36]-3) 0..14 跳转表(0x4ac828), 读全局 0x138c574, bl 0x27626c/0x26e600/0xdaba4; votes quest:7 otomo:7 monster:6 三方平票 |
| 0x7ea0ec | quest | worker | B | 264B 帧 + 大批 VFP(vec 运算), 入参取自 [r11,#8], bl 0x7e9e94/0x803494/0x808fe8; votes quest:5 |
| 0x73acf4 | quest | orchestrator | B | bl 0x1c9604 查对象, 非空后用 bl 0x1bbb70 组参 + `mov r0,#9/mov r1,#25/mov r3,#22`, bl 0x1c97cc; votes quest:17 |
| 0xc387e8 | render-gfx | orchestrator | B | 492B 帧, 从 0xc08360/0xc0b4dc 取 vptr+8 建临时对象, bl 0xc20ec8/0xc16100/0xc1ef38; votes render:10 |
| 0x13e72fc | online-nex | orchestrator | A | 连接槽表: `mla r8, r9, 276, r10`(stride 276), 状态 [r8+380]==2, [r8+648] 非空, 返回 r7=0/96; bl 0x13f1c90..0x13f1d74 系列; votes online-nex:20 |
| 0x128e7d0 | online-nex | worker | B | 入口 5 条指令: `mov r1,#2; bl 0x13f16b4` 后 lsl/pop(按 id=2 取网络对象); votes online:20 + kernel:3 |
| 0xadb3c | monster-em | orchestrator | B | 读 [r5,#0x1428]、ldrb [r0,#442], 清 [r5,#0x7425], 间接 [vtable+948], bl 0xa4cc0/0xa4d50/0xb16e0; votes monster:35 |
| 0x405144 | monster-em | orchestrator | B | bl 0x43b4bc 校验, 复制 [r6,#32/36/40] 到 movw 0x1650/0x1654/0x1658, bl 0x405a34/0x43b7e0; votes monster:17 |
| 0x7be068 | quest | worker | C | 转发器: 全局 0x1082d5c + bl 0x7aa47c 取单例, 以 [r6,#28] 与间接 [vtable+32] 转调; votes quest:3 |
| 0x9f3f30 | quest | orchestrator | B | [r6,#84] 为空时用 vldr 默认值, bl 0x94cf88(资源查表) -> 返回值 +16 或对象 [r6,#84], bl 0x9f5058; votes quest:5 |
| 0xa1709c | monster-em | orchestrator | A | strings "cAIPathTrace"/"cAIPathTrace::TracePoint"/"cAINavPathTrace"/"cAIWayPathTrace"(AI 路径跟踪); 析构: vptr=[0xe2c080]+8, 逐个释放 [r4,#280] 中 [r4,#268] 项 |
| 0x1c1a84 | quest | thunk | C | 入口仅 `b 0x2b908`(基类析构尾跳); 仅 votes quest:3 |
| 0x623d50 | otomo-ot | orchestrator | B | 间接 [vtable+28], 大量 bl 0x56e530/0x56e528/0x56e6fc/0x56e7b8(0x56exxx otomo 簇), bl 0x19c21c/0x199048; votes otomo:9 quest:9 平, 按 callee 簇取 otomo |
| 0xa276e8 | quest | orchestrator | B | 析构: vptr=[0xe1bc0c]+8 -> [r4], 遍历 [r4,#52] 数组再逐个间接 [vtable+?] 释放; votes quest:13 |
| 0x404538 | monster-em | orchestrator | B | bl 0x4a1c78 校验 + 测 [r0,#80]&1, bl 0x4a1b6c, movw 0x1650, bl 0x43bcc4/0x4a2a50; votes monster:14 |
| 0x13c40c4 | online-nex | orchestrator | A | strings "Content-Type: multipart/form-data"/"Content-Disposition: form-data; name=""/"------------------------%08x%08x"(HTTP multipart 上传), bl 0x13d6fa4/0x13c748c; votes online-nex:13 |
| 0x29c368 | monster-em | orchestrator | B | 门控 `ldrb [r4,#0x3274]`, bl 0x2f6a34/0x2e7aa0, 间接 [vtable+872]/[vtable+200], bl 0x539da0/0x2e959c; votes monster:19 |
| 0x49a58c | monster-em | orchestrator | B | bl 0x4a2f5c(r1=?, r2=-1), 校验 [r7,#4]>=0, bl 0x32a400 释放 [r4], bl 0x4a1794/0x4a18b4; votes monster:14 |
| 0x71d264 | quest | orchestrator | B | 读全局 [.. +0x6bfc], [r4,#152]==0/1 状态机, 写 [r4,#200]=1, 调 0x718a0c(42,1,1,1), bl 0x7291cc/0x568790; votes quest:15 |
| 0xb41680 | quest | orchestrator | B | 以 [r5,#0..#12] 逐项调用间接 [vtable+12] 序列化 4 个分量, bl 0x8260d4/0x8261fc/0x826c38; votes quest:9 |
| 0x3cb008 | audio | thunk | B | 入口仅 `b 0x887100`(释放), 同函数族含 strings "Path"/"resource" + bl 0x7af6e4/0x82fb08(音频资源簇); votes audio:8 |
| 0x727744 | quest | orchestrator | B | switch([r4,#144]) 0..3 跳转表 + 全局 0x6bfc/0x6c34 位掩码, bl 0x72d588/0x72d644/0x72884c; votes quest:12 |
| 0x7b7214 | unknown | leaf | C | 读 [r1,#4] 后 `cmp r0,#49; bhi` + 50 项跳转表(0x7b724c), 无 callee、无 votes |
| 0x921fcc | unknown | leaf | C | 仅 4 条: `ldr r1,[r0,#48]; eor r1,#32768; str`(翻转标志位), 无 callee、无 votes |
| 0x1220adc | filesystem | worker | B | 与 0x1222ce8(zlib) 同簇: 读 [r9,#124] 计数、ldrb [r9,#28]、ldrh [r9,#152..164], bl 0x12213ac/0x1220698; votes quest:5 来自同簇通用函数 |
| 0x1222ce8 | filesystem | leaf | A | strings "invalid distance code"/"invalid distance too far back"/"invalid literal/length code"(zlib inflate 错误), 564 条内联解压循环、无 callee |
| 0x1b2b60 | quest | orchestrator | B | `cmp r6,#83; bhi` 早退 + bl 0x25d6bc 查表, switch([r4,#40]) 3/4 分支, bl 0x56df00/0x56e04c; votes quest:16 |
| 0x41c4b0 | monster-em | orchestrator | B | bl 0x4a1b6c 取矩阵后 vsub/vmul/vcmp 组合(ee34aa41/ee33ca40/ee35ba42), bl 0x43b8d8/0x43b8f8; votes monster:14 |
| 0x6be478 | quest | orchestrator | B | 全局 0x6bfc, bl 0x2772c4, switch([..+897]) 0..9 跳转表 配合 [..+892] 指针, bl 0x50d6b4/0x6d09b8; votes quest:13 |
| 0x8a2154 | quest | orchestrator | B | 取 [r0,#88]->[..,#116] 表, `ldrb [r2, r1, lsl #5]`(stride 32) 门控, 表 [..,#96] 按索引, bl 0x8a7668/0xc1c3b8; votes quest:7 |
| 0x31c3a8 | unknown | leaf | C | 30 项跳转表(cmp r12,#30, 0x31c3f8) 的循环, 置 [r0,#4]|=0x8000000 与 [r0,#104]=[r1,#88], 无 callee、无 votes |
| 0x464318 | monster-em | orchestrator | B | bl 0x4a2f5c(2,-1) 取对象, bl 0x40b10 清栈结构, 间接 [vtable+304], movw 0x1054/0x15d0; votes monster:16 |
| 0xc5f7c8 | quest | orchestrator | B | strings "%dx%d"(坐标格式化); 取 [r4,#292]->[#104], 测 [r4,#315]&32, 逐字节拷贝到 [r4,#312..324], bl 0xafccc8/0xc6008c; votes quest:7 |
| 0x6f9b18 | quest | orchestrator | B | 门控 ldrh [r4,#92]!=0, bl 0xdae68/0xdaba4, 分支带 movw 0x20bc/0x20bd/0x20be(消息 id), 24 callee 含 0x26e43c/0x26e600; votes quest:23 |
| 0x9dcf68 | render-gfx | thunk | B | 入口仅 `b 0x9f5058`(构造) — 与 0x9f3f30 同样尾跳 0x9f5058; votes render:8 |
| 0x112b4a4 | quest | orchestrator | B | 连续 VFP vcmp 区间检查(ed9f1a53/vldr + vcmp + bmi/bgt) 后转 0x112eee4 等, 20+ callee 含 0x115b004; votes quest:19 |
| 0x71c924 | quest | orchestrator | B | 与 0x71d264 同构(全局 0x6bfc, [r4,#152] 状态, 0x718a0c(42,1,1,1), [r4,#852..856]); votes quest:15 |
| 0x7904b4 | quest | orchestrator | B | switch([r5,#88]) 0..9 跳转表(0x7904dc) 再 switch([r5,#80]) 0..3, bl 0x677880/0x790d6c/0x79d0d8; votes quest:17 |
| 0x8fa51c | quest | worker | B | movw 0x6d54 取根对象, 表 [obj,#1176] 与 [obj,#1172], ldrb 0xff 哨兵, 项 stride 通过 `add r2, r2, lsl #2`, bl 0x9f5104/0x8fadd4; votes quest:4 |
| 0x32af84 | monster-em | orchestrator | B | 构造: bl 0x9396a8(基类), vptr=[0x1511758]+8, `str r6,[r7,#4092]` 清尾部, 1.0f 写 [r7,#228..252]; votes monster:9 |
| 0x4baff0 | quest | thunk | C | 入口仅 `b 0x2b908`(基类析构尾跳); 仅 votes quest:3 |
| 0x6bd720 | quest | orchestrator | B | strings "aMap%02d"(地图名格式化); switch(r1) 0..9 跳转表(0x6bd754) + 全局 0x6bfc, bl 0x6bff98/0x677880; votes otomo:13 quest:11 平, 按地图字符串取 quest |
| 0x7ce87c | unknown | worker | C | 168B 帧 + 16 条纯 VFP 矩阵变换(ee340a40/ee332a42/ee351a41), bl 0x7d9734/0x809bc0; votes online:2 monster:1, 无子系统特征 |
| 0x4d8704 | quest | worker | C | 静态初始化: 向全局(0x13be6ac 相对)写 0/1/2/3/4/8/9 序列 + 1.0f, bl 0x3cafe8; 仅 votes quest:2 |
| 0xb6c7d4 | quest | orchestrator | B | 析构: 非空则经 0x7aa47c 单例 vtable+52 释放 [r4,#100]/[r4,#128], 再清字段, bl 0xbf1b54/0xb6a42c; votes quest:10 |
