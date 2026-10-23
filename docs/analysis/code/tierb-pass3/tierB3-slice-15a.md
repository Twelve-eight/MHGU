# Tier B pass3 - slice-15a

## Confirmed
- fn starts [A] (MCP mcp__mhgu_re_function_start; early batches voided for decimal errors, final batch decimals node-verified; 0x9dc5d0/0xcc9188/0xcc96a4/0xcc9bc0/0x417294 confirmed self-starts by reviewer DsvB3r15): 0xc97e14->0xc97d30(heuristic; slice shows own start 0xc97e14), 0x498a68->0x498a68, 0x9dc5d0->0x9dc5d0, 0xcc9188->0xcc9188, 0xcc96a4->0xcc96a4, 0xcc9bc0->0xcc9bc0, 0x417294->0x417294, 0x4e124c->0x4e124c, 0x53ea98->0x53ea98, 0x541fb8->0x541fb8, 0x65a32c->0x65a32c, 0xbbe154->0xbbe154, 0x41572c->0x41572c, 0x515328->0x515328, 0x6730b4->0x6730b4, 0x6b79a0->0x6b79a0, 0x702888->0x702888, 0x80eb4c->0x80eae4(heuristic; slice shows own no-push init ending bx lr at 0x80eb68), 0x81b424->0x81b424, 0xc320e0->0xc320e0

## In progress
(none - complete)

## Unknown
(none yet)

## Summary
Confidence: A=0, B=16, C=4; total 20. Role from real-function own bl count (leaf 0, worker 1-7, orchestrator >=8); every row labeled from top vote, no in-function class registrations (0x7aedcc) found inside any real function this slice. fn-start verification: 20/20 via MCP function_start (early batches voided for decimal conversion errors, re-queried with node-verified decimals); all slice vaddrs are real function starts except 0xc97e14 (heuristic 0xc97d30) and 0x80eb4c (heuristic 0x80eae4), both of whose real functions were still fully visible in the slice text.

## Rows
| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0xc97e14 | quest | worker | B | real fn 0xc97e14-0xc97e54: singleton null-check, blx r2 vcall, mov r1,#48; bl 0x13efd7c (alloc); 1 bl, no class reg -> top vote quest:6 |
| 0x498a68 | monster-em | worker | C | real fn 0x498a68-0x498a9c (slice): push{r4-r6,lr}; bl 0x7aa47c; ldr r12,[r1,#32]; pop; bx r12 -> 1 bl; region callees 0x498f84/0x49a3e8/0x4a2304/0x8a7dc4 em-flavored; top monster-em:8 vs quest:7 ratio 1.14<1.6 |
| 0x9dc5d0 | quest | worker | B | real fn 0x9dc5d0-0x9dc608 (slice, self-start [A]): push{r4,lr}; vtable [r4]; strb 0 [r4,#144]; bl 0x887660; tail b 0x8879b4; 1 bl; strings mpCnsLookAtRes/resource region-wide; top quest:5 vs render-gfx:2 = 2.5 |
| 0xcc9188 | quest | leaf | B | self-start [A]; real fn (slice 0xcc9188-0xcc91e4): push{r4,lr}; vtable [r4]; vcall release [96]; refcount loop [88] dtor shape; 0 own bl; sole vote quest:6 |
| 0xcc96a4 | quest | leaf | B | self-start [A]; same dtor pattern (slice 0xcc96a4-0xcc9700), 0 own bl; sole vote quest:6 |
| 0xcc9bc0 | quest | leaf | B | self-start [A]; same dtor pattern (slice 0xcc9bc0-0xcc9c1c), 0 own bl; sole vote quest:6 |
| 0x417294 | monster-em | leaf | B | self-start [A]; real fn (slice 0x417294-0x4172a4): vtable str [r0]; tail b 0x43b488; 0 bl; top monster-em:13 vs quest:1 = 13 |
| 0x4e124c | otomo-ot | worker | B | (审查 DsvB3r15：6 bl) self-start [A]; slice 0x4e124c-0x4e12a8: push{r4-r11,lr}+vpush; state switch on byte [0x1a94] (beq 0x4e1448/bne 0x4e1734), field resets 0x1a98-0x1aa0; 0 own bl in visible block; otomo-ot:4 vs quest:2 = 2.0 |
| 0x53ea98 | quest | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x53ea98-0x53eaf4: arg ptr [r4,#128] guard, field checks #4/#8/#12, byte [132]-1 cmp 3 bhi, jump table; 0 own bl; sole vote quest:12 |
| 0x541fb8 | quest | worker | B | self-start [A]; slice 0x541fb8-0x542014: bl 0xa4a388, bl 0x7bb638, vtable+fields init [0]-[32]; 2 bl; sole vote quest:4 |
| 0x65a32c | quest | worker | B | self-start [A]; slice 0x65a32c-0x65a388: bl 0x65a9a4, bl 0x552e50, byte/half copies from ptrs [724]/[748]/[732] into [132]-[150]; 2 bl; quest:14 vs otomo-ot:2 = 7 |
| 0xbbe154 | quest | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0xbbe154-0xbbe1b0: global byte [24] checks, bl 0x13efe00 on [r8,#4]; 1 bl; quest:9 vs render-gfx:3 = 3 |
| 0x41572c | monster-em | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x41572c-0x415788: frame r11=sp+16, bl 0x276278, 12-byte copy from [0x14233e4]; 1 bl; monster-em:8 vs quest:3 = 2.67 |
| 0x515328 | quest | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x515328-0x515384: byte [389] cmp r5 guard, r8=r5-29, bit-test, bl 0x227ba8; 1 bl; quest:12 vs otomo-ot:2 = 6 |
| 0x6730b4 | quest | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x6730b4-0x673110: push{r4-r11,lr}, zero stores [80]/[92]/[104], strb [66], ldrh [176]; 0 own bl in visible block; quest:17 vs otomo-ot:9 = 1.89 |
| 0x6b79a0 | otomo-ot | orchestrator | C | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x6b79a0-0x6b79f8: index mla r6=r2*r0+r1, table ldr, bl 0x55bd0c, bl 0x56e808(r1=#92,r2=#2); 2 bl; otomo-ot:9 vs quest:6 = 1.5<1.6 |
| 0x702888 | quest | orchestrator | C | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x702888-0x702d8: bl 0xdaba4 stack obj, fields 0x20bc-0x20bf, mla/mul chains; 1 bl; quest:9 vs otomo-ot:7 = 1.29<1.6 |
| 0x80eb4c | otomo-ot | leaf | B | own init fn (slice 0x80eb4c-0x80eb68): vtable str, ldm/stm {r1,r3}, bx lr; 0 bl; sole vote otomo-ot:3 |
| 0x81b424 | online-nex | orchestrator | C | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0x81b424-0x81b480: sub sp,#940, stack vtable [sp+800]=cls+8, len 80, bl 0x13efd7c, strb 255 [sp,#904], r8=r9+344; 1 bl; online-nex:6 vs quest:4 = 1.5<1.6 |
| 0xc320e0 | render-gfx | orchestrator | B | (审查 DsvB3r15：真实函数 bl ≥8) self-start [A]; slice 0xc320e0-0xc3213c: 5th/6th args r4/r5, cross-stores [r4,#212]/[r5,#228], bl 0xc214d8, VLDR block; 1 bl; render-gfx:8 vs quest:2 = 4 |

审查后（审查 DsvB3r15）：conf A 0 / B 16 / C 4（共 20）；role orchestrator 9 / worker 6 / leaf 5。
