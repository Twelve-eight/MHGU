# MHGU research

Reverse-engineering notes and tools for **Monster Hunter Generations Ultimate (Switch, v1.4.0)**:
save-file layout, code map, monster mechanics, an item-box expansion patch, and a save editor.
Goal: help more people play MHGU with more variety, on emulators and on the native recompiled
build ([SUYU-GURecomp](https://github.com/GURecomp/SUYU-GURecomp)).

**No game code, keys, game files, or save files are in this repository.** You need your own legal
dump. Tools that read the game expect a flat image you produce yourself
(`tools/mhgu/nso-flat.mjs <your exefs/main> main.140.flat.bin`).

| Path | What |
|---|---|
| `docs/` | Findings (see `docs/README.md` for the index). Addresses are NSO vaddrs; `flat_off = vaddr + 0x100`. |
| `docs/analysis/external/` | Facts checked against SUYU-GURecomp (GPL-3.0): addresses and formats only, restated in our own words, with citations. No GPL code. |
| `tools/mhgu/` | Disassembler/inventory/analysis scripts (Node + Python). |
| `patch/1.4.0.pchtxt` | Item-box expansion patch (emulator / console; not applicable to the recompiled build). |

## License
- Code and tools: GPL-3.0-or-later (`LICENSE`). Relicensed from MIT on 2026-10-24.
- Documentation under `docs/`: CC BY 4.0 (`docs/LICENSE`).
- Monster Hunter is a trademark of Capcom. Not affiliated with Capcom or Nintendo. Game data
  facts (addresses, field layouts) are described for interoperability.
