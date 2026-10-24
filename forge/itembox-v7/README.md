# ItemBoxV7

**EXPERIMENTAL - not run in game yet.** It is a Forge PC 0.7 port of the item-box V7 pchtxt
(`MHGU/patch/1.4.0.pchtxt`, 123 patch lines) to the recompiled MHGU (1.4.0) PC build.

Status (2026-10-24): BoxProbe ran on the real export (`words matched 123/123, block starts
123/123, distinct B 103, missing B 0`). An offline run of this plugin against the 1.4.0 image
and the block starts BoxProbe logged covers all 123 lines: 101 cloned groups + the getter hook,
8 literal loads re-aimed, clones checked word by word (`.tmp/itembox-sim/`, not shipped).

Read this before installing:

- **All or nothing.** If any of the 123 lines cannot be applied, every hook is switched off
  again and the game runs unmodified (spec R3: a half-applied layout writes a save no build can
  read). The last log line says `ACTIVE: all 123 patch lines covered` or why not.
- **Run [BoxProbe](../boxprobe/) first** on a new exe. Only install ItemBoxV7 if
  `BoxProbe/boxprobe.txt` shows `words matched 123/123` and no missing `B`.
- **This changes the save format to V7.** After a save is written by a game with the item-box
  expansion applied, the unpatched game can no longer read that save (2300 slots + 24 presets
  versus 2992 slots + 14 presets; the section sizes differ).
- **Back up your save files** (and keep the pchtxt/emulator setup you came from) before the
  first run with V7 enabled.

## What it does

The pchtxt only works on an emulator, because dynarmic decodes guest instructions at run time.
The AOT export has one native block per basic block, so writing the 123 patched words into
`.text` changes nothing (spec `docs/patches/item-box-v7-plugin-spec.md` section 1). The plugin
therefore works on the recompiled blocks:

1. `forge_onInit` resolves module `main`, checks that `main + 0x13F1DEC` is inside it, and reads
   every one of the 123 sites (`sites.h`). If **any** original 1.4.0 instruction word differs,
   it logs the mismatches and installs nothing at all.
2. For every site it probes `is_block(site)`; if the site is not a block start it walks back in
   4-byte steps (at most `0x400` bytes) to the block start `B`, and groups the sites by `B`.
3. Per group it copies `B .. last site of the group` from game memory into a freshly allocated
   guest buffer (`mem_alloc`), substitutes the V7 word at each site, and appends an absolute
   return to `last site + 4` (`ldr pc,[pc,#-4]` + address = `0xE51FF004`, spec Appendix A).
4. Literal loads `ldr rD,[pc,#imm]` (rD != pc) in the copied range are kept: the literal is
   read from the game and stored after the return veneer, and the load is re-aimed at it. A
   group is **not** cloned when the range contains any other instruction whose meaning depends
   on its own address or that leaves the range: `b`/`bl`/`blx` to an immediate, `str` or other
   addressing with `pc` as base, `adr`, `mov pc`, `ldr pc`, `pop`/`ldm`/`stm` with `pc`,
   `bx`/`blx` register, and the same class through a register operand. Such a group is logged
   as `NOT CLONED, needs hand-written handling` (and then all-or-nothing applies).
   The capacity getter (rows 23, 24, 26 at `0x198F04`) is not cloned: one pre hook sets
   `r0 = 0xBB0` and returns `FORGE_HOOK_RETURN`, which is what the patched
   `movw r0,#0xBB0; bx lr` does (spec section 2 `replace-fn`).
5. Each remaining group gets one pre hook on `B` that sets `r15` to the clone and returns
   `FORGE_HOOK_JUMP`. Clones execute on the JIT (they have no recompiled block), so the cost is
   a JIT transition per entry, not the original AOT speed (spec section 4 R7).
6. The first hit of every hook is logged once.

The clone memory is never freed or reused: the JIT caches a translation per guest address, so
different bytes at the same address would run stale code (spec section 4 R11). For that reason
also leave hot reload off for this mod (`[plugins] hot_reload = false` in `forge.ini`).

## Enable / dry run

The plugin always analyses and logs. It only creates hooks when this file exists:

```
<game>\mods\0100770008DD8000\ItemBoxV7\ENABLE
```

Without it the run is a dry run: the log says which groups *would* be cloned and which ones
need hand-written handling, and the game is untouched.

## Build

```
cd /d "G:\omp works\MHGU\forge\itembox-v7"
build.bat
```

`build.bat` finds VS 2022 through `vswhere` and compiles with `cl /O2 /MT /W4 /LD` (same flags
as boxprobe); the include path points at `..\..\..\.tmp\ext\forge-pc\include` (the workspace's
forge-pc checkout), so no Vulkan SDK is needed. Result:
`dist\mods\0100770008DD8000\ItemBoxV7\plugins\itembox.dll`.

## Install

Copy `dist\mods\0100770008DD8000\ItemBoxV7` into `<game>\mods\0100770008DD8000\`, so that the DLL
ends up at

```
<game>\mods\0100770008DD8000\ItemBoxV7\plugins\itembox.dll
```

Start the game once (dry run), compare `ItemBoxV7\itembox.txt` with `BoxProbe\boxprobe.txt`,
then create the empty `ENABLE` file in the same folder to install the hooks on the next start.

## Log

`<game>\mods\0100770008DD8000\ItemBoxV7\itembox.txt`, one line per step, plus every line in
Forge's log (`user/forge.log`) under the plugin name `itembox`:

```
[0] gate ... present|missing
[1] main base ..., size ...
[2] original words verified 123/123          (or FAIL CLOSED: n of 123 ...)
[3] block start found for 123/123 sites, 0 without B
[4] B main+... rows ...: would clone ... / NOT CLONED, needs hand-written handling: ...
[5] B main+... rows ...: installed, N words cloned at ..., returns to main+...
[6] summary: install|dry run; words ...; groups ..., installed ... (... sites), skipped ...
[6] skips: N pc-hazard/not-one-block, N memory, N hook, N internal
```

## Limits (inherited from V7, not fixed by this plugin)

- **B and C are moved but not enlarged** (spec section 4 R2): B keeps 2300 records while the box
  has 2992 slots, so a box with more than 2300 distinct item ids still overflows into C/D on a
  sort/compress. The plugin does not change that; V8 is the patch series that sizes B/C/D.
- **`0x19B1F4` has no bound to patch** (spec section 4 R4): the unbounded preset-record copy can
  write past the object. Not one of the 123 lines, not fixed here.
- Rows the generic cloner refuses (see step 4 above) stay unpatched. The summary line counts
  them; the `[4]` lines name the address and the reason.
- The plugin checks the 123 original words at start-up only. A different game build, a different
  module base or another plugin that patches the same blocks is not detected after that.
