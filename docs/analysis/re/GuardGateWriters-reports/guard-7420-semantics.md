# `em[0x7420]` — what it encodes, and what drives it

Scope: MHGU main 1.4.0, flat image `G:/omp works/MHGU-private/main.140.flat.bin`, vaddr = flat - 0x100.
All instructions below are from `mcp__mhgu_re_disasm`; all pointer/word facts from `mcp__mhgu_re_refs_to` / `mcp__mhgu_re_read_words`.
Tool budget for this ticket: 10 calls (2 schema reads, 3 disasm, 2 refs_to, 1 read_words, 1 disasm follow-up, 1 report write).

## Verdict

`em[0x7420]` is **not** a game flag and **not** the value itself. It is the **verdict of an equality test that the entity writes on itself**:

```
em[0x7420] = ( value_from_global_state == value_being_applied )
em[0x7424] = value_being_applied            (byte, "last applied id")
```

with one exception: when `bit3 of em[0x1428]->byte[424]` is **clear**, the code does not compare at all — it copies the global-state value into `em[0x7424]` and forces `em[0x7420] = 1` (first/seed evaluation, declared "in sync"). So the byte means **"the id I asked for is already the id the manager reports"** — an in-sync / no-op / request-satisfied flag, consumed by the motion-section dispatcher at `0x82950`.

The two compared quantities are, side A: an **8-bit id read out of a global manager**, either the record selected by a slot byte (`*(int*)(base+0xd758+12*slot)` low byte, `slot = *(sbyte*)(base+0xd56)`) or that slot byte itself; side B: the value the caller supplies / a sibling getter returns / a re-read of side A. Exact addresses and instructions in `## The comparison`.

Claim verdicts (re-derived from primary source; the "work under review" is treated as a claim):

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `0x7420` is written as `(a==b)?1:0` by three functions | **PASS** | `0xb1668/0xb1670/0xb1674`, `0xb16cc/0xb16d4/0xb16d8`, `0xb1798/0xb17a0/0xb17a4` |
| 2 | The `(a==b)` sides are "two results of `bl 0x49694`" | **FAIL as stated** | only `0xb16e0` compares two `0x49694` results (`0xb1760`, `0xb1768`); `0xb161c` compares `0x49694()` against its **argument** (`r5`, `0xb165c`); `0xb167c` compares `0x49694()` against **`0x49638()`** (`0xb168c`, `0xb1694`, `0xb16c0`) |
| 3 | `0xc9e80` is "the only driver found for the three write functions" | **FAIL** | `0xc9e80` contains no `bl` to `0xb161c`/`0xb167c`/`0xb16e0` (full body `0xc9e80-0xc9eac`). Direct callers: `0xad890 bl 0xb167c`, `0xadb8c bl 0xb16e0`, `0xb9ae4 bl 0xb167c`, `0xccc78 bl 0xb161c` (`refs_to` on the three targets, `{"bl":4}`) |
| 4 | `0xc9e80` has no static caller; reached through a pointer/vtable | **PASS** | exactly one word in the image equals `0xc9e80`: `0x1734d48`; the only word referencing that slot is `0x13fb53c` (`refs_to {pointers:true}`, whole image) |
| 5 | `0xc9e80` is a table/thunk entry, not entity update code | **PASS** | it is `fn(this){ 0xc9d98(this); Global()->vtbl[13](this); }`; sibling slots hold `0xc9d98`, `0xca108`, `0xca104`, `0xcaeb0` and `b`-thunks to `0xad59c`/`0xaf368`/`0xae3e8`/`0xaf364` |
| 6 | Stores to `0x7428` accompany the writers | **[U]** | no `0x7428` immediate or store anywhere in `0xb161c-0xb17d4` (the three writers, whole bodies) nor in `0xc9e80-0xc9f00`; the `0xc9f44` family uses `0xb724/0xb728/0xb72c/0xb730/0xb734`, a different object frame |

## The comparison

### `0x49694` — body and return value (complete, `0x49694-0x496e4`)

```
0x49694 push {r11,lr}
0x49698 ldr r0,[pc,#72]      ; literal 0x17ef510 @0x496e8
0x4969c ldr r0,[pc,r0]      ; GOT slot (pc=0x496a4) -> *slot  [computed 0x1838bb4, see note]
0x496a0 ldr r0,[r0,#0]      ; mode singleton object
0x496a4 bl 0x3f8634         ; r0 = object, r1 = caller's r1 (ignored by callee)
0x496a8 ldr r1,[pc,#60]     ; literal 0x17ef6b8 @0x496ec
0x496b0 cmp r0,#1           ; <<< DECIDING INSTRUCTION
0x496b4 ldr r1,[pc,r1]      ; GOT slot (pc=0x496bc) -> *slot  [computed 0x1838d74]
0x496b8 ldr r1,[r1,#0]      ; value-source singleton object = base
0x496bc ldrsb r2,[r1,#0xd56]; slot = signed byte at base+0xd56
0x496c0 bne 0x496dc
0x496c4 add r0,r2,r2,lsl #1 ; r0 = 3*slot
0x496c8 add r0,r1,r0,lsl #2 ; r0 = base + 12*slot
0x496cc movw r1,#0xd758
0x496d0 ldr r0,[r0,r1]      ; word at base+0xd758+12*slot
0x496d4 sxtb r0,r0          ; return low byte, sign-extended
0x496d8 pop {r11,pc}
0x496dc uxtb r0,r2          ; path B: the slot byte itself
0x496e0 sxtb r0,r0
0x496e4 pop {r11,pc}
```

* **Arguments:** none. `r0` is loaded from the GOT at `0x49698-0x4969c` before any use, and `r1` is loaded at `0x496a8`. The value a caller leaves in `r0`/`r1` is dead: `0x49694` is an argument-free accessor, so the "arguments" at `0xb1630`, `0xb1694`, `0xb1760`/`0xb1768` are compiler leftovers (`r0` = the `0x7424` offset still live from `movw r0,#0x7424` at `0xb1624`/`0xb1684`, or the return of the preceding call at `0xb1760`; `r1` = the caller's own second argument, or `22` at `0xb1760`). `[C]` — must-fail control: the function's first instruction after the push is a load into `r0`, and there is no read of `r1` between `0x49694` and `0x496a8`.
* **Return type/value:** `int8_t` (sign-extended byte). Either `(int8)(*(int32*)(base + 0xd758 + 12*slot))` or `(int8)(*(int8*)(base + 0xd56))`, `slot = (int8)(*(int8*)(base+0xd56))`.
* `0x496bc` uses **`ldrsb`** (signed slot index), `0x496dc` re-normalises through `uxtb`+`sxtb`, so the result is always a sign-extended 8-bit id. `[C]`

### `0x3f8634` — the mode predicate that picks the data path (complete)

```
0x3f8634 ldr r0,[r0,#28]     ; enum at mode_singleton+0x1c
0x3f8638 sub r0,r0,#5
0x3f863c cmp r0,#3
0x3f8640 movhi r0,#0
0x3f8644 bxhi lr             ; v<5 or v>8 -> 0
0x3f8648 and r0,r0,#15
0x3f864c mov r1,#11          ; 0b1011
0x3f8650 mov r2,#1
0x3f8654 and r0,r2,r1,lsr r0 ; (11 >> (v-5)) & 1
0x3f8658 bx lr
```

Returns exactly 1 for **v = 5, 6, 8** (0 for v = 7 and for every value outside 5..8). `[C]`
Sibling predicates over the same field (`0x3f865c` v in {3,6}; `0x3f8678` v in {2,3,4,5}; `0x3f8690` v == 1; `0x3f86a0` v == 9) show this is an **application/scene-state enum**, values 1..9 observed. The meaning of the individual enum values is `[U]` (needs the enum table or a live read of `*0x1838bb4`).

Note on addresses: `ldr rX,[pc,rY]` at `0x4969c` / `0x496b4` / `0xb1710` / `0xc9e90` resolves into one contiguous global-pointer array around `0x1838bb0-0x1839xxx` (computed `0x1838bb4`, `0x1838d74`, `0x1838d28`, `0x183980c`). The arithmetic is mine, so those four absolute addresses are `[B]`; the *offsets* (`0x1c`, `0xd56`, `0xd758`, `0x50`) and the `+0x1c` enum test are `[C]`.

### The two values, per writer

| Writer | side A (`0x49694()`) | side B | store into `0x7424` when bit3 set |
|---|---|---|---|
| `0xb161c(em, v)` | global id (as above) | **`v` = the function's second argument** (`mov r5,r1` @`0xb1628`, `strb r5` @`0xb1664`, `cmps r0,r5` @`0xb165c`) | `v` |
| `0xb167c(em, v)` | global id | **`0x49638()`** (`bl 0x49638` @`0xb168c`, `mov r5,r0` @`0xb1690`, `cmps r0,r5` @`0xb16c0`) | `0x49638()` |
| `0xb16e0(em)` | global id, read #1 (`0xb1760`, kept in `r5`) | **global id, read #2** (`0xb1768`) | read #1 |

So the invariant is the same in all three: `0x7420 = (global_state_id == applied_id)`. `0x49638` sits 0x5c bytes before `0x49694` in the same accessor cluster (`0x49554`, `0x49624`, `0x49638`, `0x49694`, `0x49704`, `0x4971c`, `0x49734`); its body was not disassembled within the call budget, so **which** side-B value `0xb167c` uses is `[U]` — but it is a getter (`mov r5,r0` then compare), not the caller's argument.

`0xb16e0`'s second read is of the *same* callee with no intervening write, so `(s2==s1)` is only ever 0 if `0x49694` is impure — it is not excluded, since it calls `0x3f8634`, which reads a live global. `[B]`: treat that path's flag as "always 1" unless the mode enum changes between the two calls.

## The writers: guards, `cmps` operands, stores — the state transition recorded

Common frame in all three: `r6 = em + 0x7424` (`0xb162c`, `0xb1688`, `0xb1758`).

Guard `0xb1634-0xb1644` (`0xb1698-0xb16a8`, `0xb176c-0xb1778` are the same code):

```
movw r1,#0x1428 ; ldr r1,[r4,r1]     ; r1 = em[0x1428]  (a sub-object pointer)
ldrb r1,[r1,#424]                    ; +0x1a8
tst  r1,#8
```

Two regimes; `bit3` is the "arbitration has started" latch:

1. `bit3 == 0` (first call for this latch): `em[0x7424] = 0x49694()` and `em[0x7420] = 1` unconditionally (`0xb1648/0xb1650/0xb1654`). No comparison happens. Semantics: *seed the cache from the global state and declare agreement.*
2. `bit3 != 0`: `em[0x7424] = side B`, and `em[0x7420] = (sideA == sideB)` (`0xb1664` then `0xb1668 moveq` / `0xb1670 movne` / `0xb1674 strb`). Semantics: *record the id that was just applied, and whether the manager already reports that same id.*

`0xb16e0` is the gated variant (the one that also touches `0x7423`) and is the clearest statement of intent:

```
0xb16f8 tst  em[0x1428]->[424],#8 ; beq exit        (same latch)
0xb1700 0x49624() ; 0xb1704 cmp #1 ; bne exit
0xb170c GOT(0x1787610)->[0]->byte[80] ; cmp #6 ; beq exit   ; third global slice
0xb1724 0x49554() ; 0xb1728 cmp #1 ; bne exit
0xb1738 em[0x7423] == 0 else exit                    ; one-shot latch
0xb1754 0x82d8c(em, 22, 1)                           ; apply request: field/state 22 = 1
0xb1760 s1 = 0x49694()                               ; before
0xb1768 s2 = 0x49694()                               ; after
   bit3 clear: em[0x7424]=s2 ; em[0x7420]=1          (0xb177c/0xb1784)
   bit3 set  : em[0x7424]=s1 ; em[0x7420]=(s2==s1)    (0xb1794/0xb1798-0xb17a4)
0xb17b4 blx *(em->vtbl + 1124)                        ; notify the entity (virtual 0x464)
0xb17c4 0xcafe8(em, 2, 0)
0xb17cc em[0x7423] = 1                                ; latch so this runs once
```

So the transition being recorded is: **"we issued request #22 (value 1) to the entity and here is whether the authoritative manager's id already equals it"**, latched by `0x7423` so the request/verdict pair is produced once per episode. `0x7424` is the id that was applied; `0x7420` is the "already satisfied" verdict.

The consumer (`0x82950-0x82a34`, from the shared context, not re-disassembled here): `em[0x1408] & 0x80` && `em[0x7420] != 0` → override the motion section with section 1 and the `0xb4e58(em,1)` pool pick. That is exactly the shape of a **no-op guard**: while the request has *not* yet been reflected by the manager (`0x7420 == 0`), the section dispatcher does not take the override branch.

## The driver

`refs_to` on `0xc9e80` with `pointers:true` over the whole image returns **one** hit: the absolute word at `0x1734d48` = `0x000c9e80`. `refs_to` on that slot address returns **one** hit: the word at `0x13fb53c` = `0x1734d48` (beyond `.text` end `0x13f1dec`, i.e. a data word). No `bl`, `b`, `adr` or pc-delta reference to `0xc9e80` exists anywhere in the image.

The slot sits in a **method table**, dumped with `read_words(0x1734d00, 96)`:

```
0x1734d3c 00000000        0x1734d40 00000000      <- two zero words before the table
0x1734d44 000c9d98  0x1734d48 000c9e80  0x1734d4c 000ca108
0x1734d50 0001eb64  0x1734d54 000ca104  0x1734d58 000caeb0
0x1734d5c 000c9eb0 (=b 0xad59c)  0x1734d60 0001eb90  0x1734d64 0088f4e8 (data)
0x1734d68 000c9eb8  0x1734d6c 000c9f38 (=b 0xae3e8)  0x1734d70 000ae368
0x1734d74 000c9f3c (=b 0xaf364)  0x1734d78 00890df4 (data)
0x1734d84 000c9eb4 (=b 0xaf368)  ...
```

Evidence it is a virtual/behaviour table rather than plain data: the neighbouring entries are code thunks into the same range that holds the writer call sites (`0xad59c`, `0xaf368`, `0xae3e8`, `0xaf364`, while the writers are called from `0xad890`, `0xadb8c`), and `0xc9e80`'s own body is a forwarding stub:

```
0xc9e80 push {r4,lr} ; r4 = r0
0xc9e84 bl 0xc9d98                   ; sibling slot at 0x1734d44
0xc9e8c..0xc9e94 GOT(0x176f974) -> object
0xc9e94 bl 0x7aa47c                  ; manager lookup
0xc9e98 ldr r1,[r0,#0] ; ldr r2,[r1,#52] ; r1 = r4 ; bx r2   ; manager->vtbl[13](this)
```

i.e. `0xc9e80(this) { 0xc9d98(this); Manager()->vfn13(this); }` — an attach/forward entry point, not the recomputation itself.

**Answer to "who drives it":** a dynamic indirect call through the table at `0x1734d44` (slot `0x1734d48`, i.e. index 1 / offset 4 if the table base is `0x1734d44`), or through the single data word at `0x13fb53c` that points at the slot itself. Which object/index reaches it cannot be resolved statically from references; it needs the class's vtable layout or a live dereference of the object's vtable pointer. `[B]` for the table-base/index reading (the two zero words at `0x1734d3c/0x1734d40` are consistent with an Itanium-style `[offset-to-top][typeinfo]` header), `[U]` for the identity of the caller.

Bounded negative: searched by `refs_to` (bl/blx-imm/b-any-cond/adr/pc-delta idiom over the whole code range, plus absolute pointer words over the whole image) for `0xc9e80` and for `0x1734d48` as targets. Both returned exactly the one hit listed. Not covered by that method: `blx rN` through a table built at runtime, and computed pointers — which is precisely the mechanism at play here.

## Why the flag exists

The entity issues a small numeric request (e.g. `0x82d8c(em,22,1)` in `0xb16e0`) into a system whose authoritative state lives in a global manager, and it needs to know, at the moment of dispatch, whether that request is already satisfied — because the motion-section dispatcher at `0x82950` would otherwise take an override branch (section 1 + a `0xb4e58` pool pick) that is only correct when the entity and the manager agree. `0x7420` is that answer, recomputed by the code that makes the request: `1` = "the id I just applied equals the id the manager reports (nothing to do)", `0` = "the manager still reports a different id (my request is pending)". `0x7424` carries the applied id so the two sides can be compared again after the manager catches up, and `0x7423` latches the request/verdict pair so it is produced once per episode. This is request/acknowledgement bookkeeping, not gameplay state.

## Self-FalsificationCheck

Three competing readings were tested against the disassembly instead of being assumed:

1. *H1: `0x49694` returns a mode/flag (path B always taken).* Falsified as the general case: `0x496c0 bne` and the `0x496c4-0x496d4` slot-table path are reachable and produce a different value; the path is selected by `0x496b0 cmp r0,#1` on `0x3f8634`, which I disassembled and which returns a bit test over `{5,6,8}`. Positive control that the branch really has two return shapes: `0x496d4 sxtb` (word path) vs `0x496dc uxtb`+`0x496e0 sxtb` (byte path).
2. *H2: `0x7420` stores the compared value itself.* Falsified: `0xb1674`/`0xb16d8` store into `em+0x7420` a value built only by `moveq #1`/`movne #0` (`0xb1668`/`0xb1670`), and the value goes to `em+0x7424` (`0xb1664`). Two distinct fields, two distinct roles.
3. *H3: `0xc9e80` is entity update code that calls the writers.* Falsified by its full body (`0xc9e80-0xc9eac`): one `bl 0xc9d98`, one `bl 0x7aa47c`, then `bx r2` — zero references to `0xb161c`/`0xb167c`/`0xb16e0`. The writers' real drivers are the four `bl` sites in the verdict table.
4. *H4: the "two `0x49694` results" reading generalises to all three writers.* Falsified per-site (`0xb165c` compares against `r5` = the argument; `0xb16c0` against `0x49638()`).

Residual risk accepted: `0x49638`'s body and the enum's symbolic meaning were not resolved (call budget), so the *names* of side A/side B are structural, not game-domain names.

## Difficulties

* **Call budget vs. breadth.** 10 calls forced a choice between disassembling `0x3f8634` (mode discriminator) and `0x49638` (side B for `0xb167c`) / `0xc9d98` (sibling slot). I chose `0x3f8634` because it decides `0x49694`'s output path; `0x49638` remains `[U]`. Remedy: one `disasm(0x49620, 40)` would cover it.
* **`0x7428` cannot be located.** The assignment mentions stores to `0x7424`/`0x7428`; `0x7424` is confirmed at `0xb1624`/`0xb1684`/`0xb1758`, but `0x7428` appears nowhere in `0xb161c-0xb17d4` or in `0xc9e80-0xc9f00` (which uses the `0xb724`-family frame). Locating it needs a whole-image literal scan for `movw #0x7428` (`literal_loads`), which I had no call left for. Suspected cause: the earlier observation mixed two object frames.
* **PIC arithmetic.** `ldr rX,[pc,rY]` targets had to be summed by hand (image data extends past `.text` to at least `0x1839xxx`), so absolute GOT addresses are `[B]`, not `[C]`; the field offsets they feed are `[C]`.
* **Driver identity is inherently dynamic.** `blx rN` through an object vtable cannot be recovered by `refs_to`; the bounded negative above is the strongest static statement available without a live vtable read of the object at `*0x7aa47c()`.
