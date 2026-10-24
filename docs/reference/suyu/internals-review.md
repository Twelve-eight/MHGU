# Review: suyu-internals.md (MHGU SUYU-GURecomp internals)

Reviewer: DsvSuyuInternalsReview. Implementer: DsvSuyuInternals.
Sources: `G:/omp works/.tmp/ext/SUYU-GURecomp`, `G:/omp works/.tmp/ext/forge-pc` (local only, nothing run).

Method: each claim was re-read in the cited file; line ranges were re-pinned with grep. Legend:
- **PASS** — claim true and the cited range contains it.
- **PASS (spot)** — claim true where sampled; the cited range was not read end to end.
- **DOWNGRADE** — claim wrong, or the cited range does not contain it (correct citation given).

Reviewed revision: the report as it stands after its `## Answers` section appeared (205 lines: Confirmed claim list + Q6 + Answers Q1-Q6 + Unknown).

## Overall verdict

The substance holds up. Every high-priority statement about the JIT fallback, hook placement and code-byte writes survived checking against the sources, and the Q1/Q3 pipeline description matches the exporter code line for line. Three problems:

1. **One outright factual error, repeated twice**: the dispatcher's lookup cache is `kLookupCache = 4096` direct-mapped entries (`arm_recomp32.cpp:1158`), not "64-entry" (report: the RunThread bullet, and the Q1 answer "fronted by a 64-entry direct-mapped cache"). 64 is `kChainBudget`.
2. **One misleading mechanism statement**: "the JIT fetches code through `MemoryReadCode(vaddr)` -> suyu `Memory` (so the JIT sees written bytes)" (`arm_dynarmic_32.cpp:42-50`). `MemoryReadCode` serves from a `Dynarmic::CodePage` cache that is refilled only when the aligned page changes (`arm_dynarmic_32.cpp:45-50`) or on ISB (`arm_dynarmic_32.h:38-40`); the A32 callback has no instruction-cache-operation hook (only the A64 one does, `arm_dynarmic_64.cpp:104-105`). So a write into a page the JIT already fetched can be served stale even before any translation exists. The report's own `[INFERENCE]` covers translations but not this page cache.
3. **Citation drift**: about two dozen ranges point at a neighbouring block or at unrelated text (off by +4..+25 lines, sometimes the wrong section entirely), while the quoted fact is real. A reader following those citations lands in the wrong place. All of them are corrected below.

Verdicts: 25 DOWNGRADE (all listed below), everything else PASS or PASS (spot). All 25 but items 1-2 are citation-level, not factual.

## Downgrades (complete)

1. RunThread bullet "64-entry direct-mapped lookup cache" — DOWNGRADE (wrong): `kLookupCache = 4096` (`arm_recomp32.cpp:1157-1163`); the index hashing quoted in the bullet is right (`:1330-1334`).
2. Q1 answer "64-entry direct-mapped cache (`arm_recomp32.cpp:1330-1345`)" — DOWNGRADE (wrong), same fact, size at `:1158`.
3. Q1 answer "`A32_CHAIN` (budget 64) ... (`arm_recomp32.cpp:113`)" — DOWNGRADE (citation): `kChainBudget = 64` is `arm_recomp32.cpp:105`.
4. Claim `arm_recomp32.cpp:113-131` for `kChainBudget`/`kNoPendingSvc`/`kHaltUnhandled`/`kMaxFallbackSteps` — DOWNGRADE (citation): `:105`, `:107`, `:108`, `:110`.
5. Q2 answer "up to `kMaxFallbackSteps = 4096` ... (`:118-119, 1245-1265`)" — DOWNGRADE (citation): constant at `:110`, step loop at `:1245-1265` is right.
6. Claim `arm_dynarmic_32.cpp:42-50` "(so the JIT sees written bytes)" — DOWNGRADE (mechanism): code fetch is page-cached (`arm_dynarmic_32.cpp:45-50`), refilled on page change or ISB (`arm_dynarmic_32.h:38-40`); no A32 icache-op callback exists.
7. Claim `CHANGELOG.md:13-14` + Q2 answer "`CHANGELOG.md:13-14`" — DOWNGRADE (citation): the mod-host/JIT line is `CHANGELOG.md:9`.
8. Claim `a32disc.h:184-190` roots (entry + `extra_roots`) — DOWNGRADE (citation): `a32disc.h:147-151`, doc `117-121`; 184-190 is `walk_rel`.
9. Q1 answer `a32disc.h:184-198` for runtime-miss/coverage-seed addresses — DOWNGRADE (citation): `a32disc.h:148-151` (miss roots are passed in from `game_export.cpp:1935-1993`).
10. Claim `a32disc.h:322-331` `add_soft(pc+4)` — DOWNGRADE (citation): `a32disc.h:345-346`.
11. Claim `a32disc.h:333-364` prologue scan / `366-372` `ends_function` / `374-410` sweep — DOWNGRADE (citation): `354-384`, `355-363`, `386-415` (`round < 32` at 393, `sweep >= 2` at 401).
12. Claim `a32disc.h:72-73` and Q6 answer `a32disc.h:72` for `thumb_targets` "(not walked yet)" — DOWNGRADE (citation): `a32disc.h:61`.
13. Claim `INSTALL.md:181-186` and Q5 answer `INSTALL.md:181-186` for "code patches not supported" — DOWNGRADE (citation): `INSTALL.md:160-163`; 181-186 is the troubleshooting table.
14. Claim `INSTALL.md:157-163` for "link_kit holds suyu's own compiled code" — DOWNGRADE (citation): `INSTALL.md:79-81`.
15. Claim `tools/a32recomp/README.md:63-73` limits — DOWNGRADE (citation): `69-79`; 63-73 holds the test/compile-check bullets.
16. Claim `forge-pc/README.md:218-247` (mods on/off, `[trace]`, `[crash]`) — DOWNGRADE (citation): `153-189`; 218+ is the credits section.
17. Claim `forge-pc/README.md:79-95` differences from Switch Forge — DOWNGRADE (citation): `94-98`.
18. Q5 answer `forge-pc/README.md:92-94` — DOWNGRADE (citation): `94-98`.
19. Q2 answer `forge-pc/README.md:207-211` — DOWNGRADE (citation): `210-213`.
20. Q5 answer `forge-pc/README.md:189-195` for 0.7 JUMP — DOWNGRADE (citation): `196-206`.
21. Q4 answer `forge-pc/README.md:97-115` for the pre->override->post order — DOWNGRADE (citation): call order is at `117-124` (example `102-115`).
22. Claim `mod_host_api.h:89-93` and Q6 answer `mod_host_api.h:92` for `mem_ptr` — DOWNGRADE (citation): `mod_host_api.h:113`.
23. Claim `mod_host_api.h:217-241` `ModHostCallbacks` — DOWNGRADE (citation): struct is `201-222` (on_dispatch text `208-212`).
24. Q6 answer `k_page_table_base.cpp:70` TODO — DOWNGRADE (citation): `k_page_table_base.cpp:77`.
25. Claim `a32_runtime.h:435-443` `a32_round` — DOWNGRADE (citation): `445-452` (mode 1 = `nearbyint`, `:448-449`); the FTZ/default-NaN wrappers the report cites as `444-479` are `453-481`.

Minor range corrections folded into the PASS entries below: `arm_recomp32.cpp:993` -> `999-1000` (prev-report rename); `RegisterBases` is `959-1025` not `971-1026`; `a32_host_runtime.c` accessors run to `73`; `BUILDING.md` code map is `133-141` (the `dist/coverage` row is `138`, not `136`); LinkWithKit ends at `1763`; `loader.cpp` post-frame setup is `1502-1515`; `mod_host.cpp` `Shutdown` is `443-449`; `forge_pc.h` `call_original` is `270-271`; `a32disc.h` literal-pool marking is `223-225` (not `170-175`).

## PASS (per claim, condensed)

Q1 / lifting and blocks:
- `arm_recomp32.h:20-39` execution model — PASS. `:60-63` fallback decls — PASS.
- `tools/a32recomp/README.md:3-6` lifter + dynarmic fallback — PASS (text 4-6).
- `a32_to_c.h:4-6`, `:8-11`, `:48-52` (`Tr` 48-53), `:17` + `1813-1818` terminator rule, `:1795-1798` SVC lowering, `:1826` unhandled lowering — PASS.
- `a32_to_c.h:181-190` MOVW/MOVT (immediate is a literal in the generated C) — PASS (183-192).
- `a32disc.h:1-15`, `:196-232`, `:203-215`, `:250-260`, `:262-320`, `:170-175`/`:216-224` literal pools — PASS (marking at 223-225).
- `a32emit.h:80`, `:107-131`, `:73-84`, `:81-105` (chaining; README's "no chaining yet" is indeed stale), `:134-152`, `:156-181`, `:222-231` — PASS.
- `a32_runtime.h:22-42`, `:64-81`, `:97-100`, `:105-113`, `:117-131` — PASS. Note the report's numbers match `tools/a32recomp/a32_runtime.h`; the copy the exporter embeds is `src/core/recompiler/a32/a32_runtime_sources.h` (context 27-44, host mem 71-99, `a32_hooked` 104-107, `A32_CHAIN` 108-121, host fns 123-137).
- `arm_recomp32.cpp:1284-1391` RunThread flow (apart from item 1), `:1352-1359` no-block path, `:1227-1282` RunFallback, `:1394-1401` StepThread, `:1403-1413` cache maintenance, `:1027-1041` StepCallOnJit (`kCallJitSteps` 2'000'000 at 1032), `:1065-1136` CallGuest, `:971-1026` RegisterBases, `:308-336` report contents, `:273,854-870` report timer, `:798-815` misses — PASS.

Q3 / export:
- `game_export.cpp:2307-2331`, `:2347-2367`, `:2405-2534` (2470/2489 fallback logs), `:2593-2627`, `:2665-2684`, `:1700-1755`, `:3128-3153`, `:3300-3340` (icon at 3241-3245, launcher copy 3207-3210), `:3381`, `:3417-3420`, `:3359-3374`, `:1935-2000`, `:3860-3888`, `:1161-1175` + `:1211-1246`, `:3895-3908` — PASS.
- `make_link_kit.py:1-14`, `src/suyu_cmd/CMakeLists.txt:48-60,110-114`, `src/suyu_cmd/suyu.cpp:99-116,715-805` and `:833-851`, `coverage_seeds.py:1-11`, `a32cov.cpp:1-10`, `BUILDING.md:129-137` — PASS.
- `arm_recomp32.cpp:308-336` report fields, Q3 step 8/9 wording — PASS (with the `:993` -> `999-1000` fix).

Q4 / Forge and mod host:
- `mod_host_api.h` contract (MIT, one loader, `[Mods] loader`, `modhost_attach`, ABI rules, reserved PCs 48-50, ModHostCpu 54, ModHostModule 69, ModHostApi 89 with `is_block`/`mark` 118-119, ModHostPresent 156, ModHostInput 186) — PASS (ranges corrected).
- `mod_host.h:19-28`, `:46-58` (one bitmap test per dispatched block; `MODHOST_RETURN_PC` exempt) — PASS.
- `mod_host.cpp:160-166`, `:168-187`, `:257-283` (Stack/UserReadWrite, heap sizes 75, log 278-279), `:284-372`, `:376-411`, `:417-446`, loader never unloaded (no `FreeLibrary`/`dlclose` in the file) — PASS.
- `recomp_hooks.h:6-24` — PASS.
- `forge_pc.h:1-53`, `:22-39`, `:41-52`, `:134-159`, `:156-159`, `:199-205`, `:273-281`, `:206-217`, `:229-231`, `:188-191`, `:310-312`, `:245-251`, `:260-271` — PASS.
- `forge-pc/src/loader.cpp:575-611` (AddHook rejects non-block targets, then marks), `:1379-1512` (RETURN/JUMP/post frame, LR = `MODHOST_RETURN_PC`), `:840-866` (`.live` copy), `:1303-1306` (watcher), `:1409` (24 pre hooks), `:85` (8 overrides) — PASS.
- `forge-pc/README.md:1-8`, `:11-31`, `:33-45`, `:189-216`, `:203-207` — PASS.
- `game_settings.h:22-41`, `:353-368`, `:65-70` (default loader) — PASS.
- `a32_host_runtime.c:16-64` fast path and "direct writes notify nobody" — PASS.

Q5 / patches:
- `arm_recomp.cpp:1256-1259` self-modifying code unsupported — PASS.
- `forge_pc.h:206-217` call limits + "patched words ... should not be reloaded" — PASS.
- `INSTALL.md` code-patch statement, `pattern_find` warning, `arm_recomp32.cpp:1409-1413` — PASS (citations fixed as above).

Q6:
- `tools/a32recomp/README.md:53-58` results table (54-60) — PASS.
- `a32_to_c.h:8-11, 930, 996-998` NEON forms ("the handful of forms MHGU's modules use" at 930, "forms added for the SDK" at 996-997) — PASS.
- `RELEASE.md:122-126`, `arm_recomp.cpp:744-747` IRELATIVE, `arm_recomp.cpp:1256-1259` — PASS.
- Stale-README call-outs ("not yet run inside suyu", "no block-to-block chaining yet") — PASS: chaining exists at `a32emit.h:81-116`, and 0.10 records shipped runs (`CHANGELOG.md:3-9`).

## Focus deep-dive (the three questions the assignment flags)

**Q2 — JIT fallback / injected code.** Answer as written is right: `ArmDynarmic32` is built lazily (`arm_recomp32.cpp:1209-1225`), triggers are missing block / Thumb / unhandled instruction / debugger step (`:1300-1302`, `:1351-1382`, `:1394-1400`), cost is a ThreadContext marshal per entry plus up to 4096 single-stepped JIT instructions (`:1231-1240`, `:1249-1265`), and `long_regions` hands a still-uncovered region to `impl->fallback->RunThread` (`:1250-1254` — the report's "runs on RunThread" should say the JIT's RunThread). Injected code is JIT-executed (`CHANGELOG.md:9`, `ModHostApi.call` contract at `mod_host_api.h:122-134`, `forge_pc.h:207-217`), and a mod's `mem_write` does not flush anything (`mod_host.cpp:147-149`, `memory.cpp:986-991`). ADD to the report: even the JIT's first fetch of a page can be stale, because `MemoryReadCode` caches 64 KB per page (`arm_dynarmic_32.cpp:45-50`); the only refresh is an ISB (`arm_dynarmic_32.h:38-40`). Net: injected code on fresh pages works; rewriting a page the JIT already fetched is unreliable, and the report should not present "the JIT fetches through Memory" as a guarantee.

**Q4 — hook kinds and block-start-only.** Confirmed three ways: the exe offers exactly one callback (`on_dispatch`, `mod_host_api.h:201-222`) and Forge builds pre/post/override on it (`forge_pc.h:134-159`, `:273-281`; `loader.cpp:1381-1515`); Forge refuses non-block targets before marking (`loader.cpp:585-588`); and the mark only takes effect at block entry (`arm_recomp32.cpp:1319-1324`) or at a chained branch target (`a32_runtime.h:104-121`). "No mid-block hooking exists" is correct, and worth stating one level lower than the report does: `RecompHooks::Mark` (`recomp_hooks.cpp:29-37`) happily sets a bit for any word, but only `a32_hooked` at a static chain site and the dispatcher ever read it, so a mid-block, non-target address is a silent no-op — which is why `is_block` is the right probe. Post hooks are LR rewriting + a per-thread frame (`loader.cpp:1454-1515`), which also explains why `MODHOST_RETURN_PC` must bypass the bitmap (`mod_host.h:55-60`).

**Q5 — code-byte writes.** Answer is right and the "emulate a movw edit" ladder is sound. Verified anchors: the immediate is baked into the generated C (`a32_to_c.h:183-192`), the A32 backend invalidates only the fallback (`arm_recomp32.cpp:1409-1413`), suyu's invalidations are SVC/cache-maintenance driven (`k_page_table_base.cpp:2052-2053`, `:3296-3298`), not write-driven. Two refinements: (a) the permanent route really is a re-export — `ApplyInstalledUpdate` takes the update's ExeFS outright and deliberately ignores `.pchtxt`/IPS (`game_export.cpp:1157-1175`), so patching a directory dump's NSO before export is the workable form; (b) the JUMP-stub trick relies on the dispatcher entering the fallback for a blockless PC, which is exactly the `:1351-1359` path, so it is valid, but the stub's `b <movw+4>` lands native again only if that address is a block start (`a32emit.h` blocks are start-aligned), otherwise the JIT keeps single-stepping.

## Unknown / not re-verified

- Nothing was executed: cost statements are read from code, not measured.
- I sampled `a32_runtime.h:179-320` (helper section) rather than reading every helper.
- The report's claim that the loader DLL is "loaded once and never unloaded" is verified as "no `FreeLibrary`/`dlclose` in `mod_host.cpp`", not by watching a process.