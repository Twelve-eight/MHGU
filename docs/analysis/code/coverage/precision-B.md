# Precision-B — adjudicating 160 tier-A rows across 8 labels

Deliverable: `docs/analysis/code/coverage/precision-B.tsv` (160 rows, header `start	label	verdict	evidence`),
one row per sample row of `docs/analysis/code/coverage/samples.tsv` whose label is one of
`otomo-ot item player-pl audio kernel-os physics-math filesystem save-data` (20 rows each; the sample was
drawn deterministically by even spacing over sorted start addresses, so it is not re-drawn here).

Every verdict was taken from the function's own bytes, its own string literals, and the identity of its
callees — not from the address, not from the tier file. `main.140.flat.bin` + `tools/mhgu/arm32.mjs`
(`rd32`, `disasm`, `FLAT=G:/omp works/MHGU/main.140.flat.bin`).

## Verdict distribution

| label | rows | correct | wrong:<another label> | no-evidence |
|---|---:|---:|---:|---:|
| otomo-ot | 20 | **1** | 0 | 19 |
| item | 20 | **1** | 0 | 19 |
| player-pl | 20 | **3** | 1 (`render-gfx`) | 16 |
| audio | 20 | **3** | 0 | 17 |
| kernel-os | 20 | **2** | 1 (`save-data`) | 17 |
| physics-math | 20 | **4** | 0 | 16 |
| filesystem | 20 | **4** | 0 | 16 |
| save-data | 20 | **2** | 2 (`filesystem`, `online-nex`) | 16 |
| **total** | **160** | **20 (12.5 %)** | **4 (2.5 %)** | **136 (85.0 %)** |

Two numbers matter and they are not the same number:

* **strict precision** (`correct / 20`): otomo-ot 5 %, item 5 %, player-pl 15 %, audio 15 %, kernel-os 10 %,
  physics-math 20 %, filesystem 20 %, save-data 10 %.
* **falsification rate** (`wrong / 20`): 0 % for six labels, 5 % for player-pl and kernel-os, 10 % for save-data.

Only 24 of 160 rows (15 %) can be identified from their own evidence at all; of those, **20/24 = 83 %**
carry the label the evidence supports. The remaining 136 rows are generic engine plumbing — object
constructors that only install a vtable, type-registry/message thunks, index/bounds accessors, field
setters, serialisers, jump-table state machines, import-stub wrappers, `bx lr` bodies and pieces of
over-merged retile rows. For those the label is not *refuted*, it is simply unsupported: nothing in the
function names any subsystem. That is the important reading of this table — **"tier A" measures agreement
between two predictors, not correctness**, and 85 % of these rows cannot carry an "explained" claim even
when the label happens to be true.

### How a row was judged

An evidence channel had to be one of:

1. **own literal** — a string the function itself materialises (`ldr rX,[pc,#d]` → `add rD,pc,rX`,
   `movw/movt`, or an absolute literal), read from the flat image;
2. **member-schema run** — these binaries register classes as chained descriptor nodes named by their
   member literals; for such a builder the ordered literal list is the class's member set, and the
   closing `cXxxXML` string in the same string-blob run names the class (verified on known cases:
   `mExp` closes at `cMonNyanExpXML`; the `mMaxCount..mCategoryType[7]` run closes at `cItemBaseXML`
   (the `mRare` literal in the same row sits in `cAmuletBase`'s run — also item-family);
   `mHitDataIndex/mHitWorkId/mAtkType` close at `cPlayerManyAttacksXML`; the reverb set follows
   `rSoundReverb::cSoundReverbData`);
3. **callee identity** — the direct callee's own literals (e.g. `0xbe95c4` carries
   `sSound::UpdateThread`, `0xbc9c5c` carries `%s\temp`, `0x1529a8`→`0x15339c` carries `resident` /
   `loc\%s` / `player\quest\com`);
4. **unambiguous operation** — only where the operation belongs to one label by definition (float
   cross/dot/sqrt/normalise kernels for physics-math, multi-line identical VFP op mixes).

Structural facts used to disqualify: `bl 0x7aa47c` (type-info lookup on `[obj+0x18]`), `0x887100` and
`0x2b8f0` (vtable setters: store `GOT-cell+8` at `[obj]`), `0x7bb638` (allocator, 10,268 callers),
`0x55bc7c` (lookup in the table at `[obj+0x5c]->[+4]` indexed by r1, tail-calling `0xb84114` with r2),
the `0x13efd..`/`0x13f0...` import stubs (`add r12,pc,#imm; ldr pc,[r12,#k]`), and the over-merged
retile regions where the row start is one function and the row's `insns` covers several (the adjudicated
body was cut at the first return / tail branch / literal pool).

## Five example decisions

1. **`0x250690` otomo-ot → `correct`.** 36 insns: allocator `0x7bb638`, then `str r1,[r0]` with
   `r1 = pc+0x1308197` = `0x1558873`, the literal **`mExp`**. The node is linked into a list at
   `+0x30/+0x34` (name at +0, type word 5, value pointer at +8) — a member-descriptor registration.
   In the blob, `mExp/mColorBonus/mHighRankBonus/mGRankBonus/mTension` sit between `cMonNyanExp` and
   `cMonNyanExpXML`, i.e. this is the `cMonNyanExp` member table. `cMonNyan*` is the palico
   MonNyan (Meownster Hunters) schema (`cMonNyanAdventItem`, `cMonNyanLotEnemy`, …) — otomo content.
   This is the only row of the 20 with any palico identifier.

2. **`0x51a888` player-pl → `wrong:render-gfx`.** 413 insns, 179 stores: a member-schema builder whose
   ordered literals are `mBillboard, mSort, mCameraCheck, mCameraClipping, mCameraDistance,
   mCameraCheckPosUse, mCameraCheckPos, mCheckCapsuleUse, mCheckCapsulePos, mCheckCylinderUse,
   mCheckCylinderHeight, mAlphaAnimation, mControlFlag, mUpdateMatrix` (`0x1569119..0x15691e0`). The run
   is preceded by `light1-inf1-Balance … light3-hemi-RevColor` and `Weather-change4-1-start` and followed
   by `uStageSet`/`uStageShellOwner` — i.e. the stage-set lighting/weather/billboard/culling parameters.
   Nothing player-related.

3. **`0x8771f0` kernel-os → `wrong:save-data`.** 89 insns whose own literals are
   `"storage access thread"` and `"sSavedata::cStorageThread::mEvent_%08x"`; it builds a 72-byte event
   frame and calls `0x887810`, `0x7bdbb0`, `0x86a44c`. An `sSavedata::cStorageThread` is the savedata
   storage thread, i.e. the save subsystem's I/O thread, not the OS layer.

4. **`0x84d938` save-data → `wrong:online-nex`.** 32 insns that call the NEX wrapper family
   `0x824a8c/0x8248c8/0x824770/0x824998/0x8247d4/0x8110e0`, and `0x814280` reaches `0x12db310` whose
   literal is `"SDK MW+Nintendo+NEX_DS-4_4_0"`. NEX is Nintendo's online-service SDK; this is session
   setup, not save data.

5. **`0xb61360` audio → `correct`.** Its only literal is `"SoundCurve"` (`0x1579feb`, inside the
   `rSoundCurveSet / rSoundDirectionalCurveXml / rSoundDirectionalSet / rSoundEQ` blob); the function
   builds an 840-byte frame and calls `0x82fb08`/`0x837b4c`/`0x82fb10` — a sound-curve resource routine.
   (Contrast `0xb668b4`, the neighbouring row with the *same* frame and call pair but **no** literal:
   that one is `no-evidence` in this table. Identical shape is not treated as evidence.)

## otomo-ot: does the 1/20 result reproduce?

**Yes — 1/20, and the surviving row is now named.** The 2026-10-24 review found 1 of 20 tier-A
`otomo-ot` rows genuinely otomo and recorded that the rest were UI/save-data/unclassified propagation.
Re-running the check on all 20 rows with string extraction and callee chains:

* **1 correct** — `0x250690` (`mExp` → `cMonNyanExp`, palico MonNyan schema).
* **0 provably wrong** — no row carries a literal or callee that names a *different* labelable
  subsystem; the earlier claim that the remainder are "UI/save-data" cannot be reproduced as a
  *positive* attribution from the function itself.
* **19 no-evidence** — 6 object constructors/registration thunks that only install a vtable (`0xf0758, 0x1be870, 0x333d58,
  0x533fdc, 0x4b9230, 0x1b0788`), 1 message/type-registry thunk (`0xa760`), 2 dispatchers/state machines
  (`0x1b607c, 0x5e9308`), 4 message-param builders (`0x58dbb0, 0x5f1614, 0x5f44d0, 0x5fbfa4`),
  4 accessors/release helpers (`0x4cf018, 0x25f098, 0x53f91c, 0x5f94bc`) and 2 that walk
  caller-supplied record tables (`0x145598, 0x254714`). None references `otomo`, `Otomo`, `nyanter`,
  `Ot*` or any `cOt*`/`mOtData` literal, and the union of their callees to depth 4 is 153 functions
  whose only reachable literal is a character table (`.FGIHJK79;=A??8C>B:<DELNO`).

So "guilty until proven otherwise" leaves otomo-ot at **5 % strict precision, 0 % falsified, 95 %
unsupported** — the refutation stands and the 1/20 figure is stable across the two independent samples
of the same tier.

## What a reviewer would need to overturn a `wrong`

A `wrong:<X>` row asserts the function's own evidence names subsystem X. To overturn one, show one of:

* **the literal is not the function's** — that the `add rD,pc,rX` target I attributed is produced by a
  different register (or is a table offset), so the string is not referenced by this function
  (`0xbc9ba0`, `0x14e944` are the two rows that rest on callees rather than own literals; a reviewer
  should re-run the 3-instruction idiom by hand there first);
* **the identifier is generic/borrowed** — e.g. show that the `uStageSet` member run at `0x51a888`
  belongs to quest/stage data rather than render parameters (then it would be `wrong:quest` or
  `no-evidence`, still not `player-pl`); or that `sSavedata::cStorageThread` at `0x8771f0` is owned by
  the OS layer's thread bootstrap (then `kernel-os` would stand);
* **the callee chain is a coincidence** — e.g. show that `0x84d938`'s `0x824xxx` calls are a generic
  job system that merely *also* contains the NEX version string, rather than NEX wrappers;
* **the row is a different function** — the retile table over-merges regions; if the sample's `insns`
  belongs to a function that starts later than the row start, the verdict belongs to that later start.

For a `correct` row the mirror test applies: show a second, non-matching class for the same member run
(e.g. that `mExp` also appears in a non-otomo class's member list — it does not; `mExp` occurs once in
the image) or that the float kernel is animation rather than geometry (for `0x7c359c, 0x7e174c,
0x7e3d84, 0xc30b20` the cross/dot/sqrt/normalise sequences are self-identifying). Two `correct` rows are
deliberately borderline and could reasonably be argued down to `no-evidence` without touching the
headline: `0xb61360` (audio, one literal `SoundCurve`) and `0x13bfd58` (kernel-os: it is thread/sync
bootstrap, but the two threads it creates are `AudioVideoInputReadThread`/`AudioVideoWorkerThread`, so
`audio` is a defensible alternative).

## Difficulties

**Label-immanent, not tool-related.** 85 % of the assigned tier-A rows are unidentifiable *by
construction*: they are constructors, thunks, accessors and setters whose only operand is a vtable slot
or a struct offset. Distinguishing "wrong label" from "unidentifiable generic code" therefore dominates
the work, and `no-evidence` is the honest verdict for both — this table cannot be read as "the label is
right 12.5 % of the time", only as "12.5 % of tier-A rows can be *proved* right, 2.5 % proved wrong,
85 % carry no proof either way".

Three concrete traps met while adjudicating, all of which produce false evidence if not handled:

1. **`ldm/stm` decoded as `bl`.** Testing `(w>>26)&3 == 2 && w&0x01000000` matches `ldmib/stmib`
   (`0xE98xxxxx`), which manufactures phantom callees at `0xfe8xxxxx`. It cost one wrong verdict
   (`0x489ffc` looked like it called a monster-action function); the correct test is
   `(w>>25)&7 == 5`. All callee evidence in the table was re-derived after the fix.
2. **`add rD,pc,rM` masking.** The pc-relative string idiom is `ldr rM,[pc,#d]` then `add rD,pc,rM`.
   Masking the add with `0x0FFFF000` treats the destination register as part of the opcode and misses
   every string; the mask must be `0x0FFF0000` (`== 0x008F0000`). Before the fix only 300 of 52,692
   functions had any literal; after it 3,467 do (12,117 references).
3. **"Near" strings.** Accepting a string that starts up to 16 bytes before the referenced address
   fabricates evidence (`0xb68f28` "referenced" `cGuestEffectiveAttr+20`; `0x83e7f8` "referenced"
   `app:/(near-16)`). Only exact literal targets are used in the table; the one case where a
   near-string survives in the narrative (`0x83e7f8`) is corroborated by four exact literals (`app:`, `savedata:`, `sd:`, `abs:`).

Also worth recording: the sample's `insns` column is the *retile row* length, and for 71 of the 160 rows
the row start's own body is more than 8 instructions shorter than the row (e.g. `0x184a18` 799 → 773,
`0xbb4dd8` 2305 → 82, `0x2875c0` 184 → 32), because the retile table over-merges regions: the adjudicated
body was cut at the first return / tail branch / literal pool. 12 rows have bodies of ≤ 4 instructions
(`0x136a1cc` is a single `sub sp,sp,#8`; `0x9db20c`, `0xc160f4`, `0xb62264` are bare `bx lr`), which is a
function-table artefact, not a labelling fact — they are recorded as `no-evidence` with that reason in
the evidence column.
