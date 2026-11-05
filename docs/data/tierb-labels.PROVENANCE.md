# tierb-labels.csv — provenance and limits

Regenerated 2026-11-06 by `MHGU/tools/mhgu/tierb-merge.py`. This file replaces the `pre-66e12a5`
snapshot that held **378** rows; the old rows are all still present and none of their labels changed
(the check that gated the replacement: `onlyCommitted=0`, `labelChanged=0`).

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
  --patterns "tierB-slice-*.md,tierB2-slice-*.md,tierB3-slice-*.md" \
  --out MHGU/docs/data/tierb-labels.csv \
  --conflicts MHGU/docs/data/tierb-labels.CONFLICTS.tsv
```

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
| conflicts listed | 29 | **85** (21 label-only, 56 conf-only, 8 both) |

- 40 rows changed confidence, 1 changed label: `0x69c258` unknown/A -> **quest/B**. Its A row cited the
  `areaacttbl` string; a later B row records that the string is not referenced in the body, so the A was
  unsupported. That is exactly the W6-P124 defect, now prevented by construction.
- The five W6-P124 rows (`0x396e40`, `0x658ae8`, `0x362438`, `0x381738`, `0x18ecb0`) are all **B** here.
- Label disagreements are still **29** (21 label-only + 8 that also differ in confidence), which matches
  the count W6-P123 was opened with.

## What this file is NOT

- **Not a complete inventory.** 3,162 of 14,863 Tier B functions (21.3%). Absence of a vaddr here means
  "no slice labelled it", never "not Tier B".
- **Not a resolution of disagreements.** 29 vaddrs carry two different labels across slices; the table
  keeps the **first** occurrence and every duplicate is listed in `tierb-labels.CONFLICTS.tsv`
  (`vaddr, kept, other_labels, sources`). The merge never silently picks a winner.
  These 29 are exactly the W6-P123 judgement items; `0x3d15a4` and `0x69eb18` are the A-vs-A pairs.
- **Not verified semantics.** Labels come from the slice reports (call-graph votes, string references),
  not from reading each function. A/B/C is the slice author's confidence, not a measurement here.

## Related open items (unchanged by this regeneration)

- `W6-P122`: 14 slice summaries contradict their own tables — not touched here.
- `W6-P124`: 5 A-level rows cite evidence strings that are not referenced inside the function body.
- `W6-INV5`: `verdict-14_20`-style tables show `none` where the count should be `36,113`.
- `W4-PH3`: the `hunterA` 8 markers need a bitstream origin/width decision before any label is defensible.
