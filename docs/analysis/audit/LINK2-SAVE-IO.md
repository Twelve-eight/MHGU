# Harvested from the agent's local:// report on 2026-11-04; the agent's write device refused working-tree paths.

# LINK2-SAVE-IO — second-wave linkage review of `docs/analysis/save-io/*.md` (+ `docs/analysis/fields/records-128.md`)

Scope: the four `.md` files that exist in `docs/analysis/save-io/` — `tail-containers.md`,
`tail-dense-3783A.md`, `social-checksum.md`, `write-side-desc.md`. `records-128.md` is not in that
directory (it is `docs/analysis/fields/records-128.md`) and is covered here because the ticket names
it; `block-graphs.md` does not exist anywhere in the tree (`find -iname "*block-graph*"` → 0 hits).
Cross-check document: `docs/save-layout/coverage-map.md`.

Read-only on the repository. Everything below was recomputed with node 24.22.1 against the two
snapshot files and the code image; scratch scripts live in `G:/tmp/link2/` (outside the tree). Nothing
in the repo was modified.

Gate first, as prescribed:

```
$ node tools/audit/check.mjs | tail -6
PASS published project calibre matches canonical-metric.mjs (58.0%) at 7 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans
ALL PASS
Wall time: 2.57 seconds
```

Ground truth used: `save-snapshots/20261022-clean-reference/system_CLEAN` and
`save-snapshots/20261022-v6-ready/system` (both 5,159,100 B), the four `.hnt` blocks (1,177,760 B
each), `main.140.flat.bin` (25,472,632 B = `0x184AE78`), `docs/save-layout/member4-file-layout.txt`,
`docs/data/functions-retile.csv.gz`, and the MHGU RE MCP (`disasm`, `calls_to`).
Slot bases re-verified arithmetically: `0x18CC9C + 0x11F8A0 = 0x2AC504`, `+36 = 0x2AC560`;
`0x2AC560 + 0x11F8A0 + 36 = 0x3CBE24` — the three `hunterAdds` are exactly one block + the 36 B slot
header apart. `0x11F8A0 = 1,177,760`; `0x11F8A0 − 0x80000 = 653,472`;
`0x11F8A0 − 0x3783A = 950,374`; `0x11F8A0 − 0xC8800 = 356,512`; `0xC95A8 − 0xC85A8 = 0x1000`.

Convention: CONTRADICTION is used for any statement the artifact refutes, giving `file:line`, stated
value, recomputed value, and which side the bytes support. Inclusive-end artefacts (a range end one
past the last byte, `0xAAA..0xBBB` spans equal to N or N+1) are not reported, per the acceptance rule;
where such an artefact was the only difference I say so and do not count it as a defect.

---

## CONFIRMED — claim, location, command, output

### A. `tail-containers.md`

| claim | location | recomputation | verdict |
|---|---|---|---|
| block 1,177,760 B; `hunterAdds=[0x18CC9C,0x2AC560,0x3CBE24]` | :3 | `0x11F8A0`=1,177,760; slot0+block+36=slot1; slot1+block+36=slot2 | agree |
| zero-hole table: 16 runs ≥256 B, 30,043 B total; every start/stop/length | :22-41 | `zeroRuns(slot1,0x80000,0x11F8A0,256)` → 16 runs, sum 30,043; **all 16 rows reproduce to the byte** (doc order differs: it lists `0x117125` first) | agree |
| only 2 holes ≥4096 B, covering 23,425 B | :43 | runs `0x117125`/17,681 and `0xC8535`/5,744; sum 23,425 | agree |
| `#6..#16` adjacent start difference is a constant `0x1D6` = 470 B | :44 | 9 gaps of 470 between 0x11B704…0x11C78A | agree |
| the hole map is per-slot: slot0 is all zero in `0x80000..0x80100`, slot1 is 16B-grid data | :45 | `slot0[0x80000..0x80100].every(0)` = true | agree |
| density profile, 10×64K rows (nonzero / %) | :47-62 | all 40 numbers exact (0x80000 → 61,145/93.3%; 0x110000 → 29,162/45.8% over 63,648 B) | agree |
| segment nonzero 474,575 = 72.62% | :10, :60 | 474,575/653,472 = 72.62% | agree |
| first byte `0x80000` nonzero; last nonzero `0x11F86E` | :62 | s1[0x80000]=0x26; last nonzero 0x11F86E | agree |
| 95.4% of bytes are outside every ≥256 B hole (30,043 = 4.6%) | :62 | 623,429/653,472 = 95.40% | agree |
| 44,865 nonzero clusters / 474,575 B; 13-bin length histogram; top-10 list | :64 | exact: `<2 5651, 2-4 9587, 4-8 3140, 8-12 1786, 12-16 22715, 16-20 1358, 20-24 506, 24-28 42, 28-32 33, 32-48 35, 48-96 9, 96-192 2, ≥4096 1`; top-10 `0xBD4B1/40205, 0xEF117/129, 0xFE6D7/100, 0xD1BF9/95, 0xE8827/81, 0xF9F7C/71, 0xF9F34/67, 0xD1BB7/65, 0xF9FDC/60, 0xE6137/56` | agree |
| zlib grid: 50 streams, `0xC9BA9+k×73`, `78 9c`, compressed length 29, decompressed 6,328 all zero, grid `0xC9B99..0xCA9DB` = 3,650 B | :13, :72-82 | `inflateSync` sweep of slot1: 50 hits, first 0xC9BA9, deltas `73×49`, outlen set {6328}, all-zero true, Adler `0x18b80001`; record grid 3,650 = 50×73 | agree |
| `826281`(dec) = `0xC9BA9` is the first stream; `0xC9E69` is a dec→hex typo and is not a stream start | :13, :84 | 0xC9BA9 = 826,281; 0xC9E69 = 826,985; bytes there are 16×`00`; `inflateSync` → "unknown compression method" | agree |
| record frames: 16B grid 22,940 / 324B ≥48 / 470B ×10 / 104B+2,496B / 80B ×434 | :88-94 | 16B header count in `0x80001..0x117117` = **22,940** and the delta histogram's `16 ×22,341` is exact (top gaps 416×116, 368×100, 256×72); slot0 324B grid = 50 records, records 1..49 each start with exactly 256 zeros, span `0xCACCD..0xCE98D` = 15,552 = 48×324; 470B stride 0x1D6 ×9; 62×7 = 434 language entries at 80 B | agree |
| `49 92 24` 3-byte period; `0f 10 10 10` family 2,640 hits `0xBD722..0xC70DE`, delta `4×2,629` | :86-97 | 2,640 hits, first 0xBD722, last 0xC70DE, delta map `4×2629`, plus 10 jumps of 2884 | agree |
| 62 quest records `0x807AE..0x115E64`; record header `1c bb e0 00`+u32+`34 01 00 40`; 7×80 B language entries `eng,fre,ger,ita,spa,chT,chS` | :98-118 | 62 headers, first 0x807AE, last 0x115E54 (+16 = 0x115E64); languages decode in the stated order at 80 B stride; u32 A = 128/131/111, u32 B = 2098/2799/1759; stride after #27 = 182,006 | agree |
| quest cache exists only in slot0 | :15 | clean slot0: 62 headers; slot1: 0; dirty slot0: 0 | agree |
| same-character diff 470,296 = 71.969%; first `0x80003`, last `0x11CF3A` | :120-125 | exact | agree |
| clean-only-nonzero 225,499 / dirty-only 93,390 / 2,495 gap-16 groups | :126-131 | 225,499 / 93,390 / 2,495 (both-nonzero 156,221) | agree |
| per-64K diff 77.8/77.0/78.9/99.6/60.2/55.9/80.0/76.3/77.8/35.1 % | :127 | identical | agree |
| cross-role same-byte 2.6/2.7/2.4/0.2/36.8/36.6/16.9/20.1/2.4/55.4 % | :129 | identical | agree |
| two largest diff groups 65,958 B and 36,575 B | :128 | 65,958 (`0xAE13B..0xBE2E0`) and 36,575 (`0xBE2F7..0xC71D5`); doc's ends are one past (not reported) | agree |
| ASCII strings: slot0 1,489 / 41,962 B / max 41; slot1 139 / 1,404 / 16 | :139-143 | exact (`≥8 B` printable-ASCII run scanner) | agree |
| §8 tail `0x117125..0x11F8A0` 34,683 B; slot0 nonzero 2,142 = 6.18% | :146-152 | 34,683; 2,142; 6.18% | agree |
| 206 B header `01 00 03 06 03 10 00` + `01..0f` | :148-150 | slot0 has exactly that (`01 00 03 06 03 10 00 01 … 0e 0f`, then zeros, final `02`) — the doc's §8 axis is slot0. slot1 has `01 00 03 04 03 0d 00 … 0b 0c`, which is the string `social-checksum.md:236` quotes, so **both documents are right for their own slot** | agree |
| 470 B record 10 = 9 B `2a 59 00 52 2e 5e 4b 62` | :92, :148-150 | slot0's record 10 has exactly those 9 bytes at +357..+365; slot1's differs (`a9 65 fb 51 a7 65 …`), consistent with the slot0 axis | agree |
| §9 aligned-u32 profile, 10 chunks × 6 columns | :157-168 | all 60 numbers reproduce **if the float column is read as `\|f\|∈[1e-4,1e6]`** (signed f halves it: 590 vs 1,121 at 0x80000); all rows close to 16,384 | agree, definition noted |
| §10 cluster-gap histogram `16×21,601, 4×4,817, 20×2,553, 2×1,947…`; buckets `2-4 3,600 … ≥256 20` | :174-184 | identical; 44,861 of 44,865 gaps inside 1..2048 | agree |
| C0..C7 tile 653,472 with no gap/overlap; closure sum | :186-204 | each interval recomputed (1,966 / 193,376 / 174,838 / 248,609 / 17,681 / 206 / 4,700 / 12,096) and the sum is exactly 653,472 | agree |
| C2 left edge: density jumps to 99.7% in the `0xB0000` chunk (slot0) | :197 | slot0 per-64K: 61.2 / 60.1 / 64.0 / **99.6** / 50.1 % | agree (rounding) |

### B. `tail-dense-3783A.md`

| claim | location | recomputation | verdict |
|---|---|---|---|
| clean/dirty MD5 `7729559b…` / `0e7d24ca…` | :23 | identical | agree |
| clean nonzero 198,607 (66.9%), dirty 117,674 (39.63%), both 80,816, clean-only 117,791, dirty-only 36,858 | :226-232 | exact | agree |
| no ≥32 B both-nonzero run; dirty-only max run 27 B at `0x62CBE..0x62CD9` | :233-235 | 0 runs ≥32 (max run 22); max dirty-only run 27 at 0x62CBE..0x62CD9 | agree |
| zero bytes 98,295 (33.1%); relative residual r=8 = 15,813 (2.85×) | :112 | 98,295; `(i−0x3783A)%16==8` → 15,813 (absolute ≡2 mod 16, as stated) | agree |
| lag equality `.1543/.3977/.1554/.3895/.3819/.3810/.1678/.4274/.1505/.1602/.3861` | :128-136 | identical for 15/16/17/32/48/64/324/432/470/564/1536 | agree |
| 8B header count 8,561 in the segment; 24,245 in `0x34000..0xC2000`, all ≡1 mod 16 | :142 | 8,561 (mod16 `{1:8561}`); 24,245 (`{1:24245}`) | agree |
| phase B `0x63841..0x80000` = 7,291 records, 100% header, pos0-7 100% | :149 | 7,291 slots, 7,291 headers, 0 zero, 0 other | agree |
| phase A 2,670 distinct 8B prefixes; counts 1,744 / 522 / 432 / 431 / 410 / 406 / 336 | :174-190 | 2,670 distinct; all seven counts exact | agree |
| phase A 89,664 (49.8%), 309,620 bits (1.72/B); phase B 108,943 (93.4%), 429,087 (3.68/B) | :196-202 | exact, counts and bit totals | agree |
| top u32 phase A `0x003F8000`×2,377, `0x24924900`×1,667; phase B `0x24924900`×7,292 | :196-202, :313 | exact | agree |
| phase B payload 58,328 B, entropy 7.534, χ²≈42,251, collision 0.00674 | :337 | 58,328 B, H=7.534, χ²=42,252, collision 0.00672 | agree (round-off) |
| max nonzero gap 43; gap=1 173,641; 2→11,070, 3→4,178, 4→3,088, 9→1,395, 7→1,306, 19→1,121, 5→986 | :100-108 | identical | agree |
| 24,966 nonzero runs, 24,092 of 1–16 B; longest 129 @`0x52A71..0x52AF2`, 100 @0x62031, 81 @0x4C181 | :102-108 | identical | agree |
| zero runs ≥64 B = 0 | :106 | 0 | agree |
| cross-artifact equality: hunterA.hnt vs sys slot1 **14.64%** (43,480/296,902); hunterB.hnt vs sys slot0 **100.00%** (296,899/296,902); hunterB vs dirty slot0 **25.05%**; member region **91.28%** | :320-324 | 43,480; 296,899; 25.05%; 91.28% — all exact | agree |
| clean slot0 vs slot1 both_eq 416/118,111; clean slot0 vs dirty slot0 both_eq 318/68,155 | :318-326 | identical | agree |
| slot table nonzero 58.4 / 66.9 / 11.8 / 39.6 % | :329-334 | 58.38 / 66.89 / 11.80 / 39.63 % | agree |

### C. `social-checksum.md`

| claim | location | recomputation | verdict |
|---|---|---|---|
| region `0xC8800..0x11F8A0` = 356,512 B; clean slot1 200,479 (56.2%), dirty slot0 127,946 (35.9%), diff 239,842 (67.3%) | :206-211 | 356,512; 200,479/56.2%; 127,946/35.9%; 239,842/67.3% | agree |
| first 32 B of the region zero in both saves | :211 | both true | agree |
| `0xC85A8..0xC95A8` is a 4,096 B zero gap (erratum to "64KB") | :180-185 | 0 nonzero of 4,096 in clean slot1, clean slot0 and dirty slot0 | agree |
| `821248 = 0xC8800 ∈ (0xC85A8,0xC95A8)` | :180-184 | 0xC8800 = 821,248, inside `0xC8535..0xC9BA5` | agree (hex typo elsewhere, see C6) |
| `0xBD4B1..0xBD722` = 625 B all `0x10`; `{0f,10}` family `0xBD4B1..0xC71BD` = 40,204 B | :220-230, :382 | 625/625 `0x10`; run end exactly 0xC71BD, length 40,204 | agree |
| no 8B block `0f 10 10 10 10 10 10 10` in the 2 KB window around 0xBD4B1 | :226-227 | 11 such blocks exist in the full 40 KB family, **0** in `0xBD0B1..0xBD8B1` | agree |
| 17,681 B zero hole; tail after it 2,098/17,002 = 12.3% nonzero | :236-240 | 17,681; 2,098/17,002 = 12.34% | agree |
| file header `0x14`=`0x36B2EE74`, `0x1C`=`0x4EB898`, payload[0]=`0xC6` | :200, :284 | 0x36b2ee74 / 5,159,064 / 198 | agree |
| index table after the hole `01 00 03 04 03 0d 00 01 02 … 0b 0c` | :236-238 | slot1 at 0x11B636 = `01 00 03 04 03 0d 00 01 02 … 0b 0c` | agree |

### D. `write-side-desc.md` (save-side claims only; code claims via `disasm`/`calls_to`)

| claim | location | recomputation | verdict |
|---|---|---|---|
| 7 records at char_off `0x10C + 44k`, first dword identical in all 7 | :19, :322-326, :456 | clean slot1, clean slot0, dirty slot0 and all three `.hnt`: `193a514 ×7`, `Set.size === 1` | agree |
| HR `0x028` = 8 / 198; gender `0x02A` = 1; `0x0B1` = 0 | :23, :335-345 | 8 (clean slot1), 198 (slot0 clean+dirty), 198 (hunterB `.hnt`); gender 1 everywhere; `[0xB1]===0` everywhere | agree |
| `0x270` = `0xFFC0` / `0xFFE0` | :23, :412 | 0xFFC0 (clean slot1); 0xFFE0 (slot0 clean+dirty, both hunterB `.hnt`) | agree |
| `0x272..0x273` is uninitialised stack residue that can differ between saves | :370-378, :462 | `0x0336` (clean slot1), `0x0336` (clean slot0), `0x0000` (dirty slot0) — differs as predicted | agree |
| `0x14b0b0` = equip-box reader: 11 `bl 0x3df2a8` + 1 tail `b`, 0 `bl 0x3df378` | :24-26, :541 | `disasm 0x14b0b0` (69 insns): 11 `bl 0x3df2a8` (5+5+1) + tail `b`; 0 `0x3df378` | agree |
| `0x14b1c4` = equip-box writer: 11 `bl 0x3df378` + 1 tail `b`, 0 `0x3df2a8` | :24-26, :541 | `disasm 0x14b1c4` (65 insns): 11 `bl 0x3df378` (5+5+1) + tail `b`; 0 `0x3df2a8` | agree |
| write scheduler `0x3e75f8` = 17 `bl` + 1 `b`; read scheduler `0x3e77b0` = 19 `bl` + 1 `b` | :383-395, :500-520 | retile callee lists: 17 and 19; function bounds `0x3e75f8..0x3e77b0` (110 insns), `0x3e77b0..0x3e7984` (117) | agree |
| ctor `0xdaba4` 28 insns; `0x3e0db8` 59; `0x3e0ea4` 148 | :47-52, :230, :270 | `functions-retile.csv.gz`: 28 / 59 / 148 | agree |
| equip box = 2000×36 + 1000×36 + 5,440 + 1,632 | :508-512 | reader loops `r7=2000`, `r7=1000`, then 5,440 and 1,632 → 115,072 (matches member[3]) | agree |
| the caller `0x3e11a8` passes `r2=1` | :315 | `0x3e11e4 mov r2,#1`; `0x3e11f8 bl 0x3e0ea4` | agree *at that site* (not the only site — see C8) |

### E. `records-128.md` (save-side numbers)

| claim | location | recomputation | verdict |
|---|---|---|---|
| diff/FF table i0..i14 = `53/45/30/106/89/38/55/80/115/114/72/3/1/0/9` and `0/0/0/0/0/0/0/63/54/56/9/0/0/0/0` | :167-181 | reproduced exactly at the document's own `0x408F+128k` offsets with clean slot1 vs dirty slot0 | agree as arithmetic over those windows |
| A1 island `0x4447..0x4485` = 63 B of `FF` | :135, :442 | clean slot0: 9 `FF`; clean slot1: 0; dirty slot0: **63** (dirty-only vs clean slot0 = 54) | agree |
| authoritative 15×128 B family at obj+0x2A78..0x3178 | :3, :36-56 | `member4-file-layout.txt:92-106` lists `0x045df obj+0x2a78 sz=128` … `0x04cdf obj+0x3178 sz=128`; the doc's `+0x550` erratum is correct | agree |
| 136 B slots at `0x4447/0x44CF/0x4557`, i.e. 2×68 B | :418, :483, :547-560 | the reader order has six consecutive 68 B rows at `0x4447, 0x448b, 0x44cf, 0x4513, 0x4557, 0x459b` = three 136 B pairs | agree |
| `0x44CF − 0x408F = 1088 = 16×68`; `0x4557 − 0x44CF = 0x88` | :480-486 | 1088 and 136 — correct | agree |

### F. Numbers shared with `coverage-map.md`

| claim | location | recomputation | verdict |
|---|---|---|---|
| cross-save grid `0xC8800..0x11F8A0`: slot1↔dirty0 **67.27%**, slot1↔slot1 **74.60%**, slot0↔slot0 **62.38%**, slot2↔slot2 **0.00%** | coverage-map:290 | exact | agree |
| whole tail `0x3783A..0x11F8A0`: 79.22 / 83.79 / 72.90 % | coverage-map:290 | exact | agree |
| `0xBD4B1..0xBD722` is not an 8B period structure; family spans 40,204 B to `0xC71BD` | coverage-map:140 | identical | agree |
| C0..C7 closure = 653,472 | coverage-map:341 | closes | agree |
| `0x117125..0x11B636` = 17,681 B zero hole | coverage-map:143, :349 | 17,681 | agree |

---

## CONTRADICTION

### C1 — `tail-containers.md:13, :74`: the zlib count is 50 in *both* slots; clean slot0 has **1,258**.

- Stated: "命中数 **50**（两槽同位置：slot1 `out.md` #B、slot0 `out2.md` S6 **各 50 条**）", under the
  segment-wide scan rule of `:71` (`CMF&0x0F==8` + `mod31==0` + `FDICT==0` → `decompressobj()`,
  require `eof`).
- Recomputed (`G:/tmp/link2/s24.mjs`, `s25.mjs`), sweep `0x80000..0x11F8A0`:
  clean slot1 **50** inflate-OK / 50 Adler-verified; **clean slot0 1,258 inflate-OK / 1,258
  Adler-verified** (all `78 9c`); dirty slot0 50 / 50. The 1,258 cover **192,722 B = 29.5%** of the
  653,472 B segment; record length min/median/max = 15 / **73** / 792 B; decompressed 25 / 308 / 6,328 B;
  per-64K counts `0x80000:178, 0x90000:173, 0xA0000:158, 0xC0000:50, 0xD0000:65, 0xE0000:193,
  0xF0000:181, 0x100000:180, 0x110000:80`.
- Arbiter: the bytes. Each hit both inflates to completion and is followed by the exact Adler32 of its
  output, which chance cannot produce 1,258 times. The 50-record grid really is at the same 0xC9B99
  offsets in slot0, but it is not slot0's total, and the 1,208 extra records are the same 73-byte
  family (median length 73).
- Consequence: `tail-containers` §1 conclusion 4 ("slot0 是 62 条 quest 记录数组") and §4's five-row
  container inventory omit the dominant container of slot0's tail.

### C2 — `tail-containers.md:133`: "最大单组只有 214 B（`0x98E6E`）" — the maximum is **281 B at `0xDF047`**.

- Stated: dirty-only-nonzero bytes per gap-16 diff group, maximum 214 B at `0x98E6E`; next values 187
  (`0x10ED61`), 185 (`0xF82A4`), 155 (`0xA53FB`), 145 (`0xF7897`).
- Recomputed (`s6.mjs`, `s33.mjs`) with the same metric: **281 @`0xDF047`**, 278 @`0xA84E7`,
  257 @`0x8A79F`, 250 @`0xD03DB`, 235 @`0x9E1C3`, 228 @`0x10E6A1`, **214 @`0x98E6E`**. The listed
  187/185/155 reproduce exactly, so the metric is identical; 33 groups exceed 145 B and six exceed
  214 B. Restricting to groups where the clean side has content still gives 235 @`0x9E1C3` > 214.
- `0xF7897` itself is not a diff byte (both saves hold 0 there); 145 is the count of the group
  `0xF6741..0xF7896`, so that citation is an exclusive-end artefact and is not counted as a defect.
- Arbiter: the bytes; the 281-byte group `0xDF047..0xDF19A` (clean side all zero) is precisely the
  "`0xD0000` chunk is denser in dirty" phenomenon the same paragraph describes.

### C3 — `tail-dense-3783A.md:161-162`: the header array is **not** 100% full; one 4 KB bucket has 253 and the run has a 48-byte hole.

- Stated: "`0x64000..0xBB000` 连续 **88 个 4KB 桶、每桶恰好 256 条**（4096/16）→ 头型 16B 记录数组
  **100% 占满**"; "逐 16B 定位连续段 = `0x63671..0xBCC20`（含；末条头在 `0xBCC11`）"; "实体大小
  … = 366,000 B … 22,875 条 16B 记录".
- Recomputed (`s12.mjs`, `s13.mjs`): 256 headers in **87 of 88** buckets; `0xA5000` has **253**.
  Slot-aligned scan of `0x63671+16k` (k=0..22,874) finds 22,872 headers; the three missing slots are
  `0xA5181, 0xA5191, 0xA51A1`, which hold one foreign 48-byte record
  (`00 00 00 00 00 00 11 44 …` / `00 00 00 00 20 cb 14 44 …` / `bc 94 6b 00 11 00 00 04 …`), with the
  grid resuming at `0xA51B1`.
- Arbiter: the bytes. Array start `0x63671`, last header `0xBCC11`, span 366,000 B and
  "8B fixed head + 8B payload" all stand; only "每桶恰好 256 / 100% / 连续" fails.
- Not counted: "`0x80000..0xBCF00` (15,599 条): 15,563 header / 33 zero / 3 anomalies" — my aligned count
  is 15,563 / **34** / 3 over 15,600 slots, a range-start boundary effect (0x80000 vs 0x80001).

### C4 — `tail-dense-3783A.md:13`: "本段不是容器格式：无 zlib 流" holds for clean **slot1** only.

- Stated (conclusion 1, no slot qualifier): "无 zlib 流、无长度前缀帧、无 ≥64B 连续零 … 它是单一连续
  打包数据体". §2's scan bullet is scoped "clean 该段", and this file's `clean` is slot1, so the sentence
  is defensible for slot1 — but the same `char_off` window in the same file's slot0 is a compressed
  container region.
- Recomputed (`s10.mjs`, Adler-verified over `0x3783A..0x80000`): clean slot1 336 candidate headers,
  **0** genuine streams; clean slot0 973 candidates, **761 genuine**; dirty slot0 114 / 0.
- Arbiter: the bytes. The "cannot be cut by zlib frames" conclusion needs the slot qualifier
  (slot1 yes, slot0 no).

### C5 — `tail-dense-3783A.md:165, :179`: the phase-A header-type count is **1,269**, not 1,268.

- Stated: "phase A 内该 8B 头型只占 **1,268/11,263 = 11.3%**" (:165) and table row
  `| ff00499224499224 | 1,268 | 11.3% |` (:179); the same file's §5.5 table (:314) says
  **1,269/11,264**.
- Recomputed (`s34.mjs`): for `0x37841..0x6383A` (11,263 slots) the header prefix occurs **1,269**
  times; the other tabulated prefixes are exact.
- Arbiter: the bytes. One of the two statements inside the file must change; §5.5's numerator is the
  correct one and (c5)'s denominator is the correct one for the `0x37841` start.

### C6 — `tail-containers.md:229`: `821248 = 0xC8A00` — it is `0xC8800` (the same typo as `coverage-map.md:146`).

- Stated: "现有回写窗止于 `821248 = 0xC8A00`，**落在 C2a 零洞（`0xC8535..0xC9BA5`）内部**".
- Recomputed: 821,248 = `0xC8800`; `0xC8A00` = 821,760. The point is inside C2a either way, so only the
  literal is wrong.
- Arbiter: hex arithmetic. The correct form is used by `social-checksum.md:180`, by
  `coverage-map.md:280`, and by `tail-containers`' own §6/grid text; `coverage-map.md:146` still has
  `0xC8A00` too (the first-wave fix LINK-SAVE-SIDE C9 landed at :145 but not at :146).

### C7 — `social-checksum.md:296` (risk R2): "char_off 826,281 = `0xC9E69` 有合法 zlib 流".

- Stated: 826,281 = `0xC9E69` holds a legal `78 9c` stream.
- Recomputed: 826,281 = **`0xC9BA9`** (the first grid stream); `0xC9E69` = 826,985 holds 16×`00` and
  `inflateSync` fails with "unknown compression method". `tail-containers.md:13`, `:84` already
  documents this exact error and the `Error -3` at `0xC9E69`.
- Arbiter: the bytes; two documents in the same directory disagree and `tail-containers` is right.

### C8 — `write-side-desc.md:315, :341, :475`: `0x3e0ea4` has **7** callers, three of them pass `r2=0`, and every saved block has `0x02B = 0`.

- Stated: "唯一观测到的调用点 `0x3e11a8`（拼 ctx 后 `mov r2,#1`）" (:315); table row
  "`0x02B` | 1 | 参数 r2（`0x3e11a8` 传 1）" (:341); ":475 … 唯一调用点传 1；未找到传 0/2 的调用者".
- Recomputed:
  - `calls_to 0x3e0ea4` → 7 direct `bl` sites: `0x3e09dc, 0x3e11f8, 0x3e7ae8, 0x3e7b34, 0x3e7b80,
    0x3e8190, 0x3e8ab4`; the retile `callers` column also says 7.
  - `disasm 0x3e7ac0` (the whole-file save loop that stores the three slot offsets at `[r5,#16]`,
    `[r5,#20]`, `[r5,#24]`): `0x3e7adc mov r2,#0` → `0x3e7ae8 bl`; `0x3e7b28 mov r2,#0` →
    `0x3e7b34 bl`; `0x3e7b74 mov r2,#0` → `0x3e7b80 bl`.
  - `disasm 0x3e8160`: `0x3e8188 movwne r2,#1` — a boolean, not the constant 1.
  - Artifact: `0x02B` = **0** in clean slot0, clean slot1, dirty slot0 and all three `.hnt` copies.
- Arbiter: code and bytes agree against the document. The value column of the `0x02B` row, and the
  "唯一调用点" premise of §9.4, are both refuted.

### C9 — `write-side-desc.md:456-460, :553`: `0x0193A514` is real, and `*(0x1839D68)+8` does not produce it.

- Stated: §8 prediction 1 — "`a.rd32(0x1839D68)+8` 得到的值应等于存档里那 7 个 dword 之一"; §11 item 3 —
  the recorded `0x0193A514` "落在镜像之外 … `0x0183A514` 才自洽 … 疑转写错误".
- Recomputed (`s26.mjs`, `s27.mjs`; flat = vaddr+0x100; image length `0x184AE78`):
  the save holds **`0x0193A514` ×7** in all three system blocks and all three `.hnt` files;
  `flat[0x1839E68] = 0x173650C`, `+8 = 0x1736514`; with the no-offset reading
  `flat[0x1839D68] = 0x1853688`, `+8 = 0x1853690`. Neither the save value nor the image slot yields
  `0x0183A514`.
- Arbiter: the artifact. §11 #3 should be withdrawn (no transcription error occurred), and the
  "7 dwords = leaked class constant from `*(0x1839D68)+8`" attribution is not reproduced — the
  "all seven are equal" observation itself stands.

### C10 — `records-128.md:135, :153-157, :185`: the four "destroyed" records are not the 128×15 family's i7–i10.

- Stated: "C1 岛在 `0x458F` 处跨记录，而 `0x458F` **恰是 128B 网格线**" (:157); "被涂记录 =
  i7/i8/i9/i10 四条（`obj+0x2DF8 / 0x2E78 / 0x2EF8 / 0x2F78`，`char_off 0x440F..0x45CF` 段)" (:185).
- Recomputed:
  - `member4-file-layout.txt` (the authority the document names at :3) puts the 15×128 B family at
    `0x45DF..0x4D5F` and six 68 B rows at `0x4447, 0x448B, 0x44CF, 0x4513, 0x4557, 0x459B`;
    `0x458F` is neither a 68 B nor a 128 B grid line (`0x458F − 0x4447 = 328 = 4.82×68`).
  - At the family's real coordinates (`0x45DF + 128k`) clean slot1 vs dirty slot0 gives
    **46/1, 2/0, 5/0, 2/0** for i7..i10 (diff/FF), and clean slot0 vs dirty slot0 gives **0 diffs over
    the whole 1,920 B family**.
  - The physical flood is at `0x4447..0x4485` (dirty 63/63 `FF`; clean slot0 9; clean slot1 0), which
    the authority maps to `obj+0x27A8`, the first of the six 68 B rows — exactly what the document's
    own later section concludes (`:418` "3 个有内容的槽（0x4447 / 0x44CF / 0x4557）", `:483`, `:588`
    "槽对齐是对的、写区是错的").
- Arbiter: `member4-file-layout.txt` plus the byte diffs. The diff/FF numbers are correct as byte
  counts over `0x440F..0x45CF`, but the structural claim ("records i7–i10 of the 128 B family were
  torn") is not: the torn rows are the 68 B rows at 0x4447/0x44CF/0x4557, and the 128 B family is
  untouched in the same-character pair.

### C11 — `coverage-map.md:142` vs `tail-containers.md:10`: the `0xC95A8..0x1175A8` window.

- `coverage-map.md:142`: "`0xC95A8..0x1175A8` | 采样点 18% | **319KB 稀疏区** … 猎人A 档近全 0".
- `tail-containers.md:10`: "「`0xC95A8..0x1175A8` 采样 18%、319KB 稀疏区」是 4KB 抽样假象，**作废**".
- Recomputed (`s30.mjs`) nonzero inside the 319,488 B window: clean slot1 (猎人A) **198,381 = 62.1%**,
  clean slot0 **162,527 = 50.9%**, dirty slot0 **125,798 = 39.4%**.
- Arbiter: the bytes; `tail-containers` is right and `coverage-map:142` (and `:146`'s reuse of the same
  window as "稀疏区") is stale — 62.1% nonzero is not "近全 0".

### C12 — `tail-containers.md:116`: the quest-id summary set does not equal the 62 measured ids.

- Stated: "id 集合：62 个 … `1010129..1010158`（27 条，缺 132/136/139）、`1010170..1010172`、
  `1011004/1008/1018/1019/1024`、`1110007/1111001/1111002/1111006/1111004`、`1010004`、
  `1010101..1010124`" — read literally 27+3+5+5+1+24 = **65**.
- Recomputed (`s15.mjs`), 62 unique ids in record order: `1010129…1010158` minus {132,136,139} (27),
  `1010171,1010172,1010170,1010174,1010175` (5), `1011004,1011008,1011018,1011019,1011024` (5),
  `1110007,1111001,1111002,1111006,1111004` (5), `1010004` (1),
  `1010101…1010112,1010118,1010119,1010120…1010124` (19).
- The count "62" is right; the enumeration adds `1010113..1010117` (absent) and omits
  `1010174/1010175` (present). Arbiter: the 62 headers and their `eng` paths.

---

### C13 — `tail-containers.md:180`: the two "exact 4 KB byte period" windows are the wrong ranges (and one is the wrong period).

- Stated: "全段 4KB 精确字节周期只出现在 `0xCB000..0xCF000`（period=4）与 `0xCF000..0xDD000`（period=2），
  即填充族内部".
- Recomputed (`s37.mjs`, `s38.mjs`): for every 4 KB window of `0x80000..0x11F8A0` and p=2..8, the
  windows whose exact byte-period match is ≥99% are exactly **13**: p=4 at `0xBE000..0xC7000`
  (`0xBE000/1.000, 0xBF000/1.000, 0xC0000..0xC3000/1.000, 0xC4000/0.999, 0xC5000/1.000,
  0xC6000/1.000`) and p=2 at `0x118000..0x11B000` (`1.000, 1.000, 1.000, 0.993`).
  In the two ranges the document names the period match is only `0xCB000 0.505, 0xCC000 0.411,
  0xCD000 0.440, 0xCE000 0.408` and `0xCF000 0.401 … 0xDC000 0.394` — i.e. the random-baseline
  level for these windows, not an exact period.
- Arbiter: the bytes. The correct ranges are the `{0f,10}` fill family `0xBD722..0xC70DE` for p=4
  (which does match the trailing clause "即填充族内部") and the 17,681 B zero hole
  `0x117125..0x11B636` for p=2. As written, both ranges and the p=2 attribution are wrong.

## STALE — number that was true earlier, and what superseded it

1. `tail-containers.md:13, :84`: "zlib 不是 1 条" → corrected to 50. Correct for clean slot1; itself
   superseded for clean slot0 (1,258, C1). The correction should read "50 (slot1) / 1,258 (slot0)".
2. `tail-containers.md:229` and `coverage-map.md:146`: `821248 = 0xC8A00` → superseded by `0xC8800`,
   which both files use elsewhere (`coverage-map:280`, `social-checksum:180`). The first-wave item
   (LINK-SAVE-SIDE C9) was applied at `coverage-map:145` but not at `:146`, and `:146` also still calls
   the 319,488 B window "稀疏区" (C11).
3. `coverage-map.md:142`: the "18% / 近全 0" sampling figure → superseded by 62.1% (C11);
   `tail-containers.md:10` already marks it void, coverage-map does not.
4. `tail-dense-3783A.md:165, :179`: 1,268 → superseded by 1,269 (C5); the same file at `:314` already
   carries the right numerator.
5. `write-side-desc.md:553` (§11 #3): "`0x0193A514` 是转写错误 / `0x0183A514` 才自洽" → superseded by
   the artifact (nine copies of `0x0193A514`; C9), and `0x0183A514` matches neither the save nor the
   image slot.
6. `records-128.md:3`: the `+0x550` erratum is present and correct, but §2.2's island→record mapping,
   §2.3's "128 B grid line at 0x458F" and §3's "destroyed i7–i10" table were never re-based on it
   (C10); the file's own §7.4 already replaces the 128 B semantic unit with the 68 B/136 B one.
7. Pre-fix `tail-dense` figure `~~15,360~~ 14,336` (`:86`) is present and struck through as
   LINK-STATUS N2 required — verified fixed, nothing to do.

---

## UNVERIFIED — load-bearing claims these tools cannot settle

- **CJK string counts** (`tail-containers.md:141`): stated slot0 **532 / 2,796 B**, slot1 **300 /
  2,121 B**. My scanner (maximal 3-byte UTF-8 runs whose code point is in U+4E00–U+9FFF) gives slot0
  **476 / 2,628** and slot1 **299 / 2,118**; adding full-width punctuation/kana gives 481 / 2,829 and
  312 / 2,343. The ASCII column of the same table reproduces *exactly* with the same scanner
  (1,489/41,962/41 and 139/1,404/16), so the divergence is the CJK predicate. Slot0's excess is exactly
  56×3 B (56 single-character runs) — a different run-splitting rule, unrecoverable without the
  original script (`.tmp` copies are gone).
- **`tail-containers.md:92` "CJK 起点 delta `104 ×92`"**: in `0x11C960..0x11F8A0` I find 108 CJK
  starts with gaps `104×90, 13×9, 91×8`; two starts short of the claim, same predicate problem. The
  companion "2,496 B 自相关 0.925/0.879" was not recomputed.
- **`tail-dense-3783A.md:196, :202` "floatish align0 8.3% / 27.0%"**: a different metric from
  `tail-containers` §9's "float [1e-4,1e6]" (which reproduces exactly with `|f|`). A value-range test
  gives 4.0% / 4.5%; an exponent-range test would include the 25% `0x24924900` words and match the
  doc's parenthesis. The metric is undocumented → no verdict.
- **`tail-containers.md:80` "变体 全段只出现 `78 9c`；`78 01`/`78 da`/`78 5e` … 0 命中"**: true for
  *valid streams* (all 50 hits are `78 9c`), false for *candidate headers* (slot1 tail has `78 5e` ×50,
  `78 da` ×3, `78 01` ×3, none inflating). Reading-dependent → no verdict.
- **`write-side-desc.md:335-338` `0x020` = playtime, `0x024` = gold**: the doc itself marks these
  `[INFERENCE]`; the bytes are plausible (70,310 s / 3,355,345 at HR5; 1,556,492 s / 9,185,849 at
  HR198) but cannot be proven from a snapshot.
- **`social-checksum.md:118-158` (C3)**: I did not scan image literal pools for `0xC8800`/`0x11F8A0`,
  so the "no constant" conclusion keeps exactly the bound the doc states (movw index only).
- **`records-128.md:66-110` obj-side/movw claims**: not re-derived; the authority file decides the
  file coordinates, which is all C10 needs.

---

## Difficulties

- The `write` device refuses paths inside the working tree (my first attempt at
  `G:/omp works/MHGU/...` was rejected, as the parent warned). All scratch scripts were written with
  bash heredocs to `G:/tmp/link2/` (outside the repo); the report itself is at
  `local://LINK2-SAVE-IO.md`.
- One of my own scripts produced a wrong sub-result: a block-scoped counter named `ff` shadowed the
  `const ff = []` array in `s28.mjs`, so "dirty-only FF in 0x4400..0x4600" printed 0. Re-running the
  same predicate directly (`s29.mjs`) gives 54 in `0x4447..0x4486` and 154 in `0x408F..0x464F`; only
  the re-run values are used above. Recorded so the 0 is not mistaken for a measurement.
- Definition ambiguity was the largest cost: two percentage columns (CJK text, "floatish") ship without
  a predicate, and `tail-containers` §9's float column only reproduces with `|f|` rather than signed
  `f` — which took three iterations before it was clear the table itself is fine.
- Hex/decimal mixing is endemic (`826281` vs `0xC9E69`; `821248` vs `0xC8A00`; `146358` vs `0x23BB6`).
  Recomputing every literal instead of copying it is what produced C6 and C7.
- `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`, the path the documents quote, no longer exists;
  only the top-level `main.140.flat.bin` (md5 `1b865b537fa91c3d34f20776df01f8e3`) is present, so the
  documents' reproduce commands are dead paths (C9 is decided by the save side anyway).
- The first-wave `LINK-SAVE-SIDE.md` was written without any exec device. Several of its UNVERIFIED
  items are now settled by computation and appear as CONFIRMED above (239,842/67.3 %, the
  74.6/62.4/0.0 grid, the alias↔slot bytes). The `docs/save-layout/*` contradictions it raised that
  LINK-STATUS.tsv does not cover (C9 hex typo, C14 volume-array double count, C17 pouch 34 slots) were
  not re-audited here because that directory is outside this ticket; the coverage-map rows I did check
  (:140, :142, :143, :146, :280, :290, :341, :349) show the fixed items (TE 0x208CE, TF 41,542,
  TG 5,463, TK grid, N2 14,336) in place.
