# W6-ROOTDOCS — the entry documents and the licence, checked against their artefacts

Scope: `README.md`, `HANDOFF.md`, `docs/PROGRESS.md`, `docs/README.md`,
`docs/PUBLISH-READINESS.md`, `docs/PRIVATE-DATA.md`, `tools/mhgu/README.md`, `LICENSE`,
`docs/LICENSE`, and `DEVLOG.md` (last 200 lines plus its section headers). Review only; no
document was edited.

**Snapshot.** HEAD `9eb31ea` (2026-11-04 07:35:51 +0800). The tree moved twice while this sweep was
reading it: `03c6544` (07:24) added the README state table, `9eb31ea` (07:35) relicensed the
repository to MIT. Every number below was re-read and re-checked at `9eb31ea`. The working tree
also carried other agents' edits while this ran (`docs/analysis/audit/W6-EXTERNAL.md` and
`W6-PASS3.md` modified, `W6-INVENTORY.md` / `W6-MONSTERS.md` untracked,
`tools/mhgu/tierb-gen.mjs` modified). Counts that move with every commit (commits ahead, ledger
tallies, script count) are given with the command and the value at this commit.

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
| 3 | **90.0%** / **76.6%** (spread pooled at 72.4%) | `METER.md:3,82,240,517`; nobody else states it | report row `covered, spread pooled at 72.4% 40374 4704134 90.0% 76.6%` | confirmed |
| 4 | expected explained **75.0%–82.5%** | `METER.md:3`; `HANDOFF.md:21` | report rows `3919967 75.0%` and `4315652 82.5%` | confirmed |
| 5 | no label **10.0%** instructions / **23.4%** functions = **12,318** functions | `METER.md:3`; `HANDOFF.md:21,147,152`; `DEVLOG.md:1184` | report `partition: no label 12318 524143 10.0% 23.4%`; `function-labels.tsv` has 40,374 data rows, 52,692 − 40,374 = 12,318 | confirmed |
| 6 | direct evidence **23.9%** = **13,061** functions / 1,248,279 insns | `METER.md:240,293`; `HANDOFF.md:142` | report `A-direct (evidence row) 13061 1248279 23.9% 24.8%` | confirmed |
| 7 | partition **36.3 / 2.8 / 3.3 / 23.8** | `METER.md:225`; `HANDOFF.md:145-147` | report rows `inferred only 11250 1896778 36.3%`, `signature only 1475 144714 2.8%`, `spread validated labels 2401 170761 3.3%`, `spread unvalidated 12187 1243602 23.8%` | confirmed |
| 8 | **52,692** functions / **5,228,277** instructions | `README.md:47,85`; `HANDOFF.md:19,21,137,163`; `docs/PROGRESS.md:91,98` | `gzip -dc docs/data/functions-retile.csv.gz \| wc -l` = 52,693 lines (52,692 rows + header); column `insns` sums to 5,228,277; gate 4 prints the same | confirmed |
| 9 | `.text` 0x100..0x13F1DEC = **5,228,347** words | `docs/PROGRESS.md:91` only | `(0x13F1DEC-0x100)/4 = 5228347` | confirmed |
| 10 | `.text` **5,228,411** instructions | `HANDOFF.md:41` | `0x13F1DEC/4 = 5228411`, i.e. the count from vaddr 0, not from 0x100 | **contradiction C1** |
| 11 | **23,885** regions (pre-retile) | `README.md:47`; `HANDOFF.md:19,139,163,165,246`; `tools/mhgu/README.md:24,46` | `gzip -dc docs/data/functions.csv.gz \| wc -l` = 23,885 newlines + 1 final row = 23,885 data rows | confirmed (as history) |
| 12 | **3,201** classes | `README.md:47`; `HANDOFF.md:19,67,122,165`; `docs/PROGRESS.md:92` | `docs/data/class-inventory.tsv` = 3,201 data rows | confirmed |
| 13 | save side **87.8%** structural / **14.9%** field | `README.md:35,48,88,155`; `docs/PROGRESS.md:23,24,72`; `docs/PUBLISH-READINESS.md:23`; `docs/save-layout/coverage-map.md:10-11` (`≈88%`, `14.9%`) | `(226754+950374*0.85)/1177760 = 0.878423`; `224643*0.78/1177760 = 0.148775` | confirmed (arithmetic; the 0.85/0.78 inputs are measurements) |
| 14 | **226,754** member layer / **224,643** decomposed / **950,374** tail / **1,177,760** block | `HANDOFF.md:16,17`; `docs/PROGRESS.md:23,24` | 0x3783A−0x278 = 227,386−632 = 226,754; 9,543+76+12,955+115,072+86,997 = 224,643; 1,177,760−227,386 = 950,374; all four `.hnt` snapshots are exactly 1,177,760 B | confirmed |
| 15 | **129** monsters / **21,153** items / **1,355** quests | `README.md:53`; `docs/PUBLISH-READINESS.md:25` | `SELECT count(*)` on `docs/data/mhgu.db` → 129 / 21153 / 1355 | confirmed |
| 16 | **39** tables | `README.md:53` | `sqlite_master` → 39 tables (38 user tables + `sqlite_sequence`), which is what `docs/data/README.md:26` says | confirmed |
| 17 | **12 gates**, twelve PASS + `ALL PASS` | `README.md:100`; `docs/PUBLISH-READINESS.md:21,63`; `HANDOFF.md:244`; `DEVLOG.md` (contradicts itself, see C14) | `node tools/audit/check.mjs` at `9eb31ea`: 12 `PASS` lines, then `ALL PASS` (2.68 s) | confirmed |
| 18 | **24** evidence tables / **46,858** rows / **25,786** functions | `README.md:84`; `METER.md:46` | gate 5 prints `PASS evidence tables: 24 files, 46858 rows, 25786 functions` | confirmed |
| 19 | **22,957** A rows re-checked 100% + **4,479** taxonomy + **2,731** unparsed = **30,167** | `README.md:87`; `HANDOFF.md:142` | gate 6 prints `22,957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses` | confirmed |
| 20 | **40,374** rows in `function-labels.tsv` | `docs/PUBLISH-READINESS.md:22`; `METER.md`; `DEVLOG.md:1198` | `wc -l` = 40,375 lines incl. header → 40,374 data rows | confirmed |
| 21 | **51** NEX rows in `functions*.csv.gz` | `README.md:10-12` | union of `Nex\|nn::\|Nintendo` = 51 rows in each file (tokens: `Nex` 178, `nn::` 15, `Nintendo` 17); with only the two listed tokens the count is 36 | confirmed, parenthetical incomplete (C18) |
| 22 | **53** state tables / **3,429** sites in **2,546** functions / **60** sections / **1,223** rows / **119** (9.7%) / **137** slots / **110** members | `README.md:49`; `HANDOFF.md:20-24,118`; `docs/PROGRESS.md:100-102` | the cited docs state each; not re-derived here (see UNVERIFIED) | transcription confirmed, value UNVERIFIED |
| 23 | base NCA **12,168,003,584** B | `docs/PROGRESS.md:107`; `HANDOFF.md:129`; `docs/PRIVATE-DATA.md` | `stat -c %s G:/mhgu-romfs/secure/98abd400…nca` → 12168003584 | confirmed |
| 24 | **18 MB** db, **25 MB** image | `README.md:82,154`; `PRIVATE-DATA.md` | 18,333,696 B and 25,472,632 B | confirmed |
| 25 | **138** scripts (7 / 4 / 2 / 42 / 83) | `README.md:53` | `PUBLISH-TOOL-DEPS.md` has exactly 138 rows classified 7/4/2/42/83; the tree now holds 148 `.mjs/.js/.py` files outside `vendor/` (`tools/audit` grew 5 → 9) | confirmed vs the named artefact, **stale vs the tree** |
| 26 | ledger **73 fixed / 6 open / 4 rejected / 1 unresolved / 1 reverted** | `README.md:54` | `LINK-STATUS.tsv` 86 data rows: fixed 75, open 4, rejected 4, done 1, reverted 1, unresolved 1 | **contradiction C6** |
| 27 | public branch **251** commits behind / **242** ahead | `README.md:74`; `docs/PUBLISH-READINESS.md:7,13` | `git rev-list --count origin/master..HEAD` = **253** | **contradiction C7** |
| 28 | wiki **42 of 47** pages reproduce | `README.md:51` | `W4-WIKI.md`: 46 page rows = 42 confirmed (41 plus 1 "confirmed with a caveat"), 3 contradiction, 1 stale; the 47th file is `README.md` itself, which has defects | confirmed |
| 29 | reference **78 of 92** confirmed, **12** contradictions, **2** unverified | `README.md:52` | `W4-REFERENCE.md`'s 92-row table: **72 / 16 / 4** | **contradiction C5** |
| 30 | **250** tracked documents | `README.md:54` | `git ls-files '*.md' \| wc -l` = 250 | confirmed |

Cross-document agreement: numbers 1–9 and 11–24 agree wherever two entry documents state them. The
disagreements are 10 (HANDOFF alone), 25–27 (each document with the tree), and 29 (README with its
own named artefact). `docs/README.md` states no code-side number at all; its save-side numbers
(134 rows, 86,997 B, 653,472 B, 122 bits, 32 slots x 19 bit, 19 objects / 20 calls) were all
checked and agree with the documents it indexes, with one row-count exception (C15).

---

## 2. Contradictions

The acceptance table: what document A says, what document B says, and which one the artefact
supports. C1–C12 are current-state defects in the entry documents; C13–C17 are stale statements
inside dated records (the DEVLOG) or in a document the entry set indexes; C18–C20 are smaller
wording/count defects. Severity: P1 = a reader is actively misled about a headline; P2 = a
regeneration path or a summary is wrong; P3 = friction or a count one off.

| # | Subject | A says | B says | Artefact supports | Sev |
|---|---|---|---|---|---|
| C1 | `.text` instruction count | `HANDOFF.md:41`: `0x100 .. 0x13F1DEC` = 5,228,411 | `docs/PROGRESS.md:91`: the same range = 5,228,347 words, function spans 5,228,277; `HANDOFF.md:19` and `coverage-report.tsv:1` use 5,228,277 | 5,228,347 for the range as written | P2 |
| C2 | number of save member objects | `HANDOFF.md:80`: 19 slots = 18 readers + 2 fixups | `docs/PROGRESS.md:42` and `docs/README.md:46`: 19 objects = 18 readers + member[2] second segment; 20 calls (19 bl + 1 tail jump) | member census: 19 objects, 20 calls, 0x521398 is member[2]'s second segment | P2 |
| C3 | where the 90% gap sits | `HANDOFF.md:27`: "Tier B's 48.5% of instructions", per-function adjudication "in progress" | `METER.md:225`: 58.0 -> 90 is a **32.0-point** gap; report `conf B` = 28.4%; `HANDOFF.md:246`: the adjudication workflow is **retired** | METER / report | P2 |
| C4 | schema of `monster-slot-map-137.json` | `HANDOFF.md:123`: `slot/emid/cn/en/kind`; 94 big + 43 small | the tracked file: `slot/emid/cn/cn_src/en` (no `kind`, no `ro`); `kind` lives in `monster-slot-map.json` | the JSON file | P3 |
| C5 | reference-audit tally | `README.md:52`: 78 confirmed / 12 contradictions / 2 unverified | `W4-REFERENCE.md` 92-row table: 72 / 16 / 4 | the table | P2 |
| C6 | audit-ledger tally | `README.md:54`: 73 fixed, 6 open, 4 rejected, 1 unresolved, 1 reverted (= 85) | `LINK-STATUS.tsv`: 86 rows, 75 fixed, 4 open, 4 rejected, 1 done, 1 reverted, 1 unresolved | the TSV | P2 |
| C7 | commits not yet pushed | `README.md:74`: 251; `docs/PUBLISH-READINESS.md:7,13`: 242 | `git rev-list --count origin/master..HEAD`: **253** | git | P3 |
| C8 | number of scripts | `README.md:53`: 138 | the tree: 148 `.mjs/.js/.py` outside `vendor/`; the named artefact (`PUBLISH-TOOL-DEPS`) itself counted `tools/audit` as 5, it now holds 9 | the tree | P3 |
| C9 | can a stranger run the gate? | `docs/PUBLISH-READINESS.md:63`: the three commands, `check.mjs` included, are "entries a stranger can run themselves" | `tools/audit/check.mjs:10`: `const ROOT = "G:/omp works/MHGU";` | the script | P2 |
| C10 | toolchain input paths | `tools/mhgu/README.md:9`: image at `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`; `:13`: "all scripts default to absolute `G:/omp works/...` paths" | `tools/mhgu/arm32.mjs:7` and `reader-fields.mjs:7`: `FLAT` env or `<repo>/main.140.flat.bin`; `README.md:145-147` says the same | the scripts | P2 |
| C11 | which script produces four tracked tables | `HANDOFF.md:61,67,68,69`: `func-inventory5` -> `functions.csv.gz`; `mon-final.py` -> `class-inventory.tsv`; `mon-offsets.py` -> `member-offsets.tsv`; `em-units.py`/`counter-slots*` -> `monster-slot-map-137.json` | `tools/mhgu/README.md:24,32,33,34,46`: all four write elsewhere or only print; none writes the tracked file | the scripts (`grep writeFile`) | P2 |
| C12 | producer of the save-side percentages | `README.md:88,155`: `tools/mhgu/mon/size-final.mjs` | `size-final.mjs:1-2`: it inverts the emsizetbl/emyure name hash and joins kill/capture counters with size records; no coverage code anywhere in `tools/` | the script | P2 |
| C13 | direct-evidence assertion rate | `DEVLOG.md:1194`: 95.3% | `METER.md:997`: 95.3% was the wrong denominator, the value is **95.0%**; `HANDOFF.md:142` uses 95.0% | 1,189,308 / 1,251,869 = 95.0% | P3 |
| C14 | string evidence in the unlabelled bucket | `DEVLOG.md:1203` (in "conclusions not to redo"): 2.0% of unlabelled functions, 60 class names | `DEVLOG.md:1264`, `METER.md:859`, `HANDOFF.md:152`: **958 (7.8%)**, 124,509 insns (2.38%), **233** class names | recomputed 958 / 12,318 = 7.8% | P3 |
| C15 | number of gates | `DEVLOG.md:1175` title "eight gates all green", `:1214` "8 gates, ~2 s" | `tools/audit/check.mjs` has 12; `DEVLOG.md:1258` itself records "gates 8 -> 12" | the gate prints 12 PASS | P3 |
| C16 | ledger counts in the log | `DEVLOG.md:1279`: fixed 45, open 2, rejected 2, reverted 1 | `LINK-STATUS.tsv`: 75 / 4 / 4 / 1 / 1 / 1 | the TSV | P3 |
| C17 | rows in `member4-file-layout.txt` | `docs/README.md:35`: 134 rows | the file: **135** data rows (`grep -c '^0x'`) | the file's own header: "134 static bl ... + 1 nested 4 B read" | P3 |
| C18 | what the 51 NEX rows contain | `README.md:10-12`: rows containing "NEX SDK symbol fragments (`Nex`, `nn::`)" | 36 rows match `Nex\|nn::`; 51 requires the third token `Nintendo` | the CSVs | P3 |
| C19 | repository licence in a spec doc | `docs/spec-crossgame/monster-gu.md:40`: "public repo (code GPL-3.0-or-later, docs CC BY 4.0)" | `README.md:162`, `HANDOFF.md:4`, `LICENSE`: **MIT** | LICENSE | P2 |
| C20 | does `analysis/dumps/` ship? | `docs/README.md:21` marks it as project output (tick) | it is a symlink to `MHGU-private`, **0** tracked files; `PRIVATE-DATA.md` lists it as non-public | `git ls-files` | P3 |

### C1 — `HANDOFF.md:41` counts words from vaddr 0

```
$ node -e "const T=0x13F1DEC;console.log(T/4,(T-0x100)/4)"
5228411 5228347
```

The row is the coordinate table ("reads first"), and it is the only place in the repository that
attributes 5,228,411 instructions to `0x100..0x13F1DEC`. `docs/PROGRESS.md:91` prints the same range
as 5,228,347 words and strikes the 5,228,411 value; `HANDOFF.md:19` and
`coverage-report.tsv:1` use 5,228,277 as the function-span sum. The 5,228,411 number is right for
`0..0x13F1DEC` (the 0x100 header is 64 words). `LINK2-CONSTANTS.md` item 3 already noted it as an
"adjacent" defect; it is not in `LINK-STATUS.tsv` and the line is unchanged.

### C2 — `HANDOFF.md:80`: 19 = 18 + 2

`18 + 2 = 20`, so the sentence cannot be true as written. `docs/analysis/members/member-census.md:29`:

```
调度器共 **20 次调用**（19 `bl` + 1 尾跳 `b 0x2282a8`），覆盖 **19 个独立成员对象**——`0x3e7920` 的
`bl 0x521398` ... 与 member[2] `0x51dbb4` **同一成员单例**，是 member[2] 的第二段 reader。
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
three components are wrong. Six of the difference is in `re-guide-gu.md` alone (5 contradictions
there; e.g. the "rage pipeline" row, the "no wind strings" row, the "43,353 writeback words" row).

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

### C7 — the commit count is a moving snapshot, and both documents are behind it

```
$ git rev-list --count origin/master..HEAD
253
$ git rev-parse --short origin/master
f199842
```

`README.md:74` says 251 and `docs/PUBLISH-READINESS.md:7,13` says 242. 242 was the value the prior
entry-docs audit measured (`PUBLISH-ENTRY-DOCS.md` §0 prints 242 at the same `origin/master`), 251
was the value when the README was written, and HEAD has since gained `03c6544` and `9eb31ea`. This
is unavoidable drift for a hand-typed count; the fix is to print the command rather than the
number, or to drop the sentence.

### C8 — `README.md:53`: 138 scripts

```
$ grep -A14 "The tree in numbers" docs/analysis/audit/PUBLISH-TOOL-DEPS.md | tail -9
MHGU/tools/ root ..................   4 scripts
MHGU/tools/mhgu/ ..................  50 scripts
MHGU/tools/mhgu/coverage/ .........  71 scripts
MHGU/tools/audit/ .................   5 scripts
...
                                    138 scripts
$ find tools -path 'tools/mhgu/vendor' -prune -o -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.py' \) -print | wc -l
148
$ find tools/audit -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.py' -o -name '*.js' \) | wc -l
9
```

The README's number reproduces from the artefact it names, and the artefact's own split (7 / 4 / 2 /
42 / 83) reproduces exactly from its 138 classified rows. The artefact is what has drifted: the
audit directory grew from 5 to 9 scripts (the W3/W4/W5/W6 audit tools) and ten more scripts exist,
so the entry sentence understates the tree by ten.

### C9 — `docs/PUBLISH-READINESS.md:63` and `check.mjs:10`

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
four scratch-path scripts `README.md:132` names.)

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

### C12 — `README.md:88,155`: the save-side figures have no producer

```
$ sed -n '1,3p' tools/mhgu/mon/size-final.mjs
// size-final.mjs — (1) invert the manifest name hash for emsizetbl/emyure by trying path spellings,
//                   (2) join kill/capture counters with size records for both saves.
$ grep -n "1177760\|226754\|950374\|87\.8" tools/mhgu/mon/size-final.mjs
(no output)
$ grep -rln "1177760" tools/
(no output)
```

The script does read two fixed snapshots (so the second half of `README.md:155` is true), but it
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
