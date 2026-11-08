# React24：GU 反应码 24（reaction_38 占位名）语义钉点

派单: brief-react24（主会话）。方法: 复用 React49-reports/react49.md 的流程（handler → dispatcher 0x2f22e8 → state-64 motion id → 数据画像 → Rise DamageType 收敛）。结论分级 [C]（自跑命令贴证据）/ [B] / [U]。

## Confirmed

- [C] KB 表态复核（三表）：
  - `MHRS-private/kb/gu-react-ids.tsv:26` = `24 reaction_38 0x2f00e0 entry -> 0x2f22e8 (r1=2,38,38) ... C  meaning [U]`。
  - `MHRS-private/kb/gu-rise-react-map.tsv:26` = react 24, 3 GU 行, rise_type `-`, tag U，注 "Rise DamageReaction 38 = LanceCounter_M:173116 is guard-class, implausible for these rows -> no candidate"。
  - `MHRS-private/kb/gu-react-usage.tsv` react 24 行：见下文数据节。
- [C] handler 与 49 同构已被 react49 报告先行证实（react49.md 命令索引行 "handler 24/49 同构 | disasm 0x2f00e0/0x2f0118"）；本报告自跑 disasm 0x2f00e0 复核：`002f0104 mov r1,#2; 002f0108 mov r0,#0; 002f010c mov r2,#38; 002f0110 mov r3,#38; 002f0114 b 0x2efb94`（前置 `ldrh r0,[r9,#0x3248]`==0 时清 pl+0x28b8/0x28bc，与 0x2f0118 完全同构）→ **motion 对 (38,38)**，经 0x2efb94 与 react 2/31/49 同管线。
- [C] range switch 表（read_words 0x2f259c, 96 词）：id1=38 → 下标 34 → 词 @0x2f2624 = `0x000001b4` = 默认分支 → **(38,38) 不被重映射**（对照 react49 记录：67−4=63 → 默认；特判只发生在 16/20/21/22..24/110/111 的 cmp-immediate 分支，0x2f258c..0x2f2750）。0x180（→0x2f271c）出现在下标 0..3(id 4..7)/16,17(id 20,21)/32(id 36)/56,57(id 60,61)。
- [C] 数据画像（gu-attackdata-all.tsv 6044 行直读，node one-liner）：react 24 = **3 行，全部 `attack` kind，0 shell**：
  - em033_00 row29 off 0x3b0：dmg 60, attr 0x0001, hts 1, u18 0, u1a 2, u1d 5, kb0a 12800 (=50.0)
  - em033_00 row36 off 0x490：dmg 60, attr 0x0001, hts 1, u18 1, u1a 2, u1d 5, kb0a 12800 (=50.0)
  - em068_00 row24 off 0x310：dmg 30, attr 0x0001, hts 18, u18 50, u1a 2, u1d 0, kb0a 12800 (=50.0)
  - 三行 kb0a=12800 全同；±6 邻域：em033 rows 24..36 = react 1,1,2,1,44,24,12,13,3,2,2,3,24（dmg 15..140）；em068 rows 19..31 = react 1,1,1,1,2,24,12,2,13,2,31,2,1（dmg 3..100）→ 与 49 一样是**连击串内交替**，且两怪都在 react24(60/30) 后紧跟 react12(15)。
- [C] **与 49 的结构性差异**：motion id1=38 **不在** dispatcher 0x2f22e8 首表白名单 {2,4,6,12,13,14,15,18,25,67,80}（react49.md）→ react 24 **不发 vtable+1848(0x738)(this,1) 击退类动作请求**，直接 `bl 0x27bcd0` 落主体；react 49 (id1=67) 有该 arm。→ 38 是"无击退 arm 的命中动作"。

- [C] **宿主身份更正与 Rise 缺席**：monster-slot-map.json:265 emid 33 = **Akantor 霸龙**（slot 29），:517 emid 68 = **Najarala 绞蛇龙**（slot 57）——先前"em033=Seditious Tigrex"是错误联想，已废弃。Rise `EmGenus`（Enums_Internal.hpp:20788-20848）全表 **无 Akantor、无 Najarara** → 两只 GU 宿主在 Rise 均无对应物，React49 的"宿主重合"证据线不可用（这正是 ReactRest/FOR-SE-REPLY §67.1 判"保持继承"的核心理由）。
- [C] **Rise 枚举原文（自读复核）**：`snow::hit::DamageType`（Enums_Internal.hpp:81136-81180）knockback 家族 1..9 = None1/KnockBack2/FallDown3/Buttobi4/ButtobiNoDown5/ButtobiSp6/ButtobiNoEscape7/Upper8/ButtobiSlamDown9；另有 ButtobiHm=38、RecoverableUpper=33、QuakeIndirect=37、Max=42。`DamageReaction`（:173077-173183）38 = LanceCounter_M（guard 族，与命中通道无关）。
- [C] 首表自证：read_words 0x2f23a0×12（下标 32..43 = motion id1 34..45）全 `0x150` → id1=38（下标 36 @0x2f23a8）= 默认分支，与 reactrest.md 记录一致。

- [C] **引擎谓词 0x2c7dc4 把 motion 38 与 state-128 强制态编为一组**（disasm 0x2c7dc4, 27 insns）：`ldrh r1,[r0,#0x2506]`（当前动作 state）`cmp #64` → state==64 时 `ldrh r1,[r0,#0x250a]`（动作 sub）`cmp #38; bxeq`（返回 1）；state==128 时 `sub r0,r0,#2; cmp #18; bcs` + 位测试 `tsts r0,r2,lsr r1`，掩码字面量 `movw #0xed99; movt #3` = 0x3ed99（bit(sub−2)，置位集 {2,5,6,9,10,12,13,14,15,16,19}）。**唯一被单值点名的 state-64 sub 就是 38 = react 24 的 motion id**。callers = 6 处（calls_to 2915780）：0xc7490（引擎核心缓存）、0x29b6f4/0x29b70c（pl+0x3324 标志缓存：谓词→1 时 gate，见 disasm 0x29b6e0）、0x2cbc24（0x2c7d6c/0x2c7dc4/0x2c7e28 三谓词串联判"玩家正处于任一强制态"，命中即早退 0x2cbbb8）、0x2f55b0（同样三段 gate：0x2f7ad8→0x2c7dc4→0x282f58(0,2048)→0x27b918→vt+1704）、0x11272a8。→ 语义：**38 与 state-128 的 12 个 sub 同属"玩家失去操作权的受迫状态"族**，供其它系统查询"玩家被压制中"。
- [C] **Rise 宿主 DamageType 普查（rise-attack.tsv 5748 行直读）**：port 宿主 em032_00 (Tigrex) = {Buttobi 40, ButtobiNoDown 10, KnockBack 2, FallDown 3, WindS 1, EarL 1, GrappleAttack 1}；em095_00 = {ButtobiNoDown 24, Buttobi 21, Upper 12, FallDown 8, ButtobiSp 1(泥団子叩きつけ dmg90), KnockBack 1, None 4, EarL 1, GrappleAttack 1}。**两宿主都没用 QuakeIndirect(37)/Tornado(31)/TornadoAttack(32)/ButtobiHm(38)**。
- [C] **GU 反应 24 无对应宿主**：em033 = Akantor（monster-slot-map.json:265，cn 霸龙）、em068 = Najarala（:517，cn 绞蛇龙）均**不在 Rise EmGenus**（Enums_Internal.hpp:20788-20848 全表核对）→ React49 的"宿主重合"证据线对 24 不可用。
- [C] **calls_to 全图复核**：0x2831e0 = 208 个直接调用点（此前 ReactRest 记 202，现表 +6：0x2d035c 等），0x2c7dc4 = 6 个调用点，与 ReactRest/React49 记录相容；本次派单对 0x2ef150/0x2ef274/0x2efdd8/0x2cbc14/0x29b6f4/0x11272a8 的 calls_to 描述（ReactRest 报告）已被复核。
- [C] ReactRest（`MHGU/docs/analysis/re/ReactRest-reports/reactrest.md`，FOR-SE-REPLY §67.1 镜像）已先行钉点：handler/dispatcher/子开关/kb 档与本报告全部复核一致（0x2f2410[36]=0x150、0x2f2624[34]=0x1b4、(38,38)×2 施加、kb 50 档）；本报告在其上补做 React49 式 Rise 侧语义收敛（宿主普查 + engine 谓词分组 + 三查）。

## In progress

（无 — 已收敛到结论节）

## 结论（gu_react 24）

**24 = GU 命中通道的"特殊击退（无击退 arm）"反应 → 在 Rise `snow::hit::DamageType` 里找不到可静态钉死的成员，维持 no candidate；`REACT_NO_CANDIDATE` 中 24 保留不动（hits.mjs:246）。**

推理链（每步都有上文 [C] 行）：
1. 完整链路字节级自证：主开关 `0x2ef98c[22]=0x754` → handler `0x2f00e0`（清 pl+0x28b8/0x28bc，(r0,r1,r2,r3)=(0,2,38,38)）→ `b 0x2efb94`（`str r1,[sp]; str r0,[sp+4]; uxth r1,r8; bl 0x2f22e8`）→ dispatcher 首表 `0x2f2410[36]=0x150` 默认分支（**无 vtable+1848 击退 arm**，与 49 的 0x13c 分支直接对比）→ range 表 `0x2f2624[34]=0x1b4` 不重映射 → 终点 `0x2831e0(pl,64,38,12)` ×2。数值 38 全程只是 **state-64 受击动作子 id**，不是任何 Rise 枚举下标。
2. 引擎侧语义钉点：谓词 `0x2c7dc4` 把"state-64 sub==38"与"state-128 sub ∈ 0x3ed99 位集"编为同一"玩家受迫失权态"查询（6 个 caller 全部用作压制门）。GU 自己把 38 归入**强制态族**，不是普通よろけ（那走默认 arm 0x2effac）也不是击退动作请求（那走 0x13c arm）。
3. 数据侧：3 行（Akantor ×2 + Najarala ×1），全部 `attack` 类、attr 0x0001（无状态 flag）、kb0a=12800=50.0 与 react 2 主档同量级、行内与 react 1/2/3/12/13/31/44 交替 → 它是命中通道里"特殊一档"的小击退，不是独立机制（无新管线、无技能门）。
4. Rise 侧收敛失败的三条独立理由：
   - **宿主缺席**：em033=Akantor、em068=Najarala 均不在 Rise `EmGenus`（无宿主 anchor，React49 的宿主重合法不可用）；
   - **数值巧合死路**：占位名 reaction_38 暗示的 `ButtobiHm=38` 在 rise-attack.tsv 5748 行里 **0 用户**（死枚举值）；
   - **语义无对应**：GU"无 arm 的特殊小击退/强制态"在 Rise 词汇里没有专属成员——宿主用词是 Buttobi(4)/ButtobiNoDown(5)/Upper(8)，Rise 衝撃波用 Upper(8)、风爆用 Tornado/TornadoAttack(31/32)、地震用 QuakeS/L(13/14)；家族空位 5/7/8 无一能凭字节证据胜出。

### 若将来强行写表的 [U] 级候选（不推荐、未采纳）

- `ButtobiNoDown = 5`（ Enums_Internal.hpp:81141）：port 宿主 em032/em095 的最大族（10+24+50 行），"吹飞但倒地规则不同"最接近"无 arm 的特殊小击退"；FOR-SE-REPLY §67.1 同判。
- 对应的 hits.mjs 改动（**本派单明确不做**，仅备档）：在 REACT Map 尾加 `...reactIds(5, [24]), // ButtobiNoDown: GU react 24 motion-38 forced knockback (React24 report, tag [U])` 并从 :246 `REACT_NO_CANDIDATE` 删除 24、更新 :239-241 注释。采纳前必须实机确认 motion 38 手感（见 Unknown）。

### 阴性核对（扫描集 + 会找到映射的模式）

| 扫描 | 路径/命令 | 若有映射应命中的模式 | 实测 |
|---|---|---|---|
| Rise 全表 DamageType 普查 | MHRS-private/kb/rise-attack.tsv（5748 行，node 直读） | damage_type=38(ButtobiHm) 或 33(RecoverableUpper)/37(QuakeIndirect) 的宿主行群 | 38=0 行；33=26 行（拘束爆破/D-server/Valphalk/em089/em135，语义不合）；37 只在 49 报告的地震/风系 |
| 宿主存在性 | Enums_Internal.hpp:20788-20848 EmGenus 全表 | Akantor/Najarara/同族成员 | 无 |
| 宿主用词 | rise-attack.tsv em032/em095 直方图 | 宿主有 react-24 同类专属词（如独占 DT） | 宿主只用家族通用词 4/5/8/2/3 |
| GU 侧机制分类 | disasm 0x2f00e0/0x2efb94/0x2c7dc4 + read_words 0x2f23a0/0x2f2624/0x2ef9e4 | (38,38) 落 0x13c arm 分支或被子开关重映射到击退对 (4,5)/(25,36)/(67,67) | 0x150/0x1b4 = 默认，无 arm 无重映射 |
| 音波/衝撃波词汇 | rise-attack.tsv name_jp 含 音波/気流/波動/衝撃波 | 存在"音波击退"专属 DT | 衝撃波→Upper(8)，気流→Tornado 族，音波 0 行 |
| 引擎分组 | calls_to 0x2c7dc4 + disasm | 38 出现在击退族谓词（如与 4/5/25/36/67 并列的位集） | 38 与 state-128 强制态位集并列（强制态族） |

## Unknown

- GU motion 38 的具体动画帧/手感（.mot/bhvt 侧，超出本派单）：是"重よろけ"还是"短上抛"静态不可分；这是 ButtobiNoDown(5) 与 Upper(8) 无法裁决的直接原因，也是 [U] 级候选不能转正的原因。
- em033 row29/row36 与 em068 row24 的招式名（GU 侧行由 callee 装载，gu-motion-attack-link-all.tsv 未覆盖；Akantor 热线/超咆哮、Najarala 涡鸣板音波是表象候选，仅 [B] 级联想，未写入证据链）。
- [sp,0]=2（r1）参数在 0x2f22e8 内的完整消费路径（React49 报告记录为 [sp,0] 固定值差异，本次未再展开）。

## Self-FalsificationCheck

- **证伪尝试 1（"38 在白名单里"）**：自读 0x2f23a0×12（下标 32..43），id1=38 @0x2f23a8 = 0x150 → 不在。若在，react 24 会获得击退 arm，改判为 Buttobi 族高概率——被字否定。
- **证伪尝试 2（"数值 38 = ButtobiHm"）**：rise-attack.tsv 全表扫 damage_type==38 → 0 行。死值，纯占位名巧合（与 react 24 的 gu_name=reaction_38 生成规则一致，react49.md 证伪尝试 4 同源）。
- **证伪尝试 3（"宿主上有锚"）**：先记了 "em033=Seditious Tigrex" 的错误联想（rise-attack.tsv em032 有 ButtobiSp 行），复核 monster-slot-map.json 后确认 em033=Akantor、em068=Najarala，Rise 无此二怪 → 锚不存在。错误联想已废弃并记录。
- **证伪尝试 4（"谓词分组是巧合"）**：0x2c7dc4 的 `cmp r1,#38; bxeq`（0x2c7e18）是 state-64 分支里**唯一**的精确比较（state-128 走位集）；若 38 是普通よろけ，谓词应与其它 state-64 sub 一样不出现。字节不支持巧合说。
- **证伪尝试 5（"ReactRest 旧结论可能没跑 React49 方法"）**：ReactRest 的 dispatcher/子开关/kb 行全部复核为真（0x150/0x1b4/50.0/3 行），其"无对应物可钉死"判断建立在宿主缺席上，本报告新增的谓词分组与 ButtobiHm 0 用户两条独立证据收敛到同一结论——未被推翻，被加强。
- 未能证伪的结论：**24 无 Rise DamageType 映射，维持 REACT_NO_CANDIDATE**。

## Difficulties

- **两份先行报告并存**：ReactRest（GU 侧机制已钉死、判保持继承）与 React49（给了新的 Rise 侧收敛方法）口径不同。本报告按派单复用 React49 方法重跑，结论与 ReactRest 一致但证据面更宽（+谓词分组、+宿主普查、+音波词汇普查、+ButtobiHm 死值证明）。
- **宿主身份陷阱**：em033 曾被 (本人第一轮) 误当成 "Seditious Tigrex 变体"从而误接上 em032 的宿主证据；monster-slot-map.json 复核后纠正为 Akantor。教训：port-<emid>/ 目录名（如 port-em033/host=em032）是**移植宿主选择**，不是怪物身份。
- **MCP 参数坑**：calls_to 首发用十进制 28244448 当 0x2831e0（错值 → 0 hits），且参数名应为 `targets` 数组——两次重试才命中；read_words 系列一切正常。
- **ReactRest 记的 calls_to 0x2831e0=202 与本次 208 不一致**：未再深挖（差 6 个点，可能为统计口径/镜像版本差异），不影响 24 的结论（24 的链路各点已字节级自证）。

## 命令与产物索引

| 结论 | 证据 |
|---|---|
| 主开关表项 react24=0x754 | read_words 0x2ef9e4（表基 0x2ef98c，r1=0x2ef974+8+20；disasm 0x2ef960 头部 `sub r0,r7,#2; cmp #72`） |
| handler (0,2,38,38) | disasm 0x2f00e0（0x2f0104..0x2f0114） |
| wrapper | disasm 0x2efb94（str [sp]/[sp+4] → bl 0x2f22e8） |
| 首表 id1=38 → 默认 | read_words 0x2f23a0×12（0x2f23a8=0x150） |
| range 表 38 → 默认 | read_words 0x2f259c×96（0x2f2624=0x1b4） |
| 谓词 38=强制态族 | disasm 0x2c7dc4（cmp #38 @0x2c7e18；掩码 0x3ed99 @0x2c7df4）；calls_to 0x2c7dc4=6 |
| 谓词 caller 用法 | disasm 0x29b6e0（pl+0x3324 缓存）、0x2cbc10（三谓词串联）、0x2f5590 |
| 3 行画像/邻域 | node 直读 gu-attackdata-all.tsv（行 1786/1793/3277） |
| 宿主身份 | monster-slot-map.json:265/:517；EmGenus Enums_Internal.hpp:20788-20848 |
| Rise 枚举 | Enums_Internal.hpp:81136-81180（DamageType）、:173077-173183（DamageReaction 38=LanceCounter_M） |
| DamageType 普查 | node 直读 rise-attack.tsv 5748 行（em032/em095 直方图；DT 38=0 行；DT 33=26 行清单；音波/衝撃波名 census） |
| 先行报告交叉 | MHGU/docs/analysis/re/ReactRest-reports/reactrest.md（0x2f2410/0x2f2624/0x2831e0/0x2c7d20 行）；MHRS/docs/reference/FOR-SE-REPLY.md §67 |
