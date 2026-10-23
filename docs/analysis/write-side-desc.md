# 写侧"描述符驱动"序列化解析（`0x3e0ea4` + `0xdaba4`）

> 日期 2026-10-23。flat = `.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin`（`flat_off = vaddr + 0x100`）。
> 本 worker 工具集只有 read/grep/glob/edit/write（**无 exec**），故反汇编由主会话转储到
> `.tmp/mhgu/analysis/wr-daba4.txt` / `wr-dac14.txt` / `wr-dadf0.txt` / `wr-dad24.txt` /
> `wr-3e0ea4.txt` / `wr-3e75f8.txt` / `wr-dac14-tail.txt`，
> 本文引用的每一条指令行都可在这 7 个文件里逐字复核 ⇒ **[已证实·转储]**。
> 存档/运行时语义类结论标 **[INFERENCE]**。

---

## 0. 结论摘要（先读这 6 条）

1. **`0xdaba4` 构造的不是"字段描述符"，而是 44 B（0x2C）的装备/道具记录对象**
   `{ vptr, u16 flags, u16, u16, 5×u16, 24B payload, u32 owned-ptr }`（§2）。
2. **`0x3e0ea4` 不是"每成员 staging 序列化器"，而是"每个猎人槽一次"的写入口**
   （`0x3e11a8` 的唯一调用点：拼 632 B 头 → 写进流 → `bl 0x3e75f8` 走全部成员）。整个函数体内
   **0 次 `0x3df378` / `0x3df2a8`**，与主会话观测一致（§4）。
3. **7 个 44 B 对象 = 文件 char_off `0x10C + 44k`（k=0..6）的 7 条装备记录**，
   运行时源地址 = `obj+0x18 + 44k`，用 `0xdadf0` 逐条 copy-assign 进去（§4.2）。
   它们**不含任何 `{type, obj_off, size}` 三元组**（§6）。
4. **632 B 头字段表首次完整解出**（§5）：名/时间/金币/HR/性别/槽号/224B 块/7×44 装备/
   12B+16B+20B+4B 尾块；**唯独 `0x270..0x273` 4 B 从不被写** = 栈残留（§5.3）。
5. **读侧把 632 B 头整个丢掉**：`0x3e0db8` 先 ctor 7 个 44 B 对象，再 `memcpy(sp+8, 流, 632)`
   **盖掉**它们，之后只把流指针 `+=632` 就进 `0x3e77b0`，栈缓冲再无读者（§7.1）。
   ⇒ 写侧与读侧在 632 B 头上**字段集不等价**（该读路径的字段集为空）。
6. **`0x3e75f8`（写调度器）= 17 `bl` + 1 尾跳 = 18 个 writer**，与读调度器 `0x3e77b0` 的前 18 项
   **同序一一配对**；读侧多 2 项（`0x521398` 成员#2 第二段、`0x2282a8` 读后处理）**无写对应**
   ⇒ 写侧是"读侧数据成员的真子集 + 完全同序"（配对表见 §10）。
   **由此定案**：**`0x14b0b0` = 装备箱 reader、`0x14b1c4` = 装备箱 writer**
   （`equip-box.md` / `save-load-path.md` §4 的读写标签互相写反了）。

---

## 1. 目标函数地址与边界

| 函数 | 地址 | 边界证据 |
|---|---|---|
| ctor | `0xdaba4..0xdac0c` | 末指令 `bx lr`；字面量池 `0xdac10` |
| clear/reset | `0xdac14..0xdad20` | `0xdac14` 起同构于 ctor（无 vptr 写）；`0xdad24` 已是 dtor |
| dtor | `0xdad24..0xdad5c` | `pop {r4,pc}`；字面量 `0xdad5c` |
| copy-assign | `0xdadf0..0xdae64` | `pop {r4,r5,r11,pc}`；`0xdae68` 起是另一函数（表查找 `ldr r0,[r1,r0,lsl#2]`） |
| 写入口 | `0x3e0ea4..0x3e10e4` | `add sp,#676; pop {r4..r11,pc}`；字面量池 `0x3e10e8..0x3e10f0` |

`0x3e0db8`（读）与 `0x3e0ea4`（写）**首尾相接**：`0x3e0e9c add sp,#644 / 0x3e0ea0 pop` → `0x3e0ea4 push`。

---

## 2. `0xdaba4` — 44 B 记录对象的构造函数（完整函数体）

```
000daba4: e59f1064  ldr r1,[pc,#100]   ; [0xdac10] = 0x175f1b8
000daba8: e79f1001  ldr r1,[pc,r1]     ; r1 = *(0xdabb0+0x175f1b8) = *(0x1839D68)
000dabac: e2811008  add r1,r1,#8
000dabb0: e5801000  str r1,[r0,#0]     ; +0x00 = vptr  (= *GOT + 8)
000dabb4: e3a01000  mov r1,#0
000dabb8: e5801028  str r1,[r0,#40]    ; +0x28 = 0   (owned ptr)
000dabbc: e1d020b4  ldrh r2,[r0,#4]
000dabc0: e1c010b6  strh r1,[r0,#6]    ; +0x06 = 0
000dabc4: e1c010b8  strh r1,[r0,#8]    ; +0x08 = 0
000dabc8: e2022902  and r2,r2,#32768   ; 0x8000
000dabcc: e1c020b4  strh r2,[r0,#4]    ; +0x04 &= 0x8000  ← 只保 bit15
000dabd0: e1c012b4  strh r1,[r0,#36]   ; +0x24 = 0
000dabd4: e1c012b2  strh r1,[r0,#34]   ; +0x22 = 0
000dabd8: e1c012b0  strh r1,[r0,#32]   ; +0x20
000dabdc: e1c011be  strh r1,[r0,#30]   ; +0x1E
000dabe0: e1c011bc  strh r1,[r0,#28]   ; +0x1C
000dabe4: e1c011ba  strh r1,[r0,#26]   ; +0x1A
000dabe8: e1c011b8  strh r1,[r0,#24]   ; +0x18
000dabec: e1c011b6  strh r1,[r0,#22]   ; +0x16
000dabf0: e1c011b4  strh r1,[r0,#20]   ; +0x14
000dabf4: e1c011b2  strh r1,[r0,#18]   ; +0x12
000dabf8: e1c011b0  strh r1,[r0,#16]   ; +0x10
000dabfc: e1c010be  strh r1,[r0,#14]   ; +0x0E
000dac00: e1c010bc  strh r1,[r0,#12]   ; +0x0C
000dac04: e1c010ba  strh r1,[r0,#10]   ; +0x0A
000dac08: e1c012b6  strh r1,[r0,#38]   ; +0x26
000dac0c: e12fff1e  bx lr
000dac10: 0175f1b8  (字面量：GOT 偏移)
```

### 2.1 结构体布局（size = 0x2C = 44）

```
struct Rec {            // 44 B，非虚基类，vtable = *(GOT)+8
  /*0x00*/ u32 vptr;           // ctor 与 dtor 写同一槽（=*(0x1839D68)+8，同类常量）；copy-assign 不碰
  /*0x04*/ u16 flags;          // bit15 粘滞(ctor/assign 都保留)；低 5 位 = 类型码(见 2.2)
  /*0x06*/ u16 f06;
  /*0x08*/ u16 f08;
  /*0x0A*/ u16 f0A;
  /*0x0C*/ u16 f0C;
  /*0x0E*/ u16 f0E;
  /*0x10*/ u8  payload[24];    // 0x10..0x27，整块 memcpy
  /*0x28*/ u32 owned;          // 堆子对象指针；ctor 置 0、dtor free、clear 清其内字段
};                             // 0x2C
```

**size=44 的两条独立证据**
- `0x3e0db8`（读）/`0x3e0ea4`（写）各连续 7 次 `bl 0xdaba4`，r0 分别为 `+268/312/356/400/444/488/532`
  （0x10C/0x138/0x164/0x190/0x1BC/0x1E8/0x214），**逐次 Δ = 44**。
- ctor 最高写点 `+0x28`（4 B，止于 `+0x2B`），下一个函数 `0xdac14` 紧跟 `0xdac0c bx lr` + 1 个字面量。

### 2.2 `+4` 低 5 位 = 类型码（独立证据）

`0xdaeb8`（紧跟 copy-assign 之后的小函数）：
```
000daeb8: e1d000b4  ldrh r0,[r0,#4]
000daec0: e200001f  and r0,r0,#31        ; r0 = flags & 0x1F  ← 类型码
000daec4: e2401017  sub r1,r0,#23
000daecc: e3510002  cmp r1,#2
000daed4: 33001001  movwcc r1,#0x1       ; 类型 23..24 → r1=1
000daed8: e3500005  cmp r0,#5            ; (r0 = 类型-1)
000daedc: 33002001  movwcc r2,#0x1       ; 类型 1..6 → r2=1
```
⇒ `+4 & 0x1F` 是 1..6 / 23..24 的**分类码**（护石/装备类别同型分类器），不是偏移或长度。
[INFERENCE] 7 条记录 = 武器+5 防具+护石，类型码区分部位；未在本任务范围内证实到字段名。

紧随 `0xdadf0` 之后还有 4 个**只做查表**的极小函数（`0xdae68/0xdae7c/0xdae90/0xdaea4`），
形态完全一致：
```
000dae68: e59f1008  ldr r1,[pc,#8]        ; [0xdae78] = 0x14c4eb4（另三处 0x14c4f04/0x14c4f14/0x14c4f1c）
000dae6c: e08f1001  add r1,pc,r1          ; r1 = 表基址（pc 相对）
000dae70: e7910100  ldr r0,[r1,r0,lsl #2] ; return table[arg]
000dae74: e12fff1e  bx lr
```
⇒ 这 4 张表（`0x14c4eb4 / 0x14c4f04 / 0x14c4f14 / 0x14c4f1c`，rodata）是该类的 **type/索引 → 值**
映射，与"`+4` 低 5 位是类型码"互相印证。

---

## 3. 其余三个成员函数：谁是"读字段/写字段"

### 3.1 `0xdadf0` = **copy-assign（src → dst）**，不是读字段/写字段原语

```
000dadf0: e92d4830  push {r4,r5,r11,lr}
000dadf4: e1d120b4  ldrh r2,[r1,#4]        ; src.flags
000dadf8: e1d030b4  ldrh r3,[r0,#4]        ; dst.flags
000dadfc: e281c010  add r12,r1,#16         ; r12 = src+0x10
000dae00: e7c43012  bfi r3,r2,#0,#5        ; ← arm32.mjs 误译为 "strb r3,[r4,r2,lsl r0]"
000dae04: e1c030b4  strh r3,[r0,#4]
000dae08: e1d120b6  ldrh r2,[r1,#6]   / 000dae0c strh r2,[r0,#6]
000dae10: e1d120b8  ldrh r2,[r1,#8]   / 000dae14 strh r2,[r0,#8]
000dae18: e1d120b4  ldrh r2,[r1,#4]
000dae1c: e1a022a2  mov r2,r2,lsl #5       ; 为下一条 bfi 取 src[9:5]
000dae20: e7c93292  bfi r3,r2,#5,#5        ; ← 同样被误译
000dae24: e30823ff  movw r2,#0x83ff
000dae28: e1c030b4  strh r3,[r0,#4]
000dae2c: e0032002  and r2,r3,r2           ; 保留 dst 的 bit15 + bit9..0
000dae30: e1d130b4  ldrh r3,[r1,#4]
000dae34: e2033b1f  and r3,r3,#31744       ; 0x7C00
000dae38: e1822003  orr r2,r2,r3
000dae3c: e1c020b4  strh r2,[r0,#4]        ; +4 = (src & 0x7FFF) | (dst & 0x8000)
000dae40: e1d120ba  ldrh r2,[r1,#10] / 44  strh r2,[r0,#10]
000dae48: e1d120bc  ldrh r2,[r1,#12] / 4c  strh r2,[r0,#12]
000dae50: e1d120be  ldrh r2,[r1,#14] / 54  strh r2,[r0,#14]
000dae58: e2800010  add r0,r0,#16
000dae5c: e89c403e  ldmia r12,{r1,r2,r3,r4,r5,lr}   ; 24 B ← src+0x10
000dae60: e880403e  stmia r0,{r1,r2,r3,r4,r5,lr}    ; → dst+0x10..0x27
000dae64: e8bd8830  pop {r4,r5,r11,pc}
```
**签名**：`Rec* assign(Rec* dst /*r0*/, const Rec* src /*r1*/)` —— **没有 size 参数**（覆盖范围由固定
偏移决定：`+4、+6、+8、+0x0A、+0x0C、+0x0E、+0x10..+0x27`），返回值未使用。
**语义**：`dst->assign(src)` 复制 `+4`(除 bit15)、`+6`、`+8`、`+0x0A`、`+0x0C`、`+0x0E`、`+0x10..+0x27`。
**不复制 `+0x00`(vptr) 与 `+0x28`(owned)**；`+4` 的 bit15 归 dst 所有（ctor 也保留 bit15）。
⇒ 它既不是"读字段"也不是"写字段"，是 **C++ 拷贝赋值**；本任务书里"确认哪个是 read字段/write字段"
的答案是：**两者都不是**——字段级读/写原语是 `0x3df2a8`/`0x3df378`，而它们在 `0x3e0ea4` 内 **0 次出现**。

### 3.2 `0xdad24` = **析构**（改写 vptr + free owned）

```
000dad24: e92d4010  push {r4,lr}
000dad28: e1a04000  mov r4,r0
000dad2c: e59f0028  ldr r0,[pc,#40]   ; [0xdad5c] = 0x175f030
000dad30: e79f0000  ldr r0,[pc,r0]    ; = *(0x1839D68)  ← 与 ctor **同一个槽**
000dad34: e2800008  add r0,r0,#8
000dad38: e5840000  str r0,[r4,#0]    ; vptr ← 同类常量（两处字面量 0x175f030/0x175f1b8
                                      ;   之差 0x188 恰等于两处 PC 之差 0xdad38-0xdabb0 ⇒ 同槽）
000dad3c: e5940028  ldr r0,[r4,#40]
000dad40: e3500000  cmp r0,#0
000dad44: 0a000002  beq 0xdad54
000dad48: eb1b51a5  bl 0x7af3e4      ; free / operator delete
000dad4c: e3a00000  mov r0,#0 / 50 str r0,[r4,#40]
000dad54: e1a00004  mov r0,r4
000dad58: e8bd8010  pop {r4,pc}
```
（`0xdad60` 起是**另一**个析构变体：同样 free `+0x28`，末尾还 `bx` 一个虚函数——`+52` 槽，属派生类。）

**签名**：`Rec* dtor(Rec* this /*r0*/)`；返回 `this`（`0xdad54 mov r0,r4`），**无 size/无第二参数**。
`free` 的目标只可能是 `+0x28`（唯一的堆指针字段，ctor 置 0、clear 只清内容不释放）。

### 3.3 `0xdac14` = **clear（保留 vptr / owned 指针，清字段 + 清 owned 指向的子对象）**

```
000dac14: e1d020b4  ldrh r2,[r0,#4]
000dac18: e3a01000  mov r1,#0
000dac1c: e1c010b6  strh r1,[r0,#6]      ← 与 ctor 完全同构（但**不写** +0x00 vptr、**不写** +0x28=0）
...                                      （+8,+0x0A..+0x26 全 0）
000dac68: e5902028  ldr r2,[r0,#40]      ; owned
000dac6c: e3520000  cmp r2,#0
000dac70: 012fff1e  bxeq lr
000dac74: e1c210b0  strh r1,[r2,#0]      ; owned+0x00 = 0 (u16)
000dac78/7c         strb r1,[r2,#2]
000dac80/84         strh r1,[r2,#4]
000dac88/8c         strb r1,[r2,#6]
000dac90/94         strh r1,[r2,#8]
000dac98/9c         strb r1,[r2,#10]
000daca0/a4         strh r1,[r2,#12]
000daca8/ac         strb r1,[r2,#14]
000dacb0/b4         strh r1,[r2,#16]
000dacb8/bc         strb r1,[r2,#18]
000dacc0/c4         strh r1,[r2,#20]
000dacc8/cc         strb r1,[r2,#22]
000dacd0/d4         strh r1,[r2,#24]
000dacd8/dc         strb r1,[r2,#26]
000dace0/e4         strh r1,[r2,#28]
000dace8/ec         strb r1,[r2,#30]
000dacf0/f4         strh r1,[r2,#32]
000dacf8/fc         strb r1,[r2,#34]
000dad00/04         strh r1,[r2,#36]
000dad08/0c         strb r1,[r2,#38]
000dad10/14         strh r1,[r2,#40]
000dad18/1c         strb r1,[r2,#42]
000dad20: e12fff1e  bx lr
```
⇒ `owned` 子对象**也是 44 B**，被清零的字节构成 **11 组 × 4 B** 的规律：
组内 `u16`（字节 0,1）+ `u8`（字节 2）清零，**字节 3 从不清**：
`+0/+2, +4/+6, +8/+0xA, +0xC/+0xE, +0x10/+0x12, +0x14/+0x16, +0x18/+0x1A, +0x1C/+0x1E,
+0x20/+0x22, +0x24/+0x26, +0x28/+0x2A`（末组 u16@+0x28、u8@+0x2A）。
⇒ [INFERENCE] `owned` = 11 条 `{u16 id; u8 flag; u8 保留}` 的定长数组（11×4=44），与主对象同尺寸不是巧合。

---

## 4. `0x3e0ea4` — 每槽一次的写入口（完整追踪）

```
003e0ea4: e92d4ff0  push {r4..r11,lr}
003e0ea8: e24ddfa9  sub sp,sp,#676
003e0eac: e28d7028  add r7,sp,#40          ; r7 = staging 基址（632 B 头）
003e0eb0: e58d2014  str r2,[sp,#20]        ; 保存参数 r2（→ 头 +0x2B）
003e0eb4: e58d1008  str r1,[sp,#8]         ; 保存 writer ctx
003e0eb8: e2874f43  add r4,r7,#268         ; 0x10C
003e0ec0: ebf3e737  bl 0xdaba4             ; rec[0] ctor
003e0ec4: e2875f4e  add r5,r7,#312         ; 0x138  → rec[1] ctor
003e0ed0: e2876f59  add r6,r7,#356         ; 0x164  → rec[2]
003e0edc: e2878e19  add r8,r7,#400         ; 0x190  → rec[3]
003e0ee8: e2870f6f  add r0,r7,#444         ; 0x1BC  → rec[4]（指针存 [sp,#16]）
003e0ef4: e2870f7a  add r0,r7,#488         ; 0x1E8  → rec[5]（[sp,#12]）
003e0f00: e2870f85  add r0,r7,#532         ; 0x214  → rec[6]（r11）
003e0f0c: ldr r0,[pc,#468] ; [0x3e10e8]=0x1457e68
003e0f10: ldr r0,[pc,r0] ; 003e0f14 ldr r0,[r0,#0]
003e0f18: ebfa52c4  bl 0x275a30           ; 取成员单例 → r9 = obj
003e0f20: movw r0,#0x514 ; 003e0f24 mov r2,#32 ; 003e0f28 add r1,r9,r0
003e0f2c: mov r0,r7
003e0f30: eb403bbe  bl 0x13efe30         ; memcpy(staging+0x000, obj+0x514, 32)   ← 猎人名
003e0f3c: e19900b0  ldrh r0,[r9,#176]     ; obj+0xB0
003e0f40: e1cd05b0  strh r0,[sp,#80]      ; staging+0x028
003e0f44: ldr r0,[pc,#416] ; [0x3e10ec]=0x1457c64
003e0f48/4c/50: ldr r0,[pc,r0]; ldr r0,[r0,#0]; ldr r0,[r0,#52]
003e0f54: e58d0048  str r0,[sp,#72]       ; staging+0x020 = *(*(0x18389B4))+0x34
003e0f58: e3a00002  mov r0,#2
003e0f5c: e5fa14d4  ldrb r1,[r10,#1236]   ; obj+0x4D4
003e0f60: cmp r1,#15 ; beq → 保持 2
003e0f68: e5d904d8  ldrb r0,[r9,#1240]    ; obj+0x4D8
003e0f70: 13000001  movwne r0,#0x1
003e0f74: e5cd0052  strb r0,[sp,#82]      ; staging+0x02A = 性别/初始化标志
003e0f78: ldr r0,[pc,#368] ; [0x3e10f0]=0x1457dfc
003e0f7c: e2891d09  add r1,r9,#576        ; obj+0x240
003e0f80: e3a020e0  mov r2,#224
003e0f84/88/8c: ... ldr r0,[r0,#36]
003e0f90: e58d004c  str r0,[sp,#76]       ; staging+0x024 = *(*(0x1838F88))+0x24
003e0f94: e28d0028  add r0,sp,#40 ; 003e0f98 add r0,r0,#44
003e0f9c: eb403b8b  bl 0x13efdd0          ; memcpy(staging+0x02C, obj+0x240, 224)
003e0fa0..3e0fac: rec[0] ← 0xdadf0(dst=r4, src=obj+0x18)   ; add r1,r9,#24
003e0fb0..3e0fbc: rec[1] ← obj+0x44
003e0fc0..3e0fcc: rec[2] ← obj+0x70
003e0fd0..3e0fdc: rec[3] ← obj+0x9C
003e0fe4..3e0fec: rec[4] ← obj+0xC8
003e0ff4..3e0ffc: rec[5] ← obj+0xF4
003e1000..3e1008: rec[6] ← obj+0x120
003e100c: e89a0007  ldmia r10,{r0,r1,r2}      ; obj+0x00..0x0B (12 B)
003e1010: e28d3f9a  add r3,sp,#616            ; staging+0x240
003e1018: e8830007  stmia r3,{r0,r1,r2}
003e101c: e2890e4e  add r0,r9,#1248           ; obj+0x4E0
003e1020: e28c1f93  add r1,r12,#588           ; staging+0x24C
003e1024: e8b0006c  ldmia r0!,{r2,r3,r5,r6}   ; 16 B
003e1028: e8a1006c  stmia r1!,{r2,r3,r5,r6}
003e102c: e890007c  ldmia r0,{r2,r3,r4,r5,r6} ; 20 B ← obj+0x4F0
003e1030: e881007c  stmia r1,{r2,r3,r4,r5,r6} ; → staging+0x25C
003e1034: e3a01e27  mov r1,#624               ; ← 死值（624 = 缺口位置，见 §5.3）
003e103c: e5990508  ldr r0,[r9,#1288]         ; obj+0x508
003e1040: e58d029c  str r0,[sp,#668]          ; staging+0x274
003e1044: e59d0014  ldr r0,[sp,#20]
003e1048: e5cd0053  strb r0,[sp,#83]          ; staging+0x02B = 参数 r2
003e104c: e3000506  movw r0,#0x506            ; ← 死值
003e1050: e19900b0  ldrh r0,[r9,#176]         ; obj+0xB0
003e1054: e18c00b1  strh r0,[r12,#177]        ; staging+0x0B1（覆盖 224B 块内 2 字节）
003e1058: e59d1008  ldr r1,[sp,#8]            ; ctx
003e105c: e5910004  ldr r0,[r1,#4]            ; ctx+4 = 位下标
003e1064: cmp r0,#0 ; 若 ≠0：ctx+4=0, ctx+8 += 1  ⇒ **字节对齐**
003e1088: e28d1028  add r1,sp,#40
003e108c: e3a02f9e  mov r2,#632
003e1090: eb403b66  bl 0x13efe30             ; memcpy(ctx+8, staging, 632)
003e1094..a0: ctx+8 += 632
003e10a4: eb001953  bl 0x3e75f8               ; 成员序列化调度器（18 个 writer）
003e10a8..3e10dc: 7 × bl 0xdad24（逆序析构）
003e10e0: add sp,#676 ; 003e10e4 pop {r4..r11,pc}
```

### 4.1 调用约定

`0x3e0ea4(this, ctx, u8 flag)`：`this` = 存档管理器（`this+0x28` = 缓冲区），`ctx` = 写游标
`{+0 vptr, +4 bit, +8 ptr, +12 base, +16 ?, +20 size}`，`flag` 写进头 `+0x2B`。
唯一观测到的调用点 `0x3e11a8`（拼 ctx 后 `mov r2,#1`）：`ctx+20 = 0x4EB898`（整块 payload 尺寸），
`ctx+8 = base + *(base + slot*4 + 0x10)`（每槽偏移表），随后 `bl 0x3e0ea4`。

### 4.2 描述符数组布局（回答验收项 3）

| 项 | 值 | 证据 |
|---|---|---|
| 元素大小 | **44 B (0x2C)** | 7 次 ctor 的 r0 = 0x10C/0x138/…/0x214，Δ=44 |
| 数量 | **7** | 7 次 `bl 0xdaba4` + 7 次 `bl 0xdadf0` + 7 次 `bl 0xdad24` |
| 栈上位置 | `staging+0x10C + 44k`（staging = `sp+40`） | 上面两行同址 |
| 运行时源 | `obj+0x18 + 44k`（k=0..6） | `add r1,r9,#24/68/112/156/200/244/288` |
| 落盘位置 | char_off `0x10C + 44k` | staging 就是 632 B 头（`memcpy(ctx+8, staging, 632)`） |

**注意**：这与任务书假设不同——**它们不是"每字段一条的 {type,obj_off,size} 描述符"，而是 7 条装备记录数据。**

---

## 5. 632 B 角色头字段表（新；写侧唯一来源）

| char_off | 长度 | 写入源 | 证据（vaddr） | 语义 |
|---|---|---|---|---|
| `0x000` | 32 | memcpy ← `obj+0x514` | 3e0f20/3e0f28/3e0f30 | 猎人名（UTF-8） |
| `0x020` | 4 | `*(*(0x18389B4))+0x34`（字面量 0x1457c64） | 3e0f44-3e0f54 | 游玩时间（秒）[INFERENCE，与编辑器 0x020 一致] |
| `0x024` | 4 | `*(*(0x1838F88))+0x24`（字面量 0x1457dfc） | 3e0f78-3e0f90 | 金币 [INFERENCE，与编辑器 0x024 一致] |
| `0x028` | 2 | `obj+0xB0` (u16) | 3e0f3c/3e0f40 | **HR**（编辑器读 `M[40]\|M[41]<<8` 吻合） |
| `0x02A` | 1 | `obj+0x4D4==15 ? 2 : (obj+0x4D8 ? 1 : 0)` | 3e0f58-3e0f74 | **性别**（编辑器 0/1/≥2=未初始化，完全吻合） |
| `0x02B` | 1 | 参数 r2（`0x3e11a8` 传 1） | 3e1044-3e1048 | 槽号/存档种类（UNCONFIRMED） |
| `0x02C` | 224 | memcpy ← `obj+0x240` | 3e0f7c-3e0f9c | **不透明块**（0x02C..0x10B；编辑器从不触碰） |
| `0x0B1` | 2 | `obj+0xB0` (u16) | 3e1050/3e1054 | **HR 第二副本**（覆盖上面 224 B 块内 2 字节） |
| `0x10C..0x23F` | 308 | 7×44 装备记录（§4.2） | 3e0fa0-3e1008 | 已装备 7 件快照 [INFERENCE] |
| `0x240..0x24B` | 12 | `obj+0x00..0x0B` | 3e100c-3e1018 | 外观头：`0x241..0x248` 6 个 feature（声/目/内/发/脸/纹）全在此 |
| `0x24C..0x25B` | 16 | `obj+0x4E0` | 3e101c-3e1028 | 4×u32 |
| `0x25C..0x26F` | 20 | `obj+0x4F0` | 3e102c-3e1030 | 5×u32；**`0x260..0x26F` 的 4×RGBA 配色在此** |
| `0x270` | 4 | **无写入** | 见 §5.3 | 未初始化（栈残留） |
| `0x274` | 4 | `obj+0x508` | 3e103c/3e1040 | u32 |

> 该表与 `editor-map/other-main.md §2.2` 的编辑器覆盖区逐一互补：编辑器从不碰的
> `0x02B..0x10B / 0x240 / 0x244..0x245 / 0x249..0x25F / 0x270..0x277` 现在全部有了来源。
> 注意**外观/配色不在 224 B 块里**，而在 `0x240..0x277` 的尾块（`0x241..0x248` feature、
> `0x260..0x26F` RGBA）：`0x241-0x240=1` ⇒ 从 `obj+0x01` 起；`0x260-0x25C=4` ⇒ 从 `obj+0x4F4` 起。

### 5.1 `+4` 合并语义之外的一个细节：`0x0B1` 与 `0x028` 同源

同一 `obj+0xB0` 被写两次 ⇒ **HR 在头里有 2 个副本**（0x028 与 0x0B1），且第二次写发生在
224 B memcpy **之后**，说明它是覆盖式修正（candidate：0x0B1 是"HR 显示值"的第二处）。

### 5.2 死立即数

`0x3e0f34 movw r0,#0x554`、`0x3e1034 mov r1,#624`、`0x3e104c movw r0,#0x506` 三条的写入目标
立刻被后续指令覆盖 ⇒ 编译器遗留（`624` 恰等于 §5.3 的缺口偏移，疑为被删掉的一次 memcpy 参数）。

### 5.3 `0x270..0x273` 4 字节从不写入

已写区间：`0x240+12 → 0x24C`、`0x24C+16 → 0x25C`、`0x25C+20 → 0x270`、`0x274+4 → 0x278`。
`0x270..0x273` 在 `memcpy(staging,632)` 前没有任何 store ⇒ **写进存档的是栈上残留**。
本函数是 `sub sp,#676` 的叶子栈帧（staging = sp+40，占 632 B 到 sp+672），无前置清零。
⇒ 同一存档重复保存时这 4 B 可能变化；读侧又完全忽略它（§7.1）。可安全置 0。

---

## 6. 验收项 4：描述符里有没有 `{type, obj_off, size}` 三元组？——没有

三条否证：

1. **结构上**：`0x3e0ea4` 内 7 个对象只被 `0xdadf0` 从 `obj+0x18+44k` **整块赋值**，没有任何
   "按对象里的 type/off/size 去读/写别处"的间址指令；对象本身 44 B 全是数据字段（§2）。
2. **语义上**：`+4 & 0x1F` 是**分类码**（§2.2 的 `0xdaeb8` 分类器），不是"类型字段的 type"；
   没有任何字段承载 `obj_off` 或 `size`（ctor 只清 0、assign 只按固定偏移逐字复制）。
3. **对照读侧**：member#4 的 `obj+0x424 size=4` 这类三元组在写侧的表现形式是**指令流里的常量**
   （`movw r0,#0x424; mov r2,#4; bl 0x3df378`），不是数据表；member#3 的 2000×36/1000×36/5440/1632
   也是写函数 `0x14b1c4` 里的 4 条硬编码块（见 `equip-box.md` §1.1/§1.3 + §11 更正 #1）。
   **写侧不存在任何"通用描述符表"驱动层**，只有"每成员一个手写 writer"。

⇒ 主会话原先的"描述符驱动"模型应更正为：**头 7×44 B = 装备记录快照**；成员序列化 = 18 个手写 writer。

---

## 7. 验收项 5：写侧与读侧字段集等价性

### 7.1 632 B 头：**不等价（读侧字段集为空）**

`0x3e0db8`（读，59 条指令）：
```
003e0db8: push {r4..r11,lr} ; 003e0dbc sub sp,#644
003e0dc0: add r4,sp,#8 ; r7 = r1(ctx)
003e0dc8..3e0e18: 7 × bl 0xdaba4  @ r4+268/312/356/400/444/488/532
003e0e1c: ldr r0,[r7,#4] ; cmp #0        ; ctx+4 位下标
003e0e28: str 0,[r7,#4] ; r8 = [r7,#8]+1 ; …  ; ⇒ 字节对齐
003e0e44: mov r0,sp+8 ; r1=r8 ; r2=#632 ; bl 0x13efe30   ; memcpy(sp+8, 流, 632)  ← 盖掉上面 7 个对象
003e0e54: r0 = r8+632 ; str [r7,#8] ; r1 = r7 ; bl 0x3e77b0 ; 成员反序列化调度
003e0e64..3e0e98: 7 × bl 0xdad24（逆序析构）
003e0e9c/a0: add sp,#644 ; pop
```
- 632 B 拷进的 `sp+8` 缓冲**不传给任何人**（`0x3e77b0` 的 r0 是"流指针"、r1 是 ctx），
  之后只被 7 个 dtor 触及 ⇒ **这条读路径不把 632 B 解析进任何对象**。
  （是否存在别处**直接读 payload 缓冲**的消费者未排除——例如 UI 的猎人名取自副本 B `0x23B7D`，
  而 `save-load-path.md §9.7` 也记录了"头字段回填路径未定位"。本结论只限 `0x3e0db8` 这条链。）
- 结论：**`0x3e0db8` 这条读路径对该头的字段集 = ∅**；写侧却**逐字段从运行时对象/管理器重算**整块 632 B。
  ⇒ 手改存档里的头（名字/HR/金币/性别/外观…）**在下次游戏保存时会被全部覆盖**；
  同理"编辑器改头 → 游戏读档"不会改变运行时对象（`save-load-path.md §9.7` 的谜团在此闭合）。

### 7.2 7×44 装备记录：读侧同样丢弃，写侧从 `obj+0x18+44k` 重建

读侧 7 个对象在 `memcpy` 前构造、在 `memcpy` 后被 dtor，**没有任何 `0xdadf0(src=栈)` 把它搬进 obj**。
⇒ 存档里这 308 B 也是"只写数据"。[INFERENCE] 运行时装备来自成员#3 装备箱（`0x14b0b0`/`0x14b1c4`）。

### 7.3 成员体（18 个数据成员）：**同序配对**已证，逐字节等价需逐对核对

`0x3e75f8`（写）与 `0x3e77b0`（读）是**同构双胞胎**：都是
`ldr r0,[pc,#..]（GOT 槽）→ ldr r0,[pc,r0] → ldr r0,[r0,#0]（成员对象）→ r1=ctx → bl <代码地址>`
的机械序列，r4 保存 ctx 全程不变。

- **18 项同序配对**（完整表见 §10）。两张表的**字面量池位置不同**（读 `0x3e7938..0x3e7980`、
  写 `0x3e7768..0x3e77ac`），且两表的字面量**无一相同**（读 `0x1453058/0x1453050/0x145159c/
  0x1451b94/0x14513a0/…`；写 `0x1453210/0x1453208/0x1451754/0x1451d4c/0x1451558/…`）。
  这些字面量是 `pc` 相对偏移（`ldr r0,[pc,r0]` ⇒ 槽地址 ≈ 指令 PC + 该值，落在 `0x183xxxx`
  一带），最终 `ldr r0,[r0,#0]` 取成员单例 ⇒ **配对关系由调用顺序 + 成员编号确定**。
- 读侧比写侧多 2 项：`0x521398`（成员#2 第二段 reader，`0x3e791c` 用 `ldr r0,[r5,#0]` 取同一对象）
  与尾跳 `0x2282a8`（读后处理，只用 GOT 全局）。写调度器 `0x3e775c` 的尾跳是 `0x55d45c`
  = 成员#17 的 writer，**之后 `pop` 直接返回**。
- ⇒ **写侧字段集 ⊂ 读侧字段集**（就"覆盖的成员"而言是真子集），但**字节级等价**要逐对比较
  writer/reader 的 `0x3df378` / `0x3df2a8` 站点。已知样例：
  - member#3 装备箱：`0x14b0b0`(读) 与 `0x14b1c4`(写) 顺序/尺寸完全一致
    （2000×36 / 1000×36 / 0x1540 / 0x660），仅原语 `0x3df2a8 ↔ 0x3df378` 互换
    （`equip-box.md` §1.1 的代码站点表 + §10 的调度器配对双重证据）。
  - member#5：`save-load-path.md §9.1` 记 "序列化侧（`0x198120`）逐项一致（94×32bit、3×136、
    同样循环）"。
- **与"每字节可修改"的关系**：写侧**没有**"未识别字段直通/保留"机制——凡是 writer 里没有
  `0x3df378` 的字节，都不会被这次保存刷新，**保留缓冲区里的旧值**（原因见 §10.3：
  写缓冲 = 上一份存档的内存副本，原地覆盖）。因此可修改性判定必须逐成员按 writer 的
  `0x3df378` 站点清单来，**不能靠一张全局描述符表**。

---

## 8. 可验证预测（给有 exec 的 worker）

1. **7×44 记录的第 1 个字 = 泄漏的类常量**：写侧 `+0x00` 只由 ctor/dtor 写（`*(0x1839D68)+8`），
   `0xdadf0` 不复制它 ⇒ 存档 `0x10C/0x138/…/0x214` 处 7 个 dword 必然**全同**。
   **数值自洽性检查**：`save-load-path.md:117` 记的实测值 `0x0193A514` 落在**镜像之外**
   （flat.bin 覆盖 `0..≈0x184BF00`），而 `0x0183A514` 才在镜像内、且距本类槽 `0x1839D68` 仅
   `0x3AC` —— 疑为原记录的**转写错误（93↔83）**。一条命令定案：
   `a.rd32(0x1839D68)+8` 得到的值应等于存档里那 7 个 dword 之一。
2. **每条记录的 `+0x28..+0x2B` 必为 0**：ctor 置 0、assign 不复制、无其它写点。
3. **`0x270..0x273` 是垃圾**：对同一存档连续保存两次，这 4 B 可能不同。
4. **读侧不消费头**：把存档 `0x000..0x277` 全部填 0xAA，游戏载入应无异常（且下次保存恢复原值）。
   （高风险实验，先在副本上做。）

---

## 9. 未知 / 待补

1. ~~`0x3e75f8` 指令清单~~ **已取**（`wr-3e75f8.txt`），18 项配对见 §10；剩余：18 个 writer 的
   `0x3df378` 站点逐一清点（工作量 = 18 次 `reader-fields` 扫描，本工单不含）。
2. ~~`0xdac14` 尾部~~ **已取**（`wr-dac14-tail.txt`）：`owned` 子对象 44 B 全清（§3.3）。
3. `0x275a30` 返回的 `obj` 具体是哪个单例（`0x3e0f0c` 的槽 = `0x3e0f18+0x1457e68` = **0x1838D80**）
   未定名；其 `+0xB0`/`+0x4D4`/`+0x4D8`/`+0x240`/`+0x4E0`/`+0x4F0`/`+0x508`/`+0x514` 的字段名待成员表对齐。
4. `0x02B`（参数 r2）语义：唯一调用点传 1；未找到传 0/2 的调用者 ⇒ 可能是"手动保存 vs 自动保存"。
5. `+0x020/+0x024` 取自两个不同全局管理器（`+0x34` / `+0x24`），未追到管理器字段名；
   与编辑器（playtime/money）的对应目前是 [INFERENCE]。
6. `arm32.mjs` 缺 BFI/BFC 解码（把 `0xe7c43012`/`0xe7c93292` 误译为 `strb`）——本次手工纠正，
   建议后续所有含 "strb `<未初始化基址>`" 的行都复核一遍。
7. 写侧 `ctx+16` / `ctx+20`（`0x3e11a8` 置 0 / `0x4EB898`）用途未明；`ctx+20` 数值等于整个 payload
   尺寸，疑似容量上限（越界检查不在 `0x3e0ea4` 内）。

---

## 10. 读写调度器配对表（新，供全队复用）

### 10.1 `0x3e75f8` 完整调用序列（写，`wr-3e75f8.txt`）

| # | 指令 | GOT 槽 | writer | 对应 reader（`0x3e77b0`） |
|---|---|---|---|---|
| 1 | `0x3e760c bl` | 0x1453210 | `0x19a55c` | `0x19a4ec` |
| 2 | `0x3e7620 bl` | 0x1453208 | `0x19e180` | `0x19e0ac` |
| 3 | `0x3e7634 bl` | 0x1451754 | `0x51d0a0` | `0x51dbb4` |
| 4 | `0x3e7648 bl` | 0x1451d4c | `0x14b1c4` | `0x14b0b0` |
| 5 | `0x3e765c bl` | 0x1451558 | `0x3f8d80` | `0x3f8de0` |
| 6 | `0x3e7670 bl` | 0x1451560 | `0x198120` | `0x1979b0` |
| 7 | `0x3e7684 bl` | 0x14516fc | `0x275798` | `0x2755f0` |
| 8 | `0x3e7698 bl` | 0x1451524 | `0x2635b4` | `0x2639ac` |
| 9 | `0x3e76ac bl` | 0x1451914 | `0x507e20` | `0x507d44` |
| 10 | `0x3e76c0 bl` | 0x1451a20 | `0x240ce4` | `0x240d60` |
| 11 | `0x3e76d4 bl` | 0x1451af0 | `0x1a4e50` | `0x1a4e64` |
| 12 | `0x3e76e8 bl` | 0x14548c8 | `0x3f43c0` | `0x3f43d4` |
| 13 | `0x3e76fc bl` | 0x1451664 | `0x14c5c8` | `0x14c568` |
| 14 | `0x3e7710 bl` | 0x14531d8 | `0x1641b0` | `0x163e0c` |
| 15 | `0x3e7724 bl` | 0x14516b8 | `0x15bba0` | `0x15bd3c` |
| 16 | `0x3e7738 bl` | 0x1451654 | `0x539150` | `0x539120` |
| 17 | `0x3e774c bl` | 0x145310c | `0x1c9380` | `0x1c9388` |
| 18 | `0x3e7764 b`（尾跳） | 0x1451478 | `0x55d45c` | `0x55d2c0` |
| — | 无 | — | — | `0x521398`（成员#2 第二段） |
| — | 无 | — | — | `0x2282a8`（读后处理，尾跳） |

计数：写 = 17 `bl` + 1 `b` = **18**；读 = 19 `bl` + 1 `b` = **20**。
两侧 r4 全程 = ctx，**没有任何按成员变化的额外参数**。

### 10.2 结构对照

```
读 0x3e77b0:  push {r4,r5,r11,lr} ; r4=r1
              ×19: ldr r0,[pc,#..](GOT) ; ldr r0,[pc,r0] ; ldr r0,[r0,#0] ; r1=r4 ; bl <reader>
              pop {r4,r5,r11,lr} ; b 0x2282a8
写 0x3e75f8:  push {r4,lr}       ; r4=r1
              ×17: 同上 ; bl <writer>
              pop {r4,lr} ; b 0x55d45c          ← 第 18 个 writer 用尾跳
```
（写版只 push `r4,lr`，因为不需要 r5 —— 读版用 r5 暂存成员#2 对象以做第二段 reader。）

### 10.3 写缓冲是**原地覆盖**，不是清零后重写

`0x3e11a8` 建 ctx：`ctx+12 = base`（`this+0x28`，即当前 payload 缓冲），
`ctx+8 = base + *(base + slot*4 + 0x10)`，`ctx+20 = 0x4EB898`。`0x3e0ea4` 的 `memcpy` 目的地
就是 `ctx+8`（`0x3e1064..0x3e1090` 的对齐逻辑随后 `add r0,r0,#632`）。逐层含义：

| 区域 | 保存时发生什么 |
|---|---|
| `char_off 0x000..0x277`（632 B） | **整块被 staging memcpy 覆盖**（含 §5.3 那 4 B 栈残留、含 7×44 记录的 vptr 字） |
| 成员区 `0x278..0x3783A` | 由 18 个 writer 各自的 `0x3df378` 站点覆盖；writer 没覆盖的成员内空隙**保留缓冲区旧值** |
| 尾区 `0x3783A..0x11F8A0`（950,374 B，81%） | 以读侧字节和推算，**没有任何 writer 触达** ⇒ 原样保留（= 载入时的内容，编辑器的修改得以留存）|

⇒ 对"每字节可修改"的直接含义：
1. **能持久化的字节** = 18 个 writer 的 `0x3df378` 覆盖范围 **∪** 尾区 950,374 B（因为后者不被重写）。
2. **会被游戏冲掉的字节** = 632 B 头（全部由运行时状态重算）**以及** writer 覆盖到的成员字段。
3. 编辑器只写 `system` 文件、不参与运行时缓冲区，所以它的改动在"游戏内再存一次"后被分到
   上面两类：尾区留存、头部与已覆盖字段丢失 —— 与 `ROUND-SUMMARY.md` 的实测一致 [INFERENCE，待实机]。

---

## 11. 对既有报告的更正（有本工单转储作证）

| # | 既有说法（出处） | 本次实测 | 影响 |
|---|---|---|---|
| 1 | `0x14b0b0` = 装备箱**写**、`0x14b1c4` = **读**（`equip-box.md` §1.1、`save-load-path.md` §4 行5） | **反了**：`0x3e77b0`（读调度器）第 4 项 = `0x14b0b0`；`0x3e75f8`（写调度器）第 4 项 = `0x14b1c4` | 读写方向判定的第一手依据永远是调度器归属；引 `0x14b0b0` 当"写"的补丁注释需对调 |
| 2 | `0x10C..0x23F` = "7 个 44 B **成员描述符**"（`save-load-path.md:117`、`other-main.md:183`） | 是 **7 条装备记录**（`{类常量, flags, 5×u16, 24B, owned=0}`），由 `obj+0x18+44k` 赋值而来 | "描述符"一词会诱导写出不存在的表驱动层；改称"装备记录快照" |
| 3 | 7 段首 dword 实测 `0x0193A514` | 该值**超出镜像末端**（≈0x184BF00），与 `*(0x1839D68)+8` 模型矛盾；`0x0183A514` 才自洽 | 疑转写错误；见 §8 预测 1 的一条命令定案 |
| 4 | "角色头 632 B 回填到运行时对象的路径未定位"（`save-load-path.md` §9.7） | **不存在回填**：`0x3e0db8` 全函数只 `memcpy` 到栈、随即被 7 个 dtor 处理，`0x3e77b0` 也拿不到该缓冲 | 该谜团关闭；头是"只写/展示"数据 |
| 5 | rodata `[0x3e7938..0x3e7980]` 是"19 个 `0x145xxxx` **指针**"（`member-census.md`） | `0x145xxxx` 是 `ldr r0,[pc,r0]` 的 **pc 相对偏移**，真实槽地址 ≈ 指令 PC + 该值（`0x183xxxx` 区），槽里才是指针 | 按"指针"直接去 `rd32(0x145xxxx)` 会读错地址 |
| 6 | 本工单派发 context：`0x3e0ea4` = "每成员 staging 序列化器"、内部"构描述符数组" | 是**每槽一次**的写入口；7 个 44 B 对象是装备记录，不是字段描述符 | 见 §4、§6 |

---

## 12. 复现清单（有 exec 的 worker 可直接跑）

```bash
cd "G:/omp works"
node -e "const a=require('./.tmp/mhgu/tools/arm32.mjs');console.log(a.disasm(0xdaba4,30))"      # ctor
node -e "const a=require('./.tmp/mhgu/tools/arm32.mjs');console.log(a.disasm(0xdadf0,30))"      # copy-assign
node -e "const a=require('./.tmp/mhgu/tools/arm32.mjs');console.log(a.disasm(0x3e0ea4,130))"    # 写入口
node -e "const a=require('./.tmp/mhgu/tools/arm32.mjs');console.log(a.disasm(0x3e75f8,60))"     # 写调度器
node -e "const a=require('./.tmp/mhgu/tools/arm32.mjs');console.log(a.rd32(0x1839D68).toString(16))"  # vptr 槽
# 存档侧：7 条记录的首 dword（slot1 基址 0x2AC560；char_off 0x10C+44k）
node -e "const b=require('fs').readFileSync('MHGU/save-snapshots/20261022-clean-reference/system_CLEAN');for(let k=0;k<7;k++)console.log(k,b.readUInt32LE(0x2AC560+0x10C+44*k).toString(16))"
# 同上，dirty 档 slot0（基址 0x18CC9C）
node -e "const b=require('fs').readFileSync('MHGU/save-snapshots/20261022-v6-ready/system');for(let k=0;k<7;k++)console.log(k,b.readUInt32LE(0x18CC9C+0x10C+44*k).toString(16))"
```

---

## 13. 状态（已确认 / 进行中 / 未知）

**已确认（有证据，全部可逐字复核）**
- §2 `0xdaba4` ctor 全文 → 44 B 记录布局（vptr / u16 flags / 5×u16 / 24B / owned ptr）。
- §3.1/3.2/3.3 `0xdadf0`=copy-assign（dst,src，无 size）、`0xdad24`=dtor（free `+0x28`）、
  `0xdac14`=clear（含 owned 44 B 全清）。
- §4 `0x3e0ea4` 全文 → 每槽一次、7×44 B；拼头 = 2 次 memcpy + 7 次 copy-assign + 10 处标量/小块写，
  然后 `memcpy(ctx+8, staging, 632) → bl 0x3e75f8`。
- §5 632 B 头逐段来源表（含 `0x270..0x273` 无写入）。
- §6 无 `{type,obj_off,size}` 三元组（三条否证）。
- §7.1 读路径丢弃 632 B；§10 18 对读写调度配对。

**进行中** — 无（本工单验收项 1–5 均已闭环）。

**未知（已列 §9）** — 18 个 writer 的 `0x3df378` 站点逐条清点；`obj` 单例定名与其字段名；
`+0x02B` 参数语义；`+0x020/+0x024` 的管理器字段名；`0x0193A514` 数值定案（一条命令）。
