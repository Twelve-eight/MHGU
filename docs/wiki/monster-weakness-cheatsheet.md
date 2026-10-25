# MHGU 大型怪物弱点速查表

> 由 `MHGU/tools/wiki-gen/gen-weakness.py` 从 `mhgu.db` 的 `monster_damage`（893 行）和 `monster_weakness` 导出生成，共 93 只怪。数值是 db 值，标 `[I]`；肉质已和 romfs 字节对拍的部分见最后一列的肉质页（那里有逐行 `[C]/[X]` 标记，冲突时以肉质页为准）。
> 中文名取自官方简中文本 `monsterName_chS`（经 `docs/data/json/monster-slot-map.json`），英文名是 db 原文。部位名保留 db 英文。

## 口径

- **主部位**：去掉带括号的状态行（如 `Head (Enraged)`、`Head (Break)`）后的部位。
- **最强属性**：主部位里属性肉质的最大值；同值的属性和部位都列出。
- **切 / 打 / 弹最弱**：该列肉质最大的主部位（数值越大越好打）；同值全部列出。
- **异常前二**：`monster_weakness` 中 `Normal` 状态的毒 / 麻痹 / 睡眠星级（db 的 0–6 级，越大越有效），取前两项，同值第三项注「并列」。
- **破坏部位**：`monster_damage` 里带 `(Break)` 的部位。没有这类行不代表不能破坏，只说明 db 没给破坏后肉质。

| 槽 | 怪物 | db id | 最强属性 | 切最弱 | 打最弱 | 弹最弱 | 异常前二 | 破坏后肉质部位 | 肉质页 |
|---:|---|---:|---|---|---|---|---|---|---|
| 0 | 雌火龙 Rathian | 1 | 龙35（Head） | Head 90 | Head 80 | Head 70 | 睡眠4、毒3（麻痹3 并列） | — | monster-hitzones.md |
| 1 | 金火龙 Gold Rathian | 513 | 雷30（Head, Neck） | Back 55 | Back 50 | Legs 45 | 麻痹4、睡眠4 | Head | hitzones-all-a.md |
| 2 | 紫毒姬雌火龙 Dreadqueen Rathian | 1025 | 龙25（Back, Wings） | Neck, Tail 40 | Neck, Tail 40 | Neck, Tail, Wings 30 | 睡眠4、毒3（麻痹3 并列） | Head, Neck, Back, Belly, Tail, Legs, Tail Tip | hitzones-all-a.md |
| 3 | 火龙 Rathalos | 2 | 龙35（Wings） | Head 65 | Head 65 | Head 55 | 睡眠4、毒3（麻痹3 并列） | — | monster-hitzones.md |
| 4 | 银火龙 Silver Rathalos | 514 | 水35（Head, Neck） | Back 55 | Back 50 | Legs 45 | 睡眠4、毒3（麻痹3 并列） | Head | hitzones-all-a.md |
| 5 | 黑炎王雄火龙 Dreadking Rathalos | 1026 | 龙25（Back, Wings） | Head 45 | Head 40 | Head, Neck, Tail 30 | 睡眠4、毒3（麻痹3 并列） | Head, Neck, Back, Tail, Legs, Tail Tip | hitzones-all-a.md |
| 6 | 白电 Khezu | 3 | 火30（Head） | Neck 75 | Head 70 | Head 80 | 睡眠4、麻痹3 | — | hitzones-all-a.md |
| 7 | 怪鸟 Yian Kut-Ku | 8 | 冰40（Neck） | Wings 80 | Head 75 | Head 80 | 毒5、麻痹5 | — | hitzones-all-a.md |
| 8 | 毒怪鸟 Gypceros | 9 | 火30（Head） | Tail 70 | Head 65 | Tail 80 | 毒4、麻痹4（睡眠4 并列） | — | hitzones-all-a.md |
| 9 | 水龙 Plesioth | 10 | 雷25（Neck, Back, Wings, Tail）、火25（Wings） | Belly 50 | Head 50 | Belly 50 | 毒5、麻痹5（睡眠5 并列） | — | hitzones-all-a.md |
| 10 | 麒麟 Kirin | 11 | 火10（Body, Lower Body）、水10（Body, Lower Body）、冰10（Body, Lower Body） | Head 50 | Head 50 | Head 45 | 睡眠4、毒2 | — | hitzones-all-a.md |
| 11 | 蓝速龙王 Velocidrome | 14 | 冰40（Head） | Head 85 | Head 85 | Head 80 | 麻痹6、睡眠6 | — | hitzones-all-a.md |
| 12 | 黄速龙王 Gendrome | 15 | 冰40（Head） | Head 75 | Head 80 | Head 70 | 睡眠6、毒5 | — | hitzones-all-a.md |
| 13 | 红速龙王 Iodrome | 16 | 水30（Head）、雷30（Head） | Body 56 | Body 56 | Body 60 | 麻痹5、睡眠5 | — | hitzones-all-a.md |
| 14 | 砂龙王 Cephadrome | 17 | 冰30（Head） | Neck 65 | Neck 60 | Neck, Back 80 | 毒4、麻痹4（睡眠4 并列） | — | hitzones-all-a.md |
| 15 | 黑狼鸟 Yian Garuga | 18 | 水50（Back） | Head 65 | Head 60 | Head 50 | 睡眠4、麻痹3 | — | hitzones-all-a.md |
| 16 | 独眼黑狼鸟 Deadeye Yian Garuga | 1042 | 水50（Back） | Head 65 | Head 60 | Head 50 | 睡眠4、麻痹3 | — | hitzones-all-a.md |
| 17 | 大名盾蟹 Daimyo Hermitaur | 19 | 雷35（Head）、火35（Claws） | Head 50 | Head 60 | Head 40 | 毒4、麻痹4（睡眠4 并列） | Shell | hitzones-all-a.md |
| 18 | 矛碎大名盾蟹 Stonefist Hermitaur | 1043 | 冰25（Shell） | Head 45 | Head 55 | Head 45 | 毒4、麻痹4（睡眠4 并列） | Shell, Left Legs, Right Claw, Left Claw, Right Legs | hitzones-all-a.md |
| 19 | 将军镰蟹 Shogun Ceanataur | 20 | 雷35（Head）、火35（Claws） | Head 50 | Head, Shell 45 | Head 40 | 毒4、麻痹4（睡眠4 并列） | Softshell (Break Shell) | hitzones-all-a.md |
| 20 | 雪狮子王 Blangonga | 22 | 火30（Head） | Head 60 | Head 60 | Head 60 | 毒4、睡眠4 | — | hitzones-all-a.md |
| 21 | 金狮子 Rajang | 23 | 冰30（Head） | Head 60 | Head 60 | Head 60 | 毒4、睡眠4 | — | hitzones-all-a.md |
| 22 | 激昂金狮子 Furious Rajang | 1303 | 冰30（Head） | Head 60 | Head 60 | Head 60 | 毒4、睡眠4 | — | hitzones-all-a.md |
| 23 | 钢龙 Kushala Daora | 24 | 龙35（Head） | Head 50 | Belly 50 | Head, Tail 40 | 睡眠4、麻痹3 | — | hitzones-all-a.md |
| 24 | 霞龙 Chameleos | 25 | 火35（Head, Belly）、龙35（Head） | Head 45 | Head 50 | Head, Wings 30 | 睡眠4、毒2（麻痹2 并列） | — | hitzones-all-a.md |
| 25 | 炎王龙 Teostra | 27 | 水25（Head）、冰25（Tail） | Head 50 | Head 50 | Tail 60 | 毒5、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 26 | 野猪王 Bulldrome | 30 | 雷30（Head） | Head 80 | Head 70 | Head 70 | 麻痹6、睡眠5 | — | hitzones-all-a.md |
| 27 | 轰龙 Tigrex | 32 | 雷25（Back） | Head 65 | Head 55 | Head 55 | 毒4、麻痹3（睡眠3 并列） | — | monster-hitzones.md |
| 28 | 荒钩爪轰龙 Grimclaw Tigrex | 1056 | 雷20（Head, Neck, Back, Front Legs, Claw） | Head 65 | Head 55 | Head 55 | 毒4、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 29 | 霸龙 Akantor | 33 | 雷30（Tail）、龙30（Tail） | Head 50 | Head 50 | Head 60 | 毒4、麻痹2（睡眠2 并列） | — | hitzones-all-a.md |
| 30 | 熔岩龙 Lavasioth | 36 | 水30（Wings, Tail） | Head 63 | Head 63 | Head 45 | 睡眠4、毒3（麻痹3 并列） | — | hitzones-all-a.md |
| 31 | 迅龙 Nargacuga | 37 | 雷35（Wing Blades） | Head 50 | Head 50 | Head 55 | 毒3、麻痹3（睡眠3 并列） | — | monster-hitzones.md |
| 32 | 白疾风迅龙 Silverwind Nargacuga | 1061 | 雷35（Wing Blades, Front Legs） | Head 40 | Head 45 | Head 40 | 毒3、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 33 | 崩龙 Ukanlos | 38 | 雷25（Back）、火25（Back Legs） | Head 45 | Head 45 | Head 65 | 毒2、麻痹2（睡眠2 并列） | — | hitzones-all-a.md |
| 34 | 恐暴龙 Deviljho | 43 | 雷20（Body, Back, Tail）、龙20（Body, Back, Tail） | Head 65 | Head 65 | Head 60 | 毒7、麻痹4 | — | hitzones-all-a.md |
| 35 | 怒食恐暴龙 Savage Deviljho | 1323 | 雷35（Tail） | Body 69 | Body 69 | Body 55 | 毒7、麻痹4 | — | hitzones-all-a.md |
| 36 | 爆锤龙 Uragaan | 45 | 水40（Head） | Belly 55 | Belly 45 | Belly 45 | 毒7、麻痹5 | Head | hitzones-all-a.md |
| 37 | 宝缠爆锤龙 Crystalbeard Uragaan | 1069 | 水20（Head, Back, Belly, Tail, Tail Tip） | Front Legs 42 | Front Legs 45 | Front Legs 38 | 毒7、睡眠6 | Head, Back, Front Legs, Back Legs, Tail | hitzones-all-a.md |
| 38 | 海龙 Lagiacrus | 46 | 火25（Body） | Neck + Belly 55 | Head, Neck + Belly 45 | Head 45 | 毒4、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 39 | 水兽 Royal Ludroth | 47 | 火40（Mane） | Mane 65 | Mane 50 | Head 65 | 毒4、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 40 | 炎戈龙 Agnaktor | 49 | 龙35（Head (Hot/Break)） | Head (Hot/Break) 55 | Head (Hot/Break) 60 | Head (Hot/Break) 50 | — | Head (Hot/Break), Neck (Hot/Break), Upper Body (Hot/Break), Belly (Hot/Break), Back (Hot/Break), Front Legs (Hot/Break), Back Legs (Hot/Break), Tail (Hot/Break) | hitzones-all-a.md |
| 41 | 煌黑龙 Alatreon | 50 | 龙30（Head (Ice/Thunder Form)） | Head (Fire Form), Head (Ice/Thunder Form) 60 | Head (Fire Form), Head (Ice/Thunder Form) 65 | Head (Fire Form), Head (Ice/Thunder Form) 55 | — | — | hitzones-all-a.md |
| 42 | 尾锤龙 Duramboros | 55 | 火35（Horns）、雷35（Horns） | Humps 60 | Humps 60 | Tail 50 | 毒6、麻痹4（睡眠4 并列） | Humps | hitzones-all-a.md |
| 43 | 潜口龙 Nibelsnarf | 56 | 冰30（Nose） | Uvula 70 | Uvula 70 | Uvula 70 | 毒4、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 44 | 雷狼龙 Zinogre | 57 | 冰25（Back） | Head 65 | Head 65 | Head 70 | 毒5、麻痹3（睡眠3 并列） | — | monster-hitzones.md |
| 45 | 金雷公雷狼龙 Thunderlord Zinogre | 1081 | 冰25（Tail Tip） | Head 65 | Head 65 | Back 40 | 毒5、麻痹3（睡眠3 并列） | — | hitzones-all-a.md |
| 46 | 岚龙 Amatsu | 58 | 龙25（Head） | Head 60 | Head 70 | Head 65 | 毒6、麻痹2（睡眠2 并列） | — | hitzones-all-a.md |
| 47 | 青熊兽 Arzuros | 60 | 火30（Front Legs）、雷30（Front Legs） | Rear 66 | Rear 66 | Upper Body 62 | 麻痹6、睡眠5 | — | hitzones-all-b.md |
| 48 | 红盔青熊兽 Redhelm Arzuros | 1084 | 火20（Front Legs） | Head 45 | Head 40 | Head 38 | 麻痹6、睡眠5 | Front Legs | hitzones-all-b.md |
| 49 | 白兔兽 Lagombi | 61 | 火30（Head, Upper Body） | Rear 63 | Head 63 | Head 50 | 毒3、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 50 | 大雪主白兔兽 Snowbaron Lagombi | 1085 | 火25（Head） | Rear 42 | Head 45 | Head 40 | 毒3、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 51 | 赤甲兽 Volvidon | 62 | 水30（Head） | Rolling 75 | Rolling 75 | Head 45 | 毒3、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 52 | 碎龙 Brachydios | 63 | 水25（Horn） | Head 70 | Head 65 | Head 50 | 毒5、睡眠4 | — | monster-hitzones.md |
| 53 | 奇猿狐 Kecha Wacha | 65 | 火30（Head） | Head 70 | Head 65 | Head 60 | 毒5、麻痹4（睡眠4 并列） | Claws | hitzones-all-b.md |
| 54 | 鬼蛙 Tetsucabra | 66 | 水30（Head） | Head 56 | Head 56 | Head 60 | 毒4、麻痹4（睡眠4 并列） | — | hitzones-all-b.md |
| 55 | 岩穿鬼蛙 Drilltusk Tetsucabra | 1090 | 水25（Head, Fangs）、雷25（Fangs） | Head 52 | Head 52 | Head 55 | 毒4、麻痹4（睡眠4 并列） | — | hitzones-all-b.md |
| 56 | 变形冰鲨 Zamtrios | 67 | 火30（Belly）、雷30（Belly） | Belly 75 | Belly 66 | Belly 60 | 毒6、麻痹4（睡眠4 并列） | — | hitzones-all-b.md |
| 57 | 绞蛇龙 Najarala | 68 | 冰35（Front Legs） | Head 85 | Head 80 | Head 75 | 毒3、睡眠3 | — | hitzones-all-b.md |
| 58 | 重甲虫 Seltas Queen | 69 | 火30（Head） | Head 80 | Head 60 | Head 80 | 毒5、麻痹3（睡眠3 并列） | Head, Left Front Leg, Right Front Leg, Left Hind Leg, Right Hind Leg | hitzones-all-b.md |
| 59 | 黑蚀龙 Gore Magala | 71 | 火25（Wing Arms） | Head 65 | Head 55 | Head 55 | 毒5、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 60 | 天廻龙 Shagaru Magala | 72 | 龙30（Head, Wing Arms）、火30（Wing Arms） | Head 65 | Head 60 | Head 60 | 毒5、麻痹3（睡眠3 并列） | Wing Arms | hitzones-all-b.md |
| 61 | 穿甲虫 Seltas | 76 | 雷35（Torso） | Torso 65 | Head, Torso 55 | Torso 80 | 麻痹5、睡眠5 | — | hitzones-all-b.md |
| 62 | 千刃龙 Seregios | 77 | 雷25（Head, Wingclaw, Wings） | Belly 60 | Belly 55 | Belly 55 | 睡眠4、毒3（麻痹3 并列） | Wingclaw | hitzones-all-b.md |
| 63 | 夜鸟 Malfestio | 79 | 水20（Wing Claws） | Head 55 | Head 50 | Head 55 | 毒3、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 64 | 斩龙 Glavenus | 80 | 水30（Throat） | Throat 70 | Throat 70 | Head 50 | 毒4、麻痹3（睡眠3 并列） | — | monster-hitzones.md |
| 65 | 烬灭刃斩龙 Hellblade Glavenus | 1104 | 水30（Tail） | Throat 63 | Throat 63 | Dorsal Horns 50 | 毒4、麻痹3（睡眠3 并列） | — | hitzones-all-b.md |
| 66 | 电龙 Astalos | 81 | 冰20（Belly, Tail, Tail Tip） | Head 55 | Head 55 | Head 30 | 睡眠4、毒3（麻痹3 并列） | Head, Back, Wings, Tail Tip | monster-hitzones.md |
| 67 | 泡狐龙 Mizutsune | 82 | 雷35（Front Legs） | Head 63 | Head 63 | Head, Fin 45 | 毒3、麻痹3（睡眠3 并列） | Front Legs, Tail | monster-hitzones.md |
| 68 | 巨兽 Gammoth | 83 | 火25（Trunk） | Trunk 63 | Head 60 | Trunk 45 | — | — | monster-hitzones.md |
| 69 | 骸龙 Nakarkos | 84 | 龙30（Weakpoint） | Weakpoint 70 | Weakpoint 70 | Weakpoint 70 | 毒5、麻痹0 | — | hitzones-all-b.md |
| 70 | 跳狗龙王 Great Maccao | 85 | 火30（Head, Tail） | Head, Tail 63 | Head, Tail 63 | Head, Tail 60 | 毒5、麻痹5（睡眠5 并列） | — | hitzones-all-b.md |
| 112 | 岩龙 Basarios | 4 | 水20（Belly） | Tail Tip 28 | Legs 26 | Belly, Legs 30 | 毒5、睡眠5 | Belly | hitzones-all-b.md |
| 113 | 铠龙 Gravios | 5 | 水35（Belly） | Belly 26 | Neck, Back, Belly 30 | Belly 30 | 毒5、麻痹5（睡眠5 并列） | Head, Neck, Back, Belly, Wing, Legs | hitzones-all-b.md |
| 114 | 角龙 Diablos | 7 | 冰30（Tail Tip） | Belly 68 | Belly 75 | Tail 60 | 毒6、麻痹2（睡眠2 并列） | — | hitzones-all-b.md |
| 115 | 鏖魔角龙 Bloodbath Diablos | 1031 | 水30（Tail Tip） | Tail 55 | Back, Belly 42 | Tail 50 | 毒4、麻痹2（睡眠2 并列） | — | hitzones-all-b.md |
| 116 | 老山龙 Lao-Shan Lung | 12 | 龙40（Mouth） | Mouth 80 | Mouth 80 | Mouth 80 | 无数据（全 0） | Back | hitzones-all-b.md |
| 117 | 黑龙 Fatalis | 13 | 龙30（Head） | Head 70 | Head 75 | Head 65 | 无数据（全 0） | — | hitzones-all-b.md |
| 118 | 红龙 Crimson Fatalis | 269 | 龙30（Head） | Head 70 | Head 75 | Head 60 | 无数据（全 0） | — | hitzones-all-b.md |
| 119 | 祖龙 Old Fatalis | 525 | 龙30（Head） | Head 55 | Head 50 | Head 40 | 无数据（全 0） | — | hitzones-all-b.md |
| 120 | 铠裂将军镰蟹 Rustrazor Ceanataur | 1044 | 雷20（Head, Body, Shell, Claws, Shell Flesh）、冰20（Head） | Head 50 | Head 45 | Head 45 | 无数据（全 0） | — | hitzones-all-b.md |
| 121 | 桃毛兽王 Congalala | 21 | 火25（Head） | Head 65 | Head 70 | Head 60 | 无数据（全 0） | Head, Front Legs, Back Legs, Tail | hitzones-all-b.md |
| 122 | 白速龙王 Giadrome | 34 | 火40（Head） | Head 80 | Head 80 | Head 75 | 无数据（全 0） | — | hitzones-all-b.md |
| 123 | 冰牙龙 Barioth | 42 | 火30（Head, Wings） | Head 55 | Head 60 | Head 60 | 无数据（全 0） | — | hitzones-all-b.md |
| 124 | 土砂龙 Barroth | 44 | 火40（Head） | Claws 50 | Claws 55 | Claws, Tail 50 | 毒5、麻痹3 | — | hitzones-all-b.md |
| 125 | 临界碎龙 Raging Brachydios | 1343 | 冰25（Horn） | Head 65 | Head 60 | Tail 50 | 毒4、麻痹2（睡眠2 并列） | — | hitzones-all-b.md |
| 126 | 影蜘蛛 Nerscylla | 70 | 火25（Stinger, Breast） | Belly 60 | Head 65 | Stinger 65 | 麻痹3、毒0 | — | hitzones-all-b.md |
| 127 | 混沌黑蚀龙 Chaotic Gore Magala | 1351 | 龙30（Head, R. Wing Talon）、火30（R. Wing Talon） | Head 65 | Head 55 | Head 55 | 毒4、麻痹2（睡眠2 并列） | — | hitzones-all-b.md |
| 128 | 胧隐夜鸟 Nightcloak Malfestio | 1103 | 水20（Wing Talons） | Head 50 | Head 50 | Head 50 | 无数据（全 0） | — | hitzones-all-b.md |
| 129 | 青电主电龙 Boltreaver Astalos | 1105 | 冰20（Chest, Tail, Tail Tip） | Head 55 | Head 55 | Head 30 | 无数据（全 0） | — | hitzones-all-b.md |
| 130 | 天眼泡狐龙 Soulseer Mizutsune | 1106 | 龙30（L. Front Leg, R. Front Leg） | Head 50 | Head 50 | Fin 45 | 无数据（全 0） | L. Front Leg, Tail, R. Front Leg, Fin | hitzones-all-b.md |
| 131 | 银峰巨兽 Elderfrost Gammoth | 1107 | 火25（Trunk） | Trunk 63 | Head 60 | Trunk 45 | 无数据（全 0） | — | hitzones-all-b.md |
| 132 | 天彗龙 Valstrax | 86 | 火25（Head, Neck, Front Legs, Wings）、水25（Head, Neck, Front Legs, Wings）、雷25（Head, Neck, Front Legs, Wings）、冰25（Head, Neck, Front Legs, Wings） | Head 55 | Head 60 | Wing Talons 60 | 毒5、麻痹2（睡眠2 并列） | — | hitzones-all-b.md |
| 134 | 阁螳螂 Ahtal-Ka | 88 | 雷25（Head） | Head 70 | Head 70 | Head 50 | 无数据（全 0） | — | hitzones-all-b.md |
