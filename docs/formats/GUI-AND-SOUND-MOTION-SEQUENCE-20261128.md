# MHGU `rGUI` (`GUI\0`) 与 `rFestaSoundSequence` (`MSS\0`) 容器格式规范（2026-11-28）

本文基于 Monster Hunter Generations Ultimate（Switch v1.4.0，Build ID `FB08F1D20FD1204FE7070672777F869B`）的 `main.140.flat.bin` ARM32 反汇编与 RomFS `.arc` 容器实测整理，配套洁净室 MIT 解析/序列化工具为 [gui-mss.mjs](../../tools/mhgu/gui-mss.mjs) 与自测 [gui-mss.selftest.mjs](../../tools/mhgu/gui-mss.selftest.mjs)。

证据分级：`[C]` 一手机器码或全集实测；`[B]` 基于多样本归纳。

---

## 1. 类型哈希与引擎类对照 `[C]`

| 资源 Magic | 版本号 | `.arc` Type Hash | 引擎资源类名 | DTI 注册器 / 虚表 | 实例大小 | 加载入口 |
|---|---|---|---|---|---|---|
| `"GUI\0"` | `0x00022715` | `0x22948394` | `rGUI` | `0xb812d0` / `0x1794c9c` | `136 B` | `0xb7f380` (`load`), `0xb7f988` (`setup`), `0xb7f77c` (`unload`) |
| `"MSS\0"` | `0x20131015` | `0x10ebe843` | `rFestaSoundSequence` | `0x4d9ecc` / `0x1769690` | `112 B` | `0x4d9bec` (`load`), `0x4d9dbc`..`0x4d9e8c` (查询访问器) |

注：RomFS 中类型哈希 `0x535d969f` 实为 `"CTC\0"` 物理链文件（如 `enemy\em085\em085_00\mod\em085_00`，428 B），并非 `"MSS\0"`；实际 `"MSS\0"` 声音动作序列全部使用 `0x10ebe843`（共 244 条，覆盖玩家 `sound\call\pl\pl_wp00..14` 与怪物 `sound\call\em\emNNN`）`[C]`。

---

## 2. `rGUI`（`"GUI\0"`, `0x22948394`, v`0x00022715`）格式规范 `[C]`

RomFS 全集共 `85` 个 `rGUI` 文件，全部为 `v0x00022715`，且 `+0x08` 处 `fileSize` 与解压后总字节数严格相等。

### 2.1 头部布局（`0x00..0x130`，共 `304 B`）

- `+0x00`: `char[4]` magic `"GUI\0"`（`0x00495547`，`0xb7f3dc` 校验）
- `+0x04`: `u32` version `0x00022715`（`0xb7f3f4` 校验）
- `+0x08`: `u32` `fileSize`（文件总长）
- `+0x0c`: `u32` `flags0`（`0xb7f404` 存入 `this + 104`）
- `+0x10`: `u32` `timestamp`
- `+0x14`: `u32` `reserved14`
- `+0x18..+0x90`: 表项计数区（`u32`）：
  - `+0x28`: `sequenceCount`（序列数）
  - `+0x2c`: `seqItemCount`（序列项数，步长 `12 B`）
  - `+0x30`: `objectCount`（控件对象数，步长 `36 B`）
  - `+0x34`: `keyframeCount`（关键帧数，步长 `16 B`）
  - `+0x38`: `paramCount`（参数项数，步长 `20 B`）
  - `+0x3c`: `extParamCount`（扩展参数数，步长 `24 B`）
  - `+0x40`: `actionCount`（动作/变量键值项数，步长 `8 B`）
  - `+0x70`: `fontCount`（字体引用数，步长 `64 B`，`0xb7f7b8`）
  - `+0x74`: `messageCount`（消息表数，步长 `12 B`，`0xb7f814`）
  - `+0x78`: `childGuiCount`（子 GUI 引用数，`0xb7f8d4`）
  - `+0x7c`: `textureCount`（纹理表数，步长 `12 B`，`0xb7f850`）
  - `+0x80`: `iconCount`（图标表数，步长 `12 B`，`0xb7f88c`）
  - `+0x84`: `filterCount`（滤镜/样式表数，步长 `16 B`，`0xb7f8b0`）
- `+0x94`: `u32` `guiFlags`（`0xb7f9a8` 提取 bitfield 写入 `this + 108`）
- `+0x98`: `u32` `screenWidth`（如 `400` 或 `1280`，`0xb7f998` 存入 `this + 112`）
- `+0x9c`: `u32` `screenHeight`（如 `240` 或 `720`，`0xb7f9a0` 存入 `this + 116`）
- `+0xa0`: `u32` `rootIndex`（`0xb7fc30` 按步长 `20 B` 定位到 `+0xc0`）
- `+0xa4..+0x120`: 节区偏移表（`u32`，除 `+0x11c` 外由 `0xb7f9d8..0xb7fc6c` 按文件基址重定位）：
  - `+0xa4`: `sequencesOffset`（序列定义，步长 `24 B`）
  - `+0xa8`: `seqItemsOffset`（序列项，步长 `12 B`，`+8` 为字符串表偏移）
  - `+0xac`: `objectsOffset`（控件对象，步长 `36 B`：`+4 u8 paramCount`、`+16 nameOffset`、`+20 typeId`、`+24 paramIndex`、`+28 keyframeIndex`、`+32 i32 extOffset`）
  - `+0xb0`: `keyframesOffset`（关键帧，步长 `16 B`）
  - `+0xb4`: `paramsOffset`（对象参数，步长 `20 B`：`+8 u8 kind`、`+16 nameOffset`）
  - `+0xb8`: `extParamsOffset`（扩展参数，步长 `24 B`）
  - `+0xe8`: `fontsOffset`（字体表，步长 `64 B`）
  - `+0xec`: `messagesOffset`（消息表，步长 `12 B`）
  - `+0xf0`: `childGuisOffset`
  - `+0xf4`: `texturesOffset`（纹理表，步长 `12 B`）
  - `+0xf8`: `iconsOffset`（图标表，步长 `12 B`）
  - `+0xfc`: `filtersOffset`（滤镜表，步长 `16 B`）
  - `+0x104`: `stringTableOffset`（NUL 结尾字符串池基址）
  - `+0x108`: `actionsOffset`（动作/变量表，步长 `8 B`）
  - `+0x10c` / `+0x110` / `+0x114`: 曲线与浮点常量池偏移
  - `+0x118`: `stringPoolOffset`
  - `+0x11c`: `extraExtParamCount`（计数，`0xb7fc48` 乘 `24` 累加至 `+0xb8`）
  - `+0x120`: `eofOffset`（文件尾偏移，等于 `fileSize`）

---

## 3. `rFestaSoundSequence`（`"MSS\0"`, `0x10ebe843`, v`0x20131015`）格式规范 `[C]`

RomFS 全集共 `244` 个 `MSS\0` 文件，全部为 `v0x20131015`，记录间无对齐填充（紧凑字节流）。

### 3.1 文件头与全局索引表

1. **Header（`0x00..0x10`，`16 B`）**：
   - `+0x00`: `char[4]` magic `"MSS\0"`（`0x0053534d`，`0x4d9ca8` 校验）
   - `+0x04`: `u32` version `0x20131015`（`0x4d9cbc` 校验）
   - `+0x08`: `u16` `seqCount`（序列数，如 `w07` 为 `97`、`em001` 为 `184`）
   - `+0x0a`: `u16` `slotCount`（LMT 槽容量：玩家 `512`、怪物 `256`）
   - `+0x0c`: `u32` `reserved`（`0`）
2. **动作槽映射表（`0x10..0x410`，固定 `512 × u16 = 1024 B`）**：
   - 加载器 `0x4d9d0c..0x4d9d14` 固定以 `buf + 16` 为 LUT 基址、`buf + 1040`（`0x410`）为目录表基址（`0x4d9e0c` 上界检查 `< 512`）。
   - 每个 `u16` 将动作槽号映射到 `0..seqCount-1`（`0xffff` 为空槽）。
3. **序列目录（`0x410..0x410 + seqCount × 8`）**：
   - 每项 `8 B`：`{ u32 motionId, u32 seqOffset }`（`seqOffset` 相对文件起始，`0x4d9df0` 重定位）。

### 3.2 单条序列与帧/声音调用记录

由 `0x4d9dbc`、`0x4d9e20`、`0x4d9e40`、`0x4d9e68` 验证：
1. **序列头（`seqPtr`）**：
   - `+0x00`: `u32` `motionId`
   - `+0x04`: `u16` `frameGroupCount`
   - `+0x06`: `u16` `maxFrame`（动作最大帧数）
   - `+0x08`: `i32` `flags`（通常 `-1`）
   - `+0x0c`: `u32` `tailOffset`（指向帧表末尾哨兵 `0x0000ffff`，即 `0x10 + frameGroupCount * 8`）
   - `+0x10..`: `frameGroupCount` 项 `{ u32 frame, u32 groupRelOffset }`（相对 `seqPtr`）
2. **帧触发组（`groupPtr = seqPtr + groupRelOffset`）**：
   - `+0x00`: `u16` `frame`
   - `+0x02`: `u16` `callCount`
   - `+0x04..`: `callCount` 个 `u32 callRelOffset`（相对 `groupPtr`）
3. **声音调用记录（`callPtr = groupPtr + callRelOffset`）**：
   - `+0x00`: `u16` `soundId`（音效/调用指令 ID，如 `356..361`）
   - `+0x02`: `u8` `argCount`
   - `+0x03`: `u8` `callFlags`
   - `+0x04..`: `argCount` 个 `u32` 参数类型码 `args[]`，紧跟紧凑打包的参数载荷字节（玩家 `pl_wpNN` 实测码宽：`1→1B`, `2→1B`, `3→2B`, `6→2B`, `7→4B`, `11→4B`）。
