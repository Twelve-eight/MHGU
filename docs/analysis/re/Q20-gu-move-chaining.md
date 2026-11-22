# Q20 · MHGU: where "which move can follow which" lives — data or code?

**One-line answer.** GU's move-to-move chaining is **mostly data, but not in a per-move table**: the per-monster
resource `enemy\cmd_tbl\emNNN_00_cmdtbl` (EMC byte code) is a decision tree whose **weighted case blocks
(`op 0x02`, percentages, 888/888 blocks sum to 100)** pick the next action, and whose enclosing switches
(distance / AI state bytes) are its conditions. The *identity* of an action is the pair
**`(state, variant)` = `(em+0x73E0, em+0x73E1)`**, which is then turned into a motion id by **per-monster C++
code** (two-level jump tables inside each `uEmNNN_nn` class body). A second, hand-written layer —
**`if (previous action == (s,v))`**, predicate `0x701A8`, 17 call sites — overrides/implements explicit combos.
There is **no table of "move → allowed next moves"** anywhere in `[[em+0x1428]]`; that block holds only runtime
state plus a 2-slot hit-record array.

Conventions: `vaddr = flat − 0x100`, image `G:/omp works/MHGU-private/main.140.flat.bin` (25,472,632 B),
arcs `G:/mhgu-romfs/romfs/nativeNX/arc/enemy/*.arc`. "sub" = `[[em+0x1428]]` (the object the EMC interpreter
uses as its context, `emc.md` §3).

---

## 1. What `[[em+0x1428]]` is, and the field census that rules out a per-move link table

`[[em+0x1428]]` (`sub`) is the enemy **AI runtime context**, not a data resource. Proof that the interpreter's
switch source is a `sub` field (op `0x08` handler, `0x83E10`):

```
00083e24: ldr r0,[sp,#360]      ; slot holding &sub
00083e28: movw r1,#0x5cdc
00083e2c: ldr r0,[r0,#0]        ; r0 = sub
00083e30: ldrb r0,[r0,r1]       ; value = byte [sub+0x5CDC]      <- this op's switch input
00083e38: mov r0,r8 / r1,r9 / r2,#8 ; matcher(em, ip, mode 8, value)
```
Same shape for op `0x09` (`0x83E48…0x83E60`, `[sub+0x5CDD]`, mode 9), op `0x23` (`0x84064`, `[sub+0x5CB7]`, mode 35),
op `0x29` (`0x8409C`, `[sub+0x5CB6]`), op `0x60` (`0x84DEC`, `[sub+0x5CCB]`), op `0x63` (`0x84E24`, `[sub+0x5CBA]`).

### 1.1 Census method and result
I decoded every site that materialises the constant `0x1428` in code, resolved the following
`ldr rS,[rB,rd]`/`ldr rS,[rB,rd]!` that actually dereferences it (**7694 sub-pointer definitions**), and
histogrammed the imm12 loads/stores made on that register in the next 80 instructions. Top offsets
(count, sample site):

```
0x01A1/0x01A2/0x01A3  21500/1137/267   0x6BAB0 0xCF1AD0 0x7A3C0     (three adjacent bytes: AI flags)
0x03DC 1826  0x01BB 1461   0x0040 1079  0x0048 1032  0x0044 978       (positions: +0x30/+0x34/+0x38 own, +0x40/+0x44/+0x48 target)
0x01BC 824   0x0054 676   0x01D0 643   0x01D8 620   0x0014 451      (+0x54 = heading u16, see emc.md §5)
0x01BA 416   0x0050 406   0x0918 344   0x01D4 324   0x052A 287
0x01A8 95    0x0249 98    0x02C0 188   0x0384 ~      0x0998 —      (0x384 = dmg scale f32, Q5b)
0x02E8..0x0304 (6 floats, emc.md op 0x7C)
```
**No contiguous stride-indexed array appears in this census** — the only two arrays the block itself owns are:

| field | stride | index | who indexes it | what it is |
|---|---|---|---|---|
| `sub+0x998` | **0xB8 (184)** | hit **slot** `r10` (0 or 1, `cmp r10,#1` @ `0x7DC50`) | `0x7DDE8: smlabb r0,r10,#184,r1` + `0x7DDEC: movw r1,#0x998` | the 2 expanded hit records (Q5b) |
| `sub+0x2E8` | 4 | constants | `0x8E55C` (op `0x7C` mode 24) | 6 floats the AI can switch on |

Neither is indexed by an action/move number. **The per-action data of a move is not in this block** — the
attack rows live in a separate resource and are fetched by attack id:

```
00070FFC: mov r2,r0                     ; em
00071000: cmp r1,#1000                  ; id
00071004: blt 0x71024
00071008: movw r0,#0x75D8 ; ldr r2,[r2,r0]   ; id>=1000 -> second table (id -= 1000)
00071030: movw r3,#0x75D4 ; ldr r2,[r2,r3]   ; id<1000  -> first table
00071040: ldr r3,[r2,#100] ; ldr r3,[r3,#8]  ; count  (header at [+100], count at +8)
00071048: cmp r3,r1 ; bxls lr                ; id >= count -> return 0
00071050: ldr r0,[r2,#104]                   ; record array
00071054: add r0,r0,r1,lsl #5                ;  <-- stride 32, index = attack id
```
i.e. `attackdata` rows: 32 B, `index = attack id`, `count` at `[[em+0x75D4]+100]+8`, base `[[em+0x75D4]+104]`
(`0x70FFC–0x71058`), matching `enemy\hit_data\em001_00_attackdata` = 2064 B = 0x10 + 64×0x20.

---

## 2. Where the action index actually lives: `(state, variant)` at `em+0x73E0 / em+0x73E1`

Both bytes are fields of **`em`**, not of `sub`: in `0xAFDA4` the same base register `r4` yields the vtable
(`ldr r0,[r4,#0]`), `sub` (`movw r0,#0x1428; ldr r0,[r4,r0]!`) and `em+0x73E0` (`0xAFD58: movw r1,#0x73E0;
ldrb r1,[r4,r1]`).

### 2.1 The state setter writes the pair (this is the "action id" write)
`0x76154(em, state, variant, flag)` — entered from `0x75574(em,a,b,0)` which `op 0x00` calls
(`0x84628` handler → `0x846D8 bl 0x76008` → `0x76138 bl 0x76154`; general path `0x85A00 → 0x85A14 bl 0x75574`,
`0x755A8 b 0x76154`). Argument→store mapping is literal:

```
00076170: strb r6, [sp, #19]     ; arg1 = state
00076174: strb r10,[sp, #18]     ; arg2 = variant
00076844: ldrb r1, [sp, #18]     ; variant
00076848: ldrb r2, [sp, #19]     ; state
00076864: movw r0,#0x73E0
00076868: strb r2, [r9, r0]      ;  em+0x73E0 = state
0007686c: movw r0,#0x73E1
00076870: strb r1, [r9, r0]      ;  em+0x73E1 = variant
```
Immediately before, the old pair is snapshotted into the previous pair:

```
000763E8: movw r0,#0x73E0 ; movw r1,#0x73E2 ; ldrb r0,[r9,r0] ; strb r0,[r9,r1]   ; prev_state = state
000763F8: movw r0,#0x73E1 ; movw r1,#0x73E3 ; ldrb r0,[r9,r0] ; strb r0,[r9,r1]   ; prev_variant = variant
```
So: **`em+0x73E0` = current state (0..17), `em+0x73E1` = current variant (= the action number inside that
state, `0xFF` = none — several readers test `cmp r0,#0xFF`), `em+0x73E2/0x73E3` = previous state/variant** [C].

### 2.2 Level-1 table: 18 states, one word each, inline jump table
`0xD227D8` (em003_00) and `0xD52F58` (em008_00) are byte-identical in shape:

```
00d52f58: e30703e0  movw r0, #0x73e0
00d52f5c: e7d40000  ldrb r0, [r4, r0]      ; r0 = em->state
00d52f60: e3500011  cmp r0, #17            ; <-- the comparison (0..17 valid)
00d52f64: 8a000021  bhi 0xd52ff0           ; default handler
00d52f68: e1a00100  mov r0, r0, lsl #2     ; stride 4
00d52f6c: e28f1004  add r1, pc, #4         ; r1 = table base (0xd52f78)
00d52f70: e7900001  ldr r0, [r0, r1]       ; <-- the index load
00d52f74: e080f001  add pc, r0, r1         ; jump (entries are base-relative offsets)
```
em008_00's table at `0xD52F78`, 18 entries, resolved targets:

| state | handler | state | handler | state | handler |
|---|---|---|---|---|---|
| 0 | 0xd52fc0 | 6 | 0xd52ff0 | 12 | 0xd53028 |
| 1 | 0xd52fcc | 7 | **0xd53004** | 13 | 0xd53044 |
| 2 | 0xd52fd8 | 8 | 0xd52ff0 | 14 | 0xd52ff0 |
| 3 | 0xd52fe4 | 9 | 0xd52ff0 | 15 | 0xd52ff0 |
| 4 | 0xd52ff0 | 10 | 0xd53010 | 16 | 0xd52ff0 |
| 5 | 0xd52ff0 | 11 | 0xd5301c | 17 | 0xd53068 |

State 7 is the attack family (`em008_00AttackMove`, from the generator note in
`docs/mechanics/monster-state-machine.md`; state 0/1/2/3/12/13 = FwMove/ActionMove/MoveMove/FlyMove/
RevivalMove/DemoMove) [B: the names come from that doc, the table above is recomputed].

### 2.3 Level-2 table: the per-action record table, indexed by the variant byte
`0xD53004` is `b 0xD51EA8`, and `0xD51EA8` is the per-variant dispatcher for em008_00's attack state:

```
00d51eb4: e30703e1  movw r0, #0x73e1
00d51eb8: e7d40000  ldrb r0, [r4, r0]      ; r0 = em->variant  (the action number)
00d51ebc: e3500063  cmp r0, #99            ; <-- inclusive bound (100 entries)
00d51ec0: 8a0000ed  bhi 0xd5227c           ; default handler
00d51ec4: e1a00100  mov r0, r0, lsl #2     ; stride 4
00d51ec8: e28f1004  add r1, pc, #4         ; table base 0xd51ed4
00d51ecc: e7900001  ldr r0, [r0, r1]       ; <-- the index load
00d51ed0: e080f001  add pc, r0, r1
```
Table `0xD51ED4`: **100 words, index = variant, stride 4, entry = base-relative handler offset**;
56 distinct handlers, default `0xD5227C`. Dump (variant → handler, non-default rows):

```
0->d52064 1->d52074 2->d52260 3->d52064 4->d5226c 6->d52084 10->d52098 11->d52294 18->d522a8
24->d522c0 25->d520a4 26->d520b0 28->d520bc 29->d520c8 30->d522cc 31->d52324 32->d5238c 33->d520dc
34->d520e8 35->d523e4 45->d520f8 54->d52108 55->d52118 56->d52128 62->d52144 63->d523f8 64->d52404
65->d52150 70->d5215c 71->d52418 72->d52168 73->d5242c 74->d52174 75->d52438 76->d5244c 77->d52180
78->d5261c 79->d52468 80->d5218c 81->d521f4 84->d52204 85->d52210 86->d524dc 87->d52220 88->d5222c
89->d524ec 90->d524f8 91->d5250c 92->d5251c 93->d52238 94->d52244 95->d52528 96->d5253c 97->d52254
98->d52548 99->d5255c        (all other variants -> default 0xd5227c)
```
Each handler tail-calls into the class body, e.g. `variant 0 -> 0xD52064: b 0xD4E938`,
`variant 1 -> 0xD52074: b 0xD4E9EC`. The same idiom with a *shifted* base exists for other classes:
`0xD3137C` gates on `state==7` (`cmp r0,#7` @ `0xD31384`) and then `sub r1,r0,#5; cmp r1,#16` (`0xD31394/
0xD31398`) with 17 words at `0xD313B4` — i.e. "variant 5..21" for that class.

**So the per-action table the ticket asks for exists, but its records are code addresses**
(`{handler}`), stride 4, indexed by `em+0x73E1`, not by a motion id, and it lives in the class's code
(`.text`, inline after the dispatcher), **not** in `[[em+0x1428]]`.

---

## 3. The chaining data: `cmdtbl` (EMC) — the weighted "next action" tree

`em001_00_cmdtbl` (51200 B, 21 sections, section 1 = 238 command-list entries, 3787 instructions;
`MHGU/tools/mhgu/emc.mjs` parses it). Instruction budget of section 1:
`op00:877 op14:394 op02:372 op24:252 op07:243 op0b:103 op1d:216`.

### 3.1 `op 0x02` is a percentage roulette — the direct analogue of Rise's `_TransitionRate`
```
000846e0: movw ... ldrb r1,[r9,#0]   ; begin operand
000846f0: beq 0x85814                ; operand==0 -> roll a value
00084700: mov r2,#2                  ; matcher mode 2
00085814: ldr r0,[sp,#384]           ; u16 source
00085818: movw r1,#0x851F ; movt r1,#0x51EB   ; 0x51EB851F = /100 magic
00085828: umull r1,r2,r0,r1 ; mov r1,r2,lsr #5 ; mov r2,#100
00085834: sub  r0,r0,...             ; r0 = u16 % 100   (0..99)
0008583c: mov r2,#2 ; str r0,[sp,#0] ; matcher(em, ip, mode 2, roll)
```
and the matcher accumulates the case operands (`0x8E8C4: uxtah r6,r2,r6` = running sum) before the
`vcmpe/blt` decision at `0x8E86C`. Corpus check on em001_00: **888 op02 blocks, 888 with case operands
summing to exactly 100** (script over `parseEmc` output) [C].

### 3.2 Real chaining rows (em001_00, section 1, entry file offset in the arc entry)
`path` = the enclosing switch chain, `weight` = the op02 case operand, `next action` = the leaf
`op00(state,variant)` (⇒ §2: this is what gets written to `em+0x73E0/0x73E1`):

| # | cmdtbl location | condition path (raw op chain) | weight | next action |
|---|---|---|---|---|
| 1 | s1.entry075 `@+0x9E10` pos25 | `op80.then > op24.default > op91.case(2) > op92.case(0)` | 25 % | `op00(7,35)` → state 7, variant 35 |
| 2 | s1.entry075 `@+0x9E10` pos31 | same | 45 % | `op00(7,46)` |
| 3 | s1.entry075 `@+0x9E10` pos37 | same | 30 % | `op00(7,47)` |
| 4 | s1.entry075 `@+0x9E10` pos50 | `… > op92.case(1)` | 10 % | `op00(7,95)` |
| 5 | s1.entry075 `@+0x9E10` pos56 | `… > op92.case(1)` | 60 % | `op00(7,46)` |
| 6 | s1.entry075 `@+0x9E10` pos62 | `… > op92.case(1)` | 30 % | `op00(7,47)` |
| 7 | s1.entry150 `@+0xAA50` pos8 | `op1d.then` | 40 % | `op00(7,9)` |
| 8 | s1.entry150 `@+0xAA50` pos14 | `op1d.then` | 60 % | `op00(7,30)` |
| 9 | s1.entry181 `@+0xB010` pos29 | `op24.default > op1c.then > op4b.then` | 35 % | `op00(7,253)` |
| 10 | s1.entry181 `@+0xB010` pos46 | same | 15 % | `op00(7,254)` |
| 11 | s1.entry079 `@+0xA090` pos13,19 | `op0b.case(0)` (distance bucket 0) | 95 % / 5 % | `op00(4,13)` / `op00(4,10)` |
| 12 | s1.entry042 `@+0x9620` pos4,10 | — | 55 % / 45 % | `op00(4,8)` / `op00(4,9)` |
| 13 | s1.entry035 `@+0x95A0` pos4,10 | — | 40 % / 60 % | `op00(1,1)` / `op00(0,255)` |

Read row 1–6 as: *"in the context `op91.case(2)` (a sub-state switch) and `op92.case(0/1/4)` (another small
switch), the next attack is variant 35/46/47 with 25/45/30 %"* — a genuine from-context→next-action row set.

### 3.3 Command-list calls (`op 0x14`) are the tree's own subroutines
```
00083EEC: bne 0x83F40
00083EF0: add r1,r3,#2                ; return ip
00083EF4: ldr r3,[sp,#284]            ; slot counter
00083F00: ldrb r2,[r3,#0] ; cmp r2,#12 ; subcs r2,r2,#1 ; strbcs r2,[r3,#0]   ; saturating at 12
00083F18: add r2,r8,r2,lsl #3         ; em + idx*8
00083F20: strb r3,[r2,r6]             ;   +0x7350 = byte A
00083F30: strb r3,[r2,r6]             ;   +0x7351 = byte B
00083F3C: str r1,[r2,r3]              ;   +0x7354 = return script pointer
...
00083F84: ldr r1,[r1,r0,lsl #2]       ; table[operand]  <-- the callee ip
00083F88: str r1,[r2,#0]              ; jump
```
⇒ `em+0x7350` is a **12-slot × 8-byte call stack** `{u8 section, u8 entry, u16 pad, void* ret}` [C].
This is why the tree can call a named command list (`op14(30)` at s1.entry0) instead of inlining it.

---

## 4. The chaining code: `if (previous action == …)`

`0x70178 / 0x701A8` is a **pure predicate** on the pair of §2:
```
00070178: movw r3,#0x73E2 ; ldrb r3,[r0,r3]  ; prev_state
00070180: cmp r3,r1 ; bne 0x701A0             ; r1 = state
00070188: movw r1,#0x73E3 ; ldrb r1,[r0,r1]  ; prev_variant
00070190: mov r0,#1 ; cmp r1,r2 ; movne r0,#0 ; r2 = variant
0007019C: bx lr                              ; returns 1 iff (prev_state,prev_variant)==(r1,r2)
```
**17 direct call sites**, all inside monster classes (`0xD89A74 0xDB0D64 0xDEBF34 0xF99A30 0xF9B678 0xFA6C40
0xFA6E28 0xFA7224 0xFC911C 0xFC9134 0xFC9444 0xFC945C 0xFDBEF8 0xFDBF10 0xFDC024 0xFE0EC8 0xFE0EE0`).
A verbatim combination ("attack 65 **or** 67 must have been the previous move"):
```
000FC9104: ldrb r0,[r7,#0] ; cmp r0,#12 ; bne 0xFC916C     ; gate on a context byte
000FC9114: mov r1,#7   ; mov r2,#65 ; bl 0x701A8           ; prev == (state 7, variant 65)?
000FC9124: bne 0xFC9140
000FC912C: mov r1,#7   ; mov r2,#67 ; bl 0x701A8           ; prev == (state 7, variant 67)?
000FC9138: cmp r0,#1   ; bne 0xFC916C
000FC9140: ldr r0,[r6,#0] ; mov r1,#1 ; strb r1,[r0,#106]  ; set a flag byte the caller reads
```
This is a hand-written combo gate: "the follow-up is allowed only if the previous action was one of two
specific attack variants". Counts: **28 sites read `em+0x73E2`, 21 read `em+0x73E3`** (literal scan).

---

## 5. Port answer (what a port can translate, what it must re-author)

1. **Weights + conditions are data and translatable** [C]: `cmdtbl` `op 0x02` = percentage pool
   (`roll = u16 % 100`, case operands sum to 100, 888/888); the enclosing switches are the conditions.
   A translator can emit Rise `EnemyRoutineLotSet` rows (`_TransitionRate` = the case operand) keyed by
   the same action pair, provided it also emits the `op02`→`op02` nesting as `_CheckAlternative` chains.
2. **The action id is `(state, variant)` = `(em+0x73E0, em+0x73E1)`, not a motion id** [C] — so every
   GU link row must first be resolved through the two dispatch tables of §2.3 (stride 4, inline per class)
   to the motion constant its handler requests.
3. **That `(state,variant) → motion` mapping is code** [C]: 100-entry / 17-entry / 18-entry jump tables inside
   each `uEmNNN_nn` body, handlers that `b` into hand-written case bodies which call the play family
   (`0xAFDA4/0xAFF40/0xAFF48/0xAFFAC`) with constant ids. It cannot be read out of the resource; it must be
   extracted from the binary (that is what `MHGU/tools/gu-moves/gu-moves.mjs` does) and baked into the port.
4. **Hand-written combo gates must be re-authored** [C]: the 17 `0x701A8` call sites encode "this follow-up
   only after variant 65 or 67" style rules; there is no data form to translate.
5. **Per-row fields to carry**: `from (state,variant)` [from the enclosing path], `to (state,variant)`
   [`op00` operands], `weight` [op02 case operand, 0..100], `condition` [the enclosing switch op + its case
   operand + its source: `sub+0x5CB6/0x5CB7/0x5CBA/0x5CCB/0x5CDC/0x5CDD/0x1BA/0x2C0`, `em+0x73E0/0x73E1`,
   or a distance bucket from `0x0B/0x17/0x5C/0x7C`], and `order` (case order matters for the accumulate).
   Nothing else is needed: no per-move list exists to copy.
6. Practical consequence: a port that keeps GU's *weights and conditions* but re-authors the
   `(state,variant)` space freely will not reproduce GU combos; the pair space must be kept 1:1 and mapped
   to Rise motion ids, because the code-side gates refer to it by number.

---

### 5b. Cross-reference to the Rise side — one mental model for both games
**GU keeps exactly one step of history, not a chain list.** The pair `(em+0x73E0, em+0x73E1)` is the current
action; `0x76154` copies it to `(em+0x73E2, em+0x73E3)` at the moment it writes a new one (`0x763E8/0x763F8`).
A literal scan proves the depth is 1: `0x73E2` has **exactly one writer** in the whole image (`0x763EC:
strb r0,[r9,r1]`, r1=0x73E2) and 28 readers, `0x73E3` likewise **one writer** (`0x763FC`) and 21 readers — no
code ever writes a second-generation "prev-prev" pair, because no such slot is used (the bytes `0x73E4`/`0x73E5`
are a separate flag/sub-state field read by `0x6CBE4`/`0x763D4`, `0x73E6` is a u16 written at `0x6DDA0`, `0x73E8`
a u16 written at `0x76878` from the variant argument) [C]. Every explicit combo test I found is a **predicate on
that single previous pair** (`0x701A8`, 17 sites; example `0xFC9104`), i.e. GU's history is *depth 1*.

So the port has **one** model:

| | MH Rise | MHGU |
|---|---|---|
| action id | act-table index (per-monster act file) | `(state, variant)` = `(em+0x73E0, em+0x73E1)` |
| history kept | `_ActionTableData` history, depth 2 (current + 1 previous) | current (`0x73E0/0x73E1`) + previous (`0x73E2/0x73E3`) |
| how history is used | 1-deep "previous table" blocklist in `EnemyRoutineLotSet` | `isPrevAction(state,variant)` (`0x701A8`) gates + `op 0x08/0x09` switches |
| weight | `_TransitionRate` in `EnemyRoutineLotSet` | `op 0x02` case operand, `u16 % 100`, sums to 100 |
| decision data | act table (resource) | `cmdtbl` EMC byte code (resource) |

Consequence for S-E: a port can carry GU's *weights, conditions and the 1-deep previous-action memory*
across with the same mental model as Rise's `_ActionTableData` blocklist; only the mapping
`(state,variant) → motion id` and the 17 hand-written predicate gates have to be re-authored.

## 6. Confirmed / unknown

### Confirmed
- `sub = [[em+0x1428]]`; interpreter switch sources `[sub+0x5CD8…]`-family bytes (`0x83E10/0x83E48/0x84064/0x8409C/0x84DEC/0x84E24`).
- `em+0x73E0/0x73E1` = state/variant written by `0x76154` (`0x76868/0x76870`), previous pair copied at `0x763E8/0x763F8`.
- L1 table 18 words, `cmp #17`, `ldr r0,[r0,r1]; add pc,r0,r1` (`0xD227D8`, `0xD52F58`); em008_00 18 rows dumped.
- L2 per-action table: `cmp #99`, 100 words at `0xD51ED4`, index `em+0x73E1`, stride 4 (`0xD51EB4–0xD51ED0`); 56 distinct handlers.
- Second L2 with base/bound variant: `0xD3137C` (`cmp #7` on state, `sub #5`/`cmp #16`, 17 words at `0xD313B4`).
- op02 = `u16 % 100` roulette + accumulate; 888/888 blocks sum to 100 in em001_00.
- op14 = 12-slot call stack at `em+0x7350` (stride 8, `0x83ED8–0x83F3C`).
- op00 → `0x76008` → `0x76154`; general path `0x85A00`.
- Attack rows: stride 0x20, index = attack id, `[em+0x75D4]` (`id<1000`) / `[em+0x75D8]` (`id>=1000`), count at `[[..]+100]+8` (`0x70FFC`).
- Hit records: stride 0xB8, 2 slots (`0x7DDE8`, `0x7DC50`).
- Previous-action predicate `0x701A8`; 17 call sites; `0xFC9104–0xFC9148` is a two-value combo gate.

### Unknown `[U]`
- `[U]` The exact meaning of `op 0x02`'s value source: `[sp+384]` is a u16 slot inside the interpreter frame; I did not
  trace where it is filled (random vs frame counter). The `% 100` and the accumulate are proven; "uniform random" is not.
- `[U]` Names/semantics of most switch ops (`0x24 0x80 0x91 0x92 0x1C 0x1D 0x2A 0x2E 0x4B 0x6A 0x6E 0x07 0x0C 0x16`);
  only `0x02 0x00 0x14 0x08 0x09 0x0B 0x17 0x5C 0x7C 0x23 0x29 0x60 0x63` are anchored to code.
- `[U]` Which 8-bit field of `em` (`0x73E4`, `0x73E6`, `0x73E8` u16) complements the pair; `0x76154` also reads
  `0x73E4` (`0x763D4`) and writes `strh r10 → 0x73E8` (`0x76878`).
- `[U]` `[[em+0x75EC]+0x78] + byte[sub+0x249]*0x20` (`0x71144`) — a 32-byte record table indexed by a `sub`
  byte; its record layout and what `sub+0x249` is were not established.
- `[U]` Whether the variant space is class-local or shared: em008_00 bounds at 99, the `0xD3137C` class at
  5..21 inclusive; I did not enumerate all 94 monster classes.
- `[U]` The mapping `(state,variant) → motion id` for em001 (that is `gu-moves`' output, not reproduced here).

## Self-FalsificationCheck
- **H1 "the link table is a field of `[[em+0x1428]]`"** — falsified: a 7694-site offset census of every
  `sub`-register access turns up no stride-indexed array other than `+0x998` (2 slots, indexed by hit slot)
  and the 6 floats at `+0x2E8`. Must-fail control: the same census *does* find `+0x998` and `+0x30/0x40`
  (positions), i.e. it is sensitive to arrays that exist.
- **H2 "the links are the per-monster class switch (pure code)"** — partially falsified: the class switch is
  indexed by `(state,variant)` and only *maps* an action to a motion; the *choice* among actions is the
  `cmdtbl` tree with percentage pools (888/888 sum 100), which is data.
- **H3 "the cmdtbl is data but the weights are per-case thresholds on a counter, not a roulette"** —
  falsified by `0x85814`: `umull` by `0x51EB851F`, `lsr #5`, `-100×q` ⇒ `u16 % 100`, and the matcher's
  `uxtah` accumulate (`0x8E8C4`).
- **H4 "`em+0x73E0` is a `sub` field"** — falsified: `0xAFDA4` uses one base register for the vtable
  (`[r4,#0]`), `[r4+0x1428]` and `[r4+0x73E0]`, so `0x73E0` is on `em`; `sub`'s own switchable bytes are
  `0x1BA/0x2C0/0x5CB6…`.
- **Anti-circularity**: none of the dumped rows were produced by a tool that also assumes the answer;
  the row dump is `parseEmc` + a generic tree walk, and the table dumps are raw image words resolved by
  `base + word`.

## Difficulties
- **`0x1428` is an extremely common immediate** (8819 code sites), so `literal_loads` alone is useless; I had
  to write a small dataflow scan (movw → following `ldr rS,[rB,rd]` → 80-instruction window) and even then
  the per-offset *counts* are inflated by window overlap (the same instruction is attributed to several
  definitions). Only the offset *set* is trustworthy; I used it negatively (no stride array) plus the two
  positive hits, and did not publish the counts as evidence.
- **No tool listed the class→em mapping for `0xD52xxx`/`0xD31xxx`**, so "state 7 = the attack family" is taken
  from the generated `monster-state-machine.md` ([B]) rather than re-derived from the class-name string.
- **`op 0x14`'s callee table** is reached through `[[sp+404]] → [0]+4 → [operand*4]`; the `[sp+404]` slot is
  written on a path I did not enumerate, so "entry n of the current section" is inference from the entry
  counts (section 1: 238 entries vs operands up to 223) rather than proven.
- The 12-slot saturation `cmp r2,#12; subcs r2,r2,#1` looks like a clamp that can loop on the same slot;
  I report the store shape only, not the stack discipline.

## 更正（2026-11-07，S-G Q25）：那"17 处前置门"**不是门**，是 16 处"上一动作判断"

- **计数**：`calls_to 0x701A8` = **16 个 `bl`**；`calls_to 0x70178` = 1 个，地址 `0xdb0d64`——正是本文列表里的第 17 项。
  `0x70178` 是 `0x701A8` 的**字节级孪生**，被误并进同一个列表。真值 **16**（三种方法一致：MCP、全量 A32 解码、无 `b`/`adr`/指针表引用）。
- **语义**：`isPrevAction(em, u8 s, u8 v)` 读 **`em+0x73E2`/`0x73E3`（上一步）**，两次 8 位比较，无写入。
  **坑**：`0x6FF44` 读的是 **`em+0x73E0`/`0x73E1`（当前）**，别混。
- **位置**：16 处全部在**已经派发的动作内部**（多在 `[[em+0x1428]+0x1A1]` 相位机的 phase-0 分支），
  用来**选后续分支**，不是"能不能起手"。所以本文"17 处手写前置门必须重写"的模型作废。
- **真正影响行为的只有**：S3/S4（跳过起手）、S15/S16（helper 返回 0 的分支）；**S14 的返回值被 `pop` 丢弃**。
- **分布**：10 个不同 `(state,variant)` 字面量；9 个点是 `(7,67)`×4、`(7,65)`×3、`(3,39)`×2；
  4 个点比较自己那一对（自重复），3 个比较同 state 兄弟，em076 的 6 个点表达同一个"从 7:65|7:67 来"。
- **别只搜 `bl`**：同样的判断还有 ~10 处**内联**（`movw` 直接加载 `0x73E2`/`0x73E3`，原始命中 28/21）。

详见 `MHGU/sessions/S-G/Q25-report.md`。
