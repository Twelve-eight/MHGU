

> 本表里的 `.tmp/reports-mhgu/*` 是**会话级 scratch**（临时文件，不保证留存），补审时已不存在；报告内容如需引用请复制进 `docs/` 后再引用路径。
## 2026-10-23 批次 AnnotateMember4To17
- **目标**: member[4..17] reader 逐字段标注（obj_off,size,file序）
- **代理**: task / devin-northstar/swe-2-max (本会话第3个swe2,配额内)
- **范围**: 只读+写 `.tmp/reports-mhgu/member4-17-layout.md`；不写代码/不build
- **写集**: member4-17-layout.md（独占）
- **预期**: 14成员字段表+obj跨度+file锚点
- **产出**: member4-17-layout.md 514行（14成员字段表，合计 86997B）→ 迁入 `docs/analysis/`
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
- **纪律**: 每 **30** 函数 append 落盘（~~每 200 函数~~ 作废，2026-10-23：现行规则见 `HANDOFF.md:230`「每 30 个 append 落盘」）；按 insns 降序；不确定标 `unknown`/`conf=C`。dsv/wb 路由另按 `AGENTS.md` §8d 细分片：每片约 3 个检查项、「判一项、写一行、再读下一项」。
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
- 01:42 **并发超限**：pass3 重派（01a/b/c、04b）加上补派 10/11 之后，同时运行的 GLM 达到 11 个，超过用户给的上限 9。原因：只按"已停 2 个 + 新派"计数，没有扣除仍在运行的 9 个。处理：在跑的 GLM 降回 ≤9 之前不再派新的 GLM。
- pass3 前 9 片（10 分钟时）：02/05/06/08/09 有产出（06、08 已审查入库：06 的 A 6/6 PASS；08 的 5 个 A 都因区段级证据降为 B）；01、03、04、07 读完整片后长时间不写行（01、04 已终止并重派：01 切成 3×20，04 改派 04b 并带边界规则）。**GLM 的模式**：先整片读入（1600+ 行）再写，就会卡住；先读一个块、立即写一行，就能完成。

## 2026-11-07 V6BridgeReview（MHGU 原生版联机断言复核）
- **目标**: 独立复核主会话关于 SUYU-GURecomp 联机的 7 条断言（C1–C7），供 `docs/reference/suyu/` 的两份报告定稿。
- **代理**: dsv-remote（`wb2api-t5-remote/deepseek-v4.1-flash:max`，effort hi）。
- **范围**: 只读 `G:/omp works/.tmp/ext/SUYU-GURecomp` 与只读导出 `I:/suyu/export/MONSTER HUNTER GENERATIONS ULTIMATE`；只写 `.tmp/review-v6bridge/REVIEW.md`。
- **写集**: `REVIEW.md`（独占）→ 定稿后复制为 `docs/reference/suyu/multiplayer-v6-bridge-review.md`（198 行）。
- **产出**: C1/C2/C4/C5/C6 CONFIRMED；**C3 部分 REFUTED**（RyuLdn 出货默认 `ryuldn_host = ldn.ryujinx.app`，本机不开 30456 监听）；C7 CONFIRMED except "72 B 常数不可推导"，并补 `nifm` 写死 1500 一条。
- **监督**: 主会话自验了三条载荷更正（`nifm.cpp:703`、`StartOwnServer`/`OwnServerIsMain` 条件、`ldn_backend` 8 纯虚 + 1 可选），并按复核改写两份报告。
- **关键裁决**: `RYULDN.md` 与 ini 模板默认值矛盾（`auto` vs `room`、`self` vs `ldn.ryujinx.app`）；`ryuldn_public` 运行时读取但不在模板里。
- **能力评估**: 该会话无 `run` 工具，全部靠 read/grep + 拉上游源码；自行发现二进制 grep 不可用后改用日志 `file:line` 与 GitHub tag API 交叉验证版本。Difficulties 记录 5 条（无 run 工具、二进制不可读、ENet 子模块为空、文档与代码漂移、72 B 不可溯源）。

## 2026-11-07 YuzuRoomAudit（yuzu 房间 → 本源出 的可迁移性与跨实现同房）
- **目标**: 复核主会话在用户出示 yuzu 1734「创建房间」截图后给出的 5 条结论（N1–N5）。
- **代理**: dsv-remote（`wb2api-t5-remote/deepseek-v4.1-flash:max`，effort hi）。
- **范围**: 只读 `G:/omp works/.tmp/ext/SUYU-GURecomp` 与 `I:/suyu/export/...`；可拉上游 yuzu 镜像源码比对；只写 `.tmp/review-yuzu-room/REVIEW.md`。
- **写集**: `REVIEW.md`（独占，548 行）→ 定稿后复制为 `docs/reference/suyu/yuzu-room-compat-review.md`。
- **产出**: N1 CONFIRMED（房间=ENet/UDP，默认 24872，导出即 suyu-cmd，房主 `ENET_HOST_ANY`）；N2 CONFIRMED（双方 `network_version = 1`，消息枚举与各负载包逐字段相同；"1734 精确"仍 `[B]`）；N3 CONFIRMED 但纠正三处（LDN 控制包不压缩、非 LAN 目标 socket 不进 room、1392 是 UDP 载荷预算→IP 层约 1420）；N4 CONFIRMED 且结论更硬（房间/服务端都不校验游戏版本，1.3.0 与 1.4.0 会静默连上）；N5 UNCLEAR（帧率/模组是否不同步属游戏内部，离线不可判）。
- **监督**: 主会话自验了镜像侧 `room.h`（`network_version = 1`）、`RoomMessageTypes` 枚举 diff、`SendJoinRequest`/`SendProxyPacket` 字段序、yuzu `socket_proxy.cpp:192-194` 的 zstd，与复核一致。
- **关键裁决**: 跨实现同房在协议层成立；真正的坑是**版本无门禁**，排查顺序应为"先核版本、再看网络"。
- **能力评估**: 能自行找到 GitLab/Gitee 镜像绕开 GitHub 限流与 yuzu 下架；逐字段比对而非只看版本号；Difficulties 见报告。

## 2026-11-09 01:0x–01:3x — EMC section 普查（4 个并发子代理，全部产出经主会话复核）

- **目标**: 独立重算/证伪主会话关于 MHGU EMC section 选择、`ai.mjs` 漏检量、`op 0x14` 目标空间的结论；并把半成品报告 `EmcSection-reports/emcsection.md` 收尾。
- **代理 1 / EmcSectionFalsify**: dsv-remote（`wb2api-t5-remote/deepseek-v4.1-flash:max`，effort hi）。只读代码/镜像；写 `G:/tmp/EMC/review-A-emcsection.md` + `arm32-census.mjs`、`c4-recompute.mjs`（主会话代跑）。产出：C2/C4 CONFIRMED（C4 由自写实现复算 `op00 flat=40996 nested=40996`、17 文件/18 对）；C1/C3 PARTIAL；**新增**：`ai.mjs` 的 reset 模型只覆盖"从 s0 `op14` 可达"的 section 1 条目 ⇒ 漏 **104 对 / 70 文件**（主会话自写 `verify-ai-reach.mjs` 复现）；`em[0x1408]` 的 103 处立即数位操作无一置 bit7 ⇒ 守卫是否成立 `[U]`。
- **代理 2 / EmcSectionReport**: dsv-dev（同 route）。唯一写集 `MHGU/docs/analysis/re/EmcSection-reports/emcsection.md`。产出：补齐 `## Unknown`/`## SelfFalsificationCheck`，撤回两处与反汇编矛盾的旧句（`bfc/bfi` 语义、`resolveState` 返回值），新增 dispatch 表与附录；收尾后按主会话两次更正再改（section 12、121/16、低 id 由兄弟派发器选）。
- **代理 3 / CensusReview**: dsv-remote。审查**主会话自己的**工具与 §164 草稿；写 `G:/tmp/EMC/review-C.md` + 3 个 want 脚本（主会话代跑）。产出：10/10 正控确认；v1/v2 误报 3 处（0x8a71c/0x8c960/0x103bc4c 实写 `em+0xba50`/`em+0xcb46`）；v1 漏 `0x82f24=12`、`0x8b49c=18`；v3 仍有 1 处误报（0x7f030 实写 `em+0x73b4`）且**完全不认 `strh` 立即数**（漏 17/6/11）；草稿的 "9 restores/2 register" 应为 10/7。
- **代理 4 / Op14Targets**: dsv-remote。只读；写 `G:/tmp/EMC/op14-targets.md`。产出：**`op 0x14` 的参数恒为 section 1 的条目号**（handler `0x83ed8`：`strb 1→em[0x72fc]`、`strb arg→em[0x72fd]`、`[P+4]` 取脚本、压 `{section,entry,resume}` 帧），`ai.mjs` 的 s0→s1 模型正确；数据侧 91 322 叶子 `arg < s1 条目数` 0 违例。
- **监督**: 主会话逐条复核了上述全部断言：`0x82f1c/0x82f24`（section 12）、`0x8b49c`、`0x7f030`、`0x8b4d0` 四站点亲自反汇编；`verify-ai-reach.mjs` 独立实现给出同一 104；工具的两个缺陷按审查方判定修复并三版对比。
- **能力评估**: dsv-remote 在无 `run` 设备时能用 7 个 MHGU MCP 设备完成指令级重算（值得写进派单模板）；两个 dsv 代理都**没有**发现"派单 brief 里的 `(section,entry)` 表述与实际不符"以外的越权行为。Difficulties 见各自报告。

## 2026-11-09 02:5x–03:0x — 守卫置位器与 `self/rt` 根因（2 个子代理，产出经主会话复核）

- **目标**: 两件互不依赖的收尾——(1) 检验已发布的「没有代码置 `em[0x1408]` bit7」；(2) 交接清单第 5 项 `self/rt` 8 个 `.user` 解析不了的根因。
- **代理 1 / GuardWriters**: dsv-remote（`wb2api-t5-remote/deepseek-v4.1-flash:max`，effort hi）。无 `run` 设备，自写 32 KB 分类脚本，由主会话代跑两轮（第一轮暴露它自己的 `Rn==0` vs `r0` 解码 bug）。**产出**：`G:/tmp/EMC/guard-writers.md` + 脚本已入库为 `MHGU/tools/audit/guard-word-ops.mjs`。**结论**：置位器 = `0xc4b44 orr r0,r0,#128`（`0xc477c` 写回，`r10=em+0x1408`），谓词「当前 section≠1 或池抽到的 entry≠`em[0x72fd]`」；已发布的「103/0/4」被否证（`movw` 在 0x468 字节之前、值寄存器与指针寄存器不同，原规则两轴都够不着）；修正后 `SETTERS=1 / UNK=18 / B7OPS=12`（11 个 bic 清 + 1 个 orr 置）。
- **代理 2 / SelfRtParse**: glm-re（同 route，有 bash）。**产出**：`G:/tmp/EMC/self-rt-parse.md` + 三个 scratch 脚本。**结论**：12 个失败文件（8 硬抛 + 4 crc）与 **base pak** 字节全等，游戏实际读的 **patch_001** 版本用同一 `rsz.mjs` 解析 clean；`self-stage.mjs` 吞非零退出、`pak.mjs` 只在 `errored>0` 才非零（`pak.mjs:1173`，不是子代理报的 1150-1156），所以补丁没覆盖也没有提示。
- **监督**: 主会话逐条复核：`0xc46d8..0xc4b48` 置位链与 `refs_to 0xc4b40`（两条条件入口）亲自反汇编；四个 `bic` 亲自核（`0xc3d44/#0xa0`、`0xc46b4/#0xb0` 两条也确认清 bit7，子代理第一版把它们误判为 same）；`rsz.mjs check` 对 staged/vanilla 两个版本亲自复现（`cursor_ok=false` / `cursor_ok=true`），并 sha256 抽查 `em001_02_use_think_data` 与 base pak 全等、与 patch_001 不同。子代理引的 `pak.mjs` 行号已更正为 1173。
- **能力评估**: dsv-remote 在无 run 设备时仍能用自写 ARM 解码器做全量写普查（但第一版分类器有自己的 bug，**零结果必须先过正控**这条再次成立）；glm-re 的 pak 级取证（extract + sha 比对 + 有效版本抽取）质量高，直接给出可执行的修法方向。Difficulties 见两份报告。
