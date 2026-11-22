# Q53c · MHGU 1.4.0 — who writes `em+0x1053`, and can the 5 vtable-only entries run in a normal hunt?

Scope: static analysis only, no emulator, no game launch. Image: `MHGU-private/main.140.flat.bin`
(25,472,632 bytes, buf 0x184AE78), vaddr = flat − 0x100, .text end = `arm32.TEXT_END` 0x13F1DEC
(arm32.mjs line 9). All addresses are vaddrs in that mapping. Tools: mounted `mcp__mhgu_re_*` devices
(schemas read via empty-arg probe) and the same underlying module locally (`MHGU/tools/mhgu/arm32.mjs`,
verified: `decode(0xE3011053,0x6bbe8)` → `movw r1,#0x1053`), plus two purpose-built scanners
(G:/tmp/Q53c/scanA2.mjs, scanB variant inline). Tags: [C] confirmed here by command + quoted output,
[B] strong inference, [U] unknown.

## Decisions up front

**Item A — writers of `em+0x1053`: exactly two, no aliasing path exists.**
1. Enemy base ctor fn `0x53985c` initializes the byte to 0xFF (`0x539b20 movw r0,#0x1053;
   0x539b24 strb r1,[r4,r0]`, r1=0xFF per digest §8.5).
2. The class virtual at vtable **+0xA0** (`0x6bbe8 movw r2,#0x1053; 0x6bbec strb r1,[r0,r2]`).
   No `strb/str/strh` of any form (register-offset, immediate, literal-pool, or `add`-built base)
   anywhere in 0..0x13F1DEC covers byte 0x1053 other than these two, and the five enemy fields
   0x1050..0x1054 are proven five independent u8s (ctor `strb` each). The digest's open "[U]: 谁在
   运行时把 0x1053 改成 5 或 22" narrows to: no `blx [X+0xA0]` site among all 39 passes an immediate
   5/22 in its 8-insn window; the value, if ever written, comes through a register from elsewhere.

**Item B — the 5 vtable-only gait entries CAN run in a normal hunt (static dispatch exists in
em001's own state routers).** Q43/U1's premise ("no dispatcher could be found") is falsified: the
slots are reached by **register-offset vtable loads** (`ldr rX,[vt,#0x3E0..0x3F0]` + `bx/blx rX`),
which neither `refs_to` nor Q43's scan shape could see. Verified em001-side sites:
`0xcf2a58..0xcf2a68` inside **state 3's own L1 router** fn 0xcf2220, and `0xcf187c..0xcf188c` inside
state 0's router fn 0xcf1688 — both gated by `bl 0xb0a84` (reads flag bits at em+0x4B6), i.e. a
normal gameplay condition, not a debug stub. Cell impact on the reachable set: **zero new in-table
cells** — (0,3)/(0,6) were already in the proven forced set (Q43 §4.2 mode-switch), (0,7)/(0,8)/(0,9)
fall outside state 0's L2 table (reachable but contentless per §8.7/§8.8). Reachable count stays ≥261.

---

## Confirmed

### Tooling and method checks
- `arm32.mjs` is the same module the MCP server imports (`MHGU/tools/mcp/mhgu-re.mjs` line 9);
  `buf.length` 0x184AE78; TEXT_END 0x13F1DEC. [C]
- Device cross-check (parent-directed): `mcp__mhgu_re_literal_loads {start:0,end:21091292,values:[4179]}`
  → **exactly 3 hits: 0x6bbdc, 0x6bbe8, 0x539b20 (all movw)** — identical to the local scanner's
  movw materialization set. [C]
- The mounted device has no register-offset/memory-shape scanner, so the whole-image classification
  below used local scanA2.mjs (backward 13-insn constant propagation over raw words with control-flow
  barriers: state cleared after unconditional transfers, r0–r3/r12 killed after bl/blx; coverage test
  `[ea, ea+size)` over {0x1052,0x1053}).

### Item A: scan results (scanA2.mjs, whole .text + full-image pool scan)
Positive controls all FOUND: 0x6bbe0 ldrb 0x1053 (getter), 0x6bbec strb 0x1053 (setter),
0x539904 strb 0x1052, 0x539b24 strb 0x1053. [C]
- **movw #0x1053 in .text: 3 sites** (0x6bbdc, 0x6bbe8, 0x539b20). movw #0x1052: ~40 sites, all in
  functions that only *read* byte 0x1052. Pool words equal to 0x1052/0x1053 in the whole image:
  exactly 2 (0x163ebfc, 0x163ec0c — data region, no ldr-literal code referrer found; e.g. offset
  tables). [C]
- **Byte stores to 0x1053: exactly 2** — 0x539b24 (ctor) and 0x6bbec (+0xA0 setter). Byte stores to
  0x1052: 1 (0x539904, ctor). Byte reads of 0x1053: exactly 2 — 0x6bbe0 (getter) and a scanner hit at
  0xd7b0a4 which on manual disassembly is **[r5+0x1054], the neighbor byte**:
  `0xd7b098 e3010054 movw r0,#0x1054; 0xd7b09c e1a0a005 mov r10,r5; 0xd7b0a4 e7fa3000 ldrb r3,[r10,r0]!`
  (scanA1's ea=0x1053 there came from r10 poisoned by an earlier `mvn r10,#0` in the window — false
  positive, resolved). [C]
- scanA1 (no barriers) missed the getter 0x6bbe0 because window replay crossed `bx lr` at 0x6bbe4 and
  inherited `0x6bbd0 mov r0,#1` from the previous stub — fixed by barriers; v2 passes all 4 controls.
  [C on the bug and fix]
- **Enemy base ctor fn 0x53985c (extent 0x53985c..0x539bd8, 223 insns per functionStarts) writes the
  five neighbor fields with five separate `strb`** (disasm, [C]):
  ```
  00539ae8: e3010051 movw r0,#0x1051 ; 00539aec: e7c41000 strb r1,[r4,r0]
  00539b18: e3010050 movw r0,#0x1050 ; 00539b1c: e7c47000 strb r7,[r4,r0]
  00539b20: e3010053 movw r0,#0x1053 ; 00539b24: e7c41000 strb r1,[r4,r0]   <- 0xFF init
  00539b28: e3010054 movw r0,#0x1054 ; 00539b2c: e7c41000 strb r1,[r4,r0]
  ```
  ⇒ on the enemy class 0x1050/0x1051/0x1052/0x1053/0x1054 are **five independent u8 fields**; no
  4-byte field can cover byte 0x1053 on this class without the ctor's own byte inits contradicting it.
- **The 10 word-size sites at reg-offset 0x1050/0x1051 are NOT enemy writes** — windows read per site
  (prov.out, disasm windows, [C] on instructions):
  - Pointer-typed use of +0x1051 (impossible on the enemy, whose ctor byte-initializes it):
    `0x2009dc`/`0x200e38` (`ldr r0,[r5],#0x1051` → `ldr r2,[r0,#348]` → `blx r2`), `0x2883e8`
    (`ldr r0,[r9],#0x1051` → `ldr r3,[r0,#72]` → `blx r3`), `0x48cbe8` (`ldr r1,[r7],#0x1051` →
    `ldr r1,[r1,#416]` → `blx r1`). [C]
  - Word-store sites write values incompatible with the enemy family and sit in different field
    families: 0x12a3d50 (fn 0x12a3b70: reset block writing {0x1040, 0x1044, 0x1048/0x104c ldrd,
    0x1054=0, 0x1050=0} with fn-ptrs at +0x106c/+0x1070), 0x9090e0/0x90a284/0x90930c (fns 0x8fcac8 /
    0x909120: bulk copy of family {0x1028..0x1054}, e.g. `[r4+0x1050]` → `[r4+0x6380]`), 0x90a598
    (fn 0x90a2c0: `vstr` float stores at 0x1024..0x1034 — a component, not the enemy), 0xc592ac /
    0xc5b370 (fns 0xc591b4 / 0xc5b26c: build a record with word fields 0x1010..0x1020 + `strb` only
    at 0x1020, then `str r1(=4 or 8),[r4,#0x1050]`). [C on instructions, [B] on "not the enemy"]
- **The digest §8.5 admitted hole (`add rX,#v; strb rT,[rX,#imm]` shapes) is now closed**: a targeted
  probe over all 5,168 `strb` sites with immediate offset 0x40..0x70 found **0** whose base register
  is built by an `add #imm` with v+off ∈ {0x1052, 0x1053}. [C]
- Caller side of the setter virtual: `refs_to {targets:["0x6bbe8","0x6bbdc"],pointers:true}` →
  **1082 refs, all `ptr`** = the getter/setter pair as two consecutive words in ~541 class vtables.
  em001's pair sits at **0x179ad94/0x179ad98 = vtable+0x9C/+0xA0** (base 0x179ACF8, see Item B) —
  the same two slots Q43/digest §8.5 describe as "0xd9b0b0 虚调用 [em]->[0x9c]" (getter) and
  "setter 槽 0xa0". [C]
- Scanning all 39 `blx [X+0xA0]` sites (within 6 insns of the slot load): **none passes immediate
  5 or 22 in r1 within an 8-insn lookback** (full site list in session log; includes 0xb9008 in the
  action-reset fn 0xb8c54). The "who writes 5/22" question is therefore not closable by constant scan
  — [U] narrowed, value must come via register/wrapper. [C on the 39-site enumeration + window check]

### Item B: the five vtable-only entries are dispatched
- Slot map corrected. em001 vtable base **0x179ACF8** (derived twice: 0x179aeec−0x1F4 = 0x179af1c−0x224;
  device read_words confirmed slot words). The six-run `0x75224,0x75338,0x75394,0x753ec,0x75444,0x754b8`
  sits at 0x179b0d4..0x179b0e8 = **+0x3DC..+0x3F0**:
  | slot | handler | forces |
  |---|---|---|
  | +0x3DC | 0x75224 (locomotion master) | (0,0/1/2) directly |
  | +0x3E0 | 0x75338 | (0,3) |
  | +0x3E4 | 0x75394 | (0,6) |
  | +0x3E8 | 0x753ec | (0,7) |
  | +0x3EC | 0x75444 | (0,8) |
  | +0x3F0 | 0x754b8 | (0,9) |
  Q43 §3.3's "0x3dc..0x3e8" was off by one word (its start 0x179b0d4 is 0x75224, not a gait handler).
  Device read_words: em001 0x179b0d4..0x179b0e8 = `00075224,00075338,00075394,000753ec,00075444,000754b8`;
  base vtable 0x1733c10..0x1733c20 = the five (0x75338..0x754b8); [C]
- `refs_to {targets:["0x75338","0x75394","0x753ec","0x75444","0x754b8","0x75224"],pointers:true}` →
  **562 refs: 7 `b` + 555 `ptr`**. The 7 tail-calls all target 0x75224 (0x6d61c base + 0xd81c00,
  0xf66b68, 0xf7a35c, 0xf7e698, 0xfb28f4, 0x10a50d0 — other species' clusters); the 555 ptrs are
  vtable slots in ~91 enemy-class vtable copies (0x1733c0c base, 0x179b0d4 em001, 0x179cd9c, …,
  0x181c7c0; list truncated at 500 by the device). No direct call ever targets the five. [C]
- **0x75224 never reaches the five** (disasm): it computes (0,0)/(0,1)/(0,2) and tail-calls
  `0x752e8 b 0x82510` — the five are independent vtable entries, not fall-through code. [C]
- Dispatcher scan (`ldr rX,[rY,#imm]` for imm ∈ {0x1F4 control, 0x224 control, 0x3D8..0x3F0} /
  add-movw materializations, then blx/bx of the same register within 6 insns; G:/tmp/Q53c + session
  log; scan v1's slot filter was buggy and produced a 250k-line artifact, v2 fixed):
  **+0x3E0: 496 loads / 352 blx-bx sites; +0x3E4: 344/179; +0x3E8: 370/259; +0x3EC: 171/53;
  +0x3F0: 194/38.** Positive controls: +0x224 → 14 sites including **0xb9244** (the Q49-proven
  12:0 dispatch — reproduces a known-true site), +0x1F4 → 10 sites. Counts are upper bounds (base
  register per site not individually proven enemy); the two windows below carry the decision. [C]
- **Verified em001-side dispatch windows** (disasm, [C]):
  - State 3's L1 router fn 0xcf2220 (L1 table 0xcf1570+0x54 → stub 0xcf15c4 `b 0xcf2220`):
    ```
    00cf2a48: mov r0,r4 ; 00cf2a4c: bl 0xb0a84      ; gate
    00cf2a50: cmp r0,#1 ; 00cf2a54: bne 0xcf2a6c    ; skip
    00cf2a58: ldr r0,[r4,#0] ; 00cf2a5c: ldr r1,[r0,#992]   ; [vt+0x3E0] = 0x75338 -> (0,3)
    00cf2a60: mov r0,r4 ; 00cf2a64: pop {r4,lr} ; 00cf2a68: bx r1
    ```
    r4 = em (same fn tail-writes (13,0) via `mov r0,r4; mov r1,#13; mov r2,#0; b 0xcf8388`).
  - State 0's router fn 0xcf1688 (L1 0x48 → stub 0xcf15b8 `b 0xcf1688`):
    ```
    00cf1860: ldr r0,[r4,#0] ; 00cf1864: ldr r1,[r0,#988]   ; [vt+0x3DC] = 0x75224
    00cf1868: b 0xcf1884                        ; dispatch (after float test on desc+0x1bc <= 0)
    ...
    00cf187c: ldr r0,[r4,#0] ; 00cf1880: ldr r1,[r0,#992]   ; [vt+0x3E0] = (0,3)
    00cf1884: mov r0,r4 ; 00cf1888: pop {r4,r5,r11,lr} ; 00cf188c: bx r1
    ```
  - The gate: `0xb0a84: add r0,r0,#1200; b 0x950bcc` → `0x950bcc: ldrb r0,[r0,#6];
    0x950bd0: .word 0xe7e00150 (bitfield/media, unrendered by arm32); bx lr` — a flag/bit test on
    **em+0x4B6** inside em001's own handler flow. Normal gameplay condition, not a debug path
    (exact bit semantics [U]: the media word is not rendered; Q-notes say arm32 prints some ubfx/DP
    forms as .word). [C on instructions, [B] on classification]
- The +0x3DC locomotion master also has a dedicated thunk **0x76144** (`ldr r1,[r0,#0];
  ldr r1,[r1,#988]; bx r1`) with **88 refs (86 b + 2 bl)** across all class clusters
  (0x6bbac base, 0xcf3ecc em001 cluster, 0xd21034, …, 0x1120ff0). [C]
- Decision and what would have refuted it: "the five can run in a normal hunt" would be refuted by
  (a) no ldr-imm+blx sites for slots 0x3E0..0x3F0 anywhere — found 352/179/259/53/38 instead;
  (b) all sites behind debug-only guards — the verified sites are em001's own state routers after a
  normal flag-byte test; (c) slot words not pointing at the five — device read_words shows they do.
  Remaining honesty bound: that the gate *fires* (gate==1 at least once per hunt) is a dynamic fact
  not provable statically; the static claim is "dispatched from normal code paths", not "provably
  executes every hunt". [B]
- Cell impact: (0,3) and (0,6) are already in the proven forced set (Q43 §4.2 rows "0:3 … case 0",
  "0:6 … case 2" via interpreter action end; §8.8 confirms the four `0:x` additions); (0,7)/(0,8)/(0,9)
  exceed state 0's L2 max variant 6 (§8.7/§8.8: fall to the default handler, reachable but
  contentless). ⇒ **no change to ≥261**; gu-forced-cells.tsv needs no new rows. [B]

---

## In progress
(none — both items closed as far as static analysis can close them)

## Unknown (residuals, each with the check that would close it)
1. Who (if anyone) writes 5 or 22 into em+0x1053 at runtime: 39 `blx [X+0xA0]` sites enumerated, none
   with an immediate 5/22 in its window. Closing check: interprocedural value tracking of the r1
   argument at those sites (or a live trace on em017). Affects only em017's variant-5 force (§8.5).
2. The gate at 0xb0a84/0x950bcc: which bit of em+0x4B6 it tests (`0x950bd0 .word 0xe7e00150` is a
   bitfield op arm32 cannot render). Closing check: hand-decode the media word (ARM ARM encoding) or
   trace em+0x4B6's writers.
3. The 179/259/53/38 blx/bx counts for slots +0x3E4..+0x3F0 are upper bounds (per-site base-register
   provenance not individually verified). Two +0x3E0 sites are verified on em objects; em001-cluster
   sites exist for +0x3E4 (0xcf5f2c, 0xcf7608, 0xcfc1a8, …) but were not windowed.
4. The two pool words 0x163ebfc/0x163ec0c (data region) have no code ldr-literal referrer found; they
   are likely entries of an offset table consumed via `ldr rX,[pc,rY]` (register-scaled) which no
   available scan shape covers. Closing check: dump the surrounding table and its consumers.

## Self-FalsificationCheck
| hypothesis | test | outcome |
|---|---|---|
| H1 a third writer aliases byte 0x1053 (word/strh/add-built-base) | scanA2 whole-image (4 shapes, barriers, 4/4 positive controls) + ctor strb×5 proof + add-shape probe (5,168 sites, 0 hits) | **not falsified** — no third writer; the 10 word sites are other-class fields (pointer-typed +0x1051 in 4 sites proves different layout) |
| H2 the five gait handlers are dead (vtable-only, never dispatched) | slot-load+blx scan with positive control +0x224 | **falsified** — 352 sites for +0x3E0 alone; two verified inside em001's own state routers |
| H3 the dispatch sites are debug/forced paths | disasm the gates (0xb0a84 → 0x950bcc: flag byte at em+0x4B6) inside state-3/state-0 normal L2 flow | **refuted as stated** — normal code paths; residual: gate firing frequency is a dynamic fact, so the claim is "statically reachable", not "runs every hunt" |
| H4 a "0 hits" could be trusted anywhere | positive controls at every level (device literal_loads = local movw set; scanA2 4/4; scanB reproduces Q49's 0xb9244; refs_to 555/1082 ptr controls) | controls all green; the one true negative (add-shape probe) also carries a scale statement (5,168 sites checked) |
| H5 refs_to "0 references" means unreachable | first two device calls returned 0 because of my decimal conversion error; hex-string rerun returned 562/1082 | **falsified and corrected** — see Difficulties |

## Difficulties
- **scanA1 barrier bug** (~1 iteration): window replay crossed `bx lr`/`bl` boundaries, poisoning
  registers across functions (missed the getter, created the 0xd7b0a4 false positive). Fix: clear
  state after unconditional transfers, kill r0–r3/r12 after bl/blx; re-verified with 4/4 controls.
  Cost: one rewrite + rerun.
- **Decimal conversion errors in device calls** (two void "0 reference(s)" results before the hex
  rerun). Cost: 2 wasted calls. Rule adopted: pass 0x-hex strings to every device.
- **scanB v1 slot-filter bug** printed 47k lines (the `ldr-imm` path never checked slot membership).
  Fix applied in the rerun; artifact G:/tmp artifact 2766 not needed further.
- **No device support for register-offset/memory-shape scans** (the parent's suggested device covers
  movw/ldr-literal only, which cannot see `ldr rX,[vt,#0x3E0]` dispatch) — local scanners were
  required; the device was still used for the cross-checks the parent asked for and for all
  refs_to/read_words.
- **arm32 renders `0x950bd0 .word 0xe7e00150`** (media/bitfield family), leaving the gate's exact
  bit semantics [U]; Q-notes document this renderer limitation.
- The +0xA0 value-source [U] (who writes 5/22) did not close statically despite the 39-site window
  check; recorded with its closing check rather than guessed.
