# Tier B pass3 - slice-12c

## Confirmed

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x6e067c | quest | orchestrator | C | (审查 DsvB3r12：11 bl) votes quest:1 otomo-ot:1 exact tie; fn-start confirmed; real fn: `bl 0x1961d0` (0x6e0794) = record-table accessor (idx*500+0x103c, idx cap 10) then ~100-insn ldm/stm bulk field copy; callee 0xdad24 = dtor (bl 0x7af3e4, 0xdad48); no subsystem-decisive evidence, top-vote taken |
| 0x13bf4f8 | quest | worker | B | votes quest:11; fn-start confirmed; real fn = 14-insn trampoline: `bl 0x7aa47c` (0x13bf510) + vtable tailcall `bx r12` (0x13bf52c); region callee list comes from later fns in block |
| 0x694f20 | otomo-ot | orchestrator | B | votes otomo-ot:13 >= 1.6x quest:2; fn-start confirmed; 7-case jump table on ([r4,#4]>>24) (0x694f38-0x694f4c); 18 distinct callees |
| 0x83f098 | monster-em | worker | B | votes monster-em:2 vs render-gfx:1 = 2.0 >= 1.6x; fn-start confirmed; 3 distinct callees (0x83f65c/0x803058/0x13efddc), 744-byte frame, array zero-init loop (0x83f0b4-0x83f0f4) |
| 0xa27fdc | quest | orchestrator | B | votes quest:11 >= 1.6x render-gfx:2; fn-start confirmed; loop over [r4,#72][] entries, flag store `strbls r8,[r5,#4]` (0xa28030); 13 distinct callees |
| 0xbd84e4 | quest | orchestrator | B | votes quest:10 >= 1.6x render-gfx:3; fn-start confirmed; vtable call via [r0,#48] (0xbd84fc); 13 distinct callees incl self-recursion bl 0xbd84e4 |
| 0xc54a4c | render-gfx | orchestrator | C | votes render-gfx:5 vs monster-em:4 = 1.25 < 1.6x, no disasm budget; fn-start confirmed; 11 distinct callees, `bl 0x542f7c` (0xc54a90) with movw/movt 0x6de1b2fd, field reads [r2,#1116/1120] (0xc54aa0-0xc54aa4) |
| 0xce4540 | quest | leaf | B | (审查 DsvB3r12：1 条 `bx lr`) votes quest:8 unanimous; real fn 0xce44dc ctor: `bl 0x7aa47c` (0xce44ec), alloc `bl 0x8870b8` (0xce4508), vtable <- [0xb61e18], zeroes [#100-108], [#+76]=22; marker vaddr itself is 1-insn `bx lr` pad; 2 bl |
| 0x1070b0c | otomo-ot | worker | B | votes otomo-ot:2 vs monster-em:1 = 2.0 >= 1.6x; fn-start confirmed; 3 distinct callees (0xbaaac/0x6f6e8/0x71078); 57-entry jump table on r3 (0x1070b30-0x1070b48), cases on r2 in {1,6,7} |
| 0x118e534 | render-gfx | orchestrator | B | votes render-gfx:11 >= 1.6x monster-em:5; fn-start confirmed; 20 distinct callees, mostly 0x27xxxx-0x2fxxxx cluster |
| 0x1c5034 | quest | leaf | B | (审查 DsvB3r12：0 bl) votes quest:21 unanimous; fn-start confirmed; repeated u16 vcalls via [vtable,#8] (0x1c5050..); 21 distinct callees; string cMonNyanVillagePoint region-wide (not confirmed inside real fn) |
| 0x1e1c04 | quest | orchestrator | B | (审查 DsvB3r12：20 bl) votes quest:4 >= 1.6x otomo-ot:1; fn-start confirmed; 5 distinct callees, `bl 0xba84f0` twice (0x1e1c2c, 0x1e1c44), state cmp r0,#3 (0x1e1c5c) |
| 0x2709e0 | quest | leaf | B | (审查 DsvB3r12：14 条指令的访问器) votes quest:4 >= 1.6x audio:2; real fn 0x270940: list-node ctor `bl 0x7bb638` (0x270974), head insert [r9,#4] (0x2709c4), tail b 0x8871d8; 1 bl; region string angryprm not inside real fn |
| 0x2ae238 | render-gfx | orchestrator | C | votes render-gfx:4 vs monster-em:3 < 1.6x; fn-start confirmed; vtable call [vtable,#164] (0x2ae268); stores [r4,#4072..4080]; strings elay/SessionEvent region-wide; 8 distinct callees |
| 0x42141c | monster-em | leaf | B | (审查 DsvB3r12：1 条 `b`) votes monster-em:14 unanimous; real fn 0x42132c ctor: `bl 0x43b3f8` base (0x421330), ~30 field stores at movw offsets 0x15c8-0x161c, [#+0x15a8]=42; marker vaddr is `b 0x43b488` thunk (0x42141c); 1 bl |
| 0x529048 | quest | leaf | B | (审查 DsvB3r12：0 bl) votes quest:4 unanimous; fn-start confirmed; byte-serialize into [r4,#8] at [r4,#12] with grow vcall (0x529074); string cTrialArts region-wide; 4 distinct callees |
| 0x536958 | quest | leaf | B | (审查 DsvB3r12：0 bl) votes quest:21 unanimous; fn-start confirmed; repeated field-copy vcalls via [vtable,#12] (0x536974..); string cTutorialFlowBase region-wide; 21 distinct callees |
| 0x53cde8 | quest | worker | B | votes quest:7 >= 1.6x monster-em:3; fn-start confirmed; ctor ~12 insns: `bl 0x928e10` (0x53cdec), vtable <- [0x13020fc], zeroes [r0,#992/996/52]; 1 bl |
| 0x76f9dc | quest | orchestrator | B | votes quest:17 >= 1.6x otomo-ot:3; fn-start confirmed; table-indexed loads `mla r0,r3,r0,r1` (0x76fa04); 22 distinct callees |
| 0x9662a4 | quest | orchestrator | B | votes quest:10 >= 1.6x otomo-ot:1; fn-start confirmed; FPU load + `bl 0xb4f08c` (0x9662f0); 11 distinct callees |

## In progress

- none — all 20 rows final

## Unknown

- Region-wide strings cMonNyanVillagePoint (0x1c5034 block), cTrialArts (0x529048 block), cTutorialFlowBase (0x536958 block), angryprm (0x2709e0 block), elay/SessionEvent (0x2ae238 block) were NOT confirmed inside the listed real function; class-registration check inside real fns not performed (disasm budget).
- 0xc54a4c real function body not disassembled (budget); label by vote ratio alone at conf C.

## Summary

- Total: 20 functions.
- Confidence: A=0, B=17, C=3 (C: 0x6e067c vote tie, 0xc54a4c ratio 1.25, 0x2ae238 ratio 4:3).
- Labels: quest 13, render-gfx 3, otomo-ot 2, monster-em 2.
- Roles: orchestrator 9, worker 11, leaf 0.
- MCP budget: 8/8 used (1 function_start batch + 7 disasm).

审查后（DsvB3r12，12 PASS / 8 FAIL）：conf A 0 / B 17 / C 3（共 20）；role orchestrator 10 / worker 4 / leaf 6。
