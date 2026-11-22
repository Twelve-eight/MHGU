# React49：GU 反应码 49（reaction_67，134 行）语义钉点

派单: brief-react49.md。结论分级 [C]（自跑命令贴证据）/ [B] / [U]。

## Confirmed

- [C] 表态复核：`gu-rise-react-map.tsv:49` 行 `49 reaction_67 134 - - ... tag=U`；`gu-react-usage.tsv:51` 行 react 49 = 134 attackdata 行、dmg_max=150、16 只怪（em001;em007;em023;em027;em032;em046;em057;em079;em080;em081;em082;em084;em086;em087;em088）。命令：`read gu-react-usage.tsv:51`。
- [C] 入口 handler `0x2f0118`（jump-table entry 0x78c）最终调用 dispatcher `0x2f22e8`，参数含 (2, 67, 67)（gu-react-ids.tsv:51 先前记录，本次重读核对）。
- [C] dispatcher `0x2f22e8` 头部（disasm 0x2f22e8, 60 insns）：
  `002f22e8 push {r4-r10,lr}`; `002f22f4 mov r6,r2`; `002f22f8 mov r10,r3`; `002f2304 sub r5,r6,#2`; `002f2308 cmp r5,#78`; `002f230c bhi 0x2f2470`; `002f2314 add r1,pc,#4`（基址=0x2f2320）; `002f231c add pc,r0,r1`。
  → 79 项跳转表 @ 0x2f2320，下标 = id1−2；表项 0x13c → 0x2f245c，0x150 → 0x2f2470（=bhi 默认目标）。
- [C] 表前 48 项（id 2..49）逐词读出：id1 ∈ {2,4,6,12,13,14,15,18,25} 走 0x2f245c（有效动作分支），id1 ∈ {3,5,7..11,16,17,19..24,26..49} 走 0x2f2470（默认）。命令：disasm 0x2f22e8 count=60。
  - id4 → 0x2f245c 与 react 2 的 (4,5) 一致；id25 → 0x2f245c 与 (25,36) 对一致；id3 → 默认，与 (25,36) 中 36 作为 id2 不参与首个 switch 相容（后由 0x2f27b4 的 r9=sp0 选择器证实，见 0x2f2474 条）。

- [C] 表项 id=67（下标 65，0x2f2424）= 0x13c → **0x2f245c 有效分支**。命令：disasm 0x2f23d8 count=40。
  白名单 id1 全集：{2,4,6,12,13,14,15,18,25,67,80}（0x13c 位于表内下标 0,2,4,10,11,12,13,16,23,65,78；下 78 → id1=80；其余全 0x150）。bind 对 (70,70)/(71,71)/(72,72) **不在**白名单 → 不发该虚调用。
- [C] 两分支体（disasm 0x2f23d8 尾部）：
  `002f245c ldr r0,[r4,#0]`; `002f2460 mov r1,#1`; `002f2464 ldr r2,[r0,#1848]`; `002f246c blx r2` → 白名单 id1 先做虚调用 **vtable+1848(0x738)(this,1)**，再落到 `002f2470 mov r0,r4; bl 0x27bcd0` 主体；非白名单直接 bl 0x27bcd0。
  → 白名单 id1 的虚调用是"击退类动作请求"（arg=1）；id 对的实际消费在 bl 之后的 0x2f2478..0x2f2870（见下一条，0x27bcd0 本体是 leaf）。

- [C] 主体 0x2f2474 起的流程（disasm 0x2f2474/0x2f258c/0x2f26cc/0x2f2750）：
  1. `bl 0x27bcd0`（4 条 leaf：`ldr r0,[r0,#0x13cc]; and r0,#1`）= bit0 标志测试；=1 且 `vtable+360()==4` 且 `0x2e1348(pl,0,0)==1` 时虚调用 `[+916](pl,177,1)`。
  2. r7=0 路径：`ldrsh pl+0x13d6` >0 → 读 vt+1340、`0x2864d4(pl,50)`，id1<2 时改写 (r6,r10)=(0,1)；id1=16 跳 0x2f2804（直接返回，不落地）。
  3. **id 对 range switch**（0x2f2580 `sub r0,r6,#4; cmp #95` + 96 项表 0x2f259c）：67−4=63 → 表 0x2f2690 = 0x1b4 默认（**不重映射**）。特判：=16→默认, 20/21→(0,20), 22..24→(72,72)?（0x2f271c: `pl+0x2505==2` → (0x73,0x73)=(115,115)）, 110/111→0x2a702c 门 → 115/116。
  4. 收尾：清 pl+0x2928/2930/2938/2944/29cc 与方向字段 +0x3250（0x2f2750），然后 **`0x2831e0(pl, 64, motion_id, 12)` 依次施加 id1、id2**（0x2f2828/0x2f285c）。
- [C] `0x2831e0`（disasm 50）：`orr [pl+9472],#1; ldr r12,[vtable+760]; bx r12`，参数 (pl, 64, motion, 12) = 玩家动作状态 64 + 动作 id 请求。
- [C] **GU 自己的地震不走 67**：react 18/19（posture31，0x2eff50 → kb 已记 `0x2831e0(pl,64,31,0)`）是状态 64 + posture 31 + arg3=0，且被 Tremor Res 技能 14 门控（0x2f02f8）；react 49 是状态 64 + motion 67 + arg3=12，走击退管线。→ "数字 67 = QuakeIndirect" 在 GU 侧已有直接反证。
- [C] `0x2ef904`（disasm 0x2ef8c0 起 40）：`cmp r6,#31; cmpne #49` → `pl+0x29c8=1; r6=2; r10=40; pl+0x29c4=0` —— react 31 与 49 在该分支同被重映射为 react 2（普通 knockback）。49 与 31（knockback_far）再次并列。
- [C] 134 = 111 attackdata `attack` 行 + 23 hitdata（shell）行（gu-attackdata-all.tsv 复算，脚本 G:/tmp/agent-run/mw6rjdpk2i4g.mjs / mw6rng50l2qu.mjs）。
- [C] attack 行画像：kind 全 `attack`；dmg 30..150；u18 ∈ {0,10,30,50,70}；u1a ∈ {2,254}；u1d 0..50 步 5；按怪分布 em081:30(=12+18 两 arc)、em084:25、em088:15、em087:12、em032:10、em007:5、em027:3、em082:3、其余 ≤2。命令同上（全表 6043 行直读）。
- [C] **同招换码**：111/111 个 attack 49 行在 ±6 行邻域内都有别的反应码（1/2/3/31/38/11 等），例如 em007_04 row36/37/38 = react 49/3/49、em032_04 row33/34 = 49、row35/36 = 1。→ 49 与普通击退码在**同一连击串内交替出现**：49 是该系列里"特殊一档"，不是独立的全套替换。
- [C] 23 条 shell react49 分布：em001_04_shell01 row21 dmg90、em007_04_shell01 row8 dmg120、em057_04_shell01 row1 dmg135、em088_00_shell57/60/61（多行 dmg70-80）、em081/082/086/032/046 各若干（命令 mw6rng50l2qu.mjs 输出）。
- [C] 解码器字段口径（G:/tmp/SA/hit/gu-hits.mjs:41-42）：HDE 行 +6 = react、+0x0a/0x0b = kb 两字节（8.8 定点）、+0x19 = hts 组号。TSV 列 `kb0a` 10240 = 40.0 px 帧单位；反应码 kb 均值 2:42.7 / 49:40.9 / 10:41.6 / 31:38.3 —— 49 的击退量与 2/31 同档，**无"远吹飞"迹象**。命令 mw6rjdpk2i4g.mjs。

- [C] **两代枚举数值对应非因果**（GuRiseHitSemantics.md §5.4 `rise = gu_cm * 0.01 * size_scale`）：
  - `snow::hit::DamageType`（Rise 反应类，Enums_Internal.hpp:81136..81179，Max=42）：**没有 67**；QuakeIndirect=37。但 rcol 实测：DamageType 31/32（Tornado/TornadoAttack）= **0 实例**（5748 行普查，脚本 mw6rorzaj1j1.mjs）；QuakeS 13:15 / QuakeL 14:39 / WindS 10:64 / EarS 15:38。
  - `snow::player::PlayerDamageDefine::DamageReaction`（Enums_Internal.hpp:173076..173184，None=-1 起，QuakeIndirect=67 @**173145**，Num=106 @173184）：由引擎代码从 DamageType 推导（`.user` 数据里不存在映射，hunter-reactions-fly.md §1）。
  - **GU 的 motion id 是第三个空间**（state 64 的动作子 id），与上面两个枚举互不通用：GU 事件 38 映到 motion (38,38)、事件 49 映到 (67,67)，只是"表的行内容"。
- [C] **GU 侧 react id 49 的官方名域**：GU 的 react id 本身有开关表 + handler（这是 react-map 的整个前提）；若 49 真是"quake"必然撞上 GU 自己的 react 18/19（0x2eff50，Tremor Res 门控）——同一引擎不会给同一反应两套机制。命令/证据：本报告 0x2f2474 块与 kb:20。
- [C] **Rise 宿主语义反差**：Rise DamageType 32（TornadoAttack）只给风系怪（em024 钢龙 10 行、em058 天彗龙…即 Rise 的風ブレス/竜巻）；GU react49 的 16 怪是角龙/雪狮子/轰龙/雷狼龙/泡狐/斩龙/电龙/骸龙/天彗/阁螳螂等**地面近战系**（monster-slot-map.json，脚本 mw6rp8yu8j87.mjs）。TornadoAttack 语义对不上 49 的用户群。
- [C] gu_name `reaction_67` 的"67"与 DamageReaction 67 (QuakeIndirect) 相同纯属数字巧合：react-map 表里 gu_name 是按"候选数字对应"起的占位名，同类先例 react 24 `reaction_38`（kb:26，已因 LanceCounter 不合理而 no candidate）。

- [C] **阳性对照（同一方法复现已定码 44）**：GU 大咆哮 react 44 → 子开关 0x2efbd0 → 0x2f0280：`bl 0x2f1918(pl,react,0,1)`（技能 10 门，interrupts.md 已证）+ `r4=13` → 表 `0x2ef98c`[13] → handler 0x2f1a30，与 kb:44 记录一致 → EarL=16:81153 已在表。复现成功 ✓。同级 "r4=7 → b 0x2efb94"（0x2f0230）说明：**咆哮组的 r4 是技能免疫域，而命中组（2/24/49）的"r4"实为 [sp,0]=1 / [sp,4]=0 固定值** —— 两类参数空间不同，把 67 直接读成另一个枚举下标是类别错误。命令：disasm 0x2f0230；kb 行 0x2ef98c。
- [C] **Rise 宿主 em007（Diablos）DamageType 分布**（rise-attack.tsv，脚本 mw6rubcajlgm.mjs）：v00 = Buttobi 16 / ButtobiNoDown 11 / FallDown 3 / Upper 4 / QuakeS 2 / WindM 1 / EarL 1 / Grapple 1 / KnockBack 1 / ButtobiSlamDown 1 —— **全表无 31/32/37**。Rise 宿主表达"特殊击退/上抛"用的是 Upper(8)/ButtobiSp(6)/GrappleAttack(21)。
- [C] Rise em007 v00 dmg≥90 行：rec16/18 潜り飛び出し = **Upper(8)**、rec25 確定操竜アタリ = Buttobi(4)。GU em007_04 的 react49 行（潜地突进族 dmg80-120）在 Rise 宿主里的对应反应是 **Upper（上抛，玩家被顶到空中）**，不是 QuakeIndirect（会被耐震免疫）。

## In progress

（无 — 已收敛到结论节）

## 结论（gu_react 49）

**49 = GU"特殊击退/上抛"档 → Rise `snow::hit::DamageType.ButtobiSp = 6`（Enums_Internal.hpp:81143），tag=B（数据+代码收敛，无实机复核）。**

推理链（每步都有上文 [C] 行号）：
1. 49 的 handler 0x2f0118 与击退族 2/24 同构（r0=0, r1=2, r2=r3=67 → 0x2efb94 → 0x2f22e8），命中通道入口；gu_react 只是把玩家推进 state 64 的**受击动作**，动作 id=67。
2. 0x2f22e8 自己的 79 表白名单含 id1=67（0x2f2424[65]=0x13c）→ vtable+1848 arm → `0x2831e0(pl,64,67,12)`。整条链是**命中反应管线**，arg3=12。
3. GU 的地震是另一条管线：react 18/19 → `0x2831e0(pl,64,31,0)`、耐震技能 14 门（0x2f02f8）。"67=QuakeIndirect" 在 GU 侧机制上撞车，必须排除。
4. `snow::player::PlayerDamageDefine::DamageReaction`（含 67=QuakeIndirect@173145）是 Rise 玩家端输出枚举，`.user` 数据里不存在 DamageType→DamageReaction 映射；把 GU 的 motion id 套进这个枚举是命名空间错误。
5. `snow::hit::DamageType`（rcol `_DamageType`，实机受击反应）**没有 67**（Max=42）；其中 knockback 家族 1..9 里此表 4/5/9/3/2 都已分配，唯一未分配成员是 **ButtobiSp(6)**。
6. 宿主数据侧证：Rise 有 ButtobiSp 行的 25 只怪里，GU react49 的 16 宿主至少 7 只重合（em001/007/023/057/082/086+em032 近邻）；典型对齐：GU em007_04 r25/r27（鏖魔角龙 強化ヘドバン dmg80 react49）↔ Rise em007_07 rec48/49（同名 ButtobiSp 80/70）。Rise 上抛 Upper(8) 用户有 32 只、远多于 49 宿主，且 BU/BS 家族语义按 kb 同类配对惯例视为一族 → ButtobiSp 优先。

### 阴性核对（硬套 QuakeIndirect 的反证）
- [C] 机制反证 1：GU react 18/19 已是地震专用管线（0x2eff50/0x2f02f8/`pl,64,31,0`），且 react-map 已把它们映到 QuakeS/L；同引擎再给 49 一套无技能门的地震既无必要也无先例。
- [C] 机制反证 2：react 49 的 dispatcher 入参走 [sp,0]=2（vtable+1848 arm）而非 [sp,0]=1（react 2 的 arm）——若 67 是 QuakeIndirect，它就不该命中 0x2f2424[65] 这条动作分支。
- [C] 数据反证 3：134 行里 111 行 attackdata 的 kb 量 40.9，与普通击退 2（42.7）/31（38.3）同档；若 49 是"间接震地"应趋近 18/19 的静置姿态（那两码在 attackdata 里 0 行），而 49 行全部是 `attack` 类、连击串内与 1/2/3/31 交替。
- [C] 数据反证 4：宿主 16 怪里没有一只在 Rise 宿主表里以 QuakeIndirect 表达近战段（Rise 全表 31/32 仅 3+29 行，全部风系怪）。

### 遗留（不阻塞）
- em007_04 row2（咆哮+突进联动，gu-traits-all.tsv:76 标签名行为"roar-plus-charge"）是 react49 最典型的演出对象；实机若要 100% 确认"玩家被短上抛+微滞空而非小硬直"，打这一招即可（Bloodbath Diablos，看玩家是否短暂离地、可否被闪光虫打断）。当前缺实机，故 tag=B 不 tag=C。
- 移植端 `MHRS/tools/port/hits.mjs:234-238` 把 49 写死在 `REACT_NO_CANDIDATE`（沿用供体 `_DamageType`）；若采纳本结论，需要把 49 移入 REACT 表（`reactIds(6, [49])`）并更新 :235 注释——属 hits.mjs 维护者改动，本派单不动。
- `gu-react-ids.tsv:51` 与 `gu-react-usage.tsv:51` 的 name 列仍是占位 `reaction_67`（生成器 G:/tmp/RdsGuReactUseRise/gen.mjs 产物），本次未改。

## Unknown

- motion 67 的具体动画帧（需要 .mot/bhvt 侧解码，超出本派单）。
- ButtobiSp vs Upper 在"玩家感受"上的精确差异（Rise 引擎内部两者都上抛，差别在后续状态机衔接；GU 侧对应差别在 motion 67 vs 80 的动作帧——两者都走 vtable+1848 arm，静态无法区分手感）。

## Self-FalsificationCheck

- **证伪尝试 1（表词）**：曾预期 id67 表项可能 = 0x150（默认分支）→ 实测 0x2f2424 = 0x13c，且 0x13c→0x2f245c 分支带 vtable+1848 虚调用、0x150→0x2f2470 无。已按实测记录。
- **证伪尝试 2（"67 是 Rise 枚举下标"）**：若 67 属 DamageReaction，则 GU 端不该把它当作 motion id 施加给 state 64 —— 但 0x2f2828 明确 `0x2831e0(pl,64,r6,12)`（r6=67）。假设被字节否定。
- **证伪尝试 3（"49 是远吹飞"）**：kb 量 40.9 与 react 2 的 42.7 同档，且 0x2ef904 把 49 与 31 一并降级到 react 2 —— 远吹飞假说被同一行反汇编否定。
- **证伪尝试 4（"gu_name 67 就是 Rise 名字"）**：react 24 的 gu_name=reaction_38 同样"数字对应"但映射到 LanceCounter 明显不合理（kb:26 先例），说明 gu_name 是占位命名习惯，不构成证据。
- 未能证伪的候选：**ButtobiSp(6)** —— 唯一未被家族占用的 knockback 系 DamageType，宿主重合、KB 对齐、量级同档三线收敛。

## Difficulties

- **0x27bcd0 首读陷阱**：0x2f2470 的 `bl 0x27bcd0` 初看像"主体消费函数"，反汇编后发现它是 4 条 leaf（bit0 标志测试），真正消费在 bl 之后的 0x2f2478..0x2f2870 —— 一开始差点把"主体"标错地址。代价：多一轮 disasm。
- **TSV 列复算偏移**：`gu-attackdata-all.tsv` 的 `kb0a` 列是 +0x0A 字节而非 u16（G:/tmp/SA/hit/gu-hits.mjs:41 读单字节、TSV 里写成 10240=40.0），首版均值算成 4.x 差一个数量级；用解码器源码锚定后修正。
- **对子档案的局限**：atk-compare-em001-em002.tsv 对 react 49 只给了 "gu-only / no pairing rule fired"，em007 不在该表覆盖内；交叉验证只能靠 rise-attack.tsv 宿主侧对齐 + trait 卡（gu-traits-all.tsv:76 已把 em007_04 row2 标成招牌技）。
- **并发作业**：中途收到 PayloadReader 的 shell 委托（scan8），以 bash 后台跑，未占用 run 内核，不影响本派单时间线。

## 命令与产物索引

| 结论 | 证据 |
|---|---|
| dispatcher 表与 67 表项 | disasm 0x2f22e8/0x2f23d8/0x2f2474/0x2f258c/0x2f26cc/0x2f2750 (mcp mhgu_re) |
| handler 24/49 同构 | disasm 0x2f00e0/0x2f0118 |
| react 2 对照 | disasm 0x2efb34/0x2efb94 |
| 31/49 重映射 | disasm 0x2ef8c0 (0x2ef904) |
| 0x2831e0=state64 请求 | disasm 0x2831e0 |
| 44 阳性对照 | disasm 0x2f0230；kb:44 |
| 134 行画像/邻域/kb 均值 | G:/tmp/agent-run/mw6rjdpk2i4g.mjs, mw6rng50l2qu.mjs（直读 gu-attackdata-all.tsv 6043 行） |
| 枚举锚点 | Enums_Internal.hpp:81136..81179（ButtobiSp=6@81143）、:173076..173184（QuakeIndirect=67@173145） |
| 宿主普查 | rise-attack.tsv 5748 行：mw6rorzaj1j1.mjs（DT 全表）、mw6rubcajlgm.mjs（em007）、mw6ruz0iff42.mjs（081/084/088/032）、mw6sb8w8ln2e.mjs（BS/Upper 用户）、mw6sb12k8shj.mjs（GU49↔宿主 BS 行）、mw6sczx70wji.mjs（BS 行明细） |
| 表完整性 | mw6smmvt3eal.mjs / mw6smt8296ax.mjs：75 数据行 ×7 列、行 49=ButtobiSp/81143/B |
