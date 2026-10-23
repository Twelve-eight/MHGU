# Tier B slice 03 裁定报告

范围 `0x187a60..0x25d4d4`，共 1062 函数。label 取任务给定固定集合；role: leaf=无调用 / thunk=≤4 指令且无调用 / orchestrator=调用≥8 / worker=其余；conf A=直接字符串证据，B=callee 票数或强结构模式，C=地址邻域/推断。

## 汇总

- 处理进度: 120 / 1062（最终回填统计）

## 明细

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x187a60 | quest | orchestrator | B | 8 个 callee 全为 quest 票（0x3f8634/0x3ae24c/0x3b3bf0 等），vote quest:8，无字符串 |
| 0x187bc4 | quest | worker | B | callee 0x188c84/0x187c90/0x558514 均为 quest 簇，vote quest:4 |
| 0x187c90 | quest | worker | B | callee 0x552e90/0x186bb0/0x5546e0 全 quest 票，vote quest:5 |
| 0x187d28 | quest | worker | B | 以 0x187c90 与 0x558514/0x54f260 为骨架，vote quest:5 otomo-ot:1 |
| 0x187e1c | quest | worker | B | 与 0x187d28 同构，callee 0x54ee98/0x54f260/0x5585d0 全 quest，vote quest:6 |
| 0x188088 | quest | orchestrator | B | ≥15 callee，vote quest:19 otomo-ot:6，调 0x188c84/0x558514/0x3b3bf0 等 quest 簇 |
| 0x1885d0 | quest | orchestrator | B | 11 callee，vote quest:9 otomo-ot:2，调 0x187c90/0x54fa74/0x54edec |
| 0x188970 | quest | worker | C | 仅 2 callee 0x3b39d4/0x65e5bc，票 1:1 平（quest/otomo），按 quest 簇邻域判 quest，? |
| 0x188aec | quest | worker | C | 调 0x3b39d4/0x65e794 且回指 0x187a60(quest)，票 quest:2 otomo-ot:1 |
| 0x188bec | quest | worker | C | 6 指令单 callee 0x65cb3c(quest 票)，太小无可辨语义，? |
| 0x188c04 | quest | worker | B | 3 callee 0x558514/0x19dab4/0x13efe30，vote quest:3，与 0x188c84 相邻 |
| 0x188c84 | quest | orchestrator | B | ≥15 callee，vote quest:13，为 0x187bc4/0x188088/0x1885d0 的共同子函数 |
| 0x189040 | quest | worker | C | 15 指令单 callee 0x7aa47c(quest 票)，vote quest:1 弱 |
| 0x18907c | quest | worker | C | 11 指令单 callee 0x7aa47c，vote quest:1 弱，3 个 caller |
| 0x1890a8 | quest | worker | C | 单 callee 0x2b8f0(quest 票)，vote quest:1 弱 |
| 0x1890f0 | quest | worker | B | 264 指令调 0x2b908/0x7aa47c/0x7bb638，vote quest:3，被 0x192530 调用 |
| 0x189510 | otomo-ot | worker | B | 唯一 callee 0x8261fc 票 otomo-ot:1，无字符串，簇 0x18f7a8/0x189de4 同构 |
| 0x189938 | quest | worker | C | 单 callee 0x7aa47c(quest 票)，vote quest:1 弱，与 0x189040 同构 |
| 0x189974 | quest | worker | C | 同 0x18907c 模式（11 指令/0x7aa47c/vote quest:1），? |
| 0x1899a0 | quest | worker | C | 单 callee 0x2b8f0，vote quest:1 弱 |
| 0x1899c8 | quest | worker | B | 263 指令调 0x2b908/0x7aa47c/0x7bb638，vote quest:3，与 0x1890f0 成对 |
| 0x189de4 | otomo-ot | worker | B | 唯一 callee 0x8261fc(otomo-ot 票)，与 0x189510/0x18f7a8 同构 |
| 0x18a3ec | unknown | leaf | C | 6 指令、无 callee、无字符串，caller 1，无法归属 |
| 0x18a404 | quest | worker | C | 调 0x186920/0x7aa47c，vote quest:2 |
| 0x18a438 | quest | orchestrator | B | ≥15 callee（0x5bb87c/0x5bb8b0/0x5bc0e8/0x18a5c0），vote quest:16 |
| 0x18a5c0 | quest | worker | C | 单 callee 0x19d278，vote quest:1，4 caller |
| 0x18a6c4 | quest | worker | C | callee 0x5bb910/0x5bb938/0x5bc390/0x65e67c，票 quest:4 otomo-ot:3 接近 |
| 0x18a814 | quest | orchestrator | B | ≥15 callee（0x65de34/0x54ecc0/0x65e134），vote quest:13 otomo-ot:5 |
| 0x18acf8 | quest | worker | B | 调 0x56dfac/0x13efda0/0x7aedcc/0x7aa47c，vote quest:4 monster-em:1 |
| 0x18af18 | unknown | leaf | C | 17 指令无 callee、无字符串，13 caller（回调/小访问器），无法归属 |
| 0x18af5c | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 弱，5 caller |
| 0x18af8c | quest | worker | C | 9 指令单 callee 0x194228(quest 票)，vote quest:1 |
| 0x18afb0 | quest | worker | C | 11 指令单 callee 0x19463c，vote quest:1 |
| 0x18afdc | unknown | leaf | C | 22 指令无 callee、无字符串（疑内联小工具），? |
| 0x18b034 | quest | worker | C | 2 callee 0x54f260/0x54ee98（quest 票），vote quest:2 |
| 0x18b110 | unknown | leaf | C | 6 指令无 callee 无字符串，1 caller，无法归属 |
| 0x18b128 | quest | worker | C | 单 callee 0x19463c，vote quest:1，与 0x18afb0 同构 |
| 0x18b1c4 | unknown | thunk | C | 3 指令无 callee 无字符串，纯跳转壳，无法归属 |
| 0x18b1d0 | quest | worker | C | 单 callee 0x19463c，vote quest:1，4 caller |
| 0x18b254 | quest | worker | C | 调 0x1938bc/0x194c50，vote quest:2，被 quest 簇 0x18cdec/0x18ced0/0x18d890 调用 |
| 0x18b2f8 | quest | worker | C | 票 1:1 平（monster-em/quest），调 0x4ef090/0x194474；邻域 0x18b254/0x18b398 皆 quest，? |
| 0x18b398 | quest | worker | B | 调 0x1938bc/0x194c94/0x54f260，vote quest:3 |
| 0x18b468 | unknown | leaf | C | 9 指令无 callee 无字符串，4 caller，无法归属 |
| 0x18b48c | quest | worker | B | 145 指令调 0x1938bc/0x194c50/0x54f260，vote quest:3，与 0x18b254 同族 |
| 0x18b6d0 | quest | worker | B | 调 0x19b7fc/0x7aa47c，vote quest:2 |
| 0x18b7b4 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1，3 caller |
| 0x18b850 | quest | orchestrator | B | 8 callee（0x194228/0x19b7a8/0x1938bc/0x19cbb4），vote quest:8 |
| 0x18bb60 | quest | orchestrator | B | 字符串 `cMix`；vote quest:8；9 callee（0x198f90/0x199830/0x19956c） |
| 0x18c030 | quest | worker | C | 6 callee（0x54ed74/0x54f3bc/0x13efdac），票 quest:5 otomo-ot:1 |
| 0x18c4f0 | quest | worker | B | 75 指令自递归 + 0x7aa47c/0x54f42c，vote quest:3（列表遍历模式） |
| 0x18c61c | quest | worker | C | 单 callee 0x13efd7c，vote quest:1，2 caller |
| 0x18c654 | quest | orchestrator | B | ≥15 callee（0x18af18/0x54edec/0x18cb50/0x18cdec/0x5cf4b0），vote quest:15 |
| 0x18c854 | quest | worker | B | 调 0x18d890/0x194d6c/0x194c80，vote quest:3，被 0x18d018 调用 |
| 0x18cb50 | quest | worker | B | 167 指令调 0x194d6c/0x194c80/0x1938bc/0x194cbc，vote quest:4 |
| 0x18cdec | quest | worker | B | 调 0x1938bc/0x18af18/0x18b254，vote quest:3 |
| 0x18ced0 | quest | worker | B | 调 0x18af18/0x1938bc/0x18b254，vote quest:3，与 0x18cdec 成对 |
| 0x18cfec | quest | worker | C | 11 指令单 callee 0x56dfac，vote quest:1 |
| 0x18d018 | quest | orchestrator | B | ≥15 callee（0x65f914/0x18c854/0x18cb50/0x5c5b50/0x18b034），vote quest:25 |
| 0x18d840 | quest | worker | C | 单 callee 0x194cbc，vote quest:1 |
| 0x18d890 | quest | orchestrator | B | 9 callee（0x194c80/0x1938bc/0x18af18/0x5cf4f8/0x18c030），vote quest:8 |
| 0x18dd88 | quest | worker | B | 7 callee（0x18c030/0x18c4f0/0x65de34），vote quest:7 |
| 0x18e07c | quest | orchestrator | B | 字符串 `cMixList`；9 callee（0x65ee6c/0x198f44/0x19945c/0x18b468），vote quest:8 |
| 0x18e4ec | quest | worker | C | 10 指令单 callee 0x194228(quest 票)，vote quest:1 |
| 0x18e514 | online-nex | worker | B | 7 callee（0x276278/0x27c6f8/0x2793a4/0xe19b8/0x27c7ec），vote online-nex:3 领先 |
| 0x18e6c4 | online-nex | worker | B | 3 callee 0x2793a4/0xe19b8/0xe1a74，vote online-nex:3 唯一 |
| 0x18e758 | unknown | leaf | C | 17 指令无 callee 无字符串，1 caller，无法归属 |
| 0x18e79c | unknown | leaf | C | 6 指令无 callee 无字符串，无法归属 |
| 0x18e7b4 | unknown | leaf | C | 17 指令无 callee 无字符串，1 caller，无法归属 |
| 0x18e7f8 | unknown | leaf | C | 7 指令无 callee 无字符串，4 caller，? |
| 0x18e814 | unknown | leaf | C | 10 指令无 callee 无字符串，2 caller，? |
| 0x18e83c | unknown | leaf | C | 6 指令无 callee 无字符串，无法归属 |
| 0x18e854 | unknown | leaf | C | 17 指令无 callee 无字符串，6 caller，? |
| 0x18e898 | quest | worker | C | 单 callee 0x194230，vote quest:1，5 caller |
| 0x18e8bc | quest | worker | C | 单 callee 0x194230，vote quest:1，与 0x18e898 成对 |
| 0x18e8e8 | unknown | leaf | C | 14 指令无 callee 无字符串，2 caller，? |
| 0x18e920 | unknown | thunk | C | 4 指令无 callee 无字符串，纯访问器，无法归属 |
| 0x18e930 | unknown | leaf | C | 10 指令无 callee 无字符串，5 caller，? |
| 0x18e958 | quest | worker | C | 调 0x13efda0/0x7aa47c/0x2b8f0，票 quest:2 monster-em:1，按 quest 簇判，? |
| 0x18eaa0 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x18eadc | quest | worker | C | 单 callee 0x7aa47c，vote quest:1，3 caller |
| 0x18eb08 | quest | worker | C | 单 callee 0x2b8f0，vote quest:1 |
| 0x18eb34 | quest | worker | B | 81 指令调 0x2b908/0x7aa47c/0x7bb638，vote quest:3，被 0x18f998 调用 |
| 0x18ec78 | unknown | leaf | C | 14 指令无 callee 无字符串，无法归属 |
| 0x18ecb0 | quest | worker | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cOtodokeConditionList`；vote quest:5；5 callee（0x7aa47c/0x2b908/0x7bb638） |
| 0x18efc8 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x18f004 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1，3 caller |
| 0x18f030 | quest | worker | C | 单 callee 0x2b8f0，vote quest:1 |
| 0x18f07c | quest | worker | B | 459 指令调 0x2b908/0x7aa47c/0x7bb638，vote quest:3（大列表遍历） |
| 0x18f7a8 | otomo-ot | worker | B | 唯一 callee 0x8261fc(otomo-ot 票)，与 0x189510/0x189de4 同构 |
| 0x18f998 | quest | orchestrator | B | (2026-10-24 区段规则机械复核：所引字符串未在真实函数体内经 pc 相对载入 → B) 字符串 `cOtodokeSetList`+`otsc`；≥15 callee（0x8870b8/0x82772c/0x18ecb0），vote quest:26 |
| 0x190590 | quest | worker | C | 调 0x7aedcc/0x7aa47c/0x887810，票 quest:2 otomo-ot:1 |
| 0x190728 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x190764 | unknown | leaf | C | 12 指令无 callee 无字符串，51 caller（高频内联工具），无法归属 |
| 0x190794 | unknown | leaf | C | 10 指令无 callee 无字符串，27 caller（高频工具），无法归属 |
| 0x1907bc | otomo-ot | worker | C | 单 callee 0x887810（otomo 簇），vote otomo-ot:1 |
| 0x19082c | quest | worker | C | 调 0x88784c/0x7aa47c/0x3f865c/0x502a88，票 quest:2 otomo-ot:1 monster-em:1 |
| 0x190a64 | otomo-ot | worker | B | 533 指令 7 callee（0x3f8a20/0x3f8634/0x65dd68），票 otomo-ot:4 领先 monster-em:2 |
| 0x1912b8 | otomo-ot | worker | C | 单 callee 0x65dd68（otomo 票），vote otomo-ot:1，5 caller |
| 0x191374 | unknown | leaf | C | 23 指令无 callee 无字符串，无法归属 |
| 0x1913d0 | unknown | leaf | C | 41 指令无 callee 无字符串，1 caller，? |
| 0x191474 | quest | worker | C | 单 callee 0x525850，vote quest:1 |
| 0x191554 | quest | worker | C | 单 callee 0x523194，vote quest:1 |
| 0x1915bc | unknown | leaf | C | 8 指令无 callee 无字符串，无法归属 |
| 0x1915dc | unknown | leaf | C | 8 指令无 callee 无字符串，无法归属 |
| 0x1915fc | unknown | leaf | C | 5 指令无 callee 无字符串，? |
| 0x191610 | unknown | leaf | C | 11 指令无 callee 无字符串，? |
| 0x19163c | quest | worker | C | 单 callee 0x525898，vote quest:1，3 caller |
| 0x191688 | quest | orchestrator | B | ≥15 callee（0x7aedcc/0x8870b8/0x82772c/0x1841d4），vote quest:16 |
| 0x191bd4 | quest | orchestrator | B | 字符串 `deco`；≥15 callee（0x8870b8/0x18622c/0x82772c），vote quest:21 |
| 0x192530 | quest | orchestrator | B | ≥15 callee（0x8870b8/0x1890f0/0x18907c/0x189618），vote quest:17 |
| 0x192a08 | quest | orchestrator | B | ≥15 callee（0x8870b8/0x1899c8/0x189974/0x189fd4），vote quest:17，与 0x192530 成对 |
| 0x192ee0 | quest | worker | C | 调 0x7aedcc/0x7aa47c，vote quest:2 |
| 0x193014 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x193050 | otomo-ot | worker | C | 6 callee 0x887810/0x19333c/0x193430(皆 otomo 票)，票 3:3 平，? |
| 0x19333c | otomo-ot | worker | C | 单 callee 0xdaba4，vote otomo-ot:1 |
| 0x1933b4 | quest | worker | C | 单 callee 0x13efd7c，vote quest:1 |
| 0x193430 | otomo-ot | worker | C | 单 callee 0xdac14，vote otomo-ot:1，20 caller |
| 0x193548 | quest | worker | C | 5 指令单 callee 0x13efdac，vote quest:1 |
| 0x19355c | quest | worker | B | 5 callee（0x152960/0x1937c4/0x192a08/0x192530/0x1938c4），vote quest:5 |
| 0x1937c4 | quest | worker | C | 调 0x7aa47c/0x13efdac，vote quest:2 |

| 0x1938bc | unknown | thunk | C | 2 指令无 callee 无字符串，17 caller（纯访问器），无法归属 |
| 0x1938c4 | quest | worker | B | 261 指令调 0x7aa47c/0x13efdac/0x192530/0x192a08，vote quest:4 |
| 0x193cd8 | quest | worker | B | 调 0x887660/0x7aa47c，vote quest:2 |
| 0x193e38 | quest | worker | C | 票 2:2 平（otomo-ot/quest），字符串为乱码 `?@-BC0DE6FG3HI` 不可判，按 0x193cd8 quest 邻域，? |
| 0x193fe0 | quest | worker | B | 调 0x7aa47c/0x887660，vote quest:2，与 0x193cd8 同族 |
| 0x19406c | otomo-ot | worker | B | 调 0xdad24/0x193e38/0x7aa47c，vote otomo-ot:2 领先 quest:1 |
| 0x19412c | quest | worker | B | 单 callee 0x192a08（quest:17 编排器），vote quest:1 |
| 0x194228 | quest | thunk | B | 2 指令无 callee，290 caller；作为 callee 被 quest 票表全票计入（0x187a60 8 callee→quest:8），疑 quest 全局访问器 |
| 0x194230 | quest | leaf | B | 8 指令无 callee，24 caller；被 0x18e898/0x18e8bc 计为 quest 票，疑 quest 访问器 |
| 0x194250 | quest | worker | B | 调 0x192530/0x18e814/0x275a30/0x26fe08，vote quest:3 monster-em:1 |
| 0x19435c | unknown | leaf | C | 18 指令无 callee 无字符串，3 caller，无法归属 |
| 0x1943a4 | unknown | leaf | C | 6 指令无 callee 无字符串，1 caller，无法归属 |
| 0x1943bc | unknown | leaf | C | 6 指令无 callee 无字符串，10 caller，被 quest 函数调用但语义不可判 |
| 0x1943d4 | unknown | leaf | C | 13 指令无 callee 无字符串，10 caller，? |
| 0x194408 | unknown | leaf | C | 13 指令无 callee 无字符串，4 caller，? |
| 0x19443c | unknown | leaf | C | 9 指令无 callee 无字符串，34 caller（高频工具），无法归属 |
| 0x194460 | quest | worker | C | 5 指令单 callee 0x13efdac，vote quest:1 |
| 0x194474 | quest | worker | B | 114 指令调 0x19463c/0x194754/0x3f8344/0x276278/0x2864c4/0x192ee0，vote quest:4 monster-em:2 |
| 0x19463c | quest | worker | B | 调 0x192530/0x192a08（皆 quest 编排器），vote quest:2 |
| 0x194754 | quest | worker | B | 319 指令 6 callee（0x276278/0x2864c4/0x2864d4/0x19c21c），vote quest:4 monster-em:2 |
| 0x194c50 | unknown | leaf | C | 12 指令无 callee 无字符串，3 caller，? |
| 0x194c80 | unknown | leaf | C | 5 指令无 callee 无字符串，25 caller（访问器），无法归属 |
| 0x194c94 | unknown | leaf | C | 10 指令无 callee 无字符串，1 caller，? |
| 0x194cbc | unknown | leaf | C | 8 指令无 callee 无字符串，7 caller，? |
| 0x194cdc | unknown | leaf | C | 36 指令无 callee 无字符串，1 caller，? |
| 0x194d6c | unknown | leaf | C | 27 指令无 callee 无字符串，2 caller，? |
| 0x194dd8 | unknown | leaf | C | 114 指令无 callee 无字符串，1 caller，疑内联数据表/纯计算，无法归属 |
| 0x194fa0 | unknown | leaf | C | 7 指令无 callee 无字符串，无法归属 |
| 0x194fbc | quest | worker | B | 144 指令调 0x192530/0x7aa47c/0x13efdac，vote quest:3 |
| 0x1951fc | quest | worker | B | 调 0x54fed0/0x191bd4（quest:21 编排器），vote quest:2 |
| 0x195324 | unknown | leaf | C | 20 指令无 callee 无字符串，2 caller，? |
| 0x195374 | unknown | leaf | C | 35 指令无 callee 无字符串，6 caller，? |
| 0x195400 | unknown | leaf | C | 11 指令无 callee 无字符串，14 caller，? |
| 0x19542c | unknown | leaf | C | 7 指令无 callee 无字符串，23 caller，? |
| 0x195448 | unknown | leaf | C | 7 指令无 callee 无字符串，14 caller，? |
| 0x195464 | quest | worker | C | 11 指令单 callee 0x13efdd0，vote quest:1 |
| 0x195490 | unknown | leaf | C | 15 指令无 callee 无字符串，1 caller，? |
| 0x1954cc | quest | worker | B | 调 0x523194/0x2595e4/0xe8178/0x13efd7c，vote quest:4 |
| 0x1955b8 | unknown | leaf | C | 104 指令无 callee 无字符串，11 caller，疑纯计算/表，无法归属 |
| 0x195758 | quest | orchestrator | B | 11 callee（0x561b28/0x195dfc/0x4c90a4/0x195f48），vote quest:10 monster-em:1 |
| 0x195dfc | unknown | leaf | C | 83 指令无 callee 无字符串，4 caller，? |
| 0x195f48 | quest | worker | B | 调 0x2595e4/0xe82e0/0xe715c/0x4c99ac，vote quest:3 otomo-ot:1 |
| 0x1961a8 | unknown | leaf | C | 5 指令无 callee 无字符串，4 caller，? |
| 0x1961bc | unknown | leaf | C | 5 指令无 callee 无字符串，2 caller，? |
| 0x1961d0 | unknown | leaf | C | 7 指令无 callee 无字符串，21 caller，? |
| 0x1961ec | unknown | leaf | C | 121 指令无 callee 无字符串，2 caller，? |
| 0x1963d0 | unknown | leaf | C | 41 指令无 callee 无字符串，9 caller，? |
| 0x196474 | unknown | leaf | C | 100 指令无 callee 无字符串，1 caller，? |
| 0x196604 | quest | worker | C | 383 指令 3 callee（0x14bba8/0xdad24/0x3f8358），票 1:1:1 三方平，按 quest 簇邻域判，? |
| 0x196c00 | quest | worker | B | 调 0x18e958/0x13f03c/0x523150/0xdac14，vote quest:3 otomo-ot:1 |
| 0x197074 | unknown | leaf | C | 36 指令无 callee 无字符串，3 caller，? |
| 0x197104 | quest | worker | B | 调 0x18e958/0x13f03c，vote quest:2 |
| 0x1971c4 | unknown | leaf | C | 11 指令无 callee 无字符串，13 caller，? |
| 0x1971f0 | unknown | leaf | C | 6 指令无 callee 无字符串，30 caller，? |
| 0x197208 | quest | worker | C | 单 callee 0x197284，vote quest:1 |
| 0x197284 | quest | worker | C | 单 callee 0x523b0c，vote quest:1 |
| 0x19738c | unknown | leaf | C | 61 指令无 callee 无字符串，16 caller，? |
| 0x197480 | unknown | leaf | C | 6 指令无 callee 无字符串，14 caller，? |
| 0x197498 | unknown | leaf | C | 5 指令无 callee 无字符串，9 caller，? |
| 0x1974ac | unknown | leaf | C | 59 指令无 callee 无字符串，1 caller，? |
| 0x197598 | unknown | leaf | C | 35 指令无 callee 无字符串，1 caller，? |
| 0x197624 | quest | worker | B | 5 callee（0x39bd1c/0x523da4/0x3b5b28/0x3bd0cc/0x3ba100），vote quest:3 领先 |
| 0x1977f8 | quest | worker | C | 单 callee 0x197624，vote quest:1 |
| 0x1978d0 | unknown | leaf | C | 9 指令无 callee 无字符串，4 caller，? |
| 0x1978f4 | quest | worker | C | 单 callee 0x152960，vote quest:1 |
| 0x1979b0 | save-io | worker | B | 476 指令调读原语 0x3df2a8/0x3df22c + otomo 存取器 0xdaba4/0xdac14/0xdad24；vote otomo-ot:5（overridden by 原语证据） |
| 0x198120 | save-io | worker | B | 449 指令调写原语 0x3df378/0x3df300 + 同一组 otomo 存取器，为 0x1979b0 的写侧；vote otomo-ot:5 |
| 0x198824 | quest | worker | B | 字符串 `_rabbitid`；调 0x6aa9b8/0x7aedcc/0x887810；vote quest:4 monster-em:2 |
| 0x198c34 | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x198c70 | quest | worker | B | 6 callee（0x887810/0x13efdac/0x7af3e4/0x88784c），vote quest:4 otomo-ot:2 |
| 0x198da8 | quest | worker | B | 调 0x525878/0x194228/0x1943d4/0x55bc4c，vote quest:5 otomo-ot:1 |
| 0x198f04 | quest | worker | C | 单 callee 0x525878，vote quest:1，19 caller（小访问器） |
| 0x198f44 | unknown | leaf | C | 19 指令无 callee 无字符串，2 caller，? |
| 0x198f90 | unknown | leaf | C | 22 指令无 callee 无字符串，2 caller，? |
| 0x198fe8 | unknown | leaf | C | 24 指令无 callee 无字符串，2 caller，? |
| 0x199048 | quest | worker | C | 单 callee 0x525878，vote quest:1，30 caller |
| 0x1990dc | quest | worker | B | 173 指令调 0x525878/0x1943d4，vote quest:2，51 caller（quest 公共例程） |
| 0x199390 | quest | worker | C | 单 callee 0x525878，vote quest:1，51 caller |
| 0x19945c | quest | worker | B | 调 0x525878/0x1990dc，vote quest:2 |
| 0x19956c | quest | worker | C | 单 callee 0x525878，vote quest:1 |
| 0x1995b4 | quest | worker | C | 单 callee 0x525878，vote quest:1，9 caller |
| 0x1996d4 | quest | worker | C | 单 callee 0x525878，vote quest:1 |
| 0x19974c | quest | worker | B | 调 0x194228/0x525878，vote quest:2 |
| 0x199830 | quest | worker | B | 调 0x194228/0x525878，vote quest:2，26 caller |
| 0x199934 | quest | worker | C | 单 callee 0x525878，vote quest:1，9 caller |
| 0x1999b4 | quest | worker | C | 单 callee 0x525878，vote quest:1，14 caller |
| 0x199a58 | quest | worker | B | 调 0x525878/0x550148，vote quest:2 |
| 0x199ae4 | quest | worker | B | 调 0x525878/0x13efdc4/0x194228，vote quest:3 |
| 0x199d6c | quest | worker | C | 单 callee 0x525878，vote quest:1 |
| 0x199e00 | quest | worker | C | 单 callee 0x525878，vote quest:1 |
| 0x199e98 | quest | worker | B | 401 指令 7 callee（0x525878/0x194c80/0x7af3a0/0x19c58c），vote quest:7 |
| 0x19a4dc | unknown | thunk | C | 4 指令无 callee 无字符串，4 caller，无法归属 |
| 0x19a4ec | save-io | worker | B | 28 指令调 0x3df1b8/0x3df22c（存档读原语侧），vote otomo-ot:2；直接包裹 I/O 原语 |
| 0x19a55c | save-io | worker | B | 30 指令调 0x3df1b8/0x3df300（存档写原语侧），vote otomo-ot:2；为 0x19a4ec 的写侧 |
| 0x19a5d4 | item | worker | A | 字符串 `mItemBox[i]` `mItemMySet[i]`；6 callee（0x6aa9b8/0x54fa40/0x13efdac）；vote quest:4 但字符串直指道具箱 |
| 0x19a7f8 | unknown | leaf | C | 21 指令无 callee 无字符串，11 caller，? |
| 0x19a84c | quest | worker | C | 调 0x55bc4c/0x13efe3c/0x13efdac，票 quest:2 otomo-ot:1 |
| 0x19a8d8 | quest | orchestrator | B | 8 callee（0x7af3a0/0x1418e0/0x143894/0x1990dc/0x7af3e4），vote quest:8 |
| 0x19aa88 | quest | worker | C | 单 callee 0x7af3a0，vote quest:1 |
| 0x19aab0 | unknown | leaf | C | 5 指令无 callee 无字符串，5 caller，? |
| 0x19aac4 | quest | worker | C | 单 callee 0x7af3e4，vote quest:1 |
| 0x19aaec | unknown | leaf | C | 23 指令无 callee 无字符串，1 caller，? |
| 0x19ab48 | quest | worker | C | 调 0x55bc4c/0x13effa4，票 1:1 平（otomo/quest），按 quest 簇判，? |
| 0x19aba8 | unknown | leaf | C | 7 指令无 callee 无字符串，10 caller，? |
| 0x19abc4 | unknown | leaf | C | 7 指令无 callee 无字符串，2 caller，? |
| 0x19abe0 | quest | orchestrator | B | 10 callee（0x19b7fc/0x19b670/0x19945c/0x19cfe4/0x19c21c），vote quest:10 |
| 0x19b110 | quest | worker | B | 调 0x19b670/0x55bc4c/0x13effa4，vote quest:2 otomo-ot:1 |
| 0x19b1f4 | quest | worker | C | 单 callee 0x13efe3c，vote quest:1 |
| 0x19b360 | quest | worker | C | 调 0x13efda0/0x7aedcc/0x7aa47c/0x887810，票 quest:2 monster-em:1 otomo-ot:1 |
| 0x19b54c | quest | worker | C | 单 callee 0x7aa47c，vote quest:1 |
| 0x19b588 | otomo-ot | worker | B | 调 0x887810/0x88784c/0x7aa47c（otomo 簇），vote otomo-ot:2 领先 quest:1 |
| 0x19b670 | quest | worker | B | 调 0x276278/0x27c7ec，vote quest:2，41 caller |
| 0x19b6e4 | quest | worker | B | 调 0x276278/0x27c7ec，vote quest:2，与 0x19b670 同构 |
| 0x19b7a8 | unknown | leaf | C | 21 指令无 callee 无字符串，14 caller，? |
| 0x19b7fc | quest | orchestrator | B | 13 callee（0x19bbe8/0x2772c4/0x2ff1cc/0x2ff768/0x3a5ed0），vote quest:12 monster-em:2 |
| 0x19bbe8 | quest | worker | B | 调 0x1943a4/0x194228/0x3f8634/0x3f8678/0x1943d4，vote quest:5 |
| 0x19bfcc | quest | worker | B | 调 0x276278/0x27c7ec/0x194250，vote quest:3 |
| 0x19c21c | unknown | leaf | C | 24 指令无 callee 无字符串，82 caller（高频访问器），无法归属 |
| 0x19c27c | unknown | leaf | C | 9 指令无 callee 无字符串，8 caller，? |
| 0x19c2a0 | quest | orchestrator | B | 8 callee（0x66eeac/0x3f8634/0x19b7fc/0x670500/0x65de34），vote quest:6 otomo-ot:2 |
| 0x19c548 | quest | worker | C | 单 callee 0x194228，vote quest:1 |
| 0x19c58c | quest | worker | C | 394 指令但只调 0x194228，vote quest:1；28 caller 的公共例程，? |
| 0x19cbb4 | unknown | thunk | C | 2 指令无 callee 无字符串，10 caller，无法归属 |
| 0x19cbbc | quest | worker | C | 单 callee 0x550148，vote quest:1 |
| 0x19cc80 | quest | worker | C | 单 callee 0x194228，vote quest:1 |
| 0x19cde4 | unknown | leaf | C | 7 指令无 callee 无字符串，1 caller，? |
| 0x19ce00 | quest | worker | B | 调 0x276278/0x27c7ec/0x194250，vote quest:3 |
| 0x19cea4 | quest | worker | B | 调 0x276278/0x27c7ec/0x194250，vote quest:3，与 0x19ce00 同构 |
| 0x19cf50 | quest | worker | B | 调 0x276278/0x27c7ec/0x1943bc，vote quest:3 |
| 0x19cfe4 | quest | worker | B | 165 指令调 0x3f8634/0x2772c4/0x276278/0x27c7ec/0x194250，vote quest:5 |

<!-- END -->
