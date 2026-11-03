# LINK-METER-CHAIN — cross-document audit of the coverage measurement chain

Scope: the same fact stated in `docs/analysis/code/coverage/METER.md` (1,145 lines),
`HANDOFF.md`, `docs/PROGRESS.md`, `docs/analysis/code-metrics.md`.
Method: read the four files with ranged reads/greps, then recompute from the committed
artifacts — `docs/analysis/code/inventory/coverage-report.tsv` (what `report.mjs` writes),
`function-labels.tsv`/`labels-summary.md` (what `check-artifacts.mjs` reconciles), the
channel tables (`spread-accuracy.tsv`, `attr-*.tsv`, `sources.json`) and the scripts that
define each rule (`recompute.mjs`, `report.mjs`, `canonical-metric.mjs`, `check.mjs`).
This session has no shell tool, so "recompute" means: read the artifact the command writes,
and re-derive every percentage by arithmetic from the numbers the files themselves print.
Anything that would need an actual execution is listed under UNVERIFIED, not CONFIRMED.

## CONFIRMED

Artifact baseline (`docs/analysis/code/inventory/coverage-report.tsv`, verbatim rows):

```
denominator:	52692 functions,	5228277 instructions
A-direct (evidence row)	13061	1248279	23.9%	24.8%
tier A (verified)	25584	3014249	57.7%	48.6%
A-inferred (callee/caller/class vote channels, per-round 92.8-99.3%)	10138	1832618	35.1%	19.2%
A-signature (32-bit constant, fold 97.1%)	2496	260798	5.0%	4.7%	【2026-11-04 更正：该行当时按签名行数计，去重后是 1,511 函数 / 146,378 / 2.8%；见 METER「A-signature 行按行数而非函数数」】
partition: direct evidence	13061	1248279	23.9%	24.8%
partition: inferred only	11250	1896778	36.3%	21.4%
partition: signature only	1475	144714	2.8%	2.8%
partition: spread validated labels	2401	170761	3.3%	4.6%
partition: spread validated by vote count	0	0	0.0%	0.0%
partition: spread unvalidated	12187	1243602	23.8%	23.1%
partition: no label	12318	524143	10.0%	23.4%
expected explained fraction (precision-weighted, instructions only)	—	3919967	75.0%	—
expected explained fraction (optimistic, random-holdout weights)	—	4315652	82.5%	—
covered at >=90% precision	28187	3460532	66.2%	53.5%
covered, spread pooled at 72.4% (per-label range 5.5-99.8%)	40374	4704134	90.0%	76.6%
spread labels (independent 72.4% overall, CP95 71.3)	12187	1243602	23.8%	23.1%
```

- C1. **66.2% / 53.5% (the >=90%-precision line) — four files, one value.**
  `METER.md:3` (header), `METER.md:71` (「≥90% 精度（单跳，A 锚点）」row),
  `HANDOFF.md:21` and `:146`, `docs/PROGRESS.md:36`, `:73`, `:98`,
  `docs/analysis/code-metrics.md:9`, `:95`.
  All nine occurrences say 66.2% instructions / 53.5% functions. Artifact:
  `covered at >=90% precision 28187 3460532 66.2% 53.5%`.
  Arithmetic: 3,460,532 / 5,228,277 = 66.19%; 28,187 / 52,692 = 53.49%. Agrees.
- C2. **The >=90% line is exactly four partition buckets, and the buckets are conserved.**
  `METER.md:218` and `HANDOFF.md:142-146` both decompose it as
  direct 23.9 + inferred 36.3 + signature 2.8 + spread validated 3.3.
  Artifact arithmetic: 1,248,279 + 1,896,778 + 144,714 + 170,761 = **3,460,532**, the exact
  instruction count of the `covered at >=90% precision` row.
  Function side: 13,061 + 11,250 + 1,475 + 2,401 = **28,187**, the exact function count.
  Also: 13,061 + 11,250 + 1,475 + 2,401 + 0 + 12,187 + 12,318 = **52,692**, and
  1,248,279 + 1,896,778 + 144,714 + 170,761 + 0 + 1,243,602 + 524,143 = **5,228,277**.
  The six published buckets sum to 100.02% instructions (rounding), and the doc itself says
  "前四桶之和 66.3 ≈ 66.2" (`METER.md:218`) rather than pretending the rounded parts add to
  66.2 — the caveat is honest and the underlying counts close exactly.
- C3. **90.0% / 76.6% (spread pooled) — value matches the artifact** (`METER.md:3`,
  `METER.md:72`, `METER.md:503`, `METER.md:1109`). Artifact:
  `covered, spread pooled at 72.4% ... 40374 4704134 90.0% 76.6%`.
  Arithmetic: 4,704,134 / 5,228,277 = 89.97%; 40,374 / 52,692 = 76.62%.
  Independent closure: `labels-summary.md:7` states 已归属函数 **40,374** and its 14
  subsystem rows add up to exactly 40,374 functions and 4,704,134 instructions (I summed all
  14 rows: 9,769+6,821+9,245+7,058+2,062+1,094+1,388+1,071+434+412+227+509+243+41 = 40,374;
  instructions 1,303,148+…+5,887 = 4,704,134). The per-subsystem listing and the "90.0%" row
  are the same population. Note this number appears in **one** of the four documents
  (`METER.md`), so there is no cross-file copy to disagree.
- C4. **75.0% / 82.5% (expected explained fraction) — two files, one value.**
  `METER.md:3`, `:1109`, `HANDOFF.md:21`, `:148`; `HANDOFF.md:148` spells the pair
  "75.0%（保守）– 82.5%（乐观）". Artifact rows:
  `expected explained fraction (precision-weighted...) 3919967 75.0%` and
  `... (optimistic, random-holdout weights) 4315652 82.5%`.
  Arithmetic: 3,919,967 / 5,228,277 = 74.98%; 4,315,652 / 5,228,277 = 82.54% — and
  `METER.md:1109` prints that second division explicitly. Agrees.
- C5. **10.0% / 23.4% (no label) — value matches, and the function count is cross-checked
  by a gate.** `METER.md:3`, `:184`, `:750`, `:811`; `HANDOFF.md:21`, `:147`;
  `code-metrics.md:95` (10.0% only). Artifact: `partition: no label 12318 524143 10.0% 23.4%`.
  Arithmetic: 524,143 / 5,228,277 = 10.03%; 12,318 / 52,692 = 23.38%.
  `check-artifacts.mjs:81-87` asserts `function-labels.tsv rows == denominator - no label`
  i.e. 52,692 − 12,318 = 40,374, so the 12,318 is not a free-standing doc number.
- C6. **58.0% (project calibre) = 57.7% + 0.3%, in every file that states it.**
  `METER.md:4` (`57.7% + 0.3% = 58.0%`), `HANDOFF.md:22` and `:160`,
  `PROGRESS.md:73` and `:98`, `code-metrics.md:9`.
  Artifact: `tier A (verified) 25584 3014249 57.7%`. The 0.3% is computed by
  `canonical-metric.mjs:58-77` from the `tierb-pass*` slice tables with demoted starts removed
  (`:46-56`), and printed as `canonical total` at `:80`. `METER.md:1098` records the same step
  as `77 -> 74 ... 0.38% -> 0.3%`.
  Arithmetic: 3,014,249 / 5,228,277 = 57.65%; 57.7 + 0.3 = 58.0. `check.mjs:109-141` (gate 9)
  reads `canonical-metric.mjs`'s `canonical total` line and fails any of the four files whose
  "项目原始口径 … Tier A + B conf=A" line states a different percentage or whose written
  `a + b = c` formula does not add up — this is the only gate that covers all four documents.
- C7. **5,228,277 instructions and 52,692 functions are the same everywhere.**
  `HANDOFF.md:19,21,163,165`; `PROGRESS.md:91`; `code-metrics.md:8,17,19,139,190`;
  `METER.md:12,188`; artifact denominator line. `PROGRESS.md:91` also keeps the word count
  `5,228,347 个字` distinct from `5,228,277 条指令`, which is the correct distinction (one is
  the .text word range, the other the sum of function spans).
- C8. **The Tier A rule is one rule, described two ways, and both descriptions fit the code.**
  `HANDOFF.md:166` and `code-metrics.md:144-146`/`:189` call it "调用图 + 地址局部性双预测
  一致" ("两个独立的预测器：① 调用图传播…② 地址局部性"); `METER.md:654` calls it
  `recompute.mjs`'s "传播标签 == 地址最近种子的预测".
  Code: `recompute.mjs:86-119` propagates a label from seeds over callees ∪ callers for 8
  rounds with a >=2-vote threshold, and `:121-142` computes `predict()` = label of the nearest
  seed by address, then `if (pred && got && pred === got) tier = "A"`. The "got" is the
  call-graph prediction and the "pred" the address-locality prediction, so the two phrasings
  denote the same test. (Minor: `METER.md:654` cites `recompute.mjs:137`; the test is now at
  `:142` — line drift, not a different rule.)
- C9. **Tier A precision 78.3% — both files that state it agree, and the ratio is exact.**
  `METER.md:670` (`19,676/25,123 = 78.3%（CP95 77.8）`) and `:672`; `HANDOFF.md:21`
  ("Tier A 精度重测 78.3%") and `:160` ("78.3%（CP95 77.8，随机扣留 20% × 5 次，25,123 行）").
  Arithmetic: 19,676 / 25,123 = 78.32%. `METER.md:674` also quotes the script's per-run
  withhold counts 5007/5098/5009/4876/5133, which sum to 25,123 — internally consistent.
- C10. **The 30,167 A evidence rows split three ways and the parts close, in both files that
  state them.** `HANDOFF.md:142` and `:155`; `METER.md:958-960`.
  checked 22,957 + taxonomy 4,479 + unparsed 2,731 = **30,167**. The superseded split
  (`METER.md:798-800`) uses the same total: 19,378 + 10,789 = 30,167. The two splits are
  reconciled by the two processors added later: 1,354 + 2,225 = 3,579; 19,378 + 3,579 =
  **22,957** and 10,789 − 3,579 = 7,210 = 4,479 + 2,731. So the arithmetic proves the two
  tables describe the same 30,167 rows at two moments (see X1 for the labelling problem).
- C11. **95.3% is the same claim in both files** (`HANDOFF.md:142`, `METER.md:970`:
  "95.3% 的直接证据指令至少有一条能回到镜像重算的断言"). The copies agree with each other;
  the number itself does not survive arithmetic (see X2).
- C12. **The per-label spread precisions quoted in the prose are the numbers in the channel's
  own output table.** `METER.md:51-54` (independent-vs-self-certified table: online-nex 99.8
  (CP95 99.3), weapon-wp 98.4 (96.5), render-gfx 83.6 (81.7), ui 77.3 (75.6)) and `:72`
  ("online-nex 99.8、weapon-wp 98.4、render-gfx 83.6、ui 77.3、physics 59.3、monster-em
  22.6、quest 14.0、otomo-ot 5.5"); `HANDOFF.md:21` says "逐标签 5.5–83.6". Artifact
  `spread-accuracy.tsv`: `online-nex 0.9981 99.3`, `weapon-wp 0.9837 96.5`,
  `render-gfx 0.8356 81.7`, `ui 0.7729 75.6`, `physics-math 0.5931 54.1`,
  `monster-em 0.2261 15.9`, `quest 0.1402 10.4`, `otomo-ot 0.0547 3.3`,
  `kernel-os 0.3846 22.4`, `filesystem 0.0000 0.0`. Every prose figure matches its row.
- C13. **"What the >=90% line counts" is stated identically in METER and HANDOFF and is what
  the code does.** `METER.md:3` + `:71` ("直接证据 + 单跳推断 + 签名 + online-nex/weapon-wp
  两个已验摊开标签"), `HANDOFF.md:142-146`: same four groups.
  Code: `report.mjs:244` sets `VALID_SPREAD = new Set(["online-nex","weapon-wp"])` and the
  ≥90% row is `pDir + pInf + pSig + pSpV + pSpVote` (`report.mjs:351-352`). render-gfx, which
  older sections list as "计入", is explicitly withdrawn in the current sections
  (`METER.md:51-60`, `HANDOFF.md:145`).
- C14. **A-direct = 13,061 functions in the two places in METER that quote the report**
  (`METER.md:236`, `:270`) matches `A-direct (evidence row) 13061`. (Two other METER lines
  say 13,060 — see X6.)
- C15. **The counterfactual 66.89% is labelled as a counterfactual, not published as the
  headline.** `METER.md:1025-1046` prints `3,460,532 = 66.19%` as "现在" and
  `3,497,058 = 66.89%` as "计入 retile", and says "committed `sources.json` 不动" and
  "结论是'不加'". The "现在" column of that table (1,248,279 / 1,896,778 / 144,714 /
  170,761 / 1,243,602 / 524,143) is byte-identical to `coverage-report.tsv`, which
  independently re-confirms that the file's current partition is the artifact's partition.

Summary table of the target numbers (≥2 documents ⇒ must agree):

| number | documents:lines | verdict |
|---|---|---|
| 66.2 / 53.5 | METER:3,71, HANDOFF:21,146, PROGRESS:36,73,98, code-metrics:9,95 | agree, = artifact row (C1) |
| 58.0 | METER:4, HANDOFF:22,160, PROGRESS:73,98, code-metrics:9 | agree, = 57.7+0.3 (C6) |
| 57.7 | METER:4,1097,1100, HANDOFF:22,160,164 | agree, = artifact (C6) |
| 0.3 | METER:4,1098,1100, HANDOFF:22,160 | agree, = canonical metric's B slice (C6) |
| 23.9 | METER:218,236, HANDOFF:21,142, code-metrics:95,97 | agree, = artifact (C2) |
| 36.3 | METER:218,523, HANDOFF:143 | agree, = artifact (C2, but see X7) |
| 2.8 | METER:218,515,523, HANDOFF:144 | agree, = artifact (C2) |
| 3.3 | METER:218,516,523, HANDOFF:145 | agree, = artifact (C2) |
| 23.8 | METER:218,523, HANDOFF:21,147 | agree, = artifact (C2) |
| 10.0 | METER:3,184, HANDOFF:21,147, code-metrics:95 | agree, = artifact (C5) |
| 23.4 | METER:3,503,523 (only doc) | = artifact 23.4% (C5) |
| 75.0 / 82.5 | METER:3,1109, HANDOFF:21,148 | agree, = artifact (C4) |
| 90.0 / 76.6 | METER:3,72,503,1109 (only doc) | = artifact (C3) |
| 5,228,277 | all four | agree (C7) |
| 52,692 | all four | agree (C7) |
| 12,318 | METER:184,750,751,811,813, HANDOFF:147,152 | agree, = artifact (C5) |
| 40,374 | METER:750,751, labels-summary:7 | agree, = artifact (C3) |
| 28,187 | artifact row only, no doc copy | n/a — nothing to disagree |
| 26,057 | METER:1095 only (HANDOFF:164 gives the derived 473) | see X3/X4 |
| 25,584 | METER:1097, artifact | agree |
| 22,957 / 4,479 / 2,731 | METER:958-960, HANDOFF:142,155 | agree, and sum to 30,167 (C10) |
| 30,167 | METER:798, HANDOFF:142,155 | agree (C10) |
| 78.3 | METER:670,672, HANDOFF:21,160 | agree (C9) |
| 95.3 / 5.0 | METER:970, HANDOFF:142 | copies agree; arithmetic does not (X2) |

## CONTRADICTION

- X1. **Gate 6's split of the 30,167 A rows: 19,378/10,789 stated as current in METER, called
  superseded in HANDOFF, superseded in METER's own later section.**
  `METER.md:796-802` — table "A 行总数 30,167 / 有可机检断言、逐行重算通过 **19,378 / 19,378
  = 100%** / 只有类名/分类学依据 10,789", followed by the conclusion
  "**六成 A 证据可以回到镜像逐行重算，四成靠的是类名与分类判断**". No superseded marker at
  that location.
  `HANDOFF.md:155` — "旧写 19,378 / 10,789 是那两个处理器之前的分法", i.e. explicitly the old
  split; current is 22,957 / 4,479 / 2,731.
  `METER.md:958-960` — the current split, under the heading "直接证据桶里有多少'机检不到'？
  （2026-11-04，第三次修订）" (section starts `:950`), whose "顺带补上的两个处理器（本轮）"
  subsection (`:976-979`) lists the two processors (+1,354 motion signature, +2,225 block
  purity) but never says the earlier table is void.
  Deciding arithmetic: 19,378 + 1,354 + 2,225 = 22,957 and 10,789 − 3,579 = 7,210 =
  4,479 + 2,731; both splits total 30,167. **The artifact supports the 22,957 split** (it is
  the one that yields the 95.3%/5.0% pair — itself the subject of X2). The "六成/四成"
  sentence in METER is the stale one; the true ratio is 76.1% checked (22,957/30,167).
- X2. **95.3% + 5.0% cannot both be true, and the function-level table's denominator is not
  its own population.** `METER.md:962-970` and `HANDOFF.md:142` both print "95.3% … 完全没有
  的只有 762 个函数 / 62,561 条指令" (HANDOFF calls it 5.0% of instructions).
  Arithmetic: 62,561 / 1,248,279 = **5.01%**, so the complement is **95.0%**, not 95.3%;
  95.3 + 5.0 = 100.3, which no rounding of two values can produce.
  Root cause visible in the same table (`METER.md:964-968`):
  901,453 + 287,855 + 62,561 = **1,251,869**, i.e. 3,590 instructions more than the stated
  bucket 1,248,279. The table's three shares are computed against 1,248,279 while its three
  counts belong to a 13,112-function population (7,685 + 4,665 + 762 = 13,112), and
  `METER.md:281` already documents that entry-point gap: "报告里 `partition: direct evidence`
  是 13,061，差 51 个来自统计入口不同". Against its own population the shares are
  72.0 / 23.0 / 5.0 and the "at least one checkable" line is 95.0%. The only way to obtain
  95.3 is to add the two rounded shares (72.2 + 23.1), i.e. summing shares over a denominator
  that excludes the third bucket's excess.
  **The artifact supports 95.0%**, and even that is a statement about the 13,112 direct-split
  population rather than the 13,061 A-direct bucket — so the sentence needs its population
  named, not just its percentage fixed.
- X3. **"473 个被登记评审推翻的函数" vs "512 被降级表推翻".**
  `METER.md:4` ("已排除 473 个被登记评审推翻的函数"), `PROGRESS.md:73`
  ("口径已排除 473 个被登记评审推翻的函数"), `HANDOFF.md:164` ("相差 473 个函数") — versus
  `METER.md:1096` ("其中被降级表推翻 | 512 | 0.61%").
  Arithmetic from METER's own table: 26,057 − 25,584 = **473** = 512 demoted − 39 restored by
  a different ruling. So 512 functions were refuted and 473 is the net reduction after the 39
  came back with another adjudication. The phrase "被…推翻的函数" is attached to both the gross
  and the net count in different files, so one of them names the wrong set.
  **The artifact supports both numbers for different quantities**; the wording, not the
  arithmetic, is what conflicts.
- X4. **"58.1% 与 57.7% 相差 … 0.61% 指令" — the stated difference is the gross demotion share,
  not the difference between the two stated values.** `HANDOFF.md:164`.
  Arithmetic: 58.06% × 5,228,277 = 3,035,539; report `tier A (verified)` = 3,014,249 =
  57.65%; difference = 21,290 instructions = **0.407%** of the denominator, which is why the
  two numbers print as 58.1 and 57.7 (0.4 apart). The 0.61% is 31,892 instructions, i.e. the
  512 demoted rows (`METER.md:1096`); the other 0.20% is the 39 restored rows.
  **The artifact (METER.md:1095-1097 and the report) supports 0.4 as the gap**, 0.61 as the
  gross demotion. Note gate 9 cannot catch this: the line carries no `58.0`, no
  `项目原始口径`/`Tier B conf=A` trigger, so `check.mjs:118-128` skips it.
- X5. **The second metric's function denominator is 23,885 in two documents and 52,692 in
  three.** `code-metrics.md:140` ("函数口径（分母 23,885）作为第二指标并列报出") and `:190`
  (same, "口径顺序不可颠倒"); `HANDOFF.md:163` ("函数口径（分母 **23,885**）…") — versus
  `HANDOFF.md:19`, `:21`, `:139`, `:164` ("函数分母已重切为 52,692"), `PROGRESS.md:91,98`,
  `code-metrics.md:7,18`, `METER.md:12,188`, and the artifact's
  `denominator: 52692 functions`. `HANDOFF.md:22` even points the reader to "函数口径见 §5",
  which is the section that still says 23,885 before `:164` revises it in place.
  Partially labelled: `code-metrics.md:6-11` declares 23,885 the "区域平铺" and says
  §2/§5–§8's old numbers are historical, and `HANDOFF.md:164` revises the line above it.
  **The artifact supports 52,692**; the 23,885 sentence should be struck, not merely
  footnoted, because it is part of the still-valid 验收口径 definition.
- X6. **A-direct: 13,061 vs 13,060 functions, one function apart, in the same file.**
  `METER.md:236` ("13,061 函数 / 1,248,279 指令") and `:270` ("去重后直接证据是 13,061 个函数
  （coverage-report.tsv）") vs `METER.md:372` ("A-direct 的 13,060 个函数里有 356 个")
  and `:488` ("13,060 个函数各有一行可复核的依据").
  **The artifact supports 13,061** (`A-direct (evidence row) 13061`). The 13,060 copies are
  one-function-stale, almost certainly from the 3,220-instruction correction that moved 70
  adjudication rows (`METER.md:930-944`) — that correction changed instruction counts, and the
  prose function count was not re-read.
- X7. **The 36.3% "inferred only" bucket is described more narrowly than it is built.**
  `HANDOFF.md:143` defines it as "单跳推断（单票/双票/调用者/类共识，各自冻结在 ≥92% 的下界）
  **36.3%**" — four channels. But `report.mjs` fills that bucket from `Vset`
  (`report.mjs:226-236`), which is *every* `conf=V` row in `sources.json`, and
  `sources.json` also lists `attr-dualpredict.tsv`, `attr-classsingle.tsv`,
  `attr-tableseeds.tsv`, `attr-offsets.tsv`, `attr-offsetpairs.tsv` — all of which write
  `conf V` (read from their rows, e.g. `attr-dualpredict.tsv:2` "…V call-graph (1 A-labelled
  neighbours) and address locality (5 within 40) agree"; `attr-offsets.tsv:2` "…V 1 pure
  struct offset(s) say monster-em…"). So the published 36.3% includes at least three channel
  families the parenthetical does not name (dual-predict 711 rows — `METER.md:648`;
  class-single 425 — `:632`; table seeds 1,107 — `:455`; offsets 28 — `:434`).
  The number agrees with the artifact; the definition does not describe the artifact.
  METER's own phrasing ("单跳推断" plus the partition table) does not have this problem, which
  makes HANDOFF the odd one out.
- X8. **`PROGRESS.md` tells readers not to cite its own numbers while presenting them as
  current.** `PROGRESS.md:104`: "覆盖率**不要引用本文件里的数字**…唯一权威是 METER"; but
  `:36`, `:73`, `:98` present 66.2/53.5/58.0 as the measured state, and `:98` is a table row
  with a ✅/❌ verdict. The numbers happen to equal METER's, so this is a policy contradiction,
  not a numeric one — but it means PROGRESS cannot serve as the second witness its table
  looks like.

## STALE

- S1. **The unlabelled-function count in the form-classification section is 13,816, not
  12,318.** `METER.md:559` and `:576`: "10.6% 无标签的函数…下表是无标签桶那 **13,816** 个的
  分布" / "让 13,816 个无标签函数从'完全未知'变成'可按形状检索'", and the twelve form rows
  sum to exactly 13,816
  (6,114+1,953+1,291+1,200+940+637+498+449+336+162+147+89). Current no-label is 12,318
  (`METER.md:3`, artifact `partition: no label`). No superseded marker on that section. The
  section mixes eras in one paragraph: it says the file "覆盖全部 52,692 个函数" (current)
  and then reports the old bucket.
- S2. **"check.mjs 七门仍全 PASS" is stale; the gate set is 12.** `METER.md:752` vs
  `HANDOFF.md:241` ("**12 道门**，约 5 s") and `check.mjs`, which contains gates 1–12
  (`:15,30,40,47,61,71,85,96,109,147,179,200`). `METER.md:1113` says "原有 7 道门", which is
  correct in the past tense; `:752` is present tense about the tool.
- S3. **code-metrics.md's acceptance definition still attributes 94.7% to Tier A.**
  `code-metrics.md:189`: "达标口径… **`Tier A`（双预测一致，94.7% 实测）** + `Tier B` 中
  `conf=A` 的部分"; also `:238` ("Tier A（94.7% 实测）"). Current: `HANDOFF.md:160`
  ("78.3%…不是 94.7%") and `METER.md:672` ("Tier A 在新函数表上的精度约 78%，不是 94.7%").
  The file's header (`:10-11`) marks §2/§5–§8's *old-denominator* numbers as historical but
  enumerates only 80.8/71.7/72.8/52.2, and this sentence is the one HANDOFF:162 declares
  "仍然有效" as the target definition. So the stale precision sits inside the still-valid
  definition — the exact combination the other three documents warn against.
- S4. **"PASS … at 5 site(s)"** (`METER.md:1107`) — the gate-9 predicate at
  `check.mjs:118-128` (line contains `项目原始口径` or `Tier B conf=A`, contains
  `Tier A … B`, carries a percentage) matches **seven** current lines: `METER.md:4`,
  `METER.md:215`, `HANDOFF.md:22`, `HANDOFF.md:160`, `PROGRESS.md:73`, `PROGRESS.md:98`,
  `code-metrics.md:9`. Either the count is stale (two sites were added later) or the gate
  skips lines I cannot see it skip. Not executed (see U1), so this is unconfirmed — but the
  "5" cannot be reproduced by reading the current text.
- S5. **METER's own table of the six partitions inside the gate-8 section is the pre-correction
  one** (`METER.md:1124-1132`: spread validated 173,981, ≥90% 3,463,752 = 66.25%,
  "报告 66.3%"). Current artifact: 170,761 and 3,460,532 = 66.2%. This one **is** labelled,
  immediately below: "这张表是修掉'裁定量混入'之前跑的。第三次更正后整组数字下调 3,220 条指令
  （覆盖 3,460,532 = 66.19%）" (`:1134`). Listed only because the table itself carries no
  inline marker and the 3,220 difference equals 173,981 − 170,761, i.e. the reader must trust
  the note rather than the table.
- S6. **The "76.6%" function share is attached to two different instruction figures.**
  `METER.md:503` quotes the current "90.0% / 76.6%"; the superseded 2026-11-03 snapshot
  (`METER.md:244`) quotes "**90.8% 指令 / 76.6% 函数**" for a wider labelled population whose
  neighbouring row is 39,642 functions. Both are correct for their own era and the old section
  is labelled ("本节数字是当晚的快照，已被上文取代，勿引用"), but a grep for 76.6 returns the
  old pair first, and the instruction figure it belongs to (90.8) no longer exists anywhere in
  the artifact.
- S7. **Historical Tier A values in HANDOFF are correctly fenced, and I verified the fence,
  not just the value.** `HANDOFF.md:20` ("2026-10-23 历史值，勿引用", Tier A 8,856 / 51.5% /
  94.7%) and `:166` sit under `:162`'s "其余是该页 2026-10-23 的历史记录", and `:164` revises
  23,885→52,692 in place. No action; recorded because the same 94.7% is *not* fenced in
  code-metrics.md (S3).

## UNVERIFIED

- U1. **No command in this report was executed.** This session exposes read/grep/glob/write
  only (no shell, no node runner; the MHGU MCP tools are disassembly readers). Therefore
  `node tools/mhgu/coverage/canonical-metric.mjs`, `node tools/audit/check.mjs`,
  `independent-coverage.mjs`, `canonical-holdout-random.mjs` and
  `spread-precision-independent.mjs` were not run. Every "artifact" quote above is the
  committed file those commands write; every percentage is re-derived by arithmetic from the
  integers in those files. If a committed artifact were itself stale relative to its inputs,
  this audit would not detect it — that is gate 8's job, and gate 8 is code I read, not code
  I ran.
- U2. **The 0.3% Tier B conf=A share** cannot be re-derived without parsing the
  `tierb-pass1/2/3/*.md` slice tables (`canonical-metric.mjs:58-77`, regex
  `^\|\s*(0x[0-9a-fA-F]+)\s*\|[^|]*\|[^|]*\|\s*A\s*\|`). The only corroboration available
  without execution is METER's own audit trail (`:1098`: 77→74 functions, 0.38%→0.3%) and the
  fact that 57.7 + 0.3 = 58.0 satisfies gate 9's `|x+y−z| ≤ 0.15` and `|z−want| ≤ 0.001`
  rules — which would accept any pair summing to the printed total, so it is weak evidence.
- U3. **The CP95 bounds** (99.3, 96.5, 77.8, 71.3, 91.1, …) are Clopper–Pearson outputs of
  scripts I did not run. I checked only that each quoted bound is attached to the same
  numerator/denominator pair as its point estimate in the same table; I did not re-implement
  the interval.
- U4. **Row counts** (46,858 evidence rows, 24 source tables, 40,374 label rows, 30,167 A rows)
  are asserted by `check-artifacts.mjs:81-87` (label file vs report) and by METER's gate-6
  narrative. I could not count lines in a TSV with the available tools; I cross-checked
  40,374 through `labels-summary.md:7` and the 14-row subsystem sum instead (C3), and 30,167
  through three different splits that all total it (C10).
- U5. **`METER.md:1107`'s "5 site(s)"** (S4) and `METER.md:39`'s "46,858 行证据" are claims
  about gate output. I reconstructed the gate-9 match set by hand from its regex; the "5" does
  not reproduce, but a one-off environment difference cannot be excluded without running it.

## Difficulties

- **No execution tool.** The assignment's method ("run a command that recomputes it") was not
  available in this session; the substitute is artifact reading plus arithmetic. This is the
  single largest limitation and the reason five items sit in UNVERIFIED rather than CONFIRMED.
  Cost: every numeric claim needed a second read of the artifact row that owns it, instead of
  one command.
- **METER.md is a 1,145-line append-only correction log with ~15 self-superseded sections.**
  Distinguishing "current" from "historical" required reading each section header and its
  inline warning, and the two real staleness bugs (X1, S1) are exactly the sections that lack
  one. A future reader cannot tell 19,378 from 22,957 without doing the 1,354+2,225 arithmetic;
  that arithmetic exists only in HANDOFF:155, not in METER where the stale table lives.
- **The same percentage can belong to two different facts.** 95.3 is both "share of
  direct-evidence instructions with a machine-checkable assertion" (`METER.md:970`) and a
  render-gfx precision cell (`METER.md:909`); 2.8 is both `partition: signature only` and the
  old "未归属" bucket (`code-metrics.md:93`, disambiguated at `:95`); 5.0 is both the
  `A-signature` class share and "no machine-checkable row" instructions. Grep-based
  cross-checking therefore produces false contradictions unless each hit is read in context —
  I read every hit listed in the summary table for this reason.
- **Gate coverage is narrower than the prose implies.** Gates 9 and 10 between them cover the
  calibre (58.0) in four documents and the eight headline numbers in METER's header line only.
  The copies of 66.2/53.5/75.0/82.5/10.0 in HANDOFF, PROGRESS and code-metrics.md are still
  hand-typed and unread; the file that claims "手抄的数字必须有门读回" (`METER.md:1099-1109`)
  only made that true for one of the numbers.
- **Suggestive evidence of tool-side drift:** `report.mjs:3` still documents the denominator as
  "23,885 functions … from docs/analysis/code/inventory/tiers.csv" while the code actually
  prefers `tiers-merged.csv` and the denominator is 52,692. A comment that old is the kind of
  thing that later gets quoted as fact — the same failure mode as X5.
