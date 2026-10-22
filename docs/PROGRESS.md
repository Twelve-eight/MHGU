# MHGU 逆向与存档编辑器 — 总进度报告

> 生成：2026-10-22 | 状态：P0 全部完成并过审；P1/P2/P3 主体完成，剩 6 项

## 一、已交付的成品

### 1. 道具箱扩容补丁（V7，已实机确认）
- `patch/1.4.0.pchtxt` 123 行，道具箱 **2300 → 2992 槽（30 页）**
- 用户已实机确认 30 页 ✓
- 布局后移 +0xAD0：B `0x240A→0x2EDA`、C `0x47FA→0x52CA`、D `0x59F2→0x64C2`、heap `0x62F0→0x6DC0`、preset `0x62F4→0x6DC4`、obj `0x72E4→0x7DB4`
- 位流：19bit/槽 LSB-first，2992 槽 = 7106B @ `+0x278`；预设块 `+0x1E3A`（14 套 × 170B + 57B pad）

### 2. 存档编辑器（`editor-src/`，net472）
| 修复 | 效果 | 验证 |
|---|---|---|
| **ItemsForm 双布局探测** | V7(2992/7106B/14套) vs 原版(2300/5463B/24套) 自动识别，单字节探针 `h[0x17CF]==0` | 编译 0 错；探测在两档实测分离 |
| **口袋面板（新增）** | 32 槽 × 19bit，与道具箱同编码 | 反射冒烟：解码前 12 槽与独立 JS 一致；76B 往返 **0 差异** |
| **任务 Clear 双写** | cleared(0x42C)+seen(0x52C) 同位双写，消除「卡对话」矛盾向量 | 编译通过；越界 guard 锁 cleared 段 |
| **EquipsForm 钳制** | 9 处 NUD 钳位 + 套名读20B无NUL崩溃修复 + X1 武器 LV 少+1 | 编译 0 错 |
| **TrainingForm data 11bit** | 补写原永不落盘的武器组合字段 | round-trip 位编码验证全过；swe2 PASS |
| **MainForm 槽标志** | clear 写 0x28+slot（原误写 0x04+slot 污文件头）；导入空槽同步写文件标志 | swe2 全部【对】 |
| **MonsterForm 第二段起点** | `24454/24728/25226` → `24372/24646/25062`（原跳过 41 个非零计数器读到全 0 区） | 字节实测确认 |
| **勋章 A/B delta 镜像** | 只同步本次新增位到 B 槽，不覆盖既有内容 | 模拟验证：clean A=B=132；dirty B 保持 33 位不变 |
| **CatArmsUnlock 停用** | 该写点落在 128B 记录族内、跨记录涂 FF；swe2 复核四条断言全成立 | swe2 PASS |
| **共享 WriteUtf8Field** | 两 Form 名字写回统一，按字符截断防切碎 UTF-8 | 编译 0 错 |

## 二、卡对话根因（已定案）

**机理**：编辑器旧版「任务Clear/解锁」只置 `cleared(obj+0x42C)` 不补 `seen(obj+0x52C)` → 造出 `cleared=1 & seen=0` 矛盾位向量。

**实测**：clean 档 0 个矛盾位；dirty 档 **501 个**（slot0:122 高位 G4/deviant + slot1:379 低位村下位）。

**位号语义**：`bit n = questId n`（三次独立印证：dirty 涂块落在 questId 785-864/946-1173 区间、斗技写点 11544 = bit 1288 恰对斗技 questId 1288-1304、clean seen 命中 Hunter Training id 1174-1180）。运行时另有一套按 questId 寻址的位图 `+0x35F0` 族，与存档位图并存但独立。

**修复**：`0x42C` + `0x52C` 同位双写 + 前置闭包。**边界**：复合门禁类（case12 `[mgr+0x3618]`）还需等级腿；锁任务清位需重启游戏生效。

**脏档收敛**：`seen |= cleared` 脚本产出 `save-snapshots/20261022-v6-ready/system_fixed`（501→0），**待实机验证**。

## 三、存档字段测绘成果

### 成员#4（任务/进度对象）
- 文件跨度 `0x280B..0x62EE`，**15075B 精确闭合**：`1024 + 12951 + 274 + 274 + 552`
- **134 行**权威字段表（`docs/save-layout/member4-file-layout.txt`），末行 `file+size == 0x5EA2` 精确命中
- 关键更正：`ldr r0,[r5,#2384]` 的 **2384 是十进制** ⇒ 实为 `obj+0x950/0x954`（表指针 + count）
- `obj+0x0..0x28` **不是角色头副本**（反序列化链在 `0x446C` 后即返回，从不读那些偏移）

### 已定名的结构
| 结构 | 位置 | 语义 |
|---|---|---|
| 任务三态位域 | `0x42C / 0x52C / 0x62C`（各 256B）| cleared / seen / achieve |
| 狩技 | `0xD24 / 0xD3C / 0xD54`（各 24B）| `mSupperArtsX1/X2/X3[0..4]` |
| **288B 族** | `0x16C8 + 0x360g` × 5 组 | **`cTrialArts` 位图**：18 成员 × 48B = 864 = 组步长；分片①`mGuild+mOld` 落盘、②`mAirhike+mBushi` **不落盘**、③`mKizuna+mTatsujin` 落盘 |
| 68B 族 | `0x27A8..` | `u32[id>>5]` 位图（3 槽一组，中槽不落盘）|
| 164B 对 | `0x9D0 / 0xB18` | 1312-bit 状态位图双槽，`B ⊆ A`，无 gameplay 消费者 |
| 20B 族 | `0xBDC..0xC64` | 含 **132bit 勋章双槽**（A=12631 / B=12651）|
| 128B 族 | `0x2A78 + 0x80k` × 15 | 136B 槽 = `1F`/`1E` 半槽；按位寻址状态数组 |
| 尾 3444B | `0x3684` | 不透明 blob，**全 .text 仅 writer/reader 两站点** |
| **怪物统计** | `obj+0x72C`(击杀) / `+0x83E`(捕获) | **137 × u16 计数器**（`274 = 137×2`），非位域 |
| 尺寸记录 | `0x60C6..0x62EE`（552B）| min/max 双值对 |
| 口袋 | `10175..10250` | 32 槽 × 19bit（id12+cnt7）|
| **猫记录** | `146358`（0x23BB6）| 84 × 324B（CatsForm）|
| 套装预设 | `0x208CE`（133326）| 40 × **136B**（42B 名 + 字段）|
| 装备箱 | `0x62EE`（25326）| 2000 × 36B |
| 装饰珠候选 | `0x17C2E`（97326）| 装备箱后，36B stride，仅前 20 槽有数据，id 仅 22/23/24 |

### 名字字典（方法论突破）
flat.bin 全量扫出 **106 块 / 4782 个标识符**（`docs/save-layout/name-dictionary.txt`，118KB）。
- **不是** `(name, offset)` 注册表（7 个字符串全 .text ldr-literal 扫描 0 命中）
- 是**连续序列化描述符流**；`cXxx` 后紧跟的连续 `m*` = 它的成员
- **尺寸闭合校验法**：`cTrialArts` 18 成员 × 48B = 864 = 写循环 `mla #864` 精确相等

**容量锚点**（权威，已防重查）：
`mItemType/mItemNum` = 160（猫装备，`cAcNyanterEquip`）· `mEqDeco1/2/3` = 30（装饰珠）· `mGuild/mOld` = 3 · `mSupperArtsX1/2/3` = 5 · `mPermitLv` = 16 · `mListData` = **80**（委托列表）

## 四、干净参照档（`save-snapshots/20261022-clean-reference/`）
| 文件 | 说明 |
|---|---|
| `system_CLEAN` | **唯一全干净档**（slot1 猎人A@0x2AC560，94 cleared，0 矛盾位），只读保护 |
| `system_Desktop_extra` | 混合档：slot0 干净（==clean 猎人B 参照）+ slot1 脏 |
| `system_V7_active` + 两个 `.hnt` | 现玩 V7 档 |
| `system_fixed`（v6-ready/）| 501 矛盾位收敛产物，待实机 |

镜像备份：`G:/backups/MHGU/save-snapshots/`（robocopy）

## 五、剩余 6 项
| 项 | 状态 |
|---|---|
| 卡对话根治（501 矛盾位逐位定性）| **等你**：需 猎人B 实际任务进度，或我 dump questId 清单给你对 |
| 口袋面板 UI 实机冒烟 | **等你**：需实机开编辑器验证 |
| 猫装备箱槽数上限 | **等你**：需实机装满猫装备后 dump |
| 128B 族内部切分 + 成员#4 剩余字段 | 等 `Rec128Split` |
| 164B 对语义定案 | 等 `Fam164Concept` |
| romfs 任务表 | **阻塞**：`0eb59f…nca` 是补丁层，需 11.9GB base NCA 合并；非关键路径 |

## 六、关键教训（已写入 DEVLOG）
1. `arm32.mjs` 的 `disasm(vaddr, **count**)` 第二参数是**条数**不是结束地址（误用产生 187MB 字符串 + VM 重置）
2. **文件名与坐标混用**：`ldr [r5,#2384]` 是**十进制** ⇒ obj+0x950，曾误判为 0x2384
3. **char_off ↔ obj_off 不是固定 delta**，禁止用 ±常数推偏移
4. **`dirty=FF` ≠ 编辑器所为**：至少存在第三个写者
5. 派生数据（25MB flat.bin）不进 git；知识产物必须从 `.tmp` 迁入 `docs/` 并 commit
