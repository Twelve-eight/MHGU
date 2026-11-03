# W5 — closeout of the two open ledger items (W4-PH7, W4-RF3)

Date: 2026-11-04. Closes the last two `open` rows of `docs/analysis/audit/LINK-STATUS.tsv` that this
wave owns. Both rows are documents that stated values the image contradicts; every corrected value
below was re-derived from `main.140.flat.bin` (flat = vaddr + 0x100; vaddr = flat - 0x100) or re-read
in the cited file, and the command that produced it is quoted. The two audit reports
(`W4-PATCHES-HISTORY.md`, `W4-REFERENCE.md`) stay unchanged as the audit record; the dispositions are
in `LINK-STATUS.tsv`.

Edited files:

| file | change |
|---|---|
| `docs/patches/item-box-v7-plugin-spec.md` | row #5 end-pointer formula; §3 hook count 103; 26 clone cells set to the probe `B`; 11 `is_block` rows changed to `emulate`; §5 cites the committed probe |
| `docs/reference/re-guide-gu.md` | CLI synopsis + `lits` arity; 4.28% `.word` figure; Wind strings; hunter-status pair; rage fan-out; 65,740 writeback |
| `docs/reference/re-example-dttune-consumer.md` | CLI synopsis + absolute `.tmp` path (two commands); caller range; copy-out function boundary; hand-over table |
| `docs/reference/formats/rem.md` | the two `loc\quest\…` patterns moved to their real pool |
| `docs/reference/suyu/README.md` | immediate-emission citation `forge_pc.h:229-231` -> `a32_to_c.h:181-189` |
| `docs/reference/SUBAGENT-LEDGER.md` | `HANDOFF.md:201` -> `:230`; `508行` -> `514行` |
| `docs/analysis/audit/LINK-STATUS.tsv` | W4-PH7 and W4-RF3 `open` -> `fixed` |

Not re-audited: `patch/1.4.0.pchtxt` and the 123-row table (W4-PH7 already verified 123/123 offsets
and 0 original/patched word mismatches). The F1/F2 P2 defects of `W4-REFERENCE.md` were already fixed
in commit `4a56413` and were not open in this wave.

---

## 1. Item A — W4-PH7, the box patch spec's hook grouping

### A1. Hook count: 103, not "likely 50-70"

The committed run log's own summary, and a recount from its per-row lines:

```
$ grep '^\[5\]' docs/patches/runs/boxprobe-20261024.txt
[5] summary: words matched 123/123, block starts 123/123, distinct B 103, missing B 0
```

Recount over `[2]` (site, `is_block`) and `[3]` (site -> `B`) with a node one-liner; its values,
condensed:

```
rows 123 | block-start rows 25 | interior rows 98 | distinct B 87
distinct B that are also block-start sites 9 | union of hook targets 103
interior rows whose B is a block-start site 11
```

So the union is 103: 25 hooks at block-start sites (an `emulate`, or `replace-fn` for #23) plus
87 - 9 = 78 `clone` hooks. The audit's arithmetic is confirmed, and the spec's estimate was wrong
because a function entry is not the block that contains the site: an inner `bl` starts a new block.

Edit: `docs/patches/item-box-v7-plugin-spec.md` §3 consequence 2 now states 103 = 25 + 78 and cites
`docs/patches/runs/boxprobe-20261024.txt`; §5 notes that a run of the prescribed probe is committed.

### A2. 26 rows named a clone address that cannot reach the site

Comparison of every `clone` address in the table against the probe's `B`:

```
before the edits: clone rows with an address 55, interior mismatches 26; after the edits: 0 mismatches
#10 0x19a4ec -> 0x19a544   #11 0x19a55c -> 0x19a5bc   #12 0x19aaec -> 0x19aafc
#18 0x19a8d8 -> 0x19a8ec   #21 0x19aa88 -> 0x19aa98   #26 0x198f04 -> 0x198f1c
#41 0x199ae4 -> 0x199b4c   #42 0x199ae4 -> 0x199bd0   #55 0x199ae4 -> 0x199bf8
#56 0x199ae4 -> 0x199c98   #58 0x199ae4 -> 0x199b04   #59 0x199ae4 -> 0x199bf8
#62 0x198bb0 -> 0x198be4   #63 0x198c74 -> 0x198c7c   #78 0x19a8d8 -> 0x19a8ec
#79 0x198bb0 -> 0x198be4   #80 0x198c74 -> 0x198c7c   #90 0x19a854 -> 0x19a878
#94 0x19b110 -> 0x19b198   #97 0x19b360 -> 0x19b368  #103 0x19abe0 -> 0x19abf0
#110 0x19a7f8 -> 0x19a808  #113 0x19b110 -> 0x19b124  #114 0x198bb0 -> 0x198bc4
#115 0x19b360 -> 0x19b430  #119 0x19abe0 -> 0x19abf0
```

Exactly the audit's 26. Three are corroborated statically (an inner `bl` ends the block before the
site, so the named function entry cannot be the clone):

```
$ node tools/mhgu/arm32.mjs 0x199AE4 42   # #41 site 0x199B68: bl 0x525878 @0x199B48, block 0x199B4C..0x199B70
$ node tools/mhgu/arm32.mjs 0x198BB0 26   # #62 site 0x198C00: bl 0x887810 @0x198BE0, block starts 0x198BE4
$ node tools/mhgu/arm32.mjs 0x19A8D8 20   # #18 site 0x19A8F4: bl 0x7af3a0 @0x19A8E8, block starts 0x19A8EC
```

Edit: the 26 strategy cells now read `clone` at the probe `B` (with the function entry kept as the
descriptive anchor); share notes were corrected to the rows that actually share a `B`
(#18/#78, #55/#59, #62/#79, #63/#80, #103/#119).

The same probe also settles the 11 rows the audit listed as "block starts themselves"
(#57, #61, #65, #71, #83, #84, #87, #88, #100, #105, #106). Their cells said `clone` at an earlier
address, which would never execute the site, so they are now `emulate` at the site with the probe's
`is_block` result. Two are visible statically:

```
$ node tools/mhgu/arm32.mjs 0x199D6C 12   # #57 site 0x199D84 follows bl 0x525878 @0x199D80
$ node tools/mhgu/arm32.mjs 0x19AA88 10   # #84 site 0x19AA98 follows bl 0x7af3a0 @0x19AA94
```

### A3. Row #5: `0x1A+4*N-2`, i.e. 0x2408 for N = 2300

```
$ node tools/mhgu/arm32.mjs 0x198FE0 26
00198fe8: e92d4830  push {r4, r5, r11, lr}
00198fec: e3022408  movw r2, #0x2408
00198ff8: e0803002  add r3, r0, r2
00199000: e15340b2  ldrh r4, [r3, #-2]
00199034: e2433004  sub r3, r3, #4
```

`r3 = r0 + 0x2408`, and the scan reads `[r3,#-2]` (the id half of the last record) before stepping
back 4. The record end is therefore `0x1A + 4*2300 = 0x240A`, and the constant added is that minus 2:
`0x2408`. The spec's row #5 now says `0x1A+4*N-2` and names the two instructions.

---

## 2. Item B — W4-RF3, the eleven P3 defects

| # | where | before -> after | command |
|---|---|---|---|
| B1 | `re-guide-gu.md:8`, `re-example-dttune-consumer.md:14,30` | `disasm\|words\|calls\|lits\|fn <vaddr> [n]` -> per-verb synopsis with `lits <start> <end> <value> [value...]`; `node ".tmp/re-cli.mjs"` -> `node "G:/omp works/.tmp/re-cli.mjs"` | see below |
| B2 | `re-example-dttune-consumer.md:101,134` | `0x574A0..0x57990 (directly after the magic check)` -> copy-out fn `0x57068` (`0x574a0..0x57594`), loader `0x57740` is the next function, magic at `0x5776c` | prologue scan + disasm |
| B3 | `re-guide-gu.md:26` | `hunter status 0x9D6F8, thresholds 200/180/150` -> thresholds in `0x9D8B4` (`0x9DA44/0x9DA94/0x9DAB8`) | prologue scan + disasm |
| B4 | `re-guide-gu.md:28` | `0x1069d8c -> 0x106aef0 -> 0x1068dd8 -> 0x106b04c` -> dispatcher calls all three; `0x106aef0` never references `0x1068dd8` | bl scan |
| B5 | `re-guide-gu.md:17` | `14% of .text` -> `4.28%` (223,669 of 5,228,277), 65,738 = 1.26% today | commit message + count |
| B6 | `re-guide-gu.md:63` | `43,353` -> `65,740` writeback words (`(bits 27-26)==01 && (P==0 \|\| W==1)`, `.text` 0x0..0x13F2000) | count |
| B7 | `re-guide-gu.md:19` | "no wind/Wind/HDE strings" -> mechanic names 0 times; `Wind` 128x, `wind` 8x in unrelated SDK/particle words | byte scan |
| B8 | `re-example-dttune-consumer.md:77` | `0xcf0658..0x1057fe8` -> `0xcf0a40..0x10581f0` | `calls 0xbfca8` |
| B9 | `formats/rem.md:119-121` | two `loc\quest\…` paths in "pool 0x155c9f3+" -> `0x1563ab7` / `0x1563adf`; the pool's own `quest\questData\questData_` named separately | `str()` reads |
| B10 | `suyu/README.md` | `forge_pc.h:229-231` for "immediates baked into the C" -> `a32_to_c.h:181-189` (`MoveWide`, `:187`); the `forge_pc.h` lines attached to the byte-patch warning they actually state | `sed -n` of both files |
| B11 | `SUBAGENT-LEDGER.md:10,33` | `508行` -> `514行`; `HANDOFF.md:201` -> `HANDOFF.md:230` | `wc -l`, `awk` |

B1 — the two-argument form does not error, it returns a silent negative; the five-argument form works:

```
$ node .tmp/re-cli.mjs lits 0x286000 0x13c4      # end = 0x13c4, i.e. an empty range
0 hit(s)
$ node .tmp/re-cli.mjs lits 0x286000 0x287000 0x13c4
11 hit(s)
$ cd MHGU && node .tmp/re-cli.mjs disasm 0x57740 4
Error: Cannot find module 'G:\omp works\MHGU\.tmp\re-cli.mjs'
```

B2 — function boundary, from a prologue scan over `0x57000..0x57768`
(`(w & 0xFFFF4000) >>> 0 == 0xE92D4000`):

```
0x57068  0x57740
$ node tools/mhgu/arm32.mjs 0x57490 20   # 0x574a0 cmp/ldrb [r8,#276]; 0x574b4 bl 0x827cd0 (16 B write)
$ node tools/mhgu/arm32.mjs 0x57740 14   # 0x57740 push; 0x5776c movw r1,#0x5444 ("DTT\0")
```

B3 — the same scan over `0x9d600..0x9da44` gives `0x9d67c 0x9d6f8 0x9d8b4`; the thresholds are
`0x9da44 cmp r10,#200`, `0x9da94 cmp r10,#180`, `0x9dab8 cmp r10,#150`, all inside `0x9d8b4`.

B4 — a `bl` scan over the image finds exactly four sites for the three stages:

```
0x1068784 bl -> 0x1068dd8
0x1069dd0 bl -> 0x106aef0
0x106a4c4 bl -> 0x1068dd8
0x106a4fc bl -> 0x106b04c
```

Only `0x106a4c4` (inside the dispatcher) calls `0x1068dd8` besides `0x1068784`; `0x106aef0` has no
reference to it.

B5 — the fix commit's own message and the two counts:

```
$ git show -s --format=%s 0508f0e
arm32.mjs: ... recovers 157931 of 223669 .word in main 1.4.0 .text
223669/5228277 = 4.28%
raw .word today (decode over TEXT_END 0x13F1DEC): 65738 1.26%
```

B6 — count over `.text` with `rd32` (so the +0x100 shift is applied); the numbers reproduce the
audit's variants exactly:

```
{ writeback: 65740, P0: 26084, W1: 60186, LDRonly: 41707, wordOnly: 33109 }
```

Note the window: over the decoder's `TEXT_END` 0x13F1DEC the count is 65,718; 0x13F2000 is the
`.rodata` start and the `.text` boundary the guide cites. None of the six counts is 43,353.

B7 — byte scan of the image: `Wind` 128, `wind` 8, `HDE` 0, `Windproof` 0, `Earplug` 0, `Tremor` 0.
The occurrences are SDK/particle words (`GetWindowSize`, `NativeWindow`, `cWind`,
`__aeabi_unwind_cpp_pr0`), so the operational advice ("do not search English mechanic names") holds.

B8 — `node "G:/omp works/.tmp/re-cli.mjs" calls 0xbfca8` -> `41 direct-call hit(s)`, first
`0xcf0a40`, last `0x10581f0`.

B9 — the pool at `0x155c9f3` reads `quest\questData\questData_`, followed by `quest\boss\setEmMain\`,
`quest\zako\emSetList\`, `quest\rem\`, `quest\supp\`, `quest\plus\questPlus_`. The two `loc\`-prefixed
patterns are elsewhere: `0x1563ab7` = `loc\quest\questData\questData_%07d`, `0x1563adf` =
`loc\quest\questLink\questLink_%07d`.

B10 — `a32_to_c.h:181-189` is the `// MOVW / MOVT` block; line 187 is
`else t.body = F("c->r[%u] = 0x%08Xu;", Rd, imm);`. The audit cited `183-192`, which is two lines low
(the block starts at 181). `forge_pc.h:229-231` is the comment "Changing code bytes in guest memory
does NOT change the recompiled game: use hooks for code", i.e. the *first* sentence of the README
bullet, not the immediate-emission fact. Both citations are now in place.

B11 — `HANDOFF.md:201` is `tools/mhgu/ ← 可复现工具链 + README`; the
「每 30 个 append 落盘」rule is `HANDOFF.md:230`. `wc -l docs/analysis/members/member4-17-layout.md`
= 514. The audit's own line pins for this defect (`SUBAGENT-LEDGER.md:36,12`) were off: the two texts
sit at lines 33 and 10, which is where the edit was made.

---

## 3. Gate

```
$ node tools/audit/check.mjs        (abridged)
note 27 doc(s) exist but are not in the frozen manifest (new since 2026-11-03)
PASS manifest covers 214 docs, all present
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv
PASS save-side structural formula uses the member length, not the end offset
PASS database foreign keys: 2621 known violations only, 0 real orphans
ALL PASS
```

Gate 4 runs `coverage/report.mjs`, which rewrites `docs/analysis/code/inventory/coverage-report.tsv`.
The file was copied to `G:/tmp/W5/coverage-report.before.tsv` before the run and is byte-identical
after it (`sha256 59f419dc…`), so the run left no regenerated tracked file behind. The gate's
"docs not in the frozen manifest" line is a note, not a failure.

## 4. Reproduction commands

Run from `G:/omp works/MHGU`; the arm32 helpers apply the flat `+0x100` shift themselves.

```
$ node -e 'const fs=require("fs");const L=fs.readFileSync("docs/patches/runs/boxprobe-20261024.txt","utf8").split(/\r?\n/);const R={};for(const l of L){let m=l.match(/^\[2\] row (\d+) site main\+0x([0-9a-f]+) is_block (\d)/);if(m)R[+m[1]]={site:parseInt(m[2],16),block:+m[3]};m=l.match(/^\[3\] row (\d+): B main\+0x([0-9a-f]+)/);if(m)R[+m[1]].B=parseInt(m[2],16);}const bs=Object.values(R).filter(v=>v.block===1).map(v=>v.site);const it=Object.values(R).filter(v=>v.block===0);const B=new Set(it.map(v=>v.B));console.log("rows",Object.keys(R).length,"block",bs.length,"interior",it.length,"distinctB",B.size,"B-in-block",[...B].filter(x=>bs.includes(x)).length,"union",new Set([...B,...bs]).size,"interior-on-block",it.filter(v=>bs.includes(v.B)).length);'
rows 123 block 25 interior 98 distinctB 87 B-in-block 9 union 103 interior-on-block 11

$ node -e 'const {execSync}=require("child_process");const fs=require("fs");const old=execSync("git show HEAD:docs/patches/item-box-v7-plugin-spec.md",{encoding:"utf8"}).split(/\r?\n/);const log=fs.readFileSync("docs/patches/runs/boxprobe-20261024.txt","utf8").split(/\r?\n/);const R={};for(const l of log){let m=l.match(/^\[2\] row (\d+) site main\+0x([0-9a-f]+) is_block (\d)/);if(m)R[+m[1]]={block:+m[3]};m=l.match(/^\[3\] row (\d+): B main\+0x([0-9a-f]+)/);if(m)R[+m[1]].B=parseInt(m[2],16);}const out=[];for(const l of old){const m=l.match(/^\| *(\d+) *\| *`0x[0-9A-Fa-f]+` *\|/);if(!m)continue;const n=+m[1];const c=l.split("|");if(c.length!==9)continue;const cm=c[6].trim().match(/clone`? at (?:fn )?`0x([0-9A-Fa-f]+)`/);if(cm&&R[n]&&R[n].block===0&&parseInt(cm[1],16)!==R[n].B)out.push("#"+n+" 0x"+parseInt(cm[1],16).toString(16)+" -> 0x"+R[n].B.toString(16));}console.log("mismatches:",out.length);console.log(out.join("\n"));'
mismatches: 26   (HEAD is the pre-edit spec until this wave is committed; then it prints 0)

$ node -e 'const b=require("fs").readFileSync("main.140.flat.bin");const out=[];for(let v=0x57000;v<0x57768;v+=4){const w=b.readUInt32LE(v+0x100)>>>0;if(((w&0xFFFF4000)>>>0)===0xE92D4000)out.push("0x"+v.toString(16))}console.log(out.join(" "))'
0x57068 0x57740

$ node -e 'const b=require("fs").readFileSync("main.140.flat.bin");const out=[];for(let v=0x9d600;v<0x9da44;v+=4){const w=b.readUInt32LE(v+0x100)>>>0;if(((w&0xFFFF4000)>>>0)===0xE92D4000)out.push("0x"+v.toString(16))}console.log(out.join(" "))'
0x9d67c 0x9d6f8 0x9d8b4

$ node -e 'import("./tools/mhgu/arm32.mjs").then(({rd32})=>{let wb=0,p0=0,w1=0,L=0,wd=0;for(let a=0;a<0x13F2000;a+=4){const w=rd32(a)>>>0;if(((w>>>26)&3)!==1)continue;const P=(w>>>24)&1,B=(w>>>22)&1,W=(w>>>21)&1,l=(w>>>20)&1;if(P===0||W===1){wb++;if(P===0)p0++;if(W===1)w1++;if(l)L++;if(B===0)wd++;}}console.log({wb,p0,w1,L,wd});})'
{ wb: 65740, p0: 26084, w1: 60186, L: 41707, wd: 33109 }

$ node -e 'import("./tools/mhgu/arm32.mjs").then(({decode,rd32,TEXT_END})=>{let n=0;for(let a=0;a<TEXT_END;a+=4)if(decode(rd32(a),a).startsWith(".word"))n++;console.log(n,(n/5228277*100).toFixed(2)+"%")})'
65738 1.26%

$ node -e 'const s=require("fs").readFileSync("main.140.flat.bin").toString("latin1");for(const n of ["Wind","wind","HDE","Windproof","Earplug","Tremor"]){let c=0,i=0;while((i=s.indexOf(n,i))>=0){c++;i++;}console.log(n,c)}'
Wind 128 / wind 8 / HDE 0 / Windproof 0 / Earplug 0 / Tremor 0   (one per line)

$ node -e 'console.log((223669/5228277*100).toFixed(2))'
4.28

$ node -e 'const b=require("fs").readFileSync("main.140.flat.bin");const s=v=>{let o=v+0x100,r="";for(let c;(c=b[o++]);)r+=String.fromCharCode(c);return r};for(const v of [0x155c9f3,0x1563ab7,0x1563adf])console.log("0x"+v.toString(16),JSON.stringify(s(v)))'
0x155c9f3 "quest\\questData\\questData_"
0x1563ab7 "loc\\quest\\questData\\questData_%07d"
0x1563adf "loc\\quest\\questLink\\questLink_%07d"

```

The memory-read commands (`node tools/mhgu/arm32.mjs <vaddr> <count>`, `re-cli.mjs calls 0xbfca8`)
are quoted in their sections.

---

## VERDICT
W4-PH7/A1	fixed	spec section 3 now states 103 hooks (25 emulate + 78 clone) from the committed probe's 25 is_block sites, 87 distinct B and 9 B that are block starts; §5 cites the run
W4-PH7/A2	fixed	all 26 interior clone cells now name the probe B (comparison re-run: 0 mismatches), the 7 false share notes are corrected (the two real ones, #79/#62 and #80/#63, stay), and the 11 is_block rows now say emulate
W4-PH7/A3	fixed	row #5 states 0x1A+4*N-2 = 0x2408, with 0x198FEC movw #0x2408, 0x198FF8 add r3,r0,r2 and 0x199000 ldrh [r3,#-2]
W4-RF3/B1	fixed	re-guide-gu:8 and re-example:14,30 give the per-verb synopsis and the absolute .tmp path; lits 0x286000 0x13c4 prints 0 hit(s) while the five-argument form prints 11
W4-RF3/B2	fixed	re-example:101,134 name fn 0x57068 as the copy-out (0x574a0..0x57594) and 0x57740 as the loader with the magic check at 0x5776c; prologue scan 0x57000..0x57768 = [0x57068, 0x57740]
W4-RF3/B3	fixed	thresholds are in fn 0x9d8b4 (cmp r10,#200/#180/#150 at 0x9da44/0x9da94/0x9dab8); prologue scan 0x9d600..0x9da44 = [0x9d67c, 0x9d6f8, 0x9d8b4]
W4-RF3/B4	fixed	0x1069d8c calls 0x106aef0, 0x1068dd8 and 0x106b04c at 0x1069dd0/0x106a4c4/0x106a4fc; refs to 0x1068dd8 are only 0x1068784 and 0x106a4c4
W4-RF3/B5	fixed	0508f0e says 223669 .word of 5,228,277 = 4.28%; today's count is 65,738 = 1.26%
W4-RF3/B6	fixed	65,740 ldr/str words use writeback (P==0 or W==1) over .text 0x0..0x13F2000; variants P==0 26,084 / W==1 60,186 / LDR 41,707 / word 33,109
W4-RF3/B7	fixed	byte scan: Wind 128, wind 8, HDE 0, Windproof/Earplug/Tremor 0, so only mechanic-name strings are absent
W4-RF3/B8	fixed	41 callers of 0xbfca8 span 0xcf0a40..0x10581f0 (calls 0xbfca8)
W4-RF3/B9	fixed	0x155c9f3 holds the unprefixed quest paths; loc\quest\questData\questData_%07d is at 0x1563ab7 and loc\quest\questLink\questLink_%07d at 0x1563adf
W4-RF3/B10	fixed	suyu README cites a32_to_c.h:181-189 (MoveWide, :187) for the baked-in immediates and leaves forge_pc.h:229-231 with the byte-patch warning it states
W4-RF3/B11	fixed	member4-17-layout.md is 514 lines and the every-30-append rule is HANDOFF.md:230 (not :201)
gate	fixed	node tools/audit/check.mjs -> ALL PASS; coverage-report.tsv byte-identical before/after (sha256 59f419dc…)
