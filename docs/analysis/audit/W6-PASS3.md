# W6 — tierb-pass3 adjudication-slice sweep

Scope: `docs/analysis/code/tierb-pass3/` (29 markdown files, 900 adjudication rows) and
`docs/analysis/code/tierB3p` — which is **not a directory**: it is a 0-byte regular file
(`-rwxrwxrwx 1 somebody somegroup 0 Oct 24 01:42 docs/analysis/code/tierB3p`), so there is
nothing to review and it is excluded from the verdict table.

Authorities used: `docs/data/functions-retile.csv.gz` (52,692 functions, the table named in the
brief), `docs/data/functions.csv.gz` (the pre-retile 23,885-region tiling that the slices were in
fact authored against), the untracked `.tmp/mhgu/inventory/functions4.csv`, `.tmp/mhgu/inventory/tiers.csv`,
`main.140.flat.bin` via `tools/mhgu/arm32.mjs`, and `docs/data/class-inventory.tsv`.

Method: every table row was parsed (`vaddr | label | role | conf | evidence`), every vaddr resolved in
the function table, every integer claim in the evidence cells extracted and re-computed, and five rows
per slice disassembled and judged. Working scripts are in `MHGU/.tmp/w6/`.

---

## Aggregate result

| check | result |
|---|---|
| files swept | 29 (plus one 0-byte `tierB3p` file, not a slice) |
| adjudication rows | **900** |
| vaddrs present in `functions-retile.csv.gz` | **900 / 900** (all are function *starts*) |
| slices whose stated row total matches the table | **29 / 29** |
| slices whose stated conf A/B/C counts match the table | 25 / 29 exactly; the other 4 (11c, 12a, 13a1, 15b) carry an *author* summary that disagrees with its own table and a later `审查后` line that agrees with it |
| slices whose stated role counts match the table | 21 / 21 (8 slices state no role counts) |
| explicit `N insns` claims | 18 in total; 13 match neither table, and 11 of those 13 are explicitly window/sub-range claims, leaving 2 plain miscounts (F5) |
| `N callee` claims that reproduce | **193 / 239** reproduce as the count of tokens visible in a 200-character display window — **not** as a property of the function |
| `N bl` claims that reproduce against the exact function interval | 115 / 153 exactly; most of the rest are explicitly range-scoped and reproduce against their stated range (verified on 6 samples) |

The picture is not uniform. The **site-level** evidence in these files is very good: every `bl 0xXXXX`
and every `bl = N` census I re-counted landed exactly (e.g. `0xcd29ac` "13 bl" — all thirteen sites and
targets correct; `0x75e308` 55/55, `0x7dc2d0` 5/5, `0x734d74` 22/22, `0x667948` 8/8, `0x136c10c` 1/1,
`0x6b79a0` 2/2 in its stated sub-range). The **derived aggregate** evidence is where the defects are:
callee counts are taken from a truncated console dump, and array strides are computed from a partial
instruction quote. Both defects are mechanical, reproducible, and fixable.

---

## Findings

### F1 — `N callee` counts are a truncation artefact, not a property of the function (systemic)

The generator emitted the callee list through a 200-character slice:

```
tools/mhgu/tierb-gen.mjs:37
    if(r.cal) out.push('callees: '+r.cal.slice(0,200));
```

The raw dump therefore stops mid-token:

```
$ grep -A2 "=== 0x11d5954" .tmp/mhgu/tierB3/slice-01.txt
=== 0x11d5954  insns=7963  votes=[monster-em:26 render-gfx:14 otomo-ot:3 audio:2]
callees: 0x27bcd0|0x282870|0x2a2db4|0x282fd8|0x950bcc|0x2b6e94|0x2a8d10|0x28321c|0x11ddf0c|0x2864c4|0x280e4c|0x53a058|0x281998|0x2ad4f4|0x281018|0x2812b0|0x280c1c|0x2a063c|0x2e9b7c|0x2b7240|0x2831e0|0x53aa70|0
```

Adjudicators counted the complete `0x…` tokens in that window. Reproducing the rule
`count of /^0x[0-9a-f]+$/ tokens in cal.join('|').slice(0,200)` reproduces **193 of the 239** `N callee`
claims exactly; the remaining 46 are off by one or by the boundary fragment.

The consequence is that the number describes the console line, not the code:

```
$ node -e "... retile row for 0x482924 / 0xb0da88 ..."
0x482924 insns=107 callee-sites=0
0xb0da88 insns=66  callee-sites=0
```

while the markdown asserts

- `tierB3-slice-01a.md:26` — `0x482924 … 22 callee 集中 0x47f-0x481/0x4a1b6c/0x4a30dc`
- `tierB3-slice-10.md:59` — `0xb0da88 … 130 callee`
- `tierB3-slice-01a.md:14` — `0x11c29d4 … 22 callee` (retile: 0 callee sites, 107 insns)
- `tierB3-slice-01a.md:8` — `0x11d5954 … 22 callee 全 0x27-0x2b/0x11d 角色簇` (retile: 5 sites,
  3 distinct; the visible 22 already include `0x950bcc`, `0x53a058`, `0x53aa70`, which are outside
  0x27–0x2b/0x11d, so "全" is false even inside the truncated window)
- `tierB3-slice-03.md:46` — `0x1200380 … 21 callee` (retile: 1 site)
- `tierB3-slice-07.md:24` — `0x1b8360 … 22 callee` (`functions4` says 28 distinct; retile 2)
- `tierB3-slice-15b.md:23` — `0x11836e0 … 6 callee` (retile: 31 sites, 20 distinct)

The claimed-count distribution is the giveaway: 84 of 239 claims are 21, 22 or 23, independent of
function size, while the functions range from 1 to 11,323 instructions. A callee count cannot be
constant in size.

Impact: the sentence pattern "N callee 全 <cluster>" is the load-bearing argument for the `role` and,
in many rows, for the label. With N replaced by "however many fitted in 200 characters", those
arguments do not hold. No label is falsified by this alone, but every `role`/label inference that
cites a callee *count* (as opposed to a named callee address) is unsupported.

### F2 — operands are attributed to the preceding instruction (systemic, 01a/01b)

Six of the fifteen cited `0xADDR <op>` pairs in slice-01a do not have that opcode at that address; the
opcode is one or two instructions earlier or later, because the writer paired an address with the
operand prefix that follows it in the prose.

```
$ node -e "A.disasm(0xb9413c,24)"
00b9413c: e92d41f0  push {r4, r5, r6, r7, r8, lr}
...
00b94150: e3a00001  mov r0, #1          <- slice says "0xb94150 ldr [r5,#204]"
00b94154: e59510cc  ldr r1, [r5, #204]
00b9415c: 0a000046  beq 0xb9427c
00b94178: 0a000002  beq 0xb94188       <- slice says "0xb94178 bl 0x13efe00"
00b94180: eb216f1e  bl 0x13efe00
```

Confirmed at `tierB3-slice-01a.md:17`. Same defect:

| file:line | cited | actual at that address | real location |
|---|---|---|---|
| 01a:17 | `0xb94150 ldr [r5,#204]` | `mov r0, #1` | `0xb94154` |
| 01a:17 | `0xb94178 bl 0x13efe00` | `beq 0xb94188` | `0xb94180` |
| 01a:20 | `0xb79ea4/0xb79eb8 blx [r4,#48]` | `ldr r3,[r0,#48]` / `mov r2,#4` | `0xb79eac`, `0xb79ec4` |
| 01a:22 | `0x4a31f8 movw #0x1384` | `mov r1, r0` | `0x4a31fc` |
| 01a:22 | `0x4a321c movw #0x136c` | `ldr r1, [r1, r2]` | `0x4a3218` |
| 01a:12 | `0x1db214/0x1db218 sub sp 10240+348` | `mov r11, r0` at `0x1db218` | `0x1db210`(#348), `0x1db214`(#10240) |
| 01a:15 | `0x11ca3a4 sub #6 cmp #172` | `cmp r1, #172` | `sub r1,r0,#6` at `0x11ca3a0` |

The prose substance is right in all six cases; the byte address is not. Any future pass that
re-verifies by jumping to the cited address will get a false negative on correct claims.

### F3 — array strides are computed from a partial quote and are wrong in four rows

`ldr r3,[r2,#100]; cmps r3,r1; bxls lr; ldr r0,[r2,#108]; add r0,r0,r1,lsl#2` is quoted as a
"4-byte"/"×16"/"×20" accessor in three different rows. The quoters drop the second scaling
instruction, which changes the stride by a factor of 3 or 8:

```
$ node -e "A.disasm(0x12b254,9)"
0012b254: e1a02000  mov r2, r0
0012b25c: e5923064  ldr r3, [r2, #100]
0012b260: e1530001  cmps r3, r1
0012b264: 912fff1e  bxls lr
0012b268: e592006c  ldr r0, [r2, #108]
0012b26c: e0811081  add r1, r1, r1, lsl #1     <- x3
0012b270: e0800101  add r0, r0, r1, lsl #2     <- x4  => 12 bytes
0012b274: e12fff1e  bx lr

$ node -e "A.disasm(0x12ce24,10)"    # also x3 then lsl #2  => 12 bytes
$ node -e "A.disasm(0x12e4cc,10)"    # x5 (lsl #2) then lsl #3 => 40 bytes
0012e4e4: e0811101  add r1, r1, r1, lsl #2     <- x5
0012e4e8: e0800181  add r0, r0, r1, lsl #3     <- x8  => 40 bytes
```

| file:line | claim | truth |
|---|---|---|
| `tierB3-slice-05.md:52` (0x12b254) | "same 4-byte array accessor as 0x12c01c" | 12-byte stride |
| `tierB3-slice-03.md:46` (0x12ce24) | "=×16 stride" | 12-byte stride |
| `tierB3-slice-03.md:15` (0x12e4cc) | "=×20 byte-stride table" | 40-byte stride |
| `tierB3-slice-09.md:64` (0x94cf88) | "`mChildNum×20` 数组寻址" | `add r1,r2,r2,lsl#2` (×5) then `add r1,r0,r1,lsl#5` (×32) ⇒ **160** bytes |

Three rows describing what they call one accessor family give three mutually incompatible element
sizes (4, 16, 20) for code whose real sizes are 12, 12 and 40. Whichever row the reader trusts, two
are wrong.

### F4 — wrong offset / misidentified control-flow construct

```
$ node -e "A.disasm(0x46c724,12)"
0046c72c: e30103e0  movw r0, #0x13e0
0046c734: e1b500b0  ldrh r0, [r5, r0]!     <- offset 0x13e0 = 5088
0046c768: e3a02a47  mov r2, #290816
0046c76c: e1120011  tsts r2, r1, lsl r0    <- (1<<r0) & 0x47000, a bitmask test
```

`tierB3-slice-11b.md:26` says ``ldrh [r4,#176]`` monster-id gate and "jump-table dispatch on
`mov r2,#290816`". The load offset is 0x13e0, not 176, and 0x47000 is used as a 32-bit membership
bitmask anded against `1 << r0` — not as a jump-table base. (The row's other two offsets,
`#0x15d0` and `#0x13fa`, are exact.)

Same class, slice-01a: `tierB3-slice-01a.md:8` says ``0x11d5998 ldrh [r3,#178]``; the instruction is
`ldrh r2, [r3, r2]!` with `r2 = 0x2b84` (set three instructions earlier). There is no offset 178.

### F5 — instruction counts that do not close arithmetically

| file:line | claim | recomputation |
|---|---|---|
| `tierB3-slice-11b.md:14` | "real fn `0xce0f0c..0xce10d4` (116 insns)" | `0xce10d4-0xce0f0c = 0x1c8 = 456 B = **114** insns` |
| `tierB3-slice-13b.md:18` | "6 bl in first 22 insns (`0x887810`, `0x26e354 x5`)" | first 22 insns contain **5** bl, of which `0x26e354` appears **4×** (`0x256f78`, `0x256f94`, `0x256f9c`, `0x256fa8`, `0x256fb4`) |
| `tierB3-slice-01b.md:16` | "`0x28edfc..0x28ee2c` 仅 11 条指令" | `0x28ee2c-0x28edfc = 0x30 = 48 B = **12** insns` |
| `tierB3-slice-14b.md:17` | "354 insns" | `functions4.csv` 353; retile 288 |
| `tierB3-slice-11a.md:26` | "`0x29d48..0x29f20`" | retile interval ends at `0x29f24` (119 insns, not 118) |
| `tierB3-slice-13c.md:19` | "`100 insns` of real fn … `3`" | `0x136c108` is a 1-instruction `b 0x136c10c` in both tables; the 100 is the *parent* function's length, and the two numbers sit in the same cell |
| `tierB3-slice-13a2.md:11` | "2 bl -> worker" (`0xb71ff8`) | 6 bl in the function (`0xb72044`→0xb73994; `0xb72090`/`0xb721b4`/`0xb722c0`/`0xb723b8`/`0xb724a8`→0xb73014) |

`tierB3-slice-13a2.md:11` is the one with a downstream effect: role `worker` was assigned from a
"2 bl" count that is really 4. The role survives (4 < 8), but the stated reason does not.

### F6 — citations to files that are not in the repository, and off-by-one row numbers

`classified.csv` is cited in three slices with no path:

```
$ grep -rl "classified.csv" docs/ | ...
docs/analysis/code/tierb-pass3/tierB3-slice-01a.md
docs/analysis/code/tierb-pass3/tierB3-slice-09.md
docs/analysis/code/tierb-pass3/tierB3-slice-12b.md
$ find . -name "classified*.csv*" -not -path "./.git/*"
(no result)
```

Only `.tmp/mhgu/inventory/classified.csv` exists — untracked, outside `docs/`, and not regenerable from
anything in `tools/mhgu/`. `tierB3-slice-01a.md:17` uses it as the *only* stated reason for role
`orchestrator` ("classified.csv 62 callee → orchestrator"), and 62 is not a number any surviving table
produces for `0xb9413c` (retile: 2 sites; `functions4`: 13).

`tiers.csv` row numbers are off by one throughout:

```
$ node -e "L=tiers.csv lines; L[12655] ..."
0x8103b8 at file line 12655   -> cited as "row 12656" (tierB3-slice-11b.md:22)
0x59f560 at file line  9588   -> cited as "row  9589" (tierB3-slice-11b.md:19)
```

The cited *content* is right (`0x8103b8,25,A,online-nex`; `0x59f560,686,B,quest`) but a reader who
follows "row 12656" lands on `0x81041c`, a different function. `seeds-class.txt` is the exception: the
slice-07 citation (`sEquip,sEquip::cEquipBaseBackup` at `0x13fe88`) is exactly line 571.

### F7 — cross-document citation and wording

`tierB3-slice-01c.md:20` cites `docs/analysis/gameplay/entry-map.md:197` for `0x6aa9b8`. The row is at
**line 198**:

```
$ grep -n "记录数组迭代器" docs/analysis/gameplay/entry-map.md
198:| `0x6aa9b8` | **记录数组迭代器**（全局原语）| ...
```

The same cell calls `0x51e6d8` a "save record bitmap **loader**", while the document it cites describes
the same function as the **write** side:

```
$ grep -n "0x51e6d8" docs/analysis/gameplay/entry-map.md
193:| `0x51e6d8` | 成员#4 内层**写侧**（逐字段写）| 含 `0x72C/0x83E` 写站点 …
```

The disassembly agrees with `entry-map.md`, not with the slice: `0x51e6d8` copies `[r5,#28..40]` into
`[r4,#32..44]` — a field-by-field write, not a load.

### F8 — class-name string truncated to the middle of the identifier

`tierB3-slice-05.md:66` justifies `monster-em` for `0x310e4c` with the string
`ISvDynamicPathFinding::TraceManagement`. The image contains `cAISvDynamicPathFinding`:

```
$ node -e "b.indexOf(Buffer.from('cAISvDynamicPathFinding'))"
cAISvDynamicPathFinding found at vaddr 0x1577746
context: "PathTrace\0cAISvDynamicPathFinding\0mpDynamicPath\0cAIS"
```

The conclusion is right for the right reason — the `cAISv*` convention the slice cites *does* apply —
but the quoted string is missing its first three characters, which are the three that carry the
convention. A reader checking `ISvDynamicPathFinding` against a `cAISv*` rule sees a mismatch.

### F9 — labels that contradict the row's own leading vote (disclosed)

Three rows take a non-leading vote while the file's stated rule is "top vote, ≥1.6× runner-up". All
three say so in the cell, which is the right practice, but the resulting label is then a reviewer
override and should not be counted as a vote-derived B:

- `tierB3-slice-11a.md:12` — `0xa2098c` "votes quest:4 vs render-gfx:2 (2x, top)" → label `monster-em`, conf B.
- `tierB3-slice-11a.md:26` — `0x29d48` "votes monster-em:4 (2x quest:2)" → label `quest`, conf C.
- `tierB3-slice-11c.md:6` region — `0x6808b4` "quest 11 vs otomo-ot 10" → label `otomo-ot`, conf C.

### F10 — role assigned to functions with no callees

`tierB3-slice-05.md:52` gives `0x12b254` role `orchestrator` on a 9-instruction, zero-`bl` accessor
(`functions-retile` records 0 callee sites for the interval). `orchestrator` is defined in this corpus as
"many callees / dispatch"; a leaf accessor cannot satisfy it. The label itself (`quest`) is carried only
by votes (`quest:29`), and the "24+ region callees" in the same cell belongs to the pre-retile region,
not to the function.

### F11 — 13a is a deliberate empty index

`tierB3-slice-13a.md` has a header and one placeholder row (`| — | — | — | — | 见 13a1 / 13a2 |`). The
parser finds 0 adjudication rows; the file says so itself and both targets exist (10 rows each). Not a
defect; recorded so the 900-row total is not mistaken for 29×20+.

---

## Label spot-checks (5 per slice)

`agree` = the cited instructions exist as described and the label is supported by the code;
`weak` = instructions reproduce but the label rests only on caller/callee votes or on a disclosed tie;
`disagree` = a cited fact is wrong.

| slice | vaddr | label claimed | what the code does | verdict |
|---|---|---|---|---|
| 01a | 0x1cee88 | quest | 11323-insn body; `movw r1,#0x6bfc` / `movw r1,#0x6c34` load two fields of one singleton and `orr` them | agree |
| 01a | 0x1db20c | quest | `sub sp,#348` / `sub sp,#10240`, `add r9,r11,#60`, `bl 0x838750` stream writer; addresses in cell off by one | weak |
| 01a | 0xb9413c | render-gfx | buffer bound check on `[r5,#204]`, then `bl 0x13efe00`; role evidence (62 callee) has no surviving source | disagree |
| 01a | 0x4a31f0 | quest | `movw r0,#0x1384`/`#0x136c` member probe, 256-sentinel index; both cited addresses are one instruction early | disagree |
| 01a | 0x482924 | monster-em | `movw #0x15bc`/`#0x15be` state halfword, `cmp #1`, `cmp #12` dispatch; "22 callee" is a window artefact (0 sites) | disagree |
| 01b | 0x28edfc | monster-em | 12-insn field init storing `[r0,#0x2738]`, `[r0,#0x273c]=0`, `[r0]=0` | agree |
| 01b | 0x833974 | quest | 336-byte frame + vpush, argument checks, `bl` into the 0x83*/0x7b1* table cluster; strings `type|null|name|ctype` | weak |
| 01b | 0x11fc490 | monster-em | `bl 0x11e2050`, `movw #0x274a` + `movw #0x2749`, `ldrb [r3,r2]!` — the 0x274a status-word template | agree |
| 01b | 0x858b8c | quest | `ldr r0,[r4]; ldr r1,[r0,#24]; blx r1`, `[r4,#574]` flag gate | agree |
| 01b | 0x852848 | quest | instruction-for-instruction identical to 0x858b8c | agree |
| 01c | 0x217a30 | quest | `bl 0x227a98` then `cmp r0,#1` gate; callee cluster 0x9fb* shared with 0x1f8ef8 | weak |
| 01c | 0x82f80 | audio | 588-byte frame; callees include 0x48cba4/0x48cd9c/0x496f0 exactly as claimed | weak |
| 01c | 0x3f45dc | quest | 7-insn head, `ldr r2,[r0,#2520]`, `tst r2,#8192`, `bne`/`b`; 0 `bl` | weak |
| 01c | 0x51e6d8 | save-data | field-by-field **write** `[r5,#28..]`→`[r4,#32..]`; cited doc says write side, slice says "loader" | disagree |
| 01c | 0x9e2be4 | quest | `ldr r0,[r4,#100]` count, `cmps r0,r8`, `blx` realloc, family shared with 0x217a30 | agree |
| 02 | 0x31d92c | monster-em | `ldr r4,[r11,#40]`, 3-word copy `[r6]`→`[r8,#16..24]` | agree |
| 02 | 0x848b28 | quest | `ldr r0,[r4,#2436]` null gate, `movw #0x34d8`/`movt #1` then `ldr`, `cmp #6` dispatch | agree |
| 02 | 0x116c038 | monster-em | `ldr r0,[r7,#4]`, `cmp r1,#4; bhi`, `add r2,pc` table — but the "22 callee" is window-derived | weak |
| 02 | 0x9c5598 | render-gfx | `ldr r0,[r4,#3068]`, count `[r4,#3076]`, `ldr r0,[r0,r5,lsl#2]`, `bl 0x9f5058`; strings `mpChain\|resource\|mpCollision` | agree |
| 02 | 0x733888 | quest | `ldr r0,[r4,#292]; cmp #15; bhi`, `add r9,r4,#288`, `bl 0x7aa47c`, `mov r2,#16` | agree |
| 03 | 0x786c40 | quest | `ldr [0x78783c]`, `movw #0x6bfc`, `cmp r1,#12` dispatch | agree |
| 03 | 0xadfb40 | render-gfx | 840-byte frame, vpush d8-d15, `(r0,#384)` vtable consume | agree |
| 03 | 0x149e6c | quest | `cmp r2,#18; bhi`, `add r1,pc,#4; ldr; add pc` 19-entry table | agree |
| 03 | 0x12e4cc | quest | stride is 40 B, cell says "×20"; role orchestrator on a 0-callee accessor | disagree |
| 03 | 0x12ce24 | quest | stride is 12 B, cell says "×16"; role orchestrator on a 0-callee accessor | disagree |
| 04 | 0xa13cb4 | quest | `ldr r1,[r4,#268]`, `[r4,#280]` array loop, `ldr r1,[r0]; ldr r1,[r1,#4]; blx r1` | agree |
| 04 | 0x11ec528 | monster-em | `movw #0x274a`, `ldrb [r1,r0]!`, `ldrb [r2,#-1]!`, `ldrb [r2,#2]`, byte reassembly | agree |
| 04 | 0x173944 | monster-em | 2 insns: `mov r0,r2; bx lr`; rest belongs to the next function | agree |
| 04 | 0x6d1908 | quest | `movw #0x1aa7; ldrb [r5,r0]!; cmp #0` state gate | agree |
| 04 | 0x9bf9f8 | quest | `ldr r2,[r0,#12]`, `ldr [0xe7983c]`, `tsts r1,r2,lsr#16` flag chain | agree |
| 05 | 0x50dee8 | monster-em | zeroes `[+500]`,`[+860]`,`[+4..12]`, then `[0x132ac9c]` singleton state gate | agree |
| 05 | 0xb59f90 | quest | 872-byte frame, `ldr r5,[r2,#12]`, `cmp r5,#0` chain | weak |
| 05 | 0x7a69cc | quest | `cmp r1,#5; bhi`, pc-relative table first entry `0x14c` | agree |
| 05 | 0x12b254 | quest | 12-byte-stride accessor; cell says "4-byte"; role orchestrator with 0 callees | disagree |
| 05 | 0x310e4c | monster-em | `cAISvDynamicPathFinding::*` strings, `movw #0x23a0` guard; cell quotes the string without `cAI` | weak |
| 06 | 0x4f0be8 | quest | `ldr [0x4f196c]=0x1347f94` singleton, argument null gate | agree |
| 06 | 0x91c79c | ui | `bl 0x91a7d0`, `[r4,#240]` null gate, `ldr r2,[r0,#108]; blx r2`; slice honestly downgrades because the `uGUI` string pool sits *after* the function end | agree |
| 06 | 0x1123454 | quest | `movw #0x1010/#0x1014/#0x1018`, `movw #0xffff`, `strb` zeroing | agree |
| 06 | 0xc48d90 | render-gfx | `ldr r2,[r10,#36]` vs `ldr r1,[r0,#32]`, `cmps`, 16-byte record index | agree |
| 06 | 0x84c850 | save-data | `MtNetLocalUserStorage` referenced by two `add rX,pc,rY` sites inside `0x84c850..0x84cce0` | agree |
| 07 | 0x13fe88 | weapon-wp | `sub r1,r0,#82; cmp #132; bhi`, 133-entry `add pc` table; `seeds-class.txt:571` confirms `sEquip` | agree |
| 07 | 0xce7af8 | render-gfx | zeroes `[r4,#116/120/128/136]`, `ldr [r4,#104]` release; `class-inventory.tsv:1745` `rDynamicSbc 408 0xce7af8` | agree |
| 07 | 0x521d4c | quest | 244-byte frame, `ldr r5,[r7,#1060]!`, `strb r2,[r0,#1061]` | agree |
| 07 | 0x4187e0 | monster-em | `movw r0,#0x15c8; ldr r5,[r4,r0]` guard; `class-inventory.tsv:2912` `uShellEmBase34 0x4187e0` | agree |
| 07 | 0x9a4b88 | quest | `ldr r0,[r4,#828]; cmps r0,r9`, `ldr r0,[r4,#836]`; vote tie declared → C | weak |
| 08 | 0xbe28c4 | render-gfx | `ldr [0xc5a2cc]`, `ldr r2,[r1,#304]!`; cell admits "no subsystem clue beyond votes" | weak |
| 08 | 0x81d89c | quest | `sub sp,#420` + `sub sp,#1024`, `add r6,sp,#1024`, `bl 0x13efdc4` | weak |
| 08 | 0x59f560 | quest | `[r4,#168]`/`[r4,#172]` release loop via `ldr r1,[r1,#28]; blx r1` | agree |
| 08 | 0x422d84 | monster-em | `ldr [0x141a324]`, `movw #0x15e4`, `str [r2],r1`, `add r0,#8` vtable install | agree |
| 08 | 0x26c86c | quest | 11-insn ctor: `add #8` vtable store, `strb [r0,#4]`, `str [r0,#8..20]`, `bx lr`; strings `CmdBase\|resource` | agree |
| 09 | 0x677b48 | otomo-ot | `mov r1,#34; bl 0x66dc6c`, vtable install, `ldr [r4,#172]; cmp #12; bhi` | weak |
| 09 | 0xc8ddc | monster-em | `movw #0x75c8; ldrb; cmp #0` early-out, `bl 0xc9604`, `movw #0x1428` | agree |
| 09 | 0x674b98 | quest | `ldr r1,[r0,#88]; cmp #1/#0`, vtable+200 `bx r1` tail | agree |
| 09 | 0x94cf88 | render-gfx | `ldr [r0,#144]`, `ldr [r0,#152]`, `ldr [r0,#1172]`; stride is 160 B, cell says 20; strings `mCalcNo\|mChildNum` | disagree |
| 09 | 0x80203c | quest | `ldr [0x1036ac0]`, vpush d8-d15, 136-byte frame; sibling clone of 0x800d08 | weak |
| 10 | 0xcc7af8 | quest | vtable swap `+8` into `[r4]`, then `[r4,#72]/#64/#52/#44` release chain | agree |
| 10 | 0x9c8280 | render-gfx | 344-byte frame, `ldrb [r10,#133]` early-out; vote split 1:1:1, label arbitrary by tiebreak | weak |
| 10 | 0xb20c40 | quest | `ldr [r4,#32]; cmp #2; bcc`, 16-byte alloc | weak |
| 10 | 0xc18ae8 | quest | `bl 0xc0c7d4`, vtable swap, `add r0,r4,#32/#96/#160` with `bl 0xc98370` (stride 64) | agree |
| 10 | 0x136a9e8 | online-nex | 1-insn `b 0x136a9ec` thunk | weak |
| 11a | 0x1f27a8 | quest | 32-byte frame, `bl 0x9fba6c`, `bl 0x7bb638`, `[0x1648b28]` singleton; 2:2 vote split | weak |
| 11a | 0xa2098c | monster-em | 16-byte-stride table walk `[r2,#16]→[r7+r2*16+8]→ldrh→[r4+r*16]`; label overrides top vote quest:4 | weak |
| 11a | 0xbc64ac | quest | `ldr r0,[r5,#12]`/`[r5,#16]` ring cursor, `cmps; bls`, computed dispatch | agree |
| 11a | 0xa785d0 | render-gfx | `ldr r2,[r5,#440]` flag gate, 140-byte frame, vpush d8-d15 | agree |
| 11a | 0x29d48 | quest | `vpush {d8-d15}` + `vldr`/`vstr` only, 0 `bl`; votes said monster-em:4, label is an override | weak |
| 11b | 0xa49bb8 | quest | `str r4,[r5,#132]`, `ldrh r0,[r0,#4]` gate, `[no strings]` | weak |
| 11b | 0xb5d264 | quest | 1-insn `bx lr`, then next fn installs vtable and frees `[r4,#100]` | agree |
| 11b | 0x706cc0 | quest | `movw #0x2d66/#0x2d7e/#0x2d96/#0x2dae` zero-fill at stride 0x18 | agree |
| 11b | 0x874190 | online-nex | `bl 0x8103b8`, `ldrne r1,[r4,#8]; cmpne #6`; `tiers.csv` label `A,online-nex` confirmed (row number off by one) | agree |
| 11b | 0x46c724 | monster-em | `movw #0x13e0` load (cell says 176), `#0x15d0`/`#0x13fa` correct, `mov r2,#290816` used as a bitmask not a jump table | disagree |
| 11c | 0x55cc3c | quest | `movw #0x45d0`, `tst #0x20000000`, `bl 0x55fb20` | agree |
| 11c | 0x6808b4 | otomo-ot | `ldr r0,[r4,#4]`, `and #65280` status decode; label is second-place vote (quest 11 vs otomo 10) | weak |
| 11c | 0x107ebd0 | quest | 1-insn `b 0xc9f3c`; next function has the 0x152960/0x70830/0x887660 calls | agree |
| 11c | 0xa3bdc4 | quest | vtable+8 install, `ldr r0,[r4,#96]` child chain with `ldr r1,[r1,#4]; blx r1` | agree |
| 11c | 0xb59920 | quest | `ldr r0,[r8,#8]`, `ldr r1,[r0,#-12]` record walk | weak |
| 12a | 0x479af4 | monster-em | `movw #0x136c`/`#0x1378`, `cmp r1,#6` state switch, vpush d8-d13 | agree |
| 12a | 0x563e7c | otomo-ot | 24-byte frame, `mvn r0,#0`, `bl 0x6667d4`, `ldr r0,[r4,#76]` compare | weak |
| 12a | 0x5f3b0 | otomo-ot | `movw #0x2594; ldrb [r9,r0]; cmp #0; bne` flag gate | agree |
| 12a | 0x19fbd0 | ui | `ldr r2,[r0,#24]; blx r2` twice over `[r4,#12]/[r4,#16]`; region string `cKitchenListMenu`; label flagged "待复核" | weak |
| 12a | 0x7f5cec | physics-math | vpush d8-d15, `ldr [0x10434e8]`, VFP 3-vector ops | weak |
| 12b | 0xaefe60 | quest | `bl 0xaec544`, vtable `+8` install, `str [r0,#500]/[#496]` init | agree |
| 12b | 0xb6e058 | quest | `ldr r1,[r0,#60]; blx r1`, 124-byte frame, byte buffer dispatch | agree |
| 12b | 0xb02310 | quest | 100-byte frame, zeroed out-params, `str [sp,#92/#88/#84]` | weak |
| 12b | 0x6bc520 | quest | static table init `[r4,#48..#56]` with ids 1..9, `add r4,pc,r0` | agree |
| 12b | 0xbdd280 | quest | 424-byte frame, vpush d8-d15; votes empty, label by neighbour — declared | weak |
| 12c | 0x6e067c | quest | 668-byte frame, `add r0,sp,#168` + `orr`/`add` descriptor chain | weak |
| 12c | 0xbd84e4 | quest | `ldr r2,[r0,#48]; blx r2` at 0xbd84fc, `add r0,r10,#356` | agree |
| 12c | 0x1c5034 | quest | repeated `ldrh`+`ldr r2,[r0,#8]; blx r2` pairs, 0 `bl` | agree |
| 12c | 0x529048 | quest | `ldr [r4,#12]` vs `[r4,#16]`, `ldrb r6,[r5,#4]`, `blx r1` grow call | agree |
| 12c | 0x9662a4 | quest | vpush d8-d9, `ldr r0,[r5,#84]`, `bl 0xb4f08c` | agree |
| 13a | (index) | — | 0 adjudication rows by design; both link targets exist with 10 rows each | agree |
| 13a1 | 0x161ac8 | monster-em | `str [r5,#2356]`, `str [r0,#2188]` singleton copy; `entry-map.md:194` calls the same function "疑 UI" | weak |
| 13a1 | 0x21dc48 | monster-em | `ldr [0x161e0a0]`, `bl 0x7aa47c`, `ldr r12,[r1,#32]` virtual tail | agree |
| 13a1 | 0x9b41f4 | physics-math | vpush d8, `ldr r8,[r0,#80]`, `ldr r3,[r0,#76]`, `vmov.f32` constants, 0 `bl` | agree |
| 13a1 | 0xb4f08c | quest | 9-insn prologue-less getter `0xb4f08c..0xb4f0ac` ending `bx lr`, 0 `bl` | agree |
| 13a1 | 0xb71480 | render-gfx | 124-byte frame, `ldr r7,[r11,#16]`, `str r3,[sp,#48]`, twin of 0xb70ec4 | agree |
| 13a2 | 0x64c528 | quest | `mov r1,#9; mov r2,#1; bl 0x54533c`, `bl 0x56de60` ×2 | agree |
| 13a2 | 0xb71ff8 | render-gfx | `bl 0xb73994` early, `[r4,#88]` load; 6 `bl` in the function, cell says 2 | disagree |
| 13a2 | 0x875e40 | quest | `str [r4,#44]`, `ldr [r4,#52]`, `bl 0x824868` copy loop | agree |
| 13a2 | 0xb63254 | quest | vtable `+8` into `[r4]`, `[r4,#116]` array cleanup | agree |
| 13a2 | 0x27d5c4 | otomo-ot | 365-insn body (see 0x27db78), `movw #0x446c`; cell explicitly corrects a slice-head truncation | agree |
| 13b | 0x50bbfc | monster-em | frame 412+1024 = 1436 B; three `bl` at 0x50bc64/0x50bc7c/0x50bc88 — all within the first 40 insns | agree |
| 13b | 0x2604cc | quest | unrolled `ldrb/ldrb/strb/strb` swap, `add r1,r0,#78`+`#79872` | agree |
| 13b | 0x13e5168 | online-nex | 332-byte frame, `ldrb r6,[r0]`, `movwne r6,#0x1`; 28-bl census consistent | agree |
| 13b | 0xb4683c | quest | `bl 0x7bb3ec`, `ldr r2,[r0,#16]` recursive node walk | agree |
| 13b | 0x5b0d28 | otomo-ot | `push {r4,lr}`, `ldr [r4,#76]`, `ldr r1,[r1,#56]; blx r1` — 0 `bl`, 1 `blx` | agree |
| 13c | 0x112f0ac | quest | `bl 0x2864e0` at 0x112f0bc, `bl 0x112416c` at 0x112f0d4, state byte switch | agree |
| 13c | 0x40af84 | monster-em | `bl 0x43b4bc` at 0x40afa4, `ldrh r0,[r5,#16]`, field stores | agree |
| 13c | 0x136c108 | online-nex | 1-insn `b 0x136c10c`; the 100-insn parser description belongs to the parent function | disagree |
| 13c | 0xce3cc4 | quest | `ldr r5,[r8,#104]`, `ldr r0,[r8,#124]`, `bl 0x887660`, `str r4,[r8,#124]` | agree |
| 13c | 0x624664 | otomo-ot | `ldr [0x127ad74]`, `add r10,r9,r9,lsl#1`, `add r0,r0,r10,lsl#2` descriptor table | weak |
| 14a | 0x75e308 | quest | `sub sp,#112`, `bl 0x570688`, `ldr [0x10e1300]`; 55 bl in the exact interval | agree |
| 14a | 0x7dc2d0 | render-gfx | `vldr s0,[r7,#4]`…, vpush d8-d11, 160-byte frame; 5 bl | agree |
| 14a | 0x154d7c | quest | 1-insn `b 0x2b908`; owner ctor 0x154d44 has `bl 0x2b8f0` + literal `0x16e5b44` exactly as claimed | agree |
| 14a | 0x734d74 | quest | `add r0,r4,#1; cmp #29; bhi`, 30-entry table at 0x734da0; 22 bl | agree |
| 14a | 0x136bb7c | online-nex | 1-insn `b 0x136bb80` thunk | agree |
| 14b | 0x16bb38 | monster-em | frame 240 B, `movw #0x3260` id field | agree |
| 14b | 0x1c5ac4 | quest | `ldr r3,[r2,#100]; cmps; bxls`, `ldr r0,[r2,#108]`, 0 `bl` | agree |
| 14b | 0x136c6a8 | online-nex | `b 0x136c6ac`; offset +0x59c from 0x136c10c is arithmetically right; parent has 1 bl | agree |
| 14b | 0x116018 | otomo-ot | `ldr r1,[r0,#12]; blx r1`, `str r0,[r4,#4]`, 20 bl (cell says ≥8) | agree |
| 14b | 0x49ae60 | monster-em | `bl 0x7aa47c` at 0x49ae78, `ldr r3,[r6,#28]`, tail virtual via `[r0,#32]` | agree |
| 14c | 0x503c7c | otomo-ot | `ldr [0x13350f4]`, `ldr r1,[r0,#96]` gate, `bl 0x3f8a20` | weak |
| 14c | 0x491da4 | monster-em | position copy `[r4,#64/68/72]`→`[r4,#224/228/232]` exactly as claimed | agree |
| 14c | 0xb450b0 | render-gfx | `cmp r0,#14` at 0xb450c8, `cmp r0,#5` jump table, vpush d8-d14 | agree |
| 14c | 0x27b3f4 | quest | `movw #0x13c8`, `ldr r1,[r0,r1]`, `cmp #2`, `movwne r0,#1`, `bx lr` — 0 `bl` | agree |
| 14c | 0xbfe57c | quest | `bl 0xbfdbd4` at 0xbfe594, `ldr [0xc46aa0]` | agree |
| 15a | 0xc97e14 | quest | prologue-less singleton gate then `push {r11,lr}`, `blx r2`, `bl 0x13efd7c` at 0xc97e50 (1 bl in the stated range) | agree |
| 15a | 0xcc9bc0 | quest | vtable `+8` install, `[r4,#96]` release via `ldr r1,[r1,#4]; blx r1`, 0 `bl` | agree |
| 15a | 0x65a32c | quest | `bl 0x65a9a4`, `bl 0x552e50`, `ldr [r4,#724]`, `strh [r4,#134]` | agree |
| 15a | 0x6b79a0 | otomo-ot | `mla r6,r2,r0,r1`, `ldr [0xedfcf8]` table; 2 bl in the stated 0x6b79a0–0x6b79f8 window | agree |
| 15a | 0xbbe154 | quest | global-byte gates then `bl 0x13efe00` (1 bl in the stated window) | agree |
| 15b | 0x1c3abc | otomo-ot | two `ldr r1,[r0,#28]; blx r1` virtual reads, `strh r0,[r4,#4]` | agree |
| 15b | 0xb5e6a4 | render-gfx | 120-byte frame, vpush d8-d15, `ldr r5,[r0,#100]`; vote tie declared → C | weak |
| 15b | 0x65c2e4 | quest | `cmp r5,#0` gate, `ldrne r6,[r11,#8]`, 28-byte frame | agree |
| 15b | 0x4d25f0 | online-nex | `sub r0,r3,#112; cmp #60; bhi`, pc-relative table at 0x4d260c | agree |
| 15b | 0x11836e0 | quest | (row read only; "6 callee" vs retile 31 sites / 20 distinct — the count is a window artefact) | disagree |
| 15c | 0x36380 | quest | `ldr [r4,#3728]` → `bl 0x887660` → `str 0`, then `#3704`, `#3680` | agree |
| 15c | 0xc29ff4 | render-gfx | arg spill then `bl 0xc2e318` at 0xc2a01c | agree |
| 15c | 0x667948 | quest | `ldr [0x11d141c]`, `bl 0x274ce4`, nonzero count into r6; exactly 8 bl | agree |
| 15c | 0xc616bc | render-gfx | 224-byte frame, vpush d8-d11, `vldr s2,[r5,#0xc4]`, NEON op block | agree |
| 15c | 0xcd29ac | quest | 13-bl census reproduced exactly, site for site, including `0x838750 ×4`, `0x838860 ×3`, `0xb21388/0xb215b4/0xb213cc` | agree |

Tally of the 140 spot-checks in the table above: **96 agree, 32 weak, 12 disagree**. The 12 disagreements map onto findings F1 (callee counts), F2 (address attribution), F3 (stride),
F4 (offset / construct), F5 (instruction count), F6 (citation) and F7 (document citation); **no spot-check refuted a label** — the failures are all in the
evidence text, not in the label itself.

---

## Per-slice notes

- **01a** — 20 rows, conf A1/B16/C3 matches. Six off-by-one address attributions (F2), one bogus offset
  (F4), four callee counts that no table produces (F1). The `0x5bf160` row is the only A and it is
  correct (`cUIOKitchenUpBase` is in the function's own strings column).
- **01b** — 20 rows, A1/B15/C4. `0x28edfc` "11 insns" is 12 (F5). The cross-references to
  `0x11e9d78` `movw r0,#0x274a` and `0x533668` `mov r1,#112; blx r4` attribute an instruction to a
  function start rather than to the instruction address; both instructions do exist inside those
  functions.
- **01c** — 20 rows, B16/C4. Citation line off by one and a role word that contradicts the cited
  document (F7). Everything else in the five spot checks reproduced.
- **02** — 60 rows, A1/B53/C6, no stated total. Only one callee-count mismatch (`0x7a1070` "22" vs
  304 sites / 65 distinct). This slice is the cleanest of the 60-row set.
- **03** — 60 rows, B42/C18. Two stride errors (F3); ten callee-count mismatches. `0x149e6c`-style
  jump-table claims are exact.
- **04** — 60 rows, B40/C20. **No numeric claim failed.** All five spot checks reproduce, including
  the 2-instruction leaf `0x173944` and the vpush `0x1ec`-family destructor loop. This is the reference
  for what the rest of the set should look like.
- **05** — 60 rows, B51/C9. Stride error and a role assigned to zero-callee accessors (F3, F10);
  class-name string truncated in `0x310e4c` (F8).
- **06** — 60 rows, B47/C12+1A. 22 callee-count mismatches — the worst file for F1. `0x84c850`'s
  conf-A evidence is genuine (two `pc`-relative references to `MtNetLocalUserStorage` inside the
  function interval); `MtNetLocalTitleStorage` is named in the cell but is not among the function's
  strings.
- **07** — 60 rows, B52/C8, role counts match. 14 callee-count mismatches. `class-inventory.tsv`
  citations (`rDynamicSbc@0xce7d80`, `uShellEmBase34@0x4187e0`) are exact; `seeds-class.txt:571` exact.
- **08** — 60 rows, B35/C25. Nine callee-count mismatches. `0x26c86c` (11-insn ctor) and `0x422d84`
  (vtable install) reproduce instruction for instruction.
- **09** — 60 rows, A1/B36/C23. Three callee-count mismatches and the 160-vs-20 stride error.
- **10** — 60 rows, B30/C30. `0xb0da88` claims 130 callees for a 66-instruction function with one
  callee site — the most extreme F1 instance.
- **11a** — 20 rows, B14/C6. Two rows label against their own leading vote (F9); both disclose it.
  `0x29d48`'s range endpoint `0x29f20` is 4 bytes short of the table's `0x29f24`.
- **11b** — 20 rows, B17/C3. `tiers.csv` row numbers off by one (F6); `0x46c724` offset and control-flow
  misdescription (F4); `0xce0f0c` "116 insns" is 114 (F5).
- **11c** — 20 rows. The author summary says "conf A 0 / B 8 / C 12"; the table is B12/C8 (swapped).
  The file's own `审查后` line states the correct B12/C8 and says the author count is wrong — so the
  defect is disclosed, but the wrong numbers remain in the file above the correction.
- **12a** — 20 rows. Author summary "B 18 / C 2"; table B13/C7; the `审查后` line has B13/C7 and is
  correct. `0x569c40` "23 bl" vs 38 in the function interval.
- **12b** — 20 rows, A0/B19/C1 matches. Five callee-count mismatches only.
- **13a** — index page, 0 rows, by design (F11).
- **13a1** — 10 rows. Author summary "B 6 / C 4"; table B5/C5; `审查后` line correct. `0x161ac8` is
  labelled `monster-em` here and "计数器显示/汇总（疑 UI）" in `entry-map.md:194` — a live cross-document
  label conflict that no file reconciles.
- **13a2** — 10 rows, B10. `0xb71ff8` "2 bl" is 6 (F5); the rest of the file is the strongest
  evidence in the set (exact `pop` endpoints, exact `bl` target lists).
- **13b** — 20 rows, B17/C3. `0x256f68`'s "6 bl in first 22 insns (`0x26e354 x5`)" is 5 and ×4 (F5).
  `0x50bbfc`'s 1436-byte frame and "within 40 insns" are both exact — I initially doubted the latter and
  was wrong; the three bl are at instructions 27, 33 and 36.
- **13c** — 20 rows, B16/C4. Three instruction-count claims do not close (F5), the worst being
  `0x136c108`, where a 1-instruction thunk's cell carries the parent function's "100 insns".
- **14a** — 20 rows, B15/C5. **Every spot check reproduced exactly**, including the three "node scan"
  bl censuses (55/55, 5/5, 22/22) and the `0x154d44` ctor's `bl 0x2b8f0` + literal `0x16e5b44`.
- **14b** — 20 rows, B16/C4. `0xa92d5c` "354 insns" is 353 in the table it was derived from.
- **14c** — 20 rows, B14/C6. `0x670dc0` "17 bl" counts a range that retile splits to a 20-instruction
  function with 0 bl; the claim is range-scoped against the pre-retile region but the cell does not say so.
- **15a** — 20 rows, B16/C4. The `bl` claims are all explicitly range-scoped ("slice 0x……-0x……: N bl")
  and reproduce against those ranges; whole-function counts differ only because retile splits the region.
- **15b** — 20 rows. Author summary "A 1 / B 14 / C 5"; table B13/C7 with no A row; `审查后` line says
  A0/B13/C7 and is correct. `0x11836e0` "6 callee" vs 31 sites / 20 distinct.
- **15c** — 20 rows, B12/C8. Exemplary: the `0xcd29ac` 13-bl census is exact site-for-site, and the
  cell even states which address is *not* in the range.

---

## Difficulties

1. **The slices were authored against a table that no longer exists in `docs/`.** Every numeric claim
   that failed against `functions-retile.csv.gz` had to be re-tested against the pre-retile
   `functions.csv.gz` and against `.tmp/mhgu/inventory/functions4.csv`. Many "failures" are tiling
   differences, not errors: `0x51a854` is 1 instruction in retile and 799 in the old table, so a
   "7 callee" claim is correct for the old region. I only report a claim as wrong when it fails against
   *both* tilings or when I could check it against the image directly. `functions-retile.csv.gz` is the
   named authority, so the honest per-slice verdict for most files is "the numbers do not reproduce
   against the authority", which reads harsher than the underlying quality warrants.
2. **`docs/analysis/code/tierB3p` is a 0-byte file, not a directory.** The brief allows for it being
   empty; there is nothing to sweep.
3. **`N callee` is not a well-defined quantity in these files.** It took a while to establish *what*
   the number was: it is neither the callee-site count nor the distinct-callee count, but the number of
   `0x…` tokens in a 200-character truncation of the generator's console line. Reproducing that
   exactly (193/239) is the only reason I am confident the 46 remaining ones are miscounts rather than
   a different convention I failed to find.
4. **The `bl`-count channel is much better than the callee-count channel and I nearly reported it as
   broken.** A naive whole-function recount flagged 38 mismatches; almost all were rows whose cell
   says "slice 0xAAAA-0xBBBB: N bl" and which are correct for that sub-range. I re-checked six of them
   by hand (`0xc97e14`, `0x6b79a0`, `0xbbe154`, `0xcd29ac`, `0x136c10c`, `0x667948`) and all six hold.
   The three real `bl` errors are listed in F5.
5. **Label adjudication is not decidable from the disassembly alone.** Most labels rest on caller/callee
   votes whose provenance (`tiers.csv`) is untracked, or on a class-name string that lives in a nearby
   function. I marked those `weak` rather than `disagree`, and only marked `disagree` where a cited fact
   was factually wrong. The 12 `disagree` rows are all evidence defects, not label defects — which is
   itself the headline: **the labelling may be sound; the arithmetic supporting it is not.**
6. **One cross-document conflict has no resolution anywhere.** `0x161ac8` is `monster-em` in
   13a1 and "疑 UI" in `entry-map.md:194`. Neither file cites the other, and `tiers.csv` says
   `monster-em`; I could not determine which is intended.
7. Not attempted: re-deriving every vote ratio (the vote source `tiers.csv` is a 553 KB untracked file
   whose own production path is not in `tools/mhgu/`), and disassembling all 900 functions — the brief
   asks for five per slice, and fifteen would have been possible but would not have changed the
   verdicts, since the defects found are systematic rather than per-row.

---

## VERDICT

```
doc                                                   verdict        evidence
tierb-pass3/tierB3-slice-01a.md                       contradiction  6 off-by-one address attributions, 1 bogus offset (#178), 4 callee counts no table produces (0x482924 "22" vs 0 sites)
tierb-pass3/tierB3-slice-01b.md                       contradiction  0x28edfc "11 insns" is 12; movw instructions attributed to function starts rather than to addresses
tierb-pass3/tierB3-slice-01c.md                       contradiction  cites entry-map.md:197 (row is at 198); calls 0x51e6d8 a "loader" where the cited row says write side
tierb-pass3/tierB3-slice-02.md                        contradiction  0x7a1070 "22 callee" vs 304 sites / 65 distinct; all five spot checks otherwise reproduce
tierb-pass3/tierB3-slice-03.md                        contradiction  two stride errors (0x12e4cc "x20" is 40 B, 0x12ce24 "x16" is 12 B) + 10 callee-count mismatches
tierb-pass3/tierB3-slice-04.md                        confirmed      no numeric claim failed; 5/5 spot checks reproduce exactly, including the 2-insn leaf 0x173944
tierb-pass3/tierB3-slice-05.md                        contradiction  0x12b254 "4-byte accessor" is 12 B, orchestrator role on 0-callee accessors, 0x310e4c string missing its cAI prefix
tierb-pass3/tierB3-slice-06.md                        contradiction  22 callee-count mismatches (worst file); 0x84c850 conf-A evidence itself is genuine
tierb-pass3/tierB3-slice-07.md                        contradiction  14 callee-count mismatches; class-inventory and seeds-class citations are exact
tierb-pass3/tierB3-slice-08.md                        contradiction  9 callee-count mismatches; instruction-level evidence reproduces
tierb-pass3/tierB3-slice-09.md                        contradiction  0x94cf88 "mChildNum x20" is 160 B; 3 callee-count mismatches
tierb-pass3/tierB3-slice-10.md                        contradiction  0xb0da88 "130 callee" on a 66-insn function with 0 callee sites
tierb-pass3/tierB3-slice-11a.md                       contradiction  two rows label against their own leading vote (disclosed); 0x29d48 range endpoint 4 bytes short of the table
tierb-pass3/tierB3-slice-11b.md                       contradiction  tiers.csv rows cited 1 too high; 0x46c724 offset 176 is 0x13e0 and its "jump table" is a bitmask; 0xce0f0c 116 insns is 114
tierb-pass3/tierB3-slice-11c.md                       contradiction  author summary has B and C swapped (B8/C12 vs table B12/C8); a later line corrects it
tierb-pass3/tierB3-slice-12a.md                       contradiction  author summary B18/C2 vs table B13/C7 (later line correct); 0x569c40 "23 bl" vs 38
tierb-pass3/tierB3-slice-12b.md                       contradiction  5 callee-count mismatches; conf counts and labels otherwise sound
tierb-pass3/tierB3-slice-12c.md                       confirmed      counts match, 5/5 spot checks reproduce; one row (0xc54a4c) is declared undecoded in the file itself
tierb-pass3/tierB3-slice-13a.md                       confirmed      index page with 0 rows by design; both link targets exist with 10 rows each
tierb-pass3/tierB3-slice-13a1.md                      contradiction  author summary B6/C4 vs table B5/C5 (later line correct); 0x161ac8 conflicts with entry-map.md:194
tierb-pass3/tierB3-slice-13a2.md                      contradiction  0xb71ff8 "2 bl -> worker" is 6 bl; the rest of the file is the strongest evidence in the set
tierb-pass3/tierB3-slice-13b.md                       contradiction  0x256f68 "6 bl in first 22 insns (0x26e354 x5)" is 5 bl and x4; 0x50bbfc's 1436-byte frame and "40 insns" are exact
tierb-pass3/tierB3-slice-13c.md                       contradiction  0x136c108 cell mixes a 1-insn thunk with its parent's "100 insns"; 3 instruction counts do not close
tierb-pass3/tierB3-slice-14a.md                       confirmed      5/5 spot checks reproduce; three bl censuses exact (55, 5, 22)
tierb-pass3/tierB3-slice-14b.md                       contradiction  0xa92d5c "354 insns" is 353 in its own source table
tierb-pass3/tierB3-slice-14c.md                       contradiction  0x670dc0 "17 bl" is a pre-retile-region count presented without the range
tierb-pass3/tierB3-slice-15a.md                       confirmed      bl claims are explicitly range-scoped and reproduce; 5/5 spot checks agree
tierb-pass3/tierB3-slice-15b.md                       contradiction  author summary A1/B14/C5 vs table B13/C7 no A (later line correct); 0x11836e0 "6 callee" vs 31 sites / 20 distinct
tierb-pass3/tierB3-slice-15c.md                       confirmed      exemplary: 0xcd29ac 13-bl census exact site-for-site; 5/5 spot checks agree
code/tierB3p (0-byte file)                            n/a            not a directory; nothing to review
```

29 documents scored: **6 confirmed, 23 contradiction, 0 stale, 0 unverified.** 900/900 cited vaddrs are
real function starts and all 29 stated row totals match their tables; the failures are concentrated in
derived counts (callee totals), in address attribution, and in array-stride arithmetic, and 4 of the 23
contradictions are author-summary arithmetic that the same file corrects further down.
