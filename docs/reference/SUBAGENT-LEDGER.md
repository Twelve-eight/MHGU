
## 2026-10-23 批次 AnnotateMember4To17
- **目标**: member[4..17] reader 逐字段标注（obj_off,size,file序）
- **代理**: task / devin-northstar/swe-2-max (本会话第3个swe2,配额内)
- **范围**: 只读+写 `.tmp/reports-mhgu/member4-17-layout.md`；不写代码/不build
- **写集**: member4-17-layout.md（独占）
- **预期**: 14成员字段表+obj跨度+file锚点
- **产出**: member4-17-layout.md 508行（14成员字段表，合计 86997B）→ 迁入 `docs/analysis/`
- **监督**: ReviewMemberLayout PASS + E1 修正（member[7] cap→位宽 35136→35131）+ E2-E6 小错
- **关键裁决**: member[13]=`0x163e0c`=28404B=file `0x2C6B4` 块（「成员#15」实为 member[13]）；file序=调度序仅限 member 边界内，中段装备箱/猫记录/套装/怪物计数器是独立容器插入
- **能力评估**: task/swe2 自建符号执行器 `reader-fields.mjs`，解析栈槽/循环/位流/tmp拷贝，质量高；独立发现 member 边界外独立容器问题
