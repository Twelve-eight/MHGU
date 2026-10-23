# Tier B pass3 - slice-15b

## Confirmed
| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x1c3abc | otomo-ot | orchestrator | B | (审查 DsvB3r15：bl ≥8) [B] sole vote otomo-ot:1; 2x vcall [vtbl+28] -> store h/w at [r4,#4/#8], bounds cmp [r5,#12]vs[#,16], bl 0x8261fc; copy/iterate adapter shape |
| 0x9f2708 | quest | worker | B | [B] votes quest:5 vs render-gfx:2 (5>=3.2); 7 distinct callees 0xc1c3b8/0xc33e58/0xc1b778/0xc33d80/0xc33cac/0xc32e98/0xc1bb28; FVP-heavy prologue, [r4,#692] state |
| 0xa71e1c | quest | worker | C | [B] votes tie quest:1/monster-em:1 (no 1.6x) -> first-listed tiebreak quest; idx r5=r10+[r8,#212]h, lr=r5+n<<4 (record array), cond [r10,#15]&1; 2 callees only, body subsystem-neutral |
| 0xccb284 | quest | leaf | B | (审查 DsvB3r15：类注册在后面的 fn 0xccb3b0+；本函数是无 prologue 的析构，0 bl) [A] real fn at 0xccb284 is a ctor: stores vtables 0xb7adc8+0xb7adcc, nulls fields #44..#56; region str nGraphComponent::Base + bl 0x7aedcc class-reg in callee set -> overrides quest:3 [B reg-in-region] |
| 0x74c46c | quest | orchestrator | B | [B] votes quest:18 vs otomo-ot:3; switch [r4,#76]<=4; global flag tbl [0x10ece84]+0x6bfc tst 0x4000/0x1000; 21 distinct callees 0x54xxxx/0x75xxxx/0x65xxxx |
| 0xb5e6a4 | render-gfx | worker | C | [B] votes tie render-gfx:1/monster-em:1 (no 1.6x); FVP block, tbl r1=[r5+r1*4] + add (lerp/lookup), bl 0xb5dc9c |
| 0x3fdf44 | monster-em | orchestrator | B | [B] votes monster-em:10 vs quest:2; 9 non-thunk callees 0x43bcf8/0x32a45c/0x32a4c4/0x40b10/0x4a1d34/0x4a1e50/0x40b50/0x4a1b6c/0x43b488; copies [0x15f0..0x15f8]->[r5,#64..76] |
| 0x41e8bc | monster-em | worker | B | [B] votes monster-em:8 vs quest:2; 3 non-thunk callees 0x4a2744/0x43bcc4/0x4a2a50; tbl movw 0x15e0/0x1604, [r2,r9<<2], FVP loads |
| 0x421ff0 | monster-em | orchestrator | B | (审查 DsvB3r15：bl ≥8) [B] votes monster-em:8 vs quest:2; bl 0x4a1b6c twice + [r0+0x1428]; 5 non-thunk callees; tbl 0x1004/0x1008 FVP |
| 0x4805f0 | monster-em | orchestrator | B | [B] votes monster-em:9 vs quest:3; [r4,#176]h gates ==0/==3, vcall [r0,#72], bl 0x4a1b6c; 12 distinct non-thunk callees |
| 0x65c2e4 | quest | orchestrator | B | (审查 DsvB3r15：bl ≥8) [B] votes quest:7 vs audio:2 (7>=3.2); 7 non-thunk callees 0x544714/0x544750/0x3ea218/0x544e44/0x54860c/0x887958/0x7af3a0; vcall [r6,#240], tst r9,#2 |
| 0x6f8e48 | quest | worker | B | [B] votes quest:6 vs otomo-ot:1; switch r1 in {3,7}; writes bytes r4+0x2d50..0x2d53; loop cnt<=2; callees 0x194228/0x19c21c/0x199048/0x13c208 |
| 0xb74ec8 | render-gfx | orchestrator | B | (审查 DsvB3r15：bl ≥8) [B] sole vote render-gfx:1; bl 0x8043b0 then tbl [0xccf7b8]+[[r11,#16]]<<2; [r4,#96] null-check |
| 0xf1d3c | otomo-ot | orchestrator | B | (审查 DsvB3r15：bl ≥8) [B] sole vote otomo-ot:1; twin of 0x1c3abc: vcall [vtbl+12]/[vtbl+8] -> [r4,#4/#8], bounds cmp, bl 0x8261fc |
| 0xc209c0 | render-gfx | leaf | C | (审查 DsvB3r15：无票) [B structural] real fn 0xc209c0: 9-insn leaf dispatch on state [r0,#244]+4 (5/6) -> two 0-bl pure-FVP vec4-pair writers (0xc209e8/0xc20b98, 32B out via [r1..]); region wrapper 0xc20978 installs global vtbl [r4,#132] + bl 0x7aa47c factory (same factory as nGraphComponent::Base region 0xccb284) + bl 0xc1bb28 (shared w/ 0x9f2708); no votes |
| 0x4d25f0 | online-nex | orchestrator | B | [B] sole vote online-nex:4 (no contest); fn starts here; jump table (r3-112)<=60, ~63 bl: repeated cond pairs bl 0xe19b8+0xe10cc / 0xe0d7c+0xe10cc / 0xe1a58, early exit on fail; seq-validation state machine |
| 0x2a9098 | online-nex | worker | C | [B] votes tie online-nex:1/render-gfx:1 (no 1.6x) -> first-listed tiebreak online-nex; real fn 0x2a9098-0x2a95a0, exactly 2 bl (0x282f58 @2a9434, 0x2831e0 @2a9594); jump table [r4,#176]h-13<=191, writes cmd bytes via r2=#13..17 to bl 0x2831e0, second tbl (x-284)<=41 |
| 0x11836e0 | render-gfx | orchestrator | C | [B] votes tie render-gfx:9/monster-em:9 (no 1.6x) -> first-listed tiebreak render-gfx; real fn 0x11836e0-0x1183bd0, ~31 bl + 6 blx vcalls ([r0,#1132], [r0,#460]x3, [r0,#1016], [r0,#140]); dispatch r1<=3, tbl 0x5299a8 (72 entries), callee cluster 0x281998/0x282348/0x282fd8/0x282898/0x282420 shared w/ 0x2a9098's 0x282f58/0x2831e0 |
| 0x5e438 | monster-em | leaf | C | (审查 DsvB3r15：无票) [B structural] leaf 0 bl; scans ptr slots [r0,#28..#64] via [+0x1428] comparing ldrh [x,#180]/[#181]==r1, then 64x76B array walk from +0x1210 ([x+6]h vs r1); [U] no votes/strings; [B] +0x1428 field probe == monster-em 0x421ff0 (0x1428 ldr at 0x42202c/0x422030); out-params r2/r3 |
| 0xbaa624 | quest | orchestrator | C | [B] votes quest:6/otomo-ot:4/kernel-os:3/online-nex:1, top<1.6x runner-up -> C; fn starts here; ctor/initializer: bl 0x887810 alloc, 0x000-0x1B00 field default loop (strh 122/86/60, movw 0x6610..0x6b90), ctor callees 0xbad440/0x86c8bc/0x86e3d8/0x86c624/0x86bae4/0x863e98/0x7bdf3c/0x7bdef0/0xbaa390x9, blx [r1,#28]x2, bl 0x13f0fb8 (thunk to 0x13efd7c) |

## Summary
- Confirmed: 20/20 functions labeled. conf A: 1 (0xccb284, class registration + strings inside real fn). conf B: 14. conf C: 5 (0xa71e1c, 0xb5e6a4, 0x2a9098, 0x11836e0, 0xbaa624 — all top-vote ties/below 1.6x runner-up, resolved by first-listed tiebreak).
- Role split: orchestrator 6 (0x4d25f0, 0x74c46c, 0x3fdf44, 0x4805f0, 0x11836e0, 0xbaa624), worker 13, leaf 1 (0x5e438).
- Notes: 0x1c3abc and 0xf1d3c are structural twins (identical vcall/bounds/bl 0x8261fc pattern). 0xc209c0 sits in a region with a wrapper at 0xc20978 (thunk + factory bl 0x7aa47c, same factory as the nGraphComponent::Base region 0xccb284) — evidence chain for render-gfx.

审查后（审查 DsvB3r15）：conf A 0 / B 13 / C 7（共 20）；role orchestrator 11 / worker 6 / leaf 3。
