# Worked example: from a monster data block to the code that consumes it (dttune status block)

Audience: an agent that must repeat this for rage/tired (T2) or detection (T4).
Status of this example: DONE. Read-in, owner, consumer (reset / add / grow) and the arithmetic check are verified.
Section 4 is the route that worked; section 5 keeps the dead ends (scans and a wrong vtable-slot assumption) so you do not repeat them.
Evidence tags: [C] verified in bytes/disasm, [B] inferred, [I] indirect, [U] unknown.
Report with the raw log: `.tmp/reports-mech/t1-dttune-consumer.md`. Read `re-guide-gu.md` first.

## 0. Inputs

- Data: dttune status block, 6 x u16 LE per status [initial, A, B, durationFrames, increase, max]; offsets per monster in `MHGU/docs/data/json/monster-dttune-index.json` (hex strings), values in `MHGU/docs/wiki/monster-status.md`, layout notes in `.tmp/scratch-mech-status-gu/big-status-layout.txt`.
- Example values (cite the slot map, never memory): `monster-slot-map.json` has emid 1 = slot 0 (Rathian), emid 81 = slot 66 (Astalos). Rathian poison `[180,600,5,3600,100,580]` at blob offset 0x35C [C, status-gu.md]. em081_00 block base 0x326.
- Binary: `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`, vaddr = flat - 0x100, ARM A32 only.
- Tools: `node ".tmp/re-cli.mjs" disasm|words|calls|lits|fn <vaddr> [n]`. The mhgu-re MCP server may run a STALE decoder (see trap C).

## 1. Recipe overview

1. Identify the resource class and its loader (type hash -> class name -> registration function -> loader).
2. Read the loader: it tells you the runtime layout (which heap block / member holds which file range, and which flag byte says "absent").
3. Turn the layout into search patterns (member offsets), find readers.
4. Follow the readers to the object that owns the gauge; find add / compare / grow.
5. Sanity-check the arithmetic with two monsters' real values.
6. Premise-check every candidate before trusting it (see trap A).

## 2. Step 1: class and loader [C]

- Type hash 0x48e8ac29 = crc32 (poly 0xEDB88320, init 0xFFFFFFFF, NO final xor) of `rEnemyDtTune` (stealth-gu.md).
- Registration fn `0x564bc` (docs/analysis/monsters/mon-class-map.md line 126): class size 0x128, tag `dtt`. It names only 5 members (DefTime +0x4, EscapeTime +0x6, FastTime +0x8, ExTime +0xA, Genus +0xC). It does NOT name the status block. So "find the member table" gives no status names; the layout must come from the loader.
- Loader: `0x57740(res)` (res = r11). Command:
  `node ".tmp/re-cli.mjs" disasm 0x57740 150` and continue in 150-300 insn chunks to 0x58360.
  (Resource loaders have 0 direct callers; they are reached through the resource manager. Do not search `calls`.)

## 3. How to read the loader [C]

Header check (0x5776C-0x57788):
```
0005776c: e3051444  movw r1, #0x5444
00057774: e3401054  movt r1, #0x54        ; 0x00545444 = "DTT\0"
00057778: e1500001  cmps r0, r1
0005779c: ...                              ; version word compared with 0x0133A06C (movw 0xa06c/movt 0x133)
```
Then a repeating triple, one per optional sub-block:
```
00058170: e58b8098  str r8, [r11, #152]    ; slot = 0 first
00058174: e5db0114  ldrb r0, [r11, #276]   ; presence byte (copied from the header earlier)
00058178: e3500000  cmp r0, #0
0005817c: 1a00000c  bne 0x581b4            ; nonzero = block ABSENT, slot stays 0
00058194: e591301c  ldr r3, [r1, #28]      ; vtable slot 28 = allocate(size)
00058198: e3a01010  mov r1, #16            ; size 16
0005819c: e12fff33  blx r3
000581ac: e58b1098  str r1, [r11, #152]    ; heap block pointer stored in the resource
000581b0: eb1f3bd5  bl 0x82710c            ; copy `size` bytes from the file stream into the block
```
Pattern to recognise: `str 0` / `ldrb flag; cmp #0; bne skip` / `mov r1,#SIZE` / `blx [vtbl+28]` / `str r0,[res,#OFF]` / `mov r2,#SIZE; bl 0x82710c`.
Result (all [C], block pointer offset: size, presence byte):

| res+ | size | flag byte | vaddr of size |
|---|---|---|---|
| 0x98 | 16 | +0x114 | 0x58198 |
| 0x9C, 0xA0, 0xA4, 0xA8, 0xAC, 0xB0, 0xB4 | 12 each | +0x115..+0x11B | 0x581E0, 0x58228, ... |
| 0xB8 | 14 | +0x11C | 0x583C8 |

16 + 6*12 + 12 + 14 = 114 B, which equals the blob grid: poison 12 + 4 pair, sleep, para, ko, exhaust, mount, jump (12 B records), a 12 B region, blast 12 + u16 damage (status-gu.md). So the file bytes are copied unchanged: in memory each 12 B record is `u16 [initial, A, B, durF, increase, max]` at block+0,2,4,6,8,10 [C by size match, B for member-to-status naming: 0x98 poison, 0x9C sleep, 0xA0 para, 0xA4 ko, 0xA8 exhaust, 0xAC mount, 0xB0 jump, 0xB4 jump tail, 0xB8 blast]. An immune status has no bytes in the file and a null pointer in the resource.

## 4. Step 2-4: the route that worked [C]

Do not scan for res+0x98..0xB8 field reads. Follow who RECEIVES the resource pointer.

1. Who fetches dttune: the only external fetch is 0x4bd24 (called via 0x4a858 -> 0x4b554). It maps `[struct+4]` (emid) through 0x50b64 (137 {emid,slot} pairs at 0x1597ea4: 1->0, 0x201->1, 2->3 ... = `monster-slot-map.json` slots), takes row `0x1850ed8[slot]`, ids +128 (sibling res, type 0x496f8f22) and +132 (dttune), fetches both with 0x152960 and hands them to a member-function callback `{[struct+0x94],[struct+0x98]}`.
2. Who sets the callback: ctor 0x7051c builds that struct at this+0x764C (0x70790, call 0x7079c) and stores callback 0x70a1c. 0x70a1c stores sibling res at owner+0x75E8 and dttune at **owner+0x75EC** (0x70a24-0x70a48).
3. Getter: 0x71078 = `ldr r0,[r0,#0x75EC]; add r0,r0,#100; bx lr` (160 direct callers, no vtable ref). Status blocks = `[0x71078()+52..84]` = res+0x98..0xB8. Scan callers of 0x71078 for `ldr [r0,#52..84]`.
4. Consumer triple (block +56 = res+0x9C), runtime fields at X = [this+0x1428]: thr s16 +0x5C96, counter u16 +0x5C98, proc count byte +0x5D6A:
   - reset 0xA2754: counter=0, procs=0, thr=blk[0] (initial).
   - add 0xA27C8(this, amount): counter += amount; proc (return 1, counter=thr) when counter >= thr and flag bytes [[X]+930..932] are 0; else counter capped thr-1.
   - grow 0xA29D0 (after proc): n = min(30, procs+1); thr = min(blk[0] + trunc(k*blk[8]*n), blk[0] + trunc(k*(blk[10]-blk[0]))); counter = 0. k = f32 at +0x1C of row 0xbaaac(this,2).
5. Owner proof (premise check, trap A): ctor 0x7051c sits at slot +328 of 94 vtables (one class family); vtable 0x17f82cc of that family has +516 = rage entry 0x1069d8c; rage 0x1068dd8 calls 0x71078 on its own `this`; EMC code reads em+0x2588 and [this+0x1428] on the same `this`; the dttune is chosen by emid -> slot. So owner = monster (em), X = its sub-block.
6. Callers: add <- 0x9A3A8 (fn 0x9A34C, amount s16 [[this+0x1428]+0x4C8]) <- 0x97ddc <- 0xa5900 <- 0xadb3c <- 0xad7b4 (slot +36 of monster vtable 0x1734798), `this` passed unchanged; add <- 0xBFC70 (amount 200) <- 0xbfca8 (41 callers in per-monster code 0xcf0658..0x1057fe8); grow <- 0x76730; reset <- 0xB9D9C.
7. Arithmetic check, Rathian (slot 0, emid 1), em001_00_dttune, k=1: poison @0x35c 180/100/580 -> 180, 280, 380; para @0x378 180/110/730 -> 180, 290, 400; stun @0x384 150/150/750 -> 150, 300, 450. Matches `MHGU/docs/wiki/monster-status.md`. Note records are not on a 12 B grid (poison has a 4 B tail; sleep starts 0x36c).
8. Open [U]: k comes from the resource at em+0x257C (request id 0xde1a in 0x687b0, typeHash 0x630ed7bb, not extracted); row index = byte [[em+0x1428]+926]; what selects it (quest tier / player count) is not proven. Status naming of each block offset beyond the loader size order is [B].

## 5. Dead ends (kept so you skip them)

### 5a. Field-read scans (all scripts in `.tmp/scratch-t1/`)
1. `ldr rX,[rY,#0x98..0xB8]` over .text (`scan-ldr.mjs`): 1300-2000 hits per offset. Useless: vtable slot calls (`ldr r1,[r0,#176]; blx r1`) use the same immediates.
2. Pair filter (`scan-pair.mjs`): member load followed within 4 insns by `ldrh/ldrsh [rX,#0..10]`: 53 hits, all unrelated.
3. Index form `add rD,rN,#0x98..0xB8` + load + halfword (`scan-add.mjs`): 0 hits. Register-offset halfword form: 14 hits, all unrelated.
Why they failed [C]: the consumer goes through the em getter 0x71078 (res+100) and reads `[r0,#52..84]`, so 0x98..0xB8 never appears as an immediate.
### 5b. Pass 2 scans [C]

| Script | Pattern | Hits | Result |
|---|---|---|---|
| `scan-acc.mjs` | leaf accessor: `ldr r0,[r0,#0x98..0xB8]; bx lr` or `add r0,rN,#..; bx lr` | ~50 | 0x48a9c0 (`ldr r0,[r0,#184]`, callers 0x4a2068, 0x4a210c) is a linked-list pop (next at [x,#4], seen 0xa5a634 / 0xcb5344), not dttune. `add #152` leaves 0x71364 / 0x84cf78 / 0x84dbf4 / 0x84e440 have 0 direct callers. Nothing lies inside the dttune class code 0x56000-0x59000, so rEnemyDtTune has no accessor methods. |
| `scan-ldm.mjs` | member pointer load, then ldm/ldrd/vldr on it within 8 insns | 124 | all in 0xaaf414..0x13e1bf8 UI / list / animation code; no six-u16 walk |
| `scan-cp.mjs` | pointer loaded from `[x,#0x98..0xB8]` stored to `[y,#imm]`, 3+ in a window | ~190 windows | generic struct copies (e.g. 0xc58f2c: words +80..+164) |
| `scan-tri.mjs` | ldrh +6, +8 and +10 on one base within +-30 insns | 71 | copies and compares only: 0x3875a0 (16 halfwords copied to [r4+92]), 0x164cb8 / 0x22c6e8 (record equality), 0x6ad210, 0x6dad30 (strh to +0x1bee..0x1bfc), 0x13ac8a0 (dump) |
| `scan-back.mjs` | nearest `ldr rX,[rB,#0x98..0xB8]` (rB not sp) before `ldrh [rX,#0..10]` | 39 | string pointer 0x13d5f04, list unlink 0xcb5344, counter 0x12dabf4, flags 0x261a98, index 0xb6671c, multiplier 0xa63f3c: all unrelated |
| `scan-add2.mjs` | `add rD,rN,#0x98..0xB8` then `ldr [rD,idx,lsl #2]` | 23 | pointer-array loops in other classes (0xc59444, 0xc59eec, 0xb30cf8, 0x198130); 19 not inspected one by one |

Extra finding [C]: 0x574A0..0x57990 (directly after the magic check) is the copy-OUT path of the same class: `ldrb flag,[r8,#276]; ldr r1,[r8,#152]; mov r2,#16; bl 0x827cd0` writes each block to a stream (0x827cd0 is the write twin of the loader's 0x82710c). So the loader and the write path treat the status blocks as opaque 16/12/14 byte memcpy and name no field.

### 5c. Wrong assumptions
1. "Resource sub-blocks are reached through resource vtable slots +156/+164" (earlier guide): FALSE. The dttune vtable 0x17330A4 ends before +156 (that address is the next class block, nando tag getter 0x58C74). The +156/+164 calls seen at em+0x260C/0x2630.. are other resource classes.
2. "em+0x2638/0x263C hold dttune": FALSE, their table ids 18/19 have typeHash 0x496f8f22. dttune is at em+0x75EC.
3. "Owner has fields > 0x7000, so it is not the em": FALSE, the em is > 0xCC00 bytes (rage fields +0xCAC4/+0xCBF1).
4. Hunter-side chain 0x172BF0 -> 0x9D6F8 (thresholds 200/180/150) is the hunter's own status, not the monster consumer (trap A).
5. Raw-word search for the class name pointer (0x1553200) or 0x48e8ac29 in code: no descriptor holds the name; the hash only occurs in arc manifests.

## 6. Traps and how to detect them early

A. Frenzy-virus gauge (hunter, not monster) [C]. Chain `0x16C938 -> 0x170ADC -> 0x1711DC..0x171204 -> 0x2F595C / 0x2F58B4` looks perfect: a hit adds a number to a u16 gauge, compares, resets, and has a capped counter. It is the hunter's Frenzy gauge. How the premise check caught it: (1) the skill id fed to the helper (`mov r1,#24` before `0x2864C4`) is `skills._id 24 = Antivirus` in `mhgu.db`, a hunter skill; (2) the helper tests a bit in the hunter's armor-skill array (`[[pl+0x13C4]+4+392]`, word `988+4*(id>>5)`); (3) the numbers do not match dttune: potency 25/11/5 (table 0x1629AAC) vs dttune increase 15..300, max up to 3000; counter += 20 cap 200 vs dttune max. Rule: before following a candidate, write down which NUMBERS from the data it must reproduce; if the constants in code never match, it is a different mechanism.
B. Offset-immediate scans on small offsets (0x98..0xB8) drown in vtable calls. Always scan for a PAIR (pointer load, then dependent use) not a single instruction.
C. Stale MCP decoder. Register-offset halfword loads (`ldrsh r0,[r6,r0]!`, `ldrh r0,[r4,r1]`) print as `[rX, #0]` in an old mhgu-re server; `sxth`/`uxtb` families can print as `ldr ... [pc, rX, ror rY]`. If an excerpt shows `#0` offsets right after a `movw rN,#imm`, re-run with the CLI (`re-cli.mjs disasm`). Em-object offsets above 0xFFF (0x28B8, 0x3248, ...) are ALWAYS `movw` + register-offset access, never immediate.
D. Sequential stream loaders (0x57740) have no member table. Do not look for names; read the alloc sizes.
E. `e6ef507a`-style words printed as `strb rX,[pc,rY,ror ...]` are `uxtb`; do not infer stores from them.
F. Wiki claims about neighbouring data may be wrong (rage region: see rage-gu.md); verify against bytes first.

## 7. Checklist for T2 (rage/tired) and T4 (detection)

- [ ] State the data block, its blob offsets for two monsters (cite `monster-slot-map.json` for the id -> monster claim).
- [ ] Find the loader (0x57740 for dttune; for other classes: registration fn from `mon-class-map.md`, then the function whose first instructions compare the resource magic).
- [ ] Extract the runtime layout from the loader: block pointer offset, size, presence byte. Tag [C] with vaddrs.
- [ ] Decide patterns from the layout; run a PAIR scan, not a single-instruction scan.
- [ ] For every candidate: (a) identify the object (monster or hunter?), (b) identify any skill/state id it tests and look it up in `mhgu.db`, (c) check that code constants relate to the data values. If any fails, put it in Ruled out with the reason.
- [ ] Re-check halfword/extend instructions with the CLI.
- [ ] Append to the report after each step; end with `## Difficulties`.
- [ ] If the consumer is not found, say which of the three points (read-in, compare, growth) failed and what was tried.

## 8. State at hand-over

| Point | Status |
|---|---|
| Read-in (file -> res+0x98..0xB8 blocks) | done, 0x57740-0x583E0 [C]; copy-out twin 0x574A0-0x57990 [C] |
| Owner of the dttune pointer | em object, em+0x75EC, callback 0x70a1c, getter 0x71078 [C] |
| Compare (gauge vs threshold) | 0xA27C8 [C] |
| Growth (threshold += k*increase, cap) | 0xA29D0 [C]; reset 0xA2754 [C] |
| Arithmetic check Rathian | k=1 matches wiki [C]; real k value [U] (resource 0x630ed7bb) |
