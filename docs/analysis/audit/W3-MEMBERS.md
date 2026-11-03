# W3-MEMBERS — the five members/code-side open items, recomputed from the image

Ticket: close `W2-MB1`, `W2-MB2`, `W2-MP1`, `W2-MP2`, `W2-MP3` (all `open` in
`docs/analysis/audit/LINK-STATUS.tsv`), plus the two collateral numbers the same claims carry
(member[3]'s 5,440 B offset and the per-member read counts of `member-census.md`).
Session: 2026-11-04. Coordinates: `vaddr`/`flat_off = vaddr + 0x100` in `main.140.flat.bin`
(25,472,632 B, the untracked copy in the repo root; the `.tmp/mhgu/extract/exefs-0eb5` copy is
byte-identical and is the fallback in the tool).

Every number below was produced in this session by one command:

```bash
cd "G:/omp works/MHGU" && node tools/audit/claims-code.mjs
```

The tool (`tools/audit/claims-code.mjs`, new) reads the image with `tools/mhgu/arm32.mjs`, walks
each reader/writer body with a small constant-tracking scanner, **executes** the width function
`0x3df1b8` on a minimal ARM interpreter (DP/movw/movt/b/bx only — anything else throws), enumerates
the image's NUL-delimited strings, and re-reads the five documents. Each claim ends in PASS/FAIL
against the text as it stands; the exit code is 1 if any claim disagrees, so the tool doubles as the
regression check for the edited docs.

## 1. The seven claims and what the image says

| # | item | question | recomputed from the image | doc before | verdict |
|---|---|---|---|---|---|
| 1 | W2-MB1 | member[14] (reader `0x15bd3c`) 98 B or 6,248 B | **6,248 B** = 138 static + 13×470; write twin `0x15bba0` = 138 + 13×470 = 6,248 | `member15.md:156` = 98 (the member[14] section of `member4-17-layout.md`, now line 323, already said 6,248) | **6,248** |
| 2 | W2-MB2 | member[7] bitstream 196 bit or 157 bit | **157 bit** (2+4+3+4×5 = 29, + 4×32 = 128) = 20 B | `member4-17-layout.md:139,164` = 196 bit / 25 B | **157 bit** |
| 3 | — | member[3] 5,440 B block at `obj+259,068` or `obj+254,028` | **254,028** (`0x3E04C`); 254,028+5,440 = 259,468 = start of the 1,632 B block | `member-census.md:48` = 259068 | **254,028** |
| 4 | — | census read counts [7]6 [8]10 [10]"40/7/11B" [12]4 [13]5 [14]11 [17]18 | **17 / 11 / one 40 B tail / 5 / 6 / 12 / 22** (=4+15+3) | the census's own cells | **layout counts** |
| 5 | W2-MP1 | 0x48698 group: records at `0x4869c` or `0x486c8`; is the tsv `fn` a prologue | **`0x486c8`**; tsv `fn` **is** a prologue (37/37 values, 110/110 sites) | banner: records at `0x4869c`, tsv "predates the retile" | **both banner sentences wrong** |
| 6 | W2-MP2 | `mParam.` 134 or 131 | **131** NUL-delimited strings; **134** `mParam.` token hits (3 inside longer strings) | §1 heading: "131 条; 镜像里实际有 134 条, 漏了 …" | **131 strings, 134 tokens** |
| 7 | W2-MP3 | §4 "uEm###_00（225 条）" | **225 rows = 96 unit names + 129 action names**; exact `uEm###_00` = **61** | heading implies 225 unit names | **225 is a row count** |

## 2. Claim 1 — member[14] is 6,248 B (W2-MB1)

Command (inside the tool): `scanRange(0x15bd3c, nextPrologue(0x15bd3c))`, the same for the nested
reader `0x1599d8` and for the write twin `0x15bba0` / `0x159898`.

```
reader   0x15bd3c..0x15c02c static reads 12: 1 1 1 1 1 1 1 1 19 3 68 40(tail)
  nested reader 0x1599d8..0x159b18: 19 reads = 470 B
  0x15bd3c calls 0x1599d8 13x (loop-covered: 0)
  static 138 B (tail read 40) + 13x470 = 6,248 B
writer   0x15bba0..0x15bd3c static writes 12: 1 1 1 1 1 1 1 1 19 3 68 40(tail)
  nested writer 0x159898: 19 writes = 470 B; 0x15bba0 calls it 13x
  writer total 6248 B
```

- The **98** of `member15.md` is exactly `8+19+3+68`: the static reads *minus the 40 B tail read*,
  and with the 13 nested 470 B calls not counted at all. Both read and write sides therefore make
  member[14] 6,248 B; the file chain closes: `0x335A8 + 0x1868 = 0x34E10`, and member[15]
  (`0x539120`, recomputed: 8+152 = 160 B) lands at `0x34EB0`, which is member[16]'s start.
- The writer is the decisive second witness: it writes the identical offset/size sequence
  (`0x28..0x31`, 19 B at `0x32`, 3 B at `0x45`, 68 B at `0x1d18`), calls the nested writer 13× at
  record bases `0x4c + i*0x234`, and ends with a 40 B tail write at `0x1cf0`.
- Doc edit: `docs/analysis/members/member15.md:156` — 98 → **6,248**, with the provenance of the
  old figure recorded in the same row. The member[14] section of `member4-17-layout.md` already said
  6,248 (line 323 after this session's edits, 321 before them) and was left alone.

## 3. Claim 2 — member[7]'s bitstream is 157 bit, not 196 (W2-MB2)

The tool runs `0x3df1b8` itself (`runArm(WIDTH, [0, cap])` — cap in r1, as the reader calls it).
The interpreter's step trace for cap=3 is in the output below; its result must agree with the hand
table before it is trusted, and it does:

```
cap -> width: 3->2 9->4 6->3 10->4 2->2 99->7 2991->12
```

Then it walks `0x2639ac`:

```
width calls 8 -> 0x263a14=cap 3->2bit ... 0x263b10=cap 10->4bit
bit reads 12 -> 2 4 3 4 4 4 4 4 32 32 32 32
sum = 29 + 128 = 157 bit = 19.625 B -> ceil 20 B
bitstream starts at rel 0x0005 -> next byte read at rel 0x19; 84x324 from there ends at 0x6a69
```

- **196 = 3+9+6+10×5 + 128**, i.e. the *caps* summed as if they were widths. The function returns
  the smallest width that holds the cap, so the first eight fields are 2/4/3/4×5 = 29 bit.
- Consequences that are now in the doc: bitstream 25 B → **20 B**; nested records start at rel
  **`0x0019`** (`0x23B9D+0x19 = 0x23BB6`, the measured cat-name offset in `palico-324.md`);
  rows 17..29 shift −5 (`0x6a69 … 0x8937`); member[7] total stays **35,131** (`5+20+27,216+7,776+
  40+16+48+1+5+4`).
- The doc's `size` column for rows 5..16 also carried the cap-as-width error (0.375/1.125/0.75/
  1.25 B). It now reads 0.25/0.5/0.375/0.5×5 B, and the tool checks that the column sums to
  19.625 B.
- Doc edit: `docs/analysis/members/member4-17-layout.md` — the member[7] bullet, the totals bullet,
  rows 5..16 (`bits N` + size + rel), the nested-row `rel`, rows 17..29 `rel`, the row-23 note, and a
  new note under the table explaining the `b<N>` (bit-cursor) notation.
- `member-census.md`'s description of `0x3df1b8` ("按 r1 选 8/24/32bit 宽度+掩码") was the same
  misconception in prose; it now says what the function returns, with the emulated table.

## 4. Claim 3 — member[3]'s 5,440 B block is at obj+254,028

Two `add` immediates build r1 (the tool decodes them and re-does the arithmetic):

```
0x14b198: add r0, r5, #76        (base)
0x14b1a0: add r1, r0, #253952    -> r5 + 76 + 253952 = 254,028
0x14b19c: mov r2, #5440
0x14b1ac: add r0, r5, #396
0x14b1b4: add r1, r0, #259072    -> r5 + 396 + 259072 = 259,468
0x14b1b0: mov r2, #1632
```

`0x4C + 0x3E000 = 0x3E04C = 254,028`, and `254,028 + 5,440 = 259,468` — the exact start of the
1,632 B block, so the two reads are adjacent and the census's `259068` would overlap the second
block by 5,040 B. Doc edit: `docs/analysis/members/member-census.md` row 3 (`r5+259068` →
`r5+254028`, with the adjacency recorded).

## 5. Claim 4 — the census read counts

Counting rule used (and now stated in the census): **call sites** of `0x3df2a8`, `bl` and the
`pop {..,lr}; b 0x3df2a8` tail call alike; loop bodies counted once.

```
[7]  0x2639ac: 17 sites (17 bl + 0 tail), one-pass 443 B, 7 sites in the x24 loop
[8]  0x507d44: 11 sites (10 bl + 1 tail 1B), 149 B
[10] 0x1a4e64:  1 site  ( 0 bl + 1 tail 40B), 40 B   (5-instruction stub, no 7 B / 11 B read)
[12] 0x14c568:  5 sites ( 4 bl + 1 tail 4B), 20 B
[13] 0x163e0c:  6 sites ( 5 bl + 1 tail 1800B), 28,404 B  (the tail is B6)
[14] 0x15bd3c: 12 sites (11 bl + 1 tail 40B), 138 B (+13x470 nested = 6,248)
[17] 0x55d2c0:  4 sites + 0x55d354 15 + 0x1caafc 3 = 22, one-pass 24 B
```

Every census cell that disagreed was the tail call (8/12/13/14), the [7] count was not even the
`bl` count (6 vs 17), [10]'s "7B/11B" do not exist in that reader, and [17]'s 18 lacked the
nested readers. `member4-17-layout.md`'s own summary table already said 17/11/1/5/6/12/4, and the
tool confirms all 14 rows of it against the image. Doc edit: the six census cells, plus the
counting-rule note under the table.

## 6. Claim 5 — the 0x48698 group's records are at 0x486c8 (W2-MP1)

```
0x48698: bx lr                      <- a 4-byte leaf (0x48698..0x4869c)
0x4869c: push {r4, lr} ...          <- 10 instructions (0x4869c..0x486c0), ends bx r2 (a vtable thunk)
0x486c8: push {r4, r5, r6, r7, r8, r9, r10, r11, lr}
```

- The tsv's seven rows (`mMonsterIndex` … `mQuestSizeMax`) sit at `0x48720, 0x48794, 0x4880c,
  0x48880, 0x488f8, 0x4896c, 0x489dc`; `nearestFunctionStart` of each is **`0x486c8`**, and the
  thunk at `0x4869c` contains no member write at all.
- **The tsv `fn` column is a prologue, not stale**: 110 rows, 37 distinct `fn` values, all 37 are
  `push {..,lr}` starts, and all 110 `site`s lie inside the function the tsv names. What is stale is
  the document's "注册函数" column: of its 27 group headers, 17 are *some* function's start and 10
  are not, and only **2** (0x8af8d0, 0xba4be4) are the function that writes the rows. So the
  banner's "25 of 27 write elsewhere" is right, but its explanation ("the tsv predates the retile",
  "this column cannot be treated as a function start", records at `0x4869c`) is wrong in all three
  places.
- Doc edit: the `monster-classes.md` banner rewritten to the measured direction (0x486c8, tsv is
  current, 17/27 headers are prologues but only 2 of them are the writer).

## 7. Claim 6 — 131 `mParam.` strings, 134 token hits (W2-MP2)

```
NUL-delimited printable strings in the image: 434,127
strings starting with mParam.: 131 (distinct 131)
token occurrences of "mParam." anywhere: 134
  0x155a12e inside string 0x155a123 "pEquipData.mParam.mSyncParam.data[i]"
  0x156cf2e inside string 0x156cf22 "festaEquip->mParam.mTalismanParam.skillType[no]"
  0x156cf5e inside string 0x156cf52 "festaEquip->mParam.mTalismanParam.itemId"
```

The three "missing" names are `mParam.` **substrings** of longer strings, not strings of their own,
and `mParam.mSyncParam` (the 131st) is already in the table at `0x155A252`. The table itself is
134 **rows** = 131 distinct names + 3 repeats (`mParam.hang_ok_timer_flag`,
`mParam.sysSendData.q_target_type`, `mParam.sysSendData.em_set_id`). Doc edit: `§1` heading
replaced by a counting note with the three offsets.

## 8. Claim 7 — §4's 225 is a row count (W2-MP3)

All 225 rows' vaddrs point at their own string (0 mismatches). Classification:

```
225 rows = 96 unit-name rows + 129 ems###_00* action rows
96 = 61 exact uEm###_00 + 28 uEms###_00 + 3 uEm###_00::class + 4 uEm087/088 forms
image strings matching ^uEm[0-9]{3}_00$: 61
```

The "50" in the audit's decomposition is the first contiguous block
(`0x15527D4..0x15529BE`); 9 more follow at `0x1552AF5..0x1552B45` and 2 more are `uEm087_00` /
`uEm088_00` at `0x1552B87` / `0x1552BA7`, which is how 61 arises. Doc edit: `§4` heading replaced by
the 96/129 split and the 61 count.

## 9. Tool output (verbatim)

Command: `node tools/audit/claims-code.mjs` — exit code 0.

```text
image G:\omp works\MHGU\main.140.flat.bin (25,472,632 B)

== claim 1 — member[14] size: 98 B or 6,248 B (W2-MB1) ==
reader   0x15bd3c..0x15c02c static reads 12: 0x15bd54=1 0x15bd64=1 0x15bd74=1 0x15bd84=1 0x15bd94=1 0x15bda4=1 0x15bdb4=1 0x15bdc4=1 0x15bdd4=19 0x15bde4=3 0x15be10=68 0x15c024(tail)=40
  nested reader 0x1599d8..0x159b18: 19 reads = 470 B
  0x15bd3c calls 0x1599d8 13x at 0x15be20 0x15be44 0x15be6c 0x15be94 0x15bebc 0x15bee0 0x15bf08 0x15bf30 0x15bf58 0x15bf80 0x15bfa8 0x15bfd0 0x15bff8 (loop-covered: 0)
  static 138 B (tail read 40) + 13x470 = 6,248 B
  the 98 figure = static 138 - tail 40 = 98, i.e. it drops the tail read and all 13 nested calls
writer   0x15bba0..0x15bd3c static writes 12: 0x15bbb8=1 0x15bbc8=1 0x15bbd8=1 0x15bbe8=1 0x15bbf8=1 0x15bc08=1 0x15bc18=1 0x15bc28=1 0x15bc38=19 0x15bc48=3 0x15bc5c=68 0x15bd38(tail)=40
  nested writer 0x159898: 19 writes = 470 B; 0x15bba0 calls it 13x
  writer total 6248 B
  member[15] reads: 0x539138=8 0x53914c(tail)=152
  chain: member[14] starts where member[13]'s B6 ends (0x335A8); 0x335A8 + 6,248 = 0x34e10; member[15] 0x539120 reads 160 B -> 0x34eb0
  member15.md #16 row: "**6,248**"
  PASS member15.md states 6,248 B for reader 0x15bd3c
  PASS reader and writer both consume/produce 6,248 B (138 static + 13x470)
  PASS member4-17-layout.md already states 6,248 B

== claim 2 — member[7] bitstream: 196 bit or 157 bit (W2-MB2) ==
  run 0x3df1b8 with cap=3 -> 2 (52 instructions executed)
    003df1b8: mov r0, #0
    003df1bc: cmps r0, r1, lsr #24
    003df1c0: beq 0x3df1d0
    003df1d0: cmps r0, r1, lsr #16
    003df1d4: beq 0x3df1e8
    003df1e8: mov r2, #8
    003df1ec: cmp r1, #255
    003df1f0: mov r3, #127
    003df1f4: movwhi r2, #0x10
    003df1f8: movwhi r3, #0x7fff
    003df1fc: cmps r3, r1
    003df200: movcc r0, r2
    003df204: bxcc lr
    003df208: mov r3, r3, lsr #1
    003df20c: sub r0, r2, #1
    003df210: cmps r3, r1
    003df214: bxcc lr
    003df218: cmp r2, #1
    003df21c: mov r2, r0
    003df220: bne 0x3df208
    003df208: mov r3, r3, lsr #1
    003df20c: sub r0, r2, #1
    003df210: cmps r3, r1
    003df214: bxcc lr
    ... (28 more, the mask-halving loop repeats until the mask is below the cap)
  cap -> width: 3->2 9->4 6->3 10->4 2->2 99->7 2991->12
  PASS the executed function reproduces the hand table 2/4/3/4/2/7/12 (cap is not the width)
  member[7] 0x2639ac: width calls 8 -> 0x263a14=cap 3->2bit 0x263a38=cap 9->4bit 0x263a5c=cap 6->3bit 0x263a80=cap 10->4bit 0x263aa4=cap 10->4bit 0x263ac8=cap 10->4bit 0x263aec=cap 10->4bit 0x263b10=cap 10->4bit
  bit reads 12 -> 0x263a20=2bit 0x263a44=4bit 0x263a68=3bit 0x263a8c=4bit 0x263ab0=4bit 0x263ad4=4bit 0x263af8=4bit 0x263b1c=4bit 0x263b34=32bit 0x263b4c=32bit 0x263b64=32bit 0x263b7c=32bit
  sum = 29 + 128 = 157 bit = 19.625 B -> ceil 20 B
  bitstream starts at rel 0x0005 -> next byte read at rel 0x19; 84x324 from there ends at 0x6a69
  PASS member[7] bitstream is 157 bit = 20 B
  PASS member4-17-layout.md no longer states 196 bit
  PASS the member[7] section carries 157 bit / 20 B / rel 0x0019 / 35,131
  table rows 5..16: 12 bit fields, size column sums to 19.625 B (expect 19.625)
  PASS the size column of rows 5..16 sums to 157/8 = 19.625 B

== claim 3 — member[3] 5,440 B block: obj+259,068 or obj+254,028 ==
  0x14b198: add r0, r5, #76        (add r0,r5,#76)
  0x14b19c: mov r2, #5440          (mov r2,#5440)
  0x14b1a0: add r1, r0, #253952    (add r1,r0,#253952)
  0x14b1a8: bl 0x3df2a8            (bl 0x3df2a8)
  0x14b1ac: add r0, r5, #396       (add r0,r5,#396)
  0x14b1b0: mov r2, #1632          (mov r2,#1632)
  0x14b1b4: add r1, r0, #259072    (add r1,r0,#259072)
  0x14b1c0: b 0x3df2a8             (b 0x3df2a8)
  obj+254,028 (0x3e04c) 5,440 B -> ends 259,468 (0x3f58c); obj+259,468 (0x3f58c) 1,632 B -> ends 261,100
  PASS the 5,440 B block is obj+254,028 and it ends exactly where the 1,632 B block starts
  PASS member-census.md no longer states r5+259068
  PASS member-census.md states 254,028

== claim 4 — member-census.md read counts (W2-MB1 collateral) ==
  [7] 0x2639ac: 17 call sites (17 bl + 0 tail); one-pass bytes 443; loop-covered 7
  PASS [7] census matches 17 read sites
  [8] 0x507d44: 11 call sites (10 bl + 1 tail 1B); one-pass bytes 149; loop-covered 0
  PASS [8] census matches 11 read sites
  [10] 0x1a4e64: 1 call sites (0 bl + 1 tail 40B); one-pass bytes 40; loop-covered 0
  PASS [10] census states the single 40 B read
  [12] 0x14c568: 5 call sites (4 bl + 1 tail 4B); one-pass bytes 20; loop-covered 0
  PASS [12] census matches 5 read sites
  [13] 0x163e0c: 6 call sites (5 bl + 1 tail 1800B); one-pass bytes 28,404; loop-covered 0
  PASS [13] census matches 6 read sites
  [14] 0x15bd3c: 12 call sites (11 bl + 1 tail 40B); one-pass bytes 138; loop-covered 0
  PASS [14] census matches 12 read sites
  [17] 0x55d2c0: 4 call sites (4 bl + 0 tail) + 15 (0x55d354) + 3 (0x1caafc) = 22; one-pass bytes 24; loop-covered 0
  PASS [17] census states the one-level total 22 = 4 direct + 15 + 3
  PASS layout summary table agrees with the recomputed site counts (14 rows)

== claim 5 — monster-classes.md: 0x48698 group and the tsv fn column (W2-MP1) ==
  0x48698: bx lr  (4-byte leaf: 0x48698..0x4869c)
    0x4869c: push {r4, lr}
    0x486a0: mov r4, r0
    0x486a4: ldr r0, [pc, #24] ; [0x486c4]=0x17f0f10
    0x486a8: ldr r0, [pc, r0]
    0x486ac: bl 0x7aa47c
    0x486b0: ldr r1, [r0, #0]
    0x486b4: ldr r2, [r1, #52]
    0x486b8: mov r1, r4
    0x486bc: pop {r4, lr}
    0x486c0: bx r2
    0x486c4: cmnseq pc, r0, lsl pc
    0x486c8: push {r4, r5, r6, r7, r8, r9, r10, r11, lr}
    0x486cc: sub sp, sp, #36
  PASS 0x48698 is a 4-byte bx lr leaf, not the registrar
  PASS 0x4869c is its own 10-instruction thunk (ends 0x486c0: bx r2) and 0x486c8 is a separate prologue
  tsv 0x486c8 rows: 7 -> mMonsterIndex@0x48720=fn 0x486c8 mTrueSize@0x48794=fn 0x486c8 mSmallScale@0x4880c=fn 0x486c8 mBigScale@0x48880=fn 0x486c8 mKingScale@0x488f8=fn 0x486c8 mQuestSizeMin@0x4896c=fn 0x486c8 mQuestSizeMax@0x489dc=fn 0x486c8
  PASS all 7 records are written inside the function that starts at 0x486c8
  tsv: 110 rows, 37 distinct fn; fn not a prologue: 0; site outside its named fn: 0
  PASS every tsv fn value is a prologue and every site lies inside the fn the tsv names (the tsv is current)
  doc: 27 group headers, 110 rows; header is a prologue: 17/27; header == tsv fn: 2
  PASS 25 of 27 group headers differ from the function that writes their rows (only 0x8af8d0, 0xba4be4 coincide)
  banner: > **2026-11-04 关联审计警示（`LINK-MECHANICS-CODE.md`，2026-11-04 W3-MEMBERS 复算）**：下面"注册函数"这一列**不是写这些成员的那个函数**——27 组里有 **25 组**的成员写入点全部落在**另一个**函数里（`0x48698` 其实是 4 字节 `...
  PASS monster-classes.md names 0x486c8 as where the 7 records are
  PASS monster-classes.md no longer puts the 7 records at 0x4869c
  PASS the banner no longer blames the tsv fn column

== claim 6 — monster-ai-params.md: 131 vs 134 `mParam.` strings (W2-MP2) ==
  NUL-delimited printable strings in the image: 434,127
  strings starting with mParam.: 131 (distinct 131)
  token occurrences of "mParam." anywhere: 134
    0x155a12e inside string 0x155a123 "pEquipData.mParam.mSyncParam.data[i]"
    0x156cf2e inside string 0x156cf22 "festaEquip->mParam.mTalismanParam.skillType[no]"
    0x156cf5e inside string 0x156cf52 "festaEquip->mParam.mTalismanParam.itemId"
  PASS 131 distinct NUL-delimited `mParam.` strings
  PASS 134 `mParam.` token hits = 131 string starts + 3 inside longer strings
  §1 rows 134, distinct names 131; repeated rows: mParam.hang_ok_timer_flag, mParam.sysSendData.q_target_type, mParam.sysSendData.em_set_id
  PASS §1 has 134 rows = 131 distinct names + 3 repeats
  §1 heading: ## 1. 全字段表（按语义分组）  > 计数口径（2026-11-04 W3-MEMBERS 复算）：镜像里有 **131 个**以 `mParam.` 开头的 NUL 分隔字符串（131 个不同名），本表 **134 行 = 131 个不同名 + 3 行重复**（`mParam.hang_ok_timer_flag`、`mParam.sysSendData.q_target_type`、`mParam.sysSendData.em_set_id`）。镜像里 `mParam.` 的**子串命中**是 134 次，多出的 3 次落在更长的字符串内部，**不是**额外字段：`pEquipData.mParam.mSyncParam.data[i]`（0x155A123）、`festaEquip->mParam.mTalismanParam.skillType[no]`（0x156CF22）、`festaEquip->mParam.mTalismanParam.itemId`（0x156CF52）。旧的「镜像里实际有 134 条、漏了 mSyncParam.data[i] 与两条 mTalismanParam」是把 token 数当成了字符串数。命令：`node tools/audit/claims-code.mjs`。 
  PASS the §1 heading states 131 strings and 134 token hits

== claim 7 — monster-ai-params.md §4: 225 rows are not 225 uEm###_00 names (W2-MP3) ==
  §4 rows 225; vaddr/name mismatches 0
  96 unit-name rows + 129 ems###_00* action rows = 225
  unit rows: 61 exact uEm###_00 + 28 uEms###_00 + 3 uEm###_00::class + 4 uEm087/088 form (uEm087_088_ControlUnit, uEm087_088_RubbleBase, uEm087_Rubble, uEm088_Rubble)
  image strings matching ^uEm\d{3}_00$: 61
  PASS all 225 §4 rows point at their string
  PASS 225 rows = 96 unit names + 129 action names
  PASS only 61 rows are exact `uEm###_00` names
  §4 heading: ## 4. 怪物单元名与 `ems###_00*` 行动名（本表 **225 行** = **96 条单元名** + **129 条行动名**）  > 225 是**行数**，不是 `uEm###_00` 的条数：96 条单元名里精确匹配 `uEm###_00` 的只有 **61** 条（另有 28 条 `uEms###_00`、3 条 `uEm###_00::<class>`、4 条 `uEm087/088…`），其余 129 行是 `ems###_00…` 行动名（116 条驼峰 `…Move` + 13 条下划线 `_move`）。镜像里 `^uEm[0-9]{3}_00$` 的字符串也正好 61 个。复算：`node tools/audit/claims-code.mjs`。 
  PASS the §4 heading states the 225 = 96 + 129 split

ALL 7 CLAIMS RECOMPUTED — docs agree with the image
```

## 10. Gate

`node tools/audit/check.mjs` — exit code 0, after all edits:

```text
PASS manifest covers 214 docs, all present
note 23 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): docs/analysis/audit/LINK-DATA-SIDE.md, docs/analysis/audit/LINK-INVENTORY.md, docs/analysis/audit/LINK-MECHANICS-CODE.md
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
note tier A now 25584 functions / 57.7% of instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

(The `note N doc(s) exist but are not in the frozen manifest` line counts documents written by every
concurrent session and moves between runs — this run saw 23, and this report is one of them. It is
informational: no gate turns it into a FAIL.)

## 11. Files changed

| file | change |
|---|---|
| `tools/audit/claims-code.mjs` | **new**, 497 lines: the seven claims, the ARM interpreter for `0x3df1b8`, the read/write scanner, the string enumeration, and one PASS/FAIL per claim. Exit 1 on disagreement. |
| `docs/analysis/members/member15.md:156` | member #16 size 98 → **6,248**, old figure's provenance kept in the 依据 cell |
| `docs/analysis/members/member-census.md` | row 3 `r5+259068` → `r5+254028`; read counts [7] 6→17, [8] 10→11(tail), [10] "40B/7B/11B"→single 40 B tail read, [12] 4→5, [13] 5→6(tail=B6), [14] 11→12(+13×470), [17] 18→22(4+15+3); the `0x3df1b8` descriptor rewritten to "returns the minimum width"; a counting-rule note added under the table |
| `docs/analysis/members/member4-17-layout.md` | member[7]: bitstream 196 bit/25 B → **157 bit/20 B**; rows 5..16 `bits N` and `size` corrected (2/4/3/4×5, 0.25/0.5/0.375/0.5×5); rows 13..16 `rel` → bit cursors `b29/b61/b93/b125`; nested row rel `0x001E`→`0x0019`; rows 17..29 rel −5 (last `0x8937`, member end `0x893B`); totals bullet 25→20; a note under the table defines `b<N>` and closes the sum at 35,131 |
| `docs/mechanics/monster-classes.md` | banner rewritten: records at **0x486c8** (0x4869c is an unrelated 10-instruction thunk), tsv `fn` column is current (37/37 prologues, 110/110 sites), the document's own column is the stale one, 17/27 headers are prologues but only 2 of them write their rows |
| `docs/mechanics/monster-ai-params.md` | §1 heading → counting note (131 strings, 134 token hits, the three inner-string offsets, 3 repeated rows); §4 heading → 225 rows = 96 unit + 129 action names, 61 exact `uEm###_00` |

`git diff --stat` over the five docs: 49 insertions, 41 deletions. No other file was touched; the
tool writes nothing.

## 12. Contradictions seen but deliberately not edited

- `member-census.md:48` still says "`r5+44` **2000×44B** 玩家装备". The reader consumes **36 B** per
  record (`0x14b0d0..0x14b110`: 2+2+2+6+24) and the 44 B is the **object** stride
  (2+2+2+6+24+8; `0xddd48` is a constructor, not a read); `coverage-map.md:118` already has
  2000×36 B. It is the same row I edited for claim 3, but the ticket's claim 3 is only the 5,440 B
  offset and the row mixes obj stride with file length, so the wording is left for whoever owns
  that unit (LINK2-MEMBERS X3 records the same finding).
- `monster-ai-params.md` §4 omits `uEmOstgaloaArm` (`0x1552ADB`, between `uEms048_00` and
  `uEms100_00`). The heading claims no completeness, so this is an omission to record, not a
  contradiction to edit.
- `member15.md` cites `save-load-path.md` "row 16" as the provenance of the 98. That file is not in
  this tree (a recursive search finds no `save-load-path.md`), so the citation stays dangling; only
  the number could be settled.

## 13. VERDICT

Lines for `docs/analysis/audit/LINK-STATUS.tsv` (tab-separated):

```
W2-MB1	fixed	member[14] is 6,248 B, not 98: reader 0x15bd3c reads 138 B static (1x8+19+3+68+40 tail) and calls the 470 B nested reader 0x1599d8 13x, write twin 0x15bba0 mirrors it (138+13x470), and 0x335A8+6,248=0x34E10 closes on member[15] (tools/audit/claims-code.mjs claim 1); the 98 was the static sum minus the 40 B tail with the 13 nested calls unread
W2-MB2	fixed	member[7]'s bitstream is 157 bit = 20 B: the width function 0x3df1b8 was executed on the caps the reader passes (3/9/6/10x5 -> 2/4/3/4x5 = 29 bit, plus 4x32 = 128), the 196 was the cap sum; the byte after the stream is rel 0x19 and the member still closes at 35,131
W2-MP1	fixed	the 0x48698 group's 7 records are written inside the function at 0x486c8 (0x48698 is a 4-byte bx lr, 0x4869c a 10-instruction thunk ending in bx r2 with no member write), and the tsv fn column is current (37/37 distinct values are prologues, 110/110 sites lie inside the fn they name), so the banner's records-at-0x4869c and its tsv-predates-the-retile sentence were both wrong and are now rewritten
W2-MP2	fixed	the image has 131 NUL-delimited mParam. strings (134 mParam. token hits, the 3 extra inside pEquipData.mParam.mSyncParam.data[i] and two festaEquip->mParam.mTalismanParam.* strings) and the table has 134 rows = 131 names + 3 repeats; heading rewritten with the three offsets
W2-MP3	fixed	monster-ai-params §4's 225 is a row count = 96 unit names + 129 ems###_00* action names, and only 61 rows are exact uEm###_00 (50 at 0x15527D4..0x15529BE, 9 at 0x1552AF5..0x1552B45, 2 at 0x1552B87/0x1552BA7); heading now states the split; all 225 vaddrs re-read against the image
```

Supplementary (claims 3 and 4 have no LINK-STATUS row of their own; paste only if a row is opened):

```
CLAIM3	fixed	member[3]'s 5,440 B block is obj+254,028 (0x3E04C), the sum of the two code immediates 0x4C+0x3E000, and 254,028+5,440=259,468 is exactly where the 1,632 B block starts; the census's 259,068 overlapped that block by 5,040 B
CLAIM4	fixed	member-census read counts are 17/11/1(40 B tail)/5/6/12/22 by 0x3df2a8 call sites (bl + pop;b tail), the old cells omitted the tail read ([7]'s 6 was not even its 17 bl sites) and [17]'s 22 is 4 direct + 0x55d354's 15 + 0x1caafc's 3
```

## Difficulties

- **`main.140.flat.bin` location.** `tools/mhgu/arm32.mjs` defaults `FLAT` to
  `G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`; the ticket's image is the copy in the
  repo root. They are byte-identical (25,472,632 B) but the tool still sets `process.env.FLAT`
  before importing, so a run never depends on which copy exists.
- **Width function argument register.** `0x3df1b8` takes the cap in **r1**, not r0. The first version
  of the interpreter passed it in r0, faithfully executed the function on 0 and returned 0 — the
  trace made the mistake obvious, but the hand table (3→2 …) is what caught it. Recorded here
  because "run the function" only means something if the arguments are the ones the reader passes.
- **`String.replace` replacement patterns.** Editing `monster-ai-params.md` with
  `s.replace(a, b)` where `b` contained `$`` (dollar-backtick) spliced the whole document prefix into
  the inserted line: `$`` is the "prefix of the string" pattern. The file was restored with
  `git checkout --` and the edit redone with a function replacement. Anyone editing these docs with
  JS should use `() => b`.
- **Line endings.** The docs are CRLF and my first insertions were LF; three files came out mixed.
  They are normalised to CRLF now (census 2, layout 2, ai-params 4 bare LFs converted), and
  `git diff` shows only the intended hunks.
- **String scan vs `grep`.** The earlier LINK2 worker reported that the repository grep is blind to
  the 24 MB image. In this session the enumeration is done in-process with `fs.readFileSync` and a
  25 MB byte loop (434,127 NUL-delimited printable strings), so no claim here depends on grep
  behaviour.
- **`member15.md` line numbers.** The ticket quotes `member15.md:156` and `member4-17-layout.md:321`;
  both were checked before the edit. `member15.md:156` did not move (the row was rewritten in place);
  the layout's 321 is now 323, because the two-line `b<N>` note inserted above it at the end of the
  member[7] section pushed it down — same sentence, different line.
- **Not attempted.** The write-side counterpart of `0x55d2c0`/`0x539120` was not audited (the ticket
  asks about readers only), and `0x1ac014`'s inner tree (`0x3df2a8` count 263 B for member[16]) was
  left alone: it is one level deeper than any claim here, and `member4-17-layout.md` already closes
  it against the file chain.
