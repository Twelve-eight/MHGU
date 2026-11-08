# guard-7420 — is `em[0x7420]` ever written? (the second half of `if (bit7 && em[0x7420] != 0)`)

Image: `MHGU-private/main.140.flat.bin`, sha256
`a8cfb11465470184c9ed191ec28283dfb73d2adbcfeb878398f5103f1357d515` (25,472,632 bytes; the same image and
hash as the `0x1408` census in `guard-writers.md`). `vaddr = flat - 0x100`; `.text` = `[0x100, 0x13f1dec)`.

Script: **`G:/tmp/EMC/want-7420.mjs`** (v2; run by Main, output `G:/tmp/EMC/want-7420b.out`; v1 output kept
at `G:/tmp/EMC/want-7420.out`). The v2 copy Main installed in the repo is
`MHGU/tools/audit/guard-gate-7420.mjs` and reproduces these numbers exactly.

## Verdict

**PASS — the byte has writers, so the guard is not a dead conjunction.** 701 `movw #0x7420` sites were
walked; 8 distinct store instructions address the byte at `+0x7420` of their base object, spread over
5 functions (`0x6d8c4`, `0xaf368`, `0xb161c`, `0xb167c`, `0xb16e0`):

- **6 sites can store a non-zero byte** — `0xb1654` = `1`, `0xb16b8` = `1`, `0xb1784` = `1`,
  and three computed `(a == b) ? 1 : 0` arms at `0xb1674`, `0xb16d8`, `0xb17a4`.
- **2 sites store zero** — `0xaf388` (`mov r1,#0`) and `0x6dae8` (whole-word store of the `r6 = 0`
  register that clears a whole block of `0x73xx`/`0x74xx` fields).

This is a **shared state flag, not a single event bit**: it is recomputed on the em-update path
(`0xc9e80` → `0xad7b4` → `0xadb3c` → `0xb16e0`, and `0xb161c`, `0xb167c`), and it is cleared by the two
resets `0xaf368` and `0x6d8c4`. It is **read** by 1421 distinct load/test sites — by far the dominant use.
Split by value provenance: **4 data-dependent writers** (W2, W4, W5, W6 — three compare two `0x49694()`
results, one stores `r8` whose nearest definition is `mov r8,#1` but which a caller-controlled path may
redefine) and **4 statically decided** (W1 = 1, W3 = 1, W7 = 0, W8 = 0). The script's own count is
`WRITERS-NONZERO 5` because it cannot follow `r8` back past the site; with the `WRITER-SRC` back-scan the
true split is 6 non-zero-capable / 2 zero-only.

**One line on what this implies:** `if (bit7 && em[0x7420] != 0)` can fire on *every* dispatcher pass in
which bit 7 is re-raised (`0xc4b44`) while that byte is non-zero, and cannot fire while it is zero — so it
is repeatable within a hunt, gated by a state flag that other subsystems set *and* clear, rather than a
one-shot latch.

## Writers (vaddr, instruction, value)

`WRITER` lines are the script's dataflow verdict; `resolved` is the hand-checked value.

| # | store | instruction | script verdict | resolved value | function | what resolves the value |
|---|-------|-------------|----------------|----------------|----------|--------------------------|
| W1 | `0xb1654` | `strb r1, [r4, r0]` (r0=`0x7420`) | nonzero | **1** | `0xb161c` | `0xb1650 mov r1,#1`; the other arm of `tst r1,#8` |
| W2 | `0xb1674` | `strb r0, [r1, #0]` (r1 = `em+0x7420` via `0xb166c add r1,r4,r1`) | unknown\|zero\|nonzero | **`(r0 == r5) ? 1 : 0`** | `0xb161c` | `0xb1668 moveq r0,#1` / `0xb1670 movne r0,#0` after `0xb165c cmps r0,r5`; r5, r0 = two `bl 0x49694` results |
| W3 | `0xb16b8` | `strb r1, [r4, r0]` | nonzero | **1** | `0xb167c` | `0xb16b4 mov r1,#1` |
| W4 | `0xb16d8` | `strb r0, [r1, #0]` (`add r1,r4,r1` at `0xb16d0`) | unknown\|zero\|nonzero | **`(r0 == r5) ? 1 : 0`** | `0xb167c` | `0xb16cc moveq r0,#1` / `0xb16d4 movne r0,#0` after `0xb16c0 cmps r0,r5` |
| W5 | `0xb1784` | `strb r8, [r4, r0]` | unknown | **1** | `0xb16e0` | `WRITER-SRC`: nearest prior def of r8 is `0xb1750 mov r8,#1`, not written again before the store |
| W6 | `0xb17a4` | `strb r0, [r1, #0]` (`add r1,r4,r1` at `0xb179c`) | unknown\|nonzero\|zero | **`(r0 == r5) ? 1 : 0`** | `0xb16e0` | `0xb17a0 moveq r0,#1` / `0xb1798 movne r0,#0` after `0xb178c cmps r0,r5` |
| W7 | `0xaf388` | `strb r1, [r4, r0]` | **zero** | **0** | `0xaf368` | `0xaf384 mov r1,#0` (right after `0xaf37c strb r1,[r4,0x7424]` with `r1=255`) |
| W8 | `0x6dae8` | `str r6, [r4, r0]` (whole word) | unknown | **0** (byte 0 of word 0) | `0x6d8c4` | `WRITER-SRC`: `0x6d8e4 mov r6,#0`, unchanged over the whole 0x20-store clear block |

Store chains (from the script, `CHAIN-FOR` lines) — the three offset-folded arms are the ones a
"same-register within N instructions" scan cannot see:

```
0xb1660 movw r1,#0x7420 / 0xb166c add r1,r4,r1 / 0xb1670 movne r0,#0 / 0xb1674 strb r0,[r1,#0]
0xb16c4 movw r1,#0x7420 / 0xb16d0 add r1,r4,r1 / 0xb16d4 movne r0,#0 / 0xb16d8 strb r0,[r1,#0]
0xb1790 movw r1,#0x7420 / 0xb179c add r1,r4,r1 / 0xb17a0 moveq r0,#1 / 0xb17a4 strb r0,[r1,#0]
```

Control flow that reaches the writers (from `refs_to`, `pointers=false`):

```
0xc9e80 (no static caller: reached via a runtime pointer, [U])
  ├─ 0xc9cf4 bl 0xacc8c ── 0xacc94 bl 0x6d8c4     ; full em field reset (W8)
  ├─ 0xc9f34 b  0xad7b4 ─┬ 0xad890 bl 0xb167c     ; W3/W4
  │                      └ 0xad988 bl 0xadb3c ── 0xadb8c bl 0xb16e0   ; W5/W6
  └─ 0xc9eb4 b  0xaf368                            ; W7 (0x7424 := 255, 0x7420 := 0)
0xb161c ← 0xccc78 (fn 0xcc86c, no static caller -> vtable/handler, [U])  ; W1/W2
0xb167c ← 0xad890, 0xb9ae4
```

Reads (all read-only, no write in the same walk): e.g. the guard `0x8295c`; the second guard-shaped
test in the same dispatcher at `0x82b68`; `0xc475c` (gates `em[0x141c] = 300.0f` and `bic` of bits 5,9,10
of `em[0x1408]` on bit 9); `0xc47d8` (`ldrbne` + `cmpne`, bit-7 arm only); `0xc3a6c`, `0xc3fa0`,
`0xc401c`, `0xc458c`, `0x6d5d8`, `0x8258c`, … 1421 events in total.

## Escapes

**0 escape events.** No walked path stored the pointer `em+0x7420` to non-stack memory or passed it in
`r0-r3/r12` to a callee, so no callee can write the byte through a pointer it never receives from these
sites. `ESCAPES 0`, `DYNAMIC 0` (no register-offset access with an unknown offset through a known field
pointer), `OPAQUE 10` (all 10 in sites `0xe28a4c`, `0xf4a0b4`, `0xf98f0c`, which are unrelated to the
writers — see Difficulties).

What *does* exist is the **address-of idiom**: `movw r0,#0x7420; add r0,<obj>,r0; str r0,[sp,#N]` builds
`&em[0x7420]` into a stack slot. Four such sites were examined: `0x10a84a4` (`str r0,[sp,#60]`, later used —
the walk records an op at `0x10a8558`), and `0x834c0`, `0xd78c1c`, `0x100a4f4` (address built, use outside
the walked path). So a callee writing through a *stack-saved* `&em[0x7420]` is not excluded in principle;
none was observed. Bound, not proof — see Scope.

## Scope

- **Site basis**: every materialisation of the constant `0x7420` in `.text` —
  `SITES total=701 movw=701 movimm=0 ldrlit=0` (`first=0x6d5d4`, `last=0x1141f90`). `0x7420` is not
  encodable as an ARM rotated immediate, so `mov #0x7420` cannot exist: `LANE-ROTIMM sites=0` is a decoder
  self-check that must be 0.
- **Per site**: a CFG dataflow walk (constants, `base+off` pointer identity, stack-saved pointers, the byte
  value's `zero/nonzero/exact/unknown` state, calls kill `r0-r3/r12` and are checked for pointer escapes).
  Caps: 2500 instructions, queue 60, 3 visits per pc.
- **Coverage caveat**: 480 of 701 sites carry a flag (`loop-cap` mostly, 3 `truncated`, 1 `queue-cap`);
  i.e. for those sites the walk stopped early. The negative "no other writer" is therefore a **bound**,
  not a proof. It is however consistent with two independent lanes (Controls E, F).
- **Read side**: `reads=1421` distinct read/test events; `writes=8`; `bitfields=0`; `ops=2`.
- **Unattributed**: `NOFIELD count=2` (`0x834c0`, `0xd78c1c`).
- **Cross-enumeration discrepancy [U]**: the MCP device `literal_loads {"values":["0x7420"]}` reports
  **699** hits while my sweep reports **701** over the same range; the device's listing was truncated in
  display so the two-pair difference could not be identified. It does not affect any writer (all 8 lie in
  the address range covered by both).
- **Un-examined**: the 480 capped sites beyond their cap; writes through a stack-saved `&em[0x7420]`
  handed to a callee (none seen); the initial value of the byte in a save/profile.

## Controls

- **(a) The guard read is found and is read-only.** `GUARD-SITE 0x82958 reads=2 writes=0 tests=2`:
  `0x82958 movw r1,#0x7420` → `0x8295c ldrb r1,[r4,r1]` → `0x82960 cmp r1,#0` → `0x82964 beq 0x82b0c`.
  No store, no immediate/register op and no bitfield on the byte anywhere in that walk. Its sibling store
  `0x8298c str r0,[r6,#0]` is on `em+0x1408` (`r6`), not on `0x7420`, and is correctly absent from the
  writer set — a **must-fail** for the offset attribution.
- **(a2) Split-offset read (must-pass for the arithmetic).** The same walk records
  `READ 0x82b68 ldrb r1,[r2,r1]` where `0x82b38-0x82b3c` set `r2 = em+0x1428` (`ldr r1,[r2,r1]!`) and
  `0x82b64 movw r1,#0x5ff8`: `0x1428 + 0x5ff8 = 0x7420`. The tool resolves `+0x1428` and `+0x5ff8` into the
  same byte as the direct `[r4,#0x7420]` form, i.e. it is doing offset arithmetic, not string matching.
- **(b) Other fields written through the same base.** `OTHERFIELD count = 2182` stores within 0x40 of the
  byte, e.g. the same clear block `0x6dae4` writes `+0x7424` at `0x6db40`, `+0x742c` at `0x6db70`,
  `+0x7410` at `0x6de10`, and `+0x744c` at `0x6db78` — while only `0x6dae8` is attributed to `+0x7420`.
  This is the direct proof that `base+offset` attribution discriminates neighbouring fields.
- **(c) Must-fail.** (i) the 2 address-only sites `0x834c0` / `0xd78c1c`
  (`movw r0,#0x7420; add r0,<obj>,r0; str r0,[sp,#N]`) produce **no** read and **no** write — materialising
  the constant is not counted as an access; (ii) the four `0x1408` `bic` sites of the sibling census
  (`0xc3d44`, `0xc4368`, `0xc4388`, `0xc46b4`) are absent from this writer set; (iii) the guard's own
  `0x8298c` store is absent (see a).
- **(d) Known-positive value resolution.** `WRITER-SRC 0x6dae8 srcReg=r6 nearestDef=mov #0x0 @0x6d8e4`,
  `WRITER-SRC 0xb1784 srcReg=r8 nearestDef=mov #0x1 @0xb1750`; the folded arms show
  `moveq r0,#1` / `movne r0,#0` inside their `CHAIN-FOR` blocks. Hand disassembly of `0xaf368`,
  `0xb1630`, `0xb1684`, `0xb16e0` and `0x6d8c4` agrees with all of them.
- **(e) Independent lane (offset register, no dataflow).** For every `str/strb` in `.text` with a register
  offset, take the offset register's *nearest preceding definition*; if it is `movw #0x7420`, it is a write.
  `LANE-REG total=5`, and **all 5 are in the DFS writer set** (`LANE-REG-CONTROL` found for
  `0xb1654`, `0xb16b8`, `0xb1784`, `0x6dae8`, `0xaf388`). The other 3 writers use the folded
  `add rX,base,#0x7420` form and are structurally invisible to this lane, which is exactly the documented
  limitation of offset-only scans.
- **(f) Positive control for "no immediate-form store exists".** `LANEOFF total=0` is **structurally
  guaranteed** (an immediate offset > 0xFFF cannot be encoded in ARM imm12) and is therefore *not* used as
  evidence anywhere; the script prints that note itself.

## Self-FalsificationCheck

- **H1 "0x7420 is a read-only flag, no writer exists".** Falsified: 8 stores cover the byte (2 statically
  `1`, 2 statically `0`, 3 computed `(a==b)?1:0`, 1 whole-word `0`). v1 of the script reported 5; the
  three offset-folded stores were missed by v1 and recovered after the fix.
- **H2 "the writers are for a different object, not em".** Partially falsified / bounded: the writers'
  base is the arg-0 object of functions that also read `[obj+0x1428]` as a pointer (`0xb1634-0xb163c`,
  `0xb1698-0xb16a0`, `0xb16e8-0xb16f4`) and write `obj+0x7424` — the same field set the dispatcher writes
  on `em` (`0x7304`, `0x72fc`, `0x72fd`, `0x1408`, `0x1418`, `0x1414`). Struct-type identity is therefore
  established [B]; instance identity across the driver call is not statically provable [U].
- **H3 "the guard's byte is written by a hidden helper".** Checked: `ESCAPES 0` — no walk passed
  `em+0x7420` to a callee in `r0-r3/r12` or stored it to non-stack memory. Address-of sites exist but keep
  the pointer on the stack. Not fully excluded (a callee reached with a *stack-saved* pointer).
- **H4 "the counts are a detector artefact".** Two independent enumerations (DFS and the nearest-def
  offset-register lane) agree on the 5 direct-form writers; 6 hand-disassembled writers (after fixing my
  own address typo, see Difficulties) are all present; the must-fail controls (address-only sites, the
  `0x1408` sites, the guard's own store) are all absent. The three folded-arm writers were verified by
  hand from the encodings before any tool found them.
- **H5 "the byte's non-zero state cannot persist, so the guard fires once".** Falsified in direction:
  nothing clears the byte except `0xaf388` and the reset block `0x6d8c4`, and both are branches of the
  driver `0xc9e80` (tail calls at `0xc9eb4` / `0xc9cf4` / `0xc9f34`), i.e. alternative states, not a
  universal post-frame clear. Whether a given hunt re-enters the set path each frame is runtime state [U].

## Difficulties

- **Own detector bug (v1 → v2), found by hand-disassembling the neighbourhood of the writers.** v1 missed
  `0xb1674`, `0xb16d8`, `0xb17a4` because the offset is folded into the pointer
  (`movw r1,#0x7420; add r1,r4,r1; ... strb r0,[r1,#0]`) and `add rX, rY, #const` produced no pointer when
  `rY` was untagged. Fix: an untagged addend yields a *synthetic* object pointer, so `[rX,#0]` stores are
  attributed as `base+0x7420` exactly like the `[r4,r0]` form. Effect: writers 5 → 8, `NOFIELD` 11 → 2.
  Cost: one extra full run. The lesson generalises: a census that only recognises `[base, regOffset]`
  silently loses the compiler's folded-offset form.
- **Cosmetic bug in v2**: `effAddr` does not propagate the `syn` flag, so `WRITERS-VIA-SYNTHETIC-BASE`
  prints `0 of 8` even though the three folded writers came in through that path. Identification was done
  from the `CHAIN-FOR` lines instead; no verdict depends on the flag.
- **My own must-pass list had a wrong address**: I listed `0xb16cc` as a writer; `0xb16cc` is
  `moveq r0,#1`, the store is `0xb16d8`. The `MANUAL-WRITE 0xb16cc MISSING` line in the output is my
  addressing error, not a tool miss — the tool had already reported the store at `0xb16d8`.
- **480/701 sites hit the DFS caps** (mostly `loop-cap`), so the negative half of the census is bounded.
  The two independent lanes and the 6 hand-verified writers bound it further, but a writer inside a capped
  region that also escapes both lanes (e.g. a folded offset in a path never walked) cannot be excluded.
- **Cross-enumeration discrepancy [U]**: `literal_loads` says 699 sites, my sweep says 701, same range,
  and the device output was truncated in display so the difference could not be localised. Cheap closure:
  dump both site lists to files and diff.
- **`NOFIELD` is not a clean must-fail**: both remaining sites are *address-of* sites
  (`0x834c0`, `0xd78c1c`) whose pointer is used outside the walked path (one is flagged `truncated`, one
  `loop-cap`). They do show that forming the address does not create an access, but they are not evidence
  that those two functions never touch the byte.

## Unknown

- Which game states drive the 5 non-static writers (`0xb1784`'s `r8 = 1` path is gated by
  `[*(em+0x1428)+0x1a8] & 8`, `0x49624() == 1`, `*[0x1787610->0]+80 != 6`, `0x49554() == 1`,
  `em[0x7423] == 0`; the three `(a == b)` arms compare two consecutive `0x49694()` results).
- Whether `em[0x7420]` is non-zero at the moment the dispatcher runs in a given frame (ordering of
  `0xc9e80`'s branches versus the dispatcher).
- The instance identity of the writers' `r4` object with the dispatcher's `em` (struct-type identity
  established, instance identity not statically provable).
- Initial value of the byte before `0x6d8c4`/`0xaf368` run (save/profile data).
