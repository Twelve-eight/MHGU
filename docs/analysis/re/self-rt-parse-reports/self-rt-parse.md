# `self/rt` unparsable `.user` files — root cause

## Verdict

**(b)-flavoured but provenance-driven: the 12 files are not corrupt and not an unknown variant — they are byte-identical BASE-pak (pre-patch_001) revisions of the patch-era classes the RSZ type dump describes. `rsz.mjs` refuses them by design (crc-mismatch / old layout over-consumption / inline-struct-array guard). Staging (`self-stage.mjs`) left these two trees (`em001_02`, `em002_02` user_data) at base-pak staleness because the patch_001 overlay never landed — the failure of a later pak to win is silent (exit 0 on `missing`, swallowed non-zero exits).**

Task: HANDOFF-20261109.md known-gap item 5 "`self/rt` 8 个 `.user` 解析不了（staging 盲点）" — analysis only, no fixes.

## Confirmed

### Which tool reports the failure

- [A] The "repository's own RSZ parser" is `MHRS/tools/rsz.mjs` (`parseRsz`, dump `MHRS-private/rszmhrise.json`). Source of the published claim: S-G mail to S-E `MHRS/sessions/mailbox/S-E/inbox/20261108-150953-S-G-oqxg.md:30` — "119 个 `.user.2` 过不了仓库自己的 RSZ 解析器 … 111 个在 `_work`、**8 个在 `self/rt`（retarget staging）**". No dedicated census script was left behind; it was an ad-hoc walk.
- [A] `self/rt` staging tree is built by `MHRS/tools/port/self-stage.mjs` (`--self` mode of the port pipeline; `port-monster.mjs:103` resolves `--stage <dir>` to `<dir>/self` when `<dir>/self/rt` exists). Steps: paks oldest-first extract (base + patch_001..004) → KB catalogue `MHRS-private/kb/rise-enemy-tree-paths.txt` (456 paths for em001/02) → optional `--overlay` of loose deployed files.
- [A] Consumers that read `self/rt` back: `slot-diff.mjs:22` (pristine clone), `build-labels-ports.mjs:100`, `motions-regress.mjs:32`, `check-state-shape.mjs:167`.

### The failing files (census, this run)

Census `G:/tmp/EMC/want-census.mjs` walked every `G:/tmp/Port/<em>/self/rt/**/*.user.2` (3849 files across 45 trees that have `self/rt`) and ran `parseRsz` + `readUsr`. Result: 3837 clean, **12 fail**. All 12 are the `<em>_02` datatune-generation user_data files of em001 and em002. 8 throw hard errors, 4 parse with `issues` (crc-mismatch) — the "8" in the handoff counts the hard throws only.

| file (under `self/rt/natives/stm/enemy/<em>/02/user_data/`) | size | sha256 | parse error |
|---|---|---|---|
| em001_02_bind_wire_data.user.2 | 620 | a8b541cb307eee2bcacd8d20f7df4b9c541ac9689955671bb52a3a412f96cb7d | throw: inline-struct-array |
| em001_02_combat_monster_data.user.2 | 1000 | c00a475b7d0f4d77619934ca66ffce09d1a75f14188adfe5e4504bc2f26fbeac | issues: crc-mismatch ×N |
| em001_02_joint_const_data.user.2 | 1176 | c4584b3b2da08913adac6d8712d284d0c189d8f748c720df77015a2c109a90ad | throw: runs past limit |
| em001_02_stamina_data.user.2 | 520 | 2eb05abf8954803c91058887278ce9b5f710224ef5ac6e74ebe7214dcffcc41b | issues: crc-mismatch |
| em001_02_unique_mystery_data.user.2 | 1992 | 24fc0140727aa8cd48050d1e89969bd29973ead210bc104b85f8b29b860eecf4 | throw: inline-struct-array |
| em001_02_use_think_data.user.2 | 131 | f1a2e6b4d7cb14c133efbceee17eeef422b7a2c3b5935aacde56e95a3bdaee42 | throw: runs past limit |
| em002_02_bind_wire_data.user.2 | 620 | d64b2c599635d57f6a5fcda0cb64b02a0b078dd7ead85ae2e6497e387ceb53bb | throw: inline-struct-array |
| em002_02_combat_monster_data.user.2 | 1528 | a90bfc820188dc6cf9a1a7962bc2a91cdf9804d8417667f47c8ad37551c08835 | issues: crc-mismatch ×N |
| em002_02_joint_const_data.user.2 | 1176 | 9cefe1c7a3a95f82444c0ec9602a5520324c047aae2c81a7c32fbca9155cdc59 | throw: runs past limit |
| em002_02_stamina_data.user.2 | 524 | d5105afc182beb0b725501e9a8e15391b84b95e9b61f23638c52b6c8ae598dfd | issues: crc-mismatch |
| em002_02_unique_mystery_data.user.2 | 1992 | 6430302eea8e971fd3d205627ada3b620835867ba7035c0e6fb779dccaaed79c | throw: string count |
| em002_02_use_think_data.user.2 | 131 | f1a2e6b4d7cb14c133efbceee17eeef422b7a2c3b5935aacde56e95a3bdaee42 | throw: runs past limit |

`readUsr` adds 0 new failures (same 12).

### Exact error text + command

`node G:/tmp/EMC/want-census.mjs` (walk + parseRsz + readUsr). One example:

```
G:/tmp/Port/em001_02/self/rt/natives/stm/enemy/em001/02/user_data/em001_02_use_think_data.user.2
  parseRsz: snow.EnemyUseThinkData._IsExistOverMysteryBurstAction (Bool): 1 B read at 131 runs past the limit 131
```

## Root cause (byte evidence)

The 12 staging copies are byte-identical to the BASE pak revisions of these files; the parser fails because they carry pre-patch (older) type CRCs / layouts of the same classes, and `rsz.mjs` (correctly) refuses a class whose dump CRC does not match or whose old layout over-consumes. `self/rt` for em001_02/em002_02 was staged from stale base-pak bytes — the staging blind spot is pak-order, not corruption.

Evidence chain:

1. **Which paks carry what** (`node MHRS/tools/pak.mjs extract <pak> --paths-from G:/tmp/EMC/paths.txt --dry-run`, all five paks): base `re_chunk_000.pak` holds all 12 at sizes 620/1000/1176/520/1992/131 (em001) and 620/1528/1176/524/1992/131 (em002); **patch_001 holds newer revisions** at 704/1000/1228/520/2064/132 and 704/1528/1228/524/2064/132; patch_002..004 do not carry them.
2. **Staging bytes == base pak bytes** — provenance census extended beyond the 12: all **81/81** `user_data/*.user.2` files of the em001_02 + em002_02 staging trees are sha256-identical to freshly extracted base-pak payloads, 0 match patch_001 where the two paks differ (extracts `G:/tmp/EMC/ud-base/`, `G:/tmp/EMC/ud-p1/`; patch_001 carries only 12 of the 81, `paths: 81 ok: 12 missing: 69`). Exactly the 12 files that differ between base and patch_001 are the 12 parse failures; the other 69 are identical in both paks and parse clean.
3. **Effective (game-read) bytes == patch_001, 12/12** (`effective-file.mjs` → `G:/tmp/EMC/vanilla/`, all sourced `patch_001`), and **all 12 parse CLEAN with the same parser** (`want-control.mjs`: cursorOk=true unsupported=0 issues=0). The parser is not the variable; the input revision is.
4. Staging vs patch_001 per-file diff (`want-compare.mjs`): truncation −84/−52/−72/−1 B, old CRC words (`4a d7 bc 39` → `75 fb 9b 64` at combat_monster +0xd0..+0x163, `f1 78 12 45` → `c8 f2 45 44` at stamina +0xd8, `b2 de 31 90` → `59 f1 af 23` at use_think +0x70). These are the *pre-patch* class revisions: the `crc-mismatch` issues (`fileCrc 649bfb75` / `4445f2c8` vs dump `39bcd74a` / `451278f1`) are the dump describing patch-era classes while the file carries base-era ones — the exact drift class `rsz.mjs`'s LAYOUT_FIXES comment documents for pre-patch `EnemyUserDataParam` (`rsz.mjs:212-218`).
5. `self/rt` is built by `MHRS/tools/port/self-stage.mjs`, which extracts the five paks oldest-first so a later pak overwrites an earlier one (`self-stage.mjs:34-40`), then overlays loose deployed files. The em001_02/em002_02 trees' `user_data` came out base-only: patch_001 never won. Two candidate mechanisms inside self-stage: (a) `extract()`'s catch swallows the non-zero exit with only `e.stdout` counted (`self-stage.mjs:38`), and (b) `pak.mjs --paths-from` exits **0** on `missing` rows (verified `pak.mjs:1150-1156` — only `error` sets exit 1), so a pak list that errors mid-run leaves no trace in `hit` at all. Either way the per-pak failure is silent; the staged tree then just misses the patch_001 overlay and whatever the base pak provided stays.
6. **Timing evidence**: staging tree written 2026-11-07 03:39 (`self/base-shas.json` 03:35, user_data files 03:39:35); `patch_001.pak` mtime 2025-11-17 — patch_001 existed for ~1 year at staging time, so "staged before the patch existed" is excluded; the overlay loss happened inside the staging run itself. [A]

Competing explanations discriminated:

- **(a) truncated/incomplete staging copies** — partially true but not the primary fact: 4 of 12 are shorter than patch_001, but byte-identity with the base pak shows the staging copies are *complete, self-consistent older revisions*, not cut-off writes.
- **(b) a `.user` variant the parser does not know** — refuted: the same classes at the patch_001 revision parse clean; the parser's inline-struct-array refusal is a documented deliberate guard (`rsz.mjs:80-84`), and old-revision CRC drift is a known engine-era phenomenon (`rsz.mjs:212-218`).
- **(c) genuinely corrupt** — refuted: 12/12 byte-identical to a real pak payload (base pak), each internally consistent (old-crc files parse up to the value-validation guard; sizes match the base pak's declared entry sizes).

### Scope of the negative

- Census enumerates every `*.user.2` under every `Port/<em>/self/rt` (45 trees, 3849 files). It does NOT cover `*.user` without `.2` (0 exist), pfb, rcol, motlist — only the `.user.2` RSZ parse path named by the handoff.
- "8" reproduces as the hard-throw count; the full set of files a re-parse gate must whitelist is 12 (8 throw + 4 crc-mismatch non-clean).

## Controls

- **Positive control (parser)**: the 12 patch_001 (effective) copies all parse CLEAN (`want-control.mjs`) — proves the parser handles these exact classes when the file is the revision the dump describes.
- **Positive control (payload provenance)**: 12/12 sha256-identical between staging and the freshly extracted base pak payload (`pak.mjs extract re_chunk_000.pak --paths-from`, `ok 12 missing 0 error 0`).
- **Zero-control for the census**: 3837/3849 parse clean under the same walker, and the 12 failures are 100% concentrated in the two em*_02 trees' user_data, zero elsewhere — consistent with the single proposed cause (base-era revision), no scatter.

## Good-vs-bad byte comparison (one file)

`em001_02_use_think_data.user.2` (smallest; the same pattern holds for all 12):

| | staging (`self/rt`, = base pak) | patch_001 (game-read) |
|---|---|---|
| size | 131 B | 132 B |
| sha256 | f1a2e6b4d7cb14c133efbceee17eeef422b7a2c3b5935aacde56e95a3bdaee42 | a3c8e0295fcf5364405d4916bfe49746a2fd9acadeb5fa3fcec2065b9459b194 |
| parse | THROW `snow.EnemyUseThinkData._IsExistOverMysteryBurstAction (Bool): 1 B read at 131 runs past the limit 131` | CLEAN, 2 instances |

Differing bytes (only 4 in the common prefix; want-compare.mjs; `p1` = patch_001 byte, `stg` = staging byte):

```
+0x70: p1 b2 -> stg 59
+0x71: p1 de -> stg f1
+0x72: p1 31 -> stg af
+0x73: p1 90 -> stg 23
```

The staging file is 1 B shorter and its word at +0x70 differs; the dump's `EnemyUseThinkData` layout (patch-era) reads one field past 131 on the base-era file — a layout/CRC drift, not bit rot: the very same bytes are what the base pak ships (sha-equal, `ok 12 missing 0 error 0` from the base-pak extract).

## Unknown

- Why patch_001 lost the overlay for these two trees: the whole 81-file `user_data` subtree staged base-only, while other parts of the same trees (mot/collision/mod per `base-shas.json`) are present — needs a re-run of `self-stage.mjs` with per-pak hit accounting to pin the mechanism (fix first; analysis-only here). [U]
- Whether other `self/rt` trees (em*_00 etc.) staged their user_data from the newest pak that carries each file — em*_00 user_data files parse clean, so at most subtler staleness remains unmeasured. [U]

## Self-FalsificationCheck

Attempts to break the base-pak-staleness verdict:

1. *Could the staging files be a NEWER variant than patch_001 (e.g. hand-edited)?* Tested: sha256 equality against a fresh base-pak extract — 81/81 identical, 0 unique. Falsified.
2. *Could the failures be parser bugs independent of revision?* Tested: same parser on patch_001 bytes of the same 12 paths — all CLEAN. If the parser were broken for these classes, the control would fail too. Falsified.
3. *Could "corruption during copy" explain truncation?* Tested: base-pak payloads are byte-identical and the pak reports the same declared sizes (`ok <path> <size>` lines match staging sizes exactly). A truncating copy cannot reproduce exact declared sizes of another pak's entries. Falsified.
4. *Could patch_001 simply not contain these 12 files (making "overlay lost" wrong)?* Tested: dry-run of patch_001 for all 81 paths — `ok 12 missing 69`, and the ok list is exactly the 12 failing paths with NEW sizes. Falsified.
5. *Could the staging run predate patch_001's existence?* Tested: mtimes (2025-11-17 pak vs 2026-11-07 staging). Falsified.
6. Remaining untested mechanism: which of self-stage's two silent-failure paths actually dropped patch_001 (needs an instrumented re-run; out of analysis-only scope). [U]

## Difficulties

- Parent's handoff said 8; census finds 12 failing (8 hard throws + 4 crc-mismatch non-clean). "8" is reproducible only under throw-only counting.
- The "119" census script was never committed; numbers had to be re-derived from the S-G mail text.
- Shell on this box intermittently breaks `/dev/null` redirects and some `node -e` quoting; all analysis went through script files under `G:/tmp/EMC/`.
- Scripts written: `G:/tmp/EMC/want-census.mjs` (walk + parseRsz + readUsr), `want-compare.mjs` (staging vs effective bytes), `want-control.mjs` (effective copies must parse clean); lists `paths.txt` (12 failing paths), `ud-paths.txt` (81 user_data paths); extracts `G:/tmp/EMC/vanilla/` (patch_001 effective), `G:/tmp/EMC/basepak/` + `ud-base/` (base pak), `ud-p1/` (patch_001). Output log `census.out`.
