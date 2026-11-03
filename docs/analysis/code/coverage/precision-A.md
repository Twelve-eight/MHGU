# Coverage-label precision audit — group A

Scope: the 120 sample rows in `docs/analysis/code/coverage/samples.tsv` whose label is one of
`monster-em`, `online-nex`, `render-gfx`, `quest`, `ui`, `weapon-wp` (all 120 are tier A, i.e. rows the
coverage meter counts as "explained"). One verdict per row is in `precision-A.tsv`.

## Headline

| label | rows | correct | wrong | no-evidence | correct share |
|---|---:|---:|---:|---:|---:|
| monster-em | 20 | 9 | 0 | 11 | 45 % |
| online-nex | 20 | 5 | 0 | 15 | 25 % |
| render-gfx | 20 | 2 | 0 | 18 | 10 % |
| quest | 20 | 1 | 1 (`wrong:ui`) | 18 | 5 % |
| ui | 20 | 8 | 0 | 12 | 40 % |
| weapon-wp | 20 | 3 | 0 | 17 | 15 % |
| **total** | **120** | **28** | **1** | **91** | **23 %** |

`no-evidence` is not a pass. It means the function's own bytes, its string references and its
callees do not identify the labelled subsystem, so the meter's "explained" claim for that row is
unsupported (the label may still be right — nothing in the code proves it). Read the table as:
**23 % of tier-A rows in these six labels are verifiably correct, 0.8 % are provably wrong, and 76 %
carry no evidence for the label at all.** That is consistent with the 2026-10-24 `otomo-ot` sample
(1/20 genuinely otomo) and with `src=spread` on every row of `tiers-recomputed.csv`: the labels were
propagated, not derived.

## Method (and the evidence standard actually applied)

For every row: full-body disassembly (head + tail), every `bl` target identified by reading it, and
**string references resolved properly**. This mattered more than anything else:

* Data references in `main.140.flat.bin` are **pc-relative deltas**, not absolute addresses:
  `ldr rX,[pc,#imm]` loads a delta, and `add rY,pc,rX` (or `ldr rY,[pc,rX]`) computes the final
  address. Reading the delta as an address produces a *plausible but wrong* string, because the
  name pool at `0x1540000-0x15a0000` is dense. Example: in `0x5bd8` the pool word is `0x154b255`,
  which happens to land on a mangled `nn::swkbd` symbol; the real target of `add r1,pc,r0` at
  `0x5c0c` is `0x1550e69 = "roQuest.cro"`. I initially recorded the swkbd red herring and corrected
  it after re-resolving with the add-pc semantics.
* Resolving deltas this way recovers **4 948** real string references image-wide, but only **14 of
  the 120 sampled functions contain any resolvable string at all**, so most verdicts had to rest on
  behaviour and callee identity.
* Verdict rule used:
  * `correct` — the function operates on the labelled subsystem's characteristic data/state (enemy
    action dispatch; GUI element/panel tables; weapon stat blocks; quest resource objects), **or**
    contains a string that names it, **or** calls a function whose body names it;
  * `wrong:<label>` — the bytes positively identify another labelled subsystem;
  * `no-evidence` — generic code (locator thunks, ctors/dtors of unidentified classes, getters,
    serializers, container/list helpers, bare math) with no subsystem marker.
* Deliberate strictness: constructors/destructors that only install a vtable constant and zero
  fields were **not** credited to the label, because the vtable constant is the only link and
  nothing in this image maps a vtable back to a class name (see Difficulties).

## Five auditable decisions

1. **`0x122e8c` weapon-wp → `correct`.** The body registers a member-descriptor list and its own
   pc-relative sites `0x122fc0`, `0x123034`, `0x1230ac`, `0x123120`, `0x123198`, `0x12320c`,
   `0x123284`, `0x1232f0` resolve to `"mLevel"`, `"mKireType"`, `"mKireLevel"`, `"mAttack"`,
   `"mDefense"`, `"mAffinity"`, `"mElementValue"`, `"mSlotCount"` — the weapon
   sharpness/attack/defence/affinity/element/slot block. Reproduce:
   `node -e` scan of `0x122e8c..0x123368` for `ldr rX,[pc,#imm]` + `add rY,pc,rX`.
2. **`0x5bd8` quest → `correct`.** Builds a 264-byte object (module locator + descriptor
   `vtable+32`) and passes a name to `0x122c`; the name site `0x5c0c` resolves to `"roQuest.cro"`
   (`0x1550e69`). A quest resource object.
3. **`0x55f238` ui → `correct`.** Its own string sites (`0x55f494`…`0x55f608`) are the software
   keyboard mode table: `SOFTWARE_KEBOARD_MODE_FULL` / `software_keboard_mode_full` / `name`,
   `..._PASS_NUMBER` / `password`, `..._HUNTER_RANK` / `hunter rank`, `..._ROOM_ID` / `room id`,
   `..._TRANSFER_PASS_NUMBER`; the callee `0x861ddc` additionally references `NGWordList`.
4. **`0x66f0a8` quest → `wrong:ui`.** 496 instructions of screen-flow logic: five-state jump table on
   `[this+72]`, panels obtained with `0x65cb3c` (`this->panel[]` at `[this+0x34]`), state queries
   `0x62c078`, and the tail `b 0x65e794` is a screen transition; the "quest" calls (`0x678598`,
   `0x6798d4`) are data requests issued *by the screen*.
5. **`0x23d0a4` (quest) vs `0x4c106c` (weapon-wp) — both `no-evidence`.** These two are the same
   template: 808-byte stack frame, `0x82772c` buffer init with (524288, 4096), `0x827bbc` writing the
   float at `[this+0x68]`, `0x827998` writing the count at `[this+100]`, a stride-12 loop over
   `[this+108]` with one per-entry callback (`0x238a6c` vs `0x4b0d30`), then `0x8277c4`. Two
   byte-identical serializers cannot both be owned by different subsystems, and neither function
   contains anything subsystem-specific — a compact demonstration that the two labels came from
   address ranges, not from evidence.

## What would overturn the `wrong` verdict

The single `wrong` (`0x66f0a8`, quest → ui) can be overturned by showing that the object indexed by
`0x65cb3c` at `[this+0x34]` is **not** a UI panel/widget array, and that `b 0x65e794` is not a
screen transition — e.g. by naming the class that owns the `[this+72]` state machine (its vtable
constant, its name getter, or its constructor), or by showing that the same `[this+0x34]` array is
consumed as quest records by a function that reads quest ids/objectives. Note the verdict is
"the labelled subsystem is wrong", not "the function is a UI function in the strictest sense": any
positive identification of the owner as a quest-data class would flip it to `correct`.

For the 91 `no-evidence` rows the burden is different: they are not claims that the label is wrong.
To move one to `correct`, a reviewer needs one of (a) a string inside the function naming the
subsystem, (b) a class/vtable→name mapping for the vtable constant the function installs, or (c) a
data layout that is unique to the label (e.g. enemy action ids, quest objective records, weapon
stat fields). Any of these would also be a good way to *raise* the meter's precision.

## Difficulties

1. **Almost no strings.** 14/120 rows reference any resolvable string, and 4 of those are single
   member names (`mIndex`, `mVersion`) that do not identify a class. Most rows are therefore judged
   on behaviour and callee identity only.
2. **pc-relative deltas masquerade as pointers.** As described above, treating a pool word as an
   address yields convincing false strings from the dense name pool. This nearly produced a
   fabricated `nn::nex NetworkInfo` label for `0xf8c` (whose real class getter returns
   `"AngleLimit"`). Every string claim in `precision-A.tsv` was re-verified with the add-pc
   semantics.
3. **No recoverable class table.** No 32-bit word in the image points into the type-name pool
   (`0x1540000-0x15a0000`), so ctors/dtors/forwarders that only install a vtable constant cannot be
   attributed to a class. That is the direct cause of most `no-evidence` verdicts: 59 of the 91 are
   constructors, destructors, factories, forwarders/thunks, getters and setters, i.e. exactly the
   shapes whose only subsystem link is the unresolved class.
4. **Entity-struct functions are not enemy-specific.** The state machine base at `[this+0x1428]`
   (with the `+0x1a0/+0x1a1` state bytes) is touched by 164 sites spread over the whole image, and
   player, otomo and NPC code share the same actor layout, so "operates on an actor" could not be
   used as evidence for `monster-em`. Only functions that drive the action dispatcher
   (`0xaff40`, whose 4 398 callers sit in the 0xce0000-0x1120000 block, with only 2 outside it)
   were credited.
5. **Function boundaries include trailing class stubs.** Several sampled ranges contain extra
   compiler-generated getters after the sampled function (e.g. `0x69ddfc`'s range contains the
   global getter at `0x69de78` and the name getter at `0x69de88`). I attributed a name getter to a
   row only when it lay inside the row's own range and returned a string that matched the body's
   domain; otherwise it was ignored.
6. **`wrong` needs a label from a fixed taxonomy.** Two rows clearly do *not* match their label but
   their real owner has no label in the taxonomy (`0x3d838c` handles the script command
   `"setup_npc_talk_cut"`; `0x69ddfc`'s class getter says `"areaeatdat"`). Both are recorded as
   `no-evidence` with the contradicting string in the evidence column rather than forced into a
   wrong label.
