# Tier B pass3 - slice-01a

## Confirmed

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x1cee88 | quest | orchestrator | B | votes quest:26 vs otomo-ot:14 (26≥1.6×14)；0x1cee9c/0x1ceeac movw #0x6bfc / #0x6c34 对同一单例两字段 orr（任务/会话单例偏移对，同 pass2 0x728014 先例）；11323 insns、22 callee |
| 0x11d5954 | monster-em | orchestrator | B | votes monster-em:26 vs render-gfx:14 (26:14=1.86≥1.6)；0x11d598c movw #0x2b84 + 0x11d5998 ldrh [r3,#178] and #65280 orr #7 + strh 回写（EM 状态字位域更新）；主体 11136 字节对象按 r5=0/1/2 分派；22 callee 全 0x27-0x2b/0x11d 角色簇 |
| 0xab11b8 | render-gfx | worker | C | votes render-gfx:27 vs quest:20 = 1.35 分票（次席≥0.6×top）；真函数仅 8 条指令（push 0xab11b8 / bl 0xa58d7c 0xab11bc / 装 vtable 0xd928cc+8 0xab11cc / pop 0xab11d0），1 bl → worker；0xa5-0xa7/0xab 渲染簇证据属被合并的 region 而非该真函数 → 降 C；label render-gfx 保留（vtable 0xd928cc 区域合理） |
| 0x11ed5dc | monster-em | orchestrator | B | votes monster-em:25 vs render-gfx:12 (25≥2×)；0x11ed5e8 movw #0x274a + 0x11ed5f8 ldrb [r2,#-1]/[r2,#2] + 0x11ed60c orr #64 拼装状态字节（与 0x120c964/0x1201644 同一 0x274a 字段模板，EM 对象状态机）；21 callee 全 0x28/0x2a-0x2b/0x11e 角色簇 |
| 0x11c29d4 | monster-em | orchestrator | B | votes monster-em:21 vs render-gfx:10/online-nex:7/otomo-ot:6 (21≥2×)；0x11c29f0 ldr [r0,#440] 虚调用判 r0==1 门控 + 0x11c2a14 ldr [r0,#360] 虚调用取状态 cmp #6 走 6 项跳转表（0x11c2a30 pc 相对表）；22 callee 全 0x27-0x2b/0x11c 角色簇 |
| 0x1db20c | quest | orchestrator | B | votes quest:18 vs otomo-ot:9 (2×)；0x1db214/0x1db218 sub sp 10240+348 + add r9,r11,#60 大缓冲构造后连续 bl 0x838750/0x8385e8/0xb219cc（与 pass2 0x1e3338 同款 0xb21xxx 流/0x838xxx 构造簇，序列化写侧）；22 callee 含 0xb215b4/0xb21388/0xb252ac |
| 0x11b0e94 | monster-em | orchestrator | B | votes monster-em:24 vs render-gfx:9/otomo-ot:8 (24≥2.6×)；0x11b0eac movw #0x23a0 + 0x11b0ec8 ldr [r0,r1] 逐项取全局后 0x11b0ee8 ldr [r1,r0,lsl #4] 步长 16 索引表项（表驱动分派）；24 callee 全 0x28-0x2b/0x11b/0x13f 角色簇（0x2a1d90/0x2ab670/0x2ad4f4） |
| 0x8f004 | monster-em | orchestrator | C | votes monster-em:17 vs otomo-ot:12 = 1.42 分票（<1.6）；0x8f010 movw #0xba44 + 0x8f020 bic #145 / orr #17 为通用标志位掩码更新，非子系统模式；无字符串、无已知种子 → 降 C；label monster-em 按区域多数票保留 |
| 0x11ca36c | monster-em | orchestrator | B | votes monster-em:29 vs render-gfx:5 (29≥5.8×)；0x11ca388 movw #0x2506 + 0x11ca398 movw #0x250a ldrh + cmp #16 门控（对象状态字字段，同 pass2 0x26639c 偏移族）+ 0x11ca3a4 sub #6 cmp #172 后 173 项 pc 相对跳转表（0x11ca3c0 起）；23 callee 全 0x28/0x2a-0x2b 角色簇 |
| 0x11aa480 | monster-em | orchestrator | B | votes monster-em:25 vs render-gfx:13 (25<1.6×13 分票)；0x11aa494 ldr [r0,#1208] 虚调用 + 0x11aa4c8 ldr [r0,#2068] 虚调用 cmp #2 门控（vtable 高偏移虚分派，EM 大对象）；22 callee 全 0x27-0x2b/0x11a 角色簇（0x2a8d10/0x2ad4f4/0x2e9b7c），含自递归 0x11aa480 |
| 0xb9413c | render-gfx | orchestrator | B | votes render-gfx:9 vs quest:4 = 2.25≥1.6，B 按主导票取 render-gfx（reviewer 判定：通用序列化写入器结构不足以定向 quest）；0xb9413c push {r4-r8,lr} 头无早退、无 pop/bx lr 于 24 条内，classified.csv 62 callee → orchestrator；0xb94150 ldr [r5,#204] 缓冲判空 + 0xb94188 ldr [r1,#16]/[r1,#8] 位置/上限比较 + 0xb94178 bl 0x13efe00；13 callee 含 0x885804/0x882674/0x8826fc/0x893ca8（0x88x 簇）与 0x7aa47c |
| 0x57f5ac | ui | orchestrator | B | votes otomo-ot:26 vs quest:22 (分票，与类簇冲突取结构)；0x57f5c4 sub r0,#1 + cmp #28 → 29 项 pc 相对跳转表（0x57f5e0 起）；22 callee 集中 0x55bc4c/0x56e530/0x56e808/0x58565c-0x587924（UI 字段注册/构建簇；同片 0x5bf160 类名 cUIOKitchenUpBase 锚定 0x56-0x58 簇为 UI）；无 0x28 系基类调用，真函数在块首 |
| 0x1201644 | monster-em | orchestrator | C | votes render-gfx:23 vs monster-em:15 = 1.53 分票（<1.6）；0x1201654 movw #0x274a / #0x2749 + 0x1201674 orr/lsr/strb 字节重组模板真实但非 em 专属——pass2 slice-02 已将同一 0x274a 模板的 0x11bde84 判为 render-gfx；票首为 render-gfx，B 属过度声明 → 降 C；label monster-em 按票+角色簇保留（flag） |
| 0xb79e60 | quest | orchestrator | B | votes quest:10 vs audio:6 (10:6=1.67≥1.6)；0xb79e6c GOT 0xcca854 + 0xb79e88 GOT 0xcca840 装两个 vtable 前缀后 0xb79ea4/0xb79eb8 blx [r4,#48] 虚调用——vtable 装配/析构结构；18 callee 含 0x82fb08/0x82fb10/0x82fb14/0x831b90/0x8260d4/0x826130（0x82x 序列化流簇，同 pass2 0x2733a4 引用的音频/流混区）与 0x7aedcc/0x7aa47c/0x7bb638 |
| 0x5bf160 | ui | orchestrator | A | 字符串 "cUIOKitchenUpBase"（cUIO=UI 食房升级基类，UI 类名直接定向）；0x5bf198 movw r5,#0x4277 / movt #0xf 字段注册后 0x5bf1a8/0x5bf1bc 重复 bl 0x56e538 逐字段绑定；22 callee 全 0x545-0x570/0x55b/0x56d-0x56e/0x600 UI 构建簇（0x55bc7c/0x56e808/0x56e538）；votes otomo-ot:37 与类名冲突，按类名取 ui |
| 0x4a31f0 | quest | worker | B | votes quest:3（弱唯一票）；0x4a31f8 movw #0x1384 取成员 + 0x4a321c movw #0x136c 备用成员、0x4a3230 mov r5,#255 哨兵，0x4a3244 ldr [r0,r5,lsl #2] 按 r5 索引表项；5 callee 仅 0x48b164/0x7aa47c/0x13efda0/0x7aedcc/0x13efd7c（通用+EM 邻域 0x48b164）；按 0x48-0x4a 区 quest 票与表驱动结构取 quest |
| 0x120c964 | monster-em | orchestrator | B | votes monster-em:22 vs render-gfx:11/audio:5 (22=2×)；0x120c970 movw #0x274a + 0x120c980 ldrb [r3,#-1]/[#2] + orr #64 拼状态字节 + 0x120c9a4 str [r2,#230] 清零——与 0x11ed5dc/0x1201644 同一 0x274a 模板第三实例；23 callee 全 0x28/0x2a-0x2b/0x121 角色簇 |
| 0x1207d2c | monster-em | orchestrator | B | votes render-gfx:15 vs monster-em:13/otomo-ot:12 (分票)；0x1207d38 ldr [r0,#772] 虚调用 cmp #35/#34 两分支 + 0x1207d5c bl 0x2864e0(r4,#49) 后按结果 mov r1,#74/#72、0x1207d7c mov r1,#77 + 尾跳 bl 0x282870——状态→动作码映射（35/34/49/72/74/77 特征立即数）；22 callee 全 0x28/0x2f/0x2d/0x11e 角色簇 |
| 0x11965fc | monster-em | orchestrator | B | votes monster-em:17 vs render-gfx:14 (分票)；0x1196610 movw #0x3328 + 0x1196634 movw #0x3358 双字段各做 VFP vldr/vcmp/bgt 门控后 bl 0x53aa84（浮点阈值→调用开关，连续两组同构）；23 callee 全 0x28/0x2a-0x2b/0x119 角色簇（0x2a2db4/0x2a1970/0x2a1bc0） |
| 0x482924 | monster-em | orchestrator | B | votes monster-em:35 vs quest:6 (35≥5.8×)；region 内主体属 fn 0x4824dc（function_start 证实 0x482924 非独立入口）；0x482924 movw #0x15bc + 0x482944 movw #0x15be ldrh 后 cmp #12 → 13 项 pc 相对跳转表（0x482964 起，状态分派，含 0x482940 b 0x4829f8 大分支）；22 callee 集中 0x47f-0x481/0x4a1b6c/0x4a30dc（0x48/0x4a EM 邻域簇）；label 施于 region，票与跳转表同向 |

## In progress

## Unknown

## Summary

- conf A: 1（0x5bf160 ui，类名字符串）
- conf B: 16
- conf C: 3（0xab11b8、0x8f004、0x1201644）
- total: 20
- label 分布：monster-em 11、quest 4、ui 2、render-gfx 2、otomo-ot 0（0x57f5ac/0x5bf160 按 UI 类簇/类名从 otomo-ot 票改判 ui；0xb9413c 按 reviewer 判定改 render-gfx 主导票）
- reviewer 复核记录：b3-review-01 part 01a 16 PASS / 4 FAIL，已按其判定改 0xab11b8→worker/C、0x8f004→C、0xb9413c→render-gfx/orchestrator/B、0x1201644→C；修正 0x11d5954 与 0xb79e60 的票比括注；registrar 上下文 flag（0xb79e60 rCns* physics-math、0x4a31f0 uShell*、0x1db20c 序列化簇）已记录待 Main 仲裁

审查后（DsvB3r01，返工后 20 PASS / 0 FAIL）：conf A 1 / B 16 / C 3（共 20）。
