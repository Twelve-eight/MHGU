# W6-ROOTDOCS — the entry documents and the licence, checked against their artefacts

Scope: `README.md`, `HANDOFF.md`, `docs/PROGRESS.md`, `docs/README.md`,
`docs/PUBLISH-READINESS.md`, `docs/PRIVATE-DATA.md`, `tools/mhgu/README.md`, `LICENSE`,
`docs/LICENSE`, and `DEVLOG.md` (last 200 lines plus its section headers). Review only; no
document was edited.

**Snapshot.** The sweep read the tree at `9eb31ea` (2026-11-04 07:35:51 +0800) and re-checked every
finding at `31be4a3` (07:45:31), with `README.md` modified in the working tree on top of that. Four
commits landed while this report was being written (`76735a9`, `ca7c193`, `7db37db`, `31be4a3`),
and they closed several of the items below; each such item is marked **closed** with the commit or
working-tree edit that closed it, and the state at `9eb31ea` is kept because it is the record of
what the audit found. Other agents were also editing `docs/analysis/audit/W6-*.md` and
`tools/mhgu/tierb-gen.mjs` at the same time. Counts that move with every commit (commits ahead,
ledger tallies, script count) are given with the command and the value at the last read.

Method: the two headline commands and the gate were executed as the documents advertise them; every
table was parsed rather than eyeballed; the database was queried read-only; the save snapshots were
hashed and compared byte by byte; `git ls-files` / `git ls-tree` answered the tracked-vs-present
questions. "Reproduces" below means a command in this session printed the number.

---

## 1. Headline numbers: occurrences and whether they reproduce

Occurrences are line numbers in the document named. "report" = `docs/analysis/code/inventory/coverage-report.tsv`.

| # | Number | Where it is stated | Recompute / authority | Verdict |
|---|---|---|---|---|
| 1 | canonical calibre **58.0%** (Tier A verified **57.7%** + Tier B conf=A **0.3%**) | `README.md:24,27,46,83`; `HANDOFF.md:22,160,212`; `docs/PROGRESS.md:73,98`; `docs/PUBLISH-READINESS.md:21`; `METER.md:4,14,208,225,293,700,1114,1122` | `node tools/mhgu/coverage/canonical-metric.mjs` → `Tier A verified 25584 functions, 57.7%`, `Tier B conf=A 74 functions, 0.3%`, `canonical total 58.0%` | confirmed |
| 2 | **66.2%** instructions / **53.5%** functions at >=90% precision | `README.md:25,46,84`; `HANDOFF.md:21,146`; `docs/PROGRESS.md:36,73,98`; `docs/PUBLISH-READINESS.md:21`; `METER.md:3,55,82,225,293` | `independent-coverage.mjs` → `covered at >=90% independently: 3460532 = 66.19%`; report row `covered at >=90% precision 28187 3460532 66.2% 53.5%` | confirmed |
| 3 | **90.0%** / **76.6%** (spread pooled at 72.4%) | `METER.md:3,82,240,517`; `DEVLOG.md:1185` | report row `covered, spread pooled at 72.4% 40374 4704134 90.0% 76.6%` | confirmed |
| 4 | expected explained **75.0%–82.5%** | `METER.md:3`; `HANDOFF.md:21` | report rows `3919967 75.0%` and `4315652 82.5%` | confirmed |
| 5 | no label **10.0%** instructions / **23.4%** functions = **12,318** functions | `METER.md:3`; `HANDOFF.md:21,147,152`; `DEVLOG.md:1187` | report `partition: no label 12318 524143 10.0% 23.4%`; `function-labels.tsv` has 40,374 data rows, 52,692 − 40,374 = 12,318 | confirmed |
| 6 | direct evidence **23.9%** = **13,061** functions / 1,248,279 insns | `METER.md:240,293`; `HANDOFF.md:142` | report `A-direct (evidence row) 13061 1248279 23.9% 24.8%` | confirmed |
| 7 | partition **36.3 / 2.8 / 3.3 / 23.8** | `METER.md:225`; `HANDOFF.md:145-147` | report rows `inferred only 11250 1896778 36.3%`, `signature only 1475 144714 2.8%`, `spread validated labels 2401 170761 3.3%`, `spread unvalidated 12187 1243602 23.8%` | confirmed |
| 8 | **52,692** functions / **5,228,277** instructions | `README.md:47,85`; `HANDOFF.md:19,21,137,163`; `docs/PROGRESS.md:91,98` | `gzip -dc docs/data/functions-retile.csv.gz \| wc -l` = 52,693 lines (52,692 rows + header); column `insns` sums to 5,228,277; gate 4 prints the same | confirmed |
| 9 | `.text` 0x100..0x13F1DEC = **5,228,347** words | `docs/PROGRESS.md:91` only | `(0x13F1DEC-0x100)/4 = 5228347` | confirmed |
| 10 | `.text` **5,228,411** instructions | `HANDOFF.md:41` (paired with the range `0x100..0x13F1DEC`) | `0x13F1DEC/4 = 5228411`, the count from vaddr 0; the stated range holds 5,228,347; the function-span denominator is 5,228,277 | **contradiction C1** (range/count convention mixed) |
| 11 | **23,885** regions (pre-retile) | `README.md:47`; `HANDOFF.md:19,139,163,165,246`; `tools/mhgu/README.md:24,46` | `gzip -dc docs/data/functions.csv.gz \| wc -l` = 23,885 newlines + 1 final row = 23,885 data rows | confirmed (as history) |
| 12 | **3,201** classes | `README.md:47`; `HANDOFF.md:19,67,122,165`; `docs/PROGRESS.md:92` | `docs/data/class-inventory.tsv` = 3,201 data rows | confirmed |
| 13 | save side **87.8%** structural / **14.9%** field | `README.md:35,48,90,157`; `docs/PROGRESS.md:23,24,72`; `docs/PUBLISH-READINESS.md:23`; `docs/save-layout/coverage-map.md:10-11` (`≈88%`, `14.9%`) | `(226754+950374*0.85)/1177760 = 0.878423`; `224643*0.78/1177760 = 0.148775` | confirmed (arithmetic; the 0.85/0.78 inputs are measurements) |
| 14 | **226,754** member layer / **224,643** decomposed / **950,374** tail / **1,177,760** block | `HANDOFF.md:16,17`; `docs/PROGRESS.md:23,24` | 0x3783A−0x278 = 227,386−632 = 226,754; 9,543+76+12,955+115,072+86,997 = 224,643; 1,177,760−227,386 = 950,374; all four `.hnt` snapshots are exactly 1,177,760 B | confirmed |
| 15 | **129** monsters / **21,153** items / **1,355** quests | `README.md:50`; `docs/PUBLISH-READINESS.md:25` | `SELECT count(*)` on `docs/data/mhgu.db` → 129 / 21153 / 1355 | confirmed |
| 16 | **39** tables | `README.md:50` | `sqlite_master` → 39 tables (38 user tables + `sqlite_sequence`), which is what `docs/data/README.md:27` says | confirmed |
| 17 | **12 gates**, twelve PASS + `ALL PASS` | `README.md:93`; `docs/PUBLISH-READINESS.md:21,40`; `HANDOFF.md:241`; `DEVLOG.md` (contradicts itself, see C15) | `node tools/audit/check.mjs` at `9eb31ea`: 12 `PASS` lines, then `ALL PASS` (2.68 s); re-run at `31be4a3`: 12 `PASS`, `ALL PASS` (4.65 s) | confirmed |
| 18 | **24** evidence tables / **46,858** rows / **25,786** functions | `README.md:84`; `METER.md:49` | gate 5 prints `PASS evidence tables: 24 files, 46858 rows, 25786 functions` (METER:817 notes only 16 of the 24 carry A rows; the 24 is the `sources.json` list the gate reads) | confirmed |
| 19 | **22,957** A rows re-checked 100% + **4,479** taxonomy + **2,731** unparsed = **30,167** | `README.md:87`; `HANDOFF.md:142` | gate 6 prints `22,957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses` | confirmed |
| 20 | **40,374** rows in `function-labels.tsv` | `docs/PUBLISH-READINESS.md:22`; `METER.md`; `DEVLOG.md:1196` | `wc -l` = 40,375 lines incl. header → 40,374 data rows | confirmed |
| 21 | **51** NEX rows in `functions*.csv.gz` | `README.md:10-12` | union of `Nex\|nn::\|Nintendo` = 51 rows in each file (tokens: `Nex` 178, `nn::` 15, `Nintendo` 17); with only the two listed tokens the count is 36 | confirmed, parenthetical incomplete (C18) |
| 22 | **53** state tables / **60** sections / **1,223** rows / **119** (9.7%) / **137** slots / **110** members | `README.md:49`; `HANDOFF.md:20-24`; `docs/PROGRESS.md:106`; `docs/mechanics/monster-state-machine.md:6` | the cited docs state each; not re-derived here (see UNVERIFIED) | transcription confirmed, value UNVERIFIED |
| 22b | dispatch sites: **3,429 in 2,546 functions** vs **6,777 in 4,527** | `README.md:49`; `HANDOFF.md:118` (old pair at `9eb31ea`; **closed** by `76735a9`) | `docs/PROGRESS.md:106` and `docs/mechanics/monster-code-map.md:28` strike the old pair; `node tools/audit/scan-dispatch.mjs` prints `sites: 6777 | without shift: 6026 | in functions: 4527` and says of 3,429/2,546: "Treat that number as withdrawn" | **contradiction C21** |
| 23 | base NCA **12,168,003,584** B | `docs/PROGRESS.md:107`; `HANDOFF.md:129`; `docs/PRIVATE-DATA.md` | `stat -c %s G:/mhgu-romfs/secure/98abd400…nca` → 12168003584 | confirmed |
| 24 | **18 MB** db, **25 MB** image | `README.md:80,156`; `PRIVATE-DATA.md` | 18,333,696 B and 25,472,632 B | confirmed |
| 25 | **138** scripts (7 / 4 / 2 / 42 / 83) | `README.md:53` (**closed** in the working tree: "about 140 scripts; the dependency table classifies 138 of them") | `PUBLISH-TOOL-DEPS.md` has exactly 138 rows classified 7/4/2/42/83; by that document's own per-directory rule the tree now holds **143** (4 + 50 + 71 + 10 + 2 + 1 + 5: `tools/audit` grew 5 → 10), or 148 counting `gu-moves/lib`'s 5 modules, which the document excluded | confirmed vs the named artefact, **stale vs the tree** |
| 26 | ledger **73 fixed / 6 open / 4 rejected / 1 unresolved / 1 reverted** | `README.md:54` (**closed** in the working tree: the tally is gone, the file is cited as the count) | `LINK-STATUS.tsv` 86 data rows: fixed 75, open 4, rejected 4, done 1, reverted 1, unresolved 1 | **closed** (was C6; working-tree README) |
| 27 | public branch **251** commits behind / **242** ahead | `README.md:74` (**closed** in the working tree: "several hundred commits"); `docs/PUBLISH-READINESS.md:7,13` (**live**) | `git rev-list --count origin/master..HEAD` = **257** (253 at `9eb31ea`) | **closed in README, live in PUBLISH-READINESS** (C7) |
| 28 | wiki **42 of 47** pages reproduce | `README.md:51` | `W4-WIKI.md`: 46 page rows = 42 confirmed (41 plus 1 "confirmed with a caveat"), 3 contradiction, 1 stale; the 47th file is `README.md` itself, which has defects | confirmed |
| 29 | reference **78 of 92** confirmed, **12** contradictions, **2** unverified | `README.md:52` | `W4-REFERENCE.md`'s 92-row table: **72 / 16 / 4** | **contradiction C5** |
| 30 | **250** tracked documents | `README.md:54` | `git ls-files '*.md' \| wc -l` = 250 | confirmed |

Cross-document agreement: numbers 1–9, 11–21 and 23–24 agree wherever two entry documents state
them. The disagreements were 10 (HANDOFF alone), 22b (README and HANDOFF against the mechanics
document), 25–27 (each document with the tree) and 29 (README with its own named artefact). Of
these, 22b, 25, 26 and the README half of 27 are closed; 10, the PUBLISH-READINESS half of 27, and
29 remain. `docs/README.md` states no code-side number at all; its save-side numbers
(134 rows, 86,997 B, 653,472 B, 122 bits, 32 slots x 19 bit, 19 objects / 20 calls) were all
checked and agree with the documents it indexes, with one row-count exception (C15).

---

## 2. Contradictions

The acceptance table: what document A says, what document B says, and which one the artefact
supports. C1–C12, C21 and C22 are current-state defects in live documents; C13–C16 are stale
numbers inside the DEVLOG's dated record; C17–C18 are smaller count/wording defects; C19–C20 are a
live licence statement and an index description that no longer match the tree. Severity: P1 = a reader
is actively misled about a headline; P2 = a regeneration path or a summary is wrong; P3 = friction
or a count one off.

| # | Subject | A says | B says | Artefact supports | Sev |
|---|---|---|---|---|---|
| C1 | `.text` instruction count | `HANDOFF.md:41`: `0x100 .. 0x13F1DEC` = 5,228,411 | `docs/PROGRESS.md:91`: the same range = 5,228,347 words, function spans 5,228,277; `HANDOFF.md:19` and `coverage-report.tsv:1` use 5,228,277 | 5,228,347 for the range as written | P2 |
| C2 | number of save member objects | `HANDOFF.md:80`: 19 slots = 18 readers + 2 fixups | `docs/PROGRESS.md:42` and `docs/README.md:46`: 19 objects = 18 readers + member[2] second segment; 20 calls (19 bl + 1 tail jump) | member census: 19 objects, 20 calls, 0x521398 is member[2]'s second segment | P2 |
| C3 | where the 90% gap sits | `HANDOFF.md:27`: "Tier B's 48.5% of instructions", per-function adjudication "in progress" | `METER.md:225`: 58.0 -> 90 is a **32.0-point** gap; report `conf B` = 28.4%; `HANDOFF.md:246`: the adjudication workflow is **retired** | METER / report | P2 |
| C4 | schema of `monster-slot-map-137.json` | `HANDOFF.md:123`: `slot/emid/cn/en/kind`; 94 big + 43 small | the tracked file: `slot/emid/cn/cn_src/en` (no `kind`, no `ro`); `kind` lives in `monster-slot-map.json` | the JSON file | P3 |
| C5 | reference-audit tally | `README.md:52`: 78 confirmed / 12 contradictions / 2 unverified | `W4-REFERENCE.md` 92-row table: 72 / 16 / 4 | the table | P2 |
| C6 | audit-ledger tally | `README.md:54` at `9eb31ea`: 73 fixed, 6 open, 4 rejected, 1 unresolved, 1 reverted (= 85) | `LINK-STATUS.tsv`: 86 rows, 75 fixed, 4 open, 4 rejected, 1 done, 1 reverted, 1 unresolved | the TSV — **closed** in the working tree (tally removed) | P2 |
| C7 | commits not yet pushed | `README.md:74` at `9eb31ea`: 251 (**closed** in the working tree: no number); `docs/PUBLISH-READINESS.md:7,13`: 242 (**live**) | `git rev-list --count origin/master..HEAD`: **257** at the last read | git | P3 |
| C8 | number of scripts | `README.md:53` at `9eb31ea`: 138 | by `PUBLISH-TOOL-DEPS`'s own rule the tree then held **143** (audit 5 → 10); a flat find with `vendor/` pruned gives 148 because it adds `gu-moves/lib`'s 5 modules | the tree — **closed** in the working tree ("about 140 scripts") | P3 |
| C9 | can a stranger run the gate? | `docs/PUBLISH-READINESS.md:40`: the three commands, `check.mjs` included, are "entries a stranger can run themselves" | `tools/audit/check.mjs:10`: `const ROOT = "G:/omp works/MHGU";` | the script | P2 |
| C10 | toolchain input paths | `tools/mhgu/README.md:9`: image at `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`; `:13`: "all scripts default to absolute `G:/omp works/...` paths" | `tools/mhgu/arm32.mjs:7` and `reader-fields.mjs:7`: `FLAT` env or `<repo>/main.140.flat.bin`; `README.md:142-143` says the same | the scripts | P2 |
| C11 | which script produces four tracked tables | `HANDOFF.md:61,67,68,69`: `func-inventory5` -> `functions.csv.gz`; `mon-final.py` -> `class-inventory.tsv`; `mon-offsets.py` -> `member-offsets.tsv`; `em-units.py`/`counter-slots*` -> `monster-slot-map-137.json` | `tools/mhgu/README.md:24,32,33,34,46`: all four write elsewhere or only print; none writes the tracked file | the scripts (`grep writeFile`) | P2 |
| C12 | producer of the save-side percentages | `README.md:90,157`: `tools/mhgu/mon/size-final.mjs` | `size-final.mjs:1-2`: it inverts the emsizetbl/emyure name hash and joins kill/capture counters with size records; no coverage code anywhere in `tools/` | the script | P2 |
| C13 | direct-evidence assertion rate | `DEVLOG.md:1194`: 95.3% | `METER.md:997`: 95.3% was the wrong denominator, the value is **95.0%**; `HANDOFF.md:142` uses 95.0% | 1,189,308 / 1,251,869 = 95.0% | P3 |
| C14 | string evidence in the unlabelled bucket | `DEVLOG.md:1203` (in "conclusions not to redo"): 2.0% of unlabelled functions, 60 class names | `DEVLOG.md:1264`, `METER.md:859`, `HANDOFF.md:152`: **958 (7.8%)**, 124,509 insns (2.38%), **233** class names | recomputed 958 / 12,318 = 7.8% | P3 |
| C15 | number of gates | `DEVLOG.md:1175` title "eight gates all green", `:1214` "8 gates, ~2 s" | `tools/audit/check.mjs` has 12; `DEVLOG.md:1258` itself records "gates 8 -> 12" | the gate prints 12 PASS | P3 |
| C16 | ledger counts in the log | `DEVLOG.md:1279`: fixed 45, open 2, rejected 2, reverted 1 | `LINK-STATUS.tsv`: 75 / 4 / 4 / 1 / 1 / 1 | the TSV | P3 |
| C17 | rows in `member4-file-layout.txt` | `docs/README.md:35`: 134 rows | the file: **135** data rows (`grep -c '^0x'`) | the file's own header: "134 static bl ... + 1 nested 4 B read" | P3 |
| C18 | what the 51 NEX rows contain | `README.md:10-12`: rows containing "NEX SDK symbol fragments (`Nex`, `nn::`)" | 36 rows match `Nex\|nn::`; 51 requires the third token `Nintendo` | the CSVs | P3 |
| C19 | repository licence in a spec doc | `docs/spec-crossgame/monster-gu.md:40`: "public repo (code GPL-3.0-or-later, docs CC BY 4.0)" | `README.md:162`, `HANDOFF.md:4`, `LICENSE`: **MIT** | LICENSE | P2 |
| C20 | does `analysis/dumps/` ship? | `docs/README.md:21` marks it as project output (tick) | it is a symlink to `MHGU-private`, **0** tracked files; `PRIVATE-DATA.md` lists it as non-public | `git ls-files` | P3 |
| C21 | dispatch-site count | `README.md:49` and `HANDOFF.md:118` at `9eb31ea`: 3,429 sites in 2,546 functions | `docs/PROGRESS.md:106` and `docs/mechanics/monster-code-map.md:28`: **6,777 sites (6,026 unshifted) in 4,527 functions**; `tools/audit/scan-dispatch.mjs`: same, and "treat that number as withdrawn" | the scanner — **closed** by `76735a9` | P1 |
| C22 | which DEVLOG section is "the last" | `HANDOFF.md:239`: read the last section, "（2026-11-04 三次更正 + 审计加固）" | the last section is `## 2026-11-04（续四）：实机窗口 06:39–06:56` (`DEVLOG.md:1296`); the named section is at 1175 and has four sections after it | the file | P3 |

### C1 — `HANDOFF.md:41` counts words from vaddr 0

```
$ node -e "const T=0x13F1DEC;console.log(T/4,(T-0x100)/4)"
5228411 5228347
```

The row is the coordinate table ("read first"), and three counts are in play: **5,228,411** words
for `vaddr 0..0x13F1DEC` (now printed as `.text instructions` by `tools/audit/scan-dispatch.mjs`),
**5,228,347** for the range the row actually names (`0x100..0x13F1DEC`, the 0x100 header is 64
words), and **5,228,277** for the function-span denominator (`HANDOFF.md:19`,
`coverage-report.tsv:1`). The row pairs the `0x100` range with the vaddr-0 count, so it is wrong as
written by exactly the 64-word header. `docs/PROGRESS.md:91` states both conventions correctly
(5,228,347 for the range, 5,228,277 as the sum) but strikes the 5,228,411 value, which the new
scanner now uses — so the fix is to name the convention, not to change the number.
`LINK2-CONSTANTS.md` item 3 already noted the row as an "adjacent" defect; it is not in
`LINK-STATUS.tsv` and the line is unchanged.

### C2 — `HANDOFF.md:80`: 19 = 18 + 2

`18 + 2 = 20`, so the sentence cannot be true as written. `docs/analysis/members/member-census.md:29`:

```
调度器共 **20 次调用**（19 `bl` + 1 尾跳 `b 0x2282a8`），覆盖 **19 个独立成员对象**——`0x3e7920` 的
`bl 0x521398` 用 `[r5,#0]`，r5=`0x3e77e4` 装的 `*0x145159c`，与 member[2] `0x51dbb4` **同一成员单例**，
是 member[2] 的第二段 reader。
```

`REST-FIXES.tsv` has two rows fixing exactly this sentence in `docs/README.md` and
`docs/PROGRESS.md` ("fixed — 18+2=20≠19; 0x521398 不是 fixup 槽"). `HANDOFF.md:80` still carries the
old wording, and "post-load fixup" is also wrong: the tail jump `0x2282a8` is a runtime-flag
finalizer, not a member fixup.

### C3 — `HANDOFF.md:27` still describes the retired work plan

```
$ sed -n '27p' HANDOFF.md
**结论**：存档与怪物机制的结构层已基本完成；**代码 90% 的缺口在 Tier B 的 48.5% 指令**，只能靠逐函数裁定（批次化进行中）。
```

48.5% is `100 − 51.5`, and 51.5% is the Tier A share that `HANDOFF.md:20` itself marks
"2026-10-23 historical value, do not quote". The current decomposition is 58.0% (project calibre)
against a 32.0-point gap (`METER.md:225`), with `conf B (unverified)` at 28.4%. And the plan named
in the sentence ("per-function adjudication, batched, in progress") is retired at `HANDOFF.md:246`
("历史工作流（已停用，勿按此开工）").

### C4 — `HANDOFF.md:123` describes a column the file does not have

```
$ node -e 'console.log(Object.keys(require("./docs/data/json/monster-slot-map-137.json")[0]))'
[ 'slot', 'emid', 'cn', 'cn_src', 'en' ]
$ node -e 'const b=require("./docs/data/json/monster-slot-map.json");const k={};for(const x of b)k[x.kind]=(k[x.kind]||0)+1;console.log(Object.keys(b[0]),k)'
[ 'slot', 'emid', 'cn', 'cn_src', 'en', 'kind', 'ro' ] { big: 94, small: 43 }
```

So `kind` and "94 big + 43 small" belong to the **older** `monster-slot-map.json`, which the same
row calls "superseded". `PUBLISH-DATA-PROVENANCE.md` already records that the 137 file is "same,
minus `kind`/`ro`".

### C5 — `README.md:52` and the audit it cites

```
$ node -e '<parse tab-separated rows of W4-REFERENCE.md with a verdict in column 3>'
rows 92 { confirmed: 72, contradiction: 16, unverified: 4 }
```

`W4-REFERENCE.md`'s table (header at line 301) has 92 verdict rows: 72 confirmed, 16 contradiction,
4 unverified. The README's 78 / 12 / 2 also sums to 92, which is why it reads plausibly, but all
three components are wrong: confirmed is overstated by 6, contradictions understated by 4, and
unverified understated by 2. Five of the 16 contradictions are in `re-guide-gu.md` alone (e.g. the
"rage pipeline" row, the "no wind strings" row, the "43,353 writeback words" row).

### C6 — `README.md:54` and the ledger it cites

```
$ node -e '<parse LINK-STATUS.tsv column 4>'
rows 86 { fixed: 75, open: 4, rejected: 4, done: 1, reverted: 1, unresolved: 1 }
```

Two problems. (a) The five categories the README lists sum to 85, not 86: the `done` status (1 row)
is missing from the vocabulary, and `docs/README.md` and `README.md`'s step 4 both describe the
file as `fixed / open / rejected` only. (b) The counts are stale *at the commit that added the
line*: commit `03c6544` wrote 73/6 and commit `9eb31ea` then changed two rows to `fixed` without
touching the README, so the file now says 75/4.

**Closed** in the working tree after `31be4a3`: `README.md:54` no longer states a tally — it says the
file carries the counts and that they move with each pass, which is the right fix for a number that
changes under the prose.

### C7 — the commit count is a moving snapshot, and both documents are behind it

```
$ git rev-list --count origin/master..HEAD
257        (253 at 9eb31ea, when this check was first run)
$ git rev-parse --short origin/master
f199842
```

`README.md:74` says 251 and `docs/PUBLISH-READINESS.md:7,13` says 242. 242 was the value the prior
entry-docs audit measured (`PUBLISH-ENTRY-DOCS.md` §0 prints 242 at the same `origin/master`), 251
was the value when the README was written, and HEAD has since gained `03c6544`, `9eb31ea` and
four more commits (257 ahead at the last read). This
is unavoidable drift for a hand-typed count; the fix is to print the command rather than the
number, or to drop the sentence.

**Closed** for the README in the working tree ("the public branch lags the working tree by several
hundred commits"); still **live** in `docs/PUBLISH-READINESS.md:7,13`, which says 242.

### C8 — `README.md:53`: 138 scripts

```
$ grep -A14 "The tree in numbers" docs/analysis/audit/PUBLISH-TOOL-DEPS.md | tail -9
MHGU/tools/ root ..................   4 scripts
MHGU/tools/mhgu/ ..................  50 scripts
MHGU/tools/mhgu/coverage/ .........  71 scripts
MHGU/tools/audit/ .................   5 scripts
...
                                    138 scripts
$ for d in tools tools/mhgu tools/mhgu/coverage tools/audit tools/gu-moves tools/mcp tools/wiki-gen tools/mhgu/mon; do
    find "$d" -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.py' \) | wc -l; done
4 40 71 10 2 1 5 10        -> 143 by the document's own rule (audit was 5, is now 10)
$ find tools -path 'tools/mhgu/vendor' -prune -o -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.py' \) -print | wc -l
148                        (adds gu-moves/lib's 5 modules, which the doc excluded)
```

The README's number reproduces from the artefact it names, and the artefact's own split (7 / 4 / 2 /
42 / 83) reproduces exactly from its 138 classified rows. The artefact is what has drifted: the
audit directory grew from 5 to 10 scripts (the W3/W4/W5/W6 audit tools), and the same rule now
counts 143 scripts, so the entry sentence understated the tree by five.

**Closed** in the working tree: `README.md:53` now reads "about 140 scripts; the dependency table
classifies 138 of them by input (7 need no game input, 4 the database, 2 saves, 42 the image, 83 an
intermediate artefact)".

### C9 — `docs/PUBLISH-READINESS.md:40` and `check.mjs:10`

```
$ sed -n '10p' tools/audit/check.mjs
const ROOT = "G:/omp works/MHGU";
$ sed -n '17p' tools/audit/check.mjs
const manifest = fs.readFileSync(path.join(ROOT, "docs/analysis/audit/MANIFEST.tsv"), "utf8")...
```

On any checkout at another path (or on Linux/macOS) the first gate throws `ENOENT` before printing
anything, so the gate is not one of the "entries a stranger can run". The two calibration commands
*are* portable: `canonical-metric.mjs:18` and `independent-coverage.mjs:12` both do
`path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")`. `PUBLISH-ENTRY-DOCS`
§1.5 item 3 and §2 item 3 asked for exactly this fix; it was not applied, and the newer README
instead documents the gate's image dependency without mentioning the path pin.

### C10 — `tools/mhgu/README.md:9,13` describe a tree that no longer exists

```
$ ls .tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin
ls: cannot access ...: No such file or directory
$ ls -l main.140.flat.bin
25472632  main.140.flat.bin
$ sed -n '7p' tools/mhgu/arm32.mjs
export const FLAT = process.env.FLAT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'main.140.flat.bin');
```

The input table names a `.tmp` path that has been cleaned, and the blanket sentence "all scripts
default to absolute `G:/omp works/...` paths; change the constants at the top" is false for the two
shared readers and for every coverage script (which resolve from their own location). `README.md`
already documents the correct behaviour; the toolchain README is the stale one. (It is true for the
six scratch-path scripts `README.md:144` names.)

### C11 — `HANDOFF.md:61,67,68,69`: four tracked tables whose producer is not the script named

`tools/mhgu/README.md`'s "`docs/data/` 追踪文件与生产者" section was written after a prior audit
(`W3-TF3 [fixed]`) and states, per file, whether any committed script writes it. Against it:

| HANDOFF row | Says | Reality (`tools/mhgu/README.md`, script source) |
|---|---|---|
| `:61` `func-inventory5.mjs` | "全函数清单 → `docs/data/functions.csv.gz`" | writes `.tmp/mhgu/inventory/functions4.csv`; the tracked gz has **no writer** (README:24,46) |
| `:67` `mon/mon-final.py` | "类大小表 → `docs/data/class-inventory.tsv`" | "（stdout）… 不写文件" (README:32); the producer table says `class-inventory.tsv` has "no producer, only readers" |
| `:68` `mon/mon-offsets.py` | "成员 … → `docs/data/member-offsets.tsv`（110 条）" | "（stdout）… 不是 `member-offsets.tsv` 的 5 列 TSV，也不写文件"; the post-processing that converts its grouping to the tracked schema "is not in the repository" (README:33,48) |
| `:69` `mon/em-units.py` / `counter-slots*.py` | "137 槽权威表 → `docs/data/json/monster-slot-map-137.json`" | "…不写 `monster-slot-map-137.json`" (README:34) |

A reader who wants to regenerate any of these four files is sent to a script that prints to stdout.
The fifth row, `HANDOFF.md:70` `state-motion2.mjs -> docs/mechanics/monster-state-machine.md`, is
worse in a different way: the script **does** write that path (`state-motion2.mjs:65`) but it is the
superseded generator; the live document's banner names `state-motion3.mjs`, which writes at line
120. Running the cited script replaces the current document with the old one.

### C12 — `README.md:90,157`: the save-side figures have no producer

```
$ sed -n '1,3p' tools/mhgu/mon/size-final.mjs
// size-final.mjs — (1) invert the manifest name hash for emsizetbl/emyure by trying path spellings,
//                   (2) join kill/capture counters with size records for both saves.
$ grep -n "1177760\|226754\|950374\|87\.8" tools/mhgu/mon/size-final.mjs
(no output)
$ grep -rln "1177760" tools/
(no output)
```

The script does read two fixed snapshots (so the second half of `README.md:157` is true), but it
computes neither 87.8% nor 14.9%; no script in `tools/` contains the block length at all. The
figures exist as arithmetic in `docs/PROGRESS.md:23-24`, which reproduces:
`(226754 + 950374*0.85)/1177760 = 0.878423`, `224643*0.78/1177760 = 0.148775`.

### C13–C16 — the DEVLOG's latest section still carries four superseded numbers

C13 `DEVLOG.md:1194` "95.3%" — `METER.md:997` says that figure divided the table's numerator by the
report's denominator ("两个总体不是同一个") and the value is 95.0% (1,189,308 / 1,251,869);
`HANDOFF.md:142` already prints 95.0% and marks 95.3% as old.

C14 `DEVLOG.md:1203`, inside the list "被推翻/撤回的结论（别重做）", says "未标函数只有 2.0% 引用任何
字符串，涉及的 60 个类". `DEVLOG.md:1264` (later, same day), `METER.md:859` and `HANDOFF.md:152` say
the 247/2.0% figure came from the never-re-extracted `strings` column and the real values are **958
(7.8%)** and **233 class names**. Recomputed here:

```
$ node -e '<join functions-retile, function-labels, stringxref>'
functions 52692 labelled 40374 unlabelled 12318 unlabelled with stringxref 958 = 7.8% insns 124509 = 2.38%
```

So the "do not redo" list hands the next session a number that the same file calls 4x wrong.

C15 `DEVLOG.md:1175` ("八道门全绿") and `:1214` ("8 道门，约 2 s"): the gate has 12 (`check.mjs`, and
the file's own `:1258` records "§9 门数 8→12"). The section is the one the log tells the reader to
read first ("先读这段再动手").

C16 `DEVLOG.md:1279` "fixed 45、open 2、rejected 2、reverted 1" next to "处置表在 LINK-STATUS.tsv".
The file now holds 86 rows: 75 / 4 / 4 / 1 / 1 / 1.

### C17 — `docs/README.md:35`: 134 rows

```
$ grep -c '^0x' docs/save-layout/member4-file-layout.txt
135
$ sed -n '2p' docs/save-layout/member4-file-layout.txt
# 134 static bl 0x3df2a8 = 12,951 B + 1 nested 4 B read (0x51e49c) = 12,955 B ...
```

The table has 135 data rows: 134 static reads plus the one nested read. "134 行" is the count of
static reads, not of table rows; "末行 `0x5E9E+4`" is right (the last row starts at 0x5EA2 and is 4 B,
ending at 0x5EA6 = 0x2C0B + 12,955).

### C18 — `README.md:10-12`: 51 rows, but the parenthetical lists two of three tokens

```
$ node -e '<gunzip both function tables and test each row>'
rows 23885 union rows 51 | Nex 178 nn:: 15 Nintendo 17
rows 52692 union rows 51 | Nex 178 nn:: 15 Nintendo 17
```

The 51 is correct under the rule the provenance audit used (`Nex|nn::|Nintendo`), and the token
counts match `PUBLISH-DATA-PROVENANCE.md` §F6 exactly. But a reader who greps the two tokens
actually printed in the README gets **36** rows. The 15-row difference is rows whose only fragment
is the `Nintendo` in `SDK Private+Nintendo+…` / `SDK MW+Nintendo+…` banners.

### C19 — `docs/spec-crossgame/monster-gu.md:40` still states the old licence

```
$ sed -n '40p' docs/spec-crossgame/monster-gu.md
公开仓（代码 GPL-3.0-or-later，文档 CC BY 4.0）只收结构：...
```

`LICENSE` is the MIT text (`Copyright (c) 2026 Twelve-eight`), `README.md:162` says "MIT, for the
whole repository", `HANDOFF.md:4` says 全仓 MIT, and the eleven source headers say MIT. Commit
`9eb31ea` updated README, HANDOFF, LICENSE, docs/LICENSE and the headers but did not touch this
spec. `docs/analysis/audit/PUBLISH-REPO-HYGIENE.md:93-98` and `PUBLISH-DATA-PROVENANCE.md:82` also
describe the old regime, but they are dated audit reports; the spec is a live document.

### C20 — `docs/README.md:21`: `analysis/dumps/` is not in the repository

```
$ git ls-files docs/analysis/dumps | wc -l
0
$ node -e 'console.log(fs.lstatSync("docs/analysis/dumps").isSymbolicLink())'
true
```

It is one of seven symlinks into `MHGU-private` (`editor-src`, `save-snapshots`,
`docs/reference/mhxx-wiki`, `docs/data/viewer`, `docs/data/armor`, `docs/data/weapons`,
`docs/analysis/dumps`). The index marks it as project output without saying that a clone has no such
directory; the root README's "What a clone does not contain" table lists six of the seven and omits
this one (reasonably — it changes nothing you can run, but the index and PRIVATE-DATA should agree).

### C21 — `README.md:49` and `HANDOFF.md:118` published a dispatch count the mechanics document withdrew

```
$ node tools/audit/scan-dispatch.mjs
scan-dispatch.mjs — image: main.140.flat.bin
.text instructions: 5228411

A. add pc, rX, rY  (register form, any shift)
   sites: 6777 | without shift: 6026 | in functions: 4527

C. add pc, pc, rM, lsl #2  (inline jump table)
   sites: 3 | in functions: 2

NOT defined here, and deliberately not quoted: the old "3,429 sites / 2,546 functions"
offset-table figure. Its definition was never recorded and no reading of the stated
signature reproduces it (W6-MONSTERS). Treat that number as withdrawn.
```

`docs/PROGRESS.md:106` and `docs/mechanics/monster-code-map.md:28` now carry 6,777 / 6,026 / 4,527
and strike the old pair ("~~3,429 / 2,546 / 10~~ 无法复现，2026-11-04 撤回"). The README's monster
row (`README.md:49`) and the HANDOFF mechanics table (`HANDOFF.md:118`) still printed the withdrawn
pair at `9eb31ea`, so the two entry documents disagree with the document cluster the README's own evidence column
names (`docs/mechanics/`) and with a one-command reproduction. This is the only P1 in this report
because it sits on the front page's "Monster mechanics" line. The same edit wave also changed the
inline-jump-table count from 10 to 3; neither README nor HANDOFF prints that number.

**Closed** by `76735a9` (07:39): README, HANDOFF, PROGRESS, `code-metrics` and the code map all
carry 6,777 / 6,026 / 4,527 with the old pair struck. The finding is kept because it was live when
the sweep started, and because it is the failure mode the entry documents exist to prevent: a
front-page number outlived its retraction by a whole edit wave.

### C22 — `HANDOFF.md:239` points at a section that is no longer the last one

```
$ grep -n '^## ' DEVLOG.md | tail -5
1175:## 2026-11-04（三次更正 + 审计加固）：≥90 线定在 66.2%，八道门全绿
1249:## 2026-11-04（续）：项目口径 58.4% → 58.0%，因为降级表一直没进这个数
1262:## 2026-11-04（续二）：未标桶的字符串证据被少算了 4 倍；串共识通道测过但暂不接
1275:## 2026-11-04（续三）：六份关联审查 + 三处会改变解读的修正
1296:## 2026-11-04（续四）：实机窗口 06:39–06:56（SUYU / MHGU 导出）
$ sed -n '239p' HANDOFF.md
1. 读 `DEVLOG.md` **最后一段**（2026-11-04 三次更正 + 审计加固）：当前数字、今天改了什么、哪些结论被推翻，都写在那。
```

The step is still useful (the 续 entries correct the 三次更正 numbers), but the parenthetical names
the wrong section, and `README.md:127`'s "read the last section" now lands on a live-testing note.
Neither log entry records the 2026-11-04 relicensing (Section 5), so the log the entry documents
send a reader to is the one place where the current licence is not stated.

---

## 3. Broken paths and dead citations

Checked: every backtick path and every markdown link in the ten documents, resolved against the
repository root, the document's own directory, and the plausible sub-bases (`docs/`,
`docs/analysis/…`, `docs/data/…`, `tools/…`), plus the absolute `G:/` paths. Markdown links: only
`docs/README.md` has any (4), and all 4 resolve.

**Dead (target does not exist):**

| # | Document:line | Target | Status |
|---|---|---|---|
| 1 | `tools/mhgu/README.md:9` | `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` | absent; the image is at `<repo>/main.140.flat.bin` (25,472,632 B) and that is what `arm32.mjs` reads |
| 2 | `tools/mhgu/README.md:24` | `.tmp/mhgu/inventory/functions4.csv` | absent |
| 3 | `tools/mhgu/README.md:31` | `.tmp/mhgu/inventory/resource-registry.txt` | absent |
| 4 | `tools/mhgu/README.md:34` | `.tmp/mhgu/mon/counter-slots.out.txt`, `.tmp/mhgu/mon/counter-slots3.out.txt` | absent |
| 5 | `tools/mhgu/README.md:36` | `.tmp/mhgu/mon/quest-dispatch.out.txt` | absent |
| 6 | `tools/mhgu/README.md:46` | `.tmp/mhgu/inventory/functions.csv` | absent (the tracked `functions.csv.gz` is present) |
| 7 | `tools/mhgu/README.md:47` | `.tmp/mhgu/inventory/resource-registry.txt` | absent |
| 8 | `tools/mhgu/README.md:48` | `.tmp/mhgu/mon/mon-offsets.out.txt:1-12` | absent |
| 9 | `tools/mhgu/README.md:50` | `.tmp/mhgu/inventory/tierb-labels.csv` | absent |
| 10 | `HANDOFF.md:129` | `.tmp/mhgu/xci-info.txt:50` (source of the NCA size) | absent |
| 11 | `docs/PROGRESS.md:107` | `.tmp/mhgu/xci-info.txt:50` | absent |
| 12 | `docs/README.md:70,72` | `../AGENTS.md` (§5, §6) | absent, and the document itself says "本 repo 不随附 AGENTS.md"; the rule it cites is restated inline, so only the pointer is dead |

**Resolves, but the anchor is wrong:**

| # | Document:line | Says | Actual |
|---|---|---|---|
| 13 | `HANDOFF.md:18` | `coverage-map.md:279` for the 67% cross-save figure | the figure is on line **280**; 279 is the `### 数据侧` heading |
| 14 | `HANDOFF.md:18` | `coverage-map.md:393` for the "[INFERENCE, medium-high] host/runtime memory residue" conclusion | that conclusion is on line **408**; 393 is inside the Palico 324 B section |
| 15 | `docs/PROGRESS.md:65` | `coverage-map.md:306,320-322` for "write side writes the header, read side discards it" | 306 is the sentence; 320-322 is the 覆盖含义 note below the field table (nothing about the read side). (The same document's line 72 cites only `:306`, which is right.) |

**Resolves only with a guessed base (shorthand, not a defect but it costs a reader a search):**

| # | Document:line | Written | Actual |
|---|---|---|---|
| 16 | `docs/PUBLISH-READINESS.md:22` | `inventory/function-labels.tsv` | `docs/analysis/code/inventory/function-labels.tsv` |
| 17 | `docs/PUBLISH-READINESS.md:13` | `VENDOR-NOTICE.md` | `tools/mhgu/VENDOR-NOTICE.md` |
| 18 | `HANDOFF.md:18,129`; `docs/PROGRESS.md:65,104,107`; `docs/README.md` tables | `coverage-map.md`, `METER.md`, `coverage-report.tsv`, `code-metrics.md`, `member-census.md`, … | all resolve, but only after trying `docs/save-layout/`, `docs/analysis/code/coverage/`, `docs/analysis/code/inventory/`, `docs/analysis/code/`, `docs/analysis/members/` respectively |

**Paths that resolve but name the wrong producer** (counted as contradictions C11/C12, listed here
for completeness): `README.md:90,157` -> `size-final.mjs`; `HANDOFF.md:61,67,68,69` -> four
`tools/mhgu` scripts.

**Absolute private paths, all present on this machine (so the documents are accurate here):**
`G:/mhgu-romfs/romfs` (35,531 files), `G:/mhgu-romfs/secure/98abd400….nca` (12,168,003,584 B),
`G:/omp works/MHGU-private/romfs-extract`, `G:/backups/MHGU-pre-filter-20261023{,.bundle}`
(both exist), `G:/backups/MHGU-20261104` (13 MB, `save/` + `config/` + `SHA256SUMS.txt`). The
`MonsterForm.cs` / `MainForm.cs` references resolve under `editor-src/MHGU存档修改/`, which is
private — consistent with `PRIVATE-DATA.md`.

---

## 4. The stated reading order, walked

`README.md:99-110` gives six steps. Walked in order at `9eb31ea`:

| Step | Target | Walk |
|---|---|---|
| 1 | "This file, up to here" | fine |
| 2 | `METER.md`, banner then "覆盖线（三次更正）" | **mostly walkable.** The banner is lines 3-6 and gives the current calibre + the two no-image commands. The section exists at line **55**, but its heading is `## 覆盖线（2026-11-04 三次更正）：…` — the literal string the README quotes appears only at line 6 and in the per-section banners as "覆盖线（更正后）". More importantly, the README calls it "the record of every number that was withdrawn and why": at least eight withdrawn headlines (83.8, 80.3, 80.4, 65.5, 70.4, 81.9, 76.1, 48.9) are in the *neighbouring* sections (lines 103-190, 206-240, 299-328), not in 55-86 |
| 3 | `docs/PROGRESS.md`, "one page" | fine. 107 lines; it opens with the two calibres and the 32.0-point gap |
| 4 | `docs/analysis/audit/LINK-STATUS.tsv` | **breaks.** The reader is told the dispositions are `fixed / open / rejected`; the file also uses `done`, `reverted`, `unresolved`, and the README's own tally (85) is one short of the 86 rows (C6). The claim "every disagreement a review reported" is also generous: the file is a 14-slice ledger of 86 rows, while the W4-WIKI / W4-REFERENCE / W6 waves carry their own defect tables |
| 5 | `docs/README.md` | **soft break.** The index is current and its links resolve, but its row for `analysis/dumps/` presents a private symlink as project output (C20), and its language section points at `../AGENTS.md`, which it then says is not shipped |
| 6 | `HANDOFF.md` §5 / §9 | **breaks at the first table the reader meets in that file.** §5 itself is usable (a dated banner at line 137 tells the reader what is current, the calibre sentence is at 160) and §9's "12 gates, ~5 s" is right. But §1's `.text` row (line 41) states 5,228,411 instructions against the 5,228,277 denominator §0/§5 just gave (C1), and §0's conclusion (line 27) still describes the retired Tier B plan (C3) |

Net: every step lands on an existing file, so the order is walkable in the literal sense; it breaks
where the target's numbers do not reconcile (step 4's ledger, step 6's §1 row), and it is thinner
than advertised at steps 2 and 5. Nothing in the order points at `docs/PUBLISH-READINESS.md` or at
`LICENSE` / `docs/LICENSE`, although the README's own data row cites the former as the source for
the db counts.

---

## 5. Licence vs what the repository actually ships

**What the statement says** (`README.md:162-172`, `HANDOFF.md:4`): MIT for the whole repository —
code, tools, documentation; `LICENSE` holds the text, `docs/LICENSE` repeats it for the notes;
relicensed from GPL-3.0-or-later on 2026-11-04 after an earlier MIT period; third-party material
keeps its own terms, with `docs/data/` (a community database extraction and derived tables) and
`tools/mhgu/vendor/` (MIT packages) named as examples.

**What the repository ships, checked file by file:**

| Artefact | Content | Statement covers it? |
|---|---|---|
| `LICENSE` | MIT, 21 lines, `Copyright (c) 2026 Twelve-eight` | yes, and the holder is named (the previous GPL/CC-BY pair named nobody) |
| `docs/LICENSE` | the same 17 non-empty MIT lines plus 6 lines of scope text (documentation grant + third-party carve-out) | yes; "the same text is repeated" is accurate in substance (MIT body identical line for line) |
| 11 source files | 10 `SPDX-License-Identifier: MIT` (5 `editor/`, 5 `forge/`) + `tools/mhgu/quest-ext.mjs:43` `// License: MIT.` | yes; zero GPL SPDX headers remain |
| `docs/data/functions.csv.gz`, `functions-retile.csv.gz` | our measurements, plus a `strings` column with 51 rows of Nintendo NEX SDK symbols (C18) | **partly.** The README's opening paragraph calls these third-party strings, and `docs/LICENSE`'s general clause "third-party material is not covered" reaches them, but the named example is the community db, not the binary extraction |
| `docs/data/json/monster-slot-map.json`, `monster-slot-map-137.json` (tracked) | 137 verbatim Chinese monster names with `cn_src` naming Capcom's `resident_chS.arc` | yes — inside `docs/data`, and the general clause names it |
| `docs/data/class-inventory.tsv`, `member-offsets.tsv`, `resource-registry.tsv`, `tierb-labels.csv`, `functions-retile.csv.gz` | our own measurements | **ambiguous in the other direction**: the carve-out describes `docs/data/` as "a community database extraction and derived tables", which reads as if everything in the directory were third-party, so the grant over our own tables is unclear |
| `tools/mhgu/vendor/` (ignored) | 101 MIT files, `VENDOR-NOTICE.md` with versions and upstream | yes, named and excluded |
| `docs/wiki/*` (47 tracked files), `docs/mechanics/quests.md` | generated from the db + ROM: `monsters-index.md` alone has 4,716 CJK characters of monster names; `quests.md` is 734 lines with 9,041 CJK characters of quest titles (`PUBLISH-ENTRY-DOCS.md:248` records the wiki-derived titles and the missing attribution) | **no explicit carve-out.** They are outside `docs/data/`, so the MIT grant as written covers them; nothing states their upstream terms or an attribution line |
| `editor-src/`, `save-snapshots/`, `docs/reference/mhxx-wiki/`, `docs/analysis/dumps/`, `docs/data/{armor,weapons,viewer,json/*}` | symlinks into `MHGU-private`; 0 tracked files each | not shipped, so not affected |

**Relicensing soundness.** The claim "every commit is authored by one identity" checks out:
`git log --format='%an <%ae>' | sort | uniq -c` → `646 Twelve-eight <Twelve-eight@users.noreply.github.com>`.
The claim that no third-party code was incorporated is consistent with the repository's own evidence:
`docs/analysis/external/` contains two fenced blocks in two files and both are ASCII directory
trees, not source; the external notes cite line numbers instead of copying GPL code. The GPL text
that was used between 2026-10-24 and 2026-11-04 is in the history, not in the tree.

**Where the licence statement is still contradicted by what ships:** `docs/spec-crossgame/monster-gu.md:40`
says the public repo is "code GPL-3.0-or-later, docs CC BY 4.0" (C19); `DEVLOG.md` has no entry for
the 2026-11-04 change, so its most recent licence statement (`DEVLOG.md:597-599`, 2026-10-24) still
says GPL-3.0-or-later and "文档仍是 CC BY 4.0" — and that log is what `README.md:127` and
`HANDOFF.md:239` tell a new reader to read for "what changed". The three `PUBLISH-*` audit reports
also describe the old regime, but they are dated reports, not live statements.

**Answer to the question as put** (is the statement consistent with `docs/data/`?): yes for the
*third-party* content — every tracked third-party file in `docs/data/` (the two slot maps, the two
function tables) falls under either the named carve-out or the general "third-party material is not
covered" clause, and the opening paragraph separately qualifies the SDK strings. The two remaining
licence defects are (a) third-party-derived text outside `docs/data/` (`docs/wiki/`, `quests.md`)
is granted MIT with no stated upstream terms, and (b) the carve-out's wording leaves the project's
own measurement tables inside `docs/data/` looking third-party.

---

## 6. UNVERIFIED

| Claim | Document | Why not checked |
|---|---|---|
| 53 state tables / 60 sections / 1,223 rows / 119 named (9.7%) / 166-entry main table / 137 slots / 110 members | `README.md:49`; `HANDOFF.md:20-24`; `docs/PROGRESS.md:106` | requires the image and the generators (`state-motion3.mjs`, scans over `main.140.flat.bin`). Verified only that the cited `docs/mechanics/*.md` state the same numbers (transcription is faithful). The dispatch-site pair is no longer in this row — it is contradicted (C21), not merely unverified |
| 83.6% retention / 93.7% conditional precision / 78.3% joint, 25,123 rows | `HANDOFF.md:21,165`; `METER.md:680-700` | would need `canonical-holdout-random.mjs` (5 holdout runs); not run in this sweep |
| 95.0% = 1,189,308 / 1,251,869 and the 762-function zero-assertion set | `HANDOFF.md:142`; `METER.md:987-997` | the gate re-checks 22,957 rows, not this per-function union; not re-derived |
| "`curl https://github.com/Twelve-eight/MHGU` returns 200" | `docs/PUBLISH-READINESS.md:7` | no network request was made in this sweep |
| the concrete hashes of the live save files (`Lay1nn_HR198.hnt`, `system`, `qt-config.ini`) | `DEVLOG.md:1296-1320` | the live install is outside the repository. The snapshot files do match the quoted hashes (`sha256sum` on the four `.hnt`: `69392be8…e5e2` twice, `54826478…af95` twice), and the backup directory exists at 13 MB |
| "emulator / console" for `patch/1.4.0.pchtxt` | `README.md:128` | the patch is a `@nsobid-` text patch; the only installation path anywhere in the repo is the emulator `load/` directory (`DEVELOP.md` asset table, `DEVLOG.md` 2026-10-24). No console (Atmosphere IPS/cheat) path is documented, and the pchtxt format is not one Atmosphere reads. Could not be falsified from the repo; treat the word "console" as unsupported |
| `mon-offsets.py` grouping "110 条、27 组" | `tools/mhgu/README.md:48` | the tracked `member-offsets.tsv` has 110 rows over **37** distinct containing functions; the "27 groups" is the script's registrar grouping, and the script needs the image at the now-dead `.tmp` path |
| the 25.9 MB size of the tracked inventory | `docs/PUBLISH-ENTRY-DOCS.md:248` | recomputed over the 173 tracked files under `docs/analysis/code/inventory/`: 25.9 MB — agrees |

---

## Difficulties

1. **The tree moved under the sweep.** Two commits landed mid-read (`03c6544` at 07:24 added the
   README state table; `9eb31ea` at 07:35 relicensed the repository to MIT and rewrote
   LICENSE/docs/LICENSE). The first read of README showed a GPL-3.0-or-later / CC BY 4.0 licence
   section, which is now wrong for the tree; every finding above was re-read at `9eb31ea`. Two other
   agents were editing `docs/analysis/audit/W6-*.md` and `tools/mhgu/tierb-gen.mjs` at the same
   time.
2. **`.tmp` is gone**, so nine citations in `tools/mhgu/README.md` and two in the entry documents
   cannot be checked at all. I can say the files are absent; I cannot say whether the line counts
   they quote were ever right. The two that can be checked against tracked files
   (`resource-registry.tsv` 448 lines, `tierb-labels.csv` 379 lines) are correct.
3. **Counting rules matter.** `functions.csv.gz` has 23,885 newlines and no trailing newline: `wc -l`
   gives 23,885 while the file holds 23,886 lines (23,885 data rows + header), which is what the
   tools README says. `tierb-labels.csv` is the opposite (trailing newline), 379 lines incl. header.
   The 138-vs-tree script count depends on the rule: `PUBLISH-TOOL-DEPS` used `**/*.{mjs,js,py}` per
   directory and excluded `gu-moves/lib`, so the comparable current figure is **143**, not the 148
   a flat `find` returns (which adds the 5 lib modules).
4. **The DEVLOG is a log.** I treated a dated number that no longer reproduces as `stale`, not as a
   contradiction, except where the same file later says the number is wrong (the 2.0%/60-class
   bullet, C14) or where the section is presented as the current state ("先读这段再动手", C15).
5. **W4-REFERENCE repeats its claims twice** (prose tables in lines 55-170, then a 92-row
   TSV-like table at 301+). Counting naively double-counts: 70 `CONFIRMED` in the prose section,
   72 in the final table. The final table is the summary and the one the README's "92 claims"
   matches.
6. **The licence question has two halves** — the text of the licence files and the statement about
   them. The files are now internally consistent (MIT text, named holder, 11 MIT headers); the
   statement still reaches text (wiki-derived) that the repository does not own, and one live spec
   document plus the DEVLOG still assert the old regime.

---

## VERDICT

```
README.md                  contradiction  Headline calibres, 52,692/5,228,277, save percentages, 129/21,153/1,355 and the 51 NEX rows all reproduce, but the state table does not: W4-REFERENCE is 72/16/4 not 78/12/2, the save-side figures are attributed to a script that does not compute them, and the 51-row parenthetical lists two of three tokens. (The ledger tally, the bare script count, the commit number and the withdrawn dispatch pair were all live at 9eb31ea and are closed by 76735a9 or by the working-tree README.)
HANDOFF.md                 contradiction  Five current-state defects live here while most of the file is synced to METER: .text 5,228,411 paired with the 0x100 range (the range holds 5,228,347), "19 = 18 + 2" member slots (census: 19 objects/20 calls), the Tier B 48.5% conclusion (gap 32.0 points, plan retired), four tool-table rows naming tracked outputs their scripts do not write, and a DEVLOG pointer that names a section no longer last (C22).
docs/PROGRESS.md           confirmed      Every headline (58.0/66.2/53.5/87.84/14.9/52,692/5,228,277/3,201/110/332/53/6,777/4,527/12,168,003,584) reproduces — including the dispatch retraction it carried before README and HANDOFF did; only a line anchor drifts (coverage-map 320-322 quoted for the read-side discard).
docs/README.md             contradiction  Every indexed file and save-side number checks out except two descriptions: member4-file-layout.txt has 135 data rows not 134, and analysis/dumps/ is marked project output although it is a private symlink with 0 tracked files.
docs/PUBLISH-READINESS.md  contradiction  The vendor/DEVELOP/reproducibility facts verify (vendor blobs in unpushed history = 101 files, DEVELOP lines 10 and 12 correct, both headline commands print the quoted lines), but "a stranger can run check.mjs" is false (ROOT is hardcoded) and the ahead count (242) is 257.
docs/PRIVATE-DATA.md       confirmed      All six local links and all three absolute paths exist; the NCA is 12,168,003,584 B and the romfs holds the stated 35,531 files.
tools/mhgu/README.md       contradiction  The producer table is the accurate document in the repo, but the input table points at a deleted .tmp image, the "all scripts read absolute paths" sentence is false for arm32/reader-fields and the coverage chain, and nine .tmp evidence citations are dead.
DEVLOG.md                  stale          The last 200 lines plus headers still carry 95.3% (METER: 95.0%), "2.0% / 60 classes" (same file later: 7.8% / 233), "8 gates" (12), and 45/2/2/1 ledger counts (75/4/4/1/1/1); no entry records the 2026-11-04 relicensing.
LICENSE                    confirmed      MIT text, Copyright (c) 2026 Twelve-eight, 21 lines; every non-empty line also appears in docs/LICENSE.
docs/LICENSE               confirmed      MIT body plus a documentation grant and a third-party carve-out naming docs/data/ and tools/mhgu/vendor/; the SDK strings are covered by the general clause.
```

10 documents: 4 confirmed, 5 contradiction, 1 stale, 0 unverified.
