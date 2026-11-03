# Link audit — code-inventory docs ↔ the files they describe

Scope: `docs/analysis/code/inventory/README.md`, `RETILE.md`, `sources.json` and the 24 `attr-*.tsv` it lists;
plus the METER.md sections that define file roles and conf semantics (`证据渠道与当前产出（conf=A 才计入种子）`,
`降级行会不会把"猜的标签"算成已归属`). Not a re-audit of METER's coverage numbers.

All commands were run from `G:/omp works/MHGU`. The repository was treated as read-only: `recompute.mjs` is the one
documented step that writes a tracked file, so it was run with `--out G:/tmp/link-inventory/tiers-merged.check.csv`
and the result was then compared with `cmp` against the committed spine (identical, see R8).

Gate baseline (`node tools/audit/check.mjs`, 2.5 s):

```
PASS coverage meter: 52692 functions / 5228277 instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 7 site(s)
ALL PASS
```

## CONFIRMED — claim, where stated, command, output

Every claim below was recomputed from the artefact, not read back from another document.

| # | Claim | Where stated | Command | Actual value | Verdict |
|---|---|---|---|---|---|
| R1 | `sources.json` is the adopted-source list; 24 files, all present, non-empty | README:29, METER:31 | loop over `sources.json`: `wc -c`, `head -1` | 24/24 exist, 935 B – 1.0 MB, none empty | CONFIRMED |
| R2 | listed files have header `start / label / conf / evidence` | README:32 | `head -1` on all 24 | 24/24 byte-identical 4-column header | CONFIRMED |
| R3 | every row parses: 4 tab columns, `0x` lowercase-hex start, non-empty label/evidence | README:32 | awk `NF!=4`, `$1!~/^0x[0-9a-f]+$/`, `$2==""`, `$4==""` | 0 offending rows of 53,614 | CONFIRMED |
| R4 | conf is one of A/B/V/S, nothing else | README:32 | awk `$3` tabulation per file | 0 other values in all 24 files (Table 2) | CONFIRMED |
| R5 | B is a suggestion, never counted | README:32; METER:1074-1078 | awk `$3=="B"` + recompute | 6,235 B rows in 3 files; every one rejected | CONFIRMED |
| R6 | METER's quoted counter line | METER:1078 | recompute with the documented seed expansion | `seed file attr-vtable-fixed.tsv: accepted 2799, rejected conf-B 2389` (exact) | CONFIRMED |
| R7 | V and S rows never seed either | README:32; METER:248 heading | same run | `accepted 0` on all ten pure-V/S files (194 / 864 / 5,181 / 10,800 / 3,067 / 52 / 28 / 711 / 425 / 1,107 rows) | CONFIRMED |
| R8 | the documented recompute reproduces the committed spine | README:50 | `recompute.mjs --functions … $(…sources.json…--seed…) --out …`; `cmp` | byte-identical to `tiers-merged.csv`; `A 26057 (58.1% insns), B 11412, C 15223` | CONFIRMED |
| R9 | project calibre 58.0% = Tier A + Tier B conf=A | METER:4 | `node tools/mhgu/coverage/canonical-metric.mjs` | `Tier A verified 25584 … Tier B conf=A 74 … 58.0%`; raw spine 26,057 carries 473 refuted | CONFIRMED |
| R10 | `function-labels.tsv` = 5 columns, 5 provenance classes | README:17,19 | `head -1` + awk `$4` | 40,374 rows; exactly `evidence:` / `inferred:` / `signature:` / `spread:` / `adjudication:` | CONFIRMED |
| R11 | A-direct is the set of conf-A evidence rows | README:19; coverage-report.tsv | awk sum of `evidence:` rows | 13,061 = `A-direct (evidence row) 13061` exactly | CONFIRMED |
| R12 | priority A > V > S > spine > adjudication | README:19 | `function-labels.mjs:59-63` | first-match chain in that order; B has rank 0 and can never win | CONFIRMED |
| R13 | adjudication is excluded from the ≥90% bucket | README:19 | `report.mjs:274` (`fromSpine !== false`) + arithmetic | 67 adjudication rows carry online-nex/weapon-wp; `partition: spread validated labels` = 2,401 = 2,402 spine rows − 1 overridden (`0x13c5ce0`) | CONFIRMED |
| R14 | `reason` is the channel's verbatim sentence, findable by `start` | README:20 | node join of all 25,786 evidence/inferred/signature rows against the named file | 25,786/25,786 exact matches on (label, evidence) | CONFIRMED |
| R15 | 12,318 unlabelled functions = 23.4% functions / 10.0% instructions | README:21 | node over `functions-retile` − `function-labels` | 52,692 − 40,374 = 12,318; 23.38%; 524,143 / 5,228,277 = 10.03%; report row identical | CONFIRMED |
| R16 | `tiers-merged.csv` columns `start,insns,tier,label,src` | README:33 | `head -1`, awk | exact header; 52,692 rows; tier A 26,057 / B 11,412 / C 15,223 | CONFIRMED |
| R17 | `demote-*.tsv` is part of the calculation | README:34 | recompute output | `demoted starts: 1644` (3 `demote-*` + `pins.tsv`) | CONFIRMED |
| R18 | `coverage-report.tsv` is a generated, self-consistent table | README:35 | `cat`; gate 8 | denominator 52,692 / 5,228,277; six `partition:` rows sum to 100%; independent recomputation 66.19% | CONFIRMED |
| R19 | `attr-offsets.tsv`: one offset only for <200-instruction functions | README:31 | `offset-seeds.mjs:80` (`if (top[0][1] < 2 && f.n >= 200) continue;`) + awk of 28 rows | 26 single-offset rows, max 186 insns; the only 2-offset rows are 1,463 and 6,042 insns | CONFIRMED |
| R20 | `attr-tableseeds.tsv` only inherits from tables with ≥2 labelled members | README:30 | `grep -o '[0-9]* labelled member'` | 0 rows citing 1 member; minimum 2 (890 rows), maximum 62 | CONFIRMED |
| R21 | cross-channel label conflict ≈2.7% | README:44 | node over the 24 adopted files | 349/13,061 = 2.67% | CONFIRMED |
| R22 | 46,087 `push {…,lr}` prologues | RETILE:3,12 | word scan of `main.140.flat.bin` (`(w>>>16)==0xe92d && w&0x4000`) | 46,087 | CONFIRMED |
| R23 | 52,692 functions | RETILE:11 | gunzip + parse `functions-retile.csv.gz` | 52,692 rows, all parse | CONFIRMED |
| R24 | instruction sum 5,228,277 in both tables | RETILE:14 | sum column 3 | 5,228,277 = 5,228,277 | CONFIRMED |
| R25 | string-bearing functions 1,937 in both tables | RETILE:15 | count non-empty strings column | 1,937 = 1,937 | CONFIRMED |
| R26 | 23,195 BL/BLX dedup targets (guard ≈23,336) | RETILE:6,13 | BL decode over `.text` | 23,195; guard margin \|23,195−23,336\| = 141 < 200 (`retile.mjs:61`) | CONFIRMED |
| R27 | every old region start survives | RETILE:6 | node set difference | 23,885/23,885 kept; 17 new starts come only from old pointer discovery | CONFIRMED |
| R28 | "24 files, 46,858 evidence rows" | METER:39 | node over `sources.json` | 53,614 total − 6,235 B − 521 `unknown` = 46,858 | CONFIRMED |
| R29 | `c[2]` is the instruction count | README:42 | header + sum | `start,end,insns,callers,callees,strings` | CONFIRMED |
| R30 | the function tables are gzip | README:39 | `file` | `gzip compressed data` for both `functions*.csv.gz` | CONFIRMED |

### Table 2 — per-file rows and conf distribution (the tabulation R1–R7 rest on)

`awk -F'\t' 'NR>1{c[$3]++; n++} END{…}'` over each file named by `sources.json`:

| file | rows | A | V | S | B |
|---|---:|---:|---:|---:|---:|
| attr-xref.tsv | 676 | 676 | 0 | 0 | 0 |
| attr-prefix.tsv | 2,140 | 2,140 | 0 | 0 | 0 |
| attr-vtable-fixed.tsv | 5,217 | 2,828 | 0 | 0 | 2,389 |
| attr-vtable-ns.tsv | 1,305 | 1,305 | 0 | 0 | 0 |
| attr-vtable-rtti2.tsv | 1,673 | 1,673 | 0 | 0 | 0 |
| attr-vtable-unknown.tsv | 3,824 | 3,824 | 0 | 0 | 0 |
| attr-vtable-classconsensus.tsv | 9 | 9 | 0 | 0 | 0 |
| attr-strings2.tsv | 444 | 444 | 0 | 0 | 0 |
| attr-blocks.tsv | 2,225 | 2,225 | 0 | 0 | 0 |
| attr-registrar.tsv | 843 | 843 | 0 | 0 | 0 |
| attr-uifamily.tsv | 2,289 | 1,772 | 0 | 0 | 517 |
| attr-class.tsv | 5,642 | 2,313 | 0 | 0 | 3,329 |
| attr-class2.tsv | 3,059 | 3,059 | 0 | 0 | 0 |
| attr-classvote.tsv | 194 | 0 | 194 | 0 | 0 |
| attr-callervote.tsv | 864 | 0 | 864 | 0 | 0 |
| attr-callvote.tsv | 5,181 | 0 | 5,181 | 0 | 0 |
| attr-immscan.tsv | 3,067 | 0 | 0 | 3,067 | 0 |
| attr-callvote1.tsv | 10,800 | 0 | 10,800 | 0 | 0 |
| attr-offsetpairs.tsv | 52 | 0 | 52 | 0 | 0 |
| attr-offsets.tsv | 28 | 0 | 28 | 0 | 0 |
| attr-dualpredict.tsv | 711 | 0 | 711 | 0 | 0 |
| attr-classsingle.tsv | 425 | 0 | 425 | 0 | 0 |
| attr-tableseeds.tsv | 1,107 | 0 | 1,107 | 0 | 0 |
| attr-fingerprint.tsv | 1,839 | 1,839 | 0 | 0 | 0 |
| **total** | **53,614** | **24,950** | **19,362** | **3,067** | **6,235** |

Sample rows (3 per file) were read for all 24; two representative ones:

- `attr-vtable-fixed.tsv`: `0x690  kernel-os  A  MtArray registrar 0x7cb8c8 vtable 0x1786fd0 slot 0 …` and
  `0x5bd8  quest  B  aQuest registrar 0x8674 … [class not covered by any rule; label demoted to B]` — the A/B split
  is visible in the evidence text itself, exactly as METER:1074 describes.
- `attr-classvote.tsv`: `0xe14  monster-em  V  class vote: rAngleLimitData has 3/3 evidence-bearing members labelled …`.

## CONTRADICTION — same fact stated differently: both file:line, both values, and which side the artifact supports

### C1 — "22,202 prologues are not region starts" vs 28,807

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| of 46,087 prologues, **22,202** are not region starts | RETILE.md:4 (generated by `retile.mjs:109`, expression `prologues.size - keptOld`) | word scan of the image + old-start set | **28,807** prologues are not old region starts (46,087 − 17,280 overlapping) | CONTRADICTION |

The artefact, `retile.mjs`'s own header comment (`tools/mhgu/coverage/retile.mjs:5`: "28,807 of them are not region
starts"), METER.md:188 and DEVLOG.md:948 all say 28,807. RETILE's number is the *region count* subtracted from the
*prologue count* (46,087 − 23,885), i.e. it counts regions that have no prologue at all rather than prologues that are
not region starts. Because `RETILE.md` is written by the same script on every run, the wrong number is regenerated
automatically; the file's opening paragraph — the argument for retiling — is the one place that must not be wrong.
(This is the failure mode the project documents: a hand-style arithmetic result that no gate reads back.)

### C2 — string inheritance is described as containment, implemented as exact-start equality

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| the strings column is inherited "by which old region the new start falls in" | RETILE.md:7 | node: apply containment rule vs `retile.mjs:90` rule | containment ⇒ **12,103** string-bearing functions; exact-start equality ⇒ **1,937** (the file's value and the script's guard) | CONTRADICTION |

`retile.mjs` only lends a region's strings to the sub-function that starts *exactly* at the old region start (its own
comment: the loose rule gives 12,103). A maintainer re-implementing the documented rule gets 12,103 and `retile.mjs`
aborts on its `|withStrings−1937|>5` guard. The numbers in RETILE.md are right; the procedure sentence is not.
Related, minor: 22 of the 23,885 shared starts have different string text in old vs new, because `retile.mjs:101`
rewrites `"` to `'` for CSV safety — inheritance is otherwise byte-preserving.

### C3 — README says 1-member pointer tables are used; the file contains none

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| tables with "1 labelled member 94.1%/CP95 92.5" are inherited | README.md:30 | `grep -o '[0-9]* labelled member' attr-tableseeds.tsv` | **0** rows cite 1 member; min 2 (890 rows), max 62 | CONTRADICTION |

METER.md:455 records the tightening: the loose rule produced 3,892 rows, the adopted rule produces **1,107** rows and
"跳过混合表 29 张、**单成员表 791 张**". README kept the 94.1% measurement of the class that is now skipped, without
saying it is skipped, so a reader concludes the opposite of what the file does.

### C4 — `attr-*.tsv` is documented as one shape; four files have another

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| `attr-*.tsv` = `start / label / conf / evidence` | README.md:32 | header scan of all 40 `attr-*.tsv` | 36 conform; 4 do not: `attr-callvote-rounds.tsv` (`round fold_tested fold_correct precision rows_added`), `attr-fingerprint-score.tsv`, `attr-immscan-score.tsv`, `attr-vtable-classconsensus-sheet.tsv` | CONTRADICTION |

The four are deliberate measurement sheets (and none is in `sources.json`), but the README's wildcard is the sentence a
reader uses to decide "can I parse this with cut -f1-4"; it is false for 10% of the files it names. Worth one clause:
"score/round sheets excepted (`*-score.tsv`, `*-rounds.tsv`, `*-sheet.tsv`)".

### C5 — METER's per-channel row counts: 4 rows do not match the files

| channel row | METER line | file | rows | unique starts | verdict |
|---|---|---:|---:|---:|---|
| 类前缀表 **587** | METER:264 | attr-prefix.tsv | 2,140 (1,619 with a taxonomy label) | 1,100 | CONTRADICTION |
| UI 家族 **551** | METER:265 | attr-uifamily.tsv | 2,289 (1,772 A + 517 B) | 2,289 | CONTRADICTION |
| 字符串词表 **423** | METER:266 | attr-strings2.tsv | 444 | 444 | CONTRADICTION |
| 注册器名 **162** | METER:267 | attr-registrar.tsv | 843 | 843 | CONTRADICTION |

The other twelve rows of that table match their files exactly (5,217 / 1,673 / 2,225 / 2,313 / 3,824 / 1,839 / 3,067 /
9 / 194 / 3,059 / 676 / 1,305). METER:272 defines the column as "带真实标签的行数（`unknown` 不计）", which does not
reconcile any of the four (prefix would be 1,619, the others have no `unknown` rows at all). README:13 already calls
this table a **snapshot**, so the README statement is honest; the contradiction is between the table and the files it
claims to count, and it is aggravated by METER:272's claim that the table was "按现有文件逐行核对过一次" on
2026-11-04 while naming only three corrected rows.

### C6 — "five provenance classes correspond to the report's partition order"

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| provenance's five classes map onto the report's partition order | README.md:19 | `cat coverage-report.tsv` + node arithmetic | the report has no adjudication partition; the 668 adjudication-labelled functions are counted inside `partition: spread unvalidated` (12,187 = 11,518 spine + 668 adjudication + 1 overridden) | CONTRADICTION |

Four of the five (evidence/inferred/signature/spread) are partitions; adjudication is not. The operational half of the
sentence (adjudication is not in the ≥90% bucket) is true and verified in R13; only the "correspondence" is wrong.

### C7 — "the report only counts files in the list" vs two aggregate rows that read by filename

| claim | file:line | command | actual | verdict |
|---|---|---|---|---|
| `sources.json` is the only list; the report counts only listed files | README.md:29; METER:421 ("V/S 两类都统一从 `sources.json` 读，不再依赖文件名") | grep `report.mjs` | `report.mjs:164,173` glob `^attr-.*vote\d*\.tsv$` for the **A-inferred** line; `report.mjs:193` hardcodes `attr-immscan.tsv` for the **A-signature** line | CONTRADICTION |

The *partition* rows do honour the list (`direct` at 141-149, `Sset` 212-224, `Vset` 226-236 all read
`sources.json`), and today every file matching the glob is listed, so the published numbers agree. But the stated
invariant is not enforced: a new channel named `attr-foovote.tsv` would move the "A-inferred" line without being
listed, and renaming `attr-immscan.tsv` would silently zero the "A-signature" line (2,496 functions / 5.0%) — the
exact "通道产出无人计数" class of failure the README cites as the reason the list exists.

> **2026-11-04 处置（已落地）**：`report.mjs` 改为显式 `VOTE_FILES` / `SIG_FILES` 名单，并每次运行检查 `sources.json` 里带 conf=V/S 却未分类的文件（当前打印 5 张）。另：上面那句里的 2,496 本身也是错的——该行按**签名行数**而非函数数计，去重后是 **1,511 函数 / 146,378 指令 / 2.8%**。

## STALE — number that was true earlier; what superseded it if the repo says

### S1 — `cov-report.tsv` does not exist and never did

README.md:35 lists `cov-report.tsv` / `coverage-report.tsv` as generated artefacts to read. `ls` finds only
`coverage-report.tsv`; `grep -rn "cov-report"` over docs/tools/JSON returns exactly one hit (README.md:35);
`git log --all -- docs/analysis/code/inventory/cov-report.tsv` is empty, so the name never existed in history.
Superseded by `coverage-report.tsv` (written by `report.mjs:19`). Dangling reference, no numeric effect.

### S2 — the function-form distribution is a snapshot of the 13,816-function bucket

METER:559 and METER:576 both say the unlabelled bucket is **13,816** functions and "10.6%", and the 12-row table at
METER:563-574 sums to exactly 13,816. Current artefacts: `function-forms.tsv` has 52,692 rows with **12,318** empty
`subsystem`, `coverage-report.tsv` says `partition: no label 12318 … 10.0%`, README:21 says 12,318. Every row of the
table is stale, not just the total (dispatch 1,200→952, stub 940→828, accessor 498→393, orchestrator 449→397,
tail-jump 147→94, thunk 89→64). Superseded by the 12,318 figure; the form table needs regeneration from the current
`function-forms.tsv`.

### S3 — "the channel table was checked line by line against the current files"

METER:272 states the table was re-checked against the current files on 2026-11-04, with only three rows corrected.
C5 shows four further rows that do not match. The sentence overstates the verification; the table is still a snapshot
(as README:13 says), not a live count.

## UNVERIFIED — load-bearing claims that cannot be checked with available tools, and why

- **U1 — 68,626 vtable slots / 62,787 unassignable** (RETILE.md:4, METER:188, DEVLOG:948). The components
  `9,602 + 54,053 + 4,971` and `9,561 + 48,821 + 4,405` appear only in `attr-vtable.md:19,21`; no committed script
  recomputes them (`vtable-probe.mjs` prints nothing of the kind), and `inventory/vtables-slots.tsv` is a different,
  much smaller enumeration (2,561 slots from the rodata RTTI scan). Reproducing it needs the class-inventory + RTTI scan.
  Second reason it is stale: it is a property of the *old* 23,885-start table, and nothing re-measures how many of the
  62,787 targets became starts after retiling added 28,807 of them.
- **U2 — RETILE.md:21 "PrecisionB 抽 160 行…71 行…最多短 2,223…12 行≤4"**. No `PrecisionB` artefact exists in the repo
  (only RETILE.md and `stringxref.tsv` mention the name); the sample cannot be re-derived.
- **U3 — RETILE.md:22 reverted experiment (102,945 starts, 29-instruction deviation)**. No artefact; the code path was
  removed, so the number cannot be reproduced without rebuilding it.
- **U4 — METER:372's exact conflict count (356 of 13,060)**. Recomputing "functions given different labels by two or
  more adopted channels" gives **349 of 13,061** (2.67%). The 3–7 row gap depends on a counting rule METER does not
  state (whether label `unknown`, B rows and duplicate starts are folded), so the exact figure cannot be settled;
  README's "约 2.7%" holds either way.
- **U5 — `offset-seeds.mjs:60`'s "two or more 99.4% (CP95 99.1)"** vs METER:429's 93.6% for the same 2+-offset cell.
  Only METER's number is quoted by README (R19 holds); the 99.4% has no retained measurement behind it. Not resolvable
  from the repo, and the two cannot both be the measured precision of the same rule.

## Difficulties — obstacles, what you tried, cost in tool calls, suspected cause (tool bug, missing doc, ambiguous premise, genuinely hard). Write `none` if none.

- **`recompute.mjs`'s "rejected conf-B" counter is not counting B.** `rejConf` increments for every non-A row
  (`recompute.mjs:66`), so the label is wrong for V and S rows. Current corpus: 28,664 non-A rows of which only 6,235
  are B; the other 22,429 (V/S) are printed as "conf-B". METER:1078's quoted line happens to be safe because
  `attr-vtable-fixed.tsv` contains nothing but A and B, but the per-file lines cannot be used to prove "B rejected"
  without knowing the file's B count independently. Fix: rename to `rejected non-A (V/S/B)` and split the counters.
- **`pins.tsv` is undocumented.** Both `recompute.mjs:78` (`^(demote-.*|pins)\.tsv$`) and `report.mjs:81` read it as a
  permanent demotion; README's file-role table does not mention it and `grep -c "pins.tsv" METER.md` is 0. Four rows,
  no numeric effect today (the pins are tier C, per `report.mjs`'s own comment), but it is a file that removes labels
  from the pipeline with no entry in the documentation that claims to describe every file's role.
- **Two mechanisms for `unknown` labels.** 521 rows of `attr-prefix.tsv` carry `label=unknown`; `taxonomy.mjs`'s
  `LABELS` has no `unknown`, so `recompute.mjs:65` classifies them as `rejected bad label`, while `report.mjs:148` and
  `check-artifacts.mjs:43` skip them with an explicit `label !== "unknown"` test. Same outcome, different reasons —
  and the printed reason ("bad label") is misleading for a legal sentinel.
- **A comment that contradicts the next line.** `report.mjs:210-212` says the signature channel is now read from
  `sources.json` "like every other channel: it used to be a hardcoded path", and `report.mjs:193` two lines below still
  opens `path.join(INV, "attr-immscan.tsv")`. This cost most of the time spent on C7; it is the reason I checked the
  three consumers separately instead of trusting the comment.
- **`report.mjs` cannot be run read-only** (it rewrites `coverage-report.tsv`), so its output was verified indirectly:
  gate 8's independent recomputation (66.19%), `canonical-metric.mjs` (58.0% with the 473-row note), and arithmetic
  closure of the partition against `function-labels.tsv` (25,786 labelled; 2,401/12,187 split reproducible to ±1 row,
  the one row being `0x13c5ce0`, a tier-B `online-nex` overridden by an adjudication conf-A `kernel-os`).
- Cost: ~45 tool calls. The expensive steps were the two full-image scans (prologues + BL targets, ~25 s each in node)
  and `recompute.mjs` (3.5 s). No tool bug encountered; the one failed command was my own `--out /g/tmp/...` path
  resolving to `G:\g\tmp\...` under node's win32 `path.resolve`, not a repository defect.
- **METER.md changed under the audit.** While this audit ran, another writer edited `docs/analysis/code/coverage/METER.md`
  (Tier A precision section, +24 lines) and `HANDOFF.md`; `git status` shows both modified and neither is this audit's
  output. Two citation anchors moved (557→559, 1064/1068→1074/1078). All citations above were re-anchored against the
  post-edit file, and each one quotes the sentence it points at, so later drift is detectable by grep rather than by
  trusting a line number.
