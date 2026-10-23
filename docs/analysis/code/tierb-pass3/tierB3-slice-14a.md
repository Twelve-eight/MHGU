# Tier B pass3 - 14a

## Confirmed
- [A] 0x1b5580 / 0x1c26bc: class registration (bl 0x7aedcc) inside the real function + class-inventory registrar mapping (cMonNyanProcResultAnim / cMonNyanReward).
- [A] node scan of main.140.flat.bin (vaddr=flat-0x100): real-function bl counts per row below; role derived from real-fn bl count.
- 17/20 regions carry pass2 labels (inventory/tiers.csv); 3 vote-less/weak rows grounded by node caller-scan into pass2-labeled callers.

## In progress
(none — complete)

## Unknown
- 0xb782ac: no votes, 0 bl, no strings; label quest by single caller 0xb6f170 (inside pass2 render-gfx fn 0xb6f128, a 4-arg struct dispatcher) + quest-dense 0xb7x neighborhood [B-inference].

## Rows
| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x75e308 | quest | orchestrator | B | votes quest:12 vs otomo-ot:2 (6x); real fn bl=55 (node scan); bl 0x570688 then bl 0x65ca84 x3 r1=0/1/2 + GOT 0x10e1300/0x10e16ec/0x10e1e44; pass2 quest |
| 0x12221e0 | quest | leaf | C | (审查 DsvB3r14：无票，只靠调用者推断) votes empty; real fn bl=0 (node scan); byte-field ctor/walker; both call sites 0x12213ec/0x1221400 inside pass2 quest fn 0x12213ac, all-quest 0x122x neighborhood; pass2 quest |
| 0x1b5580 | quest | leaf | B | (审查 DsvB3r14：2 条指令的 setter；注册在相邻 fn 0x1b593c) class-inventory registrar 0x1b5580->cMonNyanProcResultAnim(+XML); real fn 0x1b5588 bl=20 (node scan) incl bl 0x7aedcc class reg + bl 0x1adaec / tail-cluster 0x1b4df4 (cMonNyanProc* cluster); votes quest:7 overridden |
| 0x308b3c | render-gfx | orchestrator | B | votes render-gfx:2 vs monster-em:1/otomo-ot:1 (2x, >=1.6); real fn bl=14 (node scan); bl 0x53a058 -> str [r8,#0x13c4], float 0x10624dd3, ldrb cmp#5 -> r10=256/768 r2=0/512 r3=1000 layout consts; callees 0x953b10/0x954640/0x283060; pass2 otomo-ot (marginal) |
| 0x6bb21c | otomo-ot | orchestrator | B | votes otomo-ot:5 unanimous; real fn bl=55 (node scan); arg ldrb [r7,#4] cmp#1 dispatch, bl 0x6bae04 + 0x55bc4c/0x56ea08/0x56e6fc/0x56e530; pass2 otomo-ot |
| 0x7dc2d0 | render-gfx | worker | B | votes render-gfx:3 vs monster-em:1 (3x, >=1.6); real fn bl=5 (node scan: 0x13efddc/0x7d53b8/0x7cf934/0x7d1efc); 8 VFP loads (ed970a01..a09) + vmul.f32 math; pass2 render-gfx |
| 0xb67cf0 | quest | orchestrator | B | votes quest:9 vs save-data:2/audio:1/online-nex:1 (4.0x); real fn bl=41 (node scan); [r4,#104] state dispatch, [r4,#108] array walk step 132, callees 0x82772c/0x827cd0/0x8282cc/0x827c90 (0x82x stream cluster); pass2 quest |
| 0xb782ac | quest | leaf | C | (审查 DsvB3r14：无票，只靠邻居推断) votes empty; real fn bl=0 (node scan), 4 VFP params + [lr,#88] field, bgt 0xb78824 NaN/range guards; single caller 0xb6f170 inside pass2 render-gfx fn 0xb6f128 (4-arg struct dispatcher, stack-built args, calls 0xb748a4/0xb782ac/0xb74a8c); quest-dense 0xb7x neighborhood [B-inference] |
| 0x136cc2c | online-nex | leaf | B | (审查 DsvB3r14：thunk) votes online-nex:1; real fn 0x136cc30 bl=1 (node scan: 0x13f0eec); blx [r0,#12] then byte-scan loop vs [r0,#0] sentinel (0xffff/0x7fffff masks); siblings 0x136b5f0/0x136bb7c/0x136c6ac pass2 online-nex; Pia region 0x1311000-0x13ab000 |
| 0x13e8b58 | online-nex | leaf | B | (审查 DsvB3r14：thunk) votes online-nex:17 unanimous; real fn 0x13e8b6c bl=24 (node scan, 17 distinct callees 0x13e96fc/0x13e982c/0x13ea170); ldrb [r4,#77] gate + [r5,#5] branch; pass2 online-nex |
| 0x154d7c | quest | leaf | B | votes quest:3; vaddr = 1-insn b 0x2b908 thunk (bl=0, node scan); owner ctor fn 0x154d44 bl=1 (disasm: bl 0x2b8f0 base ctor + GOT 0x16e5b44 vtable); blx [vtable,#52] stub; pass2 quest |
| 0x1c26bc | quest | leaf | B | (审查 DsvB3r14：0 bl 序列化函数；注册在相邻 fn 0x1c2ab8) class-inventory registrar 0x1c26bc->cMonNyanReward(+XML); real fn bl=9 (node scan) incl bl 0x7aedcc class reg + 0x2b8f0/0x2b908 base ctor/thunk; body = per-class XML serializer: blx [r0,#24] writers + strb fields [r5,#28..#35] + blx [r0,#56] flush; votes quest:5 overridden |
| 0x26ae68 | quest | leaf | B | votes quest:3; vaddr = 1-insn b 0x2b908 thunk (bl=0, node scan); owner ctor fn 0x26ae34 bl=1 (disasm: bl 0x2b8f0 base ctor + GOT 0x15d13c0 vtable, 4x str zero); pass2 quest |
| 0x2f22e8 | monster-em | worker | B | votes monster-em:3 vs otomo-ot:1 (3x); real fn bl=5 (node scan: 0x27bcd0/0x2e1348/0x2864d4/0x2a702c, 0x27-0x2a em cluster); r5=r2-2 cmp#78 + 79-entry jump table (0x2f2320); pass2 monster-em |
| 0x65ce7c | quest | worker | C | votes quest:7 vs otomo-ot:6 (1.17x, <1.6); real fn 0x65ce7c bl=1 (disasm 5 insns: bl 0x65c7e8, GOT 0x11e394c -> [r0,#8]+8 store [r0,#0], [r0,#56]=0); pass2 otomo-ot |
| 0x734d74 | quest | orchestrator | B | votes quest:8 vs otomo-ot:1 (8x); real fn bl=22 (node scan); r4=r1+1 cmp#29 + 30-entry jump table (0x734da0), callees 0x1a6ec0/0x1a5bc4/0x54fe8c/0x65e5bc; pass2 quest |
| 0xbea870 | quest | orchestrator | C | votes quest:5/online-nex:1/render-gfx:1 (top >=1.6x but signals conflict); real fn bl=10 (node scan): self-cluster bl 0xbeb3e0/0xbeb504 (both pass2 quest), bl 0xbe1f0c (pass2 online-nex), bl 0xc4b798 (pass2 render-gfx); writes 1.0f/255 at obj +0x31a1c/+0x31a20; callers inside pass2 audio fn 0xbe95c4 (A) and quest fn 0xbebaf4; quest 0xbex neighborhood; top pick quest by neighborhood + self-cluster |
| 0x11fb798 | render-gfx | orchestrator | C | votes render-gfx:8 vs monster-em:8 tie (<1.6x); real fn bl=32 (node scan, 22 distinct callees 0x281a70/0x282fd8/0x2a5ebc/0x2a25a8/0x53a058/0x950bcc, 0x27-0x2c cluster); ldr [r4,#4] cmp#5 + 6-entry jump table (0x11fb7c4); pass2 render-gfx; single caller 0x11f5ba4 |
| 0x136b5f0 | online-nex | leaf | B | (审查 DsvB3r14：thunk) votes online-nex:1; real fn 0x136b5f4 bl=1 (node scan: 0x13f0eec); same byte-scan-vs-sentinel template as 0x136cc30; pass2 online-nex |
| 0x136bb7c | online-nex | leaf | B | (审查 DsvB3r14：thunk) votes online-nex:1; real fn 0x136bb80 bl=1 (node scan: 0x13f0eec); same template, str r5,[sp,#4] variant; pass2 online-nex |

## Summary
- conf: A=2 (0x1b5580, 0x1c26bc), B=15, C=3 (0x65ce7c, 0xbea870, 0x11fb798); total 20.
- role (real-fn bl count, node scan): orchestrator 10 (bl>=8: 9/14/20/22/24/32/41/55/55/10), worker 6 (bl 1-5), leaf 4 (bl 0: 0x12221e0/0xb782ac + 1-insn thunk owners 0x154d7c/0x26ae68).
- labels: quest 9, online-nex 5, otomo-ot 3 (2 via in-function class registration cMonNyanProcResultAnim/cMonNyanReward overriding quest votes), monster-em 1, render-gfx 2.
- vote ratio enforced: C where top < 1.6x second (0x65ce7c 1.17x, 0x11fb798 1.0x, 0xbea870 downgraded for conflicting callee evidence).
- pass2 prior art (tiers.csv): 18/20 rows agree with pass2 label; overrides: 0x1b5580 quest->otomo-ot (A), 0x1c26bc quest->otomo-ot (A), 0x308b3c otomo-ot->render-gfx (B, 2x votes), 0xbea870 online-nex->quest (C, neighborhood+self-cluster).
- MCP calls used: function_start x2 (batches of 10) + disasm x4 (0x1b5588/0x1c26bc/0x154d44/0x26ae34) + calls_to x1 = 7; remaining evidence from node scans of main.140.flat.bin and repo docs (class-inventory.tsv, tiers.csv).

审查后（DsvB3r14）：conf A 0 / B 15 / C 5（共 20）；role orchestrator 7 / worker 3 / leaf 10。
