# MHGU 1.4.0 main reverse-engineering guide (for agents)

Read this before any GU binary work. Every item below cost a previous agent hours.

## 1. Binary facts
- File: `G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`. vaddr = flat offset - 0x100.
- **ARM A32 only, not Thumb.** Every verified call site has cond 0xE words. Thumb scans are invalid.
- Tools: CLI `node "G:/omp works/.tmp/re-cli.mjs" disasm|words|calls|lits|fn <vaddr> [n]`, or the mhgu-re MCP (v1.3.0+). Both use `MHGU/tools/mhgu/arm32.mjs`.
- Decoder history: before v1.2.0 ldrh/ldrsb/ldrsh/strd offsets were wrong; before v1.3.0 `E6BFxx7x` (SXTH) and the whole sxt*/uxt* family printed as `ldr ... [pc, rX, ror rY]`. If a report says "UNPREDICTABLE" or "pc ror load", re-disassemble with the current tool. Before v1.4.0 all VFP (vldr/vstr/vadd/vmul/vcmp/vcvt/vmov/vmrs/vpush, 463k words) printed as `.word ... ; coproc`; now decoded (60 half-precision/fixed-point words remain raw). Other media ops still print as `.word ... ; media`: decode by hand from the ARM ARM, do not guess.
- **The mhgu-re MCP server loads the decoder once at start.** A long-running session can still serve an old build (seen 2026-10-25: halfword register offsets printed as `#0`, SXTH as `ldr ... ror`). If MCP output disagrees with the CLI, trust the CLI (`.tmp/re-cli.mjs` re-imports `arm32.mjs` on every run).
- `E79Fxxxx` = `ldr rX, [pc, rY]` (PC-relative register-offset load, real). Pattern: `ldr r0,[pc,#imm]` then `ldr r0,[pc,r0]` = load from a global; resolve with `words`.

## 2. Finding code
- **Small immediates** (skill ids, state numbers, tree ids < 256) are `mov rN,#imm` / `cmp rN,#imm`. `lits` will not find them. Scan disasm for the mov/cmp, then check the next `bl`.
- `lits` finds pc-relative literals, movw+movt pairs (movt within 8 insns), vldr pc, and (since 2026-10-30) a lone movw for values <= 0xFFFF. A 0-hit `lits` on a type hash does not mean "unused": resource type hashes appear only in per-arc (pathHash, typeHash) manifests (around flat 0x15dccd4); loaders are data-driven. Struct offsets above 0xFFF cannot be ldr/str imm12 offsets: they appear only as movw + register-offset access, so search the movw and then the register use.
- `calls` lists direct `bl`/`blx imm` only. Thunks and tail calls (`b`) hide callers. Use `refs_to` (MCP, 2026-10-30): bl/blx, b with any condition, adr, the pc-delta idiom `ldr rX,[pc,#lit]` + `add rD,pc,rX` (target = add site + 8 + delta; how this binary reaches tables such as 0x179110c), and absolute pointer words anywhere in the image (vtables, function tables). Still not covered: `blx rN` through runtime-built tables and computed pointers.
- Disassembler fix 2026-10-30 (`arm32.mjs`, MHGU 0508f0e): register data-processing forms with ASR/ROR, odd shift amounts or register shifts used to print as `.word` (14% of .text) or as bogus ldrd/strd. Re-check any old conclusion that rested on "no instruction touches X here" in a region that had many `.word`s. Immediates are printed in DECIMAL (`#100`); never parse them as hex. Never bit-mask raw words yourself (JS `&` is signed: use `(w & M) >>> 0`); match the printed mnemonic instead. A function's end is its epilogue, not the next `push {...,lr}`.
- The MCP server loads `arm32.mjs` at start: after a decoder change the MCP process must be restarted before agents see it.
- No 'wind'/'Wind'/'HDE' strings in main. Do not search for English names of mechanics.

## 3. Known anchors (verified, cite them, do not rediscover)
- Active-skill test: thunk `0x2864c4(player, skillId)` -> `0xe0da0` bitmask test at `[[pl+0x13C4]+4+392]`, word `988 + 4*(id>>5)`. `0x2864e0` -> `0xe1e08` compares the 8-entry active list (`ldrb [588..595]`). Skill ids = `mhgu.db skills._id` (10 HG Earplugs, 11 Earplugs, 12/13 Windproof Hi/Lo, 14 Tremor Res). 978 static call sites; the `mov r1,#id` before each `bl` names the skill.
- Wind/roar reaction gate `0x2f2874(this, kind)`; tremor gate in `0x2ee508` at `0x2f02f8`. Player hit-reaction executor `0x2ee508`, dispatcher `0x2f22e8` (79-case table at 0x2f2320).
- Monster abnormal-state subsystem `0x2EF000..0x2F5FFF`; status buildup add `0x2F58B4` (u16 @em+0x298C, s16 @em+0x298E), potency `0x2F595C`, called from `0x1711DC..0x171204`.
- Monster resource pointers: array em+0x2630..0x26F4 (em+0x26F0 = rEnemyNandoData, proven by tag getters 0x58884/0x58C74). The dttune pointer is NOT in that array: it is at owner+0x75EC (stored by callback 0x70a1c; getter 0x71078 = `ldr r0,[r0,#0x75ec]; add r0,r0,#100`), so status blocks are getter()+52..+84. Correction 2026-10-25: the earlier rule "sub-blocks are reached only through resource vtable slots +156/+164" is wrong for dttune (its vtable 0x17330A4 has no such slots). General method: find the field that stores the resource pointer (callback/store after the resource fetch), then its owner-side getters, then their callers. Immediate-offset scans on the resource fail because access goes through an owner getter plus a small add.
- Trap seen twice in T1: status-like code with thresholds is often the HUNTER's (Frenzy gauge 0x2F58B4; hunter status 0x9D6F8, thresholds 200/180/150). Confirm the object is the monster before claiming a monster mechanic.
- Monster AI script (rEnemyCmd / EMC): monster holds it at em+0x2588; interpreter 0x82f80, loop 0x83770, 256-way table 0x837ac; instruction length 0x50ce0 with table 0x1732c8c; block matcher 0x8e144. Format + decoder: `MHGU/docs/reference/formats/emc.md`, `MHGU/tools/mhgu/emc.mjs`.
- Monster rage/tired pipeline (MechRageGU, under glm review): 0x1069d8c -> 0x106aef0 -> 0x1068dd8 -> 0x106b04c.
- Reports with full evidence: `G:/omp works/.tmp/reports-mech/wind-gu-code.md`, `status-gu.md`, `interrupt-gu-data.md`.

## 4. Data files
- romfs `G:/mhgu-romfs/romfs/nativeNX/`; `node "G:/omp works/MHGU/tools/mhgu/arc.mjs" list|extract`.
- Monster id -> monster: ONLY `MHGU/docs/data/json/monster-slot-map.json` (emid, slot, cn, en, cn_src). em001 = Rathian (slot 0), em002 = Rathalos (slot 3), em010 = Plesioth (slot 9), em016 = Iodrome (slot 13), em023 = Rajang (slot 21), em024 = Kushala Daora (slot 23). Never from memory.
- dttune: layout notes in `MHGU/docs/wiki/hitzones-all-a.md` §1, offsets per monster in `MHGU/docs/data/json/monster-dttune-index.json` (offsets are hex strings: parse with int(x,16)).
- attackdata (`enemy\hit_data\emNNN_00_attackdata`): `HDE\0`, count@8, 0x20 B records from **0x10** (corrected 2026-10-30, GapHitTiming + GapHitTimingX; the older "0x30" is one record off). Record: +0x00 u16 start A, +0x02 u16 duration B (window = motion frames [A, A+B)), +0x04 dmg, +0x06 react, +0x08 u16 flag word, +0x0C attr bits (0x04 fire, 0x10 water, 0x40 thunder, 0x80 ice, 0x20 dragon), +0x10/+0x14 u32 ailment flag words, +0x18 ailment value (GapPoison + GapPoisonX). `FFFF/FE` records are list separators (some monsters have two lists). Runtime picker 0x70ffc: index = row - 1000.
- Cross-check against `MHGU/docs/data/mhgu.db` (third-party db: second source, not ground truth) and the wiki pages under `MHGU/docs/wiki/`.

## 5. Method
1. Write ONE decoder script for a file family and run it on every monster; exceptions show up only across all monsters.
2. For a classifier claim, report hits/misses/leaks on all monsters, not examples.
3. Tag every claim [C]/[B]/[I]/[U] at the claim; cite file + offset or vaddr.
4. Append to your report after every step, including dead ends (Ruled out section), so the next agent skips them.

## Trap: numbers that coincide with ids (seen twice, 2026-10-25)
- Rise motfsm callback numbers were tree indices, and EnemyHitAttackTrack key floats were frame numbers; both matched hit ids on a few samples.
- Before binding a field to an id space, run a full scan: the value domain must stay inside the id set (count values outside it), and a second monster with a disjoint id set must agree.
- Append to your report after every step (AGENTS.md 8b); agents that write only at the end lose work on abort.

## Anchor: monster HP (2026-10-25)
- X = [em+0x1428]; s32 HP current @X+0x370, max @X+0x374. Hit consumer 0x97ddc subtracts damage at 0x98b04. Not stamina (tired-gu.md got this wrong).
- Literal pools: read the word the vldr actually loads (pc+8+imm), not the neighbouring one. 0x106afdc loads 0.1 @0x106b044; 0.30 @0x106b048 is another branch.

## Trap: jump-table targets have no callers (seen twice, 2026-10-25)
- `calls` finds only bl/blx. Targets reached through `add pc, rN, rM` jump tables (e.g. 0x2efc3c via T3 0x2ef994) show 0 callers. Decode the table words (target = table base + word) before concluding "unreachable".
- Function bounds: `fn` and ad-hoc scanners must treat every `push {...,lr}` as a start (fly-gu scanner missed push {r4,r5,r6,lr} and attributed a shared tail to 7 wrong variants).
- List test 0x2864e0 -> 0xe1e08 compares an 8-entry list at ctx+588; its ids (26/30/31/63) are not skills._id nor skill_trees._id.

## Note: lits only finds pc-relative constants (2026-10-25)
- Field reads like `vldr s0,[r0,#0x370]` are not literals; to find readers of a field, grep the full disasm dump (e.g. .tmp/scratch-t4c/full.txt) for the offset. op5f (handler 0x84db0) reads HP that way.
- vt[247] thunks 0xca10c/0xca118 = `ldr r1,[r0]; ldr r1,[r1,#988]; bx r1`: r1 (name) is clobbered; slot 247 of em001 vtable 0x179acf8 = 0x75224 (action end).

## Fixed 2026-10-26: ldr/str writeback (arm32 v1.5.0)
- Before v1.5.0 the decoder printed pre-indexed writeback `[rn, #imm]!` without the `!`, dropped `-` on register offsets and printed post-index as `(post)`. 43,353 ldr/str words in .text use writeback. Byte-by-byte `strb rX,[r0,#k]!` string builders (e.g. loader 0x3cb0c) read wrong before the fix. Re-check any old conclusion that depended on a store/load address computed from such a sequence.
