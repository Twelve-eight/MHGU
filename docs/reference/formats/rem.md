# `rem` (quest reward table) — format spec

Source files: `romfs/nativeNX/loc/arc/quest/q<7-digit quest id>.arc` → member `quest\rem\rem_XXXXXX`, type hash `0x5b3c302d`, zlib-compressed inside the arc, **184 B uncompressed**. Extract with
`node tools/mhgu/arc.mjs extract <arc> <outdir> "rem_"`; decode with
`node tools/mhgu/rem.mjs arc <questArc>`.

`rem` is the per-quest reward table the result screen rolls. It is *linked*, not embedded: the quest's
`questLink` member names 5 rem resources and the loader pulls them by name. Byte evidence below is from
quests 101 / 11413 / 11460, cross-checked entry-for-entry against `docs/data/mhgu.db` `quest_rewards`.

Evidence tags: [C] = bytes + db agree; [B] = bytes read, semantics inferred from shape; [U] = unknown.

## Where the resource lives

| Object | Path / value | Evidence |
|---|---|---|
| Quest arc | `<romfs>/nativeNX/loc/arc/quest/q<id>.arc` (one per quest, e.g. `q0000101.arc` = 36,305 B, 18 entries) | [B] |
| Rem member | `quest\rem\rem_XXXXXX` | [B] |
| Type hash | `0x5b3c302d` | [B] |
| Uncompressed size | **184 B**, always (compressed 16-63 B in the sampled arcs) | [B] |
| Placeholder | `rem_000000` = 184 zero bytes (empty table) | [B] |
| Village text twin | `loc/arc/quest/vq.arc` (1,424,521 B, 3,904 entries) = **488 village quests × 8 `questData` members** (7 languages + `loc\quest\questData\questData_<id>`), text only — it carries **no** rem/setEmMain members. Village rewards come from the per-quest `q<id>.arc` too | [B] entries 0-25 read |

Other resource types in the same arc (all verified by hash + payload):

| Type | Hash | Notes (slot count = qdl fields; the arc stores only non-empty ones) |
|---|---|---|
| setEmMain (boss spawn) | `0x2553701d` | 5 qdl slots, `{u32 area, f32 angle, x, y, z}` |
| emSetList (small monster set) | `0x32ca92f8` | 3 qdl slots |
| **rem (reward)** | **`0x5b3c302d`** | 5 qdl slots (2 main + 2 add + 1 sub) |
| supp (supplies) | `0x54539aee` | 1 slot, 168 B |
| questPlus | `0x26bec21c` | 1 slot, 25 B |
| questLink | `0x00e0bb1c` | 1 slot, 308 B |
| GMD text | `0x242bb29a` | 7 slots (eng/fre/ger/ita/spa/chT/chS) |
| questData | `0x1bbfd18e` | 1 slot, 369 B |
| hagi (carve, enemy arcs) | `0x33a84e14` | see "Adjacent resource" |

Anchor for tooling: v1.4.0 loads `questLink` from arc entry `[count-9]` and `questData` from `[count-1]`
(port tool `quest4u.py` header, checked on real quests). For `q0000101.arc` (18 entries) that is index 9
and 17 — byte-verified: entry 9 = `loc\quest\questLink\questLink_0000101`, entry 17 =
`loc\quest\questData\questData_0000101`.

## Slot order (`questLink` → rem)

`questLink_<id>.qdl` = 8 B header (`00 00 4B 43`, count = 1) + 15 × 20 B `{u32 typeHash; char[16] name}`.
Entry `i` starts at `8 + 20*i`. Rem slots [B on 101 and 11413]:

| qdl index | Field | Reward row |
|---|---|---|
| 8 | `RemMain[0]` | **A** |
| 9 | `RemMain[1]` | **B** |
| 10 | `RemAdd[0]` | **C** |
| 11 | `RemAdd[1]` | D / Repel table |
| 12 | `RemSub` | subquest row (often the same file as A) |

Indices 0-4 = `BossSet[5]`, 5-7 = `EmSetList[3]`, 13 = `Supp`, 14 = `Plus`; unused slots are
`rem_000000` / `b_m00em000_00` / `z_m00d_000` / `0000`.

Example, `questLink_0000101.qdl`: `rem_210052`, `rem_210001`, `rem_000000`, `rem_000000`, `rem_210051`.
Example, `questLink_0011413.qdl`: `rem_130240`, `rem_230088`, `rem_530072`, `rem_230091`, `rem_130240`.

## File layout (184 B, `#pragma pack(1)`)

| Offset | Type | Value / meaning |
|---|---|---|
| 0x00 | f32 | **1.0** (`00 00 80 3F`) — version. Note that `.ext`/`.qdl` use a u32 magic instead, so rem is a different container class [B] |
| 0x04 | u32 | **1** in all 11 decoded files, meaning [U] |
| 0x08 | 8 × `{u8 condition, u8 entries}` | group table, 16 B. Unused group = `{0, 0}` [B] |
| 0x18 | `entries` × `{u16 itemId, u8 count, u8 chance}` | one group's entries, 4 B each, in group-table order |
| — | `{00 00 00 FF}` | **terminator after every non-empty group** (item 0, count 0, chance 0xFF) [B] |
| — | zero fill | rest of the 184 B is 0 |

Parsing rule (what `rem.mjs` does): cursor = `0x18`; for each of the 8 groups with `entries > 0`, read
`entries` records, then require the terminator `00 00 00 FF`. Capacity is 8 groups / 40 entries
(160 B) in theory; observed maxima are 2 groups and 12 entries.

Field ranges observed: `itemId` 221-2151 (< item table's 2,991), `count` 1-11, `chance` 2-100. Each group's
chances sum to **exactly 100** in all 11 files.

## Condition codes

| Code | Meaning | Evidence |
|---|---|---|
| 0 | unused group | [B] |
| 1 | plain reward row — used by A, B, C's first group and Sub tables | [B] |
| 2 | plain reward row too: the only group of B in quest 101 (11 entries) and quest 11460 (17 entries), both matching db `B` exactly. How the game treats 2 differently from 1 is [U] | [B] |
| 3 | C row; **two groups may share code 3** (they are the db's `C` and `C 2`) | [B] |
| 4 | second A table (db `A 2`); the Sub row repeats the same file, so A ∪ A2 = db `Sub` | [B] |
| 5 | Repel table (db `Repel`, e.g. quest 11413/11460 Kushala) | [B] |

The full enum (are 2/6/7 used?) and the semantic names of 3/4/5 are [U]; the column names above come from
`quest_rewards.reward_slot`. Groups with the same code are distinguished by **order**, so a decoder must
keep group order.

## Cross-check vs `mhgu.db.quest_rewards` (3 quests) [C]

| Quest | rem | Decoded | db |
|---|---|---|---|
| 101 (Village 1★ "Find the Ferns") | `rem_210052` A | 272@15/3, 273@15/2, 275@20/2, 277@20/2, 278@15/3, 281@15/2 | same 6 rows (= db `A` minus its 272@100/3) |
| | `rem_210001` B | 271@10, 292@15, 293@8, 277@8, 302@8, 272@14, 385@8, 320@5, 221@8, 222@8, 223@8 (11) | 11/11 exact |
| | `rem_210051` Sub | 292@34/3, 296@20/2, 296@8/3, 295@10/2, 295@8/3, 293@20/2 | 6/6 exact |
| 11413 (G4 Hub) | `rem_130240` A | group 1 (10 entries) = db `A`; group 4 (7 entries) = db `A 2` | 17/17 exact |
| | `rem_230088` B | 444@8, 443@12, 419@10, 419@5/2, 351@6/2, 352@10, 352@5/2, 355@10/2, 356@8, 343@12, 344@8, 358@6 | 12/12 exact |
| | `rem_530072` C | group 1 = 1778@100/2 (`C`); group 2 = 2151@50/10, 2151@30/9, 2151@20/11 (`C 2`) | 4/4 exact |
| | `rem_230091` D | 1541@12/2, 1545@17, 1548@12, 1552@8, 419@16/2, 444@20, 443@13/2, 1553@2 | 8/8 = db `Repel` |
| 11460 (G4 Hub) | `rem_131860` A | group 1 (9) = db `A`, group 4 (7) = db `A 2` | 16/16 exact |
| | `rem_230100` D | 1693@12, 1691@14, 1695@8, 1697@13, 1699@8, 1701@13, 1703@3, 1702@4, 1705@25/2 | 9/9 = db `Repel` |

**Systematic delta**: the db's `A` and `B` rows each carry one extra `percentage = 100` row that the rem
does **not** contain (101: 272@100/3; 11413: 1538@100/1 in A, 444@100/1 in B; 11460: 1693@100/1 in A).
Without it each table sums to 100 exactly, so that row is a guaranteed/"basic" reward granted from outside
rem [C-negative on presence, I on origin]. A 100 % entry that *is* inside rem (11413 `C`: 1778@100/2) is an
ordinary group entry, so do not "fix" 100 % rows by rule.

## Consumers

`main` loads the quest arc at quest start and keeps 4 reward tables + the sub table; the class strings are
`mRewardTable[0]` @0x156146d / `mRewardTable[2]` @0x156148d / `mRewardPoint[2]` @0x156144d and the resource
paths are `quest\rem\`, `quest\boss\setEmMain\`, `quest\zako\emSetList\`, `quest\supp\`, `quest\plus\questPlus_`,
`loc\quest\questLink\questLink_%07d`, `loc\quest\questData\questData_%07d` (name pool 0x155c9f3+; ownership
function 0x362438, `.tmp/mhgu/inventory/functions.csv:6548`). [P]

## Adjacent resource: `hagi` (per-monster carve tables)

Same idea, per monster instead of per quest: `arc/enemy/emNNN_XX.arc` → `enemy\hagi\hagi_s0..s4_emNNN_XX`,
type hash `0x33a84e14`, **346 B** uncompressed (zlib in-arc; 41-88 B compressed). em001 = Rathian,
em002 = Rathalos. Extract with `arc.mjs ... "^enemy.hagi"`; decode with `node tools/mhgu/rem.mjs hagi <file>`
(or `hagi-arc <enemy.arc>` for all five).

| Offset | Type | Meaning |
|---|---|---|
| 0x00 | 26 B | header [U]. Byte 0 = `0x03` in all sampled files; bytes 1-5 = `01 12 14 <n> 00` (`n`: s0 0x13, s1 0x1b, s2 0x1e, s3 0x12, s4 0x1d); 0x06..0x19 is mostly `0xFF` with 1-2 small bytes (06 / 0b / 0d / 02 / 04) |
| 0x1A | `{u8 chance, u8 count, u16 itemId}` | 4 B entries; 80 slots fit (26 + 80×4 = 346) |
| — | `FF FF 00 00` | closes a table; the same 4 bytes repeat to EOF as padding |

Table order inside a rank file is **Body Carve → Tail Carve → Shiny → (Insect Gather Back)**, but
**absent tables are omitted**, so the position is *not* a fixed semantic per index: Gammoth (`em083`)
has only two tables per rank and its `tables[1]` matches db `Shiny` (no tail table at all), while
Zinogre (`em057`) has four, the 4th being `Insect Gather Back` (s1 90/10, s2 and s4 82/10/8). Read the
tables as an ordered subsequence, not by index. [C]

Verified scope (fingerprint `length : Σchance : Σitem : Σ(item×chance)` computed from the decoded JSON
and from `hunting_rewards`, all equal): the 10 flagships — em001/002/032/037/057/063/080/081/082 at 9/9
tables each, em083 at 6/6 (no tail) — **87 carve/tail/shiny tables + 3 gather tables**. [C]

### Rank mapping (em002/Rathalos) [C]

`s1` = **LR**, `s2` = **HR**, `s4` = **G**; all 9 tables are byte-exact against `hunting_rewards`
(rows listed in file order):

| | Body Carve | Tail Carve | Shiny |
|---|---|---|---|
| LR (`s1`) | 1202@40, 1205@28, 1208@19, 460@8, 1234@5 | 1211@70, 1202@20, 1234@7, 1213@3 | 2128@74, 1202@24, 1213@2 |
| HR (`s2`) | 1203@38, 1206@29, 1209@13, 461@15, 1235@5 | 1203@18, 1202@7, 1211@56, 1235@8, 1214@3, 1213@8 | 2128@38, 2129@37, 1203@23, 1214@2 |
| G (`s4`) | 1204@38, 1207@29, 1210@13, 462@15, 1235@5 | 1204@12, 1203@4, 1212@70, 1235@3, 1215@3, 1214@8 | 2129@75, 1204@23, 1215@2 |

The file and the db list the rows in different orders — compare as sets. 2128 / 2129 = Wyvern Tear /
Large Wyvern Tear. Every table sums to 100.

### Not in hagi

`Capture`, `Break *` and `Meowster Hunter` rows exist in `hunting_rewards` (Rathalos LR Capture =
1205@42, 1208@29, 1211@19, 1234@8, 1213@2) but **no table in `hagi_s0..s4` reproduces them**; these files
carry only the three carve/drop tables above. Their carrier is still unlocated [U].

`s3` = three 1-entry tables, all `1716` (First-aid Med) @100 % — supply-like, meaning [U].
`s0` = one 4-entry table matching no db row: Rathian 1172@35, 1175@28, 460@17, 409@20; Rathalos
1202@35, 1205@25, 460@20, 409@20 (409 = Monster Bone L) — an additional low-tier set, meaning [U].

## Pitfalls

- The payload is **zlib** inside the arc even though the size field says 184/346: read `size & 0x1fffffff`
  for the uncompressed length, `cmpsize` for the stored length, `0x40000000` is set on every entry sampled.
- `rem_000000` (the empty slot) is 184 zero bytes — a decoder must not read its group table as "version 0".
- Groups with the same condition code exist; do not key a map by condition alone.
- Terminator `{0, 0, 0xFF}` is inside every non-empty group, so entry count from the group table must be
  consumed exactly before comparing it.
- Do not take the db's extra 100 % `A`/`B` rows as rem data (see delta above), and do not assume `D` is a
  fourth generic row: in both G4 quests decoded it is the `Repel` table.
- `questLink` is also present among the loose files (`loc/quest/questLink/questLink_%07d`), and the copy
  inside the quest arc is byte-identical for the sampled ids — either can be used to resolve rem names.

## Unknown

1. `u32 @0x04` (always 1) and `f32 @0x00` are constant in 11 files; no file with another value was found, so
   the check for "version mismatch" is unproven.
2. Full `condition` enum, and why two plain rows are coded 1 vs 2 (B is 1 on quest 11413 but 2 on 101/11460); 6 / 7 unobserved.
3. Whether event/DLC quests exceed 8 groups / 40 entries or carry chances above 100.
4. hagi header layout, `s0`/`s3` meaning, and the carrier of the `Capture` / `Break` / `Meowster Hunter`
   tables (they are not in `hagi_s0..s4`).
