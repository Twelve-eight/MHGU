# 狞猛化任务与配信任务（MHGU / MHXX）

> **本页能查到什么**
> 1. **狞猛化（Hyper）任务全表，165 条**：集会所★6 22 / 集会所★7 32 / 集会所 G★2 6 / G★3 17 / G★4 32 / 特殊许可 G★3–G★5 9 / 村★10 4 / 配信 43。每条给星级、任务名（db 原文）、狞猛化怪物（官方简中名）、同场非狞猛怪、报酬金、HRP、以及可复查的 `quests._id`。
> 2. **配信（Event/DLC）任务全表，166 条**：下位 ★2–★3 7 / 上位 ★4–★7 92 / G★1–G★4 67，逐条给目标原文 + 中文目标 + 报酬金 + HRP。
> 3. **两张表的计数都闭合**：每个 hub×★ 的小计直接来自本页 §2 / §5 给出的 SQL，合计 165 与 166，可用 `mhgu.db` 一条命令复算。
> 4. 术语：狞猛化的官方简中定义原文、狞猛化素材与「狞猛化狩猎之证」、44 种狞猛化怪物的分布（§4）。

**一句话结论**：狞猛化任务不存在于下位，**全部 165 条集中在上位 ★6/★7 与 G 级**；它们**不是**关键任务，只按「已完成狞猛化任务的条数」解锁（集★6 ≥2、G★4 ≥6）。配信任务 166 条是 DLC，不参与任何推进链。

---

## 1. 怎么读本页

| 列 / 记号 | 说明 |
|---|---|
| 星级 | 由 db `quests.stars` 换算：下位/上位直接写作 `★N`；G 级写作 `G★(stars-10)`；村任务 stars 就是游戏内星级（村★10 那 4 条 db 标 `rank=G`，但游戏内仍叫 ★10）。换算依据：`stars` 11–16 与任务名里的 G 档一一对应（q40113 `Redhelm G3: Hunt` = stars 13、q41614 `Boltreaver G4` = 14、q41015 `Thunderlord G5` = 15）；星级串的官方写法见 `chS/arc/resident_chS.arc :: GUI/06_msg/questMessage_chS` 的 `Star1..Star10`=★…★×10、`Rank_G_01..04`=`G★`…`G★★★★` [B] |
| 任务名 | **db `quests.name` 原文（英文）**。**本页这 165/166 条任务在简中包里没有标题文本**：`nativeNX/chS/`、`chT/` 只有 `table/ arc/ GUI/`，逐任务文本 `quest/questData/*_<lang>.gmd` 只随包 eng/fre/ger/ita/spa 五种（`docs/data/romfs-tables.md` §4、§gmd text）[B]；配信表 `guestQuestData_chS` 只有**通用**任务名，不含本页任何一条（见 §7.3）。所以**本页任务不译、不造中文名** [U] |
| 狞猛化怪物 | `monster_to_quest` 中该任务 `hyper=1` 的怪物。中文名取官方简中（`chS/arc/resident_chS.arc :: monsterName_chS` 的槽位串，经 `docs/data/json/monster-slot-map.json` 的 en→cn 对齐）[B]；唯一例外「激昂金狮子」见 §4 注 |
| 同场非狞猛 | 同一任务里 `hyper=0` 的大型怪物（19 条任务、23 行）——即"同一个任务里有狞猛也有非狞猛" |
| 报酬金 / HRP | `quests.reward`（z）/ `quests.hrp`。只来自第三方库 MHGenDatabase v2.4.0，未与 romfs `questData_<id>.ext` 的 `Reward`/`HunterRankPoints` 逐条对拍 → **[I]** |
| 来源 | `q<id>` = `mhgu.db` → `quests` 表 `_id` 行 |

**证据等级**（全页统一）：

| 记号 | 含义 |
|---|---|
| **[C]** | romfs 字节 / main 代码地址已交叉验证 |
| **[B]** | 单一字节级来源（官方 GMD 原文、目录枚举），可直接引用 |
| **[I]** | 第三方库 `mhgu.db`（MHGenDatabase v2.4.0）或推断；数值可信但未二次验证 |
| **[W]** | 镜像 wiki 文本（`docs/mechanics/quests.md` 等） |
| **[U]** | 未知；**本页不把它写成事实** |

> 本页**没有任何一条断言达到 [C]**：最接近的两项 —— 英文任务标题与 romfs 同源（转述他人对 q101 的对拍结论，按 [W] 计）、狞猛化归属 `hyper`（只有 db，按 [I] 计）—— 都不是本页自己验证过的 romfs 字节。

> 本页两张表的**星级、任务名、目标、狞猛化归属**全部来自 db 字段，属于 **[I]**；其中**狞猛化术语与怪物中文名**是 [B]；**星级串与「狞猛化」这个词**在简中包里逐字可查 [B]（见 §1.1）。
> db 里的 `quests.name` 与 romfs `eng/quest/questData/questData_<id>_eng.gmd` 的标题同源（`docs/data/romfs-tables.md` §4 记录过 q101 的三值对拍 —— 本页只是转述他人的对拍结论，故按 [W] 计），所以英文任务名不是编造。

### 1.1 狞猛化是什么（官方简中原文，逐字）

| 出处 | 原文 | 用途 |
|---|---|---|
| `chS/table/HN_HunterTipsMsg_chS.gmd` `HTM_Doumouka`（串 140） | 「狞猛化」 | 官方术语写法 |
| 同上 `HTM_Doumouka_P1`（串 405） | 「狞猛化指的是\r\n怪物因某种原因\r\n陷入极度兴奋的状态。」 | 定义 |
| 同上 `HTM_Doumouka_P2`（串 406） | 「狞猛化的怪物会因为\r\n肌肉过于频繁的活动，\r\n而使身体某些部位看起来\r\n像是被黑色的蒸汽所笼罩着。\r\n来自这些部位的攻击将非常危险。」 | 部位外观与危险提示 |
| 同上 `HTM_Doumouka_P3`（串 407） | 「但是被黑色蒸汽笼罩的部位\r\n并不是只代表着危险。\r\n如果攻击这些部位，\r\n就可以更快地累积狩技槽。」 | **狞猛部位 = 狩技槽累积加速**（打法核心） |
| 同上 `HTM_Doumouka_P4`（串 408） | 「在狩猎中，\r\n有时会改变频繁运动的部位。\r\n一定要细心观察哪个部位\r\n被黑色蒸汽所笼罩着。」 | 狞猛部位会在狩猎中切换 |
| `chS/table/itemCategoryTypeData_chS.gmd` 串 13/14 | 「狞猛化素材」 | 素材分类 |
| `chS/table/Lb_MakaRenkinMsg_chS.gmd` `item_card_01/02/03`（串 14/15/16） | 「狞猛化狩猎之证Ⅰ / Ⅱ / Ⅲ」 | 炼金消耗品（同表 `other_01`，串 17：「必须使用狞猛化狩猎之证才能进行」） |
| `chS/table/GC_Title_1_chS.gmd` `name1_117` / `name1_TXT_117`（串 116/1425） | 「狞猛」/「狩猎了50头狞猛化怪物」 | 称号与解锁条件 |
| `chS/table/GC_Medal_chS.gmd` `Medal_TXT_037`（串 168） | 「有关受特殊因素影响进入\r\n极度兴奋状态的兽龙种的记录。\r\n狩猎了多数狞猛化兽龙种的证明。」 | 勋章四枚同型：兽龙 168 / 飞龙 193 / 牙兽 208 / 海龙 223 |

> 结论：中文语境里只有 **狞猛化** 一种写法，不存在「狂猛化 / 极限化」等别名。上面的等级标 [B]。
> **这条机制在游戏里直接写在提示里**：P3 明说攻击被黑蒸汽笼罩的部位「可以更快地累积狩技槽」——所以狞猛任务反而是最快开狩技的场合；P4 提醒这些部位会在狩猎中切换。

### 1.2 本页的三条边界（先看这里，避免误读）

1. **狞猛化任务没有下位**：165 条里 `rank=LR` 为 **0**（SQL 见 §2）。最小是集会所★6（上位）。
2. **狞猛化是"每只怪"的属性，不是"整条任务"的属性**：`monster_to_quest.hyper` 落在 (任务, 怪物) 这一行上。例：q1028 里海龙、火龙 `hyper=1`，同场的碎龙 `hyper=0`；q41814（鏖魔 G4）里千刃龙 `hyper=1`、鏖魔角龙 `hyper=0`。本页口径 = **任务内至少有 1 只 `hyper=1` 的怪**。
3. **"狞猛怪是目标"几乎总成立，但有 2 条例外**：165 条里只有 **q10650**（`Deliver 30 pieces of Coal`，狞猛爆锤龙只是场上怪）与 **q10739**（目标串写作 `Hunt all large monsters, not including Seltas`，狞猛怪在"全部大型"之内）不把狞猛怪写进目标名；其余 163 条的目标都覆盖了狞猛怪 —— 要么目标串直接点名（如 q40113 `Hunt a Redhelm Arzuros and a Congalala`），要么目标是 `Hunt/Slay all large monsters`（整场全灭）。

---

## 2. 狞猛化任务：计数对账（合计 165）

```sql
-- 狞猛化任务 = 任务内至少 1 行 monster_to_quest.hyper = 1
SELECT q.hub, q.rank, q.stars, COUNT(DISTINCT q._id) AS n
FROM monster_to_quest m
JOIN quests q ON q._id = m.quest_id
WHERE m.hyper = 1
GROUP BY q.hub, q.rank, q.stars
ORDER BY q.hub, q.stars;
```

上面这条 SQL 的**完整返回**（14 行，合计 165；`rank` 已由 `hub + stars` 唯一确定 —— ★6/★7 是上位、G★ 与 ★10 是 G —— 故下表省掉该列）：

| hub | db `stars` | 本页星级 | 条数 |
|---|---|---|---|
| Event | 6 | 配信 ★6 | 1 |
| Event | 7 | 配信 ★7 | 27 |
| Event | 12 | 配信 G★2 | 2 |
| Event | 13 | 配信 G★3 | 2 |
| Event | 14 | 配信 G★4 | 11 |
| Guild | 6 | 集会所 ★6 | 22 |
| Guild | 7 | 集会所 ★7 | 32 |
| Guild | 12 | 集会所 G★2 | 6 |
| Guild | 13 | 集会所 G★3 | 17 |
| Guild | 14 | 集会所 G★4 | 32 |
| Permit | 13 | 特殊许可 G★3 | 5 |
| Permit | 14 | 特殊许可 G★4 | 3 |
| Permit | 15 | 特殊许可 G★5 | 1 |
| Village | 10 | 村 ★10 | 4 |
| | | **合计** | **165** |

按据点汇总（与上表同一 SQL 的 `GROUP BY q.hub`）：

| 据点 | 条数 | 上位 / G 级 |
|---|---|---|
| 集会所（Guild） | **109** | ★6 22 + ★7 32 / G★2 6 + G★3 17 + G★4 32 |
| 配信（Event） | **43** | ★6 1 + ★7 27 / G★2 2 + G★3 2 + G★4 11 |
| 特殊许可（Permit） | **9** | 0 / G★3 5 + G★4 3 + G★5 1 |
| 村（Village） | **4** | 0 / ★10 4（4 条都是 `Advanced:` 普通任务） |
| **合计** | **165** | 上位 82 / G 级 83 |

> 与已有页面一致：`docs/wiki/quests.md` §6 写的是「村★10 4、集★6 22、集★7 32、G★2 6、G★3 17、G★4 32、配信 43、特殊许可 9」，本页把这个分布展开到逐条。
> 狞猛化对 (任务, 怪物) 行数是 **235**（`SELECT COUNT(*) FROM monster_to_quest WHERE hyper=1`），比 165 条任务多，因为一条任务可有多只狞猛怪（最多 5 只：q11450 / q1010153 / q1011043）。44 种怪物见 §4。

---

## 3. 狞猛化任务全表（165 条）

> 排序 = `_id` 升序（= 同一星级内的表内顺序）。"同场非狞猛"为 `—` 表示该任务只有狞猛怪。

### 3.1 集会所 ★6（22 条 · `rank=HR`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★6 | Miasma Attack | 毒怪鸟 | — | 6300 | 400 | q10644 |
| ★6 | Stop the Wacha! | 奇猿狐 | — | 6300 | 400 | q10645 |
| ★6 | We Are Not Amused | 雌火龙 | — | 9000 | 520 | q10646 |
| ★6 | Zamtrios Fight! | 变形冰鲨 | — | 8400 | 480 | q10647 |
| ★6 | The Frog of War | 鬼蛙 | — | 7200 | 420 | q10648 |
| ★6 | Triple Toady Terror | 鬼蛙 | — | 15900 | 740 | q10649 |
| ★6 | The Coal Still Burns | 爆锤龙 | — | 6000 | 320 | q10650 ※1 |
| ★6 | Woe Malfestio | 夜鸟 | — | 8400 | 480 | q10651 |
| ★6 | Born of Darkness | 迅龙 | — | 9900 | 600 | q10652 |
| ★6 | Nibeling on Apples | 潜口龙 | — | 7800 | 520 | q10653 |
| ★6 | Warning: Hyper Yian Garuga! | 黑狼鸟 | — | 10800 | 600 | q10654 |
| ★6 | Hyper for Holes | 雪狮子王 | — | 9000 | 560 | q10655 |
| ★6 | The Plesioth Adventure | 水龙 | — | 9000 | 520 | q10656 |
| ★6 | Daimyo of the Deserted Island | 大名盾蟹 | — | 7200 | 420 | q10657 |
| ★6 | Where the Wild Manes Are | 水兽 | — | 7200 | 420 | q10658 |
| ★6 | Hyper Investigation | 怪鸟 | — | 5100 | 340 | q10659 |
| ★6 | The Khezu and the Shadow | 白电 | — | 7800 | 520 | q10660 |
| ★6 | Bring On the Shogun | 将军镰蟹 | — | 9000 | 560 | q10661 |
| ★6 | Unnerving Najarala | 绞蛇龙 | — | 9900 | 560 | q10662 |
| ★6 | Eruption Embodied | 爆锤龙 | — | 11700 | 600 | q10663 |
| ★6 | The Magma's Rage | 熔岩龙 | — | 9000 | 560 | q10664 |
| ★6 | Minion Audition Imposition | 怪鸟 ＋ 将军镰蟹 | — | 12000 | 630 | q10665 |

> ※1 q10650 是**交纳任务**（`Deliver 30 pieces of Coal`），狞猛爆锤龙只是场上的怪，不是目标 —— 全表唯一的"狞猛怪非目标"案例之一（另一个是 q10739）。

### 3.2 集会所 ★7（32 条 · `rank=HR`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★7 | Putting the Gore in Magala | 黑蚀龙 | — | 14100 | 730 | q10723 |
| ★7 | Tigrex, Tigrex, Burning Bright | 轰龙 | — | 15300 | 730 | q10724 |
| ★7 | A Thousand Blades of Wrath | 千刃龙 | — | 15300 | 890 | q10725 |
| ★7 | A Fiery Temper | 火龙 | — | 12600 | 710 | q10726 |
| ★7 | The Unassailable Seltas Queen | 重甲虫 | 穿甲虫 | 12600 | 710 | q10727 |
| ★7 | Savage Sword of the Desert | 斩龙 | — | 14400 | 760 | q10728 |
| ★7 | Wyvernlit Evening | 电龙 | — | 14400 | 760 | q10729 |
| ★7 | Wyverns All Around Us | 雌火龙 ＋ 火龙 | — | 15300 | 980 | q10730 |
| ★7 | Wild Gods, Calm Rangers | 巨兽 | — | 14400 | 760 | q10731 |
| ★7 | Into the Maelstrom | 海龙 | — | 12600 | 710 | q10732 |
| ★7 | The Lithe and Unbreaking | 泡狐龙 | — | 14400 | 760 | q10733 |
| ★7 | The Peril of the Land | 尾锤龙 | — | 15300 | 730 | q10734 |
| ★7 | The Wolf and the Footbath | 雷狼龙 | — | 13800 | 710 | q10735 |
| ★7 | The Thieving Gypceros | 毒怪鸟 | — | 16800 | 830 | q10736 |
| ★7 | Steam and Smoke | 碎龙 | — | 15300 | 890 | q10737 |
| ★7 | The Glowing Embers | 炎戈龙 | — | 13800 | 730 | q10738 |
| ★7 | Primal Forest Defense | 毒怪鸟 ＋ 绞蛇龙 ＋ 重甲虫 | 穿甲虫 | 20100 | 1170 | q10739 ※2 |
| ★7 | The End of the Trials | 轰龙 ＋ 千刃龙 | — | 21300 | 1130 | q10740 |
| ★7 | The Descending Fog | 黑狼鸟 ＋ 怪鸟 ＋ 雌火龙 | — | 17400 | 1020 | q10741 |
| ★7 | Searching for Secret Baths | 水兽 ＋ 尾锤龙 ＋ 雷狼龙 | — | 25200 | 1300 | q10742 |
| ★7 | Show Me Your Shaka-Strength | 火龙 ＋ 雷狼龙 ＋ 海龙 | — | 27300 | 1490 | q10743 |
| ★7 | The Marshlands Nightmare | 白电 ＋ 将军镰蟹 ＋ 电龙 | — | 21900 | 1290 | q10744 |
| ★7 | The Birds of Prey | 怪鸟 ＋ 夜鸟 ＋ 黑狼鸟 | — | 17100 | 990 | q10745 |
| ★7 | The Fanged Beasts | 巨兽 ＋ 奇猿狐 ＋ 雪狮子王 | — | 20700 | 1200 | q10746 |
| ★7 | The Winged Wyverns | 电龙 ＋ 火龙 ＋ 千刃龙 | — | 29700 | 1650 | q10747 |
| ★7 | The Foes of the Deep | 泡狐龙 ＋ 水龙 ＋ 潜口龙 ＋ 海龙 | — | 30600 | 1750 | q10748 |
| ★7 | The Beasts of Brawn | 爆锤龙 ＋ 尾锤龙 ＋ 碎龙 ＋ 斩龙 | — | 39600 | 2080 | q10749 |
| ★7 | Steppe in the Right Direction | 恐暴龙 | — | 18000 | 820 | q10770 |
| ★7 | Rajang's Black Spirit | 金狮子 | — | 18000 | 820 | q10771 |
| ★7 | Following the Fallen | 银火龙 | — | 22800 | 1100 | q10772 |
| ★7 | Fool's Gold | 金火龙 | — | 22800 | 1100 | q10773 |
| ★7 | Shining Examples | 银火龙 ＋ 金火龙 | — | 31800 | 1770 | q10774 |

> ※2 q10739 的 `goal` 原文是 `Hunt all large monsters, not including Seltas`（全大怪、但不含穿甲虫）—— 目标串里没有点名狞猛怪，所以它是 §1.2 的第 2 条例外。穿甲虫确实在场（`hyper=0`，见同场列），只是不计入目标。

### 3.3 集会所 G★2（6 条 · `stars=12`, `rank=G`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★2 | So Notable: Hyper Hermitaur | 大名盾蟹 | — | 13200 | 670 | q11242 |
| G★2 | Revenge from the Skies | 怪鸟 | — | 9300 | 540 | q11243 |
| G★2 | Commission: Hyper Kecha Wacha | 奇猿狐 | — | 11100 | 640 | q11244 |
| G★2 | Frog's Face, Demon's Heart | 鬼蛙 | — | 13200 | 670 | q11245 |
| G★2 | The Hype is Royal | 水兽 | — | 13200 | 670 | q11246 |
| G★2 | The Verdant Hills Are Alive | 毒怪鸟 | — | 11100 | 640 | q11247 |

### 3.4 集会所 G★3（17 条 · `stars=13`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★3 | Trial by Fart | 桃毛兽王 | — | 13200 | 720 | q11325 |
| G★3 | The Mud Must Flow | 土砂龙 | — | 13500 | 770 | q11327 |
| G★3 | The Pinnacle of Good Records | 岩龙 | — | 15000 | 770 | q11328 |
| G★3 | Sweets for My Sweets | 夜鸟 | — | 15000 | 770 | q11329 |
| G★3 | Zamtrios, Right Ahead! | 变形冰鲨 | — | 15000 | 770 | q11330 |
| G★3 | Frozen Seaway Horror Story | 白电 | — | 13800 | 830 | q11331 |
| G★3 | Temnoceranophobia | 影蜘蛛 | — | 15600 | 830 | q11332 |
| G★3 | The Pinnacle of Terror | 雌火龙 | — | 16200 | 830 | q11333 |
| G★3 | Eat in Pieces | 潜口龙 | — | 13200 | 720 | q11334 |
| G★3 | Diabolical Deluge | 水龙 | — | 16200 | 830 | q11335 |
| G★3 | Shhhhut Up | 雪狮子王 | — | 16200 | 910 | q11336 |
| G★3 | It's a Miner's Life | 熔岩龙 | — | 16200 | 910 | q11337 |
| G★3 | No Place to Run | 将军镰蟹 | — | 16200 | 910 | q11338 |
| G★3 | ...Or Just Wait for It to Poop | 绞蛇龙 | — | 17700 | 910 | q11339 |
| G★3 | Nargacuga in the Jurassic Frontier | 迅龙 | — | 17700 | 960 | q11340 |
| G★3 | Material Old Girl | 岩龙 ＋ 将军镰蟹 | — | 21900 | 1340 | q11366 |
| G★3 | Let the Games Begin | 奇猿狐 ＋ 影蜘蛛 | — | 18900 | 1170 | q11367 |

### 3.5 集会所 G★4（32 条 · `stars=14`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★4 | Setting the Barioth High | 冰牙龙 | — | 22800 | 1040 | q11433 |
| G★4 | Neopteronophobia | 重甲虫 | 穿甲虫 | 22800 | 1140 | q11434 |
| G★4 | Let's Get Igneous | 火龙 | — | 22800 | 1140 | q11435 |
| G★4 | Seeking the Sea King | 海龙 | — | 22800 | 1140 | q11436 |
| G★4 | Marshland Fandango | 铠龙 | — | 24900 | 1140 | q11438 |
| G★4 | It Takes Mizutsune to Tango | 泡狐龙 | — | 26100 | 1210 | q11439 |
| G★4 | If These Rocks Could Talk | 电龙 | — | 26100 | 1210 | q11440 |
| G★4 | The Big Push | 巨兽 | — | 26100 | 1210 | q11441 |
| G★4 | All Creatures Cleaved and Small | 斩龙 | — | 26100 | 1210 | q11442 |
| G★4 | Agnaktor's Deep | 炎戈龙 | — | 24900 | 1180 | q11443 |
| G★4 | Something Wicked | 黑蚀龙 | — | 25500 | 1180 | q11444 |
| G★4 | Seregios Exposé | 千刃龙 | — | 27300 | 1430 | q11445 |
| G★4 | Appeal from Authority | 尾锤龙 | — | 27300 | 1180 | q11446 |
| G★4 | Tigrex Trap | 轰龙 | — | 27300 | 1180 | q11447 |
| G★4 | Backwater Battle | 角龙 | — | 27300 | 1180 | q11448 |
| G★4 | Even Brachydios Need A Holiday | 碎龙 | — | 27300 | 1430 | q11449 |
| G★4 | Path of the Hunter | 泡狐龙 ＋ 电龙 ＋ 巨兽 ＋ 斩龙 ＋ 角龙 | — | 78600 | 3610 | q11450 |
| G★4 | Pitched Pinnacle Battle | 恐暴龙 | — | 32400 | 1310 | q11472 |
| G★4 | A Tragedy in Silver and Gold | 银火龙 ＋ 金火龙 | — | 57300 | 2840 | q11473 |
| G★4 | Rajang Against The Machine | 金狮子 | — | 32400 | 1310 | q11474 |
| G★4 | What's Mine is Mine | 爆锤龙 | — | 21000 | 960 | q11475 |
| G★4 | A Jurassic Frontier Just for You | 金火龙 | — | 41100 | 1780 | q11476 |
| G★4 | By the Light of the Silvery Rath | 银火龙 | — | 41100 | 1780 | q11477 |
| G★4 | Zinogre-enthusiasm | 雷狼龙 | — | 24900 | 1140 | q11478 |
| G★4 | Arctic Ridge Allegiances | 白电 ＋ 冰牙龙 ＋ 巨兽 | — | 43800 | 2160 | q11479 |
| G★4 | Arena Allegiances | 绞蛇龙 | 雷狼龙 ＋ 轰龙 ＋ 铠龙 | 57000 | 2650 | q11480 |
| G★4 | Garuga's Comeuppance | 黑狼鸟 | — | 19500 | 960 | q11483 |
| G★4 | R.I.P. | 火龙 ＋ 雌火龙 | — | 27300 | 1570 | q11486 |
| G★4 | Death at My Greaves | 铠龙 ＋ 影蜘蛛 | — | 28500 | 1570 | q11487 |
| G★4 | Pinnacle Problems | 岩龙 ＋ 雷狼龙 ＋ 电龙 | — | 46200 | 2180 | q11488 |
| G★4 | A Bed of Sand | 土砂龙 ＋ 轰龙 ＋ 斩龙 | — | 46800 | 2210 | q11489 |
| G★4 | Jungle Funk | 桃毛兽王 ＋ 迅龙 ＋ 泡狐龙 | — | 39600 | 2020 | q11490 |

> q11450 是全库报酬最高的非配信任务（78600z / HRP 3610），也是狞猛怪最多的一条（5 只）。

### 3.6 特殊许可（二名）G★3–G★5（9 条 · `rank=G`）

这 9 条的**目标是二名怪**，狞猛怪是任务里追加的共斗目标（目标串形如 `Hunt a Redhelm Arzuros and a Congalala`）。

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛（二名怪） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★3 | Redhelm G3: Hunt | 桃毛兽王 | 红盔青熊兽 | 27000 | 1620 | q40113 |
| G★3 | Crystalbeard G3: Hunt | 将军镰蟹 | 宝缠爆锤龙 | 36900 | 2430 | q40713 |
| G★3 | Hellblade G3: Hunt | 斩龙 | 烬灭刃斩龙 | 45000 | 3110 | q41213 |
| G★3 | Nightcloak G3: Hunt | 岩龙 | 胧隐夜鸟 | 32700 | 2090 | q41313 |
| G★3 | Rustrazor G3: Hunt | 夜鸟 | 铠裂将军镰蟹 | 34500 | 2230 | q41413 |
| G★4 | Boltreaver G4: Hunt | 电龙 | 青电主电龙 | 46500 | 3220 | q41614 |
| G★4 | Elderfrost G4: Hunt | 雪狮子王 | 银峰巨兽 | 46500 | 3220 | q41714 |
| G★4 | Bloodbath G4: Hunt | 千刃龙 | 鏖魔角龙 | 48300 | 3360 | q41814 |
| G★5 | Thunderlord G5: Hunt | 电龙 | 激昂金狮子 ＋ 金雷公雷狼龙 | 46200 | 3150 | q41015 |

> q41015 的目标串是 `Hunt all large monsters`，所以狞猛电龙与两只非狞猛怪都在目标内。

### 3.7 村 ★10（4 条 · db `rank=G`，游戏内仍称 ★10）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★10 | Advanced: Proof of a Champion | 海龙 ＋ 火龙 | 碎龙 | 36900 | 1820 | q1028 |
| ★10 | Advanced: Wycademy Challenge | 雷狼龙 | 激昂金狮子 ＋ 天廻龙 | 44400 | 2020 | q1029 |
| ★10 | Advanced: Guild's Greatest Hit | 角龙 ＋ 千刃龙 ＋ 恐暴龙 | — | 44700 | 2060 | q1030 |
| ★10 | Advanced: Ultimate Generation | 斩龙 ＋ 电龙 ＋ 泡狐龙 ＋ 巨兽 | 天彗龙 | 56100 | 2760 | q1055 |

> 村★10 的 16 条 `Advanced:` 里只有这 4 条带狞猛怪；它们不是关键/紧急任务，而是**高难度普通任务**（`docs/wiki/quests.md` §3 已核对）。

### 3.8 配信 ★6–G★4（43 条 · `hub=Event`）

| 星级 | 任务名（db 原文） | 狞猛化怪物 | 同场非狞猛 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★6 | Okami: Most Wanted | 夜鸟 | — | 10200 | 580 | q1010174 |
| ★7 | Baki: Biggest vs. Strongest | 巨兽 | — | 20400 | 1100 | q1010103 |
| ★7 | Ushio & Tora: White Mizutsune | 泡狐龙 | — | 18600 | 1000 | q1010105 |
| ★7 | Magi: Rescue from the Fall | 黑蚀龙 | — | 17100 | 880 | q1010106 |
| ★7 | Jump: Boiling Magma | 熔岩龙 | — | 12000 | 750 | q1010109 |
| ★7 | Dengeki: Turbulent Seas | 海龙 | — | 15300 | 850 | q1010111 |
| ★7 | Star Fox: Battle at Arctic Ridge | 雪狮子王 | — | 10800 | 680 | q1010118 |
| ★7 | Metroid: Special Mission | 黑狼鸟 | — | 14400 | 800 | q1010120 |
| ★7 | The Voracious King | 恐暴龙 | — | 21600 | 980 | q1010122 |
| ★7 | DMC: The Seltas Queen's Cry | 重甲虫 | 穿甲虫 | 16800 | 940 | q1010123 |
| ★7 | Mega Man: Yellow Devil | 水兽 | — | 8700 | 500 | q1010124 |
| ★7 | Capcom: Brilliant Orchestra | 绞蛇龙 | — | 12900 | 750 | q1010125 |
| ★7 | Capcom: White & Black | 泡狐龙 ＋ 迅龙 | — | 20400 | 1140 | q1010130 |
| ★7 | All's Hair in Glove & War | 金狮子 | — | 21600 | 980 | q1010135 |
| ★7 | A Golden Moon Rises | 金火龙 | — | 27300 | 1320 | q1010137 |
| ★7 | Silver and Gold | 银火龙 ＋ 金火龙 | — | 38400 | 2120 | q1010138 |
| ★7 | Secret Nibelsnarf Hunt | 潜口龙 | — | 9300 | 620 | q1010140 |
| ★7 | The Obvious Choice... | 大名盾蟹 | — | 8700 | 500 | q1010141 |
| ★7 | It Would Be a Shame If... | 将军镰蟹 | — | 10800 | 680 | q1010142 |
| ★7 | Not Stepping One Foot... | 碎龙 | — | 18300 | 1070 | q1010143 |
| ★7 | Picturesque Encounter | 雷狼龙 | — | 16500 | 850 | q1010144 |
| ★7 | Absolute Power | 轰龙 | — | 18300 | 880 | q1010145 |
| ★7 | The Five Kings of Destruction | 巨兽 ＋ 电龙 ＋ 泡狐龙 ＋ 斩龙 ＋ 恐暴龙 | — | 63600 | 3230 | q1010153 |
| ★7 | How It's Done | 炎戈龙 ＋ 熔岩龙 ＋ 碎龙 | — | 31800 | 1830 | q1010154 |
| ★7 | Retreat Run-in | 水兽 ＋ 水龙 ＋ 海龙 | — | 26400 | 1520 | q1010165 |
| ★7 | Fire Emblem: Warding Despair | 银火龙 | — | 27300 | 1320 | q1010172 |
| ★7 | Ghosts 'n Goblins: Seeing Red | 火龙 | — | 15300 | 850 | q1010175 |
| ★7 | Event: Hunt-a-thon 3 | 巨兽 ＋ 电龙 ＋ 泡狐龙 ＋ 斩龙 | — | 2700 | 0 | q1020008 |
| G★2 | Kingdom: Test of the Best! | 大名盾蟹 | — | 13200 | 670 | q1011002 |
| G★2 | Famitsu: Kecha the Scoop! | 奇猿狐 | — | 11100 | 640 | q1011006 |
| G★3 | Shonen: Winged Nocturne | 夜鸟 | — | 15000 | 770 | q1011004 |
| G★3 | Nerscylla Nightmare | 影蜘蛛 | — | 26400 | 1590 | q1011015 |
| G★4 | Case Closed: Desert Arrest! | 千刃龙 | — | 35700 | 1710 | q1011001 |
| G★4 | Drifters: Isle of Lost Souls | 碎龙 | — | 32700 | 1710 | q1011005 |
| G★4 | Into the Maw of Darkness | 雷狼龙 | 金火龙 | 29700 | 1370 | q1011010 |
| G★4 | Fan Club: Climbing The Ranks | 海龙 | — | 27300 | 1370 | q1011011 |
| G★4 | Glimmers of False Hope | 银火龙 ＋ 金火龙 | — | 57300 | 2840 | q1011019 |
| G★4 | Violence in the Verdure | 电龙 | — | 31200 | 1450 | q1011020 |
| G★4 | Paws Off My Fish! | 泡狐龙 | — | 31200 | 1450 | q1011021 |
| G★4 | Big, Bad 'n' Woolly | 巨兽 | — | 31200 | 1450 | q1011022 |
| G★4 | Blade Blazing Brightly Black | 斩龙 | — | 31200 | 1450 | q1011023 |
| G★4 | Monster Hunter Channel I | 火龙 ＋ 轰龙 ＋ 迅龙 ＋ 海龙 ＋ 雷狼龙 | — | 69000 | 3330 | q1011043 |
| G★4 | Monster Hunter Channel II | 碎龙 ＋ 黑蚀龙 ＋ 千刃龙 ＋ 斩龙 | 天彗龙 | 80400 | 4070 | q1011044 |

> 配信池的小计：★6 **1** ＋ ★7 **27** ＋ G★2 **2** ＋ G★3 **2** ＋ G★4 **11** = **43**，与 §2 的 Event 行一致。
> q1011044 是全库单条最高报酬（80400z / HRP 4070），与 `docs/wiki/quests.md` §3 的"全库最高"结论一致。

---

## 4. 狞猛化怪物索引（44 种 / 235 个「任务×怪物」对）

```sql
SELECT mo.name, COUNT(*) AS n, GROUP_CONCAT(DISTINCT q.hub) AS hubs
FROM monster_to_quest m
JOIN quests q ON q._id = m.quest_id
JOIN monsters mo ON mo._id = m.monster_id
WHERE m.hyper = 1
GROUP BY mo.name ORDER BY n DESC, mo.name;
```

| 狞猛化怪物（官方简中） | db 英文名 | 任务数 | 出现据点 |
|---|---|---|---|
| 电龙 | Astalos | 12 | 村、集会所、特殊许可、配信 |
| 斩龙 | Glavenus | 11 | 村、集会所、特殊许可、配信 |
| 泡狐龙 | Mizutsune | 11 | 村、集会所、配信 |
| 巨兽 | Gammoth | 10 | 村、集会所、配信 |
| 海龙 | Lagiacrus | 9 | 村、集会所、配信 |
| 火龙 | Rathalos | 9 | 村、集会所、配信 |
| 雷狼龙 | Zinogre | 9 | 村、集会所、配信 |
| 千刃龙 | Seregios | 8 | 村、集会所、特殊许可、配信 |
| 碎龙 | Brachydios | 7 | 集会所、配信 |
| 金火龙 | Gold Rathian | 7 | 集会所、配信 |
| 将军镰蟹 | Shogun Ceanataur | 7 | 集会所、特殊许可、配信 |
| 银火龙 | Silver Rathalos | 7 | 集会所、配信 |
| 夜鸟 | Malfestio | 6 | 集会所、特殊许可、配信 |
| 轰龙 | Tigrex | 6 | 集会所、配信 |
| 雪狮子王 | Blangonga | 5 | 集会所、特殊许可、配信 |
| 恐暴龙 | Deviljho | 5 | 村、集会所、配信 |
| 奇猿狐 | Kecha Wacha | 5 | 集会所、配信 |
| 绞蛇龙 | Najarala | 5 | 集会所、配信 |
| 迅龙 | Nargacuga | 5 | 集会所、配信 |
| 雌火龙 | Rathian | 5 | 集会所 |
| 水兽 | Royal Ludroth | 5 | 集会所、配信 |
| 黑狼鸟 | Yian Garuga | 5 | 集会所、配信 |
| 怪鸟 | Yian Kut-Ku | 5 | 集会所 |
| 岩龙 | Basarios | 4 | 集会所、特殊许可 |
| 大名盾蟹 | Daimyo Hermitaur | 4 | 集会所、配信 |
| 尾锤龙 | Duramboros | 4 | 集会所 |
| 黑蚀龙 | Gore Magala | 4 | 集会所、配信 |
| 毒怪鸟 | Gypceros | 4 | 集会所 |
| 白电 | Khezu | 4 | 集会所 |
| 熔岩龙 | Lavasioth | 4 | 集会所、配信 |
| 影蜘蛛 | Nerscylla | 4 | 集会所、配信 |
| 潜口龙 | Nibelsnarf | 4 | 集会所、配信 |
| 水龙 | Plesioth | 4 | 集会所、配信 |
| 重甲虫 | Seltas Queen | 4 | 集会所、配信 |
| 爆锤龙 | Uragaan | 4 | 集会所 |
| 炎戈龙 | Agnaktor | 3 | 集会所、配信 |
| 桃毛兽王 | Congalala | 3 | 集会所、特殊许可 |
| 角龙 | Diablos | 3 | 村、集会所 |
| 金狮子 | Rajang | 3 | 集会所、配信 |
| 鬼蛙 | Tetsucabra | 3 | 集会所 |
| 冰牙龙 | Barioth | 2 | 集会所 |
| 土砂龙 | Barroth | 2 | 集会所 |
| 铠龙 | Gravios | 2 | 集会所 |
| 变形冰鲨 | Zamtrios | 2 | 集会所 |

> 核对：12+11+11+10+9×3+8+7×4+6×2+5×9+4×12+3×5+2×4 = **235**，与 `SELECT COUNT(*) FROM monster_to_quest WHERE hyper=1` 的 235 一致；怪物种数 **44**。
> 中文名来自 `monsterName_chS` 的槽位串（`monster-slot-map.json` 的 `en`→`cn` 列，每条都带 `cn_src`）[B]。**唯一例外是「激昂金狮子」**：slot map 对 slot 22 的 `cn` 取自 `chS/table/itemData_chS.gmd #2997`（原文「激昂金狮子的毛。…」），而 `monsterName_chS` 的 i22（`EnragedRajang`）只有「金狮子」—— 本页沿用 slot map 的写法，出处见 §7.2 表下注。
> 上表 44 种里**没有一只古龙、也没有一只二名怪**（`hyper=1` 的 `monster_id` 全落在普通大型怪上；钢龙、炎王龙、霞龙、岚龙、煌黑龙、天彗龙、天廻龙、骸龙、老山龙、霸龙、崩龙、阁螳螂、麒麟都不在其中）。

---

## 5. 配信（Event / DLC）任务全表（166 条）

```sql
SELECT rank, stars, COUNT(*) AS n FROM quests WHERE hub = 'Event'
GROUP BY rank, stars ORDER BY rank, stars;
```

上面这条 SQL 的**完整返回**（10 行，合计 166）：

| db `rank` | db `stars` | 本页星级 | 条数 |
|---|---|---|---|
| LR | 2 | ★2 | 4 |
| LR | 3 | ★3 | 3 |
| HR | 4 | ★4 | 8 |
| HR | 5 | ★5 | 5 |
| HR | 6 | ★6 | 18 |
| HR | 7 | ★7 | 61 |
| G | 11 | G★1 | 2 |
| G | 12 | G★2 | 12 |
| G | 13 | G★3 | 19 |
| G | 14 | G★4 | 34 |
| | | **合计** | **166** |

按难度：下位 **7** ／ 上位 **92** ／ G 级 **67**。

> 这 166 条在 db 里就是一个池子（`hub='Event'`）。其中 **41 条 `hrp=0`**（20 条 `Event: Slay a X` / `Event: Hunt-a-thon N` + 21 条 `XX Trials`），是"试炼/挑战"性质的配信；不再另分表。
> **注意**：wiki 另有「挑战任务 20 条」独立池，其 questId 至今没有对上 db（`docs/wiki/quests.md` §8 Unknown #6）—— 本页的 166 条**不含**那 20 条 [U]。

### 5.1 下位 ★2–★3（7 条 · `rank=LR`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★2 | CoroCoro: Lost in the Swamp | Slay a total of 20 Ceanataurs and Iopreys | 讨伐 镰蟹＋红速龙 合计 20 只 | 2700 | 120 | q1110001 |
| ★2 | Initiate: Operation Moofah | Deliver 20 pieces of Moofah Fur | 交纳 云羊鹿天然毛×20 | 3000 | 210 | q1110004 |
| ★2 | The Uniqlo Avant-garde | Slay a total of 20 Vespoids and Bnahabras | 讨伐 巨蜂＋飞甲虫 合计 20 只 | 3000 | 200 | q1110005 |
| ★2 | Nakayoshi: Silver Crystal | Deliver 2 Sootstone Ores | 交纳 灰水晶原石×2 | 3600 | 210 | q1110007 |
| ★3 | A Season for Lava | Hunt 2 before time expires or deliver a Paw Pass Ticket | 限时内狩猎 2 只，或交纳 猫车票券 | 11700 | 630 | q1010004 |
| ★3 | The King of Lynians! | Defeat a total of 20 Felynes and Melynxes | 讨伐 艾露猫＋梅拉露 合计 20 只 | 2100 | 200 | q1110002 |
| ★3 | Jump: Crimson Strongmen | Hunt all large monsters | 狩猎场上全部大型怪物 | 4800 | 230 | q1110003 |

> 素材官方简中名（`items._id` → `itemData_chS` 槽位 `2*id`，与 `docs/wiki/quests.md` 同法）[B]：
> Moofah Fur #2101 → 云羊鹿天然毛、Sootstone Ore #2108 → 灰水晶原石、Coal #2084 → 燃石炭、Powderstone #2110 → 火药岩、Paw Pass Ticket #1734 → 猫车票券。

### 5.2 上位 ★4（8 条 · `rank=HR`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★4 | CoroCoro: Big Bad Bugs | Slay 12 Konchus | 讨伐 盾虫×12 | 3000 | 140 | q1110101 |
| ★4 | A Hero's Return | Hunt a Bulldrome | 狩猎 野猪王 | 4200 | 220 | q1110102 |
| ★4 | Mario: The White Donkey Kong? | Slay 20 Blangos | 讨伐 雪狮子×20 | 3900 | 160 | q1110103 |
| ★4 | Event: Slay a Volvidon | Slay a Volvidon | 讨伐 赤甲兽 | 1800 | 0 | q1120001 |
| ★4 | Event: Slay a Royal Ludroth | Slay a Royal Ludroth | 讨伐 水兽 | 1800 | 0 | q1120002 |
| ★4 | Event: Slay a Lagombi | Slay a Lagombi | 讨伐 白兔兽 | 1800 | 0 | q1120003 |
| ★4 | Event: Slay a Yian Kut-Ku | Slay a Yian Kut-Ku | 讨伐 怪鸟 | 1800 | 0 | q1120004 |
| ★4 | Event: Slay an Arzuros | Slay an Arzuros | 讨伐 青熊兽 | 1800 | 0 | q1120005 |

### 5.3 上位 ★5（5 条）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★5 | Yowamushi Pedal: Princess | Hunt 3 Rathians | 狩猎 雌火龙×3 | 16200 | 710 | q1010102 |
| ★5 | Jump: The Desert Crown | Hunt a Barroth | 狩猎 土砂龙 | 6300 | 400 | q1010168 |
| ★5 | The Legend of Zelda: Power | Hunt a Basarios | 狩猎 岩龙 | 6900 | 400 | q1010171 |
| ★5 | Animal Crossing: Picnic Day | Earn 3000 Wycademy Points | 获得 3000 点龙历院点数 | 6300 | 420 | q1110104 |
| ★5 | Case Closed: Monster Files | Hunt all large monsters | 狩猎场上全部大型怪物 | 9600 | 480 | q1110112 |

### 5.4 上位 ★6（18 条）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★6 | CoroCoro: Rolling Bowlers | Hunt all large monsters | 狩猎场上全部大型怪物 | 15300 | 760 | q1010104 |
| ★6 | Anything For a Buck | Hunt a Great Maccao | 狩猎 跳狗龙王 | 4800 | 250 | q1010158 |
| ★6 | Okami: Most Wanted | Hunt a Malfestio | 狩猎 夜鸟 | 10200 | 580 | q1010174 |
| ★6 | Event: Slay a Mizutsune | Slay a Mizutsune | 讨伐 泡狐龙 | 2700 | 0 | q1020001 |
| ★6 | Event: Slay a Glavenus | Slay a Glavenus | 讨伐 斩龙 | 2700 | 0 | q1020002 |
| ★6 | Event: Slay a Gammoth | Slay a Gammoth | 讨伐 巨兽 | 2700 | 0 | q1020003 |
| ★6 | Event: Slay an Astalos | Slay an Astalos | 讨伐 电龙 | 2700 | 0 | q1020004 |
| ★6 | Event: Slay a Lagiacrus | Slay a Lagiacrus | 讨伐 海龙 | 2700 | 0 | q1020005 |
| ★6 | Event: Hunt-a-thon 1 | Slay all large monsters | 讨伐场上全部大型怪物 | 2700 | 0 | q1020006 |
| ★6 | Event: Slay a Zinogre | Slay a Zinogre | 讨伐 雷狼龙 | 2700 | 0 | q1020009 |
| ★6 | Event: Slay a Gore Magala | Slay Gore Magala | 讨伐 黑蚀龙 | 2700 | 0 | q1020010 |
| ★6 | Event: Slay a Tigrex | Slay a Tigrex | 讨伐 轰龙 | 2700 | 0 | q1020011 |
| ★6 | Event: Slay a Rathalos | Slay a Rathalos | 讨伐 火龙 | 2700 | 0 | q1020012 |
| ★6 | Event: Slay a Nargacuga | Slay a Nargacuga | 讨伐 迅龙 | 2700 | 0 | q1020013 |
| ★6 | Event: Hunt-a-thon 4 | Slay all large monsters | 讨伐场上全部大型怪物 | 2700 | 0 | q1020014 |
| ★6 | Making the Cut | Sever Rathian's tail | 切断 雌火龙 的尾巴 | 3000 | 260 | q1110108 |
| ★6 | Too Hot to Handle | Deliver 2 Powderstones | 交纳 火药岩×2 | 6900 | 350 | q1110111 |
| ★6 | Event: Hunt-a-thon 5 | Slay all large monsters | 讨伐场上全部大型怪物 | 2700 | 0 | q1120006 |

### 5.5 上位 ★7（61 条）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| ★7 | Crows: The Black Crows | Hunt 2 Yian Garuga | 狩猎 黑狼鸟×2 | 12600 | 800 | q1010101 |
| ★7 | Baki: Biggest vs. Strongest | Hunt a Gammoth | 狩猎 巨兽 | 20400 | 1100 | q1010103 |
| ★7 | Ushio & Tora: White Mizutsune | Hunt a Mizutsune | 狩猎 泡狐龙 | 18600 | 1000 | q1010105 |
| ★7 | Magi: Rescue from the Fall | Hunt a Gore Magala | 狩猎 黑蚀龙 | 17100 | 880 | q1010106 |
| ★7 | The Exploding Flame King | Slay a Teostra | 讨伐 炎王龙 | 21600 | 1200 | q1010107 |
| ★7 | Yu-Gi-Oh: A Beautiful Wyvern | Slay a Shagaru Magala | 讨伐 天廻龙 | 20700 | 1060 | q1010108 |
| ★7 | Jump: Boiling Magma | Hunt a Lavasioth | 狩猎 熔岩龙 | 12000 | 750 | q1010109 |
| ★7 | Famitsu: Mizutsune Feature | Hunt 3 Mizutsunes | 狩猎 泡狐龙×3 | 26100 | 1210 | q1010110 |
| ★7 | Dengeki: Turbulent Seas | Hunt a Lagiacrus | 狩猎 海龙 | 15300 | 850 | q1010111 |
| ★7 | Uniqlo Shock Fest | Hunt 2 Astalos | 狩猎 电龙×2 | 20400 | 1210 | q1010112 |
| ★7 | Star Fox: Battle at Arctic Ridge | Hunt a Blangonga | 狩猎 雪狮子王 | 10800 | 680 | q1010118 |
| ★7 | The Three Virtues | Hunt all large monsters | 狩猎场上全部大型怪物 | 26700 | 1490 | q1010119 |
| ★7 | Metroid: Special Mission | Hunt a Yian Garuga | 狩猎 黑狼鸟 | 14400 | 800 | q1010120 |
| ★7 | The Steel Vanguard | Slay a Kushala Daora | 讨伐 钢龙 | 21600 | 1200 | q1010121 |
| ★7 | The Voracious King | Hunt a Deviljho | 狩猎 恐暴龙 | 21600 | 980 | q1010122 |
| ★7 | DMC: The Seltas Queen's Cry | Hunt a Seltas Queen | 狩猎 重甲虫 | 16800 | 940 | q1010123 |
| ★7 | Mega Man: Yellow Devil | Hunt a Royal Ludroth | 狩猎 水兽 | 8700 | 500 | q1010124 |
| ★7 | Capcom: Brilliant Orchestra | Hunt a Najarala | 狩猎 绞蛇龙 | 12900 | 750 | q1010125 |
| ★7 | Felyne Village: The Tourney | Hunt all large monsters | 狩猎场上全部大型怪物 | 19200 | 1040 | q1010127 |
| ★7 | Fan Club: Great All Stars | Hunt all large monsters | 狩猎场上全部大型怪物 | 10500 | 530 | q1010128 |
| ★7 | Fan Club: Remobra Removal | Slay 12 Remobras | 讨伐 蛇龙×12 | 6000 | 300 | q1010129 |
| ★7 | Capcom: White & Black | Hunt all large monsters | 狩猎场上全部大型怪物 | 20400 | 1140 | q1010130 |
| ★7 | Capcom: The Ruler's Rage | Slay an Akantor | 讨伐 霸龙 | 23100 | 1200 | q1010131 |
| ★7 | Moonlit Tryst | Hunt a Silver Rathalos and a Gold Rathian | 狩猎 银火龙＋金火龙 | 31800 | 1770 | q1010133 |
| ★7 | Raging Twins | Hunt 2 Rajang | 狩猎 金狮子×2 | 30300 | 1730 | q1010134 |
| ★7 | All's Hair in Glove & War | Hunt a Rajang | 狩猎 金狮子 | 21600 | 980 | q1010135 |
| ★7 | A Golden Moon Rises | Hunt a Gold Rathian | 狩猎 金火龙 | 27300 | 1320 | q1010137 |
| ★7 | Silver and Gold | Hunt a Silver Rathalos and a Gold Rathian | 狩猎 银火龙＋金火龙 | 38400 | 2120 | q1010138 |
| ★7 | Secret Nibelsnarf Hunt | Hunt a Nibelsnarf | 狩猎 潜口龙 | 9300 | 620 | q1010140 |
| ★7 | The Obvious Choice... | Hunt a Daimyo Hermitaur | 狩猎 大名盾蟹 | 8700 | 500 | q1010141 |
| ★7 | It Would Be a Shame If... | Hunt a Shogun Ceanataur | 狩猎 将军镰蟹 | 10800 | 680 | q1010142 |
| ★7 | Not Stepping One Foot... | Hunt a Brachydios | 狩猎 碎龙 | 18300 | 1070 | q1010143 |
| ★7 | Picturesque Encounter | Hunt a Zinogre | 狩猎 雷狼龙 | 16500 | 850 | q1010144 |
| ★7 | Absolute Power | Hunt a Tigrex | 狩猎 轰龙 | 18300 | 880 | q1010145 |
| ★7 | A Land Draped in Fantasy | Slay a Kirin | 讨伐 麒麟 | 17400 | 840 | q1010146 |
| ★7 | The Formless One | Slay a Chameleos | 讨伐 霞龙 | 21600 | 1200 | q1010147 |
| ★7 | The White God Returns | Slay an Ukanlos | 讨伐 崩龙 | 23100 | 1200 | q1010148 |
| ★7 | Evil Descendeth Upon Us | Slay an Amatsu | 讨伐 岚龙 | 23100 | 1200 | q1010149 |
| ★7 | Where Gods Fear to Tread | Slay an Alatreon | 讨伐 煌黑龙 | 25200 | 1800 | q1010150 |
| ★7 | Harbinger of Death | Slay Nakarkos | 讨伐 骸龙 | 25200 | 1440 | q1010151 |
| ★7 | No Party Poopers! | Hunt all large monsters | 狩猎场上全部大型怪物 | 23400 | 1240 | q1010152 |
| ★7 | The Five Kings of Destruction | Hunt all large monsters | 狩猎场上全部大型怪物 | 63600 | 3230 | q1010153 |
| ★7 | How It's Done | Hunt all large monsters | 狩猎场上全部大型怪物 | 31800 | 1830 | q1010154 |
| ★7 | Unbridled Rage | Hunt 2 Deviljho | 狩猎 恐暴龙×2 | 30300 | 1730 | q1010155 |
| ★7 | Insanity and Destruction | Hunt a Deviljho and a Rajang | 狩猎 恐暴龙＋金狮子 | 30300 | 1730 | q1010156 |
| ★7 | Volcano Item Delivery | Earn 7000 Wycademy Points | 获得 7000 点龙历院点数 | 18000 | 1000 | q1010157 |
| ★7 | A Mammoth Mistake | Hunt a Gammoth | 狩猎 巨兽 | 15000 | 800 | q1010159 |
| ★7 | The Untamed Mountains | Hunt a Duramboros and a Gammoth | 狩猎 尾锤龙＋巨兽 | 20700 | 1190 | q1010161 |
| ★7 | The Best of the Best | Hunt all large monsters | 狩猎场上全部大型怪物 | 58800 | 2970 | q1010163 |
| ★7 | The Greatest Hunter | Hunt all large monsters | 狩猎场上全部大型怪物 | 53100 | 2860 | q1010164 |
| ★7 | Retreat Run-in | Hunt all large monsters | 狩猎场上全部大型怪物 | 26400 | 1520 | q1010165 |
| ★7 | Overcome with Awe | Hunt all large monsters | 狩猎场上全部大型怪物 | 25200 | 1400 | q1010166 |
| ★7 | The Hammer and the Pike | Hunt an Uragaan and an Agnaktor | 狩猎 爆锤龙＋炎戈龙 | 17700 | 1070 | q1010167 |
| ★7 | Strider: Frozen Mission | Hunt a Deviljho | 狩猎 恐暴龙 | 21600 | 1080 | q1010170 |
| ★7 | Fire Emblem: Warding Despair | Hunt a Silver Rathalos | 狩猎 银火龙 | 27300 | 1320 | q1010172 |
| ★7 | Ghosts 'n Goblins: Seeing Red | Hunt a Rathalos | 狩猎 火龙 | 15300 | 850 | q1010175 |
| ★7 | Event: Hunt-a-thon 2 | Slay all large monsters | 讨伐场上全部大型怪物 | 2700 | 0 | q1020007 |
| ★7 | Event: Hunt-a-thon 3 | Slay all large monsters | 讨伐场上全部大型怪物 | 2700 | 0 | q1020008 |
| ★7 | SF: Ultimate Entrance Exam | Hunt all large monsters | 狩猎场上全部大型怪物 | 7800 | 360 | q1110105 |
| ★7 | Fan Club: Arena Action | Hunt all large monsters | 狩猎场上全部大型怪物 | 12000 | 610 | q1110106 |
| ★7 | Catch a Rathalos by the Tail | Sever Rathalos's tail | 切断 火龙 的尾巴 | 4200 | 320 | q1110109 |

### 5.6 G★1（2 条 · `stars=11`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★1 | WORST: Skull Motif | Hunt 2 Lagombi | 狩猎 白兔兽×2 | 13800 | 650 | q1111002 |
| G★1 | Turnabout Takedown | Hunt 2 Giadrome | 狩猎 白速龙王×2 | 8100 | 500 | q1111004 |

### 5.7 G★2（12 条 · `stars=12`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★2 | Kingdom: Test of the Best! | Hunt a Daimyo Hermitaur | 狩猎 大名盾蟹 | 13200 | 670 | q1011002 |
| G★2 | Famitsu: Kecha the Scoop! | Hunt a Kecha Wacha | 狩猎 奇猿狐 | 11100 | 640 | q1011006 |
| G★2 | Frozen Free-For-All | Hunt a Zamtrios and a Tetsucabra | 狩猎 变形冰鲨＋鬼蛙 | 16500 | 960 | q1011013 |
| G★2 | It'll Come Out in the Wash | Hunt all large monsters | 狩猎场上全部大型怪物 | 21900 | 1240 | q1011016 |
| G★2 | XX Trials: Gravios | Slay a Gravios | 讨伐 铠龙 | 3600 | 0 | q1020020 |
| G★2 | CoroCoro: Fart of Darkness | Hunt a Congalala | 狩猎 桃毛兽王 | 11400 | 630 | q1111003 |
| G★2 | The Legend of Zelda: Wisdom | Break Nerscylla's poison spike | 破坏 影蜘蛛 的毒棘（部位名 [U]） | 7200 | 420 | q1111006 |
| G★2 | XX Trials: Rathalos | Slay a Rathalos | 讨伐 火龙 | 3600 | 0 | q1120007 |
| G★2 | XX Trials: Tigrex | Slay a Tigrex | 讨伐 轰龙 | 3600 | 0 | q1120008 |
| G★2 | XX Trials: Nargacuga | Slay a Nargacuga | 讨伐 迅龙 | 3600 | 0 | q1120009 |
| G★2 | XX Trials: Zinogre | Slay a Zinogre | 讨伐 雷狼龙 | 3600 | 0 | q1120010 |
| G★2 | XX Trials: Brachydios | Slay a Brachydios | 讨伐 碎龙 | 3600 | 0 | q1120011 |

### 5.8 G★3（19 条 · `stars=13`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★3 | Shonen: Winged Nocturne | Hunt a Malfestio | 狩猎 夜鸟 | 15000 | 770 | q1011004 |
| G★3 | Dengeki: Top of Old Sparky | Slay a Kirin | 讨伐 麒麟 | 26100 | 1120 | q1011007 |
| G★3 | Nerscylla Nightmare | Hunt 2 Nerscylla | 狩猎 影蜘蛛×2 | 26400 | 1590 | q1011015 |
| G★3 | "My Love is Like a Chill Wind...?" | Hunt all large monsters | 狩猎场上全部大型怪物 | 31800 | 1610 | q1011017 |
| G★3 | A Solid Argument | Hunt a Basarios and a Gravios | 狩猎 岩龙＋铠龙 | 27900 | 1530 | q1011018 |
| G★3 | XX Trials: Dreadqueen | Slay a Dreadqueen Rathian | 讨伐 紫毒姬雌火龙 | 4500 | 0 | q1020015 |
| G★3 | XX Trials: Thunderlord | Slay a Thunderlord Zinogre | 讨伐 金雷公雷狼龙 | 4500 | 0 | q1020016 |
| G★3 | XX Trials: Silverwind | Slay a Silverwind Nargacuga | 讨伐 白疾风迅龙 | 4500 | 0 | q1020017 |
| G★3 | XX Trials: Dreadking | Slay a Dreadking Rathalos | 讨伐 黑炎王雄火龙 | 4500 | 0 | q1020018 |
| G★3 | XX Trials: Grimclaw | Slay a Grimclaw Tigrex | 讨伐 荒钩爪轰龙 | 4500 | 0 | q1020019 |
| G★3 | XX Trials: Elderfrost | Slay an Elderfrost Gammoth | 讨伐 银峰巨兽 | 4500 | 0 | q1020021 |
| G★3 | XX Trials: Stonefist | Slay a Stonefist Hermitaur | 讨伐 矛碎大名盾蟹 | 4500 | 0 | q1020024 |
| G★3 | XX Trials: Drilltusk | Slay a Drilltusk Tetsucabra | 讨伐 岩穿鬼蛙 | 4500 | 0 | q1020025 |
| G★3 | XX Trials: Redhelm | Slay a Redhelm Arzuros | 讨伐 红盔青熊兽 | 4500 | 0 | q1020026 |
| G★3 | XX Trials: Deadeye | Slay a Deadeye Yian Garuga | 讨伐 独眼黑狼鸟 | 4500 | 0 | q1020027 |
| G★3 | XX Trials: Snowbaron | Slay a Snowbaron Lagombi | 讨伐 大雪主白兔兽 | 4500 | 0 | q1020028 |
| G★3 | Baki: Deadly Claws | Sever Glavenus's tail | 切断 斩龙 的尾巴 | 8100 | 610 | q1111001 |
| G★3 | Capcom: Prowler's Spirit | Wound Gravios's chest | 破坏 铠龙 的胸部 | 7500 | 570 | q1111005 |
| G★3 | XX Trials: Hunt-a-thon IV | Slay all large monsters | 讨伐场上全部大型怪物 | 4500 | 0 | q1120012 |

### 5.9 G★4（34 条 · `stars=14`）

| 星级 | 任务名（db 原文） | 目标（原文） | 目标（中文） | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|---|
| G★4 | Case Closed: Desert Arrest! | Capture a Seregios | 捕获 千刃龙 | 35700 | 1710 | q1011001 |
| G★4 | Drifters: Isle of Lost Souls | Hunt a Brachydios | 狩猎 碎龙 | 32700 | 1710 | q1011005 |
| G★4 | The Legend of Zelda: Courage | Slay a Kushala Daora | 讨伐 钢龙 | 39000 | 1920 | q1011008 |
| G★4 | Into the Maw of Darkness | Hunt a Zinogre | 狩猎 雷狼龙 | 29700 | 1370 | q1011010 |
| G★4 | Fan Club: Climbing The Ranks | Hunt a Lagiacrus | 狩猎 海龙 | 27300 | 1370 | q1011011 |
| G★4 | URGENT: COAL MINERS NEEDED | Deliver 10 pieces of Coal or a Paw Pass Ticket | 交纳 燃石炭×10 或 猫车票券 | 6300 | 500 | q1011012 |
| G★4 | Glimmers of False Hope | Hunt a Silver Rathalos and a Gold Rathian | 狩猎 银火龙＋金火龙 | 57300 | 2840 | q1011019 |
| G★4 | Violence in the Verdure | Hunt an Astalos | 狩猎 电龙 | 31200 | 1450 | q1011020 |
| G★4 | Paws Off My Fish! | Hunt a Mizutsune | 狩猎 泡狐龙 | 31200 | 1450 | q1011021 |
| G★4 | Big, Bad 'n' Woolly | Hunt a Gammoth | 狩猎 巨兽 | 31200 | 1450 | q1011022 |
| G★4 | Blade Blazing Brightly Black | Hunt a Glavenus | 狩猎 斩龙 | 31200 | 1450 | q1011023 |
| G★4 | Forewarned is Four-Horned | Hunt 2 Diablos | 狩猎 角龙×2 | 38400 | 1880 | q1011024 |
| G★4 | Meat is Murder | Hunt a Deviljho | 狩猎 恐暴龙 | 39000 | 1730 | q1011025 |
| G★4 | The Cry of Chaos | Hunt a Gore Magala | 狩猎 黑蚀龙 | 37800 | 1630 | q1011026 |
| G★4 | Brutal Brachydios | Slay a Brachydios | 讨伐 碎龙 | 40200 | 1810 | q1011027 |
| G★4 | Bequest Quest | Slay a Rajang | 讨伐 金狮子 | 39000 | 1730 | q1011028 |
| G★4 | Forget Valstrax, Big Sis is Scarier! | Slay a Valstrax | 讨伐 天彗龙 | 33900 | 1540 | q1011029 |
| G★4 | The Gloom of 1,001 Nights | Slay an Ahtal-Ka | 讨伐 阁螳螂 | 45600 | 2500 | q1011030 |
| G★4 | A Terrible Light | Slay a Shagaru Magala | 讨伐 天廻龙 | 33900 | 1540 | q1011031 |
| G★4 | Legitimate Soaratorium Quest | Slay a Chameleos | 讨伐 霞龙 | 39000 | 1920 | q1011032 |
| G★4 | Lord of the Volcanic Hollow | Slay a Teostra | 讨伐 炎王龙 | 39000 | 1920 | q1011033 |
| G★4 | Welcome Back To Hell | Slay a Nakarkos | 讨伐 骸龙 | 45600 | 2300 | q1011034 |
| G★4 | Monster on a Crusade | Slay an Akantor | 讨伐 霸龙 | 41700 | 1920 | q1011035 |
| G★4 | Ukanlos-Made Global Cooling | Slay an Ukanlos | 讨伐 崩龙 | 41700 | 1920 | q1011036 |
| G★4 | Lao-Shan Lung Time No See | Slay a Lao-Shan Lung or repel it | 讨伐 老山龙（或击退） | 36600 | 1880 | q1011037 ※3 |
| G★4 | Alatreon and Alack | Slay an Alatreon | 讨伐 煌黑龙 | 45600 | 2880 | q1011039 |
| G★4 | End of a Dark History | Slay a Fatalis | 讨伐 黑龙 | 54000 | 3070 | q1011040 |
| G★4 | To Slay a Legend | Slay a Fatalis | 讨伐 黑龙 | 54000 | 3070 | q1011041 |
| G★4 | Defy the Prophecy | Slay a Fatalis | 讨伐 黑龙 | 54000 | 3070 | q1011042 |
| G★4 | Monster Hunter Channel I | Hunt all large monsters | 狩猎场上全部大型怪物 | 69000 | 3330 | q1011043 |
| G★4 | Monster Hunter Channel II | Hunt all large monsters | 狩猎场上全部大型怪物 | 80400 | 4070 | q1011044 |
| G★4 | XX Trials: Hunt-a-thon I | Slay all large monsters | 讨伐场上全部大型怪物 | 4500 | 0 | q1020022 |
| G★4 | XX Trials: Hunt-a-thon II | Slay all large monsters | 讨伐场上全部大型怪物 | 4500 | 0 | q1020023 |
| G★4 | XX Trials: Hunt-a-thon III | Slay all large monsters | 讨伐场上全部大型怪物 | 4500 | 0 | q1020029 |

> ※3 q1011037 是**全表唯一时限 35 分钟**的配信任务（其余 165 条都是 50 分钟，`quests.time_limit`）。

---

## 6. 亮点与用法

### 6.1 配信：报酬金 ≥ 50000z 的 9 条

```sql
SELECT _id, name, stars, reward, hrp FROM quests
WHERE hub='Event' ORDER BY reward DESC LIMIT 9;
```

| 排名 | 任务名（db 原文） | 星级 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|
| 1 | Monster Hunter Channel II | G★4 | **80400** | **4070** | q1011044 |
| 2 | Monster Hunter Channel I | G★4 | 69000 | 3330 | q1011043 |
| 3 | The Five Kings of Destruction | ★7 | 63600 | 3230 | q1010153 |
| 4 | The Best of the Best | ★7 | 58800 | 2970 | q1010163 |
| 5 | Glimmers of False Hope | G★4 | 57300 | 2840 | q1011019 |
| 6 | End of a Dark History | G★4 | 54000 | 3070 | q1011040 |
| 7 | To Slay a Legend | G★4 | 54000 | 3070 | q1011041 |
| 8 | Defy the Prophecy | G★4 | 54000 | 3070 | q1011042 |
| 9 | The Greatest Hunter | ★7 | 53100 | 2860 | q1010164 |

> 全 166 条的报酬区间是 **1800 – 80400z**，HRP 上限 **4070**（`MIN/MAX` 直接来自 db）。
> 前 3 名里有 2 条是狞猛化任务（Channel I/II、五王），这也是刷狞猛素材时报酬最高的一档。
> 单条全库最高（含非配信）是 G★4「Path of the Hunter」q11450 = 78600z / HRP 3610，它是**狞猛化任务**（见 §3.5）。

### 6.2 狞猛化任务：报酬金 top 8

| 任务名（db 原文） | 星级 | 狞猛化怪物 | 报酬金 | HRP | 来源 |
|---|---|---|---|---|---|
| Monster Hunter Channel II | 配信 G★4 | 碎龙＋黑蚀龙＋千刃龙＋斩龙 | 80400 | 4070 | q1011044 |
| Path of the Hunter | 集会所 G★4 | 泡狐龙＋电龙＋巨兽＋斩龙＋角龙 | 78600 | 3610 | q11450 |
| Monster Hunter Channel I | 配信 G★4 | 火龙＋轰龙＋迅龙＋海龙＋雷狼龙 | 69000 | 3330 | q1011043 |
| The Five Kings of Destruction | 配信 ★7 | 巨兽＋电龙＋泡狐龙＋斩龙＋恐暴龙 | 63600 | 3230 | q1010153 |
| Glimmers of False Hope | 配信 G★4 | 银火龙＋金火龙 | 57300 | 2840 | q1011019 |
| Arena Allegiances | 集会所 G★4 | 绞蛇龙（同场：雷狼龙＋轰龙＋铠龙） | 57000 | 2650 | q11480 |
| Advanced: Ultimate Generation | 村 ★10 | 斩龙＋电龙＋泡狐龙＋巨兽 | 56100 | 2760 | q1055 |
| Bloodbath G4: Hunt | 特殊许可 G★4 | 千刃龙（同场：鏖魔角龙） | 48300 | 3360 | q41814 |

### 6.3 配信里 41 条 `HRP=0` 的构成

| 类 | 条数 | 星级分布 | 特征 |
|---|---|---|---|
| `Event: Slay a X`（单体讨伐） | 15 | ★4 5 / ★6 10 | 报酬 1800 或 2700z，`hrp=0` |
| `Event: Hunt-a-thon N`（大连续讨伐） | 5 | ★6 3 / ★7 2 | 报酬 2700z，`hrp=0` |
| `XX Trials: …`（试炼：二名 11 + 普通 6 + 大连续 4） | 21 | G★2 6 / G★3 12 / G★4 3 | 报酬 3600 或 4500z，`hrp=0` |
| **合计** | **41** | | `SELECT COUNT(*) FROM quests WHERE hub='Event' AND hrp=0` = 41 |

> 这 41 条**不影响 HR**（HRP=0），只对素材/装备有用。狞猛化任务里也有 1 条 `hrp=0`：配信 ★7「Event: Hunt-a-thon 3」q1020008。

### 6.4 狞猛化任务与解锁门槛

| 事实 | 依据 |
|---|---|
| 狞猛化任务**不是**关键/紧急任务：151 条村/集会所关键+紧急里 `hyper=1` 命中 **0** | `docs/wiki/quests.md` §6 [W] + 本页 §2 的分星计数 |
| 集★6 的狞猛化任务 **22 条** ≥ 门槛「≥2 完成」 | §3.1 小计 + `docs/wiki/quests.md` §6 [W] |
| G★4 的狞猛化任务 **32 条** ≥ 门槛「≥6 完成」 | §3.5 小计 + 同上 |
| 集会所 G★2 只有 **6** 条狞猛任务、G★3 有 **17** 条（两档合计 23 条 = 集会所狞猛池 109 条的 21%） | §3.3 / §3.4 |
| 上位★6 的狞猛化任务都集中在列表尾部（q10644–q10665），与 wiki「集★6 尾部与集★7 整批」一致 | §3.1 / §3.2 |

> 门槛原文侧的口径（按星级分段还是全局累计）wiki 未写明，`docs/wiki/quests.md` §6 记为 [U]；本页只给"该星级下有多少条狞猛任务"这个可算的量。

### 6.5 狞猛化素材（官方简中名，`itemData_chS` 槽位 946–1034）

`chS/table/itemData_chS.gmd` 的槽位 **946..1034（步长 2）连续 45 条**是狞猛化素材，前后分别是「白化精华」(#944) 与「猫毛红玉」(#1036)，所以这 45 条是完整的一段 [B]。

| 分组 | 素材名（槽位） |
|---|---|
| 通用 | 狞猛化精华 (#946)、狞猛化浓缩精华 (#948) |
| 牙 | 狞猛的牙 (#950)、狞猛的锐牙 (#952)、狞猛的重牙 (#954)、狞猛的重锐牙 (#956)、狞猛的重刚牙 (#958) |
| 爪 | 狞猛的爪 (#960)、狞猛的尖爪 (#962)、狞猛的重爪 (#964)、狞猛的重尖爪 (#966)、狞猛的重刚爪 (#968) |
| 龙骨 | 狞猛的龙骨 (#970)、狞猛的强龙骨 (#972)、狞猛的重龙骨 (#974) |
| 角 | 狞猛的尖角 (#976)、狞猛的刚角 (#978) |
| 火 | 狞猛的火炎袋 (#980)、狞猛的业炎袋 (#982)、狞猛的炎鳞 (#984)、狞猛的狱炎鳞 (#986) |
| 水 | 狞猛的水袋 (#988)、狞猛的特大水袋 (#990)、狞猛的体液 (#992)、狞猛的浓体液 (#994) |
| 雷 | 狞猛的电袋 (#996)、狞猛的雷电袋 (#998)、狞猛的带电壳 (#1000)、狞猛的带电重壳 (#1002)、狞猛的带电毛 (#1004)、狞猛的雷电毛 (#1006) |
| 冰 | 狞猛的冰块 (#1008)、狞猛的大冰块 (#1010) |
| 龙（蚀龙） | 狞猛的蚀龙鳞 (#1012)、狞猛的蚀龙厚鳞 (#1014) |
| 毒 | 狞猛的毒液 (#1016)、狞猛的强毒液 (#1018)、狞猛的麻痹毒液 (#1020)、狞猛的强麻痹毒液 (#1022) |
| 睡眠 | 狞猛的睡眠袋 (#1024)、狞猛的昏睡袋 (#1026)、狞猛的睡眠毒液 (#1028)、狞猛的强睡眠毒液 (#1030) |
| 爆破 | 狞猛的爆液 (#1032)、狞猛的爆缩液 (#1034) |

> 上表 45 条全部是 [B]（`itemData_chS` 槽位号 1:1，取名用 `2*items._id`、取说明用 `2*_id+1` 的既有约定，已用 `items._id 2103 → #4206`（赫星石）验证）。
> 哪一档素材出自哪个任务档次（上位 / G 级 / 狞猛度）**没有本地表**，标 [U]；不要按名字里的"重/刚"去推等级。

---

## 7. 复算与出处

### 7.1 四条对账 SQL（照抄即可复现本页所有合计）

```sql
-- ① 狞猛化任务：165 条（按据点/星级）
SELECT q.hub, q.stars, COUNT(DISTINCT q._id) n
FROM monster_to_quest m JOIN quests q ON q._id = m.quest_id
WHERE m.hyper = 1 GROUP BY q.hub, q.stars ORDER BY q.hub, q.stars;

-- ② 狞猛化「任务×怪物」对：235 行、44 种怪
SELECT COUNT(*) pairs, COUNT(DISTINCT monster_id) kinds FROM monster_to_quest WHERE hyper=1;

-- ③ 配信任务：166 条（按下位/上位/G + 星级）
SELECT rank, stars, COUNT(*) n FROM quests WHERE hub='Event'
GROUP BY rank, stars ORDER BY rank, stars;

-- ④ 交叉核对：狞猛池里有没有下位任务（应为 0）
SELECT COUNT(*) FROM quests
WHERE rank='LR' AND _id IN (SELECT quest_id FROM monster_to_quest WHERE hyper=1);
```

| 断言 | 值 | 复算式 |
|---|---|---|
| 狞猛化任务总数 | **165** | ① 的 14 行求和 = §3 各节小计之和（22+32+6+17+32+9+4+43） |
| 狞猛化任务按难度 | 上位 82 / G 级 83 / 下位 0 | ① 结果 + ④ = 0 |
| 狞猛化对数 / 种数 | 235 / 44 | ② |
| 配信任务总数 | **166** | ③ 的 10 行求和 = §5 各节小计之和（4+3+8+5+18+61+2+12+19+34） |
| 配信任务按难度 | 下位 7 / 上位 92 / G 级 67 | ③ 按 `rank` 再汇总 |
| 配信 `hrp=0` | 41 | §6.3 |
| 缺号 | 配信 id 在 1011001–1011044 内跳过 **1011038**（db 无该行，不是本页漏写）；狞猛池的"跳号"多因该 id 存在但 `hyper=0`（例 q11482 / q11484 / q11485 都在集会所 G★4 却不是狞猛任务） | `SELECT * FROM quests WHERE _id=1011038` 返回 0 行 |

### 7.2 来源清单

| 内容 | 路径 | 等级 |
|---|---|---|
| 任务行（`_id`/`name`/`goal`/`hub`/`rank`/`stars`/`reward`/`hrp`/`time_limit`） | `MHGU/docs/data/mhgu.db` → `quests`（1355 行） | I |
| 狞猛化归属（`hyper`）与同场怪（`unstable`=乱入） | 同上 → `monster_to_quest`（2305 行） | I |
| 怪物名 | 同上 → `monsters` | I |
| 怪物官方简中名 | `chS/arc/resident_chS.arc :: GUI/06_msg/monsterName_chS`（268 串，槽位 i）；本地 JSON `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json`；en→cn 对照 `MHGU/docs/data/json/monster-slot-map.json` | B |
| 狞猛化术语原文 | `chS/table/HN_HunterTipsMsg_chS.gmd` #140/#405/#406/#407/#408；`GC_Title_1_chS` #116/#1425；`itemCategoryTypeData_chS` #13/#14；`Lb_MakaRenkinMsg_chS` #14–16（+ `other_01` #17）；`GC_Medal_chS` #168/#193/#208/#223 | B |
| 星级串写法 | `chS/arc/resident_chS.arc :: GUI/06_msg/questMessage_chS`（`Star1..Star10`、`Rank_G_01..04`） | B |
| 素材官方简中名 | `chS/table/itemData_chS.gmd`（槽位 `2*items._id`） | B |
| 狞猛化素材 45 条 | `chS/table/itemData_chS.gmd` #946–#1034 | B |
| 「龙历院点数」写法 | `chS/table/CommonMsg_chS.gmd` #49；`HN_HunterTipsMsg_chS` #154；`ResultMsg_chS` #42 | B |
| 英文任务标题与目标同源 | `romfs/nativeNX/eng/quest/questData/questData_<id>_eng.gmd`；`docs/data/romfs-tables.md` §4 记录过 q101 的三值对拍 | W（转述；本页未逐条读原文） |
| 狞猛化任务的开锁门槛、非关键任务结论 | `docs/wiki/quests.md` §6；`docs/wiki/progression-unlocks.md` §6 | W |
| 配信任务不参与推进 | `docs/mechanics/quests.md` §1（hub 表） | W |

> 例外：**激昂金狮子** 不是 `monsterName_chS` 的槽位串。项目 `monster-slot-map.json` 对 slot 22（`Furious Rajang`）给的 `cn` 是「激昂金狮子」，其 `cn_src` = `chS/table/itemData_chS.gmd #2997`（原文「激昂金狮子的毛。…」，即取素材名里的怪物称谓）；`monsterName_chS` 的 i22（`EnragedRajang`）只有「金狮子」。本页两处用到它（q1029、q41015）均按 slot map 写作 激昂金狮子。

### 7.3 本页"没有"的东西（避免误用）

- **本页任务没有官方中文标题**：简中包不含逐任务标题（`chS/`、`chT/` 无 `quest/` 目录；`questData_*_<lang>.gmd` 只随包 eng/fre/ger/ita/spa 五种）。唯一的中文任务文本是 `chS/table/guestQuestData_chS.gmd` 的 462 串 = 231 组**通用**任务名/目标（如「狩猎蓝速龙王！」「缴纳深层菇」），**不含**本页任何一条狞猛/配信任务的标题（对 8 个联动关键词 grep 命中 0）。所以本页任务名一律保留英文原文。
- **没有狞猛化任务的"委托人文案"**：配信/狞猛任务的对话与说明文本同样只有 eng/fre/ger/ita/spa。
- **没有乱入标记的独立列**：`monster_to_quest.unstable` 是"乱入"标志（全库 483 行为 1），本页只把 `hyper` 当狞猛判据（`docs/spec-crossgame/monster-gu.md` 明确「`hyper` 标志是判断狞猛化任务的唯一字段」）。

---

## 8. 未解（[U]，不要当结论用）

| # | 问题 | 现状 | 需要什么 |
|---|---|---|---|
| 1 | `monster_to_quest.hyper` 的**字节级**验证 | 只与 db 对拍；romfs 的 `loc/quest/questData/questData_<id>.ext`（369 B，`Monsters[5]` @0x05C，每条 13 B）**没有已解读的"狞猛标志"字段**（`docs/data/romfs-tables.md` §2 的 13 B 结构；`docs/wiki/monster-parts-hp.md` 只解了 `HealthTbl`/`AtkTbl`/`StaminaTbl`） | 解 `Monsters[]` 里剩余字节，或运行时读任务结构 |
| 2 | 狞猛化素材 ↔ 任务档次的对应 | 只有 45 条素材名，没有产出表 | `quest_rewards` 里狞猛素材 item_id 的分布（db 有 37370 行报酬，可按 item_id 反查） |
| 3 | 配信 166 条的中文名与中文目标 | 本页 166 条无官方中文标题（逐任务文本只有 5 种语言；`guestQuestData_chS` 只有通用任务名，见 §7.3） | 官方中文资料或人工译名（本页不造） |
| 4 | 「挑战任务」20 条对应的 questId | db 里没有独立 hub，`1288–1304` 是斗技 17 条 | 需要 questData 或运行时任务表 |
| 5 | 狞猛化计数门槛的分段口径（按星级 or 全局） | wiki 原文只写「集★6 的狞猛化任务 ≥2」 | 实机：只打集★5 的狞猛任务，看集★7 是否开放 |
| 6 | 狞猛化任务里"同场非狞猛怪"是否真的是乱入 | 本页只按 `hyper=0` 区分。这些同场怪共 **23 行 / 19 条任务**，`unstable` 全为 **0**（连 235 行狞猛怪也全是 0），所以 db 层面无法区分"共斗目标"与"乱入" | 解 `quest\zako\emSetList` / `setEmMain`（`docs/reference/formats/rem.md` 有成员表） |

---

> 本页所有**数字**都能用 §7.1 的 4 条 SQL 复算；所有**中文名/术语**都能在 §7.2 的 GMD 槽位里逐字对上（唯一例外「激昂金狮子」的取法见该表下注）。英文任务名、报酬、HRP 属第三方库 [I]；狞猛化归属（`hyper`）同样是 [I]，未经 romfs 字节复核（见 §8 #1）。
