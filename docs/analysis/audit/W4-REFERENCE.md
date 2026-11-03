# W4 — audit of `docs/reference/` (guides: commands, addresses, cross-references)

Auditor: W4 reference reviewer. Date: 2026-11-04. Read-only; nothing under `docs/reference/` was edited.

## Scope

| Cluster | Files reviewed |
|---|---|
| `docs/reference/` top level | `re-guide-gu.md` (63 L), `re-example-dttune-consumer.md` (138 L), `source-verification.md` (29 L), `SUBAGENT-LEDGER.md` (75 L) |
| `docs/reference/formats/` | all 12: asd, dtbase, dttune, emc, gmd, lmt, mod, mrl, rem, sdl, tex, weapon-tables (1299 L) |
| `docs/reference/suyu/` | README.md, internals.md, internals-review.md |
| `docs/reference/mhxx-wiki` | symlink -> `G:/omp works/MHGU-private/docs/reference/mhxx-wiki`; mirror stats only (the HTML/text pages are external scrapes, not authored claims) |

Artefacts used as ground truth: `main.140.flat.bin` (root, sha256 `a8cfb114…357d515`, identical to the `.tmp` copy the docs cite), `docs/data/mhgu.db` (39 tables), `G:/mhgu-romfs/romfs/nativeNX` (romfs), `MHGU-private/romfs-extract` (loose corpus), `tools/mhgu/*`, `tools/mcp/mhgu-re.mjs`, and the two upstream source trees under `G:/omp works/.tmp/ext` (`SUYU-GURecomp`, `forge-pc`).

Method: for each document every numeric claim, path and code address was recomputed or re-read (disassembly through `mhgu-re` MCP and `G:/omp works/.tmp/re-cli.mjs`, byte reads through `arc.mjs` + `node`), every command was executed unless it needed data absent from this machine, and every `Doc:line` cross-reference was opened at that line. Claims that cannot be checked are listed under **UNVERIFIED** with the reason, never silently dropped.

Gate: `node tools/audit/check.mjs` -> `ALL PASS` (214 manifest docs, meter 52692 functions / 5228277 instructions). This new file is one of the 23 unmanifested new docs the gate reports as a *note*, not a failure.

## 1. Runnable-command table

Verified from a shell in two cwds: `G:/omp works` (the cwd the `.tmp`-relative paths assume) and `G:/omp works/MHGU` (the repo, which the `tools/...` paths assume).

| # | Original text | Where | Verdict | Corrected command / note |
|---|---|---|---|---|
| 1 | `node "G:/omp works/.tmp/re-cli.mjs" disasm <vaddr> [n]` | re-guide-gu.md:8 | works | `n` is capped at 400 by the CLI (`Math.min(n,400)`) |
| 2 | `… words <vaddr> [n]` | re-guide-gu.md:8 | works | `n` capped at 256 |
| 3 | `… calls <vaddr> [n]` | re-guide-gu.md:8 | works | `[n]` is not a count: the verb takes `vaddr...`; only the first 500 hits print. `calls 0x2864c4` -> `978 direct-call hit(s)` |
| 4 | `… fn <vaddr> [n]` | re-guide-gu.md:8 | works | again `[n]` is a list of vaddrs, not a count |
| 5 | `… lits <vaddr> [n]` (as implied by `disasm\|words\|calls\|lits\|fn <vaddr> [n]`) | re-guide-gu.md:8, re-example-dttune-consumer.md:14 | **wrong flag/args** — silently useless | `lits <start> <end> <value> [value...]`, e.g. `node "G:/omp works/.tmp/re-cli.mjs" lits 0x0 0x13f2000 0x48e8ac29`. With the documented 2-arg form `end` is `undefined`, `findLiteralLoads` gets `NaN` and the CLI prints `0 hit(s)` with no error (reproduced: `lits 0x106af00` -> `0 hit(s)`). A reader concludes "no hits" from a malformed call. |
| 6 | `node ".tmp/re-cli.mjs" disasm 0x57740 150` | re-example-dttune-consumer.md:14,30 | **wrong path** from the repo | The file is `G:/omp works/.tmp/re-cli.mjs`; from `G:/omp works/MHGU` the call fails with `Error: Cannot find module '…\\MHGU\\.tmp\\re-cli.mjs'` (reproduced). Corrected: `node "G:/omp works/.tmp/re-cli.mjs" disasm 0x57740 150` |
| 7 | `node "G:/omp works/MHGU/tools/mhgu/arc.mjs" list` | re-guide-gu.md:49 | works | `arc.mjs list <arc>` prints the full member table (em001_00.arc: 533 rows) |
| 8 | `node tools/mhgu/arc.mjs extract <arc> <outdir> "_dttune$"` | formats/dttune.md:7 | works | reproduced on em002_00.arc: `# 1 extracted, 0 failed, 552 not matching` |
| 9 | `node tools/mhgu/dttune.mjs <file>` | formats/dttune.md:7 | works | usage line matches: `dttune.mjs <file_dttune> [--raw] [--db mhgu.db --emid N]` |
| 10 | `node tools/mhgu/dttune.mjs <file> --db mhgu.db --emid N` | formats/dttune.md (confidence model) | works | ran on em001_00 (`--emid 1`): `baseHp 4500`, meat `_offset 142` (=0x8E), row 0 `90 80 70 00 15 15 20 35 100 100` |
| 11 | `node tools/mhgu/dtbase.mjs <file|arc>` | formats/dtbase.md:3,69 | tool present, flags match | usage: `dtbase.mjs <file|file.arc> [nameRegex] (arc regex default "_dtbase$|_dtbparts$")` |
| 12 | `node tools/mhgu/emc.mjs [--summary] <file|dir>` | formats/emc.md:3 | tool present, flags match | usage lists both forms |
| 13 | `node MHGU/tools/mhgu/gmd.mjs list <file> --all` | formats/gmd.md:174 | works | reproduced on `eng/table/MonsterDemo_eng.gmd`: `strings 96`, `#0 [Kanji_Lioleia] Rathian` |
| 14 | `node MHGU/tools/mhgu/gmd.mjs batch <langDir> <outDir>` | formats/gmd.md:175 | tool present, flags match | usage: `batch <langDir> <outDir>` |
| 15 | `node tools/mhgu/lmt.mjs info|dump <file> [motionIndex]` | formats/lmt.md:3 | tool present, flags match | usage identical |
| 16 | `node tools/mhgu/mod.mjs info|obj <file> [--lod=1]` | formats/mod.md:3 | tool present, flags match | usage identical |
| 17 | `mrl.mjs info|dump|check|texmap|modnames|corpus|selftest` | formats/mrl.md:17,30 | tool present, flags match | all 8 verbs exist |
| 18 | `node tools/mhgu/rem.mjs arc <questArc>` / `hagi <file>` | formats/rem.md:5,127 | tool present, flags match | usage: `rem|arc|hagi|hagi-arc`, with `--slot A|B|C|D|Sub` |
| 19 | `node tools/mhgu/sdl.mjs dump|arcs|verify|selftest … [--exe <flat>]` | formats/sdl.md:271-274,308-310 | tool present, flags match | usage identical incl. `--quiet`, `--values N` |
| 20 | `node tools/mhgu/tex2dds.mjs <file> <out.dds>` | formats/tex.md:3 | tool present, flags match | usage identical |
| 21 | mhgu-re MCP "v1.3.0+" | re-guide-gu.md:8 | works | `tools/mcp/mhgu-re.mjs:201` reports `version: '1.5.0'`; all five tools answered this audit |
| 22 | `.tmp/reports-mech/{wind-gu-code.md,status-gu.md,interrupt-gu-data.md}` | re-guide-gu.md:37 | works (files exist) | all three present today; note the docs' own rule that `.tmp` is session scratch |
| 23 | `G:/mhgu-romfs/romfs/nativeNX/` | re-guide-gu.md:48 | works | directory exists, arc/enemy + table + chS all readable |
| 24 | `docs/data/json/monster-slot-map.json`, `monster-dttune-index.json` | re-guide-gu.md:50-53 | works | 137-entry array; index keyed by slot with hex-string offsets |
| 25 | `HANDOFF.md:201` ("每 30 个 append 落盘") | SUBAGENT-LEDGER.md:36 | **wrong reference** | the rule is at `HANDOFF.md:230`; line 201 is `tools/mhgu/ ← 可复现工具链 + README` |

## 2. Address / offset checks

All vaddrs are image vaddrs (`flat = vaddr + 0x100`); the image's module image is `text 0x0-0x13f2000`, `rodata 0x13f2000-0x172f000`, `rwdata 0x172f000-0x184ad78`, `.bss 0x184b000-0x2148000` (`nso-extract.log`). That split matters: an address inside `.bss` cannot be read from the file, only its structural plausibility can be shown.

### 2.1 `re-guide-gu.md` — known anchors (the "cite, do not rediscover" list)

| Claim | Result |
|---|---|
| thunk `0x2864c4` -> `0xe0da0`, bitmask at `[[pl+0x13C4]+4+392]`, word `988+4*(id>>5)` | CONFIRMED byte-exact: `0x2864c4 movw r2,#0x13c4; ldr r0,[r0,r2]; add r0,#4; b 0xe0da0`; `0xe0da0 ldr r0,[r0,#392]`, `0xe0dc8 ldr r0,[r0,#988]` after `mov r2,r2,asr #5` |
| `0x2864e0` -> `0xe1e08`, 8-entry list `ldrb [588..595]` | CONFIRMED: `b 0xe1e08`; `ldrb r3,[r2,#588]` … `ldrb r2,[r2,#595]` |
| skill ids 10 HG Earplugs / 11 Earplugs / 12-13 Windproof Hi/Lo / 14 Tremor Res | CONFIRMED in `mhgu.db skills._id` (8 Halve Stun, 9 Double Stun, 10 HG Earplugs, 11 Earplugs, 12 Windproof (Hi), 13 Windproof (Lo)); id 14 also appears as `mov r1,#14; bl 0x2864c4` at `0x2f02f8`, the cited tremor gate |
| 978 static call sites | CONFIRMED exactly: `calls 0x2864c4` -> `978 direct-call hit(s)` |
| `0x2f2874` wind/roar gate | CONFIRMED function start (`push {r4,r5,r6,lr}`, vtable slot `[r0,#520]` with kind 16) |
| `0x2ee508` hit-reaction executor, gate at `0x2f02f8` | CONFIRMED: `0x2f02f8 mov r1,#14; bl 0x2864c4` inside fn `0x2ee508` |
| `0x2f22e8` dispatcher, 79-case table `0x2f2320` | CONFIRMED: `cmp r5,#78; bhi`; `add r1,pc,#4; ldr r0,[r0,r1]; add pc,r0,r1`; table starts `0x2f2320` (`0x13c,0x150,…`) |
| `0x2f58b4` add (u16 `em+0x298C`, s16 `em+0x298E`), potency `0x2f595c`, called from `0x1711DC..0x171204` | CONFIRMED: `ldrh r12,[lr,#0x298c]!`, `movw r2,#0x298e`; callers of `0x2f595c` = `0x1711f0`, `0x1725f0`; caller of `0x2f58b4` = `0x171204` |
| array `em+0x2630..0x26F4`, `em+0x26F0` = NandoData, tag getters `0x58884`/`0x58C74` | CONFIRMED: 33 `movw #0x2630` and 25 `movw #0x26f0` sites in `.text`; `0x58884` returns `0x155320d` = `"dtt"`, `0x58c74` returns `0x1553211` = `"rEnemyNandoData"` |
| dttune at `owner+0x75EC`, stored by `0x70a1c`, getter `0x71078` | CONFIRMED byte-exact: `0x70a24 movw #0x75e8; str r1,[r5,r0]` / `0x70a38 movw #0x75ec; str r4,[r5,r0]`; `0x71078 movw r1,#0x75ec; ldr r0,[r0,r1]; add r0,#100; bx lr` |
| dttune vtable `0x17330A4` "ends before +156" | CONFIRMED as stated: at `+0x98` the last own slot (`0x58c24`), at `+0x9C` (=156) the next class's block (`0x58c74`, the Nando getter) |
| EMC at `em+0x2588` (store at `0x68828`), interpreter `0x82f80`, loop `0x83770`, 256-way table `0x837ac`, length `0x50ce0`, table `0x1732c8c`, matcher `0x8e144` | CONFIRMED: `0x68828 movw r1,#0x2588; str r0,[r4,r1]` (4 sites for 0x2588); `0x83770 bl 0x50ce0; cmp r5,#255`; jump-table words at `0x837ac`; `0x1732c8c` holds the 167-byte length table and the pointer word `0x1839998 == 0x1732c8c`; both length functions (`0x50ce0`, `0x50c64`) index it through the `.bss` slot `0x1D0CF98` |
| rage/tired "pipeline `0x1069d8c -> 0x106aef0 -> 0x1068dd8 -> 0x106b04c`" | **CONTRADICTION** — this is not a call chain. `0x1069d8c` calls all three stages itself: `bl 0x106aef0` @`0x1069dd0`, `bl 0x1068dd8` @`0x106a4c4`, `bl 0x106b04c` @`0x106a4fc`. `0x106aef0` has **no** reference to `0x1068dd8` (`refs_to` finds only `0x1068784` and `0x106a4c4`) |
| "Hit consumer `0x97ddc` subtracts damage at `0x98b04`"; HP `[em+0x1428]+0x370`, max `+0x374` | CONFIRMED: `0x98ae0 ldr r1,[r10]; … ldr r3,[r1,#880]; ldr r2,[r1,#884]; sub r0,r3,r0; … str r0,[r1,#880]` @`0x98b04` |
| literal pool `0x106afdc` loads 0.1 @`0x106b044`, 0.30 @`0x106b048` | CONFIRMED: `vldr s4,[pc,#0x60]` -> `0x106b044 = 0x3dcccccd` (0.1f), `0x106b048 = 0x3e99999a` (0.3f); the same site divides `[+0x370]/[+0x374]` |
| jump table `0x2ef994` reaches `0x2efc3c` (`add pc, rN, rM`) | CONFIRMED: entry `0x2b0` at `0x2ef9a0`; base `0x2ef98c + 0x2b0 = 0x2efc3c`, which is live code (`mov r0,r9; bl 0x2a9820`) |
| op5f handler `0x84db0` reads HP by field offset | CONFIRMED in substance: `0x84dbc beq 0x858dc` -> `0x858f4 vldr s0,[r0,#0x370]`, `0x858f8 vldr s2,[r0,#0x374]` |
| `0xca10c`/`0xca118` = `ldr r1,[r0]; ldr r1,[r1,#988]; bx r1`; slot 247 of `0x179acf8` = `0x75224` | CONFIRMED: both thunks byte-identical; `0x179acf8 + 247*4 = 0x179b0d4` -> `0x00075224` |
| attackdata `HDE\0`, count@8, 0x20 B records from 0x10 | CONFIRMED on `em001_00_attackdata`: `HDE\0`, count 64, `0x10 + 64*0x20 = 0x810 = 2064 =` file size; record[0] all-zero, record[1] `58/16/25/1/0`; the 0x30 reading is off by exactly one record; 1 `FFFF/FE` separator present; record[+0x10] is a u32 flag (`0x40000000` seen) and `+0x18` the ailment value (70), as tabled |
| runtime picker `0x70ffc`: index = row − 1000 | CONFIRMED: `cmp r1,#1000; … sub r1,r1,#1000` (rows < 1000 take a second path via `+0x75d4`) |
| "no 'wind'/'Wind'/'HDE' strings in main" | **CONTRADICTION (literal wording)**: `"Wind"` occurs 128×, `"wind"` 8× (`GetWindowSize`, `NativeWindow`, `cWind`, `__aeabi_unwind_cpp_pr0`, `invalid window size`). `"HDE"` 0×, `"Windproof"`/`"Earplug"`/`"Tremor"` absent, so the *operational* advice (do not search English mechanic names) holds |
| "14% of .text" printed as `.word` before the 0508f0e fix | **NOT REPRODUCIBLE**: commit 0508f0e's own message says it recovered 157,931 of 223,669 `.word`; `.text` is 5,228,411 words (gate) => 4.28% before the fix, 1.26% now (65,738 raw words counted today) |
| "43,353 ldr/str words in .text use writeback" | **NOT REPRODUCIBLE**: with the ARM P/W rule (D1 family, `P==0 || W==1`) I count 65,740; post-indexed only 26,084; `W==1` 60,186; LDR-only 41,707. No definition tried gives 43,353 |
| hunter status `0x9D6F8`, thresholds 200/180/150 | **PARTLY WRONG**: `0x9d6f8` is a function, but the thresholds live in the *next* function `0x9d8b4` (`cmp r10,#200` @`0x9da44`, `#180` @`0x9da94`, `#150` @`0x9dab8`) |

### 2.2 `re-example-dttune-consumer.md`

| Claim | Result |
|---|---|
| type hash `0x48e8ac29` = crc32 (poly EDB88320, init FFFFFFFF, no final xor) of `rEnemyDtTune` | CONFIRMED: recomputed `0x48e8ac29` (zlib-style with final xor would be `0xb71753d6`); the hash is the arc member type for `enemy\dt_tune\em001_00_dttune` |
| "Registration fn `0x564bc` … class size 0x128, tag dtt. It names only 5 members (DefTime +0x4 … Genus +0xC)" | **CONTRADICTION** (see F1): `0x564bc` is the class destructor (frees `[this+104..]` through vtable slot +52). Class name+size are registered in fn `0x58894` (`0x5890c mov r3,#296`; `0x58914 name 0x1553200`; `0x58918 bl 0x7aedcc`), the 5 members in fn `0x58fd0` (`bl 0x7bb638` @`0x59080/590fc/59174/591f0/59268`, offsets `+4/+6/+8/+10/+12`). The *content* of the 5-member claim is right |
| loader `0x57740`; magic `DTT\0` @`0x5776c-78`; version `0x0133A06C` | CONFIRMED byte-exact (`movw r1,#0x5444` / `movt r1,#0x54`; `movw r1,#0xa06c` / `movt r1,#0x133`) |
| block table 0x98=16 (site 0x58198), 0x9C..0xB4=12 each (0x581E0, …), 0xB8=14 (0x583C8) | CONFIRMED: `0x58198 mov r1,#16` + `str r1,[r11,#152]`; `0x581e0 mov r1,#12` + `str r1,[r11,#156]`; `0x583c8 mov r1,#14` + `str r1,[r11,#184]`; presence bytes `[r11,#276]`, `#277`, …, `#285` |
| 16 + 6*12 + 12 + 14 = 114 B | CONFIRMED arithmetic and blob grid (poison 12+4 tail, six 12-B records, 12-B slot, blast 12+u16) |
| fetch `0x4bd24` via `0x4a858 -> 0x4b554`; mapping `0x50b64`; ids +128/+132; fetch `0x152960` | CONFIRMED: `ldrh r0,[r7,#4]; bl 0x50b64; ldr r1,[…]; ldr r0,[r1,r0,lsl#2]; ldr r1,[r0,#128]; ldrne r5,[r0,#132]; bl 0x152960` ×2; `0x4b9d4 ∈ fn 0x4b554`, `0x4aba4 ∈ fn 0x4a858`, `0x4a858` has one caller (`0x7079c`) |
| 137 `{emid,slot}` pairs at `0x1597ea4` (1->0, 0x201->1, 2->3) | CONFIRMED exactly: 137 sequential pairs (`slot==i`), then a different structure at `0x1597ee8`; `1->0`, `0x201->1`, `0x401->2`, `2->3`; identical to the 137-entry `monster-slot-map.json` (emid 81 -> slot 66 Astalos) |
| "takes row `0x1850ed8[slot]`" | UNVERIFIED (in `.bss`): `0x1850ed8` is inside the zero-filled `.bss` `0x184b000-0x2148000`, i.e. 0x6160 past the file image, and no code materialises that constant (`lits 0 0x13f2000 0x1850ed8` = 0 hits). Structurally plausible (runtime-built table), not checkable from the image |
| ctor `0x7051c` builds at `this+0x764C` (`0x70790`, call `0x7079c`); callback `0x70a1c` | CONFIRMED: `0x70790 movw r0,#0x764c; add r6,r4,r0; … bl 0x4a858` @`0x7079c`; `0x70a1c` stores `+0x75E8`/`+0x75EC` |
| ctor sits at slot +328 of 94 vtables | CONFIRMED count: the word `0x7051c` appears exactly 94× in the image (`.rodata` vtable arrays) |
| getter `0x71078` … 160 direct callers, no vtable ref | CONFIRMED: 160; the value `0x71078` appears 0× as a data word |
| consumer triple at `[this+0x1428]`: thr s16 `+0x5C96`, counter u16 `+0x5C98`, procs byte `+0x5D6A`; reset `0xA2754`, add `0xA27C8`, grow `0xA29D0`, `k` = f32 `+0x1C` of `0xbaaac(this,2)` | CONFIRMED: reset `strh r6,[r0,#0x5c98]`, `strb r6,[r0,#0x5d6a]`, `thr = blk[0]` of `[0x71078()+56]` (`ldr r0,[r0,#56]; ldrh r0,[r0,#0]`); add `ldrsh r8,[r1,#0x5c96]`, `ldrh r2,[r7]`, `add/st rh`; grow `bl 0xbaaac` with `r1=#2`, `vldr s0,[r0,#0x1c]`, `n=min(30,procs+1)`, `thr=min(init+trunc(k*inc*n), init+trunc(k*(max-init)))`, counter=0 |
| amount chain `0x9A3A8` (fn `0x9A34C`, `[[this+0x1428]+0x4C8]`) `<- 0x97ddc <- 0xa5900 <- 0xadb3c <- 0xad7b4` (slot +36 of vtable `0x1734798`) | CONFIRMED as *call-site-in-function*: `calls 0xa27c8` = `0x9a3a8`, `0xbfc70`, `0x10eabb4`; `0x9a3a8 ∈ 0x9a34c`, `movw r1,#0x4c8; ldrsh` immediately before; `0x98a60 ∈ 0x97ddc`, `0xa59d0 ∈ 0xa5900`, `0xade48 ∈ 0xadb3c`, `0xad988 ∈ 0xad7b4`; `0x1734798+36 = 0x17347bc -> 0xad7b4` |
| "add <- 0xBFC70 (amount 200) <- 0xbfca8 (41 callers in per-monster code 0xcf0658..0x1057fe8)" | PARTLY: `0xbfc6c mov r1,#200; bl 0xa27c8` ✓, `0xbfc70 ∈ 0xbfbe4` and `0xbfd34/0xbfd58 ∈ 0xbfca8` ✓, count 41 ✓ — but the 41 sites span `0xcf0a40..0x10581f0`; `0x10581f0` is 0x208 **past** the stated end |
| arithmetic check (poison/para/stun vs `docs/wiki/monster-status.md`) | CONFIRMED against the romfs bytes: poison @0x35c `180,600,5,3600,100,580`, sleep @0x36c, para @0x378 `180,600,5,600,110,730`, ko @0x384 `150,600,5,600,150,750`; wiki also prints 180/110/730 and 150/150/750 |
| `0x574A0..0x57990` is the copy-OUT path, "directly after the magic check" | **CONTRADICTION** (F4): `0x574a0` lies in fn `0x57068` (50 calls to the writer `0x827cd0`), which *precedes* the loader `0x57740`; `0x57740..0x57990` is loader (read) code (35 calls to `0x82710c`), and the magic check is at `0x5776c` inside the loader |
| "Raw-word search for the class name pointer (0x1553200) or 0x48e8ac29: no descriptor holds the name; the hash only occurs in arc manifests" | **HALF CONTRADICTION** (F2): the hash half holds (0 `.text` literals; 138 words `0x48e8ac29` all in `0x15dcbfc..0x1620000`), but `refs_to 0x1553200` finds a pc-delta at `0x58914`, in the descriptor registration block (`0x5890c mov r3,#296`), so a descriptor does hold the name |
| dead-end list (`0x48a9c0`, `0x71364`, `0x84cf78`, `0x84dbf4`, `0x84e440`, `0xc58f2c`, `0x3875a0`, `0x164cb8`, `0x22c6e8`, `0x6ad210`, `0x6dad30`, `0x13ac8a0`, `0x13d5f04`, `0xcb5344`, `0x12dabf4`, `0x261a98`, `0xb6671c`, `0xa63f3c`, `0xc59444`, `0xc59eec`, `0xb30cf8`, `0x198130`, `0x4a2068`, `0x4a210c`, `0x1629aac`) | CONFIRMED by spot disassembly: `0x48a9c0 ldr r0,[r0,#184]; bx lr`; `0x71364/0x84cf78/0x84dbf4/0x84e440 add r0,r0,#152; bx lr` and all four have **0 direct callers**; `0x4a2068/0x4a210c bl 0x48a9c0`; `0x13d5f04 ldr r6,[r4,#152]; ldrsb`; `0x6dad30 movw r6,#0x1bee; strh r7,[r2,r6]`; `0x1629aac` = u16 pairs containing 25/11/5 |
| `0x1553200` = class name, `0x17330A4` no +156 slots, `0x2EF000..0x2F5FFF` subsystem | strings confirmed; vtable confirmed; range not pinned to exact function bounds (loose claim) |

### 2.3 `source-verification.md`

| Claim | Result |
|---|---|
| `mhgu.db` = MHGenDatabase v2.4.0, 18 MB, 39 tables | CONFIRMED: 18,333,696 B, 39 tables |
| quests 1355, skill_trees 205, skills 326, monsters 129, locations 31, items 21153 | CONFIRMED 1:1 by `count(*)` |
| agroff `quests.json`: 832 English quest names, 100% hit; db has 411 more | CONFIRMED: bundled `docs/data/quests.json` has 944 rows / **832 unique titles**, all 832 present in `quests.name`; 1355 − 944 = 411 |
| agroff `skills.json`: 204 skill-tree names, 100% hit against 205 rows | CONFIRMED: `MHGU-private/docs/data/skills.json` 204 entries, all 204 in `skill_trees.name`; db-only tree = "Torso Up". Each entry carries `skills[].description/points` exactly as described |
| `name_ja` coverage: monsters 129/129, locations 31/31, quests 0/1355, items 0/21153, skills 0/326, skill_trees 0/205 | CONFIRMED 6/6 by SQL |
| agroff JSON "11MB" | UNVERIFIED: the bundled `quests.json` is 265,123 B; no 11 MB artefact exists locally (the size claim may refer to the upstream scrape) |
| mhxx-wiki "290 pages / 37 MB" | CONFIRMED: `data/` 285 HTML + `ida/` 5 HTML = 290 pages, `data/` = 37 MB; `text/` adds 290 txt (4.9 MB) |
| `MHGU_item(uni).txt` "not in the repo", 2930 lines | CONFIRMED absent (`find` over the repo = 0) and documented as such in `docs/data/README.md:96,99,113` |
| `docs/data/README.md` referenced | CONFIRMED exists and says the same |

### 2.4 `SUBAGENT-LEDGER.md`

| Claim | Result |
|---|---|
| `docs/analysis/members/member4-residual.md`, `save-io/social-checksum.md`, `save-io/tail-containers.md`, `save-io/write-side-desc.md`, `members/member14-17-semantics.md`, `save-io/tail-dense-3783A.md`, `members/palico-324.md`, `history/PROJECT-EVAL-20261023.md`, `data/romfs-tables.md`, `patches/item-box-v7-plugin-spec.md`, `analysis/external/chunks/` | CONFIRMED: all 11 paths exist |
| `tools/mhgu/tierb-merge.py` | CONFIRMED exists |
| "member4-17-layout.md 508 行" | **STALE**: the file now has 514 lines (it was moved into `docs/analysis/members/` after the count) |
| `HANDOFF.md:201` holds "每 30 个 append 落盘" | **WRONG LINE**: the rule is at `HANDOFF.md:230` |
| `AGENTS.md §8b`, `§8d`, `§4b` whitelist `glm5.3f`, `.omp/agents/glm-re.md` | CONFIRMED: §8b at `AGENTS.md:165`, §8d at `:171`, `glm5.3f` at `:104`, agent file present |
| commit `0808e0d` ("member#4 4B 漂移…") | CONFIRMED: `git log -1 0808e0d` exists with that message |
| "540 functions, 736,737 instructions = 14.1% of .text" | CONFIRMED arithmetic: 736,737 / 5,228,277 (gate total) = 14.09% |
| per-slice numeric claims (member[7] cap 35136→35131, member[13] 0x163e0c = 28404 B, 3444 B, 544 bit, 653,472 B, 72.62%, 0x14b0b0 11读0写 / 0x14b1c4 0读10写, m14 13×470, m17 99×104, 324 B, 108 = 84+24, 0x23F82) | NOT RE-CHECKED (out of this cluster's artefacts: they belong to the save-side docs that earlier waves audited); see UNVERIFIED |

### 2.5 `docs/reference/formats/`

| Doc:claim | Result |
|---|---|
| dttune.md: source `emNNN_00.arc` -> `enemy\dt_tune\emNNN_00_dttune`, hash `0x48e8ac29`, zlib | CONFIRMED: arc list shows `enemy\dt_tune\em001_00_dttune  0x48e8ac29  670  1594`; extracting yields a 1594-B blob starting `44 54 54 00 6c a0 33 01` |
| dttune.md: header +0x04 = `6c a0 33 01` in all 8 sampled files | CONFIRMED on em001_00; spot-check of em002_00 identical (same 1594 B size) |
| dttune.md: base HP u32 @0x38, byte-equal db `monsters.base_hp` | CONFIRMED: `0x38` = 4500 for em001, db Rathian 4500 |
| dttune.md: durability block 80 B at 0x3C, "loader 0x57740 reads exactly 80 B after the 4-byte HP" | CONFIRMED: loader `mov r2,#4` @`0x57800` + `bl 0x82710c`, then `mov r2,#80` @`0x5783c` + `bl 0x82710c` |
| dttune.md: 138 arcs, meat starts 0x8C×70 / 0x8E×49 / 0x8F×18 / 0x90×1; em001 @0x8E row 0 `90 80 70 00 0F 0F 14 23 64 64` | CONFIRMED for em001 exactly (decoder prints `_offset 142`, `90 80 70 0 15 15 20 35 100 100`); the 138-arc distribution was not recomputed (corpus partly present; `dttune-all.mjs` needs all arcs) |
| dttune.md: registered in fn `0x564bc`, "registers only the tag and class name" | **CONTRADICTION** (same as F1): `0x564bc` is the destructor; name+size are registered in `0x58894`, the 5 member names in `0x58fd0` |
| dtbase.md: magic check `movw/movt` @0x53980/84 with bne @0x5398c `1a00013e`; version `0x15022601` @0x53994/98, bne @0x539a0 `1a000139` | CONFIRMED byte-exact, including both branch offsets |
| dtbase.md: memcpy = `0x13EFE30`, reached from `0x82710c` when `pos+count > size` (`bcs @0x82712C`) | CONFIRMED: `0x82712c 2a000007 bcs 0x827150`; `0x827140 bl 0x13efe30`; `0x13efe30` is the `add r12,pc,#0x400000; …; ldr pc,[r12,#540]!` import veneer, i.e. memcpy |
| dtbase.md: `rEnemyDtBaseParts` class size 0xD8, `bl 0x7aedcc` @0x5639c with `r3=0xD8` (`e3a030d8` @0x5636c) | CONFIRMED byte-exact |
| dtbase.md: property-registration fn `0x54028`, name pool `0x15530d7` (26 names) | CONFIRMED: `0x54028` is a function start; `0x15530d7` = `"rEnemyDtBase"` |
| emc.md: `em+0x2588` (stored at 0x68828), length fn `0x50ce0`/`0x50c64`, table `0x1732c8c`, pointer `0x1839998`, 167 entries, 256-way table `0x837ac` | CONFIRMED: store at `0x68828`; table bytes at `0x1732c8c` equal `emc.mjs` `LEN_TABLE`; `0x1839998 == 0x1732c8c`; both length fns index it through `.bss 0x1D0CF98` |
| gmd.md: gmd type hash `242bb29a`; `monsterName_chS` size 12,605 in `resident_chS.arc` | CONFIRMED: arc row `chS\GUI\06_msg\monsterName_chS 0x242bb29a … 12605` |
| gmd.md: `list`/`json`/`batch` | CONFIRMED by usage + a run on MonsterDemo_eng.gmd (96 strings) |
| lmt.md: table at `0x179110c` = 22 rows × 12 B `{keyLen, getFrameFn, getValueFn}`, type 0-2 have keyLen 0 | CONFIRMED: rows 0-2 `{0, 0xafea70, 0xafea84}`, row 3 `{0x10, 0xb00160, 0xafea98}`, row 4 `{8, …}`, row 5 `{4, …}` |
| lmt.md: 39 action files in `MHGU-private` | CONFIRMED: 39 files `*.76820d81` (the LMT type hash from mod.md) |
| mod.md: type hashes MOD `58a15856`, TEX `241f5deb`, MRL `2749c8a8`, LMT `76820d81`, XFS `7cd0e77e` | CONFIRMED as the actual extensions: 225/459/225/39/8 files respectively |
| mrl.md: 490 material descriptions in "225 `*.2749c8a8`" | corpus size CONFIRMED (225 files); the 490/284/471/19 numbers not recomputed (need `mrl.mjs modnames` over the whole corpus) |
| rem.md: `mRewardTable[0]` @0x156146d, `[2]` @0x156148d, `mRewardPoint[2]` @0x156144d | CONFIRMED: strings sit exactly at those vaddrs |
| rem.md: `loc\quest\questLink\questLink_%07d` and `loc\quest\questData\questData_%07d` in "name pool 0x155c9f3+" | **WRONG ADDRESS** (F11): those two strings are at `0x1563adf` / `0x1563ab7`; `0x155c9f3` holds the *prefixed-less* `quest\questData\questData_` and the other `quest\...` paths |
| sdl.md: class names at "flat 0x1568971..0x1568b71" | CONFIRMED with the flat convention: vaddr `0x1568871..0x1568a71` contains `AreaPosBase, rAreaConnect, rAreaInfo, rStageAreaInfo, rStageInfoSet, SIPosition, SISphere, SICylinder, rVillageFirstPos` — exactly the classes named. Read as a vaddr the range starts at `"loorId"`, so the word "flat" is load-bearing |
| tex.md: `em001_00_BM` BC3 1024², 11 mips, data 1,400,320, file 1,400,384, mip offsets `0/1048576/1310720/1376256/1392640/1396736/1397760/1398272/1398784/1399296/1399808` | CONFIRMED byte-exact on `MHGU-private/romfs-extract/probe-em001/.../em001_00_BM.241f5deb` (header `TEX\0`, `0x200080A0`, mip 11, 1024×1024, fmt 0x17, data 1,400,320) |
| tex.md: 459 `*.241f5deb`, 457/459 satisfy the size/mip equations | corpus CONFIRMED (459); the 457/459 check not rerun |
| asd.md: header f32 38.0 + u32 1287; 8+1287×127 = 163457 = file size; name pool `0x1553ad9`, `ased` @0x15558bc, `rArmorSeriesData` @0x15558c1 | CONFIRMED: bytes `00001842 07050000`, f32 38, n 1287, 8+1287*127 = 163457 = file size; strings `"cArmorSeriesBase"`, `"ased"`, `"rArmorSeriesData"` at exactly those vaddrs |
| weapon-tables.md: 8 B header + n×rs over "57/57 files"; `kireajiData.kad` 164×14 B | CONFIRMED: 56 weapon containers (14 base + 14 level + 14 process + 14 create) + kad = 57; kad = `8 + 164*14 = 2304` = file size, version 1.2 |
| weapon-tables.md: NN covers 00-04, 06-14 (no 05) | CONFIRMED: exactly those 14 indices exist |
| suyu/README.md: lookup cache 4096 (`kLookupCache`), 64 is `kChainBudget` | CONFIRMED: `arm_recomp32.cpp:1158 static constexpr size_t kLookupCache = 4096`, `:105 constexpr s32 kChainBudget = 64` |
| suyu/README.md: immediates baked into generated C (`forge_pc.h:229-231`) | PARTLY: the immediate-literal fact is `a32_to_c.h:183-192` (MoveWide emits `c->r[Rd] = 0x…;`); `forge_pc.h:229-231` is only the "changing code bytes does NOT change the recompiled game" warning. Cross-ref off by one document |
| suyu/README.md: hooks only at block starts (`is_block` check) | CONFIRMED: `forge_pc.h:200-204`; `loader.cpp:585-588` logs "not the start of a recompiled block" |
| suyu/README.md: code without a recompiled block runs on the dynarmic JIT | CONFIRMED: `CHANGELOG.md:9`, `arm_recomp32.cpp:1352-1359`, `forge_pc.h:207-217` |
| suyu/internals-review.md: 25 downgrades, incl. `a32disc.h:61` thumb_targets, `mod_host_api.h:113` mem_ptr, `ModHostCallbacks` 201-222, `INSTALL.md:160-163` code patches, `a32_runtime.h:445-452`/`453-481`, `k_page_table_base.cpp:77` TODO | CONFIRMED on all six spot-checks (thumb_targets comment at `a32disc.h:61`; `mem_ptr` at `mod_host_api.h:113`; `ModHostCallbacks` typedef at `:200`; INSTALL "Not supported" at 161-163; `a32_round` tail at 440-452 and FTZ helper at 453-481) |

## 3. Defects

### F1 (P2) `re-example-dttune-consumer.md:28`, `formats/dttune.md:9` — the "registration fn 0x564bc" is the destructor; the member table lives in 0x58fd0

The worked example's step 2 says: "Registration fn `0x564bc` … class size 0x128, tag `dtt`. **It names only 5 members** (DefTime +0x4, EscapeTime +0x6, FastTime +0x8, ExTime +0xA, Genus +0xC). It does NOT name the status block." `formats/dttune.md:9` repeats the attribution and concludes "no member names are known from the registration framework".

Evidence:

```
; fn 0x564bc (the cited "registration" function)
000564bc: e92d4ff0  push {r4,...,lr}
000564c8: e59a5068  ldr r5, [r10, #104]
000564cc: e3550000  cmp r5, #0
000564d0: 0a000006  beq  0x564f0
000564e4: e5912034  ldr r2, [r1, #52]     ; vtable slot +52 = free
000564ec: e12fff32  blx r2
```
i.e. it walks `this+100/+104/+108/+112…` and frees each member: a destructor.

The two functions that actually register are

```
; class descriptor: fn 0x58894
0005890c: e3a03f4a  mov  r3, #296          ; 0x128 class size
00058914: e08f1001  add  r1, pc, r1        ; r1 = 0x1553200 "rEnemyDtTune"
00058918: eb1d592b  bl   0x7aedcc         ; register(name, size)

; member table: fn 0x58fd0 (push {r4-r11,lr} @0x58fd0)
00059080: eb1d896c  bl   0x7bb638         ; member record alloc
00059090: e08f1001  add  r1, pc, r1        ; 0x1553247 "DefTime"
000590a0: e2851004  add  r1, r5, #4
000590a4: e580100c  str  r1, [r0, #12]     ; offset +4
... 0x5911c add r1,r4,#6 ; 0x59194 add r1,r5,#8 ; 0x59210 add r1,r4,#10 ; 0x59280 add r1,r4,#12
```

So the 5-member fact is correct, the address is not: a reader following "find the registration fn (0x564bc), then look at the member names" lands in a destructor and finds no names at all. `0x564bc` also ends at the next prologue `0x57068`, which begins the serializer (see F4).

Fix: cite `0x58894` for the class name/size registration and `0x58fd0` for the five member records (offsets +4/+6/+8/+10/+12), and say that the status block is not among those five members.

### F2 (P2) `re-example-dttune-consumer.md:108` — "no descriptor holds the name" is false

> 5. Raw-word search for the class name pointer (0x1553200) or 0x48e8ac29 in code: **no descriptor holds the name**; the hash only occurs in arc manifests.

`refs_to 0x1553200` (the very tool the guide's §2 tells readers to use for code addresses) returns one hit:

```
rEnemyDtTune 0x1553200 refs: 1 pc-delta@0x58914
```

and the surrounding block at `0x58900-0x58930` is the class registration (`mov r3,#296` = the 0x128 class size, `bl 0x7aedcc` right after the name). `lits 0x0 0x13f2000 0x1553200` = 0 hits *only because* pc-delta materialisation is invisible to a literal scan — which the same guide explains at line 11.

The `.word`/hash half of the sentence is right (0 `.text` literals for `0x48e8ac29`; 138 occurrences, all in the arc manifests `0x15dcbfc..0x1620000`).

Fix: replace "no descriptor holds the name" with "the name is materialised by pc-delta at `0x58914` (descriptor registration, size 296); a raw-word/literal search misses it — use `refs_to`".

### F3 (P3) `re-guide-gu.md:8`, `re-example-dttune-consumer.md:14` — `lits` signature and the `.tmp` relative path

`disasm|words|calls|lits|fn <vaddr> [n]` is wrong for `lits`: the CLI is `lits <start> <end> <value> [value...]`. With the documented form the call does not error — it prints `0 hit(s)`, which reads as a real negative result:

```
$ node .tmp/re-cli.mjs lits 0x106af00
0 hit(s)
```

Also `node ".tmp/re-cli.mjs"` only resolves when the cwd is `G:/omp works`; from the repo:

```
$ cd MHGU && node .tmp/re-cli.mjs disasm 0x57740 4
Error: Cannot find module 'G:\omp works\MHGU\.tmp\re-cli.mjs'
```

Fix: `node "G:/omp works/.tmp/re-cli.mjs" lits <start> <end> <value…>` and spell the absolute path in the summary line.

### F4 (P3) `re-example-dttune-consumer.md:101,134` — copy-out range straddles two functions and is not "after the magic check"

`0x574A0..0x57990` is presented as "the copy-OUT path … (directly after the magic check)". In the image `0x574a0..0x576f0 ∈ fn 0x57068` (the serializer: `push` @0x57068, 50 `bl 0x827cd0` writer calls, the status-block writes at `0x574b4..0x57594`), while `0x57740..0x57990` is the *loader* (`push` @0x57740, 35 `bl 0x82710c` read calls) and the magic check is at `0x5776c` **inside the loader**. The two are adjacent functions in the same class, not one path.

Fix: "copy-out = fn `0x57068` (writer `0x827cd0`); the status-block write-out is `0x574a0..0x57594`; the loader `0x57740` follows it and does the read-in (magic check `0x5776c`)."

### F5 (P3) `re-guide-gu.md:26` — hunter-status thresholds are in 0x9d8b4, not 0x9d6f8

`hunter status 0x9D6F8, thresholds 200/180/150`: `0x9d6f8` opens with `push {r4,r5,r6,r7,r8,r9,r11,lr}` and the next prologue is `0x9d8b4`; the three compares are `0x9da44 cmp r10,#200`, `0x9da94 cmp r10,#180`, `0x9dab8 cmp r10,#150`, all inside fn `0x9d8b4`. Fix: cite `0x9d8b4` (thresholds) and keep `0x9d6f8` for the neighbouring gate, or say "the 0x9d6f8/0x9d8b4 hunter-status pair".

### F6 (P3) `re-guide-gu.md:28` — the "pipeline" is a fan-out, not a chain

`0x1069d8c -> 0x106aef0 -> 0x1068dd8 -> 0x106b04c`: only the first arrow is a call from one to the next. All three stages are called *by* `0x1069d8c` (`bl 0x106aef0` @0x1069dd0, `bl 0x1068dd8` @0x106a4c4, `bl 0x106b04c` @0x106a4fc) and `0x106aef0` never references `0x1068dd8`. Fix: "dispatcher `0x1069d8c` calls `0x106aef0`, `0x1068dd8`, `0x106b04c`".

### F7 (P3) `re-guide-gu.md:17` — "14% of .text" does not reproduce

Commit `0508f0e` (cited in the same sentence) says it "recovers 157931 of 223669 .word in main 1.4.0 .text". Against the gate's 5,228,277 instructions that is 4.28% before the fix, and today 65,738 words (1.26%) remain raw. 14% is ~3.3× too high and cannot be obtained from any denominator in the tree. Fix: quote 4.3% (223,669 words) or drop the percentage.

### F8 (P3) `re-guide-gu.md:63` — "43,353 ldr/str words … use writeback" does not reproduce

Counted over `.text` (5,228,411 words) with the ARM rule `(bits 27-26)==01 && (P==0 || W==1)`: **65,740**. Variants: post-indexed only 26,084; `W==1` 60,186; LDR-only 41,707; excluding `Rn=PC` 47,281; word-only 33,109. None is 43,353, so the number is stale or uses an unstated filter. Fix: state the filter and the number, e.g. "65,740 single-register ldr/str words use writeback (P=0 or W=1)".

### F9 (P3) `re-guide-gu.md:19` — "No 'wind'/'Wind'/'HDE' strings in main" is literally false

`"Wind"` occurs 128×, `"wind"` 8× (`nn::vi::GetNativeWindow`, `GetWindowSize`, `cWind` particle manager, `__aeabi_unwind_cpp_pr0`, `invalid window size`), `"HDE"` 0×. The advice it supports is still right (`"Windproof"`, `"Earplug"`, `"Tremor"` do not exist). Fix: "no *mechanic-name* strings (no 'Windproof'/'Earplug'/'Tremor'); plain 'wind' occurs only inside unrelated SDK words".

### F10 (P3) `re-example-dttune-consumer.md:77` — caller-range end is short by 0x208

"41 callers in per-monster code `0xcf0658..0x1057fe8`": the 41 sites are `0xcf0a40..0x10581f0`; `0x10581f0` lies past the stated end. Fix: `0xcf0a40..0x10581f0`.

### F11 (P3) `formats/rem.md:120` — the two `loc\quest\…` paths are not in the cited pool

The sentence lists seven paths and anchors them to "name pool 0x155c9f3+". At `0x155c9f3` the pool holds `quest\questData\questData_`, `quest\boss\setEmMain\`, `quest\zako\emSetList\`, `quest\rem\`, `quest\supp\`, `quest\plus\questPlus_` — but the two `loc\`-prefixed patterns live at `0x1563ab7` (`loc\quest\questData\questData_%07d`) and `0x1563adf` (`loc\quest\questLink\questLink_%07d`). Fix: cite both pools.

### F12 (P3) `SUBAGENT-LEDGER.md:36,12` — stale line reference and stale line count

`HANDOFF.md:201` -> the rule is at `HANDOFF.md:230`; "member4-17-layout.md 508 行" -> the file now has 514 lines.

## 4. UNVERIFIED

| Claim | Why not checkable |
|---|---|
| "takes row `0x1850ed8[slot]`" (`re-example:45`) | `0x1850ed8` is in `.bss` (`0x184b000-0x2148000`), outside the 25,472,632-B file image; no code materialises the constant (0 literal hits), so the table base is built at runtime |
| "60 half-precision/fixed-point words remain raw" (`re-guide-gu:9`) | would need a per-word VFP/`media` classification of the 65,738 remaining `.word`s plus the pre-v1.4.0 decoder; the historic decoder is not in the tree |
| "463k VFP words" (`re-guide-gu:9`) | approximate: I count 467,983 VFP-family words today (vldr/vstr/vadd/…/vldm/vstm), i.e. 1% off — counted, but the original filter is unstated so exact equality is not provable |
| "14% of .text" and "43,353 writeback" as *historic* figures | see F7/F8: reproducible counts differ; no artefact records how the original numbers were produced |
| `.tmp/reports-mech/*`, `.tmp/scratch-*` inputs | session scratch by design (`re-example:99` says so); the three `reports-mech` files happen to exist today, `scratch-t1`/`scratch-mech-status-gu` semantics cannot be audited |
| agroff JSON "11MB" (`source-verification:8`) | the local `quests.json` is 265,123 B; the upstream scrape is not on this machine |
| `source-verification`'s "编辑器 `MHGU_item(uni).txt` 2,930 行" | the file is (correctly) not in the repo; only the *absence* claim is verifiable |
| ledger per-slice numbers (member[13] 0x163e0c = 28404 B, 3444 B close, 544 bit, 653,472 B, 72.62%, 0x14b0b0/0x14b1c4 read/write counts, m14 13×470, m17 99×104, 0x23F82) | these are save-side claims audited by the earlier save-side wave; out of this cluster's artefact set |
| `formats/mrl.md` 490/284/471/19 and `formats/tex.md` 457/459, `formats/dttune.md` 138-arc distributions, `sdl.md` object counts | each needs a full-corpus run (`mrl.mjs modnames`, `tex` verifier, `dttune-all.mjs`, `sdl.mjs verify`) whose corpus is partly outside the machine; only the corpus sizes were confirmed |
| `formats/sdl.md` "flat 0x1568971..0x1568b71" as an *exact* range | the range content matches; its endpoints are not proven to be exact names boundaries (`0x1568871` = "AreaPosBase", `0x1568a71` = "vfp") |
| `re-guide-gu.md:49` "em010 = Plesioth (slot 9) … em024 = Kushala Daora (slot 23)" | the *slot* numbers are confirmed (10->9, 16->13, 23->21, 24->23 in the binary table); the *species* names were not cross-read in `resident_chS.arc` |
| `tools/mhgu/dtbase.mjs`, `emc.mjs`, `lmt.mjs`, `mod.mjs`, `rem.mjs`, `sdl.mjs`, `tex2dds.mjs` end-to-end | only their usage/flags were checked (no sample file of the relevant type was extracted in this pass) |

## VERDICT

doc	claim	status	evidence
re-guide-gu.md	binary is .tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin	confirmed	exists, 25,472,632 B; sha256 identical to MHGU/main.140.flat.bin
re-guide-gu.md	vaddr = flat - 0x100	confirmed	module image 0x184ad78 + 0x100 = file size
re-guide-gu.md	CLI: disasm|words|calls|lits|fn <vaddr> [n]	contradiction	lits needs <start> <end> <value>; 2-arg form silently prints 0 hit(s)
re-guide-gu.md	node .tmp/re-cli.mjs ... (relative)	contradiction	fails from MHGU cwd: Cannot find module MHGU.tmpe-cli.mjs
re-guide-gu.md	MCP v1.3.0+	confirmed	mhgu-re.mjs:201 version 1.5.0
re-guide-gu.md	MCP loads decoder once at start	confirmed	top-level await import of tools/mhgu/arm32.mjs at mhgu-re.mjs:12
re-guide-gu.md	E79F = ldr rX,[pc,rY]; resolve with words	confirmed	0x4be10=0x17ed8d4 delta resolves to .bss 0x1C39618; 0x58820=0x17e09f0 to .bss 0x1E38B7C
re-guide-gu.md	0-hit lits on a type hash is not proof of use	confirmed	0x48e8ac29: 0 .text literals, 138 words in 0x15dcbfc..0x1620000
re-guide-gu.md	offsets >0xFFF only via movw	confirmed	movw #0x5c96 x5, #0x26f0 x25, #0x2630 x33, #0x2588 x4
re-guide-gu.md	978 static call sites (skill test)	confirmed	calls 0x2864c4 -> 978
re-guide-gu.md	thunk 0x2864c4 -> 0xe0da0, word 988+4*(id>>5)	confirmed	movw 0x13c4; ldr [r0,#392]; ldr [r0,#988] after asr#5
re-guide-gu.md	0x2864e0 -> 0xe1e08, 8-entry list 588..595	confirmed	ldrb 588,589,...,595
re-guide-gu.md	skill ids 10-14 (HG Earplugs..Tremor Res)	confirmed	db skills._id 10..13 names; id 14 used as mov r1,#14 bl 0x2864c4 @0x2f02f8
re-guide-gu.md	0x2ee508 gate 0x2f02f8; dispatcher 0x2f22e8, 79-case table 0x2f2320	confirmed	cmp r5,#78 bhi; 0x13c/0x150 table at 0x2f2320
re-guide-gu.md	0x2f58b4 (u16 0x298c, s16 0x298e); 0x2f595c called 0x1711dc..0x171204	confirmed	ldrh [lr,#0x298c]!; callers 0x1711f0 / 0x171204
re-guide-gu.md	em+0x26F0 = rEnemyNandoData via tag getters 0x58884/0x58C74	confirmed	0x58884 returns 0x155320d dtt; 0x58c74 returns 0x1553211 rEnemyNandoData
re-guide-gu.md	dttune at owner+0x75EC, getter 0x71078	confirmed	0x70a38 str r4,[r5,#0x75e0+0xc]; 0x71078 movw 0x75ec; add #100
re-guide-gu.md	dttune vtable 0x17330A4 ends before +156	confirmed	+0x98 = 0x58c24 (last own), +0x9C = 0x58c74 (next class)
re-guide-gu.md	EMC at em+0x2588; interp 0x82f80; loop 0x83770; table 0x837ac; len 0x50ce0; 0x1732c8c; matcher 0x8e144	confirmed	0x68828 str after movw 0x2588; 0x83770 bl 0x50ce0; 167-byte table + ptr 0x1839998
re-guide-gu.md	rage pipeline 0x1069d8c -> 0x106aef0 -> 0x1068dd8 -> 0x106b04c	contradiction	0x1069d8c calls all three (0x1069dd0/0x106a4c4/0x106a4fc); 0x106aef0 never refs 0x1068dd8
re-guide-gu.md	HP +0x370 / max +0x374, sub at 0x98b04 in 0x97ddc	confirmed	ldr r3,[r1,#880]; ldr r2,[r1,#884]; sub; str [r1,#880]
re-guide-gu.md	vldr 0.1 @0x106b044, 0.30 @0x106b048	confirmed	0x3dcccccd / 0x3e99999a; vldr [pc,#0x60] -> 0x106b044
re-guide-gu.md	jump table 0x2ef994 -> 0x2efc3c	confirmed	entry 0x2b0 + base 0x2ef98c = 0x2efc3c (live code)
re-guide-gu.md	op5f 0x84db0 reads HP via field offset	confirmed	0x84dbc beq 0x858dc -> 0x858f4 vldr s0,[r0,#0x370]
re-guide-gu.md	thunks 0xca10c/0xca118; slot 247 of 0x179acf8 = 0x75224	confirmed	ldr r1,[r0]; ldr r1,[r1,#988]; bx r1; 0x179b0d4=0x75224
re-guide-gu.md	attackdata HDE, count@8, 0x20 B from 0x10	confirmed	0x10+64*0x20 = 2064 = file size; 0x30 is one record late
re-guide-gu.md	picker 0x70ffc index = row-1000	confirmed	cmp r1,#1000; sub r1,r1,#1000
re-guide-gu.md	monster slots em001/002/010/016/023/024 = 0/3/9/13/21/23	confirmed	binary 137-pair table and monster-slot-map.json agree
re-guide-gu.md	no wind/Wind/HDE strings	contradiction	Wind 128x, wind 8x (SDK words); HDE 0; mechanic names absent
re-guide-gu.md	14% of .text printed as .word before fix	contradiction	commit says 157,931 of 223,669 -> 4.28% of 5,228,277; 1.26% today
re-guide-gu.md	43,353 ldr/str words use writeback	contradiction	P=0 or W=1 count is 65,740; other filters 26,084/60,186/41,707/47,281/33,109
re-guide-gu.md	hunter status 0x9D6F8 thresholds 200/180/150	contradiction	thresholds at 0x9da44/0x9da94/0x9dab8, fn 0x9d8b4
re-example-dttune-consumer.md	crc32-noxor(rEnemyDtTune) = 0x48e8ac29	confirmed	recomputed; zlib variant would be 0xb71753d6
re-example-dttune-consumer.md	registration fn 0x564bc names 5 members	contradiction	0x564bc is the dtor; name+size in 0x58894, 5 members in 0x58fd0
re-example-dttune-consumer.md	loader 0x57740, DTT magic, version 0x0133A06C	confirmed	exact instruction words
re-example-dttune-consumer.md	block sizes 16/12x7/14 at 0x58198/0x581E0/0x583C8	confirmed	mov r1,#16/#12/#14 + str [r11,#152/#156/#184]
re-example-dttune-consumer.md	16+6*12+12+14 = 114 B grid match	confirmed	arithmetic and blob layout
re-example-dttune-consumer.md	fetch 0x4a858 -> 0x4b554 -> 0x4bd24; 0x50b64; +128/+132	confirmed	call sites 0x4aba4 / 0x4b9d4; ldr [r0,#128]/[r0,#132]
re-example-dttune-consumer.md	137 pairs at 0x1597ea4	confirmed	137 sequential slots then a new structure at 0x1597ee8
re-example-dttune-consumer.md	row table 0x1850ed8	unverified	inside .bss 0x184b000..0x2148000; no literal
re-example-dttune-consumer.md	ctor 0x7051c (+0x764C, 0x70790, call 0x7079c), 94 vtables	confirmed	word 0x7051c occurs exactly 94x; add r6,r4,#0x764c
re-example-dttune-consumer.md	callback 0x70a1c stores 0x75E8/0x75EC	confirmed	str r1,[r5,#0x75e8]; str r4,[r5,#0x75ec]
re-example-dttune-consumer.md	getter 0x71078, 160 callers, no vtable ref	confirmed	160 direct calls; 0 data words equal 0x71078
re-example-dttune-consumer.md	fields 0x5C96/0x5C98/0x5D6A; reset/add/grow; k at +0x1C of 0xbaaac(this,2)	confirmed	0xA2754/0xA27C8/0xA29D0 bodies match the described formulas
re-example-dttune-consumer.md	caller chain to 0x9A34C/0x97ddc/0xa5900/0xadb3c/0xad7b4 slot+36	confirmed	call sites 0x98a60/0xa59d0/0xade48/0xad988; vtable 0x17347bc=0xad7b4
re-example-dttune-consumer.md	41 callers in 0xcf0658..0x1057fe8	contradiction	41 sites span 0xcf0a40..0x10581f0 (0x10581f0 is 0x208 past the end)
re-example-dttune-consumer.md	Rathian poison 180/600/5/3600/100/580 @0x35c	confirmed	romfs bytes + wiki 180/100/580
re-example-dttune-consumer.md	copy-out 0x574A0..0x57990 after magic check	contradiction	0x574a0 in fn 0x57068 (serializer); 0x57740+ is the loader; magic at 0x5776c
re-example-dttune-consumer.md	no descriptor holds the class name	contradiction	refs_to 0x1553200 -> pc-delta@0x58914, next to mov r3,#296
re-example-dttune-consumer.md	0x2EF000..0x2F5FFF monster status subsystem	confirmed	endpoints inside code; loose bound not refuted
source-verification.md	mhgu.db 18MB / 39 tables	confirmed	18,333,696 B; 39 sqlite_master tables
source-verification.md	quests 1355 / skill_trees 205 / skills 326 / monsters 129 / locations 31 / items 21153	confirmed	count(*) each
source-verification.md	agroff 832 quest names 100% hit; 411 extra	confirmed	944 rows, 832 unique, all matched; 1355-944=411
source-verification.md	agroff 204 skill-tree names 100% hit	confirmed	204 entries, 0 misses; db-only Torso Up
source-verification.md	name_ja 0/1355, 0/21153, 0/326, 0/205; 129/129, 31/31	confirmed	SQL counts
source-verification.md	wiki mirror 290 pages / 37MB	confirmed	285 html + 5 ida = 290; data/ = 37M
source-verification.md	MHGU_item(uni).txt absent from repo	confirmed	find = 0; docs/data/README.md:99 says so
source-verification.md	agroff JSON 11MB	unverified	local quests.json is 265,123 B
SUBAGENT-LEDGER.md	10 cited docs/analysis paths exist	confirmed	all present
SUBAGENT-LEDGER.md	member4-17-layout.md 508 lines	contradiction	file has 514 lines
SUBAGENT-LEDGER.md	HANDOFF.md:201 holds the every-30 rule	contradiction	rule at HANDOFF.md:230
SUBAGENT-LEDGER.md	0808e0d commit, 540 fns / 736,737 insns = 14.1%	confirmed	git log; 736,737/5,228,277 = 14.09%
formats/dttune.md	entry hash 0x48e8ac29, 1594-B blob, header 6c a0 33 01	confirmed	arc list + bytes
formats/dttune.md	base HP @0x38, durability 80 B (@0x57800 mov r2,#4; @0x5783c mov r2,#80)	confirmed	loader words
formats/dttune.md	em001 meat @0x8E row0 90 80 70 00 0F 0F 14 23 64 64	confirmed	dttune.mjs prints _offset 142 and those values
formats/dttune.md	registered in fn 0x564bc, no member names	contradiction	0x564bc dtor; name/size 0x58894; 5 members 0x58fd0
formats/dtbase.md	magic/version checks incl. branch opcodes 1a00013e / 1a000139	confirmed	exact words at 0x53980..0x539a0
formats/dtbase.md	memcpy 0x13EFE30 reached from 0x82710c (bcs 0x82712C)	confirmed	bcs 0x827150; bl 0x13efe30 veneer
formats/dtbase.md	dtp size 0xD8, bl 0x7aedcc @0x5639c, e3a030d8 @0x5636c	confirmed	exact words
formats/dtbase.md	property-registration 0x54028; name pool 0x15530d7	confirmed	function start; string rEnemyDtBase
formats/emc.md	em+0x2588 stored at 0x68828; LEN table 0x1732c8c, ptr 0x1839998	confirmed	store word; table bytes equal emc.mjs LEN_TABLE
formats/emc.md	256-way table 0x837ac, 8 sections / 167 entries	confirmed	cmp #255 in the loop; 167-byte table
formats/gmd.md	gmd hash 242bb29a; monsterName_chS 12,605 B	confirmed	arc row for chSGUI_msgmonsterName_chS
formats/gmd.md	list --all works	confirmed	MonsterDemo_eng.gmd: 96 strings, #0 Rathian
formats/lmt.md	22x12 B table at 0x179110c, keyLen 0 for types 0-2	confirmed	rows 0-2 {0,0xafea70,0xafea84}; row 3 keyLen 0x10
formats/lmt.md	39 action files in MHGU-private	confirmed	39 *.76820d81
formats/mod.md	type hashes 58a15856/241f5deb/2749c8a8/76820d81/7cd0e77e	confirmed	225/459/225/39/8 files with those extensions
formats/mrl.md	225 *.2749c8a8 files	confirmed	find count 225
formats/mrl.md	490 descriptions, 471/490 matched, 19 unresolved	unverified	needs mrl.mjs modnames over the whole corpus
formats/rem.md	mRewardTable[0]/[2], mRewardPoint[2] at 0x156146d/0x156148d/0x156144d	confirmed	strings at those vaddrs
formats/rem.md	locquest paths in name pool 0x155c9f3+	contradiction	they are at 0x1563adf / 0x1563ab7; 0x155c9f3 holds the unprefixed form
formats/sdl.md	class registry flat 0x1568971..0x1568b71	confirmed	vaddr 0x1568871..0x1568a71 holds AreaPosBase..rVillageFirstPos
formats/tex.md	em001_00_BM: 11 mips, data 1,400,320, offsets 0/1048576/.../1399808	confirmed	header and mip table byte-exact
formats/tex.md	459 *.241f5deb, 457/459 satisfy equations	unverified	corpus 459 confirmed; 457/459 not recomputed
formats/asd.md	38.0 + 1287; 8+1287*127 = 163457; pools 0x1553ad9/0x15558bc/0x15558c1	confirmed	bytes, size equation, strings
formats/weapon-tables.md	57/57 containers; kad 164x14	confirmed	56 weapon containers + kad; 8+164*14 = 2304
formats/weapon-tables.md	NN 00-04, 06-14	confirmed	14 indices, no 05
suyu/README.md	kLookupCache 4096, kChainBudget 64	confirmed	arm_recomp32.cpp:1158 / :105
suyu/README.md	immediates baked in (forge_pc.h:229-231)	contradiction	that citation is the byte-patch warning; the fact is a32_to_c.h:183-192
suyu/README.md	hooks only at block starts	confirmed	forge_pc.h:200-204; loader.cpp:585-588
suyu/README.md	blockless code runs on the JIT	confirmed	CHANGELOG.md:9; arm_recomp32.cpp:1352-1359
suyu/internals-review.md	25 downgrades incl. a32disc.h:61, mod_host_api.h:113, INSTALL.md:160-163	confirmed	six spot-checked line pins all correct

## Difficulties

1. **The image is dataseg-limited.** Several of the most specific claims (`0x1850ed8` row table, the `0x17ed8d4`/`0x17e09f0` globals) resolve into `.bss`, which the flat file does not contain. The NSO header (`nso-extract.log`) is the only way to prove that `0x1E38B7C` is a legitimate `.bss` address rather than a decoder error: without it, the `E79F` "ldr rX,[pc,rY]" idiom looks impossible (PC + a positive 25 MB literal) at every site I tried.
2. **`fn` extends past function ends.** The promise "nearest preceding `push {...,lr}`" attributes `0x59080-0x592c0` (the member registration) to fn `0x564bc`, 0x2c00 bytes earlier, because the intervening code has no `push` of its own shape. Only a forward scan for prologues (`(w & 0xFFFF4000)>>>0 == 0xE92D4000`) found the real `0x58fd0` boundary — and the JS `&` signedness trap the guide warns about hit me once while writing that scan (first run reported "no prologues at all").
3. **`lits` fails silently on wrong arity.** The tool's `Math.min(undefined, TEXT_END)` yields `NaN`, `findLiteralLoads` returns `[]`, and the CLI prints `0 hit(s)`. That is how a documentation bug (F3) turns into a false negative in an audit.
4. **Two docs share one wrong premise.** `re-example` and `formats/dttune.md` both inherit "fn `0x564bc` is the registration fn" from `mon-class-map.md:126/195`; the doc-side cross-reference is faithful, the artefact is coarse (a "registration fn" column that points at a destructor). I did not edit either.
5. **Corpus split.** Several format docs measure over `MHGU-private/romfs-extract` (loose members present: 225 mrl, 459 tex, 39 lmt, 225 mod) and over "all 138 arcs", which needs `nativeNX/arc/enemy/*.arc` plus `dttune-all.mjs`; the docs themselves say the full corpus is not on this machine, so only per-file spot checks were possible.
