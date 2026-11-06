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
slice files: 30
parsed rows (deduped): 4003
coverage of Tier B: 4003 / 14863 = 26.9%
conf A/B/C: 55/2034/1914           (policy weakest; 90/1763/1309 under policy first, measured on the 3,162-row table)
unknown: 277 = 6.9%
disagreements listed: 85          (label-only 21, conf-only 56, both 8 -> 29 involve a label)
```

The step from 3,162 to 4,003 is `tierB-slice-09` (841 rows, written 2026-11-06); the 85 disagreements did
not change, because the assembler drops a row whose vaddr another slice already adjudicates rather than
letting the merge report an intentional repeat as a conflict.

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
| `tierB-slice-09` | **841** (written 2026-11-06; `reports-mhgu` only) | 1,062 (`0x72aa48..0x80c93c`, header line 1) — 221 of those already carried a row in another slice, so 841 was the new ground |
| `tierB3-slice-06` | 60 | — |

If those tables were completed the table could grow by **1,332 rows** (`90 + 60 + 90 + 30 = 270` across
`tierB2-slice-04/06/09/10` plus `1,062` in `tierB-slice-09`, bringing Tier B coverage to ~`30.2%`) before
any new adjudication is done (earlier drafts miscounted the four `tierB2` slices as `240` and omitted
`tierB-slice-09`'s `1,062`). The repair pass (W6-P122) marked every such case `[NEEDS-SOURCE]` and did not
invent the missing rows, so treat the coverage figure as "at least 21.3%".

**That `1,332` is not reachable as written — corrected 2026-11-06 by measurement.** Two independent facts
cut it down: the pools overlap (221 of `tierB-slice-09`'s `1,062` functions already carry a row in another
`tierB*` table, so only **841** are genuinely new, and a repeat would surface as a label disagreement rather
than new coverage), and the four `tierB2` pools no longer exist (below). So the reachable target from the
derivable part alone is `3,162 + 841 = 4,003`, i.e. **`4,003 / 14,863 = 26.9%`**, not `4,494 / 30.2%`.

### The missing rows cannot be recovered, only decided (W6-P135, measured 2026-11-06)

The `1,332` above is the *size of the gap*, not a set of known addresses. The per-table 120-member samples
the four `tierB2` tables were drawn from no longer exist: every published vaddr is absent from all 14
`.tmp/mhgu/tierB2/slice-*.txt` (best overlap `0/30`, `0/60`, `0/30`, `0/90`), those lists were themselves
regenerated over unrelated ranges (`tierB2/slice-04.txt` now self-describes as "pass2 slice 14 —
120 functions, `0x134d3d8..0x49406c`" while the table states `0x6b3460..0x13b8d1c`), no rule reproduces them
(top-N by insns: `0/30`, `6/30`, `0/30` and `1/60`, `0/60`, `0/60`), and
`docs/analysis/code/tierb-pass2/tierB2-slice-06.md:3` already recorded it.

**But the pool survives — corrected 2026-11-06 by re-running the gate over the right directory.**
`.tmp/mhgu/tierB/slice-01..14.txt` (TSV: `vaddr | insns | callers | callees | callee_label_votes |
strings(<=5)`) contains **210 of 210** published vaddrs (30/30, 60/60, 30/30, 90/90). They are spread across
all 14 lists, so no single list is "the" table and the list numbering does not map to the table numbering —
but the candidate pool, with its votes and strings, is on disk. Reuse caveats: the `insns` column predates
the W6-P133b cap fix and the `callees` column predates W6-P128, so take both from `fn-body.mjs`.
`tierB/slice-09.txt` line 1 is verbatim the `tierB-slice-09` scope ("Tier B slice 09 — 1062 functions,
addr `0x72aa48..0x80c93c`") and holds exactly 1,062 data rows, independently corroborating tiers.csv.

So a completion pass is **additive by a stated rule**, not a recovery. Before it runs, the pool rule must be
written into the table header *and* here, and the rows it adds must not be described as the original sample.
The `21.3%` stays a coverage fraction ("no slice labelled it"), never a precision estimate — see
"What this file is NOT".

### tierB-slice-09: 841 rows, and what they are worth (written 2026-11-06)

`docs/analysis/code/inventory/slices/reports-mhgu/tierB-slice-09.md` now holds 841 adjudications. The pool
rule is in its header and is reproducible: tier-B rows of `tiers.csv` in `0x72aa48..0x80c93c` (1,062),
minus every vaddr another slice already adjudicates (221), = **841**. Two independent facts pin the 1,062:
`tiers.csv` itself, and `.tmp/mhgu/tierB/slice-09.txt` whose line 1 reads "Tier B slice 09 — 1062 functions,
addr `0x72aa48..0x80c93c`".

How the rows were produced, so a later reader can judge them:

- Evidence was recomputed per function, never inherited: CFG body from `tools/mhgu/fn-body.mjs`, callees
  from that body only (not from `functions-retile.csv.gz` col 5, which W6-P128 showed includes calls after
  the function's own exit), strings from `stringxref.mjs --dump-json` (`via=code`, this exact start only),
  and callee labels from `function-labels.tsv` with the generic accessor family flagged.
- `tools/mhgu/slice-pack.mjs` built the packs; `tools/mhgu/slice-rows-audit.mjs` re-checked **every cited
  field offset and constant against the function's own bytes**: 928 rows audited, 873 fully resolved,
  **0 fabricated**; the 55 that the resolver cannot model cite a *composed* effective offset (base + index)
  or a constant assembled across more than one `movw`/`movt` pair, and each is listed by `--verbose`.
  Three pack-rendering defects were found by the reviewers on the way and fixed before the final packs:
  a media-instruction mask that printed `uxtb` as a struct field, a `movt` immediate that dropped its low
  12 bits, and a rotated immediate printed raw (`cmp r6,#65536` as `#34817`).
- **What these rows are not.** 272 of the 928 (29.3%) are conf C *and* carry exactly the `pool_label` the
  pack supplied; their evidence says so rather than inventing support. They extend coverage, but they must
  not be counted as independent confirmation of the propagation — the vote labels themselves come from
  `function-labels.tsv`, which is largely propagation. Only 2 rows are conf A (both cite a real string:
  `"Manager-%d"` at 0x7bbce0 and `"Memory Pool Initialization Error"` at 0x7bd638).

**Scope of that loss — the four `tierB2` tables only.** `tierB-slice-09` (the `1,062`) is *not* affected:
`tiers.csv`, the 23,885-function table the pass actually ran on, holds exactly **1,062 tier-B functions** in
`0x72aa48..0x80c93c`, so its pool is re-derivable verbatim. (`tiers-merged.csv` holds 1,176 B + 238 C + 141 A
= 1,555 in that range, which is why testing the modern table appears to contradict the stated scope.)
Corroboration already in the repo: `docs/analysis/audit/ROUND1-ALL.tsv:376` — "tiers.csv tier-B in
`0x72aa48..0x80c93c` = 1062 (规模声明准确)"; `docs/analysis/audit/W6-PASS12.md:455` — 1,554 retile
functions there.

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
- `W6-P127`: `class-inventory.tsv`'s `registrar_fn` pointed at an ancestor for `3,143 / 3,200` classes (`registrar_site` was right) — **closed 2026-11-06** by `tools/mhgu/class-inventory-fix.mjs` (anchored on `sFestaResource -> 0x3def5c`, `cResourceSample -> 0x3818cc`).
- `W6-P128`: slice callee/vote counts include calls after the function's own return (`3,012 / 52,692` functions differ; side-by-side table published at `docs/data/functions-callees-body.tsv.gz` by `tools/mhgu/callees-body.mjs` without altering `functions-retile.csv.gz` column 5).
- `W6-INV5`: `verdict-14_20`-style tables showed `none` where the count should be `36,113` — **closed**:
  the file already reads 36,113 and `class-from-code.mjs` prints `none=36113`.
- `W4-PH3`: the `hunterA` 8 markers — **measured 2026-11-06, left `[U]`**: the two snapshots differ in
  exactly 5 runs / 32 bytes (`2057..2059`, `2270..2275`, `2292..2294`, `6332..6341`, `7519..7528`); the
  three contested readings (`2400-2403`, `2900-2903`, `2016-2023`) all point at bytes that are identical in
  both files, so none of them can be the edit. Evidence: `docs/analysis/audit/W4-PH3-hnt-diff.md`.
