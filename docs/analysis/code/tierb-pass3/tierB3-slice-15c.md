# Tier B pass3 - slice-15c

Input: `.tmp/mhgu/tierB3p/slice-15c.txt` (20 regions, 318-320 insns each). Binary: MHGU Switch 1.4.0, ARMv7, vaddr = flat - 0x100.

## Confirmed
- Slice read complete: 20 `===` regions, 0x36380 .. 0xcd29ac.
- Region 0xb2b6a8 holds several real functions (1-insn bx lr stub at 0xb2b6a8, stubs 0xb2b6ac/0xb2b700/0xb2b704, dtor at 0xb2b6c4) [A: slice head].
- Region 0x682b8 holds >=2 real functions (0x682b8, 0x68310) [A: slice head].
- 0xba67b4: region-wide `bl 0x7aedcc` callee lies outside the real function (body ends before next fn 0xba6888) — no class-registration override; label from votes + intra-function evidence [A: disasm 0xba67b4+160].

## In progress
- none

## Unknown
- none

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x36380 | quest | worker | C | [A] real fn 0x36380: dtor pattern, frees 3 ptrs at +3728/+3704/+3680 via bl 0x887660 then nulls; votes quest:2/otomo-ot:1 |
| 0x459ae0 | monster-em | worker | B | [A] fn at 0x459ae0 (push {r4,r5,r11,lr}); bl 0x4a1b6c then vtbl +440 (arg 0x20000000) and +432 (arg 16) result tests; 2 distinct bl; votes monster-em:2 top-only |
| 0x585e98 | quest | orchestrator | C | (审查 DsvB3r15c：分票 1.33x) [A] fn 0x585e98, 12+ distinct bl; per-target bl 0x13f03c + vtbl +184 ==3 checks; 100-capped accumulation via 0xe1bb0/0xe173c; quest-mgr cluster 0x56e530/0x56fde0/0x560e90 called per target; votes quest:8/otomo-ot:6 (ratio 1.33 < 1.6 -> C) |
| 0x928e10 | quest | worker | C | [A] fn 0x928e10..0x928f70 ctor: vtbl stores from literals 0xf19544/0xf0ff10, zero-inits fields, stores 1.0f at +60; 3 bl in real fn (region callee list of 11 spans later fns); votes quest:6/render-gfx:5 |
| 0xc05758 | quest | leaf | B | [A] fn 0xc05758: own vtbl literal 0xc3f974, loop releases 65 refs via vtbl+4 (blx, 0 direct bl), plus slots +260/+264; votes quest:2 top-only |
| 0xc29ff4 | render-gfx | worker | C | [A] comparator: stacks args then bl 0xc2e318, vtbl +20 call, cmps of +28 fields of two objects; votes render-gfx:3/quest:2/monster-em:1 |
| 0xcb4c10 | monster-em | worker | B | [A] fn 0xcb4c10: per-entity tick, [r4+112]->[+12]<0 check, global ref 0xb8de94, and [r1+240],#8, bl 0xb91e68, VFP state copy via r11 base; votes monster-em:2/item:1 (2>=1.6x1) |
| 0x682b8 | audio | worker | B | [A] region holds fns 0x682b8 + 0x68310; 0x682b8 leaf-ish: bl 0x3a4c0c global check then copies 4-word block from [r0+8]+4; votes audio:3/otomo-ot:1 (3>=1.6) |
| 0x409568 | monster-em | worker | B | [A] fn 0x409568 reset: bl 0x3f9670, zeros fields +0x1660..+0x1678 of returned obj, copies 3 words from global 0x142fccc; votes monster-em:9/quest:2 |
| 0x47c174 | monster-em | worker | B | [A] fn 0x47c174: counter [r4+0x15a8]++ vs global 0x13c14f0, bl 0x4a24b8, vldr [r4+0x15b0]; bls 0x4a1b50/0x4a24b8; votes monster-em:4/quest:2 (4>=3.2) |
| 0x667948 | quest | orchestrator | B | [A] fn 0x667948: queries global 0x11d141c slots 0-3 via bl 0x274ce4, counts nonzero into r6; exactly 8 bl; votes quest:5 (5>=1.6x3) |
| 0x66ace0 | quest | orchestrator | B | [A] fn 0x66ace0 ctor: vtbl literal 0x11d5b70, sub-obj inits +124/+160 via 0x54ed74, +200..+320 via 0x190764; ~50 bl ctor; votes quest:15/otomo-ot:6 |
| 0xb2b6a8 | online-nex | leaf | C | (审查 DsvB3r15c：vaddr 是 1 条 `bx lr` 桩，0 bl) [A] vaddr 0xb2b6a8 is a 1-insn bx lr stub (leaf); region also holds dtor 0xb2b6c4 (bl 0xb2082c on +0x5d8, vtbl release of +16, tail b 0xb20d00) and stubs 0xb2b6ac/0xb2b700/0xb2b704; votes tie online-nex:1/quest:1 |
| 0xb308c4 | otomo-ot | worker | B | [A] fn 0xb308c4: vtbl calls [r10]+40 and +80 on two objects, bit 0x40 test with +256 adjust; votes otomo-ot:2/quest:1 (2>=1.6) |
| 0xbeb5fc | quest | worker | B | [A] fn 0xbeb5fc dtor: bl 0xbeb3e0/0xbeb504, releases 64 slots stride 2784 via vtbl+12; votes quest:8/online-nex:2 |
| 0xc616bc | render-gfx | worker | C | (审查 DsvB3r15c：3 个 `bl 0x13efddc`) [A] fn 0xc616bc: NEON vec4 math from obj+176 area, 224-byte stack; 4 bl in body; votes tie monster-em:1/render-gfx:1 |
| 0x4fe4c0 | otomo-ot | orchestrator | C | (审查 DsvB3r15c：分票 1.20x) [A] fn 0x4fe4c0: bl 0x3a396c (11/57), builds text ids 0xac39/0xada5/0xada7/0xb4c3, then 6 sequential vtbl+48 calls with 0/1/2/3/4/5 args; 13 bl; votes otomo-ot:6/quest:5 (ratio 1.2 < 1.6 -> C) |
| 0x803a44 | render-gfx | worker | C | [A] fn 0x803a44: VFP param shuffle + vtbl+20 call; bls to 0x80a8d8/0x80acc4/0x8032e0/0x2332ac/0x13efddc/0x803f44; votes render-gfx:5/monster-em:1 |
| 0xba67b4 | quest | worker | B | [A] fn 0xba67b4: u64 counter [r4]++, stores 5 args to 0x17c50/0x17c54/0x17c58/0x17c60/0x17c68, bl 0x13efe00/0x13efe0c/0x13f0a6c, next fn at 0xba6888; no 0x7aedcc registration in body; votes quest:8 |
| 0xcd29ac | quest | orchestrator | B | [A] fn 0xcd29ac..0xcd2b94: bl 0x838750/0x838860 rng-pair, decompression loop via 0xb21388/0xb215b4/0xb213cc, bl 0xb26c04, 12 bl; votes quest:9/otomo-ot:2 (9>=1.6x2) |

## Summary
- Total: 20 regions; 20 rows; all labeled (labels used: quest, monster-em, otomo-ot, online-nex, render-gfx, audio).
- Confidence: A=0, B=12, C=8.
- Roles: orchestrator 5 (0x585e98, 0x667948, 0x66ace0, 0x4fe4c0, 0xcd29ac), worker 13, leaf 2 (0xc05758, 0xb2b6a8).
- Notes: 0xba67b4's `bl 0x7aedcc` sits in the region-wide callee list, outside the real function (next fn at 0xba6888) — label kept from votes + intra-function evidence. 0x682b8 and 0xb2b6a8 are multi-function regions (stubs/second fn at 0x68310; region totals used for role). 0xb2b6a8 itself is a 1-insn bx lr stub, so role=leaf.

审查后（DsvB3r15c 补审标签与 conf：20/20 标签与首位票一致，2 处降 C，2 处角色修正）：conf A 0 / B 12 / C 8（共 20）；role orchestrator 5 / worker 13 / leaf 2。本片已审。
