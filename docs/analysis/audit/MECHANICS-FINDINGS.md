# MECHANICS 切片审计（mechanics / save-layout / analysis-members / analysis-monsters / analysis-fields）

> 审计对象：`docs/analysis/audit/slices/{mechanics,save-layout,analysis-members,analysis-monsters,analysis-fields}.txt` 的 32 份文档。
> 判定词表：OK / WRONG / STALE / UNVERIFIABLE / MISSING / NA（与 MHRS round-1 同）。
> 方法：每份文档取 3–5 条承重数字，**从它自己指名的产物重算**（存档快照、`docs/data/mhgu.db`、
> `docs/data/member-offsets.tsv`、`docs/data/json/*`、`main.140.flat.bin` 反汇编），不与其他文档互相对比。
> 复现工具：`bun:sqlite`（node 24 内建 sqlite 亦可）、`tools/mhgu/arm32.mjs`（`rd32`/`disasm`）、
> `node:zlib`。存档坐标系：system 槽基址取自 `[0x34+4i]+0x24` =
> `[1625244, 2803040, 3980836]`（`editor/core/container.mjs` 同法）。

## 0. 速览（每份文档一行；非 OK 的逐条证据见后文）

| 文档 | 判定 | 一句话 |
|---|---|---|
| mechanics/equipment.md | OK | 装备箱 25326/2000/36B/97326、珠 id 2638..2888、`type=class+6` 全部复现 |
| mechanics/monster-ai-params.md | OK | 12 个符号地址逐字节命中 |
| mechanics/monster-classes.md | OK | 13 个注册函数的记录数与 `member-offsets.tsv` 完全一致 |
| mechanics/monster-code-map.md | OK | pc 相对实例 `0x48c60→0x15526BE` 与 crc32raw 常量复现 |
| mechanics/monster-state-machine.md | OK（抽样） | `0x1120ee0` 18 槽跳转表逐槽复现 |
| mechanics/monsters.md | OK | 129/893/93/108/728(91×8) 全部复现 |
| mechanics/quests.md | OK（2 项 UNVERIFIABLE） | 1355/375/569/228/17/166、944 条 json、keyType 分布、G4 782-862+939-943 复现 |
| mechanics/skills-arts.md | OK | 204/205/326/242/182+60/143/64 全部复现 |
| mechanics/systems.md | **WRONG** | 「61 个食事技能」→ 产物是 64 |
| save-layout/CURRENT-RULING.md | **WRONG** | 计数器区间差 1 字节、137 槽分段算术错、Permit 98→103 |
| save-layout/contradictory-bits-verdict.md | **WRONG** | Permit 98→实际 103；「501 含非 quest 位」被否证 |
| save-layout/coverage-map.md | **WRONG** | `0x2C0B..0x59AC=15075B`、`227,386B` 两处算术错，vol_only 数字已变 |
| save-layout/member4-semantics.md | STALE | 行 107..134 的 file_off 比权威布局早 4 B（布局 10-24 已 +4） |
| save-layout/name-tables-key.md | OK | 四个名字块地址与成员名序逐条命中 |
| save-layout/pouch-verified.md | OK | 口袋 32×19bit 两档解码逐槽复现（含空槽位置） |
| analysis/members/member-census.md | OK | GOT 6/6、19 bl + 1 b、member[0] 2292、member[3] 2000×44 |
| analysis/members/member4-header.md | STALE | 链尾 0x5E9E/0x5EA2 现为 0x5EA2/0x5EA6；其余（4 个 movw、1024B 头）复现 |
| analysis/members/member4-17-layout.md | OK（附 3 处小错） | member[4]/[5] 读点与位流复现；跨度 72→71 B，汇总表漏 2 个 reader |
| analysis/members/member14-17-semantics.md | OK | 6248/160/263/10371 与 `0x3783A-0x335A8` 闭合 |
| analysis/members/member15.md | OK（1 项 WRONG、编号错） | 6 块求和 28,404、zlib 6,328 全零复现；「diff=0/6328」不成立 |
| analysis/members/member4-residual.md | OK | 21×/15× 循环（840+600=0x5A0）、+0x550 复现 |
| analysis/members/palico-324.md | OK | 35131 闭合、9×RGB 0xFF、+0x9C 主人名复现 |
| analysis/members/review-member4-17.md | OK | 位宽 cap→width 算术全部成立；其 E1/E2 校正是对的 |
| analysis/monsters/mon-ai-entry.md | OK | E1 `mov r1,#360`、E5 派发签名、E9 `0x15533cf` 复现 |
| analysis/monsters/mon-class-map.md | OK（size 列 UNVERIFIABLE） | 42 成员计数、名字串、3205 注册点复现 |
| analysis/monsters/mon-counter-slots.md | OK | 166 项表、`0x1597ea4` 137 项 slot==index、94+43 复现 |
| analysis/monsters/mon-em-units.md | OK | 137 指针、k=58/61/71/105/135/136 逐条复现 |
| analysis/monsters/mon-quest-dispatch.md | OK | 114 项、49 目标、共享块 14/14/6/6/9/22、cond10/11/27 复现 |
| analysis/monsters/mon-size-calc.md | OK | 42 条/值域 92..125/17 条等值/i=26 154 复现（U5 异常已被新槽表解释） |
| analysis/fields/fam-288.md | OK | 15 槽×0x120、10 槽落盘、+0x550 提示与布局一致 |
| analysis/fields/fam-small.md | **WRONG** | 横幅「本文 file_off 早 0x550」与正文已修正的 0x2FC7/0x3157 自相矛盾 |
| analysis/fields/records-128.md | OK | 15×128 连续、16 个 bl、+0x5C 对表结构复现 |

**合计：OK 25 / STALE 2 / WRONG 5（文档级，共 32 份）；另有 7 项条目判不了或未逐条覆盖（分布在 7 份文档，见 §6）；doc 级只按「是否破坏用途」判，条目级判定见 MECHANICS.tsv。**

> **本合计是审计当时（2026-11-04 早）的状态，其中 4 条 WRONG 已经修好，勿再按此表重做**：
> `fam-small.md` 已加坐标勘误横幅（明确"不要再给这些偏移 +0x550"）；`CURRENT-RULING.md:82-83` 已改为 `24230..24503`、槽位 `0..70+112..134` / `71..111+135..136` 且无保留槽；
> `contradictory-bits-verdict.md:10` 已改为 Permit **103**；`coverage-map.md:200` 已改为 226,754 B、227,386 作为结束偏移。
> 也就是说 **"WRONG 5" 不是当前状态**，只是当次审计的计数；剩下的判定请以各文档自己的更正横幅为准。

---

## 1. save-layout 组（6 份）

### 1.1 `CURRENT-RULING.md` — **WRONG**

复现命令（槽基址 = `[0x34+4i]+0x24`）：

```js
const b=fs.readFileSync('save-snapshots/20261022-v6-ready/system');
const base=[b.readUInt32LE(0x34)+0x24, b.readUInt32LE(0x38)+0x24, b.readUInt32LE(0x3c)+0x24];
// => [1625244, 2803040, 3980836]
```

| # | 文档断言 | 实测 | 判定 |
|---|---|---|---|
| 1 | 「dirty 档 501 个 `cleared=1&seen=0`（slot0:122 + slot1:379）」 | slot0 contra=122，slot1 contra=379，合计 501（`cleared` 读 0x2C77、`seen` 读 0x2D77，各 256B LSB-first） | OK |
| 2 | 「`system_fixed` 用 `seen\|=cleared` 收敛 501→0」 | `system_fixed` slot0/slot1 contra 均 0；seen 1007→1129、500→879（正好 +122/+379） | OK |
| 3 | 「`dirty 0x4447..0x4598` 有 182 个 0xFF（**clean 同区全 0**）」 | dirty 182 ✓；clean=slot1（猎人A）该区 **0 个 0xFF**，但**不是全 0**——有 91 个非零字节；若换 clean slot0（猎人B）则另有 28 个 0xFF | OK（「全 0」措辞需改为「无 0xFF」） |
| 4 | 「击杀段 `char_off 24230..24502` = 274B = 137×u16」 | 24230+274 = **24504**，故末字节是 **24503**；写成 24502 只有 273B | **WRONG**（差 1 字节） |
| 5 | 「槽 0-92 = 94 大怪 / 槽 93-128 = 43 小怪 / 槽 129-136 = 8 保留槽全 0」 | 静态表 `0x1597ea4`（137×`{u32 emid,u32 slot}`，slot==行号）：大怪 **0..70 + 112..134 = 94**，小怪 **71..111 + 135..136 = 43**，**无保留槽**。dirty 档 kill[135]=247、kill[136]=117（clean 档为 0/0，故低进度档看不出来） | **WRONG**（三段范围与计数自相矛盾：0..92 是 93 槽；且 129..136 非保留） |
| 6 | 「矛盾位 = Permit 98 + Arena 3 + Guild G★14 16 + …」 | 122 位映射 sort_order：Permit（944..1171）**103** + Arena（1172..1174）3 + Guild★14 16 = 122 | **WRONG**（98→103） |

> 说明：第 1/2 条是本轮唯一「实测通过」的部分，也是文档的操作性结论；第 4/5/6 条会被下游直接照抄，必须改。
> 第 5 条的正确表述见 `coverage-map.md`「137 槽真实布局」；第 3 条只需把「全 0」改成「无 0xFF」（clean slot1 有 91 个非零字节，但确实 0 个 FF）。

### 1.2 `contradictory-bits-verdict.md` — **WRONG**

| # | 文档断言 | 实测 | 判定 |
|---|---|---|---|
| 1 | 「矛盾位 122（原报告 501）」 | 122 ✓（slot0）；501 = 122+379（slot1） | OK |
| 2 | 「Permit 98 个 / Arena 3 / Guild G★14 16 / Permit HR★1-10 若干」 | Permit 103 / Arena 3 / Guild★14 16，合计 122；Permit 内部：LR★1-3 各 4、HR★1-3 各 5、HR★5 2、HR★6-10 各 5、G★11-16 分别 7/8/9/6/8/11 | **WRONG**（98 无法凑出 122） |
| 3 | 「0 个落在普通村/集任务」 | 对 **slot0 的 122 位**成立；对文档 §1 所称的整个 dirty 档（501 位）**不成立**：slot1 的 379 位 = Village 189 + Permit 184 + Guild 3 + Arena 3（0 个未匹配） | **WRONG**（作用域标错） |
| 4 | 备注：「501 是按另一坐标系（**含非 quest 位**）统计」 | slot1 的 379 位**全部**落在 quests.sort_order 0..1354 内（按 `mhgu.db` 反查 0 个 NOMATCH）⇒ 不存在「非 quest 位被计入」 | **WRONG** |
| 5 | 「G4 = 782-862 + 939-943」 | `hub='Guild' and stars=14` 共 86 行，sort_order 恰为 782..862（81）+ 939..943（5） | OK |

### 1.3 `coverage-map.md` — **WRONG**（大面积正确，但有 3 处会被直接引用的算术错）

复现（同 §1.1 坐标系；clean=slot1 基址 2803040，dirty=slot0 基址 1625244）：

| # | 文档断言 | 实测 | 判定 |
|---|---|---|---|
| 1 | 632B 头跨档差 **88/632**；playtime 70310/1560082；gold 3355345/8345419；HR 8/198 | 逐项相同（88 字节差；70310/1560082；3355345/8345419；8/198） | OK |
| 2 | 头名 = `猎人A` / `猎人B` | 字节实为 **`Sakiko` / `Lay1nn`**（同两档、同 HR/时长） | STALE（改名） |
| 3 | 「HR 有第二副本 @`0x0B1`」 | 两档 `char_off 0xB1` 均为 `00`；全 632B 头内除 `+0x28` 外无任何字节等于 8 或 198 | **WRONG**（或坐标未注明） |
| 4 | 尾部 `0x80000..0x11F8A0` 653,472B、非零率 **72.62%**；C0..C7 求和 653,472 | 非零 474,575/653,472 = **72.62%**；C0..C7 八项求和 = 653,472 | OK |
| 5 | 跨档尾部 `0xC8800..0x11F8A0` 相异 **239,842B = 67%** | 239,842 / 356,512 = **67.27%** | OK |
| 6 | 「`0x2C0B..0x59AC` = **15075B** 成员#4」 | `0x59AC-0x2C0B = 0x2DA1 = 11681`；成员#4 实际跨度 `0x2C0B..0x5EA6` = **12955** | **WRONG** |
| 7 | 「成员层 `0x278..0x3783A` = **227,386B**」 | 0x3783A = 227,386 是**终点偏移**；长度 = 227386-632 = **226,754** | **WRONG** |
| 8 | 「dirty 猎人B：kill&vol=56/vol_only=13；编辑器对齐 70/0」 | 现快照复算 = **59/15** 与 **73/1**（clean 猎人A 的 20/22 与 33/9 逐字吻合） | **WRONG**（结论方向不变：编辑器对齐仍更优） |
| 9 | 137 槽布局「0..70 大 71 / 71..111 小 41 / 112..134 大 23 / 135..136 小 2」 | 与静态表 `0x1597ea4` 完全一致（94+43，无保留槽） | OK |
| 10 | 体型段 42 条非零、值域 92..125、i=26 maxi=154 | 复算：42 条、mini 92..124、maxi 93..125、共 17 条 mini==maxi、dirtyB i=26 = 94/154 | OK |

> 注：文档自己已把旧数字标 `superseded`，第 6/7/8 条是**未被标注**、仍在正文承重位置的错数。

### 1.4 `member4-semantics.md` — **STALE**（相对 2026-10-24 布局）

权威表 `member4-file-layout.txt` 抬头写明：**「134 static bl … = 12,951 B + 1 nested 4 B read (0x51e49c) = 12,955 B (0x329B)；2026-10-24 rows 107..134 +4」**。
逐行对比（按 obj_off 配对）：

```
rows 134  file_off mismatch 28
#107 sem 0x5057 vs layout 0x505b   #109 0x505f/0x5063   #117 0x50af/0x50b3
#119 0x50b7/0x50bb  #121 0x50ba/0x50be  #122 0x5e2e/0x5e32  #134 0x5e9e/0x5ea2 …
```

| # | 文档断言 | 实测 | 判定 |
|---|---|---|---|
| 1 | 「成员#4 的 134 行占 `0x2C0B..0x5EA2`（12,951B）」 | 实为 `0x2C0B..0x5EA6`（12,955B）；布局表 135 行静态 size 和 11,595，含 21/15 次循环 = 12,955（`0x329B`） | STALE |
| 2 | 「obj+0x72C / 0x83E 落点 file `0x5EA2..0x5FB4` / `0x5FB4..0x60C6`」 | 实为 `0x5EA6..0x5FB8` / `0x5FB8..0x60CA`（`0x5EA6+0x112=0x5FB8`，`+0x112=0x60CA`，`+548=0x62EE` 与 member[3] 起点闭合） | STALE |
| 3 | 行 107..134 的 file_off（28 行） | 全部比布局表低 4 | STALE |
| 4 | 「128B 族现行值 `0x45DF..0x4CDF`」 | 15×128 应到 `0x4D5F`（末行起点 0x4CDF + 128）；coverage-map 的 `0x45DF..0x4D5F` 才对 | WRONG（小） |
| 5 | Δ=FF38 / FF56 / 132 位勋章 / 68B 族 FF63-53-62 | `member4-diff.txt` 逐行复算：0x2C77 → diff 118/FF 38；0x2D77 → 141/56；0x4447 → 64/63；0x44CF → 66/53；0x4557 → 66/62；0xC28 dirty = `ff×16+0x0f` = 132 个 1 | OK |

> 修复方式：把行 107..134 的 `file_off` 与 §0.1/§5-1/§5-7 的计数器坐标统一 +4（不要用「全部 +0x550」那种平移）。

### 1.5 `name-tables-key.md` — **OK**

```
0x1569180 -> "…sUserInfo mUserData.rank_quest[no] rabbitNo rabbitRecordNo cTrialArts
              mGuild[0..2] mOld[0..2] mAirhike[0..2] mBushi[0..2] mKizuna[0..2] mTatsujin[0..2]"
0x15606b0 -> "cAcPlayerEquipXML mSupperArtsX1[0..4] mSupperArtsX2[0..4] mSupperArtsX3[0..4]
              mEmType mHeadType[0] mHeadItemNum[0] …"
0x15626c0 -> "…cQuestDaily mTargetEmType mZenny mItemID[0..5] cQuestDailyXML …"
0x155364c -> "cAmuletBase mPrice mRare cAmuletBaseXML cAmuletSkillBase mSkillType mMinValue …"
```

四个块地址、成员名顺序、`mSupperArtsX1..X3` 三组×5 全部命中。288B 族 = 6 成员 × 48B（384 bit）的
算术与 `member4-file-layout` 的 288B 行一致（5 组 ×864）。判定 OK。

### 1.6 `pouch-verified.md` — **OK**

19bit（id 12 + cnt 7）LSB-first、32 槽、基址 10175：

```
clean: 10,10|88,6|16,1|18,5|21,5|24,5|23,4|6,1|56,20|273,1|275,1|40,1|41,1|42,1|43,1|77,1|7,1|73,4|空×3|29,1|28,2|31,3|空×10
dirty: 10,1|18,4|28,2|33,3|40,1|41,1|42,1|43,1|56,20|88,10|329,1|330,1|84,1|73,8|23,5|24,4|77,1|16,4|21,4|29,1|32,2|31,3|90,2|59,5|空×8
```

与文档列出的两串**逐槽相同**（含空槽位置）；最大 id 275/330 在合法域；76B = 32×19/8。
箱区 632 起同编码解出 id 1..27/cnt 99，支持「同一套编码」。

---

## 2. analysis/members 组（8 份）

### 2.1 `member-census.md` — **OK**

```
0x3e77b0 窗口内调用 = 19 bl + 1 b（0x3e77c4…0x3e7920 bl，0x3e7934 b 0x2282a8）
顺序 = 0x19a4ec,0x19e0ac,0x51dbb4,0x14b0b0,0x3f8de0,0x1979b0,0x2755f0,0x2639ac,
       0x507d44,0x240d60,0x1a4e64,0x3f43d4,0x14c568,0x163e0c,0x15bd3c,0x539120,
       0x1c9388,0x55d2c0,0x521398
GOT 0x183a81c -> 0x1858438 | 0x183a828 -> 0x18584b8 | 0x1838d88 -> 0x1897f78
    0x1839394 -> 0x1856fe8 | 0x1838bd8 -> 0x1899458 | 0x1838d78 -> 0x18571e8   （6/6 与表一致）
member[0] 0x19a4ec: movw r7,#0x8fc(2292) ; movw r1,#0xbaf(2991) ; add r6,r5,#26 ; 步长 4
                    之后 movw r0,#0x62f4 / mov r2,#4080
member[3] 0x14b0b0: mov r7,#2000 ; add r6,r5,#44 ; 读 2/2/2/6/24（stride 44）
```
19 bl 中 `0x521398` 是 member[2] 的第二段（`0x3e7920 bl`），文档已注明；「20 次调用」按 bl+b 计成立。

### 2.2 `member4-header.md` — **STALE**（仅链尾坐标）

```
0x51dbb4..0x51dc3f = 35 条指令
movw 恰 4 条：0x51dbdc #0x72c / 0x51dbe0 #0x112 / 0x51dbf0 #0x83e / 0x51dbf4 #0x112
0x51dbc0 mov r2,#1024 ; 0x51dbc4 add r1,r5,#32   → obj+0x20 读 1024B，落 file 0x280B..0x2C0B
```
- 4 个 movw、35 指令、1024B 头、`0x280B+0x400=0x2C0B` 全部成立。
- 链尾「`obj+0x446C` → file 0x5E9E，链结束于 0x5EA2」是 10-24 修正前的坐标；现行布局为
  **0x5EA2 / 0x5EA6**（第 107 行插入的 4B nested read 已计入）。

### 2.3 `member4-17-layout.md` — **OK**（3 处小错）

```
member[4] 0x3f8de0..0x3f8e40 = 24 insns
  mov r2,#29 / add r1,r5,#94  → obj+0x5E（29B）
  ldrb [r5,#0x5D] ; movwne r0,#0 ; strb [r5,#0x72]
  add r1,r5,#52 size 4 → 0x34 ; #56 → 0x38 ; #60 → 0x3C（TAIL b 0x3df2a8）
member[5] 0x1979cc: mov r1,#32 ; bl 0x3df22c ; str r0,[r4,r6,lsl#2] ; cmp r6,#94  （94×u32 ✓）
```
小错：① `obj 跨度 0x34..0x7b（72B）` 应为 `0x34..0x7A（71B）`（29B 读覆盖 0x5E..0x7A）；
② §0.1 汇总表只列了 17 个 reader 中的 15 个（缺 member[8] `0x507d44`、member[9] `0x240d60`，正文有这两节）；
③ member[4] 「file 锚点 0x5EA2..0x5ECB，未验证」与文件链矛盾（member[3] 尾 0x21E0E+1632=0x2246E 起才是 member[4]）。

### 2.4 `member14-17-semantics.md` — **OK**

`6248 + 160 + 263 + 10371 = 17,042 = 0x3783A-0x335A8`；`0x335A8+0x1868=0x34E10`、`+0xA0`、`+0x107`、`+0x2883` 逐项闭合。
句柄槽 `0x1451500/0x145149c/0x1452f54/0x14512c0` 与 member-census 的 GOT 表一致。

### 2.5 `member15.md` — **OK**（1 项 WRONG + 编号风险）

```
6328+4400+1800+276+13800+1800 = 28,404 = 0x6EF4 = 0x335A8-0x2C6B4  ✓
char_off 0x2C6B4: 13B 头(… 1d 00 00 00) + 78 9c …
zlib.inflateSync → 6328 B, nonzero = 0  ✓
clean vs dirty 前 6328B: 3 bytes 不同（头 00 00 00 00 vs 00 00 07 00 …）
```
- 「clean 与 dirty 逐字节相同（diff=0/6328）」**不成立**：13B 头里有 3 字节不同；解压后的 6328B 才相同。
- 编号风险：本文标题「成员#15 … `0x163e0c` … 0x2C6B4..0x335A8」在本仓库其余文档里是 **member[13]**
  （`member-census` idx13、`member14-17-semantics`）；真正的 member[15] 是 `0x539120` / `0x34E10..0x34EB0`（160B）。

### 2.6 `member4-residual.md` — **OK**

```
0x51e144 movw r0,#0xe58 ; 0x51e148 mov r7,#21 ; 0x51e154/#0x51e168 两次 20B（+0 / +0x28）
0x51e170 add r6,r6,#60 ; 0x51e17c movw r0,#0x1344 ; 0x51e180 mov r7,#15
```
21×40=840、15×40=600，合计 0x5A0；旧表每对只算 80B ⇒ 少 0x550。与 `member4-file-layout.txt`
抬头「loops: rows66/67 x21, rows68/69 x15, stride 60」一致。

### 2.7 `palico-324.md` — **OK**

`5+20+27,216+7,776+40+16+48+1+5+4 = 35,131 = 0x893B`；`0x23B9D+0x893B=0x2C4D8`。
字节：rec0 名 `Miao`、`+0x9C` = `Sakiko`（= 该档猎人名；文档写的 `猎人A` 是改名前的字面值）、
`+0x11A` 9 组 `{R,G,B,0xFF}`（4 字节全 `ff`）、`+0x5B` 起 `e9 25 60 06` = `0x066025E9`（指针样残留学说成立）、
rec0..2 非零 141/146/136。

### 2.8 `review-member4-17.md` — **OK**

`cap→位宽` 表（3→2、9→4、6→3、10→4、2→2、99→7、0xBAF→12）与 `ceil(log2(cap+1))` 全部相合；
其对 member[7] 157bit=20B、member[4] 71B 的更正与我在 §2.3 的复算一致。
「17 个 bl 实为 18 个」的计数口径与本仓库 `member-census` 的「19 bl + 1 b」差 1（后者把
`0x521398` 计入）；三种口径的差异来自「是否把 member[2] 第二段算一个调用」，文档应统一。

---

## 3. analysis/monsters 组（6 份）

### 3.1 `mon-ai-entry.md` — **OK**

```
E1 0x15004c: mov r1,#360 ; bl 0x7aa154 ; ldr r0,[pc,#4084]=0x1405e8a ; add r1,pc,r0   ✓（360 槽建表）
E5 派发签名：movw r0,#0x73e0 ; ldrb ; cmp r0,#17（0x1120ee0）/ #10（0x81ca4）        ✓
E9 0x6baf0: ldr r0,[pc,#56]=0x14e78d3 ; add r1,pc,r0 → 0x6bafc+0x14e78d3 = 0x15533cf = "emXXXFwMove" ✓
E2 0x48c50/0x48c60 → 0x15526BE "cEmSizeCalcTblElement"                                ✓
```
（`0x15533cf` 段字符串实读 = `emXXXFwMove`，与文档「不是 0x15533db」的更正一致。）

### 3.2 `mon-class-map.md` — **OK**（size 列 UNVERIFIABLE）

- `findCallsTo(0x7aedcc)` = **3205** 个注册点，与「3205 个注册点」一致。
- `cEmDouMouKaData` @`0x15523cf` 后连续 44 个串 = 类名 + **42 个成员** + 下一个类名
  （`DouMouKaID … mModifyData`），「42 成员」成立；`cEmSizeCalcTblElement`/`cEmSizeYureTbl` 串地址亦命中。
- 类大小 `0x84`/`0x20` 等：以 `crc32raw(类名)` 常量和 `mov r3,#imm` 两路都未能对到 0x7aedcc 的调用点
  （名字不以字面量/哈希常量形式出现，疑经 GOT/描述符表传入）⇒ **size 列 UNVERIFIABLE**（不影响 offset 列）。

### 3.3 `mon-counter-slots.md` — **OK**

```
0x5230ac add r7,pc,r0 ; r0=[0x523100]=0x1108e58 ; 0x5230b4+0x1108e58 = 0x162BF0C  ✓ 表基址
表 = 166 × u16（cmp r6,#332），前 20: 1,257,513,1025,2,258,514,1026,3,259,4,260,5,261,773,6,262,7,263,775
0x1597ea4 = 137 × {u32 emid,u32 slot}，slot 逐项 == 行号（every true）
大怪 94 = 0..70 + 112..134；小怪 43 = 71..111 + 135..136；emid 4097..4144 稀疏 + 4196..4202 + 4113/4118 ✓
monster-slot-map-137.json 与静态表 emid 137/137 相同（mismatches 0）
```
结论「旧 repo 布局在槽 71 之后整体错位」当时成立；但 `docs/data/json/monster-slot-map.json` 现在也已是
137 条正确表（旧 `-small.json` 不存在）⇒ 该段是 STALE 描述，不影响本文结论。
另：112..134 的 emid 清单只列了 22 个（漏 `1031`，正确串为 `4,5,7,1031,12,13,269,…`）。

### 3.4 `mon-em-units.md` — **OK**

```
0x1732050 起 137 个指针全部非零（distinct 87）
k=0/1 roEm001 ; k=6 roEm003 ; k=51 roEm060 ; k=58 roEm069 ; k=61 roEm076 ; k=70 roEm085
k=71 roEms001 ; k=105..111 roEms100 ; k=112 roEm004 ; k=135 roEms017 ; k=136 roEms022   ✓ 与 C3 表逐条一致
```
C7 的 58/61 结论与现行 `monster-slot-map-137.json`（58=emid69 Seltas Queen、61=emid76 Seltas）一致；
文档中文名「徹甲虫/重甲虫」在句内互换，但 emid 映射正确。

### 3.5 `mon-quest-dispatch.md` — **OK**

```
0x2484f0 起 114 word；target = 0x2484f0 + entry；distinct targets = 49
共享块：0x2486b8×14  0x2486d0×14  0x2486f0×6  0x248704×6  0x2487e4×9  0x248f40×22
cond10 → 0x248980 ; cond11 → 0x2489a4 ; cond27 → 0x248c24            （文档三处自检全部命中）
```
「114 项 / 49 目标 / 6 个共享块 / cond 1..114」全部复现。

### 3.6 `mon-size-calc.md` — **OK**

```
0x60C6..0x60CA = 00 00 00 00（两档相同）；记录自 0x60CA 起，137×4B，0x60CA+548 = 0x62EE ✓
clean: 42 条非零，下标全 ≤70，mini 92..124，maxi 93..125，mini>maxi 违例 0，mini==maxi 17 条
dirty: 74 条非零，含 112..132（14 条），i=26 = 94/154（文档 U4 的异常值 ✓）
crc32raw("rEmSizeCalcTblElement") = 0x5adc692c @0x160fdd4 ; crc32raw("rEmSizeYureTbl") = 0x1800eb37 @0x160fddc ✓
```
两处小错：① §10.2 的「17 条 mini==maxi」清单多写了 `0`（实际 0 号是 96/105）；② §4 的「新发现：110..132 有值
说明 71..92 归属需修正」已被 137 槽表解决——112..132 本就是大怪，不是小怪写尺寸（U5 可关闭）。

---

## 4. analysis/fields 组（3 份）

### 4.1 `fam-288.md` — **OK**

`15 × 0x120 = 0x10E0`，`0x16C8..0x27A8` 与 68B 族首条 `obj+0x27A8` 精确相接；
落盘 10 槽 `0x33B7..0x3EF7` + 横幅 +0x550 = `0x3907..0x4447`，与布局表 10 行 288B 完全一致；
`5 组 × 864 = 4320 = 0x10E0` ✓。「中槽不落盘」「384bit/lane、1536 id」算术自洽。

### 4.2 `fam-small.md` — **WRONG**（横幅与正文坐标自相矛盾）

横幅：**「本文的 `file_off`/char_off 早 0x550 —— 正确值 = 本文值 + 0x550」**。但正文：

| 位置 | 文档值 | 权威布局 | 加 0x550 后 | 判定 |
|---|---|---|---|---|
| §3 164B 对 A | `0x2FC7` obj+0x9D0 | `0x2FC7` obj+0x09d0 sz=164 | 0x3517（错） | 横幅对本文错 |
| §3 164B 对 B | `0x306B` obj+0xB18 | `0x306B` obj+0x0b18 sz=164 | 0x35BB（错） | 同上 |
| §4.3 勋章 A | `0x3157` obj+0xC28 | `0x3157` obj+0x0c28 sz=20 | 0x36A7（错） | 同上 |
| §2 68B 族 | 已改写为 `0x4447..0x45DF`（并注「本节原写 0x3EF7..0x408F」） | `0x4447..0x45DF` | 0x4997（错） | 横幅对本文也错（正文已修正） |

即：**本文正文各表都已是修正后坐标**（§2 自己都注明了旧值），横幅的「本文值 + 0x550」对任何一段都不成立。
照横幅统一 +0x550 会把 4 张正确的族表全部改错。其余承重数字（`0x9D0+3*0xA4=0xBBC`、`0xBEC+6*0x14=0xC64`、`0xCA0+3*0x28=0xCF0`）与字节实测
（clean 0xC28 ≡ 0xC50；dirty 0xC28 = `ff×16+0x0f` = 132 个 1；164B `B&~A` 0 违反；dirty 164B 两槽相同）全部成立。

### 4.3 `records-128.md` — **OK**

`0x51e300..0x51e440` 内 `bl 0x3df2a8` **16 条**（1 条前置 + 15 条 `sz=128`，obj 0x2A78/0x2AF8/0x2BF8…），
与「15 条独立读、无循环」一致；`0x6fcd74` 的 `ldrsh r1,[r0,r1]!`（obj+0x2AD6、`lsl#2` 步长 4、clamp ≥0、`strh`）
支持「rec+0x5C 起 4B 步长的 u16 对、读改写+clamp 0」；族几何 `0x2A78+15*0x80=0x31F8`、
文件侧 `0x408F+0x780=0x480F`（+0x550 → `0x45DF..0x4D5F`）与布局一致。横幅在本文件是**正确且必要**的。

---

## 5. mechanics 组（9 份）

### 5.1 `equipment.md` — **OK**

```
装备箱 25326(0x62EE) + 36×2000 = 97326(0x17C2E) = 猫箱起点 ✓（editor/core/items.mjs 同值）
装饰珠 id 2638..2888（mhgu.db min/max）✓；珠 3×u16 @+6/+8/+10（items.mjs readEquipmentRecord）✓
type = b0&0x1f，防具 1..5 / 护石 6 / 武器 7..21（class+6）✓（items.mjs writeEquipmentRecord 分支）
weapons.json 10877 条；max_attack 非零 0；awaken 非空 0；element_2 非空 **56**；horn_notes distinct **50** ✓
_id 编码：(class<<16)|(family<<8)|(level+1)，class distinct 14、低字节 15 档 ✓
```
（「22-24 猫」本文自标 [推断]，不判）。

### 5.2 `monster-ai-params.md` — **OK**

12 个符号地址逐字节命中：
`0x1583420 emUniqueActMain`、`0x158520a emUniqueActParamSet`、`0x15535dc uMonsterUnitConductor`、
`0x155358a uEnemyCharacter`、`0x15535c9 uEnemy`、`0x1553633 actionNo`、`0x155681f cEmSetList`、
`0x15527bf cEnemyResourceBroker`、`0x155277f cEnemyDebugSetData`、`0x15526be cEmSizeCalcTblElement`、
`0x1552742 cEmSizeYureTblElement`、`0x1552294 cEmDouMouKa_PartsAuraData_Element`。

### 5.3 `monster-classes.md` — **OK**

13 个注册函数的记录数与 `docs/data/member-offsets.tsv` 逐项相等：
`0x4201c 4 / 0x45118 11 / 0x46498 23 / 0x479a0 11 / 0x48698 7 / 0x48ad4 2 / 0x4a13c 2 / 0x4a46c 2 /
0x50ce0 1 / 0x53ea0 22 / 0x564bc 9 / 0x6b3fc 1 / 0x23aad0 1`（tsv 内同 fn 行数完全一致）。

### 5.4 `monster-code-map.md` — **OK**

`0x48c50 ldr r4,[pc,r0]` / `0x48c60 add r1,pc,r0`（r0=[0x48cc4]=0x1509a56）→ **0x15526BE** ✓；
`0x160fdd4=0x5adc692c`、`0x160fddc=0x1800eb37` 与 `crc32raw("rEmSizeCalcTblElement")` /
`crc32raw("rEmSizeYureTbl")` 相等（我独立实现反射多项式 0xEDB88320/init 0xFFFFFFFF/无终异或复算）✓。

### 5.5 `monster-state-machine.md` — **OK（抽样 1 个派发器）**

`0x1120ee0`：`movw r0,#0x73e0; ldrb; cmp r0,#17; lsl#2; add r1,pc,#4; ldr; add pc,r0,r1`，
表基 0x1120f00，entry[0]=0x48 → 0x1120f48、entry[1]=0x54 → 0x1120f54；与文档 `ems100_00` 表
（0→0x1120f48、1..4→0x1120f54、13→0x1120fb8）一致。其余 60+ 张表未逐张核（工具 `state-motion3.mjs` 可复跑）。

### 5.6 `monsters.md` — **OK**

`mhgu.db`：monsters **129**、monster_damage **893**（distinct monster **93**）、monster_weakness **108**、
monster_status **728**（distinct **91** = 728/8）——与「129 行 / 893 行仅 93 只大型 / 108 行 / 728 = 91×8」全部一致。

### 5.7 `quests.md` — **OK**（2 项 UNVERIFIABLE）

```
mhgu.db quests = 1355；Village 375 / Guild 569 / Permit 228 / Arena 17 / Event 166  ✓
Permit = 18 只二名：12×16 + 6×6 = 228 ✓；Guild★14 = 86 行，sort_order 782..862 + 939..943 ✓
quests.json = 944 条；keyType key 118 / urgent 30 / pre-req 18 / normal 778 ✓
sort_order 946–1173（= questId 模型下的 permit 段）与 db 的 944–1171 差 +2，文档已注明偏移 ✓
```
- **UNVERIFIABLE**：①「斗技 questId 1288–1304（17）」——db 的 Arena 是 sort_order 1172..1188、
  `_id` 20001..20010/120001..120006；1288..1304 是 Event 的 sort_order（详见 §7）。
  ②「1174–1180 = 狩猎道场 7 关，clean seen 位命中」——db 里 sort_order 1174..1180 全是 Arena Grudge Match，
  且不存在 `_id` 1170..1185 的行。二者都是「bit 号 = questId」模型（M1/M2）的下游结论。

### 5.8 `skills-arts.md` — **OK**

```
skills distinct tree = 204（required=10 也是 204）；skill_trees = 205 行 ✓
拆档：only[10] 136 + 含负档 48 + [10,15] 无负档 20 = 204 ✓（逐树集合复算）
skills 326 条 ✓；decorations 242 条：2 技能 182 / 1 技能 60，树 id 1..143 ✓
wiki 1847.txt：LV1 56 + 「-」10 = 66 个狩技 ✓；2506.txt 猫饭技能 = 64 条（与本文一致）
```

### 5.9 `systems.md` — **WRONG**（1 条硬数字）

`combining` 183 条 = 「183 条配方」✓；`2602.txt` 里 `■■`（双音符组合）恰好 **25** 行 = 「25 组音符组合」✓；
但 **「wiki 2506.txt 61 个食事技能」→ 产物是 64**：

```
awk '$0=="LV1"{n++}' 1847.txt → 56（狩技）
2506.txt 纯数字行（每条技能的「猫饭数」列）= 64，首条 0x12 行「猫之不要停下来！/1」，末条 0x14D 行
skills-arts.md 同源表也写 64；本仓库 mhgu.db 的 felyne_skills 表为空（0 行），不能作反证
```

---

## 6. 判不了的条目（UNVERIFIABLE）与判定条件

| # | 文档 / 条目 | 为什么判不了 | 什么能判 |
|---|---|---|---|
| U1 | `quests.md` §「斗技 1288–1304」「狩猎道场 1174–1180」；`CURRENT-RULING` 的「bit 1288-1304 与斗技 questId 同区间」 | 这两组数是**游戏内 questId**，不是 `mhgu.db` 的 `sort_order`/`_id`。db 里 Arena 的 sort_order=1172..1188、`_id`=20001+/120001+；1288..1304 是 Event 的 sort_order；db 无 `_id`∈[1170,1185] 的行 | ①游戏侧 id 表（romfs `questData_*` 或内存 `*(0x1313c18)+0xB4` 的 +108 表）；②实机判据：改 id=946 的位看落在 0x42C 的哪个 bit（CURRENT-RULING 已列此实验） |
| U2 | `CURRENT-RULING`「编辑器写 char_off 11544–11546 = bit 1288–1304」 | 同上；且编辑器源码里的写点常量未在本次范围内核到 | 编辑器 `OtherForm.cs` 写点常量 + U1 的 id 表 |
| U3 | `mon-class-map.md` 的**类大小列**（`cEmDouMouKaData=0x84`、`cEmSizeCalcTblElement=0x20` …） | `bl 0x7aedcc` 的 r3 确有 `0x84`/`0x20` 站点（`0xa475a8`、`0xccba0c`），但名字既不以字面量也不以 crc32 常量在该调用前出现（疑经 GOT/描述符表），无法把名字与 size 绑定 | 追 `0x7aedcc` 的 r1/r2 来源（GOT 描述符），或 dump 运行时注册表；`mon-offsets.py` 若还在可直接跑（现已缺失） |
| U4 | `member4-17-layout.md`「member[4] file 锚点 0x5EA2..0x5ECB，未验证」 | 文档自己标未验证；文件链给出竞争值 `0x2246E`（member[3] 尾 `0x21E0E`+1632）。两者都缺一个"member[4] 字节指纹"证据 | 用 reader 的 41B 序列在存档 `0x2246E` vs `0x5EA2` 两处比对（41B 中 29B 版本块 + 3 个 u32 应呈低熵） |
| U5 | `systems.md`「25 组音符组合」 | 已证 `2602.txt` 有 25 行 `■■`（另有 75 行 `■■■`、39 行 `■■■■`）；「25」与双音符块数吻合，但「组」的词义仍需页面自身佐证 | 页面分组标题统计；`horn_melodies` 去重为 75 个 distinct song，不能直接当 25 |
| U6 | `monster-state-machine.md` 其余派发器表 | 只抽样验证了 `0x1120ee0` 与 `0x81ca4`；文档由 `tools/mhgu/state-motion3.mjs` 生成 | 直接重跑 `node tools/mhgu/state-motion3.mjs` 与文档表 diff |
| U7 | `monster-classes.md` 的成员 offset 逐行（tsv 有 110 行，本次只核了 record 数） | 逐行核需要每个 `bl 0x7bb638` 站点 + `add r1,r10,#off` 立即数全表 | 用 `member-offsets.tsv` 的 `site` 列逐行反汇编（每行一个 site，成本 ~110 次） |

## 7. 缺失的引用产物（MISSING，非文档结论错误，但复现链断）

| 被引产物 | 引用文档 | 现状 |
|---|---|---|
| `.tmp/mhgu/tools/*.mjs`（m1417-dump/xref/dump3/dump5、member15-scan/scan2、ai-entry1..8、size-*.mjs、qp4-scan、swe2-audit） | member14-17-semantics / member15 / member4-header / mon-ai-entry / mon-size-calc / member4-residual | 整个 `.tmp/mhgu/` 已不存在 |
| `analysis/movw-index.json`（172,431 条 movw） | fam-288 / fam-small / records-128 / member4-header | 全库找不到该文件（`find` 0 命中） |
| `tools/r1.txt`、`docs/analysis/dumps/*` | member4-header / member4-residual / fam-small | `tools/r1.txt` 不存在；`docs/analysis/dumps/` 目录存在（未逐文件核） |
| `docs/data/json/monster-slot-map-small.json` | CURRENT-RULING / mon-counter-slots | 不存在（现行只有 `-137.json` 与已修正的 `monster-slot-map.json`，均 137 条） |
| `docs/analysis/code/code-metrics.md` | coverage-map（链接写 `docs/analysis/code/code-metrics.md`） | 实际文件是 `docs/analysis/code-metrics.md`（少一层目录），链接失效 |

## 8. 给主会话的修复优先级（只列会被下游照抄的数字）

1. `CURRENT-RULING` 怪物计数器段：`24502→24503`、槽分段改为 `0..70 / 71..111 / 112..134 / 135..136`、
   Permit `98→103`、删「129–136 保留槽全 0」。
2. `contradictory-bits-verdict`：Permit `98→103`；把「501 含非 quest 位」改成「slot1 的 379 位同样是合法 quest 位」。
3. `coverage-map`：`0x2C0B..0x59AC 15075B → 0x2C0B..0x5EA6 12955B`；`227,386B → 226,754B`（或注明是 end offset）；
   dirty vol_only `56/13→59/15`、`70/0→73/1`。
4. `member4-semantics`：行 107..134 与 §0.1/§5 的坐标 +4（**不要**全表 +0x550）。
5. `fam-small` 横幅：改成「本文各表已是 2026-10-23 修正后坐标；旧 dump（`families-dump.txt` 等）的 file_off 才需 +0x550」。
6. `systems.md`：`61 → 64`。
7. `member15.md`：标题编号 #15 → member[13]；`diff=0/6328` → 「解压后 6328B 相同，13B 头有 3 字节差异」。

## Difficulties

- 无 `sqlite3` CLI、无 python：改用 `bun:sqlite`（Bun eval）与 node 24；`node:sqlite` 亦可。
- `MHGU-private/` 存在（`docs`/`editor-src`/`render`/`romfs-extract`/`save-snapshots`/`main.140.flat.bin`，romfs-extract 233MB），
  但**没有** quest 数据（`find -iname "*quest*"` 只命中 GMD 文案表与 db 导出），因此 questId 类断言仍判不了；
  dttune/gmd 等提取物存在但本切片未用到。
- `docs/analysis/dumps/` 与 `.tmp/mhgu/` 都已不在，`movw-index.json`/`r1.txt` 缺失 ⇒ 三份 fields 文档与
  member4-header 的「[X] 索引证据」无法按原文复跑；本次改为直接反汇编抽样，结论不受影响。
- 存档「dirty」只存在于 `system` 槽（`.hnt` 导出与 clean 完全相同：逐字节 diff=0），因此所有
  clean/dirty 差分必须在 system 槽坐标上做；文档里「clean 猎人A slot1 / dirty 猎人B slot0」的基址
  `0x2AC560 / 0x18CC9C` 可由 `[0x34+4i]+0x24` 复现。
- 猎人名在快照里已改为 `Sakiko`/`Lay1nn`（文档写 `猎人A`/`猎人B`），凡引用名字字面值的段落都已 STALE，
  但同段的小时数/金钱/HR 数字仍逐项吻合，故未据此判 WRONG。
