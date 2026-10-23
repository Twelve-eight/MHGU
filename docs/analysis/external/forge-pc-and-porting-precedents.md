# Forge PC and MHGU <-> Rise porting precedents

Read-only web research, 2026-10-23. Every claim carries the URL it was read from. Inference is marked [INFERENCE].

Scope: (1) Forge PC, the code-mod loader used by SUYU-GURecomp exports; (2) public mods that port MHGU
content into Monster Hunter Rise (PC) or Rise content into MHGU.

## Forge PC

### Identity

- Repository (the project's only home; the GitHub API `homepage` field is `null`):
  https://github.com/GURecomp/forge-pc . Description: "Drag-and-drop mod loader for the
  recompiled PC build of Monster Hunter Generations Ultimate (port of MHGU Forge), with the
  UI Fix mod". Language C++, created 2026-10-22T09:17:55Z
  (https://api.github.com/repos/GURecomp/forge-pc).
- README, first paragraph: "A drag-and-drop mod loader for the recompiled PC build of Monster
  Hunter Generations Ultimate (1.4.0), in the spirit of Stracker's Loader for MH World. A port
  of MHGU Forge by Fexty, with the author's permission." (https://github.com/GURecomp/forge-pc)
- Upstream for the design and plugin API: https://github.com/Fexty12573/forge ("An environment
  for linking, runtime hooking and code patching in Monster Hunter Generations Ultimate", C++,
  MIT). The Switch loader's plugins are `.nro` files placed in `romfs/nativeNX/plugins`
  (https://github.com/Fexty12573/forge-rs, Quickstart).
- Latest release read: tag `v0.7.0`, "Forge PC 0.7.0", published 2026-10-22T09:21:41Z, asset
  `ForgePC-0.7.0-with-UIFix.zip` (1101609 bytes, sha256 69f53a80...)
  (https://github.com/GURecomp/forge-pc/releases/tag/v0.7.0).

### License

- MIT. GitHub license metadata: key `mit`, spdx `MIT`
  (https://api.github.com/repos/GURecomp/forge-pc); README "Credits and licenses": "Forge PC is
  MIT licensed (LICENSE)".
- Upstream notice reproduced in `LICENSE-MHGU-Forge.txt`: "MIT License / Copyright (c) 2020 The
  Skyline Project / Copyright (c) 2026 Jeffi"
  (https://github.com/GURecomp/forge-pc/blob/main/LICENSE-MHGU-Forge.txt).
- Third-party parts named in the README: Dear ImGui (MIT), Roboto font (Apache 2.0), MHGU-Modding
  reference only (https://github.com/RTHKKona/MHGU-Modding). Release zips carry these under
  `Forge/licenses/`.

### Source availability

Yes, full source is public in the same repository: `src/loader.cpp`, `src/config.cpp`,
`src/overlay.cpp`, `src/crash.cpp`, `src/trace.cpp`, `src/forge_internal.h`, `src/platform.h`;
headers `include/forge_pc.h` (333 lines) and `include/mod_host_api.h` (234 lines); Rust SDK under
`rust/`; example plugin `examples/hello/hello.c`; UI Fix plugin source `mods/UIFix/uifix.cpp`;
build scripts `build.bat` (Visual Studio 2022 + Vulkan SDK) and `build.sh` (g++ C++20)
(https://github.com/GURecomp/forge-pc, Files list; README "Building").

### Does it load third-party plugins

Yes. Files and folders (README "Install", "Mods"):

```
<game>/mods/0100770008DD8000/Forge/forge.dll        loader (Linux: forge.so)
<game>/mods/0100770008DD8000/Forge/forge.ini        settings
<game>/mods/0100770008DD8000/<Mod name>/plugins/    code: *.dll on Windows, *.so on Linux
<game>/mods/0100770008DD8000/<Mod name>/romfs/...   replaced game files
```

- One folder per mod next to `Forge`; a mod may ship `.dll` and `.so` side by side and each OS
  loads only its own. Plugins can be replaced while the game runs: Forge loads a copy
  `<name>.dll.<n>.live` and reloads a changed dll; `[plugins] hot_reload = false` disables it.
- The Forge menu (Insert) has a per-mod checkbox that drops hooks, waits until no callback runs,
  calls `forge_onUnload`, unloads; "Reset scripts" rescans for plugin files without a restart.
- On Linux the loader must be named in the game's `game_settings.ini`:
  `[Mods] loader = Forge/forge.so`.
- Same rule from the exe side (`include/mod_host_api.h`): the exe "loads one loader DLL,
  game_settings.ini [Mods] loader (default "Forge/forge.dll", relative to
  `<exe dir>/mods/<title id>/`; empty = none), and calls its export"; `game_title_id`
  "0100770008DD8000", `game_version` "1.4.0"
  (https://github.com/GURecomp/forge-pc/blob/main/include/mod_host_api.h).
- SUYU-GURecomp's own docs say the same: code mods need Forge PC (MIT), extracted so that
  `mods\0100770008DD8000\Forge\forge.dll` exists, and `[Mods] loader = none` turns code mods off
  (local: `.tmp/ext/SUYU-GURecomp/docs/a32recomp/INSTALL.md` section 7, "Code mods" paragraph).
  The doc also states that exefs patches and `.pchtxt`/`.ips` patches are not supported in the
  export - plugin hooks are the replacement.

### Plugin API and ABI

- API surface: `include/forge_pc.h`, included by every plugin; one translation unit must contain
  `FORGE_PLUGIN_DEFINE_API`, which exports the function through which the loader hands over the
  API table (`forge_api`) (forge_pc.h lines 864-866, 1362-1364).
- Required export `forge_onLoad(ForgePluginInfo*)`; optional `forge_onInit`,
  `forge_onUpdate(float dt)`, `forge_onUnload`, `forge_onImGuiInit/Render/FreeRender`,
  `forge_onPresent(const ForgePresent*)` (0.6+) (forge_pc.h lines 832-858).
- Version negotiation: `ForgePluginInfo { ForgeVersion required_ver; char name[64]; }`, comment
  "the loader must have the same major and at least this minor" (forge_pc.h lines 938-944).
  Current header constants: `FORGE_PC_VERSION_MAJOR 0`, `FORGE_PC_VERSION_MINOR 7`,
  `FORGE_PC_VERSION_PATCH 0` (forge_pc.h lines 912-916).
- ABI growth policy: features are appended and gated by the API table size - "check
  `forge_api->size` before use; list "required_ver" 0.4" for the 0.4 block, and the README repeats
  "Ask for minor 7 ... if you use any of this". The exe side states the same rule for its own
  structs: "Structs only grow at the end. Each starts with its size and version; read a field only
  if the size the other side reports covers it (`MODHOST_HAS(Type, ptr, field)`)"
  (mod_host_api.h lines 626-628), and mentions "an exe older than mod host ABI 2" (forge_pc.h
  line 1230).
- Binary format: x64 Windows DLL / Linux shared object; Linux plugins build with
  `-shared -fPIC -fvisibility=hidden` and export only `forge_*` so each plugin keeps its own Dear
  ImGui (README "Building"); plugins that draw with ImGui must use the same Dear ImGui version
  (`forge_api->imgui_version`).
- Hooks are pre/post callbacks run by the recompiler's dispatcher, and byte patches of code have
  no effect because the code is recompiled; game addresses are 32-bit guest addresses accessed
  through `forge_api->mem_*` (README "Writing a plugin"). 0.4 added `hook_override` /
  `call_original`, 0.7 added `FORGE_HOOK_JUMP` and `is_block` (README sections and release notes).
- Rust bindings: `rust/forge-pc-sys`, `rust/forge-pc` (README "Rust:" notes throughout, e.g.
  `forge_pc::Config`, `Action::Jump`, `WANTS_PRESENT`).

### Documentation

README (340 lines, covers install, mod layout, plugin writing, hook ordering, config API, Vulkan
present callbacks, menu, tracing via `forge.ini` `[trace]`, crash reporting, building, credits),
the two header files with structured doc comments, `AI_DISCLOSURE.md`,
`THIRD_PARTY_NOTICES.md`, `mods/UIFix/README.md`, `rust/README.md`, and the release notes. The
GitHub wiki link exists in repo metadata (`has_wiki: true`) but
https://github.com/GURecomp/forge-pc/wiki could not be fetched from this host (ECONNREFUSED), so
whether a wiki is written is unverified.

### Third-party plugins seen in the wild

- GameBanana category "Recomp-Plugins" for MHGU (48 mods total on the hub), e.g.:
  - "Recomp Cam Distance" - "Quest camera distance slider. Set the distance in the Forge menu or
    camdistance.ini ... Requires MHGU 1.4.0 and Forge PC. Unzip into the game folder."
    (https://gamebanana.com/mods/730855)
  - "Recomp Better Box" - "Every Item Box ... gets the full 9-entry house box menu ... Requires
    MHGU 1.4.0 and Forge PC. Unzip into the game folder (the zip already contains
    mods\0100770008DD8000\...)" (https://gamebanana.com/mods/730853)
  - "Recomp Deviant Monster Replacement" - replaces Deviant monster BGM with the original theme
    (https://gamebanana.com/mods/730857)
  - Category page: https://gamebanana.com/mods/cats/50630
- These are the first observed third-party plugins written for the PC loader rather than for the
  Switch loader. [INFERENCE] They are recent (timestamps 1792686xxx epoch ~ 2026-10) and few, so
  the PC plugin ecosystem is new.

## GU<->Rise porting precedents

### What was searched, and with what

- Nexus Mods: not readable from this host. Every attempt failed at TLS before any content:
  https://www.nexusmods.com/monsterhunterrise (and `/search/?gsearch=MHGU`,
  `/mods/1642`), https://nexusmods.com/monsterhunterrise, https://api.nexusmods.com/v1/games.json
  all returned "unable to get local issuer certificate". Two text proxies were tried and also
  failed: https://r.jina.ai/https://www.nexusmods.com/monsterhunterrise (ECONNREFUSED),
  https://api.allorigins.win/raw?url=... (HTTP 522), https://corsproxy.io/?url=... (HTTP 401).
  Nexus content is therefore out of reach here; see Unknown.
- Search engines: DuckDuckGo HTML endpoint refused connection, Mojeek returned HTTP 403,
  cn.bing.com RSS answered but ignored the `site:nexusmods.com` operator and returned unrelated
  Minecraft and Chinese pages, so it was not used for facts.
- What did work: the GameBanana public API (`apiv11`) and GitHub search/API. Hub sizes read from
  the subfeed metadata: MHGU has 48 mods
  (https://gamebanana.com/apiv11/Game/17088/Subfeed?_nPage=1&_csvModelInclusions=Mod&_nPerpage=50),
  Monster Hunter Rise has 198 mods
  (https://gamebanana.com/apiv11/Game/8898/Subfeed?_nPage=1&_csvModelInclusions=Mod&_nPerpage=50).
  GameBanana is not the main hub for Rise mods (Nexus is, but unreadable here), so "not found"
  below means "not on GameBanana", not "does not exist".

### MHGU content in Monster Hunter Rise

Armor: found, explicit MHGU origin.

- "Port: Silverwind Narga Armor [from gatomiau]", Monster Hunter Rise, category Skins, submitted
  by Rowelten, version 1.1, 18 likes: https://gamebanana.com/mods/458243 . Page description
  (page meta and `apiv11/Mod/458243` `_sText`): "One of the best armor from MHGU, an Absolute
  classic", "My favourite from MHGU", "Replace Lucent Narga both Male & Female (assets
  automatically copied to female version)", "Game Version 16.0.1".
- The upload itself is packed for the Switch build of Rise: install step "put the files inside
  your SD card => /atmosphere/contents/0100B04011742000/romfs", file
  `re_chunk_000.pak.patch_016.pak`. Its PC original is credited as
  https://www.nexusmods.com/monsterhunterrise/mods/1642 by "gatomiau" (not opened, see above).
  So the MHGU Silverwind (Deviant Nargacuga) armor exists as a Rise mod; the copy I could read is
  the Switch re-pack of the Nexus PC mod.
- A third Rise mod by the same submitter matched the "MHGU" search ("Pega[Sus] Fantasy",
  https://gamebanana.com/mods/526810) but its page text was not read, so it is not counted.

Monster: found, but only a model swap, and the model's origin is not stated.

- "Lagiacrus model swap", Monster Hunter Rise, category Skins, by RayMH:
  https://gamebanana.com/mods/414340 . `_sText`: "This mod replaces Royal Ludroth's model with
  Lagiacrus, including texts, sounds, and icons. The monster is still a regular Royal Ludroth with
  his attacks and hitboxes. Also includes an Ivory or Abyssal version." Credits
  https://www.nexusmods.com/monsterhunterrise/mods/1271 ("IvoryLagiacrus on Nexus Mods") for the
  original mod. Lagiacrus is a Generations Ultimate monster, but the page does not say where the
  mesh came from, so "MHGU model ported to Rise" is [INFERENCE], not a fact.
- No mod on GameBanana Rise adds a GU monster with its own moveset; searches for "Nerscylla"
  (0 results), "Zamtrios" (0 results) and "Tetsucabra" (0 results) on the Rise hub returned
  nothing.

Maps: none found.

- Rise hub queries returning 0 results: "Ancestral Steppe" (0), "Misty Peaks" (0),
  "Primal Forest" (0) - all MHGU maps. Queries are reproducible as
  https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=<term>&_idGameRow=8898&_sModelName=Mod
- Generic terms: "MHGU" on the Rise hub returned 3 mods, of which only the Silverwind armor above
  is confirmed MHGU content (the other two are a music track and "Pega[Sus] Fantasy", whose page
  text was not read); "Generations" 0;
  "Deviant" 0; "Gammoth" 0; "Hellblade" 0; "Dreadking" 0.
- No Rise map mods were seen at all in the queries run, so no MHGU map has been ported to Rise on
  this hub.

### Rise content in MHGU

Music: found.

- "MHRisebreak G-Rank Jukebox", MHGU, category Music, by Handburger:
  https://gamebanana.com/mods/603812 . 13 G-Rank Hub track replacements, including
  "Kamura's Song of Purification (Kamura Village Theme)", "Brave Hunters (Kamura Gathering Hub
  Theme)", "Basking in Eternal Breeze (Elgado Outpost Theme.)", "Beyond the Endless Deep Blue
  (Main Menu)" and "Silver-winged Star - Valstrax: Recorder Version"; credits Capcom for the
  MHRise themes. Installed as MHGU `romfs/nativeNX` files. This is audio only: no models, no
  monsters, no maps.

Models, monsters, maps: none found.

- MHGU hub queries returning 0 results: "Magnamalo" (0), "Malzeno" (0). "Kamura" returned only the
  Rise music mod above. "Rise" returned 2 mods and neither imports a Rise asset: "Damage Numbers"
  (https://gamebanana.com/mods/725408) has a screenshot captioned "MH Rise style", and
  "FF14-style Damage Text" (https://gamebanana.com/mods/727751) is unrelated. "Sunbreak" returned
  "MHGU/XX Rebalanced" (https://gamebanana.com/mods/447835), a GU balance overhaul that only
  mentions Sunbreak in its text; it imports no Rise assets.
- The reverse direction is structurally different, [INFERENCE]: MHGU mods here are romfs file
  replacements (`nativeNX`, `resident.arc`) while Rise mods are RE Engine chunk patches
  (`re_chunk_000.pak.patch_NNN.pak`, as on the Silverwind page above), and no conversion tool for
  that pair was found.

### Tooling search (GitHub)

- https://github.com/search?q=MHGU+Rise+port&type=repositories - 0 repositories.
- https://github.com/search?q=MHGU+armor+Rise&type=repositories - 0 repositories.
- https://github.com/search?q=%22Generations+Ultimate%22+Rise+mod&type=repositories - 0 repositories.
- The MHGU-side projects that do exist are for the Switch game itself, e.g.
  https://github.com/Fexty12573/forge and its Rust binding https://github.com/Fexty12573/forge-rs,
  and the mod loader for the recompiled PC build, https://github.com/GURecomp/forge-pc (see above).

### Bottom line

- MHGU -> Rise: one readable armor precedent (Silverwind Narga Armor, MHGU-origin, Rise Switch
  re-pack of a Nexus PC mod) and one model-swap precedent of a GU monster (Lagiacrus over Royal
  Ludroth, origin of the mesh unstated). No monster with new behaviour, no map.
- Rise -> MHGU: one music mod (MHRisebreak G-Rank Jukebox). No armor, monster or map port found.

## Unknown

- Nexus Mods could not be opened from this host (TLS error, exact URLs and proxy attempts listed
  above). Everything Nexus-only - the gatomiau Silverwind armor original (mods/1642), the
  IvoryLagiacrus original (mods/1271), Nexus search results for MHGU/Rise ports, download counts
  and permissions - is unverified. Whether Nexus holds MHGU map ports or full monster ports is
  therefore unknown.
- Where the Lagiacrus mesh in https://gamebanana.com/mods/414340 came from (MHGU rip, 3U rip or
  new model) is not stated on the page.
- Whether "Pega[Sus] Fantasy" (https://gamebanana.com/mods/526810) is an MHGU armor port: its
  title matched the "MHGU" search but its page text was not read.
- The exact contents of the Forge PC releases beyond v0.7.0 (the API returned only the latest one
  with `per_page=5`, published 2026-10-22), and whether the repo wiki has any pages
  (https://github.com/GURecomp/forge-pc/wiki unreachable from here).
- No data was found on MHGU map or monster ports into Rise from any source other than GameBanana;
  a Nexus-based answer would need a host that can reach Nexus.

