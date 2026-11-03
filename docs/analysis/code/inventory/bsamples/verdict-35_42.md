# Tier B 块纯度裁定 — 块 35..42（96 函数）

输入：`bsamples/s35.txt`…`s42.txt`（每块 12 个抽样函数，共 96）。逐行裁定写入 `verdict-35_35.tsv` … `verdict-42_42.tsv`（列 `block/start/label/verdict/evidence`，label 取抽样文件里的当前 B 标签）。

判据（不看当前标签、不看地址本身）：
1. 函数体内**自身**引用的字符串（`ldr [pc,#imm]` → 直接指针 或 `add rD,pc,rX` 的 delta；含条件码 `addeq` 与跨指令寄存器跟踪，比 `stringxref.tsv` 多覆盖条件 add 一类）；
2. 函数体内安装/使用的 **vtable**（`ldr [pc,#imm]`+`ldr [pc,rX]` → 槽内容 → vtable 基址）与 `.data` 中 vtable 成员的归属；
3. 被调者/调用者的**类**（`attr-vtable-retile.tsv` 的 registrar 行、`attr-library/xref/strings` 的字符串证据）；
4. 结构指纹：`movw #off` 取字段后配 `ldrb/ldrh` 门控、`blx [vtable+k]`、固定 motion id 等。

## 每块计数

| 块 | 抽样 | confirm | relabel | unknown | 主要改标 |
|---|---:|---:|---:|---:|---|
| 35 | 12 | 0 | 7 | 5 | kernel-os 4（MtProperty/cMetaSet 属性系统）、physics-math 2（uGeometry2GroupCollider、cDynamicBVHCollision）、render-gfx 1（cPrimBufferManager） |
| 36 | 12 | 2 | 6 | 4 | online-nex 2、render-gfx 2、physics-math 2 |
| 37 | 12 | 2 | 5 | 5 | monster-em 5（vtable 成员 / uEm 字段 0xb5f5 / 0x1428 状态机） |
| 38 | 12 | 0 | 1 | 11 | otomo-ot 1（+0x3ac4 子对象） |
| 39 | 12 | 0 | 0 | 12 | — |
| 40 | 12 | 1 | 0 | 11 | — |
| 41 | 12 | 9 | 2 | 1 | render-gfx 1（nNX::ShaderBinary）、physics-math 1（MtGeom vtable） |
| 42 | 12 | 3 | 0 | 9 | — |

合计：confirm 17、relabel 21、unknown 58（可定 59/96）。unknown 集中在 38-40 与 42 的导入 thunk 上。

## 三个例子

1. **0xc7d0e0（块 35，原 render-gfx → relabel:kernel-os）**：函数体先 `ldr [r6,#24]` 判属性表，`bl 0x7bb3ec` / `blx [vtable+16]` / `bl 0x7bba44`（按名字查找）/ `bl 0x7b9410` / `bl 0x7bb7b8` —— 五个 callee 全是 MtPropertyList 的方法（0x7bb230 = MtPropertyList 注册器，0x7bb7b8 = vtable 0x177e9a0 slot 0），最后按 `[r6,#16]+idx*16` 取 4×float 默认值。`attr-library.tsv:0x7bb230` 已把 MtPropertyList 记为 kernel-os（LIBFINGERPRINT「其余 Mt* → kernel-os」），故不是渲染。

2. **0xd10e14（块 37，monster-em → confirm）**：该地址出现在 vtable 0x179c6b0（段基 0x179c690），同表其余槽 0x4a1e08/0x43b51c/0x3face4/0x3fa3a4 全是 0x3f/0x43/0x4a 的 EM 基类簇（与已判 monster-em 的 0x409a60 构造器同一 0x4a1b6c/0x43b7e0 簇）；本体 567 条依次调 0x4a1b6c/0x43b870/0x4a1ba4/0x4a1b50/0x3faf28/0x48c4f0/0x3f95dc。

3. **0x11e3d24（块 40，monster-em → confirm）**：唯一 callee 0x2709e0 自身的字符串是 "angryprm"，函数体是 `[r2,#100]` 计数 / `[r2,#108]` 数组、24 字节步长的记录取值器 ∈ rAngryParam（0x270608/0x270a88 段）；本函数用 `[this+0x332c]`、`[this+0x13c4]` 取表与索引 `ldrb [x,#581]`，返回 `ldrb [rec,#20]` —— 读的是敌人的愤怒参数记录。

## 横切发现（对 38-40 的解释）

块 38-40 的 36 个抽样全部落在 **0x1120000-0x121xxxx** 这一段，当前标签为 monster-em/otomo-ot/quest/online-nex 混杂。证据显示这不是怪物模块，而是**所有角色类型共享的 actor/动作层**：

- `movw #0x3328` 取的内嵌子对象由 uOtomo 构造 0x2691d4 安装（`str vtable,[r4+0x3328]`，vtable 来自 GOT 0x15d2fe0），其尺寸上界来自 uOtomo create 0x268c98 的 `movw r1,#0x3e50`；
- 同一 +0x3328 字段的 530 个使用者分布：本段 403、uPlayerQuest00-04（0x2b3314…，串 `roPlayerQuestNN.cro`）34、nFestaNetwork::netOtAction/netOtActTargetPos/netOtPosition 6；怪物移动函数（0xcf-0x111）一个都不用；
- 该段 API（0x1132e58 145 个调用者、0x112effc 95、0x113496c 56、0x115d4d0 59）的调用者 100% 在 0x113-0x115 段内 —— 是自洽的封闭层；
- 外部调用者同时来自怪物侧（0x452178、0xd1c884、0xf9fdb8）、玩家侧（0x277a1c、0x278460）与网络侧（0x1f7af8 = netOtAction）；段内函数 0x11e3d24 直接读 rAngryParam（怪物愤怒参数），说明怪物也向这一层喂数据。

因此这一段内部函数的 monster-em/otomo-ot/quest 票都是传播产物：能定位到具体角色族的只有 `+0x3ac4` 子对象（69 个使用者 = 本段 + uOtomo 构造 + netOtAction，uPlayerQuest 不用），据此把 0x11332a8 改判 otomo-ot；其余按 unknown 处理。文档里对这一段的既有裁定（"votes monster-em:22 vs render-gfx:15" 等）没有一个引用了独立证据，与本次逐函数结果一致。

## 其它可复用的判据（本次用到）

- **动态导入 thunk**：`add r12,pc,#0x400000; add r12,r12,#0x47000; ldr pc,[r12,#off]!`（0x13efda0、0x13f004c…）目标槽在 0x17fxxxx 导入表内且未重定位，静态不可解；块 42 的 8 个 3 条指令函数、块 39/40 的若干 54 条静态默认块初始化（`bl 0x13efda0` + pc 相对写 .bss 默认块：1.0f/0x80000000/0x100000/0x10f000/127/255…/0xffff/索引表）都属此类，一律 unknown。
- **uEm 字段族**：`movw #0x1428` 取 act 对象后 `ldrb [x,#0x1a1]` 状态 0/1/其它，配 motion API（0xbc8b0/0xaff40/0x7df94/0xb0a24/0xb0a84）= 怪物动作代码（与字符串已证的 em001_00FwMove 0xcf1688 同形，可直接用作同类函数的判据）；`movw #0xb5f5` 的字节是按 4 选动作 id 的开关。
- **库区规则**：Pia/Nex/libcurl 段（0x1311000..0x13AB000 以及 0x13cxxxx-0x13dxxxx）内邻域每一行都有库字符串种子，函数自身无相反证据时按 online-nex（本片 41/42 共 12 个 confirm 依赖此规则，均同时给出了库字符串或类名）。
