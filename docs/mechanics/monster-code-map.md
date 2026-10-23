# 怪物代码侧地图（AI / 动作 / 参数结构）— 2026-10-23

配套：`monster-ai-params.md`（字段名表）、`monster-classes.md`（成员 offset/type 表）、
`../analysis/monsters/`（6 份调查报告）。

## 0. 方法论前提（否则全部搜索会得到「0 引用」的假阴性）
本二进制 **字符串引用不是绝对指针/字面量**，而是：

```
ldr  rB, [pc, #imm]      ; 或 movw rB,#lo / movt rB,#hi
add  rD, pc, rB          ; target = (add 指令地址 + 8) + bias
```

`bias = target − (site+8)`。按「4 字节字 == 字符串地址」或「movw/movt 直接编码地址」去搜，
`cEm*`/`uEm*`/`mParam.*` 全部命中 0 ——**那是假阴性，不是死数据**。
实例：`0x48c60 add r1,pc,r0`（r0 来自 `[0x48cc4]=0x1509a56`）→ `0x15526BE` = `cEmSizeCalcTblElement`。

另一条并存的引用方式是 **cName 哈希**：`crc32(name)`，**反射多项式 0xEDB88320、init 0xFFFFFFFF、无最终异或**。
证据：`.data 0x160fdd4=0x5adc692c` / `0x160fddc=0x1800eb37` 恰为 `crc32raw("rEmSizeCalcTblElement")` / `crc32raw("rEmSizeYureTbl")`。
资源清单表（`0x160fdd0` 起，`{名称哈希, 类型哈希}` 8B 记录）用这套哈希索引。

## 1. 动作/状态机（核心）

| 项 | 值 | 证据 |
|---|---|---|
| **动作号字段** | `u8[this + 0x73E0]` | 每个派发器都是 `movw r0,#0x73e0; ldrb r0,[this,r0]; cmp r0,#17` |
| 读取该字段的函数 | **477** | 全镜像扫描 |
| **动作派发器** | **149 个**（`mov r0,r0,lsl#2` + 内联跳转表，case 数 4..45） | 内联表签名：`ldr r0,[r0,r1]; add pc,r0,r1` |
| **state → handler** | **已解决**（53 个派发器全解）：表项 = `handler − 表基址`，表基址 = `add r1,pc,#4` 处的 `指令+8+4` | 详见 `monster-state-machine.md` |
| **state → motion 名** | **部分解决**：41/53 派发器至少 1 个状态有名字（`em###_##FwMove/ActionMove/FlyMove/...`）；共享 handler 状态未解 | 生成脚本 `tools/mhgu/state-motion2.mjs` |
| 18 态派发器 | 89 个（`cmp #17` 普查：7 态 247 个、17 态 89 个、10 态 71 个…） | `cmp` 直方图 |
| 派发器所在方法表 | **58 张** `.data` 连续 `.text` 指针表 | 反查派发器地址 |
| 每怪方法表簇 | `0x179CBB4 / 0x17B46DC / 0x17C6FE0 …`（固定 8 槽布局，派发器在 +4） | 7 只怪交叉比对 |

**动作名表**：每只怪的动作名形如 `em043_00FwdMove` / `ems039_00_zako_attack_move`（见 `monster-ai-params.md` §2，44 条）
通用后缀：`fw_move`(前进) / `action_move`(一般动作) / `move_move`(移动) / `moguri_move`(潜地) /
`attack_move`(攻击) / `revival_move`(复活) / `fly_move`(飞行) / `hover_move`(悬停) / `demo_move`(演出) /
`pre_catch_move`(拘束前摇) / `catch_move`(拘束) —— 后两者为 `[INFERENCE]` 按 MH 惯例。

**状态处理器（已定位）**：
| 地址 | 职责 | 证据 |
|---|---|---|
| `0xD216A4` | `Angry_Start`（进入愤怒） | 直接引动作名 |
| `0xEC5440` | `cool_Loop` + `maguma_*`（冷却循环/熔岩） | 同上 |
| `0xED0774` | `red_blue`（红蓝状态切换） | 同上 |
| `0x106873C` | `angry_Loop` + `normal_Change`（愤怒/通常切换） | 同上 |
| `0x6BA8C` | 动作名模板拼装（`emXXXFwMove` @`0x15533CF`） | bias 算术已验证 |

**L2 动作变体表**（每个解析一个具体 motion）：
`0xCF1898`(N=34) / `0xD14238`(42) / `0xD28594`(47) / `0xD36310`(37) / `0xD4B040`(37) / `0xD37044`(50)。

## 2. 类注册与参数结构

| 项 | 值 |
|---|---|
| 怪物类/名注册容器 | `0x15004C`（`mov r1,#360; bl 0x7AA154` → 360 槽），插入 `cSetEmMain`/`cEmSetList`/`cEmSizeCalcTblElement`/`cEmDouMouKa_Parts*` |
| Schema 注册函数 | `0x48C30`(cEmSizeCalcTblElement) / `0x4A6D4`(cEnemyDebugSetData) / `0x36091C`(cEmSetList) |
| 成员 `{name, offset, type}` | **110 条 / 27 个类**，见 `monster-classes.md`（offset/type 均为代码立即数） |
| 主要类成员数 | `cEmDouMouKaData`=42、`rEnemyDtBase`=26、`cEmSizeCalcTblElement`=7、`rEnemyResidentDtBase`=6、`cEmSizeYureTbl`=2、`cEnemyDebugSetData`=2 |
| 散落块（§6bis） | `uMonsterUnitConductor`(`mZakoFlg/mGenus/mSpecies/mSleepFlag/mpEnemyUnit/request/actionSt/actionNo`)、`rSetEmMain`(sem)、`rEmSetList`(esl)、`rEmSetData`(esd)、`cEmStaminaData::cStaminaLev`(耐力等级) |

## 3. 怪物名录与计数器

| 项 | 值 |
|---|---|
| 怪物主表 | **166 项 u16 @ `0x162BF0C`**（`EmId = (variant<<8) | baseId`；variant 0=原种 1=亚种 2=稀少种 3/5/6=强化 4=二名） |
| 追踪计数的怪 | **93** 个精确 emid 出现在槽表中；其余 **73 项**的精确 emid 不在槽表（**若 `0x50B64` 按 base id 掩码匹配，这些变体将继承原种槽位**——该掩码行为待验证，勿据此断言「73 种没有计数器」）|
| 计数器槽表（静态源） | **137 × `{u32 EmId, u32 slot}` @ `0x1597EA4`**；运行期副本 `0x1A523A4`（`.bss`）+ `0x164F7E4` |
| 槽布局 | `0..70` 大怪 71 → `71..111` 小怪 41 → `112..134` 大怪 23 → `135..136` 小怪 2（**无保留槽**）|
| `EmId → 槽号` | `0x50B64`（线性搜 137 项，未收录返回 −1；60 处调用）|
| 资源名表 | **137 × `const char*` @ `0x1732050`** → `roEm###.cro` / `roEms###.cro` |

## 4. 体型（尺寸）机制

- 字段：`cEmSizeCalcTblElement` = `mMonsterIndex, mTrueSize, mSmallScale, mBigScale, mKingScale, mQuestSizeMin, mQuestSizeMax`
  （offset 立即数：`+4,+8,+0xC,+0x10,+0x14,+0x18,+0x1C`，type 6/12）
- `cEmSizeYureTblElement` = `mScaleRate, mProbability`
- **数值表不在 exe 内**：资源类型↔扩展名表 `0x1553068` 给出 `rEmSizeCalcTblElement ↔ emsizetbl`、`rEmSizeYureTbl ↔ emyure`；
  `.data 0x160FDD0` 的资源清单中两者**各只有 1 条**（即不是每怪一份）。⇒ 表体在 **romfs** 的 `*.emsizetbl` / `*.emyure`。
- **存档侧**：`char_off 0x60CA` 起 137 条 `[u16 mini, u16 maxi]`（`+1/+3` 恒 0），值域 88..125，`mini ≤ maxi` 全域成立，
  **是无量纲倍率而非基础体型**（跨物种值域几乎不变）⇒ 「maxi = 基础体型 × 冠倍率」不成立。
  clean 42/137 非零、dirty 74/137 非零（dirty 在槽 112..132 有 21 条，与「112..134 是大怪」一致）。

## 5. 硬边界（需要用户提供资源）

`mTrueSize` / 三档冠阈值 / 尺寸浮动分布的**数值**只能来自 romfs：
`main` 的 base romfs 载体（XCI 内 `98abd400588fccb68509fed7e55e4a47.nca`，**12,168,003,584 B = 12.17 GB / 11.33 GiB**；
取自 XCI secure 分区 `0x182bbe00..0x2ed70be00`，证据 `.tmp/mhgu/xci-info.txt:50`。
同一 NCA 的旧说法——本文件 ~~约 12.3 GB~~、`DEVELOP.md` ~~9.1 GB~~ / ~~10.8 GB~~——**均已作废，以本条为准**）
**不在本机磁盘**，已解出的 `0eb59f…nca` 是 BKTR 补丁 NCA，无 base 无法解。
⇒ 需原始 XCI + `hactool -r` 才能补齐。**在此之前，体型数值属「已知结构、未知数值」**。

## 6. 负结果（已排除，避免重复劳动）
- `uMonsterUnitConductor` / `uEnemy` / `uEnemyCharacter` / `actionNo` / `uEm###` / `cEnemyResourceBroker`
  以「绝对指针 / movw+movt / ldr 字面量」三种方式查引用均为 **0**（真实引用走 pc 相对 `add`）。
- 全镜像仅 62 个 RTTI 命名的 vtable，**无一**匹配怪物类 ⇒ 类→vtable 必须走注册器调用图。
- `0x2484C0` 不是结算动作表，而是 **114 项全局条件谓词表**（返回 bool）；`0x52308C`/`0x6AA9B8` 属任务/存档，不属 AI。

## 7. 全二进制类清单（3201 个类，含大小）
来源：`bl 0x7AEDCC`（类注册）的 `r3` 立即数 + `add r1,pc,bias` 取到的类名。
导出：`docs/data/class-inventory.tsv`（`class / name / offset_size / registrar_fn / registrar_site`）。

| 前缀族 | 类数 | 声明总字节 |
|---|---|---|
| `c*`（游戏类）| 1,116 | 446,012 |
| `u*`（unit）| 928 | 8,181,876 |
| `r*`（resource）| 413 | 1,129,584 |
| `s*`（struct/save）| 199 | 13,862,748 |
| `Mt*`（MT Framework）| 73 | 30,080 |
| 其它 | 472 | 175,220 |

**与存档布局的交叉验证（强证据）**：
- `sEquipBox` = **`0x3FBF4` = 261,108 B** ↔ 我们实测 member[3] 装备箱 OBJ 跨度 `obj+44..+261100`（≈261,100）**精确吻合**。
- `sMain` = **`0x38370` = 230,256 B** ↔ member[0..17] 文件链 227,386 B（+632B 头/对齐）吻合。

**用途**：类大小 + 类名 + 注册函数地址三者结合，可把「注册函数 → 它注册的类族」映射成模块归属，
这是给全 `.text` 做子系统标注的最强结构信号（优于字符串关键词）。
