# EMC section selection in the MHGU interpreter — report (EmcSection)

Question: what does an EMC `section` index mean at runtime, and which section does the pool-dispatch path actually walk?
Prior claim to test (devlog-digest-C.md:159): "池派发只会跑节 1" (pool dispatch only runs section 1).
Tags: [A] verified (vaddr + quoted instruction words), [B] inferred, [U] unknown.

## Confirmed

- [A] Claim location corrected: the "池派发只会跑节 1" line is at `MHRS/docs/reference/devlog-digest/devlog-digest-C.md` (not MHGU/docs/...). Context of the claim (same file, ~L159): 节号模型: em+0x72fc = 脚本槽号; resolveState 0x825fc (18-item jump table 0x82650) maps slot 1→pending stack, 2/18→em+0x7340, 10→em+0x73c0; 节 10 子程序调用、节 2 停驻、节 12 tick 级覆盖; **池派发只会跑节 1**; 派发在 fn 0x8282c (0x829f4/0x82a08); 0x51d70 与选节无关.
- [A] `emc.mjs` header comment + `MHGU/docs/reference/formats/emc.md`: EMC header "EMC\0"|u32 ver 0x20120804|u32 nsec(21)|0; 16 B section descriptors @0x10 {count, offset, 0, 0}; per-section entry tables; loader 0x520a0 allocates a pointer array per section at `obj+0x68+4*s` and stores base+offset per entry; accessor `0x51d70(cmd,i)` returns `[cmd+0x78][i]` if `i < [cmd+0x6c]` (per emc.md). Interpreter 0x82f80 called from 0x82f54; loop 0x83770 gets length via 0x50ce0; 256-way op jump table at 0x837ac; `ip += length` at 0x855ac; op>0xa6/0xff ends script (branch 0x83d80). `sub` = `[ctx+0x1428]` where ctx = arg0 of 0x82f80.
- [A] main binary located: `MHGU-private/main.140.flat.bin` (also a copy at `.tmp/mhgu/extract/exefs-0eb5/`).

## In progress

### resolveState 0x825fc — decoded [A]
```
0008262c: e5d41000  ldrb r1, [r4, #0]      ; slot byte (initially em[0x72fc])
00082630: e2414001  sub r4, r1, #1
00082634: e3540011  cmp r4, #17
00082638: 8a00001b  bhi 0x826ac            ; slot-1 > 17 -> return slot-1
0008263c: e1a04104  mov r4, r4, lsl #2
00082640: e28f5008  add r5, pc, #8         ; table at 0x82650
00082644: e7946005  ldr r6, [r4, r5]
0008264c: e086f005  add pc, r6, r5
```
Table 0x82650 (18 words, slots 1..18): slot 1 → 0x82698 (pop: `r4 = em + 0x7350 + 8*(em[0x734c]-1)`, loop); slots 2, 18 → 0x8262c with `r4 = em+0x7340`; slot 10 → 0x82628 (`r4 = em+0x73c0`); slots 3-9, 11-17 → 0x826ac return. Return at 0x826ac: `mov r0, r1` where r1 = slot-1 ⇒ **resolveState returns slot-1 (0-based)**. Matches devlog mapping (1→pending stack, 2/18→em+0x7340, 10→em+0x73c0). 18 slots for 21 sections: sections 18..20 (0-based) are not reachable via this resolver's 1-based slot byte... or the mapping is not identity — unresolved yet.

### accessor 0x51d70 — decoded [A]
```
00051d78: e592306c  ldr r3, [r2, #108]     ; [cmd+0x6c]
00051d80: 912fff1e  bxls lr                ; i >= [cmd+0x6c] -> return 0
00051d84: e5920078  ldr r0, [r2, #120]     ; [cmd+0x78]
00051d88: e7900101  ldr r0, [r0, r1, lsl #2]
```
So 0x51d70(cmd,i) = [cmd+0x78][i] bounded by [cmd+0x6c]. Whether cmd+0x78 is a per-section array or a merged one depends on the loader layout (0x520a0) — checking next.

### dispatch head 0x8282c — first observations [A]
- Args (em=arg0, arg1∈{0,1,2}): `strh r0,[r4,r5]` + `str r0,[em+0x1408]` — copies em[0x1408] halfword into em[arg1]; arg1==2 returns immediately.
- Three fixed-slot paths write `strh r2, [em+0x72fc]` with r2 = 13 (0x8288c, entry ptr [res+0x34]), 8 (0x828f0, [res+0x20]), 14 (0x8292c, [res+0x38]); each then `ldr r0, [r0,#0]` (0x82934) and `str r0, [em+0x72f8]` (0x8293c), `strb #0,[em+0x7304]` (0x82948). res = em[0x72f4].
- Guarded path (em[0x1408]&0x80 and em[0x7420]!=0, 0x82950-0x82964): sets em[0x72fc]=1 (0x82998), em[0x72fd]=f(em,1) via bl 0xb4e58 (0x829a4), then the double-indexed load at 0x829f4/0x82a08 (see below).
- Double-indexed load [A]:
```
000829e4: e7942000  ldr r2, [r4, r0]          ; r2 = em[0x72f4]
000829f0: e5d60000  ldrb r0, [r6, #0]         ; r0 = em[0x72fc]
000829f4: e7922100  ldr r2, [r2, r0, lsl #2]  ; r2 = [em72f4 + 4*em[0x72fc]]
00082a00: e7d41001  ldrb r1, [r4, r1]         ; r1 = em[0x72fd]
00082a08: e7922101  ldr r2, [r2, r1, lsl #2]  ; r2 = [r2 + 4*em[0x72fd]]
00082a10: e7842003  str r2, [r4, r3]          ; em[0x72f8] = entry ptr
```
In THIS path em[0x72fc] was just set to 1 — but this path is conditional (0x80 flag). The main pool path may be elsewhere in 0x8282c (disasm cut at 0x82a58) or in another function.


### em[0x72f4] = rEnemyCmd + 0x68 ⇒ em[0x72fc] IS the 0-based section index [A]
`0x7109c(em)` (called at 0x825bc in the init path that sets em[0x72f4]):
```
0007109c: e30715f4  movw r1, #0x75f4
000710a0: e7900001  ldr r0, [r0, r1]   ; r0 = em[0x75f4]
000710a8: 12800068  addne r0, r0, #104 ; r0 += 0x68
```
Loader 0x520a0 stores the loaded EMC buffer at obj+0x64 (0x52190 `str r0,[r1,#100]`) and, per section s = 0..20, allocates `(count+1)*4` bytes and stores the pointer at `obj+0x68+4*s`:
```
00052208: e081110a  add r1, r1, r10, lsl #2   ; r1 = obj + 4*s
0005220c: e5a10068  str r0, [r1, #104]!       ; obj[0x68 + 4*s] = section-s entry-ptr array
```
Therefore in 0x8282c's guarded path:
```
000829e4: e7942000  ldr r2, [r4, r0]          ; r2 = em[0x72f4] = cmd+0x68
000829f0: e5d60000  ldrb r0, [r6, #0]         ; r0 = em[0x72fc]  (0..20)
000829f4: e7922100  ldr r2, [r2, r0, lsl #2]  ; r2 = section[em[0x72fc]] entry-ptr array
00082a00: e7d41001  ldrb r1, [r4, r1]         ; r1 = em[0x72fd]
00082a08: e7922101  ldr r2, [r2, r1, lsl #2]  ; r2 = entry-ptr array[em[0x72fd]]
00082a10: e7842003  str r2, [r4, r3]          ; em[0x72f8] = script ptr
```
⇒ **em[0x72fc] = section index (0-based), em[0x72fd] = entry index (0-based), both used directly as array subscripts.** Correction to my earlier note: resolveState's non-special return is `mov r0, r1` (0x826ac) — it returns the slot byte unchanged, not byte-1.

### Fixed-entry dispatch paths in 0x8282c also write the section index [A]
Each checks `*(cmd+0x68+4*sec)` non-null (i.e. the section's array exists), then sets em[0x72fc]=sec and em[0x72f8]=**entry 0**:
- sec 13: `ldrne r1,[r0,#52]` (0x82878, [cmd+0x9c]=0x68+4*13), `strh #13` 0x8288c, `ldr r0,[r0,#52]` 0x82890 → 0x82934 `ldr r0,[r0,#0]` → em[0x72f8].
- sec 8: `ldrne r2,[r1,#32]` (0x828dc, [cmd+0x88]=0x68+4*8), `strh #8` 0x828f0.
- sec 14: `ldrne r2,[r1,#56]` (0x82918, [cmd+0xa0]=0x68+4*14), `strh #14` 0x8292c.
- sec 19: `ldr r0,[r1,#-232]` (0x82aa8 → em[0x72f4]), `ldr r2,[r0,#76]` (0x82abc, [cmd+0xb4]=0x68+4*19), `strh #19` 0x82ae4.
- guarded/pool path: `strb r1,[r6,r0]!` 0x82998 with r1=1, r0=0x72fc ⇒ em[0x72fc]=**1**, em[0x72fd]=bl 0xb4e58(em,1) (0x829a4) ⇒ section 1 entry = runtime pool pick.
- suspected sec 9 path at 0x82a4c-0x82a58: `ldr r0,[r7,#0x72f4]` then `ldrne r0,[r0,#36]` ([cmd+0x8c]=0x68+4*9) — array loaded but not yet seen consumed (continued below).

### The interpreter does not read the section index — it runs em[0x72f8] [A]
Interpreter loop: `ldr r0,[r4,#0]` (ip), length 0x50ce0, op dispatch (0x83788-0x837a8); end branch 0x83d80 checks `*ip==0xff` twice then `bl 0x8282c` (0x83dac) with r1=1 — i.e. **on script end the dispatcher 0x8282c picks the next (section, entry)**. Wrapper 0x82f54 stores result and optionally zeroes em[0x72f0]. The interpreter body itself never touches em[0x72fc]; the fields are only read/written by (a) dispatcher 0x8282c, (b) opcode handlers / AI helpers that write the triple (scan below), (c) resolveState 0x825fc which walks the section byte to find where to save/restore it.

### (section, entry) writer patterns outside 0x8282c [A]
- 0x8b7c0 area — pending-stack save then section 1 (pool resume):
```
0008b7c0: eb00a5a4  bl 0xb4e58            ; pool pick
0008b7d8: e7f21001  ldrb r1, [r2, r1]!    ; r1 = em[0x734c] (pending depth)
0008b7f0: e7da2002  ldrb r2, [r10, r2]    ; r2 = em[0x72fc]
0008b7f8: e7c12003  strb r2, [r1, r3]     ; pending[k] = {sec, entry, ip...} at em+0x7350+8k
0008b834: e30722fc  movw r2, #0x72fc
0008b838: e3a03001  mov r3, #1
0008b83c: e7ca3002  strb r3, [r10, r2]    ; em[0x72fc] = 1  (SECTION 1)
0008b844: e7ca0002  strb r0, [r10, r2]    ; em[0x72fd] = entry
0008b84c: e5911004  ldr r1, [r1, #4]      ; r1 = section-1 array ([cmd+0x6c])
0008b850: e7911100  ldr r1, [r1, r0, lsl #2]
0008b854: e78a1002  str r1, [r10, r2]     ; em[0x72f8] = entry script
```
- 0x8f690 area — section 2 with a LOCAL script buffer (not cmdtbl):
```
0008f68c: eb0095f1  bl 0xb4e58
0008f694: e3a02002  mov r2, #2
0008f69c: e7c42001  strb r2, [r4, r1]     ; em[0x72fc] = 2  (SECTION 2)
0008f6a4: e7c45001  strb r5, [r4, r1]     ; em[0x72fd] = r5
0008f6ac: e0842001  add r2, r4, r1        ; r1 = 0xba34
0008f6b0: e7842003  str r2, [r4, r3]      ; em[0x72f8] = em+0xba34 (enemy-local buffer!)
```
⇒ em[0x72f8] may point into the enemy object (built-in park/stop script), decoupled from cmdtbl; em[0x72fc]=2 here is the section id recorded for state save/restore, not a cmdtbl subscript in this path. Needs the fuller window (r5 provenance) — in progress.


### Loader 0x520a0 object layout — 21 section arrays confirmed [A]
- Magic check at 0x52138-0x5215c: `movw r1,#0x4d45; movt r1,#0x43` ("EMC\0" LE) and version 0x20120804; buffer copy stored at obj+0x64 (0x52190 `str r0,[r1,#100]`).
- Section loop bound: `00052348: e35a0015 cmp r10, #21` — exactly 21 iterations (s = 0..20).
- Per section: alloc (count+1)*4 bytes (`mov r0,#4; umull` @0x521e4-0x521e8), store ptr:
```
00052208: e081110a  add r1, r1, r10, lsl #2   ; r1 = obj + 4*s
0005220c: e5a10068  str r0, [r1, #104]!       ; obj[0x68+4*s] = section-s entry-ptr array
```
- Fill: each slot i = `file_base + entry[i].offset` (script ptr), last slot null. r6 walks section descriptors with `ldr r8, [r6, r10, lsl #4]!` (0x521d4, 16 B stride).
- ⇒ rEnemyCmd (0xC0 B) = {+0x64 file copy, +0x68..0xBC = 21 section-array ptrs}. Note cmd+0x6c = section **1**'s array ptr and cmd+0x78 = section **4**'s array ptr under this layout — so emc.md's accessor line "0x51d70(cmd,i) = [cmd+0x78][i] bounded by [cmd+0x6c]" cannot describe the rEnemyCmd EMC object as loaded here (pointer-as-bound is nonsense); 0x51d70 must belong to a different object or emc.md's line is stale. Its call site 0x6852c passes em[0x2588] and reads result as {+8 count, +20 ptr} — structured data, not script bytes. Not central to the section question; flagged for emc.md correction.

## Unknown

## SelfFalsificationCheck

## Difficulties
