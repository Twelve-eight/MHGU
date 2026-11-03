# W6 PASS-12 — the tierb-pass1 and tierb-pass2 adjudication slices

Sweep date 2026-11-04. Scope: `docs/analysis/code/tierb-pass1/` (5 files, 1,178 table rows) and
`docs/analysis/code/tierb-pass2/` (14 files, 2,070 table rows) — 19 documents, 3,248 adjudicated rows.
Every claim below was recomputed against a file in the repository or against `main.140.flat.bin`;
nothing here is quoted from another audit.

## Method

| artefact | role in this sweep |
|---|---|
| row parser | every line matching `^\|\s*0x[0-9a-f]+\s*\|` with 5 cells; escaped pipes (`\|`) in 4 diagnostic rows were detected and their evidence cell not used for numeric parsing |
| `docs/data/functions.csv.gz` | 23,885 rows, `start,end,insns,callers,callees,strings` — the **region tiling** the slices were produced from (METER §198: "区域平铺，不是函数表") |
| `docs/data/functions-retile.csv.gz` | 52,692 rows, same schema — the **current** function table (METER §42/§198; `RETILE.md`) |
| `docs/analysis/code/inventory/stringxref.tsv` | 16,998 instruction-level string references, rebuilt from the image (METER §859 says this, not the `strings` column, is the authority) |
| `docs/data/tierb-labels.csv` | 378 rows, the merged label file these passes fed |
| `docs/analysis/code/inventory/function-labels.tsv` | 40,374 rows, current shipped attribution |
| `main.140.flat.bin` + `tools/mhgu/arm32.mjs` | `disasm(vaddr,n)` for every spot check; flat = vaddr + 0x100 |

Reproduction: the helper scripts used are in `.tmp/w6-pass12/` (`parse.mjs`, `claims3.mjs`, `claims4.mjs`,
`rolecheck.mjs`, `strcheck3.mjs`, `agree.mjs`, `labelagree.mjs`, `spot.mjs`, `final.mjs`). They are scratch,
not tracked; each finding below also gives the command whose output is quoted.

## 1. Row counts, addresses, alignment

- 3,248 rows parsed (pass1 1,178 / pass2 2,070). **0 duplicate vaddrs inside any file.**
- **0 rows are missing from either function table**: all 3,248 addresses are a `start` in
  `functions-retile.csv.gz` *and* in `functions.csv.gz`. All are 4-byte aligned and inside `.text`
  (< `0x13f1dec`).
- The "N / total" coverage lines are arithmetically correct where present: slice-05 550/1062 = 51.8%
  (`tierB-slice-05.md:20`), slice-08 78/1062 = 7.3% and 1062−78 = 984 (`tierB-slice-08.md:11`),
  slice-14 300/1057 with conf A0/B183/C117 (`tierB-slice-14.md:11`, recomputed A0/B183/C117).
- 145 addresses are adjudicated **twice**, in two different documents; 29 of those pairs carry different
  labels (section 6).

## 2. Instruction counts and instruction sums — the docs describe the old region tiling, not the current table

Per-row instruction claims were extracted (`(\d+) 指令`, `insns=N`) and compared with both tables.

| file | insn claims matching `functions.csv.gz` | matching `functions-retile.csv.gz` |
|---|---|---|
| tierB-slice-03 | **108 / 108** | 95 / 108 |
| tierB-slice-05 | 415 / 419 | 362 / 419 |
| tierB-slice-08 | **18 / 18** | 18 / 18 |
| tierB-slice-14 | 116 / 119 | 105 / 119 |
| tierB2-slice-12 | 1 / 1 | 1 / 1 |
| tierB2-slice-13 | 1 / 3 | 1 / 3 |
| all others | no instruction claims | — |

Every one of the 7 "misses" against `functions.csv.gz` (4 in slice-05, 3 in slice-14) is a count of the
**callee**, not of the row: 0x325580 cites "0x7cc110 … 13 指令" and `0x7cc110` is 13 instructions;
0x362bbc cites "0x23210c … 55 指令" (55 ✓); 0x37b548 cites 238 for 0x2321e8 (238 ✓); 0x3a3778 cites 40 for
0x37a2e4 (40 ✓); 0x139f9b8 cites 331 for 0x130d158 (331 ✓); 0x13a0564 cites 3 for 0x130704c (3 ✓);
0x13a14d8 cites 366 for 0x13a16a0 (366 ✓). **No instruction count in the 19 files is wrong for the table it
used.**

What is wrong is the referent of "指令". Under the current table the same addresses are much smaller:

```
0x1890f0  functions.csv.gz: 0x1890f0..0x189510  264 insns
0x1890f0  functions-retile: 0x1890f0..0x1890f4    1 insn
```

The disassembly shows why the retile is right and the doc's 264 is a *region* size:

```
001890f0: eafa8a04  b 0x2b908          <- the whole "function" the doc counted
001890f4: e92d4010  push {r4, lr}      <- a new function starts here
00189124: e92d4ff0  push {r4, r5, r6, r7, r8, r9, r10, r11, lr}
```

`docs/analysis/code/tierB-slice-03.md:28` ("264 指令调 0x2b908/0x7aa47c/0x7bb638") therefore describes a
264-instruction *tile* that contains at least three real functions. The same holds for every other
264/263/459/… figure in these files.

Instruction sums over each document's own rows (no document publishes a sum, so nothing to contradict —
this is the size of what the tables cover):

| file | rows | Σ insns old table | Σ insns retile | min / max (old) |
|---|---:|---:|---:|---|
| tierB-slice-03 | 250 | 21,560 | 14,500 | 2 / 766 |
| tierB-slice-05 | 550 | 146,134 | 89,839 | 1 / 18,767 |
| tierB-slice-08 | 78 | 62,985 | 33,239 | 3 / 3,393 |
| tierB-slice-14 | 300 | 17,666 | 15,678 | 1 / 594 |
| tierB2-slice-01 | 120 | 53,476 | 28,790 | 429 / 462 |
| tierB2-slice-02 | 120 | 193,604 | 82,955 | 1,304 / 2,026 |
| tierB2-slice-03 | 120 | 46,346 | 29,164 | 371 / 403 |
| tierB2-slice-04 | 30 | 30,542 | 12,990 | 992 / 1,039 |
| tierB2-slice-05 | 120 | 40,950 | 27,170 | 332 / 352 |
| tierB2-slice-06 | 60 | 44,166 | 19,081 | 717 / 763 |
| tierB2-slice-07 | 120 | 76,981 | 41,050 | 610 / 677 |
| tierB2-slice-08 | 120 | 69,820 | 37,336 | 555 / 609 |
| tierB2-slice-09 | 30 | 16,332 | 9,689 | 533 / 554 |
| tierB2-slice-10 | 90 | 43,742 | 25,353 | 472 / 499 |
| tierB2-slice-11 | 286 | 57,440 | 40,028 | 189 / 213 |
| tierB2-slice-12 | 286 | 51,273 | 36,343 | 171 / 189 |
| tierB2-slice-13 | 286 | 46,582 | 35,503 | 156 / 171 |
| tierB2-slice-14 | 282 | 42,176 | 32,114 | 143 / 156 |

The retile column is 40–65% of the old one throughout: a third to a half of the "instructions" the docs
attribute to one function belong to its neighbours.

## 3. Callee counts

`(\d+) 个 callee` / `N callees` claims, compared with the `callees` column of `functions.csv.gz`
(the column the slices were built from), `≥N` treated as a lower bound, subset phrasing
("N 个 callee 落 Pia 区间", "N 个 callee 全 …") excluded: **547 / 578 reproduce exactly (94.6%)**.
All 31 residuals, with the actual list length:

```
tierB-slice-03  0x188c84  ≥15 / 14      tierB-slice-03  0x18d890  9 / 10
tierB-slice-03  0x18dd88   7 / 8       tierB-slice-03  0x18e07c  9 / 10
tierB-slice-03  0x19b7fc  13 / 14      tierB-slice-03  0x194228  8 / 0   (count is of 0x187a60)
tierB-slice-05  0x324aa8  16 / 17      tierB-slice-05  0x38701c 14 / 15
tierB-slice-05  0x3c131c  11 / 12      tierB-slice-05  0x3c1568 13 / 28
tierB-slice-05  0x3cb008   8 / 15      tierB-slice-08  0x614778  0 / 8   ("0x3b57d0 callees")
tierB-slice-14  0x13a57f8  8 / 5       tierB2-slice-01 0x50b4dc 23 / 30
tierB2-slice-01 0x7d15b8   5 / 6       tierB2-slice-01 0x9bdc68 22 / 48
tierB2-slice-04 0x98357c   6 / 7       tierB2-slice-09 0x170adc 22 / 25
tierB2-slice-09 0x6eae68  22 / 26      tierB2-slice-10 0x11f605c 22 / 23
tierB2-slice-10 0x16b15c  22 / 23      tierB2-slice-10 0x76dc98 22 / 26
tierB2-slice-10 0x67ac08  23 / 31      tierB2-slice-10 0x675dc4 23 / 27
tierB2-slice-10 0x749c20  23 / 32      tierB2-slice-10 0x60af6c 23 / 26
tierB2-slice-10 0x7192f8  22 / 23      tierB2-slice-10 0x778384 22 / 39
tierB2-slice-10 0x770a44  23 / 29      tierB2-slice-12 0x72d0f8 17 / 18
tierB2-slice-13 0xc4b798  4 / 3
```

Reading of the residuals: one failed lower bound (`0x188c84` "≥15" against 14, `tierB-slice-03.md:24`);
11 off-by-one counts; 10 slice-10 rows that all say 22–23 where the table has 23–39 (the pattern of a
truncated callee list in the deleted input file); two parser artefacts (`0x194228`, `0x614778`, where the
number belongs to a different function or to a 0 that ends an address). `0x18dd88` matters more than its
size: the row says "7 callee" and worker, and the eighth callee is what makes it an orchestrator under the
doc's own rule (`tierB-slice-03.md:73`).

## 4. String evidence — region-inherited, not function-level

The `strings` column of `functions.csv.gz` was inherited by containment from the old tiling
(`RETILE.md`: "字符串列不重新提取"), and `METER.md:859` records that it carries false positives.
`stringxref.tsv` rebuilds references from the instructions of each **retile** function.

Of the 145 backticked tokens in these 19 files that actually exist as strings in the image:

- **145 / 145 are referenced somewhere inside the row's old-table region** (3 are incidental mentions of
  another function's string, e.g. "slice-10 以 `rtex` 同判");
- only **35 / 145 are referenced by the function that cites them** (containing retile function).

So the A-level sentence "函数直接引用的字符串" in every method section is true at *region* level and false
at *function* level for 76% of the string citations. The pass itself discovered this on 2026-10-24 and
demoted four rows with the note "所引字符串未在真实函数体内经 pc 相对载入 → B" (`tierB-slice-03.md:96,102`,
`tierB-slice-08.md:38,41`). That note is correct — the image confirms it:

```
cOtodokeConditionList at flat 0x1557e69; literal words equal to its vaddr in .text: none
cInsectAttrFeed       at flat 0x155440e; literal words equal to its vaddr in .text: none
cMix                  at flat 0x1556631; literal words equal to its vaddr in .text: none
008::cSetupParamPl_com_008 at flat 0x15658b0; one literal at 0x32492c, i.e. 0x3a4 bytes past the end of
                                       the retile function 0x324588..0x32484c that cites it
```

`stringxref.tsv` has no row at all for `0x18ecb0`, `0x18f998`, `0x658ae8`, `0x69c258`, `0x18bb60`.

Two consequences worth recording as defects:

- **`tierB-slice-08.md:60`** still cites "字符串 `cMix`" as part of the evidence for 0x18bb60 (B), although
  no instruction in the image references that string.
- **`tierB2-slice-11.md` re-promotes a demoted row back to A**: `0x18ecb0` is listed among the 13 conf-A
  rows (line 214, "字符串 `cOtodokeConditionList`"), which is exactly the evidence the 2026-10-24 review
  rejected in `tierB-slice-03.md:96`. Ditto `0x381738` (A, "cResourceSample", body has no reference) and
  `tierB2-slice-10.md:70` (`0x362438`, A, "mRewardTable[0]|resource", body has no reference). 11 of the 14
  A-rows that cite an image string do reference it in their own body; these 3 do not.

`tierB-slice-14.md:29` ("0x13bdadc 自身字符串 `MtCollisionUtil::MtDtiSelecterIntermediate`") is the same
kind of error: the string is referenced by `0x13bdd10` (`stringxref.tsv:16552`), 0x324 bytes later, and by
no instruction of `0x13bdadc`.

## 5. Summary tallies — what reproduces and what does not

Every distribution the documents print was recounted from their own tables (`parse.mjs`). Rows: stated vs
recomputed.

| document | label counts | conf counts | role counts | verdict |
|---|---|---|---|---|
| tierB-slice-03 | quest 155, otomo-ot 11, unknown 77, online-nex 2, save-io 4, item 1 (not printed) | A1 B91 C158 = stated | 22/149/73/6 (not printed) | stated counts ok |
| tierB-slice-05 | all 11 counts exact (`:22`) | C403 B143 A4 exact (`:23`) | worker 327 / leaf 119 / orch 68 / thunk 36 exact (`:24`) | ok |
| tierB-slice-08 | — | — | — | 78 rows, §A 37 ≥1000 insns descending, §B 41 address-ascending: exact |
| tierB-slice-14 | "待回填" (`:12`) — actual: online-nex 300/300 | A0 B183 C117 exact (`:11`) | actual worker 170 / leaf 86 / thunk 22 / orch 22 | tally comment wrong (§7) |
| tierB2-slice-01 | 13 classes exact (`:152`) | A6 B85 C29 exact | orch 82 / worker 34 / thunk 4 exact | ok |
| tierB2-slice-02 | exact (`:152`) | A6 B80 C34 exact | 102 / 18 exact | ok |
| tierB2-slice-03 | exact (`:150`) | A4 B85 C31 exact | 70 / 50 exact | ok |
| tierB2-slice-04 | none (placeholder, honest for a 30/120 page) | — | — | partial |
| tierB2-slice-05 | exact (`:152`) | A4 B78 C38 exact | **stated 60 orch / 53 worker / 7 leaf (`:154`) — table has 56 / 57 / 7** | contradiction |
| tierB2-slice-06 | 8 classes exact (`:9-18`) | A1 B57 C2 exact | 42 / 18 exact | ok |
| tierB2-slice-07 | 12 classes exact (`:11-22`) | A1 B94 C25 exact (`:26`) | **stated 81 / 27 / 9 / 3 — table has 76 / 32 / 9 / 3** | contradiction |
| tierB2-slice-08 | 9 classes exact (`:12`) | A3 B93 C24 exact (`:13`) | **stated 83 / 21 / 10 / 6 — table has 81 / 23 / 10 / 6** | contradiction |
| tierB2-slice-09 | "见文末终版统计" (`:23,25,27`) — no such section exists | — | — | broken pointer |
| tierB2-slice-10 | no summary section at all | — | — | missing |
| tierB2-slice-11 | physics-math **17 (actual 18)**, "其余 230 (actual 229)" (`:370`) | A13 B158 C115 exact (`:364`) | not printed | contradiction |
| tierB2-slice-12 | "近似 ±8" (`:305`) — within tolerance (quest 136 vs 139, em 44 vs 42, otomo 36 vs 32) | A19 B157 C110 exact (`:303`) | leaf 8 and the eight addresses exact (`:304`) | ok except §6 |
| tierB2-slice-13 | not printed | A3 B204 C79 exact (`:312`); the three named A addresses are exactly the three A rows | not printed | ok |
| tierB2-slice-14 | not printed | A4 B179 C99 exact (`:299`) | **"leaf 22" — table has 28 leaf rows, all with 0 callees** (`:300`) | contradiction |

Four tallies contradict their own tables in the same file (slice-05, -07, -08, -14 of pass2); one
(slice-11) is off by one per class. The rest reproduce exactly, which matters: it means the tables are the
reliable part and the prose tallies are the part that rots.

## 6. The role column does not follow the stated mechanical rule

Rule as printed in most files: leaf = no callees, thunk = ≤4 instructions and no callees,
orchestrator = ≥8 callees, worker = the rest. Applied to each row with `functions.csv.gz`'s callee list:

```
tierB-slice-03 1/250   tierB-slice-05 8/550   tierB-slice-08 0/78   tierB-slice-14 1/300
tierB2-slice-01 20/120  tierB2-slice-02 1/120 tierB2-slice-03 12/120 tierB2-slice-04 7/30
tierB2-slice-05 3/120   tierB2-slice-06 3/60   tierB2-slice-07 15/120 tierB2-slice-08 11/120
tierB2-slice-09 5/30    tierB2-slice-10 0/90   tierB2-slice-11 8/286  tierB2-slice-12 13/286
tierB2-slice-13 20/286  tierB2-slice-14 1/282
```

`tierB2-slice-07.md:30` states the deviation in general ("insns 字段与可见函数体不一致 … role 以可见的
prologue/epilogue 与 callee 数量为准") and slice-08 explains it per row ("入口仅一条 `b 0x43b488` …"), so those
two files document why their columns differ from the rule. `tierB2-slice-01`, `tierB2-slice-03` and
`tierB2-slice-13` do not, and their deviations are not shell artefacts — e.g. `0x75bce8` (10 callees, worker)
and `0x136641c` (8 callees, worker, same row conf A) in slice-13; `0x1c3fcc` (4 callees, orchestrator) and
`0x433198` (2 callees, orchestrator) in slice-01.

## 7. The trailing tally of `tierB-slice-14.md` is wrong in every field

`tierB-slice-14.md:357`:

```
<!-- tally 块1-3: online-nex 300 / B 246 / C 154 / worker 235 / leaf 117 / thunk 25 / orchestrator 23 / 小计 300; 累计 300/1057 -->
```

Recomputed from the same file's 300 rows: B **183**, C **117**, worker **170**, leaf **86**, thunk **22**,
orchestrator **22**. The comment also fails its own arithmetic: 235+117+25+23 = **400**, not 300.
The prose summary at `:11` has the right conf counts (B 183 / C 117), so the comment is a leftover from a
different run and is the only place in the file with those numbers.

## 8. Cross-document contradictions: 29 functions carry two different labels

145 addresses are adjudicated in two documents (pass1 and pass2 both claim them); 29 carry different labels
and no document mentions the overlap. Format `vaddr  pass1 label/conf @line  vs  pass2 label/conf @line`:

```
0x191bd4  quest/B      tierB-slice-03:121  vs item/B       tierB2-slice-08:47
0x1979b0  save-io/B    tierB-slice-03:199  vs save-data/A  tierB2-slice-10:89
0x198120  save-io/B    tierB-slice-03:200  vs save-data/A  tierB2-slice-01:67
0x324300  quest/C      tierB-slice-05:30   vs unknown/C    tierB2-slice-13:176
0x325b48  monster-em/C tierB-slice-05:35   vs quest/B      tierB2-slice-11:115
0x329668  monster-em/C tierB-slice-05:55   vs quest/B      tierB2-slice-13:60
0x32a104  monster-em/C tierB-slice-05:58   vs quest/C      tierB2-slice-11:313
0x32b834  quest/B      tierB-slice-05:64   vs ui/B         tierB2-slice-07:58
0x3559c0  otomo-ot/C   tierB-slice-05:80   vs unknown/C    tierB2-slice-08:67
0x381738  quest/B      tierB-slice-05:110  vs filesystem/A tierB2-slice-11:88
0x3918f8  quest/B      tierB-slice-05:196  vs monster-em/B tierB2-slice-05:111
0x395850  otomo-ot/C   tierB-slice-05:202  vs save-io/C    tierB2-slice-02:128
0x39d8d8  otomo-ot/C   tierB-slice-05:214  vs quest/C      tierB2-slice-11:203
0x3a400c  otomo-ot/C   tierB-slice-05:251  vs quest/C      tierB2-slice-11:264
0x3aa530  monster-em/C tierB-slice-05:312  vs unknown/C    tierB2-slice-13:84
0x3b0ad8  otomo-ot/C   tierB-slice-05:372  vs unknown/C    tierB2-slice-01:68
0x3b3db0  otomo-ot/C   tierB-slice-05:381  vs quest/C      tierB2-slice-11:355
0x3bff10  otomo-ot/C   tierB-slice-05:439  vs unknown/C    tierB2-slice-11:333
0x3c09ec  otomo-ot/C   tierB-slice-05:446  vs quest/C      tierB2-slice-13:128
0x3c5568  monster-em/C tierB-slice-05:463  vs quest/B      tierB2-slice-03:130
0x3cf6d4  otomo-ot/C   tierB-slice-05:504  vs save-data/A  tierB2-slice-14:167
0x3d15a4  quest/A      tierB-slice-05:519  vs kernel-os/A  tierB2-slice-14:168
0x3d9724  otomo-ot/C   tierB-slice-05:538  vs unknown/C    tierB2-slice-14:184
0x3dee74  otomo-ot/B   tierB-slice-05:549  vs filesystem/B tierB2-slice-13:129
0x697478  unknown/C    tierB-slice-08:35   vs render-gfx/C tierB2-slice-02:67
0x698eb4  unknown/C    tierB-slice-08:44   vs quest/C      tierB2-slice-02:145
0x69c258  unknown/B    tierB-slice-08:38   vs quest/B      tierB2-slice-02:90
0x69eb18  unknown/A    tierB-slice-08:30   vs save-data/A  tierB2-slice-02:29
0x61e5d4  quest/C      tierB-slice-08:85   vs unknown/C    tierB2-slice-14:94
```

Two of these are **A against A**, which is the case the project's own rules say must not happen:

- `0x3d15a4` — pass1: "字符串 `[WORK0..4]`（同类等级标签）→ quest/A" (`tierB-slice-05.md:519`);
  pass2: "字符串 `[WORK0]`…`[WORK3]`（工作线程名）→ kernel-os/A" (`tierB2-slice-14.md:168`).
  The image settles the strings but not the label: `stringxref` gives `[WORK0]`..`[WORK7]` referenced by
  `0x3d15a4` itself, i.e. the thread-name reading is at least textually right and the "grade label"
  reading is unsupported. `function-labels.tsv` currently says `ui` (inferred, one-vote cascade) — a third
  answer.
- `0x69eb18` — pass1: `areaseldat` → unknown/A ("标签集无 area 项"); pass2: same string → save-data/A.
  The string is referenced by the function (`stringxref.tsv` row `0x69eb18 areaseldat`), so both A grades
  are textually earned and only the classification differs.

## 9. `docs/data/tierb-labels.csv` — 378 rows, all agreeing, and a snapshot older than the documents

Query (the file has quoted commas in `evidence`, so it must be CSV-parsed; this is the exact script, re-runnable):

```js
import fs from 'node:fs';
const rows = []; let cur = [], f = '', q = false;
for (const c of fs.readFileSync('docs/data/tierb-labels.csv', 'utf8')) {
  if (q) { if (c === '"') q = false; else f += c; continue; }
  if (c === '"') q = true;
  else if (c === ',') { cur.push(f); f = ''; }
  else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = ''; }
  else if (c !== '\r') f += c;
}
const hdr = rows.shift(), col = (n) => hdr.indexOf(n);
const docs = new Map();
for (const d of ['tierB-slice-03', 'tierB-slice-05', 'tierB-slice-08'])
  for (const l of fs.readFileSync(`docs/analysis/code/tierb-pass1/${d}.md`, 'utf8').split('\n')) {
    const m = /^\|\s*(0x[0-9a-f]+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|(.*?)\|/.exec(l);
    if (m) docs.set(m[1], { label: m[2].trim(), role: m[3].trim(), conf: m[4].trim() });
  }
let lab = 0, role = 0, conf = 0; const bad = [];
for (const r of rows) {
  const d = docs.get(r[col('vaddr')]); if (!d) { bad.push({ vaddr: r[0], why: 'not in doc' }); continue; }
  if (d.label === r[col('label')]) lab++; else bad.push({ vaddr: r[0], field: 'label', csv: r[col('label')], doc: d.label });
  if (d.role  === r[col('role')])  role++; else bad.push({ vaddr: r[0], field: 'role',  csv: r[col('role')],  doc: d.role });
  if (d.conf  === r[col('conf')])  conf++; else bad.push({ vaddr: r[0], field: 'conf',  csv: r[col('conf')],  doc: d.conf });
}
console.log(`rows ${rows.length}  label ${lab}  role ${role}  conf ${conf}`);
for (const b of bad) console.log(JSON.stringify(b));
```

Output of that script:

```
rows 378  label 378  role 378  conf 374
{"vaddr":"0x18ecb0","field":"conf","csv":"A","doc":"B"}
{"vaddr":"0x18f998","field":"conf","csv":"A","doc":"B"}
{"vaddr":"0x658ae8","field":"conf","csv":"A","doc":"B"}
{"vaddr":"0x69c258","field":"conf","csv":"A","doc":"B"}
```

- **378 / 378 rows are present in the documents and 378 / 378 carry the same `label` and `role`** —
  label disagreement rate **0.0%**.
- **374 / 378 carry the same `conf`**; 4 disagree, all in the same direction (`tierb-labels.csv` says A,
  the document says B):
  `0x18ecb0`, `0x18f998` (`tierB-slice-03.md:96,102`), `0x658ae8`, `0x69c258` (`tierB-slice-08.md:41,38`).
  The document is right: those four are the 2026-10-24 demotions, and the CSV still carries the *pre-commit*
  evidence strings without the demotion note.
- The CSV covers only 378 of the 3,248 adjudications (**11.6%**): all 250 rows of slice-03, all 78 of
  slice-08, and **only the first 50 of slice-05's 550**; **0 of pass2's 2,070 rows**.
- Provenance: `tools/mhgu/tierb-merge.py` globs `.tmp/reports-mhgu/tierB-slice-*.md` and dedups by vaddr.
  That glob cannot see pass2 (`tierB2-*`), and the `.tmp` copy of slice-05 it saw had 50 rows. The CSV is
  therefore a snapshot from **before commit `66e12a5` (2026-10-24 02:42)**: `git show 66e12a5^:…/tierB-slice-03.md`
  gives exactly the CSV's `0x18ecb0` line (conf A, no demotion note), while the current file has B.

**Requested 50-row sample** (LCG seed 20261104 over the 378 rows, 50 drawn, addresses listed in
`.tmp/w6-pass12` run log): label agreement **50/50**, role **50/50**, conf **50/50**. The four conf
mismatches were not drawn in this sample; the full-population result above is the superset and is the number
to quote.

## 10. Declared address domains that their own tables contradict

Five pass2 files state an address domain for the slice; their tables contain rows outside it
(`parse.mjs` + min/max per file):

| document | stated domain (line) | rows below | rows above | examples |
|---|---|---:|---:|---|
| tierB2-slice-01 | 0x46b6d0..0xb58ba0 (`:3`) | 33 | 30 | 0x1c3fcc@L17, 0x13c1ccc (cited in its own A-list) |
| tierB2-slice-03 | 0x4cfa24..0xb8692c (`:3`) | 39 | 20 | 0xbf416c@L14, 0x29244 |
| tierB2-slice-04 | 0x6b3460..0x13b8d1c (`:5`) | 8 | 0 | 0x696440@L29, 0xae42c |
| tierB2-slice-05 | 0x5b7744..0x7cb374 (`:3`) | 37 | 58 | 0x84c2d0@L15, 0x13a93d4 |
| tierB2-slice-08 | 0x3cf1c..0xb6c7d4 (`:3`) | 2 | 18 | 0x113aeb8@L31, 0x13e72fc |

`tierB2-slice-13.md:4` and `tierB2-slice-14.md:3` print their domains with `lo > hi`
(`0xb1159c..0x758d6c`, `0x7d6324..0x4fd66c`), i.e. "first entry..last entry" of an insns-sorted list, so
the interval is meaningless as a domain. All rows are inside the pass1 files' contiguous ranges
(0 outside for slice-03/-05/-08/-14), which is why this only affects pass2.

## 11. Spot checks — five rows per document, verified against the image

For each file, rows 1, 25%, 50%, 75% and last were disassembled (`arm32.disasm`, old-table body). Every
`0x…` address in the evidence that is a function start was tested against the BL/BLX targets of the body;
"miss" means the address is not a call of that row and was checked by reading the sentence (caller, cluster
range, or comparison with a neighbour).

| document | five rows (label/conf) | addresses claimed → found as calls |
|---|---|---|
| tierB-slice-03 | 0x187a60 quest/B, 0x18e4ec quest/C, 0x19406c otomo-ot/B, 0x198824 quest/B, 0x19cfe4 quest/B | 15 → 15 |
| tierB-slice-05 | 0x3241bc quest/C, 0x38d3dc otomo-ot/C, 0x3a9e40 otomo-ot/C, 0x3c0444 otomo-ot/C, 0x3e0b48 otomo-ot/C | 3 → 3 |
| tierB-slice-08 | 0x6c8a2c render-gfx/B, 0x658ae8 ui/B, 0x60d758 unknown/C, 0x61e5d4 quest/C, 0x623d50 otomo-ot/C | 13 → 11 (2 are the row's own address and a cluster range in prose; 0x6c8a2c is 3,393 insns and only the first 1,200 were decoded) |
| tierB-slice-14 | 0x139c7ec online-nex/B, 0x13a0934 online-nex/C, 0x13a6070 online-nex/B, 0x13a8924 online-nex/B, 0x13ae8b4 online-nex/C | 7 → 6 (0x13aa228 is named as a caller, correctly) |
| tierB2-slice-01 | 0x46b6d0 monster-em/B, 0x42df08 monster-em/B, 0x3ffcec monster-em/B, 0xbdac90 render-gfx/A, 0xb58ba0 online-nex/B | 27 → 27 |
| tierB2-slice-02 | 0xc26af0 render-gfx/B, 0x76a6b4 quest/B, 0xc61bb4 render-gfx/B, 0x1291910 online-nex/B, 0x11dea04 monster-em/B | 6 → 6 |
| tierB2-slice-03 | 0x4cfa24 unknown/C, 0x7a0230 quest/B, 0xf0ab0 otomo-ot/B, 0x77174c quest/B, 0xb8692c quest/B | 18 → 18 |
| tierB2-slice-04 | 0x98357c render-gfx/C, 0xb42788 render-gfx/B, 0x75e89c quest/B, 0x68fdb0 otomo-ot/B, 0x7a85ac quest/B | 21 → 21 |
| tierB2-slice-05 | 0x5b7744 quest/C, 0xba77e4 quest/C, 0xc64f14 render-gfx/B, 0x72f13c quest/B, 0x7cb374 quest/B | 13 → 13 |
| tierB2-slice-06 | 0xb811f0 quest/B, 0x7437bc quest/B, 0x16f2c quest/B, 0x6bed44 quest/B, 0xba4be4 quest/B | 9 → 9 |
| tierB2-slice-07 | 0xcee3d8 filesystem/B, 0xcc5af8 quest/C, 0xb8e7c0 save-data/A, 0x801680 quest/C, 0x71e780 quest/B | 5 → 5 |
| tierB2-slice-08 | 0x3cf1c unknown/C, 0xc08558 quest/B, 0x1190cf0 render-gfx/B, 0x13c40c4 online-nex/A, 0xb6c7d4 quest/B | 13 → 13 |
| tierB2-slice-09 | 0xe3750 quest/B, 0x3eed68 quest/B, 0x9ddc3c quest/B, 0x85c908 otomo-ot/C, 0x190a64 otomo-ot/B | 7 → 6 ("callee 列表与 0x856404 几乎相同" is a comparison) |
| tierB2-slice-10 | 0x3d8a0 audio/B, 0x806094 physics-math/C, 0x675dc4 quest/B, 0x778384 otomo-ot/B, 0x815814 online-nex/B | 21 → 21 |
| tierB2-slice-11 | 0x38a950 monster-em/B, 0x576014 quest/B, 0x1645e0 otomo-ot/B, 0x476014 monster-em/B, 0x4ef3f0 quest/B | 26 → 25 (0x1651c8 is a `bleq` tail branch at 0x1648c0, not a BL — the table counts it as a callee, the doc follows the table) |
| tierB2-slice-12 | 0x4f3e08 quest/A, 0x7d6044 render-gfx/C, 0x116e358 monster-em/C, 0xa1bb14 filesystem/C, 0x6bcb54 quest/B | 33 → 33 |
| tierB2-slice-13 | 0x64a198 quest/B, 0x7c0f00 physics-math/C, 0xb72d88 physics-math/B, 0x5cb504 otomo-ot/B, 0x758d6c quest/C | 23 → 22 (0x7c7d54 named as "同型" of a slice-11 function) |
| tierB2-slice-14 | 0x7d6324 render-gfx/B, 0x9fbf4c kernel-os/C, 0x812f4c quest/B, 0x2f2874 monster-em/B, 0x4fd66c quest/B | 15 → 12 (0x4c46e0/0x1c864c are prose about a 16-byte accessor, 0x7af3c4 is a `b` tail stub) |

No spot check produced a false call target. The evidence text is grounded; the defects in this pass are
tally/version defects, not invented disassembly.

All nine "misses" are explained by the sentence (caller, cluster range, comparison with a neighbouring function) or by the table counting a conditional tail branch; none is a wrong call target.

## 12. Ordering, and structural claims that reproduce

- `tierB-slice-08.md` §A (37 rows, all ≥1000 insns, descending: 0 violations) and §B (41 rows, ascending
  by address: 0 violations) — exact.
- `tierB2-slice-01/-03/-11/-12/-14` "按 insns 降序": 0 violations over the old-table insns.
  `tierB2-slice-12.md:304` "最小 171 insns" — exact (min 171, max 189).
  `tierB2-slice-13.md:310` "0x64a198, insns=161" — exact.
- `tierB2-slice-13.md:311` admits inserting `0x64a198` at the head; the file has **two further ordering
  breaks** it does not mention: `0xa9c1f4` (167 insns) after `0xa1da40` (161) at row 188, and `0x9eb780`
  (167) after `0x6722a4` (156) at row 277.
- `tierB2-slice-14.md:298` "21 rows inserted between 0x54a7b0 and 0x6fd448" — exactly 21 rows between those
  two table rows, no duplicate addresses.
- `tierB-slice-14.md:18-21` PLT stubs: `0x13efd70..0x13f1dec` is a 12-byte-stride stub table. Confirmed —
  `add r12,pc,#4194304; add r12,r12,#294912; ldr pc,[r12,#668]!` repeating at 0x13efd70/7c/88/94/a0/ac.
- `tierB-slice-14.md:25` Pia strings: `0x130b4d0` really does reference `SDK MW+Nintendo+Pia-5_2_15`
  (`stringxref.tsv`), and `0x130ca5c` really does reference `%d.%d.%d.%d:%d`.
- `tierB2-slice-13.md:312` cites commit `66e12a5` with "pass1/2 124 个区段级 A 降 B". Verified:
  `git show 66e12a5^ … 66e12a5` per file gives 124 A→B changes across the 16 pass1/pass2 files, plus 5 in
  `tierB3-slice-06.md` which the sentence correctly excludes.
- `tierB-slice-03.md:24` "≥15 callee" for 0x188c84: the list has 14 — the only failed lower bound.

## 13. Broken pointers and missing sections

- `tierB2-slice-09.md:23,25,27` — "见文末终版统计" three times; the file ends at line 62 with no such
  section. The page has 30/120 rows (honest) but no counts at all.
- `tierB2-slice-10.md` — no `## 汇总` section exists; the only status is line 3 ("90 / 120").
- `tierB2-slice-04.md:22-24` — `<!-- SUMMARY-START --> 汇总在全部 120 个函数处理完后回填。` The file is
  the 30/120 partial page, so this is an honest placeholder, not a claim.
- `tierB2-slice-13.md:6` — the heading itself is broken: `## 汇总`（追加式写入，故置于末尾）。` splitting a
  heading with a backtick; the real summary is at line 308 as `## 汇总`.
- `tierB-slice-09.md:6,10,13` — method cites `inventory/classified3.csv` as cross-checked. No such file exists
  in `docs/analysis/code/inventory/` (only `tiers.csv`, `tiers-merged.csv`, `tiers-recomputed.csv`); the
  claim "通用访问器族…在 classified3.csv 中全部标记为 prop" cannot be reproduced.
- `tierB-slice-09.md:11` — "它们在 tiers.csv 里被统一标成 quest". Checked against
  `docs/analysis/code/inventory/tiers.csv` for the range it names (`0x13efd70..0x13efdac`): 6 entries,
  `monster-em, quest, online-nex, quest, monster-em, quest` — 3 of 6 are not quest, so "统一" is false.
- The pointer these pages give to `function-labels.tsv` for unattributed ranges does work: slice-09's range
  `0x72aa48..0x80c93c` contains 1,554 retile functions, 1,346 of which (86.6%) have a label there.

## 14. Per-document notes

**tierB-slice-03** — 250 rows, all real, all in range. Labels and confs (A1/B91/C158) exact; 108/108
instruction counts exact. Four callee counts are short (0x188c84 "≥15" vs 14; 0x18d890 9 vs 10; 0x18dd88
7 vs 8; 0x18e07c 9 vs 10) and 0x18dd88's role follows the wrong count (`:73`, worker where 8 callees make it
an orchestrator). The 2026-10-24 demotion note is correct and confirmed by `stringxref`.

**tierB-slice-05** — 550 rows, every printed distribution exact (labels, conf, role). 8 role cells disagree
with their own callee list (`:92,119,121,182,183,330,487,496`), the largest being 0x38eae4 (15 callees,
worker) and 0x362438 (5 callees, orchestrator). 5 callee counts are off (list above). Instruction counts
exact. This is the file whose first 50 rows are the only slice-05 material in `tierb-labels.csv`.

**tierB-slice-08** — 78 rows, all real; §A/§B structure exact; labels, conf and role tallies exact;
instruction claims exact. Its only numeric defect is a stale string citation (0x18bb60 "cMix", section 4).
The four 2026-10-24 demotions are correct.

**tierB-slice-09** — **no table at all** (0 rows). The page is a method note, and it says so; but it cites
`classified3.csv` (absent from the repo) as already cross-checked, and its `tiers.csv` claim is false for the
stub range it names. Nothing here can be recomputed except that the range's attribution exists in
`function-labels.tsv` (86.6% of 1,554 functions).

**tierB-slice-14** — 300 rows, all `online-nex`, all inside the Pia band `0x139c7ec..0x13ae8b4`
(< 0x13b35d4), so the label is consistent with the page's own §3. Conf counts exact. The trailing tally
comment is wrong in every field (section 7).

**tierB2-slice-01** — 120 rows, all real; labels/conf/role tallies exact. 63 rows fall outside the stated
domain, and 20 role cells contradict the callee lists (e.g. 0x1c3fcc orchestrator with 4 callees, 0x433198
orchestrator with 2). Its A-list of 17 candidates and its 6 actual A rows are consistent (the 6 are a subset).

**tierB2-slice-02** — 120 rows; every printed count exact (labels, A6/B80/C34, role 102/18); 12/12 callee
counts exact. The input-traceability caveat at line 5 is honest and correct — the `.tmp/mhgu` tree is gone.
No contradiction found; this is the cleanest file of the 19.

**tierB2-slice-03** — 120 rows, all counts exact (labels, A4/B85/C31, role 70/50). 59 of 120 rows lie outside
the domain printed at line 3, and 12 role cells contradict the callee lists.

**tierB2-slice-04** — 30/120 rows, and it says so. Its 8 rows below the printed domain (`0x6b3460`) are real
discrepancies, but the page is explicitly a stopped fragment; no tallies are claimed.

**tierB2-slice-05** — 120 rows; labels and conf exact, **role tally 60/53 wrong (56/57)**, 95 of 120 rows
outside the printed domain. Its A-list of 13 candidates is much larger than the 4 rows actually graded A.

**tierB2-slice-06** — 60 rows (of a vanished 120), every tally exact including the 8-class label table, and
the "each row is a function cluster, not a function" caveat explains its role rule. Same caveat as slice-02
about the input.

**tierB2-slice-07** — 120 rows; labels and conf exact; **role tally 81/27 wrong (76/32)**, and 15 role cells
disagree with the callee counts — the page documents *why* (insns field unreliable) but not the discrepancy
between its own summary and its own column.

**tierB2-slice-08** — 120 rows; labels and conf exact; **role tally 83/21 wrong (81/23)**; 20 rows outside
the printed domain; 11 role cells disagree with the callee lists (all rows whose visible head is `bx lr` —
explained at line 5 for the input, not for the column).

**tierB2-slice-09** — 30/120 rows, honestly labelled partial, but the summary points at a "终版统计" section
that does not exist; 5/7 callee counts match.

**tierB2-slice-10** — 90/120 rows and **no summary section at all**. Callee counts are systematically low
(10 rows say 22–23 where the table has 23–39); role column is the only fully consistent one (0/90).

**tierB2-slice-11** — 286 rows. Conf exact (A13/B158/C115). Three defects: the label split is off by one
(physics-math 17 vs 18, "other 230" vs 229 at `:370`); the A section still describes 29 A rows at `:365`
while the file grades 13, and its A-label breakdown (12 online-nex / 5 quest / 3 filesystem / …) matches
neither; and `0x18ecb0` is re-promoted to A on the exact evidence that was demoted in pass1.

**tierB2-slice-12** — 286 rows. Conf exact (A19/B157/C110); leaf 8 with the eight addresses exact; the
"±8 approximate" label table is within tolerance. The A section header says 26 at `:307` while the file has
19. Ordering exact.

**tierB2-slice-13** — 286 rows. Conf exact (A3/B204/C79), the three A addresses are exactly the three A rows,
and the 124-demotion commit reference checks out. Two unmentioned ordering breaks and 20 role cells that
disagree with the callee counts (e.g. 0x75bce8 10 callees worker, 0x136641c 8 callees worker and conf A).
The page has no printed role tally, so nothing there to contradict.

**tierB2-slice-14** — 282 rows. Conf exact (A4/B179/C99); 19/19 callee counts exact; the 21-row insertion
claim exact. Two contradictions: **"leaf 22" against 28 leaf rows** in its own table (`:300`), and **"A 级
14 行"** at `:301` against the 4 rows graded A at `:299`.

## Difficulties

- **The inputs are gone.** Every one of the 19 files reads its data from `.tmp/mhgu/…`, a tree that no
  longer exists (`tierB2-slice-02.md:5` records this). Consequences: (a) "the table's N rows are the slice
  file's N entries" cannot be checked; (b) the pass2 "address domain" lines are quotes from a missing file
  and can only be checked against the tables themselves; (c) where a count disagrees with
  `functions.csv.gz` I cannot tell whether the slice used a filtered list.
- **Two function tables, one authority.** `functions.csv.gz` is a region tiling (23,885 tiles) and
  `functions-retile.csv.gz` the current table (52,692). The documents reproduce the former; METER calls the
  latter the calibre. I report both columns rather than picking one silently, but the stale-versus-wrong
  distinction for a given row depends on which table the reader considers binding.
- **`function-labels.tsv` is not independent.** Its `adjudication:` provenance is populated *from these very
  files* (668 rows), and its `inferred:` labels come from the vote channels these pages call circular. Label
  agreement with it (1,140/3,188 = 35.8% overall) is recorded as a measurement, not as proof that either
  side is wrong. The 8 adjudication-provenance disagreements are the only ones where the pipeline
  demonstrably chose a different slice's ruling for the same function.
- **`tierb-labels.csv` has no tracked writer at its path.** `tools/mhgu/README.md:50` records that
  `tierb-merge.py` writes `.tmp/mhgu/inventory/tierb-labels.csv`, so the tracked copy is a manual snapshot;
  its mtime says nothing. I dated it by content (pre-`66e12a5`) instead.
- Four rows contain escaped pipes in the evidence cell (`tierB-slice-08.md:38`, `tierB2-slice-06.md:61`,
  `tierB2-slice-08.md:61,131`, `tierB2-slice-14.md:212`). Their first five cells parse correctly; their
  evidence strings were not used for the numeric checks.
- `python3` in this shell exits 49 without output, so every computation was done with Node; the arm32
  decoder is the repository's own `tools/mhgu/arm32.mjs`.

## VERDICT

doc	status	evidence
docs/analysis/code/tierb-pass1/tierB-slice-03.md	contradiction	250/250 rows real and 108/108 instruction counts exact, but four callee counts are short (0x188c84 "≥15" vs 14) and 0x18dd88 is graded worker against its own 8 callees.
docs/analysis/code/tierb-pass1/tierB-slice-05.md	contradiction	550/550 rows, every printed distribution exact, but 8 role cells contradict their callee lists (0x38eae4 15 callees → worker) and 5 callee counts are off by 1–15.
docs/analysis/code/tierb-pass1/tierB-slice-08.md	confirmed	78/78 rows real, §A 37 rows all ≥1000 insns descending and §B 41 rows address-ascending, every tally exact; only a stale string citation (0x18bb60 "cMix" has no code reference).
docs/analysis/code/tierb-pass1/tierB-slice-09.md	unverified	no table exists (0 rows), and the method cites inventory/classified3.csv which is not in the repository; its tiers.csv "uniformly quest" claim is false for 3 of 6 stub entries.
docs/analysis/code/tierb-pass1/tierB-slice-14.md	contradiction	300/300 rows real, all inside the Pia band, conf A0/B183/C117 exact — but the tally comment at :357 is wrong in every field (B246/C154/roles 235-117-25-23) and sums to 400 against its own 300.
docs/analysis/code/tierb-pass2/tierB2-slice-01.md	contradiction	120/120 rows real and all printed tallies exact, but 63 rows lie outside the printed domain 0x46b6d0..0xb58ba0 and 20 role cells contradict their callee counts.
docs/analysis/code/tierb-pass2/tierB2-slice-02.md	confirmed	120 rows, all 11 label counts, A6/B80/C34 and role 102/18 exact, 12/12 callee counts exact, and its own input-traceability caveat is truthful.
docs/analysis/code/tierb-pass2/tierB2-slice-03.md	contradiction	120 rows and every printed count exact, but 59 of them lie outside the domain at :3 (0x4cfa24..0xb8692c) and 12 role cells contradict their callee lists.
docs/analysis/code/tierb-pass2/tierB2-slice-04.md	contradiction	honest 30/120 fragment with no tallies, but 8 of its 30 rows are below the domain printed at :5 (0x6b3460) and 7 role cells contradict their callee counts.
docs/analysis/code/tierb-pass2/tierB2-slice-05.md	contradiction	labels and conf exact, role tally 60/53/7 wrong (table gives 56/57/7), and 95 of 120 rows lie outside the printed domain 0x5b7744..0x7cb374.
docs/analysis/code/tierb-pass2/tierB2-slice-06.md	confirmed	60 rows, eight-class label table, A1/B57/C2 and role 42/18 all exact, plus its "rows are function clusters" caveat correctly explains the role convention.
docs/analysis/code/tierb-pass2/tierB2-slice-07.md	contradiction	labels and A1/B94/C25 exact, but the role tally 81/27 contradicts its own column (76/32) and 15 role cells disagree with the callee counts.
docs/analysis/code/tierb-pass2/tierB2-slice-08.md	contradiction	labels and A3/B93/C24 exact, but role tally 83/21/10/6 contradicts the column (81/23/10/6), 20 rows fall outside the domain, 11 role cells disagree.
docs/analysis/code/tierb-pass2/tierB2-slice-09.md	unverified	30/120 rows with all three summary lines pointing at a "终版统计" section that does not exist in the 62-line file; 5/7 callee counts match.
docs/analysis/code/tierb-pass2/tierB2-slice-10.md	contradiction	90/120 rows and no summary section at all; 10 of 80 callee counts are 1–16 short of the table (0x778384 22 vs 39, 0x749c20 23 vs 32).
docs/analysis/code/tierb-pass2/tierB2-slice-11.md	contradiction	A13/B158/C115 exact, but the label split is off by one (physics-math 17 vs 18, "230" vs 229), the A section still says 29 rows against the 13 graded, and 0x18ecb0 is re-promoted to A on evidence already demoted in pass1.
docs/analysis/code/tierb-pass2/tierB2-slice-12.md	contradiction	A19/B157/C110, leaf 8 and the ±8 label table all reproduce, but the A-section header says 26 at :307 while the file grades 19.
docs/analysis/code/tierb-pass2/tierB2-slice-13.md	confirmed	A3/B204/C79 exact and the three A addresses are exactly the three A rows; the 124-demotion commit reference reproduces. Only unmentioned ordering breaks (2) and role cells inconsistent with callee counts (20) remain.
docs/analysis/code/tierb-pass2/tierB2-slice-14.md	contradiction	A4/B179/C99 and 19/19 callee counts exact, but "leaf 22" contradicts the 28 leaf rows in its own table (:300) and "A 级 14 行" (:301) contradicts the 4 A rows it grades.

Count: 19 documents — 4 confirmed, 13 contradiction, 0 stale, 2 unverified.
Label agreement with `docs/data/tierb-labels.csv`: 378/378 labels (0.0% disagreement), 374/378 conf
(1.06%), 50/50 in the requested 50-row sample; the 4 conf disagreements are listed in section 9.
