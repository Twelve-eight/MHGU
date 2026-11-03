# LINK2 — constants sweep, harvested from the agent's local:// report on 2026-11-04.

The agent could not write into the working tree (its write device refuses repo paths), so its text was copied here verbatim.

# LINK2 — constants sweep (second linkage-review wave)

Scope: every `*.md` under `docs/` plus `HANDOFF.md`, searched with `grep` over `docs/**/*.md;HANDOFF.md`.
Method: every occurrence of the listed values was read in its sentence; where the value is computable it was
recomputed from the committed artefacts (`coverage-report.tsv`, the state-machine section headers, hex/decimal
arithmetic) or from the image (two `mcp__mhgu_re_literal_loads` scans). **270 sites checked (lower bound — four
files are grep-capped): 268 are used with the meaning the artefacts support, 2 are not** (MISUSES rows 1–2).

Notation: "sites" = grep lines read in content docs. `docs/analysis/audit/*` is excluded from the counts because
those reports quote values meta-analytically; where an audit report is itself stale it is listed under STALE.
Counts marked `>=` are lower bounds: `grep` returns at most 20 matches per file when several files are searched,
so the four heavy files were re-grepped alone with `skip=20`.

Gate status: `node tools/audit/check.mjs` was **not executed** (this session has no shell; see Difficulties).
The subjects of gates 9, 10 and 11 were re-read by hand and hold (CONFIRMED rows 4, 13, 14).

## CONFIRMED — claim, location, command, output

| # | constant (correct meaning) | sites checked (file: count) | recomputation / evidence |
|---|---|---|---|
| 1 | **226,754** = member layer `0x278..0x3783A` length | PROGRESS 5, HANDOFF 1, coverage-map 4, social-checksum 1, editor-spec/01 1, monster-code-map 1 = 13 | `0x3783A` = 227,386; `0x278` = 632; 227,386 − 632 = **226,754**. Every site states the length; the two sites that also print 227,386 label it "终点偏移/端点偏移", not a length. |
| 2 | **227,386** = end offset `0x3783A` (never a length) | PROGRESS 2 (both struck through), coverage-map 2, HANDOFF 1, monster-code-map 1, tail-dense-3783A 1 = 7 | `0x3783A` = 3×65536 + 0x783A = 196,608 + 30,778 = **227,386**. coverage-map:378 uses it as the *window* size `0..0x3783A` and adds "含 632B 头；成员层本身 226,754B"; :201 "终点偏移 `0x3783A` = 227,386". No site uses it as the member length. |
| 3 | **950,374** = tail `0x3783A..0x11F8A0` | PROGRESS 3, coverage-map 2, social-checksum 2, write-side-desc 2, editor-spec/01 1 = 10 | 1,177,760 − 227,386 = **950,374**; /1,177,760 = 80.69 % → the "81 %" in social-checksum:72 and write-side-desc:537 is correct; /1024 = 928.1 → "928KB" (coverage-map:211) correct. |
| 4 | **1,177,760** = hunter block (`.hnt` / one system slot) | PROGRESS 6, HANDOFF 2, docs/README 1, coverage-map 8, social-checksum 13, tail-containers 1, member15 1, editor-spec/01 8, editor-spec/02 3, editor-spec/03 1, systems 1, history 2 = 47 | `0x11F8A0` = 1,048,576 + 129,184 = **1,177,760**; 2,300×512 + 160 = **1,177,760** (the "+160" is present at PROGRESS:84, HANDOFF:108, social-checksum:172). Stride `0x11F8C4` = 1,177,796 = 1,177,760 + 36 (editor-spec/01:69) correct; `1,177,760 % 512 = 160` (editor-spec/01:137) correct. |
| 5 | **632** = header `0x0..0x277` | PROGRESS 2, coverage-map 3, social-checksum 4, write-side-desc >=40, member4-header 3, editor-spec/01 9, editor-spec/02 5, editor-spec/03 3 = >=49 | 0x277 + 1 = 0x278 = **632**; coverage-map:19–20 splits it 48 B (`0x0..0x2F`) + 584 B (`0x30..0x277`) = 632. Every site uses 632 either as the header size or as the bitstream base `char_off 632 = 0x278`; none uses it as a slot count or as a length of anything else. |
| 6 | **9,543** = member[0] = 5,463-bitstream + 4,080-presets, `632..10174` | PROGRESS 2, coverage-map 3 = 5 | 10,174 − 632 + 1 = **9,543**; 5,463 + 4,080 = **9,543** (coverage-map:111 "member[0] 全长 = 5,463 + 4,080 预设 = 9,543B"; :152 closes the same sum). |
| 7 | **5,463** = 2,300 slots × 19 bit | editor-spec/02 4, coverage-map 2, systems 1, wiki/farm-trade-canteen 1 = 8 | ceil(2,300 × 19 / 8) = ceil(5,462.5) = **5,463**; `0x17CF` − `0x278` = 6,095 − 632 = **5,463**. coverage-map:152 records 5,451 as the old wrong value (43,608 bit = 2,295.2 slots). |
| 8 | **2,300 / 0x8FC** | editor-spec/02 2, systems 1, wiki/farm-trade-canteen 2, wiki/items-combat 1, coverage-map 3, member-census 1, patches/item-box-v7 >=4 = >=13 | `0x8FC` = 2,048 + 252 = **2,300**; 2,292 would be `0x8F4`. `mcp__mhgu_re_literal_loads 0x100..0x13F1DEC [0x8fc]` → **8 hit(s)**: `0x198fa0, 0x198ffc, 0x19a4f8, 0x19a568, 0x2491a8, 0x3e8a10, 0x5a708c, 0xbe2088`. The five box sites in the V7 patch table (`0x198fa0` forward search, `0x198ffc` reverse count, `0x19a4f8` serializer, `0x19a568` deserializer, `0x3e8a10` clear loop) are exactly the five the spec lists; farm-trade-canteen:603's "代码常量 5 处" is correct **only scoped to the box** — the immediate also appears at three unrelated sites (`0x2491a8, 0x5a708c, 0xbe2088`), so it must not be read as an image-wide count. |
| 9 | **12,318** = unlabelled functions | HANDOFF 2, METER 10, inventory/README 1 = 13 | `coverage-report.tsv` row `partition: no label 12318 524143 10.0% 23.4%`; 52,692 − 40,374 = **12,318**; 524,143 / 5,228,277 = **10.03 %**; 12,318 / 52,692 = **23.38 %**. All sites pair 10.0 % with instructions and 23.4 % with functions. |
| 10 | **40,374** = labelled functions | METER 2, labels-summary 1, PUBLISH-READINESS 1 = 4 | `coverage-report.tsv` `covered, spread pooled … 40374 4704134 90.0% 76.6%`; 40,374 / 52,692 = **76.62 %**; = the sum of the 14 `labels-summary.md` subsystem rows. Never used as the ≥90 % numerator (that is 28,187). |
| 11 | **52,692** = function denominator | HANDOFF 1, PROGRESS 2, code-metrics 10, METER 4, RETILE 1, bsamples 1, precision-B 1, attr-vtable 1 = >=20 | `coverage-report.tsv:1` `denominator: 52692 functions, 5228277 instructions`; `functions-retile.csv.gz` row count (RETILE.md:11). Every site uses it as a function count, never as an instruction count. |
| 12 | **5,228,277** = instruction denominator | HANDOFF 2, PROGRESS 1, code-metrics 4, METER >=6, labels-summary 1, RETILE 1 = >=15 | `coverage-report.tsv:1`; the seven partition rows close exactly: 1,248,279 + 1,896,778 + 144,714 + 170,761 + 0 + 1,243,602 + 524,143 = **5,228,277**. PROGRESS:91 keeps it distinct from the 5,228,347 words of the flat range. |
| 13 | **66.2 / 53.5** = covered at ≥90 % precision (instructions / functions) | PROGRESS 4, HANDOFF 2, code-metrics 2, METER >=14, PUBLISH-READINESS 1 = >=23 | `covered at >=90% precision 28187 3460532 66.2% 53.5%`; 3,460,532 / 5,228,277 = **66.19 %**; 28,187 / 52,692 = **53.49 %**. Every site states 66.2 % for instructions and 53.5 % for functions — no site swaps them. |
| 14 | **58.0** = project calibre; **57.7 + 0.3** its parts | HANDOFF 2, PROGRESS 2, code-metrics 2, METER 5, PUBLISH-READINESS 1 = 12; parts at HANDOFF 2 + METER 2 | `tier A (verified) 25584 3014249 57.7%`; 3,014,249 / 5,228,277 = **57.65 %**; 57.65 + 0.38 = **58.03 → 58.0**. Every site that prints a formula writes `57.7 + 0.3 = 58.0`; the retired 58.4 is marked as the pre-demotion value (METER:4, METER:1116, PROGRESS:73). |
| 15 | **93.7** = conditional precision; **83.6** = retention; **78.3** = retention × precision (not precision) | HANDOFF 2, code-metrics 2, METER >=9 = >=13 | 21,004 / 25,123 = **83.61 %**; 19,676 / 21,004 = **93.67 %**; 19,676 / 25,123 = **78.32 %** = 0.8361 × 0.9367. METER:682–684 defines the three in one table; HANDOFF:21 and :160 print them as "保留率 83.6%、条件精度 93.7%、联合 78.3%" and explicitly deny "精度 78.3%"; code-metrics:141/:192 repeat the triple. The other 83.6 sites (METER:53/:72, HANDOFF:21 "逐标签 5.5–83.6%") are render-gfx's spread precision — a different, correctly labelled quantity. |
| 16 | **1,223** state rows = **51** first-level sections + **9** second-level tables; **8** states without handler; **119** with a motion name | monster-state-machine 3, monster-code-map 3, HANDOFF 3, PUBLISH-READINESS 1, code-metrics 1 = 11 | Summed the per-section denominators `有名字 k/m` in `monster-state-machine.md`: 51 first-level sections = **890** rows; 9 second-level sections = 35+17+37+44+34+62+27+42+35 = **333**; 890 + 333 = **1,223**. Named states = 119 (all in first-level sections); 119/1,223 = **9.73 %**. Handler-less rows: exactly **8** (`| 9 | — | — |` … `| 16 |` at :694–701). Section count: 51 + 9 = **60** `## 派发器` headers. |
| 17 | **638** = occurrences of `movw #0x73e0` in the image | monster-code-map 1, HANDOFF 1 = 2 | `mcp__mhgu_re_literal_loads 0x100..0x13F1DEC [0x73e0]` → **638 hit(s)** (all `movw`, no literal-pool hits). Exact match. |
| 18 | **53** = `movw #0x73e0` tables | monster-code-map 2, HANDOFF 1, PROGRESS 1, code-metrics 1 = 5 | 53 = 51 documented first-level sections + 2 tables the generator's `N<=64` filter drops (`0x5c2cc` N=225, `0x1081408` N=100 — `state-motion3.mjs:111–112` banner, `monster-state-machine.md:6–7`). Used as a table count at monster-code-map:28/:32, PROGRESS:106, HANDOFF:118. |

## CONTRADICTION — same fact stated differently: both file:line, both values, which side the artifact supports

### MISUSES (complete list — 2 rows)

| # | file:line | sentence excerpt | why wrong | correct value / wording |
|---|---|---|---|---|
| 1 | `docs/analysis/code-metrics.md:79` | "`movw #0x73e0` 状态表 **53 张**（其中 **51 张**是怪物派发器，另有 **9 个二级表**，合计 **1,223 行状态**）" | The parenthetical reads as a decomposition of the 53, but 51 + 9 = **60 ≠ 53**. The 9 second-level tables are found by the *other* constant (`#0x73e1`, `state-motion3.mjs:19–22,36–42`) and are not among the 53 `#0x73e0` tables; the 2 remaining `#0x73e0` tables are the non-monster `0x5c2cc` (N=225) and `0x1081408` (N=100). The 1,223 rows are the sum over the **60 documented sections** (51 first-level = 890 rows + 9 second-level = 333), not over 53 tables. Artifact side: `monster-code-map.md:28–30` and `monster-state-machine.md:6` (both correct: 53 tables; 51 + 9 sections; 1,223 rows). | "`movw #0x73e0` 状态表 53 张（51 张怪物一级派发器 + 2 张非怪物表 `0x5c2cc`/`0x1081408`）；另有 9 个 `#0x73e1` 二级表；51 + 9 = 60 个小节合计 1,223 行状态" |
| 2 | `docs/PROGRESS.md:106` | "、**477** 个 `u8[+0x73E0]` 读取者、" | 477 is the retracted reader count. `monster-code-map.md:27` strikes it ("~~477~~ **未复现**") and gives the three measured quantities: 638 occurrences, 489 functions containing one, 332 functions that load it with `ldrb` within ≤3 instructions. PROGRESS keeps 477 **unstruck** in the same sentence that adopts the new measured 3,429/2,546/53, so a reader takes it as current. Artifact side: the 638 site count reproduces exactly (row 17); the reader population is 332, not 477. | **332** (functions that read the field with `ldrb`), or **489** (functions containing `movw #0x73e0`). Not 477. |

Both sides of row 1 are arithmetic-checkable: `51 + 9 = 60`, `890 + 333 = 1,223`, and the generator's own banner
(`monster-state-machine.md:6`) says 51 first-level + 9 second-level. code-metrics.md:79 is the only site that
fuses the two populations.

## STALE — number that was true earlier and what superseded it

1. **`docs/PROGRESS.md:106` — "477 … 读取者"** (same site as MISUSE 2). 477 was the pre-retile count of the
   `u8[+0x73E0]` readers; the 2026-11-04 recount replaced it with 332 ldrb-readers / 489 functions / 638 sites
   (`monster-code-map.md:27`, `HANDOFF.md:118`). Superseded; the line was not updated when the neighbouring
   149/58 were struck.
2. **`docs/analysis/audit/LINK-MECHANICS-CODE.md:185` — "the doc's own table has 890 state rows"**. True when the
   audit ran (first-level only); MC9 then added the 9 second-level tables and the live document is **1,223**
   (890 + 333). The audit report is a dated snapshot, not a defect of the live docs; noted so the next reader
   does not take 890 as current.
3. *(adjacent, not one of the listed constants)* **`HANDOFF.md:41` — "`.text` `0x100 .. 0x13F1DEC` (20.8MB /
   5,228,411 指令)"**. 5,228,411 = `0x13F1DEC / 4` counts from vaddr 0, while the range as written
   (`0x100..0x13F1DEC`) holds 5,228,347 words and the instruction denominator used everywhere else is 5,228,277
   (HANDOFF:19, PROGRESS:91, `coverage-report.tsv:1`). The number is the vaddr-0 word count; the row's range
   notation mixes flat and vaddr (already documented in `REST-FINDINGS.md` §1). It is not used as the
   denominator anywhere, but the coordinate table is the first thing a new session reads.

## UNVERIFIED — load-bearing claims that cannot be checked with these tools, and why

- **3,429 sites / 2,546 functions** (offset-table dispatch, `ldr rD,[rN,rM]; add pc,rN,rM`). No script in the
  repo produces this pair; the only recomputation on record used a narrower two-instruction signature and got
  3,244 sites / 2,419–2,420 functions (`LINK-MECHANICS-CODE.md:83`). The value is identical in
  `monster-code-map.md:28`, `PROGRESS.md:106`, `code-metrics.md:79` and `HANDOFF.md:118`, so no document
  contradicts it, but its derivation is not reproducible from the tree (the 2026-11-04 scan script was not
  committed). Cannot be recomputed here: no shell, and no MCP device counts this signature.
- **489 functions containing `movw #0x73e0`, 332 of them with `ldrb`**. The 638 site count is confirmed exactly
  (row 17), but turning 638 sites into distinct-function counts needs a join with `functions-retile.csv.gz`
  (52,692 rows) plus a per-site window walk; not possible without a shell. The docs agree with each other
  (`monster-code-map.md:27`, `HANDOFF.md:118`), so there is no internal contradiction.
- **Byte-level anchors of the save constants** (that the item bitstream really ends at `0x17CF` = 6,095, that the
  clean save decodes at `char_off 632`, that the tail starts at `0x3783A`). The arithmetic closes, but this
  session cannot read a byte range out of the 5,159,100-byte snapshots: `read` decodes text, and the
  `mcp__mhgu_re_read_bytes` device exposes only a fixed-size hex dump (no offset argument). All save-side
  values are therefore confirmed as *internally consistent arithmetic on the stated offsets*, not re-measured.
- **The 12 gates of `tools/audit/check.mjs`.** Not executed (no shell). The "ALL PASS" quotes in
  `LINK-INVENTORY.md:14–18`, `LINK-MECHANICS-CODE.md:15–18` and `PUBLISH-READINESS.md:9` are second-hand. Gate 9
  (calibre), 10 (METER header vs report) and 11 (0.85 formula uses 226,754) were re-read by hand against the
  current files and their subjects hold (rows 4, 13, 14), so the gate verdict is plausible but not reproduced.
- **12,318 / 40,374 / 52,692 / 5,228,277 as re-derived from the raw tables.** Confirmed against
  `coverage-report.tsv` (a committed artefact) and against the partition closure, but not re-counted from
  `functions-retile.csv.gz` / `function-labels.tsv` (52,692 and 40,374 rows).

## Difficulties

- **No shell in this session.** `node tools/audit/check.mjs` (and every other `node` recomputation the ticket
  suggests) could not be run; the only executable paths were the seven `xd://` MHGU RE devices. Compensated by
  arithmetic on committed TSVs and two full-image `literal_loads` scans (638 and 8 hits). Cost: the gate run
  itself would have been one call; the manual equivalents took ~6 calls.
- **Files changed under the sweep.** `HANDOFF.md:24` and `:118` read "motion 名 41/53 派发器" and
  "149 动作派发器 / 58 方法表 / 477 …" on my first read and showed the corrected "60 节（51 一级 + 9 二级）共
  1,223 行状态" and "3,429 / 2,546 … 638 … 489 …（332 个紧跟 ldrb）… ~~149 / 58 / 477~~" on the next.
  `docs/PUBLISH-READINESS.md` appeared mid-sweep (it was not in the first `glob` and is not in the frozen
  `MANIFEST.tsv`). Findings are stated against the last read of each file; the two MISUSE rows were re-read
  byte-exact immediately before this report was written.
- **`grep` per-file cap.** When several files are searched the tool keeps the first 20 matches per file. The
  heavy files (`METER.md`, `write-side-desc.md`, the `LINK-*` reports) were re-grepped alone with `skip=20` so
  the tail was covered; counts for those files are still stated as lower bounds.
- **Report write target.** `docs/analysis/audit/LINK2-CONSTANTS.md` is a working-tree path; the write device
  accepts only `xd://` and `local://`. This text is saved at `local://LINK2-CONSTANTS.md` and must be copied to
  the repo path by whoever can write the working tree.
- **No false alarms from homonyms.** `1,223` also appears as an instruction count of an unrelated region
  (`attr-vtable.md:218`, `0x4f69bc..0x4f7cd8`), `477` as a jump-target constant, `83.6` as render-gfx's spread
  precision, `53` as item ids in the wiki tables. Each was checked in context and is correctly labelled; they
  are not counted as misuses.
