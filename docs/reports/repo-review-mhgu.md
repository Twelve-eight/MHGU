# Repository review — public repo `Twelve-eight/MHGU`

Read-only review of `G:/omp works/MHGU` (branch `master`, `HEAD` = `cb00576c0844806f3bc437ef419cdf5f78886f9c`, 850 commits,
2026-10-22 … 2026-11-09). 741 tracked files. `.git` = 19.75 MiB packed / 22 MB on disk.

`git ls-remote --heads --tags origin` (2026-11-10) returns `cb00576…` for `refs/heads/master` and `711d3b4…` for
`refs/tags/rollback-20261105-0901`, i.e. the local branch is byte-identical to the live GitHub branch and the local
`origin/master` is not stale. Everything below about "published" therefore refers to the state a stranger gets today.

Rules applied: `AGENTS.md` §7b (public repos hold own work only; game binaries/extracts, saves, keys and third-party
dumps live in `*-private`) and §2h (the four terms that must not appear in newly authored model-facing text).

**Out of scope by construction:** the working tree's unstaged state (33 untracked paths plus 5 modified tracked files
before this review, including `sessions/S-G/` with 9 reports and `docs/data/gu-*.tsv`), and `MHGU-private/`. Where an
untracked path matters as a *risk* it is listed under F9 with that caveat.

---

## Findings, most severe first

### F1 — HIGH — Third-party vendored packages are inside the published branch's history, and three documents state they are not

`tools/mhgu/vendor/` (101 files of `ogg-opus-decoder`, `opus-decoder`, `@wasm-audio-decoders/common`, `codec-parser`,
`simple-yenc`, `@eshaz/web-worker`, all MIT) was added in `f16e75f` (2026-11-03) and deleted from the index in `cf03eeb`.
Deleting it from the index did not remove it from history, and history is public:

```
$ git merge-base --is-ancestor f16e75f origin/master   # exit 0 -> yes, ancestor
$ git rev-list origin/master --objects | grep -c 'tools/mhgu/vendor'      -> 113 objects
$ git log origin/master --name-only --pretty=format: -- tools/mhgu/vendor | sort -u | grep -c .   -> 101 files
$ git ls-tree -r --name-only origin/master | grep -c 'tools/mhgu/vendor'  -> 0   (tree is clean; history is not)
```

Largest blob: `tools/mhgu/vendor/node_modules/ogg-opus-decoder/dist/ogg-opus-decoder.opus-ml.min.js.map`,
5,607,635 B (`git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sort -k3 -rn`).

Three documents and one commit message contradict that measurement:

* `tools/mhgu/VENDOR-NOTICE.md:25-27` — quote (verbatim): "Commits `f16e75f`…`HEAD` (26 unpushed commits as of
  2026-11-03) still contain the vendor blobs in their trees. Nothing has been pushed since they were added, so no
  public exposure happened."
* commit `cf03eeb` message — "The blobs remain in the 26 unpushed commits; nothing has been pushed since they were
  added".
* `README.md:65-66` — "`tools/mhgu/vendor/` (101 MIT files) sits in unpushed history; either add a NOTICE with
  attribution or rewrite those commits before the next push".
* `docs/PUBLISH-READINESS.md:11` — checks only the *tree* (`git ls-tree -r origin/master` is indeed empty for these
  paths) and concludes "所以"把不该发的发出去"这件事，就这几类而言没有发生"; line 15 of the same file still calls them
  "未推送的 242 个提交" although line 7 of the same file says the push already happened.

Impact: the MIT text itself is redistributable, so this is not a licence breach; it is (a) a violation of the repo's own
"own work only" rule, (b) irreversible without a history rewrite, and (c) a false assurance that a future session will
rely on to skip the `git filter-repo` step the notice prescribes. `cf03eeb` also records the mechanism that caused it
("swept in by a broad git add"), which is the same mechanism still one `git add -A` away from repeating on the untracked
paths in F9.

### F2 — HIGH — Retail game data is republished in tracked wiki/mechanics pages, against the repo's own private-data rule

`docs/wiki/*.md` (47 pages) carries **19,841** table lines and `docs/mechanics/*.md` (9 pages) a further **4,110**
(`awk 'FNR==1{f++} /^\|/{n++} END{print f, n}' docs/wiki/*.md`). Two pages state their provenance outright:

* `docs/wiki/hitzones-all-a.md:4` — quote: "数值直接读自 romfs `arc/enemy/emNNN_NN.arc :: enemy\dt_tune\emNNN_NN_dttune`
  的字节" — i.e. the hitzone percentages in the page are byte reads from the retail ROM, table-complete for slots 0–46.
* `docs/wiki/monster-drops.md:7` — the page publishes per-channel drop percentages for the whole database: quote
  "全库 2,032 个（怪物, 档位, 通道）分组中 2,030 个合计恰为 100%".

The same data is deliberately kept private in machine-readable form: `.gitignore` blocks `docs/data/mhgu.db`,
`docs/data/json/*` (25 of 28 files) and `docs/data/{armor,weapons,viewer}/`; `docs/PRIVATE-DATA.md:8-25` gives the reason
as "Capcom 数据衍生汇编（MHGenDatabase / Kiranico 爬取）"; `docs/data/README.md:3-4` says the upstream compilation is
"属卡普空游戏数据的衍生汇编；仓库自用/参考可，正式分发需用户自行获取".

Related tracked derived extracts of the retail executable, same question, smaller volume:
`docs/analysis/code/inventory/function-labels.tsv` (5.2 MB, 40,374 rows of function start / instruction count / class
label / provenance — `sed -n '1,2p'` shows the header `start insns label provenance reason`) and
`docs/data/functions-retile.csv.gz` + `docs/data/functions.csv.gz` (52,692 function ranges, call edges and a `strings`
column; verified by decompressing: 52,692 data rows, 5,228,277 instructions).

This is a decision for the owner, not a mechanical fix: the pages are also the repo's most useful artefact, and the
counter-argument (numbers re-derived by us, prose authored by us) is real. But by the letter of §7b and of
`docs/PRIVATE-DATA.md` these are extracts of retail data in a public repo, and their volume is two orders of magnitude
larger than anything the private-data table currently guards. Note that no existing audit covers this surface:
`docs/analysis/audit/PUBLISH-REPO-HYGIENE.md` audits `docs/data/**` but never mentions `docs/wiki/`.

### F3 — MEDIUM — Personal save content (hunter names) in tracked text

The repository's own audit classifies save-file player names as personal data
(`docs/analysis/audit/PUBLISH-REPO-HYGIENE.md:136`, row "**save-file player names**"). Both names are still in
`HEAD`:

```
$ grep -rn 'HUNTER_A' --include=*.md --include=*.tsv --include=*.txt . | wc -l   -> 38 line hits
$ grep -rn 'HUNTER_B' --include=*.md --include=*.tsv --include=*.txt . | wc -l   -> 29 line hits
$ git grep -l -E 'HUNTER_A|HUNTER_B' HEAD | wc -l                              -> 16 tracked files
```
(names replaced by placeholders here on purpose: naming them in this report would publish them again)

Files include `docs/editor-spec/02-items-equipment.md`, `docs/save-layout/coverage-map.md`,
`docs/analysis/audit/{LINK-SAVE-SIDE.md,MECHANICS-FINDINGS.md,MECHANICS.tsv,REST.tsv,ROUND1-ALL.tsv,REST-FIXES.tsv,
LINK-STATUS.tsv,W3-CITATIONS.md,W6-ROOTDOCS.md,PUBLISH-REPO-HYGIENE.md,PUBLISH-TOOL-DEPS.md,LINK2-EDITOR-SPEC.md}`,
`DEVLOG.md`, `docs/PUBLISH-READINESS.md`.

Severity is deliberately medium: a hunter name is not a key and does not identify the person, but it is content read out
of the user's own save, and §7b keeps saves private. Replacing them with `HUNTER_A`/`HUNTER_B` costs one pass and
removes the whole class.

### F4 — MEDIUM — Publication-status numbers in the entry documents contradict git

```
$ git rev-list --count origin/master..HEAD     -> 0
$ git status -sb | head -1                     -> ## master...origin/master
```

* `README.md:74-75` — "The public branch lags the working tree by several hundred commits" (0 commits ahead).
* `README.md:65-66` — vendor in "unpushed history" (F1).
* `docs/PUBLISH-READINESS.md:15` — vendor "在未推送的 242 个提交里" while `:7` of the same file already says the push
  happened; `:11` concludes from a tree-only check that nothing was leaked.

Not a finding (checked and correct): `docs/PUBLISH-READINESS.md:7`'s "公开树 664 个文件" matches commit `06c5e8843944`
(2026-11-04, exactly 664 files, found by walking every commit in 2026-11-02..11-06) — it is a dated snapshot, not an
error. The published tree is 741 files today.

Impact: these are the sentences a fresh session reads before deciding whether it may push, and all three are wrong in the
direction that makes a push look safer than it is.

### F5 — MEDIUM — §2h wording: the public one-line description and one tracked filename still use the listed terms

`README.md:3` (verbatim): `Reverse-engineering notes and tools for **Monster Hunter Generations Ultimate (Switch, v1.4.0)**:`
— and `docs/PUBLISH-READINESS.md:9` records that this same string is the live GitHub page title
(`curl https://github.com/Twelve-eight/MHGU` → 页面标题为 "MHGU (Switch 1.4.0) reverse-engineering notes, tools, save
layout, patches"). §2h forbids that framing for the work itself; this is the first line a stranger and every model read.

Also still using the listed vocabulary in newly added material (post-2026-11-01 commits):
`docs/analysis/external/forge-pc-and-porting-precedents.md` (the file name itself, tracked),
`tools/audit/ai-reach-misses.mjs:7` ("this tool is its reproduction", added 2026-11-09),
`docs/patches/item-box-v7-plugin-spec.md:399`.

Counts from a full-tree scan of the four §2h terms with word boundaries (`\b(reverse[- ]engineer(ing|ed|s)?|porting|remake|reproduction)\b`):
27 tracked files contain at least one, 20 of them added on/after 2026-11-01. Most are the harmless technical sense of
"reproduction" ("the command that reproduces this number") and several are quotations of the GitHub tagline inside audit
reports; the two that matter are `README.md:3` and the file name. Legacy directory names (`docs/analysis/re/`) are
allowed by §2h and were not counted as violations.

### F6 — MEDIUM-LOW — The yuzu profile / save-container id survived the remediation that was supposed to remove it

`DEVELOP.md` was placeholder-ed in `9a05cdb` for exactly this reason, but the same 32-hex identifier is still in `HEAD`
in three files that quote it:

```
$ git grep -n -i '85A7D07F6ED7C1D6F6045DE67FE969F1' HEAD
HEAD:docs/PUBLISH-READINESS.md:13
HEAD:docs/analysis/audit/PUBLISH-REPO-HYGIENE.md:131
HEAD:docs/analysis/audit/W3-ENTRY-DOCS.md:354
```

`docs/PUBLISH-READINESS.md:13` itself calls this "已经公开的问题" that "无法通过改 HEAD 撤回" — yet it stays in `HEAD`,
and the audit doc reproduces it verbatim in its "personal / machine identifiers" table instead of abbreviating it.
It is in history from the `5ec46c8` snapshot (2026-10-22) and every later edit of it is its own commit —
`git log --all -S'85A7D07F6ED7C1D6F6045DE67FE969F1'` → `6599b08`, `9a05cdb`, `cec4388`, `56608c9`, `5ec46c8` — which is
unavoidable now; leaving it at `HEAD` as well is not.

### F7 — LOW — The tool-inventory number is 23% stale, so the reproducibility table under-covers its own tree

`docs/analysis/audit/PUBLISH-TOOL-DEPS.md:6,11,43` — "Scope … (138 scripts)" / "the complete listings, 138 files"; and
`README.md:62` repeats "about 140 scripts; the dependency table classifies 138 of them".

```
$ git ls-files 'tools/**' | grep -cE '\.(mjs|py)$'  -> 179
$ git ls-files '*.mjs' '*.py' '*.c' '*.h' '*.bat' | wc -l -> 197 code files in total
```

41 scripts have no input/output row, and the claim "138 of them" is presented next to a per-category breakdown that sums
to 138. Since the table is the repo's answer to "can a stranger run this", the gap is the reproducibility claim itself.
Related and measurable: 129 of 197 tracked code files hardcode `G:/omp works`
(`git grep -l 'omp works' HEAD -- '*.mjs' '*.py' '*.c' '*.h' '*.bat' | wc -l` → 129), so most tools still cannot run on
a clone even though `README`'s three entry commands can (`9a05cdb`).

### F8 — LOW — `docs/wiki/README.md` points at data files it calls "the repository copy", which a clone does not have

* `docs/wiki/README.md:124` — "仓库副本 `docs/data/json/monster-names-chs.json`"
* `docs/wiki/README.md:237` — "逐怪偏移见 `docs/data/json/monster-dttune-index.json`（已产出）"

Only three files are tracked under `docs/data/json/` (`git ls-files docs/data/json` → `README.md`,
`monster-slot-map.json`, `monster-slot-map-137.json`). Both cited files do exist in this working tree, but the other 25 of
28 are `.gitignore`d and `docs/PRIVATE-DATA.md` describes that directory as hard links into `MHGU-private`, so a clone
has neither. Both sentences read as "this is in the repo", which is the opposite of the policy they are there to enforce.

### F9 — LOW — Hygiene sweep (each item independently verified)

| item | evidence | command |
|---|---|---|
| 8 tracked scratch tools referenced by no other tracked file | `tools/audit/{arm32-diff-check,ba47,cluster75,saveframes,sub505-census,sub518-census,sub5a8-base,vt9b40}.mjs` | per-file grep over every tracked text blob; positive control: `canonical-metric` matched 28 files |
| 0-byte tracked file | `docs/analysis/code/tierB3p` (`git cat-file -s` → 0) | shell-redirect debris, still in the tree |
| 20 orphan pack indexes + 20 garbage objects | 23 `.idx` for 3 `.pack`; `git count-objects -vH` prints 20 `no corresponding .pack` warnings, `garbage: 20`, `size-garbage: 385.92 KiB` | residue of the 2026-10-23 rewrite; `git gc` clears it |
| `LICENSE` and `docs/LICENSE` are not the same text although `README.md:164` says "the same text is repeated in `docs/LICENSE`" | `diff LICENSE docs/LICENSE` → 21 lines replaced by 29, the second adds a documentation paragraph | small, but the licence is the one place where "approximately the same" is not fine |
| 4 duplicate-blob groups | `forge/{boxprobe,dbgport,itembox-v7}/.gitignore` (3 identical); `docs/analysis/code/inventory/member-offsets-refn.tsv` = `docs/data/member-offsets.tsv`; `attr-ctor-vtable.tsv` = `attr-vtable-classblock.tsv`; `spread-acc-sel.tsv` = `spread-accuracy-random.tsv` | `git ls-tree -r HEAD \| awk '{print $3,$4}' \| sort` grouped by blob sha |
| untracked, **not** ignored, one `git add -A` from publication | `sessions/S-G/` (9 agent reports, ~230 KB) and `docs/data/gu-*.tsv` (7 files: attack rows, hit shapes, forced-cell motions) | `git check-ignore -q sessions/S-G/Q23-report.md` → exit 1; same for `docs/data/gu-hit-shapes-em007.tsv`; `git add -An` stages 39 paths today (38 pre-existing + this report) |
| 10 tracked docs referenced by no other tracked file | 8 audit reports (`LINK-SINGLE-MENTION`, `LINK2-EDITOR-SPEC`, `LINK2-MECH-PARAMS`, `LINK2-SAVE-IO`, `W3-CITATIONS`, `W3-SAVE-IO`, `W4-FIELDS`, `W5-CLOSEOUT`) plus `docs/analysis/re/React24-reports/react24.md` and `docs/reference/emc-script-vm.md` | per-file `git grep -l <stem> HEAD` with self excluded, over all 302 tracked `.md`; three others that the first pass flagged do have exactly one referrer (`LINK2-MEMBERS`, `W6-EXTERNAL`, `W6-ROOTDOCS`) |
| history bloat | 224.0 MB of blob bytes over 2,428 blobs; `docs/analysis/code/inventory/function-labels.tsv` accounts for 53.35 MB across its 10 revisions, `tiers-recomputed.csv` 30.41 MB, `DEVLOG.md` 15.04 MB | per-path sum of blob sizes reachable from all refs |
| no build outputs, caches or editor backups tracked | `git ls-files \| grep -E '\.(log\|bak\|orig\|rej\|swp\|tmp)$\|~$\|\.DS_Store\|Thumbs\.db'` → empty | `forge/*/dist` DLLs are untracked and covered by per-mod `.gitignore` |

The `sessions/` row is the one worth acting on: `cf03eeb`'s own message says the vendor leak came from a broad `git add`,
and `sessions/` is the same shape of hazard (model-authored reports, not reviewed, not ignored).

---

## No problem found

* **No game binaries or extracts ever committed.** `git rev-list --objects --all` over all 850 commits contains no
  `.arc .pak .pfb .mot* .rcol .tex .exe .dll .nso .nca .xci .nsp .sav .bin .dat .gmd .mrl3 .efx .sdl .wav .ogg .png
  .zip` path (empty result). The 3 tracked `.gz` files are gzip-compressed TSV/CSV; each decompresses cleanly
  (`docs/data/functions*.csv.gz` → `start,end,insns,callers,callees,strings` header, 52,692 rows).
* **No private path was ever committed.** `git rev-list --objects --all | grep -cE 'flat\.bin|mhgu\.db|save-snapshots|
  mhxx-wiki|editor-src|analysis/dumps|\.hnt$|prod\.keys|title\.keys'` → **0**. The 2026-10-23 history rewrite holds.
* **No key material.** No AES-looking 128/192/256-bit hex anywhere; the 64-hex hits are SHA-256 of release artefacts
  (`docs/analysis/external/suyu-release-check.md:15-22`) and of the image (`a8cfb114…`, in `tools/audit/saveframes.mjs:35`,
  `tools/audit/sub5a8-base.mjs:26`). `prod.keys` appears only as a *path* string, never as content. No `ticket`,
  `key_area_key`, `title.keys`, `prod.keys` payload.
* **No credentials or tokens.** `ghp_`, `sk-…`, `AKIA…`, `Bearer …`, `api_key=` → 0 hits. Commit author on every commit
  is `Twelve-eight <Twelve-eight@users.noreply.github.com>`; one tag, a plain commit object.
* **No bulk raw disassembly.** The largest raw-listing excerpt in any tracked file is 138 lines
  (`docs/analysis/save-io/write-side-desc.md`); next 83, 67, 61. `docs/analysis/dumps/` (which
  `docs/PRIVATE-DATA.md` reserves for bulk dumps) has never been tracked.
* **No duplicated directories.** The three slice trees (`tierb-pass1/2/3`, `inventory/slices/{reports-mhgu,w6-pass12,…}`)
  were diffed at the same file names — the files differ, so this is revision history, not copy-paste duplication.
* **The experimental patch is honestly labelled.** `patch/experimental-v8/1.4.0.pchtxt` is a different layout from
  `patch/1.4.0.pchtxt` (`diff` → 137 lines) and `patch/INSTALL.md` marks it "**未运行验证**". No overclaim there.
* **The headline calibres reproduce from tracked inputs.** `docs/data/functions-retile.csv.gz` gives exactly 52,692
  functions and 5,228,277 instructions, matching `README.md:88`, so the "no image needed" number is real.
* `.gitignore` is effective for the paths it names: `git check-ignore -q` returns 0 for `save-snapshots/`,
  `main.140.flat.bin`, `docs/reference/mhxx-wiki/cat.html`, `editor-src/bin/`, `dist/`.

---

## Difficulties

* **`/dev/null` does not exist in this shell.** Every `cmd 2>/dev/null` failed with
  `bash: line 1: /dev/null: 系统找不到指定的路径`, which silently changed pipelines built on it. Worked around by dropping
  the redirect everywhere; a reader of the commands above should note that no `2>/dev/null` was used. Cost: one wasted
  round at the start, plus one silently empty result (`ls .git/objects/pack/*.idx | wc -l` printed 0 while 23 indexes
  existed) that had to be re-derived with `ls | grep -c`.
* **`file(1)` is not installed** (`G:\Git\usr\bin\file: not found`), and there is no `python` on `PATH`
  (`python -c …` → exit 9009). Binary-vs-text had to be decided by scanning every blob for NUL bytes and UTF-8
  validity, and all aggregation was written as Node scripts in `G:/tmp/repo-review-mhgu/` (`scan.mjs`, `abspaths.mjs`,
  `churn.mjs`, `keys.mjs`, `wording.mjs`, `orphans.mjs`, `refs.mjs`, `disasm.mjs`, `treesize.mjs`).
* **A detector that returns "everything" is as broken as one that returns "nothing".** First run of the doc-reference
  checker reported 271 of 281 backticked paths "missing", because docs reference bare basenames
  (`canonical-metric.mjs`) rather than repo-relative paths; after adding suffix matching the count fell to 51 and most of
  those are legitimate (ellipses such as `...-review.md`, gitignored data such as `mhgu.db`, paths outside the repo such
  as `AGENTS.md`). The sweep was therefore not used as a finding — the drift claims in F4/F7 come from numbers that can
  be checked exactly.
* **Running the repo's own gate would have violated "nothing else may be modified".** `tools/audit/check.mjs` shells out
  to `tools/mhgu/coverage/report.mjs` and `check-artifacts.mjs`, which regenerate tracked tables; with `main.140.flat.bin`
  absent, gate 6 would also fail for the wrong reason. So "12 gates ALL PASS" (`README.md` §"Which numbers need the game
  image") is reported as **not independently verified here**, not as either true or false. A static count of the gate
  sequence in `check.mjs` was attempted and abandoned: the file is 270 lines of sequential `try` blocks with no single
  gate array to count, so any number I quoted would have been invented.
* **"Is it published?" needs a network fact, not a local one.** The local `origin/master` could have been stale after a
  force-push. Resolved with `git ls-remote` (read-only) rather than trusting the tracking ref; this is what makes F1 a
  finding instead of an inference.
* **The shell locale mangles CJK text.** `sed -n '1,3p;$p' docs/PRIVATE-DATA.md` died with
  `sed: stream did not contain valid UTF-8` on a file that `read` renders correctly and that round-trips through
  `Buffer.toString("utf8")` byte-for-byte (my per-blob UTF-8 check flagged only the three `.gz` files). `grep` and `awk`
  handled the same file fine, so CJK-containing files were inspected with `grep -n`/`read` and never with `sed`/`cut -c`.
* **Not covered, by scope:** the working tree's unstaged state (33 untracked paths + 5 modified tracked files, measured
  before this report existed), `MHGU-private/`, and `G:/mhgu-romfs/` outside the repo. The untracked `sessions/` and
  `docs/data/gu-*.tsv` are listed in F9 as risk, with that caveat stated inline.
