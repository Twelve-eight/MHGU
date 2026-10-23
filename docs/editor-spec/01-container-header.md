# 01 -- Container, Slot Blocks, Character Header (SPEC)

Status: step-1 field spec. Step 2 implements from this file only. Rows marked
**UNCONFIRMED** must be coded to the conservative placeholder given here, not guessed
further; rows absent from this file must not be written at all.

## Scope

This file specifies, for MHGU (Switch, 1.4.0) saves:

1. the `system` container: total size, 36 B file prefix, payload, 3 hunter slot blocks,
   the per-slot offset table and the per-slot used flags;
2. the `.hnt` single-slot export: size, relation to a slot block, import/export rules;
3. the character header at `char_off 0x0000..0x002F` (fields through `0x002A`: name,
   playtime, gold, HR, gender; `0x002B..0x002F` is preserved);
4. the nature of the 632 B header at `char_off 0x0000..0x0277` (its first 48 bytes are the
   character header above; the whole 632 B is do-not-edit outside the rows in `## Fields`);
5. the nature of the tail region `char_off 0x3783A..0x11F8A0` (pass-through cache:
   preserve bytes).

Out of scope here: member data `char_off 0x0278..0x3783A`, the internal containers of the
tail, localization, and tooling. Those get their own spec files.

### Coordinates (read before any offset in this file)

| Name | Definition | Source |
|---|---|---|
| `char_off` | Offset inside one hunter block; block length **1,177,760 B** (`0x11F8A0`). Valid `char_off` = `0..1177760`. | HANDOFF.md:41, coverage-map.md:7 |
| `system` file offset | `hunterAdds[slot] + char_off`, with `hunterAdds = [0x18CC9C, 0x2AC560, 0x3CBE24]` (`1625244, 2803040, 3980836`). | HANDOFF.md:42, tail-containers.md:3 |
| payload-relative offset | `system` file offset - **0x24** (the payload starts after the 36 B file prefix). | social-checksum.md:271 `[A]` |
| `system` anchors | slot0 origin `0x18CC9C` (dirty sample `save-snapshots/20261022-v6-ready/system`); slot1 origin `0x2AC560` (clean sample `save-snapshots/20261022-clean-reference/system_CLEAN`). | HANDOFF.md:43 |
| `.hnt` offset | Identical to `char_off`; the `.hnt` file **is** one hunter block with no extra header. | DEVELOP.md:59 |

### Source policy

The authoritative source set for this spec is our own published research: `docs/save-layout/`,
`DEVELOP.md`, `HANDOFF.md`, `docs/mechanics/`. Two fact groups are published only in our own
analysis notes: the container header byte roles at `system 0x0028/0x0034/0x0050` and the
per-segment sources of the 632 B header. They are cited with an `[A]` marker so the step-2
implementer can see which rows rely on secondary notes and re-verify those rows against a
sample before shipping. No material from `editor-src/` or any third-party editor was used.
Citation line numbers are pinned to the documents as of 2026-10-23; those logs are
append-only and still growing, so if a cited line has drifted, fall back to the quoted
phrase or to the section title named in this file.
Evidence markers: `[B]` measured bytes on the published samples, `[D]` derived from our
published disassembly notes, `[A]` our own analysis note outside `docs/save-layout`, `[I]`
inference / **UNCONFIRMED**.

**No checksum.** `system` and `.hnt` carry no CRC/hash; any byte edit is structurally legal
(DEVELOP.md:160). Correctness is therefore purely a semantic concern -- which is why the
MUST-NOT list below is strict.

## Fields

| name | location | size/encoding | valid range | write rule | source |
|---|---|---|---|---|---|
| system file size | `system` whole file | 5,159,100 B (`0x4EB8BC`) | exactly this | read-only invariant; reject a file of any other size; never resize | DEVELOP.md:57 |
| file prefix (container header) | `system 0x0000..0x0023` | 36 B | n/a | preserve byte-exact; only the two constants below are decoded, and even they are never written | DEVELOP.md:58 |
| container format stamp | `system 0x0014` | u32 LE = `0x36B2EE74` | constant | never write, never verify, never recompute | social-checksum.md:200, 284-285 `[A]` |
| payload length | `system 0x001C` | u32 LE = `0x4EB898` (5,159,064) | constant | never write | social-checksum.md:200 `[A]` |
| payload body | `system 0x0024..0x4EB8BB` | 5,159,064 B | byte array | load whole; every byte not named by a spec stays as loaded | social-checksum.md:271 `[A]` |
| payload format version | `system 0x0024` (payload+`0x00`) | u8 = `0xC6` (198) | `0xC6` only | preserve; never write | social-checksum.md:285-286 `[A]` |
| pre-slot payload region | `system 0x0024..0x18CC9B` | 1,625,208 B | n/a | preserve; holds the container tables near its start (rows below) plus undocumented system-wide data; no other byte in this range is editable | DEVELOP.md:57-58; arithmetic from `hunterAdds[0] - 0x24` `[I]` |
| slot count | container | 3 slots, indices 0..2 | 0,1,2 | hard-code 3; never probe for a 4th | DEVELOP.md:58; coverage-map.md:403 |
| slot offset table | `system 0x0034 + 4*slot` (payload+`0x10+4*slot`) | 3 x u32 LE, payload-relative | each value `< 0x4EB898` | read-only; never rewrite; do not derive file offsets from it without a byte check (Gaps 1) | DEVELOP.md:58; social-checksum.md:107-108 `[A]` |
| slot-used flag (existence byte) | `system 0x0028 + slot` (payload+`0x04+slot`) | u8 | `0` = empty, `1` = used | preserve by default; the only permitted change is setting `1` together with a complete 1,177,760 B block. Clearing a slot to `0` is unspecified (Gaps 2); **NEVER at `system 0x0004+slot`** | social-checksum.md:283 `[A]`; DEVELOP.md:220 |
| slot state word | `system 0x0050 + 4*slot` (payload+`0x2C+4*slot`) | u32 LE | must equal `1` for a used slot | read-only; never write | social-checksum.md:82-83 `[A]` |
| slot block origin | `system 0x18CC9C` / `0x2AC560` / `0x3CBE24` (slots 0/1/2) | 1,177,760 B each | n/a | `char_off = system_offset - hunterAdds[slot]`; a `.hnt` is a byte-for-byte copy of one block | HANDOFF.md:41-43; tail-containers.md:3 |
| slot block stride | distance between consecutive origins | `0x11F8C4` = 1,177,796 B = 1,177,760 + 36 | fixed | never use the stride as a data length; the extra 36 B per slot is unmapped by this spec (Gaps 1) | DEVELOP.md:58; social-checksum.md:125 `[A]` |
| `.hnt` file | any `*.hnt` in the save directory | 1,177,760 B, no header, no footer | exactly this | reject other sizes; read/write whole block; `char_off` applies unchanged | DEVELOP.md:59 |
| `.hnt` <-> `system` slot equivalence | n/a | equality ratio of the two copies | no guarantee | MUST compare before any import/export that combines them; if they differ, treat as two snapshots and never mix bytes | HANDOFF.md:191; coverage-map.md:374-386 |
| `.hnt` import / export | whole block | 1,177,760 B | exactly this | import writes **all** 1,177,760 B in 512 B diff blocks, last block clamped to `min(512, 1177760-i)`; export dumps exactly 1,177,760 B | DEVELOP.md:243; HANDOFF.md:107 |
| character name | `char_off 0x0000..0x001F` | UTF-8 byte string in a 32 B field, NUL-padded | NUL-terminated; documented samples are 9 B (`猎人A`, `猎人B`); published notes say width 20 B / ~16 B -- **UNCONFIRMED**; treat the safe limit as 16 characters and 31 B | write field-wide: zero all 32 B, then write the UTF-8 name plus at least one NUL; never split a multi-byte sequence; never write outside `0x0000..0x001F` | coverage-map.md:297; CURRENT-RULING.md:58; HANDOFF.md:85; write-side-desc.md:335 `[A]` |
| playtime | `char_off 0x0020..0x0023` | u32 LE, seconds | `0..0xFFFFFFFF`; observed `70,310` and `1,560,082`; UI cap **UNCONFIRMED** (placeholder: `359,999,999` s) | write u32 LE; keep the mirror at `char_off 140427` untouched (other spec) | coverage-map.md:298; systems.md:871; write-side-desc.md:336 `[A]` |
| gold (zenny) | `char_off 0x0024..0x0027` | u32 LE | `0..0xFFFFFFFF`; observed `3,355,345` and `8,345,419`; gameplay cap **UNCONFIRMED** (placeholder: `99,999,999`) | write u32 LE; if the `char_off 10255` mirror is written too, both values MUST match | coverage-map.md:299; systems.md:872; write-side-desc.md:337 `[A]` |
| HR | `char_off 0x0028..0x0029` | u16 LE | `0..0xFFFF` structurally; observed `8` and `198`; gameplay cap **UNCONFIRMED** (placeholder: `999`) | write u16 LE; MUST also write the second copy at `0x00B1` in the same transaction | coverage-map.md:300; systems.md:873; CURRENT-RULING.md:58; write-side-desc.md:338 `[A]` |
| HR second copy | `char_off 0x00B1..0x00B2` | u16 LE | same as `0x0028` | MUST always equal `0x0028`; write both or neither | coverage-map.md:334; write-side-desc.md:342, 357-358 `[A]` |
| gender | `char_off 0x002A` | u8 | `0`, `1`, `2` (2 = special / not-initialised state produced by the game) | write only `0` or `1`; preserve a value of `2`; never write other values | coverage-map.md:301, 334; systems.md:874; write-side-desc.md:339 `[A]` |
| save-kind byte | `char_off 0x002B` | u8 | **UNCONFIRMED** (candidate: manual vs auto save; the only observed writer passes `1`) | never write; preserve | write-side-desc.md:340, 470 `[A]` |
| 632 B header (whole) | `char_off 0x0000..0x0277` | 632 B | n/a | only `0x0000..0x002A` is editable (rows above); `0x002B..0x0277` MUST be preserved byte-exact, with the single exception of the HR second copy at `0x00B1` | coverage-map.md:301-318 |
| opaque 224 B block | `char_off 0x002C..0x010B` | 224 B, opaque | n/a | never write, except the HR second copy at `0x00B1..0x00B2` (HR row); the block is copied into a runtime object when the save is opened, so it is not inert padding | write-side-desc.md:341 `[A]`; social-checksum.md:87-88 `[A]` |
| 7 x 44 B equipment snapshots | `char_off 0x010C..0x023F` | 308 B, 7 records x 44 B | n/a | never write; each record starts with the runtime vptr `0x0193A514`, so writing here injects host pointers | coverage-map.md:333; HANDOFF.md:85-86 |
| appearance head + colours | `char_off 0x0240..0x026F` | 48 B: 12 B + 16 B + 20 B (six feature bytes at `0x0241..0x0248`, 4 x RGBA at `0x0260..0x026F`) | n/a | never write | write-side-desc.md:343-346 `[A]` |
| stack residue | `char_off 0x0270..0x0273` | 4 B | any | preserve; the game never writes it and may change it between saves; never use it as a validity check | HANDOFF.md:85-86; coverage-map.md:333 |
| final header u32 | `char_off 0x0274..0x0277` | u32 | n/a | never write | write-side-desc.md:348 `[A]` |
| member region | `char_off 0x0278..0x3783A` | 227,386 B | n/a | owned by the member specs; this file only requires that untouched bytes stay untouched | HANDOFF.md:87-103; coverage-map.md:199-210 |
| tail pass-through cache | `char_off 0x3783A..0x11F8A0` | 950,374 B (81 % of the block) | arbitrary bytes | copy the loaded buffer back verbatim; no field edits; never zero, pad, regenerate or "clean" it | HANDOFF.md:103; coverage-map.md:268-299, 374-386 |

## Invariants

1. **Coordinate closure.** Every address in this file is one of: `char_off` (0...1,177,759),
   `system` file offset, or payload-relative (`system` - `0x24`). A byte is never addressed
   by "block number + raw file offset" without naming the coordinate system.
2. **Slot completeness.** A slot is offered to the user as used only when all three hold:
   slot-used flag = 1, slot state word = 1, and a full 1,177,760 B block is readable at
   `hunterAdds[slot]`. Any mismatch -> surface as corrupt, do not write.
3. **HR dual copy.** `char_off 0x0028` and `char_off 0x00B1` are two copies of one runtime
   `u16`; they must always compare equal in a file the editor produces.
4. **632 B header is a summary, not authority.** The save path rebuilds all 632 B from
   runtime objects (including 4 B of stack residue), and the save-load path (`0x3e0db8`)
   discards the 632 B after `memcpy`. Edits inside `0x0000..0x002A` at best change the
   slot-select display and are reverted by the next in-game save; never promise persistence
   for them (coverage-map.md:303; write-side-desc.md:407-413 `[A]`).
5. **Tail is preserved, not parsed.** No reader consumes bytes at or after
   `char_off 0x3783A`, and no writer writes them; the loaded buffer is re-saved as-is
   (coverage-map.md:272-273, 268-299; write-side-desc.md:530-532 `[A]`). Editor edits there
   survive a game save, but the region is not part of the serialised schema.
6. **No checksum.** No CRC/hash exists anywhere in `system` or `.hnt`; the editor must
   neither compute nor validate one (DEVELOP.md:160).
7. **`cleared` is a subset of `seen`.** In the quest bitmaps, a bit may not be set in the
   cleared map while it is clear in the seen map (CURRENT-RULING.md:45). Any whole-slot
   operation must preserve this invariant. Coordinates belong to the member#4 spec.
8. **Byte conservation.** Writes are whole-file diff writes: only the bytes named by a write
   rule may change; every other byte of `system` (and of a `.hnt` on export) is byte-identical
   to the loaded image. `.hnt` import replaces all 1,177,760 B deliberately.
9. **`.hnt` and `system` slots are independent snapshots.** No implicit sync; equality is
   measured, not assumed (`hunterA.hnt` vs slot1: members 86.76 %, tail 14.64-18.01 %;
   `hunterB.hnt` vs clean slot0: members 99.31 %, tail-mid 100.00 %) (HANDOFF.md:191,
   coverage-map.md:374-386).
10. **Idempotence.** Writing the same field value twice produces identical bytes: fixed
    widths, explicit zero-padding, no residual bytes from the previous value.

## MUST NOT write

| # | forbidden target | reason | source |
|---|---|---|---|
| M1 | `system 0x0000..0x0023` (36 B file prefix), incl. stamp `0x0014` and length `0x001C` | container metadata; the stamp is a format constant that no code validates, so a wrong value is not detected but is still corruption | DEVELOP.md:58; social-checksum.md:200, 284-285 `[A]` |
| M2 | `system 0x0024` (payload version), `0x0034..0x003F` (offset table), `0x0050..0x005B` (state words) | only the game may author these; see Gaps 1-2 before touching any of them | social-checksum.md:82-83, 107-108, 285-286 `[A]` |
| M3 | `system 0x0004 + slot` | the old editor's "slot flag" write target; it polluted the 36 B file prefix. The flag lives at `0x0028 + slot` | DEVELOP.md:220 |
| M4 | `char_off 0x002B..0x0277`, except `0x00B1..0x00B2` (HR copy) | remainder of the write-only 632 B summary: 224 B opaque block, 7 x 44 B records carrying a host vptr, appearance/colour block, stack residue, final u32 | coverage-map.md:301-334; HANDOFF.md:85-86 |
| M5 | `char_off 0x0278..0x3783A` | member data; only the member specs may write inside it | HANDOFF.md:87-103 |
| M6 | `char_off 0x3783A..0x11F8A0` | pass-through cache: no reader, no writer, host memory residue inside; any change is unexplained risk with zero benefit | coverage-map.md:268-299, 374-386 |
| M7 | **0xFF flood / range fill** anywhere | the old editor painted ranges to mean "unlock": skill arts `0xD24`(19 B)/`0xD3C`(7 B), bitmaps `0x42C`(38 B)/`0x52C`(56 B), 164 B arrays, medal neighbourhood, 128 B record family `0x2DF8/0x2E78/0x2EF8/0x2F78`, cat-gear area `0x4447..0x4598` (182 x `0xFF`). Fill-by-range is forbidden; write exact fields only | CURRENT-RULING.md:64-71, 92-93 |
| M8 | a cleared bit without its seen bit, or a blind `cleared &= seen` cleanup | produces impossible states that deadlock NPC dialogue; the 122 known contradictory bits were traced to unlock flooding and need a player list, not a blanket rule | CURRENT-RULING.md:14-25, 45, 64-71 |
| M9 | any 512 B chunk that crosses `char_off 1,177,760` | `1,177,760 % 512 = 160`; an unclamped last chunk reads past the buffer and writes 352 B into the next slot header | DEVELOP.md:243; HANDOFF.md:107; social-checksum.md:293-295 `[A]` |
| M10 | mixing `.hnt` bytes with a `system` slot that is not byte-equal | two snapshots of the same hunter can differ in the tail by >80 %; mixing silently loses progress | HANDOFF.md:191; coverage-map.md:374-386 |
| M11 | resizing either file, or "fixing" a checksum | sizes are format constants and no checksum exists | DEVELOP.md:57-59, 160 |
| M12 | `char_off 0x002B` (unknown save-kind) and `0x0270..0x0273` (stack residue) | no documented semantics; residue varies between saves | write-side-desc.md:340, 365-370 `[A]` |

## Gaps

| # | gap | impact | how to close |
|---|---|---|---|
| 1 | **Slot offset table values and the 36 B per slot.** Docs publish the table location (`system 0x0034+4*slot`) and the code relation `dest = payload + offset[slot]`, and they publish stride `0x11F8C4` = 1,177,760 + 36. Concrete table values are not published, so the 36 B per slot is either a block header before each `char_off` origin or unread bytes between blocks. | An implementation cannot reconstruct slot origins from the payload; it must use the fixed `hunterAdds` table. A +/-36 B mistake silently shifts every field. | Dump the three u32 at `system 0x0034/0x0038/0x003C` in both published samples and compare with `hunterAdds[i]` and `hunterAdds[i] - 0x24`. |
| 2 | **Slot-used flag semantics.** The flag byte is read by the code and the state word must equal 1, but no published byte-level test shows what the game does with flag 1 + stale/absent block, or what clearing a slot (flag 0 while the state word stays 1) does. The `system` file coordinate `0x0028+slot` is an arithmetic join of the payload base and the code's payload+4+slot. | Writing a "new" slot may be ignored or may produce a corrupt slot entry; a "delete slot" feature cannot be specified at all. | A/B test on a copy: set flag 1 for an empty slot, load, record result; then clear it for a used slot. |
| 3 | **Third hunter slot.** No published sample of a used slot2 is documented: the only slot2 evidence is that its 16 B tail array is zero (`coverage-map.md:403`), and `member15.md:9` records slot2 as empty `[A]`. The representation of an empty block (all-zero vs absent) is likewise unconfirmed. | A 3-slot UI may expose an operation the samples never exercised. | Compare a save that really has three hunters, or create slot2 in-game and diff. |
| 4 | **`.hnt` <-> slot identity.** No published mapping says which `.hnt` belongs to which slot (file name? `char_off 0x002B`? save order?). It is also unproven that the game itself reads `.hnt` files rather than only `system`. | An import into the wrong slot silently overwrites another hunter; an export labelled "slot 1" may be stale. | Byte-compare each `.hnt` against the three blocks; test whether the game reacts to a modified `.hnt` without a `system` change. |
| 5 | **Name limits.** Field width is 32 B (writer `memcpy`), but published notes also say UTF-8 ~16 B and `UTF-8[20]`; the per-character limit, truncation policy, and terminator padding are unconfirmed. | Truncating mid-codepoint or leaving garbage after the terminator may show a broken name in the slot list. | In-game test with maximum-length and multi-byte names; inspect the 32 B field after the game saves. |
| 6 | **HR.** Upper bound and whether the game consumes `0x0028`, `0x00B1` or both are unconfirmed; the old editor never implemented HR ("HR 不可编辑", DEVELOP.md:245). | HR edits may be ignored or reverted. | Change both copies on a copy, load, level up once, re-dump. |
| 7 | **Gold / playtime mirrors.** A gold mirror at `char_off 10255` and a playtime mirror at `140427` are documented as editor targets, but the 1024 B block containing the gold mirror is explicitly **UNCONFIRMED** as to semantics (`member4-header.md:240` `[A]`) and is overwritten on load (`member4-header.md:165` `[A]`). | Writing only `0x0024` may leave an inconsistent summary; writing the mirror may have no effect. | Re-derive the 1024 B block; test a gold change with and without the mirror. |
| 8 | **Gender value 2.** Produced by the game when a runtime flag is set; meaning (uninitialised? special appearance?) and whether the game accepts other values are unknown. | UI must not "normalise" 2 to 0/1 and must not offer it as a choice. | Test a character in the special state and inspect the byte after save. |
| 9 | **Unmapped bytes of the 632 B header.** Field-level coverage is ~15 %; the 224 B block (`0x002C..0x010B`) and the scattered 4-6 B diffs around `0x13C..0x1C6` are not decoded. | These bytes must stay read-only; any UI exposing them would be guesswork. | Low value: the region is a write-only summary and its remaining bytes are rated low-value (`coverage-map.md:318`). |
| 10 | **Tail containers C0..C7.** Boundaries are structural only; no fixed offset table exists per save (`coverage-map.md:353`), and the 16 B header array appears in only one `system` slot snapshot (`coverage-map.md:403`). | Do not promise any field-level tail feature. | Not recommended (`coverage-map.md:406`). |
| 11 | **member#4 layout 4 B drift.** The 134-row layout table is off by 4 B somewhere after `char_off 0x3157`, which moves quest bitmap offsets. | Cross-file: the quest bitmaps referenced by invariant 7 may be addressed 4 B early in downstream code. | Tracked as HANDOFF.md:188 (issue 6); belongs to the member#4 spec. |
| 12 | **Remaining 36 B file prefix fields.** Only `0x0014` and `0x001C` are decoded; the other prefix bytes are opaque. | Must be treated as opaque; no UI. | Correlate across several saves / disassemble the block loader. |
| 13 | **`0x002B` save-kind byte.** Candidate meanings: manual vs auto save, slot number, save type. Only one writer site, passing `1`, is known. | Cannot be used to identify a slot. | Save manually and automatically in-game, diff the byte. |
