# MHGU `rCnsTinyChain` (`CTC\0`) 与 `rCollision` (`SBC\xff`) 容器格式规范（2026-11-28）

本文基于 Monster Hunter Generations Ultimate（Switch v1.4.0，Build ID `FB08F1D20FD1204FE7070672777F869B`）的 `main.140.flat.bin` ARM32 反汇编与 RomFS `.arc` 容器实测整理，配套洁净室 MIT 解析/序列化工具为 [ctc-sbc.mjs](../../tools/mhgu/ctc-sbc.mjs) 与自测 [ctc-sbc.selftest.mjs](../../tools/mhgu/ctc-sbc.selftest.mjs)。

证据分级：`[C]` 一手机器码或全集实测；`[B]` 基于多样本归纳。

---

## 1. 类型哈希与引擎类对照 `[C]`

| 资源 Magic | 版本号 | `.arc` Type Hash | 引擎资源类名 | DTI 注册器 / 虚表 | 加载入口 |
|---|---|---|---|---|---|
| `"CTC\0"` | `0x00000016` (`22`) | `0x535d969f` | `rCnsTinyChain` | `0xb7e0c4` / `0x1794b7c` | `0xb7deb0` (`load`), `0xb7e020` (`unload`) |
| `"SBC\xff"` | `0x781aca20`（低 2 位十进制容差 `0..99`） | `0x51fc779f` | `rCollision` | `0xb78da0` / `0x1794790` | `0xb6e014` (`load` -> `0xb6e058`), `0xb6e6b4` (`unload`) |

RomFS 全集分布 `[C]`：
- `CTC\0`（`0x535d969f`）：共 `941` 条（`player/` `822`、`otomo/` `115`、`enemy/` `4`），全部版本号为 `0x16`，且 `941 / 941` 严格满足总字节数 $= 60 + 80 \times \text{groupCount} + 96 \times \text{nodeCount}$。
- `SBC\xff`（`0x51fc779f`）：共 `92` 条（覆盖 `stage/`、`village/` 与 `enemy/` 碰撞体），全部版本号为 `0x781aca20`、`topType = 0`（`cBVHCollision`）、`groupType = 2`（`cGridCollision`），且 `92 / 92` 均包含 `BVHC` 与 `grco` 空间加速段。

---

## 2. `rCnsTinyChain`（`"CTC\0"`, `0x535d969f`, v`0x16`）格式规范 `[C]`

### 2.1 头部布局（`0x00..0x3c`，固定 `60 B`）

由 `0xb7dee8`..`0xb7df40` 验证（连续读取 `8 + 4 + 4 + 44 = 60 B`）：
- `+0x00`: `char[4]` magic `"CTC\0"`（`0x00435443`，`0xb7def4` 校验）
- `+0x04`: `u32` `version`（必须为 `0x16`，`0xb7df08` 校验）
- `+0x08`: `u32` `unk08`（读入 `this + 100`）
- `+0x0c`: `u32` `paramScale`（读入 `this + 104`，通常 `1000`）
- `+0x10`: `u32` `groupCount`（读入 `this + 116`，链组数量）
- `+0x14`: `u32` `nodeCount`（读入 `this + 120`，骨骼节点总数）
- `+0x18`: `u32` `flags18`
- `+0x1c`: `f32` `deltaTime`（步长时间基准，常见 `1/60 ≈ 0.01667`）
- `+0x20..+0x33`: `f32[5]` 头部物理系数
- `+0x34..+0x3b`: `u8[8]` 头部布尔开关位

### 2.2 物理链组记录（`groupCount × 80 B`，起始偏移 `0x3c`）

`0xb7df68..0xb7df90` 按 `r6 * 80`（`r6 + r6 * 4 << 4`）整段读取：
- `+0x00`: `u32` `chainNodeCount`（该链组包含的节点数）
- `+0x04`: `u32` `flags`
- `+0x08`: `i32` `collisionType`（常见 `-1`）
- `+0x0c`: `u32` `unk0c`、`+0x10`: `u32` `unk10`
- `+0x14..+0x1f`: `u32[3]` 填充保留字（常见 `0xcdcdcdcd`）
- `+0x20..+0x2f`: `f32[4]` `gravity`（重力矢量 `[x, y, z, w]`）
- `+0x30`: `f32` `damping`（阻尼）
- `+0x34`: `f32` `stiffness`（刚度/回复力）
- `+0x38`: `f32` `drag`（空气阻力）
- `+0x3c`: `f32` `mass`（质量系数）
- `+0x40`: `f32` `maxLimit`（极限约束）
- `+0x44`: `f32` `windScale`、`+0x48`: `f32` `windRandom`
- `+0x4c`: `u32` `pad4c`（常见 `0xcdcdcdcd`）

### 2.3 骨骼物理节点记录（`nodeCount × 96 B`，起始偏移 `0x3c + groupCount × 80`）

`0xb7dfb8..0xb7dfe0` 按 `r6 * 96`（`r6 + r6 * 2 << 5`）整段读取：
- `+0x00`: `u16` `boneId`、`+0x02`: `u16` `flags02`
- `+0x04..+0x07`: `u8[4]`（`colShape`, `limitShape`, `unk06`, `unk07`）
- `+0x08`: `f32` `radius`（胶囊碰撞半径）
- `+0x0c`: `u32` `pad0c`（常见 `0xcdcdcdcd`）
- `+0x10..+0x4f`: `f32[16]` 局部约束矩阵（4×4 行主序旋转+平移）
- `+0x50`: `f32` `angleLimit`（弧度角度限制，如 `π/2 ≈ 1.5708`）
- `+0x54`: `f32` `mass`、`+0x58`: `f32` `elasticity`
- `+0x5c`: `u32` `pad5c`（常见 `0xcdcdcdcd`）

---

## 3. `rCollision`（`"SBC\xff"`, `0x51fc779f`, v`0x781aca20`）格式规范 `[C]`

### 3.1 文件头（`0x00..0x54`，`84 B`）

由 `0xb6e084..0xb6e110` 验证（先读 `80 B` 再读 `4 B`）：
- `+0x00..+0x02`: `char[3]` magic `"SBC"`（`0xb6e0a4..0xb6e0c0` 校验前 3 字节；`+0x03` 实测为 `0xff`）
- `+0x04`: `u32` `version`（`0xb6e0d0..0xb6e0f8` 校验 `(version / 100) * 100 === 0x781aca20`）
- `+0x08`: `u32` `topType`（`< 2` 使用 `cBVHCollision`，`== 2` 使用 `cGridCollision`；实测均为 `0`）
- `+0x0c`: `u32` `groupType`（`< 2` 使用 `cBVHCollision`，`== 2` 使用 `cGridCollision`；实测均为 `2`）
- `+0x10`: `u16` `groupCount`（碰撞组数量）
- `+0x12`: `u16` `linkCount`（`32 B` 边/节点连接记录数，`0xb6e528`）
- `+0x14`: `u32` `adjCount`（`10 B` 面邻接记录数，`0xb6e560`）
- `+0x18`: `u32` `faceCount`（`32 B` 三角面记录数，`0xb6e4b8`）
- `+0x1c`: `u32` `vertexCount`（`16 B` `vec4` 顶点记录数，`0xb6e4f0`）
- `+0x20..+0x2f`: `u32[4]` 保留零字段
- `+0x30..+0x3f`: `f32[4]` 全局包围盒最小点 `bboxMin`（`[x, y, z, 0]`）
- `+0x40..+0x4f`: `f32[4]` 全局包围盒最大点 `bboxMax`（`[x, y, z, 0]`）
- `+0x50`: `u32` `allocHint`（空间网格/运行时内存提示值）

### 3.2 流式节区顺序（起始偏移 `0x54`）

1. **碰撞组表（`groupCount × 80 B`，`0xb6e134..0xb6e164`）**：
   - 每组 `80 B`：`+0x00` `bboxMin[4]`、`+0x10` `bboxMax[4]`、`+0x30 u16 subBoxCount`、`+0x38 u32 faceCount`、`+0x40 u32 adjCount`。
2. **组级空间子盒（`groupType == 2` 时每组 `subBoxCount × 28 B`，`0xb6e2c8..0xb6e350`）**：
   - 每项 `28 B`：`{ f32[3] min, u32 flags, f32[3] max }`。
3. **顶层 BVH（`topType < 2` 时为 `"BVHC"`，由 `0xc96e44` 读取）**：
   - `64 B` 头（magic `"BVHC"`、version `0x77b17b24`、`u32 mode` @`+0x08`、AABB、`u32 boxCount` @`+0x30`）+ `boxCount × (mode == 1 ? 112 : 80) B`。
4. **三角面表（`faceCount × 32 B`，`0xb6e4b8..0xb6e4ec`）**：
   - `+0x00..+0x0b`: `f32[3]` 法线；`+0x0c`: `u16 v0`、`+0x0e`: `u16 v1`、`+0x10`: `u16 v2`、`+0x12`: `u16 pad`；`+0x14..+0x1f`: `attr14`, `surfaceAttr`, `attr1c`（材质/地面属性位）。
5. **顶点表（`vertexCount × 16 B`，`0xb6e4f0..0xb6e524`）**：
   - `f32[4]` 空间坐标 `[x, y, z, w]`。
6. **辅助连接与面邻接表（`linkCount × 32 B` + `adjCount × 10 B`，`0xb6e528..0xb6e598`）**：
   - 邻接记录 `10 B`：`{ u16 faceIndex, i16[3] neighborEdges, u16 flags }`。
7. **空间网格索引段（`groupType == 2` 时每组 1 个 `"grco"`，由 `0xb6f3c4` 读取）**：
   - `46 B` 头（magic `"grco"`、version `0x77c09c94`、AABB `32 B`、`u16 gridX`、`u16 gridZ`、`u8 indexType`、`u8 hasFlatCells`）+ `gridX × gridZ × 8 B` 网格单元 + `u32 indexCount` + `indexCount × (indexType == 0 ? 4 : 2) B` 索引数组。
