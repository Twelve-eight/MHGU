# Tier B pass3 - slice-12a

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x479af4 | monster-em | orchestrator | B | votes [monster-em:20] unanimous; callee cluster 0x4a2d60/0x4a2e90/0x4a1d34/0x4a24b8/0x4a30dc shared with 0x41e254 (monster-em:15) and 0x430dcc (monster-em:18); state switch cmp r1,#6 at 0x479b14 |
| 0x576350 | otomo-ot | orchestrator | C | (审查 DsvB3r12：1.4x) votes otomo-ot:7 top; callees 0x60097c/0x600e88/0x56dd44/0x570710 overlap 0x563e7c (otomo-ot:15); 0x54f260 shared with 0x778e84/0x77a8f0; state-range checks cmp r5,#2 / cmp r0,#3 |
| 0x778e84 | otomo-ot | orchestrator | C | (审查 DsvB3r12：1.33x) votes otomo-ot:12 top; callee cluster 0x65d9e8/0x65cbe8/0x65cb3c/0x65e5bc/0x65e794/0x65efcc plus globals [0x10c047c]+0x6bfc/0x6c34 identical to 0x77a8f0 (otomo-ot:14); 4-way switch [r4,#5]<=3 |
| 0xc145e0 | render-gfx | worker | C | (审查 DsvB3r12：4 bl) votes tie quest:3/render-gfx:3/audio:1; destructor chain: 6x{count @[r11+260], vtable-dtor blx [v+4] at 0xc14634, global free via 0x7aa47c + blx [v+52] at 0xc14658-0xc14668, zero [r11+264]}, then pools [+380/384/392] and [+400+] same; callee 0xc1760c = fn-pointer dispatcher over fields +88/140/144 (render-style teardown); C on tie, render-gfx by teardown pattern |
| 0x41e254 | monster-em | orchestrator | B | votes monster-em:15 vs quest:1 (15x); 0x4a1c78/0x4a1d34/0x4a1e50/0x4a2304 cluster + float helpers 0x13efdxx same as 0x479af4/0x430dcc |
| 0x563e7c | otomo-ot | worker | B | (审查 DsvB3r12：5 bl) votes otomo-ot:15 vs quest:5 (3x); callees 0x5c4fd8/0x5c5074/0x5c5484/0x5c54bc + 0x60097c/0x56dd44/0x570710; 0x7aedcc/0x7aa47c callees |
| 0x7b7f60 | physics-math | leaf | B | no votes; 50-entry jump table (0x7b7f94-0x7b805c) dispatches on byte operand to inline VFP opcode blocks: 0x7b8330-0x7b8378 vcvt/vadd/vsub/vcmp on scalar pairs, results stored str [r3, r0, lsl #2] into float arrays [r0,#12]+[r0,#44] at 0x7b8314; zero bl calls - pure float opcode interpreter |
| 0xb61bfc | quest | leaf | B | (审查 DsvB3r12：0 bl；标签待复核（rSoundCurveSet 提示 audio）) votes quest:3 vs audio:1 (3x); VFP float-array loop over [r0,#116] indexed by ldrsh [r1,#6]; region strings 'scsr'; callees 0x7aedcc/0x7bb638/0x7aa47c |
| 0xbfa494 | quest | orchestrator | B | (审查 DsvB3r12：27 bl) votes quest:2 sole top (2 >= 1.6*0); ctor-style field reset 0/-1/1 pattern str [r4,#8..#68] at 0xbfa4b0-0xbfa4e4; callees 0x870658/0x872604 |
| 0x136a380 | online-nex | worker | B | votes online-nex:2 sole top; real start 0x136a384 (b over data); byte-scan loop ldrb [r0,r1] cmp vs *(0x4dde6c) at 0x136a3cc-0x136a3d4; magic movw/movt 0x7ffff at 0x136a3b0; callees 0x13f0118/0x13f0eec |
| 0x5f3b0 | otomo-ot | orchestrator | C | votes otomo-ot:6 vs monster-em:4 (1.5x, below 1.6); mixed clusters 0x3a5ed0/0x3a4c0c/0xba8e0 overlap 0x9dd40 (monster), local 0x5fa14/0x5fcb4/0x68984/0x6b3fc; flag [r9,#0x2594] gate |
| 0x9dd40 | monster-em | orchestrator | B | votes monster-em:13 vs otomo-ot:2 (6.5x); shared 0x27bcc0 with 0x479af4, 0x3a8d68 cluster, 0xbb75c/0xbad44; ret-check bl 0x81c6c then field tests [r0,#1248]/[r0,#1156] |
| 0x21f408 | quest | orchestrator | B | votes quest:9 vs otomo-ot:5 (1.8x); 0xb21388/0xb215b4/0xb219cc/0xb21a04/0xb21a64 cluster; switch [r5,#8]<=5 (6 cases) writing byte pairs to global [0x161c914] at 0x21f44c-0x21f464 |
| 0x4fddec | otomo-ot | orchestrator | B | votes otomo-ot:8 vs quest:3 (2.7x); vtable call blx [r0,#40] at 0x4fde0c; global byte [x+72] mask at 0x4fde24; local callees 0x4fe4c0/0x4fe9c0/0x4feb40/0x518b70/0x518bac |
| 0x569c40 | quest | orchestrator | C | (审查 DsvB3r12：23 bl) votes quest:3 vs otomo-ot:2 (1.5x, below 1.6); switch [r8,#196]-5 (10 cases); 0x56e6fc shared with 0x563e7c is single overlap; callees 0x55bba0/0x56ea08/0x560900/0x547174 |
| 0x19fbd0 | ui | leaf | C | (审查 DsvB3r12：只有区段级类名字符串；0 bl；标签冲突待复核（首位票 quest）) region strings 'cKitchenListMenu'; list-iteration loop calling vtable method [r0,#24] via blx at 0x19fbec/0x19fbfc and [r0,#56] at 0x19fc24 over [r4,#12]/[r4,#16] bounds |
| 0x1ce700 | quest | orchestrator | B | (审查 DsvB3r12：24 bl) votes quest:3 sole top; struct init [+612..640] + stores [+624/632/636/680]; ctor-style bl 0x54edec (2,1,0) shared with 0x778e84/0x77a8f0 cluster |
| 0x430dcc | monster-em | orchestrator | B | votes monster-em:18 sole top; VFP vector prologue ed92/ed91/ed93 loads; local 0x43144c/0x431a70/0x431eb0/0x432134/0x432574/0x432d10/0x43bf1c cluster + 0x4a2304/0x4a1ba4/0x4a23dc as 0x41e254 |
| 0x77a8f0 | otomo-ot | orchestrator | C | (审查 DsvB3r12：1.4x) votes otomo-ot:14 top; same 0x65d9e8 first-callee + 0x65cbe8/0x65cb3c/0x65e5bc/0x65e794/0x65efcc/0x65e67c cluster and globals 0x6bfc/0x6c34 as 0x778e84; 0x54ecc0/0x54edec/0x54ee34/0x54f260/0x54fbb0 cluster |
| 0x7f5cec | physics-math | worker | B | (审查 DsvB3r12：标签待复核（票为 monster-em:1）) structural: region-wide callees only 0x13efddc (float helper); VFP-only 3-float vector ops vldr s4/s3/s5 from [r5,#0/4/8] at 0x7f5d08-0x7f5d10, table-indirect pointer *(0x10434e8) then vldr s1/s0/s2 [r0,#4/0/8]; votes monster-em:1 only |

## Summary
- Conf A: 0, Conf B: 18, Conf C: 2 (0xc145e0 render-gfx, 0x5f3b0 otomo-ot, 0x569c40 quest) - total 20.
- Labels: monster-em 4, otomo-ot 6, quest 5, online-nex 1, render-gfx 1, physics-math 2, ui 1.
- Roles: orchestrator 12, worker 7, leaf 1.
- Note: intermediate file write by a sibling truncated this report mid-pass; final full version rewritten above in one pass.

审查后（DsvB3r12，10 PASS / 10 FAIL）：conf A 0 / B 13 / C 7（共 20）；role orchestrator 13 / worker 4 / leaf 3。
