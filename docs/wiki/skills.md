# 技能（スキル）全表：点数系统、205 棵树、装饰珠

**这一页能查到什么**：MHGU（Switch 1.4.0）全部 205 个技能系统的中文名、每档发动点数（+10/+15/+20 与 −10/−15/−20）、发动后的技能中文名与效果，以及「哪颗装饰珠给这棵树点数」。
**技能怎么发动**：同一棵树按点数取**已达成的最高正向档**，或**最低负向档**，正负档不会同时存在；复合技能是独立的一棵树，自己凑够 10 点才发动。
**数据口径**：中文名与说明取自游戏本体 chS 文本表（`romfs/nativeNX/chS/table/*_chS.gmd`），点数阈值取自 mhgu.db 导出的 `docs/data/json/skills.json`（romfs 技能表 `skillTypeData.skt` 只钉到 5 点宽的档位，逐格核对见 [skill-trees-full.md](skill-trees-full.md)），珠取自 `docs/data/decorations.json`（并用 romfs `decoData.deco` 逐字节复核）。

---

## 0. 来源代号

| 代号 | 文件 | 取用字段 |
|---|---|---|
| **T** | `G:/mhgu-romfs/romfs/nativeNX/chS/table/skillTypeData_chS.gmd` | 15,379 B；`0x18`=串数 412、`0x24`=组名长 13（`skillTypeData`）、串区起 `0x28+13+1=0x36`；**第 i 对串（name,desc）= 技能树 id i**，i=0 为占位「无／无技能」 |
| **K** | `G:/mhgu-romfs/romfs/nativeNX/chS/table/skillData_chS.gmd` | 22,996 B；`0x18`=串数 656、`0x24`=9（`skillData`）、串区起 `0x32`；**第 i 对串 = 发动技能 id i**。i=0 是占位「无技能」；1..324 与 `S` 的 `_id` 同序；**第 325 对「身体系统加倍」是 `S` 里没有的一条**（对应树 203），末两对为「技能点数+2」「护石系统加倍」 |
| **S** | `MHGU/docs/data/json/skills.json` | 326 条；`skill_tree_id` / `required_skill_tree_points` / `name`；`_id` 与 K 的串对序严格同序（实证见 §1.4） |
| **N** | `MHGU/docs/data/json/skill_trees.json` | 205 条；`_id` / `name` = **技能树英文名**（≠ `S` 里的发动技能名），§2.0 专用 |
| **D** | `MHGU/docs/data/decorations.json` | 242 条；`name` / `num_slots` / `skills{树id:点数}` |
| **R** | `G:/mhgu-romfs/romfs/nativeNX/table/decoData.deco` | 1,263 B；`+0x00` f32 `21.3`、`+0x04` u32 251、其后 **251 × 5 B** = `[u8 孔数, u8 树id1, s8 点数1, u8 树id2, s8 点数2]` |
| **E** | `MHGU/docs/mechanics/skills-arts.md` | 仓库既有机制归纳（阈值统计、护石、狩技）；本页只引用其结论，不重复其推导 |

> 字节级证据：GMD 头部偏移与 `docs/data/romfs-tables.md`「gmd text」表一致；`read <gmd>` 直接可读出 UTF-8 中文（NUL 被丢弃），`@` 在 `skillData_chS.gmd` 里是独立的占位串（见 §2.3 树 203）。
>
> **权威文本可直接查**：提取物 `G:/omp works/MHGU-private/romfs-extract/gmd/table/skillData_chS.gmd.json`、`…/skillTypeData_chS.gmd.json`（提取器 `MHGU/tools/mhgu/gmd.mjs`，格式见 `MHGU/docs/reference/formats/gmd.md`）。JSON 的 `strings[i].text` 中**名字都在偶数下标**：技能 id `j` 的名字 = `strings[2j]`、说明 = `strings[2j+1]`；树 id 同理。引用写法：`chS/table/skillData_chS.gmd #2j`。本页全部 326 条技能名 + 205 条树名已用该提取物逐条回验（§6）。

---

## 1. 技能点数系统（玩家视角）

### 1.1 一棵树怎么发动

- **树 ≠ 技能**：树（技能系统，如「攻击」）是点数容器；技能（如「攻击力UP【大】」）是达到阈值后出现在状态栏的名字。两者中文名常常不同（如树「适应寒冷」发动技能「北风猎手」）。〔源 T / K〕
- **阈值档位**：`+10` 是基础档，**204 棵有技能的树全部有 +10**；部分树另有 `+15`、`+20`。负向同理有 `-10`（48 棵）、`-15`（13 棵）、`-20`（5 棵）。〔源 S，jq 统计，见 §1.2〕
- **互斥、不叠加**：同树只发动已达成的最高正向档 **或** 最低负向档。攻击 +14 点只剩「攻击力UP【小】」，不会小+中叠加。〔源 S 的阈值结构 + E §1.3〕
- **复合技能是独立树**：如「刀匠→真锻」不会因为你已有心眼与利刃各 10 点就自动出现，必须让「刀匠」树自己到 10 点。〔源 T/K：树 187「刀匠」发动技能「真锻」；E §1.3〕
- **点数可被放大**：树 204「秘术」发动「技能点数+2」（装备提供的技能点数合计 +2）；树 205「护石强化」发动「护石系统加倍」（护石提供的技能点数加倍）。树 203「身体系统加倍」的说明是「使身体防具的技能系统点数加倍」，但 romfs 技能表与 json 都**没有它的发动技能条目（无点数档）**，它到底靠什么触发仍是 [U]。〔源 T / K / S〕

### 1.2 阈值分布（对 `S` 现算，非人工计数）

| 指标 | 数值 | 依据 |
|---|---|---|
| 技能条目总数 | 326 | `length` |
| 含技能的树 | 204（树 id 1..205，仅 203 缺条目） | `group_by(.skill_tree_id)` |
| 有 +10 档的树 | 204（全部） | 同上 |
| 有 +15 档的树 | 50 | `select(.required_skill_tree_points==15)` 去重 |
| 有 +20 档的树 | 6 | 同式 ==20 |
| 有任一负档的树 | 48 | `<0` 去重 |
| −10 / −15 / −20 的树 | 48 / 13 / 5 | 分别统计 |
| 六档全开（20/15/10/−10/−15/−20）的树 | 5：18 攻击、19 防御、45 装填速度、46 后坐力、70 达人 | `group_by` 后取 `length==6` |
| 唯一「有 +20 但负向只到 −15」的树 | 135 运气（+20/+15/+10/−10/−15） | 同上 |

### 1.3 点数从哪来（容量）

| 来源 | 容量 | 依据 |
|---|---|---|
| 防具 5 部位（头/胴/腕/腰/脚） | 每件最多 5 条技能点 | 引擎成员名 `mHeadSkillPoint[0..4]` / `mTorsoSkillPoint[0..4]` / `mArmSkillPoint[0..4]` / `mWaistSkillPoint[0..4]` / `mLegSkillPoint[0..4]`（E §2 引符号表） |
| 护石 | 2 条 | `mAccSkillType1/2` + `mAccSkillPoint1/2`，点数可为负（E §2、§5） |
| 装饰珠 | 孔位决定：1 孔珠 +1/+2、2 孔珠 +3、3 孔珠 +4/+5 | §4（D + R 双源） |
| 武器 | 只给孔，无固有技能点 | E §2 |
| 秘术 / 护石强化 | 秘术：10 点发动「技能点数+2」（文本「装备提供的技能点数合计值+2」）；护石强化：10 点发动「护石系统加倍」（护石点数 ×2） | §2.3，源 T/K；「合计+2」是否等于每树 +2 见 §5 #3 |

> 负点是正常点数，不是错误：护石与防具都可能带负值，一颗正珠可以把负点抵回来〔E §5〕。

### 1.4 两表同序的实证（为什么可以把中英表拼起来）

把 `K` 的串对按序读出、`S` 按 `_id` 升序读出，逐段吻合：

| `_id` | S（英文） | K（chS） |
|---|---|---|
| 1 / 2 | Negate Poison / Double Poison | 毒耐性 / 毒加倍 |
| 7 / 8 / 9 | Negate Stun / Halve Stun / Double Stun | 昏厥无效 / 昏厥概率减半 / 昏厥加倍 |
| 12 / 13 | Windproof (Hi) / Windproof (Lo) | 风压【大】无效 / 风压【小】无效 |
| 29..34 | Attack Up (L/M/S), Attack Down (S/M/L) | 攻击力UP【大】/【中】/【小】、攻击力DOWN【小】/【中】/【大】 |
| 140..145 | Critical Eye +3..−3 | 洞察+3 / +2 / +1 / −1 / −2 / −3 |

另：树表 `T` 的条数闭合（412 串 = 2×206 对，末对止于树 205「护石强化」），与 `S` 的树 id 集合（1..205，缺 203）一致。

---

## 2. 完整技能树表

**读法**：`id` 是树 id（= `S.skill_tree_id`）；第一列 `中文树名 / English` 里的英文是**发动技能名**（源 S），**不是树名**——英文树名一律查 §2.0；「档位」写成 `点数→发动技能中文名`，负档写成 `−点数`；「珠」写成 `珠名 +点数`，其中 `Jwl N` 的 N 就是孔数（§4 已验证 242/242 条都符合）。没有珠的树写 `—`。

### 2.0 树的英文名（源 N = `MHGU/docs/data/json/skill_trees.json`）

下面三张表的第一列是「**中文树名** / **游戏内实际发动的技能英文名**」（英文名来自 `S` 的 `name`，即发动技能名）——两者常常不是一个词：树 11 的树名是 `ColdBlooded`，但它发动的技能叫 `Polar Hunter`；树 138 的树名是 `Bherna`，发动技能叫 `Soul of Bherna`。**要用英文树名查表时用这张对照**（`skill_trees.json` 的 `_id` / `name`）：

| id | 树名 | id | 树名 | id | 树名 | id | 树名 | id | 树名 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Poison | 2 | Paralysis | 3 | Sleep | 4 | Stun | 5 | Hearing |
| 6 | Wind Res | 7 | Tremor Res | 8 | Bind Res | 9 | Heat Res | 10 | Cold Res |
| 11 | ColdBlooded | 12 | HotBlooded | 13 | Anti-Theft | 14 | Def Lock | 15 | Frenzy Res |
| 16 | Biology | 17 | Bleeding | 18 | Attack | 19 | Defense | 20 | Health |
| 21 | Fire Res | 22 | Water Res | 23 | Thunder Res | 24 | Ice Res | 25 | Dragon Res |
| 26 | Blight Res | 27 | Fire Atk | 28 | Water Atk | 29 | Thunder Atk | 30 | Ice Atk |
| 31 | Dragon Atk | 32 | Elemental | 33 | Status | 34 | Sharpener | 35 | Handicraft |
| 36 | Sharpness | 37 | Fencing | 38 | Grinder | 39 | Blunt | 40 | Crit Draw |
| 41 | Punish Draw | 42 | Sheathing | 43 | Sheathe Sharpen | 44 | Bladescale | 45 | Reload Spd |
| 46 | Recoil | 47 | Precision | 48 | Normal Up | 49 | Pierce Up | 50 | Pellet Up |
| 51 | Heavy Up | 52 | Normal S+ | 53 | Pierce S+ | 54 | Pellet S+ | 55 | Crag S+ |
| 56 | Clust S+ | 57 | Poison C+ | 58 | Para C+ | 59 | Sleep C+ | 60 | Power C+ |
| 61 | Elem C+ | 62 | C.Range C+ | 63 | Exhaust C+ | 64 | Blast C+ | 65 | Rapid Fire |
| 66 | Dead Eye | 67 | Loading | 68 | Haphazard | 69 | Ammo Saver | 70 | Expert |
| 71 | Tenderizer | 72 | Chain Crit | 73 | Crit Status | 74 | Crit Element | 75 | Critical Up |
| 76 | Negative Crit | 77 | FastCharge | 78 | Stamina | 79 | Constitution | 80 | Stam Recov |
| 81 | Distance Runner | 82 | Evasion | 83 | Evade Dist | 84 | Bubble | 85 | Guard |
| 86 | Guard Up | 87 | KO | 88 | Stam Drain | 89 | Maestro | 90 | Artillery |
| 91 | Destroyer | 92 | Bomb Boost | 93 | Gloves Off | 94 | Spirit | 95 | Unscathed |
| 96 | Chance | 97 | Dragon Spirit | 98 | Potential | 99 | Survivor | 100 | Furor |
| 101 | Crisis | 102 | Guts | 103 | Sense | 104 | Team Player | 105 | TeamLeader |
| 106 | Mounting | 107 | Vault | 108 | Insight | 109 | Endurance | 110 | Prolong SP |
| 111 | Psychic | 112 | Perception | 113 | Ranger | 114 | Transporter | 115 | Protection |
| 116 | Hero Shield | 117 | Rec Level | 118 | Rec Speed | 119 | Lasting Pwr | 120 | Wide-Range |
| 121 | Hunger | 122 | Gluttony | 123 | Eating | 124 | Light Eater | 125 | Carnivore |
| 126 | Mycology | 127 | Botany | 128 | Combo Rate | 129 | Combo Plus | 130 | Speed Setup |
| 131 | Gathering | 132 | Honey | 133 | Charmer | 134 | Whim | 135 | Fate |
| 136 | Carving | 137 | Capturer | 138 | Bherna | 139 | Kokoto | 140 | Pokke |
| 141 | Yukumo | 142 | Soaratorium | 143 | Flying Pub | 144 | Redhelm | 145 | Snowbaron |
| 146 | Stonefist | 147 | Drilltusk | 148 | Dreadqueen | 149 | C.beard | 150 | Silverwind |
| 151 | Deadeye | 152 | Dreadking | 153 | Thunderlord | 154 | Grimclaw | 155 | Hellblade |
| 156 | Nightcloak | 157 | Rustrazor | 158 | Soulseer | 159 | Boltreaver | 160 | Elderfrost |
| 161 | Bloodbath | 162 | Redhelm X | 163 | Snowbaron X | 164 | Stonefist X | 165 | Drilltusk X |
| 166 | Dreadqueen X | 167 | Crystalbeard X | 168 | Silverwind X | 169 | Deadeye X | 170 | Dreadking X |
| 171 | Thunderlord X | 172 | Grimclaw X | 173 | Hellblade X | 174 | Nightcloak X | 175 | Rustrazor X |
| 176 | Soulseer X | 177 | Boltreaver X | 178 | Elderfrost X | 179 | Bloodbath X | 180 | D. Fencing |
| 181 | Edge Lore | 182 | PowerEater | 183 | Mechanic | 184 | Brawn | 185 | Prayer |
| 186 | Covert | 187 | Edgemaster | 188 | SteadyHand | 189 | Status Res | 190 | Fury |
| 191 | Nimbleness | 192 | Readiness | 193 | Resilience | 194 | Brutality | 195 | Stalwart |
| 196 | Prudence | 197 | Amplify | 198 | Hoarding | 199 | Avarice | 200 | Anti-Kushala |
| 201 | Anti-Chameleos | 202 | Anti-Teostra | 203 | Torso Up | 204 | Secret Arts | 205 | Talisman Boost |

### 2.1 普通技能树（id 1–137）

| id | 树（中文）/ English 发动技能名 | 效果（树说明摘要，源 T） | 档位（源 S+K） | 珠（源 D+R） |
|---|---|---|---|---|
| 1 | 毒 / Poison | 对毒攻击的耐性 | +10 毒耐性／−10 毒加倍 | Antidote Jwl 1 +1・Jwl 2 +3 |
| 2 | 麻痹 / Paralysis | 麻痹攻击是否有效 | +10 麻痹无效／−10 麻痹加倍 | Paralysis Jwl 1 +1・Jwl 2 +3 |
| 3 | 睡眠 / Sleep | 睡眠攻击是否有效 | +10 睡眠无效／−10 睡眠加倍 | Pep Jwl 1 +1・Jwl 2 +3 |
| 4 | 昏厥 / Stun | 进入昏厥的条件 | +15 昏厥无效／+10 昏厥概率减半／−10 昏厥加倍 | Steadfast Jwl 1 +1・Standfast Jwl 1 +2 |
| 5 | 听觉保护 / Hearing | 咆哮无效 | +15 高级耳塞／+10 耳塞 | Earplug Jwl 1 +1・Jwl 3 +4 |
| 6 | 风压 / Wind Res | 风压无效 | +15 风压【大】无效／+10 风压【小】无效 | Wind Res Jwl 1 +1・Jwl 2 +3 |
| 7 | 耐震 / Tremor Res | 震动摇晃无效 | +10 耐震 | Footing Jwl 1 +1・Tectonic Jwl 1 +2 |
| 8 | 雪人 / Bind Res | 雪人／泡沫造成的无法行动无效 | +10 雪人状态无效 | Bind Jwl 1 +1・Shackle Jwl 1 +2 |
| 9 | 耐暑 / Heat Res | 炎热地区体力减少、熔岩地形伤害 | +10 炎热无效／−10 炎热加倍 | Heat Res Jwl 1 +2 |
| 10 | 耐寒 / Cold Res | 寒冷地区耐力槽上限减少速度 | +10 寒冷无效／−10 寒冷加倍 | Cold Res Jwl 1 +2 |
| 11 | 适应寒冷 / Polar Hunter | 适应寒冷环境、强化自身 | +10 北风猎手 | Polar Jwl 1 +1・Jwl 3 +4 |
| 12 | 适应炎热 / Tropic Hunter | 适应炎热环境、强化自身 | +10 南风猎手 | Solar Jwl 1 +1・Jwl 3 +4 |
| 13 | 偷窃无效 / Anti-Theft | 道具不会被偷 | +10 偷窃无效 | Safe Jwl 1 +2 |
| 14 | 对防御DOWN / Iron Skin | 防御力DOWN无效 | +10 铁面 | Def Lock Jwl 1 +2 |
| 15 | 狂击耐性 / Antivirus | 对抗狂龙病毒更有利 | +10 无我之境 | Sane Jwl 1 +1・Jwl 3 +5 |
| 16 | 细菌学 / Biology | 异臭球等道具效果；部分异常减轻或无效 | +15 生化博士／+10 细菌研究员 | Biology Jwl 1 +1・Microbio Jwl 1 +2 |
| 17 | 裂伤 / Bleeding | 裂伤状态 | +10 裂伤无效／−10 裂伤加倍 | Staunch Jwl 1 +2 |
| 18 | 攻击 / Attack | 攻击力增减 | +10 攻击力UP【小】／+15【中】／+20【大】／−10 DOWN【小】／−15【中】／−20【大】 | Attack Jwl 1 +1・Jwl 2 +3・Jwl 3 +5 |
| 19 | 防御 / Defense | 防御力增减 | +10 防御力UP【小】／+15【中】／+20【大】／−10 DOWN【小】／−15【中】／−20【大】 | Defense Jwl 1 +1・Jwl 2 +3 |
| 20 | 体力 / Health | 体力槽上限增减 | +10 体力+20／+15 体力+50／−10 体力−10／−15 体力−30 | Vitality Jwl 1 +2 |
| 21 | 火耐性 / Fire Res | 火耐性增减 | +10 火耐性【小】／+15【大】／−10 火耐性弱化 | Fire Res Jwl 1 +1・Nul-Fire Jwl 1 +2 |
| 22 | 水耐性 / Water Res | 水耐性增减 | +10 水耐性【小】／+15【大】／−10 弱化 | Water Res Jwl 1 +1・Nul-Water Jwl 1 +2 |
| 23 | 雷耐性 / Thunder Res | 雷耐性增减 | +10 雷耐性【小】／+15【大】／−10 弱化 | ThunderRes Jwl 1 +1・Nul-Thundr Jwl 1 +2 |
| 24 | 冰耐性 / Ice Res | 冰耐性增减 | +10 冰耐性【小】／+15【大】／−10 弱化 | Ice Res Jwl 1 +1・Nul-Ice Jwl 1 +2 |
| 25 | 龙耐性 / Dragon Res | 龙耐性增减 | +10 龙耐性【小】／+15【大】／−10 弱化 | Dragon Res Jwl 1 +1・Nul-Dragon Jwl 1 +2 |
| 26 | 属性耐性 / Blightproof | 所有属性异常无效 | +10 属性异常无效 | Resistor Jwl 1 +1・Jwl 3 +4 |
| 27 | 火属性攻击 / Fire Atk | 火属性攻击与火炎弹威力 | +10 火属性攻击强化+1／+15 +2／−10 弱化 | Blaze Jwl 1 +1・Jwl 2 +3 |
| 28 | 水属性攻击 / Water Atk | 水属性攻击与水冷弹威力 | +10 水属性攻击强化+1／+15 +2／−10 弱化 | Stream Jwl 1 +1・Jwl 2 +3 |
| 29 | 雷属性攻击 / Thunder Atk | 雷属性攻击与电击弹威力 | +10 雷属性攻击强化+1／+15 +2／−10 弱化 | Bolt Jwl 1 +1・Jwl 2 +3 |
| 30 | 冰属性攻击 / Ice Atk | 冰属性攻击与冰结弹威力 | +10 冰属性攻击强化+1／+15 +2／−10 弱化 | Frost Jwl 1 +1・Jwl 2 +3 |
| 31 | 龙属性攻击 / Dragon Atk | 龙属性攻击与灭龙弹威力 | +10 龙属性攻击强化+1／+15 +2／−10 弱化 | Dragon Jwl 1 +1・Jwl 2 +3 |
| 32 | 属性攻击 / Element Atk | 属性攻击强度 | +10 属性攻击强化／−10 属性攻击弱化 | Element Jwl 1 +1・Jwl 3 +4 |
| 33 | 特殊攻击 / Status Atk | 状态异常攻击强度 | +10 状态异常攻击+1／+15 +2／−10 弱化 | Disabler Jwl 1 +1・Jwl 2 +3 |
| 34 | 磨刀匠 / Speed Sharpening | 打磨速度 | +10 急速磨刀／−10 缓慢磨刀 | Grinder Jwl 1 +2 |
| 35 | 匠 / Sharpness | 提升武器锋利度 | +10 锋利度等级+1／+15 锋利度等级+2 | Handicraft Jwl 1 +1・Jwl 3 +4 |
| 36 | 锋利度 / Razor Sharp | 攻击时消耗的锋利度 | +10 利刃／−10 钝刃 | Razor Jwl 1 +1・Jwl 3 +4 |
| 37 | 剑术 / Mind's Eye | 攻击是否被弹开 | +10 心眼／−10 生疏 | Fencer Jwl 1 +1・Jwl 3 +4 |
| 38 | 打磨术 / Heavy Polish | 打磨后一段时间更坚韧 | +10 刚刃打磨 | Sharp Jwl 1 +1・Jwl 3 +4 |
| 39 | 钝器 / Bludgeoner | 锋利度越低攻击力越高 | +10 钝器手 | Blunt Jwl 1 +1・Jwl 2 +3 |
| 40 | 拔刀会心 / Critical Draw | 拔刀攻击的会心率 | +10 拔刀术【技】 | Draw Jwl 1 +1・Jwl 2 +3 |
| 41 | 拔刀减气 / Punishing Draw | 切断武器拔刀攻击追加昏厥 | +10 拔刀术【力】 | Gambit Jwl 1 +1・Jwl 3 +4 |
| 42 | 收刀 / Quick Sheath | 收刀速度 | +10 收刀术 | Sheath Jwl 1 +1・Jwl 2 +3 |
| 43 | 收刀打磨 / Challenge Sheath | 怪物愤怒时收刀有概率打磨 | +10 挑战者的收刀 | Razor Sheath Jwl 1 +2 |
| 44 | 刃鳞 / Bladescale | 闪避发动特殊效果 | +10 刃鳞打磨 | Bladescale Jwl 1 +1・Jwl 3 +4 |
| 45 | 装填速度 / Reload Spd | 弹药装填速度 | +10 装填速度+1／+15 +2／+20 +3／−10 −1／−15 −2／−20 −3 | Quickload Jwl 1 +1・Jwl 2 +3 |
| 46 | 后坐力 / Recoil | 射击后坐力 | +10 后坐力减轻+1／+15 +2／+20 +3／−10 −1／−15 −2／−20 −3 | Absorber Jwl 1 +1・Jwl 3 +4 |
| 47 | 精确射击 / Steadiness | 射击时的偏移 | +10 抑制偏移+1／+15 +2／−10 −1／−15 −2 | Sniper Jwl 1 +2 |
| 48 | 通常弹强化 / Normal Up | 通常弹・连射箭威力 | +10 通常弹･连射箭UP | Forceshot Jwl 1 +1・Jwl 3 +4 |
| 49 | 贯穿弹强化 / Pierce Up | 贯穿弹・贯穿箭威力 | +10 贯穿弹･贯穿箭UP | Pierce Jwl 1 +1・Jwl 3 +4 |
| 50 | 散弹强化 / Pellet Up | 散弹・扩散箭威力 | +10 散弹･扩散箭UP | Pellet Jwl 1 +1・Jwl 3 +4 |
| 51 | 重击弹强化 / Heavy Up | 重击弹・重射箭威力 | +10 重击弹･重射箭UP | Heavyshot Jwl 1 +1・Jwl 3 +4 |
| 52 | 通常弹追加 / Use Any Normal S | 可装填通常弹 | +10 通常弹全LV追加 | ShotPlus Jwl 1 +1・Jwl 2 +3 |
| 53 | 贯穿弹追加 / Use Any Pierce S | 可装填贯穿弹 | +10 贯穿弹LV1追加／+15 贯穿弹全LV追加 | PiercePlus Jwl 1 +2 |
| 54 | 散弹追加 / Use Any Pellet S | 可装填散弹 | +10 散弹LV1追加／+15 散弹全LV追加 | PelletPlus Jwl 1 +2 |
| 55 | 榴弹追加 / Use Any Crag S | 可装填穿甲榴弹 | +10 穿甲榴弹LV1追加／+15 全LV追加 | CragPlus Jwl 1 +2 |
| 56 | 扩散弹追加 / Use Any Clust S | 可装填扩散弹 | +10 扩散弹LV1追加／+15 全LV追加 | ClustPlus Jwl 1 +1・Jwl 3 +4 |
| 57 | 毒瓶追加 / Use Poison Coat | 可用毒瓶 | +10 毒瓶追加 | Poisoncoat Jwl 1 +2 |
| 58 | 麻痹瓶追加 / Use Para Coat | 可用麻痹瓶 | +10 麻痹瓶追加 | Paracoat Jwl 1 +1・Jwl 2 +3 |
| 59 | 睡眠瓶追加 / Use Sleep Coat | 可用睡眠瓶 | +10 睡眠瓶追加 | Sleep Jwl 1 +2 |
| 60 | 强击瓶追加 / Power Phial | 可用强击瓶 | +10 强击瓶LV1追加／+15 全LV追加 | Powercoat Jwl 1 +1・Jwl 2 +3 |
| 61 | 属强瓶追加 / Element Phial | 可用属性强化瓶 | +10 属强瓶LV1追加／+15 全LV追加 | Elemcoat Jwl 1 +1・Jwl 2 +3 |
| 62 | 近战瓶追加 / Use C.Range Coat | 可用近战瓶 | +10 近战瓶追加 | Rangecoat Jwl 1 +2 |
| 63 | 减气瓶追加 / Use Exhaust Coat | 可用减气瓶 | +10 减气瓶追加 | Draincoat Jwl 1 +2 |
| 64 | 爆破瓶追加 / Use Blast Coat | 可用爆破瓶 | +10 爆破瓶追加 | Blastcoat Jwl 1 +2 |
| 65 | 速射 / Bonus Shot | 轻弩速射的连发数 | +10 连发数+1 | Salvo Jwl 1 +1・Jwl 3 +4 |
| 66 | 射法 / Shot Booster | 部分弹药/箭在更远处打出最高伤害 | +10 弹道强化 | Precise Jwl 1 +1・Jwl 2 +3 |
| 67 | 装填数 / Load Up | 弩/铳枪装填数、弓蓄力阶段、盾斧装填量 | +10 装填数UP | Capacity Jwl 1 +1・Jwl 3 +4 |
| 68 | 不规则射击 / TrueShot Up | 内藏弹、刚射、曲射威力 | +10 特定射击强化 | Irregular Jwl 1 +2 |
| 69 | 弹药节约 / Ammo Saver | 射击时概率不消耗弹药或瓶 | +10 弹药节约 | Thrift Jwl 1 +1・Jwl 2 +3 |
| 70 | 达人 / Expert | 会心率 | +10 洞察+1／+15 +2／+20 +3／−10 −1／−15 −2／−20 −3 | Expert Jwl 1 +1・Jwl 2 +3・Jwl 3 +5 |
| 71 | 痛击 / Weakness Exploit | 命中有效部位时威力提升 | +10 弱点特效 | Tenderizer Jwl 1 +1・Jwl 3 +4 |
| 72 | 连击 / Repeat Offender | 连续命中时提高会心率 | +10 连击的心得 | Chain Jwl 1 +1・Jwl 3 +4 |
| 73 | 特殊会心 / Status Crit | 会心时的状态异常值 | +10 会心攻击【特殊】 | Crit Status Jwl 1 +1・Jwl 2 +3 |
| 74 | 属性会心 / Elemental Crit | 会心时的属性伤害 | +10 会心攻击【属性】 | CritElementJwl 1 +1・Jwl 2 +3 |
| 75 | 会心强化 / Critical Boost | 会心伤害 | +10 超会心 | Critical Jwl 1 +1・Jwl 3 +4 |
| 76 | 意外会心 / Bitter Affinity | 负会心有概率变强会心 | +10 残忍会心 | Negative Crit Jwl 1 +1・Jwl 3 +4 |
| 77 | 快速蓄力 / Focus | 能量槽积攒与蓄力速度 | +10 集中／−10 杂念 | Charger Jwl 1 +1・Jwl 3 +4 |
| 78 | 耐力 / Marathon Runner | 除闪避格挡外的耐力消耗 | +10 长跑健将／−10 步履缓慢 | Sprinter Jwl 1 +1・Jwl 3 +4 |
| 79 | 体术 / Constitution | 闪避与格挡的耐力消耗 | +10 体术+1／+15 +2／−10 −1／−15 −2 | Physique Jwl 1 +1・Jwl 2 +3 |
| 80 | 耐力回复 / Stam Recov | 耐力回复速度 | +10 耐力急速回复／−10 耐力回复迟缓 | Refresh Jwl 1 +1・Jwl 2 +3 |
| 81 | 长跑 / Endurance Runner | 持续跑动耐力不低于一定量 | +10 奔跑不息 | Distance Runner Jwl 1 +1・Jwl 2 +3 |
| 82 | 闪避性能 / Evasion | 闪避的无敌时间 | +10 闪避性能+1／+15 +2／−10 DOWN | Evasion Jwl 1 +1・Jwl 2 +3 |
| 83 | 闪避距离 / Evade Extender | 闪避移动距离 | +10 闪避距离UP | Jumping Jwl 1 +1・Jwl 3 +4 |
| 84 | 泡沫 / Bubbly Dance | 闪避后沾泡沫，泡沫中闪避更强 | +10 泡沫之舞 | Bubble Jwl 1 +1・Jwl 3 +4 |
| 85 | 格挡性能 / Guard | 格挡时的被击退 | +10 格挡性能+1／+15 +2／−10 −1 | Ironwall Jwl 1 +1・Jwl 2 +3 |
| 86 | 格挡强化 / Guard Up | 可格挡原本无法格挡的攻击 | +10 格挡强化 | Shield Jwl 1 +1・Jwl 2 +3 |
| 87 | KO / Knockout King | 怪物更易昏厥 | +10 KO术 | KO Jwl 1 +1・Jwl 2 +3 |
| 88 | 减气攻击 / Stamina Thief | 使怪物更易疲劳 | +10 夺取耐力 | Drain Jwl 1 +1・Jwl 2 +3 |
| 89 | 笛 / Horn Maestro | 笛类耐久、旋律效果与持续时间 | +10 吹笛名人 | Sonorous Jwl 1 +2 |
| 90 | 炮术 / Artillery | 弩炮/穿甲榴弹/榴弹瓶/炮击威力 | +10 炮术师／+15 炮术王 | Artillery Jwl 1 +2 |
| 91 | 重击 / Partbreaker | 破坏部位更有效 | +10 破坏王 | Destroyer Jwl 1 +1・Jwl 3 +4 |
| 92 | 爆弹强化 / Bombardier | 爆弹伤害、爆弹调和率 100%、爆破属性强度 | +10 爆破手 | Bombardier Jwl 1 +2 |
| 93 | 全力 / Latent Power | 满足条件后一段时间强化 | +10 力量解放+1／+15 +2 | Throttle Jwl 1 +1・Jwl 2 +3 |
| 94 | 斗魂 / Challenger | 怪物愤怒时攻击力与会心率提升 | +10 挑战者+1／+15 +2 | Spirit Jwl 1 +1・Jwl 2 +3 |
| 95 | 无伤 / Peak Performance | 体力全满时攻击力提升 | +10 最佳状态 | Flawless Jwl 1 +1・Jwl 2 +3 |
| 96 | 良机 / Trump Card | 取得优势时狩技效果更强 | +10 杀手锏 | Favor Jwl 1 +1・Jwl 3 +4 |
| 97 | 龙气 / Dragonheart | 龙属性异常时提升属性耐性与攻击力 | +10 龙气激活 | Dragon Spirit Jwl 1 +1・Jwl 3 +4 |
| 98 | 潜力 / Adrenaline | 体力低于一定比例时攻防增减 | +10 火场怪力+1／+15 +2／−10 畏手畏脚 | Potential Jwl 1 +1・Jwl 2 +3 |
| 99 | 逆境 / Fortify | 每次力尽后攻防提升 | +10 不屈 | Fortitude Jwl 1 +1・Jwl 2 +3 |
| 100 | 暴怒 / Resentment | 红色槽时攻击力提升 | +10 反怒 | Furor Jwl 1 +1・Jwl 2 +3 |
| 101 | 绝境 / Resuscitate | 异常状态时攻击力提升 | +10 死中求生 | Crisis Jwl 1 +1・Jwl 2 +3 |
| 102 | 毅力 / Guts | 强攻击时保留一丝体力 | +10 毅力 | Guts Jwl 1 +1・Jwl 2 +3 |
| 103 | 气息 / Sneak | 被视作目标的概率 | +10 隐蔽／−10 挑衅 | Ninja Jwl 1 +2 |
| 104 | 指挥 / Palico Rally | 随从能力提升 | +10 指挥随从 | Player Jwl 1 +1・Morale Jwl 1 +2 |
| 105 | 号令 / Palico Cheer | 向随从发令 | +10 号令随从 | Leader Jwl 1 +1・Jwl 2 +3 |
| 106 | 骑乘 / Mounting Master | 骑乘难度与骑乘成功难度 | +10 骑乘名人／−10 不善骑乘 | Rodeo Jwl 1 +2 |
| 107 | 跳跃 / Airborne | 跳跃攻击威力 | +10 飞燕 | Flight Jwl 1 +2 |
| 108 | 无念 / Composed | 狩技槽/英勇槽/炼金槽积攒更快 | +10 明镜止水 | Insight Jwl 1 +1・Jwl 3 +4 |
| 109 | 忍耐 / Chance Seizer | 受伤时也能积攒槽 | +10 虎视眈眈 | Endurance Jwl 1 +2 |
| 110 | SP持续 / Longer SP | SP 状态持续时间 | +10 SP时间延长 | Extender Jwl 1 +1・Jwl 2 +3 |
| 111 | 千里眼 / Autotracker | 地图上的怪物情报 | +10 探知／+15 自动标记 | Psychic Jwl 1 +2 |
| 112 | 观察眼 / Capture Guru | 出现可捕获提示 | +10 捕获精通 | Perception Jwl 1 +2 |
| 113 | 猎手 / Outdoorsman | 钓鱼烤肉更轻松、无需地图道具 | +10 猎人生活 | Ranger Jwl 1 +2 |
| 114 | 搬运 / Pro Transporter | 搬运速度、掉落不摔坏 | +10 搬运达人 | Transportr Jwl 1 +2 |
| 115 | 加护 / Divine Blessing | 概率增减所受伤害 | +10 精灵加护／−10 恶灵作祟 | Protection Jwl 1 +1・Asylum Jwl 1 +2 |
| 116 | 英雄之盾 / Hero's Talisman | 小额伤害无效 | +10 英雄守护 | Hero Jwl 1 +1・Jwl 3 +4 |
| 117 | 回复量 / Recovery Up | 回复道具的回复量 | +10 体力回复量UP／−10 DOWN | Medicine Jwl 1 +1・Jwl 2 +3 |
| 118 | 回复速度 / Recovery Spd | 红色槽回复速度 | +10 回复速度+1／+15 +2／−10 −1／−15 −2 | Recovery Jwl 1 +1・Jwl 2 +3 |
| 119 | 效果持续 / Item Use Up | 时效型道具的实际持续时间 | +10 道具使用强化／−10 弱化 | Enduring Jwl 1 +2 |
| 120 | 广域 / Wide-Range | 部分道具效果作用于同区域同伴 | +10 广域化+1／+15 +2 | Friendship Jwl 1 +1・Jwl 2 +3 |
| 121 | 饥饿 / Hunger | 耐力槽上限减少速度 | +10 饥饿减半／+15 饥饿无效／−10 加倍【小】／−15 加倍【大】 | Hungerless Jwl 1 +2 |
| 122 | 贪吃鬼 / Scavenger | 提升耐力上限道具的效果 | +10 吃饱喝足／+15 俯拾即食 | Metabolism Jwl 1 +2 |
| 123 | 吃饭 / Speed Eating | 食用肉与道具的速度 | +10 快吃+1／+15 +2／−10 细嚼慢咽 | Gobbler Jwl 1 +1・Jwl 3 +4 |
| 124 | 节食 / Rationer | 食饮类道具有概率再次使用 | +10 浅尝辄止 | Satiated Jwl 1 +2 |
| 125 | 肉食 / Meat Lover | 可吃生肉，肉类道具效果提升 | +10 嗜肉如命 | Meateater Jwl 1 +1・Meatlover Jwl 1 +2 |
| 126 | 食菇 / Mushromancer | 可吃蘑菇并获得效果 | +10 最爱蘑菇 | Fungiform Jwl 1 +2 |
| 127 | 野草知识 / Herbology | 食用野草时的效果 | +10 药草强化／+15 药草超强化 | Grass Jwl 1 +2 |
| 128 | 调和成功率 / Combination | 调和成功率 | +10 +20%／+15 +45%／−10 −10%／−15 −20% | Professor Jwl 1 +2 |
| 129 | 调和数 / Combination Pro | 调和生产数必为最大值 | +10 满额调和 | Factory Jwl 1 +2 |
| 130 | 高速设置 / Trap Master | 陷阱/爆弹设置速度、陷阱调和率 100% | +10 陷阱师 | Trapmaster Jwl 1 +2 |
| 131 | 采集 / Gathering | 采集・采掘次数 | +10 采集+1／+15 +2／−10 −1 | Gathering Jwl 1 +2 |
| 132 | 蜂蜜 / Honey Hunter | 采蜂蜜与皇家蜂蜜 | +10 蜂蜜猎人 | Honeybee Jwl 1 +1・Queenbee Jwl 1 +2 |
| 133 | 护石王 / Charm Chaser | 采掘时更容易找到护符 | +10 护符收集／+15 护符猎人 | Charmer Jwl 1 +1・Jwl 3 +4 |
| 134 | 反复无常 / Divine Whim | 十字镐/捕虫网/笛/回力标的损坏概率 | +10 精灵的反复无常／+15 神明的反复无常／−10 恶灵的／−15 恶魔的 | Blessing Jwl 1 +2 |
| 135 | 运气 / Fate | 任务报酬多少 | +10 幸运／+15 强运／+20 激运／−10 霉运／−15 灾难 | Fate Jwl 1 +1・Jwl 3 +4 |
| 136 | 剥取 / Carving | 剥取更方便 | +10 剥取铁人／+15 剥取名人 | Carver Jwl 1 +1・Jwl 3 +4 |
| 137 | 捕获 / Capture | 捕获报酬增加 | +10 捕获达人／+15 捕获名人 | Capture Jwl 1 +1・Jwl 3 +4 |

### 2.2 村庄之心与二名之魂（id 138–179，全部只有 10 点一档）

这些是**复合技能**：树本身只有一档 10 点，发动后同时给出下面列出的几条技能。组成取自游戏内发动技能说明（源 K），不是推算。

| id | 树（中文）/ English 发动技能名 | 10 点发动技能 | 组成（游戏内说明） | 珠 |
|---|---|---|---|---|
| 138 | 贝鲁纳 / Soul of Bherna | 贝鲁纳之心 | 火耐性【小】+ 饥饿减半 | Bell Jwl 1 +2 |
| 139 | 可可特 / Soul of Kokoto | 可可特之心 | 雷耐性【小】+ 精灵的反复无常 | Novice Jwl 1 +2 |
| 140 | 波凯 / Soul of Pokke | 波凯之心 | 冰耐性【小】+ 吃饱喝足 | Snowflake Jwl 1 +2 |
| 141 | 结云 / Soul of Yukumo | 结云之心 | 水耐性【小】+ 蜂蜜猎人 | Springs Jwl 1 +2 |
| 142 | 龙识船 / Soaratorium Soul | 龙识船之心 | 龙耐性【小】+ 细菌研究员 | Study Jwl 1 +2 |
| 143 | 飞行酒吧 / Flying Pub Soul | 飞行酒吧之心 | KO术 + 吹笛名人 | Skyfeast Jwl 1 +2 |
| 144 | 红盔 / Redhelm Soul | 红盔之魂 | 反怒 + 集中 | — |
| 145 | 大雪主 / Snowbaron Soul | 大雪主之魂 | 闪避距离UP + 耐力急速回复 | — |
| 146 | 矛碎 / Stonefist Soul | 矛碎之魂 | 利刃 + 后坐力减轻+2 + 精灵加护 | — |
| 147 | 岩穿 / Drilltusk Soul | 岩穿之魂 | 火场怪力+2 + 俯拾即食 | — |
| 148 | 紫毒姬 / Dreadqueen Soul | 紫毒姬之魂 | 状态异常攻击+2 + 广域化+2 | — |
| 149 | 宝缠 / Crystalbeard Soul | 宝缠之魂 | 护符猎人 + 饥饿无效 | — |
| 150 | 白疾风 / Silverwind Soul | 白疾风之魂 | 闪避性能+2 + 洞察+3 | — |
| 151 | 独眼 / Deadeye Soul | 独眼之魂 | 昏厥无效 + 挑战者+2 | — |
| 152 | 黑炎王 / Dreadking Soul | 黑炎王之魂 | 风压【大】无效 + 攻击力UP【大】 | — |
| 153 | 金雷公 / Thunderlord Soul | 金雷公之魂 | 力量解放+2 + 体术+2 | — |
| 154 | 荒钩爪 / Grimclaw Soul | 荒钩爪之魂 | 快吃+2 + 高级耳塞 | — |
| 155 | 烬灭刃 / Hellblade Soul | 烬灭刃之魂 | 锋利度等级+2 + 弹道强化 + 急速磨刀 | — |
| 156 | 胧隐 / Nightcloak Soul | 胧隐之魂 | 高级耳塞 + 装填速度+3 + 人剑一体 | — |
| 157 | 铠裂 / Rustrazor Soul | 铠裂之魂 | 格挡性能+2 + 收刀术 | — |
| 158 | 天眼 / Soulseer Soul | 天眼之魂 | 洞察+3 + 挑战者+1 | — |
| 159 | 青电主 / Boltreaver Soul | 青电主之魂 | 超会心 + 连发数+1 + 锋利度等级+1 | — |
| 160 | 银峰 / Elderfrost Soul | 银峰之魂 | 长跑健将 + 钝器手 + 通常弹･连射箭UP | — |
| 161 | 鏖魔 / Bloodbath Soul | 鏖魔之魂 | 攻击力UP【大】 + 闪避性能+2 | — |
| 162 | 真･红盔 / Redhelm Soul X | 真･红盔之魂 | 反怒 + 集中 + 长跑健将 | — |
| 163 | 真･大雪主 / Snowbaron Soul X | 真･大雪主之魂 | 闪避距离UP + 骑乘名人 + 耐力急速回复 | — |
| 164 | 真･矛碎 / Stonefist Soul X | 真･矛碎之魂 | 利刃 + 后坐力减轻+2 + 精灵加护 + 体术+1 | — |
| 165 | 真･岩穿 / Drilltusk Soul X | 真･岩穿之魂 | 火场怪力+2 + 俯拾即食 + 炮术王 | — |
| 166 | 真･紫毒姬 / D.queen Soul X | 真･紫毒姬之魂 | 状态异常攻击+2 + 广域化+2 + 药草超强化 | — |
| 167 | 真･宝缠 / C.beard Soul X | 真･宝缠之魂 | 护符猎人 + 英雄守护 + 饥饿无效 | — |
| 168 | 真･白疾风 / Silverwind Soul X | 真･白疾风之魂 | 闪避性能+2 + 洞察+3 + 隐蔽 | — |
| 169 | 真･独眼 / Deadeye Soul X | 真･独眼之魂 | 昏厥无效 + 挑战者+2 + 不屈 | — |
| 170 | 真･黑炎王 / Dreadking Soul X | 真･黑炎王之魂 | 风压【大】无效 + 攻击力UP【大】 + 火场怪力+1 | — |
| 171 | 真･金雷公 / Thunderlord Soul X | 真･金雷公之魂 | 力量解放+2 + 体术+2 + 集中 | — |
| 172 | 真･荒钩爪 / Grimclaw Soul X | 真･荒钩爪之魂 | 快吃+2 + 高级耳塞 + SP时间延长 | — |
| 173 | 真･烬灭刃 / Hellblade Soul X | 真･烬灭刃之魂 | 锋利度等级+2 + 爆破手 + 弹道强化 + 急速磨刀 | — |
| 174 | 真･胧隐 / Nightcloak Soul X | 真･胧隐之魂 | 高级耳塞 + 装填速度+3 + 人剑一体 + 陷阱师 | — |
| 175 | 真･铠裂 / Rustrazor Soul X | 真･铠裂之魂 | 格挡性能+2 + 收刀术 + 刃鳞打磨 | — |
| 176 | 真･天眼 / Soulseer Soul X | 真･天眼之魂 | 洞察+3 + 挑战者+2 | — |
| 177 | 真･青电主 / Boltreaver Soul X | 真･青电主之魂 | 超会心 + 连发数+1 + 锋利度等级+1 + 虎视眈眈 | — |
| 178 | 真･银峰 / Elderfrost Soul X | 真･银峰之魂 | 长跑健将 + 钝器手 + 通常弹･连射箭UP + 攻击力UP【中】 | — |
| 179 | 真･鏖魔 / Bloodbath Soul X | 真･鏖魔之魂 | 攻击力UP【大】 + 闪避性能+2 + 明镜止水 | — |

### 2.3 复合技能与系统技能（id 180–205）

| id | 树（中文）/ English 发动技能名 | 10 点发动技能 | 组成 / 说明（源 K / T） | 珠 |
|---|---|---|---|---|
| 180 | 北辰纳豆流 / Pro Dirty Fencer | 黏糊糊剑法 | 不屈 + 长跑健将 + 夺取耐力 | — |
| 181 | 斩术 / Steady Hand | 人剑一体 | 心眼 + 利刃 | — |
| 182 | 食欲 / Alloy Stomach | 美食家 | 快吃+2 + 嗜肉如命 + 最爱蘑菇 | — |
| 183 | 工人 / Explosive Trapper | 陷阱大师 | 爆破手 + 陷阱师 | — |
| 184 | 铁臂 / Crushing Blow | 痛打 | 夺取耐力 + KO术 | — |
| 185 | 祈愿 / Benediction | 祝福 | 体力回复量UP + 精灵加护 | — |
| 186 | 掩人耳目 / Clandestine | 暗中活跃 | 装填数UP + 调和成功率+20% + 隐蔽 | — |
| 187 | 刀匠 / Honed Blade | 真锻 | 锋利度等级+1 + 攻击力UP【大】 | — |
| 188 | 射手 / Silver Bullet | 刚弹 | 通常弹･连射箭UP + 贯穿弹･贯穿箭UP + 散弹･扩散箭UP | — |
| 189 | 状态耐性 / Wellness | 无畏 | 毒耐性 + 麻痹无效 + 睡眠无效 + 昏厥无效 | — |
| 190 | 怒 / Wrath Awoken | 逆鳞 | 火场怪力+2 + 毅力 | — |
| 191 | 闪避术 / Acrobat | 杂技师 | 体术+1 + 闪避性能+1 | — |
| 192 | 居合斩 / Sheath Control | 居合术【力】 | 拔刀术【力】 + 收刀术 | — |
| 193 | 顽强 / Iron Wall | 铁壁 | 防御力UP【中】 + 铁面 | — |
| 194 | 刚击 / Ruthlessness | 无情 | 洞察+2 + 弱点特效 | — |
| 195 | 据盾 / Shield Bearer | 持盾手 | 格挡强化 + 耐力急速回复 | — |
| 196 | 洁癖 / Fleet Feet | 舞斗家 | 最佳状态 + 闪避距离UP | — |
| 197 | 增幅 / Elementality | 属性兼道具强化 | 属性攻击强化 + 道具使用强化 | — |
| 198 | 护石收集 / Pack Rat | 护符发烧友 | 护符猎人 + 采集+1 | — |
| 199 | 贪婪 / Bounty Hunter | 丰收 | 强运 + 捕获达人 | — |
| 200 | 抵御钢龙 / Hazefur Talisman | 霞皮守护 | 北风猎手 + 风压【大】无效 + 雪人状态无效 | — |
| 201 | 抵御霞龙 / Pyroscale Talisman | 炎鳞守护 | 毒耐性 + 偷窃无效 + 自动标记 | — |
| 202 | 抵御炎龙 / Steelshell Talisman | 钢壳守护 | 南风猎手 + 火耐性【大】 + 细菌研究员 | — |
| 203 | 身体系统加倍 / —（树名 Torso Up，见 §2.0） | （无发动技能，`K` 的说明只有占位符 `@`） | 树说明：使身体防具的技能系统点数加倍。无点数档，触发方式 [U] | — |
| 204 | 秘术 / Skill +2 | 技能点数+2 | 装备提供的技能点数合计值+2 | — |
| 205 | 护石强化 / Double Talisman | 护石系统加倍 | 身上装备着的护石所提供的技能点数加倍 | — |

> 三棵系统技能的串下标（`skillData_chS.gmd`）：树 203 = `#650` 名 / `#651` 说明（内容就是占位符 `@`）、树 204 = `#652`/`#653`、树 205 = `#654`/`#655`；这三棵树**自己的名字**在 `skillTypeData_chS.gmd` 的 **#406**（身体系统加倍）、**#408**（秘术）、**#410**（护石强化），紧随其后的 `#407`/`#409`/`#411` 是对应**说明**（不是名字）。
> 200–202 三棵「抵御古龙」树的英文**树名**是 `Anti-Kushala`／`Anti-Chameleos`／`Anti-Teostra`，与中文树名「抵御钢龙／抵御霞龙／抵御炎龙」一一对应（源 N）；但它们的**发动技能名**是 `Hazefur Talisman`／`Pyroscale Talisman`／`Steelshell Talisman`（中文 霞皮守护／炎鳞守护／钢壳守护）——技能名里的材质（霞皮=霞龙、炎鳞=炎王龙、钢壳=钢龙）与树名所指的古龙是**错位**的。官方怪物名见 `chS/arc/resident_chS.arc :: monsterName` 的 #23 钢龙 / #24 霞龙 / #25 炎王龙（注意树表用的是「抵御炎龙」，官方怪物名是「炎王龙」）。四张表（T/N/K/S）在同 id 上完全闭合，所以错位属于游戏数据自身的命名，不是本页拼错；该语义配对仍记 [U]。
> 复合技能（138–202）在 `S` 里都是**单一 10 点档**，没有 15/20 档，也没有负档；`真･` 版本与同名二名**是两棵不同的树**，不会互相覆盖。

---

## 3. 数值抽查：游戏文本里写死的数字

这些树的游戏内说明直接给了数字，等于可以拿「文本 = 数值表」互证。以下全部按 `K` 的串对读出（偏移见 §0）。

| 树 | 档位 → 数值（游戏原文） | 来源 |
|---|---|---|
| 70 达人 | +20 会心率 **+30%**；+15 **+20%**；+10 **+10%**；−10 **−5%**；−15 **−10%**；−20 **−15%** | K，`_id` 140–145 |
| 20 体力 | +15 体力槽上限 **+50**；+10 **+20**；−10 **−10**；−15 **−30** | K，`_id` 41–44 |
| 21–25 五耐性 | +15 **+20**；+10 **+15**；−10 **−20**（五棵树同一组数字） | K，`_id` 45–59 |
| 128 调和成功率 | +15 **+45%**；+10 **+20%**；−10 **−10%**；−15 **−20%** | K，`_id` 235–238 |
| 30 冰属性攻击 | +15「冰属性武器和冰结弹类的威力**大幅**提升」；+10「提升」；−10「降低」（只给定性词，没给百分比） | K，`_id` 70–72 |

**这批数字怎么用**：达人 +10 = 会心 +10% 是玩家最常用的换算；体力 +15 档的 +50 与 −15 档的 −30 不对称，说明「越大越好」不成立——负档扣得比正档加得多。

**反例（必须标 [U]）**：攻击（18）、防御（19）、属性攻击（27–33）、装填速度（45）、后坐力（46）这些树的说明只有「提升／大幅提升／降低」，**没有数字**。它们的真实倍率/点数不在文本表里，需要从 main 的攻击力计算函数或实机测量得到，本页不给数字。

---

## 4. 装饰珠规格（242 条全表统计）

| 孔数 | 条数 | 该树点数取值（jq 现算，逐档计数） |
|---|---|---|
| 1 孔 | 156 | +1（97 条）或 +2（59 条） |
| 2 孔 | 46 | +3（全部 46 条） |
| 3 孔 | 40 | +4（37 条）或 +5（3 条） |
| 合计 | 242 | 单条最高 +5、最低 −2（负向只出现 −1 / −2） |

- **珠名末位就是孔数**：`Attack Jwl 3` 是 3 孔，`Jwl 1` 是 1 孔。242 条逐条核对，**无例外**（jq 条件：`name` 末位数字 ≠ `num_slots` 的条数为 0）。〔源 D〕
- **+5 只有 3 颗**：`Attack Jwl 3`（树 18）、`Expert Jwl 3`（树 70）、`Sane Jwl 3`（树 15）。romfs `decoData.deco` 里 +5 的记录也恰好 3 条，两源一致。〔源 D + R，R 中点数按 s8 读〕
- **单效果 vs 双效果**：242 条里 **60 条只有 1 个效果**（纯收益），**182 条带 2 个效果**；而这 182 条的第二效果**全都是负向**且指向**另一棵树**：`-1` 共 146 处、`-2` 共 36 处（146+36 = 182，正好一一对应）。例：`Attack Jwl 3` = 攻击 +5 **防御 −1**；`Handicraft Jwl 3` = 匠 +4 **锋利度 −2**。〔源 D，jq 统计〕
- **珠子只覆盖树 1–143**：二名之魂（144–179）与复合技能（180–205）**没有珠**，只能靠防具与护石凑点数。〔源 D〕
- **中文名已找到**：242 颗珠在 `chS/table/itemData_chS.gmd` 里都有官方中文名，从 item 索引 **#2638** 起连续排布（块内夹有 `dummy` 空位，跳过不计），顺序与 `decorations.json` 完全一致。全量中英对照见 **§7**。〔源 I = `itemData_chS.gmd.json`〕
- **两表内容完全一致 [C]**：`decoData.deco` 的 251 条 = **242 条内容记录 + 9 条空记录**；242 条内容的 `[孔数, 树id1, 点1, 树id2, 点2]` 与 `decorations.json` 是**同一多重集**（逐条比对无差异）。9 条空记录在记录号 **79、80、82、138、150、179、201、202、205**，内容形如 `01 00 00 00 00`（有 1 个孔位、无技能、无点数）。〔源 R + D，逐条比对〕

---

## 5. 待补（本页尚未坐实的东西）

| # | 缺口 | 需要的数据源 |
|---|---|---|
| 1 | 攻击/防御/属性攻击/装填速度/后坐力等树的具体数值倍率（文本只给定性词） | main 的攻击力与防御力计算函数（反汇编），或实机面板测量 |
| 2 | 树 203「身体系统加倍」的触发方式（无发动技能条目、无点数档） | 防具技能点写入逻辑 / 实机：胸部件带技能点时看总点数是否翻倍 |
| 3 | 秘术（204）的「合计+2」到底是「每棵树 +2」还是「总和 +2」 | 游戏内实测（装 1 棵树 9 点 + 秘术 看是否发动） |
| 4 | ~~装饰品中文名~~ **已解决**：242 颗在 `chS/table/itemData_chS.gmd` 有官方名（item 索引 #2638 起，块内夹 `dummy`），对照表见 §7 | 已用 `itemData_chS.gmd.json` 逐条取得 |
| 4b | ~~装饰品名映射的可靠性~~ **已互校**：242 条中文名自带的【N】与 `decorations.json` 的 `num_slots` 逐条比对 **242/242 全中**（任何一处错位都会让某个【3】落到 2 孔上），映射可信 | 已做 |
| 5 | ~~romfs `decoData.deco` 比 `decorations.json` 多的 9 条~~ **已结案 [C]**：251 = 242 条内容 + 9 条空记录，242 条内容与 `decorations.json` 为同一多重集。空记录位于记录号 **79、80、82、138、150、179、201、202、205**（`01 00 00 00 00` = 1 孔位 / 无技能 / 无点数），与 item 表同位置的 `dummy`（item 索引 = 2638 + 记录号 → #2717 #2718 #2720 #2776 #2788 #2817 #2839 #2840 #2843）一一对应 | 已逐条比对 + `read_bytes` 实测 |
| 6 | 护石能出哪些技能、单条上限（wiki 的 `a \| b` 两列语义未定） | romfs `amuletSkillData00–07.amskl`（7 个文件，格式未解） |
| 7 | 200–202 的**发动技能名**（霞皮守护/炎鳞守护/钢壳守护）与树名所指古龙语义错位（树名 `Anti-Kushala`/`Anti-Chameleos`/`Anti-Teostra` 已确认，四表同 id 闭合，属游戏自身命名） | 游戏内装备实际提供的技能，或日文/其它语言表对照 |
| 8 | `skillData.skd`（328 × 18 B = u32 id + 14×u8）那 14 个字节的含义 | 与 main 的 `rSkillData` 类（vtable `0x4ceb40`，见 `docs/data/class-inventory.tsv`）字段对照 |

---

## 6. 复核用到的判定依据一览

- **树 id ↔ 中文名**：`T` 的第 i 对串；条数闭合（412 = 2×206），末尾三对依次是「身体系统加倍／秘术／护石强化」＝树 203/204/205。〔T〕
- **树 id ↔ 阈值集合**：`S` 的 `group_by(.skill_tree_id)` 全量导出（204 组，与 §1.2 统计同源）。〔S〕
- **技能 id ↔ 中文名**：`K` 的第 i 对串；`S` 的 `_id` 与之间序（§1.4 抽样 5 段全中）。〔K + S〕
- **珠 ↔ 树与点数**：`D` 的 `skills` 对象（242 条）↔ `R` 的 251 条记录（242 内容 + 9 空占位），**同一多重集，逐条比对无差异 [C]**；§7 的 242 行另经脚本比对 `bad 0`。〔D + R〕
- **树的英文名**：`N` 的 `_id → name`（205 条），全量列在 §2.0；§2 第一列的英文是**发动技能名**（源 S），两者不是同一套词（树 11 树名 `ColdBlooded`／发动名 `Polar Hunter`）。〔N〕
- **中文名回验（官方提取物）**：`skillData_chS.gmd.json` 的 328 个名字（`strings[0], [2], …`）与 `skillTypeData_chS.gmd.json` 的 206 个名字逐条比对，与本页表体**仅 2 处不同**，均已改正：树 76 的档名「残忍会心」（原误作「残忍」）、树 113 的技能名「猎人生活」（原误作「猎人」）。同一提取物也证实了 §0 的结构判断：`strings[650]`=身体系统加倍、`[652]`=技能点数+2、`[654]`=护石系统加倍。〔K-json + T-json〕

---

## 7. 装饰珠中英对照（242 颗，含给哪棵树点数）

**取法**：`chS/table/itemData_chS.gmd` 里装饰品是一段连续条目，item 索引 **#2638–#2888**，共 251 个位置，其中 9 个是 `dummy` 空位（**#2717 #2718 #2720 #2776 #2788 #2817 #2839 #2840 #2843**）——跳过它们后的顺序与 `decorations.json`（242 条）逐条一致。所以第 k 颗珠的中文名 = 该区段内第 k 个非 dummy 条目。
**可靠性**：中文名自带的【N】就是孔数，242 条与 `decorations.json` 的 `num_slots` **242/242 全中**；**整表脚本比对**（解析本节 242 行 → 用 `skillTypeData` 反查树 id → 与 `decorations.json` 的 `name`/`skills` 逐行比）结果 `rows 242 / deco 242 / bad 0`。另直接读 romfs `decoData.deco` 原始记录抽了两段：记录 120–143（= 本表 #118–#140）与记录 240–250（= 本表 #232–#242），`[孔数, 树1, 点1, 树2, 点2]` 逐字节与本节一致。该表的 9 条**空记录**位于 **79、80、82、138、150、179、201、202、205**（`01 00 00 00 00`），与 item 表同位置的 `dummy`（item 索引 = 2638 + 记录号）一一对应——所以「第 k 颗珠 = 第 k 个非空记录」这条对应关系有两侧独立证据。
**点数**：「主树 +n ／ 副作用 −m」，负号表示该珠会**扣**另一棵树。没有副作用的一律写「—」。
**点数自校**：全表只有 1 孔 = +1/+2、2 孔 = +3、3 孔 = +4/+5，副作用只有 −1/−2，242 行无例外（与 §4 的 jq 分布一致）。

| # | 中文名 | English | 点数 |
|---|---|---|---|
| 1 | 耐毒珠【1】 | Antidote Jwl 1 | 毒 +1 ／ 昏厥 −1 |
| 2 | 耐毒珠【2】 | Antidote Jwl 2 | 毒 +3 ／ 昏厥 −1 |
| 3 | 耐麻珠【1】 | Paralysis Jwl 1 | 麻痹 +1 ／ 毒 −1 |
| 4 | 耐麻珠【2】 | Paralysis Jwl 2 | 麻痹 +3 ／ 毒 −1 |
| 5 | 耐眠珠【1】 | Pep Jwl 1 | 睡眠 +1 ／ 雪人 −1 |
| 6 | 耐眠珠【2】 | Pep Jwl 2 | 睡眠 +3 ／ 雪人 −1 |
| 7 | 耐绝珠【1】 | Steadfast Jwl 1 | 昏厥 +1 ／ 麻痹 −1 |
| 8 | 制绝珠【1】 | Standfast Jwl 1 | 昏厥 +2 ／ — |
| 9 | 防音珠【1】 | Earplug Jwl 1 | 听觉保护 +1 ／ 加护 −1 |
| 10 | 防音珠【3】 | Earplug Jwl 3 | 听觉保护 +4 ／ 加护 −2 |
| 11 | 防风珠【1】 | Wind Res Jwl 1 | 风压 +1 ／ 运气 −1 |
| 12 | 防风珠【2】 | Wind Res Jwl 2 | 风压 +3 ／ 运气 −1 |
| 13 | 耐震珠【1】 | Footing Jwl 1 | 耐震 +1 ／ 睡眠 −1 |
| 14 | 抗震珠【1】 | Tectonic Jwl 1 | 耐震 +2 ／ — |
| 15 | 耐达摩珠【1】 | Bind Jwl 1 | 雪人 +1 ／ 睡眠 −1 |
| 16 | 抗达摩珠【1】 | Shackle Jwl 1 | 雪人 +2 ／ — |
| 17 | 耐暑珠【1】 | Heat Res Jwl 1 | 耐暑 +2 ／ — |
| 18 | 耐寒珠【1】 | Cold Res Jwl 1 | 耐寒 +2 ／ — |
| 19 | 北风珠【1】 | Polar Jwl 1 | 适应寒冷 +1 ／ 耐暑 −1 |
| 20 | 北风珠【3】 | Polar Jwl 3 | 适应寒冷 +4 ／ 耐暑 −2 |
| 21 | 南风珠【1】 | Solar Jwl 1 | 适应炎热 +1 ／ 耐寒 −1 |
| 22 | 南风珠【3】 | Solar Jwl 3 | 适应炎热 +4 ／ 耐寒 −2 |
| 23 | 耐盗珠【1】 | Safe Jwl 1 | 偷窃无效 +2 ／ — |
| 24 | 耐防珠【1】 | Def Lock Jwl 1 | 对防御DOWN +2 ／ — |
| 25 | 抗狂珠【1】 | Sane Jwl 1 | 狂击耐性 +1 ／ 闪避性能 −1 |
| 26 | 抗狂珠【3】 | Sane Jwl 3 | 狂击耐性 **+5** ／ 闪避性能 −1 |
| 27 | 菌学珠【1】 | Biology Jwl 1 | 细菌学 +1 ／ 气息 −1 |
| 28 | 菌究珠【1】 | Microbio Jwl 1 | 细菌学 +2 ／ — |
| 29 | 抗伤珠【1】 | Staunch Jwl 1 | 裂伤 +2 ／ — |
| 30 | 攻击珠【1】 | Attack Jwl 1 | 攻击 +1 ／ 防御 −1 |
| 31 | 攻击珠【2】 | Attack Jwl 2 | 攻击 +3 ／ 防御 −1 |
| 32 | 攻击珠【3】 | Attack Jwl 3 | 攻击 **+5** ／ 防御 −1 |
| 33 | 防御珠【1】 | Defense Jwl 1 | 防御 +1 ／ 攻击 −1 |
| 34 | 防御珠【2】 | Defense Jwl 2 | 防御 +3 ／ 攻击 −1 |
| 35 | 体力珠【1】 | Vitality Jwl 1 | 体力 +2 ／ — |
| 36 | 耐火珠【1】 | Fire Res Jwl 1 | 火耐性 +1 ／ 水耐性 −1 |
| 37 | 制火珠【1】 | Nul-Fire Jwl 1 | 火耐性 +2 ／ — |
| 38 | 耐水珠【1】 | Water Res Jwl 1 | 水耐性 +1 ／ 雷耐性 −1 |
| 39 | 制水珠【1】 | Nul-Water Jwl 1 | 水耐性 +2 ／ — |
| 40 | 耐雷珠【1】 | ThunderRes Jwl 1 | 雷耐性 +1 ／ 冰耐性 −1 |
| 41 | 制雷珠【1】 | Nul-Thundr Jwl 1 | 雷耐性 +2 ／ — |
| 42 | 耐冰珠【1】 | Ice Res Jwl 1 | 冰耐性 +1 ／ 火耐性 −1 |
| 43 | 制冰珠【1】 | Nul-Ice Jwl 1 | 冰耐性 +2 ／ — |
| 44 | 耐龙珠【1】 | Dragon Res Jwl 1 | 龙耐性 +1 ／ 毒 −1 |
| 45 | 制龙珠【1】 | Nul-Dragon Jwl 1 | 龙耐性 +2 ／ — |
| 46 | 属耐珠【1】 | Resistor Jwl 1 | 属性耐性 +1 ／ 体力 −1 |
| 47 | 属耐珠【3】 | Resistor Jwl 3 | 属性耐性 +4 ／ 体力 −2 |
| 48 | 火炎珠【1】 | Blaze Jwl 1 | 火属性攻击 +1 ／ 水属性攻击 −1 |
| 49 | 火炎珠【2】 | Blaze Jwl 2 | 火属性攻击 +3 ／ 水属性攻击 −1 |
| 50 | 流水珠【1】 | Stream Jwl 1 | 水属性攻击 +1 ／ 雷属性攻击 −1 |
| 51 | 流水珠【2】 | Stream Jwl 2 | 水属性攻击 +3 ／ 雷属性攻击 −1 |
| 52 | 雷光珠【1】 | Bolt Jwl 1 | 雷属性攻击 +1 ／ 冰属性攻击 −1 |
| 53 | 雷光珠【2】 | Bolt Jwl 2 | 雷属性攻击 +3 ／ 冰属性攻击 −1 |
| 54 | 结冰珠【1】 | Frost Jwl 1 | 冰属性攻击 +1 ／ 火属性攻击 −1 |
| 55 | 结冰珠【2】 | Frost Jwl 2 | 冰属性攻击 +3 ／ 火属性攻击 −1 |
| 56 | 破龙珠【1】 | Dragon Jwl 1 | 龙属性攻击 +1 ／ 特殊攻击 −1 |
| 57 | 破龙珠【2】 | Dragon Jwl 2 | 龙属性攻击 +3 ／ 特殊攻击 −1 |
| 58 | 属攻珠【1】 | Element Jwl 1 | 属性攻击 +1 ／ 特殊攻击 −1 |
| 59 | 属攻珠【3】 | Element Jwl 3 | 属性攻击 +4 ／ 特殊攻击 −2 |
| 60 | 特攻珠【1】 | Disabler Jwl 1 | 特殊攻击 +1 ／ 属性攻击 −1 |
| 61 | 特攻珠【2】 | Disabler Jwl 2 | 特殊攻击 +3 ／ 属性攻击 −1 |
| 62 | 打磨珠【1】 | Grinder Jwl 1 | 磨刀匠 +2 ／ — |
| 63 | 匠珠【1】 | Handicraft Jwl 1 | 匠 +1 ／ 锋利度 −1 |
| 64 | 匠珠【3】 | Handicraft Jwl 3 | 匠 +4 ／ 锋利度 −2 |
| 65 | 斩铁珠【1】 | Razor Jwl 1 | 锋利度 +1 ／ 匠 −1 |
| 66 | 斩铁珠【3】 | Razor Jwl 3 | 锋利度 +4 ／ 匠 −2 |
| 67 | 剑豪珠【1】 | Fencer Jwl 1 | 剑术 +1 ／ 匠 −1 |
| 68 | 剑豪珠【3】 | Fencer Jwl 3 | 剑术 +4 ／ 匠 −2 |
| 69 | 刚刃珠【1】 | Sharp Jwl 1 | 打磨术 +1 ／ 磨刀匠 −1 |
| 70 | 刚刃珠【3】 | Sharp Jwl 3 | 打磨术 +4 ／ 磨刀匠 −2 |
| 71 | 钝器珠【1】 | Blunt Jwl 1 | 钝器 +1 ／ 攻击 −1 |
| 72 | 钝器珠【2】 | Blunt Jwl 2 | 钝器 +3 ／ 攻击 −2 |
| 73 | 拔刀珠【1】 | Draw Jwl 1 | 拔刀会心 +1 ／ 达人 −1 |
| 74 | 拔刀珠【2】 | Draw Jwl 2 | 拔刀会心 +3 ／ 达人 −1 |
| 75 | 拔打珠【1】 | Gambit Jwl 1 | 拔刀减气 +1 ／ 锋利度 −1 |
| 76 | 拔打珠【3】 | Gambit Jwl 3 | 拔刀减气 +4 ／ 锋利度 −2 |
| 77 | 速纳珠【1】 | Sheath Jwl 1 | 收刀 +1 ／ 磨刀匠 −1 |
| 78 | 速纳珠【2】 | Sheath Jwl 2 | 收刀 +3 ／ 磨刀匠 −1 |
| 79 | 收磨珠【1】 | Razor Sheath Jwl 1 | 收刀打磨 +2 ／ 收刀 −1 |
| 80 | 刃鳞珠【1】 | Bladescale Jwl 1 | 刃鳞 +1 ／ — |
| 81 | 刃鳞珠【3】 | Bladescale Jwl 3 | 刃鳞 +4 ／ — |
| 82 | 早填珠【1】 | Quickload Jwl 1 | 装填速度 +1 ／ 后坐力 −1 |
| 83 | 早填珠【2】 | Quickload Jwl 2 | 装填速度 +3 ／ 后坐力 −1 |
| 84 | 抑反珠【1】 | Absorber Jwl 1 | 后坐力 +1 ／ 装填速度 −1 |
| 85 | 抑反珠【3】 | Absorber Jwl 3 | 后坐力 +4 ／ 装填速度 −2 |
| 86 | 点射珠【1】 | Sniper Jwl 1 | 精确射击 +2 ／ — |
| 87 | 强弹珠【1】 | Forceshot Jwl 1 | 通常弹强化 +1 ／ 后坐力 −1 |
| 88 | 强弹珠【3】 | Forceshot Jwl 3 | 通常弹强化 +4 ／ 后坐力 −2 |
| 89 | 贯穿珠【1】 | Pierce Jwl 1 | 贯穿弹强化 +1 ／ 后坐力 −1 |
| 90 | 贯穿珠【3】 | Pierce Jwl 3 | 贯穿弹强化 +4 ／ 后坐力 −2 |
| 91 | 散弹珠【1】 | Pellet Jwl 1 | 散弹强化 +1 ／ 后坐力 −1 |
| 92 | 散弹珠【3】 | Pellet Jwl 3 | 散弹强化 +4 ／ 后坐力 −2 |
| 93 | 重弹珠【1】 | Heavyshot Jwl 1 | 重击弹强化 +1 ／ 后坐力 −1 |
| 94 | 重弹珠【3】 | Heavyshot Jwl 3 | 重击弹强化 +4 ／ 后坐力 −2 |
| 95 | 加弹珠【1】 | ShotPlus Jwl 1 | 通常弹追加 +1 ／ 装填速度 −1 |
| 96 | 加弹珠【2】 | ShotPlus Jwl 2 | 通常弹追加 +3 ／ 装填速度 −1 |
| 97 | 加贯珠【1】 | PiercePlus Jwl 1 | 贯穿弹追加 +2 ／ — |
| 98 | 加散珠【1】 | PelletPlus Jwl 1 | 散弹追加 +2 ／ — |
| 99 | 加榴珠【1】 | CragPlus Jwl 1 | 榴弹追加 +2 ／ — |
| 100 | 加扩珠【1】 | ClustPlus Jwl 1 | 扩散弹追加 +1 ／ 装填速度 −1 |
| 101 | 加扩珠【3】 | ClustPlus Jwl 3 | 扩散弹追加 +4 ／ 装填速度 −2 |
| 102 | 毒瓶珠【1】 | Poisoncoat Jwl 1 | 毒瓶追加 +2 ／ — |
| 103 | 痹瓶珠【1】 | Paracoat Jwl 1 | 麻痹瓶追加 +1 ／ 攻击 −1 |
| 104 | 痹瓶珠【2】 | Paracoat Jwl 2 | 麻痹瓶追加 +3 ／ 攻击 −1 |
| 105 | 眠瓶珠【1】 | Sleep Jwl 1 | 睡眠瓶追加 +2 ／ — |
| 106 | 强瓶珠【1】 | Powercoat Jwl 1 | 强击瓶追加 +1 ／ 达人 −1 |
| 107 | 强瓶珠【2】 | Powercoat Jwl 2 | 强击瓶追加 +3 ／ 达人 −1 |
| 108 | 属瓶珠【1】 | Elemcoat Jwl 1 | 属强瓶追加 +1 ／ 特殊攻击 −1 |
| 109 | 属瓶珠【2】 | Elemcoat Jwl 2 | 属强瓶追加 +3 ／ 特殊攻击 −1 |
| 110 | 接瓶珠【1】 | Rangecoat Jwl 1 | 近战瓶追加 +2 ／ — |
| 111 | 减瓶珠【1】 | Draincoat Jwl 1 | 减气瓶追加 +2 ／ — |
| 112 | 爆瓶珠【1】 | Blastcoat Jwl 1 | 爆破瓶追加 +2 ／ — |
| 113 | 速射珠【1】 | Salvo Jwl 1 | 速射 +1 ／ 装填速度 −1 |
| 114 | 速射珠【3】 | Salvo Jwl 3 | 速射 +4 ／ 装填速度 −2 |
| 115 | 射法珠【1】 | Precise Jwl 1 | 射法 +1 ／ 装填数 −1 |
| 116 | 射法珠【2】 | Precise Jwl 2 | 射法 +3 ／ 装填数 −1 |
| 117 | 装填珠【1】 | Capacity Jwl 1 | 装填数 +1 ／ 装填速度 −1 |
| 118 | 装填珠【3】 | Capacity Jwl 3 | 装填数 +4 ／ 装填速度 −2 |
| 119 | 变射珠【1】 | Irregular Jwl 1 | 不规则射击 +2 ／ — |
| 120 | 省弹珠【1】 | Thrift Jwl 1 | 弹药节约 +1 ／ 精确射击 −1 |
| 121 | 省弹珠【2】 | Thrift Jwl 2 | 弹药节约 +3 ／ 精确射击 −1 |
| 122 | 达人珠【1】 | Expert Jwl 1 | 达人 +1 ／ 龙耐性 −1 |
| 123 | 达人珠【2】 | Expert Jwl 2 | 达人 +3 ／ 龙耐性 −1 |
| 124 | 达人珠【3】 | Expert Jwl 3 | 达人 **+5** ／ 龙耐性 −1 |
| 125 | 痛击珠【1】 | Tenderizer Jwl 1 | 痛击 +1 ／ 体力 −1 |
| 126 | 痛击珠【3】 | Tenderizer Jwl 3 | 痛击 +4 ／ 体力 −2 |
| 127 | 连击珠【1】 | Chain Jwl 1 | 连击 +1 ／ 加护 −1 |
| 128 | 连击珠【3】 | Chain Jwl 3 | 连击 +4 ／ 加护 −2 |
| 129 | 特会珠【1】 | Crit Status Jwl 1 | 特殊会心 +1 ／ 攻击 −1 |
| 130 | 特会珠【2】 | Crit Status Jwl 2 | 特殊会心 +3 ／ 攻击 −1 |
| 131 | 属会珠【1】 | CritElementJwl 1 | 属性会心 +1 ／ 攻击 −1 |
| 132 | 属会珠【2】 | CritElementJwl 2 | 属性会心 +3 ／ 攻击 −1 |
| 133 | 会心珠【1】 | Critical Jwl 1 | 会心强化 +1 ／ 攻击 −1 |
| 134 | 会心珠【3】 | Critical Jwl 3 | 会心强化 +4 ／ 攻击 −2 |
| 135 | 意外会心珠【1】 | Negative Crit Jwl 1 | 意外会心 +1 ／ 攻击 −1 |
| 136 | 意外会心珠【3】 | Negative Crit Jwl 3 | 意外会心 +4 ／ 攻击 −2 |
| 137 | 缩短珠【1】 | Charger Jwl 1 | 快速蓄力 +1 ／ 体术 −1 |
| 138 | 缩短珠【3】 | Charger Jwl 3 | 快速蓄力 +4 ／ 体术 −2 |
| 139 | 狂奔珠【1】 | Sprinter Jwl 1 | 耐力 +1 ／ 饥饿 −1 |
| 140 | 狂奔珠【3】 | Sprinter Jwl 3 | 耐力 +4 ／ 饥饿 −2 |
| 141 | 体术珠【1】 | Physique Jwl 1 | 体术 +1 ／ 耐力 −1 |
| 142 | 体术珠【2】 | Physique Jwl 2 | 体术 +3 ／ 耐力 −1 |
| 143 | 早气珠【1】 | Refresh Jwl 1 | 耐力回复 +1 ／ 闪避性能 −1 |
| 144 | 早气珠【2】 | Refresh Jwl 2 | 耐力回复 +3 ／ 闪避性能 −1 |
| 145 | 长跑珠【1】 | Distance Runner Jwl 1 | 长跑 +1 ／ 体术 −1 |
| 146 | 长跑珠【2】 | Distance Runner Jwl 2 | 长跑 +3 ／ 体术 −1 |
| 147 | 闪避珠【1】 | Evasion Jwl 1 | 闪避性能 +1 ／ 体力 −1 |
| 148 | 闪避珠【2】 | Evasion Jwl 2 | 闪避性能 +3 ／ 体力 −1 |
| 149 | 跳跃珠【1】 | Jumping Jwl 1 | 闪避距离 +1 ／ 体力 −1 |
| 150 | 跳跃珠【3】 | Jumping Jwl 3 | 闪避距离 +4 ／ 体力 −2 |
| 151 | 泡沫珠【1】 | Bubble Jwl 1 | 泡沫 +1 ／ 耐力回复 −1 |
| 152 | 泡沫珠【3】 | Bubble Jwl 3 | 泡沫 +4 ／ 耐力回复 −2 |
| 153 | 铁壁珠【1】 | Ironwall Jwl 1 | 格挡性能 +1 ／ 体术 −1 |
| 154 | 铁壁珠【2】 | Ironwall Jwl 2 | 格挡性能 +3 ／ 体术 −1 |
| 155 | 强壁珠【1】 | Shield Jwl 1 | 格挡强化 +1 ／ 耐力 −1 |
| 156 | 强壁珠【2】 | Shield Jwl 2 | 格挡强化 +3 ／ 耐力 −1 |
| 157 | KO珠【1】 | KO Jwl 1 | KO +1 ／ 快速蓄力 −1 |
| 158 | KO珠【2】 | KO Jwl 2 | KO +3 ／ 快速蓄力 −1 |
| 159 | 夺气珠【1】 | Drain Jwl 1 | 减气攻击 +1 ／ 耐力 −1 |
| 160 | 夺气珠【2】 | Drain Jwl 2 | 减气攻击 +3 ／ 耐力 −1 |
| 161 | 鼓笛珠【1】 | Sonorous Jwl 1 | 笛 +2 ／ — |
| 162 | 炮术珠【1】 | Artillery Jwl 1 | 炮术 +2 ／ — |
| 163 | 重击珠【1】 | Destroyer Jwl 1 | 重击 +1 ／ 达人 −1 |
| 164 | 重击珠【3】 | Destroyer Jwl 3 | 重击 +4 ／ 达人 −2 |
| 165 | 爆师珠【1】 | Bombardier Jwl 1 | 爆弹强化 +2 ／ — |
| 166 | 全开珠【1】 | Throttle Jwl 1 | 全力 +1 ／ 气息 −1 |
| 167 | 全开珠【2】 | Throttle Jwl 2 | 全力 +3 ／ 气息 −1 |
| 168 | 斗魂珠【1】 | Spirit Jwl 1 | 斗魂 +1 ／ 格挡性能 −1 |
| 169 | 斗魂珠【2】 | Spirit Jwl 2 | 斗魂 +3 ／ 格挡性能 −1 |
| 170 | 无伤珠【1】 | Flawless Jwl 1 | 无伤 +1 ／ 回复速度 −1 |
| 171 | 无伤珠【2】 | Flawless Jwl 2 | 无伤 +3 ／ 回复速度 −1 |
| 172 | 好机珠【1】 | Favor Jwl 1 | 良机 +1 ／ 效果持续 −1 |
| 173 | 良机珠【3】 | Favor Jwl 3 | 良机 +4 ／ 效果持续 −2 |
| 174 | 龙气珠【1】 | Dragon Spirit Jwl 1 | 龙气 +1 ／ 防御 −1 |
| 175 | 龙气珠【3】 | Dragon Spirit Jwl 3 | 龙气 +4 ／ 防御 −2 |
| 176 | 潜力珠【1】 | Potential Jwl 1 | 潜力 +1 ／ 加护 −1 |
| 177 | 潜力珠【2】 | Potential Jwl 2 | 潜力 +3 ／ 加护 −1 |
| 178 | 逆境珠【1】 | Fortitude Jwl 1 | 逆境 +1 ／ 回复量 −1 |
| 179 | 逆境珠【2】 | Fortitude Jwl 2 | 逆境 +3 ／ 回复量 −1 |
| 180 | 暴怒珠【1】 | Furor Jwl 1 | 暴怒 +1 ／ 体术 −1 |
| 181 | 暴怒珠【2】 | Furor Jwl 2 | 暴怒 +3 ／ 体术 −1 |
| 182 | 绝境珠【1】 | Crisis Jwl 1 | 绝境 +1 ／ 毒 −1 |
| 183 | 绝境珠【2】 | Crisis Jwl 2 | 绝境 +3 ／ 毒 −1 |
| 184 | 毅力珠【1】 | Guts Jwl 1 | 毅力 +1 ／ 调和成功率 −1 |
| 185 | 毅力珠【2】 | Guts Jwl 2 | 毅力 +3 ／ 调和成功率 −1 |
| 186 | 蹑脚珠【1】 | Ninja Jwl 1 | 气息 +2 ／ — |
| 187 | 指挥珠【1】 | Player Jwl 1 | 指挥 +1 ／ 效果持续 −1 |
| 188 | 名指挥珠【1】 | Morale Jwl 1 | 指挥 +2 ／ — |
| 189 | 号令珠【1】 | Leader Jwl 1 | 号令 +1 ／ 采集 −1 |
| 190 | 号令珠【2】 | Leader Jwl 2 | 号令 +3 ／ 采集 −1 |
| 191 | 骑惯珠【1】 | Rodeo Jwl 1 | 骑乘 +2 ／ — |
| 192 | 飞燕珠【1】 | Flight Jwl 1 | 跳跃 +2 ／ — |
| 193 | 无念珠【1】 | Insight Jwl 1 | 无念 +1 ／ 气息 −1 |
| 194 | 无念珠【3】 | Insight Jwl 3 | 无念 +4 ／ 气息 −2 |
| 195 | 忍耐珠【1】 | Endurance Jwl 1 | 忍耐 +2 ／ 无念 −1 |
| 196 | 技延珠【1】 | Extender Jwl 1 | SP持续 +1 ／ 无念 −1 |
| 197 | 技延珠【2】 | Extender Jwl 2 | SP持续 +3 ／ 无念 −1 |
| 198 | 千里珠【1】 | Psychic Jwl 1 | 千里眼 +2 ／ — |
| 199 | 观察珠【1】 | Perception Jwl 1 | 观察眼 +2 ／ — |
| 200 | 猎手珠【1】 | Ranger Jwl 1 | 猎手 +2 ／ — |
| 201 | 搬运珠【1】 | Transportr Jwl 1 | 搬运 +2 ／ — |
| 202 | 加护珠【1】 | Protection Jwl 1 | 加护 +1 ／ — |
| 203 | 神护珠【1】 | Asylum Jwl 1 | 加护 +2 ／ — |
| 204 | 英雄珠【1】 | Hero Jwl 1 | 英雄之盾 +1 ／ 运气 −1 |
| 205 | 英雄珠【3】 | Hero Jwl 3 | 英雄之盾 +4 ／ 运气 −2 |
| 206 | 治愈珠【1】 | Medicine Jwl 1 | 回复量 +1 ／ 回复速度 −1 |
| 207 | 治愈珠【2】 | Medicine Jwl 2 | 回复量 +3 ／ 回复速度 −1 |
| 208 | 早复珠【1】 | Recovery Jwl 1 | 回复速度 +1 ／ 吃饭 −1 |
| 209 | 早复珠【2】 | Recovery Jwl 2 | 回复速度 +3 ／ 吃饭 −1 |
| 210 | 持续珠【1】 | Enduring Jwl 1 | 效果持续 +2 ／ — |
| 211 | 友爱珠【1】 | Friendship Jwl 1 | 广域 +1 ／ 气息 −1 |
| 212 | 友爱珠【2】 | Friendship Jwl 2 | 广域 +3 ／ 气息 −1 |
| 213 | 无食珠【1】 | Hungerless Jwl 1 | 饥饿 +2 ／ — |
| 214 | 食汉珠【1】 | Metabolism Jwl 1 | 贪吃鬼 +2 ／ — |
| 215 | 快吃珠【1】 | Gobbler Jwl 1 | 吃饭 +1 ／ 回复量 −1 |
| 216 | 快吃珠【3】 | Gobbler Jwl 3 | 吃饭 +4 ／ 回复量 −2 |
| 217 | 节食珠【1】 | Satiated Jwl 1 | 节食 +2 ／ 反复无常 −1 |
| 218 | 肉食珠【1】 | Meateater Jwl 1 | 肉食 +1 ／ 饥饿 −1 |
| 219 | 肉好珠【1】 | Meatlover Jwl 1 | 肉食 +2 ／ — |
| 220 | 茸好珠【1】 | Fungiform Jwl 1 | 食菇 +2 ／ 肉食 −1 |
| 221 | 野草珠【1】 | Grass Jwl 1 | 野草知识 +2 ／ — |
| 222 | 博士珠【1】 | Professor Jwl 1 | 调和成功率 +2 ／ — |
| 223 | 弹制珠【1】 | Factory Jwl 1 | 调和数 +2 ／ — |
| 224 | 陷阱师珠【1】 | Trapmaster Jwl 1 | 高速设置 +2 ／ — |
| 225 | 采集珠【1】 | Gathering Jwl 1 | 采集 +2 ／ — |
| 226 | 采蜜珠【1】 | Honeybee Jwl 1 | 蜂蜜 +1 ／ 反复无常 −1 |
| 227 | 占蜜珠【1】 | Queenbee Jwl 1 | 蜂蜜 +2 ／ — |
| 228 | 护石珠【1】 | Charmer Jwl 1 | 护石王 +1 ／ — |
| 229 | 护石珠【3】 | Charmer Jwl 3 | 护石王 +4 ／ — |
| 230 | 祝福珠【1】 | Blessing Jwl 1 | 反复无常 +2 ／ — |
| 231 | 运气珠【1】 | Fate Jwl 1 | 运气 +1 ／ 反复无常 −1 |
| 232 | 运气珠【3】 | Fate Jwl 3 | 运气 +4 ／ 反复无常 −2 |
| 233 | 剥皮珠【1】 | Carver Jwl 1 | 剥取 +1 ／ 运气 −1 |
| 234 | 剥皮珠【3】 | Carver Jwl 3 | 剥取 +4 ／ 运气 −2 |
| 235 | 捕获珠【1】 | Capture Jwl 1 | 捕获 +1 ／ 运气 −1 |
| 236 | 捕获珠【3】 | Capture Jwl 3 | 捕获 +4 ／ 运气 −2 |
| 237 | 历铃珠【1】 | Bell Jwl 1 | 贝鲁纳 +2 ／ — |
| 238 | 始猎珠【1】 | Novice Jwl 1 | 可可特 +2 ／ — |
| 239 | 雪花珠【1】 | Snowflake Jwl 1 | 波凯 +2 ／ — |
| 240 | 仙汤珠【1】 | Springs Jwl 1 | 结云 +2 ／ — |
| 241 | 探究珠【1】 | Study Jwl 1 | 龙识船 +2 ／ — |
| 242 | 天宴珠【1】 | Skyfeast Jwl 1 | 飞行酒吧 +2 ／ — |

> 二名之魂（144–179）与复合技能（180–205）**没有对应珠**，所以本表止于 143 棵树。
> 珠子名字里的汉字是「效果方向」的提示：耐／制（无效）、属耐／属攻、攻击／防御、达人、匠／斩铁（匠与利刃）、早填／抑反（装填与后坐力）——同一个汉字常成对出现，一颗的副作用正好是另一颗的主效果。
