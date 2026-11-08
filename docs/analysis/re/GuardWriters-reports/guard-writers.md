# guard-writers — does anything set bit 7 of `em[0x1408]`?

Claim under test (published):
> "of 103 immediate bit-ops on `em[0x1408]`, none sets bit 7; four `bic` clear it
> (`0xc3d44/0xc4368/0xc4388/0xc46b4`)" — devlog-20260911-emc.md:24; sec165-correction.md §4;
> review-A-emcsection.md §5; EmcSection report `## Unknown`.

Image: `MHGU-private/main.140.flat.bin`, sha256 `a8cfb11465470184c9ed191ec28283dfb73d2adbcfeb878398f5103f1357d515`
(identical to `MHGU/main.140.flat.bin`, checked by the classifier: `ALT_SHA256 ... equal=true`).
`vaddr = flat - 0x100`. `.text` range examined: `[0x100, 0x13f1dec)`.

## Verdict

**FAIL — the published "no setter" claim is false.** Bit 7 of `em[0x1408]` IS set by
`0xc4b44: orr r0, r0, #128` (encoding `e3800080`), and the result is stored back into the
word by `0xc477c: str r0, [r10, #0]` (`e58a0000`, width 4), where `r10 = em + 0x1408`.

Predicate in words: in the function at `0xc46c8`, if the current EMC section byte
`em[0x72fc]` is not `1`, **or** the current entry byte `em[0x72fd]` differs from the pool
entry returned by `0xb4e58(em,1)`, the code loads the word at `em+0x1408`, ORs `0x80`
into it, and stores it back. That is the section-1 request consumed by the dispatcher's
guard (`0x82950 tst r0,#128` → `0x82984 bfi r0,r1,#7,#2`, bits[8:7]=`10`). The guard is
therefore reachable by construction; the claim's `[U]` ("whether the guard ever fires")
cannot be resolved as "never" from the code.

Exact chain (all from my disassembly):

```
0xc46c8: e92d4ff0  push {r4,r5,r6,r7,r8,r9,r10,r11,lr}
0xc46d8: e1a0b000  mov  r11, r0              ; r11 = em (arg0)
0xc46dc: e3010408  movw r0, #0x1408
0xc46e4: e1a0a00b  mov  r10, r11
0xc46e8: e7fa0000  ldrb r0, [r10, r0]!       ; r10 = em+0x1408; r0 = byte at em+0x1408
0xc46ec: e3100080  tst  r0, #128
0xc46f0: 1a00010e  bne  0xc4b30              ; bit 7 already set -> return
      ...
0xc4b04: e1a0000b  mov  r0, r11
0xc4b08: e3a01001  mov  r1, #1
0xc4b0c: ebffc0d1  bl   0xb4e58              ; r0 = pool entry picked for section 1
0xc4b10: e30712fc  movw r1, #0x72fc
0xc4b14: e7db1001  ldrb r1, [r11, r1]        ; current section byte
0xc4b18: e3510001  cmp  r1, #1
0xc4b1c: 1a000007  bne  0xc4b40              ; section != 1 -> request
0xc4b20: e30712fd  movw r1, #0x72fd
0xc4b24: e7db1001  ldrb r1, [r11, r1]        ; current entry byte
0xc4b28: e1510000  cmps r1, r0
0xc4b2c: 1a000003  bne  0xc4b40              ; entry differs -> request
0xc4b30: ... epilogue / return
0xc4b40: e59a0000  ldr  r0, [r10, #0]        ; r0 = WORD at em+0x1408
0xc4b44: e3800080  orr  r0, r0, #128         ; <-- SETS BIT 7
0xc4b48: eaffff0b  b    0xc477c
0xc477c: e58a0000  str  r0, [r10, #0]        ; writes it back to em+0x1408
0xc4780: ea0000ea  b    0xc4b30              ; return
```

Commands: `mcp__mhgu_re_disasm {"vaddr":"0xc46c8","count":24}`,
`{"vaddr":"0xc4ad0","count":30}`, `{"vaddr":"0xc4760","count":14}`.
I also scanned the whole body (`0xc46f4 c140`, `0xc4924 c44`, `0xc49d0 c110`): `r10` is
written only by `mov r10,r11` (0xc46e4) and the pre-index writeback of
`ldrb r0,[r10,r0]!` (0xc46e8); everywhere else it is a base register. So `r10` still holds
`em+0x1408` at the store, and the value it stores is the word with bit 7 set.
`mcp__mhgu_re_refs_to` on `0xc4b40` (run by the main session) gives only the two conditional
`b` sites above (0xc4b1c / 0xc4b2c), i.e. the setter is live, not dead code.

Why the published scan missed it: the `movw #0x1408` (`0xc46dc`) is **282 instructions /
0x468 bytes before** the ORR, and the value register is `r0` while the field pointer is
`r10` — it is outside the "immediate op on the same register within 10 instructions" rule
on both axes. The published "four `bic`, none sets" list excludes exactly the live setter.

## Confirmed (primary source; command per row)

| # | fact | command |
|---|---|---|
| C0 | **bit-7 SETTER**: `0xc4b44 orr r0,r0,#128` on the word loaded at `0xc4b40 ldr r0,[r10,#0]`, stored by `0xc477c str r0,[r10,#0]`; `r10 = em+0x1408` (`0xc46e4/e8`), `r11 = em` (`0xc46d8`) | disasm `0xc46c8 c24`, `0xc4ad0 c30`, `0xc4760 c14` |
| C1 | 164 `movw #0x1408` materialisations in `.text`; 0 `mov #0x1408`; 0 `ldr` pc-literal | `mcp__mhgu_re_literal_loads {"start":"0x100","end":"0x13f1dec","values":["0x1408"]}` → `164 hit(s)`, all `movw`; classifier `SITES total=164 movw=164 movimm=0 ldrlit=0` |
| C2 | the four published BICs are direct RMWs on the word and **all clear bit 7**: `0xc3d44 bic r0,r0,#0xa0` (bits 5,7), `0xc4368 bic r2,r2,#0x90` (bits 4,7), `0xc4388 bic r1,r1,#0xa0` (bits 5,7), `0xc46b4 bic r0,r0,#0xb0` (bits 4,5,7) | disasm `0xc3d30 c20`, `0xc4340 c30`, `0xc4370 c24`, `0xc4690 c22`; classifier `PUB-BIC ... b7=clear` for all four |
| C3 | known-positive "other bit set on the same word": `0x6f360 movw; 0x6f368 orr r0,r0,#131072` (bit 17) ; `0x8f8fc movw; 0x8f908 orr r0,r0,#268435456` (bit 28); both preserve bit 7. A third one, on the request function itself: `0xc4a0c ldr r1,[r10,#0]; 0xc4a10 mov r0,r1; 0xc4a14 bfc r0,#6,#1; 0xc4a20 orrpl r0,r1,#64; 0xc4a24 str r0,[r10,#0]` conditionally sets bit 6 of the same word | disasm `0x6f350 c20`, `0x8f8e0 c16`, `0xc49d0 c110`; classifier `OP 0x6f368 ... b7=same`, `OP 0x8f908 ... b7=same`, `WRITE 0xc4a24 ... same` |
| C4 | the guard itself clears bit 7: `0x8294c ldr r0,[r6,#0]` (r6 = em+0x1408) → `0x82950 tst r0,#128` → `0x82984 bfi r0,r1,#7,#2`, `r1=2` → bits[8:7]=`10` → `0x8298c str r0,[r6,#0]`; entry `0x82848 bfc r0,#8,#1` touches bit 8 only | disasm `0x82820 c110`; classifier `GUARD-BF found bfc=false lsb=7 width=2 b7=clear` |
| C5 | **more than four immediate bit-7 ops exist**: the corrected classifier lists 12 bit-7-touching immediate ops — 11 `bic` (all clear) + 1 `orr` (C0, set). The seven extra BICs beyond C2 are `0xc3e58 #0xb0`, `0xc3ec0 #0xb0`, `0xc3ed0 #0x90`, `0xc3f5c #0xb0`, `0xc3f7c #0xb0`, `0xc3ff8 #0xa0`, `0xc4090 #0x90`; I hand-verified `0xc3ec0`/`0xc3ed0` (13/17 insns after their `movw`, outside the 10-insn window) and `0xc3f5c`/`0xc4090` | disasm `0xc3e70 c30`, `0xc3f48 c16`, `0xc4078 c14`; classifier `B7OPS count=12` |
| C6 | whole-word store writers exist that the bit-op census cannot see: `0x71940 movw r2,#0x1408; mov r3,#4; str r3,[r0,r2]` (word := 4, clears bit 7); five stores of `0x42C80000` (=100.0f) at `0x464ec0/0x464f58/0x4650b8/0x466a40/0x4a2a48`, each `movw rX,#0; movt rX,#0x42c8; str` (clears bit 7); `0xb8cb0 movw r0,#0x1408; ... ldr r0,[r6,r0]!; and r0,r0,r1` with `r1 = 0x00041006` (`movw #0x1006` @0xb8ca8 + `movt #4` @0xb8cb4) → clears bit 7 | disasm `0x71930 c18`, `0x464eb8 c28`, `0x464f44 c10`, `0x4650a4 c8`, `0x466a30 c8`, `0x4a2a34 c10`, `0xb8ca0 c22` |
| C7 | `0x761e0 movw r0,#0x1408; ldr r0,[r2,r0]!; and r0,r0,r1` with `r1 = 0xEFFF5FFE` (`movw 0x5ffe` @0x761cc + `movt 0xefff` @0x761d4) is a **register-form AND**; mask bit 7 = 1, so it preserves bit 7 — invisible to the published immediate-op scan | disasm `0x761c0 c28`; classifier `OP 0x761e8 and imm=dynamic b7=same` |
| C8 | dest != source immediate op missed by the "same register" rule: `0x97000 movw r0,#0x1408; ldr r0,[r1,r0]!; orr r2,r0,#0x10000000; tst r0,#524288; str r2,[r1,#0]` — bit 28 set, bit 7 preserved | disasm `0x96fe0 c22`; classifier `OP 0x9700c ... b7=same` |
| C9 | byte-level writers/readers of the same word: `0xa1164 movw r0; ldrb r0,[r4,r0]; tst r0,#8` (read, bit 3 of the low byte); `0xad92c movw r1; ldr r1,[r4,r1]; tst r1,#32768` (read); `0x6b4b4 movw r9; ... ldrb r0,[r4,r9]!; tst r0,#2; ... bfc r0,#1,#1; str r0,[r4,#0]` (read bit 1, clear bit 1); `0xadbac ... bfc r0,#2,#1; str` (clear bit 2); `0xc46dc ... ldrb r0,[r10,r0]!; tst r0,#128` (read bit 7) | disasm `0xa1140 c28`, `0xad91c c24`, `0x6b4ec c30`, `0xadb9c c24`, `0xc46c0 c24` |
| C10 | constants that are not addresses: `0x11602b0 movw r0; sub r0,r5,r0; cmp #22; jump table`; `0x267d60 movw r1; cmp r0,r1; beq` | disasm `0x1160280 c24`, `0x267d40 c30` |
| C11 | corrected classifier totals: `RUN sites=164 writes=152 ops=119 bitfields=12 reads=153 escapes=9 dynamic=0 opaque=0`; `SETTERS count=1` (0xc477c); `UNK count=18`; `B7OPS count=12`; `PUB-BIC` 4/4 `b7=clear`; `GUARD-BF ... b7=clear` | `node G:/tmp/EMC/want-guard.mjs > G:/tmp/EMC/want-guard2.out 2>&1` → completed, final totals printed (Main session run, exit 0) |

## Scope of the negative (forms × sites × range)

Enumerated over the whole `.text` `[0x100, 0x13f1dec)` of the image above:

- **Site basis**: every materialisation of the constant `0x1408` — 164 `movw`, 0 `mov #imm`,
  0 `ldr` pc-literal. Each site was followed by a CFG dataflow walk (constants, identity of
  `base+0x1408` pointers, stack-saved pointers, word value and its bit-7 state, calls kill
  `r0-r3/r12` and are checked for pointer escapes). 0 sites hit an undecodable instruction
  while a field pointer/value was live (`opaque=0`).
- **Form (a) immediate bit-ops**: 119 bit-ops on the word were recorded (117 immediate + 2
  register-form). 12 immediate ops have bit 7 in the mask: 11 `bic` (clear) + 1 `orr #0x80`
  (the setter). The other 105 immediate ops have masks without bit 7 and were decided
  `preserve` (`orr`/`and`/`eor`/`bic` cannot change a bit outside the mask).
- **Form (b) register-form ops**: 2 recorded, both `and` (`0x761e8` mask `0xEFFF5FFE`;
  `0xb8cbc` mask `0x00041006`, hand-decoded). `and` cannot set a bit; the second one clears
  bit 7. No register-form `orr`/`eor` with an unknown mask was found.
- **Form (c) bitfield writes**: 12 `bfi/bfc` on the word were recorded. 11 cover bits other
  than 7 (1, 17, 14, 8, 2, 11, 10, 6, 30, 20); the only one covering bit 7 is the guard
  `0x82984 bfi #7,#2` with inserted value 2 → **clears** bit 7.
- **Form (d) whole-word/byte/half stores**: 152 distinct store addresses to `base+0x1408`.
  Verdicts: **1 sets bit 7** (0xc477c, on the request path; on the other path it preserves),
  23 store sites are statically decided clear (10 BIC stores, the guard store, 5
  tool-classified clear whole-word stores, 5 `100.0f` stores, 1 store of 4, plus the
  `0x00041006` mask store); 12 are genuinely data-dependent; the remainder rewrite the
  loaded value unchanged (preserve).
- **Independent cross-check lanes**: a global `bfi/bfc` sweep found 16,587 bitfield encodings
  in `.text`, 3,061 covering bit 7; only `0x82984` lies within 0x400 bytes after a `0x1408`
  site (all others are unrelated data code). The `add #0x1000` + `str #0x408` lane found 274
  `add #0x1000` instructions and 0 stores at `+0x408` (first-stage count is its control).

### The 117 "UNK" from the first run — exact split (as requested)

The first classifier run reported `UNK count=117` because of a detector bug (`Rn == 0` was
treated as "no operand" instead of register `r0`). Corrected split:

- **98** are RMW writes whose final immediate mask provably contains no bit-7 bit
  (`orr #0x10000000` bit 28, `#0x20000` bit 17, `#0x2000`, `#0x8`, `#0x2`, `#0x4000`,
  `#0x40000`, `#0x8000`, `#0x20000000`, `#0x200000`, `#0x1`, `#0x10000`, `#0x380000`,
  `#0x1000`, etc.). These **cannot set or clear bit 7**; they preserve the loaded bit.
  Corrected verdict: `b7=same`.
- **1** is the setter write itself (`0xc477c`), re-decided `b7=set`.
- **18** remain genuinely undecided by the tool (= 98 + 1 + 18 = 117). Of these:
  - **6 are statically known and clear bit 7**: `0x71944` (value `4`) and the five
    `0x42C80000` = `100.0f` stores (`0x464ec0`, `0x464f58`, `0x4650b8`, `0x466a40`,
    `0x4a2a48`), each built by `movw #0` + `movt #0x42c8` (verified individually).
  - **12 are genuinely data-dependent whole-word overwrites**, whose source is another
    field word or a function argument: `0x28d290` (copy of `em[0x1404]`), `0x2a7afc`
    (copy of `[r5+0x1404]`), `0x307604`, `0x30775c`, `0x307ae0`, `0x3ae050`
    (`[r0+136]`), `0x4694a8`, `0x484714`, `0x53be40`, `0x77e1bc`, `0x780440`,
    `0x780484` (copy of `em[0x140c]`). None stores a statically known bit-7=1 value.

The honest bound on the negative is therefore: **one setter found; 12 whole-word overwrites
remain data-dependent; 9 pointer escapes** (below). It is not a bounded zero.

### What remains unexamined

- `ESCAPE` sites where a pointer equal to `em+0x1408` is passed to a callee: `0x761e0` →
  `0xb2d2c` (x2), `0x8172c`, `0xbd184`, `0xba874`; `0x97284` → `0x13efddc`;
  `0x172860` → `0x9d67c`; `0xe45d48` → `0xbc8b0`; `0x10a734c` → `0x10b26a0`. A callee that
  writes through the pointer is invisible to this census (it would not need its own
  `movw #0x1408`).
- The 12 data-dependent overwrites above (set/clear depends on runtime data).
- Constants built by chains other than `movw`/`mov #imm`/`ldr pc-literal` (none found by the
  two independent lanes, but not a proof of absence).
- Whether the setter path actually executes in a given quest/state: the condition is
  `em[0x72fc] != 1 || em[0x72fd] != 0xb4e58(em,1)`, i.e. data-dependent at runtime.

## Controls

- **Pass-control, four published BICs**: corrected classifier prints
  `PUB-BIC 0xc3d44 imm=0xa0 b7=clear`, `0xc4368 imm=0x90 b7=clear`,
  `0xc4388 imm=0xa0 b7=clear`, `0xc46b4 imm=0xb0 b7=clear`. In the first run this control
  FAILED for `0xc3d44`/`0xc46b4` (`b7=same`), which is what exposed the `Rn==0` decoder bug;
  the four hand-disassembled instructions confirm `bic` polarity.
- **Known-positive, other bit of the same word**: `0x6f368 orr #0x20000` (bit 17 set) and
  `0x8f908 orr #0x10000000` (bit 28 set), both `b7=same`; `0x9700c orr r2,r0,#0x10000000`
  (dest != src) also `b7=same`.
- **Known-positive, bitfield**: the guard `0x82984 bfi #7,#2`, src=2 → `b7=clear`.
- **Known-positive, read**: `0xa1164 ldrb + tst #8` and `0xad92c ldr + tst #0x8000` are reads,
  not writes.
- **Known-positive, whole-word value**: `0x71944` stores 4; `0x464ec0...` store `100.0f`;
  both clear bit 7.
- **Must-fail controls** (must NOT be counted as bit-7 touching): `0x82848 bfc r0,#8,#1`
  (bit 8), `0xb8cd0 and r0,r0,#0x40000000` (bit 30), `0xadbac bfc #2` (bit 2),
  `0x6f388 bfc #17`. The classifier's `BF`/`OP` lists keep all of them out of the
  bit-7-touching set.

## Unknown

- Runtime: whether the request path (C0) fires in a given battle (condition is data).
- The 12 data-dependent whole-word overwrites, and any write through the 9 escaped pointers.
- Initial value of the word (save/profile/data) before any code writes it.

## SelfFalsificationCheck

- **H1: "the four bic sites are the only bit-7-touching ops".** Falsified twice: (i) the
  corrected classifier lists 12 immediate bit-7 ops (11 BIC + 1 ORR), with at least six BICs
  outside the published 10-instruction window (`0xc3ec0`, `0xc3ed0`, `0xc3f5c`, `0xc3f7c`,
  `0xc3ff8`, `0xc4090`, plus `0xc3e58`); (ii) the ORR at `0xc4b44` sets bit 7 and is 282
  instructions from its `movw`.
- **H2: "the word is only touched by RMW bit-ops".** Falsified by the whole-word stores of
  `4`, `100.0f`, `0x00041006`-masked value, and parameter values.
- **H3: "the 103-site scan covers every bit-op form".** Falsified by `0x97000` (dest != src),
  `0x761e0`/`0xb8cbc` (register masks), `0x82834`/`0x82984` and the `bfc` family (bitfields),
  and by the 10-instruction window limit.
- **H4: "the guard bit is never set, so the guard is dead".** Falsified by C0: the setter is
  reachable from two conditional branches of its block (`refs_to 0xc4b40` gives exactly those
  two `b` sites), and the guard consumes it.
- **H5: "my classifier's zero means zero".** The first run's `SETTERS count=0` was a
  detector artifact, not evidence. The must-pass `PUB-BIC` control failed and exposed
  `Rn == 0` being confused with "no operand"; after the fix the same script reports
  `SETTERS count=1`, `UNK count=18`, all four `PUB-BIC ... b7=clear`. No zero from the
  first run is quoted as evidence anywhere in this report.
- **Alternative setter hypotheses checked and rejected**: `strb 0x80` to `em+0x1408` (no
  such store in 152); `bfi #7,#1` with value 1 (none; the only bit-7 bitfield inserts 0);
  register `orr` with a mask containing 0x80 (none found; the only register ops are two
  `and`s); a whole-word store of a default with bit 7 set (none; the known defaults are 4,
  100.0f, 0x00041006-masked).

## Difficulties

- **Own detector bug, caught by the must-pass control**: the first classifier run treated
  `Rn == 0` as "no operand" instead of register `r0`, so every `bic/orr r0,r0,#imm` was
  misclassified. `PUB-BIC 0xc3d44 ... b7=same` in `want-guard.out` is the evidence; the
  fixed script rerun (`want-guard2.out`) is authoritative. The hand-disassembled setter (C0)
  never depended on the classifier.
- No `run`/bash in this session: the classifier and probes were executed by the main
  session; MCP `disasm` prints `bfi/bfc` as `.word 0xe7c8....`, so bitfield instructions were
  decoded by hand from the ARM encoding.
- The tool leaves 12 whole-word writes as data-dependent and does not resolve register masks
  built before the `movw` site (`0x761e8`, `0xb8cbc`); the affected verdicts are stated as
  polarity-safe (`and` cannot set) or hand-corrected (the `0x00041006` mask clears bit 7).
- MCP `literal_loads` prints immediates in decimal; all values above were converted to hex
  and spot-checked against the raw encodings (`#176=0xb0`, `#144=0x90`, `#131072=0x20000`,
  `#268435456=0x10000000`).
