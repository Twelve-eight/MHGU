# Tier B blocks 14-20 — per-function verdicts (84 functions, 10,235 sampled instructions)

Samples: `bsamples/s14.txt`..`s20.txt` (12 functions each, drawn once — not re-drawn).
Output: `verdict-14_20.tsv` (block / start / current label / verdict / evidence).

## Result

| block | range | block fns/insns | sampled insns | confirm | relabel | unknown | confirmed share (insn) |
|---|---|---|---|---:|---:|---:|---:|
| 14 | 0x5733a4–0x5bda98 | 599 / 60,132 | 903 | 0 | 12 | 0 | **0.0 %** |
| 15 | 0x5bde38–0x620c80 | 770 / 60,010 | 808 | 0 | 12 | 0 | **0.0 %** |
| 16 | 0x620cf0–0x667e7c | 927 / 60,048 | 994 | 0 | 9 | 3 | **0.0 %** |
| 17 | 0x667f58–0x6c4358 | 643 / 60,022 | 444 | 0 | 4 | 8 | **0.0 %** |
| 18 | 0x6c442c–0x71d264 | 426 / 60,313 | 1,237 | 2 | 1 | 9 | 58.9 % |
| 19 | 0x71db38–0x760754 | 331 / 60,434 | 3,771 | 4 | 0 | 8 | 41.5 % |
| 20 | 0x7612a4–0x79b64c | 278 / 60,370 | 2,078 | 4 | 1 | 7 | 20.5 % |
| **all** | | **3,974 / 421,329** | **10,235** | **10** | **39** | **35** | **26.6 %** |

Relabel targets: ui 34, otomo-ot 1, item 1, online-nex 1, player-pl 1, save-data 1.
Of the 5,868 decidable instructions (57.3 % of the sample) only **46.4 %** carry the label the evidence supports; the other 53.6 % are contradicted.

**Promotion decision: none of blocks 14–20 can be promoted.** Blocks 14, 15, 16 and 17 have a confirmed share of zero: not one of their 48 sampled functions keeps its current label. With 12 samples a 0/12 result only excludes a true purity above ≈22 % (95 %, rule of three), and in blocks 14–16 the direction is known too — all 33 decidable functions are contradicted, so there the labels are wrong as a set, not merely unproved (block 17 mixes 4 contradicted with 8 undecidable). Blocks 18–20 are mixed (58.9 / 41.5 / 20.5 %) and 42.7 % of their instructions stay undecidable; promoting them would launder 437 (b18) and 2,205 (b19) instructions of unproved label into tier A.

The practical consequence is narrower and more useful than "promote/don't": **in the 0x5733a4–0x667e7c span the labels are address-propagated game-domain words attached to cUIO\* class code.** Every decidable function in blocks 14–16 is attributable to a `cUIO…`/`uUI…` class — a vtable slot, constructor vtable or registrar string for 17 of the 33, the class's method block (bracketed vtable-method anchors agreeing with the registration interval) for the rest — and the label mix across that sample (item / quest / otomo-ot / monster-em / online-nex / player-pl) is one class family split across six different words. Relabelling that span from class identity would move all 2,296 functions / 180,190 instructions of blocks 14–16 at once; that is a separate, larger decision than this audit.

## Method (what counts as evidence)

Used: (1) vtable membership — I rebuilt a function→class map from all three `attr-vtable*` files (5,520 vtable bases → 27,155 method slots, each entry validated on samples: `0x562c48` sits exactly at `0x176cf74 + 4*18`, the slot attr-vtable records for cUIOFormItemWindow); (2) constructor/registrar resolution — `ldr rX,[pc,#imm]` (offset) + `ldr rD,[pc,rX]` (GOT) + `+8` reproduced every ctor vtable I could cross-check (0x60f894→cUIOPostListWindow, 0x69d78c→rAreaCommonLink, 0x644d50→cUIOUnderKeyAssign, 0x65fbb8→uUICommonUtility); (3) class-name strings recovered through the PIC `add rD,pc,rX` idiom — two registrars only, both decisive; (4) callee/caller identity from `functions-retile.csv.gz` + `tiers-recomputed.csv`, with import trampolines (0x13efd00–0x13f0fff), ≤8-instruction helpers and >200-call-site helpers excluded as generic; (5) the disassembly itself for structural signatures (vtable install, jump-table dispatch, dtor loops, memset/ctor patterns).

Not used: the current label, and the address as a label argument. The class-adjacency ("registration band") rule was measured before use and **rejected as standalone evidence**: for the 3,852 rows of attr-vtable-fixed it reproduces the class of the *next* registration site only 55.9 % of the time overall (59.5 % inside 0x573000–0x79c000; 82.6 % only when that site is 0.5–2 KB away) and of the previous one 0.1 %. It is therefore only ever used together with vtable-method brackets, never alone.

Verdict rule: class evidence (vtable slot / ctor vtable / registrar string) decides; else ≥2 distinct A-tier callees, or ≥3 distinct callees, of one subsystem and no competing family; else `unknown`. Callee labels that I could inspect and found generic (0x4edec id-table lookup, 0x88784c vtable installer, 0x2773b0 array accessor) were not counted even when tier A.

Taxonomy: `cUIO*/cUI*/uUI*` classes are labelled **ui** per `classprefix-map.tsv` ("cUI → ui"), with its explicit exceptions applied (`uUINyanjiro → otomo-ot`, `uUIShareBox → item`). Eight rows would flip under a domain-flavoured convention instead (class name carries a game word for a UI screen): 0x58ff68 (cUIOShopSmithPiece), 0x5ac23c (cUIOHNActivityMemo), 0x5b189c (cUIOHunterNoteStandard), 0x5d2e78 (cUIOMonNyanLocationBoard), 0x5d5c8c (cUIOMonNyanResultStamp), 0x5d9678 (cUIOMySetStyleInfo), 0x600ca4 (cUIOPageCounter), 0x63f26c (cUIOTradeCenterConfirm). The audit conclusion does not depend on those eight: in every case the current label is a *different* word than either candidate.

## Three examples

**0x57887c (b14, "item") — vtable slot, relabel ui.** The word at `0x176dca0 + 25*4 = 0x176dd04` is this entry point, i.e. slot 25 of cUIOComLowerButtonList's instance vtable (`0x176dca0`; class-record vtable `0x176de70`, both from attr-vtable-retile). The body is 24 instructions with one callee (`0x5c4a74`); nothing reads an item id, pouch or table. The class is a UI button list. Same shape for 0x57c0d8 (`0x176dec0+1` cUIOArrangePanel::cSetupParam) and 0x58ff68 (`0x176efe4+1` cUIOShopSmithPiece).

**0x644d50 (b16, "otomo-ot") — registrar, relabel ui.** The body builds the static class record at `r4 = pc+0x125bcac`, fills `[r4+56..92]` with the small index constants 0,1,2,3,4,8,9, then calls `0x7aedcc` with the class label loaded pc-relative at `0x644e48` — the string at `0x156ba72` reads **"cUIOUnderKeyAssign"** — and stores the class vtable `0x1777cc0` (read through the GOT access at `0x644e58`) +8 at `[r0]`. 0x65fbb8 is the same pattern with the name **"uUICommonUtility"** (loaded at `0x65fcb0`, vtable `0x177aaa8`). Two of the 84 labels are named outright by their own code, and neither is the current label.

**0x70301c (b18, "otomo-ot") confirm vs 0x6cfd8c (b18, "otomo-ot") unknown.** 0x70301c (384 insns, 26 calls) is dominated by the 0xda/0xdc palico-data cluster — `0xdafb4` thirteen times, plus `0xdaba4`, `0xdadf0`, `0xdcbbc`, `0xdcc08`, `0xdcd38` — and by A/otomo-ot `0x143894`; no other family competes, so the label survives. 0x6cfd8c (142 insns) reads singleton `0x1168ffc` through `0x3d8028` and the object behind global `0x1169320`, testing a flag byte at `[obj+1268]` and clearing `[obj+1272]/[obj+1276]`; its `0x24xxxx` callees are 0x24 status-cluster helpers while `0x3d8028/0x3d806c` are not, so two families split the evidence and the honest verdict is `unknown`.

## Caveats

- Callee labels are themselves tier-B evidence supplied by the same pipeline under audit; where a callee turned out to be a generic engine helper (0x887810/0x88784c vtable installers, 0x4edec id→table lookup, 0x13efda0 allocator) it was excluded even when labelled tier A. Several A-tier callee labels in this region are demonstrably generic — e.g. `0x88784c`, labelled A/monster-em, is an MtObject-style constructor.
- Function spans come from the retiled list; leaf/thunk functions merged into a neighbour (RETILE.md limitation) can shrink or grow the instruction weight of a verdict.
- 42.7 % of the sample is `unknown` by construction: in blocks 19–20 the callee votes split across three or four B families and the classes there (vtables 0x177c000–0x177e800) are absent from the attr tables, so their names are not recoverable with the tools at hand.

---

# Follow-up: the cUIO family as evidence, and the idioms as a tool

## 1. `attr-uifamily.tsv` — the span settled as a family file (not a block promotion)

Span: **0x5733a4–0x667e7c** (blocks 14–16, 3,295 functions by the retiled list).

| rows | conf A | conf B | excluded (domain-flavoured) | no class evidence |
|---:|---:|---:|---:|---:|
| 2,289 | 1,772 | 517 | 461 | 545 |

`conf A` = the class names itself: a **registrar string** (198 rows, e.g. 0x644d50 → "cUIOUnderKeyAssign", 0x65fbb8 → "uUICommonUtility", 0x667b6c → "uUIHud"), a **constructor vtable** resolved through the PIC GOT idiom (429 rows, e.g. 0x60f894 → cUIOPostListWindow), or a **recorded vtable slot** (1,145 rows). `conf B` = only the bracketed-method convention: the same class owns the nearest method anchors on both sides, each within 8 KB — 97 rows with both anchors from recorded slots, 394 with one anchor taken from the vtable-array extension, plus 26 `slot-run` rows.

**Excluded (461 rows, 91 classes).** 435 of them are already labelled `ui`, so excluding them changes nothing; **26 keep a domain label untouched**: item 16, render-gfx 4, save-data 2, otomo-ot 1 (plus 3 unlabelled). The eight sampled domain-flavoured rows are excluded by name, as instructed:

| start | class | file label if emitted |
|---|---|---|
| 0x58ff68 | cUIOShopSmithPiece | ui |
| 0x5ac23c | cUIOHNActivityMemo | ui |
| 0x5b189c | cUIOHunterNoteStandard | ui |
| 0x5d2e78 | cUIOMonNyanLocationBoard | ui |
| 0x5d5c8c | cUIOMonNyanResultStamp | ui |
| 0x5d9678 | cUIOMySetStyleInfo | ui |
| 0x600ca4 | cUIOPageCounter | ui |
| 0x63f26c | cUIOTradeCenterConfirm | ui |

The remaining 83 excluded classes (all `cUIO*` with a feature word — ItemPouch 28, MonNyanCannon 25, WeaponPipe 23, StyleMenu 21, SaveData 22, GuildCardEdit 21, HNActivityMemo 20, QuestCounterDetail 19, PageCountWithTouchInput 18, HunterNoteTips 17, JukeBoxList 16, Mix/MixList 36, …) appear with the same `DOMAINITY` rule: a class whose name carries a game word keeps its label unless a row carries its own class evidence.

**Meter.** The file is a normal seed file, so `merge.mjs` picks it up by name; I ran the recompute step directly (the merge wrapper also rewrites `coverage-report.tsv`, which another pass currently has in flight) and restored the output afterwards (`tiers-recomputed.csv` md5 back to `f16e46a2…`):

```sh
# baseline (every attr-*.tsv seed file except mine)
SEEDS_NO=$(ls docs/analysis/code/inventory/attr-*.tsv | grep -v uifamily | sed 's/^/--seed /' | tr '\n' ' ')
node tools/mhgu/coverage/recompute.mjs --functions docs/data/functions-retile.csv.gz $SEEDS_NO
#   -> recomputed: A 29410 (60.8% insns), B 21551, C 1731

# with the family file (the same list, attr-uifamily included)
SEEDS_ALL=$(ls docs/analysis/code/inventory/attr-*.tsv | sed 's/^/--seed /' | tr '\n' ' ')
node tools/mhgu/coverage/recompute.mjs --functions docs/data/functions-retile.csv.gz $SEEDS_ALL
#   -> seed file attr-uifamily.tsv: accepted 1421, rejected non-start 0, rejected bad label 0
#   -> recomputed: A 29609 (61.0% insns), B 21380, C 1703
```

(`merge.mjs` will invoke the same thing as `--seed docs/analysis/code/inventory/attr-uifamily.tsv` alongside the other files; the numbers above are that path, run directly so that `coverage-report.tsv` was not rewritten.)

Inside the span the effect is the point, not the headline: **A 3,076 → 3,260 functions**, and the A labels go `ui 2,850 / otomo-ot 205 / save-data 11 / item 5 / quest 3` → `ui 3,252 / otomo-ot 5 / weapon-wp 1 / render-gfx 2`. The 205 otomo-ot and the 19 save-data/item/quest labels in the span were propagation, not evidence.

Two caveats on those numbers: (a) only 1,421 of the 2,289 rows take effect — the other 868 are dropped silently, because an earlier file (the list is alphabetical, so `attr-blocks`/`attr-prefix`/`attr-strings` come first) already claims that start at equal rank and `recompute` keeps the first strongest claim; the meter prints no count for shadows, only for accepted rows; (b) the meter's tier A is *agreement between propagation and the address prediction*, so the 517 conf-B rows also land in tier A (+0.1 pp of the headline). `report.mjs --direct` counts only conf A, which is the 1,772.
One artefact worth naming: 0x65e434 is `unknown` in `verdict-14_20.tsv` (its only caller is a uUITalkCutScene method, which classprefix maps to render-gfx) but `ui` at conf B in the file (bracketed by two uUICommonUtility methods); the file's bracket rule is the authorised convention, the sampled verdict weighed the caller, and both agree the function is UI-side.

## 2. `tools/mhgu/coverage/class-from-code.mjs` — the idioms as a reusable extractor

```
node tools/mhgu/coverage/class-from-code.mjs [--start 0x..] [--end 0x..] [--channels ctor,name,slot,slot-run] [--tsv]
  → 0x<start>\t<class>\t<channel>
```

- **ctor** — `ldr rX,[pc,#imm]` (PIC byte offset) then `ldr rD,[pc,rX]` reads the GOT word at `site+8+offset`; the word is the class-record global, the vtable is that word + 8, and it is looked up in the three `attr-vtable*` tables. The value must be used as a vtable (stored, or `add #8`-ed and stored) or the function must call the registrar, otherwise the read is discarded as a name/parent slot.
- **name** — `ldr rX,[pc,#imm]` + `add rD,pc,rX` computes a real address; if it holds a class-shaped identifier (`cUIO…`, `uUI…`, `rArea…`, `sPast…`) and the function calls `0x7aedcc` (or the identifier is in `class-inventory.tsv`), that string is the class name.
- **slot / slot-run** — reuse the attribution tables as a cross-check: a recorded method slot, or an unrecorded slot of the same contiguous code-pointer array anchored at a known base.

**Whole-.text run (52,692 functions, 0.4 s):**

| with a class | by name | by ctor | recorded slot | array slot | none |
|---:|---:|---:|---:|---:|---:|
| **16,579 (31.5 %)** | 1,443 | 5,560 | 7,636 | 1,940 | 36,112 |

**7,003 functions (13.3 %) come from the two code idioms alone** — no metadata, no string column. Precision, where two channels overlap: ctor vs recorded slot agrees on the class in **88.9 %** of 3,961 pairs; ctor vs registrar name in **81.2 %** of 1,370 pairs.

Class shapes: **2,454 distinct classes**, mean 6.8 functions, median 5. The curve is flat, so the class is a real unit but not a concentrated one — top 10 classes cover 12.9 % of the classified functions, top 100 cover 26.6 %, top 500 cover 51.4 %, top 1,000 cover 71.9 %. Largest: `nFestaNetwork` 625, `nNetwork` 296, `uShellEm024_sp_02` 277, `sCollision` 172, `uShellEm038_sp_02` 161, `cRemoteCall` 144, `nDraw` 131, `nCollision` 129, `cRemoteProcedure` 125, `uEmXXX` 75, `sSound` 68, `nGraphComponent` 59.

Applying `labelFor` (class-prefix rules only, no guessing) maps **6,582 functions (12.5 %, 7.9 % of instructions)** to a subsystem. The gap is mostly the engine families above — `n*`, `sCollision`, `cRemoteCall/Procedure`, `uShellEm0xx`, `sSound` — which need a taxonomy decision before the tool can label them; that is a table edit, not new reverse engineering.

**Recommendation: per class, with per-function for what the classes do not cover.** 2,454 class-level decisions buy 16,579 functions (6.8 each); the 1,000 largest classes alone buy 72 % of them, and each decision is checkable against one class name plus its method set. The other 36,113 functions (68.5 %, and the bulk of the instruction weight in blocks 17–20) have no class signal at all — the extractor finds nothing in them, so they stay per-function or `unknown`. The tool is cheap enough (0.4 s, image-only) to re-run after any retiling, and it is the natural seed generator for the next wave.
