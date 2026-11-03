# B-block sample adjudication, blocks 0-6 (84 functions)

Inputs: `bsamples/s0.txt` … `s6.txt` (12 functions each, fixed sample). Verdicts:
`verdict-0_6.tsv`. Evidence was taken from the function body itself
(`tools/mhgu/arm32.mjs` disassembly), in-function string references,
class/vtable attribution (`attr-vtable-retile.tsv`, `attr-strings.tsv`) and the
labelled identity of callers/callees (`tiers-recomputed.csv`).

## Counts

| block | fns | insns | confirm | relabel | unknown | homogeneity |
|---|---:|---:|---:|---:|---:|---|
| 0 (0x288-0xd20d4) | 1054 | 60020 | 1 | 4 | 7 | mixed: engine object-model preamble (class registrars/creates + manager-forward thunks), then unrelated subsystems |
| 1 (0xd2210-0x14d93c) | 930 | 60029 | 1 | 4 | 7 | fairly homogeneous: one long equipment/armour/weapon data-class run (cArmor*Base 0xd0-0xda, cWeapon08MsgBase, rArmorSeriesData, rKireajiData, rWeapon12LevelData) plus getters/thunks |
| 2 (0x14d9f8-0x1a815c) | 804 | 60069 | 5 | 3 | 4 | mixed: online protocol (0x14d9), ui (0x1608), monster-em (0x176a, 0x1837), item/kitchen+pouch (0x19e1-0x1a47) |
| 3 (0x1a828c-0x204910) | 745 | 60020 | 8 | 3 | 1 | **structured runs**: MonNyan/palico run 0x1ad-0x1c0 (dense `cMonNyan*` registrars, one class per 0x400-0x700 bytes), then Festa-mediated (0x1cb), render (0x1da), net (0x1e6, 0x1fe) |
| 4 (0x20498c-0x254714) | 831 | 60036 | 3 | 8 | 1 | two clean runs: `nFestaNetwork::net*Procedure`/`cRemoteCall` RPC 0x204-0x21a, and the NPC data block 0x236-0x241 (`cNpc*`, `cSansaijiji*`, `sNpcData`) — the retile labels are systematically wrong for both |
| 5 (0x2547a8-0x2a1d90) | 813 | 60047 | 5 | 1 | 6 | mixed: quest slot tables (0x2596, 0x2618, 0x2747), `uOtomoLobby` (0x268b), then the shared actor base API (0x27bcc0, 0x281d08, 0x28a194, 0x290430) |
| 6 (0x2a21c4-0x2f331c) | 502 | 60183 | 0 | 1 | 11 | apparently mixed by label (em 55%) but actually one engine layer: shared actor/character logic (state bits +0x13c4/+0x13cc, 64-bit status at +0x2510, action dispatch 0x281998/0x282fd8/0x283238 with 700-1300 callers) plus the `uPlayerQuestNN` class run 0x2b3-0x2b7 |

Totals: 23 confirm, 24 relabel, 37 unknown.

Relabel targets: quest 7, online-nex 5, weapon-wp 4, item 3, otomo-ot 3,
monster-em 1, player-pl 1. (24 of the 84 sampled labels — 29% — were wrong.)

## What the verdicts rest on

1. **Class/vtable attribution** (`attr-vtable-retile.tsv`) is strong, but the
   table has three different keying modes and only one is mechanical:
   `vtable V slot N` where the word at `V+4N` really is the function address
   (verified directly for 17 of the rows used here, e.g. `0x1740f4c` slot 12 =
   `0x1c7f30`, `0x174684c` slot 12 = `0x2547a8`, `0x1741114` slot 9 =
   `0x1cbb84`). The other rows are keyed by the *class registrar* of the old
   tiling region that contains the address, so they identify the *class block*
   rather than the individual function (e.g. `0x1a1ac4` = start of the old
   219-insn region that contains the `cKitchenListSuccessTable2` name load at
   `0x1a1d58`). Both modes were used, the second marked "class region".
2. **In-function string references** are decisive only when the string address
   is materialised by the pc-delta idiom (`ldr rX,[pc,#n]; add rY,pc,rX`).
   The `ldr rX,[pc,#n]; ldr rX,[pc,rX]` (GOT) form makes the *literal* an offset,
   and reading text there produces false hits: `0x2b41e8` "ubscriber::Unknown",
   `0x2d8a9c` "ItemType[124]", `0x2e778c` "nt[8]", `0x1b7324` "###$$$" are all
   such artifacts (they are nnSdk/dbpr strings that happen to sit at the
   numeric address). Real hits used here: `cWeapon08MsgBase` 0x115160,
   `rArmorSeriesData` 0x129b8c, `w12d` 0x139ac8, `mItemPouch[i]` 0x19e108,
   `mComment` 0x237764, `uOtomoLobby` 0x268b6c.
3. **Caller/callee clusters** were used only where the labelled sites are
   unanimous and the function manipulates the same data as its callers
   (0x64f90, 0x14d9f8, 0x1e6414, 0x274710). Where the callee set is
   infrastructure — `0x7aa47c` (manager-table accessor, 10419 callers),
   `0x152960` (resource-by-id), `0x15339c` (resource request builder),
   `0x887660/0x887648` (alloc/free), `0x13efd**` (nnSdk import thunks),
   `0x326b18` (resource-slot setter), `0x3df378` (bit-writer) — the label was
   *not* taken from the callee.
4. The retile merges tiny unpushed leaf functions into the preceding function
   (`0x288` = two `mov r0,#0; bx lr` stubs; `0x160800` = body + 5 stub slots;
   `0x139ac8` = getter + 3 stubs). Such rows were judged on the dominant body
   and the verdict says so.

## Three worked examples

1. **0x64f90 (block 0, label online-nex → monster-em).** The record it edits
   is the same one the A-tier monster dispatcher `0x60ab8` takes: byte +0 is a
   2..10 type index used with a 9-entry jump table there, and `0x64f90` uses
   byte +0 as an index into a flag table at `0x16ce534`, compares `[rec+2]`
   against `0x3f8398(global)`, rotates `[rec+15..18]` and clears `[rec+28]`.
   All seven call sites lie in the 0x60a-0x62b cluster, which calls A-tier em
   `0xc5b14` (1076 insns, 29/31 callees A-tier em). Nothing online-nex appears.
2. **0x23aad4 (block 4, label otomo-ot → quest).** The word at
   `0x1745724+4` is `0x23aad4`: slot 1 of the `cSansaijijiPresent` instance
   vtable. That class sits in the NPC data name block (`cNpcTalkDataXML`,
   `cSansaijijiExchange`, `rNpcBaseData`, fields `mSpActID`/`mMotNo`), and the
   body is an empty `0x2b908` override plus the shared manager forward — no
   per-function behaviour at all, the class fixes the label.
3. **0x2d0568 (block 6, label online-nex → unknown).** 340 instructions of
   action-response logic keyed on the current action id (`0x53a058`) with a
   60-entry jump table and `0x281998(id,s0,s1)` calls; its 17 callees split
   online 3 / otomo 4 / quest 2 / em 7 / save 1 and every one of them is a
   shared helper (0x281998 alone has 1084 callers). No string, no vtable
   entry, no subsystem-specific field: the label cannot be established.

## Block-level extrapolation

- Block 3 is the only block whose sample is nearly unanimous *and* evidence
  backed (8 confirm + 3 relabel, 1 unknown). Its runs are class-dense and the
  classes are named, so a per-run promotion (0x1ad-0x1c0 → otomo-ot;
  0x1cb/0x1e6/0x1fe → online-nex; 0x1da → render-gfx) is defensible.
- Block 4 should not be promoted as labelled (8 of 12 wrong), but the two runs
  are homogeneous: promote 0x204-0x21a as online-nex and 0x236-0x241 as quest
  after re-labelling, not before.
- Block 1 is mostly equipment data (5/12 weapon-wp verdicts) and the rest is
  getters/thunks; promote only after relabelling the weapon-wp class block.
- Blocks 0, 2, 5 are genuinely mixed (registrar/thunk preamble, several
  subsystems per block); no block-level extrapolation.
- Block 6 must not be promoted: 11/12 sampled functions are the shared
  actor/action layer or `uPlayerQuest` code, and the current em 55% is a
  propagation artifact of the 0x27-0x2a base API being consumed mostly by em
  code. Its 502 functions (60k instructions) are also the place where the
  retile's label spread is least trustworthy.
