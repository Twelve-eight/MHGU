# GU stage `SDL` format (resource type `0x4c0db839`) - decoded

Status: container, records, value area and string pool fully decoded; the scene tree is decoded; the
per-property *payload* element layouts are decoded for the types m19d uses, with three open ends listed
in section 10. Reader: `MHGU/tools/mhgu/sdl.mjs` (this note and the reader were built together; every
number below is reproduced by `sdl.mjs verify`).

Scope: all 708 `SDL` entries in the 259 `nativeNX/arc/stage/**` arcs (4,521,931 B) parse strictly and
satisfy the size identity below [C]. m19d has 7 of them.

Evidence conventions: `[C]` = read from the bytes or from disassembly in this session; `[B]` = strong
inference from a corpus-wide number; `[U]` = not established.

---

## 1. Identification

| fact | value | how |
|---|---|---|
| arc entry type hash | `0x4c0db839` | filter over every stage arc: 708 entries, all with an `SDL\0` payload [C] |
| file magic | `53 44 4c 00` (`"SDL\0"`) | `[C]` byte 0 |
| version | `22` (`u16` @0x04) | `[C]` and enforced by the loader (below) |
| second marker | `u32 0xE2316427` @0x08, on all 708 files `[C]` | |
| where | `stage\<mapd>\<area>\sdl\<area>-f` (lights/filters of one area), `…-a00/-a01…` (a "model group" node), `…-k01…` (breakable / moving objects), `…-c00…` | entry names `[C]` |
| size | 257 B .. 69,994 B (m19d 2,269 .. 13,654 B) | corpus min/max (`m24a06d-a00` / `m21a00d-f`) `[C]` |

The game's SDL loader is `fn 0xb4f0b0` in the MHGU 1.4.0 main image (vaddr = flat - 0x100) `[C]`:

```
0xb4f13c  movw r1,#0x4453 / movt r1,#0x4c     ; 0x004c4453 = "SDL\0"
0xb4f144  ldr  r0,[r5,#0]  ; 0xb4f148 cmps r0,r1
0xb4f14c  ldrheq r0,[r5,#4] ; 0xb4f150 cmpeq r0,#22      ; version must be 22
0xb4f190  ldr  r0,[r5,#20] ; addne r0,r5,r0 ; str r0,[r5,#20]   ; +0x14 string-pool offset -> pointer
0xb4f1a4  ldrh r0,[r1,#6]                                ; record count
0xb4f244  add  r11,r1,r10,lsl #5                         ; record i at data + 32*i
0xb4f250  ldr  r0,[r5,#24]!                              ; type word at record+0x18 (writeback r5)
0xb4f254  uxtab r2,r2,r0     ; (low byte) - 1            ; switch on the low byte, 1..16
0xb4f2d0  str  r6,[r11,#0x20]                            ; name offset -> pool pointer
0xb4f2b0.. str r2,[r11,#0x30] / [r11,#0x34]              ; value offsets -> pointers
0xb4f310  cmp  r1,#13 / #14  ; + bits16-31 = element count, relocate n pool offsets / n file offsets
```

Record base = `data + 32*i + 0x18` because the type word is read at `r11+0x18`; this also makes
`0x18 + 32*count` the end of the record table, which is exactly where the first value area starts in
**all 708 files** `[C]`.

## 2. Header (0x18 B)

| off | type | field | notes |
|---|---|---|---|
| 0x00 | char[4] | magic `"SDL\0"` | |
| 0x04 | u16 | version = 22 | loader checks it |
| 0x06 | u16 | **recordCount** | 4 .. 1046 in the corpus; loader loop bound |
| 0x08 | u32 | marker `0xE2316427` | constant on 708/708 |
| 0x0C | u32 | unknown designer constant | 112 distinct values; 1, 0, 60, 100, 120, 194, 400, 601, 1000, 1200, 2000, 3000, 5000 are the common ones, max 16,797,216; no checksum relation found (not crc32 or a sum of the file); the loader never reads it `[C]`, meaning `[U]` |
| 0x10 | u32 | 0 | 708/708 |
| 0x14 | u32 | **poolOffset** | offset of the NUL string pool == the first pool string, which is `"Root"` on 708/708 |

Then: `record[recordCount]` (32 B each), then the value area, then the string pool which runs to EOF
(no trailing bytes in any of the 708 files) `[C]`.

## 3. Record (32 B at `0x18 + 32*i`)

| off | type | field | evidence |
|---|---|---|---|
| 0x00 | u32 | **typeWord** = `u8 type` \| `u8 mid`<<8 \| `u16 count`<<16 | type is the loader's switch value, 1..16; `count` = number of elements of the property; `mid` is a property/type code (see 6) `[C]` |
| 0x04 | u32 | **owner** | for field records: 0-based index of the owning record (always `< count`, checked on all 708 files). For object records (type 2/3) it is a small id that is *not* an in-file index (71 of the 708 files contain at least one object record with `owner >= count`, e.g. `m02a11n-a00` has 5 records and `owner = 9`) and is constant per class inside one file (m19d: `uModel`=9, `uKowareObj`=10, `uKowareModel`=11, `uScrollCollisionSbc`=12, `uMaterialControl`=17) but differs per file for the same class across stages `[C]`/`[U]` |
| 0x08 | u32 | **nameOff** | offset relative to `poolOffset` of a NUL-terminated name; 0 = unnamed. 708/708 names land on a string start `[C]` |
| 0x0C | u32 | nameHash | 0 in the file; the loader replaces it with `hash(pool+nameOff)` on type 2/3. For type 2/3 it is `crc32x(engine class name) & 0x7fffffff` `[C]` |
| 0x10 | u32 | reserved | 0 in 703/708 files; 5 records game-wide carry a small number `[U]` |
| 0x14 | u32 | reserved | 0 in 707/708 files `[U]` |
| 0x18 | u32 | **keyOff** | file offset of the key array (see 4); 0 = property has no value |
| 0x1C | u32 | **valOff** | file offset of the value payload (see 4) |

`keyOff`/`valOff` are both 0 or both nonzero, `keyOff <= valOff`, and every request lies inside
`[0x18+32*count, poolOffset]` `[C]` (708/708).

## 4. Value area

For a record with `count = n` the value area is two arrays laid out in file order:

```
keyOff ..            n x u32  = (tag << 24) | key         "key array", 4 B per element
                     delta - 4n bytes of filler          (delta = valOff - keyOff)
valOff .. slab end   n x elemsize                          "payload", the actual property values
slab = [keyOff, next record's keyOff)  (the last slab ends at poolOffset)
```

* `keyOff` is always exactly the record-table end for the first record with values, and each following
  slab starts where the previous one ends -> the value area is tiled without holes `[C]` (708/708).
* The keys start at `keyOff` (checked on records with non-zero keys, e.g. `mSdlSeReqType` = 1,3 and
  `mOffset` = 0/100/200) and the payload starts at `valOff` `[C]`.
* filler between the two: `valOff - keyOff - 4n` = 8 on 46,046 records, 12 on 16,312, 4 on 1,971,
  0 on 1,260 and >= 16 on ~1,100; the words are zero in the samples inspected. The loader converts both
  offsets to pointers and never reads the filler, so it is writer bookkeeping `[C]`/`[U]`.
* **payload size is exact**: `slabEnd - valOff == n * elemsize` on every record of type 6 (20,324),
  8 (17,123), 9 (12,129), 12 (652), 13 (2,088), 14 (44), 15 (559 of 561) `[C]`; type 11 holds
  4 B/element on 11,662 of 12,678 records and a larger element on the rest, so its element size is
  variable `[U]`; type 16 is 64 B (40/40) `[B]`. There is no end padding.
* `tag` observed 0, 2, 3 only: 0 for integer properties, 2 for the struct arrays (`setEffect`,
  `Scheduler Request`), 3 for float properties (`mPos`, `mBasePos`, `mBaseRotY`, `mAtRadius`, `mOffset`,
  `mSdlSeReqPos`, …) `[C]`. The 24-bit `key` is a small integer, not an offset (e.g. `mOffset` of
  `uKowareModel` = 0/100/200, `mPos` = 0/60/90/170/…, ascending); its meaning is not decoded `[U]`.
* payload element size, verified by content and by the size identity above `[C]`:
  `t8` = **16 B** (float4; the bytes read as `(x, y, z, 0)` in centimetres, e.g. `mBasePos` of
  `m00a02d-a00` = (-6250, 600, -810, 0)), `t6`/`t9`/`t12`/`t13`/`t14`/`t15` = 4 B (`t9` reads as f32,
  e.g. `mAtRadius` = 300.0; `t12` = a record index; `t13` = a pool offset).

## 5. String pool and resource references

NUL-separated strings from `poolOffset` to EOF. First string is always `"Root"` `[C]`. Three kinds:

1. **names** – property names (`mBasePos`, `mDrawMode`, …), object names (`m09a01d-k01`), and engine
   class names (`KowareObj`, `SoundControl`, `Model`, …).
2. **`"null"`** – the name of the type-4 terminator records `[C]`.
3. **resource references** – one *pool string* = `u32 resource type hash` immediately followed by the
   path, e.g. `56 58 a1 58` (`0x58a15856` = MOD) + `stage\m19d\m19a01d\m19a01d-k00\m19a01d-k01`, or
   `9f 77 fc 51` (`0x51fc779f` = rCollision) + `stage\m19d\m19a01d\collision\m19a01d-a-g00-s00` `[C]`.
   Type-13 records point at these by pool offset; the loader's case 13 turns each into a live resource
   (`bl 0x7aef68` on `pool + value`) `[C]`.

## 6. Record types

Type = the loader's dispatch case. Counts: **m19d** (7 files) and the **whole stage corpus** (708 files).

| type | meaning | m19d | corpus | how established |
|---|---|---|---|---|
| 1 | file root (record 0, always present, unnamed, no values) | 7 | 708 | `[C]` 708/708 |
| 2 | object instance (name + class hash) | 51 | 5,921 | `[C]` hash -> class name (section 7) |
| 3 | object without an instance name (holds only the class hash, e.g. `SoundControl`) | 5 | 108 | `[C]` |
| 4 | terminator / `"null"` object (loader case 4 = no relocation) | 5 | 128 | `[C]` name is literally `"null"` |
| 5 | named array property; its element records follow (`mpArray`, `mActList`, `mController`) | 17 | 802 | `[C]` |
| 6 | integer scalar/array (4 B per element) | 219 | 20,332 | `[C]` values `1`, `64`, `6`, `2` … |
| 7 | — | 0 | 0 | unseen in the retail corpus |
| 8 | float array, 16 B per element (position/vector float4) | 154 | 17,155 | `[C]` content + fit test |
| 9 | float scalar/vector, 4 B (+mid 12 = float) | 113 | 12,136 | `[C]` `mAtRadius` = 300.0 |
| 10 | — | 0 | 0 | unseen |
| 11 | integer list (4 B per element; `Draw`, `PartsDisp`, `mDebugDisp`) | 96 | 12,678 | `[B]` |
| 12 | object reference: payload = 0-based record index of the referenced object | 12 | 652 | `[C]` `mpModelTop` = 25 -> record 25 is the `uKowareModel` node |
| 13 | resource reference array (payload = pool offsets, each a type-hash+path string) | 13 | 2,088 | `[C]` |
| 14 | offset array (`mAnimation`) | 0 | 44 | `[B]` |
| 15 | struct array (`Scheduler Request`, `Koware Request`) | 7 | 561 | `[B]` |
| 16 | inline `MtFCurve` (64 B, `mCurve`, `mFadeCurve`) | 0 | 40 | `[B]` |

`mid` (second byte of the type word) is a property-type code; observed values 0,2,3,4,5,6,8,10,12,14,15,
20,21,22,24,28,34,35,40,57,128. `mid` = 128 marks type 13 (resource array); 20 dominates type 8 (float4);
12 marks type 9 (f32); 24/28 mark type 15 `[B]`. A full mid -> engine-type mapping is not decoded `[U]`.

## 7. Scene tree and class hashes

* Records form a tree: record 0 (type 1) is the file root, record 1 is the first object in 706/708 files
  (the two exceptions, `m01a04d-k02`/`m01a04n-k02`, start with a type-4 `"null"`), and every field
  record names its owner in `+0x04`. Nesting is used for arrays: `mActList` (type 5) -> `mpArray`
  (type 5, one per element) -> the element's fields (`Id`, `startFrame`, `moveFrame`, `quakeType`,
  `reactType`, `vec`) `[C]`.
* The **class hash** of a type 2/3 record is `crc32x(class name) & 0x7fffffff` where
  `crc32x(s) = zlib.crc32(s) ^ 0xffffffff`; the engine class names are plain strings in the main image,
  so the image is its own oracle (`sdl.mjs --exe`). Verified end-to-end for every class below `[C]`.
* Classes actually used by stage SDLs, as the number of object records carrying that class hash over the
  708 files: `uModel` 893, `uInfiniteLight` 638, `uMhFilter` 501,
  `uStageSet` 496, `uFestaInfiniteLight` 486, `uMhBillboard` 267, `uHemiSphereLight` 255,
  `uFestaHemiSphereLight` 241, `uStageDataSet` 241, `uBloomFilter` 240, `uColorFog` 239,
  `uStableShadow` 239, `uAmbientLight` 239, `uColorCorrectFilter` 235, `uGodRaysFilter` 179,
  `uKowareModel` 153, `sSoundControl` 108, `uKowareObj` 100, `uSpotLight` 61, `uMaterialControl` 59,
  `uGrass2` 32, `uGrassWindDirection` 32, `uBaseModel` 28, `uPointLight` 18, `uScrollCollisionSbc` 15,
  `uImagePlaneFilterRange` 7, `uHazeFilter` 6, `uUniformShadow` 4, `uImagePlaneFilter` 4,
  `uFestActorModel` 1 `[C]`.

## 8. Size identity

Every file satisfies, byte-exactly:

```
0x18 (header) + 32*count (records) + (poolOffset - (0x18+32*count)) (value area) + (size - poolOffset) (pool) == size
```

and the value area is exactly the union of the record slabs `[C]` (708/708).

The seven m19d SDLs:

| file (arc) | size | header | records | value area | pool | sum |
|---|---|---|---|---|---|---|
| `sdl/m19a00d-f` (a00.arc) | 13,259 | 24 | 7,104 (222 rec) | 4,232 | 1,899 | 13,259 ok |
| `sdl/m19a00d-a00` (a00.arc) | 2,605 | 24 | 928 (29) | 1,428 | 225 | 2,605 ok |
| `sdl/m19a01d-f` (a01.arc) | 13,654 | 24 | 7,296 (228) | 4,360 | 1,974 | 13,654 ok |
| `sdl/m19a01d-k01` (m19d.arc) | 2,269 | 24 | 1,216 (38) | 624 | 405 | 2,269 ok |
| `sdl/m19a01d-k02` (m19d.arc) | 2,269 | 24 | 1,216 (38) | 624 | 405 | 2,269 ok |
| `sdl/m19a01d-k03` (m19d.arc) | 4,521 | 24 | 2,272 (71) | 1,540 | 685 | 4,521 ok |
| `sdl/m19a01d-k04` (m19d.arc) | 4,582 | 24 | 2,336 (73) | 1,524 | 698 | 4,582 ok |

## 9. What the seven m19d SDLs contain

Decoded with `sdl.mjs dump --exe …`:

* `m19a00d-f` (222 rec) — the camp area's **light + filter + atmosphere set**: 16 objects
  `PL01/PL02-InfiniteLight`, `PL03-HemiSphereLight`, 3 × `MhFilter` (`_top`, plain, `_bottom`),
  `ColorFog`, `BloomFilter`, `ColorCorrectFilter`, `StageDataSet`, `StableShadow`,
  `DEF01/02-InfiniteLight`, `DEF03-HemiSphereLight`, `AmbientLight`, `GodRaysFilter`,
  plus the env-cube reference `system\texture\DefaultCube_CM` (TEX). No object positions, only light
  parameters (`mColor`, `mBalance`, `mDensity`, `light1-inf1-Balance` …).
* `m19a00d-a00` (29 rec) — 3 × `uModel` nodes all named `m09a00d-a00` (note: the internal name still says
  `m09…`, i.e. the camp layout is inherited from map 9) + 1 `sSoundControl`. Each node has
  `Draw`(t11), `mPos`(t8, 11-12 float4 in cm), `mLightGroup`, `mDrawMode`, `mpModel`(t13),
  `mAngle`(t8, 4-6 float4 = x/y/z degrees); the two MOD references resolve to
  `stage\m19d\m19a00d\m19a00d-a00`. The last three `mPos` entries of all three nodes are identical
  ((6.1, 0, 56.8), (12.5, -0.8, 73.2), (13.0, 0, 44.0) m) and land inside GuStageMod's a00 playable
  core, the earlier ones do not — the exact meaning of `mPos`/`mAngle` of a `uModel` node is `[U]`
  (see 10.3).
* `m19a01d-f` (228 rec) — the arena's light/filter/atmosphere set, same structure with
  `EM01/EM02-InfiniteLight`, `EM03-HemiSphereLight`, `HazeFilter`, `StageDataSet`, `GodRaysFilter`.
* `m19a01d-k01` / `k02` (38 rec each) — one `uKowareObj` ("breakable/moving object") with
  `mBasePos` (f4), `mBaseRotY`, `mpModelTop` (t12 -> the model node), `mId`, `mLevel`, `mType`,
  `mDebugDisp`, `mActList` (an array of actions: one `mpArray` element for k01/k02, two for k03/k04, each
  with `Id/startFrame/moveFrame/quakeType/reactType/vec` and all values 0), `mActNum`,
  `mAtType`, `mAtRadius`, `mAtPos0/1`, `mEffectUniqueId`; one `uKowareModel` node per file
  (`m09a01d-k01`, `m09a01d-k02`) with `mOffset/mRot/mDrawMode/mLightGroup/mCacheMode/mVFCullLevel`
  and a MOD reference; one `sSoundControl` with 2 `Scheduler Request` entries.
* `m19a01d-k03` / `k04` (71 / 73 rec) — same, plus **`uScrollCollisionSbc`** whose
  `Resource(rCollision)` (t13) resolves to `stage\m19d\m19a01d\collision\m19a01d-a-g00-s00` (`k03`) /
  `…-s01` (`k04`) — i.e. the SDL is what binds the SBC colliders to the rolling/jumping boulder objects —
  plus two `uMaterialControl` blocks (`mpTarget`, `mControlAllSlot`, `mController/mControlID`,
  `BaseMapFactor`) and model nodes `m09a01d-s00/s02` (`k03`) and `m09a01d-s01/s03` (`k04`).

**Nothing else is in them.** A corpus-wide census of the 358 distinct property names in all 708 SDLs
finds no camp, spawn, area, border, zone, gate, door, warp, nest, enemy-set or item-spawn field
(only `mSdlSeReqArea`/`mKowareSeReqArea`, which are *sound request areas*). Property names containing
"Pos"/"Point"/"start" are all light/filter/animation parameters (`mSunPos`, `mTopPos`, `mStart`,
`mStartZ`, `mUsePoint`, `mPoint`, `startFrame`, `Weather-state1-start` …) `[C]`.

## 10. Verdict for the port + open ends

### 10.1 Is anything in the m19d SDLs needed for a first-pass playable arena?
**No.** Blocking data for a playable arena is: (a) the playable *mesh* (GuStageMod, done from the MOD),
(b) *collision* (GuStageCol; for m19d the two SBC resources, which the SDL merely *links* to boulder
objects — the SBC payload itself is self-describing and does not need the SDL), (c) the *player spawn /
camp position and area borders*. The last three are **not** in SDL: they are
`rStageInfoSet` (`SIPosition`/`SISphere`/`SICylinder`, the `<area>-info` resources), `rStageAreaInfo`,
`rAreaConnect`, `rVillageFirstPos` and `cAreaInfo` — all named in the main image's class registry
(flat 0x1568971..0x1568b71) and, in the retail romfs, present only as two `rStageInfoSet` entries in
`arc/stage/map_com/m00.arc` (`stage\m00d\m00a01d\m00a01d-info`, 236 B / 476 B); a scan of every arc under
`nativeNX/arc` finds no entry with that type hash for any other map — m19d has **no** per-area info
resource at all; and no `.sai`/`.sis`/`.acn`/`.vfp`/`.rlt` file exists anywhere in the romfs (the loose
`table/stage` tables are only `.kod` 27, `.sid` 27, `.gpd` 8, `.fld` 5) `[C]`. Its three arcs contain only
these classes (entry counts):
SDL `0x4c0db839` ×7, TEX `0x241f5deb` ×39, MRL `0x2749c8a8` ×10, MOD `0x58a15856` ×10,
SE-wave `0x79c47b59` ×8, SBKR `0x15d782fb` ×2, SRQR `0x1bcc4966` ×2, SES `0x2543b93e` ×2,
rCollision `0x51fc779f` ×2, and five sound/bgm/pec entries (`0x58072136`, `0x232e228c`, `0x2b40ae8f`,
`0x167dbbff`, `0x6fcc7ad4`) `[C]`.
So pass 1 can drop all 7 SDLs from the port with no functional loss; the parts of the arena that *do*
matter (meshes, SBC, spawn) come from other resources.

### 10.2 What SDL gives for pass 2
* exact per-area light/filter/atmosphere parameters (the `-f` files) — the GU source for
  `MHRS/tools/stage/atmo-edit.mjs` (Rise `.scn` atmosphere/`rt-atmo`),
* the breakable/moving objects with their schedules (`mActList`) and their SBC binding (`k01..k04`),
* the MOD references and the `uModel` "model group" nodes of each area (including the camp's `mPos`/
  `mAngle` lists, if they turn out to be instance placements — 10.3).

### 10.3 Open ends
1. `uModel` `mPos`/`mAngle` semantics (the only placement-looking data in the whole format). `mPos` is a
   float4 list in cm; the elements and the 24-bit keys ("0, 60, 90, …") are not yet mapped to
   meshes/instances; count does not match the MOD's mesh count (12 vs 64 for a00). `[U]`
2. The 24-bit per-element `key` of every value array: ascending small integers, apparently an
   element id/time; not an offset (elements are 16 B apart). Effect unknown `[U]`.
3. The header word at 0x0C (designer constant) and the 5 records game-wide with a nonzero `+0x10` `[U]`.
4. `mid` -> engine property type table (only the dominant mappings are established, section 6) `[U]`.

## 11. Reader

```
node tools/mhgu/sdl.mjs dump     <file> [--json] [--exe main.140.flat.bin]
node tools/mhgu/sdl.mjs arcs     <stageDir> [--json] [--exe …]
node tools/mhgu/sdl.mjs verify   <stageDir|file|arc>… [--exe …] [--quiet]
node tools/mhgu/sdl.mjs selftest <known-good file>
```

Library: `parseSdl(buf,label)` (throws on any structural violation), `tryParseSdl`, `sizeIdentity`,
`describe`, `toJson`, `elements`/`elemSize`, `classNamesFromImage`, `classHash`/`crc32x`.

`dump`/`arcs` print the first three payload elements of every record interpreted per type (float4 for
t8, f32 for t9, u32 for t6/t11/t12/t14/t15, and for t13 the pool offset resolved to its resource path),
e.g. `mBasePos [0] (5030, -680, 150, 0)` and
`Resource(rCollision) [0] pool+0x27a stage\m19d\m19a01d\collision\m19a01d-a-g00-s00`.

Checks run in this session:

* `verify G:/mhgu-romfs/romfs/nativeNX/arc/stage` → **708 files, 4,521,931 B, 0 failures**, type/class
  histograms printed (records: t1 708, t2 5,921, t3 108, t4 128, t5 802, t6 20,332, t8 17,155,
  t9 12,136, t11 12,678, t12 652, t13 2,088, t14 44, t15 561, t16 40) `[C]`.
  The `classes:` line is only printed with `--exe` and counts **files per class** (each file's class
  set is deduped, `sdl.mjs` `classes: [...new Set(...)]`), not object records: `uModel=281` there is
  the number of files containing a `uModel`, while the 893 in section 7 is the object-record count of
  the same class. Re-run 2026-11-03: `uModel=281 uInfiniteLight=244 ... uFestActorModel=1` by file;
  893/638/501/... by record `[C]`.
* `verify <m19d dir>` → 7 files with the size-identity table of section 8.
* `selftest m19a01d-k03.bin` → 10 known-bad samples (bad magic, bad version, bad marker, record count
  past the pool, pool outside the file, type 0, name offset past the pool, key array inside the record
  table, pool not NUL-terminated, truncated file) all rejected for the intended reason; the unmodified
  basis parses `[C]`.
* consumer cross-checks: `m19a01d-k03`/`k04` `Resource(rCollision)` payload = pool offset of the
  `0x51fc779f collision\m19a01d-a-g00-s0x` string; `mpModelTop` = record index of the `uKowareModel`
  node; `mBasePos` = (x,y,z,0) cm float4 that matches the map's coordinate range; class hashes
  reproduce 30 distinct engine class names out of the image `[C]`.

Reproduce (repo layout, `MHGU/tools/mhgu/sdl.mjs`; `<flat>` = `main.140.flat.bin`):

```
node tools/mhgu/sdl.mjs verify G:/mhgu-romfs/romfs/nativeNX/arc/stage --quiet --exe <flat>
node tools/mhgu/sdl.mjs arcs   G:/mhgu-romfs/romfs/nativeNX/arc/stage/m19d --exe <flat>
node tools/mhgu/sdl.mjs dump   <extracted m19a01d-k03> --exe <flat>
node tools/mhgu/sdl.mjs selftest <extracted m19a01d-k03>
```

Extract the fixtures with
`node tools/mhgu/arc.mjs extract G:/mhgu-romfs/romfs/nativeNX/arc/stage/m19d/m19d.arc <outdir> "sdl"`.
