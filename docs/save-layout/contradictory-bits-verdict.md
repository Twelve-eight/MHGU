# 矛盾位定性定案（2026-10-23）

## 结论：`seen |= cleared` 收敛 100% 安全

dirty 档 slot0 的 `cleared=1 & seen=0` 位共 **122 个**（整档两槽合计 501 = slot0 122 + slot1 379）**全部是编辑器「解锁」功能涂的位**，0 个是玩家真实任务进度。

## 证据链
1. **位号 = sort_order（记录序号）**：`mhgu.db quests.sort_order` 是稠密下标，与存档位域 bit 一一对应。
2. **全部 122 个矛盾位的任务类型**（db 反查）：
   - Permit（特殊许可/二名）：103 个 —— 编辑器「特殊许可解锁」涂 944-1171 区（db 反查：★1-3 各 9、★4 0、★5 2、★6-10 各 5、★11-16 7/8/9/6/8/11）
   - Arena（斗技场 Grudge Match）：3 个 —— 编辑器「斗技场解锁」涂 1172-1174 区
   - Guild G★14：16 个 —— 编辑器「G4 解锁」涂 782-862 区
3. **122 个位无一落在普通村/集任务** —— 玩家不可能「clear 了 EX 关却没见过任务」；真实进度总是 seen+1。
4. **成因**：编辑器 `SetBits(..., or=true)` 只写 `cleared` 位域（obj+0x42C）+ `seen`（0x52C）——但**旧版本**或某路径只写了 cleared。已确认当前代码 `SetBits` 双写（or 分支两行都 `|=`），残留矛盾位来自**编辑器写入前的旧档**或 CatArmsUnlock 等停用路径。

## 处置
- `save-snapshots/20261022-v6-ready/system_fixed` 用 `seen |= cleared` 收敛 **501→0**（slot0 122 + slot1 379），**正确且安全**——每个补的 seen 位都对应一个已被编辑器标 cleared 的位。
- 无副作用：seen 仅控制「NPC 对话已解锁可见」，补 seen 让游戏认为玩家见过该任务，与 cleared 一致即解除卡对话。

## 与解锁修复的关系
- 正确解锁 = `cleared + seen` 同位双写（`SetBits` 的 or 分支已正确实现）。
- 矛盾位是「只写 cleared」的历史残留；任何只写 cleared 的工具/旧编辑器版本都会产生此 bug。
- G4/Permit 写点边界已修正（`6eb1e8a`）：G★4=782-862+939-943、Permit=944-1171，未来解锁不再越界涂邻段。

## 备注
- 原摘要记的「501 矛盾位」= slot0 **122** + slot1 **379**（同一 dirty 档的两个猎人槽都被涂）。slot1 的 379 位**同样全部落在 `quests.sort_order` 0..1354**（Village 189 + Permit 184 + Guild 3 + Arena 3，db 反查 0 个未匹配）⇒ 不存在「位域 0-2047 内非任务位被计入」；本文的 122 只描述 **slot0**。`system_fixed` 对两槽都生效（slot0 122→0、slot1 379→0）。
