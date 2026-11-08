# EMC section selection in the MHGU interpreter — report (EmcSection)

Question: what does an EMC `section` index mean at runtime, and which section does the pool-dispatch path actually walk?
Prior claim to test (devlog-digest-C.md:159): "池派发只会跑节 1" (pool dispatch only runs section 1).
Tags: [A] verified (vaddr + quoted instruction words), [B] inferred, [U] unknown.

## Confirmed

- [A] Claim location corrected: the "池派发只会跑节 1" line is at `MHRS/docs/reference/devlog-digest/devlog-digest-C.md` (not MHGU/docs/...). Context of the claim (same file, ~L159): 节号模型: em+0x72fc = 脚本槽号; resolveState 0x825fc (18-item jump table 0x82650) maps slot 1→pending stack, 2/18→em+0x7340, 10→em+0x73c0; 节 10 子程序调用、节 2 停驻、节 12 tick 级覆盖; **池派发只会跑节 1**; 派发在 fn 0x8282c (0x829f4/0x82a08); 0x51d70 与选节无关.
- [A] `emc.mjs` header comment + `MHGU/docs/reference/formats/emc.md`: EMC header "EMC\0"|u32 ver 0x20120804|u32 nsec(21)|0; 16 B section descriptors @0x10 {count, offset, 0, 0}; per-section entry tables; loader 0x520a0 allocates a pointer array per section at `obj+0x68+4*s` and stores base+offset per entry; accessor `0x51d70(cmd,i)` returns `[cmd+0x78][i]` if `i < [cmd+0x6c]` (per emc.md; **but see the correction in Unknown: that accessor serves a different object class, FOR-SE-REPLY §202/§220**). Interpreter 0x82f80 called from 0x82f54; loop 0x83770 gets length via 0x50ce0; 256-way op jump table at 0x837ac; `ip += length` at 0x855ac; op>0xa6/0xff ends script (branch 0x83d80). `sub` = `[ctx+0x1428]` where ctx = arg0 of 0x82f80.
- [A] main binary located: `MHGU-private/main.140.flat.bin` (also a copy at `.tmp/mhgu/extract/exefs-0eb5/`).

## Decode log

Instruction-level decodes kept in the order they were produced, because the corrections in them are
part of the evidence (each superseded reading is marked as withdrawn rather than deleted).

### resolveState 0x825fc — decoded [A]
```
0008262c: e5d41000  ldrb r1, [r4, #0]      ; slot byte (initially em[0x72fc])
00082630: e2414001  sub r4, r1, #1
00082634: e3540011  cmp r4, #17
00082638: 8a00001b  bhi 0x826ac            ; byte-1 > 17 (byte<1 or byte>18) -> return byte
0008263c: e1a04104  mov r4, r4, lsl #2
00082640: e28f5008  add r5, pc, #8         ; table at 0x82650
00082644: e7946005  ldr r6, [r4, r5]
0008264c: e086f005  add pc, r6, r5
```
Table 0x82650 (18 words, index = byte-1, base 0x82650): byte 1 → 0x82698 (pop: builds `r4 = em + 0x7350 + 8*(em[0x734c]-1)`, then branches back to 0x8262c); bytes 2 and 18 → 0x8262c with `r4 = em+0x7340`; byte 10 → 0x82628 (`r4 = em+0x73c0`); bytes 3-9 and 11-17 → 0x826ac return. Return at 0x826ac is `mov r0, r1` where r1 is **the byte last read at r4[0]** (0x8262c; the pop path only rewrites r4 at 0x82698-0x826a8 and jumps back to 0x8262c), and `sub r4, r1, #1` at 0x82630 writes the *table index* into r4, never r1 ⇒ **resolveState returns that byte unchanged**; "returns slot-1" is withdrawn. Matches devlog mapping (1→pending stack, 2/18→em+0x7340, 10→em+0x73c0). With the byte being 0-based (see the dispatch table below) the coverage is complete rather than mysterious: bytes 0, 19 and 20 take the return path unchanged, and the format has exactly 21 sections.

### accessor 0x51d70 — decoded [A]
```
00051d78: e592306c  ldr r3, [r2, #108]     ; [cmd+0x6c]
00051d80: 912fff1e  bxls lr                ; i >= [cmd+0x6c] -> return 0
00051d84: e5920078  ldr r0, [r2, #120]     ; [cmd+0x78]
00051d88: e7900101  ldr r0, [r0, r1, lsl #2]
```
So 0x51d70(cmd,i) = [cmd+0x78][i] bounded by [cmd+0x6c]. Under the loader layout decoded below this cannot be the rEnemyCmd EMC object: `cmd+0x78` would be section 4's array pointer and `cmd+0x6c` a pointer used as a count, **resolved**: the accessor keys a different object, but not `em[0x2588]` — (1) the accessor's own arguments are (`[host+0x2588]`, a byte index) — not `em`; (2) `host` is the thunk `0x495e8`'s `arg0`, and that thunk's `arg1` (not `arg0`) is `em` — the two must not be conflated [C]; (3) the host slot is reached as `*(0x1838bc0) = 0x1851fe0`, a `.bss` pointer whose target is not inside the image, so the singleton address itself stays [B]; `+0x2588` has two writers in the whole image -- ctor `0x68828` and dtor `0x688ec` (fn `0x68888`, which zeroes the field) -- and a writer count cannot prove the dynamic type of `this` anyway; the load-bearing facts are the ctor's single startup call site `0xb6f0` (via `0xb450 <- 0xacd0`) and the dtor's four `bl` callers (FOR-SE-REPLY §283). So no `em` object is ever given that field. The container is the resource `rEmSizeYureTbl` (`emyure`, id `0xde1f`, typeHash `0x1800eb37`, nameHash `0x081b9089`), i.e. a per-monster size/yure table, not the EMC command object (FOR-SE-REPLY §270/§273).

### em[0xba47] bit6 — the armed record/path gate [A, semantics B]
The byte `em[0xba47]` has **exactly four access sites in the whole image, all readers**: `0x97648`, `0xb4b3c`
and `0xb50fc` test bit 6 (`tst r0,#64`), and `0xc3c4c` tests bits 1/2/5 (`tst #38`). There is no byte-lane
writer; the bit is written through the **word at `em+0xba44`**, where bit 30 is byte 0xba47's bit 6:

```
0xb4a90 ldr r1,[r5,r0]!        ; r5 pre-indexed to em+0xba44
0xb4a94 mov r0,#4
0xb4a98 bfc r1,#30,#1          ; clear word bit 30 == byte 0xba47 bit 6
0xb4a9c strd r0,[r5,#-4]       ; em+0xba40 = 4 (r0); em+0xba44 = r1
```

Callers of that clearer: `0xad5c8`, `0xba828`. A separate `orr #0x26000000` at `0x951d0` sets bits 1/2/5 of
the same byte, matching the `tst #38` consumer.

What bit 6 gates [B]: when it is set, the dispatcher `0xb50f0` walks the per-monster record table at
`em+0xb800` (entry base `[em+0xb880]`, count `[em+0xb884]`, index from `em+0xba48`, count from
`em+0xba4c`) and returns a record pointer instead of the default triple `em+0xb9e0`; guard `0x97624`
runs its 300.0/200.0 distance test only with bit 6 set; and guard `0xb4b10` fills `sub+0x1d0..0x1d8`
from `em[0xb9e0..0xb9e8]` and zeroes `sub+0x1dc` on the bit-6-clear path. (FOR-SE-REPLY §253/§272)

### dispatch head 0x8282c — first observations [A]
- Args (em=arg0, arg1∈{0,1,2}); re-decoded 2026-11-09 over the whole body 0x8282c..0x82c3c. Prologue: `mov r4,r0`; `movw r0,#0x1408`; `cmp r5,#2`; `ldr r0,[r6,r0]!` (0x82844) latches **r6 = em+0x1408** and loads the **word** em[0x1408]; `bfc r0,#8,#1` (0x82848, printed as `.word 0xe7c8041f`) clears **bit 8**; `str r0,[r6]` (0x8284c) writes it back; `popeq` at 0x82850 returns when arg1==2. There is **no** store to em[arg1] anywhere in the function — r5 is used only by `cmp r5,#2` (0x82840) and `cmp r5,#1` (0x82ba0) — so the earlier "copies em[0x1408] halfword into em[arg1]" was a misdecode of the two `bfc`/`bfi` words and is withdrawn.
- Three fixed-slot paths write `strh r2, [em+0x72fc]` with r2 = 13 (0x8288c, entry ptr [res+0x34]), 8 (0x828f0, [res+0x20]), 14 (0x8292c, [res+0x38]); each then `ldr r0, [r0,#0]` (0x82934) and `str r0, [em+0x72f8]` (0x8293c), `strb #0,[em+0x7304]` (0x82948). res = em[0x72f4].
- Guarded path (0x8294c-0x829b0): `ldr r0,[r6,#0]` (r6 = em+0x1408) then `tst r0,#128` (0x82950) gates it, so the tested bit is **bit 7 (0x80)**, and `em[0x7420]` (byte) must be non-zero (0x82958-0x82964). Body: `em[0x1418]=0`, `em[0x1414]=0`; `bfi r0,r1,#7,#2` with r1=2 (0x82984, printed as `.word 0xe7c80391`) writes bits 8:7 = `0b10` (clears bit 7, sets bit 8) and `str r0,[r6]` (0x8298c) stores it; then em[0x72fc]=1 (`strb r1,[r6,r0]!`, 0x82998), em[0x72fd]=`bl 0xb4e58(em,1)` (0x829a4, stored 0x829b0), then the double-indexed load at 0x829f4/0x82a08 (see below).
- Double-indexed load [A]:
```
000829e4: e7942000  ldr r2, [r4, r0]          ; r2 = em[0x72f4]
000829f0: e5d60000  ldrb r0, [r6, #0]         ; r0 = em[0x72fc]
000829f4: e7922100  ldr r2, [r2, r0, lsl #2]  ; r2 = [em72f4 + 4*em[0x72fc]]
00082a00: e7d41001  ldrb r1, [r4, r1]         ; r1 = em[0x72fd]
00082a08: e7922101  ldr r2, [r2, r1, lsl #2]  ; r2 = [r2 + 4*em[0x72fd]]
00082a10: e7842003  str r2, [r4, r3]          ; em[0x72f8] = entry ptr
```
This **is** the pool path, not a residual branch: em[0x72fc] was just set to 1 by the guard body (0x82998) and the whole block is conditional on `em[0x1408] & 0x80` plus `em[0x7420] != 0` (0x82950-0x82964). There is no second pool selector elsewhere in the function.


### em[0x72f4] = rEnemyCmd + 0x68 ⇒ em[0x72fc] IS the 0-based section index [A]
`0x7109c(em)` (called at 0x825bc in the init path that sets em[0x72f4]):
```
0007109c: e30715f4  movw r1, #0x75f4
000710a0: e7900001  ldr r0, [r0, r1]   ; r0 = em[0x75f4]
000710a8: 12800068  addne r0, r0, #104 ; r0 += 0x68
```
Loader 0x520a0 stores the loaded EMC buffer at obj+0x64 (0x52190 `str r0,[r1,#100]`) and, per section s = 0..20, allocates `(count+1)*4` bytes and stores the pointer at `obj+0x68+4*s`:
```
00052208: e081110a  add r1, r1, r10, lsl #2   ; r1 = obj + 4*s
0005220c: e5a10068  str r0, [r1, #104]!       ; obj[0x68 + 4*s] = section-s entry-ptr array
```
Therefore in 0x8282c's guarded path:
```
000829e4: e7942000  ldr r2, [r4, r0]          ; r2 = em[0x72f4] = cmd+0x68
000829f0: e5d60000  ldrb r0, [r6, #0]         ; r0 = em[0x72fc]  (0..20)
000829f4: e7922100  ldr r2, [r2, r0, lsl #2]  ; r2 = section[em[0x72fc]] entry-ptr array
00082a00: e7d41001  ldrb r1, [r4, r1]         ; r1 = em[0x72fd]
00082a08: e7922101  ldr r2, [r2, r1, lsl #2]  ; r2 = entry-ptr array[em[0x72fd]]
00082a10: e7842003  str r2, [r4, r3]          ; em[0x72f8] = script ptr
```
⇒ **em[0x72fc] = section index (0-based), em[0x72fd] = entry index (0-based), both used directly as array subscripts.** Correction to my earlier note: resolveState's non-special return is `mov r0, r1` (0x826ac) — it returns the slot byte unchanged, not byte-1.

### Fixed-entry dispatch paths in 0x8282c also write the section index [A]
Each checks `*(cmd+0x68+4*sec)` non-null (i.e. the section's array exists), then sets em[0x72fc]=sec and em[0x72f8]=**entry 0**:
- sec 13: `ldrne r1,[r0,#52]` (0x82878, [cmd+0x9c]=0x68+4*13), `strh #13` 0x8288c, `ldr r0,[r0,#52]` 0x82890 → 0x82934 `ldr r0,[r0,#0]` → em[0x72f8].
- sec 8: `ldrne r2,[r1,#32]` (0x828dc, [cmd+0x88]=0x68+4*8), `strh #8` 0x828f0.
- sec 14: `ldrne r2,[r1,#56]` (0x82918, [cmd+0xa0]=0x68+4*14), `strh #14` 0x8292c.
- sec 19: `ldr r0,[r1,#-232]` (0x82aa8 → em[0x72f4]), `ldr r2,[r0,#76]` (0x82abc, [cmd+0xb4]=0x68+4*19), `strh #19` 0x82ae4.
- guarded/pool path: `strb r1,[r6,r0]!` 0x82998 with r1=1, r0=0x72fc ⇒ em[0x72fc]=**1**, em[0x72fd]=bl 0xb4e58(em,1) (0x829a4) ⇒ section 1 entry = runtime pool pick.
- sec 9 path (0x82a44-0x82a70, store at 0x82cc8): `movw r0,#0x72f4`; `mov r7,r4`; `ldr r0,[r7,r0]!` (`r0 = em[0x72f4]`); `ldrne r0,[r0,#36]` (0x82a54, offset 4*9 = 36 relative to em[0x72f4], i.e. obj+0x8c) is the section-9 existence test; if the gate `0xa1fc8(em,0x20)` returns not-1 (0x82a68/0x82a70) the store `strh #9` at 0x82cc8 runs, else the dispatcher takes the 0x82cd4 + recursive 0x8282c(em,1) branch instead.

### The interpreter runs em[0x72f8]; it reads the section byte only for a preamble call [A]
Interpreter loop: `ldr r0,[r4,#0]` (ip), length 0x50ce0, op dispatch (0x83788-0x837a8); end branch 0x83d80 checks `*ip==0xff` twice then `bl 0x8282c` (0x83dac) with r1=1 — i.e. **on script end the dispatcher 0x8282c picks the next (section, entry)**. Wrapper 0x82f54 stores result and optionally zeroes em[0x72f0]. The interpreter *does* read the byte once, at 0x8316c (`movw r1,#0x72fc; ldrb r1,[r8,r1]` with r8 = em), but never to select a section: `sub r2,r1,#3; cmp r2,#3; bcs 0x831b0` sends bytes 3-5 down one arm that calls `bl 0xc6e14(em, 1, 2, [em+0x250])` when `[em+0x368] != 0xff` and `(4,0,0)` otherwise, and 0x831b0 (`cmp r1,#6; cmpne r1,#17`) sends bytes 6 and 17 down the `(4,0,0)` arm; every other byte falls through to 0x831d8. So the byte is an enum for a preamble call, not a selector. Apart from that read, the fields are only read/written by (a) dispatcher 0x8282c and the second dispatcher in the 0x82e30 function, (b) opcode handlers / AI helpers that write the triple (scan below), (c) resolveState 0x825fc which walks the section byte to find where to save/restore it.

### Section 19's only static writer, and why no layer rejects 4/16 [A]

The single store that puts **19** into the section byte is `0x82adc movw r1,#0x72fc` / `0x82ae0 mov r3,#19` /
`0x82ae4 strh r3,[r4,r1]` — a half-word store that also zeroes `em[0x72fd]`. (A nearby `mov r2,#19` at
`0x8ba60` is *not* a section writer: it targets `r10+0xb9f0`.) So a writer above the dispatchers' bound of
18 exists, which is why writer coverage and dispatcher coverage must not be conflated.

`em[0x72fd]` is not an independent entry selector: it is the second byte of an 8-byte lane slot that is
pushed and popped together with the section (`[state, entry, dword]`), and the pop path applies **no
section constraint** at all. The redirector `fn 0x825fc` likewise passes states 4 and 16 straight through,
and all twelve `bl 0x825fc` consumers only compare the returned value against small integers (≤18).
⇒ Nothing rejects 4/16; the only reason they are never selected is the absence of a static writer
(FOR-SE-REPLY §280).

### (section, entry) writer patterns outside 0x8282c [A]
- 0x8b7c0 area — pending-stack save then section 1 (pool resume):
```
0008b7c0: eb00a5a4  bl 0xb4e58            ; pool pick
0008b7d8: e7f21001  ldrb r1, [r2, r1]!    ; r1 = em[0x734c] (pending depth)
0008b7f0: e7da2002  ldrb r2, [r10, r2]    ; r2 = em[0x72fc]
0008b7f8: e7c12003  strb r2, [r1, r3]     ; pending[k] = {sec, entry, ip...} at em+0x7350+8k
0008b834: e30722fc  movw r2, #0x72fc
0008b838: e3a03001  mov r3, #1
0008b83c: e7ca3002  strb r3, [r10, r2]    ; em[0x72fc] = 1  (SECTION 1)
0008b844: e7ca0002  strb r0, [r10, r2]    ; em[0x72fd] = entry
0008b84c: e5911004  ldr r1, [r1, #4]      ; r1 = section-1 array ([cmd+0x6c])
0008b850: e7911100  ldr r1, [r1, r0, lsl #2]
0008b854: e78a1002  str r1, [r10, r2]     ; em[0x72f8] = entry script
```
- 0x8f690 area — section 2 with a LOCAL script buffer (not cmdtbl):
```
0008f68c: eb0095f1  bl 0xb4e58
0008f694: e3a02002  mov r2, #2
0008f69c: e7c42001  strb r2, [r4, r1]     ; em[0x72fc] = 2  (SECTION 2)
0008f6a4: e7c45001  strb r5, [r4, r1]     ; em[0x72fd] = r5
0008f6ac: e0842001  add r2, r4, r1        ; r1 = 0xba34
0008f6b0: e7842003  str r2, [r4, r3]      ; em[0x72f8] = em+0xba34 (enemy-local buffer!)
```
⇒ em[0x72f8] may point into the enemy object (built-in park/stop script), decoupled from cmdtbl; em[0x72fc]=2 here is the section id recorded for state save/restore, not a cmdtbl subscript in this path. In the sibling sites (0x91554, 0x94324 and five more; the earlier census build listed them as `no immediate before store`, the current one resolves them) the section byte comes from a register instead of an immediate, and that register is set outside the 40-instruction window, so which section id they record is [U]; in the two of them read for this report the script pointer is the same enemy-local buffer `em+0xba34`, so the byte is bookkeeping there too.


### Loader 0x520a0 object layout — 21 section arrays confirmed [A]
- Magic check at 0x52138-0x5215c: `movw r1,#0x4d45; movt r1,#0x43` ("EMC\0" LE) and version 0x20120804; buffer copy stored at obj+0x64 (0x52190 `str r0,[r1,#100]`).
- Section loop bound: `00052348: e35a0015 cmp r10, #21` — exactly 21 iterations (s = 0..20).
- Per section: alloc (count+1)*4 bytes (`mov r0,#4; umull` @0x521e4-0x521e8), store ptr:
```
00052208: e081110a  add r1, r1, r10, lsl #2   ; r1 = obj + 4*s
0005220c: e5a10068  str r0, [r1, #104]!       ; obj[0x68+4*s] = section-s entry-ptr array
```
- Fill: each slot i = `file_base + entry[i].offset` (script ptr), last slot null. r6 walks section descriptors with `ldr r8, [r6, r10, lsl #4]!` (0x521d4, 16 B stride).
- ⇒ rEnemyCmd (0xC0 B) = {+0x64 file copy, +0x68..0xBC = 21 section-array ptrs}. Note cmd+0x6c = section **1**'s array ptr and cmd+0x78 = section **4**'s array ptr under this layout — so emc.md's accessor line "0x51d70(cmd,i) = [cmd+0x78][i] bounded by [cmd+0x6c]" cannot describe the rEnemyCmd EMC object as loaded here (pointer-as-bound is nonsense); 0x51d70 must belong to a different object or emc.md's line is stale. Its call site 0x6852c passes `[G+0x2588]` where G is the startup singleton `*[0x1851fe0]` (not `em`; FOR-SE-REPLY §270/§273) and reads the result as {+8 count, +20 ptr} — structured data, not script bytes. Not central to the section question; flagged for emc.md correction.

## Dispatch table (decoded 2026-11-09)

`0x8282c(em, arg1)` is the main section selector. Other statically visible selector sites exist and
are **not** decoded here: the per-tick runner at 0x82ddc/0x82e30 (section 12, extra row below) and
the `0x7f4xx-0x7fbxx` family, which **saves and restores** the selection frame instead of selecting
(FOR-SE-REPLY §223-§227); the writes of 3/5/6/7/10/11/17 come from the `strh`-immediate sites below
(`0x87a94` is **not**
one of them: it loads the section and entry bytes and stores them into `em+0x73c0/+0x73c4`, i.e. a
save, corrected 2026-11-09 after hand-decoding)
(CensusReview's finding; listed in the enumeration below). The body `0x8282c..0x82c3c` was read
instruction by instruction for this pass, so every store in that function is accounted for. (A value
could still be written through the `&em[0x72fc]` pointer cached at `[sp,#356]` by 0x83618; that lane
is dynamic and is listed under Unknown.)
`cmd` below means `em[0x72f4]`, a pointer to `rEnemyCmd+0x68` (0x7109c:
`ldr r0,[em+0x75f4]; addne r0,r0,#104`), so `[cmd+4*s]` is section s's array pointer and `[cmd+0x34]`
is `obj+0x9c`: the decode-log bullets above write the same slots relative to the object base. `ctx`
means `[em+0x1428]` = the interpreter's `sub`, the actor state-machine base — for a monster that is
the enemy AI runtime context, but the layout is shared by player/otomo/NPC actors
(`MHGU/docs/reference/formats/emc.md:51`; `MHGU/docs/analysis/code/coverage/precision-A.md:111`).

**The section byte is 0-based.** The loader 0x520a0 fills `obj+0x68+4*s` for `s = 0..20`
(`cmp r10,#21` at 0x52348), and the dispatcher indexes that pointer with the byte directly:
`ldr r2,[em+0x72f4]` (0x829e4), `ldrb r0,[em+0x72fc]` (0x829f0), `ldr r2,[r2, r0, lsl #2]`
(0x829f4). Section 13 is therefore array 13, not array 12, and the same holds for the fixed paths
(`[cmd+0x34]` = `4*13`, `[cmd+0x20]` = `4*8`, `[cmd+0x38]` = `4*14`, `[cmd+0x24]` = `4*9`,
`[cmd+0x4c]` = `4*19`). [A]

**`strh` writes both bytes.** Every fixed selection is one `strh r2,[r4,#0x72fc]` with r2 = the
section number (0x8288c = 13, 0x828f0 = 8, 0x8292c = 14, 0x82ae4 = 19, 0x82c5c = 0, 0x82cc8 = 9),
so the halfword store sets `em[0x72fc]` = section **and** `em[0x72fd]` = 0 (little-endian: low byte
at the lower address). That is why the fixed paths always start at entry 0, while the pool path
writes the two bytes separately (`strb` at 0x82998 and 0x829b0). [A]

**Nested calls save the whole selection frame.** Before a nested script call (`bl 0x8dee0`) the
0x7e5xx-0x7fbxx family snapshots `em[0x73b4]` = section, `em[0x73b5]` = entry and `em[0x73b8]` =
script pointer, then gates the call on `0x82538(em,0)` (a `[em]->0x3F4` virtual call plus an action
byte test `em[0x73e0] == 13`); the restore side is `0x8dc74-0x8dc90` plus the common tail `0x8debc` (a **third** entrance feeds the same tail: the pending-stack pop at `0x8de64-0x8de98`; re-audit B)
(`em[0x73b8] -> em[0x72f8]` through an `add`-folded address). So those siblings **consume** the
section byte, they never select one (FOR-SE-REPLY §223-§227). [A]

| # | predicate, in code order (first match wins) | section | evidence |
|---|---|---|---|
| 1 | `*(f32*)(em+0x758c) > 0`, `cmd` non-null and `[cmd+0x34]` non-null | **13** | 0x82854-0x82894 |
| 2 | `*(f32*)(ctx+0x59c) > 0` **or** `*(f32*)(ctx+0x5a4) > 0`, `[cmd+0x20]` non-null | **8** | 0x82898-0x828f8 |
| 3 | `*(u8*)(em+0x73e0) == 16`, `[cmd+0x38]` non-null | **14** | 0x828fc-0x82930 |
| 4 | `*(u8*)(ctx+0x505) == 3`, `[cmd+0x24]` non-null, and `0xa1fc8(em,0x20) != 1` | **9** | 0x82a38-0x82a70, 0x82cac-0x82cd0 |
| 5 | `*(u8*)(em+0x73dc) != 0` (consumed: zeroed at 0x82acc), `[cmd+0x4c]` non-null | **19** | 0x82a9c-0x82b00 |
| 6 | `cmd` non-null and `[cmd]` (the section-0 array) non-null | **0** | 0x82c40-0x82c88 |
| - | none of the above | 0, entry 0, **script = null** | 0x82c8c-0x82ca8 |
| 7 | **guard override**, applied after any hit of 1-6: `(em[0x1408] & 0x80) != 0` and `*(u8*)(em+0x7420) != 0` | **1**, entry = `0xb4e58(em,1)` | 0x8294c-0x829b0 |

Section 12 is selected in a **different function** and is the one target the table above cannot express:

| dispatcher | predicate | section | evidence |
|---|---|---|---|
| **second** — the per-tick runner whose body starts 0x82e30 (the same block appears at 0x82ddc) and which calls the interpreter at 0x82f54 | `[em+0x72f4]` non-null, `[cmd+0x30]` (= 4*12, i.e. obj+0x98) non-null, and `bl 0xb6f0c(em,0) == 1` | **12**, entry 0 | 0x82ed8-0x82f40 |

Sections **18** and **20** are not in either table (both decoded 2026-11-09, FOR-SE-REPLY §198/§199):

| where | predicate | section | evidence |
|---|---|---|---|
| interpreter periodic check 0x836a8 (sole entry `0x86278 b`) | `[[[em[0x72f4]]]]` matches, bit 3 of `em[0xb7c0][1]`, `0x82020(em,16) == 1`, `[cmd+0x50]` (= 4*20) non-null | **20**, entry 0 (dynamic `strb` at 0x83704) | §198 |
| fn 0x8d854, two arms (gate verified on the first, 0x8da20-0x8da40: `sqrt(d) > s18`) | after the gate: action 19 is set (`bl 0xc6e14(em,5,19,0,0)`), `bl 0xc46c8`, `bl 0xb4e58(em,1,·)`, then `em[0x72f8]` is replaced by the embedded block `em+0xba34` | **18**, entry 0 (first arm) / r7 (second) — static `strb` at 0x8da90 / 0x8dd7c | §199 |

Reading of the second dispatcher (all [A], windows 0x82df0-0x82f60):

- Preconditions: `em[0x72f8]` (script) must be non-null (0x82df8; if null it jumps straight to the
  function's return at 0x82f74) and the **f32 at `em[0x7300]`** must be `<= 0` (0x82e04-0x82e14,
  else `bl 0x72128(em, 1.0f)` and return).
- It then runs its own copy of the resolver: 18-word table at **0x82e7c**, base 0x82e7c. Byte 1 → pop
  pending frame (0x82ec4); 2 and 18 → re-read `em+0x7340`; 10 → re-read `em+0x73c0` (0x82e54
  `mov r0,r1`, r1 = em+0x73c0); **byte 12 → 0x82f44, i.e. skip the gate**; every other value, and any
  byte outside 1..18 (`bhi` at 0x82e64), falls to **0x82ed8**.
- At 0x82ed8: cmd null or `[cmd+0x30]` null → 0x82f44; else `bl 0xb6f0c(em,0)` (0x82efc), and only
  `== 1` continues. Then `mov r1,#12` (0x82f1c), `strb r1,[r8]` with r8 = em+0x72fc latched at
  0x82e40 → **em[0x72fc] = 12** (0x82f24), em[0x72fd] = 0 (0x82f2c), em[0x72f8] = `[cmd+0x30][0]`
  (0x82f30-0x82f38), em[0x7304] = 0 (0x82f40), then it falls into the interpreter wrapper at 0x82f44.
- No `em[0x1408]` test exists in this path, so the guard (row 7) does **not** apply to section 12.
- This also explains the devlog's "节 12 tick 级覆盖" (devlog-digest-C.md:159): section 12 is the
  per-tick override, not a script-level selection. [B for the devlog match, A for the code]
- With it, the set of sections the code can actually select is **0/1/8/9/12/13/14/19**, plus the two
  entries decoded later: **20** (interpreter periodic check 0x836a8, gated by `[cmd+0x50]` non-null,
  FOR-SE-REPLY §198) and **18** (fn 0x8d854's distance-gated arms that also swap the script pointer to
  the embedded block `em+0xba34`, §199) — so the complete set is **0/1/8/9/12/13/14/18/19/20**, with
  18/20 living outside the two dispatcher tables above.

Consequences read off the same window:

- Hits 1-6 store `em[0x72f8] = section_array[0]` (`ldr r0,[r0,#0]` at 0x82934, or in-line for
  section 19 at 0x82af4), clear the byte `em[0x7304]` (0x82948), and then fall into the guard test at
  0x8294c. So the guard can override anything chosen in this function, including a successful
  13/8/14/9/19/0 selection; it cannot override section 12, which is chosen in the other function and
  has no `em[0x1408]` test.
- Hit 7 is the **pool** path: it additionally copies `em[0xba60]/0xba64/0xba68` into
  `ctx+0x1d0/0x1d4/0x1d8` and zeroes `ctx+0x1dc` (0x829b4-0x829dc; r2 = `em[0x1428]` there, not
  `cmd`), then does the double-indexed load `section_array[em[0x72fd]]` (0x829f4, 0x82a08) and
  clears `em[0x7304]` (0x82a1c). [A]
- The two hand-decoded words are the guard's flag updates and they act on **`em[0x1408]` only**:
  0x82848 `bfc r0,#8,#1` clears bit 8 on *every* call (the early return for arg1==2 happens after
  it), and 0x82984 `bfi r0,r1,#7,#2` (r1 = 2, 0x82980) writes bits 8:7 = `0b10`, i.e. clears bit 7
  and sets bit 8, inside the guard. The guard then tests bit 7 on the **reloaded** word, so it sees
  bit 7 as it stands when the dispatcher runs.
- Section 9 has a split body: when the gate `0xa1fc8(em,0x20)` returns **1** the dispatcher does
  *not* select section 9. It calls `0x82cd4(em)` and then either jumps into the guard test (when
  `em[0xba44] & 2` is set) or re-enters itself with `bl 0x8282c(em,1)` (0x82a74-0x82a98). [A]
- Epilogue 0x82b0c-0x82c3c: calls `[[em+0x7307]+768]` with em as `this` (0x82b0c-0x82b20; the
  section-0 and pool paths instead call `[em[0]+776]` at 0x82a24/0x82c78), then zeroes
  `em[0x7307]`, `em[0x734c]` (pending depth), `[ctx+0x2c1]`, `[ctx+0x2c2]`, `em[0x5f15..0x5f17]`,
  `em[0x7300]` (the same word the second dispatcher tests as f32 before dispatching), `em[0x73c8]`,
  and, when arg1 == 1, `em[0x73d0..0x73d8]`. No store in the function
  targets `em[arg1]`. [A]

**Enumeration: section 15 is unreachable in both directions.** Census tool
`MHGU/tools/audit/emc-section-census.mjs`, stdout in Appendix A:

- Static side (current census build, Appendix A): 153 `movw #0x72fc` materialisation sites in
  `.text`, of which **121 resolve to a store and 16 stay unresolved**; the other ~16 reach no store
  inside the tool's slice (the constant is materialised for a read, or the store lies farther out).
  Confidence split `direct:100 alias:0 add:1 post:6 pre:14`. The **direct-offset** values are
  `0x0:5 0x1:11 0x2:77 0x8:1 0x9:1 0xd:1 0xe:1 0x12:2 0x13:1`; the full histogram adds
  `0x3:1 0x5:1 0x6:1 0x7:1 0xa:1 0xb:1 0xc:1 0x11:1 0x12:5`. One of these needed a decoder fix to
  be seen at all: **0xc = 12** is the section-12 store at 0x82f24 (58 instructions from its `movw` at
  0x82e3c, a plain imm12 `strb r1,[r8,#0]` on a pointer computed far earlier, so a
  register-offset-only matcher plus a 24-instruction slice both missed it). 17, 6 and 11 arrived with
  the `strh` **immediate** form (0x7f7ec, 0x7f95c, 0x7fa80), which the build before this one did not
  decode. [C: main-session runs; A for the sites read by hand in this report]
- The low ids are **not** decoder artefacts. The `0x7f4xx-0x7fbxx` sites **only save**: the frame A slots `0x73b4/0x73b5/0x73b8` are written at
  0x7e5d8, 0x7e694, 0x7e930, 0x7e9e8, 0x7eda0, 0x7f030, 0x7f4f8, 0x7f684, 0x7f7ac, 0x7f91c, 0x7fa40,
  0x7fb44 and read at exactly two sites, 0x8dc78 (fn 0x8d854) and 0x95d84 (fn 0x95ca0) — i.e. every
  restore lives in those two functions, and the six 0x7f4xx-0x7fbxx sites are six mirror blocks of the
  single function 0x7f0cc, not a family (FOR-SE-REPLY §223-§227, §247). `0x87a94` is likewise a save. The values 17/6/11 arrive through the
  `strh` immediate sites (0x7f7ec, 0x7f95c, 0x7fa80) and 12 through 0x82ddc/0x82e30, so the set of
  values written into `em[0x72fc]` is **0/1/2/3/5/6/7/8/9/10/11/12/13/14/17/18/19/20**; the two
  dispatchers this report decoded (`0x8282c` plus the 0x82e30 runner) select **0/1/8/9/12/13/14/19**;
  **18** is entered by fn 0x8d854's distance-gated arms and **20** by the interpreter's periodic check
  at 0x836a8 (FOR-SE-REPLY §199/§198), i.e. both outside those two tables; **2** remains a handler
  park/stop label (the 0x8f690 family below); **4 and 16** are a different kind of inactive: the corpus carries real content for both (81 and 22
  files, 700 and 111 instructions — of which the pure-end entries are 8 and 9, so 73 and 13 content
  entries), and that content is a **second script set for the same state numbers** (70 files name states at all and 68 of those overlap their own sections 0/1, while only 1 of 73 s4
  entries and 0 of 13 s16 entries are byte-identical — 18/73 and 3/13 are identical at the opcode-sequence
  level once operands are ignored), i.e. conditional alternates rather than drafts (FOR-SE-REPLY §266) yet no static site stores 4 or 16 into `em[0x72fc]` — checked on five
  lanes (direct constants, movw index, add-fold, literal pool, stack/frame relay; FOR-SE-REPLY §256)
  plus the two alternate dispatch slots `em+0x7340`/`em+0x73c0` (§263), whose writers are all copies or
  zero-inits; **and the entry is `[A]` only in the limited sense that the written value set of `em[0x72fc]` excludes 4/16 on every statically encodable path (FOR-SE-REPLY §288 grades the overall "unreachable" claim `[B]`, since the premise "`em[0x72fc]` is the selector" is itself `[B]`); in that limited sense it is unreachable on every statically encodable path (FOR-SE-REPLY §284: 0x72fc is not an encodable rotated immediate, no 32-bit word equal to it exists in the image, and the #0x7000+#0x2fc/#0x2fd two-step lane has 17 zero-0x7000 sites with none feeding such an access). Previously this said "not established":**: the state redirector `fn 0x825fc`
  re-dispatches states 2/18 and 10 from those slots, and a static writer of **19** exists while every
  dispatcher bounds the state at 18, so writer coverage and dispatcher coverage do not coincide. **The consumer side is now fully cleared** (FOR-SE-REPLY §281): the redirector passes states 4 and 16 straight through, `em[0x72fd]` is a lane companion rather than an entry selector (and the hypothetical `[cmd+0x78]` entry table does not exist), and none of the twelve `bl 0x825fc` consumers rejects them — so the only thing missing for 4/16 is a writer whose offset arrives as a computed value; **15** has neither content nor a writer, while **17** is the mirror image —
  `0x7f7ec` does store 17 but section 17 is empty in all 98 corpus files, so selecting it runs an empty
  section (FOR-SE-REPLY §250). No decoder ever writes 15. [C:
  main-session/CensusReview runs for the sibling sites; A for section 12 and the park family]
- The current build and the reviewer's independent W-aware decoder now agree **value for value except
  the 0 bucket** (121 store values here against 124 there, of which 84 resolved and 40 dynamic). That
  difference is a resolution class, not a value dispute, which is why the set above is stated as the
  union of what the decoders attribute. [C: main-session and reviewer runs]
- Of the 16 unresolved sites, 12 copy back a byte loaded from memory (a pending-frame restore, so
  they re-introduce a value some other site wrote) and 4 take it from a register (`mov r0,r10`)
  whose producer is outside the window. The first build's seven `no immediate before store` park
  sites no longer appear: the alias lane plus the `strh` fix resolve them, and the `0x2` group grows
  70 → 83 accordingly. Two of those park sites were opened by hand during the first pass (0x9155c,
  0x9432c): `bl 0xb4e58`, `strb rN,[em+0x72fc]`, `strb r7,[em+0x72fd]`, `em[0x72f8] = em+0xba34` — a
  local script buffer rather than a cmdtbl array, so the byte is bookkeeping there and cannot enter
  section 15 through cmdtbl. [A for the two sites read]
- Corpus side: section 15 has 0 files and 0 entries in 98/98 deduped `cmdtbl` files; section 17 is
  empty too, and section 20 has 62 files but **zero** `op 0x00` resets. [C: tool] A runnable entry
  from an empty section is also structurally impossible: the loader skips allocation when a
  descriptor count is `<= 0` (`cmp r8,#0; ble 0x52344` at 0x521d8), and every section store in both
  dispatchers is preceded by a null check on the array pointer (0x82a54, 0x82c48, 0x82edc/0x82f08). [A]
- Therefore `MHRS/docs/reference/FOR-SE-REPLY.md` §163's "the runtime uses 1/8/13/14/15" cannot be
  read as "the dispatcher selects 15": nothing writes it, no file occupies it, and the loader would
  not allocate an array for it. Of §163's five numbers four are real targets (13, 8 and 14 are rows
  1-3 above, 1 is row 7) and **12, which §163 omits, is the fifth** (runner at 0x82ddc/0x82e30). The
  two dispatchers decoded here select 0/1/8/9/12/13/14/19; the field as a whole is written with
  0/1/2/3/5/6/7/8/9/10/11/12/13/14/17/18/19 by all statically visible writers, including the
  `strh`-immediate write sites §163 likewise omits. [B]

## Unknown

- **What the predicates mean.** Only location and type are decoded; the gameplay state behind each
  is not:
  - `em[0x758c]` (f32, compared with 0.0) — no MHGU document names it, but its **lifecycle is now
    partly decoded** (2026-11-09, main-session disasm): it is **set to `1200.0f`** at `0xb1af4`
    (`movt r2,#0x4496` — 0x44960000 = 1200.0 — then `str r2,[r0+0x758c]`), **cleared to 0** by every
    reset site checked so far (`0x99040`, `0x758b8`, `0xa067c`, `0x99128`), and its reader at
    `0xb1b04-0xb1b20` does `vldr s0; vcmpe #0.0; ble` — i.e. a float state with an "active window" shape: section 13
    is selected while it is still positive. Of its 28 address sites, one writes `1200.0f` (0xb1af0),
    most write `0`, and the three register stores are now traced: `0x99160` stores r4 = 0
    (`0x99148 mov r4,#0`), `0xa5480` stores r6 = 0 (entry of fn 0xa5198), and `0xb9944` stores
    `sxth(r0)` — a signed 16-bit value, not a float bit pattern — so the field is written as f32 in two
    places and as a small integer in one (FOR-SE-REPLY §259); **none of the 28 has a `vstr`**, so an
    in-place decrement is not among these sites — and **per FOR-SE-REPLY §209 these 28 sites carry
    every access at all** (0x758c has no direct-offset encoding, no literal word in the image —
    `refs_to` returns 0 — and no movw+add-immediate split constant in 155,495 sites), so the field is
    never decremented in place anywhere; a decrement could only live in a callee that received a
    computed pointer, which is the one lane left open. **Refined (FOR-SE-REPLY §200):** `0xa5480` is not an
    unknown value — it sits in fn `0xa5198` whose `r6` is `mov r6,#0` at entry, and that same function
    clears `em[0x73dc]`, `sub+0x59c`, `sub+0x5a4` and `em[0x758c]` in one block, i.e. the section
    13/8/19 latches are reset together. Naming its game meaning stays [U].
    [A: 1200.0f set + clears + `<= 0` reader / U: what it times]
  - `[em+0x1428]+0x59c` and `+0x5a4` (both f32, `> 0`) — both are `sub` fields. The documented `sub`
    fields near that area are different ones (HP at +0x370/+0x374, the status-threshold triple at
    +0x5c96/+0x5c98/+0x5d6a, the phase byte +0x1a1), so this is an unnamed float pair. What condition
    makes either positive is [U]. **Update (FOR-SE-REPLY §200/§201):** both are cleared by the same
    fn `0xa5198` block that resets `em[0x758c]` and `em[0x73dc]`; the VFP lanes do reach them —
    writers at `0x9fc20` (`vstr s0,[r0]`, +0x5a4) and `0xa1c00` (`vstr s16,[r0]`, +0x59c), readers
    in the dispatcher (0x828a8/0x828c0) and in the interpreter (0x85b20/0x85b38). **Lifecycle now
    closed (FOR-SE-REPLY §211/§213):** `+0x59c` is **recomputed on every call** as `max(300, seed − 300·rate)` rather than an accumulating countdown (re-audit B, FOR-SE-REPLY §291 — `0xa1c00 vstr s16` re-seeds it each call, and zero does occur at `0xcc5f4`); it is seeded at `1800.0f` (literal
    `0xa1cac`), decremented each tick by `(f32)u8(sub+0x5a1) × 300.0f` (vmls at `0xa1c1c`, store at
    `0xa1c20`) and clamped up to `300.0f` when it falls below (`0xa1c30-0xa1c44`), so its value set is
    `{0} ∪ [300, ∞)` — the `> 0` predicate therefore means "armed", not "time left";
    `+0x5a4` is a copy of `+0x5a8` taken only when the source is positive (`0x9fc08-0x9fc20`).
  - `em[0x73e0] == 16` — this one *is* documented: `+0x73E0` is the monster's action number byte and
    `+0x73E1` its variant (`MHGU/docs/mechanics/monster-code-map.md:26`,
    `MHGU/docs/analysis/monsters/mon-ai-entry.md:96`). So section 14 is selected while **action 16**
    is the current action; which motion/behaviour action 16 is depends on the per-monster L1 table,
    so the gameplay meaning is per-monster [U].
  - `[em+0x1428]+0x505 == 3` (u8) — **decoded (FOR-SE-REPLY §188):** a 0..3 state enum; the writers
    derive it from `(sub[424] & 0x80001) == 1` (`0xbd1b0` keeps a caller value or 0), `0xbd30c`
    stores 3, `0xba9cc` stores 0; the dispatcher additionally needs `[cmd+0x24]` non-null. What the
    value means stays [U].
  - `em[0x1408]` bit 7 / bit 8 and `em[0x7420]` (u8) — the guard's three flag bits. The code shows
    bit 8 cleared at every dispatch entry and set again inside the guard, and bit 7 cleared by the
    same `bfi`. **The bit-7 setter is now found** (2026-11-09, GuardWriters + main-session disasm):
    `0xc4b44 orr r0,r0,#128` in the function at 0xc46d8, stored back by `0xc477c str r0,[r10]` where
    `r10 = em+0x1408` (`0xc46e4/e8`); `refs_to 0xc4b40` gives its two conditional entries
    (`0xc4b1c`, `0xc4b2c`). The predicate is `bl 0xb4e58` (pool pick) versus the running state:
    **if the current section is not 1, or the picked entry differs from `em[0x72fd]`, bit 7 is set.**
    So bit 7 means "the pool has a different entry to run than the one running now". **The other
    conjunct `em[0x7420]` also has writers** (2026-11-09, GuardGateWriters + main-session disasm; 701
    `movw #0x7420` sites, 8 writers): two write `1` (`0xb1654`, `0xb16b8` — `mov r1,#1` then
    `strb r1,[r4,r0]`), one writes `0` (`0xaf388`, the clear), and five are the offset-folded/computed
    arms (`0x6dae8` whole-word from `r6` = 0; `0xb1674`/`0xb16d8`/`0xb17a4` are
    `movw r1,#0x7420; add r1,r4,r1; strb r0,[r1,#0]` carrying `(a==b)?1:0`; `0xb1784` carries
    `mov r8,#1`). **All eight resolve statically** (three write 1, two write 0, three write
    `(a==b)?1:0`), and the comparison is now named (2026-11-09, Guard7420Semantics + main-session
    disasm): in `0xb167c` the sequence is `bl 0x49638` → r5, `bl 0x49694` → r0, then `cmps r0,r5` (and `em[0x7424]` gets `0x49694()` on the seed path, `0x49638()` on the compare path); `0x49694` takes **no arguments** (GOT loads at `0x49698`/`0x496a8` overwrite r0/r1), so
    the call-site register values are dead; the three arms compare the site's own argument
    (`0xb161c`), `0x49638()` (`0xb167c`) and `0x49694()` (`0xb16e0`). Interpretation [B]:
    `em[0x7420] = (manager id == applied id)` with the applied id in `em[0x7424]`, i.e. an
    **id-application handshake**, seeded to 1 when bit 3 of `em[0x1428]->byte[424]` is clear
    (`0xb1648/0xb1654`); `0xc9e80` is a method-table forwarding entry (`0x1734d48`), not the writer
    driver. So the guard means "a different pool entry is available **and** the id handshake has
    completed". **Open point, not glossed:** the conjunct needs `[0x7420] != 0`, and `[0x7420]=1` is
    precisely the "new id equals the applied id" case, so the override fires while the handshake says
    *nothing to apply*. Code fact [A]; why the engine wants that is `[U]`. [A: writers/values/instructions,
    including `0x7420 = (0x49694 id == 0x49638 id)`; B: the manager/applied naming of the two ids; U: the mode enum behind
    `0x49694` and the class vtable that calls `0xc9e80`]
- **Why the pool path (section 1) is the effective default — now explained by the setter, not by a
  default.** Section 1 is *not* a format default: it is the last test in 0x8282c, a guarded override
  that fires after 13/8/14/9/19/0 have already been chosen, and only when bit 7 of `em[0x1408]` is
  set and `em[0x7420] != 0`. With the setter decoded (previous bullet) the reading is: the pool
  re-dispatches **when the pick differs from the running section-1 entry** (or the engine is not
  currently in section 1), which is exactly a "different lot available" latch rather than a per-tick
  default — the earlier statement that no setter exists is withdrawn. What remains [U] is the
  frequency (how often the pick differs in a hunt) and the `em[0x7420]` gate. Section 1 also has 11
  direct store sites of its own (census `direct-only values: 0x1:11`, on top of the guard's own
  pre-indexed store at 0x82998), including the pending-stack "pool resume" sequence at 0x8b7c0
  (`bl 0xb4e58`, push frame, then `strb #1,[em+0x72fc]`), so handlers enter section 1 deliberately
  as well. [A for the setter, its predicate and the 0x7420 handshake (B for the handshake reading) / U for how often the pick differs in a hunt]
- **`em[0x73dc]`** (section-19 enable flag; decoded 2026-11-09, FOR-SE-REPLY §195): set by fn
  `0xc9818` when the id handshake is in sync (`em[0x7420] != 0`) and `em[0xb5f4] != 27` (that arm also
  sets bit 14 of `em[0x1408]`), or when the action number is not 7; the dispatcher consumes it at
  `0x82a9c` by switching to the section-19 array `[cmd+0x4c]`. `[U]`: what `em[0xb5f4] == 27` is, and
  the semantics of `0x72128(em, sub+0x514, 1.0f)`.
- **The pointer-spill lane — walked 2026-11-09 (FOR-SE-REPLY §198).** `[sp,#356] = &em[0x72fc]`
  (0x83618-0x83620), and the region 0x83618..0x855ac holds **four** stores through it: `0x83704`
  (value 20), `0x83d64` (restore of a saved byte), `0x83f70` (value 1) and `0x85518` (register
  value). Dynamic section writes are therefore not hypothetical — they are exactly these four.
- **The pool picker `0xb4e58(em, k)`** (decoded 2026-11-09, FOR-SE-REPLY §196): it returns
  `*(u8*)(em[0x7628] + 20 + key)` via the 3-instruction helper `0x69c1c8`, i.e. the "pool" is a fixed
  byte table and the pick is an index read. `key` comes from `em[0xb5f4]` (20 / 3 / other),
  `sub[442]`, and the distance `sub[0x1d4] - sub[0x44]` bucketed at −175 / 700 / 1500 (pool words
  `0xb50e4 = c42f0000`, `0xb50e8 = 442f0000`, `0xb50ec = 44bb8000`), with `em[0xba44]`'s bit 3 able to
  force key 19. Both open ends are now closed: the table pointer is
  `em[0x7628] = 0x69c258(em[0x7610], em[0xb5f6])`, i.e. the **variant byte `0xb5f6` selects which
  table** (container `em[0x7610]` = a global singleton's `+0x2590`, FOR-SE-REPLY §197/§218), and
  `0xb4ca8(em)` is a selector built from a vtable-slot-0x9C call plus `em[0x1054]`/`em[0x1065]` — its output set is **not** `{−1,0,1}`: three of its four arms return a **32-bit table entry** (`ldr r0,[r1,r0,lsl #2]` at `0xb4d74/0xb4dc0/0xb4e0c`, tables outside the image; re-audit B, FOR-SE-REPLY §291) — plus
  `em[0x1054]` / `em[0x1065]` (§217). `[A: the table read, the key lattice, the table provenance and
  the tri-state selector / U: the identity of the global singleton and of the 0x9C implementation]`
- **Sections 18 and 20** (20 decoded 2026-11-09, FOR-SE-REPLY §198): **20 is entered** — the
  interpreter's periodic check at `0x836a8` (sole entry `0x86278 b`) requires
  `[[[em[0x72f4]]]]` to match, bit 3 of `em[0xb7c0][1]`, `0x82020(em,16) == 1`, and `[cmd+0x50]`
  (= section 20's array) non-null, then writes 20/0. **18 remains `[U]`**: no dynamic write in the
  spill lane, and the only static writes are 0x8da90/0x8dd7c outside the dispatcher; 43 files carry
  section-18 entries.
- **`0x51d70`** — **resolved 2026-11-09 (FOR-SE-REPLY §202/§220).** The accessor itself is a plain
  count/array reader (`[obj+0x6c]` count, `[obj+0x78]` array). Its only call site (fn `0x684b4`, via
  `0x3a8ef4(global, *(u16*)(sub+0x1b6))`) operates on a **different object class** than the EMC blob:
  at `0x68518`/`0x685e4` that object's `+0x6c` is compared as an *integer count* (`cmps r1,r2; bcs`),
  which is impossible under the loader layout where `+0x6c` is section 1's array pointer. So
  `[G+0x2588]` (G = the startup singleton `*[0x1851fe0]`, the `rEmSizeYureTbl` resource) is the count/record container and `em[0x75f4]` is the EMC object; `emc.md` has been
  annotated accordingly. `[A: layout and call site / U: the classes' names — none recoverable here]`

## SelfFalsificationCheck

1. **What did I assume without running a script?** (a) That `G:/tmp/EMC/final-code2.txt` and
   `G:/tmp/EMC/tool-data.txt` are this tool's output. Checked against the source rather than trusted:
   the printed phrases (`# em+0x72fc section index:`, `resolved store(s)`, `by confidence:`,
   `direct-only values:`, `rare-value store`, `control PASS store 0x.. want 0x.. got 0x..`,
   `section 15 written statically:`, `states named ONLY outside sections 0/1`) are the
   tool's literal `console.log` strings, and its ten control addresses match the `CONTROL` array in the
   same order. The numbers come from the main session's run from the repo root; this session has no
   `run`/bash device (`write xd://run` answers "No such tool"; the mounted devices are the seven
   `mcp__mhgu_re_*` ones), so I did not re-execute the census myself and the report says so. The
   block in Appendix A is the **current** build's output (`final-code2.txt`, 121 resolved stores);
   the two earlier blocks (96 and 118 resolved) were withdrawn for missing stores — that history is
   recorded under Difficulties, not hidden.
   (b) That the census's section numbers are file section indices: `parseEmc` exposes `s.index`, the
   tool aggregates by it, and the table prints exactly 21 rows, matching the loader's `cmp r10,#21`.
2. **If the dispatch table is wrong at runtime, the #1 cause is the two `.word` opcodes.** The
   disassembler used to print 0x82848 and 0x82984 as `.word ; media`; **fixed 2026-11-09** —
   `MHGU/tools/mhgu/arm32.mjs` now decodes the BFI/BFC family (bits 27:21 = 0111110, bits 6:4 = 001)
   and these two sites print as `bfc r0, #8, #1` and `bfi r0, r1, #7, #2`, matching the hand decode:
   0xe7c8041f = `bfc r0,#8,#1` (msb = bits 20-16 = 8, lsb = bits 11-7 = 8, Rd = bits 15-12 = 0);
   0xe7c80391 = `bfi r0,r1,#7,#2` (msb = 8, lsb = 7, Rd = r0, Rm = bits 3-0 = r1). Independent
   cross-checks that would fail on a misdecode: r1 is `mov r1,#2` two instructions earlier (0x82980);
   r0 holds the word `em[0x1408]` (latched at 0x82844 with r6 = em+0x1408); the bfi result is stored
   back to that same address (0x8298c); and the guard tests bit 7 with `tst r0,#128` (0x82950), which
   is exactly the bit the bfi clears. A reading that saw a memory store in those two words would have
   to explain the `ldr`/`str` pair around them, and there is none.
3. **Must-pass.** `node MHGU/tools/audit/emc-section-census.mjs --code` -> 10/10 controls PASS,
   every one with its expected value: 0x8288c→0xd, 0x828f0→0x8, 0x8292c→0xe, 0x82ae4→0x13,
   0x82c5c→0x0, 0x82c94→0x0, 0x82cc8→0x9, 0x8b83c→0x1, 0x8f69c→0x2, 0x8da90→0x12; plus
   `section 15 written statically: no` (verbatim in Appendix A). The ten sites are the decode's own
   anchors, so a control failure would mean the resolvers, not the report, are wrong; the same ten
   values print in every build, i.e. the alias/`strh`/dead-offset fixes added stores (96 → 118 → 121)
   without moving any control. `--data` over
   the five roots -> `files parsed 98/98, errors 0` and `control em043_00 state 16 only in s14: PASS`.
4. **Must-fail (the two withdrawn statements).**
   - "copies em[0x1408] halfword into em[arg1]" would require a store whose address is `em+arg1`.
     The function was disassembled end to end (0x8282c-0x82c3c); `r5` (= arg1) appears only in
     `cmp r5,#2` (0x82840) and `cmp r5,#1` (0x82ba0), and the only stores in the prologue go to
     `em+0x1408` (0x8284c, 0x8298c). No store uses r5 as a base or index.
   - "resolveState returns slot-1" would require `r1` to be decremented before 0x826ac. In
     0x8262c-0x826a8 the only writes to r1 are `ldrb r1,[r4,#0]` (0x8262c) and `uxtb r1,r12`
     (0x8269c, the pop-index computation), and the pop path then branches back to 0x8262c, which
     re-reads r1. `sub r4, r1, #1` (0x82630) writes r4, the table index.
5. **Resolver control — a byte outside 1..18 comes back unchanged.** `cmp r4,#17 / bhi 0x826ac` with
   r4 = byte-1: a byte of 0, 19 or 20 branches straight to `mov r0,r1`. This is a live path, not a
   dead one: bytes 19 and 20 exist in the format (21 sections) and 19 is selected by the dispatcher
   (row 5), so `resolveState` on section 19 provably returns 19.
6. **em043_00 hand check** (`G:/tmp/EMC/em043-dump.txt`, 157 lines, 21 sections, 155 entries):
   `grep '^s1\.' | grep 'op00(16,'` returns no match, while `s14.e0 @0x3550` contains
   `op00(16,17) op00(16,15) op00(16,18) op00(16,16) op00(16,11) op00(16,19) op00(16,20) op00(16,10)`.
   That is the same pair the census reports as `em043_00: 16@s14`, obtained by a different reader
   (per-entry instruction dump vs. the census aggregator).
7. **Corpus dedup.** Counts are per unique sha256 over the union of five roots:
   `G:/omp works/.tmp/scratch-t3/cmd`, `G:/tmp/Types/X/B/ext`,
   `G:/omp works/MHGU-private/romfs-extract`, `G:/omp works/.tmp/scan`,
   `G:/omp works/.tmp/mhgu-scratch`. The tool keeps the first path seen per digest, so the 98 files are
   distinct byte streams, and the names in the miss list are basenames with the `_cmdtbl` suffix
   stripped.
8. **Zero-claim controls.** "Section 15 empty" is a zero, so the same run prints the occupied
   sections next to it (section 1: 98 files / 9,315 entries; section 13: 63 files / 63 entries with
   1,170 `op 0x00`; section 12: 94 files / 94 entries / 189 resets) and the corpus control
   `em043_00 state 16 only in s14: PASS`. The "no store of 15" zero is now backed by every build and
   by an independent implementation — 96, 118 and 121 resolved values here (none 15), plus the
   reviewer's W-aware scan (124 store values, 84 resolved, none 15, hand pass resolving 15 sites to
   `{0,1,2,8,9,12,13,14,18,19}`) — and structurally: an empty section gets no
   array (`cmp r8,#0; ble 0x52344` at 0x521d8) and every section store is null-checked first. So even
   a hypothetical write of 15 could not produce a runnable entry.
9. **Three readings I had to withdraw in this pass.** (i) "The interpreter never touches
   `em[0x72fc]`" — it reads it at 0x8316c and branches on bytes 3-6/17 for a preamble call (corrected
   in the decode log). (ii) "The code selects no section 12" — refuted by 0x82f24, which the census
   prints as `rare-value store 0x82f24 = 0xc`; the section-12 row and the runner are the fix.
   (iii) "The low ids 3/5/7/10 are unattributed alias values and the value set is unsettled" — they
   are written by the `strh`-immediate sites (0x7f7ec/0x7f95c/0x7fa80 and siblings), while the
   0x7f4xx-0x7fbxx family only saves/restores (`0x87a94` is a save, not a
   selector), so the written set is 0/1/2/3/5/6/7/8/9/10/11/12/13/14/17/18/19 and the question is
   closed, not open. One caveat on reachability, not on the set: with the loader skipping empty
   sections (`0x521d8 cmp r8,#0 -> ble 0x52344`, no array allocated) and 98/98 corpus files having no
   section 15 or 17, the value-17 write at 0x7f7ec is followed by `ldr r0,[cmd+0x44]; ldr r0,[r0]` on
   a null array — that path is either unreachable on this content or would crash; the other low ids
   (3/5/6/7/10/11) do have entries in the corpus (80/90/67/33/32/19 files) and their writes are live.

   Evidence grade per low id (2026-11-09): **all seven are hand-decoded**. 17: 0x7f7e4 `mov r0,#17` →
   0x7f7ec `strh r0,[r4,#0]`, then `ldr r0,[cmd+0x44]` (4×17 = 0x44; `cmd` = `em[0x72f4]` = obj+0x68, i.e. obj+0xac); 6: 0x7f954 `mov r0,#6` →
   0x7f95c `strh r0,[r4,#0]`, then `ldr r0,[cmd+0x18]` (4×6 = 24); 11: 0x7fa78 `mov r0,#11` → 0x7fa80
   `strh r0,[r4,#0]`, then `ldr r0,[cmd+0x2c]` (4×11 = 44); 3: 0x7f530 `mov r0,#3` → 0x7f538
   `strb r0,[r4,#0]`, then `ldr r0,[cmd+0x0c]` (12); 5: 0x7e96c `mov r0,#5` → 0x7e970 `strb r0,[r9,#0]`,
   then `ldr r0,[cmd+0x14]` (20); 7: 0x7fb7c `mov r0,#7` → 0x7fb84 `strb r0,[r5,#0]`, then
   `ldr r0,[cmd+0x1c]` (28) and `ldr r0,[r0,r8,lsl#2]` for the entry; 10: 0x87acc `mov r3,#10` → 0x87ad0
   `strb r3,[r1,#0]` (r1 advanced to `em+0x72fc` by 0x87aa0 `ldrb r2,[r1,r2]!`), then `ldr r0,[cmd+0x28]`
   (40). The in-function `0x87a94` store is still a *save* of the previous (section, entry) — the same
   function saves first and then sets section 10, so `0x87a94` is a save site inside a selector, not a
   counter-example to the family.

## Difficulties

- **No execution surface in this session.** `write xd://run` answers "No such tool" and the mounted
  `xd://` devices are the seven read-only `mcp__mhgu_re_*` MCP tools, so the census could not be
  re-run here; the numbers are quoted from the main session's recorded runs
  (`G:/tmp/EMC/cur-tool3.txt`, `G:/tmp/EMC/tool-data.txt`) plus the stdout of the repo tool
  `node MHGU/tools/audit/ai-reach-misses.mjs`. Cost:
  one round trip with the main session, plus this rework round after the tool changed under the
  report. Cause: agent tool set, not the tool.
- **The census build I first quoted was incomplete, and that cost a whole appendix.** It associated a
  `movw #0x72fc` with a store only inside a 24-instruction slice and only for the register-offset
  `strb`/`strh` forms, so it could not see the section-12 store: the pointer is computed at 0x82e40
  and used 58 instructions later by a plain imm12 `strb r1,[r8,#0]` at 0x82f24. A second decoder
  (reviewer's W-aware scan) and the current tool both find it. Lesson recorded here: any
  "no store writes N" claim over a pointer-computed base must state the slice and the store forms it
  covered, which is what the new paragraph in the dispatch table does.
- **Three errors of mine that this rework exposed.** (i) "The interpreter never touches
  `em[0x72fc]`" — it reads it at 0x8316c (bytes 3-6/17 select a preamble call). (ii) The dispatch
  table listed no section 12 and called 0x8282c "the only place that selects a section" — the
  per-tick runner at 0x82e30 selects 12. (iii) The guard was presented as the pool path's normal
  route without checking who raises bit 7 — no immediate bit-op does, so the guard may fire once or
  never. Cause of all three: I stopped at the function I was reading instead of enumerating the
  writers/readers of the field first.
- **Two opcodes that the linear disassembler refuses to decode** (`bfc`/`bfi`, printed as
  `.word ; media`). Cost: one hand-decode plus three cross-checks. Cause: the MCP disassembler's
  table does not cover ARMv6T2 bitfield instructions; this is the second time in this report that a
  `.word` line mattered, so any future reading of 0x8282c should decode those two words by hand.
- **Store-value resolution is heuristic, but the two decoders now converge.** The current build
  leaves 16 of 153 sites unresolved (12 restores, 4 register-sourced) and roughly 16 more never
  reach a store inside its slice; the reviewer's lane resolves 84 of 124 and calls 40 dynamic. They
  agree **value for value except the 0 bucket**, and the low ids that looked unattributed are
  values written by the `strh`-immediate sites — so the value set is settled and only the 0 bucket
  differs by resolution class.
- **`0x7420` is not a distinguishable constant** (742 `literal_loads` sites for the three fields
  scanned, most of them `0x7420` in unrelated classes), so the field's owner could not be established
  by cross-reference. Cause: RE engine reuses small struct offsets across classes.

## Appendix A — census stdout (verbatim)

Provenance: both runs are the main session's, from the repo root — this agent has no `run`/bash
device (see Difficulties), so nothing below was produced by my own invocation.
`node MHGU/tools/audit/emc-section-census.mjs --code` -> `G:/tmp/EMC/final-code2.txt`, 83 lines, exit
0: the **current** build. It resolves base-alias stores (`add rX, em, #0x72fc` … `strb rY,[rX]`),
decodes the immediate form of `strh` (which is how 17 / 6 / 11 first appeared, at 0x7f7ec / 0x7f95c /
0x7fa80), and gates the alias rule on the dead-offset check (which removed a false positive at
0x7f030). Two earlier blocks are superseded and are not quoted: `tool-code.txt` (77 lines, 96
resolved, no `0xc` — blind to the section-12 store) and `cur-tool3.txt` (118 resolved, 17 unresolved
— blind to `strh` and carrying the 0x7f030 false positive).
`node MHGU/tools/audit/emc-section-census.mjs --data "G:/omp works/.tmp/scratch-t3/cmd" "G:/tmp/Types/X/B/ext" "G:/omp works/MHGU-private/romfs-extract" "G:/omp works/.tmp/scan" "G:/omp works/.tmp/mhgu-scratch"`
-> `G:/tmp/EMC/tool-data.txt`, 43 lines. The alias fix is in the static-store lane only, so the corpus
table is unaffected. Exit 0 on all three runs; every control line reads PASS.

```
# (A) static stores into the dispatch fields
# em+0x72fc section index: 153 movw site(s), 121 resolved store(s), 16 unresolved
  by confidence: direct:100 alias:0 add:1 post:6 pre:14
  direct-only values: 0x0:5 0x1:11 0x2:77 0x8:1 0x9:1 0xd:1 0xe:1 0x12:2 0x13:1
  values: 0x0:9 0x1:11 0x2:83 0x3:1 0x5:1 0x6:1 0x7:1 0x8:1 0x9:1 0xa:1 0xb:1 0xc:1 0xd:1 0xe:1 0x11:1 0x12:5 0x13:1
    unresolved site 0x8b8b4 store 0x8ba4c: mov r0,r10 (source unresolved)
    unresolved site 0x8ba10 store 0x8ba20: restore (loaded from memory)
    unresolved site 0x8baec store 0x8bbd8: mov r0,r10 (source unresolved)
    unresolved site 0x8bb9c store 0x8bbac: restore (loaded from memory)
    unresolved site 0x8bbf8 store 0x8bc08: restore (loaded from memory)
    unresolved site 0x8bc8c store 0x8bc9c: restore (loaded from memory)
    unresolved site 0x8bf14 store 0x8bff0: mov r0,r10 (source unresolved)
    unresolved site 0x8bfb4 store 0x8bfc4: restore (loaded from memory)
    unresolved site 0x8c018 store 0x8c01c: restore (loaded from memory)
    unresolved site 0x8c644 store 0x8c654: restore (loaded from memory)
    unresolved site 0x8c69c store 0x8c784: mov r0,r10 (source unresolved)
    unresolved site 0x8c748 store 0x8c758: restore (loaded from memory)
    unresolved site 0x8c854 store 0x8c864: restore (loaded from memory)
    unresolved site 0x8d38c store 0x8d39c: restore (loaded from memory)
    unresolved site 0x8dc04 store 0x8dc7c: restore (loaded from memory)
    unresolved site 0x95d04 store 0x95d88: restore (loaded from memory)
    rare-value store 0x82f24 = 0xc from site 0x82e3c [em+0x72fc section index] conf=add (mov imm)
    rare-value store 0x8288c = 0xd from site 0x82884 [em+0x72fc section index] conf=direct (mov imm)
    rare-value store 0x8292c = 0xe from site 0x82924 [em+0x72fc section index] conf=direct (mov imm)
    rare-value store 0x7f7ec = 0x11 from site 0x7f79c [em+0x72fc section index] conf=pre (mov imm)
    rare-value store 0x8b49c = 0x12 from site 0x8b3cc [em+0x72fc section index] conf=pre (mov imm)
    rare-value store 0x8ca30 = 0x12 from site 0x8c928 [em+0x72fc section index] conf=pre (mov imm)
    rare-value store 0x8d234 = 0x12 from site 0x8d164 [em+0x72fc section index] conf=pre (mov imm)
    rare-value store 0x8da90 = 0x12 from site 0x8da84 [em+0x72fc section index] conf=direct (mov imm)
    rare-value store 0x8dd7c = 0x12 from site 0x8dd70 [em+0x72fc section index] conf=direct (mov imm)
    rare-value store 0x82ae4 = 0x13 from site 0x82adc [em+0x72fc section index] conf=direct (mov imm)
# em+0x72fd entry index: 148 movw site(s), 106 resolved store(s), 36 unresolved
  by confidence: direct:87 alias:0 add:0 post:0 pre:19
  direct-only values: 0x0:86 0x14:1
  values: 0x0:100 0x1:2 0x6:1 0x7:1 0xb:1 0x14:1
    unresolved site 0x7fb48 store 0x7fb88: no immediate before store
    unresolved site 0x829a8 store 0x829b0: mov r0,r4 (source unresolved)
    unresolved site 0x8b6c8 store 0x8b6cc: mov r0,r10 (source unresolved)
    unresolved site 0x8b840 store 0x8b844: mov r0,r10 (source unresolved)
    unresolved site 0x8b8c8 store 0x8ba4c: mov r0,r10 (source unresolved)
    unresolved site 0x8b90c store 0x8b910: mov r0,r10 (source unresolved)
    unresolved site 0x8ba2c store 0x8ba30: restore (loaded from memory)
    unresolved site 0x8bb00 store 0x8bbd8: mov r0,r10 (source unresolved)
    unresolved site 0x8bb48 store 0x8bb4c: mov r0,r10 (source unresolved)
    unresolved site 0x8bbb8 store 0x8bbbc: restore (loaded from memory)
    unresolved site 0x8bc14 store 0x8bc18: restore (loaded from memory)
    unresolved site 0x8bca8 store 0x8bcac: restore (loaded from memory)
    unresolved site 0x8be7c store 0x8be80: mov r0,r10 (source unresolved)
    unresolved site 0x8bf28 store 0x8bff0: mov r0,r10 (source unresolved)
    unresolved site 0x8bf6c store 0x8bf70: mov r0,r10 (source unresolved)
    unresolved site 0x8bfd0 store 0x8bfd4: restore (loaded from memory)
    unresolved site 0x8c028 store 0x8c02c: restore (loaded from memory)
    unresolved site 0x8c23c store 0x8c240: mov r0,r10 (source unresolved)
    unresolved site 0x8c660 store 0x8c664: restore (loaded from memory)
    unresolved site 0x8c6b0 store 0x8c784: mov r0,r10 (source unresolved)
    unresolved site 0x8c6f8 store 0x8c6fc: mov r0,r10 (source unresolved)
    unresolved site 0x8c764 store 0x8c768: restore (loaded from memory)
    unresolved site 0x8c7ac store 0x8c7b0: no immediate before store
    unresolved site 0x8c870 store 0x8c874: restore (loaded from memory)
    unresolved site 0x8d344 store 0x8d348: mov r0,r4 (source unresolved)
    unresolved site 0x8d3a8 store 0x8d3ac: restore (loaded from memory)
    unresolved site 0x8dc84 store 0x8dc8c: restore (loaded from memory)
    unresolved site 0x8ddf8 store 0x8de00: restore (loaded from memory)
    unresolved site 0x8de84 store 0x8de8c: restore (loaded from memory)
    unresolved site 0x8deac store 0x8deb4: restore (loaded from memory)
    unresolved site 0x90e80 store 0x90e84: no immediate before store
    unresolved site 0x95d90 store 0x95d98: restore (loaded from memory)
    unresolved site 0x95db4 store 0x95dbc: restore (loaded from memory)
    unresolved site 0x95dfc store 0x95e04: no immediate before store
    unresolved site 0x95e40 store 0x95e48: restore (loaded from memory)
    unresolved site 0x95e68 store 0x95e70: restore (loaded from memory)
    rare-value store 0x8de48 = 0x14 from site 0x8de24 [em+0x72fd entry index] conf=direct (mov imm)
  control PASS store 0x8288c want 0xd got 0xd
  control PASS store 0x828f0 want 0x8 got 0x8
  control PASS store 0x8292c want 0xe got 0xe
  control PASS store 0x82ae4 want 0x13 got 0x13
  control PASS store 0x82c5c want 0x0 got 0x0
  control PASS store 0x82c94 want 0x0 got 0x0
  control PASS store 0x82cc8 want 0x9 got 0x9
  control PASS store 0x8b83c want 0x1 got 0x1
  control PASS store 0x8f69c want 0x2 got 0x2
  control PASS store 0x8da90 want 0x12 got 0x12
  section 15 written statically: no
```

```
# (B) corpus census (deduped by sha256)
  files parsed 98/98, errors 0
  sec | files | entries |   ins | op00 | ent00 | op14 | ent14 | distinct states
   0 |    98 |    1710 | 223298 | 5888 |   621 | 78539 |  1122 | 9
   1 |    98 |    9315 | 134987 | 29969 |  7714 | 10942 |  3851 | 10
   2 |    70 |     223 |  2198 |  635 |   181 |  133 |    87 | 7
   3 |    80 |      80 |   563 |  125 |    67 |   33 |    23 | 7
   4 |    81 |      81 |   700 |  221 |    72 |   50 |    35 | 8
   5 |    90 |     157 |  2808 |  512 |   132 |  380 |    92 | 8
   6 |    67 |      67 |   752 |  170 |    64 |   58 |    34 | 8
   7 |    33 |      71 |   694 |   86 |    40 |  135 |    12 | 7
   8 |    84 |     167 |  4846 |  924 |   137 |  753 |    78 | 8
   9 |    62 |      62 |   339 |   81 |    49 |   29 |    25 | 7
  10 |    32 |      96 |   736 |  189 |    61 |   41 |    20 | 5
  11 |    19 |      19 |    56 |   14 |     9 |    6 |     5 | 4
  12 |    94 |      94 |   616 |  189 |    49 |   31 |    24 | 7
  13 |    63 |      63 |  2640 | 1170 |    63 |    3 |     3 | 4
  14 |     9 |       9 |   292 |  111 |     8 |   17 |     2 | 5
  15 |     0 |       0 |     0 |    0 |     0 |    0 |     0 | 0
  16 |    22 |      22 |   111 |   24 |    13 |   16 |    11 | 3
  17 |     0 |       0 |     0 |    0 |     0 |    0 |     0 | 0
  18 |    43 |     207 |  2427 |  686 |   195 |  155 |    81 | 7
  19 |     3 |       3 |    14 |    2 |     1 |    1 |     1 | 1
  20 |    62 |      62 |   248 |    0 |     0 |    0 |     0 | 0
  states named ONLY outside sections 0/1: 17 file(s), 18 (file,state) pair(s)
    em043_00: 16@s14 11@s18
    em003_00: 0@s4
    em007_00: 11@s18
    em014_00: 11@s2,18
    em015_00: 11@s2,18
    em016_00: 11@s2,18
    em019_00: 16@s14
    em023_00: 16@s14
    em034_00: 11@s2,18
    em038_00: 0@s4,9
    em060_00: 0@s10
    em062_00: 0@s10
    em067_00: 16@s14
    em068_00: 16@s14
    em077_00: 16@s14
    ems020_00: 0@s6,8,9
    ems021_00: 0@s6,8,9
  control em043_00 state 16 only in s14: PASS
```

Reading of the table that matters for the report: sections 15 and 17 are occupied by **no** file;
section 13 is the reset-heavy override (63 files, 63 entries, **1,170** `op 0x00`, 3 delegates);
section 8 has 84 files / 167 entries / 924 resets; section 14 has 9 files / 9 entries / 111 resets;
section 19 has 3 files / 3 entries / 2 resets; **section 12, the second dispatcher's target, is the
second most populated override at 94 files / 94 entries / 616 ins / 189 resets**, which is what a
per-tick override looks like and not dead data; section 20 has 62 files but 0 entries with a reset.
83 of the 121 resolved section-byte store sites write byte 2; the one decoded here (0x8f69c) is the
park/local-buffer path and the other 82 were not read, so they are counted, not characterised. The
miss list is the only place where a reader that walks sections 0/1 only demonstrably loses a state:
17 files, 18 (file,state) pairs, all in state 0, 11 or 16.

Reader impact is larger than that list suggests, because `MHRS/tools/port/ai.mjs` does not read "all
of section 1" either: its `resetsOf` starts from section-0 `op 0x14` leaves and follows `op 0x14`
only inside section 1, depth <= 6. On the same 98 files that model misses **104 (file,state) pairs
over 70 files — 52 pairs named only by sections other than 0/1, plus 52 lying in section-1 entries
the walk never reaches** (reproduce with `node MHGU/tools/audit/ai-reach-misses.mjs`; its own control
prints PASS and it reports 98 files). The 18-pair figure above is the narrower "outside
sections 0/1" definition; 104 is the number that matters for `ai.mjs`. [C: main-session run]
