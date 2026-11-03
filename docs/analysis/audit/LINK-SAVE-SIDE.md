# LINK-SAVE-SIDE — save-layout linkage review (constants, percentages, aliases)

Scope: `docs/save-layout/coverage-map.md`, `docs/save-layout/CURRENT-RULING.md`,
`docs/save-layout/pouch-verified.md`, `docs/save-layout/member4-semantics.md`,
`docs/save-layout/contradictory-bits-verdict.md`, `docs/PROGRESS.md` §A.

Tooling note: this session exposes read/grep/glob/write only — no shell/run device, so the
`node` recomputation prescribed by the method could not be executed. Every number below is an
exact recomputation from the hex/decimal literals printed in the documents (hex→decimal shown).
Byte-level evidence was obtainable for `.hnt` files only (they are bare hunter blocks, so the
name sits at +0x00 and the text renderer shows it), not at absolute offsets inside `system`.
Nothing below repeats another document's conclusion as evidence; each verdict names the
artifact (offsets, byte counts, or hex arithmetic) that decides it.

## CONFIRMED

### Duplicated constants that agree (value per file, recomputed, verdict)

| constant | statements | recomputation | verdict |
|---|---|---|---|
| 1,177,760 B hunter block | coverage-map.md:7, :33, :210; PROGRESS.md:9 | `0x11F8A0` = 1,048,576 + 129,184 = **1,177,760** | agree |
| 226,754 B member layer | coverage-map.md:8, :200; PROGRESS.md:14, :43 | 227,386 − `0x278`(632) = **226,754** | agree |
| 227,386 as *end offset* | coverage-map.md:200 ("终点偏移 `0x3783A` = 227,386"); PROGRESS.md:23 | `0x3783A` = **227,386** | agree as offset (misused: C1, C2) |
| 950,374 B tail | coverage-map.md:9, :210; PROGRESS.md:15 | 1,177,760 − 227,386 = **950,374**; /1024 = 928.1 → "928KB" ✓; /1,177,760 = 80.69 % → "81 %" ✓ | agree |
| 224,643 B field-addressable | coverage-map.md:8; PROGRESS.md:14, :24 | 9,543 + 76 + 12,955 + 115,072 + 86,997 = **224,643** | agree |
| 2,111 B unattributed gap | coverage-map.md:8; PROGRESS.md:24 | 226,754 − 224,643 = **2,111** | agree |
| 78 % member field level | coverage-map.md:8; PROGRESS.md:14, :24 | used as factor 0.78; no independent denominator exists (UNVERIFIED) | agree as factor |
| 175,222 B | coverage-map.md:11, :49, :55; PROGRESS.md:24 | 224,643 × 0.78 = **175,221.54 → 175,222** | agree |
| 14.9 % whole-block field | coverage-map.md:11; PROGRESS.md:24 | 175,222 / 1,177,760 = **0.148774** | agree |
| 87.84 % / "≈88 %" structural | coverage-map.md:10 ("≈ 88 %"); PROGRESS.md:23, :72 ("87.8 %", formula 87.84 %) | (226,754 + 950,374×0.85)/1,177,760 = 1,034,571.9/1,177,760 = **0.87842** | agree; "88" is this rounded |
| 12,955 B member#4 | coverage-map.md:25, :200, :267; CURRENT-RULING.md:63; member4-semantics.md:15, :216; PROGRESS.md:46 | `0x5EA6`(24,230) − `0x2C0B`(11,275) = **12,955**; `0x329B` = 12,955 | agree in all six |
| 12,951 B "static sites" | coverage-map.md:25, :267 | 12,955 − 4 (nested read) = **12,951**; 12,951 − 11,591 = **1,360** = 20×20×2 (rows 66/67 at 21 reads) + 14×20×2 (rows 68/69 at 15 reads) | agree, and reconciles with member4-semantics.md:216 "static size sum 11,591" — different quantities |
| 9,543 B member[0] prefix | coverage-map.md:21, :33; PROGRESS.md:24 | 10,174 − 632 + 1 = **9,543** | agree |
| 76 B pouch | coverage-map.md:22, :152; pouch-verified.md:3-4 | 32 × 19 bit = 608 bit = **76 B**; span 10,175..10,250 = 76; `0x280A`−`0x27BF` = 75 → 76 inclusive | agree (but see C17) |
| 35,131 B member[7] | coverage-map.md:184; PROGRESS.md:24 | 5+20+27,216+7,776+114 = **35,131**; 84×324 = 27,216; 24×324 = 7,776 | agree |
| 115,072 B "装备箱" | PROGRESS.md:24, :25 | member[3] span `0x62EE`(25,326) → `0x2246E`(140,398) = **115,072** = 72,000 (2000×36) + 36,000 (1000×36) + 5,440 (40×136) + 1,632 (24×68) | agree, and pins the cat-box end at `0x208CE` (C4) |
| 86,997 B | PROGRESS.md:24, :25 | residual: 226,754 − 2,111 − 9,543 − 76 − 12,955 − 115,072 = **86,997** | value agrees, meaning wrong (C3) |
| 632 B header | PROGRESS.md:13 (`0x0000..0x0277`); coverage-map.md:8 (`0x278` start) | `0x277`+1 = `0x278` = **632** | agree |
| kill/capture/volume starts | coverage-map.md:42-44, :80-82, :245, :268; CURRENT-RULING.md:82-83; member4-semantics.md:18-19 | 24,230 = `0x5EA6`; 24,504 = `0x5FB8`; 24,778 = `0x60CA`; 25,326 = `0x62EE` | agree to the byte (the member4-semantics rows use half-open ends `0x5FB8`/`0x60CA`, same bytes) |
| 274 B / 137×u16 arrays | coverage-map.md:42-44, :80-82; CURRENT-RULING.md:82-83 | 137×2 = **274**; `0x5FB7`−`0x5EA6`+1 = 274; 274+274+548 = **1,096** = `0x62EE`−`0x5EA6` | agree, byte-closed |
| member[14] 6,248 B | coverage-map.md:205, :366 | 30 + 68 + 13×470 + 40 = **6,248**; `0x34E10`−`0x335A8` = 6,248 | agree; "stride 564" is the in-object stride, the 94 B holes are load-time derived, so 13×470 is correct |
| member[17] 10,371 B | coverage-map.md:208, :369 | `0x3783A`−`0x34FB7` = **10,371**; 24+48+1+99×104+2 = 10,371 (closes only if "位2" = 2 bits in 1 byte) | agree |
| 239,842 B = 67.3 % tail diff | coverage-map.md:279; PROGRESS.md:18 | 1,177,760 − `0xC8800`(821,248) = **356,512**; 239,842/356,512 = **0.67266** | agree with each other (pairing: C11) |
| 227,386+296,902+653,472 | coverage-map.md:377 | sum = **1,177,760** exactly; 227,386+296,902 = 524,288 = `0x80000` | windows tile the block; label problem: C2 |
| .hnt ↔ system equality rates | PROGRESS.md:79 (86.76 / 14.64~18.01; 99.31 / 100.00); coverage-map.md:379-381 | identical figures in both files, row by row | agree |
| 501 impossible bits | CURRENT-RULING.md:14, :38, :45; contradictory-bits-verdict.md:5, :26 | 122 + 379 = **501** | agree |
| 122 = 103+3+16 | contradictory-bits-verdict.md:9-12; CURRENT-RULING.md:14 | Permit 103 (★1-3 9×3 + ★5 2 + ★6-10 5×5 + ★11-16 7+8+9+6+8+11 = 27+2+25+49) + Arena 3 + G★14 16 = **122**; slot1 379 = 189+184+3+3 | agree |
| 318/68,155 = 0.47 % | coverage-map.md:383 | 318/68,155 = **0.004666** | agree |
| vol_only totals | coverage-map.md:262-263 | clean: 20+22 = 33+9 = **42**; dirty: 59+15 = 73+1 = **74** | totals invariant across the two alignments — the table is internally consistent (but PROGRESS:46 reports a different value, C18) |

### Alias mapping (arbiter for every 猎人A / 猎人B sentence)

- Textual mapping, identical in the two documents that give offsets: **猎人A = Sakiko = clean
  slot1 @ `0x2AC560`** (coverage-map.md:279, pouch-verified.md:6), **猎人B = Lay1nn = v6-ready
  slot0 @ `0x18CC9C`** (same two lines). Every other in-scope alias sentence is compatible:
  coverage-map.md:103 (clean 猎人A), :214 (`clean 猎人A(slot1 @0x2AC560)`), :262-263 (clean 猎人A
  / dirty 猎人B), :379-381 (per-`.hnt` equality rows); CURRENT-RULING.md:70 (猎人B vs 猎人A),
  :82-84 (clean 猎人A / dirty 档); contradictory-bits-verdict.md:5, :26 ("dirty 档 slot0" = B).
  No document in scope swaps A and B, and none attaches a `.hnt`-to-`.hnt` comparison to them.
- **Byte check (this session, first bytes of the bare `.hnt` blocks):**
  `save-snapshots/20261022-clean-reference/hunterA_HR5_V7.hnt` renders as `Sakiko…` and
  `save-snapshots/20261022-v6-ready/hunterB_HR198.hnt` as `Lay1nn…`; the alias-named duplicates
  agree (`…/Lay1nn_HR198.hnt` also renders `Lay1nn…`). So A↔Sakiko and B↔Lay1nn are literal file
  contents, not only labels.
- Slot-order support: `0x2AC560` = 2,803,040 and `0x18CC9C` = 1,622,172; difference =
  **1,180,868** = 1,177,760 + 3,108 (one block + the 36 B slot header + 3 B), i.e. slot1 really
  is the later slot and A sits on it as stated. `docs/analysis/audit/MECHANICS-FINDINGS.md:461-464`
  independently records the same two bases derivable as `[0x34+4i]+0x24` and that the documents'
  `猎人A`/`猎人B` are the snapshots' `Sakiko`/`Lay1nn`.

## CONTRADICTION

**C1 — 87.9 % is the forbidden 632 B double count; the documents say 87.8 % / ≈88 %.**
- `docs/analysis/audit/REST.tsv:8` (= `ROUND1-ALL.tsv:187`): "struct-coverage-88pct ‖
  docs/PROGRESS.md ‖ OK ‖ node: (227386+950374\*0.85)/1177760 = 0.8790 ‖ Arithmetic reproduced".
- Its own arithmetic is right — (227,386 + 807,817.9)/1,177,760 = 1,035,203.9/1,177,760 =
  **0.878959** — but it uses `0x3783A` = 227,386 as the member-layer **length**, exactly what
  PROGRESS.md:23 forbids ("~~227,386~~ 是 `0x3783A` 偏移量不是长度，多算的 632B 头"). The 0.0006
  gap between 87.84 % and 87.90 % is the 632 B.
- The same ledger already caught this error elsewhere: `REST.tsv:17` records
  `social-checksum.md` "227,386 B（0x278..0x3783A）→ 226,754 B (=0x3783A−0x278)" with the note
  "与 PROGRESS 同一 off-by-632". So `REST.tsv:8` and `REST.tsv:17` contradict each other.
- Arbiter: the offsets. `0x3783A` − `0x278` = 226,754 → **87.84 %** (coverage-map.md:10,
  PROGRESS.md:23, :72). `87.9` is a stale recomputation of a retired formula.

**C2 — coverage-map.md:377 labels 227,386 as a "成员区" length while PROGRESS.md:23 says it must not be.**
- coverage-map.md:377: "| 对比 | 成员区 **227,386B** 窗口 | 尾中 296,902B | 尾远 653,472B |".
- PROGRESS.md:23: "~~227,386~~ 是 `0x3783A` 偏移量不是长度".
- The three windows tile 1,177,760 exactly, so the measurement is sound; but the first window
  starts at char_off 0 and therefore contains the 632 B header. Calling it "成员区 …B"
  reproduces the confusion C1 exposes. Suggested label: "char_off 0..0x3783A 窗口".

**C3 — PROGRESS.md:25's decomposition of 224,643 does not sum and mis-assigns the residual.**
- PROGRESS.md:24: `9,543+76+12,955+115,072+86,997 = 224,643B` — correct.
- PROGRESS.md:25 decomposes it as "member#4 12,955 + 道具箱 9,543 + 口袋 76 + 装备箱 115,072 +
  猫 35,131 + 怪物三阵列 822 + 632B 头部分" = **174,231 B**, 50,412 B short. It also asks
  86,997 to be "猫 35,131 + 三阵列 822 + 632 头" = 36,585, which is not 86,997.
- 86,997 is a **residual** (226,754 − 2,111 − the four named blocks), and the 632 B head lies
  *outside* the member layer (`0x0000..0x0277`, PROGRESS.md:13), so it cannot be a component of a
  member-layer denominator. Arbiter: the subtraction plus the layer boundaries at
  PROGRESS.md:13-15.

**C4 — Cat equipment box ends at 0x208AD (35,967 B) in coverage-map, but 1000×36 = 36,000 B forces 0x208CE.**
- coverage-map.md:118: "`0x17C2E..0x208AD` ‖ 35967 ‖ member[3] 猫装备箱 1000×36B";
  coverage-map.md:119 then posits "`0x208AD..0x208CE` ‖ 33 ‖ gap".
- `0x17C2E` = 97,326; +36,000 = 133,326 = `0x208CE`, exactly where the next row starts
  (coverage-map.md:120, set-name block). The 33 B "gap" is an artifact; there is no gap.
- Corroboration inside the repo: coverage-map.md:126 calls the pair "108KB" (`0x62EE..0x208AD` =
  107,967 B, 33 B short), and PROGRESS.md:24's 115,072 B only closes as 72,000 + **36,000** +
  5,440 + 1,632. Arbiter: 1000×36 and 115,072.

**C5 — 角色头 is 40 B ending at 0x27 in coverage-map but 48 B (`0x0..0x2F`) in CURRENT-RULING, and 40 B cannot hold its own field list.**
- coverage-map.md:19: "`0x0..0x27` ‖ 40B ‖ 角色头：名(0x00)/playtime(0x20)/gold(0x24)/HR(0x28)/gender(0x2A)";
  coverage-map.md:109 repeats "`0x0..0x28` ‖ 40".
- CURRENT-RULING.md:58: "角色头（char_off `0x0..0x2F`）… gold u32、`0x28` HR u8、`0x2A` gender u8".
- A 40 B window ending at 0x27 cannot contain HR@0x28 or gender@0x2A; the field list needs at
  least 0x2B → 44 B. Arbiter: the field addresses (gold 4 B at 0x24 ends 0x27; HR 0x28; gender
  0x2A). CURRENT-RULING's 48 B is the only self-consistent window; coverage-map.md:109's
  `0x0..0x28` is also an inclusive/exclusive off-by-one (41 B).

**C6 — "成员#1-3 at 0x28" contradicts the 632 B header and the member-layer start at 0x278.**
- coverage-map.md:20: "`0x28..0x280A` ‖ ~10KB ‖ **成员#1-3 + 口袋区前段（未切分）**";
  coverage-map.md:61 repeats it ("成员#1-3（`0x28..0x280A` 前段）"); :24 continues from 10263.
- The same file puts the member layer at `0x278` (:8), calls `0x28..0x278` unknown header (:110),
  puts member[0] at `0x278` (:111) and member[2]'s 1024 B outer header at `0x280B..0x2C0A`
  (:221). So the row starts 592 B too early and stops one byte before member[2] begins — it
  cannot contain members #1-3.
- Arbiter: PROGRESS.md:13-14 (header `0x0000..0x0277`, member layer `0x0278..0x3783A`).

**C7 — the 165 KB ledger does not equal the bytes of the three ranges it names.**
- coverage-map.md:11 and :126: "28.6 + 108 + 28.4 KB ≈ 165KB / 1,177,760B ≈ 14 %".
- Recomputed from the ranges printed in the same sentence: `0x0..0x59AC` = **22,956 B**
  (22.4 KiB, not 28.6 KB); `0x62EE..0x208AD` = **107,967 B** (= 108,000 only at `0x208CE`, C4);
  `0x2C6B4..0x335A8` = **28,404 B**. Sum = **159,327 B = 13.5 %** (159,360 with C4 fixed).
- 28.6+108+28.4 = 165.0 is internally consistent but describes no range in the file; the
  decisive term is `0x59AC` = 22,956, which no rounding turns into 28.6 KB.

**C8 — "其后 ~755KB 是成员外数据" contradicts 950,374 B (928 KB).**
- coverage-map.md:123 and :173: "`0x335A8..0x11F8A0` ‖ 967,416 ‖ … member[14..17] 合计仅 ~17KB …
  其后 ~755KB 是成员外数据".
- member[14..17] = 6,248+160+263+10,371 = **17,042 B** (:205-208), so the remainder is
  967,416 − 17,042 = **950,374 B = 928 KB** — which the same page states at :210. 755 KB matches
  no figure in the file.

**C9 — decimal 821,248 is written as hex 0xC8A00; it is 0xC8800.**
- coverage-map.md:145: "稀疏区（`0xC95A8..0x1175A8` 319KB 含社交区 **821248=`0xC8A00`** 落于此）".
- `0xC8A00` = 786,432 + 35,328 = **821,760**; 821,248 = `0xC8800` (the form used at :33 and :279).
  Two errors: the hex is +512, and 821,248 < `0xC95A8` = 824,744, so the social region is not
  inside `0xC95A8..0x1175A8` either. Arbiter: `0xC8800` = 821,248.

**C10 — the 12 B 龙历院 block contains a field at its own end (10263).**
- coverage-map.md:23: "`10251..10262` ‖ ~12B ‖ 龙历院点数(10251)/镜像金钱(10255)/农场点数(10263)".
- 10251..10262 inclusive is 12 B; three u32 from 10251 occupy 10251/10255/10259 (ending 10262).
  10263 is the *next* row's start (:24). Arbiter: the next row's start — the third field must be
  10259, or the block must be 16 B.

**C11 — "同角色跨档差异 71.97 %" is not reproducible from any documented pair, and its label conflicts with the only measured pair.**
- coverage-map.md:289: "尾部 928KB … 每档整体重写的高波动缓存（**同角色**跨档差异 71.97 %）".
- The only documented cross-snapshot comparison is 猎人A (clean slot1) vs 猎人B (v6-ready slot0)
  = **67.3 %** over `0xC8800..0x11F8A0` (:279) — different characters. The same line's same-slot
  rates are 74.6 % / 62.4 % / 0.0 %, none of which is 71.97 %.
- No range, pair or script is given, so 71.97 % is neither 67.3 % (356,512 B) nor a same-slot
  figure. If it was computed on A-vs-B the label "同角色" is false. Arbiter:
  239,842/356,512 = 67.27 % is the only value the artifacts support.

**C12 — the same-slot numbers (74.6 / 62.4 / 0.0 %) carry no range, and 62.4 % conflicts with the only ranged same-slot measurement (0.47 % equality, :383).**
- coverage-map.md:279: "同槽位 slot1↔slot1 是 74.6 %、slot0↔slot0 是 62.4 %、slot2↔slot2 是 0.0 %".
- coverage-map.md:383: "尾段 `clean slot0 vs dirty slot0`（同名 猎人B）逐字节 both_eq =
  **318 / 68,155 = 0.47 %**" — the same object pair, 99.53 % different over 68,155 B.
- Both can only hold for different windows, but neither line states its window, so a reader
  cannot tell which is "the" same-slot rate; the 0.0 % for slot2 cannot even be distinguished
  from "both slots are identical empty blocks" without bytes. Arbiter: none of the three is
  reproducible; 0.47 % is the only one with a denominator.

**C13 — the member[4..12] gap is 41,542 B, not 42,566 B.**
- coverage-map.md:173: "member[3] 装备箱尾 `0x2246E` → member[13] `0x2C6B4` 间隙 **42,566B** ≈
  member[4..12] 合计 41,551B + ~1KB 位流/tmp 未读项".
- `0x2C6B4` − `0x2246E` = 181,940 − 140,398 = **41,542** B; the same page's authoritative note
  (:194-196) gives member[4..11] = 41,526 B + member[12] = 16 B = **41,542**.
- 42,566 = 41,542 + 1,024 — the member[2] 1024 B header added twice. With the correct gap, the
  annotation total 41,551 is **9 B larger** than the gap, which is exactly the "+9B 上浮" the
  same note documents — so the conclusion survives, but the printed subtraction and its
  1,015 B slack argument are spurious.

**C14 — the old "成员表 287 B + zero fill 265 B" rows and the volume array 137×4 = 548 B claim the same bytes.**
- coverage-map.md:225: "`0x60C6..0x61E5` ‖ 287 ‖ 成员表（变长，`ldr[r5,#2384]` 指针数组 +
  `[#2388]` count …）"; :226: "`0x61E5..0x62ED` ‖ 265 ‖ 零填充".
- The 137-slot ruling puts the **体型段 `0x60CA..0x62ED` = 548B** (:82), ends it exactly at
  `member[3]`'s start `0x62EE` (:245), and yet still writes "volume+成员表 `0x60CA..`" (:268).
  287+265 = 552 = 548 + the 4 B shift, so the two old rows cover precisely the volume array:
  after 548 B there is zero room before `0x62EE` for a variable-length member table.
- The old row's own evidence points the same way: "u16 值域 92..125，多成对重复
  (96,96/101,101/93,93)" is the signature of `{u16 mini, u16 maxi}` size pairs, not of a table of
  ids. Arbiter: 137×4 = 548 byte-closed at `0x62EE` (:245). The +4 warning at :216 covers
  offsets only; it does not re-assign the row's semantics.

**C15 — 2,300 slots at 19 bit is 5,463 B, not the 5,451 B printed in the front chain.**
- coverage-map.md:151: "道具箱位流（19bit/槽：V6 **2300槽=5451B** / V7 9543B）…".
- 2,300 × 19 = 43,700 bit = 5,462.5 B → **5,463 B**, exactly `0x17CF`−`0x278` = 5,463 (:111).
  5,451 B = 43,608 bit = 2,295.2 slots — a slot count nothing documents.
- The same parenthetical's "V7 9543B" is the whole `632..10174` prefix (:21), not a bitstream:
  at 19 bit the V7 count on :21 (2,992) is 7,106 B. Arbiter: the doc's own encoding and span.

**C16 — "r7=`0x8fc`=2292" is wrong: 0x8FC = 2,300.**
- coverage-map.md:158: "member[0] 2292 vs 2300 槽：r7=`0x8fc`=2292 是循环常数，尾槽走预设段或
  补丁改常数（grep V6 pchtxt `0x8fc` 可定案）".
- `0x8FC` = 2,048 + 252 = **2,300**; 2,292 would be `0x8F4`. The "2292 vs 2300" discrepancy this
  note exists to explain therefore does not exist: the loop constant is the full 2,300, which is
  also what makes the 5,463 B span exact (C15). Arbiter: hex arithmetic.

**C17 — pouch-verified.md's clean decode lists 34 slots for a 32-slot pouch.**
- pouch-verified.md:7 ("clean 32 槽解码"): 18 entries before 空×3 (10,10 … 73,4), then 空×3 (21),
  then 29,1 | 28,2 | 31,3 (24), then 空×10 = **34 entries**.
- The dirty decode on :8 is 24 + 空×8 = **32** exactly. A 34-slot decode needs
  34×19 = 646 bit = **80.75 B**, i.e. 4.75 B past the documented `10175..10250` (76 B) window and
  past `0x280A`, into the 龙历院 block at 10251.
- Arbiter: 32 slots × 19 bit = 76 B (pouch-verified.md:3-4, coverage-map.md:22). Either two
  entries were double-counted or 空×10 should be 空×8.

**C18 — the decisive dirty-save `vol_only` is 0 in PROGRESS.md:46 and 1 in the experiment that decided the ruling.**
- PROGRESS.md:46: "怪物三阵列对齐裁决：kill `24230` / capture `24504` / volume `24778`（dirty 档
  `vol_only=0` 决定性）".
- coverage-map.md:263 (the decision table): "dirty 猎人B ‖ kill&vol=59, vol_only=15 ‖ kill&vol=73,
  **vol_only=1**", and :265 repeats "dirty 档 vol_only 仅 1 条（代码对齐 15 条）"; :262 gives
  clean 22 vs 9.
- The totals are invariant (74 = 59+15 = 73+1; 42 = 20+22 = 33+9), so the table is internally
  consistent and 1 is the value the ruling actually used. Arbiter: coverage-map.md:260-265.
  PROGRESS.md:46 overstates the result as 0 — a cleaner number than the measurement.

## STALE

- coverage-map.md:49 (`~156KB ≈ 13 %`) and :51 (`~~950KB（80%）~~`) are marked superseded in
  place, with the replacements (175,222 B ≈ 14.9 %; 950,374 B cache ~85 % structure) in the same
  block. Handling is correct; keep them struck out.
- coverage-map.md:128 (`~~967KB（82%）~~`) is superseded in place by the C0..C7 split;
  967,416/1,177,760 = 82.1 %, so the retired figure was right when written.
- coverage-map.md:55's "~19 %" is a different quantity (175,222 + ~50 KB interval-level =
  225,222 → 19.12 %) and is correctly labelled; it does not compete with 14.9 %.
- The pre-+4 rows `0x5EA2..0x5FB3` / `0x5FB4..0x60C5` (:223-224) are flagged in place by the
  warning at :216 against the current `0x5EA6`/`0x5FB8`, with `REST-FIXES.tsv:24` cited — but the
  flag covers offsets only, not the row semantics (C14).
- member4-semantics.md:6 ("一律以 `member4-file-layout.txt` … 为唯一权威") is consistent with the
  2026-10-24 regeneration recorded at coverage-map.md:267; no stale copy of the 4 B drift remains
  in the six files (member4-semantics.md:216 already says 12,955).
- coverage-map.md:42's struck-out `24372..24502 / 93大+36小+8保留` and :44's `552B / 25250` are
  retired in place against the 137-slot table; both replacements (274 B ×2, 548 B) are present
  and correct.

## UNVERIFIED

- **Bytes at `0x2AC560` / `0x18CC9C` inside `system`.** The name↔alias half is byte-confirmed
  (the `.hnt` blocks begin `Sakiko` / `Lay1nn`), and the slot index rests on arithmetic
  (`0x2AC560`−`0x18CC9C` = block + 3,108) plus `MECHANICS-FINDINGS.md:461-464`
  (`[0x34+4i]+0x24`). No tool in this session can read `system` at an absolute offset.
- **239,842 / 67.3 %, 74.6 %, 62.4 %, 0.0 %.** Only 239,842/356,512 = 67.27 % is recomputable
  from documented quantities; the three same-slot percentages have no stated denominator and no
  stored byte counts (C12).
- **71.97 %** — no pair, no range, no script (C11).
- **"78 %" of 224,643.** No independent denominator exists anywhere in the six files; every
  citation traces back to PROGRESS.md:24, so the figure is self-referential. 78 % is the
  multiplier that makes 175,222 and 14.9 % true; I can confirm the multiplication, not the 78 %.
- **"115,072 B = 装备箱".** The span (`0x62EE..0x2246E`) and its four-part decomposition are
  confirmed, but only 72,000 B is the equipment box; 36,000 B is the cat box, 5,440 B set names,
  1,632 B set items. PROGRESS.md:24-25 labels the whole 115,072 B "装备箱", overstating what is
  field-annotated.
- **0.0 % slot2↔slot2** cannot be distinguished from "both blocks are identical empty blocks"
  without bytes (C12).
- **The 137-slot small-monster claim** (`kill[135]=247`, `kill[136]=117`, CURRENT-RULING.md:83)
  is a byte measurement I could not reproduce; it is consistent with the game rule (small
  monsters cannot be captured) that the same section uses, so nothing contradicts it.

## Difficulties

- No shell/run device (tools: read, grep, glob, write), while the method prescribes `node` for
  the arithmetic and for the snapshot byte reads. Cost: all arithmetic done by hand (exact for
  the integer/hex sums and the four percentage formulas quoted above), and byte reads were
  limited to what the text renderer exposes at the start of `.hnt` files.
- `grep` over several file paths requires each entry to be workspace-relative or absolute; a
  `;`-list of `docs/...` paths fails with "Path not found" (two wasted calls). Absolute paths
  work.
- `grep` caps at 20 matches per file in multi-file mode, silently truncating coverage-map hits;
  per-file scans were needed (three extra calls). Suspected cause: per-file match limit in the
  multi-path mode.
- `read` on a binary returns a lossy text rendering (`Sakiko\ufffd:Q\ufffd\ufffd\ufffd…`): enough
  to read the ASCII name, but it gives neither byte offsets nor hex, so no offset inside `system`
  could be probed.
- The brief says "four .hnt files exist; two duplicate the other two". On disk each snapshot
  directory holds four `.hnt` files — two per character, one named by the alias (`hunterA_*`,
  `hunterB_*`) and one by the in-file name (`Sakiko_*`, `Lay1nn_*`) — so the 4-file statement is
  true per directory, not across both. I verified only that their first bytes agree (name at
  +0x00), not that the files are byte-identical.
- Two dead ends were cheap but worth recording: (a) `grep` cannot locate a byte offset in a
  binary (no match offsets exposed), so the `system`-slot half of the alias check had to rely on
  arithmetic; (b) the first `grep` batch against a relative `;`-list returned "Path not found"
  without naming which selector failed, which cost one diagnostic round.
