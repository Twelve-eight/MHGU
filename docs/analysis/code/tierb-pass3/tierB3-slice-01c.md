# Tier B pass3 - slice-01c

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|
| 0x217a30 | quest | orchestrator | B | votes quest:19 >= 1.6x otomo-ot:6; callee cluster 0x9fba6c/0x9fc268/0x13f004c/0x1e7644 shared with 0x1f8ef8 (quest) |
| 0x451f4c | monster-em | orchestrator | B | (DsvB3r01：只有裸的 0x7aedcc) votes 27/33; 0x7aedcc in callees + 0x44c598/0x44c7bc cluster shared with 0x455468/0x45f6c4 (monster-em) |
| 0xbaf5f4 | render-gfx | orchestrator | B | votes render 7/12; shares 0x8878e4+0x7bb638 pair with 0xbebcc4 (render B) and 0x8879b4/0x887958 with 0x9e2be4 (render B) |
| 0x12120e4 | monster-em | orchestrator | C | (DsvB3r01：分票 1.06x) votes monster 19/render 18 near tie; render-side callees 0x11e1fe8/0x13efddc/0x53aa84 shared with 0x455468 (monster A) |
| 0xae1664 | render-gfx | worker | B | (DsvB3r01：真实函数 8 条指令，1 bl) votes render 39/47; render-gfx callees 0xa58d7c/0xa58e70/0xa59268/0xa74880/0xaef1e4/0xae4da8/0xae5744 (a5xxx/ae-graphics cluster) |
| 0x82f80 | audio | orchestrator | B | votes audio 34/47; 0x48cba4/0x48cd9c/0x496f0 audio cluster (0x48e0bc monster region shares 0x539d78) |
| 0xbebcc4 | render-gfx | orchestrator | C | (DsvB3r01：标签冲突待复核：mpCurveSet/Reverb 是音频 DSP 参数名) strings mpCurveSet/mpDirectionalSet/Reverb = sound DSP param sets; callees 0xc4b798/0xc8fcf0-class with 0xbaf5f4 (render) |
| 0xcf6c70 | monster-em | orchestrator | B | votes monster 48 unanimous; all callees 0x76xxx-0xd0xxxx monster-em low cluster |
| 0x83a01c | quest | orchestrator | B | votes quest unanimous 5; 0x83cfac quest-side callee; allocation via vtable slots 28/0x1c |
| 0x11b9568 | monster-em | worker | B | (DsvB3r01：0 bl / 2 blx) votes monster 20/33; monster vm region (0x27-0x2b cluster) with render callees 0x283060/0x53aa84/0x48c388 matching 0x455468 |
| 0x3f45dc | quest | leaf | B | (DsvB3r01：7 条指令，0 bl) votes quest unanimous 7; head tests flags 0x2000/8192 at [r0,2520] (0x3f45e8); callees 0x526348/0x3f7478/0x523b0c quest region shared with 0x3ebd40 |
| 0x3ebd40 | quest | orchestrator | B | votes quest 11/13; reads global field +177 cmp #5 and flags +2392/0x40, then 0x523da4(key 0x296e/0x2970) quest gate pattern; shared callees 0x526348/0x3f3518 |
| 0x455468 | monster-em | orchestrator | B | votes monster 25/33; 0x7aedcc in callees + 0x44c598/0x44c7bc/0x44c888 cluster shared with 0x451f4c (monster A); head at 0x455474 (coproc push) |
| 0xd48e0 | quest | leaf | B | (DsvB3r01：单条 `b 0x2b908`) votes quest 3/3 unanimous; region: 0xd48e0 itself is b-tail to 0x2b908; real fns 0xd48e4 thunk vtable+52 and 0xd4914 zero-init builder |
| 0x48e0bc | monster-em | orchestrator | B | votes monster 26/28; region mid-switch; 0x4a1b6c/0x53aa84 cluster shared with 0x451f4c (monster A); fn at vaddr is 11-case jt at 0x48e0d8 |
| 0x51e6d8 | save-data | orchestrator | C | (DsvB3r01：只有字段名和外部文档引用，无存档原语) strings rabbitNo/rabbitRecordNo + callee 0x6aa9b8 (record iterator per docs/analysis/gameplay/entry-map.md:197) = save record bitmap loader; copies 8 word fields 0x51e6e8-0x51e724 |
| 0x45f6c4 | monster-em | leaf | B | (DsvB3r01：0x45f710 `bx lr`，0 bl) votes monster 42/48; 0x7aedcc + 0x4a1b6c/0x4a2da4/0x4a2ed0 cluster shared with 0x451f4c (monster A); head 0x45f6c4 mid-helper testing +0x15f1 bit8 |
| 0xb3dcd0 | quest | orchestrator | B | votes quest 24/36; head at vaddr: frees 76B/entry array loop (0xb3dcf4-0xb3dd0c), dtor vtbl+52 (0xb3dd20) |
| 0x1f8ef8 | quest | orchestrator | C | (DsvB3r01：分票 1.57x <1.6) votes quest 11/18; head at vaddr builds 0x7bb638-owned 28B object (0x1f8f2c-0x1f8f54); quest-side callees 0x1f787c/0x258ffc/0x259398 |
| 0x9e2be4 | quest | orchestrator | B | head resize: count at [this+100], u32 array realloc via alloc slot 7 (0x9e2bf4-0x9e2c34); 0x9f4e20-0x9f5358 family shared with quest 0x217a30/0x1f8ef8; votes quest 15 vs render 6 = 2.5x |

## Summary
A=3, B=17, C=0, total=20.

审查后（DsvB3r01，10 PASS / 10 FAIL）：conf A 0 / B 16 / C 4（共 20）；role orchestrator 15 / worker 2 / leaf 3。
