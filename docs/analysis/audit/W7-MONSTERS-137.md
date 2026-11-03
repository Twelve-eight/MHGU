# W7-MONSTERS-137 — `docs/mechanics/monsters.md` re-based on the 137-slot array

Seventh wave, single document. `docs/mechanics/monsters.md` described the save editor's monster list as
**93 rows indexed 0..92**, and built §12 (the mapping table) and §13.2–§13.4 (the "42 unknown slots"
investigation) on that premise. The current `editor-src/MHGU存档修改/MonsterForm.cs` declares
`new string[137]` with the comment "槽位权威顺序（137 槽）：0..70 大怪 → 71..111 小怪 → 112..134 大怪 →
135..136 小怪", and the save layout (`docs/save-layout/coverage-map.md` "137 槽真实布局",
`DEVELOP.md` §怪物统计) has been on 137 slots since 2026-10-23. Every slot claim in the page was
therefore either stale or self-contradictory.

This pass rewrites those claims, regenerates the §12 table from machine sources (not by hand), and
replaces §13.2–§13.4 — including the four [未确认] entries U1–U4 — with the settled layout and the
verification that settles it. `node tools/audit/check.mjs` → **ALL PASS**.

---

## 0. Ground truth, reproduced from the artefacts

Nothing below is taken from another document's prose. Each row is what this pass read out of the file,
the image or the save.

| # | source | what it says | reproduction |
|---|---|---|---|
| 1 | `editor-src/MHGU存档修改/MonsterForm.cs` (gitignored, present locally) | `new string[137]` at `:179`, literal body `:181`–`:194` (10 names per line), `for (int i = 0; i < 137; i++)` at `:196`, `monster[i].name = array[i]` at `:200`; base offsets 24230/24504/24778 at `:173`–`:175`; reads at `:201`–`:205` | 137 quoted strings extracted from the literal ⇒ **137**, and `idx71=草食龙 idx92=飞甲虫 idx112=岩龙 idx133=阁螳螂(机偶) idx134=阁螳螂 idx135=大雷光虫 idx136=小桃毛兽` |
| 2 | static slot table, vaddr `0x1597EA4` (image offset `0x1597FA4` in `main.140.flat.bin`, md5 `1b865b537fa91c3d34f20776df01f8e3`) | 137 × `{u32 emid, u32 slot}` | 137 rows, `slot == row index` **137/137**, large (`emid < 0x1000`) **94** / small **43**, **137 distinct emid**; pair #138 = `0x77c9 / 30666` (garbage ⇒ the table really ends at 137) |
| 3 | resource-name table, vaddr `0x1732050` | 137 × `const char*` → `roEm###.cro` / `roEms###.cro` | 137 non-null pointers, **87 distinct** names, `k=70 roEm085.cro`, `k=112 roEm004.cro`, `k=133 roEm087.cro`, `k=134 roEm087.cro`, `k=135/136 roEms017/roEms022.cro`, `roEms100.cro` ×7 at `k=105..111` |
| 4 | `docs/data/json/monster-slot-map-137.json` | 137 rows `{slot, emid, cn, …}` | `slot` 0..136 contiguous, `emid` equals the static table **137/137**. (`monster-slot-map.json`, the older map that `coverage-map.md` calls superseded, is also 137 rows and also equal to the static table 137/137 — the two JSONs disagree only on Chinese naming, never on `emid`.) |
| 5 | `docs/data/json/monsters.json` | 129 rows, `class` ∈ {0,1,2} | `{0:75, 1:36, 2:18}`; the 93 large ids all appear in the 94 large slots; the one large slot with no DB row is **slot 133 / emid 87**; emid 4196..4202 are in the slots but **not** in the DB (7 of 7 missing) |
| 6 | `save-snapshots/` — 8 `.hnt` files (md5 ⇒ 3 distinct contents: `135f555…`, `38a041a…`, `4716246…`) | kill `24230+2k`, capture `24504+2k`, size `24778+4k` | small-monster slots (71..111, 135..136): **capture nonzero 0** and **size records 0** across all 8 files; `kill[133]=0` / `kill[134]=6` in the HR198 save; `kill[106]=5` (clean) / `29` (HR198); kill nonzero **60/137, max 51** (clean) and **114/137, max 444** (HR198); `vol_only` (size>0 ∧ kill==0) = **15 / 1** at the editor alignment, **27 / 15** at `24226/24774` |

Slot segmentation follows from (2)+(3)+(6): `0..70` large (71) → `71..111` small (41) →
`112..134` large (23) → `135..136` small (2) = **137 = 94 large + 43 small**.

---

## 1. Before / after

| # | claim | old text (as committed) | new text | evidence |
|---|---|---|---|---|
| 1 | size of the editor name list | "`MonsterForm.cs` 名单 **93 行**；两者逐条一一对应（§12 映射表）" (§1 table) | "`monsters.json`：`class=0` **75** + `class=2` **18** = 93；这是**怪物数**，不是槽位数", plus a new row "存档怪物槽 … **137** … `MonsterForm.cs:179` `new string[137]` + `:196` 单循环 137" | source (§0.1) |
| 2 | slot space | (absent — the page only knew "93 large monsters", "36 small monsters", "135 slots" in §13.3/§13.6) | two new rows: "其中 大怪槽 **94**" (0..70 = 71, 112..134 = 23) and "其中 小怪槽 **43**" (71..111 = 41, 135..136 = 2) | static table: 94 / 43 (§0.2) |
| 3 | what "编辑器名" means | "文中的「编辑器名」特指 `MonsterForm.cs` **93 行名单**里的写法（与 wiki 略有差异…）" | "…的 **137 行名单（槽 0..136）** 里的写法，与 chS 表名、wiki 标题都可能有出入 … **身份一律以 `emid` 为准**" | 25 large + 15 small name deltas measured in §12 |
| 4 | how the list is ordered | "`MonsterForm` 的 **93 行**采用族谱式顺序 …；且 MHX 原有怪物在前（i=0..70），MHXX 回归/新增怪物集中在尾部（**i=71..92**）" | "137 行按**槽号原序**排列，分四段：`0..70` 大怪（…族谱式…）、`71..111` 小怪、`112..134` 大怪（MHXX 回归怪 + XX 新二名/特殊个体，尾部 133/134 是阁螳螂两形态）、`135..136` 小怪" | array indices 70/71/111/112/134/135 |
| 5 | 黑龙's slot | "### 3.6 参考表：黑龙（**i=76**，DB 13 …）" | "（**槽 117**，DB 13 …）" | static table row 117 = emid 13 |
| 6 | 天慧龙's slot | "### 3.7 参考表：天慧龙（**i=91**，DB 86 …）" | "（**槽 132**，DB 86 …）" | static table row 132 = emid 86 |
| 7 | 阁螳螂's slot | "### 3.8 参考表：阁螳螂（**i=92**，DB 88 …）" | "（**槽 134**，DB 88 …）" | static table row 134 = emid 88 |
| 8 | 轰龙 / 雌火龙 slot labels | "（i=27 …）", "（i=0 …）" | "（槽 27 …）", "（槽 0 …）" — numbers unchanged, only the label (`i` had two meanings in the page) | static table rows 27 / 0 |
| 9 | deviant list slots | "名单（编辑器 i） … 鏖魔角龙(**74**)、铠裂镰蟹(**79**)、胧隐夜鸟(**87**)、青电主电龙(**88**)、天眼泡狐龙(**89**)、银岭巨兽(**90**)" | "名单（**槽号**） … 鏖魔角龙(**115**)、铠裂镰蟹(**120**)、胧隐夜鸟(**128**)、青电主雷龙(**129**)、天眼泡狐龙(**130**)、银岭巨兽(**131**)"; the other twelve unchanged (2/5/16/18/28/32/37/45/48/50/55/65) | all 18 `class=2` emids located in the 137 map; 0 errors |
| 10 | Ahtal-Ka slots | "存档计数**只有 1 槽（i=92）**" | "存档侧给它们**两个相邻槽**：槽 133 = `阁螳螂(机偶)`（emid 87）、槽 134 = `阁螳螂`（emid 88），两槽共用同一资源 `roEm087.cro`。实测：现有 8 个 `.hnt` 里 `kill[134]` 有值（HR198 档 = 6）、`kill[133]` 恒 0" | array + resource table + saves |
| 11 | do small monsters get counted? | "用途差异：小型怪**不参与「怪物统计」计数**（§13），也不进捕获/尺寸表" | "小型怪**有自己的击杀槽**（71..111、135..136，计数真实，§13.3），但**不参与捕获与尺寸表**（…捕获与尺寸记录全 0）" | clean save `kill[71..111]` = `10,8,28,1,10,21,4,39,10,13,…`; capture/size zero for those slots |
| 12 | §12 anchor | "## 12. **93 条大型怪物** ↔ 编辑器槽位 ↔ 机读库 id 映射表"; "`i` = `MonsterForm` 的 0-based 行号（**在 H1 假设下即存档槽号**；若为「无表头」读法则全表差 2…）" | "## 12. **137 个怪物槽** ↔ 编辑器名单 ↔ 机读库 id 映射表"; "`槽` = 存档数组下标 … **编辑器行号 = 槽号**，0..136，没有偏移，也没有「只收大怪的 93 行子集」"; table split into 12.1 (0..70), 12.2 (71..111), 12.3 (112..134), 12.4 (135..136); the two large-monster tables carry `槽 / M（C# 行号）/ 编辑器名 / emid / base_hp / 种类 / 备注`, the two small-monster tables carry `槽 / M / 编辑器名 / emid / 资源（.cro）/ monsters.json / 备注` | 137 rows generated from array + static table + JSON; row-level self-check 0 mismatches |
| 13 | §12 mapping rows | 93 rows, `i` 0..92, e.g. "`71` 岩龙 飞龙种 4 3400 MHXX 回归怪", "`91` 天慧龙 86 4800", "`92` 阁螳螂 88 4900 与「阁螳螂·机甲」同槽" | 137 rows; `112` 岩龙, `132` 天慧龙, `134` 阁螳螂, `133` 阁螳螂(机偶) (no DB row), `135` 大雷光虫, `136` 小桃毛兽; small block carries `emid` + `.cro` + "has DB row?" | static table + resource table |
| 14 | editor read points | "击杀: 24230 + 2*i (**i = 0..92**)" and "三个读点都等于「块首 + 4」… 24230 + 71*2 = 24372、24504 + 71*2 = 24646、24778 + 71*4 = 25062（第二段锚点）" | "（i = 0..136，**i 就是槽号**）"; "`24230 (0x5EA6)` 就是击杀数组的**块首**，不是「块首 + 4」：`0x5EA2..0x5EA5` 那 4 B 属成员#4 尾部 … `24230 + 137*2 = 24504`、`24504 + 137*2 = 24778`、`24778 + 137*4 = 25326 = 0x62EE`（= 装备箱起点）" | `DEVELOP.md` 2026-10-23 定案 + tiling closes at the box start |
| 15 | what the 137 slots are | "### 13.2 槽号 ↔ 怪物：**93 行名单**的覆盖情况 … 编辑器**够不到的是槽 93..134（42 槽）** … **槽 93**：… 现在**无名字、不可达** … **槽 94..134（41 槽）**：一直无名字" | "### 13.2 槽号 ↔ 怪物：**137 槽全覆盖** … 槽 91/92 分别 = `羚鹿`/`飞甲虫`（都是小怪），**没有空洞** … 历史提法「槽 93..134 未知」**作废**：槽 93 = `甲虫`(4123)、槽 112 = `岩龙`(4)、槽 132 = `天慧龙`(86)、槽 134 = `阁螳螂`(88)" | array + static table |
| 16 | counter capacity | "### 13.3 容量：**137 还是 135**？… | A. 无表头 137 槽 | … 尺寸块 `552 ≠ 137 × 4 = 548` … | B. 4 B 表头 + 135 槽 | `274 = 4 + 135 × 2`…" + the two "硬事实" (41 contiguous nonzero counters, 62/137, max 45) | "### 13.3 容量定案：**137 × u16 × 2 + 137 × 4，三块均无表头**", with the closing sum, the superseded B reading, and a 4-row data table (capture only in large slots / small-slot kill counts / 60·114 nonzero, max 51·444 / `vol_only` 15·1 vs 27·15) | tiling + saves (§0.6) |
| 17 | §13.4 candidates | "### 13.4 候选解释与判定实验（**未定论**）" with H1/H2/H3 and T1–T4, ending "**93 行名字覆盖 0..92 是可信的 …；槽 93..134 身份未知；「+4」是否意味着跳过 2 槽尚未定论**" | "### 13.4 分段是怎么定下来的（**三重独立验证**）" — static table / resource table / capture invariant — plus "单事件标定" kept as a *re-check*, plus three residual questions (133 accumulation, identity of 4196..4202, size-vs-kill co-write) | §0.2, §0.3, §0.6 |
| 18 | speed-lookup answers | "击杀/捕获各 **135**（`274 = 4 + 135×2`）；尺寸 **137** 条（`552 = 4 + 137×4`）"; "`i = 0..92`"; "槽 92 是谁？ 阁螳螂"; "槽 93..134 是谁？ **未知**"; "93 行名单是否覆盖全部大型怪？ 是：93 行 ↔ 93 只" | "**137**：击杀/捕获各 `274 = 137×2`，尺寸 `548 = 137×4`"; "`i = 0..136`"; "槽 92 = `飞甲虫`(4122)"; "槽 133/134 = `阁螳螂(机偶)`/`阁螳螂`"; "94 个大怪槽 = 93 只 + 机偶"; "小怪槽 = 43" | as above |
| 19 | data model | "`i: u8 // 0..92 存档槽号（本文 §12 的 i）`" | "`i: u8 // 0..136 槽号 = MonsterForm 行号 = 存档数组下标（§12 的「槽」）`" | source |
| 20 | open items | "U1 计数器数组容量 `[未确认]`"; "U2 编辑器 `+4` 是否跳过 2 槽 `[未确认]`"; "U3 槽 93..134 的身份 **未知**"; "U4 槽 92…归属 代码已修" | U1–U4 marked **已定案** with the answer in place (137/137/137; no +4; 93..111 small / 112..134 large; slot 92 = 飞甲虫); U5–U20 untouched, numbering preserved | §0 |

---

## 2. What was deliberately not touched

* §2–§8 (HP / hitzones / durability / status / items / state switching) — the wiki-vs-JSON numbers were
  re-checked by W6 (`W6-MONSTERS.md` §5.4) and are unrelated to the slot arithmetic.
* The §1 species distribution (94 wiki entries, 93 huntable) and every `monsters.json` / `monster_damage`
  / `monster_status` count: those are monster counts, not slot counts, and they are correct.
* §3.4 (slot 27) and §3.5 (slot 0): the numbers happened to be right, only the label changed (`i` → `槽`).
* §13.5 and U5–U20: untouched, so external references ("§15 U5", "§2") still resolve.
* Nothing outside `docs/mechanics/monsters.md` was edited. In particular `coverage-map.md` is left as is —
  see §5.1 for the one sentence in it that disagrees with the two JSON maps.

---

## 3. Verification

### 3.1 The four §12 tables are machine-checked against three sources

`M` = the C# source line, `emid` = static table, name = array literal:

```
[1] MonsterForm array entries 137; idx71=草食龙 idx92=飞甲虫 idx112=岩龙 idx133=阁螳螂(机偶) idx134=阁螳螂 idx135=大雷光虫 idx136=小桃毛兽
[1] loop: for i<137 present ; name=array[i]: yes
[2] static 0x1597EA4: rows 137 slot==idx 137/137 big 94 small 43 distinctEmid 137
[2] pair#138 = 77c9/30666
[3] cro table: 137 names, 87 distinct, k70=roEm085.cro k112=roEm004.cro k133=roEm087.cro k134=roEm087.cro k135=roEms017.cro k136=roEms022.cro roEms100 count=7
[4] monster-slot-map-137.json: rows 137, slot+emid equal to static table 137/137
[5] monsters.json rows 129 classes {"0":75,"1":36,"2":18}; big ids 93; big ids missing from slots [] slots-big not in db [87]
[5] emids 4196..4202 in db: 0 of 7
[6] 8 saves: small-slot capture nonzero 0; small-slot size records 0
[6] kill133/134 A=0/0 B=0/6; kill106 A=5 B=29
[6] kill nonzero A=60 max=51 B=114 max=444
[7] doc tables: rows 137 big 94 small 43 mismatches 0
```

Line `[7]` is the gate on the artefact itself: every one of the 137 rows in the rewritten §12 is compared
back to the array literal, the static table and the JSON — **0 mismatches**. `[2] … [5]` are the sources
the rows were generated from, `[6]` is the data check behind §13.3.

### 3.2 Slot-dependent prose

| claim in the rewritten page | check | result |
|---|---|---|
| deviant list: 18 slots, 12 unchanged + 6 moved | every listed slot's `emid` is `class=2` in `monsters.json`, and each listed name exists in the array | 18/18, 0 errors |
| "槽 58 = emid 69 = Seltas Queen, 槽 61 = emid 76 = Seltas" | `monsters.json` 69 = Seltas Queen (hp 5200), 76 = Seltas (hp 2000); resource table 58 = `roEm069.cro`, 61 = `roEm076.cro` | confirmed |
| "槽 133/134 共用 `roEm087.cro`" | resource table `k=133` and `k=134` both `roEm087.cro` | confirmed |
| "`roEms100.cro` ×7 at slots 105..111" | name histogram: `roEms100.cro` count 7, indices 105..111 | confirmed |
| "小怪段 15 处名字与 chS 不同，其中 8 处是不同物种" | set difference of array names vs `monster-slot-map-137.json.cn` over 71..111, 135..136 | 15 / 8 |
| "137 槽 − 129 行 = 8 槽无库行（133 + 4196..4202）" | 1 + 7 | confirmed |

### 3.3 Markdown shape

Only one table in the file has a cell-count anomaly — the `许可等级` row of §9 (§9's table, line 378),
which is missing its trailing pipe. It is **pre-existing** (identical in the pre-edit copy) and renders
correctly under GFM, so it was left alone rather than turned into an unrelated edit.

---

## 4. Gate

```
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 34 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): …
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

---

## 5. Difficulties

1. **The editor's own name list is wrong in two places, and one sibling document agrees with the wrong
   labelling.** The array says slot 58 = `徹甲虫` and slot 61 = `重甲虫`, but the static table gives
   58 → emid 69 (Seltas Queen, chS `重甲虫`, hp 5200) and 61 → emid 76 (Seltas, chS `穿甲虫`, hp 2000),
   and the resource table gives 58 → `roEm069.cro` / 61 → `roEm076.cro`. So the array's two Chinese
   labels are swapped against the engine. Both JSON maps are correct; `coverage-map.md`'s
   "连带修正" sentence ("58 = 徹甲虫 Seltas Queen(69)、61 = 重甲虫 Seltas(76)") **mixes the Chinese
   labels the other way** — it pairs `徹甲虫` with Seltas Queen. The rewritten §12 states the swap, cites
   the JSON/static/`.cro` evidence, and says "两行名字对调即与静态表一致". Fixing the C# array (a
   gitignored build input) and that one sentence in `coverage-map.md` is out of this ticket's scope; both
   are recorded here.

2. **Fifteen small-monster names in the array do not match the chS table, and eight of them name a
   different creature** (slot 76 `爬虫` = Vespoid `巨蜂`, 85 `雪鹿` = Giaprey `白速龙`, 86 `羚羊` = Anteka
   `雪鹿`, 88 `盾虫` = Hermitaur `盾蟹`, 89 `镰虫` = Ceanataur `镰蟹`, 90 `小雪狮` = Blango `雪狮子`,
   91 `羚鹿` = Rhenoplos `硬甲龙`, 101 `卷贝兽` = Konchu `盾虫`). They look like a translated list that
   drifted, not a systematic offset: the `emid` values themselves are contiguous and sane
   (4097..4144 sparse). The page therefore states that identity is decided by `emid`/`.cro` and the
   editor name is only a label — anything else would put wrong names on real counters.

3. **`DEVELOP.md`'s clean-save calibre ("62/137 非零, u16 max = 45") does not reproduce from
   `save-snapshots/`.** The four hunters' current files give 60/51 (clean HR5) and 114/444 (HR198); the
   `DEVELOP.md` numbers must come from an earlier clean save that is no longer in the tree, and its first
   bytes (`02 00 00 00 00 00 02 00`) do not match any current file either. Rather than repeat a number I
   cannot reproduce, §13.3 quotes the measured values and notes where the older calibre came from. This
   is also why the old §13.3 "41 个连续非零小计数器（值 6,10,5,11,…）" list was dropped: those values
   appear in no current save, and the measured small-block run is `10,8,28,1,10,21,4,39,10,13,…`.

4. **Two alignment conventions for the counter arrays still circulate.** `quests.md` (per `W6-MONSTERS.md`
   §5.3) and the old §13.1/§13.3 of this page used `0x5EA2`/`24226`; `DEVELOP.md`, `coverage-map.md` and
   the editor use `0x5EA6`/`24230`. The page now uses `0x5EA6` and shows the closing sum
   (`24230 + 274 + 274 + 548 = 25326 = 0x62EE`, the equipment-box start) plus the `vol_only` comparison
   (15/1 against 27/15). The `quests.md` sentence is outside this ticket and is left for its own fix pass.

5. **Slot 133 cannot be settled from data alone.** It exists in the static table (emid 87) and the
   resource table (`roEm087.cro`, shared with 134), and the editor names it `阁螳螂(机偶)`, but no current
   save has ever written `kill[133]` (3 distinct contents × their duplicates, all 0) while `kill[134] = 6` in the HR198 save.
   The page says exactly that instead of claiming a single slot (as it did before) or claiming both slots
   are used.

6. **The seven unnamed small slots (emid 4196..4202) are real counters with no name anywhere.** They all
   map to `roEms100.cro`, are absent from `monsters.json`, and have no chS entry — yet slot 106 is 5 in
   the clean save and 29 in the HR198 save. The §12 table lists them with their numbers and marks the
   name as unavailable; there is nothing else to put there, and inventing a name would have been the
   easiest way to make the table look complete.
