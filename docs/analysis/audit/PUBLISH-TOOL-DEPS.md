# Harvested from the agent's local:// report on 2026-11-04; the agent's write device refused working-tree paths.

# PUBLISH-TOOL-DEPS — dependency and reference audit of `MHGU/tools/**`

Ticket: "Build the dependency table for every script under `tools/` (all .mjs/.js/.py)".
Scope: `G:/omp works/MHGU/tools` (138 scripts). Read-only; every claim below comes from a `read`/`glob`/`grep`
call whose output is quoted or cited inline.

## Method (and what "run" means here)

* Inventory: `glob MHGU/tools/**/*.{mjs,js,py}` + one `read <dir>` per directory (complete listings, 138 files).
* Per file: `read <path>:1-N` on the head (header comment + `const ROOT/OUT` block) and, where the head was not
  decisive, a range read of the body or tail.
* Cross-cutting greps over `MHGU/tools`: `main\.140\.flat\.bin|mhgu\.db|save-snapshots` (3 pages, 53 files),
  `functions\.csv\.gz|functions-retile|tiers(-merged|-recomputed)?\.csv|sources\.json|bblocks|bsamples` (70 files),
  `MHGU-private|mhgu-romfs|G:/tmp|\.tmp/` (45 files), `writeFileSync|appendFileSync|createWriteStream` per
  directory, `ALL PASS|FAIL|assert|process\.exit`.
* Classification legend (one primary token per row; secondary needs in Notes):
  `RUNS-WITHOUT-IMAGE` = no game image / db / save needed; `NEEDS-IMAGE` = reads `main.140.flat.bin`;
  `NEEDS-DB` = reads `docs/data/mhgu.db` (via `node:sqlite`); `NEEDS-SAVE` = reads `save-snapshots/*`;
  `NEEDS-ARTEFACT` = reads any other non-repo or repo-generated artefact (romfs dump, `.tmp/**`, `docs/data/*.gz`,
  `docs/analysis/code/inventory/**`).
* **No tool was executed.** This session has no shell/`run` device (only `read`, `grep`, `glob`, `web_search`,
  `write`), so "not-run" applies to all 138 rows. Every input/output below is read from the source, not from a
  run; scripts that write to a fixed path are additionally marked "do not run bare" because running them mutates
  the tree.

---

# FACTS

## 0. The tree in numbers

```
MHGU/tools/ root ..................   4 scripts  (+ v7-shift.json, v7-shift-65.json: data, not scripts)
MHGU/tools/mhgu/ ..................  50 scripts  (40 at top level + 10 in mon/)
MHGU/tools/mhgu/coverage/ .........  71 scripts
MHGU/tools/audit/ .................   5 scripts
MHGU/tools/gu-moves/ ..............   2 scripts  (+ lib/ 5 modules)
MHGU/tools/mcp/ ...................   1 script
MHGU/tools/wiki-gen/ ..............   5 scripts
                                   ------------
                                    138 scripts
```
Command: `glob MHGU/tools/**/*.{mjs,js,py}` then one `read` per directory; the counts are the listing lengths
(`tools/mhgu` lists 40 `.mjs/.py` entries plus its `mon/` child with 10; `coverage/` lists 71 entries).
Python share: 15 files (`coverage-final.py`, `tierb-merge.py`, `decode-registry.py`, `mon/*.py` ×7,
`wiki-gen/*.py` ×5).

Non-repo inputs every outsider lacks (present in the working tree, git-ignored):

```
MHGU/main.140.flat.bin            24.3 MB   (glob with gitignore:false)
MHGU/docs/data/mhgu.db            18 MB     (glob with gitignore:false)
MHGU/save-snapshots/              2 dirs, 14 files: 6 × system* (4.9 MB) + 8 × *.hnt (1.1 MB)
MHGU/docs/data/json/              28 entries; items.json 15.9 MB, weapons.json 6.8 MB,
                                  quest_rewards.json 4.1 MB, gathering.json 2.7 MB, armor.json 1.2 MB
```
`MHGU/.gitignore` ignores `main.140.flat.bin`, `save-snapshots/`, `docs/data/mhgu.db`, `docs/data/json/*` (with
`!README.md`, `!monster-slot-map*.json` exceptions), `tools/mhgu/vendor/`, `.tmp/`.
`MHGU/docs/PRIVATE-DATA.md` states the root image and db are hard links and `save-snapshots/` a junction into
`G:/omp works/MHGU-private` (never pushed).

## 1. Dependency table — `tools/` root

| Tool | Inputs | Outputs | Class | Self-check | Notes |
|---|---|---|---|---|---|
| `tools/build-v7.mjs` | none (hardcoded site table) | none — prints `"V7 generator skeleton — needs full site list from reports"` | RUNS-WITHOUT-IMAGE | no | Dead skeleton; superseded by `build-v7-final.mjs`. Contains the V6/V7 `movw` words inline. |
| `tools/build-v7-final.mjs` | `tools/v7-shift-65.json` (read at line 60) | `patch/experimental-v8/1.4.0.pchtxt` (overwrite) | RUNS-WITHOUT-IMAGE | yes — `throw` if a word is not `movw` or the immediate is unmapped | Running it rewrites a tracked patch file. 83 lines. |
| `tools/box-slot-tool.mjs` | a save `.hnt` (CLI arg); base `632`, 2992 slots, pouch `10175`/32 | stdout for `read`/`used`; **in-place write** for `write` | NEEDS-SAVE | partial — rejects slot ≥ N, masks id/count | `write` mutates the save: do not run bare. Codec documented in `docs/editor-spec/02-items-equipment.md` (BOX-01…BOX-10). |
| `tools/dump-shift.mjs` | `globalThis.V7SHIFT` (never defined in the file) | `tools/v7-shift.json`, **unconditionally** | RUNS-WITHOUT-IMAGE | no | 119 bytes: `fs.writeFileSync(".../v7-shift.json", JSON.stringify(globalThis.V7SHIFT??[]))`. Run bare it overwrites a tracked file with `[]`. |

## 2. Dependency table — `tools/mhgu/` (format/tooling layer, 40 files)

| Tool | Inputs | Outputs | Class | Self-check | Notes |
|---|---|---|---|---|---|
| `mhgu/state-motion3.mjs` | `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` (line 2) | `docs/mechanics/monster-state-machine.md` | NEEDS-IMAGE | yes — `throw` on state-row count mismatch; writes a 4-point banner | The only writer of that doc. `N<=64` filter (line 26) documented in `LINK-MECHANICS-CODE.md:62`. |
| `mhgu/state-motion2.mjs` | same `.tmp` image | stdout | NEEDS-IMAGE | no | Superseded by v3; still cited by `docs/mechanics/monster-code-map.md:30` (see §5c). |
| `mhgu/export-dlc-table.mjs` | `docs/data/mhgu.db` (const `DB`), optional save `argv[3]` | `argv[2]` default `MHGU_DLC.txt` | NEEDS-DB (+SAVE optional) | no explicit gate | Uses `node:sqlite` `DatabaseSync`. 200 slots × 7168 B at save 0xF899. |
| `mhgu/export-item-table.mjs` | `docs/data/mhgu.db` | `argv[2]` (required) — editor's `MHGU_item(uni).txt` | NEEDS-DB | yes — `exit 1` on non-integer `_id` or a comma in a name | `node:sqlite`. Language column `LANG_COL` (default `name`). |
| `mhgu/mrl.mjs` | MRL v34 file / `.arc` (CLI) | stdout or `--json`; `texmap`/`corpus` scans | NEEDS-ARTEFACT (romfs asset) | yes — `check` (layout tiling + size identity), `selftest` with known-bad samples | 503 lines; library `readMrl`. |
| `mhgu/sdl.mjs` | SDL v22 file / `.arc`; `--exe main.140.flat.bin` optional | stdout/JSON; `verify` histogram | NEEDS-ARTEFACT | yes — `verify`, `selftest` (10 known-bad must fail) | 473 lines. |
| `mhgu/quest-ext.mjs` | `.ext` / `.qdl` (CLI), optional `--db` and KB tsv | JSON/TSV rows; `verify-db` report | NEEDS-ARTEFACT (+DB) | yes — `check`, `selftest [--tmp]`, `verify-db --expect n` | 978 lines; its selftest reads `G:/omp works/MHGU-private/romfs-extract/vital/...` (line 900). |
| `mhgu/guopus.mjs` | `.opus` (NX Opus container) + optional `vendor/opus-decoder`, `ffmpeg` | `.ogg` / `.wav`; `info/packets/verify` | NEEDS-ARTEFACT | yes — `verify`, `selftest` | 817 lines; needs `tools/mhgu/vendor/` (untracked) or an ffmpeg on PATH. |
| `mhgu/stqr.mjs` | romfs `sound/bgm` tree (`$MHGU_ROMFS` or `G:/mhgu-romfs/romfs/nativeNX`) | stdout / TSV | NEEDS-ARTEFACT | yes — `check` exits 1, `selftest` | 577 lines. |
| `mhgu/arm32.mjs` | `FLAT` env or `G:/omp works/.tmp/.../main.140.flat.bin` (line 5) | exports `buf`, `TEXT_END`, `disasm`, `findCallsTo`, `rd32…` | NEEDS-IMAGE | no | `readFileSync` at import time, so importing it without the image throws. Imported by `tierb-gen.mjs` (`import * as A from './arm32.mjs'`), `mcp/mhgu-re.mjs` (dynamic `import(...)`) and `gu-moves.mjs` (absolute `file:///` URL); `mon/quest-dispatch.mjs`/`ai-entry4.mjs` import it at a broken path (R5). |
| `mhgu/tex2dds.mjs` | TEX file (`<file.241f5deb>`) | `.dds` | NEEDS-ARTEFACT | partial — `throw` on bad magic | 62 lines; `FORMATS` table 0x07/0x13/0x17/0x19/0x1f. |
| `mhgu/mod.mjs` | MOD v212 file | stdout / `.obj` | NEEDS-ARTEFACT | partial — `throw` on magic/version | 127 lines; `info`, `obj --lod`. |
| `mhgu/dttune.mjs` | `*_dttune` file, optional `--db` | JSON on stdout | NEEDS-ARTEFACT | partial — prints `dbMatch` per table | 435 lines; `--raw`, `--db/--emid`. |
| `mhgu/dttune-all.mjs` | `G:/mhgu-romfs/.../arc/enemy` (const `ARC_DIR`), `docs/data/mhgu.db`, slot map, names JSON | `docs/data/json/monster-dttune-index.json`, `MHGU-private/romfs-extract/dttune-all/*`, `.tmp/reports-mhgu/dttune-all.md` | NEEDS-ARTEFACT (+DB) | yes — HP/damage/status cross-check vs db, `--no-write` | 814 lines. Default run writes into `MHGU-private/` and `.tmp/`. |
| `mhgu/emc.mjs` | `*_cmdtbl` file/dir | stdout (`--summary`) | NEEDS-ARTEFACT | partial — sections/entries printed | 153 lines; `parseEmc`, `decodeScript`. |
| `mhgu/dtbase.mjs` | `_dtbase`/`_dtbparts` file or `.arc` | JSON | NEEDS-ARTEFACT | partial — magic/version checked | 154 lines. |
| `mhgu/arts.mjs` | `hunterArtsData.hta` | stdout / TSV | NEEDS-ARTEFACT | partial — 8+191×25 == file size | 286 lines; spec `.tmp/reports-mhgu/arts-params.md` (absent). |
| `mhgu/rem.mjs` | `rem` (184 B) / `hagi` (346 B) or `.arc` | JSON | NEEDS-ARTEFACT | partial — terminator `00 00 00 FF` per group | 239 lines; `arc`, `hagi-arc`, `--json`. |
| `mhgu/hitdata.mjs` | weapon arcs `G:/mhgu-romfs/...`, gmd `MHGU-private/...`, extract dir | `docs/data/json/motion-values.json` (default) | NEEDS-ARTEFACT | yes — file length == 16+count×56 (throws), `--strict`, `--dry-run` | 416 lines; hardcoded defaults at lines 59-62. |
| `mhgu/vitaltbl.mjs` | a directory of `.arc` (CLI) | registry / hex dumps on stdout | NEEDS-ARTEFACT | partial | 90 lines; `crc32x` helper. |
| `mhgu/gmd.mjs` | `.gmd` file or dir | JSON per file + `index.json` | NEEDS-ARTEFACT | yes — failures counted in `index.json`, string count checked | 349 lines; magic-detected (works on `arc.mjs` members). |
| `mhgu/lmt.mjs` | `.76820d81` file | stdout | NEEDS-ARTEFACT | partial — `throw` on magic | 125 lines; `DECODERS` lacks type 13 (documented gap). |
| `mhgu/coverage-final.py` | `docs/analysis/code/inventory/tiers.csv` + `tierb-pass{1,2,3}/tierB*-slice-*.md` | stdout | NEEDS-ARTEFACT | no (prints the reconciliation numbers) | 40 lines; `LABELS` includes `save-io`/`weapon-pw` which no other tool emits. |
| `mhgu/arc.mjs` | `.arc` (CLI) | `list` to stdout, `extract` to a dir | NEEDS-ARTEFACT | yes — per-entry magic/bounds/inflate-length, names the bad entry | 211 lines; imported by 8 tools. |
| `mhgu/nso-flat.mjs` | any NSO0 you supply | `*.flat.bin` (+0x100 pad) | RUNS-WITHOUT-IMAGE | partial — `throw` on non-NSO0 and on LZ4 size mismatch | 41 lines; the documented way for an outsider to build the image (`docs/PRIVATE-DATA.md:15`). |
| `mhgu/tierb-gen.mjs` | `.tmp/mhgu/inventory/tiers.csv`, `.tmp/mhgu/inventory/functions4.csv`, image via `arm32` | `.tmp/mhgu/tierB*/slice-*.txt` | NEEDS-ARTEFACT (+IMAGE) | yes — prints each slice's first/last vaddr | 56 lines; hardcoded `G:/omp works` root. |
| `mhgu/tierb-merge.py` | `.tmp/reports-mhgu/tierB-slice-*.md` | `.tmp/mhgu/inventory/tierb-labels.csv` | NEEDS-ARTEFACT | partial — prints rows, coverage vs 14,863 | 25 lines; differs from `coverage-final.py` in dedup rule (`PROJECT-EVAL-20261023.md` R9). |
| `mhgu/vtable-crc.mjs` | `.tmp` image + `docs/data/class-inventory.tsv` | stdout | NEEDS-IMAGE | no | 36 lines; result recorded as a rejected route in `attr-vtable.md:233`. |
| `mhgu/tiers-all.mjs` | `.tmp/mhgu/inventory/functions4.csv` | stdout | NEEDS-ARTEFACT | partial | 50 lines; relative `.tmp` path (cwd-dependent). |
| `mhgu/agreement-tier.mjs` | `.tmp/mhgu/inventory/functions4.csv` | stdout | NEEDS-ARTEFACT | partial (prints agreement) | 52 lines; cwd-dependent. |
| `mhgu/decode-registry.py` | `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` | `.tmp/mhgu/inventory/resource-registry.txt` | NEEDS-IMAGE | no | 38 lines. `tools/mhgu/README.md:34` says it produces `docs/data/resource-registry.tsv` — the code does not (see §5c). |
| `mhgu/gen-entrymap.mjs` | image via `fn-cluster` | `docs/analysis/gameplay/entry-map.md` | NEEDS-IMAGE | partial — writes a method/limitation banner | 31 lines. |
| `mhgu/member-reader-trace.mjs` | `.tmp` image | stdout (module `traceReader`) | NEEDS-IMAGE | no | 119 lines. |
| `mhgu/reader-fields.mjs` | `FLAT` env or `.tmp` image | stdout | NEEDS-IMAGE | no | 199 lines; symbolic field scanner (v3). |
| `mhgu/fn-cluster.mjs` | `.tmp` image | library `cluster()` | NEEDS-IMAGE | no | 49 lines; imported by `gen-entrymap.mjs`. |
| `mhgu/validate-addr.mjs` | `.tmp/mhgu/inventory/functions2.csv` | stdout | NEEDS-ARTEFACT | yes — permutation baseline | 58 lines; cwd-dependent. |
| `mhgu/validate-labels.mjs` | `.tmp/mhgu/inventory/functions2.csv` | stdout | NEEDS-ARTEFACT | yes — split + baseline | 102 lines. |
| `mhgu/validate-repeat.mjs` | `.tmp/mhgu/inventory/functions4.csv` | stdout | NEEDS-ARTEFACT | yes — 10-fold repeat | 57 lines; the 10 fold seed sets are not in the repo (`docs/analysis/audit/REST.tsv:30`). |
| `mhgu/classify3.mjs` | `.tmp/mhgu/mon/mon-final.out.txt`, `.tmp/mhgu/inventory/functions2.csv` | `.tmp/mhgu/inventory/classified3.csv`, `seeds-class.txt` | NEEDS-ARTEFACT | no | 79 lines. |
| `mhgu/func-inventory5.mjs` | `.tmp` image | `.tmp/mhgu/inventory/functions4.csv` | NEEDS-IMAGE | partial (prints fn/string/edge counts) | 69 lines. `tools/mhgu/README.md:21` claims it produces `docs/data/functions.csv.gz` — it writes the `.tmp` CSV instead (see §5c). |

### `tools/mhgu/mon/` (10 files)

| Tool | Inputs | Outputs | Class | Self-check | Notes |
|---|---|---|---|---|---|
| `mon/mon-final.py` | `.tmp` image | stdout | NEEDS-IMAGE | partial (counts) | 135 lines; `bl 0x7aedcc` name+size census. |
| `mon/mon-classes.py` | `.tmp` image | stdout | NEEDS-IMAGE | no | 93 lines; class-grouped ordinal tables. |
| `mon/mon-fn.py` | `.tmp` image | stdout | NEEDS-IMAGE | no | 92 lines. |
| `mon/mon-offsets.py` | `.tmp` image | stdout | NEEDS-IMAGE | no | 118 lines; `{name,offset,type}` from inline property builders. |
| `mon/em-units.py` | `.tmp` image | stdout | NEEDS-IMAGE | no | 185 lines. |
| `mon/counter-slots.py` | `.tmp` image + `docs/data/json/monster-slot-map.json` + `monster-slot-map-small.json` | `.tmp/mhgu/mon/counter-slots.out.txt` | NEEDS-IMAGE | partial — cross-checks the repo maps | 503 lines; `monster-slot-map-small.json` **does not exist** (`docs/analysis/audit/REST.tsv:56`). |
| `mon/counter-slots3.py` | `.tmp` image + `docs/data/json/` | `.tmp/mhgu/mon/counter-slots3.out.txt` | NEEDS-IMAGE | yes — asserts `slot == index` for 137 rows | 134 lines. |
| `mon/size-final.mjs` | `save-snapshots/20261022-clean-reference/system_CLEAN`, `.../20261022-v6-ready/system` (lines 38-39) | stdout (redirect) | NEEDS-SAVE | partial — hash-inversion attempts + 3-table parity | 64 lines; the only save-only tool besides `box-slot-tool.mjs`. |
| `mon/quest-dispatch.mjs` | `import … from '../tools/arm32.mjs'` (line 6) — **resolves to `tools/mhgu/tools/arm32.mjs`, which does not exist** | `.tmp/mhgu/mon/quest-dispatch.out.txt` | NEEDS-IMAGE (broken) | no | `glob MHGU/tools/mhgu/tools` → "Path not found". Cannot run as committed. |
| `mon/ai-entry4.mjs` | same broken import (line 4) | stdout | NEEDS-IMAGE (broken) | no | Same defect; 223 lines. |

## 3. Dependency table — `tools/mhgu/coverage/` (71 files)

Conventions for every row: the coverage scripts hardcode the author's absolute root — either
`const ROOT = "G:/omp works/MHGU"` or the same literal inline (`direct-split.mjs`); `INV` =
`docs/analysis/code/inventory/`. "image" = `<ROOT>/main.140.flat.bin` unless `.tmp` is named. "fns" =
`docs/data/functions-retile.csv.gz`. Channel scripts also read `INV/sources.json` and the `attr-*.tsv` files it
lists; that is stated once here and not repeated per row.

| Tool | Inputs | Outputs | Class | Self-check | Notes |
|---|---|---|---|---|---|
| `report.mjs` | `sources.json`, inventory TSVs, `demote-*.tsv`, `pins.tsv`, fns | `INV/coverage-report.tsv` | NEEDS-ARTEFACT | yes — partition must sum to the denominator, `exit 3`; refuses a missing source | 437 lines; the meter's only writer. |
| `retile.mjs` | image | `docs/data/functions-retile.csv.gz`, `INV/RETILE.md` | NEEDS-IMAGE | yes — aborts unless BL targets ≈23,336, old starts survive, insns = 5,228,277, strings ≈1,937 | 129 lines; two full-image scans (~25 s each). |
| `spread-grid.mjs` | `sources.json`, inventory, fns | stdout | NEEDS-ARTEFACT | yes — per-cell CP95 | 86 lines. |
| `string-spread-reach.mjs` | `sources.json`, inventory, fns | stdout | NEEDS-ARTEFACT | partial (BFS sample counts) | 93 lines. |
| `spread-x-string.mjs` | `sources.json`, inventory, fns | stdout | NEEDS-ARTEFACT | yes — CP95 on the joint set | 85 lines. |
| `string-consensus-holdout.mjs` | `sources.json`, inventory, fns | stdout | NEEDS-ARTEFACT | yes — 5 shifted grids, CP95 | 115 lines. |
| `dup-channel.mjs` | image, fns, inventory | stdout (rule measured + rejected) | NEEDS-IMAGE | yes — precision/recall of both forms | 96 lines. |
| `sync-meter-table.mjs` | `coverage-report.tsv` | rewrites `docs/analysis/code/coverage/METER.md` | NEEDS-ARTEFACT | yes — refuses if a required row is absent | 66 lines; **rewrites a tracked doc**. |
| `canonical-metric.mjs` | `INV/tiers-merged.csv`, `coverage-report.tsv`, `tierb-pass*/` | stdout | NEEDS-ARTEFACT | yes — `exit 2` if the report row is missing | 82 lines; `check.mjs` gate 9 parses its `canonical total` line. |
| `labels-summary.mjs` | `INV/function-labels.tsv`, fns | `INV/labels-summary.md` | NEEDS-ARTEFACT | partial (prints totals) | 74 lines; **rewrites a tracked doc**. |
| `check-artifacts.mjs` | `sources.json`, all adopted `attr-*.tsv`, fns, `function-labels.tsv`, `labels-summary.md` | stdout `PASS`/`FAIL`, `exit 1` | NEEDS-ARTEFACT | yes — schema, real starts, conf set, partition conservation, 3-way total | 115 lines; the schema gate every other artefact relies on. |
| `independent-coverage.mjs` | fns, `sources.json`, `coverage-report.tsv` | stdout `PASS`/`FAIL` | NEEDS-ARTEFACT | yes — re-derives the partition in a different shape | 125 lines; `SPINE=`/`SOURCES=` env overrides noted in METER:1077. |
| `verify-evidence.mjs` | image, inventory TSVs, fns | stdout report (+`DUMP=` file) | NEEDS-IMAGE | yes — re-reads each A row's claim; `exit 1` on a dead channel or split mismatch | 199 lines. |
| `vtable-probe.mjs` | image, `attr-vtable-retile.tsv` | stdout | NEEDS-IMAGE | yes — four measured questions | 116 lines. |
| `ctor-vtable.mjs` | image, `attr-vtable-retile.tsv`, fns | `INV/attr-ctor-vtable.tsv` | NEEDS-IMAGE | partial (prints hit counts) | 110 lines; kept because the 0-hit result is the evidence. |
| `function-labels.mjs` | `sources.json`, inventory TSVs, `demote-*`, `pins` | `INV/function-labels.tsv` | NEEDS-ARTEFACT | partial (prints per-class counts) | 72 lines; priority A>V>S>spine>adjudication. |
| `spread-random-holdout.mjs` | `sources.json`, inventory, fns | `INV/spread-accuracy-random.tsv` (name via `ACC_OUT`) | NEEDS-ARTEFACT | yes — CP95, 3 reps | 59 lines. |
| `canonical-holdout-random.mjs` | `INV/tiers-merged.csv`, `sources.json`, fns | `.tmp-holdout-random/*`, stdout | NEEDS-ARTEFACT | yes — SHA-1 guard on the spine, `exitCode 1` | 67 lines; spawns `recompute.mjs` 5×. |
| `canonical-holdout.mjs` | same, plus 1 MB windows | stdout | NEEDS-ARTEFACT | yes — SHA-1 guard, `exitCode 1` | 81 lines; measures recall, not precision. |
| `recompute.mjs` | fns or `--functions`, `--seed` files, `demote-*`, `pins` | default `INV/tiers-merged.csv`; `--out` else | NEEDS-ARTEFACT | partial — per-file accept/reject counters | 169 lines; **default output is the committed spine**. |
| `dual-predict.mjs` | `sources.json` (excluding signature channels), fns | stdout | NEEDS-ARTEFACT | yes — CP95 | 71 lines. |
| `dual-seeds.mjs` | `sources.json`, fns | `INV/attr-dualpredict.tsv` | NEEDS-ARTEFACT | partial (emitted count) | 62 lines; locality window 40. |
| `class-single-anchor.mjs` | `sources.json`, fns | stdout | NEEDS-ARTEFACT | yes — per-size CP95 | 73 lines. |
| `class-single-seeds.mjs` | `sources.json`, fns | `INV/attr-classsingle.tsv` | NEEDS-ARTEFACT | partial (mixed classes skipped/reported) | 57 lines. |
| `verify-inferred.mjs` | `sources.json`, V/S tables, fns | stdout | NEEDS-ARTEFACT | yes — per-channel re-derivation, `exitCode 1` | 125 lines. |
| `spread-precision-independent.mjs` | `sources.json`, fns | `INV/spread-accuracy.tsv`, stdout | NEEDS-ARTEFACT | yes — CP95, per-label | 78 lines. |
| `dispatch-signature.mjs` | image, `sources.json`, fns | stdout | NEEDS-IMAGE | yes — 5 windows, CP95 | 99 lines. |
| `form-classify.mjs` | image, `function-labels.tsv`, fns | `INV/function-forms.tsv` | NEEDS-IMAGE | partial (form histogram) | 77 lines; 12 forms, all 52,692 functions. |
| `taxonomy.mjs` | none | exports `RULES`, `LABELS`, `labelOf` | RUNS-WITHOUT-IMAGE | no | 43 lines; pure module, no I/O. Imported by `recompute.mjs`, `seeds-from-xref.mjs`, `seeds-from-registrar.mjs`, `relabel-vtable.mjs`, `class-seeds.mjs`, `member-seeds.mjs`. `seeds-from-strings.mjs` keeps its own copy of the rule table instead of importing this one. |
| `seeds-from-xref.mjs` | `INV/stringxref.tsv` | `INV/attr-xref.tsv` | NEEDS-ARTEFACT | partial (matched/unmatched) | 30 lines. |
| `callvote1.mjs` | `sources.json`, `attr-callvote{,1}.tsv`, `attr-classvote`, `attr-callervote`, fns | `INV/attr-callvote1.tsv` | NEEDS-ARTEFACT | yes — whole cascade replayed per fold | 280 lines; the newest channel. |
| `table-seeds.mjs` | image, fns, `sources.json` | `INV/attr-tableseeds.tsv` | NEEDS-IMAGE | partial (runs skipped/mixed) | 62 lines. |
| `offset-pair-seeds.mjs` | image, `sources.json`, fns | `INV/attr-offsetpairs.tsv` | NEEDS-IMAGE | partial (pairs emitted) | 83 lines. |
| `offset-pairs.mjs` | image, `sources.json`, fns | stdout | NEEDS-IMAGE | yes — 5 windows, CP95 | 107 lines. |
| `offset-seeds.mjs` | image, `sources.json`, fns | `INV/attr-offsets.tsv` | NEEDS-IMAGE | partial (pure-offset count) | 85 lines; self-read bug fixed (METER:440). |
| `offset-signature.mjs` | image, `sources.json`, fns | stdout | NEEDS-IMAGE | yes — CP95 | 103 lines. |
| `table-consensus.mjs` | image, fns, `sources.json` | stdout | NEEDS-IMAGE | yes — CP95 per member-count cell | 80 lines. |
| `callvote.mjs` | `sources.json`, fns | `INV/attr-callvote.tsv`, `attr-callvote-rounds.tsv` | NEEDS-ARTEFACT | yes — fold-wise per round, floor 92% | 136 lines. |
| `small-sample-purity.mjs` | `sources.json`, fns | stdout | NEEDS-ARTEFACT | yes — bucketed CP95 | 69 lines. |
| `spread-precision.mjs` | `sources.json`, `tiers-merged.csv`, fns | stdout | NEEDS-ARTEFACT | yes — CP95 (self-graded truth, later superseded) | 64 lines. |
| `hub-degree.mjs` | `sources.json`, fns | stdout | NEEDS-ARTEFACT | yes — bucketed CP95 | 74 lines. |
| `spread-votes.mjs` | `sources.json`, fns | `INV/spread-votes.tsv` | NEEDS-ARTEFACT | yes — reproduces the stored label, prints agreement % | 57 lines. |
| `purity-sweep.mjs` | `sources.json`, fns | stdout | NEEDS-ARTEFACT | yes — CP95 per purity floor | 70 lines. |
| `immscan.mjs` | image, fns, `sources.json` | `INV/attr-immscan.tsv`, `attr-immscan-score.tsv` | NEEDS-IMAGE | yes — fold-wise precision printed and stored | 121 lines. |
| `callervote.mjs` | `sources.json`, fns | `INV/attr-callervote.tsv` | NEEDS-ARTEFACT | yes — LOO confusion printed | 92 lines. |
| `seeds-from-vtables.mjs` | `INV/vtables-slots.tsv` | `INV/attr-vtable-rtti2.tsv` | NEEDS-ARTEFACT | partial (suspect/shared counts) | 75 lines. |
| `classvote.mjs` | `sources.json`, `attr-vtable-retile.tsv`, fns | `INV/attr-classvote.tsv` | NEEDS-ARTEFACT | yes — LOO 6,184/6,225 printed | 90 lines. |
| `fingerprints.mjs` | image, fns, `sources.json` | `INV/attr-fingerprint.tsv`, `attr-fingerprint-score.tsv` | NEEDS-IMAGE | yes — two rules scored before adoption | 122 lines. |
| `direct-split.mjs` | fns + a fixed list of `attr-*.tsv` | stdout | NEEDS-ARTEFACT | partial (sub-calibre table) | 42 lines. |
| `seeds-from-strings.mjs` | `INV/stringxref.tsv` | `INV/attr-strings2.tsv`, `strings2-review.tsv` | NEEDS-ARTEFACT | yes — dominance/specificity guards, review sample | 84 lines. |
| `vtable-unknown.mjs` | `attr-vtable-retile.tsv`, `classprefix-map.tsv` | `INV/attr-vtable-unknown.tsv` | NEEDS-ARTEFACT | partial (kept/CONFLICTING counts) | 69 lines. |
| `relabel-rtti.mjs` | `INV/attr-vtable-fixed.tsv` | `attr-vtable-ns.tsv`, `attr-vtable-rest.tsv`, `attr-vtable-ns-suspect.tsv` | NEEDS-ARTEFACT | yes — 256 KB median screen, suspect list | 104 lines. |
| `vtable-class-consensus.mjs` | `attr-vtable-rest.tsv`, direct tables | `attr-vtable-classconsensus.tsv`, `-sheet.tsv` | NEEDS-ARTEFACT | partial (adopted class list) | 63 lines; measured and rejected (3 classes). |
| `class-family.mjs` | `classprefix-map.tsv`, `attr-class.tsv` | `INV/attr-class2.tsv` | NEEDS-ARTEFACT | partial (per-prefix counts) | 42 lines. |
| `vtable-scan.mjs` | image, fns | `INV/vtables-discovered.tsv`, `vtables-slots.tsv` | NEEDS-IMAGE | partial (counts printed) | 93 lines; Itanium `&typeinfo` key. |
| `verify-vtable-rows.mjs` | image, `attr-vtable-fixed.tsv` | `attr-vtable-verified.tsv`, `attr-vtable-classblock.tsv` | NEEDS-IMAGE | yes — slot word must equal the function start | 32 lines. |
| `class-seeds.mjs` | `argv[2]` default `G:/tmp/cfc.raw` (**outside the repo**), `classprefix-map.tsv` | `INV/attr-class.tsv` | NEEDS-ARTEFACT | partial (per-channel counts) | 40 lines; default input is scratch that is not committed. |
| `class-from-code.mjs` | image, fns, `attr-vtable*` | stdout; `--tsv` emits seed rows | NEEDS-IMAGE | yes — three idioms spot-verified in the header | 233 lines; `--start/--end/--channels`. |
| `seeds-from-registrar.mjs` | image, `stringxref.tsv`, `classprefix-map.tsv` | `INV/attr-registrar.tsv` | NEEDS-IMAGE | partial (unknown-class count) | 62 lines. |
| `fix-member-fn.mjs` | `docs/data/member-offsets.tsv`, fns | `INV/member-offsets-refn.tsv` | NEEDS-ARTEFACT | partial (re-anchored count) | 41 lines; writes a new file, never replaces the source. |
| `stringxref.mjs` | image, fns | `INV/stringxref.tsv` | NEEDS-IMAGE | partial (abs/pc-delta/table counts) | 103 lines; two reference forms. |
| `member-seeds.mjs` | image, fns, `member-offsets.tsv`, `mustfail-members.json`, `--existing` list | `INV/attr-members.tsv` | NEEDS-IMAGE | yes — must-fail gate (10 cases) + xref cross-check | 293 lines; the most defensive script in the tree. |
| `promote-blocks.mjs` | `INV/bsamples/verdict-*.tsv` | `INV/attr-blocks.tsv` | NEEDS-ARTEFACT | yes — promotion rule (≥10/12, ≤2 unknown) printed per block | 63 lines; exits 0 with a message when no verdicts exist. |
| `relabel-vtable.mjs` | `attr-vtable*` + `classprefix-map.tsv` | `INV/attr-vtable-fixed.tsv` (OUT) | NEEDS-ARTEFACT | partial (kept/relabelled/demoted counts) | 61 lines; the `/Mt/` over-match fix. |
| `seeds-from-prefix.mjs` | `classprefix-map.tsv`, `stringxref.tsv` | `INV/attr-prefix.tsv` | NEEDS-ARTEFACT | partial (prefix hits/labels) | 32 lines. |
| `sample-blocks.mjs` | `INV/bblocks/INDEX.tsv` | `INV/bsamples/sNN.txt`, `bsamples/INDEX.tsv` | NEEDS-ARTEFACT | partial (sampled counts) | 27 lines; `argv[2]` = per-block size (default 12). |
| `split-b.mjs` | `INV/tiers-recomputed.csv` | `INV/bblocks/bNN.txt`, `INDEX.tsv` | NEEDS-ARTEFACT | partial (block total printed) | 37 lines; 60k-instruction blocks. |
| `validate-strings.mjs` | image, `tiers-recomputed.csv`, fns | `INV/strings-validated.tsv` | NEEDS-IMAGE | yes — real / NO-REFERENCE / not-in-image split | 65 lines. |
| `merge.mjs` | every `INV/attr-*.tsv`, `demote-*` | spawns `recompute.mjs` then `report.mjs` | NEEDS-ARTEFACT | partial (per-file accept/reject from recompute) | 30 lines; exits 0 with a message when no `attr-*.tsv` exist. |
| `sample.mjs` | `INV/tiers-recomputed.csv`, `demote-otomo.tsv` | `docs/analysis/code/coverage/samples.tsv` | NEEDS-ARTEFACT | partial (per-label draw counts) | 45 lines; deterministic even-spacing sample. |
| `cluster.mjs` | `docs/data/functions.csv.gz` (the pre-retile table) | `INV/communities.tsv` | NEEDS-ARTEFACT | partial | 82 lines; hub guard on 200 highest-degree nodes. |

## 4. Dependency table — `tools/audit/`, `tools/gu-moves/`, `tools/mcp/`, `tools/wiki-gen/`

| Tool | Inputs | Outputs | Class | Self-check | Notes |
|---|---|---|---|---|---|
| `audit/check.mjs` | `docs/analysis/audit/MANIFEST.tsv`, `ROUND1-ALL.tsv`, `slices/*.txt`, `coverage-report.tsv`, `METER.md`, `HANDOFF.md`, `PROGRESS.md`; spawns `check-artifacts.mjs` + `canonical-metric.mjs`; optional `MHGU_DB` | stdout `PASS`/`FAIL`, `exit 1` | NEEDS-ARTEFACT (+DB) | yes — 12 gates, `ALL PASS` | 238 lines; the tree's own gate. Prints a note (not a failure) when the db is absent (lines 208-211). |
| `audit/summarize.mjs` | audit `*.tsv`, `MANIFEST.tsv` | `ROUND1-ALL.tsv`, `ROUND1-SUMMARY.md` | NEEDS-ARTEFACT | partial — duplicate/missing doc counts | 105 lines; excludes `*-FIXES.tsv` by header. |
| `audit/audit-new-docs.mjs` | docs + `INV/*` + `functions-retile.csv.gz` | `audit/slices/analysis-coverage-new.tsv` | NEEDS-ARTEFACT | yes — asserts 52,692 / 5,228,277 / 1,937 | 139 lines; only covers the 23 post-freeze docs. |
| `audit/manifest.mjs` | `docs/**/*.md` | `audit/MANIFEST.tsv`, `audit/slices/<slice>.txt` | RUNS-WITHOUT-IMAGE | yes — prints doc/slice counts | 45 lines; no non-repo input at all. |
| `audit/doc-scan.mjs` | `docs/**/*.md` + a basename index of `tools/` | `audit/DOC-LINKS.tsv` | RUNS-WITHOUT-IMAGE | yes — prints path/tool/scratch/missing counts | 89 lines. Tool detection is `^tools/…\.(mjs|py|js)$` **or** `.mjs$` (line 71), so `.py` outside `tools/` is invisible to it (§5b). |
| `gu-moves/gu-moves.mjs` | `G:/mhgu-romfs/romfs/nativeNX/arc/enemy` (`lib/guarc.mjs:13`), `MHGU/tools/mhgu/arm32.mjs` via an absolute `file:///G:/omp%20works/...` URL (line 33), `./lib/*` | `G:/tmp/GuMoves/out/<em>/{variants,motions,moves,census}.tsv`, `facts.json` | NEEDS-ARTEFACT | yes — census/facts cross-checks | 442 lines. **`lib/trees.mjs:6` imports `file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs`**, a file that is not in the repo, so the committed copy cannot run standalone. |
| `gu-moves/regress.mjs` | `G:/tmp/GuMoves/out/<em>/variants.tsv` | stdout | NEEDS-ARTEFACT | yes — regression list against cited facts | 418 lines; consumes output of the previous tool only. |
| `mcp/mhgu-re.mjs` | image via `arm32.mjs`; byte reads under `.tmp/mhgu/extract`, `.tmp/mhgu/yure`, `MHGU-private/romfs-extract`, `MHGU/save-snapshots`, `G:/mhgu-romfs/romfs` (realpath-checked) | JSON-RPC 2.0 on stdio | NEEDS-IMAGE | yes — allow-list + `realpath` containment, `.keys` denied by name | 255 lines; read-only by construction; zero dependencies. |
| `wiki-gen/gen-weapon-trees.py` | `mhgu.db` (argv[1]) | `argv[2]` (md) | NEEDS-DB | yes — prints `1585 final weapons` | 71 lines; `py -3.14` per WIKI-FINDINGS:101. |
| `wiki-gen/gen-weakness.py` | db-exported `damage.tsv`, `weakness.tsv`, `monster-slot-map.json` | `argv[4]` (md) | NEEDS-ARTEFACT | yes — prints monster count | 88 lines. |
| `wiki-gen/gen-quests-vh.py` | `.tmp/mhgu/vh-quests.tsv`, `.tmp/mhgu/questreq.csv`, slot map, `mhgu.db` | **hardcoded** `docs/wiki/quests-village-hub.md` (line 88) | NEEDS-ARTEFACT (+DB) | yes — prints rows/missing/xstar/lines | 89 lines; running it rewrites a tracked doc. |
| `wiki-gen/gen-deviants.py` | `.tmp/deviant-quests.tsv`, slot map | **hardcoded** `docs/wiki/deviants.md` | NEEDS-ARTEFACT | yes — prints groups/rows | 63 lines; same destructive default. |
| `wiki-gen/deviant-data.py` | `mhgu.db`, `.tmp/mhgu/questreq.csv` | `.tmp/deviant-quests.tsv` | NEEDS-DB | partial — counts misses | 30 lines; labelled "Throwaway" in its own header. |

## 5. Tool ↔ document references

### 5a. Tools that no document cites (by `name.mjs` / `name.py` citation)

Method: one extension-qualified `grep` per name group over `MHGU/docs`
(`(a|b|c)\.(mjs|py)`), then individual confirmations. 32 tools have no hit:

```
tools/dump-shift.mjs
tools/audit/summarize.mjs     tools/audit/manifest.mjs   tools/audit/doc-scan.mjs   tools/audit/audit-new-docs.mjs
tools/gu-moves/gu-moves.mjs   tools/gu-moves/regress.mjs  tools/mhgu/tierb-gen.mjs
tools/mhgu/coverage/{cluster,sample,sample-blocks,split-b,validate-strings,promote-blocks,
  relabel-vtable,seeds-from-prefix,fix-member-fn,verify-vtable-rows,class-seeds,seeds-from-registrar,
  purity-sweep,hub-degree,spread-votes,dispatch-signature,dual-seeds,class-single-seeds,ctor-vtable,
  spread-random-holdout,offset-pairs,offset-pair-seeds,offset-signature,table-seeds}.mjs
```
Nuance: several of these *are* named as artefacts, not as scripts — `spread-votes.tsv` (METER:153),
`attr-tableseeds.tsv` (METER:255), the offset-pair rule (METER §"偏移对"), `labels-summary.md`. The
generator script itself is never cited, so an outsider cannot regenerate the artefact from the doc.
`mhgu-re` is cited by name ("mhgu-re MCP", `REFERENCE-DATA-FINDINGS.md:366`, `SUBAGENT-LEDGER.md:63`) and is
therefore **not** in the list. `tiers-all.mjs`/`agreement-tier.mjs` are named only by
`docs/history/PROJECT-EVAL-20261023.md:185` and are **not** in the list either.

### 5b. Documents that cite tools which do not exist

`docs/analysis/audit/DOC-LINKS.tsv` (generated by `audit/doc-scan.mjs`) is 68 lines: 1 header + 67 findings, of
which 40 are `kind=tool, status=MISSING` (verified by counting `\ttool\t` lines). Read that file and
cross-checked it against the tree; the real list, including the `.py` cases its detector cannot see:

| Document | Cited, absent | Status of the cited name |
|---|---|---|
| `docs/analysis/monsters/mon-ai-entry.md` | `ai-entry.mjs`, `ai-entry2.mjs`, `ai-entry5.mjs`, `ai-entry6.mjs`, `ai-entry7.mjs`, `ai-entry8.mjs` | repo ships only `mon/ai-entry4.mjs`; the rest were `.tmp` scratch |
| `docs/analysis/monsters/mon-size-calc.md` | `size-find.mjs`, `size-hash.mjs`, `size-hash2.mjs`, `size-load.mjs`, `size-index.mjs`, `size-manifest.mjs` | repo ships only `mon/size-final.mjs` |
| `docs/analysis/monsters/mon-counter-slots.md` | `counter-slots2.py`, `counter-slots4.py` | repo ships `counter-slots.py` and `counter-slots3.py` only |
| `docs/analysis/monsters/mon-em-units.md` | `em-units2.py`, `em-units3.py`, `em-units4.py` | repo ships `em-units.py` only |
| `docs/analysis/monsters/mon-class-map.md:31` | `mon-class-map.py` | repo ships `mon-classes.py`/`mon-final.py`; the reproduction command names a file that never existed under that name |
| `docs/history/PROJECT-EVAL-20261023.md` | `codec-verify.mjs` | never in the repo |
| `docs/analysis/fields/records-128.md`, `docs/analysis/members/member4-header.md`, `member15.md` | `qp4-scan.mjs`, `swe2-audit.mjs`, `tools/r1.txt` | never in the repo |
| `docs/analysis/members/member14-17-semantics.md`, `member15.md` | `.tmp/mhgu/tools/m1417-{dump,dump3,dump5,xref}.mjs`, `member15-scan{,2}.mjs` | `.tmp` scratch, not committed |
| `docs/reference/re-example-dttune-consumer.md` | `scan-{ldr,pair,add,acc,ldm,cp,tri,back,add2}.mjs` | never in the repo |
| `docs/reference/re-guide-gu.md`, `docs/reference/re-example-dttune-consumer.md` | `.tmp/re-cli.mjs` | `.tmp` scratch |
| `docs/wiki/hitzones-all-a.md` | `.tmp/hz-all-a/meat-all.mjs` | `.tmp` scratch |
| `docs/wiki/monster-parts-hp.md` | `.tmp/mhgu-scratch/quest-decode.mjs` | `.tmp` scratch |
| `docs/analysis/external/chunks/spk-format.md` | `tools/a32recomp/{mtf_shaders,pipeline_manifest}.py` | **false positive** — they exist in `.tmp/ext/SUYU-GURecomp` (`EXTERNAL-FINDINGS.md:119`) |

Structural point: `doc-scan.mjs` decides "tool" with `/^tools\/[\w./-]+\.(mjs|py|js)$/ || /\.mjs$/` (line 71), so
every `.py` cited outside `tools/` is never checked; the four `.py` rows above are invisible to the gate that
claims to find stale tool citations.

### 5c. Documents that assert a tool output the tool cannot produce

| Document | Claim | Observed |
|---|---|---|
| `tools/mhgu/README.md:21` | `func-inventory5.mjs` → `docs/data/functions.csv.gz` | the script writes `.tmp/mhgu/inventory/functions4.csv` (line 68) |
| `tools/mhgu/README.md:34` | `decode-registry.py` → `docs/data/resource-registry.tsv` | the script writes `.tmp/mhgu/inventory/resource-registry.txt` (line 37); `docs/data/resource-registry.tsv` exists but is not produced there |
| `tools/mhgu/README.md:35` | `mon/mon-offsets.py` → `docs/data/member-offsets.tsv` | the script prints to stdout; `member-offsets.tsv` has no producer in the tree |
| `docs/mechanics/monster-code-map.md:30` | `state-motion2.mjs` produced the state doc | the doc is `state-motion3.mjs`'s output (`LINK-MECHANICS-CODE.md:199-204`) |
| `docs/analysis/monsters/mon-counter-slots.md:486-489` | four `counter-slots*.py` reproduce the tables | two of the four are absent |

## 6. Regeneration danger list (writes into tracked paths)

`grep writeFileSync` + the head constants show these write to tracked files by default:
`report.mjs → coverage-report.tsv`, `recompute.mjs → tiers-merged.csv` (unless `--out`),
`retile.mjs → docs/data/functions-retile.csv.gz + RETILE.md`, `function-labels.mjs → function-labels.tsv`,
`labels-summary.mjs → labels-summary.md`, `form-classify.mjs → function-forms.tsv`,
`sync-meter-table.mjs → METER.md`, `state-motion3.mjs → monster-state-machine.md`,
`gen-entrymap.mjs → entry-map.md`, `dttune-all.mjs → docs/data/json/monster-dttune-index.json`,
`hitdata.mjs → docs/data/json/motion-values.json`, `manifest.mjs → MANIFEST.tsv + slices/`,
`doc-scan.mjs → DOC-LINKS.tsv`, `summarize.mjs → ROUND1-ALL.tsv + ROUND1-SUMMARY.md`,
`audit-new-docs.mjs → slices/analysis-coverage-new.tsv`, `gen-quests-vh.py → docs/wiki/quests-village-hub.md`,
`gen-deviants.py → docs/wiki/deviants.md`, `build-v7-final.mjs → patch/experimental-v8/1.4.0.pchtxt`,
`dump-shift.mjs → tools/v7-shift.json`, `relabel-vtable.mjs → attr-vtable-fixed.tsv`.
Twenty-odd channel scripts write `attr-*.tsv` / `vtables-*.tsv` into `docs/analysis/code/inventory/` (all
tracked).

---

# RISK

Ranked by severity for a public push. Each item names the exact path.

### R1 — Capcom game binary in the working tree (critical)
`MHGU/main.140.flat.bin`, 24.3 MB (`glob` with `gitignore:false`).
It is a hard link to `G:/omp works/MHGU-private/main.140.flat.bin` (`docs/PRIVATE-DATA.md:7-8`). `.gitignore:6`
excludes it, but nothing prevents `git add -f`, a zip of the working tree, a `git bundle`, or a recursive copy from
carrying it. Risk: distribution of the decrypted 1.4.0 executable — the single worst outcome for the project.

### R2 — Personal save files in the working tree (critical)
`MHGU/save-snapshots/` — 14 files: 6 `system*` (4.9 MB) and 8 `.hnt` (1.1 MB), filenames carrying player names
(`Sakiko_HR5.hnt`, `Lay1nn_HR198.hnt`, `hunterA_HR5.hnt`, `hunterB_HR198.hnt`). Git-ignored, junction to
`MHGU-private`, but present and readable. Risk: third-party personal data + Capcom save blob in any archive of the
tree.

### R3 — Capcom-derived data products in the working tree (critical)
`MHGU/docs/data/mhgu.db` (18 MB; MHGenDatabase `mhgu_database_v2.4.0.apk` → `assets/databases/mhgu.db`, per
`docs/data/README.md:25`) and `docs/data/json/` (28 entries; `items.json` 15.9 MB, `weapons.json` 6.8 MB,
`quest_rewards.json` 4.1 MB, `gathering.json` 2.7 MB — Kiranico/MHGenDatabase derivatives).
Most are git-ignored; the exception list keeps `README.md` and two `monster-slot-map*.json` — correct in
appearance, but the .gitignore patterns must be trusted. Risk: redistributing Capcom's tables.

### R4 — Third-party npm code in unpushed history (high)
`tools/mhgu/vendor/` (139 KB tgz + unpacked `opus-decoder`, `@wasm-audio-decoders/common`).
`tools/mhgu/VENDOR-NOTICE.md` states: "Commits `f16e75f`…`HEAD` … still contain the vendor blobs … Before the
first `git push`, either rewrite those commits … or rebuild the branch." Licence is MIT (redistributable with
notice), so this is a repo-policy violation rather than a licence violation — but it contradicts the project's
own "our work only" rule and the notice is the only record of it.

### R5 — Three scripts cannot run from the repo at all (high)
* `tools/mhgu/mon/quest-dispatch.mjs:6` and `tools/mhgu/mon/ai-entry4.mjs:4` →
  `import … from '../tools/arm32.mjs'`, which resolves to `MHGU/tools/mhgu/tools/arm32.mjs`;
  `glob MHGU/tools/mhgu/tools` → "Path not found".
* `tools/gu-moves/lib/trees.mjs:6` → `import … from 'file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs'`, a path that
  exists nowhere in the repository.
Risk: a reader who runs one of the 138 documented commands gets `ERR_MODULE_NOT_FOUND`, which reads as "the
project does not work".

### R6 — Scripts hardcode the author's Windows layout (high)
`grep 'MHGU-private|mhgu-romfs|G:/tmp|\.tmp/'` over `MHGU/tools` → 45 matching files. `read` of every head shows
the coverage scripts pinning `G:/omp works/MHGU` (as `const ROOT` or an inline literal); `G:/mhgu-romfs/romfs/...`
in `dttune-all.mjs:33`, `gu-moves/lib/guarc.mjs:13`, `hitdata.mjs:59`, `quest-ext.mjs:900`; `G:/tmp` defaults in
`class-seeds.mjs:11`, `gu-moves.mjs:40`, `regress.mjs:13`. Risk: none of them works elsewhere without edits, and
the strings leak the workstation's directory structure (private tree names, scratch layout).

### R7 — Running a tool can destroy tracked content (high)
`tools/dump-shift.mjs` writes `tools/v7-shift.json` unconditionally with
`JSON.stringify(globalThis.V7SHIFT ?? [])`; `build-v7-final.mjs` overwrites
`patch/experimental-v8/1.4.0.pchtxt`; `box-slot-tool.mjs write` mutates a save in place; the writers in §6
rewrite tracked docs and `.tsv` artefacts; `recompute.mjs` defaults to the committed spine
`docs/analysis/code/inventory/tiers-merged.csv`. Risk: a reader following the "reproduce" instructions silently
changes the repository's published numbers.

### R8 — Documents cite 20+ tools that do not exist (high)
§5b table. The reproduction command in `docs/analysis/monsters/mon-class-map.md:31` names
`mon-class-map.py`, which never existed; `mon-counter-slots.md:486-489` and `mon-em-units.md:344-348` name
`*.py` files that are absent. Risk: the reproducibility claim that carries the project ("可复现") is false for
those sections, and `audit/doc-scan.mjs` cannot see the `.py` cases because of its own regex.

### R9 — The stale-tool gate under-reports (medium)
`tools/audit/doc-scan.mjs:71`: `const isTool = /^tools\/[\w./-]+\.(mjs|py|js)$/.test(v) || /\.mjs$/.test(v);`
Only `.mjs` anywhere and `.py` **under `tools/`** are checked. Every `.tmp/...py` citation and every bare
`name.py` passes unseen. Risk: `DOC-LINKS.tsv` ("0 missing") would be read as a clean bill of health.

### R10 — Doc↔tool output mismatches (medium)
`tools/mhgu/README.md` claims three outputs the code does not write (§5c: `functions.csv.gz`,
`resource-registry.tsv`, `member-offsets.tsv`). Risk: an outsider regenerates into `.tmp` and believes the tree
is inconsistent/broken; the README is the first document a tool user reads.

### R11 — Tool headers cite reports that are not in the repo (medium)
`arts.mjs:2` (`.tmp/reports-mhgu/arts-params.md`), `dttune-all.mjs:39` (`.tmp/reports-mhgu/dttune-all.md`),
`recompute.mjs:4` (`.tmp/mhgu/inventory/functions4.csv`), `class-seeds.mjs:11` (`G:/tmp/cfc.raw`), plus the whole
`.tmp` scratch family. Risk: every "spec" reference in those headers is a dead end for a reader.

### R12 — Runtime prerequisite not stated (low)
Five scripts import `node:sqlite` (`DatabaseSync`): `export-dlc-table.mjs`, `export-item-table.mjs`,
`dttune.mjs`, `quest-ext.mjs`, `audit/check.mjs`. That module only exists in Node ≥ 22.5. The wiki generators are
documented as `py -3.14` only in an audit file (`WIKI-FINDINGS.md:101`), not in the tool itself. Risk: silent
`ERR_UNKNOWN_BUILTIN_MODULE` on a reviewer's machine, read as a project defect.

### R13 — Vendored decoders are a hidden runtime dependency (low)
`guopus.mjs` needs `tools/mhgu/vendor/opus-decoder` or an external ffmpeg; the vendor tree is untracked by
design, so a clean clone cannot run `wav`/`verify` until `npm i` is run. `sdl.mjs --exe` and `mcp/mhgu-re.mjs`
need the image. Risk: "it does not run" reports that are really missing prerequisites.

---

# UNKNOWN

Cannot be decided from inside the repository with the tools available to this session:

1. **Whether the banned blobs are in git history.** No `git` invocation is possible (no shell). `.gitignore`,
   `docs/PRIVATE-DATA.md` and `VENDOR-NOTICE.md` are statements, not proof. `VENDOR-NOTICE.md` *asserts* the
   vendor blobs are in `f16e75f…HEAD`; the image, db, saves and romfs are asserted never to have been added. The
   "240+ commits ahead, never pushed" state makes the "never pushed" claim externally verifiable only by the host.
2. **Whether the root `main.140.flat.bin` is the same bytes as `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`.**
   Both exist (`glob` with and without `gitignore`); no hashing tool here.
3. **Whether any tool actually runs today.** All 138 are static reads. In particular I cannot confirm the
   `BL targets ≈ 23,336` and `insns == 5,228,277` assertions in `retile.mjs` hold against the image present now.
4. **How much of the 5,228,277-instruction corpus is reproduced verbatim in docs.** The tables are aggregates
   (`coverage-report.tsv`, `attr-*.tsv`), but a bulk dump could exist in `docs/analysis/dumps/` (a junction,
   git-ignored) that this session never enumerated.
5. **Licensing of `docs/data/json/*` beyond the README's own words.** `docs/data/README.md:25` names
   MHGenDatabase and Kiranico; whether the APK's data is redistributable is a legal question, not a repo fact.
6. **Whether `tools/mhgu/vendor/` is currently only the `.tgz` + two packages.** The listing shows
   `opus-decoder.tgz`, `opus-decoder/`, `common/`; the notice says "101 files were briefly tracked and removed
   from the index" — index state is not observable here.
7. **Which `.py` runner the project considers canonical.** The `mon/*.py` headers name a retired venv
   (`G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe`); `WIKI-FINDINGS` uses
   `py -3.14`; `docs/data/README.md` uses neither. This session cannot test either.
8. **Whether `docs/data/functions.csv.gz` still matches the pre-retile table the `.tmp`-reading scripts expect.**
   `cluster.mjs`, `validate-*.mjs`, `classify3.mjs` read tables (`functions.csv.gz`, `functions4.csv`,
   `functions2.csv`) whose producers disagree (`func-inventory5.mjs` writes `functions4.csv`; `retile.mjs` writes
   `functions-retile.csv.gz`).

---

# Difficulties

* **No execution path.** The assigned method said "run the cheap ones to confirm"; this session has no `run`,
  `bash` or `node` device (only `read`, `grep`, `glob`, `web_search`, `write`). All 138 rows are static-analysis
  results, and I did not run a single tool — including the harmless `--help` paths. Cost: I could not settle
  clock-time, stdout text, or whether the image/db present today satisfy the tools' own assertions.
* **No `git`.** History questions (R1–R4) stay unverifiable; I can only quote `.gitignore`, `PRIVATE-DATA.md`
  and `VENDOR-NOTICE.md`.
* **The "unreferenced tool" question has no exact primitive.** `grep` returns matching lines, not a per-pattern
  presence bit, and pages by file (20 at a time, 512-byte line truncation). I first tried bare-name alternations
  and got junk (`cluster`, `sample`, `manifest`, `regress` match ordinary prose: 101 files). The working method was
  extension-qualified alternations (`…\.mjs`) in groups of ten, which returned every citing line untruncated,
  plus individual confirmations for the ambiguous names. Residual risk: a document citing a bare name without
  the extension is not counted (e.g. "the split tool"), and a citation hidden beyond a 512-byte truncation in a
  very long table row would be missed. ~20 grep calls were spent on this section alone.
* **Bulk head-reading was the only way to get per-file inputs/outputs.** 138 files × ~1 read = the bulk of the
  budget; `coverage/` needed a separate pass because its head comments are 6-20 lines of prose before the
  constants, so a 16-line read sometimes stopped before `OUT`. Where `OUT` was outside the window I took it from
  the `writeFileSync` grep instead.
* **Two file names were mangled in this session's own tool output** (`RES`.T.tsv`, `PROJECT-EVAL…`): the strings
  were altered by the harness's output filter, not by the repo (the files are
  `docs/analysis/audit/REST.tsv` and `docs/history/PROJECT-EVAL-20261023.md`). Re-derived from their `read`
  listings before citing; the first draft of this report copied one of the mangled strings and it has been
  corrected here.
* **Report path.** The ticket names `docs/analysis/audit/PUBLISH-TOOL-DEPS.md`, but this session's `write`
  device refuses paths inside the working tree; the report lives at `local://PUBLISH-TOOL-DEPS.md` for the main
  session to copy in. Nothing was written to the repo.
