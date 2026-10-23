
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

## 2026-10-24 GLM 逆向批次 1（用户指令：逆向交给 glm-5.3-flash，dsv 一对一交叉审）
- 新建 agent `glm-re`（`.omp/agents/glm-re.md`，model `wb2api-remote/glm-5.3-flash:max`，用户指定路由；只有 max 档）。AGENTS.md §4b 白名单已加入 glm5.3f（备份 `G:/backups/AGENTS.md.20261024-pre-glm`）。
- 3 对：GlmR2Overflow↔DsvR2Review（插件规格 R2 B 区溢出 / R5 0x5B807C 归属）；GlmDrift↔DsvDriftReview（member#4 4B 漂移）；GlmYure↔DsvYureReview（em_size_yure_data XFS）。报告 `.tmp/reports-mhgu/glm-*.md`，审查 `glm-*-review.md`。
- 上一轮 Swe2PluginSpecReview 随重启死亡，无报告；R2/R5 由本批 GlmR2Overflow 接手。
- GlmDrift（glm-re）↔ DsvDriftReview（dsv）：漂移定位到第 107 行，审查 4/6 PASS（C4 违规引用私有字节，C6 证明有误），主会话重新反汇编确认后入库（0808e0d）。GLM 前 10 分钟报告一直为空，被催后才开始落盘。
- **GlmR2Overflow 卡死**：约 17 分钟报告为空（61 B），连续 3 次反汇编后不再调用工具，催了 3 次都没反应，已终止。改派 GlmR2b（glm-re），给它预先切好的 3 项检查，输入改为主会话导出的 `dsvr2-disasm.txt`，不再自己反汇编。DsvR2Review 提出用自己的结论直接充当审查结果，主会话拒绝，以免违反 §8。
- 能力评估（glm-5.3-flash）：在开放式逆向任务里倾向一直读，不肯写，违反增量落盘规范；给定窄范围、预切好的输入时表现待观察。用户同日新增"完成一步就落盘一步"规范（AGENTS.md §8b，glm-re/dsv-dev 定义已同步）。
- GlmR2b（glm-re，预切 3 项）：发布 11 条证据后，在读 fn 0x5B8014 时再次卡住，没有给出结论，也没有发 `done`。DsvR2Review 逐条裁定：PASS 3、带保留 PASS 1、FAIL 7（行号写错、范围算错、计数错），并独立裁定 R2 CONFIRMED、R5 有效；主会话复核循环界 `0x199B68` 与 GOT `0x1282760` 后入库。按规范记录：结论由审查方得出，GLM 提供了其中的部分证据。
- GlmYure（glm-re）被终止后改派 GlmYureB，后者没有覆盖报告就结束了；DsvYureReview 对 GlmYure 的 25 行报告判 FAIL（3 条错误），并把逐字节核实过的事实整理成交接材料写进审查文件。yure 格式仍未解出。
- **GLM 总评（本批）**：3 个任务中，只有漂移（窄问题）给出了正确结论，R2 和 Yure 两次都卡在长时间读反汇编、读字节上。下次派逆向任务时：输入必须预切，每片 ≤2 项检查，并配合 mhgu-re MCP 工具。

## 2026-10-24 mhgu-re MCP 计划评估
- EvalMcpSwe2（swe2-supervisor，devin-northstar/swe-2-max）2m：修正后采用；指出 `.omp/mcp.json` 不存在，并认为 GLM 卡死的原因在于工作流形态，而不是缺工具。
- EvalMcpDsv（dsv-dev，wb2api/global:deepseek-v4.1-flash，hi）4m：修正后采用；唯一指出 `.tmp/mhgu` 白名单会暴露 prod.keys，并指出子代理会自动继承 MCP 工具，不必改 tools 列表。三方中最细。
- EvalMcpOpus（新建 kiro-opus-reviewer，northstar-kiro/claude-opus-5.5:high，**用户本次特批**）2.5m：修正后采用；指出 junction 逃逸、schema 无类型、启发式工具描述有误导；自述最后一次性写盘，违反 §8b。
- 三方未能自行发现、由主会话冒烟发现的问题：目录路径通过检查后返回 size 0。

## 2026-10-24 01:30 pass3 九对（用户：GLM 并发 9，尽量用满）
- 9 片 × 60 函数（`.tmp/mhgu/tierB3p/slice-01..09.txt`，跳过 pass1/2 已裁定的函数，按指令数降序；540 个函数，736,737 条指令 = .text 的 14.1%）。GlmB3sNN（glm-re，wb2api-remote/glm-5.3-flash:max）↔ DsvB3rNN（dsv-dev，hi）。输出 `docs/analysis/code/tierb-pass3/tierB3-slice-NN.md`，审查 `.tmp/reports-mhgu/b3-review-NN.md`。可用 MCP，最多复看 10 个函数。
- 前一批 GlmFillOrder、GlmYure3 已停：两者的结论都被审查方用 MCP 独立推导取代（R2 已入库；yure 待独立复核）。
