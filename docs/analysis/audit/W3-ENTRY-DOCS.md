# W3-ENTRY-DOCS — the first screen, and the traceability of the two calibres

Ticket: act on `docs/analysis/audit/PUBLISH-ENTRY-DOCS.md` §2 items 1-8 (the first-screen and traceability gaps), plus
the disclosure in `DEVELOP.md`'s asset table (R1 of the same report). Nothing outside that was touched.

Every number below carries the command that produced it, run in this session from `G:/omp works/MHGU`. Nine tracked
files changed, +155 / -27 lines, and `node tools/audit/check.mjs` still prints `ALL PASS`.

| Ticket work item | Files | PUBLISH-ENTRY-DOCS item | Verdict |
|---|---|---|---|
| 1. README first screen: what it is, the two calibres with commands, 90% not met, image / no-image, where to start | `README.md` | 1 | fixed |
| 2. Name the two no-image commands and what each prints | `README.md`, `docs/analysis/code/coverage/METER.md` | 5 | fixed |
| 3. `docs/PRIVATE-DATA.md` cross-reference: missing files and what breaks | `README.md`, `docs/README.md`, `docs/PRIVATE-DATA.md` | 3 (data half) | fixed |
| 4. `DEVELOP.md` machine-path table: no download path, no profile id | `DEVELOP.md` | R1 | fixed |
| — (needed to make item 2 true on a clone) | `tools/mhgu/coverage/canonical-metric.mjs`, `independent-coverage.mjs`, `tools/mhgu/arm32.mjs`, `tools/mhgu/reader-fields.mjs` | 5, 7 | fixed |
| — (README path table rows, docs index retitle) | `README.md`, `docs/README.md` | 2, 8 | fixed |

---

## 1. The two commands, run before anything was written

Both were run to confirm that the numbers the README would advertise already exist and reproduce. No script was edited
yet at this point:

```
$ node tools/mhgu/coverage/canonical-metric.mjs
canonical metric (HANDOFF §5: Tier A + Tier B conf=A over .text instructions)
  Tier A verified   25584 functions, 57.7% of instructions
  Tier B conf=A     74 functions, 0.3% of instructions
  canonical total   58.0% (target >= 90%, not met)
  (raw spine tier A would be 26057 functions / 58.1% -- it still carries the label of
   473 functions a recorded review refuted, so it is not the published number)

$ node tools/mhgu/coverage/independent-coverage.mjs
match spread unvalidated         independent  1243602  report  1243602
match no label                   independent   524143  report   524143
covered at >=90% independently: 3460532 = 66.19% of instructions
PASS independent recomputation reproduces the report partition
```

The second calibre's function figure (53.5%) is not printed by either script; it is the fourth column of one tracked
row, and the README cites that row rather than the script:

```
$ grep -n ">=90%" docs/analysis/code/inventory/coverage-report.tsv
18:covered at >=90% precision	28187	3460532	66.2%	53.5%
```

The input inventory that makes the second command image-free is the 24-entry `sources.json`:

```
$ node -e "const s=require('./docs/analysis/code/inventory/sources.json');console.log('sources.json entries',s.length)"
sources.json entries 24
```

## 2. Which scripts in the meter chain actually need the image

`PUBLISH-ENTRY-DOCS` §1.3 asserted "five of them read the image" without preserving the command. Re-derived here by
testing each of the 18 scripts named in the `METER.md` command block for an image reference:

```
$ for s in retile stringxref seeds-from-xref fingerprints vtable-scan seeds-from-vtables relabel-rtti vtable-unknown \
    class-family seeds-from-strings vtable-class-consensus immscan classvote callervote callvote callvote1 recompute report; do
    f=tools/mhgu/coverage/$s.mjs; if grep -qE "arm32\.mjs|FLAT|flat\.bin" $f; then echo "NEEDS-IMAGE  $s"; else echo "no-image     $s"; fi; done
NEEDS-IMAGE  retile
NEEDS-IMAGE  stringxref
no-image     seeds-from-xref
NEEDS-IMAGE  fingerprints
NEEDS-IMAGE  vtable-scan
no-image     seeds-from-vtables
no-image     relabel-rtti
no-image     vtable-unknown
no-image     class-family
no-image     seeds-from-strings
no-image     vtable-class-consensus
NEEDS-IMAGE  immscan
no-image     classvote
no-image     callervote
no-image     callvote
no-image     callvote1
no-image     recompute
no-image     report
```

Five of eighteen, and the remaining thirteen do not merely avoid the image - they read only tracked files:

```
$ git ls-files docs/analysis/code/inventory | wc -l        -> 173
$ git ls-files --others --exclude-standard docs/analysis/code/inventory | head   -> (no output)
$ git ls-files docs/data/functions-retile.csv.gz docs/analysis/code/inventory/sources.json \
    docs/analysis/code/inventory/tiers-merged.csv docs/analysis/code/inventory/coverage-report.tsv
docs/analysis/code/inventory/coverage-report.tsv
docs/analysis/code/inventory/function-labels.tsv
docs/analysis/code/inventory/sources.json
docs/analysis/code/inventory/tiers-merged.csv
docs/data/functions-retile.csv.gz
```

`form-classify`, which the hand-off chain runs outside that block, is the sixth image reader:

```
$ grep -n "FLAT\|flat" tools/mhgu/coverage/form-classify.mjs
13:const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");
```

## 3. Why two coverage scripts had to change before the README could name them

Both headline scripts hard-coded the author's tree:

```
$ grep -n "^const ROOT" tools/mhgu/coverage/canonical-metric.mjs tools/mhgu/coverage/independent-coverage.mjs
tools/mhgu/coverage/canonical-metric.mjs:16:const ROOT = "G:/omp works/MHGU";
tools/mhgu/coverage/independent-coverage.mjs:10:const ROOT = "G:/omp works/MHGU";
```

A README that tells a stranger "run this to see 58.0%" is false while that line stands, so the two constants now derive
the repository root from the module's own location, the pattern already used in `tools/audit/check-citations.mjs`:

```
$ git diff -U1 -- tools/mhgu/coverage/canonical-metric.mjs tools/mhgu/coverage/independent-coverage.mjs
-const ROOT = "G:/omp works/MHGU";
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
```

Proof that the claim is now location-independent - both run from a different working directory:

```
$ cd /tmp && node "G:/omp works/MHGU/tools/mhgu/coverage/canonical-metric.mjs" | tail -3
  canonical total   58.0% (target >= 90%, not met)

$ cd C:/ && node "G:/omp works/MHGU/tools/mhgu/coverage/independent-coverage.mjs" | tail -2
covered at >=90% independently: 3460532 = 66.19% of instructions
PASS independent recomputation reproduces the report partition
```

The `[IMG]` claim in §2 is `grep`-based, so it was also checked that those scripts keep working after the edit: no script
outside the four edited files was touched, and `node --check` passes on all four (§7).

## 4. `README.md` — the first screen

Old file: 23 lines, no percentage, no count, no date, and a path table that omitted `docs/PROGRESS.md`, `METER.md`,
`HANDOFF.md`, `DEVLOG.md`, `tools/audit/`, `tools/mhgu/coverage/`, `forge/` and `editor/`. New file: 118 lines in
English with five sections. The exact added lines (from `git diff -U0 -- README.md`):

```
Nothing here ships game code, keys, game files, or save files. What it does ship is a claim: that
its numbers can be recomputed. The two sections below name the numbers and the commands.

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
| `docs/analysis/audit/` | Audits of these documents, `LINK-STATUS.tsv` dispositions, `MANIFEST.tsv`. |
| `docs/data/` | The numeric base for the mechanics pages - see "What a clone does not contain". |
| `tools/mhgu/` | Disassembler, inventory and analysis scripts (Node + Python). |
| `tools/mhgu/coverage/` | The meter pipeline; the two no-image commands above live here. |
| `tools/audit/check.mjs` | The 12-gate check over the tree. |
| `HANDOFF.md` | Long-form hand-off: method, evidence, open questions. |
| `DEVLOG.md` | Dated work log: what changed, what was withdrawn and why. Read the last section, not the file. |
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
```

Each claim in that block is anchored, not invented:

| Claim | Where it comes from, this session |
|---|---|
| 25 MB image | `$ ls -l main.140.flat.bin` -> `25472632` bytes |
| 18 MB db, and that it is untracked | `$ ls -l docs/data/mhgu.db` -> `18333696`; `.gitignore` line `docs/data/mhgu.db` |
| `check.mjs` prints twelve `PASS` lines | §7 output below |
| gate 12 degrades to a note | `check.mjs:209-210`: `if (!fs.existsSync(dbPath)) { console.log("note database ... skipped")` |
| gate 6 fails with `ENOENT` | `verify-evidence.mjs:12`: `const buf = fs.readFileSync(ROOT + "/main.140.flat.bin");`, no `existsSync` guard |
| `size-final.mjs` reads two fixed snapshots | `grep -n "save-snapshots" tools/mhgu/mon/size-final.mjs` -> `system_CLEAN` and `20261022-v6-ready/system` |
| `roundtrip.mjs` defaults to `<repo>/save-snapshots` | `editor/test/roundtrip.mjs:19` |
| six scripts still hardcode the scratch path | `grep -n "exefs-0eb5/main.140.flat.bin" tools/mhgu/*.mjs` -> `fn-cluster.mjs:2`, `func-inventory5.mjs:2`, `member-reader-trace.mjs:4`, `state-motion2.mjs:2`, `state-motion3.mjs:2`, `vtable-crc.mjs:2` |
| `editor-src/` is read by no tracked script | `grep -rn "editor-src" tools/` -> one comment in `export-dlc-table.mjs:3`, no `readFile` |

The old caveat that `README.md:8` stated ("no save files in this repository") is kept, but the new text says *why* it can
be trusted: nothing here ships them, and the missing ones are enumerated one section later.

## 5. `docs/README.md` — the index now covers the repository

The index was titled "MHGU 存档逆向知识库 — 索引" (save-file knowledge base) and said the repo has "only two sources of
truth": `save-layout/` and `analysis/`. It listed no `analysis/code/`, no `tools/`, and no `METER.md`, although
`docs/analysis/code` is the largest documentation cluster in the tree:

```
$ git ls-files '*.md' | cut -d/ -f1-3 | sort | uniq -c | sort -rn | head -4
     66 docs/analysis/code
     23 docs/analysis/external
     23 docs/analysis/audit
     12 docs/reference/formats
```

Added lines:

```
# MHGU 研究仓库 — 目录索引（存档 / 代码 / 机制）
> **总进度与差距：[`PROGRESS.md`](PROGRESS.md)** · **代码覆盖率（唯一数字权威）：[`analysis/code/coverage/METER.md`](analysis/code/coverage/METER.md)**
> · **存档覆盖率记分牌：[`save-layout/coverage-map.md`](save-layout/coverage-map.md)** · **不随仓库分发的私有数据：[`PRIVATE-DATA.md`](PRIVATE-DATA.md)**
本 repo 的「真相源」分三层：`save-layout/`（存档权威布局/契约）、`analysis/code/`（代码侧函数表、证据通道与
覆盖率计量器）、其余 `analysis/`（调查报告，含置信度）。其余目录均为**数据/参考资料**，不是本项目的产出结论。

代码侧的两个口径与各自的命令写在仓库根目录 `README.md`；本索引只负责把目录讲清楚。
| `analysis/code/` | **代码侧**：`inventory/`（函数表、采用来源、`coverage-report.tsv`）、`tierb-pass*/`（切片定案）、`coverage/METER.md`（**唯一数字权威**，含三次更正的过程）| ✅ |
| `analysis/audit/` | 对本仓库文档与数字的审计、`LINK-STATUS.tsv`（每条指控的处置：fixed/open/rejected）、`MANIFEST.tsv`（冻结的文档清单）| ✅ |
| `tools/`（仓库根） | 反汇编、清单、覆盖率流水线与 `audit/check.mjs` 等脚本 | ✅ |
| `forge/`、`editor/`（仓库根） | 道具箱扩容实验（debug 端口 / box probe / v7 构建）与存档编辑器源码 | ✅ |
| `PRIVATE-DATA.md` | 不进本仓库的私有输入清单（镜像、存档快照、`mhgu.db`、wiki、第三方源码）及缺失后的后果 | — |
```

The three links added to the banner resolve (directory listing of `docs/analysis/code/coverage/METER.md` and
`docs/PRIVATE-DATA.md` both exist; `check.mjs` gate 1 walks `docs/` and reports `manifest covers 214 docs, all present`).
The file stays in Chinese: it is an index of Chinese documents and the ticket only requires an English first screen.

## 6. `METER.md` — the 18-script block now says which five need the image

`METER.md:11-37` listed 20 `node` invocations with no indication that five of them read the game image, and never
presented the two no-image commands as "the no-image path". Added before the block:

````
**只想看两个口径、不重跑整条链路的，跑这两条命令——都不读游戏镜像**（输入全是仓库内已跟踪的表）：

```
node tools/mhgu/coverage/canonical-metric.mjs      # Tier A verified 25584 函数 57.7% + Tier B conf=A 74 函数 0.3% = canonical total 58.0%（目标 90% 未达成）
node tools/mhgu/coverage/independent-coverage.mjs  # 分区逐行 + covered at >=90% independently: 3460532 = 66.19% of instructions + PASS 分区复现
```

**18 个脚本分两类**（逐脚本按 `arm32.mjs` / `FLAT` / `flat.bin` 判定）：带 `[IMG]` 的 5 个（`retile`、`stringxref`、`fingerprints`、`vtable-scan`、`immscan`）需要镜像，其余 13 个（`seeds-from-xref`、`seeds-from-vtables`、`relabel-rtti`、`vtable-unknown`、`class-family`、`seeds-from-strings`、`vtable-class-consensus`、`classvote`、`callervote`、`callvote`、`callvote1`、`recompute`、`report`）只读已跟踪的表；**顺序仍然重要**，5 个 `[IMG]` 是上游，删掉它们就只能从仓库内现成的表重新分层与出报告。`form-classify` 不在本块内，它同样需要镜像。
````

and inside the block, one marker comment plus `[IMG]` on the five lines:

```
# [IMG] = 需要 main.140.flat.bin（本机 25 MB、不入库）；无标记者只读仓库内已跟踪的表
node tools/mhgu/coverage/retile.mjs          # [IMG] 用 46,087 个前导 + BL 目标重建函数表（52,692 个真函数）
node tools/mhgu/coverage/stringxref.mjs --write # [IMG] 从指令里重建字符串引用（不信任旧 strings 列）
node tools/mhgu/coverage/fingerprints.mjs    # [IMG] 结构指纹 + 动作签名 → attr-fingerprint.tsv
node tools/mhgu/coverage/vtable-scan.mjs     # [IMG] rodata 全量 vtable → vtables-slots.tsv
node tools/mhgu/coverage/immscan.mjs         # [IMG] 32 位常量签名 → attr-immscan.tsv
```

A literal split into two fenced blocks was **not** done, deliberately: `immscan` (image) comes after `class-family`
(no image) and `recompute`/`report` consume all of them, so separating the image readers from the rest would destroy
the ordering the block documents. The list of five in prose plus the per-line `[IMG]` marker carries the same
information without breaking the run order. This is the one place where the ticket's phrasing ("split") is
interpreted as "make the classification explicit", and the reason is recorded here rather than left implicit.

Gate 9 re-read the calibre after the edit and found one more stating line, which is this change quantified:

```
before: PASS published project calibre matches canonical-metric.mjs (58.0%) at 7 site(s)
after:  PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
```

## 7. `DEVELOP.md` — the asset table no longer publishes a download path or a profile id

Old rows (all six had a machine-specific value, two of them disclosure-grade):

```
| yuzu 主程序 | `LOCAL\yuzu1734\yuzu.exe` | 用户游玩端 |
| 游戏镜像 | `I:\BaiduNetdiskDownload\MONSTER HUNTER GENERATIONS ULTIMATE][1.4.0].xci` | 12.57 GB |
| yuzu AppData | `G:\appdata\C-Users-USER\Roaming\yuzu\`（junction） | nand/keys/load 全在 G: |
| MHGU 存档 | `yuzu/nand/user/save/0000000000000000/85A7D07F6ED7C1D6F6045DE67FE969F1/0100770008DD8000/` | `*.hnt`(1,177,760 B/槽) + `system`(5,159,100 B) |
| LayeredFS 目录 | `yuzu/load/0100770008DD8000/` | 已有 a商店MOD / b4k / ChuckPatch / c120FPS-Map |
| prod.keys | `yuzu/keys/prod.keys` | hactool 可用（`-k` 传参即可，勿放 hactool 同目录） |
```

New rows, plus a paragraph that says where the real values live and how the scripts take them:

```
| yuzu 主程序 | `<yuzu>\yuzu.exe` | 用户游玩端；版本号不入库 |
| 游戏镜像 | `<你的 XCI>` | 12.57 GB，用户自备；**本仓库不记录获取途径** |
| yuzu AppData | `<yuzu 数据目录>`（默认 `%APPDATA%\yuzu\`） | nand / keys / load 都在这一棵树下 |
| MHGU 存档 | `<yuzu 数据目录>\nand\user\save\0000000000000000\<save-id>\0100770008DD8000\` | `*.hnt`(1,177,760 B/槽) + `system`(5,159,100 B)；`<save-id>` 是 yuzu 为该账号生成的 32 位十六进制目录名，逐机不同 |
| LayeredFS 目录 | `<yuzu 数据目录>\load\0100770008DD8000\` | 已有 a商店MOD / b4k / ChuckPatch / c120FPS-Map |
| prod.keys | `<yuzu 数据目录>\keys\prod.keys` | hactool 可用（`-k` 传参即可，勿放 hactool 同目录） |

**这些值不写进仓库。** 表里全是占位符：真实的 yuzu 安装位置、XCI 路径、账号存档目录只存在于使用者本机。脚本能覆盖的输入走环境变量——`FLAT`（游戏镜像；`tools/mhgu/arm32.mjs`、`tools/mhgu/reader-fields.mjs` 读，默认 `<repo>/main.140.flat.bin`）、`MHGU_DB`（`docs/data/mhgu.db`，`tools/audit/check.mjs` 门 12）、`MHGU_ROMFS`（romfs，`tools/mhgu/stqr.mjs`、`tools/mhgu/guopus.mjs`）；其余只能由使用者按自己的安装位置重填，**换机后不要把它们写回本文件**。私有输入清单见 `docs/PRIVATE-DATA.md`。
```

The three environment variables named are the ones the tools actually read, verified:

```
$ grep -rn "process.env.MHGU_DB" tools/audit/check.mjs
208:  const dbPath = process.env.MHGU_DB || path.join(ROOT, "docs/data/mhgu.db");
$ grep -rn "process.env.MHGU_ROMFS" tools/mhgu/stqr.mjs tools/mhgu/guopus.mjs
tools/mhgu/stqr.mjs:201:  return process.env.MHGU_ROMFS || 'G:/mhgu-romfs/romfs/nativeNX';
tools/mhgu/guopus.mjs:809:    await cmdSelftest(opt(rest, '--romfs', process.env.MHGU_ROMFS || 'G:/mhgu-romfs/romfs/nativeNX'), ...
```

After the edit, the two disclosure strings survive only in documents that *report* them as a finding (see §9):

```
$ grep -rn "BaiduNetdisk\|85A7D07F\|C-Users" --include=*.md --include=*.mjs --include=*.tsv --include=*.txt . \
    | grep -v "^./docs/analysis/audit/W3"
docs/analysis/audit/PUBLISH-ENTRY-DOCS.md:306
docs/analysis/audit/PUBLISH-REPO-HYGIENE.md:130,131,132
docs/PUBLISH-READINESS.md:11
```

## 8. `arm32.mjs` and `reader-fields.mjs` — the image default pointed outside the repository

`PUBLISH-ENTRY-DOCS` item 7. Both carried `G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`, a scratch copy
that does not exist after a clone:

```
$ cmp main.140.flat.bin "G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin" && echo SAME
SAME
```

so the two copies are interchangeable and the default can point into the repository:

```
-export const FLAT = process.env.FLAT || 'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
+export const FLAT = process.env.FLAT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'main.140.flat.bin');
```

Verified from a different drive, no `FLAT` set:

```
$ cd C:/ && node --input-type=module -e "const m = await import('file:///G:/omp%20works/MHGU/tools/mhgu/arm32.mjs'); console.log('FLAT', m.FLAT); console.log('bytes', m.buf.length);"
FLAT G:\omp works\MHGU\main.140.flat.bin
bytes 25472632
```

`reader-fields.mjs` carries the same constant and got the same one-line change; the six other scripts that still hardcode
the scratch path are named in the README instead of being edited here, because they are `PUBLISH-TOOL-DEPS` items and a
tools wave owns those files.

## 9. Not done, and why

| PUBLISH-ENTRY-DOCS item | State | Reason |
|---|---|---|
| 3 — `check.mjs:10` absolute `ROOT` | open | The gate runner is a tools-wave file and a sibling wave is creating `tools/audit/check-citations.mjs` right now; editing `check.mjs` in parallel risks a lost update. The README does not promise that `check.mjs` runs from another path, so nothing in this wave is false because of it. |
| 4 — `verify-evidence.mjs` guard so a clone without the image can run the gate | open | Same file-ownership reason as item 3, and it is a verification-strength decision (a skipped gate must not read as a passed one). The README states today's behaviour instead: gate 6 fails with `ENOENT` without the image, gate 12 prints a note. |
| 9-19 | untouched | Outside the ticket. Items 11 (licence for derived tables), 12 (`PUBLISH-READINESS` as internal plan), 13-15 (numbers that need private inputs), 16 (patch install path), 17 (out of scope / reporting), 18 (`AGENTS.md` citation), 19 (data provenance row) remain open in the audit. |

Residual disclosure, reported rather than edited: `docs/PUBLISH-READINESS.md:11`,
`docs/analysis/audit/PUBLISH-REPO-HYGIENE.md:130-132` and `docs/analysis/audit/PUBLISH-ENTRY-DOCS.md:306` quote the
`BaiduNetdisk` path and the `85A7D07F…` save id verbatim as evidence. They are the documents that *report* the leak, but
until they are masked the strings are still in `HEAD`. Masking them is a one-line edit each and belongs to whoever owns
those reports.

## 10. Verification

```
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 18 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): ...
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

The `note ... 18 doc(s)` line is not a failure: it counts documents added after the manifest was frozen on 2026-11-03.
It printed 16 at the start of this session, 17 when a sibling wave landed `W3-TOOLFIX.md`, and 18 with this file.

```
$ for f in tools/mhgu/coverage/canonical-metric.mjs tools/mhgu/coverage/independent-coverage.mjs \
           tools/mhgu/arm32.mjs tools/mhgu/reader-fields.mjs; do node --check $f && echo "OK $f"; done
OK tools/mhgu/coverage/canonical-metric.mjs
OK tools/mhgu/coverage/independent-coverage.mjs
OK tools/mhgu/arm32.mjs
OK tools/mhgu/reader-fields.mjs

$ git diff --stat -- README.md docs/README.md docs/PRIVATE-DATA.md docs/analysis/code/coverage/METER.md DEVELOP.md \
    tools/mhgu/coverage/canonical-metric.mjs tools/mhgu/coverage/independent-coverage.mjs \
    tools/mhgu/arm32.mjs tools/mhgu/reader-fields.mjs
 DEVELOP.md                                   |  14 ++--
 README.md                                    | 114 +++++++++++++++++++++++++--
 docs/PRIVATE-DATA.md                         |   2 +
 docs/README.md                               |  16 +++-
 docs/analysis/code/coverage/METER.md         |  20 +++--
 tools/mhgu/arm32.mjs                         |   4 +-
 tools/mhgu/coverage/canonical-metric.mjs     |   4 +-
 tools/mhgu/coverage/independent-coverage.mjs |   4 +-
 tools/mhgu/reader-fields.mjs                 |   4 +-
 9 files changed, 155 insertions(+), 27 deletions(-)
```

## Verdict lines

```
W3-P1	PUBLISH	README first screen states what the project is, the two calibres with the command and the printed line for each, that the 90% target is not met, which numbers need the image and which do not, and where to start reading	fixed	README.md now carries five sections in English; the two commands were rerun this session and print canonical 58.0% and 3460532 = 66.19%
W3-P2	PUBLISH	README path table omitted PROGRESS, HANDOFF, DEVLOG, METER, tools/audit, tools/mhgu/coverage, forge and editor	fixed	all eight rows added to the "What is in the repository" table
W3-P3	PUBLISH	check.mjs:10 hardcodes G:/omp works/MHGU so the 12-gate check cannot run in another checkout	open	not edited: a sibling tools wave owns tools/audit in this session, and no README claim depends on it (the README states gate 6 needs the image)
W3-P4	PUBLISH	verify-evidence.mjs:12 reads the image with no existence guard, so a clone gets ENOENT from gate 6	open	not edited: same file ownership, and turning a failing gate into a skip is a verification-strength decision; README documents today's behaviour instead
W3-P5	PUBLISH	METER's 20-invocation block never said which scripts need the image and never named the two no-image commands	fixed	METER now names canonical-metric.mjs and independent-coverage.mjs with their printed lines and marks the 5 image scripts [IMG]; the split is per-line because a literal block split would break the documented run order (immscan sits after class-family)
W3-P6	PUBLISH	README's one line of dump instruction lacked the build id, the output path and the FLAT override	fixed	README "Producing the game image" now gives 4 steps with nsobid FB08F1D20FD1204FE7070672777F869B, the <repo>/main.140.flat.bin path, FLAT support and the six scripts that still hardcode a scratch path
W3-P7	PUBLISH	arm32.mjs:5 default image path is outside the repository and does not exist after a clone	fixed	arm32.mjs and reader-fields.mjs now resolve <repo>/main.140.flat.bin from import.meta.url; verified from C:/ with no FLAT set (25472632 bytes)
W3-P8	PUBLISH	docs/README.md was titled as a save-file knowledge base and listed no analysis/code, no tools, no METER	fixed	retitled to a whole-repository index, three truth-source layers, banner links METER and PRIVATE-DATA, and five rows added for analysis/code, analysis/audit, tools, forge/editor, PRIVATE-DATA
W3-R1	PUBLISH	DEVELOP.md's asset table published a Baidu Netdisk XCI path and a yuzu save-container id since 2026-10-29	fixed	all six rows are placeholders now, a paragraph names FLAT/MHGU_DB/MHGU_ROMFS as the configured inputs, and the two strings survive only in the reports that quote them as evidence
```

## Difficulties

- **The ticket's Work list and PUBLISH-ENTRY-DOCS items 1-8 are not the same set.** The Work list covers items 1, 2, 5,
  6 and 8 plus the `DEVELOP.md` disclosure (R1, not item 10); items 3, 4 and 7 are tool edits. I did 7 (two-line change,
  needed because the README names `<repo>/main.140.flat.bin`) and left 3 and 4 open, because a sibling wave was writing
  new files in `tools/audit/` during this session (`tools/audit/check-citations.mjs` appeared mid-run) and `check.mjs` is
  the acceptance gate itself. Both are recorded as `open` above rather than silently dropped.
- **Two coverage scripts had to be edited for the README to be true, not to fix a tool bug.** `canonical-metric.mjs` and
  `independent-coverage.mjs` hardcoded the author's root, so "run this and see 58.0%" would have been false for a
  stranger. That is four lines of change and is disclosed in §3; if the main session wants docs-only waves, these two
  are the only edits to argue about.
- **`METER.md`'s "split" is a classification, not two blocks.** The block documents an order in which image readers are
  interleaved with table-only scripts; splitting it physically would have made the run order wrong. Reasoning is in §6,
  so a reviewer can disagree with the choice without having to rediscover it.
- **The gate counts a doc this wave adds.** `check.mjs` prints `note 17 doc(s) exist but are not in the frozen manifest`
  instead of 16 because this report and a sibling wave's report are new. The gate treats that as a note by design
  (manifest frozen 2026-11-03), so it is not a regression, but the number in a fresh run will not match older logs.
- **Residual disclosure is still in `HEAD`** in three reports that quote the path and the save id as their evidence
  (§9). Fixing it means editing documents outside this ticket, and the leak is already in the pushed history, so
  masking it is cosmetic rather than protective - which is exactly why it was reported instead of quietly done.
