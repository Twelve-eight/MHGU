# Harvested from the agent's local:// report on 2026-11-04; the agent's write device refused working-tree paths.

# PUBLISH-ENTRY-DOCS — the five entry documents, read as a stranger with no game image

Audit date 2026-11-04. Target: `README.md`, `HANDOFF.md`, `docs/PROGRESS.md`, `docs/PUBLISH-READINESS.md`, and the top of
`docs/analysis/code/coverage/METER.md`. Every statement below is followed by the command that produced it; read-only
commands only. Intended final location: `docs/analysis/audit/PUBLISH-ENTRY-DOCS.md`.

---

## 0. The premise has to be corrected first: the repository is already public

The brief says the repo is "240+ commits ahead of origin/master, never pushed". The ahead count is right, the "never
pushed" is not:

```
$ curl -s https://api.github.com/repos/Twelve-eight/MHGU | node -e '...'
full_name = "Twelve-eight/MHGU"
private   = false
visibility= "public"
default_branch = "master"
created_at= "2026-10-23T14:05:44Z"
pushed_at = "2026-10-29T20:25:17Z"
size      = 4568            (KB)
license   = GPL-3.0
has_issues= true, open_issues_count = 0

$ curl -o /dev/null -w "%{http_code}" https://github.com/Twelve-eight/MHGU
200

$ git rev-parse origin/master             -> f19984241ab24a8f9370f6b77f6bc2fdf9aa66ef
$ git log -1 --format='%ci' origin/master -> 2026-10-30 04:25:09 +0800
$ git rev-list --count origin/master..HEAD -> 242
$ git merge-base --is-ancestor origin/master HEAD && echo yes -> yes
```

`origin/master` is an ancestor of HEAD, so a plain `git push` publishes all 242 commits at once. A snapshot from
2026-10-30 is already readable by anyone on the internet, and the five documents exist in it:

```
$ for f in DEVELOP.md GOAL.md HANDOFF.md docs/PROGRESS.md docs/README.md README.md; do git cat-file -e origin/master:$f; done
DEVELOP.md YES | GOAL.md YES | HANDOFF.md YES | docs/PROGRESS.md YES | docs/README.md YES | README.md YES
```

`HANDOFF.md:4` in that public snapshot itself says the repository is 公开 ("public"). So the entry documents are not a
draft: they are what a stranger reads today. Below, every risk is marked **PUBLIC** (already on GitHub) or
**UNPUSHED** (waiting in the 242 commits).

Nothing distributable has leaked through git: `git ls-tree -r origin/master --name-only | grep -E "flat.bin|mhgu.db|save-snapshots|analysis/dumps"` returns nothing, and locally `main.140.flat.bin` and `docs/data/mhgu.db` are both ignored
(`.gitignore:50` and `.gitignore:51`; `git ls-files --error-unmatch main.140.flat.bin` → "did not match any file(s)").

---

## 1. FACTS — what is there

### 1.1 Size and language of the five documents

```
$ for f in README.md HANDOFF.md docs/PROGRESS.md docs/PUBLISH-READINESS.md docs/analysis/code/coverage/METER.md; \
  do ...; done
README.md                      lines=23    CJK chars=0      internal-session words=0
HANDOFF.md                     lines=253   CJK chars=4079   internal-session words=12
docs/PROGRESS.md               lines=107   CJK chars=1692   internal-session words=0
docs/PUBLISH-READINESS.md      lines=51    CJK chars=757    internal-session words=6
docs/analysis/code/coverage/METER.md  lines=1162  CJK chars=21730  internal-session words=1
```

Repo-wide: **182 of 231 tracked `.md` files are predominantly Chinese**, 49 are English or contain no Chinese
(node script over `git ls-files "*.md"`). The four Chinese files at the root are `DEVELOP.md`, `DEVLOG.md`, `GOAL.md`,
`HANDOFF.md`.

The only English entry point is `README.md`, 23 lines. Everything it points at is Chinese.

### 1.2 Check 1 — does the first screen say what the project is, what it has proven, and what it has not?

**What it is — yes.** `README.md:3-6`:

> Reverse-engineering notes and tools for **Monster Hunter Generations Ultimate (Switch, v1.4.0)**: save-file layout,
> code map, monster mechanics, an item-box expansion patch, and a save editor. Goal: help more people play MHGU with
> more variety, on emulators and on the native recompiled build.

**What is absent — yes.** `README.md:8-10`:

> **No game code, keys, game files, or save files are in this repository.** You need your own legal dump. Tools that
> read the game expect a flat image you produce yourself
> (`tools/mhgu/nso-flat.mjs <your exefs/main> main.140.flat.bin`).

**What it has proven and what it has not — no.** The file contains no percentage, no count, no date, and no "state of the
work" line. The only quantified statements are the game version (`v1.4.0`) and the coordinate convention
(`flat_off = vaddr + 0x100`, `README.md:14`). The path table (`README.md:12-17`) lists `docs/`, `docs/analysis/external/`,
`tools/mhgu/`, `patch/1.4.0.pchtxt` — it does **not** list `docs/PROGRESS.md`, `HANDOFF.md`, `DEVLOG.md`, `METER.md`,
`tools/audit/`, `tools/mhgu/coverage/`, `forge/` or `editor/`:

```
$ for k in PROGRESS HANDOFF DEVLOG METER forge editor tools/audit coverage; do printf "%s %s\n" $k $(grep -c $k README.md); done
PROGRESS 0 | HANDOFF 0 | DEVLOG 0 | METER 0 | forge 0 | editor 1 | tools/audit 0 | coverage 0
```

(`editor` matches only the word "editor" in the prose; there is no path to the editor sources.)

The sentences that *do* answer the question exist, one hop away and in Chinese:

- `HANDOFF.md:21` — the L1 row of the status table ends with **"口径收紧后未达 90%（见 §5 顶部说明）"** ("after tightening
  the calibre, 90% not reached").
- `docs/PROGRESS.md:73` — **"语义级仍接近 0——能说出'这段属于 monster-em / quest / ui'，还说不出'它算的是哪条规则'"**
  ("semantic level still near 0 — we can say which subsystem a stretch belongs to, not which rule it computes").
- `METER.md:1-6` — the banner: 66.2% / 53.5% at ≥90% precision, 58.0% under the project's own calibre, target 90% not met.

A stranger who stops at `README.md` cannot tell an in-progress measurement project from a finished toolkit. The
project's own `docs/PUBLISH-READINESS.md:21` lists exactly this as an open item ("`README.md` 面向外人的第一屏是否讲清
'这是什么 / 证明了什么 / 没有游戏镜像怎么复核'").

### 1.3 Check 2 — are the headline numbers traceable to a command an outsider can run without the image?

Two things are true at once: every number lives in a **tracked** artefact and two scripts reproduce the two headline
calibres with no image at all, but the documented reproduction path needs the image. Details:

| Headline number | Where it is stated | Command that produces it | Needs the image? |
|---|---|---|---|
| **58.0% of instructions** (project calibre: Tier A + Tier B conf=A) | `HANDOFF.md:21`, `docs/PROGRESS.md:98`, `METER.md:4`, `docs/PUBLISH-READINESS.md:9` | `node tools/mhgu/coverage/canonical-metric.mjs` | **No.** Verified: run from `C:/`, prints `Tier A verified 25584 functions, 57.7%`, `Tier B conf=A 74 functions, 0.3%`, `canonical total 58.0%` |
| **66.2% instructions / 53.5% functions** at ≥90% precision | `METER.md:1`, `docs/PROGRESS.md:98`, `HANDOFF.md:21` | `node tools/mhgu/coverage/independent-coverage.mjs` → `covered at >=90% independently: 3460532 = 66.19%`; the 53.5% figure is only a row in `docs/analysis/code/inventory/coverage-report.tsv` | **No.** Verified; the report row is tracked (`covered at >=90% precision 28187 3460532 66.2% 53.5%`) |
| 90.0% instructions / 76.6% functions (spread pooled at 72.4%) | `METER.md:1` and `METER.md:242`, report row `covered, spread pooled at 72.4%` | no dedicated script; the 72.4% weighting is `spread-precision-independent.mjs` (`5144/7106 = 72.4% CP95 71.3%`) | No, but nothing joins the two |
| 75.0% / 82.5% expected explained | `METER.md:1`, report rows `expected explained fraction` | gate 10 of `tools/audit/check.mjs` reads them back from the report | No in principle; unreachable because `check.mjs` cannot start (see R3) |
| 10.0% / 23.4% unlabelled (12,318 functions) | `METER.md:1`, report row `partition: no label` | `independent-coverage.mjs` | No |
| 52,692 functions / 5,228,277 instructions | `docs/PROGRESS.md:91`, report `denominator:` line | `node tools/mhgu/coverage/retile.mjs` (image) **or** count the tracked `docs/data/functions-retile.csv.gz` | **No** if you count the tracked table — verified 52,692 data rows and `insns 5228277` |
| 40,374 labelled functions | `docs/PUBLISH-READINESS.md:10`, `METER.md:764` | `wc -l docs/analysis/code/inventory/function-labels.tsv` | **No** — verified 40,375 lines including the header |
| 22,957 evidence rows re-checked, 100% | `METER.md:4` (banner), `HANDOFF.md:137-160` | `SAMPLE=100000 node tools/mhgu/coverage/verify-evidence.mjs` | **Yes** — `verify-evidence.mjs:12` reads `<repo>/main.140.flat.bin` unconditionally |
| Save: 87.8% structural / 14.9% field-level | `docs/PROGRESS.md:23-24,72`, `docs/PUBLISH-READINESS.md:11` | arithmetic stated inline `(226,754 + 950,374×0.85)/1,177,760`; check.mjs gate 11 re-checks the formula text | The **formula** needs no data; the **inputs** (`226,754`, `950,374`) come from two private save snapshots |
| 1,223 state rows, 119 named (9.7%) | `HANDOFF.md:24,216`, `docs/PUBLISH-READINESS.md:12` | `tools/mhgu/state-motion2.mjs` | **Yes** (and no command is cited at the point of use) |
| 129 monsters / 21,153 items / 1,355 quests | `docs/PUBLISH-READINESS.md:13` | SQL on `docs/data/mhgu.db`, an 18,333,696-byte **untracked** file | Not applicable — the data is not distributed. Verified the counts do match the local db (`monsters 129`, `items 21153`, `quests 1355`) |
| 3,201 classes / 110 member offsets / 137 slots | `docs/PROGRESS.md:91`, `HANDOFF.md:§4` | `wc -l docs/data/class-inventory.tsv`, `member-offsets.tsv`, count of `monster-slot-map-137.json` | **No** — verified 3,201 / 110 / 137 |
| 3,429 dispatch sites / 53 state tables / 477 readers | `docs/PROGRESS.md:106`, `HANDOFF.md:118` | no script in the repo; the `movw #0x73e0` scan needs the image | **Yes** |

The advertised reproduction block is `METER.md:9-43`, 20 `node` invocations. Five of them read the image
(`retile`, `stringxref`, `fingerprints`, `vtable-scan`, `immscan`); a sixth image-dependent step, `form-classify`,
appears in the `HANDOFF.md:242` chain rather than in the block. The other fifteen run from tracked inputs:

```
$ for s in retile stringxref seeds-from-xref fingerprints vtable-scan ... check-artifacts; do grep -q flat.bin $p && echo NEEDS-IMAGE || echo no-image; done
NEEDS-IMAGE retile, stringxref, fingerprints, vtable-scan, immscan
no-image    seeds-from-xref, seeds-from-vtables, relabel-rtti, vtable-unknown, class-family, seeds-from-strings,
            vtable-class-consensus, classvote, callervote, callvote, callvote1, recompute (x2), report (x2)
            [and outside the block: form-classify needs the image, labels-summary / summarize / check-artifacts do not]
```

Neither entry document says which is which, and the two scripts that reproduce the two headline calibres with no image
at all (`independent-coverage.mjs`, `canonical-metric.mjs`) are never presented as "the no-image path": the former is
mentioned in passing at `METER.md:961` and `METER.md:1132`, the latter at `METER.md:1122`, both inside correction notes
about a different subject.

### 1.4 Check 3 — instructions that only make sense to the author

```
$ git ls-files tools | wc -l                                       -> 147
$ git ls-files tools | while read f; do grep -lq "G:/omp works" "$f" && echo x; done | wc -l  -> 113
$ grep -n "G:/omp works" README.md HANDOFF.md docs/PROGRESS.md docs/PUBLISH-READINESS.md docs/README.md METER.md
HANDOFF.md:4, HANDOFF.md:72, HANDOFF.md:73, HANDOFF.md:181
```

So 113 of the 147 tracked tool files carry the author's absolute workspace path. Concrete instances:

- `HANDOFF.md:4` — "仓库：`G:/omp works/MHGU` = **公开** https://github.com/Twelve-eight/MHGU … 不可发内容在本地私有仓
  `G:/omp works/MHGU-private`（永不推送）… 改写前备份 `G:/backups/MHGU-pre-filter-20261023{,.bundle}`."
- `HANDOFF.md:72-73` — "运行环境：`"G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe"`
  （系统 python 会挂）；node 用 `G:/omp works` 为 cwd。" (a retired venv inside a different project's archive)
- `HANDOFF.md:181` — the same venv repeated in the "report merge command".
- `HANDOFF.md:225-233` — §8 "子代理与模型路由经验": model names (`dsv-dev`, `glm-re`, `swe2`), 499 timeouts, prompt rules
  for sub-agents, "报告落 `.tmp/reports-mhgu/`". Meaningless outside the author's harness.
- `HANDOFF.md:235-246` — §9 "快速上手（**新会话**前 10 分钟)", i.e. instructions for the author's next agent session, not
  for a reader.
- `tools/audit/check.mjs:10` — `const ROOT = "G:/omp works/MHGU";` — the 12-gate checker cannot run from any other
  checkout. No `process.env` override exists for it (grep shows the only env read is `MHGU_DB` at `check.mjs:208`).
- `tools/mhgu/arm32.mjs:5` — `export const FLAT = process.env.FLAT || 'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';`
  That default file is **outside the repository** and does not exist after a clone. Verified: it exists only in the
  workspace scratch tree and is byte-identical to the repo-root copy —
  `ls -l "G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin"` → 25,472,632 B; `cmp` with
  `G:/omp works/MHGU/main.140.flat.bin` → SAME.
- `tools/mhgu/README.md:14` — the tool README admits it: "所有脚本默认读 `G:/omp works/...` 绝对路径；**换机请改脚本顶部的
  路径常量**。" So the documented way to run the tools on another machine is "edit the sources".
- `docs/README.md:62` — "语言文字规范（工作区 `../AGENTS.md` §5；**本 repo 不随附 AGENTS.md**）" — a rule cited from a
  file that is deliberately not shipped.
- `GOAL.md:15-16,20` (tracked, public) — a night-shift todo list naming `G:\suyu\`, process id 15592 and the export directory `G:\suyu\export\...`.
  It also carries "早上给用户" notes (and `DEVELOP.md:11` records the user's `G:\appdata\...` junction). Not linked from any entry doc, but present at the repo root.
- `docs/PUBLISH-READINESS.md:3,42-46` — the publish-readiness document is written as a personal plan: status "待补（**我能做**）"
  ("I can do"), executor column "子代理 + 主会话复核" ("sub-agent + main session review"). A reader learns the project
  is mid-flight from an internal planning artefact rather than from the README.

### 1.5 Check 4 — is there a stated entry order, and does it work today?

Four different orders are stated, in four places:

| Stated in | Order |
|---|---|
| `README.md:14` → `docs/README.md:3` | README → docs index → `PROGRESS.md` + `save-layout/coverage-map.md` |
| `HANDOFF.md:239-243` (§9) | `DEVLOG.md` last section → `METER.md` banner → **run `check.mjs`** → the recompute chain → pointer docs |
| `DEVLOG.md:1293` (the last line of the last section) | `LINK-STATUS.tsv` → `METER.md` → `HANDOFF.md` → DEVLOG |
| `METER.md:9-43` | the command block (no reading order at all) |

Following the only order that calls itself a quick start (`HANDOFF.md:235`):

1. **Step 1, "read the last section of `DEVLOG.md`"** — works. `DEVLOG.md` is 1,293 lines / 153 KB; the last section
   starts at `DEVLOG.md:1275` and is about six audit reports, three corrections and two lessons. Its closing line sends
   the reader to `LINK-STATUS.tsv` first, which sends them back to `HANDOFF.md` — a loop between two documents with no
   terminal "start here".
2. **Step 2, "read the `METER.md` banner and the 覆盖线（三次更正） section"** — works. `METER.md:1-6` gives the current
   calibre and the admission that 90% is not met; `METER.md:45` is the named section.
3. **Step 3, "run `node tools/audit/check.mjs` (12 gates, ~5 s), all green before touching anything"** — **breaks for
   every reader except the author.** Two independent reasons:
   - `check.mjs:10` hardcodes `G:/omp works/MHGU`, so a normal clone at any other path reads the author's tree or nothing;
   - gate 6 shells out to `verify-evidence.mjs`, whose line 12 is `fs.readFileSync(ROOT + "/main.140.flat.bin")` with no
     `existsSync` guard, so without a game image the process throws `ENOENT` before checking anything.

   The gates themselves are healthy when the image *is* present: I ran five of the twelve individually and all pass —
   gate 5 `check-artifacts.mjs` → `checked 24 evidence files, 46858 rows, 25786 distinct functions … PASS`;
   gate 6 `SAMPLE=100000 verify-evidence.mjs` → `22957/22957 = 100.0% … split 22957 checked + 4479 unverifiable + 2731
   unparsed = 30167`; gate 7 `verify-inferred.mjs` → `total 16844/16845 = 99.99%` (exit 0, threshold ≥99.5%);
   gate 8 `independent-coverage.mjs` → `66.19% … PASS`; gate 9 `canonical-metric.mjs` → `58.0%`.
   (Defaulting to `SAMPLE=120` without `check.mjs`'s `SAMPLE=100000` override makes gate 6 print
   `FAIL split: 1404 + 272 + 112 = 1788, but the enumerated files hold 30167 A rows` — the gate only works through the
   runner, which is itself another reason the runner matters.)
4. **Step 4, "run `recompute → report → function-labels → form-classify → labels-summary → summarize → check.mjs`"** —
   partially breaks: `form-classify` needs the image, `check.mjs` is the broken runner above, and `report.mjs` rewrites a
   tracked file (`report.mjs:422`), which no reader expects from a "verify" step.
5. **Step 5, the pointer docs** — all four exist and resolve: `docs/save-layout/coverage-map.md`,
   `docs/analysis/code/inventory/README.md`, `docs/data/README.md`, `docs/mechanics/monster-code-map.md`.
6. **Step 6, commit convention** (`git -c user.name=Twelve-eight …`) — author-only, harmless.

The other break is at the very first hop: `README.md:14` sends the reader to `docs/README.md`, whose title is
"MHGU **存档**逆向知识库 — 索引" (save-file knowledge base index) and whose body says the repo has "只有两份「真相源」：
`save-layout/` 与 `analysis/`". That index lists no `analysis/code/`, no `tools/`, no `METER.md` — yet
`docs/analysis/code` is the largest documentation cluster in the repo (66 of 231 tracked markdown files, versus 14 for
`docs/analysis/audit` and 8 for `docs/analysis/members`):

```
$ git ls-files '*.md' | cut -d/ -f1-3 | sort | uniq -c | sort -rn | head -4
66 docs/analysis/code
23 docs/analysis/external
14 docs/analysis/audit
12 docs/reference/formats
$ git ls-files tools | cut -d/ -f1-2 | sort -u
tools/audit  tools/gu-moves  tools/mcp  tools/mhgu  tools/wiki-gen
```

### 1.6 Check 5 — the five conventional sections

| Section | Present? | Evidence |
|---|---|---|
| Licence | **Yes, but ambiguous for data** | `README.md:19-23` (code GPL-3.0-or-later, docs CC BY 4.0), `LICENSE`, `docs/LICENSE`. The 25.9 MB of tracked TSV/CSV under `docs/analysis/code/inventory/` (largest tracked file: `function-labels.tsv`, 5,406,533 B) are neither "code and tools" nor obviously "documentation". Third-party-derived names are not attributed: `docs/mechanics/quests.md` is 734 lines with 9,105 CJK characters of wiki-derived quest titles, and no attribution block. |
| How to report errors | **No** | `grep -rni "report.*issue|open an issue|bug report|contribut|pull request" README.md docs/README.md docs/PROGRESS.md HANDOFF.md docs/PUBLISH-READINESS.md` → 0 hits, although the GitHub API reports `has_issues: true`. |
| What is out of scope | **No** | `grep -rni "out of scope|not in scope|非目标|不在范围|范围之外" README.md docs/*.md` → 0 hits. `README.md:8` states what is *not distributed*, which is a different claim. |
| How to reproduce if you own the game | **One line** | `README.md:9-10`. No extraction step (exefs from an NCA needs hactool and your own `prod.keys`; the repo never says so), no placement path, no build-id check. The only machine-checkable identity of the exact binary lives in `DEVELOP.md:19` and `patch/1.4.0.pchtxt:1` (`@nsobid-FB08F1D20FD1204FE7070672777F869B`) and is not reachable from the README. |
| What to read first | **Contradictory** | §1.5 above: four orders. |

**Data provenance is documented, but not at the entry.** `docs/data/README.md:3-4` names the two upstreams — `agroff/mhgu-quest-list`
(a Kiranico scraper) for the JSON tables, with an explicit warning that the upstream is a derivative compilation of Capcom data and
that distribution requires the user to obtain it themselves — and `docs/data/README.md:26` names `gatheringhallstudios/MHGenDatabase`
`mhgu_database_v2.4.0.apk` as the source of the 18 MB `mhgu.db`. `README.md` never mentions this file, the two upstream projects, or
that the authoritative numeric base is a third-party extraction; `docs/PUBLISH-READINESS.md:23` still lists "数据来源与许可" as an open item.

### 1.7 Repository mechanics a reader hits immediately

- 629 tracked files (`git ls-files | wc -l`).
- The working tree contains seven reparse points into the private tree — `editor-src`, `save-snapshots`,
  `docs/reference/mhxx-wiki`, `docs/data/viewer`, `docs/data/armor`, `docs/data/weapons`, `docs/analysis/dumps`
  (node `fs.lstatSync().isSymbolicLink()` on each → true). `ls -la` shows two of them as `editor-src -> G:\omp works\MHGU-private\editor-src`.
- `tools/mhgu/vendor/` (11 MB, 101 files) is present locally and ignored (`.gitignore:63`); `tools/mhgu/VENDOR-NOTICE.md:24-26`
  states that commits `f16e75f`…HEAD still contain the blobs and that they must be filtered out before the first push.
  Verified not yet public: `git ls-tree -r origin/master --name-only -- tools/mhgu/vendor | wc -l` → 0.
- `.git/objects/pack` holds 19 `.idx` and 4 `.pack`; git prints "no corresponding .pack" for the 15 orphans on
  `git count-objects`, while `git fsck --connectivity-only` prints nothing (no missing objects).

---

## 2. ACCEPTANCE — concrete gaps ranked by how much a stranger is blocked

Each line gives the file:line that should carry the information and one sentence of suggested content. P1 = the reader
cannot proceed; P2 = the reader proceeds on wrong assumptions; P3 = friction.

| # | Where | Suggested content (one sentence) |
|---|---|---|
| 1 | `README.md:3-10` | Add a two-line "What is established" block: "Proven: save member block `0x278..0x3783A` mapped 100% structurally; 58.0% of `.text` instructions carry a subsystem label under the project's own calibre (66.2% at ≥90% measured precision); the 90% goal is **not** met." — the honest state currently exists only in Chinese at `HANDOFF.md:21` / `PROGRESS.md:73`. |
| 2 | `README.md:12-17` | Add the missing rows for `docs/PROGRESS.md` (state and gaps), `docs/analysis/code/coverage/METER.md` (the only number authority), `HANDOFF.md`, `tools/audit/` and `forge/`/`editor/`. |
| 3 | `tools/audit/check.mjs:10` | Replace the absolute constant with `const ROOT = process.env.MHGU_ROOT || new URL("../..", import.meta.url).pathname`, so the advertised 12-gate check runs in any checkout. |
| 4 | `tools/mhgu/coverage/verify-evidence.mjs:12` | Guard the image read (`if (!fs.existsSync(...)) { console.log("SKIP: no image"); process.exit(0); }`) and let `check.mjs` report it as skipped rather than failed, or gate it behind `MHGU_REQUIRE_IMAGE=1`. |
| 5 | `METER.md:9-43` | Split the command block into "needs the image" and "runs from the tracked tables", and name `independent-coverage.mjs` + `canonical-metric.mjs` as the no-image verification of the two headline calibres. |
| 6 | `README.md:9-10` | Expand the one-line dump instruction: "you need the ExeFS `main` NSO0 extracted from your own NCA (hactool + your own `prod.keys`); confirm its build id is `FB08F1D20FD1204FE7070672777F869B`; write the output to `<repo>/main.140.flat.bin` (`verify-evidence.mjs` reads it there; `arm32.mjs` also accepts `FLAT=<path>`)". |
| 7 | `tools/mhgu/arm32.mjs:5` | Change the default to a repository-relative path (`new URL("../../main.140.flat.bin", import.meta.url)`) instead of `G:/omp works/.tmp/...`, which does not exist after a clone. |
| 8 | `docs/README.md:1-6` | Retitle from "存档逆向知识库" to the whole repository and add a row for `analysis/code` + `coverage/METER.md`; today the index routes a reader away from 66 of the 231 documents and from the project's only current metric. |
| 9 | `HANDOFF.md:235-246` | Add a separate "first ten minutes for a reader" list above the session hand-off list, and mark §9 as author-facing; steps 3 and 4 as written cannot be executed without the image and the author's filesystem. |
| 10 | `HANDOFF.md:4` | Move the local paths, the private-repository location and the pre-rewrite backup path into `docs/PRIVATE-DATA.md` (which already exists) and open with what the repository is; this sentence is the first thing on the only document that behaves like an entry point. |
| 11 | `README.md:19-23` | State which licence covers the derived tables under `docs/analysis/code/inventory/` and `docs/data/` (`*.tsv`, `*.csv.gz`) and add the attribution line for wiki-derived quest titles in `docs/mechanics/quests.md`. |
| 12 | `docs/PUBLISH-READINESS.md:1-3` | Mark the file as an internal plan in its first line (or move it under `docs/history/`); as written it is the document that admits the entry docs are unfinished, but it is itself unreadable to the audience it is about. |
| 13 | `docs/PROGRESS.md:23-24` | Mark 87.8% / 14.9% as "recompute requires the two private save snapshots (`system_CLEAN`, `v6-ready`); without them only the arithmetic on this line is checkable". |
| 14 | `docs/PUBLISH-READINESS.md:13` | Mark the db counts as "requires `docs/data/mhgu.db` (18 MB, not distributed)" and give the query, so a reader does not read absence as a claim. |
| 15 | `HANDOFF.md:24` / `docs/PUBLISH-READINESS.md:12` | Add the generator command and its image dependency next to "1,223 state rows / 9.7% named", which today has no command at the point of use. |
| 16 | `README.md:17` | Say how the patch is installed and that it matches exactly one build (`@nsobid-FB08F1D2…`, emulator `load/<title id>/<mod>/exefs/1.4.0.pchtxt`), and that it does not apply to the recompiled build. |
| 17 | `README.md:23` (after the licence block) | Add the two missing sections: "Out of scope" (no online play, no other game versions, no support promises) and "Reporting an error" (open an issue with the commit hash and the output of `canonical-metric.mjs`). |
| 18 | `docs/README.md:62` | Inline the language/fidelity rule instead of citing `../AGENTS.md`, which the document itself says is not shipped. |
| 19 | `README.md:12-17` (add a data row) | State where the numeric base came from: "`docs/data/mhgu.db` is a community extraction of Capcom's tables (`gatheringhallstudios/MHGenDatabase` v2.4.0, 1,355 quests / 21,153 items / 129 monsters) and is not distributed; `docs/data/README.md:3-4,26` records both upstreams and the redistribution condition." |

---

## 3. RISK — what would be (or already is) a problem if published, worst first

**R1 — PUBLIC — the repository names a specific pirated download path.**
`DEVELOP.md:8`: `| 游戏镜像 | I:\BaiduNetdiskDownload\MONSTER HUNTER GENERATIONS ULTIMATE][1.4.0].xci | 12.57 GB |`,
plus `DEVELOP.md:14`: `| prod.keys | yuzu/keys/prod.keys | hactool 可用 |`. Confirmed present in `origin/master`
(`git cat-file -e origin/master:DEVELOP.md` → yes; `git show origin/master:DEVELOP.md | sed -n '8p'` prints the line).
The file is not linked from the README, but it is tracked, public, and 45 KB of it is about obtaining and decrypting the
game. `README.md:8` says "You need your own legal dump" while a tracked document records a Baidu Netdisk copy of the
XCI. This is the one item that turns a technical disclosure into an acquisition disclosure, and it is already visible.

**R2 — PUBLIC — internal filesystem layout and the private repository's existence are on the front door.**
`HANDOFF.md:4` (the public snapshot says the repo is 公开 and names `G:/omp works/MHGU-private`, "永不推送") and
`HANDOFF.md:72-73,181` (a retired venv under another project's archive), `GOAL.md:15-16,20` (`G:\suyu\`, PID 15592,
`G:\suyu\export`). Disclosure risk is low, but it tells every reader where the unpublished data lives and that a second,
private repository exists — which is exactly the thing `docs/PRIVATE-DATA.md` says must not be inferable from the
public side.

**R3 — PUBLIC (README) / UNPUSHED (fix) — the advertised verification cannot be run by anyone but the author.**
`HANDOFF.md:241` instructs "run `node tools/audit/check.mjs` … all green before touching", `README.md:16` sells
`tools/mhgu/` as scripts, and `METER.md:9-43` gives a 20-command chain. None of it runs on a clean clone:
`check.mjs:10` is an absolute path and `verify-evidence.mjs:12` reads a gitignored 25 MB image. The result a stranger
gets is an `ENOENT`, which reads as "the repository does not work", on a repository whose headline claim is that its
numbers are reproducible.

**R4 — PUBLIC — the only honest statement of state is Chinese-only.**
The English front page (23 lines) describes capabilities; the admission that the 90% goal is not met is at
`HANDOFF.md:21`, `PROGRESS.md:73`, `METER.md:1-6`, all in Chinese, and `METER.md` alone is 21,730 CJK characters. A
reader without Chinese sees a finished toolkit and a `docs/` tree they cannot index; a reader with Chinese sees four
contradictory reading orders. Either way the project's most important qualifier is behind a language and a hop.

**R5 — PUBLIC — three headline numbers depend on data that is not distributed, and nothing says so.**
Save-side 87.8% / 14.9% (`PROGRESS.md:23-24`), 129/21,153/1,355 (`PUBLISH-READINESS.md:13`, needs the untracked 18 MB db)
and 1,223 state rows (`HANDOFF.md:24`, needs the image) are stated flat, with no "requires …" marker, next to numbers
that *are* reproducible. A reader who tries to check them hits an absence that looks like concealment rather than
licensing.

**R6 — UNPUSHED — 11 MB of third-party packages sit inside the 242 unpushed commits.**
`tools/mhgu/vendor/` is 11 MB / 101 files; `tools/mhgu/VENDOR-NOTICE.md:24-26` records that commits `f16e75f`…HEAD
contain them and that they must be filtered before the first push. They are not in `origin/master`
(`git ls-tree -r origin/master -- tools/mhgu/vendor | wc -l` → 0), so the exposure is one `git push` away and is
avoidable only by rewriting history first — which also invalidates the commit count that `VENDOR-NOTICE.md` uses as its
own evidence.

**R7 — PUBLIC — "no save files in this repository" is true of git and false of a copy of the directory.**
`README.md:8` promises no save files; the working tree delivers them through seven junctions into `MHGU-private`
(`save-snapshots`, `editor-src`, `docs/reference/mhxx-wiki`, `docs/data/{viewer,armor,weapons}`, `docs/analysis/dumps`).
Anyone who zips the checkout, or runs a naive backup, ships personal saves and third-party wiki content. `.gitignore`
protects only the commit path.

**R8 — LOW — the git object store has 15 orphaned pack indexes.**
`ls .git/objects/pack | sed 's/.*\.//' | sort | uniq -c` → 19 `idx`, 4 `pack`, 1 `multi-pack-index`, 4 `rev`;
`git count-objects -vH` warns "no corresponding .pack" fifteen times while `git fsck --connectivity-only` is silent.
No data is missing today; a `git gc`/`repack` would drop the orphans, and whether `git push` of 242 commits from this
store completes is untested.

---

## 4. UNKNOWN — what cannot be determined from inside this repository

- **Whether `node tools/audit/check.mjs` currently prints ALL PASS.** I ran five of its twelve gates directly — 5, 6, 7,
  8, 9 — and all pass (`check-artifacts` PASS; `verify-evidence` 22,957/22,957 with `SAMPLE=100000`; `verify-inferred`
  16,844/16,845 = 99.99%, exit 0 against a ≥99.5% threshold; `independent-coverage` 66.19% PASS; `canonical-metric`
  58.0%). Gates 1-4, 10-12 were not run because they execute inside `check.mjs` and gate 4 rewrites the tracked
  `docs/analysis/code/inventory/coverage-report.tsv`, which a read-only audit must not do.
- **Whether the 242 unpushed commits are meant to be published as they stand.** `origin/master` is an ancestor, so a
  plain `git push` publishes all of them, including `tools/mhgu/vendor`.
- **Whether the save-side numbers are right.** `226,754`, `950,374`, `1,177,760` come from
  `MHGU-private/save-snapshots/...`, which is not readable from this repository and must not be.
- **Whether `hactool`/`prod.keys` extraction is documented anywhere a reader can find it.** `grep -rn "hactool" docs/ README.md HANDOFF.md`
  finds it only inside audit/history/mechanics pages, never as an instruction.
- **What the wiki content's licence is.** `docs/reference/mhxx-wiki` is a junction to the private tree, so the tracked
  CC BY 4.0 claim in `README.md:21` covers text that itself quotes third-party material — not verifiable from here.

---

## 5. Difficulties

- **The write device refuses paths inside the working tree**, as the main session warned; this report was written to
  `local://PUBLISH-ENTRY-DOCS.md` and must be copied to `docs/analysis/audit/PUBLISH-ENTRY-DOCS.md` by the main session.
- **Could not produce an empirical no-image failure** by deleting or moving `main.140.flat.bin` (read-only mandate).
  Proved instead by three independent facts: the file is absent from `git ls-files`, it is listed at `.gitignore:50`, and
  `verify-evidence.mjs:12` calls `readFileSync` on it with no existence guard.
- **Could not run `check.mjs` end to end** for the same reason (`report.mjs:422` writes a tracked file). Verified its
  gates individually and stated exactly which ones.
- **`cut -c` on the Chinese columns produces mojibake** in shell output (the files themselves are fine — the `read` tool
  shows them correctly); two early line samples had to be re-read with `sed`/`read` instead.
- **Cost**: about 35 read-only commands, most of the time spent proving "needs the image or not" per script rather than
  reading prose; the five target documents total 1,596 lines, of which `METER.md` is 1,162 and has to be read as a
  changelog to find the current state.
