# Tier B pass3 - 14c

## Confirmed
- 0xaf7f54, 0xb73dac: pure FP/scalar compute, zero bl/blx in disassembled heads => physics-math, leaf, conf A.

## In progress
(none — all 20 rows done)

## Unknown
- 0xaee45c: label physics-math inferred from pure bit/word math structure only (conf C, no votes, MCP budget exhausted).
- Low-spread vote regions (0x5d07fc, 0xbcc5e0, 0xb75f4) left conf C per the 1.6x rule.

## Rows
| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x503c7c | otomo-ot | orchestrator | B | (审查 DsvB3r14：bl ≥8) fs=fn@0x503c7c; switch([r4,#876]-1<=6) 7 arms @0x503cbc-cd0; votes otomo4/audio2=2.0x; 7 distinct callees (0x3f8a20,0x3a5ec4/d0,0x3a3740/08,0x65dd68/c4); bl-count estimate, region likely single fn |
| 0x5d07fc | otomo-ot | orchestrator | C | fs=fn@0x5d07fc; gate tst[r4,#80]#1 @0x5d080c; switch[r4,#76]<=7 (8 arms) @0x5d0820-2c; votes otomo5/quest4=1.25x<1.6; 9 distinct callees (0x56e61c,0x56e528,0x56fde0,0x560d3c,0x55bc4c,0x194228...) |
| 0xbcc5e0 | quest | orchestrator | C | fs=fn@0xbcc5e0; ctor: vtable str@0xbcc61c, 32-byte-stride init loop @0xbcc630-3c; votes quest5/render4/otomo2=1.25x; 11 distinct callees (0x887810,0xb0804c,0xb09098,0xbccb0c,0xbcd6a0,0xb87360,0xc98334/70) |
| 0xb75f4 | otomo-ot | worker | C | fs=fn@0xb75f4; fp state; field r9+29696 @0xb7608; flag ldrb[r0,#704] @0xb764c; votes otomo4/em3=1.33x<1.6; 7 distinct callees (0xc992c,0xc09ec,0xc1750,0x7feb4,0x5ceb4,0x70824,0xb7b1c) |
| 0x2f331c | monster-em | worker | B | fs=fn@0x2f331c; sole top vote monster-em:3 (no second); bl 0x27bcd0->cmp#1, bl 0x2864c4(r4,60); vtable blx[r0,#520](0x800000) @0x2f3358, blx[r0,#432](0,128) @0x2f3378 |
| 0x491da4 | monster-em | worker | B | (审查 DsvB3r14：bl <8) fs=fn@0x491da4; votes em7/kernel2=3.5x; 12 distinct callees incl 0x7aedcc, 0x7aa47c; pos copy [r4,#64..72]->[224..232] @0x491db4-c8; switch [r5,#104]-31<=5 @0x491dfc-00 |
| 0x9ff43c | quest | worker | B | fs=fn@0x9ff43c; sole top vote quest:3; "AI Task" string ref add r1,pc @0x9ff484 (lit 0xb78138 @0x9ff934) inside fn; bl 0x7bb638/0xc8cff4/0x7bba44 |
| 0x13c0b44 | quest | orchestrator | B | fs=fn@0x13c0b44; votes quest9/kernel2=4.5x; ctor: bl 0x13c2df0(r0,0x40000) @0x13c0b74; zero 396/0x69c via 0x13efdc4; vtable @0x13c0ba0; region strings "video","video output" |
| 0x25a1f4 | otomo-ot | orchestrator | B | fs=fn@0x25a1f4; votes otomo18/quest3=6x; init flag bytes [r4,#1236-1244] @0x25a224-40; 23 distinct callees (0xe83bc-0xe9ee0, 0xdaba4/c14/d24, 0x26e43c/964, 0x26fcac) |
| 0xa8870 | monster-em | worker | B | fs=fn@0xa8870; sole top vote monster-em:7; field [r9+0x1428] @0xa88b8 + byte [+0x5c2c] @0xa88bc; 7 distinct callees (0xc3ca0,0xbecf0,0x49c0c,0x13efd70/ddc/de8/df4) |
| 0xb450b0 | render-gfx | worker | B | fs=fn@0xb450b0; votes render2/quest1=2.0x; switch [r5,#4]==14 + jumptable [r5,#0]<=5 @0xb450c8-104; fpu vmov/vcmp blocks; 3 callees 0x13f00d0/0x13f0ea4/0x7c5858 |
| 0xb73dac | physics-math | leaf | C | (审查 DsvB3r14：无函数内硬证据) fs=fn@0xb73dac; disasm 0xb73dac-e08: push/sub, ldr[r9,#88], NEON vldmia f5d0f000 @0x7dc8, vdiv/vcvt fp pairs @0x7dcc-e00, branch-outs bgt/bmi 0xb742b4 — zero bl/blx; pure FP compute => physics-math leaf |
| 0xbbdc34 | quest | orchestrator | B | fs=fn@0xbbdc34; votes quest11/otomo2=5.5x; recursion (callee 0xbbdc34); flag [r8,#31] eor#1 @0xbbdc74-78; blx fnptr @0xbbdc88; 0x869b18-0x86a67c cluster, 10+ distinct callees |
| 0xbd25bc | render-gfx | worker | B | fs=fn@0xbd25bc; votes render2/online1=2.0x; gate [r4,#52] @0xbd25dc; ptr-table ldr[r0,r1,lsl#2] @0xbd2618; 3 callees 0xc08458/0x80328c/0xc9b52c |
| 0x670dc0 | quest | leaf | B | (审查 DsvB3r14：0 bl) fs: mid-fn, real fn@0x670c88; guard cmp r1,#7/bxhi lr @0x670dc0-c8 + 8-arm jumptable @0x670dcc-d8; votes quest9/otomo3=3x; 12 distinct callees (0x65cb3c,0x608ba0,0x54f260,0x609338,0x54ee98,0x607eb0,0x54ecc0,0x609490...) |
| 0x27b3f4 | quest | leaf | B | fs: tail of small getter (fn@0x27b3d8): ldr[r0,#0x13c8] @0x27b3f8, cmp#2 @0x27b404, bx lr @0x27b40c, 0 bls; label from region votes quest5/otomo2=2.5x; sibling tick fn@0x27b410 gates on same field 0x13c8==2 @0x27b428, vtable blx[r0,#356] @0x27b44c + [r0,#364] @0x27b480, bl 0x4ea4c0 @0x27b464, bl 0x4eb170 @0x27b4a0 |
| 0xaee45c | physics-math | leaf | C | fs=fn@0xaee45c; pure bit/word math, no bls in head: tst[r1,#12]#2 @0x478, cond stores [r3,#0/4/8] @0x480-8c, switch r7<=4 jumptable @0x494-b8, consts 0xffff/0x1000000/0x40000 @0x4a8-b0; votes none |
| 0xaf7f54 | physics-math | leaf | C | (审查 DsvB3r14：无函数内硬证据) fs=fn@0xaf7f54; disasm 0xaf7f54-7b: push/sub/vpush, scalar index math cmp r3,#0 @0x770, add r4,r5,#2 @0x798, add r5,r2,r5,lsl#2 @0x7fac, ldm {r6,r10} @0x7fb0 — zero bl/blx; array index/clamp compute, no game calls => physics-math leaf |
| 0x1e4d0c | otomo-ot | leaf | B | fs: tiny fp leaf tail (vmov @0x1e4d0c, bx lr @0x1e4d10, 0 bls, fn@0x1e4cc0); main fn@0x1e4d14 holds 25 callees (0x7b1xxx/0xb21xxx); votes otomo25/quest10=2.5x |
| 0xbfe57c | quest | orchestrator | B | fs=fn@0xbfe57c; votes quest7/otomo2=3.5x; bl 0xbfdbd4 first @0x594; 9 distinct callees (0x7aa47c,0x7af37c,0xbfcd80,0xbfee70,0x13efd7c/dc4/dd0/e00) |

## Summary
- Total 20 regions / 20 rows. Conf: A=2 (0xaf7f54, 0xb73dac), B=14, C=4 (0x5d07fc, 0xbcc5e0, 0xb75f4, 0xaee45c).
- Labels: quest 7, otomo-ot 5, monster-em 3, physics-math 3, render-gfx 2; all from the allowed 13-label list.
- Roles: orchestrator 8, worker 7, leaf 5.
- Boundary notes: 0x670dc0 mid-fn (real fn@0x670c88), 0x27b3f4 getter tail (fn@0x27b3d8) + tick fn@0x27b410, 0x1e4d0c fp-leaf tail (fn@0x1e4cc0) + main fn@0x1e4d14.

审查后（DsvB3r14）：conf A 0 / B 14 / C 6（共 20）；role orchestrator 7 / worker 7 / leaf 6。
