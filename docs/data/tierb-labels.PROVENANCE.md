# tierb-labels.csv — provenance and limits

Regenerated 2026-11-06 by `MHGU/tools/mhgu/tierb-merge.py`. This file replaces the 378-row snapshot
committed in `e3b1ccf`; **0 old rows were lost**, and exactly **1** changed label:
`0x69c258` `unknown`/A -> **`quest`/B** (the weakest-merge outcome; its A row's `areaacttbl` string is
not in that function body - see `tierb-labels.ADJUDICATION.tsv`). **7** rows changed confidence
(`0x18ecb0`, `0x18f07c`, `0x18f998`, `0x1990dc`, `0x623748`, ...). Every other row is bit-identical
in `label`/`role`/`conf`.

Re-derive with the tool's own gate (added 2026-11-06 after this claim was found to be untrue):

```
git show e3b1ccf:docs/data/tierb-labels.csv > G:/tmp/base.csv
py -3 MHGU/tools/mhgu/tierb-merge.py \
  --dirs "docs/analysis/code/inventory/slices/reports-mhgu,docs/analysis/code/inventory/slices/w6-pass12" \
  --labels "reports-mhgu,w6-pass12" \
  --patterns "tierB-slice-*.md,tierB2-slice-*.md,tierB3-slice-*.md" \
  --out G:/tmp/tb-new.csv --base G:/tmp/base.csv
```
-> `base 378 rows -> lost 0, label changed 1, conf changed 7`, and the output is byte-identical to
the committed CSV (`sha256 02207d5a…`).

> A previous revision of this paragraph cited `onlyCommitted=0, labelChanged=0` and a snapshot named
> `pre-66e12a5`. Both were wrong: `tierb-merge.py` had no such gate (the numbers came from an ad-hoc
> check that read the wrong baseline), the ref does not exist in this repo's history, and the real Δ is
> the 1 label change above.

## Inputs (29 slice reports, 2 directories)

All 29 are valid UTF-8 (checked: GBK decoding fails on them). The tool now reads strict UTF-8 and only
falls back to GBK with a warning — the previous `errors='ignore'` would have dropped bytes silently,
which would corrupt the `evidence` column without any signal. Published output contains 0 replacement
characters and 3,075 rows with non-ASCII (Chinese) evidence.

| directory | patterns | files |
|---|---|---:|
| `MHGU/docs/analysis/code/inventory/slices/reports-mhgu` | `tierB-slice-*.md`, `tierB2-slice-*.md` | 12 |
| `MHGU/docs/analysis/code/inventory/slices/w6-pass12` | `tierB-slice-*.md`, `tierB2-slice-*.md`, `tierB3-slice-*.md` | 17 |

These are vendored copies of the working reports that used to live only in gitignored directories
(`.tmp/reports-mhgu` and `MHGU/.tmp/w6-pass12/new`). A table that claims to be reproducible may not
depend on a directory the repo ignores, so the 29 inputs are now tracked next to it.

**Trap worth knowing:** three basenames exist in *both* directories with **different content**
(`tierB-slice-03.md`, `-05.md`, `-08.md`). The merge reads all of them, so the `src` column alone
(basename only) does not identify a row's origin when the name appears twice.

The old glob only saw the first directory's `tierB-slice-*.md`, which is why the published table had been
stuck at 378 rows.

## Numbers (as produced, re-runnable)

```
slice files: 29
parsed rows (deduped): 3162
coverage of Tier B: 3162 / 14863 = 21.3%
conf A/B/C: 53/1797/1312          (policy weakest; 90/1763/1309 under policy first)
unknown: 228 = 7.2%
disagreements listed: 85          (label-only 21, conf-only 56, both 8 -> 29 involve a label)
```

Reproduce:

```
cd "G:/omp works"
py -3 MHGU/tools/mhgu/tierb-merge.py \
  --dirs "MHGU/docs/analysis/code/inventory/slices/reports-mhgu,MHGU/docs/analysis/code/inventory/slices/w6-pass12" \
  --labels "reports-mhgu,w6-pass12" \
  --patterns "tierB-slice-*.md,tierB2-slice-*.md,tierB3-slice-*.md" \
  --out MHGU/docs/data/tierb-labels.csv \
  --conflicts MHGU/docs/data/tierb-labels.CONFLICTS.tsv
```

`--labels` pins the `src` prefix per input directory. Without it the prefix is the physical directory
name, so running from the working tree (`.tmp/…` and `…/new`) vs the vendored copies would produce
different `src` values for the same rows — 1,496 rows differed that way on 2026-11-06 before the flag
existed. With it, both trees produce byte-identical output.

## Duplicate policy (changed 2026-11-06)

When the same vaddr appears in more than one slice, the merge keeps the **weakest** claim
(`--policy weakest`, the default): A is a stronger claim than B, C the weakest. Other choices:
`--policy first` (what the tool did before), `--policy last`.

Why weakest: within one file the later row is usually a *demotion*, and across passes the later pass is
the correction — but neither ordering is guaranteed, and `first` **re-promoted** `0x18ecb0` to A although
pass1 had already demoted it to B. Publishing the weakest claim is the only rule that cannot resurrect
evidence an earlier audit rejected.

Effect of the change (measured against the `--policy first` output of the same inputs):

| | first | weakest |
|---|---:|---:|
| rows | 3,162 | 3,162 |
| conf A / B / C | 90 / 1,763 / 1,309 | **53 / 1,797 / 1,312** |
| disagreements listed | 85 | 85 |

Both policies list the same 85 disagreements (21 label-only, 56 conf-only, 8 both); only `0x69c258`
flips its kept label between them. **29** is the label-involving subset (21 + 8), not a total — an
earlier version of this table printed 29 in the `first` column, conflating the two.

Column caveat: the `evidence` column is CSV-quoted and the writer replaces `"` with `'` (`119` rows are
affected), so it is a readable copy of the slice prose, not a byte-preserving one. And because evidence
text contains commas, **1,828 of the 3,163 lines do not split into 6 fields on `,`** — parse with a real
CSV reader. Rows are emitted sorted by vaddr.

- 40 rows changed confidence, 1 changed label: `0x69c258` unknown/A -> **quest/B**. Its A row cited the
  `areaacttbl` string; a later B row records that the string is not referenced in the body, so the A was
  unsupported. That is exactly the W6-P124 defect, now prevented by construction.
- The five W6-P124 rows (`0x396e40`, `0x658ae8`, `0x362438`, `0x381738`, `0x18ecb0`) are all **B** here.
- Label disagreements are still **29** (21 label-only + 8 that also differ in confidence), which matches
  the count W6-P123 was opened with.

## Adjudication (2026-11-06)

`tierb-labels.ADJUDICATION.tsv` holds a byte-level verdict for all 29 label-involving conflicts
(`vaddr, kept, other, verdict, reason`), produced by disassembling each function and resolving the
cited strings and call sites. Tally: **1 KEEP, 2 VOCAB, 26 `[U]`**.

- `KEEP` = the bytes support the kept label (`0x3d15a4` stays `quest`; the `kernel-os` reading is refuted -
  the body is nine `strcmp` sites over `[WORK0]..[WORK7]`, with no thread or scheduler construct).
- `VOCAB` = the two labels are the same subsystem under two vocabularies (`save-io` vs `save-data`).
- `[U]` = not decidable from the bytes; 3 of those also have a refuted alternative, and 2 cite evidence
  that is impossible for the function quoted.

**This table does not apply the verdicts.** The CSV above remains a faithful merge of the slice tables;
a row the adjudication marks `[U]` keeps whatever its slices said. Applying a verdict means editing the
slice table (or adding an override mechanism), which is deliberately not done here.

## Known gaps in the inputs (measured 2026-11-06)

Several slice tables are **truncated relative to their own stated scope**, so 3,162 rows is a **floor**,
not the number of adjudications that exist:

| slice (each present in both input dirs unless noted) | rows in the table | stated scope |
|---|---:|---:|
| `tierB2-slice-04` | 30 | 120 |
| `tierB2-slice-06` | 60 | 120 |
| `tierB2-slice-09` | 30 | 120 |
| `tierB2-slice-10` | 90 | 120 (`reports-mhgu` only) |
| `tierB-slice-09` | 0 (table never started) | — |
| `tierB3-slice-06` | 60 | — |

If those tables were completed the table could grow by roughly 240 rows before any new adjudication is
done. The repair pass (W6-P122) marked every such case `[NEEDS-SOURCE]` and did not invent the missing
rows, so treat the coverage figure as "at least 21.3%".

## What this file is NOT

- **Not a complete inventory.** 3,162 of 14,863 Tier B functions (21.3%). Absence of a vaddr here means
  "no slice labelled it", never "not Tier B".
- **Not a resolution of disagreements.** 29 vaddrs carry two different labels across slices; the table
  keeps the **weakest** claim (see "Duplicate policy" above) and every disagreement is listed in
  `tierb-labels.CONFLICTS.tsv`
  (`vaddr, kept, other_labels, sources, confs, kind`). The merge never silently picks a winner.
  These 29 are exactly the W6-P123 judgement items; `0x3d15a4` and `0x69eb18` are the A-vs-A pairs.
- **Not verified semantics.** Labels come from the slice reports (call-graph votes, string references),
  not from reading each function. A/B/C is the slice author's confidence, not a measurement here.

## Related items and their state after this regeneration

- `W6-P122`: 14 slice summaries contradicted their own tables — **closed 2026-11-06**: 97 contradictions,
  61 repaired, 32 marked `[NEEDS-SOURCE]` (the table itself is truncated), 4 deferred. Acceptance was
  re-running the merge: the CSV came out byte-identical, so no table row moved. The repaired slices are
  vendored under `docs/analysis/code/inventory/slices/` (29 files, verified identical to the working copies).
- `W6-P123`: 29 label-involving conflicts — **adjudicated 2026-11-06**, see
  `tierb-labels.ADJUDICATION.tsv`: **1 KEEP, 2 VOCAB, 26 `[U]`**. The CSV is deliberately not overridden.
- `W6-P124`: 5 A-level rows cited strings their function body never references — **closed for this table**:
  under the weakest policy all five are B, and the slice files themselves are unchanged (historical record).
  The upstream cause turned out to be a tool defect, filed as `W6-P126`.
- `W6-P126`: `functions-retile.csv.gz`'s `strings` column (and the A-screen `nstr`/`hit`) attributes a
  push-less leaf getter's string to the *preceding* function — 6 of the 7 string-citing conflict rows are
  contaminated. Do not re-use `nstr`/`hit` as a gate until this is fixed.
- `W6-P127`: `class-inventory.tsv`'s `registrar_fn` is wrong for 7/7 sampled classes (`registrar_site` is right).
- `W6-P128`: slice callee/vote counts are not reproducible from the bytes (18-instruction functions credited
  with 8-23 callees; a 45-vote distribution for a function with one caller).
- `W6-INV5`: `verdict-14_20`-style tables showed `none` where the count should be `36,113` — **closed**:
  the file already reads 36,113 and `class-from-code.mjs` prints `none=36113`.
- `W4-PH3`: the `hunterA` 8 markers — **measured 2026-11-06, left `[U]`**: the two snapshots differ in
  exactly 5 runs / 32 bytes (`2057..2059`, `2270..2275`, `2292..2294`, `6332..6341`, `7519..7528`); the
  three contested readings (`2400-2403`, `2900-2903`, `2016-2023`) all point at bytes that are identical in
  both files, so none of them can be the edit. Evidence: `docs/analysis/audit/W4-PH3-hnt-diff.md`.
