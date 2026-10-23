# Tier B pass2 — slice-11 裁定

输入：`.tmp/mhgu/tierB2/slice-11.txt`（286 函数，按 insns 降序）+ 反汇编 `.tmp/mhgu/tierB2/slice-11.asm.txt`（每函数前 24 条指令）。汇总见文末 `## 汇总`（追加式写入，故置于末尾）。

判据（§8 纪律）：

- `A`：**独立信号**直接定向——① `strings` 行的类名/资源名/符号名；② `bl 0x3df2a8`/`0x3df378` 存档原语；③ vaddr 或 ≥2 个 callee 落在 **Pia 库区间 0x1311000..0x13AB000**；④ 已知单例字段立即数（本片为 `movw #0x6bfc`/`#0x6c34` 任务/会话单例，slice-01/06 已定性）；⑤ 已核种子（0x1C358/0xBBCD34/0xBBBDE0/0x8BCD84——本片无一命中）。
- `B`：votes 主导（top ≥ 1.6×次席且 top ≥ 3）或 callee 簇一致（≥3/4 落同一已定性簇）且与票不冲突；无指令级定向证据。
- `C`：分票（次席 ≥ 0.6×top）、top ≤ 2 的弱票、`votes=[-]`，或票与 callee 簇互相矛盾且无指令可裁。
- role 按 callee 数机械判定（与 slice-10 同口径）：`leaf`=0，`worker`=1..7，`orchestrator`=≥8（本片无 `thunk`：无 4 指令以下的独立条目）。
- 字符串与票数冲突时按 §8 取字符串，并在 evidence 注明冲突。
- 全片通用件（不构成子系统证据）：`0x7aa47c` 单例访问器、`0x7bb638` 分配器、`0x887660` 释放、`0x887648` 引用计数递增、`0x887810`/`0x887958`/`0x8879b4` 分配/基类构造、`0x7aedcc` 类注册、`0x7af3c4` 共用空桩、`0x13exxxx`/`0x13fxxxx` 导入跳板。

## 表（1-28）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x38a950 | monster-em | orchestrator | B | `bl 0x65cb3c`（取记录）→ `bl 0x38b34c` → 全局 `0x14ae3b0` 单例 `ldr r0,[r0]` 后 `bl 0x3ae21c`，`cmp r0,#1` 分支再 `bl 0x3a8c3c`/`bl 0x3a9e38`，尾 `str r0,[r4,#92]`；votes monster-em:13 vs quest:3（4.3×） |
| 0x3aaf60 | otomo-ot | worker | C | `ldrb r0,[r5,#184]; tst r0,#8; bne` 位门控，随后 `movw r0,#0x1515` + `ldrb r0,[r5,r0]`、`cmp r0,#2`、`movw r0,#0x12d4`（对象字段判定）；唯一 callee 0x5e438；votes otomo-ot:1（弱） |
| 0x4af2dc | quest | orchestrator | C | `bl 0x276790` 取对象后 `cmp r5,#0` 判空；callee 混 0x25d6bc/0x26e600（0x25-0x26）与 0xdaba4/0xdadf0/0xdad24（0xda）；votes quest:5 vs otomo-ot:4（1.25×，分票） |
| 0x5ab30c | quest | orchestrator | B | 主体为访问器 `ldr r1,[r0,#80]; cmp r1,#1; movwhi r0,#0x1; bx lr`，随后 `ldr r0,[pc]=0x129441c` 全局 `str r1,[r0,#0]` 清零；votes quest:13 vs otomo-ot:5（2.6×） |
| 0x5dd188 | quest | orchestrator | C | `ldr r0,[r4,#140]; cmp r0,#1; bne` 状态门控，命中后 `mov r1,#4; mov r0,#0; mov r2,#2` 调 0x56exxx 簇；votes quest:7 vs otomo-ot:5（1.4×，分票） |
| 0x61abb8 | quest | worker | C | `bl 0x666d08` 后 `ldr r0,[r5,#156]; cmn r0,#1; beq` 与 `ldr r0,[r5,#148]` 双字段判空；callee 为 0x56d97c/0x56da30/0x56dc28/0x56dc88 + 0x7aa47c；votes quest:4 vs otomo-ot:3（1.33×） |
| 0x649a80 | quest | orchestrator | B | `ldr r0,[pc]=0x11f6ac4` → `add r0,r0,#8` → `str r0,[r8,#0]`（装 vtable），再 `ldr r0,[r8,#236]` 判空分支；callee 为 0x649dd4/0x649f24/0x64a038…0x64a5c4 连续簇 + 自递归；votes quest:10 vs otomo-ot:4（2.5×） |
| 0x66360c | quest | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) `movw r1,#0x6bfc` + `ldr r0,[pc]=0x11d5cf4` 单例 + `ldr r1,[r0,r1]` + `tst r1,#49152`(0xC000)：0x6bfc 为任务/会话单例字段（slice-01/06 已定性）；votes quest:11 一致 |
| 0x6bfa30 | quest | orchestrator | C | `ldr r0,[r4,#188]; cmp r0,#5; bhi` 后 `mov r0,r0,lsl #2; add r1,pc,#4; ldr r0,[r0,r1]` = 6 项跳转表；callee 含 0x14d080/0x14d704/0x14e5f0/0x14e7f4（0x14xxxx）与 0x3f84xx/0x3f85xx；votes quest:13 vs otomo-ot:10（1.3×，分票） |
| 0x6eb9fc | quest | orchestrator | B | `ldr r0,[pc]=0x114d970` 单例、`mov r1,#0`、`mov r11,#0` 起手，随后 `bl 0x6ebd50`/`0x6ec160`/`0x6ec2cc` 同族 0x6exxxx + 0x523180/0x5247f4；votes quest:10 vs otomo-ot:1（10×） |
| 0x735e6c | quest | worker | B | `ldr r1,[pc]=0x110333c`/`0x1103334` 取两个全局单例，`ldrb r0,[r0,#320]` 读状态字节；callee 0x1a6340/0x1a2c8c（0x1axxxx）+0x54ee34；votes quest:3（唯一票源） |
| 0x78e514 | quest | orchestrator | B | `add r4,sp,#72; bl 0x2fcb0`（栈上对象构造）+ `ldr r0,[pc]=0x10aa870`，`mov r1,#0; mov r2,#1`；callee 含 0x1990dc/0x1978d0（0x19xxxx）、0x523194/0x523150/0x525e44；votes quest:8（唯一票源） |
| 0xa2a2c0 | quest | worker | B | 段首 `bx lr` + `b 0x7af3c4`（共用空桩），随后 `ldr r0,[pc]=0xe190ac` 单例取用；callee 含 bl 0x7aedcc 类注册与相邻 0xa2a29c/0xa2a2a8/0xa2a2ac；votes quest:6 vs render-gfx:1（6×） |
| 0xaef1e4 | render-gfx | worker | B | 入口 `push {r4-r11,lr}` + `add r11,sp,#28` + `vpush`(`ed2d8b06`) + `sub sp,#32`（VFP 帧），`str r1,[sp,#12]`；callee 0x882674/0x885824/0x885804（0x885xxxx 渲染簇）+0xb002d8；votes render-gfx:4（57 caller） |
| 0xb22b1c | quest | worker | B | `movw r2,#0x3510` + `ldr r6,[sp,#112]` + `ldr r0,[r4,#8]`（参数打包）；callee 0x80d150/0x8103b8（0x80xxxx）+0xb2a6a4/0xb31f7c；votes quest:4 vs monster-em:1/online-nex:1（4×） |
| 0xb2e8f8 | quest | worker | C | `ldr r0,[pc]=0xd15664` + `mvn r5,#0` + `add r8,r4,#368` 初始化循环；callee 仅 0xb27600/0xb27630 两个相邻访问器；votes quest:2（弱） |
| 0x179e5c | monster-em | worker | B | `movw r0,#0x2834` 字段基址 + VFP 保存，`mov r7,r3`；callee 0x27bcd0/0x27c6f8（0x27xxxx 角色簇）+0x40b10/0x40b50/0x17ba24；votes monster-em:4 vs kernel-os:1/otomo-ot:1（4×） |
| 0x17cbf0 | otomo-ot | orchestrator | B | `ldr r0,[pc]=0x16bbfac` 单例、`movw r11,#0xb5f9`、`movw r7,#0x1428`（对象字段）、`bl 0x7e174`；callee 含 0x17e26c/0x17ea00 同族；字符串 `gementJobE`/`ManagementJobE` 为 C++ 符号碎片，不含子系统名，不升 A；votes otomo-ot:7 vs monster-em:3（2.3×） |
| 0x29ace8 | quest | worker | B | `movw r0,#0xfd8` + `add r2,r4,r0`（大偏移字段）+ `bl 0x152960`（通用表）；callee 0x3268d8/0x31d6f8/0x887660；votes quest:3 vs monster-em:1（3×） |
| 0x465d64 | monster-em | orchestrator | B | `mov r1,#0; mvn r2,#0; bl 0x4a2f5c` 初始化，后 `ldrb r0,[r4,#0]`；callee 含 0x4a1d34/0x4a1e50/0x4a2f5c（0x4axxxx 敌事件簇）+bl 0x7aedcc；votes monster-em:7 vs quest:2（3.5×） |
| 0x55b430 | quest | worker | C | 栈上记录构造：`ldr r1,[pc]=0x12df34c` 单例、`movw r2,#0xf078`、`str r1,[sp,#0]`/`str r2,[sp,#4]`…`str r2,[sp,#36]`；唯一 callee 0x152960；votes quest:1（极弱） |
| 0x861efc | ui | worker | A | 字符串 `NGWordList`（屏蔽词表；与 tierB2-slice-05 的 cProfanityFilter→ui 同口径）；反汇编 `movw r1,#0x401`、`movw r0,#0x449`、`strb r5,[r4,#1074]` 逐字段清词表；votes monster-em:6 为通用簇票，按 §8 取字符串 |
| 0x8a591c | physics-math | worker | C | 入口 `vpush`(`ed2d8b10`) + `sub sp,#32`，随后连续协处理器指令 `ed95da10`/`ee000a10`/`ee688a09`（VFP 变换）；只调 0x8a8334/0x8a4358 同族 + 0x7cc110；votes monster-em:4 vs quest:3（1.33×，分票） |
| 0x9eac2c | online-nex | worker | B | `vpush`(`ed2d8b0c`)+`sub sp,#168` 后 `ldr r0,[r0,#92]` 取句柄；callee 0x7d1238/0x7d15b8（0x7dxxxx 网络/数学簇）+0x9ea524 同族；votes online-nex:3（唯一票源） |
| 0xa1ca0c | quest | worker | C | `vpush`(`ed2d8b0c`) + `ldr r0,[pc]=0xe25f94` 单例，尾部 `str r1,[r5,#20]`/`str r2,[r5,#24]` 写成员；唯一业务 callee 0xc8ec60 + 0x7aa47c；votes quest:2（弱） |
| 0xb67794 | quest | orchestrator | B | `ldr r5,[r4,#100]; beq` / `ldr r1,[r4,#104]; beq` 双判空后 `bcc` 循环遍历；callee 含 0x8260d4/0x826130/0x82710c（0x826x-0x827x 反射/序列化簇）+ 自递归；votes quest:8 vs audio:2（4×） |
| 0xc5b5f8 | render-gfx | worker | B | `vpush`(`ed2d8b0a`)、`cmp r4,#0; beq` 早退、`movw r0,#0x1074` + `add r6,r5,r0` 元素步长；callee 0x8855c0/0x8857b4（0x885xxxx 渲染簇）+bl 0x7aedcc；votes render-gfx:2 vs monster-em:1/quest:1（2×，簇一致） |
| 0x121b808 | unknown | leaf | C | `callees=-`、`votes=[-]`；反汇编 `ldr r0,[r11,#16]`、`mvn r8,#5`、`ldr r3,[r5,#32]` 为普通参数整理，无子系统线索 |

## 表（29-57）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x13c555c | online-nex | orchestrator | A | 字符串 `%255[^:]:%d` / `%s:%d` / `%255[^:]:%d:%255s`（host:port 解析）+ `ldr r0,[pc]=0x1cb7d2` pc 相对取串、`ldr r8,[r4,#1052]` 判空；13 callee 全 0x13cxxxx/0x13dxxxx（0x13cdd3c/0x13dd364/0x13d7484/0x13dc7a8）；votes online-nex:10 一致 |
| 0xa9b10 | monster-em | worker | B | `movw r1,#0x1428` + `add r6,r0,r1`（对象字段 0x1428，slice-02 记录为怪物对象字段）+ `ldr r0,[pc]=0x178f250` 单例后 `bl 0x2f7b54`，`cmp r0,#1`；callee 0x276748/0x2f7b48/0x2f7b54；votes monster-em:3（唯一票源） |
| 0x16491c | otomo-ot | worker | C | `ldr r0,[pc]=0x16d5fb4` 单例 + `movw r0,#0x2a08`（成员偏移）+ `add r0,r5,#10`；callee 0x3cf5d0/0x3cf568/0x3cfd74 同族 + 0x7c9198/0x7c9288；votes otomo-ot:3 vs monster-em:2（1.5×，未达 1.6×） |
| 0x38d990 | monster-em | orchestrator | B | `bl 0x65cb3c`(r1=4) 后 `str r0,[r11,#400]` 清零字段 400，再 `bl 0x3ae744`（0x3axxxx 簇）；callee 含 0x524580/0x5245a8/0x526d94/0x526e00/0x526eb0/0x526ef8（0x52xxxx 表簇）；votes monster-em:13 vs quest:1 |
| 0x665ad8 | quest | worker | B | `ldr r0,[pc]=0x11d3290` 单例 → `bl 0x276278` → `cmp r0,#0`，随后 `.word 0x3c`/`.word 0x58`（60/88 两个常量参数）与 0x570688/0x570710 栈对象构造；votes quest:3 vs otomo-ot:1（3×） |
| 0x709a08 | quest | orchestrator | B | `movw r0,#0x1f5c` + `ldr r0,[r6,r0]`（容器字段）→ `bl 0x12ce24` 循环（`add r5,r5,#1`）；17 callee 中 14 个落 0xdcc3c-0xdce78 连续段（0xdc-0xdd 数据/格式化簇）；votes quest:16 vs otomo-ot:1 |
| 0x7572b4 | quest | orchestrator | B | `ldr r0,[r4,#76]; sub r0,r0,#1; cmp r0,#7; bhi` 后 PC 跳转表（表内 `.word 0x2d4`/`0xc8`）= 8 路状态分派；callee 0x65cb3c/0x65e794/0x65e8cc/0x65e5bc + 0x25f098/0x25f644/0x2600e4；votes quest:8 vs otomo-ot:4（2×） |
| 0x76c824 | quest | orchestrator | B | `ldr r0,[pc]=0x10cc378` 单例、`movw r1,#0x8a88`+`movt r1,#0x4`(=0x48a88) 后 `strb r0,[r1,#6]`/`[#3]`/`[#5]` 逐字节置标志；callee 0x65cba0/0x65cbc4/0x65cb3c 三连 + 0x54ecc0/0x54edec；votes quest:8 vs otomo-ot:2（4×） |
| 0x7d07f4 | physics-math | worker | C | 纯 VFP：`vpush`(`ed2d8b10`)、`vldr`(`eddf0ac6`)、`ee016aa1`/`eeb46ae0`（vdiv/vcmp）、`eef1fa10`（vmrs APSR）；仅 0x7cf274 同族 + 0x8099e4 + 0x13efddc 导入跳板；votes quest:2 vs monster-em:1（弱） |
| 0x7d0b40 | physics-math | worker | C | 与 0x7d07f4 逐指令同模板（`ed2d8b10`/`eddf0ac6`/`ee016aa1`/`eeb46ae0`/`eef1fa10`）；callee 0x7cf390 + 0x809434 + 0x13efddc；votes quest:2 vs monster-em:1（弱） |
| 0xa24ff0 | quest | worker | C | `ldr r1,[r0,#0]`、`cmp r2,#0`、`movwne lr,#0x3`、`mov r2,r12` 参数整理后转 VFP 段（`ed2d8b02`）；callee 0x13bb330 + 0x7aa47c；votes quest:2（弱） |
| 0xb38bc8 | quest | worker | C | `ldr r1,[pc]=0xd002e4` 单例链 `ldr [r1,#28]` 判空 → `ldr r1,[r0,#112]`、`add r2,r1,#15`、`ldrb r2,[r1,#84]`；业务 callee 仅 0x121b7d0；votes quest:3（唯一票源，无簇旁证） |
| 0xbbacbc | quest | orchestrator | B | `add r9,r0,#64`（子对象）、`add r1,sp,#4` 传栈槽、`ldr r1,[r1,#4]`、`cmps r2,r1` 比较；callee 0x7ca818/0x7cb27c/0x7cb374 同族三连 + 0x9fba6c；votes quest:7 vs monster-em:1（7×） |
| 0x47be2c | monster-em | orchestrator | B | `bl 0x4a3060` 后 `cmp r5,#0; blt` 早退，`mvn r3,#0` 作 -1 标记；13 callee 含 0x4a2744/0x4a1b6c/0x4a2304/0x4a3164/0x4a1b50（0x4axxxx 敌事件簇 5 个）+0x47c174+自递归；votes monster-em:13（唯一票源） |
| 0x7880b0 | quest | orchestrator | B | `ldrb r1,[r4,#108]` + `ldr r0,[r4,#84]` → `bl 0x56c49c` → `cmp r0,#8; bhi` + PC 跳转表 = 9 路分派；callee 0x56c168/0x56c49c、0x65f8c4/0x65f914、0x53e254/0x53e850/0x53f3a8；votes quest:10（唯一票源） |
| 0x7c7d54 | physics-math | worker | C | `bl 0x8098b4`（0x809xxxx 数学簇）后 `vldr`(`ed9d0a01`) 取返回值，`pop {r11,pc}` 直接返回；尾随块为纯 VFP（`ee33aa41`/`ee359a42`/`ee2b1a0b`）；votes online-nex:1/monster-em:1/quest:1 三方平票 |
| 0xa179bc | filesystem | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `mpDynamicPath` / `resource`（mp* 资源类名，slice-06 口径 mp*→filesystem）；`bl 0xc8f5a4` 基构造、`str r5,[r4,#72]`/`[r4,#76]` 清资源句柄、pc 相对取串 0xe2b83c/0xe2b810；callee 0xc8f5f0/0xc8f718/0xc179e4；votes quest:10 与字符串冲突，按 §8 取字符串 |
| 0xb8c0e0 | unknown | worker | C | `bl 0x887810`（分配器）+ `ldr r0,[pc]=0xcb87ec` + `add r5,r4,#192` + `strb r6,[r4,#264]` + `str r4,[r0,#0]`（挂全局）；callee 0x86a44c/0x86a6e0 同族对；votes otomo-ot:1/kernel-os:1/online-nex:1/quest:1 四向平票 |
| 0xc7f5c | monster-em | worker | C | `cmp r2,#255`、`cmp r1,#10`、`tst r2,#1`/`#64`/`#128` 位掩码解码（0x1/0x40/0x80），`mov r1,#7` 返回值；唯一 callee 为导入跳板 0x13efda0；votes monster-em:1（极弱） |
| 0xeed08 | quest | worker | B | 段首尾跳 `b 0x2b908`（基类析构）+ `bl 0x2b908`，`ldr r0,[pc]=0x174b17c` 单例后 `bl 0x7aa47c`，再连续 `str r8,[sp,#12..24]` 清零（析构惯用法，slice-06 的 0xf1180 同型）；votes quest:3（唯一票源） |
| 0x17e6bc | online-nex | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `DL_DataStoreGetNewArrivedNotificationsParamE` / `3nex30_DDL_DataStoreSpecificMetaInfoE` / `ReqPostInfoV1E`（NEX DataStore DDL 声明名）；`vpush` + `sub sp,#56` 后 `cmp r0,#0; beq` + `sub sp,r11,#96` 收尾；votes monster-em:4 与字符串冲突，按 §8 取字符串 |
| 0x3fa480 | monster-em | worker | B | `movw r1,#0x162c` + `add r1,r0,r1` 后 VFP `vldr`/`vcmp`(`eeb51ac0`)/`vmrs`(`eef1fa10`) + `ble` 分支，`vstr`(`ed810a00`) 写回、`bx lr`；callee 0x43b8d8/0x43b8f8/0x4a2744（0x43b-0x4a EM 簇）+0x539f4c；votes monster-em:6（唯一票源） |
| 0x6b84e4 | otomo-ot | worker | B | `bl 0x56da30`，段内 `b 0x97d8`/`b 0x56dc20`/`b 0x56dc24` 尾跳桩，主体 `bl 0x56e528(r4,11,0)` 两次下发命令；callee 全 0x56dxxx/0x56exxx（slice-03 记作 otomo 命令/UI 注册族）；votes otomo-ot:7（唯一票源，0 caller） |
| 0x761618 | quest | orchestrator | B | `ldr r0,[r4,#4]`、`cmp r1,#7`、`ldr r0,[pc]=0x10d7528` 单例、`vldr`(`eeb20a04`)；callee 0x76c674/0x76cb70/0x76cc58 同族 + 0x75f878/0x50ed84/0x50c624/0x5f0ce8/0x5fe194；votes quest:13 vs otomo-ot:1（13×） |
| 0x7cd640 | physics-math | leaf | C | `push {r11,lr}` + `vpush`(`ed2d8b10`) + `ldr r12,[pc,#812]=0x106b4e0` 取常量表，随后 `vldr ed920a00`/`ed936a00`、`vdiv`(`ee3e5a42`/`ee343ac2`)、`vsqrt`(`ee723ac0`) 纯浮点链，`callees=-`、`votes=[-]` |
| 0x82442c | quest | worker | C | `ldrb r0,[r4,#24]; cmp #0` / `cmp r0,#2` 状态门控，`ldr r0,[r4,#52]` 判空；callee 全为导入跳板 0x13efe00/0x13efe0c（互斥锁对）/0x13efda0；votes quest:2 vs monster-em:1（60 caller 薄封装，票弱） |
| 0x9be320 | render-gfx | orchestrator | C | `ldrb r0,[r4,#242]; tst r0,#8` 位门控 + `bl 0xb91f44`（0xb9 渲染）后 `cmp r5,#0`；9 callee 中 0xba5770/0xb91f44/0xa5b584/0xaeb164/0xaeb1bc 共 5 个属 0xa5-0xba 渲染簇，但 votes quest:8 与簇相反，无指令可裁 → C |
| 0xa9af40 | quest | worker | B | `push`+`sub sp,#60` 后 `ldr r0,[pc]` 单例、栈槽 `strb sp,[r3,pc,lsl r0]` VFP 保存；callee 0x882674（渲染小工具）/0xc90094/0xa58d7c（跨簇基构造）/bl 0x7aedcc；votes quest:4 vs render-gfx:1（4×） |
| 0xb2c470 | quest | worker | C | `ldr r0,[r8,#232]; cmp r0,#6` 后向 `[r0,#0]/[#4]/[#8]` 连写三个 dword，再取全局 `0xd0ceec`；唯一 callee 0xba77e4（0xba 渲染簇），votes quest:1——票与簇方向相反且都弱 |

## 表（58-80）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xea028 | quest | orchestrator | B | `sub sp,#512` + `mov r0,sp; mov r1,#512` 建 512 字节栈缓冲后 `bl 0x13efd88`（memset）+ `bcs` 循环；callee 0x55bcac/0x55bc4c、0x2b8f0、bl 0x7aedcc 类注册；votes quest:6 vs otomo-ot:2（3×） |
| 0xec64c | item | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cInsectAttrFeed`（猎虫属性喂养数据类）；反汇编为字节流写出器：`ldrh r1,[r5,#4]` 取下标、`strb r6,[r1,r0]` 写缓冲、`ldr r0,[r4,#12]; add r0,r0,#1; str r0,[r4,#12]` 递增位置指针；votes quest:5 为通用簇票，按 §8 取字符串 |
| 0x28c6b0 | monster-em | worker | C | `bl 0x2838cc` 前置 + `ldr r0,[pc]=0x15ac6a8` 后 `bl 0x887660` 释放，再取全局 0x15ac668/0x15acf10（析构形态），自递归 0x28c6b0；votes monster-em:3 vs quest:3（1.0×，平票） |
| 0x381738 | filesystem | worker | A | 字符串 `cResourceSample`（资源类名，与 slice-06 mp*/resource→filesystem 同口径）；反汇编 `ldr r0,[pc]=0x11cf61a`（pc 相对取串）+ 两次 `bl 0x231d2c` 读 `[r5,#16]` 成员 + `vldr`(`ed950a08`)；votes quest:5 冲突，按字符串取 filesystem |
| 0x4114fc | monster-em | orchestrator | B | 段首尾跳 `b 0x43b488`（基类），另一入口 `bl 0x43b488` 后 `bl 0x4a1b6c`、`movw r1,#0x15f4` + `str r0,[r4,r1]` 写对象字段；callee 含 0x4a1c78/0x4a2304/0x4a1ba4/0x41183c；votes monster-em:7 vs quest:1（7×） |
| 0x52e184 | quest | worker | B | 段首尾跳 `b 0x2b908` + `bl 0x2b908`（基类析构），随后 `mov r8,#0` 与 `str r8,[sp,#12..28]` 连清零（析构惯用法，与 0xeed08 同型）；votes quest:3（唯一票源） |
| 0xb79b00 | physics-math | leaf | C | `callees=-`、`votes=[-]`；`ldrsh r5,[r2,#2]`/`ldrsh r2,[r2,#0]` + `mla r2,r4,r5,r2`（二维索引）+ VFP `ee002a10`/`ee055a10`/`eeb80ac0` 纯浮点，无子系统线索 |
| 0xc136c0 | render-gfx | worker | C | `cmp r1,#1; bne` 形态分派，循环 `sub r6,r0,#1; mov r7,#0; cmps r0,r7; bls` + `ldr r0,[r4,#0]; add r7,r7,#1` 遍历；唯一 callee 0xc13a00（slice-10 已判 render-gfx），votes render-gfx:1（弱） |
| 0x13aef24 | online-nex | worker | A | 3 个 callee 落 Pia 区间（0x1311000..0x13AB000）：0x139e850/0x13a5fa0/0x13a61f8；反汇编 `ldr r0,[r0,#0]; cmp r0,#0; bxeq lr` 早退后把同一指针写 `[sp,#24]/[sp,#48]/[sp,#72]/[sp,#96]/[sp,#120]`（5 条等距记录）；votes online-nex:5 一致 |
| 0x56180 | quest | orchestrator | B | `ldr r0,[r4,#100]; cmp r0,#0` 判空 → `bl 0x7af3e4`（共用空桩）+ `str r0,[r4,#108]` 清成员，再 `ldr r0,[r4,#112]` 判空循环；callee 含 0x8870b8/0x887100、0x564bc、bl 0x7aedcc；votes quest:6 vs monster-em:1/audio:1（6×） |
| 0xce160 | item | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cAmuletBase`（护石数据基类）；反汇编为流/数组处理：`cmps r0,r1; bcc` 边界判定、`ldr r0,[r4,#0]; ldr r1,[r0,#56]; blx r1` 虚调用、再取 `[r4,#8]/[r4,#12]`；votes quest:5 为通用簇票，按字符串取 item |
| 0x244848 | render-gfx | worker | B | `cmps r1,r7` + 连续 `ldrh r1,[r6,#8]`/`[#10]`/`[#12]` 与 `addne r0,r0,#1`（统计不等于某值的元素数）；callee 0x6cf768/0x6cf974/0x6cfa60（slice-08 记 0x6c70c8-0x6c8a2c 渲染簇邻域）+0x50f78c/0x3d8154；votes render-gfx:4 vs quest:1/otomo-ot:1（4×） |
| 0x2f2ba0 | monster-em | worker | B | `movw r0,#0x13c4`、`movw r0,#0x3216` + `ldrb r0,[r4,r0]` + `sub r0,r0,#25` + `cmp r0,#45; bhi` + `mov r0,r0,lsl #2` = 46 项跳转表（枚举 25..70 分派）；5 callee 全 0x27-0x28 角色簇（0x2a5cbc/0x27b918/0x2864e0/0x2864c4/0x282f58）；votes monster-em:2 vs 其余各 1 |
| 0x4ac3bc | render-gfx | worker | C | `vpush`(`ed2d8b02`) 后连续 `movw r2/r3/r12/r6/lr/r9,#0x0`、`movw r8,#0x8000` = 参数/标志整理（8 个寄存器置常量）；callee 仅导入跳板 0x13eff80/0x13eff8c；votes render-gfx:2（弱，21 caller） |
| 0x576014 | quest | worker | B | `ldr r3,[r10,#136]; cmp r3,#1` + `movw r2,#0x45cc` + 全局表 `ldrh r1,[r1,#178]` + `ldr r2,[r10,#96]` 组参；callee 0x56df00/0x56e04c/0x56e530/0x56e538/0x56e808/0x56fb94；votes quest:5 vs otomo-ot:2（2.5×） |
| 0x62172c | otomo-ot | orchestrator | B | `vpush`(`ed2d8b02`) 后 `movw r2,#0x4240`+`movt r2,#0xf`(=1000000) 作超时/上限，`ldr r0,[r7,#8]`/`[r7,#12]` 双判空；callee 含 0x56e528/0x56e538/0x56e7b8/0x56e808/0x56ef50（0x56exxx 簇）与 0x54533c/0x54566c/0x545a40/0x545ce8；votes otomo-ot:11 vs quest:3（3.7×） |
| 0x6eb6c0 | quest | worker | B | `sub sp,#52` 后在栈上组参：全局 0x114d4bc → `[sp,#40]`、pc 相对 0xf647ec → `[sp,#32]`、全局 0x114d4b0；callee 0x560ef0/0x524820/0x142938/0x142de4；votes quest:4 vs otomo-ot:1（4×） |
| 0x7d6594 | physics-math | worker | C | 纯 VFP 变换序列：`vpush`(`ed2d8b0a`) 后 `eeb14a41`/`ed8d3a14`/`eeb13a42`/`ed8d4a15`/`ed8d3a16`/`ed8d0a18`（vldr/vmov/vstr 对 sp+0x50..0x64 连续槽）；callee 0x2332ac/0x7cf7f0/0x13efddc；votes render-gfx:1/online-nex:1/monster-em:1 三方平票 |
| 0x87031c | quest | worker | B | `add r1,pc,r1; str r1,[r0,#0]`（装 pc 相对 vtable）、`movw r1,#0x4b`+`movt r1,#0x2`(=0x2004b)、`ldm/stm r0 {r1,r5,r6}`、`add r1,r0,#16` 再整块拷贝 = 静态记录初始化；callee 0x887a24/0x7bb638/0xc48d90/bl 0x7aedcc；votes quest:4 vs render-gfx:2（2×） |
| 0x89fca0 | physics-math | worker | C | `vpush`(`ed2d8b10`) + `ldm/stm r3 {r12,lr}` 取常量对、`ldr r5,[r7,r9,lsl #2]` 数组索引、`ee02ea10`/`ee01ca10`/`ee033a10`（vmov）纯 VFP；唯一 callee 为导入跳板 0x13efddc；votes monster-em:1（极弱） |
| 0x9cd0c0 | physics-math | worker | C | 与 0x89fca0 逐指令同模板（`ed2d8b10`/`ee02ea10`/`ee01ca10`/`ee033a10`/`ed9f0ab2`），同 callee 0x13efddc；votes monster-em:1（极弱） |
| 0xa1d158 | quest | worker | B | `ldr r7,[r4,#304]` 取计数后 `sub lr,r7,#1`/`sub r3,r7,#2`、`cmps r2,r3; bls` 环形缓冲边界判定，再 `ldr r1,[r4,#308]`、`ldr r6,[r4,#48]` 取基址；callee 0x7af3a0/0xa211a4/0xa21b2c；votes quest:3（唯一票源） |
| 0xb4ec44 | render-gfx | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `stex`（纹理资源扩展名；slice-10 以 `rtex` 同判 render-gfx）；callee ≥10（截断）含 0xb05044/0xb05080/0xb04a90/0xb51b00（0xb0-0xb5 渲染簇）、0x82fb08/0x82fb10/0x831b90（音频簇）、bl 0x7aedcc/0x7aa47c/0x8870b8；votes quest:7 audio:3 冲突，按字符串取 render-gfx |

## 表（81-104）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x11a72bc | monster-em | worker | B | `blx r1` 间接调用后做标志打包：`ldr r1,[sp,#44]; cmp r5,#4; orr r1,r1,#2; str r1,[sp,#44]`、`orr r0,r0,#32`、`str r0,[sp,#224]`；callee 0x28272c/0x282850/0x2acf90（0x28-0x2a 角色簇）+0x40b10/0x40b50；votes monster-em:4 vs otomo-ot:1（4×） |
| 0x159b18 | monster-em | worker | B | `sub sp,#412` 后连续 `str r9,[sp,#52]`…`str r9,[sp,#0]`（9 条）清栈上结构，再调 0x26e354/0x26f5b0/0x26e50c；callee 含 0x7ca404、0xe0d90/0xdadb8；votes monster-em:4 vs quest:2（2×） |
| 0x325b48 | quest | worker | B | VFP `ee026a10`/`eeb81a41`/`ee210a00`/`ee220a00`（vmov/vcvt）+ `ldr r0,[r5,#0]; tst r0,#16` 位门控；callee 0x7cc110/0x7aa47c/bl 0x7aedcc/0x325e80；votes quest:3 vs monster-em:1（3×） |
| 0x3b4df4 | otomo-ot | worker | B | `ldr r0,[pc]=0x1483ee8` 单例后连续读 `ldrb r1,[r0,#76]`/`ldrb r2,[r0,#80]`/`ldrb r0,[r0,#83]` 三字节状态（`cmp r1,#5`、`sub r1,r2,#3`）；callee 0x227ba8/0x227b3c/0x216708/0x3c06b4；votes otomo-ot:4 vs quest:1（4×） |
| 0x77e050 | otomo-ot | orchestrator | B | 逐成员构造：`movw r0,#0x1370; add r0,r4,r0; bl 0x54ed74`，再 +0x1394、`movw r0,#0x13c4; str r11,[r4,r0]`（大对象成员表）；callee 0x70e7b0/0x53da04/0x53e06c/0x53e7c8/0x53f320/0x26e354；votes otomo-ot:7 vs monster-em:3/quest:3（2.3×） |
| 0xb244f0 | quest | orchestrator | C | 一次性取 6 个全局（`ldr r4,[pc]=0xd1d5bc` 及多条 `ldr rX,[pc,rX]`）+ `mov r1,#9728`(0x2600) 作长度；callee 0x812240/0xb25628/0xb25680/0xb29b78/0xb3357c/0xb338d4/0x85faa8；votes quest:5 vs monster-em:4（1.25×，分票） |
| 0xc3ab78 | render-gfx | orchestrator | B | 栈上重复填三元组 `str r0,[sp,#16]/[#20]/[#28]`、`add r0,sp,#320`、`mvn r1,#2147483648`(0x80000000) 后 `bl 0xc178c0`（slice-02 记录的渲染核心）；callee 0xc10370/0xc1bb28/0xc1c3b8/0xc31ca8/0xc3ee74/0xc46124；votes render-gfx:7 vs quest:3（2.3×） |
| 0xc442d8 | render-gfx | orchestrator | B | 链表/容器遍历：`cmp r5,#1; mov r5,#0; ldreq r5,[r2,#72]`、`ldrb r2,[r1,#12]; cmpsne r5,r1`、`ldrb r1,[r1,#31]`；callee 0xc1bac8/0xc1bb28/0xc1bc5c/0xc1bdb8（0xc1bxxx 渲染簇）+0xb6f128/0xb6f1b0 + 自递归；votes render-gfx:7 vs quest:2（3.5×） |
| 0x1193c00 | render-gfx | orchestrator | B | `blx r2` 后 `mov r2,#268435456`(0x10000000 渲染标志) + `bl 0x283238`，再 `cmp r5,#3; bhi` + PC 跳转表（4 路）；callee 0x282fd8/0x283238/0x281998/0x281c30/0x2a84d8/0x950bcc；votes render-gfx:7 vs monster-em:3（2.3×） |
| 0x13a909c | online-nex | orchestrator | A | 9 个 callee 落 Pia 区间（0x13a0a50/0x13a359c/0x13a347c/0x13a3518/0x13a0a58/0x13aa0d0/0x13a9f1c/0x13a9a9c/0x139e584）；反汇编为连接状态机：`ldr r1,[r4,#668]; cmp r1,#32; bcc` 与 `ldr r10,[r4,#604]`（slice-10 的 0x13aa228 同结构体字段）；votes online-nex:9 一致 |
| 0x8d0e4 | monster-em | worker | C | `bl 0xb4b10` 后 `movw r0,#0x733d`/`movw r1,#0x733c`（相邻 id 常量对）；callee 0xb50f0/0x97624/0xc46c8/0xc6e14/0xb4e58；votes monster-em:3 vs otomo-ot:3（1.0×，平票） |
| 0xb5d6c | monster-em | orchestrator | B | 拷贝 `[r0,#64]/[#68]/[#72]` → `[r0,#0]/[#4]/[#8]` 并清 `[r0,#12]`（变换/座标块复制），再 `movw r0,#0x733d`；callee 0xbf0d8/0x7e084/0x4971c/0x49f10/0x4ff9ac/0x5b80c（21 caller）；votes monster-em:8 vs otomo-ot:2（4×） |
| 0x288248 | monster-em | orchestrator | B | `mov r1,#16; bl 0x303474` 与 `mov r1,#6; bl 0x3034fc` 两次分配/取表，`str r6,[r11,r5,lsl #2]` 写数组、`mvn r2,#0` 作 -1；9 callee 全 0x277-0x307 簇（0x283570/0x287128/0x303474/0x3034fc/0x30765c/0x307698）；votes monster-em:9（唯一票源） |
| 0x498734 | quest | worker | C | `mov r1,#4; str r1,[r0,#4]` 设类型，`bl 0x7bb638` 分配后 `ldr r1,[pc]=0x10b8591; add r1,pc,r1; str r1,[r0,#0]`（装 pc 相对 vtable）+ `ldm/stm r0 {r1,r5}`；callee 0x7aa47c/0x13efda0/bl 0x7aedcc/0x49a3c8；votes quest:3 vs monster-em:2（1.5×） |
| 0x503298 | monster-em | worker | C | `sub r0,r0,#1; cmp r0,#1; bhi` 双值分派，命中后两次 `mov r0,r7; mov r1,#0; bl 0x505dc0`；唯一 callee 0x505dc0；votes monster-em:1（极弱） |
| 0x503854 | otomo-ot | worker | C | `str r6,[sp,#0]` 传栈参 + `ldr r0,[pc]` 单例后 `bl 0x152ef8`，再 `tst r7,#2; beq` 与 `ldr r0,[pc]=0x13354b4`、`mov r1,#54`；callee 0x3f8a20/0x1b794/0x1b08c；votes otomo-ot:2 vs quest:2（1.0×，平票，按 0x3f8a20 邻簇取 otomo-ot） |
| 0x56c168 | unknown | leaf | C | `callees=-`、`votes=[-]`；`ldr r3,[r0,#0]; mov r0,#255; cmps r2,r3; moveq r0,#255; strbeq r0,[r4,#136]` = 查表失败返回 255 哨兵的访问器，无子系统线索 |
| 0x5cfc08 | quest | worker | C | 向栈上参数数组依次写常量 `mov r2,#15`→`[sp,#64]`、`#16`→`[sp,#68]`、`#2`→`[sp,#4]`、`#3`→`[sp,#8]`、`#4`（连续枚举）；callee 0x7aa47c/0x13efd7c/0x545a04；votes quest:2 vs otomo-ot:1（弱） |
| 0x6b2770 | otomo-ot | orchestrator | B | `bl 0x56e528(r4,…)` 下发命令，`ldr r0,[r4,#80]; cmp r0,#1; bne` 分支后 `bl 0x56e528(r4,5,1)`、`mov r1,#3`；callee 全 0x56dxxx/0x56exxx（0x56e528/0x56e530/0x56e538/0x56e3b0/0x56e4d8/0x56da30）；votes otomo-ot:11（唯一票源）；字符串 `%3d%%` 为百分比格式，不指子系统 |
| 0x730cc0 | quest | orchestrator | B | `bl 0x7af3e4`（共用空桩）两次 + `str r0,[r4,#300]`/`str r0,[r4,#304]` 成对清成员（析构形态）；callee 0x1a5a04/0x1a594c/0x1a6340/0x1a7e5c（0x1axxxx）+0x5e48a8/0x7af3a0/自递归；votes quest:6 vs otomo-ot:3（2×） |
| 0x79d758 | quest | orchestrator | B | 析构循环：`bl 0x887660` 释放后 `str r0,[r4,#172]` 清零，再 `ldr r0,[r4,#176]` 判空重复（自递归 0x79d758）；callee 0x1955b8/0x25f6a4/0x25eaf0/0x152960/0x79da8c；votes quest:8（唯一票源） |
| 0x13bb538 | unknown | worker | C | 把 `[r8,#24]/[#32]/[#36]` 依次存入 `[sp,#24]/[#32]/[#36]` 并 `ee000a10`(vmov) 传参；唯一 callee 0x13bb9ac（相邻同族，同在 0x13bb 段、非 Pia 区间）；votes quest:1（极弱） |
| 0x29fb8c | monster-em | worker | C | 早退 `pop {r4,r5,r6,r7,r8,pc}` 后 `ldr r0,[pc]=0x15991b8` 单例 → `bl 0x1bb14` → `ldr r0,[r4,#0]; ldr r1,[r0,#376]` 虚表取函数；callee 0x27bcd0/0x27c7ec/0x283060/0x285e2c（0x27-0x28 角色簇 4/5）+0x1bb14；votes monster-em:2 vs otomo-ot:2（平票） |
| 0x3828e8 | monster-em | worker | C | `push {r4-r11,lr}` 大函数入口；callee 0x275a30（0x27 角色簇）、0x3a3874、0x354484、0x3f8344、0xe0da0；votes monster-em:2 vs quest:2 + item:1（平票） |

## 表（105-128）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x47b01c | monster-em | orchestrator | B | `bl 0x40b10` 后 `ldr r0,[r4,#0]; ldr r1,[r0,#304]; blx r1` 虚调用取 id，`movw r0,#0x1054`、`mvn r1,#0` 组参；14 callee 含 0x4a1b6c/0x4a1b50/0x4a1cd0/0x4a1d34/0x4a1e50/0x4a2f5c/0x4a2fe4（0x4axxxx 敌事件簇 7 个）；votes monster-em:13 vs render-gfx:1 |
| 0x5ba510 | otomo-ot | orchestrator | C | `add r1,pc,r1; ldr r1,[r1,r2,lsl #2]` + 尾跳 `b 0x56e1a8`（0x56exxx 命令簇转发），段内还有 `mov r0,#27; str r0,[r4,#40]` 初始化块；callee 0x56dc28/0x56e3b0/0x56e808/0x55bc4c 与 0x3f8634/0x3a8604/0x3b2918；votes quest:5 vs otomo-ot:5（1.0×，平票，按尾跳目标取 otomo-ot） |
| 0x66e3ac | quest | worker | B | `add r0,r4,#1584; bl 0x1c9a40` 构造子对象，`ldr r5,[r4,#1424]` 判空后 `ldr r0,[pc]=0x11ca758` → `bl 0x7aa47c` → `ldr r2,[r1,#52]; blx` 释放（析构惯用法）；callee 0x18c4f0/0x18af5c/0x18a404/0x186920 + 自递归；votes quest:7（唯一票源） |
| 0x7c54e4 | physics-math | worker | C | 整段为 VFP 矩阵运算：`edd50a0a`(vldr) 后 `ee366a42`/`ee344a41`/`ee333a40`/`ee301ac1`/`ee352a42`/`ee248a06`/`ee239a01`/`ee028a41`；callee 仅 0x13efddc 导入跳板 + bl 0x7aedcc；votes monster-em:1 vs quest:1（平票） |
| 0x7c9288 | unknown | worker | C | `ldr r0,[pc]=0x10716b4` 全局槽 + `ldm/stm r1 {r2,r3,r4,r5,r7,r12}` 整块拷贝 + `strd r8,[r0,#0]` 后 `pop {r4,r5,r7,r8,r9,pc}`；callee 仅导入跳板 0x13f01e4/0x13efd88；votes otomo-ot:1 vs online-nex:1（平票，70 caller 的薄转发件） |
| 0x7cf934 | physics-math | worker | C | VFP 比较链 `vldr`(`ed9f0ab8`) → `vcmp`(`eeb41ac0`) → `vmrs`(`eef1fa10`) → `bpl` 分支，随后从 `0x106984c` 常量区 `edd73a05`/`ed974a01`/`ed960a01` 连续装载；callee 0x80a960/0x13efddc；votes online-nex:1 vs monster-em:1（平票） |
| 0x7eb240 | physics-math | worker | C | 与 0x7c54e4 逐指令同模板的 VFP 矩阵段（`edd40a0a`/`ee366a42`/`ee344a41`/`ee301ac1`/`ee24aa06`/`ee238a01`/`ee02aa41`）；唯一 callee 0x13efddc；votes monster-em:1（极弱） |
| 0xbb9f98 | quest | worker | B | `ldr r0,[pc]=0xc7eb80` 全局槽 + `bl 0x7cb088` 建对象后 `ldr r0,[r6,#0]; ldr r1,[r0,#20]` 取虚表项；callee 0x7aa47c/0x7cb0d8/0x7bb638/0x13efd7c；votes quest:5（唯一票源） |
| 0x134fd78 | online-nex | orchestrator | A | 3 个 callee 落 Pia 区间（0x1311000..0x13AB000）：0x1354cb4/0x1354cd0/0x13591bc；反汇编 `add r0,r4,#8; bl 0x13ef684` 后 `pop {r4,lr}` + 尾跳 `b 0x1354cd0`（构造转发）；votes online-nex:10 vs monster-em:1 一致 |
| 0x542f7c | quest | worker | C | `bl 0x886ca8` 后 `cmp r0,#0; bne` 早退，`ldr r0,[r4,#8]` + `ldrb r1,[pc,pc,lsl r6]` 查表 + `ldr r10,[r0,r1,lsl #2]` 取元素；callee 0x86a438/0x882674/0x886ca8（0x88xxxx）+0xba0034+bl 0x7aedcc；votes quest:4 vs render-gfx:3（1.33×，分票，31 caller） |
| 0x6bd0fc | otomo-ot | orchestrator | B | `ldrb r1,[r0,#76]`（单例字段）+ `ldrb r0,[r4,#200]; cmps r0,r1; bne` 与 `ldrb r2,[r4,#201]` 双字节状态比对；16 callee 含 0x5088e0/0x5078e4/0x506328/0x507b68/0x50cb48/0x50adfc/0x50addc（0x50xxxx 簇）；votes otomo-ot:12 vs quest:2/monster-em:2 |
| 0x6c7740 | render-gfx | worker | C | `mov r1,r1,lsl #2; add r2,pc,#4; ldr r1,[r1,r2]; add pc,r1,r2` = PC 跳转表（表项 0x10/0xd4/0x1d4/0x2a0 = 4 路）；callee 0x53a058/0x53a164/0x3f8344/0x950bcc；votes render-gfx:2 vs otomo-ot:1/monster-em:1（2× 但 top=2） |
| 0x7074d4 | quest | orchestrator | B | `mov r1,#6; bl 0x65cb3c` 取记录后 `cmp r0,#0; beq`，命中再 `mov r1,#2; bl 0x57e65c`；callee 0x65cba0/0x65cb3c（0x65cxxxx 表访问）+0x6ffb6c/0x70a230/0x70a30c/0x70a480/0x5853d8；votes quest:9 vs otomo-ot:1（9×） |
| 0x73e7fc | quest | worker | B | 连续取 4 个全局槽（0x10fa390/0x10fa388/0x10fa380/0x10fa52c）作调用参数；callee 0x4c59e8/0x524b04/0x740448/0x194228；votes quest:4（唯一票源） |
| 0x75bf8c | quest | orchestrator | B | `ldrb r2,[r0,r2]` + `strb r2,[r6,#3040]`（跨结构拷贝单字节），再 `movw r2,#0xbf4; add r8,r6,r2` 定位成员；callee 0x260440/0x25d4d4/0x25d6bc/0x25f8e4（0x25-0x26）+0xe82e0/0xe100c/0x552d50/0x26f194；votes quest:7 vs otomo-ot:1（7×） |
| 0x9ea900 | online-nex | worker | B | 栈上记录初始化：`movw r0,#0xffff`+`movt r0,#0x7f7f`(=0x7f7fffff，float 上限) 写 `[sp,#112]`，`strb r1,[sp,#120]`，`ldm/stm r2 {r0,r1,r2}` + `ee280a00`(vmov)；callee 0x7cf610/0x7d1238/0x9ea524；votes online-nex:3（唯一票源） |
| 0xb38f50 | quest | worker | B | `movw r0,#0x2c`/`#0x30` + `movt r0,#0x10` + `str r1,[r4,r0]`（在 +0x1002c/+0x10030 两处清大偏移成员），再 `ldr r1,[pc]=0xa4078c`；callee 0x121b7d0/0x121bd7c/0x121bb58（0x121xxxx 三连）+0x7aa47c；votes quest:4（唯一票源） |
| 0xc11130 | render-gfx | worker | C | `bl 0xc17f88` → `add r8,r0,#16`、`strd r10,[r0,#0]`，再 `add r0,r11,r11,lsl #2; mov r4,r0,lsl #4; sub r4,r4,#80`（元素步长 80 = 5×16）；callee 0xc17f88/0xc17fc4/0xc17ff0/0xc18008/0xc180e8/0xc178c0 全 0xc17xxxx（slice-02 记录的渲染核心簇）——votes quest:6 与簇相反，无指令可裁，降 C 并取簇 |
| 0x108e6c8 | quest | orchestrator | B | 析构循环：`movw r0,#0xce1c` + `ldr r0,[r5,r0]` 判空 → `bl 0x887660` 释放 → `str r0,[r5,#0]` 清零 → `movw r0,#0xce18` 下一成员；callee 0x9ecc24/0x9ee85c/0x9eebe0/0xc9f38/0xc748d4/0xc9eb4 + 自递归；votes quest:7 vs monster-em:2 |
| 0x1c4c84 | quest | worker | B | 段首尾跳 `b 0x2b908`（基类析构），另一入口 `bl 0x2b908` 后 `mov r8,#0` 与 `str r8,[sp,#12..28]` 连清栈槽；callee 0x7aa47c/0x7bb638；votes quest:3（唯一票源） |
| 0x2f0670 | monster-em | orchestrator | B | switch 跳表：`mov r0,r0,lsl #2; add r1,pc,#4; ldr r0,[r0,r1]; add pc,r0,r1`，表项 5 个 0xb8 + 1 个 0xc0（6 路，5 路同体）；callee 0x27bcd0/0x2864c4/0x2864e0/0x2ad288/0x2edd2c/0x2f2ba0/0x2f2edc/0x2f2fa0；votes monster-em:6 vs quest:2（3×） |
| 0x5365a8 | quest | worker | B | 与 0x1c4c84 同模板：`b 0x2b908` + `bl 0x2b908` + `str r8,[sp,#12..28]` 清零（析构）；callee 0x7aa47c/0x7bb638；votes quest:3（唯一票源） |
| 0x53b7e0 | monster-em | worker | B | `add r0,r4,#16; bl 0x31c1a0`，`movw r0,#0x1054` + `ldrb r0,[r7,r0]` + `strb r0,[sp,#28]`（字节传参），`ldr r0,[r7,#0]; ldr r5,[r0,#300]` 虚表项；callee 0x40b10/0x40b50/0x31c1a0/0x94d770/bl 0x7aedcc；votes monster-em:5 vs quest:2（2.5×） |
| 0x784b6c | quest | worker | B | `push {r4-r11,lr}` 入口；callee 0x13efd7c（memset）、0x54af8c、0x523da4、0x784964（同族）、0x3ba50c；votes quest:5（唯一票源） |

## 表（129-151）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xb33254 | quest | worker | C | 指针修正表：`add r2,r1,#24; str r2,[r0,#60]`、`add r2,r1,#80; str r2,[r0,#68]`、`+88`→`[r0,#76]`、`+96`→`[r0,#84]`、`+104`→`[r0,#92]`、`+112`…（把基址加固定偏移写进成员指针）；唯一 callee 0x7bb638；votes quest:1（极弱） |
| 0xbf5004 | quest | worker | B | 构造 16 位 id 数组：`mvn r0,#1; add r0,r0,#1`(=0) → `strh r0,[sp,#64]`，`movw r0,#0xfffe` → `strh [sp,#66]/[sp,#68]`，`movw r0,#0xffff` → `strh [sp,#72]`（0/-1/0xFFFE 哨兵）；callee 0xbf532c/0xbf55a8/0xbf6364/0xbf65cc/0xbf6870/0xbf3f18/0xb6d72c；votes quest:6 vs otomo-ot:1（6×） |
| 0x11b0544 | monster-em | worker | C | `mov r1,#27; ldr r2,[r0,#348]; blx r2` 取数据后 `movw r1,#0x5556; movt r1,#0x5555`(=0x55555556 除 3 魔数) + `sub r1,r0,r1`；callee 0x282850/0x2ad288/0x11aa480；votes monster-em:2 vs otomo-ot:1（弱，17 caller） |
| 0x6b0d8 | otomo-ot | worker | B | 全局 0x17cda90 单例；`add r10,r4,r11` 后 `ldrb r0,[r10,#90]; cmp r0,#0; beq`，命中即 `strb r7,[r10,#90]` 清标志（按槽位遍历）；callee 0x3f8a40/0x5e438/0x5fa14/0x68984/bl 0x7aedcc；votes otomo-ot:4 vs monster-em:1/quest:1（4×） |
| 0x221638 | quest | orchestrator | B | `ldrh r0,[r1,#176]; and r0,r0,#8; bne` 位门控 + `add r0,r8,#176; bl 0xe7b74`；callee 0xe7b74/0x2613c0/0x2613f4/0x25e378/0x2595e4/0x26e43c/0x26e600/0x26f3fc/0x3f8d34/0x3d8a4c/0x55bc4c；votes quest:8 vs monster-em:2/otomo-ot:2（4×） |
| 0x3b3444 | otomo-ot | orchestrator | B | 全局 0x148572c → `bl 0x3f8398`；全局 0x148588c → `ldr r1,[r0,#236]; and r2,r1,#98` 取状态位；callee 0x3af160/0x3afb00/0x3b3db0/0x3b40a4/0x3a400c/0x216474/0x227b3c/0x19b7fc/0x65de34；votes otomo-ot:7 vs quest:3（2.3×） |
| 0x4bba04 | quest | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cTradeDeliveryList`（交易/纳品清单，任务数据类）；反汇编为序列化：`ldr r0,[r4,#0]; ldr r1,[r5,#8]; ldr r2,[r0,#12]; blx r2` 写 32 位字段，再 `ldrh r1,[r5,#12]` 走 `[vtable+8]` 写 16 位；votes quest:5 一致 |
| 0x517218 | quest | orchestrator | B | `ldr r0,[r0,#0]; ldrh r7,[r0,#183]; tst r7,#1` 位测试后 `movw r7,#0x13e`、`mov r1,#316`、`strh r6,[r4,#177]`、`orr r1,r6,#1; strh r1,[r4,#183]` 重组状态字，再 `bl 0x501f68`；callee 0x501f24/0x501f68/0x51753c/0x5176ec/0x887660/0x8879ac/0x2772c4/0x3268d8；votes quest:8 vs monster-em:2（4×） |
| 0x5627f8 | quest | worker | B | `bl 0x8702e8` 后全局 0x12dc9a8 → `bl 0x7aa47c` → `ldr r1,[r0,#0]; ldr r2,[r1,#52]` + `pop {r4,lr}; bx r2`（虚析构尾调），段尾 `b 0x87031c`；callee 0x870204/0x8702e8/0x86f97c/bl 0x7aedcc；votes quest:5 vs monster-em:1（5×） |
| 0x5c4cb4 | quest | worker | B | 初始化：`str r0,[r4,#0]`，清 `[r4,#116]/[r4,#120]/[r4,#132]/[r4,#136]`，`ldm/stm r1 {r0,r5,r7}` 整块拷贝，`mvn r7,#0`(-1)，`str r6,[r4,#112]`；callee 0x570688/0x7aa47c/0x13efd7c/0x56d97c；votes quest:3 vs otomo-ot:1（3×，20 caller） |
| 0x74489c | quest | worker | B | `ldr r0,[pc]=0x10fc390; add r0,r0,#8; str r0,[sp,#44]`（vtable+8）+ `ldr r0,[pc]=0x10f4270`，`add r1,r8,r0,lsl #2` 与 `ldr r0,[r1,#3556]` 二维索引；callee 0x5249f4/0x4c0090/0xe51c/0x7aa47c/0x13efd7c/0x13efdd0；votes quest:6（唯一票源） |
| 0x7e8504 | physics-math | worker | C | 纯 VFP：`ee386a08`/`ee20da06`/`ee21fa06`/`ee22ea06`（vmov 取分量）+ `ee333a4d`/`ee344a4f`（vdiv/vmul）+ `ed8d3a08`/`ee353a4e`（vstr）；callee 0x808f88（0x808-0x809 数学簇）+0x13efddc；votes quest:1 vs monster-em:1（平票） |
| 0x86f158 | render-gfx | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `ptex`（纹理资源扩展名，与 slice-10 的 `rtex`/`stex` 同判 render-gfx）；反汇编装 vtable `ldr r0,[pc]=0xfd2880; add r0,r0,#8; str r0,[r4,#0]` 后 `bl 0xb51bfc`、`bl 0xb513b4`，再取 `0xfd285c`；callee 0xb0804c/0xb09098/0xb51b00/0xb513b4/0xb51bfc/0x7aa47c/bl 0x7aedcc/0x887810；votes quest:5 与字符串冲突，按 §8 取 render-gfx |
| 0xae4a84 | render-gfx | worker | B | `bl 0xa6a004` 后 `cmp r1,#1; bne`，`ldrb r0,[r7,#7]; and r0,r0,#1; add r0,r4,r0,lsl #2; str r1,[r0,#144]`（双槽粒子参数写入）；callee 0xa6a004/0xa6a2cc/0xa6a434/0xaed74c/0xaf938c/0xa71a18；votes render-gfx:6（唯一票源） |
| 0xb3d39c | quest | worker | B | `cmp r0,#2` 分支 + `ldreq r0,[r4,#100]` 与 `movweq r1,#0x5548; movteq r1,#0x4c`(=0x4C5548) 比对，命中后 `bl 0x8263f8` 并 `str r0,[r4,#108]`；callee 0x8260d4/0x8263f8/0x8269f4/0x826130/0x7aa47c；votes quest:5（唯一票源，0 caller） |
| 0x1645e0 | otomo-ot | orchestrator | B | `bl 0x13efe30` 后按字节拼 id：`ldrb r1,[r0,#2224]`、`[r0,#4]`、`[r0,#3]`、`[r0,#2]`、`[r0,#-2]`、`[r0,#-1]`，`orr r3,r7,r3,lsl #8` 逐级左移拼接；callee 0x3cf5d0/0x3cfcdc/0x164c68/0x1651c8/0x165484/0x7c9198/0x7c9288/0x3d8a4c；votes otomo-ot:6 vs monster-em:2（3×） |
| 0x49b580 | quest | worker | C | 全局 0x13a23f0 → `bl 0x7aa47c` → `ldr r3,[r4,#28]`、`ldr r4,[r1,#32]`，`mov r2,#16`、`mov r1,#5760`(0x1680) 后 `blx r4`，尾跳 `b 0xd55b1c`；唯一 callee 0x7aa47c；votes quest:1（极弱） |
| 0x52e63c | weapon-wp | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cTrialHeavyBowgunData`（试射重弩数据类，武器数据）；反汇编为字节流写出器：`strb r6,[r1,r0]` + `ldr r0,[r4,#12]; add r0,r0,#1; str r0,[r4,#12]` + `cmps r0,r1([r4,#16]); bcc` 缓冲满则 `blx [vtable+56]` 扩容；votes quest:5 为通用簇票，按类名取 weapon-wp |
| 0x62a7dc | quest | worker | B | `add r11,r4,#96; mov r1,#72; bl 0x13efdac`（memset 72 字节），`strb r7,[r4,#212]` 清标志，再 `add r0,r6,#4; bl 0xdf814` 两次（0xdfxxxx 数据簇）；callee 0x13efdac/0xdf814/0xdadf0/0xde150；votes quest:3 vs monster-em:1（3×） |
| 0x6d67ec | render-gfx | orchestrator | B | 段首 `b 0x6c0d7c` 桩后 `bl 0x6d6b0c`，`movw r1,#0x1a9c; ldr r1,[r5,r1]` 判空，`cmp r0,#1; bne` 分支；callee 0x6c07b8/0x6d6b0c/0x6cc414/0x6cc720/0x6c70c8/0x6c71e4/0x6cca14/0x6d021c/0x6d6f14/0x53a058/0x53a164/0x950bcc；votes render-gfx:9 vs otomo-ot:2（4.5×） |
| 0x7d5d24 | render-gfx | worker | B | VFP 变换：`vldr`(`ed960a10`/`ed961a11`/`ed962a12`) 取三元组后 `eeb13a40`/`eeb14a41` 运算并 `vstr`(`ed8d3a18`/`ed8d4a19`/`ed8d3a1a`) 写回连续槽，`str r5,[sp,#108]`；callee 0x2332ac/0x80aa10/0x7cf934/0x13efddc；votes render-gfx:3 vs monster-em:1（3×） |
| 0xa945ec | render-gfx | orchestrator | B | `cmp r0,#1; bne` 早退后 `ldrb r0,[r6,#7]; and r0,r0,#1; add r0,r5,r0,lsl #2; str r1,[r0,#112]` 双槽写入、`bl 0xa6a2cc`，再 `ldrb r0,[r5,#18]; tst r0,#2`；callee 0xa6a004/0xa6a2cc/0xa6a434/0xaed74c/0xaf938c/0xa58d7c/bl 0x7aedcc/0x7aa47c；votes render-gfx:5 vs quest:3（1.67×） |
| 0xb44d90 | quest | orchestrator | B | `mov r2,#524288`(0x80000) + `bl 0x8260d4`、`bl 0x826780`（0x826x 反射/序列化簇）；callee ≥22（列表截断）含 0x8260d4/0x826130/0x8263f8/0x826780/0x8269f4/0x82710c/0x82772c/0x8277c4/0x827998/0x827ad4/0x827cd0 与 0xccc73c/0xccc7cc/0xccc9c8/0xccedf4/0xcd0cd0/0xcd0e84/0xcd0fe4/0xcd1144；votes quest:19 vs audio:4（4.75×） |

## 表（152-200）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xc3ee74 | render-gfx | worker | B | `movw r0,#0x3204` + `add r7,r8,r0`（大对象成员基址）、`mvn r12,#0` 作 -1 初值；4 callee 全 0xc7xxxx/0xca0xxx（0xc71ba0/0xc71ba8/0xc71c5c/0xca0da0）；votes render-gfx:4（唯一票源） |
| 0x18600 | otomo-ot | orchestrator | B | `cmp r1,#1; beq` / `cmp r1,#0; bne` 双路分派，命中 `mov r0,#2816`(0xB00) + `mov r1,#16` + `bl 0x1f9c4`（按 0xB00 大小分配）；callee 0x1f9c4/0x1fa00/0x2abb0/0x2abec/0x8f40a4/0x8f40e4/0x3ea218；votes otomo-ot:6 vs quest:3（2×） |
| 0x28dc90 | otomo-ot | orchestrator | B | 全局 0x15ab318 → `ldr r5,[r0,#480]` 取计数，全局 0x15aaf20 → `bl 0x55efe8`；callee 0x55efe8/0x5584a0/0x55d2b4/0x50f158/0x50d954/0x50d974/0x79867c/0x27e608/0x27f678/0x297f24；votes otomo-ot:8 vs quest:3（2.7×） |
| 0x38b4ec | monster-em | orchestrator | B | 全局 0x14ad820 → `bl 0x3a9f54` 后 `cmp r0,#0; bgt` 早退，再取全局 0x14ad8c0；14 callee 含 0x3ae21c/0x3a8c3c/0x3a2900/0x3ae378/0x3abb3c/0x3a9f54（0x3axxxx 簇 6 个）+0x275a30/0x26fe10；votes monster-em:11 vs quest:3（3.7×） |
| 0x39d8d8 | quest | orchestrator | C | `ldr r3,[r2,#100]; cmps r3,r1; bxls lr` 边界检查 + `ldr r0,[r2,#108]; mov r2,#164; mla r0,r1,r2,r0`（164 字节步长的数组取项）；callee 0x7aedcc/0x7aa47c/0x887810/0x54ed74/0x5e4870/0x553030；votes quest:4 vs otomo-ot:3（1.33×，分票） |
| 0x4be4c4 | save-io | worker | C | 流读取模板：`ldr r0,[r5,#0]; ldr r1,[r0,#8]; blx r1; strh r0,[r4,#4]`（经虚表 +8 读 16 位存 [r4,#4]），与 slice-02 的 0x395850 同模板；唯一 callee 0x8261fc（反射/序列化访问器）；votes otomo-ot:1（弱，按结构取 save-io） |
| 0x4dd648 | quest | orchestrator | C | `bl 0x4e9578` 后 `bl 0x4e116c(r4,0)`/`(r4,1)`/`(r4,2)` 连续按 id 初始化；17 callee 分三簇（0x4d-0x4e 七个、0xbf0xxx 五个、0x3f8a40/0x887660）；votes quest:6 vs monster-em:6（1.0×，平票按首列取 quest） |
| 0x7a0858 | quest | orchestrator | C | `ldr r0,[r4,#4]`、`cmp r1,#1; beq` / `cmp r1,#0; bne` 三路分派，命中后 `ldr r1,[r4,#128]`；callee 0x54ee98/0x54fd94/0x54f260/0x54ecc0/0x65cb3c/0x65e794/0x65e938/0x65e67c/0x65e5bc/0x640e84；votes quest:7 vs otomo-ot:5（1.4×，分票） |
| 0xa26bd8 | quest | worker | C | `vpush`(`ed2d8b10`) + `sub sp,#96`，`ldr r0,[pc]=0xe11f4c` 全局槽 + `vldr`(`ed9f0ab4`/`ed9f5ab4`) 常量装载；callee 0x13bb330 + 0x7aa47c；votes quest:2（弱） |
| 0xbb9348 | online-nex | worker | A | 字符串 `MT_NET_SHARED_MEMRY`（MT Framework 网络共享内存）；反汇编 `bl 0x887810` 分配后 `ldr r0,[pc]=0xc8b894; add r0,r0,#8; str r0,[r9,#0]` 装 vtable、`movw r1,#0x4409`；callee 0xbb9664/0xba87c0/0x13efd7c/0x13efe30；votes quest:4 otomo-ot:2 与字符串冲突，按 §8 取字符串 |
| 0xbf7a44 | quest | worker | B | `ldr r0,[r4,#8]; str r1,[r4,#8]` 取出并清零句柄，`sub r0,r0,#1; cmp r0,#4; bhi` + `mov r0,r0,lsl #2` 跳转表（5 路）；callee 0x83edf0/0xbe81f8 + 两个导入跳板；votes quest:3 vs online-nex:1（3×） |
| 0xcdc7bc | physics-math | leaf | C | `callees=-`、`votes=[-]`；`movw r12,#0xd70a`+`movt r12,#0x3da3`(0x3da3d70a≈0.08f)、`movw lr,#0x3333`+`movt lr,#0x3f73`(0x3f733333≈0.95f)、`movt r4,#0x41c0`(24.0f) = 纯浮点常量表，无子系统线索 |
| 0xce5974 | quest | orchestrator | B | VFP 比较链 `eeb7ba00`(vmov) → `eeb40acb`(vcmp) → `eef1fa10`(vmrs) → `bge`/`blt` 双分支，再 `eebf1a00`/`eeb40ac1`（第二组比较）；callee 0x13efe24/0x13f00d0（软浮点）/bl 0x7aedcc/0x7aa47c/0x8870b8；字符串 `sssr.xml`（XML 配置名，子系统不明，不升 A）；votes quest:4 vs render-gfx:1（4×） |
| 0x139dce4 | online-nex | worker | A | 2 个 callee 落 Pia 区间（0x139edec/0x13a0718），另 0x13b1bfc 与导入跳板 0x13edb00/0x13edd58；反汇编 `ldr r0,[r10,#8]; bl 0x139edec`、`ldr r0,[r10,#648]; cmp r0,#1` 连接状态判定；votes online-nex:5 一致 |
| 0x13c8104 | online-nex | orchestrator | C | `mvn r0,#0` 后把 -1 连写 `[sp,#32]/[#28]/[#24]/[#20]`（句柄表初始化为无效），callee 全 0x13cxxxx/0x13dxxxx（0x13c8448/0x13dd404/0x13d74c0/0x13dd244/0x13dd364/0x13d7484 = NEX 库）；votes kernel-os:3 vs online-nex:3（1.0×，平票；按簇取 online-nex，conf 仍 C） |
| 0x18ecb0 | quest | worker | A | 字符串 `cOtodokeConditionList`（"otodoke"=纳品/配送条件表，任务数据类）；反汇编为序列化写出：`ldr r0,[r4,#0]; ldr r1,[r5,#8]; ldr r2,[r0,#12]; blx r2` 再 `ldrh r1,[r5,#4]` 走 `[vtable+8]`；votes quest:5 一致 |
| 0x1a49ec | quest | worker | B | `bl 0x887810` 分配后全局 0x16947b8 → `str r4,[r0,#0]` 登记单例，`mov r1,#207`(0xCF) 作容量，全局 0x1696368 → `add r0,r0,#8` 装 vtable；callee 0x13efd7c/0x13efdac/0x1a4d04；votes quest:3 vs otomo-ot:1（3×） |
| 0x4f53d8 | quest | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cKowareObjData`（壊れオブジェクト＝可破坏物件数据类）；反汇编 `ldr r0,[r4,#12]; ldr r1,[r4,#16]; cmps r0,r1; bcc` 位置/上限判定 + `ldrb r6,[r5,#4]` 逐字节写；votes quest:5 一致 |
| 0x5da1b4 | quest | orchestrator | C | `ldm/stm r1 {r2,r3,r4,r5,r6}` 整块拷贝到 `add r0,r7,#168`，`movw r0,#0xffff` 后 `strh r0,[r7,#188]`/`[r7,#190]`（无效句柄）+ `strb r5,[r7,#164]`；16 callee 含 0x553a38/0x553a74/0x56dc28/0x56e3b0/0x56e61c/0x56dfac/0x570710；votes quest:8 vs otomo-ot:8（平票按首列取 quest） |
| 0x709d54 | quest | orchestrator | B | `movw r0,#0x1f60` + `ldr r0,[r6,r0]` 取容器指针判空，`cmp r0,#0; beq`；callee 0x12c01c/0xdcc3c/0xdcbbc/0xdcc58/0xdd31c/0xdd3fc/0x145d24/0x70a06c（0xdc-0xdd 数据簇）；votes quest:8（唯一票源） |
| 0x78e868 | quest | worker | B | 全局 0x10aa508 → `bl 0x523178` 取值，`movw r6,#0x967f`+`movt r6,#0x98`(=0x98967f) 后 `sub r9,r6,r0` 求余量；callee 0x523178/0x5231bc/0x19aa88/0x1990dc/0x19aab0/0x19aac4/0x40110；votes quest:7（唯一票源） |
| 0x7c809c | physics-math | worker | C | `vpush`(`ed2d8b10`) + `sub sp,#80` 后连续 `vldr`(`ed959a01`/`ed950a05`/`ed95ba00`/`ed951a04`) 取向量分量；callee 0x13efddc + 0x808fe8（0x808-0x809 数学簇）；votes monster-em:1 vs quest:1（平票） |
| 0x803494 | physics-math | worker | C | 纯 VFP：`vldr`(`ed942a01`/`ed944a05`/`ed940a00`/`ed943a04`/`ed941a02`/`ed945a06`) 连续装载后 `ee344a42`/`ee333a40` 运算；6 callee 全 0x808-0x809 数学簇（0x8098b4/0x808f88/0x8099e4/0x8090f8/0x809434/0x809bc0）；votes quest:4 与簇相反，无指令可裁 → C 取簇 |
| 0x80e5e8 | otomo-ot | orchestrator | B | 段内为多条 vtable 安装桩：`ldr r1,[pc]=0x103295c; add r2,r1,#8; add r1,r1,#68; str r2,[r0,#0]; ldm/stm r0 {r1,r3}; bx lr`；callee 0x8110e0/0x81541c/0x80ca9c/0x81d4a4/0x8133e8（0x80-0x81 簇）+4 个导入跳板；votes otomo-ot:8 vs quest:3（2.7×） |
| 0x824060 | quest | worker | B | `mov r0,#160` + `mov r1,#16` + `bl 0x820e84`（按 160 字节/16 对齐分配）→ `bl 0x820eec` 初始化；callee 0x820e84/0x820eec + 3 个导入跳板；votes quest:5（唯一票源，23 caller） |
| 0xb792c8 | quest | orchestrator | B | `ldr r0,[r8,#112]; beq` 判空 → `ldr r1,[r0,#-12]` + `sub r5,r0,#16`（缓冲区前置引用计数头，释放惯用法）；callee 0xa30bac/0xa30ba0/0xb79e60/0x82772c/0x827cd0/0x8277c4（0x827x 反射簇）/0x7af3e4/0x7af3a0；votes quest:7 vs audio:1（7×） |
| 0xbf17e0 | quest | worker | B | 栈参 `str r1,[sp,#16]` + 全局 0xc47a54 → `ldrb r1,[r1,#0]`，`ldrb r0,[r10,#24]`、`ldr r4,[sp,#56]` 组参；callee 0xb6d72c + 3 个导入跳板；votes quest:3 vs otomo-ot:1（3×） |
| 0x13508ac | online-nex | orchestrator | A | 6 个 callee 落 Pia 区间（0x1365518/0x135a9d4/0x135c4ec/0x1365600/0x135c5f0/0x135c524）；反汇编取全局 0x4f0740 → 判空 → `bl 0x13ae894` 后 `cmp r0,#0`；votes online-nex:13 vs quest:1 一致 |
| 0xe5c0c | quest | worker | C | `vpush`(`ed2d8b08`) 后 `bl 0xe0b54(r4,1)`（0xe0xxxx 低层工具）、`mov r1,#14`，再 `ee088a10`(vmov) 转浮点；callee 0x285bb0；votes quest:2（弱） |
| 0x259894 | otomo-ot | orchestrator | B | 全局 0x15df4c8 → `bl 0x274ce4` 取对象；13 callee 含 0x274ce4/0x26fe44/0x268cd4/0x268d10/0x265184/0x2651c0/0x27acd8/0x26fd90/0x259ba8/0x259ca4（0x25-0x27 簇）；votes otomo-ot:9 vs monster-em:3（3×） |
| 0x283da0 | quest | worker | C | `bl 0x28857c` 后 `mov r5,#4992`(0x1380) + `ldr r1,[r0,r5]; cmp r1,#204; popeq` 命中即返回，否则 `mov r0,#2`/`mov r1,#4` 继续；唯一 callee 0x28857c；votes quest:1（极弱） |
| 0x2a3fdc | monster-em | worker | C | `bl 0x27bcd0; cmp r0,#1; popne` 早退，`ldr r0,[r4,#0]; ldr r2,[r0,#528]; blx r2` 虚调用；唯一 callee 0x27bcd0；votes monster-em:1（极弱，14 caller） |
| 0x2e778c | monster-em | orchestrator | C | `mov r2,#256; mov r3,#0; bl 0x282f58` 后 `cmp r0,#1; bne`，再取全局 0x1554db8 的 `vldr`；12 callee 全 0x27-0x2a 角色簇（0x282f58/0x2a5ce4/0x27bcd0/0x27e608/0x285e2c/0x27f678/0x28015c/0x2831e0/0x2864c4/0x2a5cbc/0x2a25a8）；votes monster-em:4 vs render-gfx:3（1.33×，分票）；字符串 `nt[8]` 为片段，不足以定向 |
| 0x413008 | monster-em | orchestrator | B | 段首尾跳 `b 0x43b488`（基类），另一入口 `bl 0x43b488` → 全局 0x1429f30 → `bl 0x7aa47c` → `ldr r2,[r1,#52]` 虚析构尾调；callee 0x4a1b6c/0x4a1c78/0x4a2744/0xc1708/0x41331c；votes monster-em:9 vs quest:1（9×） |
| 0x537398 | quest | worker | B | `ldr r3,[r2,#100]; cmps r3,r1; bxls lr`（计数上限）+ `ldr r0,[r2,#108]; add r0,r0,r1,lsl #2`（4 字节步长取项）= 容器访问器；callee bl 0x7aedcc/0x7aa47c/0x887810/0x13efd7c；字符串 `tuto`（教学/引导数据，4 字符片段，不单独定 A）；votes quest:3 vs otomo-ot:1（3×） |
| 0x7e6ecc | online-nex | worker | C | `b 0x7e6ed0` 形参跳板后 `vpush`(`ed2d8b02`) + `sub sp,#208`，`movw r1,#0xffff` 作无效值；callee 0x7f0ab4（0x7fxxxx）/0x7d1238/0x13efddc；votes online-nex:2 vs monster-em:1（弱，按首列取 online-nex） |
| 0x7e71e0 | online-nex | worker | C | 与 0x7e6ecc 同模板（`b 0x7e71e4` + `vpush` + `sub sp,#208` + `movw r1,#0xffff`）；callee 0x7f36ec/0x7d1238/0x13efddc；votes online-nex:2 vs monster-em:1（弱） |
| 0x7e9b80 | physics-math | worker | C | `vpush`(`ed2d8b0a`) 后 `mov r4,r1; mov r5,r3; mov r6,r2` 与连续 `vldr`(`ed940a01`/`ed943a05`/`ed941a02`/`ed944a06`/`ed942a00`) 纯向量运算；唯一 callee 0x13efddc；votes monster-em:1（极弱） |
| 0xa541d8 | render-gfx | worker | C | `ldr r6,[r4,#36]; cmp r6,#0; beq` 判空 + `ldrb r8,[r4,#32]` 取标志，全局 0xde4ca8；callee 0xb35c00/0xba1e50（0xba 渲染簇）；votes render-gfx:2（弱） |
| 0xb2b180 | quest | orchestrator | B | `ldr r0,[r4,#232]; cmp r0,#0; beq` → 非零即 `pop` 返回；再 `ldr r2,[r4,#96]; cmp r2,#0; bne` 与全局 0xd0e214；callee 0xba7d50/0xba7db4/0xba7f1c/0xba80bc/0x842e28/0x842e9c/0x873e9c/0xb22ac8/0xb2dc54；votes quest:11 vs otomo-ot:1/online-nex:1 |
| 0xc74228 | render-gfx | worker | B | `ldr r7,[r10,#12]; ldr r0,[r10,#20]` 双指针，`cmp r7,#0; beq`；`ldr r1,[r0,#-4]; sub r5,r0,#8`（引用计数头）→ 释放路径；callee 0x8879b4/0x887958（分配/基类）、0x9f4e20（资源类基构造）、0x7aa47c；votes render-gfx:3 vs quest:1（3×） |
| 0x11353c0 | otomo-ot | worker | C | `movw r0,#0x3328` + `ldr r0,[r7,r0]` + `ldrb r1,[r0,#1]`（子对象状态字节），`eeb08a40`(vmov) 传浮点；callee 0x115d4ac/0x113a318/0x1159ef0/0x1159da4（0x113-0x115 同族）；votes otomo-ot:2 vs quest:1/render-gfx:1（弱） |
| 0x9549c | otomo-ot | worker | C | `movw r0,#0x1406` + `ldrb r0,[r4,r0]; tst r0,#8` 与 `movw r0,#0xba44; ldr r0,[r4,r0]; tst r0,#32` 双位门控，`movw r1,#0xba4e`；callee 0x817a4/0x3cc6ec；votes otomo-ot:2（弱） |
| 0x18b850 | quest | orchestrator | B | `movw r2,#0xffff; cmps r1,r2; beq` 无效值早退，`ldr r2,[r0,#0]; ldr r2,[r2,#24]; blx r2` 虚调用后 `ldrh r1,[r0,#2]`；8 callee 含 0x194228/0x19b7a8/0x1938bc/0x19cbb4/0x19c58c/0x19b7fc（0x19xxxx 任务簇）；votes quest:8（唯一票源） |
| 0x21b4ac | monster-em | worker | B | `cmp r2,#0; blt` 早退，全局 0x161d8cc → `ldrb r1,[r5,#8]` → `bl 0x48cba4` 查表；callee 0x48cba4/0x48d210/0x9fba6c/0x9fc3d8；votes monster-em:3 vs otomo-ot:1（3×） |
| 0x527f28 | quest | worker | B | 先 `str r0,[r4,#0]`/`[r4,#4]` 清零，再 `ldr r2,[r1,#4]; beq` 与 `ldr r5,[r1,#0]` 双判空后遍历；callee 0x7aa47c/0x13efdac/0x13eff38/0x13efda0/bl 0x7aedcc/0x2b8f0；votes quest:4 vs online-nex:1/monster-em:1（4×） |
| 0x663034 | quest | orchestrator | B | `mov r1,#460`(0x1CC)、`mov r9,#52`(0x34) 两个步长常量，`movw r0,#0xffff` + `str r0,[r4,#136]` 置无效句柄；17 callee 含 0x65cb3c/0x65cba0/0x65e794/0x65e994/0x65ea14/0x662eb0/0x663960/0x6649c0/0x6645cc；votes quest:12 vs otomo-ot:5（2.4×） |
| 0xaa6628 | render-gfx | orchestrator | C | `bl 0xcad764; cmp r0,#1; bne` 早退后 `ldr r6,[r4,#76]` 返回，另一路 `ldrb r0,[r5,#407]`；callee 0xcad764/0xb925b0/0xc6d0bc/0xc6d0f8/0xc08100/0x88bfb0/0xa9ff8c/0xaa0718/0xaa0bc4/0xa58d7c；votes render-gfx:5 vs quest:4/monster-em:4（1.25×，分票） |
| 0xb35c60 | quest | worker | C | 链表查找：`ldr r1,[r1,#0]; cmp r1,#0; bxeq lr`，`ldrb r3,[r1,#40]; cmp r3,#25; ldreq r3,[r1,#4]; cmpseq r3,r2; bne` 循环，命中 `mov r0,r1`；callee 0x7aa47c/bl 0x7aedcc；votes quest:2（弱） |

## 表（201-229）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xbe7a40 | physics-math | leaf | C | `callees=-`、`votes=[-]`；`ldr r1,[r0,#2556]; sub r2,r1,#1; cmp r2,#2; bcs` 状态门控后 `movw r1,#0xa08; add r2,r0,#2576` 取三个 float 向量（`ed925a00`/`ed932a00`/`ed910a00`）做 `vcmp`(`eeb55ac0`)+`vstr`(`ed832a00`) 纯向量运算 |
| 0xc14188 | unknown | leaf | C | `callees=-`、`votes=[-]`；`cmp r1,#0; beq` 后取全局 0xc24bd4/0xc310c8，`add r0,r10,r10,lsl #2; add r6,r8,r0,lsl #2`（元素步长 20）遍历，`ldr r0,[r7,#140]` 计数、`add r6,r6,#152`，全程无 bl |
| 0x5b9938 | quest | orchestrator | C | `ldr r0,[r8,#88]; ldr r1,[r0,#0]; ldr r1,[r1,#36]; blx r1` 虚调用取索引，`movw r0,#0xb1a` + `mov r1,#100` + `mla r0,r9,r1,r0`（100 字节步长表）+ 全局 0x127f468/0x127f45c；votes quest:7 vs otomo-ot:5（1.4×，分票） |
| 0x638424 | otomo-ot | worker | C | 三次虚调用 `ldr r1,[r1,#56]; blx r1` 取状态，按返回值选 id：`mov r2,#231`→(==1)`mov r2,#230`→(==2)`movweq r2,#0xe8`(232)；callee 0x55bc7c/0x56e808/0x56e6fc/0x56dfac/0x54533c/0x550354；votes otomo-ot:4 vs quest:4（平票按首列取 otomo-ot） |
| 0x703990 | quest | orchestrator | B | `strb r0,[r4,#57]` 清状态，依次 `bl 0x65cbc4(r4,6)`、`bl 0x6f9b18(r4,0)`、`bl 0x65cbc4(r4,13)`，再 `ldrb r0,[r4,#68]` + `movw r1,#0x28da` + `add r0,r4,r0,lsl #4` 定位成员、`ldrh r1,[r0,#177]`；15 callee 含 0x6f9b18/0x6fa3d8/0x6fb720/0x6fb8e4/0x6fc2c8/0x6ffd40/0x70181c/0x702888/0x703c9c；votes quest:13 vs otomo-ot:2 |
| 0x797258 | quest | orchestrator | B | `mov r1,#48` + `bl 0x65cb3c` 取记录、`bl 0x552ec0`；按 `[r4,#1412]` 计数循环 `strb r0,[r2,#5]`（步长 6 的字节表），再 `ldr r0,[r4,#152]` 三路分派；callee 0x65ebf0/0x65e794/0x65e5bc/0x578cac/0x578a7c/0x677880/0x790d6c/0x552ec0；votes quest:15 vs otomo-ot:3（5×） |
| 0x79f314 | quest | worker | B | 连续 `strh r0,[r6,#70]/[#10]/[#8]/[#6]/[#4]/[#2]/[#12]` 清零 7 个半字字段，再 `ldr r0,[r6,#118]` 判空 → `ldrne r1,[r0,#100]` 二级判空；callee 0x4c9528/0x7a84a0/0x7a85ac/0x524d18/0x3c9d4；votes quest:5（唯一票源） |
| 0x7c95b8 | kernel-os | leaf | C | `callees=-`（无 bl，纯计算）；UTF-8 首字节长度判定：`and r2,r0,#224; cmp r2,#192` → `andne r2,r0,#240; cmpne r2,#224` → `and r2,r0,#248; cmp #240` → `andne r2,r0,#252; cmpne #248`，尾部 `and r0,r0,#254; cmp #252; movweq r1,#6`；votes online-nex:1 vs quest:1（平票） |
| 0x5d108 | unknown | leaf | C | `callees=-`、`votes=[-]`；`ldr r0,[r12,#28]; ldr r2,[r0,#12]; and r2,#7; sub r2,#1; cmp r2,#1; bhi`（枚举 1..2 判定）+ `movw r2,#0xb5f0` + `ldrh r2,[r0,#178]; cmps r2,r1; movweq lr,#1` + `orr r2,lr,#4; and r2,#7; cmp r2,#4`（打包状态位拆解） |
| 0xa398c | otomo-ot | worker | C | `bl 0x71078` 后 `ldr r7,[r0,#52]`，`movw r1,#0x1428; ldr r1,[r8,r1]`（对象字段）→ `movw r0,#0x5c94; add r6,r1,r0; ldrsh r0,[r6,#0]; cmp r0,#1`，再 `bl 0x72128` + `vcmp`；votes otomo-ot:1 vs monster-em:1（平票） |
| 0x163ea8 | monster-em | worker | B | 全局 0x16d4d08 单例 → `bl 0x197480(r1=6)`，再 `bl 0x161184`；栈参 `mov r0,#73`→`[sp,#8]`、`mov r0,#22`→`[sp,#12]`，`add r0,r6,#636`；callee 0x197480/0x19738c/0x197498/0x161184/0x6aa9b8；votes monster-em:4 vs otomo-ot:1（4×） |
| 0x3a400c | quest | worker | C | `movw r0,#0x14d0` + `ldr r0,[r4,r0]` 状态，`cmp r7,#1` 分支再 `movw r0,#0x14d4` + `ldrh r0,[r5,#176]`、`movw r0,#0x14d6` + `ldrsb r0,[r1,#0]` 三字段比对；callee 0x3a3d3c/0x227b3c/0x216bd4；votes quest:1/otomo-ot:1/monster-em:1 三方平票（按首列取 quest） |
| 0x3a5bbc | otomo-ot | worker | C | `ldrb r0,[r4,#185]; tst r0,#4; beq` 位门控 + `ldrb r0,[r4,#82]; cmp #0; cmpne #3; beq` 状态排除；随后把 `movw #0x1314/0x1318/0x1304/0x1308/0x12f4` 各成员地址算进栈槽 `[sp,#56]/[#64]/[#52]/[#60]`；callee 0x50b64/0x5e438/0x264240；votes otomo-ot:2 vs monster-em:1（弱） |
| 0x403cf8 | quest | worker | C | `movw r0,#0x1660; ldr r1,[r5,r0]` 取索引，`sub r8,r5,#8`/`sub r7,r5,#72`/`sub r6,r5,#12` 三视图，`ldr r0,[r6,#0]; add r0,r0,r1,lsl #2` 后 `vcmp`+`bpl`，再 `ldr r2,[r0,#360]; blx r2`；callee 0x3fb0a4/0x7aa47c/0x7aedcc；votes quest:2 vs monster-em:2（平票按首列取 quest） |
| 0x476014 | monster-em | worker | B | `bl 0x4a2210` 取对象，`movw r0,#0x142c; ldr r0,[r7,r0]` 判空 → `bl 0x887660` 释放 → `str r6,[r7,#0]` + `bl 0x887648`（加引用）后 `movw r0,#0x1430; str r5,[r4,r0]` = 句柄换入换出；votes monster-em:4 vs quest:2（2×） |
| 0x48bd9c | quest | worker | C | `movw r0,#0x7598; ldr r0,[r4,r0]` 判空即 `popeq`，非空 `ldr r1,[r0]; ldr r1,[r1,#64]; blx r1` 释放并清零；另一入口 `bl 0x48bc54` + 全局 0x13b1a64 → `bl 0x7aa47c` → `ldr r2,[r1,#52]; bx r2`；votes quest:4 vs otomo-ot:3（1.33×，分票） |
| 0x66c0f0 | quest | orchestrator | B | `mov r1,#5; mov r2,#27; bl 0x70e7b0`（基类构造带两个 id），`ldr r0,[pc]=0x11d4774; add r0,r0,#8; str r0,[r4,#0]` 装 vtable，成员构造 `bl 0x54ed74` 于 +64/+100，`bl 0x13efdc4` 清 60 字节于 +136，`mov r1,#276; mov r2,#3`；votes quest:15 vs otomo-ot:5（3×） |
| 0x6a64dc | quest | worker | C | `ldr r1,[r9,#4]; cmps r1,r8; bcs` 早退，全局 0x1192654 → `bl 0x7aa47c` → `mov r2,#16` → `blx r3`（按 16 字节分配）后再取全局 0x119287c/0x1198be0；callee 0x7aa47c/0x13efda0；votes quest:1 vs monster-em:1（平票按首列取 quest） |
| 0x75ce2c | quest | orchestrator | C | `sub sp,#732` + `sub sp,#2048`（2780 字节栈帧），`add r9,sp,#1024`、`add r6,r9,#380` 后 `bl 0x26e354`/`0x26e43c` 成对构造；`ldrb r0,[r7,#4]; tst r0,#31`；callee 0x26e354/0x26e43c/0x26e50c/0x26e600/0x26e964/0x26fd98/0xdee34/0x65cb3c；votes quest:6 vs monster-em:4（1.5×，分票） |
| 0x871ec8 | monster-em | worker | C | `vpush` + `eeb09a41`/`eeb0aa60`/`eeb08b40`（vmov/vabs）后 `ldr r5,[r4,#1160]` 取标志字，`tst r5,#2` 分支、`orr r0,r5,#2; str r0,[r4,#1160]` 置位，再 `movw r0,#0x454` + `vldr` 于 +0x454；callee 全为软浮点/库跳板（0x13efde8/0x13efdf4/0x13f00d0/0x13efdc4）；votes monster-em:2 vs quest:2（平票按首列取 monster-em） |
| 0x8721d0 | monster-em | worker | C | 与 0x871ec8 同模板但用另一标志位：`ldr r5,[r4,#1160]; tst r5,#4; orr r0,r5,#4; str r0,[r4,#1160]`，偏移改 `movw r0,#0x458`；callee 同上（软浮点簇）；votes monster-em:2 vs quest:2（平票） |
| 0x88f154 | quest | worker | B | `ldr r0,[r4,#252]` 取计数，为 0 即 `popeq`，否则 `bl 0x890be8(r4,r5)` 按索引循环（`add r5,r5,#1; cmps r5,r0; bcc`）；callee 0x890be8/0x887660/0x887648；votes quest:3（唯一票源） |
| 0x95d15c | quest | worker | B | 段首 `bx lr`，主体析构：`ldr r0,[pc]=0xee5548; add r0,r0,#8; str r0,[r4,#0]` 装 vtable，`ldr r0,[r4,#48]` 判空 → `ldr r1,[r0]; ldr r1,[r1,#4]; blx r1` 释放，清 +56/+60/+64，尾 `b 0x8879b4`（基类析构）；votes quest:3 vs render-gfx:1/monster-em:1（3×） |
| 0xb62b90 | quest | worker | B | `ldr r0,[r4,#100]` 计数，`ldr r3,[r4,#108]` 表基址，`tst r0,#1` 与 `add r3,r3,r6,lsl #2`（4 字节步长）索引；callee 0x82772c/0x827cd0/0x827998/0x827c90/0x827bbc/0x8277c4（0x827x 反射簇）+0x8282cc/0x82806c/0x13eff08；votes quest:7 vs save-data:2/audio:1（3.5×） |
| 0xc12444 | render-gfx | worker | C | 全局 0xc2691c → `bl 0xba5770` 取句柄（`cmn r0,#1` 判无效），随后把 `[sp,#96]/[#92]/[#88]/[#84]/[#80]/[#104]` 一串实参搬到低槽再调用；callee 0xba5770/0xba57dc（0xba 渲染簇）/0x7aa47c/0x13effd4；votes render-gfx:3 vs quest:3（平票按首列取 render-gfx） |
| 0x13e07e0 | online-nex | worker | B | `ldr r1,[r5,#1048]; ldrb r1,[r1,#64]; tst r1,#1` 位门控 + `ldr r9,[r0,#340]`、`ldr r7,[r0,#272]`、`cmp r4,#16384` 参数规模判定；callee 0x13cd500/0x13cd204/0x13d7484（0x13c-0x13d NEX 库簇）+0x13efe30；votes online-nex:3 vs quest:1（3×） |
| 0x27bf9c | unknown | leaf | C | `callees=-`、`votes=[-]`；对 +0x2384/+0x2388/+0x238c 三个槽重复同一归一化：`ldr r2,[r1,r2]; ldr r2,[r2,#12]; and r2,#7; sub r2,#1; cmp r2,#2; movcs r2,#0; strcs r2,[r1,#0]`（枚举越界置 0），无子系统线索 |
| 0x4718cc | monster-em | worker | C | `movw r0,#0x15a8` + `vldr`(`ed908a00`)，`mov r5,#1065353216`(1.0f) 存 `[sp,#4]`；`bl 0x4a1b50` 返回值 `sub r1,r0,#9; cmp r1,#3; bcc` 与 `sub r0,r0,#63; cmp r0,#16; bhi` 两段 id 区间判定，`movw r2,#0x3; movt r2,#0x1`(=0x10003)；votes monster-em:2（弱） |
| 0x530cf0 | weapon-wp | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cTrialLoadShellCount`（试射/装填弹数数据类，Shell=弾）；反汇编 `ldrsh r1,[r5,#4]`/`ldrsh r1,[r5,#6]` 依次经 `blx [vtable+20]` 写出两字段 = 该数据类的序列化；votes quest:6 为通用簇票，按类名取 weapon-wp |

## 表（230-244）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x5d59b8 | otomo-ot | orchestrator | B | `mov r0,#43; str r0,[r4,#40]`、`mov r1,#4; str r1,[r4,#44]` 设命令 id/通道，`bl 0x546e84([r4,#36],4,600)`，再 `bl 0x5d0fb4` 与尾跳 `b 0x56dfac`；另一入口 `bl 0x56dc28` + `bl 0x56e538(r4,43,5)`；callee 0x546e84/0x5d0fb4/0x5d0f5c/0x5d0f7c/0x56e538/0x5453bc/bl 0x7aedcc；votes otomo-ot:6 vs quest:3（2×） |
| 0x628308 | quest | orchestrator | B | 状态移位 `ldrb r0,[r4,#98]; strb r0,[r4,#99]; strb 0,[r4,#98]`，全局 0x1210a54 → `bl 0x276278` 取对象后 `ldr r2,[r0,#560]; blx r2` 虚调用、`cmp r0,#1` 分支；callee 0x276278/0x91b764/0x56e538/0x56e60c/0x56e61c/0x56e5a8/0x54f260/0x628b00；votes quest:7 vs otomo-ot:1（7×） |
| 0x79d1f0 | quest | orchestrator | C | 谓词函数：`bl 0x677880` 后 `ldr r2,[r1,#88]; cmp r2,#1; popne`、`ldr r1,[r1,#0]; cmp r1,#10; movweq r0,#1`；另一入口 `ldr r2,[r1,#72]; cmp r2,#3; bxne lr` + `cmp r1,#7`；callee 0x677880/0x55efe8/0x5cd09c/0x790efc/0x5584f4/0x65cb3c/0x65efc8/0x796c70/0x6700e8/0x66fc24/0x65f858/0x55bc4c；votes quest:8 vs otomo-ot:6（1.33×，分票） |
| 0xa4764c | quest | worker | C | `bl 0x7bb638` 分配后 `ldr r1,[pc]=0xb0ffab; add r1,pc,r1; str r1,[r0,#0]` 装 pc 相对 vtable，`movw r1,#0x6; movt r1,#0x1`(=0x10006) + `ldm/stm r0 {r1,r9}`，`add r1,r9,#80; str r1,[r0,#12]`；栈上 8 个槽先清零；votes quest:1（极弱） |
| 0xb11cbc | quest | worker | C | `bl 0xb04cf8` 前置 + `bl 0x7bb638` 分配，pc 相对 vtable，`movw r6,#0x40; movt r6,#0x80`(=0x800040)、`mov r2,#36`、`sub r1,r6,#43`，逐字段写 +12/+16/+20/+24/+28/+32 = 记录构造；votes quest:2（弱） |
| 0xb185b4 | render-gfx | worker | C | `ldr r6,[r5,#8]; ldr r0,[r6,#4]; cmp r0,#6; bne` 类型门控，`ldr r0,[r5,#112]` 判空后两次 `add r0,sp,#128`/`#64` + `bl 0xb1ab84`（在栈上建两块矩阵）+ `eeb78a00` 浮点；callee 0xb1ab84/0x2332ac；votes render-gfx:2（弱） |
| 0xb1b74c | unknown | leaf | C | `callees=-`、`votes=[-]`；从全局 0xd25684 与 0xd256ec 各取 3 个 dword 分别写 `[r7,#48]/[#4]/[#8]` 与 `[r7,#16]/[#20]/[#24]`（两组基向量初始化），并 `str r8(0),[r7,#12]/[#28]`，无 bl |
| 0xcb490c | quest | worker | B | `ldr r0,[r8,#0]; ldr r4,[r0,#292]` 取容器 → `ldr r0,[r4,#116]; ldr r9,[r4,#104]; add r0,r0,r1,lsl #2; str r0,[r8,#104]`（4 字节步长表 + 游标），`bl 0xce3998; cmp r0,#1`；callee 0xce3990/0xce3998/0xc60444/0xc60464/0xc60524/0xc60548/0xcb4c10；votes quest:5 vs render-gfx:1/item:1（5×） |
| 0x1186a40 | render-gfx | orchestrator | B | `ldr r0,[r4,#4]`、`cmp r1,#1; beq` / `cmp r1,#0; bne` 三路分派，命中后 `bl 0x282fd8`、`mov r2,#2147483648`(0x80000000)、`mov r3,#16` + `bl 0x283238`；callee 0x282fd8/0x283238/0x27bcd0/0x287fec/0x2793a4/0x280c1c/0x27e608/0x27f678/0x281c30/0x2831e0/0x2accfc/0x53a058/0x950bcc；votes render-gfx:7 vs online-nex:3/monster-em:3（2.3×） |
| 0x11a6fb8 | render-gfx | orchestrator | C | 字节打包：`movw r0,#0x274a` + `ldrb r0,[r1,r0]`、`ldrb r3,[r2,#-1]`、`orr r3,r3,r0,lsl #8`、`orr r3,r3,#64`、`strb r3,[r2,#0]`，再 `str r0,[r1,#230]` 与 `movw r0,#0xd8ba; movt r0,#0xffff`(负偏移)；callee 0x282fd8/0x280e4c/0x27bcd0/0x2a8d10/0x2b6e94/0x2b8020/0x2a0078/0x11a72bc/0x28272c/0x950bcc；votes render-gfx:5 vs monster-em:4（1.25×，分票） |
| 0x134a310 | online-nex | orchestrator | A | 自身与 13 个 callee 全部落在 NEX/Pia 区（0x12d120c/0x122818c/0x1228128/0x122813c/0x1228148/0x1228154/0x1228160/0x122816c/0x12d1230/0x130aa44/0x130ac14/0x12297a4/0x12297ec）；反汇编 `ldr r0,[r5,#8]; str r0,[r4,#4]` 后 `bl 0x12d120c; cmp r0,#2; movweq r0,#1; strb r0,[r4,#8]`；votes online-nex:14（唯一票源） |
| 0x1399c9c | online-nex | worker | A | vaddr 落在 Pia 库区间（0x1311000..0x13AB000），callee 含 Pia 成员 0x1398dcc；反汇编 `ldr r0,[r4,#100]; cmp r0,#3; bhi` + `mov r0,r0,lsl #2` 4 项跳转表（表项 0x10/0x50/0x84/0xdc），`ldrb r0,[r4,#168]` 门控后 `bl 0x130b0ec`；votes online-nex:5 一致 |
| 0x4680e0 | monster-em | orchestrator | B | 单例转发：全局 0x13d5448 → `bl 0x7aa47c` → `ldr r1,[r0,#0]; ldr r12,[r1,#32]; bx r12`（vtable+32 尾调），同段 `b 0x47c68c`/`bl 0x47c68c`；callee 0x47c68c/0x4a2304/0x4a1b6c/0x4a1b50/0x53aa84/0x32a400/0x4683e0/0x4684ec/0x7c6914；votes monster-em:9 vs quest:1（9×） |
| 0x5d0198 | otomo-ot | orchestrator | C | `ldr r10,[r4,#168]; beq` 与 `ldr r0,[r4,#92]; beq` 双门控，随后批量取全局表指针（0x1268a00/0x12689f0/0x12689e4/0x12689d4）；callee 0x1938bc/0x194228/0x56e808/0x56e530/0x56e62c/0x56e6fc/0x56e7b8/0x55bc4c/0x550354/0xb84114；votes otomo-ot:6 vs quest:4（1.5×，分票） |
| 0x72c3cc | quest | worker | B | 维度乘积：`mov r0,#396` + `ldrh r0,[r4,#176]`、`ldrb r3,[r4,#394]`、`ldrb r1,[r4,#392]`、`ldrb r2,[r4,#393]`、`ldrb r7,[r4,#395]`，`mul r0,r0,r3`、`mla r1,r3,r2,r1`、`mul r0,r0,r7`，再取全局 0x110cf80；callee 0x143894/0xdcb8c/0xdcc6c/0x13f540/0x65e5bc；votes quest:4 vs otomo-ot:1（4×） |

## 表（245-259）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x73fe44 | quest | orchestrator | B | `sub sp,#1440` 大栈帧，`ldrh r0,[r4,#66]; bl 0xdae68; cmp r6,#255; beq` 早退；随后位域重组 `ldrh r0,[r7,#0]; movw r1,#0xffe0; and` + `ldrh r1,[r4,#66]; and r1,#31; orr r0,r0,r1; strh r0,[r7,#0]`（5 位字段打包）；callee 0xdae68/0xdaba4/0xdad24/0xdee34/0xdf814/0x26e354/0x26e43c/0x26e50c/0x26e600/0x26e964/0x26fd98/0x65cb3c；votes quest:8 vs otomo-ot:4/monster-em:4（2×） |
| 0x78535c | otomo-ot | orchestrator | B | `mov r1,#14; mov r2,#34; bl 0x70e7b0`（基类构造带 14/34 两 id），`ldr r0,[pc]=0x10bb920; add r0,r0,#8; str r0,[r4,#0]` 装 vtable，随后 `bl 0x26e354` 在 +120/+0x5d8/+0xb38 逐成员构造；callee 0x70e7b0/0x54ed74/0x53da04/0x53e06c/0x53e7c8/0x53f320/0x26e354/0x26e43c/0x26e580/0x26fd98/0x50adfc/0x65d424；votes otomo-ot:8 vs monster-em:3（2.7×） |
| 0x67440 | otomo-ot | worker | C | `movw r0,#0x1051; ldrb r0,[r5,r0]` 取配置字节 + `strb r0,[r3,#0]` 回写，`add r0,r5,#3`、`movw r9,#0xb5f9`，循环 `bl 0x5ceb4`；callee 0x5ceb4/0x70824/0x49240/0xc6be4；votes otomo-ot:2 vs monster-em:1/render-gfx:1（弱） |
| 0x17fc78 | online-nex | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `3nex20PseudoGlobalVariableINS0_39AccountManagementServiceDDLDeclarationsEEE` / `bBackEndServicesLogoutE`（NEX 账号管理/后端服务符号）；反汇编 `ldrb r2,[r5,#85]; cmp r2,#253; bls` 边界早退、全局 0x16b8f14 的 `ldrb [r0,#73]` 比对、`movw r7,#0x13c4`；votes monster-em:1 为噪声，按字符串取 online-nex |
| 0x18c854 | quest | worker | B | `bl 0x18d890` 后 `ldr r0,[r11,#4]; ldr r0,[r0,#4]; cmp r0,#0`/`cmp #1` 二路选全局（0x16ac334/0x16ac344），`ldr r1,[r11,#424]` 传参 `bl 0x194d6c`、再 `ldr r1,[r0,#48]`；callee 0x194c80 亦在列；votes quest:3（唯一票源） |
| 0x1a0930 | quest | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cKitchenListSkillRandom`（食堂技能随机表，任务/据点数据类）；反汇编为字段序列化：`ldr r1,[r5,#4]` → `blx [vtable+24]`，`ldr r1,[r5,#8]` → 再次 `blx [vtable+24]`，尾部 `bx r2`；votes quest:5 一致 |
| 0x32a104 | quest | worker | C | `ldrb r0,[r4,#344]; cmp r0,#0`/`cmp #1` 状态分派，`ldr r1,[r5,#348]` 作计数，循环 `ldr r0,[r6,r7,lsl #2]; ldr r1,[r0,#0]; ldr r1,[r1,#136]; blx r1` 逐个释放数组元素；唯一 callee 0x887660；votes quest:1（极弱） |
| 0x4b9df8 | quest | worker | B | 字符串 `cResearchReinforce`（研究强化数据类名，但语义不足以单独定子系统）；反汇编为按字段序列化：`ldr r1,[r5,#28]`→`blx [vtable+12]`、`ldrh r1,[r5,#4]`→`blx [vtable+8]`、再 `[r5,#8]`/`[r5,#12]` 两次 `[vtable+24]`；callee 0x7aa47c/0x2b8f0/0x2b908/bl 0x7aedcc；votes quest:4（唯一票源） |
| 0x5ab7c0 | quest | worker | B | 双虚调用取上/下限：`ldr r0,[r5,#124]; ldr r1,[r0,#36]; blx r1` 与 `ldr r0,[r5,#0]; ldr r1,[r0,#40]; blx r1; sub r0,r0,#1; cmps r6,r0; bne`，命中后读 `ldrh r0,[r4,#154]`、`ldrb r0,[r4,#146]/[#147]`、`ldrh r2,[r4,#152]`；callee 0x525bf0/0x55bac0/0x56e808/0x56de60/0x56dfac；votes quest:5（唯一票源） |
| 0x6a6e34 | quest | worker | B | 取全局 0x1191d8c/0x1191d54/0x1191d44 三个单例，把 `ldrb r2,[r0,#94]`→`strb r2,[r1,#36]`、`[r0,#95]`→`[r1,#37]`/`[r1,#38]` 逐字节复制，再 `bl 0x3f856c`；callee 0x5610d0/0x55f18c/0x12750/0xbad28c + 自递归；votes quest:4 vs otomo-ot:2/monster-em:1（2×） |
| 0x6bce00 | quest | orchestrator | B | `ldr r0,[r4,#188]; cmp r0,#3; bhi` + `mov r0,r0,lsl #2` 4 项跳转表（表项 0x10/0x268/0x18/0x11c），其中一支 `mov r0,#3; str r0,[r4,#188]` 推进状态；全局 0x117c170 → `bl 0x509470`；20 callee 含 0x509470/0x508924/0x50b4dc/0x50c6fc/0x50d090/0x50dd30/0x50dee8/0x50fa38/0x50fb24/0x507920/0x50adfc（0x50xxxx 簇）；votes quest:13 vs otomo-ot:4/monster-em:3（3.25×） |
| 0x7a0b74 | quest | worker | B | `mov r1,#7; bl 0x65cb3c` 取记录后 `cmp r11,#0; beq` 早退，再取全局 0x109801c/0x1099c5c/0x1099c50 与常量 `mov r8,#2`/`mov r10,#1`；callee 0x195448/0x19c58c/0x199830/0x63ebec；votes quest:4 vs otomo-ot:1（4×） |
| 0x9b7154 | monster-em | worker | C | `ldr r2,[r5,#272]` + `tst r7,#134217728`(0x8000000) 与 `andne r1,r7,#15728640`(0xF00000) 位域拆分，`ldr r1,[r4,#244]; ldr r2,[r1,#144]` 二级判空，全局 0xe820ac；唯一 callee 0x9b7450；votes monster-em:1（极弱） |
| 0x9e28e8 | filesystem | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `mpResource` / `resource`（mp* 资源类名，slice-06 口径）；反汇编析构：vtable 取自 0xe60674+8，`ldr r0,[r4,#104]; ldr r1,[r0,#-4]` 读引用计数头 → `sub r5,r0,#8` → 循环 `sub r7,r7,#112` + `bl 0x8879b4` 释放 112 字节记录，再全局 0xe60620 → `bl 0x7aa47c`；votes quest:4 与字符串冲突，按 §8 取 filesystem |
| 0xc700a4 | quest | worker | B | `bl 0xc6f13c` 基类后 `ldr r0,[pc]=0xbd58a4; add r0,r0,#8` 装 vtable；callee 0xc6f13c/0xb12fc0/0xb13458/0x7aa47c/0x13b7424/0x13efd7c/0x13efdd0；votes quest:6 vs render-gfx:1（6×） |

## 表（260-273）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x13c4aa0 | online-nex | orchestrator | A | 字符串 `; filename=""%s""`（SQL 语句片段）+ 反汇编 `ldr r7,[r0,#44]` 后对同一串 `mov r1,#92`(`\`) 与 `mov r1,#34`(`"`) 两次 `bl 0x13eff44`（strchr）= SQL 转义，再 `bl 0x13d7470`；11 callee 全 0x13cxxxx/0x13dxxxx（0x13d7470/0x13d74ac/0x13d7484/0x13d7c00/0x13d7c50/0x13d7bb0/0x13c49c4 = NEX DB/HTTP 层）；votes online-nex:10 一致 |
| 0x1cce60 | quest | worker | C | `movw r6,#0xff7f` 哨兵值，`ldr r0,[r4,#4]` 判空后全局 0x166e304 → `bl 0x7aa47c` → `mov r2,#16; mov r1,#20; blx r5`（按 20/16 分配）→ vtable 0x166e2d0+8 → `strh r6,[r0,#8]/[#10]/[#12]` 三字段初始化；votes quest:1（极弱） |
| 0x27b9c8 | monster-em | orchestrator | B | `bl 0x303754` 后 `ldr r0,[r10,#1276]` → `movw r1,#0x14d0; str r0,[r10,r1]`、VFP `ed9a2a07`/`ee010a02`/`ed800a00` 复制浮点，再 `bl 0x53a058` → `str r0,[r10,#0x14d8]`、`ldr r1,[r0,#320]; blx r1`；callee 0x303754/0x53a058/0x2861f0/0x288954/0x26fca4/0x277830?；votes monster-em:9 vs quest:2/render-gfx:1（4.5×） |
| 0x28bde0 | monster-em | orchestrator | B | 段首尾跳 `b 0x27a858`（基类），另一入口 `bl 0x27a858` + 全局 0x15b03c8 → `bl 0x7aa47c` → `ldr r2,[r1,#52]; bx r2` 虚析构；段内多条 `b 0x27accc/0x27acd0/0x27acd4` 桩；callee 0x27b34c/0x27b918/0x2885a4/0x28c0d8/0x48c388/0x48c4f0/0x49ae60/0x957400；votes monster-em:7 vs quest:4（1.75×） |
| 0x307f18 | quest | orchestrator | C | `ldr r6,[r4,#48]` 判空，`movw r0,#0x13c4; ldr r0,[r6,r0]; ldrb r1,[r0,#1236]` 取配置字节，全局 0x1530e34 → `bl 0x277830` 后 `cmp r0,#20; str r0,[r8,#0x13d0]`、命中再 `ldr r1,[r0,#712]; blx r1`；callee 0x277830/0x47f530/0x887660/0x887648/0x957400/0x957480/0x954640；votes quest:4 vs monster-em:3（1.33×，分票） |
| 0x3b40a4 | otomo-ot | worker | B | 全局 0x1484c68 单例：`ldrb r0,[r6,#80]; cmp r0,#2; bne` 类型门控，`ldrb r0,[r6,#236]; tst r0,#2` 与 `ldrh r0,[r6,#240]; cmps r0,r4` 双条件，命中后 `ldrh r7,[r6,#244]` 减 `bl 0x3b439c` 结果 → `strh r0,[r6,#242]`（倒计时写入）；callee 0x3b439c/0x227a98/0x227b3c/0x216708；votes otomo-ot:3 vs render-gfx:1（3×） |
| 0x3bff10 | unknown | leaf | C | `callees=-`、`votes=[-]`；`movw r1,#0xaf19; ldrb r1,[r0,r1]; cmp r1,#1` 门控，`movw r2,#0xd78d; ldrb r4,[r1,r2]; cmp r4,#255; beq` 哨兵判定，`add r5,r3,r4,lsl #2; ldr r5,[r5,#2704]; cmp r5,#3` |
| 0x3c512c | monster-em | worker | C | 析构：vtable 0x1477928+8 → `[r8,#0]`，随后对 +0x31e0/+0x2c6c/+0x26f8/+0x2184/+0x1c20/+0x16bc 六个成员逐个 `add r0,r8,#imm; bl 0x26e50c`（成员销毁，0x26exxx 簇）；callee 0x26e50c/0x7aa47c + 自递归；votes monster-em:2 vs quest:1（弱） |
| 0x49dd64 | quest | worker | C | 单例转发：全局 0x139fde8 → `bl 0x7aa47c` → `ldr r1,[r0,#0]; ldr r12,[r1,#32]; bx r12`（vtable+32 尾调），另一入口走 `ldr r2,[r1,#52]` 虚析构；唯一 callee 0x7aa47c；votes quest:1（极弱，59 caller 的转发壳） |
| 0x4a0c04 | quest | worker | C | 与 0x49dd64 同模板：全局 0x139d144 → `bl 0x7aa47c` → `ldr r12,[r1,#32]; bx r12`；唯一 callee 0x7aa47c；votes quest:1（极弱） |
| 0x6bd428 | quest | orchestrator | B | 按 r1 分派：`cmp r1,#5; bhi` + `mov r1,r1,lsl #2` 6 项跳转表（表项 0x18/0x64/0xac/0xd0/0x1c8/0x204），各支路调 0x3f85fc/0x50fb8c/0x50fb24/0x5089e4/0x5081ac/0x506e88/0x506328/0x50adfc/0x50d090；22 callee 含 0x3f8534/0x3f85fc/0x3f9000；votes quest:15 vs otomo-ot:4（3.75×） |
| 0x70c04c | quest | orchestrator | B | `mov r5,#2` 与 `ldr r0,[r4,#76]; cmp r0,#6; bhi` + 7 项跳转表（表项 0x1c/0x64/0xa0/0xfc/0x138/0x184/0x1f8），一支取全局 0x1134abc/0x112cb00；callee 0x14d080/0x14d704/0x14d93c/0x14dfdc/0x14e440/0x14e5a8/0x14e5f0/0x14e7f4/0x14e8e0/0x14ea3c（0x14xxxx 簇 10 个）+0x276278/0x276798/0x27c6f8/0x3f8534/0x3f856c/0x3f85fc/0x65e794；votes quest:13 vs otomo-ot:3（4.3×） |
| 0x736f98 | otomo-ot | orchestrator | B | `mov r1,#5; bl 0x65c7e8`（基类构造），vtable 0x1109c98+8 → `[r0,#0]`，`movw r2,#0x0; movt r2,#0x42b4`(=0x42b40000=90.0f) 与 `mvn r3,#0` 一起 `ldm/stm r12 {r1,r2,r3}` 写 +56..64 = {0, 90.0f, -1}，再 `str r1,[r0,#68]`；17 callee 含 0x65c7e8/0x65c870/0x65ca7c/0x65ca80/0x65ca84/0x65cb3c/0x65d9e8/0x65e0e8（0x65cxxxx-0x65exxxx 簇）；votes otomo-ot:10 vs quest:5（2×） |
| 0x7be958 | quest | worker | C | 转发壳：`add r0,r0,#16` 后 `ldm/stm sp {r3,r12}` 组参调 `bl 0x7f4154`，另一入口调 `bl 0x7f4630`，段内另有 `mov r0,#0; bx lr` 空桩；callee 0x7f4154/0x7f4630/0x7f4b0c/0x7e71e0/0x7e74f4/bl 0x7aedcc；votes quest:2/render-gfx:2/online-nex:2 三方平票（按首列取 quest） |

## 表（274-286）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xbe1c14 | quest | worker | C | 静态表初始化：`ldr r0,[pc]=0x15450b8; add r1,pc,r0` 后依次 `str r5(0)`→`[r1,#0]`/`[r1,#4]`、`str r0(1)`→`[r1,#8]`、`str r2(2..4/8/9)`→`[r1,#12]`…`[r1,#28]`，再 `mov r2,#5; strd r2,[r1,#0]`、`mov r3,#6`；callee bl 0x7aedcc（类注册）+0x887660；votes quest:2（弱） |
| 0xc19fa4 | render-gfx | worker | C | `sub sp,#304`；`ldr r0,[r5,#8]; ldr r1,[r0,#84]; beq`，`ldr r2,[r5,#4]; ldr r1,[r1,#204]; add r2,r2,r2,lsl #2; add r7,r1,r2,lsl #4`（元素步长 5×16=80）后取 `[r7,#16]/[#20]/[#24]`；callee 0x91eef4/0x9a56a0；votes render-gfx:2（弱） |
| 0x33e60 | quest | worker | C | 与 0xa4764c 同模板：栈槽 `[sp,#4..#28]` 全清 → `bl 0x7bb638` 分配 → pc 相对 vtable `str r1,[r0,#0]` → `mov r1,#6` + `ldm/stm r0 {r1,r10}` → `add r1,r10,#4; str r1,[r0,#12]`；唯一 callee 0x7bb638；votes quest:1（极弱） |
| 0x5b160 | otomo-ot | worker | C | 全局 0x17dda48 单例 → `ldrb r0,[r0,#72]; sub r0,r0,#1; cmp r0,#23; movhi r0,#0; bxhi lr` 枚举越界返回 0，再 `movw r1,#0x3cff; movt r1,#0xe0; mov r2,#1` 组合掩码位判定；callee 0x5d108/0x66ee8/0x66eec/0x68950/0x13efd7c；votes otomo-ot:3 vs quest:2（1.5×，分票） |
| 0xd2210 | item | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cArmorColorBase`（防具配色基类，cXxx 数据类名）；反汇编为字节流写出：`ldrb r6,[r5,#4]` → `cmps r0,r1; bcc` 缓冲满则 `blx [vtable+56]` 扩容 → `strb r6,[r1,r0]; add r0,r0,#1; str r0,[r4,#12]`，再写 `[r5,#5]`；votes quest:4 为通用簇票，按类名取 item |
| 0x18dd88 | quest | orchestrator | B | `bl 0x18c030`（基类构造）后 vtable 0x16acdcc+8 → `[r0,#0]`，`mov r1,#1; str r1,[r0,#424]` 置标记；另一入口 `bl 0x18c4f0` + 全局 0x16acd98 → `bl 0x7aa47c` → `bx r2`；callee 0x18b468/0x19b7a8/0x19c2a0/0x65de34/0x65e794；votes quest:7 vs otomo-ot:1（7×） |
| 0x2a9b78 | monster-em | leaf | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) `callees=-`、`votes=[-]`；特征立即数 `movw r1,#0x2506` + `ldrh r1,[r0,#177]; cmp r1,#1` 与 `movw r1,#0x250a`、`ldrh [r0,#177]`——0x2506/0x250a 是 slice-02 已记录的怪物对象字段 id，[r0,#177] 为该对象 id 字段；随后 `sub r2,r1,#77; cmp r2,#167; bhi` + 168 项跳转表（表项 0x2a0/0x2a4） |
| 0x2b2618 | monster-em | worker | C | `bl 0x2fd67c` 后连续 VFP 比较 `eeb50ac0`(vcmp)+`eef1fa10`(vmrs)+`ble`/`bls`，两次 `movw r0,#0x2834; add r0,r4,r0` 后 `vstr`(`ed800a00`) 写回 → 浮点区间钳制；callee 0x2fd67c/0x27c6f8/0x27bcc0；votes monster-em:2 vs otomo-ot:1（弱） |
| 0x39157c | quest | worker | C | 与 0x33e60/0xa4764c 同模板：栈槽清零 → `bl 0x7bb638` → pc 相对 vtable → `mov r1,#6` + `ldm/stm r0 {r1,r10}` → `add r1,r10,#4; str r1,[r0,#12]`；唯一 callee 0x7bb638；votes quest:1（极弱） |
| 0x3b3db0 | quest | worker | C | 全局 0x1484de4 → `bl 0x3f8398` 取基址，`add r0,r6,r1,lsl #2` 后用 `ldrh r3,[r0,#4]`/`[#8]`/`[#12]`/`[#16]` 与 r5 逐个比较并返回索引 0/1/2 = 4 项扫描查找；callee 0x3f8398/0x3af160；votes quest:1 vs otomo-ot:1（平票按首列取 quest） |
| 0x3cebdc | quest | orchestrator | B | `ldr r1,[r10,#0]; beq` 判空，`ldr r0,[r6,#0]; ldr r2,[r0,#28]; blx r2` 虚调用后按返回值 `orrne r2,r1,#2; str r2,[r10,#12]` 置标志位，再判 `ldr r0,[r6,#8]`；callee 0x838538/0x838574/0x8385e8/0x838634/0x838798（0x838xxxx 簇）+0xb38f14/0xb38f50（本片 0x121 同族）；votes quest:7 vs otomo-ot:1（7×） |
| 0x4e8860 | otomo-ot | worker | B | 哨兵初始化：`movw r5,#0x1c0b` + `mvn r0,#0; strb r0,[r6,r5]`，`mov r0,#255; strb r0,[r6,#3]/[#2]/[#1]`；全局 0x1350320 → `bl 0x3f8390` 后 `and r1,r0,#3` 取环下标，再 `add r1,r0,#1; and r1,r1,#3` 探测下一槽（4 槽环形查找）；callee 0x3f8390/0x4e666c/0x507b04/0x4e34a4；votes otomo-ot:3 vs quest:1（3×） |
| 0x4ef3f0 | quest | worker | B | `ldr r0,[r7,#220]; beq` 门控 → `bl 0x4df890` 后 `cmp r0,#1; popne` 早退，再 `add r1,r7,#236` 并用 `ldrb r3,[r1,#0]`/`[r1,#36]` 逐项判零（成员表扫描）；callee 0x4df890/0x4df8e0/0x4df930；votes quest:3（唯一票源） |

## 汇总

- 覆盖：**286/286** 函数（`.tmp/mhgu/tierB2/slice-11.txt` 全部 `=== ` 条目，按文件顺序；该输入文件本身是 286 条，不是 120 条）。
- 反汇编来源：`.tmp/mhgu/tierB2/slice-11.asm.txt`（每函数前 24 条指令）。每行 evidence 都引用该文件里实际出现的指令/立即数/字符串。
- conf：**A 29、B 142、C 115**（逐行机械统计，合计 286）。
- A 级的证据构成（29 条，全部为「切片文件内可见」的独立信号，符合 Main 的审计规则；**没有**任何一条仅靠 class-inventory 类名 + 裸 `bl 0x7aedcc` 定 A）：
  - 切片 `strings` 行引用的字符串（20 条）：`NGWordList`、`mpDynamicPath`/`resource`、`cResourceSample`、`cInsectAttrFeed`、`cAmuletBase`、`cOtodokeConditionList`、`cKowareObjData`、`cArmorColorBase`、`cKitchenListSkillRandom`、`cTrialLoadShellCount`、`cTradeDeliveryList`、`cTrialHeavyBowgunData`、`stex`、`ptex`、`MT_NET_SHARED_MEMRY`、`%255[^:]:%d`/`%s:%d`、`; filename="%s"`、`3nex20PseudoGlobalVariable…AccountManagementServiceDDLDeclarations…`/`bBackEndServicesLogoutE`、`DL_DataStoreGetNewArrivedNotificationsParamE`/`3nex30_DDL_DataStoreSpecificMetaInfoE`/`ReqPostInfoV1E`。
  - Pia 区间 callee 或 vaddr（7 条）：0x13aef24、0x13a909c、0x139dce4、0x1399c9c、0x134fd78、0x13508ac、0x134a310（0x1399c9c 以自身 vaddr 落 Pia 区间 + Pia callee 0x1398dcc 为准）。
  - 特征立即数（2 条）：0x2a9b78 的 `movw #0x2506`/`#0x250a` + `ldrh [r0,#177]`（slice-02 已记录的怪物对象字段 id）；0x66360c 的 `movw r1,#0x6bfc` + `tst r1,#49152`（任务/会话单例字段）。
- A 级标签分布：online-nex 12、quest 5、filesystem 3、item 3、render-gfx 2、weapon-wp 2、ui 1、monster-em 1。
- label 总分布（少数类精确计数）：online-nex 18、physics-math 17、unknown 10、filesystem 3、item 3、weapon-wp 2、ui 1、save-io 1、kernel-os 1（合计 56）；其余 230 条分布在 quest / monster-em / otomo-ot / render-gfx 四类（quest 最多，monster-em 次之；逐行见上表）。
- 与字符串冲突时按 §8 取字符串的 15 条（已在行内注明 votes 冲突）：0x861efc、0xa179bc、0x17e6bc、0xec64c、0x381738、0xce160、0xb4ec44、0xbb9348、0x9e28e8、0x13c4aa0、0x4bba04、0x86f158、0x52e63c、0x530cf0、0xd2210。
- 票与 callee 簇相反、因无指令可裁而降 C 的 3 条：0x9be320（簇 5/9 渲染 vs votes quest:8）、0xc11130（簇 6/6 0xc17xxxx vs votes quest:6）、0x803494（簇 6/6 0x808-0x809 数学 vs votes quest:4）。
- 明确 unknown/C 的 10 条（无可辨子系统）：0x121b808、0xc14188、0xb79b00、0x7c9288、0x5d108、0x27bf9c、0x3bff10、0xb1b74c、0x13bb538、0x56c168。
- 平票处理：次席 ≥ 0.6×top 时按 votes 首列取标签并记 C（如 0x4dd648、0x5da1b4、0x638424、0x871ec8/0x8721d0）。
- 未使用 UNCONFIRMED 占位；本片未写任何代码，未 build、未 git 操作。


