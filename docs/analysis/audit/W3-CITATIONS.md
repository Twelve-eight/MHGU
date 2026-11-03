# W3 — Citation resolution in `docs/editor-spec/` (W2-ES4) and the Gap 11 drift (W2-ES5)

Date: 2026-11-04. Scope: `docs/editor-spec/01-container-header.md`, `02-items-equipment.md`,
`03-quests-monsters-palico.md`, read-only against their targets. No target document was edited.

## Result

- **W2-ES4 fixed.** The first run of the new resolver resolved 588 references and failed 75: 51 pointed at blank
  lines, 20 at table separators, 4 at code fences. The count is not directly comparable with LINK2 (413
  references / 267 unique pairs; this resolver expands every comma-continued spec and rejects separators too).
  After correction: 582 references, **0 fail**; 119 citation-bearing lines were rewritten, each against a
  re-read target line.
- **W2-ES5 fixed.** The 4 B drift is localized at `char_off 0x5057` (layout row 107), not "somewhere after
  `0x3157`". Three independent byte probes on the published snapshots reject the old wording: medal B decodes at
  `0x316B` and fails at the +4 alternative `0x316F`; the two 12 B bitmap slots are byte-identical at
  `0x507B/0x5087` and not at `0x5077/0x5083`; the kill/capture/size arrays satisfy the small-monster invariants
  only at `0x5EA6` (size-only 9, small-size 0) and not at `0x5EA2` (22 and 1). The Gap 11 paragraph, G18, item 4's
  bitmap coordinates and item 15's range were rewritten to the measured coordinates.
- **Gate:** `node tools/audit/check.mjs` → `ALL PASS`.

## Artifacts

| file | role |
|---|---|
| `tools/audit/check-citations.mjs` | new gate candidate: parses every `file.md:line` / `file.md:a-b` reference, opens the target, prints the line, fails on missing/EOF/blank/fence/separator |
| `tools/audit/drift-gap11.mjs` | new measurement tool for the 4 B insert: medals, 12 B block pair, quest bitmaps, monster arrays, layout tiling |
| `docs/editor-spec/01-container-header.md` | 42 citation lines + Gap 11 rewritten |
| `docs/editor-spec/02-items-equipment.md` | 35 citation lines + G-10 rewritten |
| `docs/editor-spec/03-quests-monsters-palico.md` | 42 citation lines + G17/G18/item 4/item 9/item 15 rewritten |

## What the resolver checks

1. **Resolution.** A bare basename (`coverage-map.md`) is resolved through a recursive index of the repo with a
   fixed precedence (`docs/save-layout` → `docs/mechanics` → `docs/analysis` → `docs/data` → `docs/` → `tools/` →
   root), so the six cited notes that moved to `docs/analysis/` still resolve. A path with `/` must exist as given.
2. **Readability.** The cited line must exist and must not be blank, a code fence, or a table separator. These are
   hard failures. The run prints the first 60 characters of every bad target.
3. **Content.** The citing line's hexadecimal offsets and counted numbers are compared with the target line after
   normalizing `0x0B1`/`0xB1` and `5,159,100`/`5159100`. A miss is a WARN, not a failure: source documents
   frequently support a claim in words without repeating the offset, so the check is advisory. WARN says either
   `NEAR` (a claim token appears within ±3 lines, i.e. a likely neighbouring-row citation) or `IDMISS`.

Command:

```
node tools/audit/check-citations.mjs [spec-dir] [--all] [--json]
```

`spec-dir` defaults to `docs/editor-spec`; the before-run below points it at `.tmp/before-spec/`, which holds the
three files as committed at `HEAD`.

## Resolver — before

```
$ git show HEAD:docs/editor-spec/01-container-header.md > .tmp/before-spec/01-container-header.md   # same for 02/03
$ node tools/audit/check-citations.mjs .tmp/before-spec/
```

FAIL 01-container-header.md:58 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:64 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:65 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:69 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:71 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:72 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 01-container-header.md:73 -> HANDOFF.md:85  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:73 -> write-side-desc.md:335  [SEP] line 335 is a table separator  | |---|---|---|---|---|
FAIL 01-container-header.md:76 -> coverage-map.md:300  [BLANK] line 300 is blank
FAIL 01-container-header.md:77 -> coverage-map.md:334  [BLANK] line 334 is blank
FAIL 01-container-header.md:77 -> write-side-desc.md:357-358  [BLANK] line 357 is blank
FAIL 01-container-header.md:78 -> coverage-map.md:334  [BLANK] line 334 is blank
FAIL 01-container-header.md:82 -> HANDOFF.md:85-86  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:86 -> coverage-map.md:199-210  [BLANK] line 199 is blank
FAIL 01-container-header.md:87 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:105 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 01-container-header.md:108 -> coverage-map.md:272-273  [BLANK] line 272 is blank
FAIL 01-container-header.md:108 -> write-side-desc.md:530-532  [BLANK] line 530 is blank
FAIL 01-container-header.md:121 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:129 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:132 -> HANDOFF.md:85-86  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:134 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:137 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 01-container-header.md:137 -> social-checksum.md:293-295  [SEP] line 293 is a table separator  | |---|---|---|
FAIL 01-container-header.md:138 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:140 -> write-side-desc.md:365-370  [BLANK] line 365 is blank
FAIL 01-container-header.md:152 -> member4-header.md:240  [BLANK] line 240 is blank
FAIL 01-container-header.md:155 -> coverage-map.md:353  [BLANK] line 353 is blank
FAIL 01-container-header.md:156 -> HANDOFF.md:188  [FENCE] line 188 opens/closes a code fence  | ```
FAIL 02-items-equipment.md:76 -> equipment.md:411  [SEP] line 411 is a table separator  | |---|---|---|---|---|
FAIL 02-items-equipment.md:76 -> equipment.md:584  [BLANK] line 584 is blank
FAIL 02-items-equipment.md:82 -> equipment.md:573-576  [BLANK] line 573 is blank
FAIL 02-items-equipment.md:90 -> equipment.md:396  [SEP] line 396 is a table separator  | |---|---|---|---|---|
FAIL 02-items-equipment.md:90 -> coverage-map.md:106  [BLANK] line 106 is blank
FAIL 02-items-equipment.md:98 -> coverage-map.md:108  [SEP] line 108 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:98 -> DEVELOP.md:519  [BLANK] line 519 is blank
FAIL 02-items-equipment.md:101 -> equipment.md:533  [BLANK] line 533 is blank
FAIL 02-items-equipment.md:113 -> DEVELOP.md:228  [SEP] line 228 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:125 -> DEVELOP.md:228  [SEP] line 228 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:161 -> coverage-map.md:102-103  [BLANK] line 102 is blank
FAIL 02-items-equipment.md:167 -> equipment.md:533  [BLANK] line 533 is blank
FAIL 02-items-equipment.md:168 -> DEVELOP.md:217  [SEP] line 217 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:181 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 02-items-equipment.md:184 -> DEVELOP.md:519  [BLANK] line 519 is blank
FAIL 02-items-equipment.md:199 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:31 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:52 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:63 -> contradictory-bits-verdict.md:24  [BLANK] line 24 is blank
FAIL 03-quests-monsters-palico.md:64 -> contradictory-bits-verdict.md:24  [BLANK] line 24 is blank
FAIL 03-quests-monsters-palico.md:68 -> contradictory-bits-verdict.md:27  [BLANK] line 27 is blank
FAIL 03-quests-monsters-palico.md:87 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:87 -> coverage-map.md:248  [BLANK] line 248 is blank
FAIL 03-quests-monsters-palico.md:102 -> coverage-map.md:192  [BLANK] line 192 is blank
FAIL 03-quests-monsters-palico.md:102 -> coverage-map.md:388  [BLANK] line 388 is blank
FAIL 03-quests-monsters-palico.md:110 -> coverage-map.md:388  [BLANK] line 388 is blank
FAIL 03-quests-monsters-palico.md:115 -> coverage-map.md:390  [BLANK] line 390 is blank
FAIL 03-quests-monsters-palico.md:130 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:170 -> coverage-map.md:234-243  [BLANK] line 234 is blank
FAIL 03-quests-monsters-palico.md:179 -> coverage-map.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:188 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:193 -> coverage-map.md:390-391  [BLANK] line 390 is blank
FAIL 03-quests-monsters-palico.md:202 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:212 -> DEVELOP.md:217  [SEP] line 217 is a table separator  | |---|---|---|---|
FAIL 03-quests-monsters-palico.md:225 -> member4-semantics.md:39-48  [BLANK] line 39 is blank
FAIL 03-quests-monsters-palico.md:238 -> member4-semantics.md:257-263  [SEP] line 257 is a table separator  | |---|---|---|---|---|---|---|
FAIL 03-quests-monsters-palico.md:267 -> coverage-map.md:295  [SEP] line 295 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:269 -> coverage-map.md:258-263  [BLANK] line 258 is blank
FAIL 03-quests-monsters-palico.md:271 -> HANDOFF.md:128  [BLANK] line 128 is blank
FAIL 03-quests-monsters-palico.md:276 -> member4-semantics.md:39-48  [BLANK] line 39 is blank
FAIL 03-quests-monsters-palico.md:277 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:278 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:278 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:279 -> coverage-map.md:265  [BLANK] line 265 is blank
FAIL 03-quests-monsters-palico.md:283 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:283 -> coverage-map.md:334  [BLANK] line 334 is blank

resolved 588 references: 386 ok, 127 warn, 75 fail
failures by kind: SEP 20, BLANK 51, FENCE 4
CITATION CHECK FAILED

## Resolver — after

```
$ node tools/audit/check-citations.mjs
```

resolved 582 references: 487 ok, 95 warn, 0 fail
CITATION CHECK PASSED

The 95 advisory WARNs are 35 `NEAR` and 60 `IDMISS`. None points at a blank line, fence, separator or past-EOF
line; they are citations where the source line supports the claim in prose instead of repeating the offset
(e.g. `DEVELOP.md:60` says "36 B header + 3 slot blocks" for `0x0000..0x0023`), or where the source uses the
decimal form of a hex offset. They are listed in Appendix B for triage and do not fail the gate.

## Corrections (old → new)

119 lines carry a changed citation. The table below is the citation diff of the three files (`git diff` reduced to
the reference groups by `.tmp/refdiff.mjs`, kept out of the repo because it is a one-off diff formatter).

```
### 01-container-header.md
28	HANDOFF.md:41 coverage-map.md:7	->	HANDOFF.md:42 coverage-map.md:7
29	HANDOFF.md:42 tail-containers.md:3	->	HANDOFF.md:43 tail-containers.md:3
31	HANDOFF.md:43	->	HANDOFF.md:44
32	DEVELOP.md:59	->	DEVELOP.md:61
57	DEVELOP.md:57	->	DEVELOP.md:59
58	DEVELOP.md:58	->	DEVELOP.md:60
63	DEVELOP.md:57-58	->	DEVELOP.md:59-60
64	DEVELOP.md:58 coverage-map.md:403	->	DEVELOP.md:60
65	DEVELOP.md:58 social-checksum.md:107-108	->	DEVELOP.md:60 social-checksum.md:107-108
68	HANDOFF.md:41-43 tail-containers.md:3	->	HANDOFF.md:42-44 tail-containers.md:3
69	DEVELOP.md:58 social-checksum.md:125	->	DEVELOP.md:60 social-checksum.md:125
70	DEVELOP.md:59	->	DEVELOP.md:61
71	HANDOFF.md:191 coverage-map.md:374-386	->	HANDOFF.md:220 coverage-map.md:377-384
72	DEVELOP.md:243 HANDOFF.md:107	->	HANDOFF.md:108
73	coverage-map.md:297 CURRENT-RULING.md:58 HANDOFF.md:85 write-side-desc.md:335	->	coverage-map.md:312 CURRENT-RULING.md:58 HANDOFF.md:86 write-side-desc.md:336
74	coverage-map.md:298 systems.md:871 write-side-desc.md:336	->	coverage-map.md:313 systems.md:871 write-side-desc.md:337
75	coverage-map.md:299 systems.md:872 write-side-desc.md:337	->	coverage-map.md:314 systems.md:872 write-side-desc.md:338
76	coverage-map.md:300 systems.md:873 CURRENT-RULING.md:58 write-side-desc.md:338	->	coverage-map.md:315 systems.md:873 CURRENT-RULING.md:58 write-side-desc.md:339
77	coverage-map.md:334 write-side-desc.md:342, 357-358	->	coverage-map.md:337 write-side-desc.md:356-362
78	coverage-map.md:301, 334 systems.md:874 write-side-desc.md:339	->	coverage-map.md:316 systems.md:874 write-side-desc.md:340
79	write-side-desc.md:340, 470	->	write-side-desc.md:341, 475
80	coverage-map.md:301-318	->	coverage-map.md:310-319
81	write-side-desc.md:341 social-checksum.md:87-88	->	write-side-desc.md:342 social-checksum.md:87-88
82	coverage-map.md:333 HANDOFF.md:85-86	->	coverage-map.md:336 HANDOFF.md:86-87
83	write-side-desc.md:343-346	->	write-side-desc.md:344-347
84	coverage-map.md:333	->	coverage-map.md:336
85	write-side-desc.md:348	->	write-side-desc.md:349
86	HANDOFF.md:87-103 coverage-map.md:199-210	->	HANDOFF.md:87-103 coverage-map.md:200-211
87	HANDOFF.md:103 coverage-map.md:268-299, 374-386	->	HANDOFF.md:103 coverage-map.md:268-299, 377-384
105	coverage-map.md:303 write-side-desc.md:407-413	->	coverage-map.md:306 write-side-desc.md:412-413
108	coverage-map.md:272-273, 268-299 write-side-desc.md:530-532	->	coverage-map.md:275-277, 268-299 write-side-desc.md:529-531
120	HANDOFF.md:191	->	HANDOFF.md:220
121	coverage-map.md:374-386	->	coverage-map.md:377-384
129	DEVELOP.md:58 social-checksum.md:200, 284-285	->	DEVELOP.md:60 social-checksum.md:200, 284-285
132	coverage-map.md:301-334 HANDOFF.md:85-86	->	coverage-map.md:310-319 HANDOFF.md:86-87
134	coverage-map.md:268-299, 374-386	->	coverage-map.md:268-299, 377-384
137	DEVELOP.md:243 HANDOFF.md:107 social-checksum.md:293-295	->	HANDOFF.md:108 social-checksum.md:294
138	HANDOFF.md:191 coverage-map.md:374-386	->	HANDOFF.md:191 coverage-map.md:377-384
140	write-side-desc.md:340, 365-370	->	write-side-desc.md:341, 370-375
152	member4-header.md:240 member4-header.md:165	->	member4-header.md:245 member4-header.md:170
155	coverage-map.md:353 coverage-map.md:403 coverage-map.md:406	->	coverage-map.md:356 coverage-map.md:406 coverage-map.md:409
156	HANDOFF.md:188	->	coverage-map.md:411-415 HANDOFF.md:217

### 02-items-equipment.md
75	equipment.md:410,445-448,583	->	equipment.md:412,447-450,585
76	equipment.md:411,584	->	equipment.md:413,438-439
77	equipment.md:412-413,252-258,583-584	->	equipment.md:414-415,252-258,585-586
78	equipment.md:414-415,586	->	equipment.md:416-417,588
79	equipment.md:416-418,290-298	->	equipment.md:418-420,290-298
81	equipment.md:419-430,589	->	equipment.md:421-430,589
82	equipment.md:429,573-576	->	equipment.md:431,575-577
83	equipment.md:429,510-512,640	->	equipment.md:431,510-512,640
84	equipment.md:445,577	->	equipment.md:447,579
90	equipment.md:14,396,401-402 coverage-map.md:106	->	equipment.md:14,398 coverage-map.md:119
91	equipment.md:536-545,633	->	equipment.md:543-547,633
92	equipment.md:545,634	->	equipment.md:547,636
98	equipment.md:397,401 coverage-map.md:30,108 DEVELOP.md:71,519	->	equipment.md:399,403 coverage-map.md:40 DEVELOP.md:71,523
99	CURRENT-RULING.md:52-53 equipment.md:532-533 DEVELOP.md:221	->	CURRENT-RULING.md:52-53 equipment.md:534 DEVELOP.md:221
100	equipment.md:532,534,649	->	equipment.md:534,536,651
101	equipment.md:533,578	->	equipment.md:535,580
102	equipment.md:401 coverage-map.md:105-108	->	equipment.md:403 coverage-map.md:105-108
113	DEVELOP.md:148,228 DEVLOG.md:58-60	->	DEVELOP.md:148,230 DEVLOG.md:58-60
125	equipment.md:397 DEVELOP.md:148,228	->	equipment.md:397 DEVELOP.md:148,230
134	DEVELOP.md:65,160 equipment.md:579	->	DEVELOP.md:65,160 equipment.md:581
143	equipment.md:401 coverage-map.md:105-108 HANDOFF.md:94-95	->	equipment.md:403 coverage-map.md:105-108 HANDOFF.md:94-95
145	CURRENT-RULING.md:52-53 equipment.md:532-533 DEVELOP.md:218,221	->	CURRENT-RULING.md:52-53 equipment.md:534 DEVELOP.md:218,221
159	equipment.md:536-545,633-634	->	equipment.md:536-547,633-636
160	equipment.md:649 DEVELOP.md:64 coverage-map.md:109 equipment.md:398	->	equipment.md:651 DEVELOP.md:66 coverage-map.md:122 equipment.md:400
161	coverage-map.md:102-103	->	coverage-map.md:114-116
164	equipment.md:651	->	equipment.md:653
165	equipment.md:445,577	->	equipment.md:447,579
166	DEVLOG.md:58 coverage-map.md:107	->	DEVLOG.md:58
167	equipment.md:533 CURRENT-RULING.md:53	->	equipment.md:535 CURRENT-RULING.md:53
168	DEVELOP.md:217	->	DEVELOP.md:203,219
178	coverage-map.md:109 equipment.md:398 HANDOFF.md:94	->	coverage-map.md:122 equipment.md:400 HANDOFF.md:94
181	DEVELOP.md:58 HANDOFF.md:42	->	DEVELOP.md:60 HANDOFF.md:42
183	equipment.md:536-545,633-634	->	equipment.md:536-547,633-636
184	DEVELOP.md:519 coverage-map.md:30 equipment.md:397	->	DEVELOP.md:523 equipment.md:399 coverage-map.md:40
199	DEVELOP.md:58	->	DEVELOP.md:60

### 03-quests-monsters-palico.md
29	HANDOFF.md:41	->	HANDOFF.md:42
30	HANDOFF.md:42-43	->	HANDOFF.md:43-44
31	DEVELOP.md:58	->	DEVELOP.md:60
32	HANDOFF.md:43	->	HANDOFF.md:44
33	quests.md:610	->	quests.md:609
52	coverage-map.md:303,312 quests.md:687	->	coverage-map.md:306,315,337 quests.md:687
63	CURRENT-RULING.md:88 contradictory-bits-verdict.md:12,24 quests.md:670	->	CURRENT-RULING.md:88 contradictory-bits-verdict.md:12,23 quests.md:670
64	CURRENT-RULING.md:89 contradictory-bits-verdict.md:10,24 quests.md:625	->	CURRENT-RULING.md:89 contradictory-bits-verdict.md:10,23 quests.md:625
68	quests.md:627 contradictory-bits-verdict.md:27	->	quests.md:627
87	coverage-map.md:228-243,248	->	coverage-map.md:235-242,245-247
102	coverage-map.md:192,388	->	coverage-map.md:193,392
110	coverage-map.md:355-358,388	->	coverage-map.md:359-361,392
111	coverage-map.md:389	->	coverage-map.md:392
112	coverage-map.md:389	->	coverage-map.md:392
113	coverage-map.md:389	->	coverage-map.md:392
114	coverage-map.md:389	->	coverage-map.md:392
115	coverage-map.md:390	->	coverage-map.md:393
116	coverage-map.md:389	->	coverage-map.md:392
117	coverage-map.md:389	->	coverage-map.md:392
118	coverage-map.md:392 DEVELOP.md:234	->	coverage-map.md:395 DEVELOP.md:234
119	coverage-map.md:391	->	coverage-map.md:394
130	member4-semantics.md:52 skills-arts.md:517,523-525 DEVELOP.md:243	->	member4-semantics.md:52 skills-arts.md:517,523-525 DEVELOP.md:245
139	member4-semantics.md:58 coverage-map.md:296 DEVELOP.md:240	->	member4-semantics.md:58 coverage-map.md:299 DEVELOP.md:240
170	coverage-map.md:234-243	->	coverage-map.md:235-242
179	coverage-map.md:82,243	->	coverage-map.md:82,246
188	skills-arts.md:520-525 DEVELOP.md:243	->	skills-arts.md:520-525 DEVELOP.md:245
193	coverage-map.md:355-358,390-391	->	coverage-map.md:359-361,393-394
202	coverage-map.md:303	->	coverage-map.md:306
212	DEVELOP.md:217,202 quests.md:701	->	DEVELOP.md:219,204 quests.md:701
218	member4-semantics.md:221-222 member4-file-layout.txt:115-117	->	member4-semantics.md:221-222 member4-file-layout.txt:115-118
225	member4-semantics.md:39-48 quests.md:675-683,726	->	member4-semantics.md:107-112 quests.md:675-683,726
238	member4-semantics.md:56-57,257-263,313 DEVELOP.md:311-313,320	->	member4-semantics.md:56-57,195,258-265 DEVELOP.md:311-313,320
267	quests.md:607,720 member4-semantics.md:77 coverage-map.md:295	->	quests.md:607,720 member4-semantics.md:77 coverage-map.md:298
269	coverage-map.md:258-263	->	coverage-map.md:261-264
271	HANDOFF.md:24,128 coverage-map.md:247	->	HANDOFF.md:24,129 coverage-map.md:247
272	coverage-map.md:358	->	coverage-map.md:361
273	coverage-map.md:389	->	coverage-map.md:392
276	member4-semantics.md:39-48 quests.md:726	->	member4-semantics.md:107-112 quests.md:726
277	DEVELOP.md:58,220 HANDOFF.md:42-43	->	DEVELOP.md:60,220 HANDOFF.md:43-44
278	coverage-map.md:42-44 CURRENT-RULING.md:83-85 coverage-map.md:228-243 coverage-map.md:42-44,228-243 CURRENT-RULING.md:83-85	->	coverage-map.md:42 CURRENT-RULING.md:83-85 coverage-map.md:235-242 coverage-map.md:42,235-242 CURRENT-RULING.md:83-85
279	coverage-map.md:265,296-299	->	coverage-map.md:411-415 HANDOFF.md:217
283	coverage-map.md:303,334 quests.md:687	->	coverage-map.md:306,337 quests.md:687
```

## W2-ES5 — Gap 11 is stale; the drift is at 0x5057

### What the paragraph said

```
| 11 | **member#4 layout 4 B drift.** The 134-row layout table is off by 4 B somewhere after `char_off 0x3157`,
which moves quest bitmap offsets. | Cross-file: the quest bitmaps referenced by invariant 7 may be addressed 4 B
early in downstream code. | Tracked as HANDOFF.md:188 (issue 6); belongs to the member#4 spec. |
```

Two things are wrong. `HANDOFF.md:188` is the opening fence of the directory-tree block (the issue is item 6 on
line 217, resolved 2026-10-24). And the localisation is false: the table gained a 4 B nested read at row 107
(`0x5057`), so rows 107..134 moved +4 while rows 1..106 — including every field spec 01 and 03 use before it — did
not move. The claim that quest bitmaps move is the unsafe part: an editor that applied +4 to `0x2C77` would
corrupt the quest state.

### Measurement 1 — the inserted 4 B read is at the 0x5057 row

`coverage-map.md:412` names the site; the image confirms it (vaddr = flat − 0x100):

```
$ node tools/mhgu/arm32.mjs 0x51e494 8
0051e494: e79f0000  ldr r0, [pc, r0]
0051e498: e5900000  ldr r0, [r0, #0]
0051e49c: eb00fbeb  bl 0x55d450
0051e4a0: e30305e4  movw r0, #0x35e4
0051e4a4: e3a02004  mov r2, #4
0051e4a8: e0851000  add r1, r5, r0
0051e4ac: e1a00004  mov r0, r4
0051e4b0: ebfb037c  bl 0x3df2a8

$ node tools/mhgu/arm32.mjs 0x55d450 4
0055d450: e3012d90  movw r2, #0x1d90
0055d454: e0800002  add r0, r0, r2
0055d458: eaf1b5be  b 0x1cab58

$ node tools/mhgu/arm32.mjs 0x1cab58 12
001cab58: e92d4070  push {r4, r5, r6, lr}
001cab5c: e1a05000  mov r5, r0
001cab60: e3026838  movw r6, #0x2838
001cab64: e1a00001  mov r0, r1
001cab68: e3a02004  mov r2, #4
001cab6c: e0854006  add r4, r5, r6
001cab70: e1a01004  mov r1, r4
001cab74: eb0851cb  bl 0x3df2a8
001cab78: e7950006  ldr r0, [r5, r6]
```

The call at `0x51e49c` sits between the `0x3670` read (returns at `0x51e4a0`, which then reads `0x35E4`) and is
the only 4 B read in that gap. `0x1d90 + 0x2838 = 0x45C8`, the member[17] offset recorded in layout row 107.
Rows 112/113/114 of `member4-file-layout.txt` are therefore `0x5053`, `0x5057` (the inserted row), `0x505B` — the
insertion point, not "somewhere after 0x3157".

### Measurement 2 — fields between 0x3157 and 0x5057 are NOT shifted

```
$ node tools/audit/drift-gap11.mjs
## medal_B structure at 0x316B (table row after 0x3157) vs the +4 alternative
  0x316B: slot0 zeroTail=true highNibbleZero=true bits=33; slot1 zeroTail=true highNibbleZero=true bits=12
  0x316F: slot0 zeroTail=false highNibbleZero=false bits=39; slot1 zeroTail=false highNibbleZero=false bits=18
PASS medal B decodes at 0x316B and fails at 0x316F: no displacement after 0x3157

## 12 B block repeat around the 0x5057 insert (rows 111/112 at 0x507B/0x5087)
  clean slot0: identical nonzero 12 B neighbours at 0x5078, 0x5079, 0x507A, 0x507B
  dirty slot0: identical nonzero 12 B neighbours at 0x5078, 0x5079, 0x507A, 0x507B
PASS the 12 B pair starts at 0x507B, not the old 0x5077: +4 applies at rows 111/112

## quest bitmaps: cleared bits whose seen bit is 0 (must be 0 at the table coordinates)
  clean slot1 -4: 4
  clean slot1 table 0x2C77/0x2D77: 0
  clean slot1 +4: 25
PASS clean slot1 quest bitmaps give 0 cleared⊄seen bits at 0x2C77/0x2D77

## monster counters, clean slot1 (reference: 62 kill / max 45, 26 capture / max 3, 9 size-only)
  old 0x5EA2: kill 62/max 45, capture 26/max 3, small-capture 0, small-size 1, size-only 22
  table 0x5EA6: kill 62/max 45, capture 26/max 3, small-capture 0, small-size 0, size-only 9
PASS monster arrays decode at 0x5EA6 exactly as coverage-map records (old 0x5EA2 gives small-size 1, size-only 22)

## layout table: 135 rows = 134 static + 1 nested 4 B; row sizes sum to 11595 B; loop expansion 1360 B; total 12955 B (0x329B); 0x2C0B + 12955 = 0x5EA6
PASS layout table tiles to 12,955 B = 0x329B, ending at 0x5EA6; without the 4 B row it is 12,951 B and ends at 0x5EA2

GAP 11 LOCALISATION CONFIRMED
```

The medal B test is decisive: a 20 B medal block has 132 bits in the first 17 B, the low nibble of byte +16, and
bytes +17..+19 zero. At the table coordinate `0x316B` both clean slots satisfy all three; at the +4 alternative
`0x316F` neither does (the shifted window runs into the next field). If the table were displaced after
`0x3157`, `0x316B` would fail. It does not.

The 12 B pair test does the same on the other side of the insert: rows 111/112 are two 12 B slots whose content is
byte-identical in the hunter-B slots (`clean slot0` and `dirty slot0`); the identical pair starts at
`0x507B`/`0x5087` and does not exist at the pre-fix `0x5077`/`0x5083`. The pair is nonzero there, so the match is
not a zero run.

The quest bitmaps at `0x2C77`/`0x2D77` decode with 0 `cleared`-not-in-`seen` bits; shifting the pair by +4 gives
25 violations and by −4 gives 4. The table coordinates are the only ones that satisfy the invariant.

### Measurement 3 — fields after 0x5057 use the corrected coordinates

The monster counters are the post-insert anchor. At `0x5EA6` the clean slot1 gives kill 62 / max 45, capture
26 / max 3, **0** small-monster capture records and **0** small-monster size records, with 9 size-only slots —
exactly the numbers coverage-map publishes. At the old `0x5EA2` alignment one small-monster size record appears
and size-only rises to 22, which violates "small monsters have no size record". The table tiles to
`0x2C0B + 12,955 = 0x5EA6`: 135 rows (134 static + the 4 B nested row) sum to 11,595 B and the loop expansion
(rows 66/67 ×21, 68/69 ×15, 20 B each) adds 1,360 B. Without the 4 B row the same rows are 12,951 B and end at
`0x5EA2`, which is exactly the pre-2026-10-24 table.

### The new paragraph

```
| 11 | **member#4 layout 4 B drift — RESOLVED 2026-10-24; localized at `char_off 0x5057` (row 107).** The table
gained a 4 B nested read at `0x5057` (`0x51e49c` → `0x55d450` → `0x1cab58`, `mov r2,#4; bl 0x3df2a8`), so rows
107..134 moved +4 and the table now ends at `0x5EA6` (12,955 B from `0x2C0B`); rows 1..106 are unchanged. The
earlier text ("off by 4 B somewhere after `0x3157`, which moves quest bitmap offsets") is wrong on both counts:
the quest bitmaps at `0x2C77/0x2D77` decode with 0 `cleared`-not-in-`seen` bits and would show 25 violations
shifted by +4. | No offset in this file is affected; every field here lies at or before `0x3157`. |
`coverage-map.md:411-415`; `HANDOFF.md:217`; `member4-file-layout.txt` row 107; byte check:
`node tools/audit/drift-gap11.mjs`. |
```

### Consequential corrections

- **03 G18** said the drift was "not localized" and pointed at `coverage-map.md:265` (blank). It now records the
  `0x5057` localisation and the corrected anchors, citing `coverage-map.md:411-415` and `HANDOFF.md:217`.
- **03 item 4** gave the persisted A/B bitmap slots as `0x505F`/`0x506B` and `0x5077` as `obj+0x3614`. The layout
  rows 115-118 put them at `0x5063`/`0x506F`/`0x507B`; that is also what the 12 B pair measurement shows. The text
  and its `member4-file-layout.txt:115-118` citation were updated.
- **03 item 15** listed the unknown-field example `0x5E2E..0x5EA2`; the same +4 gives `0x5E32..0x5EA6` (the 3444 B
  block ends at `0x5E32`, the kill array starts at `0x5EA6`). Corrected.
- **01 Gap 10, 03 G17 and 02 G-10** were also pointing at the wrong rows or quoting superseded numbers: `coverage-map.md:30` is the
  `0x3EF7` row, not the preset row (40); `DEVELOP.md:519` is a heading, the old 5430 B row is 523; `G17`'s
  "CURRENT-RULING says 94 large in 0..92" is not what lines 83-85 say. Each paragraph now states what its cited
  lines actually say.

## Verification

```
$ node tools/audit/check.mjs
PASS manifest covers 214 docs, all present
note 19 doc(s) exist but are not in the frozen manifest (new since 2026-11-03): docs/analysis/audit/LINK-DATA-SIDE.md, docs/analysis/audit/LINK-INVENTORY.md, docs/analysis/audit/LINK-MECHANICS-CODE.md
PASS all 214 manifest docs carry a verdict
PASS slice TSV headers checked
PASS coverage meter: 52692 functions / 5228277 instructions
note tier A now 25584 functions / 57.7% of instructions
PASS evidence tables: 24 files, 46858 rows, 25786 functions
PASS evidence rows re-verified: 22957 rows, all consistent; 4479 rest on a class-name or taxonomy judgement; 2731 carry a claim shape no handler parses
PASS inferred rows re-derived: 16844/16845 (99.99%)
PASS independent recomputation reproduces the report partition (66.19% of instructions)
PASS published project calibre matches canonical-metric.mjs (58.0%) at 8 site(s)
PASS METER.md header numbers match coverage-report.tsv (66.2/53.5/90.0/76.6/75.0/82.5/10.0/23.4)
PASS save-side structural formula uses the member length, not the end offset (3 site(s))
PASS database foreign keys: 2621 known violations only (quests 1127 / meow_rewards 1168 / skills 326), 0 real orphans

ALL PASS
```

The resolver is deliberately **not wired into `check.mjs` yet**: other waves are editing the same three files,
so making the shared gate depend on their in-flight line numbers would produce failures unrelated to this task.
Wiring it is one line (`execFileSync(node, ["tools/audit/check-citations.mjs"])`) once the tree is quiet.

`git diff --stat docs/editor-spec` reports 3 files, 122 insertions / 122 deletions: 119 lines carry a changed
reference group and 3 are content-only (item 4 offsets, item 9 range, item 15 range).

## VERDICT

```
W2-ES4	fixed	the resolver went from 75 failing references (51 blank, 20 separator, 4 fence) to 0 after 119 citation lines were corrected against re-read targets.
W2-ES5	fixed	drift-gap11.mjs measures medal B at 0x316B, the duplicate 12 B pair at 0x507B and the kill array at 0x5EA6, so the insert is at 0x5057; Gap 11, G18, item 4 and item 15 were rewritten accordingly.
```

## Appendix A — before output (full)

```
$ node tools/audit/check-citations.mjs .tmp/before-spec/
# citation resolver: 3 specs, 588 references

## FAIL (75) — missing file / past EOF / blank / fence / separator
FAIL 01-container-header.md:58 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:64 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:65 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:69 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:71 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:72 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 01-container-header.md:73 -> HANDOFF.md:85  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:73 -> write-side-desc.md:335  [SEP] line 335 is a table separator  | |---|---|---|---|---|
FAIL 01-container-header.md:76 -> coverage-map.md:300  [BLANK] line 300 is blank
FAIL 01-container-header.md:77 -> coverage-map.md:334  [BLANK] line 334 is blank
FAIL 01-container-header.md:77 -> write-side-desc.md:357-358  [BLANK] line 357 is blank
FAIL 01-container-header.md:78 -> coverage-map.md:334  [BLANK] line 334 is blank
FAIL 01-container-header.md:82 -> HANDOFF.md:85-86  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:86 -> coverage-map.md:199-210  [BLANK] line 199 is blank
FAIL 01-container-header.md:87 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:105 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 01-container-header.md:108 -> coverage-map.md:272-273  [BLANK] line 272 is blank
FAIL 01-container-header.md:108 -> write-side-desc.md:530-532  [BLANK] line 530 is blank
FAIL 01-container-header.md:121 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:129 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 01-container-header.md:132 -> HANDOFF.md:85-86  [FENCE] line 85 opens/closes a code fence  | ```
FAIL 01-container-header.md:134 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:137 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 01-container-header.md:137 -> social-checksum.md:293-295  [SEP] line 293 is a table separator  | |---|---|---|
FAIL 01-container-header.md:138 -> coverage-map.md:374-386  [BLANK] line 374 is blank
FAIL 01-container-header.md:140 -> write-side-desc.md:365-370  [BLANK] line 365 is blank
FAIL 01-container-header.md:152 -> member4-header.md:240  [BLANK] line 240 is blank
FAIL 01-container-header.md:155 -> coverage-map.md:353  [BLANK] line 353 is blank
FAIL 01-container-header.md:156 -> HANDOFF.md:188  [FENCE] line 188 opens/closes a code fence  | ```
FAIL 02-items-equipment.md:76 -> equipment.md:411  [SEP] line 411 is a table separator  | |---|---|---|---|---|
FAIL 02-items-equipment.md:76 -> equipment.md:584  [BLANK] line 584 is blank
FAIL 02-items-equipment.md:82 -> equipment.md:573-576  [BLANK] line 573 is blank
FAIL 02-items-equipment.md:90 -> equipment.md:396  [SEP] line 396 is a table separator  | |---|---|---|---|---|
FAIL 02-items-equipment.md:90 -> coverage-map.md:106  [BLANK] line 106 is blank
FAIL 02-items-equipment.md:98 -> coverage-map.md:108  [SEP] line 108 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:98 -> DEVELOP.md:519  [BLANK] line 519 is blank
FAIL 02-items-equipment.md:101 -> equipment.md:533  [BLANK] line 533 is blank
FAIL 02-items-equipment.md:113 -> DEVELOP.md:228  [SEP] line 228 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:125 -> DEVELOP.md:228  [SEP] line 228 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:161 -> coverage-map.md:102-103  [BLANK] line 102 is blank
FAIL 02-items-equipment.md:167 -> equipment.md:533  [BLANK] line 533 is blank
FAIL 02-items-equipment.md:168 -> DEVELOP.md:217  [SEP] line 217 is a table separator  | |---|---|---|---|
FAIL 02-items-equipment.md:181 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 02-items-equipment.md:184 -> DEVELOP.md:519  [BLANK] line 519 is blank
FAIL 02-items-equipment.md:199 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:31 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:52 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:63 -> contradictory-bits-verdict.md:24  [BLANK] line 24 is blank
FAIL 03-quests-monsters-palico.md:64 -> contradictory-bits-verdict.md:24  [BLANK] line 24 is blank
FAIL 03-quests-monsters-palico.md:68 -> contradictory-bits-verdict.md:27  [BLANK] line 27 is blank
FAIL 03-quests-monsters-palico.md:87 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:87 -> coverage-map.md:248  [BLANK] line 248 is blank
FAIL 03-quests-monsters-palico.md:102 -> coverage-map.md:192  [BLANK] line 192 is blank
FAIL 03-quests-monsters-palico.md:102 -> coverage-map.md:388  [BLANK] line 388 is blank
FAIL 03-quests-monsters-palico.md:110 -> coverage-map.md:388  [BLANK] line 388 is blank
FAIL 03-quests-monsters-palico.md:115 -> coverage-map.md:390  [BLANK] line 390 is blank
FAIL 03-quests-monsters-palico.md:130 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:170 -> coverage-map.md:234-243  [BLANK] line 234 is blank
FAIL 03-quests-monsters-palico.md:179 -> coverage-map.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:188 -> DEVELOP.md:243  [BLANK] line 243 is blank
FAIL 03-quests-monsters-palico.md:193 -> coverage-map.md:390-391  [BLANK] line 390 is blank
FAIL 03-quests-monsters-palico.md:202 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:212 -> DEVELOP.md:217  [SEP] line 217 is a table separator  | |---|---|---|---|
FAIL 03-quests-monsters-palico.md:225 -> member4-semantics.md:39-48  [BLANK] line 39 is blank
FAIL 03-quests-monsters-palico.md:238 -> member4-semantics.md:257-263  [SEP] line 257 is a table separator  | |---|---|---|---|---|---|---|
FAIL 03-quests-monsters-palico.md:267 -> coverage-map.md:295  [SEP] line 295 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:269 -> coverage-map.md:258-263  [BLANK] line 258 is blank
FAIL 03-quests-monsters-palico.md:271 -> HANDOFF.md:128  [BLANK] line 128 is blank
FAIL 03-quests-monsters-palico.md:276 -> member4-semantics.md:39-48  [BLANK] line 39 is blank
FAIL 03-quests-monsters-palico.md:277 -> DEVELOP.md:58  [SEP] line 58 is a table separator  | |---|---|---|
FAIL 03-quests-monsters-palico.md:278 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:278 -> coverage-map.md:228-243  [BLANK] line 228 is blank
FAIL 03-quests-monsters-palico.md:279 -> coverage-map.md:265  [BLANK] line 265 is blank
FAIL 03-quests-monsters-palico.md:283 -> coverage-map.md:303  [BLANK] line 303 is blank
FAIL 03-quests-monsters-palico.md:283 -> coverage-map.md:334  [BLANK] line 334 is blank

## WARN (127) — target line does not carry the sentence's identifier
WARN 01-container-header.md:28 -> HANDOFF.md:41  [NEAR] claim appears at line 42: 0x11F8A0 1177760  | | `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
WARN 01-container-header.md:29 -> HANDOFF.md:42  [NEAR] claim appears at line 43: 1625244 2803040 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 01-container-header.md:31 -> HANDOFF.md:43  [NEAR] claim appears at line 44: 20261022  | | system 文件偏移 | `hunterAdds[i] + char_off`，`hunterAdds = [16
WARN 01-container-header.md:66 -> docs/analysis/save-io/social-checksum.md:283  [IDMISS] no claim identifier on the line: 0x0028 0x0004 1,177,760  | 唯一的"判定"是 `payload[4+slot]` 的槽存在标志（`0x3e0980 strb` / `0x3e0ab
WARN 01-container-header.md:66 -> DEVELOP.md:220  [IDMISS] no claim identifier on the line: 1,177,760  | | 崩溃 | 装备 LV/幻化/猎虫无钳制；套名读20B无NUL崩 | EquipsForm.cs ClampNUD |
WARN 01-container-header.md:68 -> HANDOFF.md:41-43  [NEAR] claim appears at line 42: 0x18CC9C 0x2AC560 0x3CBE24 1,177,760  | | `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
WARN 01-container-header.md:70 -> DEVELOP.md:59  [NEAR] claim appears at line 61: 1,177,760  | | `system` 文件总大小 | 5,159,100 B | 编辑器:5996；SaveStruct hexdump
WARN 01-container-header.md:73 -> docs/save-layout/coverage-map.md:297  [IDMISS] no claim identifier on the line: 0x0000 0x001F  | | `0x2D77` obj+0x52C seen 位图 | popcount 331（⊇cleared 94）| ✓ 
WARN 01-container-header.md:74 -> docs/save-layout/coverage-map.md:298  [IDMISS] no claim identifier on the line: 0x0020 0x0023 0xFFFFFFFF  | | `0x2E77` obj+0x62C achieve 位图 | popcount 3 | ✓ |
WARN 01-container-header.md:74 -> docs/analysis/save-io/write-side-desc.md:336  [NEAR] claim appears at line 337: 0x0020 0x0023 0xFFFFFFFF 70,310 1,560,082 359,999,999  | | `0x000` | 32 | memcpy ← `obj+0x514` | 3e0f20/3e0f28/3e0f30
WARN 01-container-header.md:75 -> docs/save-layout/coverage-map.md:299  [IDMISS] no claim identifier on the line: 0x0024 0x0027 0xFFFFFFFF 3,355,345 8,345,419 99,999,999  | | `0x3157` obj+0xC28 勋章 132bit | dirty 实测 `FF×16 + 0x0F` = 1
WARN 01-container-header.md:75 -> docs/analysis/save-io/write-side-desc.md:337  [NEAR] claim appears at line 338: 0x0024 0x0027 0xFFFFFFFF 3,355,345 8,345,419 99,999,999  | | `0x020` | 4 | `*(*(0x18389B4))+0x34`（字面量 0x1457c64） | 3e0f
WARN 01-container-header.md:76 -> docs/analysis/save-io/write-side-desc.md:338  [NEAR] claim appears at line 339: 0x0028 0x0029 0xFFFF 0x00B1  | | `0x024` | 4 | `*(*(0x1838F88))+0x24`（字面量 0x1457dfc） | 3e0f
WARN 01-container-header.md:77 -> docs/analysis/save-io/write-side-desc.md:342  [NEAR] claim appears at line 339: 0x00B1 0x00B2 0x0028  | | `0x02C` | 224 | memcpy ← `obj+0x240` | 3e0f7c-3e0f9c | **不
WARN 01-container-header.md:78 -> docs/save-layout/coverage-map.md:301  [IDMISS] no claim identifier on the line: 0x002A  | ⇒ **layout 表至少在 `0x3157` 之前完全正确**；4B 漂移发生在 `0x3157..0x5EA2` 
WARN 01-container-header.md:78 -> docs/analysis/save-io/write-side-desc.md:339  [NEAR] claim appears at line 340: 0x002A  | | `0x028` | 2 | `obj+0x554` (u16) | 3e0f34/3e0f3c/3e0f40 | *
WARN 01-container-header.md:79 -> docs/analysis/save-io/write-side-desc.md:340  [NEAR] claim appears at line 341: 0x002B  | | `0x02A` | 1 | `obj+0x4D4==15 ? 2 : (obj+0x4D8 ? 1 : 0)` | 
WARN 01-container-header.md:79 -> docs/analysis/save-io/write-side-desc.md:470  [NEAR] claim appears at line 473: 0x002B  | 2. ~~`0xdac14` 尾部~~ **已取**（`wr-dac14-tail.txt`）：`owned` 子对象 
WARN 01-container-header.md:80 -> docs/save-layout/coverage-map.md:301-318  [NEAR] claim appears at line 304: 0x0000 0x0277 0x002A 0x002B  | ⇒ **layout 表至少在 `0x3157` 之前完全正确**；4B 漂移发生在 `0x3157..0x5EA2` 
WARN 01-container-header.md:81 -> docs/analysis/save-io/write-side-desc.md:341  [NEAR] claim appears at line 342: 0x002C 0x010B 0x00B1  | | `0x02B` | 0 | 参数 r2；**26/26 个存档块实测全为 0**（18 个 system 槽 + 8
WARN 01-container-header.md:81 -> docs/analysis/save-io/social-checksum.md:87-88  [IDMISS] no claim identifier on the line: 0x002C 0x010B 0x00B1  | 003e1258: add r1, r4, #44   ; +44  → 224B memcpy 到 obj+576  
WARN 01-container-header.md:82 -> docs/save-layout/coverage-map.md:333  [NEAR] claim appears at line 336: 0x010C 0x023F 0x0193A514  | **关联**：`0x6aa9b8` 迭代器也出现在 member[4]/[8]/[13]/[17]（各 reader 里
WARN 01-container-header.md:83 -> docs/analysis/save-io/write-side-desc.md:343-346  [NEAR] claim appears at line 342: 0x0240 0x026F 0x0241 0x0248 0x0260  | | `0x10C..0x23F` | 308 | 7×44 装备记录（§4.2） | 3e0fa0-3e1008 | 已
WARN 01-container-header.md:84 -> docs/save-layout/coverage-map.md:333  [NEAR] claim appears at line 336: 0x0270 0x0273 0x0271 0x506 0x0272 0x3e104c  | **关联**：`0x6aa9b8` 迭代器也出现在 member[4]/[8]/[13]/[17]（各 reader 里
WARN 01-container-header.md:85 -> docs/analysis/save-io/write-side-desc.md:348  [NEAR] claim appears at line 349: 0x0274 0x0277  | | `0x272` | 2 | **无写入** | 见 §5.3 | 未初始化（栈残留） |
WARN 01-container-header.md:86 -> HANDOFF.md:87-103  [NEAR] claim appears at line 88: 0x0278 0x3783A 226,754  | 0x10C+44k = 7×44B 运行时对象 dump（vptr 0x0193A514 落盘）；0x270..0x27
WARN 01-container-header.md:87 -> docs/save-layout/coverage-map.md:268-299  [IDMISS] no claim identifier on the line: 0x3783A 0x11F8A0 950,374  | **推论**：member#4 内层真实跨度 = `0x2C0B..0x5EA6` = **12,955 B**；`me
WARN 01-container-header.md:130 -> docs/analysis/save-io/social-checksum.md:107-108  [IDMISS] no claim identifier on the line: 0x0024 0x0034 0x003F 0x0050 0x005B  | 003e11e8: ldr r1, [r1, #16]  ; offset[slot] = *(u32*)(payloa
WARN 01-container-header.md:130 -> docs/analysis/save-io/social-checksum.md:285-286  [IDMISS] no claim identifier on the line: 0x0024 0x0034 0x003F 0x0050 0x005B  | `save-load-path.md` §2），是"存了但不验"的格式戳；`payload[0] = 0xC6`(=19
WARN 01-container-header.md:132 -> docs/save-layout/coverage-map.md:301-334  [NEAR] claim appears at line 304: 0x002B 0x0277  | ⇒ **layout 表至少在 `0x3157` 之前完全正确**；4B 漂移发生在 `0x3157..0x5EA2` 
WARN 01-container-header.md:133 -> HANDOFF.md:87-103  [NEAR] claim appears at line 88: 0x0278 0x3783A  | 0x10C+44k = 7×44B 运行时对象 dump（vptr 0x0193A514 落盘）；0x270..0x27
WARN 01-container-header.md:134 -> docs/save-layout/coverage-map.md:268-299  [IDMISS] no claim identifier on the line: 0x3783A 0x11F8A0  | **推论**：member#4 内层真实跨度 = `0x2C0B..0x5EA6` = **12,955 B**；`me
WARN 01-container-header.md:140 -> docs/analysis/save-io/write-side-desc.md:340  [NEAR] claim appears at line 341: 0x002B 0x0270 0x0273 0x0271 0x0272  | | `0x02A` | 1 | `obj+0x4D4==15 ? 2 : (obj+0x4D8 ? 1 : 0)` | 
WARN 01-container-header.md:152 -> docs/analysis/members/member4-header.md:165  [NEAR] claim appears at line 162: 0x0024 10255 140427  | **H-C（本报告采信）**：表尾 25 行根本不是 `0x51dc40` 的读取（§3.5 条数 134 vs 159
WARN 01-container-header.md:154 -> docs/save-layout/coverage-map.md:318  [NEAR] claim appears at line 317: 0x002C 0x010B 0x13C 0x1C6  | | `+0x30..0x13B` | — | 全 0 | 未用 |
WARN 02-items-equipment.md:47 -> DEVELOP.md:63  [IDMISS] no claim identifier on the line: 10174  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:47 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:47 -> docs/save-layout/coverage-map.md:11  [IDMISS] no claim identifier on the line: 10174  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:47 -> docs/save-layout/coverage-map.md:139  [IDMISS] no claim identifier on the line: 10174  | | `0x335A8..0xBC5A8` | 采样点 52%（4KB）| 密集成员记录区候选 ~561KB（0x8900
WARN 02-items-equipment.md:48 -> DEVELOP.md:63  [NEAR] claim appears at line 65: 0x278  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:48 -> DEVELOP.md:85  [IDMISS] no claim identifier on the line: 0x278  | | PatchDesign §3(c)「扩容+等量缩短 0xFF0 组块」 | **否决** | 0x17CF 之后不是
WARN 02-items-equipment.md:49 -> DEVELOP.md:60  [NEAR] claim appears at line 62: 0x8FC 0xBB0  | | 容器 | 36 B 头 + 3 个槽块；槽头 u32 @0x34/0x38/0x3C；槽数据跨距 0x11F8C4 
WARN 02-items-equipment.md:49 -> tools/box-slot-tool.mjs:32  [IDMISS] no claim identifier on the line: 0x8FC 0xBB0  | const DEF_BASE=0x278, DEF_N=2992, BITS=19;
WARN 02-items-equipment.md:50 -> tools/box-slot-tool.mjs:32  [IDMISS] no claim identifier on the line: 0x7FFFF  | const DEF_BASE=0x278, DEF_N=2992, BITS=19;
WARN 02-items-equipment.md:50 -> DEVELOP.md:62  [IDMISS] no claim identifier on the line: 0x7FFFF  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:52 -> DEVELOP.md:66  [IDMISS] no claim identifier on the line: 0xFFF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:53 -> DEVELOP.md:62  [NEAR] claim appears at line 64: 0x63  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:53 -> HANDOFF.md:88  [IDMISS] no claim identifier on the line: 0x63  | 0x0278          member[0] 道具箱（2300 位流 + 组名块 24×170）
WARN 02-items-equipment.md:53 -> tools/box-slot-tool.mjs:81  [IDMISS] no claim identifier on the line: 0x63  | if(cmd==="write"&&(isNaN(+c)||+c<0||+c>0x7F)){console.error(
WARN 02-items-equipment.md:53 -> tools/box-slot-tool.mjs:99  [IDMISS] no claim identifier on the line: 0x63  | v=(v&~(0x7FFFF<<o))|((((count&0x7F)<<12|(id&0xFFF))<<o)>>>0)
WARN 02-items-equipment.md:55 -> tools/box-slot-tool.mjs:82-89  [IDMISS] no claim identifier on the line: 10174  | // TOOL-4: writing into slots >=2300 is only valid on the V7
WARN 02-items-equipment.md:55 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x17CF 0x1E39 0x1E3A 0x27BE  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:55 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:62 -> docs/save-layout/coverage-map.md:140  [IDMISS] no claim identifier on the line: 0x27BF 10175 10250 10251  | | `0xBD4B1..0xBD722` | 全 `0x10` | **625B 完整 `0x10` 段**（**不是*
WARN 02-items-equipment.md:62 -> docs/save-layout/coverage-map.md:206  [IDMISS] no claim identifier on the line: 0x27BF 10175 10250 10251  | | [14] | `0x335A8..0x34E10` | 6,248 | 13×470B 记录（stride 564）
WARN 02-items-equipment.md:62 -> HANDOFF.md:88  [NEAR] claim appears at line 89: 0x27BF 10175 10250 10251  | 0x0278          member[0] 道具箱（2300 位流 + 组名块 24×170）
WARN 02-items-equipment.md:63 -> docs/save-layout/pouch-verified.md:4  [NEAR] claim appears at line 3: 10175  | 与道具箱（char_off 632 起）**同一套编码**，只是槽数 32（32×19/8 = 76B）。
WARN 02-items-equipment.md:67 -> docs/save-layout/coverage-map.md:11-13  [IDMISS] no claim identifier on the line: 10174 10251  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:67 -> DEVELOP.md:285  [IDMISS] no claim identifier on the line: 10174 10251  | - 单例 GOT：口袋 `0x183A828→0x18584B8`，道具箱 `0x183A81C→0x1858438`（
WARN 02-items-equipment.md:73 -> docs/mechanics/equipment.md:401-402  [NEAR] claim appears at line 398: 0x62EE 0x17C2E 25326 72000 97326  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:73 -> DEVELOP.md:69  [NEAR] claim appears at line 71: 25326 72000 97326  | | 真实道具种类 | **2940**（MHGU 名录）/2955（MHXX 名录），最大真实 id 2976 | MH
WARN 02-items-equipment.md:73 -> docs/save-layout/coverage-map.md:28  [IDMISS] no claim identifier on the line: 0x62EE 0x17C2E 25326 72000 97326  | | `0x335A8..0x3E3E5` | ~44KB | 未测绘 | ✗ |
WARN 02-items-equipment.md:73 -> docs/save-layout/coverage-map.md:144  [IDMISS] no claim identifier on the line: 0x62EE 0x17C2E 25326 72000 97326  | | `0x1175A8..0x11F8A0` | 0→14→3% | 尾部标志位收尾（~52KB）|
WARN 02-items-equipment.md:90 -> docs/mechanics/equipment.md:401-402  [NEAR] claim appears at line 398: 0x17C2E 0x208CE 97326 36000 133326  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:98 -> docs/mechanics/equipment.md:397  [NEAR] claim appears at line 398: 0x208CE 0x21E0E 133326 138766  | | 猎人装备箱 | 25326 / `0x62EE` | 72000 | **2000 × 36B** | 25326 
WARN 02-items-equipment.md:98 -> docs/mechanics/equipment.md:401  [NEAR] claim appears at line 398: 0x208CE 0x21E0E 133326 138766  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:98 -> docs/save-layout/coverage-map.md:30  [IDMISS] no claim identifier on the line: 0x208CE 0x21E0E  | | `0x3EF7..` | — | 未切分 | ✗ |
WARN 02-items-equipment.md:98 -> DEVELOP.md:71  [NEAR] claim appears at line 73: 0x208CE 0x21E0E 133326 138766  | | **装备箱区** | `+0x62EE..+0x17C2E` = 2000 × 36B 猎人装备箱（首条 `ee 0
WARN 02-items-equipment.md:102 -> docs/mechanics/equipment.md:401  [NEAR] claim appears at line 398: 0x62EE 0x11940 0x17C2E 0x8CA0 0x208CE 0x1540  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:108 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17CF 0xFF0 10175  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:108 -> DEVELOP.md:148  [IDMISS] no claim identifier on the line: 0x17CF 0xFF0  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:108 -> docs/save-layout/coverage-map.md:11  [IDMISS] no claim identifier on the line: 10175  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:109 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x1E3A  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:109 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10175 10118 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:109 -> tools/build-v7-final.mjs:14-15  [IDMISS] no claim identifier on the line: 10175 10118 10174  | A("0019a648","852900E3","preset block write len 2437");
WARN 02-items-equipment.md:109 -> tools/build-v7-final.mjs:44  [IDMISS] no claim identifier on the line: 0x1E3A  | [0x64C2, 0x74FA],                            // D base (incl
WARN 02-items-equipment.md:112 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17F9  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:114 -> DEVELOP.md:144-145  [NEAR] claim appears at line 146: 0x6320 0x6DC4 0xAA  | | 清零长度 | 0x59D8/0x47E0 | 0x64A8/0x52B0 |
WARN 02-items-equipment.md:120 -> DEVELOP.md:66  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:120 -> DEVELOP.md:67  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | **校验和** | **无 CRC/hash**（容器头 0x36B2EE74 为格式常量，非校验；编辑器整块回写不
WARN 02-items-equipment.md:120 -> DEVELOP.md:62  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:131 -> HANDOFF.md:41-42  [NEAR] claim appears at line 42: 0x11F8A0 0x18CC9C 0x2AC560 0x3CBE24 1,177,760 1,177,759  | | `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
WARN 02-items-equipment.md:131 -> docs/README.md:58  [IDMISS] no claim identifier on the line: 1,177,760 1,177,759 1625244 2803040 3980836  | | `fields/fam-small.md` | 68B 位图 / 164B 双槽 / 20B 勋章 / 尾 3444
WARN 02-items-equipment.md:140 -> DEVELOP.md:63  [NEAR] claim appears at line 66: 0x17CF 0x1E3A 0x27BF 10175 10250 10251  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:140 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x17CF 0x1E3A 0x27BF  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:140 -> docs/save-layout/coverage-map.md:11-13  [IDMISS] no claim identifier on the line: 10175 10250 10251  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:143 -> docs/mechanics/equipment.md:401  [NEAR] claim appears at line 398: 0x62EE 0x11940 0x17C2E 0x8CA0 0x208CE 0x1540  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:154 -> DEVELOP.md:290  [NEAR] claim appears at line 292: 0xFF 0x4447 0x4598 17479 17816  | - 15×128B 定长结构化记录，**不是位域**；三组各 15 个 `movw` 站点（0x51D7D8..、0x5
WARN 02-items-equipment.md:156 -> DEVELOP.md:148  [IDMISS] no claim identifier on the line: 0xFF0  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:159 -> docs/mechanics/equipment.md:633-634  [IDMISS] no claim identifier on the line: 36,000 108,000  | | 5 | `awaken` 全空、`max_attack`/`tree_depth` 恒 0 | 10877 条记录实
WARN 02-items-equipment.md:160 -> DEVELOP.md:64  [IDMISS] no claim identifier on the line: 0x21E0E 0x2261D 0x22612 2,064  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:160 -> docs/save-layout/coverage-map.md:109  [IDMISS] no claim identifier on the line: 0x21E0E 0x2261D 0x22612  | | `0x0..0x2F` | 48 | 30% | 角色头（名@0/gold@0x24/HR@0x28/gender@
WARN 02-items-equipment.md:160 -> docs/mechanics/equipment.md:398  [NEAR] claim appears at line 399: 0x21E0E 0x2261D 0x22612 2,064  | | 随从猫装备箱 | 97326 / `0x17C2E` | 36000 | **1000 × 36B** | 9732
WARN 02-items-equipment.md:166 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10118 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:176 -> DEVLOG.md:38-49  [NEAR] claim appears at line 41: 0x17CF 0x17F9 0x1879 10175  | ### 关键发现：0xFF0 "组名块" = 24×170B **道具预设**（item-group preset）
WARN 02-items-equipment.md:176 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17CF 0x17F9 0x1879 10175  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:176 -> docs/save-layout/CURRENT-RULING.md:52  [IDMISS] no claim identifier on the line: 10175  | - **套装名/预设名字段宽实测定案 = 42B**（rec0「设置01」NUL pad 到 +42，+42 起装备对）
WARN 02-items-equipment.md:178 -> docs/save-layout/coverage-map.md:109  [IDMISS] no claim identifier on the line: 0x21E0E 0x2C6B4 0x22612  | | `0x0..0x2F` | 48 | 30% | 角色头（名@0/gold@0x24/HR@0x28/gender@
WARN 02-items-equipment.md:178 -> docs/mechanics/equipment.md:398  [NEAR] claim appears at line 399: 0x21E0E 0x2C6B4 0x22612  | | 随从猫装备箱 | 97326 / `0x17C2E` | 36000 | **1000 × 36B** | 9732
WARN 02-items-equipment.md:178 -> HANDOFF.md:94  [IDMISS] no claim identifier on the line: 0x21E0E 0x2C6B4 0x22612  | 0x60CA          volume 137×[u16 mini,u16 maxi] (548B) → 2532
WARN 02-items-equipment.md:182 -> HANDOFF.md:42  [NEAR] claim appears at line 43: 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 02-items-equipment.md:184 -> docs/save-layout/coverage-map.md:30  [IDMISS] no claim identifier on the line: 0x208CE 0x21E03 0x21E0E  | | `0x3EF7..` | — | 未切分 | ✗ |
WARN 02-items-equipment.md:184 -> docs/mechanics/equipment.md:397  [NEAR] claim appears at line 399: 0x208CE 0x21E03 0x21E0E  | | 猎人装备箱 | 25326 / `0x62EE` | 72000 | **2000 × 36B** | 25326 
WARN 02-items-equipment.md:187 -> DEVELOP.md:66  [NEAR] claim appears at line 64: 0xBAF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:200 -> HANDOFF.md:42  [NEAR] claim appears at line 43: 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 03-quests-monsters-palico.md:29 -> HANDOFF.md:41  [NEAR] claim appears at line 42: 1,177,760  | | `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
WARN 03-quests-monsters-palico.md:30 -> HANDOFF.md:42-43  [NEAR] claim appears at line 43: 1625244 2803040 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 03-quests-monsters-palico.md:48 -> docs/save-layout/CURRENT-RULING.md:6  [IDMISS] no claim identifier on the line: 0x2C77 0xFF 11383  | | **存档位域** | obj+0x42C(cleared)/+0x52C(seen)/+0x62C(achieve)
WARN 03-quests-monsters-palico.md:49 -> docs/mechanics/quests.md:614-615  [IDMISS] no claim identifier on the line: 11639  | - **不变量**：`cleared ⊆ seen`。旧编辑器只写 cleared 造成 501 个 `cleared=
WARN 03-quests-monsters-palico.md:50 -> docs/mechanics/quests.md:720  [IDMISS] no claim identifier on the line: 0x2E77  | | 7 | `achieve`（0x62C）语义 | 未确认 | 可能与勋章/称号共用流程 |
WARN 03-quests-monsters-palico.md:52 -> docs/save-layout/coverage-map.md:312  [NEAR] claim appears at line 315: 0x28 0x0B1 0xFFFF 0x3e0db8  | | `+0x00` | UTF-8[20] | **`Sakiko` / `Lay1nn`** | **猎人名字**（本
WARN 03-quests-monsters-palico.md:92 -> docs/save-layout/coverage-map.md:221  [NEAR] claim appears at line 224: 0x5EA6 0x5FB7 0x5EA2 0x5EA5 24230  | | `0x27BF..0x280A` | 76 | member[1] 口袋 32 槽位流 | 前段已定 |
WARN 03-quests-monsters-palico.md:92 -> docs/save-layout/coverage-map.md:242-243  [IDMISS] no claim identifier on the line: 24230  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:93 -> docs/save-layout/coverage-map.md:222  [IDMISS] no claim identifier on the line: 0x5FB8 0x60C9 24504  | | **`0x280B..0x2C0A`** | **1024** | member[2] 外层头（`mov r2,#1
WARN 03-quests-monsters-palico.md:93 -> docs/save-layout/coverage-map.md:242  [IDMISS] no claim identifier on the line: 24504  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:94 -> docs/save-layout/coverage-map.md:242-243  [IDMISS] no claim identifier on the line: 24778  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:94 -> docs/save-layout/coverage-map.md:263  [NEAR] claim appears at line 261: 24778  | | clean 猎人A | kill&vol=20, **vol_only=22** | kill&vol=33, vo
WARN 03-quests-monsters-palico.md:118 -> docs/save-layout/coverage-map.md:392  [NEAR] claim appears at line 395: 0x9C  | 7 个读块：`+0x000/32`(名字) → `+0x020/224`(主体) → `+0x100/14`(7×u16
WARN 03-quests-monsters-palico.md:119 -> docs/save-layout/coverage-map.md:391  [NEAR] claim appears at line 394: 0x058 0x066025E9 0x047759EA  | ## 随从猫 324B 记录内部（`0x263368`，Palico324 定案）
WARN 03-quests-monsters-palico.md:130 -> docs/mechanics/skills-arts.md:523-525  [IDMISS] no claim identifier on the line: 0x2C2B  | - **编辑器已知缺口**：只写 46/72B —— `0x2C13 + 46 = 0x2C41`，距 X3 起点 `0
WARN 03-quests-monsters-palico.md:139 -> docs/save-layout/coverage-map.md:296  [NEAR] claim appears at line 299: 0x3157 0x0F 0xFF 12631  | | `0x2C77` obj+0x42C cleared 位图(256B) | `cleared ⊆ seen`（已定案
WARN 03-quests-monsters-palico.md:139 -> DEVELOP.md:240  [IDMISS] no claim identifier on the line: 12631  | | 错值 | 还原清全局 modifyState/unsavedState（丢其他窗体修改） | CatsForm.cs
WARN 03-quests-monsters-palico.md:262 -> docs/save-layout/CURRENT-RULING.md:42  [IDMISS] no claim identifier on the line: 11501  | 位号 = **记录序号 i**；i 与 questId 在 M1 下相差 ≤1bit（边界对齐 + Hunter Tra
WARN 03-quests-monsters-palico.md:267 -> docs/mechanics/quests.md:720  [IDMISS] no claim identifier on the line: 0x2E77  | | 7 | `achieve`（0x62C）语义 | 未确认 | 可能与勋章/称号共用流程 |
WARN 03-quests-monsters-palico.md:268 -> docs/mechanics/quests.md:692-697  [NEAR] claim appears at line 693: 0x3618 0x7F000  | - case11: [member#4+0x958] & bit20（猎人块内，可写）
WARN 03-quests-monsters-palico.md:279 -> docs/save-layout/coverage-map.md:296-299  [NEAR] claim appears at line 299: 0x3157 0x5EA2 0x2DF8 0x446C  | | `0x2C77` obj+0x42C cleared 位图(256B) | `cleared ⊆ seen`（已定案
WARN 03-quests-monsters-palico.md:280 -> docs/save-layout/member4-semantics.md:237-240  [IDMISS] no claim identifier on the line: 0x2FC7 0x306B 0x311F 0x50BA  | 5. **`obj+0x9D0`/`0xB18`/`0xBDC`/`0x3684` 的「编辑器毁档」归因仍然错误**（既

resolved 588 references: 386 ok, 127 warn, 75 fail
failures by kind: SEP 20, BLANK 51, FENCE 4
CITATION CHECK FAILED
```

## Appendix B — after output (full)

```
$ node tools/audit/check-citations.mjs
# citation resolver: 3 specs, 582 references

## FAIL (0) — missing file / past EOF / blank / fence / separator

## WARN (95) — target line does not carry the sentence's identifier
WARN 01-container-header.md:58 -> DEVELOP.md:60  [IDMISS] no claim identifier on the line: 0x0000 0x0023  | | 容器 | 36 B 头 + 3 个槽块；槽头 u32 @0x34/0x38/0x3C；槽数据跨距 0x11F8C4 
WARN 01-container-header.md:63 -> DEVELOP.md:59-60  [IDMISS] no claim identifier on the line: 1,625,208  | | `system` 文件总大小 | 5,159,100 B | 编辑器:5996；SaveStruct hexdump
WARN 01-container-header.md:66 -> docs/analysis/save-io/social-checksum.md:283  [IDMISS] no claim identifier on the line: 0x0028 0x0004 1,177,760  | 唯一的"判定"是 `payload[4+slot]` 的槽存在标志（`0x3e0980 strb` / `0x3e0ab
WARN 01-container-header.md:66 -> DEVELOP.md:220  [IDMISS] no claim identifier on the line: 1,177,760  | | 崩溃 | 装备 LV/幻化/猎虫无钳制；套名读20B无NUL崩 | EquipsForm.cs ClampNUD |
WARN 01-container-header.md:81 -> docs/analysis/save-io/social-checksum.md:87-88  [IDMISS] no claim identifier on the line: 0x002C 0x010B 0x00B1  | 003e1258: add r1, r4, #44   ; +44  → 224B memcpy 到 obj+576  
WARN 01-container-header.md:82 -> HANDOFF.md:86-87  [NEAR] claim appears at line 87: 0x010C 0x023F 0x0193A514  | 0x0000..0x0277  632B 头（名字@0x00/时长秒@0x20/金币@0x24/HR@0x28/性别@0
WARN 01-container-header.md:86 -> HANDOFF.md:87-103  [NEAR] claim appears at line 88: 0x0278 0x3783A 226,754  | 0x10C+44k = 7×44B 运行时对象 dump（vptr 0x0193A514 落盘）；0x270..0x27
WARN 01-container-header.md:87 -> docs/save-layout/coverage-map.md:268-299  [IDMISS] no claim identifier on the line: 0x3783A 0x11F8A0 950,374  | **推论**：member#4 内层真实跨度 = `0x2C0B..0x5EA6` = **12,955 B**；`me
WARN 01-container-header.md:129 -> DEVELOP.md:60  [IDMISS] no claim identifier on the line: 0x0000 0x0023 0x0014 0x001C  | | 容器 | 36 B 头 + 3 个槽块；槽头 u32 @0x34/0x38/0x3C；槽数据跨距 0x11F8C4 
WARN 01-container-header.md:130 -> docs/analysis/save-io/social-checksum.md:107-108  [IDMISS] no claim identifier on the line: 0x0024 0x0034 0x003F 0x0050 0x005B  | 003e11e8: ldr r1, [r1, #16]  ; offset[slot] = *(u32*)(payloa
WARN 01-container-header.md:130 -> docs/analysis/save-io/social-checksum.md:285-286  [IDMISS] no claim identifier on the line: 0x0024 0x0034 0x003F 0x0050 0x005B  | `save-load-path.md` §2），是"存了但不验"的格式戳；`payload[0] = 0xC6`(=19
WARN 01-container-header.md:133 -> HANDOFF.md:87-103  [NEAR] claim appears at line 88: 0x0278 0x3783A  | 0x10C+44k = 7×44B 运行时对象 dump（vptr 0x0193A514 落盘）；0x270..0x27
WARN 01-container-header.md:134 -> docs/save-layout/coverage-map.md:268-299  [IDMISS] no claim identifier on the line: 0x3783A 0x11F8A0  | **推论**：member#4 内层真实跨度 = `0x2C0B..0x5EA6` = **12,955 B**；`me
WARN 01-container-header.md:152 -> docs/analysis/members/member4-header.md:245  [IDMISS] no claim identifier on the line: 10255 140427  | 3. 编辑器把 1024 B 块按 `+0/+4/+12` 解释（工会值/金币#2/龙历院点数）是**编辑器作者意图**
WARN 01-container-header.md:152 -> docs/analysis/members/member4-header.md:170  [NEAR] claim appears at line 171: 0x0024 10255 140427  | - **H-A 同一对象**：1024 B 块是模板/默认值，末尾 5 处标量再被覆盖 → 编辑器把 `0x280F` 
WARN 01-container-header.md:154 -> docs/save-layout/coverage-map.md:318  [NEAR] claim appears at line 317: 0x002C 0x010B 0x13C 0x1C6  | | `+0x30..0x13B` | — | 全 0 | 未用 |
WARN 01-container-header.md:156 -> docs/save-layout/coverage-map.md:411-415  [NEAR] claim appears at line 413: 12,955  | ### member#4 4B 漂移：已定位（2026-10-24）
WARN 02-items-equipment.md:47 -> DEVELOP.md:63  [IDMISS] no claim identifier on the line: 10174  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:47 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:47 -> docs/save-layout/coverage-map.md:11  [IDMISS] no claim identifier on the line: 10174  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:47 -> docs/save-layout/coverage-map.md:139  [IDMISS] no claim identifier on the line: 10174  | | `0x335A8..0xBC5A8` | 采样点 52%（4KB）| 密集成员记录区候选 ~561KB（0x8900
WARN 02-items-equipment.md:48 -> DEVELOP.md:63  [NEAR] claim appears at line 65: 0x278  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:48 -> DEVELOP.md:85  [IDMISS] no claim identifier on the line: 0x278  | | PatchDesign §3(c)「扩容+等量缩短 0xFF0 组块」 | **否决** | 0x17CF 之后不是
WARN 02-items-equipment.md:49 -> DEVELOP.md:60  [NEAR] claim appears at line 62: 0x8FC 0xBB0  | | 容器 | 36 B 头 + 3 个槽块；槽头 u32 @0x34/0x38/0x3C；槽数据跨距 0x11F8C4 
WARN 02-items-equipment.md:49 -> tools/box-slot-tool.mjs:32  [IDMISS] no claim identifier on the line: 0x8FC 0xBB0  | const DEF_BASE=0x278, DEF_N=2992, BITS=19;
WARN 02-items-equipment.md:50 -> tools/box-slot-tool.mjs:32  [IDMISS] no claim identifier on the line: 0x7FFFF  | const DEF_BASE=0x278, DEF_N=2992, BITS=19;
WARN 02-items-equipment.md:50 -> DEVELOP.md:62  [IDMISS] no claim identifier on the line: 0x7FFFF  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:52 -> DEVELOP.md:66  [IDMISS] no claim identifier on the line: 0xFFF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:53 -> DEVELOP.md:62  [NEAR] claim appears at line 64: 0x63  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:53 -> HANDOFF.md:88  [IDMISS] no claim identifier on the line: 0x63  | 0x0278          member[0] 道具箱（2300 位流 + 组名块 24×170）
WARN 02-items-equipment.md:53 -> tools/box-slot-tool.mjs:81  [IDMISS] no claim identifier on the line: 0x63  | if(cmd==="write"&&(isNaN(+c)||+c<0||+c>0x7F)){console.error(
WARN 02-items-equipment.md:53 -> tools/box-slot-tool.mjs:99  [IDMISS] no claim identifier on the line: 0x63  | v=(v&~(0x7FFFF<<o))|((((count&0x7F)<<12|(id&0xFFF))<<o)>>>0)
WARN 02-items-equipment.md:55 -> tools/box-slot-tool.mjs:82-89  [IDMISS] no claim identifier on the line: 10174  | // TOOL-4: writing into slots >=2300 is only valid on the V7
WARN 02-items-equipment.md:55 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x17CF 0x1E39 0x1E3A 0x27BE  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:55 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:62 -> docs/save-layout/coverage-map.md:140  [IDMISS] no claim identifier on the line: 0x27BF 10175 10250 10251  | | `0xBD4B1..0xBD722` | 全 `0x10` | **625B 完整 `0x10` 段**（**不是*
WARN 02-items-equipment.md:62 -> docs/save-layout/coverage-map.md:206  [IDMISS] no claim identifier on the line: 0x27BF 10175 10250 10251  | | [14] | `0x335A8..0x34E10` | 6,248 | 13×470B 记录（stride 564）
WARN 02-items-equipment.md:62 -> HANDOFF.md:88  [NEAR] claim appears at line 89: 0x27BF 10175 10250 10251  | 0x0278          member[0] 道具箱（2300 位流 + 组名块 24×170）
WARN 02-items-equipment.md:63 -> docs/save-layout/pouch-verified.md:4  [NEAR] claim appears at line 3: 10175  | 与道具箱（char_off 632 起）**同一套编码**，只是槽数 32（32×19/8 = 76B）。
WARN 02-items-equipment.md:67 -> docs/save-layout/coverage-map.md:11-13  [IDMISS] no claim identifier on the line: 10174 10251  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:67 -> DEVELOP.md:285  [IDMISS] no claim identifier on the line: 10174 10251  | - 单例 GOT：口袋 `0x183A828→0x18584B8`，道具箱 `0x183A81C→0x1858438`（
WARN 02-items-equipment.md:73 -> docs/mechanics/equipment.md:401-402  [NEAR] claim appears at line 398: 0x62EE 0x17C2E 25326 72000 97326  | | 随从猫记录 | 146358 / `0x23BB6` | 27216 | 84 × 324B（`CatsForm`）
WARN 02-items-equipment.md:73 -> DEVELOP.md:69  [NEAR] claim appears at line 71: 25326 72000 97326  | | 真实道具种类 | **2940**（MHGU 名录）/2955（MHXX 名录），最大真实 id 2976 | MH
WARN 02-items-equipment.md:73 -> docs/save-layout/coverage-map.md:28  [IDMISS] no claim identifier on the line: 0x62EE 0x17C2E 25326 72000 97326  | | `0x335A8..0x3E3E5` | ~44KB | 未测绘 | ✗ |
WARN 02-items-equipment.md:73 -> docs/save-layout/coverage-map.md:144  [IDMISS] no claim identifier on the line: 0x62EE 0x17C2E 25326 72000 97326  | | `0x1175A8..0x11F8A0` | 0→14→3% | 尾部标志位收尾（~52KB）|
WARN 02-items-equipment.md:98 -> DEVELOP.md:71  [NEAR] claim appears at line 73: 0x208CE 0x21E0E 133326 138766  | | **装备箱区** | `+0x62EE..+0x17C2E` = 2000 × 36B 猎人装备箱（首条 `ee 0
WARN 02-items-equipment.md:108 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17CF 0xFF0 10175  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:108 -> DEVELOP.md:148  [IDMISS] no claim identifier on the line: 0x17CF 0xFF0  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:108 -> docs/save-layout/coverage-map.md:11  [IDMISS] no claim identifier on the line: 10175  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:109 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x1E3A  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:109 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10175 10118 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:109 -> tools/build-v7-final.mjs:14-15  [IDMISS] no claim identifier on the line: 10175 10118 10174  | A("0019a648","852900E3","preset block write len 2437");
WARN 02-items-equipment.md:109 -> tools/build-v7-final.mjs:44  [IDMISS] no claim identifier on the line: 0x1E3A  | [0x64C2, 0x74FA],                            // D base (incl
WARN 02-items-equipment.md:112 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17F9  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:114 -> DEVELOP.md:144-145  [NEAR] claim appears at line 146: 0x6320 0x6DC4 0xAA  | | 清零长度 | 0x59D8/0x47E0 | 0x64A8/0x52B0 |
WARN 02-items-equipment.md:120 -> DEVELOP.md:66  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:120 -> DEVELOP.md:67  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | **校验和** | **无 CRC/hash**（容器头 0x36B2EE74 为格式常量，非校验；编辑器整块回写不
WARN 02-items-equipment.md:120 -> DEVELOP.md:62  [NEAR] claim appears at line 64: 0xBAE 0xBAF  | | **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`
WARN 02-items-equipment.md:131 -> HANDOFF.md:41-42  [NEAR] claim appears at line 42: 0x11F8A0 0x18CC9C 0x2AC560 0x3CBE24 1,177,760 1,177,759  | | `.text` | `0x100 .. 0x13F1DEC`（20.8MB / 5,228,411 指令）|
WARN 02-items-equipment.md:131 -> docs/README.md:58  [IDMISS] no claim identifier on the line: 1,177,760 1,177,759 1625244 2803040 3980836  | | `fields/fam-small.md` | 68B 位图 / 164B 双槽 / 20B 勋章 / 尾 3444
WARN 02-items-equipment.md:140 -> DEVELOP.md:63  [NEAR] claim appears at line 66: 0x17CF 0x1E3A 0x27BF 10175 10250 10251  | | 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)
WARN 02-items-equipment.md:140 -> DEVELOP.md:148  [NEAR] claim appears at line 150: 0x17CF 0x1E3A 0x27BF  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:140 -> docs/save-layout/coverage-map.md:11-13  [IDMISS] no claim identifier on the line: 10175 10250 10251  | - **整块字段级**：**≈ 175,222 B / 1,177,760 B ≈ 14.9%**（权威口径见 `doc
WARN 02-items-equipment.md:154 -> DEVELOP.md:290  [NEAR] claim appears at line 292: 0xFF 0x4447 0x4598 17479 17816  | - 15×128B 定长结构化记录，**不是位域**；三组各 15 个 `movw` 站点（0x51D7D8..、0x5
WARN 02-items-equipment.md:156 -> DEVELOP.md:148  [IDMISS] no claim identifier on the line: 0xFF0  | | 对象大小 | 0x72E4 | **0x7DB4** |
WARN 02-items-equipment.md:159 -> docs/mechanics/equipment.md:633-636  [IDMISS] no claim identifier on the line: 36,000 108,000  | | 5 | `awaken` 全空、`max_attack`/`tree_depth` 恒 0 | 10877 条记录实
WARN 02-items-equipment.md:160 -> docs/mechanics/equipment.md:651  [IDMISS] no claim identifier on the line: 2,064  | | 23 | 套装 136B 记录的 94B 内容 | 编辑器只解析/写 42B 名；其余未解码 | 禁写；要改套装内容
WARN 02-items-equipment.md:160 -> DEVELOP.md:66  [IDMISS] no claim identifier on the line: 0x21E0E 0x2261D 0x22612 2,064  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:166 -> DEVLOG.md:58  [IDMISS] no claim identifier on the line: 10118 10174  | - 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
WARN 02-items-equipment.md:176 -> DEVLOG.md:38-49  [NEAR] claim appears at line 41: 0x17CF 0x17F9 0x1879 10175  | ### 关键发现：0xFF0 "组名块" = 24×170B **道具预设**（item-group preset）
WARN 02-items-equipment.md:176 -> DEVELOP.md:64  [NEAR] claim appears at line 66: 0x17CF 0x17F9 0x1879 10175  | | 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**
WARN 02-items-equipment.md:176 -> docs/save-layout/CURRENT-RULING.md:52  [IDMISS] no claim identifier on the line: 10175  | - **套装名/预设名字段宽实测定案 = 42B**（rec0「设置01」NUL pad 到 +42，+42 起装备对）
WARN 02-items-equipment.md:178 -> HANDOFF.md:94  [IDMISS] no claim identifier on the line: 0x21E0E 0x2C6B4 0x22612  | 0x60CA          volume 137×[u16 mini,u16 maxi] (548B) → 2532
WARN 02-items-equipment.md:182 -> HANDOFF.md:42  [NEAR] claim appears at line 43: 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 02-items-equipment.md:187 -> DEVELOP.md:66  [NEAR] claim appears at line 64: 0xBAF  | | 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1
WARN 02-items-equipment.md:200 -> HANDOFF.md:42  [NEAR] claim appears at line 43: 3980836  | | `char_off` | 猎人块 `.hnt` 内偏移（块长 **1,177,760 B**）|
WARN 03-quests-monsters-palico.md:48 -> docs/save-layout/CURRENT-RULING.md:6  [IDMISS] no claim identifier on the line: 0x2C77 0xFF 11383  | | **存档位域** | obj+0x42C(cleared)/+0x52C(seen)/+0x62C(achieve)
WARN 03-quests-monsters-palico.md:49 -> docs/mechanics/quests.md:614-615  [IDMISS] no claim identifier on the line: 11639  | - **不变量**：`cleared ⊆ seen`。旧编辑器只写 cleared 造成 501 个 `cleared=
WARN 03-quests-monsters-palico.md:50 -> docs/mechanics/quests.md:720  [IDMISS] no claim identifier on the line: 0x2E77  | | 7 | `achieve`（0x62C）语义 | 未确认 | 可能与勋章/称号共用流程 |
WARN 03-quests-monsters-palico.md:92 -> docs/save-layout/coverage-map.md:221  [NEAR] claim appears at line 224: 0x5EA6 0x5FB7 0x5EA2 0x5EA5 24230  | | `0x27BF..0x280A` | 76 | member[1] 口袋 32 槽位流 | 前段已定 |
WARN 03-quests-monsters-palico.md:92 -> docs/save-layout/coverage-map.md:242-243  [IDMISS] no claim identifier on the line: 24230  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:93 -> docs/save-layout/coverage-map.md:222  [IDMISS] no claim identifier on the line: 0x5FB8 0x60C9 24504  | | **`0x280B..0x2C0A`** | **1024** | member[2] 外层头（`mov r2,#1
WARN 03-quests-monsters-palico.md:93 -> docs/save-layout/coverage-map.md:242  [IDMISS] no claim identifier on the line: 24504  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:94 -> docs/save-layout/coverage-map.md:242-243  [IDMISS] no claim identifier on the line: 24778  | **合计：大怪 94 + 小怪 43 = 137，无保留槽。**
WARN 03-quests-monsters-palico.md:94 -> docs/save-layout/coverage-map.md:263  [NEAR] claim appears at line 261: 24778  | | clean 猎人A | kill&vol=20, **vol_only=22** | kill&vol=33, vo
WARN 03-quests-monsters-palico.md:110 -> docs/save-layout/coverage-map.md:359-361  [NEAR] claim appears at line 360: 0x23BB6 0x2A606  | member[7] 的 108 条 324B 记录**全部是随从猫**：`obj 0x13938 + 108×0x560
WARN 03-quests-monsters-palico.md:110 -> docs/save-layout/coverage-map.md:392  [IDMISS] no claim identifier on the line: 0x23BB6 0x2A606  | 7 个读块：`+0x000/32`(名字) → `+0x020/224`(主体) → `+0x100/14`(7×u16
WARN 03-quests-monsters-palico.md:130 -> docs/mechanics/skills-arts.md:523-525  [IDMISS] no claim identifier on the line: 0x2C2B  | - **编辑器已知缺口**：只写 46/72B —— `0x2C13 + 46 = 0x2C41`，距 X3 起点 `0
WARN 03-quests-monsters-palico.md:130 -> DEVELOP.md:245  [IDMISS] no claim identifier on the line: 11307  | **known-limitation（非崩溃，待实机/测绘）**：狩技只写 46/72B（X3 24B 不落盘）、~~导
WARN 03-quests-monsters-palico.md:139 -> DEVELOP.md:240  [IDMISS] no claim identifier on the line: 12631  | | 错值 | 还原清全局 modifyState/unsavedState（丢其他窗体修改） | CatsForm.cs
WARN 03-quests-monsters-palico.md:262 -> docs/save-layout/CURRENT-RULING.md:42  [IDMISS] no claim identifier on the line: 11501  | 位号 = **记录序号 i**；i 与 questId 在 M1 下相差 ≤1bit（边界对齐 + Hunter Tra
WARN 03-quests-monsters-palico.md:267 -> docs/mechanics/quests.md:720  [IDMISS] no claim identifier on the line: 0x2E77  | | 7 | `achieve`（0x62C）语义 | 未确认 | 可能与勋章/称号共用流程 |
WARN 03-quests-monsters-palico.md:268 -> docs/mechanics/quests.md:692-697  [NEAR] claim appears at line 693: 0x3618 0x7F000  | - case11: [member#4+0x958] & bit20（猎人块内，可写）
WARN 03-quests-monsters-palico.md:280 -> docs/save-layout/member4-semantics.md:237-240  [IDMISS] no claim identifier on the line: 0x2FC7 0x306B 0x311F 0x50BA  | 5. **`obj+0x9D0`/`0xB18`/`0xBDC`/`0x3684` 的「编辑器毁档」归因仍然错误**（既
WARN 03-quests-monsters-palico.md:283 -> docs/save-layout/coverage-map.md:306  [IDMISS] no claim identifier on the line: 0x28  | **代码性质**（WriteSideDesc）：写侧 `0x3e11a8` 先拼 632B 头写入流，再 `bl 0x3

resolved 582 references: 487 ok, 95 warn, 0 fail
CITATION CHECK PASSED
```

## Difficulties

- **The resolver's identifier check is advisory by construction.** A source line can support a claim without
  repeating the offset (the container row, the `.hnt` block, most prose sections), so making a token miss fatal
  would fail valid citations. The hard failure set is limited to references that cannot be read at all. The cost is
  95 remaining WARNs, listed in Appendix B; 35 are `NEAR` (a token within ±3 lines) and 60 are `IDMISS`. Triaging
  them against the source semantics is what LINK2 did by hand; the tool now makes that triage reproducible.
- **`DEVELOP.md` is partly mojibake in the committed tree.** Lines 63-321 read as GBK bytes decoded as UTF-8, but
  the line numbering and ASCII fragments are stable, so citations resolve; I did not "repair" the file. Its table
  layout also means several old references pointed at separators (`58`, `217`, `228`), which the separator rule
  catches. This is pre-existing repo damage, not caused by this task.
- **Line numbers moved while the first wave ran.** LINK2 recorded that `02` changed under it at 06:35. I re-read
  every target line at edit time and the resolver was run after the edits; the before-run uses the `HEAD` copies,
  so it is reproducible.
- **The first-wave count is not directly comparable.** LINK2's resolver reported 413 references / 267 unique
  reference-target pairs; this one expands every comma-continued spec and lists each spec separately (588 at HEAD).
  It also rejects table separators, which a target citation never means. The count is larger; the defect class is
  the same.
- **The `write` tool was not used for the docs.** All edits went through Node scripts on exact line numbers, with
  a `NOT FOUND` abort if the expected substring was absent on that line; this avoided silent edits to the
  concurrently-changing files.
