# SUYU-GURecomp audit — suyu-gs-part1 / suyu-addr-check / chunks/spk-format

Audit of the three reports against their inputs in `G:/omp works/.tmp/mhgu/suyu/`
(`dis-gs-1.txt`, `dis-gs-2.txt`, `dis-gs.txt`, `dis-nvntrace.txt`, `dis-other.txt`,
`dis-nvnrec.txt`, `dis-armrecomp.txt`, `sdk-helpers.txt`, `ex-*.txt`, `chunks/c*.txt`) and
the SUYU source line each row cites. SUYU `main+X` == our `vaddr` (anchored at 0xBBCD34 →
`mov r0,#1920`/`movw r7,#0x438`); SUYU `kHelpers` sdk_offset == our `sdk.flat.bin` offset
(nvn_trace.cpp:296-324 `addr = sdk + kHelpers[k].sdk_offset`).

**Round-2 correction applied:** the previous audit's CONTRADICTED verdicts for the three
`kHelpers` offsets were computed against the *main* image and are wrong. They are nnSdk-
relative. Re-checked against `exefs-0eb5/sdk.flat.bin` (`sdk-helpers.txt`): all three are
genuine SDK function entries → **VERIFIED**. See rows below.

Audit date: 2026-10-23.

## Report completeness at audit time

| report | state | overall |
|---|---|---|
| `suyu-gs-part1.md` | populated (camera/filter/render clusters); Pia/Unknown placeholder | **PASS** (see caveat) |
| `suyu-addr-check.md` | 50 rows merged from c01..c17, all populated with evidence | **PASS** |
| `chunks/spk-format.md` | full format-fact prose, all PLAUSIBLE, sourced | **PASS** |

---

## suyu-gs-part1.md — verdicts

All 12 rows audited previously stand (camera projection/look-at helpers 0x1C358/0x1C3A8/0x1C33C/0x1C380, filter ctors ×5, render 0xBBCD34/0xBBCF90/0xBBBDE0). Two PLAUSIBLE downgrades (0x18A48 caller relation, 0x8B8148 mid-function) are correctly honest. One retained caveat: the +0x30/+0x34/+0x38/+0x3C field-offset assignments on the projection rows are asserted from SUYU's own comment (the dump prints the VFP ops as raw `coproc` words), so the per-field detail is consistent-but-not-independently-decoded. Verdict: **PASS**.

---

## suyu-addr-check.md — per-row verdicts

Status legend for verdict: PASS = evidence + status + cite all check out; DOWNGRADE = honest but status should be lower; FAIL = evidence/cite/contradiction wrong.

### Pia settings handler / value guard (game_settings.cpp:1205-1208)

| vaddr | report status | verdict | reason |
|---|---|---|---|
| 0x13AA698 | PLAUSIBLE | PASS | disasm `ldr r0,[r4,#1488]` then epilogue — correctly read as accessor tail, mid-function. |
| 0x13AA69C | PLAUSIBLE | PASS | `pop {r4-r7,r11,pc}` epilogue; report correctly notes it's 2 insns of one source line, next word is data. |
| 0x13EDD58 | VERIFIED | PASS | real entry `push` + `sub sp,#1472`; handler checks msg word [r1+4]==0x32AB9864, byte option at [r1+8]∈{1,2}. The `0xE6EF1071` decode note (uxtb r1,r1, not invalid strb) is correct and shows careful audit. |
| 0x13EDDE8 | PLAUSIBLE | PASS | `str r0,[r4]` + `add sp,#1472` + pop — shared epilogue matching the 1472 frame; correctly interior. |
| 0x139DDA0 | PLAUSIBLE | PASS | `cmp r0,#11`/`bhi` guard, stores to settings+0x5D0; correctly mid-function. |
| 0x139DDA8 | VERIFIED | PASS | `strb r11,[r6,#1528]` + `b 0x139df58`; identical copy at 0x139DDD8 — two compiled copies of one statement, confirmed. |
| 0x139DDC0 | VERIFIED | PASS | `ldr r0,[sp,#12]`/`cmp r0,#0`/`beq 0x139dd8c` — interior test block. |
| 0x139DDD8 | VERIFIED | PASS | `strb r11,[r6,#1528]`/`b 0x139df58` — branch target of the bne. |
| 0x139DDE0 | VERIFIED | PASS | `cmp r0,#12`/`str r0,[r6,#1488]`/`bl 0x13a0718` — case-12 block; line boundary 1205→1206 noted correctly. |
| 0x139DE20 | PLAUSIBLE | PASS | `ldr r0,[r10,#544]`/`beq 0x139deac`; `ldr r2,[r2,#56]`/`blx r2` guarded vcall — interior, semantics plausible. |
| 0x139DE4C | PLAUSIBLE | PASS | `cmp r11,#0` + orr/and combine + `tst r0,#1` — post-call continuation. |
| 0x139DF40 | PLAUSIBLE | PASS | `add r5,#1`/`movge r5,r11`; back edge `bne 0x139dd58` — two-bound index walk, correct reading. |
| 0x139DEB8 | PLAUSIBLE | PASS | `strb r9,[r6,#1528]` … `bl 0x13a0718` — interior basic block. |
| 0x139E6E8 | PLAUSIBLE | PASS | `ldr r2,[r4,#624]`/`mov r0,r6`/`bl 0x13a0718` — pre-call setup, no prologue. |
| 0x139E6F4 | PLAUSIBLE | PASS | post-call continuation; `and r1,r1,r8`/`cmps`/`bl 0x13a88c4`. |
| 0x139e71c | PLAUSIBLE | PASS | `ldr r0,[r11]`/`bl 0x13a88c4`/`add r0,sp,#20` — interior dispatch, no prologue. |
| 0x139e730 | PLAUSIBLE | PASS | `mov r7,r0`/`beq 0x139e79c` — return-value handoff, mid-function. |
| 0x139e76c | PLAUSIBLE | PASS | `ldr r0,[sp,#20]`/`blx r1` — result check, interior. |
| 0x139E79C | VERIFIED | PASS | `ldr r0,[r10]`/`blx r1`/`b 0x139e7d0` — basic block, no prologue; window correctly bounded. |
| 0x139E7B8 | PLAUSIBLE | PASS | `ldr r0,[sp,#4]`/`bl 0x1398d10`/`bne 0x139e800` — separate case block, entry unproven, honest. |
| 0x139E7C8 | VERIFIED | PASS | `cmp r0,#0`/`ldrb r0,[r4,#552]`/`tst r0,#4`/`bne 0x139e664` — fallthrough after call, correct. |
| 0x139E7D0 | PLAUSIBLE | PASS | `ldrb r0,[r4,#552]`/`bne 0x139e800` — bit-2 gate, interior. |
| 0x139E7DC | PLAUSIBLE | PASS | `ldr r0,[sp,#8]`/`mov r1,r8,lsr#16`/`bl 0x13a05a0` — bit-clear lookup path. |
| 0x139E7EC | VERIFIED | PASS | `blx r2`/`pop {r4-r11,pc}` — decision block + epilogue; correctly identifies 0x139E824 onward as data (`0x004A2A44`). |
| 0x139e800 | VERIFIED | PASS | `ldr r2,[r0,#60]`/`blx r2` — vtable slot+60 dispatch, mid-function (callee-saved regs live). |
| 0x139e814 | VERIFIED | PASS | `cmp r0,#1`/`add sp,#132`/`pop {r4-r11,pc}` — exit block; literal pool 0x004a2a44..0x004a9f04 after, 2-insn stub at 0x139e838. Correct. |

### Render / viewport (game_settings.cpp:1218-1380)

| vaddr | report status | verdict | reason |
|---|---|---|---|
| 0x8bcd84 | VERIFIED | PASS | `push {r4-r11,lr}` + fp + `sub sp,#4` + VFP `ed2d8b10` (vpush d8-d15) + `sub sp,#552` — textbook prologue, motion-blur render entry. |
| 0xbc1204 | VERIFIED | PASS (main-session correction) | Original CONTRADICTED was a category error: SUYU never claims an entry; game_settings.h:338 says "after its first call" and 0xbc1200 is `blx r7`. Mark() accepts interior pcs (recomp_hooks.cpp:29-38). |
| 0xbc12d0 | PLAUSIBLE | PASS | `add r0,r10,#56`/`addne r0,r10,#72` + `ldm` + min/max clamp against bounds — interior rect-clamp on r10 state; viewport semantics from SUYU, not provable. Honest. |
| 0xbc13bc | PLAUSIBLE | PASS | `str r10,[r9,#8]` + `add sp,#148`/`pop {r4-r11,pc}` — epilogue matching 148-frame; interior of same routine, correct. |

### Pia receive path (game_settings.cpp:1493-1595, game_settings.h:341)

| vaddr | report status | verdict | reason |
|---|---|---|---|
| 0x131c3e0 | VERIFIED | PASS | `push {r4-r10,lr}`/`sub sp,#184` — real entry, PIAPROBE reader. |
| 0x139dce4 | VERIFIED | PASS | `push {r4-r11,lr}`/`sub sp,#28` + `mov r10,r0`/`ldr r0,[r10,#8]`/`bl 0x139edec` — receive-loop entry. |
| 0x139e5f8 | VERIFIED | PASS | `push {r4-r11,lr}`/`sub sp,#132` + `mov r4,r0`/`ldr r0,[r4]`/`ldr r1,[r0,#44]`/`blx r1` — iterator entry + availability probe. |
| 0x13b3054 | VERIFIED | PASS | `push {r4,lr}`/`movw r12,#0xffff`/`cmp r1,#0` — real entry; seq/window 16-bit check matches SUYU wording. |
| 0x13a6d94 | VERIFIED | PASS | `push {r4-r9,r11,lr}` (8 regs) + arg shuffle + `cmp r6,#0`/`cmpne r7,#0` guard — entry; [0x2145a60]/[sp+0x14] SUYU detail correctly noted as out-of-window. |
| 0x130cb64 | VERIFIED (as mid-fn predicate) | PASS | `ldr r1,[r0]`/`cmp`/`moveq r0,#0`/`bxeq lr`/`ldrh r0,[r0,#4]` — two-stage validity check, no push → correctly interior predicate, report does not over-claim as entry. |
| 0x131f400 | PLAUSIBLE | PASS | `ldr r1,[r0,#20]`/`blx r1` — mid-function dispatch; inclusive range-end consistent. |

### SKIP / constant-literal rows

| vaddr | report status | verdict | reason |
|---|---|---|---|
| 0x2160 | SKIP | PASS | 0x2160 = render-height "2160" literal in ini doc text, not an addr; our bytes there are unrelated pointer words. Correct SKIP. |
| 0xe7ff0 | SKIP | PASS | SUYU comment is an illustrative unmapped-crash address, not a claim; our image has code there but that's context. Correct SKIP. |
| 0x100000 | SKIP | PASS | `kScanLimit` bound, not an address; bytes are a tail-call stub + data. Correct SKIP. |
| 0x2000 | PLAUSIBLE | PASS | "mod+0x2000 rtld" note; our code builds a `add r5,pc,r0` base + stamps 1,2,3,4,8,9 into a 9-word table = relocation-type dispatch table shape. Consistent PLAUSIBLE. |
| 0x4000 | SKIP | PASS | `off<0x4000` loop bound, not addr; bytes are fn interior + data word. Correct SKIP. |
| 0x1000 | SKIP | PASS | distance guard `p within 0x1000 of dyn_va`, not addr; bytes are a loop head. Correct SKIP. |
| 0x3c00 | SKIP | PASS | `w=0x3c00..0x3d80 step 0x40` scan constant, not addr; bytes are routine tail + literal pool. Correct SKIP. |
| 0x3d80 | SKIP | PASS | exclusive upper bound of same walk; bytes are an object initializer mid-function. Correct SKIP. |
| 0x1f00 | SKIP | PASS | FPCR mask `0x1f00`, not addr; real prologue is at 0x1f08. Correct SKIP. |
| 0x10000 | SKIP | PASS | `r[1+a]>=0x10000` sanity bound in a 96-byte range check, not a code ref. Correct SKIP. |

### nnSdk helpers (nvn_trace.cpp:102-104, sdk-flat.bin)

| vaddr | report status | verdict | reason |
|---|---|---|---|
| sdk+0x3f40e0 | VERIFIED | **PASS** (corrected) | sdk-helpers.txt: prev fn ends `mov r1,#0`/`bx lr` @0x3f40dc, then a leaf `vmov`-ing int→VFP, building bias const 0x4330000000000000 (movw#0/movt#0x4330), VFP double add/sub over literal 0x41f00000 (2^32), `bx lr` @0x3f410c = int64→double. Real SDK entry. Prior main-relative CONTRADICTED was a coordinate error — fixed. |
| sdk+0x3f3e1c | VERIFIED | **PASS** (corrected) | sdk: prev ends `bx lr` @0x3f3e18; entry `vmov d16,r0,r1` + `vcmpe.f64` vs 0.0, `bpl`→tail-call 0x455274, else `push{r11,lr}`+negate+`rsb`/`rsc` → double→int64. `bpl`-guarded push explains missing prologue. Real SDK entry. |
| sdk+0x3f91dc | VERIFIED | **PASS** (corrected) | sdk: `b 0x4501a4` in a run of alias stubs (siblings →0x450ba0/0x450138, one rotates r1/r2/r3, one forces r1=0). A distinct callable entry aliasing a libc routine (memcpy family). Real SDK entry. |

### Honesty / licensing / coordinate checks (addr-check)

- **No verbatim GPL**: PASS — only mnemonics/offsets/identifiers quoted.
- **Citations resolve**: PASS — `game_settings.cpp:1205-1218/1332/1380/1493/1494/1542/1595/1701`, `game_settings.h:341`, `arm_recomp.cpp:160/590/608/611`, `arm_recomp32.cpp:116`, `nvn_rec.cpp:226`, `game_settings_ini.cpp:69`, `nvn_trace.cpp:102-104` all match `## <file>:<line> 0x<addr>` block headers in the dumps.
- **Coordinate correctness**: PASS — main-relative rows use main vaddrs; the three kHelpers rows are correctly prefixed `sdk+` and verified against the sdk image (not main). The single biggest prior error is fixed.
- **Status honesty**: PASS — CONTRADICTED count is now 0 (0xbc1204 reclassified VERIFIED by main session, see row); SKIP used for every literal/illustrative number (0x2160, 0xe7ff0, 0x100000, 0x4000, 0x1000, 0x3c00, 0x3d80, 0x1f00, 0x10000) — exactly right; PLAUSIBLE used where semantics come from SUYU and only structure is provable. No over-claiming observed.

---

## chunks/spk-format.md — verdicts

All claims are file-format facts (bytes on disk), correctly marked PLAUSIBLE — none can be checked against our 1.4.0 disassembly. Verified against `mtf_shaders.py` lines 17-29,55-79 and `pipeline_manifest.py`:

| claim | verdict | reason |
|---|---|---|
| RomFS 0x50 header + dir/file meta tables + data at data_off | PASS | matches mtf_shaders.py:17 and standard RomFS. |
| `.arc` = `"ARC\0"` + u16 ver 0x11 + u16 count + u32 pad + count×80B entries | PASS | source lines 18,56,58 confirm `b"ARC\0"`, `<H` count @6, 80-byte entries. |
| Entry = name[64];type_hash;comp_size;size\|flags;offset, zlib | PASS | source lines 19-20,99 (`zlib.decompress`). |
| SPK program = 0x50-byte SPH header + code | PASS | source line 21. |
| Marker word 0x12345678 at program−0x30 | PASS | source lines 22,28-29,68-69 (`MARKER` pack, `p=m.start()+0x30`). |
| Program ends with EXIT 0xE30000000007000F | PASS | source lines 23,28 (`EXIT = pack 0xE30000000007000F`). |
| `nativeNX/sa/NX/root.arc` → entry `sc\NX\root` | PASS | source lines 11-12. |
| RomFS file/dir record layouts (+0x14 name len / +0x18; +0x20 name) | PASS | consistent with struct.unpack usage lines 34-51. |
| Manifest `"SPMF"`/binding to SPK len+CRC32 | PASS | consistent with pipeline_manifest.py:135-155. |

Licensing: PASS — prose is own-words, no source lines reproduced. Status honesty: PASS — every claim is PLAUSIBLE with an explicit statement that file-format facts can't upgrade without a live RomFS. The chunk's own caveat (manifest magic/version values live above pipeline_manifest.py:60) is correctly flagged as a gap.

---

## Summary

- `suyu-gs-part1.md` — **PASS** (12 rows; 1 retained caveat on VFP field-offset detail).
- `suyu-addr-check.md` — **PASS** (50 rows audited; every VERIFIED/CONTRADICTED row checked against disasm, all PASS; 5 PLAUSIBLE + 5 SKIP rows spot-checked, all PASS; the three kHelpers rows now correctly VERIFIED against sdk.flat.bin).
- `chunks/spk-format.md` — **PASS** (all file-format claims PLAUSIBLE, sourced, no verbatim code).

**Correction recorded:** my earlier CONTRADICTED verdicts on `helper_int64_to_double`/`helper_double_to_int64`/`helper_memcpy` were computed against the wrong image (main instead of nnSdk). Against `sdk.flat.bin` they are genuine function entries → **VERIFIED**. The audit above reflects the corrected coordinate.

No fabricated output, no scope drift, no GPL verbatim found in any report. All three reports are internally consistent, honestly graded, and grounded in the provided dumps.
