# Repository hygiene audit — harvested from the agent's local:// report, 2026-11-04.

Note from the main session: the agent had no shell, so its git commands are quoted statements, not executions. Verify each before acting.

# PUBLISH-REPO-HYGIENE — what is large / binary / third-party / personal in `G:/omp works/MHGU`

Generated 2026-11-04 for publish-readiness. Read-only audit; no repo file was changed.

## Method / caveat (read this first)

No shell tool was mounted in this session (only `read`, `grep`, `glob`, and the report writer), so **no `git` command was actually executed**.
Every git command below is the command that *would* show the fact; the evidence column states what was actually
observed instead. Root causes are listed under **Difficulties**.

Evidence actually used:
- working tree and sizes: directory listings via `read` (they print byte sizes);
- tracked set: raw dump of `.git/index` (`read .git/index:raw`) — path text is readable in situ;
- history: `.git/logs/HEAD` (reflog, full commit chain), `.git/objects/**` listings, `.git/objects/pack` sizes,
  `.git/filter-repo/*`, `.git/packed-refs`, refs;
- project's own statements: `DEVLOG.md`, `HANDOFF.md`, `docs/PRIVATE-DATA.md`, `tools/mhgu/VENDOR-NOTICE.md`,
  `README.md`.

---

## FACTS — what is there

### 1. Files ≥ 1 MB

Tracked status: "index" = the path text was seen inside the `.git/index` dump; "ignored" = covered by `.gitignore`
(note: `.gitignore` does **not** untrack an already-tracked file, so these columns are independent).

| path | size | tracked? | why it matters | command that shows it |
|---|---:|---|---|---|
| `main.140.flat.bin` | 24.3 MB | no (ignored; removed from history per `DEVLOG.md:452`) | Capcom executable image (`.text/.rodata/.data` of MHGU 1.4.0), **not distributable**; hardlink to `G:/omp works/MHGU-private/main.140.flat.bin` (`docs/PRIVATE-DATA.md:8`) | `git check-ignore -v main.140.flat.bin` → `.gitignore:7` (also `:50`); `git ls-files -s main.140.flat.bin` → empty |
| `docs/data/mhgu.db` | 17.5 MB | no (ignored) | third-party SQLite compilation of Capcom game data (MHGenDatabase APK extract, `docs/data/README.md:26-30`) | `git check-ignore -v docs/data/mhgu.db` → `.gitignore:51`; already recorded in `docs/analysis/audit/REST.tsv:21` |
| `.tmp/bb3/callidx.json` | 17.5 MB | no (ignored) | session scratch, a call index over every function (regenerable) | `git check-ignore -v .tmp/bb3/callidx.json` → `.gitignore:66` |
| `docs/data/json/items.json` | 15.9 MB | no (ignored) | 21,153-row item table from the Capcom-data compilation | `git check-ignore -v docs/data/json/items.json` → `.gitignore:35` |
| `docs/data/json/weapons.json` | 6.8 MB | no | 10,877-row weapon table (same provenance) | as above |
| `docs/analysis/code/inventory/function-labels.tsv` | 5.2 MB | **yes (index)** | generated per-function label dump over the game image (addresses + class names); heavy, and a derived extract of the binary | `git ls-files -s docs/analysis/code/inventory/function-labels.tsv`; rows: 40,374 (`docs/PUBLISH-READINESS.md:12`) |
| `docs/data/json/quest_rewards.json` | 4.1 MB | no | 37,370-row reward table (same provenance) | `git check-ignore -v ...` |
| `docs/data/json/gathering.json` | 2.7 MB | no | 15,414-row gathering table | as above |
| `docs/data/json/quests.json` | 2.6 MB | no | 1,355-row quest table | as above |
| `docs/analysis/code/inventory/function-forms.tsv` | 2.6 MB | **yes (index)** | generated instruction-form census | `git ls-files -s ...` |
| `docs/analysis/code/inventory/attr-vtable-retile.tsv` | 1.9 MB | **yes (index)** | generated vtable attribution dump | `git ls-files -s ...` |
| `.tmp/bb3/bak/tiers-recomputed.csv` | 1.7 MB | no (ignored) | backup copy of a generated tier table | `git check-ignore -v .tmp/...` |
| `docs/analysis/code/inventory/attr-callvote-8rounds.tsv` | 1.7 MB | **yes (index)** | generated vote-cascade output | `git ls-files -s ...` |
| `docs/analysis/code/inventory/tiers-recomputed.csv` | 1.7 MB | **yes (index)** | generated tier spine | `git ls-files -s ...` |
| `docs/analysis/code/inventory/tiers-merged.csv` | 1.5 MB | **yes (index)** | generated tier merge | `git ls-files -s ...` |
| `docs/data/json/armor.json` | 1.2 MB | no | 5,637-row armor table | as above |
| `docs/analysis/code/inventory/attr-callvote1.tsv` | 1.0 MB | **yes (index)** | generated vote output | `git ls-files -s ...` |

Tracked binaries just under 1 MB (all seen in the index): `docs/data/functions-retile.csv.gz` (832.3 KB),
`docs/data/functions.csv.gz` (468.1 KB), `docs/data/json/monster-slot-map.json` (25.9 KB) and
`monster-slot-map-137.json` (20.4 KB — the two deliberate exceptions to the `docs/data/json/*` rule).

> Split: ~20 MB of the ≥1 MB set is **tracked generated output** (`docs/analysis/code/inventory/**`,
> `docs/data/*.csv.gz`); ~64 MB is **ignored but physically inside the working tree**
> (24.3 game image + 17.5 db + 15.9 + 6.8 + 4.1 + 2.7 + 2.6 + 1.2 + 1.7 MB).

### 2. Ignored paths that exist in the working tree (junctions/hardlinks to the private repo)

| path | listing shows | real content | why it matters | command |
|---|---|---|---|---|
| `save-snapshots/` | `0B` (reparse point) | junction → `MHGU-private/save-snapshots`; 4 `.hnt` (1,177,760 B each) + `system` / `system_backup` (5,159,100 B) per `DEVELOP.md:12` | personal game saves | `git check-ignore -v save-snapshots`; `powershell Get-Item save-snapshots \| fl LinkType,Target` (recorded in `REST.tsv:20`) |
| `docs/reference/mhxx-wiki/` | `0B` | junction; ≈581 files (`text/` ≈290, `data/` ≈285, `ida/` 5, `INDEX.md`; largest `data/2882.html` 522.7 KB) | third-party wiki HTML/text, **not our work** | `git check-ignore -v docs/reference/mhxx-wiki`; `find docs/reference/mhxx-wiki -type f \| wc -l` → ≈581 |
| `docs/data/armor/`, `docs/data/weapons/`, `docs/data/viewer/` | `0B` | junctions to private | Capcom-derived tables | `git check-ignore -v docs/data/armor` |
| `editor-src/` | `0B` | junction; decompiled third-party save editor — `docs/PRIVATE-DATA.md:11`: "原作者未授权开源" (author never open-sourced it) | **third-party code with no licence** — the worst thing to publish after the game image | `git check-ignore -v editor-src` |
| `docs/analysis/dumps/` | `0B` | junction; raw disassembly dumps | bulk derivative of the executable | `git check-ignore -v docs/analysis/dumps` |
| `docs/data/json/*` (25 of 28 files) | up to 15.9 MB | ignored except `README.md` + two slot maps (`.gitignore:58-60`) | see table 1 | `git check-ignore -v docs/data/json/items.json` → `.gitignore:35` |
| `docs/data/{quests,skills,skillMeta,decorations,hammer,weapons}.json` | ≈1.9 MB total (`hammer.json` 694.8 KB) | ignored, present | Capcom-derived | `git check-ignore -v docs/data/hammer.json` → `.gitignore:56` |
| `tools/mhgu/vendor/` | `opus-decoder.tgz` 138.9 KB + unpacked `opus-decoder/package`, `common/package` | ignored, present | third-party npm code (MIT), see §3 | `git check-ignore -v tools/mhgu/vendor` → `.gitignore:63` |
| `.tmp/` | 17.5 MB + scripts | ignored, present | scratch; holds a whole per-function call index | `git check-ignore -v .tmp/` → `.gitignore:66` |
| `forge/{dbgport,itembox-v7,boxprobe}/dist/.../*.dll` | 3 DLLs | untracked; ignored by per-mod `.gitignore` (`build/`, `dist/`) | compiled binaries in the tree; one `git add -A` away from being committed | `git check-ignore -v forge/dbgport/dist/mods/0100770008DD8000/DbgPort/plugins/dbgport.dll` |

`.gitignore` patterns that match **nothing on disk**: `docs/reference/mhxx-wiki/cat.html`,
`docs/data/MHGU_item(uni).txt`, `docs/data/MHGU_DLC.txt`, `.tmp-*`, `.tmp-*/` (the wiki junction has only
`text/`, `ida/`, `data/`, `INDEX.md`).

### 3. Third-party material present

| item | size / count | licence | risk | evidence |
|---|---|---|---|---|
| `tools/mhgu/vendor/opus-decoder`, `.../common` (`@wasm-audio-decoders/common` 9.0.7) | 101 files when tracked | MIT | MIT allows redistribution **with** licence + copyright; the project still keeps it out | `tools/mhgu/VENDOR-NOTICE.md:1-28`; `vendor/opus-decoder/package/package.json` (`"license": "MIT"`, author `ethanhalsall@pm.me`); `vendor/common/package/package.json` (`MIT`; deps `@eshaz/web-worker`, `simple-yenc`) |
| `docs/data/mhgu.db` + 21 exported JSON | 17.5 MB + ≈33 MB | **unknown / no licence in repo** | upstream `gatheringhallstudios/MHGenDatabase` release APK; community compilation of Capcom data, no redistribution grant recorded | `docs/data/README.md:26-30` |
| `docs/data/json/quests.json`, `skills.json`, … | see table 1 | **explicitly not redistributable** | upstream `agroff/mhgu-quest-list` (Kiranico scrape); repo text: "正式分发需用户自行获取" | `docs/data/README.md:3-4` |
| `docs/reference/mhxx-wiki/` | ≈581 files (junction) | third-party wiki | scrape of a fan wiki, no licence recorded | `docs/PRIVATE-DATA.md:6` |
| `editor-src/` | junction | **none** | decompiled third-party editor, never open-sourced | `docs/PRIVATE-DATA.md:11` |

### 4. Licences in the repo

| path | content | command |
|---|---|---|
| `LICENSE` | GNU GPL v3, 674 lines; `README.md:26-28` and `HANDOFF.md:4` say GPL-3.0-or-later, relicensed from MIT on 2026-10-24 | `head -3 LICENSE`; `wc -l LICENSE` → 674 |
| `docs/LICENSE` | CC BY 4.0, 396 lines (`Attribution 4.0 International`) | `head -3 docs/LICENSE` |
| `NOTICE` / `COPYING` | **absent** — a glob for `NOTICE,COPYING,LICENSE*` returns only the two above | `ls NOTICE COPYING` → no such file |
| `package.json` under `tools/` | **none** except the two vendored ones; `tools/mhgu` has no npm manifest, so no dependency licence tree is declared | `find tools -name package.json` → only `tools/mhgu/vendor/*/package/package.json` |

Three regimes coexist: GPL-3 for code, CC BY 4.0 for `docs/`, MIT for the vendored packages; `docs/analysis/external/*`
records SUYU-GURecomp (GPL-3.0) facts and states they are restated, not copied (`README.md:12`).

### 5. Git history / object store

| fact | measurement | what it means | command |
|---|---|---|---|
| pack files | `pack-50f0281d…` 4.3 MB, `pack-bfb5a451…` 12.9 MB, `pack-743db14f…` 1.1 MB, `pack-085d6096…` 184.5 KB → **18.4 MB total** | `DEVLOG.md:452` recorded 1.54 MiB after the 2026-10-23 rewrite, so ≈17 MB of history arrived in the last week | `git count-objects -vH`; `du -sh .git/objects/pack` |
| loose objects | ≈670 files, **largest 393.8 KB** (`d7/cdd15723…`), next 319.7 KB, 319.6 KB | no multi-MB blob is loose, so the 24.3 MB image and 17.5 MB db are not stored as loose blobs | `find .git/objects -type f -size +1M` → expected empty |
| pack object density | `pack-bfb5a451….idx` 79.1 KB ≈ 9.6 k objects for 12.9 MB (≈1.3 KB/object); `pack-50f0281d….idx` 36 KB ≈ 4.2 k objects for 4.3 MB | a single 12–24 MB blob would leave thousands of objects implausibly small; consistent with many text/TSV revisions, not with the game image | `git verify-pack -v .git/objects/pack/*.idx \| tail -1` |
| orphan indexes | 14 `*.idx`/`*.rev` with no `.pack` (`pack-a145e4da…`, `pack-fd1c52ba…`, `pack-020e94ff…`, …) | residue of filter/GC; `git gc` clears it, but `scp -r .git` carries it | `ls .git/objects/pack/*.pack \| wc -l` → 4; `ls .git/objects/pack/*.idx \| wc -l` → 14 |
| 2026-10-23 rewrite | `.git/filter-repo/commit-map` 10.9 KB (≈130 old→new pairs), `already_ran`, `changed-refs` | history **was** rewritten once (private paths filtered, `USER`/`LOCAL` placeholders substituted) | `git filter-repo --analyze`; `wc -l .git/filter-repo/commit-map` |
| refs | `refs/heads/master` = `5ec9a910…` (`packed-refs`); `origin/master` = `f1998424…`; `FETCH_HEAD` = `2bab7b80…` | local branch is far ahead of an old remote tip; sensitive commits are local-only **as long as nothing pushes** | `git rev-list --count origin/master..master` |
| vendor in history | reflog: `47b897bf → f16e75f` ("Audit totals refreshed…", the broad `git add`) and `a073bc5 → cf03eeb` ("Third-party runtime packages leave the index: tools/mhgu/vendor (101 files …). The blobs remain in the 26 unpushed commits"). Both are links in the unbroken `HEAD` reflog chain → **both ancestors of `master`** | 101 MIT vendor files are still inside history (`f16e75f..cf03eeb` and all descendants) | `git log --all --name-only --pretty=format: \| grep -c '^tools/mhgu/vendor/'` (expect 101); `git log --oneline f16e75f..HEAD` |
| vendor removal status | `tools/mhgu/VENDOR-NOTICE.md:22-28`, `DEVLOG.md:987`, `DEVLOG.md:1217` ("首次 push 前先做 vendor 历史清理") | open action, not completed | `git log --diff-filter=A -- tools/mhgu/vendor \| head` |
| pre-filter private data | `DEVLOG.md:452`: filter-repo two passes removed `flat.bin`, `save-snapshots`, `mhxx-wiki`, `mhgu.db`, `editor-src`, `analysis/dumps` from **all** history — "核查：历史 0 条命中，pack 1.54MiB"; `HANDOFF.md:4` repeats it | documented clean; consistent with the pack sizes above | `git log --all --name-only --pretty=format: \| sort -u \| grep -E 'flat\.bin\|mhgu\.db\|save-snapshots\|mhxx-wiki\|editor-src\|analysis/dumps'` → expected empty |
| backup outside the repo | `G:/backups/MHGU-pre-filter-20261023.bundle` **24.8 MB** (+ unpacked `MHGU-pre-filter-20261023/` containing a 24.3 MB `main.140.flat.bin`) | the *pre-filter* history (game image + saves) still exists one directory away | `ls -l G:/backups/MHGU-pre-filter-20261023.bundle` |

**In history but deleted** (documented, none observed in the current index): `main.140.flat.bin`,
`save-snapshots/**`, `docs/reference/mhxx-wiki/**`, `docs/data/mhgu.db`, `docs/data/{armor,weapons,viewer}/**`,
`editor-src/**`, `docs/analysis/dumps/**` — all removed by the 2026-10-23 filter (`DEVLOG.md:451-452`).

**In the working tree but not in the index** (verified where sorting allowed, see UNKNOWN #1): the same list plus
`tools/mhgu/vendor/**`, `.tmp/**`, `forge/*/dist/**`.

**Currently in history and must not be published as-is**: `tools/mhgu/vendor/**` (101 files, present from `f16e75f`
to `cf03eeb` and therefore in every descendant commit).

### 6. Personal / machine identifiers in tracked text

| pattern | where | sample / count | command |
|---|---|---|---|
| absolute path to the game dump | `DEVELOP.md:10` | `I:\BaiduNetdiskDownload\MONSTER HUNTER GENERATIONS ULTIMATE][1.4.0].xci`, "12.57 GB" | `grep -rn 'BaiduNetdiskDownload' .` |
| yuzu profile / save-container id | `DEVELOP.md:12` | `85A7D07F6ED7C1D6F6045DE67FE969F1` | `grep -rn '85A7D07F' .` |
| machine-specific yuzu path (username already masked to `USER`) | `DEVELOP.md:11` | `G:\appdata\C-Users-USER\Roaming\yuzu\` | `grep -rn 'C-Users' .` |
| key paths (no key bytes) | `DEVELOP.md:14,17`; `DEVLOG.md:489,495`; `tools/mcp/mhgu-re.mjs:14-15`; `docs/analysis/external/suyu-release-check.md:93,106,210` | `yuzu/keys/prod.keys`, `hactool -k prod.keys` | `grep -rn 'prod\.keys' .` |
| hard-coded developer scratch dirs | `forge/dbgport/dbgport.c:70`, `forge/dbgport/macro.mjs:15` | `G:\\omp works\\.tmp\\mhgu-scratch\\shot.bmp` | `grep -rn 'omp works' forge` |
| other drive-rooted paths | `GOAL.md:13,16` (`G:\suyu\`); `docs/PRIVATE-DATA.md:21-23` (`G:/mhgu-romfs/romfs/`, base NCA name, 12,168,003,584 B); `DEVLOG.md:574-575` (C:, OneDrive) | 6+ hits | `grep -rn '[A-Z]:\\' docs GOAL.md DEVELOP.md DEVLOG.md` |
| **save-file player names** | `docs/save-layout/coverage-map.md:312`; `docs/analysis/audit/{MECHANICS-FINDINGS.md:98,MECHANICS.tsv:27,REST.tsv:116,ROUND1-ALL.tsv:63,295,LINK-SAVE-SIDE.md:53-69}`; `DEVLOG.md:521-524,550,581,601,604,1227-1235` | `Sakiko`, `Lay1nn` — real hunter names read out of the saves, now the canonical aliases in the docs; ≥30 lines across ≥10 files (grep truncates at 20 hits/file) | `grep -rn 'Sakiko\|Lay1nn' .` |
| external server IP (not the user's) | `docs/analysis/external/EXTERNAL-FINDINGS.md:159`; `EXTERNAL.tsv:35`; `ROUND1-ALL.tsv:35` | `13.215.176.66` — GitHub API rate-limit message | `grep -rn '13\.215\.176\.66' .` |
| `43.248.77.253` | — | **0 occurrences** | `grep -rn '43\.248\.77\.253' .` → no matches |
| Steam ids (`7656119…`, `STEAM_`, `steam64`) | — | **0 occurrences** | `grep -rnE '7656119\|STEAM_\|steam64' .` → no matches |
| API keys / tokens (`sk-…`, `AKIA…`, `ghp_…`, `Bearer …`) | — | **0 occurrences** | `grep -rnE 'sk-[A-Za-z0-9]{16,}\|AKIA[0-9A-Z]{16}\|ghp_[A-Za-z0-9]{20,}' .` → no matches |
| commit author | every commit: `Twelve-eight <Twelve-eight@users.noreply.github.com>`; `origin` = `https://github.com/Twelve-eight/MHGU.git` | consistent, noreply address only | `git log -1 --format='%an <%ae>'` |

Tracked text also names the base-NCA filename `98abd400588fccb68509fed7e55e4a47.nca` and its byte range inside the XCI
(`HANDOFF.md:129`, `DEVELOP.md:303`, `docs/analysis/monsters/mon-size-calc.md:333`); that is derived-from-own-dump
information, not key material.

### 7. Repository self-description that conflicts with the brief

`HANDOFF.md:4` and `DEVLOG.md:454` say the repository is **already public** at `https://github.com/Twelve-eight/MHGU`
(rewritten 2026-10-23, "远端树 0 条私有路径"), while the brief says "never pushed". Both hold only in the sense that
the local branch is far ahead of an old public `origin/master` (`f1998424…`, 5 days old) and the newer, unfiltered
commits were not pushed. `git rev-list --count origin/master..master` settles the count.

---

## RISK — what would be a problem if published, ranked

1. **`editor-src/` — decompiled third-party editor, no licence.** Present in the tree as a junction
   (`docs/PRIVATE-DATA.md:11`). Gitignored, so `git push` does not carry it — but every non-git copy path
   (zip, `robocopy`, Docker context, IDE "add folder") ships the link target.
2. **`main.140.flat.bin` — 24.3 MB of Capcom code.** Same mechanics (hardlink), and it is the artifact whose absence
   from history rests on `DEVLOG.md:452` plus the object-size arithmetic in §5, not on a command run here.
3. **`tools/mhgu/vendor/**` inside history (101 MIT files, `f16e75f`..`cf03eeb`).** Legal but against the repo's own
   "our work only" rule; once pushed it cannot be removed without rewriting public history. Already an open action
   in `VENDOR-NOTICE.md:22-28` / `DEVLOG.md:1217`.
4. **Save data reachable via `save-snapshots/` and quoted in tracked docs.** Junction holds 4 `.hnt` + 2 `system`
   files; docs quote hunter names (`Sakiko`, `Lay1nn`), HR 8/198, play time 70,310 s / 1,560,082 s, zenny
   3,355,345 / 8,345,419, plus byte offsets. `DEVELOP.md:12` adds a stable yuzu profile id.
5. **`docs/reference/mhxx-wiki/` (≈581 third-party wiki files).** Gitignored, but present and linked from
   `docs/README.md` as if part of the repo; copying the tree republishes scraped wiki content.
6. **`docs/data/**` third-party compilations.** `mhgu.db` (17.5 MB) + ≈33 MB JSON from `MHGenDatabase` /
   `agroff/mhgu-quest-list`; the repo's own text says the Kiranico-derived part must be obtained by the user.
7. **≈20 MB of tracked generated output** (`docs/analysis/code/inventory/*.tsv`, `docs/data/*.csv.gz`). Not a legal
   risk; a "does this belong in a source repo" risk and the main reason the 12.9 MB pack exists.
8. **Absolute personal paths in tracked files** (`DEVELOP.md:10-14`, `forge/dbgport/*`, `GOAL.md:13,16`,
   `docs/PRIVATE-DATA.md:21-23`). Reveals the author's machine layout and dump provenance; no secrets found.
9. **Pre-filter bundle outside the repo** (`G:/backups/MHGU-pre-filter-20261023.bundle`, 24.8 MB) still holds the old
   history with the game image and saves. Not reachable by `git push`; matters only if "publish" means shipping a disk.
10. **14 orphan pack indexes.** Cosmetic, but they are the visible residue of the rewrite and undermine a
    "history is clean" claim made to a reviewer who opens `.git`.
11. **Empty tracked file `docs/analysis/code/tierB3p` (0 B).** Shell-redirect debris; harmless, but reads as
    "committed without review".

---

## UNKNOWN

1. **Exact tracked-file list / total tracked bytes.** `git ls-files -s` was not runnable. The index dump stops at
   `forge/dbgport/shot.h` because the reader truncates at 64.3 KB of the 65.6 KB index, so the
   `main.140.flat.bin`, `patch/`, `save-snapshots/`, `tools/**` region was **not visually verified**. Absence of
   `editor-src`, `docs/reference/mhxx-wiki`, `docs/analysis/dumps`, `docs/data/{armor,weapons,viewer}`,
   `docs/data/mhgu.db` and `.tmp` **was** verified, since those sort before the cut.
2. **Exact commit count ahead of `origin/master`** ("240+"). Only `origin/master = f1998424…`, `master = 5ec9a910…`
   and the 226 KB reflog are known; the reflog also records amends, so it cannot be counted as commits.
3. **Whether `.gitignore` was ever escaped**: a file added before its ignore rule stays tracked forever. Nothing
   suggests this for the private paths (audit's `git ls-files` check in `REST.tsv:21` found only the two slot maps
   under `docs/data/json/`), but a full listing was unavailable.
4. **Whether a compressed copy of the game image still sits inside the 12.9 MB pack.** Object-density arithmetic
   says no and no loose object exceeds 394 KB, but only `git verify-pack` settles it.
5. **The state of the public `origin/master` tree** (`f1998424…`): if it predates the 2026-10-23 filter it would
   contain the private paths; nothing in the repo proves whether the remote was force-pushed.
6. **Licence/terms of the upstream data projects** (`MHGenDatabase`, `agroff/mhgu-quest-list`, the mhxx wiki) — no
   licence text for them is stored anywhere in the repo.
7. **Whether `git status` is clean.** Diagnostic git commands were out of scope for a read-only audit.

---

## Difficulties

- **No shell/run tool.** Only `read`, `grep`, `glob`, and a writer restricted to `xd://` and `local://`. Every
  `git`/`du`/`find` command above is quoted, not executed; facts were reconstructed by reading `.git/index`,
  `.git/logs/HEAD`, `.git/objects/**`, `.git/objects/pack/**`, `.git/filter-repo/**` and directory listings.
- **`grep` refuses binary files**, so "grep the index for `vendor`" failed; `read ... :raw` was used instead, which
  renders lossily and **truncates at 64.3 KB**, cutting exactly the region containing `tools/`.
- **`glob` honours `.gitignore` by default**, so the first binary sweep returned "No files found" while
  `main.140.flat.bin` and `mhgu.db` sat in the tree; sweeps had to be repeated with `gitignore:false`.
- **Workspace-root globs time out** (`G:/omp works/**/*.bundle` aborted at 5 s); the pre-filter bundle was found by
  listing `G:/backups` directly.
- **Directory listings cap at 12 children** and hide dot-directories, so `.git`, `.tmp` and the 28 JSON files needed
  explicit paths and paging. The `.git/objects` listing alone took ~900 lines (three pages).
- **The assigned report path is inside the working tree**, which the writer refuses: the report lives at
  `local://PUBLISH-REPO-HYGIENE.md`.
