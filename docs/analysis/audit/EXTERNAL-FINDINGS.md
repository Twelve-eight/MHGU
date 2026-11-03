# EXTERNAL 切片审计（docs/analysis/external，23 份）

> 审计对象：`docs/analysis/audit/slices/analysis-external.txt` 列出的 23 份（17 份 `chunks/cNN.md` + `chunks/spk-format.md` + `forge-pc-and-porting-precedents.md` + 4 份 `suyu-*.md`），分母以 `MANIFEST.tsv` 为准（23 行，行数/字节与磁盘一致）。
> 判定词表：OK / WRONG / STALE / UNVERIFIABLE / MISSING / NA。
> 方法：每份文档从**它自己指名的产物**重算——
> `.tmp/mhgu/suyu/`（dis-gs-1/2、dis-gs、addr-disasm、dis-other、dis-nvntrace、sdk-helpers、chunks/c01..c17）、
> `.tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin`、`.tmp/ext/SUYU-GURecomp`（git HEAD / tag / 源码行）、
> `.tmp/ext/forge-pc`（tag v0.7.0）、`github.com/…/releases` 页面正文、`gamebanana.com/apiv11`。
> 不拿两份文档互证；只有本文档链到另一文档时才整段对读（结果单列）。
> 明细：`EXTERNAL.tsv`（36 行，23 条文档级 + 13 条专项）。
>
> 覆盖：23/23 已审。文档级 OK 22 / WRONG 1；专项行 OK 6 / WRONG 6 / UNVERIFIABLE 1（13 条）。

## 0. 速览（每份文档一行）

| 文档 | 判定 | 一句话 |
|---|---|---|
| chunks/c01.md | OK | 3 块 16 指令；0x13EDD58 的 `movw#0x9864/movt#0x32ab`、`uxtb` 纠读全对 |
| chunks/c02.md | OK | 0x139DDA8/0x139DDD8 两份 `strb r11,[r6,#1528]` 副本复现 |
| chunks/c03.md | OK | 0x139DDE0 `cmp r0,#12`/`str r0,[r6,#1488]`、`bl 0x13a0718` 命中；1205→1206 的行边界与 dump 头一致 |
| chunks/c04.md | OK | 三行全 PLAUSIBLE 与「只给地址表、无源代码」的输入相符 |
| chunks/c05.md | OK | `ldr r2,[r4,#624]`/`bl 0x13a0718` 与 0x139E6F4 的 +12 关系复现 |
| chunks/c06.md | OK | 0x139E71C/0x139E730/0x139E76C 三条均为函数内部点，判读正确 |
| chunks/c07.md | OK | 0x139E79C 的 `ldr/blx r1/b 0x139e7d0` 与「跳过 0x139E7B8」一致 |
| chunks/c08.md | OK | 0x139E7D0 `ldrb r0,[r4,#552]` 的 bit2 门与文档同 |
| chunks/c09.md | OK | 0x139E814/0x139E820 收尾 + 0x8BCD84 `sub sp,#552` 复现 |
| chunks/c10.md | OK | MCP 反汇编 vaddr 0xBC1200 = `blx r7`，0xBC1204 = `ldr r8,[sp,#8]` |
| chunks/c11.md | OK | 0x131C3E0/0x139DCE4/0x139E5F8 三个 `push`+`sub sp` 帧大小全对 |
| chunks/c12.md | OK | 0x13B3054 `movw r12,#0xffff`、0x13A6D94 `add r8,r5,#364` 复现 |
| chunks/c13.md | OK | c13 用 nvn_trace.cpp:**101**（正确），与审计文档的 102-104 不同 |
| chunks/c14.md | OK | sdk-helpers.txt 的 `bpl 0x3f3e48`/`push{r11,lr}` 与两条别名 stub 全对 |
| chunks/c15.md | OK | 0x2000 的 9 字表 +48..+76 逐条命中；首行非标题（格式瑕） |
| chunks/c16.md | OK | 0x1000 循环头、0x3C00/0x3D80 为字面量边界，判读正确 |
| chunks/c17.md | OK | 自带「输入是 2 块不是 3 块」声明，与实际一致 |
| chunks/spk-format.md | OK | mtf_shaders.py 与 pipeline_manifest.py 逐行对读，全部命中 |
| forge-pc-and-porting-precedents.md | **WRONG**（2 项） | 实体结论与 mod 事实全部复现，但 6 处头文件行号引用落在不存在的行（文件仅 333/234 行，引用到 1362） |
| suyu-addr-check.md | OK | 50 行、21 VERIFIED/20 PLAUSIBLE/9 SKIP，抽样逐条复现 |
| suyu-gs-part1.md | OK（2 行 cite 偏 1） | 39 块全对、VFP 逐字解码全对；0x1314290/0x1314298 的行号应 1202 写成了 1201 |
| suyu-gurecomp-audit.md | OK（3 处记账错） | 判定可复现；但输入清单列了两份不存在的 dump、nvn_trace 行号 102-104 应为 101-103、Summary 抽查数自相矛盾 |
| suyu-release-check.md | OK（1 项 UNVERIFIABLE） | 8 个 SHA-256、克隆 HEAD==tag、INSTALL/game_export 全部行号逐行命中；asset 字节数/星标只有 API 能给，本次被限流 |

## 1. 依赖产物盘点（路径核验）

全部引用先在磁盘上落地，再谈内容：

```
$ ls .tmp/mhgu/suyu
addr-disasm.txt  chunks  dis-gs-1.txt  dis-gs-2.txt  dis-gs.txt
dis-nvntrace.txt  dis-other.txt  ex-gs-cpp.txt  ex-gs-h.txt  ex-mtf.txt
ex-nvntrace.txt  sdk-helpers.txt
$ ls .tmp/mhgu/suyu/chunks | wc -l          -> 17
$ ls -l .tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin   -> 存在（sdk-helpers.txt 的 sdk.flat.bin）
$ git -C .tmp/ext/SUYU-GURecomp describe --tags     -> v0.10.0-test
$ git -C .tmp/ext/SUYU-GURecomp rev-parse HEAD      -> 35015f1488eeabc226f815fbadc2f348ebb948f8
$ git -C .tmp/ext/forge-pc describe --tags          -> v0.7.0
```

两点值得记：
1. 三份 suyu 报告都自称「SUYU-GURecomp 35015f1」；克隆的 HEAD 与 tag `v0.10.0-test` 都指向 `35015f1`，坐标成立（这也让 `suyu-release-check.md` 的 Unknown 第 1 条现在可判）。
2. `suyu-gurecomp-audit.md` 的「输入在 …（… dis-nvnrec.txt、dis-armrecomp.txt …）」里这两份 dump **在整个工作区都不存在**；同名引用实际落在 `addr-disasm.txt` / `dis-other.txt` 的块头（`## nvn_rec.cpp:226`、`## arm_recomp.cpp:160`、`## arm_recomp32.cpp:116`）。结论仍可复现，但清单是错的。

## 2. 分组证据

### 2.1 chunks/c01..c17（17 份）

机械核对（不读内容也能判的三项）：输入 dump 存在、块数、每块 16 条指令。

```
$ for i in 01..17: grep -c '^## ' .tmp/mhgu/suyu/chunks/c$i.txt
c01..c16 -> 3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3 ; c17 -> 2
$ awk '/^## /{...} /^[0-9a-f]{8}:/{n++}' chunks/c01.txt -> 16 16 16
```

块头到 SUYU 行的映射也全部对得上（c13 的 `0x3f40e0` 对应 `nvn_trace.cpp:101`，c14 的 `0x3f3e1c/0x3f91dc` 对应 102/103，c15/c16 的 `arm_recomp.cpp:590/608/611/641/1130`，c17 的 `arm_recomp32.cpp:116`、`nvn_rec.cpp:226`）。

内容层：把 17 份 chunk 的 50 条 `(vaddr,status)` 抽出，与合并后的 `suyu-addr-check.md` 逐条 join：

```
$ 共 50 行 / 50 行；vaddr 集合差集为空；status 差异 0
```

逐块抽读的样本（每个都是把文档的引句拿回 dump 找原字节）：

- c01 `0x13edd58`: `push{r4,r5,r6,r7,r11,lr}` / `sub sp,#1472` / `movw r1,#0x9864`+`movt r1,#0x32ab` / `cmps` / `bne 0x13edde4` / `ldrb r0,[r5,#8]` / `e6ef1071`（文档说是 `uxtb r1,r1` 而不是反汇编打印的 `strb r1,[pc,r1,ror r0]`）—— 全部命中，且这条纠读是对的（`0xE6EF1071` 的 STRB 编码非法）。
- c09 `0x8bcd84`/`0x8bcd94`: `push{r4-r11,lr}` + `e24ddf8a sub sp,#552`；`0x139e814 e3500001 cmp r0,#1`、`0x139e820 e8bd8ff0 pop{r4-r11,pc}`。
- c10 `0xbc1200`: dump 从 `0xbc1204` 起，文档说前一条是 `blx r7`；用 MHGU RE MCP `disasm vaddr=0xbc11e0` 得 `00bc1200: e12fff37 blx r7` —— 成立。
- c12 `0x13b3054`: `push{r4,lr}` / `movw r12,#0xffff` / `ldrh r3,[r0,#6]`；`0x13a6d94`: 8 寄存器 `push` + `add r8,r5,#364`。
- c14 `sdk+0x3f91dc`: `ea015bf0 b 0x4501a4`，随后 `ea015e6e b 0x450ba0`、`e1a03001 mov r3,r1`（r1/r2/r3 轮转）、`e3a01000 mov r1,#0` —— 与「别名/转发 stub 串」描述一致。

格式差异（不影响判定）：16 份有 H1（`# Chunk cNN -/— …` 或 `# cNN -/— …`），只有 `c15.md` 首行是裸文本、不是 Markdown 标题；显式写出 `Input:` 路径的只有 c01/c02（c14 在正文里点了 `sdk-helpers.txt`），其余 14 份把输入 dump 写在标题行或省略——17 个 `chunks/cNN.txt` 本身全部存在，块头也能反向定位，故不构成 MISSING。

### 2.2 chunks/spk-format.md

该文档全部断言标 PLAUSIBLE，来源是 `tools/a32recomp/mtf_shaders.py` 与 `pipeline_manifest.py`（都在 `.tmp/ext/SUYU-GURecomp` 下）。逐条回源码：

| 文档断言 | 源码位置 | 结果 |
|---|---|---|
| RomFS 0x50 头 + dir/file 元数据 + data_off | mtf_shaders.py:17、:34 `<10Q` | 命中 |
| 十字段顺序（头大小…data 偏移） | :34 变量名逐个同名 | 命中 |
| 目录记录 +0x14 名长、+0x18 名字，父链上行 | :41 `<6I`、:42 切片 @24、:43 `off = parent` | 命中 |
| 文件记录 32B 头 + +0x20 名字 + 四字节对齐 | :48 `<IIQQII`、:49 @32、:51 `32 + ((nl+3)&~3)` | 命中 |
| 载荷 = data_off + 记录内相对偏移 | :50 `data_off + doff` | 命中 |
| `.arc` = `ARC\0` + u16 版本 0x11 + u16 计数 @6 + u32 pad + 80B 项 | :18、:56-:58、:60 `12 + k*80` | 命中 |
| 项 = name[64] + type_hash + comp_size + size\|flags + offset，zlib | :19-:20、:62、:99 `zlib.decompress` | 命中 |
| SPK = 0x50 SPH + code | :21 | 命中 |
| 程序前 0x30 处 `0x12345678` | :22、:29 `MARKER`、:68-:69 `m.start()+0x30` | 命中 |
| 结尾 EXIT `0xE30000000007000F` | :23、:28 | 命中 |
| 抽样：标记 → +0x30 起点 → 前 0x80 字节作键 | pipeline_manifest.py:78-87 | 命中 |
| 允许缺尾部终止符（短长度） | :91-99 | 命中 |
| stage 取第 7 个字，compute/geometry 拒绝 | :61 `words[6]`、:62 | 命中 |
| 记录布局（`<IIIB` + `<4Q` + `<7I` + tables + 可选 0x50 头 + key） | :114-133，key 1056 = :33 | 命中 |
| 头副本仅在不等时写入，flag 记录「相等」 | :122-:126 | 命中 |
| 解析必须恰好消耗完，否则 trailing bytes | :70-72 | 命中 |
| manifest = 4B magic `SPMF` + 6×u32 = 28B 前缀 | :31-:32、:135-:136、:155 `p = 28` | 命中 |
| SPK 长度 + CRC32 双绑定 | :150、:153-154 | 命中 |
| 两条 u16 长度串被跳过，重建 `yuzucach`+cache_ver | :156-:159 | 命中 |
| 同字节记录去重 | :131-:133 | 命中 |

文档把「magic/version/key size 位于 60 行以上、本 chunk 不可见」写成显式缺口，且没有据此升级任何状态——与证据强度一致。DOC-LINKS 把 `tools/a32recomp/mtf_shaders.py`、`pipeline_manifest.py` 标 MISSING，是以 MHGU 仓库为根解析造成的，误报。

### 2.3 suyu-addr-check.md

```
$ grep -E '^\| (0x|sdk\+)' suyu-addr-check.md | wc -l      -> 50
$ awk -F'|' '{print $5}' ... | sort | uniq -c               -> 21 VERIFIED, 20 PLAUSIBLE, 9 SKIP
```

抽样回 dump（每类各取）：`0x139dda8` → `strb r11,[r6,#1528]` / `b 0x139df58`（且 0x139ddd8 同形）；`0x13aa698` → `ldr r0,[r4,#1488]` + `pop{r4-r7,r11,pc}`，`0x13aa6a0: 00496a70` 为数据；`0x131c3e0` → `push{r4-r10,lr}` + `sub sp,#184`；`0x13b3054` → `movw r12,#0xffff` / `ldr r3,[r0,#6]` / `mov r4,r2,lsl #16`；`0x130cb64` → 起始即 `ldr r1,[r0,#0]`（无 push）；`0x2160` → `00002160: 01836ae8 .word`、`0x216c push{r4,lr}`；`0x1f00` → `0154eeb5`，真入口在 `0x1f08 push{r4,lr}`。

三处 `sdk+` 行引用的 nnSdk 坐标复核：源码 `src/core/arm/recomp/nvn_trace.cpp:101-103` 的 `kHelpers` 表逐项为 `{helper_int64_to_double, 0x3f40e0}`、`{helper_double_to_int64, 0x3f3e1c}`、`{helper_memcpy, 0x3f91dc}`，加减基准在 :324 `sdk + kHelpers[k].sdk_offset` —— 三行的 `sdk+` 前缀与行号（101/102/103）都正确。

### 2.4 suyu-gs-part1.md

- 覆盖：`grep -c '^## ' dis-gs-1.txt` = 39；文档四张表 36 个代码地址 + 3 个排除字面量（0x243C/0x1080/0x1440），vaddr 集合逐一相同，无漏无多。
- VFP 记账逐字解码（文档的 evidence 列写的是助记符，dump 只给 `.word … coproc`，所以直接按位解）：
  `ed911a0f` = `vldr s1,[r1,#0x3c]`；`ed9f2a05` = `vldr s2,[pc,#20]`（= 0x1C37C 的 `0x3C8EFA36` = π/180）；`edd10a0c` = `vldr s16,[r1,#0x30]`；`ed910a0d` = `vldr s0,[r1,#0x34]`；`edd11a0e` = `vldr s17,[r1,#0x38]`；`ee211a02` = `vmul.f32 s1,s1,s2`。
  `0x1C3A8` 块（变体）：`ed9f1a06` = `vldr s1,[pc,#24]`（= 0x1C3C8 的 `0x3C8EFA36`）、`ed902a0f` = `vldr s2,[r0,#0x3c]`、`edd00a0c` = `vldr s16,[r0,#0x30]`、`ed900a0d` = `vldr s0,[r0,#0x34]`、`edd01a0e` = `vldr s17,[r0,#0x38]`、`ee221a01` = `vmul.f32 s1,s2,s1`。
  → 文档连 s16/s17 的 D 位编号都对，**比审计文档给的「字段偏移只能取自 SUYU 注释」的评价更强**。
- cite 列机械比对：39 行的 `(vaddr, cite)` 与 dump 的 `## file:line 0xaddr` 头 join，只有 **2 行不符**：文档写 `game_settings.cpp:1201`，dump 头是 `game_settings.cpp:1202`（0x1314290、0x1314298）。0x1313EE8 的 `1201,1212` 是双引用（0x6D 使能位注释在 1212），不算错。

### 2.5 suyu-gurecomp-audit.md

作为「对另三份报告的审计」，它的判定可复现：sdk 三行对 `sdk-helpers.txt` 成立；addr-check 的 50 行状态分布与文档所述一致；spk-format 的 PLAUSIBLE 评级与源码一致；抽查 `0x139dda8`、`0x13aa698`、`0x8bcd84`、`0x131c3e0` 均命中。三处记账错误：

1. 输入清单列 `dis-nvnrec.txt`、`dis-armrecomp.txt`（两份都不存在，见 §1）。
2. `nvn_trace.cpp:102-104` 出现两次（小节标题与「Citations resolve」条），源码是 101-103。
3. Summary 说「5 PLAUSIBLE + 5 SKIP rows spot-checked」，而它自己的表逐行给了 20 个 PLAUSIBLE、9 个 SKIP 的裁决（合 50 行）。

这三处都不改变任何一条 PASS 结论，故文档级仍判 OK，专项行判 WRONG。

### 2.6 suyu-release-check.md

这是本切片里外部事实最密的一份，逐类复核：

- **SHA-256 表**：8 个值全部出现在 `github.com/GUReComp/SUYU-GURecomp/releases` 页面正文（curl 落盘后 `grep -c` 逐个 = 1），包括 `3e6af297…9d3d07`（v0.10.0-test win）、`574d5a6f…`（linux）、`0db782a9…`（v0.8.0-test-linux）。文档「API digest 与 body 的 SHA-256 字符串相同」成立。
- **克隆 == release commit**：`git describe --tags` = `v0.10.0-test`、`rev-parse HEAD` = `35015f1…`，与文档记的 tag commit 相同 → 其 Unknown 第 1 条现可判且成立。
- **INSTALL.md 行号**：`36/37/38/40/41/65/97/101/102/106/109/111/113/126/130/153/164/213/216` 逐行 `awk NR==` 打印，全部是文档引的那句话（25GB/VS17.14/1.4.0 门/导出/10-20min/`Built single-file launcher with the link kit`/`.exe`/`game_settings.ini`/mods/Forge/report 禁令）。
- **源码行号**：`game_export.cpp:1701-1704`（"no CMake, no suyu sources"）、`:1708-1721`（`no Visual Studio C++ build tools found (vcvars64.bat)`）、`:2229-2233`（vswhere 分支）、`:508-513`（"about 10 GB more"）、`:3414-3420`（launch.bat/dll/exefs/mods/user）、`:2678-2684`（成功日志）、`game_settings.h:22-27`（1.4.0 + fps 写策略）、`game_settings.cpp:41-44`（kMhgu/kFrameRateGlobal 0x18A6210/kFrameRateField 0x243C）、`path_util.cpp:105-117`（portable `user` 优先于 `%APPDATA%`）、`:162`（SaveDir = NAND_DIR）、`savedata_factory.cpp:137`（Account 路径 `save/{:016X}/…/{:016X}`）、`src/core/arm/recomp/mod_host_api.h:95-96`（`user_dir`/`mods_dir`）—— 全部命中。
- **资产字节数 / 星标 / 开放 issue / published 时间**：属于 GitHub REST 独占字段；本次两次请求都返回 `API rate limit exceeded for 13.215.176.66`，releases 页面 HTML 不带 asset size，故这组数值本次 **UNVERIFIABLE**（与 SHA 一致可作旁证，不能当结论）。
- 另有口径小瑕：`RELEASE.md:8` 之类裸路径，仓库根并无 `RELEASE.md`，实际在 `docs/a32recomp/RELEASE.md`（行号内容对得上）；`README.md:206` 则确在根。

### 2.7 forge-pc-and-porting-precedents.md

实体事实几乎全部复现：

```
$ curl apiv11/Mod/458243  -> "Port: Silverwind Narga Armor [from gatomiau]" / "Replace Lucent Narga both Male & Female" / "Game Version 16.0.1"
$ curl apiv11/Mod/414340  -> "Lagiacrus model swap" / "replaces Royal Ludroth's model with Lagiacrus"
$ curl apiv11/Mod/603812  -> "MHRisebreak G-Rank Jukebox" / "13 track changes for G-Rank Hub"
$ curl apiv11/Mod/730855  -> "Recomp Cam Distance"
$ curl apiv11/Game/8898/Subfeed -> _nRecordCount 198（与文档同）
$ curl apiv11/Util/Search/...   -> Nerscylla/Zamtrios/Hellblade 在 Rise hub 各 0 条（与文档同）
$ curl github.com/GUReComp/forge-pc/releases -> ForgePC-0.7.0-with-UIFix.zip, sha256 69f53a80feaeb…
```

**但行号级引用系统性失准**：

```
$ wc -l .tmp/ext/forge-pc/README.md include/forge_pc.h include/mod_host_api.h
  244 README.md
  333 include/forge_pc.h
  234 include/mod_host_api.h
$ grep -n 'FORGE_PLUGIN_DEFINE_API\|FORGE_PC_VERSION_MAJOR\|typedef struct ForgePluginInfo\|older than mod host ABI 2' include/forge_pc.h
  325:#define FORGE_PLUGIN_DEFINE_API …
   65:#define FORGE_PC_VERSION_MAJOR 0
   81:typedef struct ForgePluginInfo {
  248:… an exe older than mod host ABI 2 …
$ grep -n 'Structs only grow' include/mod_host_api.h
   18: *   - Structs only grow at the end …
```

文档引用的是 `forge_pc.h:864-866`、`:832-858`、`:938-944`、`:912-916`、`:1230`、`:1362-1364`，以及 `mod_host_api.h:626-628`——**一个 333/234 行的文件不可能有这些行**；且文档同一节又写「`include/forge_pc.h`（333 lines）」，自相矛盾。`raw.githubusercontent.com/…/main/include/forge_pc.h` 今日仍是 333 行，排除「版本差异」。附带的「README（340 lines）」也应为 244。

结论：**实体结论可用，引用不可用**。

## 3. 与 DOC-LINKS 的关系（12 条 MISSING 的处理）

- 本切片自身在 `DOC-LINKS.tsv` 里只有 5 行：`chunks/spk-format.md` 的 `tools/a32recomp/{mtf_shaders,pipeline_manifest}.py`，`suyu-release-check.md` 的 `docs/a32recomp/{CHANGELOG,AI_DISCLOSURE,INSTALL}.md`。**5 条全部存在**于 `.tmp/ext/SUYU-GURecomp`，是以 MHGU 仓库为根解析的误报。
- 题面提到的 `docs/reference/suyu/*` 12 条（不属本切片，不重报）：逐条在克隆里落地后 **11 条存在**（`tools/a32recomp/README.md`、`a32_runtime.h`、`make_link_kit.py`、`a32cov.cpp`、`tools/a32recomp/` 目录、`docs/a32recomp/` 目录等）；**只有 `docs/a32recomp/README.md` 不存在**（该目录下是 CHANGELOG/INSTALL/INSTALL-LINUX/BUILDING/RELEASE/AI_DISCLOSURE/RYULDN 七份，没有 README.md）。这属于 REFERENCE-DATA 切片的处置范围，此处只作边界提示。

## 4. Difficulties

- **GitHub REST 被限流**：`api.github.com` 对本出口 IP 持续返回 rate-limit（两次、间隔约十分钟），因此 `suyu-release-check.md` 的 asset 字节数、star 数、created/pushed 时间戳、`immutable:false` 只能判 UNVERIFIABLE；可验证的部分（8 个 SHA-256、克隆 tag、全部文档/源码行号）都已对上。需要钉死这组数字得有 token 或等限流窗口。
- **VFP 指令在 dump 里是 `.word`**：`dis-gs-1/2`、`dis-gs`、`addr-disasm` 都把 VFP 打印成 `.word … coproc`，所以 `suyu-gs-part1.md` 的 `vldr s16/s17` 类断言无法用 `grep` 直接核；本文按 ARM VLDR 位域（U/D/Rn/Vd/imm8）手工解码了 0x1C358 与 0x1C3A8 两块各 6 条、共 12 条，结论是文档正确。这也是审计文档给出「只能信 SUYU 注释」这一偏保守评价的原因。
- **`0xbc1200` 不在任何 dump 窗口内**：dump 从 `0xbc1204` 起，只能借 MHGU RE MCP 的 `disasm` 补出 `blx r7`；`mcp__mhgu_re_disasm` 对 MHGU main 1.4.0 可用，vaddr 与 dump 的 flat-0x100 口径一致。
- 未再核的项（成本高、且不改变判定）：`suyu-release-check.md` 里的 `target_commitish`、`immutable`、repo size 与 open-issue 数（同属被限流的 API 字段）；`forge-pc` 文档里 README 关于 hot_reload/menu 的散文（抽查 README:27/:46/:145/:155 命中「Insert」「Reset scripts」「hot_reload = false」）；GameBanana 上 `Pega[Sus] Fantasy`（526810）的页面正文（文档自己也标为未读）。
