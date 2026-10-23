# Tier B pass3 - slice-07

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x13fe88 | weapon-wp | leaf | B | [reviewer-sourced 种子，审查方已独立复核] (审查 DsvB3r07：真实函数角色 worker→leaf) votes quest:2>monster-em:1 (2.0x) overridden by seeds-class.txt authoritative seed sEquip + sEquip::cEquipBaseBackup@0x14023c/0x140280; `sub r1,r0,#82; cmp r1,#132; bhi 0x1400c0` → 133 项 `add pc,r1,r2` table at 0x13fea4; callees only 0x13efda0/0x7aedcc/0x7aa47c |
| 0x1849e4 | quest | leaf | B | (审查 DsvB3r07：真实函数角色 worker→leaf) votes quest:3 (sole); range opens with thunk `b 0x2b908` + `bl 0x2b908` (alloc stub), GOT 0x16b60bc → `bl 0x7aa47c` → `ldr r2,[r1,#52]; bx r2` tailcall |
| 0x5106f8 | quest | orchestrator | B | votes quest:6 vs render-gfx:3 (2.0x); class-inventory sVillage@0x5109a4; dispatch `cmps r1,#0x389/#0x38a/#0x3ed/#0x40f/#0x259/#0x2c9` → `mov r0,#6`/`#1`; 11 callees |
| 0xb1d1c | monster-em | orchestrator | B | votes monster-em:9 (sole); `sub r1,r1,#1; cmp r1,#104; bhi 0xb28bc` → 105-entry jump table; 9 callees 0x3f865c/0x3a8d68/0xf69058... |
| 0x4f594c | quest | worker | B | votes quest:4 vs 1s (dominant); gate `ldrb r0,[r4,#256]; cmp r0,#0; beq`; pc-rel fmt ptrs 0x134423c/0x1343994, `add r6,r4,#224; add r5,r4,#240` struct args, bl 0xc3eb0c |
| 0x8326b4 | quest | orchestrator | B | votes quest:38 vs otomo-ot:9 (4.2x); loops over [r10,#260]/[r10,#264]; 21 callees all 0x7b1xxx-0x7b7xxx + self-recursion bl 0x8326b4 |
| 0xce6ccc | physics-math | orchestrator | B | votes quest:16 overridden by class-inventory rCollisionObj + cPartsData@0xce748c/0xce74c8; vtable-set ctor `ldr r0,[pc,#212]=0xb5f68c; str r0,[r9,#0]`; stride-64 walk `add r10,r11,r1,lsl #4` over [r9,#108] array; 17 callees incl bl 0x7aedcc |
| 0xa484c4 | quest | worker | B | votes quest:5 (sole); `ldrh r1,[r0,#98]; tst r1,#4080; bxeq lr`; post-inc store loop at +92; GOT 0xdfb154 → bl 0x7aa47c → vtable+32 (r2=16) |
| 0xc2fe8c | render-gfx | worker | B | votes render-gfx:3 vs monster-em:1 (3.0x); `sub sp,#648` + VFP push ed2d8b10; GOT 0xc0957c → `blx r3` vtable+28 alloc 6144 split `add r1,r0,#2048; add r2,r0,#4096` |
| 0xa5242c | quest | orchestrator | B | (审查 DsvB3r07：真实函数角色 worker→orchestrator) votes quest:4 (sole); strings `ControlPoint \| ResolutionAdjust` (pc-rel 0xb25af4/0xb257e6); sp block `movw r8,#6; movt r8,#0x80` + GOTs 0xdf1364/0xdf1350; bl 0xa4a388/0x7bba9c |
| 0x49c258 | monster-em | worker | B | votes monster-em:2 vs quest:1 (2.0x); GOT 0x13a17e8 → bl 0x7aa47c → `blx r4` vtable+32 (r2=16, movw r1,#0x1660); tail `b 0xd993d8` |
| 0x1b8360 | otomo-ot | orchestrator | B | votes quest:19 overridden by class-inventory cMonNyanProcSelectMainWindow@0x1b8f50; `cmp r1,#0` → store [r4,#24], bl 0x5d0d28 (r1=3), GOT 0x16809f8 → bl 0x5231bc; 22 callees 0x5dxxxx/0x54xxxx/0x65xxxx |
| 0x6f02fc | quest | orchestrator | B | votes quest:14 vs monster-em:3 (4.7x); repeated member release `movw r0,#0x1ecc; ldr r0,[r5,r0]; bl 0x887660; str r0` (+0x1ed0/+0x1ed4); 19 callees |
| 0x967434 | quest | orchestrator | B | votes quest:10 vs online-nex:1 (dominant); table walk `ldr r1,[lr,#0]; cmps r3,r1,lsr #16` with `ldr r1,[r10,r1,lsl #2]` (r1=r3,lsr#8); 11 callees 0x7b18f0/0x887660/0x7b71b4... |
| 0x51a854 | monster-em | leaf | C | (审查 DsvB3r07：真实函数角色 worker→leaf) split votes monster-em:4 vs quest:3 (0.75x); thunk `b 0x93992c`; GOT 0x1324300 → bl 0x7aa47c → vtable+52 tailcall; 7 callees |
| 0xce7af8 | render-gfx | orchestrator | B | string `Geometry` in range; class-inventory rDynamicSbc@0xce7d80 (B-only: site r1 reads "Range", r3=408); zeroes +116/+120/+128/+136, releases [r4,#104]/[r4,#100] via vtable+52; disasm head: 80-byte child nodes `mov r4,#80; str r7,[r4,#48]` vtable writes; 11 callees |
| 0x44cf50 | player-pl | orchestrator | B | votes monster-em:11 overridden by class-inventory uShellPlEffect; scan loop `ldr r4,[r6,r1,lsl #2]; ldrb r4,[r4,r1]; cmps r4,r3` over members [r0,#0x15a8]/[r0,#0x15ac]; 14 callees |
| 0x9181c8 | quest | orchestrator | B | votes quest:8 vs monster-em:3 (2.7x); VFP fields +0x7d8/+0x7dc (ed94/ed95 loads, vcmpe ee210a00/ee330a00); bl 0x13f0094; tail `b 0xc5bc0c`; 12 callees |
| 0x7e3110 | quest | worker | B | votes quest:3 vs monster-em:1 (3.0x); state switch `ldr r0,[r5,#0]; sub r0,#1; cmp r0,#3` 4-entry table; float literals 0x3f5db3d9/0x3efffffc in pool; callees 0x7e2e78/0x7e3f60/0x7e3d84 |
| 0xa94948 | quest | orchestrator | C | split votes quest:7 vs render-gfx:5 (0.71x); ctor `ldr r1,[pc,#12]=0xdaf0d4; add r1,r1,#8; str r1,[r0,#0]`; bl 0x7aa47c → vtable+52 tailcalls; 16 callees 0xa58xxx-0xa6xxxx |
| 0x25d714 | quest | orchestrator | B | votes quest:16 vs monster-em:3/otomo-ot:3 (dominant); container calls bl 0xe92a8/0xe8458; `cmp r0,#13; bhi 0x25da30` 14-entry table; 22 callees |
| 0xb325f0 | quest | leaf | B | (审查 DsvB3r07：真实函数角色 worker→leaf) votes quest:2 (sole); 8-slot pointer-table init `add r2,r1,#16/24/32/40/48/56/64/72 → str r2,[r0,#12..#60]`; sibling 0xb32638 in range holds bl 0x7bb638/0x7aa47c |
| 0x407db8 | monster-em | orchestrator | B | votes monster-em:12 vs quest:2; class-inventory uShellEmBase15; guards bl 0x3fe644/bl 0x4a1b6c then `movw r1,#0x1428; ldr r1,[r0,r1]; ldr r1,[r1,#84]; str r1,[r4,r2]` (+0x174c/+0x1720-28); 16 callees incl bl 0x7aedcc |
| 0x479a0 | monster-em | orchestrator | B | [reviewer-sourced 种子，审查方已独立复核] (审查 DsvB3r07：真实函数角色 worker→orchestrator) votes quest:3/audio:2 overridden by seeds-class.txt authoritative seed cEmDouMouKaData + 8 nested cEmDouMouKa*@0x48308..0x48500; loop `ldr r0,[r0,r5,lsl #2]; blx r1` (vtable+4) over [r4,#60], count [r4,#48]; GOT 0x17f1160 → bl 0x7aa47c |
| 0x435934 | monster-em | orchestrator | B | votes monster-em:23 vs quest:5 (4.6x); dtor: vtable 0x14078cc, member release `movw r0,#0x15c8; ldr r1,[r5,r0]...bl 0x31aaf4`; tail `b 0x43b488`; 22 callees |
| 0xcd75cc | quest | leaf | B | (审查 DsvB3r07：真实函数角色 orchestrator→leaf) votes quest:20 (sole); member cleanup +0x4498/+0x448c with bl 0xba7d9c/0xba80bc/0x842f24/0x8213d4...; VFP literal ed9f0a02; 21 callees |
| 0x6e963c | quest | orchestrator | B | votes quest:20 vs otomo-ot:6 (3.3x); globals 0x114fcc4 → [r1,#0x6bf4]/[r1,#0x6bfc]; `cmp r2,#7; bhi 0x6ea054` 8-entry table; 22 callees |
| 0x771d34 | quest | orchestrator | B | votes quest:25 vs otomo-ot:4 (6.3x); `cmp r0,#9; bhi 0x772718` 10-entry table; `ldrb r0,[r4,#77]; tst r0,#64`; 22 callees |
| 0x7e222c | quest | worker | B | votes quest:3 vs monster-em:1 (3.0x); 6144-byte virtual alloc split `mov r1,#6144; blx r3; add r1,r0,#2048; add r2,r0,#4096`; GOT 0x10571dc; callees 0x7e3110/0x7e2e78/0x7e3d84 |
| 0x42fca8 | monster-em | leaf | B | (审查 DsvB3r07：真实函数角色 orchestrator→leaf) votes monster-em:17 vs quest:1/render-gfx:1; thunk b 0x43b488; GOT 0x140d52c → bl 0x7aa47c → vtable+52 tailcall; 19 callees |
| 0x521d4c | quest | orchestrator | B | votes quest:8 (sole); flag decode `and r6,r1,#0x400000; and r1,r1,#0x200000; and r7,r5,#2`; field resets strb [r0,#0..3]/#1061/#1064/#1065; 8 callees 0x523b9c/0x3b190c/0x39bd1c/0x523e44/0x523f30/0x3b1940 |
| 0x76eb4c | quest | orchestrator | B | votes quest:34 vs otomo-ot:12 (2.8x); `bl 0xdaba4/0xdac14` then `ldrh r0,[sp,#8]; and r0,r7(0xffe0); orr r0,#22; strh` twice → bl 0x26e964; 22 callees |
| 0xd25ac | quest | leaf | B | (审查 DsvB3r07：真实函数角色 worker→leaf) votes quest:3 (sole); thunk `b 0x2b908` + `bl 0x2b908`; GOT 0x176771c → bl 0x7aa47c → vtable+52 tailcall |
| 0x41eecc | monster-em | orchestrator | B | votes monster-em:20 vs quest:2; class-inventory uShellEmBase40 (verified 0x41f9d4 r1="uShellEmBase40", r3=cSetupParam=16); member release +0x15ec/+0x15e4 via bl 0x7aa47c → vtable+52; 22 callees incl bl 0x7aedcc |
| 0x425cd0 | monster-em | orchestrator | B | votes monster-em:12 vs quest:2; class-inventory uShellEmBase46; 12× VFP loads (ed930a00-ed905a02) + compares (ee359a42/ee34ca41/ee338a40); bl 0x13efd70; 14 callees incl bl 0x7aedcc |
| 0x13e4534 | unknown | leaf | C | votes [-], no callees/strings in range; LE reassembly `ldrb r2,[r1,#0..3]; orr r2,r2,r3,lsl #8; orr r9,r2,r6,lsl #24; str r9,[r8,#88]` — field-by-field stream-to-struct copy, no subsystem clue |
| 0x9c383c | quest | orchestrator | B | votes quest:16 (sole); gates `ldrb r12,[r1,#183]`/`ldrb r2,[r1,#184]`/`ldr r2,[r1,#188]; cmp r2,#255`; bounds `ldr r6,[r3,#1168]; cmps r2,r6; bcs`; fallback copy from GOT 0xe752bc; 16 callees |
| 0x44b548 | otomo-ot | orchestrator | B | votes monster-em:27 overridden by class-inventory uShellOt013/uShellOt014; VFP compare `ed950a00; eeb50ac0; eef1fa10; bls 0x44b84c` then bl 0x53aa84; `add r0,r4,#5568`; 22 callees incl bl 0x7aedcc |
| 0x13be8dc | physics-math | orchestrator | B | votes quest:16 overridden by class-inventory MtGeomLine@0x13bf47c; GOT 0x489e88 → bl 0x7aa47c → vtable+32 tailcall; 20 callees 0x808f88..0x7e9b80 (Mt* family) incl bl 0x7aedcc |
| 0x1b9868 | audio | worker | B | [reviewer-sourced 种子，审查方已独立复核] (审查 DsvB3r07：真实函数角色 orchestrator→worker) votes quest:7 overridden by seeds-class.txt authoritative seed cMonNyanProcSound@0x1ba448; ctor zeroes +8..+34 (`str r1,[r0,#12]...strh r1,[r0,#34]`), vtable 0x168163c store; bl 0x1ada88/0x1adaa4/0x4eeb78/0x4eed78/0x25d594 |
| 0x79b64c | quest | orchestrator | B | votes quest:31 vs otomo-ot:5 (6.2x); globals 0x109dcb4/0x109d538 → [r0,#0x6bfc]/[r0,#0x6c34]; guard bl 0x25f840(0)/(1) → bl 0x26fcac; 22 callees |
| 0xb338d4 | online-nex | leaf | B | [reviewer-sourced 种子，审查方已独立复核] (审查 DsvB3r07：真实函数角色 worker→leaf) votes quest:3 overridden by seeds-class.txt authoritative seed nNetwork::SearchKeyPtr/FilterPtr/UpdaterPtr...; 8×112-byte slot init `add r12,r12,#112; cmp r12,#2016` with `str r2,[r3,#12..#60]`, `add r1,r1,#392` |
| 0x284e10 | render-gfx | orchestrator | B | votes render-gfx:5 vs monster-em:2 (2.5x); repeated `ldr r1,[r0,#440]; blx r1` with (0x10000000,0)/(0,128)/(128,..) args; 8 callees 0x288710/0x288724/0x28857c/0x94e08c/0x94d7d8/0x94e7b4 |
| 0xa4c2b4 | quest | worker | C | split votes quest:3 vs monster-em:2 (0.67x); copies 0x28-byte global (GOT 0xded8f0) to sp+80..104 via 7 ldr/str pairs; bl 0x7c5d5c/0x29d48/0xa4c0a0 |
| 0x8214e4 | online-nex | orchestrator | B | [reviewer-sourced 种子，审查方已独立复核] votes quest:9 overridden by seeds-class.txt authoritative seed MtNetObject@0x821600; `ldrb r0,[r4,#24]` guard, `blx r1` vtable+24, `streq r7,[r4,#32]/r6,#36/r5,#40`; bl 0x820eec/0x80c640/0x820f3c/0x820fb0; 12 callees incl bl 0x7aedcc |
| 0x4187e0 | monster-em | orchestrator | B | votes monster-em:16 vs quest:2; class-inventory uShellEmBase34; `movw r0,#0x15c8; ldr r5,[r4,r0]` guard; bl 0x40b10 then `movw r0,#0x162c; ldr r0,[r7,r0]; ldr r1,[r0,#304]; blx r1`; 19 callees incl bl 0x7aedcc |
| 0x7db6d8 | render-gfx | worker | B | votes render-gfx:4 vs monster-em:1 (4.0x); 13+ vector loads ed97*0a01-9a09 into 472-byte frame; callees 0x83fde4/0x7d290c/0x7d53b8/0x7dc2d0 |
| 0x92f3dc | quest | orchestrator | C | split votes quest:4 vs monster-em:3 (0.75x); loop bound `ldrne r1,[r0,#252]; sub r7,r1,#1` with per-index bl 0x890adc; `ldr r2,[r0,#24]`; 9 callees |
| 0xb084a4 | quest | orchestrator | B | votes quest:13 (sole); two virtual calls via GOTs 0xd308e8/0xd38f48; gate `ldrh r0,[r8,#30]; orr r0,r0,r1,lsl #16; cmp r0,#0; blt 0xb0857c`; 13 callees |
| 0x71180c | quest | orchestrator | C | split votes quest:20 vs otomo-ot:13 (0.65x); ctor bl 0x70e7b0 (r1=4,r2=14), 4× bl 0x54ed74 inits +60/+96/+132/+168; 22 callees 0x65cxxx/0x54xxxx/0x63xxxx |
| 0x9b309c | monster-em | worker | C | tie votes monster-em:2 = quest:2 (+render-gfx:1); VFP compare chain eeb73a00/vcmpe eef1fa10/bmi 0x9b31ec; zero [r4,#0..#12]; bl 0x9b2f1c/0x9b19a4 |
| 0xb83478 | ui | orchestrator | B | [reviewer-sourced 种子，审查方已独立复核] votes quest:17 overridden by seeds-class.txt authoritative seed rGUIIconInfo (verified r1="rUGIconInfo" at 0xb83720, r3=112); guards r10/r4/r8 then bl 0x13efd88; 20 callees 0x8870b8/0x887160/0x826xxx/0x827xxx |
| 0x494c48 | quest | orchestrator | B | votes quest:16 vs monster-em:5 (3.2x); GOT 0x13a8c94 → bl 0x7aa47c → vtable+32 tailcall (r2=r4); 22 callees 0xc4xxxx/0x96xxxx/0x49axxx |
| 0x317a70 | player-pl | worker | B | [reviewer-sourced 种子，审查方已独立复核] votes monster-em:5 overridden by seeds-class.txt authoritative seed uPlWeaponPreview (verified string at 0x318020); virtual calls `ldr r1,[r0,#440]/[r0,#724]; blx r1` + member +0x13c8; range strings `UnitGroup \| NGWordList \| gMarkerStatic` |
| 0x806848 | online-nex | worker | B | votes online-nex:3 vs 1s (3.0x); vector trio ed91 0a10/1a11/2a12 stored ed8d 3a1c/4a1d/3a1e; bl 0x2332ac; callees 0x806094/0x8098b4/0x8059e4/0x809bc0 |
| 0x11e32d4 | monster-em | orchestrator | B | votes monster-em:9 vs quest:5 (1.8x); id-driven bl 0x2864e0 (r1=39)/0x282870 (r1=125); `ldr r1,[r0,#624]; blx r1`; 21 callees 0x28xxxx-0x2axxxx |
| 0x732d6c | quest | orchestrator | B | votes quest:18 vs otomo-ot:5 (3.6x); unrolled 8× `bl 0x65cbc4` with r1=0..7; 22 callees |
| 0xb6b9e4 | audio | orchestrator | B | votes quest:9/save-data:4 overridden by range strings `adpcm \| opus`; stream reader: guards [r5,#164]/[r5,#104], `ldr pc,[r0,r0,lsl r1]` codec dispatch (0xb6ba2c), cursor fields +164/+168/+172 with bl 0x13efe30 copies (mid-range 0xb6bf00); 13 callees 0xb697cc/0xb6a1b0/0xbc8578/0x82a4c8/0x838024 |
| 0x487530 | weapon-wp | orchestrator | B | votes monster-em:23 overridden by class-inventory uShellPlw13_101/uShellPlw14_000/001; bl 0x4a2304 → `add r5,r4,#0x1378; bl 0x53aa70`; bl 0x4a3164(0,-1) + vtable+64; 22 callees incl bl 0x7aedcc |
| 0x9a4b88 | quest | orchestrator | C | tie votes quest:4 = render-gfx:4 (+monster-em:2); free loop `mov r7,r1,lsl #6; ldr r0,[r6,r7]; bl 0x887660; str r5,[r6,r7]; sub r7,#64`; cache `ldr r0,[r4,#828]; cmps r0,r9`; GOT 0xe9ddd8; 10 callees |

## Summary

- Total: 60 (all rows above, file order).
- Confidence: A=0, B=52, C=8. No A rows: per region rule (Main, from slice-08 review) each `===` vaddr is a REGION and conf=A requires the string/primitive to be used inside the real function at that vaddr — no slice head or disasm window shows that here. Class-inventory/seeds-class.txt names applied only as B-grade overrides.
- Labels: quest 29, monster-em 12, render-gfx 4, online-nex 3, weapon-wp 2, audio 2, physics-math 2, otomo-ot 2, player-pl 2, ui 1, unknown 1, item 0, save-data 0 (= 60). Seed corrections: 0x13fe88 weapon-wp (sEquip), 0x317a70 player-pl (uPlWeaponPreview).
- Roles: judged on the full region (aggregated callees): orchestrator 38, worker 17, leaf 1 (0x13e4534, no calls in range).
- C rows (8): 0x51a854, 0xa94948, 0x13e4534, 0xa4c2b4, 0x92f3dc, 0x71180c, 0x9b309c, 0x9a4b88 — all split/tie votes or no clue; labels follow top vote (0x13e4534 unknown).
- MCP disasm used on 3 functions only (0xce7af8, 0xb6b9e4 + one mid-range window each; 2 earlier calls hit wrong addresses and were discarded). No code written, no game/emulator run.

审查后（DsvB3r07，修正后接受）：conf A 0 / B 52 / C 8（共 60）；role orchestrator 39 / worker 12 / leaf 9（11 行角色已改）。`unknown` 1 行计为未覆盖。
