# B 块抽检裁定：block 21–27（84 函数）

输入：`bsamples/s21.txt`…`s27.txt`（每块 12 个抽样函数，块区间 0x79c23c..0xa6a434，合计 3,287 函数 / 420,921 指令）。
输出：`verdict-21_27.tsv`（84 行，列 `block start label verdict evidence`）。只写本文件与 TSV，未动 `tiers*.csv`。

## 方法（每条 evidence 都能落到具体指令/类名/字符串）

1. **精确 vtable 槽类名**：`attr-vtable-retile.tsv` 里 `start` 与本函数完全相等的行（24 条）。这是最强证据：槽目标就是该函数入口，类名来自 registrar→class-record vtable→create→instance vtable 链（`attr-vtable.md` §2–3）。
2. **安装的类记录**：函数体内 `ldr rX,[pc,#N]; ldr rX,[pc,rX]; add rX,#8; str rX,[obj]` 的 GOT 两级解析，读出 class-record 指针 +8 后反查类名（uColorFog、sMovie、uGrassWindLine、uAmbientLight、cRemoteCall、cAITask …）。用已知样本 0x8ed708=uColorFog 校准过。
3. **`bl 0x7aedcc` 类注册**：取 `add rX,pc,rY` 解析出的类名字符串（0x90b9b8 → uFullbodyIKHuman2 一族，0x9fbee4 → cRemoteCall，0xa174e8 → cAIPathTrace 一族）。
4. **属性名字符串**：函数体内 pc 相对载入的 C 字符串（0x96179c → mViewDistance/mpTargetLight/mReductionRatio，0x968dc0 → mpCamera/mNearPlane/mFXAA/mDistortionEnabled，0x8c1900 → mpHazeSrc/mHazeScale/mDepthEnd，0xa4d458 → BlendState/ScissorSize/VertexColorLT…）。
5. **调用簇**：callee/caller 的最近类锚（`attr-library.tsv`/`attr-vtable-retile.tsv`）：uUIBase 0x65c754、sUI 0x55c130、MtPropertyList 0x7bb230、MtFile 0x82b674、MtStream 0x8394d0、nDraw::Texture 0xb07fec、cAIQuadTree 0xa28a34、sFestaGUI 0xba219c …
6. **结构证据**：6 面半空间测试、球-AABB、射线-平面、四元数→旋转矩阵、4×4 矩阵容差比较、光源 176 字节常量块、流缓冲区压实、BVH 构建、GOT .bss 单例虚调用。

**未用**当前 label 作证据；label 只在与证据比较时出现。

## 类族 → label 的归属依据（沿用仓库既有规则，避免自创）

- `uModel*/uEffect*/uLight*/uShadow*/uCamera*/uFog*/uFilter*/uGrass*/uWind*/uSky*/uParticle*/cParticleGenerator*/cEffectUnitGenerator/sMovie/uFullbodyIK*` → **render-gfx**（`batchA-classname-xref.md` 0x93f14c/0x92c3ec/0x9c06a0/0x958b4c/0xa58cbc 等行）。
- `uCns*/uConstraint*/uChain/uScrollCollisionSbc/cBVHCollision/cGridCollision` → **physics-math**（同表 0x9d0448/0x9de370/0x9ef104/0x9c4c98/0xa33aa0）。
- `uGUI*/cGUI*/cFestaGUIObj*/sGUI` → **ui**（同表 0x91d208/0xa3bfb8/0xa41240/0xa56b74）。
- `cAI*` → **monster-em**：仓库没有 ai 标签，先例是 `tierB2-slice-08` 把 0xa1709c（cAIPathTrace 一族）判为 monster-em。

## 每块结果

| block | sample | confirm | relabel | unknown | 现标签存活率 | relabel 去向 |
|---:|---:|---:|---:|---:|---:|---|
| 21 | 12 | 2 | 9 | 1 | 16.7% | physics-math 5, ui 2, kernel-os 2 |
| 22 | 12 | 3 | 6 | 3 | 25.0% | online-nex 2, filesystem 2, physics-math 1, ui 1 |
| 23 | 12 | 2 | 7 | 3 | 16.7% | render-gfx 6, physics-math 1 |
| 24 | 12 | 0 | 12 | 0 | 0% | render-gfx 10, ui 2 |
| 25 | 12 | 0 | 12 | 0 | 0% | render-gfx 9, physics-math 3 |
| 26 | 12 | 3 | 9 | 0 | 25.0% | physics-math 4, monster-em 4, online-nex 1 |
| 27 | 12 | 0 | 12 | 0 | 0% | ui 8, render-gfx 3, physics-math 1 |
| 合计 | 84 | 10 | 67 | 7 | **11.9%** | — |

结论：**这 7 个块不能按现标签整块提升**。抽样中 89% 的函数与现标签不符，而且不是零散错误，是**区段性错标**：

- **0x8a0–0x9e 这一段（block 24/25 主体）是"u"游戏层的模型/特效/光/阴影/后处理模块**（类名图谱：uFog、uFreeCamera、uFullbodyIKHuman2、uGrass2、uDemo*、uAmbientLight、uMetaSet、uActorModel、uMotionCamera、uMovie、uLightSpaceShadow、uReflectiveShadowMap、uSpotShadow、uCuboidShadowRegion、uSky、uSoftBody、uEffect、uProjectionEffect、cParticleGenerator*）。它们现在被打成 monster-em/player-pl/otomo-ot。
- **0x9c4–0x9e 是约束/IK 模块**（uCnsChain/uCnsIK/uCnsGroup/uCnsRotateLimit/uCnsMatrix/uConstraint），按仓库先例属 physics-math。
- **0x9f0–0xa2 是 AI**（cAI*PathTrace / cAI*PathFinding），按先例属 monster-em；**0xa3–0xa6 是 cGUI*/cFestaGUIObj***（ui）与 cEffectUnitGenerator/cParticleGenerator*（render-gfx）。
- **block 21 头段（0x79c–0x7a8）不是网络**：uUIBase/sUI/uUIQuestStartMenu 的方法簇 + MT 引擎核心（MtAllocator/MtExHeapAllocator/MtPropertyList）。0x7c4–0x7e 是 MtGeom/MtCollision 几何簇（physics-math）。
- **block 22 的 0x82–0x84 是 MtFile/MtStream（filesystem）与 MtNet（online-nex）**，不是 quest/monster-em。

## 例子（每块 3 条，均可在 TSV 找到）

**B21** — 现标签存活 2/12。

1. `0x7a0230`（online-nex→**ui**）：13 处 `bl 0x65cba0` + 12 处 `bl 0x65cbc4`，两者都在 uUIBase 类簇（0x65c754/0x65c870/0x65c90c/0x65c9d0）；`ubfx([this+4],8,8)` 后 5 路跳表，`[this+0x80]` 的 0x4000/0x2000 位选分支；全函数无网络调用、无字符串。
2. `0x7e07d0`（online-nex→**physics-math**）：`bl 0x7de840` 得 n·p+d 后写入法线、取反法线、+0x20 距离、+0x28 出入标志（`movwls`）——平面构造。
3. `0x7c8a28`（online-nex→**physics-math**）：把 {x,y,z,0}+w 压栈后调 0x7c8904；后者对 6 个平面（16 字节步长）做 dot(n,p)+d 与 -w 比较并返回包含标志。

**B22** — 存活 3/12。

1. `0x826c38`（quest→**filesystem**）：`[this+8]`=缓冲、`[this+12]`/`[this+16]`=读写游标、`[this+20]`=容量；把未读尾部整块搬到 0 再 `blx [r3,#52]` 通知；34 个调用者全是 XML/资源装载类，模块是 MtFile/MtStream。
2. `0x839248`（monster-em→**filesystem**）：装 MtCipherStream 类记录 vtable（→0x1787e50），再销毁 +0x3d0 处内嵌 MtStream（`bl 0x8394d0`）并释放 `[this+988]`。
3. `0x861d10`（online-nex，**confirm**）：首字节 10、或 192+168、或 172+(第二字节&0xF0)==16 才返回 1——私网/LAN 地址判别。

**B23** — 存活 2/12。

1. `0x8a2154`（online-nex→**physics-math**）：按 `[this+88]→[+116]` 的 32 字节表项与 `[this+96]` 数组索引，调 sCollision::SbcInfo 0xc1bb28（2 次）与 sCollision::TriangleInfo 0xc1c3b8。
2. `0x8c1900`（player-pl→**render-gfx**）：精确 vtable 类 uHazeFilter + 24 条 MtPropertyList 注册，导出 mpHazeSrc/mHazeScale/mNoiseTexScale/mDepthStart/mDepthEnd/mpVolumeNoiseTexture。
3. `0x890e20`（player-pl→**render-gfx**）：精确槽位类 uModelSymmetry，把 `[this+0xb0..0xb8]` 与全局 vec3 比较后调 0x8a8448（uCloud 基类 create）；全函数无玩家 id/状态结构。

**B24** — 存活 0/12。

1. `0x923b84`（monster-em→**render-gfx**）：先装 uLight（0x178b70c）再装 uAmbientLight（0x178b7cc）vtable，976 字节，字符串 `system\texture\DefaultCube_CM`。
2. `0x958028`（player-pl→**render-gfx**）：精确类 uMotionCamera，调 uCamera create 0x898744，17 条属性 mpParent/mTrackTarget/mZoom/mRoll/mpCameraList/mCut/mFrame。
3. `0x90b9b8`（otomo-ot→**render-gfx**）：4 次 `bl 0x7aedcc` 注册 uFullbodyIKHuman2 / ::Node / ::uCnsFBIKMatrix / ::uCnsUpVectorCalc（GOT 类记录 0x178ad18/0x178ad4c），并写 0x1815560 的 0..8 索引表。

**B25** — 存活 0/12。

1. `0x96179c`（player-pl→**render-gfx**）：精确类 uReflectiveShadowMap，24 条属性 mViewDistance/mMapSize/mpTargetLight/mLightColor/mIndirectLighting/mReductionRatio/mBlurSize。
2. `0x9bdc68`（monster-em→**render-gfx**）：64 个 callee 全在粒子模块（cParticleNode/cParticleNodeInfinite/cParticleGeneratorTexline/Line/LiteBillboard/LitePolyline），唯一调用者是 uEffect 方法。
3. `0x9964e8`（quest→**render-gfx**）：把光源对象 `[this+624]` 的取值写成 176 字节常量块：+0x30/+0x40/+0x50 三组 RGB，+0xb8/+0xbc 存 r²+1 与 -2r。

**B26** — 存活 3/12。

1. `0x9dd82c`（monster-em→**physics-math**）：构造先装 uConstraint::cConstraint（0x178e474）再装 uCnsMatrix（0x178dd20）vtable，并调 0x9f4e20（uCnsChain::cCnsChild）。
2. `0xa174e8`（otomo-ot→**monster-em**）：注册名串全属 AI trace 一族（cAIPathTrace/cAINavPathTrace/cAINavMultiPathTrace/cAIWayPathTrace/cAIWayGraphTrace/cAIFieldPathTrace），vtable 类 cAIPathTrace::TracePoint。
3. `0xa287f8`（monster-em，**confirm**）：精确类 cAITask，装 cAITask（0x178f234）与 cAITaskJobPrimList（0x178f294）vtable，调用者全是 cAIAStar/cAIGraph/cAIQuadTree 方法。

**B27** — 存活 0/12。

1. `0xa4d458`（player-pl→**ui**）：精确类 cFestaGUIObjPolygon，16 条属性 BlendState/ScissorSize/VertexColorLT/RT/LB/RB/Up/Down/Left/Right/VertexAlpha/VertexRGB——2D GUI 多边形。
2. `0xa2a614`（monster-em→**physics-math**）：按 `[this+2200]→[+4]` 计数分配 count×304 字节表，逐项调 cBVHCollision::cWorkBuildOnlineFast（带 file/line=179 断言）——碰撞 BVH 构建。
3. `0xa3d98c`（monster-em→**ui**）：精确类 cGUIInstMessage，9 次调用 sFestaGUI 簇（0xba2544/0xba28c4/0xba20d0）注册消息控件。

## 需要注意的坑（写进后续提升规则前请先看）

1. **0x7cc3e8 不是函数体**：2 条指令正好是「类记录 vtable slot0 的共享 `bx lr`」+「每类 destroy thunk `b 0x7af3c4`」（`attr-vtable.md` §2 的固定形状）。同形状的 slot0/thunk 行会被函数级分母重复计数，提纯度前要先剔除。
2. **共享基类 create 的类名会串**：0x93b1a8 被 retile 记成 uEm087_088_RubbleBase、0x8a8448 记成 uCloud，实际是多个类共用的基类 create（"last write wins"）。所以 0x94c130/0x890e20 的类名要以**自身**的精确槽位为准，不要用 callee 的类名。
3. **retile 槽位类名有边界误差**：0x91ce80 的槽位类 uGUISubtitles 与其体内字符串（Subtitles/MessageResourcePath/MessageInstanceId）一致，属真；但同距离目标在别的行会落到邻居类。凡 evidence 写 "exact" 的都核过体内是否真的安装/使用该类；0xa023fc 是唯一「vtable=cAINavMultiPathTrace，但体内属性名是 mWidthRev/mHeight」的冲突行，按 vtable+callee（cAIQuadTree）取 monster-em，并在此备注。
4. **uEffect/uShadow/uLight 区被 monster-em 大面积污染**：0x8ed000–0x9e0000 的 tiers 标签以 monster-em 为主（258+243 条），但类名图谱里这段没有任何 cEm*/uEm* 类（仅 0x930000 有 uEm087_088_RubbleBase）。这是传播泄漏，不是模块归属。
5. **cAI\* 归 monster-em 是仓库约定而非语义**；若以后新增 `ai` 标签，0xa023fc/0xa0f568/0xa174e8/0xa1c06c/0xa20a94/0xa24bdc/0xa287f8 这批要整体迁移。
6. 每块只抽 12 条，块内仍有非均匀（如 B21 的 0x7c8a28 属几何、0x7ca56c 是无信息 getter）。给出的是「块级不可提升」的结论与区段归属，不是对 3,287 个函数的逐条保证。
