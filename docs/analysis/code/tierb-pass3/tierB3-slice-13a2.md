# Tier B pass3 - slice-13a2

Source: `G:/omp works/.tmp/mhgu/tierB3p/slice-13a2.txt` (10 regions). Label set: quest, monster-em, online-nex, otomo-ot, render-gfx, audio, kernel-os, weapon-wp, save-data, item, physics-math, player-pl, ui. conf: A = hard evidence inside the real function, B = top vote >= 1.6x second or clear structural pattern, C = otherwise. Role by the real function's own bl count: orchestrator >= 8, worker 1..7, leaf 0.

## Confirmed

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x64c528 | quest | worker | B | votes quest:10 otomo-ot:4 monster-em:1 (10>=1.6x4); real fn 0x64c528-0x64c5f8 (`pop` 0064c5f8), 7 bl: 0x54533c(9,1), 0x56de60 x2, 0x55bc4c(mgr,1,8/9) + 0x56e808(this,8/10,1,r3) pairs, vtbl+148 dispatch x2; strb #1,[r0,#94] on [r4,#96]/[r4,#100]. No 0x7aedcc inside real fn (region-wide only). [B] id/flag request pattern, votes top class quest |
| 0xb71a3c | render-gfx | worker | B | votes render-gfx:2; twin template with 0xb71ff8 (same prologue e92d4ff0/e28db01c/e24dd07c; early-exit bl 0xb7357c when [r11,#16]>=6 00b71a88; main path literal 0xcd2c34 00b71a94, counter array [r0,r7<<2]++ 00b71aac, bl 0xb72d88 builds obj into sp+96 00b71ad4, byte unpack masks 0x80402010/0x80400201 00b71ae0-e8); 2 bl -> worker. [B] structural pair + votes |
| 0xb71ff8 | render-gfx | worker | B | votes render-gfx:2; same template as 0xb71a3c (early bl 0xb73994 00b72044, literal 0xcd2678 00b72050); region sibling fn 0xb725b4 repeats the bit-unpack masks 0x80400201/0x80402010 (00b725fc-600); 2 bl -> worker. [B] structural pair + votes |
| 0xc5a57c | render-gfx | worker | B | votes render-gfx:5 quest:1 (5>=1.6x1); head bl 0xc55010 00c5a590 then VFP coproc block (ed9f0add/ee210a00 00c5a594-c0), status word tests 0x10007f8 vs 0x100030 00c5a5a0-cc, 64-bit orr-combine into out struct `ldm r11 {r0,r1}` 00c5a628, magic 0x6291456 test 00c5a640; 6 bl listed -> worker. [B] votes; [INFERENCE] float/bit status decode |
| 0x6bff98 | quest | orchestrator | B | votes quest:13 otomo-ot:6 monster-em:3 (13>=1.6x6=9.6); switch on global[920] cmp #20 bhi 00b6ffb0, 20-entry pc-rel jump table at 0x6bffcc (`add pc, r1, r2` 00b6ffc8), ~21 callees inside real fn (0x3b85d8/0x3c131c/0x3b9868/0x3bd2a8 cluster, 0x54c02c, 0x55bc4c, 0x7bd990, 0x7ca420) -> orchestrator. [B] handler dispatch + votes |
| 0x875e40 | quest | worker | B | votes quest:4 monster-em:1 (4>=1.6x1); real fn ends `pop` 00875e8c; single bl 0x824868 in copy loop x64 stride 400 (add r5,#400 / cmp #25600 00875e70-78), flags strb #1,[r4,#9] 00875e80; twin fn 0x875e90-0x875edc identical with offsets 40/48/5/28 (pop 00875edc). [B] votes; [INFERENCE] bulk-copy init |
| 0xb538c8 | quest | worker | B | votes quest:3 (second 0); vtbl+8 dispatch `blx r2` 00b538e8, early `beq 0xb53e40` 00b538fc, GOT literals 0xcf09bc/0xcf09b4 00b53900/20; 3 callees 0x827c9c/0x8283a8/0x8283f4 -> worker; no 0x7aedcc inside real fn. [B] votes |
| 0xb63254 | quest | worker | B | votes quest:5 audio:1 (5>=1.6x1); vtable init [r4]=global+8 00b63268, destroy loop over [r4,#116] array via vtbl+4 `blx r1` 00b63294, callee 0xb6380c; 6 callees listed -> worker. [B] votes; [INFERENCE] dtor-style cleanup |
| 0xbe4ebc | quest | worker | B | votes quest:4 monster-em:1 (4>=1.6x1); VFP save ed2d8b10 00be4ec4, zero-fill sp+48..76 00be4ef0-08, GOT 0x1541f10 + idx 0x31f88 -> global word 00be4ee8-18, second GOT 0xc57ca8 00be4f0c; 5 callees 0x13efddc/0xb61a54/0xb61b28/0xb61bfc/0xbe5474 -> worker. [B] votes |
| 0x27d5c4 | otomo-ot | leaf | B | votes otomo-ot:2 (top, second 0); real fn continues past slice head through 0x27d624-0x27d834+ with no further bl (state machine: `ldrsh r0,[r8,#0]` cmp #50 00b650-58, flag masks 0x100000/0x200000/0x400000/0x800000 00b670-a0, result orr into [r6] 00b68c-d0); 2 bl (0x65f9b4/0x65fa04) are region-wide, not confirmed inside real fn. [B] votes |

## Summary

- Total: 10 regions / 10 rows. conf: A=0, B=10, C=0.
- Labels: quest 6 (0x64c528, 0x6bff98, 0x875e40, 0xb538c8, 0xb63254, 0xbe4ebc), render-gfx 3 (0xb71a3c, 0xb71ff8, 0xc5a57c), otomo-ot 1 (0x27d5c4); total 10.
- Roles: orchestrator 1 (0x6bff98), worker 8, leaf 1 (0x27d5c4).
- Scope corrections: 0x64c528 real fn ends 0x64c5f8 (next fn 0x64c600); 0x875e40 real fn ends 0x875e8c with twin 0x875e90-0x875edc; 0xb71ff8 region holds sibling fn 0xb725b4 after a literal pool at 0xb725a8.
- No class registration (`bl 0x7aedcc` + class-name string) found inside any real function; all labels are top-vote or structural-pair based, hence conf B throughout.
- MCP calls used: 6/6 (disasm x6: 0xb71a94, 0x64c588, 0x27d624, 0x875e8c, 0xc5a5d8, 0xb725a8).

审查状态：DsvB3r13 请求预算用完，本部分未经审查。
