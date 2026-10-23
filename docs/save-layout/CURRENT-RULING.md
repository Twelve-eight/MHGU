# MHGU 任务解锁 — 现行定案（2026-10-22，swe2 复核后收口）

## 两套位图并存（关键区分，勿混坐标系）
| 位图 | 位置 | 寻址 | 写者 | 用途 |
|---|---|---|---|---|
| **存档位域** | obj+0x42C(cleared)/+0x52C(seen)/+0x62C(achieve) 各256B | **记录序号 i**（1起，=任务表行号）| `0x51e6d8` 逐位 or | 存档持久化，`0x525040` 判定器读 |
| **运行时位图** | obj+0x35F0/+0x35FC/+0x3608 | **questId** | `0x523e44`(questId→idx→置位) | `0x524e58` 每次重建，只增不清 |

**位号实质 = 记录序号 i**，而 i 与 questId 关系 = M1(id有序则 i==id)/M2(子表序→i≠id)。swe2 dirty-分布反推 + clean seen 命中 Hunter Training id 1174-1180 **倾向 M1**（位号≈questId），但 `0x526a38` 返回的是**序号 i 不是 id**——两者数值接近因运行时表按全局 id 有序。

**待实机判据**（唯一能终结 M1/M2 的实验）：改一个已知 questId 的位，看它在 0x42C 落在 `questId` 还是 `序号`——advisory :96 的 id946→char_off 11501 bit 测试。

## 卡对话根因（实锤）
编辑器旧版「任务Clear/解锁」**只置 cleared(0x42C) 不补 seen(0x52C)** → dirty 档 **501 个 `cleared=1&seen=0` 矛盾向量**（slot0:122高位 questId 785-1173 + slot1:379低位 40+）。`0x521d4c` 导出器/`0x525040` 判定器喂 NPC 不可能态 → 死锁。

## 编辑器修复（已落地）
`OtherForm.SetBits(off,val,or)`：cleared 写点（char_off 11383-11546）同位双写 seen(+256)。guard 锁 cleared 段。
**边界**：seen=1/cleared=0（仅解锁未完成）是另一功能，当前按钮是"完成"语义（双1）。

## 501 矛盾位处置【待定 — 勿一键清】
矛盾位号（=questId 候选）落在 G4(785-864)/deviant(946-1173)/村下位(40+)。分两种情况：
- (a) 真进度被漏补 seen → `seen |= cleared`
- (b) 纯涂块垃圾位 → `cleared &= seen`
**需对照玩家实际任务清单定性再收敛**。low位(40,59,60…村下位)更可能是(a)真进度；高位无对应任务的是(b)。

## 编辑器 bug 全清单（P0 已修）
见 ROUND-SUMMARY.md 表格。已修：ItemsForm V7(f23128a+8426bc5)/OtherForm 双写(156e6a0+1f933af)/EquipsForm 钳制(efce3dd+8861ed7+97eeeec)/TrainingForm data(dfb861c)/MainForm 槽标志(8c0c3f5)。

## 待办（非阻塞）
- M1/M2 实机判据（id946→bit 测试）
- 运行时位图语义：锁任务清位需重启游戏才生效（0x524e58 只增）
- 501 矛盾位定性清理（独立数据修复）
- id↔idx 完整表（romfs questData_* 或内存 dump `*(0x1313c18)+0xB4` 的 +108 表）

## swe2 阶段审定稿补充（swe2-phase-audit.md，2026-10-22 最终）
1. **双写必要不充分**：`0x525040` 判定器除任务位外还有**第三输入**——case11 的 `[member#4+0x958]&bit20`（猎人块内可写）OK，但 case12 的 `[mgr+0x3618]&0x7F000`、case2/3/4/15 的等级字节全走**别的管理器对象**。**严格修复 = 只解锁纯任务位类别；复合门禁类需同步满足等级腿，否则双置仍不可接。**
2. **uxth 误码确证** qp4 把 `e6ff2070`(uxth) 误当 `ldrb [pc]`——precondition §4b「byte_table[id-1]」错，实为 `r2=(u16)(id-1)` 直喂，**更支持位号=id**。
3. **impossible=501**（slot0:122+slot1:379）、**字段数=134**、**集合表基址 0x162C162**、**+0xB4 两级解引用** `*(*(slot)+0xB4)`、**0x51e6d8 逐位 or 同步**（非整段拷贝）。
4. **编辑器修复边界**：OtherForm 双写解决"纯任务位"解锁（村/G/特殊许可大部分）；若某类需等级腿（case12 [mgr+0x3618]），编辑器需另配等级写入或提示用户先升HR。

## 位号定案（swe2 复核收敛）
位号 = **记录序号 i**；i 与 questId 在 M1 下相差 ≤1bit（边界对齐 + Hunter Training id 命中倾向 M1）。**修复公式按 questId 位操作在 M1 下成立**——advisory 提出 OtherForm ArenaQuest 写 char_off 11544-11546 = obj+0x42C bit 1288-1304，恰与斗技 questId 1288-1304 同区间，是「编辑器按 questId 编码位序」的作者级见证 → M1 基本采信，「待实机判据」降级为残留校验项。

## 脏档收敛修复（最短闭环，待实机验证）
`seen |= cleared` 位域级收敛（只 OR 0x52C）一次消全部矛盾向量——dirty 档 slot0:122+slot1:379=**501→0**，不变量 `cleared⊂seen` 恢复。
- 产物：`save-snapshots/20261022-v6-ready/system_fixed_slot0`、`system_fixed_slot1`
- 性质：补 seen = "解锁"那些位对应任务，可逆、不毁档；比逐位定性快
- **语义边界**：这恢复的是"已打过任务被标记为已解锁"——若 501 位里有纯涂块垃圾（玩家没打过的任务 id），补 seen 会让那些任务"解锁但没打过"（合法态 seen=1/cleared=0），不卡对话但多了假解锁。逐位定性仍是彻底修。
- **待实机验证**：把 system_fixed_* 喂回 yuzu 看卡对话解没解（最直接闭环）

## 收尾（2026-10-22 最终态）
- **套装名/预设名字段宽实测定案 = 42B**（rec0「设置01」NUL pad 到 +42，+42 起装备对）。EquipsForm 136B 记录、ItemsForm 170B 记录同构。
- **共享方法**：`MainForm.WriteUtf8Field(dst,off,str,width)` 统一两 Form 的名字写回（按字符截+全字段清零），消除手写漂移。
- **核心问题最短闭环**：脏档卡对话 → `seen|=cleared` 收敛脚本已产出 `system_fixed_slot0/_slot1`（501→0）。**待实机验证**：喂回 yuzu 看对话解没解。
- 编辑器所有 P0 修复编译 0 错、swe2 逐项判【对/通过】。**遗留**：①M1/M2 实机判据 ②501 位逐位定性（彻底修需对照玩家清单）③复合门禁类需等级腿（双写必要不充分）④锁任务清位需重启生效。

## P1 字段解码（进行中）
**角色头（char_off 0x0..0x2F，非成员#4）**：`0x00`名UTF-8~16B、`0x20`playtime u32(s)、`0x24`gold u32、`0x28`HR u8、`0x2A`gender u8。
**文件序≠对象序（关键）**：成员#4 的 134 字段表是**文件字节序**（0x3df2a8 reader 顺序消耗），obj+off 是对象内偏移——两者不同坐标系。逐字段差分按**文件顺序**（134 表即文件布局）。obj+0x42C 位域文件落点 char_off 0x2C77 已确。
**obj+0x0..0x28 是成员#4 obj 的头字段**（非角色头）——obj 是运行时单例，文件里成员#4 数据从 char_off ~0x2C0B 起（delta 0x284B for 0x42C,但 obj+0 起点待 0x51dbb4 首个读取定位）。

## P1 成员#4 文件布局 + clean/dirty 差分（完整）
**文件布局**：成员#4 数据 char_off `0x2C0B..0x59AC`（159 字段、0x2DA1 字节）。`member4-file-layout.txt` = reader 序↔obj+off↔size 全表；`member4-diff.txt` = 逐字段 clean/dirty 差分。
**编辑器涂 FF 实锤字段**（dirty=FF 且 clean≠FF）：
- 狩技 0xD24(19B)/0xD3C(7B)；位域 0x42C(38)/0x52C(56)
- 164B 数组 0x9D0(18)/0xB18(42)；勋章邻 0xBDC(14)/0xC28(16)
- 委托/许可 0x2A0C(11)/0x34A0(15)/0x3510(35)/0x3548(3)/0x3570
- **128B 数组族连续涂**：0x2DF8(63)/0x2E78(54)/0x2EF8(56)/0x2F78(9)——编辑器把 0x440F-0x45CF 段当目标涂了
- 尾块 0x3684(22B/3444)
**正常差分（非涂块）**：288B 族 0x1C68-0x2688、68B 族 0x27A8-0x29C8、128B 前段 0x2A78-0x2DF8——猎人B vs 猎人A 真实进度差异。
**编辑器毁档范围扩大**：不只任务位域——狩技/勋章/委托/128B委托任务记录段全被涂。这比"卡对话"严重：可能损委托任务数据/勋章进度。

## 追加定案（2026-10-23）

### 矛盾位最终定性（122 个，全解锁涂的）
用 `mhgu.db quests.sort_order`（=位域 bit 的权威寻址）反查 `cleared=1 & seen=0` 的 122 个位：
- **Permit（特殊许可）98 + Arena（斗技场）3 + Guild G★14 16 + Permit HR 若干 = 全部解锁功能涂的位**
- **0 个落在普通村/集任务** → 玩家不可能「clear 了 EX 关却没见过」
- 结论：**`seen |= cleared` 收敛 100% 安全**，无真进度被误清（`contradictory-bits-verdict.md`）

### 怪物计数器结构定案
- 击杀段 `char_off 24230..24502` = **274B = 137×u16，无表头**（推翻旧「4+135×2」）
- 槽 0-92 = 94 大怪（MonsterForm 数组），**槽 93-128 = 43 小怪**（db _id 4097-4144），槽 129-136 = 8 保留槽全 0
- 捕获/尺寸段小怪位全 0（小怪不可捕获无体型）
- `monster-slot-map.json`（94 大怪）+ `monster-slot-map-small.json`（43 小怪）全链落盘

### G4/Permit 写点修正（6eb1e8a）
- G★4 = quests.stars=14 → sort_order **782-862 + 939-943**（原写 786-865 漏头涂尾）
- Permit = sort_order **944-1171**（228，原写 944-1174 越界涂斗技场）
- EX 关 = 旧 12 只每 16 第 16 关（959+16k）+ 新 6 只每 6 第 6 关（1141+6k），共 18

### 猫装备污染实证
dirty `0x4447..0x4598` 有 **182 个 0xFF**（clean 同区全 0）= 旧版「猫装备解锁」写点涂毁猫装备记录区——编辑器历史污染又一铁证。
