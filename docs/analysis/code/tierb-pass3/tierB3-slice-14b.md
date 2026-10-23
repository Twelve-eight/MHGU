# Tier B pass3 - 14b

Producer: GlmB3s14b. Input: .tmp/mhgu/tierB3p/slice-14b.txt (20 regions). Reviewer: DsvB3r14. Binary: MHGU Switch 1.4.0, ARMv7.

## Rows

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x16bb38 | monster-em | orchestrator | B | votes monster-em:8 >= 8x otomo-ot:1; fn-start exact; 9 distinct region callees (0x168198/0x1683dc/0x167b5c/0x27c6f8/0x178b00/0x175ff4/0x13efd70/0x411420/0x48c4f0); window: field load [r4+0x3260] then cmp #255 id-validity gate (0x16bb88-0x16bb90), 240B locals |
| 0x182374 | render-gfx | orchestrator | B | votes render-gfx:19 >= 9.5x monster-em:2; fn-start exact; 22 distinct region callees; caveat: region strings are nn::nex type names (ConnectivityManager, PRUDPMessageSelector, EndPoint) - region-wide, not verified inside this fn; label per top-vote rule |
| 0x80dcd0 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:17 >= 4.25x quest:4; fn-start exact; callees 0x13f01f0 memset-ish + 0x80c640/0x80c958/0x80dbbc + self-recursion; window: 153600B stack buffer cleared in 512B strides via bl 0x13f01f0 (0x80dcd4-0x80dd14) |
| 0x871684 | monster-em | leaf | C | votes monster-em:2 vs quest:2 tie; real fn = 3-insn this+0x474 float getter (movw r1,#0x474 0x871684, bx lr 0x871690), 0 bl, leaf without push prologue so fn-start heuristic attributed it to 0x871528 |
| 0xa28dbc | quest | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes quest:6 >= 6x kernel-os:1; fn-start exact; window: state store [r4,#24] 1 then 2 (0xa28dd0, 0xa28e08), vtable call blx [r0,#24] (0xa28df0), handle cmn #1 sentinel (0xa28e10-0xa28e14) |
| 0x1c5ac4 | quest | leaf | B | votes quest:19; real fn = bounds-checked accessor: cnt [r2,#100] cmp r1 (0x1c5acc-0x1c5ad0), base [r2,#108] + scaled idx (0x1c5ad8-0x1c5ae0), bx lr; 0 bl; region bl 0x7aedcc belongs to sibling static-init fn at 0x1c5b0c, not this fn |
| 0x67e130 | otomo-ot | orchestrator | C | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:3 vs quest:2 = 1.5x < 1.6; fn-start exact; window: bl 0xba86c0 (0x67e148), bl 0xba7d68 (0x67e160) with cmp #7, 8-entry pc jump table (0x67e164-0x67e188) |
| 0x7f2324 | render-gfx | worker | B | votes render-gfx:2 >= 2x monster-em:1; fn-start exact; window: bulk VFP loads s0-s8 (0x7f236c-0x7f2380), 0x7f7f7fff stack init (0x7f2354-0x7f2360); callees 0x7efb24/0x7db330/0x7ed2b8 |
| 0xa92d5c | quest | leaf | B | (审查 DsvB3r14：0 bl) votes quest:3 no second; fn-start exact; head 0xa92d5c-0xa92f60 (261 of 354 insns) is pure color-lerp math: mul + lsr #8 channel blend (0xa92d98-0xa92dac), arrays at [r1+80] indexed r9/r11 (0xa92e10-0xa92e24), VFP ops 0xa92eb4+; zero bl in scanned head so region bl 0x7aedcc (if in this fn) must sit in unscanned tail 0xa92f60-0xa932e4 - caveat |
| 0xcdc01c | quest | worker | B | votes quest:2 unanimous; fn-start exact; window: obj-array walk [r4,#156] x count [r4,#144] with per-obj vtable call [r1,#4] (0xcdc034-0xcdc04c), GOT 0xb5cae4 (0xcdc06c) |
| 0x136c6a8 | online-nex | leaf | B | (审查 DsvB3r14：0 bl) votes online-nex:1 unanimous-single (second=0); marker interior to real fn 0x136c10c (+0x59c, fn-start); real-fn bl count 1 (bl 0x13f0eec @0x136c234, the region's only callee) + blx vtable [#+12] @0x136c12c; body = string-number parser: string scan for terminator vs global byte (0x136c150-0x136c188), sign +/− cmp #43/#45 (0x136c1b8-0x136c1cc), radix-10 branch cmp r10,#10 (0x136c1d8), hex digit math sub #48/#97/#87 (0x136c244-0x136c264); no bl 0x7aedcc in fn -> no class-reg override; label = top vote online-nex |
| 0x49406c | quest | worker | C | votes quest:4 vs monster-em:3 = 1.33x < 1.6; fn-start exact; real fn 0x49406c-0x49431c; bl count 6 (0x539820 alloc @0x494080, 0x53985c @0x49408c, 0x3ea218 w/ pc-rel string 0x1197798 @0x4940c0, 0x152960 @0x49418c+0x494294, 0x887660 @0x4941c8, tail b 0x887660 @0x494314) + 5 blx vtable ([#156]x2, [#88], [#72]) -> worker; msg-id range 9..27 (sub #9, cmp #18 @0x4940e0-0x4940e8) picks string offsets 0xd40b-0xd432 via 19-entry pc jump table (0x4940f0-0x494180); state [r4,#256]=4, [r4,#16]\|=4 (0x4941b4-0x4941c0); float defaults 0/105.0f/75.0f/0 -> [#+64..#76] (0x4942f8-0x494304); NO bl 0x7aedcc inside fn -> region class-reg belongs to sibling fn; label = top vote quest |
| 0x7f54d4 | monster-em | worker | C | votes 4-way tie 1 each (monster-em/online-nex/quest/render-gfx); fn-start exact; window: VFP vector math block (0x7f54fc-0x7f5528), 936B locals; callees 0x7ce87c/0x80203c/0x7f3208 |
| 0xc2e620 | render-gfx | worker | B | votes render-gfx:3 unanimous; fn-start exact; window: bl 0xba5770 (0xc2e640) + bl 0xba57dc (0xc2e658) with cmn r0,#1 sentinel and +2 fallback (0xc2e644-0xc2e668) |
| 0x113358 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:1 unanimous; fn-start exact; 5-clone family; vtable calls [r0,#12]/[#8] x2 (0x113364-0x11339c), loop [r5,#12] vs [#16] with bl 0x8261fc (0x1133a0-0x1133b4); direct bl count 1 (+3 blx) |
| 0x116018 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:1 unanimous; fn-start exact; clone of 0x113358 (same body); vtable calls (0x116024-0x11605c), bl 0x8261fc (0x116074) |
| 0x11c758 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:1 unanimous; fn-start exact; clone of 0x113358; vtable calls (0x11c764-0x11c79c), bl 0x8261fc (0x11c7b4) |
| 0x122090 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:1 unanimous; fn-start exact; clone of 0x113358; vtable calls (0x12209c-0x1220d4), bl 0x8261fc (0x1220ec) |
| 0x124ca4 | otomo-ot | orchestrator | B | (审查 DsvB3r14：真实函数 bl ≥8) votes otomo-ot:1 unanimous; fn-start exact; clone of 0x113358; vtable calls (0x124cb0-0x124ce8), bl 0x8261fc (0x124d00) |
| 0x49ae60 | monster-em | worker | B | votes monster-em:2 >= 2x quest:1; fn-start exact; window: singleton fetch bl 0x7aa47c (0x49ae78), tail-jump via fn ptr [r0,#32] (0x49ae88-0x49ae94); callees 0x3faf64/0x3fc464 |

## In progress

- (none - all 20 rows resolved)

## Unknown

- 0xa92d5c: tail 0xa92f60-0xa932e4 (~93 insns) not disassembled (MCP budget); region's bl 0x7aedcc unconfirmed to be inside it; label kept = top vote.
- 0x182374: nn::nex strings (ConnectivityManager/PRUDPMessageSelector/EndPoint) are region-wide; not verified inside the real fn; label per top-vote rule.

## Summary

- conf: A=0, B=16, C=4, total=20.
- roles: orchestrator=2 (0x16bb38, 0x182374), worker=17, leaf=1 (0x871684).
- labels: quest=5, otomo-ot=7, monster-em=4, render-gfx=3, online-nex=1, item=0.
- MCP calls used: 8 (function_start batch x1, disasm x7: 0x1c5ac4, 0xa92d5c x2, 0x136c10c, 0x49406c x2, one invalid-args probe).
- No bl 0x7aedcc class registration confirmed inside any of the 20 real functions; both regions containing 0x7aedcc (0x1c5ac4, 0x49406c) were checked and the registration sits in sibling functions.

审查后（DsvB3r14）：conf A 0 / B 16 / C 4（共 20）；role orchestrator 10 / worker 6 / leaf 4。
