# W6 — inventory / coverage / batchA number audit

Date: 2026-11-04. Scope: the 18 markdown documents named in the ticket —
`docs/analysis/code/inventory/{README,RETILE,labels-summary}.md`, the six
`docs/analysis/code/inventory/bsamples/verdict-*.md`, the eight
`docs/analysis/code/coverage/*.md`, and `docs/analysis/code/batchA-classname-xref.md`.

Method: every headline number was recomputed from the artefact the document names
(function table, evidence TSV, image bytes, or the script the document tells the reader to run).
Where a document names a command, the command was run; where the document names only an
artefact, a read-only query over that artefact was written. Read-only: the reviewed documents
were not edited. Tools that write into tracked paths were run in a scratch copy of the repo
(`G:/tmp/W6/repo`, 65 MB: `tools/`, `docs/analysis/code/`, `functions-retile.csv.gz`,
`functions.csv.gz`, `class-inventory.tsv`, `main.140.flat.bin`); the few scripts with a
hardcoded output path (`ctor-vtable.mjs`, `function-labels.mjs`) were checked afterwards with
`git status` — the tracked files are byte-identical to HEAD.

Concurrent edit: while this report was being written, another pass added a two-line banner to
`coverage/METER.md` (the 人工裁定语料 section, about `tierb-gen.mjs` truncating callee lists). All
METER figures below were read from the committed version (`git` blob `4272f6a`); the added banner
does not touch any number audited here. The same applies to other passes editing docs outside
this scope while the audit ran — their changes are not mine.

## 0. Gate

```
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 25 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): docs/analysis/audit/LINK-DATA-SIDE.md, docs/analysis/audit/LINK-INVENTORY.md, docs/analysis/audit/LINK-MECHANICS-CODE.md
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

The gate does not read the documents in my scope except METER's header and the slices, so a PASS
is not evidence that the numbers below are right; it is the baseline that the two headline
figures pass.

## 1. The two headline calibres

| claim (METER header, check gate 8/9) | command | output | verdict |
|---|---|---|---|
| denominator 52,692 functions / 5,228,277 instructions | `node -e` decompress `docs/data/functions-retile.csv.gz`, sum column 3 | `functions 52692 insns 5228277 withString 1937` | agree |
| project calibre 58.0% (Tier A 57.7% + Tier B conf=A 0.3%) | `node tools/mhgu/coverage/canonical-metric.mjs` | `Tier A verified 25584 functions, 57.7% … Tier B conf=A 74 functions, 0.3% … canonical total 58.0%` | agree |
| ≥90% precision calibre 66.2% / 53.5% | `node tools/mhgu/coverage/independent-coverage.mjs` | `covered at >=90% independently: 3460532 = 66.19% of instructions` + `PASS independent recomputation reproduces the report partition` | agree |
| 90.0% / 76.6% pooled; 75.0%–82.5% expected; 10.0% / 23.4% unlabelled | `node tools/mhgu/coverage/report.mjs` in scratch, diff against committed `coverage-report.tsv` | `IDENTICAL` | agree |
| 40,374 labelled / 12,318 unlabelled, five provenance classes | `node tools/mhgu/coverage/function-labels.mjs`; count `function-labels.tsv` | `wrote …: 40374 labelled functions of 52692`; `rows 40374 {spread:13920, inferred:11250, evidence:13061, adjudication:668, signature:1475}` | agree |
| 24 sources / 46,858 evidence rows | `node tools/audit/check.mjs` | `PASS evidence tables: 24 files, 46858 rows, 25786 functions`; `sources.json` has 24 entries | agree |

The two public calibres are exactly reproducible from committed inputs. `report.mjs`,
`function-labels.mjs`, `labels-summary.mjs` and `retile.mjs` each regenerate their tracked output
byte-for-byte (see §3, RETILE).

## 2. Per-document claims

The table uses `agree` = the document's number is what the named artefact/command yields now;
`disagree` = a checkable number that no longer matches; `unverified` = no committed artefact or
command can settle it (reason given in the notes). Superseded sections that the document itself
marks "作废/勿引用/old" are not counted against it; they are listed separately in §4.

### 2.1 `coverage/METER.md` (the number authority)

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| M1 | header: 66.2 / 53.5 / 90.0 / 76.6 / 75.0 / 82.5 / 10.0 / 23.4 | `coverage-report.tsv`; check.mjs gate | PASS line above | agree |
| M2 | 58.0%, old 58.4%; 473 refuted functions excluded; raw spine 58.1% | `canonical-metric.mjs` | `58.0%`; `raw spine tier A would be 26057 functions / 58.1% -- it still carries the label of 473 functions a recorded review refuted` | agree |
| M3 | 18 pipeline scripts: 5 `[IMG]`, 13 table-only | grep each of the 18 named scripts for `FLAT|arm32|flat.bin` | 5 IMG (`retile stringxref fingerprints vtable-scan immscan`), 13 table-only | agree |
| M4 | gate 5: 24 sources, 46,858 rows; gate 6: 22,957/22,957 + 4,479 + 2,731 = 30,167; gate 7: 16,844/16,845 | `SAMPLE=100000 node tools/mhgu/coverage/verify-evidence.mjs`; `node …/verify-inferred.mjs` | `total 22957/22957 = 100.0%`; `split 22957 checked + 4479 unverifiable + 2731 unparsed = 30167`; `total 16844/16845 = 99.99% … FAIL: 0xfa5aa8` | agree |
| M5 | A-direct 13,061 / 1,248,279 / 23.9%; A-inferred 10,138 / 1,832,618 / 35.1%; A-signature 1,511 / 146,378 / 2.8% | `coverage-report.tsv` | exact same three rows | agree |
| M6 | partition 23.9 + 36.3 + 2.8 + 3.3 + 23.8 + 10.0; 1,112 fn / 64,160 insns gap between A-inferred and `inferred only` | `coverage-report.tsv`; arithmetic | rows present; 11,250−10,138=1,112; 1,896,778−1,832,618=64,160 | agree |
| M7 | spread precision 72.4% (CP95 71.3), per-label 5.5–99.8 | `node tools/mhgu/coverage/spread-precision-independent.mjs` | `5144/7106 = 72.4% CP95 71.3` + every label identical | agree |
| M8 | spread ceiling by vote count: 1 → 71.0%, 2 → 77.7%, 3 → 73.8%, 4–5 → 76.7%, 6–7 → 75.4%, 8+ → 78.1% | same script | prints only `votes 3+: 752/990 = 76.0%`; the 3/4–5/6–7/8+ split is not printed by any committed script | unverified (buckets; the 1/2 rows agree) |
| M9 | random-holdout Tier A: 78.5% / 83.6% / 78.3%, CP95 77.8; conditional precision 93.7% | `node tools/mhgu/coverage/canonical-holdout-random.mjs` | `withheld 5007/5098/5009/4876/5133`; `label match 19726/25123 = 78.5%`; `came back as tier A 21004 = 83.6%`; `tier A AND label match 19676 = 78.3% CP95 77.8%`; 19,676/21,004 = 93.7% | agree |
| M10 | spread random-holdout 88.4% (CP95 87.1) | `node tools/mhgu/coverage/spread-random-holdout.mjs` | `2139/2419 = 88.4% CP95 87.1%` | agree |
| M11 | string-consensus threshold table (≥1 … ≥12) and per-label table | `node tools/mhgu/coverage/string-consensus-holdout.mjs` | `>= 1 1447/1997 72.5 70.5`, … `>= 5 891/911 97.8 96.6`, …; per-label `monster 688/688`, `online 215/216`, `render 40/66 60.6`, `kernel 5/24` | agree |
| M12 | spread × string: 36 rows, 36 correct, 0 disagreements | `node tools/mhgu/coverage/spread-x-string.mjs` | `spread AND string consensus agreeing: 36/36 = 100.0% CP95 90.4`; `cases where the two rules disagree: 0` | agree |
| M13 | 462 consistent rows reachable through the call graph: 64/66 sampled, mean 2.1 hops | `node tools/mhgu/coverage/string-spread-reach.mjs` | `rows: 462, sampled 66`; `reachable … 64, no path: 2`; `mean shortest hop count … 2.1` | agree |
| M14 | duplicate-code channel: 49,315 shapes; 85.5% / 92.2%; 326 unlabelled / 3,048 insns / 0.06%; confirms 39 vs contradicts 52 | `node tools/mhgu/coverage/dup-channel.mjs` | identical line by line | agree |
| M15 | dispatch-signature: 11,167 signatures, 669 groups, 452/741 = 61.0% CP95 57.4 | `node tools/mhgu/coverage/dispatch-signature.mjs` | identical | agree |
| M16 | class-single-anchor: 252/252 (98.5), 343/343 (98.9) | `node tools/mhgu/coverage/class-single-anchor.mjs` | identical | agree |
| M17 | dual-predict: window 8 36/39 (79.7), 20 100/103 (91.8), 40 221/224 (96.1) | `LOCAL=20/40 node …/dual-predict.mjs` | `100/103 = 97.1% CP95 91.8`; `221/224 = 98.7% CP95 96.1` | agree (table column is CP95) |
| M18 | table-consensus: 1 → 1,063/1,130 94.1/92.5; 2 → 1,032/1,052 98.1/97.1; 3 → 450/459; 4 → 136/136; 5+ → 174/179 97.2/93.6; mixed 2,311/5,120 45.1/43.8 | `node tools/mhgu/coverage/table-consensus.mjs` | all rows identical except mixed: `2312/5121 45.1% 43.8%` | disagree (one member; ratio unchanged) |
| M19 | offset pairs: 131,047 candidates; 36.7/59.0/84.0/94.6 at CP95 33.3/56.4/82.7/93.9 | `node tools/mhgu/coverage/offset-pairs.mjs` | `common offsets 527; pairs 131047`; exactly those four rows | agree |
| M20 | single offsets: 1 → 91.1 (90.2) pooled, big 86.0 (84.2), small 93.6 (92.7); 2+ → 99.4/99.6/99.2 | `node tools/mhgu/coverage/offset-signature.mjs` | `1|big 1343/1549 = 86.7% 84.9`; `1|small 2895/3036 = 95.4% 94.5`; `2+|big 99.6 99.2`; `2+|small 99.2 98.7` (pooled 1 = 4,238/4,585 = 92.4%) | disagree (1-offset row moved by 0.7–1.8 pts; conclusion unchanged) |
| M21 | small-sample purity: 1–7 pure = 60.6/77.6/90.4/75.6/90.8/93.4/95.0 | `node tools/mhgu/coverage/small-sample-purity.mjs` | identical, including CP95 89.5 / 92.1 / 93.9 | agree |
| M22 | 5,217 vtable rows all satisfy `word[V+4·slot]==start`; 13,577 retile rows do too | read `main.140.flat.bin` at `V+4*slot` for every row | 5,217/5,217 and 13,577/13,577; 0 mismatches | agree |
| M23 | 1,044 retile A rows (45,113 insns, 785 unlabelled) have no source outside that table | set difference retile A vs all source A rows; join function table/labels | `1044`, `45113`, `785` | agree |
| M24 | conflict table: 356 functions (2.7%) with ≥2 labels; row split 148+37+21+21+21+108 | recompute over the 24 sources, conf A, label ≠ unknown | `A-direct starts 13061 with >=2 distinct labels 346 (2.65%)` | disagree (346 vs 356; table sums to 356) |
| M25 | unlabelled bucket: 12,318 / 524,143; median 19, p90 85; ≥100 → 1,002 / 254,129 (48%); 958 with a string (7.8%) / 124,509 (2.38%) | function table + `function-forms.tsv` + `stringxref.tsv` | all six numbers exact | agree |
| M26 | 8,360 retile B rows = 10.8% of instructions; all `unknown` | count retile rows | `B 8360`, insns 564,728 = 10.80% | agree |
| M27 | ctor-vtable: 6,104 known vtables (5,531 named), 17 constructors, 2/5 correct, 1 new | union of `attr-vtable*.tsv`; `node …/ctor-vtable.mjs` | union = **6,095** vtables; script prints `vtables with a single known class: 2373`, `9201 stored to [rN+0], 0 matched a known vtable`, and writes a header-only TSV | disagree / unverified (6,104→6,095; 17/2/1 not printed) |
| M28 | first string scan: 2,380 functions / 4,252 refs / 3,214 strings | `stringxref.tsv` | rows 16,998; functions 5,043; distinct strings 11,831 | disagree (stale; later section uses 5,043) |
| M29 | channel table rows: vtable 5,217; RTTI 1,673; blocks 2,225; class id 2,313; unknown 3,824; fingerprint 1,839; immscan 3,067; consensus 9; classvote 194; class family 3,059; xref 676; prefix 587; uifamily 551; strings 423; registrar 162; RTTI ns 1,305 | count each named TSV (conf A, label ≠ unknown) | 5,217 / 1,673 / 2,225 / 2,313 / 3,824 / 1,839 / 3,067 / 9 / 194 / 3,059 / 676 / **900 distinct starts, 2,140 A rows** / **2,289 A** / **444 A** / **843 A** / 1,305 | disagree (4 rows; see note) |
| M30 | `attr-vtable-retile.tsv` not in `sources.json`; 13,577 rows, 0 duplicate (vtable,slot) | `sources.json`; parse (vtable,slot) pairs | absent from the 24; 13,577 unique pairs | agree |
| M31 | `attr-uifamily`: 1,772 rows = 429 `ctor:` + 1,145 `slot:` + 715 other | parse A rows | A rows 1,772 = 429 + 1,145 + **198** other; the three numbers sum to 2,289 (all rows), not 1,772 | disagree (label "1,772 rows" vs components summing 2,289) |
| M32 | geographic Tier A holdout: 4,636/13,112 = 35.4% (CP95 34.5), 3,467 = 26.4%, 3,202 = 24.4% | `node tools/mhgu/coverage/canonical-holdout.mjs` | killed at the 300 s background-job deadline; not copied from the document | unverified (time) |
| M33 | hub `0x7bb638`: 1,185 callers; labels render-gfx 154, weapon-wp 129, quest 54, otomo 54, physics 49, item 33, monster 32, ui 31, audio 23, player 15, online 14, save 3, kernel 3, unlabelled 591 | split the `callees` column, join `tiers-merged.csv` | callers **1,185** (exact); unlabelled 547, render-gfx 184, weapon-wp 130, quest 61, otomo 54, physics 51, ui 34, item 33 | disagree (population exact, distribution drifted) |

Notes to M8/M24/M27/M29:
- M8's six rows are internally consistent (253+171+86+242 = 752/990) but the committed
  `spread-precision-independent.mjs` now emits the 3+ bucket only. No script prints the split.
- M24's table rows sum to 356 while the recomputation gives 346. The ten-row difference is not a
  rounding artefact (2.65 vs 2.70); no variant tried (including `unknown`, or adding
  `attr-vtable-retile`) gives 356.
- M27: `attr-ctor-vtable.tsv` is tracked and header-only (`start label conf evidence`), which
  agrees with "not adopted"; the paragraph's *counts* are not those of the current script.
- M29: the four mismatching rows look like per-run accepted-seed (or newly-added) counts rather
  than current file rows, but the table's own definition is "该通道当前产出的带真实标签的行数 …
  unknown 不计". Under that definition `attr-prefix` contributes 900 distinct functions
  (2,140 A rows), `attr-uifamily` 2,289, `attr-strings2` 444 and `attr-registrar` 843, not
  587/551/423/162. `attr-class` (2,313 A of 5,642 rows) does match the table and is not a
  defect. The paragraph says the table was re-checked file-by-file on 2026-11-04; on the
  committed files four rows are not.

### 2.2 `coverage/LIBFINGERPRINT.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| L1 | source `attr-library.tsv` is 505 rows, 495 A, 10 B | count the TSV | rows 505, A 495, B 10; label split online-nex 454 A / 9 B, physics 19, kernel 13+1 B, save-data 5, filesystem 2, render 2 | agree |
| L2 | rows by family: nex 421, mt 43, curl 17, sdkver 10, nexfield 7, nvn 2, nnacc 2, curlapi 2, libcprintf 1 | sum the table rows | 421+43+17+10+7+2+2+2+1 = 505 | agree |
| L3 | 527 distinct `_ZN2nn` names in the image, 2 in the `strings` column; no `.text` instruction materialises one | count `_ZN2nn` strings in `main.140.flat.bin`; count in `functions.csv.gz` | 527 distinct in image; column occurrences 2, distinct 2; the scratch `numbers.mjs` prints `refs [0,0,0,0]` for its four sampled addresses | agree |
| L4 | family image counts: nn:: 19, nvn 478, Nex 244, Mt 186, cri 28, pia 245, OnlineCore 21, libcurl 7; std::/nw::/zlib/png/freetype = 0 | scratch `G:/tmp/LibFp/numbers.mjs` (preserved from the pass) | every count identical; `boost 0 (2 hits = mBoost[0..1])` also matches | agree |
| L5 | 3,607 / 4,462 column strings reproduced; 855 not; 754 dptr + 101 compressed | scratch `G:/tmp/LibFp/audit.mjs` | `unreproduced 855`, `explained by a dptr-style literal 754`, `no literal explains it 101`; 4,462−855 = 3,607 | agree |
| L6 | 3,216 functions have ≥1 reference; 16,317 raw hits; 11,857 distinct strings; 20,669 of 23,885 have none | no committed script prints these; arithmetic 23,885−3,216 = 20,669 is consistent | not printed by any committed file; extraction lives in scratch | unverified |
| L7 | the meter moved 53.1% → 53.4% (+44 fn, +16,248 insns); 46 upgrading rows, 2 already A | `report.mjs --source attr-library.tsv` now prints `0 fn`, because all 505 rows are already in the spine (the document says this) | current spine: 149 of the 505 rows are tier A, so the historical delta cannot be rerun | unverified (historical, self-explained) |
| L8 | 15 rows disagree with an existing tier A label | compare the 15 listed starts with `tiers-recomputed.csv` | the spine has since absorbed the file, so it now agrees with many of them; at the time of writing this was a list for adjudication, not a meter number | unverified (historical) |

Two accepted-extraction counts are one row off in the scratch re-run (`nvn` 331 fragments / 3
functions vs the document's 2; `_ZN2nn` 1/1 vs 0/0). Neither changes a verdict; the document's
`0` for `_ZN2nn` is the important claim and is right (no `.text` reference).

### 2.3 `coverage/attr-bverify-pilot.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| B1 | 60 rows, all in the retile; 9,614 instructions (0.39% of tier B's 2,462,952) | `attr-bverify-pilot.tsv` + function table | rows 60; `insns 9614`; 9,614/2,462,952 = 0.39% | agree |
| B2 | verdicts: 0 confirm, 60 relabel; conf A 40 / B 20; old labels otomo 44, monster 10, player 6 | parse the TSV | `relabel` 60; `A 40 B 20`; `otomo-ot 44, monster-em 10, player-pl 6` | agree |
| B3 | label pairs: otomo→weapon 35, otomo→item 9, monster→item 9, monster→weapon 1, player→item 3, player→weapon 3 | parse the TSV | identical | agree |
| B4 | 57/60 rows have `callers=0` | function table | 57 | agree |
| B5 | `stringxref.tsv` has **0 of 60**; retile `strings` column empty for all 60 | join the 60 starts with the current tables | `stringxref` now has **46 of 60**, including exactly the 43 class/field names the document says the tool cannot see (`0x1000f0 → cWeapon03MsgBase, cWeapon03MsgBaseXML`); retile column non-empty for 3/60 (`0x127bb8 "amlt"`, `0x12806c "amskl"`, `0x1284cc "amslt|ased"`) | disagree (the described defect has been fixed since; the 43/60 observation now matches the fixed tool) |
| B6 | 4,717 functions with a pc-delta string; 2,420 absent from `stringxref`; 1,737 tier B; 813 seedable | no committed script; the scratch survey is not in the repo | cannot be rerun; with `stringxref` now covering 46/60 the premise (2,420 missing) is obsolete | unverified / stale |
| B7 | tool cost 39 disassemblies, 21 distinct bodies, 48/60 clone-grouped, largest 28 | no committed artefact (skeleton hashes are in scratch `survey.mjs`) | not reproducible from the repo | unverified |

B5 is the important one: the document's own "fix this before spending agents" recommendation was
implemented, and the numbers that justified it (0/60, 1,737 invisible tier-B rows, 813 seeds) are
now historical. The document reads as a live defect report; a reader would re-do work that is
already done.

### 2.4 `coverage/attr-members.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| A1 | 454 functions qualify (≥3 member names) | `node tools/mhgu/coverage/member-seeds.mjs` | `qualifying functions (>=3 member names): 454` | agree |
| A2 | **9 seeds emitted (1 A, 8 B)**; otomo 5, monster 2, render 2; 445 unknown, 1 conflict | same command | `seeds emitted: 7 (A 0, B 7) … unknown 447, conflicts 1`; `by label: {"otomo-ot":5,"render-gfx":2}`; `attr-members.tsv` has 7 data rows | **disagree** (9→7, 1 A→0 A, monster 2→0) |
| A3 | xref cross-check: 382/454 have a row, 4,666/6,526 (71%) of names visible | same command | `454/454 qualifying functions have a row, but only 5808/6526 (89%)` | disagree (382→454; 71%→89%) |
| A4 | must-fail gate PASS (10 cases) | same command | `must-fail gate: PASS (11 cases)` | disagree (10→11) |
| A5 | 141 qualifying functions already in the two seed files; ≈390 in some attribution file | same command | `already attributed elsewhere: 143` | disagree (141→143) |
| A6 | `member-offsets.tsv`: 110 records over 27 runs, 87 names | count `docs/data/member-offsets.tsv` | 110 records, 87 names, **37** distinct `fn` groups | disagree (27→37) |
| A7 | §6 defect 2: the `fn` column predates the retile; sites are in other functions; 25 of 27 runs have all sites in exactly one other function | map every `site` to its enclosing retile function | **110/110 sites now lie inside the row's own `fn`**; 0 groups split across enclosing functions | disagree (defect fixed by the 2026-11-03 re-anchor; the must-fail text at `0x58fd0` records that re-anchor) |
| A8 | `bl 0x7bb638` has 10,268 call sites | function table row `0x7bb638` | `callers 10268` | agree |

The document's central result — "the member channel moves the meter by zero" — is still true
(the current run also prints `new 0`), but every number that describes *which* rows it emits is
now wrong. This is the clearest stale headline in the coverage directory: the tool's own output
contradicts the document's Result paragraph and its label table.

### 2.5 `coverage/attr-strings.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| S1 | 1,212 rows; A 462 / B 404 / C 346 | count `attr-strings.tsv` | exactly | agree |
| S2 | A 471,265 insns; B 338,147; C 137,632; total 947,044 — measured on `functions.csv.gz` (23,885 regions) | sum `insns` from `functions.csv.gz` | `rows 1212 insns 947044 {"B":{...338147},"A":{...471265},"C":{...137632}}` | agree (in the document's stated universe) |
| S3 | same file measured on the retile table would be 206,699 insns | sum from `functions-retile.csv.gz` | `rows 1212 insns 206699` | agree (different universe; the document correctly names the old one) |
| S4 | 462 of 462 A rows rest on a real reference (451 movw/movt + add, 11 pool pointer) | no committed script; `annotate2` was scratch | not reproducible from the repo | unverified |
| S5 | "4,948 real string references image-wide" | `stringxref.tsv` now holds 16,998 references / 5,043 functions | the current extractor is a different, later tool; the 4,948 figure is not a number of any committed artefact | stale |

S2 is a good example of a document that states its universe: every instruction count reproduces
exactly once the old tiling is used, so a reader who recomputes with the retile will see 4.6×
smaller numbers and must not conclude the document is wrong. A cross-reference that says so would
help, but the numbers themselves are correct.

### 2.6 `coverage/attr-vtable.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| V1 | `attr-vtable.tsv` 1,375 rows (489 A, 886 B); A = 289 registrar + 7 class-record + 193 RTTI | count; classify A evidence | 1,375; 489/886; 289/7/193 | agree |
| V2 | 3,201 inventory classes | `docs/data/class-inventory.tsv` | 3,201 rows, all with a registrar | agree |
| V3 | slot arithmetic 9,602 + 54,053 + 4,971 = 68,626; dropped 9,561 + 48,821 + 4,405 = 62,787 | arithmetic | both exact | agree |
| V4 | retile file: 13,577 rows, 5,217 A, 8,225 B/unknown + 135 B/conflict; A 313,856 insns (6.0%), B 564,728 (10.8%) | count + function table | 13,577; 5,217 A; 8,360 B (8,225 + 135); 313,856 (6.00%); 564,728 (10.80%) | agree |
| V5 | new vs `attr-vtable.tsv`: 12,202 rows, 4,728 A, 260,192 insns (5.0%), 1,375 shared with 0 label changes | set difference + join | `shared 1375 same 1375 diff 0`, `newRows 12202 newA 4728 newAins 260192 (4.98%)` | agree |
| V6 | anchor rows/A: class-record 3,057/1,183; instance 8,520/2,669; RTTI 2,000/1,365 | classify evidence text | exact | agree |
| V7 | all retile A rows: monster 1,236, online 1,192, weapon 712, quest 430, otomo 396, render 379, item 320, player 189, audio 175, ui 163, save 25 | count A labels | exact; also the "new A by label" row sums to 4,728 | agree |
| V8 | 5,217/5,217 slots satisfy `word[V+4·slot]==start` | read the image at every row | 5,217/5,217 and 13,577/13,577, 0 mismatches | agree |
| V9 | "Meter" blocks with denominator 23,885, tier A 9,188 → 26,172 | `report.mjs` now prints 52,692; the blocks are pre-retile snapshots | numbers no longer print; the document's later "Retiled pass" section supersedes them, but the earlier blocks are not banner-marked | stale (self-evident from the denominator) |
| V10 | 42,818 unresolved slots = 13,572 addresses; 27,149 distinct targets, 13,577 (50.0%) function entries; eight shared stubs | not derivable from the committed tables (they contain only resolved rows) | arithmetic 13,577+13,572 = 27,149 is right; the 13,572/42,818 split is not in the repo | unverified |

V8 is the strongest single verification in the sweep: the whole vtable channel's mechanical claim
can be (and was) re-read from the image, row for row, with zero exceptions. V9 is only a
presentation risk, not a wrong number: "denominator: 23885" cannot be mistaken for current.

### 2.7 `coverage/precision-A.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| PA1 | 120 rows over 6 labels, 20 each | `precision-A.tsv`, `samples.tsv` | 120; 20 per label | agree |
| PA2 | 28 correct, 1 wrong (`wrong:ui`), 91 no-evidence; 23% correct share | parse verdicts | `{"no-evidence":91,"correct":28,"wrong:ui":1}`; 28/120 = 23.3% | agree |
| PA3 | 59 of the 91 no-evidence are constructors/destructors/factories/forwarders/getters/setters | no committed classifier; the per-row `evidence` text is the only support | not machine-counted | unverified |
| PA4 | 14/120 rows contain a resolvable string | not directly marked in the TSV | not reproducible without the scratch extractor | unverified |
| PA5 | combined A+B: 48 correct / 5 wrong / 227 no-evidence; 48/53 = 90.6% | `precision-A.tsv` + `precision-B.tsv` | 28+20 = 48; 1+4 = 5; 91+136 = 227; 48/53 = 90.57% | agree |
| PA6 | five audited decisions (`0x122e8c`, `0x5bd8`, `0x55f238`, `0x66f0a8`, `0x23d0a4`/`0x4c106c`) | spot-read of the image was not redone; the verdict rows exist | all five starts are in the TSV with the stated verdicts | agree (rows present; byte-level re-read not repeated) |

### 2.8 `coverage/precision-B.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| PB1 | 160 rows, 20 per label over 8 labels | `precision-B.tsv` | 160; 20 each | agree |
| PB2 | 20 correct (12.5%), 4 wrong (2.5%), 136 no-evidence (85%) | parse verdicts | `{"correct":20,"wrong":4,"no":136}` | agree |
| PB3 | per-label: otomo 1/0/19, item 1/0/19, player 3/1/16, audio 3/0/17, kernel 2/1/17, physics 4/0/16, filesystem 4/0/16, save 2/2/16 | parse verdicts per label | identical, including the `wrong` targets | agree |
| PB4 | 20/24 decidable = 83% carry the supported label | arithmetic | 20/24 = 83.3% | agree |
| PB5 | 71 of 160 rows have a body >8 instructions shorter than the retile row; 12 rows ≤4 instructions | not stored in the TSV | not reproducible | unverified |

### 2.9 `inventory/README.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| R1 | 12,318 unlabelled = 23.4% functions / 10.0% instructions | `coverage-report.tsv` | exact | agree |
| R2 | five provenance classes, priority A > V > S > spine > adjudication; adjudication not in the ≥90% bucket | `function-labels.tsv` counts; `coverage-report.tsv` partition | five classes present; spread bucket 14,588 = spread 13,920 + adjudication 668, all in the unvalidated pool after the third correction | agree |
| R3 | `attr-tableseeds`: 1 labelled member 94.1% (CP95 92.5), ≥2 98%+; mixed tables 45% skipped | `table-consensus.mjs` | 1: 94.1/92.5; 2: 98.1/97.1, 3: 98.0/96.3, 4: 100/97.3, **5+: 97.2/93.6** (not "98%+") | agree in substance (the 5+ band is 97.2, not 98+) |
| R4 | `attr-offsets`: 2+ always; 1 only under 200 insns; ≥200 is 86.0%, pooled 91.1% hides it | `offset-signature.mjs` | current run: big 86.7 (84.9), small 95.4 (94.5), pooled 92.4 — the direction is right, the exact cells have drifted | disagree (numbers), agree (rule and direction) |
| R5 | `disasm()` returns a string, `c[2]` is the instruction count, flat = vaddr + 0x100 | `tools/mhgu/arm32.mjs`; CSV header | `disasm` returns `string`; header `start,end,insns,…`; image has 0x100 flat bias | agree |
| R6 | `cov-report.tsv` is a generated artifact | file list | **no `cov-report.tsv` exists**; only `coverage-report.tsv` | disagree (dead path) |
| R7 | regeneration chain `recompute → report → check-artifacts → function-labels → labels-summary → check.mjs` | run each in scratch | all present; outputs byte-identical | agree |

### 2.10 `inventory/RETILE.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| T1 | old 23,885 regions; 46,087 prologues; 28,807 = 46,087−17,280 not region starts | `node tools/mhgu/coverage/retile.mjs` in scratch | `prologues 46087, BL targets 23195, old starts 23885, union 52692` | agree |
| T2 | new 52,692; BL targets 23,195 ≈ 23,336; insns 5,228,277; strings 1,937 | same | `functions 52692 (old 23885, prologues 46087, BL targets 23195), insns 5228277, strings 1937`; the regenerated `functions-retile.csv.gz` has the same md5 as the committed one (`e98acb1f…`) | agree |
| T3 | old string column has ~754 false positives, "see `attr-library.md` §findings" | file list | **`attr-library.md` does not exist**; the analysis is in `coverage/LIBFINGERPRINT.md` §1 (754 is confirmed there) | disagree (broken path) |

T2 is the cleanest reproducibility result in the sweep: `retile.mjs` rebuilds the committed
`functions-retile.csv.gz` byte-for-byte, so the denominator and the instruction sum are not
hand-maintained numbers.

### 2.11 `inventory/labels-summary.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| LS1 | generated from `function-labels.tsv`; total 40,374 functions | `node tools/mhgu/coverage/labels-summary.mjs` in scratch | regenerated file is byte-identical (`diff` empty) | agree |
| LS2 | per-subsystem rows, instruction total 4,704,134 | sum the table; join function table | 14 subsystems sum to 40,374 functions / 4,704,134 instructions, equal to `covered, spread pooled` | agree |
| LS3 | direct-evidence column sums to 13,061 | sum the column | 13,061 | agree |

### 2.12 `inventory/bsamples/verdict-*.md` (six documents)

All six are adjudication records; their totals are readable from the TSVs next to them.

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| BS1 | 0–6: 23 confirm / 24 relabel / 37 unknown; targets quest 7, online 5, weapon 4, item 3, otomo 3, monster 1, player 1 | `verdict-0_6.tsv` | identical; 84 rows | agree |
| BS2 | 7–13: 24/19/41; targets player 5, quest 4, render 4, item 2, monster 2, ui 1, weapon 1 | `verdict-7_13.tsv` | identical; 84 rows | agree |
| BS3 | 14–20: 10/39/35; targets ui 34, otomo 1, item 1, online 1, player 1, save 1; 3,974 fn / 421,329 insns | `verdict-14_20.tsv`; `INDEX.tsv` | identical; block sums 3,974/421,329 | agree |
| BS4 | 21–27: 10/67/7; targets physics 15, render 28, ui 13, monster 4, online 3, filesystem 2, kernel 2; 3,287 fn / 420,921 | `verdict-21_27.tsv`; `INDEX.tsv` | identical; block sums exact | agree |
| BS5 | 28–34: 12/48/24; targets render 25, physics 11, audio 6, ui 2, online 2, quest 1, monster 1 | `verdict-28_34.tsv` | identical | agree |
| BS6 | 35–42: 17/21/58; per-block 0/7/5, 2/6/4, 2/5/5, 0/1/11, 0/0/12, 1/0/11, 9/2/1, 3/0/9 | eight `verdict-35_35.tsv` … `verdict-42_42.tsv` | every per-block triple identical | agree |
| BS7 | 14–20 follow-up: `class-from-code.mjs` classifies 16,579 functions; by name 1,443, ctor 5,560, slot 7,636, array 1,940, none **36,112** | `node tools/mhgu/coverage/class-from-code.mjs` | `none=36113 ctor=5560 slot=7636 name=1443 slot-run=1940`; 1,443+5,560+7,636+1,940 = 16,579 | disagree (none is 36,113; the body text later says 36,113 correctly) |
| BS8 | 2,454 distinct classes; 6,582 functions mapped by `labelFor`; top-10/100/500/1000 shares | no committed aggregate output in `class-from-code.mjs` | not printed | unverified |

The bsamples docs are the best-maintained set in scope: every verdict distribution and every block
weight matches the TSV/index. The one arithmetic slip (BS7) is a single function in a 52,692-row
table and is contradicted by the same document's own next paragraph.

### 2.13 `batchA-classname-xref.md`

| # | claim | command / artefact | output | verdict |
|---|---|---|---|---|
| BA1 | 771 single-label rows; instruction total 58,818 = 1.12% of `.text` | count/sum the markdown table | rows 771; `insns 58818`; 58,818/5,228,277 = 1.12% | agree |
| BA2 | 1,369 functions: 771 unique label + 8 conflict + 590 no rule | table + arithmetic | 771+8+590 = 1,369 | agree (the 8 and 590 are not printed as rows) |
| BA3 | 2,291 class-name loads; 2,076 distinct names | no committed scanner (the pass used `.tmp/mhgu` inputs; `classify3.mjs` needs `.tmp/mhgu/mon/mon-final.out.txt`, absent) | 883 distinct names appear in the printed single-label table alone; the full 2,076 cannot be checked | unverified |
| BA4 | prefix remap: 224 prefixes, 769 unique labels, 362 in tier A, 151 agree (41.7%); outside otomo 215 → 145 agree (67.4%); inside otomo 147 → ui 134, otomo 6 | reproduce with `classprefix-map.tsv` (225 rows) + `tiers.csv` containment | 770 unique labels; 363 in tier A; **161 agree (44.4%)**; in-A otomo 147 → ui 134, otomo 6 | disagree (map grew by one row since; agreement 41.7%→44.4%; the otomo split reproduces exactly) |
| BA5 | first keyword pass: 363 in Tier A, 151 agree (41.6%) | keyword rules are not a committed script; 363 containment matches my count | numerator not reproducible | unverified |

The 134/6 split inside the otomo band reproduces exactly, which is what the document uses to argue
that the low agreement is a Tier A labelling artifact rather than a bad prefix rule. The headline
41.7% moves to 44.4% with the current map; the argument survives, the number does not.

## 3. Findings, ranked

No P0/P1. The headline calibres (58.0%, 66.2/53.5, 90.0/76.6, 75.0/82.5, 10.0/23.4) all
reproduce exactly; every defect below is in a secondary table or in a section that a later tool
change invalidated.

### F1 — `coverage/attr-members.md`: the Result section contradicts its own tool (P2)

The document's headline is "454 functions qualify, **9 seeds are emitted (1 A, 8 B)**, 0 new", with
a label table otomo 5 / monster-em 2 / render-gfx 2 and "1 A (`0x54028`, `rEnemyDtBase`)".
`member-seeds.mjs` now prints `seeds emitted: 7 (A 0, B 7)`, `by label: {"otomo-ot":5,"render-gfx":2}`,
unknown 447, and `attr-members.tsv` holds 7 data rows. The current must-fail file explicitly says
`0x54028` must stay not-A ("member-seeds does not resolve the run to this function"). Four more
numbers drifted: xref cross-check 382/454 → 454/454, name visibility 4,666/6,526 (71%) →
5,808/6,526 (89%), must-fail cases 10 → 11, "already in the two seed files" 141 → 143.
`member-offsets.tsv` has 37 `fn` groups, not 27, and the §6 defect 2 ("sites are in other
functions") is fixed: 110/110 sites now lie inside the row's own `fn`. The zero-yield conclusion
still holds, but the rows the document says the channel emits no longer exist.

Evidence:
```
$ node tools/mhgu/coverage/member-seeds.mjs
xref cross-check: 454/454 qualifying functions have a row, but only 5808/6526 (89%) of their member names are visible to stringxref.tsv
seeds emitted: 7  (A 0, B 7)  new 0  unknown 447  conflicts 1
by label: {"otomo-ot":5,"render-gfx":2}
must-fail gate: PASS (11 cases)
$ wc -l docs/analysis/code/inventory/attr-members.tsv   # 8 lines = header + 7
```

### F2 — `coverage/attr-bverify-pilot.md`: the string-channel defect it reports is fixed (P2)

The document states "**`stringxref.tsv` has 0 of 60**" and "the retile `strings` column is empty for
all 60 rows", then derives a work item ("1,737 tier-B rows are invisible … 813 label-seedable …
fix the tool before spending agents"). The current `stringxref.tsv` contains **46 of the 60**
starts, including exactly the class names the document says are invisible
(`0x1000f0 → cWeapon03MsgBase | cWeapon03MsgBaseXML`, `0x127bfc → rAmuletData`,
`0x127318 → cWeaponBase`), and 43 of them carry a class-ish name — the same 43/60 the document
measured by hand. Three of the 60 rows have a non-empty retile `strings` column
(`0x127bb8 "amlt"`, `0x12806c "amskl"`, `0x1284cc "amslt|ased"`), which also contradicts "empty
for all 60". The 1,737/2,420/813 projection is not reproducible and its premise no longer holds.
This is the kind of stale section that costs another pass real time: it tells the reader to fix
something that has been fixed.

Evidence:
```
$ node -e '... join attr-bverify-pilot.tsv starts with stringxref.tsv ...'
rows present in stringxref 46 of 60
with any string 46 with class-ish name 43
$ node -e '... retile strings column ...'
pilot rows in table 60 with non-empty strings column 3
```

### F3 — `coverage/METER.md`: four rows of the "current channel output" table do not match the files (P2)

The table is introduced as "该通道当前产出的带真实标签的行数（unknown 不计）" and the paragraph
below it claims a file-by-file re-check on 2026-11-04. On the committed files:

| row | document | file |
|---|---:|---:|
| class prefix table (`attr-prefix.tsv`) | 587 | 2,140 A rows over 900 distinct functions |
| UI family (`attr-uifamily.tsv`) | 551 | 2,289 rows (1,772 A) |
| string vocabulary (`attr-strings2.tsv`) | 423 | 444 rows |
| registrar name (`attr-registrar.tsv`) | 162 | 843 rows |

The other twelve numeric rows in that table match exactly (including class identity: 2,313 A
rows of 5,642). The numbers are probably accepted-seed counts
from an earlier run, but the table does not say so; under its own definition they are wrong.
Related: the `attr-uifamily` composition sentence says "1,772 行：429 ctor + 1,145 slot + 715
其他" — the components sum to 2,289 (all rows), while the 1,772 A rows split 429 / 1,145 / **198**.

### F4 — `coverage/METER.md`: the conflict table's 356 (2.7%) is not what the sources produce (P3)

Recomputing "A-direct starts with at least two distinct non-unknown labels" over the 24
`sources.json` files gives **346 / 13,061 = 2.65%**. The table's rows (148+37+21+21+21+108) sum to
356, so the document is internally consistent but the external recomputation disagrees by ten
functions. No variant (including `unknown`, or adding `attr-vtable-retile`) gives 356. The
"±2.7% label ambiguity" caveat is unaffected in substance.

### F5 — `coverage/METER.md`: the single-offset precision cells have drifted (P3)

The table "1 个 | 91.1% (90.2) | 86.0% (84.2) | 93.6% (92.7)" is the basis for the rule "only
accept 1 offset under 200 instructions". `offset-signature.mjs` now prints
`1|big 1343/1549 = 86.7% CP95 84.9`, `1|small 2895/3036 = 95.4% CP95 94.5` (pooled 92.4%, not
91.1%). The 2+ cells still match exactly (99.6/99.2 and 99.2/98.7), and the rule's direction is
unchanged. The neighbouring offset-*pair* table matches exactly.

### F6 — `batchA-classname-xref.md`: the prefix-remap agreement rate moved with the map (P3)

The tail claims 224 prefixes, 769 unique labels, 362 in Tier A, 151 agreeing (41.7%). With the
current `classprefix-map.tsv` (225 rows) and `tiers.csv` containment: 770 unique labels, 363 in
Tier A, **161 agreeing (44.4%)**. The diagnostic that matters — 147 rows in the Tier A otomo-ot
band, of which the map says ui 134 / otomo 6 — reproduces exactly, so the document's argument
("the low agreement is a Tier A labelling artifact") survives. The 41.6/41.7% headline does not.
The 771-row table itself is exact: 58,818 instructions = 1.12%.

### F7 — two documents point at paths that do not exist (P3)

- `inventory/RETILE.md`: "见 `attr-library.md` §findings" — there is no `attr-library.md`; the
  analysis is `coverage/LIBFINGERPRINT.md` §1 (where the 754 figure is confirmed).
- `inventory/README.md`: lists `cov-report.tsv` as a generated artifact — no such file exists;
  only `coverage-report.tsv`.

### F8 — `inventory/bsamples/verdict-14_20.md`: 36,112 should be 36,113 (P3)

The class-from-code table says `none 36,112`; the tool prints `none=36113`, and the same
document's closing paragraph says 36,113. All other class counts (1,443 / 5,560 / 7,636 / 1,940)
match, and the total is 52,692.

### F9 — `coverage/METER.md`: two stale snapshots that are not banner-marked (P3)

- The first string scan is quoted as "2,380 functions / 4,252 references / 3,214 distinct
  strings"; the current `stringxref.tsv` holds 5,043 / 16,998 / 11,831. A later section uses the
  newer 5,043, so the file contradicts itself across sections.
- The ctor-vtable experiment says "6,104 known vtables (5,531 named), 17 constructors, 2/5
  correct, 1 new". The union of the twelve `attr-vtable*.tsv` files is **6,095** vtables, and
  `ctor-vtable.mjs` prints `vtables with a single known class: 2373`, `9201 stored to [rN+0],
  0 matched a known vtable`, and writes only a header. The "17 / 2 of 5 / 1 new" numbers are not
  printed by any committed command. The channel is rejected either way. The `0x7bb638` hub paragraph has the same shape: its
  1,185-caller population reproduces exactly, but the label distribution has drifted (current
  `tiers-merged.csv`: unlabelled 547, render-gfx 184, weapon-wp 130, quest 61; document: 591 /
  154 / 129 / 54).

### F10 — numbers that can only be reproduced from untracked scratch (P2, verifiability)

The project's publishable claim is that its numbers can be recomputed. These cannot, from the repo
alone:

| document | numbers | dependency |
|---|---|---|
| `LIBFINGERPRINT.md` §1/§2 | 3,216 functions / 16,317 hits / 11,857 strings; the family table | `G:/tmp/LibFp/extract2.mjs`, `numbers.mjs`, `audit.mjs` (present on this machine, untracked) |
| `attr-strings.md` | 462/462 A rows on a real reference (451 add-pc + 11 pool) | `annotate2` re-implementation (not committed; the committed `func-inventory5.mjs` does not emit provenance) |
| `attr-bverify-pilot.md` | 39 disassemblies, 21 bodies, skeleton hashes, 48/60 clones | `.tmp/bverify/{dossier,survey,emit}.mjs`, `block.json` |
| `batchA-classname-xref.md` | 2,291 loads / 2,076 names / 8 conflicts / 590 no-rule | `.tmp/mhgu/mon/mon-final.out.txt` (absent) + the pass's scanner |
| `verdict-14_20.md` | 2,454 classes, 6,582 labelFor functions, top-N shares | `class-from-code.mjs` prints rows only; no aggregate mode |
| `precision-A/B.md` | 59 of 91 shapes; 14/120 with strings; 71/160 short bodies | no stored classifier |

I verified the LIBFINGERPRINT scratch chain (527 names, 855 = 754 + 101, family counts) because the
directory happens to still exist; if `G:/tmp` is cleaned, none of it is recoverable from the repo.
The other rows I could not settle. This is not a wrong number; it is a number the repository
cannot defend on its own, which is the criterion this audit was asked to apply.

## 4. Sections that are explicitly superseded (not counted as findings)

METER marks most of its own history: the 48.9% baseline, the 83.8% / 80.3% / 80.4% traceability
experiments, the self-scored 86.0% spread table, the 65.5%/52.0% intermediate, the 58.4% project
calibre. Each is labelled 作废/勿引用/已被取代; they are historical values that the current rules are
not expected to reproduce (the rules and the spine changed), and the document says so. I checked
that the *current* replacement is right; I did not count the archived value as a defect. The same applies to `attr-vtable.md`'s two pre-retile
"denominator: 23885" meter blocks (the document's later "Retiled pass" section supersedes them).

## 5. Commands that did not run or did not settle a claim

- `node tools/mhgu/coverage/canonical-holdout.mjs` (geographic Tier A holdout: 4,636/13,112 =
  35.4%, 3,467 = 26.4%, 3,202 = 24.4%) was killed at the 300 s background-job deadline (the shell
  caps a backgrounded command at 300 s even when the command timeout is larger), so the table
  could not be re-measured and is marked unverified rather than copied.
- `node tools/mhgu/coverage/verify-evidence.mjs` **with no environment variable** prints
  `FAIL split: 1404 + 272 + 112 = 1788, but the enumerated files hold 30167 A rows` — it samples
  ~121 rows per file by default and then compares the sample against the full A-row count. The
  gate runs it with `SAMPLE=100000` and passes. A reader who copies the bare command sees a FAIL
  that is not a data failure. The document should say `SAMPLE=100000`.
- `class-from-code.mjs` has no aggregate mode, so the 2,454-class / 6,582-labelFor / top-N
  distribution quoted in `verdict-14_20.md` cannot be re-derived from the tool.
- `table-consensus.mjs` prints the mixed-table cell as 2,312/5,121 (document: 2,311/5,120); the
  ratio is 45.1/43.8 either way. Counted as a one-row drift, not as a finding.

## Difficulties

1. **Write-into-repo tools.** Several coverage tools write tracked files by hardcoded absolute
   path, not by relative output: `report.mjs` → `coverage-report.tsv`, `recompute.mjs` →
   `tiers-merged.csv`, `retile.mjs` → `functions-retile.csv.gz` + `RETILE.md`,
   `function-labels.mjs` → `function-labels.tsv`, `ctor-vtable.mjs` → `attr-ctor-vtable.tsv`,
   `spread-votes.mjs` → `spread-votes.tsv`. I ran the heavy chain in a 65 MB scratch copy
   (`G:/tmp/W6/repo`) and diffed the regenerated files against the committed ones. Two scripts
   still wrote to the real tree because of the absolute path: `function-labels.mjs` (output
   byte-identical, `git status` clean) and `ctor-vtable.mjs` (wrote the header-only
   `attr-ctor-vtable.tsv`; I had deleted it thinking it was a stray, then restored it with
   `git checkout --`; it is back to the committed 26-byte header). No other tracked file in the
   inventory directory differs from HEAD.
2. **Two function tables, two instruction worlds.** `functions.csv.gz` (23,885 regions) and
   `functions-retile.csv.gz` (52,692 functions) both have 5,228,277 instructions, but per-row
   instruction weights differ by up to 4.6× (`attr-strings` 947,044 vs 206,699). A reader who
   recomputes an old-tiling document against the retile will see every row "wrong". The documents
   that state their universe (`attr-strings`) are fine; the ones that do not (the `attr-vtable`
   meter snapshots) are at least self-evident from `denominator: 23885`.
3. **The mutable spine.** `tiers-recomputed.csv` is regenerated by other passes while this audit
   runs. Claims that compare against it (`LIBFINGERPRINT`'s +44, `attr-vtable`'s 480/489,
   `verdict-*`'s "all tier B src=spread") cannot be reproduced after absorption. I checked the
   *artefacts* (TSVs, image, function table) rather than the live spine wherever possible, and
   treated spine-dependent deltas as historical when the document says the spine moved.
4. **Default sampling in `verify-evidence.mjs`.** The bare command ends in a FAIL line (above);
   only `SAMPLE=100000` reproduces the gate. This cost one run to disambiguate.
5. **`offset-pairs.mjs` runs 90 s**, `canonical-holdout.mjs` >300 s; the rest are seconds.
6. **`git status` is not clean for reasons unrelated to this audit** (other passes are editing
   `docs/wiki/*`, `docs/reference/*`, `LINK-STATUS.tsv`, and two new audit files). I did not touch
   those.

## VERDICT

doc	status	evidence
docs/analysis/code/inventory/README.md	contradiction	The 12,318/23.4%/10.0% and five-provenance claims reproduce, but `cov-report.tsv` does not exist and the offset cells it quotes (86.0%/91.1%) are now 86.7%/92.4%.
docs/analysis/code/inventory/RETILE.md	contradiction	Every number reproduces (`retile.mjs` rebuilds the committed CSV byte-for-byte: 46,087 prologues, 23,195 BL targets, 52,692 functions, 5,228,277 insns, 1,937 strings), but it cites the non-existent `attr-library.md`.
docs/analysis/code/inventory/labels-summary.md	confirmed	`labels-summary.mjs` regenerates the file byte-identically, and its 14 rows sum to 40,374 functions / 4,704,134 instructions with 13,061 direct-evidence functions.
docs/analysis/code/inventory/bsamples/verdict-0_6.md	confirmed	23 confirm / 24 relabel / 37 unknown, the seven block weights and every relabel target match `verdict-0_6.tsv` and `INDEX.tsv`.
docs/analysis/code/inventory/bsamples/verdict-7_13.md	confirmed	24/19/41, 4,721 functions / 420,641 instructions and all seven relabel-target counts match the TSV and index.
docs/analysis/code/inventory/bsamples/verdict-14_20.md	contradiction	10/39/35 and 3,974/421,329 are exact, but the class table's `none 36,112` is 36,113, as the document's own closing paragraph says.
docs/analysis/code/inventory/bsamples/verdict-21_27.md	confirmed	10/67/7, 3,287 functions / 420,921 instructions and the per-block relabel split (physics 15, render 28, ui 13, …) all match the TSV.
docs/analysis/code/inventory/bsamples/verdict-28_34.md	confirmed	12/48/24 and the target distribution render 25 / physics 11 / audio 6 / ui 2 / online 2 / quest 1 / monster 1 match `verdict-28_34.tsv`.
docs/analysis/code/inventory/bsamples/verdict-35_42.md	confirmed	17/21/58 and every one of the eight per-block confirm/relabel/unknown triples match the eight verdict TSVs.
docs/analysis/code/coverage/METER.md	contradiction	Both calibres (58.0%, 66.2/53.5) and more than twenty secondary tables reproduce, but four channel rows, the 356 conflict count, the single-offset cells and two legacy snapshots do not.
docs/analysis/code/coverage/LIBFINGERPRINT.md	confirmed	505/495/10, the family counts, 527 `_ZN2nn` names vs 2 in the column, and 855 = 754 + 101 all reproduce; only the 3,216/16,317/11,857 extraction totals rest on untracked scratch.
docs/analysis/code/coverage/attr-bverify-pilot.md	stale	60 rows / 9,614 insns / A 40 / B 20 / 57 zero-callers are exact, but "stringxref has 0 of 60" is now 46/60 and three rows have retile strings, so the 1,737-row work item it recommends is already done.
docs/analysis/code/coverage/attr-members.md	contradiction	The document says 9 seeds (1 A) and 10 must-fail cases; `member-seeds.mjs` prints 7 seeds (0 A) and 11 cases, and the 27-run `member-offsets` defect it reports is fixed (37 runs, 110/110 sites in their own function).
docs/analysis/code/coverage/attr-strings.md	confirmed	All 1,212 rows and the 471,265/338,147/137,632/947,044 instruction totals reproduce exactly against the 23,885-row universe the document names.
docs/analysis/code/coverage/attr-vtable.md	confirmed	1,375/489/886, 289/7/193, 13,577 rows, 313,856/564,728, 12,202 new / 4,728 new A and the full anchor table are exact, and 13,577/13,577 slots re-read true from the image.
docs/analysis/code/coverage/precision-A.md	confirmed	120 rows, 28 correct / 1 wrong / 91 no-evidence, and the combined 48/5/227 with 48/53 = 90.6% all match the TSV pair.
docs/analysis/code/coverage/precision-B.md	confirmed	160 rows, 20/4/136 and every per-label triple match `precision-B.tsv` exactly.
docs/analysis/code/batchA-classname-xref.md	stale	The 771-row table sums to 58,818 insns = 1.12% exactly, but the prefix-remap headline is now 161/363 = 44.4% with the current 225-entry map, not 151/362 = 41.7%.

18 documents: 11 confirmed, 5 contradiction, 2 stale, 0 unverified.
