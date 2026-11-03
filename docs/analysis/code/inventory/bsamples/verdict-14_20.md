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

The practical consequence is narrower and more useful than "promote/don't": **in the 0x5733a4–0x667e7c span the labels are address-propagated game-domain words attached to cUIO\* class code.** Every decidable function in blocks 14–16 is a method of a `cUIO…`/`uUI…` class (vtable slot or registrar evidence), and the label mix across that sample (item / quest / otomo-ot / monster-em / online-nex / player-pl) is one class family split across six different words. Relabelling that span from class identity would move all 2,296 functions / 180,190 instructions of blocks 14–16 at once; that is a separate, larger decision than this audit.

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
