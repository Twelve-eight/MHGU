# Tier B pass3 - slice-11c

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x55cc3c | quest | orchestrator | B | 16 callees incl. 0x55fb20/0x65f2f0/0x56dfac; quest-vote cluster (10/4/2), no in-body strings [B] |
| 0x656604 | otomo-ot | worker | B | head fn 0x656604-0x6566b3 builds panel-desc struct (43/1/2/3/4/50) then bl 0x56dd44; 3 bl; votes 9 vs 4; region string cUIOCPanelSupportSelector [B] |
| 0x658188 | quest | worker | B | real fn 0x658188-0x6582b0, 7 bl (0x56e538, 0x56de60, 0x56dfac, 0x54533c x2, 0x55bc4c, 0x56e808); 0x65850c/0x658638/0x658404 are tail-b thunks; votes 16 vs 9 [B] |
| 0xa1c15c | quest | worker | B | 9-case jump table at 0xa1c188 dispatch on r1; region callee list only 4 entries (0xa1bb14/0xa1bdd0/0xc8f718/0x7bb638); quest sole top vote 4 [B] |
| 0xceceec | audio | leaf | C | vaddr 0xceceec = 2-insn getter ldr r0,[r0,#112]; bx lr; next fn 0xcecf08 is rGeometry2Group registrar (region string geo3); votes audio 6 vs quest 5 = 1.2x [C] |
| 0x6808b4 | otomo-ot | orchestrator | C | fn 0x6808b4 (push {r4,r5,r6,lr}): [r4+4] status, jump table 0x680938 cases 0-8, 21-callee cluster 0x689xxx-0x68exxx + 0x65c-0x65e; votes quest 11 vs otomo-ot 10 = 1.1x [C] |
| 0xa1ffac | online-nex | worker | C | 4 callees (0xc8ec60/0xc8ea30/0x8098b4/0x13efddc), FP body after bl 0xc8ec60; votes quest 2 > online-nex 1, top < 1.6x second [C] |
| 0xb31f7c | quest | worker | B | fn start 0xb31f7c (push {r4,r5,r11,lr}): fanout calling vtbl slot +0x20 (blx r2) on nodes [r5+8/0xc/0x10/...]; all 4 ident tiers.csv callees quest-B (0xb26c04/0xb26c4c/0xb27600/0xb27630); votes 7 vs 1 [B] |
| 0xc0ef74 | quest | orchestrator | B | FP-compare chain via literal GOT loads then FP block to 0xc0f03c; callees quest-A 0xc47ca8/0xc46e24/0xc46dcc/0xc48000, quest-B 0xc1fee4/0xc1fccc/0xc0f618; tiers.csv 0xc0ef74=B quest [B] |
| 0xc63e8c | render-gfx | orchestrator | B | fn start 0xc63e8c: iterates [r8+60]/[r8+68] list, vtbl call slot +0x50, field-compare 12/16; 6 callees render-gfx-A (0x8bc674 7106-insn, 0x8b8f84 3505, 0x8affe0, 0x8b01c8, 0x8af668, 0xa57f14/0xa57e4c); votes 9 vs 4 [B] |
| 0x107ebd0 | quest | leaf | B | vaddr = 1-insn stub b 0xc9f3c; next fn 0x107ebd4: GOT singleton, bl 0x152960/0x70830/0x887660; 9/11 callees quest-B; votes 13 vs 1 [B] |
| 0xb63dc | monster-em | worker | C | fn start 0xb63dc: vtbl call slot +0x398 (blx r3), reads [r1+0x5ccb]; region callee list 2 entries (0x69e664 audio-B, 0x13efd70); votes audio 1 = monster-em 1 tie [C] |
| 0x214d2c | quest | worker | B | (审查 DsvB3r11b：1 bl) real fn 0x214d2c-0x214d60: GOT load, bl 0x7aa47c (1 direct bl), tail blx vtbl slot +0x20 forwarding (r5,r1); region string mShareParam.guildCardId[i]; tiers.csv B quest [B] |
| 0x5d9b44 | otomo-ot | orchestrator | C | (审查 DsvB3r11b：9:7 分票) fn start 0x5d9b44: copies [r1+4]/[r1+0] to [r4+128]/[r4+124], switch on type (2/1) building param 39/16/1, bl 0x56e61c then bl 0x56fb94; 17-callee otomo cluster; votes otomo-ot 9 vs quest 7 = 1.28x [C] |
| 0x68d988 | otomo-ot | orchestrator | C | (审查 DsvB3r11b：标签冲突待复核：首位票 quest:12，次席 otomo-ot:9) fn start 0x68d988: state switch at 0x68d9c8 (cases 0-8), singleton load [r3+0x6bfc], 21-callee mix otomo 0x68f058/0x6b7xx + quest infra 0x65cb3c/0x54f260/0x3df9d4; votes quest 12 vs otomo-ot 9 = 1.33x [C] |
| 0xa3bdc4 | quest | leaf | B | fn 0xa3bdc4-0xa3be08: sets vtbl from GOT+8, walks child chain [r4+96] via vtbl slot +4 (blx r1) until null; 0 bl; votes 5 vs 1; region strings cGUIInstance* hint ui [B] |
| 0xa4f844 | quest | worker | C | (审查 DsvB3r11b：6:6 平票；5 bl) fn start 0xa4f844: builds object at r0 (vtbl pc-rel, fields 0x80006, GOT ptrs +12/+28), bl 0xa4d458 (quest-B 703), bl 0x7bb638; render-gfx-A callees 0xa4eb9c/0xa4feb4/0xa50290/0xb37dcc/0xb3880c; votes quest 6 = render-gfx 6 tie [C] |
| 0xaf9a88 | render-gfx | worker | C | (审查 DsvB3r11b：1 bl) fn start 0xaf9a88: FP prologue, validation (r1-3 vs [r11+8], r3) then FP pack loop; region callee list 1 entry (0x13ba42c render-gfx-B); sole 1-vote source + tiers.csv neighbours render-gfx-B [C] |
| 0xb097b8 | quest | leaf | B | fn 0xb097b8 is 1-insn stub bx lr (tiers.csv B quest, 0xb097b4 stub before it); real fn 0xb097c0: bl 0xccb8c8 (quest-B 108), bl 0x7bb638, builds vtbl object fields 0x810006 [B] |
| 0xb59920 | quest | worker | B | (审查 DsvB3r11b：3 bl) fn start 0xb59920: loop bl 0xb580f0 (quest-B 684) over stride-80 records, vtbl slot +0x34 call (blx r2); callees quest-B 0xb59f90/0x82772c/0x827998/0x827bbc/0x8277c4; votes quest 10; tiers.csv B quest [B] |

## Summary
- A: 0
- B: 8
- C: 12
- Total: 20

审查后（DsvB3r11 前 12 行 + DsvB3r11b 后 8 行）：conf A 0 / B 12 / C 8（共 20）；role orchestrator 6 / worker 10 / leaf 4。上面作者 Summary 的计数与表不符，以本行为准。
