# `*_dtbase` / `*_dtbparts` (rEnemyDtBase / rEnemyDtBaseParts) — format spec

Source files: `romfs/nativeNX/arc/enemy/emNNN_00.arc` → `enemy\dt_base\emNNN_00_dtbase` (type `0x59d9c3da`) and `emNNN_00_dtbparts` (type `0x1bbc291e`), zlib-compressed in the arc. Extract with `node tools/mhgu/arc.mjs extract <arc> <outdir> "_dtbase$|_dtbparts$"`; decode with `node tools/mhgu/dtbase.mjs <file|arc>`.

Resource class: `rEnemyDtBase`, tag `dtb`, class size `0xD0`, property-registration fn `0x54028` (22 records; `0x53ea0` is the destructor; name pool 0x15530d7, 26 names — the 4 `Pos[i]` slots + 2 share-group members are registered through sub-object bases, hence 22 records for 26 names). Loader: fn `0x538bc`, stream object `{u8* base @+8, pos @+0xC, size @+0x10}`, bulk read = stream reader fn `0x82710c` (fast path `pos+count <= size` copies in memory — bcs @0x82712C falls back to `memcpy` fn `0x13EFE30`). `rEnemyDtBaseParts`, tag `dtp`, class size `0xD8`, class-name registration `bl 0x7aedcc` @0x5639c with `r3=0xD8` (`e3a030d8` @0x5636c).

Evidence tags: [C] = verified against instruction words and/or file bytes of em001/em020/em022; [B] = inferred from data shape; [U] = unknown.

## dtb header [C]

| Offset | Type | Value | Meaning |
|---|---|---|---|
| 0x00 | char[4] | `DTB\0` | magic; loader check `[sp+0x1C] == 0x00425444` (movw r1,#0x5444 @0x53980 `e3051444` + movt r1,#0x0042 @0x53984 `e3401042`, bne-fail @0x5398c `1a00013e`) |
| 0x04 | u32 | 0x15022601 | version; loader check `[sp+0x20] == 0x15022601` (`e3021601`+`e3411502`, bne @0x539a0 `1a000139`); bytes `01 26 02 15` |

## dtb sequential fields [C]

Loader order = file order (strictly sequential memcpy reads). "obj+X" = the rEnemyDtBase instance offset the loader writes to (`0x5310c`-style call args r1=obj+X, r2=count).

| Offset | Size | Field | obj+X | Loader site |
|---|---|---|---|---|
| 0x08 | 13×u8 | flags13 (kind switches for the conditional tail) | 0xBC..0xC8 | 0x539b8..0x53aa4 |
| 0x15 | f32 | BaseScale | 0x64 | 0x53ab4 (`e2891064`, r2=4) |
| 0x19 | u8 | Size | 0x68 | 0x53ac4 |
| 0x1A | u8 | Rank | 0x69 | 0x53ad4 |
| 0x1B | u8 | Nando | 0x6A | 0x53ae4 |
| 0x1C | u8 | SpDieDamageType | 0x6B | 0x53af4 |
| 0x1D | u32 | DamageOnBit | 0x6C | 0x53b04 |
| 0x21 | u8 | DropDataCount | 0xB8 | 0x53b14 |
| 0x22 | 0x14 | DropData (raw; 5×f32) | 0x98 | 0x53b24 (r2=0x14) |

Field values (em001/em020/em022): BaseScale 1.0/1.0/1.2; Size 8/8/8; Rank 2/2/2; Nando 0; SpDieDamageType 0; DamageOnBit 0x08400066/0x72/0x66; DropDataCount 0; DropData f32 [500,0,0,100,0] / [300,0,0,0,-1100] / [0,0,0,0,-500].

Member names for the loader offsets are the registered property names from fn `0x54028` (monster-classes.md "0x53ea0 — 22 个成员" lists the same records under the old fn attribution; re-verified: all 22 sites are `add r1, r10/r4/r5, #imm` immediates matching the table there). Registration/reader pairing ⇒ the 22 named members live across two sub-objects; the loader file order corresponds to the flat prefix above plus the conditional tail below.

## dtb conditional tail [C structure / U semantics]

After the prefix, driven by flags13 (obj+0xBC..0xC8):

1. if flags13[0xC8] (obj+0xC8): 1 byte "kind" (em001=02, em020/em022=03) → +0x94buf[0] [C]
2. if flags13[0xC5] (obj+0xC5) > 0: **flags13[0xC5] rows of 0x34 B total** — row 0 read to sp scratch @0x53b70, rows 1..count-1 loop @0x53b88 (r7=1..count-1) into +0x84buf; alloc = 52×count (smulbb) → +0x84ptr [C]
   - **0x34-row = u32 + 4×vec3 f32** (52 = 4+48), floats row-relative +4..+0x34 [C]
   - em001 template (200,0,0) (-200,0,0) (0,0,0) (-200,0,350); row1: (200,0,0) (-100,0,0) (0,0,0) (-100,0,330) [C]
   - semantics = PushHit/offset vec3 group (PushHitStandOfs/PushHitFlyOfs/PushHitKabeOfs family) [B]
3. Blocks A..J (loader 0x53bb0..0x53d50): conditional reads of 0x34 B→+0x88buf, 0x40 B→+0x74buf, 0x0C B→+0x78buf, 4 B→+0x8Cbuf, then 6 variable-size blocks whose guards are the flags13 pointer bytes ([sp]=obj+0xBE, [sp+4]=0xC0, [sp+8]=0xBC, [sp+0xC]=0xC1, [sp+0x10]=0xC2, [sp+0x14]=0xBF — `str r1,[sp,#n]` @0x539b4..0x53a2c). Guards read buffer[0] of other allocations (chained). Variable sizes (`e1a05100` r5 = X<<2, `e0600180` r0*7) not fully pinned down ⇒ remaining bytes emitted raw as `tailRaw` by the decoder [U].

These tail regions carry the remaining registered members (DamageSel, Pos[0..3], HokanSpeed, RotRate, RotSpeed, PushHitStandOfs, PushHitFlyOfs, PushHitKabeOfs, PushHitRadius, FlyOfs, SwimTopOfs, SwimBottomOfs, TenjoOfs, MoguriBaseOfs) [B — byte ranges located but not cleanly segmented for all monsters].

## dtbparts (dtp) [C header / U body]

| Offset | Type | Value (em001) | Meaning |
|---|---|---|---|
| 0x00 | char[4] | `DTP\0` | magic [C] |
| 0x04 | u32 | 0x01339ecb | version (`cb 9e 33 01`) [C] |
| 0x08 | 12×u8 | `04 06 02 00 01 00 00 0e 02 05 01 01` | counts block (4/6/2/0/1/0/0/14/2/5/1/1) [U per-field] |
| 0x14 | … | f32 1785, 1.5, 1000×4, 500, 100 … | part-parameter floats [U] |

rEnemyDtBaseParts has no member-name registration in the 0x54028 chain (like rEnemyDtTune); its loader and per-field semantics are not decoded yet [U].

## Cross-check vs mhgu.db

- dtb/dtp contain **no HP and no per-part damage** (those live in `*_dttune` @0x38 and `*_attackdata`/`*_bodydata`).
- HP cross-check lands on the sibling format: `em001_00_dttune` u32@0x38 = 4500 == `mhgu.db monsters.base_hp` (Rathian) = 4500 [C, byte + db].
- dtb's DamageOnBit / Size / Rank bytes have no db column — not forced; reported as not-applicable.
- dtb DropData f32 500/300/0 offsets have no db counterpart (hunting_rewards is item-id based) [U mapping].

## Decoder

`node tools/mhgu/dtbase.mjs <file>` prints named fields as JSON (magic/version/flags13/BaseScale/Size/Rank/Nando/SpDieDamageType/DamageOnBit/DropDataCount/DropData + kindByte/templateRow/rows + tailRaw). Runs verified on em001/em020/em022 dtbase and em001 dtbparts.
