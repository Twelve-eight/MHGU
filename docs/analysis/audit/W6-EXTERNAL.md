# W6 — `docs/analysis/external/` full sweep (23 files)

Read-only audit. Every numeric/path/address claim in the 23 files was taken against the
artefact it names: the MHGU 1.4.0 image, the two local clones, the pre-extracted dumps, or a
fresh read of the same URL the document cites. Nothing in `docs/analysis/external/` was edited.

Audit date: 2026-11-04.

## 0. Artefacts and method

| artefact | what was used |
|---|---|
| our image | `main.140.flat.bin` (repo root), flat = vaddr + 0x100; disassembly via `mcp__mhgu_re_disasm` (which imports `MHGU/tools/mhgu/arm32.mjs`) and cross-reads with `mcp__mhgu_re_read_words` |
| SUYU dumps | `.tmp/mhgu/suyu/` — 11 files + `chunks/c01..c17.txt` (all present) |
| nnSdk image | `.tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin` (8,792,028 bytes) |
| SUYU source | `.tmp/ext/SUYU-GURecomp`, `git rev-parse HEAD` = `35015f1488eeabc226f815fbadc2f348ebb948f8`, `git describe --tags` = `v0.10.0-test` |
| Forge PC source | `.tmp/ext/forge-pc`, `git describe --tags` = `v0.7.0`, HEAD `d5e2b43ce00aef54816f43855cfb10d4dc80da40` |
| web | `api.github.com/repos/GURecomp/{SUYU-GURecomp,forge-pc}`, `.../SUYU-GURecomp/releases?per_page=5`, `.../forge-pc/releases?per_page=1` re-fetched 2026-11-04 |

Two conventions had to be settled before any byte could be trusted, and both are stated in the
documents themselves:

- **`main+X` == our `vaddr`.** Confirmed on the anchor the audit names: at vaddr `0xBBCD34` the
  word is `e3a00d1e` (`mov r0,#1920`) and at `0xBBCD38` `e3007438` (`movw r7,#0x438`, 1080).
- **flat image offset = vaddr + 0x100.** `MHGU/DEVLOG.md:441` documents it (`nso-flat.mjs`:
  "NSO0 → flat(+0x100)"), and it is the convention that makes `sdk.flat.bin` readable (see
  finding **F1**).

## 1. Path check (rule a)

Every path the 23 files cite, and whether it exists:

| cited path | exists |
|---|---|
| `.tmp/mhgu/suyu/{dis-gs-1,dis-gs-2,dis-gs,dis-nvntrace,dis-other,addr-disasm,sdk-helpers,ex-gs-cpp,ex-gs-h,ex-mtf,ex-nvntrace}.txt` | yes, all 11 |
| `.tmp/mhgu/suyu/chunks/c01..c17.txt` | yes, 17 files; block counts 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2 |
| `.tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin` | yes |
| `.tmp/ext/SUYU-GURecomp` (+ `docs/a32recomp/*.md`, `src/core/arm/recomp/*`, `src/suyu/game_export.cpp`, `src/common/fs/path_util.cpp`, `src/core/file_sys/savedata_factory.cpp`, `tools/a32recomp/{mtf_shaders,pipeline_manifest}.py`, `LICENSE.txt`, `LICENSES/`) | yes, every one |
| `.tmp/ext/forge-pc` (+ `README.md`, `include/{forge_pc,mod_host_api}.h`, `LICENSE-MHGU-Forge.txt`, `src/*`, `mods/UIFix/uifix.cpp`, `rust/{forge-pc,forge-pc-sys}`) | yes, every one |
| `sdk-flat.bin` (`suyu-gurecomp-audit.md:105`, section heading) | **no** — the file is `sdk.flat.bin`; see **F4** |

Nothing cites a path inside the `MHGU` repo itself, so there is no in-repo path to break. All
`G:/omp works/.tmp/...` references are marked as local/external in the prose ("local:",
"the local clone", "input chunk"), which satisfies rule (a) for external material.

## 2. Claims about our repo and our image (rules b, c)

### 2.1 `suyu-gs-part1.md` — 39 rows (20 VERIFIED / 16 PLAUSIBLE / 3 n/a)

Row count recomputed from the file itself (`node` table parse): 39 rows, of which 36 are code
addresses and 3 are the excluded literals — matching the file's own closing line ("36 code
addresses in the four tables above plus 3 excluded literals").

Byte checks, all reproducing:

| row | claim checked | observed |
|---|---|---|
| `0x1C358` | `push {r11,lr}`, reads +0x3c/+0x38/+0x30/+0x34, scales by literal `0x3C8EFA36`, `bl 0x7C617C`, `pop` | exact: `ed911a0f`,`ed9f2a05`(→0x1c37c),`edd10a0c`,`ed910a0d`,`edd11a0e`,`ee211a02`,`eb1ea780`,`e8bd8800`; `0x3c8efa36` = 0.0174533 |
| `0x1C3A0`/`0x1C3A8` | null guard sits at 0x1C3A0, so 0x1C3A8 is 8 bytes inside | `0x1c3a0 cmp r1,#0` / `0x1c3a4 bxeq lr` / `0x1c3a8 ed9f1a06` — exact |
| `0x1C33C` | `add r12,r1,#64` / `add r2,r1,#96` / `add r3,r1,#80` / `mov r1,r12` / `bl 0x7C5E4C` | exact |
| `0x1C380` | r0 = camera, r1 = out; guard; three vectors from r0; `b 0x7C5E4C` | exact (`0x1c380`–`0x1c39c`) |
| `0x18A48` | `push {r4-r11,lr}` + `sub sp,#208`, caller relation not visible | `e92d4ff0` + `e24dd0d0`; no branch to 0x1C380 in the window — PLAUSIBLE is the honest grade |
| `0x968318` / `0x8B2FBC` / `0x8B72E0` / `0x8B8148` / `0x8C090C` / `0x9310AC` | six filter constructors, five sharing `bl 0x7AA47C` + `ldr rX,[r1,#32]` + size + `blx`, `0x8B8148` the exception | all six confirmed; `0x8B8148` shows `strh r0,[r4,#48]` with r0=5, `str r0,[r4,#16]` with r0=1, `str r0,[r4,#56]` with r0=0, and `r4` already live — exactly the "interior, not entry" reading |
| `0xBBCD34` | 1920/1080 pair through r5; nearby 1280 via base+0x44BAC8 and 720 | `mov r0,#1920`; `movw r7,#0x438`; `ldm/stm r5 {r0,r7}`; `movw r0,#0xbac8`+`movt r0,#0x44` then `str r7,[r6,r0]!` with r7=1280; then 720 |
| `0xBBCF90` / `0xBBBDE0` | call site; `push {r4-r11,lr}` + `sub sp,#92` + `strb r0,[r4,#30]` | exact |
| `0x1311010` | `ldr r0,[r0,#20]` / `cmp` / `bxeq lr` / `b 0x1315B48` | exact |
| `0x1313EE8` | Pia enable byte `[r0,#109]`, `beq 0x1314144`, `mov r1,#1024` | exact (109 = 0x6D, the `kPiaGlobal` byte documented at `game_settings.cpp:1212`) |
| `0x1313F50` | `bl 0x13141C0`, then slots +0x30/+0x2C | `bl 0x13141c0`; `ldr r1,[r1,#48]`; `blx r1` — exact |
| `0x13141C0`/`0x13141D8`/`0x13142E4` | 104-byte frame; 6-instruction interior hook; merge block | `push {r4,r5,r6,lr}` + `sub sp,#104`; `0x13141d8` is 0x18 = 6 insns in; `add r0,sp,#24`/`bl 0x13a7b50`/`add sp,#104`/`pop {r4,r5,r6,pc}` |
| `0x13153FC` | `push {r4-r8,lr}`, 64-byte frame, `mov r8,r0`, `mov r7,r3`, `bl 0x131E8F0` | exact |
| `0x1315B48` | `str r1,[r0,#24]` … `str r1,[r0,#92]`, `bx lr` | exact |
| `0x131F32C` | `push {r4-r11,lr}` + `sub sp,#156` | exact |
| `0x131C450`/`0x131C5A8` | global-null gate then `bl 0x130FB68`/`cmp r0,#1`; `movw r0,#0x2C09`, `add sp,#184` | exact |
| `0x13AA5EC`/`0x13AA614`/`0x13AA668` | `movw r0,#0x5EC`/`add r1,r4,r0`; null check then `ldrb` type compare; `[r6,#668]` vs `[r7,#328]` | exact (`0x13aa5ec`–`0x13aa610`, `0x13aa614`–`0x13aa638`, `0x13aa668`–`0x13aa684`) |
| `0x139E…` cluster | see §2.2 — same rows |

Source citations: `game_settings.cpp:{46,47,48,49,50,56,57}` land exactly on
`kProjection`, `kProjectionB`, `kLookAtA`, `kLookAtB`, `kFilterCtors[]`, and the render-size
comment block; `game_settings.cpp:{1201..1208}` is the `kPiaPcs[]` literal list the Pia rows
quote, and each address is on the line the row claims (checked one by one against
`src/core/arm/recomp/game_settings.cpp`); `game_settings.h:341` is the PIAPROBE range
`0x1311010..0x131F400`; `game_settings.cpp:1212` is literally
"pointer whose +0x6d byte is the enable flag".

Two caveats on the evidence column (finding **F7**):

1. The cells quote VFP mnemonics (`vldr s1,[r1,#0x3c]` … `vmul.f32 s1,s1,s2`) that **do not
   appear** in the cited dump: `dis-gs-1.txt` prints those words as
   `.word 0xed911a0f ; coproc` (the file's own caveat says exactly this). The mnemonics are the
   author's decode, not a quotation — form and evidence disagree.
2. The decoded register numbers differ from the repo's own decoder: for the same window
   `arm32.mjs`/`mcp__mhgu_re_disasm` give `s2,s1,s0,s3`, the document gives `s1,s16,s0,s17`.
   Both readings are self-consistent with the `vmul` that follows, so this cannot be settled
   from the dump; the ARMv7 `VLDR`/`VSTR` operand rule (`Sd = UInt(D:Vd)`, D = bit 22) supports
   the document. The offsets 0x30/0x34/0x38/0x3C and the constant do reproduce either way.

### 2.2 `suyu-addr-check.md` — 50 rows (21 VERIFIED / 20 PLAUSIBLE / 9 SKIP)

- **Row set is exactly the chunk union.** A script parsed all 17 chunk tables and the merged
  table: 50 chunk rows → 50 merged rows, **0 status disagreements, 0 rows missing**. The
  audit's tally "21 VERIFIED / 20 PLAUSIBLE / 9 SKIP" is correct (recounted from the table).
- **Every citation resolves.** All 50 cite cells match a `## <file>:<line> 0x<addr>` header in
  the dumps, including the ones that are easy to get wrong: `0x1000` → `arm_recomp.cpp:641`,
  `0x3c00`/`0x3d80` → `arm_recomp.cpp:1130`, `0x13b3054` → `game_settings.cpp:1542`,
  `0x13a6d94` → `:1595`, `0x130cb64` → `:1701`, `0x131f400` → `game_settings.h:341`.
- **~45 of the 50 rows byte-checked**; all reproduce. The load-bearing ones:
  - `0x13EDD58`: `push {r4,r5,r6,r7,r11,lr}` + `sub sp,#1472`; `movw/movt` build `0x32AB9864`;
    `ldr r0,[r5,#4]`/`cmps`/`bne 0x13edde4`; `ldrb r0,[r5,#8]`; `sub r1,r0,#1`; `uxtb r1,r1`;
    `cmp r1,#1`; `bhi 0x13edde4`. The `0xE6EF1071` decode note (uxtb, not strb) is right.
  - `0x139DDA0/A8/C0/D8` and `0x139DDE0`: `cmp r0,#11`/`bhi 0x139dde0`; `strb r11,[r6,#1528]` /
    `b 0x139df58` twice; `ldr r0,[sp,#12]`/`cmp`/`bne 0x139ddd8`/`ldrb r0,[r6,#8]`/`cmp #1`/
    `beq 0x139dd8c`; `cmp r0,#12`/`str r0,[r6,#1488]`/`bl 0x13a0718`.
  - `0x139E79C…0x139E838`: `mov r2,#134217728` (0x08000000), `ldr r1,[r0,#8]`, `blx r1`,
    `b 0x139e7d0`; `ldrb r0,[r4,#552]`/`tst r0,#4`/`bne 0x139e800`; `bl 0x13a05a0`;
    `ldr r2,[r0,#60]`/`blx r2`; `cmp r0,#1`/`add sp,#132`/`pop {r4-r11,pc}`; and
    `0x139e824: 004a2a44, 004a94dc, 004a94c4, 004a9d40, 004a9f04`, `0x139e838: mov r0,#0`.
  - `0x8bcd84`: `push {r4-r11,lr}` / `add r11,sp,#28` / `sub sp,#4` / `ed2d8b10 vpush {d8-d15}`
    / `sub sp,#552` / `mov r4,r1` / `mov r5,r0` / `ldr r0,[r4,#480]`.
  - `0xbc1200 blx r7` then `0xbc1204 ldr r8,[sp,#8]`; `0xbc13bc str r10,[r9,#8]` then
    `add sp,#148`.
  - `0x13a6d94`: `push {r4,r5,r6,r7,r8,r9,r11,lr}` (8 regs), `r0→r9, r1→r5, r2→r6, r3→r7`,
    `cmp r6,#0`/`cmpne r7,#0`/`beq 0x13a6e18`, `add r8,r5,#364`.
  - `0x130cb64`: `ldr r1,[r0]`/`cmp`/`moveq r0,#0`/`bxeq lr`/`ldrh r0,[r0,#4]`/`cmp #0`/
    `movwne r0,#1`/`bx lr`.
  - SKIP rows: `0x2160` = `01836ae8`, `01836ac0`, `b 0x59e4`, then a `push {r4,lr}` function at
    0x216c that loads `0x1836a90`; `0xe7ff0` = `mov r0,sp`/`bl 0x24def0`/`add sp,#24`/
    `pop {r4-r8,pc}`; `0x100000` = `pop {r4,lr}`/`b 0xb84114`/`.word 0x0173a114`/prologue at
    0x10000c; `0x2000` = `add r5,pc,r0` then 1,2,3,… stamped at +48..+76; `0x4000` tail =
    `add sp,#16`/`pop {r4,r5,r11,pc}`/`.word 0x01847b50`; `0x1000` = table walk on
    `[lr,r3,lsl#2]`; `0x3c00` = `add r1,pc,r1` from `0x0154d1e3` (pc 0x3c14 → 0x1550df7,
    exactly as claimed), `bl 0x7aedcc`, pool at 0x3c2c; `0x3d80` = `str r0,[r5]`, four
    `#255` args, `bl 0x13efda0`; `0x1f00` = `0154eeb5`/`01836d14`, prologue at 0x1f08;
    `0x10000` = `ldr r0,[pc,#1208]`/`ldr r0,[pc,r0]`.
- **Two rows condense branch-joined instructions into one listing.** `0x13AA668`'s evidence
  shows `… cmp r0,#5, ldr r0,[r4,#1488], pop …` as if contiguous; `ldr r0,[r4,#1488]` and the
  `pop` are at `0x13AA698`/`0x13AA69C`, reached by `beq 0x13aa698` (finding **F8**). The claim
  ("merge point … then reads the value at +1488") is true; only the backticked listing reads as
  a straight-line window.
- The header's `sdk+` rows carry the same ±0x100 flat-offset ambiguity as the audit; see **F1**
  (the three verdicts themselves are correct).

### 2.3 `chunks/c01..c17.md` — 50 rows total

All 17 chunks are the per-block reports the merged file was built from, and the merge is
lossless (see §2.2). Each chunk's "3 blocks" preamble matches its input file; `c17.md`'s note
"the input chunk contained 2 blocks, not 3" is correct (`grep -c '^## ' chunks/c17.txt` → 2).

Chunk-specific claims that were checked independently:

| chunk | claim | observed |
|---|---|---|
| c03 | "line boundary 1205→1206 falls exactly here" at `0x139DDE0` | `kPiaPcs` puts 0x139DDA0..0x139DDD8 on line 1205 and 0x139DDE0 first on 1206 — true |
| c04 | `0x139de84` decodes as `strb r0,[r1,pc,lsl r0]` from word `0xe7c1001f` | word is `e7c1001f`, rendered `.word …; media` — true |
| c04 | "the same window spells `0xe1550001` as `cmps r5, r1`" | `0x139df68: e1550001 cmps r5, r1` is in the supplied window (`chunks/c04.txt:51`) |
| c04 | "both 0x139de60 and 0x139de6c jump here [0x139df40]" | `0x139de60 b 0x139df40`, `0x139de6c bne 0x139df40` — true |
| c05 | "`0x139E6F4` is exactly 12 bytes past `0x139E6E8`" | 0x139E6F4 − 0x139E6E8 = 0xC; the BL's return site — true |
| c09 | `0x8bcd84` is `kMotionBlurRender` and `game_settings.cpp:1218` | line 1218 is `constexpr u32 kMotionBlurRender = 0x8BCD84;` |
| c10 | cite `game_settings.cpp:1332-1333`, `game_settings.h:338` | lines are `RecompHooks::Mark(main_base + 0xBC1204);` / `g_vp_probe_pc.store(...)` and the `g_vp_probe_pc` comment |
| c15 | `kScanLimit` at `arm_recomp.cpp:590`, rtld note at `:608`, `off < 0x4000` at `:611` | exact |
| c16 | pool word `0x0154d1e3` at 0x3c38, `add r1,pc,r1` at 0x3c0c → 0x1550df7 | exact |
| c17 | `arm_recomp32.cpp:116` = `(fpscr & 0x7ff8000) | (fpscr & 0x1f00)`; `nvn_rec.cpp:226` = `r[1+a] >= 0x10000` + 96-byte range | exact |

### 2.4 `chunks/spk-format.md`

All 6 sections were re-derived from the two upstream files (both present in the clone), not
from the excerpt alone:

- RomFS: `struct.unpack("<10Q", f.read(80))` at `mtf_shaders.py:34` gives exactly the ten-field
  order the doc lists; dir record `<6I` with name length at +0x14 and name at +0x18
  (`:41-42`); file record `<IIQQII` with a 32-byte head, name at +0x20, stride
  `32 + ((nl+3)&~3)` (`:48-51`); payload at `data_off + doff` (`:50`); `"utf-8","replace"`
  (`:42,49`).
- `.arc`: `b"ARC\0"` (`:56`), u16 count at +6 (`:58`), entries at `12 + k*80` (`:60`), the
  5-field 80-byte entry (`:61-63`), zlib (`:99`).
- SPK: marker `0x12345678` (`:29`), `p = m.start() + 0x30` (`:69`), EXIT
  `0xE30000000007000F` (`:28`), and the trailing-terminator acceptance in
  `pipeline_manifest.py:91-99`.
- Manifest: `MAGIC + struct.pack("<6I", VERSION, cache_ver, KEY_SIZE, len(spk), crc32, count)`
  (`pipeline_manifest.py:135-136`), reader at offset 4 with `p = 28` (`:150,155`), two
  16-bit-prefixed strings then `b"yuzucach" + cache_ver` (`:156-159`), exact-length check
  (`:70-71`), dedupe by exact bytes (`:131-133`), stage word `words[6]` (`:61`), the
  `<IIIB`/`<4Q`/`<7I`/tables/optional-`sph` record (`:123-126`), compute/geometry rejected
  (`:62-63`). The 28-byte prefix arithmetic (4 + 6×4) is right.
- `MAGIC`, `VERSION`, `KEY_SIZE`, `TERMINATOR` are at lines 31, 32, 33, 36 — all above line 60,
  so §6's "read them above line 60" instruction is correct.
- One wording defect: see **F6**.

### 2.5 `suyu-gurecomp-audit.md`

The audit's own arithmetic and status counts reproduce (50 rows: 21/20/9; 12 named addresses in
the gs-part1 parenthetical = 4 camera + 5 filter + 3 render; the 21 VERIFIED list adds up). Its
"citations resolve" list — `game_settings.cpp:1205-1218/1332/1380/1493/1494/1542/1595/1701`,
`game_settings.h:341`, `arm_recomp.cpp:160/590/608/611`, `arm_recomp32.cpp:116`,
`nvn_rec.cpp:226`, `game_settings_ini.cpp:69`, `nvn_trace.cpp:101-103` — was checked line by
line and every one lands on the text it is said to prove (e.g. `game_settings.cpp:1542` is
`" validate: seq/window check 0x13B3054 …"`, `:1595` is the `iter: [0x2145a60]` log,
`game_settings_ini.cpp:69` is the `3840x2160` sentence).

Three defects, none of which changes a VERIFIED/PLAUSIBLE verdict: **F1** (flat offset),
**F2** (stale coverage tally), **F3** (`vmrs`), plus the file-name slip **F4**.

### 2.6 `suyu-release-check.md`

Re-fetched the same endpoints on 2026-11-04. Every fixed value reproduces:

| claim | live value |
|---|---|
| 5 releases under `?per_page=5` | 5 |
| `v0.10.0-test` published, `target_commitish`, `immutable` | `2026-10-22T13:35:19Z`, `main`, `false` |
| win zip 129,987,918 / `3e6af297…9d3d07`; linux 65,353,356 / `574d5a6f…d61bf` | identical |
| `v0.9.0-test` 129,889,697 / `d6c8b6dc…` and 65,296,520 / `f90e7dae…`, pins a commit | identical (`33da4613…`) |
| `v0.8.0-test` 126,346,461 / `af3a84be…`, Windows only | identical |
| `v0.8.0-test-linux` 64,063,572 / `0db782a9…`, `prerelease: true`, 23:46:07Z, WSL-only note | identical |
| `v0.3.1-test` 125,042,192 / `e6f45a38…` and 63,162,004 / `f17c7666…` | identical |
| repo: license GPL-3.0, created 2026-10-03, pushed 2026-10-22T13:34:40Z, size 24,040 KB, archived false, default `main` | identical (`created_at 2026-10-03T07:07:33Z`) |
| "the two API digests are string-identical to the body's Download block" | body carries both, identical |
| tag `v0.10.0-test` → `35015f1488…`, type `commit` | `git cat-file -t` → `commit`; `git rev-list -n1` → `35015f1…` |

Line cites checked against the clone: `README.md:206`, `RELEASE.md:{8,11-17,64-71,73-74,84,134-135}`,
`INSTALL.md:{3-6,10-11,26-30,31-38,40-47,65,77-84,85-91,93-97,99-110,111,113-114,126,130,153-168,195,198,213,216-217}`,
`BUILDING.md:{6-7,10-24,44-46,59-68}`, `game_settings.h:22`, `game_settings.cpp:41-44`,
`game_export.cpp:{228-247,493-494,508-513,1701-1704,1708-1719,2229-2239,2682,3414-3415,3417-3418,3420,4000}`,
`path_util.cpp:105-117/162`, `savedata_factory.cpp:90/93-99/137`, `recomp_hooks.cpp:29-38`,
`nvn_trace.cpp:101-103/296-324` — **all land on the claimed text**.

Notes rather than defects:

- Time-varying fields are snapshots and have drifted: stars 15→29, open issues 3→5, windows
  downloads 91→369, linux 9→47. The document dates its read (2026-10-23), so these are not
  wrong, just not re-derivable.
- The "Unknown" item "whether the local clone is exactly at the release commit … without running
  git the clone's SHA cannot be compared" is now resolvable read-only and resolves **yes**:
  HEAD = `35015f1488eeabc226f815fbadc2f348ebb948f8` = the tag.
- **F5**: `AI_DISCLOSURE.md:1-40` over-runs a 30-line file.

### 2.7 `forge-pc-and-porting-precedents.md`

Local-clone facts reproduce exactly:

- `README.md` 244 lines, `include/forge_pc.h` 333, `include/mod_host_api.h` 234.
- source list (`src/loader.cpp`, `config.cpp`, `overlay.cpp`, `crash.cpp`, `trace.cpp`,
  `forge_internal.h`, `platform.h`), `examples/hello`, `mods/UIFix/uifix.cpp` + `README.md`,
  `rust/forge-pc`, `rust/forge-pc-sys`.
- version constants 0/7/0 at `forge_pc.h:65-67`; `ForgePluginInfo` at `:81-84`; "an exe older
  than mod host ABI 2" at `:248`; `MODHOST_HAS` rule at `mod_host_api.h:18-19`;
  `user_dir` at `:95`; title id/version at `:92-93`.
- `hook_override`/`call_original` in the 0.4 block, `check forge_api->size before use; list
  "required_ver" 0.4` at `:260`, `FORGE_HOOK_JUMP`/`is_block` in the 0.7 block;
  `Action::Jump`, `WANTS_PRESENT`, `min_minor = 7` in the README.
- hot reload (`<name>.dll.<n>.live`, `[plugins] hot_reload = false`), the per-mod checkbox path
  ("drops its hooks, waits until none of its callbacks is running, calls `forge_onUnload`"),
  "Reset scripts", `[Mods] loader = Forge/forge.so`, `-shared -fPIC -fvisibility=hidden`.
- licence: repo MIT (API `key: mit`, `spdx: MIT`), `LICENSE-MHGU-Forge.txt` carries the Skyline
  2020 / Jeffi 2026 notice, README credits ImGui (MIT), Roboto (Apache 2.0), MHGU-Modding
  ("reference only").
- API facts re-read today: `created_at 2026-10-22T09:17:55Z`, `homepage: null`, `has_wiki: true`,
  `language C++`, description string; release `v0.7.0` "Forge PC 0.7.0", published
  `2026-10-22T09:21:41Z`, `ForgePC-0.7.0-with-UIFix.zip` 1,101,609 bytes, digest starting
  `69f53a80` — all identical.
- The SUYU-side cross-reference (`.tmp/ext/SUYU-GURecomp/docs/a32recomp/INSTALL.md` §7, "Code
  mods", `loader = none`) is correct: §7 is "Mods" at line 151, the Code-mods bullet at 164,
  `loader = none` at 168.

Everything external is attributed to a URL. The two claims whose cited page could not be
re-read from this host are listed in §4.

## 3. Findings

### F1 — `sdk.flat.bin` offsets are quoted without the +0x100 flat preroll (P2)

`suyu-gurecomp-audit.md:8-9`, `:13`, `:105`, `:148` and `suyu-addr-check.md:3`.

The audit states "SUYU `kHelpers` sdk_offset **== our `sdk.flat.bin` offset**". It is not: the
flat dump has the same +0x100 preroll as `main.140.flat.bin` (`DEVLOG.md:441`), so
`file offset = sdk_offset + 0x100`. Commands and output:

```
$ xxd -s 0x3f40d8 -l 16 .tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin
003f40d8: 1eff 2f81 0100 a0e3 101a dfe7 3400 63e2
        # sdk-helpers.txt says 0x3f40d8: e3a01000 mov r1,#0 / e12fff1e bx lr  -> not there

$ xxd -s 0x3f41e0 -l 32 .tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin
003f41e0: 101a 00ee 0010 00e3 c00b f8ee 3013 44e3 061b dfed a10b 60ee 061b dfed a10b 70ee
        # = ee001a10, e3001000, eef80bc0, e3441330, eddf1b06, ee600ba1, eddf1b06, ee700ba1
        # i.e. sdk-helpers.txt 0x3f40e0.. byte for byte, at +0x100
```

Same for the other two: txt `0x3f3e18` `bx lr` is at file `0x3f3f18`; txt `0x3f91dc`
`ea015bf0` is at file `0x3f92dc`. The three VERIFIED verdicts are unaffected (the dumps do match
the SDK image), but a reader following the document literally reads the wrong bytes, and the
`main`-vs-`sdk` distinction the audit is built on becomes harder to trust than it should be.

### F2 — `suyu-gs-part1.md` coverage count is stale (P2)

`suyu-gurecomp-audit.md:22` ("populated (camera/filter/render clusters); Pia/Unknown
placeholder") and `:144` ("**PASS** (12 rows …)"), repeated at `:30` ("All 12 rows audited
previously stand").

The file now has **39 rows** — 36 code addresses + 3 excluded literals, as it says itself in its
closing "In progress" line. The audit reviews 14 of them (the 12 it names plus the two PLAUSIBLE
downgrades), leaving 25 rows outside its stated coverage: the 22-row Pia/receive-path table (all
of whose `kPiaPcs` entries it never checks) and the 3 excluded literals.

```
$ node -e '<parse tables>'      # same parser on both files
suyu-gs-part1.md rows=39 {"VERIFIED":20,"PLAUSIBLE":16,"n/a":3}
suyu-addr-check.md rows=50 {"PLAUSIBLE":20,"VERIFIED":21,"SKIP":9}
```

The audit's "12 rows" equals the addresses it names (4 camera + 5 filter + 3 render) — i.e. an
earlier state of the file. Either the Pia table was added after 2026-10-23 (making the PASS
outdated) or the sweep skipped it (making the PASS over-broad); either way the document does not
cover the file as it stands. I byte-checked those 22 rows myself: they hold (§2.1), so the
verdict survives — the coverage claim does not.

### F3 — SDK helper is said to finish through `vmrs`; it finishes through `vmov` (P3)

`suyu-addr-check.md:45`, row `sdk+0x3f40e0` (repeated in the byte-identical `chunks/c13.md` and
`chunks/c14.md` rows). The block at `sdk+0x3f40e0`/file `0x3f41e0` ends

```
0x3f4200: ec410b31 (vmov d17, r0, r1)   0x3f4204: ee710ba0   0x3f4208: ec510b30 (vmov r0, r1, d16)
0x3f420c: e12fff1e bx lr
```

`vmrs` is `0xeef1fa10` and appears in the *other* helper (`0x3f3f24`, txt `0x3f3e24`). The
description is cosmetic; the entry verdict stands.

### F4 — Section heading names a file that does not exist (P3)

`suyu-gurecomp-audit.md:105`: "### nnSdk helpers (nvn_trace.cpp:101-103, **sdk-flat.bin**)".
The image is `sdk.flat.bin`; `find . -iname "sdk-flat.bin"` returns nothing. Every other
reference in the same file spells it correctly.

### F5 — Citation range overruns the file (P3)

`suyu-release-check.md:66`: "`docs/a32recomp/AI_DISCLOSURE.md:1-40`".
```
$ wc -l .tmp/ext/SUYU-GURecomp/docs/a32recomp/AI_DISCLOSURE.md
30
```
The quoted content (provenance + "Licensing and responsibility") is inside those 30 lines.

### F6 — The manifest header comparison is not with "the package's first 0x50 bytes" (P3)

`chunks/spk-format.md` §5: "The header copy is written only when the cached header differs from
the **package's** first 0x50 bytes".

`pipeline_manifest.py:122` compares `sph == code[:SPH]`, i.e. the cached stage's own program
header against the first 0x50 bytes of that stage's **cached code slice** — not the SPK image's
first 0x50 bytes (which begin with a marker block). The rest of the sentence ("the one-byte flag
records the opposite sense, i.e. whether the two headers matched") is correct.

### F7 — Quoted VFP mnemonics are not in the cited dump (P3)

`suyu-gs-part1.md:29` and `:30` (the two projection rows). `dis-gs-1.txt:22-27` prints

```
0001c35c: ed911a0f  .word 0xed911a0f ; coproc
```

so `vldr s1,[r1,#0x3c]` / `vldr s16,[r1,#0x30]` are the author's decoding, not a transcription.
The document's own caveat (§"the dump prints the VFP ops as raw `coproc` words") says so, but
the cells are formatted as quotations, which they are not. And the register numbers disagree with
the repo's decoder (`arm32.mjs` → `s2,s1,s0,s3`; the doc → `s1,s16,s0,s17`); the offsets and the
constant are correct either way.

### F8 — One evidence cell reads as a straight-line listing but is branch-joined (P3)

`suyu-gs-part1.md:87` (`0x13AA668`): the cell shows
`… cmp r0,#5, ldr r0,[r4,#1488], pop {…}` as one run. In the image those are separated by
`bne 0x13aa698` (0x13aa680), and `ldr r0,[r4,#1488]`/`pop` live at `0x13aa698`/`0x13aa69c`. The
stated meaning is right; only the formatting misleads a byte-checker.

## 4. Uncited / unciteable external claims

No external claim in the 23 files is stated with **no** source at all — every sentence about
SUYU, Forge PC or a mod site carries a file:line into a clone that is present, or a URL. Three
claims carry a source that cannot be re-read from this host, so they remain single-sourced:

1. `forge-pc-and-porting-precedents.md:41` — "The Switch loader's plugins are `.nro` files
   placed in `romfs/nativeNX/plugins` (https://github.com/Fexty12573/forge-rs, Quickstart)."
   The `forge-rs` repository is not cloned under `.tmp/ext/`; nothing local corroborates the
   layout.
2. `forge-pc-and-porting-precedents.md:60-61,183-186` — hub sizes "MHGU has 48 mods", "Monster
   Hunter Rise has 198 mods", and the per-game 0-result searches, all from
   `gamebanana.com/apiv11/...`. The API answers are not archived with the document; the counts
   are as-of 2026-10-23 only.
3. `forge-pc-and-porting-precedents.md:107,130` — the GameBanana mod pages (458243, 414340,
   603812, 730855, 730853, 730857) and the two Nexus mod ids (1642, 1271). Nexus is explicitly
   declared unreachable, and the Nexus-origin claims are correctly parked under "Unknown"; the
   GameBanana page texts are the only source for the quotes.

Two claims of external fact that *are* marked as inference, correctly: "the PC plugin ecosystem
is new" and "no conversion tool for that pair was found" (`[INFERENCE]`), and "the Lagiacrus mesh
origin is unstated" (parked under "Unknown").

## 5. Difficulties

- **VFP register numbering could not be settled from local sources.** The dump prints every
  floating-point instruction as `.word … ; coproc`, and the one decoder in the tree
  (`tools/mhgu/arm32.mjs`, also what the `mcp__mhgu_re_disasm` device calls) computes single
  registers as `(Vd<<1)|D`, while the ARMv7 operand rule for `VLDR`/`VSTR`/data-processing is
  `UInt(D:Vd)` (D = bit 22). The two readings differ on 4 of the 5 loads in `0x1C358`
  (`s1/s16/s0/s17` vs `s2/s1/s0/s3`). No assembler, capstone or second decoder is installed, and
  `objdump` has no ARM target here, so F7 is reported as a provenance defect with both readings
  rather than as "the document is wrong". It does not change any status: the offsets, the
  constant and the control flow all reproduce under either convention.
- **Time-stamped web facts cannot be re-proven, only re-read.** Stars, open issues and download
  counts have moved since 2026-10-23; every field that should be immutable (sizes, digests,
  publish times, creation/push times, licence, tag→commit) reproduced exactly. I treated drift in
  the three counters as evidence that the document is *dated*, not that it is inaccurate.
- **The `read` tool truncates table rows at 768 characters, the files do not.** The first pass
  over `suyu-addr-check.md` and `chunks/c09.md` showed cells ending in "…"; `awk '{print
  length($0)}'` shows the real lines are up to 1148 characters (20 rows in `suyu-addr-check.md`
  exceed 700), and `grep`+`fold` reads them whole. Every "truncated" sentence was re-read that
  way before being judged. No file in the directory is actually cut — a reviewer using a
  line-truncating viewer would wrongly conclude otherwise.


## VERDICT

doc	verdict	evidence
suyu-gs-part1.md	confirmed	39 rows (20V/16P/3 n/a); all 36 code addresses and every `game_settings.cpp`/`.h` cite reproduce in the image and the SUYU source; F7 (VFP mnemonics not verbatim in the dump) and F8 (one branch-joined listing) are formatting defects only.
suyu-addr-check.md	confirmed	50 rows; union of c01..c17 is exact (0 status conflicts, 0 missing); all 50 cite cells match dump block headers; ~45 rows byte-checked, all true; only F3 (a `vmrs` that is a `vmov`) and the shared +0x100 note remain.
suyu-gurecomp-audit.md	contradiction	Arithmetic, status counts and citation list are right, but the central `sdk.flat.bin` offset claim is off by 0x100 (F1) and the gs-part1 coverage tally is stale (F2); F3/F4 are cosmetic.
suyu-release-check.md	confirmed	Every fixed API value reproduces today (5 releases, sizes, digests, publish/target/immutable fields, repo metadata, tag→35015f1 lightweight commit) and every INSTALL/RELEASE/BUILDING/game_export/path_util/savedata_factory line cite lands on the claimed text; only `AI_DISCLOSURE.md:1-40` overruns a 30-line file (F5).
forge-pc-and-porting-precedents.md	confirmed	All local-clone facts (244/333/234-line files, source tree, licence notices, version constants, ABI rules, hot-reload wording) and all API facts (created_at, homepage null, has_wiki, v0.7.0 asset 1,101,609 B / 69f53a80…) reproduce; three claims rest on pages not re-readable here (§4).
chunks/c01.md	confirmed	3 blocks; all three rows reproduce (0x13AA698 `ldr r0,[r4,#1488]`+pop, 0x13AA6A0 data, 0x13AA6A4 next prologue, 0x13EDD58 tag 0x32AB9864 + uxtb note).
chunks/c02.md	confirmed	3 blocks; 0x13EDDE8 epilogue + `movw r0,#0xc0b` failure path, 0x139DDA0 `cmp #11`/`bhi`, 0x139DDA8/0x139DDD8 duplicate store pairs all exact.
chunks/c03.md	confirmed	3 blocks; 0x139DDC0/D8/DDE0 reproduce and the 1205→1206 line boundary is exactly at 0x139DDE0 in `kPiaPcs`.
chunks/c04.md	confirmed	3 blocks; 0x139DE20/DE4C/DF40 reproduce, plus the two disassembly-quality observations (`0xe7c1001f` at 0x139de84, `0xe1550001` at 0x139df68) are real words in the window.
chunks/c05.md	confirmed	3 blocks; 0x139DEB8/6E8/6F4 reproduce, including the 12-byte "post-BL" claim and offsets 0x234/0x264/0x268.
chunks/c06.md	confirmed	3 blocks; 0x139E71C/730/76C reproduce (frame slots, `bl 0x13a88c4`, `beq 0x139e79c`).
chunks/c07.md	confirmed	3 blocks; 0x139E79C/7B8/7C8 reproduce (`mov r2,#0x08000000`, `bl 0x1398d10`, `bne 0x139e800`).
chunks/c08.md	confirmed	3 blocks; 0x139E7D0/7DC/7EC reproduce (`tst r0,#4`, `bl 0x13a05a0`, `[r0,#60]`+`blx`, 132-byte epilogue, data from 0x139e824).
chunks/c09.md	confirmed	3 blocks; 0x139e800/814 reproduce and `game_settings.cpp:1218` is `kMotionBlurRender = 0x8BCD84`; 0x8BCD84 prologue incl. `ed2d8b10 vpush {d8-d15}` and `sub sp,#552` exact.
chunks/c10.md	confirmed	3 blocks; 0xbc1200/1204, 0xbc12d0 (`add r0,r10,#56`/`addne #72`, `ldr r0,[pc,#216]`=0xc7df94) and 0xbc13bc+`add sp,#148` exact; cites 1332-1333/1380/`game_settings.h:338` land.
chunks/c11.md	confirmed	3 blocks; 0x131c3e0/139dce4/139e5f8 all real entries with the claimed frames (184/28/132) and first calls.
chunks/c12.md	confirmed	3 blocks; 0x13b3054 (`movw r12,#0xffff`, `ldrh [r0,#6]`, `blt 0x13b310c`), 0x13a6d94 (8-reg push, `cmp r6`/`cmpne r7`, `add r8,r5,#364`), 0x130cb64 exact; cites `:1542/:1595/:1701` land.
chunks/c13.md	confirmed	3 blocks; 0x131f400 mid-function, 0x2160 = `01836ae8`/`01836ac0`/`b 0x59e4` + function at 0x216c, sdk row correct apart from the +0x100 convention (F1).
chunks/c14.md	confirmed	3 blocks; sdk 0x3f3e1c/0x3f91dc entries real (at +0x100 in the flat file), 0xe7ff0 words exact; F1/F3 apply to the prose only.
chunks/c15.md	confirmed	3 blocks; `kScanLimit` @590, rtld note @608, `off < 0x4000` @611, and the 0x2000 constant table (+48..+76) all reproduce.
chunks/c16.md	confirmed	3 blocks; 0x1000 table walk, 0x3c00 tail + pool (0x3c14+0x154d1e3 = 0x1550df7), 0x3d80 `#255`×4 + two calls to 0x13efda0 all exact.
chunks/c17.md	confirmed	2 blocks (as it says); `arm_recomp32.cpp:116` and `nvn_rec.cpp:226` are exactly the cited expressions.
chunks/spk-format.md	confirmed	Every format fact re-derived from `mtf_shaders.py` and `pipeline_manifest.py` in the clone: 10×Q RomFS header, `<6I`/`<IIQQII` records, ARC\0 + 80-byte entries, marker 0x12345678 at −0x30, EXIT 0xE30000000007000F, 28-byte manifest prefix, `yuzucach` rebuild; only the "package's first 0x50 bytes" wording is wrong (F6).

Count: 23 documents — confirmed 21, contradiction 1 (`suyu-gurecomp-audit.md`), stale 0 (its staleness is recorded inside the contradiction row), unverified 0; 8 findings (F1 P2, F2 P2, F3–F8 P3); 3 single-sourced external claims (§4).
