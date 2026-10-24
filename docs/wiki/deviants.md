# 二名（特殊许可）怪物与许可任务

18 只二名怪物（MHXX 引入的特殊个体）各有一串「特殊许可」任务。本页按怪物列出全部许可任务及其承接条件。二名狩技、素材用途见 [styles-arts.md](styles-arts.md) 与 [armor-sets.md](armor-sets.md)；承接条件编码见 [quest-requirements.md](quest-requirements.md)；任务系统总览见 [quests.md](quests.md)。

## 0. 出处与标记

- 任务清单、目标、地图、报酬金、HRP、出场怪物：第三方 `mhgu.db` 的 `quests`（`hub = Permit`，228 条）/ `monster_to_quest` / `locations` `[I]`。任务名为 db 英文，中文版没有逐任务任务名文本。
- 等级（下位/上位/G级）、星级、承接条件：romfs 任务记录（扫描结果 `.tmp/mhgu/questreq.csv`）`[C]`；承接 HR 按 quest-requirements.md §2 换算（`Requirement1` 值 1–18 → HR(值+1)，19 → HR100）。
- 怪物中文名：`docs/data/json/monster-slot-map.json` 的 `cn` 字段。

## 1. 红盔青熊兽（Redhelm Arzuros，任务 40101–40116，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40101 | 下位 ★1 | HR2 | Redhelm I: Hunt | Hunt a Redhelm Arzuros | 孤岛 | — | 5100 | 360 |
| 40102 | 下位 ★2 | HR2 | Redhelm II: Capture | Capture a Redhelm Arzuros | 溪流 | 青熊兽 | 6000 | 420 |
| 40103 | 下位 ★3 | HR2 | Redhelm III: Hunt | Hunt 2 Redhelm Arzuros | 孤岛 | — | 7200 | 480 |
| 40104 | 上位 ★4 | HR4 | Redhelm IV: Hunt | Hunt a Redhelm Arzuros | 溪流（夜） | 水兽 | 10200 | 600 |
| 40105 | 上位 ★5 | HR4 | Redhelm V: Hunt | Hunt a Redhelm Arzuros and a Malfestio | 孤岛 | 夜鸟 | 12000 | 720 |
| 40106 | 上位 ★6 | HR6 | Redhelm VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 溪流 | — | 14100 | 840 |
| 40107 | 上位 ★7 | HR6 | Redhelm VII: Capture | Capture a Redhelm Arzuros | 孤岛 | 水龙 | 16200 | 960 |
| 40108 | 上位 ★8 | HR6 | Redhelm VIII: Hunt | Hunt a Redhelm Arzuros | Forlorn Arena | 雷狼龙 | 18000 | 1080 |
| 40109 | 上位 ★9 | HR8 | Redhelm IX: Hunt | Hunt a Redhelm Arzuros and a Deviljho | 孤岛 | 怒食恐暴龙 | 20100 | 1200 |
| 40110 | 上位 ★10 | HR8 | Redhelm X: Hunt | Hunt all large monsters | Forlorn Arena | 青熊兽 | 22200 | 1320 |
| 40111 | G级 ★11 | HR9 | Redhelm G1: Capture | Capture a Redhelm Arzuros | 密林 | — | 24000 | 1440 |
| 40112 | G级 ★12 | HR9 | Redhelm G2: Hunt | Hunt 2 Redhelm Arzuros | 孤岛 | — | 25200 | 1500 |
| 40113 | G级 ★13 | HR11 | Redhelm G3: Hunt | Hunt a Redhelm Arzuros and a Congalala | 密林 | 桃毛兽王 | 27000 | 1620 |
| 40114 | G级 ★14 | HR12 | Redhelm G4: Hunt | Hunt a Redhelm Arzuros | 溪流（夜） | — | 28200 | 1680 |
| 40115 | G级 ★15 | HR13 | Redhelm G5: Hunt | Hunt all large monsters | Sacred Pinnacle | 激昂金狮子 | 30000 | 1800 |
| 40116 | G级 ★16 | HR100 | Redhelm EX: Hunt | Hunt a Redhelm Arzuros | Sacred Pinnacle | — | 31200 | 1860 |

## 2. 大雪主白兔兽（Snowbaron Lagombi，任务 40201–40216，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40201 | 下位 ★1 | HR2 | Snowbaron I: Hunt | Hunt a Snowbaron Lagombi | 雪山 | — | 5400 | 330 |
| 40202 | 下位 ★2 | HR2 | Snowbaron II: Capture | Capture a Snowbaron Lagombi | 雪山 | 白兔兽 | 6600 | 390 |
| 40203 | 下位 ★3 | HR2 | Snowbaron III: Hunt | Hunt 2 Snowbaron Lagombi | 雪山（夜） | — | 7500 | 460 |
| 40204 | 上位 ★4 | HR4 | Snowbaron IV: Hunt | Hunt a Snowbaron Lagombi | 冰海 | 变形冰鲨 | 10800 | 650 |
| 40205 | 上位 ★5 | HR4 | Snowbaron V: Hunt | Hunt a Snowbaron Lagombi and a Bulldrome | 雪山 | 野猪王 | 12900 | 780 |
| 40206 | 上位 ★6 | HR6 | Snowbaron VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 冰海 | — | 15000 | 910 |
| 40207 | 上位 ★7 | HR6 | Snowbaron VII: Capture | Capture a Snowbaron Lagombi | 冰海 | 白电 | 17100 | 1040 |
| 40208 | 上位 ★8 | HR6 | Snowbaron VIII: Hunt | Hunt a Snowbaron Lagombi and a Blangonga | 雪山 | 雪狮子王 | 19200 | 1170 |
| 40209 | 上位 ★9 | HR8 | Snowbaron IX: Hunt | Hunt a Snowbaron Lagombi and a Tigrex | 雪山 | 轰龙 | 21300 | 1300 |
| 40210 | 上位 ★10 | HR8 | Snowbaron X: Hunt | Hunt a Snowbaron Lagombi and a Gammoth | Polar Field | 巨兽 | 23400 | 1430 |
| 40211 | G级 ★11 | HR9 | Snowbaron G1: Capture | Capture a Snowbaron Lagombi | 雪山 | — | 25500 | 1560 |
| 40212 | G级 ★12 | HR9 | Snowbaron G2: Hunt | Hunt 2 Snowbaron Lagombi | 冰海 | — | 26700 | 1630 |
| 40213 | G级 ★13 | HR11 | Snowbaron G3: Hunt | Hunt a Snowbaron Lagombi and a Barioth | 雪山 | 冰牙龙 | 28800 | 1760 |
| 40214 | G级 ★14 | HR12 | Snowbaron G4: Hunt | Hunt a Snowbaron Lagombi | 雪山（夜） | — | 29700 | 1820 |
| 40215 | G级 ★15 | HR13 | Snowbaron G5: Hunt | Hunt all large monsters | Polar Field | 怒食恐暴龙 | 31800 | 1950 |
| 40216 | G级 ★16 | HR100 | Snowbaron EX: Hunt | Hunt a Snowbaron Lagombi | Polar Field | — | 33000 | 2020 |

## 3. 矛碎大名盾蟹（Stonefist Hermitaur，任务 40301–40316，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40301 | 下位 ★1 | HR2 | Stonefist I: Hunt | Hunt a Stonefist Hermitaur | 孤岛 | — | 5700 | 350 |
| 40302 | 下位 ★2 | HR2 | Stonefist II: Capture | Capture a Stonefist Hermitaur | 旧沙漠 | 黄速龙王 | 6900 | 420 |
| 40303 | 下位 ★3 | HR2 | Stonefist III: Hunt | Hunt 2 Stonefist Hermitaurs | 孤岛 | — | 8100 | 490 |
| 40304 | 上位 ★4 | HR4 | Stonefist IV: Hunt | Hunt a Stonefist Hermitaur | 旧沙漠 | 砂龙王 | 11400 | 700 |
| 40305 | 上位 ★5 | HR4 | Stonefist V: Hunt | Hunt a Stonefist Hermitaur and a Daimyo Hermitaur | 孤岛 | 大名盾蟹 | 13500 | 840 |
| 40306 | 上位 ★6 | HR6 | Stonefist VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 旧沙漠 | — | 15900 | 980 |
| 40307 | 上位 ★7 | HR6 | Stonefist VII: Capture | Capture a Stonefist Hermitaur | 孤岛 | 海龙 | 18000 | 1120 |
| 40308 | 上位 ★8 | HR6 | Stonefist VIII: Hunt | Hunt a Stonefist Hermitaur and a Glavenus | 旧沙漠 | 斩龙 | 20400 | 1260 |
| 40309 | 上位 ★9 | HR8 | Stonefist IX: Hunt | Hunt 2 Stonefist Hermitaurs | 旧沙漠 | — | 22500 | 1400 |
| 40310 | 上位 ★10 | HR8 | Stonefist X: Hunt | Hunt a Stonefist Hermitaur and a Rajang | Forlorn Arena | 金狮子 | 24900 | 1540 |
| 40311 | G级 ★11 | HR9 | Stonefist G1: Capture | Capture a Stonefist Hermitaur | 沙漠 | — | 27000 | 1680 |
| 40312 | G级 ★12 | HR9 | Stonefist G2: Hunt | Hunt 2 Stonefist Hermitaurs | 旧沙漠 | — | 28200 | 1750 |
| 40313 | G级 ★13 | HR11 | Stonefist G3: Hunt | Hunt a Stonefist Hermitaur and a Zinogre | 孤岛 | 雷狼龙 | 30300 | 1890 |
| 40314 | G级 ★14 | HR12 | Stonefist G4: Hunt | Hunt a Stonefist Hermitaur | 沙漠 | — | 31500 | 1960 |
| 40315 | G级 ★15 | HR13 | Stonefist G5: Hunt | Hunt a Rustrazor Ceanataur and a Stonefist Hermitaur | Ingle Isle | 铠裂将军镰蟹 | 33600 | 2100 |
| 40316 | G级 ★16 | HR100 | Stonefist EX: Hunt | Hunt a Stonefist Hermitaur | Ingle Isle | — | 34800 | 2170 |

## 4. 紫毒姬雌火龙（Dreadqueen Rathian，任务 40401–40416，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40401 | 下位 ★1 | HR2 | Dreadqueen I: Hunt | Hunt a Dreadqueen Rathian | 沼泽 | — | 6300 | 400 |
| 40402 | 下位 ★2 | HR2 | Dreadqueen II: Capture | Capture a Dreadqueen Rathian | 山林 | 蓝速龙王 | 7500 | 480 |
| 40403 | 下位 ★3 | HR2 | Dreadqueen III: Hunt | Hunt a Dreadqueen Rathian and a Great Maccao | 古代森林（夜） | 跳狗龙王 | 8700 | 560 |
| 40404 | 上位 ★4 | HR5 | Dreadqueen IV: Hunt | Hunt a Dreadqueen Rathian | 遗迹平原 | — | 12600 | 800 |
| 40405 | 上位 ★5 | HR5 | Dreadqueen V: Hunt | Hunt a Dreadqueen Rathian and a Rathalos | 山林 | 火龙 | 15000 | 960 |
| 40406 | 上位 ★6 | HR7 | Dreadqueen VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 旧沙漠 | — | 17400 | 1120 |
| 40407 | 上位 ★7 | HR7 | Dreadqueen VII: Capture | Capture a Dreadqueen Rathian | 沼泽 | 将军镰蟹 | 20100 | 1280 |
| 40408 | 上位 ★8 | HR7 | Dreadqueen VIII: Hunt | Hunt a Dreadqueen Rathian and a Bulldrome | Forlorn Arena | 野猪王 | 22500 | 1440 |
| 40409 | 上位 ★9 | HR8 | Dreadqueen IX: Hunt | Hunt 2 Dreadqueen Rathians | 溪流（夜） | — | 24900 | 1600 |
| 40410 | 上位 ★10 | HR8 | Dreadqueen X: Hunt | Hunt all large monsters | Forlorn Arena | 雌火龙 | 27300 | 1760 |
| 40411 | G级 ★11 | HR10 | Dreadqueen G1: Capture | Capture a Dreadqueen Rathian | 密林 | — | 30000 | 1920 |
| 40412 | G级 ★12 | HR10 | Dreadqueen G2: Hunt | Hunt 2 Dreadqueen Rathians | 沙漠 | — | 31200 | 2000 |
| 40413 | G级 ★13 | HR12 | Dreadqueen G3: Hunt | Hunt a Dreadqueen Rathian | 沼泽 | — | 33600 | 2160 |
| 40414 | G级 ★14 | HR12 | Dreadqueen G4: Hunt | Hunt a Dreadqueen Rathian and a Gold Rathian | 无人山岭 | 金火龙 | 34800 | 2240 |
| 40415 | G级 ★15 | HR13 | Dreadqueen G5: Hunt | Hunt all large monsters | Sanctuary | 黑炎王雄火龙、电龙 | 37200 | 2400 |
| 40416 | G级 ★16 | HR100 | Dreadqueen EX: Hunt | Hunt a Dreadqueen Rathian | Sanctuary | — | 38700 | 2480 |

## 5. 岩穿鬼蛙（Drilltusk Tetsucabra，任务 40501–40516，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40501 | 上位 ★1 | HR4 | Drilltusk I: Hunt | Hunt a Drilltusk Tetsucabra | 孤岛 | — | 12000 | 750 |
| 40502 | 上位 ★2 | HR4 | Drilltusk II: Capture | Capture a Drilltusk Tetsucabra | 地底火山 | — | 13200 | 830 |
| 40503 | 上位 ★3 | HR4 | Drilltusk III: Hunt | Hunt 2 Drilltusk Tetsucabras | 古代森林 | — | 14400 | 900 |
| 40504 | 上位 ★4 | HR4 | Drilltusk IV: Hunt | Hunt a Drilltusk Tetsucabra and a Zamtrios | 冰海 | 变形冰鲨 | 15600 | 980 |
| 40505 | 上位 ★5 | HR6 | Drilltusk V: Hunt | Hunt a Drilltusk Tetsucabra | 地底火山 | 鬼蛙 | 17700 | 1130 |
| 40506 | 上位 ★6 | HR6 | Drilltusk VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 孤岛 | — | 18900 | 1200 |
| 40507 | 上位 ★7 | HR6 | Drilltusk VII: Capture | Capture a Drilltusk Tetsucabra | 古代森林 | 夜鸟 | 20100 | 1280 |
| 40508 | 上位 ★8 | HR6 | Drilltusk VIII: Hunt | Hunt a Drilltusk Tetsucabra and a Gammoth | Polar Field | 巨兽 | 21300 | 1350 |
| 40509 | 上位 ★9 | HR8 | Drilltusk IX: Hunt | Hunt a Drilltusk Tetsucabra and a Brachydios | 地底火山 | 碎龙 | 23700 | 1500 |
| 40510 | 上位 ★10 | HR8 | Drilltusk X: Hunt | Hunt 2 Drilltusk Tetsucabras | Ingle Isle | — | 26100 | 1650 |
| 40511 | G级 ★11 | HR9 | Drilltusk G1: Capture | Capture a Drilltusk Tetsucabra | 孤岛 | — | 28500 | 1800 |
| 40512 | G级 ★12 | HR9 | Drilltusk G2: Hunt | Hunt 2 Drilltusk Tetsucabras | 冰海 | — | 29700 | 1880 |
| 40513 | G级 ★13 | HR11 | Drilltusk G3: Hunt | Hunt a Drilltusk Tetsucabra and a Gravios | 地底火山 | 铠龙 | 32100 | 2030 |
| 40514 | G级 ★14 | HR12 | Drilltusk G4: Hunt | Hunt a Drilltusk Tetsucabra | 古代森林（夜） | — | 33300 | 2100 |
| 40515 | G级 ★15 | HR13 | Drilltusk G5: Hunt | Hunt all large monsters | Polar Field | 大雪主白兔兽、变形冰鲨 | 35400 | 2250 |
| 40516 | G级 ★16 | HR100 | Drilltusk EX: Hunt | Hunt a Drilltusk Tetsucabra | Ingle Isle | — | 36600 | 2330 |

## 6. 白疾风迅龙（Silverwind Nargacuga，任务 40601–40616，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40601 | 上位 ★1 | HR5 | Silverwind I: Hunt | Hunt a Silverwind Nargacuga | 溪流 | — | 13200 | 850 |
| 40602 | 上位 ★2 | HR5 | Silverwind II: Capture | Capture a Silverwind Nargacuga | 古代森林 | 毒怪鸟 | 14400 | 940 |
| 40603 | 上位 ★3 | HR5 | Silverwind III: Hunt | Hunt 2 Silverwind Nargacugas | 孤岛 | — | 15600 | 1020 |
| 40604 | 上位 ★4 | HR5 | Silverwind IV: Hunt | Hunt a Silverwind Nargacuga and a Nargacuga | 溪流（夜） | 迅龙 | 17100 | 1110 |
| 40605 | 上位 ★5 | HR7 | Silverwind V: Hunt | Hunt a Silverwind Nargacuga | 古代森林（夜） | 赤甲兽 | 19500 | 1280 |
| 40606 | 上位 ★6 | HR7 | Silverwind VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 孤岛 | — | 21000 | 1360 |
| 40607 | 上位 ★7 | HR7 | Silverwind VII: Capture | Capture a Silverwind Nargacuga | 古代森林 | — | 22200 | 1450 |
| 40608 | 上位 ★8 | HR7 | Silverwind VIII: Hunt | Hunt a Silverwind Nargacuga and a Mizutsune | 溪流 | 泡狐龙 | 23400 | 1530 |
| 40609 | 上位 ★9 | HR8 | Silverwind IX: Hunt | Hunt a Silverwind Nargacuga and a Duramboros | 溪流（夜） | 尾锤龙 | 26100 | 1700 |
| 40610 | 上位 ★10 | HR8 | Silverwind X: Hunt | Hunt 2 Silverwind Nargacugas | Forlorn Arena | — | 28800 | 1870 |
| 40611 | G级 ★11 | HR10 | Silverwind G1: Capture | Capture a Silverwind Nargacuga | 密林 | — | 31200 | 2040 |
| 40612 | G级 ★12 | HR10 | Silverwind G2: Hunt | Hunt 2 Silverwind Nargacugas | 孤岛 | — | 32700 | 2130 |
| 40613 | G级 ★13 | HR12 | Silverwind G3: Hunt | Hunt a Silverwind Nargacuga a Yian Garuga | 密林 | 黑狼鸟 | 35100 | 2300 |
| 40614 | G级 ★14 | HR12 | Silverwind G4: Hunt | Hunt a Silverwind Nargacuga | 溪流 | — | 36600 | 2380 |
| 40615 | G级 ★15 | HR13 | Silverwind G5: Hunt | Hunt all large monsters | Sacred Pinnacle | 红盔青熊兽 | 39000 | 2550 |
| 40616 | G级 ★16 | HR100 | Silverwind EX: Hunt | Hunt a Silverwind Nargacuga | Sacred Pinnacle | — | 40500 | 2640 |

## 7. 宝缠爆锤龙（Crystalbeard Uragaan，任务 40701–40716，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40701 | 上位 ★1 | HR5 | Crystalbeard I: Hunt | Hunt a Crystalbeard Uragaan | 火山 | — | 13800 | 900 |
| 40702 | 上位 ★2 | HR5 | Crystalbeard II: Capture | Capture a Crystalbeard Uragaan | 地底火山 | 红速龙王 | 15000 | 990 |
| 40703 | 上位 ★3 | HR5 | Crystalbeard III: Hunt | Hunt 2 Crystalbeard Uragaan | 火山 | — | 16500 | 1080 |
| 40704 | 上位 ★4 | HR5 | Crystalbeard IV: Hunt | Hunt a Crystalbeard Uragaan and an Uragaan | 地底火山 | 爆锤龙 | 17700 | 1170 |
| 40705 | 上位 ★5 | HR7 | Crystalbeard V: Hunt | Hunt a Crystalbeard Uragaan | 地底火山 | 火龙 | 20400 | 1350 |
| 40706 | 上位 ★6 | HR7 | Crystalbeard VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 火山 | — | 21900 | 1440 |
| 40707 | 上位 ★7 | HR7 | Crystalbeard VII: Capture | Capture a Crystalbeard Uragaan | 地底火山 | 炎戈龙 | 23400 | 1530 |
| 40708 | 上位 ★8 | HR7 | Crystalbeard VIII: Hunt | Hunt a Crystalbeard Uragaan and a Glavenus | 火山 | 斩龙 | 24600 | 1620 |
| 40709 | 上位 ★9 | HR8 | Crystalbeard IX: Hunt | Hunt a Crystalbeard Uragaan and a Seregios | 地底火山 | 千刃龙 | 27300 | 1800 |
| 40710 | 上位 ★10 | HR8 | Crystalbeard X: Hunt | Hunt 2 Crystalbeard Uragaan | Ingle Isle | — | 30000 | 1980 |
| 40711 | G级 ★11 | HR11 | Crystalbeard G1: Capture | Capture a Crystalbeard Uragaan | 地底火山 | — | 32700 | 2160 |
| 40712 | G级 ★12 | HR11 | Crystalbeard G2: Hunt | Hunt 2 Crystalbeard Uragaan | 火山 | — | 34200 | 2250 |
| 40713 | G级 ★13 | HR11 | Crystalbeard G3: Hunt | Hunt a Crystalbeard Uragaan and a Shogun Ceanataur | 火山 | 将军镰蟹 | 36900 | 2430 |
| 40714 | G级 ★14 | HR13 | Crystalbeard G4: Hunt | Hunt a Crystalbeard Uragaan | 地底火山 | — | 38100 | 2520 |
| 40715 | G级 ★15 | HR13 | Crystalbeard G5: Hunt | Hunt a Brachydios and a Crystalbeard Uragaan | Ingle Isle | 临界碎龙 | 40800 | 2700 |
| 40716 | G级 ★16 | HR100 | Crystalbeard EX: Hunt | Hunt a Crystalbeard Uragaan | Ingle Isle | — | 42300 | 2790 |

## 8. 独眼黑狼鸟（Deadeye Yian Garuga，任务 40801–40816，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40801 | 上位 ★1 | HR5 | Deadeye I: Hunt | Hunt a Deadeye Yian Garuga | 山林 | — | 14400 | 950 |
| 40802 | 上位 ★2 | HR5 | Deadeye II: Capture | Capture a Deadeye Yian Garuga | 地底火山 | 鬼蛙 | 15900 | 1050 |
| 40803 | 上位 ★3 | HR5 | Deadeye III: Hunt | Hunt 2 Deadeye Yian Garuga | 古代森林 | — | 17100 | 1140 |
| 40804 | 上位 ★4 | HR5 | Deadeye IV: Hunt | Hunt a Deadeye Yian Garuga and a Yian Garuga | 山林 | 黑狼鸟 | 18600 | 1240 |
| 40805 | 上位 ★5 | HR7 | Deadeye V: Hunt | Hunt a Deadeye Yian Garuga | 古代森林（夜） | 雌火龙 | 21300 | 1430 |
| 40806 | 上位 ★6 | HR7 | Deadeye VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 地底火山 | — | 22800 | 1520 |
| 40807 | 上位 ★7 | HR7 | Deadeye VII: Capture | Capture a Deadeye Yian Garuga | 地底火山 | 爆锤龙 | 24300 | 1620 |
| 40808 | 上位 ★8 | HR7 | Deadeye VIII: Hunt | Hunt a Deadeye Yian Garuga and an Astalos | 山林 | 电龙 | 25800 | 1710 |
| 40809 | 上位 ★9 | HR8 | Deadeye IX: Hunt | Hunt a Deadeye Yian Garuga and a Nargacuga | 古代森林（夜） | 迅龙 | 28500 | 1900 |
| 40810 | 上位 ★10 | HR8 | Deadeye X: Hunt | Hunt 2 Deadeye Yian Garuga | Forlorn Arena | — | 31500 | 2090 |
| 40811 | G级 ★11 | HR11 | Deadeye G1: Capture | Capture a Deadeye Yian Garuga | 无人山岭 | — | 34200 | 2280 |
| 40812 | G级 ★12 | HR11 | Deadeye G2: Hunt | Hunt a Deadeye Yian Garuga | 古代森林 | — | 35700 | 2380 |
| 40813 | G级 ★13 | HR11 | Deadeye G3: Hunt | Hunt 2 Deadeye Yian Garuga | 山林 | — | 38400 | 2570 |
| 40814 | G级 ★14 | HR13 | Deadeye G4: Hunt | Hunt a Deadeye Yian Garuga and a Rajang | 密林 | 金狮子 | 39900 | 2660 |
| 40815 | G级 ★15 | HR13 | Deadeye G5: Hunt | Hunt all large monsters | Sanctuary | 白疾风迅龙 | 42600 | 2850 |
| 40816 | G级 ★16 | HR100 | Deadeye EX: Hunt | Hunt a Deadeye Yian Garuga | Sanctuary | — | 44100 | 2950 |

## 9. 黑炎王雄火龙（Dreadking Rathalos，任务 40901–40916，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 40901 | 上位 ★1 | HR6 | Dreadking I: Hunt | Hunt a Dreadking Rathalos | 山林 | — | 15000 | 1000 |
| 40902 | 上位 ★2 | HR6 | Dreadking II: Capture | Capture a Dreadking Rathalos | 遗迹平原 | 奇猿狐 | 16500 | 1100 |
| 40903 | 上位 ★3 | HR6 | Dreadking III: Hunt | Hunt a Dreadking Rathalos and a Rathian | 孤岛 | 雌火龙 | 18000 | 1200 |
| 40904 | 上位 ★4 | HR6 | Dreadking IV: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 火山 | — | 19500 | 1300 |
| 40905 | 上位 ★5 | HR7 | Dreadking V: Hunt | Hunt a Dreadking Rathalos | 遗迹平原 | — | 22200 | 1500 |
| 40906 | 上位 ★6 | HR7 | Dreadking VI: Hunt | Hunt a Dreadking Rathalos and an Astalos | 山林（夜） | 电龙 | 23700 | 1600 |
| 40907 | 上位 ★7 | HR7 | Dreadking VII: Capture | Capture a Dreadking Rathalos | 地底火山 | — | 25200 | 1700 |
| 40908 | 上位 ★8 | HR7 | Dreadking VIII: Hunt | Hunt a Dreadking Rathalos and a Bulldrome | Forlorn Arena | 野猪王 | 26700 | 1800 |
| 40909 | 上位 ★9 | HR8 | Dreadking IX: Hunt | Hunt 2 Dreadking Rathalos | 古代森林 | — | 29700 | 2000 |
| 40910 | 上位 ★10 | HR8 | Dreadking X: Hunt | Hunt a Dreadking Rathalos and a Dreadqueen Rathian | Forlorn Arena | 紫毒姬雌火龙 | 32700 | 2200 |
| 40911 | G级 ★11 | HR11 | Dreadking G1: Capture | Capture a Dreadking Rathalos | 火山 | — | 35700 | 2400 |
| 40912 | G级 ★12 | HR11 | Dreadking G2: Hunt | Hunt a Dreadking Rathalos | 地底火山 | — | 37200 | 2500 |
| 40913 | G级 ★13 | HR11 | Dreadking G3: Hunt | Hunt 2 Dreadking Rathalos | 无人山岭 | — | 40200 | 2700 |
| 40914 | G级 ★14 | HR13 | Dreadking G4: Hunt | Hunt a Dreadking Rathalos and a Glavenus | 古代森林 | 斩龙 | 41700 | 2800 |
| 40915 | G级 ★15 | HR13 | Dreadking G5: Hunt | Hunt a Boltreaver Astalos and a Dreadking Rathalos | Ingle Isle | 青电主电龙 | 44400 | 3000 |
| 40916 | G级 ★16 | HR100 | Dreadking EX: Hunt | Hunt a Dreadking Rathalos | Ingle Isle | — | 45900 | 3100 |

## 10. 金雷公雷狼龙（Thunderlord Zinogre，任务 41001–41016，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41001 | 上位 ★1 | HR6 | Thunderlord I: Hunt | Hunt a Thunderlord Zinogre | 溪流 | — | 15600 | 1050 |
| 41002 | 上位 ★2 | HR6 | Thunderlord II: Capture | Capture a Thunderlord Zinogre | 冰海 | — | 17100 | 1160 |
| 41003 | 上位 ★3 | HR6 | Thunderlord III: Hunt | Hunt a Thunderlord Zinogre | 溪流（夜） | 野猪王 | 18600 | 1260 |
| 41004 | 上位 ★4 | HR6 | Thunderlord IV: Hunt | Hunt 2 Thunderlord Zinogres | 古代森林（夜） | — | 20100 | 1370 |
| 41005 | 上位 ★5 | HR7 | Thunderlord V: Hunt | Hunt a Thunderlord Zinogre | 溪流 | — | 23100 | 1580 |
| 41006 | 上位 ★6 | HR7 | Thunderlord VI: Hunt | Hunt a Thunderlord Zinogre and a Gendrome | Forlorn Arena | 黄速龙王 | 24900 | 1680 |
| 41007 | 上位 ★7 | HR7 | Thunderlord VII: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 古代森林 | — | 26400 | 1790 |
| 41008 | 上位 ★8 | HR7 | Thunderlord VIII: Capture | Capture a Thunderlord Zinogre | 冰海 | — | 27900 | 1890 |
| 41009 | 上位 ★9 | HR8 | Thunderlord IX: Hunt | Hunt 2 Thunderlord Zinogres | Sanctuary | — | 30900 | 2100 |
| 41010 | 上位 ★10 | HR8 | Thunderlord X: Hunt | Hunt a Thunderlord Zinogre and a Bulldrome | Forlorn Arena | 野猪王 | 33900 | 2310 |
| 41011 | G级 ★11 | HR11 | Thunderlord G1: Capture | Capture a Thunderlord Zinogre | 无人山岭 | — | 37200 | 2520 |
| 41012 | G级 ★12 | HR11 | Thunderlord G2: Hunt | Hunt a Thunderlord Zinogre | 孤岛 | — | 38700 | 2630 |
| 41013 | G级 ★13 | HR11 | Thunderlord G3: Hunt | Hunt 2 Thunderlord Zinogres | 密林 | — | 41700 | 2840 |
| 41014 | G级 ★14 | HR13 | Thunderlord G4: Hunt | Hunt a Thunderlord Zinogre and a Redhelm Arzuros | 溪流（夜） | 红盔青熊兽 | 43200 | 2940 |
| 41015 | G级 ★15 | HR13 | Thunderlord G5: Hunt | Hunt all large monsters | Sanctuary | 电龙、激昂金狮子 | 46200 | 3150 |
| 41016 | G级 ★16 | HR100 | Thunderlord EX: Hunt | Hunt a Thunderlord Zinogre | Sanctuary | — | 48000 | 3260 |

## 11. 荒钩爪轰龙（Grimclaw Tigrex，任务 41101–41116，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41101 | 上位 ★1 | HR6 | Grimclaw I: Hunt | Hunt a Grimclaw Tigrex | 雪山 | — | 16200 | 1100 |
| 41102 | 上位 ★2 | HR6 | Grimclaw II: Capture | Capture a Grimclaw Tigrex | 原生林 | 蓝速龙王 | 17700 | 1210 |
| 41103 | 上位 ★3 | HR6 | Grimclaw III: Hunt | Hunt a Grimclaw Tigrex and a Gendrome | Forlorn Arena | 黄速龙王 | 19200 | 1320 |
| 41104 | 上位 ★4 | HR6 | Grimclaw IV: Hunt | Hunt 2 Grimclaw Tigrex | 旧沙漠 | — | 21000 | 1430 |
| 41105 | 上位 ★5 | HR7 | Grimclaw V: Hunt | Hunt a Grimclaw Tigrex | 原生林 | 红速龙王 | 24000 | 1650 |
| 41106 | 上位 ★6 | HR7 | Grimclaw VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 雪山 | — | 25800 | 1760 |
| 41107 | 上位 ★7 | HR7 | Grimclaw VII: Hunt | Hunt a Grimclaw Tigrex and a Bulldrome | Polar Field | 野猪王 | 27300 | 1870 |
| 41108 | 上位 ★8 | HR7 | Grimclaw VIII: Capture | Capture a Grimclaw Tigrex | 旧沙漠 | — | 28800 | 1980 |
| 41109 | 上位 ★9 | HR8 | Grimclaw IX: Hunt | Hunt 2 Grimclaw Tigrex | 旧沙漠 | — | 32100 | 2200 |
| 41110 | 上位 ★10 | HR8 | Grimclaw X: Hunt | Hunt a Grimclaw Tigrex and a Tigrex | Polar Field | 轰龙 | 35400 | 2420 |
| 41111 | G级 ★11 | HR12 | Grimclaw G1: Capture | Capture a Grimclaw Tigrex | 沙漠 | — | 38400 | 2640 |
| 41112 | G级 ★12 | HR12 | Grimclaw G2: Hunt | Hunt all large monsters | 遗迹平原 | 金狮子、黑蚀龙 | 40200 | 2750 |
| 41113 | G级 ★13 | HR12 | Grimclaw G3: Hunt | Hunt 2 Grimclaw Tigrex | 旧沙漠 | — | 43200 | 2970 |
| 41114 | G级 ★14 | HR13 | Grimclaw G4: Hunt | Hunt a Grimclaw Tigrex | 无人山岭 | — | 45000 | 3080 |
| 41115 | G级 ★15 | HR13 | Grimclaw G5: Hunt | Hunt all large monsters | Polar Field | 银峰巨兽、冰牙龙 | 48000 | 3300 |
| 41116 | G级 ★16 | HR100 | Grimclaw EX: Hunt | Hunt a Grimclaw Tigrex | Sanctuary | — | 49800 | 3410 |

## 12. 烬灭刃斩龙（Hellblade Glavenus，任务 41201–41216，共 16 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41201 | 上位 ★1 | HR6 | Hellblade I: Hunt | Hunt a Hellblade Glavenus | 古代森林 | — | 16800 | 1150 |
| 41202 | 上位 ★2 | HR6 | Hellblade II: Capture | Capture a Hellblade Glavenus | 旧沙漠 | 黄速龙王 | 18300 | 1270 |
| 41203 | 上位 ★3 | HR6 | Hellblade III: Hunt | Hunt a Hellblade Glavenus and an Iodrome | Ingle Isle | 红速龙王 | 20100 | 1380 |
| 41204 | 上位 ★4 | HR6 | Hellblade IV: Hunt | Hunt 2 Hellblade Glavenus | 地底火山 | — | 21600 | 1500 |
| 41205 | 上位 ★5 | HR7 | Hellblade V: Hunt | Hunt a Hellblade Glavenus | 火山 | — | 24900 | 1730 |
| 41206 | 上位 ★6 | HR7 | Hellblade VI: Hunt | Hunt 2 before time expires or deliver a Paw Pass Ticket | 旧沙漠 | — | 26700 | 1840 |
| 41207 | 上位 ★7 | HR7 | Hellblade VII: Hunt | Hunt a Hellblade Glavenus and a Bulldrome | Forlorn Arena | 野猪王 | 28500 | 1960 |
| 41208 | 上位 ★8 | HR7 | Hellblade VIII: Capture | Capture a Hellblade Glavenus | 地底火山 | — | 30000 | 2070 |
| 41209 | 上位 ★9 | HR8 | Hellblade IX: Hunt | Hunt 2 Hellblade Glavenus | 古代森林（夜） | — | 33300 | 2300 |
| 41210 | 上位 ★10 | HR8 | Hellblade X: Hunt | Hunt a Hellblade Glavenus and a Glavenus | Ingle Isle | 斩龙 | 36600 | 2530 |
| 41211 | G级 ★11 | HR12 | Hellblade G1: Capture | Capture a Hellblade Glavenus | 古代森林 | — | 39900 | 2760 |
| 41212 | G级 ★12 | HR12 | Hellblade G2: Hunt | Hunt 2 Hellblade Glavenus | 密林 | — | 41700 | 2880 |
| 41213 | G级 ★13 | HR12 | Hellblade G3: Hunt | Hunt a Hellblade Glavenus and a Glavenus | 沙漠 | 斩龙 | 45000 | 3110 |
| 41214 | G级 ★14 | HR13 | Hellblade G4: Hunt | Hunt a Hellblade Glavenus | 火山 | — | 46500 | 3220 |
| 41215 | G级 ★15 | HR13 | Hellblade G5: Hunt | Hunt all large monsters | Ingle Isle | 斩龙 | 49800 | 3450 |
| 41216 | G级 ★16 | HR100 | Hellblade EX: Hunt | Hunt a Hellblade Glavenus | Ingle Isle | — | 51600 | 3570 |

## 13. 胧隐夜鸟（Nightcloak Malfestio，任务 41301–41306，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41311 | G级 ★11 | HR10 | Nightcloak G1: Capture | Capture a Nightcloak Malfestio | 古代森林（夜） | — | 29100 | 1860 |
| 41312 | G级 ★12 | HR10 | Nightcloak G2: Hunt | Hunt 2 Nightcloak Malfestios | 孤岛 | — | 30300 | 1940 |
| 41313 | G级 ★13 | HR12 | Nightcloak G3: Hunt | Hunt a Nightcloak Malfestio and a Basarios | 无人山岭 | 岩龙 | 32700 | 2090 |
| 41314 | G级 ★14 | HR12 | Nightcloak G4: Hunt | Hunt a Nightcloak Malfestio | 原生林 | — | 33900 | 2170 |
| 41315 | G级 ★15 | HR13 | Nightcloak G5: Hunt | Hunt all large monsters | Sanctuary | 独眼黑狼鸟 | 36300 | 2330 |
| 41316 | G级 ★16 | HR100 | Nightcloak EX: Hunt | Hunt a Nightcloak Malfestio | Sanctuary | — | 37800 | 2400 |

## 14. 铠裂将军镰蟹（Rustrazor Ceanataur，任务 41401–41406，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41411 | G级 ★11 | HR10 | Rustrazor G1: Capture | Capture a Rustrazor Ceanataur | 火山 | — | 30600 | 1980 |
| 41412 | G级 ★12 | HR10 | Rustrazor G2: Hunt | Hunt 2 Rustrazor Ceanataurs | 沼泽 | — | 31800 | 2060 |
| 41413 | G级 ★13 | HR12 | Rustrazor G3: Hunt | Hunt a Rustrazor Ceanataur and a Malfestio | 无人山岭 | 夜鸟 | 34500 | 2230 |
| 41414 | G级 ★14 | HR12 | Rustrazor G4: Hunt | Hunt a Rustrazor Ceanataur | 火山 | — | 35700 | 2310 |
| 41415 | G级 ★15 | HR13 | Rustrazor G5: Hunt | Hunt all large monsters | Ingle Isle | 铠龙、斩龙 | 38100 | 2480 |
| 41416 | G级 ★16 | HR100 | Rustrazor EX: Hunt | Hunt a Rustrazor Ceanataur | Ingle Isle | — | 39600 | 2560 |

## 15. 天眼泡狐龙（Soulseer Mizutsune，任务 41501–41506，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41511 | G级 ★11 | HR11 | Soulseer G1: Capture | Capture a Soulseer Mizutsune | 溪流（夜） | — | 39900 | 2760 |
| 41512 | G级 ★12 | HR11 | Soulseer G2: Hunt | Hunt all large monsters | 密林 | 斩龙、电龙 | 41700 | 2880 |
| 41513 | G级 ★13 | HR11 | Soulseer G3: Hunt | Hunt a Soulseer Mizutsune | 原生林 | — | 45000 | 3110 |
| 41514 | G级 ★14 | HR13 | Soulseer G4: Hunt | Hunt a Soulseer Mizutsune and a Silverwind Nargacuga | 溪流 | 白疾风迅龙 | 46500 | 3220 |
| 41515 | G级 ★15 | HR13 | Soulseer G5: Hunt | Hunt all large monsters | Sacred Pinnacle | 雷狼龙、泡狐龙 | 49800 | 3450 |
| 41516 | G级 ★16 | HR100 | Soulseer EX: Hunt | Hunt a Soulseer Mizutsune | Sacred Pinnacle | — | 51600 | 3570 |

## 16. 青电主电龙（Boltreaver Astalos，任务 41601–41606，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41611 | G级 ★11 | HR11 | Boltreaver G1: Capture | Capture a Boltreaver Astalos | 山林 | — | 39900 | 2760 |
| 41612 | G级 ★12 | HR11 | Boltreaver G2: Hunt | Hunt a Boltreaver Astalos | 沼泽 | — | 41700 | 2880 |
| 41613 | G级 ★13 | HR11 | Boltreaver G3: Hunt | Hunt 2 Boltreaver Astalos | 遗迹平原 | — | 45000 | 3110 |
| 41614 | G级 ★14 | HR13 | Boltreaver G4: Hunt | Hunt a Boltreaver Astalos and an Astalos | 山林（夜） | 电龙 | 46500 | 3220 |
| 41615 | G级 ★15 | HR13 | Boltreaver G5: Hunt | Hunt all large monsters | Sanctuary | 金雷公雷狼龙 | 49800 | 3450 |
| 41616 | G级 ★16 | HR100 | Boltreaver EX: Hunt | Hunt a Boltreaver Astalos | Sanctuary | — | 51600 | 3570 |

## 17. 银峰巨兽（Elderfrost Gammoth，任务 41701–41706，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41711 | G级 ★11 | HR11 | Elderfrost G1: Capture | Capture an Elderfrost Gammoth | 冰海 | — | 39900 | 2760 |
| 41712 | G级 ★12 | HR11 | Elderfrost G2: Hunt | Hunt an Elderfrost Gammoth | 雪山 | — | 41700 | 2880 |
| 41713 | G级 ★13 | HR11 | Elderfrost G3: Hunt | Hunt 2 Elderfrost Gammoths | 冰海 | — | 45000 | 3110 |
| 41714 | G级 ★14 | HR13 | Elderfrost G4: Hunt | Hunt an Elderfrost Gammoth and a Blangonga | 雪山（夜） | 雪狮子王 | 46500 | 3220 |
| 41715 | G级 ★15 | HR13 | Elderfrost G5: Hunt | Hunt all large monsters | Polar Field | 轰龙、大雪主白兔兽 | 49800 | 3450 |
| 41716 | G级 ★16 | HR100 | Elderfrost EX: Hunt | Hunt an Elderfrost Gammoth | Polar Field | — | 51600 | 3570 |

## 18. 鏖魔角龙（Bloodbath Diablos，任务 41801–41806，共 6 条）

| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |
|---:|---|---|---|---|---|---|---:|---:|
| 41811 | G级 ★11 | HR13 | Bloodbath G1: Hunt | Hunt a Bloodbath Diablos | 沙漠 | — | 41400 | 2880 |
| 41812 | G级 ★12 | HR13 | Bloodbath G2: Capture | Capture a Bloodbath Diablos | 沙漠 | — | 43200 | 3000 |
| 41813 | G级 ★13 | HR13 | Bloodbath G3: Hunt | Hunt a Bloodbath Diablos and a Diablos | 沙漠 | 角龙 | 46500 | 3240 |
| 41814 | G级 ★14 | HR13 | Bloodbath G4: Hunt | Hunt a Bloodbath Diablos and a Seregios | 旧沙漠 | 千刃龙 | 48300 | 3360 |
| 41815 | G级 ★15 | HR13 | Bloodbath G5: Hunt | Hunt 2 Bloodbath Diablos | Ingle Isle | — | 51600 | 3600 |
| 41816 | G级 ★16 | HR100 | Bloodbath EX: Hunt | Hunt a Bloodbath Diablos | Ingle Isle | — | 53400 | 3720 |

## 19. 汇总与闭合

| 二名怪物 | 任务段 | 条数 | 下位 | 上位 | G级 | 最低承接 | 最高承接 |
|---|---|---:|---:|---:|---:|---|---|
| 红盔青熊兽 | 401xx | 16 | 3 | 7 | 6 | HR2 | HR100 |
| 大雪主白兔兽 | 402xx | 16 | 3 | 7 | 6 | HR2 | HR100 |
| 矛碎大名盾蟹 | 403xx | 16 | 3 | 7 | 6 | HR2 | HR100 |
| 紫毒姬雌火龙 | 404xx | 16 | 3 | 7 | 6 | HR2 | HR100 |
| 岩穿鬼蛙 | 405xx | 16 | 0 | 10 | 6 | HR4 | HR100 |
| 白疾风迅龙 | 406xx | 16 | 0 | 10 | 6 | HR5 | HR100 |
| 宝缠爆锤龙 | 407xx | 16 | 0 | 10 | 6 | HR5 | HR100 |
| 独眼黑狼鸟 | 408xx | 16 | 0 | 10 | 6 | HR5 | HR100 |
| 黑炎王雄火龙 | 409xx | 16 | 0 | 10 | 6 | HR6 | HR100 |
| 金雷公雷狼龙 | 410xx | 16 | 0 | 10 | 6 | HR6 | HR100 |
| 荒钩爪轰龙 | 411xx | 16 | 0 | 10 | 6 | HR6 | HR100 |
| 烬灭刃斩龙 | 412xx | 16 | 0 | 10 | 6 | HR6 | HR100 |
| 胧隐夜鸟 | 413xx | 6 | 0 | 0 | 6 | HR10 | HR100 |
| 铠裂将军镰蟹 | 414xx | 6 | 0 | 0 | 6 | HR10 | HR100 |
| 天眼泡狐龙 | 415xx | 6 | 0 | 0 | 6 | HR11 | HR100 |
| 青电主电龙 | 416xx | 6 | 0 | 0 | 6 | HR11 | HR100 |
| 银峰巨兽 | 417xx | 6 | 0 | 0 | 6 | HR11 | HR100 |
| 鏖魔角龙 | 418xx | 6 | 0 | 0 | 6 | HR13 | HR100 |
| **合计** | | **228** | **12** | **108** | **108** | | |

- 承接 HR 分布：HR2 12、HR4 10、HR5 14、HR6 29、HR7 31、HR8 24、HR9 8、HR10 8、HR11 25、HR12 18、HR13 31、HR100 18，合计 228。
- 怪物数 18；228 条全部在 romfs 任务扫描中找到对应记录。
- 复现：`tools/wiki-gen/deviant-data.py`（导出 TSV）+ `tools/wiki-gen/gen-deviants.py`（生成本页）。
