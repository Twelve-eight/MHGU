# SUYU-GURecomp 35015f1 - MHGU 1.4.0 game_settings facts, part 1

External reference project: SUYU-GURecomp (GPL-3.0), commit 35015f1, file
`src/core/arm/recomp/game_settings.cpp` and the header comment block that introduces it.
Only facts were taken; nothing was copied, and no SUYU code is reproduced here. Every fact
below was re-checked against our own MHGU 1.4.0 binary (`Rabbit_RoApplicationMTFMasterReleaseNX.nss`)
using the pre-extracted disassembly in `.tmp/mhgu/suyu/dis-gs-1.txt` (16 instructions per block).

Method: SUYU's "main+X" offsets are treated as equal to our virtual addresses; the mapping is
already established at 0xBBCD34 (`mov r0,#1920` / `movw r7,#0x438`). The `SUYU cite` column gives
the `game_settings.cpp` line from the line-numbered excerpt, not a quote.

Status legend:

| status | meaning |
|---|---|
| VERIFIED | our bytes at the address substantiate the specific SUYU statement (structure, constants, register roles) |
| PLAUSIBLE | the address holds coherent code / a valid instruction boundary, but the SUYU statement itself (path membership, caller relation) is not decidable from the 16 shown instructions |
| CONTRADICTED | our bytes conflict with the statement (none in this file) |
| RUNTIME-ONLY | the statement describes behaviour that cannot be decided statically |
| n/a | the literal in the block header is not a code address (see the excluded table) |

## Confirmed

### Camera and projection cluster

| vaddr | meaning | SUYU cite file:line | status | evidence |
|---|---|---|---|---|
| 0x1C358 | camera projection function entry. Reads four floats from the params object in r1: +0x30, +0x34, +0x38 (aspect), +0x3C (FOV). Scales the +0x3C value by pi/180, so it is an angle in degrees. Builds the matrix through the shared helper 0x7C617C. | game_settings.cpp:46 | VERIFIED | `push {r11,lr}` at entry; `vldr s1,[r1,#0x3c]`, `vldr s17,[r1,#0x38]`, `vldr s16,[r1,#0x30]`, `vldr s0,[r1,#0x34]`; `vmul.f32 s1,s1,s2` where s2 is loaded from the literal at 0x1C37C = 0x3C8EFA36 (0.0174533, pi/180); then `bl 0x7C617C`, `pop {r11,pc}` |
| 0x1C3A8 | projection variant with swapped register roles: r0 = params object, r1 = output matrix. Same four fields read, now from r0; FOV converted from degrees; tail-branches into 0x7C617C. | game_settings.cpp:47 | VERIFIED | `vldr s2,[r0,#0x3c]`, `vldr s17,[r0,#0x38]`, `vldr s16,[r0,#0x30]`, `vldr s0,[r0,#0x34]`, `mov r0,r1`, `b 0x7C617C`. The null guard `cmp r1,#0` / `bxeq lr` sits at 0x1C3A0, so the real entry is 0x1C3A0 and 0x1C3A8 is 8 bytes inside it (a probe that skips the r1==null early-out) |
| 0x1C33C | look-at function entry: r0 = output view matrix, r1 = camera object. Passes camera+0x40, camera+0x60 and camera+0x50 as the three vector pointers to the builder 0x7C5E4C. | game_settings.cpp:48 | VERIFIED | `push {r11,lr}`; `add r12,r1,#64`, `add r2,r1,#96`, `add r3,r1,#80`, `mov r1,r12`, `bl 0x7C5E4C`, `pop {r11,pc}` |
| 0x1C380 | look-at variant: r0 = camera object, r1 = output matrix. Guarded by a null check on r1, then the same three vectors are taken from r0 and it tail-branches to 0x7C5E4C. | game_settings.cpp:49 | VERIFIED | `cmp r1,#0` / `bxeq lr`; `add r12,r0,#64`, `add r2,r0,#96`, `add r3,r0,#80`, `mov r0,r1`, `b 0x7C5E4C` |
| 0x18A48 | world-to-screen routine that SUYU names as the caller of the look-at variant 0x1C380. Real function entry with a large frame. | game_settings.cpp:49 | PLAUSIBLE | `push {r4-r11,lr}` and `sub sp,sp,#208` confirm a genuine entry with a big stack frame; the caller relation itself is not visible - the shown 16 instructions contain no branch to 0x1C380 |

### Filter constructors

Five of the six blocks share one idiom: fetch a singleton through 0x7AA47C, load the function
pointer at +0x20 of the singleton's vtable, then call it with r0 = singleton, r1 = allocation size,
r2 = 16, r3 = singleton. 0x8B8148 is the exception and looks like the body of such a constructor.

| vaddr | meaning | SUYU cite file:line | status | evidence |
|---|---|---|---|---|
| 0x968318 | filter constructor entry; allocates 64 bytes | game_settings.cpp:50 | VERIFIED | `bl 0x7AA47C`, `ldr r4,[r1,#32]`, `mov r1,#64`, `mov r2,#16`, `blx r4` |
| 0x8B2FBC | filter constructor entry; allocates 208 bytes | game_settings.cpp:50 | VERIFIED | `bl 0x7AA47C`, `ldr r7,[r1,#32]`, `mov r1,#208`, `blx r7` |
| 0x8B72E0 | filter constructor entry; allocates 192 bytes | game_settings.cpp:50 | VERIFIED | `bl 0x7AA47C`, `ldr r4,[r1,#32]`, `mov r1,#192`, `blx r4`; afterwards `add r12,r4,#124` |
| 0x8B8148 | constructor body that installs a vtable pointer (global+8) into [r4+0] and sets +0x10 = 1, +0x30 = 5, +0x34 = 8, +0x38 = 0 | game_settings.cpp:50 | PLAUSIBLE | `ldr r1,[pc,#316]`, `add r1,r1,#8`, `str r1,[r4,#0]`, `str r0,[r4,#16]`, `strh r0,[r4,#48]`, `mov r1,#8`, `str r1,[r4,#52]`, `str r0,[r4,#56]`. r4 is used before being set in this window, so 0x8B8148 is inside a constructor rather than at its entry (the entry may precede it) |
| 0x8C090C | filter constructor entry; allocates 192 bytes | game_settings.cpp:50 | VERIFIED | `bl 0x7AA47C`, `ldr r5,[r1,#32]`, `mov r1,#192`, `blx r5` |
| 0x9310AC | filter constructor entry; allocates 272 bytes | game_settings.cpp:50 | VERIFIED | `bl 0x7AA47C`, `ldr r5,[r1,#32]`, `mov r1,#272`, `blx r5` |

### Render size cluster

| vaddr | meaning | SUYU cite file:line | status | evidence |
|---|---|---|---|---|
| 0xBBCD34 | store site for the docked default size: 1920 and 1080 are written as a pair through r5 | game_settings.cpp:56 | VERIFIED | `mov r0,#1920`, `movw r7,#0x438` (1080), `stm r5,{r0,r7}`. Nearby the same block materialises 1280 (`mov r7,#1280`, stored through a base plus 0x44BAC8) and 720 |
| 0xBBCF90 | call site that invokes render-target creation | game_settings.cpp:57 | VERIFIED | first instruction is `bl 0xBBBDE0` |
| 0xBBBDE0 | render-target creation entry; receives the engine object in r0 and marks byte +0x1E | game_settings.cpp:57 | VERIFIED | `push {r4-r11,lr}`, `sub sp,sp,#92`, `mov r4,r0`, `strb r0,[r4,#30]` |

### Pia probe path (address list at cpp:1201-1208)

The list mixes genuine function entries with interior merge points, which fits a probe list: the
probes want to observe state in the middle of the handler, not only at its boundary. The addresses
below all decode to coherent ARM at a valid instruction boundary.

| vaddr | meaning | SUYU cite file:line | status | evidence |
|---|---|---|---|---|
| 0x1311010 | head of the list: frame-less thunk that loads the sub-object at +0x14 and tail-jumps into the setter 0x1315B48 | game_settings.cpp:1201 | PLAUSIBLE | `ldr r0,[r0,#20]`, `cmp r0,#0`, `bxeq lr`, `b 0x1315B48`; no push/no frame, so this is a tail-call thunk rather than a full function |
| 0x1313EE8 | handler entry gated by the Pia enable byte: returns at once when the byte at +0x6D of the global singleton is zero, otherwise allocates 1024 and enters the request loop | game_settings.cpp:1201, 1212 | VERIFIED | `push {r4-r11,lr}`; `ldr r0,[pc,#700]`, `ldr r0,[pc,r0]`, `ldrb r0,[r0,#109]` (109 = 0x6D, the enable flag documented at line 1212), `beq 0x1314144`; then `mov r1,#1024`, `bl 0x139E4CC` |
| 0x1313F50 | continuation of that handler: loop that calls the interface slots at +0x30 and +0x2C and repeats while the result equals 1 | game_settings.cpp:1201 | PLAUSIBLE | `bl 0x13141C0`, `ldr r1,[r1,#48]`, `blx r1`, `ldr r1,[r1,#44]`, `blx r1`, `cmp r0,#1`, `bne 0x1313F48` (loops back) |
| 0x13141C0 | function entry taking (r0 = handler, r1 = message): checks that the message word at [r1] equals 16, then dispatches; 104-byte frame | game_settings.cpp:1201 | VERIFIED | `push {r4,r5,r6,lr}`, `sub sp,sp,#104`, `bl 0x13A092C`, `ldr r0,[r5,#0]`, `cmp r0,#16`, then `bl 0x131E8F0` / `bl 0x131E99C` |
| 0x13141D8 | interior hook on the message-type test, 6 instructions into 0x13141C0 | game_settings.cpp:1201 | PLAUSIBLE | `ldr r0,[r5,#0]`, `cmp r0,#16`, `bne 0x13142EC`; the enclosing 104-byte frame is the one opened at 0x13141C4 |
| 0x1314264 | interior hook after the dispatch call: tests the status value on the stack and picks one of two paths | game_settings.cpp:1201 | PLAUSIBLE | `cmp r0,#0`, `beq 0x13142D4`, `ldrb r0,[sp,#88]`, `cmp r0,#1`, `beq 0x13142F4` |
| 0x1314278 | interior hook on the second status test (fall-through side) | game_settings.cpp:1201 | PLAUSIBLE | `cmp r0,#0`, `bne 0x13142E4`, `ldrb r2,[r5,#49]`, `bl 0x131F32C`, `cmp r0,#1` |
| 0x1314290 | interior hook on the return-value check of 0x131F32C (success path) | game_settings.cpp:1201 | PLAUSIBLE | `cmp r0,#1`, `bne 0x13142E4`, `ldr r0,[r4,#24]`, `bl 0x13153FC` |
| 0x1314298 | interior hook on the member-null test just before the send call | game_settings.cpp:1201 | PLAUSIBLE | `ldr r0,[r4,#24]`, `cmp r0,#0`, `beq 0x13142E4`, `add r2,sp,#24`, `add r3,sp,#16`, `bl 0x13153FC` |
| 0x13142A4 | interior hook while the argument block is staged on the stack | game_settings.cpp:1202 | PLAUSIBLE | `ldr r1,[sp,#100]`, `ldr r0,[sp,#96]`, `str r1,[sp,#20]`, `str r0,[sp,#16]`, `mov r0,r4`, `bl 0x13153FC` |
| 0x13142E4 | interior merge label where both paths join before the frame is released | game_settings.cpp:1202 | VERIFIED | `add r0,sp,#24`, `bl 0x13A7B50`, `add sp,sp,#104`, `pop {r4,r5,r6,pc}`; the frame arithmetic matches the `sub sp,sp,#104` at 0x13141C4 and the push at 0x13141C0 |
| 0x13153FC | message-send helper entry: packs a structure on a 64-byte frame from (r0, r1, r2, r3) and passes it on | game_settings.cpp:1202 | VERIFIED | `push {r4-r8,lr}`, `sub sp,sp,#64`, `mov r8,r0`, `mov r7,r3`, `bl 0x131E8F0`, `str r0,[sp,#36]` |
| 0x1315B48 | leaf setter that is the tail target of the 0x1311010 thunk: writes r1 into two fields, one of them on a global singleton | game_settings.cpp:1202 | VERIFIED | `str r1,[r0,#24]`, `ldr r0,[pc,#8]`, `ldr r0,[pc,r0]`, `str r1,[r0,#92]`, `bx lr` |
| 0x131F32C | list-walking helper entry: iterates a circular list whose sentinel is the object at +8, starting from the head at +12 | game_settings.cpp:1202 | VERIFIED | `push {r4-r11,lr}`, `sub sp,sp,#156`, `ldr r10,[r11,#12]`, `add r9,r11,#8`, `cmps r10,r9`, `beq 0x131F3C8` |
| 0x131C450 | hook on the entry side of a large function: reads a global singleton and bails out unless it is non-null and a call returns 1 | game_settings.cpp:1204 | PLAUSIBLE | `ldr r0,[pc,#360]`, `ldr r0,[r0]`, `cmp r0,#0`, `beq 0x131C4A8`, `bl 0x130FB68`, `cmp r0,#1`; r5 is used without being saved here, so this is inside a function, not at its entry |
| 0x131C4B8 | identity filter: compares a stack argument against the singleton's first and third words | game_settings.cpp:1204 | PLAUSIBLE | `ldr r1,[sp,#176]`, `ldr r2,[r0,#0]`, `cmps r2,r1`, `ldrne r0,[r0,#8]`, `cmpsne r0,r1`, `beq 0x131C5A8` |
| 0x131C4D8 | payload-copy / registration block before the reply codes are written | game_settings.cpp:1204 | PLAUSIBLE | `mov r0,r10`, `bl 0x130A7A8`, `bl 0x130A920`, `bl 0x130A8FC`, `strb r0,[r6,#1512]` |
| 0x131C5A8 | exit of that function: stores the status code 0x2C09 and releases a 184-byte frame | game_settings.cpp:1204 | VERIFIED | `movw r0,#0x2C09`, `str r0,[r8,#0]`, `bl 0x130CA48`, `add sp,sp,#184`, `pop {r4-r10,pc}` |
| 0x13AA5EC | helper entry taking (r0, r1) where r1+0x5EC addresses a sub-structure; looks up a member, then validates a type byte and a limit | game_settings.cpp:1204 | VERIFIED | `push {r4,r5,r6,r7,r11,lr}`, `movw r0,#0x5EC`, `add r1,r4,r0`, `bl 0x13A88C4`, `cmp r5,#0`, `ldrb r1,[r4,#9]`, `cmp r1,#2` |
| 0x13AA614 | interior hook directly after the lookup call: null check, then a version/type comparison | game_settings.cpp:1204 | PLAUSIBLE | `mov r5,r0`, `cmp r5,#0`, `beq 0x13AA698`, `ldrb r1,[r4,#9]`, `ldrb r2,[r5,#81]`, `cmpsne r1,r2` |
| 0x13AA658 | interior hook that normalises a result to 0/1 before the comparison | game_settings.cpp:1204 | PLAUSIBLE | `mov r1,r0`, `mov r0,#0`, `cmp r1,#1`, `bne 0x13AA69C` |
| 0x13AA668 | merge point of that helper (same +668 counter as 0x13AA640): compares the counter with the limit at +328, then reads the value at +1488 | game_settings.cpp:1204 | PLAUSIBLE | `ldr r0,[r6,#668]`, `ldr r1,[r7,#328]`, `cmps r0,r1`, `ldr r0,[r5,#32]`, `cmp r0,#5`, `ldr r0,[r4,#1488]`, `pop {r4,r5,r6,r7,r11,pc}` |

### Excluded blocks (literal is not a code address)

Listed so that the coverage of `dis-gs-1.txt` is complete and the omission is explicit.

| vaddr | meaning | SUYU cite file:line | status | evidence |
|---|---|---|---|---|
| 0x243C | field offset of the float target frame rate inside the engine object, not a main code offset | game_settings.cpp:44 | n/a | the block at vaddr 0x243C decodes to unrelated code (`str r0,[r5,#68]`, `mov r0,#8`), as expected for a data field; the value can only be observed at runtime |
| 0x1080 | docked height constant (1080), not an address | game_settings.cpp:56 | n/a | the number comes from the same prose line as the 0xBBCD34 store site; the block at vaddr 0x1080 is a `bx lr` thunk that has nothing to do with a size |
| 0x1440 | fragment of the doc-comment example "3440x1440", not an address | game_settings.cpp:373 | n/a | that line describes parsing a WxH string; 0x1440 is the height in the example |

## In progress

None - every block in `dis-gs-1.txt` is accounted for: 36 code addresses in the four tables above plus 3 excluded literals.

## Unknown

1. `main+0x18A6210` (the global that points at the engine object) has no block in `dis-gs-1.txt`. The pointer chain and the `+0x243C` field are therefore unverified by us; they need a data-side or runtime check.
2. Which of `+0x30` / `+0x34` is near and which is far. The projection code loads both identically (`vldr s16,[r1,#0x30]`, `vldr s0,[r1,#0x34]`); the distinction is not decidable from these instructions and SUYU leaves it open too.
3. The caller edge 0x18A48 -> 0x1C380. The 16 shown instructions of 0x18A48 contain no branch to 0x1C380; a wider scan of that function is needed.
4. Whether 0x8B8148 is a constructor entry or an interior point. r4 is live on entry to the block, so the real entry is probably earlier; needs the bytes before 0x8B8148.
5. Whether 0x131C450 / 0x131C4B8 / 0x131C4D8 / 0x131C5A8 belong to one function whose frame is released at 0x131C5B8. The 184-byte frame and the shared stack slots make it likely, but the prologue is outside the window, so this is an inference, not a proof.
6. What the Pia probe list actually observes: the request/response framing, the meaning of status code 0x2C09, and the roles of the +0x5EC sub-structure and the +668 counter are not established here.
7. RUNTIME-ONLY items from the header, not decidable from static bytes: the fps write policy (the value 30 is never written, the plausibility gate), `fps = auto` stepping, DisplayRateScale above 60, the effect of resolution / native_render on the 1920x1080 default, the output aspect, and the stretched HUD.

