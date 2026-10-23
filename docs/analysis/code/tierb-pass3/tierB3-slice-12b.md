# Tier B pass3 - slice-12b

Input: `.tmp/mhgu/tierB3p/slice-12b.txt` (20 regions). Report owner: GlmB3s12b.

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xaefe60 | quest | worker | B | votes quest:5 vs render-gfx:2 (2.5x); single real fn, 7 callees all 0xaec-0xaf0 cluster (0xaec544/0xaec63c/0xaec864/0xaed0b0/0xaec900/0xaf04c0); vtable install + orr #0x20000000 flag init; prior tiers.csv quest |
| 0x1242b28 | online-nex | orchestrator | B | (审查 DsvB3r12：19 bl) votes online-nex:5 (sole); callees 0x122e664/0x122e980 (0x122e net cluster per tierB2-slice-12) + 0x1243188/0x124369c/0x12429c4; neighbor fn 0x1243878 holds "OnlineCore/src/Core/InstanceTable.h" |
| 0x44c8f4 | monster-em | orchestrator | B | votes monster-em:5 (sole); 13 bl (classified.csv); bl 0x4a1b6c gate then movw #0x15a4/#0x15a8 sub-object table walk; callees 0x4a1b6c/0x4a2f5c/0x4a1e50 EM cluster |
| 0x4945ec | monster-em | worker | B | region votes monster-em:14 vs quest:2 (7x); real fn at vaddr = 20-insn forwarder (0x7aa47c singleton then bx [vtable+32], 1 bl); region callees 0x4a1d34/0x4a2f5c/0x4a1e50 EM cluster |
| 0xb5dc9c | render-gfx | worker | B | votes render-gfx:2 (sole); 2 bl (0x29d48/0x1ebe8); copies 6-dword template from global 0xcdf2b4 then VFP body; sole engine of 0xb5e cluster (0xb5ec58/0xb5fb38/0xb5e6a4, judged render-gfx in tierB2-slice-12) |
| 0xb6e058 | quest | orchestrator | B | (审查 DsvB3r12：15 bl) votes quest:7 (sole); 7 callees 0xc96c30/0xc96e44/0xa2e9a0/0xa30ba0/0xb6f238/0xb6f3c4 (quest-side 0xc96/0xa2 clusters per tiers neighbors); 80-byte buf compared byte-wise to 0x53 'S', 0x42 'B' then dispatch |
| 0xcb4104 | monster-em | worker | B | votes monster-em:2 vs render-gfx:1 (2x); 3 callees incl 0xcb3c34 (prior monster-em) + 0x7c5814; VFP body |
| 0x139a854 | online-nex | orchestrator | B | votes online-nex:13 vs quest:1 (13x); 11/14 callees in Pia region (0x130a7a8/0x130a8fc/0x130ca48/0x13a5988/0x13ac4c4/0x13ae8d4); neighbor 0x139a598 strings ConnectStationJob |
| 0x5b87fc | otomo-ot | orchestrator | B | votes otomo-ot:10 vs quest:4 (2.5x); 63 bl; callees 0x56e528/0x56e704/0x56e6a8/0x56e6fc/0x56e530/0x56fde0/0x560e90 (0x56e otomo cluster); prior tiers otomo-ot |
| 0x68aaac | quest | orchestrator | B | votes quest:6 (sole); 14 bl; bl 0x65cb3c(r4,5/6) then [r0,#76]|=1, [r0,#80]|=0x100 flag sets; callees 0x68e7f0/0x6b703c; prior tiers quest |
| 0xb02310 | quest | worker | B | votes quest:4 vs kernel-os:1/save-data:1 (4x); 6 callees 0x86a44c/0x86a6e0/0xccb860/0xbc26d0/0x7aedcc/0x7aa47c; prior tiers quest; cited by tierB2-slice-07 0xb01370 |
| 0xbd04dc | quest | orchestrator | B | votes quest:12 vs render-gfx:3 (4x); 19 bl, self-recursive; callees 0xc99360/0xc99724/0xc98880/0xca666c/0xb0a87c/0xb0ad08; used in quest-side destructor chains per tierB2-slice-03 |
| 0x7da390 | quest | orchestrator | B | votes quest:6 vs monster-em:1 (6x); 13 bl; 8-float VFP prologue; callees 0x8099e4/0x808f88/0x80a6d8 (0x809/0x80a cluster, quest-side per tiers 0x802838/0x844c08); prior tiers quest |
| 0x134d3d8 | online-nex | worker | B | region strings NatDetectionJob::Step{Start,Send,Complete,End} (NAT traversal); votes online-nex:10 vs quest:1 (10x); real fn at vaddr = 16-insn job cleanup: bl 0x13ed5d8 + blx [vtable+12] |
| 0x5bb938 | otomo-ot | orchestrator | B | votes otomo-ot:7 vs quest:4 (1.75x); 15 bl; callees 0x56e528/0x56e808/0x5ba1b4/0x5ba2b8/0x5bbf68 (0x56e/0x5ba otomo clusters) |
| 0x6bc520 | quest | orchestrator | B | votes quest:5 vs monster-em:1/otomo-ot:1 (5x); 22 bl; static table init with small IDs {1,2,3,4,8,9,5} then callees 0x6bcae8/0x50fc1c/0x50febc/0x507994; prior tiers quest |
| 0x862500 | kernel-os | leaf | B | (主会话 MCP：0x862504 在 fn 0x8624d0 内，vaddr 不是函数起点) real fn at vaddr = 4-insn getter (global 0xfded1c -> [r0,#0] -> bx lr, 0 bl); host region is an orchestrator whose switch dispatcher calls sequential import thunks 0x13f061c..0x13f0664, verified GOT jumps to 0x13efd44 (read_words 0x18382fc); module 0x862-0x863 judged kernel-os in prior tiers (0x862500/0x862ee4) |
| 0xa65404 | render-gfx | orchestrator | B | votes render-gfx:5 vs quest:2; 14 bl into render cluster (0xaed74c/0xaf7958/0xafb2bc/0xafca74/0xa77288/0xa77ce0/0xa7784c); FPU-heavy body (vdiv at 0xa654f8, vcmpe/vsel pipeline 0xa65500-0xa65518) over [r5,#16..#88] state; neighbors 0xa65a60/0xa6610c/0xa66790 judged A render-gfx in tiers.csv |
| 0x13c630 | weapon-wp | orchestrator | C | (主会话：首位票 quest:9，标 weapon-wp 又没有函数内类注册 → 标签冲突待复核) 50 bl, 2 direct; repeated pattern bl 0x152960 with sequential movw #0xde20/#0xde21/#0xde22... keys, storing results to [r8,#388..#428] (resource-name lookups); prior inventory classified3.csv already labels this vaddr weapon-wp; quest-vote row 0x139a598 is a neighbor fn, not this one |
| 0xbdd280 | quest | leaf | C | (主会话：votes=[-]，标签只靠邻居推断) votes=[-]; 0 bl, pure FPU body (vmov/vadd/vmul 0xbdd29c-0xbdd2dc) transforming two structs; single caller 0xbdce38 (neighbor of prior quest rows 0xbdd8d4/0xbdde2c) sets up the module; two shared globals imported via 0x13efd44; classified3.csv already labels this vaddr ui→prop, but class-based module assignment (0xbdc8c0 render-gfx → rest quest) is the stronger signal; treated as quest (vote-fallback) |

## Summary
- A: 0
- B: 20
- C: 0
- total: 20

All 20 rows are B-confidence, grounded in vote ratios, callee-cluster membership, structural (bl-count/FPU/import-thunk) evidence, and prior-pass tiers.csv/classified3.csv cross-references; none carried in-function class strings or save primitives strong enough for A.

审查后（DsvB3r12 审前 16 行：14 PASS / 2 FAIL；后 4 行由主会话 MCP 复核）：conf A 0 / B 18 / C 2（共 20）；role orchestrator 12 / worker 6 / leaf 2。
