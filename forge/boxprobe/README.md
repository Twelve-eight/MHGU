# BoxProbe

Read-only start-up probe of the item-box V7 patch table for the recompiled MHGU (1.4.0) PC
build. It is a Forge PC 0.7 plugin: it does **not** patch or hook anything.

On `forge_onInit` it runs steps 1-4 of `docs/patches/item-box-v7-plugin-spec.md` section 5:

1. logs the base and size of module `main` and checks that `base + 0x13F1DEC` is inside it;
2. for each of the 123 sites in `sites.h`: reads the 4-byte word, compares it with the
   original 1.4.0 instruction, and logs `is_block(site)`;
3. for every site that is not a block start, walks back in 4-byte steps (up to 0x400 bytes)
   to the block start `B`, logging `B` and `site - B`; sites with no `B` are logged as
   `NO B ... (reported)`;
4. logs one line per distinct `B` with the row numbers it covers, then a summary line:
   `words matched N/123, block starts K/123, distinct B D, missing B M`.

Everything is also written to `<game>/mods/0100770008DD8000/BoxProbe/boxprobe.txt` (plain
text, one line per site) and to Forge's log (`user/forge.log`) under the plugin name
`boxprobe`.

## Build

```
cd /d "G:\omp works\MHGU\forge\boxprobe"
build.bat
```

`build.bat` finds VS 2022 through `vswhere` and compiles with `cl /O2 /MT /W4 /LD`; the
include path points at `..\..\..\.tmp\ext\forge-pc\include` (the workspace's forge-pc
checkout), so no Vulkan SDK is needed. Result:
`dist\mods\0100770008DD8000\BoxProbe\plugins\boxprobe.dll`.

## Install

Copy the built folder into the game's mod folder so that the DLL ends up at

```
<game>\mods\0100770008DD8000\BoxProbe\plugins\boxprobe.dll
```

i.e. copy `dist\mods\0100770008DD8000\BoxProbe` into `<game>\mods\0100770008DD8000\`.
Start the game once; the results appear in
`<game>\mods\0100770008DD8000\BoxProbe\boxprobe.txt`.
