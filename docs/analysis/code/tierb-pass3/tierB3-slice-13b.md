# Tier B pass3 - slice-13b (20 functions)

## Confirmed

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x50bbfc | monster-em | orchestrator | B | votes 15:5 = 3x; reviewer: fn spans region, 1436-byte frame, bls 0x50c754/0x6c1d5c/0x6c2524 within 40 insns -> orchestrator (role fixed per review) |
| 0x8389e0 | quest | leaf | B | own prologue-less leaf fn 0x8389e0..0x838a44, 0 bl [A]: sat add/sub/clamp on {cur,max} pair; label = top vote quest 3:0; wrapper 0x83896c ends at 0x8389dc, its calls are not this fn's |
| 0x9e6400 | quest | worker | C | votes 1:1 tie -> C; reviewer: real fn 0x9e6400..~0x9e69ac, 3 bl (0x94cf88 x2, 0x1ebe8) -> worker |
| 0x11a694 | otomo-ot | orchestrator | B | votes 1:0; one bl 0x8261fc per serialized field, >=10 bl by 0x11aa00 and fn continues -> orchestrator (role fixed per review) |
| 0x16abac | monster-em | orchestrator | C | votes 6:4 = 1.5 < 1.6 -> C; 12 distinct region callees in one big body (8192-byte zero-init) -> orchestrator (role fixed per review) |
| 0x2604cc | quest | orchestrator | B | votes 4:0; >=9 bl (0x195448 x3, 0x1c9604, 0x1c9378, 0x1ac44c x4+) through 0x260a38, head is unrolled swap with no bl (role fixed per review) |
| 0x4e0380 | monster-em | worker | B | votes 3:1 = 3x; real fn 0x4e0380..0x4e0758, exactly 1 bl (0x4d5e14), 14-case jump-table switch of ldrh triple compares |
| 0x6b58e8 | otomo-ot | worker | B | full body verified 0x6b58e8..0x6b591c: exactly 1 bl (0x545a04 record-by-id 10 getter) + 4-word copy [A]; votes 17:4 = 4.25x |
| 0x70b3ec | quest | orchestrator | B | votes 8:4 = 2x; 14 distinct region callees in one body (640-byte memset head, no epilogue) -> orchestrator (role fixed per review) |
| 0xb60300 | monster-em | worker | B | votes 1:0; real fn 0xb60300..0xb6089c, exactly 1 bl (0x13efddc); pure VFP 4-vector transform |
| 0x13e5168 | online-nex | orchestrator | A | own prologue; 9 bl to 0x13c/d7xx net cluster; string load inside real fn at 0x13e51b0 (add r1, pc, #0x188e9e -> machine/login/password/HOME); A accepted by review |
| 0x256f68 | monster-em | orchestrator | B | votes 7:2 = 3.5x; 11 distinct callees, 6 bl in first 22 insns (0x887810, 0x26e354 x5 init list) |
| 0x3f7478 | quest | worker | B | votes quest 5:2 = 2.5x; bl 0x50c964 x3 inside 0x3f7478..0x3f74ec + b 0x50c964 tail-call -> worker (role fixed per review; leaf draft missed the repeated calls) |
| 0x541a0c | render-gfx | worker | C | votes 4:3 = 1.33 -> C; real fn 0x541a0c..0x541cb4, only 2 bl (0x86a438, 0x882674); region bl 0x7aedcc is at 0x541d58 in registrar fn 0x541cd4 -> A impossible |
| 0x5b0d28 | otomo-ot | leaf | B | full body verified 0x5b0d28..0x5b0d48: 0 bl, 1 blx vtable + ldrb lookup [A]; votes 12:7 = 1.71x; region's 19 callees belong to fns at 0x5b0d4c+ |
| 0xb4683c | quest | orchestrator | B | votes 11:1 = 11x; real fn 0xb4683c..0xb46dd0 contains all 12 distinct callees -> orchestrator (role fixed per review); recursive node/value match walk from base [r10+100] |
| 0x16cf28 | monster-em | orchestrator | B | votes 8:2 = 4x; 10 distinct region callees in one large body (284-byte frame) -> orchestrator (role fixed per review) |
| 0x793424 | quest | orchestrator | B | 10 bl in 140-insn window (0x65eb0c x2, 0x65fa04, 0x65fa54, 0x65f830, 0x55efe8 x2, 0xba3ddc, 0x22e904, 0x790efc); state-flag condition eval -> bool r7 [A]; votes 9:4 = 2.25x |
| 0xa57650 | quest | leaf | B | votes 2:0; real fn 0xa57650..0xa576cc (pop {r11,pc}), 0 bl -> leaf (role fixed per review); clamp/index arithmetic over [r0+8..32]; region callees are next fn 0xa576d0's |
| 0xccbab4 | quest | orchestrator | B | votes 4:2 = 2x; real fn 0xccbab4..0xccbedc, exactly 8 bl (0xb04a68, 0x13eff80 x3, 0x13eff8c x3, 0xb04b48) -> orchestrator (role fixed per review); no 7aedcc inside (registrar 0xccbf6c) -> A impossible |

## In progress

- [A] All 20 rows written and independently reviewed by DsvB3r13 (b3-review-13.md): 10 PASS / 10 FAIL, all failures role-only.
- [A] Review fixes applied to this table: 0x50bbfc, 0x11a694, 0x16abac, 0x2604cc, 0x70b3ec, 0xb4683c, 0x16cf28, 0xccbab4 worker->orchestrator; 0x3f7478 leaf->worker; 0xa57650 worker->leaf. Labels (incl. quest for 0x8389e0/0x3f7478) and conf (incl. C for 0x9e6400/0x16abac/0x541a0c) unchanged.
- [A] A-screen: only 0x13e5168 admissible for A and accepted; 0x541a0c/0xccbab4 0x7aedcc registrations are in later registrar fns 0x541cd4/0xccbf6c.

## Unknown

- None for this slice: every row is review-verified against the real function (extents and bl counts from reviewer disasm).

## Summary

- Conf: A 1, B 16, C 3, total 20 (10 PASS, 10 role fixes applied post-review).
- Labels: quest 9, monster-em 6, otomo-ot 3, online-nex 1, render-gfx 1.
- Roles: orchestrator 11, worker 6, leaf 3.
