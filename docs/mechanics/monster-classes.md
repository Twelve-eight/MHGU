# 怪物相关类的成员布局（代码侧取证，2026-10-23）

> 方法：`main.140.flat.bin` 中「类注册函数」的成员注册链：
> `bl 0x7bb638`(new 属性记录) → `ldr r1,[pc]; add r1,pc,r1`(取成员名串) → `str r1,[r0]`(记录名) → `mov r1,#type` → `stm r0,{r1,r10}` → `add r1,r10,#off` → `str r1,[r0,#12]`(实例+偏移)。
> 因此 **offset 与 type 都是代码立即数**，非推断。工具：`.tmp/mhgu/mon/mon-offsets.py`。
> `type` 是引擎的属性类型码（0/2/4 多为 1 字节、6 为 16/32 位、12 为 f32 或 4 字节数值），语义按 MH 系列惯例标 `[INFERENCE]`。

| 注册函数 | 记录数 | 对应类（据成员名池归属） |
|---|---|---|
| `0x4201c` | 4 | 见下 |
| `0x45118` | 11 | 见下 |
| `0x46498` | 23 | 见下 |
| `0x479a0` | 11 | 见下 |
| `0x48698` | 7 | 见下 |
| `0x48ad4` | 2 | 见下 |
| `0x4a13c` | 2 | 见下 |
| `0x4a46c` | 2 | 见下 |
| `0x50ce0` | 1 | 见下 |
| `0x53ea0` | 22 | 见下 |
| `0x564bc` | 9 | 见下 |
| `0x6b3fc` | 1 | 见下 |
| `0x23aad0` | 1 | 见下 |
| `0x23ac70` | 1 | 见下 |
| `0x8214e4` | 1 | 见下 |
| `0x88c9a8` | 1 | 见下 |
| `0x8a2a1c` | 1 | 见下 |
| `0x8af8d0` | 1 | 见下 |
| `0x90bbf0` | 1 | 见下 |
| `0x9683b8` | 1 | 见下 |
| `0x968d78` | 1 | 见下 |
| `0xb31f7c` | 1 | 见下 |
| `0xb88630` | 1 | 见下 |
| `0xba4be4` | 1 | 见下 |
| `0xc61bb4` | 1 | 见下 |
| `0xcdcad8` | 1 | 见下 |
| `0xcdf830` | 1 | 见下 |

## `0x4201c` — 4 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x1AC` | 0 | `mTimer` | `0x4234c` |
| `+0x1B4` | 0 | `mUniqueId` | `0x42438` |
| `+0x1B8` | 6 | `mPriority` | `0x42528` |
| `+0x1BC` | 12 | `mForceKillTimer` | `0x42594` |

## `0x45118` — 11 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 4 | `DouMouKaID` | `0x45f94` |
| `+0x5` | 4 | `SpecificPartsGroup` | `0x46008` |
| `+0x6` | 4 | `SpecificParts` | `0x46080` |
| `+0x8` | 12 | `KariWaza_SpecificParts_Bias` | `0x460f4` |
| `+0xC` | 12 | `Support_SpecificParts_Bias` | `0x4616c` |
| `+0x10` | 12 | `PartsVital_SpecificParts_Bias` | `0x461e0` |
| `+0x14` | 12 | `MeatChange_SpecificParts_Bias` | `0x46258` |
| `+0x18` | 4 | `MeatChange_Group[0]` | `0x462cc` |
| `+0x19` | 4 | `MeatChange_Group[1]` | `0x46344` |
| `+0x1A` | 4 | `MeatChange_Group[2]` | `0x463b8` |
| `+0x1B` | 4 | `MeatChange_Group[3]` | `0x46428` |

## `0x46498` — 23 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 1 | `mpActionElements` | `0x4686c` |
| `+0x4` | 1 | `mpPaElements` | `0x4662c` |
| `+0x4` | 1 | `mpPcElements` | `0x476a4` |
| `+0x4` | 4 | `ActionStatus` | `0x46bc0` |
| `+0x4` | 4 | `DouMouKaID` | `0x46a80` |
| `+0x4` | 4 | `DouMouKaID` | `0x470ac` |
| `+0x4` | 4 | `ShellClassNumber` | `0x471ec` |
| `+0x4` | 12 | `PartsChangeHpRate` | `0x4741c` |
| `+0x5` | 4 | `ActionNo` | `0x46c34` |
| `+0x6` | 9 | `PlHealVital_SpecificRemain` | `0x46cac` |
| `+0x8` | 1 | `mpDataTables` | `0x47118` |
| `+0x8` | 1 | `mpRandTables` | `0x46aec` |
| `+0x8` | 4 | `PartsChangeActSt` | `0x47490` |
| `+0x8` | 4 | `Rate` | `0x46d20` |
| `+0x8` | 12 | `AttackRate` | `0x47260` |
| `+0x9` | 4 | `PartsChangeActNo` | `0x47500` |
| `+0xC` | 12 | `MotionSpeedRate` | `0x46d98` |
| `+0xC` | 12 | `ScaleRate` | `0x472d8` |
| `+0x10` | 9 | `PlHealVital_SpecificRemain` | `0x47344` |
| `+0x10` | 12 | `MotionSpeedRateLimit` | `0x46e0c` |
| `+0x14` | 12 | `AttackRate` | `0x46e84` |
| `+0x18` | 1 | `mpShellElements` | `0x468d8` |
| `+0x18` | 12 | `PowerRate` | `0x46ef0` |

## `0x479a0` — 11 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 0 | `PartsVital_OtherParts_Bias` | `0x47c0c` |
| `+0x8` | 0 | `KariWaza_OtherParts_Bias` | `0x47c84` |
| `+0xC` | 0 | `Support_OtherParts_Bias` | `0x47d00` |
| `+0x10` | 0 | `MeatChange_OtherParts_Bias` | `0x47d78` |
| `+0x14` | 0 | `StaminaSubRate` | `0x47df4` |
| `+0x18` | 0 | `IkariRate` | `0x47e6c` |
| `+0x1C` | 0 | `EatRateChange` | `0x47ee8` |
| `+0x20` | 0 | `StaminaTimeVal` | `0x47f60` |
| `+0x24` | 0 | `BuiFirstRandomFlag` | `0x47fe0` |
| `+0x40` | 0 | `mPartsAuraData` | `0x480d0` |
| `+0x58` | 0 | `mModifyData` | `0x48134` |

## `0x48698` — 7 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 6 | `mMonsterIndex` | `0x48720` |
| `+0x8` | 12 | `mTrueSize` | `0x48794` |
| `+0xC` | 12 | `mSmallScale` | `0x4880c` |
| `+0x10` | 12 | `mBigScale` | `0x48880` |
| `+0x14` | 12 | `mKingScale` | `0x488f8` |
| `+0x18` | 12 | `mQuestSizeMin` | `0x4896c` |
| `+0x1C` | 12 | `mQuestSizeMax` | `0x489dc` |

## `0x48ad4` — 2 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 12 | `mScaleRate` | `0x48e20` |
| `+0x8` | 6 | `mProbability` | `0x48e8c` |

## `0x4a13c` — 2 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 0 | `mPropName` | `0x4a2a0` |
| `+0x8` | 0 | `mMonsterType` | `0x4a310` |

## `0x4a46c` — 2 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 0 | `mPropName` | `0x4a5f4` |
| `+0x8` | 0 | `mMonsterType` | `0x4a664` |

## `0x50ce0` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x68` | 1 | `mpData` | `0x5137c` |

## `0x53ea0` — 22 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x1` | 4 | `DamageSel` | `0x543bc` |
| `+0x4` | 12 | `RotRate` | `0x54784` |
| `+0x4` | 35 | `Pos[0]` | `0x544ac` |
| `+0x8` | 12 | `RotSpeed` | `0x54800` |
| `+0xC` | 35 | `PushHitFlyOfs` | `0x548f0` |
| `+0x10` | 35 | `Pos[1]` | `0x54528` |
| `+0x18` | 35 | `PushHitKabeOfs` | `0x54968` |
| `+0x1C` | 35 | `Pos[2]` | `0x545a0` |
| `+0x28` | 35 | `Pos[3]` | `0x5461c` |
| `+0x30` | 12 | `PushHitRadius` | `0x549e4` |
| `+0x34` | 4 | `HokanSpeed` | `0x54694` |
| `+0x64` | 12 | `BaseScale` | `0x54080` |
| `+0x68` | 4 | `Size` | `0x540f4` |
| `+0x69` | 4 | `Rank` | `0x5416c` |
| `+0x6A` | 4 | `Nando` | `0x541e0` |
| `+0x6B` | 4 | `SpDieDamageType` | `0x54258` |
| `+0x6C` | 6 | `DamageOnBit` | `0x542cc` |
| `+0x98` | 12 | `FlyOfs` | `0x54a58` |
| `+0x9C` | 12 | `SwimTopOfs` | `0x54ad0` |
| `+0xA0` | 12 | `SwimBottomOfs` | `0x54b44` |
| `+0xA4` | 12 | `TenjoOfs` | `0x54bbc` |
| `+0xA8` | 12 | `MoguriBaseOfs` | `0x54c28` |

## `0x564bc` — 9 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 0 | `mPartsVisibleGroupList` | `0x59bec` |
| `+0x4` | 1 | `mPartsVisibleInfo` | `0x59ecc` |
| `+0x4` | 9 | `DefTime` | `0x590a0` |
| `+0x6` | 9 | `EscapeTime` | `0x5911c` |
| `+0x8` | 3 | `mPartsVisibleGroupList` | `0x59c58` |
| `+0x8` | 9 | `FastTime` | `0x59194` |
| `+0xA` | 9 | `ExTime` | `0x59210` |
| `+0xC` | 4 | `Genus` | `0x59280` |
| `+0x64` | 1 | `mPartsVisibleGroupList` | `0x59964` |

## `0x6b3fc` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x30` | 3 | `mUnitActiveFlag` | `0x6b870` |

## `0x23aad0` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x6` | 4 | `mProbability` | `0x23abc8` |

## `0x23ac70` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x6` | 4 | `mProbability` | `0x23ae1c` |

## `0x8214e4` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0xE8` | 10 | `Rank` | `0x82180c` |

## `0x88c9a8` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x8C` | 6 | `mPriority` | `0x88cb94` |

## `0x8a2a1c` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x114` | 0 | `mTimer` | `0x8a2b68` |

## `0x8af8d0` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x34` | 6 | `mPriority` | `0x8af9a0` |

## `0x90bbf0` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x38` | 6 | `mPriority` | `0x90be2c` |

## `0x9683b8` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x38` | 10 | `mPriority` | `0x96852c` |

## `0x968d78` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x264` | 6 | `mPriority` | `0x969698` |

## `0xb31f7c` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x48` | 6 | `mPriority` | `0xb321c0` |

## `0xb88630` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x32` | 4 | `mPriority` | `0xb88af0` |

## `0xba4be4` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x20` | 0 | `mTimer` | `0xba4e34` |

## `0xc61bb4` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x78` | 6 | `mTimer` | `0xc62b08` |

## `0xcdcad8` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x4` | 2 | `mpData` | `0xcdf0d0` |

## `0xcdf830` — 1 个成员

| offset | type | 成员名 | 注册点 |
|---|---|---|---|
| `+0x84` | 6 | `mPriority` | `0xce0050` |

