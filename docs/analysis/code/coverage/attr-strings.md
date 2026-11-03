# String-only attribution of the seed-rule residue

Deliverable: `docs/analysis/code/inventory/attr-strings.tsv` (1,212 rows, header `start	label	conf	evidence`).

This is deliberately a *negative-capable* pass: the question is not "can every string-bearing
function be labelled", but "how much of the remaining string evidence actually names a
subsystem". Nothing here is derived from addresses, callers or neighbours.

## Method

1. **Universe.** `docs/data/functions.csv.gz` → 23,885 functions, 1,937 with a non-empty
   `strings` field.
2. **Seed rules.** The `RULES` array of `tools/mhgu/coverage/recompute.mjs` applied to the
   whole `strings` field, first match wins → **725 seeded** (same number the pipeline reports),
   **1,212 residue** (947,044 instructions = 18.1% of .text).
3. **Per-function decision.** Every string segment of a residue row was tested against a
   curated family table (see *Label policy* below). One label per function; when several
   segments matched, the best confidence won, then the more specific family.
4. **Confidence.**
   - **A** = a string literally names a subsystem object/type: a game class (`cAmuletBase`),
     an enemy move name (`em055_00_action_move`), a table/resource key that expands to a full
     name (`w00d` = `weapon00LevelData.w00d`, `insectabirity` = `cInsectAbirity`), or the
     middleware banner (`SDK MW+Nintendo+NEX-4_4_0-AGQ`).
   - **B** = the string only *suggests* the subsystem: abbreviated keys (`olvl`, `w00m`,
     `ssjje`), FSM state names without an `em` prefix (`action_move`, `Angry_Start`), Nintendo
     SDK / libcurl / pia fragments, scene pass names (`DepthStencil`), and systems whose
     taxonomy home is a convention rather than a name (village NPC data → `quest`).
   - **unmatched** = no string in the row fixes a subsystem. These rows are emitted with
     `conf = C` so the file records the whole residue; `report.mjs` ignores any label outside
     its `LABELS` set, so they cannot inflate the headline.
5. **Independent check of every A.** The extractor in `func-inventory5.mjs` can produce a
   string either from a *genuine pc-relative reference* or by reading printable bytes at
   whatever value a literal-pool `ldr` happened to load (that is where the vertex/glyph
   garbage comes from). I re-ran the extractor body-by-body with provenance annotations
   (`annotate2`): **462 of 462** A rows have the string produced by a real reference — 451
   form the address with `movw/movt + add rD,pc,rM`, 11 load a literal-pool pointer to the
   string. The evidence column quotes the load site, e.g.
   `"cAmuletBase" (pc-relative load at 0xce3cc)`. No A row rests on a bare printable-data
   read; and a 10–20 character class name cannot arise that way by accident.
6. **Label policy.** Name→label follows the committed `docs/analysis/code/classprefix-map.tsv`
   where that map has an entry (`cArmor*`/`cBowgun*` → `weapon-wp`, `cOt*`/`cMonNyan*` →
   `otomo-ot`, `cMix`/`cKitchenListGrill*` → `item`, `cKitchenListMenu` → `ui`, `cDLCItem*` →
   `item`). Extensions use the same reading: player weapon/armour data → `weapon-wp`,
   consumables/charms/kitchen/trade data → `item`, village NPC and area/stage data → `quest`,
   scene-object members (`mp*`) → `render-gfx`, `mpCollision`/`mpChain`/`mpCns*` →
   `physics-math`. Where the repo wiki documents the key (`weapon00LevelData.w00d` in
   `docs/wiki/damage-formula.md`, `amuletData.amlt`/`rAmuletData 0x127bb8` in
   `docs/wiki/talisman-sources.md`) the row is A, because the string expands to a documented
   table.

## Result

| verdict | functions | instructions |
|---|---|---|
| A (string names the subsystem) | **462** | 471,265 |
| B (string only suggests it) | **404** | 338,147 |
| unmatched (emitted as `conf=C`) | **346** | 137,632 |
| residue total | 1,212 | 947,044 |

A by label (functions / instructions): monster-em 188 / 319,522 · weapon-wp 70 / 19,627 ·
render-gfx 64 / 59,695 · ui 34 / 28,588 · otomo-ot 31 / 9,005 · item 25 / 7,611 ·
physics-math 13 / 9,736 · online-nex 12 / 2,271 · player-pl 9 / 3,523 · quest 8 / 4,539 ·
audio 5 / 6,134 · save-data 1 / 193 · kernel-os 1 / 97 · debug-dev 1 / 724 · filesystem 0.

B by label (functions): online-nex 112 · monster-em 97 · render-gfx 56 · quest 35 ·
weapon-wp 34 · filesystem 20 · item 17 · otomo-ot 12 · ui 6 · kernel-os 6 ·
physics-math 4 · save-data 3 · audio 2.

### Meter

Baseline (no extra source):

```
denominator: 23885 functions, 5228277 instructions
class	functions	insns	pct_insns	pct_functions
tier A (verified)	9188	2775341	53.1%	38.5%
conf B (unverified)	14531	2448822	46.8%	60.8%
headline A only	9188	2775341	53.1%	38.5%
unattributed	166	4114	0.1%	0.7%
```

`node tools/mhgu/coverage/report.mjs --source docs/analysis/code/inventory/attr-strings.tsv`:

```
denominator: 23885 functions, 5228277 instructions
class	functions	insns	pct_insns	pct_functions
tier A (verified)	9379	2874900	55.0%	39.3%
conf B (unverified)	14341	2349275	44.9%	60.0%
headline A only	9379	2874900	55.0%	39.3%
unattributed	165	4102	0.1%	0.7%

contribution of the extra sources (A only):
  attr-strings.tsv                191 fn  1.9%
```

So string evidence alone moves the headline **53.1% → 55.0%** (+191 functions, +99,559
instructions, +1.90 pp). The remaining 271 A rows in the file were already tier A in
`tiers-recomputed.csv` or in a tier-B adjudication and only add a quoted string to them.

## Ten decisions a reviewer can audit

| start | label | conf | string → why |
|---|---|---|---|
| `0x10680` | ui | A | `uUIFacility` — class-name table holding `uUIFacility`, `uUIItemShop`, `uUIKitchen` (the same function is a 53-type registrar in `class-inventory.tsv`) |
| `0xce160` | item | A | `cAmuletBase` — amulet data class; repo wiki ties `amuletData.amlt` to `rAmuletData 0x127bb8`. Prior tierB2 called this B; the class name plus the documented table makes it A |
| `0x12f7ac` | weapon-wp | A | `w00d` — `romfs/nativeNX/table/weapon00LevelData.w00d` (`docs/wiki/damage-formula.md`), so the key expands to a weapon table name, not a guess |
| `0x564bc` | monster-em | A | `rEnemyNandoData` — enemy attack-parameter table class; 3,733 instructions |
| `0xed28e8` | monster-em | A | `em055_00_action_move` — instance-named enemy move; 5,157 instructions (largest single A gain) |
| `0xe67d64` | monster-em | **B** | `action_move` — the same FSM state without an `em` prefix. Deliberately *not* A: the token names a state, not an enemy-named type. 13,748 instructions, the biggest single decision in the file |
| `0x2e808` | online-nex | B | `https://meteor.capcom.co.jp/SSL/3ds/mhxx/login_eu.cgi` — a Capcom login endpoint: network, but a URL is not a type name |
| `0x17a884` | online-nex | B | `19RelayRouteManageJobE` — a **pia** job fragment, not nex. Held at B; only `NEX`/`3nex`/`SDK MW+…NEX…` earns A |
| `0x97652c` | render-gfx | B | `DepthStencil` — scene render-pass name; 4,445 instructions |
| `0x701a8` | unmatched | C | `eventSetChrError`/`eventGetJointWPosError` — the cutscene/event system, for which the taxonomy has **no** bucket; rather than bend it into `render-gfx` the row stays unmatched |
| `0x3562f8` | unmatched | C | `cBui` — a truncated class name (10,042 instructions, largest unexplained function). Truncation is not evidence |

(Eleven rows are listed rather than ten because three of them — `0xe67d64`, `0x701a8`,
`0x3562f8` — are the honest B/`unmatched` calls a reviewer is most likely to challenge.)

## What the residue actually is

- **98 rows / 39,477 instructions** contain no 4-letter token at all: vertex, colour, glyph
  or float data that a literal-pool `ldr` pointed at, which the extractor then read as text
  (`` `#`#`#` ``, `B=B=B=B=`, `O1O1O1`). Nothing in these rows is a string reference.
- **248 rows** carry words but no subsystem name: printf formats (`%s%s%s%s%s`, 3,787
  instructions), generic words (`Default`, `system`, `resource`, `null`), truncated mangled
  C++ fragments (`MgrE`, `lClientE`, `ecInfE`, `gementJobE`) and class names with no taxonomy
  home (`cActivityBase`, `cRem`, `cBui`, `oPieceBase`, `cMediate`, `cSpActData`,
  `cGuestRemData`, `cPieceCreateList`).
- **Systems the taxonomy cannot express** are left unmatched on purpose: event/cutscene
  (`eventSetChrError`), AI navmesh (`cAIPathTrace`, `cAISvPathFinding`, `AI Task`), tutorial
  flow (`cTutorialFlowBase`), input/rumble (`mpVibration`, `NPadUpdateEvent`).
- **Nintendo SDK / bundled library code** accounts for most of the `online-nex` B block
  (112 rows): libcurl, pia, LDN, ssl, nn::account, plus the `Rabbit_RoApplicationMTFMasterReleaseNX.nss`
  build-path string. They are networking, but they are not the game's online subsystem, so
  they are B and confined to `online-nex` only for lack of a better bucket.

## Cross-checks against the existing spine

- Of my 404 B rows, **251 are already tier A in `tiers-recomputed.csv`**; of my 346
  unmatched rows, **108 are already tier A** (39,954 instructions). `report.mjs` merges only
  upward, so this file cannot demote them — but the spine's A there is not corroborated by any
  string: it comes from the address/spread agreement criterion. That is 359 functions of the
  current headline whose independent string evidence is weak or absent.
- Where I disagree with a committed adjudication I kept the string-based label and said so:
  `0x9293f0` `mpCubeMap|resource` is `render-gfx` A here (a cubemap is a scene render target),
  while `tierb-pass2/tierB2-slice-12.md` calls it `filesystem`; `0xce160` `cAmuletBase` is
  raised from B to A.
- `0x10680` is independent confirmation that the class-name registrar reading is right: the
  same address is the registrar of 53 classes in `docs/data/class-inventory.tsv`.

## Difficulties

1. **The extractor's string paths are not equally trustworthy.** A reference built with
   `movw/movt + add rD,pc,rM`, or a literal-pool pointer whose target is NUL-terminated text,
   is a real string reference; but the same `strAt(loadedValue)` code also reads whatever
   printable bytes a loaded pointer happens to address, which is how vertex/colour/glyph
   tables become "strings". Nothing in `functions.csv.gz` records which path
   produced a string, so I had to re-implement the extractor with provenance annotations
   (`annotate2`) to grade A. That re-implementation reproduced the CSV string set exactly for
   1,180 of 1,212 rows; the other 32 differ only because `func-inventory5.mjs` rewrites `,`→`;`
   and `"`→`""` when writing CSV, which is lossy for strings containing those characters.
2. **Abbreviated keys have no published expansion.** `olvl`, `otml`, `oxpb`, `oskl`, `otil`,
   `olos`, `otpt`, `tcil`, `tril`, `trdl`, `tlil`, `trll`, `tpil`, `ased`, `acrd`, `rspl`,
   `ssjje`, `ssjjp`, `cskd`, `saou`: the four-letter MH resource convention plus the sibling
   class names (`cOtLevel`, `cOtMessageLot`, `cTradeItemList`, …) make the family obvious, but
   no committed document states the mapping, so all of them are B. `w00d`/`amlt` are the only
   keys promoted to A because `docs/wiki` documents them.
3. **A class name does not always identify a subsystem.** `cActivityBase`, `cRem`,
   `cPieceCreateList`, `oPieceBase`, `cMediate`, `cSpActData`, `cGuestRemData` are unmistakably
   game classes, but no taxonomy bucket follows from the name; they stay unmatched even though
   `class-inventory.tsv` knows them. `cBui` (10,042 instructions) is the extreme case: a
   truncated name, the largest function in the residue, and nothing to be done about it.
4. **The taxonomy has no bucket for event/cutscene, AI, tutorial, input or arena-trial.** These
   are real subsystems with clear string evidence; forcing them into `render-gfx`/`ui` would
   have inflated the headline with labels a reviewer could not verify, so they are unmatched.
5. **`report.mjs` is additive-only.** 251 of my B rows and 108 of my unmatched rows already
   count as tier A (39,954 instructions for the latter). The residue therefore says as much
   about the spine's A criterion as about string evidence — a demote path
   (`--source-demote` or a tier-D verdict) does not exist and I did not add one, because that
   would change the shared meter.
6. **Judgement calls that a reviewer may flip.** `cArmor*` → `weapon-wp` and `cAmulet*` →
   `item` are inherited from `classprefix-map.tsv` and contradict each other at the edges
   (`sEquip` → `item` but `cArmor` → `weapon-wp`); `cSupportGaugeValue` → `otomo-ot` B and
   `cKitchenListSkill*` → `item` B are convention readings, not name readings. Each is one row
   in the TSV with its string quoted, so flipping any of them costs one line.
