# Tier B 抽样复核 — 块 28–34（BBlocks05）

输入：`bsamples/s28.txt` … `s34.txt`，每块 12 个函数，共 84。输出：`verdict-28_34.tsv`（同目录）。

判据：
- `confirm`：函数体内有**直接**子系统证据（类名字串 / 类注册点、vtable 槽归属、已知类的 API 调用、类特有字段布局或特征常量），且与当前标签一致；
- `relabel:<label>`：直接证据指向另一子系统；
- `unknown`：只有通用数学/访问器/thunk，或所属类未注册、`classprefix-map.tsv` 无对应前缀，无法在现有标签表内归属。

> 重要：样本第三列（current_label）与 `tiers-recomputed.csv` 有 **67/84** 行不同。本裁定按任务要求以**样本列**为准。tiers-recomputed 的若干新标签与本次独立结论同向（0xa74714/0xa86d58/0xa9c1f4→render-gfx、0xb3b5e0/0xb7c434→physics-math、0xb506b4→render-gfx 等），但另一些仍与内容冲突（0xa84028→ui、0xaf488c→online-nex、0xbe6450/0xbf07c4→online-nex），说明 `spread(+address)` 型标签不可当作内容证据。

## 逐块计数

| 块 | 抽样 | confirm | relabel | unknown | confirm率 | 修正主方向 |
|---|---:|---:|---:|---:|---:|---|
| 28 | 12 | 1 | 11 | 0 | 8% | render-gfx ×11（cParticleGenerator* 粒子生成器） |
| 29 | 12 | 6 | 6 | 0 | 50% | render-gfx ×6（粒子发射/顶点/管理器） |
| 30 | 12 | 2 | 5 | 5 | 17% | physics-math ×3、online-nex ×1、render-gfx ×1 |
| 31 | 12 | 0 | 7 | 5 | 0% | render-gfx ×3、physics-math ×2、monster-em ×2 |
| 32 | 12 | 1 | 8 | 3 | 8% | audio ×3、render-gfx ×3、ui/online-nex ×1 各 |
| 33 | 12 | 0 | 7 | 5 | 0% | audio ×3、physics-math ×3、render-gfx ×1 |
| 34 | 12 | 2 | 6 | 4 | 17% | physics-math ×4、render-gfx ×2 |
| **合计** | **84** | **12** | **50** | **22** | **14%** | — |

relabel 目标分布：render-gfx 27、physics-math 11、audio 6、ui 2、online-nex 2、monster-em 2。

## 三个例子

1. **块 28 / 0xa84028（monster-em → render-gfx）** — vtable 归属：`cParticleGeneratorLiteBillboard` 实例 vtable `0x17902c0` slot 1（create 0xa83f7c，类注册 0xa84c18）；本体 `bl 0xa58e70`（cParticleGenerator slot 0）后经全局单例 `bx [r1,#52]`。同块的 0xa86d58/0xa88634/0xa8d5d4/0xa948c0/0xaa46b0/0xaabc28/0xabc8dc 都是同族 `cParticleGenerator*` 的 vtable 槽，0xa9c1f4 更是 `cParticleGeneratorPoint` 的类注册点（site 0xa9c414）。块 28 的 12 个样本全部落在粒子模块（11 个 relabel + 0xab1d24 confirm），`monster-em/quest` 是系统性的错标。

2. **块 32 / 0xbe6450、0xbee8f0、0xbf07c4（otomo-ot/render-gfx → audio）** — 三者都操作 **sSound 单例**（class-inventory `sSound` size 206976 = 0x32800）：0xbe6450 走状态 [r4+4]/[r4+224] 并调 0xbe23dc（后者访问 [r4+0x31f98]）；0xbee8f0 做 `10^(x/20)` 分贝换算（`vdiv #20` + `vmov #10` + `bl 0x13f00d0`）写 [r4+0x31a1c]；0xbf07c4 是 68 字节声音请求记录池（容量 [r9+0x31880]、计数 [r9+0x318a8]、锁 [r9+0x31848]）。0xbe6450 的块邻居另有 sShadow（4416 字节）对象，但偏移 0x31f98 只能落在 0x32800 的 sSound 上。

3. **块 31 / 0xb506b4（otomo-ot → render-gfx）** — 函数内类注册：`add r1,pc,#0x9c000` 解析到 0x1579c30 的 `"rShader2"`，随后 `bl 0x7aedcc` 注册并把类 vtable 写入新类记录；`classprefix-map.tsv` 的 `rShader → render-gfx`。同判据下 0xb7c434 注册 `"rCnsJointOffset"` → physics-math（`rCns` 行），0xb7f77c 是 `rGUI` vtable 0x1794c9c slot 15 → ui。

## 逐块备注

- **28**：除 0xab1d24（confirm，28 个 callee 全在 0xa74/0xab8 粒子簇）外全部为 `cParticleGenerator*` 类方法/注册点；建议该块按 render-gfx 重标而不提升。
- **29**：粒子发射（0xae1fc0/0xaef1e4/0xaf1b08/0xafdecc 与 0xab1d24 同模板）、0xaf6a34 为 `nAI::TaskPerformanceInfo::LOD`（16 字节对象阈值选择，confirm monster-em）、0xaf488c 经 `cParticleNodeInfinite` slot 18 调用。0xb01148/0xb03cd4/0xb068d4 是 nDraw 类槽/析构。
- **30**：nDraw 资源析构（0xb0ad08 无类符号）、nCollision（0xb15ad0/0xb1d04c）、nNetwork（0xb2aeb8 confirm）、rChain（0xb3b5e0）混杂；5 个 unknown 全是 thunk/getter/通用查找，不能用于块纯度估计以外的推断。
- **31**：整块是 `r*` 资源类描述构建（rMetaSet / rNavigationMesh / rShader2 / rAIWayPoint / rCnsJointOffset / rGUI / cAISv*），0 confirm：样本原标签（otomo-ot/player-pl/online-nex）与内容全部不符；5 个 unknown 是资源装载器/析构/getter/矩阵工具。
- **32**：sEffect 颜色对象（0xb93b70 写 Rec.709 亮度系数）、GUI 字体纹理（0xba1b78 创建 528 字节 nDraw::Texture）、sRemoteProcedure（0xbbbc10）、MtFileStream（0xbc74e0 confirm）、sScene::TextureInfo、sShadow 资源组（0xbde700）、sSound（三名）。0xbad2a4 是 sPad 状态查询，输入域在标签表中不存在 → unknown。
- **33**：sSound 声音槽（0xbf6364/0xbf94e4/0xc00940）、sToolBase（0xc06088）、sVibration（0xc0ab50/0xc19888，无标签）、sCollision::Sbc*（0xc10a9c/0xc1c56c/0xc29db4）。0xc23154 是纯 AABB 排序，unknown。
- **34**：sCollision/Sbc 与 uGeometry2（0xc358e8/0xc514a0/0xc700a4/0xc75c9c）、uGrass（0xc5b5f8 confirm）、uMulti* 后处理（0xc65710/uSynchroGrassWindDirection）、0xc49168 渲染常量装配（confirm）。0xc3f130/0xc46cc0/0xc4df70/0xc733bc 无类符号 → unknown。

## 结论（块级外推用）

- 块 28、29 方向一致且几乎全体可判：28 的 12/12、29 的 12/12 都落在粒子/效果模块（28: 11 relabel + 1 confirm；29: 6 relabel + 6 confirm），可按 render-gfx 重标后整体复核，但不能沿用当前标签提升。块 31、33 各有 7/12 明确改标、0 confirm，其余 5 个不可判；改标方向在块 33 内分裂为 audio 3 / physics-math 3 / render-gfx 1，不构成单一替代标签。
- 块 30、32、34 内部为 2–3 个子系统拼合（nDraw/nCollision/nNetwork、sEffect/GUI/sShadow/sSound、collision/render），块级单一标签外推不成立，只能逐函数提升。
- 84 个样本中 50 个可给出另一标签的硬证据，22 个连子系统都不可判（thunk/getter/通用数学）——后者应保留 B 并计入"不可验证"，而不是按 votes 提升。
