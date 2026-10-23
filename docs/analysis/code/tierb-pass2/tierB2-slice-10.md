# Tier B pass2 — slice 10 (120 functions)

Source: `.tmp/mhgu/tierB2/slice-10.txt`. Rows are appended in file order, 30 functions per flush.
`role` follows callee count of the block: leaf=0 calls, thunk=<=4 insns and 0 calls, orchestrator=>=8 calls, worker=rest.

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x3d8a0 | audio | worker | B | callees all in 0x39c660-0x39d8d8 cluster; body loops `cmp r8,#4 / bhi` over twin field blocks (r1+4..+20 and r2+4..+20) = 5-entry per-element pass; votes audio:3 quest:1 |
| 0x7d9bc4 | physics-math | worker | C | only callees are helper 0x13efddc plus 0x8098b4; whole prologue is VFP (ed95/ee3x coproc loads) = matrix/vector math; votes give no usable subsystem |
| 0xc235cc | render-gfx | orchestrator | B | 13 callees all inside 0xc17bb0/0xc1ef38/0xc1bf24/0xc47f50/0xc1c2e0 render cluster; gates on [r5,#228] and [r5,#608]; votes render-gfx:11 |
| 0xc589e8 | render-gfx | orchestrator | B | 11 callees 0x87ff38/0x86a438/0x882674/0xbd2adc/0x882760; accesses [r10,#4] then `movw #0x1044` object; votes render-gfx:10 |
| 0xcf0b0 | quest | worker | B | 6 callees incl 0x7aa47c singleton lookup + 0xda0cc; block entry is `str r1,[r0,#4]; bx lr` setter stub, later vtable dispatch via [r0,#60]/[r0,#24]; votes quest:6 |
| 0x543b34 | quest | orchestrator | B | 16 callees (0x91c560/0x91c79c/0xa47950/0xa3682c/0x7aedcc); block starts `bx lr` + `b 0x7af3c4` then repeated `ldr r0,[pc]; bl 0x7aa47c; ldr r3,[r1,#28]; bx r3` vtable thunk cluster; votes quest:12 |
| 0x5aec90 | otomo-ot | orchestrator | B | 15 callees 0x56d97c/0x56da30/0x56e528/0x56e808/0x54533c (0x56xxxx cluster); entry `ldr r0,[r0,#76]; bx lr` getter, rest destructor stubs zeroing +0x4c/+0x54; votes otomo-ot:11 |
| 0xb2ec4c | quest | worker | B | 4 callees; forwards one arg to the virtual `[vtable+36]` of objects at [r4,#8]/[r4,#12]/[r4,#16] = broadcast to sub-objects; votes quest:4 |
| 0x475850 | monster-em | orchestrator | B | 16 callees 0x47c68c/0x47c6c0/0x4a1b6c/0x4a2f14/0x4a3060 (0x4axxxx enemy cluster); votes monster-em:13 |
| 0x7e8828 | physics-math | worker | B | 4 callees incl 0x808fe8; prologue VFP (ed94/ee3x) loading matrix quads from r4 then 3x3 ops = transform math; votes quest:3/monster-em:1 conflict, structure wins |
| 0xb49090 | quest | orchestrator | B | 14 callees 0x8260d4/0x82710c/0x826130/0xbdc248/0xb0b26c; entry scans array at [r0,#116], count [r0,#120], stride 48; votes quest:6 (render-gfx:4 audio:3 minority) |
| 0xa53a18 | save-data | orchestrator | B | repeated `ldr r0,[pc]=0xde5488` then `add r1,r4,#208/#224/#168/#276/#308/#340` fed to 0xba2544/0xba28c4/0xba20d0 = field-by-field serialization of one object; votes quest:8/render-gfx:4 |
| 0x5e635c | quest | orchestrator | B | 9 callees 0x56e808/0x56e528/0x55bc4c/0x57033c/0x56de60; issues bl 0x56e808(rd,13,3) and reads [r5,#76] vtable +0x24; votes quest:5 |
| 0x72884c | quest | orchestrator | B | 9 callees 0x19aba8/0x146408/0x13efe3c/0x65cb3c; copies into object+#0x59c with `mov r2,#42` and 0x13efe3c = fixed-size name copy; votes quest:9 |
| 0x11f605c | render-gfx | orchestrator | B | 22 callees 0x2a6760/0x282fd8/0x2a8d10/0x2c1960/0x283238 (0x2axxxx cluster); packs bytes at #0x2749/#0x274a into a handle; votes render-gfx:12 monster-em:9 |
| 0x13aa228 | online-nex | orchestrator | B | 20 callees 0x13a0a50/0x13a347c/0x13a9c98/0x13a9a9c/0x13b3054 plus self-recursion; state gates on [r4,#4],[r4,#600],[r4,#604],[r4,#608],[r4,#668]; votes online-nex:16 |
| 0x42d5bc | monster-em | orchestrator | B | 15 callees 0x4a1b6c/0x4a2304/0x4a1ba4/0x42dd74 plus self-recursion; `movw r0,#0x1644` sub-object fetch then 0xc1660; votes monster-em:14 |
| 0x4706b8 | monster-em | orchestrator | B | 11 callees 0x4a30dc/0x4a1b6c/0x4a2ed0/0x4a24b8; early-out on byte [r1,#0x15d0]==5 = AI state machine step; votes monster-em:11 |
| 0x70ac34 | quest | orchestrator | B | 17 callees 0x148340/0x143894/0xdb568/0x70153c/0x560ef0/0x55bc7c; votes quest:12 otomo-ot:4 |
| 0x525040 | quest | worker | B | 1 callee only (0x39bd1c); `cmp r1,#15 / bhi` plus PC table at 0x52506c (16 entries) = switch dispatch; sole callee is quest |
| 0x648d10 | quest | worker | C | 4 callees 0x276278/0x56e538/0x54533c/0x54e344; global 0x11f0054 chain then virtual [vtable+1856]; votes tie quest:2 otomo-ot:2 |
| 0x7cce8c | physics-math | worker | C | single callee 0x7cd640; body is VFP transform sequence (edd7/edd6/ed97 load pairs); votes quest:1 only, structure suggests math helper |
| 0x806094 | physics-math | worker | C | only callee 0x13efddc (runtime helper), no subsystem votes beyond monster-em:1; whole block VFP arithmetic |
| 0x16b15c | monster-em | orchestrator | B | 22 callees 0x17260c/0x169328/0x16ba4c/0x16bb38/0x112863c/0x16cf28; list ptr [r4+#0x2020] and globals 0x16cdbdc/0x16cda14; votes monster-em:18 |
| 0x274534 | quest | orchestrator | B | 8 callees 0x1ccc74/0x26e50c/0x26fddc/0x275a68; installs vtable (`add r0,#8; str`) at +0x96fc then repeatedly 0x26e50c on movw sub-objects = destructor; votes quest:4 monster-em:3 |
| 0x56200c | quest | worker | B | 5 callees; constructs into r0+#0x202 via 0x7ca420(base+#0x26e, -1, len 27) = bounded ctor; votes quest:3 monster-em:2 |
| 0x5d2a80 | otomo-ot | orchestrator | B | 15 callees 0x56dc28/0x54533c/0x5d0fb4/0x56ea08/0x56fc28; releases [r4,#36] against handles #48/#40/#44/#52 through 0x54533c; votes otomo-ot:10 |
| 0xb47160 | quest | orchestrator | B | 12 callees 0x7bb3ec/0x7bb408/0xc8a4b8/0x7bb7b8/0xb47160(self); guard on [r4,#92], virtual call [vtable+16] with stack string; votes quest:10 |
| 0xa1f704 | quest | worker | B | 7 callees 0xa1feb0/0xa1ffac/0xc8f718/0xc8ea30; installs vtable (`add r0,#8; str [r9]`) then frees array [r9,#160] via -8/-4 headers = destructor; votes quest:6 |
| 0xb7efd0 | quest | worker | B | 7 callees 0x8871d8/0x887100/0x8870b8/0xb7f77c; stores inline literal ptr built from 0xb7f0d8 into [r0] = ctor name/vtable init; votes quest:6 |
| 0x52bb94 | quest | worker | B | 3 callees 0x2b908/0x7aa47c/0x7bb638; block entry is `b 0x2b908` tail-jump then 0x7aa47c singleton + virtual [r1,#52]; votes quest:3 |
| 0x5796bc | ui | orchestrator | A | strings `cUIOComLowerButtonList`; callees include 0x7aedcc (class registration) and 0x666908/0x666970/0x666c18; writes id table 1..9 into [r4,#48]..[r4,#76]; votes quest:10 otomo-ot:8 |
| 0x930730 | quest | orchestrator | B | strings `mpResource` / `resource`; 17 callees 0x887660/0x8879b4/0x887a24/0xb47b1c/0xb47160/0x930ed8; walks [r4,#68] array, count [r4,#56]; votes quest:12 render-gfx:3 |
| 0x4f2880 | quest | worker | B | 3 callees 0x7bb638/0x7aa47c/0x8283a8; zeroes 7 stack slots then alloc and plants inline literal 0x1075d4b at [r0], [r0,#12]=r10+4 = object factory; votes quest:3 |
| 0x68916c | otomo-ot | orchestrator | B | 12 callees 0x65cb3c/0x65e5bc/0x65f270/0x65f118/0x65f190/0x54f260/0x3df924; `cmp r1,#9 / bhi` + PC table at 0x68919c = 10-way switch; votes otomo-ot:8 quest:4 |
| 0x76dc98 | quest | orchestrator | B | 22 callees 0x70e7b0/0x54ed74/0x26e354/0x76e43c/0x76eb4c; ctor: bl 0x70e7b0(17,18) then vtable install and 0x54ed74 on #192/#228/#264/#300/#336/#372; votes quest:15 |
| 0x9b9e0c | monster-em | orchestrator | B | 8 callees 0x9b6720/0x9b598c/0x9b62e0/0x9b5df0/0x9b6660/0xc08100; resource chain [r4,#244]->[r0,#144]->[r0,#104] and [r4,#516]; votes monster-em:5 render-gfx:3 |
| 0xa4a388 | quest | worker | B | 2 callees 0xa4764c/0x7bb638; ctor writing literal from 0xa4a94c, `movw #0xc/movt #0x80` size tag, then fields [r0,#4..#28]; votes quest:2 |
| 0xa727c0 | render-gfx | worker | B | 5 callees 0xaed74c/0xaf7958/0xafb2bc/0x9bd8e0; reads ldrh [r10,#212], [r5,#124], bits [r2,#188], `tsts r6,r3,lsr#16` and movw #0xffff masks = draw/flag marshalling; votes render-gfx:3 |
| 0x273be0 | monster-em | orchestrator | B | 19 callees 0x887810/0x26e354/0x1ccc44/0x4d31ac/0x26fde8/0x1cd470; ctor installs vtable +8 then resets sub-objects at #124, #0x5dc, #0x109c, #0x15fc; votes monster-em:12 |
| 0x45df70 | monster-em | orchestrator | B | 17 callees 0x4a1b6c/0x4a2ed0/0x4a2fe4/0x4a2000/0x539f4c/0x53a058/0x280f28; dispatch on r1 in {0,1} with sub-objects at #0x1010/#0x1014/#0x1018; votes monster-em:16 |
| 0x121bd7c | quest | worker | B | 6 callees 0x122298c/0x1222774/0x122084c/0x1220698; validation: r5!=0, r6<=4, checks [r5,#28]/[r5,#12]/[r5,#0] and [r4,#4]==0x29a before returning -1; votes quest:6 |
| 0x4276c | monster-em | worker | B | 6 callees 0x32a000/0x32a400/0x1819b8/0x276278; VFP block calling virtual [vtable,#212], then 0x32a000/0x32a400 pair and byte [r4,#448]; votes monster-em:3 quest:2 kernel-os:1 |
| 0x432574 | monster-em | orchestrator | B | 13 callees 0x433198/0x4338c4/0x43b870/0x433b68/0x4a2744/0x539f4c; `cmp r1,#3 / bhi` + PC table at 0x4325b4 = 4-way state switch; votes monster-em:13 |
| 0x67ac08 | quest | orchestrator | B | 23 callees 0x3687c/0x36380/0x26e50c/0x613d24/0x6bb820/0x65cb3c; destructor: vtable from 0x11c5cc8, frees [r4,#112] via virtual+4, then global teardown; votes quest:19 otomo-ot:10 |
| 0x675dc4 | quest | orchestrator | B | 23 callees 0x25e378/0x3f8398/0x2603fc/0x4aff78/e92a8/e9e8c; compares [r7,#136] against 0x3f8398 result after 0x25e378 bounds check; votes quest:22 |
| 0x9c6ec0 | render-gfx | worker | C | 6 callees 0x9c5440/0x7aa47c/0x29d48/0x72ea8; stores [r4,#84]=arg, [r4,#116]=[r5,#1168], then allocates `mov r2,#16`*count and `mov r1,r1,lsl #4` array; votes tie quest:2 render-gfx:2 monster-em:2 |
| 0x38eae4 | monster-em | orchestrator | B | 15 callees 0x3b9870/0x3b9ff8/0x3ba100/0x3bcf68/0x3ad924/0x3b5bb4; globals 0x14aa2e0/0x14aa224/0x14aa260 and [r5,#224] id compare; votes monster-em:6 quest:5 |
| 0x75db78 | quest | orchestrator | B | 18 callees 0x70e7b0/0x54ed74/0x70e81c/0x75e308/0x54fe8c; ctor bl 0x70e7b0(15,13) + vtable + 0x54ed74 init at #148/#184/#220/#256/#292/#328/#364; votes quest:14 |
| 0xa13524 | quest | worker | B | 3 callees 0x7aa47c/0x7af53c/0x7af518; pops element [r9,#248][[r9,#256]-1], VFP compare vs [r8,#8]/[r9,#224] then 0x7af53c/0x7af518 re-sort; votes quest:3 |
| 0x14bba8 | quest | orchestrator | B | 9 callees 0xdaba4/0x3f8390/0x12806c/0x1284cc/0x88784c; bitfield rewrite `and #0xffe0 / orr #6` at [r4,#4], id [r4,#22] compared to 0x161/0x162; votes quest:5 |
| 0x2fd6e8 | monster-em | worker | B | 3 callees 0x27bcd0/0x2864c4/0x27c8f8; gated on 0x27bcd0==1, probes ids 225/0x10d/0x11f via 0x2864c4 then [r4,#176]==54; votes monster-em:2 audio:1 |
| 0xa9ff8c | render-gfx | orchestrator | B | 19 callees 0xa5ca24/0xa69d00/0xa6b824/0xa6c268/0xaed74c/0xaf938c/0xaa0bc4; [r5,#52] cache then 0xa69d00 vertex path; votes render-gfx:16 |
| 0xb5c878 | quest | orchestrator | B | 12 callees 0xb5b97c/0xb5bab0/0xb5c288/0xb5bbec/0x82772c/0xb5d028; iterates [r10,#112] with count ldrh [r10,#116], strides 68 and 16; votes quest:11 |
| 0x12072a8 | render-gfx | orchestrator | C | 22+ callees 0x11e20f4/0x282fd8/0x281b4c/0x2aae18/0x44a6d0; same byte-pack idiom as 0x11f605c (movw #0x274a/#0x2749), zeroes [r4,#0x2830], stores 4.0f (0x40800000) at #0x16ec; votes tie monster-em:10 render-gfx:10 |
| 0x749c20 | quest | orchestrator | B | 23 callees 0x7549ac/0x746d34/0x7569a8/0x65f808/0x65cc0c; `cmp r0,#7 / bhi` + table at 0x749c68 = 8-way switch on [r4,#76]; votes quest:29 |
| 0xc13a00 | render-gfx | orchestrator | B | 9 callees 0xba5770/0xba57dc/0xb1bdec/0xc9b52c/0xb1e33c/0xb1d04c; handle search -1 checks (`cmn r9,#1`) then +2 index fixup; votes render-gfx:8 |
| 0x1b90a8 | quest | orchestrator | B | 13 callees 0x1c9604/0x25d6bc/0x1ba4a8/0x5d8a7c/0x5d8c34/0x56df00; global 0x1681794 lookup, element stride 16 (`r1,lsl #4`), bytes [r6,#160]/[r6,#192]/[r6,#188]; votes quest:10 |
| 0x318800 | monster-em | worker | B | 7 callees 0x31acd4/0x3f8344/0x501310/0x4913bc/0x500f7c/0x318f84; switch on [r4,#92] in {0,1,2} plus mask `and r0,r0,#7` on [r4,#52]; votes monster-em:4 render-gfx:3 |
| 0x362438 | quest | worker | A | strings `mRewardTable[0]`/`[1]`/`[2]` and `resource`; frees [r4,#24]/[#28]/[#32] via 0x887660 then installs vtable from 0x14da35c = reward-table destructor; votes quest:4 |
| 0x40cbec | monster-em | orchestrator | B | 17 callees 0x1838fc/0x4a1b6c/0x4a24b8/0x4efb98/0x43bcc4/0x7aa47c; builds 32-byte stack record at sp+32 from [r4,#64]/[r4,#72] and [r4,#0x1000]; votes monster-em:14 |
| 0x4123e0 | monster-em | orchestrator | B | 10 callees 0x4a1b6c/0x4a2304/0x4a2a50/0x43b8d8/0x43bcc4; gate on byte [r6,#0x1628], reads coords [r5,#0x1428]/[r6,#0x160c]; votes monster-em:10 |
| 0x4f3024 | quest | worker | B | string `nAreaConnect::AreaPosBase`; 6 callees incl 0x8261fc and 0x2b8f0; byte-stream read via [r5,#8]/[r5,#12]/[r5,#16] and virtual [vtable,#52] = area-connect record read; votes quest:5 |
| 0x60af6c | quest | orchestrator | B | 23 callees 0x56df00/0x54533c/0x56e62c/0x264e7c/0x602a54/0x550ad0; builds 308-byte frame, reads globals 0x1234238/0x122dbf4/0x122ddac; votes quest:13 otomo-ot:12 (close) |
| 0x7192f8 | quest | orchestrator | B | 22 callees 0x718a0c/0x729008/0x718934/0x7290c4/0x72874c/0x5530b8; `cmp [r10,#128],#4 / bhi` + table at 0x719344 = 5-way switch; votes quest:17 |
| 0x89cc44 | monster-em | orchestrator | B | 9 callees 0x7cc110/0x89d3c8/0x89f884/0x89fca0/0x8a0a7c/0x8a2154; VFP block over [r5,#88]->[r0,#116] and [r5,#96][idx], flag byte [r5,#141]; votes monster-em:5 |
| 0x9ca468 | monster-em | orchestrator | B | 9 callees 0x7cc110/0x9cabec/0x9ccca4/0x9cd3fc/0x9cf574/0x9cae48; identical shape to 0x89cc44 with [r5,#136]->[r0,#116], [r5,#144][idx], byte [r5,#189] = sibling class; votes monster-em:5 |
| 0x778384 | otomo-ot | orchestrator | B | 22 callees 0x70e7b0/0x54ed74/0x165888/0x165e08/0x778b04/0x60f98c/0x5c4cb4; ctor bl 0x70e7b0(8,15)+vtable then 0x54ed74 init at #60/#96/#132/#168/#204/#240; votes otomo-ot:20 |
| 0xa6785c | render-gfx | worker | C | 5 callees 0xcb4760/0xa68fe0/0xa67fdc/0xa68468/0xa689cc; tests bit #134217728 of [r3,#280] and bits 24+ of [r0,#80], copies [r0,#24]+#48/#52/#56 and floats into r1; votes tie monster-em:2 render-gfx:2 |
| 0x4194c0 | monster-em | orchestrator | B | 19 callees 0x43b488/0x43b4bc/0x43bcc4/0x4a1b6c/0x4a2a50/0x7aa47c; block entry `b 0x43b488` tail-jump then vtable-thunk stubs; votes monster-em:17 |
| 0x9e1fd0 | quest | orchestrator | B | strings `mpResource` / `resource`; 14 callees 0x887660/0x8879b4/0x9f481c/0x9f51f8/0x9f52e4/0x9f4e20; entry `bx lr` then dtors freeing [r4,#100] and tail `b 0x8879b4`; votes quest:9 |
| 0x1e1dc | physics-math | worker | C | 3 callees 0x1ebe8/0x13efde8/0x13efdf4; pure VFP member copy [r4,#0x40]=[r5,#0x20], #0x44=#0x24, #0x48=#0x28, #0x60=#0x20 = transform struct copy; votes monster-em:2 |
| 0x3fd3bc | monster-em | worker | B | 7 callees 0x4a1b6c/0xc1708/0xc1660/0x2325a0/0x3fdb34; copies [r4,#64]/#68/#72 to #0x1620/#0x1624/#0x1628 and zeroes #0x162c; votes monster-em:6 |
| 0x4e34a4 | otomo-ot | worker | B | 6 callees 0xb6d72c/0xbf1364/0xbf16d4/0xbf15ac/0xbf1734; `cmp r10,#4 / bhi` + table at 0x4e34e4 (5 targets, e.g. `add r0,r5,#6784`, `movw #0x1a84`); votes otomo-ot:4 |
| 0xb4def0 | render-gfx | orchestrator | A | strings `rtex` (texture extension) and `_-0123456789` (name charset); 14 callees 0xb0804c(alloc 528,16)/0xb09098/0x83e7f8/0xb51b00/0xb5136c; switch on r1 in {1,2,6} builds resource record; votes quest:7 render-gfx:5 save-data:2 |
| 0x5ced3c | quest | orchestrator | B | 21 callees 0x54533c/0x56e528/0x56e808/0x56e62c/0x56fde0/0x5c55b0/0x550388; flag test `tst [r4,#92],#2` then bl 0x54533c(5,0/1) and tail `b 0x56e528`(22,0); votes quest:13 |
| 0x2a440 | quest | worker | B | string `333?`; 5 callees 0x1c190/0x7aa47c/0x1bf08/0x14770; entry writes [r0,#1076]/[r0,#1080] then `b 0x1c190`, later `ldr [r0,#1076]; cmp #18 / bhi` switch; votes quest:3 |
| 0xbb828 | monster-em | orchestrator | B | 13 callees 0x27c6f8/0x282f58/0x30218c/0x2a702c/0x11290d0/0xc6be4; indirect switch on arg r4 in {2,3}, pointer fixups from [r5,#0]/[r5,#4]; votes monster-em:8 |
| 0x1979b0 | save-data | worker | A | calls 0x3df2a8 (known save primitive) twice with len 136 and 0x3df22c(stream,32) in a 94-iteration loop filling array at obj+#156 = save block read/write; votes otomo-ot:5 |
| 0x825964 | quest | orchestrator | B | 12 callees 0x823ac8/0x82442c/0x8251d0/0x825390/0x825550/0x82579c plus self-recursion; gate 0x823ac8==1, byte [r4,#24], counter [r4,#28], virtual [vtable,#24]; votes quest:11 |
| 0xa425d4 | quest | worker | C | 4 callees 0x13f00dc/0xba1f08/0xa537ac/0xa3d8fc; long compare chain against 32-bit constants 0x4d494e40/0x52544e42/0x50534943/0x4e414d49 built by movw/movt = ID dispatcher; votes quest:2 |
| 0x78cae4 | quest | orchestrator | B | 17 callees 0x3e6434/0x78ded0/0x78e514/0x78d8b0/0x54f260/0x65e134; global 0x10ac3c4 with flags [r0,#104]/[r0,#105], sets [r4,#88]=5; votes quest:12 |
| 0xc2b080 | render-gfx | orchestrator | B | 10 callees 0xc47f50/0xc1703c/0xb798dc/0xb79e40/0xb79b00/0xc1b778/0x7f2d74; reads [r1,#232] then [r9,#28]/[r9,#32]/[r9,#36] and [r10,#248]; votes render-gfx:7 |
| 0xb50214 | quest | worker | B | 7 callees 0xb4fdf4/0xb4fffc/0x8870b8 plus self; adds base [r6,#100] to fields [r5,#20]/[r5,#0]/[r5,#12] = pointer relocation pass; votes quest:7 |
| 0x1216f80 | monster-em | orchestrator | B | 18 callees 0x27bcd0/0x285e2c/0x282f58/0x27e608/0x2831e0/0x28813c/0x2fac84; gate 0x27bcd0==1 then virtual [vtable,#376] and 0x282f58(...,#256,0); votes monster-em:7 |
| 0xb5608 | monster-em | orchestrator | B | 9 callees 0x4ff9c0/0x3ce060/0xbef30/0xbc8b0/0x3f8344/0xc14dc; global 0x178363c lookup keyed by byte [r8,#0x1054], then [r5,#104] sub-object; votes monster-em:6 |
| 0x8a6ec8 | quest | orchestrator | B | 17 callees 0x9e1274/0x9e1044/0x9e12ac/0x9e107c/0x9dcdf0/0x9e14a8/0x7aedcc; 0x9e1274(sp+64, obj+#464) and 0x9e1044(sp+48, obj+#624) = matrix get/set pairs; votes quest:15 |
| 0xc06088 | quest | worker | B | 6 callees 0x88784c/0x7aa47c/0x7aedcc/0x7bb638/0xc07ef8; entry installs vtable from 0xc3f088 (+8), zeroes global 0xc3ebd0, then `b 0x88784c` = destructor stub; votes quest:4 |
| 0x770a44 | quest | orchestrator | B | 23 callees 0x773cf4/0x774320/0x773c68/0x76f8ec/0x76ff9c/0x770930; `cmp r1,#3 / bhi` + table at 0x770a74, then flag tests on [r9,#76] (bit 4096/8192/16384); votes quest:25 |
| 0x815814 | online-nex | orchestrator | B | 23+ callees 0x81f664/0x81043c/0x80c958/0x815f74/0x81600c/0x8172d8/0x12297ec; `movw #540 / mla r5,r8,r0,r10` element stride and stores at #0x21ee0; votes online-nex:29 |
