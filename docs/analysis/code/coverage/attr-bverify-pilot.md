# Tier-B verification pilot — 60 rows, 0x1000f0..0x128570

Ticket: settle the first 60 tier-B rows of `docs/analysis/code/inventory/tiers-recomputed.csv` whose start is
`>= 0x100000`, from each function's own bytes, and measure yield, label quality and tool cost before a 20-agent wave.
Output: `docs/analysis/code/inventory/attr-bverify-pilot.tsv` (60 rows, `start label conf evidence`).

**Verdict encoding.** The `label` column holds the terminal label (`weapon-wp`, `item`; `unknown` would be written
literally). The verdict word and the old label are the first field of `evidence`: `verdict=relabel was=otomo-ot; …`.
No row came out `confirm` or `unknown`, so no other forms occur. `conf` is the usual A/B: A = the row's own bytes
name the subsystem, B = the label rests on the vtable slot the row occupies or on a rule mapping.

## Block

| | |
|---|---|
| selected | 0x1000f0 … 0x128570, 60 rows, all present in `docs/data/functions-retile.csv.gz`, all tier B `src=spread` |
| instructions | 9,614 (0.39 % of tier B's 2,462,952) |
| old labels | otomo-ot 44, monster-em 10, player-pl 6 |
| distinct mnemonic skeletons | 21; 48 of 60 rows sit in a clone group (largest 28) |

The block is one contiguous run of the image, and the whole run is the **weapon / armor / amulet data-class region**:
31 class registrars for `cWeapon03`/`cWeapon04`/`cWeapon06..14` `BaseData`/`LevelData`/`MsgBase` (+XML; no 05 in
the block), 3 field-descriptor tables (bowgun/bow), 3 weapon base-class registrars, 1 shared weapon-data virtual,
and 21 rows of the `rAmuletData` / `rAmuletSkillData` / `rAmuletSlotData` / `rArmorBuildData` family.

## Result

| verdict | rows |
|---|---:|
| attempted | 60 |
| confirm | **0** |
| relabel | **60** |
| unknown | 0 |

Confidence: **A 40 / B 20**. Label pairs:

| old B label | terminal label | rows | evidence class |
|---|---|---:|---|
| otomo-ot | weapon-wp | 35 | own class-name string + `bl 0x7aedcc` (31 registrars, 3 base registrars) or 33-vtable membership (1) |
| otomo-ot | item | 9 | own class-name string (registrars), own ext string, vtable slot |
| monster-em | item | 9 | vtable slot / own vtable write |
| monster-em | weapon-wp | 1 | create template of `rArmorBuildData` |
| player-pl | item | 3 | field table (`mVersion`) + vtable slot 4 |
| player-pl | weapon-wp | 3 | own field names (bowgun/bow data) |

How far a single row carries itself:

- **47/60 rows are settled by their own bytes** — 43 by a class or field name the row itself materialises
  (pc-delta `add rD,pc,rX`), 4 by the class instance vtable the row writes (GOT word `+8`).
- **13/60 need the vtable slot the row occupies** (`ptr` word inside a class vtable), i.e. the row's own address in a
  table, not a neighbour's label. 6 destructors, 3 deserialisers, 3 field tables, 1 shared virtual.
- **0/60 needed a callee's label.** Callee labels were never used as evidence; callees were read as identities
  (`0x7aedcc` = class-record constructor, `0x7bb638` = field-descriptor allocator, `0x7aa47c` = manager lookup,
  `0x8870b8` = record constructor, `0x887100` = base-vtable reset, `0xcde9c`/`0xcdf04`/`0xce0ec` = field-record
  alloc/ctor/reader).

## Why every B label in this block was wrong

The propagated label is a copy of the **majority callee label**, and the callees are subsystem-agnostic framework
helpers that are themselves unverified tier B rows with arbitrary labels:

| measurement | count |
|---|---:|
| rows whose B label equals the label of their dominant callee | **55/60** |
| rows whose B label occurs among their callees at all | 57/60 |
| rows with no call at all (merged fragment bundles, label from elsewhere) | 3/60 |
| rows labelled by a minority callee label | 2/60 |

The carriers (dominant callee address → number of rows, all of them tier B unless noted):

- `0x7aedcc` (60 insns, **otomo-ot**) — class-record constructor: `bl 0x7aedcc(r0=record, r1=name, r2=parent,
  r3=size)` fills `[rec]=GOT+8` (vtable), `[rec+16]=parent`, links the record into a global list. Dominant callee of
  **36 rows**; 37 rows of the block call it (31 data-class registrars, 3 base-class registrars, 3 amulet-class
  registrars).
- `0x8260d4` (23 insns, **otomo-ot**) — stream-reader constructor. Dominant callee of 3 rows (the deserialisers).
- `0x7bb638` (96 insns, **player-pl**) — field-descriptor allocator. Dominant callee of 6 rows (the bowgun/bow and
  `mVersion` field tables), all of which inherited `player-pl`.
- `0x7aa47c` (7 insns, **monster-em**) — global manager lookup (`table[GOT 0x108efc0][[r0+24]]`). Dominant callee of
  4 rows (the amulet creates), which inherited `monster-em`.
- `0xcdf30` / `0xce528` / `0xcea4c` (1 insn each, **monster-em** / **otomo-ot** / **otomo-ot**, tail branches into
  the record free path) — dominant callee of 4 destructor rows.

So the tier-B label in this block is a bootstrap cycle: an unverified helper's arbitrary label votes itself into
every caller, and the voters are the helpers. This is a property of `src=spread`, not of the individual functions —
but it is why a block of 60 rows can be 0/60.

## Tool cost

| item | count | per row |
|---|---:|---:|
| `disasm()` calls on the row's own body | 21 | 0.35 |
| `disasm()` calls on helpers / neighbours (one-time) | 18 | 0.30 |
| `disasm()` calls, total | **39** | **0.65** |
| scripted probes without disassembly (block pass, vtable→class map, class-name scan, GOT-word resolver) | 4 | 0.07 |
| shell/node invocations for the whole block | ≈30 | 0.5 |
| wall clock (including reading) | ≈45 min | — |

**Median disassembly calls per function: 1** (what a row-by-row agent spends: one body disassembly). The measured
median on this block is 0, because 39 of the 60 rows are clones or template instances that a 9-second scripted pass
settled by skeleton hash + call sites + pc-delta strings + one vtable word — only 21 distinct bodies were ever
disassembled. Mean is 0.65 including the 18 one-time helper disassemblies.

## The string channel: 1,737 tier-B rows are invisible to the current tools

The retile `strings` column is empty for all 60 rows and `stringxref.tsv` has **0 of 60**, yet **43 of 60** rows
materialise a class or field name in their own instructions. Two defects in `tools/mhgu/coverage/stringxref.mjs`:

1. The pc-bias branch only runs when the loaded value is inside `.text` (`else if (inText(V)) thisDelta = V`). The
   dominant idiom here loads a bias larger than `.text` (`ldr r1,[pc,#4084]` → `0x144fa96`, then `add r1,pc,r1` →
   `0x1554662` = `"mIndex"`); `0x144fa96 > TEXT_END`, so it takes the "table hop" branch and no string is recorded.
2. `prevDelta` is a single-instruction carry with no register tracking, so `ldr rX,[pc,#imm]` …(2–6 insns)…
   `add rD,pc,rX` — the shape used by every registrar — is unseen.

Measured over the whole image (register-tracked, 40-instruction window, `strAt` printable-ASCII check):

| measurement | count |
|---|---:|
| functions with ≥1 pc-delta string | 4,717 |
| … absent from `stringxref.tsv` | 2,420 |
| … of those, tier B | **1,737** |
| … of those, the string has a `classprefix-map.tsv` prefix → label seed | **813** (3.2 % of tier B) |

8/8 spot checks are real names (`mPointPos`, `cAmuletSlotBaseXML`, `cMonNyanProcSelectLocationWindow`,
`uShellEmBase07`, `uShellEm083_sp_00_02`, `cUIOWeaponGunLance`, `mUniqueHaveShellCount[0]`, `lcm`), most of them
immediately before `bl 0x7aedcc`. Fixing the two conditions and re-running `seeds-from-xref.mjs` seeds 813 tier-B
rows with no per-function agent work; that is worth more than several agents and should precede the wave.

## Is 60 a realistic per-agent unit for a 20-agent wave?

**Cost: yes, comfortably. Coverage: no — 60 is a pilot unit, not a wave unit, and the selection rule must change.**

- Per row a full workflow is ≈1 body disassembly + 1–2 probes; worst case 60 × 3 = 180 calls, a couple of hours.
  20 agents × 60 = 1,200 rows = **4.7 % of tier B**, i.e. ≈21 waves to clear it.
- At this cost **120–150 rows/agent** is the right size (2,400–3,000 rows per wave, 9–11 waves).
- **A contiguous block is the wrong unit.** This block is one data region (21 skeletons, 48/60 rows in clone groups,
  largest 28) and scored 0/60; that number says nothing about tier B, so a wave built from contiguous blocks cannot
  estimate its own accuracy. Blocks must be **strided** (agent *k* takes every 20th B row, or every 20th *distinct
  skeleton*) and **deduped by skeleton hash before dispatch** — that alone would have turned this block's 60 rows
  into 21 adjudications.
- **The helper crib must be shared, not re-derived.** 18 of the 39 disassemblies here were spent identifying
  `0x7aedcc`, `0x7bb638`, `0x7aa47c`, `0x8870b8`, `0x887100`, `0x13f670`, `0xcdf30`/`0xcded8`/`0xcde9c`/`0xcdf04`/
  `0xce0ec`, `0x8260d4`/`0x8269f4`/`0x8263f8`. Twenty agents each re-deriving them costs 360 redundant disassemblies.
- Also fix the metric: a per-agent count of "60 functions" is misleading when 39 of 60 rows are template instances. Count
  **distinct skeletons**.

## Eight auditable examples

**1. `0x1000f0` — 63 insns, B/otomo-ot → `weapon-wp` (A).** Class registrar. `bl 0x7aedcc` at 0x100178 and 0x1001b0;
class-name strings `"cWeapon03MsgBase"` (0x1554a97) and `"cWeapon03MsgBaseXML"` (0x1554aa8) materialised by
`add r1,pc,r0` at 0x100170 / 0x10019c; `add r0,r0,#8; str r0,[r4,#0]` at 0x1001a0–0x1001a4 installs the class-record
vtable; the same body is written to a pointer table at 0x1848c38 (… `0xf990c` `0xfa4f4` `0xfaaa0` … `0x1000f0`
`0x101970` `0x1076dc` `0x107d00` …). Skeleton `af1760e7`, 28 rows of the block.
Recheck: `disasm(0x1000f0,63)`; the two names are the pc-delta targets of the `ldr r1,[pc,#imm]` at
0x10016c and 0x100180 (offsets in the literal pool 0x1001d8 / 0x1001e4).

**2. `0x127bfc` — 45 insns, B/otomo-ot → `item` (A).** Class registrar for `"rAmuletData"` (pc-delta at 0x127c70,
`ldr r1,[pc,#48]` → `0x142dbb0` → `0x1555834`), `mov r3,#112` size, `bl 0x7aedcc`, then class-record vtable
`GOT[0x17127bc]+8 = 0x173c998` = instance vtable 0x173c950 + 0x48. Amulet → `item` per `attr-strings.tsv`
(`cAmuletBase`/`cAmuletSkillBase`/`cAmuletSlotBase` are `item` A) and `attr-strings.md` (ties `amuletData.amlt` to
`rAmuletData 0x127bb8`).

**3. `0x1279d8` — 80 insns, B/otomo-ot → `item` (B).** Deserialiser of `rAmuletData`: `bl 0x8260d4(524288)` /
`0x8269f4` open a reader; `vmov.f32 s2,#30; vcmpe.f32 s0,s2; vmrs APSR_nzcv,fpscr` rejects any version ≠ 30.0f and
`vstr s0,[r4,#0x68]` stores it at **+104**, which is exactly the `mVersion` field the class's own field table
(`0x127b18`) declares at +104; `bl 0x8263f8` = element count; `bl 0xcde9c` allocates `count*16+8`; `bl 0xcdf04`
constructs each record; `bl 0xce0ec` reads it field by field; base `[r4+108]`, count `[r4+100]`. Pointer word 0x173c97c
= slot 11 of the rAmuletData vtable 0x173c950.

**4. `0x1270e0` — 15 insns, B/otomo-ot → `weapon-wp` (B).** The word `0x1270e0` is a slot in **33** class vtables,
0x1736b8c … 0x173c6e4: `cLongWeaponBase`, `cShortWeaponBase`, `cWeaponBase`, `cWeapon00..14 (no 05) BaseData`+`XML`
(weapon-wp) and `cOtWeaponBase`+`XML` (otomo weapon) — a base-class method of the weapon data family, not
subsystem-specific code. Body: `ldr r0,[r1]; ldr r2,[r0,#68]; blx r2` then `bl 0x13f670`, which packs the source id
(`GOT 0x16f9e90` high byte | 3 bytes from a `0x12a45c` lookup) into `[this]`.

**5. `0x101b9c` — 2,935 insns, B/player-pl → `weapon-wp` (A).** Field-descriptor chain builder; every call site
targets `0x7bb638` (descriptor allocator). Per field: pc-delta name → `str [r0]`; `stm r0 {type, owner}`
(type code 6 and 4 visible in the head); `str [r0+12]` = owner+4/+8/+… field offset; chain linked at +48/+52 and pushed into
`[owner+4]`. Own field names include `mReloadSpeed`, `mRecoil`, `mDownShot[0..4]`, `mUniqueShell[0..4]`,
`mUniqueShellCount`, `mBure` → heavy-bowgun data. The class which owns it is unnamed (`0x1739254`, slot 0), so the
label rests on the field names; `0x1097ac` is the light-bowgun twin (`mQuickShot`, 2,935 insns, identical skeleton)
and `0x119a18` the bow one (`mKyoku`, `mTameDankai`, `mCShotKind`, `mLoadEnableBottle`, 799 insns).

**6. `0x127bb8` — 17 insns, B/otomo-ot → `item` (B).** Four leaves merged into one retile row: (a) bounds-checked
array accessor `ldr r3,[r2,#100]; cmp r3,r1; bxls lr; ldr r0,[r2,#108]; add r0,r0,r1,lsl#4` (16-byte elements),
(b) `b 0x7af3c4`, (c) GOT getter (`0x171285c`), (d) `ldr r0,[pc,#4]; add r0,pc,r0; bx lr` returning `"amlt"`
(0x1555840). The row is glue, but the glue belongs to `rAmuletData` (vtable slot, and the ext string is the amulet
table's `amuletData.amlt`).

**7. `0x127318` — 68 insns, B/otomo-ot → `weapon-wp` (A).** Base-class registrar: initialises the per-class 10-int
block `0,0,1,2,3,4,8,9,5,6` at `[global+24..60]` (same block every registrar in the block writes) plus three packed
defaults from `bl 0x13efda0(127,0)`, `(255,255,255,255)`, `(0,0,0,0)` at +0/+4/+8; `bl 0x7aedcc` with
`"cWeaponBase"` (0x155580c, pc-delta at 0x1273f4); class-record vtable `GOT+8 = 0x173c7fc`. `0x12762c`
(`"cWeaponLevel"`) and `0x127744` (`"cWeaponMsgBase"`) are the same shape.

**8. `0x128570` — 25 insns, B/monster-em → `weapon-wp` (B).** Skeleton `6a6b55f`, the same 25-insn create template as the
three amulet classes (mnemonic-identical; only the GOT operands differ): `bl 0x7aa47c` (manager lookup) → `blx [manager+32]` alloc 112 → `bl 0x8870b8` (record
ctor, magic `0x5253`) → installs instance vtable `0x173ca64`. That vtable's class-record vtable `0x173caac` is
registered by 0x128994 with class name `"rArmorBuildData"` (0x1555872, pc-delta at 0x1289c4), size 112.
`rArmor` → `weapon-wp` by `classprefix-map.tsv` (armor data lives in the weapon/armor data block); this is the one
judgement call the repo itself flags as flippable.

## Difficulties

1. **The block rule samples one region, not the population.** "First 60 ascending ≥ 0x100000" landed inside a single
   data-class region: 21 skeletons, 48/60 rows in clone groups, one template 28×. 0/60 confirms is therefore not an
   estimate of tier-B quality, and a wave built the same way cannot report one. Stride the selection and dedupe by
   skeleton.
2. **Both string sources are empty for 43/60 rows that do name a class.** The retile column inherits the old
   region-based extraction; `stringxref.tsv` misses the dominant idiom for two concrete reasons (bias ≥ `TEXT_END`
   is misread as a table pointer; `prevDelta` carries one instruction and is not register-tracked). 1,737 tier-B rows
   are affected, 813 of them label-seedable — fix the tool before spending agents.
3. **Retile extents merge adjacent leaves.** `0x127bb8` is four functions (accessor + tail thunk + getter + ext
   getter), `0x11b2c0`/`0x11d320` carry trailing 2-insn and vtable-thunk leaves. A verdict describes the row, not one
   function; at least five rows (0x127bb8, 0x12806c, 0x1284cc, 0x11b2c0, 0x11d320) are partly glue, which caps
   any per-function precision claim.
4. **`attr-vtable-retile.tsv`'s "registrar <start>" field is wrong for this family.** It names the *preceding*
   function that contains the extension getter — "rAmuletData registrar 0x127bb8" — while the actual registrar is
   0x127bfc (it is 0x127bfc's own bytes that pass `"rAmuletData"` to `0x7aedcc`). Class names from that file are
   usable; registrar addresses from it are not, unless the class-name string xref is re-resolved.
5. **GOT-relative loads need the right mask.** `ldr rD,[pc,rX]` is `(w & 0x0FFF0FF0) == 0x079F0000`; reading these as
   plain `ldr rD,[pc,#imm]` yields a "data address" whose word is a pc-bias, which fabricates strings (I produced
   `W"\zT"` before fixing it). Any new pc-delta scan must validate that the target is printable ASCII.
6. **21/60 rows (35 %) rest on a class→subsystem judgement the rule set does not make.** `classprefix-map.tsv` has no
   `rAmulet` rule; I used `item` on the strength of `attr-strings.tsv` (`cAmulet*` → item, A) and
   `attr-strings.md` (rAmuletData ↔ amuletData.amlt). A reviewer could take `weapon-wp` from the `rArmor` precedent
   instead. The *verdict* (relabel) is unaffected; only the target label of those 21 rows is.
7. **`callers` in `functions-retile.csv.gz` is BL-only.** 57/60 rows show `callers=0` yet most are referenced from
   vtables and one from a boot-time pointer table. "No callers" here does not mean dead or leaf.

## Method (reproducible)

Scratch used (untracked, `.tmp/bverify/`): `dossier.mjs` (one row: headers, calls, pc-delta strings, GOT words, code
refs, pointer refs, body), `survey.mjs` (one compact block per row: skeleton hash, unique callees with entry identity,
pc-delta strings, vtable pointer words, clone note), `emit.mjs` (verdict map → the TSV, recomputing every quoted
address from the image), `block.json` (the 60 frozen rows). Run from the repo root with
`FLAT=G:/omp works/MHGU/main.140.flat.bin`.

Minimal recheck of any row:

```js
// node -e, repo root, FLAT set
import('./tools/mhgu/arm32.mjs').then((A) => {
  const s = 0x1000f0, e = 0x1001ec;          // start,end from functions-retile.csv.gz
  console.log(A.disasm(s, (e - s) / 4));      // body, one call per row
});
// calls: bl/blx immediate targets; pc-delta strings: ldr rX,[pc,#imm] then add rD,pc,rX (target = add+8+word)
// class identity: GOT word + 8 = instance vtable; class-record vtable = instance vtable + 0x48
```

Consumable by the meter as-is: `node tools/mhgu/coverage/report.mjs --source docs/analysis/code/inventory/attr-bverify-pilot.tsv`
(read-only for the spine; it rewrites `coverage-report.tsv`, which is why it was not run here).
