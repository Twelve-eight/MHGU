# MHGU 道具箱扩容 DEVLOG

## 2026-10-22 — 调研闭环（5 worker + 主会话统筹）

### 派发
dsv4.1f ×5（effort: hi），报告落 `.tmp/reports-mhgu/`：
- CapLocate → `cap-locate.md`（2300 容量定位，8 处 MOVW 清单，反汇编器勘误）
- SaveStruct → `save-struct.md`（存档布局 + 0 差编解码器 + 无校验 + 搬迁方案）
- ItemCount → `item-count.md`（道具表 2991 项、真实 2940 种、缺口 640）
- CapRefine → `cap-refine.md`（0x900 否证 + 模块地图 + 反汇编器 bug 复核）
- PatchDesign → `patch-design.md` + `box-expand-draft.pchtxt`（补丁设计，方案后被否决）

### 已确认事实（三源互证）
- 箱容量 = **2300 (0x8FC)**，存档 19bit/格 @+0x278，运行时 4B/格 @`*0x183a81c+0x1a`
- 道具 ID 空间 0..2990（2991 项），真实 2940 种 → 缺口 ≥640，**原地扩容余量 0**
- 存档无校验和；`.hnt` = 槽数据裸拷贝；`system` 36B 头 + 3×0x11F8C4 槽块
- 唯一大块空闲 `+0x7000..+0x17C2E` ≈ 68,654 B 全 0（装备箱区候选但未定位）
- 反汇编器 `disasm.mjs` 有 ADD/SUB 互换 + ldr/str 误印 bug → 全部 0x900 候选否证为字节跨度

### 结论与下一步
- 目标未满足（2300 < 2940）；**唯一可行方案 = 道具箱搬迁至 +0x7000 空闲区**，同步改 6 处 MOVW 计数/尾指针 + 位流基址 + 前置确认该区非装备箱
- 待办：① 定位位流基址调用点（0x19a4ec/0x19a55c 调用方把 0x278 传入处）② 确认 0x7000 区段非装备箱（需实机/对比装备数据）③ 实机冒烟 V0（N=2308）→ V1（N=2992）
- PatchDesign 原「扩容+缩短组块」方案已被否决（0x17CF 后是套装定长记录非组名块）

### 资产
- 契约：`MHGU/DEVELOP.md`
- 反汇编器：`G:/omp works/.tmp/mhgu/tools/disasm.mjs`（注意已知 bug）、`tools/disasm2.mjs`（worker 修正版）
- 存档编解码：`save-struct.md` §2.2（0 差 round-trip）
- 报告：`.tmp/reports-mhgu/{cap-locate,save-struct,item-count,cap-refine,patch-design}.md`
- 反编译编辑器：`.tmp/mhgu/editor-decomp/MHGU存档修改.decompiled.cs`（存档布局权威参考）

## 2026-10-22 晚 — 实机推进 V0 崩溃 → V1 设计

### V0（N=2308，+19B 借组名块）结果
- patch 加载成功（yuzu log 全部 8 处 `Patching value` 确认）
- **读档即崩溃**。原因候选：① N=2308×19/8=5481.5B 非整字节，读写端 byte-ceil 不一致 ② 组名块缩 19B 截断最后套装记录尾部 ③ 位流长度与组块起始错位

### 关键发现：0xFF0 "组名块" = 24×170B **道具预设**（item-group preset）
- 编辑器:4814 `itemsGroupName = new string[24]; num=6095; num+=170`（20B名+150B预设道具）
- main `0x19a544 movw r0,#0x62f4`（结构偏移）`mov r2,#0xff0`（传输长 4080=24×170）
- 存档 `0x17CF` 起即 24 条预设记录；实测 `0x17D9` 有 UTF-8 预设名
- **0x7000 区段证伪**：+0x7000 落在猎人装备箱（+0x62EE..+0x17C2E，2000×36B）内部

### 布局全景（双源验证）
| 存档偏移 | 内容 | 大小 |
|---|---|---|
| +0x000 | 角色头块 | 0x278 |
| +0x278 | **道具箱位流** 2300×19bit | 5463 B |
| +0x17CF | **道具预设** 24×170B | 4080 B |
| +0x27BF | 后续区段（u16表/套装记录/公会等） | … |
| +0x62EE | 猎人装备箱 2000×36B | 72000 B |
| +0x17C2E | 随行猫装备箱 1000×36B | 36000 B |
| +0x208CE | 装备组名 40×136B | 5440 B |

### V1 方案（预设借用，免搬迁）
位流不可搬迁（位置依赖流式偏移），原地扩容只能向**紧随的预设块**借字节：
- **N=2992**（=0xBB0，整数位流 7106B，覆盖全部 2991 id 空间）
- 预设 24→**14**（块 4080→2380B，借 1700B；余 57B 死区）
- 13 处 patch：6×容量 MOVW + 2×块长 + 5×预设下标界（0x18/0x17→0x0E/0x0D，仅取与 0x62F4/0xAA 共现的 5 处）
- 代价：预设 15-24 丢失；旧档无需迁移（位流尾部按新长度读）
- 已部署 `load/0100770008DD8000/mhgu-box-expand/exefs/1.4.0.pchtxt`，待读档验证

### 备选风险
若 V1 仍崩：位流 bit-length 变化导致 reader 字节位置与组块起始不一致 → 退化为「箱数不变、仅验证机制」或改走完整重排（大工程）。

### 2026-10-22 V2：偏移修正 + 堆数组扩容
- **V1 bug**：19 处偏移全写为 `vaddr+0x100`（行首应是裸 vaddr，yuzu offset_shift 再 +0x100），全部打偏到错误的 .text 字节上。
- **V1 漏改**：运行时箱数组 `malloc(0x23F0=9200B)` @0x19a8e4 + 5 处 copy/zero 尺寸同值未扩 → N=2992 时 11968B 数据写进 9200B 堆缓冲。
- **内存布局闭环**（本轮补齐）：箱运行时 = 堆数组 `obj+0x62F0`（ptr→9200B，非内联）；预设数组在 `obj+0x6320`，stride 0xAA=170B、count 24（patch 后 14）；访问器 `r0=*(global+8)` 后 `array[i]+0x1a`。`+0x240A..+0x2EDA` 死区验证：全 .text 0 个 ldr/str 立即数落入该区间。
- **部署物**：V2 = 13 处（V1 偏移修正）+ 6 处 `movw #0x23F0→#0x2EC0`(11968B=2992×4)。文件已核对 19 行全为裸 vaddr。
- **页数语义修正**：箱 2274 项 → `2274/100=22.74→23` 页，无论容量 2300 还是 2992 都显示 23；真验证动作 = 存入第 2301+ 个道具看能否入位/翻页可见。
- 待实机验证：重启 yuzu → 读档 → 道具箱存第 2301+ 项。

### V3：补齐第二反向扫描 + 测试桩
- 审计发现 `0x198f40` 第二个反向空槽搜索（18 个存取调用方）含三处未扩界：`0x2406`(尾槽哨兵→0x2ED6)、`0x8FB`/`0x8FD`(车道步进界→0xBAF/0xBB1)。V3 = 22 处。
- 存档语义确认：位流 file slot k ↔ UI slot (N-1-k)，倒序。猎人A 597 项在 file 0-596 → 新版 UI 2395-2991。
- 测试桩已写入 `hunterA_HR5.hnt`：file691(UI2300)={id:2023,cnt:42}、file699(UI2292)={id:2024,cnt:43}。读档后开 猎人A 箱：若 UI2292 显示 id2024×43 且 UI2300 显示 id2023×42 → 容量+位流映射双双成立。

### 已知现象预告：新槽区「幽灵道具」属预期
- 转换是原地扩容：旧档 `0x17CF..0x27BF` 预设块未清空，2992 格式下该区段被读为位流尾部 → 旧预设 UTF-8 名/道具数据解码成 ~692 个「假道具」（id 由字节随机映射）。
- **所有已转换档**（hunterB/hunterA/system）UI 高段都会出现这些残影，不是 patch bug。清理路径：游戏内卖掉/丢弃，或后续写「槽清零」工具批量置 0。
- 判读分界：能正常存取 UI2300+ 且读档不崩 = 容量扩容成立；幽灵道具只是数据残留的外观问题。

### 存档完整性
- 编辑器源码 0 处 checksum/hash/crc/digest/signature 命中；`.hnt` 前 16B = 角色名裸 ASCII，**存档无校验和**，任意字节改动均合法。

### 测试桩修订（V3.1）
| 文件槽 | UI 位 | 内容 | 判读性质 |
|---|---|---|---|
| 699 | 2292 | id2024×43 | 旧界内 sanity |
| 691 | 2300 | id2023×42 | 界上第 2301 格 |
| 690 | 2301 | id2025×44 | **严格 >2300 判别位** |
| 600 | 2391 | id2026×45 | 高位槽，在残影区之下 |

### 偏移语义闭环（日志反推）
- yuzu 日志里 `Patching value at offset` 打的是**最终落点**（line_addr + offset_shift，NSO 文件空间）。
- 反推：V1 文件 = flat_vaddr+0x100 行 + shift 0x100 → 落点 flat+0x200，与日志 `0x0019A748` 完全吻合（目标 flat 0x19a548 + 0x200）。
- => 正确写法 = 行地址=flat file 偏移 + **不加 shift**（或行=runtime vaddr + shift 0x100，等价）。
- **V5 现行文件正确**：22 行=flat 偏移，无 shift。V3 的 `offset_shift 0x100` 会让每行再漂 +0x100，是第三个错位 bug（已被 V5 修正）。
- 之前 yuzu 启动跑的是 V1 文件（+0x200 错位），其「23 页」读档成功根本不代表任何东西——patch 全打到错误字节上。

### 2026-10-22 关键修正：位流方向 + 23页语义
- **位流方向反转**：早前判断「file slot k → UI slot N-1-k」错误。实测反序列化循环 `add r7,r7,#4` 正向写，`file slot k = UI slot k`。此前路标全错置（file 691 → UI 691，在旧界内不可见）。
- **转换器已清零流尾**：file 2300+ 全部 0（旧预设区已被清空，无幽灵道具）。猎人B used=2274 全在 0..2299。
- **23页语义**：UI 页数 = ceil(used/100)，非容量/100。2274 items → 23页，无论容量 2300 或 2992。**「23页」根本无法判别容量**；真判别 = 看 UI 2300+ 槽是否显示道具。
- **修正后路标**（猎人A，已写盘）：file/UI 2400-2403={2016-2019, cnt 50-53}、2900-2903={2020-2023, cnt 60-63}。
- **编辑器 bug 修复**：XX(1173440)→MHGU(1177760) 槽长不一致 → 槽切换/导入/清槽全截断尾部 4320B。已重编译 net472。

### 猎人A 测试桩修正
- 位流 19bit 字段跨 3-4 字节（位偏移 0-7 决定），初版写入工具只处理 3B → slot 2901/2402 高位丢失已修复（32bit 读写，tools/box-slot-tool.mjs）。
- 旧错置路标（file 600/690/691/699，UI 0-2299 界内）已清零；最终路标：**UI 2400-2403 = id 2016-2019 cnt 50-53**、**UI 2900-2903 = id 2020-2023 cnt 60-63**。
- 猎人A 现 used=605，range 0..2903；UI 2300+ 共 8 个 marker，判别明确。
- 实测动作（用户醒后）：yuzu 读 猎人A → 开箱 → 翻到 24+ 页看 marker；若 UI 2300+ 槽显示这 8 个道具 → 容量扩容铁证。

### 运行时内存布局最终裁定（解开 23 页疑云）
- **箱运行时 = 内联数组 `obj+0x1a`**（反序列化写入点），不是 obj+0x62F0 堆指针。
- **物理空间充足**：对象内 `+0x1a..+0x62F0` 共 25302B ≈ **6325 槽**的空区（预设数组在 `+0x6320`，堆指针 `+0x62F0`）。N=2992 完全放得下。
- `obj+0x62f0` 堆数组 = 派生副本（malloc 0x23F0 + memcpy），非 UI 主数据源。
- **「23页」真实语义**：UI 页数 = ceil(已用槽/100)，猎人B 2274 项 → 23 页与容量无关。
- 结论：V6 语义大概率已成立；只差用户读 猎人A 看 UI 2400/2900 的 8 个 marker 是否显示。

### 用户验证操作（醒后执行）
1. 启动 `LOCAL\yuzu1734\yuzu.exe`，加载 MHGU，读 **猎人A** 档
2. 打开道具箱 → 直接翻到**最后一页**
3. 期望看到 8 个 marker 道具分散在尾部：
   - 位置 ~2400-2403：id 2016-2019（素材类），数量 50-53
   - 位置 ~2900-2903：id 2020-2023，数量 60-63
4. **判读**：
   - 尾部显示这些道具 → **容量 >2300 成立**，V6 成功
   - 尾部只有空格/旧道具 → UI 迭代界未扩，需要再定位
   - 读档/开箱崩 → 回滚（禁 pchtxt + 恢复 `save-snapshots/20261022-v6-ready/`）
5. 注意：猎人A 是测试号别存档；猎人B 主档勿动

### 2026-10-22 23页根因定案 + 真扩容方案
- **23页根因**：UI 容量来自 `0x198F04` 混淆函数（`1000+300*popcount(flags)+200*bits` = 2300），19 个 UI 调用点传给 `0x553A74` 网格布局 → `ceil(count/100)=23` 页。**V6 没改它**，所以页数不变。
- **内联布局真相**：`obj+0x1A` A 槽数组物理只到 `+0x240A`，其后依次是 B 聚合表（2300×4B）、C（2300×2B）、D（2300×1B）。**没有 6325 槽空区**——V6 的 N=2992 让 A[2300..2991] 压在 B 上（0xAD0=2768B），排序时 B 重建会覆盖高段。
- **V7 方案**（构建中）：V6 + 容量 getter 直返 0xBB0 + 30 处内联容量 + **B/C/D/堆指针/预设整体后移 0xAD0**（对象 0x72E4→0x7DB4，约 60 处）+ 5 处预设 guard。
- 装备箱/猫箱：无交叉（EquipBoxAudit：0 命中 0x8FC 族，存档偏移不变）。
- 道具表：在 RomFS `itemData.itm`（base NCA `98abd400`），2991×44B；有效英文 id 2940。

## 2026-10-22 V7 完成 + yuzu Vulkan 启动受阻（待用户重启）

### V7 patch 定稿（123 行，已部署）
`G:/omp works/MHGU/patch/1.4.0.pchtxt` → yuzu load 目录。
组成 = V6(22) + 容量getter(2) + 30内联容量 + 65布局后移 + 4预设guard。
- **布局后移 +0xAD0**：B 0x240A/0x240C→0x2EDA/0x2EDC；C 0x47FA→0x52CA；D 0x59F2→0x64C2；
  heap 0x62F0→0x6DC0；adj 0x62D6→0x6DA6；preset 0x62F4→0x6DC4；
  rec 0x631D/1E/20/22→0x6DED/EE/F0/F2；obj 0x72E4→0x7DB4。共 65 处 movw 站点字节级验证。
- **3 处易漏站点**（V7Builder 子代理捕获）：0x5B817C(B页基址)/0x5B8184(D页基址) UI 直读、
  0x19AD08(rec+0x2E)——vaddr 0x5B807C/0x5B8084/0x19AC08 +0x100。
- **P0 修正**：初版 30 内联容量误用 vaddr（未+0x100），28 条打到无关指令。已修正为 flat 偏移，
  全部原字 `e2800ffa` 验证通过。
- **容量 getter** flat 0x199004/0x199008：`movw r0,#0xBB0; bx lr`（原 push {r4,lr} 函数入口）。
- 字节级验证：123 行原字全部命中可替换指令，无重复地址。

### 实机验证受阻：yuzu Vulkan 初始化失败
`VK_ERROR_UNKNOWN` 连续 5+ 次启动均失败（**与补丁无关**——vulkaninfo 本身在
`vkGetPhysicalDeviceSurfaceCapabilitiesKHR` 也报 `ERROR_UNKNOWN`）。
诊断：
- 设备枚举/vkCreateInstance 正常（AMD RX 6600, driver 2.0.353, api 1.4.315）
- **Win32 surface 呈现能力损坏**——典型 WDDM/显示栈状态损坏
- 已排除：RTSS(yuzu.exe.cfg HookVulkan=0)、着色器缓存、GPU偏好、OpenGL切换(不生效)
- 嫌疑：Parsec/GameViewer 虚拟显示适配器挂在图形栈上，抢/坏了 surface 能力
- **不能擅动**——禁虚拟显示器会断用户远程会话；重启图形驱动/系统也会打断用户

### 恢复步骤（用户醒后）
1. 重启电脑（最稳）或 `Win+Ctrl+Shift+B` 重启图形驱动
2. 若仍失败：检查 Parsec/GameViewer 是否该退；或设备管理器禁用虚拟显示适配器
3. yuzu 能起后：读 猎人A → 开箱 → 翻到尾部看 UI 2400-2403/2900-2903 的 8 个 marker
   （id2016-2019/cnt50-53、id2020-2023/cnt60-63）+ 页数应=30
4. 显示 = 真扩容成立；崩溃/丢数据 → 禁 pchtxt + 恢复 `save-snapshots/20261022-v6-ready/`

### 待办
- [ ] yuzu 可启动后 V7 实机验证（markers + 页数 + 排序 round-trip）
- [ ] 整合 5 份 .tmp/reports-mhgu/ 子代理报告进 DEVELOP.md 主文档
- [ ] git commit V7 + 工具 + 文档
- [ ] known-gap：0x19B1F4 无界预设互拷（idx 无上界，可写越 obj+0x7DB4）

### 子代理台账（§4b/§8e）
- **V7Builder**: model=dsv4.1f (wb2api/global:deepseek-v4.1-flash), effort=hi, route=wb2api.
  监督=主会话字节级复核。产出: 91行 V7 + 65处布局站点清单 + 3处遗漏站点 + P0缺陷捕获。
  主会话复核: 30/30 修正 flat 地址原字 e2800ffa 全过; 65 处 movw 原字 imm 全匹配;
  vaddr/flat 偏移语义二次确认。verdict=**PASS-after-fix**（捕获了我 30 内联地址未 +0x100
  的 P0 + 3 处 UI/预设字段遗漏站点，价值高）。能力评估: 静态二进制审计可靠，适合做
  ARM 常量站点枚举与交叉验证; 弱点=地址标注有时混用 vaddr/flat 需主会话归一。

### yuzu 启动恢复：OpenGL 绕过 Vulkan
- 根因: Win32 surface `vkGetPhysicalDeviceSurfaceCapabilitiesKHR` 报 ERROR_UNKNOWN
  (vulkaninfo 同症)，WDDM/呈现栈损坏，疑 Parsec/GameViewer 虚拟显示器所致。驱动
  2026-07-23 非热替换。
- **绕过**: `backend\default=false` + `backend=0` (OpenGL)。注意 yuzu `\default=true`
  会强制用默认后端(Vulkan)忽略用户值——**两个键都要改**。OpenGL/wgl 不走 WSI
  surface-caps 路径 → 启动成功，游戏进存档加载，patch 全 123 行在 GPU 初始化前应用、
  无 ARM 异常。**patch 侧已证无害**。
- **剩余验证**（视觉确认，§2 边界）: 需游戏内开道具箱翻到尾部看 UI 2400-2403/
  2900-2903 marker + 页数应=30。yuzu1734 无 UI 自动化/内存读接口 → 交用户实机冒烟。

### Vulkan 根因定案：隐式 layer 损坏（非 WDDM）
- 判别: `VK_LOADER_LAYERS_DISABLE=* vulkaninfo --summary` → 全 layer 禁用后
  surface-caps/设备枚举全干净、无 ERROR。锁定 `VK_LAYER_RTSS` + `VK_LAYER_OBS_HOOK`
  （还有 AMD_switchable/EOS/VALVE 等隐式层被一并禁用）。
- **yuzu `EnableHooking=0` 挡不住隐式 layer 加载**——它只禁 layer 内部 hook 活动，
  layer 本体仍注入并在坏显示状态下返回 ERROR_UNKNOWN。
- 验证: `VK_LOADER_LAYERS_DISABLE=*` 启动 yuzu → Vulkan 完整初始化
  (CreateGraphicsPipeline/SerializeVulkanPipelineCache 正常)，游戏运行。
- **恢复步骤修正**: yuzu 现在已在 Vulkan 下运行 V7，用户可**立即**开箱冒烟，
  无需重启。若想恢复默认 Vulkan（不带 env 启动），重启或修复 RTSS/OBS layer 注册表。
- 备选判别残留: 若重启后 Vulkan 仍挂 = layer 注册表残留（重装 RTSS/OBS）；
  若好 = 运行时 wedge 已清。

## 2026-10-22 任务解锁卡对话 — 根因追查（进行中）

### 已确认
- **30 页扩容验证通过**（用户实机确认）✅
- **卡对话根因初步定案**：编辑器「任务Clear/解锁」把任务**记录区**当位域写 0xFF。
  - 猎人A 是编辑器污染档：`0x2C77`=0xFE(|=254)、`0x2D06..0x2D09`=FF FF FF 7F(|=127)
    精确命中编辑器 OR 签名 → 编辑器把结构化任务记录涂成非法态。
  - 猎人B(HR198)=唯一合法档。任务记录区显示为不规则字节（非位域）。
- **成员#4 反序列化字段表**（0x51dbb4→0x3df2a8，亲验）：
  obj+0x72C(274B)=任务位域块#1、+0x83E(274B)=块#2(seen/unlocked 平行)、+0x20(1024B)=统计、
  +0x42C/0x52C/0x62C(256B×3)、+0xD24/D3C/D54(24B×3=quest 进度记录组) 等。
  任务位域文件区 char_off 0x2C0B..0x2D1D → obj+0x72C。
- **块内分界**（HR差分）：0x2C0B..0x2C4B=位域、0x2C5B..0x2CCB=记录区(禁写)、0x2D9B+=位域。

### 进行中（2 子代理 dsv4.1f+hi，写集互斥）
- QuestPrecheck2：读 obj+0x72C/+0x83E 的任务解锁/对话判定函数 + 前置逻辑 + 卡对话点
- QuestTable：romfs/kiranico 任务表 + per-quest 前置字段（数据vs代码）

### 早前 3 个 worker (QuestFlagMap/QuestPrecheck/QuestEditorFix) 
均死于 wb2api `IncompleteRead(0 bytes)` 上游流中断（~4分45秒），非任务问题。上游已重启，重派为 QuestPrecheck2/QuestTable。

### 修复方向（待字段表收敛）
编辑器只能写合法任务位域段（FLAG-GROW 区），避开记录区；
若需「解锁需前置」再叠加任务依赖链（QuestTable 决定数据vs代码、要不要 Lean 闭包）。

## 2026-10-22 长期目标确立：全面逆向 → 存档每字节可解释/可改

### 目标
1. 逆向解析游戏到「存档修改器可详细解释、修改存档内一切字节」
2. 全面调研现有修改器功能（前人阶段成果，其写入偏移=存档布局地图）
3. 任务解锁修复并入长期目标：完整形态 = 真任务位域边界 + 前置依赖闭包
   （要不要 Lean 式逻辑判定由 QuestTable 的数据vs代码结论决定）

### 当前编排（6 子代理 dsv4.1f+hi，写集互斥，各配独立报告）
- 编辑器普查×4：MapItems / MapEquips / MapMonsterCats / MapOtherMain
  → 每控件→char_off→语义 全表（.tmp/reports-mhgu/editor-map/）
- 任务逆向×2：QuestPrecheck2(前置判定) / QuestTable(romfs quest 表)
  → .tmp/reports-mhgu/quest/

### 主会话已补齐
- 成员#4 完整字段表（0x51dbb4）：0x51dc40 实为顺序读块非查表循环；
  obj+0x72C/+0x83E 双 274B = 任务位域(cleared vs seen)；+0xD24/D3C/D54 = quest 进度记录组。

### 任务解锁卡对话 — 终局根因（干净档差分定案）
- 用户提供 `LOCAL/未解鎖任務存檔`（槽1 猎人A **干净档**，编辑器解锁前备份）
- dirty vs clean 差分 → 编辑器在 **≥7 个记录/位域区涂 0xFF**：
  0x2C78..0x2CA0(VgLow/High)、0x2CED..0x2D08(SpecialP)、勋章段 0x2FE1/0x3085/0x3205、
  猫段 0x32EE/0x3310 —— 全部 `dirty=0xFF, clean≠0xFF` 实锤。
- **三态位域家族** obj+0x42C/+0x52C/+0x62C（各256B）：
  cleared(0x42C)/seen-unlocked(0x52C)/成就稀疏(0x62C)。
  编辑器只乱涂 0x42C 区、缺 0x52C 配对 → cleared≠seen 矛盾 → 对话校验卡死。
- **修复方向**：解锁=按任务 id 同时写 0x42C+0x52C 对应位（cleared+seen 双写）；
  完整版需任务依赖闭包（前置任务/HR 门槛 → QuestTable 决定数据vs代码）。

### 路由状态
wb2api 499 秒级拒绝（两批13 worker 全灭）。§11 全部收回主会话做。
CONTEXT.md 已含成员#4 完整字段表 + 污染地图 + 位域分界（11 条修正链）。

## 2026-10-22 工具坑：arm32.mjs `disasm(vaddr, count)` 第二参数是指令**条数**不是结束地址
误传结束地址（如 `disasm(0x19e0ac, 0x19e100)` 当 0x19e100 是 end）会生成 16M 条指令 → 187MB 字符串 → VM 超时重置 + 两次 100MB 级输出灌满上下文。
正确写法：`disasm(start, (end-start)/4)`。写文件而不是 console.log，只打印长度。

## 2026-10-22 一致性自检：OtherForm「任务Clear」写区与 questId 位号完全对齐
- cleared 段起点 char_off 11383 = 0x2C77（= obj+0x42C）✓
- 写区 11383..11546 = 164B = bit 0..1311
- 斗技分支写 11544..11546 → bit (11544-11383)*8 = **1288** 起，与斗技 questId 1288..1304 吻合 ⇒ 再次印证「位号 = questId」
- 结论：编辑器从不下写 questId > 1311 的位；dirty 档高位 785..1173 的涂块确实落在此范围内（自洽）
- 回写窗口：MainForm 只回写每槽前 821248B（0xC8800），而编辑器现所有写点最大 820532（TrainingForm）＜821248 ⇒ 当前无字段被截断；但 821248..1177759 区间**永不落盘**，未来若暴露该区字段必须先扩窗口

## 2026-10-22 口袋面板落地 + 编解码冒烟（真实执行，非声明）
- `ItemsForm` 位流编解码抽为 `UnpackSlots(byte[],int,int)` / `PackSlots(byte[],int,(int,int)[])`；箱(base 632, slotCount) 与口袋(base 10175, 32) 共用。
- 新增「口袋（32 槽）」Tab 面板，独立 ListView + 编辑条；`pouchDirty` 门控写回；「还原」重读丢弃。
- **冒烟测试（PowerShell 反射调用私有静态方法，作用于真实存档字节）**：
  - `UnpackSlots(buf,10175,32)[0..11]` = 10,10 | 88,6 | 16,1 | 18,5 | 21,5 | 24,5 | 23,4 | 6,1 | 56,20 | 273,1 | 275,1 | 40,1 → 与主会话独立 JS 解码逐项一致
  - 口袋 76B `pack(unpack(x))` 差异 **0 字节**
  - 道具箱 5463B（2300 槽）`pack(unpack(x))` 差异 **0 字节**，cnt>0 槽 2292 → 重构未改变箱语义
- 脚本：`.tmp/mhgu/tools/pouch-smoke.ps1`（可重复运行）

## 2026-10-22 编解码验证（codec-verify.mjs 实跑）+ 勋章镜像副作用登记
**编解码验证结果**（`.tmp/mhgu/tools/codec-verify.mjs`，C# 逻辑镜像 vs box-slot-tool.mjs）：
- 口袋 32 槽解码 mismatch = 0；前 12 槽 10,10 | 88,6 | 16,1 | 18,5 | 21,5 | 24,5 | 23,4 | 6,1 | 56,20 | 273,1 | 275,1 | 40,1
- 箱 legacy 2300 解码 mismatch = 0
- 新 pack == 旧 pack：`[632,6095)` 差异 0；新 pack == 原始存档：差异 0
- 尾部残位：n=2300 → span 5463B 剩 4bit（末字节 6094 低 4bit 有效，高 4bit 保持 0，与旧版一致）；n=2992 → span 7106B 剩 0bit；n=32 → 76B 剩 0bit
- 边界：V7 箱末字节 7737 < 预设头 7738（gap 0）；口袋末字节 10250 < MainForm 写点 10251

**勋章镜像副作用（登记，非 bug）**：`Array.Copy(A→B, 17B)` 在「任一勋章勾选」时执行。
- 对干净档无损（A==B，各 12bit 逐字节相同）
- 对**已毁脏档**会把 B 的 33bit 抹成 A 的 132bit ⇒ 等于自动收敛旧存档的 A/B 分歧
- 这是修复行为，但意味着「打开编辑器→勾任一勋章→保存」会改写 B 槽。若需「只读不写」，后续可加确认对话框。

**仓库卫生**：新增 `.gitignore` 排除 `editor-src/bin|obj` 与 `save-snapshots/`；存档快照按 AGENTS.md §7 用 robocopy 镜像到 `G:/backups/MHGU/save-snapshots`（9 文件，已镜像）。

## 2026-10-22 代理路线与纪律登记（避免两套上下文混淆）
- **模型路由**：用户要求改用 **wb2api/global**（dsv-dev 固定该路由，effort=hi）；swe2 停用，新派发一律 dsv-dev。
- **复活 vs 新建**：本轮先误用 `task(...)` 新建了 4 个同名代理（Rec128Split / Fam288Concept / Fam164Concept / Reader134），已全部 kill；随后按用户要求用 `write agent://<id>` **唤醒原 session**（MapRecords128 / Fam288 / FamSmall / MapOuterSer），其累积上下文与半份分析保留。
- **旧 session 状态**：4 个原代理均在 idle→revived，报告文件仍为各自唯一交付面（records-128.md / fam-288.md / fam-small.md / member4-header.md），续跑一律**增量追加**不覆盖。
- **预生成 dump**（子代理无 exec，由主会话产出）：`.tmp/mhgu/analysis/followup-dump.txt`（15×128B 全 hex + 12 反汇编窗口）、`reader134-dump.txt`（0x51dc40 全程 + 0x51dbb4 + 0x51e560..0x51e800）、`families-dump.txt`、`families-disasm.txt`。
- **codec-verify.mjs 路径坑**：脚本内按 cwd 拼 `MHGU/MHGU/save-snapshots/...`，必须从 `G:/omp works` 运行（不是 `MHGU/`）。已记录，下次勿踩。

## 2026-10-22 勋章镜像改为 delta（移除静默改写副作用）
**旧实现问题**：`Array.Copy(A→B,17B)` 全量覆盖。干净档 A==B 时无操作，但**已分歧脏档**会把 B 的 33bit 抹成 A 的 132bit = 静默收敛用户存档内容。

**新实现**（OtherForm.cs）：
1. 写块前快照 `medalBefore = h[12631..12647]`（17B）
2. 6 个勋章写块（只写 A 槽，行为不变）
3. **delta 镜像**：`newlySet = after & ~before`；仅当 `newlySet != 0` 时 `h[12651+i] |= newlySet` —— 只把本次新增位置起同步到 B，绝不覆盖 B 既有位
4. 镜像后比较 A/B：若仍分歧（说明存档操作前就已分歧）→ 消息框额外提示「本存档勋章 A/B 双槽在本次操作前已不一致，本次只同步新增位，B 槽原有内容保持不动」

**模拟验证**（对真实存档字节）：
| 档 | 操作后 A bits | 操作后 B bits | A/B | B 原有位保留 |
|---|---|---|---|---|
| clean 猎人A | 130 | 130 | 一致 | 12 → 是 |
| dirty 猎人B | 132 | **33（不变）** | 分歧（仅提示） | 33 → 是 |

结论：干净档仍保持 A==B（不变量成立）；脏档 B 不再被静默改写，副作用消除。编译 0 警告 0 错误。

### 勋章 delta 镜像：用真实代码复算（修正上一节模拟的猜测值）
上一节模拟里 medal04/05/06 的写入是我猜的（得到 A=130），**实际读源码后复算**：
- 六个块精确写入序列：`[0..2]=FF, [3]|=63; [3]|=192,[4]=FF,[5]=FF,[6]|=127; [6]|=128,[7]=FF,[8]|=63; [8]|=192,[9]=FF,[10]|=31; [10]|=224,[11]=FF,[12]|=15; [12]|=240,[13..15]=FF,[16]=15`
- 全勾后 A 槽 = **132 bit 满**，hex `ff ×16 + 0f`
- A 槽零位仅 **132..135**（第 17 字节高 4 位）= 位域合法上界（容量就是 132bit），**不是漏写**
- clean 档 delta 镜像后 **A=B=132**（一致）；dirty 档 A=132、**B 保持 33（hex 逐字节未变）**

**`=` 覆写坑评估**：`[12647] = 15` 是 assign 不是 OR，若原值 >0x0F 会被压低。但该位置合法上界本就是 0x0F（132bit 容量），因此该行为等价于「规范化」，且 delta 镜像只做 `|=` 不清 B ⇒ 无副作用。

## 2026-10-22 名字表容量锚点（防重复查证）
- `mItemType[N]/mItemNum[N]`：下标 **0..159（160 项）**，归 **`cAcNyanterEquip`（随从猫装备）** —— **不是道具箱槽**（2300/2992 不符），别再往箱方向查
- `mEqDeco1/2/3[N]`：各 **0..29（30 项）**，归 `cAcPlayerEquip`（装备装饰珠三孔）
- `mGuild[N]/mOld[N]`：各 3 项，`cTrialArts`（288B 族）
- `mSupperArtsX1/X2/X3[N]`：各 5 项，`cAcPlayerEquip`（狩技）
- `mPermitLv[N]`：16 项（0..15）
- `mListData[N]`：**80 项（0..79）**，`cQuestDaily`（委托列表容量锚点）
- 装备箱尾 `0x17C2E` 实测：36B stride、仅前 20 槽有数据、id 仅 22/23/24、非自增 → **装饰珠候选区**，非图鉴非箱

## 2026-10-22 会话收尾（19/23 完成，4 项外部依赖）
**已完成**：P0 全部毁档修复 · P1 字段解码 · P2 解锁逻辑 · P3 主体测绘（成员#15/口袋/288B/68B/164B/20B/128B/怪物统计/名字字典/134 行权威表）

**4 项阻塞（全部外部依赖，非主会话可推进）**：
| 项 | 阻塞原因 |
|---|---|
| 卡对话根治（501 矛盾位）| 需 猎人B 游戏内实际任务进度，才能判「补 seen」还是「清 cleared」|
| 口袋面板 UI 冒烟 | 需实机操作（编解码已 76B 往返 0 差异 + JS 对拍）|
| 猫装备槽数上限 | 需实机装满后 dump（本档 36000B 仅 40 非零）|
| romfs 任务表 | 补丁 NCA 需 11.9GB base 合并；位号已定案，非关键路径 |

**工作区**：git 干净，58 commits；`docs/` 收纳全部权威产物；派生数据（flat.bin/bin/obj/save-snapshots）脱离 git 并镜像 `G:/backups/MHGU/`。

## 2026-10-23 dsv 全量审查 + 双层元审查闭环
**流程**：dsv-dev×6 并行审 ~10700 行 → 主会话逐行核实 → swe2-supervisor×2 双层元审查 → 补 FIX-INCOMPLETE。
**产出**：13 CRIT+4 HIGH 首轮修（1c20cb9）→ swe2 判 15 正确/1 假阳性（护石负LV合法,契约拦下误修)/5 不全 → d4023fc → advisory 指 RegionLooksLikeBitstream CJK 误报 → 改周期零块 e82dbc5 → swe2 复审 6/7 对剩 CatsForm:579 raw-byte → 0fb42ab。
**关键设计**：V7 布局探测弃自动推断（空档无法区分）改「启发式初猜+用户确认+保存前周期零块自检」三层。
**遗留 known-limitation**：狩技 X3 24B 不落盘、导入尾 356KB 超窗、护石/猎虫未映射字节、猫装备上限（待实机）。
**git**：4 commits 修复+DEVELOP bug 表更新，0 未提交。

## 2026-10-23 知识库扩张轮（用户离场自主作业）
**目标**：机制知识+代码级信源,编辑器可查看,覆盖率向90%推进。

**数据源三件套入库**:
- `mhgu.db`(MHGenDatabase v2.4.0 APK提取,18MB/39表官方数据) → 20表JSON(35MB)
- `mhxx-wiki`(mhwiki.axibug.com离线镜像,290页/37MB→text/4.9MB) 中文攻略全库
- `agroff/mhgu-quest-list` JSON(11MB, Kiranico爬取) — 交叉验证832任务/204技能100%命中db

**机制文档5份(dsv-dev×5,共3625行)**:quests(解锁链/关键紧急表/二名228)/monsters(93槽↔db_id↔HP↔肉质)/skills-arts(阈值+狩技66解锁)/equipment(武器树+护石36B)/systems(调合183+猫饭+猫324B字段表)

**关键资产**:monster-slot-map.json（**已升级为 137 槽权威表**：slot/emid/cn/en/kind，据静态表 0x1597EA4 + 资源表 0x1732050）

**游戏资料查看器上线**:GameDataForm.cs+状态栏右下按钮,6表浏览(非模态),数据自动部署output/data/

**审查代理反哺**:MechQuest发现G4写点786-865应785-864、特殊许可944-1174应946-1173(off-by-one待修);MechMonster证实槽93-134有真实击杀数据但MonsterForm够不到(42只DLC怪缺口)

**git**: 31MB(HTML移出index); docs/106MB/2.5M行

## 2026-10-23 KB扩张轮收尾(用户离场自主作业·第二轮)
**5机制文档全交付**(3625行):quests/monsters/skills-arts/equipment/systems. AnnotateMember4完成member#4 134字段语义标注(定案19/高10/中54/未知51).

**审查反哺的代码修复(已commit)**:
- G4/Permit写点位域边界:`6eb1e8a`——db sort_order权威定界(G★4=782-862+939-943,Permit=944-1171),原写点越界涂邻段
- EX关跳位修正:旧二名12×16第16关(959+16k)+新6×每6第6关,共18个;原跳位偏3
- 矛盾位定案:122个cleared&~seen全是解锁涂的(Permit98/Arena3/G14-16),0真进度,seen|=cleared 100%安全

**新发现(AnnotateMember4勘误+实测验证)**:
- dirty档`0x4447..0x4598`有182个0xFF=旧版"猫装备解锁"写点涂毁猫装备记录区(clean同区全0)——编辑器历史污染又一证据
- member#4的134行表不含obj+0x72C/0x83E怪物计数/0x20的1024B/0x950变长块(外层0x51dbb4自读)

**游戏资料查看器上线**:GameDataForm.cs+状态栏按钮,6表非模态浏览,数据自动部署output/data/

**git**: 70+ commits,docs/106MB/2.5M行. 覆盖率:机制数据100%(mhgu.db全库),存档字节测绘~15%(member#4 134字段全标注,其余成员待续)

## 2026-10-23 晚 — 成员 census + char_off 统一分区（深层逆向）

### 顶层序列化器完整反汇编（`0x3e77b0`）
- **19 个成员对象槽 / 18 个反序列化器 + 2 post-load fixup**
- `0x3e77b0..0x3e7934`：`bl` 序列 = 成员调度顺序；成员对象指针在 rodata `[0x3e7938..0x3e7980]`（19×`0x145xxxx`）
- 三类读原语定性：`0x3df2a8`(定长) / `0x3df378`(定长写) / `0x3df1b8`+`0x3df22c`(**位流**，位宽计算+逐位读)
- `0x521398`/`0x2282a8` = post-load fixup（不读文件流，member[2]校验+全局标志）
- `0x3e7984` = 写侧调度器（调写版 member reader）
- 落盘 `docs/analysis/members/member-census.md`

### 已定性成员
| idx | reader | 成员 |
|---|---|---|
| 0 | `0x19a4ec` | **道具箱** 2292 位流 u16 + `obj+0x62f4` 4080B 组名块 |
| 1 | `0x19e0ac` | **口袋** 32 槽成对位流（id≤2991 + cnt≤99，与 pouch-verified 吻合）|
| 2 | `0x51dbb4` | **成员#4 外层**（1024B头 + 134字段内层 + 274B×2 怪物计数器 + 成员表循环）|
| 3 | `0x14b0b0` | **装备箱** 2000×**36B文件**（44B 内存 stride=36B 文件+8B 运行时）+ 猫装备 1000×36B + 5440B + 1632B；文件侧 @0x62EE..0x17C2E |
| 13 | `0x163e0c` | 尾部大成员 ~22KB（6328+4400+1800+?+13800+1800）|

### 坐标系统一（重要纠错）
- **成员 file 顺序 = 调度器 bl 顺序**（单调递增证据）：file 序 `0x278`道具箱(member[0]) → `0x27BF`口袋(member[1],10175) → `0x2C0B`member#4(member[2],11275) → `0x62EE`装备箱(member[3],25326)。member[3] `0x62EE` **晚于** member[2] `0x2C0B`，非早于——初版记反方向已修正
- `char_off` = .hnt 内偏移；member4-file-layout 的「file_off」列实为 char_off
- **char_off 分区图**（coverage-map.md）：已定性 ~165KB(14%)；**尾部 `0x335A8..0x11F8A0` 967KB(82%) = 最大未知**，内部 560KB 密集成员区 + 稀疏预留（密度剖面非均匀，按采样点非连续语义记）

### 下一步
逐成员 file_off 反推需追各成员 GOT 单例的 file 基址（运行时填充，静态成本高）。或逐字段反汇编尾部密集区 member[4..17]。当前深逆边际——已留 census + 分区图作为精确切入点。

## 2026-10-23 收盘 — 全量状态见 `HANDOFF.md`（新会话从这里接手）

本轮要点（数字与路径都在 HANDOFF.md，此处只记决策与教训）：
1. **存档**：成员链 `0x278..0x3783A` 字节级闭合；137 槽真布局 = 94 大 + 43 小（推翻 93+36+8）；锚点 `0x5EA6/0x5FB8/0x60CA` 三重验证；编辑器回写窗扩到 1,177,760 并夹紧末块。
2. **怪物**：`u8[+0x73E0]` = 动作号（477 函数）；**state→handler 53 派发器全解**，motion 名 41/53；类成员 `{offset,type,name}` 110 条；类清单 3,201 个（名+大小）。
3. **代码度量**：分母 23,885 函数 / 5.23M 指令；**Tier A（双预测一致）= 51.5% 指令、实测 94.7%**；Tier B = 48.5% 需逐函数裁定。单次切分的 95.7%/83.7% **不可复现已作废**。
4. **方法论教训（写进工具 README）**：ARM 掩码在 JS 里有符号陷阱；BL 必须带 bit24；字符串走 pc 相对不是绝对指针；`cmp #N` 常是迭代上限不是位宽；类名种子不可靠（57.4%）；callee 票数会继承上层错分（循环论证）。
5. **代理经验**：dsv 无 exec；**120 函数/片可稳定完成，1,062/片 大面积 499**；必须「每 30 个 append 落盘」。
6. **外部资料纪律**：`docs/reference/mhxx-wiki/` 是前人知识库，只做交叉验证，**不改动**（曾误操作已恢复并被用户明确要求）。


## 2026-10-23 夜 — 吸收 SUYU-GURecomp（GPL-3.0）事实
- 来源：https://github.com/GURecomp/SUYU-GURecomp @35015f1（浅克隆于 `.tmp/ext/SUYU-GURecomp`）。许可证 GPL-3.0（mod_host_api.h、FSR 为 MIT）。本 repo 无许可证 ⇒ **只记事实、不抄代码**。
- 坐标：SUYU "main+X" = 我们的 vaddr X（0xBBCD34 = mov r0,#1920 / movw r7,#0x438 实证）。kHelpers 偏移是 **nnSdk 相对**（nvn_trace.cpp:296-324）。
- 新工具 `tools/mhgu/nso-flat.mjs`：NSO0 → flat(+0x100)；对 main 的输出与 main.140.flat.bin 除 0x100 头外逐字节一致；已产出 `.tmp/mhgu/extract/exefs-0eb5/sdk.flat.bin`。
- 产出 `docs/analysis/external/`：part1 21 VERIFIED；addr-check 21 VERIFIED / 20 PLAUSIBLE / 9 SKIP / 0 CONTRADICTED；SPK/ARC/romfs 格式（PLAUSIBLE，待 romfs 验证）。swe2 审计 PASS。
- 纠错两次：①helper 误按 main 核对判 CONTRADICTED → 改按 sdk 核对，均 VERIFIED；②0xBC1204 误判 CONTRADICTED → SUYU 只说 "after its first call"（0xBC1200 = blx r7），Mark() 接受任意内部 pc → VERIFIED。
- 可用于 Tier B 的种子：相机投影 0x1C358（+0x38 宽高比、+0x3C FOV 度）、渲染尺寸 0xBBCD34/0xBBBDE0、动态模糊 0x8BCD84、滤镜构造、Pia 网络接收路径 0x131xxxx/0x139Dxxx..0x13AAxxx。
- 路由：dsv-dev = wb2api/global:deepseek-v4.1-flash（effort hi），swe2-supervisor = devin-northstar/swe-2-max。教训：大任务 dsv 反复 499/断流 0 产出；**每代理 3 个地址块 + 先写后读**，17 片 16 片 3 分钟内完成。
- 评估报告：`docs/history/PROJECT-EVAL-20261023.md`（21 处文档矛盾、52.5% 不可从 git 复现、Top 8 下一步）。


## 2026-10-23 深夜 — 开源与私有拆分
- 决策：与 SUYU-GURecomp 互补（它=运行平台，我们=内容层：资料/存档/玩法 mod）。主线 A 模拟器 / B 原生重编译版（Forge 插件）。
- 私有仓 `G:/omp works/MHGU-private`（b95d28d，永不推送）：flat.bin、save-snapshots、mhxx-wiki、mhgu.db 及 Kiranico/MHGenDatabase 导出表、editor-src（第三方编辑器反编译）、analysis/dumps。原路径：目录=mklink /J，文件=硬链接；`.gitignore` 屏蔽。备份 robocopy → `G:/backups/MHGU-private`。
- filter-repo 两遍：①删上述路径全历史；②替换文本 `USER`/`LOCAL` → 占位。核查：历史 0 条命中，pack 1.54MiB。改写前备份 bundle 已 verify。
- 冒烟：arm32.mjs 经硬链接读 flat（0xBBCD34=mov r0,#1920）；coverage-final.py 可跑；mhgu.db 经硬链接可查（monsters=129）。
- 公开：https://github.com/Twelve-eight/MHGU（public），远端树 0 条私有路径。LICENSE=MIT，docs/LICENSE=CC-BY-4.0（官方 legalcode.txt）。
- AGENTS.md 新增 §2e 实机测试授权窗口。

## 2026-10-23 深夜 — Tier B pass2 收尾（**53.1% 为暂定值**）
- 7 片完成：01/03/05（120 行）、11/12/13（286）、14（282，输入即 282）。11-14 原输入无反汇编，主会话重生成 `.tmp/mhgu/tierB2/slice-NN.asm.txt` 后重做。slice-13 漏 1 行（0x64a198），主会话补为 B。
- `coverage-final.py`：A + B(confA) = **53.1%** 指令 / 37.9% 函数，Tier B conf=A 191。
- **暂定**：swe2 round 1 只审了 01/03/05 与 11-14 的早期行（10 行降级已应用）；11-14 完成后的 104 行 conf=A 在 round 2 审计中，结果回来前不作为正式口径。
