# MHGU 道具箱扩容 — 契约文档（2026-10-22）

## 目标
让 yuzu 中运行的 MHGU (Monster Hunter Generations Ultimate, titleID `0100770008DD8000`, v1.4.0) 的**道具箱格数上限** ≥ 游戏内全部可装入道具箱的道具种类数。

## 资产
| 项 | 路径 | 备注 |
|---|---|---|
| yuzu 主程序 | `LOCAL\yuzu1734\yuzu.exe` | 用户游玩端 |
| 游戏镜像 | `I:\BaiduNetdiskDownload\MONSTER HUNTER GENERATIONS ULTIMATE][1.4.0].xci` | 12.57 GB |
| yuzu AppData | `G:\appdata\C-Users-USER\Roaming\yuzu\`（junction） | nand/keys/load 全在 G: |
| MHGU 存档 | `yuzu/nand/user/save/0000000000000000/85A7D07F6ED7C1D6F6045DE67FE969F1/0100770008DD8000/` | `*.hnt`(1,177,760 B/槽) + `system`(5,159,100 B) |
| LayeredFS 目录 | `yuzu/load/0100770008DD8000/` | 已有 a商店MOD / b4k / ChuckPatch / c120FPS-Map |
| prod.keys | `yuzu/keys/prod.keys` | hactool 可用（`-k` 传参即可，勿放 hactool 同目录） |

## 已确认证据（主会话亲验）
1. **XCI 解包**：`hactool.exe -t xci -k prod.keys --securedir=...` → secure 分区 12 NCA 已提取到 `.tmp/mhgu/extract/secure/`。
2. **目标 main**：NCA `0eb59fa8…` 的 ExeFS `main`（NSO0）解压后 `main.140.flat.bin`：
   - NSO build id @offset 0x40 = `FB08F1D20FD1204FE7070672777F869B` → **与现存 `1.4.0.pchtxt` 的 @nsobid 完全一致**。
   - 段映射（vaddr=文件偏移，装载基址 0）：`.text 0x0–0x13f1dec`，`.rodata 0x13f2000–0x172ecfa`，`.data 0x172f000–0x184ad78`，`.bss 0x184aff8–0x2146780`。
3. **指令集 = ARM32**（byte3 高半字节 0xE 占比 ~90%，E92D push / E8BD pop / E12FFF1E BX LR / EB BL 遍布全 .text）。**不是 ARM64**。3DS 版 MHXX 的代码直接移植。
4. 调试名字符串（位于 .rodata）：`sItemBox@0x1557eb4`、`mItemBox[i]@0x1557ebd`、`sItemPouch@0x1557ed7`、`sEquipBox@0x1555e0b`、`mHunterEquipBox[boxIndex]@0x1555e15`、`uUIItemBox@0x155149d`、`cUIOItemBox@0x156a886`、`[ITEM_BOX]@0x1563cd8`。
5. main 带 ELF dynamic 段 @0x1837f20（SYMTAB@0x84eb 等），动态符号仅限 nn:: 导入导出。
6. 存档 `system`/`*.hnt` 结构未解析；`.hnt` 槽文件 1,177,760 B。

## 立即数扫描候选（ARM32 DP-imm / MOVW，已修解码器）
- `cmp/imm` 类真值 `0x900(2304)`：`0x4f0a40`（sub r6,#0x24 + cmp r6,#0x900 + bne → **循环上界，强候选**）、`0xc0cd48`（sub r4,#0x80 + cmp r4,#0x900 + bne → **按 0x80 步进清数组循环**）、`0xcf4ce0`（cmp r0,#0x900 + bgt → switch 边界）、`0x4eb5b8`/`0x4ed500`（结构体初始化尾部 cmp）、`0x681734`/`0x6bde84`（`and r?,#0xff00` 后 cmp）。
- `MOVW #0x900` ×4：`0x13c0c78` `0x13c0ee0` `0x13c1e00` `0x13c2254`。
- `MOVW #0x8fc(2300)` ×8：`0x198fa0` `0x198ffc` `0x19a4f8` `0x19a568` `0x2491a8` `0x3e8a10` `0x5a708c` `0xbe2088`。
- `MOVW #0x640(1600)`：DP 20 处 + `0x927c9c`；`MOVW #0x578(1400)` ×14；`MOVW #0x9c4(2500)` ×17；`MOVW #0x898(2200)` ×11；`MOVW #0x5dc(1500)` ×37；`MOVW #0xbb8(3000)` ×36。
- MHXX(3DS) 已知事实（待验证）：箱页数 14、装备箱 2000（0x7d0 有 98 处 DP 命中，大量 `cmp r?,#0x7d0`）。

## 工具链
- `hactool.exe`：`.tmp/mhgu/tools/hactool.exe`。**bash/cmd 调用正常；Bun.spawn 会卡死（勿用 eval 调外部 exe）**。
- 反编译：无 Ghidra/IDA/capstone。ARM32 反汇编 = 主会话手写 JS 解码器（见会话 eval 历史；够用级别：DP-imm/MOVW/MOVT/B/BL/LDR/STR/LDM/STM）。
- NSO 解压：LZ4 块格式（非 frame），JS 解码器已实现，输出 `exefs-0eb5/main.140.flat.bin`。
- 字符串表：`.tmp/mhgu/analysis/main-strings.json`（offset→string 30,516 条）。
- yuzu pchtxt 放置点：`yuzu/load/0100770008DD8000/<ModName>/exefs/1.4.0.pchtxt`，`@nsobid-FB08F1D20FD1204FE7070672777F869B` + `@flag offset_shift 0x100`（地址 = flat 偏移 + 0x100？ b4k 惯例，需以实测为准）。

## 工作规则（沿用 AGENTS.md + HANDOFF-20261022）
- 用户可见输出全中文；子代理 prompt 仅中/英/法/德/俄 + ASCII。
- 中间产物落 `.tmp/reports-mhgu/`；**定案后的知识产物必须迁入 `docs/`**（见 `docs/README.md`）并 commit —— `.tmp` 会被清理。
- 子代理：dsv4.1f（effort: hi）无上限但本轮用户限 ≤5 并发；swe2max ≤3 worker。
- 每 worker 1–2 文件写范围，契约证据前置，先落盘再继续。
- 验证 = yuzu 实机读档看道具箱页数/上限；跑不了实机必须明说。

## 风险
- 箱容量可能是**存档结构定长**（数组在 `system` 或 `.hnt` 内硬编码）→ 扩容需同时改代码常量 + 处理既有存档布局；若存档区无空隙，只能「上限>总类数」的最小补丁（让 UI 显示全量）或动存档格式。
- 道具总类数未确定：需解 romfs item 数据表（Patch RomFS 在 update NCA 内，BKTR 需 base romfs——base 在 9.1 GB `98abd400…nca`，其 header 加密方式 hactool 1.4.0 读不了？待查）。

## 决策分叉（2026-10-22，5 worker 闭环）

**事实链（游戏 ARM32 代码 + .NET 存档修改器源码 + 真实存档 round-trip 三源互证）**：

| 字段 | 值 | 证据 |
|---|---|---|
| `system` 文件总大小 | 5,159,100 B | 编辑器:5996；SaveStruct hexdump |
| 容器 | 36 B 头 + 3 个槽块；槽头 u32 @0x34/0x38/0x3C；槽数据跨距 0x11F8C4 | SaveStruct §1.1 |
| 槽数据/`.hnt` | 1,177,760 B（`.hnt` = 槽数据裸拷贝） | SaveStruct §1.1 |
| **道具箱槽数** | **2300 = 0x8FC** | main `movw r?,#0x8fc` 5 处：`0x19a4f8`(写序列化)/`0x19a568`(读)/`0x3e8a10`(清零)/`0x198fa0`(正向搜索)/`0x198ffc`(反向扫描)；编辑器:4757；存档实测 2300 格后解码即垃圾 |
| 运行时槽格式 | **4 B/格** `{u16 id, u16 count}`，基址 `*(*0x183a81c)+0x1a`，区间 `+0x1a..+0x240A` | `0x18bbec` 访问器 |
| 存档槽格式 | **19 bit/格** `{id:12\|count:7}`，LSB-first，**位流倒写**：文件需整块字节反转 + 槽序 2299→0 | main `0x19a504 movw r1,#0xbaf`(2991→12bit)+`0x19a520 mov r1,#0x63`(99→7bit)；编辑器:4763-4784；SaveStruct encode/decode 对两份真实存档 **0 差 round-trip** |
| 存档箱区偏移 | `+0x278 .. +0x17CE`（5463 B） | SaveStruct §2；编辑器:632 |
| 箱尾紧接 | `+0x17CF` 起：8B 未知 → 填充 0 → `+0x17F9` u16 对表 → `+0x1879` 起 **0xAA(170B) stride 道具套装定长记录** | SaveStruct §5.1 实测 |
| **校验和** | **无 CRC/hash**（容器头 0x36B2EE74 为格式常量，非校验；编辑器整块回写不重算） | SaveStruct §4 七条否定证据 |
| 道具 ID 空间 | **0..2990（2991 项）**，MAX=0xBAE=2990 | main `0x383f14/0x383f78/0x6fd0e0 movw #0xbae`、`0x383f38 movw #0xbaf`；序列化器 `0x19a504 movw r1,#0xbaf` |
| 真实道具种类 | **2940**（MHGU 名录）/2955（MHXX 名录），最大真实 id 2976 | MHGU Modding Wiki + MHXXSaveEditor `ItemNameList` 双源（ItemCount §4） |
| 末尾余量 | `+0x11F86E` 最后非零字节，**仅 ~50 B** | PatchDesign §1.2 |
| **装备箱区** | `+0x62EE..+0x17C2E` = 2000 × 36B 猎人装备箱（首条 `ee 00 2c 00` type=0x0E 锤） | SaveStruct/主会话实测 `.hnt` 与 `system` 双源（编辑器:2171 也声明 2000 格 @num=25326=0x62EE） |
| **候选搬迁区** | `+0x18021 .. +0x208AD`（34,989 B 全 0，4 份文件全 0）| 主会话扫描；**须与套装记录区（0xAA stride 自 +0x1879）边界核实** |
| 套装名块 | `+0x208CE` 起 40 × 136B | 编辑器:2929 `num=133326=0x208CE`, stride 136 |

## 决策分叉（2026-10-22，5 worker 闭环 + 主会话实机推进中）

### 目标判定

「箱格数 > 可入箱道具种类数」⇒ 需 **≥2992** 格（≥2991 全 id 空间）或 ≥2944（按 2940 真实种）。**2300 < 2940，缺口 ≥640**，且**原地扩容余量 = 0**（箱尾 0x17CF 立即是别的字段）。目标未满足。

### 方案评估

| 方案 | 判定 | 理由 |
|---|---|---|
| PatchDesign §3(c)「扩容+等量缩短 0xFF0 组块」 | **否决** | 0x17CF 之后不是连续组名块，而是套装定长记录（0xAA stride）；缩短会截断有效套装数据且位流仍覆盖 u16 对表 |
| ~~A. 搬迁道具箱至 +0x7000~~ | **证伪** | +0x7000 落在装备箱区（+0x62EE..+0x17C2E，2000×36B）内部——会破坏装备数据 |
| A'. **搬迁道具箱至 +0x18021 空闲区**（34,989 B 全 0，4 份文件验证） | **当前唯一候选** | 需改：位流基址（调用方算出）、6 处 MOVW、RAM 尾指针；无校验和；旧档重打包即可。前置：确认该区不被装备序列化器/套装记录覆盖 |
| B. 保持 2300 | 不满足目标 | 真实 2940 > 2300 |
| C. 只改存档 | 无效 | 代码仍按 2300 读 |

**A 的修改清单**（PatchDesign 已逐字节复核 MOVW 编码）：
1. `0x198fa0` `movw r12,#0x8fc` → `#N`（正向搜索上界，N 须偶数）
2. `0x198fec` `movw r2,#0x2408` → `#(0x18+4N)`（反向扫描尾指针）
3. `0x198ffc` `movw r2,#0x8fc` → `#N`（反向扫描计数）
4. `0x19a4f8` `movw r7,#0x8fc` → `#N`（写序列化循环）
5. `0x19a568` `movw r5,#0x8fc` → `#N`（读序列化循环）
6. `0x3e8a10` `movw r1,#0x8fc` → `#N`（运行时清零循环）
7. **位流基址**：找到把 0x278 传入 0x19a4ec/0x19a55c 的调用点改为 0x7000（SaveStruct 未定位调用方——待补查）
8. **前置风险**：必须先确认 `+0x7000..+0x17C2E` 不是 MHGU 装备箱（SaveStruct §7：MHXX 布局该区为装备箱，但 MHGU 2000 格×36B 解码全空，布局已变或未用，未定位）

**推荐 N = 2992（0xBB0）**：≥2991 全 id 空间、8 的倍数（19×2992/8=7106 整字节）、偶数（正向搜索两格步进）。或保守 **N = 2944（0xB80）** 刚好覆盖 2940 真实种。

### 反汇编器勘误（全 worker 交叉验证）

`tools/disasm.mjs` 两处 bug：
1. **ADD/SUB 互换**：op 0x4=ADD、0x2=SUB。`imm-candidates.txt` 全部 `SUB #0x900` 实为 `add`。
2. 普通 `ldr/str` 误印 `ldrh/strh`；`blx` 误印 `teq`。

⇒ `0xc0cd18`/`0x4f0a40`/`0x4eb5b8`/`0x4ed500` 等全部 0x900 循环均为**字节跨度**（18×0x80 引擎 ctor / 64×0x24 Sound 池），与箱容量无关。2300 只以 MOVW 形式存在 8 处，其中 5 处是箱相关。

### 模块地图

- item 代码 ~0x180000–0x1a0000（本补丁全部落在此区间）
- equip ~0x13f000–0x146xxx（sEquip 初始化 2000×0x2c/1000×0x2c/1000×16B/2000×8B，疑装备箱/数据表，勿动）
- sound ~0x4d0000–0x4f0fff；engine ~0xc0c000–0xc1c000

### 存档修改器关键偏移

`currentHunterBytes`（1,177,760 B）：`+0x278` 道具箱位流；`+0x2EFF` 24×170 组名块（编辑器:5248；main `0x19a84c cmp r1,#0x17`/`mov r2,#0xaa`）；`+0x28` HR；`+146358` 猫区 27216B。

---

# ═══ 2026-10-22 V7 终案（supersedes 上方早期方案） ═══

## 最终结论

**23 页根因**：UI 容量来自 `0x198F04` 混淆函数 `1000+300*popcount(flags)+200*bits`=2300，
19 个 UI 调用点 → `0x553A74` 网格 → `ceil(2300/100)=23`。非存档/位流问题。

**A 槽物理上限 = 2300**：对象布局 `obj+0x1A`(A槽 2300×4B → +0x240A) → B聚合表
+0x240A → C +0x47FA → D +0x59F2 → 堆ptr +0x62F0 → 预设 +0x62F4。N=2992 的 A[2300+]
会压 B → 排序时 B 重建摧毁高段道具。**必须做布局后移 +0xAD0**。

## V7 patch（123 行，`patch/1.4.0.pchtxt`，已部署）

组成 = V6(22) + 容量getter(2) + 30内联容量 + 65布局后移 + 4预设guard。

| 段 | 旧偏移 | 新偏移 |
|---|---|---|
| A 槽数组 | +0x1A | +0x1A（不动，扩到 2992×4B → +0x2EDA） |
| B 聚合表 | +0x240A/0x240C | **+0x2EDA/0x2EDC** |
| C 表 | +0x47FA | **+0x52CA** |
| D 标志 | +0x59F2 | **+0x64C2** |
| 清零长度 | 0x59D8/0x47E0 | 0x64A8/0x52B0 |
| 堆备份 ptr | +0x62F0 | **+0x6DC0**（adj 0x62D6→0x6DA6） |
| 预设基址 | +0x62F4 | **+0x6DC4** |
| 预设记录字段 | +0x631D/1E/20/22 | **+0x6DED/EE/F0/F2** |
| 对象大小 | 0x72E4 | **0x7DB4** |

- 预设 24→14（借位流空间，0x1E3A 起 2437B 块）；4 处 idx≤23 guard 改 ≤13。
- **3 处易漏 UI/字段站点**：`0x5B817C`(B页基址)/`0x5B8184`(D页基址)/`0x19AD08`(rec+0x2E)。
- **容量 getter** flat `0x199004/0x199008`：`movw r0,#0xBB0; bx lr`（短路混淆函数）。
- **30 内联容量** `e2800ffa`→`e3000bb0`（flat 偏移，**勿用 vaddr**——曾酿成 28 处误写 P0）。
- **known-gap**：`0x19B1F4` 预设互拷无 idx 上界，可写越 obj+0x7DB4（未打）。

## 偏移/位流语义（定案）

- yuzu1734 IPS 行地址 = **flat 文件偏移**（`file_off = vaddr + 0x100`，flat 含 0x100 NSO0 头）。
  `applied == line`，**无 offset_shift**。
- 位流正序：`file slot k = UI slot k`（早前"倒序"结论错误）。
- 位流 19bit/槽 LSB 打包，2992 槽 = 7106B @ `+0x278`；预设块 @ `+0x1E3A`。
- 存档**无校验和**，任意字节修改合法。MHGU 单槽 = 1177760B（XX=1173440B）。

## 存档修改器修复

`editor-src/`（可 `dotnet build -c Release`，net472 + NuGet ref assemblies）：
- **导出单槽 bug**：5 处 `1173440`(XX)→`1177760`(MHGU)。已部署 `MHGU存档修改-V2.exe`。
- **UI 现代化**：ItemsForm 重写（搜索过滤/Segoe UI/CardPanel）。

## 知识库（反编译成果，已入 git：`docs/save-layout/` + `docs/analysis/`）

> 权威副本在 `docs/save-layout/` 与 `docs/analysis/`；`.tmp/` 下同名文件是工作副本。

| 报告 | 内容 |
|---|---|
| `ui-page-bound.md` | UI 分页界：`0x198F04` 容量函数、19 调用点、`0x553A74` 网格 100/页 |
| `preset-deadzone.md` | 预设区死区、guard 站点、`0x19B1F4` 无界互拷 |
| `equip-box.md` | 装备箱 2000/1000 槽结构（勿动区） |
| `item-table.md` | `itemData.itm` 2991 条×44B id→name/type/limit/icon（`item-table.tsv`） |
| `save-load-path.md` | 存档序列化/反序列化全路径 |
| `editor-ui-redesign.md` | 编辑器 UI 重写设计 |
| `recovery-report.md` | 会话恢复记录 |

## 工具

- `tools/box-slot-tool.mjs`：`read|write|used <save.hnt> [...]`，19bit LSB 编解码，slot=UI 索引。
  新增 `--base=<charOff>` / `--slots=<n>` / `--pouch`(=base 10175, slots 32)；默认仍 base 632 / 2992，旧用法不变。
- `tools/build-v7-final.mjs` + `v7-shift-65.json`：V7 生成器（字节级验证源）。
- `main.140.flat.bin`：25.4MB flat（含 NSO0 头）。

## 实机验证状态

- yuzu Vulkan `VK_ERROR_UNKNOWN`（Win32 surface-caps 损坏，与补丁无关）→ **OpenGL 绕过成功**
  （`backend\default=false`+`backend=0`）。游戏进存档加载、patch 123 行全应用无 ARM 异常。
- **剩余**：游戏内开箱翻页看 8 个 marker（2400-2403/2900-2903）+ 页数=30 → 视觉确认交用户（§2）。
- 猎人A 存档离线复核：605 项、范围 0..2903、marker 全在正确槽位、位流/预设边界正确。

# ═══ 2026-10-22 存档测绘 + 编辑器修复（supersedes 早期盲扫） ═══

## 任务解锁卡对话 — 根因定案（swe2 独立复核版）

- **位图坐标系**：两套位图并存。存档 `obj+0x42C`(cleared)/`+0x52C`(seen)/`+0x62C`(achieve) 各 256B 位域按**记录序号 i**寻址（`0x51e6d8` 逐位 or 写）；运行时 `+0x35F0/+0x35FC/+0x3608` 按 **questId**（`0x523e44` questId→idx→置位，`0x524e58` 每次重建只增不清）。**位号 ≈ questId**（M1：运行时表按全局 id 有序，i==id；OtherForm ArenaQuest 写 char_off 11544-11546=bit1288-1304 恰对斗技 questId 1288-1304，作者级见证）。
- **卡对话根因**：编辑器「任务Clear/解锁」**只置 cleared 不补 seen** → 造 `cleared=1/seen=0` 矛盾向量。dirty 档 **501 个**（slot0:122 高位 questId 785-1173 G4/deviant + slot1:379 低位 40+ 村下位）。`0x521d4c`/`0x525040` 判定器喂 NPC 不可能态 → 死锁。
- **修复（已落地）**：`OtherForm.SetBits` cleared 写点（char_off 11383-11546）同位双写 seen(+256)，guard 锁 cleared 段。
- **脏档收敛**：`seen|=cleared` 位域级 → `system_fixed`（501→0）。待实机验证。
- **边界**：seen=1/cleared=0（仅解锁未完成）是另一功能；复合门禁类（case12 [mgr+0x3618] 等级腿）双写不充分；锁任务清位需重启生效（运行时位图只增）。

## 成员#4 存档文件布局（权威表，`member4-file-layout.txt`）

- 成员#4 数据 char_off **`0x2C0B..0x59AC`**（159 字段、0x2DA1 字节）。`0x51dc40` 反序列化 `bl 0x3df2a8(reader)` 顺序 = **文件字节序**（非 obj 偏移序）。
- 关键坐标：`0x42C`→0x2C77、`0x52C`→0x2D77、`0x62C`→0x2E77；狩技 0xD24/0xD3C/0xD54→0x2C13/0x2C2B/0x2C43；委托/许可族 0x2A0C..0x29C8；128B 任务记录族 0x2A78..0x3178；尾块 0x3684(3444B)。
- **编辑器毁档范围**（clean vs dirty 逐字段差分，`member4-diff.txt`）：除任务位域外，狩技(0xD24 19B/0xD3C 7B)、164B 数组(0x9D0/0xB18)、勋章邻(0xBDC/0xC28)、委托(0x2A0C/0x34A0/0x3510)、**128B 委托记录族 0x2DF8/0x2E78/0x2EF8(63/54/56 FF)** 全被涂——比卡对话严重，损委托任务数据。

## 编辑器 bug 全清单（P0 已修，commit 见各条目）

| 严重 | bug | 位置 | commit |
|---|---|---|---|
| 毁档 | ItemsForm 位流 2300 规格 V7 截断+抹预设 | ItemsForm.cs | f23128a |
| 毁档 | 任务解锁只写 cleared 不补 seen→矛盾向量 | OtherForm.cs SetBits | 156e6a0+1f933af |
| 崩溃 | 装备 LV/幻化/猎虫无钳制；套名读20B无NUL崩 | EquipsForm.cs ClampNUD | efce3dd+a6492ec |
| 不落盘 | TrainingForm 写侧不写 data 11bit | TrainingForm.cs | dfb861c |
| 不落盘 | 槽标志写 0x04+slot（污文件头）/导入空槽不写文件 | MainForm.cs | 8c0c3f5 |
| 字段宽 | 套装名/预设名实测 **42B**（非18/20） | MainForm.WriteUtf8Field | a6492ec+ccb935d |

**编辑器 0 覆盖区**（待新功能）：口袋 10175..10250(32×19bit)、猫装备箱 0x17C2E(1000×36)、套装道具 0x21E0E(24×68)、HR 不可编辑。

## 干净参照档（金标准，`save-snapshots/20261022-clean-reference/`）

- `system_CLEAN`：**唯一全干净档**（slot1 猎人A@0x2AC560，94 cleared，0 矛盾位）——只读保护
- `system_Desktop_extra`：**混合档**——slot0 干净(==clean 猎人B 参照，436/1007/0矛盾) + slot1 脏(==dirty slot1)
- `system_V7_active`：现玩 V7 档
- `system_fixed`（v6-ready/）：501 矛盾位收敛产物，待实机验证

## 待办（非阻塞）

- M1/M2 实机判据（id946→bit 测试）
- 501 矛盾位逐位定性（真进度补 seen vs 涂块清 cleared，需对照玩家清单）
- obj+0x0..0x424 头字段映射（成员#4 文件起点前的外层读取序，`0x51dbb4`）
- 复合门禁类解锁的等级腿（case12）
- 成员#15（0x163e0c）/口袋区/romfs questData 测绘

## 2026-10-22 追加测绘（成员#15 / 口袋 / 128B 记录族 / 成员#4 头区）

### 成员#15（反序列化 0x163e0c，swe2 复核 PASS）
文件 char_off **0x2C6B4..0x335A8**（28404B = 0x6EF4），6 块：

| 块 | 文件 char_off | obj+off | size | 性质 |
|---|---|---|---|---|
| B1 | 0x2C6B4..0x2DF6C | +0x20 | 6328 | **13B 头 + zlib 流**，明文 6328B 全零 = 容量占位 |
| B2 | 0x2DF6C..0x2F09C | +0x18D8 | 4400 | 运行期结构镜像 |
| B3 | 0x2F09C..0x2F7A4 | +0x2A0C | 1800 | 同上 |
| B4 | 0x2F7A4..0x2F8B8 | +0x3114 | 276 | 同上 |
| B5 | 0x2F8B8..0x32EA0 | +0x3228 | 13800 | 同上 |
| B6 | 0x32EA0..0x335A8 | +0x6810 | 1800 | tail-call 读（易漏）|

- 旧结论 "26604B / 止 0x32EA0" 是**漏掉 B6 尾调用**的产物，作废；member#16 起点顺延 0x335A8。
- `0x3cf6d4` 被调两次但**不消费 reader**（swe2 证实），不影响块序。
- **16B/0x180 周期 FF 块的归因已被推翻**（MapMember15 终稿 + swe2 一致）：同形状图案在 **clean 档也存在**（slot1 13 块 phase 0xd5；slot0 还有 50×14B@324B 步长），而 **dirty slot1 一块都没有**。编辑器只写 FF 不会擦除 → 这类图案是**游戏自生的易变数据**，不得当污染清理。真实风险只在：dirty 档 18 块全 FF（B2/B3/B5，跳过 B4）是否属于合法内容差异尚未定；但 **任何编辑器写入 0x2C6B4..0x335A8 都是高风险**（B2-B6 为变长内容，同角色两档相差 9570B）。

### 口袋区（P3 已完成）
char_off **10175..10250 = 32 槽 × 19bit（id12+cnt7）LSB-first**，与道具箱 632 起**同一编解码**（32×19/8=76B）。
- 内存形态：第 3 段成员对象，32×4B 记录（u16 id@+0 / u16 cnt@+2）@ obj+0x1A；序列化即 76B 位流。
- 单例 GOT：口袋 `0x183A828→0x18584B8`，道具箱 `0x183A81C→0x1858438`（两变量相差 0x80，不是同一对象字段）。
- 实测 clean 21 槽有货 / dirty 24 槽，id 全合法（10,10 | 88,6 | 16,1 | …）。
- 编辑器接入：复用 `tools/box-slot-tool.mjs` 的 19bit codec，基址 10175、槽数 32；写区不与箱（≤7737）/预设名（≤9989）重叠。

### 128B 记录族（obj+0x2A78 起，15 条）
- 15×128B 定长结构化记录，**不是位域**；三组各 15 个 `movw` 站点（0x51D7D8..、0x51E2F0..、0x520FEC）逐条命中记录起点 → 元素数组。
- 文件落点：i7 0x440F / i8 0x448F / i9 0x450F / i10 0x458F（16B 网格）。
- **编辑器 `chkBoxCatArmsUnlock` 写点 17479..17816 正落在此族内**（跨记录边界按绝对偏移涂 FF）→ **已停用**（commit 见下），标注"语义未定案，禁写"。
- i0..i6 = 正常进度差；i11..i14 空槽。勋章在 obj+0xC28（另一族 132bit），"猫装备"标签与目标区不符。

### 成员#4 头区（obj+0x0..0x424）
- 外层 `0x51dbb4` 自身只读两块 274B（obj+0x72C / obj+0x83E，各 size 0x112）；**不含 obj+0x0..0x2C**。
- 调 `0x51dc40` 前头区只读 **obj+0x20 起 1024B → 文件 0x280B..0x2C0B**（起点由口袋区 0x27BF+76 锚定，终点由 helper 首字段 0x2C0B 反推）。
- **obj+0x0..0x28 ≠ 角色头副本**（四重否证：时序/坐标/形状/字节 diff=0），角色头 char_off 0x0..0x2F 是独立对象：名 UTF-8@0x00、playtime u32@0x20、gold u32@0x24、HR u8@0x28、gender u8@0x2A。
- 权威表 159 行中**只有前 134 行**是真实 reader 调用；第 135..159 行是越界产物。

### 工具坑（已记 DEVLOG）
`tools/arm32.mjs` 的 `disasm(vaddr, **count**)` 第二参数是**指令条数**不是结束地址；误传结束地址会产生百万级输出（本次触发过 187MB 字符串 + VM 重置）。正确：`disasm(start,(end-start)/4)`。

### romfs 任务表（阻塞，暂缓）
`extract/0eb59fa8796db5977d393f0a6f938cff.nca` = **v1.4.0 补丁 NCA**，Section 1 `Partition Type: Patch RomFS`，hactool 报 `cannot save BKTR section without base romfs`。
需 base NCA（XCI secure `98abd400…nca`，约 10.8GB）才能合并。任务位号已定案为 questId，任务名/前置可先用 kiranico/wiki 补齐，romfs 非关键路径。

### 家族测绘（2026-10-22，Fam288 / FamSmall，含 3 条纠错）

**结构总律**：多数族按「3 槽一组 [A, 中, B]，中槽不落盘」；`槽宽×3×组数` 与下一落盘字段逐字节闭合。
- 68B 族 obj+0x27A8..0x29C8：**`u32[id>>5]` 位图**（`0x520C6C and #31` → 位选择 → `ldr [r7,#0x27a8]` → `biceq/orrne`），3 个中槽真实存在且被消费。语义未定。
- 164B 对 obj+0x9D0 / 0xB18：**同一结构双槽**，B ⊆ A（96B 逐位检验成立），dirty 档两槽 164B 完全相同。语义未定。
- 20B 族 obj+0xBDC..0xC64：1×16B 实体的 B 槽 + 2×20B 实体 A/B；其中 **`0xC28`/`0xC50` = 132bit 勋章位域双槽**（编辑器写点 12631..12647、dirty 恰好 132 个 1）。
- 288B 族 obj+0x16C8..0x27A8：**15 槽 × 0x120**，落盘槽 ∈ {0,2,3,5,6,8,9,11,12,14}（`idx%3==1` 的 5 槽永不落盘）；槽内 6×0x30 子记录（gap 槽为 8×0x24）；字节字母表仅 20 值、无 0x0F/0xF0/0xFF → **否证「独立 2bit 计数器」模型**，整槽为不透明 raw blob。
- 尾部 3444B obj+0x3684：单块不透明 blob，**全 .text 仅 writer/reader 两站点，无 gameplay 消费者** ⇒ 写它零收益。

**三条纠错（覆盖早前判读）**
1. **勋章必须双写 A/B**：clean 档 A(12631..) 与 B(12651..) 各 12bit 且逐字节相同；dirty 档 A=132bit/B=33bit ⇒ 编辑器只写 A 是缺陷。**已修**（OtherForm 镜像，见 commit）。
2. **`dirty=FF` ≠ 编辑器所为**：编辑器在成员#4 区段内活写点仅 5 组；`char_off 11547..12630` 与 `12648..140426` 无写点 ⇒ `0x9D0/0xB18/0xBDC/0x3684` 的「编辑器毁档」归因错误，**至少存在第三个写者**（`0xBDC` 前 14B = `clean | 0xFF` 精确命中）。
3. **假阳性排除**：`0xA3DB14`（32 位常量拼装）、`0x162814` 群（160B 且与 8 个已落盘字段区间重叠 ⇒ 另一对象）。

**处置**：288B 族 / 68B 族 / 164B 对 / 尾 3444B 一律**禁写**；唯一可接受操作 = 从干净参照档整槽移植（按权威映射逐槽落盘，不补中槽空洞）。

### 成员#4 结构定案（MapOuterSer §7，含对早前结论的更正）

**文件分段（合计 15075B，精确闭合）**：
`obj+0x20 起 1024B → file 0x280B..0x2C0B`（`0x51dbc0 mov r2,#1024` / `0x51dbc4 add r1,r5,#32` / `0x51dbcc bl 0x3df2a8`），随后 `0x51dbd8 bl 0x51dc40`（helper-first），再读 274B×2（obj+0x72C / obj+0x83E），变长块自 **file 0x5B76** 起 1912B。
- `1024 + 8031 + 3444 + 116 + 274 + 274 + 1912 = 15075` ✓

**重要更正（十进制/十六进制混淆）**：`ldr r0,[r5,#2384]` 里的 **2384 是十进制** ⇒ 真实偏移 **obj+0x950 / obj+0x954**，不是 0x2384/0x2388。机制：`[obj+0x950]`=表指针、`[obj+0x954]`=count、`dst=table[2i]`、`size=2*table[1]`。此前 qp4 扫描 0 命中正是这个原因。

**obj+0x0..0x28 彻底否证**：反序列化链在 `0x446C` 后即 `add sp,#8; pop {r4,r5,r6,r7,r11,pc}`，**从不读 obj+0x0..0x28 / 0x1CC / 0x1AC**。那 25 行表项属于另一函数（`0x5215d4..0x521778`），其文件坐标是错误累加和。

**R1/R2 由控制流闭合**：链返回时 reader 位于 file **0x5952**，非 0x59AC。

### 288B 族 = 委托(rabbit)记录位图（Fam288 §7 + 字符串定名）

**字符串表 @vaddr 0x156922B**：`rabbitNo \0 rabbitRecordNo \0 cTrialArts \0 mGuild[0] \0 mGuild[1] \0 mGuild[2] \0 mOld[0] \0 mOld[1] \0 mOld[2] \0 mAirhik...`

**结构（推翻「记录表」旧判）**：**位图，不是记录**。5 组 × 3 状态：
- A = `obj+0x16C8 + 0x360*g`（落盘，对应 `mGuild[g]`）
- **M = `obj+0x17E8 + 0x360*g`（不落盘，但引擎照样读写）**
- B = `obj+0x1908 + 0x360*g`（落盘，对应 `mOld[g]`）
- 一条 `mla r2, r9, #864, r7` 覆盖 5 组（`864 = 3×288`）⇒ 「5 个 gap 槽」之谜关闭
- `cmp r4,#384` ⇒ lane 位宽 **384bit = 48B**；68B 族 = 1 lane + 20B 尾；288 槽 = 6 lane
- `cmp r9,#5` = 5 组；`cmp r0,#1536` = id 空间 1536
- 同一 mask `biceq r3,r3,r5` 同时清/置 A/M/B 三状态

**编辑器铁律（新增两条）**：
1. 引擎对 A/M/B **三状态同时置清**；编辑器写不了 M（不落盘）⇒ 只写部分状态必造矛盾态（与「只写 cleared 不写 seen」同型 bug）
2. bit 号来自 `0x6aa9b8` 迭代器返回的 u16 序号（类码 50/51/52/53），**不是 questId 直填**

⇒ 整族**禁写**；唯一可接受操作 = 整槽 288B 从干净档移植（A/B 各一条）。

### 成员名字典（重大突破，2026-10-22）

flat.bin 全量扫描 NUL 分隔的驼峰标识符，得到 **106 个块 / 4782 个标识符**（`docs/save-layout/name-dictionary.txt`，118KB）。
MHGU 的序列化系统是 **MT Framework mSAVE 风格、成员带名字** —— 这意味着存档布局有权威字典，不必逐字节猜。

**关键块（原文）**：

`sUserInfo` 任务风格记录 @0x1569180：
```
mUserData.rank_quest[no] · rabbitNo · rabbitRecordNo · cTrialArts
mGuild[0..2] · mOld[0..2] · mAirhike[0..2] · mBushi[0..2] · mKizuna[0..2] · mTatsujin[0..2]
```
⇒ **288B 族 = 6 组任务/风格完成位图**（`mGuild`=A 槽 / `mOld`=B 槽；`mAirhike/mBushi/mKizuna/mTatsujin` = MHGU 四种狩猎风格）

`cAcPlayerEquipXML` 玩家装备 @0x15606b0：
```
mSupperArtsX1[0..4] · mSupperArtsX2[0..4] · mSupperArtsX3[0..4]   ← 狩技 3 组×5（对应 obj+0xD24/0xD3C/0xD54 各 24B）
mEmType · mHeadType[0..N] · mHeadItemNum[0..N]                    ← 装备槽 类型+数量 交错
```

`cQuestDaily` 日常委托 @0x15626c0：
```
mTargetEmType · mZenny · mItemID[0..5]
mQuestType · mRequestVillage · mQuestLv · mMonsterLv · mStartType · mQuestTime · mQuestLife
mAcEquipSetNo · mBGMType · mEntryType_1/2/Combo · mClearType · mGekitaiHp
mIsClearParam_1 · mClearID_1 · mClearNum_1 （_2 同构）· mSubClearType · mClearID_Sub · mClearNum_Sub
mHagiLv · mPickLv · mFishingLv · mVillagePoint · mRemMoney · mSubRemMoney
mClearRemVillagePoint · mFailedRemVillagePoint · mSubRemVillagePoint
mListData[79].num · mListData[79].itemId
```

`cAmuletBase` 护石 @0x155364c：`cAmuletSkillBase · cAmuletSkillBaseXML · cAmuletSlotBaseXML · mRare · mMinValue`

**方法论**：任何匿名族都可按「它在 obj 中的相邻字段」反查同块成员名 —— 比逐字段反汇编快一个数量级。

### 重大修正：obj+0x72C / obj+0x83E 是怪物统计，不是任务位域

MapOuterSer §8 把成员#4 尾段判为「274B×2 任务位域 + 552B 变长块」，**字节实测推翻**：

| 块 | 文件 char_off | 结构 | 实测 |
|---|---|---|---|
| `obj+0x72C` | **0x5EA2..0x5FB4**（274B）| **137 × u16 怪物击杀计数** | clean max=45、62/137 非零；`02 00 00 00 00 00 02 00…` |
| `obj+0x83E` | **0x5FB4..0x60C6**（274B）| **137 × u16 怪物捕获计数** | 同构 |
| `obj+0x950/0x954` 变长块 | **0x60C6..0x62EE**（552B）| 怪物尺寸记录（u16 百分比 0x60=96 / 0x69=105 …）| MonsterForm `num3=24778=0x60CA` 落此 |

**判据**：真位域（如 `obj+0x42C`）呈现 `e0e2 c58 b021 be 200 2841` 的稠密位模式；而 0x5EA2 段是规整小计数器（u16 值 0..45），且 `274 = 137 × 2` 恰好是 u16 数组。

**MonsterForm 写点正确**，无毁档风险：
- 击杀 `24230 (0x5EA6) = obj+0x72C + 4`
- 捕获 `24504 (0x5FB8) = obj+0x83E + 4`
- 尺寸 `24778 (0x60CA)` 落变长块内
- 三条 stride 正确（`+2 / +2 / +4`，`i==91` 时 `+4/+8` 特殊跳）

**真实功能缺口**：容量 137 条，编辑器只暴露 **71** 条（`for i<71`，数组 93 个名字但循环 71）⇒ 第 71..136 条怪物统计**无法编辑**（不是 bug，是未覆盖）。

### 名字池的真实性质（重要方法论修正）

**不是「名字→偏移」注册表**：对 `rabbitNo/cTrialArts/mGuild[0..2]/mOld[0]` 等 7 个字符串地址做全 .text ldr-literal 扫描，**0 命中** ⇒ 代码不直接引用这些字符串，不存在 `(name, ptr)` 反射表。

**实际是「连续序列化描述符流」**：字符串按声明顺序首尾相接，每串「长度+1」正好等于下一串地址。以 `0x1569000..0x1569800` 为例（152 串）：
```
uStageSet → mBillboard → mSort → mCameraCheck → mCameraClipping → mCameraDistance
→ mCameraCheckPosUse → mCameraCheckPos → mCheckCapsuleUse → mCheckCapsulePos
→ mCheckCylinderUse → mCheckCylinderHeight → mAlphaAnimation → mControlFlag
→ mUpdateMatrix → uStageShellOwner → uVillage → sUserInfo
→ mUserData.rank_quest[no] → rabbitNo → rabbitRecordNo → cTrialArts
→ mGuild[0..2] → mOld[0..2] → mAirhike[0..2] → mBushi[0..2] → mKizuna[0..2] → mTatsujin[0..2]
```

**用法（已验证有效）**：
1. **类名判据**：`cXxx` 后紧跟的连续 `m*` 就是它的成员。`cTrialArts` 后接 18 个 `m*`（6 数组 × 3）= **18 成员**
2. **尺寸闭合校验**：`18 × 48B = 864` = 写循环 `mla r9,#864` 精确相等 ⇒ 成员大小 48B 由此反推
3. **不能**靠名字顺序直接推文件偏移（顺序≠偏移），但**能**定成员个数与语义，配合反汇编的 stride/size 即可闭合

### cTrialArts 定案（Fam288 §9 终审）

- **288B 族 = `cTrialArts` 位图**，5 组实例（类码 44..48），每组 864B = 18 成员 × 48B
- 18 成员 = 6 数组（`mGuild/mOld/mAirhike/mBushi/mKizuna/mTatsujin`）× 3 槽位
- 每组三个 288B 分片 = 6 成员/片：
  - 分片① `mGuild[0..2]+mOld[0..2]` → **落盘**（A 槽 0x16C8+g*0x360）
  - 分片② `mAirhike[0..2]+mBushi[0..2]` → **不落盘**（运行期重算）
  - 分片③ `mKizuna[0..2]+mTatsujin[0..2]` → **落盘**（B 槽 0x1908+g*0x360）
- 索引：`bit = rabbitNo*4 + j`（每 rabbit 记录 4 bit）
- **委托完成仍在 `0x42C/0x52C/0x62C`**，与此族无关
- 反证 5 组：`g=5` 时基址 = `0x16C8+5*0x360 = 0x27A8` = 68B 族首条，重叠 ⇒ 只有 5 组

**勘误**：`0x13187A4/0x131867C/0x1318554` 不是三张表，是 `ldr r10,[pc,r0]` 的 pc 补偿加数，三者都算到同一全局槽 **`0x1839388`**。Fam288 §7.5 的「每类一张表」作废。

**编辑器**：整族禁写；位号公式 `obj = 0x16C8 + 0x360*类码索引 + 0x30*(风格*3+槽位)`，`word=(rabbitNo*4+j)>>5`，`mask=1<<((rabbitNo*4+j)&31)`。若必修：只移植分片①③，**永不写分片②**。

### 权威布局表已重生成（MapOuterSer §9 配方，验收通过）

`member4-file-layout.txt` / `member4-diff.txt` 已按修正配方重写：

**布局表**：134 行（135..159 删除，属另一函数 `0x5215d4..0x521778`）
| 行段 | 处理 |
|---|---|
| 1..66 | 原样 |
| 67 | obj `0x0000` → **`0x0E80`**（r6 循环第二读，未解析）|
| 68 | file `0x338F` → **`0x36AF`**（+0x320）|
| 69 | file `0x33A3` → **`0x36C3`**；obj → **`0x1384`** |
| 70..134 | file **+0x550** |
| 135..159 | **删除** |

**验收**：末行 `file+size == 0x5EA2` **精确命中** ✓；静态 size 合计 11591（0x2D47），含循环迭代后 12951（0x3297）。

**差分表**：42 FF / 56 PROGRESS / 36 SAME（134 行）。`FF` = 仅 dirty 为 0xFF 且 clean 非 0xFF（涂块）；`PROGRESS` = 两档玩家进度差异。

### 撤销「obj+0x72C/+0x83E = 任务位域」

`obj+0x72C` / `obj+0x83E` **是怪物击杀/捕获计数表，不是任务位域**。任务三态位域**只有** `obj+0x42C` / `0x52C` / `0x62C` 三块 256B。
- `274 = 4 + 135×2`（4B 头 + 135 槽 u16），与 MonsterForm 135 行表、读点=块首+4 三方对齐
- `552 = 4 + 137×2×2`（4B 头 + min/max 双值对），与 `mini>0 && maxi>0` 门控相合
- `qp4-scan.mjs` 里 `blk274_1/blk274_2` 的命名**已过时**，语义应为怪物统计

### MonsterForm 第二段起点错位（已修）

`showMonstersList` 第二循环（`i=71..92`）原起点 **24454/24728/25226 错位**：跳过 `0x5F34..0x5F86` 的 41 个非零计数器（值 6,10,5,11,5,21,19,17,3,3,14,1,13,30,5,26,16,38,10,45…），读到全 0 区 ⇒ i=71..92 **永远显示 0 且写回错位置**。
- 正确值：**24372 (0x5F34) / 24646 (0x6046) / 25062 (0x61E6)**
- 已修，编译 0 警告 0 错误

### 名字字典下标容量（实测，2026-10-22）

对 flat.bin 全量扫数组下标（非去重限 3 次的旧扫）：

| 成员名 | 不同下标数 | 最大下标 | 归属类 | 语义 |
|---|---|---|---|---|
| `mItemType[N]` / `mItemNum[N]` | **160** | 159 | **`cAcNyanterEquip`** | **随从猫装备栏 160 槽**（类型+数量）|
| `mGuild[N]` / `mOld[N]` | 3 | 2 | `cTrialArts` | 288B 族 3 槽位 |
| `mSupperArtsX1[N]` | 5 | 4 | `cAcPlayerEquip` | 狩技组 5 个（对应 obj+0xD24 24B = 5×4B+4）|
| `mPermitLv[N]` | 16 | 15 | — | 特别许可等级 16 项 |
| `mListData[N]` | 80 | 79 | `cQuestDaily` | 日常委托列表 80 项 |

**结论**：`mItemType/mItemNum` **不是**道具箱槽（2300/2992 不符），是**猫装备栏 160 槽**——此前「猫装备箱 0x17C2E(1000×36)」的推断需重核（名字表说是 160，不是 1000）。
`mListData[79]` = 委托列表容量 **80**，可作任务表容量的参照。

### 猫装备箱：名字表 160 vs 存档 1000 槽的辨析

- **名字表**：`cAcNyanterEquip` 的 `mItemType[N]/mItemNum[N]` 下标 **0..159（160 项）**
- **存档实测**：`char_off 0x17C2E`（97326）起 **36B stride** 结构成立（首三条 `16 00 02 00` / `17 00 01 00` / `18 00 01 00` = id+count），**1000 槽容量**（36000B）
- **本档几乎全空**：36000 字节中仅 **40 个非零**（猎人A 无猫装备），故无法从数据判断真实槽数上限
- **辨析**：160 是**名字表声明**的成员数组长度，1000 是**存档区容量**。两者可能是「160 个可见槽 + 其余为扩展/未用」，也可能名字表只列了 160 个实例名而容量另算。**需实机装满猫装备后 dump 才能定**——列入待实机项。
- 编辑器当前对猫装备区（`chkBoxCatArmsUnlock`）已**停用**，不受此未定项影响。

### 装备箱之后的区块精确测绘（0x17C2E）

**位置**：`25326 (0x62EE) + 2000×36B = 97326 (0x17C2E)` —— **精确相接**，即 2000 槽装备箱之后的下一结构。

**实测**：
- 结构 stride **36B**，但**只有前 20 槽有数据**（`0x17C2E..0x17EDC` = 687B），之后到猫记录基址 `146358` 前有 48KB 全零
- id 值仅 **22 / 23 / 24**（0x16/0x17/0x18），val ∈ {1,2,139,146,179,185}
- **不是自增序列**（`22,23,24,23,24,22,22,22...`）⇒ 不是图鉴注册表
- **不是物品箱**（id 范围太小、20 槽 vs 160/1000 都不符）

**与名字表对拍**：`mEqDeco1[0..29] / mEqDeco2[0..29] / mEqDeco3[0..29]` = **30 项 × 3 孔**（装备装饰珠三孔），归 `cAcPlayerEquip` 域。
- 20 槽（有数据）vs 30 项（声明容量）不一致，可能：① 该档只填了 20 条；② 36B 里只前 4B 有效，其余是孔位
- 每槽 `id(u16) + val(u16) + 32B 零` —— 与「珠子 id + 数量 + 3 孔」形态吻合度中等

**结论**：`0x17C2E` = **装备装饰珠记录区（候选）**，容量待定（20 已用 / 30 声明）。**不做编辑器写入**（语义未定案）。

### 后续区段（0x17C2E 之后到猫记录 146358）
| 区间 | 结构 |
|---|---|
| `0x208CE..0x21E03` | **40 × 340B** 块（stride 340，每块前 67B 有数据）= 套装名/预设区 |
| `0x21E03..0x22612` | 2064B 连续块 |
| `0x22697..0x23BB6` | 稀疏小簇（4B/2B/140B/253B/182B）= 零散标志 |
| `146358` | **猫记录基址**（84 × 324B，CatsForm `tmpCatDataBy` 从此加载）|
