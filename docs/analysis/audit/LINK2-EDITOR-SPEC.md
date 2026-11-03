# Harvested from the agent's local:// report on 2026-11-04; the agent's write device refused working-tree paths.

# LINK2 — Editor-spec audit (docs/editor-spec/*.md)

Auditor: LINK2-EDITOR-SPEC. Scope: 01-container-header.md, 02-items-equipment.md, 03-quests-monsters-palico.md
against the two save snapshots and docs/save-layout/coverage-map.md, plus every `file.md:NNN` citation.
Read-only on the repo. Report written to local:// per the parent instruction; copy to
docs/analysis/audit/LINK2-EDITOR-SPEC.md.

Gate first (tail):

```
$ node tools/audit/check.mjs
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans
ALL PASS
Wall time: 2.62 seconds
```

The gate passes; it does not check citation content, so every finding below is outside its coverage.

Overall verdict: the byte-level field tables are largely correct (BOX/POUCH/EQ/CATBOX/EQSET/ITSET and the quest/monster/palico fields decode as documented), but two never-write ranges are too small, EQ-10/EQ-11 zero a real byte, the medal mirror rule is not supported by a second clean slot, and citation line numbers have drifted widely. The ranked table below is the acceptance artifact.

**Ranked findings** (safety first)

| # | Rule | file:line | Claim in the spec | Check run | Result | Verdict |
|---|---|---|---|---|---|---|
| 1 | MN-07 | 02:160 | preset/undecoded block at `0x21E0E` extends only to `0x22612` | `equipment.md:400` + byte count `G:/tmp/LINK2/decode2.mjs` | the following block is 2064 B, so 0x21E0E..0x2261D; the rule omits 0x22613..0x2261D (11 B, 5/1 nonzero in clean slot0/slot1) | CONTRADICTION — never-write range too small |
| 2 | item 9 | 03:235-236 | 3444 B block `0x50BA..0x5E2D` | `coverage-map.md:330`, `member4-semantics.md:195`, `member4-file-layout.txt:128` | current block is `0x50BE..0x5E32`; the rule omits 0x5E2E..0x5E31 (4 B) and over-protects 0x50BA..0x50BD | CONTRADICTION/STALE — never-write range too small |
| 3 | EQ-10/EQ-11 | 02:82-83 | record `+12..+35` "must be 0" and is zeroed on write for armor/non-glaive weapons | `G:/tmp/LINK2/equip.mjs` byte dump | clean slot1 and V6 slot1 record 22 (type 11) have `+12 = 0x04`; record hex `0b000b0000000000000000000400…` | CONTRADICTION — zeroing erases a real byte |
| 4 | MN-08 vs F | 02:161 vs 03:140-141 | 02: "NEVER write `0x2EFF..0x3FEF`"; 03: medals at `0x3157`/`0x316B` are writable RMW fields | arithmetic overlap + `G:/tmp/LINK2/medal.mjs` | 0x3157/0x316B lie inside 0x2EFF..0x3FEF; an editor implementing both must either refuse the medal feature or violate 02's blanket rule; the span is not wholly "unidentified" — 03 decodes several fields inside it | CONTRADICTION — cross-spec write conflict |
| 5 | F/I9 | 03:135-136, 141, 182 | "clean sample both byte-identical", medal A/B are a mirror pair | `G:/tmp/LINK2/medal.mjs` | clean slot1 A==B (12 bits), but clean slot0 A=54/B=33 with B⊂A (21 A-only bits); all four slots satisfy B⊆A, none require A==B | CONTRADICTION — mirror rule can clear/copy legitimate bits |
| 6 | Gap 11 | 01:156 | layout table is off by 4 B "after 0x3157", which moves quest bitmap offsets; cites HANDOFF.md:188 | `coverage-map.md:411-413`, `HANDOFF.md:217`, quest popcounts | drift is localized at 0x5057; quest bitmaps 0x2C77 are before it and decode with 0 `cleared⊄seen` violations; HANDOFF:188 is a code fence, the resolved issue is 217 | STALE + unsafe warning |
| 7 | item 4 | 03:216-218 | persisted A/B slots at `0x505F`/`0x506B`; `0x5077` = obj+0x3614 | `member4-file-layout.txt:115-118`, `member4-semantics.md:138-139` | current A=0x5063, B=0x506F, obj+0x3614=0x507B; the three cited file offsets are 4 B early and 0x506B lies inside slot A | CONTRADICTION — wrong file coordinates |
| 8 | G-07 | 02:181 vs 02:199 | G-07: no documented way to derive slot starts, hard-code them; Resolution: derive from header 0x34/0x38/0x3C+0x24, do not hard-code | `G:/tmp/LINK2/bytes.mjs` header dump | both samples: 0x18CC78/0x2AC53C/0x3CBE00, +0x24 = hunterAdds; the two statements contradict each other | CONTRADICTION (internal) |
| 9 | G18 | 03:278 | 4 B drift between 0x3157 and 0x5EA2 "not localized" | `coverage-map.md:411-413`, `HANDOFF.md:217` | drift localized at 0x5057 (rows 107..134 +4) | STALE |
| 10 | G-10 | 02:184 | `coverage-map.md:30` still writes 0x208CE..0x21E03 / 5430 B | `coverage-map.md:40` | current row is 5440 B and explicitly marks 0x21E03/5430 as superseded; line 30 is the 0x3EF7 row | STALE + wrong citation |
| 11 | G17 | 03:277 | coverage-map still carries 93+36+8; CURRENT-RULING:83-85 says 94 large 0..92 / 43 small 93..128 + 8 reserved | `coverage-map.md:42`, `CURRENT-RULING.md:83` | coverage-map line 42 marks the old row struck/superseded; CURRENT-RULING 83 says 0..70+112..134=94 large and 71..111+135..136=43 small, no reserved | STALE |
| 12 | MN-08/G-05 | 02:161, 179 | span `0x2EFF..0x3FEF` has 577 nonzero bytes "in all"/"overall" | `G:/tmp/LINK2/decode2.mjs` | clean slot1 = 577 (58 gap + 519 block), clean slot0 = 1631 (91+1540), V6 slot0 = 1632, V6 slot1 = 680; coverage-map:115 assigns 577 to the 4080 B block but the 577 includes the 256 B gap | CONTRADICTION — evidence is slot1-only and mis-attributed |
| 13 | MN-01 | 02:154 | "182 0xFF bytes in 0x4447..0x4598 where the clean save has zeros" | `G:/tmp/LINK2/decode2.mjs` | dirty slot0 182 FF, but clean slot0 (same hunter) has 28 FF and clean slot1 has 0 | CONTRADICTION — baseline not zero |
| 14 | I1 | 03:145-146 | "the dirty sample's 122 contradictory bits" | `G:/tmp/LINK2/quest.mjs` | dirty file = 501 (slot0 122 + slot1 379); `contradictory-bits-verdict.md:5,26` says 501 and explains 122 is slot0 only | STALE — understates repair scope |
| 15 | Gap 1 | 01:146 | slot-table values unpublished; implementation cannot reconstruct origins | `G:/tmp/LINK2/bytes.mjs`, 02:199 | values are 0x18CC78/0x2AC53C/0x3CBE00 in both samples; 02 publishes the resolution | STALE |
| 16 | M7 | 01:135 | skill arts `0xD24`(19 B)/`0xD3C`(7 B), bitmaps `0x42C`/`0x52C`, 128 B family `0x2DF8…` listed under the char_off-only rule at 01:91 | `CURRENT-RULING.md:64-69`, `DEVELOP.md:209`, dirty bytes | these are obj offsets; file equivalents are 0x2C13/0x2C2B, 0x2C77/0x2D77, 0x45DF…; dirty 0x2C13 is the FF run, dirty char_off 0xD24 is random | CONTRADICTION — coordinate system unnamed |
| 17 | Gap 7 | 01:152 | 1024 B gold mirror is "overwritten on load" (member4-header.md:165) | `member4-header.md:165,170,245` | :165 is H-C (adopted: double-write likely does not exist); "overwritten on load" is the retained alternative H-A at :170; the block is UNCONFIRMED at :245; :240 is blank | CONTRADICTION — misquoted hypothesis |
| 18 | character name | 01:73 | documented samples are 9 B (`猎人A`, `猎人B`) | `G:/tmp/LINK2/bytes.mjs` | stored names are `Sakiko` and `Lay1nn`, 6 B each; 猎人A/猎人B are the docs' aliases | STALE |
| 19 | appearance | 01:83 | six feature bytes at `0x0241..0x0248` | arithmetic | the range is 8 bytes (0x241..0x248 inclusive); the source write-side-desc:344 repeats the same "6" | CONTRADICTION (minor) |
| 20 | G-04 | 02:178 | 2064 B unparsed block at `0x21E0E..0x22612` | arithmetic + `equipment.md:400` | 0x22612-0x21E0E = 2052 B, not 2064; the 2064 B block ends 0x2261D | CONTRADICTION (minor; same root as #1) |
| 21 | citations | 02/03 | coverage-map/equipment.md line numbers | recursive resolver over 413 refs | 22 refs point at a blank/separator/fence line; ≥30 more point at a neighbouring row; e.g. 03:223-226 cites member4-semantics:39-48 for the Permit blocks that are at 107-112 | STALE (doc hygiene) |
| 22 | palico fields | 03:110-119 | coverage-map:389-392 for the 324 B block fields | `coverage-map.md:392-395` | the field list is at 392-396 and owner name at 395; the cited lines are the section header/blank | STALE (off +3) |
| 23 | item 15 | 03:252-254 | unknown range `0x5E2E..0x5EA2` | `member4-file-layout.txt:128-141` | current unknown range is `0x5E32..0x5EA6` (post-drift) | STALE (off -4) |
| 24 | slot map | 03:95 | older `monster-slot-map.json` + `monster-slot-map-small.json` pair; and `monster-slot-map-137.json:1-824` | `ls docs/data/json`, `wc -l` | `monster-slot-map-small.json` does not exist (coverage-map:85: "无 -small.json"); the -137 file is 961/962 lines, not 824, and each row has 5 keys (slot/emid/cn/cn_src/en), not 4 | CONTRADICTION — dead file/range |

## CONFIRMED — claim, location, command, output

All commands below are read-only node scripts under `G:/tmp/LINK2/`; snapshots are
`save-snapshots/20261022-clean-reference/system_CLEAN` (CLEAN) and
`save-snapshots/20261022-v6-ready/system` (V6); slot bases 0x18CC9C/0x2AC560.

1. Container header (01:57-69). `node G:/tmp/LINK2/bytes.mjs`:
```
sizes 5159100 5159100 0x4eb8bc
CLEAN stamp 0x14 36b2ee74 len 0x1C 5159064 ; 0x24 version c6 ; flags 0x28 [1,1,0,1]
      offsets 0x34 ['0x18cc78','0x2ac53c','0x3cbe00'] ; 0x50 756e736e ; 0x54 103
V6    flags 0x28 [1,1,0,0] ; same offsets/stamp/length/0x50/0x54
```
`0x18CC78+0x24 = 0x18CC9C`, `0x2AC53C+0x24 = 0x2AC560`, `0x3CBE00+0x24 = 0x3CBE24`; stride
`0x2AC53C-0x18CC78 = 0x11F8C4`. 01 rows 57-69, M1/M2/M3, and 02's G-07 resolution (02:199) are correct.

2. Character header (01:73-80). Same command:
```
CLEAN slot0 Lay1nn playtime 1556492 gold 9185849 HR16 198 gender 1 0x2B 0 0xB1 0
CLEAN slot1 Sakiko playtime 70310  gold 3355345 HR16 8   gender 1 0x2B 0 0xB1 0
V6    slot0 Lay1nn playtime 1560082 gold 8345419 HR16 198 gender 1 0x2B 0 0xB1 0
V6    slot1 Sakiko playtime 85720  gold 4396916 HR16 10  gender 1 0x2B 0 0xB1 0
```
01's observed pairs (70,310/1,560,082; 3,355,345/8,345,419; HR 8/198; gender 1; 0x2B=0; 0xB1=0)
are correct. `node G:/tmp/LINK2/misc.mjs`: all 7 records at `0x10C+44k` start with `0x0193a514`;
gold mirror at 10255 equals 0x24 in all four slots, playtime mirror at 140427 equals 0x20 in all four.

3. Item box/pouch codec and layout (02:47-67). `node G:/tmp/LINK2/decode.mjs`:
```
CLEAN slot1 pouch 21 : 10,10 | 88,6 | 16,1 | 18,5 | 21,5 | 24,5 | 23,4 | 6,1 | 56,20 | 273,1 |
 275,1 | 40,1 | 41,1 | 42,1 | 43,1 | 77,1 | 7,1 | 73,4 | 29,1 | 28,2 | 31,3
V6 slot0 pouch 24 : ... (24 entries)
CLEAN slot1 itempreset@6095 ["设置01","设置02","---",...] nz=24 ; itempreset@7738 nz=0
V6    slot0 itempreset@6095 nz=0 ; itempreset@7738 ["设置01",...] nz=14
```
POUCH-03/04/05 and ITSET-01/02/04 are confirmed against bytes; the clean 21 / dirty 24 counts are
exact. `node G:/tmp/LINK2/boxcheck.mjs`: CLEAN (legacy, N=2300) slot0 max id 2976 / max count 99 /
0 over-domain slots; slot1 max 2809 / 99 / 0; V6 (V7, N=2992) slot0 2976/99/0, slot1 2809/99/0.
Decoding CLEAN with N=2992 produces 27/10 over-domain slots, which confirms BOX-01/G-06's warning that
the wrong layout silently reads preset data as slots. `node G:/tmp/LINK2/decode.mjs` also shows the
legacy preset record 0 body at 0x17F9 starts `0a00 0a00 5800 0a00 1000 0500...`, i.e. 16-bit
{id,count} pairs matching the pouch; ITSET-05's `[INFERENCE]` is in fact supported by the artifact
(the rule keeps it read-only, which is safe). The clean box itself decodes `1/99, 2/99, 3/99, ...` in file order (`node G:/tmp/LINK2/boxdump.mjs`), which confirms BOX-05 forward order; a reversed order would not start at id 1.

4. Equipment box (02:73-84, 90-92). `node G:/tmp/LINK2/equip.mjs`:
```
CLEAN slot1 i=0 type=7 LV01=3 id=14 ; i=3 type=14 LV01=4 id=4 ; ...
CLEAN slot0 i=0 type=14 LV01=7 id=44  hex ee002c000000...
```
The first record `ee 00 2c 00` decodes exactly as EQ-03/04/05 describe (type 14, LV01 7, id 44);
`node G:/tmp/LINK2/equip2.mjs` shows bead ids 2667,2668,2669,2672,2700,2701,2702,2704,2714,2716,
2778,2789,2811 — all inside EQ-07's 2638..2888; charm records decode with kind 2..10, two skill
ids, two point bytes, sockets 0..3, `+18` in {98,99,100}, `+19`=1; the type-20 record has `+12`=1.
CATBOX-02's first three records are exactly `16000200` / `17000100` / `18000100` in all four slots.
`node G:/tmp/LINK2/equip.mjs` also shows armor max id 1253 (≤1282/1286), weapon max id 111, charm
kind max 10, and no type 22-24 in the hunter box — ID-03/04/05 domains hold for the samples.

5. Preset arrays (02:98-114). `node G:/tmp/LINK2/decode.mjs`: 40 EQSET names at 133326
(`设置01`, then `---`); `node G:/tmp/LINK2/misc.mjs` shows record 0 = `e8aebee7bdae 3031 00…`
(8-byte `设置01`, NUL padding to +42) and record 1 = `2d2d2d 00…`. ITSET-04's V7 closure
(7738+13*170 = 9948, name ends 9989) follows from the 14 V7 names found at 7738.

6. Palico records (03:110-119). `node G:/tmp/LINK2/misc.mjs`:
```
CLEAN slot1 palico i=0 owner "Sakiko" residue58 200600e9256006 colors f0f0f0ff71deffff… id7 14,15,18,65535,…
CLEAN slot1 palico i=3 name "梅露露" owner "Sakiko" colors 302e48ff… id7 19,16,17,65535,…
header25@0x23B9D ffffff0600510100001e1e…
```
Record +0 names decode as UTF-8, +0x9C holds the hunter name, +0x11A is 9 × RGBA with 0xFF,
+0x58 is pointer-like residue, +0x100 is 7 u16 with 0xFFFF as the empty sentinel.

7. Monster arrays and quest bitmaps (03:48-52, 92-95). `node G:/tmp/LINK2/quest.mjs`:
```
CLEAN slot1 cleared 94 seen 331 achieve 3 contradictions 0
CLEAN slot0 cleared 436 seen 1007 achieve 58 contradictions 0
V6 slot0 cleared 605 seen 1007 achieve 59 contradictions 122
V6 slot1 cleared 639 seen 500 achieve 5 contradictions 379
```
`node G:/tmp/LINK2/decode.mjs`: CLEAN slot1 kill 62 nonzero / max 45; capture 26 / max 3;
size 42 nonzero; small-monster capture and size violations 0; vol_only 9; kill&size 33.
These match 03's C rows and coverage-map's adjudication exactly. The 137-row map has 137 rows
(`node -e "require('./docs/data/json/monster-slot-map-137.json').length"` → 137).

8. .hnt equivalence (01 invariant 9). `node G:/tmp/LINK2/hnt2.mjs`:
```
A vs clean slot1 86.76% / 14.64% / 18.01%
B vs clean slot0 99.31% / 100.00% / 50.96%
B vs dirty slot0 91.28% / 25.05% / 35.35%
```
Exact match to 01:120-121 and coverage-map:380-382.

9. Medals A fields (03:140): 132 bits in 17 B, byte +16 low nibble only, +17..+19 zero, dirty A = FF×16+0F
= 132 bits; clean slot1 A == B. These parts are confirmed; only the universal mirror claim fails (see
CONTRADICTION C5).

10. Arithmetic checks: 01 M9 `1,177,760 % 512 = 160` and `512-160 = 352` (node); 02 BOX-03
`ceil(2300*19/8)=5463`, `2992*19/8=7106`; 02 EQ-01/CATBOX-01/EQSET-01
`25326+72000=97326`, `97326+36000=133326`, `133326+5440=138766`; 02 MN-06
`133326-25326=108000`; 02 MN-13 `10174-10118+1=57`; 02 ITSET-02 `2437-2380=57`; 03 item 13
`0x208CE-0x208AD=33`; 03 item 7 `0x4447-0x3907=0xB40=2880=10×288` (the "288 B family" is the
per-record size; the range is the 10-slice family, so the range is correct, the label is ambiguous);
03 item 9 `0x5E2D-0x50BA+1=3444` (length retained, shifted 4 low — see #2).

## CONTRADICTION — same fact stated differently: both file:line, both values, which side the artifact supports

C1. **MN-07's never-write end vs the 2064 B block.** 02:160 says "the 24 x 68 B set-item block at
`0x21E0E` and the following bytes up to `0x22612`". equipment.md:400 says the following block is 2064 B
at `0x21E0E`, i.e. end-exclusive `0x2261E`. MN-07 as written covers 2053 B (0x21E0E..0x22612 inclusive),
11 B short. The artifact has nonzero bytes in the omitted range: `node G:/tmp/LINK2/decode2.mjs` gives
`0x22612..0x2261E` nonzero = 5 (CLEAN slot0), 1 (CLEAN slot1), 5 (V6 slot0), 1 (V6 slot1). The artifact
supports equipment.md:400, not 0x22612. This is the assignment's "never-write range too small" case.

C2. **Item 9's 3444 B block.** 03:235-236 says `0x50BA..0x5E2D`; coverage-map:330 and
member4-semantics:195 say file `0x50BE..0x5E32` (post-0x5057 drift correction, member4-file-layout.txt:128
`0x050be obj+0x3684 sz=3444`). The written range is 4 B early at the start and 4 B short at the end.
The artifact is all zero in this block (both samples, both slots), so no current data is lost, but the
range is structurally not a superset of the structure it names. The artifact (current file-layout table)
supports 0x50BE..0x5E32.

C3. **EQ-10/EQ-11 zeroing vs a real nonzero byte.** 02:82 says record `+12..+35` "must be 0 for armor
and non-glaive weapons"; 02:83 says "for non-charm, non-glaive records write 0". `G:/tmp/LINK2/equip.mjs`
finds record 22 (type 11) in CLEAN slot1 and V6 slot1 with `+12 = 0x04`:
`0b000b000000000000000000040000…`. This is a clean-save weapon record; zeroing would erase the byte.
equipment.md:644 (gap 16) itself warns "these bytes may have content; zeroing may destroy data".
The artifact supports the gap, not the absolute "must be 0".

C4. **MN-08's blanket never-write vs 03's writable medals.** 02:161 forbids writing the whole
`0x2EFF..0x3FEF` span. 03:140-141 defines `medal_A` at char_off `0x3157` and `medal_B` at `0x316B`
with a read-modify-write write rule, and 03:182 (I9) requires writing both. 0x3157/0x316B are inside
0x2EFF..0x3FEF. The artifact has real medal data at 0x3157/0x316B (clean slot1 12 bits each, dirty
slot0 A=132/B=33), so the span is not wholly "unidentified" and the two rules cannot both be
implemented. The artifact does not decide whether medals should be writable, but it proves 02's
characterisation of the span as unidentified is too broad.

C5. **Medal mirror.** 03:135-136: "In the clean sample both are byte-identical; the writing rule is
therefore a mirror write". 03:141: "Write the same 132 bits as `medal_A`". 03:182 (I9): after any write
the first 17 B of both must be equal. `G:/tmp/LINK2/medal.mjs`:
```
CLEAN slot0 A 54 B 33 A&B 33 A-only 21 B-only 0 BsubsetA true
CLEAN slot1 A 12 B 12 A&B 12 A-only 0  B-only 0 BsubsetA true
V6    slot0 A 132 B 33 A&B 33 A-only 99 B-only 0 BsubsetA true
V6    slot1 A 51 B 51 A&B 51 A-only 0  B-only 0 BsubsetA true
```
The clean *anchor* (slot1) has A==B, but the clean *file's other slot* (slot0, the same hunter as the
dirty slot0) has A=54, B=33, B⊂A. The repeated invariant is B⊆A, not equality. A mirror write equal to A
would add 21 bits to B in a clean save; a mirror write equal to B would clear 21 legitimate A-only bits.
The artifact supports the subset reading; the spec's universal mirror claim is not supported.

C6. **01 Gap 11 vs the resolved drift.** 01:156: "The 134-row layout table is off by 4 B somewhere after
`char_off 0x3157`, which moves quest bitmap offsets... Tracked as HANDOFF.md:188 (issue 6)". The current
record: coverage-map:411-413 ("漂移点是第 107 行 (文件 0x5057)... 第 107..134 行整体 +4") and
HANDOFF.md:217 ("已解决 2026-10-24: 第 107 行 0x5057..."). HANDOFF.md:188 is a code fence (the directory
tree), not an issue. The quest bitmaps at 0x2C77/0x2D77/0x2E77 are before both 0x3157 and 0x5057 and
were decoded with 0 `cleared⊄seen` violations; shifting them by +4 would corrupt them. The artifact
supports "no drift before 0x5057", i.e. Gap 11 is false.

C7. **03 item 4's persisted bitmap coordinates.** 03:216-218 says "Only the A and B slots persist
(char_off `0x505F` and `0x506B`); `+0x35FC` has no file bytes, and `0x5077` is a different field
(obj+0x3614)". member4-file-layout.txt:115-118 has `0x0505f obj+0x35ec sz=4`, `0x05063 obj+0x35f0
sz=12`, `0x0506f obj+0x3608 sz=12`, `0x0507b obj+0x3614 sz=12`; member4-semantics:138-139 repeats
0x5063 (A) and 0x506F (B). The spec's three file numbers are 4 B early; 0x506B is inside slot A, not
slot B. The artifact supports the file-layout table.

C8. **02 G-07 vs 02's own resolution.** 02:181 says there is "no documented way to derive the three
block starts from the file; the hunterAdds values in HANDOFF.md:42 are measured constants. Conservative
rule: hard-code the three starts". 02:199 says "File header u32 LE at 0x34, 0x38, 0x3C = start of slot
records... Rule: derive starts from the header, do not hard-code". Both cannot be the contract. The
artifact (`G:/tmp/LINK2/bytes.mjs`) shows the header values in both samples and `+0x24` gives the
hunterAdds, so the resolution is the correct side. (G-08 has the same problem: 02:182 still says slot 2
must not be used until re-measured; 02:200 says 0x3CBE24 is correct and 0x3CBE84/0x3CBD44 are wrong.)

C9. **02 MN-08/G-05's 577-byte evidence.** 02:161 says the span's bytes are `... (577 nonzero bytes in
all)`; 02:179 says `(577 nonzero bytes overall)`. `G:/tmp/LINK2/decode2.mjs`: CLEAN slot1 total
0x2EFF..0x3FEF = 577 (58 in 0x2EFF..0x2FFF + 519 in 0x2FFF..0x3FEF), but CLEAN slot0 = 1631
(91 + 1540), V6 slot0 = 1632, V6 slot1 = 680. Coverage-map:115 assigns 577 to the 4080 B block
0x2FFF..0x3FEF, while the 4080 B block alone is 519 in slot1 and 1540 in slot0; the 577 figure is the
union of the 256 B gap and the block. The artifact supports "the span is unidentified, not zero", which
is the current rule; the quantitative wording is slot1-only and the 4080 B attribution is wrong.

C10. **MN-01's clean-zero baseline.** 02:154 says the 182 `0xFF` bytes are "where the clean save has
zeros"; CURRENT-RULING:93 says "clean 同区全 0". `G:/tmp/LINK2/decode2.mjs`: CLEAN slot0 has 28 `0xFF`
bytes in 0x4447..0x4598; CLEAN slot1 has 0; V6 slot0 has 182. The same-hunter clean slot0 is not zero,
so 182 is the dirty total, not 182 net-new bytes. The artifact supports "28 pre-existing FF bytes in
clean slot0".

C11. **01 M7's coordinate system.** 01:135 lists `0xD24`/`0xD3C` (skill arts), `0x42C`/`0x52C`
(bitmaps), `0x2DF8/0x2E78/0x2EF8/0x2F78` (128 B family). CURRENT-RULING:64-69 lists the same numbers as
object offsets; DEVELOP.md:209 gives the file equivalents `0xD24/0xD3C/0xD54 → 0x2C13/0x2C2B/0x2C43`,
and the dirty bytes at char_off 0x2C13 are the FF run while char_off 0xD24 is random. 01:91 (invariant 1)
says every address in the file is char_off, system or payload-relative; M7 violates that. The artifact
supports the obj-offset reading; the rule should name the coordinate or give the file equivalents.

C12. **01 Gap 7's "overwritten on load".** 01:152 says the 1024 B block "is overwritten on load
(member4-header.md:165)". member4-header.md:165 is H-C, the report's adopted conclusion that the
double-write likely does not exist; the "overwritten on load" sentence is H-A, a retained alternative at
:170. The block's semantics are called UNCONFIRMED at :245 (the cited :240 is blank). The artifact
(member4-header) supports "UNCONFIRMED / H-C", not a fact of overwrite.

C13. **03 I1's 122 vs 501.** 03:145-146 says "The dirty sample's 122 contradictory bits". The dirty file
(v6-ready/system) has 501: `G:/tmp/LINK2/quest.mjs` gives slot0 122 and slot1 379;
contradictory-bits-verdict.md:5 says "整档两槽合计 501 = slot0 122 + slot1 379" and :26 repeats that 122
describes slot0 only. If the spec means the dirty hunter (slot0), 122 is right; if it means the dirty
sample file, 501 is right. The artifact supports 501 for the file.

C14. **G-04's 2064 B arithmetic.** 02:178 says "a 2064 B unparsed block at 0x21E0E..0x22612".
0x22612-0x21E0E = 2052, not 2064; equipment.md:400 gives size 2064, whose exclusive end is 0x2261E.
The artifact supports 2064 B / 0x2261D inclusive.

C15. **03 G17's stale description.** 03:277 says coverage-map:42-44 still carries 93 large + 36 small +
8 reserved and that CURRENT-RULING:83-85 says 94 large in 0..92 and 43 small in 93..128 plus 8 reserved.
coverage-map:42 shows the old row struck through as superseded; CURRENT-RULING:83 says 0..70+112..134 =
94 large and 71..111+135..136 = 43 small, no reserved. The artifact supports the corrected rows.

C16. **MN-08's "not a 24 x 170 B structure" vs the item preset block.** 02:161/179 correctly says the
`mov r2,#4080` constant belongs to the 0x17CF item preset block (coverage-map:115, MECHANICS-FINDINGS:171
`movw r0,#0x62f4 / mov r2,#4080`). This is now consistent; no finding. (Recorded because an earlier
version of 02 said the opposite; the current text is correct.)

C17. **The non-existent small slot map.** 03:95 says "the older `monster-slot-map.json` +
`monster-slot-map-small.json` pair is shifted after slot 70 and must not be used". `ls docs/data/json`
shows only `monster-slot-map.json` and `monster-slot-map-137.json`; coverage-map:85 explicitly says
"无 -small.json". The artifact supports coverage-map: there is no small file to avoid. Also
03:95 cites `monster-slot-map-137.json:1-824`; `wc -l` gives 961/962 lines and each row has five keys
(slot/emid/cn/cn_src/en), not the four named in 03:95.

## STALE — number that was true earlier and what superseded it

S1. 01:146 (Gap 1) — "slot offset table values not published" → published and verified (02:199; header
0x34/0x38/0x3C = 0x18CC78/0x2AC53C/0x3CBE00, +0x24 = hunterAdds).

S2. 01:156 (Gap 11) — 4 B drift "after 0x3157", "moves quest bitmap offsets", "HANDOFF.md:188" →
localized at 0x5057 (coverage-map:411-413; HANDOFF.md:217, resolved 2026-10-24); quest bitmaps unaffected.

S3. 01:73 — "documented samples are 9 B (猎人A, 猎人B)" → stored names are `Sakiko` / `Lay1nn`, 6 B;
猎人A/B are aliases (coverage-map:312).

S4. 01:83 — "six feature bytes at 0x0241..0x0248" → the range is 8 bytes; source write-side-desc:344 has
the same miscount.

S5. 02:184 (G-10) — "coverage-map.md:30 writes 0x208CE..0x21E03 (5430 B)" → coverage-map:40 now writes
5440 B and marks 0x21E03/5430 superseded; line 30 is the 0x3EF7 row. DEVELOP.md:519-521 still has the
old value, so only the coverage-map half is stale.

S6. 02:181-182 (G-07/G-08) — superseded by the "Resolved by main session" block 02:199-200 (derive from
header; slot2 = 0x3CBE24). The G-07 text still says hard-code; G-08 still says only slots 0/1.

S7. 02:178 (G-04) — 0x22612 → equipment.md:400's 2064 B block ends 0x2261D; the 0x21E0E..0x22612 span is
2052 B.

S8. 03:278 (G18) — "4 B drift ... not localized" → localized at 0x5057 (coverage-map:411-413,
HANDOFF.md:217); this is the root cause of the stale coordinates in item 4 and item 9.

S9. 03:277 (G17) — both cited sources are already corrected (see C15).

S10. 03:235-236 (item 9) — 0x50BA..0x5E2D → 0x50BE..0x5E32 (coverage-map:330,
member4-semantics:195, file-layout:128).

S11. 03:252-254 (item 15) — 0x5E2E..0x5EA2 → 0x5E32..0x5EA6 (file-layout:128-141; the +4 drift).

S12. 03:145-146 (I1) — "122" → 501 for the dirty file (122 slot0 + 379 slot1; verdict:5,26).

S13. Citation line numbers (all three files). The resolver (413 refs, 267 unique ref/target pairs, 19
target files; `node G:/tmp/LINK2/refs2.mjs`) confirms every name resolves and no citation is past EOF
(the first wave's N9 status is correct), but the content has drifted:
- 22 refs point at a blank line, a table separator or a code fence, e.g. 01:73 `HANDOFF.md:85` (fence),
  01:76 `coverage-map.md:300` (blank), 01:105 `coverage-map.md:303` (blank), 01:155
  `coverage-map.md:353` (blank), 02:76 `equipment.md:411` (separator), 02:90 `coverage-map.md:106`
  (blank), 02:101/167 `equipment.md:533` (blank), 03:52/203/282 `coverage-map.md:303` (blank),
  03:102 `coverage-map.md:192` (blank), 03:266 `coverage-map.md:295` (separator), 03:278
  `coverage-map.md:265` (blank).
- The 632 B header rows in 01 are cited as coverage-map 297/298/299/300/301/334; the rows are 312-316
  (+15). The write-side-desc header rows are cited as 335-348; they are 336-349 (+1). HANDOFF's
  coordinate table is cited as 41/42/43; it is 42/43/44. HANDOFF:107 for the `.hnt` chunking is
  HANDOFF:108. HANDOFF:191 for the `.hnt` equality is not there (the ratios are coverage-map:377-384).
  01:64 cites coverage-map:403 for "3 slots"; 403 is the 16 B grid, and coverage-map has no 3-slot row.
  01:155 cites coverage-map:353 for the C0..C7 "no fixed table" statement; it is 356. 01:155-156 cite
  coverage-map:403/406 for the 16 B array and "not recommended"; they are 406 and 409.
- In 02, the equipment.md 36 B record table is cited as 410-430; it is 412-431 (+2), and at least
  24 of the 42 equipment.md citations point at the header/separator/neighbouring row. Examples:
  02:75 EQ-03 cites 410 for +0 (actual 412); 02:79 EQ-07 cites 416-418 for +6..+11 (actual 418-420);
  02:84 EQ-12 cites 445 for the empty-record rule (actual 447); 02:90 CATBOX-01 cites coverage-map:106
  (actual 38/119); 02:98 EQSET-01 cites coverage-map:30/108 (actual 40/121); 02:160 MN-07 cites
  coverage-map:109 (actual 122) and equipment.md:398 (actual 400); 02:166 MN-13 cites
  coverage-map:107 (actual: no such row; the dead zone is DEVLOG:58); 02:167 MN-14 cites
  equipment.md:533 (actual 535); 02:184 G-10 cites coverage-map:30 (actual 40). 02:134 ADDR-04 cites
  equipment.md:579 for "no checksum"; 579 is the empty-record rule and the checksum statement is 581.
  02:164 MN-11 cites equipment.md:651 for "no per-equipment unlock bit"; 651 is the 94 B body row,
  the unlock row is 653. 02:159 MN-06 cites equipment.md:536-545,633-634; the 160 vs 1000 capacity is
  at 547/636, not 545/634; 02:92 CATBOX-03 cites equipment.md:545,634 for the same 160-vs-1000 capacity, again 547/636.
- In 03, the palico field table is cited as coverage-map:389-392; it is 392-396 (+3). The Permit
  block source is cited as member4-semantics:39-48; the rows are 107-112. The medal_A source is cited as
  coverage-map:296; the medal row is 299. The `cTrialArts` source cites member4-semantics:313 for the
  3444 B block; that block is gap 6 at 310. `contradictory-bits-verdict.md:27` is a blank line (the file
  ends at 26) for the "unknown gap" citation at 03:68. 03 G22 cites coverage-map:303/334 for the HR
  summary; both are blank (the statements are 306 and 337).
- 01's craft citations to HANDOFF:41/42/43 are off by one; HANDOFF:188 is a code fence; HANDOFF:191
  is the directory tree; HANDOFF:107 is the "3.3 编辑器" heading (the chunking sentence is 108).
- 01's write-side-desc citations are uniformly +1 early: name 335→336, playtime 336→337, gold 337→338,
  HR 338→339, gender 339→340, save-kind 340→341, opaque 341→342, 7x44 343-346→344-347, final u32
  348→349.

## UNVERIFIED — load-bearing claims that cannot be checked with these tools

U1. "No checksum" (01:50, 02:134, 03:33) and "the save-load path `0x3e0db8` memcpy's the 632 B header
and discards it" (01 invariant 4, 03 I13). These are code-side claims; I did not re-run a disassembler
or a checksum scan. The bytes are consistent with the claim (arbitrary edits are not rejected by any
visible field), but absence of a checksum is not measurable from the two snapshots alone.

U2. Gameplay bounds that have no sample: HR UI cap (01:76), gender value 2 (01:78), save-kind `0x2B`
(01:79), the `0x0050..0x005B` header dword semantics, charm negative points (02:80; no negative point
byte in the four slots), the glaive `+22..+35` default pattern (02:83; the only type-20 record has
insectLV 0 and zeros there), palico group B runtime processing (03 G11), palico capacity 160 vs 1000
(02 CATBOX-03), and the quest bit coordinate M1 vs questId (03 G1/G2/G3; no in-game probe). Also
unverified: charm `+17`/`+20..+35` zeroing (02 EQ-08; equipment.md gap 11 at :639 recommends only
changing +12..16; all four sample slots have zeros there, so no byte evidence either way). The
slot-used flag semantics note at 02:201 cites the dword at 0x28 varying (01 01 00 01 vs 01 01 00 00),
but the first three bytes are 1,1,0 in both samples and match occupancy; only the fourth byte 0x2B
varies, and that byte is not one of the 0x28+slot flags. The flag still needs an A/B test, but the
quoted evidence is weaker than stated.

U3. Weapon family maxima (02 EQ-05 / ID-03) and armor seq maxima (02 ID-04): I verified the sample ids
are inside the stated ranges (armor max 1253, weapon max 111, charm kind max 10), but I did not
recompute the maxima from `docs/data/json/weapons.json` and `armor/*.json`.

U4. "Every save rewrites all 40 names" (02 EQSET-04) and "the editor wrote only 46 of 72 B" (03 E):
editor-source claims; not re-run.

U5. The `.hnt`-to-slot *identity* (01 Gap 4). File names and the equality ratios make hunterA→slot1 and
hunterB→slot0 the natural mapping (99.31% / 86.76%), but the spec is right that no in-game test proves
which `.hnt` the game reads.

U6. 02 ITSET-07's runtime mirror: DEVLOG:69 says `obj+0x6320`, DEVELOP:144 says preset base +0x62F4
(V7 +0x6DC4); the two are 0x2C apart and I did not disassemble the accessor. Context-only, no file
write depends on it.

U7. 02 G-12 / 03's `count` > 99 and id 2991 behaviour: the field masks allow 0..127 and 0..4095, but
no sample exercises the out-of-domain values; the game's clamp/corruption behaviour is not observable
offline.

## Difficulties — obstacles, what you tried, cost in tool calls, suspected cause

- The editor-spec files are being edited concurrently. My first read of 02 showed an older MN-08/G-05
  rationale ("the block itself is 0x2FFF..0x3FEF"); a later read of the same path (mtime 2026-11-04
  06:35) showed the corrected "4080 belongs to 0x17CF" wording. I re-read all three files before
  finalizing; the table row 12/C9 is against the current text, and C16 records the corrected part.
  Suspected cause: the main session applying first-wave fixes while this audit ran. If 02 changes again,
  re-check MN-07's 0x22612 and MN-08's 577.
- The `write` device refuses repo paths; per the parent message I wrote this report to
  local://LINK2-EDITOR-SPEC.md. Main session must copy it to docs/analysis/audit/LINK2-EDITOR-SPEC.md.
- The citation check is a name-index resolver, not a semantic parser: 413 refs, 267 unique ref/target
  pairs, 19 target files. It proves resolution and detects blank/separator/fence targets; the
  off-by-N content mismatches were confirmed by reading each cited range. No repository file was
  modified. Cost: ~55 tool calls (gate, 3 spec reads, 16 byte-check scripts, 15 source-file line
  dumps, citation resolver).
