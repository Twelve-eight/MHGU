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
- 报告落盘 `.tmp/reports-mhgu/`，**禁止写仓库**。
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

## 知识库（反编译成果，.tmp/reports-mhgu/）

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

- `tools/box-slot-tool.mjs`：`read|write|used <save.hnt>`，19bit LSB 编解码，slot=UI 索引。
- `tools/build-v7-final.mjs` + `v7-shift-65.json`：V7 生成器（字节级验证源）。
- `main.140.flat.bin`：25.4MB flat（含 NSO0 头）。

## 实机验证状态

- yuzu Vulkan `VK_ERROR_UNKNOWN`（Win32 surface-caps 损坏，与补丁无关）→ **OpenGL 绕过成功**
  （`backend\default=false`+`backend=0`）。游戏进存档加载、patch 123 行全应用无 ARM 异常。
- **剩余**：游戏内开箱翻页看 8 个 marker（2400-2403/2900-2903）+ 页数=30 → 视觉确认交用户（§2）。
- 猎人A 存档离线复核：605 项、范围 0..2903、marker 全在正确槽位、位流/预设边界正确。
