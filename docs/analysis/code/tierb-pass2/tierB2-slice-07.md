# Tier B pass2 slice 07 裁定报告

输入: `.tmp/mhgu/tierB2/slice-07.txt`, 120 函数 (按文件顺序)。

## 汇总

label 计数:

| label | count |
|---|---|
| quest | 65 |
| monster-em | 24 |
| otomo-ot | 11 |
| render-gfx | 5 |
| unknown | 4 |
| ui | 2 |
| online-nex | 2 |
| physics-math | 2 |
| filesystem | 2 |
| audio | 1 |
| save-data | 1 |
| player-pl | 1 |

conf: A=2, B=93, C=25. role: orchestrator=81, worker=27, thunk=9, leaf=3 (合计 120).

role 明细: leaf = 0xb09e6c, 0x9bcb0c, 0x12213ac; thunk = 0xcc5af8, 0x408b28, 0xce5c90, 0x16414, 0xd08c8, 0xb3b840, 0x9683b8, 0xbac7c4, 0xb14c38.

说明: 本 slice 的 `insns=` 字段与可见函数体不一致 (例如 0xcc5af8 报 658 条指令, 实际函数体只有 `bx lr`), 因此 role 以可见的 prologue/epilogue 与 callee 数量为准, 不以 insns 为准。

最不确定的 5 个:

1. `0xb09e6c` - votes 为空, 无字符串, 无 callee, 只有多路间接分派, 无法落到任何子系统。
2. `0x12213ac` - 同样 votes 为空且无 callee, 只看到 `movw 0x1448/0x144c/0x1450` 字段写入与数组遍历。
3. `0x1217efc` - 唯一 callee 0x12188dc, 主要靠 `blx [r0,#1532]` 间接调用, 只有 1 张 otomo-ot 票。
4. `0xcb2558` - 纯 VFP 双缓冲插值, 唯一 callee 是 0x13efddc (VFP 辅助); 归 physics-math 是按指令形态推断, 也可能属于动画/摄像机插值。
5. `0x9683b8` - 字符串 "mpScreenMap"/"resource" 既可读作 UI 屏幕表, 也可读作地图渲染资源, render-gfx:4 票与之竞争, 故 ui 判 B 而非 A。

其他低置信项 (全部 conf=C, 共 25 个): 0x13b69ac, 0xc9704c, 0x9b24d0, 0xcc5af8, 0x7cc450, 0xce5c90, 0xce4f4c, 0x1f154c, 0x9bcb0c, 0x55a218, 0x800320, 0xa36fa4, 0xd08c8, 0xb3e4c, 0x801680, 0x2e7aa0, 0xbac7c4, 0xbcd93c, 0xab0e8, 0xb14c38, 0x12213ac, 0x13b7424, 0xcb2558, 0xb09e6c, 0x1217efc.

## 逐函数表

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xcee3d8 | filesystem | orchestrator | B | 析构式: `str vptr(0xb58024+8),[r4,#0]`, [r4,#16] 经 0x7aa47c 取分配器后 `blx [r2+52]` 释放; 直接字符串 mpPD[i].path / mpPD[i].pathLen / mpPD[i].offset / dlcp 指向 DLC 路径表 |
| 0x27db78 | monster-em | worker | B | 连续 `bl 0x285de4` 传偏移 4/24/0x26/0x48/0x4c 再 `0x285e2c(...,0)` 取值比较, 按固定字段表逐项重置; votes monster-em:2 为唯一非通用票 |
| 0x537b44 | quest | orchestrator | B | votes quest:25 绝对多数, callee 全为 0x65da78/0x65ece4/0x642c44 等 quest 家族; 开头读 [r0,#224] 与 0x75f9/0x7595 比较判表项 |
| 0x42addc | monster-em | orchestrator | B | 写 [r2,#0x1600] 子对象 vptr (0x1412394+8), 释放 [r2,#0], 尾跳 0x43b488 (monster-em 析构链) |
| 0xb7883c | quest | orchestrator | B | votes quest:12; 对 [r6,#88] 做 0x8043b0 容器查找, 命中后 `ldr r1,[r0,r3,lsl#2]; add r2,r1,#1` 计数自增 |
| 0x1acb00 | quest | worker | B | 以 id 0xe364/0xe365 调 0x152960 取资源写入 [r4+4]/[r4+8]; votes quest:8 |
| 0x32a4c4 | monster-em | orchestrator | B | VFP 读 [r4,#336] 对象并 `bl 0x8a7dc4` (向量写入), 字符串片段 "ype[2]" 为断言; votes monster-em:7 |
| 0x690d64 | otomo-ot | orchestrator | B | `cmp r1,#11` + 12 项 pc 相对跳转表的事件分派; votes otomo-ot:20 |
| 0x708258 | quest | orchestrator | B | `cmp r1,#4` 五路跳转表 + `tst [r9,#108]` 的 #16384/#4096/#8192 状态位; votes quest:21 |
| 0x8f9a98 | quest | orchestrator | B | 自递归 0x8f9a98; 比较 [r4,#0x6d54] 与 [r4,#0x6d58] 链表头, 0x887660 释放旧项 |
| 0xb01370 | quest | worker | B | 532 字节栈帧; 0xb02310 取对象后 `blx [r2,#28]` 分配并写 [r9,#16]/[r9,#28] |
| 0x29b8e8 | monster-em | orchestrator | B | votes monster-em:26; `ldr [r4,#0x1470]` 守卫 + 0x27bcd0 判定后进入主体 |
| 0x32b834 | ui | orchestrator | B | 直接字符串 "aponPreview" (WeaponPreview 预览), 读 [r4,#0x112c]/[#0x1121]/[#0x112d] 状态字节并 `and r0,#7` 分派 |
| 0xa59268 | render-gfx | worker | B | 连续 vldr/vstr 到 [r4,#0x3e] 起的向量区, 并用 [r4,#72] 作顶点/参数计数器自增; votes render-gfx:4 |
| 0x9232c8 | render-gfx | orchestrator | B | 构造函数: 0x887958 基类 ctor, 写 vptr 0xf1f08c+8, 清 [r4,#92]/[#892]/[#908], 置 1.0f 到 +80/+84/+88 |
| 0x13b69ac | quest | worker | C | 转发 `singleton(0x48d91c)` 后 `blx [vtable+32]`, 两参原样透传; 唯一线索 votes quest:4 |
| 0x726408 | quest | orchestrator | B | `[r4,#144] <= 5` 六路跳转表 + 全局 0x1112ee4 偏移 0x6bfc 的状态字; votes quest:18 |
| 0x128f930 | online-nex | worker | B | ctor: 写 vptr 0x5b799c+8/0x5b7980+8, 0x13f1564 清 16 字节, `strb #2,[r9,#9]`; votes online-nex:3 |
| 0x46cda4 | monster-em | orchestrator | B | `movw 0x1378; str r1,[r4,r0]` 清字段, `bl 0x4a30dc`/0x4a2d60 属 monster-em 家族; votes 18 |
| 0x187000 | quest | orchestrator | B | `ldr [r4,#144]` 后 0x65cb3c 查表, 全局 0x16b22d0 偏移 0x6bfc/0x6c34; votes quest:28 |
| 0x7254ac | quest | orchestrator | B | `[r4,#136] <= 4` 五路跳转表, `bl 0x718a0c(r0,22,1,1)`; votes quest:22 |
| 0x470e70 | monster-em | worker | B | 字节 [r4,#0x13e2]==29 时读 `ldrsh [r4,#0]` 并做 VFP 换算, 否则用 0x15a4/0x15a8 字段基址; votes monster-em:5 |
| 0xb84114 | quest | orchestrator | B | 越界返回静态默认: `ldr [r0,#136]` 比较后 `ldr [r0,#152]` + r1*4, 否则 pc 相对常量 0x9ccc3e |
| 0x707800 | quest | orchestrator | B | `tst [r4,#108]` 的 #16384/#8192 分支 + 0x54ee98/0x65cb3c; votes quest:20 |
| 0xc9704c | quest | worker | C | 析构: `ldr [r10,#96]` 非空则 0xc97c90 + `blx [vtable+52]` 释放 [r10,#80]/[#88]; 仅 votes quest:2 |
| 0x755b4 | otomo-ot | orchestrator | B | `ldr [r7,#0x1428]` 取子对象, 把 [+464]/[+468]/[+472] 拷到 0xa5e8..0xa5f4; votes otomo-ot:29 |
| 0x71b190 | quest | orchestrator | B | `[r6,#80] <= 6` 七路跳转表 + `bl 0x718a0c(...,22,1,1)`; votes quest:24 |
| 0x7fc300 | quest | orchestrator | B | 1836+840 字节栈缓冲; `bl 0x7c809c` 做字符串/路径拼接 + 0x7c0f00/0x7cc3e8 系列; votes quest:8 |
| 0x9b24d0 | monster-em | worker | C | VFP 常量载入 + `ldrb [r2,#200]` 分支; callee 仅 0x80328c/0x7cc110 等, 各项票数 1~2 |
| 0x7291cc | quest | orchestrator | B | 先 `bl 0x65cb3c(...,25/26)` 再 `[r7,#148] <= 4` 五路跳转表; votes quest:18 |
| 0xcc5af8 | quest | thunk | C | 函数体仅 `bx lr` (虚表空实现), 0xcc5afc 起的析构才写 vptr 0xb80520+8; 无子系统证据 |
| 0x277a1c | monster-em | worker | B | 解析 [sp,#80] 位掩码 0x10000/0x1000/0x100000/0x1000000/0x10 后分派, `movw 0x1054` 字段基址; votes monster-em:6 |
| 0x408b28 | monster-em | thunk | B | 函数体仅 `b 0x43b488`, 该目标即 monster-em 对象析构入口 (0x42addc 亦尾跳于此) |
| 0x7cc450 | quest | worker | C | `ldr [r0]` <= 4 五路 pc 跳转 + 352 字节栈; 票数 monster-em:2 与 online-nex:2 对半, 无决胜证据 |
| 0xcb2558 | physics-math | worker | C | 全 VFP: `add r0,r11,#80` 后 `add r7,r0,r8,lsl#2`/`add r1,r0,r9,lsl#2` 做双缓冲插值; 唯一 callee 0x13efddc (VFP 辅助) |
| 0x720ff8 | quest | orchestrator | B | `[r10,#136] <= 4` 五路跳转表 + 全局 0x11182f4 偏移 0x6bfc; votes quest:29 |
| 0x742414 | quest | orchestrator | B | `cmp r1,#5` 六路跳转表 + 全局 0x10f6ed8 偏移 0x6bfc; votes quest:26 |
| 0x74773c | quest | orchestrator | B | `[r4,#76] <= 9` 十路跳转表 + 全局 0x10f1bb4 偏移 0x6bfc; votes quest:37 |
| 0xb2fccc | quest | orchestrator | B | 结构体步长 856 (`mov #856; mla r0,r7,r0,r2`), 访问 [+0x3548]/[+0x346c]/[+0x37b0]; votes quest:12 |
| 0xce5c90 | quest | thunk | C | 函数体仅 `bx lr`; 其后 0xce5c94 析构才用 0xb606a0+8 vptr 并释放 [r4,#100] |
| 0x7e7ad8 | quest | worker | B | `strb r3,[r4,#368]` / `strb r1,[r4,#369]` 屏幕基类初始化 + VFP 常量化; votes quest:4 |
| 0xc2f2e0 | quest | orchestrator | B | 1836 字节栈 + `strb [r6,#384]`/`strb [r5,#369]` 同款屏幕初始化, 并调 0x7cc450; votes quest:7 |
| 0xce4f4c | quest | worker | C | 校验 `[r7,#4]` 长度后 `ldr [r7,#8] + r1*4` 取元素; 票数 monster-em:4 与代码形态无关 |
| 0x1addf4 | quest | orchestrator | B | ctor: 0x1ada88 基类, 写 vptr 0x168cff0+8, 清 +16..+36, 写 float 0x42000000 (32.0f) 到 +40 |
| 0x713b74 | quest | orchestrator | B | `ldr [r5,#60]` 判空决定 `mov r6,#5` 或 #9, 再 `bl 0x191688` 后调整; votes quest:35 |
| 0xc0f618 | quest | worker | B | 以步长 80 (`add r4,r4,#80`) 遍历, `bl 0xc19df8` 逐项处理; votes quest:7 |
| 0xc2d8f8 | render-gfx | worker | B | 648 字节栈 + 大量 `str` 铺绘制参数 (0x7f7fffff 掩码入 [sp,#624]); votes render-gfx:4 |
| 0x5d3fdc | otomo-ot | orchestrator | B | `cmp r1,#3` 后 `ldr [r0,#104+r1*4]` 取对象, `blx [vtable+140]`; votes otomo-ot:13 |
| 0x399ccc | quest | orchestrator | B | 析构: 读 `[r0,#-4]` 元素数, `rsb r0,r1,r1,lsl#4` 得步长 60 循环调 0x36000c 释放; votes quest:23 |
| 0xa692e8 | monster-em | worker | B | VFP 比较位置向量, `tst [r2,#68]` 的 #256/#512 分支; votes monster-em:4 |
| 0xcd1878 | quest | worker | B | ctor: 依次写三个 vptr (0xb748e4+8 / 0xb748cc+8 / 0xb6f908+8), `memset(+16, 0x54)`; votes quest:6 |
| 0x7d1efc | render-gfx | worker | B | 6 组 `vldr` 从 [r6,#0..24] 载入向量后做 VFP 运算; votes render-gfx:4 |
| 0xb09e6c | unknown | leaf | C | `cmp r1,#1/#3/#6` 多路分派 + `ldr pc,[r0,r6,lsl r9]`; votes 为空, 无字符串, callee 列表为空 |
| 0x54c130 | quest | orchestrator | B | `ldrb [r4,#1] <= 8` 九路跳转表 + 全局 0x12ed1b4 偏移 0x6bfc 与 0x6c34; votes quest:17 |
| 0x7bf1ec | quest | orchestrator | B | 1852+856 字节栈 + `strb [r9,#384]` / `strb [r5,#369]` 屏幕初始化; votes quest:6 |
| 0x328900 | monster-em | orchestrator | B | ctor: 0x887958 基类 + vptr 0x1513de0+8, `bl 0x31be70` 构造 +128 子对象; votes monster-em:4 |
| 0xcda7c4 | quest | orchestrator | B | `ldrb [r6,#24]` 守卫后走全局 0xb5ebcc + `ldr [r1 + r0*4, #520]` 取会话对象; votes quest:8 |
| 0x1f154c | monster-em | worker | C | 在栈上拼 16 字节记录后调 0x9fba6c / 0x9fc3d8; 票数 monster-em:2 与 quest:2 各半 |
| 0x28e040 | monster-em | orchestrator | B | `ldr [r5,#0x13c8]==1` 守卫 + 0x27c2a0/0x27bcd0/0x27bcc0; votes monster-em:17 |
| 0x9bcb0c | physics-math | leaf | C | 纯字段搬运: 交换 [r0,#472]/[#480]/[#484] 与 [r0,#476..], 并用 `orr r1,r2,r1,lsl#16` 拼 flag; 函数体在 0x9bcb34 pop 返回, 无 bl |
| 0xb8e7c0 | save-data | orchestrator | A | 直接字符串 "%s\acctemp.bin" (账号临时存档文件名), 配合 0x838538/0x8385e8/0x8296a4 文件读写; 读 [r4,#40] 状态机 #4 |
| 0x16414 | audio | thunk | B | 函数体 `mov r1,#0; strb r1,[r0,#104]; bx lr` 空实现; 紧随其后填 1..9 参数表并调 0x82fb08/0x831b90; votes audio:7 |
| 0x4628f8 | monster-em | orchestrator | B | 转发 `singleton(0x13dabcc)` -> `blx [vtable+32]`, 再尾跳 0x468fec; votes monster-em:22 |
| 0x7ff930 | quest | worker | B | 与 0x7e7ad8 同模: 104 字节栈 + `strb [r4,#368]`/`[r4,#369]`; votes quest:4 |
| 0xe23c8 | quest | orchestrator | B | `bl 0xe0b54` 后按 id 0x1d / 0x112 / 292 逐项 `0xe0da0` 查询; votes quest:9 |
| 0x1afd60 | quest | orchestrator | B | `ldr [r1,#36]` -> `ldr [r1,#332]` 取配置写 [r0,#8], 0xdaba4/0x194228 家族; votes quest:17 |
| 0x73768c | otomo-ot | orchestrator | B | `bl 0x738cf8` 同模块 + 0x51052c/0x5104d4/0x510584 三连取, 再 `ldrh [r7,#176]`; votes otomo-ot:10 |
| 0x1aab28 | quest | orchestrator | B | `singleton(0x168dffc)` -> `blx [vtable+28]` 以 (r1=6, r2=16) 分配; votes quest:9 |
| 0x55a218 | quest | worker | C | 栈上铺连续资源 id 0xe653..0xe65b 后调 0x152960; 唯一票 quest:1 |
| 0x800320 | quest | worker | C | 与 0x801680 同模屏幕初始化 (152 字节栈 + `strb [r9,#368]`); votes quest:4 |
| 0xa36fa4 | quest | orchestrator | C | `tst [r4,#86],#1` 守卫后从全局 0xe02bf0 连续拷 5 个字到栈; 票数 quest:5 |
| 0xdee34 | quest | orchestrator | B | 大量 `add rX,r9,#0x1be/0x1ba/0x162/0x15e/0x17a/0x176/0x172` 字段基址 + 0xdcXXX 家族; votes quest:41 |
| 0x9e15f0 | monster-em | orchestrator | B | `ldrb [r4,#144]` + 虚表槽 [r0,#100]/[+112] 调用, 0x9f51f8 判定 1 才落地; votes monster-em:8 |
| 0xc03964 | quest | orchestrator | B | `ldr [r5,#2648]` 守卫后 `blx [vtable+140]` 处理 [r5,#2636]; votes quest:7 |
| 0x1217efc | unknown | worker | C | 唯一 callee 0x12188dc; 主体是 `blx [r0,#1532]` 间接调用并按 r1-1 环绕取索引, 无子系统特征 |
| 0xb697cc | quest | orchestrator | B | 析构: vptr 0xcdaea0+8, 依次释放 [r4,#164]/[+196]/[+200]/[+204]; votes quest:8 |
| 0x2f38f8 | monster-em | orchestrator | B | 多次 `blx [vtable+520]` / `blx [vtable+432]` 虚调用 + `ldrsh` 字段判定; votes monster-em:5 |
| 0x6e62e0 | quest | orchestrator | B | `ldrb [r10,#0x5fb8]` 状态 1/2/3 三分支 + 全局 0x1152ff0 偏移 0x6bfc; votes quest:17 |
| 0xcd3138 | online-nex | orchestrator | B | ctor: vptr 0xb73038+8, 0xb27600 会话基类, `memset(+592,0x44)`, 写 [r4,#576]=0x10001; votes online-nex:8 与 quest:8 平票, 取网络侧结构证据 |
| 0xd08c8 | quest | thunk | C | 函数体仅 `b 0x2b908`; 无字符串, 仅 1 张 quest 票 |
| 0x822fcc | quest | orchestrator | B | `bl 0x8106e8` + `ldrb [r4,#24]` 引用计数自增 (`ldr [r4,#28]; add #1`) + [r4,#136]; votes quest:13 |
| 0x270fa0 | player-pl | orchestrator | B | 直接字符串 "pldummyact" (玩家 dummy action); 析构时释放 [r4,#124] 数组; votes audio:6, 但字符串指向 player |
| 0x87f6c | otomo-ot | orchestrator | B | `ldrb [r5,#2] - 7 <= 0xe` 的 15 路消息 id 跳转表; votes otomo-ot:10 |
| 0x4438a0 | monster-em | orchestrator | B | `bl 0x53aa84` 取标量后 `ble` 分支, 再读 [r5,#0x15ac]/[#0x15b0]; votes monster-em:19 |
| 0x9b0ee8 | quest | orchestrator | B | 887a24/7bb638 构造对象并嵌入 0x923288/0x9232c8 成员; votes quest:14 |
| 0x7838c0 | quest | orchestrator | B | `ldrb [r4,#1]` 分派 + `ldrb [r7,#0x1359]` 索引后读 +0x116c/0x1171 字段; votes quest:13 |
| 0xb3b840 | quest | thunk | B | 函数体仅 `bx lr`; 随后析构用 0xd08844+8 vptr 并 `bl 0x887660` 释放 [r4,#1308]; votes quest:17 |
| 0xbe33dc | quest | worker | B | `ldr [r1,#304]` 与 `ldr [r1,#-160]` 取对象, VFP 常量 + 0xc4aae4; votes quest:6 |
| 0x9683b8 | ui | thunk | B | 函数体仅 `bx lr`; 直接字符串 "mpScreenMap"/"resource" (屏幕表资源断言) + 0x887958/0x8879b4 基类 |
| 0xb3e4c | otomo-ot | worker | C | `ldrh [r4,#176] - 129 <= 10` 十一项跳转表; 票数 otomo-ot:2 过弱 |
| 0x801680 | quest | worker | C | 屏幕初始化同模 (104 字节栈 + `strb [r4,#368]` + VFP 常量); votes quest:4 |
| 0xc32e98 | render-gfx | orchestrator | B | 316+1024 字节栈, 0xc256d8 构造渲染参数, `str r3(7),[sp,#852]` 写图元类型; votes render-gfx:9 |
| 0x1e5784 | quest | orchestrator | B | 逐个校验 +4/+8/+12/+16/+20 指针链全非空后再分派; votes quest:16 |
| 0x2e7aa0 | monster-em | worker | C | 清 [r4,#0x2bf4]/[#11904]/[#0x2e84]/[#0x2ed2] 字段后读 [r5,#0x2ed2]; 票数 monster-em:3 |
| 0x448a64 | monster-em | orchestrator | B | `bl 0x53aa84` 取标量后 VFP 比较 `ble` 分支, 并转发 `singleton(0x13f4894)`; votes monster-em:29 |
| 0xbac7c4 | unknown | thunk | C | 函数体仅 `b 0x13f0fc4`; 无字符串, 仅 votes quest:2 |
| 0xbcd93c | quest | worker | C | 析构: vptr 0xc773fc+8, `blx [vtable+4]` 删 [r4,#2944]/[#2948]; votes quest:5 |
| 0xc8b3e4 | quest | worker | B | 对 r5+48/+64/+80 三组向量做 VFP 拷贝 (0x13b9c7c); votes quest:6 |
| 0xab0e8 | monster-em | worker | C | 从全局 0x178eacc 连续拷贝 float 数组到 +32..+56; 票数 monster-em:3 |
| 0x6810c4 | otomo-ot | orchestrator | B | `ldr [r4,#4]` 后 `cmp r5,#9` 十路跳转表 + 0x65f190/0x65d424; votes otomo-ot:26 |
| 0x780bc4 | quest | orchestrator | B | `bl 0x3be79c` + `ldrb [r5,#0x1359]` 索引后 0x61171c; votes quest:21 |
| 0x856c38 | quest | orchestrator | B | ctor: 0x84198c 基类, 写 vptr 0xfea5a4+8 与 +180 的第二 vptr; votes quest:28 |
| 0xcd934c | quest | orchestrator | B | `ldr [r0,#520]` 会话对象, 用 [r1,#92] 与 [r4,#40] 比较后 0x874190; votes quest:8 |
| 0x12213ac | unknown | leaf | C | 无 callee, 无 votes; 只有 `movw 0x1448/0x144c/0x1450` 字段写入与 `add r7,r7,#2` 数组遍历; 无子系统证据 |
| 0x264dc | otomo-ot | orchestrator | B | `str [r4,#2708]`, `strb [r4,#2684]=1`, `orr [r4,#2608],#4` 状态置位; votes otomo-ot:5 |
| 0xe5264 | quest | orchestrator | B | `ldrb [r4,#576]/[#577]` 作索引查 0x2641d0, 再取 `ldrh [r6,#6]`; votes quest:11 |
| 0x2b8120 | monster-em | orchestrator | B | `ldr [r4,#48]` 后经 0x2acfb8 写栈, 再 `strd [r4,#8]`/`strh [r4,#80]`; votes monster-em:9 |
| 0x71db38 | quest | orchestrator | B | `strb [r4,#200]=1` + `[r4,#152]` 三路状态 + `bl 0x718a0c(...,42,1,1)`; votes quest:14 |
| 0x3850b0 | quest | orchestrator | B | `[r4,#68] <= 6` 七路跳转表 + 全局 0x14b423c 偏移 0x6bfc/0x6c34; votes quest:20 |
| 0x13b7424 | quest | worker | C | 转发 `singleton(0x48cea8)` -> `blx [vtable+32]`, 无其它特征; 票数 quest:6 |
| 0x429760 | monster-em | orchestrator | B | ctor: 0x3faf64 基类, 写 [r3,#0x1670] vptr, 清 0x166c/0x1668/0x1664/0x1660; votes monster-em:11 |
| 0x40f35c | monster-em | orchestrator | B | `bl 0x4a1b6c` 取对象后 `tst [r4,#0x15e0],#64` 选 VFP 分支; votes monster-em:15 |
| 0x6b459c | otomo-ot | orchestrator | B | `[r4,#92] <= 11` 十二路 + `ldr [r4,#108] + r0*4 + 4` 取子项; votes otomo-ot:17 |
| 0x12a8c0 | quest | orchestrator | B | 访问器: `ldr [r2,#100]` 长度检查后 `ldr [r0,#108] + r1*4`; votes quest:22 |
| 0xb14c38 | quest | thunk | C | 函数体 `ldr r0,[r0,#4]; bx lr` 纯 getter; 仅 votes quest:4 |
| 0xb4814c | filesystem | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 直接字符串 "mst.xml" (master 数据 XML); 0x7cbdb4 拼路径 (空串时 pc 相对 0xa08bee) + 0x7aef68 取资源 |
| 0x3e8254 | otomo-ot | orchestrator | B | 756 字节栈 + `ldrb [r0,#0x367f]/[#0x367e]` 全局标志; votes otomo-ot:20 |
| 0x406050 | monster-em | orchestrator | B | `bl 0x4a1b6c` 后 `ldr [r6,#0x15e0]` 再 `blx [vtable+368]`; votes monster-em:9 |
| 0x631830 | otomo-ot | orchestrator | B | `bl 0x55bc4c(id 0x4b, 空时 0x47)` + `bl 0x56ea08(...,57,2)`; votes otomo-ot:13 |
| 0x71e780 | quest | orchestrator | B | 全局 0x111ab7c 偏移 0x6bfc + `[r4,#152]` 三路状态 + `bl 0x718a0c(...,43,1,1)`; votes quest:19 |

## 备注

- 无代码产出, 未 build / 未 git, 未写 UNCONFIRMED 占位值 (本任务只做标注, 不涉及 DEVELOP.md 数值)。
- 判 B 的 quest 票存在循环性: 0x7cXXXX、0x65XXXX、0x82XXXX 家族函数本身在本批被投为 quest, 因此调用它们的函数自动获得 quest 票。凡只剩这类循环票、且无结构/字符串佐证的 (0x55a218, 0x800320, 0x801680, 0xa36fa4, 0x13b69ac, 0x13b7424), 已降为 C; 其余带跳转表/字段偏移/资源 id 证据的保留 B。
- 0x408b28 / 0xd08c8 / 0xbac7c4 / 0xcc5af8 / 0xce5c90 / 0xb3b840 / 0x9683b8 的首条指令即返回或尾跳, 说明工具报告的函数范围与真实符号边界不一致; 这些行的 role 与 evidence 均按可见函数体裁定。



