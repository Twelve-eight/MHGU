# Tier B slice 08 裁定报告

- 范围: `0x60d6f4..0x72a844`，1062 函数（slice-08.txt，行 4-1065）
- 顺序: §A 先处理 ≥1000 指令的大函数（按 insns 降序），§B 其余按地址升序。每个 vaddr 只出现一次。
- role 判定: 无 callees 且 insns>4 → leaf；无 callees 且 ≤4 → thunk；有 callees 且列出的 callees ≥8 → orchestrator；其余 worker。
- conf 判定: A=字符串/符号直接证据；B=票数主导（dominant≥3 且 ≥1.5×次席）；C=票数弱、持平、仅 hub 票或纯地址邻域推断（evidence 内附 `?`）。
- **重要偏差**: 本片地址段内 `0x65cb3c`(2495 callers)、`0x55d2b4`、`0x65e5bc`、`0x65e794`、`0x65f118`、`0x65f190`、`0x65d424`、`0x718a0c`、`0x70e7b0` 等是 3-48 指令的全局单例/访问器。它们各自带 quest 或 otomo-ot 标签，被本片几乎所有函数调用，导致 `quest` / `otomo-ot` 票大量来自 hub 而非真实语义。凡 evidence 写「仅 hub 票」的行，其置信度实际低于 C 的名义值。
- 另一系统性现象: 本片密集区（`0x65c000` 之后）大量函数同时拿到 quest 与 otomo-ot 票；两者在本作里共用 quest/Palico 数据与 UI，票数常接近持平，此时一律 conf=C。

## 汇总
（统计在全部行落盘后补全）

## §A 大函数（insns ≥ 1000，按 insns 降序）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x6c8a2c | render-gfx | orchestrator | B | 调 0x53a058/0x53a164/0x950bcc/0x3f8344（render-gfx 票 3）+0x6cc720；位于 0x6c70c8-0x6c8a2c 渲染簇，票 em:6/quest:5/otomo:5 分散 |
| 0x67b3a4 | otomo-ot | orchestrator | C | 票 otomo-ot:26 vs quest:19、em:3 未拉开；调 0x26e43c/0xdaba4/0x67e130 |
| 0x681f50 | quest | orchestrator | C | 票 quest:22 与 otomo-ot:20 近持平；调 0x276790/0x3e6434/0x6ba920 |
| 0x6a2c78 | otomo-ot | orchestrator | B | 票 otomo-ot:20、em:9、quest:8；调 0x56e61c/0x54f9c0/0x6a64dc |
| 0x721a30 | quest | orchestrator | B | 票 quest:35/otomo-ot:10；调 0x718a0c/0x72ab38/0x65f914 |
| 0x7045dc | quest | orchestrator | B | 票 quest:39/otomo-ot:9；调 0x6fa3d8/0x6fd280/0x6ffd40 |
| 0x6e2468 | otomo-ot | orchestrator | C | 票 otomo-ot:23 与 quest:22 持平；调 0x6e46a8/0x6e54b4/0x6e6214 |
| 0x68584c | otomo-ot | orchestrator | C | 票 otomo-ot:18/quest:15/em:5；调 0x276790/0x68796c/0x6882c4 |
| 0x69eb18 | unknown | orchestrator | A | 字符串 `areaseldat`(rAreaSelDat 区域选择数据表)；票 otomo:20/quest:16/em:9 属跨模块，标签集无 area 项 |
| 0x6f31d8 | quest | orchestrator | B | 票 quest:40/otomo-ot:6；调 0x6f9a04/0x6fbf4c/0x6fcfe4 |
| 0x61b0e0 | quest | orchestrator | C | 票 quest:18 与 otomo-ot:18 完全持平；调 0x548204/0x5483c0/0x56d97c |
| 0x668da8 | quest | orchestrator | B | 票 quest:30/otomo-ot:15；调 0x13efe30/0x5bc4b8/0x65e794 |
| 0x6f0f84 | quest | orchestrator | B | 票 quest:36/otomo-ot:9；调 0x63167c/0x5b9d88/0x57e938 |
| 0x697478 | unknown | orchestrator | C | 票 render:3/quest:3/em:2/audio:2 四向分散；调 0x87ff38/0x8826fc/0x883f74/0x7bb638，与 area 资源簇同构 ? |
| 0x6f5940 | quest | orchestrator | B | 票 quest:36/otomo-ot:7；调 0x6ff02c/0x6fe2dc/0x6fee28 |
| 0x6ffd40 | quest | orchestrator | B | 票 quest:27/otomo-ot:4；调 0x148340/0xdb568/0x70153c |
| 0x69c258 | unknown | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `areaacttbl \| rAreaActTblData`（区域行动表资源）；调 0x82fb08/0x831b90/0x8870b8 |
| 0x68b5c4 | quest | orchestrator | B | 票 quest:29/otomo-ot:8；调 0x6b7eb4/0x6b6d0c/0x65f270 |
| 0x6b9168 | otomo-ot | orchestrator | B | 票 otomo-ot:21/quest:4；调 0x56e6a8/0x55fa04/0x7ca724 |
| 0x658ae8 | ui | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串类名 `cUIORegistSrcPanelBase`（面板基类）；otomo:31/quest:16 为其宿主模块票 |
| 0x692940 | otomo-ot | orchestrator | B | 票 otomo-ot:28/quest:8；调 0xba7d68/0x693f84/0x694628 |
| 0x6d4d94 | monster-em | orchestrator | C | 票 em:10 与 quest:9 近持平，0 caller（仅 vtable）；调 0x6c70c8/0x6c71e4/0x6cc634 |
| 0x698eb4 | unknown | worker | C | 无字符串；与 area 资源簇同构（0x690/0x7aedcc/0x7aa47c/0x7bb638）；票 quest:3/audio:1 |
| 0x660c80 | quest | orchestrator | B | 票 quest:35/otomo-ot:12；调 0x54fd94/0x6650f0/0x54ecc0 |
| 0x6f7220 | quest | orchestrator | B | 票 quest:37/otomo-ot:7；调 0x6ff02c/0x7026b8/0x7045dc |
| 0x6ddf38 | quest | orchestrator | B | 票 quest:25/otomo-ot:7；调 0x6e026c/0x6e03f8/0x1963d0 |
| 0x6ccf74 | quest | orchestrator | B | 票 quest:20/otomo-ot:4；调 0x3d8028/0x2423b4/0x2450ac |
| 0x684588 | otomo-ot | orchestrator | B | 票 otomo-ot:28/quest:14；调 0x276790/0x688820/0x688a84 |
| 0x655360 | otomo-ot | orchestrator | B | 票 otomo-ot:18/quest:6，0 caller；调 0x60217c/0x6025b8/0x27c6f8 |
| 0x6e814c | quest | orchestrator | B | 票 quest:25/otomo-ot:7；调 0x65ca84/0x5d0d44/0x57e938 |
| 0x6ce288 | quest | orchestrator | B | 票 quest:21/otomo-ot:11；调 0x244f5c/0x243bd4/0x3f8390 |
| 0x7129a8 | quest | orchestrator | B | 票 quest:30/otomo-ot:12；调 0x26e50c/0x548a08/0x18c4f0 |
| 0x6917e8 | otomo-ot | orchestrator | B | 票 otomo-ot:26/quest:4；调 0xba7d68/0x693f84/0x694628 |
| 0x6d3ce4 | quest | orchestrator | B | 票 quest:9/em:4/render:4；调 0x6d09b8/0x32a400/0x6c0d88 |
| 0x696440 | quest | orchestrator | B | 票 quest:16/otomo-ot:7/render:2；调 0x65c7e8/0x54ed74/0x641e94 |
| 0x714e34 | quest | worker | C | 票仅 quest:4、otomo-ot:2（弱）；调 0x19aaec/0x147e10/0x148880 |
| 0x68fdb0 | otomo-ot | orchestrator | B | 票 otomo-ot:17/quest:3；调 0xba7f1c/0x693f84/0x22d644 |

## §B 其余函数（按地址升序）

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x60d6f4 | unknown | leaf | C | 7 指令、无 callees、无字符串/票；0x60d6xx 稀疏尾部 |
| 0x60d710 | unknown | leaf | C | 18 指令无调用、无票无字符串 ? |
| 0x60d758 | unknown | leaf | C | 7 指令无调用、无票无字符串 ? |
| 0x60e6b0 | quest | worker | C | 仅 1 票 quest，callee 0x54ee98（quest） |
| 0x60e798 | unknown | leaf | C | 43 指令无调用、无票无字符串 ? |
| 0x60f950 | unknown | leaf | C | 6 指令无调用、无票，4 callers 的小访问器 ? |
| 0x60f968 | unknown | leaf | C | 6 指令无调用、无票，与 0x60f950 同构 ? |
| 0x613134 | unknown | thunk | C | 4 指令无调用，无票无字符串 ? |
| 0x613144 | quest | worker | C | 仅 1 票 quest，callee 0x56e60c |
| 0x613d24 | unknown | thunk | C | 4 指令无调用 ? |
| 0x613d34 | unknown | thunk | C | 4 指令无调用 ? |
| 0x613d44 | unknown | thunk | C | 3 指令无调用 ? |
| 0x613d8c | quest | worker | C | 票 quest:1/otomo-ot:1 持平；callee 0x56e528/0x56dc28，按 0x613xxx 邻域取 quest |
| 0x614768 | unknown | thunk | C | 4 指令无调用 ? |
| 0x614778 | quest | orchestrator | B | 票 quest:8（8 个 0x3b5xxx/0x3b57d0 callees 全 quest） |
| 0x614898 | monster-em | orchestrator | B | 票 em:7/quest:3；调 0x3a3778/0x3a5364/0x3a9e40（0x3axxx 为 em 区） |
| 0x614a60 | monster-em | worker | C | 票 quest:1/em:1 持平；callee 0x3a5324/0x3a9e38 属 0x3axxx em 区 |
| 0x614b14 | otomo-ot | worker | C | 票 otomo-ot:2/quest:2 持平；调 0x56e808/0x56fb94 |
| 0x619bf8 | monster-em | orchestrator | B | 票 em:6/otomo-ot:3/quest:1；调 0x274ce4/0x258ffc/0x54533c |
| 0x61abb8 | quest | worker | C | 票 quest:4/otomo-ot:3 接近；调 0x666d08/0x56e5b8/0x7aa47c |
| 0x61cc6c | monster-em | orchestrator | B | 票 em:6/quest:2；调 0x276278/0x2864c4/0x27c6f8 |
| 0x61e5d4 | quest | orchestrator | C | 票 quest:3/otomo-ot:3/em:2 持平；调 0x54533c/0x276278/0x5511a4 |
| 0x61ecc0 | quest | worker | B | 票 quest:4/otomo-ot:2/audio:1；调 0x18ffc/0x54533c/0x56e558 |
| 0x61fc1c | quest | worker | C | 票 quest:1/otomo-ot:1 持平；callee 0x3b57d0（quest）+0x61fd0c |
| 0x620c80 | unknown | leaf | C | 28 指令无调用、12 callers；无票，疑为取值器对 0x620c80/0x620cf0 ? |
| 0x620cf0 | unknown | leaf | C | 37 指令无调用、3 callers，无票 ? |
| 0x620d84 | unknown | leaf | C | 28 指令无调用、12 callers，与 0x620c80 成对 ? |
| 0x620df4 | unknown | leaf | C | 37 指令无调用、3 callers，与 0x620cf0 成对 ? |
| 0x620e88 | quest | worker | C | 仅 1 票 quest，callee 0x56e5b8 |
| 0x620fcc | unknown | leaf | C | 125 指令无调用、1 caller，无票无字符串（母表标 quest，属弱推断）? |
| 0x6211c0 | quest | worker | C | 仅 1 票 quest，callee 0x620fcc |
| 0x621680 | quest | worker | C | 票 quest:2/otomo-ot:1；调 0x3b598c/0x3b57d0/0x62172c |
| 0x62172c | otomo-ot | orchestrator | B | 票 otomo-ot:11/quest:3；调 0x56e808/0x56e528/0x545a40 |
| 0x6223f4 | unknown | leaf | C | 31 指令无调用、无票 ? |
| 0x622854 | unknown | thunk | C | 4 指令无调用 ? |
| 0x6232c0 | quest | worker | C | 票 quest:2；调 0x623d50/0x194228 |
| 0x6233c4 | quest | orchestrator | B | 票 quest:11/otomo-ot:4；调 0x55bba0/0x56e808/0x142a38 |
| 0x623748 | quest | worker | B | 票 quest:3/otomo-ot:2，0 caller；调 0x551e38/0x55bac0/0x56e808 |
| 0x623a04 | otomo-ot | worker | C | 票 otomo-ot:1/quest:1 持平；callee 0x546f28/0x56e61c |
| 0x623c08 | quest | worker | C | 票 quest:2/otomo-ot:1；调 0x194228/0x56e62c/0x56e530 |
| 0x623d50 | otomo-ot | orchestrator | C | 票 otomo-ot:9/quest:9/audio:2/item:1 持平；调 0x56e530/0x55bba0/0x3a5ec4 |

<!-- END -->
