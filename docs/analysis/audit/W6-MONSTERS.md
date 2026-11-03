# W6-MONSTERS — `docs/analysis/monsters/` (6) + `docs/mechanics/` (9), numeric re-sweep

Sixth linkage-review wave. Scope: every address, offset, count and table in the fifteen documents
that describe the monster / mechanics side of the knowledge base, checked against the committed
image, `docs/data/mhgu.db`, `docs/data/*.json`, `save-snapshots/`, `editor-src/` and the MHXX wiki
text mirror — not against the prose.

Version of the reviewed tree: `2026-11-04`, worktree. `git status` at the start of this pass showed
` M README.md` (another writer's edit, untouched here). The only tracked file this pass wrote is
`docs/mechanics/monster-state-machine.md`, by its own mandated generator, and it came back
byte-identical, so it does not appear in `git status` at the end — see §1.

## 0. Method notes

* Image: `main.140.flat.bin`, 25,472,632 B, md5 `1b865b537fa91c3d34f20776df01f8e3`; byte-identical
  to `G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`, which is what every generator
  and report under review actually reads (checked, not assumed).
  `vaddr` = NSO virtual address, `flat = vaddr + 0x100`. `TEXT_END = 0x13F1DEC`.
* Database: `docs/data/mhgu.db`, opened read-only through node's built-in `node:sqlite`
  (`new DatabaseSync('docs/data/mhgu.db',{readOnly:true})`); no `sqlite3` CLI on this box.
* Wiki text mirror: `G:/omp works/MHGU-private/docs/reference/mhxx-wiki/text/*.txt` (290 files).
* `docs/data/functions-retile.csv.gz` parsed with gunzip + manual split (hex `start,end` columns,
  quoted comma-bearing `strings` column), 52,692 function rows.
* Everything below is reproducible with a single `node -e` one-liner; each contradiction carries
  the actual command text and its actual output.
* **Write discipline**: the only tool run that writes a tracked path is the mandated
  `state-motion3.mjs` regeneration (§1); all other scanning was done with in-memory scripts. No
  coverage tool (`report.mjs`, `spread-votes.mjs`, `recompute.mjs`, `retile.mjs`) was invoked.

---

## 1. `docs/mechanics/monster-state-machine.md` — regenerated, byte-identical; banner audit

### 1.1 Regeneration

```
$ cp docs/mechanics/monster-state-machine.md /tmp/ssm-before.md
$ node tools/mhgu/state-motion3.mjs
dispatchers kept: 51  with >=1 named state: 26 ; second level: 9  named: 0
$ diff /tmp/ssm-before.md docs/mechanics/monster-state-machine.md && echo IDENTICAL
IDENTICAL
$ md5sum docs/mechanics/monster-state-machine.md
6b7876640e6409d43a3045261339230e  docs/mechanics/monster-state-machine.md
```

41,251 B before and after. The generator's own self-check (body row count == emitted row count)
passes, and the file is reproduced **byte for byte**.

### 1.2 Banner claims vs the body and the image

| banner claim | check | result |
|---|---|---|
| only tables with `N<=64` from `movw #0x73e0` are kept; dropping the filter adds `0x5c2cc` (N=225) and `0x1081408` (N=100) | full-image scan of `movw #0x73e0` sites: 53 total; exactly two with N>64: `0x5c2cc N=225 tb=0x5c304`, `0x1081408 N=100 tb=0x1081504` | ✓ |
| dispatcher addresses are function-interior, none is a function start | 60 section addresses vs the 52,692-start set of `functions-retile.csv.gz`: 0 hits; nearest-preceding function offsets `{8:27, 16:10, 12:2, 28:2, 72:2, …}` | ✓ (modal delta is +8, 27/60) |
| 51 level-1 sections + 9 level-2 tables, 1223 state rows, 8 rows with no handler, 119 named (9.7 %) | parsed body: 51 + 9 sections; 1223 rows; handler `—` on 8 rows; 119 named; 119/1223 = 9.73 % | ✓ |
| level-2: `0x81ca4` 11+35 (states 30..64), `0xd3137c` 8+17 (5..21), `0xf48ef0` 8+62 (2..63) | section headers give 11 / 8 / 8 states and second-level starts 30 / 5 / 2 with 35 / 17 / 62 rows | ✓ |
| every section header's counts equal its own table | 60/60 sections: row count == `有名字` denominator, named count == `有名字` numerator, first/last state == declared range | ✓ |

### 1.3 Independent reproduction of the whole body from the image

The handler column was rebuilt straight from the dispatcher tables (`entry = *(tb + 4*k)`,
`handler = tb + entry`) for all 60 sections:

```
handler mismatches: 0
doc blocks L1 51 L2 9 gen U 51 U2 9
```

and the dispatcher prologue is as documented (`0x81ca4: e30703e0` movw r0,#0x73e0;
`0x81ca8: e7d40000` ldrb r0,[r4,r0]; `0x81cac: e350000a` cmp r0,#10 — the doc's "#10（0x81cac 实测）"
in `monster-code-map.md` is exact).

**Verdict: confirmed.** No defect found. (The banner's "通常是起点 +8" is loose but true: +8 is the
modal offset with 27 of 60.)

---

## 2. `docs/mechanics/monster-code-map.md`

Confirmed, with the exact reproduction:

| claim | evidence |
|---|---|
| `0x48c60 add r1,pc,r0`, literal `[0x48cc4]=0x1509a56` → `0x15526BE` | `rd(0x48c60)=0xe08f1000`, `rd(0x48cc4)=0x1509a56`, `0x48c60+8+bias = 0x15526be`, string there `"cEmSizeCalcTblElement"` ✓ |
| `crc32raw` = reflected 0xEDB88320 / init 0xFFFFFFFF / no final xor; `.data 0x160fdd4=0x5adc692c`, `0x160fddc=0x1800eb37` | my own implementation returns `0x5adc692c` for `rEmSizeCalcTblElement` and `0x1800eb37` for `rEmSizeYureTbl`; both words read back identically ✓ |
| `movw rX,#0x73e0` 638 sites in 489 functions; 332 functions read it with `ldrb` within 3 instructions | any-condition-code scan: 638 sites / 489 functions; with the register-offset `ldrb rD,[rN,rD]` form: 399 sites / **332 functions** ✓ (AL-only gives 634/485 — the four extra sites carry condition codes 0 and 1, so the "638" is the any-condition count) |
| `movw #0x73e0` state tables: 53 | ✓ |
| 18-state dispatchers 41, 8-state 3, 13-state 2, five singletons | histogram from the image `{"18":41,"8":3,"13":2,"11":1,"12":1,"17":1,"27":1,"35":1}` ✓ |
| method-table clusters `0x179CBB4 / 0x17B46DC / 0x17C6FE0 …`, dispatcher in slot `[0]`, `[+4]` = shared stub `0x6bf18` | `rd(0x179cbb4)=0xd227d0`, `rd(0x17b46dc)=0xdc3900`, `rd(0x17c6fe0)=0xe81b4c`; `rd(0x179cbb8)=rd(0x17b46e0)=rd(0x17c6fe4)=0x6bf18` ✓ |
| main monster table 166 × u16 @ `0x162BF0C`; 93 exact EmIds in the slot table, 73 not | `table[0]=0x0001`, `table[1]=0x0101`, `table[165]=0x0057`, 166 distinct; 93 present in `0x1597EA4`, 73 absent ✓ |
| counter table 137 × `{u32 EmId,u32 slot}` @ `0x1597EA4`, slot column == row index | 137 rows, `slot!=row` count 0 ✓ |
| `EmId → slot` at `0x50B64`, "54 处引用 = 53 bl + 1 b" | BL/B target scan: `bl 53 b 1 total 54` (the single `b` is at `0x55bda8`) ✓ |
| resource-name table 137 × `const char*` @ `0x1732050` | 137 pointers, `k=0..5 → roEm001.cro`, `k=70 → roEm085.cro`, `k=135/136 → roEms017/roEms022.cro`, 87 distinct ✓ |
| §7 class families 3201 classes, per-family counts and byte sums | recomputed from `docs/data/class-inventory.tsv`: 3201 rows; `Mt 73/30080`, `c* 1116/446012`, `other 472/175220`, `r* 413/1129584`, `s* 199/13862748`, `u* 928/8181876` — every number exact ✓ |

### 2.1 CONTRADICTION — the "3,429 offset-table pairs / 2,546 functions" calibre does not reproduce

`monster-code-map.md:28` writes:

> `ldr rD,[rN,rM]; add pc,rN,rM` 偏移表对 **3,429 处、落在 2,546 个函数**

Scanning exactly that signature (word load with `P=1,U=1,B=0,W=0,L=1`, register offset, `add pc,rN,rM`
with identical `Rn`/`Rm`, within 3 instructions, restricted to nothing else):

```
$ node -e '... ldr rD,[rN,rM] ; add pc,rN,rM (<=3) ...'
ldr[rN,rM];add pc,rN,rM (<=3): 5791  in functions: 4275
```

Neighbouring readings of the same sentence were tried to make sure the difference is not my window:
adjacent (`add` at `+4`) = `5632 sites / 4144 fns`; `d==n` (nested destination) = identical
`5791/4275`; requiring `add rM,pc,#imm` immediately before = `5106/3814`; requiring the three-word
switch triple (`mov rX,rY,lsl#2` / `ldr` / `add pc`) = `13 sites / 10 fns`. None lands on 3,429/2,546.

Impact: the sentence is one of three "calibres" whose only job is to show that the old "149
dispatchers" is wrong. The conclusion survives (149 matches none of 5,791 / 53 / 13), but the
published number cannot be recomputed by a reader, which is exactly what this project claims its
numbers are for. Either restate the calibre (the exact rule that yields 3,429) or replace the
figures with the ones above.

### 2.2 CONTRADICTION — "`add pc,pc,rX,lsl#2` 内联跳转表 10 处"

`monster-code-map.md:28` names the signature `add pc,pc,rX,lsl#2` for the third calibre and gives 10.

```
$ node -e '... (w & 0x0FFFFF10)>>>0 === 0x008FF100 ...'
add pc,pc,rX any shift/type: 64
  0xecfc.. block (shifts 4,2,2,10,8,5,5,5,2,6,7,7,4,2,1,5,9,4,1,6,8,2,4,4,6,4,6,4,2,2,5,10,10,5,1,1,3,3,1,1,1,7,0,0,0,0,0,0,6,4,24,30,24,24,26,25,8,7,6)
```

Of these, exactly **two** are `add pc,pc,rX,lsl#2` (`0xecfcfc` `add pc,pc,r8,lsl#2`, `0xecfd6c`
`add pc,pc,r0,lsl#2`), and both sit inside a run of words whose shift/type fields walk
`lsl#4, asr#2, ror#2, lsl#10 …` — i.e. a data blob, not code. A count of **10** is only reached by
the *three-instruction switch triple* (`13 sites / 10 functions`, §2.1), which is a different
signature than the one printed.

Suggestion: change the label to the triple that yields 10, or change the count to 2 (with the note
that both live in data).

*Minor, not a defect:* "58 张 派发器所在方法表 → 未复现（53 个）" is consistent with the 53 sites.

---

## 3. `docs/mechanics/monster-classes.md`

* 27 sections, **110 rows**; every `(offset, type, name, site)` tuple is present in
  `docs/data/member-offsets.tsv` and every tsv row is present in the doc — set difference both ways
  is empty (`doc rows not found in member-offsets.tsv: 0`, `tsv rows absent from doc: 0`), and each
  section's row count equals its title (`110/110`). ✓
* Banner structural claims, verified on the image:
  * `rd(0x48698) = 0xe12fff1e` = `bx lr` — a 4-byte stub ✓
  * `0x4869c: e92d4010` (push {r4,lr}) … `0x486c0: e12fff12` (`bx r2`) = 10 instructions ✓, and the
    seven records live in `0x486c8: e92d4ff0` (push {r4-r11,lr}) ✓
  * `0x4201c → 0x4210c`: `rd(0x4210c)=0xe92d4ff0` (function prologue) ✓
* Registration-chain shape, sampled at the first record (`mTimer` +0x1AC, type 0, site `0x4234c`):

```
0x42344 e08f1001  add r1,pc,r1        ; name pointer
0x42348 e8800602  stm r0,{r1,r2}
0x4234c e28a1f6b  add r1,r10,#0x1ac   ; ROR(0x6b,30) = 0x1AC  ✓ offset is a code immediate
0x42350 e580100c  str r1,[r0,#0xc]    ; record+12 = instance+offset ✓
```

**Verdict: confirmed.** (The doc's own banner already states that 25 of the 27 "registrar" column
headings are not the function that writes the members; that is a known, flagged defect, not a
number error, and `member-offsets.tsv` is the authority it is compared against.)

---

## 4. `docs/mechanics/monster-ai-params.md`

Machine check of **every** `| 0x…… | \`name\` |` row in the file — 435 rows, each read back from the
image at the stated vaddr:

```
vaddr rows checked: 435 mismatches: 0
```

Section counts and the counts printed in the headings:

```
OK   移动 / 寻路 …            claim 17 rows 17
OK   索敌 / 目标选择 …        claim 13 rows 13
OK   状态蓄积阈值 …           claim 12 rows 12
OK   行动控制 …               claim 9  rows 9
OK   体型 / 属性 / 编号 …     claim 12 rows 12
OK   网络同步 …               claim 10 rows 10
OK   组编成 …                 claim 16 rows 16
OK   其余（未归类）— 45 条    claim 45 rows 45
S4 rows (all table rows after ## 4): 225
```

* "131 个以 `mParam.` 开头的 NUL 分隔字符串（131 个不同名），本表 134 行 = 131 + 3 行重复" — image
  scan: `strings starting with mParam.: 131  distinct: 131`, substring hits `134`. ✓
* The three substring hits are quoted at their enclosing-string starts:
  `0x155a123 "pEquipData.mParam.mSyncParam.data[i]"`,
  `0x156cf22 "festaEquip->mParam.mTalismanParam.skillType[no]"`,
  `0x156cf52 "festaEquip->mParam.mTalismanParam.itemId"` ✓
* "225 行 = 96 条单元名 + 129 条行动名；`^uEm[0-9]{3}_00$` 正好 61" — image: 96 `uEm*` rows, 129 `ems*`
  rows (116 camel + 13 underscore, the 13 underscore ones also appearing in §2), 61 exact
  `uEm###_00`, 28 `uEms###_00`, 3 `uEm###_00::class`, 4 `uEm087/088…` ✓
* §2 has 44 rows, which is what `monster-code-map.md` cites ("§2，44 条") ✓

**Verdict: confirmed.** Cleanest document in the set.

---

## 5. `docs/mechanics/monsters.md`

Most of it survives a hard check; two sections do not.

### 5.1 CONTRADICTION — the "93-row `MonsterForm` list" does not exist; the §12 `i` column is not an editor row or a slot

`monsters.md:23`:

> `MonsterForm.cs` 名单 **93 行**；两者逐条一一对应（§12 映射表）

`monsters.md:537-541`:

> **93 行名单** 恰好覆盖全部 93 只大型怪物 … 结论：`i = 0..92` 全部可达 ⇒ 编辑器**够不到的是槽 93..134（42 槽）**

The cited file contains a **137-entry** name array, iterated 1:1 over the slots:

```
$ grep -n "string\[\] array = new string\[137\]\|for (int i = 0; i < 137; i++)\|monster\[i\].name = array\[i\]" editor-src/MHGU存档修改/MonsterForm.cs
179:		string[] array = new string[137]
196:		for (int i = 0; i < 137; i++)
200:			monster[i].name = array[i];

$ node -e '... extract quoted names from the array ...'
array entries 137
idx70-75: 跳狗龙,草食龙,甲壳草食龙,灵鹿,香菇猪,飞虫
idx110-115: 小型怪物#4201,小型怪物#4202,岩龙,铠龙,角龙,鏖魔角龙
idx133-136: 阁螳螂(机偶),阁螳螂,大雷光虫,小桃毛兽
岩龙 at index 112
天慧龙 at index 132
```

So editor row 71 is 草食龙, not the doc's `i=71 岩龙`; editor row 112 is 岩龙; row 92 is 飞甲虫, not
阁螳螂 (`monsters.md:541` and §13.2 both assert "槽 92 = 阁螳螂"). §9's "名单（编辑器 i）… 鏖魔角龙(74)"
(line 373) is likewise wrong — 鏖魔角龙 is at index 115.

This is not a style point: §13.1 tells a reader to compute the save address as `24230 + 2*i` with
*i from §12*, so a reader following the doc for `i=91` (天慧龙) would read the counter of 羚鹿.

Two independent witnesses settle the slot order and agree with the editor file, not with §13:

```
$ node -e '... read 137 rows of the static table at 0x1597EA4 ...'
rows 66..80: 66:81 67:82 68:83 69:84 70:85 71:4097 72:4098 … 80:4106
rows 108..118: … 110:4201 111:4202 112:4 113:5 114:7 115:1031 116:12 117:13 118:269
rows 133..136: 133:87 134:88 135:4113 136:4118
big(<0x1000) 94   small(>=0x1000) 43
rows where slot!=row index: 0
```

i.e. slots 0..70 and 112..134 are the 94 large entries, slots 71..111 and 135..136 the 43 small ones
(`docs/analysis/monsters/mon-counter-slots.md:11` states exactly this, and calls the repo json
`monster-slot-map.json` + `monster-slot-map-small.json` misaligned after slot 71).

⇒ "槽 93..134（42 槽）身份未知" is false: slot 93 = 甲虫, 112 = 岩龙, 134 = 阁螳螂, and every one of
those slots has a name in the very file the doc cites. §13.3's "62/137 非零小计数器" observation is
correct but its interpretation (unnamed slots) is not: the 41 nonzero counters in 24372..24453 are
the small-monster block.

Suggestion: replace the `i` column's definition with "index within the 93 large-monster entries of
`MonsterForm.cs`, which is *not* the editor row and *not* the save slot for `i >= 71`", and either
add a `slot` column (0..70, 112..134) or state the conversion `slot = i < 71 ? i : i + 41`.

### 5.2 CONTRADICTION (found in `quests.md`) — clean-save seen bits for "狩猎道场 7 关" are 1175..1184, not 1174..1180, and there are ten of them

`quests.md:626` (same claim repeated at `:667`) says the clean save's *seen* run identifies seven
hunter-training quests at bits 1174–1180:

```
$ node -e '... set-bit runs of the seen bitmap at 0x2D77 ...'
seen count 331 runs 62
…[866,866],[906,911],[1175,1184],[1194,1199],[1249,1251],[1311,1312],[1315,1320],[1332,1336],[1396,1396]
```

The run is `1175..1184` — ten bits, not seven, and shifted by one. (Cleared bitmap has *no* bits in
that range: `cleared bits 1170..1185:` empty.)

### 5.3 CONTRADICTION (stale, `quests.md:678`) — uses the superseded +4-off coordinates for the counter arrays

`quests.md:678`: 击杀 `0x5EA2`（137×u16）+ 捕获 `0x5FB4`. The authoritative coordinates in this repo
are `0x5EA6` (24230) and `0x5FB8` (24504):

* `DEVELOP.md:396,404`: `obj+0x72C` → `0x5EA6..0x5FB7`; `24230 (0x5EA6) = obj+0x72C 块首（~~+4~~ superseded …）`
* `docs/save-layout/coverage-map.md:217`: "坐标警告：本表用的是 +4 修正前的偏移（`0x5EA2` / `0x5FB4`）"
* `monsters.md:519-521` — the sibling document — already uses `0x5EA6` / `0x5FB8`.

Tiling proof that 0x5EA6 is the right start: `0x5EA6 + 274 + 274 + 548 = 0x62EE`, exactly the
equipment-box start (`equipment.md` "char_off 25326 (0x62EE)"), whereas `0x5EA2 + 1096 = 0x62DA`
leaves 20 bytes unaccounted. Data check: reading at 24230 gives
`2,0,0,2,0,0,1,1,3,0,0,1,2,0,0,2` for slots 0..15, at 24226 `0,0,2,0,0,2,0,0,1,1,3,0,0,1,2,0`
(the latter is the sequence quoted in `coverage-map.md:224` under its own +4 warning).

### 5.4 What is right in `monsters.md` (so the fix pass does not over-correct)

| claim | reproduction |
|---|---|
| 93 large = 75 `class=0` + 18 `class=2`; 36 small at `_id` 4097..4144; 129 total | `monsters.json`: rows 129, `{0:75,1:36,2:18}`, small ids 4097..4144 ✓ |
| §12 93 rows, no duplicate, no omission, `base_hp` column | all 93 ids resolve, 93 distinct, `hp/id mismatches: 0`, 18 of them `class=2` ✓ |
| §1 species table sums to 93; wiki gives 94 pages / 94 entries | wiki cells: 104 `种类` pages − 10 non-monster pages (目的地 3, 特殊 3, 讨伐 2, 狩技 1, 入手道具 1) = **94**; species tally 21/13/13/10/10/6/4/4/4/3/2/2/1/1 = 94; the doc's 鸟龙 11 / 鱼龙 3 / 甲虫 3 moves 白速龙王 and folds 机甲, giving 93 ✓ |
| 44 pages with the 狞猛化时 note | `pages with a line starting 狞猛化时: 44` ✓ |
| §5.2 728 = 91×8; only 老山龙(12) and 黑龙(13) lack rows | `status monsters 91 rows 728`; missing ids = 12, 13 plus the 36 small ones ✓ (269 and 525 present) |
| 雌火龙 180+4×100=580, 150+4×150=750, 80+4×120=560, 180+5×110=730, 70+20×30=670 | db `monster_status`: Poison 180/100/580, KO 150/150/750, Mount 80/120/560, Para 180/110/730, Blast 70/30/670 ✓ |
| 荒钩爪(1056) identical except Jump 60/90→70/110 and Blast dmg 100→80, inc 30→50 | ✓ exactly |
| 天慧龙 para duration 9 s; (煌黑龙 id 50 blast row is 0/0/0/0/0) | `Valstrax Para … dur 9`; `Alatreon(50) Blast 0/0/0/0/0` ✓ — note there are two `Alatreon` rows (9 and 50); the doc's §5.1 row (poison 150/15 s) matches id **50**, whose blast row is indeed all-zero, so this is **not** a contradiction |
| 骸龙 only poison 400; 阁螳螂 blast 0; 天慧龙 exhaust 0 | Nakarkos `Poison 400/100/1000/60/300`, everything else 0; Ahtal-Ka `Blast 0/0/0/0/0`; Valstrax `Exhaust 0` ✓ |
| §3.3 雌火龙 1/3/4/3/5, 雄火龙 雷6 龙5, 黑龙 4/1/2/1/5; 雌火龙 `meat=0` | db `monster_weakness` ids 1, 2, 13 ✓ |
| §3.4 轰龙 hitzone table incl. 愤怒 column | db id 32 Head `65/55/55/0/10/20/5/15/100`, `(Enraged) 70/65/60/…/130`, Back `44/40/30`, Front Legs `25/25/25` / enraged `30/30/25` ✓; wiki page 1855 rows identical ✓ |
| §4 轰龙 durability 220/330/[330], 180/270, 200/300/[300], 240/[240]/360/[360] | wiki 1855 耐久値 block, row for row ✓ |
| §2 base_hp extremes | min Bulldrome 1800, max Lao-Shan Lung 25000, Nakarkos 14000, Amatsu 8700, Grimclaw 6000 vs Tigrex 5000, Elderfrost 6800 vs Gammoth 5400 ✓; §9's "+400~2200" = Dreadqueen 4900−4500 to Stonefist 5500−3300 ✓ |
| §13.1 kill/capture coordinates `0x5EA6..0x5FB7` (24230..24503) and `0x5FB8..0x60C9` (24504..24777) | 274 B each, consecutive ✓ |

*Minor:* `monsters.md:521` writes the size block as `0x60CA..0x62EE（24778..25325）`; the hex range is
end-exclusive (`0x62EE` = 25326) while the decimal is inclusive. Every other doc uses the same hex
pair with "548 B", so this is notation, not arithmetic — but a reader who reads `0x62EE` inclusive
gets 549 B.

---

## 6. `docs/mechanics/quests.md`

Confirmed:

| claim | reproduction |
|---|---|
| 1355 = Village 375 / Guild 569 / Permit 228 / Arena 17 / Event 166 | `by hub: [{"Arena",17},{"Event",166},{"Guild",569},{"Permit",228},{"Village",375}]` ✓ |
| `quests.json` 944 with keyType key 118 / urgent 30 / pre-req 18 / normal 778 | ✓ |
| `_id` 101..1,120,012 | `_id min 101 max 1120012 n 1355` ✓ |
| Permit = 18 monsters, 12×16 + 6×6 = 228 | `permit monsters 18 rows 228`; twelve chains of 16 (1025,1026,1042,1043,1056,1061,1069,1081,1084,1085,1090,1104) and six of 6 (1031,1044,1103,1105,1106,1107) ✓ |
| deviant order = sort_order 944/960/976/992/1008/1024/1040/1056/1072/1088/1104/1120 then 1136/1142/1148/1154/1160/1166 | chain starts are exactly those eighteen values, in that order ✓ |
| Arena 17 rows | `arena {"a":1172,"b":1188,"c":17}` ✓ |
| bit-field coordinates `0x42C→0x2C77`, `0x52C→0x2D77`, `0x62C→0x2E77` | `DEVELOP.md:211` and `CURRENT-RULING.md:59` agree ✓ |

Defects: §5.2 (1174–1180 vs 1175..1184) and §5.3 (`0x5EA2/0x5FB4`) — both cross-referenced above and both
belong to this file.

---

## 7. `docs/mechanics/equipment.md`

The §1.1 statistics table reproduces exactly against `docs/data/json/weapons.json`:

```
rows 10877
families 1585
final=1 1585
max levels per family 15
slots {"0":5395,"1":2828,"2":1900,"3":754}
elements {"none":5141,"Fire":773,"Water":847,"Thunder":908,"Poison":534,"Paralysis":281,"Blastblight":544,"Ice":783,"Sleep":222,"Dragon":844}
sharpness nonempty 8721
element_2 nonempty 56
awaken nonempty 0
max_attack nonzero 0   tree_depth nonzero 0
```

Also: `_id = (class<<16)|(familyIndex<<8)|(level+1)` and `family = class*256 + familyIndex`
(sampled 10,877 rows, 0 mismatches; `65793 → class 1, familyIndex 1, level 1, family 257`);
decoration ids 2638..2888 with 242 rows (`select min(_id),max(_id) from decorations` → `2638, 2888`;
`count(*)` → 242) ✓; hunter box 25326 (0x62EE) × 2000 × 36 B and palico box 97326 (0x17C2E) × 1000 ×
36 B — the two ranges abut exactly (`25326 + 2000*36 = 97326`) ✓; and the palico records carry only
types 22/23/24 (`clean … palico nonempty 20 types {"0":980,"22":10,"23":5,"24":5}`), which is what the
doc's "22–24 猫" says ✓.

**Verdict: confirmed** on every number checked.

---

## 8. `docs/analysis/monsters/` (6 files)

### 8.1 `mon-ai-entry.md` — confirmed

* E9 template string: `0x6baf0 = e59f0038` → literal at `0x6bb30 = 0x14e78d3`; `0x6baf4 = e08f1000`
  (`add r1,pc,r0`), `0x6baf4+8+bias = 0x15533cf` ✓ (and the string there is `emXXXFwMove`, not
  `uEnemyActCustom`).
* §2.4 method tables: all seven落点 words equal the quoted dispatcher addresses —
  `0x179cbb4=0xd227d0`, `0x17b46dc=0xdc3900`, `0x17c6fe0=0xe81b4c`, `0x17dec84=0xf35910`,
  `0x17e817c=0xf9c8b4`, `0x17ed148=0xfdc074`, `0x181298c=0x10d2278` (7/7 exact).
* E5/E6 dispatcher signature matches the bytes at `0x81ca4` (see §1.3).

### 8.2 `mon-class-map.md` — confirmed (one column already known UNVERIFIABLE)

* `bl 0x7aedcc` count = **3205** (`bl to 0x7aedcc: 3205`), which is the doc's headline.
* The class-size column (`cEmDouMouKaData 0x84`, …) remains unproven — the prior wave recorded it as
  UNVERIFIABLE (registration sites carry `r3=0x84/0x20` but the class name is neither a literal nor a
  crc32 constant at those sites). I did not find new evidence either way; it stays UNVERIFIED.

### 8.3 `mon-counter-slots.md` — confirmed, and it is the witness against `monsters.md` §13

* `0x523100 = 0x01108e58`; `add r7,pc,r0` at `0x5230ac` → `0x5230b4 + 0x1108e58 = 0x162bf0c` ✓
* table `[0]=0x0001`, `[1]=0x0101`, `[165]=0x0057`, 32 zero bytes after `+332` ✓ (166 items)
* `0x1597EA4`: 137 rows, `slot == row index` for all 137, large 94 (0..70, 112..134) / small 43
  (71..111, 135..136) ✓ — see the dump in §5.1.
* `0x50B64` = 53 `bl` + 1 `b` = 54 ✓

### 8.4 `mon-em-units.md` — confirmed

* The `roEm###.cro` pointer table at `0x1732050` reads back with the quoted k=0..20 prefix
  (`roEm001 ×6, roEm003, roEm008, roEm009, roEm010, roEm011, roEm014 ×3, roEm017, roEm018 ×2,
  roEm019 ×3, roEm022`), `k=70 roEm085`, `135 roEms017`, `136 roEms022` ✓, 137 entries, 87 distinct.
* The pc-relative materialisation sample is exact:
  `0x4f170 e59f1f10` (`ldr r1,[pc,#0xF10]`) → literal `0x50088 = 0x1503654`; `0x4f174 e79f0000`
  (`ldr r0,[pc,r1]`); `0x4f178 e08f1001` (`add r1,pc,r1`) → `0x4f180+0x1503654 = 0x15527d4` =
  `uEm001_00` ✓.

### 8.5 `mon-quest-dispatch.md` — confirmed

* `0x2484c0` prologue words match one for one (`e92d4070`, `e2431001`, `e3510071`, `8a0000c1`,
  `e1a01101`, `e28f2008`, `e7911002`, `e081f002`).
* Table at `0x2484f0`: 114 entries, **49 distinct targets**, group sizes
  `0x248f40 ×22, 0x2486b8 ×14, 0x2486d0 ×14, 0x2487e4 ×9, 0x2486f0 ×6, 0x248704 ×6` — exactly the
  doc's "43 exclusive + 6 shared blocks" (43+71 = 114) ✓.
* `cond 10 → 0x2484f0+0x490 = 0x248980`, `cond 11 → 0x2489a4`, `cond 27 → 0x248c24` ✓.

### 8.6 `mon-size-calc.md` — four number defects

1. **CONTRADICTION (string table): `0x1552600 | iWaza_OtherParts_Bias` is 3 bytes into its string.**

```
$ node -e '... walk back to the NUL ...'
0x15525f2 "Parts_Bias"
0x1552600 "iWaza_OtherParts_Bias"
string starts at 0x15525fd "KariWaza_OtherParts_Bias\0Sup"
```

   The real name is `KariWaza_OtherParts_Bias` at `0x15525FD`; `0x1552600` is its 4th character.
   The doc's own premise for that table is "块内紧邻无填充（addr_next = addr + len + 1）", so the first
   row must start at the string start; as printed the chain is broken at the top. (`monster-classes.md`
   lists the same member as `KariWaza_OtherParts_Bias` with type 0.)

2. **CONTRADICTION: the `mini == maxi` enumeration contains slot 0, which is not equal.**

```
$ node -e '... count slots where mini==maxi in the clean save ...'
clean records 42 mini==maxi count 17 slots 9/11/14/19/20/21/26/30/38/40/42/49/52/53/58/59/60
```

   The count 17 is right; the list `（0/9/11/…/60）` at `mon-size-calc.md:252` prints 18 numbers and the
   extra one (0) is 雌火龙 = 96/105 in this save.

3. **STALE: `mon-size-calc.md:308` still says "129 槽有效（0..128）"**, contradicting line 111 of the same
   file ("137 个槽全部有意义（2026-10-25 定案，旧「129 条有意义」已作废)"), the §结论 table row 5
   ("有效 **137**"), and the data (dirty save has records at slots 129, 130, 131, 132).

4. **CONTRADICTION: "dirty … 值域 88..125" (`:261`) but the same document's U4 records `maxi=154` at
   slot 26, and the data agrees with U4:**

```
dirty records 74 eq 6 max 154 at slot 26
```

   The range sentence should be 88..154 or explicitly "88..125 excluding the U4 outlier".

   Everything else in the file checks: clean range 92..125 ✓, high bytes zero ✓, `mini<=maxi` 137/137 ✓,
   clean 42 / dirty 74 nonzero ✓, dirty records in slots 112..132 = 14 ✓, the 83/54 split and the
   3,844-byte 28×137 romfs structure are arithmetic-consistent (8+137×28 = 3,844) though the romfs body
   itself is not in the public repo.

---

## 9. `skills-arts.md` and `systems.md` (the other two files in `docs/mechanics/`)

`skills-arts.md`:

```
$ node -e '... group docs/data/json/skills.json by skill_tree_id ...'
skills.json rows 326
distinct trees 204
tier signatures: {"10":136,"-10,10":18,"-10,10,15":17,"10,15":20,"-20,-15,-10,10,15,20":5,"-15,-10,10,15":7,"-15,-10,10,15,20":1}
```

⇒ 204 trees with required=10 ✓, 136 only-`[10]` ✓, 20 `[10,15]` ✓, 48 with a negative tier
(18+17+5+7+1) ✓, five full six-tier trees ✓, 242 decorations ✓ — every number in §1.3/§2 of the doc
reproduces.

`systems.md`: `combining` 183 ✓, `horn_melodies` 278 ✓, and the food-skill page now says 64, which
is right (`2506.txt` has 64 `name`/`value` pairs; the earlier "61" finding in
`docs/analysis/audit/MECHANICS.tsv` is stale — the document has since been corrected).

**CONTRADICTION (cross-document, one bit): `systems.md:895` says the arena quests sit at
`0x42C bit 1287-1303`, `quests.md:537-546` says bits 1288–1304, and both cite `char_off 11544-11546`.**
The editor settles it:

```
$ grep -n "11544\|11545\|11546" editor-src/MHGU存档修改/OtherForm.cs
213:		if (chkBoxArenaQuest.Checked)
215:			SetBits(11544, byte.MaxValue, false);
216:			SetBits(11545, byte.MaxValue, false);
217:			SetBits(11546, 1, true);
```

`bit = (char_off - 11383)*8 + n` ⇒ 11544 → bits 1288..1295, 11545 → 1296..1303, 11546 bit 0 → 1304.
That is 17 bits, **1288..1304**. A range starting at bit 1287 would start mid-byte, which the
byte-granular `SetBits` cannot express. `systems.md:710` hedges ("bit 1287-1303 / 1288-1304"), which
should collapse to the single correct range.

---

## 10. Deliberately not reported (checked, no defect)

* `monster-state-machine.md`'s "通常是起点 +8" — 27/60 is the modal offset; loose wording, not wrong.
* `monster-code-map.md`'s 638 vs 634 — the 638 figure counts all condition codes (4 sites carry
  cond 0/1); the doc does not say AL-only, so no contradiction.
* `monsters.md` §5.2's "煌黑龙 爆破 0/0/0/0/0" — true for `_id` 50 (the MHXX row the §5.1 table's
  150/15 s poison matches); `_id` 9 with the same name has 70/30/670. Not an error, but the duplicate
  `Alatreon` name in `monsters.json` is a trap for the next reader.
* `quests.md`'s "questId 1288–1304 for the 17 arena quests" — the *game-side* id space is still
  unproven (`mhgu.db` only gives `sort_order` 1172..1188); the doc already marks the derivation
  `[推断]`, and only the *bit* range is checkable, which it gets right.
* `monster-classes.md`'s registrar column — the doc's own banner already flags that 25/27 headings are
  not the writing function; the member data matches `member-offsets.tsv` 110/110.

## Difficulties

1. **Two documents in the same directory describe the same save block with different starts**
   (`monsters.md` 0x5EA6/0x5FB8 vs `quests.md` 0x5EA2/0x5FB4), and the save data cannot arbitrate on
   its own: in the clean snapshot record 0 of the size block is empty, so reading at 24774 and at
   24778 returns the same nonzero sequence. The arbitration used here is the tiling
   (`0x5EA6 + 274 + 274 + 548 = 0x62EE` = equipment box start) plus `DEVELOP.md:396-404` /
   `coverage-map.md:217`, which name 0x5EA2 as the superseded coordinate. A 4-byte byte dump at
   24226..24233 in a save with a nonzero slot-0 count would settle it directly; neither snapshot has
   one.
2. **`monster-code-map.md`'s 3,429/2,546 and "10 inline jump tables" cannot be reproduced from the
   signatures the same sentence prints.** I tried six plausible readings of the first (adjacent,
   ≤2, ≤3, nested-destination, pc-relative table base, scaled-index triple) and three of the second;
   only the triple reaches "10 functions". Either the calibre is under-specified or the numbers came
   from a filter that is not in the text. I report the figures as not reproducible rather than as
   proven-false.
3. **The `i`-column defect in `monsters.md` cannot be fixed by editing one number.** §12's `i`,
   §13.1's read formula, §13.2/13.4's "42 unknown slots" and §9's editor index list all depend on the
   same wrong premise; the fix pass needs a `slot` column and a re-derivation of §13.2–13.4, and
   `mon-counter-slots.md` (which already has the right answer) should be promoted over §13.3.
4. `docs/data/mhgu.db` is untracked, so a fresh clone cannot re-run any of the database checks;
   `docs/data/json/*.json` is tracked and agreed with the db everywhere it was cross-checked
   (monsters 129, damage 893/93, weakness 108, status 728/91, decorations 242, skills 326).
5. No `sqlite3` binary on the box — all SQL went through node's `node:sqlite` (v24.22.1). Quoting
   differs from the CLI (double quotes are identifiers), which cost one failed query before the
   single-quote form was used.
6. The MHXX wiki mirror lives in the private repo
   (`MHGU-private/docs/reference/mhxx-wiki/text`), not in `MHGU/`, so wiki-side numbers (species
   tally, 44 hyper pages, durability tables, 2506 food skills) are verifiable only on a machine that
   has the sibling checkout.

## VERDICT

```
docs/mechanics/monster-state-machine.md	confirmed	regenerated byte-identically (md5 6b787664…), 51+9 sections, 1223 rows, 8 no-handler, 119 named, all 60 handler columns rebuilt from the dispatcher tables with 0 mismatches
docs/mechanics/monster-code-map.md	contradiction	638/489/332, 53 tables, 41×18-state, method tables, 166-entry main table, 93/73, 137×8B slot table, 54 refs, 3201-class families all exact; but "3,429 pairs / 2,546 functions" reproduces as 5,791/4,275 and "10 inline jump tables" as 2 (both in a data blob)
docs/mechanics/monster-classes.md	confirmed	110/110 rows identical to member-offsets.tsv both ways; 0x48698 = bx lr stub; 0x4869c..0x486c0 = 10 insns ending bx r2; 0x4210c prologue; site 0x4234c = add r1,r10,#0x1ac
docs/mechanics/monster-ai-params.md	confirmed	435/435 vaddr→string rows exact; section counts 17/13/12/9/12/10/16/45; 131 distinct mParam strings vs 134 substring hits; 225 = 96+129; 61 uEm
docs/mechanics/monsters.md	contradiction	93 rows/base_hp/status/weakness/durability all reproduce, but the "MonsterForm 93-row list" is 137 names (岩龙 is row 112, not 71), §13's "42 unknown slots" are named slots 93..134, and §12's i is not a slot
docs/mechanics/quests.md	contradiction	counts 1355=375+569+228+17+166, keyType 118/30/18/778, _id 101..1120012 and the 18 permit sort_order starts all exact; but 0x5EA2/0x5FB4 are the superseded coordinates and "1174–1180, 7 bits" is really 1175..1184, 10 bits
docs/mechanics/equipment.md	confirmed	10877/1585/1585/15, slots 5395/2828/1900/754, element split, 8721 sharpness, 56 dual-element, deco 242 @2638..2888, boxes 25326+72000=97326
docs/mechanics/skills-arts.md	confirmed	204 trees, 326 skills, 242 decorations, 136/48/20 split, five six-tier trees — all recomputed from docs/data/json/skills.json
docs/mechanics/systems.md	contradiction	combining 183, horn 278 and the 64 food skills all reproduce; arena bit range "1287-1303" is off by one (OtherForm writes 11544..11546 = bits 1288..1304)
docs/analysis/monsters/mon-ai-entry.md	confirmed	0x6baf0→0x15533cf "emXXXFwMove"; all 7 method-table slots hold the quoted dispatcher addresses
docs/analysis/monsters/mon-class-map.md	confirmed	bl 0x7aedcc = 3205; class-size column still UNVERIFIED (no new evidence either way)
docs/analysis/monsters/mon-counter-slots.md	confirmed	0x162bf0c base, 166 items, 137-row slot table with slot==row and 94/43 split, 0x50B64 = 53 bl + 1 b
docs/analysis/monsters/mon-em-units.md	confirmed	137-entry roEm*.cro pointer table matches the printed k-map; 0x4f178 add r1,pc,r1 → 0x15527d4
docs/analysis/monsters/mon-quest-dispatch.md	confirmed	114-entry table at 0x2484f0, 49 distinct targets, group sizes 22/14/14/9/6/6, cond10/11/27 targets exact
docs/analysis/monsters/mon-size-calc.md	contradiction	"iWaza_OtherParts_Bias" is mid-string (real name KariWaza_… @0x15525FD); mini==maxi list wrongly includes slot 0; "129 槽有效" is stale vs line 111/301; dirty range 88..125 vs actual 154
```

15 rows: confirmed 10 (monster-state-machine, monster-classes, monster-ai-params, equipment, skills-arts, mon-ai-entry, mon-class-map, mon-counter-slots, mon-em-units, mon-quest-dispatch) | contradiction 5 (monster-code-map, monsters, quests, systems, mon-size-calc) | stale 0 | unverified 0.
