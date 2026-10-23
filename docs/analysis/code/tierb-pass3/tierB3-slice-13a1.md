# Tier B pass3 - slice 13a1 (10 regions, MHGU Switch 1.4.0)

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x161ac8 | monster-em | orchestrator | C | real fn = itself (fn_start); main path: copies singleton state fields ([+2356],[+2188],[+177] halfword), iterates 132-entry table OR-ing bitflags into [+3960], bl 0x50bdc/0x560418/0x560238; 13 distinct callees → orchestrator; votes monster-em:7 vs quest:6 = 1.17x < 1.6, no class reg in region → C |
| 0x16a1d8 | quest | worker | C | real fn = itself, ends 0x16a3e8 (pop pc); full body: builds jagged arrays via heap 0x7af37c/0x7af3a0, 48-byte-stride entries, no bl 0x7aedcc in real fn (region callee only); 3 bls → worker; votes quest:4 vs otomo-ot:3 = 1.33x < 1.6 → C |
| 0x21dc48 | monster-em | worker | C | real fn = itself, trampoline: ldr GOT 0x161e0a0, bl 0x7aa47c, virtual call bx r12 (vtbl+32); 1 bl → worker; votes monster-em:3 vs quest:2 = 1.5x < 1.6, no structural override → C |
| 0x28ab24 | quest | worker | B | real fn = itself; 57-case jump table (sub r1,#1; cmp #56; add pc) reading type byte [obj+0x1236] via [self+0x13c4], per-case consts (0x7b8f, 71), shared tails; 4 callees → worker; no 0x7aedcc in region; votes quest:2 vs otomo-ot:1 = 2.0x |
| 0x73eb28 | quest | orchestrator | B | real fn 0x73eb28..0x73f0bc; **10 bl** (0x4c59e8, 0x13c208, 0x524b04, 0x740448, 0x194228 x6) → orchestrator — the 5 distinct callees were only a lower bound; votes quest:5 unanimous; role per review b3-review-13 |
| 0x9b41f4 | physics-math | leaf | C | (审查 DsvB3r13a：votes=[-]，只能证明是浮点矩阵核) votes empty; body is pure VFP coprocessor float ops over arrays [r0+712]/[r0+724] with nested row/col loops ([r0+76] x [r0+80]) incl. transpose-style copy tail; zero bl → clear math-kernel structural pattern; leaf |
| 0xa30bac | quest | leaf | C | vaddr itself is `bx lr` stub (fn_start heuristic attributes cluster to 0xa30b20, an arg-forwarder with bl 0xa2eeac); sibling stubs are 2D-grid accessors (w=[+100], h=[+104] halfwords, base [+172], elem [+180], cell visitor blx r12); no votes, no class reg → weak quest lean, C |
| 0xb4f08c | quest | leaf | B | real fn at vaddr = 9-insn prologue-less getter 0xb4f08c..0xb4f0ac, **0 bl** → leaf; region's 9 callees incl. 0x7aedcc belong to fn 0xb4f0b0+; fn_start mis-attributes to 0xb4f05c (ends 0xb4f084); votes quest:6 vs next 1 = 6x; role per review b3-review-13 |
| 0xb70ec4 | render-gfx | worker | B | real fn = itself; twin dispatcher of 0xb71480; head: [this+88], cmp r7,#6, packed stack args, bl 0xb725b4 / else path 0xb729cc; 2 callees → worker; votes render-gfx:2 unanimous |
| 0xb71480 | render-gfx | worker | B | real fn = itself; twin of 0xb70ec4 (identical prologue/spill pattern); bl 0xb73164 / else path 0xb72c38; 2 callees → worker; votes render-gfx:2 unanimous |

## Summary
- conf A: 0, B: 6 (0x28ab24, 0x73eb28, 0x9b41f4, 0xb4f08c, 0xb70ec4, 0xb71480), C: 4 (0x161ac8, 0x16a1d8, 0x21dc48, 0xa30bac); total 10.
- Labels: quest 5, monster-em 2, render-gfx 2, physics-math 1.
- Notes: MCP budget 6/6 used (fn_start batch + 5 disasm). No `bl 0x7aedcc` with class-name string found inside any real function, so no vote override applied. 0x9b41f4 and 0xa30bac had empty votes; 0x9b41f4 labeled by structural pattern (B), 0xa30bac is a prologue-less stub cluster with no subsystem signal (C, weak quest lean).
- Post-review corrections (b3-review-13, both applied): 0x73eb28 role worker → orchestrator (10 bl, 0x194228 x6 — distinct-callee count was a lower bound); 0xb4f08c role orchestrator → leaf (real fn is the 9-insn prologue-less getter with 0 bl; region callees belong to fn 0xb4f0b0+). Roles now: quest rows — 0x16a1d8 worker, 0x28ab24 worker, 0x73eb28 orchestrator, 0xa30bac leaf, 0xb4f08c leaf.

审查后（DsvB3r13a 补审）：conf A 0 / B 5 / C 5（共 10）；role orchestrator 2 / worker 5 / leaf 3。本部分已审。
