# 怪物总览（Monsters Index）

> 本页把 MHGU 1.4.0 的 **137 个敌人槽位**一次列全：93 只可狩猎大型怪、36 只小型怪、1 个阁螳螂机偶、7 个机制单元。
> 每行给出 em id（arc 编号 / 敌人表编号）、中文名、英文名、变体归类，以及**最早能在村庄或集会所遇到它的任务档次**（据点 + ★ + LR/HR/G）。
> 本页只做索引与定位：具体肉质、异常状态、素材掉落请点行尾的三个专题链接（页面另行建设中）。

---

## 0. 怎么读这张表

| 列 | 含义 | 取法 |
|---|---|---|
| 槽 | 存档 137 槽序号（0–136） | `docs/data/json/monster-slot-map.json` 的 `slot` |
| em id | `arc / 编号`：左边是 romfs 模型包名（`arc/enemy/emNNN_00.arc`），右边是敌人表编号（= `mhgu.db.monsters._id`） | 编号低 8 位 = arc 编号；小型怪编号 = 4096 + ems 编号 |
| 归类 | 普通大型 / 稀少种 / 亚种 / 特殊个体 / 二名 / 小型 | 由编号高位判定，见 §1 |
| 首次出现 | `村★4LR` = 村庄任务 ★4 下位；`集★2LR` = 集会所 ★2 下位；`许可★1` = 特殊许可 I（LR 段，★11 = G1）；带 `※` = 该档次里它只是**同场 / 乱入**，不是任务目标 | `mhgu.db` 的 `quests` ⨝ `monster_to_quest`（SQL 见 §7） |
| 专题页 | 指向 `monster-hitzones.md` / `monster-status.md` / `monster-drops.md` 的锚点 | 锚点规则见 §6 |

要点：
- **「大型怪 93 只」是玩家口径**：137 槽里剩下的是机偶、机制单元和小型怪，不能把 137 当怪物总数，也不要写「94 只大型」。
- 首次出现按 **LR → HR → G，再按 ★ 升序**取最早一条；排除 Event / Arena（活动、斗技场）任务，因此不等于「全游戏最早能打到的任务」。
- `※` 的例子：村★7「Research Team's First Rodeo」的目标是桃毛兽王，任务怪物表里同时登记了天彗龙——天彗龙在那里只是乱入。

---

## 1. 编号模型（本页所有行共用）

| 事实 | 内容 | 证据 |
|---|---|---|
| arc 编号 | `emNNN_00.arc` 的 NNN = 敌人表编号 **低 8 位**；小型怪 = 编号 − 4096 后补零成 `emsNNN` | 对 129 个有 db 行的编号逐一求 `& 0xFF`，`arc/enemy/` 下全部存在同名 arc（另有 `em087_00.arc` 无 db 行，即机偶） |
| 编号高位 | `0x1000` = 小型（ems）；`0x400` = 二名区；`0x500`（= 0x400 + 0x100）= 特殊个体；`0x200` = 稀少种；`0x100` = 亚种（269 红龙） | 与 `monsters.class` 计数闭合（见下） |
| 变体归类核对 | `class=0` 共 75 = 普通 67 + 稀少种 3 + 亚种 1 + 特殊个体 4；`class=2` 共 18 = 二名 | 75 + 18 + 36（`class=1` 小型）= 129，与 db 行数一致 |
| 机偶 | `em087` 无 db 行，是阁螳螂的「机偶 / 瓦砾」单元（与 `em088` 共享 `roEm087.cro`） | `docs/analysis/monsters/mon-em-units.md` §C5 |
| 机制单元 | `ems100`–`ems106`（编号 4196–4202）无 db 行，`roEms100.cro` 在 C3 表里被连续引用 7 次（k=105..111） | 同上 §C6 |

> 高位含义是**推断**（`[I]`）：它同时解释了全部 129 行的归类，但 romfs 里没有直接枚举表。arc 编号算术是文件存在性核对过的（`[B]`）。

---

## 2. 大型怪物（93 只可狩猎）

> 名称取自仓库 137 槽名表；下表已用游戏自带简体中文（`chS/table/HN_MonsterListMsg_chS.gmd`）核对过的一律按官方写法，差异集中列在 §5。

| 槽 | em id（arc / 编号） | 中文名 | English | 归类 | 首次出现（村 / 集） | 专题页 |
|---|---|---|---|---|---|---|
| 0 | em001 / 1 | 雌火龙 | Rathian | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em001)｜[状态](monster-status.md#em001)｜[素材](monster-drops.md#em001) |
| 1 | em001 / 513 | 金火龙 | Gold Rathian | 稀少种 | 村★6HR ｜ 集★7HR | [肉质](monster-hitzones.md#em001-513)｜[状态](monster-status.md#em001-513)｜[素材](monster-drops.md#em001-513) |
| 2 | em001 / 1025 | 紫毒姬雌火龙 | Dreadqueen Rathian | 二名 | 许可★1 | [肉质](monster-hitzones.md#em001-1025)｜[状态](monster-status.md#em001-1025)｜[素材](monster-drops.md#em001-1025) |
| 3 | em002 / 2 | 火龙 | Rathalos | 大型 | 村★5LR ｜ 集★3LR | [肉质](monster-hitzones.md#em002)｜[状态](monster-status.md#em002)｜[素材](monster-drops.md#em002) |
| 4 | em002 / 514 | 银火龙 | Silver Rathalos | 稀少种 | 村★6HR ｜ 集★7HR | [肉质](monster-hitzones.md#em002-514)｜[状态](monster-status.md#em002-514)｜[素材](monster-drops.md#em002-514) |
| 5 | em002 / 1026 | 黑炎王雄火龙 | Dreadking Rathalos | 二名 | 许可★1 | [肉质](monster-hitzones.md#em002-1026)｜[状态](monster-status.md#em002-1026)｜[素材](monster-drops.md#em002-1026) |
| 6 | em003 / 3 | 白电 | Khezu | 大型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#em003)｜[状态](monster-status.md#em003)｜[素材](monster-drops.md#em003) |
| 7 | em008 / 8 | 怪鸟 | Yian Kut-Ku | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em008)｜[状态](monster-status.md#em008)｜[素材](monster-drops.md#em008) |
| 8 | em009 / 9 | 毒怪鸟 | Gypceros | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em009)｜[状态](monster-status.md#em009)｜[素材](monster-drops.md#em009) |
| 9 | em010 / 10 | 水龙 | Plesioth | 大型 | 村★8HR ｜ 集★5HR | [肉质](monster-hitzones.md#em010)｜[状态](monster-status.md#em010)｜[素材](monster-drops.md#em010) |
| 10 | em011 / 11 | 麒麟 | Kirin | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em011)｜[状态](monster-status.md#em011)｜[素材](monster-drops.md#em011) |
| 11 | em014 / 14 | 蓝速龙王 | Velocidrome | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em014)｜[状态](monster-status.md#em014)｜[素材](monster-drops.md#em014) |
| 12 | em015 / 15 | 黄速龙王 | Gendrome | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em015)｜[状态](monster-status.md#em015)｜[素材](monster-drops.md#em015) |
| 13 | em016 / 16 | 红速龙王 | Iodrome | 大型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#em016)｜[状态](monster-status.md#em016)｜[素材](monster-drops.md#em016) |
| 14 | em017 / 17 | 砂龙王 | Cephadrome | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em017)｜[状态](monster-status.md#em017)｜[素材](monster-drops.md#em017) |
| 15 | em018 / 18 | 黑狼鸟 | Yian Garuga | 大型 | 村★5LR ｜ 集★2LR | [肉质](monster-hitzones.md#em018)｜[状态](monster-status.md#em018)｜[素材](monster-drops.md#em018) |
| 16 | em018 / 1042 | 独眼黑狼鸟 | Deadeye Yian Garuga | 二名 | 许可★1 | [肉质](monster-hitzones.md#em018-1042)｜[状态](monster-status.md#em018-1042)｜[素材](monster-drops.md#em018-1042) |
| 17 | em019 / 19 | 大名盾蟹 | Daimyo Hermitaur | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em019)｜[状态](monster-status.md#em019)｜[素材](monster-drops.md#em019) |
| 18 | em019 / 1043 | 矛碎大名盾蟹 | Stonefist Hermitaur | 二名 | 许可★1 | [肉质](monster-hitzones.md#em019-1043)｜[状态](monster-status.md#em019-1043)｜[素材](monster-drops.md#em019-1043) |
| 19 | em020 / 20 | 将军镰蟹 | Shogun Ceanataur | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em020)｜[状态](monster-status.md#em020)｜[素材](monster-drops.md#em020) |
| 20 | em022 / 22 | 雪狮子王 | Blangonga | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em022)｜[状态](monster-status.md#em022)｜[素材](monster-drops.md#em022) |
| 21 | em023 / 23 | 金狮子 | Rajang | 大型 | 村★6HR ｜ 集★6HR | [肉质](monster-hitzones.md#em023)｜[状态](monster-status.md#em023)｜[素材](monster-drops.md#em023) |
| 22 | em023 / 1303 | 激昂金狮子 | Furious Rajang | 特殊个体 | 村★10G※ ｜ 集★7HR※ | [肉质](monster-hitzones.md#em023-1303)｜[状态](monster-status.md#em023-1303)｜[素材](monster-drops.md#em023-1303) |
| 23 | em024 / 24 | 钢龙 | Kushala Daora | 大型 | 村★6HR ｜ 集★3LR | [肉质](monster-hitzones.md#em024)｜[状态](monster-status.md#em024)｜[素材](monster-drops.md#em024) |
| 24 | em025 / 25 | 霞龙 | Chameleos | 大型 | 村★6HR ｜ 集★3LR | [肉质](monster-hitzones.md#em025)｜[状态](monster-status.md#em025)｜[素材](monster-drops.md#em025) |
| 25 | em027 / 27 | 炎王龙 | Teostra | 大型 | 村★6HR ｜ 集★3LR | [肉质](monster-hitzones.md#em027)｜[状态](monster-status.md#em027)｜[素材](monster-drops.md#em027) |
| 26 | em030 / 30 | 野猪王 | Bulldrome | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em030)｜[状态](monster-status.md#em030)｜[素材](monster-drops.md#em030) |
| 27 | em032 / 32 | 轰龙 | Tigrex | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em032)｜[状态](monster-status.md#em032)｜[素材](monster-drops.md#em032) |
| 28 | em032 / 1056 | 荒钩爪轰龙 | Grimclaw Tigrex | 二名 | 许可★1 | [肉质](monster-hitzones.md#em032-1056)｜[状态](monster-status.md#em032-1056)｜[素材](monster-drops.md#em032-1056) |
| 29 | em033 / 33 | 霸龙 | Akantor | 大型 | 村★10HR ｜ 集★7HR | [肉质](monster-hitzones.md#em033)｜[状态](monster-status.md#em033)｜[素材](monster-drops.md#em033) |
| 30 | em036 / 36 | 熔岩龙 | Lavasioth | 大型 | 村★8HR ｜ 集★5HR | [肉质](monster-hitzones.md#em036)｜[状态](monster-status.md#em036)｜[素材](monster-drops.md#em036) |
| 31 | em037 / 37 | 迅龙 | Nargacuga | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em037)｜[状态](monster-status.md#em037)｜[素材](monster-drops.md#em037) |
| 32 | em037 / 1061 | 白疾风迅龙 | Silverwind Nargacuga | 二名 | 许可★1 | [肉质](monster-hitzones.md#em037-1061)｜[状态](monster-status.md#em037-1061)｜[素材](monster-drops.md#em037-1061) |
| 33 | em038 / 38 | 崩龙 | Ukanlos | 大型 | 村★10HR ｜ 集★7HR | [肉质](monster-hitzones.md#em038)｜[状态](monster-status.md#em038)｜[素材](monster-drops.md#em038) |
| 34 | em043 / 43 | 恐暴龙 | Deviljho | 大型 | 村★6HR※ ｜ 集★4HR※ | [肉质](monster-hitzones.md#em043)｜[状态](monster-status.md#em043)｜[素材](monster-drops.md#em043) |
| 35 | em043 / 1323 | 怒食恐暴龙 | Savage Deviljho | 特殊个体 | — ｜ 集★6HR※ | [肉质](monster-hitzones.md#em043-1323)｜[状态](monster-status.md#em043-1323)｜[素材](monster-drops.md#em043-1323) |
| 36 | em045 / 45 | 爆锤龙 | Uragaan | 大型 | 村★5LR ｜ 集★3LR | [肉质](monster-hitzones.md#em045)｜[状态](monster-status.md#em045)｜[素材](monster-drops.md#em045) |
| 37 | em045 / 1069 | 宝缠爆锤龙 | Crystalbeard Uragaan | 二名 | 许可★1 | [肉质](monster-hitzones.md#em045-1069)｜[状态](monster-status.md#em045-1069)｜[素材](monster-drops.md#em045-1069) |
| 38 | em046 / 46 | 海龙 | Lagiacrus | 大型 | 村★5LR ｜ 集★3LR | [肉质](monster-hitzones.md#em046)｜[状态](monster-status.md#em046)｜[素材](monster-drops.md#em046) |
| 39 | em047 / 47 | 水兽 | Royal Ludroth | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em047)｜[状态](monster-status.md#em047)｜[素材](monster-drops.md#em047) |
| 40 | em049 / 49 | 炎戈龙 | Agnaktor | 大型 | 村★9HR ｜ 集★6HR | [肉质](monster-hitzones.md#em049)｜[状态](monster-status.md#em049)｜[素材](monster-drops.md#em049) |
| 41 | em050 / 50 | 煌黑龙 | Alatreon | 大型 | 村★10HR ｜ 集★7HR | [肉质](monster-hitzones.md#em050)｜[状态](monster-status.md#em050)｜[素材](monster-drops.md#em050) |
| 42 | em055 / 55 | 尾锤龙 | Duramboros | 大型 | 村★6HR ｜ 集★6HR | [肉质](monster-hitzones.md#em055)｜[状态](monster-status.md#em055)｜[素材](monster-drops.md#em055) |
| 43 | em056 / 56 | 潜口龙 | Nibelsnarf | 大型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#em056)｜[状态](monster-status.md#em056)｜[素材](monster-drops.md#em056) |
| 44 | em057 / 57 | 雷狼龙 | Zinogre | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em057)｜[状态](monster-status.md#em057)｜[素材](monster-drops.md#em057) |
| 45 | em057 / 1081 | 金雷公雷狼龙 | Thunderlord Zinogre | 二名 | 许可★1 | [肉质](monster-hitzones.md#em057-1081)｜[状态](monster-status.md#em057-1081)｜[素材](monster-drops.md#em057-1081) |
| 46 | em058 / 58 | 岚龙 | Amatsu | 大型 | 村★10HR ｜ 集★7HR | [肉质](monster-hitzones.md#em058)｜[状态](monster-status.md#em058)｜[素材](monster-drops.md#em058) |
| 47 | em060 / 60 | 青熊兽 | Arzuros | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em060)｜[状态](monster-status.md#em060)｜[素材](monster-drops.md#em060) |
| 48 | em060 / 1084 | 红盔青熊兽 | Redhelm Arzuros | 二名 | 许可★1 | [肉质](monster-hitzones.md#em060-1084)｜[状态](monster-status.md#em060-1084)｜[素材](monster-drops.md#em060-1084) |
| 49 | em061 / 61 | 白兔兽 | Lagombi | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em061)｜[状态](monster-status.md#em061)｜[素材](monster-drops.md#em061) |
| 50 | em061 / 1085 | 大雪主白兔兽 | Snowbaron Lagombi | 二名 | 许可★1 | [肉质](monster-hitzones.md#em061-1085)｜[状态](monster-status.md#em061-1085)｜[素材](monster-drops.md#em061-1085) |
| 51 | em062 / 62 | 赤甲兽 | Volvidon | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em062)｜[状态](monster-status.md#em062)｜[素材](monster-drops.md#em062) |
| 52 | em063 / 63 | 碎龙 | Brachydios | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em063)｜[状态](monster-status.md#em063)｜[素材](monster-drops.md#em063) |
| 53 | em065 / 65 | 奇猿狐 | Kecha Wacha | 大型 | 村★7HR ｜ 集★4HR | [肉质](monster-hitzones.md#em065)｜[状态](monster-status.md#em065)｜[素材](monster-drops.md#em065) |
| 54 | em066 / 66 | 鬼蛙 | Tetsucabra | 大型 | 村★3LR ｜ 集★1LR | [肉质](monster-hitzones.md#em066)｜[状态](monster-status.md#em066)｜[素材](monster-drops.md#em066) |
| 55 | em066 / 1090 | 岩穿鬼蛙 | Drilltusk Tetsucabra | 二名 | 许可★1 | [肉质](monster-hitzones.md#em066-1090)｜[状态](monster-status.md#em066-1090)｜[素材](monster-drops.md#em066-1090) |
| 56 | em067 / 67 | 变形冰鲨 | Zamtrios | 大型 | 村★6HR※ ｜ 集★5HR | [肉质](monster-hitzones.md#em067)｜[状态](monster-status.md#em067)｜[素材](monster-drops.md#em067) |
| 57 | em068 / 68 | 绞蛇龙 | Najarala | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em068)｜[状态](monster-status.md#em068)｜[素材](monster-drops.md#em068) |
| 58 | em069 / 69 | 重甲虫 | Seltas Queen | 大型 | 村★6HR ｜ 集★6HR | [肉质](monster-hitzones.md#em069)｜[状态](monster-status.md#em069)｜[素材](monster-drops.md#em069) |
| 59 | em071 / 71 | 黑蚀龙 | Gore Magala | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em071)｜[状态](monster-status.md#em071)｜[素材](monster-drops.md#em071) |
| 60 | em072 / 72 | 天廻龙 | Shagaru Magala | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em072)｜[状态](monster-status.md#em072)｜[素材](monster-drops.md#em072) |
| 61 | em076 / 76 | 穿甲虫 | Seltas | 大型 | 村★6HR ｜ 集★4HR | [肉质](monster-hitzones.md#em076)｜[状态](monster-status.md#em076)｜[素材](monster-drops.md#em076) |
| 62 | em077 / 77 | 千刃龙 | Seregios | 大型 | 村★6LR ｜ 集★3LR | [肉质](monster-hitzones.md#em077)｜[状态](monster-status.md#em077)｜[素材](monster-drops.md#em077) |
| 63 | em079 / 79 | 夜鸟 | Malfestio | 大型 | 村★4LR ｜ 集★2LR | [肉质](monster-hitzones.md#em079)｜[状态](monster-status.md#em079)｜[素材](monster-drops.md#em079) |
| 64 | em080 / 80 | 斩龙 | Glavenus | 大型 | 村★3LR※ ｜ 集★3LR | [肉质](monster-hitzones.md#em080)｜[状态](monster-status.md#em080)｜[素材](monster-drops.md#em080) |
| 65 | em080 / 1104 | 烬灭刃斩龙 | Hellblade Glavenus | 二名 | 许可★1 | [肉质](monster-hitzones.md#em080-1104)｜[状态](monster-status.md#em080-1104)｜[素材](monster-drops.md#em080-1104) |
| 66 | em081 / 81 | 电龙 | Astalos | 大型 | 村★3LR※ ｜ 集★3LR | [肉质](monster-hitzones.md#em081)｜[状态](monster-status.md#em081)｜[素材](monster-drops.md#em081) |
| 67 | em082 / 82 | 泡狐龙 | Mizutsune | 大型 | 村★3LR※ ｜ 集★3LR | [肉质](monster-hitzones.md#em082)｜[状态](monster-status.md#em082)｜[素材](monster-drops.md#em082) |
| 68 | em083 / 83 | 巨兽 | Gammoth | 大型 | 村★3LR※ ｜ 集★3LR | [肉质](monster-hitzones.md#em083)｜[状态](monster-status.md#em083)｜[素材](monster-drops.md#em083) |
| 69 | em084 / 84 | 骸龙 | Nakarkos | 大型 | 村★10HR ｜ 集★3LR | [肉质](monster-hitzones.md#em084)｜[状态](monster-status.md#em084)｜[素材](monster-drops.md#em084) |
| 70 | em085 / 85 | 跳狗龙王 | Great Maccao | 大型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#em085)｜[状态](monster-status.md#em085)｜[素材](monster-drops.md#em085) |
| 112 | em004 / 4 | 岩龙 | Basarios | 大型 | 村★8HR ｜ 集★5HR | [肉质](monster-hitzones.md#em004)｜[状态](monster-status.md#em004)｜[素材](monster-drops.md#em004) |
| 113 | em005 / 5 | 铠龙 | Gravios | 大型 | 村★9HR ｜ 集★6HR | [肉质](monster-hitzones.md#em005)｜[状态](monster-status.md#em005)｜[素材](monster-drops.md#em005) |
| 114 | em007 / 7 | 角龙 | Diablos | 大型 | 村★10HR ｜ 集★7HR | [肉质](monster-hitzones.md#em007)｜[状态](monster-status.md#em007)｜[素材](monster-drops.md#em007) |
| 115 | em007 / 1031 | 鏖魔角龙 | Bloodbath Diablos | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em007-1031)｜[状态](monster-status.md#em007-1031)｜[素材](monster-drops.md#em007-1031) |
| 116 | em012 / 12 | 老山龙 | Lao-Shan Lung | 大型 | — ｜ 集★13G | [肉质](monster-hitzones.md#em012)｜[状态](monster-status.md#em012)｜[素材](monster-drops.md#em012) |
| 117 | em013 / 13 | 黑龙 | Fatalis | 大型 | — ｜ 集★14G | [肉质](monster-hitzones.md#em013)｜[状态](monster-status.md#em013)｜[素材](monster-drops.md#em013) |
| 118 | em013 / 269 | 红龙 | Crimson Fatalis | 亚种 | — ｜ 集★14G※ | [肉质](monster-hitzones.md#em013-269)｜[状态](monster-status.md#em013-269)｜[素材](monster-drops.md#em013-269) |
| 119 | em013 / 525 | 祖龙 | Old Fatalis | 稀少种 | — ｜ 集★14G※ | [肉质](monster-hitzones.md#em013-525)｜[状态](monster-status.md#em013-525)｜[素材](monster-drops.md#em013-525) |
| 120 | em020 / 1044 | 铠裂将军镰蟹 | Rustrazor Ceanataur | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em020-1044)｜[状态](monster-status.md#em020-1044)｜[素材](monster-drops.md#em020-1044) |
| 121 | em021 / 21 | 桃毛兽王 | Congalala | 大型 | 村★7HR ｜ 集★5HR | [肉质](monster-hitzones.md#em021)｜[状态](monster-status.md#em021)｜[素材](monster-drops.md#em021) |
| 122 | em034 / 34 | 白速龙王 | Giadrome | 大型 | 村★7HR ｜ 集★4HR | [肉质](monster-hitzones.md#em034)｜[状态](monster-status.md#em034)｜[素材](monster-drops.md#em034) |
| 123 | em042 / 42 | 冰牙龙 | Barioth | 大型 | 村★9HR ｜ 集★6HR | [肉质](monster-hitzones.md#em042)｜[状态](monster-status.md#em042)｜[素材](monster-drops.md#em042) |
| 124 | em044 / 44 | 土砂龙 | Barroth | 大型 | 村★7HR ｜ 集★5HR | [肉质](monster-hitzones.md#em044)｜[状态](monster-status.md#em044)｜[素材](monster-drops.md#em044) |
| 125 | em063 / 1343 | 临界碎龙 | Raging Brachydios | 特殊个体 | — ｜ 集★14G※ | [肉质](monster-hitzones.md#em063-1343)｜[状态](monster-status.md#em063-1343)｜[素材](monster-drops.md#em063-1343) |
| 126 | em070 / 70 | 影蜘蛛 | Nerscylla | 大型 | 村★8HR ｜ 集★5HR | [肉质](monster-hitzones.md#em070)｜[状态](monster-status.md#em070)｜[素材](monster-drops.md#em070) |
| 127 | em071 / 1351 | 混沌黑蚀龙 | Chaotic Gore Magala | 特殊个体 | — ｜ 集★14G※ | [肉质](monster-hitzones.md#em071-1351)｜[状态](monster-status.md#em071-1351)｜[素材](monster-drops.md#em071-1351) |
| 128 | em079 / 1103 | 胧隐夜鸟 | Nightcloak Malfestio | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em079-1103)｜[状态](monster-status.md#em079-1103)｜[素材](monster-drops.md#em079-1103) |
| 129 | em081 / 1105 | 青电主电龙 | Boltreaver Astalos | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em081-1105)｜[状态](monster-status.md#em081-1105)｜[素材](monster-drops.md#em081-1105) |
| 130 | em082 / 1106 | 天眼泡狐龙 | Soulseer Mizutsune | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em082-1106)｜[状态](monster-status.md#em082-1106)｜[素材](monster-drops.md#em082-1106) |
| 131 | em083 / 1107 | 银峰巨兽 | Elderfrost Gammoth | 二名 | 许可★G1 | [肉质](monster-hitzones.md#em083-1107)｜[状态](monster-status.md#em083-1107)｜[素材](monster-drops.md#em083-1107) |
| 132 | em086 / 86 | 天彗龙 | Valstrax | 大型 | 村★7HR※ ｜ 集★14G | [肉质](monster-hitzones.md#em086)｜[状态](monster-status.md#em086)｜[素材](monster-drops.md#em086) |
| 134 | em088 / 88 | 阁螳螂 | Ahtal-Ka | 大型 | — ｜ 集★14G | [肉质](monster-hitzones.md#em088)｜[状态](monster-status.md#em088)｜[素材](monster-drops.md#em088) |

**二名许可等级**：`许可★N` 的 N 就是许可等级，按 `quests.rank` 分档——**★1–3 = LR、★4–10 = HR、★11–16 = G**（11–15 = G1–G5，16 = EX）。例：`quests._id = 40401`（紫毒姬 I）的 `rank` 是 `LR`。本页出现的 `许可★1` 即 LR 段首战，`许可★G1` 即 ★11 = G1。

> 本表来源：`槽`/`em id`/`English` = `docs/data/json/monster-slot-map.json` 的 `slot`/`emid`/`en`；`归类` = 由 em id 高位判定（§1）并与 `mhgu.db.monsters.class` 交叉核对（槽表的 `kind` 只有 big/small，**不含**变体归类）；`中文名` = `monsterName_chS #<槽>` 的文本（§5 列出与槽表 `cn` 的全部差异）；`首次出现` = `mhgu.db` 的 `quests` ⨝ `monster_to_quest`（SQL 见 §7）。

> 变体例外（4 条）：槽 **22 / 35 / 125 / 127** 在 `monsterName_chS` 里与本体同名（#22 金狮子、#35 恐暴龙、#125 碎龙、#127 黑蚀龙），为避免与本体重名，这四行采用 itemData 别名 **激昂金狮子 / 怒食恐暴龙 / 临界碎龙 / 混沌黑蚀龙**；其余 89 只大型怪均逐字取名称表的槽位文本。

---

## 3. 小型怪物（36 只）

> 小型怪多为环境怪 / 素材怪，只有一部分进任务目标表。`首次出现` 空 = 数据里没有任何村庄/集会所任务把它登记为怪物（野外仍可遇到）。

| 槽 | em id（arc / 编号） | 中文名 | English | 归类 | 首次出现（村 / 集） | 专题页 |
|---|---|---|---|---|---|---|
| 71 | ems001 / 4097 | 草食龙 | Aptonoth | 小型 | — | [肉质](monster-hitzones.md#ems001)｜[状态](monster-status.md#ems001)｜[素材](monster-drops.md#ems001) |
| 72 | ems002 / 4098 | 背甲龙 | Apceros | 小型 | — | [肉质](monster-hitzones.md#ems002)｜[状态](monster-status.md#ems002)｜[素材](monster-drops.md#ems002) |
| 73 | ems003 / 4099 | 精灵鹿 | Kelbi | 小型 | — | [肉质](monster-hitzones.md#ems003)｜[状态](monster-status.md#ems003)｜[素材](monster-drops.md#ems003) |
| 74 | ems004 / 4100 | 蘑菇猪 | Mosswine | 小型 | — | [肉质](monster-hitzones.md#ems004)｜[状态](monster-status.md#ems004)｜[素材](monster-drops.md#ems004) |
| 75 | ems005 / 4101 | 巨甲虫 | Hornetaur | 小型 | — | [肉质](monster-hitzones.md#ems005)｜[状态](monster-status.md#ems005)｜[素材](monster-drops.md#ems005) |
| 76 | ems006 / 4102 | 巨蜂 | Vespoid | 小型 | — ｜ 集★2LR | [肉质](monster-hitzones.md#ems006)｜[状态](monster-status.md#ems006)｜[素材](monster-drops.md#ems006) |
| 77 | ems007 / 4103 | 艾露猫 | Felyne | 小型 | — | [肉质](monster-hitzones.md#ems007)｜[状态](monster-status.md#ems007)｜[素材](monster-drops.md#ems007) |
| 78 | ems008 / 4104 | 梅拉露 | Melynx | 小型 | 村★3LR ｜ — | [肉质](monster-hitzones.md#ems008)｜[状态](monster-status.md#ems008)｜[素材](monster-drops.md#ems008) |
| 79 | ems009 / 4105 | 蓝速龙 | Velociprey | 小型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#ems009)｜[状态](monster-status.md#ems009)｜[素材](monster-drops.md#ems009) |
| 80 | ems010 / 4106 | 黄速龙 | Genprey | 小型 | 村★2LR ｜ 集★11G | [肉质](monster-hitzones.md#ems010)｜[状态](monster-status.md#ems010)｜[素材](monster-drops.md#ems010) |
| 81 | ems011 / 4107 | 红速龙 | Ioprey | 小型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems011)｜[状态](monster-status.md#ems011)｜[素材](monster-drops.md#ems011) |
| 82 | ems012 / 4108 | 砂龙 | Cephalos | 小型 | 村★7HR ｜ — | [肉质](monster-hitzones.md#ems012)｜[状态](monster-status.md#ems012)｜[素材](monster-drops.md#ems012) |
| 83 | ems013 / 4109 | 野猪 | Bullfango | 小型 | 村★2LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems013)｜[状态](monster-status.md#ems013)｜[素材](monster-drops.md#ems013) |
| 84 | ems014 / 4110 | 波波 | Popo | 小型 | — | [肉质](monster-hitzones.md#ems014)｜[状态](monster-status.md#ems014)｜[素材](monster-drops.md#ems014) |
| 85 | ems015 / 4111 | 白速龙 | Giaprey | 小型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#ems015)｜[状态](monster-status.md#ems015)｜[素材](monster-drops.md#ems015) |
| 86 | ems016 / 4112 | 雪鹿 | Anteka | 小型 | 村★3LR ｜ — | [肉质](monster-hitzones.md#ems016)｜[状态](monster-status.md#ems016)｜[素材](monster-drops.md#ems016) |
| 87 | ems019 / 4115 | 蛇龙 | Remobra | 小型 | 村★5LR ｜ 集★7HR | [肉质](monster-hitzones.md#ems019)｜[状态](monster-status.md#ems019)｜[素材](monster-drops.md#ems019) |
| 88 | ems020 / 4116 | 盾蟹 | Hermitaur | 小型 | 村★2LR ｜ 集★1LR | [肉质](monster-hitzones.md#ems020)｜[状态](monster-status.md#ems020)｜[素材](monster-drops.md#ems020) |
| 89 | ems021 / 4117 | 镰蟹 | Ceanataur | 小型 | 村★4LR ｜ 集★3LR | [肉质](monster-hitzones.md#ems021)｜[状态](monster-status.md#ems021)｜[素材](monster-drops.md#ems021) |
| 90 | ems023 / 4119 | 雪狮子 | Blango | 小型 | 村★2LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems023)｜[状态](monster-status.md#ems023)｜[素材](monster-drops.md#ems023) |
| 91 | ems025 / 4121 | 硬甲龙 | Rhenoplos | 小型 | 村★2LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems025)｜[状态](monster-status.md#ems025)｜[素材](monster-drops.md#ems025) |
| 92 | ems026 / 4122 | 飞甲虫 | Bnahabra | 小型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems026)｜[状态](monster-status.md#ems026)｜[素材](monster-drops.md#ems026) |
| 93 | ems027 / 4123 | 甲虫 | Altaroth | 小型 | — | [肉质](monster-hitzones.md#ems027)｜[状态](monster-status.md#ems027)｜[素材](monster-drops.md#ems027) |
| 94 | ems034 / 4130 | 狗龙 | Jaggi | 小型 | 村★1LR ｜ 集★1LR | [肉质](monster-hitzones.md#ems034)｜[状态](monster-status.md#ems034)｜[素材](monster-drops.md#ems034) |
| 95 | ems035 / 4131 | 雌狗龙 | Jaggia | 小型 | 村★2LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems035)｜[状态](monster-status.md#ems035)｜[素材](monster-drops.md#ems035) |
| 96 | ems039 / 4135 | 水生兽 | Ludroth | 小型 | 村★10HR ｜ 集★1LR | [肉质](monster-hitzones.md#ems039)｜[状态](monster-status.md#ems039)｜[素材](monster-drops.md#ems039) |
| 97 | ems040 / 4136 | 熔岩兽 | Uroktor | 小型 | 村★4LR ｜ — | [肉质](monster-hitzones.md#ems040)｜[状态](monster-status.md#ems040)｜[素材](monster-drops.md#ems040) |
| 98 | ems041 / 4137 | 垂皮龙 | Slagtoth | 小型 | — | [肉质](monster-hitzones.md#ems041)｜[状态](monster-status.md#ems041)｜[素材](monster-drops.md#ems041) |
| 99 | ems042 / 4138 | 丸鸟 | Gargwa | 小型 | — | [肉质](monster-hitzones.md#ems042)｜[状态](monster-status.md#ems042)｜[素材](monster-drops.md#ems042) |
| 100 | ems044 / 4140 | 变形幼冰鲨 | Zamite | 小型 | — ｜ 集★5HR | [肉质](monster-hitzones.md#ems044)｜[状态](monster-status.md#ems044)｜[素材](monster-drops.md#ems044) |
| 101 | ems045 / 4141 | 盾虫 | Konchu | 小型 | 村★3LR ｜ 集★2LR | [肉质](monster-hitzones.md#ems045)｜[状态](monster-status.md#ems045)｜[素材](monster-drops.md#ems045) |
| 102 | ems046 / 4142 | 跳狗龙 | Maccao | 小型 | 村★1LR ｜ 集★1LR | [肉质](monster-hitzones.md#ems046)｜[状态](monster-status.md#ems046)｜[素材](monster-drops.md#ems046) |
| 103 | ems047 / 4143 | 首鸣龙 | Larinoth | 小型 | — | [肉质](monster-hitzones.md#ems047)｜[状态](monster-status.md#ems047)｜[素材](monster-drops.md#ems047) |
| 104 | ems048 / 4144 | 云羊鹿 | Moofah | 小型 | — | [肉质](monster-hitzones.md#ems048)｜[状态](monster-status.md#ems048)｜[素材](monster-drops.md#ems048) |
| 135 | ems017 / 4113 | 大雷光虫 | Great Thunderbug | 小型 | 村★8HR ｜ 集★12G | [肉质](monster-hitzones.md#ems017)｜[状态](monster-status.md#ems017)｜[素材](monster-drops.md#ems017) |
| 136 | ems022 / 4118 | 桃毛兽 | Conga | 小型 | 村★7HR ｜ 集★11G | [肉质](monster-hitzones.md#ems022)｜[状态](monster-status.md#ems022)｜[素材](monster-drops.md#ems022) |

> 本表来源同 §2：`名称` = `monsterName_chS #<槽>` 的文本；`编号` = 槽表 `emid`；与仓库名的差异见 §5；`首次出现` = `mhgu.db`（SQL 见 §7）；小型怪的「目标命中」档次与「出现」档次全部相同，故无 `※` 行。

---

## 4. 特殊条目（不计入「可狩猎怪物」）

| 槽 | em id（arc / 编号） | 名称 | 说明 | 证据 |
|---|---|---|---|---|
| 133 | em087 / 无 db 行 | 阁螳螂·机偶（瓦砾 / 女王龙椅） | 阁螳螂战斗中的机偶形态，与 `em088` 共享 `roEm087.cro`；图鉴里没有独立条目 | `mon-em-units.md` §C5 |
| 105–111 | ems100–ems106 / 4196–4202 | dummy1–dummy7（`monsterName_chS` #105–111 原样为占位名） | `roEms100.cro` 在 C3 表被连续引用 7 次（k=105..111），是唯一 id ≥ 100 的小型怪资源，属特殊/机制单元，不是图鉴怪 | `mon-em-units.md` §C6＋`monsterName_chS` |

> 本表来源：`mon-em-units.md` §C5–C6（`uEm087_00` / `uEms100_00` 的类名串与 `ro*.cro` 引用计数）；`arc/enemy/` 下 `em087_00.arc` 与 `ems100_00.arc`～`ems106_00.arc` 均存在。

---

## 5. 名称勘误：仓库名 ↔ 游戏自带简体中文

**主源已定为 `chS/arc/resident_chS.arc :: chS\GUI\06_msg\monsterName_chS`（268 串；i=0..136 与本页槽号一一对应，i137 起是 `KANJI_` 重复与种类名）。** 下表只列「仓库名 → 官方名」有差异的条目（按核对顺序排列）；证据列是独立旁证，`monsterName_chS` 的索引就是该怪槽位（已核：重甲虫 #58、穿甲虫 #61、大名盾蟹 #17、将军镰蟹 #19、雪狮子王 #20、桃毛兽王 #121）。变体 22/35/125/127 在名称表里与本体同名（金狮子/恐暴龙/碎龙/黑蚀龙），按「变体保留 itemData 别名」的裁决，页面仍用 激昂金狮子 / 怒食恐暴龙 / 临界碎龙 / 混沌黑蚀龙。

| em id | 仓库名 | 本页采用（官方 chS） | 原文依据 | 等级 |
|---|---|---|---|---|
| 69（槽 58） | 徹甲虫 | **重甲虫** | 「被称为「重甲虫」的大型甲虫种怪物。翅膀已经退化……与「穿甲虫」互为雌雄关系，通过散发荷尔蒙来使唤雄性的「穿甲虫」」 | B |
| 76（槽 61） | 重甲虫 | **穿甲虫** | 说明文「名为「穿甲虫」的中型甲虫种」；`HN_MonsterListMsg_chS` hint_123/124、`itemData_chS` #2030–2041、`GC_Title_1` name1_548 均作「穿甲虫」；`彻甲虫` 只见于 `weapon10 #43` / `weapon11 #277`，属异写 | B |
| 55 | 尾槌龙 | **尾锤龙** | 「不负「尾锤龙」之名的兽龙」 | B |
| 54 | 鬼娃 | **鬼蛙** | 「两栖种。名为「鬼蛙」」 | B |
| 56 | 化鲛 | **变形冰鲨** | 「因此被称为「变形冰鲨」」 | B |
| 48 | 红兜青熊兽 | **红盔青熊兽** | 「故世人畏惧地称之――「红盔」」；`MonsterDemo_chS.gmd` 亦作「红盔青熊兽」 | B |
| 5 | 黑炎王火龙 | **黑炎王雄火龙** | `MonsterDemo_chS.gmd` 字符串「黑炎王雄火龙」（与「紫毒姬雌火龙」同构） | B |
| 16 | 隻眼黑狼鸟 | **独眼黑狼鸟** | 说明文「那只射出锐利光芒的「独眼」，便是其赌上性命，身经百战的证明」＋ `MonsterDemo_chS.gmd` 字符串「独眼黑狼鸟」 | B |
| 70 | 跳狗龙 | **跳狗龙王** | `MonsterDemo_chS.gmd` 字符串「跳狗龙王」；小型 4142 才是「跳狗龙」 | B |
| 19 | 镰蟹 | **将军镰蟹** | 「将军镰蟹善用技巧，袭击猎人时……」 | B |
| 60 | 天迴龙 | **天廻龙** | 「人称「天廻龙」」 | B |
| 86 | 天慧龙 | **天彗龙** | 「因故称之为「天彗龙」」 | B |
| 6 | 白电龙 | **白电** | 道具名「白电的皮」「白电的肋骨」；说明文「白电会爬上墙壁或洞顶」 | B |
| 7 | 大怪鸟 | **怪鸟** | 道具名「怪鸟的鳞」「怪鸟的耳」；说明文「因怪鸟的听觉非常发达」 | B |
| 22 | 金狮子（激昂） | **激昂金狮子** | 道具说明「激昂金狮子的毛」 | B |
| 26 | 大野猪王 | **野猪王** | `monsterName_chS #26`（`DosFango`）；`MonsterDemo_chS.gmd #64` 同 | B |
| 35 | 恐暴龙（怒食） | **怒食恐暴龙** | 道具「怒食恐暴龙的？？」 | B |
| 120 | 铠裂镰蟹 | **铠裂将军镰蟹** | 道具说明「铠裂将军镰蟹作为居所的甲壳」 | B |
| 125 | 碎龙（临界） | **临界碎龙** | 道具「临界碎龙的？？？」 | B |
| 127 | 黑蚀龙（浑沌） | **混沌黑蚀龙** | `itemData_chS.gmd` #4903 / #5239（「混沌的龙鳞」等，官方用「混沌」而非「浑沌」） | B |
| 131 | 银岭巨兽 | **银峰巨兽** | 道具「银峰巨兽的体毛」「银峰巨兽的甲壳」 | B |
| 129 | 青电主雷龙 | **青电主电龙** | 「「青电主」。电龙的特殊个体」＋道具说明「从青电主电龙身上取下的贵重鳞」 | B |
| 4116 | 盾虫 | **盾蟹** | `monsterName_chS #88`（`YaoZami`）；与大型「大名盾蟹」(#17) 同族，`盾虫` 一名属 4141 | B |
| 4117 | 镰虫 | **镰蟹** | `monsterName_chS #89`（`GamiZami`）；与大型「将军镰蟹」(#19) 同族 | B |
| 4141 | 卷贝兽 | **盾虫** | 「生活在各种环境下的「盾虫」……有团起身体保护自己的习性」；`monsterName_chS #101`（`Kunchu`） | B |
| 118（槽 118） | 红黑龙 | **红龙** | `monsterName_chS #118`（`MillaBoreis_AKA`） | B |
| 4098（槽 72） | 甲壳草食龙 | **背甲龙** | `monsterName_chS #72`（`Apkeros`） | B |
| 4099（槽 73） | 灵鹿 | **精灵鹿** | `monsterName_chS #73`（`Kervi`） | B |
| 4100（槽 74） | 香菇猪 | **蘑菇猪** | `monsterName_chS #74`（`Moz`） | B |
| 4101（槽 75） | 飞虫 | **巨甲虫** | `monsterName_chS #75`（`Kanthalos`） | B |
| 4102（槽 76） | 爬虫 | **巨蜂** | `monsterName_chS #76`（`Langosta`） | B |
| 4103（槽 77） | 艾露 | **艾露猫** | `monsterName_chS #77`（`Airou`） | B |
| 4108（槽 82） | 砂蛇龙 | **砂龙** | `monsterName_chS #82`（`Gareos`） | B |
| 4111（槽 85） | 雪鹿 | **白速龙** | `monsterName_chS #85`（`Gianos`） | B |
| 4112（槽 86） | 羚羊 | **雪鹿** | `monsterName_chS #86`（`Gawshika`） | B |
| 4119（槽 90） | 小雪狮 | **雪狮子** | `monsterName_chS #90`（`Blango`） | B |
| 4121（槽 91） | 羚鹿 | **硬甲龙** | `monsterName_chS #91`（`Rhenoplos`） | B |
| 4140（槽 100） | 小鬼鲛 | **变形幼冰鲨** | `monsterName_chS #100`（`Skagil`） | B |
| 4118（槽 136） | 小桃毛兽 | **桃毛兽** | `monsterName_chS #136`（`Konga`） | B |

**别名保留**（官方文本里常只出现二名本体）：银峰巨兽 → 别名「银峰」；青电主电龙 → 别名「青电主」；红盔青熊兽 → 别名「红盔」；铠裂将军镰蟹 → 别名「铠裂」；天眼泡狐龙 → 别名「天眼」。其余二名（紫毒姬、矛碎、荒钩爪、白疾风、宝缠、金雷公、大雪主、岩穿、烬灭刃、鏖魔、胧隐）的别名部分与仓库名一致。

> `MonsterDemo_chS.gmd` 只作历史旁证：同一怪物可能有两个标签、含 `@` / `???` 占位与缩短写法。**名称一律以 `monsterName_chS` 的槽位文本为准**（本页即如此）。

> **别把这两只并了**：`天廻龙` = Shagaru Magala（em072，槽 60），`天彗龙` = Valstrax（em086，槽 132）。`MonsterDemo_chS.gmd` 里 `Kanji_Tenkairyu`（#88）与 `Shagaru` 槽（#89）都写「天廻龙」，`Kanji_Valphalk`（#91）与 `Valphalk`（#94）才是「天彗龙」。

> 影响：仓库的 `monster-slot-map.json` 与 `-137.json` 的 `cn` 仍是旧写法（含 69/76 两组互换、尾槌龙、白电龙、大怪鸟、大野猪王、红黑龙等，明细见上表 39 条）。引用本页时以本表与 `monsterName_chS` 为准。

---

## 6. 分页链接约定（给专题页作者）

行尾三个链接的锚点按 em 编号生成，规则固定，专题页只需建同名标题即可：

| 目标页 | 锚点格式 | 例 |
|---|---|---|
| `monster-hitzones.md` | `#em<3 位 base>`，变体再缀 `-<完整编号>` | `#em001`、`#em001-513` |
| `monster-status.md` | 同上 | `#em069` |
| `monster-drops.md` | 同上 | `#em081-1105` |
| 小型怪 | `#ems<3 位编号>` | `#ems045` |

分批大表沿用同一套锚点：肉质若落在 `hitzones-all-a.md` / `hitzones-all-b.md`，怪物名索引若落在 `small-monsters.md`，锚点仍按上表生成（`#em001`、`#ems045`）。

---

## 7. 数据来源与置信度

| 数据 | 来源 | 等级 |
|---|---|---|
| 137 槽清单、槽号、em 编号、中/英文名、大小分类 | `MHGU/docs/data/json/monster-slot-map.json`（`slot` / `emid` / `cn` / `en` / `kind`） | B（em 编号 ↔ 物种另有 `MHGU-private/romfs-extract/em_size_scale_data.txt` 的体型基准值匹配佐证：槽 116 老山龙 6959.79、槽 9 水龙 2624.83 等） |
| 英文名 / 日文名对照（未在本页展示） | `MHGU/docs/data/mhgu.db` → `monsters` 表；`docs/data/json/monsters.json` | I（第三方 MHGenDatabase v2.4.0，非 romfs） |
| 首次出现任务档次 | `MHGU/docs/data/mhgu.db` → `quests` ⨝ `monster_to_quest` | I（同上库；任务 id/星级/据点字段本身与 romfs `questData_*.ext` 的结构一致，见 `docs/data/romfs-tables.md`） |
| 官方简体中文写法 | `HN_MonsterListMsg_chS.gmd`（猎人笔记说明文，220 串：9 索引 + 1 种类 + 210 提示），JSON 见 `MHGU-private/romfs-extract/gmd/table/HN_MonsterListMsg_chS.gmd.json` | B（原文引用，见 §5） |
| 官方中文怪物名（**主源**） | `chS/arc/resident_chS.arc :: chS\GUI\06_msg\monsterName_chS`（268 串；#0–#136 = 槽位顺序名称，#105–#111 = dummy1–7，#133 = 空串），JSON `MHGU-private/romfs-extract/gmd-arc/monsterName_chS.gmd.json`；引用 `monsterName_chS #<i> (<Label>)` | B（KbInventory 逐槽核对） |
| 展示名（历史旁证） | `MonsterDemo_chS.gmd`（96 串，`label` ↔ `text` 按 `entry.index` 配对，含 `@` / `???` 与缩短写法） | B |
| 名称佐证 | `itemData_chS.gmd`（5982 串 = 2991 件 × 名称 + 说明），JSON 见 `…/gmd/table/itemData_chS.gmd.json`；道具名/说明文里的「XX的皮」「XX的鳞」可直接证明怪物写法 | B |
| arc 存在性 | `G:/mhgu-romfs/romfs/nativeNX/arc/enemy/`：94 个 `em*` + 43 个 `ems*` 文件、68 个唯一 em 编号 | B（目录枚举） |
| 机偶 / 机制单元 | `MHGU/docs/analysis/monsters/mon-em-units.md` §C5–C6 | B |

**复现首次出现**（`mhgu.db`，SQLite）：

```sql
-- 最早出现（只看任务怪物表，含同场/乱入）
SELECT m._id, m.name,
 (SELECT q.rank || q.stars FROM monster_to_quest mtq JOIN quests q ON q._id = mtq.quest_id
   WHERE mtq.monster_id = m._id AND q.hub = 'Village'
   ORDER BY CASE q.rank WHEN 'LR' THEN 0 WHEN 'HR' THEN 1 ELSE 2 END, q.stars, q._id LIMIT 1) AS village,
 (SELECT q.rank || q.stars FROM monster_to_quest mtq JOIN quests q ON q._id = mtq.quest_id
   WHERE mtq.monster_id = m._id AND q.hub = 'Guild'
   ORDER BY CASE q.rank WHEN 'LR' THEN 0 WHEN 'HR' THEN 1 ELSE 2 END, q.stars, q._id LIMIT 1) AS guild
FROM monsters m ORDER BY m._id;

-- 判断是否为「任务目标」：同条件再加 AND instr(q.goal, m.name) > 0；两者不同即写 ※
-- 二名许可：WHERE q.hub = 'Permit' AND q.permit_monster_id = m._id ORDER BY q.stars LIMIT 1（stars 1..10 = I..X，11..16 = G1..G5/EX）

-- 归类核对
SELECT class, COUNT(*) FROM monsters GROUP BY class;  -- class 0=75 / 1=36 / 2=18
```

**置信度标记**：`B` = 字节/原文核对；`I` = 推断或第三方库；本页没有 `C` 级（romfs 直接数值）条目。

---

## 8. 待补

| 缺口 | 影响 | 需要的信源 |
|---|---|---|
| 「任务目标 vs 同场」只按英文 `goal` 子串判定 | 带 `※` 的格子只能说明最早那条不是目标；目标任务可能更早但名字写法不同（如复数、别名） | `questData_*.ext` 的 `ClearConditions` + `Monsters[5]` 目标槽位（361 B 记录，`docs/data/romfs-tables.md`） |
| 小型怪的肉质 / 状态 / 掉落 | 专题页 `monster-hitzones.md` / `monster-status.md` / `monster-drops.md` 对 36 只小型怪大概率无数据 | 两个现有信源都缺（`monster_damage` 仅覆盖 93 只大型；wiki 2502 表为空） |
| 各怪「种类」（飞龙种 / 兽龙种…） | 本页没放这一列 | `docs/mechanics/monsters.md` §12 已有 93 只大型的种类列，可直接搬 |
| 各怪栖息地图（初期 / 移动 / 休息区域） | 本页只给「首次出现任务」，不给地图 | `mhgu.db` → `monster_habitat`（303 行，第三方库 `[I]`）＋官方地图名 `chS/table/GuestHunterMsg_chS.gmd`：`OldForest`=古代森林、`Desert`=旧沙漠、`Forest`=山林、`SnowyMountain`=雪山、`MistyPeaks`=溪流、`DesertIsland`=孤岛、`Swamp`=沼泽、`Volcano`=火山、`RuinsField`=遗迹平原、`VirginForest`=原生林、`IceSea`=冰海、`CaveVolcano`=地底火山、`DosDesert`=沙漠、`DosJungle`=密林、`Highland`=无人山岭；特殊：`GC_Title_1` 的 `name1_101`=塔之秘境、`name1_102`=灵峰（**不要**用 `mhgu.db.locations.name_ja`，那是日文字段，不是中文名） |
| 基础体力（可选列） | 本页没放 HP 列，故未用到 | romfs `arc/enemy/emNNN_00.arc :: *_dttune` 的 **base HP @0x38**（唯一固定偏移；格式 `docs/reference/formats/dttune.md`，解码器 `MHGU/tools/mhgu/dttune.mjs`；批量产物 `MHGU/docs/data/json/monster-dttune-index.json`）。**注意**：肉质表偏移逐怪不同（见过 0x8C/0x8E/0x8F），状态表 0x324 或 0x35C、有的怪缺失——必须按该 index 的逐怪偏移读取；没定位到该怪的表就不得标 `[C]`。落地后本列（仅 HP）可由 `[I]` 升 `[C]` |
