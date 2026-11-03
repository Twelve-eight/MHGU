# MHGU research

Reverse-engineering notes and tools for **Monster Hunter Generations Ultimate (Switch, v1.4.0)**:
save-file layout, a code map, monster mechanics, an item-box expansion patch, and a save editor.
The goal is to help more people play MHGU with more variety, on emulators and on the native
recompiled build ([SUYU-GURecomp](https://github.com/GUReComp/SUYU-GURecomp)).

Nothing here ships game code, keys, game files, or save files. One tracked artefact needs a precise
qualification: `docs/data/functions*.csv.gz` carry a `strings` column holding short printable
runs lifted from the binary (function and class names). 51 of their rows also contain Nintendo NEX
SDK symbol fragments (`Nex`, `nn::`); they are third-party strings that came out of the same
extraction. The column is what the coverage pipeline reads, so removing it would break
reproducibility without changing a single number; see `docs/PUBLISH-READINESS.md` for the two ways
to deal with it. Everything else the repository ships is a claim: that its numbers can be
recomputed. The two sections below name the numbers and the commands.

## What is established, and what is not

Two calibres are reported for the code side, and they are not interchangeable. Both run from the
tracked files alone - no game image, no save file, no database:

| Calibre | Result | Command | What it prints |
|---|---|---|---|
| The project's original goal (`HANDOFF.md` §5): Tier A (verified) + Tier B conf=A over `.text` instructions | **58.0%** of instructions | `node tools/mhgu/coverage/canonical-metric.mjs` | `Tier A verified 25584 functions, 57.7% of instructions`, `Tier B conf=A 74 functions, 0.3% of instructions`, `canonical total 58.0% (target >= 90%, not met)` |
| Every label measured at >= 90% precision on its own population | **66.2%** of instructions, **53.5%** of functions | `node tools/mhgu/coverage/independent-coverage.mjs` | the partition row by row, then `covered at >=90% independently: 3460532 = 66.19% of instructions` and `PASS independent recomputation reproduces the report partition` |

**The 90% target is not met.** It is defined on the first calibre, which stands at 58.0%; the
stricter second calibre reaches 66.2% of instructions. Neither figure is a claim of semantic
understanding: a label says which subsystem a stretch of code belongs to (`monster-em`, `quest`,
`ui`, ...), not which rule it computes - `docs/PROGRESS.md` states that gap in one line. The only
number authority is `docs/analysis/code/coverage/METER.md`; where another document disagrees with
it, the meter wins. `docs/analysis/code/inventory/coverage-report.tsv` carries the rows both
commands read back.

Save side: 87.8% of the 1,177,760-byte `.hnt` hunter block is mapped structurally and about 14.9%
at field level (`docs/PROGRESS.md`). Those two figures are arithmetic over measurements taken from
private save snapshots, so they cannot be recomputed from a clone.

## Where the work stands

Numbers below are the ones a reader can check against the artefacts named beside them; the ones
that cannot be checked say so.

| Area | State | Evidence |
|---|---|---|
| Code coverage | **58.0%** of instructions under the project's original calibre; **66.2% / 53.5%** under the stricter per-label >= 90% calibre. Target 90%, **not met** | the two commands above |
| Function table | 52,692 functions over 5,228,277 instructions, rebuilt from a 23,885-region tiling; 3,201 classes | `docs/analysis/code/inventory/RETILE.md` |
| Save layout | 87.8% of the 1,177,760-byte hunter block mapped structurally, ~14.9% at field level | `docs/save-layout/coverage-map.md` |
| Monster mechanics | 53 state tables over two constants, 60 documented sections, 1,223 state rows, 119 with a motion name (9.7%); 3,429 dispatch sites in 2,546 functions; 137 authoritative slots | `docs/mechanics/` |
| Data | 39 tables, 129 monsters, 21,153 items, 1,355 quests | `docs/data/README.md` |
| Wiki pages | 42 of 47 reproduce their numbers exactly against the database and the ROM | `docs/analysis/audit/W4-WIKI.md` |
| Reference guides | 78 of 92 claims confirmed, 12 contradictions, 2 unverified by construction | `docs/analysis/audit/W4-REFERENCE.md` |
| Tools | 138 scripts: 7 run with no game input, 4 need the database, 2 need saves, 42 need the image, 83 need an intermediate artefact | `docs/analysis/audit/PUBLISH-TOOL-DEPS.md` |
| Audit ledger | **73 fixed, 6 open, 4 rejected, 1 unresolved, 1 reverted** over 250 tracked documents | `docs/analysis/audit/LINK-STATUS.tsv` |

Two things this table deliberately says: the 90% target is not met, and the review is not finished.
"Rejected" means the finding was wrong, not that the document was right; "unresolved" means three
readings disagree and none has been adopted.

## What comes next, in order

1. **Finish the sweep.** Every document cluster gets one pass against its artefacts; the open items
   in `LINK-STATUS.tsv` are what remains of the last two passes. A number that cannot be recomputed
   from the repository is demoted to history, not defended.
2. **Settle the two publication questions.** (a) `tools/mhgu/vendor/` (101 MIT files) sits in
   unpushed history; either add a NOTICE with attribution or rewrite those commits before the next
   push. (b) the `strings` column of `docs/data/functions*.csv.gz` carries 51 rows with third-party
   SDK symbol fragments; strip or keep, but the README must say which.
3. **Re-run the two headline commands and the gate after every change** — they are cheap, and a
   document that stops matching them is the failure mode this project has hit most often.
4. **Live verification, which needs a person.** The editor, the DLC page and a save round-trip
   cannot be driven by keyboard automation (tried, documented in `DEVLOG.md`); they need someone at
   the machine with the game running.
5. **Push only after steps 1-2.** The public branch is 251 commits behind the working tree.

## Which numbers need the game image, and which do not

The image is `main.140.flat.bin`, a 25 MB flat dump of the game's ExeFS `main`. It is not
distributed (see "Producing the game image" below).

| Number | Needs the image? | Source of the number |
|---|---|---|
| 58.0% canonical calibre | **no** | `canonical-metric.mjs` reads `coverage-report.tsv`, `tiers-merged.csv`, `functions-retile.csv.gz`, the `demote-*` tables and the `tierb-pass*` slices, all tracked |
| 66.2% of instructions / 53.5% of functions at >= 90% precision | **no** | `independent-coverage.mjs` reads the 24 evidence tables listed in `sources.json`, `tiers-merged.csv`, `functions-retile.csv.gz` and the `tierb-pass*` slices, all tracked |
| 52,692 functions / 5,228,277 instructions (the denominator) | **no** | the tracked `docs/data/functions-retile.csv.gz` |
| 22,957 evidence rows re-checked, 100% | **yes** | `tools/mhgu/coverage/verify-evidence.mjs`, run as gate 6 of `tools/audit/check.mjs` |
| function-table rebuild (`retile`, `stringxref`, `fingerprints`, `vtable-scan`, `immscan`) | **yes** | five of the eighteen scripts in the `METER.md` command block; the other thirteen run from tracked tables (`form-classify`, outside that block, also reads the image) |
| 87.8% structural / 14.9% field level (save side) | no image, but two private save snapshots | `tools/mhgu/mon/size-final.mjs` |
| 129 monsters / 21,153 items / 1,355 quests | no image, but the untracked 18 MB `docs/data/mhgu.db` | `docs/PUBLISH-READINESS.md` |

`node tools/audit/check.mjs` runs the tree's own 12 gates; on a complete tree it prints twelve
`PASS` lines and `ALL PASS`. Two gates read inputs that are not distributed: gate 6
(`verify-evidence.mjs`) reads the image and fails with `ENOENT` when it is absent, so it is the one
gate that cannot run from a clone, while gate 12 reads `docs/data/mhgu.db` and prints a
`note ... skipped` line when it is absent. A skipped gate is not a passed one.

## Where to start reading

1. This file, up to here.
2. `docs/analysis/code/coverage/METER.md` - the number authority. Read the banner, then the
   section "覆盖线（三次更正）" ("the coverage line, three corrections"), which is the record of
   every number that was withdrawn and why.
3. `docs/PROGRESS.md` - one page: what is done, what the gap is, in what unit.
4. `docs/analysis/audit/LINK-STATUS.tsv` - every disagreement a review reported and its
   disposition (`fixed` / `open` / `rejected`) with one line of evidence.
5. `docs/README.md` - the index of `docs/`.
6. `HANDOFF.md` - the long form: method, per-subsystem evidence, open questions. §5 defines the
   calibre; §9 is written for the author's own agent sessions, not for a reader.

## What is in the repository

| Path | What |
|---|---|
| `docs/` | Findings (index: `docs/README.md`). Addresses are NSO vaddrs; `flat_off = vaddr + 0x100`. |
| `docs/PROGRESS.md` | State of the work and the gaps, one page. |
| `docs/analysis/code/coverage/METER.md` | The coverage meter: every code number, its calibre, and the corrections behind it. |
| `docs/analysis/code/inventory/` | The tables the meter reads back: function labels, tiers, `coverage-report.tsv`. |
| `docs/analysis/external/` | Facts checked against SUYU-GURecomp (GPL-3.0): addresses and formats only, restated in our own words, with citations. No GPL code. |
| `docs/analysis/audit/` | Audits of these documents, `LINK-STATUS.tsv` dispositions, `MANIFEST.tsv`. |
| `docs/data/` | The numeric base for the mechanics pages - see "What a clone does not contain". |
| `tools/mhgu/` | Disassembler, inventory and analysis scripts (Node + Python). |
| `tools/mhgu/coverage/` | The meter pipeline; the two no-image commands above live here. |
| `tools/audit/check.mjs` | The 12-gate check over the tree. |
| `HANDOFF.md` | Long-form hand-off: method, evidence, open questions. |
| `DEVLOG.md` | Dated work log: what changed, what was withdrawn and why. Read the last section, not the file. |
| `patch/1.4.0.pchtxt` | Item-box expansion patch (emulator / console; not applicable to the recompiled build). |
| `forge/` | Item-box forge experiments (debug port, box probe, v7 build). |
| `editor/` | Save editor sources (`editor/core`, `editor/ui`, `editor/test`). |

## Producing the game image (only if you own the game)

Tools that read the code expect the image at `<repo>/main.140.flat.bin`, flattened with a 0x100-byte
header pad so that `flat_off = vaddr + 0x100`:

1. Extract the base NCA's ExeFS `main` (an NSO0) with `hactool` and your own `prod.keys`. The
   repository does not say where to obtain either.
2. Check the NSO build id at offset 0x40: it must be `FB08F1D20FD1204FE7070672777F869B`, the id
   `patch/1.4.0.pchtxt` is written against. Every number in this repository describes that build.
3. `node tools/mhgu/nso-flat.mjs <your exefs/main> main.140.flat.bin`
4. `tools/mhgu/arm32.mjs` (the shared reader) and `tools/mhgu/reader-fields.mjs` default to
   `<repo>/main.140.flat.bin` and accept `FLAT=<path>`; `verify-evidence.mjs` (gate 6) always reads
   `<repo>/main.140.flat.bin`. Six older scripts still carry the author's scratch path and have to
   be edited before they run on another machine: `fn-cluster`, `func-inventory5`,
   `member-reader-trace`, `state-motion2`, `state-motion3`, `vtable-crc`.

## What a clone does not contain

`docs/PRIVATE-DATA.md` lists every path that is linked in only on the author's machine. The ones
that change what you can run:

| Missing input | What breaks without it |
|---|---|
| `main.140.flat.bin` (25 MB) | every tool that reads code: the disassembler, the five image scripts of the meter chain, `form-classify`, and gate 6 of `check.mjs`. The two headline commands above keep working. |
| `docs/data/mhgu.db` (18 MB, a community extraction) | the mechanics pages and their counts (129 monsters / 21,153 items / 1,355 quests) cannot be re-derived; gate 12 prints a note and skips. |
| `save-snapshots/` | the save-side figures (87.8% structural, 14.9% field level) cannot be recomputed - `tools/mhgu/mon/size-final.mjs` reads two fixed snapshots - and `editor/test/roundtrip.mjs` has no samples to round-trip. |
| `docs/data/json/*`, `docs/data/{armor,weapons,viewer}/` | the derived data pages lose their inputs; `mhgu.db` is authoritative for those tables. |
| `docs/reference/mhxx-wiki/` | the third-party wiki used for cross-checking. No conclusion rests on it alone (`docs/README.md` marks it as cross-validation only). |
| `editor-src/` | nothing in the pipeline: it is a third-party editor's decompiled sources, kept locally, and no tracked script reads it. |

## License
- Code and tools: GPL-3.0-or-later (`LICENSE`). Relicensed from MIT on 2026-10-24.
- Documentation under `docs/`: CC BY 4.0 (`docs/LICENSE`).
- Monster Hunter is a trademark of Capcom. Not affiliated with Capcom or Nintendo. Game data
  facts (addresses, field layouts) are described for interoperability.
