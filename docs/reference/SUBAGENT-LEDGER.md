
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
| Member4Residual | `docs/analysis/members/member4-residual.md` | PASS（主会话复核循环闭合 0x2A78..0x3178 / 3444B 全零） | 旧 dump 全族早 **0x550**（循环体 840+600B）；128B 族仅 1 个 FF；3444B 两档全 0；68B 族 **544bit**（非 384） |
| SocialChecksum | `docs/analysis/save-io/social-checksum.md` | PASS（四条证据同向，置信≈0.9） | 扩窗安全；**夹紧末块 160B** 必需；勘误 `0f101010`/`0xC85A8` 零洞尺寸 |
| TailSparse80000 | `docs/analysis/save-io/tail-containers.md` | PASS（尺寸闭合 653,472B 校验通过） | C0..C7 容器表；72.62% 非零；zlib 50×73 网格；quest 路径只在 slot0 |
| WriteSideDesc | `docs/analysis/save-io/write-side-desc.md` | PASS（但**一条否决**） | 44B 对象=装备记录非描述符；`0x3e75f8`=18 writer 与读侧同序；632B 头字段全解 + HR 第二副本 @0x0B1 + 性别公式。**否决**其「`0x14b0b0`/`0x14b1c4` 读写标签写反」——主会话精确窗口复核：`0x14b0b0` 11读0写、`0x14b1c4` 0读10写，原标注正确 |
| Member14to17 | `docs/analysis/members/member14-17-semantics.md` | PASS | m14 运行时镜像（13×470）、m16 VFP ×2.05 归一化、m17 = 99×104 kind-7 快照库 |
| TailDense3783A | `docs/analysis/save-io/tail-dense-3783A.md`（pass1-8） | PASS | 16B 网格 phase A/B（phase B `0x64000..0xBB000` 每 4KB 恰 256 条 100%）；`android.gui.*` 串在该落在 **m13**（0x2E349/0x2EB39）= 宿主内存残留；16B 数组仅 system 槽（hdr8 7,292 vs .hnt 0）；尾段易变性 0.47% both_eq |
| Palico324 | `docs/analysis/members/palico-324.md` | PASS（主会话补 24 组名字证据） | 324B 记录字段表；9 组 RGBA；`+0x58..0x5E` 非配信标志；108 条=84+24（24 组有 UTF-8 名，非预留）；i=3 名 @0x23F82="梅露露" 闭环 |

**能力评估**：dsv 在本批「无 exec」限制下仍产出高质量静态分析（自建脚本 + 交叉验证），但每轮需主会话代跑 —— 后续派发应**预先**给出「脚本路径 + 主会话代跑」约定，减少往返。

## 2026-10-23 批次 TierB01..TierB14（14×dsv，Tier B 逐函数裁定）
- **目标**: 14,863 个 Tier B 函数（两预测分歧）逐函数裁定子系统/角色/置信度/证据
- **分片**: 按地址切 14 片（每片 1,062 函数），切片数据带 `callee_label_votes`（无字符串函数的唯一线索）
- **写集**: 各自 `.tmp/reports-mhgu/tierB-slice-NN.md`，互斥
- **汇合**: `tools/mhgu/tierb-merge.py` → `.tmp/mhgu/inventory/tierb-labels.csv` + 覆盖率统计
- **纪律**: 每 **30** 函数 append 落盘（~~每 200 函数~~ 作废，2026-10-23：现行规则见 `HANDOFF.md:201`「每 30 个 append 落盘」）；按 insns 降序；不确定标 `unknown`/`conf=C`。dsv/wb 路由另按 `AGENTS.md` §8d 细分片：每片约 3 个检查项、「判一项、写一行、再读下一项」。
- **状态**: 进行中（首批落盘 TierB03 120 行）


## 2026-10-23 夜 SUYU-GURecomp 吸收
- **第一批** DsvGameSettings/DsvRuntime（dsv-dev，wb2api/global:deepseek-v4.1-flash，hi）：整文件级任务 → 断流/499 反复，**0 产出**。
- **第二批** DsvGS1/DsvGS2/DsvRT（同路由，预切输入）：GS1 复活后完成 suyu-gs-part1.md（PASS）；GS2/RT 漂移读错文件，1h 仍为空壳，被杀。
- **第三批** C01..C17 + CSpk（同路由，每片 3 地址块，先写一行再读下一块）：18/18 完成，单片 44s..3m；产出 docs/analysis/external/chunks/。C13/C14 helper 行经主会话 sdk 证据返工后 VERIFIED。
- **监督** Swe2Verify（swe2-supervisor，devin-northstar/swe-2-max）：两轮；首轮把 helper 误判 CONTRADICTED（坐标错误），二轮自纠 PASS；0xBC1204 仍沿用错误前提，由主会话改判。
- **评估**：DsvProjectEval（dsv，hi）→ docs/history/PROJECT-EVAL-20261023.md，9 分钟一次完成。
- **能力评估**：dsv 在此路由上只适合"极小输入 + 单行落盘"粒度；复活旧上下文易漂移，优先新开最小提示。swe2 审计会继承上一轮预记的结论，必须在派发时显式纠正前提。

## 2026-10-23 romfs 批次
- ArcTool（dsv）→ `tools/mhgu/arc.mjs`：swe2 PASS；主会话实跑 resident.arc 197/197、em_size_scale_data 与独立解包逐字节一致。
- ItemQuestFormats（dsv，断流 5 次后完成）→ `docs/data/romfs-tables.md`：gmd 映射初稿 `str[1+2*id]` 错误（越界），主会话更正为 `str[2*id]`；`.ext` 偏移是记录相对（文件 = +8），主会话 400/400 实测。
- Swe2RomfsReview（devin-northstar/swe-2-max）：arc.mjs PASS、size 节 PASS；**romfs-tables 判 FAIL 的理由错误**——称 itemData gmd 魔数为 `GMDZ`，主会话 od 实测 eng/fre/quest 均为 `47 4D 44 00`（`GMD\0`）、版本 `02 03 01 00`。该修改**驳回**。能力评估：无 shell 时 swe2 会给出未经字节核实的"已验证"断言，审计结论涉及字节值时必须由主会话复核。
- PluginHookSpec（dsv，断流 6 次）→ `docs/patches/item-box-v7-plugin-spec.md` 766 行；第 1 节 3 条证据主会话抽验一致；R2 长度算式（0x52B0 = 0x2EC0+0x23F0）主会话复算一致。
- **监督漏配**：PluginHookSpec 与实现同批未派 swe2 监督（违反 §8），事后补派 Swe2PluginSpecReview；提交信息"审计待回"当时不实。
- Swe2Pass2Audit Round 2：105 行复核，1 降级（0xaeaefc）已应用，PASS。
- SuyuRelease（dsv, hi）：4m39s 一次完成，无断流；只读调研、行号引用齐全。
