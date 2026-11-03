# analysis-code (second half) — audit findings

Scope: `docs/analysis/audit/slices/analysis-code.txt` files 26–49 (24 docs, 720 table rows):
`tierb-pass3/tierB3-slice-04 … 10` (60 rows each), `11a/11b/11c` (20), `12a/12b/12c` (20), `13a` (0 rows),
`13a1/13a2` (10 each), `13b/13c` (20), `14a/14b/14c` (20), `15a/15b/15c` (20).
First half (files 1–25) is not audited here.

## Method / artifacts

* Table rows parsed from every doc (`| 0x… | label | role | conf | evidence |`); counts, label and
  role distributions recomputed from the rows themselves and compared with each doc's Summary and its
  appended `审查后（…）` line.
* Every row vaddr was looked up in `docs/analysis/code/inventory/tiers.csv` (23 885 rows) and in
  `docs/data/functions.csv.gz` (start,end,insns,callers,callees,strings).
* Instruction-level claims were recomputed from the image: `main.140.flat.bin` at the repo root
  (the `.tmp/mhgu/extract/exefs-0eb5/` path cited by half-1 does not exist in this checkout), ARM32 LE,
  file offset = vaddr + 0x100; every quoted word/instruction was cross-checked against
  `mcp__mhgu_re_disasm` on the same address, and they agree.
  Opcode tests: `bl` = `(w>>25)&7==5 && (w>>24)&1==1 && cond!=0xF`, `bx/blx reg` = mask 0x0FFFFFF0
  == 0x012FFF10, `pop {…,pc}` = LDM with bit 15, `add rD,pc,rM` = DP register-form opcode 4 with
  Rn=15. PC-relative string refs: `ldr rX,[pc,#imm]` literal then `add rD,pc,rX`, target = site+8+lit.
  Spot checks additionally used the MCP tools `mcp__mhgu_re_disasm` / `function_start`
  (max 400 insns per call); quoted outputs are from those calls.
* Nothing in the audited docs was edited. Only this file and `analysis-code-half2.tsv` were written.

Key commands used (abbreviated; the counting logic is described above so it can be re-run):

```
grep -n "^0x59f560," docs/analysis/code/inventory/tiers.csv        # 9589:0x59f560,686,B,quest
mcp__mhgu_re_disasm {"vaddr":"0x49f38c","count":10}                # push … bl 0x7aa47c … bx r2
mcp__mhgu_re_disasm {"vaddr":"0x13e51b0","count":4}                # ldr r0,[pc,#1308]=0x188e9e ; add r1,pc,r0
```

## Verdict counts

Doc level (24 docs, worst item decides):

| verdict | n | docs |
|---|---|---|
| OK | 11 | 06, 07, 09, 11a, 11c, 12a, 12c, 13a1, 14b, 15a, 15b |
| WRONG | 11 | 04, 05, 08, 10, 11b, 12b, 13a2, 13b, 14a, 14c, 15c |
| MISSING | 1 | 13a |
| UNVERIFIABLE (sub-item only) | 1 | 13c (vote ratios; its disassembly claims are OK) |

Item level (`analysis-code-half2.tsv`, 45 rows): **OK 28 / WRONG 13 / MISSING 1 / UNVERIFIABLE 3**.

What holds up, measured:
* 720/720 row vaddrs exist in `tiers.csv` (no invented addresses, no duplicates).
* 20/20 cited "tiers.csv row N" references (11b/12b) are exact 1-based line numbers
  (`row 9589 = 0x59f560,686,B,quest`; `11202 = 0x6dc3c0`; `14307 = 0x9fba6c`).
* 100 leaf rows: 96 pass the 0-`bl` test against the image; 4 fail (3 in slice-10, 1 in slice-14c).
* 51 "extent + N bl" claims recomputed; 1 real arithmetic error (15c `0xcd29ac` 12 vs 13), the rest
  reproduce (several after widening a truncated window, see note below).
* 14a's 7 "node scan" bl counts are all exact (55/41/22/32/14/5/5).
* 3 tier-A rows in this half: 2 verified true (06 `0x84c850`, 09 `0x2c0e50`), 1 refuted (13b `0x13e5168`).

## Top findings

### 1. slice-10 — four role/`bl` errors (3 "leaf" rows with one `bl`, 1 "worker" row with none)

Rows `0x49f38c`, `0x13b41a0`, `0x13b5c7c` say "no bl"/"0 bl" and role `leaf`. Each of the three is the
same 10–14-insn forwarder that slice-04 classifies as worker with "头含 1 bl":

```
$ mcp__mhgu_re_disasm 0x49f38c ×10
0049f38c: e92d4010  push {r4, lr}
0049f394: e59f0018  ldr r0, [pc, #24] ; [0x49f3b4]=0x139e8ac
0049f39c: eb0c2c36  bl 0x7aa47c        <-- 1 bl, inside the extent the row itself gives (ends 0x49f3b0)
0049f3ac: e8bd4010  pop {r4, lr}
0049f3b0: e12fff12  bx r2

$ mcp__mhgu_re_disasm 0x13b41a0 ×14
013b41b8: ebcfd8af  bl 0x7aa47c        <-- inside 0x13b41a0..0x13b41d4
013b41d4: e12fff1c  bx r12

$ mcp__mhgu_re_disasm 0x13b5c7c ×14
013b5c94: ebcfd1f8  bl 0x7aa47c        <-- inside 0x13b5c7c..0x13b5cb0
```

The docs' own role rule (used in 15a and 14a: "leaf 0, worker 1–7, orchestrator >=8") makes these
`worker`. The row text is self-contradictory: it lists `bl 0x7aa47c` and then says "no bl".

The opposite error is in the same slice: row `0xb0da88` is role `worker` but its function
`[0xb0da88,0xb0e130)` (426 insns) contains **0 bl** and `functions.csv` lists no callees at all
(`0xb0da88,0xb0e130,426,47,,""`); by the same rule it must be `leaf`. The row itself admits
"no bl visible in head".

### 2. slice-13b — the only tier-A upgrade rests on a mis-decoded string and a 3× wrong call count

Row `0x13e5168` (conf A, "A accepted by review") claims
"string load inside real fn at 0x13e51b0 (add r1, pc, #0x188e9e -> machine/login/password/HOME)"
and "9 bl to 0x13c/d7xx net cluster".

```
$ mcp__mhgu_re_disasm 0x13e51a0 ×14
013e51b0: e59f051c  ldr r0, [pc, #1308] ; [0x13e56d4]=0x188e9e
013e51b4: e08f1000  add r1, pc, r0            # pc=0x13e51bc -> target 0x156e05a
013e51bc: ebffca8f  bl 0x13d7c00

string at 0x156e05a: "r.g.p1.p2.x0.y0.x1.y1.x2.y2.x3.y3.x4.y4.x5.y5.x6.y6.x7.y7.year.month..."
```

`0x156e05a` is the generic data-key table (the same table holds `app:`, `savedata:`, `dirx`), not the
pia login strings; `machine`/`password` live at `0x159427e` / `0x1569ed8`. And the whole function
`[0x13e5168,0x13e5718)` (single return `pop {…}` at 0x13e56c0) contains **28 bl**, every target in the
0x13c7xx–0x13ddxx net cluster — the row says 9.
The label (online-nex) is in fact well supported by those 28 net calls, but the A grade rests on the
mis-decoded string and the call count is wrong by 3×.

### 3. slice-14a — Summary arithmetic contradicts its own table, although its measurements are exact

* "conf: A=2 (0x1b5580, 0x1c26bc)" — the table has both at **B**, label **quest**; the post-review line
  ("conf A 0 / B 15 / C 5") is the correct one.
* "pass2 prior art (tiers.csv): 18/20 rows agree" — recomputed doc-vs-`tiers.csv` label diff:
  `0x308b3c` (render-gfx/otomo-ot), `0x65ce7c` (quest/otomo-ot), `0xbea870` (quest/online-nex)
  → **17/20**.
* The override list is wrong: `0x1b5580` and `0x1c26bc` are not overrides (tiers.csv already says
  `quest`, the table says `quest`), and `0x65ce7c` is missing from the list.

Everything this doc measured from the image is exact, e.g.:

```
fn region [0x6bb21c,0x6bb7ac) bl=55   (claim 55)
fn region [0xb67cf0,0xb68280) bl=41   (claim 41)
fn region [0x734d74,0x735300) bl=22   (claim 22)
fn region [0x11fb798,0x11fbd24) bl=32 (claim 32)
```

### 4. slice-13a — empty document (`MISSING`)

`tierB3-slice-13a.md` is 7 lines: header, an empty `| vaddr | label | role | conf | evidence |` table,
and one `## In progress` bullet. 0 rows. The 20 regions it was opened for are delivered in
`13a1.md` (10 rows) and `13a2.md` (10 rows). The file must not be counted as a covered slice until its
content is either written or the file is marked as split.

### 5. slice-05 / slice-08 — Summary label distributions are wrong

```
slice-05 table counter: quest 33, monster-em 16, otomo-ot 6, render-gfx 3, ui 1, online-nex 1  (=60)
slice-05 Summary    : quest 26, monster-em 18, otomo-ot 6, render-gfx 3, ui 1, online-nex 1, other 5
                      -> two counts wrong and the "other 5" bucket does not exist in the table

slice-08 table counter: quest 29, render-gfx 12, monster-em 11, online-nex 3, otomo-ot 2, audio 2, save-data 1
slice-08 Summary    : quest 28, render-gfx 12, monster-em 12, ... -> quest/monster-em each off by one
```

Both docs' conf counts do match their tables (05: A0/B51/C9; 08: A0/B35/C25).

### 6. slice-15c — `0xcd29ac`: 12 vs 13 bl, and a callee that is outside the extent

```
bl scan [0xcd29ac,0xcd2b94]: 13
  cd29c4->838750  cd29d4->838750  cd2a04->838860  cd2a18->838750  cd2a34->13efe30
  cd2a50->cd23a0  cd2a9c->b21388  cd2ac0->b215b4  cd2adc->b213cc  cd2b60->8389e0
  cd2b70->838860  cd2b80->838860  cd2b88->838750
```
The row says "12 bl"; the cited `bl 0xb26c04` does not occur in the extent (first occurrence
0xcd2c78, in the next function). Role `orchestrator` still holds (13 >= 8).
(The same doc's `0xc616bc` row is correct: 4 bl, 3 of them `0x13efddc` at 0xc61834/0xc618d4/0xc6199c.)

### 7. slice-13a2 — `0x27d5c4` row contradicts its own review note

Row text: "real fn continues … with no further bl; 2 bl (0x65f9b4/0x65fa04) are region-wide, not
confirmed inside real fn", while the review prefix says "函数尾部 4 个 bl". The image agrees with the
prefix:

```
bl scan [0x27d5c4,0x27dafc]: 27da64->65f9b4, 27da7c->65fa04, 27dab0->65f9b4, 27dad4->65fa04
```

Role `worker` (1–7 bl) is right; the in-row evidence sentence is wrong.
The row's boundary claim elsewhere in the doc is exact: `0x64c528` ends `0x64c5f8`
(`e8bd8830 pop {r4,r5,r11,pc}`) and the next fn starts `0x64c600` (`e92d4830 push`).

### 8. slice-14c — `0x670dc0` role and `0x27b3f4` evidence

`0x670dc0` is marked `leaf` with "(审查 …：0 bl)", but it is a jump-table dispatcher inside a larger
function whose code carries calls:

```
$ mcp__mhgu_re_disasm 0x670dc0 ×8
00670dc0: e3510007  cmp r1, #7
00670dc4: 83a00000  movhi r0, #0
00670dc8: 812fff1e  bxhi lr
00670dcc: e1a01101  mov r1, r1, lsl #2
00670dd0: e28f2004  add r2, pc, #4
00670dd4: e7911002  ldr r1, [r1, r2]
00670dd8: e081f002  add pc, r1, r2
```
The surrounding block 0x670d88–0x670dac contains `bl 0x607148` and `bl 0x65d464`; the function the row
attributes it to (`0x670c88`) has 3 bl. "0 bl" only holds for the 8-instruction block.
Related: row `0x27b3f4` says "fn@0x27b3d8 … 0 bls", but 0x27b3d8 is
`push {r11,lr}; ldr; ldr; ldr; bl 0x153078 @0x27b3e8; pop {r11,pc}` (1 bl). The marker 0x27b3f4 itself
is a separate 0-bl getter (`movw r1,#0x13c8; cmp r1,#2; bx lr`), so role/leaf survives; the evidence
sentence does not.

### 9. Minor evidence errors (single-row)

* slice-11b: "0x500e9c/0x515944 B-quest rows 8175/8395" — line 8175 is `0x500e9c,22,B,monster-em`.
* slice-12b: `0xb5dc9c` "2 bl (0x29d48/0x1ebe8)" — both bls go to `0x29d48`, no `0x1ebe8`.
* slice-04: Summary says "0x17a884 … 取 online-nex A" while that row is conf **C** (the in-fn pia
  string claim is true: literal `0x16be0a0` = `N2nn3pia9transport20SequenceIdControllerE` is loaded at
  0x17aa94).
* slice-12c: `0x2709e0` accessor is 9 insns, the row says "14 条指令".

### 10. Cross-artifact notes (not doc verdicts)

* The coverage meter is `node tools/mhgu/coverage/report.mjs` (it writes
  `docs/analysis/code/inventory/coverage-report.tsv`). Its denominator is stable
  (`denominator: 23885 functions, 5228277 instructions`) but its tier-A reading moved while this
  audit ran (9188 fn / 53.1% at first read → `tier A (verified) 11113 3246117 62.1%` now), and it is
  not the tier-A set of the committed `tiers.csv` (which recomputes to A 8856 fn / 2 690 231 insns /
  51.5%, B 14863 / 2 533 932 / 48.5%, C 166 / 4 114 / 0.1%); `tiers-recomputed.csv` (untracked) reads
  A 9116. No doc in this half quotes a global percentage, so no verdict here depends on it — but the
  meter's A set is a merge, not `tiers.csv`-A, and must be reconciled before anyone cites 62.1%.
* The `slice-0N.txt` input files do not exist in the repo, so the "60 rows match the `^=== ` headers;
  diff verified" claims cannot be checked (UNVERIFIABLE). Row counts themselves are internally
  consistent (60/60/20/10).
* No vote/classified table exists (`find . -name "*vote*" -o -name "classified*.csv"` → nothing;
  `docs/data/tierb-labels.csv` holds only 378 pass-2 seed rows), so every "votes X:N vs Y:M" ratio in
  these docs is UNVERIFIABLE; only the disassembly parts could be recomputed.

## Evidence that reproduced exactly (do not re-audit these)

* **slice-06 A row `0x84c850`** — 13 bl in 0x84c850..0x84cce0 and in-function string refs:
  `@0x84c8c8/0x84c970 -> 0x1595d08 "MtNetLocalTitleStorage\"`,
  `@0x84c9c0/0x84ca64 -> 0x1595d20 "MtNetLocalUserStorage\"`.
* **slice-09 A row `0x2c0e50`** — exactly 46 bl in 0x2c0e50..0x2c165c; the only name literal is
  `@0x2c14b0 = 0x1577860` = `0x1577852+14` inside `cAISvDynamicPathFinding::TraceManagement`.
  `0x8ae1a8..0x8ae250` = 4 bl (matches "约 4 个调用点").
* **slice-04** — `0x13bc308 = b 0x690`; `0x40bba8 = b 0x43b488`; `0x173944 = mov r0,r2; bx lr`;
  `0x3efb30` cmp #188 + `add r2,pc,#12` at 0x3efb70 (189-word table at 0x3efb84) + `movw #0x8899`;
  `0x5dfd18` `mov r0,#255; strb [r4,#820]; cmp #14`; `0xb53e80` refs `are.xml`/`rAIPathBase` at
  0xb54880–0xb54964; `0xbc8a00` refs `arc.xml`/build-archive keys.
* **slice-05 / 07** — `0x172ac4` (fn 0x172ac4..0x172b10, 0 bl) and `0x5a3b0` (0x5a3b0..0x5a3dc,
  bx lr, 0 bl); `0x13e4534` 781 insns, 0 bl; seed strings exist (`sEquip` 0x1555ddd,
  `uPlWeaponPreview` 0x155e0d3); 07's label/role/C-list counters match the table exactly.
* **slice-11a/11b/11c** — `0x5d7cd4 = mov r1,#36; mov r2,#5; b 0x56e538`; `0x915320 = bx lr`;
  `0x29d48 = vpush {d8-d15}…`; `0x6dbd38` 418-insn function ending at 0x6dc3c0; `0x504e38` 10-insn
  accessor ending 0x504e5c, next fn 0x504e64; `0x658188..0x6582b0` = 7 bl with exactly the listed 7
  targets.
* **slice-12a/12b/12c** — `0xc145e0` 4 bl, `0xbfa494` 27 bl, `0x19fbd0` 0 bl (serializer ending
  `pop {r4,r5,r6,lr}; bx r2`); `0xa65404` 14 bl into the render cluster; `0x6e067c` 11 bl,
  `0x1e1c04` 20 bl; markers `0xce4540 = bx lr`, `0x42141c = b 0x43b488`, `0x1c5034`/`0x536958`
  0-bl blx-only serializers.
* **slice-13a1/13b/13c** — `0x73eb28..0x73f0bc` exactly 10 bl (0x194228 ×6); `0xb4f08c` 9-insn
  0-bl getter; `0x9b41f4` 0 bl; `0x9e6400` 3 bl; `0x4e0380` exactly 1 bl (0x4d5e14); `0xccbab4`
  exactly 8 bl in 0xccbab4..0xccbedc; `0x793424` 10 bl in 140 insns; `0x2ff1cc..0x2ff720` = 19 bl;
  `0x1c7264` 7-insn accessor (`cmp [r2,#100]; ldr [r2,#108]; mov r2,#88; mla; bx lr`).
* **slice-14b/15a/15b** — `0x16bb38` 11 bl, `0x182374` 9 bl (both orchestrator); `0xc97e14` 1 bl
  (`bl 0x13efd7c` @0xc97e50, ends 0xc97e54); `0x80eb4c` 8-insn init, 0 bl; `0x4e124c` 6 bl;
  `0x2a9098..0x2a95a4` exactly 2 bl at 0x2a9434/0x2a9594 (byte-exact with the row); `0x5e438` 0 bl;
  `0xccb284` vtable 0xb7adc8/0xb7adcc + unlink loop, 0 bl.

## Difficulties

* `tiers.csv` extents are coarse (region = until the next inventory start) and its `insns` counts
  overshoot into literal pools, so `start + 4*insns` is not a function end (0xa13cb4 ends at 0xa14dc8,
  `+0x4` later is a pool word). Function ends were therefore taken from the docs' stated extents and
  verified against the image (terminal `bx`/`pop pc`/tail `b`).
* Two scanner traps cost a pass and are worth recording: (a) an unconditional `bx rN` (virtual
  tail-call) ends a function just like `bx lr`; (b) internal unconditional branches (switch tails)
  and `bxhi lr` early-outs must not be treated as function ends. With either mistake, slice-10's and
  slice-12c's "0 bl" serializer rows produce false mismatches, and 15c's `0xc616bc` genuinely has its
  4 bl (3 × `0x13efddc`) only when the whole region is scanned.
* Vote ratios cannot be recomputed in this repo at all (no vote artifact), so 13c and every
  "votes X:N vs Y:M" sentence are graded on disassembly only.

## Progress log

| group | docs | state |
|---|---|---|
| 04–10 (7 × 60 rows) | 04,05,06,07,08,09,10 | confirmed — rows parsed, counts vs Summary/审查后 recomputed, image checks done for 04/05/06/07/09/10 (08 has no disassembly claims) |
| 11a–11c (3 × 20) | 11a,11b,11c | confirmed — marker/extent/bl checks on 11a (3), 11b (2 + 1 citation error), 11c (3) |
| 12a–12c (3 × 20) | 12a,12b,12c | confirmed — bl counts and boundaries checked; 12b has one callee error |
| 13a (0 rows) | 13a | confirmed empty → MISSING |
| 13a1–13a2 (10 + 10) | 13a1,13a2 | confirmed — 73eb28/b4f08c/9b41f4 and the 64c528 boundary reproduce; 27d5c4 row text wrong |
| 13b–13c (2 × 20) | 13b,13c | confirmed — 13b A row refuted, 9e6400/4e0380/ccbab4/793424 reproduce; 13c disassembly OK, vote ratios unverifiable |
| 14a–14c (3 × 20) | 14a,14b,14c | confirmed — 14a measurements exact / Summary arithmetic wrong; 14b roles OK; 14c two evidence defects |
| 15a–15c (3 × 20) | 15a,15b,15c | confirmed — 15a/15b exact; 15c one count error (cd29ac), c616bc correct |

Unknown / not decidable with repo artifacts: vote ratios (no vote table), "rows match the slice-0N.txt
`^===` headers" (input files absent), the current `coverage-report.tsv` (untracked and mutating).
Nothing remains in progress: all 24 files audited, 720/720 rows looked up in `tiers.csv`.
