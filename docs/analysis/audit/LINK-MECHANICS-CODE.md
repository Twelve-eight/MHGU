# Mechanics docs vs code-side artifacts — linkage audit

Scope: `docs/mechanics/monster-code-map.md` (117 lines), `monster-state-machine.md` (1149),
`monster-classes.md` (282), `monster-ai-params.md` (529).

Artifacts used: `docs/data/member-offsets.tsv`, `docs/data/class-inventory.tsv`,
`docs/analysis/code/inventory/function-labels.tsv`, `docs/data/functions-retile.csv.gz`,
`main.140.flat.bin` (flat = vaddr + 0x100), `tools/mhgu/arm32.mjs` (`disasm(vaddr, n)` returns a string;
`rd32(vaddr)`, `functionStarts()`, `findRefsTo()`).

Gate first, as required:

```
$ node tools/audit/check.mjs
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS published project calibre matches canonical-metric.mjs (58.0%) at 7 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
ALL PASS   (2.34 s)
```

Method note: "retile" below means `functions-retile.csv.gz` (52,692 functions, start/end columns only,
split with `line.split(',').slice(0,2)` so the quoted `strings` column cannot confuse the parse).

---

## CONFIRMED — claim, where stated, command, output

| # | claim | file:line | check run | output | verdict |
|---|---|---|---|---|---|
| 1 | pcrel string idiom: `0x48c60 add r1,pc,r0`, r0 from `[0x48cc4]=0x1509a56` → `0x15526BE` = `cEmSizeCalcTblElement`; bias = target−(site+8) | monster-code-map.md:16 | `disasm(0x48c40,9)`; `rd32(0x48cc4)`; `strAt(0x15526be)` | `0x48c5c ldr r0,[pc,#96] ; [0x48cc4]=0x1509a56`; `0x48c60 add r1,pc,r0`; 0x48c60+8+0x1509a56 = 0x15526be; bytes there = `cEmSizeCalcTblElement` | CONFIRMED, exact |
| 2 | cName hash = crc32 (poly 0xEDB88320, init 0xFFFFFFFF, no final xor); `.data 0x160fdd4=0x5adc692c`, `0x160fddc=0x1800eb37` | monster-code-map.md:18-19 | crc32raw() over the two names; `rd32` at both vaddrs | `crc32raw("rEmSizeCalcTblElement")=0x5adc692c` = word at 0x160fdd4; `crc32raw("rEmSizeYureTbl")=0x1800eb37` = word at 0x160fddc; each hash occurs exactly once in the image | CONFIRMED |
| 3 | action/state field `u8[this+0x73E0]`, signature `movw r0,#0x73e0; ldrb; cmp; lsl#2; add r1,pc,#4; ldr; add pc,r0,r1` | monster-code-map.md:26,29 | `disasm(0xd227d0,10)` | `movw r0,#0x73e0` / `ldrb r0,[r4,r0]` / `cmp r0,#17` / `mov r0,r0,lsl #2` / `add r1,pc,#4` / `ldr r0,[r0,r1]` / `add pc,r0,r1`; table base 0xd227f8; entry[0]=0x48 → 0xd22840 | CONFIRMED (mechanism); "every dispatcher is cmp #17" is false, see C2 |
| 4 | state→handler = table[state] + table base, base = (add site)+8+4 | monster-code-map.md:29, state-machine.md:3 | recomputed all 51 sections in the doc from the binary (base from the first `add rN,pc,#imm` after the movw site, handler = base + word[base+4*state]) | 882 handler cells, **0 arithmetic mismatches** | CONFIRMED |
| 5 | naming follows one tail call: state 0 of 0xd227d8 = `em003_00FwMove` | monster-code-map.md:30; state-machine.md (0xd227d8 section) | handler 0xd22840 = `mov r0,r4; pop; b 0xd137c0`; string scan of 0xd137c0..0xd13a88 | 0xd137c0 references `em003_00FwMove` | CONFIRMED |
| 6 | 110 members / 27 classes; offset and type are code immediates | monster-code-map.md:58; monster-classes.md:8-37 | row-by-row diff of the 110 markdown rows against member-offsets.tsv keyed by `site` | 110/110 rows identical in offset, type, name and site; 27 group headers, every header count equals its row count | CONFIRMED for the member data |
| 7 | schema registrars `0x48C30`(cEmSizeCalcTblElement) / `0x4A6D4`(cEnemyDebugSetData) / `0x36091C`(cEmSetList) | monster-code-map.md:57 | `disasm` each; string-ref scan of the whole function | each function references `<class>` **and** `<class>XML`; size immediates `mov r3,#32` / `#12` / `#60`; class-inventory sizes are 32 / 12 / 60 | CONFIRMED |
| 8 | class container `0x15004C`: `mov r1,#360; bl 0x7AA154` (360 slots), inserts cSetEmMain/cEmSetList/cEmSizeCalcTblElement/cEmDouMouKa_Parts* | monster-code-map.md:56 | `disasm(0x15004c,10)`; string-ref scan 0x15004c..0x151ccc | `0x150058 mov r1,#360`, `0x150060 bl 0x7aa154`; function references `cSetEmMain`, `cEmSetList`, `cEmSizeCalcTblElement`, `cEmDouMouKa_PartsChangeData`, `cEmDouMouKa_PartsAuraData`, `cEmDouMouKa_ModifyData`, `cEmDouMouKaData` | CONFIRMED |
| 9 | monster main table 166 × u16 @ 0x162BF0C | monster-code-map.md:66 | `rd16` 166 entries + the next one | first 12: 1, 0x101, 0x201, 0x401, 2, 0x102, 0x202, 0x402, 3, 0x103, 4, 0x104; 166 distinct; entry #167 = 0 | CONFIRMED |
| 10 | 93 exact emids tracked, 73 not | monster-code-map.md:67 | membership of the 166 ids in the 137-entry slot table | 93 present, 73 absent | CONFIRMED exactly |
| 11 | 137 × `{u32 EmId, u32 slot}` @ 0x1597EA4 | monster-code-map.md:68 | `rd32` 137 pairs | 137 distinct EmIds, slots 0..136, `slot == index` for all 137; pair #138 = (0x77c9, 30666) garbage → table ends at 137 | CONFIRMED |
| 12 | 137 `const char*` @ 0x1732050 → `roEm###.cro`/`roEms###.cro` | monster-code-map.md:71 | resolved 137 pointers | 137/137 non-null, first `roEm001.cro`, last `roEms022.cro`, 87 distinct names, 0 pointers past #137 | CONFIRMED for contents |
| 13 | `0x50B64` linear search of 137 entries | monster-code-map.md:70 | `disasm(0x50b64,20)` | `add r1,r1,#2`, `ldr r3,[lr,r1,lsl #3]`, `cmp r3,#137` at 0x50b94, returns −1 path at 0x50bc8 | CONFIRMED |
| 14 | `.data 0x160FDD0` manifest records of 8 B hold the two class-name hashes, one entry each | monster-code-map.md:78 | `rd32` at 0x160fdc0..0x160fdf8 | {0x681b7312,0x5adc692c} at 0x160fdd0, {0x081b9089,0x1800eb37} at 0x160fdd8; each hash occurs once in the image | CONFIRMED (record field order still unproven, see U7) |
| 15 | `0x2484C0` = 114-entry predicate table | monster-code-map.md:97 | `disasm(0x2484c0,10)` | `cmp r1,#113` (0x2484d4) + `add r2,pc,#8` inline table → 114 entries | CONFIRMED |
| 16 | L2 variant tables N=34/42/47/37/37/50 | monster-code-map.md:50 | `disasm` each of the six addresses | cmp immediates 34 (0xcf1898), 42 (0xd14238), 47 (0xd28594), 37 (0xd36310), 37 (0xd4b040), 50 (0xd37044) — all read `movw #0x73e1` first | CONFIRMED |
| 17 | class-inventory aggregates: 3201 classes, c* 1116/446,012 B, u* 928/8,181,876, r* 413/1,129,584, s* 199/13,862,748, Mt* 73/30,080, other 472/175,220 | monster-code-map.md:100-110 | aggregated class-inventory.tsv | 3201 rows; every count and byte sum matches exactly; total 23,825,520 B | CONFIRMED |
| 18 | sEquipBox = 0x3FBF4 = 261,108 B | monster-code-map.md:113 | class-inventory row | `s* sEquipBox 261108 (0x3fbf4)` | CONFIRMED |
| 19 | every `mParam.*` / action / net / unit vaddr in ai-params is the string it names | monster-ai-params.md §0–§4 | parsed all 435 `| \`0x..\` | \`name\` |` rows and compared with the bytes at that vaddr | **0 mismatches** (each row: string at vaddr == claimed name) | CONFIRMED |
| 20 | ai-params counts: §1 "131 条", §2 44 rows, §4 "225 条", §0 12 symbols | monster-ai-params.md:24,200,286,7 | counted rows / unique names+addresses | §1 134 rows / **131 unique names and 131 unique vaddrs** (3 fields cross-listed in two groups); §2 44; §3 32; §4 225; §0 12 | CONFIRMED (see C12 for the 3 mParam strings the table omits) |
| 21 | base romfs NCA 12,168,003,584 B, XCI secure `0x182bbe00..0x2ed70be00`, evidence `.tmp/mhgu/xci-info.txt:50` | monster-code-map.md:85-90 | read that line; 0x2ed70be00−0x182bbe00 | line 50: `secure:/98abd400588fccb68509fed7e55e4a47.nca 0000182bbe00-0002ed70be00`; difference = 12,168,003,584 | CONFIRMED exactly |
| 22 | state handlers reference their action names: 0xD216A4 Angry_Start, 0xEC5440 cool_Loop+maguma_*, 0x106873C angry_Loop+normal_Change, 0x6BA8C emXXXFwMove@0x15533CF | monster-code-map.md:43-47 | string-ref scan of each function body (ldr/add-pc resolver) | 0xd216a4 first hit `Angry_Start` (then Angry_End, Taiden_*); 0xec5440 `cool_Loop`, `maguma_Loop/_End/_Change`; 0x106873c `angry_Loop`, `normal_Change`; 0x6ba8c `emXXXFwMove` via 0x15533cf | CONFIRMED (0xED0774 excepted, C9) |
| 24 | `cEmSizeCalcTblElement` = mMonsterIndex…mQuestSizeMax at +4,+8,+0xC,+0x10,+0x14,+0x18,+0x1C (type 6/12); `cEmSizeYureTblElement` = mScaleRate/mProbability | monster-code-map.md:76-77 | member-offsets.tsv fn 0x486c8 / 0x48dc8; `disasm(0x48720,3)` | 0x486c8 rows are exactly +0x4(6), +0x8(12), +0xc(12), +0x10(12), +0x14(12), +0x18(12), +0x1c(12); 0x48dc8 rows +0x4(12) mScaleRate, +0x8(6) mProbability; 0x48720 = `add r1,r10,#4` after `mov r1,#6` | CONFIRMED |

---

## CONTRADICTION — same fact stated differently

**C1 — dispatcher count and named-state ratio (code-map vs its own cited artifact)**
- Stated: "**已解决**（53 个派发器全解）" (monster-code-map.md:29) and "41/53 派发器至少 1 个状态有名字" (:30).
- Artifact: monster-state-machine.md contains **51** `## 派发器` sections, of which **26** have ≥1 named state
  (`grep -c '^## 派发器'` = 51; awk over `有名字 k/n` = 26 with k>0).
- 53 is only reachable by deleting the `N<=64` filter in `tools/mhgu/state-motion3.mjs:26`: with the filter
  the shipped tool yields 51 sections; without it, 53 dispatchers appear, and the 2 extra are
  `0x5c2cc` (N=225) and `0x1081408` (N=100). Both are absent from the checked-in doc.
- Artifact supports: 51 dispatchers, 26 named. The "53/41" pair describes neither the shipped generator
  nor the shipped output.

**C2 — "每个派发器都是 … cmp r0,#17" and "18 态派发器 89 个"**
- Stated: monster-code-map.md:26 ("每个派发器都是 `…; cmp r0,#17`"), :31 ("18 态派发器 89 个（`cmp #17` 普查：7 态 247 个、17 态 89 个、10 态 71 个…）").
- Recomputed from the binary (0x73e0 dispatcher rule, 53 sites): compare immediates
  `{17:41, 7:3, 12:2, 10:1, 11:1, 16:1, 26:1, 34:1, 100:1, 225:1}` → 12 of 53 dispatchers do **not** use `cmp #17`
  (e.g. `0x81ca4` `cmp r0,#10`, `0xd3137c` `cmp r0,#7`).
- The 247/89/71 numbers are real but they are a **site histogram**: for each of the 638 `movw #0x73e0` sites,
  take the first `cmp rX,#imm` after the `ldrb`, decode the rotated immediate. I reproduce
  `{7:246, 17:89, 10:71, 11:49, 1:33, 14:21, 13:19, 3:18, 16:13, 0:12, 2:9, 6:9}` — i.e. 247/89/71 are counts of
  *reads of the field that compare against N*, not counts of dispatchers with N+1 states. The number of
  dispatchers with an 18-entry table is 41 (not 89); 89 is exactly the number of functions containing the
  `movw #0x73e0; ldrb; cmp #17` idiom (89 sites in 89 distinct retile functions).
- Artifact supports: 41 eighteen-entry dispatchers; the histogram is a reader-site histogram.

**C3 — "动作派发器 149 个" and "58 张方法表"**
- Stated: monster-code-map.md:28 (149, "case 数 4..45"), :32 (58 pointer tables).
- Recomputed: the stated signature (`ldr r0,[r0,r1]; add pc,r0,r1`) occurs 3,244 times in 2,419 functions (push heuristic) / 2,420 (retile);
  the full 4-instruction dispatch occurs 2,218 times in 1,782 functions; the 0x73e0 dispatcher rule gives
  **53** dispatchers in **53** unique tables. No filter yields 149 or 58 (case counts are 7..225, not 4..45).
- Artifact supports: 53/53.

**C4 — method-table cluster: "派发器在 +4"**
- Stated: monster-code-map.md:33 ("`0x179CBB4 / 0x17B46DC / 0x17C6FE0 …`（固定 8 槽布局，派发器在 +4）").
- Binary words at 0x179cbb4: `[0]=0xd227d0` (the dispatcher function), `[1]=0x6bf18` (shared stub),
  `[2]=0xd1278c`, `[3]=0x6bf1c` (stub). Same shape at 0x17b46dc (`[0]=0xdc3900`, `[1]=0x6bf18`) and
  0x17c6fe0 (`[0]=0xe81b4c`, `[1]=0x6bf18`).
- `docs/analysis/monsters/mon-ai-entry.md` §2.4 also says "[0] = 派发器所在槽" and lists 0x6bf18/0x6bf1c as
  the shared stubs at +4/+12.
- Artifact supports: dispatcher at **+0**, stub at +4.

**C5 — `0x50B64` call count**
- Stated: "60 处调用" (monster-code-map.md:70).
- Recomputed: 53 `bl 0x50b64` sites + 1 `b` = 54 references (`findRefsTo([0x50b64])` kinds `{bl:53, b:1}`;
  first 0x4a878, matching `docs/analysis/audit/REST-FINDINGS.md:202`).
- Artifact supports: 53 direct calls (54 references).

**C6 — `sMain` size**
- Stated: "`sMain` = `0x38370` = 230,256 B ↔ member[0..17] 文件链 227,386 B（+632B 头/对齐）吻合"
  (monster-code-map.md:114).
- Artifact: class-inventory.tsv row `s* sMain 229952 0xba67b4 0xba6bec` → **229,952 = 0x38240**, not 0x38370/230,256.
- The doc's own arithmetic also fails: 230,256 − 227,386 = **2,870**, not 632.
- Artifact supports: 0x38240 / 229,952 B (sEquipBox in the preceding line is correct, see CONFIRMED 18).

**C7 — per-class member counts**
- Stated: `cEmDouMouKaData`=42, `rEnemyDtBase`=26, `cEmSizeCalcTblElement`=7, `rEnemyResidentDtBase`=6,
  `cEmSizeYureTbl`=2, `cEnemyDebugSetData`=2 (monster-code-map.md:59).
- Recomputed from member-offsets.tsv (the only member artifact):
  - cEmSizeCalcTblElement = 7 rows / 7 names (fn 0x486c8) — **matches**.
  - cEmSizeYureTbl = 2 / 2 (0x48dc8) — **matches**.
  - cEnemyDebugSetData = 2 / 2 (0x4a240 or 0x4a594) — **matches**.
  - cEmDouMouKaData: the runs behind the doc's 0x45118/0x46498/0x479a0 groups hold 45 rows and
    **41 distinct names**; no subset yields 42.
  - rEnemyDtBase: fn 0x54028 holds **22 rows / 22 names**; the class size (208 B) leaves room for 26 but no
    artifact in the repo lists the other 4.
  - rEnemyResidentDtBase: the doc's 0x564bc group holds **9 rows / 7 distinct names** (5 + 1 + 1 + 1 after
    de-duplicating `mPartsVisibleGroupList`), not 6.
- Artifact supports: 7, 2, 2; 41, 22, 7.

**C8 — monster-classes.md "注册函数" labels do not contain the registrations they count**
- Stated: table column "注册函数 | 记录数" plus the method note that the `bl 0x7bb638` member chain lives in
  that function (monster-classes.md:3-8, :38 "## `0x4201c` — 4 个成员" … :277).
- Recomputed: using functions-retile boundaries, **25 of the 27 groups contain zero of their own
  registration sites**. Example: 0x48698 is a 4-byte function (`bx lr`, range 0x48698..0x4869c) whose
  7 members are registered at 0x48720..0x489dc inside **0x486c8**; 0x4201c (0x4201c..0x420dc) contains none
  of its 4 sites (0x4234c..0x42594 are in 0x4210c); 0x6b3fc (0x6b3fc..0x6b410) contains none of its 1 site
  (0x6b870 is in 0x6b81c). Only 0x8af8d0 and 0xba4be4 contain their own sites.
- Same 25 addresses are absent from member-offsets.tsv's `fn` column (only 0x8af8d0 and 0xba4be4 appear).
  `docs/analysis/code/coverage/attr-members.md:135-139` already records this as a member-offsets.tsv defect
  ("25 of the 27 runs have all their sites in exactly one other function … `0x4201c` → `0x4210c`").
- Artifact supports: the member data and counts are right; the "注册函数" label is the *class registrar*
  (class-inventory's `registrar_fn`), not the function that registers the members.

**C9 — `0xED0774` is not a `red_blue` handler**
- Stated: "`0xED0774` | `red_blue`（红蓝状态切换）" (monster-code-map.md:45).
- The function (0xed0774..0xed1150) references `red_End` (0xed0828), `blue_Change`, `blue_Loop`, `blue_End`,
  `red_Change`, `red_Loop`. The literal `red_blue` does not exist anywhere in the image (0 occurrences).
- Artifact supports: red_*/blue_* pair of sub-machines, no `red_blue` state name.

**C10 — `0x6AA9B8` subsystem label**
- Stated: "`0x52308C`/`0x6AA9B8` 属任务/存档，不属 AI" (monster-code-map.md:97).
- function-labels.tsv: `0x52308c save-data` (agrees) but `0x6aa9b8 otomo-ot | inferred:attr-callervote.tsv
  | caller vote: 3/3 evidence-bearing callers are otomo-ot; validated LOO 96.4%` (contradicts "存档").
- Both sides agree it is not monster AI; the subsystem attribution differs.

**C11 — monster-state-machine.md mis-models three two-level dispatchers**
The generator takes the last `cmp r0,#imm` before `add r1,pc,#4`, but the code for these three is
`movw #0x73e1; ldrb; sub r1,r0,#k; cmp r1,#N`, and the generator's mask `(w2&0x0FFFF000)===0x03500000`
only matches `Rn=r0`, so the real bound is missed and the first-level `0x73e0` compare is used as N.

| doc section | doc states | code at the dispatcher | real table |
|---|---|---|---|
| :6 `0x81ca4` | 0..10 | 0x81cac `cmp r0,#10` (gate on 0x73e0), 0x81cc0 `sub r1,r0,#30`, 0x81cc4 `cmp r1,#34` | 35 entries, index = 0x73e1−30 |
| :45 `0xd3137c` | 0..7 | 0xd31388 gate `cmp r0,#7`, 0xd31394 `sub r1,r0,#5`, 0xd31398 `cmp r1,#16` | 17 entries, index = 0x73e1−5 |
| :515 `0xf48ef0` | 0..7 | 0xf48efc gate `cmp r0,#7`, 0xf48f08 `sub r1,r0,#2`, 0xf48f0c `cmp r1,#61` | 62 entries, index = 0x73e1−2 |

The printed handler values are correct for entries 0..N of the *second-level* table (they recompute exactly),
but the "state 0..N" labelling and the row count are wrong: these are sub-states of the 0x73e1 byte, and
21 / 10 / 55 rows are missing respectively.

**C12 — ai-params "全字段表" omits three `mParam.` strings present in the image**
- Stated: "`mParam.` 共 131 条" (monster-ai-params.md:24).
- Image scan: 134 distinct `mParam.*` strings. Missing from the table:
  `mParam.mSyncParam.data[i]` @ 0x155a12e, `mParam.mTalismanParam.skillType[no]` @ 0x156cf2e,
  `mParam.mTalismanParam.itemId` @ 0x156cf5e. The first is inside the same 0x1559xxx/0x155axxx block as the
  table; the other two are `mTalismanParam` (arguably out of the monster scope).
- Artifact supports: 131 unique monster-block fields listed + 1 same-block omission (+2 talisman fields).

**C13 — state-machine dispatcher addresses are interior, not function entries**
- Stated/implied: each "## 派发器 `0x…`" is a dispatcher (monster-state-machine.md, 51 sections).
- All 51 addresses are absent from functions-retile.csv.gz as starts. Example: the doc's `0xd227d8` is
  +8 into the function `0xd227d0` — and 0xd227d0 is the value stored in the method table at 0x179cbb4 and
  the address function-labels.tsv carries (`0xd227d0 monster-em`); `0xd227d8` is **NOT LABELLED**.
  The same holds for `0x81ca4` (not labelled at all, because it is a leaf without push prologue).
- Artifact supports: dispatcher *entry* = movw-site − 8 (when a prologue exists); none of the doc's 51 ids
  resolves in the function inventory.

**C14 — "state → handler 已解决（53 个派发器全解）" vs 8 unresolved states**
- Stated: "全解" (monster-code-map.md:29).
- The doc's own table has 890 state rows, of which **8 have no handler** (`—`): section `0xfd9e74`
  (monster-state-machine.md:675) states 9..16 are blank because the table entries land outside `.text`.
- Artifact supports: 882 of 890 state rows carry a handler; the other 8 are blank in the one table.

**C15 — "读取该字段的函数 477"**
- Stated: monster-code-map.md:27.
- Recomputed: 638 `movw #0x73e0` sites; the number of distinct functions containing one is **481** by a
  push-prologue function table and **489** by functions-retile.csv.gz. No table in the repo gives 477.
- Artifact supports: 481–489 (≈2 % stale, not exactly reproducible).

---

## STALE — number that was true earlier

**S1 — 41/53 and the "state-motion2.mjs" citation.** monster-code-map.md:30 cites
`tools/mhgu/state-motion2.mjs`, but the checked-in `monster-state-machine.md` is
`tools/mhgu/state-motion3.mjs`'s output (its own header, lines 3-4, plus the "每个状态最多保留 1 个名字"
rule). state-motion2's header format (`有名字的状态`) appears in no file under `docs/`, so its 41/53 output
was overwritten by the v3 run (51 sections, 26 named). The figure should read 26/51 (or be regenerated from
v2 explicitly).

**S2 — 477 readers (monster-code-map.md:27).** Predates the retile: the retile table gives 489 functions,
the push heuristic 481. Same fact as C15.

**S3 — member-offsets.tsv `fn` column (and therefore monster-classes.md's "注册函数" column).**
`attr-members.md:135-139` dates the column to before the retile and recommends re-keying by the enclosing
function of `site` while keeping the registrar as the class. monster-classes.md reproduces the stale key:
25/27 groups point at a function with no member sites.

**S4 — `docs/analysis/audit/MECHANICS.tsv:4` / `ROUND1-ALL.tsv:40` claim "member-offsets.tsv row count per fn
equals doc: 0x4201c 4, 0x45118 11, 0x46498 23, … 13/13 match".** The TSV has no row with `fn=0x4201c`
(it is 0x4210c), no `fn=0x45118` (0x45f3c), no `fn=0x46498` (eight different fns). The "13/13" comparison was
made against a mapping that does not exist in the artifact, which is how S3 survived an audit that had
already opened this exact table.

---

## UNVERIFIED — load-bearing claims that cannot be checked with the available tools

**U1 — 149 action dispatchers, "case 数 4..45" (monster-code-map.md:28).** Reproduced counts: 3,244
`ldr r0,[r0,r1]; add pc,r0,r1` sites, 2,218 full 4-instruction dispatches, 53 0x73e0 dispatchers, case counts
7..225. No rule tried (field-based, signature-based, function-based) gives 149 with cases 4..45.

**U2 — 58 method tables (monster-code-map.md:32).** Unique dispatcher tables = 53; .data pointer runs
containing a dispatcher = 48 (with runs up to 297 words). Neither is 58.

**U3 — "全镜像仅 62 个 RTTI 命名的 vtable" (monster-code-map.md:96).** Would need an RTTI-name → vtable
scanner; no such artifact is checked in, and a 26 MB .data scan without the RTTI layout is guesswork.

**U4 — slot layout 0..70 / 71..111 / 112..134 / 135..136 (monster-code-map.md:69).** The arithmetic closes
(71+41+23+2 = 137) and `slot == index` for all 137 rows, but the resource-name table is **not** slot-aligned:
27 of 137 names do not contain the slot's base id (e.g. slot 3 emid 0x2 → `roEm001.cro`, slot 13 emid 0x10 →
`roEm014.cro`), and slots 82/88/89 (inside the "small" range) are `roEm017.cro`/`roEm019.cro`/`roEm019.cro`.
Shifting the table start −10..+10 entries gives 110/137 at shift 0 and nothing better. The big/small boundary
can therefore be neither confirmed nor refuted from the artifact the doc names.

**U5 — exact per-class counts 42 / 26 / 6 (C7).** Could be "class schema including inherited members", which
is not recorded anywhere in the repo (class-inventory only has sizes: cEmDouMouKaData 132, rEnemyDtBase 208,
rEnemyResidentDtBase 112).

**U6 — runtime copies of the slot table at 0x1A523A4 (.bss) and 0x164F7E4 (monster-code-map.md:68).**
Verified only that the addresses are outside `.text`; no code path was traced to prove a copy.

**U7 — manifest record layout `{名称哈希, 类型哈希}` (monster-code-map.md:17).** The +4 words of the two
records are the *class-name* crc32s, i.e. the second field is the class/resource-type hash; whether the first
field is an extension hash is untested (crc32("emsizetbl") = 0x493a1571 ≠ 0x681b7312).

**U8 — variant semantics of the 166-entry table (0/1/2/3/5/6/4) (monster-code-map.md:66).** The high-byte
variant / low-byte base structure is visible in the data (1,0x101,0x201,0x401 then 2,0x102,…), but the
0=原种/1=亚种/2=稀少/3,5,6=强化/4=二名 mapping is MH convention, not in any artifact.

**U9 — save-side body-size numbers: clean 42/137, dirty 74/137, 21 entries in slots 112..132
(monster-code-map.md:82).** Only source is the doc itself; no save image is checked in under `docs/`.
(The structural half — records from `char_off 0x60CA`, 137×4 B, `0x60CA+548 = 0x62EE` — is independently
restated in `MECHANICS-FINDINGS.md:297`.)

**U10 — "state → handler 已解决" as a general statement.** 882/882 printed handlers recompute correctly, so
the *printed* data is right; but C11 shows the model is wrong for 3 tables (35/17/62 real entries labelled as
11/8/8), and C14 shows 8 blank states. Whether "solved" means "the table entries were decoded" or "the state
space is fully described" is a premise the docs do not fix.

---

## Difficulties

1. **Interior addresses in a generated doc.** All 51 dispatcher ids in monster-state-machine.md are the
   `movw #0x73e0` sites, 8 bytes into the function; 51/51 are missing from `functions-retile.csv.gz` and
   `function-labels.tsv`. Cross-linking required `entry = site − 8` checks one by one (and fails for the
   leaf `0x81ca4`, which has no prologue). Cost: ~6 tool calls. Cause: generator design, not a tool bug.
2. **The generator's arithmetic had to be read to explain the mismatches.** `state-motion3.mjs:26` filters
   `N<=64` (hides two dispatchers), and its cmp matcher `(w2&0x0FFFF000)===0x03500000` accepts only `Rn=r0`
   (hides `cmp r1,#34` after `sub r1,r0,#30`). Without reading the generator I would have reported the three
   two-level tables as "handler values wrong", which they are not. ~4 tool calls.
3. **`member-offsets.tsv`'s `fn` column is ambiguous by design** (registrar vs containing function) and no
   header text resolves it; `attr-members.md` §6.2 was the only place that states the column predates the
   retile. Without it, 25/27 groups look like doc errors rather than a known stale artifact. ~5 tool calls.
4. **The resource-name table cannot adjudicate the slot layout** (27/137 names mismatch the slot's base id,
   no shift fixes it). I tried shifts −10..+10 entries (best 110/137 at 0) and alignment to the 166-entry
   monster table (4/137). Cost: 3 tool calls. Cause: genuinely unknown indexing (a third table not in the
   repo), not a parsing bug.
5. **My first `mParam`/`uEm` census by naive rodata string scan was wrong** (61 unit names instead of 225)
   because the scanner skipped printable runs without NUL terminators; the per-address check
   (435 rows, 0 mismatches) is the trustworthy one. Recorded here so the 61 figure is not reused.
6. **`0x160FDD0` record semantics stay open**: the two 8-byte records contain the correct class-name hashes,
   but the first field does not match crc32 of the extension strings, so the doc's field naming is untested
   (U7). Cost: 2 tool calls.
