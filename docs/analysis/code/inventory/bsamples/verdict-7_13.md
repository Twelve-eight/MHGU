# Tier B block sample verification — blocks 7–13

84 sampled functions (12 per block) from `bsamples/s7.txt` … `s13.txt`.
Verdict table: `verdict-7_13.tsv` (columns `block start label verdict evidence`).

## Method

For every sampled start I disassembled the function with `tools/mhgu/arm32.mjs`
(`FLAT=G:/omp works/MHGU/main.140.flat.bin`), listed its validated strings
(`stringxref.tsv`, `strings-validated.tsv`), its direct callees and callers
(`functions-retile.csv.gz`, labels from `bblocks/bNN.txt` and
`tiers-recomputed.csv`), and cross-checked the function against
`class-inventory.tsv`, `attr-prefix.tsv`, `attr-strings.tsv`,
`attr-library.tsv`, `attr-vtable-retile.tsv` and `attr-bverify-pilot.tsv`.

Two evidence types were treated as decisive:

1. **Class registrar.** Inside the function, `bl 0x7aedcc` (class-record ctor)
   with a class-name pointer built by `ldr rX,[pc]` + `add rX,pc,rX`. 9 sampled
   functions pass this test. The class name is then mapped by
   `classprefix-map.tsv` / `taxonomy.mjs`.
2. **Vtable slot.** For rows in `attr-vtable-retile.tsv` I re-read the named
   vtable slot (`rd32(vtable + slot*4) == start`) before accepting the class.
   All 15 such attributions used below were verified this way.

Callee/caller *label counts* were used only as supporting evidence, never alone:
the current labels are propagation output, and several very common helpers carry
false subsystem labels (see Findings). `unknown` is used when the function body
contains no subsystem-identifying content (accessors, thunks, generic
containers) — not as a failure.

The retile rows often include trailing leaf functions after the real terminator
(e.g. `0x39a6e4` row = 9-ins accessor + two getters; `0x4affe8` row = 26-ins body
+ getters). String/field scans were stopped at the first terminator
(`bx lr` / `pop {…,pc}` / external `b`) so that trailing code is not credited to
the sampled start.

## Results

| block | range | fns | insns | confirm | relabel | unknown | homogeneity |
|---:|---|---:|---:|---:|---:|---:|---|
| 7 | 0x2f3844–0x3559c0 | 494 | 60037 | 5 | 1 | 6 | mixed: a monster-em core (0x2f5–0x314) with item/online/otomo tails and proof-effect/weapon code; not uniform |
| 8 | 0x3562f8–0x3ace14 | 384 | 60203 | 4 | 2 | 6 | mixed: weapon/otomo/online/item/UI/em tails; no single subsystem |
| 9 | 0x3ad1a8–0x3eed68 | 613 | 60002 | 1 | 1 | 10 | generic container/thunk belt (container scans, bitmaps, dispose thunks); not homogeneous |
| 10 | 0x3ef5fc–0x47d434 | 523 | 60346 | 2 | 6 | 4 | a `uShell*` class-registrar/setup-param band plus em/online code; the current labels are systematically wrong for the shells |
| 11 | 0x47dd80–0x4d9320 | 887 | 60008 | 4 | 5 | 3 | equip-shop/trade class registrars, 808-byte serializers and weapon/otomo data; mixed |
| 12 | 0x4d9370–0x527b2c | 846 | 60044 | 3 | 2 | 7 | network message dispatcher + monster hit code + engine (MtArray) deleting destructors; mixed |
| 13 | 0x527d78–0x572358 | 974 | 60001 | 5 | 2 | 5 | arena/trial data, `uShell`/Festa constructors, item vector and engine destructors; mixed |
| **total** | | **4721** | **420641** | **24** | **19** | **41** | |

19 of 84 sampled labels (22.6%) are contradicted by class/string/vtable
evidence. 41/84 cannot be attributed from their own content.

Relabel targets: player-pl 5, quest 4, render-gfx 4, item 2, monster-em 2,
ui 1, weapon-wp 1 (19 rows). The concentration is in the `uShell*` shells
(block 10: five player-pl relabels) and in class registrars/vtable slots
(block 11: item/quest/weapon shop classes).

## Block notes and examples

### Block 7 (5 confirm / 1 relabel / 6 unknown)

Monster-em dominates (9 of 12 current labels) but the sample includes an item, an
online and an otomo tail; the em core is real, the block is not uniform.

- `0x2f5f68` confirm monster-em — `[obj+0x2506]==1` gate then
  `([obj+0x250a]-158)<=167` through a 168-entry pc-relative table (action-state
  numbers 158..325); sole caller is labelled monster-em.
- `0x30899c` confirm monster-em — 13/13 callers labelled monster-em, 20-case
  dispatch on a small enum writing through a global manager.
- `0x328a64` relabel:render-gfx — verified vtable slot 4 of `uProofEffectBase`
  (vtable `0x17529cc`) and a field-descriptor chain naming
  `mpProofEffectList`/`mpEffectListArray`/`mVisible`/`mColorFlag`/`mEffectType`/
  `mEffectNo`/`mResourceType`/`mEflNum`/`mJointNo`/`mColor`.
- `0x321694` unknown — a sin/cos rotation-matrix builder (27 callers across
  quest/render/online); the quest label comes from the caller mix, not the code.

### Block 8 (4 confirm / 2 relabel / 6 unknown)

Mixed: weapon/otomo/online/item/em/UI tails. No single subsystem.

- `0x384408` relabel:ui — verified vtable slot 0 of `uUIResult` (instance
  vtable `0x175332c`, registrar `0x39106c`); the caller `0x3845d4` is
  `uUIResult` slot 1.
- `0x39cd44` unknown — verified vtable slot 12 of `rResourceSample`
  (`0x17539b4`); the 808-byte writer calls 0x82772c/827bbc/827998/8277c4, generic
  codecs whose weapon-wp labels are cluster noise. `rResourceSample` has no
  taxonomy bucket.
- `0x3a7f40` confirm online-nex — 64-slot member table
  (`[obj + i<<10 + 1748]`, stride 16, byte 255 sentinel), online-cluster callees.

### Block 9 (1 confirm / 1 relabel / 10 unknown)

Almost pure generic utility code: container scans, bitmaps, dispose thunks. This
block should not be promoted as a subsystem block.

- `0x3c6b64` confirm item — inventory tally with `{u16 id,u16 num}` entries
  (`count [obj+2832]`, array `[obj+2776]`), two item-labelled callers.
- `0x3cd9cc` relabel:quest — verified vtable slot 1 of `rPointPos` (instance
  vtable `0x175458c`, registrar `0x3ce060`; attr-strings/pass1 label `rPointPos`
  quest B).
- `0x3bcac4` unknown — 8-way category dispatcher whose branches call 4/15/41-ins
  generic getters (`0xdf814` 7x, `0x27c6f8`, `0x27c7ec`); no subsystem-specific
  code.

### Block 10 (2 confirm / 6 relabel / 4 unknown)

This sample is dominated by `uShell*` class registrars and setup-param vtable
slots. Current labels (otomo-ot / monster-em) are systematically wrong:

- `0x41808c` relabel:monster-em — registers `uShellEmBase33` (+
  `::cSetupParamEmBase33`); `uShellEnemy` → monster-em, and attr-vtable labels
  `uShellEmBase33` instance methods monster-em A.
- `0x467190` relabel:player-pl — registers `uShellPlcom_011` (+ setup param);
  `uShellPlcom` = player common shell.
- `0x457bf4` relabel:render-gfx — verified vtable slot 83 of
  `uShellPlEffectW10` (`0x175e160`). It reads the shared character word
  `0x2506`; that word is not monster-specific (see Findings).
- Also relabelled: `0x462fdc` and `0x4741a0` (uShellPl* setup params) and
  `0x46b100` (uShellPlw03_100) → player-pl; `0x443b00` (uShellOt003) confirmed
  otomo.

### Block 11 (4 confirm / 5 relabel / 3 unknown)

Equip-shop and trade class registrars plus two 808-byte serializers.

- `0x4bd7a0` relabel:item — registers `cTradePointItemList` /
  `cTradePointItemListXML`; `cTrade` → item (attr-prefix A).
- `0x4c8530` relabel:item — verified vtable slot 12 of `rTradeCoinTicketList`
  (`0x1768df8`, registrar `0x4c879c`); the weapon-wp label came from the generic
  writer codecs, not the class.
- `0x49497c` relabel:quest — registers `uShellSt005` (+ setup param);
  `uShellStage` → quest.
- `0x4c2abc` relabel:weapon-wp — registers `rEquipShopListW04` (weapon shop
  lists); `0x4c5a30` (`rOtEquipCreate`) confirmed otomo.

### Block 12 (3 confirm / 2 relabel / 7 unknown)

A network message dispatcher, monster hit code, and MtArray deleting destructors.

- `0x4e1940` confirm online-nex — 826-ins 8-way message dispatch on
  `[obj+0x1b54]`, 9/11 unique callees in online clusters.
- `0x4fce58` relabel:quest — verified vtable slot 1 of
  `rStageInfoSet::SIPosition` (`0x176a564`); rStage → quest A.
- `0x511118` relabel:render-gfx — verified vtable slot 4 of
  `uImagePlaneFilterRange::cCylinderFixY` (`0x176a828`); its field chain
  registers `x/y/z/radius/height` = cylinder volume.

### Block 13 (5 confirm / 2 relabel / 5 unknown)

Arena/trial data, shell constructors, item vector, engine destructors.

- `0x5332e4` relabel:quest — verified vtable slot 1 of `rTrialDataCommon`
  (`0x176b5e8`, registrar `0x532178`); `cTrialDataCommon` is quest B in
  attr-strings.
- `0x53985c` relabel:render-gfx — constructs the 4976-byte `uFestaChar` object
  (vtable `0x176bbe0` plus two more); attr-prefix labels the `uFest` prefix
  render-gfx A for `uFestaChar`.
- `0x54f9c0` confirm otomo — constructor with 10/11 callers labelled otomo.

## Findings that affect how these blocks should be read

1. **Class registrars and vtable slots are the only reliable local evidence in
   these ranges.** 24/84 sampled functions are class registrars (9) or verified
   vtable slots (15); 18 of those 24 conflict with the current label (6
   registrar relabels + 12 vtable-slot relabels), and one more conflict comes
   from the class-prefix table (`0x53985c`, uFestaChar). The remaining class
   identities are 4 unknown (classes with no bucket) and 2 confirm.
2. **`uShell*` mapping used here:** `uShellEmBase*` → monster-em,
   `uShellOt*` → otomo-ot, `uShellPlcom*` → player-pl, `uShellSt*` → quest
   (`uShellStage`), `uShellPlEffect*` → render-gfx. `uShellPlw*` is the player
   weapon shell; I map it to player-pl because `uPlWeapon` is player-pl in
   `classprefix-map.tsv` (a weapon-wp reading would only apply if shell objects
   were bucketed by weapon type). `uShellPlw07_100::cSetupParamPl_w07_100`
   (`0x4741a0`) is the constructor of that setup-param class.
3. **Callee votes built from current labels are unsafe here.** Common helpers
   carry false subsystem labels and inject noise into every neighbour:
   `0x7aa47c` singleton getter (monster-em), `0x65cb3c`/`0x65cc0c` array getters
   (ui/item), `0x1a6490`/`0x1a72e4` bit helpers (online-nex), `0x13efda0` import
   thunk (otomo-ot), `0x887660`/`0x887648` refcount/free helpers (otomo-ot),
   `0xdf814`/`0x27c6f8`/`0x27c7ec` tiny accessors (player/quest/item). This is
   why 41 functions stay `unknown`: their only "signal" is such a helper.
4. **`class-inventory.tsv` `registrar_fn` is a nearest-start estimate, not the
   real registrar.** Examples in this sample: `0x39a6e4` (claimed rFishData
   registrar; the row is a 9-ins accessor and the class-name site `0x39a760` is
   outside it), `0x3562f8` (cBui), `0x325b48` (rProofEffectParamScript),
   `0x4b304c` (cEquipShopListW07). The in-body test `bl 0x7aedcc` +
   pc-delta class name rejects all four; only 9 sampled functions pass it.
5. **Shared character state, not EM state.** Word `0x2506` (and `0x250a`) is
   read by player-effect method `0x457bf4`, by item-labelled `0x2fac44`, by
   quest-labelled `0x283060`, and by monster code. It is a shared character/base
   state word and must not be used alone as monster-em evidence.
6. **`MtArray` label conflict.** `0x4d9370` and `0x548700` are 4-ins deleting
   destructors that call `0x690` (`MtArray` destructor per attr-vtable row
   `0x690`) and tail-call the singleton free `0x7ca854`. `taxonomy.mjs` maps
   `MtArray` to kernel-os (the current label), while attr-vtable-retile labels
   `0x690` render-gfx A. I kept `confirm` for kernel-os but the two evidence
   tables disagree about the `MtArray` bucket.
7. **Extrapolation.** None of blocks 7–13 is homogeneous enough to promote as a
   single subsystem block on this sample. Block 10 is the clearest case: 6 of 12
   sampled labels are demonstrably wrong, all in the same `uShell*` registrar
   band, so its labels should be corrected from the class mapping before any
   promotion. Block 9 should stay unpromoted (10/12 unknown, generic utility
   code). Blocks 7, 11, 12, 13 contain real subsystem cores (em / weapon-item
   shop / online / arena) but also foreign tails; promotion, if any, must be
   per-function, not per-block.
