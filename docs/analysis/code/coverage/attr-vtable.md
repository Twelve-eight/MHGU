# Class-registrar → vtable → method attribution

Deliverable: `docs/analysis/code/inventory/attr-vtable.tsv` (1,375 rows, header `start	label	conf	evidence`).

**Headline of the assigned method (literal loads inside the registration site): 0 of 1,037 candidate
literals is a vtable pointer.** The registrars do install a vtable, but they install it through a
GOT slot (`ldr rX,[pc,rY]` → `add rX,#8` → `str rX,[record,#0]`), never through a literal that names
the vtable. Following that two-step instead of the literal gives a per-class vtable for **3,200 of the
3,201 classes**, and the class's own *create* function then installs a second, wider **instance
vtable** for 2,680 classes. Those two links, plus Itanium typeinfo for the 658 SDK vtables, produce the
1,375 rows below.

## Counts required by the ticket

| item | value |
|---|---|
| classes scanned | **3,201** (`docs/data/class-inventory.tsv`, every row with a non-empty `registrar_fn`/`registrar_site`) + **658** RTTI vtables considered separately |
| vtables found | **6,538** objects: 3,200 class-record vtables (registrar) + 2,680 instance vtables (via the class's create function) + 658 typeinfo-named RTTI vtables |
| vtable slots examined | 9,602 + 54,053 + 4,971 = **68,626** |
| methods attributed | **1,375** unique function starts (489 `A`, 886 `B`); of the `A` rows 289 come from the registrar chain, 7 from the class-record vtable itself, 193 from RTTI |
| dropped (slot target is not a function-list start) | 9,561 + 48,821 + 4,405 = **62,787** — see *Difficulties* |
| unmapped classes | **1,935 of 3,201** inventory classes match none of the 11 rules, plus **179 of 632** distinct RTTI class names (`nn::pia` 159, `pead` 19, 1 anonymous). Rows for unmapped classes are emitted with label `unknown` and counted, never guessed |

## Method

### 1. The assigned rule applied literally: it does not find a vtable

Window `[site-0x80, site+0x8)` around each `registrar_site` (the `bl 0x7aedcc` that registers the
class), collecting `ldr rX,[pc,#imm]` literals (and `movw/movt` pairs):

* 21,077 literal loads seen.
* 1,037 of them resolve to a value that begins a run of ≥4 consecutive 4-byte `.text` pointers.
* **968** of those are *GOT biases*: the literal is consumed by `ldr rY,[pc,rX]`, i.e. the effective
  address is `pc+8+literal`, and the word there is a class-record pointer in `.bss`
  (e.g. `0x184b2e8`, above `image_end`), never a vtable.
* **68** are *pc-relative deltas*: consumed by `add rD,pc,rX` (class-name string or table base).
* **1** (`uEms040_00`, literal `0x17e9714` at `0x5006c`) is a GOT bias whose consumer is a `b` to a
  shared tail block, i.e. the same case with a longer distance.
* Of all 1,037, the number that is later **stored into an object** (`str rX,[rB,#0]`) is **0**.

So the ≥4-run test has a 100 % false-positive rate here, and for a mechanical reason: registration
windows are full of pc-relative *string deltas* and *GOT offsets*, and both numeric ranges overlap
`.text` (strings start at `0x1500000`, jump-table data lives inside `.text`), so a run-length test
cannot tell them apart. A second, independent negative: `registrar_fn` (the column the first version of
the ticket used) is a getter thunk — e.g. `AreaAppearData` `0x4f7cd8` =
`ldr r0,[pc]; ldr r0,[pc,r0]; bl 0x7aa47c; ldr r1,[r0]; ldr r2,[r1,#52]; bx r2` — it loads a GOT
pointer to a `.bss` class object and tail-calls its vtable slot 13. It installs nothing.

### 2. What the registrar actually installs

Every registration block ends with the same epilogue (quoted from `aMap01`, site `0x20ec`):

```
000020f0: ldr r1,[pc,#32] ; [0x2118]=0x1836b14     ; GOT bias for the class record
000020f4: ldr r1,[pc,r1]                            ; r1 = *(pc+8+0x1836b14) = P
000020f8: add r1,r1,#8                              ; vtable = P+8
000020fc: str r1,[r0,#0]                            ; class-record[0] = vtable pointer
```

`P` is a per-class address in `.data`; `P` and `P+4` are always `0` (Itanium `offset-to-top` = 0,
`typeinfo` = null, which is why no name can be recovered from these vtables). Extraction across the
whole inventory: `str rX,[record,#0]` or `stm record,{...,rX,...}` with `rX = *(GOT)+8`,
3,200/3,201 classes resolved (the one exception has no such store).

The resulting class-record vtables have **3 slots** (3,198 classes) or 4 (2 classes), and their
content is uniform: slot 0 = `0x32c` (`bx lr`, shared by all 3,200), slot 1 = a per-class
one-instruction `b 0x7af3c4` stub (the "destroy" thunk), slot 2 = the class's **create/constructor**
(3,057 of 3,200 start with a `push` that saves `lr`). This is why the ticket's ≥4-run rule finds almost nothing
even when the right pointer is in hand: the object is 5 words long and only 3 of them are code.

### 3. The chain that produces real methods

The create function (slot 2) allocates the instance through the class object's vtable slot 8, then
writes the instance vtable into the new object. Quoted from `AreaAppearData` create `0x4f7960`:

```
004f7988: blx r4                       ; alloc(size = r1 = 0x30)
004f7994: add r1,r1,#8                 ; base-class vtable  = *(GOT 0x1347004)+8
004f7998: str r1,[r0,#0]
004f79cc: add r2,r2,#8                 ; the class's own vtable = *(GOT 0x1346ff8)+8
004f79d0: str r2,[r0,#0]
```

The last such write wins (162 classes have 2–3 writes: base ctor, then derived). Instance vtables have
6–286 slots (median 15, mean 20) and their slot values are the class's real methods (`push {r4,lr}`
entries in the class's own code cluster, e.g. `0x4f7b80`, `0x4f79f4`). 2,680 classes resolve this way;
520 do not (create is an abstract stub `mov r0,#0; bx lr`, or the object is built through a helper).

### 4. Why the SDK vtables are a third anchor

658 `.data` runs (≥2 code pointers) carry a non-null Itanium `typeinfo` at `vtable[-1]`: 419
`nn::nex::*`, 216 `nn::pia::*`, 21 `pead::*`, 2 anonymous. Slots are the class's virtual methods and the
typeinfo string names the class, so the attribution needs no registrar. Names are demangled with a
minimal Itanium parser and the rules are applied **case-insensitively** to the demangled name (so
`nn::nex::NgsFacade` matches `Nex`); `nn::pia`/`pead` match no rule and stay `unknown`.

### 5. Confidence

* `A` = a rule-matched class name **and** a direct install link: the slot value is stored into the
  class record by the registrar's own `str` (7 rows), or into the instance by the create function that
  the registrar-installed vtable points at (289 rows), or the vtable carries a typeinfo naming the class
  (193 rows). Every `A` row's function start is a `functions.csv` row, and where several classes install
  the same slot only the ones with the **same** rule label are accepted (`A`); different labels downgrade
  the row to `B`/`unknown` (40 rows, e.g. `0x887160`, installed by `cResource`, `rAIDynamicLayout`,
  `rAIPathBase` and further `r*` classes whose names fall into eight different labels).
* `B` = the vtable and the slot are proven, but the class name matches no rule (846 rows). Emitted with
  `unknown` so `report.mjs` ignores them; they are counted, not guessed.

## Meter

```
$ node tools/mhgu/coverage/report.mjs                 # baseline, same minute
denominator: 23885 functions, 5228277 instructions
class	functions	insns	pct_insns	pct_functions
tier A (verified)	9188	2775341	53.1%	38.5%
conf B (unverified)	14531	2448822	46.8%	60.8%
headline A only	9188	2775341	53.1%	38.5%
unattributed	166	4114	0.1%	0.7%

$ node tools/mhgu/coverage/report.mjs --source docs/analysis/code/inventory/attr-vtable.tsv
denominator: 23885 functions, 5228277 instructions
class	functions	insns	pct_insns	pct_functions
tier A (verified)	9386	2855961	54.6%	39.3%
conf B (unverified)	14335	2368308	45.3%	60.0%
headline A only	9386	2855961	54.6%	39.3%
unattributed	164	4008	0.1%	0.7%
...
tier A by label (instructions desc):
  monster-em       2461 fn    1.35 M   25.7%
  render-gfx        842 fn    0.46 M    8.8%
  online-nex       3202 fn    0.41 M    7.9%
  otomo-ot         1780 fn    0.32 M    6.0%
  ...
contribution of the extra sources (A only):
  attr-vtable.tsv                 198 fn  1.5%
```

Net: **+198 functions, +80,620 instructions, 53.1 % → 54.6 %** (+1.5 pp of .text). Note the baseline
moved between two runs of this session (9,205 → 9,188 functions) because siblings are editing the
spine concurrently; the pair above is the same-minute measurement.

Labels introduced by the 198 new `A` rows: monster-em 46, render-gfx 46, player-pl 28, otomo-ot 19,
item 17, online-nex 12, audio 11, quest 9, ui 5, weapon-wp 3, save-data 2.

### The spine changed under this run — current number and an independent cross-check

While this ticket was finishing, `docs/analysis/code/inventory/tiers-recomputed.csv` was rewritten
(`10:29:36`, `src` column now `spread` / `spread+address`, tier A 9,188 → 11,097 rows). Re-running the
same command against that spine:

```
$ node tools/mhgu/coverage/report.mjs --source docs/analysis/code/inventory/attr-vtable.tsv
denominator: 23885 functions, 5228277 instructions
class	functions	insns	pct_insns	pct_functions
tier A (verified)	11113	3246117	62.1%	46.5%
conf B (unverified)	12610	1978178	37.8%	52.8%
headline A only	11113	3246117	62.1%	46.5%
unattributed	162	3982	0.1%	0.7%
...
contribution of the extra sources (A only):
  attr-vtable.tsv                   0 fn  0.0%
```

Contribution is now 0 because **all 489 `A` starts of this file are already tier A in the new spine**
(the merge keeps the spine's row, so the file no longer adds functions). That makes the file a *check*
on the new spine rather than an addition, and the check is strong:

* **478 of 489** `A` rows carry exactly the same label as the new spine (97.8 %), although the two
  attributions share no step: mine comes from the class record / create chain, the spine's from its own
  spread+address method.
* **11 differ**; 8 of them are precisely the `Mt`-rule artifact of caveat 1, where the spine's label is
  the better one (`MtGeomCapsule` physics-math vs my render-gfx, `MtTree` kernel-os, `MtNetObject`
  online-nex, `MtNetUniqueId` online-nex, `MtFile` filesystem, plus `0x126c14`/`cWeaponBase`
  online-nex vs weapon-wp, `nLayout::ConstantBuffer` render-gfx vs ui). The remaining 3:
  `0x93b1a8` (`uEm087_088_RubbleBase`) spine render-gfx vs my monster-em.
* 379 of my 886 `B` rows are tier A in the new spine — i.e. the spine covers classes whose names match
  no rule (mostly `c*`/`r*`/`s*`/`u*` families), which this ticket's rule set cannot label.

## Caveats the main session should adjudicate

1. **`Mt|nw → render-gfx` is a proxy that covers all of MT Framework, not just rendering.** The rule is
   the ticket's and I applied it, but of the 46 new `render-gfx` rows only 5 (2,018 instructions) are
   `MtGeom*`/`MtCollisionUtil*`; the other **41 rows (9,791 instructions) are engine core**:
   `MtFileStream` 7, `MtMemoryStream` 6, `MtStream`/`MtFile`/`MtClipboardStream`/`MtMemoryCachedStream` 4,
   `MtNetUniqueId` 8, `MtNetObject` 5, `MtScalableAllocator`/`MtExHeapAllocator`/`MtDefaultAllocator`/
   `MtThread`/`MtArray`/`MtPropertyList` 7, `MtCollisionUtil::*` 4. So 0.19 % of `.text` is counted as
   render-gfx A although it is stream/file IO, networking, allocator or threading code. The spine already
   carries 0.45 M render-gfx A instructions, so these rows follow an existing convention rather than
   inventing a new one, but if the meter wants precision: `MtStream`/`MtFile*`/`MtMemory*`/`MtClipboard*`
   → `filesystem`, `MtNet*` → `online-nex`, `Mt*Allocator`/`MtThread`/`MtObject` → `kernel-os`,
   `MtMap`/`MtTree`/`MtArray`/`MtFCurve` → `physics-math`.
2. **`nn::pia` is unmatched by the rules.** 159 of the 179 unmapped RTTI class names are Nintendo's P2P
   library (`nn::pia::local::LdnProtocol`, `nn::pia::inet::NatProbe`, …). Semantically they are
   `online-nex`; the rules as written do not say so, so they stay `unknown` (146 of the 150 RTTI `B` rows;
   `pead` and the 2 anonymous typeinfos make up the rest).
3. **Region tiling inflates row weight.** 12 of the 198 new `A` rows are `functions.csv` regions larger
   than 1,000 instructions and contribute 45,717 of the 80,620 instructions. The attribution of the
   *region start* is sound (e.g. `0x334008` is a genuine `push {r4-r11,lr}` entry that is slot 4 of
   `cAcPlayerEquip`'s instance vtable), but the meter counts the whole merged region. Excluding those 12,
   the other 186 rows give 34,903 instructions = 0.67 % of .text.

## Difficulties

1. **The ticket's literal rule is structurally wrong for this binary, and proving that took most of the
   run.** `registrar_fn` is a getter thunk; the site's literal loads are name deltas and GOT biases whose
   numeric values overlap the `.text` jump tables, so "literal → run of ≥4 code pointers" fires 1,037 times
   with 0 true vtables. The vtable is reached only through `ldr [pc,rY]` (the literal is an *offset*, not an
   address), and it is 5 words long (`{0,0,bx lr,stub,create}`), so the ≥4-run threshold rejects it even when
   the pointer is in hand. I therefore report the mechanism-derived extraction and keep the strict-rule
   numbers as the negative result.
2. **62,787 of 68,626 vtable slots cannot become rows** because the slot target is not a `functions.csv`
   start — but those slots are only **25,774 distinct addresses**: 8,159 of them are eight shared stubs
   (`0x32c` `bx lr` 3,200×, `0xb54` 2,339×, `0x7af55c` 829×, plus five more) and **23,022 addresses occur
   exactly once**, i.e. real method bodies that the list merges into a containing region. `functions.csv`
   is a *tiling* of `.text` (23,885 regions, 5,228,277 instructions = the whole section); it lists 17,280
   push-prologue starts while `.text` contains 46,087 `push {...,lr}` instructions. The sharpest example:
   **3,057 of the 3,200 class create functions begin with a `push` that saves `lr` and only 41 of them are list
   starts**; the region `0x4f69bc..0x4f7cd8` (1,223 instructions) is one row but contains 21
   `push {...,lr}` starts, and `AreaAppearData`'s create `0x4f7960` (preceded by `pop {r4,r5,r6,pc}`, 383
   of the 3,200 creates have a function-ending instruction immediately before them) is one of them and
   therefore had to be dropped. **Re-tiling the function list is the highest-leverage next step**: the same
   evidence would then cover ~3,150 class create/virtual methods that are currently inside other regions.
3. **Instance vtables are inherited.** Where a derived class reuses the base `create` function, the vtable
   found is the base's. I detect the resulting label ambiguity (40 rows downgraded to `unknown`) but cannot
   tell "derived class inherits" from "two unrelated classes share a helper" without a runtime type check.
4. **`.bss` class records are unreadable statically.** `bl 0x7aedcc` writes the DTI record into
   `0x184b060–0x184c188`, past `image_end`; anything that lives there (the DTI object's own vtable at
   `[record+0]`, the class id at `[record+0x1c]`) has to be reconstructed from the initialising code, which
   is what the site scan does. A static `{name, size, ctor}` class table does not exist in this image — the
   size is always a `movw` immediate at the site.
5. **RTTI is SDK-only.** 658 vtables carry a typeinfo and all of them are middleware (`nn::nex`, `nn::pia`,
   `pead`); no game class has one, so the registrar chain is the only route to game-class methods.
6. Two anchors' worth of false starts were discarded before the final file: `vtable-crc.mjs`'s CRC32
   name-hash adjacency (0 of 4,239 `.data` runs has a matching name hash within ±0x40) and a raw
   class-name string pointer search (0 of 4,239; names are only ever materialised pc-relatively at the
   registration site, never stored as pointers).
