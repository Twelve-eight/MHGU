# Tier B slice 05 裁定报告

范围 `0x3241bc..0x47206c`，共 1062 个函数（slice-05.txt 第 4..1065 行）。

数据来源：`.tmp/mhgu/tierB/slice-05.txt`（insns/callers/callees/votes/strings）、`.tmp/mhgu/inventory/tiers.csv`（结构预测标签）、`.tmp/mhgu/analysis/`（已有反汇编片段）。

## 判定规则（全程一致）

1. **A** = 函数直接引用的字符串点名子系统实体（如 `cFreeHuntData`/`mRewardTable`）。
2. **B** = 非通用 callee 票数至少 3 票且 ≥1.5 倍于次高票；或字符串 + 票数同向。
3. **C** = 票全来自通用 stub，或 tiers 结构预测 / 地址邻域推断。
4. **通用 stub 名单**（全库横穿、不具子系统指向性，其票不计）：`0x7aa47c`（已由 `analysis/m1417-xref.txt` 证实为单例取用器：调用后立即 `ldr r1,[r0]` 再走 vtable 偏移 0x1c/0x34）、`0x7aedcc`、`0x7bb638`、`0x2b8f0`、`0x2b908`、`0x13efd7c`、`0x13efe00`、`0x13efe0c`、`0x13efdd0`、`0x13efdac`、`0x887660`、`0x887648`、`0x65cb3c`、`0x65cbe8`、`0x65cba0`、`0x65cbc4`、`0x65cc0c`、`0x194228`、`0x50c5c`、`0x887810`、`0x88784c`、`0x8261fc`、`0x3f8344`。
5. 票全为通用 stub 时，采用 tiers.csv 的结构预测作 label 并记 C；若 tiers 预测为 `online-nex` 而全无 online 证据（`Nex*/OnlineCore/HTTP` 字符串或 0x13efd88 类 callee），降级为 `unknown` 防止污染。
6. `unknown` 保留给「无字符串 + 票全通用 + tiers 预测高风险且无旁证」的情形。

`role` 定义：`leaf` 无 callee；`thunk` ≤4 指令且无 callee；`orchestrator` callee ≥8；其余 `worker`。

## 汇总

<!-- SUMMARY -->

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x3241bc | quest | worker | C | callees 0x887660/0x7aa47c/自身皆通用 stub，quest:3 全来自通用票；tiers=quest 同向，无字符串 |
| 0x324300 | quest | leaf | C | 162 指令 0 调用 0 字符串；夹在 0x3241bc(quest) 与 0x324588(quest) 之间，tiers=quest |
| 0x324588 | quest | worker | B | 字符串 `008::cSetupParamPl_com_008` + quest:4；callees 0x8870b8/0x887100（另两个通用）。Pl 字样可能指向 player，但结构在 quest 段 |
| 0x324aa8 | quest | orchestrator | B | 16 callee，quest:14；调 0x8260d4/0x8263f8/0x826fb8/0x82710c/0x82772c/0x827998/0x827bbc 一串 0x82xxxx quest 函数。**tiers 预测 monster-em，与票数冲突，取票** |
| 0x325580 | monster-em | worker | C | 唯一 callee 0x7cc110（monster-em，13 指令）；monster-em:1；tiers=monster-em，无字符串 |
| 0x325778 | monster-em | worker | B | monster-em:3（0x325580/0x325b48/0x7cc110 三票同向）+ tiers=monster-em |
| 0x325b48 | monster-em | worker | C | 非通用票 1:1（monster-em 0x7cc110 对 quest 0x325e80），quest:2 来自通用 0x7aa47c/0x7aedcc；随 tiers=monster-em |
| 0x325e80 | quest | worker | B | quest:4 otomo:2，tiers=quest；callees 0x7af37c/0x7af3a0 + 通用 0x7aa47c/0x13efd7c，另有 otomo 0x887810 |
| 0x326390 | quest | worker | C | quest:4 主要来自 0x13efe00/0x887660/0x13efe0c 通用 + 0x7af3e4；audio:1 来自 0x690；tiers 预测 audio，证据不支持 |
| 0x3265bc | otomo-ot | worker | C | 39 指令，callees 仅 0x13efe00/0x887660（全通用），quest:2 无意义；随 tiers=otomo-ot |
| 0x326658 | otomo-ot | worker | C | 同 0x3265bc 模式（39 指令、同两通用 callee、quest:2）；随 tiers=otomo-ot |
| 0x3266f4 | audio | worker | C | quest:3 全通用 stub + 同区 0x326390；audio:1 来自 0x326390；随 tiers=audio |
| 0x3267d0 | quest | worker | C | callees 0x329308(quest)/0xc067ec，quest:2；tiers=quest 同向但仅 2 票 |
| 0x3268cc | quest | thunk | C | 3 指令无调用；夹在 0x3267d0/0x3268d8 两个 quest 之间，tiers=quest |
| 0x3268d8 | quest | worker | B | 31 个 caller 的公共入口，quest:3（0x13efe00/0x887648/0x13efe0c）+ tiers=quest |
| 0x326a68 | quest | worker | B | 44 指令 5 caller，quest:3（0x13efe00/0x887660/0x887648）+ tiers=quest，与 0x326b18/0x326bc8 同形 |
| 0x326b18 | quest | worker | B | 44 指令 6 caller，quest:3（0x13efe00/0x887660/0x887648）+ tiers=quest |
| 0x326bc8 | quest | worker | B | 44 指令 5 caller，quest:3（同上三通用 callee）+ tiers=quest |
| 0x326c78 | unknown | worker | C | 29 caller，quest:5 + audio:1 但 quest 票全来自 0x13efe00/0x887660/0x7aedcc/0x7aa47c/0x13efd7c 通用；tiers=online-nex 且无任何 online 证据，按规则 5 降 unknown |
| 0x326e88 | quest | worker | C | 15 指令唯一 callee 0x7aa47c（单例取用器），quest:1；tiers=quest |
| 0x326ec4 | quest | orchestrator | B | 12 callee，quest:9；调 0x31d6f0/0x31cd7c/0x31cdb8/0x31be70/0x9b8df8 等本区函数；字符串仅碎片 `age_fre` |
| 0x3273b4 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用，quest:1；tiers=quest |
| 0x3273f0 | monster-em | orchestrator | B | 14 callee，monster-em:10 对 quest:4；调 0x9b8df8/0x9b8ef8/0x9b8f78/0x31be70/0x31c1a0/0x31c03c/0x31d92c |
| 0x3288c4 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest，无字符串 |
| 0x328900 | monster-em | orchestrator | B | 8 callee，monster-em:4 对 render-gfx:2/quest:2；调 0x31be70/0x31beb4/0x32a104/0x31c03c/0x8879b4 |
| 0x329308 | quest | worker | C | quest:2/monster-em:1，callees 0x887648(通用)/0x31d834/0x13efddc；tiers=quest |
| 0x329668 | monster-em | worker | C | 非通用票 monster-em 1(0x31d7e8) 对 quest 2(0x3273b4/0x32af48 皆通用 stub)；随 tiers=monster-em |
| 0x329908 | quest | worker | B | 446 指令，quest:4；callees 含 0x324588(quest，带 cSetupParamPl 字符串)/0x324300 + 0xc067ec；tiers=quest |
| 0x32a000 | monster-em | leaf | C | 65 指令 0 调用 0 字符串；tiers=monster-em，且 0x32a0xx..0x32afxx 整块 tiers 均为 monster-em |
| 0x32a104 | monster-em | worker | C | 191 指令唯一 callee 0x887660 通用，quest:1；tiers=monster-em（同块） |
| 0x32a400 | monster-em | leaf | C | 23 指令 0 调用但 484 caller、无字符串无票；tiers=monster-em（同块）；调用点形如 `bl 0x32a400` 后立即写回（analysis/qp4/fn-10a1240.txt），倾向通用工具，见「最不确定」 |
| 0x32a45c | monster-em | leaf | C | 26 指令 0 调用 26 caller，无字符串无票；tiers=monster-em，与 0x32a400 相邻；见「最不确定」 |
| 0x32a4c4 | monster-em | orchestrator | B | 12 callee，monster-em:7 对 quest:4；调 0x9396a8/0x9bd5a0/0x9bd7b8/0x9bd638/0x9bd50c/0x31cc6c；字符串碎片 `ype[2]` |
| 0x32af48 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用，quest:1；tiers=quest |
| 0x32af84 | monster-em | orchestrator | B | 13 callee，monster-em:9 对 quest:3/item:1；调 0x9396a8/0x93992c/0x31c1a0/0x31c03c/0x31d7e8/0x31d92c/0x890adc |
| 0x32b834 | quest | orchestrator | B | 12 callee，quest:10；调本区 0x326c78/0x3288c4/0x328900/0x3267d0/0x3268cc/0x3268d8；字符串 `t[37]`/`aponPreview` |
| 0x32c2b4 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x32c2f0 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x32c31c | quest | worker | C | 15 指令，callees 0x2b8f0/0x13efd7c 两通用 stub，quest:2；tiers=quest |
| 0x32c358 | quest | worker | C | 4078 指令仅 3 callee（0x2b908/0x7aa47c/0x7bb638 全通用），无字符串；tiers=quest；疑大型 switch/状态机 |
| 0x333f30 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x333f6c | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x333f98 | quest | worker | C | 15 指令，callees 0x2b8f0/0x13efd7c 通用，quest:2；tiers=quest |
| 0x333fd4 | quest | worker | C | 13 指令 7 caller，callees 0x2b908/0x7aa47c 通用，quest:2；tiers=quest |
| 0x334008 | player-pl | worker | C | 18767 指令仅调 0x7bb638 一个通用函数，无字符串；tiers=player-pl 但邻域 0x333fxx 全是 quest stub，**冲突且无旁证**，见「最不确定」 |
| 0x346544 | quest | worker | C | 6124 指令唯一 callee 0x8261fc(otomo-ot 通用)，otomo-ot:1；无字符串；随 tiers=quest，见「最不确定」 |
| 0x34c4f4 | otomo-ot | leaf | C | 6042 指令 0 调用 0 字符串 0 票；仅凭 tiers=otomo-ot 与邻域 |
| 0x3543bc | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3543f8 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x354424 | quest | worker | C | 12 指令唯一 callee 0x13efd7c 通用，quest:1；tiers=quest |
| 0x354454 | quest | worker | C | 12 指令唯一 callee 0x7aa47c 通用，quest:1；tiers=quest |
| 0x3559c0 | otomo-ot | worker | C | 590 指令唯一 callee 0x8261fc（通用，otomo-ot 票 1）；无字符串；tiers=otomo-ot |
| 0x3562f8 | quest | worker | B | 10042 指令，6 callee 全通用（0x7aa47c/0x2b8f0/0x13efd7c/0x2b908/0x7bb638/0x7aedcc）；字符串 `cBui`（类名前缀）+ tiers=quest |
| 0x35ffe0 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x360a28 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x360a64 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x360a90 | quest | worker | C | 14 指令唯一 callee 0x2b8f0 通用，quest:1；tiers=quest |
| 0x360ac8 | quest | worker | C | 751 指令仅 3 callee（0x2b908/0x7aa47c/0x7bb638 全通用），quest:3 无区分力；tiers=quest |
| 0x361684 | otomo-ot | worker | C | 364 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x361c34 | quest | worker | A | 字符串 `cFishData`（钓鱼类数据类名）；quest:4 + tiers=quest 同向 |
| 0x362378 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3623b4 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3623e0 | quest | worker | C | 22 指令唯一 callee 0x2b8f0 通用，quest:1；tiers=quest |
| 0x362438 | quest | orchestrator | A | 字符串 `mRewardTable[0..3]`/`resource`（任务报酬表数组）；quest:4 render-gfx:1；5 callee 但含 0x7af630 等，实际 5 个→worker 边界，见备注 |
| 0x362bbc | quest | worker | C | 71 指令，callees 0x8261fc(通用)/0x23210c（A 级 quest，55 指令），quest:1；tiers=quest |
| 0x362cd8 | quest | orchestrator | A | 字符串 `cFreeHuntData`/`cHagi`（自由狩猎数据类）；quest:8，callees 含 A 级 0x231d2c；8 callee→orchestrator |
| 0x367f40 | quest | worker | C | 29 指令唯一 callee 0x2b8f0 通用；tiers=quest |
| 0x367fb4 | quest | worker | C | 7419 指令仅 3 callee（0x2b908/0x7aa47c/0x7bb638 全通用），无字符串；tiers=quest |
| 0x36f3a0 | otomo-ot | worker | C | 63 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x36ff68 | otomo-ot | worker | C | 144 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x37a8bc | otomo-ot | worker | C | 54 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x37ac8c | quest | worker | C | 13 指令，callees 0x2b8f0/0x13efd7c 通用，quest:2；tiers=quest |
| 0x37b548 | quest | worker | B | 49 指令调 0x2321e8（A 级 quest，238 指令），quest:1 但来源为 A 级函数；tiers=quest |
| 0x37beec | otomo-ot | worker | C | 88 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x37cff0 | otomo-ot | worker | C | 285 指令唯一 callee 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x37d464 | quest | worker | B | 3892 指令，字符串 `cRem`（类名前缀）；4 callee 全通用但 quest:4 + tiers=quest 同向 |
| 0x381134 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x381170 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x38119c | quest | leaf | C | 22 指令 0 调用 0 字符串；tiers=quest，邻 0x381170/0x3811f4 皆 quest |
| 0x3811f4 | quest | worker | A | 字符串 `mResource[0..2]`/`mResource0`（资源数组）；quest:4 render-gfx:1；5 caller |
| 0x3815cc | quest | worker | B | 91 指令，quest:3（0x826c38/0x13efd94/0x23210c）对 online-nex:1（0x13efd88，A 级 online 短函数）；tiers=quest |
| 0x381738 | quest | worker | A | 字符串 `cResourceSample`（类名）+ quest:5（含 0x231d2c A 级 quest）；tiers=quest |
| 0x381a78 | quest | worker | C | quest:4 对 monster-em:3（1.33 倍不足 1.5），callees 0x3a5ed0/0x3a9e7c/0x5232cc/0x3c7134 等；tiers=quest |
| 0x381fec | monster-em | worker | B | monster-em:7（0x3ae5b8/0x3a3284/0x3a3370/0x275a30/0x26fe10/0x3822bc）+ tiers=monster-em |
| 0x38211c | quest | worker | C | 唯一票 monster-em:1 来自通用 0x3f8344；无字符串；随 tiers=quest |
| 0x3822bc | monster-em | worker | C | 票 1:1（monster-em 0x275a30 对 quest 0xe0da0）；随 tiers=monster-em |
| 0x3828e8 | monster-em | worker | C | 票 monster-em:2 quest:2 item:1 三项分散；callees 含 A 级 item 0x354484 与 quest 0x3a3874；随 tiers=monster-em |
| 0x382e1c | monster-em | worker | B | monster-em:3 对 item:1/quest:1；callees 0x3c6124/0x3822bc/0x37c500/0x38211c；tiers=monster-em |
| 0x382ffc | quest | orchestrator | B | ≥8 callee，quest:10 对 monster-em:3/otomo-ot:1；调 0x3c6d44/0x3a8bdc/0x3c6dd8/0x3c6df8/0x3c613c 等本区 quest 函数；字符串碎片 `UKA<2_UF<7` |
| 0x383980 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3839bc | otomo-ot | worker | B | otomo-ot:7 对 quest:4；callees 0x54ed74(A 级 otomo)/0x553030/0x39106c/0xdad24/0x384208 |
| 0x384208 | otomo-ot | worker | C | 128 指令仅调 0x13efdac（通用），quest:1 无意义；随 tiers=otomo-ot |
| 0x384408 | otomo-ot | worker | C | otomo-ot:5 对 quest:4（1.25 倍）；callees 0x65ca7c/0x570688/0x65ca84/0x6a64b8/0x570710/0x38468c |
| 0x38468c | quest | orchestrator | B | ≥14 callee，quest:28 otomo-ot:1；调 0x570688/0x5bb87c/0x5bc0e8/0x5bc490/0x5b9d88/0x384af0/0x385bc4/0x385f6c |
| 0x384af0 | quest | orchestrator | B | ≥8 callee，quest:12 对 monster-em:2/otomo-ot:2/item:1；调 0x3a75b0/0x3b2174/0x38e214/0x388ab4/0x388d40/0x3f18b8 |
| 0x3850b0 | quest | orchestrator | B | ≥14 callee，quest:20；调 0x54edec/0x553a74/0x57edac/0x3f85fc/0x38a6a4/0x18e920/0x54f260 |
| 0x385a54 | quest | orchestrator | B | 13 callee，quest:10 对 monster-em:3；调本区 0x381a78/0x38a950/0x38aca4/0x38af0c/0x38b124/0x3c2f60 |
| 0x385bc4 | quest | worker | B | 7 callee 全 quest 票（0x65cb3c/0x54edec/0x3c6f80/0x54ee34/0x3f85fc/0x54ee98/0x54f260）；与 0x385e30 同形 |
| 0x385d10 | quest | worker | B | quest:6（0x65cb3c/0x54edec/0x54ee34/0x3f85fc/0x54ee98/0x54f260） |
| 0x385e30 | quest | worker | B | quest:7（同 0x385bc4 的 callee 集 +0x3c6f80） |
| 0x385f6c | quest | worker | B | quest:5（0x65cb3c/0x54edec/0x3f85fc/0x54ee98/0x54f260） |
| 0x38607c | quest | worker | B | quest:5（同 0x385f6c 的 callee 集） |
| 0x38618c | quest | worker | B | quest:5（同 0x385f6c 的 callee 集） |
| 0x38629c | quest | worker | B | quest:6（0x65cb3c/0x54edec/0x3f85fc/0x54f260/0x4e3478/0x54ee98） |
| 0x3863f8 | quest | worker | B | quest:4（0x65cb3c/0x3f85fc/0x54f260/0x3f8534） |
| 0x386580 | quest | worker | B | quest:5（0x65cb3c/0x54edec/0x3f85fc/0x54ee98/0x54f260） |
| 0x38669c | quest | orchestrator | B | 9 callee，quest:9；调 0x38b904/0x3ea6e8/0x524e58/0x525938/0x525a9c/0x38bcb8/0x381a78 |
| 0x3867b4 | quest | worker | B | quest:5（0x65cb3c/0x3f85fc/0x4e3478/0x54f260/0x3f8534） |
| 0x3869a8 | quest | orchestrator | B | 10 callee，quest:7 otomo-ot:2 monster-em:1；调 0x38ce60/0x38d2c0/0x386c6c/0x38701c/0x3872d0/0x387454 |
| 0x386c6c | quest | orchestrator | B | 13 callee，quest:12 otomo-ot:1；调 0x623a04/0x623c08/0x623a6c/0x624664/0x3906e0/0x5bc0f4/0x5bb910 |
| 0x38701c | quest | orchestrator | B | 14 callee，quest:10 对 otomo-ot:4；调 0x623a04/0xdaba4/0xdadf0/0xdadc4/0xddd48/0x552988/0x57f468 |
| 0x3872d0 | otomo-ot | worker | B | otomo-ot:4 对 quest:2；callees 0x65e5bc/0x65d464/0x65e794/0x6a2c78 |
| 0x3873cc | quest | worker | C | 34 指令，quest:2 otomo-ot:1（0x65cbe8/0x6a2c78/0x65cb3c 涉通用）；tiers=quest |
| 0x387454 | quest | worker | C | 35 指令，同 0x3873cc 模式（quest:2 otomo-ot:1）；tiers=quest |
| 0x388a48 | otomo-ot | worker | C | 12 指令唯一 callee 0x55d2b4（A 级 otomo-ot 短函数），otomo-ot:1；tiers=otomo-ot |
| 0x388a78 | otomo-ot | worker | C | 15 指令唯一 callee 0x55d2b4（A 级 otomo-ot），otomo-ot:1；tiers=otomo-ot |
| 0x388ab4 | monster-em | orchestrator | B | 10 callee，monster-em:8 quest:2；调 0x38e75c/0x38d990/0x38e84c/0x38eae4/0x3c6d44/0x38f278 |
| 0x388d40 | quest | orchestrator | B | 11 callee，quest:6 monster-em:3 otomo-ot:1 render-gfx:1；调 0x3a8c3c/0x3a3424/0x523da4/0x5106f8/0x523f30/0x50cbd0 |
| 0x388ee8 | quest | orchestrator | B | ≥14 callee，quest:27；调 0x54edec/0x5530b8/0x54fc94/0x38a408/0x54f260/0x65f98c/0x65cbe8 |
| 0x38a1d8 | quest | worker | C | 65 指令，quest:2（0x65cb3c/0x65cc0c 涉通用）；tiers=quest |
| 0x38a2dc | quest | worker | B | quest:4（0x199390/0x19945c/0x54f260/0x3a864c） |
| 0x38a408 | quest | worker | B | quest:3（0x3c6c6c/0x523150 非通用 + 0x194228 通用）；tiers=quest |
| 0x38a5cc | quest | worker | C | 54 指令唯一 callee 0x65cbe8 通用，quest:1；tiers=quest |
| 0x38a6a4 | quest | worker | C | quest:2 otomo-ot:1（0xdac14/0x38d468 与通用 0x194228）；tiers=quest |
| 0x38a7cc | quest | worker | B | quest:4（0x13f03c/0x3c6b64/0x523150 + 通用 0x194228）；tiers=quest |
| 0x38a950 | monster-em | orchestrator | B | ≥14 callee，monster-em:13 对 quest:3；调 0x3ae21c/0x3a9e38/0x3ae3b4/0x3a9e54/0x3a2900/0x3abb3c/0x3c7034 |
| 0x38aca4 | quest | worker | B | quest:4 monster-em:1（0x166ad0/0x3b5ac0/0x3c2f60/0x523194）；tiers=quest |
| 0x38af0c | monster-em | orchestrator | B | 9 callee，monster-em:7 quest:2；调 0x3ae21c/0x3a8c3c/0x3a9f10/0x3a2900/0x275a30/0x26fe10/0x523194 |
| 0x38b124 | quest | worker | B | quest:6 monster-em:1（0x3a5ed0/0x3a9e7c/0x3a9ea4/0x523a80/0x3a9e90/0x523b0c） |
| 0x38b230 | monster-em | worker | C | 票 monster-em:2 quest:2 平票（0x38b808/0x3c6d44 对 0xe715c）；随 tiers=monster-em |
| 0x38b34c | quest | worker | C | 104 指令，quest:2（0x65cb3c 通用 + 0x194228 通用）；tiers=quest |
| 0x38b4ec | monster-em | orchestrator | B | ≥14 callee，monster-em:11 对 quest:3；调 0x3a9f54/0x3c7134/0x3ae21c/0x3a8c3c/0x3a2900/0x3ae378/0x523700 |
| 0x38b808 | monster-em | worker | B | monster-em:3 对 quest:2（1.5 倍）；callees 0x3a75b0/0x3ae744/0x3c6dcc/0x25f840/0x264ed8 |
| 0x38b904 | quest | orchestrator | B | ≥14 callee，quest:27 对 monster-em:4/otomo-ot:2；调 0x54b0d4/0x3a340c/0x26248c/0x244f14/0x50636c/0x195758 |
| 0x38bcb8 | quest | orchestrator | B | 8 callee，quest:8；调 0x38ddf4/0x5262b4/0x1c8ca8/0x244f14/0x38df54/0x38e0b4/0x3b2174 |
| 0x38ce60 | monster-em | orchestrator | B | 12 callee，monster-em:9 quest:2；调 0x3a9f54/0x3a5ed0/0x3ad924/0x7ca420/0x164900/0x165128/0x38f454 |
| 0x38d2c0 | quest | worker | B | 71 指令，quest:5（0x523504/0x3b5bb4/0x3b98cc/0x244f14/0x523da4） |
| 0x38d3dc | otomo-ot | worker | C | 35 指令唯一 callee 0x55d2b4（A 级 otomo-ot），otomo-ot:1；tiers=otomo-ot |
| 0x38d468 | quest | worker | C | quest:2 otomo-ot:1 monster-em:1（0x14bba8/0xdad24/0x38d6dc/0x13f70c 分散）；tiers=quest |
| 0x38d580 | otomo-ot | worker | C | 11 指令唯一 callee 0x55d2b4（A 级 otomo-ot）；tiers=otomo-ot |
| 0x38d5ac | otomo-ot | worker | C | 33 指令唯一 callee 0x55d2b4（A 级 otomo-ot）；tiers=otomo-ot |
| 0x38d630 | otomo-ot | worker | C | 25 指令唯一 callee 0x55d2b4（A 级 otomo-ot）；tiers=otomo-ot |
| 0x38d694 | otomo-ot | worker | C | 18 指令 4 caller，唯一 callee 0x55d2b4（A 级 otomo-ot）；tiers=quest 与之冲突，取 A 级 callee |
| 0x38d6dc | quest | worker | C | 81 指令，quest:2 monster-em:1（0x38d820/0x3f8344）；tiers=quest |
| 0x38d820 | quest | worker | B | quest:3 monster-em:1（0x3a8bdc A 级 quest + 0x3c6dd8/0x3c6df8 A 级 quest） |
| 0x38d990 | monster-em | orchestrator | B | ≥14 callee，monster-em:13 quest:1；调 0x524580/0x5245a8/0x3ae744/0x38dcdc/0x526d94/0x526e00/0x1c95a4 |
| 0x38dcdc | monster-em | worker | B | monster-em:4 对 quest:1（0x50bdc/0x50c5c/0x55ff98/0x560058/0x1636a8） |
| 0x38ddf4 | quest | worker | C | 88 指令唯一 callee 0x524040，quest:1；tiers=quest |
| 0x38df54 | quest | worker | C | 88 指令唯一 callee 0x52462c，quest:1；tiers=quest |
| 0x38e0b4 | quest | worker | C | 88 指令唯一 callee 0x5245f8，quest:1；tiers=quest |
| 0x38e214 | quest | worker | C | quest:4 monster-em:1（0x7ca420/0xdf814/0x3ad924/0x390e98）；tiers=quest |
| 0x38e75c | monster-em | worker | B | monster-em:3（0x3b5b28/0x3a5ed0/0x3a30f4 皆 monster-em）；tiers=monster-em |
| 0x38e84c | monster-em | orchestrator | B | ≥14 callee，monster-em:10 对 otomo-ot:2/quest:2；调 0x3b9870/0x3b9ff8/0x3b98e8/0x3b9a18/0x3b9b60/0x3b9ccc/0x3b9e50 |
| 0x38eae4 | monster-em | worker | C | monster-em:6 对 quest:5/otomo-ot:3（1.2 倍，未达 1.5）；callees 与 0x38e84c 同族；tiers=quest 冲突，取票领先 |
| 0x38f278 | monster-em | worker | B | monster-em:8 对 otomo-ot:2；调 0x3b9e50/0x3a9f54/0x3b9a18/0x3a8d68/0x3b5af0/0x3ba100/0x3b9ff8 |
| 0x38f454 | monster-em | orchestrator | B | ≥14 callee，monster-em:13 对 quest:6；调 0x3ae750/0x3a8708/0x3abb14/0x55ff98/0x3a5364/0x390cd0/0x3a3778 |
| 0x3906e0 | quest | worker | C | quest:1/otomo-ot:2（0x65e67c/0x65e5bc）；tiers=quest |
| 0x390aac | otomo-ot | worker | B | otomo-ot:3（0x18e930/0x65e5bc/0x65e6bc）；tiers=otomo-ot |
| 0x390cd0 | monster-em | worker | C | 114 指令唯一 callee 0x1636a8，monster-em:1；tiers=monster-em |
| 0x390e98 | quest | worker | C | quest:2 monster-em:1（0x13efe30/0x7ca420/0x3ad924）；tiers=quest |
| 0x39106c | quest | worker | C | quest:3/otomo-ot:1/monster-em:1，非通用 callee 仅 0xdad24/0x13efda0（其余 0x7aa47c/0x7aedcc/0x2b8f0 通用）；tiers=otomo-ot 冲突，取票领先 |
| 0x3914a8 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3914e4 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x391510 | quest | worker | C | 14 指令唯一 callee 0x2b8f0 通用；tiers=quest |
| 0x391548 | quest | worker | C | 13 指令 3 caller，callees 0x2b908/0x7aa47c 通用；tiers=quest |
| 0x39157c | quest | worker | C | 189 指令唯一 callee 0x7bb638 通用，quest:1；tiers=quest |
| 0x391870 | quest | leaf | C | 34 指令 0 调用 0 字符串；tiers=quest，夹在 quest stub 群中 |
| 0x3918f8 | quest | worker | B | 336 指令，7 callee 全 quest 票 + tiers=quest；字符串 `cSetEmMain`（敌方配置集类名，但归属 quest 侧配置，见「最不确定」） |
| 0x391e38 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x391e74 | quest | worker | C | 11 指令 3 caller，唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x391ea0 | quest | worker | C | 12 指令唯一 callee 0x13efd7c 通用；tiers=quest |
| 0x391ed0 | quest | worker | C | 12 指令 3 caller，唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x391f00 | quest | worker | C | 3668 指令仅调 0x7bb638 通用，quest:1；tiers=quest；疑巨型状态机 |
| 0x395850 | otomo-ot | worker | C | 1404 指令仅调 0x8261fc（通用），otomo-ot:1；tiers=otomo-ot |
| 0x396e40 | quest | worker | A | 字符串 `cSupplyList`（补给品列表类名）；quest:6 + tiers=quest 同向 |
| 0x3986dc | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x398718 | quest | worker | B | 128 指令 7 callee，quest:6 对 audio:1；callees 0x8870b8/0x887100/0x8260d4/0x826130/0x398918；tiers 预测 audio，票数压倒 |
| 0x398918 | quest | orchestrator | B | ≥14 callee，quest:19 对 audio:3/otomo-ot:2/monster-em:1；调 0x82772c/0x827ad4/0x827998/0x8278e0/0x827cd0/0x8277c4/0x32c358 |
| 0x399264 | quest | orchestrator | B | ≥14 callee，quest:18 otomo-ot:1；调 0x8870b8/0x333fd4/0x333f6c/0x82772c/0x827bbc/0x827998/0x34c4f4 |
| 0x3996e0 | quest | orchestrator | B | ≥14 callee，quest:18 otomo-ot:1；调 0x8870b8/0x354454/0x3543f8/0x82772c/0x827bbc/0x3562f8/0x8260d4 |
| 0x399b5c | quest | worker | C | 92 指令，quest:4 但 callees 0x7aedcc/0x7aa47c/0x8870b8/0x13efd7c 全属通用组；tiers=quest |
| 0x399ccc | quest | orchestrator | B | ≥14 callee，quest:23 对 monster-em:2/audio:1/otomo-ot:1；调 0x36000c/0x35ffe0/0x82772c/0x827998/0x8277c4/0x398918 |
| 0x39a6e4 | quest | orchestrator | B | ≥14 callee，quest:19；调 0x362438/0x3623b4/0x362cd8（后两者已 A 级判 quest）/0x827bbc/0x827998 |
| 0x39c660 | quest | orchestrator | B | ≥14 callee，quest:18 otomo-ot:1；32 个 caller；调 0x37c41c/0x37c3c0/0x37d464/0x82772c；tiers 预测 audio，票数压倒 |
| 0x39d45c | quest | orchestrator | B | ≥14 callee，quest:18 otomo-ot:1；调 0x391ed0/0x391e74/0x396e40/0x82772c；tiers 预测 audio，票数压倒 |
| 0x39d8d8 | otomo-ot | orchestrator | C | 8 callee，quest:4 otomo-ot:3 item:1 接近平票；非通用票 0x54ed74(A otomo)/0x553030/0x5e4870 对 0x13efd7c/0x13efdac 通用；13 caller 多为 otomo 侧，tiers=audio 冲突 |
| 0x39de20 | otomo-ot | orchestrator | B | 10 callee，otomo-ot:6 对 quest:3/item:1；调 0x54ed74(A otomo)/0x5e4870/0x553030/0x39e0e0/0x39e1a0/0x5e48a8 |
| 0x39e0e0 | otomo-ot | worker | C | 48 指令 4 caller，callees 0x887660/0x13efd7c 全通用，quest:2 无区分力；tiers=otomo-ot |
| 0x39e1a0 | otomo-ot | orchestrator | B | ≥14 callee，otomo-ot:23 对 quest:11/monster-em:2；调 0x153370/0x39e0e0/0x5e48a8/0x8878e4/0x13efdc4/0x51cee8 |
| 0x3a00c8 | otomo-ot | worker | C | 109 指令，otomo-ot:2（0x3a53b8/0x65ddc4）；tiers=otomo-ot |
| 0x3a027c | otomo-ot | orchestrator | B | 12 callee，otomo-ot:11 render-gfx:1；调 0x3a59f0/0x3bd244/0x3a5bbc/0x65dd68/0x3a2920/0x3c06b4/0x3a24ac |
| 0x3a08e8 | otomo-ot | orchestrator | B | 10 callee，otomo-ot:5 monster-em:3 quest:1 render-gfx:1；调 0x3a4428/0x3aa104/0x2173dc/0x680f0/0x68a70 |
| 0x3a1c68 | otomo-ot | orchestrator | B | 13 callee，otomo-ot:7 monster-em:3 quest:2 render-gfx:1；调 0x3a4554/0x3a4694/0x3a4428/0x276278/0x2864d4/0x65dd68 |
| 0x3a23b8 | otomo-ot | worker | C | 58 指令，otomo-ot:2（0x227b3c/0x215aa0）；tiers=otomo-ot |
| 0x3a24a0 | otomo-ot | thunk | C | 3 指令 0 调用 4 caller；tiers=otomo-ot |
| 0x3a24ac | otomo-ot | worker | C | 票 monster-em:2 otomo-ot:1（0x3bcf68/0x3b5b28 对 0x65dd68）；随 tiers=otomo-ot |
| 0x3a2900 | monster-em | leaf | C | 8 指令 0 调用 4 caller，无票；tiers=monster-em |
| 0x3a2920 | otomo-ot | worker | C | 108 指令，otomo-ot:1/audio:1（0x65dd68/0x39d8d8）；tiers=otomo-ot |
| 0x3a30a4 | otomo-ot | leaf | C | 20 指令 0 调用；tiers=otomo-ot |
| 0x3a30f4 | monster-em | leaf | C | 22 指令 0 调用 2 caller；tiers=monster-em |
| 0x3a314c | monster-em | leaf | C | 11 指令 0 调用；tiers=monster-em |
| 0x3a3178 | otomo-ot | leaf | C | 14 指令 0 调用 5 caller；tiers=otomo-ot |
| 0x3a3284 | monster-em | leaf | C | 6 指令 0 调用；tiers=monster-em |
| 0x3a329c | quest | worker | C | 53 指令唯一 callee 0x39cadc（A 级 quest），quest:1；tiers 预测 item，取 A 级 callee 证据 |
| 0x3a3370 | monster-em | leaf | C | 6 指令 0 调用；tiers=monster-em |
| 0x3a3388 | monster-em | leaf | C | 9 指令 0 调用；邻 0x3a3370/0x3a3470 皆 monster-em |
| 0x3a33ac | monster-em | leaf | C | 9 指令 0 调用；monster-em 邻域（0x3a3370/0x3a3470） |
| 0x3a33d0 | monster-em | leaf | C | 9 指令 0 调用；monster-em 邻域 |
| 0x3a33f4 | item | leaf | C | 6 指令 0 调用；tiers=item |
| 0x3a3470 | monster-em | leaf | C | 14 指令 0 调用；tiers=monster-em |
| 0x3a358c | otomo-ot | leaf | C | 6 指令 0 调用；tiers=otomo-ot |
| 0x3a35a4 | audio | worker | C | 17 指令唯一 callee 0x39c660（tiers=audio），audio:1；tiers=audio |
| 0x3a35e8 | audio | worker | C | 13 指令唯一 callee 0x39c660，audio:1；tiers=audio |
| 0x3a361c | audio | worker | C | 14 指令唯一 callee 0x39c660，audio:1；与 0x3a35e8 同族 |
| 0x3a3654 | audio | worker | C | 14 指令唯一 callee 0x39c660，audio:1；同族 |
| 0x3a368c | audio | worker | C | 14 指令唯一 callee 0x39c660，audio:1；同族 |
| 0x3a36c4 | audio | worker | C | 17 指令唯一 callee 0x39c660，audio:1；同族 |
| 0x3a3708 | audio | worker | C | 14 指令唯一 callee 0x39c660，audio:1；同族 |
| 0x3a3740 | audio | worker | C | 14 指令唯一 callee 0x39c660，audio:1；同族 |
| 0x3a3778 | quest | worker | C | 63 指令 10 caller，唯一 callee 0x37a2e4（A 级 quest，40 指令），quest:1；tiers 预测 monster-em，取 A 级 callee |
| 0x3a3930 | monster-em | worker | C | 15 指令唯一 callee 0x50b64（A 级 monster-em），monster-em:1；tiers=monster-em |
| 0x3a396c | otomo-ot | leaf | C | 120 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3a400c | otomo-ot | worker | C | 票 quest:1/otomo-ot:1/monster-em:1 三项平票（0x3a3d3c/0x227b3c/0x216bd4）；tiers=otomo-ot |
| 0x3a4314 | render-gfx | worker | C | 46 指令，render-gfx:1/otomo-ot:1（0x227a98/0x227b3c）；tiers=render-gfx |
| 0x3a4428 | otomo-ot | worker | C | 66 指令，otomo-ot:2/render-gfx:1（0x227a98/0x3c06b4/0x227ba8）；tiers=otomo-ot |
| 0x3a4554 | otomo-ot | worker | C | 80 指令，otomo-ot:2/monster-em:1（0x3aaf60/0x4edec/0x153370）；tiers=otomo-ot |
| 0x3a4694 | otomo-ot | orchestrator | B | 8 callee，otomo-ot:5 monster-em:2 quest:1；调 0x4ed10/0x13effa4/0x4ed48/0x152fcc/0x153030/0x3cd56c/0x4ed9c |
| 0x3a4c0c | audio | leaf | C | 56 指令 0 调用 11 caller；tiers=audio |
| 0x3a53b8 | otomo-ot | worker | B | 226 指令，otomo-ot:3/render-gfx:1（0x3c06b4/0x227a98/0x227ba8/0x227b3c）；tiers=otomo-ot |
| 0x3a5740 | monster-em | leaf | C | 40 指令 0 调用；tiers=monster-em |
| 0x3a57e0 | otomo-ot | worker | C | 132 指令，otomo-ot:2/render-gfx:1（0x227a98/0x227b3c/0x65dd68）；tiers 预测 render-gfx，取票领先 |
| 0x3a59f0 | otomo-ot | worker | C | 100 指令，otomo-ot:2/render-gfx:1（0x227a98/0x227b3c/0x216708）；tiers=otomo-ot |
| 0x3a5b80 | item | leaf | C | 15 指令 0 调用 8 caller，无票；tiers=item |
| 0x3a5bbc | otomo-ot | worker | C | 194 指令，otomo-ot:2/monster-em:1（0x50b64/0x5e438/0x264240）；tiers=otomo-ot |
| 0x3a5ec4 | otomo-ot | thunk | C | 3 指令 0 调用 7 caller；tiers=otomo-ot |
| 0x3a5ed0 | monster-em | leaf | C | 85 指令 0 调用 **141 caller**；tiers=monster-em，且它是大量函数的 monster-em 票来源 |
| 0x3a6024 | monster-em | leaf | C | 54 指令 0 调用 5 caller；tiers=monster-em |
| 0x3a60fc | otomo-ot | thunk | C | 3 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3a6108 | monster-em | orchestrator | B | 12 callee，monster-em:8 对 otomo-ot:3/render-gfx:1；调 0x3bbbbc/0x55ff98/0x3bb9bc/0x3a6f54/0x524534/0x3b5af0/0x3a75c8 |
| 0x3a6f54 | otomo-ot | worker | C | 407 指令，otomo-ot:2/render-gfx:1/monster-em:1（0x227a98/0x227b3c/0x216708/0x5c970）；tiers 预测 render-gfx，取票领先 |
| 0x3a75bc | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3a75c8 | otomo-ot | orchestrator | B | 8 callee，otomo-ot:6 对 monster-em:1/render-gfx:1；调 0x50b64/0x264240/0x227a98/0x65ddc4/0x3a400c/0x3a83a4 |
| 0x3a7f34 | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3a7f40 | otomo-ot | worker | C | 279 指令，render-gfx:1/otomo-ot:1（0x3a6f54/0x3a75c8，两 callee 均 otomo 系）；tiers=otomo-ot |
| 0x3a839c | otomo-ot | thunk | C | 2 指令 0 调用；tiers=otomo-ot |
| 0x3a83a4 | otomo-ot | worker | B | 152 指令，otomo-ot:3 对 quest:1/audio:1；调 0x227b3c/0x21628c/0x65dd68/0x39d8d8/0x54f260 |
| 0x3a8708 | monster-em | thunk | C | 2 指令 0 调用 4 caller；tiers=monster-em |
| 0x3a8710 | otomo-ot | worker | C | 262 指令，otomo-ot:2/render-gfx:1（0x227a98/0x227b3c/0x216708）；tiers=otomo-ot |
| 0x3a8b28 | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3a8b34 | otomo-ot | thunk | C | 4 指令 0 调用；夹在 0x3a8b28(monster)/0x3a8b7c(otomo) 之间，取 otomo-ot |
| 0x3a8b54 | otomo-ot | leaf | C | 10 指令 0 调用；otomo-ot 邻域（0x3a8b34/0x3a8b7c） |
| 0x3a8b7c | otomo-ot | leaf | C | 14 指令 0 调用；tiers=otomo-ot |
| 0x3a8c04 | monster-em | worker | C | 14 指令唯一 callee 0x5c970，monster-em:1；tiers=monster-em |
| 0x3a8c3c | monster-em | thunk | C | 2 指令 0 调用 5 caller；tiers=monster-em |
| 0x3a8c44 | otomo-ot | leaf | C | 17 指令 0 调用；tiers=otomo-ot |
| 0x3a8c88 | otomo-ot | leaf | C | 11 指令 0 调用；tiers=otomo-ot |
| 0x3a8cb4 | monster-em | leaf | C | 6 指令 0 调用 4 caller；tiers=monster-em |
| 0x3a8ccc | render-gfx | leaf | C | 39 指令 0 调用；tiers=render-gfx |
| 0x3a8d68 | monster-em | leaf | C | 16 指令 0 调用但 **1089 caller**；tiers=monster-em，是本区最热取用器，见「最不确定」 |
| 0x3a8da8 | monster-em | worker | C | 28 指令，quest:2（0x3b5bb4/0x3b98cc 皆 A 级 quest）对 tiers=monster-em，冲突且票数不足 3，随 tiers |
| 0x3a8ef4 | audio | leaf | C | 41 指令 0 调用 3 caller；tiers=audio |
| 0x3a8f98 | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3a8fa4 | otomo-ot | thunk | C | 2 指令 0 调用 4 caller；tiers=otomo-ot |
| 0x3a8fac | otomo-ot | leaf | C | 27 指令 0 调用；otomo-ot 邻域 |
| 0x3a9018 | otomo-ot | worker | C | 53 指令，otomo-ot:1/monster-em:1（0x7af4d4/0x80e258）；取 otomo-ot（邻域） |
| 0x3a90ec | otomo-ot | worker | B | 138 指令，otomo-ot:3 对 monster-em:1（0x227b3c/0x215aa0/0x7af4d4/0x80e258） |
| 0x3a9314 | otomo-ot | worker | C | 38 指令唯一 callee 0x227a98（render-gfx，通用矩阵类），render-gfx:1；取 otomo-ot（邻域） |
| 0x3a93ac | otomo-ot | worker | B | 57 指令，otomo-ot:3 对 render-gfx:1/monster-em:1（0x3bf8c8/0x227ba8/0x205258） |
| 0x3a9490 | otomo-ot | worker | B | 177 指令，otomo-ot:6（0x526f70/0x227ba8/0x227b3c/0x215aa0/0x3a24ac/0x65dd68） |
| 0x3a9754 | otomo-ot | worker | C | 46 指令，render-gfx:1/otomo-ot:1/monster-em:1 平票（0x227a98/0x227b3c/0x3a980c）；取 otomo-ot（邻域） |
| 0x3a980c | otomo-ot | orchestrator | C | 11 callee，otomo-ot:4 monster-em:4 quest:3 近乎平票；调 0x274ce4/0x2864d4/0x275a30/0x26fe10/0x3f8634/0x5543d4 |
| 0x3a9bb8 | otomo-ot | worker | C | 90 指令，otomo-ot:2/monster-em:1/render-gfx:1（0x227ba8/0x3a980c/0x227a98） |
| 0x3a9d20 | otomo-ot | leaf | C | 6 指令 0 调用；otomo-ot 邻域 |
| 0x3a9d38 | otomo-ot | worker | B | 64 指令，otomo-ot:4 对 monster-em:1/render-gfx:1（0x227ba8/0x227b3c/0x205258/0x3a24ac/0x3bf8c8） |
| 0x3a9e38 | otomo-ot | thunk | C | 2 指令 0 调用；otomo-ot 邻域 |
| 0x3a9e40 | otomo-ot | leaf | C | 5 指令 0 调用；otomo-ot 邻域 |
| 0x3a9e54 | otomo-ot | leaf | C | 5 指令 0 调用；otomo-ot 邻域 |
| 0x3a9e68 | monster-em | leaf | C | 5 指令 0 调用；tiers=monster-em |
| 0x3a9f10 | monster-em | leaf | C | 17 指令 0 调用；tiers=monster-em |
| 0x3a9f54 | monster-em | leaf | C | 12 指令 0 调用 7 caller；tiers=monster-em |
| 0x3a9f84 | monster-em | worker | C | 96 指令，monster-em:2/otomo-ot:1/quest:1（0x3aa104/0x5d628/0x68c40/0xc2634）；tiers=monster-em |
| 0x3aa104 | otomo-ot | leaf | C | 141 指令 0 调用 4 caller；tiers=otomo-ot |
| 0x3aa338 | otomo-ot | worker | C | 126 指令，otomo-ot:2/monster-em:1（0x5ebb4/0x60674/0x5e03c）；tiers=otomo-ot |
| 0x3aa530 | monster-em | leaf | C | 166 指令 0 调用 3 caller；tiers=monster-em |
| 0x3aa93c | monster-em | worker | C | 127 指令，monster-em:2（0x68a70/0x6571c）；票数不足 3，仍取 monster-em |
| 0x3aad08 | otomo-ot | leaf | C | 49 指令 0 调用；tiers=otomo-ot |
| 0x3aadcc | otomo-ot | leaf | C | 101 指令 0 调用；otomo-ot 邻域 |
| 0x3aaf60 | otomo-ot | worker | C | 213 指令唯一 callee 0x5e438，otomo-ot:1；邻域 otomo-ot |
| 0x3ab2b4 | otomo-ot | worker | B | 181 指令 7 callee，otomo-ot:5 对 quest:2（0x4d31a4/0x4d3a08/0x4d31b4/0x4d31c4/0x4d31f4） |
| 0x3ab588 | monster-em | worker | C | 319 指令，monster-em:2（0x275a30/0x3f8344）；取 monster-em |
| 0x3aba84 | otomo-ot | leaf | C | 36 指令 0 调用；otomo-ot 邻域 |
| 0x3abb14 | otomo-ot | leaf | C | 10 指令 0 调用 **10 caller**；otomo-ot 邻域 |
| 0x3abb3c | otomo-ot | leaf | C | 17 指令 0 调用 4 caller；otomo-ot 邻域 |
| 0x3abb80 | otomo-ot | worker | C | 27 指令唯一 callee 0x605e4，otomo-ot:1；tiers=otomo-ot |
| 0x3abbf8 | monster-em | thunk | C | 2 指令 0 调用 3 caller；tiers=monster-em |
| 0x3abc00 | render-gfx | orchestrator | C | ≥14 callee，render-gfx:4 monster-em:4 audio:3 quest:2 近乎平票；调 0x3b5af0/0x3b5b28/0x3b5bb4/0x3bd244/0x3accbc/0x3ace14/0x3aadcc；tiers=render-gfx |
| 0x3accbc | audio | worker | C | 86 指令唯一 callee 0x39d8d8，audio:1；tiers=audio |
| 0x3ace14 | audio | worker | C | 229 指令，monster-em:1/audio:1（0x3f8344/0x3accbc）；tiers=audio |
| 0x3ad250 | monster-em | leaf | C | 10 指令 0 调用；tiers=monster-em |
| 0x3ad278 | monster-em | leaf | C | 10 指令 0 调用；tiers=monster-em |
| 0x3ad2a0 | render-gfx | worker | C | 61 指令，render-gfx:1/quest:1/otomo-ot:1/monster-em:1 四项平票；tiers=render-gfx |
| 0x3ad394 | otomo-ot | worker | B | 226 指令 8 callee，otomo-ot:3 对 quest:2/monster-em:2/render-gfx:1；调 0x3c0384(A quest)/0x3c0714/0x3c06b4/0x14fb50 |
| 0x3ad71c | otomo-ot | worker | C | 130 指令，otomo-ot:1/monster-em:1（0x227b3c/0x21539c）；tiers=otomo-ot |
| 0x3ad934 | monster-em | leaf | C | 8 指令 0 调用；tiers=monster-em |
| 0x3ad954 | otomo-ot | thunk | C | 1 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3ad958 | otomo-ot | thunk | C | 1 指令 0 调用；tiers=otomo-ot |
| 0x3ad95c | monster-em | worker | B | 156 指令 7 callee，monster-em:4 对 otomo-ot:2/quest:1（0x39e0e0/0x3b6290/0x276278/0x2864d4/0x14cbe8/0x3b9a18） |
| 0x3adbcc | monster-em | worker | B | 154 指令，monster-em:4 对 otomo-ot:1（0x68a70/0x3a9f84/0x3aa338/0x3aa530/0x3aa93c） |
| 0x3ae21c | monster-em | leaf | C | 12 指令 0 调用 9 caller；tiers=monster-em |
| 0x3ae260 | monster-em | worker | C | 70 指令，monster-em:1/quest:1（0x3a980c/0x3f8398）；tiers=monster-em |
| 0x3ae378 | monster-em | worker | C | 11 指令唯一 callee 0x3f8398，quest:1；随 tiers=monster-em |
| 0x3ae3a4 | monster-em | thunk | C | 4 指令 0 调用；tiers=monster-em |
| 0x3ae3b4 | otomo-ot | leaf | C | 5 指令 0 调用 6 caller；tiers=otomo-ot |
| 0x3ae5b8 | monster-em | leaf | C | 31 指令 0 调用；tiers=monster-em |
| 0x3ae634 | otomo-ot | leaf | C | 68 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3ae744 | monster-em | thunk | C | 3 指令 0 调用 23 caller；tiers=monster-em |
| 0x3ae750 | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3ae768 | monster-em | thunk | C | 3 指令 0 调用 2 caller；tiers=monster-em |
| 0x3ae788 | monster-em | worker | B | 35 指令，monster-em:3（0x3b9870/0x3bce2c/0x3b5af0） |
| 0x3ae894 | otomo-ot | worker | C | 28 指令，otomo-ot:2（0x65dd68/0x227b3c）；tiers=otomo-ot |
| 0x3ae904 | otomo-ot | leaf | C | 14 指令 0 调用 6 caller；tiers=otomo-ot |
| 0x3ae93c | audio | worker | C | 29 指令唯一 callee 0x39c660，audio:1；tiers=audio |
| 0x3ae9b0 | audio | worker | C | 29 指令唯一 callee 0x39c660，audio:1；tiers=audio |
| 0x3aeab8 | audio | worker | C | 82 指令唯一 callee 0x39c660，audio:1；tiers=audio |
| 0x3aec00 | audio | worker | C | 48 指令，audio:1/otomo-ot:1（0x3aeab8/0x227b3c）；tiers=audio |
| 0x3aecc0 | monster-em | leaf | C | 6 指令 0 调用 4 caller；tiers=monster-em |
| 0x3aecd8 | monster-em | leaf | C | 13 指令 0 调用 3 caller；monster-em 邻域 |
| 0x3aed0c | monster-em | leaf | C | 38 指令 0 调用 3 caller；monster-em 邻域 |
| 0x3aeda4 | monster-em | leaf | C | 44 指令 0 调用 2 caller；monster-em 邻域 |
| 0x3aee54 | save-data | leaf | C | 91 指令 0 调用 2 caller；tiers=save-data（本区唯一该标签，见「最不确定」） |
| 0x3af160 | otomo-ot | worker | C | 91 指令 19 caller，唯一 callee 0x3f8398，quest:1；随 tiers=otomo-ot |
| 0x3af4d8 | otomo-ot | thunk | C | 3 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3afa00 | otomo-ot | leaf | C | 5 指令 0 调用；tiers=otomo-ot |
| 0x3afa14 | otomo-ot | thunk | C | 2 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3afa1c | otomo-ot | thunk | C | 2 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3afa24 | otomo-ot | leaf | C | 9 指令 0 调用；tiers=otomo-ot |
| 0x3afa54 | otomo-ot | leaf | C | 9 指令 0 调用；tiers=otomo-ot |
| 0x3afa84 | otomo-ot | thunk | C | 4 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3afa94 | otomo-ot | leaf | C | 6 指令 0 调用；tiers=otomo-ot |
| 0x3afaac | otomo-ot | leaf | C | 21 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3afb00 | otomo-ot | worker | B | 149 指令 5 callee，otomo-ot:3 对 quest:1/audio:1（0x227b3c/0x21628c/0x65dd68/0x39d8d8/0x54f260） |
| 0x3b0028 | audio | worker | C | 364 指令，audio:1/otomo-ot:1（0x39d8d8/0x65dd68）；tiers=audio |
| 0x3b0880 | monster-em | worker | B | 150 指令 5 callee，monster-em:3 对 otomo-ot:1/quest:1（0x3f8344/0x27bcd0/0x65dd68/0x4ef090/0x19c2a0） |
| 0x3b0ad8 | otomo-ot | worker | C | 449 指令唯一 callee 0x3af160（otomo-ot），otomo-ot:1；tiers=otomo-ot |
| 0x3b11dc | otomo-ot | worker | C | 24 指令唯一 callee 0x3f8398，quest:1；随 tiers=otomo-ot |
| 0x3b123c | monster-em | worker | B | 400 指令 7 callee，monster-em:4 对 quest:2/otomo-ot:1（0x166ad0/0x3b5ac0/0x274ce4/0x27bcd0/0x275a30/0x276140） |
| 0x3b187c | monster-em | leaf | C | 36 指令 0 调用；tiers=monster-em |
| 0x3b21ac | render-gfx | worker | C | 17 指令 **25 caller**，唯一 callee 0x3d7e90（render-gfx），render-gfx:1；tiers=render-gfx |
| 0x3b2918 | otomo-ot | leaf | C | 15 指令 0 调用 6 caller；tiers=otomo-ot |
| 0x3b29fc | quest | orchestrator | C | ≥14 callee，quest:8 对 otomo-ot:6（1.33 倍）；调 0x3b4a68/0x3b4808/0x3b3db0/0x3af160/0x3a400c/0x3afb00/0x54edec；tiers=otomo-ot 冲突 |
| 0x3b2dac | otomo-ot | orchestrator | B | ≥14 callee，otomo-ot:8 对 quest:6/monster-em:1；调 0x3b4a68/0x3b4808/0x3b3db0/0x3af160/0x3a400c/0x3afb00；tiers=otomo-ot |
| 0x3b3444 | otomo-ot | orchestrator | B | 10 callee，otomo-ot:7 对 quest:3；调 0x3af160/0x3b3db0/0x65de34/0x3b40a4/0x3a400c/0x3afb00；tiers=otomo-ot |
| 0x3b3db0 | otomo-ot | worker | C | 189 指令，quest:1/otomo-ot:1（0x3f8398/0x3af160）；tiers=otomo-ot |
| 0x3b40a4 | otomo-ot | worker | B | 190 指令，otomo-ot:3/render-gfx:1（0x3b439c/0x227a98/0x227b3c/0x216708）；tiers=otomo-ot |
| 0x3b439c | otomo-ot | leaf | C | 61 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3b4490 | otomo-ot | worker | C | 92 指令，otomo-ot:2/render-gfx:1（0x227a98/0x227b3c/0x216708）；tiers=otomo-ot |
| 0x3b4db4 | otomo-ot | leaf | C | 16 指令 0 调用；tiers=otomo-ot |
| 0x3b4df4 | otomo-ot | worker | B | 206 指令 5 callee，otomo-ot:4 对 quest:1（0x227ba8/0x3c06b4/0x13efdac） |
| 0x3b512c | otomo-ot | worker | C | 41 指令唯一 callee 0x15334c，otomo-ot:1；tiers=otomo-ot |
| 0x3b51d0 | otomo-ot | worker | C | 44 指令唯一 callee 0x4ed9c，otomo-ot:1；tiers=otomo-ot |
| 0x3b5280 | monster-em | worker | C | 23 指令唯一 callee 0x4edec，monster-em:1；tiers=monster-em |
| 0x3b598c | otomo-ot | leaf | C | 77 指令 0 调用 11 caller；tiers=otomo-ot |
| 0x3b5ac0 | monster-em | leaf | C | 12 指令 0 调用 **43 caller**；tiers=monster-em |
| 0x3b5af0 | monster-em | leaf | C | 14 指令 0 调用 14 caller；tiers=monster-em |
| 0x3b5b28 | monster-em | leaf | C | 35 指令 0 调用 12 caller；tiers=monster-em |
| 0x3b6290 | otomo-ot | worker | C | 18 指令，quest:1/otomo-ot:1（0x887660/0x3ae60）；tiers=otomo-ot |
| 0x3b7fd8 | kernel-os | worker | B | 38 指令，kernel-os:3（0x7bdb48/0x7bdbb0/0x7bdf3c）对 quest:1；tiers=kernel-os |
| 0x3b8070 | otomo-ot | worker | C | 8 指令唯一 callee 0x7bdf78，quest:1；tiers=otomo-ot |
| 0x3b9870 | monster-em | leaf | C | 13 指令 0 调用 8 caller；tiers=monster-em |
| 0x3b98a4 | monster-em | leaf | C | 10 指令 0 调用 2 caller；tiers=monster-em |
| 0x3b98e8 | monster-em | leaf | C | 76 指令 0 调用；tiers=monster-em |
| 0x3b9a18 | monster-em | leaf | C | 82 指令 0 调用 4 caller；tiers=monster-em |
| 0x3b9b60 | monster-em | leaf | C | 91 指令 0 调用；tiers=monster-em |
| 0x3b9ccc | monster-em | leaf | C | 97 指令 0 调用 4 caller；tiers=monster-em |
| 0x3b9e50 | monster-em | leaf | C | 97 指令 0 调用 7 caller；tiers=monster-em |
| 0x3b9ff8 | otomo-ot | leaf | C | 26 指令 0 调用 10 caller；tiers=otomo-ot |
| 0x3ba078 | audio | worker | C | 34 指令，quest:2/audio:1（0x3aae8/0x887660/0x3ae90）；tiers=audio |
| 0x3ba100 | otomo-ot | leaf | C | 26 指令 0 调用 11 caller；tiers=otomo-ot |
| 0x3ba3c8 | audio | worker | C | 81 指令，audio:2/quest:1/otomo-ot:1（0x3a62c/0x152c68/0x3a2c0）；tiers=audio |
| 0x3ba6dc | otomo-ot | leaf | C | 12 指令 0 调用 5 caller；tiers=otomo-ot |
| 0x3ba70c | otomo-ot | worker | C | 77 指令，唯一 callee 0x39b848，quest:1；tiers=otomo-ot |
| 0x3ba840 | otomo-ot | worker | C | 19 指令唯一 callee 0x13f007c，online-nex:1；tiers=otomo-ot |
| 0x3ba88c | audio | worker | C | 28 指令唯一 callee 0x3ba3c8（tiers=audio），audio:1；tiers=audio |
| 0x3bb96c | item | leaf | C | 12 指令 0 调用；tiers=item |
| 0x3bb99c | otomo-ot | leaf | C | 8 指令 0 调用；tiers=otomo-ot |
| 0x3bb9bc | otomo-ot | worker | C | 13 指令 8 caller，唯一 callee 0x5264e0，quest:1；tiers=otomo-ot |
| 0x3bbbbc | monster-em | worker | B | 285 指令，monster-em:3（0x3aba84/0x3b9ccc/0x3b9e50）；tiers=monster-em |
| 0x3bc030 | item | worker | C | 47 指令 7 caller，唯一 callee 0x5264e0，quest:1；tiers=item |
| 0x3bc0ec | monster-em | worker | C | 36 指令 2 caller，唯一 callee 0x5264e0，quest:1；tiers=monster-em |
| 0x3bc17c | otomo-ot | worker | C | 46 指令，quest:1/otomo-ot:1（0x526544/0x7c9288）；tiers=otomo-ot |
| 0x3bc5f0 | monster-em | worker | C | 223 指令，monster-em:2（0x3b9ccc/0x3b9e50）；tiers=monster-em |
| 0x3bce2c | monster-em | leaf | C | 79 指令 0 调用 4 caller；tiers=monster-em |
| 0x3bcf68 | monster-em | leaf | C | 63 指令 0 调用 5 caller；tiers=monster-em |
| 0x3bd064 | otomo-ot | leaf | C | 26 指令 0 调用；tiers=otomo-ot |
| 0x3bd244 | otomo-ot | thunk | C | 3 指令 0 调用 5 caller；tiers=otomo-ot |
| 0x3bd294 | otomo-ot | leaf | C | 5 指令 0 调用；tiers=otomo-ot |
| 0x3bd3c0 | quest | worker | B | 62 指令 5 callee，quest:3 对 render-gfx:2（0x227a98/0x3bfa94/0x1e22fc/0x3f8678/0x3f8634）；tiers=render-gfx 冲突，取票 |
| 0x3bd90c | otomo-ot | thunk | C | 2 指令 0 调用；tiers=otomo-ot |
| 0x3bd914 | otomo-ot | thunk | C | 3 指令 0 调用 11 caller；tiers=otomo-ot |
| 0x3bd960 | otomo-ot | thunk | C | 3 指令 0 调用 9 caller；tiers=otomo-ot |
| 0x3be710 | monster-em | leaf | C | 11 指令 0 调用 4 caller；tiers=monster-em |
| 0x3be73c | monster-em | thunk | C | 4 指令 0 调用；tiers=monster-em |
| 0x3be74c | monster-em | worker | C | 20 指令唯一 callee 0x1e21c4，quest:1；tiers=monster-em |
| 0x3bf558 | otomo-ot | worker | C | 112 指令，quest:3/otomo-ot:1，quest 票含共用 0x1e22fc/0x227b3c；tiers=otomo-ot |
| 0x3bf76c | otomo-ot | worker | C | 29 指令唯一 callee 0x1e3f94，quest:1；tiers=otomo-ot |
| 0x3bf8c8 | otomo-ot | worker | C | 27 指令唯一 callee 0x1e46e8，quest:1；tiers=otomo-ot |
| 0x3bfa94 | render-gfx | worker | C | 124 指令唯一 callee 0x1e22fc（共用），quest:1；tiers=render-gfx |
| 0x3bfce4 | monster-em | worker | C | 119 指令唯一 callee 0x27724c，monster-em:1；tiers=monster-em |
| 0x3bfec0 | otomo-ot | leaf | C | 11 指令 0 调用 8 caller；tiers=otomo-ot |
| 0x3bfeec | otomo-ot | leaf | C | 9 指令 0 调用 3 caller；tiers=otomo-ot |
| 0x3bff10 | otomo-ot | leaf | C | 190 指令 0 调用；tiers=otomo-ot |
| 0x3c0208 | otomo-ot | worker | C | 95 指令，唯一 callee 0x1e22fc（共用），quest:1；tiers=otomo-ot |
| 0x3c0444 | otomo-ot | thunk | C | 4 指令 0 调用 4 caller；tiers=otomo-ot |
| 0x3c0454 | otomo-ot | leaf | C | 18 指令 0 调用；tiers=otomo-ot |
| 0x3c06b4 | otomo-ot | worker | C | 17 指令 **40 caller**，唯一 callee 0x1e29f4，quest:1；tiers=otomo-ot |
| 0x3c06f8 | otomo-ot | leaf | C | 7 指令 0 调用；tiers=otomo-ot |
| 0x3c07a4 | quest | orchestrator | C | 9 callee，quest:6 对 player-pl:1（0x35235c A 级 player）/online-nex:1/otomo-ot:1；调 0x8385e8/0x8389e0/0x838634 族；tiers=player-pl 冲突 |
| 0x3c09ec | otomo-ot | orchestrator | C | 10 callee，quest:5 对 otomo-ot:4（含 A 级 0x33392c/0x330310）；tiers=otomo-ot |
| 0x3c0c7c | otomo-ot | leaf | C | 41 指令 0 调用；tiers=otomo-ot |
| 0x3c0d20 | monster-em | orchestrator | C | 12 callee，quest:5 monster-em:3 otomo-ot:3 render-gfx:1；调 0x1e2f64/0x3f8398/0x3a5ed0/0x274ce4/0x65df24/0x3c0598；tiers=monster-em |
| 0x3c10ec | render-gfx | worker | C | 46 指令，render-gfx:1/quest:1（0x227a98/0x1e29f4）；tiers=render-gfx |
| 0x3c11a4 | otomo-ot | worker | C | 94 指令，quest:3/otomo-ot:2（0x523150/0x525e44/0x3ae60）；tiers=otomo-ot |
| 0x3c131c | monster-em | orchestrator | B | 11 callee，monster-em:8 对 quest:4；调 0x4d31ac/0x4d0070/0x4d31bc/0x4d31d0/0x4d3200/0x3c2038/0x3c1568；tiers=monster-em |
| 0x3c1568 | quest | orchestrator | B | 13 callee，quest:17 对 monster-em:6/otomo-ot:4；调 0x333f98/0x3c07a4/0x3996e0/0xdd7f4/0xdd31c/0xdaf90/0xdaba4；tiers=monster-em 冲突，取票 |
| 0x3c2f28 | otomo-ot | leaf | C | 5 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3c300c | monster-em | orchestrator | B | 12 callee，monster-em:6 对 otomo-ot:3/quest:2/online-nex:1；调 0x3ae3a4/0x275a30/0x276140/0x3c73ec/0x3c7324/0x25957c；tiers=monster-em |
| 0x3c3468 | otomo-ot | leaf | C | 5 指令 0 调用 10 caller；tiers=otomo-ot |
| 0x3c34dc | otomo-ot | thunk | C | 4 指令 0 调用 2 caller；tiers=otomo-ot |
| 0x3c34ec | otomo-ot | worker | C | 82 指令，quest:2/otomo-ot:1/monster-em:1（0x21724c/0x3bd734 + 共用 0x227b3c/0x1e22fc）；tiers=otomo-ot |
| 0x3c3770 | otomo-ot | worker | C | 36 指令唯一 callee 0x55d2b4（A 级 otomo-ot），otomo-ot:1；tiers=otomo-ot |
| 0x3c4794 | render-gfx | thunk | C | 3 指令 0 调用；tiers=render-gfx |
| 0x3c47a0 | otomo-ot | worker | C | 173 指令 7 callee，otomo-ot:2/quest:2/audio:1/online-nex:1（0x3ba70c/0x3ba3c8/0x13f007c）；tiers=otomo-ot |
| 0x3c4a90 | monster-em | orchestrator | B | 8 callee，monster-em:4 对 quest:3/otomo-ot:1；调 0x26e354/0x3c79cc/0x3c5568/0x3c75f4；tiers=monster-em |
| 0x3c512c | monster-em | worker | C | 190 指令，monster-em:2/quest:1（0x26e50c + 共用 0x7aa47c）；tiers=monster-em |
| 0x3c5568 | monster-em | worker | C | 376 指令，callees 0x7aa47c/0x13efdac/0x13efd7c 全通用，quest:3 无区分力；tiers=monster-em |
| 0x3c5b48 | monster-em | thunk | C | 2 指令 0 调用；tiers=monster-em |
| 0x3c5f5c | otomo-ot | worker | C | 72 指令，quest:2/otomo-ot:2（0x86f594/0x152ef8/0x3c607c）；tiers=otomo-ot |
| 0x3c607c | otomo-ot | worker | C | 34 指令唯一 callee 0x887660（通用），quest:1；tiers=otomo-ot |
| 0x3c6104 | audio | worker | C | 8 指令唯一 callee 0x3ba88c（tiers=audio），audio:1；tiers=audio |
| 0x3c6124 | monster-em | leaf | C | 6 指令 0 调用；tiers=monster-em |
| 0x3c6294 | monster-em | worker | C | 99 指令唯一 callee 0x258ffc，monster-em:1；tiers=monster-em |
| 0x3c6d44 | monster-em | worker | C | 34 指令 14 caller，唯一 callee 0x275a30，monster-em:1；tiers=monster-em |
| 0x3c6dcc | monster-em | thunk | C | 3 指令 0 调用；tiers=monster-em |
| 0x3c7034 | monster-em | worker | B | 64 指令，monster-em:3 对 quest:1（0x3a8d68/0x3abb14/0x50b64/0x39ab64）；tiers=monster-em |
| 0x3c7134 | monster-em | worker | B | 64 指令，同 0x3c7034 的 callee 集，monster-em:3 对 quest:1；tiers=monster-em |
| 0x3c7234 | otomo-ot | worker | C | 60 指令，otomo-ot:2 对 monster-em:1/quest:1（0x19e234/0x3ae3b4/0x3a9e54/0x523150）；tiers=otomo-ot |
| 0x3c7324 | monster-em | worker | C | 50 指令，quest:2/monster-em:1（0x26e600 + 通用 0x13efdd0/0x13efd7c）；tiers=monster-em |
| 0x3c73ec | monster-em | worker | C | 58 指令，同 0x3c7324 模式；tiers=monster-em |
| 0x3c74d4 | monster-em | worker | C | 56 指令唯一 callee 0x26e600，monster-em:1；tiers=monster-em |
| 0x3c75f4 | monster-em | worker | B | 246 指令，monster-em:3 对 otomo-ot:1（0x26e354/0x26e600/0x26e50c）；tiers=monster-em |
| 0x3c79cc | monster-em | worker | C | 108 指令，quest:1/audio:1（0x7aa47c 通用/0x3c7b7c）；tiers=monster-em |
| 0x3c7b7c | quest | orchestrator | B | 3355 指令 ≥14 callee，quest:21 audio:6 otomo-ot:2；字符串 `rActParam`/`DbgAtkActSet`/`rDebugAtkActSet`；tiers=audio 冲突，见「最不确定」 |
| 0x3cafe8 | audio | worker | C | 8 指令 12 caller，唯一 callee 0x8870b8（共用），quest:1；tiers=audio |
| 0x3cb008 | audio | orchestrator | B | 8 callee，audio:8 对 quest:6/render-gfx:1；字符串 `Path`/`resource`；tiers=audio |
| 0x3cb8d8 | quest | orchestrator | B | ≥14 callee，quest:16 对 audio:8；字符串 `rFreeUseParam`（资源参数类名）；tiers=audio 冲突，取票 |
| 0x3cc6ec | quest | worker | B | 262 指令 7 callee，quest:3 kernel-os:3 otomo-ot:1；字符串 `maptime`/`rMapTimeData`（地图时间数据）|
| 0x3ccb40 | kernel-os | worker | B | 41 指令 5 callee，kernel-os:3（0x7bdb48/0x7bdbb0/0x7bdef0）对 otomo-ot:1/quest:1；tiers=kernel-os |
| 0x3cce34 | otomo-ot | worker | C | 90 指令唯一 callee 0x7af37c，otomo-ot:1；tiers=otomo-ot |
| 0x3ccff8 | quest | worker | B | 145 指令 10 callee，quest:7 对 otomo-ot:2/online-nex:1（0x13effa4/0x13effb0/0x13f004c/0x3cd23c）；tiers=otomo-ot 冲突，取票 |
| 0x3cd23c | otomo-ot | worker | C | 51 指令 7 callee，quest:4/otomo-ot:3 接近平票（0x7bdee0/0x7bdee8/0x3dd72c）；tiers=otomo-ot |
| 0x3cd308 | otomo-ot | worker | C | 67 指令，quest:6 但 callees 0x13effa4/0x13efdb8/0x13effb0/0x13efe00/0x13efe0c/0x13f004c 全为短共用函数；tiers=otomo-ot |
| 0x3cd4c8 | otomo-ot | worker | C | 41 指令，同上全通用 callee，quest:5 无区分力；tiers=otomo-ot |
| 0x3cd56c | quest | orchestrator | B | ≥14 callee，quest:22 对 audio:7/otomo-ot:4；调 0x7bdd54/0x13efdb8/0x13f004c/0x88784c/0x8870b8；tiers=otomo-ot 冲突，取票 |
| 0x3ce060 | quest | worker | B | 524 指令，quest:3（0x7aa47c/0x7bb638/0x7aedcc 全通用）+ 字符串 `pntpos`/`rPointPos`（地图点坐标资源）|
| 0x3ce890 | quest | worker | C | 68 指令，quest:2/otomo-ot:1（0x3ce9dc + 通用 0x7aa47c/0x887810）；tiers=quest |
| 0x3ce9a0 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3ce9dc | quest | worker | B | 128 指令，quest:4（0x7af3a0/0x13efdac/0x3cebdc/0x3ceed0）；tiers=quest |
| 0x3cebdc | quest | worker | B | 189 指令 8 callee，quest:7 对 otomo-ot:1（0x838538/0x838574/0xb38f14/0xb38f50/0x8385e8/0x838798/0x838634）|
| 0x3ceed0 | quest | worker | C | 94 指令 10 caller，唯一 callee 0x13efe30，quest:1；tiers=quest |
| 0x3cf048 | quest | worker | B | 117 指令，quest:3（0x7af3e4/自身/0x7aa47c）；tiers=quest |
| 0x3cf21c | quest | leaf | C | 30 指令 0 调用 4 caller；tiers=quest |
| 0x3cf294 | quest | worker | B | 98 指令 5 callee，quest:4 对 otomo-ot:1（0x838538/0x8385e8/0xb3927c/0xb392b8/0xb39448）|
| 0x3cf41c | quest | leaf | C | 83 指令 0 调用 6 caller；tiers=quest |
| 0x3cf568 | monster-em | leaf | C | 26 指令 0 调用 8 caller；tiers=monster-em |
| 0x3cf5d0 | monster-em | leaf | C | 65 指令 0 调用 **24 caller**；tiers=monster-em |
| 0x3cf6d4 | otomo-ot | worker | C | 149 指令唯一 callee 0x3df2a8（save 读原语，375 caller）；otomo-ot:1；tiers=otomo-ot，判为 otomo 数据的存取实现 |
| 0x3cf928 | otomo-ot | worker | C | 121 指令，callees 0x3cebdc(quest)/0x3df378（save 写原语）；quest:1 otomo-ot:1；tiers=otomo-ot |
| 0x3cfb0c | otomo-ot | worker | C | 58 指令，otomo-ot:2/quest:1（0x887810/0x88784c 通用 + 0x7aa47c）；tiers=otomo-ot |
| 0x3cfbf4 | quest | worker | C | 58 指令，quest:2（0x3ce9dc + 通用 0x7aa47c）；tiers=quest |
| 0x3cfcdc | quest | worker | C | 38 指令 10 caller，quest:2（0x3cf294/0x3cebdc 均 quest）；tiers=monster-em 冲突，取 callee 证据 |
| 0x3cfd74 | quest | worker | B | 377 指令 5 callee，quest:4 对 monster-em:1（0x3cebdc + 0x7af3a0/0x13efda0）；tiers=quest |
| 0x3d0358 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3d0394 | quest | worker | C | 11 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3d03c0 | quest | worker | C | 13 指令唯一 callee 0x2b8f0 通用；tiers=quest |
| 0x3d03f4 | quest | worker | C | 236 指令 3 callee（0x2b908/0x7aa47c/0x7bb638 全通用），quest:3 无区分力；tiers=quest |
| 0x3d07a4 | quest | worker | C | 142 指令，quest:2 对 otomo-ot:1/online-nex:1（0x826c38/0x13efd88/0x13efd94）；邻域 quest |
| 0x3d09dc | quest | worker | A | 字符串 `cCommonScript`（通用脚本类名）；quest:5（0x827c9c/0x2b8f0 等）+ tiers=quest |
| 0x3d0e30 | quest | worker | C | 36 指令唯一 callee 0x887660 通用，quest:1；tiers=quest |
| 0x3d0ec0 | quest | worker | B | 69 指令，quest:3 对 monster-em:1（0x2772c4/0x3f865c/0x3f8678/0x3f8634）；tiers=quest |
| 0x3d0fd4 | quest | worker | A | 字符串 `[BELNA]`/`[BED]`/`[BAR]`/`[HR]`/`[FESTA_HR]`（任务等级/HUB 标签）；77 caller，quest:3 |
| 0x3d15a4 | quest | worker | A | 字符串 `[WORK0..4]`（同类等级标签）+ 同族 callee 0x13effa4/0x13efef0/0x276278；28 caller |
| 0x3d17f8 | quest | orchestrator | A | 字符串 `commonScriptEnum`；≥14 callee，quest:38；调 0x3d0fd4/0x3d15a4/0x3b1964/0x3b1d70/0x523da4/0x244f14；tiers=quest |
| 0x3d6880 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用；tiers=quest |
| 0x3d6bc8 | quest | worker | B | 138 指令，quest:3（0x3d17f8/0x1b08c/0x1b794）；tiers=quest |
| 0x3d6df0 | quest | orchestrator | B | 9 callee，quest:9（0x3d17f8/0x1b08c/0x1b9cc/0x276278/0x1b794/0x3d6bc8）；tiers=quest |
| 0x3d71e8 | quest | worker | B | 76 指令 8 caller，quest:4（0x3d6bc8/0x3d6df0/0x887660/0x3d0e30）；tiers=quest |
| 0x3d7318 | quest | worker | C | 9 指令唯一 callee 0x887660 通用，quest:1；tiers=quest |
| 0x3d733c | quest | worker | C | 19 指令，quest:2（0x887660/0x152960）；tiers=quest |
| 0x3d7388 | quest | worker | C | 25 指令，quest:2（0x887660/0x152960）；tiers=quest |
| 0x3d73ec | quest | worker | C | 15 指令唯一 callee 0x887660 通用，quest:1；tiers=quest |
| 0x3d7428 | quest | worker | C | 19 指令，quest:2（0x887660/0x152960）；tiers=quest |
| 0x3d7474 | quest | worker | C | 9 指令唯一 callee 0x887660 通用，quest:1；tiers=quest |
| 0x3d754c | quest | worker | C | 57 指令，quest:3/render-gfx:3 平票（0x3d0c94/0x3d0d00/0x3d0dc0 皆 A 级 render-gfx）；tiers 未知，取邻域 quest |
| 0x3d7630 | quest | worker | C | 44 指令，quest:2/render-gfx:1（0x3d71e8/0x152960/0x3d76e0）；取 quest |
| 0x3d8028 | quest | worker | C | 17 指令 8 caller，唯一 callee 0x7af3a0，quest:1；tiers=quest |
| 0x3d806c | quest | worker | C | 15 指令 11 caller，唯一 callee 0x7af3e4，quest:1；tiers=quest |
| 0x3d89e8 | otomo-ot | worker | C | 12 指令唯一 callee 0xb86134，otomo-ot:1；tiers=otomo-ot |
| 0x3d8a18 | otomo-ot | worker | C | 13 指令，otomo-ot:1/quest:1（0xb86260/0x7aa47c）；tiers=otomo-ot |
| 0x3d8a4c | otomo-ot | orchestrator | B | 822 指令 ≥14 callee，otomo-ot:26 对 quest:19/render-gfx:2；字符串 `vini2.xml`；tiers=otomo-ot |
| 0x3d9724 | otomo-ot | orchestrator | C | 148 指令 ≥14 callee，otomo-ot:19 quest:19 render-gfx:10 平票；callees 0x965f44/0xb4ef80/0x924008/0x9232c4 等，取 otomo-ot（邻域） |
| 0x3d9974 | monster-em | orchestrator | B | 3931 指令 ≥14 callee，monster-em:15 对 quest:7/otomo-ot:3；调 0xba4be0/0xba494c/0xbc8050/0x3be710/0x41468/0xb85b14；字符串 `vini2.xml` |
| 0x3dd6e0 | quest | leaf | C | 12 指令 0 调用；邻域 0x3dd72c(quest) |
| 0x3dd710 | quest | leaf | C | 7 指令 0 调用 10 caller；邻域 quest |
| 0x3dd72c | quest | worker | C | 227 指令，quest:2/monster-em:1/otomo-ot:1（0xbaa624 + 通用 0x13efda0/0x7aa47c/0x7aedcc）|
| 0x3ddab8 | quest | worker | C | 146 指令唯一 callee 0x7aa47c 通用，quest:1；邻域 quest |
| 0x3ddd00 | quest | worker | C | 217 指令，quest:3/otomo-ot:2/render-gfx:1（0xbaa624/0xbaab34/0xbaade4/0xbad28c/0x3de064）|
| 0x3de884 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用，quest:1；tiers 未知，邻域 quest |
| 0x3de9cc | otomo-ot | worker | C | 113 指令，otomo-ot:1/monster-em:1（0x3f8a20 otomo/0x5584a0）|
| 0x3dec68 | quest | worker | C | 116 指令，quest:2/monster-em:1/otomo-ot:1（0xbc6b44 + 通用 0x13efda0/0x7aa47c/0x7aedcc）|
| 0x3dee38 | quest | worker | C | 15 指令唯一 callee 0x7aa47c 通用，quest:1 |
| 0x3dee74 | otomo-ot | worker | B | 164 指令 6 callee，otomo-ot:4 对 quest:2（0xbc6b44/0xbc7c64/0x54ed74 A 级 otomo）|
| 0x3df104 | quest | worker | C | 16 指令唯一 callee 0x7aa47c 通用，quest:1 |
| 0x3df144 | quest | leaf | C | 13 指令 0 调用 5 caller；邻域 quest |
| 0x3df178 | quest | leaf | C | 12 指令 0 调用 4 caller；邻域 quest |
| 0x3df1a8 | quest | thunk | C | 4 指令 0 调用 4 caller；邻域 quest |
| 0x3df1b8 | quest | leaf | C | 29 指令 0 调用 **26 caller**；邻域 quest |
| 0x3df22c | quest | leaf | C | 31 指令 0 调用 18 caller；邻域 quest |
| 0x3df2a8 | save-io | worker | A | **save 读原语**（CONTEXT：`0x3df2a8` 读原语），22 指令 **375 caller**，调 0x13efe30 |
| 0x3df300 | quest | leaf | C | 30 指令 0 调用 18 caller；邻域 quest |
| 0x3df378 | save-io | worker | A | **save 写原语**（CONTEXT：`0x3df378` 写原语），19 指令 **375 caller**，调 0x13efe30 |
| 0x3df3c4 | otomo-ot | worker | C | 86 指令，otomo-ot:2（0x887810 通用 + 0x54ed74 A 级 otomo）|
| 0x3df51c | otomo-ot | worker | C | 73 指令，otomo-ot:1/quest:1（0x88784c/0x7aa47c 皆通用）；邻域 otomo-ot |
| 0x3df640 | otomo-ot | worker | C | 35 指令唯一 callee 0x65f32c，otomo-ot:1；邻域 otomo-ot |
| 0x3df6cc | otomo-ot | worker | C | 37 指令 5 caller，唯一 callee 0x65f32c，otomo-ot:1 |
| 0x3df760 | otomo-ot | worker | C | 32 指令唯一 callee 0x65f32c，otomo-ot:1 |
| 0x3df7e0 | otomo-ot | worker | C | 28 指令唯一 callee 0x65f32c，otomo-ot:1 |
| 0x3df850 | otomo-ot | worker | C | 31 指令 7 caller，唯一 callee 0x65f32c，otomo-ot:1 |
| 0x3df8cc | otomo-ot | leaf | C | 22 指令 0 调用；otomo-ot 邻域（0x3df6xx 同族）|
| 0x3df924 | otomo-ot | leaf | C | 22 指令 0 调用 3 caller；同族 |
| 0x3df97c | otomo-ot | leaf | C | 22 指令 0 调用；同族 |
| 0x3df9d4 | otomo-ot | leaf | C | 22 指令 0 调用 4 caller；同族 |
| 0x3dfa2c | otomo-ot | leaf | C | 22 指令 0 调用 8 caller；同族 |
| 0x3dfa84 | otomo-ot | leaf | C | 22 指令 0 调用；同族 |
| 0x3dfadc | otomo-ot | orchestrator | B | 784 指令 ≥14 callee，otomo-ot:24 对 quest:5；调 0x3e071c/0x8777f4/0x878d54/0x8776fc/0x55bc4c/0x65f190/0x65f32c |
| 0x3e071c | otomo-ot | worker | B | 99 指令 12 caller，otomo-ot:4 对 quest:1（0x55bc4c/0x13f0088/0x65f190/0x65f32c/0x627414）|
| 0x3e08a8 | otomo-ot | worker | B | 54 指令，otomo-ot:3 对 quest:1（0x8777f4/0x878d54/0x8776fc）|
| 0x3e0980 | otomo-ot | worker | B | 54 指令 3 caller，otomo-ot:4（0x3e0ea4/0x8777f4/0x878d54/0x8775f4）|
| 0x3e0a58 | otomo-ot | worker | C | 24 指令 10 caller，otomo-ot:2（0x65f32c/0x627414）|
| 0x3e0ab8 | otomo-ot | leaf | C | 36 指令 0 调用；otomo-ot 邻域 |
| 0x3e0b48 | otomo-ot | leaf | C | 20 指令 0 调用；otomo-ot 邻域 |
<!-- APPEND -->
