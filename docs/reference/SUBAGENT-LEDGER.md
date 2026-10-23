
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

## 2026-10-23 批次（7×dsv，全部完成）
| 代理 | 交付 | 监督结论 | 要点 |
|---|---|---|---|
| Member4Residual | `docs/analysis/member4-residual.md` | PASS（主会话复核循环闭合 0x2A78..0x3178 / 3444B 全零） | 旧 dump 全族早 **0x550**（循环体 840+600B）；128B 族仅 1 个 FF；3444B 两档全 0；68B 族 **544bit**（非 384） |
| SocialChecksum | `docs/analysis/social-checksum.md` | PASS（四条证据同向，置信≈0.9） | 扩窗安全；**夹紧末块 160B** 必需；勘误 `0f101010`/`0xC85A8` 零洞尺寸 |
| TailSparse80000 | `docs/analysis/tail-containers.md` | PASS（尺寸闭合 653,472B 校验通过） | C0..C7 容器表；72.62% 非零；zlib 50×73 网格；quest 路径只在 slot0 |
| WriteSideDesc | `docs/analysis/write-side-desc.md` | PASS（但**一条否决**） | 44B 对象=装备记录非描述符；`0x3e75f8`=18 writer 与读侧同序；632B 头字段全解 + HR 第二副本 @0x0B1 + 性别公式。**否决**其「`0x14b0b0`/`0x14b1c4` 读写标签写反」——主会话精确窗口复核：`0x14b0b0` 11读0写、`0x14b1c4` 0读10写，原标注正确 |
| Member14to17 | `docs/analysis/member14-17-semantics.md` | PASS | m14 运行时镜像（13×470）、m16 VFP ×2.05 归一化、m17 = 99×104 kind-7 快照库 |
| TailDense3783A | 进行中（pass1-7 已跑） | 待收割 | 16B 网格 phase A/B；`android.gui.*` UTF-16 串（含成员区 0x2E349/0x2EB39 ⇒ 存档含 Android 宿主内存残留）|
| Palico324 | `docs/analysis/palico-324.md` | 待收割 | 324B 记录字段表；9 组 RGBA；108 条=84+24 |

**能力评估**：dsv 在本批「无 exec」限制下仍产出高质量静态分析（自建脚本 + 交叉验证），但每轮需主会话代跑 —— 后续派发应**预先**给出「脚本路径 + 主会话代跑」约定，减少往返。
