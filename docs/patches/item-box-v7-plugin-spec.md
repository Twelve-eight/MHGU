# MHGU 1.4.0 item-box V7 - plugin port specification (native AOT recompiled build)

Status: draft, 2026-10-23. Scope: port `patch/1.4.0.pchtxt` (123 patch lines) to a
mod-host plugin for the SUYU-GURecomp AOT export of MHGU 1.4.0 (`0100770008DD8000`,
NSO build id `FB08F1D20FD1204FE7070672777F869B`).

Coordinate convention used everywhere below: **vaddr**. The pchtxt lines are **flat
file offsets**; `vaddr = flat - 0x100` (pchtxt header line 9: "Lines = flat file
offsets (vaddr+0x100), no offset_shift"). Example: pchtxt `00199004` is vaddr
`0x198F04`.

Sources read for this document:

- `G:/omp works/MHGU/patch/1.4.0.pchtxt` (123 lines).
- `G:/omp works/MHGU/tools/build-v7-final.mjs`, `tools/v7-shift-65.json` (per-line intent).
- `G:/omp works/MHGU/DEVELOP.md`, `DEVLOG.md`, `docs/analysis/**`,
  `.tmp/reports-mhgu/{preset-deadzone,ui-page-bound,recovery-report,equip-box}.md`
  (site semantics and original instruction words).
- SUYU-GURecomp sources/docs under `G:/omp works/.tmp/ext/SUYU-GURecomp/` (facts only).

---

## 1. Can a plugin patch code by writing `.text` bytes? (premise)

### Answer

**No. In the AOT-recompiled build, writing guest `.text` bytes at runtime does not
change the behaviour of any already-recompiled block.** Every one of the 123 pchtxt
lines is an instruction word in `.text`, so **0 of 123 lines can be ported as a
memory write; all 123 must be expressed as hooks** (`mark(pc)` + `on_dispatch`), or
be covered by a hook that replaces the enclosing function/block.

There is a second, independent mechanism the plugin can use: *new* code placed in
guest memory (e.g. `guest_alloc`) has no recompiled block and therefore runs on the
dynarmic A32 JIT (`mod_host_api.h:124-126`, `arm_recomp32.cpp:1243-1262`). That
makes JIT trampolines and patched block copies possible, but it still requires a
hook at the original block start to divert control there. It does not make `.text`
writes effective.

### Evidence

| # | file:line | statement |
|---|---|---|
| 1 | `src/core/arm/recomp/arm_recomp32.cpp:1409-1413` | `ArmRecomp32::InvalidateCacheRange`: "Recompiled code is fixed at build time; only the fallback caches anything." It forwards invalidation **only** to the dynarmic fallback. The A32 backend used by MHGU never re-lifts or re-links a static block. |
| 2 | `src/core/arm/recomp/arm_recomp.cpp:1256-1264` | Same design on the other backend, stated explicitly: "Statically recompiled code is fixed at build time; there is no translation cache to invalidate. Self-modifying guest code is consequently unsupported by this backend by construction." `ClearInstructionCache()`/`InvalidateCacheRange()` are empty. (Corroboration; MHGU runs the A32 backend.) |
| 3 | `src/core/arm/recomp/mod_host.cpp:147-149` | `ApiMemWrite` is `ApiMemValid(addr,size) && Mem().WriteBlock(addr,data,size)`. It performs the guest-memory copy and nothing else: no code invalidation, no block re-translation, no hook. |
| 4 | `src/core/memory.cpp:987-990`, `src/core/memory.cpp:322-364` | `Memory::WriteBlock` -> `WriteBlockImpl` -> `WalkBlock` copies bytes into guest memory. No instruction-cache call. |
| 5 | `src/core/arm/recomp/arm_recomp32.h:24-36` | Blocks come from the a32recomp lifter and are baked into the exported image; only "a PC with no block, an instruction the lifter did not translate, or Thumb code" goes to the dynarmic JIT. A written instruction word is not re-lifted. |
| 6 | `tools/a32recomp/README.md` (section "What changed in suyu", and "Results") | "one function per basic block, built into the exported exe"; main is 4.06M instructions lifted ahead of time. Confirms instructions are decoded at export time, not at run time. |
| 7 | `src/core/arm/recomp/mod_host.cpp:160-162` | `ApiIsBlock(pc)` is true only when `pc` is 4-aligned, inside the hook range, and `g_lookup(pc) != nullptr` - i.e. only at a recompiled **block start**. |
| 8 | `src/core/arm/recomp/mod_host.cpp:164-166`, `recomp_hooks.cpp:29-39`, `recomp_hooks.h:9-13` | `mark(pc)` sets one bit in a bitmap checked by generated code on chained branch targets: "Recompiled blocks call static branch targets directly (block chaining); the generated code checks this bitmap and returns to the dispatcher for a marked target". A marked address that is not a block/branch entry is never consulted. |
| 9 | `mod_host_api.h:115-117` | "is_block = a recompiled block starts at pc (hookable). mark = the dispatcher calls on_dispatch whenever the game is about to run pc (also when reached by a chained branch)." |
| 10 | `mod_host_api.h:208-212` | `on_dispatch(pc, cpu, thread_key)`: "Change cpu freely; return true if r15 (cpu->r[15], cpu->thumb) now points somewhere else. Runs on the game's threads, concurrently: keep it short and thread-safe." |
| 11 | `mod_host_api.h:124-126` | `call()`: "Code without a recompiled block (or an untranslated instruction) runs on the JIT, so a call may enter code a mod loaded into guest memory." |
| 12 | `docs/a32recomp/CHANGELOG.md:9` | "a guest call into code that has no recompiled block (Thumb, code a mod loaded itself) now runs on the emulator's JIT instead of failing." |

### Why the pchtxt works on yuzu but not here

On yuzu the game runs on dynarmic, which decodes guest memory; the IPS/pchtxt write
changes the bytes dynarmic later decodes (yuzu applies these patches to the loaded
image before the game runs). In the AOT export, the same bytes are only an input to a build
step performed once; the exported image contains native C/blocks with the old
immediates baked in. `mem_write` reaches the guest mapping, not those blocks.

### Consequences for the port

1. Each patched instruction must be reproduced by a hook. Two implementation
   primitives are available:
   - **emulate one instruction**: at a hook pc equal to the site, set the register
     result (or flags, for `cmp`) in `ModHostCpu`, set `r[15] = site + 4`, return
     `true`. The next pc has no block, so the JIT executes the rest of the block and
     returns to AOT at the next block start.
   - **clone a block**: at the enclosing block start `B <= site`, run a patched copy
     of `B..site` placed in guest memory (JIT), ending with a branch to `site + 4`.
     This is required whenever the site is not itself a block start.
2. A hook only fires at a **block start**. The site address must therefore be probed
   with `is_block(site)` at `on_game_start`; if false, walk backwards 4 bytes at a
   time (`is_block`) to find the containing block start. `is_block` is the exact,
   authoritative test (evidence row 7); no static approximation is needed at run
   time.
3. `mark()` is permanent and `on_dispatch` is concurrent. Hook bodies must be
   re-entrant and lock-free; per-thread state must be keyed by `thread_key`.
4. Writing `.text` can still be useful for **code that the JIT is about to
   translate** (e.g. a block copy the plugin creates itself), but it is not a
   supported way to change AOT behaviour: the mod API has no JIT cache-flush call
   (`mod_host.cpp:147-149` never calls `InvalidateCacheRange`; the only invalidation
   entry point is the CPU interface, `arm_recomp32.cpp:1409-1413`). Treat any
   reliance on stale/fresh JIT translations of patched `.text` as UNCONFIRMED.

**Counts:** code sites = **123**, data-only sites = **0** (all 123 addresses are
4-byte instruction words below the `.text` end `0x13F1DEC`; none is in
`.rodata`/`.data`).

---

## 2. Per-site port table

Strategy values:

- `emulate` - hook at the site itself; the site must be a block start
  (`is_block(site)`). Set the result register/flags in `ModHostCpu`, set
  `r[15] = site + 4`, return true. The JIT executes the rest of the block.
- `clone` - hook at the enclosing block start `B` (probed at run time by walking
  back 4 bytes from the site until `is_block(B)`); run a patched copy of `B..site`
  from `guest_alloc` memory (JIT) and branch to `site + 4`.
- `replace-fn` - hook a function entry and return a constant instead of running the
  body.
- `not-needed` - the line is covered by another hook in this table.

Known function entries are cited; every other "block start?" cell is `[I]` and must
be settled with `is_block` at `on_game_start`. Original words for lines 1-22 are
from the verified table in `.tmp/reports-mhgu/recovery-report.md` section 6.2
("V6 全部 22 行的原始指令复核（全部命中）"); lines 23-24 are discussed in the note
after this chunk. The `#` column is the **pchtxt line number** (1-based, inside the
`@enabled` block); the table is in pchtxt order.

| # | vaddr | original insn | patched insn | purpose | strategy | block start? |
|---|---|---|---|---|---|---|
| 1 | `0x198F44` | `movw r2,#0x2406` | `movw r2,#0x2ED6` | reverse-scan2 sentinel: last A slot moves from `0x1A+4*2300-4` to `0x1A+4*2992-4` | `emulate` at site, or `clone` at site (same pc; covers #1-#3) | **entry**: `tiers.csv` `0x198f44,19` |
| 2 | `0x198F48` | `movw r12,#0x8FB` | `movw r12,#0xBAF` | reverse-scan2 lane bound 2299 -> 2991 | `clone` at `0x198F44` (shares #1's clone) | `[I]` 2nd insn of fn `0x198F44` |
| 3 | `0x198F4C` | `movw r3,#0x8FD` | `movw r3,#0xBB1` | reverse-scan2 lane bound 2301 -> 2993 (odd-slot lane) | `clone` at `0x198F44` (shares #1's clone) | `[I]` 3rd insn of fn `0x198F44` |
| 4 | `0x198FA0` | `movw r12,#0x8FC` | `movw r12,#0xBB0` | forward slot-search bound 2300 -> 2992 | `clone` at fn `0x198F90` | `[I]` interior of fn `0x198F90` |
| 5 | `0x198FEC` | `movw r2,#0x2408` | `movw r2,#0x2ED8` | reverse-scan end pointer (`0x1A+4*N`) | `clone` at fn `0x198FE8` (covers #5-#6) | `[I]` interior of fn `0x198FE8` |
| 6 | `0x198FFC` | `movw r2,#0x8FC` | `movw r2,#0xBB0` | reverse-scan count 2300 -> 2992 | `clone` at fn `0x198FE8` (shares #5's clone) | `[I]` interior of fn `0x198FE8` |
| 7 | `0x19A4F8` | `movw r7,#0x8FC` | `movw r7,#0xBB0` | save serializer slot loop count | `clone` at fn `0x19A4EC` | `[I]` interior |
| 8 | `0x19A568` | `movw r5,#0x8FC` | `movw r5,#0xBB0` | save deserializer slot loop count | `clone` at fn `0x19A55C` | `[I]` interior |
| 9 | `0x3E8A10` | `movw r1,#0x8FC` | `movw r1,#0xBB0` | runtime clear-loop count | `emulate` if `is_block(site)`; else `clone` at `B` | `[I]` looks like a routine entry, not in `tiers.csv` |
| 10 | `0x19A548` | `mov r2,#0xFF0` (DP imm) | `movw r2,#0x985` | preset block write length 4080 -> 2437 (=14*170+57) | `clone` at fn `0x19A4EC` (shares #7's clone) | `[I]` interior |
| 11 | `0x19A5C0` | `mov r2,#0xFF0` (DP imm) | `movw r2,#0x985` | preset block read length | `clone` at fn `0x19A55C` (shares #8's clone) | `[I]` interior |
| 12 | `0x19AB04` | `cmp r12,#0x18` | `cmp r12,#0x0E` | `anyPresetNonEmpty` scan bound 24 -> 14 | `clone` at fn `0x19AAEC` | `[I]` interior (`preset-deadzone` §1.1) |
| 13 | `0x19AB4C` | `cmp r1,#0x17` | `cmp r1,#0x0D` | `isPresetUsable` bound 23 -> 13 | `clone` at fn `0x19AB48` (1-insn prefix) | **entry**: `0x19AB48` (`preset-deadzone` §1.1) |
| 14 | `0x19ABB0` | `cmp r1,#0x18` | `cmp r1,#0x0E` | `getPresetPtr` bound 24 -> 14 | `clone` at fn `0x19ABA8` | **entry**: `0x19ABA8` |
| 15 | `0x19ABCC` | `cmp r1,#0x18` | `cmp r1,#0x0E` | `getPresetPtr2` bound 24 -> 14 | `clone` at fn `0x19ABC4` | **entry**: `0x19ABC4` |

Notes for this chunk:

- Lines 1-3 are all in the function entry block of `0x198F44`; one clone (or one
  `emulate` at the entry plus clone for #2-#3) serves all three. Because `0x198F44`
  is a function entry and the first instruction is the patch itself, the cheapest
  correct hook is `emulate` at `0x198F44`; the clone for #2-#3 then starts at the
  same pc and must include the patched word for #1.
- `cmp` emulation must reproduce all four flags exactly (`N,Z,C,V`) before jumping
  to `site+4`; the conditional branch that consumes them may be several
  instructions later and will run on the JIT with the marshalled flags
  (`ModHostCpu.n/z/c/v`, `mod_host_api.h:52-58`).
- Line 10-11's original is a DP immediate `mov r2,#0xFF0`, not a `movw`; the
  patched form is `movw`. Emulating it means `r2 = 0x985` either way.

| 16 | `0x19ABE8` | `cmp r1,#0x17` | `cmp r1,#0x0D` | `applyPreset` bound 23 -> 13 | `clone` at fn `0x19ABE0` | **entry**: `0x19ABE0` |
| 17 | `0x19A8E4` | `movw r0,#0x23F0` | `movw r0,#0x2EC0` | heap buffer `malloc` 9200 -> 11968 B | `clone` at fn `0x19A8D8` | **entry**: `0x19A8D8` (`ui-page-bound` §1) |
| 18 | `0x19A8F4` | `movw r2,#0x23F0` | `movw r2,#0x2EC0` | heap `memcpy` length (copy-out on open) | `clone` at `0x19A8D8` (shares #17) | `[I]` interior |
| 19 | `0x19AA44` | `movw r2,#0x23F0` | `movw r2,#0x2EC0` | heap copy length (third copy routine) | `clone` at `B` (probe) | `[I]` no documented entry; `tiers.csv` has none at this address |
| 20 | `0x19AA90` | `movw r0,#0x23F0` | `movw r0,#0x2EC0` | heap `malloc` in copy-out routine | `clone` at fn `0x19AA88` | **entry**: `0x19AA88` (`ui-page-bound` §1) |
| 21 | `0x19AA9C` | `movw r2,#0x23F0` | `movw r2,#0x2EC0` | heap `memcpy` in copy-out routine | `clone` at `0x19AA88` (shares #20) | `[I]` interior |
| 22 | `0x19AAB4` | `movw r2,#0x23F0` | `movw r2,#0x2EC0` | heap `memcpy` copy-back length | `clone` at fn `0x19AAB0` | **entry**: `0x19AAB0` (`ui-page-bound` §1) |
| 23 | `0x198F04` | `push {r4,lr}` | `movw r0,#0xBB0` | capacity getter: short-circuit the obfuscated `1000+300*popcount+200*bits` formula | `replace-fn` at `0x198F04`: `r[0]=0xBB0`, `r[15]=r[14]`, return true | **entry**: `tiers.csv` `0x198f04,16` |
| 24 | `0x198F08` | `ldr r0,[pc,#0x30]` | `bx lr` | getter return | `not-needed` (covered by #23's hook) | n/a |
| 25 | `0x198E74` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity (first of 30) | `clone` at `B` (probe) | `[I]` |
| 26 | `0x198F38` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity in the getter epilogue | `not-needed` when #23 replaces the getter (the hook returns before `0x198F38`); otherwise `clone` at `0x198F04` | inside fn `0x198F04` |
| 27 | `0x1990BC` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 28 | `0x199174` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 29 | `0x19925C` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 30 | `0x1992D8` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |

Notes for this chunk:

- **#23 original-instruction conflict, resolved.** `ui-page-bound.md` §5 lists the
  originals one line lower (`ldr r0,[pc,#0x30]` at flat `0x199004`,
  `ldr r0,[pc,r0]` at `0x199008`). The same report's per-instruction listing starts
  at `0x198F08 ldr r0,[pc,#0x30]`, and `preset-deadzone.md` §3 states the originals
  are `push {r4,lr}` at `0x198F04` and `ldr r0,[pc,#0x30]` at `0x198F08`. That
  reading is used here. It does not affect the port: `replace-fn` executes neither
  instruction. `ui-page-bound.md` §2.1 also records that the getter only reads
  globals and has no side effects, so replacing it is safe.
- **#23 must also handle the ABI.** The original function is
  `push {r4,lr} ... pop {r4,pc}`; the hook returns with `r[15]=r[14]` and never
  touches the stack. Do not call the original body. All 19 UI callers then read
  2992 and `ceil(2992/100)=30` pages (`ui-page-bound.md` §4).
- **#26** matters only if the getter is *not* replaced. With `replace-fn` it is dead
  code; without it, the modified `#24` (`bx lr`) also returns before `0x198F38`,
  so it is dead either way.
- **#17-#22** are six separate `movw #0x23F0` encodings in four routines; the
  +0xAD0 growth makes every one of them 0x2EC0 (11968 B). A missed site
  overflows/copies short (DEVLOG: V1 missed them and wrote 11968 B into a 9200 B
  buffer).
- **#19** has no documented function start. Probe: `is_block(0x19AA44)`; if false,
  walk back. `equip-box.md` §2.4 groups the *copy* path around `0x19AA88` /
  `0x19AAB0` / `0x19AAC4`; `0x19AA44` is a different routine in the same file and
  must be verified, not assumed.

| 31 | `0x19941C` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity (inlined copy of the getter's `+1000`) | `clone` at `B` (probe) | `[I]` |
| 32 | `0x1994F0` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 33 | `0x199618` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 34 | `0x1996A0` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 35 | `0x199718` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 36 | `0x19980C` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 37 | `0x199900` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 38 | `0x199998` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 39 | `0x199A10` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 40 | `0x199AC8` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 41 | `0x199B68` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity, inside the A->B aggregate rebuild loop | `clone` at fn `0x199AE4` | `[I]` interior of fn `0x199AE4` (`preset-deadzone` §2.2) |
| 42 | `0x199BEC` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity, A->B rebuild | `clone` at fn `0x199AE4` (shares #41) | `[I]` interior of `0x199AE4` |
| 43 | `0x199DE8` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity, B->A copy-back area | `clone` at `B` (probe) | `[I]` (`0x199D6C` is the documented B->A fn; membership to verify) |
| 44 | `0x199E40` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity, D-flag area | `clone` at `B` (probe) | `[I]` |
| 45 | `0x199F34` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity (D-flag/aggregate path) | `clone` at `B` (probe) | `[I]` |

Notes for this chunk:

- All 15 lines are the same transformation: the 30 inlined copies of
  `capacity = 1000 + 300*popcount(flags & 7) + 200*bits` end in
  `add r0,r0,#0x3E8` (`ui-page-bound.md` §2.3, 30/30 original words
  `e2800ffa`). The patch replaces the add with a constant 2992, discarding the
  upgrade-bit contribution. Emulation therefore **sets** `r[0]=0xBB0`, it does not
  add.
- `add` (no S bit) does not write flags and `movw` does not either, so flag
  preservation is automatic for rows 25-54.
- One clone can cover several rows if they are in the same block: #41/#42 are both
  in `0x199AE4`'s rebuild path; if the block containing them also contains
  `movw #0x47FA` (#55 in the next chunk) and `movw #0x240A` (#1 of the shift
  group), a single clone patches all of them.
- `0x199AE4` is the sort/compress path called from the item-box UI (7 callers,
  `preset-deadzone` §2.2). This is the hot path for the layout change: leaving any
  of #41-#45 unpatched writes past the old array boundaries.

| 46 | `0x199F9C` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 47 | `0x19A020` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 48 | `0x19A1D8` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 49 | `0x19A248` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 50 | `0x19A2C0` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 51 | `0x19A348` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 52 | `0x19A3F0` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 53 | `0x19A464` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity | `clone` at `B` (probe) | `[I]` |
| 54 | `0x19AFC0` | `add r0,r0,#0x3E8` | `movw r0,#0xBB0` | inline capacity (last of 30) | `clone` at `B` (probe) | `[I]` |
| 55 | `0x199C10` | `movw r14,#0x240A` | `movw r14,#0x2EDA` | B aggregate-table base (id half of B[0]) | `clone` at fn `0x199AE4` | `[I]` interior (`preset-deadzone` §2.2) |
| 56 | `0x199C9C` | `movw r0,#0x240A` | `movw r0,#0x2EDA` | B aggregate-table base (write side) | `clone` at fn `0x199AE4` (shares #55) | `[I]` interior |
| 57 | `0x199D84` | `movw r0,#0x240A` | `movw r0,#0x2EDA` | B -> A read base in the copy-back loop | `clone` at fn `0x199D6C` | `[I]` interior (`preset-deadzone` §2.2) |
| 58 | `0x199B20` | `movw r0,#0x240C` | `movw r0,#0x2EDC` | B count half of B[0] (`strh` at `+0x240C`) | `clone` at fn `0x199AE4` | `[I]` interior |
| 59 | `0x199C00` | `movw r12,#0x240C` | `movw r12,#0x2EDC` | B count base in the rebuild loop | `clone` at fn `0x199AE4` | `[I]` interior |
| 60 | `0x198E88` | `movw r1,#0x47E0` | `movw r1,#0x52B0` | `memclr` length for A+B (`8 B/slot * 2300`) | `clone` at `B` (probe) | `[I]` not the ctor `0x198BB0` (address is lower) |

Notes for this chunk:

- **#55-#59 confirm B/C/D are relocated, not enlarged.** New B spans
  `0x2EDA..0x52CA` = `0x23F0` bytes = 2300 records; new C spans
  `0x52CA..0x64C2` = `0x11F8` = 2300 halfwords. The patch header calls this
  "layout shift 0xAD0", and the arithmetic in #60 proves it: new A `0x2EC0` + old
  B `0x23F0` = `0x52B0`. B is still 2300 entries, although the box now holds 2992
  slots and B is indexed by item id (up to 2991 distinct ids). **This is a live
  overflow risk, not a port artefact** - see section 4, risk R2.
- #55/#56/#58/#59 are in the A->B rebuild (`0x199AE4`), which walks item ids
  `0..0xBAE` and writes one B record per distinct id (`preset-deadzone` §2.2). The
  same block also contains inline-capacity rows #41/#42; one clone can cover
  several rows.
- #57 is in the B->A copy-back `0x199D6C`. Its loop reads `B[0..count)` and writes
  `A[0..count)`; with the shift, both bases are wrong unless this line (and #56)
  are applied together.
- #60 is the ctor-like `memclr(obj+0x1A, len)` for A+B. The companion `memclr`
  covering A+B+C is #62/#63 in the next chunk (`0x59D8 -> 0x64A8`). Both lengths
  must change together or the new tail is left uncleared.

| 61 | `0x199B04` | `movw r0,#0x47FA` | `movw r0,#0x52CA` | C array start (u16 table, init `0xFFFF`) | `clone` at fn `0x199AE4` | `[I]` interior (`preset-deadzone` §2.2) |
| 62 | `0x198C00` | `movw r1,#0x59D8` | `movw r1,#0x64A8` | `memclr(obj+0x1A, len)` covering A+B+C (`0x59D8 = 10 B * 2300`) | `clone` at fn `0x198BB0` (ctor) | **entry**: `0x198BB0` (`preset-deadzone` §0) |
| 63 | `0x198C98` | `movw r1,#0x59D8` | `movw r1,#0x64A8` | same `memclr` in the second init routine | `clone` at fn `0x198C74` | **entry**: `0x198C74` (`preset-deadzone` §0 note) |
| 64 | `0x199EEC` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D flag-array base (`2300 x 1 B`) | `emulate` at site if `is_block(0x199EEC)`; else `clone` | **entry** `[I]`: `ui-page-bound` §3 names `0x199EEC` as a function |
| 65 | `0x199F54` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base (same routine family) | `clone` at `B` (likely `0x199EEC`) | `[I]` |
| 66 | `0x199FBC` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 67 | `0x19A11C` | `movw r1,#0x59F2` | `movw r1,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 68 | `0x19A1F8` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 69 | `0x19A268` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 70 | `0x19A2E0` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 71 | `0x19A368` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at fn `0x19A360` | `[I]` 8 B into fn `0x19A360` (`ui-page-bound` §3) |
| 72 | `0x19A414` | `movw r0,#0x59F2` | `movw r0,#0x64C2` | D base | `clone` at `B` (probe) | `[I]` |
| 73 | `0x19A4E0` | `movw r1,#0x59F2` | `movw r1,#0x64C2` | D base, serializer path | `clone` at `B` (probe) | `[I]` |
| 74 | `0x716A28` | `movw r2,#0x59F2` | `movw r2,#0x64C2` | D base read in UI code | `clone` at `B` (probe) | `[I]` UI function, not in `tiers.csv` |
| 75 | `0x717388` | `movw r2,#0x59F2` | `movw r2,#0x64C2` | D base read in UI code | `clone` at `B` (probe) | `[I]` UI function |

Notes for this chunk:

- **#62/#63 again prove B and C keep their 2300-entry sizes.**
  `0x59D8 = 0x23F0 (A) + 0x23F0 (B) + 0x11F8 (C) = 10 B * 2300`;
  `0x64A8 = 0x2EC0 (new A) + 0x23F0 (B) + 0x11F8 (C)`. If B or C had grown, this
  constant would not be `0x64A8`. The layout shift makes room for A only.
- **#64-#73 are ten D-base sites** (the patch header said "D 0x59F2->0x64C2").
  Only #71 (`0x19A360`) and arguably #64 (`0x199EEC`) have a named function from
  the reports; all others need `is_block` probing. A missed D-base site makes the
  D flag array alias the new C tail, which silently corrupts slot flags after page
  23.
- **#62/#63 must be hooked together.** They are the same `memclr` constant in two
  init routines; if only one changes, the two constructors disagree about the
  object layout.
- The `movw` at #64 (`0x199EEC`) is the function's first instruction per the
  report's naming. If `is_block(0x199EEC)` is true, `emulate` is valid; otherwise
  the report's function-start claim is wrong and the enclosing block start must be
  probed.

| 76 | `0x71BF8C` | `movw r3,#0x59F2` | `movw r3,#0x64C2` | D base read in UI code | `clone` at `B` (probe) | `[I]` |
| 77 | `0x71C694` | `movw r3,#0x59F2` | `movw r3,#0x64C2` | D base read in UI code | `clone` at `B` (probe) | `[I]` |
| 78 | `0x19A8FC` | `movw r1,#0x62D6` | `movw r1,#0x6DA6` | backup-source adjustment: `sub r5,r7,#imm` must still yield `obj+0x1A` (`0x6DC0-0x6DA6=0x1A`) | `clone` at fn `0x19A8D8` (shares #17) | `[I]` interior |
| 79 | `0x198BE8` | `movw r1,#0x62F0` | `movw r1,#0x6DC0` | heap pointer field `obj+0x62F0` in the ctor | `clone` at fn `0x198BB0` (shares #62) | **entry**: `0x198BB0` |
| 80 | `0x198C80` | `movw r1,#0x62F0` | `movw r1,#0x6DC0` | heap pointer field in the second ctor | `clone` at fn `0x198C74` (shares #63) | **entry**: `0x198C74` |
| 81 | `0x198CE4` | `movw r0,#0x62F0` | `movw r0,#0x6DC0` | heap pointer in destructor 1 (free + store 0) | `clone` at fn `0x198CC8` | **entry**: `0x198CC8` (`ui-page-bound` §1) |
| 82 | `0x198D40` | `movw r0,#0x62F0` | `movw r0,#0x6DC0` | heap pointer in destructor 2 | `clone` at fn `0x198D24` | **entry**: `0x198D24` |
| 83 | `0x19A8EC` | `movw r1,#0x62F0` | `movw r1,#0x6DC0` | heap pointer in open-box copy+verify | `clone` at fn `0x19A8D8` | **entry**: `0x19A8D8` |
| 84 | `0x19AA98` | `movw r1,#0x62F0` | `movw r1,#0x6DC0` | heap pointer in copy-out (store `[r4,r1]`) | `clone` at fn `0x19AA88` | **entry**: `0x19AA88` |
| 85 | `0x19AAB0` | `movw r1,#0x62F0` | `movw r1,#0x6DC0` | heap pointer in copy-back `memcpy(dst, src, len)` | `emulate` at site (site is fn entry), or `clone` at `0x19AAB0` | **entry**: `0x19AAB0` (`ui-page-bound` §1) |
| 86 | `0x19AACC` | `movw r0,#0x62F0` | `movw r0,#0x6DC0` | heap pointer in free routine (free + store 0) | `clone` at fn `0x19AAC4` | **entry**: `0x19AAC4` |
| 87 | `0x19A544` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base passed to the serializer | `clone` at fn `0x19A4EC` | **entry**: `0x19A4EC` |
| 88 | `0x19A5BC` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base passed to the deserializer | `clone` at fn `0x19A55C` | **entry**: `0x19A55C` |
| 89 | `0x19A6D4` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base in preset read path | `clone` at `B` (probe) | `[I]` |
| 90 | `0x19A87C` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base in preset-record init | `clone` at fn `0x19A854` | `[I]` interior (`preset-deadzone` §1.1) |

Notes for this chunk:

- **#78 is the only `sub`-style site.** It computes `r5 = r7 - 0x62D6` where `r7 =
  obj+0x62F0`; the constant exists solely so the result is `obj+0x1A`
  (`ui-page-bound` §1). After the shift, `r7 = obj+0x6DC0`, so the constant must be
  `0x6DA6`. Emulating it as a `movw` is only half the job - the following `sub`
  must use the new value; a clone that patches *just the movw* is correct.
- **#79-#86 are the eight heap-pointer sites.** The field moved from `+0x62F0` to
  `+0x6DC0`; every access (alloc, copy-out, copy-back, free, both destructors, open
  path) must move with it. A miss leaves one path reading a stale pointer eight
  bytes before the real field.
- **#87-#90 are the first four of eleven preset-base sites** (the rest are in the
  next chunks). The base moves `+0x62F4 -> +0x6DC4`; the preset records themselves
  moved `+0x631D.. -> +0x6DED..` (#91-#103).
- **#85 is a free win**: the site is the first instruction of function `0x19AAB0`,
  so `emulate` at the site is legal if `is_block(0x19AAB0)` (function entries are
  block starts by construction of the lifter; verify anyway).

| 91 | `0x19AB7C` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base in preset accessor | `clone` at `B` (probe) | `[I]` between fn `0x19AB48` and `0x19ABA8` |
| 92 | `0x19ABAC` | `movw r3,#0x62F4` | `movw r3,#0x6DC4` | preset base in `getPresetPtr` | `clone` at fn `0x19ABA8` (4 B in) | **entry**: `0x19ABA8` |
| 93 | `0x19ABC8` | `movw r3,#0x62F4` | `movw r3,#0x6DC4` | preset base in `getPresetPtr2` | `clone` at fn `0x19ABC4` (4 B in) | **entry**: `0x19ABC4` |
| 94 | `0x19B19C` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base in equip->preset copy | `clone` at fn `0x19B110` | `[I]` interior (`preset-deadzone` §1.1) |
| 95 | `0x19B218` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base (record copy family) | `clone` at `B` (probe) | `[I]` |
| 96 | `0x19B270` | `movw r0,#0x62F4` | `movw r0,#0x6DC4` | preset base (record copy family) | `clone` at `B` (probe) | `[I]` |
| 97 | `0x19B370` | `movw r1,#0x62F4` | `movw r1,#0x6DC4` | preset base in rename/set-name | `clone` at fn `0x19B360` (0x10 B in) | **entry**: `0x19B360` |
| 98 | `0x198E98` | `movw r0,#0x631D` | `movw r0,#0x6DED` | preset record name tail (`base+0x29`) | `clone` at `B` (probe) | `[I]` same init family as #60 |
| 99 | `0x19A780` | `movw r0,#0x631D` | `movw r0,#0x6DED` | preset record name tail | `clone` at `B` (probe) | `[I]` |
| 100 | `0x19A890` | `movw r0,#0x631D` | `movw r0,#0x6DED` | preset record name tail in record init | `clone` at fn `0x19A854` | `[I]` interior |
| 101 | `0x19B2CC` | `movw r2,#0x631D` | `movw r2,#0x6DED` | preset record name tail | `clone` at `B` (probe) | `[I]` |
| 102 | `0x19B31C` | `movw r2,#0x631D` | `movw r2,#0x6DED` | preset record name tail | `clone` at `B` (probe) | `[I]` |
| 103 | `0x19ABFC` | `movw r9,#0x631E` | `movw r9,#0x6DEE` | preset record equipment area (`base+0x2A`) | `clone` at fn `0x19ABE0` | `[I]` interior of `applyPreset` |
| 104 | `0x19B098` | `movw r9,#0x631E` | `movw r9,#0x6DEE` | preset record equipment area | `clone` at `B` (probe) | `[I]` |
| 105 | `0x19B22C` | `movw r1,#0x631E` | `movw r1,#0x6DEE` | preset record equipment area | `clone` at `B` (probe) | `[I]` |

Notes for this chunk:

- **Preset record geometry.** The preset array base is `obj+0x62F4`, record stride
  `0xAA` (170 B): `+0x00..+0x29` name (42 B), `+0x2A..+0xA9` equipment area (32 x
  4 B) (`preset-deadzone` §0). The "record field" constants are absolute object
  offsets for record 0: `0x631D = base+0x29` (last name byte), `0x631E =
  base+0x2A` (equipment start), `0x6320 = base+0x2C`, `0x6322 = base+0x2E`. The
  shift is exactly +0xAD0 on each (`0x6DED/0x6DEE/0x6DF0/0x6DF2`), which the table
  checks by arithmetic: `0x631D + 0xAD0 = 0x6DED`, etc.
- **#91-#97 are preset-base sites; #92/#93/#97 are one-instruction clones** (the
  site is 4-16 bytes into a known small accessor). For those, an alternative to a
  clone is a semantic `replace-fn`: reimplement the tiny accessor (bound check,
  pointer add) and return. That is faster but must reproduce the original return
  convention exactly; the clone is behaviour-preserving by construction.
- **#94 does not belong to the "preset-base" free path**: it is the equip->preset
  copy at `0x19B110`, one of the write paths that the V7 guards (#111-#114) also
  protect. If either the base or the guard is missed, the copy can still run with
  `idx >= 14`.
- **#98-#105 are record-field constants, not the base.** They are used by the
  serializer/rename/apply paths and are independent of the base patch; both must
  land.

| 106 | `0x19B284` | `movw r1,#0x631E` | `movw r1,#0x6DEE` | preset record equipment area | `clone` at `B` (probe) | `[I]` |
| 107 | `0x19B2DC` | `movw r2,#0x631E` | `movw r2,#0x6DEE` | preset record equipment area | `clone` at `B` (probe) | `[I]` |
| 108 | `0x19B32C` | `movw r2,#0x631E` | `movw r2,#0x6DEE` | preset record equipment area | `clone` at `B` (probe) | `[I]` |
| 109 | `0x19A650` | `movw r0,#0x6320` | `movw r0,#0x6DF0` | preset record field `base+0x2C` | `clone` at `B` (probe) | `[I]` |
| 110 | `0x19A810` | `movw r1,#0x6320` | `movw r1,#0x6DF0` | preset record field in `presetHasAnyEquip` | `clone` at fn `0x19A7F8` (0x18 B in) | **entry**: `0x19A7F8` |
| 111 | `0x19AAEC` | `movw r1,#0x6320` | `movw r1,#0x6DF0` | preset record field in `anyPresetNonEmpty` | `emulate` at site if `is_block`; else `clone` | **entry** `[I]`: `0x19AAEC` (`preset-deadzone` §1.1) |
| 112 | `0x19AE8C` | `movw r0,#0x6320` | `movw r0,#0x6DF0` | preset record field | `clone` at `B` (probe) | `[I]` possibly `applyPreset` body |
| 113 | `0x19B128` | `movw r1,#0x6320` | `movw r1,#0x6DF0` | preset record field in equip->preset copy | `clone` at fn `0x19B110` (0x18 B in) | `[I]` interior |
| 114 | `0x198BD4` | `movw r1,#0x72E4` | `movw r1,#0x7DB4` | object total size passed to the allocator in the ctor | `clone` at fn `0x198BB0` | **entry**: `0x198BB0` |
| 115 | `0x19B478` | `movw r3,#0x72E4` | `movw r3,#0x7DB4` | object size used by the set-name/record path | `clone` at fn `0x19B360` | `[I]` interior |
| 116 | `0x3D925C` | `movw r0,#0x72E4` | `movw r0,#0x7DB4` | object size passed to the second allocator/factory | `clone` at `B` (probe) | `[I]` (`preset-deadzone` §2.4 names it an allocation site) |
| 117 | `0x5B807C` | `movw r2,#0x240A` | `movw r2,#0x2EDA` | UI direct read of the B page base | `clone` at `B` (probe) | `[I]` **disputed object** - see note |
| 118 | `0x5B8084` | `movw r3,#0x59F2` | `movw r3,#0x64C2` | UI direct read of the D page base | `clone` at `B` (probe) | `[I]` **disputed object** - see note |
| 119 | `0x19AC08` | `movw r0,#0x6322` | `movw r0,#0x6DF2` | preset record `base+0x2E` in `applyPreset` | `clone` at fn `0x19ABE0` | `[I]` interior |
| 120 | `0x19A800` | `cmp r1,#0x17` | `cmp r1,#0x0D` | preset guard: `presetHasAnyEquip` bound 23 -> 13 | `clone` at fn `0x19A7F8` (8 B / 2-insn prefix) | **entry**: `0x19A7F8` (`preset-deadzone` §1.1) |

Notes for this chunk:

- **#117/#118 are the only two sites where the patch's own source reports
  disagree about the object.** `DEVELOP.md:149` / `DEVLOG.md:149` call
  `0x5B807C`/`0x5B8084` the "B page base UI" / "D page base UI" (the "3 easy-to-
  miss sites" capture). `ui-page-bound.md:230` explicitly says
  "`0x5B807C` uses `0x240A`" as an example of a **different class**, and warns
  "do not replace globally; check per object/function family". If
  `0x5B807C/0x5B8084` belong to a `0x190`-stride record structure instead of the
  item-box object, porting #117/#118 shifts an unrelated structure's field and is
  a regression. **Action before porting:** disassemble the function containing
  `0x5B807C` and confirm the base register comes from the item-box singleton
  (`*(*0x183A81C)`, i.e. `GOT 0x183A81C -> 0x1858438`), not from another object.
  Until then, treat #117/#118 as UNCONFIRMED.
- **#114-#116 are the object-size sites.** `0x72E4 -> 0x7DB4` (`+0xAD0`). The ctor
  allocates the object; the factory at `0x3D925C` allocates another instance. A
  miss here means the 2992-slot A/B/C/D tail is written beyond the allocation even
  if every other constant is patched.
- **#120 is the first of the four V6 "missing guards"** (`preset-deadzone` §1.4):
  `0x19A800` (`presetHasAnyEquip`), `0x19A84C` (record init), `0x19B11C`
  (equip->preset copy), `0x19B360` (set name). They are #120-#123 in this table.
  The fifth path, `0x19B1F4`, has **no** bound to patch (known gap; see risks).
- **#109-#113 are the `0x6320` family**, which is *not* the same field as the
  `0x631D/0x631E` family even though all are inside record 0. The arithmetic
  `0x6320 + 0xAD0 = 0x6DF0` is the only relation the port may rely on.

| 121 | `0x19A84C` | `cmp r1,#0x17` | `cmp r1,#0x0D` | preset record-init bound 23 -> 13 | `emulate` at site (site is the entry guard) | **entry** `[I]`: `0x19A84C` (`preset-deadzone` §1.1) |
| 122 | `0x19B11C` | `cmp r4,#0x17` | `cmp r4,#0x0D` | equip->preset copy bound 23 -> 13 | `clone` at fn `0x19B110` (0xC B in) | `[I]` interior |
| 123 | `0x19B360` | `cmp r1,#0x17` | `cmp r1,#0x0D` | preset rename/set-name bound 23 -> 13 | `emulate` at site (site is the entry guard) | **entry** `[I]`: `0x19B360` (`preset-deadzone` §1.1) |

Notes for the last chunk:

- **#121-#123 close the four V6 missing guards.** Their callers:
  `0x19A84C` is reached from the save path and from UI `0x71AABC`; `0x19B11C`
  from the single caller `0x719D00` (UI hash, no prior getter check); `0x19B360`
  from `0x729190` (rename). `preset-deadzone` §1.2 records these as the paths that
  could still touch presets 14-23 after V6.
- **#122 is the most exposed write path**: it is the only one of the four whose
  caller does not first pass through an already-patched getter. A miss here
  re-opens preset index 14-23 writes into the shifted preset array.
- **The fifth path `0x19B1F4` has no constant to patch** and is therefore not one
  of the 123 lines. The plugin *can* address it (its entry is hookable and its only
  caller is `0x71A584`), but that is new behaviour, not a port of the pchtxt; see
  risk R4.

End of the 123-row table. Row counts per group:

| group | rows | lines |
|---|---|---|
| slot capacity / search / serialize / clear bounds | 1-9 | 9 |
| preset block length | 10-11 | 2 |
| preset index guards (V6) | 12-16 | 5 |
| heap buffer sizes | 17-22 | 6 |
| capacity getter | 23-24 | 2 |
| inline capacity (30 inlined copies) | 25-54 | 30 |
| layout shift: A/B/C/D bases and lengths | 55-77 | 23 |
| layout shift: heap pointer + adj | 78-86 | 9 |
| layout shift: preset base | 87-97 | 11 |
| layout shift: preset record fields | 98-113, 119 | 17 |
| layout shift: object size | 114-116 | 3 |
| disputed UI direct reads | 117-118 | 2 |
| preset index guards (V7 additions) | 120-123 | 4 |
| **total** | | **123** |

---

## 3. Code sites vs data-only sites

| measure | count | evidence |
|---|---|---|
| patch lines total | 123 | `patch/1.4.0.pchtxt` |
| **code sites** (instruction words in `.text`) | **123** | every line is a 4-byte ARM instruction word; all vaddrs are 4-aligned and lie in `0x0..0x13F1DEC` (`.text`, `DEVELOP.md` asset table) |
| **data-only sites** (rodata/data/literal-pool constants that an `LDR` reads at run time) | **0** | none of the 123 addresses is a literal-pool word; the constants are encoded as immediates inside instructions |
| sites in `.rodata` | 0 | `.rodata` starts at `0x13F2000`, above the highest site `0x71C694` |
| sites in `.data`/`.bss` | 0 | `.data` starts at `0x172F000` |

Original instruction mix (the word that the pchtxt replaces):

| original kind | rows | count |
|---|---|---|
| `movw rD,#imm16` | 1-9, 17-22, 55-119 | 80 |
| `add r0,r0,#0x3E8` | 25-54 | 30 |
| `cmp rN,#imm8` | 12-16, 120-123 | 9 |
| `mov r2,#0xFF0` (DP immediate) | 10-11 | 2 |
| `push {r4,lr}` | 23 | 1 |
| `ldr r0,[pc,#0x30]` | 24 | 1 |
| **total** | | **123** |

Patched instruction mix: 113 `movw`, 9 `cmp`, 1 `bx` (`0x198F08`).

Consequences:

1. There is **no data-write shortcut**. Even the two `mov r2,#0xFF0` sites are
   instructions, not data; writing `0x985` into a literal pool does nothing
   because no literal holds it.
2. A faithful port needs at most 123 hooks, but the table groups lines by
   containing function/block: several rows share one hook (e.g. #1-#3 at
   `0x198F44`, #5-#6 at `0x198FE8`, #17-#18 at `0x19A8D8`, #87-#88 at the
   serializer/deserializer). The exact hook count is settled by the `is_block`
   probe; it is bounded by 123 and is likely 50-70.
3. The pchtxt's own save-format effect (bitstream 7106 B at `+0x278`, preset block
   2437 B at `+0x1E3A`, section total `0x2547`) is produced by rows 7-11 and the
   serializer/deserializer constants. A plugin port that applies those rows keeps
   save compatibility with V7; a port that misses them writes the old 2300-slot /
   4080-byte format and corrupts the section.

---

## 4. Risks

### R0. Address translation: the table's vaddrs are module-relative

`is_block`, `mark` and `on_dispatch` use **absolute guest PCs**. The pchtxt vaddrs
are NSO-relative (`.text` at 0). `ModHostModule` provides `base`, `span`,
`text_start/text_end` (`mod_host_api.h:68-78`), so the port must compute
`abs = text_start + vaddr` (equivalently `base + vaddr`; check at start-up that
`text_start == base` and that `text_start + 0x13F1DEC <= text_end`, i.e. the whole
patch range is inside the R-X segment).
**If the module is based anywhere other than 0 and the plugin marks raw vaddrs,
every hook is silently ignored**: `RecompHooks::Mark` drops addresses outside the
initialised range (`recomp_hooks.cpp:29-37`). This is the first thing to verify at
`on_game_start`; nothing else works without it.

### R1. A memory-write port is a silent no-op

Already settled in section 1: `mem_write` to `.text` does not change AOT
behaviour. A plugin that only writes the 123 byte strings will load, log nothing,
and change nothing (no crash, no visible error). Do not ship a "patch file
applier" for the AOT build.

### R2. B and C are relocated but **not enlarged** - >2300 distinct item ids still overflow

> **Ruling 2026-10-24: out-of-bounds write CONFIRMED statically; net harm [U] pending fill-order analysis.** Not only ">2300 distinct ids": the
> B/C init loop `0x199B30..0x199B70` is bounded by the patched inline capacity at `0x199B68`
> (pchtxt `00199c68 B00B00E3` -> 2992), so every rebuild zeroes 2992 B records, 0xAD0 B past
> B's end into C; the C fill likewise runs 0x568 B into D. Evidence:
> `.tmp/reports-mhgu/glm-r2-r5-review.md` (DsvR2Review), main-session re-disasm. See HANDOFF 7 #10.
> **Harm is not yet ruled:** if C and D are refilled after these loops, the spills are overwritten
> and harmless; the last D fill (`0x199E98`) spilling into the following heap/preset pointers is [U].

The V7 shift moves B to `obj+0x2EDA` and C to `obj+0x52CA`, but keeps
B = `0x23F0` bytes (2300 records) and C = `0x11F8` (2300 halfwords). The patch's
own constants prove it:

- #60: new `memclr` length `0x52B0 = 0x2EC0 (new A) + 0x23F0 (B)`.
- #62/#63: new `memclr` length `0x64A8 = 0x2EC0 (A) + 0x23F0 (B) + 0x11F8 (C)`.

The B rebuild (`0x199AE4`) writes one 4-byte record per **distinct item id** in
`0..0xBAE` (`preset-deadzone` §2.2). The old defence was "A has 2300 slots, so at
most 2300 stacks"; with N=2992 that premise is false. A box holding 2301-2991
distinct ids writes B[2300..] at `0x52CA` and onward, straight into C and then D.

This is a **semantic gap in V7, not a port artefact**, but the plugin inherits it.
Mitigations: (a) extend B/C/D as well (a new layout beyond V7, with all dependent
constants remapped), or (b) enforce a runtime cap on distinct ids, which changes
game behaviour. Do not silently claim the port fixes it.

### R3. The 0xAD0 shift is all-or-nothing across 65 sites

If any one of the 65 layout sites is missed, the object becomes internally
inconsistent with no runtime check. Site families and failure mode:

| family | rows | count | if missed |
|---|---|---|---|
| B base/count (`0x240A/0x240C`) | 55-59 | 5 | A's tail is read as the aggregate table; sorting destroys high slots |
| C start (`0x47FA`) | 61 | 1 | C overlaps B's tail; u16 ids read from B records |
| D base (`0x59F2`) | 64-77 | 14 | D flags alias C's tail; slot-occupied flags corrupt |
| A+B and A+B+C clear lengths | 60, 62-63 | 3 | new tail is never cleared on init/load |
| heap pointer (`0x62F0`) + `sub` adjustment | 78-86 | 9 | backup/free uses the old field, 0xAD0 before the real one |
| preset base (`0x62F4`) | 87-97 | 11 | preset records overlap D/heap; saves corrupt |
| preset record fields (`0x631D/1E/20/22`) | 98-113, 119 | 17 | name/equipment fields read from the wrong bytes |
| object size (`0x72E4`) | 114-116 | 3 | allocation is 0xAD0 too small; the entire new tail is out of bounds |
| UI direct B/D reads | 117-118 | 2 | UI page bases point into the old layout (also disputed, R5) |

Verification must be byte-level per hook: log the hook pc, the original word read
via `mem_read`, and the emulated effect, then compare the object pointer arithmetic
against the expected `old + 0xAD0` for each family.

### R4. The known gap `0x19B1F4` is not in the patch and has no bound to patch

`0x19B1F4` copies a preset record's name (`0x2A`) and equipment area (`0x80`)
between two indices taken from UI-obfuscated values, with **no index check**
(`preset-deadzone` §1.1 item 10, §1.2). With the object now ending at `0x7DB4`, an
out-of-range index writes past the object. A pure port of the 123 lines keeps this
gap. The plugin can do better than the pchtxt here (the entry is hookable and the
only caller is `0x71A584`), but that is **new behaviour**: hook `0x19B1F4`, check
both indices (`< 14`), and either return or clone the body only when in range. If
this is not implemented, list it as a residual V7 bug in the release notes.

### R5. Two sites have a disputed object identity (`0x5B807C`, `0x5B8084`)

> **Ruling 2026-10-24: both sites are item-box page bases** (GOT literal `0x1282760` loaded at
> `0x5B80A8` in fn `0x5B8014`; `page*0x190+0x240A` / `page*100+0x59F2`), so rows #117/#118
> are valid hooks. The `ui-page-bound.md:230` "other class" caution was a false lead.

- Pro-patch: `DEVELOP.md:149`, `DEVLOG.md:149` ("3 easy-to-miss UI sites": B page
  base, D page base, rec+0x2E).
- Contra: `ui-page-bound.md:230` lists `0x5B807C` using `0x240A` as an example of
  **another class** (a `0x190`-stride record structure) and warns that equal
  constants appear in other classes; `0x106EC98/0x106ECD0` (0x62F0/0x62F4),
  `0xBB8AB8/0xBB8B2C` (0x47E0) and `0x8C9420` (0x59D8) are named the same way.

If #117/#118 belong to another object, applying them corrupts that object; if they
are the box object and are omitted, the UI page bases stay at the old offsets.
**Resolve by disassembling the function at `0x5B807C..0x5B8084` and tracing its
base register to the item-box singleton** (`GOT 0x183A81C -> 0x1858438`), or by a
runtime watchpoint. Until then they are UNCONFIRMED and must not be silently
included or excluded.

### R6. Sites a plugin cannot reach (or must not reach)

| site | status | consequence |
|---|---|---|
| any of the 123 sites, **if** its enclosing block start is not a registered block | `[I]` until `is_block` probe; if no candidate `B <= site` is a block, the site cannot be hooked | such code already runs on the JIT; a `.text` write *may* take effect for a cold JIT translation, but cache flush is not exposed (`arm_recomp32.cpp:1409-1413`), so treat as unreachable/UNCONFIRMED |
| `0x19B1F4` | not one of the 123; no constant exists | unbounded preset copy can write past `obj+0x7DB4` (R4) |
| `0x3E95CC` (`cmp r4,#0x18`, save-rebuild outer loop, 24 iterations) | not patched (deliberately) | benign only while `getPresetPtr2` (#93) is patched; otherwise it rebuilds presets 14-23 |
| `0x19A800/0x19A84C/0x19B11C/0x19B360` | patched (#120-#123) | if any guard is missed, UI/save can still select presets 14-23 |
| `0x106EC98/0x106ECD0/0xBB8AB8/0xBB8B2C/0x8C9420` | **must not** be touched | same constants, different classes (`ui-page-bound.md:230`); patching them corrupts unrelated structures |
| Thumb code | none of the 123 | no Thumb sites in this patch; the game's `main` is ARM32 (`DEVELOP.md` asset table) |

No site in the 123 is *inherently* unreachable: every patched instruction lies in a
basic block whose start is a function entry or branch target, and the lifter
reports `main` translated at 100.000% (6 words left as data, `tools/a32recomp/
README.md`). The "cannot reach" cases are therefore (a) a failed `is_block` probe
(implementation bug or wrong module base, R0), and (b) the four rows above that are
outside the port's scope.

### R7. Performance: clones execute on the JIT

`emulate` at a block start costs one dispatcher round trip and then JIT-steps the
remainder of the block. `clone` costs a JIT entry plus the whole prefix on every
hit. The 30 inline capacity sites sit in clear/sort/count loops; a clone at a loop
head can turn per-frame work into JIT work. Mitigations, in order:

1. Probe `is_block(site)` first: sites that are loop heads or function entries use
   `emulate` (cheapest).
2. For tiny accessors (`0x19AB48`, `0x19ABA8`, `0x19ABC4`, `0x19ABE0`,
   `0x19A7F8`, `0x19B360`), consider semantic `replace-fn` instead of a clone.
3. For hot loops where only one constant is wrong and the block start is far before
   the site, measure before choosing clone vs. a semantic rewrite of the loop.

Do not assume the port is free: the pchtxt's cost was zero (the emulator JIT
re-decoded one word); the plugin's cost is a dispatcher/JIT transition per hit.

### R8. `cmp` emulation must set all four flags

The 9 guard rows rely on `N,Z,C,V`. For `cmp rn,#imm` (32-bit):
`res = rn - imm`; `N = res >> 31`; `Z = (res == 0)`; `C = (rn >= imm)` unsigned;
`V = ((rn ^ imm) & (rn ^ res) & 0x80000000) != 0`. `ModHostCpu` exposes
`n,z,c,v` (`mod_host_api.h:52-58`) and the fallback marshals them through
`ThreadContext` (`arm_recomp32.cpp:1227-1282`). A wrong `C` or `V` flips the
`bxhi`/`bhi` guard and re-opens the preset range.

### R9. Replacing the getter changes capacity for every save

The original `0x198F04` returns `1000 + 300*popcount(flags&7) + 200*bits`, i.e.
less than 2300 for non-maxed saves. V7 (and this port) forces 2992 for everyone.
That is intended, but it is a behaviour change beyond "apply the same bytes": a
user with a low-upgrade save sees 30 pages and 2992 usable slots. Document it.

### R10. Preset block length keeps 57 bytes of record 14

`0x985 = 14*170 + 57` keeps the save section total at `0x2547` (no shift of the
following equipment/palico data, `preset-deadzone` §1.3). Consequence: record 14's
name and the first 15 bytes of its equipment area are still serialized and
deserialized even though presets 14-23 are no longer selectable (guards < 14). This
is benign while record 14 stays zero/stale, but it means the plugin must not
"clean" those 57 bytes; doing so changes save bytes that V7 writes.

### R11. Never reuse a trampoline address with different bytes

The JIT translates guest memory on first execution and the mod API has no
cache-flush call (`mod_host.cpp:147-149` does not invalidate;
`arm_recomp32.cpp:1409-1413` forwards invalidation only when the CPU interface is
called). If clones are written into one shared scratch buffer, a second site
reusing the same address may run the first site's stale translation. Allocate one
write-once clone region per block/site (`guest_alloc`) and patch it before the
first redirect.

### R12. Concurrency and recursion

`on_dispatch` runs concurrently on game threads (`mod_host_api.h:208-212`); the
same block can be entered re-entrantly through a nested call. Hook bodies must be
lock-free, use only per-thread state keyed by `thread_key`, and must not allocate
or take locks. `mark` all pcs once at `on_game_start`; marks are permanent.

### R13. Save compatibility must match V7 exactly

If the plugin is meant to replace the pchtxt for users who already have V7 saves,
the bitstream size (7106 B at `+0x278`), the preset block (2437 B at `+0x1E3A`) and
the section total (`0x2547`) must be identical. Rows 7-11 and 87-88 control those;
a mismatch makes existing saves unreadable or reinterprets equipment data as item
bits. There is no checksum, so corruption is silent (`DEVELOP.md` decision table:
"no CRC/hash").

---

## 5. Start-up verification plan (for the implementing agent)

This document is static; the following steps settle every `[I]` cell at run time:

1. `on_game_start`: enumerate modules, pick alias `main`, compute
   `base = text_start`, assert `text_start + 0x13F1DEC <= text_end`, log the base.
2. For each of the 123 vaddrs: `abs = base + vaddr`; log `is_block(abs)` and the
   word returned by `mem_read(abs,4)`; compare the word with the "original insn"
   column (this also catches a wrong base).
3. For each site with `is_block(abs) == false`, walk back in 4-byte steps
   (bounded, e.g. 0x400 bytes) until `is_block` is true; log `B` and `site - B`.
   Any site with no `B` must be reported, not silently skipped.
4. Build the hook table from step 3: one hook per distinct `B`; for each hook,
   list the rows it covers and the patched words to place in the clone.
5. Log the first hit of every hook once (pc, thread_key) to prove it fires; then
   check the in-game criteria: 30 pages, slot 2400/2900 markers visible, save
   round-trip (read -> save -> read) keeps the extended slots and does not disturb
   equipment/palico data.
6. Stress R2: fill more than 2300 distinct item ids and perform a sort/compress;
   watch for C/D corruption. This is expected to fail on unmodified V7 constants.

---

## Appendix A. Byte/decoding notes

- `MOVW` encoding used for every derived original/patched pair:
  `word = 0xE3000000 | ((imm16 >> 12) << 16) | (Rd << 12) | (imm16 & 0xFFF)`.
  The low nibble of byte 2 is `imm4`, the high nibble of byte 1 is `Rd`; patched
  bytes are little-endian (`B00B00E3` = `0xE3000BB0` = `movw r0,#0xBB0`).
- `cmp rN,#imm8` = `0xE3500000 | (Rn << 16) | imm8` (cond AL). `0D0051E3` =
  `0xE351000D` = `cmp r1,#0x0D`.
- `mov r2,#0xFF0` = `0xE3A02EFF`; `bx lr` = `0xE12FFF1E`; `push {r4,lr}` =
  `0xE92D4010`.
- Original words for rows 1-22 are transcribed from the verified table
  `recovery-report.md` §6.2; rows 23-24 from `preset-deadzone.md` §3 with the
  conflict note in section 2; rows 25-54 are all `0xE2800FFA` (`add r0,r0,#0x3E8`)
  per `ui-page-bound.md` §2.3 (30/30 checked); rows 55-119 are `movw` with the old
  immediate given in `v7-shift-65.json` / `build-v7-final.mjs`; rows 120-123 are
  `cmp r1,#0x17` / `cmp r4,#0x17` per `preset-deadzone` §1.4.

---

## Appendix B. Port status (report format)

### Confirmed

- AOT premise: writing guest `.text` does not change recompiled behaviour;
  `ApiMemWrite` only copies guest memory (`mod_host.cpp:147-149`), and
  `InvalidateCacheRange` is a no-op for static blocks
  (`arm_recomp32.cpp:1409-1413`). All 123 lines need hooks (section 1).
- 123 code sites, 0 data-only sites; all 4-aligned and inside `.text`
  (section 3).
- Original words for rows 1-22 are byte-verified (`recovery-report.md` §6.2);
  30/30 inline sites are `0xE2800FFA`; all 65 shift constants match their stated
  old value in `v7-shift-65.json`; the four V7 guards match
  `preset-deadzone` §1.4.
- The 0xAD0 shift arithmetic closes: new A `0x2EC0`, B `0x23F0`, C `0x11F8`,
  object size `0x7DB4`, and the patch's own `memclr` lengths `0x52B0` / `0x64A8`
  equal the sum of those parts.
- Function entries named by `tiers.csv` or the reports (all still to be confirmed
  with `is_block`): `0x198F04` and `0x198F44` (`tiers.csv`); `0x198BB0`,
  `0x198C74`, `0x198CC8`, `0x198D24`, `0x19A4EC`, `0x19A55C`, `0x19A7F8`,
  `0x19A8D8`, `0x19AA88`, `0x19AAB0`, `0x19AAC4`, `0x19AAEC`, `0x19AB48`,
  `0x19ABA8`, `0x19ABC4`, `0x19ABE0`, `0x19B110`.

### In progress (implementation-time work)

- Per-site `is_block(abs)` probe and nearest block-start search (section 5).
- Clone-trampoline emitter (PC-relative fixups) and flag-exact `cmp` emulation.
- One hook per block/function covering the rows listed in section 2.
- Performance measurement of the clone hooks on the sort/compress path.

### Unknown / UNCONFIRMED

- **#117/#118 object identity** (`0x5B807C/0x5B8084`): the patch's own reports
  disagree (section 4, R5). Conservative placeholder: include the hooks, but
  gate them behind a start-up assertion that the traced base is the item-box
  singleton; if not, drop the hooks.
- **Exact original word at vaddr `0x198F04`**: two sources say `push {r4,lr}`,
  one says `ldr r0,[pc,#0x30]` (section 2 note). Placeholder used:
  `push {r4,lr}`. Irrelevant to the port only if `replace-fn` is used; if the
  implementer instead emulates the first instruction, read the word with
  `mem_read` at start-up and disassemble it, do not trust the table.
- **Exact original word at vaddr `0x198F08`**: placeholder `ldr r0,[pc,#0x30]`
  (same conflict).
- **Block-start status of every `[I]` row**: not statically checkable without the
  exported image's block table; `is_block` is authoritative.
- **Whether `0x3E8A10`, `0x19AA44`, `0x199EEC`, `0x3D925C` are function entries**:
  named as routines by reports but absent from `tiers.csv`; probe.
- **JIT cache coherence for `.text` writes**: whether a patched word is picked up
  by an already-translated JIT block is not exposed by the mod API; treated as
  UNCONFIRMED and avoided (section 4, R11).
- **R2 (B overflow) in practice**: statically the B table is 2300 records while
  the box holds 2992 slots; whether the UI/sort ever produces >2300 distinct ids
  in one box is a gameplay question, not settled by this static analysis.
- **Performance cost** of clone hooks: no measurement; section 4, R7 gives the
  mitigation order.

