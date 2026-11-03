# W3-TOOLFIX — repair the three tool defects listed in PUBLISH-TOOL-DEPS

Source ticket: `docs/analysis/audit/PUBLISH-TOOL-DEPS.md` §5c and R10 (`tools/mhgu/README.md` claims three
outputs the code does not write), plus the two broken/outside-repo imports named in its §2 and §4.

Method: every claim below was re-checked in this session with a `read`, `grep` or `glob` call; the call is quoted
next to the number it produced. Nothing was executed in this session (it has no shell device: `xd://run` is not
mounted, `proc://` has no executor); the four `node --check` runs and the tree gate were run by the main session
and are quoted verbatim under "## Verification".

## Confirmed

### D1 — `mon/quest-dispatch.mjs` and `mon/ai-entry4.mjs` import a non-existent path (ticket cites lines 6/4; measured 5/4)

| Check | Command | Output |
|---|---|---|
| broken import, file 1 | `read MHGU/tools/mhgu/mon/quest-dispatch.mjs:1-30` | line 5: `import { decode, rd32, findCallsTo } from '../tools/arm32.mjs';` |
| broken import, file 2 | `read MHGU/tools/mhgu/mon/ai-entry4.mjs:1-30` | line 4: `import { buf, rd32, TEXT_END, disasm, functionStarts, nearestFunctionStart } from '../tools/arm32.mjs';` |
| target of `../tools/arm32.mjs` | `glob MHGU/tools/mhgu/arm32.mjs;MHGU/tools/mhgu/tools;MHGU/tools/mhgu/mon/*.mjs` | `MHGU/tools/mhgu/arm32.mjs` exists; `MHGU/tools/mhgu/tools` → "Skipped missing paths" |
| real location | same glob | `## MHGU/tools/mhgu/` lists `arm32.mjs` (i.e. `tools/mhgu/arm32.mjs`) |
| every name the two files import is exported there | `grep '^export' MHGU/tools/mhgu/arm32.mjs` | `FLAT`, `buf`, `TEXT_END`, `rd32`, `rd16`, `rdb`, `decode`, `disasm`, `findCallsTo`, `findLiteralLoads`, `findRefsTo`, `functionStarts`, `nearestFunctionStart` — all 8 names used by the two files are present |

So the path is off by one directory: from `tools/mhgu/mon/`, `../tools/arm32.mjs` = `tools/mhgu/tools/arm32.mjs`
(absent); `../arm32.mjs` = `tools/mhgu/arm32.mjs` (present). No other file in `tools/` uses the `../tools/` form:
`grep "arm32\.mjs'|arm32\.mjs\"" MHGU/tools` lists only `./arm32.mjs`, `../../mhgu/arm32.mjs`, the two broken
`../tools/arm32.mjs`, and absolute `file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs` URLs in `tools/gu-moves/*`.

### D2 — `gu-moves/lib/trees.mjs:6` imports a scratch file outside the repo

| Check | Command | Output |
|---|---|---|
| the import | `read MHGU/tools/gu-moves/lib/trees.mjs:1-60` | line 6: `import { parseEmc, buildTree, readArc, inflateEntry } from 'file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs';` |
| header admits it | same read | lines 4-5: "The EMC decoder is the repo one (G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs, byte-identical grammar to MHGU/tools/mhgu/emc.mjs)" |
| the file is not in the repo | `glob MHGU/tools/gu-moves/**/*.mjs;G:/tmp/GUAI/GuaiDecomp/*.mjs` | repo side: `gu-moves.mjs`, `regress.mjs`, `lib/{machine,trees,guarc,classinfo,arm}.mjs`; the import target exists **only** under `G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs` (author's scratch dir, outside the repository and outside version control) |
| what trees.mjs actually needs | `read MHGU/tools/gu-moves/lib/trees.mjs` (full) | only `parseEmc`, `buildTree`, `readArc`, `inflateEntry`; `trees.mjs` re-exports `parseEmc`/`buildTree` and exports `cmdtblFromArc`, `entryFacts`, `docFacts`, `weightSummary` |
| who pulls it in | `grep "from '\./|from '\.\./" MHGU/tools/gu-moves` | `lib/guarc.mjs:11` imports `cmdtblFromArc` from `./trees.mjs`, and `guarc.mjs` is imported by `gu-moves.mjs:38` — so the whole tracer dies at import time without `G:/tmp` |
| repo already has the decoder | `read MHGU/tools/mhgu/emc.mjs:35-120` | exports `MAGIC`, `VERSION`, `HEADER_SIZE`, `DESC_SIZE`, `LEN_TABLE`, `insLength`, `decodeScript`, `parseEmc`, `formatIns`; `parseEmc` returns `{version, sections:[{index,offset,entries:[{index,offset,length,ins}]}]}` |
| grammar is identical | `read G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs:96-175` vs the above | same `LEN_TABLE` hex string, same `insLength`/`decodeScript` bodies (emc-tree sets `sub: undefined` on non-block ins only), same header/descriptor/entry layout and bounds checks in `parseEmc`. The scratch `parseEmc` **additionally** records per-entry `bytes`/`reencoded`/`exact` (a byte-exact re-encode flag it never throws on) and `nsec` + section `count`; nothing under `tools/gu-moves` reads them (`grep "reencoded|\.exact|nsec" MHGU/tools/gu-moves` → no hits; `gu-moves.mjs:418` reads `doc.sections.length` only) |
| repo already has the arc reader | `read MHGU/tools/mhgu/arc.mjs:1-90` | exports `readArc(buf,label) -> {version,count,entries[{index,name,typeHash,csize,size,flags,offset}]}` and `inflateEntry(buf,entry,label)`; same 0x0C + 80 B entry layout, same `size & 0x1fffffff` mask, same zlib + exact-size check (it additionally enforces arc version 0x11) |
| the one thing missing from the repo | same two reads | `buildTree` exists **only** in the scratch module (`read G:/tmp/.../emc-tree.mjs:355-410`, `export function buildTree(ins)` lines 360-404) |

So: vendor `buildTree` (lines 360-404, unchanged) into `tools/gu-moves/lib/`, and wire `parseEmc`/`readArc`/
`inflateEntry` to the repo modules instead of carrying a second decoder.

### D3 — `tools/mhgu/README.md` claims three outputs the code does not write

| README row | Claim (`read MHGU/tools/mhgu/README.md` lines 21/28/30) | What the code does | Evidence |
|---|---|---|---|
| line 21 `func-inventory5.mjs` | `docs/data/functions.csv.gz` (23,885 functions) | writes `.tmp/mhgu/inventory/functions4.csv` | `read MHGU/tools/mhgu/func-inventory5.mjs` — line 2 `FLAT=...`, last statement `fs.writeFileSync('G:/omp works/.tmp/mhgu/inventory/functions4.csv', out.join('\n'))`; no other write |
| line 28 `decode-registry.py` | `docs/data/resource-registry.tsv` | writes `.tmp/mhgu/inventory/resource-registry.txt` | `read MHGU/tools/mhgu/decode-registry.py` — final statement `open('.tmp/mhgu/inventory/resource-registry.txt','w',...).write(...)`; no other write |
| line 30 `mon/mon-offsets.py` | `docs/data/member-offsets.tsv` (110 rows) | prints to stdout only | `read MHGU/tools/mhgu/mon/mon-offsets.py:60-118` — ends with `print(...)` + `print('\n# DONE')`; `grep "open\(|write|json\.dump\|json\.dumps\|print\(.*tsv" MHGU/tools/mhgu/mon` finds only the read-mode `open(FLAT,'rb')` in that file |

Three more rows of the same table are also false, found while checking the above:

| README row | Claim | What the code does | Evidence |
|---|---|---|---|
| line 29 `mon/mon-final.py` | `docs/data/class-inventory.tsv` (3,201 classes) | prints `fn=0x… @0x… size=… name=…` to stdout | `read MHGU/tools/mhgu/mon/mon-final.py:100-135`; `read MHGU/docs/data/class-inventory.tsv:1-3` shows the tracked file is `family\tname\tsize\tregistrar_fn\tregistrar_site\tsuspect`, a schema this script never prints |
| line 31 `mon/em-units.py`/`counter-slots*.py` | `docs/data/json/monster-slot-map-137.json` | `em-units.py`: stdout; `counter-slots.py`: `.tmp/mhgu/mon/counter-slots.out.txt`; `counter-slots3.py`: its own `OUT` under `.tmp` | `read MHGU/tools/mhgu/mon/counter-slots.py:1-33` (`OUT = …/.tmp/mhgu/mon/counter-slots.out.txt`); `read MHGU/tools/mhgu/mon/em-units.py:1-30` (no write); `read MHGU/tools/mhgu/mon/counter-slots3.py:1-20` (`OUT = …/.tmp/mhgu/mon/counter-slots3.out.txt`) |
| line 36 `mon/quest-dispatch.mjs` / `ai-entry4.mjs` | （stdout） | `quest-dispatch.mjs` writes `.tmp/mhgu/mon/quest-dispatch.out.txt` (`mkdirSync` + `writeFileSync(OUT, …)`); `ai-entry4.mjs` prints | `grep "functionStarts|nearestFunctionStart|disasm\(|findCallsTo|decode\(|rd32\(" MHGU/tools/mhgu/mon/quest-dispatch.mjs` → lines 208-209 (`fs.mkdirSync('G:/omp works/.tmp/mhgu/mon', …)`, `fs.writeFileSync(OUT, L.join('\n') + '\n')`) |

Tracked files that do exist, and who writes them today (the second half of the ticket):

| Tracked file | Written by a committed tool at that path? | Producer / closest producer | Evidence |
|---|---|---|---|
| `docs/data/functions-retile.csv.gz` | **yes** | `tools/mhgu/coverage/retile.mjs` (`OUT_CSV` line 19, written at line 103) | `grep "OUT_CSV" MHGU/tools/mhgu/coverage/retile.mjs` → `const OUT_CSV = path.join(ROOT, "docs/data/functions-retile.csv.gz");` … `fs.writeFileSync(OUT_CSV, zlib.gzipSync(...))` |
| `docs/data/functions.csv.gz` | no | `func-inventory5.mjs` → `.tmp/mhgu/inventory/functions4.csv`; both are `start,end,insns,callers,callees,strings` and 23,885 rows | `read MHGU/docs/data/functions.csv.gz:functions.csv:1-3` (6-line window, "23880 more lines" ⇒ 23,886 total lines); `read G:/omp works/.tmp/mhgu/inventory/functions4.csv:1-2` (same header, "23886" total lines) |
| `docs/data/resource-registry.tsv` | no | `decode-registry.py` → `.tmp/mhgu/inventory/resource-registry.txt`; 448 lines each, identical first 6 lines | `read MHGU/docs/data/resource-registry.tsv:1-5` and `read G:/omp works/.tmp/mhgu/inventory/resource-registry.txt:1-3` |
| `docs/data/member-offsets.tsv` | no | `mon/mon-offsets.py` prints (its stdout is not a TSV at all); `coverage/fix-member-fn.mjs` only *reads* it and writes `inventory/member-offsets-refn.tsv` | `read MHGU/docs/data/member-offsets.tsv:1-3` (header `fn\toffset\ttype\tmember_name\tsite`); `read MHGU/tools/mhgu/coverage/fix-member-fn.mjs:1-20` |
| `docs/data/class-inventory.tsv` | no | none in `tools/`; readers only (`audit/audit-new-docs.mjs:43`, `coverage/class-from-code.mjs:90`, `coverage/member-seeds.mjs:50`) | `grep "class-inventory\.tsv" MHGU/tools` |
| `docs/data/tierb-labels.csv` | no | `tools/mhgu/tierb-merge.py` → `.tmp/mhgu/inventory/tierb-labels.csv`; identical header, 379 lines each | `read MHGU/tools/mhgu/tierb-merge.py` (last block); `read MHGU/docs/data/tierb-labels.csv:1-3`; `read G:/omp works/.tmp/mhgu/inventory/tierb-labels.csv:1-2` |

## Fixes

Before/after (every "after" is on disk; `node --check` output is in "## Verification"):

| File | Before | After |
|---|---|---|
| `tools/mhgu/mon/quest-dispatch.mjs:5` | `import { decode, rd32, findCallsTo } from '../tools/arm32.mjs';` (resolves to the non-existent `tools/mhgu/tools/arm32.mjs`) | `from '../arm32.mjs'` |
| `tools/mhgu/mon/ai-entry4.mjs:4` | `import { buf, rd32, TEXT_END, disasm, functionStarts, nearestFunctionStart } from '../tools/arm32.mjs';` | `from '../arm32.mjs'` |
| `tools/gu-moves/lib/trees.mjs:4-7` | `import { parseEmc, buildTree, readArc, inflateEntry } from 'file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs';` | header reworded; `from './emc-tree.mjs'` |
| `tools/gu-moves/lib/emc-tree.mjs` | did not exist | new file: `parseEmc` from `../../mhgu/emc.mjs`, `readArc`/`inflateEntry` from `../../mhgu/arc.mjs`, plus `buildTree` copied verbatim from the scratch module |
| `tools/mhgu/README.md:21` (`func-inventory5.mjs`) | output `docs/data/functions.csv.gz` | output `.tmp/mhgu/inventory/functions4.csv` |
| `tools/mhgu/README.md:28` (`decode-registry.py`) | output `docs/data/resource-registry.tsv` | output `.tmp/mhgu/inventory/resource-registry.txt` (notes the 448-row three-column format) |
| `tools/mhgu/README.md:29` (`mon/mon-final.py`) | output `docs/data/class-inventory.tsv`（3,201 类） | output （stdout）, with the printed form `fn=… @0x… size=… name=…` |
| `tools/mhgu/README.md:30` (`mon/mon-offsets.py`) | output `docs/data/member-offsets.tsv`（110 条） | output （stdout）, with the grouping/row form it really prints |
| `tools/mhgu/README.md:31` (`mon/em-units.py` / `counter-slots*.py`) | output `docs/data/json/monster-slot-map-137.json` | output `.tmp/mhgu/mon/counter-slots.out.txt` / `counter-slots3.out.txt`, `em-units.py` stdout |
| `tools/mhgu/README.md:36` (`mon/quest-dispatch.mjs` / `ai-entry4.mjs`) | output （stdout） | `.tmp/mhgu/mon/quest-dispatch.out.txt`（`ai-entry4.mjs` stdout） |
| `tools/mhgu/README.md` (new text) | no statement of what the tracked `docs/data/*` files really come from | one sentence above the table plus the section "`docs/data/` 追踪文件与生产者" (six tracked files, each with producer or "none in the tree" and the evidence) |

Decisions worth recording:

1. **D2 shape.** The scratch module `emc-tree.mjs` is 914 lines: a copy of the repo decoder, a copy of the repo arc
   reader, the tree builder, an opcode table, a renderer, a re-encoder, binary probes and a CLI. `trees.mjs` uses
   four names. Vendor only `buildTree` (the one piece the repo lacks); point the other three at the repo modules.
   A copy of `parseEmc`/`readArc` in `lib/` would be a second decoder to keep in sync, and the scratch module's own
   header already declares its decoder "byte-identical grammar" to `tools/mhgu/emc.mjs`.
2. **No behaviour change.** `buildTree` is verbatim (lines 360-404 of the scratch file, including the unused `op` parameter of the inner
   `ensureBody`, so a diff against the original stays mechanical). The repo `parseEmc` drops four fields the scratch
   one recorded (`bytes`, `reencoded`, `exact` per entry; `nsec` per file) — none is read by any file under
   `tools/gu-moves`, and `exact` was only a recorded flag, never an error path. The repo `readArc` is stricter than
   the scratch copy (it enforces version 0x11) but `lib/guarc.mjs:9` already loads the same enemy arcs through that
   very function (`arcEntry`, `loadCmdtbl`), so a successful gu-moves run already had to pass that check.
3. **D3 scope.** The ticket names three rows; rows 29, 31 and 36 of the same table are false in the same way and
   were corrected with the same level of evidence (see "Confirmed" D3). Leaving them would keep the table
   contradicting the new "tracked file → producer" section.
4. **Gate untouched.** `tools/audit/check.mjs` gate 1 prints a `note` (not a failure) for docs absent from the
   frozen manifest, so this new report does not need a `MANIFEST.tsv` entry; gate 3 only walks `*.tsv`. Verified
   by reading `tools/audit/check.mjs:19-39`, and the gate still reports `ALL PASS` (below).

## Runtime inputs (why the tools themselves were not executed)

`.tmp` image default of `arm32.mjs` and the gu-moves romfs root both exist on this machine, so the fixed tools are
runnable in principle — but they are out-of-repo inputs, so an outsider cannot run them:

| Input | Command | Present? |
|---|---|---|
| `G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` (`arm32.mjs:5` default) | `glob "G:/omp works/.tmp/mhgu/extract/exefs-0eb5/*"` | yes (`main.140.flat.bin`, `sdk.flat.bin`, `main`, …) |
| `MHGU/main.140.flat.bin` (the documented alternative, `FLAT=<path>`) | `glob "MHGU/main.140.flat.bin;…"` | yes |
| `G:/mhgu-romfs/romfs/nativeNX/arc/enemy/em001_00.arc` (needed by `gu-moves`) | same glob | yes |
| `.tmp/mhgu/mon/`, `.tmp/mhgu/inventory/` output dirs | `glob "G:/omp works/.tmp/mhgu/mon/*"`, `"G:/omp works/.tmp/mhgu/inventory/*"` | yes (they hold the historical outputs quoted above) |

Still not run: a full `mon/*.mjs` run rewrites `.tmp/mhgu/mon/*.out.txt`, and a full `gu-moves` run rewrites
`G:/tmp/GuMoves/out/**`; the tree's rule is that the main agent builds. `node --check` parses only — it does not
resolve imports — so import resolution is established by path arithmetic on `glob`-verified files:
`./emc-tree.mjs` is the new file in `tools/gu-moves/lib/`, `../../mhgu/emc.mjs` and `../../mhgu/arc.mjs` resolve to
`MHGU/tools/mhgu/{emc,arc}.mjs` (both read in full above), and `../arm32.mjs` from `tools/mhgu/mon/` is
`MHGU/tools/mhgu/arm32.mjs` (listed by the `glob` above). `emc.mjs` and `arc.mjs` do no I/O at import time.

## Verification

`node --check` on every edited file, plus the tree gate, run by the main session (this session has no shell device:
`xd://run` → "No such tool", `proc://` lists no executor). Output verbatim, also at
`G:/omp works/.tmp/W3-toolfix-check.txt`:

```
== tools/mhgu/mon/quest-dispatch.mjs
OK
== tools/mhgu/mon/ai-entry4.mjs
OK
== tools/gu-moves/lib/emc-tree.mjs
OK
== tools/gu-moves/lib/trees.mjs
OK
== audit gate
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

`README.md` is not a JS file; its edits are text-only and were re-read after the edit (line numbers above are the
post-edit listing).

## Unknown

- **When** each tracked `docs/data/*` file was copied out of `.tmp`. Git history was not read (no shell in this
  session), so the README says "copied from `.tmp` (or produced before the writer's path changed)" instead of a date.
- Whether `docs/data/class-inventory.tsv` came from a version of `mon/mon-final.py` that wrote a TSV. The committed
  script prints a different schema, and no writer exists outside `tools/` either:
  `grep "writeFileSync|open\([^)]*['\"]w['\"]" MHGU;!MHGU/docs;!MHGU/tools;!**/node_modules/**` returns only two
  unrelated C reporters (`forge/boxprobe/boxprobe.c:64`, `forge/itembox-v7/itembox.c:134`).
- Whether the fixed `gu-moves` emits byte-identical `variants.tsv` / `facts.json` to the old scratch-import version.
  No run was made. The argument is structural: `buildTree` is verbatim, `parseEmc`'s grammar and output shape were
  compared line by line, and the arc reader is the same function `lib/guarc.mjs` already used on the same buffers.
- Whether `mon/ai-entry4.mjs` / `mon/quest-dispatch.mjs` still produce their historical `.tmp` outputs. Both were
  `node --check`ed only: `arm32.mjs` does `fs.readFileSync(FLAT)` at import time (line 6), so importing them would
  execute the whole analysis, which is the main agent's job.

## VERDICT

One line per ticket item, tab-separated (`ITEM \t verdict \t evidence`), ready for `LINK-STATUS.tsv`:

```
W3-TF1	fixed	tools/mhgu/mon/quest-dispatch.mjs:5 and ai-entry4.mjs:4 now import '../arm32.mjs' (MHGU/tools/mhgu/arm32.mjs exists and exports all 8 names they use; tools/mhgu/tools/ does not exist), node --check OK on both
W3-TF2	fixed	tools/gu-moves/lib/trees.mjs now imports './emc-tree.mjs', a new in-repo module that re-exports parseEmc from tools/mhgu/emc.mjs and readArc/inflateEntry from tools/mhgu/arc.mjs and carries buildTree copied verbatim from the scratch file; no import under tools/ points at G:/tmp/GUAI any more (only the new file's provenance comments name it), node --check OK
W3-TF3	fixed	tools/mhgu/README.md output column now states what each script writes (functions4.csv, resource-registry.txt, stdout for mon-final/mon-offsets, counter-slots{,-3}.out.txt) and the new section "docs/data/ 追踪文件与生产者" names, per tracked file, whether any committed script writes that path and what the real producer is
```

## Difficulties

1. No shell device in this session (`xd://run` is not mounted; only the seven `mhgu_re` MCP tools, `proc://` with
   no executor). Two of the three fixes are JS, and the ticket's acceptance is a `node --check` run, so the check
   had to be delegated to the main session; its verbatim output is quoted above.
2. The defect-2 module had to be reconstructed by reading a 914-line scratch file outside the repo and separating
   what `trees.mjs` uses from what it does not; the four used names are listed in "Confirmed" D2, and the rest is
   not vendored on purpose.
3. The three README rows are not the only false ones; the ticket's "three outputs" is a lower bound. Proving rows
   29/31/36 false needed reading six scripts and both sides of four `.tmp`↔`docs/data` pairs (line counts, headers,
   first rows). The one thing not provable from the tree is *when* each tracked file was copied out of `.tmp`, so
   the README says "copied from `.tmp` (or generated before the write path changed)" rather than inventing a date.
4. `mon-offsets.py`'s stdout cannot be the direct source of `member-offsets.tsv`: the stdout keys rows by the
   registrar function (`0x4201c`) while the TSV keys them by the containing function (`0x4210c`). The re-keying
   step is not in the tree, so the README states that the TSV has no committed producer rather than naming the
   script as its producer.
5. Line numbers in `tools/mhgu/README.md` shifted by +3 (the two-line caveat plus its blank line above the table).
   Audit reports that cite the old numbers (`PUBLISH-TOOL-DEPS.md` §5c cites `README.md:21/34/35`,
   PUBLISH-DATA-PROVENANCE cites `:21`) now land three lines earlier — e.g. `:21` is the `nso-flat.mjs` row, not
   `func-inventory5.mjs`; the row text is the stable anchor, and renumbering other audit files is outside this
   ticket.

