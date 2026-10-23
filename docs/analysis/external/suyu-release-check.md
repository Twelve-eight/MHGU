# SUYU-GURecomp Release Check (MHGU native recompile)

Read-only verification, 2026-10-23. Sources: GitHub REST API (URLs below) and the local clone
`G:/omp works/.tmp/ext/SUYU-GURecomp` (`git` branch `main`, `.git/HEAD`; changelog head is
`0.10.0-test`, `docs/a32recomp/CHANGELOG.md:1-3`).
Nothing was downloaded, built or run. Asset sizes/digests come from release metadata only.

## Releases

Source: `https://api.github.com/repos/GURecomp/SUYU-GURecomp/releases?per_page=5` (read 2026-10-23).
The API returned exactly 5 releases.

| Tag | Published (UTC) | Prerelease | Asset | Size (bytes / MiB) | SHA-256 (API `digest`) | DLs |
|---|---|---|---|---|---|---|
| `v0.10.0-test` | 2026-10-22T13:35:19Z | false | `suyu-mhgu-0.10.0-test-windows-x64.zip` | 129,987,918 / 124.0 | `3e6af297edfbc9f63eca9212b2713f4f0bf27d93d3b500bcf2fe51e4999d3d07` | 91 |
| `v0.10.0-test` | 2026-10-22T13:35:19Z | false | `suyu-mhgu-0.10.0-test-linux-x64.tar.xz` | 65,353,356 / 62.3 | `574d5a6f9ab0e7cacfe1bc79f5204636074d8a4bbc28de64530bfb5474fd61bf` | 9 |
| `v0.9.0-test` | 2026-10-21T09:05:21Z | false | `suyu-mhgu-0.9.0-test-windows-x64.zip` | 129,889,697 / 123.9 | `d6c8b6dc86a948f361c20c3956180b377d4ef4b80822b7f9c427d0f939fa9999` | 33 |
| `v0.9.0-test` | 2026-10-21T09:05:21Z | false | `suyu-mhgu-0.9.0-test-linux-x64.tar.xz` | 65,296,520 / 62.3 | `f90e7daede24a44efe28cf384a0a453e39b0d3d683ee723a62c893d5baab6d5d` | 10 |
| `v0.8.0-test` | 2026-10-16T18:12:08Z | false | `suyu-mhgu-0.8.0-test-windows-x64.zip` | 126,346,461 / 120.5 | `af3a84be16d3106d90cfc908c2a1b29be0426abb4ea6e6c07bd99b01d2955b75` | 10 |
| `v0.8.0-test-linux` | 2026-10-16T23:46:07Z | **true** | `suyu-mhgu-0.8.0-test-linux-x64.tar.xz` | 64,063,572 / 61.1 | `0db782a98a110f8aae9f0564b7a266d9d28bb9ae95ab5e6325a498e590ca6e7b` | 3 |
| `v0.3.1-test` | 2026-10-11T01:50:17Z | false | `suyu-mhgu-0.3.1-test-windows-x64.zip` | 125,042,192 / 119.2 | `e6f45a387e0ee9cbdccd32fb0e322254e73e74464475dcb8a99dd7f806a83694` | 7 |
| `v0.3.1-test` | 2026-10-11T01:50:17Z | false | `suyu-mhgu-0.3.1-test-linux-x64.tar.xz` | 63,162,004 / 60.2 | `f17c76660962a942897cde28fb6cb9254ebaebee8fca9ffc35720612428290bb` | 2 |

Cross-checks on the newest release (`v0.10.0-test`):

- The two API `digest` values are string-identical to the SHA-256 values printed in that release's
  `body` ("Download" block), so the published text and the API metadata agree.
- `v0.8.0-test` has only a Windows asset; `v0.8.0-test-linux` is a separate, marked pre-release
  whose notes say it "has only been tested in WSL (software Vulkan), not on real Linux hardware".
- `target_commitish` for `v0.10.0-test` is `main`; `v0.9.0-test` and older pin an explicit commit.
- Tag `v0.10.0-test` resolves to commit `35015f1488eeabc226f815fbadc2f348ebb948f8`
  (`https://api.github.com/repos/GURecomp/SUYU-GURecomp/git/ref/tags/v0.10.0-test`), type
  `commit` (no annotated-tag indirection).
- Both `v0.10.0-test` and `v0.9.0-test` report `"immutable": false`, i.e. GitHub does not lock the
  assets; the SHA-256 pin above is the control, not the release itself.
- No source archive is attached as an asset (only 2 platform builds). Source is the tagged tree
  (`tarball_url` / `zipball_url`), matching the release body's "source for this build is the
  tagged commit".
- Repo metadata (`https://api.github.com/repos/GURecomp/SUYU-GURecomp`): license `GPL-3.0`
  (SPDX), created 2026-10-03, pushed 2026-10-22T13:34:40Z, size 24,040 KB, 15 stars, 3 open
  issues, `archived: false`, default branch `main`. The project is ~3 weeks old at check time.

## License per artifact

| Artifact | License stated | Where |
|---|---|---|
| Repo source tree | GPL-3.0-or-later | `README.md:206` ("GPL-3.0-or-later. See LICENSE.txt"); `RELEASE.md:8`, `RELEASE.md:64`; `LICENSE.txt:1-2` is the GNU GPL v3 text |
| Release zips (`suyu.exe`, DLLs, `link_kit`, licenses) | GPL-3.0-or-later; "source for this build is the tagged commit" | `RELEASE.md:8-9`, `RELEASE.md:73-74`, `RELEASE.md:134-135`; `v0.10.0-test` body, "License" |
| GPL source offer | every release zip must match a commit in the public repo, tagged with the version | `RELEASE.md:73-74`; satisfied here by tag `v0.10.0-test` -> `35015f1` |
| `mod_host_api.h` | MIT | `RELEASE.md:65` |
| Forge PC (separate download, not in the zip) | MIT, based on Fexty's Forge (MIT) | `RELEASE.md:66` |
| Qt 6 DLLs | LGPL-3.0, dynamically linked/replaceable | `RELEASE.md:67` (`licenses/qt/` in the zip) |
| OpenSSL | Apache-2.0 | `RELEASE.md:68` (`licenses/Apache-2.0.txt`) |
| DXC (`dxcompiler.dll`, `dxil.dll`) | NCSA / Microsoft redistributable | `RELEASE.md:69` (`LICENSES.txt` in the zip) |
| Other bundled libraries | own GPL-compatible licenses, texts in `licenses/` | `RELEASE.md:70`; SPDX texts also in the repo `LICENSES/` (18 files: MIT, Apache-2.0, LGPL-3.0-or-later, BSD-2/3, MPL-2.0, Zlib, Unlicense, ...) |

Notes:

- GitHub's classifier reports `GPL-3.0`, not `GPL-3.0-or-later`; the project's own docs say
  "or-later" (`README.md:206`, `RELEASE.md:64`, `AI_DISCLOSURE.md` "Licensing and responsibility").
  The difference is a licensing label, not a redistribution ban.
- Public MHGU patch packs used as reference are not shipped (`RELEASE.md:71`, release body
  "Credits": masagrator 60 FPS, minderrx 90/120 FPS, Fl4sh9174 pchtxt, TLin-Y 16:10).
- Provenance disclosure: the project states a large share of the code and docs was written with
  an AI coding assistant under maintainer direction, and that no leaked/NDA material was used
  (`docs/a32recomp/AI_DISCLOSURE.md:1-40`).

What the exported game binary is, per the project's own docs:

- It is generated on the user's PC from the user's own dump; the release itself contains no game
  code, keys or game files (`INSTALL.md:3-6`, `INSTALL.md:10-11`, `README.md:26-30`).
- It must not be shared or redistributed: "you must never share it or anything the export
  produces" (`INSTALL.md:10-11`); "Never published, in the repo, a release, an issue or a
  screenshot: ... anything an export produces: the game exe, `aot_cache`/`exefs` folders,
  generated C code, `.lib`/`.obj` files built from the game" (`RELEASE.md:11-17`); "that output
  must not be shared" (`README.md:192-194`).
- Keys and dumps are likewise never redistributable (`README.md:183-186`, `RELEASE.md:13-15`).
- No license is granted for the exported exe by these documents; they only forbid sharing it.
  The exe links suyu's `link_kit` objects into the game (`INSTALL.md:79-82`,
  `game_export.cpp:2682`), so GPL questions about the combined artifact are not answered in-repo
  (see Unknown).

## Export flow

The export is a two-stage thing: suyu (the released zip) does the recompile + compile + link;
the user supplies keys, a dump and the update. Steps below are for the prebuilt Windows zip;
line numbers are `docs/a32recomp/INSTALL.md` in the local clone.

| # | Step | Citation |
|---|---|---|
| 1 | Install Visual Studio 2022 **17.14+** or VS 2026, free Community or Build Tools, workload "Desktop development with C++" (MSVC x64 latest, Windows 10/11 SDK, C++ CMake tools). Only the compiler is a separate install. | `INSTALL.md:37`, `:40-41`, `:43-69`; ~8-10 GB install, `:65` |
| 2 | Unpack the zip to a writable folder (not `C:\Program Files`); keep `suyu.exe` together with its DLLs, `plugins`, `pipelines`, `coverage`, `link_kit`. Run `suyu.exe` (SmartScreen: More info -> Run anyway). | `INSTALL.md:77-84` |
| 3 | Put **your own** `prod.keys` and `title.keys` in suyu's `keys` folder (File -> Open suyu Folder), restart. | `INSTALL.md:87-91` |
| 4 | Add your own dump: folder with MHGU `.xci` or `.nsp` (base game). | `INSTALL.md:93` |
| 5 | Install the 1.4.0 update: File -> Install Files to NAND..., pick the update `.nsp`; game Properties must show 1.4.0. | `INSTALL.md:94-95` |
| 6 | Version gate is **1.4.0 only**, title ID `0100770008DD8000`. | `INSTALL.md:97`; `src/core/arm/recomp/game_settings.h:22` |
| 7 | File -> Export Game..., pick the game and an **empty** output folder on a drive with ~25 GB free, defaults ("Use my suyu controller setup for Player 1" is on). | `INSTALL.md:101-105` |
| 8 | Wait **~10-20 min**, all cores busy (unpack, recompile modules, compile C, link). | `INSTALL.md:106-108` |
| 9 | Success marker: log ends with `Built single-file launcher with the link kit`. | `INSTALL.md:109-110`; source `src/suyu/game_export.cpp:2682` |
| 10 | Run `MONSTER HUNTER GENERATIONS ULTIMATE.exe` from the output folder. | `INSTALL.md:111` |
| 11 | Re-export only when a newer suyu release arrives; settings and mods never need a re-export. | `INSTALL.md:113-114` |

Required inputs (all user-supplied, none in the release):

- Own MHGU dump, `.xci` or `.nsp` (`INSTALL.md:38`, `:93`).
- Own `prod.keys` / `title.keys` (`INSTALL.md:38`, `:87`).
- The **1.4.0 update `.nsp`**, installed into NAND before export (`INSTALL.md:38`, `:94-97`).
  The exporter recompiles the installed update's ExeFS and romfs instead of the base
  (`game_export.cpp:1158-1174`, `:1221-1234`, `:1353-1356`), which is why the update matters.
- A Vulkan-capable GPU with a current driver; 16 GB RAM recommended (`INSTALL.md:31-38`).

Toolchain answer, precisely:

- The **prebuilt release** already contains `suyu.exe`, its DLLs and the `link_kit`, so no C++
  build of suyu is needed (`INSTALL.md:40-41`, `INSTALL.md:79-82`, `RELEASE.md:8-9`).
- Visual Studio is **not** only for building suyu from source: the released suyu calls
  `cl.exe`, `link.exe` and VS's CMake during **export** to compile the game's recompiled C
  (`INSTALL.md:45-47`). Without a VS toolset the export aborts before recompiling:
  `game_export.cpp:2229-2239` and `:1708-1719` ("no Visual Studio C++ build tools found
  (vcvars64.bat)"). `SUYU_VCVARS` overrides the toolchain lookup (`INSTALL.md:195`).
- What the prebuilt export does *not* need: CMake configure of suyu's source tree, Qt, the Vulkan
  SDK, Python or Ninja - those are only in the from-source build guide (`BUILDING.md:10-24`).
  The kit path "only compiles this game's registration table and links: no CMake, no suyu
  sources" (`game_export.cpp:1701-1704`).

Disk space (`INSTALL.md:36`, `:102`, `:198`):

- ~25 GB free on the export drive (worst case, archives decompressed).
- Finished export folder ~22 GB, mostly unpacked game files; ~12 GB if "Decompress game
  archives" is unticked (`INSTALL.md:36`; the dialog says the option adds "about 10 GB more for
  Monster Hunter Generations Ultimate", `game_export.cpp:508-513`).
- Plus ~10 GB for Visual Studio (`INSTALL.md:36`, `:65`).

Output layout (Windows single-file launcher):

```
<export folder>\
  MONSTER HUNTER GENERATIONS ULTIMATE.exe   INSTALL.md:111
  launch.bat, *.dll                        runtime libs FFmpeg/Vulkan/OpenSSL, game_export.cpp:3414-3415
  exefs\                                   extracted game exes/data, no ROM/keys needed at run time,
                                           game_export.cpp:3417-3418
  mods\0100770008DD8000\<mod name>\romfs\...   INSTALL.md:153-158
  mods\0100770008DD8000\Forge\forge.dll     Forge PC code mods, INSTALL.md:164-166
  user\                                    this export's own config, saves, logs,
                                           game_export.cpp:3420 and :4000; mod_host_api.h:95-96
  game_settings.ini                        created beside the exe on first start, INSTALL.md:130
```

Save location:

- Saves live inside the export's own `user\` tree, not in suyu's data folder (`game_export.cpp:3420`,
  `:4000`; `mod_host_api.h:95`).
- Portable data dir = `<exe dir>\user` when it exists, else `%APPDATA%\suyu`
  (`src/common/fs/path_util.cpp:105-117`); save dir = that dir + `\nand`
  (`path_util.cpp:162`).
- Account save data is composed as `<save dir>\user\save\0000000000000000\<user id 32 hex>\<title id>`
  (`src/core/file_sys/savedata_factory.cpp:137`, space id path `:93-99`, relative root `:90`).
  [INFERENCE] the concrete folder for this game is therefore
  `<export>\user\nand\user\save\0000000000000000\<user id>\0100770008DD8000\`; not run-verified.
- At export the title's existing saves are copied from suyu's NAND save root into
  `<export>\user\nand\user\save` when "Include save data for this game" is ticked (default
  checked) (`game_export.cpp:228-247`, `:493-494`).
- The authoritative display of the actual folders is the in-game F10 menu, tab General
  ("folders (saves, logs, mods)") (`INSTALL.md:126`).
- Logs/reports for support: `user\log\suyu_log.txt`, `user\recomp_report.txt`; never attach the
  game exe, `exefs` folder, keys or game files (`INSTALL.md:213`, `:216-217`).

Mods: file-replacement mods only via `mods\0100770008DD8000\<mod>\romfs\...`; `exefs` patches,
`.pchtxt`/`.ips` and cheats are **not supported** because the code is already recompiled
(`INSTALL.md:153-163`). Code mods require the separate Forge PC download (MIT)
(`INSTALL.md:164-168`).

Linux: same flow via `INSTALL-LINUX.md`; the Linux asset needs glibc 2.35+ and is FSR 3.1 only
(`v0.10.0-test` body). Not evaluated here.

## Must users build it themselves?

No. Use the prebuilt release; a source build is not on the critical path.

- `INSTALL.md:3-6`: the guide "covers the prebuilt release (`suyu-mhgu-<version>-windows-x64.zip`
  from the Releases page)".
- `BUILDING.md:6-7`: "Players don't need this: the prebuilt release and INSTALL.md are enough."
- `RELEASE.md:8-9`: the published zip is `suyu.exe`, its DLLs, the link kit and licenses -
  i.e. the complete exporter.
- Building suyu from source additionally needs Qt 6, the Vulkan SDK and Python 3
  (`BUILDING.md:10-24`; CMake and Ninja come with the VS C++ tools, `BUILDING.md:15`) and 30-90
  min of build time (`BUILDING.md:44-46`). None of that is needed to export with the zip; the
  only unavoidable external tool is the Visual Studio C++ build tools, which the **export** uses
  to compile game code (`INSTALL.md:40-47`).

Verdict for MHGU: **the prebuilt `v0.10.0-test` Windows zip is usable and is the intended
path.** Pin it by SHA-256 `3e6af297edfbc9f63eca9212b2713f4f0bf27d93d3b500bcf2fe51e4999d3d07`
(`suyu-mhgu-0.10.0-test-windows-x64.zip`, 129,987,918 bytes). Build from source only if suyu
itself must be changed or a source-format export is wanted (`BUILDING.md:59-63`). The release
ships a link kit precisely because it has no build tree (`BUILDING.md:65-68`).

Caveats recorded as facts, not judgement: the release is self-labelled "test build"; the online
path needs a self-hosted NEX server and "parts of the matchmaking replies are still guesses"
(`v0.10.0-test` body, Known issues); the repo is ~3 weeks old (created 2026-10-03, API) with 3
open issues.

Minimum hands-on step list for the later authorized window (Windows, prebuilt):

1. Download `suyu-mhgu-0.10.0-test-windows-x64.zip`; verify SHA-256 equals
   `3e6af2...9d3d07` (e.g. `certutil -hashfile <zip> SHA256`, the method `RELEASE.md:84` uses).
2. Install Visual Studio 2022 >= 17.14 or VS 2026 with "Desktop development with C++"
   (~10 GB); no IDE use needed afterwards (`INSTALL.md:43-73`).
3. Extract the zip to a writable, non-`Program Files` folder; run `suyu.exe` once
   (`INSTALL.md:77-84`).
4. Copy own `prod.keys`/`title.keys` into suyu's `keys` folder; restart (`INSTALL.md:85-91`).
5. Add own MHGU dump folder (`.xci`/`.nsp`) and install the 1.4.0 update `.nsp` to NAND; confirm
   Properties shows 1.4.0 (`INSTALL.md:93-97`).
6. File -> Export Game... into an empty folder with ~25 GB free, defaults; wait 10-20 min; confirm
   `Built single-file launcher with the link kit` in the log (`INSTALL.md:99-110`).
7. Run `MONSTER HUNTER GENERATIONS ULTIMATE.exe`; optional: drop Forge PC at
   `mods\0100770008DD8000\Forge\forge.dll` (`INSTALL.md:111`, `:164-166`).
8. Keep the export private: never share the exe, `exefs`, generated C, keys or dumps
   (`INSTALL.md:216-217`, `RELEASE.md:11-17`).

## Unknown

- Whether the local clone is exactly at the release commit: `.git/HEAD` says branch `main` and the
  changelog head is `0.10.0-test` (`CHANGELOG.md:1-3`), but without running git the clone's SHA
  cannot be compared to tag commit `35015f1488eeabc226f815fbadc2f348ebb948f8`.
- Combined-work licensing of the exported exe (GPL `link_kit` code linked with the user's game
  code): no statement in `INSTALL.md`, `RELEASE.md`, `README.md` or `AI_DISCLOSURE.md`; only
  "must not be shared".
- Zip contents not inspected (download out of scope): `LICENSE.txt`, `LICENSES.txt`,
  `licenses/qt/`, `licenses/Apache-2.0.txt` are asserted by `RELEASE.md:67-70` and the `v0.10.0-test`
  body, not verified here.
- Exact leaf path of the save folder under `user\nand\user\save\...` is derived from
  `path_util.cpp:162` + `savedata_factory.cpp:137` + `game_export.cpp:238-245`; not confirmed by
  running an export. The in-game menu is the reliable place to read it (`INSTALL.md:126`).
- Asset integrity over time: both newest releases report `"immutable": false`, so upstream could
  replace an asset; only the recorded SHA-256 pins what was checked on 2026-10-23.
- No signature/attestation or build provenance beyond the SHA-256 in the release body and API
  digest; the zip is unsigned and SmartScreen warns (`INSTALL.md:83`).
- Documented claims not measured here: 10-20 min export time, 16 GB RAM recommendation,
  VS 2026 compatibility, Linux support (that release says it was only tested in WSL).
- MHGU-specific runtime behaviour (e.g. the 60/90/120 FPS write documented at
  `game_settings.h:22-25`, offsets at `game_settings.cpp:41-44`) was not exercised; no game was
  run.
