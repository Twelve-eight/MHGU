# 村与集会所下位/上位任务全表

村任务 ★1–★10（含 G 级村★10）与集会所下位 ★1–★3、上位 ★4–★7 的完整清单。G 级集会所任务见 [quests-g-rank.md](quests-g-rank.md)，承接条件的编码规则见 [quest-requirements.md](quest-requirements.md)，任务系统总览见 [quests.md](quests.md)。

## 0. 出处与标记

- 任务名、目标、地图、报酬金、HRP、出场怪物：第三方 `mhgu.db` 的 `quests` / `monster_to_quest` / `locations` 表 `[I]`。任务名为英文：中文版没有逐任务的任务名文本（见 `docs/reference/formats/gmd.md`「任务名（中文）」一行）。
- 怪物中文名：`docs/data/json/monster-slot-map.json` 的 `cn` 字段（按英文名对应）。「（狞猛）」= `monster_to_quest.hyper = 1` `[I]`。
- 承接条件：romfs 任务记录 `Requirement1` 字段（扫描结果 `.tmp/mhgu/questreq.csv`），按 quest-requirements.md §2 的规则换算成 HR `[C]`；「—」= 无条件。
- 「romfs 星级」一列：同一任务在 romfs 记录里的星级；与 db 不一致时标 `[X]`。

## 1. 村下位

### 1.1 村下位 ★1（7 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 101 | Find the Ferns | Deliver 8 Unique Ferns | 古代森林 | — | 300 | 30 | — | 1 |
| 102 | Due for Dragon Amber | Deliver 3 Dragon Amber Pieces | 古代森林 | — | 300 | 30 | — | 1 |
| 103 | Medicinal Moths | Deliver 3 Immortal Moths | 古代森林 | — | 300 | 30 | — | 1 |
| 104 | Horns o' Plenty | Deliver 3 Kelbi Horns | 古代森林 | — | 300 | 30 | — | 1 |
| 105 | A Fungal Hunt | Deliver 5 Abyssal Mushrooms | 古代森林 | — | 300 | 30 | — | 1 |
| 106 | Wipe Out! | Slay 10 Maccao | 古代森林 | 跳狗龙 | 300 | 30 | — | 1 |
| 107 | Another Pack Attack | Slay 10 Jaggi | 古代森林（夜） | 狗龙 | 300 | 30 | — | 1 |

### 1.2 村下位 ★2（37 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 201 | Harvest Tour: Jurassic Frontier | Survive until time expires or deliver a Paw Pass Ticket | 古代森林 | — | 12 | 0 | — | 2 |
| 202 | Harvest Tour: Dunes | Survive until time expires or deliver a Paw Pass Ticket | 旧沙漠 | — | 12 | 0 | — | 2 |
| 203 | Harvest Tour: Verdant Hills | Survive until time expires or deliver a Paw Pass Ticket | 山林 | — | 12 | 0 | — | 2 |
| 204 | Harvest Tour: Arctic Ridge | Survive until time expires or deliver a Paw Pass Ticket | 雪山 | — | 12 | 0 | — | 2 |
| 205 | Harvest Tour: Misty Peaks | Survive until time expires or deliver a Paw Pass Ticket | 溪流 | — | 12 | 0 | — | 2 |
| 206 | Vaulting Outlaw | Hunt a Great Maccao | 古代森林 | 跳狗龙王 | 900 | 70 | — | 2 |
| 207 | Rambunctious Rhenoplos | Slay 5 Rhenoplos | 古代森林 | 硬甲龙 | 600 | 40 | — | 2 |
| 208 | On the Rebound | Slay 15 Maccao | 古代森林（夜） | 跳狗龙、跳狗龙王 | 1200 | 40 | — | 2 |
| 209 | A Berry Good Idea | Deliver 3 Ancient Berries | 古代森林 | — | 900 | 50 | — | 2 |
| 210 | A Fern is Forever | Deliver 20 Unique Ferns | 古代森林（夜） | 跳狗龙王 | 1200 | 40 | — | 2 |
| 211 | Jurassic Frontier Accounting | Earn 1000 Wycademy Points | 古代森林 | 跳狗龙王 | 1500 | 100 | — | 2 |
| 212 | Gendrome Roadblock | Hunt a Gendrome | 旧沙漠 | 黄速龙王 | 1200 | 90 | — | 2 |
| 213 | The Land Sharq | Hunt a Cephadrome | 旧沙漠 | 砂龙王 | 1500 | 100 | — | 2 |
| 214 | Slay the Genprey! | Slay 10 Genprey | 旧沙漠 | 黄速龙 | 900 | 40 | — | 2 |
| 215 | Hermit Grab | Slay 5 Hermitaurs | 旧沙漠 | 盾蟹 | 600 | 40 | — | 2 |
| 216 | Birthday Berries | Deliver 5 Tropical Berries | 旧沙漠 | — | 600 | 40 | — | 2 |
| 217 | Liver of Legend! | Deliver 5 Piscine Livers | 旧沙漠 | — | 1500 | 50 | — | 2 |
| 218 | Dunes Accounting | Earn 1000 Wycademy Points | 旧沙漠 | 黄速龙王 | 1500 | 100 | — | 2 |
| 219 | Hunt Down the Velocidrome! | Hunt a Velocidrome | 山林 | 蓝速龙王 | 900 | 70 | — | 2 |
| 220 | Slay the Velociprey! | Slay 10 Velociprey | 山林 | 蓝速龙 | 900 | 40 | — | 2 |
| 221 | Bullfango Tango | Slay 10 Bullfango | 山林（夜） | 野猪、蓝速龙王 | 1200 | 40 | — | 2 |
| 222 | Prime Premium Sashimi | Deliver 3 Premium Sashimi | 山林 | — | 900 | 50 | — | 2 |
| 223 | Verdant Hills Accounting | Earn 1000 Wycademy Points | 山林 | 蓝速龙王 | 1500 | 100 | — | 2 |
| 224 | The Mountain Roughrider | Hunt a Bulldrome | 雪山 | 野猪王 | 1200 | 80 | — | 2 |
| 225 | Slay the Giaprey! | Slay 10 Giaprey | 雪山 | 白速龙 | 900 | 40 | — | 2 |
| 226 | A Pack of Blangos | Slay 10 Blangos | 雪山（夜） | 雪狮子、野猪王 | 1500 | 40 | — | 2 |
| 227 | Medicinal Mountain Herbs | Deliver 10 Mountain Herbs | 雪山 | — | 600 | 40 | — | 2 |
| 228 | Arctic Ridge Accounting | Earn 1000 Wycademy Points | 雪山 | 野猪王 | 1500 | 100 | — | 2 |
| 229 | Arzuros the Azure Beast | Hunt an Arzuros | 溪流 | 青熊兽 | 1200 | 90 | — | 2 |
| 230 | Bye Bye Jaggia | Slay 8 Jaggia | 溪流 | 雌狗龙 | 900 | 40 | — | 2 |
| 231 | Howling Harassment | Slay 15 Jaggi | 溪流（夜） | 狗龙、青熊兽 | 1200 | 40 | — | 2 |
| 232 | Fungal Fad | Deliver 10 Unique Mushrooms | 溪流 | — | 600 | 40 | — | 2 |
| 233 | Sunsnug Sprout Courier | Deliver 10 Super Sprouts | 溪流 | 青熊兽 | 900 | 40 | — | 2 |
| 234 | Misty Peaks Accounting | Earn 1000 Wycademy Points | 溪流 | 青熊兽 | 1500 | 100 | — | 2 |
| 100201 | Prowler's First Errand | Deliver 5 Unique Ferns | 古代森林 | — | 600 | 40 | — | 2 |
| 100202 | Jurassic Fungologist | Deliver 8 Abyssal Mushrooms | 古代森林 | — | 1200 | 40 | — | 2 |
| 100203 | Lucky Frontier Cat | Earn 500 Wycademy Points | 古代森林（夜） | — | 900 | 50 | — | 2 |

### 1.3 村下位 ★3（49 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 301 | Harvest Tour: Deserted Island | Survive until time expires or deliver a Paw Pass Ticket | 孤岛 | — | 12 | 0 | — | 3 |
| 302 | Harvest Tour: Marshlands | Survive until time expires or deliver a Paw Pass Ticket | 沼泽 | — | 12 | 0 | — | 3 |
| 303 | Tusked Tantrum | Hunt a Tetsucabra | 古代森林（夜） | 鬼蛙 | 2400 | 180 | — | 3 |
| 304 | Stomping Grounds | Hunt a Yian Kut-Ku | 古代森林 | 怪鸟 | 1800 | 140 | — | 3 |
| 305 | Chasing Tail | Hunt 2 Great Maccao | 古代森林（夜） | 跳狗龙王 | 1800 | 110 | — | 3 |
| 306 | Jurassic Treasure: The Frog | Capture a Tetsucabra | 古代森林 | 鬼蛙 | 3600 | 250 | — | 3 |
| 307 | Bit by the Fashion Bug | Slay 20 Bnahabra | 古代森林（夜） | 飞甲虫、毒怪鸟 | 1200 | 80 | — | 3 |
| 308 | Tumultuous Sprouts | Deliver 8 Abyssal Mushrooms | 古代森林（夜） | 斩龙 | 1200 | 80 | — | 3 |
| 309 | Tumultuous Sprouts | Deliver 8 Abyssal Mushrooms | 古代森林（夜） | 斩龙、鬼蛙、跳狗龙王 | 1200 | 80 | — | 3 |
| 310 | Fishy Favor | Deliver 3 Brocadefish | 古代森林（夜） | — | 1800 | 100 | — | 3 |
| 311 | Crustacean Frustration | Hunt a Daimyo Hermitaur | 旧沙漠 | 大名盾蟹 | 2400 | 180 | — | 3 |
| 312 | The Desert Gourmand | Hunt a Nibelsnarf | 旧沙漠 | 潜口龙 | 2700 | 220 | — | 3 |
| 313 | Konchu Collector | Slay 15 Konchu | 旧沙漠 | 盾虫、砂龙王 | 1200 | 80 | — | 3 |
| 314 | Cancer of the Dunes | Slay 10 before time expires or deliver a Paw Pass Ticket | 旧沙漠 | 砂龙王 | 1500 | 100 | — | 3 |
| 315 | Deliver the Liver | Deliver 5 Apceros Livers | 旧沙漠 | 黄速龙王 | 1200 | 80 | — | 3 |
| 316 | Farming Frustrations | Slay 20 Velociprey | 山林（夜） | 蓝速龙、蓝速龙王 | 1800 | 80 | — | 3 |
| 317 | Financial Focus on Fungus | Deliver 10 Unique Mushrooms | 山林 | 蓝速龙王 | 900 | 80 | — | 3 |
| 318 | Local Threat | Hunt a Yian Kut-Ku | 山林 | 怪鸟 | 1800 | 140 | — | 3 |
| 319 | Into the Wyvern's Den | Deliver 2 Wyvern Eggs | 山林（夜） | 电龙 | 2400 | 120 | — | 3 |
| 320 | Into the Wyvern's Den | Deliver 2 Wyvern Eggs | 山林（夜） | 电龙、怪鸟、蓝速龙王 | 2400 | 120 | — | 3 |
| 321 | Snow with Occasional Lagombi | Hunt a Lagombi | 雪山 | 白兔兽 | 1800 | 100 | — | 3 |
| 322 | Anteka Anticipation | Slay 8 Anteka | 雪山（夜） | 雪鹿、白兔兽 | 900 | 80 | — | 3 |
| 323 | The Shadow in the Mountains | Hunt a Khezu | 雪山 | 白电 | 2700 | 220 | — | 3 |
| 324 | No Go on the Popo | Deliver 3 Popo Tongues | 雪山（夜） | 巨兽 | 900 | 80 | — | 3 |
| 325 | No Go on the Popo | Deliver 3 Popo Tongues | 雪山（夜） | 巨兽、白电、白兔兽 | 900 | 80 | — | 3 |
| 326 | Bully the Bullfango | Slay 20 Bullfango | 溪流（夜） | 野猪、野猪王 | 2100 | 80 | — | 3 |
| 327 | For Whom the Egg Yolks | Deliver 3 Gargwa Eggs | 溪流 | 青熊兽 | 1800 | 120 | — | 3 |
| 328 | Royal Spit Take | Hunt a Royal Ludroth | 溪流 | 水兽 | 2400 | 180 | — | 3 |
| 329 | A Forest Fracas | Hunt a Bulldrome | 溪流（夜） | 野猪王、泡狐龙 | 1200 | 80 | — | 3 |
| 330 | A Forest Fracas | Hunt a Bulldrome | 溪流（夜） | 野猪王、泡狐龙 | 1200 | 80 | — | 3 |
| 331 | Royal Honey Hunt | Deliver 5 Royal Honeys | 溪流（夜） | 青熊兽 | 900 | 80 | — | 3 |
| 332 | Current Events | Hunt a Royal Ludroth | 孤岛 | 水兽 | 2400 | 180 | — | 3 |
| 333 | The Crabbiest Catch | Capture a Daimyo Hermitaur | 孤岛 | 大名盾蟹 | 3600 | 250 | — | 3 |
| 334 | Pack Woes | Slay a total of 20 Jaggi or Jaggia | 孤岛 | 大名盾蟹 | 1800 | 80 | — | 3 |
| 335 | The Fungus Among Us | Deliver 5 Ripened Mushrooms | 孤岛 | 青熊兽 | 1200 | 100 | — | 3 |
| 336 | Moofah Must-haves | Deliver 5 pieces of Moofah Fur | 孤岛 | — | 900 | 100 | — | 3 |
| 337 | Deserted Island Accounting | Earn 1000 Wycademy Points | 孤岛 | 鬼蛙 | 2100 | 150 | — | 3 |
| 338 | Sunsnug Isle Rescue! | Hunt an Iodrome | 沼泽 | 红速龙王 | 1800 | 110 | — | 3 |
| 339 | Robbed Blind | Hunt a Gypceros | 沼泽 | 毒怪鸟 | 2100 | 170 | — | 3 |
| 340 | Pest Control | Slay a total of 20 Vespoid or Hornetaur | 沼泽 | 毒怪鸟 | 1200 | 80 | — | 3 |
| 341 | Travelers in Trouble | Slay 10 Ioprey | 沼泽 | 红速龙、红速龙王 | 1200 | 80 | — | 3 |
| 342 | Royal Rhinos Gone Wild | Deliver 10 Royal Rhinos | 沼泽 | 野猪王 | 1800 | 80 | — | 3 |
| 343 | Marshlands Accounting | Earn 1000 Wycademy Points | 沼泽 | 怪鸟 | 2100 | 150 | — | 3 |
| 100301 | Verdant Hills Bully | Slay 8 Melynxes | 山林 | 梅拉露 | 600 | 80 | — | 3 |
| 100302 | Lucky Hills Cat | Earn 800 Wycademy Points | 山林（夜） | — | 1500 | 100 | — | 3 |
| 100303 | The Mining Drag | Deliver 8 Balmstone Pieces | 溪流 | — | 1500 | 80 | — | 3 |
| 100304 | Felyne Fishing Weekly | Deliver 3 Premium Sashimi | 山林 | — | 900 | 90 | — | 3 |
| 100305 | Grooming the Moofahs | Deliver 5 pieces of Moofah Fur | 孤岛 | — | 1200 | 90 | — | 3 |
| 100306 | Bug Reports | Slay a total of 10 Vespoid or Hornetaur | 沼泽 | — | 600 | 80 | — | 3 |

### 1.4 村下位 ★4（35 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 401 | Harvest Tour: Volcano | Survive until time expires or deliver a Paw Pass Ticket | 火山 | — | 12 | 0 | — | 4 |
| 402 | The Nocturnal Enchanter | Hunt a Malfestio | 古代森林（夜） | 夜鸟 | 3000 | 200 | — | 4 |
| 403 | Wyvern of the Wind | Hunt a Nargacuga | 古代森林 | 迅龙 | 3600 | 250 | — | 4 |
| 404 | Jurassic Treasure: The Bug | Hunt a Volvidon | 古代森林 | 赤甲兽 | 2400 | 120 | — | 4 |
| 405 | Unlock the Secret to... | Deliver 2 Eternal Fossils | 古代森林（夜） | 雌火龙 | 3600 | 180 | — | 4 |
| 406 | A Unique Cuppa | Deliver 10 Unique Ferns or a Paw Pass Ticket | 古代森林（夜） | 迅龙 | 1800 | 150 | — | 4 |
| 407 | Hunt-a-thon: Gendrome | Hunt 2 before time expires or deliver a Paw Pass Ticket | 旧沙漠 | 黄速龙王 | 2400 | 160 | — | 4 |
| 408 | Mining: The Final Frontier | Deliver 2 Meteor Chunks | 旧沙漠 | 赤甲兽 | 2700 | 180 | — | 4 |
| 409 | Wrath of the Rathian | Hunt a Rathian | 山林 | 雌火龙 | 3300 | 220 | — | 4 |
| 410 | Noise Violation | Hunt a Najarala | 山林 | 绞蛇龙、蓝速龙王、怪鸟 | 3600 | 240 | — | 4 |
| 411 | Hunt-a-thon: Yian Kut-Ku | Hunt 2 before time expires or deliver a Paw Pass Ticket | 山林（夜） | 怪鸟 | 3300 | 250 | — | 4 |
| 412 | Hunt-a-thon: Velocidrome | Hunt 2 before time expires or deliver a Paw Pass Ticket | 山林 | 蓝速龙王 | 1800 | 130 | — | 4 |
| 413 | The New Tenant | Hunt a Blangonga | 雪山 | 雪狮子王 | 3300 | 240 | — | 4 |
| 414 | Lagombi Lair | Hunt 2 Lagombi | 雪山（夜） | 白兔兽 | 3300 | 160 | — | 4 |
| 415 | Hungry Eyes | Hunt a Nargacuga | 溪流（夜） | 迅龙 | 3600 | 250 | — | 4 |
| 416 | Royal Pains | Hunt 2 Royal Ludroth | 溪流 | 水兽 | 4500 | 290 | — | 4 |
| 417 | Peddling Practice | Deliver 10 Balmstone Pieces | 溪流（夜） | 水兽 | 2100 | 120 | — | 4 |
| 418 | Island Menace | Capture a Malfestio | 孤岛 | 夜鸟、青熊兽 | 4500 | 280 | — | 4 |
| 419 | Deviled Legs | Hunt 2 Tetsucabras | 孤岛 | 鬼蛙 | 4500 | 290 | — | 4 |
| 420 | Hunt-a-thon: Daimyo Hermitaur | Hunt 2 before time expires or deliver a Paw Pass Ticket | 孤岛 | 大名盾蟹 | 4500 | 320 | — | 4 |
| 421 | Marshlands Mission | Hunt a Shogun Ceanataur | 沼泽 | 将军镰蟹 | 3300 | 240 | — | 4 |
| 422 | Serpentine Samba | Hunt a Najarala | 沼泽 | 绞蛇龙 | 3600 | 240 | — | 4 |
| 423 | Lurkin' in the Murk | Hunt 2 Khezu | 沼泽 | 白电 | 5100 | 350 | — | 4 |
| 424 | Crustacean Infestation | Slay 10 Ceanataurs | 沼泽 | 镰蟹、将军镰蟹 | 1800 | 120 | — | 4 |
| 425 | Tumbling Troublemaker | Hunt a Volvidon | 火山 | 赤甲兽 | 2400 | 120 | — | 4 |
| 426 | Crustacean Infatuation | Capture a Shogun Ceanataur | 火山 | 将军镰蟹 | 5100 | 340 | — | 4 |
| 427 | Rocking the Uroktor | Slay 10 Uroktor | 火山 | 熔岩兽、赤甲兽 | 2100 | 120 | — | 4 |
| 428 | Great Ore Discovery | Deliver 15 pieces of Coal | 火山 | 将军镰蟹 | 2400 | 120 | — | 4 |
| 429 | Volcano Accounting | Earn 1000 Wycademy Points | 火山 | 红速龙王 | 3000 | 200 | — | 4 |
| 100401 | Great Maccao Headbreaker | Wound Great Maccao's head | 古代森林 | 跳狗龙王 | 900 | 60 | — | 4 |
| 100402 | Dash It All | Slay 10 Bullfango | 山林（夜） | 野猪、蓝速龙王 | 1200 | 120 | — | 4 |
| 100403 | An Offer You Can't Refuse | Deliver 3 Gargwa Eggs | 溪流 | — | 1500 | 130 | — | 4 |
| 100404 | The Secret Ingredient | Deliver 4 Carapaceon Brains | 火山 | 红速龙王 | 1200 | 120 | — | 4 |
| 100405 | Marshlands Fishing? | Deliver 3 Goldenfish | 沼泽 | — | 1500 | 120 | — | 4 |
| 100406 | Arctic Point Expedition | Earn 1000 Wycademy Points | 雪山（夜） | 白兔兽 | 1800 | 150 | — | 4 |

### 1.5 村下位 ★5（28 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 501 | The Dark Age | Hunt a Yian Garuga | 古代森林 | 黑狼鸟 | 3900 | 250 | — | 5 |
| 502 | Trifecta of Terror | Hunt 3 Nibelsnarf | 旧沙漠 | 潜口龙 | 5700 | 370 | — | 5 |
| 503 | Garuga of the Hills | Hunt a Yian Garuga | 山林（夜） | 黑狼鸟、蓝速龙王、毒怪鸟 | 3900 | 250 | — | 5 |
| 504 | The Thunderclaw Wyvern | Hunt an Astalos | 山林 | 电龙 | 5100 | 320 | — | 5 |
| 505 | Fungus Fetch | Deliver 10 Unique Mushrooms or a Paw Pass Ticket | 山林（夜） | 雌火龙 | 2700 | 180 | — | 5 |
| 506 | Two Roars in the Snow | Hunt 2 Blangongas | 雪山 | 雪狮子王 | 6000 | 380 | — | 5 |
| 507 | Hunt-a-thon: Khezu | Hunt 2 before time expires or deliver a Paw Pass Ticket | 雪山（夜） | 白电 | 5100 | 370 | — | 5 |
| 508 | The Unwavering Colossus | Hunt a Gammoth | 雪山 | 巨兽 | 5100 | 320 | — | 5 |
| 509 | Lagiacrus Fuss | Hunt a Lagiacrus | 溪流（夜） | 海龙、水兽、雌火龙 | 4500 | 300 | — | 5 |
| 510 | The Entrancing Water Dancer | Hunt a Mizutsune | 溪流（夜） | 泡狐龙 | 5100 | 320 | — | 5 |
| 511 | The Fisherman's Fiend | Hunt a Lagiacrus | 孤岛 | 海龙 | 4500 | 300 | — | 5 |
| 512 | Island Heat | Hunt a Rathalos | 孤岛 | 火龙 | 4500 | 300 | — | 5 |
| 513 | Double Vision | Hunt 2 Malfestio | 孤岛 | 夜鸟 | 5400 | 320 | — | 5 |
| 514 | Hunt-a-thon: Gypceros | Hunt 2 before time expires or deliver a Paw Pass Ticket | 沼泽 | 毒怪鸟 | 4200 | 290 | — | 5 |
| 515 | Behind Closed Ores | Slay 10 before time expires or deliver a Paw Pass Ticket | 沼泽 | 绞蛇龙 | 2700 | 180 | — | 5 |
| 516 | A King, Robed in Smoke | Hunt a Rathalos | 火山 | 火龙 | 4500 | 300 | — | 5 |
| 517 | Fight or Uragaan! | Hunt an Uragaan | 火山 | 爆锤龙 | 4200 | 250 | — | 5 |
| 518 | Great Knuckleballs o' Fire! | Hunt 2 Volvidons | 火山 | 赤甲兽 | 4500 | 190 | — | 5 |
| 519 | Hunt-a-thon: Iodrome | Hunt 2 before time expires or deliver a Paw Pass Ticket | 火山 | 红速龙王 | 3600 | 190 | — | 5 |
| 520 | Envoy to Disaster | Slay 10 Remobras | 火山 | 蛇龙、爆锤龙 | 3000 | 160 | — | 5 |
| 521 | A Late Jurassic Excursion | Hunt all large monsters | 古代森林（夜） | 跳狗龙王、怪鸟、夜鸟 | 5400 | 290 | — | 5 |
| 522 | A Sandy Battle Royale | Hunt all large monsters | 旧沙漠 | 黄速龙王、砂龙王、潜口龙 | 5100 | 290 | — | 5 |
| 523 | Scientific Method | Hunt all large monsters | 孤岛 | 青熊兽、鬼蛙、大名盾蟹 | 5400 | 320 | — | 5 |
| 100501 | Blood Red Marshlands | Slay 10 Ioprey | 沼泽 | 红速龙、红速龙王 | 900 | 160 | — | 5 |
| 100502 | An Offer You Can't Relieve | Deliver a Wyvern Egg | 山林（夜） | 雌火龙 | 1200 | 170 | — | 5 |
| 100503 | Uroktor Hide 'n Seek | Slay 10 Uroktor | 火山 | 熔岩兽、赤甲兽 | 2100 | 160 | — | 5 |
| 100504 | Into the Volcano | Slay 8 Remobras | 火山 | 蛇龙 | 2400 | 160 | — | 5 |
| 100505 | Kut-Ku Earbreaker | Wound Yian Kut-Ku's head | 古代森林（夜） | 怪鸟 | 1500 | 120 | — | 5 |

### 1.6 村下位 ★6（25 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 601 | The Scorching Blade | Hunt a Glavenus | 古代森林 | 斩龙 | 5100 | 320 | — | 6 |
| 602 | Dark Wings, Dark Work | Hunt a Gore Magala | 古代森林 | 黑蚀龙 | 5100 | 310 | — | 6 |
| 603 | Tuff Turf | Hunt a Zinogre | 古代森林（夜） | 雷狼龙 | 4800 | 300 | — | 6 |
| 604 | From Beyond the Sands | Hunt a Glavenus | 旧沙漠 | 斩龙、黄速龙王、砂龙王、潜口龙 | 5100 | 320 | — | 6 |
| 605 | Tigrex by the Tail | Hunt a Tigrex | 旧沙漠 | 轰龙 | 5400 | 310 | — | 6 |
| 606 | A Thousand Scales of Dread | Hunt a Seregios | 旧沙漠 | 千刃龙 | 5400 | 370 | — | 6 |
| 607 | The Perilous Pair | Hunt a Rathalos and a Rathian | 山林（夜） | 雌火龙、火龙 | 7200 | 420 | — | 6 |
| 608 | The Hero's Journey | Hunt a Tigrex | 雪山（夜） | 轰龙、野猪王、白兔兽、雪狮子王 | 5400 | 310 | — | 6 |
| 609 | The Bellowing Zinogre | Hunt a Zinogre | 溪流（夜） | 雷狼龙、青熊兽、雌火龙、水兽 | 4800 | 300 | — | 6 |
| 610 | Brachydios Mio! | Hunt a Brachydios | 孤岛 | 碎龙 | 5700 | 370 | — | 6 |
| 611 | Under the Gaze of Heaven | Hunt 2 Shogun Ceanataurs | 沼泽 | 将军镰蟹 | 6000 | 380 | — | 6 |
| 612 | Break the Brachydios | Capture a Brachydios | 火山 | 碎龙、将军镰蟹、红速龙王、赤甲兽 | 8700 | 520 | — | 6 |
| 613 | Night Terrors | Hunt all large monsters | 山林（夜） | 蓝速龙王、毒怪鸟、雌火龙 | 5700 | 320 | — | 6 |
| 614 | Bristly Fanged Beasts | Hunt all large monsters | 雪山（夜） | 野猪王、白兔兽、雪狮子王 | 5700 | 290 | — | 6 |
| 615 | Drawing the Waterline | Hunt all large monsters | 溪流（夜） | 水兽、海龙 | 8400 | 460 | — | 6 |
| 616 | The Cankerous Quagmire | Hunt all large monsters | 沼泽 | 红速龙王、绞蛇龙 | 6600 | 320 | — | 6 |
| 617 | Volcano Triple Play | Hunt all large monsters | 火山 | 赤甲兽、爆锤龙 | 8100 | 340 | — | 6 |
| 618 | It's Electric | Slay a Kirin | 古代森林（夜） | 麒麟 | 6600 | 350 | — | 6 |
| 619 | The White Brute | Slay a Kirin | 雪山 | 麒麟 | 6600 | 350 | — | 6 |
| 620 | Stop the Wheel | Slay a Shagaru Magala | Sanctuary | 天廻龙 | 7200 | 400 | — | 6 |
| 621 | The Fated Four | Hunt all large monsters | Forlorn Arena | 巨兽、电龙、泡狐龙、斩龙 | 18600 | 900 | — | 6 |
| 100601 | The Right Cattitude | Hunt an Arzuros | 溪流 | 青熊兽 | 1800 | 210 | — | 6 |
| 100602 | D. Hermitaur Shellbreaker | Break Daimyo's shell | 旧沙漠 | 大名盾蟹 | 1800 | 150 | — | 6 |
| 100603 | Surrounded by Blue and Green | Hunt all large monsters | Arena | 蓝速龙王、跳狗龙王 | 2100 | 230 | — | 6 |
| 100604 | Poison and Fangs | Hunt a Bulldrome and an Iodrome | 沼泽 | 野猪王、红速龙王 | 3000 | 260 | — | 6 |

## 2. 村上位

### 2.6 村上位 ★6（20 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 622 | Advanced: Fungus Fetchin' | Deliver 20 Unique Mushrooms | 溪流 | 雌火龙、迅龙、恐暴龙 | 3000 | 250 | — | 6 |
| 623 | Advanced: Jurassic Treasure | Hunt a Glavenus | 古代森林（夜） | 斩龙 | 7500 | 510 | — | 6 |
| 624 | Advanced: Sly Swooper | Hunt a Yian Garuga | 山林 | 黑狼鸟、蓝速龙王、毒怪鸟、恐暴龙 | 6000 | 400 | — | 6 |
| 625 | Advanced: Invoking Rath | Hunt a Rathalos and a Rathian | 山林 | 火龙、雌火龙 | 10800 | 660 | — | 6 |
| 626 | Advanced: Seismic Scares | Hunt 2 Tigrex | 雪山 | 轰龙 | 14700 | 780 | — | 6 |
| 627 | Advanced: Twinkle Toes | Hunt a Duramboros | 溪流 | 尾锤龙 | 8100 | 490 | — | 6 |
| 628 | Advanced: Seltas Queen | Hunt a Seltas Queen | 原生林 | 重甲虫、穿甲虫 | 6600 | 480 | — | 6 |
| 629 | Advanced: The Goliaths | Hunt all large monsters | 古代森林 | 轰龙、火龙、斩龙 | 20100 | 1040 | — | 6 |
| 630 | Advanced: Barrage of Blue | Hunt all large monsters | Arena | 青熊兽、夜鸟、变形冰鲨 | 9900 | 550 | — | 6 |
| 631 | Advanced: Seeing Red | Hunt all large monsters | Arena | 赤甲兽、大名盾蟹、火龙 | 12300 | 670 | — | 6 |
| 632 | Advanced: Nothing is Sacred | Slay a Shagaru Magala | Sanctuary | 天廻龙 | 10800 | 640 | — | 6 |
| 633 | Advanced: Snowtal Recall | Slay a Kushala Daora or repel it | 雪山（夜） | 钢龙 | 12000 | 800 | — | 6 |
| 634 | Advanced: Invisible Thief | Slay a Chameleos or repel it | 山林 | 霞龙 | 12000 | 800 | — | 6 |
| 635 | Advanced: Teostra's Return | Slay a Teostra or repel it | 火山 | 炎王龙 | 12000 | 800 | — | 6 |
| 636 | Advanced: Might is Right | Hunt all large monsters | Arena | 火龙、黑狼鸟、轰龙、迅龙、雷狼龙 | 30000 | 1580 | — | 6 |
| 637 | Advanced: State in Flux | Hunt all large monsters | Arena | 雪狮子王、海龙、碎龙、黑蚀龙、千刃龙 | 32400 | 1790 | — | 6 |
| 638 | Advanced: The Field's a Stage | Hunt all large monsters | Arena | 巨兽、泡狐龙、电龙、斩龙 | 27000 | 1430 | — | 6 |
| 639 | Advanced: Wrath of Rath | Hunt a Silver Rathalos and a Gold Rathian | Arena | 银火龙、金火龙 | 22800 | 1180 | — | 6 |
| 640 | Advanced: The Golden Pair | Hunt 2 Rajang | Arena | 金狮子 | 18600 | 880 | — | 6 |
| 641 | Advanced: Out of the Fry Pan | Hunt all large monsters | Arena | 恐暴龙、轰龙、迅龙 | 21600 | 1010 | — | 6 |

### 2.7 村上位 ★7（37 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 701 | Harvest Tour: Desert | Survive until time expires or deliver a Paw Pass Ticket | 沙漠 | 黄速龙王 | 12 | 0 | — | 7 |
| 702 | Harvest Tour: Ruined Pinnacle | Survive until time expires or deliver a Paw Pass Ticket | 无人山岭 | 野猪王 | 12 | 0 | — | 7 |
| 703 | Bug Appétit Encore | Hunt a Seltas | 遗迹平原 | 穿甲虫 | 1800 | 130 | — | 7 |
| 704 | Azure Azure Can Be | Hunt an Arzuros | 无人山岭 | 青熊兽、野猪王、怪鸟 | 1800 | 150 | — | 7 |
| 705 | Investment Flanking | Hunt a Giadrome | 雪山 | 白速龙王 | 1800 | 150 | — | 7 |
| 706 | Kut-Ku Misunderstood | Hunt a Yian Kut-Ku | 无人山岭 | 怪鸟、野猪王、跳狗龙王 | 2700 | 230 | — | 7 |
| 707 | Enough Monkeying Around | Hunt a Kecha Wacha | 遗迹平原 | 奇猿狐、穿甲虫、跳狗龙王 | 3300 | 270 | — | 7 |
| 708 | The Killer Rabbit of Arctic Ridge | Hunt a Lagombi | 雪山（夜） | 白兔兽、白速龙王、野猪王 | 2700 | 160 | — | 7 |
| 709 | Poisoned for Action | Hunt a Gypceros | 原生林 | 毒怪鸟 | 3300 | 270 | — | 7 |
| 710 | Spit It Out | Hunt a Tetsucabra | 古代森林 | 鬼蛙 | 3600 | 280 | — | 7 |
| 711 | Fashion Victim | Hunt a Daimyo Hermitaur | 沙漠 | 大名盾蟹 | 3600 | 280 | — | 7 |
| 713 | Research Team's First Rodeo | Hunt a Congalala | 无人山岭 | 桃毛兽王、天彗龙 | 3600 | 300 | — | 7 |
| 714 | Ruined Pinnacle, RUINED | Slay 10 Congas | 无人山岭 | 桃毛兽、桃毛兽王 | 1500 | 120 | — | 7 |
| 715 | Brave New Ore | Deliver 10 Comet Rocks | 无人山岭 | 大名盾蟹 | 2400 | 110 | — | 7 |
| 716 | Taking Royal Liberties | Hunt a Royal Ludroth | 溪流（夜） | 水兽 | 3600 | 280 | — | 7 |
| 717 | A Friend in Need | Hunt a Barroth | 沙漠 | 土砂龙 | 4200 | 320 | — | 7 |
| 718 | March of the Genprey | Slay 12 Genprey | 沙漠 | 黄速龙、黄速龙王 | 2100 | 150 | — | 7 |
| 719 | On Burrowed Time | Slay 5 Cephalos | 沙漠 | 砂龙、砂龙王 | 2400 | 160 | — | 7 |
| 720 | A Berry Dubious Idea | Deliver 10 Tropical Berries | 沙漠 | 土砂龙 | 1500 | 120 | — | 7 |
| 721 | Harvest Tour: Ancestral Steppe | Survive until time expires or deliver a Paw Pass Ticket | 遗迹平原 | 怪鸟 | 12 | 0 | — | 7 |
| 722 | Harvest Tour: Primal Forest | Survive until time expires or deliver a Paw Pass Ticket | 原生林 | 穿甲虫 | 12 | 0 | — | 7 |
| 723 | Harvest Tour: Jurassic Frontier | Survive until time expires or deliver a Paw Pass Ticket | 古代森林（夜） | 跳狗龙王 | 12 | 0 | — | 7 |
| 724 | Harvest Tour: Dunes | Survive until time expires or deliver a Paw Pass Ticket | 旧沙漠 | 砂龙王 | 12 | 0 | — | 7 |
| 725 | Harvest Tour: Verdant Hills | Survive until time expires or deliver a Paw Pass Ticket | 山林（夜） | 蓝速龙王 | 12 | 0 | — | 7 |
| 726 | Harvest Tour: Arctic Ridge | Survive until time expires or deliver a Paw Pass Ticket | 雪山（夜） | 白速龙王 | 12 | 0 | — | 7 |
| 727 | Harvest Tour: Misty Peaks | Survive until time expires or deliver a Paw Pass Ticket | 溪流（夜） | 青熊兽 | 12 | 0 | — | 7 |
| 728 | Defiant Maccao | Hunt a Great Maccao | 无人山岭 | 跳狗龙王、青熊兽、怪鸟 | 1500 | 120 | — | 7 |
| 729 | Wyvern Egg Delivery: Breakfast | Deliver 2 Wyvern Eggs | 无人山岭 | 水兽 | 2700 | 150 | — | 7 |
| 730 | Husk Hunter | Deliver 5 Burned Husks | 无人山岭 | 毒怪鸟 | 3000 | 100 | — | 7 |
| 732 | Dune the Honors | Hunt a Daimyo Hermitaur and a Barroth | 旧沙漠 | 大名盾蟹、土砂龙 | 7200 | 480 | — | 7 |
| 733 | Eau de Congalala | Hunt a Congalala | 古代森林 | 桃毛兽王、鬼蛙、毒怪鸟 | 3600 | 300 | — | 7 |
| 734 | Bag a Barroth! | Capture a Barroth | 旧沙漠 | 土砂龙、黄速龙王、砂龙王 | 6300 | 450 | — | 7 |
| 735 | Verdant Hills Horror | Hunt a Yian Kut-Ku and a Gypceros | 山林 | 怪鸟、毒怪鸟 | 5400 | 400 | — | 7 |
| 736 | Season's Eatings | Hunt 2 Arzuros | 溪流 | 青熊兽 | 3300 | 120 | — | 7 |
| 100701 | Prowler's Second Errand | Deliver 9 Tall Mushrooms | 无人山岭 | — | 1500 | 100 | — | 7 |
| 100702 | Conga Line | Slay 11 Congas | 古代森林（夜） | 桃毛兽 | 180 | 110 | — | 7 |
| 100703 | Dashing Velocidrome | Hunt a Velocidrome | 原生林 | 蓝速龙王 | 2100 | 200 | — | 7 |

### 2.8 村上位 ★8（42 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 801 | Harvest Tour: Jungle | Survive until time expires or deliver a Paw Pass Ticket | 密林 | 雌火龙 | 12 | 0 | — | 8 |
| 802 | Perfectly Normal Rock | Hunt a Basarios | 沼泽 | 岩龙 | 4500 | 320 | — | 8 |
| 803 | Dazed and Confused | Hunt a Malfestio | 无人山岭 | 夜鸟、赤甲兽、桃毛兽王 | 4500 | 320 | — | 8 |
| 804 | Bloof! | Hunt a Zamtrios | 冰海 | 变形冰鲨 | 4500 | 320 | — | 8 |
| 805 | Khezu Deserve It | Hunt a Khezu | 雪山（夜） | 白电、白兔兽、白速龙王 | 3900 | 350 | — | 8 |
| 806 | Primal Forest Arachnids | Hunt a Nerscylla | 原生林 | 影蜘蛛 | 4500 | 350 | — | 8 |
| 807 | Grapes of Rathian | Hunt a Rathian | 无人山岭 | 雌火龙 | 5100 | 350 | — | 8 |
| 808 | It's Gonna Eat Me! | Hunt a Nibelsnarf | 沙漠 | 潜口龙 | 3900 | 350 | — | 8 |
| 809 | Airship Upgrade: Plesioth | Hunt a Plesioth | 无人山岭 | 水龙 | 5100 | 350 | — | 8 |
| 810 | Whiteout | Hunt a Blangonga | 雪山（夜） | 雪狮子王、野猪王、白速龙王 | 5100 | 380 | — | 8 |
| 811 | Airship Upgrade: Lavasioth | Hunt a Lavasioth | 火山 | 熔岩龙 | 5100 | 380 | — | 8 |
| 812 | Naked Aggression | Hunt a Shogun Ceanataur | 无人山岭 | 将军镰蟹、大名盾蟹、水兽 | 5100 | 380 | — | 8 |
| 813 | The Perils of Commerce | Hunt a Najarala | 山林 | 绞蛇龙、毒怪鸟、蓝速龙王 | 7800 | 540 | — | 8 |
| 814 | Airship Upgrade: Nargacuga | Hunt a Nargacuga | 密林 | 迅龙 | 5400 | 400 | — | 8 |
| 815 | Wrong Bird, Idiots... | Hunt a Yian Garuga | 密林 | 黑狼鸟、怪鸟、桃毛兽王 | 6000 | 400 | — | 8 |
| 816 | A Trace of Light | Slay 15 Great Thunderbugs | 密林 | 大雷光虫、迅龙 | 3000 | 200 | — | 8 |
| 817 | Shell Game | Deliver 10 Beautiful Shells | 密林 | 黑狼鸟 | 2700 | 180 | — | 8 |
| 818 | It's Not Uragaan's, It's Mine! | Hunt an Uragaan | 火山 | 爆锤龙、赤甲兽、红速龙王 | 6300 | 400 | — | 8 |
| 820 | Harvest Tour: Frozen Seaway | Survive until time expires or deliver a Paw Pass Ticket | 冰海 | 鬼蛙 | 12 | 0 | — | 8 |
| 821 | Harvest Tour: Volcanic Hollow | Survive until time expires or deliver a Paw Pass Ticket | 地底火山 | 红速龙王 | 12 | 0 | — | 8 |
| 822 | Harvest Tour: Deserted Island | Survive until time expires or deliver a Paw Pass Ticket | 孤岛 | 夜鸟 | 12 | 0 | — | 8 |
| 823 | Harvest Tour: Marshlands | Survive until time expires or deliver a Paw Pass Ticket | 沼泽 | 白电 | 12 | 0 | — | 8 |
| 824 | Harvest Tour: Volcano | Survive until time expires or deliver a Paw Pass Ticket | 火山 | 熔岩龙 | 12 | 0 | — | 8 |
| 825 | Mushroom for Improvement | Deliver 10 Tall Mushrooms | 无人山岭 | 岩龙 | 2700 | 180 | — | 8 |
| 826 | I See It Rollin'... | Hunt a Volvidon | 沙漠 | 赤甲兽、潜口龙、土砂龙 | 3300 | 200 | — | 8 |
| 828 | Wyvern Egg Delivery: Lunch | Deliver 2 Wyvern Eggs | 密林 | 雌火龙 | 3600 | 220 | — | 8 |
| 829 | My New Life as a Maccao | Hunt a Kecha Wacha and a Great Maccao | 遗迹平原 | 奇猿狐、跳狗龙王 | 4500 | 310 | — | 8 |
| 830 | Much Ado about Najarala | Capture a Najarala | 原生林 | 绞蛇龙、影蜘蛛、红速龙王 | 8100 | 530 | — | 8 |
| 831 | A Seaway Just for You | Hunt a Khezu | 冰海 | 白电、变形冰鲨、白速龙王 | 3900 | 350 | — | 8 |
| 832 | A Cure for Laziness | Hunt an Uragaan | 地底火山 | 爆锤龙 | 6300 | 400 | — | 8 |
| 833 | The Furtilizer That Time Furgot | Deliver 10 Immortal Moths | 古代森林（夜） | 迅龙 | 2700 | 180 | — | 8 |
| 834 | Just Deserts | Hunt a Nibelsnarf and a Cephadrome | 旧沙漠 | 潜口龙、砂龙王 | 5700 | 410 | — | 8 |
| 835 | Fishing's Lure | Deliver 3 Goldenfish | 溪流 | 水龙 | 3000 | 200 | — | 8 |
| 836 | A Royal Rumble | Capture a Rathian | 孤岛 | 雌火龙、水兽、夜鸟 | 7800 | 490 | — | 8 |
| 837 | The Way of the Nargacuga | Hunt a Nargacuga | 孤岛 | 迅龙、鬼蛙、夜鸟 | 5400 | 400 | — | 8 |
| 838 | Deserted Island Missive | Hunt a Malfestio and a Tetsucabra | 孤岛 | 夜鸟、鬼蛙 | 7500 | 480 | — | 8 |
| 839 | Marshlands Horror Story | Hunt a Shogun Ceanataur and a Congalala | 沼泽 | 将军镰蟹、桃毛兽王 | 8100 | 540 | — | 8 |
| 840 | Volcanic Vexations | Hunt a Basarios and an Iodrome | 火山 | 岩龙、红速龙王 | 6600 | 400 | — | 8 |
| 100801 | Eggcellent Surprise | Deliver 2 Herbivore Eggs | 沙漠 | — | 2100 | 200 | — | 8 |
| 100802 | Cold-Blooded Giadrome | Hunt 2 Giadrome | 雪山（夜） | 白速龙王 | 3900 | 300 | — | 8 |
| 100803 | Picturesque Pinnacle | Slay a total of 20 Konchu or Altaroth | 无人山岭 | — | 2100 | 180 | — | 8 |
| 100804 | Congalala Crestbreaker | Wound Congalala's crest | 原生林 | 桃毛兽王 | 2400 | 240 | — | 8 |

### 2.9 村上位 ★9（44 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 901 | Airship Upgrade: Barioth | Hunt a Barioth | 冰海 | 冰牙龙 | 6600 | 440 | — | 9 |
| 902 | The Fly in the Ointment | Hunt a Seltas Queen | 密林 | 重甲虫、穿甲虫 | 6600 | 480 | — | 9 |
| 903 | You're under a Rath | Hunt a Rathalos | 地底火山 | 火龙、红速龙王、鬼蛙、爆锤龙 | 6600 | 480 | — | 9 |
| 904 | Lagiacrus x Width x Height | Hunt a Lagiacrus | 密林 | 海龙、蓝速龙王、水龙、电龙 | 6600 | 480 | — | 9 |
| 905 | Whatdunnit | Hunt a Zinogre | 密林 | 雷狼龙 | 7200 | 480 | — | 9 |
| 906 | Wish upon a...Gravios? | Hunt a Gravios | 沼泽 | 铠龙、天彗龙 | 7200 | 480 | — | 9 |
| 907 | Man, Mizutsune Again? | Hunt a Mizutsune | 溪流 | 泡狐龙 | 7500 | 510 | — | 9 |
| 908 | Alas, Astalos Again | Hunt an Astalos | 山林（夜） | 电龙 | 7500 | 510 | — | 9 |
| 909 | Groan, Gammoth Again | Hunt a Gammoth | 雪山（夜） | 巨兽 | 7500 | 510 | — | 9 |
| 910 | Great, Glavenus Again | Hunt a Glavenus | 古代森林（夜） | 斩龙 | 7500 | 510 | — | 9 |
| 911 | You Had One Job | Hunt an Agnaktor and a Lavasioth | 火山 | 炎戈龙、熔岩龙 | 11100 | 700 | — | 9 |
| 913 | Earn Your Gear | Hunt a Duramboros | 沼泽 | 尾锤龙、红速龙王、影蜘蛛、电龙 | 8100 | 490 | — | 9 |
| 914 | Fearful Symmetry | Hunt a Tigrex | 沙漠 | 轰龙、砂龙王、大名盾蟹 | 8100 | 490 | — | 9 |
| 915 | Impossible Standards | Slay a Kirin | 无人山岭 | 麒麟 | 9900 | 560 | — | 9 |
| 916 | Ruined and Tarnished | Hunt a Gore Magala | 无人山岭 | 黑蚀龙 | 7500 | 490 | — | 9 |
| 917 | Rathalos Topping | Hunt a Rathalos | 无人山岭 | 火龙 | 6600 | 480 | — | 9 |
| 918 | Taming of the Zinogre | Capture a Zinogre | 无人山岭 | 雷狼龙、跳狗龙王、岩龙、海龙 | 10800 | 670 | — | 9 |
| 919 | Ore d'Oeuvres | Hunt a Gravios | 无人山岭 | 铠龙、青熊兽、将军镰蟹、泡狐龙 | 7200 | 480 | — | 9 |
| 920 | Desert Death Duel | Hunt a Glavenus | 沙漠 | 斩龙、黄速龙王、土砂龙 | 7500 | 510 | — | 9 |
| 921 | Soap Opera | Hunt a Mizutsune | 密林 | 泡狐龙、穿甲虫、雌火龙、迅龙 | 7500 | 510 | — | 9 |
| 922 | Mt. Duramboros | Capture a Duramboros | 密林 | 尾锤龙、野猪王、大名盾蟹、斩龙 | 12300 | 690 | — | 9 |
| 923 | A Jungle Just for You | Hunt a Yian Garuga and a Plesioth | 密林 | 黑狼鸟、水龙 | 10200 | 600 | — | 9 |
| 924 | Flappy Pest | Hunt an Astalos | 遗迹平原 | 电龙、奇猿狐、毒怪鸟、轰龙 | 7500 | 510 | — | 9 |
| 925 | Pheromone Moans | Capture a Seltas Queen | 原生林 | 重甲虫、穿甲虫 | 9900 | 670 | — | 9 |
| 926 | Primal Panic | Hunt a Gore Magala | 原生林 | 黑蚀龙 | 7500 | 490 | — | 9 |
| 927 | Distress Signal | Hunt 2 Nerscylla | 原生林 | 影蜘蛛 | 8100 | 560 | — | 9 |
| 928 | Snow Joke | Capture a Gammoth | 冰海 | 巨兽、白速龙王、白电、雷狼龙 | 11400 | 710 | — | 9 |
| 929 | Ruler of the Frozen Seaway | Hunt a Tigrex | 冰海 | 轰龙 | 8100 | 490 | — | 9 |
| 930 | An Ice Surprise | Hunt 2 Zamtrios | 冰海 | 变形冰鲨 | 8100 | 510 | — | 9 |
| 931 | Capture the Agnaktor | Capture an Agnaktor | 地底火山 | 炎戈龙、红速龙王、黑狼鸟、铠龙 | 10800 | 690 | — | 9 |
| 932 | Desert Double Act | Hunt a Tigrex and a Volvidon | 旧沙漠 | 轰龙、赤甲兽 | 10500 | 550 | — | 9 |
| 933 | Interruption: Eggstra Delivery | Deliver 2 Wyvern Eggs | 山林（夜） | 火龙 | 4500 | 280 | — | 9 |
| 934 | Once upon a Barioth | Capture a Barioth | 雪山 | 冰牙龙、白速龙王、白电、轰龙 | 9900 | 620 | — | 9 |
| 935 | Snowball Skirmish | Hunt a Blangonga and a Lagombi | 雪山 | 雪狮子王、白兔兽 | 7200 | 430 | — | 9 |
| 936 | Sky Tribe: Rice to the Occasion | Hunt a Lagiacrus | 孤岛 | 海龙、青熊兽、水兽、火龙 | 6600 | 480 | — | 9 |
| 937 | My Kirin for a Horse | Slay a Kirin | 古代森林 | 麒麟 | 9900 | 560 | — | 9 |
| 938 | Disaster on the Steppes | Hunt all large monsters | 遗迹平原 | 穿甲虫、奇猿狐、黑蚀龙 | 11400 | 620 | — | 9 |
| 939 | Jurassic Frontier Fracas | Hunt all large monsters | 古代森林 | 跳狗龙王、赤甲兽、迅龙 | 9300 | 500 | — | 9 |
| 940 | Just a Mirage...? | Hunt all large monsters | 旧沙漠 | 黄速龙王、土砂龙、轰龙 | 12600 | 670 | — | 9 |
| 941 | Trouble Comes in Threes | Hunt all large monsters | 火山 | 红速龙王、岩龙、铠龙 | 13200 | 690 | — | 9 |
| 100901 | Innocent Curiosity | Slay 13 Great Thunderbugs | 地底火山 | 大雷光虫 | 2400 | 220 | — | 9 |
| 100902 | A Poison Paradise | Hunt a Volvidon and an Iodrome | 火山 | 赤甲兽、红速龙王 | 6000 | 340 | — | 9 |
| 100903 | Lucky Dunes Cat | Earn 1800 Wycademy Points | 旧沙漠 | 土砂龙 | 2100 | 200 | — | 9 |
| 100904 | Basarios Chestbreaker | Wound Basarios's chest | 沼泽 | 岩龙 | 3000 | 260 | — | 9 |

### 2.10 村上位 ★10（35 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 1001 | Thousand-Blade Brouhaha | Hunt a Seregios | 沙漠 | 千刃龙 | 8100 | 600 | — | 10 |
| 1002 | Duel With the Devil | Hunt a Diablos | 沙漠 | 角龙 | 8100 | 490 | — | 10 |
| 1003 | Bad Hair Day: Brachydios | Hunt a Brachydios | 地底火山 | 碎龙 | 8700 | 600 | — | 10 |
| 1004 | Wheel of Time | Slay a Shagaru Magala | Sanctuary | 天廻龙 | 10800 | 640 | — | 10 |
| 1005 | Beware the Comet of Disaster | Slay a Valstrax | 无人山岭 | 天彗龙 | 10800 | 640 | — | 10 |
| 1006 | Roar of the Rajang | Hunt a Rajang | 沙漠 | 金狮子 | 10200 | 550 | — | 10 |
| 1007 | Deviljho Food Cake | Hunt a Deviljho | 雪山 | 恐暴龙 | 10200 | 550 | — | 10 |
| 1017 | King of Hellfire | Slay an Akantor | Ingle Isle | 霸龙 | 13200 | 800 | — | 10 |
| 1018 | The Seat of a God | Slay an Ukanlos | Polar Field | 崩龙 | 13200 | 800 | — | 10 |
| 1019 | Stormlord | Slay an Amatsu | Sacred Pinnacle | 岚龙 | 13200 | 800 | — | 10 |
| 1020 | An Almost-Certainly-Fine Comet | Slay a Valstrax or repel it | 古代森林 | 天彗龙 | 10800 | 640 | — | 10 |
| 1021 | Turn That Frown Upside Down | Slay a Valstrax or repel it | 冰海 | 天彗龙 | 10800 | 640 | — | 10 |
| 1022 | The Baleful Comet | Slay a Valstrax or repel it | 沙漠 | 天彗龙 | 10800 | 640 | — | 10 |
| 1026 | Grave Peril | Slay a Nakarkos | Wyvern's End | 骸龙 | 15000 | 960 | — | 10 |
| 1031 | Deviljho Dispossession | Hunt a Deviljho | 无人山岭 | 恐暴龙、青熊兽、岩龙、泡狐龙 | 10200 | 550 | — | 10 |
| 1032 | Red Dragon, Green Dragon | Hunt a Rathalos and a Rathian | 遗迹平原 | 雌火龙、火龙 | 10800 | 660 | — | 10 |
| 1033 | Primal Panic | Hunt a Rajang | 原生林 | 金狮子、奇猿狐、影蜘蛛、铠龙 | 10200 | 550 | — | 10 |
| 1034 | A Cure for Idleness | Capture a Seregios | 地底火山 | 千刃龙、红速龙王、鬼蛙、爆锤龙 | 12300 | 840 | — | 10 |
| 1035 | Bring Me My Sword | Hunt 2 Gravios | 地底火山 | 铠龙 | 13200 | 770 | — | 10 |
| 1036 | Horned and Dangerous | Capture a Diablos | 旧沙漠 | 角龙、黄速龙王、土砂龙、轰龙 | 12300 | 690 | — | 10 |
| 1037 | Barioth's Blizzard | Hunt 2 Barioth | 雪山（夜） | 冰牙龙 | 12000 | 700 | — | 10 |
| 1038 | Bag a Brachydios | Capture a Brachydios | 火山 | 碎龙、红速龙王、赤甲兽、炎戈龙 | 13200 | 840 | — | 10 |
| 1039 | Blazing Black of a Dark God | Slay an Alatreon | Ingle Isle | 煌黑龙 | 15000 | 1200 | — | 10 |
| 1046 | Coalition of Chaos | Hunt all large monsters | 密林 | 毒怪鸟、雌火龙、黑狼鸟 | 13200 | 710 | — | 10 |
| 1047 | Verdant Hills Just for You | Hunt all large monsters | 山林 | 蓝速龙王、怪鸟、火龙 | 9900 | 580 | — | 10 |
| 1048 | Misty Peaks Missive | Hunt all large monsters | 溪流 | 水兽、水龙、尾锤龙 | 15300 | 780 | — | 10 |
| 1049 | Deserted Islands Horror | Hunt all large monsters | 孤岛 | 夜鸟、海龙、雷狼龙 | 16500 | 900 | — | 10 |
| 1050 | The Marshlands Morass | Hunt all large monsters | 沼泽 | 桃毛兽王、影蜘蛛、绞蛇龙 | 12300 | 720 | — | 10 |
| 1053 | Beware the Comet of Disaster | Slay a Valstrax or repel it | 无人山岭 | 天彗龙 | 10800 | 640 | — | 10 |
| 1054 | Wyvern Egg Delivery: Dinner | Deliver 2 Herbivore Eggs | 沙漠 | 恐暴龙 | 6000 | 320 | — | 10 |
| 101001 | Lucky Hills Cat | Earn 1800 Wycademy Points | 山林（夜） | 绞蛇龙 | 3000 | 230 | — | 10 |
| 101002 | Ludroth Lunacy | Slay 10 Ludroth | 孤岛 | 水生兽、水龙 | 2700 | 240 | — | 10 |
| 101003 | Duramboros Humpbreaker | Wound Duramboros's hump | 密林 | 尾锤龙 | 3600 | 390 | — | 10 |
| 101004 | Snow Festival | Hunt a Giadrome and a Lagombi | 冰海 | 白速龙王、白兔兽、冰牙龙 | 5400 | 380 | — | 10 |
| 101005 | Drome Rush! | Hunt all large monsters | Arena | 蓝速龙王、黄速龙王、白速龙王、红速龙王 | 9000 | 500 | — | 10 |

## 3. 村G 级

### 3.10 村G 级 ★10（16 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 1009 | Advanced: Steel Yourself | Slay a Kushala Daora or repel it | 密林 | 钢龙 | 18000 | 1200 | — | 10 |
| 1011 | Advanced: Empire of the Sun | Slay a Teostra or repel it | 沙漠 | 炎王龙 | 18000 | 1200 | — | 10 |
| 1012 | Advanced: Wrong One Silver | Hunt a Silver Rathalos | 山林 | 银火龙 | 18900 | 1110 | — | 10 |
| 1013 | Advanced: Heart of Gold | Hunt a Gold Rathian | 溪流 | 金火龙 | 18900 | 1110 | — | 10 |
| 1027 | Advanced: Monster Hunter! | Hunt all large monsters | Arena | 火龙、轰龙、迅龙、金狮子 | 41100 | 2010 | — | 10 |
| 1028 | Advanced: Proof of a Champion | Hunt all large monsters | Arena | 海龙（狞猛）、碎龙、火龙（狞猛） | 36900 | 1820 | — | 10 |
| 1029 | Advanced: Wycademy Challenge | Hunt all large monsters | Sanctuary | 雷狼龙（狞猛）、激昂金狮子、天廻龙 | 44400 | 2020 | — | 10 |
| 1030 | Advanced: Guild's Greatest Hit | Hunt all large monsters | Arena | 角龙（狞猛）、千刃龙（狞猛）、恐暴龙（狞猛） | 44700 | 2060 | — | 10 |
| 1040 | Advanced: Ranging Rathalos | Hunt a Rathalos | 山林 | 火龙、毒怪鸟、绞蛇龙、恐暴龙 | 9900 | 710 | — | 10 |
| 1041 | Advanced: Roaring in the Ridge | Hunt a Tigrex | 雪山（夜） | 轰龙、白电、冰牙龙、恐暴龙 | 12300 | 740 | — | 10 |
| 1042 | Advanced: Moonlight Zinogre | Hunt a Zinogre | 溪流（夜） | 雷狼龙、水兽、迅龙、恐暴龙 | 10800 | 710 | — | 10 |
| 1044 | Advanced: Trial at the Pinnacle | Hunt a Silver Rathalos and a Gold Rathian | 无人山岭 | 银火龙、金火龙 | 34200 | 1110 | — | 10 |
| 1045 | Advanced: Karma Chameleos | Slay a Chameleos or repel it | 无人山岭 | 霞龙 | 18000 | 1200 | — | 10 |
| 1051 | Advanced: Jurassic Pair | Hunt all large monsters | 古代森林（夜） | 黑狼鸟、斩龙 | 18600 | 950 | — | 10 |
| 1052 | Advanced: Quarrel Quelling | Hunt all large monsters | 雪山 | 白兔兽、冰牙龙 | 12600 | 620 | — | 10 |
| 1055 | Advanced: Ultimate Generation | Hunt all large monsters | Forlorn Arena | 斩龙（狞猛）、电龙（狞猛）、泡狐龙（狞猛）、巨兽（狞猛）、天彗龙 | 56100 | 2760 | — | 10 |

## 4. 集会所下位

### 4.1 集会所下位 ★1（31 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10101 | Harvest Tour: Jurassic Frontier | Survive until time expires or deliver a Paw Pass Ticket | 古代森林 | 跳狗龙王 | 12 | 0 | — | 1 |
| 10102 | Harvest Tour: Dunes | Survive until time expires or deliver a Paw Pass Ticket | 旧沙漠 | 黄速龙王 | 12 | 0 | — | 1 |
| 10103 | Harvest Tour: Verdant Hills | Survive until time expires or deliver a Paw Pass Ticket | 山林 | 蓝速龙王 | 12 | 0 | — | 1 |
| 10104 | Harvest Tour: Arctic Ridge | Survive until time expires or deliver a Paw Pass Ticket | 雪山 | 野猪王 | 12 | 0 | — | 1 |
| 10105 | Harvest Tour: Misty Peaks | Survive until time expires or deliver a Paw Pass Ticket | 溪流 | 青熊兽 | 12 | 0 | — | 1 |
| 10106 | Boot to the Head | Hunt a Great Maccao | 古代森林（夜） | 跳狗龙王 | 1800 | 100 | — | 1 |
| 10107 | Tackling the Tetsucabra | Hunt a Tetsucabra | 古代森林 | 鬼蛙 | 4200 | 250 | — | 1 |
| 10108 | Lost in the Jurassic Frontier | Hunt a Gypceros | 古代森林 | 毒怪鸟 | 3600 | 240 | — | 1 |
| 10109 | Red-Faced Ruffians | Slay 20 Maccao | 古代森林 | 跳狗龙、跳狗龙王 | 1800 | 90 | — | 1 |
| 10110 | A Fern is Forever | Deliver 20 Unique Ferns | 古代森林（夜） | 鬼蛙 | 1200 | 90 | — | 1 |
| 10111 | Gendrome Roadblock | Hunt a Gendrome | 旧沙漠 | 黄速龙王 | 2100 | 130 | — | 1 |
| 10112 | In Pursuit of the Sand Wyvern | Hunt a Cephadrome | 旧沙漠 | 砂龙王、黄速龙王 | 2700 | 140 | — | 1 |
| 10113 | Shells of Steel | Hunt a Daimyo Hermitaur | 旧沙漠 | 大名盾蟹、黄速龙王 | 4200 | 250 | — | 1 |
| 10114 | Hermitaur Party | Slay 20 Hermitaurs | 旧沙漠 | 盾蟹、大名盾蟹 | 2400 | 90 | — | 1 |
| 10115 | Ingredient Hunter | Deliver 20 Tropical Berries | 旧沙漠 | 砂龙王 | 1200 | 90 | — | 1 |
| 10116 | Hunt Down the Velocidrome! | Hunt a Velocidrome | 山林（夜） | 蓝速龙王 | 1800 | 100 | — | 1 |
| 10117 | Local Threat | Hunt a Yian Kut-Ku | 山林（夜） | 怪鸟 | 3000 | 200 | — | 1 |
| 10118 | Financial Focus on Fungus | Deliver 20 Unique Mushrooms | 山林 | 毒怪鸟 | 1200 | 90 | — | 1 |
| 10119 | Farming Frustrations | Slay 20 Velociprey | 山林 | 蓝速龙、蓝速龙王 | 1800 | 90 | — | 1 |
| 10120 | Snow with Occasional Lagombi | Hunt a Lagombi | 雪山（夜） | 白兔兽 | 3000 | 140 | — | 1 |
| 10121 | Preying on Giaprey | Slay 20 Giaprey | 雪山 | 白速龙、野猪王 | 1800 | 90 | — | 1 |
| 10122 | Special Home Brew | Deliver 20 Mountain Herbs | 雪山 | 白兔兽 | 1200 | 90 | — | 1 |
| 10123 | Bulldrome of the Peaks | Hunt a Bulldrome | 溪流 | 野猪王 | 2100 | 120 | — | 1 |
| 10124 | The Ingredient of Legend | Hunt an Arzuros | 溪流（夜） | 青熊兽 | 2100 | 130 | — | 1 |
| 10125 | Royal Spit Take | Hunt a Royal Ludroth | 溪流 | 水兽 | 4200 | 250 | — | 1 |
| 10126 | A Mother's Woes | Slay 10 Ludroth | 溪流 | 水生兽、水兽 | 1500 | 90 | — | 1 |
| 10127 | Jaggi Junket | Slay 20 Jaggi | 溪流 | 狗龙、青熊兽 | 1800 | 90 | — | 1 |
| 10128 | The Next Best Thing | Deliver 10 Balmstone Pieces | 溪流（夜） | 水兽 | 1800 | 90 | — | 1 |
| 110101 | Dance: The Final Frontier | Slay 15 Maccao | 古代森林 | 跳狗龙 | 1200 | 90 | — | 1 |
| 110102 | Taste the Mountains | Deliver 10 Mountain Herbs | 雪山 | 白兔兽 | 900 | 90 | — | 1 |
| 110103 | Lucky Mountain Cat | Earn 1500 Wycademy Points | 溪流（夜） | — | 1800 | 120 | — | 1 |

### 4.2 集会所下位 ★2（35 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10201 | Harvest Tour: Deserted Island | Survive until time expires or deliver a Paw Pass Ticket | 孤岛 | 大名盾蟹 | 12 | 0 | — | 2 |
| 10202 | Harvest Tour: Marshlands | Survive until time expires or deliver a Paw Pass Ticket | 沼泽 | 红速龙王 | 12 | 0 | — | 2 |
| 10203 | Insomnia? Meet Hypnotism | Capture a Malfestio | 古代森林（夜） | 夜鸟 | 6300 | 340 | — | 2 |
| 10204 | Walk 'n Roll | Hunt a Volvidon | 古代森林 | 赤甲兽、跳狗龙王 | 3600 | 170 | — | 2 |
| 10205 | Rocking Rhenoplos | Slay 10 before time expires or deliver a Paw Pass Ticket | 古代森林 | 怪鸟 | 2100 | 150 | — | 2 |
| 10206 | The Desert Gourmand | Hunt a Nibelsnarf | 旧沙漠 | 潜口龙 | 4500 | 310 | — | 2 |
| 10207 | Tongue-Tied | Capture a Volvidon | 旧沙漠 | 赤甲兽、大名盾蟹、砂龙王 | 4800 | 200 | — | 2 |
| 10208 | The Poison-fanged Duo | Hunt 2 Gendrome | 旧沙漠 | 黄速龙王 | 3000 | 210 | — | 2 |
| 10209 | Konchu Collector | Slay 20 Konchu | 旧沙漠 | 盾虫、潜口龙 | 1800 | 120 | — | 2 |
| 10210 | Liver of Legend! | Deliver 8 Piscine Livers | 旧沙漠 | 砂龙王 | 2700 | 150 | — | 2 |
| 10211 | Noise Violation | Hunt a Najarala | 山林（夜） | 绞蛇龙 | 5700 | 330 | — | 2 |
| 10212 | In Search of the Yian Garuga | Hunt a Yian Garuga | 山林 | 黑狼鸟 | 6300 | 350 | — | 2 |
| 10213 | Finishing the Job | Hunt 2 Velocidrome | 山林 | 蓝速龙王 | 2700 | 160 | — | 2 |
| 10214 | Fresh is Best | Slay 20 Bullfango | 山林（夜） | 野猪、蓝速龙王 | 2100 | 120 | — | 2 |
| 10215 | The Shadow in the Mountains | Hunt a Khezu | 雪山（夜） | 白电 | 4500 | 310 | — | 2 |
| 10216 | The New Tenant | Hunt a Blangonga | 雪山 | 雪狮子王 | 5400 | 330 | — | 2 |
| 10217 | Blango Slaying Tactics | Slay 20 Blangos | 雪山 | 雪狮子、野猪王 | 2700 | 120 | — | 2 |
| 10218 | Operation: Secure Specimen | Capture a Nargacuga | 溪流 | 迅龙 | 7500 | 420 | — | 2 |
| 10219 | Royal Assassination | Hunt a Rathian | 溪流 | 雌火龙 | 5400 | 310 | — | 2 |
| 10220 | Ahoy! Royal Ludroth! | Hunt 2 Royal Ludroth | 溪流 | 水兽 | 6000 | 400 | — | 2 |
| 10221 | Bye Bye Jaggia | Slay 20 Jaggia | 溪流（夜） | 雌狗龙、迅龙 | 2100 | 120 | — | 2 |
| 10222 | Malfestio Festival | Hunt a Malfestio | 孤岛 | 夜鸟 | 4800 | 280 | — | 2 |
| 10223 | Wyvern of the Wind | Hunt a Nargacuga | 孤岛 | 迅龙 | 5700 | 350 | — | 2 |
| 10224 | Tetsucabra Bounty | Hunt a Tetsucabra | 孤岛 | 鬼蛙 | 4200 | 250 | — | 2 |
| 10225 | Deserted Island Dustup | Hunt 2 Arzuros | 孤岛 | 青熊兽 | 3000 | 210 | — | 2 |
| 10226 | Bnahabra Bloodbath | Slay 50 Bnahabra | 孤岛 | 飞甲虫、水兽 | 3600 | 150 | — | 2 |
| 10227 | Poisonous Pest | Hunt an Iodrome | 沼泽 | 红速龙王 | 3000 | 160 | — | 2 |
| 10228 | Pincer through the Sky | Hunt a Shogun Ceanataur | 沼泽 | 将军镰蟹 | 5400 | 330 | — | 2 |
| 10229 | Serpentine Samba | Hunt a Najarala | 沼泽 | 绞蛇龙、红速龙王、野猪王 | 5700 | 330 | — | 2 |
| 10230 | Ioprey Hunting | Slay 20 Ioprey | 沼泽 | 红速龙、毒怪鸟 | 1800 | 120 | — | 2 |
| 10231 | Attack of the Giant Bugs! | Slay 50 Vespoid | 沼泽 | 巨蜂、绞蛇龙 | 3600 | 150 | — | 2 |
| 10232 | Collect to Combine | Deliver 20 Unique Mushrooms | 沼泽 | 怪鸟 | 1500 | 120 | — | 2 |
| 110201 | Running with the Night | Slay 15 Rhenoplos | 古代森林（夜） | 硬甲龙 | 1500 | 120 | — | 2 |
| 110202 | A Cricket to Love | Deliver 5 Silver Crickets | 孤岛 | 青熊兽 | 1200 | 120 | — | 2 |
| 110203 | A Resplendent Dance | Hunt a Great Maccao | 古代森林 | 跳狗龙王 | 2100 | 160 | — | 2 |

### 4.3 集会所下位 ★3（38 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10301 | Harvest Tour: Volcano | Survive until time expires or deliver a Paw Pass Ticket | 火山 | 赤甲兽 | 12 | 0 | — | 3 |
| 10302 | Flames of Glavenus Passion | Hunt a Glavenus | 古代森林（夜） | 斩龙 | 8700 | 450 | — | 3 |
| 10303 | Tigrex by the Tail | Hunt a Tigrex | 古代森林（夜） | 轰龙、跳狗龙王 | 9000 | 430 | — | 3 |
| 10304 | Dark Wings, Dark Work | Hunt a Gore Magala | 古代森林 | 黑蚀龙 | 8400 | 430 | — | 3 |
| 10305 | Fossilized Memories | Deliver 3 Eternal Fossils | 古代森林 | 火龙 | 6000 | 350 | — | 3 |
| 10306 | A Thousand Scales of Dread | Hunt a Seregios | 旧沙漠 | 千刃龙 | 9000 | 520 | — | 3 |
| 10307 | A Shocking Scoundrel | Hunt an Astalos | 山林（夜） | 电龙 | 8700 | 450 | — | 3 |
| 10308 | The King's Domain | Hunt a Rathalos | 山林 | 火龙、蓝速龙王 | 7500 | 420 | — | 3 |
| 10309 | Fury Run Afoul | Hunt a Gammoth | 雪山（夜） | 巨兽 | 8700 | 450 | — | 3 |
| 10310 | Lagiacrus Lethargy | Hunt a Lagiacrus | 溪流 | 海龙 | 7500 | 420 | — | 3 |
| 10311 | Moonlit Bubble Bath | Hunt a Mizutsune | 溪流（夜） | 泡狐龙 | 8700 | 450 | — | 3 |
| 10312 | Topple the Monarch | Hunt a Zinogre | 溪流 | 雷狼龙、野猪王 | 8100 | 420 | — | 3 |
| 10313 | Lagiacrushed | Hunt a Lagiacrus | 孤岛 | 海龙、青熊兽 | 7500 | 420 | — | 3 |
| 10314 | Tuff Turf | Capture a Zinogre | 孤岛 | 雷狼龙 | 10800 | 500 | — | 3 |
| 10315 | Isle About that Bass | Hunt a Brachydios | 孤岛 | 碎龙 | 9000 | 520 | — | 3 |
| 10316 | Heaven and Earth | Hunt a Rathalos and a Rathian | 孤岛 | 火龙、雌火龙 | 9300 | 580 | — | 3 |
| 10317 | Fro Shizzle | Hunt an Astalos | 沼泽 | 电龙 | 8700 | 450 | — | 3 |
| 10318 | Bladed Glavenus | Capture a Glavenus | 火山 | 斩龙 | 11400 | 540 | — | 3 |
| 10319 | Fight or Uragaan! | Hunt an Uragaan | 火山 | 爆锤龙、红速龙王 | 6900 | 350 | — | 3 |
| 10320 | The Shogun's Encampment | Hunt 2 Shogun Ceanataurs | 火山 | 将军镰蟹 | 7800 | 530 | — | 3 |
| 10321 | Crustacean Infestation | Slay 20 Ceanataurs | 火山 | 镰蟹、爆锤龙 | 4500 | 200 | — | 3 |
| 10322 | Scavengers United | Slay a total of 20 Remobra or Uroktor | 火山 | 碎龙 | 5100 | 200 | — | 3 |
| 10323 | More Coal Please | Deliver 20 pieces of Coal | 火山 | 将军镰蟹 | 4200 | 200 | — | 3 |
| 10324 | An Early Jurassic Excursion | Hunt all large monsters | 古代森林 | 跳狗龙王、斩龙 | 7500 | 390 | — | 3 |
| 10325 | Wyvern Sand Runners | Hunt all large monsters | 旧沙漠 | 黄速龙王、千刃龙 | 7800 | 460 | — | 3 |
| 10326 | Zinogre, Bearly Fazed | Hunt all large monsters | 孤岛 | 青熊兽、雷狼龙 | 7200 | 390 | — | 3 |
| 10327 | Making it Safe for Swine | Hunt all large monsters | 沼泽 | 红速龙王、轰龙 | 8400 | 410 | — | 3 |
| 10328 | Rumble in the Volcano | Hunt all large monsters | 火山 | 赤甲兽、碎龙 | 9000 | 480 | — | 3 |
| 10329 | It's Electric | Slay a Kirin | 古代森林 | 麒麟 | 10200 | 490 | — | 3 |
| 10330 | The White Brute | Slay a Kirin | 雪山（夜） | 麒麟 | 10200 | 490 | — | 3 |
| 10331 | The Frozen Dictator | Slay a Kushala Daora or repel it | 雪山（夜） | 钢龙 | 12900 | 700 | — | 3 |
| 10332 | The Elder Dragon of Mist | Slay a Chameleos or repel it | 山林 | 霞龙 | 12900 | 700 | — | 3 |
| 10333 | Emperor of Flame | Slay a Teostra or repel it | 火山 | 炎王龙 | 12900 | 700 | — | 3 |
| 10334 | Stop the Wheel | Slay a Shagaru Magala | Sanctuary | 天廻龙 | 11100 | 560 | — | 3 |
| 10335 | Two-headed Carcass | Repel Nakarkos | Wyvern's End | 骸龙 | 15000 | 840 | HR3 | 3 |
| 110301 | Hot Scales & Sharp Pincers | Slay a total of 15 Ceanataurs or Uroktor | 火山 | 红速龙王 | 3000 | 200 | — | 3 |
| 110302 | There's Always Room for Fish | Deliver 4 Goldenfish | 沼泽 | 怪鸟 | 3000 | 220 | — | 3 |
| 110303 | Out of the Frying Pan | Hunt all large monsters | Arena | 野猪王、青熊兽 | 3600 | 250 | — | 3 |

## 5. 集会所上位

### 5.4 集会所上位 ★4（38 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10401 | Harvest Tour: A. Steppe | Survive until time expires or deliver a Paw Pass Ticket | 遗迹平原 | 奇猿狐 | 12 | 0 | HR4 | 4 |
| 10402 | Harvest Tour: Primal Forest | Survive until time expires or deliver a Paw Pass Ticket | 原生林 | 黄速龙王 | 12 | 0 | HR4 | 4 |
| 10403 | Harvest Tour: Jurassic Frontier | Survive until time expires or deliver a Paw Pass Ticket | 古代森林（夜） | 怪鸟 | 12 | 0 | HR4 | 4 |
| 10404 | Harvest Tour: Dunes | Survive until time expires or deliver a Paw Pass Ticket | 旧沙漠 | 砂龙王 | 12 | 0 | HR4 | 4 |
| 10405 | Harvest Tour: Verdant Hills | Survive until time expires or deliver a Paw Pass Ticket | 山林（夜） | 毒怪鸟 | 12 | 0 | HR4 | 4 |
| 10406 | Harvest Tour: Arctic Ridge | Survive until time expires or deliver a Paw Pass Ticket | 雪山（夜） | 白兔兽 | 12 | 0 | HR4 | 4 |
| 10407 | Harvest Tour: Misty Peaks | Survive until time expires or deliver a Paw Pass Ticket | 溪流（夜） | 水兽 | 12 | 0 | HR4 | 4 |
| 10408 | Swing into Action | Hunt a Kecha Wacha | 遗迹平原 | 奇猿狐、跳狗龙王、恐暴龙 | 5100 | 330 | HR4 | 4 |
| 10409 | Ruining the Ruins | Hunt a Yian Kut-Ku | 遗迹平原 | 怪鸟、跳狗龙王、恐暴龙 | 4200 | 280 | HR4 | 4 |
| 10410 | Bag the Bounding Bandit | Capture a Great Maccao | 遗迹平原 | 跳狗龙王 | 3600 | 170 | HR4 | 4 |
| 10411 | Jaggi of the Steppe | Slay a total of 20 Jaggia or Jaggi | 遗迹平原 | 奇猿狐 | 2700 | 120 | HR4 | 4 |
| 10412 | Ancestral Steppe Fungus Run | Deliver 20 Unique Mushrooms | 遗迹平原 | 穿甲虫 | 2100 | 120 | HR4 | 4 |
| 10413 | Bug Appétit | Hunt a Seltas | 原生林 | 穿甲虫、蓝速龙王、恐暴龙 | 3000 | 160 | HR4 | 4 |
| 10414 | Gendrome Roadblock | Hunt a Gendrome | 原生林 | 黄速龙王 | 3000 | 180 | HR4 | 4 |
| 10415 | Lost in the Primal Forest | Hunt a Gypceros | 原生林 | 毒怪鸟、黄速龙王、蓝速龙王、恐暴龙 | 5100 | 330 | HR4 | 4 |
| 10416 | Hunt Down the Velocidrome! | Hunt a Velocidrome | 原生林 | 蓝速龙王 | 2700 | 140 | HR4 | 4 |
| 10417 | Poison Paralysis Pinch | Slay a total of 20 Ioprey or Genprey | 原生林 | 恐暴龙 | 2700 | 120 | HR4 | 4 |
| 10418 | Crystal Bone Collector | Deliver 10 Crystal Bones | 原生林 | 黄速龙王、恐暴龙 | 2400 | 120 | HR4 | 4 |
| 10419 | Hair of the Dog | Deliver 10 Slagtoth Oils | 原生林 | 穿甲虫 | 2700 | 120 | HR4 | 4 |
| 10420 | Tackling the Tetsucabra | Hunt a Tetsucabra | 古代森林（夜） | 鬼蛙、怪鸟、穿甲虫、恐暴龙 | 6000 | 350 | HR4 | 4 |
| 10421 | So Notable: Great Maccao | Hunt 2 Great Maccao | 古代森林 | 跳狗龙王 | 3900 | 220 | HR4 | 4 |
| 10422 | The Land Sharq | Hunt a Cephadrome | 旧沙漠 | 砂龙王、黄速龙王、恐暴龙 | 3900 | 200 | HR4 | 4 |
| 10423 | Shells of Steel | Hunt a Daimyo Hermitaur | 旧沙漠 | 大名盾蟹、黄速龙王、恐暴龙 | 6000 | 350 | HR4 | 4 |
| 10424 | Birds of a Feather | Hunt a Yian Kut-Ku and a Gypceros | 山林（夜） | 怪鸟、毒怪鸟 | 6600 | 490 | HR4 | 4 |
| 10425 | Bullfango Brigade | Slay 20 Bullfango | 山林 | 野猪、毒怪鸟 | 3000 | 120 | HR4 | 4 |
| 10426 | Delicious White Livers | Deliver 3 White Livers | 山林 | 怪鸟 | 2100 | 120 | HR4 | 4 |
| 10427 | The Bulldrome Charges | Hunt a Bulldrome | 雪山（夜） | 野猪王 | 3000 | 160 | HR4 | 4 |
| 10428 | Snow with Occasional Lagombi | Hunt a Lagombi | 雪山 | 白兔兽、野猪王、恐暴龙 | 4200 | 200 | HR4 | 4 |
| 10429 | Arzuros Encroaches | Hunt an Arzuros | 溪流 | 青熊兽、野猪王、恐暴龙 | 3000 | 180 | HR4 | 4 |
| 10430 | Royal Spit Take | Hunt a Royal Ludroth | 溪流（夜） | 水兽、野猪王、青熊兽、恐暴龙 | 6000 | 350 | HR4 | 4 |
| 10431 | Netting Neopterons | Slay 50 Bnahabra | 溪流（夜） | 飞甲虫、青熊兽、恐暴龙 | 4500 | 160 | HR4 | 4 |
| 10432 | Clash of Rivals | Slay a total of 30 Bullfango or Rhenoplos | F. Slayground | — | 4500 | 150 | HR4 | 4 |
| 10433 | A Powerful Team | Hunt all large monsters | Arena | 蓝速龙王、跳狗龙王、穿甲虫、野猪王、黄速龙王 | 10200 | 550 | HR4 | 4 |
| 10434 | Enter the Giadrome | Hunt a Giadrome | 雪山 | 白速龙王 | 3000 | 180 | HR4 | 4 |
| 110401 | The Grandmeowster's Trials | Slay 15 Konchu | 遗迹平原 | 盾虫 | 1500 | 120 | HR4 | 4 |
| 110402 | We Cat All Be Heroes | Hunt a Seltas | 遗迹平原 | 穿甲虫 | 3000 | 200 | HR4 | 4 |
| 110403 | Fois Gras Faux Pas | Deliver 12 Piscine Livers | 旧沙漠 | 砂龙王 | 3600 | 150 | HR4 | 4 |
| 110404 | Splash in the Moonlight | Slay 15 Ludroth | 溪流 | 水生兽、水兽 | 3600 | 120 | HR4 | 4 |

### 5.5 集会所上位 ★5（51 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10501 | Harvest Tour: Frozen Seaway | Survive until time expires or deliver a Paw Pass Ticket | 冰海 | 鬼蛙 | 12 | 0 | HR4 | 5 |
| 10502 | Harvest Tour: Volcanic Hollow | Survive until time expires or deliver a Paw Pass Ticket | 地底火山 | 红速龙王 | 12 | 0 | HR4 | 5 |
| 10503 | Harvest Tour: Deserted Island | Survive until time expires or deliver a Paw Pass Ticket | 孤岛 | 水兽 | 12 | 0 | HR4 | 5 |
| 10504 | Harvest Tour: Marshlands | Survive until time expires or deliver a Paw Pass Ticket | 沼泽 | 白电 | 12 | 0 | HR4 | 5 |
| 10505 | Harvest Tour: Volcano | Survive until time expires or deliver a Paw Pass Ticket | 火山 | 将军镰蟹 | 12 | 0 | HR4 | 5 |
| 10506 | So Notable: Kecha Wacha | Hunt 2 Kecha Wacha | 遗迹平原 | 奇猿狐 | 7200 | 530 | HR4 | 5 |
| 10507 | Ancestral Steppe Accounting | Earn 4000 Wycademy Points | 遗迹平原 | 奇猿狐、雌火龙、恐暴龙 | 6000 | 300 | HR4 | 5 |
| 10508 | Dragon Lady | Hunt a Rathian | 原生林 | 雌火龙、毒怪鸟、夜鸟、恐暴龙 | 7500 | 430 | HR4 | 5 |
| 10509 | The Ioprey Leader | Hunt an Iodrome | 原生林 | 红速龙王 | 4200 | 220 | HR4 | 5 |
| 10510 | The Intelligent Malfestio | Hunt a Malfestio | 原生林 | 夜鸟、毒怪鸟、黄速龙王、恐暴龙 | 6900 | 400 | HR4 | 5 |
| 10511 | Serpentine Samba | Hunt a Najarala | 原生林 | 绞蛇龙、毒怪鸟、红速龙王、恐暴龙 | 8100 | 470 | HR4 | 5 |
| 10512 | Spotted Beauty | Hunt 2 Gendrome | 原生林 | 黄速龙王 | 4200 | 290 | HR4 | 5 |
| 10513 | Primal Forest Accounting | Earn 4000 Wycademy Points | 原生林 | 夜鸟、毒怪鸟、恐暴龙 | 6000 | 300 | HR4 | 5 |
| 10514 | Fin Finder | Hunt a Zamtrios | 冰海 | 变形冰鲨、白电、白兔兽、恐暴龙 | 6900 | 400 | HR4 | 5 |
| 10515 | The Walls Have Eyes | Hunt a Khezu | 冰海 | 白电、鬼蛙、变形冰鲨、恐暴龙 | 6300 | 430 | HR4 | 5 |
| 10516 | Must Love Lagombi | Hunt 2 Lagombi | 冰海 | 白兔兽 | 6000 | 320 | HR4 | 5 |
| 10517 | Zamite Fight | Slay 20 Zamite | 冰海 | 变形幼冰鲨、鬼蛙 | 4500 | 180 | HR4 | 5 |
| 10518 | Stone-cold Stones | Deliver 10 Bloodstones | 冰海 | 变形冰鲨 | 3000 | 180 | HR4 | 5 |
| 10519 | Liver and Let Die | Deliver 5 Monster Guts | 冰海 | 变形冰鲨 | 3600 | 180 | HR4 | 5 |
| 10520 | Fight or Uragaan! | Hunt an Uragaan | 地底火山 | 爆锤龙、红速龙王、鬼蛙、恐暴龙 | 9600 | 500 | HR4 | 5 |
| 10521 | Worst. Trip. Ever! | Hunt a Yian Garuga | 地底火山 | 黑狼鸟、红速龙王、恐暴龙 | 9000 | 500 | HR4 | 5 |
| 10522 | Tetsucabra Bounty | Hunt a Tetsucabra | 地底火山 | 鬼蛙、红速龙王、恐暴龙 | 6000 | 350 | HR4 | 5 |
| 10523 | Close Coal | Deliver 20 pieces of Coal | 地底火山 | 黑狼鸟 | 4200 | 200 | HR4 | 5 |
| 10524 | Nargacuga Throwdown | Hunt a Nargacuga | 古代森林（夜） | 迅龙、黑狼鸟、恐暴龙 | 8100 | 500 | HR4 | 5 |
| 10525 | Insomnia? Meet Hypnotism x 2 | Hunt 2 Malfestio | 古代森林 | 夜鸟 | 9900 | 640 | HR4 | 5 |
| 10526 | The Desert Gourmand | Hunt a Nibelsnarf | 旧沙漠 | 潜口龙、赤甲兽、恐暴龙 | 6300 | 430 | HR4 | 5 |
| 10527 | Line in the Sand | Hunt 2 Cephadrome | 旧沙漠 | 砂龙王 | 5700 | 320 | HR4 | 5 |
| 10528 | Wrath of the Rathian | Capture a Rathian | 山林（夜） | 雌火龙、黑狼鸟、毒怪鸟、恐暴龙 | 9900 | 520 | HR4 | 5 |
| 10529 | Twin Velocidrome | Hunt 2 Velocidrome | 山林 | 蓝速龙王 | 3900 | 220 | HR4 | 5 |
| 10530 | The New Tenant | Hunt a Blangonga | 雪山 | 雪狮子王、野猪王、白兔兽、恐暴龙 | 7500 | 470 | HR4 | 5 |
| 10531 | A Plesioth in the Misty Peaks | Hunt a Plesioth | 溪流（夜） | 水龙、水兽、恐暴龙 | 7500 | 430 | HR4 | 5 |
| 10532 | Awful Guest | Hunt a Plesioth | 孤岛 | 水龙 | 7500 | 430 | HR4 | 5 |
| 10533 | Poisonous Pair | Hunt 2 Iodrome | 沼泽 | 红速龙王 | 6000 | 350 | HR4 | 5 |
| 10534 | Attack of the Giant Bugs! | Slay 50 Vespoid | 沼泽 | 巨蜂、雌火龙、恐暴龙 | 5100 | 250 | HR4 | 5 |
| 10535 | You Caught This? I Caught This | Hunt a Lavasioth | 火山 | 熔岩龙、红速龙王、赤甲兽、恐暴龙 | 7500 | 470 | HR4 | 5 |
| 10536 | Tumbling Troublemaker | Hunt a Volvidon | 火山 | 赤甲兽、熔岩龙、将军镰蟹、恐暴龙 | 5100 | 240 | HR4 | 5 |
| 10537 | Shogun in the Flames | Hunt a Shogun Ceanataur | 火山 | 将军镰蟹、爆锤龙、赤甲兽、恐暴龙 | 7500 | 470 | HR4 | 5 |
| 10538 | The Most Dangerous Game | Slay 30 Konchu | Arena | 盾虫、赤甲兽 | 3900 | 220 | HR4 | 5 |
| 10539 | Status: Effected | Hunt all large monsters | 古代森林（夜） | 赤甲兽、夜鸟、黑狼鸟 | 14700 | 800 | HR4 | 5 |
| 10540 | Desert Brawlers | Hunt all large monsters | 旧沙漠 | 大名盾蟹、雌火龙、潜口龙 | 13800 | 850 | HR4 | 5 |
| 10541 | The Hunter Games | Hunt all large monsters | F. Slayground | 白电、爆锤龙、将军镰蟹 | 16500 | 980 | HR4 | 5 |
| 10542 | Hunt, Sweat, and Tears | Hunt all large monsters | Arena | 砂龙王、青熊兽、红速龙王、白兔兽、赤甲兽 | 14400 | 730 | HR4 | 5 |
| 10543 | Pink Stink | Hunt a Congalala | 原生林 | 桃毛兽王 | 6000 | 370 | HR4 | 5 |
| 10544 | Brute of the Sands | Hunt a Barroth | 旧沙漠 | 土砂龙 | 6300 | 400 | HR4 | 5 |
| 10545 | Disruptive Eruption | Hunt a Basarios | 火山 | 岩龙 | 6900 | 400 | HR4 | 5 |
| 10546 | Web Sighting | Hunt a Nerscylla | 沼泽 | 影蜘蛛 | 7200 | 430 | HR4 | 5 |
| 110501 | Calm, Cool, and Collected | Slay 15 Zamite | 冰海 | 变形幼冰鲨、变形冰鲨 | 4500 | 180 | HR4 | 5 |
| 110502 | Kecha Wacha Earbreaker | Wound Kecha Wacha's ears | 遗迹平原 | 奇猿狐 | 2400 | 200 | HR4 | 5 |
| 110503 | Fish On! | Deliver 3 Silverfish | 孤岛 | 水龙 | 4500 | 200 | HR4 | 5 |
| 110504 | Lucky Volcano Cat | Earn 1800 Wycademy Points | 地底火山 | 红速龙王 | 3900 | 250 | HR4 | 5 |
| 110505 | Under the Blazing Sun | Hunt a Gendrome | 旧沙漠 | 黄速龙王 | 3600 | 230 | HR4 | 5 |

### 5.6 集会所上位 ★6（71 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10601 | The Lightning Crown | Hunt an Astalos | 遗迹平原 | 电龙、火龙、轰龙、恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10602 | What a Girl Wants | Hunt a Tigrex | 遗迹平原 | 轰龙、电龙、金狮子、恐暴龙 | 12600 | 610 | HR4 | 6 |
| 10603 | Rathalos Run | Hunt a Rathalos | 遗迹平原 | 火龙、电龙、金狮子、恐暴龙 | 10500 | 590 | HR4 | 6 |
| 10604 | Watch Your Steppe | Hunt a Gore Magala | 遗迹平原 | 黑蚀龙 | 11700 | 610 | HR8 | 6 |
| 10605 | Bug Buffet | Hunt a Seltas Queen | 原生林 | 重甲虫、穿甲虫 | 10500 | 590 | HR4 | 6 |
| 10606 | A Bewitching Dance | Hunt a Mizutsune | 原生林 | 泡狐龙 | 12000 | 630 | HR4 | 6 |
| 10607 | Dread Locked | Hunt a Gore Magala | 原生林 | 黑蚀龙 | 11700 | 610 | HR4 | 6 |
| 10608 | The Unshakable Mountain God | Hunt a Gammoth | 冰海 | 巨兽 | 12000 | 630 | HR4 | 6 |
| 10609 | Topple the Monarch | Hunt a Zinogre | 冰海 | 雷狼龙、变形冰鲨、巨兽、恐暴龙 | 11400 | 590 | HR4 | 6 |
| 10610 | Bedevil a Deviljho | Hunt a Deviljho | 冰海 | 恐暴龙、白电、怒食恐暴龙 | 15000 | 680 | HR4 | 6 |
| 10611 | Frozen Seaway Accounting | Earn 4000 Wycademy Points | 冰海 | 轰龙、变形冰鲨、恐暴龙 | 8100 | 450 | HR4 | 6 |
| 10612 | Master of the Molten Deep | Hunt an Agnaktor | 地底火山 | 炎戈龙、火龙、恐暴龙 | 11400 | 610 | HR4 | 6 |
| 10613 | Duel in the Volcanic Hollow | Hunt a Glavenus | 地底火山 | 斩龙、爆锤龙、恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10614 | Volcanic Hollow Accounting | Earn 4000 Wycademy Points | 地底火山 | 火龙、红速龙王、恐暴龙 | 8100 | 450 | HR4 | 6 |
| 10615 | Bug Bite | Capture a Seltas Queen | 古代森林（夜） | 重甲虫、穿甲虫 | 13800 | 710 | HR4 | 6 |
| 10616 | Heaven and Earth | Hunt a Rathalos and a Rathian | 古代森林 | 火龙、雌火龙 | 12600 | 820 | HR4 | 6 |
| 10617 | From Beyond the Sands | Hunt a Glavenus | 旧沙漠 | 斩龙、大名盾蟹、轰龙、恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10618 | Legend of the Monkey King | Hunt a Rajang | 旧沙漠 | 金狮子、赤甲兽、恐暴龙、怒食恐暴龙 | 15000 | 680 | HR4 | 6 |
| 10619 | Astalos Territory | Hunt an Astalos | 山林 | 电龙、火龙、恐暴龙、怒食恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10620 | Lord of the Skies | Hunt a Rathalos | 山林 | 火龙、蓝速龙王 | 10500 | 590 | HR4 | 6 |
| 10621 | The Rajang in the Snow | Hunt a Rajang | 雪山 | 金狮子、雪狮子王、巨兽、恐暴龙 | 15000 | 680 | HR4 | 6 |
| 10622 | Fury Run Afoul | Hunt a Gammoth | 雪山（夜） | 巨兽、轰龙、恐暴龙、怒食恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10623 | Bl-Bl-Blangongas! | Hunt 3 Blangongas | 雪山（夜） | 雪狮子王 | 16200 | 780 | HR4 | 6 |
| 10624 | Surrounded by Bubbles | Hunt a Mizutsune | 溪流 | 泡狐龙、迅龙、雷狼龙、恐暴龙 | 12000 | 630 | HR4 | 6 |
| 10625 | The Moving Mountain | Capture a Duramboros | 溪流（夜） | 尾锤龙、雌火龙、恐暴龙、怒食恐暴龙 | 16500 | 730 | HR4 | 6 |
| 10626 | The Fisherman's Fiend | Hunt a Lagiacrus | 孤岛 | 海龙、雷狼龙、恐暴龙、怒食恐暴龙 | 10500 | 590 | HR4 | 6 |
| 10627 | Open Season for Jaggia | Slay 25 Jaggia | 孤岛 | 雌狗龙、恐暴龙 | 4800 | 240 | HR4 | 6 |
| 10628 | For Whom the Gong Tolls | Hunt a Duramboros | 沼泽 | 尾锤龙、绞蛇龙、雌火龙、恐暴龙 | 12600 | 610 | HR4 | 6 |
| 10629 | Quartz Rivalry | Deliver 2 Quartz Ores | 沼泽 | 轰龙 | 6000 | 400 | HR4 | 6 |
| 10630 | We Can Dig It | Capture an Agnaktor | 火山 | 炎戈龙、金狮子、恐暴龙、怒食恐暴龙 | 15000 | 730 | HR4 | 6 |
| 10631 | Coal Hearted | Deliver 10 pieces of Coal or a Paw Pass Ticket | 火山 | 金狮子 | 4500 | 300 | HR4 | 6 |
| 10632 | River of Fire | Hunt 2 Lavasioth | 火山 | 熔岩龙 | 10500 | 750 | HR4 | 6 |
| 10633 | Dances with Wyverns | Hunt all large monsters | 遗迹平原 | 雌火龙、怪鸟、电龙 | 16800 | 940 | HR4 | 6 |
| 10634 | Bugging Out | Hunt all large monsters, not including Seltas | 原生林 | 夜鸟、泡狐龙、重甲虫、穿甲虫 | 20700 | 1130 | HR4 | 6 |
| 10635 | A Three Hour Tour | Hunt all large monsters | 冰海 | 白电、变形冰鲨、巨兽 | 17700 | 1020 | HR4 | 6 |
| 10636 | A Hollow Defense | Hunt all large monsters | 地底火山 | 黑狼鸟、鬼蛙、斩龙 | 18900 | 1040 | HR4 | 6 |
| 10637 | Wild Gunman | Hunt all large monsters | 孤岛 | 迅龙、水龙、海龙 | 18300 | 1060 | HR4 | 6 |
| 10638 | Marshlands Rag | Hunt all large monsters | 沼泽 | 野猪王、绞蛇龙、尾锤龙 | 16800 | 870 | HR4 | 6 |
| 10639 | Firefight to the Finish! | Hunt all large monsters | 火山 | 将军镰蟹、熔岩龙、炎戈龙 | 18600 | 1090 | HR4 | 6 |
| 10640 | At the Slayground | Hunt all large monsters | V. Slayground | 火龙、奇猿狐、金狮子 | 21600 | 1120 | HR4 | 6 |
| 10641 | It's Electric | Slay a Kirin | 古代森林 | 麒麟 | 14400 | 700 | HR4 | 6 |
| 10642 | The White Brute | Slay a Kirin | 雪山（夜） | 麒麟 | 14400 | 700 | HR4 | 6 |
| 10643 | A Scenic Locale | Slay a Kirin | Forlorn Arena | 麒麟 | 14400 | 700 | HR4 | 6 |
| 10644 | Miasma Attack | Hunt a Gypceros | 遗迹平原 | 毒怪鸟（狞猛） | 6300 | 400 | HR4 | 6 |
| 10645 | Stop the Wacha! | Hunt a Kecha Wacha | 遗迹平原 | 奇猿狐（狞猛） | 6300 | 400 | HR4 | 6 |
| 10646 | We Are Not Amused | Hunt a Rathian | 原生林 | 雌火龙（狞猛） | 9000 | 520 | HR4 | 6 |
| 10647 | Zamtrios Fight! | Hunt a Zamtrios | 冰海 | 变形冰鲨（狞猛） | 8400 | 480 | HR4 | 6 |
| 10648 | The Frog of War | Hunt a Tetsucabra | 地底火山 | 鬼蛙（狞猛） | 7200 | 420 | HR4 | 6 |
| 10649 | Triple Toady Terror | Hunt 3 Tetsucabras | 地底火山 | 鬼蛙（狞猛） | 15900 | 740 | HR4 | 6 |
| 10650 | The Coal Still Burns | Deliver 30 pieces of Coal | 地底火山 | 爆锤龙（狞猛） | 6000 | 320 | HR4 | 6 |
| 10651 | Woe Malfestio | Hunt a Malfestio | 古代森林 | 夜鸟（狞猛） | 8400 | 480 | HR4 | 6 |
| 10652 | Born of Darkness | Hunt a Nargacuga | 古代森林（夜） | 迅龙（狞猛） | 9900 | 600 | HR4 | 6 |
| 10653 | Nibeling on Apples | Hunt a Nibelsnarf | 旧沙漠 | 潜口龙（狞猛） | 7800 | 520 | HR4 | 6 |
| 10654 | Warning: Hyper Yian Garuga! | Hunt a Yian Garuga | 山林 | 黑狼鸟（狞猛） | 10800 | 600 | HR4 | 6 |
| 10655 | Hyper for Holes | Hunt a Blangonga | 雪山（夜） | 雪狮子王（狞猛） | 9000 | 560 | HR4 | 6 |
| 10656 | The Plesioth Adventure | Hunt a Plesioth | 溪流 | 水龙（狞猛） | 9000 | 520 | HR4 | 6 |
| 10657 | Daimyo of the Deserted Island | Hunt a Daimyo Hermitaur | 孤岛 | 大名盾蟹（狞猛） | 7200 | 420 | HR4 | 6 |
| 10658 | Where the Wild Manes Are | Hunt a Royal Ludroth | 孤岛 | 水兽（狞猛） | 7200 | 420 | HR4 | 6 |
| 10659 | Hyper Investigation | Hunt a Yian Kut-Ku | 沼泽 | 怪鸟（狞猛） | 5100 | 340 | HR4 | 6 |
| 10660 | The Khezu and the Shadow | Hunt a Khezu | 沼泽 | 白电（狞猛） | 7800 | 520 | HR4 | 6 |
| 10661 | Bring On the Shogun | Hunt a Shogun Ceanataur | 沼泽 | 将军镰蟹（狞猛） | 9000 | 560 | HR4 | 6 |
| 10662 | Unnerving Najarala | Hunt a Najarala | 沼泽 | 绞蛇龙（狞猛） | 9900 | 560 | HR4 | 6 |
| 10663 | Eruption Embodied | Hunt an Uragaan | 火山 | 爆锤龙（狞猛） | 11700 | 600 | HR4 | 6 |
| 10664 | The Magma's Rage | Hunt a Lavasioth | 火山 | 熔岩龙（狞猛） | 9000 | 560 | HR4 | 6 |
| 10665 | Minion Audition Imposition | Hunt all large monsters | 沼泽 | 怪鸟（狞猛）、将军镰蟹（狞猛） | 12000 | 630 | HR4 | 6 |
| 10670 | Barioth Hunt | Hunt a Barioth | 冰海 | 冰牙龙 | 10500 | 540 | HR4 | 6 |
| 10671 | A Cure for Cowardice | Hunt a Gravios | 地底火山 | 铠龙 | 11400 | 590 | HR4 | 6 |
| 110601 | Everywhere You Look | Hunt 2 Iodrome | 原生林 | 红速龙王 | 6000 | 350 | HR4 | 6 |
| 110602 | Malfestio Headbreaker | Wound Malfestio's head | 孤岛 | 夜鸟 | 3000 | 240 | HR4 | 6 |
| 110603 | The Snow Must Go On | Hunt a Lagombi | 冰海 | 白兔兽、白电 | 4500 | 380 | HR4 | 6 |
| 110604 | Big Bro's Benevolence | Deliver 2 Meteor Chunks | 旧沙漠 | 赤甲兽 | 3900 | 300 | HR4 | 6 |

### 5.7 集会所上位 ★7（75 条）

| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |
|---:|---|---|---|---|---:|---:|---|---|
| 10701 | Stop the Wheel | Slay a Shagaru Magala | Sanctuary | 天廻龙 | 15600 | 800 | HR4 | 7 |
| 10702 | A Gathering of Wyverns | Hunt an Astalos and a Rathian | 遗迹平原 | 电龙、雌火龙 | 13800 | 850 | HR4 | 7 |
| 10703 | A Song of White and Lapis | Hunt a Mizutsune and a Malfestio | 原生林 | 泡狐龙、夜鸟 | 13500 | 820 | HR4 | 7 |
| 10704 | A Cold Set of Armor | Hunt a Gammoth and a Zamtrios | 冰海 | 巨兽、变形冰鲨 | 13500 | 820 | HR4 | 7 |
| 10705 | Rocked and Rolled | Hunt a Brachydios | 地底火山 | 碎龙、火龙、恐暴龙 | 12600 | 740 | HR4 | 7 |
| 10706 | So Notable: Seregios | Capture a Seregios | 地底火山 | 千刃龙、碎龙、黑狼鸟、恐暴龙 | 16500 | 890 | HR4 | 7 |
| 10707 | Hammer vs. Blade | Hunt a Glavenus and an Uragaan | 地底火山 | 斩龙、爆锤龙 | 15300 | 900 | HR4 | 7 |
| 10708 | A Roar to the Heavens | Hunt a Zinogre and a Tigrex | 古代森林 | 雷狼龙、轰龙 | 16800 | 960 | HR4 | 7 |
| 10709 | The Hapless Bodyguard | Hunt 3 Rajang | 古代森林（夜） | 金狮子 | 22500 | 1120 | HR4 | 7 |
| 10710 | Seer of Swords | Hunt a Seregios | 旧沙漠 | 千刃龙、轰龙、恐暴龙、怒食恐暴龙 | 12600 | 740 | HR4 | 7 |
| 10711 | The Yukumo Gal Special | Hunt 2 Zinogres | 溪流（夜） | 雷狼龙 | 16200 | 940 | HR4 | 7 |
| 10712 | Repaying the Favor | Hunt a Brachydios | 孤岛 | 碎龙、雷狼龙、海龙、恐暴龙 | 12600 | 740 | HR4 | 7 |
| 10713 | You Bet Your Life | Hunt a Deviljho and a Rajang | 火山 | 恐暴龙、金狮子 | 21000 | 1090 | HR4 | 7 |
| 10714 | Wyvern's Way | Hunt a Yian Garuga and a Tigrex | V. Slayground | 黑狼鸟、轰龙 | 15300 | 890 | HR4 | 7 |
| 10715 | Bewitching Heat | Hunt a Glavenus and a Mizutsune | Forlorn Arena | 斩龙、泡狐龙 | 16800 | 1010 | HR4 | 7 |
| 10716 | The Mountain God's Lightning | Hunt an Astalos and a Gammoth | Forlorn Arena | 电龙、巨兽 | 16800 | 1010 | HR4 | 7 |
| 10717 | A Man's Arena is His Castle | Hunt all large monsters | Arena | 白兔兽、雪狮子王、变形冰鲨、巨兽 | 21600 | 1190 | HR4 | 7 |
| 10718 | The Hunter Games | Hunt all large monsters, not including Seltas | F. Slayground | 泡狐龙、水兽、水龙、重甲虫、穿甲虫 | 25200 | 1400 | HR4 | 7 |
| 10719 | The Flames of War | Hunt all large monsters | Arena | 黑狼鸟、爆锤龙、炎戈龙、火龙、斩龙 | 36900 | 1980 | HR4 | 7 |
| 10720 | A Shocking Revelation! | Hunt all large monsters | Arena | 白电、海龙、雷狼龙、金狮子、电龙 | 38700 | 2040 | HR4 | 7 |
| 10721 | The Gathering Storm | Hunt all large monsters | Sanctuary | 迅龙、轰龙、千刃龙、黑蚀龙 | 31500 | 1720 | HR4 | 7 |
| 10722 | Hellfire Star | Slay Nakarkos | Wyvern's End | 骸龙 | 21000 | 1200 | HR7 | 7 |
| 10723 | Putting the Gore in Magala | Hunt a Gore Magala | 遗迹平原 | 黑蚀龙（狞猛） | 14100 | 730 | HR4 | 7 |
| 10724 | Tigrex, Tigrex, Burning Bright | Hunt a Tigrex | 冰海 | 轰龙（狞猛） | 15300 | 730 | HR8 | 7 |
| 10725 | A Thousand Blades of Wrath | Hunt a Seregios | 地底火山 | 千刃龙（狞猛） | 15300 | 890 | HR4 | 7 |
| 10726 | A Fiery Temper | Hunt a Rathalos | 地底火山 | 火龙（狞猛） | 12600 | 710 | HR4 | 7 |
| 10727 | The Unassailable Seltas Queen | Hunt a Seltas Queen | 古代森林（夜） | 重甲虫（狞猛）、穿甲虫 | 12600 | 710 | HR4 | 7 |
| 10728 | Savage Sword of the Desert | Hunt a Glavenus | 旧沙漠 | 斩龙（狞猛） | 14400 | 760 | HR4 | 7 |
| 10729 | Wyvernlit Evening | Hunt an Astalos | 山林（夜） | 电龙（狞猛） | 14400 | 760 | HR4 | 7 |
| 10730 | Wyverns All Around Us | Hunt a Rathalos and a Rathian | 山林 | 雌火龙（狞猛）、火龙（狞猛） | 15300 | 980 | HR8 | 7 |
| 10731 | Wild Gods, Calm Rangers | Hunt a Gammoth | 雪山 | 巨兽（狞猛） | 14400 | 760 | HR4 | 7 |
| 10732 | Into the Maelstrom | Hunt a Lagiacrus | 溪流 | 海龙（狞猛） | 12600 | 710 | HR4 | 7 |
| 10733 | The Lithe and Unbreaking | Hunt a Mizutsune | 溪流 | 泡狐龙（狞猛） | 14400 | 760 | HR4 | 7 |
| 10734 | The Peril of the Land | Hunt a Duramboros | 溪流 | 尾锤龙（狞猛） | 15300 | 730 | HR4 | 7 |
| 10735 | The Wolf and the Footbath | Hunt a Zinogre | 孤岛 | 雷狼龙（狞猛） | 13800 | 710 | HR8 | 7 |
| 10736 | The Thieving Gypceros | Hunt 3 Gypceros | 沼泽 | 毒怪鸟（狞猛） | 16800 | 830 | HR4 | 7 |
| 10737 | Steam and Smoke | Hunt a Brachydios | 火山 | 碎龙（狞猛） | 15300 | 890 | HR8 | 7 |
| 10738 | The Glowing Embers | Hunt an Agnaktor | 火山 | 炎戈龙（狞猛） | 13800 | 730 | HR4 | 7 |
| 10739 | Primal Forest Defense | Hunt all large monsters, not including Seltas | 原生林 | 毒怪鸟（狞猛）、绞蛇龙（狞猛）、重甲虫（狞猛）、穿甲虫 | 20100 | 1170 | HR4 | 7 |
| 10740 | The End of the Trials | Hunt all large monsters | 旧沙漠 | 轰龙（狞猛）、千刃龙（狞猛） | 21300 | 1130 | HR8 | 7 |
| 10741 | The Descending Fog | Hunt all large monsters | 山林（夜） | 黑狼鸟（狞猛）、怪鸟（狞猛）、雌火龙（狞猛） | 17400 | 1020 | HR8 | 7 |
| 10742 | Searching for Secret Baths | Hunt all large monsters | 溪流（夜） | 水兽（狞猛）、尾锤龙（狞猛）、雷狼龙（狞猛） | 25200 | 1300 | HR8 | 7 |
| 10743 | Show Me Your Shaka-Strength | Hunt all large monsters | 孤岛 | 火龙（狞猛）、雷狼龙（狞猛）、海龙（狞猛） | 27300 | 1490 | HR4 | 7 |
| 10744 | The Marshlands Nightmare | Hunt all large monsters | 沼泽 | 白电（狞猛）、将军镰蟹（狞猛）、电龙（狞猛） | 21900 | 1290 | HR4 | 7 |
| 10745 | The Birds of Prey | Hunt all large monsters | Arena | 怪鸟（狞猛）、夜鸟（狞猛）、黑狼鸟（狞猛） | 17100 | 990 | HR8 | 7 |
| 10746 | The Fanged Beasts | Hunt all large monsters | Arena | 巨兽（狞猛）、奇猿狐（狞猛）、雪狮子王（狞猛） | 20700 | 1200 | HR8 | 7 |
| 10747 | The Winged Wyverns | Hunt all large monsters | Arena | 电龙（狞猛）、火龙（狞猛）、千刃龙（狞猛） | 29700 | 1650 | HR8 | 7 |
| 10748 | The Foes of the Deep | Hunt all large monsters | F. Slayground | 泡狐龙（狞猛）、水龙（狞猛）、潜口龙（狞猛）、海龙（狞猛） | 30600 | 1750 | HR8 | 7 |
| 10749 | The Beasts of Brawn | Hunt all large monsters | Arena | 爆锤龙（狞猛）、尾锤龙（狞猛）、碎龙（狞猛）、斩龙（狞猛） | 39600 | 2080 | HR8 | 7 |
| 10750 | Ring of the Silver Sol | Hunt a Silver Rathalos | 山林 | 银火龙 | 18900 | 920 | HR7 | 7 |
| 10751 | Ring of the Golden Lune | Hunt a Gold Rathian | 溪流 | 金火龙 | 18900 | 920 | HR7 | 7 |
| 10752 | Usurpers of the Throne | Hunt a Silver Rathalos and a Gold Rathian | 古代森林 | 银火龙、金火龙 | 26700 | 1470 | HR7 | 7 |
| 10753 | Child of Destruction | Hunt a Rajang | 火山 | 激昂金狮子 | 18000 | 900 | HR8 | 7 |
| 10754 | A Shock in the Dark | Hunt 2 Rajang | 古代森林（夜） | 激昂金狮子 | 25200 | 1440 | HR8 | 7 |
| 10755 | Triumphant Rage | Hunt a Deviljho | 旧沙漠 | 怒食恐暴龙 | 18000 | 900 | HR8 | 7 |
| 10756 | The Frozen Dictator | Slay a Kushala Daora or repel it | 雪山（夜） | 钢龙 | 18000 | 1000 | HR8 | 7 |
| 10757 | Kushala Daora Strikes | Slay a Kushala Daora or repel it | 冰海 | 钢龙 | 18000 | 1000 | HR8 | 7 |
| 10758 | The Elder Dragon of Mist | Slay a Chameleos or repel it | 山林 | 霞龙 | 18000 | 1000 | HR8 | 7 |
| 10759 | Beyond the Silence | Slay a Chameleos or repel it | 沼泽 | 霞龙 | 18000 | 1000 | HR8 | 7 |
| 10760 | Emperor of Flame | Slay a Teostra or repel it | 火山 | 炎王龙 | 18000 | 1000 | HR8 | 7 |
| 10761 | The Fires of Devastation | Slay a Teostra or repel it | 地底火山 | 炎王龙 | 18000 | 1000 | HR8 | 7 |
| 10762 | Grim Tidings | Slay an Akantor | Ingle Isle | 霸龙 | 19200 | 1000 | HR8 | 7 |
| 10763 | Absolute Zero | Slay an Ukanlos | Polar Field | 崩龙 | 19200 | 1000 | HR8 | 7 |
| 10764 | The Looming Calamity | Slay an Amatsu | Sacred Pinnacle | 岚龙 | 19200 | 1000 | HR8 | 7 |
| 10765 | The Brilliant Darkness | Slay an Alatreon | Ingle Isle | 煌黑龙 | 21000 | 1500 | HR8 | 7 |
| 10768 | Legendary Skills? | Hunt a Diablos | 旧沙漠 | 角龙 | 12600 | 610 | HR8 | 7 |
| 10770 | Steppe in the Right Direction | Hunt a Deviljho | 遗迹平原 | 恐暴龙（狞猛） | 18000 | 820 | HR8 | 7 |
| 10771 | Rajang's Black Spirit | Hunt a Rajang | 古代森林（夜） | 金狮子（狞猛） | 18000 | 820 | HR8 | 7 |
| 10772 | Following the Fallen | Hunt a Silver Rathalos | 古代森林（夜） | 银火龙（狞猛） | 22800 | 1100 | HR8 | 7 |
| 10773 | Fool's Gold | Hunt a Gold Rathian | 溪流（夜） | 金火龙（狞猛） | 22800 | 1100 | HR8 | 7 |
| 10774 | Shining Examples | Hunt a Silver Rathalos and a Gold Rathian | Arena | 银火龙（狞猛）、金火龙（狞猛） | 31800 | 1770 | HR8 | 7 |
| 110701 | The Ball's in Your Court | Hunt a Volvidon | 古代森林（夜） | 赤甲兽 | 5400 | 420 | HR4 | 7 |
| 110702 | Uragaan Shellbreaker | Wound Uragaan's jaw | 地底火山 | 爆锤龙 | 3600 | 300 | HR4 | 7 |
| 110703 | Poison, Poison, Go Away | Slay 20 Remobras | 冰海 | 蛇龙、恐暴龙 | 4200 | 300 | HR4 | 7 |
| 110704 | Meownster Hunter | Hunt all large monsters | Arena | 野猪王、跳狗龙王、黄速龙王 | 7200 | 500 | HR8 | 7 |

## 6. 闭合

| 段 | 条数 |
|---|---:|
| 村下位 ★1 | 7 |
| 村下位 ★2 | 37 |
| 村下位 ★3 | 49 |
| 村下位 ★4 | 35 |
| 村下位 ★5 | 28 |
| 村下位 ★6 | 25 |
| 村上位 ★6 | 20 |
| 村上位 ★7 | 37 |
| 村上位 ★8 | 42 |
| 村上位 ★9 | 44 |
| 村上位 ★10 | 35 |
| 村G 级 ★10 | 16 |
| 集会所下位 ★1 | 31 |
| 集会所下位 ★2 | 35 |
| 集会所下位 ★3 | 38 |
| 集会所上位 ★4 | 38 |
| 集会所上位 ★5 | 51 |
| 集会所上位 ★6 | 71 |
| 集会所上位 ★7 | 75 |
| **合计** | **714** |

- db 导出 714 条，全部列出；其中 714 条在 romfs 任务扫描中找到对应记录，0 条没有；romfs 星级与 db 不一致 0 条。
- 复现：`tools/wiki-gen/gen-quests-vh.py`（读 `.tmp/mhgu/vh-quests.tsv`、`.tmp/mhgu/questreq.csv`、`mhgu.db`）。
