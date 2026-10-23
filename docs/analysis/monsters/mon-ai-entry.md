# 怪物 AI / 状态机 / 参数表 —— 代码入口清单

范围：`main.140.flat.bin`（`flat_off = vaddr + 0x100`，`.text = 0x100..0x13F1DEC`，镜像止于 `0x184ad78`）。只读逆向。
本报告只求**可靠入口清单**（入口 vaddr → 职责 → 证据 → 置信度），不展开完整状态机。

复现命令（全部只读）：
```
node .tmp/mhgu/mon/ai-entry.mjs  > .tmp/mhgu/mon/ai-entry.out.txt  2>&1   # 符号定位 + 字面量 xref + RTTI vtable
node .tmp/mhgu/mon/ai-entry2.mjs > .tmp/mhgu/mon/ai-entry2.out.txt 2>&1   # movw/movt + 数据 run + 单例
node .tmp/mhgu/mon/ai-entry4.mjs > .tmp/mhgu/mon/ai-entry4.out.txt 2>&1   # pc 相对 xref 重建（关键）
node .tmp/mhgu/mon/ai-entry5.mjs > .tmp/mhgu/mon/ai-entry5.out.txt 2>&1   # 动作派发器 state→动作名
node .tmp/mhgu/mon/ai-entry6.mjs > .tmp/mhgu/mon/ai-entry6.out.txt 2>&1   # 派发器 → 动作表/注册函数
```

---

## 0. 方法学结论（决定后续所有检索方式）

**本二进制的字符串引用不走绝对指针、不走 literal pool，而是 pc 相对增量：**

```asm
ldr r0, [pc, #0x60]   ; 字面量 = 0x01509a56  ← 这是"增量"，不是地址
add r1, pc, r0        ; r1 = (本指令+8) + 0x1509a56 = 0x15526BE = "cEmSizeCalcTblElement"
bl  0x7aedcc          ; 以名查表
```

- 公式：`target = site + 8 + bias`。
- 增量既可来自 literal pool（`ldr rX,[pc,#imm]`），也可来自 `movw/movt` 对。
- **因此 pass1/pass2 的"绝对指针/literal 值"扫描必然全 0**，不能据此判定"死串"。pass4 同时支持两种增量来源后，怪物串引用立刻出现（360 个串 / 319 个函数）。
- 另有 `ldr r4,[pc,r0]`（GOT 形，寄存器偏移取 pc）：GOT 槽内的指针带 `+0x100000` 基址偏移，属同一套机制。

⇒ **今后定位本 binary 的任何符号引用，必须用 `add rD, pc, rM` + 增量重建**（`ai-entry4.mjs` 的 `resolvePcAdd`），否则会得到假阴性。

---

## 1. 入口清单（主表）

| # | 入口 vaddr | 推测职责 | 证据 | 置信度 |
|---|---|---|---|---|
| E1 | **`0x15004c`** | **怪物类名注册表初始化**（360 槽）：把 `cSetEmMain`/`cEmSetList`/`cEmSizeCalcTblElement`/`cEmDouMouKa_Parts*`/`cEmStaminaData::cStaminaLev` 等逐个插入全局名表 | `mov r1,#360; bl 0x7aa154`（建表）→ 循环 `add r1,pc,bias` + `mov r2,#<id>` + `bl 0x7aa394`（插入）；14 个怪物串；caller `0x150000`（fn `0x14ff70`） | **高** |
| E2 | **`0x48c30`** | **`cEmSizeCalcTblElement` 的属性/字段注册**（体型计算表 schema） | `0x48c50 ldr r4,[pc,r0]`（GOT）→ `0x48c60 add r1,pc,r0`→`0x15526BE`"cEmSizeCalcTblElement"→`bl 0x7aedcc`；同族 `0x48dfc..0x48e84` 逐字段 `operator new`（`bl 0x7bb638`）+ 名字指针 + 类型码（`mScaleRate`/`mProbability`） | **高** |
| E3 | **`0x4a6d4`** | **`cEnemyDebugSetData` 注册**（调试用敌人配置表 schema） | `0x4a704 add r1,pc,r0`→`0x155277F`；`bl 0x7aedcc`；同一模板（GOT `ldr r2,[pc,r0]`） | **高** |
| E4 | **`0x36091c`** | **`cEmSetList` 使用者**（任务怪物清单 em set list） | `0x36094c add r1,pc,r0`→`0x155681F`；前两条为 GOT 形态取表基址；`bl 0x7aedcc`；**无 BL 调用者** ⇒ 经函数指针/任务表调用 | 串引用**高**；职责**中** |
| E5 | **`0x73E0`**（偏移，非入口） | **敌人运行期对象的"动作/状态号"字节** `u8[this+0x73E0]` | 每个动作派发器都以 `movw r0,#0x73e0; ldrb r0,[r4,r0]` 读它作为 switch 索引，再 `cmp r0,#17` | **高** |
| E6 | 见 §2 清单 | **每只怪一个「动作派发器」**：`switch(u8[this+0x73E0])` 18 分支，每个 case 取对应动作名（`emNNN_00XXXMove`） | 统一签名 `push {r4,lr}; mov r4,r0; movw r0,#0x73e0; ldrb r0,[r4,r0]; cmp r0,#17; mov r0,r0,lsl #2; add r1,pc,#4; ldr r0,[r0,r1]; add pc,r0,r1` + 紧随其后的 **18×u32 行内跳转表**；case 内 `add rX,pc,bias` 指向该怪的动作名 | **高** |
| E7 | `0xcf1688` / `0xcf1898` / `0xcf1e10` / `0xcf2220` / `0xcf2aa4` / `0xcf2d4c` / `0xcf4534` | **单动作装载器**（em001 的 FwMove / ActionMove / MoveMove / FlyMove / HoverMove / AttackMove / RevivalMove），一 (怪, 动作) 一函数 | 每个函数只引用一个动作名串（如 `em001_00AttackMove`），callers=1 | 串引用**高**；"装载器"语义**中高** |
| E8 | `0x4f078` | `uEm019_00` 单元资源引用点（敌人资源装配路径的样本） | `add rX,pc,bias` → `0x155282E` | 中 |
| E9 | **`0x6ba8c`** | **动作名模板分支**：引用模板串 `emXXXFwMove` @**`0x15533cf`**（不是我早先误记的 0x15533db —— 那是 `uEnemyActCustom`） | 反汇编 `0x6baf0: ldr r0,[pc,#56]=0x14e78d3; add r1,pc,r0` → `0x6baf4+8+0x14e78d3 = 0x15533cf` = "emXXXFwMove"；随后 `b 0xca10c` | 高（字符串引用已算平） |
| E10 | **`0x106873c`** | **愤怒↔通常 状态切换处理** | 同时引用 `angry_Loop` @`0x1583f76` 与 `normal_Change` @`0x1585338` | 中高 |
| E11 | **`0x108021c`** | 同 E10（第二处，疑另一只怪/另一状态机分支） | 同上两串 | 中高 |
| E12 | `0x865408` / `0x833974` / `0x82b8c4` | 名称池**最热枚举者**（477 / 307 / 231 个串）：全量名表/枚举 dump | pass4 §6；`0x15004c`(298) 同族 | 中（"枚举"高，"用途"中） |

> 更正：`0x15339c`（159 串）**不是**怪物 —— 它引用的是 NPC 路径模板（`npc\com`、`npc\v%02d`、`npc\npc%03d`、`npc\mot`…），属 NPC 资源枚举。pass4 §6 的"引用池串最多"≠"怪物"。

### 2.4 每只怪的 .data 表（pass6 实测：派发器地址的落点）

每个 L1 派发器函数地址都以**字面量**出现在 .data 的连续函数指针数组里（每只怪一处），即该怪的**方法/动作表**：

| 怪 | 派发器 | 表中落点 |
|---|---|---|
| em003 | `0xd227d0` | `0x179cbb4` |
| em019 | `0xdc3900` | `0x17b46dc` |
| em043 | `0xe81b4c` | `0x17c6fe0` |
| em061 | `0xf35910` | `0x17dec84` |
| em069 | `0xf9c8b4` | `0x17e817c` |
| em076 | `0xfdc074` | `0x17ed148` |
| ems003 | `0x10d2278` | `0x181298c` |

落点上下文（以 em043 为例）：`0x17c6fd0..0x17c6fec` = `0x6bf08, 0x6bf0c, 0xe84530, 0xe84b18, **0xe81b4c**, 0x6bf18, 0xe75cc4, 0x6bf1c` —— 全是 .text 指针（`0x6bfxx` 是共享小桩），即**连续函数指针表**。表起始/方法数/前几个方法见 `ai-entry8.out.txt` §C。

七只怪的块内固定布局（`[0]` = 派发器所在槽，偏移为字）：

| 怪 | `[-16]` | `[-12]` | `[-8]` | `[-4]` | **[0] 派发器** | `[+4]` | `[+8]` | `[+12]` |
|---|---|---|---|---|---|---|---|---|
| em003 | `6bf08` | `6bf0c` | `d23b9c` | `d240a8` | **`d227d0`** | `6bf18` | `d1278c` | `6bf1c` |
| em019 | `6bf08` | `6bf0c` | `dc68b4` | `dc6c10` | **`dc3900`** | `6bf18` | `db7390` | `6bf1c` |
| em043 | `6bf08` | `6bf0c` | `e84530` | `e84b18` | **`e81b4c`** | `6bf18` | `e75cc4` | `6bf1c` |
| em061 | `6bf08` | `6bf0c` | `6bf10` | `6bf14` | **`f35910`** | `6bf18` | `f27318` | `6bf1c` |
| em069 | `6bf08` | `6bf0c` | `f9cf7c` | `f9d4bc` | **`f9c8b4`** | `6bf18` | `f8c39c` | `6bf1c` |
| em076 | `fca9a4` | `6bf0c` | `6bf10` | `6bf14` | **`fdc074`** | `6bf18` | `fc77b0` | `6bf1c` |
| ems003 | `6bf08` | `6bf0c` | `6bf10` | `6bf14` | **`10d2278`** | `6bf18` | `10cf35c` | `6bf1c` |

⇒ **结构固定的"方法表"**：`-12/-16` 与 `+4/+12` 恒为共享小桩（`0x6bf08/0x6bf0c/0x6bf18/0x6bf1c`），`-8/-4` 与 `+8` 是**该怪专属方法**（部分怪用共享桩填充，如 em061/ems003）。派发器固定在相对下标 **+4**。
⇒ **不是 Itanium C++ vtable**（无 RTTI 头、且混有共享桩），而是**自研的 action/method 表**。表长与边界待 `ai-entry8.out.txt` §C（最大连续 .text 指针 run）确认。[INFERENCE]

**同一只怪有多个派发器**：em043 在 .data 的同一块内出现 `0xe84148@0x17c6f28`、`0xe81b4c@0x17c6fe0`、`0xe76c10@0x17c6ff0`、`0xe821cc@0x17c6ff4`、`0xe83ea0@0x17c7000`、`0xe8673c@0x17c8700` ⇒ 该块跨度 ≈ `0x17c6f00..0x17c8700` ≈ **0x800 B（512 字）**，是"一只怪一份"的**方法表簇**，不是单张 vtable。这与"477 个函数读 +0x73E0（每怪 5~8 个方法）"完全吻合。

### 0x73E0 普查（pass5 §1 + pass7 §2 已跑）
**477 个函数**含 `movw rX,#0x73e0`；其中**紧跟 `ldrb` 后出现 `cmp rX,#17` 的恰好 89 个函数**（`cmp` 立即数直方图：`7:247, 17:89, 10:71, 11:48, 1:33, 14:21, 13:19, 3:18, 0:17, 16:13, 2:9, 12:9`）⇒ **89 = 怪物动作派发器的权威计数**（与"93 大怪 + 小怪"口径同量级；同一只怪的多个方法共用 +0x73E0，故 477 远大于 89）。另有 **95 个** `add pc, rN, rM` 非行内派发器（跳转表在别处；pass7 §3 已列前 17 个：`0x34e00/0x87fbc/0x8b36c/0x18a874/0x1cf188/0x24c998/0x290648/0x308580/0x32a798/0x388f40/0x3dfb54/0x3e1360/0x3e1c3c/0x3e2210/0x3e3d1c/0x3e4e80/0x3e5410`）。

89 个派发器的前 40 个（pass7 §2）：`0x6bb34 0xcf13c8 0xd227d0 0xd3103c 0xd35e58 0xd52f50 0xd60468 0xd6d714 0xd76970 0xd78794 0xd8d7ac 0xd98748 0xd9b470 0xdb3ba4 0xdc3900 0xdc75ec 0xddb114 0xddcfd8 0xdefc0c 0xdff6f8 0xe10c50 0xe1d4b0 0xe1f1d4 0xe3750c 0xe41084 0xe41ca0 0xe4a638 0xe65afc 0xe72bcc 0xe81b4c 0xe8f928 0xe9e504 0xeabc48 0xeb5a8c 0xecf614 0xed3e2c 0xeebe7c 0xf035bc 0xf1b3f8 0xf35910`。

### 2.5 敌人对象布局（由 E9 反汇编实证）

`0x6ba8c` 同时读 `u8[this+0x73E1]`（判 `==0 / ==1`）与 `[[this+0x1428] + 0x1A1]`，并做**虚调用** `ldr r1,[*this + 988]; bx r1`：
- `+0x73E0` = 动作号（byte）
- `+0x73E1` = 次级状态标志（byte，取值 0/1）
- `+0x1428` = 子对象指针（其 `+0x1A1` 是一个 3 态字节：0=未置、1=已置、其它=跳过）
- `*(this)+988`（0x3DC）= 虚函数表项 → **vtable 至少 248 项**

### 名称表原语（被上述入口反复调用，值得单独记）

| vaddr | 作用 | 证据 |
|---|---|---|
| `0x7aa154` | 名表初始化/预分配（参数 = 槽数 360） | E1 首调 |
| `0x7aa394` | 名表插入 `(容器, 名字指针, id)` | E1 内 360 次循环体 |
| `0x7aedcc` | 按名查表/注册（第二个原语） | E2/E3/E4 均调用 |
| `0x7bb638` | `operator new`（属性对象分配） | peer 证据 + E2 同族 |

---

## 2. 动作派发器清单（state → 动作）

判定签名（全部满足）：
1. `movw rX,#0x73e0` → `ldrb rX,[rY,rX]`
2. `cmp rX,#0x11`（=17，18 态）
3. `add r1, pc, #4` → `ldr r0,[r0,r1]` → `add pc, r0, r1`
4. 紧随 `add pc` 之后是 **18 个 u32** case 偏移；case 目标 = `(add pc 指令地址 + 4) + off`

已确认实例（`N` 是分支数，`callers=0` 表示经函数指针/表调用）：

| 派发器 vaddr | N | 覆盖的怪 | 代表动作名 |
|---|---|---|---|
| `0xe81b4c` | 18 | em043 | `em043_00RevivalMove` / `PreCatchMove` / `FlyMove` / `CatchMove` |
| `0xf35910` | 18 | em061 | `em061_00RevivalMove` / `DemoMove` / `FlyMove` / `MoguriMove` |
| `0xf9c8b4` | 18 | em069 | `em069_00DemoMove` / `PreCatchMove` / `RevivalMove` / `MoguriMove` |
| `0xfdc074` | 18 | em076 | `em076_00PreCatchMove` / `RevivalMove` / `DemoMove` / `CatchMove` |
| `0xd227d0` | 18 | em003 | `em003_00PreCatchMove` / `RevivalMove` / `DemoMove` |
| `0xdc3900` | 18 | em019 | `em019_00PreCatchMove` / `DemoMove` / `FlyMove` |
| `0xf8903c` | 18 | em068 | `em068_00PreCatchMove` / `RevivalMove` / `Catch2Move` |
| `0x10d2278` | 18 | ems003 | `ems003_00RevivalMove` / `DemoMove` / `AttackMove` |
| `0x10e803c` | 18 | ems016 | `ems016_00RevivalMove` / `DemoMove` / `AttackMove` |
| `0x10efea8` | 18 | ems022 | `ems022_00RevivalMove` / `FlyMove` |
| `0x110c01c` | 18 | ems042 | `ems042_00RevivalMove` / `FlyMove` |

完整 319 个函数的分布见 `ai-entry4.out.txt` §4；完整 state→case→动作名 展开见 `ai-entry5.out.txt` §3。

### 2.1 样例：`0xe81b4c`（em043）跳转表逐槽解码

`add r1,pc,#4` 位于 `0xe81b68` ⇒ 表基址 = `0xe81b68 + 8 + 4 = 0xe81b74`，18 个 u32 依次为
`48 54 60 6c 16c 16c 9c a8 b4 d8 114 120 12c 148 16c 16c 154 160`（十六进制）。

| state | case 目标 | 备注 |
|---|---|---|
| 0 | `0xe81bbc` | 接 `mov r0,r4; bl 0xe774b0`（转调公共例程） |
| 1 | `0xe81bc8` | |
| 2 | `0xe81bd4` | |
| 3 | `0xe81be0` | |
| 4,5 | `0xe81ce0` | = `bhi` 的目标 ⇒ **与 default 同一处理**（空槽） |
| 6 | `0xe81c10` | |
| 7 | `0xe81c1c` | |
| 8 | `0xe81c28` | |
| 9 | `0xe81c4c` | |
| 10 | `0xe81c88` | |
| 11 | `0xe81c94` | |
| 12 | `0xe81ca0` | |
| 13 | `0xe81cbc` | |
| 14,15 | `0xe81ce0` | 空槽 |
| 16 | `0xe81cc8` | |
| 17 | `0xe81cd4` | |

⇒ 18 槽中 **4 槽**（state 4/5/14/15）与 default 同址 ⇒ **14 个真实处理分支**，与动作名类别数（13 类）同一量级。每个 case 内部用 `add rX,pc,bias` 取该怪的动作名串，故 **state → 动作名** 的映射可由 pass5 机械导出。

**语义推断（`[INFERENCE]`，有待实机/交叉验证）**：`0x73E0` 的 18 个值 = `actionNo`（对应动作名后缀的枚举），不是"AI 决策状态"；AI 决策层应在调用该派发器的上层函数，而派发器 `callers=0` 说明它是**表项**（动作表在 .data，由 E6 变体注册）。动作表本体定位见 `ai-entry6.out.txt`。

### 2.2 动作层是**两层**的（pass5 §4 实测，重要）

| 层 | 形态 | 实测样本 | 说明 |
|---|---|---|---|
| **L1 动作选择器** | `switch(u8[this+0x73E0])`，17 个有效值 | `0xd227d0`(em003) / `0xdc3900`(em019) / `0x10d2278`(ems003) / `0xd52f50`(em008) / `0xd76970`(em011) / `0xdb3ba4`(em018) / `0xf588b8`(em065) / `0xf662f8`(em066) / `0xf78f98`(em067) / `0x110c01c`(ems042) | 每只怪一个；**共同引用 `emUniqueActMain`**（通用"独有动作"名）+ 少数专属动作（`emNNN_00PreCatchMove/RevivalMove/DemoMove/FlyMove`） |
| **L2 单动作变体表** | 各自独立的 switch（N=3..50） | `0xcf1898` N=34→`em001_00ActionMove`；`0xd14238` N=42→`em003_00ActionMove`；`0xd28594` N=47→`em004_00ActionMove`；`0xd36310` N=37→`em007_00ActionMove`；`0xd4b040` N=37→`em008_00ActionMove`；`0xd37044` N=50→`em007_00MoguriMove`；`0xd2a95c` N=20→`em004_00FlyMove`；`0xd2ada0` N=4→`em004_00MoguriMove`；`0xcf1688` N=6→`em001_00FwMove`；`0xcf1e10` N=29→`em001_00MoveMove`；`0xcf2aa4` N=32→`em001_00HoverMove` | **一 (怪,动作) 一个函数**，函数内部再按 N 个子态分支 → 这才是"攻击/动作表"的密度所在（每动作 20~50 个变体） |

⇒ 解读：**L1 定"现在做哪类动作"，L2 定"该动作具体播哪个变体"**。`emUniqueActMain` 是 L1 的公共分支名。

**注意口径**：`cmp rX,#17` 是**上界**（`bhi` 走 default）⇒ 有效下标 0..17 共 **18 槽**；pass5/pass8 打印的 `N=17` 是最大下标，槽数应 +1。

### 2.3 已命名的状态处理（非"动作"层，属状态机）

| 入口 | 证据串 | 推测 |
|---|---|---|
| `0xd216a4` | `Angry_Start` | **进入愤怒**（N=3） |
| `0xec5440` | `cool_Loop` / `maguma_Loop` / `maguma_End` | 冷却/熔岩状态循环（某只怪） |
| `0xed0774` | `red_Change` / `red_End` / `blue_End` | 红/蓝形态切换 |
| `0xe8f928` | `revival_move` / `demo_move`（无 `em` 前缀 = 基类通用名） | 通用复活/演出动作 |
| `0xd6d714` / `0xeabc48` / `0xec3b98` / `0xf0a6fc` | `revival_move` / `demo_move` 之一 | 同族基类处理 |

---

## 3. 否定性结论（同样重要，避免后人重复踩坑）

| 结论 | 证据 |
|---|---|
| `uMonsterUnitConductor` @`0x15535dc`、`uEnemy` @`0x15535c9`、`uEnemyCharacter` @`0x155358a`、`actionNo` @`0x1553633`、`uEmXXX` @`0x15533c8`、`emXXXFwMove` @`0x15533db` | **三种机制全部 0 引用**（原始 u32 指针 / literal pool / pc 相对增量） ⇒ 仅存在于静态名称池，**不可作为代码锚点** |
| `cEnemyResourceBroker` @`0x15527bf`、`cEnemyDebugSetDataXML`、`cEmSetListXML`、`mMonsterIndex`、`mTrueSize` | 同上，0 引用 |
| 名称池 `0x1551ac6..0x1586000` 是**静态符号/资源名池**（含 `uEm087_00::cActCustomExecMonitor`、`roEm001.cro` 这类 demangled 符号与资源名），不是 vtable、不是描述符数组 | `em-units.out.txt` S3：对 `uEm` 串的绝对指针 **0**、严格 4B run **0**；本报告 §0 的机制分析 |
| 全镜像仅有 **62** 个带 RTTI 名称的 vtable，**没有一个**名字匹配 `cEm|uEm|cEnemy|uEnemy|Monster` | `ai-entry.out.txt` §3 ⇒ 怪物类**不能**靠 RTTI 名反查 vtable，只能靠构造器/注册函数的调用图 |
| `0x2484c0` / `0x52308c` / `0x6aa9b8` 不是 AI 入口 | `0x2484c0` 唯一 caller 是 `0x2456e8`（fn `0x2451c8`，任务位图区）；`0x52308c` 4 个 caller 全在任务计数区；`0x6aa9b8` 有 94 个 caller（通用记录迭代器） |

---

## 4. 参数表（字段词汇与"表号"入口）

怪物运行参数不是编译期 `{名, offset, size}` 数组，而是**运行期逐字段注册的 property 对象**（名字指针 + 类型码 + 类指针，见 E2 同族 `0x48dfc` 起的 `bl 0x7bb638` + `stm`）。因此：
- **字段名 → 偏移** 只能从各 property 的读写虚函数里的立即数得到，或从 XML 解析器的 `mXxx` 名字引用点反推；
- 表本体是**资源**（名 `rXxx`，以 CRC32 为键），见下。

### 4.1 任务怪物槽（每任务 6 只，后缀 `_2.._5`）
`mEmType_N` @`0x1562a48` · `mAuraType_N` @`0x1562a5f` · `mVitalTblNo_N` @`0x1562a79` · `mOtherTblNo_N` @`0x1562a96` · `mScale_N` @`0x1562ab2` · `mStaminaTbl_N` @`0x1562ac7` · `mEmSubType_N` @`0x1562adf` · `mRestoreNum_N` @`0x1562af8` · `mAttackTblNo_N` @`0x1562b14`
⇒ `mVitalTblNo / mAttackTblNo / mStaminaTblNo` 是**表号**：HP 表 / 攻击表 / 耐力表按号索引。

### 4.2 体型计算表（我的任务目标之一，已定位 schema 入口）
- `cEmSizeCalcTblElement` @`0x15526be`（**name-dictionary 漏收，字节搜索实测存在**）、`cEmSizeCalcTblElementXML` @`0x1552729`
- `cEmSizeYureTblElement` @`0x1552742`、`cEmSizeYureTbl` @`0x1552758`
- 字段：`mMonsterIndex` @`0x15526d4` · `mTrueSize` @`0x15526e2` · `mSmallScale` @`0x15526ec` · `mBigScale` @`0x15526f8` · `mKingScale` @`0x1552702` · `mQuestSizeMin` @`0x155270d` · `mQuestSizeMax` @`0x155271b` · `mScaleRate` @`0x1552767` · `mProbability` @`0x1552772`
- **入口**：E2 `0x48c30`（运行期 schema 注册）+ 资源名 `rEmSizeCalcTblElement` / `rEmSizeYureTbl`（CRC 常量见 §4.4）
- 保存侧对应：存档 `0x60CA` 起 129 条 `[mini,0,maxi,0]`（已定案）

### 4.3 愤怒 / 耐力 / 部位
`StaminaSubRate` @`0x1552649` · `IkariRate` @`0x1552658` · `EatRateChange` @`0x1552662` · `StaminaTimeVal` @`0x1552670` · `iWaza_OtherParts_Bias` @`0x1552600` · `mPartsChangeData` @`0x1552692` · `mPartsAuraData` @`0x15526a3` · `mModifyData` @`0x15526b2` · `cEmDouMouKa_PartsAuraData_Element` @`0x1552294`
愤怒状态的动作名实测存在：`angry_Loop` @`0x1583f76`、`tired_Loop` @`0x1585422`、`tired_Change` @`0x1585293`、`normal_Change` @`0x1585338`。

### 4.4 资源表（CRC32 键）
peer 实测：`crc32x(s) = zlib.crc32(s) ^ 0xFFFFFFFF`
- `crc32x("rMonsterPartsManager")` = `0x7cd0e77e`，在 .data 中出现 **123 次**
- `crc32x("rEmSizeCalcTblElement")` = `0x5adc692c` @`0x160fdd4`
- `crc32x("rEmSizeYureTbl")` = `0x1800eb37` @`0x160fddc`
⇒ `0x160fdd4`/`0x160fddc` 相距 8 B ⇒ **以 CRC32 为键的资源表**（stride 8）。这是"表本体"的定位入口：凡以 `movw/movt` 造出这些 CRC 常量的函数即该表的消费者。

### 4.5 动作参数
`mActTblNo` @`0x1563b93` · `mStepInfo` @`0x1563b7a` · `mActNum` @`0x1568c29` · `mDamage` @`0x1568c3a` · `mActId` @`0x1568c47` · `mActWait` @`0x1568c57` · `mActEndFrame` @`0x1568c68` · `mActStatus` @`0x155b864` · `mActNo` @`0x155a186` · `mAngryFlag` @`0x155a220` · `mStepActWallHitCheckOfs` @`0x15843b9` · `mOriginEmChgScale` @`0x158438a` · `rAngryParam` @`0x155db11`
动作名模板：`uEmXXX` @`0x15533c8` + `emXXXFwMove` @`0x15533cf`（紧跟其后 `0x15533db` 是类名 `uEnemyActCustom`，不是动作模板）；实例名形如 `em017_00FwMove` @`0x1583d16`。
动作名闭集：`FwMove` / `MoveMove` / `AttackMove` / `ActionMove` / `FlyMove` / `HoverMove` / `SwimMove` / `MoguriMove` / `CatchMove` / `Catch2Move` / `PreCatchMove` / `RevivalMove` / `DemoMove`。

---

## 5. 状态 / 未决

### 已完成（有输出文件）
| 脚本 | 输出 | 结论 |
|---|---|---|
| `ai-entry.mjs` | `ai-entry.out.txt` | 符号定位、绝对指针/literal 全 0、RTTI vtable 62 个 |
| `ai-entry2.mjs` | `ai-entry2.out.txt` | `movw/movt` 25,312 对；数据 run 5,999 条（多为非 vtable）；单例槽 8,852 个 |
| `ai-entry4.mjs` | `ai-entry4.out.txt` | **pc 相对引用重建：18,223 个 `add rD,pc,rM` 站点，14,962 命中数据**；360 个怪物串 / 319 个函数 |
| `ai-entry5.mjs` | `ai-entry5.out.txt` | 全镜像 3,008 个 inline switch；其中怪物域见 §2.2/§2.3 |
| `ai-entry6.mjs` | `ai-entry6.out.txt` | 派发器地址 → .data 落点（§2.4） |
| `ai-entry7.mjs` | `ai-entry7.out.txt` | 定点反汇编 + `cmp #17` 普查 = **89 个派发器** |

### 待跑（脚本已落盘）
`ai-entry8.mjs` → `ai-entry8.out.txt`：怪物域派发器的 **state→动作名 逐槽展开** + 每个落点所在**最大连续 .text 指针 run**（表起始/方法数/前 16 方法/派发器下标）。这是本报告 §2.4 "表长与方法数" 的最后一块拼图。

### 未知 / 未做
1. **AI 决策层**（选招、目标选择、距离/朝向判定）尚未定位。已知执行层入口（89 个派发器 + L2 变体表）与其输入 `u8[this+0x73E0]`；决策层应在调用 L1 的上层（`callers=0` 说明 L1 是表项，故需先从 §2.4 的表反查调用者）。
2. **`cEnemyResourceBroker` 的类实现**：该串 0 引用，只能从 `0x4f078` 一族（全局怪物单元表初始化，写 `.bss` 表 `[r4+0x30..0x4c]` = 0,1,2,3,4,8,9,5 等）反推。
3. **表的精确边界**：§2.4 的块结构已证 8 槽固定布局，但整表长度需 pass8 §C。
4. **`mActTblNo` / `mVitalTblNo` 指向的表本体**：资源以 CRC32 为键（§4.4），但表实体未 dump。
5. 未做实机/模拟器验证（本批无运行环境）。

### 复现要点（给后来者）
- 任何字符串/常量的 xref 都必须走 `add rD, pc, rM` + 增量重建（`resolvePcAdd`），否则全 0。
- 增量来源两种：`ldr rX,[pc,#imm]` 或 `movw/movt` 对；反向搜索窗口 12~14 条，遇到写同寄存器即中止。
- 怪物域判定：函数内含 `movw rX,#0x73e0`；动作派发器判定：其后 `ldrb` + `cmp #17` + `add r1,pc,#4; ldr r0,[r0,r1]; add pc,r0,r1`。
