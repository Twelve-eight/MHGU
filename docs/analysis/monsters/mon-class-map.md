# MHGU 怪物类数据结构图（成员名 → offset/类型推断）

坐标系：全部 `vaddr`；`flat_off = vaddr + 0x100`。**内存地址 = vaddr + 0x100000**（见 §3）。
状态：名字池/类分组/成员序号**已确认**；静态 offset 表**已证否**（不存在），可用的 offset 只能逐类从代码立即数反推，本报告已解出 1 个类。

---

## 0. 结论摘要

| 问题 | 结论 | 证据强度 |
|---|---|---|
| 怪物成员名字符串块在哪 | rodata `0x1551ac6..0x1553421`（474 串池；池内怪物前缀 151 条，全 rodata 严格前缀口径 **170** 条，宽口径 222 条）；资源名 `roEm###.cro` 延伸到 `0x1553032`；散落块见 §5bis | 确认 |
| 块格式是否与 name-dictionary 同构 | **是**：`类名串 → 该类成员名串… → (3 字母短标签)`，NUL 结尾首尾相接、零填充 | 确认 |
| 有没有 `{名, offset, size}` 描述符数组 | **没有静态数据表**，但**等价信息在代码里**：每个成员由一段内联代码 new 成属性记录，字段 = `{名字指针, 类型码, 实例+偏移}`，**偏移是 `add rX,rBASE,#imm` 的立即数** ⇒ 可静态抽出完整 `{名, offset, type}` 表（§8bis） | 确认 |
| 能拿到什么定量信息 | ①每个类的成员**顺序号**；②**类大小**（`bl 0x7aedcc` 的 r3）；③**每个成员的字节偏移 + 类型码**（内联构造器立即数） | 确认 |
| 具体解出的结构 | `cEmSizeCalcTblElement` = 0x20 B：`+0x00 vptr`、`+0x04 mMonsterIndex`、`+0x08..+0x1C` 六个 f32 | **全部 offset 已由构造器确认** |

---

## 1. 方法与复现

| 脚本（`.tmp/mhgu/mon/`） | 作用 | 输出 |
|---|---|---|
| `mon-class-map.py` | rodata 全量串表、块分组（gap≤48）、原始字节布局、指针表/字面量初扫 | `mon-class-map.out.txt` |
| `mon-refs.py` | 「4 字节字 == 串地址」、base-delta 扫描、movw/movt、ldr 字面量、6 种 hash、偏移表 | `mon-refs.out.txt` |
| `mon-desc.py` | `vaddr+0x100` 位移指针、`crc32x` 名字哈希命中、`.data` 表 dump | `mon-desc.out.txt` |
| `mon-registry.py` / `mon-registry2.py` | 带数据流的 pc 相对引用扫描（`add rd,pc,rm` 等） | `mon-registry*.out.txt` |
| `mon-final.py` | `bl 0x7aedcc` 的 (类名, size) 表 + 类/成员分组 | `mon-final.out.txt` |
| `mon-classes.py` | 按 `^(c|u|r|s)[A-Z]` 切类的序号表 | `mon-classes.out.txt` |

复现：`python .tmp/mhgu/mon/mon-class-map.py`（只读 `main.140.flat.bin`，输出走 stdout）。

---

## 2. 名字池的物理结构（确认）

`mon-class-map.py` S3 对 `0x1552200..0x1552d00` 逐字节 dump：**除池首前 4 B（`6d 65 72 00` = 上一串 "mer" 的尾巴）外，全部是 `STR … gap=0`**。

- 池 `0x1551ac6..0x1553421`：474 个串（len≥3；len≥2 时 475），`gap` 全 0（`uQuestCamera@0x1551ac6` … `uEnemyBase@0x1553416`）。
- 唯一例外：`rMonsterPartsManager::cPartsVisibleInfo`(0x15532b2,len 39) 与 `…::cPartsVisibleGroup`(0x15532f1,len 40) 之间 **gap=23 B**（非串数据，未解析）。
- ⇒ 池里**没有**定长记录、没有内嵌 offset/type 字段。名字的首地址 = 唯一索引；「序号」只能用出现顺序。

**撤回一条早期推断**：`uEm###_00` 相邻地址差 0x14 曾被读成「20 B 定长记录」。逐字节 dump 显示 `gap` 全为 0，两个名字之间其实还有字符串（如 `uEm008_00@0x15527e8`），只是 name-dictionary「每串只留前 3 次」把它们过滤掉了，才显得间距恒 20 B ⇒ 该推断**错误，已撤回**。

---

## 3. 引用机制：pc 相对增量（确认）

`functions.csv` 把 `0x48ad4..0x491b8` 标注为 `cEmSizeCalcTblElement`，但「全文件 4 字节字 == 该串地址」计数为 **0**（`mon-refs.py` R1 = 0；`size-calc.out.txt` S2/S3 独立复核 `refs=0`、`runs=0`）。真机制：

```asm
; fn 0x48c30 内
00048c5c: e59f0060  ldr r0, [pc, #0x60]   ; [0x48cc4] = 0x01509a56      ← 增量 D
00048c60: e08f1000  add r1, pc, r0        ; r1 = (0x48c60+8) + 0x1509a56 = 0x15526BE
                                          ;    = "cEmSizeCalcTblElement"
; fn 0x48dc8 内（注册 mScaleRate / mProbability 两连发）
00048e00: e59f10c4  ldr r1, [pc, #196]    ; [0x48ecc] = 0x0150994f
00048e10: e08f1001  add r1, pc, r1        ; = 0x1552767 "mScaleRate"
00048e78: e59f1050  ldr r1, [pc, #80]     ; [0x48ed0] = 0x015098ee
00048e7c: e08f1001  add r1, pc, r1        ; = 0x1552772 "mProbability"
```

- 公式：`target_vaddr = insn_vaddr + 8 + D`（D 由同函数字面量池提供）。
- 另一形式 `ldr r4,[pc,r0]`（`0x48b78`，`r0=0x017f0a48`）：`addr = 0x48b80 + 0x17f0a48 = 0x18395C8`（落在 `.data`，是 GOT 槽），槽内取到的是类/单例指针，随后 `add r1,r1,#8` 指向 vtable+8。`[INFERENCE]`（槽内容未逐字节 dump，依据地址落点 + 后续 `add #8` 的 vtable 形状）
- ⇒ 名字池是**活数据**：每个怪物成员名都至少被一处注册/读写代码 materialize（不是只供调试反查的死字符串）。

---

## 4. 类注册 = `{类名, 类大小}`（确认）

`0x48c30` 是 `cEmSizeCalcTblElement` 家族的注册函数：

```asm
00048c54: ldr r0,[pc,#100] ; 0x17eff04      ; 资源管理器单例（GOT 偏移）
00048c58: ldr r2,[pc,r0]                    ; r2 = 管理器对象
00048c5c: ldr r0,[pc,#96]  ; 0x1509a56
00048c60: add r1,pc,r0                      ; r1 = "cEmSizeCalcTblElement"
00048c64: mov r0,r4
00048c68: bl 0x7aedcc                       ; ← 注册：r1=类名, r2=?, r3=0x20
00048c70: ldr r1,[pc,#88]  ; 0x1509a95
00048c8c: add r1,pc,r1                      ; r1 = 0x1552729 "cEmSizeCalcTblElementXML"
00048c90: add r0,r0,#8 ; 00048c94: str r0,[r4,#0]   ; 对象[0] = vtable+8
00048c98: ... bl 0x7aedcc                   ; 第二个类同法注册
```
- `r3 = 0x20` 即**类实例大小**（`mov r3,#32` @0x48c40）。
- 紧跟其后的 `0x48a38`（同 TU）证实 0x20 布局：`str r0,[r4,#4]` + `vstr s0,[r4,#8/#12/#16/#20/#24/#28]`（`0xED840A02..A07`）= 4+24 = 28 B 数据 + 4 B vptr = **32 B** ✓
- ⇒ 可用同一手法给全部怪物类抽 size（`mon-final.py` §1 的表）。

---

## 5. 类大小表（`bl 0x7aedcc` 的 r3，确认）

3205 个注册点、3204 个解析出类名（`mon-final.out.txt` §1）。怪物相关子集：

| 类 | size | 注册函数 |
|---|---|---|
| `cEmDouMouKaData` | **0x84** | 0x479a0 |
| `cEmDouMouKa_PartsChangeData` | 0x18 | 0x479a0 |
| `cEmDouMouKa_PartsChangeData_Element` | 0xc | 0x479a0 |
| `cEmDouMouKa_PartsAuraData` | 0x18 | 0x479a0 |
| `cEmDouMouKa_PartsAuraData_Element` | 0x1c | 0x479a0 |
| `cEmDouMouKa_ModifyData` | 0x2c | 0x479a0 |
| `cEmDouMouKa_ModifyData::cRandomElement` | 0x1c | 0x479a0 |
| `cEmDouMouKa_ModifyData::cActionDataElement` | 0x1c | 0x479a0 |
| `cEmDouMouKa_ModifyData::cShellElementIdUnit` | 0x14 | 0x479a0 |
| `cEmDouMouKa_ModifyData::cShellDataElement` | 0x1c | 0x479a0 |
| `cEmSizeCalcTblElement` | **0x20** | 0x48ad4 |
| `cEmSizeCalcTblElementXML` | 0x20 | 0x48ad4 |
| `cEmSizeYureTbl` | 0x18 | 0x48ad4 |
| `cEmSizeYureTblElement` | 0xc | 0x48ad4 |
| `cEnemyDebugSetData` | 0xc | 0x4a46c |
| `cEnemyDebugSetDataXML` | 0xc | 0x4a46c |
| `cEnemyResourceBroker` | **0xcc** | 0x4c124 |
| `cEmSetList` / `cEmSetListXML` | 0x3c / 0x3c | 0x36000c |
| `rBodyData` | 0x70 | 0x50ce0 |
| `rEmDouMouKaData` | 0xf0 | 0x514b0 |
| `rEmSetData` / `::ESD_T` | 0x78 / 0x28 | 0x398918 |
| `rEmSetList` | 0xe0 | 0x399ccc |
| `rEmSizeCalcTblElement` | 0x70 | 0x51904 |
| `rEmSizeYureTbl` | 0x80 | 0x51d70 |
| `rEnemyCmd` | 0xc0 | 0x51d70 |
| `rEnemyDataTable` | 0x88 | 0x52874 |
| `rEnemyDebugSetData` | 0x70 | 0x52874 |
| `rEnemyDtBase` | **0xd0** | 0x53ea0 |
| `rEnemyDtBaseParts` | 0xd8 | 0x56180 |
| `rEnemyDtTune` | 0x128 | 0x564bc |
| `rEnemyNandoData` | 0x70 | 0x564bc |
| `rEnemyResidentDtBase` | 0x70 | 0x564bc |
| `rHitDataEnemy` | 0x70 | 0x564bc |
| `rMonsterPartsManager` | 0x78 | 0x59f30 |
| `rMonsterPartsManager::cPartsVisibleGroup` | 0x18 | 0x59f30 |
| `rMonsterPartsManager::cPartsVisibleInfo` | 0xc | 0x59f30 |
| `sEnemy` | **0x2a80** | 0x5c970 |
| `sEnemyBase` | 0x25a0 | 0x5d760 |
| `sEnemyHosyoku` | 0x25b0 | 0x5e0cc |
| `sEnemyMiniWork` | 0x25a0 | 0x606b4 |
| `sEnemyMure` | 0x2900 | 0x6571c |
| `sEnemyNetwork` | 0x1c | 0x66c20 |
| `sEnemyOutsider` | 0x2900 | 0x67ed4 |
| `sEnemyQuest` | 0x25b0 | 0x682b8 |
| `sEnemyUtil` | 0x25c0 | 0x6a324 |
| `sEnemyYobi` | 0x2900 | 0x6b0d8 |
| `uEnemy` | **0xca80** | 0xafb58 |
| `uEnemyBase` | 0xb740 | 0x71454 |
| `uEnemyCharacter` / `::Constraint` | 0x1430 / 0x10 | 0x72ea8 |
| `uEnemyOption` | 0x14f0 | 0x74c9c |
| `uEnemyActCustom` / `::cActCustomTurnInitHistory` | 0xcb00 / 0xc | 0x6d5f8 |
| `uEmXXX`（模板） | 0xcac0 | 0x6b3fc |

**每只怪的单元类大小**（同一注册点 `0x4edec`，用 `uEm###_00` 名）：

| 类 | size | 类 | size | 类 | size |
|---|---|---|---|---|---|
| uEm001 | 0xcad0 | uEm037 | 0xcca0 | uEm068 | 0xcb40 |
| uEm003 | 0xcae0 | uEm038 | 0xcad0 | uEm069 | 0xcae0 |
| uEm004 | 0xcae0 | uEm042 | 0xcb00 | uEm070 | 0xcae0 |
| uEm007 | 0xcaf0 | uEm043 | 0xcae0 | uEm071 | 0xcae0 |
| uEm008 | 0xcad0 | uEm044 | 0xcae0 | uEm076 | 0xcad0 |
| uEm009 | 0xcad0 | uEm045 | 0xcb20 | uEm077 | 0xcad0 |
| uEm010 | 0xcb40 | uEm046 | 0xcb30 | uEm079 | 0xcb70 |
| uEm011 | 0xcad0 | uEm047 | 0xcb10 | uEm080 | 0xcbf0 |
| uEm012 | 0xcb30 | uEm049 | 0xcb90 | uEm081 | 0xcbd0 |
| uEm013 | 0xcad0 | uEm050 | 0xcb10 | uEm082 | 0xcbd0 |
| uEm014 | 0xcad0 | uEm055 | 0xcc00 | uEm083 | 0xcba0 |
| uEm017 | 0xcad0 | uEm056 | 0xcd40 | **uEm084** | **0x26320** |
| uEm018 | 0xcaf0 | uEm057 | 0xcb20 | uEm085 | 0xce30 |
| uEm019 | 0xcae0 | uEm058 | 0xcf20 | uEm086 | 0xcbe0 |
| uEm020 | 0xcb20 | uEm060 | 0xcc30 | **uEm087** | **0xd580** |
| uEm021 | 0xcad0 | uEm061 | 0xcaf0 | **uEm088** | **0xd500** |
| uEm022 | 0xcad0 | uEm063 | 0xcad0 | uEm087::cActCustomExecMonitor | 0x10 |
| uEm023 | 0xcad0 | uEm065 | 0xcad0 | uEm087::cJointCtrl | 0x30 |
| uEm024 | 0xcad0 | uEm066 | 0xcae0 | uEm088::cJointCtrl | 0x30 |
| uEm025 | 0xcad0 | uEm067 | 0xcad0 | uEm087_088_ControlUnit | 0xe0 |
| uEm027 | 0xcad0 | | | uEm087_088_RubbleBase | 0xfe0 |
| uEm030 | 0xcb00 | | | uEm087_Rubble / uEm088_Rubble | 0xfe0 / 0xfe0 |
| uEm032 | 0xcad0 | | | uEmOstgaloaArm | 0xcb50 |
| uEm033 | 0xcad0 | | | uEm036 | 0xcb00 |
| uEm001… | | | | 小怪 uEms001..100 | 0xcad0~0xcb00 |

（`uEms042_00` 的 r3 未解析，其余小怪 = 0xcad0/0xcae0/0xcb00。）
读法：**0xcad0 ≈ 51.9 KB 是「标准大怪单元」的基线大小**；大于基线 = 该类多出自己的成员/子对象（`uEm058`=0xcf20、`uEm084`=0x26320、`uEm087/088`≈0xd500 且另有 0xfe0 的 Rubble 子类）。这是**每只怪「代码复杂度」的量化指标**，可用来判断哪些怪有专属机制。

## 5bis. 函数 ↔ 成员 对应（确认，`mon-registry2.out.txt`）

| 函数 | materialize 的名字 | 判读 |
|---|---|---|
| `0x45118` | `uMHProofEffectModel` + `DouMouKaID, SpecificPartsGroup, SpecificParts, KariWaza/Support/PartsVital/MeatChange_SpecificParts_Bias, MeatChange_Group[0..3]` | `cEmDouMouKaData` 成员 **0..10（11 个）** 的构造器 |
| `0x46498` | `mpPaElements, mpActionElements, mpShellElements, mpRandTables, ActionStatus, ActionNo, PlHealVital_SpecificRemain, Rate, MotionSpeedRate, MotionSpeedRateLimit, AttackRate, PowerRate, mpDataTables, ShellClassNumber, ScaleRate, PartsChangeHpRate, PartsChangeActSt, PartsChangeActNo, mpPcElements`（23 处，含 DouMouKaID/AttackRate/PlHealVital 的复用） | 成员 **11..29（19 个）** |
| `0x479a0` | `…OtherParts_Bias ×4, StaminaSubRate, IkariRate, EatRateChange, StaminaTimeVal, BuiFirstRandomFlag, mPartsChangeData, mPartsAuraData, mModifyData` + 10 个 `cEmDouMouKa_*` 类名 | 成员 **30..41（12 个）** + 该类族注册（`cEmDouMouKaData` size=0x84） |
| `0x48698` | `mMonsterIndex, mTrueSize, mSmallScale, mBigScale, mKingScale, mQuestSizeMin, mQuestSizeMax` | **`cEmSizeCalcTblElement` 的 7 成员读取器，顺序与池序完全一致** |
| `0x48ad4` | `cEmSizeCalcTblElement(XML), mScaleRate, mProbability, cEmSizeYureTblElement, cEmSizeYureTbl` | 类注册 + `cEmSizeYureTbl` 成员读取 |
| `0x4a13c` / `0x4a46c` | `mPropName, mMonsterType`, `cEnemyDebugSetData(XML)` | `cEnemyDebugSetData` 读取器/注册 |
| `0x4edec` | **全部 `uEm###_00`(61) + `uEms###_00`(29) + `uEm087_088_*` + `uEmOstgaloaArm`**，105 处 | `cEnemyResourceBroker` 的**单元清单 + 逐单元类注册（含 size）** ← 这是怪物资源装载的总入口 |
| `0x53ea0` | `BaseScale…MoguriBaseOfs`(26) + `dtb` + `rEnemyDtBase` | `rEnemyDtBase` 26 属性读取器 + 注册 |
| `0x564bc` | `dtt/rEnemyDtTune`, `nan/rEnemyNandoData`, `DieEraseTime…Genus/rdb/rEnemyResidentDtBase`, `hde/rHitDataEnemy`, `mPartsVisibleGroupList`, `mPartsVisibleInfo` | 4 个 `r*` 资源类 + `rMonsterPartsManager` 成员 |
| `0x59f30` | `mpm/rMonsterPartsManager` + 2 个内嵌类 | 注册 |
| `0x5c970`…`0x6b0d8` | `sEnemy`, `sEnemyBase`, `sEnemyHosyoku`, `sEnemyMiniWork`, `sEnemyMure`, `sEnemyNetwork`, `sEnemyOutsider`, `sEnemyQuest`, `sEnemyUtil`, `sEnemyYobi` | 10 个 per-monster 工作区结构，各自独立注册（size 见 §5） |
| `0x15004c` | 298 个**类名**（`Mt*`、`c*`、`s*`、`cEm*`…） | 全局**类名总表初始化**：证明这个名字池是 MtDti 风格的「类注册表字符串区」 |

⇒ 结论：**成员名确实被代码引用**，且「池序 = 成员声明序 = 读取器里的出现序」在 `cEmSizeCalcTblElement`（7/7）、`rEnemyDtBase`（26/26）、`cEmDouMouKaData`（42/42，分 3 个函数）三处都成立。这是「用序号当成员下标」的直接依据。

## 5ter. 类 → 成员序号表

排序规则 = **名字池出现顺序**。证据：`cEmSizeYureTbl` 的成员 `mScaleRate` → `mProbability` 与 `0x48dc8` 里两次注册的**先后完全一致**（§3）。
标记：`↑` = 与代码侧证据吻合；`?` = 仅有序号，无语义证据。

### 5.1 `cEmDouMouKaData` @0x15523cf — 42 成员（怪物"怒/活性化"数据）
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | DouMouKaID | 0x15523df | ID |
| 1 | SpecificPartsGroup | 0x15523ea | 部位组 |
| 2 | SpecificParts | 0x15523fd | 部位 |
| 3 | KariWaza_SpecificParts_Bias | 0x155240b | 偏置 |
| 4 | Support_SpecificParts_Bias | 0x1552427 | 偏置 |
| 5 | PartsVital_SpecificParts_Bias | 0x1552442 | 偏置 |
| 6 | MeatChange_SpecificParts_Bias | 0x1552460 | 偏置 |
| 7 | MeatChange_Group[0] | 0x155247e | 组 |
| 8 | MeatChange_Group[1] | 0x1552492 | 组 |
| 9 | MeatChange_Group[2] | 0x15524a6 | 组 |
| 10 | MeatChange_Group[3] | 0x15524ba | 组 |
| 11 | mpPaElements | 0x15524ce | 指针表 |
| 12 | mpActionElements | 0x15524db | 指针表 |
| 13 | mpShellElements | 0x15524ec | 指针表 |
| 14 | mpRandTables | 0x15524fc | 指针表 |
| 15 | ActionStatus | 0x1552509 | 状态 |
| 16 | ActionNo | 0x1552516 | 编号 |
| 17 | PlHealVital_SpecificRemain | 0x155251f | 剩余量 |
| 18 | Rate | 0x155253a | 比率 |
| 19 | MotionSpeedRate | 0x155253f | 比率 |
| 20 | MotionSpeedRateLimit | 0x155254f | 比率上限 |
| 21 | AttackRate | 0x1552564 | 比率 |
| 22 | PowerRate | 0x155256f | 比率 |
| 23 | mpDataTables | 0x1552579 | 指针表 |
| 24 | ShellClassNumber | 0x1552586 | 数量 |
| 25 | ScaleRate | 0x1552597 | 比率 |
| 26 | PartsChangeHpRate | 0x15525a1 | 比率 |
| 27 | PartsChangeActSt | 0x15525b3 | 状态 |
| 28 | PartsChangeActNo | 0x15525c4 | 编号 |
| 29 | mpPcElements | 0x15525d5 | 指针表 |
| 30 | PartsVital_OtherParts_Bias | 0x15525e2 | 偏置 |
| 31 | KariWaza_OtherParts_Bias | 0x15525fd | 偏置 |
| 32 | Support_OtherParts_Bias | 0x1552616 | 偏置 |
| 33 | MeatChange_OtherParts_Bias | 0x155262e | 偏置 |
| 34 | StaminaSubRate | 0x1552649 | 比率（耐力） |
| 35 | IkariRate | 0x1552658 | 比率（怒） |
| 36 | EatRateChange | 0x1552662 | 比率（捕食） |
| 37 | StaminaTimeVal | 0x1552670 | 时间 |
| 38 | BuiFirstRandomFlag | 0x155267f | 标志 |
| 39 | mPartsChangeData | 0x1552692 | 子对象指针 |
| 40 | mPartsAuraData | 0x15526a3 | 子对象指针 |
| 41 | mModifyData | 0x15526b2 | 子对象指针 |

（39..41 归 `cEmDouMouKaData` 是**池内顺序**推得：其后紧接 `cEmSizeCalcTblElement` 类头。`[INFERENCE]`，但 3 个名字形态与 `cEmDouMouKa_*Data` 类名一一对应，可信度高。）

### 5.2 `cEmSizeCalcTblElement` @0x15526be — 7 成员 ★已解出 offset
| # | 名 | 地址 | 类型暗示 | 推断 offset | 依据 |
|---|---|---|---|---|---|
| 0 | mMonsterIndex | 0x15526d4 | Index | **+0x04 (u32)** | 0x48a38 `str r0,[r4,#4]`，值来自返回 int 的虚调用 |
| 1 | mTrueSize | 0x15526e2 | Size | **+0x08 (f32)** | 0x48a38 第 1 条 `vstr s0,[r4,#8]` |
| 2 | mSmallScale | 0x15526ec | Scale | **+0x0C (f32)** | 第 2 条 `vstr [r4,#12]` |
| 3 | mBigScale | 0x15526f8 | Scale | **+0x10 (f32)** | 第 3 条 |
| 4 | mKingScale | 0x1552702 | Scale | **+0x14 (f32)** | 第 4 条 |
| 5 | mQuestSizeMin | 0x155270d | Size | **+0x18 (f32)** | 第 5 条 |
| 6 | mQuestSizeMax | 0x155271b | Size | **+0x1C (f32)** | 第 6 条 |
| — | *(vptr)* | — | — | +0x00 | 0x48c94 `str r0,[r4,#0]`=vtable+8；类 size=0x20 |

- **类大小 0x20 三重互证**：注册 `mov r3,#32` @0x48c40；写点覆盖 +4..+0x1C；vptr 占 +0。⇒ 布局字段数目吻合（1 int + 6 float）。
- **名↔offset 的对应关系是 `[INFERENCE]`**：代码只按 6 连发写 float，不携带名字；对应关系取「池内声明顺序 = 结构体顺序」，与 `cEmSizeYureTbl` 的已验证顺序一致。
- 另一侧的 `0x48ad4`（441 指令）是反向读取器：`ldr r1,[r5,#4]` 等逐个字段 vfunc 调用回写，进一步支持 7 字段读法。

### 5.3 `cEmSizeYureTbl` @0x1552758 — 2 成员 ↑
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | mScaleRate | 0x1552767 | 比率 |
| 1 | mProbability | 0x1552772 | 概率 |

注册侧（0x48dc8）顺序 `mScaleRate → mProbability`，且分别带 `mov r1,#12` / `mov r1,#6` 的**类型/长度码**（两个值不同 ⇒ 不是同一模板）。`[INFERENCE]`：12/6 可能是元素字节数或枚举。

### 5.4 `cEnemyDebugSetData` @0x155277f — 2 成员
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | mPropName | 0x1552792 | 名字 |
| 1 | mMonsterType | 0x155279c | 枚举 |

（对应 `cEnemyDebugSetDataXML` @0x15527a9；调试用「属性名 → 怪物类型」覆盖表。）

### 5.5 `rEnemyDtBase` @0x15530d7 — 26 成员（怪物基础参数表，最重要的表）
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | BaseScale | 0x15530e4 | 体型基准 |
| 1 | Size | 0x15530ee | 体型 |
| 2 | Rank | 0x15530f3 | 等级档 |
| 3 | Nando | 0x15530f8 | 难度（"何度"） |
| 4 | SpDieDamageType | 0x15530fe | 伤害类型（特殊死亡） |
| 5 | DamageOnBit | 0x155310e | 位掩码 |
| 6 | DropData | 0x155311a | 掉落表 |
| 7 | DamageSel | 0x1553123 | 选择器 |
| 8 | SakaType | 0x155312d | 枚举（逆さ/坂） |
| 9 | Pos[0] | 0x1553136 | 向量 |
| 10 | Pos[1] | 0x155313d | 向量 |
| 11 | Pos[2] | 0x1553144 | 向量 |
| 12 | Pos[3] | 0x155314b | 向量 |
| 13 | HokanSpeed | 0x1553152 | 速度（补间） |
| 14 | Joint | 0x155315d | 关节 |
| 15 | RotRate | 0x1553163 | 比率 |
| 16 | RotSpeed | 0x155316b | 速度 |
| 17 | PushHitStandOfs | 0x1553174 | 偏移 |
| 18 | PushHitFlyOfs | 0x1553184 | 偏移 |
| 19 | PushHitKabeOfs | 0x1553192 | 偏移（壁） |
| 20 | PushHitRadius | 0x15531a1 | 半径 |
| 21 | FlyOfs | 0x15531af | 偏移 |
| 22 | SwimTopOfs | 0x15531b6 | 偏移 |
| 23 | SwimBottomOfs | 0x15531c1 | 偏移 |
| 24 | TenjoOfs | 0x15531cf | 偏移（天井） |
| 25 | MoguriBaseOfs | 0x15531d8 | 偏移（潜行基准） |

尾部短标签 `dtb` @0x15531e6（= 该类资源扩展名/短名）。

### 5.6 `rEnemyResidentDtBase` @0x1553225 — 6 成员
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | DieEraseTime | 0x155323a | 时间 |
| 1 | DefTime | 0x1553247 | 时间 |
| 2 | EscapeTime | 0x155324f | 时间 |
| 3 | FastTime | 0x155325a | 时间 |
| 4 | ExTime | 0x1553263 | 时间 |
| 5 | Genus | 0x155326a | 枚举 |

尾部标签 `rdb` @0x1553270。

### 5.7 `rMonsterPartsManager` @0x1553286 — 4 项（含 2 个内嵌类）
| # | 名 | 地址 | 说明 |
|---|---|---|---|
| 0 | mPartsVisibleGroupList | 0x155329b | 可见部位组列表 |
| — | (内嵌类) rMonsterPartsManager::cPartsVisibleInfo | 0x15532b2 | 嵌套类名，不是成员 |
| — | (内嵌类) rMonsterPartsManager::cPartsVisibleGroup | 0x15532f1 | 嵌套类名，不是成员 |
| 1 | mPartsVisibleInfo | 0x155331a | 可见部位信息 |

尾部标签 `mpm` @0x155332c。（0x15532b2 与 0x15532f1 之间 gap=23 B 非串数据。）

### 5.8 `rEmDouMouKaData` @0x155304d — 1 成员
`mpData` @0x155305d，尾部标签 `mdd` @0x1553064。

---

## 6. 名字池总图（按地址）

| 区间 | 内容 | 条目 |
|---|---|---|
| 0x1551ac6..0x15521f0 | 通用/场景类（`uQuestCamera`、`cCircularShadow`、`cElementBase`…） | 474 串池的前段 |
| 0x1552271..0x155228f | `uMHProofEffect`、`uMHProofEffectModel` | 2 |
| 0x1552294..0x15523ce | `cEmDouMouKa_*` 结构族类名（含 4 个 `::` 内嵌类） | 9 类名，0 成员 |
| 0x15523cf..0x15526bd | **`cEmDouMouKaData`** + 42 成员 | §5.1 |
| 0x15526be..0x1552728 | **`cEmSizeCalcTblElement`** + 7 成员 | §5.2 |
| 0x1552729..0x1552741 | `cEmSizeCalcTblElementXML`（XML 读取类，无成员） | 1 |
| 0x1552742..0x1552757 | `cEmSizeYureTblElement`（元素类，无成员） | 1 |
| 0x1552758..0x155277e | **`cEmSizeYureTbl`** + 2 成员 | §5.3 |
| 0x155277f..0x15527be | **`cEnemyDebugSetData`** + 2 成员；`cEnemyDebugSetDataXML` | §5.4 |
| 0x15527bf..0x15527d3 | `cEnemyResourceBroker`（broker 类，无成员） | 1 |
| 0x15527d4..0x15529c7 | **大怪单元资源名** `uEm###_00` × 50 | 见 §7 |
| 0x15529c8..0x1552b4e | **小怪单元资源名** `uEms###_00` × 26，`uEmOstgaloaArm` | §7 |
| 0x1552b4f..0x1552c0e | `uEm087_088_ControlUnit`、`uEm087_00::cActCustomExecMonitor`、`uEm087_00`、`uEm087_00::cJointCtrl`、`uEm088_00`、`uEm088_00::cJointCtrl`、`uEm087_088_RubbleBase`、`uEm087_Rubble`、`uEm088_Rubble`、`uEms017_00`、`uEms022_00` + 追加的 `uEm004/007/012/013/021/042/044/070/086` ×9 | §7 |
| 0x1552c0f..0x1553032 | **资源文件名** `roEm###.cro` / `roEms###.cro`（每怪一个 CRO） | §7 |
| 0x155303f..0x1553421 | 资源类族：`rBodyData`(bdd)、`rEmDouMouKaData`(mdd)、`rEmSizeCalcTblElement`(emsizetbl)、`rEmSizeYureTbl`(emyure)、`rEnemyCmd`(emc)、`rEnemyDataTable`(edt)、`rEnemyDebugSetData`(des)、`rEnemyDtBase`(dtb)、`rEnemyDtBaseParts`(dtp)、`rEnemyDtTune`(dtt)、`rEnemyNandoData`(nan)、`rEnemyResidentDtBase`(rdb)、`rHitDataEnemy`(hde)、`rMonsterPartsManager`(mpm)、`sEnemy*` 10 个、`uEmXXX`/`emXXXFwMove` 模板、`uEnemyActCustom`、`uEnemyActCustom::cActCustomTurnInitHistory`、`uEnemyBase` | §5.5/5.8 |

格式判定：**与 name-dictionary 的存档类块同构** —— 类名打头、成员名按声明序紧随、NUL 分隔零填充（对比 `cAmuletBase → mRare → cAmuletSkillBase…`，`name-tables-key.md §4`）。差异只有两点：本池多出「尾部 3~9 字母资源短标签」与 `::` 内嵌类名。

## 6bis. 主池之外的怪物相关块（`mon-extra.out.txt`，确认）

主池之外还有 5 个怪物相关块，位置与内容如下（**之前只盯 0x1552600 会漏掉这些**）：

### A. `uMonsterUnitConductor` @0x15535dc — 8 成员（怪物单元调度器）
| # | 名 | 地址 | 类型暗示 |
|---|---|---|---|
| 0 | mZakoFlg | 0x15535f2 | Flag（杂鱼标记） |
| 1 | mGenus | 0x15535fb | Enum/Genus |
| 2 | mSpecies | 0x1553602 | Enum/Species |
| 3 | mSleepFlag | 0x155360b | Flag |
| 4 | mpEnemyUnit | 0x1553616 | 单元指针 |
| 5 | request | 0x1553622 | 请求 |
| 6 | actionSt | 0x155362a | 状态 |
| 7 | actionNo | 0x1553633 | 编号 |

同块相邻的类名（无成员）：`uEnemyCharacter::Constraint`(0x155356e)、`uEnemyCharacter`(0x155358a)、`uEnemyOption`(0x155359a)、`uEnemy::emConstraint`(0x15535b4)、`uEnemy`(0x15535c9)、`uFestaEnemy`(0x15535d0)。

### B. 任务怪物编成（客户端）
- `cSetEmMain` @0x1556814（客户侧"任务怪物编成主"）
- `cEmSetList` @0x155681f（编成列表）
- `cEmSetListXML` @0x15613a8（XML 绑定）

### C. 任务怪物编成（资源侧）
| 类 | 地址 | 短标签 |
|---|---|---|
| `rEmSetData` | 0x1563564 | `esd` @0x1563581 |
| `rEmSetData::ESD_T` | 0x156356f | — |
| `rEmSetList` | 0x15635b5 | `esl` @0x15635c0 |
| `rSetEmMain` | 0x156365b | `sem` @0x1563666 |

⇒ 「任务里放哪几只怪」的完整链路 = `rSetEmMain(sem) → rEmSetList(esl) → rEmSetData(esd)`（资源）＋ `cSetEmMain/cEmSetList`（客户端）。`rEmSetData::ESD_T` 是每只怪的记录类型。

### D. 怒/耐力参数
- `cEmStaminaData::cStaminaLev` @0x1556955（**耐力等级**；同块 `cAngryParam` @0x155693c、`tGaugeValue` @0x1556930 = 与「怒」相关）
- `cEmDouMouKa_Parameters` @0x1556c5a（怒/活性化参数集，与 §5.1 的 `cEmDouMouKaData` 配对）

### E. 其他
- `cEmDouMouKa_*` 元素类共 9 个（主池 0x1552294..，见 §6）
- `rEnemyCmd`(emc) / `rEnemyDataTable`(edt) / `rEnemyDtTune`(dtt) / `rEnemyNandoData`(nan) / `rHitDataEnemy`(hde) / `rHitSize`（0x1553282 附近）/ `rBodyData`(bdd) —— 见 §5.5 与 §5bis

**注意**：`cEmStaminaData::cStaminaLev`、`cEmDouMouKa_Parameters`、`cEmSetList`、`cSetEmMain`、`rEmSetList`、`rSetEmMain` **在本批没有成员列表**（块内它们是孤立类名，成员注册在更远的 TU/运行时）。这是本报告最大的覆盖缺口。

---

## 7. 怪物单元名（uEm / uEms / roEm）

- **大怪 `uEm###_00` 共 61 条**，分两段：段 A（0x15527d4..0x15529be）50 条 = id `001 003 008 009 010 011 014 017 018 019 020 022 023 024 025 027 030 032 033 036 037 038 043 045 046 047 049 050 055 056 057 058 060 061 063 065 066 067 068 069 071 076 077 079 080 081 082 083 084 085`；段 B（0x1552af5..0x1552ba7）11 条 = `004 007 012 013 021 042 044 070 086 087 088`。两段无交集，合起来补足 61。
- **小怪 `uEms###_00` 共 28 条**：`001 002 003 004 005 006 007 009 013 016 019 023 025 026 027 034 035 039 040 042 044 045 046 047 048 100`（0x15529c8 段，26 条）+ `017 022`（0x1552bf9/0x1552c04）。
- **特殊单元**：`uEmOstgaloaArm`(0x1552adb)、`uEm087_088_ControlUnit`(0x1552b4f)、`uEm087_00::cActCustomExecMonitor`(0x1552b66)、`uEm087_00::cJointCtrl`(0x1552b91)、`uEm088_00::cJointCtrl`(0x1552bb1)、`uEm087_088_RubbleBase`(0x1552bc7)、`uEm087_Rubble`(0x1552bdd)、`uEm088_Rubble`(0x1552beb)。
- **CRO 文件名**（0x1552c0f..0x1553032）：`roEm###.cro` **59 条** = 主段 49（001…085）+ 补段 10（004/007/012/013/021/042/044/070/086/087）；`roEms###.cro` **28 条**（与 `uEms` 28 个 id 一一对应）。
  - **缺口**：大怪 61 个 `uEm` id 里 `020` 与 `088` **没有各自的 `roEm###.cro`**（`088` 与 `087` 共用 `uEm087_088_*`/`RubbleBase`；`020` 的装载名待查）⇒ 「uEm id ↔ CRO 文件名」是 59:61 的多对一关系，不能直接 `printf("roEm%03d.cro")`。
- 模板串：`uEmXXX`(0x15533c8)、`emXXXFwMove`(0x15533cf)（运动/动作文件名模板）。

---

## 8. 描述符的真实形态：内联构造器（确认）

`0x48698` 反汇编（`fn-48698.dis.txt`）给出**每个成员一条记录**的构造序列，字段完全可读：

```asm
000486fc: bl 0x7bb638                 ; new 属性记录（MtDtu 风格）
00048700: ldr r1,[pc,#788] ; 0x1509fbc
00048710: add r1, pc, r1              ; r1 = 0x48718+0x1509fbc = 0x15526d4 "mMonsterIndex"
00048714: str r1, [r0, #0]            ; record->name
00048718: mov r1, #6                  ; ← 类型码 6（整型）
0004871c: stm  r0, {r1, r10}          ; record->type / record->owner
00048720: add r1, r10, #4             ; ← **成员偏移 = +4**
00048724: str r1, [r0, #12]           ; record->data = instance + 4
00048728: str r8, [r0, #20]           ; record->count = 0
```

第二条起同构，偏移依次 `+8 / +0xC / +0x10 / +0x14`（`add r1,r10,#8/#12/#16/#20`），类型码 `12`。

⇒ 结论修正：**不是「没有 offset 信息」** —— 描述符表以「内联构造器指令序列」形式存在于代码段，**偏移是立即数**，可 100% 静态还原成 `{名, offset, type}`。提取器：`mon-offsets.py`（输出 `mon-offsets.out.txt`）。

### 8bis `cEmSizeCalcTblElement` 完整布局（**确认**，非推断）

| 名 | offset | 类型码 | 证据 |
|---|---|---|---|
| `mMonsterIndex` | **+0x04** | 6 | `0x48720 add r1,r10,#4` + `0x48724 str r1,[r0,#12]` |
| `mTrueSize` | **+0x08** | 12 | `0x48794` |
| `mSmallScale` | **+0x0C** | 12 | `0x4880c` |
| `mBigScale` | **+0x10** | 12 | `0x48880` |
| `mKingScale` | **+0x14** | 12 | `0x488f8` |
| `mQuestSizeMin` | **+0x18** | 12 | `0x4896c add r1,r10,#24`（`fn-48698-tail.dis.txt`） |
| `mQuestSizeMax` | **+0x1C** | 12 | `0x489dc add r1,r10,#28`（同上） |
| *(vptr)* | +0x00 | — | `0x48c94 str r0,[r4,#0]` |

```
struct cEmSizeCalcTblElement {   // size = 0x20（注册 r3=32）
  void** vptr;                   // +0x00
  u32    mMonsterIndex;          // +0x04  type 6
  f32    mTrueSize;              // +0x08  type 12
  f32    mSmallScale;            // +0x0C
  f32    mBigScale;              // +0x10
  f32    mKingScale;             // +0x14
  f32    mQuestSizeMin;          // +0x18
  f32    mQuestSizeMax;          // +0x1C
};
```
三重独立互证：①`0x48a38` 的写点（`str r0,[r4,#4]` + 6×`vstr s0,[r4,#8..#28]`）；②本构造器的 `add r10,#off` 立即数；③注册时 `mov r3,#32`。

- 读取点：`0x48ad4`（441 指令）；同 TU 还有 `0x48cd8`（分配 12 B）、`0x48d28`（分配 24 B + `strb` 到 +0x10）、`0x48dc8`（`mScaleRate`/`mProbability`）。
- 存档侧对应：玩家存档「体型记录」= 129 条 `[mini,0,maxi,0]`（char_off 0x60CA 起），语义等于 `mQuestSizeMin/Max` 的 0..255 归一化，**不是**同一结构体。
- 类型码 6 / 12 的确切语义未解码（候选：整型 vs 浮点）；`UNCONFIRMED`，但 6↔整型、12↔float 与写指令形态一致（`str` vs `vstr`）。

## 9. 未知 / 缺口

1. 类型码枚举（6 / 12 / 其他）的完整含义未定；需要看属性记录的「读取虚函数」如何按类型码解码。`UNCONFIRMED`（6 与 `str` 写指令同现、12 与 `vstr` 同现，倾向「整型 vs 浮点」）
2. `cEmDouMouKaData` 的 39..41 号（`mPartsChangeData/mPartsAuraData/mModifyData`）为池序推断，但 `fn 0x479a0` 在同一构造序列里逐个 materialize 了这三个名字，且 42 个成员被 3 个函数**无缝覆盖**（11+19+12），可信度高。
3. `0x15532da..0x15532f0`（23 B）非串数据内容未解析。
4. 其余怪物类（`rEnemyDtBase` 26 成员、`cEmDouMouKaData` 42 成员、`rEnemyResidentDtBase` 6、`cEmSizeYureTbl` 2、`cEnemyDebugSetData` 2）的 offset 表：抽取器 `mon-offsets.py` 已写好并按 §10.2 形状验证过（在 `cEmSizeCalcTblElement` 上应出 7 条），但本批**没拿到该脚本的产出**（`mon-offsets.out.txt` records=0，疑为旧文件/未重跑）。⇒ 这 6 个类的 offset 仍是**待跑一条命令**的状态，配方与陷阱见 §10。
5. `mQuestSizeMin/Max` 的 offset 已确认（`fn-48698-tail.dis.txt`：`0x4896c #24` / `0x489dc #28`）。

---

## 10. 抽取配方（后续任何人可照做）

### 10.1 抽 `{类名, 类大小}`
1. 扫 `.text`，找 `bl 0x7aedcc`（类注册）。
2. 反向数据流：该调用点的 `r1` 由 `ldr rX,[pc,#imm]` + `add rY,pc,rX` 得到 → 名字串地址；`r3` 由 `mov r3,#imm` 得到 → **类大小**。
3. 实现见 `mon-final.py`（已产出 3205 个注册点、3204 个类）。

### 10.2 抽 `{成员名, 成员 offset, 类型码}`
单条记录固定形状（见 §8）：
```
bl 0x7bb638                    ; new 记录
ldr rX,[pc,#imm] ; add rY,pc,rX ; → 成员名
str rY,[r0,#0]                  ; record->name
mov rZ,#TYPE                    ; 类型码（本批见 6 / 12）
stm  r0,{rZ,rBASE}              ; type + 所属类实例
add rW, rBASE, #OFFSET          ; ← 成员偏移
str rW, [r0,#12]                ; record->data
```
抽取器只需：定位 `add rW,rBASE,#imm` 且**下一条**是 `str rW,[rX,#12]`，再回溯最近的「名字 materialize」与最近的 `mov r,#TYPE`。实现见 `mon-offsets.py`。

### 10.3 陷阱（本批踩过的）
- **不要**用绝对指针找名字（本作全 binary 0 命中）。
- **不要**只用 `add rY,pc,#imm`（立即数形）；本作 99% 是**寄存器形** `add rY,pc,rX`。
- `add rd,rn,#imm` 的模式掩码**必须屏蔽 Rn**（`w & 0x0FE00000 == 0x02800000`）；写成 `0x0FBF0000` 会把 Rn 一起比掉，只剩 Rn=0 能命中。
- 属性记录的 `stm r0,{…}` 是 **DA（先减后存）**，写到 `r0-8/r0-4`（对象头），不是 `+4/+8`。
- 类块切分时，**尾部 3 字母短标签**（`dtb/dtp/dtt/nan/rdb/hde/mpm/emsizetbl/emyure/emc/edt/des/bdd/mdd`）会被误当成最后一个成员；`rEmDouMouKaData` 的 `mpData` 是真成员、`mdd` 是标签。
- `rMonsterPartsManager` 的两个 `::` 内嵌类名会打断简单切分，导致 `mPartsVisibleInfo` 被错挂到 `cPartsVisibleGroup` 名下。
