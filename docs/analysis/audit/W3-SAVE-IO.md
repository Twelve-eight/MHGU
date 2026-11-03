# W3-SAVE-IO — the seven save-side claims behind W2-SV1 / W2-SV2

Date 2026-11-04. Scope: `docs/analysis/save-io/tail-containers.md`, `tail-dense-3783A.md`,
`write-side-desc.md`, `docs/analysis/fields/records-128.md`, `docs/save-layout/coverage-map.md`.

W2-SV1 recorded that "50 zlib streams per slot" had no definition; W2-SV2 recorded 13 save-number
contradictions whose commands were not preserved. This ticket settles the seven topics the W2-SV2 row
enumerates (zlib count, 4 K windows, the 214 B group, the 0xA5000 bucket, `0x3e0ea4` callers and `0x02B`,
`0x0193A514`, the records-128 flood rows) by recomputing each from the bytes or the image and writing the
metric down as code: `tools/audit/claims-save.mjs`.

The tool is not a constant table. For every claim it (a) computes the value from the snapshot or the image
and (b) parses the number the document currently states, at a named anchor; PASS means the doc text
reproduces from the bytes. All seven were FAIL on the first run (the doc values below), all seven PASS after
the edits in §6.

## 1. Metric contract

```
$ node tools/audit/claims-save.mjs [zlib|windows|dirty-group|buckets|callers|leak|records|sweep] [-v]
```

Data: `save-snapshots/20261022-clean-reference/system_CLEAN` (clean), `save-snapshots/20261022-v6-ready/system`
(dirty); `hunterAdds = [0x18CC9C, 0x2AC560, 0x3CBE24]`, block length `0x11F8A0`; image
`main.140.flat.bin` with flat = vaddr + 0x100.

| id | metric | exact definition |
|---|---|---|
| D1 | byte pair | bytes `78 9C` / `78 DA` / `78 01` at i,i+1; no structural test |
| D2 | header | RFC1950: `CMF & 0x0F == 8`, `FDICT == 0` (`FLG & 0x20`), `(CMF<<8\|FLG) % 31 == 0` |
| D3 | inflate | D2 and `zlib.inflateSync` reaches the end-of-stream (Node `info:true`, `engine.bytesWritten`) |
| D4 | adler | D3 and the 4 bytes that end the consumed stream equal `adler32(output)` |

Ranges: **block** `0..0x11F8A0` and **segment** `0x80000..0x11F8A0` (the documents' "全段").

| claim | metric |
|---|---|
| 2 | 159 full 4 KB windows over `0x80000..0x11F8A0`; per window `max_{p=2..8}` of the byte-equality rate over `4096-p` positions; a window qualifies at 0.99; consecutive qualifying windows with the same p are merged into a run |
| 3 | positions where clean slot0 != dirty slot0, merged while the gap to the previous diff byte is <= 16; a group's size = bytes inside its span with `dirty != 0 && clean == 0` |
| 4 | 8-byte head `ff 00 49 92 24 49 92 24` counted at every byte offset of each 4 KB bucket in `[0x64000,0xBC000)`; slot-aligned count over `0x63671 + 16k`, k = 0..22,874 |
| 5 | every 4-byte word of the image tested as `bl`/`b`/`blx` targeting vaddr `0x3e0ea4`; `r2` = last `mov`/`movw` to r2 in the 32 words before the call (conditional = dynamic); `0x02B` read in 26 saved blocks (6 system files x 3 slots + 8 `.hnt`) |
| 6 | the 7 dwords at `0x10C + 44k` in each of those 26 blocks; occupied = HR != 0 or a non-zero name; plus the two image readings of `*(0x1839D68)+8` |
| 7 | the 128 B family read from `member4-file-layout.txt` (`sz=128`, obj `0x2A78..0x3178`) = `0x45DF..0x4D5F`; per-record diff and FF (dirty FF, clean non-FF) against both clean slot1 and clean slot0, plus the six 68 B rows `0x4447/0x448B/0x44CF/0x4513/0x4557/0x459B` |

## 2. Before and after

| # | doc anchor | value in the doc before | measured | value in the doc after |
|---|---|---|---|---|
| 1 | `tail-containers.md:74` | 50 streams in each slot | clean slot0 **1,258** / slot1 **50** (segment, D3/D4); block 2,119 / 150 | same as measured, four definitions tabulated |
| 2 | `tail-containers.md:180` | `0xCB000..0xCF000` (p=4), `0xCF000..0xDD000` (p=2) | clean slot1: `0xBE000..0xC7000` (p=4), `0x118000..0x11C000` (p=2); clean slot0: p=2 at `0xCF000..0xD5000`, `0xD9000..0xDA000`, `0x117000..0x11C000`, no p=4 window | same as measured |
| 3 | `tail-containers.md:133` | 214 B at `0x98E6E` | **281 B** at `0xDF047..0xDF19A` | 281 B, top six listed |
| 4 | `tail-dense-3783A.md:161,163` (+283, `coverage-map.md:403`) | 88 buckets x 256, 22,875 records | 87 buckets x 256, `0xA5000` = **253**; **22,872** of 22,875 aligned slots | same as measured |
| 5 | `write-side-desc.md:315,341,475` | one caller; `0x02B` = 1 | **7** `bl` sites (4 x r2=0, 1 x r2=1, 2 x boolean); `0x02B` = **0** in 26/26 blocks | same as measured |
| 6 | `write-side-desc.md:457-460,553` | `0x0193A514` is a transcription error | real: x7 in 12/12 occupied slots and 8/8 `.hnt`; 6/6 empty slots hold `0x39133514`; neither image reading yields it | typo withdrawn; attribution marked unreproduced |
| 7 | `records-128.md:157,185` | destroyed records i7-i10 at `0x440F..0x45CF` | floods are the 68 B rows `0x4447..0x4485` (63), `0x44CF..0x4507` (53), `0x4557..0x4597` (62); the 128 B family is 0 diff in the same-character pair | same as measured |

## 3. Claim evidence

Each block is the literal output of the command shown.

### Claim 1 — zlib streams (`zlib`)

`$ node tools/audit/claims-save.mjs zlib`

```
CLAIM 1 zlib-stream-count: PASS | doc: 74: slot0 1258 / slot1 50 | measured: slot0 1258 / slot1 50 (0x80000..0x11F8A0, header+inflate+Adler32)
    clean slot0: D1 pairs 2131/1266 | D2 headers 2732/1642 | D3 inflate 2119/1258 | D4 adler 2119/1258 | comp 15/73/792 B, out 25/308/6328 B (min/median/max; block / segment)
    clean slot1: D1 pairs 163/58 | D2 headers 1314/836 | D3 inflate 150/50 | D4 adler 150/50 | comp 29/29/29 B, out 6328/6328/6328 B (min/median/max; block / segment)
    dirty slot0: D1 pairs 163/59 | D2 headers 457/220 | D3 inflate 150/50 | D4 adler 150/50 | comp 29/29/29 B, out 6328/6328/6328 B (min/median/max; block / segment)

1 claim(s): 1 PASS, 0 FAIL
```

The doc's 50 is the *stream grid* at `0xC9B99 + 73k`, which is the whole population of clean slot1, dirty
slot0 and slot2's tail — but clean slot0 has 1,258 adler-verified streams in the same segment (2,119 in the
block), so "50 in each slot" is false and the "50" must be attached to slot1. D3 = D4 here: every stream that
inflates also carries its correct Adler32, so the "header matches but the stream is fake" population is
exactly D2 - D3 (384 header positions in clean slot0's segment).

The main session's quick-scan figures (34 adler-valid headers, median 29,516 B) are not reproducible under
any of the document ranges; the 2,131 is exactly clean slot0's D1 over the whole block:

`$ node tools/audit/claims-save.mjs sweep | grep -cE "D4 34 |gap 29516"` -> `0` (no combination)
`$ node tools/audit/claims-save.mjs sweep | grep -c "D4 50 "` -> `26` (slot1 / slot2 / dirty0 tail grid)

sweep covers 14 snapshot files x every slot x five ranges (block, head `0..0x80000`, segment, late
`0xC95A8..`, tail `0x117125..`) and prints D1-D4 plus the median gap between adler hits for each; its header:

```
per-block zlib census (D1 pairs / D2 headers / D3 inflate / D4 adler), ranges: block 0..0x11F8A0, head 0..0x80000, segment 0x80000..0x11F8A0, late 0xC95A8..0x11F8A0, tail 0x117125..0x11F8A0
```

### Claim 2 — 4 KB exact byte periods (`windows`)

`$ node tools/audit/claims-save.mjs windows`

```
CLAIM 2 4k-period-windows: PASS | doc: 191: `0xBE000..0xC7000`（p=4） `0x118000..0x11C000`（p=2） | measured: clean slot1: `0xBE000..0xC7000`（p=4） `0x118000..0x11C000`（p=2）; clean slot0: `0xCF000..0xD5000`（p=2） `0xD9000..0xDA000`（p=2） `0x117000..0x11C000`（p=2）; dirty slot0: `0x118000..0x11C000`（p=2）
    criterion: per 4 KB window, max over p=2..8 of the byte-equality rate (4096-p positions), bar 0.99; 159 windows in 0x80000..0x11F8A0

1 claim(s): 1 PASS, 0 FAIL
```

With `-v` the per-window values show why the old ranges are not "exact": in clean slot1 the doc's windows sit
at p=4 0.505/0.411/0.440/0.408 (random baseline for a 4 KB window), and in clean slot0 at p=4
0.956/0.958/0.957/0.973 — below the 0.99 bar. The 0.99 windows are the `{0f,10}` fill family
(`0xBD722..0xC70DE`, p=4) and the 17,681 B zero hole (`0x117125..0x11B636`, p=2), as the audit said.

```
$ node tools/audit/claims-save.mjs windows -v | tr ' ' '\n' | grep -E "^(0xCB|0xCC|0xCD|0xCE|0xCF|0xD0)"
0xCB000/p4/0.505
0xCC000/p4/0.411
0xCD000/p4/0.440
0xCE000/p4/0.408
0xCF000/p4/0.401
0xD0000/p4/0.384
0xCB000/p4/0.956
0xCC000/p4/0.958
0xCD000/p4/0.957
0xCE000/p4/0.973
0xCF000/p2/1.000
0xD0000/p2/1.000
```

(the first six lines are the `slot1 windows:` line of the verbose output, the second six the `slot0 windows:` line;
`0xCF000..0xD0000` at p=2 1.000 is the slot0 zero-hole head, which is why slot0 has a p=2 run there)

### Claim 3 — largest dirty-only group (`dirty-group`)

`$ node tools/audit/claims-save.mjs dirty-group`

```
CLAIM 3 largest-dirty-only-group: PASS | doc: 144: 281 B at `0xDF047` | measured: 281 B at `0xDF047..0xDF19A`
    2495 gap-16 groups, 93390 dirty-only bytes (clean slot0 vs dirty slot0)
    top6: 281@0xDF047 278@0xA84E7 257@0x8A79F 250@0xD03DB 235@0x9E1C3 228@0x10E6A1

1 claim(s): 1 PASS, 0 FAIL
```

The same metric reproduces the doc's own 2,495 groups and 93,390 bytes; the doc's 214 B at `0x98E6E` is the
sixth largest, and `0xF7897` is not a diff byte at all (145 is the exclusive-end count of the group that ends
at `0xF7896`).

### Claim 4 — 0xA5000 bucket and the aligned header count (`buckets`)

`$ node tools/audit/claims-save.mjs buckets`

```
CLAIM 4 a5000-bucket-and-header-count: PASS | doc: 161: 256 per bucket, 0xA5000 253; 163: 22872 records | measured: 87 buckets x 256, 0xA5000 253; 22872 of 22875 aligned slots; span 366000 B, last 0xBCC11
    buckets != 256: 0xA5000=253
    missed slots: 0xA5181, 0xA5191, 0xA51A1

1 claim(s): 1 PASS, 0 FAIL
```

The three missing slots hold one 48 B foreign record (`00 00 00 00 00 00 11 44 …` / `00 00 00 00 20 cb 14 44 …`
/ `bc 94 6b 00 11 00 00 04 …`), and the grid resumes at `0xA51B1`; the array start, last header
(`0xBCC11`) and the 366,000 B span all stand.

### Claim 5 — `0x3e0ea4` callers and `0x02B` (`callers`)

`$ node tools/audit/claims-save.mjs callers`

```
CLAIM 5 0x3e0ea4-callers-and-0x02B: PASS | doc: 315: 7 callers; 341: 0x02B=0 | measured: 7 bl, 0 b, 0 blx; r2=0 at 4 (0x3E09DC,0x3E7AE8,0x3E7B34,0x3E7B80), r2=1 at 1 (0x3E11F8), conditional at 2 (0x3E8190,0x3E8AB4); 0x02B=0 in 26/26 blocks
    blocks checked: 26 (6 system files x 3 slots + 8 .hnt)
    bl sites: 0x3E09DC 0x3E11F8 0x3E7AE8 0x3E7B34 0x3E7B80 0x3E8190 0x3E8AB4

1 claim(s): 1 PASS, 0 FAIL
```

`0x3e09dc`'s `mov r2,#0` is 15 words before the call with no intervening writer; `0x3e7ae8/0x3e7b34/0x3e7b80`
each have `mov r2,#0` immediately before; `0x3e11f8` has `mov r2,#1`; `0x3e8190` and `0x3e8ab4` are
`cmp r2,#0` + `movwne r2,#1`. So the "only caller passes 1" premise is refuted, and the byte the doc
tabulated as 1 is 0 in every saved block.

### Claim 6 — `0x0193A514` (`leak`)

`$ node tools/audit/claims-save.mjs leak`

```
CLAIM 6 0x0193A514-is-real: PASS | doc: 551: real; 占用槽 12/12, .hnt 8/8, 空槽 6/6 | measured: 0x0193A514 x7 in 12/12 occupied slots and 8/8 .hnt; 0x39133514 x7 in 6/6 empty slots
    image: len 0x184AE78, flat[0x1839E68]=0x173650C -> +8 = 0xDA3CC; flat[0x1839D68]=0x1853688 -> +8 = outside image
    neither 0x0193A514 nor 0x0183A514 is produced by either reading

1 claim(s): 1 PASS, 0 FAIL
```

`0x0193A514` is inside the save, not the image, so the "outside the image therefore a typo" reasoning
compared the wrong object. The "all seven dwords are equal" prediction holds; the attribution to
`*(0x1839D68)+8` is what fails (flat `0x1839E68` = `0x173650C`, +8 = `0xDA3CC`; the no-offset reading
`0x1853688` is past the image end `0x184AE78`).

### Claim 7 — records-128 destroyed rows (`records`)

`$ node tools/audit/claims-save.mjs records`

```
CLAIM 7 records-128-destroyed-rows: PASS | doc: 185: `0x4447..0x4485` 63 B, `0x44CF..0x4507` 53 B, `0x4557..0x4597` 62 B; §1.1 family start 0x45DF | measured: floods: 0x4447 63 FF, 0x448B 1 FF, 0x44CF 53 FF, 0x4513 3 FF, 0x4557 62 FF, 0x459B 0 FF; 128B family at 0x45DF..0x4D5F: cross i7..i10 46/1,2/0,5/0,2/0, same-character 0 diff over 1920 B
    68B rows: 0x4447 diff=64 FF(slot1)=63 FF(slot0)=54 | 0x448B diff=55 FF(slot1)=1 FF(slot0)=0 | 0x44CF diff=66 FF(slot1)=53 FF(slot0)=46 | 0x4513 diff=56 FF(slot1)=3 FF(slot0)=0 | 0x4557 diff=66 FF(slot1)=62 FF(slot0)=54 | 0x459B diff=58 FF(slot1)=0 FF(slot0)=0
    authority rows: 0x45DF=obj+0x2A78, 0x465F=obj+0x2AF8, 0x46DF=obj+0x2B78 ... 0x4CDF

1 claim(s): 1 PASS, 0 FAIL
```

The counts in the doc's old table are correct as arithmetic over the 128 B windows starting at `0x408F`,
but those windows are not the family: the authority puts the 15x128 B family at `0x45DF..0x4D5F` and the
six 68 B rows at `0x4447..0x459B` first. Against the same character (clean slot0 vs dirty slot0) the family
has 0 differing bytes over 1,920 B, while the floods sit in the 68 B rows. The `+1`/`+3` that §5.2 left
open are the `1E` half-slots `0x448B` (1 B) and `0x4513` (3 B).

## 4. Full output of the checker

`$ node tools/audit/claims-save.mjs`

```
CLAIM 1 zlib-stream-count: PASS | doc: 74: slot0 1258 / slot1 50 | measured: slot0 1258 / slot1 50 (0x80000..0x11F8A0, header+inflate+Adler32)
    clean slot0: D1 pairs 2131/1266 | D2 headers 2732/1642 | D3 inflate 2119/1258 | D4 adler 2119/1258 | comp 15/73/792 B, out 25/308/6328 B (min/median/max; block / segment)
    clean slot1: D1 pairs 163/58 | D2 headers 1314/836 | D3 inflate 150/50 | D4 adler 150/50 | comp 29/29/29 B, out 6328/6328/6328 B (min/median/max; block / segment)
    dirty slot0: D1 pairs 163/59 | D2 headers 457/220 | D3 inflate 150/50 | D4 adler 150/50 | comp 29/29/29 B, out 6328/6328/6328 B (min/median/max; block / segment)
CLAIM 2 4k-period-windows: PASS | doc: 191: `0xBE000..0xC7000`（p=4） `0x118000..0x11C000`（p=2） | measured: clean slot1: `0xBE000..0xC7000`（p=4） `0x118000..0x11C000`（p=2）; clean slot0: `0xCF000..0xD5000`（p=2） `0xD9000..0xDA000`（p=2） `0x117000..0x11C000`（p=2）; dirty slot0: `0x118000..0x11C000`（p=2）
    criterion: per 4 KB window, max over p=2..8 of the byte-equality rate (4096-p positions), bar 0.99; 159 windows in 0x80000..0x11F8A0
CLAIM 3 largest-dirty-only-group: PASS | doc: 144: 281 B at `0xDF047` | measured: 281 B at `0xDF047..0xDF19A`
    2495 gap-16 groups, 93390 dirty-only bytes (clean slot0 vs dirty slot0)
    top6: 281@0xDF047 278@0xA84E7 257@0x8A79F 250@0xD03DB 235@0x9E1C3 228@0x10E6A1
CLAIM 4 a5000-bucket-and-header-count: PASS | doc: 161: 256 per bucket, 0xA5000 253; 163: 22872 records | measured: 87 buckets x 256, 0xA5000 253; 22872 of 22875 aligned slots; span 366000 B, last 0xBCC11
    buckets != 256: 0xA5000=253
    missed slots: 0xA5181, 0xA5191, 0xA51A1
CLAIM 5 0x3e0ea4-callers-and-0x02B: PASS | doc: 315: 7 callers; 341: 0x02B=0 | measured: 7 bl, 0 b, 0 blx; r2=0 at 4 (0x3E09DC,0x3E7AE8,0x3E7B34,0x3E7B80), r2=1 at 1 (0x3E11F8), conditional at 2 (0x3E8190,0x3E8AB4); 0x02B=0 in 26/26 blocks
    blocks checked: 26 (6 system files x 3 slots + 8 .hnt)
    bl sites: 0x3E09DC 0x3E11F8 0x3E7AE8 0x3E7B34 0x3E7B80 0x3E8190 0x3E8AB4
CLAIM 6 0x0193A514-is-real: PASS | doc: 551: real; 占用槽 12/12, .hnt 8/8, 空槽 6/6 | measured: 0x0193A514 x7 in 12/12 occupied slots and 8/8 .hnt; 0x39133514 x7 in 6/6 empty slots
    image: len 0x184AE78, flat[0x1839E68]=0x173650C -> +8 = 0xDA3CC; flat[0x1839D68]=0x1853688 -> +8 = outside image
    neither 0x0193A514 nor 0x0183A514 is produced by either reading
CLAIM 7 records-128-destroyed-rows: PASS | doc: 185: `0x4447..0x4485` 63 B, `0x44CF..0x4507` 53 B, `0x4557..0x4597` 62 B; §1.1 family start 0x45DF | measured: floods: 0x4447 63 FF, 0x448B 1 FF, 0x44CF 53 FF, 0x4513 3 FF, 0x4557 62 FF, 0x459B 0 FF; 128B family at 0x45DF..0x4D5F: cross i7..i10 46/1,2/0,5/0,2/0, same-character 0 diff over 1920 B
    68B rows: 0x4447 diff=64 FF(slot1)=63 FF(slot0)=54 | 0x448B diff=55 FF(slot1)=1 FF(slot0)=0 | 0x44CF diff=66 FF(slot1)=53 FF(slot0)=46 | 0x4513 diff=56 FF(slot1)=3 FF(slot0)=0 | 0x4557 diff=66 FF(slot1)=62 FF(slot0)=54 | 0x459B diff=58 FF(slot1)=0 FF(slot0)=0
    authority rows: 0x45DF=obj+0x2A78, 0x465F=obj+0x2AF8, 0x46DF=obj+0x2B78 ... 0x4CDF

7 claim(s): 7 PASS, 0 FAIL
```

## 5. Gate

`$ node tools/audit/check.mjs`

```
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
note tier A now 25584 functions / 57.7% of instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

## 6. Doc edits (only where the tool said FAIL)

`tail-containers.md`
- §3 scan rule now names D1-D4 and both ranges; the hit row is `slot0 1,258 / slot1 50` (block 2,119/150);
  the constant-length row is scoped to slot1's 50; a four-criterion table (D1-D4 x clean slot0 / clean slot1 /
  dirty slot0, block/segment) and the D3 = D4 note were added.
- Conclusion 5 qualifies the 50-grid to slot1 and names slot0's 1,258.
- §10's 4 K bullet is replaced by the measured runs per slot with the 0.99 criterion and the old ranges' values.
- §6's dirty-only paragraph: 214 -> 281 with the group, the top six, and the `0xF7897` artefact.

`tail-dense-3783A.md`
- (c3) table cell and bullet: 87/88 buckets x 256, `0xA5000` = 253, "not 100% occupied".
- 实体大小: 22,872 header records, naming `0xA5181/0xA5191/0xA51A1`.
- the summary table row at :283 carries the corrected numbers.

`coverage-map.md`
- :403's 22,875 -> 22,872 (same array, restated).

`write-side-desc.md`
- §4.1: the seven `bl` sites and their r2 values replace "唯一观测到的调用点".
- §5's `0x02B` row: value 1 -> 0, with "26/26 blocks measured 0".
- §9.4: the "only caller passes 1" premise replaced by the 4/1/2 split and 26/26 zeros.
- §8 prediction 1: typo claim withdrawn; the two image readings and the "all seven equal" result recorded.
- §11 row 3: `0x0193A514` recorded as real (12/12, 8/8, empty 6/6 = `0x39133514`), attribution unreproduced.

`records-128.md`
- title, §1.1 (all 15 char_off values, the closure arithmetic, `0x1617` -> `0x1B67`), §2.2 (islands mapped to
  the 68 B slots), §2.3 (windows rather than records; the `+1`/`+3` explained; `0x458F` is a slot-internal
  offset), §3 (旧网格 vs 权威族 columns; the "destroyed" sentence replaced by the measured floods), §4.1/§4.2.1,
  §5.1, §6, §9, §10 row, §7 header note, §7.4 tiling (28x68 withdrawn; 68 B offsets re-based to `0x4447`),
  §8.1 rows.

## 7. VERDICT

```
W2-SV1	fixed	the zlib metric is now four written definitions in tools/audit/claims-save.mjs (D1 2,131 pairs / D2 2,732 headers / D3 2,119 inflate / D4 2,119 adler over clean slot0's block) and reads 1,258/50 for the tail segment; "50 in each slot" replaced by "slot0 1,258 / slot1 50".
W2-SV2	fixed	the seven enumerated topics recompute and the docs are corrected: zlib 1,258/50; 4K windows 0xBE000..0xC7000 (p=4) + 0x118000..0x11C000 (p=2) in slot1; 281 B @0xDF047; 87x256 buckets with 0xA5000=253 and 22,872 records; 7 bl callers with 0x02B=0 in 26/26; 0x0193A514 real; floods at 0x4447/0x44CF/0x4557 with the 128B family untouched; claims-save.mjs exits 0 and check.mjs ALL PASS.
```

The audit's other six items (C4 slot qualifier, C5 1,268/1,269, C6 `0xC8A00`, C7 `0xC9E69`, C11 the 319 KB
"sparse" window, C12 the quest-id enumeration) are not part of the W2-SV2 parenthetical and were not re-run
here; they remain a follow-up.

## Difficulties

- The metric had to be recovered before any number could be trusted. For the zlib count the same bytes give
  2,131 / 2,732 / 2,119 / 1,258 depending on the test, which is why the W2-SV1 row could not be closed with a
  single number: the tool now prints all four per slot and the doc names the one it quotes.
- The main session's "34 adler-valid headers, median 29,516 B" is not reproducible. I scanned 14 snapshot
  files, every slot and five ranges (the `sweep` subcommand): no combination yields 34 inflating streams with
  a correct Adler32, and no median gap is 29,516. The 2,131 does reproduce exactly — as D1 (unvalidated byte
  pairs), not as adler-valid streams, which is probably how the two figures were mixed.
- The records-128 document is a two-round document whose own erratum (+0x550) was never applied to its tables.
  Re-basing the family was necessary for claim 7, but §7/§8's 68 B/136 B model was written on the un-shifted
  anchor; I corrected the extents that the bytes decide (6x68 B rows before the family, 3x136 B slots) and
  left the speculative model's cell contents alone, with a coordinate note at the head of §7 instead of a
  fabricated re-derivation.
- `read`/`cut` on the Chinese tables: cutting a UTF-8 line at a byte count mangles the whole tool output
  (it renders as GBK mojibake). The files were fine; every edit was applied as an exact `includes`/`replace`
  on the file content and all five files still have 100% CRLF and zero U+FFFD (checked after the edits).
- The image sizes in the docs' repro commands (`.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`) are dead
  paths; the only image present is `main.140.flat.bin` (md5 `1b865b537fa91c3d34f20776df01f8e3`, 25,472,632 B),
  which is what the tool reads.
