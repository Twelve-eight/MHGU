# Tier B slice 14 — 裁定报告

范围 `0x139c7ec..0x13f1ab0`，共 1057 函数（ARM32，MT Framework / Rabbit，main.140.flat.bin）。
label 取任务固定集合；role: `leaf`=无调用 / `thunk`=≤4 指令且无调用 / `orchestrator`=调用≥8 / `worker`=其余；
conf: A=直接字符串证据，B=callee 票数或强结构模式，C=地址邻域/推断。

## 汇总

> 处理中：计数在本节末尾统一回填（每批 append 时在 `<!-- tally -->` 行记录该批标签计数）。

- 总计：1057（待回填）
- 各 label 计数：待回填
- A/B/C 计数：待回填
- 最不确定的 10 个：见文末 `## 最不确定的 10 个`

### 关键判据（全片通用，已交叉验证）

1. **导入壳段（PLT stub 段）**：`0x13efd70..0x13f1dec` 为 .text 末尾的 12 字节步进 stub 表，绝大多数无 callee、无字符串、caller 数极高。
   前序反汇编报告已确认 `0x13efdd0` = **memcpy**、`0x13efd7c` = 内存置位类、`0x13efda0` = 4 参返回型导入
   （见 `reports-mhgu/fam-288.md:356`、`member4-17-layout.md:13`、`write-side-desc.md:273` 的 `bl 0x13efdd0 ; memcpy`）。
   ⇒ 该段一律判 `kernel-os` / `thunk` / conf B，**不采信**其自身在 tiers.csv 里的标签（那是传播噪声）。
2. **票数污染**：这些 stub 地址以及 `0x7aa47c`(10419 caller)/`0x7bb638`(10268)/`0x7aedcc`(3205)/`0x7c0b80` 属全引擎通用核心，
   调用它们产生的票（尤其孤立的 `quest:1`、`online-nex:1`）**不作为判据**。只有来自真实子系统函数的票才计入。
3. **Pia 网络库区**（`0x139c7ec..0x13b35d4`）：callee 集中在 `0x130xxxx`/`0x136xxxx`。
   `0x130b4d0` 字符串 `SDK MW+Nintendo+Pia-5_2_15`、`0x130ca5c` 字符串 `%d.%d.%d.%d:%d` ⇒ 该片是 Nintendo Pia（P2P 网络 SDK），归 `online-nex`。
4. **libcurl 区**（`0x13c3044..0x13e8b58`）：字符串 `CONNECT_ONLY is required!`、`Content-Type: multipart/form-data`、
   `username="%s"; realm="%s"; nonce=...`、`MD5-sess`、`------------------------%08x%08x`、`.xml | .html | .txt | .jpeg | .jpg`
   均为 libcurl 原文 ⇒ 归 `online-nex`（本片无 http 专用 label，curl 是 Nexus 的 HTTP 层）。
5. **MtCollisionUtil 区**（`0x13b379c..0x13bfac0`）：`0x13bdadc` 自身字符串 `MtCollisionUtil::MtDtiSelecterIntermediate`，
   且其 tiers 行是 A 级 `physics-math`；`0x13bbe00`/`0x13bdadc` 的 class 表为 MtCollisionUtil::MtLinerTree/MtArrayElement。
   调用方 `0xb53e80`(rAIPathBase)/`0xb1a0fc`(Geometry)/`0x8993e0`(mpChain 资源) ⇒ 碰撞/AI 路径数据，归 `physics-math`。
6. **影片/媒体区**（`0x13c0014..0x13c3018`）：字符串 `mime | video/avc | video/x-vnd.on2.vp8`、`.mp4 | .webm | .mkv | .ogg`、
   `width|height|durationUs|frame-rate|stride`、`sample-rate|channel-count`、`video output`/`audio output`；
   seeds 里 `0x13c07f8 = nNX::MoviePlayer`。属平台媒体解复用/解码配置层 ⇒ 判 `kernel-os`（说明见"最不确定"节）。

## 需要反汇编

请主会话跑以下 vaddr 的反汇编，落盘到 `G:/omp works/.tmp/mhgu/tierB/disasm-14.txt`（格式：`vaddr: word mnemonic ; 注释`）。
这些是我唯一无法从票数/字符串定案、且影响面最大的点：

1. `0x13efd70`、`0x13efd94`、`0x13efddc` — 确认导入壳段形态（是否 `ldr r12,[pc,#x]; bx r12; .word`），以便给 ~600 个 stub 定 label。
2. `0x13f19fc`、`0x13f1a20` — 这两个 3 指令 stub 的字符串列是构建路径 `D:\ev1738_ts\Rabbit\...`，要确认它是"返回字符串指针的 getter"还是 stub 的误报。
3. `0x13b2ac4`（145 指令，**零 callee**，Pia 区内）— 想确认是纯计算/大 switch 还是表数据。
4. `0x13e4534`（781 指令，**零 callee**，libcurl 区内）— 同上。
5. `0x13b9f58`（165 指令零 callee）、`0x13ba328`（65）、`0x13ba42c`（60）、`0x13bb1f4`（79）、`0x13bb9ac`（99）— 碰撞区内的无 callee 函数，确认是算术/表还是访问器。
6. `0x13a1f90`（125 零 callee）、`0x13aeac8`（136 零 callee）、`0x13a2184`（99）— Pia 区内无 callee，确认是否 ID/哈希换算。
7. `0x13c07f8`（32 指令）— 确认 `nNX::MoviePlayer` 的成员性质（决定媒体区整体 label）。
8. `0x13b379c`（458）— 确认是否 MtCollisionUtil 的树/几何查询入口（决定 `0x13b379c..0x13b8aa0` 这一大簇的归属）。

（若时间不允许，优先 1、2、7：1/2 影响 600+ 行的 label，7 影响 ~45 行。）

## 逐函数裁定

| vaddr | label | role | conf | evidence |
|---|---|---|---|---|

| 0x139c7ec | online-nex | worker | B | 4 callee 全为 Pia 核心 0x1365798/0x1365600/0x130ca48/0x13655c4，票 online-nex:4 |
| 0x139c8f8 | online-nex | worker | B | 调 0x1307014/0x130c6c8（Pia），票 online-nex:2 |
| 0x139c9a4 | online-nex | worker | B | 调 0x139c7ec/0x130c6e4/0x130704c，票 online-nex:3 |
| 0x139c9f8 | online-nex | worker | B | 6 callee（0x1306e20/0x1365518/0x1365730…）全 Pia，票 online-nex:6 |
| 0x139cad4 | online-nex | worker | B | 调 0x1306e20/0x1365518/0x130a7a8，票 online-nex:3 |
| 0x139cc68 | online-nex | worker | B | 7 callee（0x130b0ec/0x130b110/0x130a8bc…），票 online-nex:6；`quest:1` 来自导入壳 0x13f0f7c，不计 |
| 0x139cd70 | online-nex | orchestrator | B | 9 callee（0x130a8bc/0x130b0ec/0x130b110/0x130c6f8…），票 online-nex:8 |
| 0x139cf08 | online-nex | worker | B | 调 0x1365964/0x13657d0/0x130a8fc/0x130a940/0x1365820，票 online-nex:5 |
| 0x139d0d8 | online-nex | worker | B | 调 0x1365964/0x139d4a8/0x13657d0/0x130a8fc/0x130a940/0x1365820，票 online-nex:6 |
| 0x139d3bc | online-nex | orchestrator | B | 8 callee（0x130c6f8/0x1365964/0x130b0ec/0x130b110/0x13f0f7c/0x139d4a8…），票 online-nex:8 |
| 0x139d4a8 | online-nex | leaf | C | 126 指令零 callee（纯计算），被 0x139cd70/0x139d0d8/0x139d3bc 三个 Pia 包装调用，? |
| 0x139d6a0 | online-nex | leaf | C | 69 指令零 callee，紧邻 0x139d4a8、caller 0x139d3bc 属 Pia 簇，? |
| 0x139d7b4 | online-nex | worker | B | 调 0x13a0a24/0x13a06a0/0x13ed7b4，票 online-nex:3 |
| 0x139d810 | online-nex | worker | B | 调 0x13a06ec/0x13a0a4c，票 online-nex:2 |
| 0x139d884 | online-nex | worker | B | 调 0x1307014/0x13b1a30/0x13b1b30/0x130704c/0x13ed7b4，票 online-nex:5 |
| 0x139da64 | online-nex | worker | B | 调 0x13a0a50/0x13ed7b4/0x13ed7a0/0x13b1b48/0x13b1de8，票 online-nex:5 |
| 0x139dbc0 | online-nex | worker | B | 调 0x13ed7b4/0x13ed7a0/0x13b1be8，票 online-nex:3 |
| 0x139dce4 | online-nex | worker | B | 调 0x139edec/0x13edb00/0x13edd58/0x13a0718/0x13b1bfc，票 online-nex:5 |
| 0x139e000 | online-nex | worker | B | 调 0x13b1bfc/0x13edc20/0x139ee20/0x139ed70，票 online-nex:4 |
| 0x139e3d0 | online-nex | leaf | C | 19 指令零 callee，6 caller（0x13a9a9c/0x13a9c98/0x13a9f1c 等 Pia-quest 混合簇），? |
| 0x139e41c | online-nex | worker | C | 唯一 callee 0x13edb4c 自身无判据，`quest:1` 为传播票；邻域属 Pia 簇，? |
| 0x139e44c | online-nex | worker | B | 57 caller 的公共小访问器，callee 0x13a0a84 在 Pia 簇（结构模式：高复用薄封装） |
| 0x139e488 | online-nex | leaf | C | 5 指令零 callee，12 caller（回调/访问器），无法定归属，? |
| 0x139e49c | online-nex | leaf | C | 12 指令零 callee，9 caller，? |
| 0x139e4cc | online-nex | leaf | C | 13 指令零 callee，2 caller，? |
| 0x139e500 | online-nex | worker | B | 调 0x139eca4/0x13eda64/0x130a8fc/0x139ec6c，票 online-nex:3 |
| 0x139e584 | online-nex | orchestrator | B | 9 callee（0x13a0900/0x139ec70/0x13a0718/0x13a88c4/0x13a63ac…），票 online-nex:9 |
| 0x139e850 | online-nex | worker | B | 调 0x13b1e10（其 6 callee 全 Pia），票 online-nex:1，3 caller |
| 0x139e94c | online-nex | worker | B | 调 0x13b1de8（Pia）；票里的 `render-gfx:2` 全来自导入壳 0x13eff80/0x13eff8c，不计 |
| 0x139ea1c | online-nex | worker | C | 29 指令、0 caller，两个 callee 均为导入壳 0x13eff80/0x13eff8c（票 render-gfx:2 为噪声），仅凭邻域，? |
| 0x139ea90 | online-nex | leaf | C | 13 指令零 callee，1 caller，? |
| 0x139eac4 | online-nex | worker | B | 调 0x1306e20/0x136556c/0x13ed9d0，票 online-nex:3 |
| 0x139eb7c | online-nex | worker | B | 调 0x1365600/0x13edac8/0x13655c4，票 online-nex:3 |
| 0x139ec08 | online-nex | leaf | C | 16 指令零 callee，1 caller，? |
| 0x139ec48 | online-nex | leaf | C | 9 指令零 callee，1 caller，? |
| 0x139ec6c | online-nex | thunk | C | 1 指令零 callee 纯跳转壳，2 caller，无法归属，? |
| 0x139ec70 | online-nex | leaf | C | 13 指令零 callee，4 caller，? |
| 0x139eca4 | online-nex | worker | B | 调 0x130b4b8（Pia 内部容器）/0x130d9b0，票 kernel-os:1 online-nex:1 |
| 0x139ed70 | online-nex | leaf | C | 5 指令零 callee，2 caller，? |
| 0x139ed84 | online-nex | leaf | C | 26 指令零 callee，1 caller，? |
| 0x139edec | online-nex | leaf | C | 13 指令零 callee，1 caller（被 0x139dce4 调），? |
| 0x139ee20 | online-nex | leaf | C | 5 指令零 callee，2 caller，? |
| 0x139ee34 | online-nex | orchestrator | B | 8 callee（0x13ef6f4/0x1306e20/0x1365518/0x13ed4f8/0x13ed5d8…），票 online-nex:8 |
| 0x139f8c4 | online-nex | leaf | C | 14 指令零 callee，11 caller（热访问器），无字符串，? |
| 0x139f8fc | online-nex | thunk | C | 2 指令零 callee，9 caller（典型 getter），? |
| 0x139f904 | online-nex | leaf | C | 10 指令零 callee，1 caller（0x139fb84），? |
| 0x139f92c | online-nex | leaf | C | 18 指令零 callee，1 caller，? |
| 0x139f974 | online-nex | worker | B | 调 0x130d03c（Pia 时间/ID 换算），票 online-nex:1 |
| 0x139f9b8 | online-nex | worker | B | 调 0x130d158（A 级 online-nex，331 指令），票 online-nex:1 |
| 0x139fa24 | online-nex | worker | B | 调 0x130d158，票 online-nex:1，与 0x139f9b8 同构 |
| 0x139fae8 | online-nex | thunk | C | 4 指令零 callee 纯跳转壳，1 caller，? |
| 0x139faf8 | online-nex | worker | B | 调 0x1306e20/0x1365518，票 online-nex:2，11 caller |
| 0x139fb84 | online-nex | worker | B | 调 0x139f904/0x130d054/0x13a05e4，票 online-nex:3，11 caller |
| 0x139ffc4 | online-nex | worker | B | 调 0x13a0610/0x130d0a4，票 online-nex:2，9 caller |
| 0x13a0060 | online-nex | leaf | C | 20 指令零 callee，11 caller，? |
| 0x13a00b0 | online-nex | leaf | C | 28 指令零 callee，1 caller，? |
| 0x13a0120 | online-nex | leaf | C | 17 指令零 callee，1 caller，? |
| 0x13a0164 | online-nex | leaf | C | 51 指令零 callee，2 caller，? |
| 0x13a0230 | online-nex | leaf | C | 20 指令零 callee，2 caller，? |
| 0x13a0280 | online-nex | leaf | C | 49 指令零 callee，1 caller，? |
| 0x13a0344 | online-nex | leaf | C | 20 指令零 callee，1 caller，? |
| 0x13a0394 | online-nex | leaf | C | 33 指令零 callee，1 caller，? |
| 0x13a0418 | online-nex | leaf | C | 43 指令零 callee，2 caller，? |
| 0x13a04c4 | online-nex | worker | B | 调 0x1398b70/0x1398b84/0x1307014，票 online-nex:3；`quest:1` 来自导入壳 0x13efd7c |
| 0x13a0564 | online-nex | worker | B | 调 0x130704c（A 级 online-nex，3 指令访问器），票 online-nex:1 |
| 0x13a05a0 | online-nex | leaf | C | 17 指令零 callee，1 caller，? |
| 0x13a05e4 | online-nex | leaf | C | 11 指令零 callee，2 caller，? |
| 0x13a0610 | online-nex | leaf | C | 36 指令零 callee，1 caller，? |
| 0x13a06a0 | online-nex | worker | B | 调 0x130a7a8（A 级 online-nex），票 online-nex:1 |
| 0x13a06ec | online-nex | worker | B | 调 0x130ca48（A 级 online-nex），票 online-nex:1，4 caller |
| 0x13a0718 | online-nex | worker | B | 调 0x13ed9c4/0x13a0824/0x130a8fc/0x130a804，票 online-nex:4 |
| 0x13a0824 | online-nex | leaf | C | 55 指令零 callee，1 caller（0x13a0718），? |
| 0x13a0900 | online-nex | worker | B | 调 0x130a804（A 级 online-nex），票 online-nex:1 |
| 0x13a0924 | online-nex | thunk | C | 2 指令零 callee，7 caller，? |
| 0x13a092c | online-nex | thunk | C | 2 指令零 callee，1 caller，? |
| 0x13a0934 | online-nex | thunk | C | 2 指令零 callee，3 caller（被 0x13aa228 等大量使用），? |
| 0x13a093c | online-nex | thunk | C | 2 指令零 callee，1 caller，? |
| 0x13a0944 | online-nex | leaf | C | 56 指令零 callee，1 caller，? |
| 0x13a0a24 | online-nex | leaf | C | 10 指令零 callee，1 caller，? |
| 0x13a0a4c | online-nex | thunk | C | 1 指令零 callee，2 caller，? |
| 0x13a0a50 | online-nex | thunk | C | 2 指令零 callee，10 caller（热 getter，后续被碰撞/quest 区复用），? |
| 0x13a0a84 | online-nex | worker | C | 161 指令但唯一 callee 是导入壳 0x13f15ac，票不算；被 0x139e44c（57 caller）调用，仅凭邻域，? |
| 0x13a0d3c | online-nex | thunk | C | 4 指令零 callee，46 caller 的纯访问器，? |
| 0x13a0d4c | online-nex | leaf | C | 5 指令零 callee，2 caller，? |
| 0x13a0d60 | online-nex | thunk | C | 4 指令零 callee，14 caller，? |
| 0x13a0d70 | online-nex | leaf | C | 25 指令零 callee，1 caller，? |
| 0x13a0dd4 | online-nex | thunk | C | 1 指令零 callee，1 caller，? |
| 0x13a0dd8 | online-nex | worker | B | 371 指令，调 0x1306e20/0x1365518（A 级 Pia）+ 2 个导入壳，真实票 2 |
| 0x13a13a4 | online-nex | worker | B | 调 0x1365600/0x13655c4，票 online-nex:2 |
| 0x13a14d8 | online-nex | worker | B | 调 0x13a16a0（366 指令 Pia 主体）；另一 callee 0x13f1564 是导入壳 |
| 0x13a16a0 | online-nex | worker | B | 366 指令调 0x13a1c58，票 online-nex:1（Pia 队列/包处理） |
| 0x13a1c58 | online-nex | worker | B | 调 0x13a2184，票 online-nex:1，2 caller |
| 0x13a1d94 | online-nex | worker | B | 调 0x13a1c58，票 online-nex:1，2 caller |
| 0x13a1f90 | online-nex | leaf | C | 125 指令零 callee（纯计算/表），2 caller，需反汇编确认，? |
| 0x13a2184 | online-nex | leaf | C | 99 指令零 callee，3 caller（0x13a1c58/0x13a2310/0x13a2714），? |
| 0x13a2310 | online-nex | worker | B | 调 0x13a2184，票 online-nex:1（ID/哈希换算类） |
| 0x13a2714 | online-nex | worker | B | 调 0x13a2184，票 online-nex:1 |
| 0x13a2874 | online-nex | worker | B | 6 callee（0x13a14d8/0x13a1d94/0x13a2310/0x13a2714/0x13a1f90/0x13f15ac），票 online-nex:6 |
| 0x13a2f5c | online-nex | thunk | C | 1 指令零 callee，3 caller，? |
| 0x13a2f60 | online-nex | leaf | C | 44 指令零 callee，1 caller，? |
| 0x13a3010 | online-nex | worker | C | 两个 callee 都是 IAT 导入跳板 0x13f1564/0x13f15ac，票无意义；仅凭 Pia 邻域，? |
| 0x13a31e8 | online-nex | worker | C | 唯一 callee 为导入跳板 0x13f15ac，票无意义；邻域 Pia，? |
| 0x13a3440 | online-nex | leaf | C | 15 指令零 callee，1 caller，? |
| 0x13a347c | online-nex | leaf | C | 21 指令零 callee，9 caller（被 0x13a909c/0x13aa228 复用），? |
| 0x13a3518 | online-nex | leaf | C | 33 指令零 callee，2 caller，? |
| 0x13a359c | online-nex | leaf | C | 32 指令零 callee，1 caller，? |
| 0x13a361c | online-nex | leaf | C | 6 指令零 callee，1 caller，? |
| 0x13a3634 | online-nex | leaf | C | 8 指令零 callee，1 caller，? |
| 0x13a3654 | online-nex | leaf | C | 73 指令零 callee，1 caller（0x939a… 无字符串），? |
| 0x13a3778 | online-nex | worker | C | 135 指令，唯一 callee 为导入跳板 0x13f1564，票无意义；7 caller 全在 Pia 簇，? |
| 0x13a3994 | online-nex | leaf | C | 40 指令零 callee，1 caller，? |
| 0x13a3a34 | online-nex | leaf | C | 21 指令零 callee，2 caller，? |
| 0x13a3a88 | online-nex | leaf | C | 32 指令零 callee，2 caller，? |
| 0x13a3b08 | online-nex | leaf | C | 5 指令零 callee，1 caller，? |
| 0x13a3bf4 | online-nex | leaf | C | 63 指令零 callee，1 caller（0x13a4248），? |
| 0x13a3cf0 | online-nex | leaf | C | 29 指令零 callee，3 caller，? |
| 0x13a3d64 | online-nex | worker | B | 调 0x1365600/0x13655c4（Pia 线程/锁层），票 online-nex:2 |
| 0x13a3e40 | online-nex | worker | B | 调 0x1365600/0x13655c4/0x13a3d64，票 online-nex:3 |
| 0x13a3eac | online-nex | worker | B | 调 0x1306e20/0x1365518/0x1365600/0x13655c4（Pia），票 online-nex:4；`quest:2` 来自导入跳板 0x13efdc4/0x13efdac |
| 0x13a4108 | online-nex | worker | C | 调 0x139e1d0（Pia 簇）+ 导入跳板 0x13f0298，真实票仅 1；3 caller，? |
| 0x13a41f4 | online-nex | leaf | C | 12 指令零 callee，5 caller，? |
| 0x13a4224 | online-nex | leaf | C | 9 指令零 callee，29 caller（热访问器），? |
| 0x13a4248 | online-nex | worker | B | 252 指令，调 0x13a3bf4/0x130b110（A 级 Pia）+ 2 导入跳板，真实票 2 |
| 0x13a4638 | online-nex | worker | B | 275 指令，调 0x13a5fe4/0x13a3b08/0x13a0d3c/0x139e44c（Pia 簇），票 online-nex:7 |
| 0x13a4a84 | online-nex | worker | C | 113 指令，唯一 callee 为导入跳板 0x13f15ac，票无意义；邻域 Pia，? |
| 0x13a4c48 | online-nex | worker | C | 115 指令，唯一 callee 为导入跳板 0x13f15ac；17 caller 全在 Pia 簇，? |
| 0x13a4e14 | online-nex | leaf | C | 28 指令零 callee，2 caller，? |
| 0x13a4e84 | online-nex | worker | B | 调 0x1307014（A 级 Pia 访问器），票 online-nex:1 |
| 0x13a4f14 | online-nex | worker | B | 调 0x13a4f6c/0x130704c，票 online-nex:2 |
| 0x13a4f6c | online-nex | worker | B | 调 0x1365600/0x13655c4/0x130ca48/0x1307058，票 online-nex:4 |
| 0x13a5104 | online-nex | worker | B | 6 callee（0x1306e20/0x1365518/0x136556c/0x1307030/0x130a7a8/0x13f1564），票 online-nex:6 |
| 0x13a5640 | online-nex | leaf | C | 9 指令零 callee，1 caller，? |
| 0x13a5664 | online-nex | leaf | C | 6 指令零 callee，1 caller，? |
| 0x13a567c | online-nex | worker | B | 调 0x130b0ec/0x13a0d3c/0x139e44c，票 online-nex:3 |
| 0x13a57f8 | online-nex | orchestrator | B | 5 真实 callee（0x139e1d0/0x130b0ec/0x130b318/0x130a8fc + 导入跳板），票 online-nex:4；票面 8 个 callee 达 orchestrator |
| 0x13a5988 | online-nex | leaf | C | 18 指令零 callee，7 caller，? |
| 0x13a59d0 | online-nex | leaf | C | 6 指令零 callee，5 caller（0x13aaff4/0x13abaec 高复用），? |
| 0x13a59e8 | online-nex | worker | B | 调 0x130b110（A 级 Pia），票 online-nex:1，27 caller |
| 0x13a5a8c | online-nex | worker | B | 7 callee（0x130a7a8/0x1307014/0x13a3cf0/0x139ee34/0x13b2fe4/0x13b2ffc/0x130ca48），票 online-nex:7 |
| 0x13a5c3c | online-nex | worker | B | 调 0x13a3eac（Pia 包处理），票 online-nex:1 |
| 0x13a5cb0 | online-nex | worker | B | 调 0x13a3e40，票 online-nex:1 |
| 0x13a5d0c | online-nex | thunk | C | 2 指令零 callee，10 caller，? |
| 0x13a5d14 | online-nex | thunk | C | 4 指令零 callee，5 caller，? |
| 0x13a5d24 | online-nex | worker | B | 调 0x130b38c/0x130b0ec/0x130a8fc，票 online-nex:4 |
| 0x13a5dc4 | online-nex | worker | B | 调 0x13b3004/0x130b0ec/0x130a8fc，票 online-nex:3 |
| 0x13a5e58 | online-nex | worker | B | 6 callee（0x130a7a8/0x130a804/0x13b3004/0x130b0ec/0x130a8fc/0x130ca48），票 online-nex:6 |
| 0x13a5f1c | online-nex | worker | B | 6 callee 同上族，票 online-nex:6，17 caller |
| 0x13a5fa0 | online-nex | worker | B | 调 0x13acdb0（Pia 区访问器），票 online-nex:1 |
| 0x13a5fe4 | online-nex | worker | B | 调 0x13acdb0，票 online-nex:1 |
| 0x13a6030 | online-nex | worker | B | 调 0x13acdb0，票 online-nex:1 |
| 0x13a6070 | online-nex | worker | B | 调 0x13acdb0，票 online-nex:1 |
| 0x13a60b4 | online-nex | worker | B | 调 0x13acdb0，票 online-nex:1 |
| 0x13a60f8 | online-nex | worker | B | 调 0x139b10c/0x139b6e4/0x139f82c，票 online-nex:2，18 caller |
| 0x13a6170 | online-nex | worker | B | 调 0x139c46c（Pia 簇），票 online-nex:1 |
| 0x13a61ac | online-nex | leaf | C | 7 指令零 callee，1 caller，? |
| 0x13a61c8 | online-nex | worker | B | 调 0x139c514（Pia 簇），票 online-nex:1，0 caller（仅函数指针/vtable 引用） |
| 0x13a61f8 | online-nex | worker | B | 调 0x13a63ac/0x13a6d94/0x13a6464（Pia 队列），票 online-nex:3，8 caller |
| 0x13a62e4 | online-nex | worker | B | 调 0x139c5e4，票 online-nex:1 |
| 0x13a6320 | online-nex | worker | B | 调 0x139c684，票 online-nex:1，3 caller |
| 0x13a635c | online-nex | leaf | C | 9 指令零 callee，4 caller，? |
| 0x13a6380 | online-nex | leaf | C | 11 指令零 callee，1 caller，? |
| 0x13a63ac | online-nex | worker | B | 调 0x13a79bc，票 online-nex:1，48 caller（Pia 队列热入口） |
| 0x13a63e4 | online-nex | worker | B | 调 0x13a79bc/0x13a7ad0，票 online-nex:2 |
| 0x13a643c | online-nex | worker | B | 调 0x13a7ad0，票 online-nex:1，8 caller |
| 0x13a6464 | online-nex | worker | B | 调 0x13a7b50，票 online-nex:1，53 caller（Pia 队列热入口） |
| 0x13a64d8 | online-nex | worker | B | 调 0x13a7ad0，票 online-nex:1，16 caller |
| 0x13a650c | online-nex | worker | B | 调 0x13a7c70，票 online-nex:1，9 caller |
| 0x13a6554 | online-nex | worker | B | 调 0x13a7d78，票 online-nex:1，6 caller |
| 0x13a6578 | online-nex | worker | B | 调 0x13a7d78/0x13a7d8c，票 online-nex:2 |
| 0x13a665c | online-nex | orchestrator | B | 236 指令，11 callee（0x13a7ee0/0x13a7d78/0x130cab8/0x130b294/0x130b318/0x130ca04…），票 online-nex:11 |
| 0x13a6a0c | online-nex | thunk | C | 1 指令零 callee，8 caller，? |
| 0x13a6a10 | online-nex | worker | B | 调 0x1398b70/0x1398b84/0x1307014/0x13a63ac/0x130a7a8/0x130c6c8，票 online-nex:6 |
| 0x13a6ae0 | online-nex | leaf | C | 17 指令零 callee，1 caller，? |
| 0x13a6b24 | online-nex | worker | B | 调 0x1365600/0x13655c4/0x130c6e4/0x130ca48/0x13a6464（含自递归），票 online-nex:6 |
| 0x13a6bf0 | online-nex | worker | B | 调 0x1306e20/0x1365518/0x13a63ac，票 online-nex:4 |
| 0x13a6c8c | online-nex | worker | B | 调 0x130c6f8/0x13a64d8/0x130c6fc，票 online-nex:3，6 caller |
| 0x13a6d94 | online-nex | worker | B | 同 0x13a6c8c 族（0x130c6f8/0x13a64d8/0x130c6fc），票 online-nex:3，19 caller |
| 0x13a6e4c | online-nex | worker | B | 调 0x130c6f8/0x130a7d4/0x13a650c/0x130ca48/0x130c6fc，票 online-nex:5 |
| 0x13a6ef8 | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2 |
| 0x13a6f80 | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2，3 caller |
| 0x13a7004 | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2 |
| 0x13a7094 | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2 |
| 0x13a713c | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2 |
| 0x13a71d4 | online-nex | leaf | C | 11 指令零 callee，2 caller（0x13a8c20/0x13a8cf8），? |
| 0x13a7200 | online-nex | worker | B | 调 0x130c6f8/0x130c6fc，票 online-nex:2，11 caller |
| 0x13a728c | online-nex | worker | B | 调 0x130c6f8，票 online-nex:1，18 caller |
| 0x13a72f4 | online-nex | worker | B | 调 0x130c6f8（+导入跳板 0x13f1564），票 online-nex:2 |
| 0x13a7328 | online-nex | worker | B | 调 0x130d03c，票 online-nex:1 |
| 0x13a736c | online-nex | worker | B | 调 0x130d07c/0x130d03c/0x1365600/0x13655c4，票 online-nex:4 |
| 0x13a7414 | online-nex | worker | B | 调 0x130d07c/0x130d03c/0x1365600/0x13655c4，票 online-nex:4 |
| 0x13a74b8 | online-nex | worker | B | 调 0x1306e20/0x1365518/0x130d054，票 online-nex:3 |
| 0x13a75cc | online-nex | worker | B | 调 0x130d07c/0x130d03c，票 online-nex:2 |
| 0x13a7640 | online-nex | worker | B | 调 0x130d158/0x130d054，票 online-nex:2 |
| 0x13a76dc | online-nex | worker | B | 调 0x130d0a4/0x130d07c，票 online-nex:2，7 caller |
| 0x13a7770 | online-nex | leaf | C | 20 指令零 callee，5 caller，? |
| 0x13a77c0 | online-nex | leaf | C | 12 指令零 callee，2 caller，? |
| 0x13a77f0 | online-nex | leaf | C | 17 指令零 callee，3 caller，? |
| 0x13a7834 | online-nex | leaf | C | 25 指令零 callee，21 caller（热访问器，被 0x13ae774 复用），? |
| 0x13a7898 | online-nex | leaf | C | 30 指令零 callee，12 caller（被 0x13ae6b8 复用），? |
| 0x13a7910 | online-nex | leaf | C | 29 指令零 callee，17 caller（热访问器），? |
| 0x13a7984 | online-nex | leaf | C | 9 指令零 callee，5 caller，? |
| 0x13a79a8 | online-nex | thunk | C | 4 指令零 callee，7 caller，? |
| 0x13a79b8 | online-nex | thunk | C | 1 指令零 callee，7 caller，? |
| 0x13a79bc | online-nex | worker | B | 调 0x130a7a8/0x130ca04，票 online-nex:2，34 caller（Pia 队列热入口） |
| 0x13a7a20 | online-nex | worker | B | 调 0x130a7a8/0x130ca04/0x130a8fc/0x130ca34，票 online-nex:4，15 caller |
| 0x13a7ad0 | online-nex | worker | B | 调 0x130a8fc，票 online-nex:1，9 caller |
| 0x13a7b50 | online-nex | worker | B | 调 0x130ca48，票 online-nex:1，53 caller（Pia 队列热入口） |
| 0x13a7be4 | online-nex | worker | B | 调 0x130a8fc/0x130ca34，票 online-nex:2，22 caller |
| 0x13a7c70 | online-nex | worker | B | 调 0x130a8c4/0x130ca4c，票 online-nex:2，7 caller |
| 0x13a7d70 | online-nex | thunk | C | 2 指令零 callee，8 caller，? |
| 0x13a7d78 | online-nex | worker | B | 调 0x130a814（Pia 位/ID 访问器），票 online-nex:1 |
| 0x13a7d8c | online-nex | worker | B | 调 0x130a814/0x130a81c/0x130b294/0x130b318/0x130b37c/0x130cab8，票 online-nex:6 |
| 0x13a7ee0 | online-nex | worker | B | 调 0x130a880/0x130a814/0x130b2d0/0x130b338/0x130b384/0x130cb18，票 online-nex:6 |
| 0x13a7fd8 | online-nex | thunk | C | 1 指令零 callee，14 caller，? |
| 0x13a7fdc | online-nex | worker | B | 调 0x1398b70/0x1398b84/0x1307014/0x130d03c，票 online-nex:4；`quest:1` 来自导入跳板 0x13efd7c |
| 0x13a80f8 | online-nex | worker | B | 调 0x13a8170，票 online-nex:1 |
| 0x13a8170 | online-nex | worker | B | 调 0x13a5cb0/0x130d0a4/0x130d07c/0x1365600/0x13655c4（含自递归），票 online-nex:6 |
| 0x13a826c | online-nex | worker | B | 调 0x1306e20/0x1365518/0x130d054/0x130d158/0x13a5a8c/0x13a5c3c，票 online-nex:6 |
| 0x13a8430 | online-nex | leaf | C | 72 指令零 callee，2 caller，? |
| 0x13a8550 | online-nex | leaf | C | 66 指令零 callee，4 caller，? |
| 0x13a8658 | online-nex | leaf | C | 92 指令零 callee，16 caller（被 0x13a8658 之外的 Pia 簇共用），? |
| 0x13a87c8 | online-nex | worker | B | 调 0x13b0458（Pia 邻域），票 online-nex:1 |
| 0x13a882c | online-nex | leaf | C | 19 指令零 callee，73 caller（全片最热的小工具，被 libcurl/Pia 共用），? |
| 0x13a8878 | online-nex | leaf | C | 19 指令零 callee，1 caller，? |
| 0x13a88c4 | online-nex | worker | B | 调 0x130a8c4，票 online-nex:1，18 caller |
| 0x13a8924 | online-nex | worker | B | 调 0x130ca4c，票 online-nex:1 |
| 0x13a8998 | online-nex | worker | B | 调 0x130a8fc，票 online-nex:1 |
| 0x13a8a14 | online-nex | thunk | C | 2 指令零 callee，4 caller，? |
| 0x13a8a1c | online-nex | leaf | C | 34 指令零 callee，4 caller，? |
| 0x13a8aa4 | online-nex | orchestrator | B | 8 callee（0x139d7b4/0x130a7a8/0x13b09b8/0x13b0944/0x13b0950/0x13b09cc/0x130ca48/0x139d810），票 online-nex:8 |
| 0x13a8b94 | online-nex | worker | B | 调 0x139d884/0x130a804，票 online-nex:2 |
| 0x13a8bec | online-nex | worker | B | 调 0x130a804，票 online-nex:1 |
| 0x13a8c20 | online-nex | worker | B | 调 0x139da64/0x130a8fc/0x130a804/0x13a71d4/0x13a0a50，票 online-nex:5 |
| 0x13a8cf8 | online-nex | worker | B | 调 0x13a71d4，票 online-nex:1 |
| 0x13a8d40 | online-nex | worker | B | 调 0x139dbc0，票 online-nex:1 |
| 0x13a8d74 | online-nex | worker | B | 调 0x130a804，票 online-nex:1 |
| 0x13a8da8 | online-nex | worker | B | 调 0x13a0a50/0x139dce4/0x13a88c4/0x13a0718，票 online-nex:4 |
| 0x13a8f38 | online-nex | worker | B | 89 指令，调 0x13b09f4/0x139e44c/0x139e000/0x13a909c/0x13a93d4/0x13a8a1c/0x13aa228，票 online-nex:7 |
| 0x13a909c | online-nex | orchestrator | B | 11 callee（0x13a0a50/0x13a8a1c/0x13a359c/0x13a347c/0x130a8bc/0x13a3518/0x13a0a58/0x13aa0d0…），票 online-nex:9；`quest:2` 来自 0x139e41c 等弱节点 |
| 0x13a93d4 | online-nex | orchestrator | B | 346 指令，≥12 callee（0x13a993c/0x139e584/0x13a9c98/0x13a9f1c/0x13aa228…），票 online-nex:15 quest:3 |
| 0x13a993c | online-nex | worker | B | 调 0x139e3d0/0x130a7d4/0x130ca48/0x139e41c/0x13a0d08，票 online-nex:4；`quest:1` 来自弱节点 0x139e41c |
| 0x13a9a9c | online-nex | worker | B | 127 指令，调 0x139e3d0/0x130a8c4/0x13efc80/0x13a7094/0x139e41c/0x13a0d08，票 online-nex:5 |
| 0x13a9c98 | online-nex | orchestrator | B | 9 callee（0x139e3d0/0x13efcc4/0x13efc80/0x130a7a8/0x13a8998/0x130ca48/0x130a804…），票 online-nex:8 |
| 0x13a9f1c | online-nex | worker | B | 调 0x139e3d0/0x130a7a8/0x13a8998/0x130ca48/0x139e41c/0x13a0d08，票 online-nex:5 |
| 0x13aa0d0 | online-nex | worker | B | 调 0x139e3d0/0x130a7a8/0x130ca48/0x139e41c/0x13a0d08，票 online-nex:4 |
| 0x13aa228 | online-nex | orchestrator | B | 495 指令，≥12 callee（0x13a0a50/0x13a347c/0x130a8bc/0x13a9c98/0x13a9f1c/0x139e584…），票 online-nex:16；`render-gfx:2` 来自导入跳板 |
| 0x13aa9e4 | online-nex | orchestrator | B | 10 callee（0x139f8c4/0x139f8fc/0x130a7a8/0x139e49c/0x13a0934/0x13aab54/0x13aad2c…），票 online-nex:10 |
| 0x13aab54 | online-nex | worker | B | 调 0x13aaff4/0x13abaec/0x13aae14/0x13a882c/0x13a88c4/0x130b338/0x13a59e8，票 online-nex:7 |
| 0x13aad2c | online-nex | worker | B | 调 0x130a7a8/0x13acd90/0x13ace74/0x13aab54/0x130ca48，票 online-nex:5 |
| 0x13aae14 | online-nex | worker | B | 调 0x13a882c/0x13a88c4/0x13a713c/0x130a8bc/0x13a0d60/0x139e44c/0x13a3778，票 online-nex:6 |
| 0x13aaff4 | online-nex | orchestrator | B | 594 指令，≥12 callee（0x13a59d0/0x13a63ac/0x13a665c/0x13a6e4c/0x13a6ef8/0x13a88c4…），票 online-nex:28 |
| 0x13ab93c | online-nex | worker | B | 调 0x13a0d60/0x139e44c，票 online-nex:2 |
| 0x13ab9dc | online-nex | worker | B | 调 0x130b318/0x13a0d3c/0x139e44c，票 online-nex:3 |
| 0x13aba64 | online-nex | worker | B | 与 0x13ab9dc 同构（0x130b318/0x13a0d3c/0x139e44c），票 online-nex:3，2 caller |
| 0x13abaec | online-nex | orchestrator | B | 579 指令，≥12 callee（0x13a59d0/0x13a88c4/0x13a882c/0x13a63ac/0x13a6d94/0x13a6464…），票 online-nex:22 |
| 0x13ac3f8 | online-nex | worker | B | 调 0x13a0d60/0x139e44c，票 online-nex:2，4 caller |
| 0x13ac460 | online-nex | worker | B | 调 0x13a0d60/0x139e44c，票 online-nex:2 |
| 0x13ac4c4 | online-nex | leaf | C | 73 指令零 callee，2 caller，? |
| 0x13ac5e8 | online-nex | leaf | C | 18 指令零 callee，2 caller，? |
| 0x13ac630 | online-nex | orchestrator | B | 285 指令，10 callee（0x137388c/0x139bca0/0x130b318/0x130ab74/0x130aea4/0x130ab6c/0x130b35c…），票 online-nex:7；`otomo-ot:3` 来自 0x137388c/0x139bca0，无法解释，? |
| 0x13acaa4 | online-nex | worker | B | 调 0x1398b70/0x1398b84/0x1307014，票 online-nex:3 |
| 0x13acb38 | online-nex | worker | B | 调 0x130704c，票 online-nex:1 |
| 0x13acb74 | online-nex | worker | B | 调 0x139faf8/0x13aa9e4/0x139fb84/0x13acdd0/0x13b2218/0x13a0060/0x13b2264，票 online-nex:7 |
| 0x13acce0 | online-nex | worker | B | 调 0x13a0060/0x13b231c/0x139ffc4，票 online-nex:3 |
| 0x13acd70 | online-nex | leaf | C | 8 指令零 callee，1 caller，? |
| 0x13acd90 | online-nex | leaf | C | 8 指令零 callee，1 caller（0x13aad2c），? |
| 0x13acdb0 | online-nex | leaf | C | 8 指令零 callee，5 caller（0x13a5fa0/0x13a5fe4/0x13a6030/0x13a6070/0x13a60b4），? |
| 0x13acdd0 | online-nex | worker | B | 调 0x139f8c4/0x130b4b8/0x130d970（Pia 内部容器），票 kernel-os:2 online-nex:1 |
| 0x13ace64 | online-nex | worker | B | 4 指令 1 callee 0x139f8fc，票 online-nex:1，0 caller（函数指针引用） |
| 0x13ace74 | online-nex | worker | B | 调 0x13a882c/0x13a4224/0x13a4a84/0x130b4b8/0x130d9b0/0x130a8fc，票 online-nex:5 kernel-os:1 |
| 0x13acfc4 | online-nex | orchestrator | B | 11 callee（0x13a882c/0x13a4224/0x13a4248/0x130b4b8/0x130d9b0/0x13a4108/0x13a4638…含自递归），票 online-nex:10 |
| 0x13ad2b0 | online-nex | worker | B | 调 0x1398b70/0x1307014/0x13ad3b0，票 online-nex:2 kernel-os:1 |
| 0x13ad36c | online-nex | leaf | C | 17 指令零 callee，1 caller（0x13adec0），? |
| 0x13ad3b0 | online-nex | worker | B | 调 0x1307014/0x13b1ed0/0x13b1f14/0x13b2d08/0x13b2d4c/0x13b2e34/0x13b1ffc，票 online-nex:5 kernel-os:2 |
| 0x13ad624 | online-nex | worker | B | 调 0x13af720（Pia 会话配置），票 online-nex:1 |
| 0x13ad674 | online-nex | worker | B | 调 0x13af7f8，票 online-nex:1 |
| 0x13ad6a0 | online-nex | leaf | C | 5 指令零 callee，1 caller，? |
| 0x13ad6b4 | online-nex | leaf | C | 5 指令零 callee，1 caller，? |
| 0x13ad6c8 | online-nex | worker | B | 调 0x13b2fc0，票 online-nex:1 |
| 0x13ad6f8 | online-nex | orchestrator | B | 69 指令 ≥13 callee（0x130b0ec/0x139f974/0x130cbe8/0x13a7fdc/0x13acaa4/0x13a6a10…），票 online-nex:14（注册表式分发） |
| 0x13ad80c | online-nex | orchestrator | B | ≥13 callee（0x1398c30/0x13a736c/0x130704c/0x13aea70/0x13a0564/0x139c9a4…），票 online-nex:14（注册表式分发） |
| 0x13ad888 | online-nex | worker | B | 调 0x1398b70/0x1398b84/0x1307014/0x13ad6f8/0x13ad978，票 online-nex:5 |
| 0x13ad978 | online-nex | orchestrator | B | 315 指令 ≥12 callee（0x1309fcc/0x139c9f8/0x13a826c/0x139fae8/0x13acb74/0x13ad2b0…），票 online-nex:13；`render-gfx:2` 来自导入跳板 |
| 0x13ade64 | online-nex | worker | B | 调 0x13adec0，票 online-nex:1 |
| 0x13adec0 | online-nex | orchestrator | B | 9 callee（0x1398ca4/0x13a7414/0x13aece8/0x13a8bec/0x13ad36c/0x13acce0/0x139fa24…），票 online-nex:9 |
| 0x13adfc0 | online-nex | orchestrator | B | 10 callee（0x1398b84/0x1306fa0/0x13ad624/0x13a8c20/0x13a00b0/0x13a5640/0x13aed6c…），票 online-nex:10 |
| 0x13ae11c | online-nex | worker | B | 4 指令 1 callee 0x13a8cf8，票 online-nex:1 |
| 0x13ae12c | online-nex | worker | B | 4 指令 1 callee 0x13a8d40，票 online-nex:1 |
| 0x13ae13c | online-nex | worker | B | 调 0x13a0344/0x1398cf8/0x13aee10/0x13a5664/0x13a0120/0x13a8d74/0x13ad674，票 online-nex:7 |
| 0x13ae22c | online-nex | worker | B | 调 0x13ae13c/0x13adfc0，票 online-nex:2 |
| 0x13ae2a4 | online-nex | orchestrator | B | 115 指令，11 callee（0x130b0ec/0x13af8ac/0x13a8da8/0x13a8f38/0x13a567c/0x130b184/0x13aee40…），票 online-nex:10 |
| 0x13ae470 | online-nex | worker | B | 5 指令 1 callee 0x13b09d0，票 online-nex:1 |
| 0x13ae484 | online-nex | thunk | C | 3 指令零 callee，1 caller，? |
| 0x13ae490 | online-nex | worker | B | 调 0x13a64d8，票 online-nex:1 |
| 0x13ae4d8 | online-nex | worker | B | 调 0x130a8bc/0x139d3bc/0x13a7200/0x130b3d0，票 online-nex:3（`quest:1` 来自弱节点） |
| 0x13ae6b8 | online-nex | worker | B | 调 0x13a7898，票 online-nex:1，12 caller |
| 0x13ae774 | online-nex | worker | B | 调 0x13a7834，票 online-nex:1，6 caller |
| 0x13ae84c | online-nex | leaf | C | 18 指令零 callee，4 caller，? |
| 0x13ae894 | online-nex | leaf | C | 8 指令零 callee，3 caller，? |
| 0x13ae8b4 | online-nex | leaf | C | 8 指令零 callee，3 caller，? |
<!-- tally 块1-3: online-nex 300 / B 246 / C 154 / worker 235 / leaf 117 / thunk 25 / orchestrator 23 / 小计 300; 累计 300/1057 -->
<!-- END -->
