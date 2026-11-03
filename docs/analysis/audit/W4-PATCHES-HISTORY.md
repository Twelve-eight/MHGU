# W4 — patches / crossgame spec / history: linkage review

Date: 2026-11-04. Scope: `docs/patches/` (2 files), `docs/spec-crossgame/` (1 file),
`docs/history/` (2 files). Read-only: no reviewed document was edited; the only file
written into the repository is this report.

Method: every numeric, path and address claim was re-derived from the committed
artefact it names — the shipped `patch/1.4.0.pchtxt` and
`patch/experimental-v8/1.4.0.pchtxt`, the image `main.140.flat.bin` (NSO header +
`.text` disassembly), `docs/data/json/*.json`, `save-snapshots/`, `git log`, and the
Suyu sources under `G:/omp works/.tmp/ext/SUYU-GURecomp/`. Scratch scripts lived in
`G:/tmp/W4/` (`w4-patch3.mjs`, `w4-shift.mjs`, `w4-v8.mjs`, `w4-scan.mjs`,
`w4-dis*.mjs`, `w4-str.mjs`, `w4-cite.mjs`, `w4-params.mjs`); none is part of the repo.

## 0. Tooling note: `tools/mhgu/mod.mjs` does not write patches

`tools/mhgu/mod.mjs` is a MOD v212 **reader** (header comment: "MHGU MOD v212 reader").
Its only write is `fs.writeFileSync(out, toObj(...))` at line 118, exporting an OBJ.
It contains no pchtxt generator, so "what the tool writes" was checked against the
shipped patch files and against the two generators the spec actually names:
`tools/build-v7.mjs` (V7) and `tools/build-v7-final.mjs` (V7 at commit `53bcc3f`,
V8 at HEAD) plus `tools/v7-shift-65.json`.

## 1. docs/patches/item-box-v7-plugin-spec.md

### 1.1 The 123-row table vs the shipped V7 file and the image — 123/123 clean

Command: `node G:/tmp/W4/w4-patch3.mjs` (parses every `| n | vaddr | original |
patched |` row, re-encodes the mnemonics as ARM words, compares against
`patch/1.4.0.pchtxt` line n and against `main.140.flat.bin` at flat = vaddr + 0x100).

```
pchtxt instr lines: 123
flat mismatches: 0 patched-value mismatches: 0 original-word mismatches: 0 unencodable text: 0
```

For all 123 rows, (a) the pchtxt line number equals the table's `#`, (b) the pchtxt
flat offset equals vaddr + 0x100, (c) the pchtxt 4-byte word equals the "patched insn"
column, (d) the image word at that vaddr equals the "original insn" column. That is an
independent repetition of the in-repo audit the document cites
(`.tmp/reports-mhgu/specaudit-{1,2,3,4}.md`: 31+31+31+30 `OK` rows, 0 `FAIL`;
`specaudit-review.md` Overall table: PASS 4/4).

Row-count table at the end of §2 sums to 123 (9+2+5+6+2+30+23+9+11+17+3+2+4).

The quoted pchtxt header is exact: `sed -n '9p' patch/1.4.0.pchtxt` prints
`# Lines = flat file offsets (vaddr+0x100), no offset_shift. 0x19B1F4 = known gap.`
(`0x19B1F4` is indeed the "known gap" the spec discusses in R4.)

### 1.2 Layout arithmetic — closes, with one formula off by two bytes

Recomputed from the table's own constants:

- `0x2406 = 0x1A + 4*2300 - 4` and `0x2ED6 = 0x1A + 4*2992 - 4` (#1) — exact.
- `0x8FB/0x8FD/0x8FC -> 0xBAF/0xBB1/0xBB0` = 2299/2301/2300 -> 2991/2993/2992 — exact.
- `0x23F0 = 4*2300`, `0x2EC0 = 4*2992`, `0x11F8 = 2*2300`, `0x8FC = 2300` — exact.
- #60 `0x52B0 = 0x2EC0 + 0x23F0`; #62/#63 `0x64A8 = 0x2EC0 + 0x23F0 + 0x11F8` — exact.
- C start `0x47FA = 0x1A + 0x47E0`; D base `0x59F2 = 0x1A + 0x59D8`;
  new C `0x52CA = 0x1A + 0x52B0`; new D `0x64C2 = 0x1A + 0x64A8` — exact.
- preset base `0x62F4 + 0xAD0 = 0x6DC4`; record fields `0x631D/1E/20/22 + 0xAD0 =
  0x6DED/EE/F0/F2`; offsets inside the record `0x29/0x2A/0x2C/0x2E` and stride `0xAA`
  (170) — exact.
- preset block `0x985 = 2437 = 14*170 + 57`; bitstream `2992*19/8 = 7106 B`;
  `0x278 + 7106 = 0x1E3A`; section total `0x2547 = 7106 + 2437` — exact.
- object size `0x72E4 + 0xAD0 = 0x7DB4`; V7 preset area `0x6DC4 + 0xFF0 = 0x7DB4`
  (24 records) — exact.
- V8 block (R2 ruling): B `0x2EDA` size `0x2EC0` -> C `0x5D9A` size `0x1760` ->
  D `0x74FA` size `0xBB2` -> heap `0x80AC`; adjust `0x80AC - 0x1A = 0x8092`;
  presets `0x80B0`, 14*170 = `0x94C` -> `0x89FC`; object `0x90A0` leaves `0x6A4` =
  1700 B slack; clear lengths `0x5D80 = A+B`, `0x74E0 = A+B+C` — exact.

One formula does not match its constant:

**CONTRADICTION (P3).** Row #5 says the reverse-scan end pointer is `0x1A+4*N`, but the
constant is `0x2408` while `0x1A + 4*2300 = 0x240A` (patched `0x2ED8` vs
`0x1A + 4*2992 = 0x2EDA`). The constant is 2 bytes below the array end because the loop
reads `ldrh rX,[r3,#-2]` before decrementing: disassembly of `0x198FE8`
(`node G:/tmp/W4/w4-dis.mjs`):

```
0x198fe8 e92d4830 push {r4, r5, r11, lr}
0x198fec e3022408 movw r2, #0x2408
0x198ff8 e0803002 add r3, r0, r2
0x199000 e15340b2 ldrh r4, [r3, #-2]
```

The correct relation is `0x1A + 4*N - 2`. A reader re-deriving `0x2ED8` from the stated
formula would get `0x2EDA`, which is #55's B base — a different field.

### 1.3 The "65 sites" and the V8 re-encode

- `tools/v7-shift-65.json` holds exactly 65 entries, all `movw` (`(w & 0x0FF00000) ==
  0x03000000`), and all 65 offsets are **flat** (vaddr+0x100) addresses that correspond
  to table rows 55-119 (`node G:/tmp/W4/w4-shift.mjs`: "json offsets matching doc vaddr:
  5 matching flat(=vaddr+0x100): 65").
- Immediate histogram of those 65 entries reproduces the documented families exactly:
  `0x64C2:15` (14 D-base rows + #118), `0x6DC4:11`, `0x6DC0:8`, `0x6DED:5`, `0x6DEE:6`,
  `0x6DF0:5`, `0x6DF2:1`, `0x7DB4:3`, `0x2EDA:4`, `0x2EDC:2`, `0x52B0:1`, `0x52CA:1`,
  `0x64A8:2`, `0x6DA6:1` = 65.
- V7 vs V8 shipped files (`node G:/tmp/W4/w4-v8.mjs`): "v7 lines 123 v8 lines 123 /
  offset diffs 0 value diffs 59" — the document's "Same 123 pchtxt offsets as V7;
  59 movw immediates re-encoded" is exact.
- The document's "whole-.text scan for unlisted movw of the old immediates found 10
  hits" reproduces exactly. My scan (`w4-scan.mjs`) over `0x0..0x13F1DEC` for the 14
  shift immediates + `0x47E0` + `0x59D8` + `0x23F0` found 35 unlisted sites; excluding
  the heap-size immediate `0x23F0` (25 hits, all a different object family) leaves
  **10**: 3x `0x6320` (`0x4D770`, `0x4FBD4`, `0xFF3DCC`), 2x `0x240C`
  (`0x27A4E4`, `0x289EB4`), 2x `0x47E0` (`0xBB8AB8`, `0xBB8B2C`), 1x `0x62F0`
  (`0x106EC98`), 1x `0x62F4` (`0x106ECD0`), 1x `0x59D8` (`0x8C9420`). Five of those are
  the sites R5/R6 name; the other five are the `0x6320`/`0x240C` occurrences outside the
  item-box family.

### 1.4 Address-level claims checked by disassembly

All confirmed against `main.140.flat.bin`:

| claim (section) | result |
|---|---|
| #1-#3 in the entry block of `0x198F44`; `tiers.csv` has `0x198f44,19` | tiers.csv row present (`0x198f44,19,B,quest`) |
| #5/#6 interior of fn `0x198FE8`; site is its 2nd instruction | `0x198FE8` = `push {r4,r5,r11,lr}`, `0x198FEC` = `movw r2,#0x2408` |
| #9 site not a block start; falls through from `add r4,r4,#1; cmp r4,#50; bne` | disasm `0x3E89FC add r4,r4,#1 / 0x3E8A00 cmp r4,#50 / 0x3E8A04 bne / 0x3E8A10 movw r1,#0x8FC` |
| #13 clone at `0x19AB48` (1-insn prefix) | `0x19AB48 push {r4,r5,r11,lr}`, `0x19AB4C cmp r1,#23` |
| #22 block start `0x19AAB0` after an unconditional tail-call, no prologue | `0x19AAA8 pop {r4,lr} / 0x19AAAC b 0x13EFE30 / 0x19AAB0 movw r1,#0x62F0` |
| #23 site is `push {r4,lr}`; 19 UI callers | `0x198F04` = `e92d4010 push {r4,lr}`; `findCallsTo([0x198F04])` returns 19 call sites |
| #24 originals `ldr r0,[pc,#0x30]` | `0x198F08 e59f0030 ldr r0,[pc,#48] ; [0x198f40]=0x169fe74` |
| #19 site `0x19AA44` is interior; absent from `tiers.csv` | `0x19AA40 ldr r4,[r7,#0] / 0x19AA44 movw r2,#0x23F0`; `grep -i "^0x19aa44,"` -> empty |
| "0x3E8A10, 0x19AA44, 0x199EEC, 0x3D925C absent from tiers.csv" | all four greps empty |
| R2: B rebuild loop `0x199B30..0x199B70` bounded by the inline capacity at `0x199B68` | `0x199B68 add r0,r0,#1000 / 0x199B6C cmp r8,r0 / 0x199B70 bcc 0x199B30` |
| R2: stack array at `0x199B78` is `0x2EBC` bytes = 2991 u32 | `0x199B78 movw r1,#0x2EBC`; 2991*4 = 0x2EBC |
| R2: reached via fn `0x7437BC`: `0x744184 bl 0x199AE4`, `0x744194 bl 0x199E98` | both words decode exactly as stated; `0x7437BC` = `push {...}` |
| R2: `0x3E95CC` is `cmp r4,#0x18` (24 iterations) | `0x3E95CC e3540018 cmp r4,#24 / 0x3E95D0 bne 0x3E9528` |
| R4: `0x19B1F4` has no index check; only caller `0x71A584` | only `cmp r0,#128` in the 91-instruction body (no `cmp #23/#13`); `findCallsTo([0x19B1F4])` returns exactly one site, `0x71A584` |
| R5 ruling: both sites are item-box page bases | in fn `0x5B8014`: `0x5B807C movw r2,#0x240A` + `0x5B8094 mla r7,r0,r1(400),r2`; `0x5B8084 movw r3,#0x59F2` + `0x5B809C mla r2,r0,r2(100),r3`; `0x5B80A8 ldr r0,[pc,#1832] ; [0x5B87D8]=0x1282760` — the GOT literal and the `page*0x190` / `page*100` strides the ruling names |
| #120 clone at `0x19A7F8` (8 B / 2-insn prefix) | `0x19A7F8 mov r2,r0 / 0x19A7FC mov r0,#0 / 0x19A800 cmp r1,#23 / 0x19A804 bxhi lr` |
| R9 getter returns `1000 + 300*popcount + 200*bits` | `0x198F04..0x198F3C`: `mov r1,#300 / smulbb / (2 media words) / add r1,r2,r1 / mov r2,#200 / smlabb / add r0,r0,#1000 / pop {r4,pc}` |

### 1.5 Citation defects

**CONTRADICTION (P3).** §2 note on #117/#118 and R5's pro-patch bullet say
"`DEVELOP.md:149` / `DEVLOG.md:149` call `0x5B807C`/`0x5B8084` the '3 easy-to-miss
UI sites'". `DEVELOP.md:149` is a blank line; the claim is at `:151`, and it names the
**flat** offsets, not those vaddrs:

```
$ awk 'NR>=149&&NR<=151' DEVELOP.md
149
150  - 预设 24→14（借位流空间，0x1E3A 起 2437B 块）；4 处 idx≤23 guard 改 ≤13。
151  - **3 处易漏 UI/字段站点**：`0x5B817C`(B页基址)/`0x5B8184`(D页基址)/`0x19AD08`(rec+0x2E)。
```

`DEVLOG.md:149` does carry the line, and `:150` states the conversion
("vaddr 0x5B807C/0x5B8084/0x19AC08 +0x100"), so the spec's numbers are the correct
vaddrs; only the DEVELOP line number and the flat/vaddr attribution are wrong.

**CONTRADICTION (P3).** The title line identifies the 1.4.0 image as
`0100770008DD8000`, but the Suyu README the same document cites as evidence row 6
labels its MHGU results "update 0100770008DD8800"
(`.tmp/ext/SUYU-GURecomp/tools/a32recomp/README.md:54`). `0100770008DD8000` is the
base-title id (the yuzu `load/` directory uses it, so the deployment path in
`docs/history/DEVELOP-state-20261022.md` is correct); the exported image is the 1.4.0
update, whose build id `FB08F1D2…` is what the header actually carries:

```
$ sed -n '54p' G:/omp works/.tmp/ext/SUYU-GURecomp/tools/a32recomp/README.md
## Results on MHGU (update 0100770008DD8800)
```

### 1.6 Section 1's Suyu citations — all resolve

| citation | check |
|---|---|
| `arm_recomp32.cpp:1409-1413` | `sed -n '1409,1413p'`: `void ArmRecomp32::InvalidateCacheRange(...)` + "Recompiled code is fixed at build time; only the fallback caches anything." |
| `arm_recomp.cpp:1256-1264` | `ClearInstructionCache()` + "Self-modifying guest code is consequently unsupported by this backend by construction." |
| `mod_host.cpp:147-149` | `bool ApiMemWrite(...) { return data && ApiMemValid(...) && Mem().WriteBlock(...); }` (the doc omits the `data &&` guard; substance unchanged) |
| `mod_host_api.h:115-117`, `:124-126`, `:208-212`, `:68-78` | all four comment blocks match the quoted text; `ModHostModule` carries `base/span/text_start/text_end` |
| `recomp_hooks.cpp:29-37`, `recomp_hooks.h:9-13` | `Mark()` drops `off >= g_span`; the "block chaining + bitmap" comment is verbatim |
| `tools/a32recomp/README.md` | "one function per basic block" (line 6), "4.06M instructions", "100.000% (6 words left)" (line 58) |
| `docs/a32recomp/CHANGELOG.md:9` | the guest-call-into-JIT bullet is at line 9 |

### 1.7 Reproducibility gap in the shipped artefact

**CONTRADICTION (P3, artefact not document text).** The V7 patch cannot be regenerated
from the current tree. `tools/build-v7.mjs` is a stub that ends in
`console.log("V7 generator skeleton — needs full site list from reports")` and has no
`writeFileSync`. `tools/build-v7-final.mjs` at HEAD writes only
`patch/experimental-v8/1.4.0.pchtxt` (line 82); at commit `53bcc3f` the same file wrote
`patch/1.4.0.pchtxt`:

```
$ git show 53bcc3f:tools/build-v7-final.mjs | tail -2
fs.writeFileSync("G:/omp works/MHGU/patch/1.4.0.pchtxt",hdr+body);
console.log("V7 written:",lines.length,"lines");
$ grep -n writeFileSync tools/build-v7-final.mjs
tools/build-v7-final.mjs:82:fs.writeFileSync("G:/omp works/MHGU/patch/experimental-v8/1.4.0.pchtxt",hdr+body);
```

So the
spec's source list is right about which constants line up with which rows, but the
shipped 123-line V7 file is not reproducible without checking out an old commit.

### 1.8 The shipped run log settles the `[I]` cells — and contradicts the hook grouping

`docs/patches/runs/boxprobe-20261024.txt` is a run of exactly the probe §5 of this
spec prescribes (`is_block`, word compare, walk-back). Its summary line:

```
[5] summary: words matched 123/123, block starts 123/123, distinct B 103, missing B 0
```

That independently confirms §1.1's static result at run time (123/123 words) and supplies
the block-start column the table marks `[I]`: 25 sites are themselves block starts
(`is_block 1` — rows 1, 23, 57, 61, 64, 65, 66, 68, 69, 70, 71, 72, 83, 84, 85, 87, 88,
100, 105, 106, 111, 112, 117, 121, 123); the other 98 rows report their containing block
start `B`.

**CONTRADICTION (P2) — hook count.** §3 consequence 2 says the hook count "is bounded by
123 and is likely 50-70". The log gives 87 distinct `B` values for the 98 interior rows
and 25 sites that are block starts themselves; 11 of the 98 interior rows land on a
block-start site (9 distinct addresses), so the union is **103 distinct hook targets** — the log's own `distinct B 103` —
not 50-70. A port needs 25 `emulate` hooks at the block-start sites and 78 `clone` hooks
for the rest.

**CONTRADICTION (P2) — 26 rows name a clone address that does not contain the site.**
For each row below the strategy column says "clone at <addr>", but the probe's block
start for the site is a different address, so the prescribed clone would never execute
the constant (spec address -> probe B).
`node G:/tmp/W4/w4-probe2.mjs` -> "clone rows with an address: 58 mismatches: 37", of
which 26 are this case (the other 11 are the block-start rows below):

```
#10 0x19A4EC -> 0x19A544   #11 0x19A55C -> 0x19A5BC   #12 0x19AAEC -> 0x19AAFC
#18 0x19A8D8 -> 0x19A8EC   #21 0x19AA88 -> 0x19AA98   #26 0x198F04 -> 0x198F1C
#41 0x199AE4 -> 0x199B4C   #42 0x199AE4 -> 0x199BD0   #55 0x199AE4 -> 0x199BF8
#56 0x199AE4 -> 0x199C98   #58 0x199AE4 -> 0x199B04   #59 0x199AE4 -> 0x199BF8
#62 0x198BB0 -> 0x198BE4   #63 0x198C74 -> 0x198C7C   #78 0x19A8D8 -> 0x19A8EC
#79 0x198BB0 -> 0x198BE4   #80 0x198C74 -> 0x198C7C   #90 0x19A854 -> 0x19A878
#94 0x19B110 -> 0x19B198   #97 0x19B360 -> 0x19B368  #103 0x19ABE0 -> 0x19ABF0
#110 0x19A7F8 -> 0x19A808  #113 0x19B110 -> 0x19B124  #114 0x198BB0 -> 0x198BC4
#115 0x19B360 -> 0x19B430  #119 0x19ABE0 -> 0x19ABF0
```

Static corroboration for one of them: `0x198BE4` follows `bl 0x887810` (a call
boundary, which starts a new block), so the ctor's first block ends at `0x198BE0` and
the constant at `0x198BE8` / `0x198C00` lives in a later block. The same shape (an
inner `bl`) explains most of the list.

**STALE (P3) — 11 rows are block starts themselves.** Rows 57, 61, 65, 71, 83, 84, 87,
88, 100, 105, 106 are recorded as interior/clone targets, but the log reports
`is_block 1` at the site, so `emulate` is legal and no clone is needed. Rows 64, 85,
111, 121 and 123 already offer `emulate`, so there only the `[I]` wording is outdated;
for the other eleven the strategy column is wrong.

The table's two explicit groupings are exactly right ("#1-#3 at 0x198F44", "#5-#6 at
0x198FE8") and the other two are not ("#17-#18 at 0x19A8D8" — #18 is 0x19A8EC;
"#87-#88 at the serializer/deserializer" — both sites are block starts and need no
clone at all).

The document never cites this log, although the log is committed one directory away and
was produced by the probe the document prescribes.

### 1.9 Unverified in this document

- Runtime items: the AOT premise, `is_block` probes, hook behaviour and JIT coherence
  rest on the Suyu sources and on a build that is not in this repository. The static
  source citations check out (§1.6); the runtime claims are out of reach here.
- `.tmp/reports-mhgu/{recovery-report,preset-deadzone,ui-page-bound,equip-box,
  glm-r2-r5-review}.md` exist and were read for the site semantics; the cited internal
  sections (§6.2, §1.1, §230 …) were not re-audited line by line — this wave checked the
  numbers that reach the patch file, not those reports' own prose.
- `0x19B1F4`'s "copies name 0x2A and equipment area 0x80" is consistent with the
  disassembly (42-byte copy at `0x19B210`, `cmp r0,#128` blocks) but the 0x80 length was
  not traced to a single memcpy.

## 2. docs/spec-crossgame/monster-gu.md

### 2.1 Game-version assumptions

The document names no version string; its only version-bearing assumptions are the
image and the coordinate rule, both correct:

- `main.140.flat.bin` (v1.4.0). Header at flat 0: magic `NSO0`, text file offset
  `0x100` (0x10), text size `0x013F1DEC` (0x18), build id at 0x40 =
  `FB08F1D20FD1204FE7070672777F869B` — the id the pchtxt binds to.
- `flat_off = vaddr + 0x100` (`monster-ai-params.md:3`) — matches the header's text
  file offset; every field-name address cited is inside `.rodata`
  (`0x13F2000..0x172ECFA`, DEVELOP.md:22).
- 16/16 citations of the form `monster-ai-params.md:NNN`（`0x…`）put that exact address
  on that exact line (`node G:/tmp/W4/w4-params.mjs`: "address citations: 16
  mismatches: 0"), and 15 sampled addresses decode to the claimed strings
  (`w4-str.mjs`), e.g. `0x1559578 -> "mParam.hp_vital"`, `0x155c198 ->
  "mParam.em_type"`, `0x1559af3 -> "mParam.cmd_flag[i]"`.

### 2.2 Counts — confirmed against the data files

| claim | check |
|---|---|
| 93 large monsters | `monsters.json` 129 rows = class "0" 75 + class "2" 18 + class "1" 36 -> 93 large, 36 small |
| 36 small monsters, ids 4097..4144 | class "1" ids are exactly 4097..4144 (36 values) |
| 137 slots, 0..136, no gaps | `monster-slot-map-137.json`: 137 entries, slots 0..136 all present, 137 **distinct** emids |
| large 94 / small 43, interleaved 71..136 | slots with emid >= 4097 = 43 (71..111, 135, 136); the other 94 are large, spanning 0..134 |
| wiki has 94 "large" entries | `monsters.md:27` "94 = 93 + 阁螳螂·机甲" |
| `db_id` ranges 1..88 / 269,513,514,525 / 1025..1351 | matches the 93 large ids in `monsters.json` |

**CONTRADICTION (P2).** §10 says "137 槽全部有名字：136 条来自官方
`monsterName_chS`，只有 slot 133 … 官方名称为空". The slot map's own `cn_src` column
does not support 136:

```
$ node -e "…count cn_src categories…"
{ chS: 125, itemData: 4, dummy: 7, empty: 1 }
dummy slots: 105..111 (emid 4196..4202, cn "小型怪物#NNNN")
itemData slots: 22, 35, 125, 127
empty slots: 133 (cn "阁螳螂(机偶)", cn_src "none (official empty)")
```

So 125 slots have a `monsterName_chS` name, 4 are taken from `itemData_chS.gmd`,
7 carry the literal placeholder `dummy`, and 1 is officially empty. The claim that only
slot 133 lacks an official name is wrong by seven slots; the 8 dummy/empty slots are
exactly the small monsters 4196..4203 that the wiki/db does not list.

### 2.3 Save-side coordinates — the numbers are right, the cited lines are not

The document's §10 table (`kill 0x5EA6..0x5FB7`, `capture 0x5FB8..0x60C9`,
`size 0x60CA..0x62EE = 548 B`, read points `24230/24504/24778`) agrees with
`mon-size-calc.md:301` ("char_off `0x60CA`..`0x62EE`（548 B）") and with the
2026-11-03 correction banner in `docs/analysis/members/member4-header.md`
("后续切分为 `0x5EA6`/`0x5FB8`/`0x60CA`（原 `0x5EA2`/`0x5FB4`/`0x60C6`）").

**CONTRADICTION (P2).** But the rows cite `monsters.md:519-521`, and those lines still
carry the pre-correction values:

```
$ awk 'NR>=519&&NR<=521' docs/mechanics/monsters.md
519  | 击杀计数 | `obj+0x72C` | `0x5EA2..0x5FB4`（**24226..24499**） | 274 B | …
520  | 捕获计数 | `obj+0x83E` | `0x5FB4..0x60C6`（**24500..24773**） | 274 B | …
521  | 尺寸记录 | … | `0x60C6..0x62EE`（**24774..25325**） | 552 B | …（4 B × 137 = 548 = 552 − 4）
```

A reader who follows this document's citations lands on 0x5EA2 / 0x5FB4 / 0x60C6 and
552 B — a 4-byte shift and a 4-byte size error relative to the document's own table.
Either `monsters.md` §13.1 must be updated or the citation must point at
`mon-size-calc.md:301` / `member4-header.md`.

### 2.4 U1/U3 are declared both open and closed

**CONTRADICTION (P3, internal).** The status column marks
`counter_block_capacity` and `size_block_capacity` as `GU-unconfirmed (U1)` and
`unknown_slots`/`slot_92` as `GU-unconfirmed (U3)`/`(U4)`, while the prose three rows
below says "U1 关闭" (line 415) and "U3 关闭" (line 416). `monsters.md` §15 still lists
U1 as `[未确认]` with the 552-byte figure and U3 as "42 slots unknown", so the
crossgame half is contradicting both itself and the source it cites:

```
$ grep -nE '^\| U(1|3) ' docs/mechanics/monsters.md | cut -f1 -d:
634
636
$ sed -n '634p;636p' docs/mechanics/monsters.md
| U1 | 计数器数组容量 | `[未确认]` | 计数块 `274`：`137 × u16`（无表头）与 `4 + 135 × u16` …
| U3 | 槽 93..134 的身份 | **未知** | 42 个槽（93..134）无名字；clean 档证明至少 93..111 有真实计数 …
```

### 2.5 "137 槽全部有效" vs the cited model

**CONTRADICTION (P3).** `slot_key_space` is `GU-confirmed` with "137 槽全部有效
（2026-10-25 定案）" citing `mon-size-calc.md:298`/`:309-311`. The cited section says
`mon-size-calc.md:308`: "137 槽物理容量、**129 槽有效**（0..128）":

```
$ awk 'NR==301||NR==308' docs/analysis/monsters/mon-size-calc.md
| 5 | 存档体型记录 | char_off `0x60CA`..`0x62EE`（548 B） | 物理 **137**，有效 **137** | clean 92..125 …
**[已证实·布局]** 存档侧：每怪一条 `[u16, u16]`，4 B，137 槽物理容量、129 槽有效（0..128）。
```

The table at `:301`
does say "物理 137，有效 137", so the source is itself split; the document picked one
side and cited the other.

### 2.6 Citation hygiene

All 246 `file:line` references resolve (`w4-cite.mjs`: "refs total 246 … out-of-range
refs: 0"; unique 172). `member4-header.md` is cited twice without a path and lives at
`docs/analysis/members/member4-header.md`, not `docs/save-layout/`.

### 2.7 Unverified

Every `RS mapping` cell (classes such as `snow.enemy.EnemyDataTune._baseHpVital`, the
`@` paths, the "2026-10-24 夜 rsz.mjs" note) refers to the MH Rise dump, which is not in
this repository. None of it can be checked here; treated as out of scope, not as
confirmed.

## 3. docs/history/

### 3.1 DEVELOP-state-20261022.md

Dates and hashes:

- The commit it names exists and says what it is quoted for:
  `git show -s 49b0964` -> `2026-10-24 03:10:42 +0800`, subject
  "默认补丁恢复 V7; V8 移到 patch/experimental-v8 待实机". The snapshot banner's
  "当前文件 `patch/1.4.0.pchtxt`（V8 移到 `patch/experimental-v8`，commit `49b0964`）"
  is exact.
- The banner's "V6（22 行）" and "V7（123 条记录行）" are exact: `git show
  5ec46c8:patch/1.4.0.pchtxt | grep -cE "^[0-9a-fA-F]{8} "` -> 22; the shipped V7 file
  -> 123.
- "30 页扩容实机验证 … `DEVLOG.md:214` 记为通过" — `DEVLOG.md:214` is
  "- **30 页扩容验证通过**（用户实机确认）✅".
- "编辑器 5 处 1173440(XX) → 1177760(MHGU) 已修" — `DEVELOP.md:165` states the same
  five-site fix.

**CONTRADICTION (P2).** Line 27: "位流占用预设区 4080→2380B（预设名块搬至
0x1E3A）". The shipped V6 and V7 patches write `0x985` = **2437** at the two preset
length sites, not 2380:

```
$ sed -n '10,11p' patch/1.4.0.pchtxt
0019a648 852900E3   // preset block write len 2437
0019a6c0 852900E3   // preset block read len 2437
$ awk 'NR==150' DEVELOP.md
- 预设 24→14（借位流空间，0x1E3A 起 2437B 块）；4 处 idx≤23 guard 改 ≤13。
```

2380 = 14×170 is the 14-record size; the patch deliberately keeps record 14's name and
57 bytes of its equipment area (the V7 spec's R10). The doc understates the block by
57 bytes.

**CONTRADICTION (P2).** Line 8: "`hunterA_HR5.hnt` 已重打包为 N=2992 位流；猎人A 含
8 个 marker（UI 2400-2403/2900-2903）" — in the snapshot the same bullet names
(`save-snapshots/20261022-v6-ready/`), hunterA has **zero** non-empty slots at or above
2300, so it carries none of the markers:

```
$ node -e "…19-bit decode at 0x278, slots 2399..2403, 2900..2903…"
20261022-v6-ready/hunterA_HR5.hnt        2399:0 2400:0 2401:0 2402:0 2403:0 2900:0 2901:0 2902:0 2903:0
20261022-clean-reference/hunterA_HR5_V7.hnt 2400:id2016/cnt50 2401:2017/51 2402:2018/52 2403:2019/53 2900:2020/60 2901:2021/61 2902:2022/62 2903:2023/63
nonzero slots >=2300: 0 (v6-ready) / 8 (V7 reference)
```

The marker values themselves are exactly the ones the document's "待证" section
predicts (ids 2016-2019 / 2020-2023, counts 50-53 / 60-63, 19-bit slot = 12-bit id +
7-bit count), and the two files differ in only 32 bytes, in five ranges, two of which
(`0x18BC-0x18C5`, `0x1D5F-0x1D68`) are exactly the marker slots — i.e. the markers were
added to the V7 clean-reference save later (20:30), not to the 15:37 v6-ready snapshot.
So the claim is right about a hunterA file, wrong about the folder it names.

**CONTRADICTION (P3).** Line 9: "快照：`MHGU/save-snapshots/20261022-v6-ready/`、
`patch/1.4.0.pchtxt`，git 已提交". `save-snapshots/` is excluded from git:

```
$ git check-ignore -v save-snapshots
.gitignore:21:save-snapshots	save-snapshots
```

Only `patch/1.4.0.pchtxt` is tracked (`git ls-files | grep pchtxt`). The snapshots live
under the junction to `MHGU-private/` and are not in this repository's history.

Minor (P3): line 14 "物理空间 `+0x1a..+0x62F0` ≈ 6325 槽" — the span is 25,302 B, i.e.
6325.5 *four-byte* words, but the box is 2300 slots held in four parallel arrays
(A 4 B, B 4 B, C 2 B, D 1 B). "≈6325 slots" reads as a capacity claim; it is not.

Confirmed narrative claims: "存档无校验和" (`DEVELOP.md:160`), "V6 落位 22/22 行"
(the 22 V6 values are rows 1-22 of the V7 table, and all 22 original words match the
image — §1.1), "预设名块搬至 0x1E3A" (bytes at 0x1E3A are non-empty, 0x17CF is zero,
in all three converted hunter blocks).

### 3.2 PROJECT-EVAL-20261023.md

Dates and hashes:

- Date 2026-10-23: `git log` has 92 commits on that date.
- `557fee8`: `git show -s` -> `2026-10-23 22:27:55 +0800`, subject "…覆盖率口径冻结:
  tiers.csv/pass1 入库, coverage-final.py 改读仓内路径(复算 52.5%/37.3%)" — matches
  C15's "同日复算" and its quoted result.
- No other commit hash appears (the five `98abd400` hits are the base-NCA id).

Artefacts it asserts about the repo, re-checked now:

| claim | result |
|---|---|
| `docs/data/functions.csv.gz` 468 KB | 479,325 B = 468.1 KiB — exact |
| `docs/data/tierb-labels.csv` 379 lines | 379 |
| `docs/analysis/code/tierb-pass2/` 7 reports (02/04/06/07/08/09/10) | **14** now (01..14) — completed after the eval; stale, not false |
| two `monster-slot-map*.json` files | both present |
| `.tmp/mhgu/tierB2/` 14 slices | 18 entries: 14 `slice-NN.txt` + 4 `slice-11..14.asm.txt` |
| `.tmp/mhgu/inventory/tiers.csv` 23,886 lines (header + 23,885) | `split('\n').length` = 23,886 with no trailing newline (`wc -l` prints 23,885) — exact |
| `MHGU/.tmp/` does not exist | correct; `.tmp` is at the workspace root |
| `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin` exists | yes |
| tools README lists neither `state-motion3.mjs`, `vtable-crc.mjs`, `mon/mon-fn.py`, `mon/mon-classes.py` | still true of the current 42-line README |

**CONTRADICTION (P1 for any reader who reuses the arithmetic).** The whole of §4.1 is
built on "分母（函数跨度和） 5,228,277 指令 / **23,885 函数** | `code-metrics.md:8`"
(line 15/§4.1 table). The repository now says that denominator is wrong:

```
$ sed -n '6,8p;18p' docs/analysis/code-metrics.md
> … `docs/data/functions.csv.gz` 的 **23,885 行是区域平铺**，不是函数表；
> … 重建为 **52,692 个函数**（指令和仍为 5,228,277）
> … **函数数** | **52,692**（2026-11-03 重切 …；~~23,885 …~~ 是区域平铺）
$ node tools/audit/check.mjs | grep "coverage meter"
PASS coverage meter: 52692 functions / 5228277 instructions
```

The instruction total (5,228,277) is unchanged, so the "指令" side of §4.1 survives; the
function-side numbers (14,863 Tier B, 8,856 Tier A, "90% 函数 = 21,497", "≈270 片 ≈
32,400 函数") are computed on a retiled-away denominator. The eval's own snapshot banner
does not mention this item.

**STALE (P3).** The 52.5%/37.3% headline the document treats as the current calibre is
now 58.0% (project calibre) / 66.2% (≥90%-precision traceable), per `METER.md` and
`code-metrics.md:6-8`; `node tools/audit/check.mjs` prints "published project calibre
matches canonical-metric.mjs (58.0%)". Also stale: the "全文 N 行" table in Appendix A.1
— `HANDOFF.md` 212 -> 253, `code-metrics.md` 157 -> 259, `coverage-map.md` 394 -> 415,
`monster-code-map.md` 140 -> 117, `PROGRESS.md` 120 -> 107, `SUBAGENT-LEDGER.md` 32 ->
75, `tools/mhgu/README.md` 200 -> 42, `DEVELOP.md` 537 -> 539. Command:
`wc -l HANDOFF.md docs/PROGRESS.md docs/analysis/code-metrics.md docs/save-layout/coverage-map.md docs/mechanics/monster-code-map.md tools/mhgu/README.md DEVELOP.md docs/reference/SUBAGENT-LEDGER.md`
-> `253 107 259 415 117 42 539 75`.

The snapshot banner's own claims check out: `PROGRESS.md` now points at
`docs/analysis/code/coverage/METER.md` (`:99`, `:104`); `DEVELOP.md` states
12,168,003,584 B in both places (`:49`, `:304`); `SUBAGENT-LEDGER.md:31` says
"每 **30** 函数" with "~~每 200 函数~~ 作废"; `tools/mhgu/coverage/{recompute,report,
sample}.mjs` exist; the C7/C8/C14/C16/C19/C21 items all carry explicit
"superseded 2026-10-23" markers (e.g. `coverage-map.md:42` for 24372/93+36+8,
`coverage-map.md:40` for the 5430 B set-bonus block, `DEVELOP.md:343` for the 384-bit
lane reading). R8 ("不可复算") is superseded the same way: `docs/analysis/code/inventory/
tiers.csv` is now tracked (`git ls-files`), and the audit gate recomputes 52,692.

Minor (P3): C15 says "`.tmp/mhgu/tierB2/` 有 slice-01..14，`.tmp/reports-mhgu/` +
`docs/analysis/code/tierb-pass2/` 各有 7 份报告" — the docs copy now holds 14; and the
"7 份" directory listing in A.3 is likewise superseded.

## VERDICT

```
doc	claim	status	evidence
docs/patches/item-box-v7-plugin-spec.md	123 rows = 123 pchtxt lines, in order	confirmed	w4-patch3.mjs: flat mismatches 0
docs/patches/item-box-v7-plugin-spec.md	pchtxt flat = vaddr+0x100 for all 123	confirmed	w4-patch3.mjs: flat mismatches 0
docs/patches/item-box-v7-plugin-spec.md	every "original insn" word = image word	confirmed	w4-patch3.mjs: original-word mismatches 0 (123/123)
docs/patches/item-box-v7-plugin-spec.md	every "patched insn" = shipped V7 bytes	confirmed	w4-patch3.mjs: patched-value mismatches 0
docs/patches/item-box-v7-plugin-spec.md	pchtxt header line 9 quote	confirmed	sed -n '9p' patch/1.4.0.pchtxt
docs/patches/item-box-v7-plugin-spec.md	row #5 end pointer = 0x1A+4*N	contradiction	0x2408 vs 0x1A+4*2300=0x240A; loop reads ldrh [r3,#-2] at 0x199000
docs/patches/item-box-v7-plugin-spec.md	65 layout sites in v7-shift-65.json	confirmed	65 entries, all movw, all flat offsets of rows 55-119
docs/patches/item-box-v7-plugin-spec.md	V8 same offsets, 59 immediates re-encoded	confirmed	w4-v8.mjs: offset diffs 0, value diffs 59
docs/patches/item-box-v7-plugin-spec.md	10 unlisted old-immediate hits outside the box	confirmed	w4-scan.mjs: 10 (excluding the 25 hits of heap-size 0x23F0)
docs/patches/item-box-v7-plugin-spec.md	R2 loop 0x199B30..0x199B70 bounded at 0x199B68	confirmed	disasm: 0x199B68 add r0,r0,#1000; 0x199B6C cmp; 0x199B70 bcc 0x199B30
docs/patches/item-box-v7-plugin-spec.md	R2 caller chain 0x744184 bl 0x199AE4 / 0x744194 bl 0x199E98	confirmed	disasm of 0x7437BC body
docs/patches/item-box-v7-plugin-spec.md	R2 stack array 0x2EBC = 2991 u32 at 0x199B78	confirmed	0x199B78 movw r1,#0x2EBC; 2991*4=0x2EBC
docs/patches/item-box-v7-plugin-spec.md	R4 0x19B1F4 has no index guard, only caller 0x71A584	confirmed	only cmp r0,#128 in 91 insns; findCallsTo returns 1 site
docs/patches/item-box-v7-plugin-spec.md	R5 0x5B807C/0x5B8084 are item-box page bases	confirmed	mla page*400+0x240A / page*100+0x59F2; GOT 0x1282760 at 0x5B80A8 in fn 0x5B8014
docs/patches/item-box-v7-plugin-spec.md	#23 getter = push {r4,lr}, 19 callers	confirmed	0x198F04 e92d4010; findCallsTo = 19
docs/patches/item-box-v7-plugin-spec.md	#120 site 8 B into fn 0x19A7F8	confirmed	0x19A7F8 mov r2,r0; 0x19A7FC mov r0,#0; 0x19A800 cmp r1,#23
docs/patches/item-box-v7-plugin-spec.md	DEVELOP.md:149 names 0x5B807C/0x5B8084	contradiction	:149 blank; :151 names flat 0x5B817C/0x5B8184 (DEVLOG:150 gives the vaddrs)
docs/patches/item-box-v7-plugin-spec.md	1.4.0 export is title 0100770008DD8000	contradiction	cited README line 54 says "Results on MHGU (update 0100770008DD8800)"
docs/patches/item-box-v7-plugin-spec.md	Suyu evidence rows 1-12	confirmed	each cited file:line read; quotes match
docs/patches/item-box-v7-plugin-spec.md	V7 pchtxt reproducible from the named tools	stale	build-v7.mjs is a stub; build-v7-final.mjs writes only patch/experimental-v8 at HEAD
docs/patches/item-box-v7-plugin-spec.md	probe run: 123/123 words, 123/123 block starts, missing B 0	confirmed	boxprobe-20261024.txt [5] summary
docs/patches/item-box-v7-plugin-spec.md	hook count "likely 50-70"	contradiction	probe: 103 distinct targets (25 emulate sites + 78 clone blocks)
docs/patches/item-box-v7-plugin-spec.md	#41/#42/#55/#56/#58/#59 share one clone at 0x199AE4	contradiction	probe B 0x199B4C / 0x199BD0 / 0x199BF8 / 0x199C98 / 0x199B04 / 0x199BF8
docs/patches/item-box-v7-plugin-spec.md	#10 shares #7, #11 shares #8, #17-#18 share 0x19A8D8	contradiction	probe B: #10 0x19A544, #11 0x19A5BC, #18 0x19A8EC
docs/patches/item-box-v7-plugin-spec.md	#62/#79 clone at 0x198BB0, #63/#80 at 0x198C74	contradiction	probe B 0x198BE4 / 0x198C7C
docs/patches/item-box-v7-plugin-spec.md	rows 57/61/65/71/83/84/87/88/100/105/106 are "[I] interior"	contradiction	probe is_block 1 at each site
docs/patches/item-box-v7-plugin-spec.md	runtime AOT/JIT/hook behaviour	unverified	needs the Suyu build and a running game
docs/spec-crossgame/monster-gu.md	flat_off = vaddr + 0x100 on main.140	confirmed	NSO0 header: text file offset 0x100, text size 0x13F1DEC, build id FB08F1D2…
docs/spec-crossgame/monster-gu.md	16 mParam addresses at the cited lines	confirmed	w4-params.mjs: 16 citations, 0 mismatches; 15 strings decode as claimed
docs/spec-crossgame/monster-gu.md	93 large / 36 small monsters	confirmed	monsters.json 75 class0 + 18 class2 + 36 class1
docs/spec-crossgame/monster-gu.md	137 slots, large 94 / small 43, no gaps	confirmed	slot map: 137 distinct emids, 43 slots >=4097, 94 large
docs/spec-crossgame/monster-gu.md	136 names from monsterName_chS, only slot 133 empty	contradiction	cn_src: chS 125, itemData 4, dummy 7, empty 1
docs/spec-crossgame/monster-gu.md	kill/capture/size char_off 0x5EA6/0x5FB8/0x60CA	confirmed	mon-size-calc.md:301; member4-header.md 2026-11-03 banner
docs/spec-crossgame/monster-gu.md	those values are what monsters.md:519-521 say	contradiction	monsters.md:519-521 still print 0x5EA2/0x5FB4/0x60C6 and 552 B
docs/spec-crossgame/monster-gu.md	U1 and U3 are closed	contradiction	status column still GU-unconfirmed (U1)/(U3); monsters.md §15 still open
docs/spec-crossgame/monster-gu.md	137 slots all effective	contradiction	cited mon-size-calc.md:308 says 137 physical / 129 effective
docs/spec-crossgame/monster-gu.md	all file:line citations resolve	confirmed	w4-cite.mjs: 246 refs, 0 out of range
docs/spec-crossgame/monster-gu.md	RS-side class/field/path cells	unverified	MH Rise dump is not in this repository
docs/history/DEVELOP-state-20261022.md	commit 49b0964 moved V8, restored V7	confirmed	git show -s 49b0964 (2026-10-24 03:10)
docs/history/DEVELOP-state-20261022.md	V6 = 22 lines, V7 = 123	confirmed	git show 5ec46c8:patch/1.4.0.pchtxt = 22; patch/1.4.0.pchtxt = 123
docs/history/DEVELOP-state-20261022.md	30-page live test recorded at DEVLOG.md:214	confirmed	line 214 "30 页扩容验证通过（用户实机确认）"
docs/history/DEVELOP-state-20261022.md	editor fix 5x 1173440 -> 1177760	confirmed	DEVELOP.md:165, DEVLOG.md:107
docs/history/DEVELOP-state-20261022.md	preset area 4080 -> 2380 B	contradiction	both pchtxt length sites write 0x985 = 2437; DEVELOP.md:150 says 2437
docs/history/DEVELOP-state-20261022.md	hunterA in 20261022-v6-ready has 8 markers	contradiction	that file has 0 nonzero slots >=2300; markers are in clean-reference/hunterA_HR5_V7.hnt
docs/history/DEVELOP-state-20261022.md	marker ids/counts 2016-2023 / 50-53, 60-63	confirmed	19-bit decode of the V7 reference save gives exactly those 8 values
docs/history/DEVELOP-state-20261022.md	snapshots committed to git	contradiction	git check-ignore: .gitignore:21 excludes save-snapshots
docs/history/DEVELOP-state-20261022.md	inline box space ≈ 6325 slots	contradiction	0x62F0-0x1A = 25,302 B = 6325.5 words, but capacity is 2300 slots in 4 arrays
docs/history/PROJECT-EVAL-20261023.md	dated 2026-10-23; commit 557fee8 same day	confirmed	git log: 92 commits on 2026-10-23; 557fee8 22:27:55
docs/history/PROJECT-EVAL-20261023.md	denominator 23,885 functions	contradiction	code-metrics.md:6-8/:18 retile to 52,692; audit gate "52692 functions"
docs/history/PROJECT-EVAL-20261023.md	functions.csv.gz 468 KB	confirmed	479,325 B = 468.1 KiB
docs/history/PROJECT-EVAL-20261023.md	tierb-labels.csv 379 lines	confirmed	wc -l = 379
docs/history/PROJECT-EVAL-20261023.md	tiers.csv 23,886 lines (header + 23,885)	confirmed	split('\n').length 23,886, no trailing newline
docs/history/PROJECT-EVAL-20261023.md	tierb-pass2 has 7 reports	stale	14 files now
docs/history/PROJECT-EVAL-20261023.md	52.5% / 37.3% is the current calibre	stale	METER/code-metrics: 58.0% project calibre, 66.2% independent
docs/history/PROJECT-EVAL-20261023.md	Appendix A.1 line counts (HANDOFF 212, README 200, ledger 32 …)	stale	current 253 / 42 / 75 / 259 / 415 / 117 / 107 / 539
docs/history/PROJECT-EVAL-20261023.md	banner: PROGRESS->METER, NCA 12,168,003,584 B, ledger 30, coverage tools	confirmed	grep hits at PROGRESS.md:99,:104; DEVELOP.md:49,:304; SUBAGENT-LEDGER.md:31; tools/mhgu/coverage/
```

## Narrative claims the repository contradicts (short list)

1. `docs/history/DEVELOP-state-20261022.md:27` — "预设区 4080→2380B". Both the V6 patch
   (`git show 5ec46c8:patch/1.4.0.pchtxt`) and V7 write 2437 B (`0x985`), and
   `DEVELOP.md:150` says 2437 B.
2. `docs/history/DEVELOP-state-20261022.md:8` — "猎人A 含 8 个 marker" in
   `save-snapshots/20261022-v6-ready/`. That file has none; the markers exist in
   `save-snapshots/20261022-clean-reference/hunterA_HR5_V7.hnt` (exact ids and counts
   confirmed).
3. `docs/history/DEVELOP-state-20261022.md:9` — "git 已提交" for the snapshots.
   `save-snapshots/` is gitignored (`.gitignore:21`); only the patch file is tracked.
4. `docs/history/PROJECT-EVAL-20261023.md` §4.1 — all function-side arithmetic rests on
   23,885 functions; the repository now retiles to 52,692.
5. `docs/spec-crossgame/monster-gu.md:416` — "136 条来自官方 monsterName_chS … 只有
   slot 133 为空"; the slot map's `cn_src` gives 125 chS / 4 itemData / 7 dummy / 1 empty.
6. `docs/spec-crossgame/monster-gu.md:394-395` — cites `monsters.md:519-521` for
   0x5EA6/0x5FB8/0x60CA and 548 B, while those lines still read 0x5EA2/0x5FB4/0x60C6
   and 552 B.
7. `docs/patches/item-box-v7-plugin-spec.md:129` — "`0x1A+4*N`" for a constant that is
   `0x1A+4*N-2` (the loop pre-reads `[r3,#-2]`).
8. `docs/patches/item-box-v7-plugin-spec.md` §3 — "hook count … likely 50-70" and the
   "shares one clone" groupings; the committed probe log gives 103 distinct targets and
   26 rows whose named clone address does not contain the site (§1.8).

## Difficulties

- The five `.tmp/reports-mhgu` reports the patch spec cites are present, but the spec's
  site semantics depend on their internal sections; this wave re-derived only the
  numbers that reach the pchtxt (offsets, immediates, group sizes) and spot-checked
  semantics by disassembly. A full re-audit of those reports is a separate job.
- The probe log stops at `is_block`/word comparison: it says nothing about dispatch,
  hook firing or JIT coherence, so §1.8's 103 is a count of hook targets, not a measured
  runtime cost.
- The MH Rise side of `docs/spec-crossgame/monster-gu.md` (roughly half its cells) is
  unverifiable here: `rszmhrise.json` and the RS romfs live in the MHRS workspace, not
  in MHGU.
- The 19-bit save-slot packing is nowhere documented in the reviewed documents; the
  decode used here (LSB-first, 12-bit id + 7-bit count) was inferred from the marker
  save and reproduces the document's expected ids and counts exactly, but a second
  save did not carry the markers, so the encoding is confirmed only at those 8 slots.
- `git log` in this repo reports dates in +0800; all date comparisons were made on the
  committer date string as printed.
