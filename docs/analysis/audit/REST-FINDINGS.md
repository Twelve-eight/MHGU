# REST slice — supplementary review, part 2 (22 docs)

Denominator frozen by `docs/analysis/audit/MANIFEST.tsv` (189 docs) and
`docs/analysis/audit/slices/*.txt`. This slice: `analysis-monsters` (6),
`analysis-save-io` (4), `history` (2), `patches` (1), `editor-spec` (3),
`root` (3), `analysis` (1), `analysis-gameplay` (1), `spec-crossgame` (1).

Verdicts: **OK** 90 · **WRONG** 22 · **STALE** 20 · **UNVERIFIABLE** 9 · **MISSING** 0 · **NA** 0.
Every row in `REST.tsv` carries the command and its output; this file groups the
load-bearing ones and records cross-document contradictions.

Artifacts actually used for recomputation: `main.140.flat.bin` (25,472,632 B,
flat = vaddr + 0x100, `TEXT_END = 0x13F1DEC`), the 8 `.hnt` files and 6 `system`
files under `save-snapshots/`, `docs/data/mhgu.db` (18,333,696 B),
`docs/data/json/*`, `docs/data/class-inventory.tsv`,
`docs/analysis/code/inventory/{tiers.csv,coverage-report.tsv,METER.md,RETILE.md}`,
`editor/ui` + `editor-src/MHGU存档修改/MainForm.cs`, `patch/1.4.0.pchtxt`
(123 lines) and `patch/experimental-v8/1.4.0.pchtxt`.

---

## 1. Denominators and headline numbers

### 1.1 `5,228,411` is wrong; the consistent sum is `5,228,277`

`docs/analysis/code-metrics.md:10` and `docs/PROGRESS.md:91` both print
`.text 0x100..0x13F1DEC / 5,228,411 条指令`. Two independent recomputations disagree:

```
node -e "console.log((0x13F1DEC)/4, (0x13F1DEC-0x100)/4)"
  5228347 5228347          # words in vaddr 0..TEXT_END, and in flat 0x100..TEXT_END
node: sum of functions.csv.gz column insns   -> 5228277
node: sum of tiers.csv column insns         -> 5228277
```

So `.text` holds 5,228,347 words, of which 5,228,277 are covered by the function
table (70 words of tail gap). `5,228,411` is 64 above the word count and 134 above
the function coverage; the same number also mixes the vaddr range (`0x0`) with the
flat range (`0x100`). The count must be replaced by 5,228,277 wherever it is used
as the instruction denominator (`code-metrics.md` §6/§8/§9, `PROGRESS.md` §G).

### 1.2 The 23,885-function denominator is superseded (2026-11-03)

`docs/analysis/code/inventory/RETILE.md` (commit `3a7c731`, 2026-11-03) shows
`docs/data/functions.csv.gz` is a **region tiling**: 46,087 `push {..,lr}`
prologues, 23,885 regions, and the real function count is **52,692**.
`docs/analysis/code/inventory/METER.md` adds that `code-metrics.md`'s
72.8% / 52.2% cannot be rerun and reports, on the retiled table, tier A =
**52.9 % instructions / 48.3 % functions** (`coverage-report.tsv`)
(or 49.1 % with the three extra evidence files). `code-metrics.md`,
`PROGRESS.md` §G and `HANDOFF.md:21` all still quote the old denominator without
a retile notice.

Verified intact inside the old table (so the tables themselves are reproducible):

```
node: tiers.csv -> A 8856 / 2,690,231 insns (51.46%) ; B 14863 / 2,533,932 ; C 166 / 4,114
node: otomo-ot & tier=A -> 1,041 rows / 224,608 insns (4.30% of .text, 8.35% of tier A)
node: 166 table ids at 0x1597EA4 minus map137 -> 73 without a counter slot
```

### 1.3 `227,386 B` is the end offset, not the member-layer length

Three docs describe the member layer as `char_off 0x278..0x3783A = 227,386 B`
(`PROGRESS.md:13`, `social-checksum.md` C1③, `editor-spec/01` field table).
`0x3783A = 227,386` is where the tail starts; the range length is
`227,386 − 632 = 226,754`:

```
node -e "console.log(0x3783A-0x278)"   -> 226754
```

The 88 % structural-coverage formula uses 227,386 as the member length, so it
double-counts the 632 B header (the effect on the published 87.9 % is 0.05 pp,
but the member-layer denominator, the 2,743 B gap and the field-level share all
inherit the error).

### 1.4 Field-level share: `78 %` and `165 KB` cannot both be true

`PROGRESS.md:24` says the member layer is ~78 % field-level and, in the same
bullet, "≈165KB / 1,177,760B ≈ 14%"; its own component list
(`12,955 + 9,543 + 76 + 115,072 + 35,131 + 822`) sums to 173,599 B:

```
node: 224643*0.78 = 175222 B (14.9% of the block, 171 KiB)
node: 12955+9543+76+115072+35131+822 = 173599
```

78 % of 224,643 B is ~175 KB / 14.9 %, not 165 KB / 14 %. One of the two numbers
must be dropped; the component list supports ~175 KB.

---

## 2. `docs/README.md`, `docs/PROGRESS.md`, `docs/PRIVATE-DATA.md`

### 2.1 `docs/README.md` — index is sound, two defects

All 20 files it lists under `save-layout/`, `analysis/members/`,
`analysis/fields/`, `save-io/` exist (`[ -e ]` loop: 20 OK / 0 missing), both
inline links resolve, `mhgu.db` is 18,333,696 B, and the decimal `hunterAdds`
table is exact.

* **WRONG** `19 成员槽 = 18 反序列化器 + 2 fixup`. `member-census.md:29` states
  the dispatcher makes **20 calls** (19 `bl` + 1 tail `b 0x2282a8`) over **19
  member objects**; `0x521398` is member[2]'s second segment, and the two
  post-load fixups are extra calls, not slots. `18 + 2 = 20 ≠ 19`.
  `PROGRESS.md` §C.1 repeats the same phrasing.
* **WRONG** `AGENTS.md §5/§6` citation: `git ls-files | grep -c '^AGENTS.md'`
  → `0`; the file exists only one level above the repo (`../AGENTS.md`), so the
  public index points at a document the repo does not ship.

No stale **status** line: the file carries no status claims. (The task text
mentions README/GOAL/PROGRESS; `GOAL.md` is **not** in `MANIFEST.tsv` — the frozen
denominator has no row for it — so no verdict is issued here.)

### 2.2 `docs/PROGRESS.md` — stale status lines and their successors

| line / claim | state | superseded by |
|---|---|---|
| §G denominator `5,228,411 条指令 / 23,885 个函数` | STALE | commit `3a7c731` (2026-11-03): `functions.csv.gz` is a 23,885-region tiling; retile = 52,692 functions, instruction sum 5,228,277 (`RETILE.md`, `METER.md`) |
| §G `L1 80.8% / 71.7%（10 折）` and `自动推断止步 ≈80.8%` | STALE | `METER.md` (2026-11-03): the 10-fold numbers cannot be rerun from the repo; rerunnable chain gives tier A 62.1 % (old table + 3 evidence files) / 49.1 % (retiled) |
| §G `L1 子系统（全 23,885 函数）留出验证精度 72.8%` | STALE | same: denominator is a region tiling; `coverage-report.tsv` on the retiled table = tier A 52.9 % insns / 48.3 % fns |
| §A member layer `0x278..0x3783A = 227,386` | WRONG | range is 226,754 B (see §1.3) |
| §A field level `165KB / 14%` next to `78%` | WRONG | 78 % = ~175 KB / 14.9 % (see §1.4) |
| §C.1 `19 槽 = 18 + 2` | WRONG | `member-census.md:29` (20 calls / 19 objects) |

Lines that hold up (recomputed, not copied): structural 88 %
`(227,386 + 950,374×0.85)/1,177,760 = 87.90 %`; tier table A/B/C; the otomo
sample base 1,041 rows / 224,608 insns; the two unframed tail segments
100,903 B and 48,247 B; the 12,168,003,584 B base NCA; the editor write window
(now `1177760` with `Math.Min(512, …)` at `MainForm.cs:361`); rows 1–5 of the
remaining-work table are indeed finished (`SUBAGENT-LEDGER.md:16-22` PASS).

### 2.3 `docs/PRIVATE-DATA.md` — verified

* All six paths exist and are the declared link type:
  `main.140.flat.bin` HardLink → `MHGU-private\main.140.flat.bin`;
  `save-snapshots` and `editor-src` Junctions; `mhxx-wiki`, `mhgu.db`,
  `analysis/dumps` present.
* `.gitignore` covers them: `git check-ignore -v docs/data/mhgu.db` →
  `.gitignore:51`, `docs/data/json/items.json` → `:35`;
  `git ls-files` tracks exactly the two slot maps, matching the stated exception.
* `98abd400…nca` = 12,168,003,584 B, matching the text; `G:/backups/MHGU-private`
  exists.
* **UNVERIFIABLE** "12 G, 35,531 files" — no file count is committed and the
  12 GB romfs tree was not enumerated.

---

## 3. Monster analysis (6 docs)

`mon-quest-dispatch.md` is the cleanest document in the slice: 114 entries at
`0x2484F0`, 49 distinct targets with counts 22/14/14/9/6/6, three `movw #0x72C`
sites at `0x248984/0x2489A8/0x2489CC`, no non-SP store in the function, unique
caller `0x2456E8`, outer table `0x2451FC[28] = 0x4E0`. The `uxtah r5,r5,r1`
reading at `0x5230EC` (which `mon-counter-slots.md` U1 leaves undecided) is
correct: `0xE6F55071` is `UXTAH r5,r5,r1`.

`mon-class-map.md`: the name pool starts at `0x1551AC6`, `bl 0x7aedcc` appears
exactly **3,205** times, and every sampled class size matches
`class-inventory.tsv` (`cEmSizeCalcTblElement` 32, `uEnemy` 51,840,
`uEm001_00` 51,920, `uEm084_00` 156,448, `uEm088_00` 54,528). Three defects:

* **WRONG** — the "23 B non-string data" between `cPartsVisibleInfo` and
  `cPartsVisibleGroup` is two UTF-8 member names of `cPartsVisibleInfo`:
  `パーツ番号` and `描画`.
  ```
  node -e "utf8 of bytes 0x15532B2..0x1553330"
    -> rMonsterPartsManager::cPartsVisibleInfo\0パーツ番号\0描画\0rMonsterPartsManager::cPartsVisibleGroup…
  ```
  Consequence: the ASCII-only string counts 474/475 are correct, but
  `cPartsVisibleInfo` is not an empty "nested class" — it has two members, and
  §9.3's "unparsed" gap is closed.
* **WRONG** — §5bis says `0x4EDEC` materialises "all `uEm###_00`(61) + `uEms###_00`(29) + …(105 处)".
  The function at `0x4EDEC` ends at `0x4EE30` (`pop {r11,pc}`); the registrations
  live in a separate function starting at **`0x4F078`** (`push {r4,r5,r6,r7,r8,lr}`).
  `node`: all 61 `uEm` names have an `add rX,pc,rY` site inside `0x4F078`.
  (The `29` is also wrong — the pool has **28** `uEms` ids, as the doc's own §7
  says. `class-inventory.tsv` inherits the function misattribution: it lists
  `uEm001_00` with `registrar_fn 0x4edec`, `registrar_site 0x4f180`, two
  different functions.)
* **OK-with-note** — §5's "3,205 registration points / 3,204 names" is right
  (3,205 `bl` sites; `class-inventory.tsv` holds 3,201 unique names, i.e. three
  duplicate registrations).

`mon-counter-slots.md`: the binary tables are exactly as published
(`0x162BF0C` = 166 u16, base ids 1..87, no ≥4096; `0x1597EA4` = 137×8 B with
slot == row 137/137; second copy 112 rows at `0x164F7E4` ending at 4202; layout
71/41/23/2 = 94 large + 43 small). Two problems:

* **WRONG** — "`0x50B64` 在 .text 内共 60 处调用点"; there are **53**
  (`node: bl sites to 0x50B64` — first `0x4A878`, last `0x560CAC`, both
  endpoints exactly as quoted).
* **STALE** — §4.3/§4.5 call the repo's `monster-slot-map.json` "129 items,
  93 large @0..92 + 36 small @93..128, shifted after slot 71". The file was
  fixed in commit `9293e14` (2026-10-25): it now has **137 rows**, 94 large /
  43 small, **0 mismatches** against `0x1597EA4`, slot58 = 69 and slot61 = 76.
  `monster-slot-map-small.json` no longer exists (merged).

`mon-em-units.md`: the `.cro` pointer array is exact (137 pointers at
`0x1732050`, 87 distinct names, `roEms100` ×7, terminator 0 at `0x1732274`,
`k58=roEm069`, `k61=roEm076`), as are the 61 `uEm` ids, 28 `uEms` ids and the
`mhgu.db` split 129 = 75 + 36 + 18. Two problems:

* **WRONG** — C2 concludes `uEm###_00` names have "no xref … dead strings, not an
  index". They are materialised through the *pc-relative delta* form that this
  same folder documents in `mon-class-map.md` §3:
  ```
  node: pc-relative materialisation of uEm001_00 -> 0x4F178
  FLAT disasm 0x4F170: ldr r1,[pc,#3856]=0x1503654 ; 0x4F178 add r1,pc,r1 ; 0x4F180 bl 0x7aedcc
  node: 61 of 61 uEm names have such a site; all sites lie in the function at 0x4F078
  ```
  C2 searched absolute words, literal values inside the pool, `movw/movt` and
  `add rX,pc,#imm` — none of which catches `ldr`-delta + `add rX,pc,rY`.
* **STALE** — the `槽` columns of C5/C6 use the superseded 129-slot layout
  (`uEm004` → 71, `uEms001` → 93); the settled map puts `uEm004` at 112 and
  `uEms001` at 71. C7's 58/61 ruling is correct and matches the current JSON.

`mon-size-calc.md`: the save-side numbers are exact (clean 42 non-zero, all
≤ 70, 92..125, 17 `mini == maxi`; dirty 74, 88..154 with `i=26` = 94/154;
`crc32raw` anchors `0x5ADC692C` @ `0x160FDD4` and `0x1800EB37` @ `0x160FDDC`,
each exactly once; class/member name hashes absent). One defect plus two stale
columns:

* **WRONG** — §4 says dirty has "21 条非零尺寸记录" at `0x62C6..0x62DA`; the
  measured values are **14** records spanning `0x628A..0x62DA` (§10 of the same
  doc already says 14). `0x62CE` is index 129, not 128.
* **STALE** — §10's per-slot monster names come from the old 129-slot map
  (index 112 is emid 4 / Basarios, not Ceanataur).
* **STALE** — "physical 137 / valid 129" — under the settled map all 137 slots
  are meaningful.

`mon-ai-entry.md`: the em043 dispatch table (`0xE81B74` = 48 54 60 6c 16c 16c
9c a8 b4 d8 114 120 12c 148 16c 16c 154 160), the `.data` record at
`0x17C6FE0`, the 4 callers of `0x52308C` and the 94 callers of `0x6AA9B8` are
exact. The `+0x73E0` census reproduces within heuristic error (638 `movw`
sites in 481 prologue-derived functions; 87 sites with `ldrb`+`cmp #17`, vs the
doc's 477/89). One **WRONG** row: §3's negative table still gives
`emXXXFwMove @0x15533DB` — `0x15533DB` is `uEnemyActCustom`; the template is at
`0x15533CF` (as E9 itself notes).

`entry-map.md` (gameplay): three of the five `movw` censuses are exact
(`0x72C` 68 sites/39 fns, `0x83E` 12/9, `0x52C` 8/8, `0x62C` 10/10), but
`0x42C` is **361** sites, not 359 (78 functions is right). The `0x52308C` role
cell is **WRONG**: it says the accessor sums `ldrh[obj+0xB0] + [obj+0xB8]`,
while `0x5230D0/D4` read `kill[slot]` at `r1+2*slot` and `capture[slot]` at
`r1+0x112+2*slot` (verified in `mon-quest-dispatch.md` §4.1 and by the three
`movw #0x72C` sites).

---

## 4. Save-IO (4 docs)

`social-checksum.md` and `tail-containers.md` are byte-exact where it counts:

```
node: social region 0xC8800..0x11F8A0 (356,512 B)
  clean slot1 nonzero 200,479 (56.2%) ; dirty slot0 127,946 (35.9%)
  cross-save diff 239,842 (67.3%) ; first 32 B zero in both
node: 0xBD4B1..0xBD722 all 0x10 ; {0f,10} run ends 0xC71BD (len 40,204)
      0x117125..0x11B636 zero (len 17,681) ; tail nonzero 2,098 / 17,002
node: 0xC9B99 + k*73, k=0..49 -> 50/50 inflate to 6,328 zero bytes, len 29
node: 16 zero holes >=256 B, total 30,043 ; closure 1,966+193,376+174,838+
      248,609+17,681+206+4,700+12,096 = 653,472
node: same-role diff 470,296 (71.969%) ; clean-only 225,499 ; dirty-only 93,390
```

Defects: `social-checksum.md` C4 quotes the pre-fix editor (`821248` three
times); the current `MainForm.cs` has **zero** occurrences of 821248 and uses
`1177760` with the clamp, i.e. the doc's own R0 recommendation is implemented
(STALE). Its C1③ carries the 227,386 length error (WRONG). C3's method depends
on `analysis/movw-index.json`, which is not in the repo (UNVERIFIABLE), exactly
as the doc's method-boundary note says.

`tail-containers.md`: only two one-off boundary errors — the 16 B grid is
**22,939** frames (delta 16 × 22,340), not 22,940/22,341. Everything else
(zero-hole table addresses and lengths, zlib grid, closure, density, text
counts) reproduces.

`tail-dense-3783A.md`: the segment MD5s, 98,295 zero bytes, the mod-16 residual
table (peak 15,813 at r=8), the fill-pattern counts (8,959 / 9,408 / 9,005 /
9,745 / 59,167), lag-16 0.3977 vs 0.1543/0.1554 and lag-432 0.4274 all match.
Phase B: 7,291 records, header 7,291/7,291, payload 58,328 B, entropy 7.534,
lag16 0.5277, u32 count 7,292 — the doc's "7,292/7,292" is the u32 count, not
the record count (off by one). Non-zero runs 24,965 vs 24,966 (boundary).

`write-side-desc.md`: the 44 B constructor (28 instructions at `0xDABA4`), the
write entry's call list (7×`0xDABA4`, `0x275A30`, 2×`0x13EFE30`, `0x13EFDD0`,
7×`0xDADF0`, `0x3E75F8`, 7×`0xDAD24`, no `0x3DF378/0x3DF2A8`) and the
17 `bl` + 1 tail `b 0x55D45C` writer dispatch are exact. Two substantive
errors:

* **WRONG — `0x0B1` is not an HR copy.** The write at `0x3E1054` takes its
  source from `obj+0x506`, not `obj+0xB0`:
  ```
  FLAT disasm 0x3E104C: e3000506 movw r0,#0x506
             0x3E1050: e19900b0 ldrh r0,[r9,r0]
             0x3E1054: e18c00b1 strh r0,[r12,r1]
  node: 0x0B1 = 0 in all 8 .hnt and all 18 system slot blocks, while HR = 5/8/10/198
  ```
  `editor-spec/01` invariant 3 already REFUTED the copy from the same saves;
  `editor-spec/03` still asserts it (see §6).
* **WRONG — the "labels were swapped" verdict.** `SUBAGENT-LEDGER.md`'s
  WriteSideDesc row records the veto: `0x14B0B0` = 11 reads / 0 writes,
  `0x14B1C4` = 0 reads / 10 writes, "原标注正确". The doc's own assignment
  (`0x14B0B0` reader, `0x14B1C4` writer) is right; its claim that the older docs
  had them backwards is not.

The `0x270..0x273` "never written" claim stays UNVERIFIABLE: no direct store
exists in the function, but the header is also assembled by a 632 B `memcpy`, so
"never written" needs a full dataflow proof.

---

## 5. Editor specs and the patch spec

`editor-spec/01`: the container constants are all exact
(`5,159,100 B`, `0x14 = 0x36B2EE74`, `0x1C = 0x4EB898`, `0x24 = 0xC6`,
used flags `1,1,0`, offset table `0x18CC78/0x2AC53C/0x3CBE00 = hunterAdds − 0x24`),
as are the 7×44 B records (runtime vptr `0x193A514`) and the four quoted
observed values (70,310 / 3,355,345 in `system_CLEAN` slot1 HR 8;
1,560,082 / 8,345,419 in the dirty `system` slot0 HR 198). Gap 1 is closable
with the offset-table bytes above (payload-relative = block − 0x24).

One **WRONG** row: "slot state word at `system 0x0050 + 4*slot`, must equal 1".
The bytes are `0x756E736E` and `103`, and the code compares
`[r0 + 4*slot + 0x2C]` where `r0` is the save-context object (its `+0x28` holds
the payload pointer), not the payload buffer:
```
node: system 0x50 = 0x756e736e, 0x54 = 103, 0x58 = 0
FLAT disasm 0x3E121C: add r2,r0,r1,lsl #2 ; 0x3E1220 ldr r2,[r2,#44] ; cmp r2,#1
```
An implementer following this row would reject both used slots as corrupt.

`editor-spec/02`: the 19-bit codec, the 5,463/7,106 B sizes, the three closure
sums (`0x62EE+0x11940=0x17C2E`, `+0x8CA0=0x208CE`, `+0x1540=0x21E0E`), the
legacy/V7 preset ends (`6095+24*170=10175`; `7738+14*170=10118`, 57 B dead),
the pouch occupancy (21 clean / 24 dirty), the decoded pouch ids (10:10, 88:6)
and the 42 B preset name (`设置01`, 8 B + zeros) all reproduce. No defects found.

`editor-spec/03`: monster arrays are exact (kill 62 / max 45, capture 26 / max 3,
capture and size zero on 71..111/135/136, size 42 non-zero), as are the 137-slot
layout, palico arithmetic (`0x23BB6 + 324*84 = 0x2A606`, end `0x2C466`), the
medal pair (clean 12/12 bits with first 17 B equal; dirty 132 vs 33 bits) and
the palico field table (name, 9×RGBA ending `FF`, `id7`, owner name at `+0x9C`,
residue `0x066025E9`). One **WRONG** row: `HR … second copy char_off 0x0B1`
(0 in all samples; see §4). The doc's own "write both copies identically" rule
would therefore corrupt the opaque 224 B block with zeros.

`patches/item-box-v7-plugin-spec.md`: all 123 rows match the pchtxt — the
document's vaddr column plus `0x100` equals the pchtxt offset for every row
(0 mismatches), all 123 lines are 4-aligned `.text` words, the group table sums
to 123, and the V8 re-encoded immediates (`74FA`, `80B0`) are present in
`patch/experimental-v8/1.4.0.pchtxt`. No defects found.

---

## 6. Cross-document contradictions inside this slice

| # | contradiction | which side holds |
|---|---|---|
| 1 | `editor-spec/01` invariant 3: `0x0B1` REFUTED as HR copy vs `editor-spec/03` §A: "second copy at 0x0B1, write both identically" | 01 holds (bytes + `0x3E1050` reads `obj+0x506`) |
| 2 | `mon-class-map.md` §3: names are materialised by `ldr`-delta + `add rX,pc,rY` vs `mon-em-units.md` C2: "no xref, dead strings" | `mon-class-map` holds (56 registration sites found) |
| 3 | `entry-map.md`: `0x52308C` sums `[obj+0xB0]+[obj+0xB8]` vs `mon-quest-dispatch.md` §4.1: `kill[slot]+capture[slot]` at `+2*slot` / `+0x112+2*slot` | `mon-quest-dispatch` holds (disassembly) |
| 4 | `mon-counter-slots.md` §4: repo slot map is shifted after slot 71 vs the file now being 137/137 identical to `0x1597EA4` | the file was fixed on 2026-10-25; the doc is stale |
| 5 | `mon-size-calc.md` §4: 21 high-index dirty records vs §10: 14 | 14 is measured |
| 6 | `mon-em-units.md` C5/C6 slot numbers vs `mon-counter-slots.md` §4.2 layout | `mon-counter-slots` holds |
| 7 | `PROGRESS.md` 227,386 B member layer vs `DEVELOP.md` 12,955 B member#4 inner span | both are consistent only if 227,386 is the end offset (226,754 B length) |

---

## 7. What the slice still trusts without a committed artifact

* `1,923`/`1,937` string-bearing functions and the `725` seed set: the `strings`
  column in `docs/data/functions.csv.gz` is empty in all 23,885 rows and
  `.tmp/mhgu/inventory/functions2.csv` is gone. `docs/analysis/code/inventory/
  attr-strings.tsv` (1,212 rows) is a later, different extraction.
* The 10-fold 80.8 / 71.7 and the 1,450-sample 94.7 % tier-A precision:
  `validate-repeat.mjs` exists but its fold inputs are not committed.
* pass3's A/B/C counts: `docs/analysis/code/tierB3p` is a 0-byte file.
* `analysis/movw-index.json` (172,435 rows) cited by `social-checksum.md` C3.
* `mon-size-calc.md`'s "83 / 54 valid rows" in the romfs size table (private
  romfs only).

---

## Difficulties

* The `read` tool resolves bare relative paths against the workspace root
  (`G:/omp works`), not the repo: `read docs/README.md` returned the *workspace*
  README (a StS2/workspace index with `knowledge/`, `handoff/`, `audit/`
  directories that do not exist here). I audited and then discarded that
  document; the real `MHGU/docs/README.md` was read with an explicit
  `grep/wc/cat` on the repo path. Any slice that reads `docs/...` by bare path
  may hit the same substitution.
* `.tmp/` is empty (cleaned), so every doc whose evidence lives there (monster
  scripts, `functions2.csv`, `movw-index.json`, tierB2/3 inputs, the otomo
  sample reports) can only be checked against its *recomputation from the
  binary/saves*, not against its own output. Where I could not re-derive the
  number (10-fold folds, pass3 slices), the row says UNVERIFIABLE rather than
  guessing.
* Function-boundary heuristics differ: `+0x73E0` gives 477/89 in the doc and
  481/87 with a plain `push {..,lr}` walk, and `entry-map`'s `0x42C` count is
  361 vs 359. These are recorded as OK/WRONG per the size of the gap; a shared
  real-function table (`RETILE`) would settle them and should be the reference
  for any future recount.
* Two byte facts that several docs get wrong are only visible by reading the
  sample saves, not the analysis notes: the `0x0B1` byte is 0 in every save,
  and the `system 0x50` word is `0x756E736E`/`103`. Both propagate into editor
  invariants, so they are the highest-value corrections in this slice.
