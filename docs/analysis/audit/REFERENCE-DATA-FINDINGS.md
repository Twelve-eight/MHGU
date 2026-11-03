# REFERENCE-DATA 切片审计（docs/reference 19 份 + docs/data 3 份）

> 审计对象：`docs/analysis/audit/slices/reference.txt`（19 份）与 `slices/data.txt`（3 份），共 22 份。
> 判定词表：OK / WRONG / STALE / UNVERIFIABLE / MISSING / NA（与 MHRS round-1 同）。
> 方法：每份文档取 3–5 条承重数字，**从它自己指名的产物重算**——`docs/data/mhgu.db`（node:sqlite）、
> `docs/data/json/*`、`G:/mhgu-romfs/romfs`（真 romfs，逐文件/逐 arc）、`MHGU-private/romfs-extract`（散落样本）、
> `main.140.flat.bin`（与 mhgu-re MCP 的 disasm/read_words/calls_to）、以及文档点名的 `tools/mhgu/*.mjs`
> 实跑。不拿两份文档互证。
> 明细：`REFERENCE-DATA.tsv`（82 行，按文档逐项）。
>
> 覆盖状态：22/22 文档已审（data 3 + formats 12 + 其余 reference 7），无未审项；
> 非 OK 共 21 条（WRONG 10 / STALE 7 / MISSING 3 / UNVERIFIABLE 1），每条都有命令与输出。

## 0. 速览（每份文档一行）

| 文档 | 判定 | 一句话 |
|---|---|---|
| docs/data/README.md | **WRONG**（3） | 19 个表行数全对，但 `meow_*` 不是空表（6/1168）；实际导出 21 个表 JSON 不是 20；表内 4 处字段名与 db 列不符 |
| docs/data/json/README.md | **STALE** | `monster-slot-map.json` 已是 137 条 `{slot,emid,cn,cn_src,en,kind,ro}`（slot92=Bnahabra，Ahtal-Ka 在 134），93 条/`db_id` 的描述作废；另 `name_ja 覆盖不全` 与 db 相反 |
| docs/data/romfs-tables.md | OK | itm 131,612/2991、gmd 280,586/5982、.ext 1,849/369 B、.qdl 1,854/308 B、tq.arc 289.5 KiB 全部逐字节复现 |
| formats/tex.md | **WRONG** | 步长规则 `max(块大小,512)` 在现语料 2/459 个文件上不成立（em011 mip5 步长 1024）；383/363 的计数已过期（现 459/423） |
| formats/mrl.md | **STALE** | 190/417/245/401 现为 225/490/284；结构性结论（块铺满、名字哈希保 32 位）225/225 复现 |
| formats/lmt.md | **STALE** | 34 个样本现 39；em024 带 11 条 type 13 数据轨，文档「未解只有 1、2」不再成立 |
| formats/emc.md | **STALE** | 头部/21 段/脚本尾 0xff 全部复现（137/137、19,130/19,130），但「111 files / 13514 entries」是子集计数 |
| formats/dtbase.md | OK | em001 全部字段值与 dump 逐项相同（含 DamageOnBit 0x8400066、DropData、kindByte 2） |
| formats/dttune.md | OK（引用的索引 **STALE**） | 138 arc 的 meat 分布 0x8C×70/0x8E×49/0x8F×18/0x90×1 **完全重算成功**；小怪网格实测可定位；`monster-dttune-index.json` 才是过期的那个 |
| formats/mod.md | OK | version 212、em001 骨 43、顶点缓冲末端=faceOffset 全部复现 |
| formats/asd.md | **WRONG**（1） | 1287×127=163,457、样例行、部件 id 公式全对；但「armor_families 的排序字段」在 db 里不存在 |
| formats/rem.md | OK | q0000101.arc 36,305 B/18 entries、rem 184 B、槽 8..12、A 组清单、vq.arc 3904 entries 全对 |
| formats/sdl.md | OK（1 处口径 **WRONG**） | verify 复现 708/4,521,931/0 failures + 全部直方图；§7 类计数按记录复算逐个相同，但工具打印的是「文件数」 |
| formats/gmd.md | OK | 385 个 gmd、13 个文件的串数/尺寸、58=44+14、0x20 语义全部对上 |
| formats/weapon-tables.md | OK（1 项 UNVERIFIABLE） | 57/57 尺寸闭合、Level 10,877/10,877、wpd 10,077/10,077、wcd 1,145/1,145、kad 164 全部重算成功 |
| re-guide-gu.md | OK | `.tmp/re-cli.mjs`、flat bin、6 个 emid→slot、978 调用点全部命中 |
| re-example-dttune-consumer.md | OK（scratch **MISSING**） | loader/getter/137 对表/poison 记录逐字节一致；`.tmp/scratch-t1/scan-*.mjs` 已随 scratch 消失 |
| SUBAGENT-LEDGER.md | OK（scratch **MISSING**） | 9 条交付路径全在、pass3 目录 29 个文件；`.tmp/reports-mhgu/*` 为历史 scratch |
| source-verification.md | OK（1 处 **WRONG**） | 832/0 miss、411、204/204、18MB/39 表、11MB、290 页/37MB 全部复现；「db 自带 name_ja」只对 monsters 成立 |
| suyu/README.md | OK | kLookupCache=4096、kChainBudget=64 与源码一致 |
| suyu/internals.md | **WRONG**（1 事实 + 1 行号） | 12 条「MISSING」路径其实都在 `.tmp/ext/SUYU-GURecomp`；「64-entry lookup cache」是错的（4096），自家 review 已纠正 |
| suyu/internals-review.md | OK | 复核对 4096/64 的纠正在源码里逐条命中 |

## 1. docs/data（3 份）

### 1.1 `docs/data/README.md` — **WRONG**（3 处）

**(a) `meow_*` 不是空表。** 表最后一行写 `` `charms`/`food_combos`/`felyne_skills`/`meow_*` | 0 | 空表 ``，实测：

```
$ node -e '…sqlite_master + count(*)...'
tables: 39
charms 0   food_combos 0   felyne_skills 0
meow_locations 6   meow_rewards 1168
其余 19 行：monsters 129, monster_damage 893, monster_weakness 108, monster_status 728,
monster_to_quest 2305, quests 1355, quest_rewards 37370, items 21153, weapons 10877,
armor 5637, decorations 242, skills 326, skill_trees 205, combining 183, gathering 15414,
horn_melodies 278, palico_weapons 495, palico_armor 1001, locations 31   ← 全对
```

**(b) 导出表数是 21 不是 20。**

```
$ ls docs/data/json/*.json | wc -l
27
27 - README.md - 6 个映射表（monster-slot-map, monster-slot-map-137, monster-name-map,
monster-names-chs, monster-dttune-index, motion-values）= 21 个表 JSON
du: 36,657,253 B = 35.0 MiB（「35MB」本身没错）
```

**(c) 表内字段名与 db 列不符。** `pragma_table_info`：

```
monsters: _id,class,name,name_de,name_fr,name_es,name_it,name_ja,base_hp,icon_name,sort_name,metadata
items   : … carry_capacity …（无 carry）
weapons : … num_slots …（无 slots）
skills  : … required_skill_tree_points …（无 required_points）
decorations: _id,num_slots   ← 没有「技能/材料」列
```

**复现为 OK 的部分**：agroff 944/204/242/885/14 类（JSON 计数逐项相等）；18,333,696 B / 39 表。

### 1.2 `docs/data/json/README.md` — **STALE**

`monster-slot-map.json` 的整段描述（93 条、字段 `{slot,cn,en,db_id}`、`slot92=阁螳螂`、93/93 db_id 可查）已被 10-25/27 的改写取代：

```
$ node -e '…monster-slot-map.json…'
slot-map len 137 keys slot,emid,cn,cn_src,en,kind,ro
slot92 {"slot":92,"emid":4122,"cn":"飞甲虫","cn_src":"…monsterName_chS #92 (Bnahabra)","en":"Bnahabra","kind":"small"}
Ahtal-Ka: slot 133 = 阁螳螂(机偶) emid 87；slot 134 = 阁螳螂 emid 88
$ grep -c '"db_id"' docs/data/json/monster-slot-map.json
0
$ git log --oneline -1 -- docs/data/json/monster-slot-map.json
9293e14 data: slot maps 137/137 official cn_src; 137 file is a projection
```

现文件不是错的：`main` 里 `0x1597ea4` 的 137 对 `{emid,slot}` 与它 **137/137 相同**（见 3.3 的 exe 读取），所以该重写的是 README 这一段，不是 JSON。

同一段「`name_ja` 覆盖不全（部分 JA 字段空）」也与 db 相反：

```
monsters: 129 行，name_ja 空 = 0（导出 name-map 亦 129/129 非空）
（下一段「quests/items/skills 的 name_ja 在 db 全空」才是真的：1355/21153/326/205 全空）
```

### 1.3 `docs/data/romfs-tables.md` — **OK**（5 条承重数字全部逐字节复现）

```
itemData.itm        len 131612, f32 21.3, count 2991, id==index 2991/2991,
                    id9 mMaxCount 10 / sell 7 / buy 66
itemData_eng.gmd    0x18=5982, 0x20=280537(=串块字节), 0x24=8, 组名 itemData,
                    280586 = 0x28+8+1+280537；串[0]='--------' 串[1]='dummy' 串[2]='Book of Combos 1'
questData/questLink ls | wc -l = 1849 / 1854；文件 369 B / 308 B
                    .ext magic 00004b43 count 1 Id 101 QuestTime 50；.qdl 槽 8 名 rem_210052
tq.arc              296,402 B = 289.5 KiB
nativeNX/table       ls | grep -ci quest = 0（确实没有 quest 表）
```

## 2. docs/reference/formats（12 份）

### 2.1 `tex.md` — **WRONG**（步长规则）+ **STALE**（计数）

自写 `readTex` 扫全部 `*.241f5deb`（459 个）：

```
formats: 0x07×423 0x17×18 0x13×2 0x1f×8 0x19×8        ← 文档 383 个：0x07×363 0x13×3 0x17×6 0x19×6 0x1F×5
size equation ok: 459 / 459
step/sum rule ok: 457
bad: em011_00_BM.241f5deb mip5 step 1024 != 512 (sz 512)
     em011_00_NM_MIRROR.241f5deb mip5 step 1024 != 512 (sz 512)
```

两个反例都是 1024×512、11 级、格式 0x17/0x1f：mip0..4 按块大小，mip5 却是 1024 而非 max(512,512)=512。文档的「383/383 满足」既无法按现语料复算，规则本身也需要补例外。

### 2.2 `mrl.md` — **STALE**（计数），结构 **OK**

```
$ node tools/mhgu/mrl.mjs info <225 个文件>   → files 225, version 34, materials 490, bit31 284
$ node tools/mhgu/mrl.mjs check <全部 225>    → 225/225 OK，consumed == size，slack 0+0
em001_00.2749c8a8 第 4 材质 hash = 0xd1930ba0（= 文档的 XfB__m01_eye 完整 32 位哈希）
~zlib.crc32('rTexture') = 0xa41f5deb → 文件存 0x241f5deb；'rModel' 0xd8a15856 → 0x58a15856（类型哈希公式成立）
```

### 2.3 `lmt.md` — **STALE**（2 处）

```
39 个 .76820d81（文档 34），39/39 = LMT\0 + v0x43
type1: 818 轨 withData 0；type2: 1196 轨 withData 0        ← 「1、2 无数据」成立
type13: 11 轨 withData 11、548 B（只在 em024_00_{0,1,3}）  ← 文档未列、DECODERS 无 13
```

### 2.4 `emc.md` — **STALE**（计数），结构与地址 **OK**

```
8 个 loose cmdtbl：magic EMC\0、0x20120804、21 段，8/8；2,072/2,072 脚本末字节 0xff
全 romfs：137 个 cmdtbl entry（94 大怪 + 43 小怪），21 段 137/137，entry 19,130，末字节 0xff 19,130/19,130
read_words 0x1839998 = 01732c8c                                ← LEN[167] 表指针，与文档一致
```

「111 files / 13514 entries / 143 opcodes」是当时抽取子集；全量是 137/19,130。

### 2.5 `dtbase.md` — **OK**

```
$ node tools/mhgu/dtbase.mjs …/em001_00_dtbase.59d9c3da
magic DTB · version 0x15022601 · BaseScale 1 · Size 8 · Rank 2 · Nando 0 · SpDieDamageType 0
DamageOnBit 0x8400066 · DropDataCount 0 · DropData [500,0,0,100,0] · kindByte 2
```

与文档「em001/em020/em022」示例行逐项相同；工具 usage 也与 `<file|arc>` 一致。

### 2.6 `dttune.md` — **OK**；它引用的 `monster-dttune-index.json` **STALE**

这份文档的数字曾被怀疑，实测全部成立：

```
$ node tools/mhgu/dttune.mjs …/em001_00_dttune.48e8ac29 --db docs/data/mhgu.db --emid 1
baseHp 4500 · smallInt0x3C 140 · meat[0]._offset 142(0x8E) = 90/80/70/0/15/15/20/35/100/100 · dbMatch Head
读 0x35C 六个 u16 = [180,600,5,3600,100,580]
全 romfs 138 个 *_dttune 用当前解码器：{0x8e:49, 0x8c:70, 0x8f:18, 0x90:1}   ← 与文档分布逐字相同
ems020_00_dttune：meat[0]._offset 140(0x8C) = 80/110/50/30/5/20/60/0/200/100  ← 文档的小怪网格为真
```

相反的，`docs/data/json/monster-dttune-index.json`（mtime 10-27 04:10）落后于当前 `dttune.mjs`：

```
index 137 entries：93 有 meat（0x8c×29/0x8e×45/0x8f×18/0x90×1），44 个 meat:null（em087_00 + 全部 43 个 ems*）
当前解码器：138 个文件全部定位（0x8c×70/0x8e×49/0x8f×18/0x90×1），与 index 冲突的正是那 44 个 null
```

即：**文档是对的，索引需要重生成**（它被 `dttune.md` 与 `re-guide-gu.md` 同时点名）。

### 2.7 `mod.md` — **OK**

```
$ node tools/mhgu/mod.mjs info …/em001_00.58a15856
version 212 · boneCount 43 · materialCount 4
vertexOffset 47948 + vertexBufferSize 280836 = 328784 = faceOffset（「顶点缓冲末端」闭合）
```

### 2.8 `asd.md` — **WRONG**（1 处字段名）

```
armorSeriesData.asd: len 163457 · f32 38 · count 1287 · 8+1287*127 闭合；id == 下标
rec8    enable 01011 · model 7            ← 文档「Loc Lac 启用位 01011 / 模型 7」
rec617  model 673 · def 26 · resist s8 [-2,2,1,-1,0]
rec1286 仅胴启用 · def 75
db armor 1311337: defense 26 fire -2 water 2 thunder 1 ice -1 dragon 0 / 1377542: defense 75 …
部件 id 公式：1242 个 armor_families 的 head/body/arms/waist/legs_id 全部 = 基数+_id 或 0
```

唯一不成立的是 `+0x04 mSortID「与 armor_families 的排序字段一致」`——该表没有排序列：

```
armor_families: _id,name,name_de,name_fr,name_es,name_it,name_ja,rarity,
                head_id,body_id,arms_id,waist_id,legs_id,hunter_type
```

### 2.9 `rem.md` — **OK**

```
q0000101.arc: 36,305 B, 18 entries（arc.mjs list）；rem 成员 size 184、csize 47
questLink 槽 8..12 = rem_210052 / rem_210001 / rem_000000 / rem_000000 / rem_210051
A 组 = 272@15/3, 273@15/2, 275@20/2, 277@20/2, …（与文档表逐项相同）
vq.arc: 1,424,521 B；arc list 3904 entries（488×8 闭合）
```

### 2.10 `sdl.md` — **OK**；§11 的打印口径一处 **WRONG**

```
$ node tools/mhgu/sdl.mjs verify G:/mhgu-romfs/romfs/nativeNX/arc/stage --exe main.140.flat.bin
708 file(s), 4521931 B, 0 failure(s)
record types: t1 708 t2 5921 t3 108 t4 128 t5 802 t6 20332 t8 17155 t9 12136 t11 12678
              t12 652 t13 2088 t14 44 t15 561 t16 40        ← 与 §8/§11 全同
$ … verify …/stage/m19d
13259/2605/13654/2269/2269/4521/4582 B，rec 222/29/228/38/38/71/73     ← 与 §8 表逐个相同
```

§7 的类直方图我按 **record** 复算：708 文件共 6029 条 type2/3（12 条类名不可解），
`uModel=893 uInfiniteLight=638 uMhFilter=501 … uFestActorModel=1`，与 §7 逐个相同。

但工具打印的 `classes:` 行是**每文件去重后的文件数**（`sdl.mjs:201` 的 `[...new Set(classes)]`），
同一命令给出 `uModel=281`。§11 只写「type/class histograms printed」，没有说明这个口径差异。

### 2.11 `gmd.md` — **OK**

```
node tools/mhgu/gmd.mjs → usage: list <file.gmd> [--all] / json <file.gmd> <out.json> / batch <langDir> <outDir>
index.json：files 385, failed 0, strings 61941；13 个文件的 stringCount/size 与文档表逐项相同
  itemData 5982/326124 · skillData 656/22996 · skillTypeData 412/15379 · privilege_data 6/161
  guestQuestData 462/10005 · hunterArtsData 764/64763 · armorSeriesData 12870/684182
  MonsterDemo 96/5373 · HN_MonsterListMsg 220/65006 · CommonMsg 198/12036
  HN_HunternoteMsg 60/4407 · MapName 2/1124 · Lb_TradeShopMsg 146/13020
resident/chS/table：44 个 .242bb29a + 14 个非 gmd = 58（文档「58 = 44+14」）
0x20 语义：280537 + 9 + 0x28 = 280586，且 0x28 处组名 itemData
```

### 2.12 `weapon-tables.md` — **OK**（1 项 UNVERIFIABLE）

自写解码（`G:/mhgu-romfs/romfs/nativeNX/table`，57 个文件）：

```
size identity: 57/57（8 + n×rs）；版本 K1.2×1 B2.1×14 L1.2×14 C1.0×14 P1.0×14；NN 00-04,06-14 无 05
Level：按文档每族偏移解 10,925 条 → 命中 db 10,877 条，attack/defense/affinity/num_slots 全等（bad 0）
wpd  ：解 10,911 条（+0 fam / +2 idx，素材 +4 起 3 B）→ 10,077 条与 components Improve
       （剔除前一武器行与 1966084 点数行）完全相等，mismatch 0，834 条无 db
wcd  ：解 1,152 条（+0 idx / +2 fam，素材 +6 起 4 B）→ 1,145 条完全相等，mismatch 0，7 条无 db
kad  ：n=164，8+164*14=2304 闭合
```

`Base +12 价格 133/136、3 例外（fam 75/78/121）` **UNVERIFIABLE**：Base 记录没有 fam/idx 键
（+4 是名称串 id，+8 起是 `01 08 03` 之类），w00 有 137 条而 db 低 id 段只有 11 行，
无法按文档构造「136 条样本」。

## 3. docs/reference 其余 7 份

### 3.1 `re-guide-gu.md` — **OK**

```
ls -la "G:/omp works/.tmp/re-cli.mjs" = 1947 B；.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin = 25,472,632 B
monster-slot-map：1→0, 2→3, 10→9, 16→13, 23→21, 24→23（6/6 命中）
MCP calls_to 0x2864c4 → 978 direct-call hit(s)（文档「978 个静态调用点」）
```

（DOC-LINKS 把 `.tmp/re-cli.mjs` 判 MISSING 是相对路径解析问题：它相对 `G:/omp works`，不是 MHGU 仓库。）

### 3.2 `re-example-dttune-consumer.md` — **OK**；scratch 脚本 **MISSING**

```
mcp disasm 0x5776c: e3051444 movw r1,#0x5444 / e3401054 movt r1,#0x54 / e1500001 cmps
                    0x57784 e30a106c movw r1,#0xa06c / 0x57788 e3401133 movt r1,#0x133
mcp disasm 0x71078: movw r1,#0x75ec; ldr r0,[r0,r1]; add r0,r0,#100; bx lr
read_words 0x1597ea4: (1,0) (0x201,1) (0x401,2) (2,3) (0x202,4) (0x402,5) (3,6) (8,7)
em001 dttune 0x35C = 180,600,5,3600,100,580
```

§5 点名的 9 个 `scan-*.mjs` 在 `.tmp/scratch-t1/`，该目录已不存在（`G:/omp works/MHGU/.tmp` 只剩 `mydocs.txt`）；
但正文结论已由 exe 反汇编独立复现，scratch 缺失不影响可用性。

### 3.3 `SUBAGENT-LEDGER.md` — **OK**；scratch 写集 **MISSING**

```
docs/analysis/code/tierb-pass3/ 实有 29 个文件（slice-01a…15c）——DOC-LINKS 的 MISSING 是 "NN" 占位误报
9 条交付路径逐个 [ -e ]：member4-residual / social-checksum / tail-containers / write-side-desc /
member14-17-semantics / tail-dense-3783A / palico-324 / PROJECT-EVAL-20261023 / item-box-v7-plugin-spec 全在
.tmp/reports-mhgu/ 不存在（历史 scratch，记录用）
```

### 3.4 `source-verification.md` — **OK**（1 处 **WRONG**）

```
agroff quests：distinct title 832，命中 db 832，missing 0；1355-944 = 411（去重 1243-832 = 411）
agroff skills：204 命中 skill_trees(205)，db-only = 'Torso Up'
规模：18,333,696 B / 39 表；agroff 目录 ≈ 11 MB（weapons 4.5M + armor 5.4M + 根 ~1.1M）；
      mhxx-wiki/text 290 个文件、data 37 MB
```

**WRONG**：「wiki 与 mhgu.db 的怪物名/任务名是日文，需建 EN↔JA↔CN 名映射表（db 自带 name_ja + 多语言，可自动对齐）」——
`quests/items/skills/skill_trees` 的 `name_ja` **全空**（1355/21153/326/205），只有 `monsters.name_ja` 是全的（129/129）。

### 3.5 `suyu/README.md` — **OK**

```
src/core/arm/recomp/arm_recomp32.cpp:1158  static constexpr size_t kLookupCache = 4096;
src/core/arm/recomp/arm_recomp32.cpp:105   constexpr s32 kChainBudget = 64;
```

### 3.6 `suyu/internals.md` — **WRONG**（1 事实 + 1 行号）；12 条 MISSING 全是误报

```
G:/omp works/.tmp/ext/SUYU-GURecomp/tools/a32recomp/{README.md,a32_runtime.h,make_link_kit.py,a32cov.cpp} 存在
docs/a32recomp/ 无 README.md —— 文档原文就是「No README.md in that folder」（该条 MISSING 是正确陈述）
src/core/recompiler/a32/{a32_to_c.h,a32emit.h,a32disc.h} + src/core/arm/recomp/arm_recomp32.h 均存在
```

- **事实错**：报告写「then 64-entry direct-mapped lookup cache」，实际 `kLookupCache = 4096`（`:1158`）；
  `64` 是 `kChainBudget`。该错已被 `internals-review.md`（第 1/2 条）与 `suyu/README.md` 纠正，
  归档 README 也声明「与报告有冲突时以复核为准」，所以整套资料可直接使用。
- **行号残余**：「tools/a32recomp/README.md:70 no direct block-to-block chaining yet」实际在第 78 行；
  复核的 25 条降级未含此条。

### 3.7 `suyu/internals-review.md` — **OK**

```
arm_recomp32.cpp:1158 kLookupCache = 4096、:105 kChainBudget = 64 —— 复核的两条纠正在源码里命中
tools/a32recomp/a32_runtime.h:49-51 _Static_assert ext@96 / pending_svc@364 / host@368 —— 与报告一致
```

## 4. 复现命令清单

```sh
# db / json
node -e '…sqlite_master + count(*)'                 # 39 表逐表行数
node -e '…pragma_table_info'                        # 列名核对
node -e '…JSON.parse 计数'                          # agroff / 导出 JSON
# romfs（逐字节）
node -e '…readFloatLE/readUInt32LE…'                # itemData.itm / gmd / .ext / .qdl / asd
# 工具实跑
node tools/mhgu/dttune.mjs <dttune> --db docs/data/mhgu.db --emid 1
node tools/mhgu/dtbase.mjs <dtbase>
node tools/mhgu/mod.mjs info <mod>
node tools/mhgu/mrl.mjs info|check <mrl...>
node tools/mhgu/lmt.mjs info <lmt>
node tools/mhgu/rem.mjs arc <quest.arc> --json
node tools/mhgu/sdl.mjs verify G:/mhgu-romfs/romfs/nativeNX/arc/stage --exe main.140.flat.bin
node tools/mhgu/arc.mjs list|extract <arc>
# exe
mhgu-re MCP：disasm 0x5776c / 0x71078、read_words 0x1597ea4 / 0x1839998、calls_to 0x2864c4
```

## Difficulties

1. **哪些「语料计数」算 STALE、哪些算 WRONG，取决于文档自己圈定的语料。** `tex/mrl/lmt/emc` 写的是
   「本工作区 N 个样本」，而工作区语料在文档之后扩了（383→459、190→225、34→39、111→137）；
   这四份判 STALE。`dttune.md` 的 138 个是**全 romfs**，能在当前解码器上逐字复现（0x8C×70/0x8E×49），
   所以判 OK —— 真正过期的是它引用的 `monster-dttune-index.json`。
2. **同一批数字可能有两个口径。** `sdl.md` §7 的类计数是「记录数」，工具打印是「文件数」；
   §7 的数字经自算 6029 条 type2/3 逐个复现，所以只把「打印口径未说明」记一条 WRONG(小)。
3. **`monster-slot-map` 的「slot」有两个索引空间。** 旧 README 的 93 槽是「存档计数器下标」，
   现文件是 exe `0x1597ea4` 的 137 项资源槽（含小怪、`emid` 交错）。我用 exe 表 137/137 反证了现文件，
   但**不能**据此断定旧的「slot92 计数器在 char_off 24414」是错的——那是另一个索引空间，本次未重测。
4. **scratch 引用无法复现。** `.tmp/scratch-t1`、`.tmp/reports-mhgu`、`.tmp/reports-rds` 等已清空；
   凡只存在于 scratch 的数字（dttune 的 status 偏移表、weapon-tables 的 Base 样本）只能标 UNVERIFIABLE/MISSING。
5. **没有重跑视觉类判据。** tex 的「肉眼正确」、mrl 的「槽位哈希不变」、mod 的蒙皮偏移表未逐项重验，
   只验了它们的数值骨架（尺寸方程、块铺满、骨骼/材质计数）。
