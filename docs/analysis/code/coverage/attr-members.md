# Member-schema attribution (`attr-members.tsv`)

Ticket: turn "members registered by name" into a general attribution mechanism, emit
`docs/analysis/code/inventory/attr-members.tsv`, run the meter, and report the tier-A movement.

**Result: 454 functions qualify (≥3 member names), 9 seeds are emitted (1 A, 8 B), 0 of them are new, and
the meter does not move — 0 functions, 0 instructions.** The mechanism is real but, in this binary, the
functions it finds are already attributed by the vtable channel, because the member-registering functions
*are* vtable slots. The evidence below is what makes that conclusion checkable rather than a shrug.

## 1. What a "member run" is, and how the tool reads it

An inline property builder registers one class's fields in order:

```
bl 0x7bb638                     ; new property record
ldr r1,[pc,#imm] ; add r1,pc,r1 ; -> member name string            (delta, not a pointer)
str r1,[r0,#0]                  ; record->name
mov r1,#TYPE                    ; type code
stm r0,{r1,rBASE}
add r1,rBASE,#OFFSET            ; member byte offset
str r1,[r0,#12]                 ; record->data
```

`bl 0x7bb638` has 10,268 call sites, so this is the dominant data-description idiom in the image.
`member-offsets.tsv` already carries 110 such records over 27 registration runs; the run's name set is the
class schema (e.g. `0x53ea0` → `BaseScale, Size, Rank, Nando, SpDieDamageType, …`, 22 names).

`tools/mhgu/coverage/member-seeds.mjs`:

1. scans every function in `functions-retile.csv.gz` for referenced strings and keeps the ones in the member
   vocabulary (the 87 `member-offsets` names plus every `mXxx` name the scan finds);
2. qualifies a function with ≥ 3 distinct member names (454 do; median 8 names, p90 25, max 604);
3. scores it against each run — how many of the run's names it registers — and against the taxonomy, using
   member names that hit a rule (`mActionNo` → monster-em, `mOtomo*`/`mNyanter*` → otomo-ot, `mShader*`/`mTexture*`
   → render-gfx, `mBGMType` → audio);
4. maps the class through `taxonomy.mjs labelOf()` only. No rule → `unknown`, never a prefix guess;
5. refuses to emit a label that contradicts an existing higher-or-equal attribution.

Confidence: **A** only when a class is named (class-inventory registrar) and the member overlap is ≥ 80 % with
≥ 3 names; **B** for everything else, including the member-vocabulary path (it names the subsystem's data
domain, not the class).

## 2. Must-fail gate (runs on every invocation)

```
node tools/mhgu/coverage/member-seeds.mjs
xref cross-check: 382/454 qualifying functions have a row, but only 4666/6526 (71%) of their member names are visible
must-fail gate: PASS (10 cases)
```

The cases live in `docs/analysis/code/coverage/mustfail-members.json`; the gate runs on every invocation and
exits 1 if any hand-picked ambiguous function is promoted to A.

| function | why it is ambiguous | verdict |
|---|---|---|
| `0x3b6790` | quest class `sQuestSelector` whose schema carries `mPoolAcNyanterEquip` | unknown (conflict) |
| `0x93b1a8` | monster-em class with one render-sounding member `mIsFromTextureCalcTangent` | unknown |
| `0x370a4c` | quest message table with one audio member `mBGMType` | unknown |
| `0x4210c` | 4-member run whose registrar `0x4201c` is not in class-inventory | unknown |
| `0x486c8` | 7-member monster-size run with no class name | unknown |
| `0x47bb0` | `cEmDouMouKaData`: enemy-looking class no rule covers | unknown |
| `0x45f3c` | `uMHProofEffectModel`: model/effect class no rule covers | unknown |
| `0x12d20` | 31 generic members (`mType`/`mIndex`/`mFlag` style) | unknown |
| `0xd4914` | 94 generic members — schema shape alone cannot name a class | unknown |
| `0x58fd0` | correct class (`rEnemyDtTune`) but only 5 of 7 names | **B** |

The gate has teeth: an earlier draft also required ≥ 2 member names to hit a rule, which made `0x3b6790`
otomo (it carries `mPoolAcNyanterEquip`) — a false positive the conflict rule now blocks, because
`attr-vtable-fixed` already says quest.

## 3. Harvest and label distribution

| label | seeds | source |
|---|---:|---|
| otomo-ot | 5 | member vocabulary (`mOtomoSkill[]`, `mOtomoTotalAtk*`, …) |
| monster-em | 2 | registrar run `rEnemyDtBase` (22/22 names), `rEnemyDtTune` (5/7) |
| render-gfx | 2 | member vocabulary (`mShaderQuality`, `mShaderNum`, …) |
| **total** | **9** | 1 A (`0x54028`, `rEnemyDtBase`), 8 B |

The distribution is skewed by construction: otomo and render member names are the only ones whose vocabulary
happens to be covered by `taxonomy.mjs` rules (`Otomo`/`Nyanter`, `Shader`/`Texture`). 445 of the 454 stay
`unknown`, and 1 is suppressed as a conflict.

Coverage overlap: 141 of the qualifying functions are already in the two seed files `recompute.mjs` reads
(`attr-xref.tsv`, `attr-vtable-fixed.tsv`); ≈ 390 are in some attribution file. The 9 seeds are all in that
overlap — `new 0`.

## 4. Meter delta

```
node tools/mhgu/coverage/recompute.mjs --functions docs/data/functions-retile.csv.gz \
  --seed docs/analysis/code/inventory/attr-members.tsv \
  --seed docs/analysis/code/inventory/attr-xref.tsv \
  --seed docs/analysis/code/inventory/attr-vtable-fixed.tsv
node tools/mhgu/coverage/report.mjs --demote docs/analysis/code/inventory/demote-otomo.tsv
```

* seed file accepted: **9**, rejected non-start 0, rejected bad label 0
* recomputed: A 26,704 (55.1 % insns), B 24,229, C 1,759
* report: tier A **25,924 functions / 2,824,295 instructions** (54.0 % / 49.2 %), unattributed 2,642 / 151,502

Run with and without `attr-members.tsv`: `tiers-recomputed.csv` is **byte-identical**.
**Δ tier A = 0 functions, 0 instructions.**

That is not a measurement accident. Every emitted seed duplicates an anchor that is already present, and
`recompute.mjs` keys anchors by start address, so the seed set is unchanged. The 9 rows are corroboration:
they independently confirm one A and eight B labels that came from the vtable channel, which is what a
schema check is supposed to do — but corroboration does not move a meter that already counted them.

## 5. Why the yield is zero (the actual finding)

The member-registering functions are **vtable slots**. `0x4210c` (10 members) sits at `0x1731588`; `0x4201c`
at `0x1731578`; `0x47bb0` (11 members of `cEmDouMouKaData`) is slot 4 of `0x1731b00`; `0x54028` (22 members
of `rEnemyDtBase`) is already "monster-em A" from its own vtable. `attr-vtable-fixed.tsv` therefore already
contains the class of nearly every qualifying function, and the member names only re-derive it.

Two consequences:

* the member channel cannot *add* coverage while the vtable channel is healthier than it — it can only check it;
* the ~65 qualifying functions the vtable channel misses have no class name anywhere: they are not
  class-inventory registrars, their own strings contain no class name (only member names), and their member
  vocabulary hits no rule.

## 6. Two defects found while building this (both reproduce)

1. **`stringxref.mjs` drops add-pc references whose delta lands in .rodata.** The delta-loaded literal is
   treated as a table pointer when its value is > `TEXT_END`, so `prevDelta` stays null and the following
   `add rD,pc,rX` is never resolved. Result: 71 % of the member names this tool resolves in qualifying
   functions (4,666 of 6,526) are visible to `stringxref.tsv`, and the add-pc-only cases are invisible
   entirely — `0x54028` (22 names: `BaseScale`, `Size`, `Rank`, `Nando`, …) and `0x58fd0` have **zero**
   rows in `stringxref.tsv`. Fixing the resolver by *register* with a 4-instruction
   lookahead raises the image-wide string-reference count and is a precondition for every string-based channel.
2. **`member-offsets.tsv`'s `fn` column predates the retile.** Its sites are in other functions — 25 of the
   27 runs have all their sites in exactly one other function (`0x53ea0` → `0x54028`, `0x479a0` → `0x47bb0`,
   `0x4201c` → `0x4210c`). The *class* in class-inventory is still correct (it is the registrar), but any
   consumer that reads `fn` as "the function that registers these members" is looking at the wrong address.

## 7. A channel I built, measured, and removed

Mapping a slot to the vtable's class also recovers classes for slots the vtable pass missed: with
`base ≤ slot·4 < 0x200` plus a code-pointer contiguity check it produced **94 new seeds**. I removed it
because vtables are laid out back-to-back in .data and the contiguity check cannot see the boundary:
`0xeca68` (28 members: `mModelId`, `mTrgLv`, `mPower`, `mTough`) came out **audio**, inherited from slot 87
of `cFueMusicScBaseXML`'s base, and `0xc61d44` (`mpEffectList`, `mEmitFlag`) came out **ui**. Sampling 11 of
the 94 gave ~3 visibly wrong classes. Restricting to slot ≤ 4 removed the errors and the yield together (0
new), because early slots are already attributed. Shipping the loose rule would have added ~94 B anchors with
a ~25 % error rate into a meter that weights every anchor equally.

If this is worth pursuing, the missing piece is a **vtable ownership model** (record length + per-record
class), not a wider window: the same structure also explains why `attr-vtable-fixed` assigns high slot
numbers to small records.

## 8. Recommendation

1. Fix the add-pc resolver in `stringxref.mjs` — it is upstream of `attr-xref`, `attr-strings` and this tool.
2. Re-key `member-offsets.tsv` by the enclosing function of each `site` (keep the registrar as the class).
3. Do not add member names to `taxonomy.mjs` to raise this tool's yield: the 454 qualifying functions are
   already covered by vtable class names, so a wider member rule changes B rows, not coverage
   (502 enemy-ish classes exist in class-inventory, 74 map today, and the 812 enemy-class vtable rows are
   already labelled monster-em).
4. The remaining 2,642 unattributed functions are not reachable from property schemas; the next lever is
   class discovery (vtable ownership), not more member vocabulary.
