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

## 2026-10-23 — Forge PC 与跨作移植先例（取证完成）
- Forge PC：`GURecomp/forge-pc`（MIT，v0.7.0），**支持第三方插件**：`mods/0100770008DD8000/<Mod>/plugins/*.dll`，API `include/forge_pc.h`。⇒ 我们写 Forge 插件，**不自建 loader**（自建会顶替 Forge，用户已装插件失效）。已有第三方 PC 插件先例（GameBanana Recomp-Plugins：Cam Distance、Better Box）。
- 跨作先例：MHGU→Rise 仅护甲模型移植（GameBanana 458243 等，主会话打开核对过标题）；**无**怪物行为移植、**无**地图移植；Rise→MHGU 仅音乐包。Nexus 本机 TLS 不可达，相关条目留在 `## Unknown`。
- **更正**：此前报告中「Nexus mods/3584、764」系未取证说法，作废；以 `docs/analysis/external/forge-pc-and-porting-precedents.md` 为准。

## 2026-10-23 — 覆盖率定稿 53.1%；SUYU 发布包核验；插件规格补审
- swe2 pass2 Round 2（Swe2Pass2Audit, devin-northstar/swe-2-max）复核 slice-11..14 全部 conf=A 105 行：仅 0xaeaefc 需降级（类名靠外部 class-inventory + 裸 `bl 0x7aedcc`），已改为 B。重跑 `tools/mhgu/coverage-final.py`：Tier A 51.5% + Tier B conf=A 190 函数 1.7% = **53.1% 指令 / 9046/23885 = 37.9% 函数，定稿**（不再暂定）。
- `docs/analysis/external/suyu-release-check.md`（SuyuRelease, dsv）：可用预编译版 `v0.10.0-test` windows zip（sha256 3e6af297…3d07），无需自己编译 suyu；导出时必须装 VS 2022 ≥17.14 C++ 工作负载；需自有 XCI/NSP + keys + 1.4.0 更新，约 25 GB 空间。导出产物不可分发。下载与导出列入授权窗口。
- 插件规格 `item-box-v7-plugin-spec.md`（d1b64c7）提交时写了"swe2 审计待回"但当时未派审计（§8 漏配），已补派 Swe2PluginSpecReview，重点 R2（V7 是否只搬不扩 B 区 → 若成立则为已发布 pchtxt 的已知问题）与 R5。

## 2026-10-24 收工锚点（swe2 429，用户关停会话；复活后从这里继续）
- 用户指令：不再拉起新代理；之后逆向工作改用用户接入本 harness 的 GLM（模型 id 以用户告知为准，用前确认）。
- 已完成并推送：editor/help 22 条机制说明（18 个写入函数）；HR 0xB1 证伪（核心库+规格表格 878abde）；按 G-14 移除装备删除；pak 工具（MHRS f621225，实测通过）；覆盖率定稿 53.1%；SUYU 发布包核验。
- 未收尾的 swe2 审计（复活后只读取结果，不重派）：
  - Swe2HelpReview：口头核对字段名/子键/出处均通过，但报告 `.tmp/reports-mhgu/help-review.md` 未落盘，已要求写入。
  - Swe2PluginSpecReview → `.tmp/reports-mhgu/plugin-spec-review.md`（R2：V7 B 区未扩容是否成立；R5：0x5B807C 归属）。R2 成立则记入 HANDOFF，作为 pchtxt 的已知问题。
  - Swe2PakToolReview → `.tmp/reports-mhrs/pak-tool-review.md`。
  - Swe2RsReview → `.tmp/reports-mhrs/batch1-review.md`（reflection-rsz.md 终稿）。
- 待办见 harness todo；下一步：编辑器 UI（字段旁显示 editor/help）、离线往返测试。

- 2026-10-24: Swe2HelpReview 审计 editor/help 6 个文件 22 条全部 PASS，无需修改（`.tmp/reports-mhgu/help-review.md`）。审计发现术语表只覆盖 StS2，MHGU 术语是按机制文档自身用法核对的。

## 2026-10-24 — mhgu-re 只读 MCP 服务（第 1 阶段）
- 起因：审查方（dsv-dev）没有 shell，今天已 4 次请主会话代跑反汇编；GLM 在开放式长段线性反汇编上卡死。
- `tools/mcp/mhgu-re.mjs`（零依赖，stdio JSON-RPC）提供 6 个工具：disasm / read_words / calls_to（仅直接 bl/blx）/ literal_loads（仅无条件 ldr）/ function_start（push-lr 启发式）/ read_bytes。工具描述里写明各自的启发式局限。
- 计划经三方评估（`.tmp/reports-mhgu/mcp-eval-{swe2,dsv,opus}.md`；swe2-max、dsv4.1f、northstar-kiro/claude-opus-5.5 由用户特批），三方结论均为"修正后采用"。已修正：
  - 白名单两侧都按 realpath 比较，防止通过 junction 或硬链接逃逸；
  - 白名单从整个 `.tmp/mhgu` 收窄到 extract/yure 等子目录，并按文件名禁读 `*.keys`（原白名单会暴露 `prod.keys`，dsv 指出）；
  - 只允许读普通文件；
  - 输入 schema 加上类型；
  - 地址超出镜像范围时报错；
  - 只回应受支持的协议版本；
  - 支持 JSON-RPC 批量请求。
- 冒烟（主会话，`.tmp/mcp-smoke.mjs`，18 个请求）：已知 thunk、函数归属、romfs 头、GOT 字面量均正确；越权路径、`..` 逃逸、两处 prod.keys、目录路径、越界地址、非数组参数全部被拒；批量请求正常。
- 注册：`G:/omp works/.omp/mcp.json`（项目级）。子代理通过父会话的连接继承 MCP 工具（omp 文档 system-prompt-customization.md:90,95），不用改角色定义的 `tools:`。**需要用户执行 `/mcp reload` 后才会连上；连上后用一次子代理调用验证。**
- 第 2 阶段（Ghidra）延后：三方均认为当前不划算。若重启，按 dsv 建议把 flat 镜像以 raw ARM:LE:32:v7、基址 -0x100 导入，不需要 NSO 加载器；`~/.ghidra` 先重定向离开 C:，分析产物只放 MHGU-private。
- 2026-10-24 上线验证：用户重启 omp 后，主会话看到 6 个 `mcp__mhgu_re_*` 工具；子代理 McpProbe（dsv-dev）没有 bash 也能调用 `disasm 0x55d450`，输出与 arm32.mjs 逐字一致；`read_bytes prod.keys` 被拒。另用 PowerShell junction（extract/jtest → .tmp/mhgu/tools）验证：经 realpath 后被拒。**审查方今后自己复核反汇编，不再请主会话代跑。**
- R2 措辞收紧（HANDOFF 7 #10、规格 R2 裁定段）：越界写是静态确认的，但危害取决于执行顺序，还没裁定；如果 C、D 随后会被重填，前两段越界只是被覆盖。最后一段 D 区填充越界写进其后字段，这是否可达标为 [U]。

## 2026-10-24 实机授权窗口
- 用户授权 01:18–02:48（洗澡 90 分钟，§2e）。GLM 并发上限 9（用户指令）。下面逐条记录启动的程序、路径、备份与恢复核对结果。
- 01:25 R2 裁定**有害且可达**（DsvFillOrderReview；GlmFillOrder 只交了 3 条证据就停了，没给结论）。主会话用 MCP 复核：调用顺序 `0x744184 bl 0x199ae4` → `0x744194 bl 0x199e98`；D 区填充循环界 `0x199F9C add r0,#1000`（`.word 0xe1000a81` 处被补丁改为 0xBB0，pchtxt `0019a09c`）；GOT `0x183A81C`=`0x1858438`。D 区仍为 0x8FE，每次写 0xBB0，越界 690 B，盖掉 `obj+0x6DC0` 处的 A 区备份堆指针和预设 0..3。HANDOFF 7 #10 与插件规格 R2 已更新。
- 01:27 实机准备：yuzu 存档备份到 `G:/backups/MHGU-yuzu-save-20261024`（5 个文件，13 MB，sha1 `G:/backups/MHGU-yuzu-save-20261024.sha1`）。已安装的 V7 `load/.../mhgu-box-expand/exefs/1.4.0.pchtxt` 与仓库 sha1 一致（fa435345）。模拟器位于 `I:\Desktop\yuzu1734`，当前未运行。
- 静态旁证：两个 V7 私有档（HR198/HR5）的预设区按 V7 布局读，名字与内容都正常、无乱码 → 重建路径在这些档里可能没触发，或越界只发生在内存、存盘前被重建。[U]，需要实机：开道具箱整理后查看预设名。
- yuzu3 结果：DsvYure3Review 判 FAIL（GlmYure3 没有交付）；审查方用 MCP 独立推出完整格式（51 组 / 1389 条元素，按 EOF 精确闭合），按规范只能算候选，待独立复核。
- 01:26:28 实机会话：设置 `VK_LOADER_LAYERS_DISABLE=*`，启动 `I:\Desktop\yuzu1734\yuzu.exe -g <用户 XCI>`（PID 21020，进程启动时间晚于授权开始时间，确认是本会话启动的）。yuzu 日志确认 `1.4.0.pchtxt` V7（"ITEM BOX EXPANSION V7"，`0x00199C68` 处写入 B00B00E3）已应用，main build_id FB08F1D2…（窗口标题显示 "1.3.0" 只是 yuzu 的显示问题，补丁按 1.4.0 的 build_id 匹配上了）。只做了启动加载，**没有任何输入、读档或存档**。
- 01:28 按 PID + 路径 + 启动时间三重核对后关闭这个进程（先 CloseMainWindow，8 秒后才强制结束）。存档核对：4 个存档文件逐字节 `cmp` 与备份完全一致，sha1 与清单相同（`sha1sum -c` 报 FAILED 是路径前缀导致的误报，已用直接哈希比对排除）。
- 结论：yuzu1734 没有 UI 自动化或内存读取接口，"开道具箱整理 → 看预设是否被盖"这个 R2 实机验证需要人操作，等用户回来手动做，或以后接入内存读取工具。
- 01:35 编辑器离线往返测试 `editor/test/roundtrip.mjs`：在全部 14 份私有样本（4 份 system 含 3 个槽位、10 份 .hnt）、legacy 和 v7 两种布局上，对 18 类可写字段各做两项检查：原值写回整份存档字节不变；改成新值时只影响该字段，再改回后恢复原样。测出 1 个 bug 并修复：`writeQuestState` 遇到 cleared=1/seen=0 的脏位时，写回原状态也会把它规范化掉，导致"原值写回"改了字节。现在写入状态与读到的状态相同时不做任何写入；脏位只在用户真正修改这条任务时才规范化。结果 **PASS 3963 FAIL 0**，另有 3 份存档 quest[100] 是脏位，在测试修改它时被规范化（符合规格 I1）。核心冒烟 PASS 265。
- 01:40 **覆盖率口径问题（DsvB3r08 发现，主会话用 MCP 复核）**：`functions4.csv` 的 23,885 个"函数"是按 BL 目标切分的**区段**，不是真实函数。其中 6,361 个区段内部还有 28,807 个 `push{..,lr}` 起点（全 .text 共 46,088 个）；例如 0x8ab038 区段 688 条指令，实际是 0x8ab038 析构函数（63 条）加上 0x8ab1d8 等函数。后果：以区段为单位的标签和 conf=A，会把区段里别的函数的字符串当成区段起点函数的证据。pass3 slice-08 的 5 个 A 全部因此降为 B；pass1/2 已发布的 conf=A（191 个）**可能有同类高估**，需要按真实函数边界复核。53.1% 的指令覆盖率是按区段算的，区段被整段计入，**可能偏高**，降为 [B] 待重算。

### 2026-10-24 02:13 pass3 进度（主会话）
- 已审查入库: slice 01(a/b/c) 02 03 04 05 07 09 10 11(a/b/c) 12(a/b/c)。A 级合计仅剩 0x4fa5e8 0x2c0e50 0x5bf160 0xcf1190 四个；审查方普遍发现角色按区段级 callee 计数高估。
- 进行中: 13 (a1/a2/b2/c), 14 (a/b/c), 15 (a/b)；15c 待派。
- 13a/13b 停滞根因: MCP 参数形状写错后反复重试; 新提示给出确切形状并要求失败一次即放弃 MCP。
- 12b 末 4 行审查方已下线, 主会话 MCP 复核 (0x13c630/0xbdd280 降 C)。

### 2026-10-24 02:17-02:20 R2 实机会话（用户在场操作）
- 02:17:18 启动 `I:\Desktop\yuzu1734\yuzu.exe -g <用户 XCI>`（PID 14112，VK_LOADER_LAYERS_DISABLE=*），日志确认 V7 `1.4.0.pchtxt` 已应用（0x00199C68）。测前备份 `G:/backups/MHGU-yuzu-save-20261024-r2live`（含 .sha1）。
- 用户执行：读档、开道具箱整理、看道具组合，报告无乱码、无崩溃，自行关闭 yuzu（02:19 前退出）。
- 存档比对：两个 .hnt 字节不变；system/system_backup 有变化（mtime 02:19:18），变化全部在槽 0（HR198 角色，不是建议的 Sakiko）；游戏时间 +78 秒，说明游戏写过存档。道具箱 2285 → 2293 个非空格，按整理后的顺序重排；预设 0–3 字节不变；预设 4/5 互换（"设置06" 从 5 移到 4，各约 48 B）。另有 4 个字节在槽外（推测是校验和或头部，未核实）。
- 测后副本 `G:/backups/MHGU-yuzu-save-20261024-r2live-after`。还没有恢复：现在的存档是用户这次实际玩出来的结果，要不要回滚等用户决定。
- R2 结论（暂定）：预设 0–3 字节不变，没有看到预测中的覆盖；但存档期间用户具体做了哪些操作还没确认（是否手动挪过预设、是否主动保存），预设 4/5 移了一位的原因也不明。在用户确认之前，不写“未复现”或“已复现”。

### 2026-10-24 02:30 道具箱开头 11 个空格的分析（用户报告：整理后第一行全空、第二行第 1 格空）
- 原因：存档里有 11 个 id=0、数量=99 的非法格（幽灵格）。游戏把它们当成编号最小的物品排到最前，显示为空格，正好占第 0–10 格，和用户看到的一致。
- 来源：最早的副本 `save-snapshots/20261022-v6-ready/system`（2026-10-22 07:37）里，同样的 11 格（2289–2299）已经存在。这比本仓编辑器首次提交（2bab7b8，2026-10-23）更早，所以不是本仓编辑器写的。用户回忆以前用过别的存档编辑器改物品；当时箱子里 2285 件物品有 2190 件数量为 99，符合批量改数量留下的痕迹。V7 没写这些格。
- 用户应用了一次预设物品组合，8 件道具从道具袋放进箱子，填进了前面的空格；现在只剩第 10 格一个幽灵格。
- 本仓编辑器：`checkSlotValue` 拒绝 {id:0,count:99} 和 {id:5,count:0}（这次重新实测确认），读取时 `valid:false` 能标出这类格。
- R2 状态不变：静态分析的越界写（D 区填充写 0xBB0，超出 D 区 690 B）仍在代码里。这次实机走了整理 + 存档，预设 0–3 字节没变，说明这条路径这次没造成可见损坏，但不能证明补丁没问题。预设 4/5 名称移了一位，原因不明。

### 2026-10-24 V8 道具箱补丁 + 编辑器幽灵格检测
- 用户确认：预设 4/5 是用户手动换位；要求读档时提示幽灵格；V7 修复方案由主会话选择 → 选方案 2（B/C/D 按 2992 分配）。
- `tools/build-v7-final.mjs` 改为输出 V8，`patch/1.4.0.pchtxt` 已重新生成：123 行，偏移与 V7 相同，59 行只改 movw 立即数（解码比对确认操作码与 Rd 不变）。布局与静态检查见插件规格 R2 节。V7 原文件：git 历史 + `.tmp/mhgu/v7-1.4.0.pchtxt`。**未实机**。
- `editor/core/items.mjs` 新增 `findInvalidItemSlots`、`clearInvalidItemSlots`。在备份副本上验证：r2live 测前与 V6 快照各检出 11 个幽灵格并清除，只改动 20 B；测后副本检出 1 个，只改动 2 B；其余格子不变。roundtrip PASS 3963 / FAIL 0，core smoke PASS 265。UI 提示还没接上。用户实际存档没动。
- 覆盖率重算的说明里补了抽查结果（5 行降级成立），并注明误差方向未验证（code-metrics §9）。

- 2026-10-24 03:10 公开默认补丁恢复为 V7（`patch/1.4.0.pchtxt` sha1 fa435345），V8 改放 `patch/experimental-v8/1.4.0.pchtxt`（sha1 79b32dca），生成器输出路径同步修改。V8 实机前不作为默认。另：V7 那次实机预设 0–3 没被写坏，原因还没查清，所以 V8 实机即使正常，也只能说明没有回归、没有崩溃，不能证明 R2 已修复。

## 2026-10-24 VS Build Tools 安装（用户授权）
- `vs_buildtools.exe`（Microsoft 签名）安装到 `G:\VS\2022\BuildTools`，cache/shared 均在 `G:\VS`；组件：VCTools、VC.Tools.x86.x64、VC.CMake.Project、Windows11SDK.26100。exit 0。
- vswhere 报告 17.14.42，MSVC 14.44.35207（满足 SUYU 要求的 ≥17.14）；bundled cmake/ninja/link 都在 G:；实际编译运行 hello 成功。
- C: 占用 2.41 GB（SDK 装在 `C:\Program Files (x86)\Windows Kits\10`），C: 剩余 6.6 GB。
- 注意：PATH 上 `G:\Git\usr\bin\link.exe` 排在 MSVC link 之后，vcvars 环境内不受影响。

## 2026-10-24 SUYU 导出实机会话（用户在场授权）
- 包 `G:\suyu\suyu-mhgu-0.10.0-test-windows-x64.zip`，129,987,918 B，SHA-256 与发布页一致；解压到 `G:\suyu\app`。
- 便携模式：`G:\suyu\app\user`（启动后生成 cache/config/keys/nand 等），`%APPDATA%\suyu` 不存在；keys 从 yuzu 复制过来。suyu PID 15592。
- 计划：用主存档（Lay1nn）的副本，导出 Build 格式到 `G:\suyu\export`；yuzu 原存档不动。

## 2026-10-24 Tier A otomo-ot 复核（DsvOtRecheck + DsvOtRecheckReview，dsv-dev / wb2api/global:deepseek-v4.1-flash，effort hi）
- 报告：`.tmp/reports-mhgu/tierA-otomo-recheck.md`；审查：`...-review.md`，判 FAIL（可修）：0x571794 应为 ui（producer 判 unclear 错），8 区段指令和为 5,969（producer 内部算术不一致），3 处 CSV 行号错。
- 共同结论（双方证据一致）：被举报的 8 个区段 7 个有 UI 证据（类名 `cUIO*`、UI 控件基类 0x56e528 调用），审查补证后 8/8；错在 tiers.csv 的区段标签（调用图传播成片染色），不是关键词规则。等距抽 10 个：1 个 UI，9 个头部看不出子系统，0 个有 otomo 证据。
- 规模（主会话按 tiers.csv 求和）：Tier A 中 otomo-ot 共 1041 行、224,608 条指令 = .text 4.30%，占 Tier A 8.3%。Tier 列不变所以 51.5% 数值不变，但这 4.30% 的标签不可信；**Tier A「94.7% 精度」在 otomo-ot 上不成立**，标签需要逐函数重判。
- 返工后主会话核对：producer 报告已按审查修正（0x571794 → ui，8/8 = 5,969 条，行号已改）。注意：表 3 抽样的 10 个区段大多是 Tier B，所以「9/10 无证据」只说明 B 级 otomo-ot 标签弱，不直接量化 Tier A 1041 行的错误率；那需要在 A 行里另抽样。

## 2026-10-24 夜 编辑器 UI
- `editor/ui/`（DsvEditorUI 实现 + DsvEditorUIReview 审查 PASS，dsv-dev deepseek-v4.1-flash hi）。主会话修了审查 MEDIUM：载入新文件时重置布局，强制重选。
- 主会话浏览器冒烟（本机 http-server + 无头 Chromium，样本副本 system_V7_active）：选 V7 后显示 11 个幽灵槽（2289–2299，与先前离线结论一致）；把槽 0 数量改成 42、清除幽灵槽、下载 → 导出文件与只用 core 做同样修改的结果**逐字节一致**（0 字节差，5,159,100 B）；页面无 JS 错误。副本与下载已删。
- 未做：审查剩余 3 个 LOW/INFO（分页丢焦点、提示里的英文 UNCONFIRMED、槽位解析失败提示文字）。
- UI 三个 LOW 已修（DsvUIPolish + DsvUIPolishReview PASS）；浏览器复测：下一页后焦点仍在 `page-next`，第 2 页从槽 100 开始，无 JS 错误。
- 冒烟服务器两次都以仓库根为站点根、开着目录列表（仅 127.0.0.1，各运行约 3 分钟和 18 秒，均已停止）。私有数据通过 junction 接在仓库里，所以这样起服务器不对；GOAL.md 已写明以后只从 `editor/` 起，并用 `-d false` 关闭目录列表。

## 2026-10-24 夜 批次 C（vtable→类）先导：负结果
- GlmVtblPilot（glm-re, wb2api-remote/glm-5.3-flash max）30 分钟只写了方法段，结果表 0 行，主会话终止；DsvVtblPilotReview（dsv hi）判 FAIL。
- 审查确认的机制：类注册 `bl 0x7aedcc` 的 DTI 对象全部在 .bss（0x184b060–0x184c188，exefs 只到 image_end+0x100），**静态读不到 DTI vtable**，原方法不可行。名字/大小/存储格可脚本化，但已在 class-inventory 里。真实 vtable 在 .data 中形如 `{0,0,e0,f1..f5}`（e0 通常是 0x32c = `bx lr`）；另有不走 0x7aedcc 的第二种注册形式（0x92e0 直接写 [D,#0]）。
- 下一步若要做：改从 .data 扫 `{0,0,0x32c,...}` 形 vtable，再找把该 vtable 写进 [obj,#0] 的构造函数，按构造函数里的类名归类。未派。
- 主会话按审查给的形状扫 .data（`{0,0,0x32c,code,code,code}`）：只命中 **2 个**，不能作为通用 vtable 识别方法；审查的形状说法只在个例成立。批次 C 暂停，需要先在已知类上（例如 cOtArmorBase 0xf284c）手工找到对象 vtable，再归纳形状。
- 主会话 RTTI 扫描（Itanium 形 `{0, typeinfo*, f0..}` 且 typeinfo 名为 mangled 串）：.data 中 **649 个带 RTTI 的 vtable**，全部是 SDK 类（`nn::nex` 621、`pead` 26、匿名 2）；**游戏自己的 MT Framework 类没有 RTTI**。这些 vtable 槽共 3,278 个不同函数：2,741 个已在 Tier A，与 Tier A 标签一致 2,711（98.9%，独立交叉验证了 Tier A 的 online-nex 部分）；524 个在 Tier B，可按 vtable 所属类升为 conf=A（online-nex/kernel-os），13 个在 Tier C。游戏类 vtable 仍需走「构造函数写 [obj,#0]」路线，暂停。
- 那 524 个 Tier B 函数合计约 14,031 条指令（.text 0.27%，函数长度按 push-lr 启发式估）。增益很小，没有改 tiers.csv 和覆盖率数字。

## 2026-10-24 夜 磁盘
- C: 6.6 → 6.0 GB。近 3 小时 C: 写入：OneDrive `ListSync` 930 MB、Edge 283 MB（都不是本会话写的）；`C:\ProgramData\Package Cache` 471 MB 是 VS 安装器缓存（本会话安装产生，可在用户同意后用 VS Installer 清理）。本会话没往 C: 写入其他东西。
- G: 25.9 GB 可用；suyu 导出已写 21.33 GB（21 个文件，进程仍在运行）。

## 2026-10-24 SUYU 导出：完成
- 日志 `G:\suyu\app\user\log\15592_suyu_log.txt` [1603 s] 出现 `Built single-file launcher with the link kit`；导出目录 `G:\suyu\export\MONSTER HUNTER GENERATIONS ULTIMATE\`，主程序 exe 348,669 KB，最后写入 2026-10-24 11:55（本地时间）。
- AOT 统计（日志原文）：main 937,249 块 / 4,920,852 条指令，0 条未翻译；sdk 有 5 条未翻译，交给 JIT 处理；rtld、subsdk0 均为 0。5 个并行任务，耗时约 27 分钟（之前「要跑一整夜」的估计偏大）。
- 日志写 `AOT: using update ExeFS (0100770008DD8800) rather than the base`，说明 XCI 里带 1.4.0 更新。
- 导出目录 `user\nand\...\0100770008DD8000\` 里有存档副本（Lay1nn_HR198.hnt、Sakiko_HR5.hnt、system、system_backup）；`user\cache\shader\...\vulkan.bin` 也在。**我没有运行导出的 exe**（§2e：要用户在场）。
- 13:28 复查：suyu 进程 PID 15592 仍在运行（累计 CPU 221 s，空闲），没有子进程。

## 2026-10-24 SUYU/Forge 种子地址对照
- SUYU 发布包的 `coverage/fb08f1d2…txt` 只列 3,146 个「游玩中发现未翻译」的代码偏移，不带名字，不能当子系统种子。
- Forge PC（`GURecomp/forge-pc`，MIT，克隆到 `.tmp/ext/forge-pc`）给出 8 个有作者注释的函数地址（UIFix 的 7 个 GUI 函数、hello 示例的相机投影函数）。对照 tiers.csv：
  - 相机投影 0x1C358：B/render-gfx，一致。
  - GUI 绘制 0xA3DA50、0xA39300：A/render-gfx。说得通（GUI 绘制同时属于渲染），不算错。
  - rGUI 工厂/析构 0xB7F1D4、0xB7F260、0xB7F2E0，以及 0x541254：都是 B/quest；0xA34070 是 B/audio。**5 处 B 级标签与作者注释不符**，再次说明 Tier B 不可信。
- 种子太少，不足以按区间标注 render/camera/Pia。本项关闭为「已核对，种子不足」，不改 tiers.csv。

## 2026-10-24 Forge 插件骨架 BoxProbe
- `forge/boxprobe/`：只读探针插件，执行插件规格 §5 第 1–4 步（模块基址检查、123 个站点的原指令比对与 is_block、回退找块起点、按块分组），结果写到 `<mods>/BoxProbe/boxprobe.txt`。不写内存、不挂钩。
- DsvBoxProbe 实现 + DsvBoxProbeReview PASS（30 条，0 FAIL，dsv-dev deepseek-v4.1-flash hi）。主会话用 VS 17.14 编译：`/W4` 无警告，boxprobe.dll 152,576 B，导出 forge_onInit/onLoad/onUnload/setApi。
- Forge PC 本体（forge.dll）编译需要 Vulkan SDK 头文件，本机没有；运行要等用户在场，在导出的游戏里装 Forge 和本插件。

## 2026-10-24 许可证改为 GPL-3.0-or-later（用户指令）
- `LICENSE` 换成 GPL-3.0 全文（取自 SUYU-GURecomp 的 LICENSE.txt，sha256 230184f6…）；8 个源文件的 SPDX 行改成 `GPL-3.0-or-later`；README、HANDOFF、跨作规格的说明同步更新。文档仍是 CC BY 4.0。
- 影响：今后可以吸收 GPL 项目（SUYU-GURecomp、MH4U-port-to-MHGU 等）的代码，前提是保留其版权声明并注明出处。MIT 的旧提交在历史中仍是 MIT。
- dsv-dev 路由迁到 `wb2api-remote/deepseek-v4.1-flash:max`（探针 ProbeDsv 实测可用）。
- suyu 原生版：Sakiko 存档能读（用户实测）；其余（任务、保存、回 yuzu）待测。

## 2026-10-24 BoxProbe 实机结果 + V7 插件可整套安装
- 用户在原生导出上用 Lay1nn 存档实测（Lay1nn 存档能读取）：Forge PC 0.7.0 加载成功；BoxProbe `words matched 123/123, block starts 123/123, distinct B 103, missing B 0`，主模块基址 0x00653000。原始输出：`docs/patches/runs/boxprobe-20261024.txt`。
- `forge/itembox-v7`（DsvItemboxV7 + DsvItemboxV7Review，dsv-dev wb2api-remote）复核 PASS，但提出 F1：容量 getter 不能克隆；F2：会出现半套布局。主会话修复：
  - getter（第 23/24/26 行）改用替换函数 hook，设 r0=0xBB0 后直接返回；
  - 字面量加载 `ldr rD,[pc,#imm]` 读出原值放进克隆后面的字面量池，并把加载重定向过去；
  - 安装改成全有或全无：只要有一行装不上，就关掉全部 hook。
- 离线演练 `.tmp/itembox-sim/sim.c`（伪 ForgeApi + 1.4.0 flat 镜像 + BoxProbe 记录的块起点）：101 组克隆 + getter hook 覆盖 123/123 行；8 处字面量重定向；克隆逐字核对，120 个改写字、0 错误；游戏镜像没有被写入。
- 还没实机启用。
- 追加修正（同日）：第一版字面量池漏掉了 PIC 惯用法 `ldr r0,[pc,#n]` + `ldr r0,[pc,r0]`（0x198be4/c7c/cd0/d2c）：只搬字面量，克隆里第二条 ldr 会按克隆地址取数，读错内存。根因是 `pc_hazard` 的 011 类（寄存器偏移 ldr/str）没检查 Rn=pc，已修。现在会把 PIC 配对解析成绝对数据地址（4 处都是 0x1e8dc48），第二条改为 `ldr r0,[r0]`。安装改两遍：先全量演练，全部通过才启用。演练（伪宿主）：101 组 + getter，8 个字面量，4 对 PIC，0 错误。只是静态核对，没在 JIT 上执行过。新代码复核：DsvItemboxV7Rev2。
- 第二轮复核 DsvItemboxV7Rev2（dsv-dev wb2api-remote）：getter、编码、pc_hazard、两遍安装、缓冲区都 PASS。修了 3 处：F1 配对时中间的指令不能读写 rD；F2 补上 `<string.h>`；F3 更新头注释和 getter 注释。重编 /W4 零警告；伪宿主演练 102 个 hook（含 getter）、8 个字面量、120 个改写字、0 错误。
- 2026-10-24 夜：方向调整为 MHGU→MHRS 怪物移植 + MHGU 高帧/手柄现代化，武器暂不碰。完整计划：docs/project/PLAN-20261025-gu2rs.md（压缩后从这里恢复）。
- MHGU MOD v212 [C]：头 +36..+60 = bone/group/mat/mesh/vert/face/eof 偏移；网格记录 48 B（+2 vc, +4 group, +6 mat, +7 lod, +10 stride, +12 vpos, +16 voff, +20 fmt, +24 fpos, +28 fcnt, +37 骨骼重映射个数, +40/+42 min/max 索引）；索引是 u16 条带，0xFFFF 断开，42/42 网格的索引落在 [min,max]；vbEnd==vbSize。量化位置原始值 0..29961，归一化 [U]。
- em001 线框 [C 肉眼]：量化位置按统一比例 pos=bbox_min+raw*(1660.13/29961) 渲染出完整雄火龙（MHGU-private/render/em001-uni.png）；按轴单独 /65535 或 /32767 都变形。比例来源 [I]（拟合，待第二只怪验证）。f32 格式 5e7f2030 直接读 3xf32。
- 类型哈希：MOD=58a15856、TEX=241f5deb、LMT=76820d81（版本 0x43）、MRL=2749c8a8、XFS=7cd0e77e [C]。
- Silvris/MH-Tools-and-Scripts 无许可证（API 返回 license 404）：只吸收事实，模板放 .tmp/ext/silvris 不入库。
- **MOD 位置量化 [C 4/4]**：pos[k] = bbmin[k] + u16 * Q，Q = (max(bbmax) - min(bbmin)) / 32767（立方量化盒，原点在 bbmin）。em001/002/007/011 的观测比例与公式在 5 位小数一致；三轴比例相同。bbmin @+80、bbmax @+96。头部 +112..: 1000, 3000, 0x80000001, 0, 每怪不同的计数（含义 [U]）。
- **MRL v34 [C em001/em002]**：头 28 B（+8 材质数, +12 贴图数, +20 贴图表, +24 材质表）。贴图记录 76 B {u32 类型哈希 241f5deb, 8 B, char[64] 路径}；类型哈希 = ~crc32(类名) & 0x7fffffff，对 "rTexture" 得 241f5deb [C]。材质记录 60 B {+4 名字哈希, +8 块大小, +12 shader 哈希, +52 块起点}，块互不重叠且铺满文件。名字哈希同一规则，与 MOD 材质名匹配 3/4（m01_eye 不匹配 [U]）。块内 12 B 资源绑定项，贴图槽索引位置 [U]。
- **MHGU TEX [C 肉眼]**：头 16 B；+8 位域 mips:6 / w:13 / h:13；+12 低 8 位 = 面数，次 8 位 = 格式；+16 u32 = 数据总字节；+20 起 mips x u32 = 各级 mip 相对数据区的偏移；数据区从 20+4*mips 开始；数据是 Tegra 块线性（GOB 64Bx8 行，块高 16 GOB）。格式：0x17=BC3（雄火龙底色图正确）、0x1F=BC5（法线图正确）、0x19=BC4（单通道图像正确）、0x07=R8G8B8A8 [I]（64 B/块 = 4 B/像素）、0x13 [U]。
- MRL v34 复验 [C]：190 个文件、417 个材质；条目数 417/417，常量缓冲偏移 834/834，贴图序号 855/855（0 = 无）。见 docs/reference/formats/mrl.md。
- **C2 高帧（静态部分结束）**：报告 .tmp/reports-mhgu/b5/fps.md。
  - [C] 0x18A6210 在 .bss 内（.bss 0x184aff8..0x2146780），全镜像扫描结果：pc 相对 cell 加载 0 处、add-pc 0 处、.data 里等于该值的字 0 个、add-split 访问 +0x243C（0x2400+0x3c / 0x2000+0x43c）0 处（脚本 .tmp/mhgu-scratch/fps-scan.mjs）。全镜像只有 13 处 movw #0x243c，都属于别的类。
  - [C] SUYU 的 game_settings 只是每 8 帧把 g_fps 写进 [obj+0x243C]；其 >60 时的 DisplayRateScale 只缩放显示速率，不补偿逻辑。
  - [I] 动作变快说明游戏逻辑按固定帧步进（怪物 AI 每次更新按状态字节 +0x73E0 分派一次）。
  - **下一步需要实机**：在 Forge 插件里对 obj+0x243C 下读断点，记录读取者 PC；或者在 on_frame 里比较 30 与 60 时每秒的更新次数。列入用户实机待办。
- **C3 手柄（第一步结论）**：导出版的手柄绑定在 user/config/sdl2-config.ini（只读查看）。当前 Xbox 手柄（guid 030000005e04...130b）按 Switch 默认映射：L=LB(button4)、R=RB(button5)、ZL=LT(axis2)、ZR=RT(axis5)、A/B 按位置。
  - [C] "肩键操作交给扳机"不需要改游戏代码：在 F10 → Controls 里把 L↔ZL、R↔ZR 互换绑定即可（INSTALL.md:121 支持任意重绑）。不需要写插件，用户可直接做；本会话不改用户的配置文件。
  - 快捷轮盘（World 的按住 LB）需要 Forge 插件：ImGui 覆盖层画轮盘 + 截获 LB + 写道具栏光标字段。前置逆向：道具栏当前选中序号在内存中的位置，[U]。
  - C3Pad 报告（.tmp/reports-mhgu/b5/pad.md）：按键掩码在单例 +0x6bfc/+0x6c34/+0x6c3c，写入者不在已转储语料中 [U]。
- **LMT v0x43 [部分 C]**：条目 0x40 B {+0 轨表, +4 轨数, +8 帧数}；轨 0x24 B {u8 类型, u8 用途, u8 ?, u8 骨号, f32 权重, u32 字节数, u32 键偏移, f32[4] 参考值, u32 bounds 偏移}。
  - [C] 所有压缩类型的每键帧增量都在键的最高位（type6 是高 8 位，其余高 4 位）：各轨增量之和 == 帧数-1，15258/15258 轨；对照（改从低位取）0/15258。
  - [C] type6 = 4 x s14/4096，字段从低位起依次为 w,z,y,x：290429/290429 键 |q|=1；首键与轨参考值一致 1670/1916。
  - [C] type7 = 4 x 7 位，按 bounds 解码，998/998。
  - [U] type14 (4x11) / type15 (4x9)：|q|=1 判据太弱（字段重叠的布局也能拿到 97%），已转交 glm-re 逆向解码函数。
- C3 轮盘逆向（主会话，dsv/glm 路由连续 499）：字符串 pc 相对引用扫描（.tmp/mhgu-scratch/strref.mjs）→ cItemPouch 在 0x188f98、sItemPouch 在 0x19e504、cUIOCPanelItemSelectorL 在 0x6520dc。0x6520dc 是 DTI 注册块：bl 0x7aedcc(dti, name, parentDti, size)，ItemSelectorL 实例大小 0xE0，DTI 对象取自 cell 0x1839414 [C]。选中格字段 [U]，下一步：从 DTI 的 new 函数找 vtable 与 update。
- MOD 蒙皮（初步）：
  - [C] cb68015（步长 20）：权重是 +12 的 4 x u8，和为 255（4055/4055）。
  - [I] 其他蒙皮格式：+16 是 4 x u8 骨号，+24 是 f16 权重（6194..18207 顶点全部落在 [0,1]，但这个判据很弱），最后一个权重可能由 1 减去其余得到。
  - [C] 骨号会超过网格的 +37 重映射个数，所以骨号指向的是全局重映射表，不是网格局部表；表的位置 [U]。
  - 这是 B1b（GU 权重 → Rise mesh）的前置。
- MOD 骨号 [C 全部怪物样本]：
  - 骨骼块之后紧跟 256 B 的全局重映射表（游戏骨 id → 本文件骨序号，0xFF = 无），非 0xFF 项正好等于骨数（4/4 只怪）；之后直接是组表。
  - 网格 +36（bone_id_start）在样本中全为 0。
  - 顶点里的骨号是本文件骨序号（< 骨数），位置按格式不同：
    - 64593025 / 14d40022：+16 的 4 个 u8（18207/18207、6194/6194）；
    - b3921020：+24 的 4 个 u8（7750/7750）；
    - d877801b：+20 起（1783/1783）；
    - db7da014：+12（910/910）；
    - cb68015：+8（4055/4055），权重在 +12（4 x u8，和为 255）。
  - 其余格式的权重位置 [U]。
- **更正**：上一条"MOD 骨号 [C]"降级为 [I]。"骨号 < 骨数"只是弱判据，取值都很小的字节同样能通过；权重还没定位，也没检查"和约为 1"。
  - 另一个未检验的候选：Silvris 模板里网格 +36 是 bone_id_start，+24 的权重可能是 10 位打包（&0x3ff /1023，第 4 个 = 1 - 其余）。
  - B1b 写出前必须先在 4 只怪上逐格式确认：骨号 + 权重和 + 不同槽骨号互异。
- **更正**：cUIOCPanelItemSelectorL 的"实例大小 0xE0"降级为 [I]。r3=#224 也可能是字段偏移（反射注册），需要对照其他调用 0x7aedcc 的地方。
- 0x7aedcc 注册调用（.tmp/reports-mhgu/b5/selector-reg.txt）：相邻几个类各自带不同的 r3（ItemSelectorS 216、KeyBase 200、KeyL 200），所以 r3 = 类实例大小 [C]，ItemSelectorL 的 0xE0 恢复为 [C]。
- 蒙皮权重检验（10 位打包 + 骨号 < N + 有效槽骨号互异）：
  - 对照显示 100% 通过的组合全都是 multi=0（读到的是全零填充，即权重 0、骨 0），判据没有区分力。
  - 结论：权重位置 **[U]**；B1b 不使用这些偏移。
  - 下一步换更强的判据：权重来自 LMT 动画后的形变连续性；或者找蒙皮着色器的输入布局表（顶点格式哈希 → 属性偏移，游戏里应有）。
- **顶点格式哈希 [C 9/9]**：格式哈希 = ((~crc32(名字)) << 12) | 低 12 位编号。低位编号与步长无关，是另一个值 [I]。
  - 名字对应：a8fab018 = IASkinTB1wt，c31f201d = IASkinTB2wt，14d40022 = IASkinTB4wt，db7da014 = IASkinBridge2wt，cb68015 = IASkinBridge4wt，5e7f2030 = IANonSkinTBN，d877801b = IASkinTBNLA1wt，b3921020 = IASkinTBNLA2wt，64593025 = IASkinTBNLA4wt。
  - 名字直接给出每种格式的权重个数（1/2/4）。按个数分组再定位权重，判据才有区分力：1wt 无权重字段，2wt 只有 1 个显式权重。
- 4wt 权重：骨号在 +16 [I]；权重编码试了 u8x4/u8x3/f16x2/f16x3/10 位打包，最好只有 82%（14d40022 f16x2@22），100% 的命中全是零填充。停止盲扫，权重仍为 [U]。下一步：找游戏里 IASkinTB4wt 等名字附近的输入布局描述表（属性语义、格式、偏移）。
- **4wt 蒙皮 [C]**（来源：AppShaderPackage.mfx 的输入布局表，字符串池 0x127720，记录从 0x3760 开始，转储在 .tmp/reports-mhgu/b5/mfx-layouts.txt）：
  - 布局表给出 Position 的 w 分量即 Weight，骨号 Joint 在 +16（4 x u8）。
  - 权重 0 = position+6 的 s16/32767；权重 1、2 = +24 的 2 x f16；权重 3 = 1 - 其余三个。
  - 判据：骨号 < N，权重在 [0,1]，有效槽骨号互异，并且要求出现多骨顶点。结果 14d40022 6194/6194（其中多骨 2806），64593025 18207/18207（多骨 11861）。
  - 对照：把权重 0 换成 u16/65535 时降到 5389/6194。
  - 布局表的偏移字段（desc>>22）与实测有一项错位，desc 位域含义 [I]。
- LMT type14/15 线索作废 [C]：0xb037cc 处唯一的 511.0 属于"浮点 → 10-10-10-2 打包"的顶点编码器（0xb0383c 处 orr lsl #10 / lsl #20 / #0xC0000000），不是 LMT 解码器。已停掉 T15Dec、T15DecRev。type14/15 仍为 [U]；下一条线索应是 LMT 采样函数里按轨道类型的跳转表（ldrb 类型 + add pc, rX, lsl #2）。
- 其余蒙皮格式（布局表转储 .tmp/reports-mhgu/b5/mfx-layouts-all.txt，115 条；表中名字相对字段疑似错一位 [I]）：
  - [C] IASkinTB1wt (a8fab018)：骨号在 +6 的 u8，548/548，对照偏移最多 108/548。
  - [C] IASkinBridge2wt (db7da014)：骨号在 +12 的 2 x u8，权重 0 = position+6 的 s16/32767，910/910，其中 181 个多骨顶点互异；对照 59/910。
  - [I] IASkinTBNLA1wt (d877801b)：+6 通过，但 +20/+24 也是 100%（全零），判据无区分力。
  - [U] IASkinTB2wt (c31f201d)、IASkinTBNLA2wt (b3921020)：按表的偏移不通过，布局仍未知。
  - B1b 可以先只做 4wt 与 1wt/Bridge2wt 网格；另外两种格式的网格暂时绑到组内主骨。
