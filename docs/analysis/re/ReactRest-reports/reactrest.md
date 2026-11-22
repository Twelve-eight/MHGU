# ReactRest：GU 反应码 11 / 12 / 24 / 71 语义钉点与 Rise 映射

派单: 主会话 brief（React49 同方法）。优先 24（同属 dispatcher 0x2f22e8）。
结论分级 [C]（自跑命令贴证据）/ [B] / [U]。React49 阳性对照 = react 44 → 0x2f0280 → 0x2f1918 → r4=13 → 0x2f1a30 (EarL)；dispatcher 表阳性对照 = id1=67 表项 0x13c。

## Confirmed

- [C] **react 24 = dispatcher 0x2f22e8，表项已读**：79 项表下标 36（id1=38）@0x2f2410 = **0x150 → 默认分支**（无 vtable+1848 arm），与阳性对照 id1=67 @0x2f2424=0x13c（arm 分支）形成同表直接对比；周边 id1=34..40 全 0x150、id1=67=0x13c、id1=79=0x13c 复核无误。命令：read_words 0x2f2410 x24。
- [C] **子开关表 r6=38 表项**：96 项表 0x2f259c 下标 34（r6=38）@0x2f2624 = **0x1b4 → 不重映射**（与 67−4=63 @0x2f2690 同值）。命令：read_words 0x2f2624 x24。
- [C] **handler 0x2f00e0 本体**（disasm 0x2f00e0 x30）：`ldrh r0,[r9,+0x3248]`，==0 时清 pl+0x28b8/0x28bc 两 u32；然后 `r0=0, r1=2, r2=38, r3=38; b 0x2efb94`（与 react 2/13/49 同一 wrapper）。**紧邻的 0x2f0118（react 49）逐指令同构，仅 r2=r3=67** —— 24 与 49 是同一管线的孪生分支，唯一差异 = 状态 64 动作 id 38 vs 67。
- [B] 综合：react 24 最终施加 `0x2831e0(pl,64,38,12)` ×2（0x2f2828/0x2f285c，id1、id2 各一次），即**玩家受击动作状态 64 + 动作子 id 38，arg=12**，与 49 的 (64,67,12) 同通道；38 不在 arm 白名单 {2,4,6,12,13,14,15,18,25,67,80}，故比 49 少一次预 arm 虚调用，其余全同。
- [C] **react 24 三行画像**（gu-attackdata-all.tsv：em033_00 rows 27/36 @TSV行1785/1792，em068_00 row24 @3276）：全 `attack` 类；kb0a 均 12800 = 50.0（与 react 2 的 12800/12992 同档）；dmg 30..60；hts=1；**行内混排**：em033 两个 24 行各自夹在 react 2/3/1 序列中（…2,3,24,2,2… 与 …2,3,24,2,2…），em068 的 24 行夹在 2/12/13 序列中。命令：node 直读 gu-attackdata-all.tsv 行 1783-1794、3274-3278。
- [C] **0x2831e0 是全引擎玩家动作状态请求入口**：calls_to 0x2831e0 = 202 个直接调用点（0x28cf5c..0x12170ec）；本体 `orr [pl+9472],#1; ldr r12,[vt+760]; bx r12`（disasm 0x2831e0 x30）。
- [C] **0x2c7d20 是重置辅助**（disasm 24）：写 pl+0x2b45/46/47 三字节清零 + pl+0x2b48=0 + **pl+0x2b4c = 0x44160000（float 600.0）**；react 11/71 入口先调它。
- [C] **react 11 handler 0x2effcc**（disasm 0x2effcc/0x2f001c）：`0x2c7d20(pl,0)` → 清 pl+0x2928/2930/2938/2944/29cc 五个 u32（击退向量/状态字段）→ 方向字段链 0x3252/0x3254>0 跳过、否则 `ldrsh pl+0x3250`（≤0 时）清 `[pl+0x2964+0x3250]` → `r0=ldrh[r4]`（事件表参数 word0）→ `r1=0x14a0, r2=0` → 0x2f01cc。
- [C] **react 12 handler 0x2f004c**（disasm 0x2f004c/0x2f00d8）：同五清+同方向链（无 0x2c7d20 前置）→ `pl+0x3274` 字节测试，**=0 → `0x2831e0(pl,128,6,12)` @0x2f03ec**（r1=128, r2=6, b 0x2f01dc）；**≠0 → `r0=[pl+0x3278]`，==2 → sub-id 19，否则 16** @0x2f00d8（`b 0x2f01dc`）。
- [C] **react 71 handler 0x2f0150**（disasm 0x2f0150/0x2f01a0）：与 11 同构（0x2c7d20+五清+方向链），差异仅 `r2=7` → `0x2831e0(pl,128,7,12)`。
- [C] **收尾分流（修正）**：0x2f01cc..0x2f01e4 是**仅供 11/71 用的尾段**（它们 `b 0x2f01cc` 进入：`str 事件word0 → [pl+0x14a0+sub]` + `[pl+0x0fec]`，再 `0x2831e0(pl,128,sub,12)`）；**react 12 的三个分支全部 `b 0x2f01dc` 直接跳到调用点，跳过 0x14a0 存储**。
- [C] **0x2f4ee0 = 忙碌/特殊状态测试**（disasm 0x2f4ee0 x30）：pl+0x2749 bit6 测试 → pl+0x2830/0x2834 两个 f32>0 测试 → `0x2864c4(pl,0x101)` 与 `(pl,256)` 测试（calls_to 0x2864c4 = 984 个调用点，通用状态位测试）。**注意：其调用点 0x2f0438 不在 react 12 的路径上**（0x2f0434 `b 0x2efba4` 已跳出）；react 12 的 19/16 由 `[pl+0x3278]==2` 直接选择，不经 0x2f4ee0。

- [C] **0x2f03fc 块归属修正（吼叫空中小 remap，非本四码）**：`[pl+0x13c4]->byte[1236]`（吼叫种类字节）：==12 → 90；==15 → 89；==80 → 87；默认 87 → `uxth r2,r4; mov r3,r2; uxth r1,r8; mov r0,r9; b 0x2efba4` → **dispatcher(pl, react, 87/89/90, 87/89/90, sp(0,0))** —— 即 kb 已记的"airborne GU remap to 86-90"（吼叫被吹到空中时的 Ear_Fly 动作 id）。**与 react 11/12/24/71 无关**（byte[1236] 是吼叫域字节）。这也再次证明 state 64 的 sub id 空间含 87..90（空中吼叫反应）。
- [C] **关键谓词函数**（disasm 0x2c7d6c/0x2c7dc4，读 `[pl+0x2506]`=state id、`[pl+0x250a]`=sub id）：
  - 0x2c7d6c：state==64 && sub==**38** → 1；state==128 && sub∈{**0,1,7**}（0x183 位掩码）→ 1（tsts r0,r2,lsr r1 每位=一个 sub id）。
  - 0x2c7dc4：state==64 && sub==**38** → 1；state==128 && sub−2<18 且位掩码 0x3ed99 置位（={**2,5,6,9,10,12,13,14,15,16,19**}）→ 1。
  - → **三个谓词子集 {0,1,7} 与 {2,5,6,9,10,12,13,14,15,16,19} 恰好覆盖 react 11/71 的 (0,7) 与 react 12 的 (19,16,6)**；38（react 24 的 motion id）单独出现。命令：calls_to = 12 个调用点（0xc747c/0xc7490 引擎侧、0x2cbc14/0x2cbc24、0x29b6f4/0x29b70c、0x2ef150/0x2ef274/0x2efdd8 皆为 react 分发器族、0x2f55b0、0x11272a8）。
- [C] **wrapper 0x2efb94 本体**（disasm）：`str r1,[sp]`、`str r0,[sp+4]`、`uxth r1,r8`（r8=react id）、`bl 0x2f22e8` → 尾部 `[pl+0x13c4]->byte[1236]`==12 测试 → `b 0x2ef004`。
- [C] **react 11/12/71 宿主画像**：react 11 = 37 行（22 怪：Rathian/Rathalos/Khezu/Akantor/Deviljho/Lagiacrus/Zinogre/Gammoth 等）；react 12 = 56 行（28 怪，含 small-monster ems 档）；react 71 = 1 行（em060 青熊兽 Arzuros）。react 24 = 3 行（em033 霸龙 ×2 + em068 绞蛇龙 ×1，kb0a 全 12800=50.0，dmg 30..60）。命令：gu-react-usage.tsv 行 13/14/26/73 + node 直读 gu-attackdata-all.tsv。
- [C] **React49 阳性对照贯穿复核**：同一 wrapper 0x2efba4 行为链（0x2831e0 → 清五字段 → 0x2efba8 → 0x27bcd0 bit0 测试 → range switch → 施加）在 49（React49.md）与 24（本次）两条独立入口上都复现，方法收敛。

## In progress

（无 — 已收敛到结论节）

## 结论

### react 24（reaction_38，3 行：em033 霸龙 ×2 + em068 绞蛇龙 ×1）

**GU 侧做什么 [C]：命中通道的特殊击退反应。** handler 0x2f00e0 → wrapper 0x2efb94 → dispatcher 0x2f22e8，入参 (id1,id2)=(38,38)、[sp]=2/[sp+4]=0。dispatcher 79 项表 `0x2f2410[36]=0x150` → **默认分支（无 vtable+1848 预 arm）**——回答了派单问题：38 **不是** 0x13c；白名单 {2,4,6,12,13,14,15,18,25,67,80} 不含 38。子开关表 `0x2f2624[34]=0x1b4` 不重映射。最终 `0x2831e0(pl,64,38,12)` ×2（0x2f2868 尾跳 `b 0x2831e0` 证实），即**玩家受击动作状态 64 + 动作子 id 38，arg=12**——与 react 2（(4,5) 普通击退→Buttobi）和 react 49（(67,67) 特殊击退→ButtobiSp）同一管线，差别仅在动作 id。数据侧：3 行全 `attack`、kb0a 全 12800=50.0（与 react 2 主档 12800/15360 同级）、dmg 30..60、行内与 react 1/2/3/12/13 混排；attr 无 0x4000（非 bind 族）。

**Rise 侧映射 [B]：无对应物可静态钉死，应保持继承（留在 REACT_NO_CANDIDATE）。**
- 证据 1（家族位排查）：`snow::hit::DamageType`（Enums_Internal.hpp:81136..81179）knockback 家族 2/3/4/6/9 已被 react 1族/10+31/2+13+74/49/3+30 占用；空位仅 ButtobiNoDown=5、ButtobiNoEscape=7、Upper=8（:81142/:81144/:81145）。三者差别在"落地姿势/可否挣脱"，GU 侧对应差别在 motion 38 的动画帧——本次无 .mot 解码，无法区分。
- 证据 2（宿主不可对齐）：24 的宿主 em033 Akantor / em068 Najarala **都不在 Rise 里**（monster-slot-map.json 全 137 项无 em033/em068），React49 用过的"宿主 DamageType 重合"校准法在这两怪上无从执行——3 行样本 + 无阳性宿主 = 证据不足，不足以从继承改写。
- 证据 3（与 49 的同构反差）：49 有 134 行 + 16 宿主 + 7 宿主重合才敢给 tag=B 写入 6；24 只有 3 行 + 0 可比宿主。同一方法只能给到"家族归属"级别。
- **主会话可选**：若坚持写入 REACT 表，家族内最保守候选是 ButtobiNoDown=5（:81142；kb 50 档、非倒地终态），但这是 [U] 级猜测，不推荐。

### react 11（state_change_128_a，37 行 22 怪）

**GU 侧做什么 [C]：强制玩家特殊状态（state 128 sub 0）。** handler 0x2effcc：`0x2c7d20(pl,0)`（清 pl+0x2b45/46/47 三标志 + 0x2b48=0 + **0x2b4c=600.0f 计时**）→ 清 0x2928/2930/2938/2944/29cc 五个持续效果时长字段 → 方向链（0x3252/0x3254>0 跳过，否则清 [pl+0x2964+0x3250]）→ `r0=事件 word0` 存 `[pl+0x14a0+0]` 与 `[pl+0x0fec]` → `0x2831e0(pl,128,0,12)`。数据：37 行 dmg 20..45、kb 40 档（em061 白兔兽雪球 50@20、em062 赤甲兽 50@30、em023 金狮子 40@40 ×3、em043 恐暴龙 40@45/60、em057 雷狼龙 40@20…）。

**Rise 侧映射 [B]：无对应物，应保持继承。** state 128 是 GU 玩家"受迫状态域"：引擎谓词 0x2c7d6c 把 (128, {0,1,7})、0x2c7dc4 把 (128,{2,5,6,9,10,12,13,14,15,16,19})、0x2c7e28 把 (128,{9,10,12,13,15,16,18,19}) 当作"玩家处于特殊条件"判真（calls_to 12 处，含玩家核心 0x29b6f4 缓存到 pl+0x3324、0x2cbc14..0x2cbc44 三连测试）；0x2c6cf8/0x2c7a9c/0x2f79ec 分别施加 (128,3)/(128,14)×2。`snow::hit::DamageType`（Max=42）里没有任何成员对应"强制状态 128"；语义最近的 CatchAttack=18（:81155）已被 GU bind 族（21/22/48/56/57/60/61）占用，而 11/12/24/71 的行 **不带 bind 族标记位 attr 0x4000**（直读全表）→ 四码与拘束无关。DamageReaction 的 Stun=68/Frozen=104/RestraintSign_Kneel=57 是玩家输出枚举（React49 已证命名空间错误），且无证据钉具体值。

### react 12（state_change_128_b，56 行 28 怪）

**GU 侧做什么 [C]：同一 state 128 域，sub id 由玩家通道状态选择。** handler 0x2f004c：五清+方向链（无 0x2c7d20 前置）→ `pl+0x3274` 字节==0 → `0x2831e0(pl,128,6,12)`（0x2f03ec）；≠0 → 读 u32 `[pl+0x3278]`：==2 → (128,**19**,12)，否则 (128,**16**,12)（0x2f00d8→0x2f01dc）。三个分支都跳过 0x14a0 事件参数存储（与 11/71 的差异）。数据：56 行、kb 0..30 档（em001 雌火龙 15@15 ×3、em010 水龙 30@15 ×2、em046 海龙 30@45 ×4、em071/072 黑蚀龙/天廻龙 20@10+20@70、em083 巨兽 0@40/50、em019 大名盾蟹 10@10..30 ×5、ems009/010/011/015 四只鸟龙种小怪 14@10）。

**Rise 侧映射 [B]：无对应物，应保持继承**（同 react 11 的证据链：state 128 域、无 bind 位、无 DamageType 成员）。补充：sub 6/16/19 三态选择说明 GU 想区分"玩家当前通道状态"下的三种受迫表现，Rise DamageType 是单一值，表达不了这个区分。

### react 71（state_change_128_c，1 行：em060 青熊兽）

**GU 侧做什么 [C]：state 128 sub 7。** handler 0x2f0150 与 11 逐指令同构（0x2c7d20+五清+方向链+0x14a0[7] 存储），唯一差异 `r2=7` → `0x2831e0(pl,128,7,12)`。数据：1 行 em060 青熊兽 Arzuros kb0@20、attr 0x0000。sub 7 在谓词 {0,1,7} 集内。**注意与 react 71 的宿主 em060 = Arzuros 恰好也是 react 12 的宿主之一（0@10, 0@20）**——同一怪对玩家施加 128 域的两种 sub。

**Rise 侧映射 [B]：无对应物，应保持继承。** 1 行样本，无独立钉定可能；与 11/12 同域。

### 四码合并建议（给主会话）

- `REACT_NO_CANDIDATE = new Set([11, 12, 24, 71])`（hits.mjs:243）维持现状即可：四码的机制均不是 `snow::hit::DamageType` 语义，强行写入家族空位（5/7/8）会把 [U] 级猜测固化为数据。
- kb 建议沿用 React49 的判据：kb0a 换算 8.8 定点（÷256=px 帧单位）；11/12/24 的 kb 量与 react 1/2 同档（40/15/50 vs 2 的 50 档），71 为 0。
- `gu-rise-react-map.tsv` 的 `rise_type` 列建议改写为机制描述而非枚举名：11/71 = `state128_forced(sub 0/7)`、12 = `state128_forced(sub 6|19|16 by pl+0x3274/0x3278)`、24 = `motion38_kb_hitchannel`；tag 由 U 升 B（机制级）——是否升由主会话定，本报告不动 TSV。
- [C] **attr 0x4000 位标定（bind 族）**：react 21/22（GU 捕食/拘束族）的 attackdata 行 attr 几乎全带 **0x4000 位**（em022/em038/em050/em061/em067/em083 等），**react 11/12/24/71 全部不带 0x4000**（11: {0x0001×30, 0x0000×5, 0x0041×2}, 12: {0x0001×44, 0x0011×1, 0x0000×8, 0x0005×2, 0x0009×1}, 24: {0x0001×3}, 71: {0x0000×1}）→ 四码均非捕食/拘束型。命令：node 直读全表 attr 列。
- [C] **react 12 的 ems 宿主 = 4 只鸟龙种小怪**（蓝速龙 Velociprey / 黄速龙 Genprey / 红速龙 Ioprey / 白速龙 Giaprey，gu-small-monster-params.tsv ems009/010/011/015），kb 14、dmg 10。
- [C] **kb/校准阳性对照**：吼叫行 react 37..47 在 attackdata 里 dmg 全 0（吼叫无伤害），kb 2560(10)..12800(50) 杂散 → **GU kb 列与吼叫/状态反应无关**，仅对普通 hit 有意义；对照 react 1 (1723行, dmg 5..50, kb 2560..5120 为主) 与 react 2 (2007行, kb 10240/12800/15360 为主)。→ 24 的 kb 50 与 react 2 主档重合。
- [C] **子开关表 [2]/[3] = 0x180（吼叫段特殊分支）**：0x180→0x2f279c = 方向链清理 + r9<=4 的 5 项跳表（0x2f27d0..0x2f27e0）——只对 r6∈{6..10}（吼叫族 id 段）做额外清理；[12]/[13]/[14]/[15] = 0x1b4 默认（read_words 0x2f25a4/0x2f25c4）。react 24/49 的 r6=38/67 不受影响。
- [C] **state-128 施加者全图**（自扫 bl 0x2831e0 = 202 处，其中 mov r1,#128 前置 = 14 处）：0x2c6cf8 = `(128,3,0)`（guard: pl+0x2b45!=0 才施放 —— **0x2b45/46/47 正是 0x2c7d20 清的三字节**，即 state-128 域由这组标志门控）；0x2c7a9c = `(128,14,0)`、0x2f79ec = `(128,14,12)`；0x1201618/0x1201a0c/0x1201da8/0x1202098/0x12022ac/0x120273c = 0x120 段 6 处（r6==0 时 sub 1 否则 sub 8 等，bl 0x27bcd0 门）。
- [C] **pl+0x2b45..0x2b4c 簇**（movw 字节扫描全 19/4/4/9/19 处）：0x2b45 写入者集中 0x2c67a0..0x2c7fc0（本簇）+ 0x120187c..0x12026f0（0x120 段，state-128 远端施加者同簇）+ 0x622b28；0x2b4c = f32 计时器（600.0 初始；0x257c5c/0x2583f0/0x258908/0x25c524/0x299bdc 亦读）；0x299b40 起 = 玩家全状态重置函数（一气清 0x3260..0x3288 含 0x3274/0x3278、0x2b48..0x2b54、0x31d4..）。

## Unknown

- react 24 的 motion 38 具体动画帧（.mot/bhvt 侧，超出本派单）；因此 ButtobiNoDown(5)/ButtobiNoEscape(7)/Upper(8) 三者中哪一个是"机制等价"无法静态区分。
- state 128 各 sub id 的玩法名（0=？1=？3=？14=？）：引擎只给谓词与施加点，没有符号名；要钉"stun/麻/雪人/冰冻"具体谁是谁需要实机或动画侧证据。
- 0x2b45/46/47 三标志的完整生命周期（0x120 段 6 处施加者的条件分支细节）。

## Self-FalsificationCheck

- **证伪尝试 1（38 是否 0x13c 白名单成员）**：派单明确要求先读表项。实测 0x2f2410 = 0x150（默认分支），且同一读出窗口里 id1=67=0x13c、id1=79=0x13c 作阳性对照——假设"38 也走 arm 分支"被字节否定。
- **证伪尝试 2（24 = LanceCounter_M 类守护反应）**：若 24 是守护类，它不该走 0x2efb94 命中 wrapper 与 kb 50 档数据。实测 3 行全 attack 类、kb 50 与 react 2 同档、行内混排在 1/2/3/12/13 之间——守护假设被数据否定。
- **证伪尝试 3（state 128 = 抓取/bind）**：若 128 域是 bind，其 react 行应带 bind 族 0x4000 位（react 21/22 全带）。实测 11/12/24/71 四码 0 行带 0x4000——bind 假设被数据否定；且语义最近的 CatchAttack=18 已被 GU bind 族占用。
- **证伪尝试 4（12 号 19/16 由 0x2f4ee0 选出）**：初读 0x2f0438 调 0x2f4ee0 曾误归因；calls_to 复核显示 0x2f0434 `b 0x2efba4` 已跳出该路径，19/16 由 `[pl+0x3278]==2` 直接选出。已按修正记录（工具输出不一致 → 以交叉证据为准）。
- 未能证伪的结论：四码均无 `snow::hit::DamageType` 对应物、应保持继承（REACT_NO_CANDIDATE 维持）。

## Difficulties

- **自扫 BL 基准错误**：第一次 bl 0x2831e0 扫描把 PC 基准写成 flat+8（应为 vaddr=flat−0x100 后 +8），得 0 命中；正确基准复扫 = 202 处，与 calls_to 一致——工具计数和自写扫描必须互相校验。
- **报告多次改写导致的行错位**：增量写入时把"吼叫空中 remap"（0x2f03fc，非本四码）一度归到 24/49 的 sp 值说明里；后经 disasm 0x2f03fc 修正为吼叫域（byte[1236] 是吼叫种类字节）。教训：跨函数共享地址段（0x2f03ec..0x2f0434 是 react12 分支与吼叫 remap 的公共尾）必须按跳转目标归属，不按物理邻接归属。
- **谓词子集的诱惑**：{0,1,7}/{2,5,6,9,10,12,13,14,15,16,19} 与 react 11/71/12 的 sub id 惊人吻合，但谓词是引擎侧"玩家是否处于受迫态"的判定，不是"这些 sub 是什么"的命名——只可用于域归属，不可用于 Rise 枚举映射。
- **对子档案局限**：atk-compare-em001-em002.tsv 对 11/12 行全是 "gu-only / no pairing rule fired"（em001/em002 的 Rise 宿主无 damage 15 同值行），宿主校准法在这四码上没有数据支点。

## 命令与产物索引

| 结论 | 证据 |
|---|---|
| 24 表项/白名单 | read_words 0x2f2410 x24（id1=34..57），0x2f2624 x24（r6=32..55）；disasm 0x2f00e0 x30（含 49 孪生段） |
| dispatcher 收尾 | disasm 0x2f2868 x24（尾跳 b 0x2831e0；0x2f2874 = 风压门阳性对照） |
| wrapper | disasm 0x2efb94 x14 |
| 11/71 handler | disasm 0x2effcc/0x2f001c/0x2f0150/0x2f01a0/0x2f003c |
| 12 handler 三分支 | disasm 0x2f004c/0x2f00d8/0x2f03ec |
| 吼叫 remap（非本四码） | disasm 0x2f03fc |
| 0x2831e0 本体/调用点 | disasm 0x2831e0 x30；calls_to = 202；自扫 bl（vaddr=flat−0x100 基准）= 202，state-128 前置 14 处 |
| 0x2c7d20 重置辅助 | disasm 0x2c7d20 x24 |
| 谓词函数 | disasm 0x2c7d6c/0x2c7dc4/0x2c7e28/0x2c7e6c/0x2c7e9c；calls_to 12 处 |
| 谓词调用上下文 | disasm 0x29b6d8（缓存 pl+0x3324）、0x2cbc00（三连测试+0x3000f4）、0xc7450（引擎跳表 4 路）、0x28b130（0x2c7e28+0x3274 门） |
| state-128 施加者 | disasm 0x2c6cd0（(128,3,0)+0x2b45 门）、0x2c7a70（(128,14,0)）、0x2f79d0（(128,14,12)）、0x12015f0（sub 1/8） |
| 0x2b45 簇扫描 | movw #0x2b45/46/47/4c/48 全像扫描（main.140.flat.bin，node 一行流） |
| 0x3274/0x3278 写入者 | movw 扫描 14/7 处；disasm 0x299b40（全状态重置） |
| bind 失败路径 | disasm 0x2f47cc x64（(0,19) 是 dispatcher id 对，与 state 128 无关） |
| kb/attr/宿主画像 | node 直读 gu-attackdata-all.tsv（6043 行）四码全行 + react 37..47/1/2/21/22 校准；gu-react-usage.tsv:13/14/26/73；gu-small-monster-params.tsv（ems009/010/011/015） |
| 枚举锚点 | Enums_Internal.hpp:81136..81179（DamageType 全表）；:173076..173184（DamageReaction 全表，Stun=68/Frozen=104） |
| 移植端现状 | hits.mjs:219-243（REACT 表 + REACT_NO_CANDIDATE=[11,12,24,71]） |
| 怪名 | monster-slot-map.json（em033 Akantor / em068 Najarala / em060 Arzuros 等） |
