# LINK-SINGLE-MENTION — load-bearing numbers, ranked, and whether the artifact supports them

Scope: every number below was either recomputed here or explicitly left unverified. Repo `G:/omp works/MHGU`, read-only;
the only file written is this one. Date of readings: 2026-11-04.

Tooling caveat that shapes the whole report: **this agent has no shell.** `xd://bash` and `xd://run` both answer
"No such tool"; the only mounted devices are `mcp__mhgu_re_*` (binary readers). "Command" is therefore one of:
(a) a SQLite query executed by the `read` tool against `docs/data/mhgu.db` (`?q=...`), (b) a whole-file line total from the
`read` tool's own `Showing lines 1-N of TOTAL` footer, (c) arithmetic over cells read from the named artifact, (d) the
generator source, (e) a pattern search used as a presence/absence test (never as a count). Nothing here is a `node` run;
numbers needing `node` are listed under UNVERIFIED with the exact command.

## Ranked table (acceptance)

Rank = blast radius if the number is wrong (published headline > gate threshold > build decision).

| # | value | file:line | command / recomputation | actual | verdict |
|---|---|---|---|---|---|
| 1 | **66.2% instr / 53.5% fn** at ≥90% precision | `docs/analysis/code/coverage/METER.md:3,71`; `coverage-report.tsv:18`; `PROGRESS.md:73`; `HANDOFF.md:21` | sum the 7 partition rows of `coverage-report.tsv:9-15`, divide by `:1` | 3,460,532 / 5,228,277 = **66.19%**; 28,187 / 52,692 = **53.49%**; the partition sums exactly to the denominator on both axes | HOLDS |
| 2 | **90.0% / 76.6%** (spread pooled 72.4%) | `METER.md:3,72`; `coverage-report.tsv:19` | same rows, `:19` cells 3-4 | 4,704,134 / 5,228,277 = **89.97%**; 40,374 / 52,692 = **76.62%** | HOLDS |
| 3 | **95.3%** of direct-evidence instructions have a machine-checkable assertion | `METER.md:970`; `DEVLOG.md:1194`; `HANDOFF.md:142` | (a) 1,189,308 = 901,453 + 287,855; (b) divide by both candidate denominators | /1,248,279 = **95.27%** ✓; /1,251,869 (the table's own row sum) = **95.00%** ✗ | DOES NOT HOLD on its own table — CONTRADICTION 1 |
| 4 | **762 functions / 62,561 insns / 5.0%** have no machine-checkable A row | `METER.md:968,970`; `HANDOFF.md:142` | (a) 21,209 + 41,352; (b) 62,561 / 1,248,279 | 21,209 + 41,352 = **62,561** ✓; 62,561/1,248,279 = **5.01%** ✓ (5.00% on the row-sum denominator) | HOLDS (arithmetic) |
| 5 | **40,374** labelled functions | `coverage-report.tsv:19`; `labels-summary.md:7`; `METER.md:750`; `DEVLOG.md:1196` | add the 14 subsystem rows of `labels-summary.md:9-23`; and 52,692 − 12,318 | **40,374** ✓ and **40,374** ✓; the third leg (`function-labels.tsv` line count) unreadable (5.2 MB, tool stops before EOF) | HOLDS (2 of 3 legs) |
| 6 | **28,187** functions covered at ≥90% | `coverage-report.tsv:18` — the only occurrence in the tree | 13,061 + 11,250 + 1,475 + 2,401 | **28,187** ✓ | HOLDS |
| 7 | gate-6 split **22,957 / 4,479 / 2,731** of **30,167** A rows | `METER.md:958-960,798`; `HANDOFF.md:142,155` | (a) add; (b) line total of `evidence-row-class.tsv`; (c) `verify-evidence.mjs:190,196` | 22,957+4,479+2,731 = **30,167** ✓; 4,479+2,731 = **7,210** = the exact line count of `evidence-row-class.tsv`, which contains no third class; the script asserts `total+skipped+unparsed === expectedA` and exits 1 otherwise | HOLDS as a partition (absolute 30,167 not re-counted) |
| 8 | **"100% 一致"** for the 22,957 rows | `HANDOFF.md:155`; `DEVLOG.md:1194` | read `check.mjs:74-80` + `verify-evidence.mjs:150-199` | gate FAILs unless `ok === total`; `SAMPLE=100000` ⇒ step 1 for every listed table (largest 13,577 rows) ⇒ full traversal | HOLDS (gate-enforced) |
| 9 | **22,957 = 19,378 + 1,354 + 2,225** | `HANDOFF.md:155`; `DEVLOG.md:1194`; `METER.md:799,978,979` | arithmetic; row counts of the two new tables | identity ✓; `attr-blocks.tsv` = header + **2,225** rows ✓; `attr-fingerprint.tsv` = header + **1,839** rows, of which the motion-signature subset is the +1,354 (`METER.md:978`) | HOLDS (subset size not counted) |
| 10 | **"Tier A precision = 78.3%"** | `HANDOFF.md:21,160`; `METER.md:670,672,676` | divide the numbers `METER.md:669-670` prints | 19,676/25,123 = **78.32%** = P(in tier A **and** correct); 19,676/21,004 = **93.67%** = P(correct \| still tier A); 19,726/25,123 = 78.5% = label match | MISLABELLED — CONTRADICTION 2 |
| 11 | **958 / 7.8% / 124,509 / 2.38%** (unlabelled functions with a string ref) | `METER.md:834`; `HANDOFF.md:152`; `DEVLOG.md:1264` | divide by `coverage-report.tsv:1,15` | 958/12,318 = **7.777%** ✓; 124,509/5,228,277 = **2.381%** ✓ | HOLDS (arithmetic); numerator provenance UNVERIFIED |
| 12 | **2,380 functions / 4,252 refs / 3,214 strings** (string xref rebuild) | `METER.md:194`; `DEVLOG.md:950` | compare with `METER.md:834` / `DEVLOG.md:973` (same artifact) and with `stringxref.tsv`'s line total | `stringxref.tsv` = header + **16,998** rows; the tree's current figure is **5,043 functions** ("4,502→5,043") | STALE (generation 1 stated in the present tense) |
| 13 | **5,043** functions with a string reference | `METER.md:834`; `DEVLOG.md:973` | cannot aggregate distinct starts without a shell; `stringxref.mjs:102` prints `functions with refs: N/M` | 16,998 rows / 5,043 functions ≈ 3.37 refs per function — plausible, unproven | UNVERIFIED |
| 14 | **2,621** foreign-key violations (quests 1127 / meow_rewards 1168 / skills 326) | `tools/audit/check.mjs:201,213` (gate 12) | `docs/data/mhgu.db?q=SELECT "table" AS t, count(*) AS n FROM pragma_foreign_key_check GROUP BY 1 ORDER BY 2 DESC` | `meow_rewards 1168 / quests 1127 / skills 326`; `SELECT count(*) … pragma_foreign_key_check` = **2621** | HOLDS (independent recomputation) |
| 15 | **2,225 / 711 / 1,839 / 13,577** channel row counts | `METER.md:254,279,648,257`; `DEVLOG.md:1194` | `read <file>:1-1` footer | `attr-blocks.tsv` 2,226 (2,225 rows) ✓; `attr-dualpredict.tsv` 712 (711 rows) ✓; `attr-fingerprint.tsv` 1,840 (1,839) ✓; `attr-vtable-retile.tsv` 13,578 (13,577) ✓ | HOLDS (4/4 exact) |
| 16 | **512 refuted / 473 net excluded / 58.06% raw spine vs 57.7% verified** | `METER.md:4,1095-1097`; `HANDOFF.md:164`; `canonical-metric.mjs:9` | 26,057 − 25,584; 512 − 39 | **473** ✓ = 512 − 39 (`METER.md:1097` "脊柱 − 降级 + 39 个另有裁定的"); 3,014,249/5,228,277 = **57.65%** ✓ | HOLDS |
| 17 | **227,386 B** as the member-layer size | `HANDOFF.md:16` | compare with `PROGRESS.md:14` (226,754) and gate 11's file list (`check.mjs:186`) | HANDOFF states the value gate 11 exists to forbid, and gate 11 does **not** read HANDOFF.md | CONTRADICTION 3 (save side, already covered by `LINK-SAVE-SIDE.md`; cited here because the gate's blind spot is a linkage fact) |

## CONFIRMED — claim, where stated, command, output

Beyond the HOLDS rows above, four facts that carry the whole coverage number:

- **The partition is conserved in the artifact, not only in prose.** `coverage-report.tsv:9-15` sums to `5,228,277`
  instructions and `52,692` functions exactly; `:19` is the sum of `:9-12` (`1,248,279 + 1,896,778 + 144,714 + 170,761 =
  4,704,134`; functions `13,061 + 11,250 + 1,475 + 2,401 = 40,374`). Output quoted in ranked rows 1-2.
- **`evidence-row-class.tsv` is the fall-through dump and it matches.** `verify-evidence.mjs:177-179` pushes only
  `unparsed` / `skip` rows into `DUMP`; line 196 asserts `total + skipped + unparsed === expectedA` and sets exit code 1
  on mismatch, which `check.mjs:75` turns into a gate FAIL. The file holds **7,210** rows = 4,479 + 2,731 exactly, and a
  negative control — `grep '\t(checked|pass|ok|verified)$'` on it — finds **no** third class, so the 7,210 is the sum and
  not a coincidence.
- **The two spread label ranges agree once the subsets are separated.** `coverage-report.tsv:19` labels the pooled row
  "per-label range 5.5-99.8%", `HANDOFF.md:21` says "摊开未验 … 逐标签 5.5–83.6%". Not a contradiction: 99.8 is
  `online-nex` and 98.4 `weapon-wp`, the two labels in `VALID_SPREAD` (`METER.md:65`, per-label table `METER.md:51-59`),
  while 83.6 is the maximum among the unvalidated labels (render-gfx). The pooled row itself reproduces:
  5,144/7,106 = **72.4%** (`METER.md:61` vs `coverage-report.tsv:20`).
- **`2,621` foreign keys** (ranked row 14) is the only number here reproduced by executing a query rather than reading.

## CONTRADICTION — same fact stated differently: both file:line, both values, and which side the artifact supports

**1. The 95.3% headline is computed on a denominator its own table contradicts.**
- Side A: `METER.md:962` heading "函数级（直接证据桶 **1,248,279** 条指令）" — the same value as `coverage-report.tsv:3`
  (`A-direct (evidence row) 13061 1248279`) and `METER.md:236`.
- Side B: the three rows it heads, `METER.md:966-968`: 901,453 + 287,855 + 62,561 = **1,251,869**.
- The artifact supports A for the bucket total and B for the decomposition. The 51-function gap is documented
  (`METER.md:281`: "报告里 `partition: direct evidence` 是 13,061，差 51 个来自统计入口不同"); the **3,590-instruction
  gap is not**. Consequence: `METER.md:970`'s 95.3% (= 1,189,308/1,248,279) is not derivable from the table it concludes
  from — that table's own counts give **95.00%**. Same for 72.2%/23.1%, which are 72.01%/23.00% on the row sum.

**2. "Tier A precision 78.3%" is a joint probability, not a precision.**
- `METER.md:670`: "| tier A 且标签正确 | 19,676/25,123 = 78.3%（CP95 77.8） |" — correct as written.
- `HANDOFF.md:21`: "Tier A 精度重测 78.3%"; `HANDOFF.md:160`: "Tier A 的精度已在 2026-11-04 重测：78.3%";
  `METER.md:676`: "58.0% 的指令落在 Tier A + conf=A 这一层，这一层的精度 … ~78%".
- The same section prints both factors: 83.6% of withheld rows "came back as tier A" (21,004/25,123) and 19,676 carry
  the right label. So 78.3% = 0.836 × 0.937 is **retention × conditional accuracy** — a recall-like figure. The precision
  of a retained tier-A row is 19,676/21,004 = **93.67%** (1,328 of 21,004 wrong); 50 rows matched the label without
  returning to tier A (19,726 matches vs 19,676 joint). Read as "tier A labels are 78% right", the project's largest
  published bucket (57.7% of instructions) is misdescribed by ~15 points. The artifact supports 78.3% for the joint
  quantity only. **Load-bearing mislabel: it sits in the top status table of the handoff and is quoted without its
  definition everywhere else.**

**3. `227,386 B` is still published as the member-layer length.**
- `HANDOFF.md:16`: "`0x278..0x3783A` = 227,386B **100% 结构级**".
- `PROGRESS.md:14` and `save-layout/coverage-map.md:8`: **226,754**, with the ruling "`0x3783A` 是终点偏移"
  (`PROGRESS.md:23`).
- Gate 11 (`check.mjs:186-191`) FAILs any 0.85-formula line that uses 227,386 or omits 226,754, but iterates only
  `docs/PROGRESS.md` and `docs/save-layout/coverage-map.md` (`check.mjs:186`), so the handoff document — the first thing a
  returning session reads — keeps the retired value. Artifact supports 226,754 (= 0x3783A − 0x278).

**4. "Gate 6 now covers all 24 evidence tables" is not what the code does.**
- `METER.md:790` "名单扩到**全部 24 张证据表**"; `HANDOFF.md:155` "现在覆盖**全部 24 张表**".
- `verify-evidence.mjs:150` iterates **16** files: 15 names from `sources.json` (which lists 24) **plus**
  `attr-vtable-retile.tsv`, which is not in `sources.json` at all (METER has a whole section on why).
- The 8 omitted names (`attr-classvote`, `attr-callervote`, `attr-callvote`, `attr-callvote1`, `attr-offsetpairs`,
  `attr-offsets`, `attr-dualpredict`, `attr-classsingle`) are conf=**V** only — checked on `attr-dualpredict.tsv:2`,
  `attr-callvote.tsv:2`, `attr-tableseeds.tsv:2`, `attr-classsingle.tsv:2` — so no A row is skipped in substance, but the
  sentence and the "24 tables" scope describe a different set from the one the code reads.

## STALE — number that was true earlier; what superseded it if the repo says

| value | where | superseded by | evidence |
|---|---|---|---|
| 19,378 checked / 10,789 unverifiable | `METER.md:799-800`; `METER.md:483-486` ("8,089/8,089 = 100%", "13,060 个函数") | 22,957 / 4,479 / 2,731 | `HANDOFF.md:155`: "旧写 19,378 / 10,789 是那两个处理器之前的分法" |
| 8,089 rows as "the full set" | `check.mjs:74` (comment), `METER.md:785`, `DEVLOG.md:1194` | 30,167 rows / 22,957 checked | `METER.md:958`, `HANDOFF.md:155` |
| "100% of 8,089" in the report generator's rationale | `tools/mhgu/coverage/report.mjs:302` (comment) | 22,957 of 30,167 | as above |
| 13,060 rows of checkable evidence | `verify-evidence.mjs:3-4` (header comment) | 30,167 A rows | `METER.md:798` |
| 2,380 functions / 4,252 references / 3,214 strings | `METER.md:194`, `DEVLOG.md:950` | 5,043 functions | `DEVLOG.md:973` "4,502→5,043"; artifact has 16,998 rows |
| gate 6 "expanded from 8,089 rows to 22,957 rows" | `DEVLOG.md:1194` | row universe 30,167; 22,957 is the checked subset | `METER.md:958`, `HANDOFF.md:155` |
| 277 seeds for `attr-xref.tsv` | `METER.md` "可信基线" block (explicitly marked 勿引用) | 676 rows (header + 676) | `attr-xref.tsv` line total 677; METER's channel table already says 676 |

## UNVERIFIED — load-bearing claims that cannot be checked with available tools, and why

No shell, so nothing below was recomputed; each needs one command.

| claim | where | command | why it matters |
|---|---|---|---|
| 30,167 A rows (absolute) | `METER.md:798`, `HANDOFF.md:142` | `node tools/mhgu/coverage/verify-evidence.mjs`, read the `split …` line | denominator behind every gate-6 percentage; only its internal partition was checkable |
| 22,957 / 4,479 / 2,731 individually | `METER.md:958-960` | same run; `DUMP=… node …` reproduces `evidence-row-class.tsv` | the dump proves the sum, not the split |
| +1,354 motion-signature rows | `HANDOFF.md:155`, `METER.md:978` | count `attr-fingerprint.tsv` rows whose evidence starts `motion signature` | half of the 22,957 − 19,378 increment |
| 5,043 functions with a string reference | `METER.md:834` | `cut -f1 docs/analysis/code/inventory/stringxref.tsv \| sort -u \| wc -l`, cross-check `node tools/mhgu/coverage/stringxref.mjs` (`functions with refs: N/M`) | feeds 958 / 7.8% / 2.38% |
| 958 unlabelled functions, 124,509 instructions | `METER.md:834` | join `stringxref.tsv` against the no-label set of `tiers-merged.csv` | the whole "the last 10% lacks positive evidence" conclusion |
| 2,380 / 4,252 / 3,214 | `METER.md:194` | `node tools/mhgu/coverage/stringxref.mjs` (prints `rows N`) | stale, but METER still declares them current |
| **"44%" of A evidence covered before the fix** | `METER.md:781` (section title), `HANDOFF.md:155` | none given; the only supplied figures are 8,089 rows and 6 tables | **no denominator is stated and no reading reproduces 44%**: by rows 8,089/30,167 = **26.8%**; against the pre-handler checked count 8,089/19,378 = **41.7%**. A load-bearing claim about how bad the old gate was, with an unreproducible headline. |
| 78.3% (CP95 77.8) | `HANDOFF.md:160`, `METER.md:670` | `node tools/mhgu/coverage/canonical-holdout-random.mjs` | the interval is quoted in the top status table; the point estimate's arithmetic checks (19,676/25,123), the interval does not |
| 66.2% / 28,187 by an independent implementation | `coverage-report.tsv:18` | `node tools/mhgu/coverage/independent-coverage.mjs` (gate 8), `node tools/mhgu/coverage/canonical-metric.mjs` (gate 9), `node tools/audit/check.mjs` (12 gates) | here it is confirmed only by the report's own partition arithmetic — the "one implementation grades itself" pattern the tree itself warns about |
| 40,374 as `function-labels.tsv`'s line count | `DEVLOG.md:1196` triple equality | `wc -l docs/analysis/code/inventory/function-labels.tsv` | third leg of the triple unreadable (5.2 MB, tool stops before EOF) |

## Judged not load-bearing (and why)

These were found in the sweep and deliberately not pursued:

- **`277` seeds** (`METER.md`, 可信基线 block) — that whole block is banner-marked "勿引用"; the current channel table
  says 676 and the artifact (677 lines) agrees. Nothing published reads the 277.
- **`46,858` evidence rows** (`METER.md:5`, gate 5 scope) — a structural scope statement; if it drifts, `check-artifacts`
  fails a gate rather than a document asserting a false result.
- **`4,461` old string tokens / `32` survivors** (`METER.md:193`, `DEVLOG.md:950`) — the retired measurement whose only job
  was to justify rewriting `stringxref.mjs`; the rewrite happened and is reversible only by deleting a tool.
- **`1,044` rows / `988` classes / `+0.70` pt / `66.89%`** (`DEVLOG.md:1197`) — a rejected counterfactual. If the numbers
  are wrong, the decision ("do not adopt `attr-vtable-retile` into sources.json") is unchanged, and no published figure
  uses them.
- **`1,772 / 429 / 1,145 / 715` uifamily composition** (`METER.md`, `attr-uifamily` 实际构成) — describes one channel's
  evidence shapes; no headline arithmetic touches it.
- **`233` class names** (`METER.md:836,901`; `HANDOFF.md:152`; `DEVLOG.md:1273`) — supports the qualitative claim "0
  candidates", which is the load-bearing statement; the count itself moves no percentage.
- **`12,168,003,584 B = 12.17 GB / 11.33 GiB`** (`HANDOFF.md:23`) — a hard-blocker statement about the base NCA; the file
  is not in the repo, so it is unverifiable by construction, and no percentage depends on the exact byte count.
- **`3,201 类`** (`HANDOFF.md:19`) — inventory count; nothing downstream consumes it.
- **`58.4%`** — already retired everywhere it mattered; gate 9 (`check.mjs:109-111`) exists precisely because it was
  hand-copied, and it now reads the number back from the script.

## Difficulties

- **No shell in this subagent.** `xd://bash` / `xd://run` → "No such tool"; only `mcp__mhgu_re_*` is mounted.
  Consequences: the gate suite the ticket asked to run first (`node tools/audit/check.mjs`) could not be run at all, and
  no percentage here is a script re-run. Everything is SQL, file line totals, source reading, or arithmetic. Suspected
  cause: this agent was dispatched with the four-tool reading profile while the ticket's Method assumes a shell-bearing
  reviewer.
- **The doc sweep was targeted, not exhaustive.** With `grep` unable to count and 200+ manifest docs, I swept the values
  named in the ticket plus the three highest-risk families (coverage headline/partition, save-side structural formula,
  data-side foreign-key gate), and followed every hit into its generator. A percentage that appears once in a doc outside
  those families and never in a headline was not audited.
- **`grep` cannot count.** It caps at 200 matches per file and prints no total ("More than 200 matches; grep keeps the
  first 200"), so a subset such as "A rows in a 13,577-row table" would need ~70 paged calls. All row-count verification
  therefore used whole-file line totals or SQL, and grep only as a presence/absence test.
- **`read` gives a total line count only on the forward selector.** `path:1-1` prints `Showing lines 1-4 of N`;
  `path:-3` prints no numbers. Above ~5 MB the tool stops before EOF ("5.2MB total; not scanned to EOF"), which is why
  `function-labels.tsv` could not be counted.
- **Artifacts were being regenerated while reading.** `coverage-report.tsv` had mtime "just now" at first listing and
  `LINK-METER-CHAIN.md` appeared in this directory mid-review; a sibling (`LinkSaveSide` → `LINK-SAVE-SIDE.md`) covered
  the save side, so contradiction 3 is reported only for the gate blind spot. Values here are pinned to this session.
- **`PRAGMA` statements are not executable through the reader; `pragma_*` tables are.** The foreign-key count had to be
  written as `SELECT … FROM pragma_foreign_key_check`, which worked and returned 2,621.
