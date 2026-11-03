# W4-FIELDS — do the cited functions read the cited offsets, at the cited width?

Fourth linkage-review wave. Target: `docs/analysis/fields/` (3 files, 2,066 lines).
Method: every row that names a *function/instruction site* and an *offset* (and, where stated, a width)
was checked against the committed image with `mcp__mhgu_re_disasm` / `mcp__mhgu_re_read_words` /
`mcp__mhgu_re_function_start`, plus a raw `movw`/`movt` word scan of `main.140.flat.bin`
(the MCP `literal_loads` device silently drops some conditional `movw` sites — see §0.3).
Byte-level rows were checked against `save-snapshots/`; table-level rows against
`docs/save-layout/member4-file-layout.txt` and `docs/save-layout/member4-diff.txt`.

Version pin: `fam-288.md` 2026-10-23 22:12, `fam-small.md` 2026-11-03 11:11,
`records-128.md` **2026-11-04 07:07** — that last file was modified *during* this review
(`git status`: `M docs/analysis/fields/records-128.md`, +27/−27 lines in §1.1/§2.2/§2.3).
This report reviews the current worktree text and says so where the older wording still survives
elsewhere in the same file.

---

## 0. Method notes (read before the tables)

### 0.1 Coordinates
`vaddr` = NSO virtual address; `flat` = `vaddr + 0x100` (image `main.140.flat.bin`).
Member#4 obj single instance = `*(0x145159C)`. Saves:
clean = `save-snapshots/20261022-clean-reference/system_CLEAN` (slot1 hunter A, base `0x2AC560`);
dirty = `save-snapshots/20261022-v6-ready/system` (slot0 hunter B, base `0x18CC9C`).
Authoritative obj↔file map (`docs/save-layout/member4-file-layout.txt`):
`0x03907 obj+0x16c8 sz=288`, `0x04447 obj+0x27a8 sz=68`, `0x045df obj+0x2a78 sz=128`.

### 0.2 Width proof
A "read at width W" is only accepted if the instruction is one of `ldr` (4 B), `ldrh` (2 B),
`ldrb`/`ldrsb` (1 B), `vldr s0` (4 B), or a `bl` into `memcpy`-shaped helper whose argument order was read.
For `bl 0x3df378` / `bl 0x3df2a8` the argument order was read directly:

```
003df3ac: e1a02004  mov r2, r4        ; 0x3df378: memcpy(dest=r0=cursor in stream, src=r1=caller buf, len) => WRITE
003df2dc: e1a00001  mov r0, r1
003df2e0: e1a01002  mov r1, r2
003df2e4: e1a02004  mov r2, r4        ; 0x3df2a8: memcpy(dest=r1=caller buf, src=r2=cursor, len)          => READ
```

This confirms fam-288.md §2.3's orientation claim ("A group = writer, B group = reader", stated as [I] there)
and is the basis for every "288 B write/read" row below.

### 0.3 Why a raw `movw` scan was needed
`mcp__mhgu_re_literal_loads` returns fewer sites than the raw word scan for the same immediate, e.g.
`0x1b48`: MCP 10 vs raw 12 (`0x4d4bd4`, `0xbee0d4` missing), `0x31f8`: MCP 12 vs raw 14
(`0x94c7d0`, `0xc6c160` missing). The docs quote the *raw* index (`movw-index.json`), so all counts below
come from this scan:

```js
// node scan: MOVW = opcode bits27-20 0x30, MOVT 0x34, imm16 = (w>>16)&0xF << 12 | (w & 0xFFF)
for (let i = 0, n = buf.length >> 2; i < n; i++) {
  const w = dv.getUint32(i * 4, true);
  if (((w >>> 20) & 0xFF) === 0x30) { /* site vaddr = i*4 - 0x100 */ }
}
```

With it, the docs' count claims reproduce: `0x27a8` 8 sites, `0x17e8` 4, `0x3684` 2, `0x1b48` 12,
`0x1ea8/0x2208/0x2568` 0, `0x31f8` 14, `0x2a78` 12, `0x2b78` 26, `0xb18` 23, `0xa74` 12.

---

## 1. `fam-288.md` — row-by-row

Legend: **C** confirmed, **X** contradiction, **S** stale, **U** unverified.

| # | row (file:line) | claim | instruction actually at the cited site | width | st |
|---|---|---|---|---|---|
| 1 | 46-59 (§2.1) | 15 slots × 0x120, persisted {0,2,3,5,6,8,9,11,12,14} | writer sequence `0x51D69C..0x51D750` = `0x16C8,0x1908,0x1A28,0x1C68,0x1D88,0x1FC8,0x20E8,0x2328,0x2448,0x2688`; `(x-0x16C8)/0x120` = {0,2,3,5,6,8,9,11,12,14} | 288 B/slot | C |
| 2 | 72 | `0x520B40` → `0x16C8` | `00520b40 movw r3,#0x16c8` / `00520b44 ldr r3,[r2,r3]!` | 4 B | C |
| 3 | 73 | `0x520B6C` → `0x17E8` | `00520b6c movw r2,#0x17e8` / `00520b70 ldr r2,[r1,r2]!` | 4 B | C |
| 4 | 74 | `0x520B8C` → `0x1908` | `00520b8c movw r1,#0x1908` / `00520b90 ldr r1,[r0,r1]!` | 4 B | C |
| 5 | 75 | `0x520C9C` → `0x27A8` | `00520c9c: e3a06032  mov r6, #50` — not a `0x27A8` site (that is `0x520C7C`) | — | **X** |
| 6 | 76 | `0x521094` → `0x26A8` (slot 9 +0x20) | `00521094 movw r3,#0x26a8` / `00521098 ldr r2,[r2,r3]`; `0x2688+0x20 = 0x26A8` ✔ | 4 B | C |
| 7 | 77 | `0x5249A0`/`0x524A18` → `0x16C8` | `005249a0 movw r3,#0x16c8`+`ldr r3,[r0,r3]!`; `00524a18 movw r1,#0x16c8`+`ldr r0,[r0,r1]` | 4 B | C |
| 8 | 78 | `0x5249C0` → `0x17E8` | `005249c0 movw lr,#0x17e8` / `005249c8 ldr r2,[r4,lr]!` | 4 B | C |
| 9 | 79 | `0x5249D4` → `0x1908` | `005249d4 movw r2,#0x1908` / `005249d8 ldr r2,[r1,r2]!` | 4 B | C |
| 10 | 79 | `0x524A6C` → `0x1908` | `00524a6c: e12fff1e  bx lr`; the real second site is `0x524A5C` (`movw r1,#0x1908`) | — | **X** |
| 11 | 88-92 | 10 × 288 B writer, stride 0x14, `bl 0x3df378` | 10 calls at `0x51D69C..0x51D750`, each `mov r2,#288` (`e3a02e12`) then `add r1,r5,r0`/`bl` | 288 B | C |
| 12 | 93 | mirror 10 × 288 B at `+0xB18`, `bl 0x3df2a8` | `0x51E1B4..0x51E268`, same 10 imms, `r2=#288`, `bl 0x3df2a8` | 288 B | C |
| 13 | 95-110 | quoted instruction text `0x51D73C..0x51D768` | byte-identical to image incl. `e3a02e12` = `mov r2,#288`, `e3a02044` = `mov r2,#68` | — | C |
| 14 | 33/84 | A group = writer, B group = reader | see §0.2 (memcpy arg order) — the doc's "[I]" is now a proof | — | C |
| 15 | 112-128 (§2.4) | 9 in-slot offsets (`0x1D0C/0x1D3C/0x1D6C`, `0x1D9C/0x1DCC/0x1DFC`, `0x1E2C/0x1E5C/0x1E8C`) with regs r6/r1/r2 | all 9 `movw` sites exist (`0x520C34/4C/44`, `0x520D5C/74/6C`, `0x520E84/9C/94`); each is followed by a 4 B `ldr`/`str`, e.g. `00520d78 ldr r2,[r7,r2]`, `00520d7c ldr r1,[r7,r1]`, `00520d80 ldr r7,[r7,r6]` | 4 B | C |
| 16 | 255-282 (§7.1) | `mov lsr #5` / `#864` / `mla` / mask / `add word*4` / RMW | `0x520B24 mov r3,r6,lsr #5`; `0x520B2C mov r0,#864`; `0x520B34 mla r2,r9,r0,r7`; `0x520B38 mov r5,r11,lsl r5` with `r11=1` (`0x520A2C`); `0x520B3C add r2,r2,r3,lsl #2`; ldr/bic/orr/str | 4 B | C |
| 17 | 288 | "same bit, same mask **and same condition**" | mask is shared (`r5`) ✔, but the polarity is **per-slot**: A from `tsts r10,r11,lsl r1` (`0x520B18`), M from `cmp r8,#0` (`0x520B50`), B from `cmp r3,#0` (`0x520B7C`) | — | **X** (doc self-corrects at line 401) |
| 18 | 279-283 | inner 4 / outer 1536 / groups 5 | `0x520B9C cmp r4,#4`, `0x520BB0 cmp r0,#1536`, `0x520BBC cmp r9,#5` | — | C |
| 19 | 303-318 (§7.2) | 68B slots `0x27A8/0x27EC/0x2830` RMW, `cmp #384` | `0x520C7C/0x520CA4/0x520CCC` + `0x520CE4 cmp r4,#384`; `0x520DA4/DCC/DF4` and `0x520EF4` for g1/g2 | 4 B | C |
| 20 | 309-311 | `0x520ECC mov r6,#10560` = 0x2940 | `00520ecc: e3a06da5  mov r6, #10560` (= 0x2940), then `ldr r6,[r7,r6]!` | 4 B | C |
| 21 | 320-345 (§7.3) | 5 bit helpers: 864+0x1908, 0x2A0C, 0x2A54, 204+0x27A8, 0x2830 | `0x524A84` (`mov r0,#864; mla r0,r1,r0,r3; … movw r1,#0x1908; ldr r0,[r0,r1]`), `0x524AC0` (0x2A0C), `0x524AE8` (0x2A54), `0x524B04..18` (`mov r3,#204; mla; 0x27A8`), `0x524B34..44` (204 + 0x2830) | 4 B | C |
| 22 | 348-361 (§7.4) | `0x6AE4F4` is a `movw+movt` absolute-address false positive | `006ae4f4 movw r0,#0x17e8` + `006ae4fc movt r0,#0x8` → 0x817E8; `add r1,r5,r0`; `bl 0x13efdd0` (memcpy) | — | C |
| 23 | 364-366 | window `0x520B00..0x520BFF` immediates = {0x11CC,0x16C8,0x17E8,0x1908,0xFFFF} | raw scan of the window returns exactly `0x520b04 0x11cc`, `0x520b40 0x16c8`, `0x520b6c 0x17e8`, `0x520b8c 0x1908`, `0x520bf4 0xffff` | — | C |
| 24 | 460-470 (§8.2) | `type=44+r9`, `count=3`, `bl 0x6aa9b8`, 0xFFFF sentinel | `00520a44 add r0,r9,#44`; `00520a74 mov r0,#3`; `00520a9c bl 0x6aa9b8`; `00520a60 movw r4,#0xffff` | — | C |
| 25 | 461-490 | `bit = id*4 + j`, `j=0..3` | `lsl #2`, `and r2,#0x1c`, `add r4,r4,#1; cmp r4,#4` | — | C |
| 26 | 481-486 | read side: `[sp,#36] + r9*576`, arrays `+0x11CC/+0x128C/+0x134C` | `0x520ad8 add r0,r9,r9,lsl #3` (=9), `0x520ae4 add r0,r1,r0,lsl #6` (=×64 ⇒ 576); `ldr r10,[r5,#0x11CC]`, `ldr r6,[r5,#0x128C]`, `ldr r12,[r5,#0x134C]` | 4 B | C |
| 27 | 484-486 | read base ≠ write base, "not proven = obj" | `0x51EBF4 str r5,[sp,#36]` (r5 = arg1) and `0x51EC0C str r4,[sp,#40]` (r4 = arg0) ⇒ reads use **arg1**, writes use **arg0** | — | C (now proven) |
| 28 | 492-501 (§8.3) | addends resolve to one global slot `0x1839388` | `0x520bc4 ldr r0,[pc,#1944]` (=0x13187a4) + `0x520bdc ldr r10,[pc,r0]` → 0x520BE4+0x13187A4 = 0x1839388; `0x520d08`(0x1048517)+`0x520d0c` → 0x156922B ≠; see §4.6 | — | C |
| 29 | 558-600 (§9.1) | 21-name chain, each length+1 = next address | NUL-walk from flat 0x156932B reproduces all 21 rows exactly; the 22nd string is `cTrialArtsXML` @0x156930e | — | C |
| 30 | 604-620 (§9.3) | 18 × 48 = 864 = `mla` stride; 5 × 864 = 0x10E0 | `mov r0,#864`; `0x27A8-0x16C8 = 0x10E0` | — | C |
| 31 | 622-640 (§9.4) | shard ① = mGuild+mOld, ② = mAirhike+mBushi, ③ = mKizuna+mTatsujin | no instruction ties a member name to a shard; only the string order supports it | — | U |
| 32 | 147 (§2.6) | per-slot diff `8/1/42/63/98/162/140/169/153/153` | real offsets give `191/111/198/126/183/120/191/85/199/105` (= `member4-diff.txt` rows 74-83) | — | **S** |

---

## 2. `fam-small.md` — row-by-row

| # | row (file:line) | claim | evidence | width | st |
|---|---|---|---|---|---|
| 1 | 70-78 (§0) | add-imm12 encodability table for 9 offsets | ARM `add #imm` = 8-bit rotated right by 2k: 0x27A8 (bits 3..13) / 0x3684 (2..13) / 0xB18 (3..11) / 0xBDC (2..11) / 0xBEC (2..11) / 0xC14 (2..11) / 0xC28 (3..11) all span >8 bits ⇒ not encodable; 0x9D0=0x9D<<4, 0x2940=0xA5<<6, 0xC50=0xC5<<4 are | — | C |
| 2 | 77 | two positive tests: `0x51DE4C add r1,r5,#2512`, `0x51D7B4/0x51E2CC add r1,r5,#0x2940` | `0051de4c: e2851e9d add r1,r5,#2512`; `0051d7b4: e2851da5 add r1,r5,#10560`; `0051e2cc` identical | — | C |
| 3 | 84-96 (§1) | 3-slot law arithmetic for 5 families | 0x27A8+0x264=0x2A0C; 0x9D0+0x1EC=0xBBC; 0xBBC+0x30=0xBEC; 0xBEC+0x78=0xC64; 0xC70+0x30=0xCA0; 0x2A78+0x780=0x31F8 — all exact | — | C |
| 4 | 124-131 (§2.1) | 6 × 68 = 0x198; 0x4447+0x198 = 0x45DF | arithmetic + `member4-file-layout.txt` (`0x04447 … sz=68`, `0x045df obj+0x2a78`) | — | C |
| 5 | 136-144 (§2.2) | 68B clean/dirty byte table ("r0 clean 全 0, dirty `c0 03 00 30…`") | at the real 0x4447: clean = `1f 50 c0 f0 03 40 1b 40 …` (26 non-zero), dirty = `ff`×63 + `0f`. The quoted `c0 03 00 30` is the **stale** 0x3EF7 window | — | **S** |
| 6 | 158-160 | all `movw #0x27A8` sites = 8 | raw scan = 8: `0x29D364 0x2A0780 0x51D764 0x51E27C 0x520C7C 0x524B14 0x73E8C8 0x73EC94` | — | C |
| 7 | 162-172 (§2.3.2) | quoted `0x520C6C..0x520C88` block | byte-identical (`and r1,r0,#31`; `mov r1,r9,lsl r1`; `add r7,r6,r7,lsl #2`; `movw r6,#0x27a8`; `ldr r6,[r7,r6]!`; `biceq`; `orrne`) | 4 B | C |
| 8 | 174-190 (§2.3.5) | `mov r3,#204`+`mla`; one loop over the 3 slots; `cmp r4,#384` | `00524b04 mov r3,#204`+`00524b08 mla`; `0x520C7C/0x520CA4/0x520CCC`; `00520ce4 cmp r4,#384` | 4 B | C |
| 9 | 187 | "same mask **and the same condition**" for the 68B triple | mask shared (r1) ✔; conditions differ: A from `tsts r7,r9,lsl r3` (0x520C5C), M from `cmp r5,#0` (0x520C8C), B from `cmp r2,#0` (0x520CB4) | — | **X** |
| 10 | 182-190 | helper family 288/36B/68B | see fam-288 row 21 (same sites) + `0x524A44` (a bit-**clear** helper for 0x1908 that the table omits) | 4 B | C |
| 11 | 192-198 | types 50/51/52 into `[sp,#52]`, 0xFFFF sentinel | `00520c9c mov r6,#50`, `00520cf4 mov r6,#51`, `00520d14 str r6,[sp,#52]`, `00520d1c movw r5,#0xffff`, `00520d50 cmps r0,r5` | — | C |
| 12 | 207-215 | `0x73E8C8/0x73E8E0/0x73E8F0` handle g0's three slots | `ldr r2,[r1,#0x27A8]` + `tsts`; if clear: `ldr r7,[r12,#0x27EC]`/`orr`/`str`, `ldr r7,[r3,#0x2830]`/`orr`/`str`; then `str` into 0x27A8 | 4 B | C |
| 13 | 219-221 (§2.6) | `0x29D364` / `0x2A0780` do "word-granular traversal" of the 68B slots | `0x2A0780`: `movw r2,#0x27a8; add r1,r1,r2; vldr s0,[r1]; vcmpe.f32 s0,#0.0; movls r0,#0x4561; movtls r0,#0x4561; strls r0,[r1,#0]` → **f32 compare-to-zero + conditional store of 3600.0f**, not a walk. `0x29D364`: `vmov.f32 s0,s16; movw r0,#0x27a8; add r1,r4,r0; bl 0x53aa84` (address + float arg). Same shape at `0x29D68C` for 0x2908 | 4 B (f32) | **X** |
| 14 | 226-236 (§3.1) | 164B A/B + mid slot, `0x9D0+3×0xA4 = 0xBBC` | `member4-file-layout.txt` 0x2FC7/0x306B (164) and `0x9D0+0x1EC=0xBBC` | 164 B | C |
| 15 | 241-253 (§3.2) | 164B clean hex, "`00×13` then `f0 ff ff ff 03`", "30 bit from byte40 bit4" | bytes 0..26 and the tail match exactly; but there are **14** zero bytes after `07` and the `f0` run starts at **byte 41** (`xxd -s $((0x2AC560+0x2FC7))`: row at +0x28 = `00 … 00 f0 ff ff ff 03 00 00`) | — | **X** (run lengths 78/59/30/28 are correct) |
| 16 | 255-260 | `B ⊆ A`, 96 visible bytes | recomputed `B & ~A == 0` for 96 bytes (head 64 + tail 32): **0 violations** | — | C |
| 17 | 262-266 | dirty A == B byte-for-byte (164/164) | `cmp`: 0 differing bytes out of 164 | — | C |
| 18 | 268-273 (§3.3a) | `0xA3DB14` = constant build, not a field access | `00a3db14 movw r1,#0xb18; 00a3db18 ldr r2,[r0,#340]; 00a3db1c orr r1,r1,r3,lsl #16; 00a3db20 str r1,[r0,#344]` | — | C |
| 19 | 276-280 (§3.3b) | `0x162814` group = 160 B copies `0xB18↔0xBB8` | `001627fc movw r0,#0xbb8 … 00162814 movw r0,#0xb18; mov r2,#160; … bl 0x13efdd0` twice, dest/src swapped | 160 B | C |
| 20 | 285-292 (§3.3c) | 164B reader `0x51DE4C` (0x9D0) / `0x51DE5C` (0xB18), writer `0x51D344`, 0xBBC/0xBDC 16 B | all five sites present with `r2=#164` / `#16`; `0x51DE4C` uses `add r1,r5,#2512` (=0x9D0) | 164/16 B | C |
| 21 | 296-306 (§4.2(1)) | `0xBDC` clean `fc`×12 `0a a3 0b 00`, dirty `ff`×14 `1f 00` | byte-identical in both saves; popcounts 81 / 117 | 16 B | C |
| 22 | 308-315 (§4.2(2)) | `0xBEC`/`0xC14` clean/dirty | byte-identical; diff = byte5 `ff→1f`, byte6 `ff→fe`; dirty slots identical | 20 B | C |
| 23 | 316-322 (§4.2(3)) | `0xC28`/`0xC50` clean/dirty | byte-identical; clean A==B; dirty A = `ff`×16 `0f` (popcount 132), B popcount 32 | 20 B | C |
| 24 | 330-345 (§4.3) | 0xC28 ↔ char_off 12631 (132 bit); 0xC50 ↔ 12651 | 0x3157=12631 ✔, 0x316B=12651 ✔; editor Medal06 last write `[12647] OR 15` ⇒ 132 bit | — | C |
| 25 | 373-374 | editor source refs `OtherForm.cs:231` / `:263-267` | current source: medal writes at **241-279**, and a B-slot delta mirror was added at **112-114 / 281-306** | — | **S** |
| 26 | 386-395 (§4.5) | "editor writes A only ⇒ A/B diverge" | the current editor mirrors newly-set bits into `h[12651+i]` (`OtherForm.cs:297-303`) — the doc's own recommendation is implemented | — | **S** |
| 27 | 411-430 (§5.1) | 3444 B is one `movw #0x3684` + `#0xd74` call; `0x3684+0xD74 = 0x43F8` | `0051da74 add r1,r5,#13952` (0x3680, `r2=#1`); `0051da84 movw r0,#0x3682; mov r2,#2`; `0051da98 movw r0,#0x3684; movw r2,#0xd74`; `0051daac movw r0,#0x43f8; mov r2,#3` | 1/2/3444/3 B | C |
| 28 | 432-437 (§5.2) | only 2 `movw #0x3684` sites | raw scan = exactly `0x51da98`, `0x51e5b0` | — | C |
| 29 | 447-449 (§6.2) | `0x5412FC` = constant build | `005412fc movw r1,#0xb18; 00541300 ldr r2,[r0,#340]; 00541304 orr r1,r1,r3,lsl #16; 00541308 str r1,[r0,#344]` | — | C |
| 30 | 470-478 (§6.2) | `0x295D84` passes 0xC28 as an argument | `00295d84 movw r1,#0xc28; … 00295d90 b 0x281b4c` (tail call, r0=obj) | — | C |
| 31 | 519-526 (§8.4) | "the whole `.text` has only reader `0x51DE5C` and writer `0x51D344` for 0xB18" | raw `movw #0xB18` = **23** sites: `0x162814 0x162a68 0x162d2c 0x162fe4 0x163368 0x1635c4 0x163c28 0x51d344 0x51de5c 0x5412fc 0x5429c8 0xa3db14 0xa4e8a4 0xa4fde0 0xa516c8 0xa53b9c 0xb37a7c 0xb383ec 0xca8ac0 0xca8c84 0xca92c0 0xca9484 0x13a4088` | — | **X** |
| 32 | 546-560 (§8.1) | `obj+0x2AD4` = 4 B-stride `{u16 id, u16 value}` array, count at `+0x88` | `006fccf8 movw r1,#0x2ad4; add r11,r4,r1`; `006fcd34 ldr r0,[r4,#136]`; `add r0,r11,r0,lsl #2`; `strh r5,[r0,#0]`; `strh r0,[r1,#2]` | 2+2 B | C |
| 33 | 560-565 (§8.1) | `0x8FB2A0` writes a 14×u32 scalar block at `+0x2A2C..0x2A60` | `008fb2a4 movw r2,#0x2a2c; ldr r1,[r0,#12]; str r1,[r4,r2]` … `0x2a60`, sources `[r0,#12..#60]` | 4 B | C |
| 34 | 570-585 (§8.2) | `0x520F80..0x520FFC`: test bit in `0x1F28`, then `orr` the same pos into `0x2A78`; 1 bit/pos | `00520fc0 movw r3,#0x1f28; 00520fc4 ldr r1,[r1,r3]; 00520fcc tsts r1,r3,lsl r2; 00520fec movw r2,#0x2a78; 00520ff0 ldr r2,[r1,r2]!; 00520ff4 orr r0,r2,r3,lsl r0; 00520ff8 str r0,[r1,#0]` | 4 B | C |
| 35 | 437-448 (§6.3) | editor live write-point inventory in `char_off 10251..22956` | current source: cat-arms block disabled, medal block now spans 241-306 incl. B mirror; the older `10251/11283/11383/12631` list is no longer the live set | — | **S** |

---

## 3. `records-128.md` — row-by-row (current worktree version)

| # | row (file:line) | claim | evidence | width | st |
|---|---|---|---|---|---|
| 1 | 39-52 (§1.1) | 15 × 128 B, `0x45DF..0x4D5F`, `char_off-obj = 0x1B67` | 0x45DF+0x780 = 0x4D5F; 0x45DF−0x2A78 = 0x1B67; `member4-file-layout.txt` agrees | 128 B | C |
| 2 | 56-63 (§1.2) | two groups of 15 `movw` sites, stride 0x14, imms 0x2A78…0x3178 | group A `0x51D7D8..0x51D8F0`, group B `0x51E2F0..0x51E408`; every site `mov r2,#128` + `bl 0x3df378` / `0x3df2a8` | 128 B | C |
| 3 | 65-75 | neighbour sequence `0x2A0C(36B) → 0x2A54(36B) → 0x3488… → 288 family → 0x27A8… → 0x2940(add) → 0x29C8 → 15×128` | `0051d414 movw r0,#0x2a0c; mov r2,#36`; `0051d428 movw r0,#0x2a54; mov r2,#36`; `0051d69c..` 288 B; `0051d764/778` 68 B; `0051d7b4 add r1,r5,#10560`; `0051d7c4 #0x29c8`; `0051d7d8 #0x2a78` | 36/288/68/128 B | C |
| 4 | 89 (§1.4) | `0x2a78` sites include `0x115BDD8` and `0x115BDE4` | actual: `0x115BDF8` (`movw r0,#0x2a78; str r8,[r4,r0]`) and `0x115BE64`. `0x115BDD8` = `movw r0,#0x29de`; `0x115BDE4` = `mov r0,r4` | — | **X** |
| 5 | 90 (§1.4) | `0x2af8` 3 sites | `0x51d7ec`, `0x51e304`, `0x848040` | — | C |
| 6 | 91 (§1.4) | `0x2b78` "25/26" | raw = 26; the doc's list omits `0x2997D8` | — | C (count), list incomplete |
| 7 | 96 (§1.4) | `0x31f8` 14 sites | raw = 14 | — | C |
| 8 | 84-87 (§1.3) | `0x520FEC` in fn `0x51E6D8..0x52139C`; `0x51EFD4..0x51F0BC` loop `r7=0..2047` | `function_start 0x520fec → 0x51e6d8`; `0051f0b8 cmp r7,#2048`; the loop does `ldrb [r1,#0x42C]`, `[#0x52C]`, `[#0x62C]` at `0x51F040/74/A8` with `pos>>3` and `1<<(pos&7)` | 1 B per pos | C |
| 9 | 128-134 (§2.1) | `chkBoxCatArmsUnlock` is the only writer of this family | the block is now commented out (`OtherForm.cs:219-244`, "已停用") | — | **S** |
| 10 | 135-142 (§2.2) | 8 islands at 0x4447/0x44CF/0x4557 ⇒ 68B slots obj+0x27A8/0x2874/0x2940 | matches authoritative `0x04447 obj+0x27a8 sz=68`; slot-internal offsets recomputed: A1=+0x00..+0x3E, A2=+0x3F, B1'=+0x19/0x1D/0x20/0x2F, C0=+0x39..+0x41, C1'=+0x16/0x20/0x24, C2=+0x41 | — | C |
| 11 | 148-158 (§2.3) | FF counts 63/54/56/9 match the islands | recomputed at the real windows: 63 in 0x440F..0x448F, 54 in 0x448F..0x450F, 56 in 0x450F..0x458F, 9 in 0x458F..0x460F — identical | — | C |
| 12 | 163-186 (§3) | authoritative column 6/2/0/1/9/0/1/46/2/5/2/0/0/1/0 and FF 0/0/0/0/0/0/0/1/0/0/0/0/0/0/0 | `member4-diff.txt` rows 90-104 + my own byte compare: identical | — | C |
| 13 | 115 / 234-236 (§1.4/§4.2.1) | `0x6FCCEC..0x6FD4DC` does a byte/u16 walk of rec7/rec8 | sites exist, but `0x6FCE80` is `movw r1,#0x2e6a; strh r0,[r4,r1]` (a **u16 store** from `[r4,#0x8C]`) and `0x6FCE88` `movw r1,#0x2e6c; ldrb r0,[r4,#0x4B]; str r0,[r4,r1]` (a 4 B store of a byte) — i.e. writes of derived values, not a field walk | 2 B / 4 B | **U** (direction/semantics not as implied) |
| 14 | 205 / 213-215 (§4.2.1) | rec1 `+0x00/+0x01` are u8 fields | retracted in-doc (§8.3) and indeed `0x848040`/`0x848050` are `movw r1,#0x2af8` / `#0x2af9` + `movt r0,#1` + `strh r1,[r8,r0]` (r0=0x134F2): constants stored into a UI struct | — | C (retraction correct) |
| 15 | 416-436 (§7.1b) | "**136 B slot = 1F half + 1E half** (structure settled)" | authoritative table has *two* 68 B fields here (`0x27A8` and `0x2830`, `0x2874` and `0x28FC`, `0x2940` and `0x29C8`); the serializer reads them in separate 68 B calls (`0x51D764`, `0x51D778`, `0x51D78C`, `0x51D7A0`, …). The byte values `1F`/`1E` are the first bytes of two separate fields | 68 B | **X** |
| 16 | 470-490 (§7.4) | "real grid = 68 B / **136 B**" | the 68 B half is right; the 136 B unit has no backing in the field table or the reader/writer calls (the 0x88 spacing the doc measured is 2 × 0x44, i.e. every second 68 B slot) | — | **X** (136 B part) |
| 17 | 434-436 | `0x2AD4 = 0x2A78+0x5C` | arithmetic exact; as rec0+0x5C, not as "68 B half +0x18" | — | C |
| 18 | 529-540 (§8.1) | `0x6FCCE0` uses `obj+0x2AD4`, 4 B stride, count `[r4,#0x88]` | see fam-small row 32 | 2+2 B | C |
| 19 | 543-550 (§8.1) | `0x8FB2A0` = 14×u32 other-object block | see fam-small row 33 | 4 B | C |
| 20 | 553-558 (§8.1) | `0x524A80` window = `lsr #5`, `and #31`, `ldr [r0+0x2a0c/0x2a54]`, `tst`, `movne #1` | `0x524AB4..0x524AD4` (0x2A0C) and `0x524ADC..0x524AFC` (0x2A54) match instruction for instruction | 4 B | C |
| 21 | 560-585 (§8.2) | 0x520F80: `1<<(pos&31)`, no 2-bit masks; "if A[pos] then B[pos]=1" | see fam-small row 34; `mov r3,#1` reused, `lsl` by `pos&31` | 4 B | C |
| 22 | 562 (§8.3) | retraction text: `movw r1,#0x2af8; strh r1,[r8,#176]` | instruction is `strh r1,[r8,r0]` with `r0 = 0x134F2` (0x84803C `movw r0,#0x34f2`, 0x848044 `movt r0,#1`) | 2 B | **X** (displacement only; substance correct) |
| 23 | 244-292 (§5.3/§5.4) | list of functions needing disassembly | now covered by this review (see rows above); no open claim | — | — |
| 24 | 563 | "the real fields are `{u16,u16}`@`+0x18` and the bit array" | `+0x18` is inside a 136 B half-slot that does not exist as a serialized unit; the verified structures are `{u16,u16}`@rec+0x5C (4 B stride) and the 0x2A78 bit array | — | **X** (dependent on row 15) |

---

## 4. Contradictions (each with command + output)

### 4.1 `fam-288.md:75` — `0x520C9C` is not a `0x27A8` site

```
{"vaddr":"0x520C9C","count":2}
00520c9c: e3a06032  mov r6, #50
00520ca0: e0873103  add r3, r7, r3, lsl #2
```
The `0x27A8` access in this block is `0x520C7C` (`movw r6,#0x27a8` / `ldr r6,[r7,r6]!`).
`0x520C9C` is the "type 50" descriptor setup. The row's offset/width (`0x27A8`, 4 B) is right;
the **site address** is wrong.

### 4.2 `fam-288.md:79` — `0x524A6C` is `bx lr`

```
{"vaddr":"0x524A5C","count":6}
00524a5c: e3011908  movw r1, #0x1908
00524a60: e7b01001  ldr r1, [r0, r1]!
00524a64: e1c11213  bic r1, r1, r3, lsl r2
00524a68: e5801000  str r1, [r0, #0]
00524a6c: e12fff1e  bx lr
```
The second `0x1908` site in this helper block is `0x524A5C`, not `0x524A6C`. (The helper at
`0x524A44` is a bit-**clear** variant; `0x524A84` is the bit-test; both use `0x1908`.)

### 4.3 `records-128.md:89` — two `0x2A78` sites are off by 0x20/0x80

```
{"vaddr":"0x115BDD0","count":12}
0115bdd8: e30209de  movw r0, #0x29de
0115bddc: e6950000  ldr r0, [r5], r0
0115bde4: e1a00004  mov r0, r4
0115bdf8: e3020a78  movw r0, #0x2a78
0115bdfc: e7848000  str r8, [r4, r0]
```
and `{"vaddr":"0x115BE58","count":8}` → `0115be64: e3020a78 movw r0,#0x2a78`.
The 12-site count is correct (raw scan), but the last two addresses in the list should be
`0x115BDF8` and `0x115BE64`. Both are **stores** of `r8`, not reads.

### 4.4 `fam-small.md:219-221` — the "word-granular traversal" is an f32 compare-and-init

```
{"vaddr":"0x2A0780","count":10}
002a0780: e30227a8  movw r2, #0x27a8
002a0784: e0811002  add r1, r1, r2
002a0788: ed910a00  vldr s0, [r1]
002a078c: eeb50ac0  vcmpe.f32 s0, #0.0
002a0790: eef1fa10  vmrs APSR_nzcv, fpscr
002a0794: 93000000  movwls r0, #0x0
002a0798: 93440561  movtls r0, #0x4561
002a079c: 95810000  strls r0, [r1, #0]
```
`0x45610000` = 3600.0f. So `obj+0x27A8` is read as an **f32** and, if `<= 0`, set to 3600.0f.
The same field is passed as a float argument at `0x29D364` (`vmov.f32 s0,s16; … bl 0x53aa84`),
and `0x29D68C` does the same for `0x2908`. This does not fit "逐个访问 … 像遍历/校验".
It does not disprove the 68 B bitmap reads at `0x520C7C` etc., but it does mean the two functions
(and their offsets) are **not** the same kind of access, and the object base of `0x2A0698`
(`r1`) is not proven to be member#4.

### 4.5 `fam-small.md:44` and `:519-526` — "only 2 static references to 0xB18"

Raw `movw #0xB18` yields 23 sites (list in table row 31). The doc's §6.2 already warns that
"same constant, different object" is common; §8.4 then nevertheless writes "整个 .text 里的静态引用，
只有存档 reader … 与 writer … 两处" and calls the set "可证完备". Either the sentence must say
"only two **attributable** references", or the claim is false. The 21 other sites include
`0xa4e8a4 / 0xb37a7c / 0xca8ac0 / 0x13a4088`, which are not discussed anywhere in the file.

### 4.6 `fam-small.md:243` — one-byte offset error in the 164 B A hex

```
xxd -s $((0x2AC560+0x2FC7)) -l 64   # third line is bytes 32..47
002af547: 0000 0000 0000 0000 00f0 ffff ff03 0000
```
After `… 07` there are **14** zero bytes (not 13) and the `f0 ff ff ff 03` run starts at byte 41,
not byte 40. The run lengths the doc derives (78/59/30/28 bit) are correct; only the start index is off by one.
Same for the B slot (`90 9f 9f 9f 03` starts at byte 41).

### 4.7 `fam-288.md:288` and `fam-small.md:187` — "same condition"

The mask is shared, the **condition is not**:

| slot | flags source |
|---|---|
| 288 B A (`0x16C8`) | `00520b18 tsts r10, r11, lsl r1` (old value read from `+0x11CC`) |
| 288 B M (`0x17E8`) | `00520b50 cmp r8, #0` (masked old value from `+0x128C`) |
| 288 B B (`0x1908`) | `00520b7c cmp r3, #0` (masked old value from `+0x134C`) |
| 68 B A (`0x27A8`) | `00520c5c tsts r7, r9, lsl r3` |
| 68 B M (`0x27EC`) | `00520c8c cmp r5, #0` |
| 68 B B (`0x2830`) | `00520cb4 cmp r2, #0` |

`fam-288.md:401` and `fam-small.md:50/116` already state the correct version ("极性可能各自独立"),
so this is an internal contradiction inside each file rather than a wrong final conclusion.

### 4.8 `records-128.md:416` and `:470-490` — the "136 B slot" unit

The authoritative table has 68 B fields at `0x4447` (obj+0x27A8) **and** `0x448B` (obj+0x2830), and the
serializer reads each with its own call:

```
0051d764: e30207a8  movw r0, #0x27a8   ; then mov r2,#68 + bl 0x3df378
0051d778: e3020830  movw r0, #0x2830   ; then mov r2,#68 + bl 0x3df378
```
So a "136 B record = 1F half + 1E half" is a pattern over two *independent* serialized fields.
The three editor islands are slots #0, #2, #4 of the 68 B array (`+0x88` apart), not "136 B slot starts".
This is what makes the file's own §7.4 "real grid = 68 B / 136 B" half-right (68 B) and half-unsupported (136 B).

### 4.9 `records-128.md:562` — store displacement in the retraction

```
{"vaddr":"0x848038","count":6}
0084803c: e30304f2  movw r0, #0x34f2
00848040: e3021af8  movw r1, #0x2af8
00848044: e3400001  movt r0, #0x1
00848048: e18810b0  strh r1, [r8, r0]
```
The retraction is substantively correct (a literal value stored into a UI struct, not a field read),
but the destination is `[r8, #0x134F2]`, not `[r8, #176]`.

### 4.10 Secondary: `fam-small.md:518` — `0xD84` in fn `0x29CEC4`

`0xD84` (3460) is inside the `ldr/str` imm12 range, so a direct field access would not need `movw`.
A scan of `0x29CEC4..0x29EC84` finds **no** `[rN,#0xD84]` data access (the only hit is
`0x29dedc ldr r0,[r15,#3460]`, a PC-relative literal load). The function does access
`0x27A8/0x27AC/0x27B0/0x27B4/0x28DC/0x28F4/0x2908/0x290C/0x2910` (all inside the function),
so "同函数含 0xD84" is unsupported unless the field is reached through a pointer.

---

## 5. Stale tables (the doc's own errata, not applied to the tables)

`fam-288.md` and `records-128.md` both carry a header note that `file_off/char_off` are 0x550 early.
`fam-small.md` states the corrected ranges but kept the §2 table from the old dump.
Consequences, measured:

| doc:line | table | doc value | value at the authoritative offsets |
|---|---|---|---|
| fam-288.md:147 | 288 B per-slot `diff/288` | 8,1,42,63,98,162,140,169,153,153 | **191,111,198,126,183,120,191,85,199,105** (`member4-diff.txt` rows 74-83; my `cmp` reproduces) |
| fam-288.md:151,156 | `r3(clean) +0x38 = C7 01` | at stale 0x374F | at real `0x3C9F` the bytes are `00 00 00 00`; `c7 01` is at `0x374F` |
| fam-small.md:138 | 68 B r0 clean/dirty | clean all 0; dirty `c0 03 00 30 …` | at 0x4447: clean `1f 50 c0 f0 03 40 1b 40 4e 80 80 c0 …`, dirty `ff`×63 `0f` |
| fam-small.md:143 | 68 B r5 dirty "from byte4" | `30 03 30 33 …` | at 0x459B: `fe fe ec 09 20 f3 c8 fd …` (high-entropy, not the quoted pattern) |
| records-128.md:416-424 | "槽 7/8/9" halves | `1f 50 c0 f0…` / `1e 50 c0 f0…` | correct **bytes** at 0x4447/0x448B/0x44CF/0x4513/0x4557/0x459B, but the three islands are 0x4447/0x44CF/0x4557 = slots 0/2/4 |

Verification command for the last row:

```
node -e "...for each slot of [0x4447,0x448B,0x44CF,0x4513,0x4557,0x459B] print clean/dirty hex..."
obj 0x27a8 file 0x4447 diff=64 ff=63  c: 1f 50 c0 f0 03 40 1b 40 4e 80 80 c0 …
obj 0x2830 file 0x448b diff=55 ff=1   c: 1e 50 c0 f0 03 40 1b 40 4e 80 00 c0 …
obj 0x2874 file 0x44cf diff=66 ff=53  c: 1f 28 18 7e 00 da 00 64 02 04 60 00 …
obj 0x28fc file 0x4513 diff=56 ff=3   c: 1e 28 18 7e 00 da 00 64 02 04 40 00 …
obj 0x2940 file 0x4557 diff=66 ff=62  c: 1f 28 18 7e 00 da 00 64 02 04 60 00 …
obj 0x29c8 file 0x459b diff=58 ff=0   c: 1e 28 18 7e 00 da 00 64 02 04 60 00 …
```
These six lines match `member4-diff.txt` exactly (64/63, 55/1, 66/53, 56/3, 66/62, 58/0), i.e. the
authoritative table is right and the 68 B family is where the editor's flood landed (A slots 63/53/62 FF,
B slots 1/3/0 FF).

---

## 6. Cross-file conflict on who owns file `0x4447..0x45DF`

* `fam-small.md:124` — "68B 族 (obj+0x27A8..0x29C8, file **0x4447..0x45DF**)".
* `records-128.md` (pre-07:07 version) — the same bytes were "rec7+0x38 / rec8+0x40 / rec9+0x48",
  and the editor was said to destroy 128 B records i7..i10.
* `docs/save-layout/member4-file-layout.txt:86` — `0x04447 obj+0x27a8 sz=68` (and `:92` `0x045df obj+0x2a78 sz=128`).

The authoritative table and the byte dumps settle it in favour of `fam-small.md`:
`0x4447` is the 68 B family, and the editor's three FF islands are that family's A slots, not 128 B records.
The current `records-128.md` (edited 2026-11-04 07:07, during this review) already adopts this in
§2.2/§2.3/§3; the 136 B reading in §7.1b/§7.4 is the remaining residue.
Note that the editor's own comment in `OtherForm.cs:219-244` still calls the region "15x128B 记录族"
and gives the corrected range `0x45DF..0x4D5F` in the same sentence — the comment is right about the
range and wrong about what was written there.

---

## 7. Summary

| file | rows checked | confirmed | contradiction | stale | unverified |
|---|---|---|---|---|---|
| `fam-288.md` | 32 | 27 | 3 (4.1, 4.2, 4.7) | 1 (§2.6 diff table) | 1 (§9.4 name↔shard) |
| `fam-small.md` | 35 | 27 | 4 (4.4, 4.5, 4.6, 4.7) | 4 (row 5, 25, 26, 35) | 0 |
| `records-128.md` | 24 | 17 | 5 (4.3, 4.8 ×2 rows, 4.9, row 24) | 1 (row 9) | 1 (row 13) |
| **total** | **91** | **71** | **12** | **6** | **2** |

Note on the counts: a "contradiction" is a row whose cited site/offset/width or stated number does not
match the image (or the authoritative table). Several contradictions are **site-address only** —
the offset and width in the same row are correct. No row was found where a cited *offset* is read at a
*different width* than stated: every 68/288/36/20/16/164/3444 B block-size claim matches the `mov r2,#N` of its
`bl 0x3df378` / `bl 0x3df2a8`, and every bit-field read is a 32-bit `ldr` with
`lsr #5` + `and #31` (or a 1-byte `ldrb` with `lsr #3` + `and #7` for the quest tri-state).

The strongest positive results (all instruction-level, reproducible from this report):
the 288 B family's A/M/B triple and 864 B group stride; the 68 B family's 0x27A8/0x27EC/0x2830 triple and
204 B group stride; the five bit helpers; the 15 × 128 B read/write pairs; the 164 B pair + mid slot;
the 3444 B single-blob call; the `0xC28`/`0xC50` medal byte layout; and the 21-name `cTrialArts` chain
(whose 22nd string is `cTrialArtsXML`, which the doc did not have).

---

## VERDICT

doc	claim	status	evidence
fam-288.md	288B slots are written/read one 288-byte memcpy per slot, 10 slots	confirmed	10× `mov r2,#288`+`bl 0x3df378` at 0x51D69C..0x51D750 and 10× `bl 0x3df2a8` at 0x51E1B4..0x51E268
fam-288.md	state A/M/B = obj+0x16C8/+0x17E8/+0x1908, group stride 864	confirmed	0x520B40/B6C/B8C movw + ldr! ; 0x520B2C `mov r0,#864` + mla
fam-288.md	site 0x520C9C materialises 0x27A8	contradiction	0x520C9C = `mov r6,#50`; the 0x27A8 site is 0x520C7C
fam-288.md	site 0x524A6C materialises 0x1908	contradiction	0x524A6C = `bx lr`; second 0x1908 site is 0x524A5C
fam-288.md	slot-internal offsets 0x1D0C..0x1E8C, regs r6/r1/r2	confirmed	9 movw sites at 0x520C34/4C/44, 0x520D5C/74/6C, 0x520E84/9C/94 followed by 4 B ldr/str
fam-288.md	1 bit test + conditional OR across three slots, same mask	confirmed	0x520B14 `and r8,…lsl r1`, 0x520B18 `tsts`, 0x520B48/B4C `biceq/ornne r3,r3,r5`
fam-288.md	those three slots share one polarity condition	contradiction	flags per slot: 0x520B18 tsts / 0x520B50 cmp r8 / 0x520B7C cmp r3 (doc fixes this at line 401)
fam-288.md	outer loop 1536, inner 4, groups 5, terminator 0xFFFF	confirmed	0x520BB0 cmp #1536; 0x520B9C cmp #4; 0x520BBC cmp #5; 0x520A60 movw #0xffff
fam-288.md	bit = id*4+j, word = bit>>5	confirmed	0x520AA8 lsl #2, 0x520AB4 and #0x1C, 0x520B24 lsr #5, 0x520B3C lsl #2
fam-288.md	read side arrays +0x11CC/+0x128C/+0x134C, stride 576	confirmed	0x520AD8/0x520AE4 (r9*9<<6); 0x520B04/AFC/B00 ldr [r5,#…]
fam-288.md	read base may not be obj	confirmed	0x51EBF4 str r5,[sp,#36] (arg1) vs 0x51EC0C str r4,[sp,#40] (arg0)
fam-288.md	68B triple 0x27A8/0x27EC/0x2830, 384 iterations	confirmed	0x520C7C/CA4/CCC + 0x520CE4 cmp r4,#384
fam-288.md	five bit-test helpers with 864/0x1908, 0x2A0C, 0x2A54, 204/0x27A8, 0x2830	confirmed	0x524A84, 0x524AC0, 0x524AE8, 0x524B04..18, 0x524B34..44
fam-288.md	0x6AE4F4 is a movw+movt absolute-address false positive	confirmed	0x6AE4F4/0x6AE4FC → 0x817E8; memcpy at 0x13efdd0
fam-288.md	window 0x520B00..0x520BFF contains only 0x11CC/0x16C8/0x17E8/0x1908/0xFFFF	confirmed	raw movw scan of that window
fam-288.md	5 groups = record types 44..48; type 50/51/52 follow	confirmed	0x520A44 `add r0,r9,#44`; 0x520C9C `mov r6,#50`; 0x520CF4 `mov r6,#51`
fam-288.md	one global slot 0x1839388 behind the three type blocks	confirmed	0x520BC4 pool 0x13187A4 + 0x520BDC `ldr r10,[pc,r0]` → 0x1839388
fam-288.md	21-name chain rabbitNo…mTatsujin[2] with exact addresses	confirmed	NUL-walk from 0x156922B; 22nd string = cTrialArtsXML @0x156930E
fam-288.md	18 members × 48 B = 864 = group stride	confirmed	`mov r0,#864` + 0x27A8-0x16C8 = 0x10E0 = 5×864
fam-288.md	shard ①/②/③ = mGuild+mOld / mAirhike+mBushi / mKizuna+mTatsujin	unverified	only the string order supports it; no instruction ties a name to a shard
fam-288.md	per-slot diff 8/1/42/63/98/162/140/169/153/153	stale	authoritative/real = 191/111/198/126/183/120/191/85/199/105
fam-small.md	0x27A8/0x3684/0xB18/0xBDC/0xBEC/0xC14/0xC28 are not add-imm12 encodable; 0x9D0/0x2940/0xC50 are	confirmed	8-bit rotate-right span analysis; two positive tests at 0x51DE4C and 0x51D7B4/0x51E2CC
fam-small.md	5 families satisfy the 3-slot law with exact closure	confirmed	0x2A0C/0xBEC/0xBEC+0x78/0xC70+0x30/0x2A78+0x780 all exact
fam-small.md	68B family clean/dirty byte table	stale	real 0x4447 clean `1f 50 c0 f0 …`, dirty `ff`×63 `0f`; quoted `c0 03 00 30` is the stale 0x3EF7 window
fam-small.md	8 sites for movw 0x27A8	confirmed	raw scan = 8 (0x29D364, 0x2A0780, 0x51D764, 0x51E27C, 0x520C7C, 0x524B14, 0x73E8C8, 0x73EC94)
fam-small.md	68B updater uses same mask and same condition for three slots	contradiction	mask r1 shared; flags differ (0x520C5C tsts / 0x520C8C cmp r5 / 0x520CB4 cmp r2)
fam-small.md	0x73E8C8 group ORs the same bit into 0x27EC/0x2830 then 0x27A8	confirmed	0x73E8C0..0x73E904
fam-small.md	0x29D364/0x2A0780 do a word-granular traversal	contradiction	0x2A0780 vldr s0 / vcmpe #0.0 / strls 0x45610000 (3600.0f); 0x29D364 passes the address + float to 0x53aa84
fam-small.md	164B B ⊆ A over 96 visible bytes	confirmed	recomputed 0 violations
fam-small.md	164B dirty A == B for all 164 bytes	confirmed	0 differing bytes
fam-small.md	164B A clean hex incl. run starts	contradiction	14 zero bytes (not 13); the 30-bit run starts at byte 41, not 40
fam-small.md	0xA3DB14 / 0x5412FC are constant builds, not 0xB18 accesses	confirmed	both are `movw r1,#0xb18` + `orr r1,r1,r3,lsl #16` + `str [r0,#344]`
fam-small.md	0x162814 group copies 160 B between 0xB18 and 0xBB8	confirmed	0x1627FC/0x162814 with `mov r2,#160` + memcpy
fam-small.md	164B reader/writer sites 0x51DE4C/0x51DE5C/0x51D344 with 164 B	confirmed	`mov r2,#164`, add #2512 and movw #0xb18
fam-small.md	0xBDC / 0xBEC / 0xC14 / 0xC28 / 0xC50 bytes and popcounts	confirmed	byte-identical dumps; popcounts 81/117, 132, 32, 12
fam-small.md	0xC28 = 132-bit medal, char_off 12631, B at 12651	confirmed	0x3157/0x316B; dirty A = ff×16+0f = 132 bits; clean A==B
fam-small.md	editor writes only the A medal slot	stale	current source mirrors new bits into 12651 (OtherForm.cs:297-303)
fam-small.md	editor source refs :231 / :263-267	stale	medal writes now at 241-279, mirror at 281-306
fam-small.md	3444 B is a single #0x3684/#0xD74 blob; 0x3684 has 2 sites	confirmed	0x51DA98 + 0x51E5B0 only; 0x43F8/3 B follows
fam-small.md	0x295D84 passes 0xC28 as an argument	confirmed	0x295D84 movw r1,#0xc28 + tail `b 0x281b4c`
fam-small.md	0xB18 has only two static references	contradiction	raw movw #0xB18 = 23 sites (11 of them not discussed in the file)
fam-small.md	obj+0x2AD4 = 4 B {u16 id,u16 value} array, count at +0x88	confirmed	0x6FCCF8 add r11,r4,#0x2ad4; 0x6FCD34 ldr r0,[r4,#136]; strh ×2
fam-small.md	0x8FB2A0 copies 14 u32 from another object into +0x2A2C..+0x2A60	confirmed	0x8FB2A4..0x8FB310
fam-small.md	0x1F28 bit gates the 0x2A78 bit at the same pos, 1 bit/pos	confirmed	0x520FC0..0x520FF8
records-128.md	15 × 128 B family at 0x45DF..0x4D5F, delta 0x1B67	confirmed	0x45DF+0x780 = 0x4D5F; layout file rows 92/106
records-128.md	two 15-site groups, stride 0x14, 128 B each	confirmed	0x51D7D8..0x51D8F0 / 0x51E2F0..0x51E408 with `mov r2,#128`
records-128.md	neighbour sequence 36B → 288B → 68B → 128B	confirmed	0x51D414..0x51D7D8 call order
records-128.md	0x2A78 site list (12) incl. 0x115BDD8 / 0x115BDE4	contradiction	actual sites 0x115BDF8 / 0x115BE64; the cited ones are `movw #0x29de` and `mov r0,r4`
records-128.md	0x2AF8 3 sites / 0x2B78 26 / 0x31F8 14	confirmed	raw scan 3 / 26 (0x2997D8 missing from the list) / 14
records-128.md	0x520FEC in fn 0x51E6D8 and a 2048-iteration bit loop, 1 B/pos	confirmed	function_start; 0x51F0B8 cmp #2048; ldrb at +0x42C/+0x52C/+0x62C with pos>>3
records-128.md	editor islands are the 68B A slots (0x27A8/0x2874/0x2940)	confirmed	layout 0x04447 obj+0x27a8 sz=68; dirty 0x4447 = ff×63 0f; FF counts 63/54/56/9 reproduce
records-128.md	128B family was not flooded	confirmed	dirty FF per 128B record = 0/0/0/0/0/0/0/1/0/0/0/0/0/0/0
records-128.md	"136 B slot = 1F half + 1E half", structure settled	contradiction	0x4447 and 0x448B are separate 68 B fields in the layout and separate 68 B I/O calls
records-128.md	real grid is 68 B / 136 B	contradiction	68 B confirmed; 0x88 spacing is 2 × 0x44 (every second slot), not a 136 B unit
records-128.md	0x848040 stores "0x2AF8 as a literal into [r8,#176]"	contradiction	store is `strh r1,[r8,r0]` with r0 = 0x134F2
records-128.md	0x524A80 helper family reads 0x2A0C/0x2A54 with lsr #5 + and #31	confirmed	0x524AB4..0x524AD4 / 0x524ADC..0x524AFC
records-128.md	0x1F28 → 0x2A78 conditional propagation, 1 bit/pos	confirmed	0x520FC0..0x520FF8

---

## Difficulties

1. **Concurrent edit of `records-128.md`.** The file changed at 2026-11-04 07:07 while this review was
   running (`git status`: `M`, +27/−27), and the change fixed exactly the family mis-attribution I had
   independently derived from `member4-file-layout.txt`. All `records-128.md` rows above are checked against
   the current worktree text; the residue is §7.1b/§7.4/§8.1b (136 B slot) and §8.3's store displacement.
   Any later re-run should re-diff first.
2. **MCP `literal_loads` under-reports conditional `movw`.** Counts from that device differ from the docs'
   `movw-index.json` (e.g. 0x1B48: 10 vs 12). All count claims here were re-derived with a raw word scan;
   without that, two of the docs' counts (0x1b48, 0x31f8) would have looked wrong when they are right.
3. **Width of "address passed to a helper" rows.** For `0x29D364`/`0x29D68C` the cited site only forms
   `obj+off` and jumps to `0x53aa84`; the width is decided inside the callee. I reported the width only
   where the callee's first instructions or the direct `ldr` prove it, and marked the rest accordingly.
4. **No execution of the game / no live memory.** All obj-side claims are validated against the file image
   through the authoritative obj↔file map; "M slot is recomputed at load" style claims remain unverifiable
   here (they need a live memory dump) and are listed as such, not as contradictions.
5. **Byte tables whose provenance is a stale dump.** For `fam-288.md` §2.6 and `fam-small.md` §2.2 I could
   prove the provenance (the quoted bytes exist at the 0x550-early addresses and not at the authoritative
   ones), so they are classified *stale*, not *wrong*; the docs' headers do carry the erratum, but the tables
   themselves were never recomputed, and downstream text still quotes them.
6. **`fam-small.md:518`'s `0xD84`.** Because 0xD84 fits in `ldr/str` imm12, the absence of a `movw` proves
   nothing; I could only show that no direct `[rN,#0xD84]` data access exists in `0x29CEC4..0x29EC84`
   (the one hit is a PC-relative literal load). A pointer-table path cannot be excluded, hence the softer
   "secondary" wording rather than a hard contradiction.
