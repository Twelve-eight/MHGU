# 怪物 AI 参数结构 `mParam.*`（代码侧字段名表，2026-10-23）

> 来源：`main.140.flat.bin` rodata 里的**反射/调试字段名表**（`[ -~]{3,}` 扫描，`flat_off=vaddr+0x100`）。
> 这些名字是引擎在注册「怪物行动参数」结构时使用的字段名，**名字顺序 = 结构声明序**（与存档类的成员名块同源机制）。
> 精度说明：名字表给出**字段存在与命名**，不含 offset/size；offset 需通过引用这些名字的注册函数（`emUniqueActParamSet` 等）反推。

## 0. 关键符号地址

| 符号 | vaddr |
|---|---|
| `emUniqueActMain` | `0x1583420` |
| `emUniqueActParamSet` | `0x158520a` |
| `uMonsterUnitConductor` | `0x15535dc` |
| `uEnemyCharacter` | `0x155358a` |
| `uEnemy` | `0x15535c9` |
| `actionNo` | `0x1553633` |
| `cEmSetList` | `0x155681f` |
| `cEnemyResourceBroker` | `0x15527bf` |
| `cEnemyDebugSetData` | `0x155277f` |
| `cEmSizeCalcTblElement` | `0x15526be` |
| `cEmSizeYureTblElement` | `0x1552742` |
| `cEmDouMouKa_PartsAuraData_Element` | `0x1552294` |

## 1. 全字段表（按语义分组，`mParam.` 共 131 条）

### 移动 / 寻路 (way_*, area_move_*, goto) — 17 条

| vaddr | 字段 |
|---|---|
| `0x155965a` | `mParam.next_area` |
| `0x15596f5` | `mParam.hang_ok_timer_flag` |
| `0x155970f` | `mParam.waypointStatus` |
| `0x1559753` | `mParam.way_move_type` |
| `0x1559768` | `mParam.way_move_rno0` |
| `0x155977d` | `mParam.way_move_rno1` |
| `0x1559792` | `mParam.area_move_req_type` |
| `0x15597ac` | `mParam.way_goto_pos.x` |
| `0x15597c2` | `mParam.way_goto_pos.y` |
| `0x15597d8` | `mParam.way_goto_pos.z` |
| `0x15597ee` | `mParam.way_next_dist_xz` |
| `0x1559806` | `mParam.way_arrive_dist_xz` |
| `0x1559820` | `mParam.way_goto_dir` |
| `0x1559834` | `mParam.area_move_total_timer` |
| `0x1559851` | `mParam.way_area_pos_in_offset` |
| `0x155986f` | `mParam.way_area_pos_out_offset` |
| `0x1559aa6` | `mParam.area_sel_rand` |

### 索敌 / 目标选择 (target_*, homing_*) — 13 条

| vaddr | 字段 |
|---|---|
| `0x1559638` | `mParam.target_area` |
| `0x155988e` | `mParam.homing_pos[i].x` |
| `0x15598a5` | `mParam.homing_pos[i].y` |
| `0x15598bc` | `mParam.homing_pos[i].z` |
| `0x15598d3` | `mParam.target_rand_radius[i]` |
| `0x15598f0` | `mParam.target_rand_keep[i]` |
| `0x155990b` | `mParam.target_selID[i]` |
| `0x1559922` | `mParam.target_type[i]` |
| `0x1559938` | `mParam.target_sel[i]` |
| `0x155994d` | `mParam.target_rand_status[i]` |
| `0x1559c37` | `mParam.sysSendData.q_target_type` |
| `0x1559db4` | `mParam.target_type` |
| `0x1559dc7` | `mParam.target_id` |

### 状态蓄积阈值 (sleep/mahi/poison/hokaku/piyo/stamina/jump/nori/bomb/fight/gekkou) — 12 条

| vaddr | 字段 |
|---|---|
| `0x15595db` | `mParam.stamina_point` |
| `0x15599a9` | `mParam.sleep_point` |
| `0x15599bc` | `mParam.mahi_point` |
| `0x15599ce` | `mParam.poison_point` |
| `0x15599e2` | `mParam.hokaku_point` |
| `0x15599f6` | `mParam.piyo_point` |
| `0x1559a08` | `mParam.stamina_dmg_point` |
| `0x1559a21` | `mParam.jump_dmg_point` |
| `0x1559a37` | `mParam.nori_dmg_point` |
| `0x1559a4d` | `mParam.bomb_point` |
| `0x1559abb` | `mParam.fight_point` |
| `0x1559ace` | `mParam.gekkou_point` |

### 行动控制 (atk_cancel/action_count/pre_condition/cmd_flag/em_mode/status/flag) — 9 条

| vaddr | 字段 |
|---|---|
| `0x1559588` | `mParam.status_bit` |
| `0x155966b` | `mParam.em_mode` |
| `0x15596b8` | `mParam.pre_condition_bit` |
| `0x15596d1` | `mParam.action_count` |
| `0x15596f5` | `mParam.hang_ok_timer_flag` |
| `0x155998f` | `mParam.atk_cancel_ok_flag` |
| `0x1559af3` | `mParam.cmd_flag[i]` |
| `0x1559b06` | `mParam.status` |
| `0x1559b70` | `mParam.flag` |

### 体型 / 属性 / 编号 (size/type/idx/num/master_id/nando) — 12 条

| vaddr | 字段 |
|---|---|
| `0x15594a4` | `mParam.net_em.master_id` |
| `0x15594ce` | `mParam.net_em.type` |
| `0x155997e` | `mParam.mMasterId` |
| `0x1559b14` | `mParam.size` |
| `0x1559b20` | `mParam.type` |
| `0x1559b2c` | `mParam.nando_h` |
| `0x1559b3b` | `mParam.nando_a` |
| `0x1559b4a` | `mParam.nando_o` |
| `0x1559b89` | `mParam.master_id` |
| `0x1559c93` | `mParam.idx` |
| `0x1559c9e` | `mParam.num` |
| `0x155bfef` | `mParam.tar_param[i].num` |

### 网络同步 (sysSendData/enemyNetFlags/host_flag/local_ck) — 10 条

| vaddr | 字段 |
|---|---|
| `0x1559725` | `mParam.enemyNetFlags` |
| `0x1559ae2` | `mParam.host_flag` |
| `0x1559bbe` | `mParam.sysSendData.em_set_id` |
| `0x1559bdb` | `mParam.sysSendData.rev_count` |
| `0x1559bf8` | `mParam.sysSendData.escape_count` |
| `0x1559c18` | `mParam.sysSendData.send_status` |
| `0x1559c37` | `mParam.sysSendData.q_target_type` |
| `0x1559c58` | `mParam.sysSendData.zako_set_idx` |
| `0x1559c78` | `mParam.sysSendData.set_num` |
| `0x1559dff` | `mParam.local_ck_flag` |

### 组编成 (em_set_id/par_em_set_id/set_type/sub_type/zako_set_idx/mure_*) — 16 条

| vaddr | 字段 |
|---|---|
| `0x15594e1` | `mParam.head.em_set_id` |
| `0x155973a` | `mParam.hosyoku_em_set_id` |
| `0x1559bbe` | `mParam.sysSendData.em_set_id` |
| `0x1559ca9` | `mParam.par_em_set_id` |
| `0x1559cbe` | `mParam.em_set_id` |
| `0x1559ccf` | `mParam.set_type` |
| `0x1559cdf` | `mParam.sub_type` |
| `0x1559cef` | `mParam.mure_id` |
| `0x1559cfe` | `mParam.yobi_attr` |
| `0x1559d0f` | `mParam.yobi_area` |
| `0x1559d20` | `mParam.mure_head.mure_type` |
| `0x1559d3b` | `mParam.mure_head.mure_id` |
| `0x1559d54` | `mParam.mure_head.mure_area_no` |
| `0x1559d72` | `mParam.mure_head.sequence_no` |
| `0x1559d8f` | `mParam.mure_status` |
| `0x1559da2` | `mParam.mure_st_no` |

### 其余（未归类）— 45 条

| vaddr | 字段 |
|---|---|
| `0x1559491` | `mParam.net_em.prio` |
| `0x15594bc` | `mParam.net_em.uid` |
| `0x15594f7` | `mParam.head.rev_count` |
| `0x155950d` | `mParam.head.em_id` |
| `0x155951f` | `mParam.dm_data.dmPack[i]` |
| `0x1559538` | `mParam.dm_data.spPack[i]` |
| `0x1559551` | `mParam.pos.x` |
| `0x155955e` | `mParam.pos.y` |
| `0x155956b` | `mParam.pos.z` |
| `0x1559578` | `mParam.hp_vital` |
| `0x155959a` | `mParam.ofs_ofsY` |
| `0x15595aa` | `mParam.jimen_Y` |
| `0x15595b9` | `mParam.rot[i]` |
| `0x15595c7` | `mParam.net_act_rand` |
| `0x15595f0` | `mParam.all_parts_vital` |
| `0x1559607` | `mParam.unique_status` |
| `0x155961c` | `mParam.act_st` |
| `0x155962a` | `mParam.act_no` |
| `0x155964b` | `mParam.area_no` |
| `0x155967a` | `mParam.eye_damage_count` |
| `0x1559692` | `mParam.poison_count` |
| `0x15596a6` | `mParam.bomb_count` |
| `0x15596e5` | `mParam.floor_id` |
| `0x155996a` | `mParam.free_work[i]` |
| `0x1559a5f` | `mParam.eye_damage_timer` |
| `0x1559a77` | `mParam.eye_damage_ot_timer` |
| `0x1559a92` | `mParam.poison_timer` |
| `0x1559b59` | `mParam.mDouMouKaRandom` |
| `0x1559b7c` | `mParam.param` |
| `0x1559b9a` | `mParam.mBossFishAdd` |
| `0x1559bae` | `mParam.mData[i]` |
| `0x1559dd8` | `mParam.call_status` |
| `0x1559deb` | `mParam.pos_data_idx` |
| `0x1559e14` | `mParam.call_area` |
| `0x155a252` | `mParam.mSyncParam` |
| `0x155bfa9` | `mParam.clr_timer` |
| `0x155bfba` | `mParam.tar_param[i].clr_param` |
| `0x155bfd8` | `mParam.tar_param[i].id` |
| `0x155c007` | `mParam.tar_param[i].max` |
| `0x155c01f` | `mParam.quest_st` |
| `0x155c02f` | `mParam.sub_flag` |
| `0x155c03f` | `mParam.gekitai_st` |
| `0x155c051` | `mParam.ret_time` |
| `0x155c061` | `mParam.ret_time20` |
| `0x155c198` | `mParam.em_type` |

## 2. 怪物行动名（`*_move` / `emUniqueAct`）

| vaddr | 名称 |
|---|---|
| `0x1559753` | `mParam.way_move_type` |
| `0x1559768` | `mParam.way_move_rno0` |
| `0x155977d` | `mParam.way_move_rno1` |
| `0x1559792` | `mParam.area_move_req_type` |
| `0x1559834` | `mParam.area_move_total_timer` |
| `0x1563ead` | `setup_npc_move_camera` |
| `0x1583420` | `emUniqueActMain` |
| `0x15839da` | `fw_move` |
| `0x15839e2` | `action_move` |
| `0x15839ee` | `move_move` |
| `0x15839f8` | `moguri_move` |
| `0x1583a04` | `attack_move` |
| `0x1583a10` | `revival_move` |
| `0x1583ee5` | `fly_move` |
| `0x15844e1` | `demo_move` |
| `0x1584555` | `hover_move` |
| `0x158467a` | `em047_00_fw_move` |
| `0x158468b` | `em047_00_action_move` |
| `0x15846a0` | `em047_00_move_move` |
| `0x15846b3` | `em047_00_moguri_move` |
| `0x15846c8` | `em047_00_attack_move` |
| `0x15846dd` | `em047_00_revival_move` |
| `0x1584769` | `em055_00_fw_move` |
| `0x158477a` | `em055_00_action_move` |
| `0x158478f` | `em055_00_move_move` |
| `0x15847a2` | `em055_00_moguri_move` |
| `0x15847b7` | `em055_00_attack_move` |
| `0x15847cc` | `em055_00_revival_move` |
| `0x158499a` | `pre_catch_move` |
| `0x15849a9` | `catch_move` |
| `0x158520a` | `emUniqueActParamSet` |
| `0x1585ba3` | `ems039_00_fw_move` |
| `0x1585bb5` | `ems039_00_zako_action_move` |
| `0x1585bd0` | `ems039_00_zako_move_move` |
| `0x1585be9` | `ems039_00_zako_attack_move` |
| `0x1585c04` | `ems039_00_revival_move` |
| `0x1585c1b` | `ems039_00_fly_move` |
| `0x1585c2e` | `ems040_00_fw_move` |
| `0x1585c40` | `ems040_00_action_move` |
| `0x1585c56` | `ems040_00_move_move` |
| `0x1585c6a` | `ems040_00_fly_move` |
| `0x1585c7d` | `ems040_00_moguri_move` |
| `0x1585c93` | `ems040_00_attack_move` |
| `0x1585ca9` | `ems040_00_revival_move` |

## 3. 怪物/随从猫网络同步协议名

| vaddr | 名称 |
|---|---|
| `0x1558f27` | `nFestaNetwork::netEmAction` |
| `0x1558f42` | `nFestaNetwork::netEmActionProcedure` |
| `0x1558f66` | `nFestaNetwork::netEmMasterChange` |
| `0x1558f87` | `nFestaNetwork::netEmMasterChangeProcedure` |
| `0x1558fb1` | `nFestaNetwork::netEmSpecificStatus` |
| `0x1558fd4` | `nFestaNetwork::netEmSpecificStatusProcedure` |
| `0x1559000` | `nFestaNetwork::netEmRevivalSet` |
| `0x155901f` | `nFestaNetwork::netEmRevivalSetProcedure` |
| `0x1559047` | `nFestaNetwork::netEmMasterOnlyStatus` |
| `0x155906c` | `nFestaNetwork::netEmMasterOnlyStatusProcedure` |
| `0x155909a` | `nFestaNetwork::netEmMasterSelect` |
| `0x15590bb` | `nFestaNetwork::netEmMasterSelectProcedure` |
| `0x15590e5` | `nFestaNetwork::netEmMasterInquire` |
| `0x1559107` | `nFestaNetwork::netEmMasterInquireProcedure` |
| `0x1559132` | `nFestaNetwork::netEmBossFishAdd` |
| `0x1559152` | `nFestaNetwork::netEmBossFishAddProcedure` |
| `0x155917b` | `nFestaNetwork::netEmUniqueData` |
| `0x155919a` | `nFestaNetwork::netEmUniqueDataProcedure` |
| `0x1559434` | `nFestaNetwork::netEm087_088_FreeUsePacket` |
| `0x155945e` | `nFestaNetwork::netEm087_088_FreeUsePacketProcedure` |
| `0x1559e3b` | `nFestaNetwork::netOtAction` |
| `0x1559e56` | `nFestaNetwork::netOtActionProcedure` |
| `0x1559e7a` | `nFestaNetwork::netOtActTargetPos` |
| `0x1559e9b` | `nFestaNetwork::netOtActTargetPosProcedure` |
| `0x1559ec5` | `nFestaNetwork::netOtPosition` |
| `0x1559ee2` | `nFestaNetwork::netOtPositionProcedure` |
| `0x1559f08` | `nFestaNetwork::netOtData` |
| `0x1559f21` | `nFestaNetwork::netOtDataProcedure` |
| `0x1559f43` | `nFestaNetwork::netOtBombDamageBomb` |
| `0x1559f66` | `nFestaNetwork::netOtBombDamageBombProcedure` |
| `0x1559f92` | `nFestaNetwork::netOtActHoldEmID` |
| `0x1559fb2` | `nFestaNetwork::netOtActHoldEmIDProcedure` |

## 4. 怪物单元名 `uEm###_00`（225 条）

| vaddr | 单元名 |
|---|---|
| `0x15527d4` | `uEm001_00` |
| `0x15527de` | `uEm003_00` |
| `0x15527e8` | `uEm008_00` |
| `0x15527f2` | `uEm009_00` |
| `0x15527fc` | `uEm010_00` |
| `0x1552806` | `uEm011_00` |
| `0x1552810` | `uEm014_00` |
| `0x155281a` | `uEm017_00` |
| `0x1552824` | `uEm018_00` |
| `0x155282e` | `uEm019_00` |
| `0x1552838` | `uEm020_00` |
| `0x1552842` | `uEm022_00` |
| `0x155284c` | `uEm023_00` |
| `0x1552856` | `uEm024_00` |
| `0x1552860` | `uEm025_00` |
| `0x155286a` | `uEm027_00` |
| `0x1552874` | `uEm030_00` |
| `0x155287e` | `uEm032_00` |
| `0x1552888` | `uEm033_00` |
| `0x1552892` | `uEm036_00` |
| `0x155289c` | `uEm037_00` |
| `0x15528a6` | `uEm038_00` |
| `0x15528b0` | `uEm043_00` |
| `0x15528ba` | `uEm045_00` |
| `0x15528c4` | `uEm046_00` |
| `0x15528ce` | `uEm047_00` |
| `0x15528d8` | `uEm049_00` |
| `0x15528e2` | `uEm050_00` |
| `0x15528ec` | `uEm055_00` |
| `0x15528f6` | `uEm056_00` |
| `0x1552900` | `uEm057_00` |
| `0x155290a` | `uEm058_00` |
| `0x1552914` | `uEm060_00` |
| `0x155291e` | `uEm061_00` |
| `0x1552928` | `uEm063_00` |
| `0x1552932` | `uEm065_00` |
| `0x155293c` | `uEm066_00` |
| `0x1552946` | `uEm067_00` |
| `0x1552950` | `uEm068_00` |
| `0x155295a` | `uEm069_00` |
| `0x1552964` | `uEm071_00` |
| `0x155296e` | `uEm076_00` |
| `0x1552978` | `uEm077_00` |
| `0x1552982` | `uEm079_00` |
| `0x155298c` | `uEm080_00` |
| `0x1552996` | `uEm081_00` |
| `0x15529a0` | `uEm082_00` |
| `0x15529aa` | `uEm083_00` |
| `0x15529b4` | `uEm084_00` |
| `0x15529be` | `uEm085_00` |
| `0x15529c8` | `uEms001_00` |
| `0x15529d3` | `uEms002_00` |
| `0x15529de` | `uEms003_00` |
| `0x15529e9` | `uEms004_00` |
| `0x15529f4` | `uEms005_00` |
| `0x15529ff` | `uEms006_00` |
| `0x1552a0a` | `uEms007_00` |
| `0x1552a15` | `uEms009_00` |
| `0x1552a20` | `uEms013_00` |
| `0x1552a2b` | `uEms016_00` |
| `0x1552a36` | `uEms019_00` |
| `0x1552a41` | `uEms023_00` |
| `0x1552a4c` | `uEms025_00` |
| `0x1552a57` | `uEms026_00` |
| `0x1552a62` | `uEms027_00` |
| `0x1552a6d` | `uEms034_00` |
| `0x1552a78` | `uEms035_00` |
| `0x1552a83` | `uEms039_00` |
| `0x1552a8e` | `uEms040_00` |
| `0x1552a99` | `uEms042_00` |
| `0x1552aa4` | `uEms044_00` |
| `0x1552aaf` | `uEms045_00` |
| `0x1552aba` | `uEms046_00` |
| `0x1552ac5` | `uEms047_00` |
| `0x1552ad0` | `uEms048_00` |
| `0x1552aea` | `uEms100_00` |
| `0x1552af5` | `uEm004_00` |
| `0x1552aff` | `uEm007_00` |
| `0x1552b09` | `uEm012_00` |
| `0x1552b13` | `uEm013_00` |
| `0x1552b1d` | `uEm021_00` |
| `0x1552b27` | `uEm042_00` |
| `0x1552b31` | `uEm044_00` |
| `0x1552b3b` | `uEm070_00` |
| `0x1552b45` | `uEm086_00` |
| `0x1552b4f` | `uEm087_088_ControlUnit` |
| `0x1552b66` | `uEm087_00::cActCustomExecMonitor` |
| `0x1552b87` | `uEm087_00` |
| `0x1552b91` | `uEm087_00::cJointCtrl` |
| `0x1552ba7` | `uEm088_00` |
| `0x1552bb1` | `uEm088_00::cJointCtrl` |
| `0x1552bc7` | `uEm087_088_RubbleBase` |
| `0x1552bdd` | `uEm087_Rubble` |
| `0x1552beb` | `uEm088_Rubble` |
| `0x1552bf9` | `uEms017_00` |
| `0x1552c04` | `uEms022_00` |
| `0x158546e` | `ems001_00FwMove` |
| `0x158547e` | `ems001_00ActionMove` |
| `0x1585492` | `ems001_00MoveMove` |
| `0x15854a4` | `ems001_00AttackMove` |
| `0x15854b8` | `ems001_00RevivalMove` |
| `0x15854cd` | `ems001_00DemoMove` |
| `0x15854df` | `ems002_00FwMove` |
| `0x15854ef` | `ems002_00ActionMove` |
| `0x1585503` | `ems002_00MoveMove` |
| `0x1585515` | `ems002_00AttackMove` |
| `0x1585529` | `ems002_00RevivalMove` |
| `0x158553e` | `ems002_00DemoMove` |
| `0x1585550` | `ems003_00FwMove` |
| `0x1585560` | `ems003_00ActionMove` |
| `0x1585574` | `ems003_00MoveMove` |
| `0x1585586` | `ems003_00FlyMove` |
| `0x1585597` | `ems003_00AttackMove` |
| `0x15855ab` | `ems003_00RevivalMove` |
| `0x15855c0` | `ems003_00DemoMove` |
| `0x1585607` | `ems007_00FwMove` |
| `0x1585617` | `ems007_00ActionMove` |
| `0x158562b` | `ems007_00MoveMove` |
| `0x158563d` | `ems007_00FlyMove` |
| `0x158564e` | `ems007_00AttackMove` |
| `0x1585662` | `ems007_00RevivalMove` |
| `0x1585677` | `ems009_00FwMove` |
| `0x1585687` | `ems009_00ActionMove` |
| `0x158569b` | `ems009_00MoveMove` |
| `0x15856ad` | `ems009_00FlyMove` |
| `0x15856be` | `ems009_00AttackMove` |
| `0x15856d2` | `ems009_00RevivalMove` |
| `0x15856e7` | `ems009_00DemoMove` |
| `0x15856f9` | `ems016_00FwMove` |
| `0x1585709` | `ems016_00ActionMove` |
| `0x158571d` | `ems016_00MoveMove` |
| `0x158572f` | `ems016_00FlyMove` |
| `0x1585740` | `ems016_00AttackMove` |
| `0x1585754` | `ems016_00RevivalMove` |
| `0x1585769` | `ems016_00DemoMove` |
| `0x158577b` | `ems017_00FwMove` |
| `0x158578b` | `ems017_00FlyMove` |
| `0x158579c` | `ems017_00AttackMove` |
| `0x15857b0` | `ems017_00RevivalMove` |
| `0x15857c5` | `ems019_00FwMove` |
| `0x15857d5` | `ems019_00ActionMove` |
| `0x15857e9` | `ems019_00FlyMove` |
| `0x15857fa` | `ems019_00AttackMove` |
| `0x158580e` | `ems019_00RevivalMove` |
| `0x1585823` | `ems019_00DemoMove` |
| `0x1585835` | `ems022_00FwMove` |
| `0x1585845` | `ems022_00ActionMove` |
| `0x1585859` | `ems022_00MoveMove` |
| `0x158586b` | `ems022_00FlyMove` |
| `0x158587c` | `ems022_00AttackMove` |
| `0x1585890` | `ems022_00RevivalMove` |
| `0x15858a5` | `ems025_00FwMove` |
| `0x15858b5` | `ems025_00ActionMove` |
| `0x15858c9` | `ems025_00MoveMove` |
| `0x15858db` | `ems025_00AttackMove` |
| `0x15858ef` | `ems025_00RevivalMove` |
| `0x1585904` | `ems025_00DemoMove` |
| `0x1585961` | `ems026_00FwMove` |
| `0x1585971` | `ems026_00ActionMove` |
| `0x1585985` | `ems026_00FlyMove` |
| `0x1585996` | `ems026_00AttackMove` |
| `0x15859aa` | `ems026_00RevivalMove` |
| `0x1585a41` | `ems027_00FwMove` |
| `0x1585a51` | `ems027_00ActionMove` |
| `0x1585a65` | `ems027_00MoveMove` |
| `0x1585a77` | `ems027_00FlyMove` |
| `0x1585a88` | `ems027_00AttackMove` |
| `0x1585a9c` | `ems027_00RevivalMove` |
| `0x1585ab1` | `ems034_00FwMove` |
| `0x1585ac1` | `ems034_00ActionMove` |
| `0x1585ad5` | `ems034_00MoveMove` |
| `0x1585ae7` | `ems034_00FlyMove` |
| `0x1585af8` | `ems034_00AttackMove` |
| `0x1585b0c` | `ems034_00DemoMove` |
| `0x1585b1e` | `ems034_00RevivalMove` |
| `0x1585b33` | `ems035_00FwMove` |
| `0x1585b43` | `ems035_00ActionMove` |
| `0x1585b57` | `ems035_00MoveMove` |
| `0x1585b69` | `ems035_00FlyMove` |
| `0x1585b7a` | `ems035_00AttackMove` |
| `0x1585b8e` | `ems035_00RevivalMove` |
| `0x1585ba3` | `ems039_00_fw_move` |
| `0x1585bb5` | `ems039_00_zako_action_move` |
| `0x1585bd0` | `ems039_00_zako_move_move` |
| `0x1585be9` | `ems039_00_zako_attack_move` |
| `0x1585c04` | `ems039_00_revival_move` |
| `0x1585c1b` | `ems039_00_fly_move` |
| `0x1585c2e` | `ems040_00_fw_move` |
| `0x1585c40` | `ems040_00_action_move` |
| `0x1585c56` | `ems040_00_move_move` |
| `0x1585c6a` | `ems040_00_fly_move` |
| `0x1585c7d` | `ems040_00_moguri_move` |
| `0x1585c93` | `ems040_00_attack_move` |
| `0x1585ca9` | `ems040_00_revival_move` |
| `0x1585cc0` | `ems042_00FwMove` |
| `0x1585cd0` | `ems042_00ActionMove` |
| `0x1585ce4` | `ems042_00MoveMove` |
| `0x1585cf6` | `ems042_00FlyMove` |
| `0x1585d07` | `ems042_00AttackMove` |
| `0x1585d1b` | `ems042_00RevivalMove` |
| `0x1585d30` | `ems042_00DemoMove` |
| `0x1585d42` | `ems044_00FwMove` |
| `0x1585d52` | `ems044_00ActionMove` |
| `0x1585d66` | `ems044_00MoveMove` |
| `0x1585d78` | `ems044_00FlyMove` |
| `0x1585d89` | `ems044_00AttackMove` |
| `0x1585d9d` | `ems044_00RevivalMove` |
| `0x1585db2` | `ems044_00DemoMove` |
| `0x1585dce` | `ems045_00FwMove` |
| `0x1585dde` | `ems045_00ActionMove` |
| `0x1585df2` | `ems045_00MoveMove` |
| `0x1585e04` | `ems045_00FlyMove` |
| `0x1585e15` | `ems045_00MoguriMove` |
| `0x1585e29` | `ems045_00AttackMove` |
| `0x1585e3d` | `ems045_00RevivalMove` |
| `0x1585e52` | `ems045_00DemoMove` |
| `0x1585e64` | `ems048_00FwMove` |
| `0x1585e74` | `ems048_00ActionMove` |
| `0x1585e88` | `ems048_00MoveMove` |
| `0x1585e9a` | `ems048_00FlyMove` |
| `0x1585eab` | `ems048_00AttackMove` |
| `0x1585ebf` | `ems048_00RevivalMove` |
| `0x1585ed4` | `ems048_00DemoMove` |
| `0x1585ee6` | `ems100_00FwMove` |
| `0x1585ef6` | `ems100_00DemoMove` |

## 5. 通用行动后缀语义（据 MH 系列惯例，标 `[INFERENCE]`）

| 后缀 | 推测语义 |
|---|---|
| `fw_move` | 前进/巡游移动 |
| `action_move` | 一般行动 |
| `move_move` | 移动行动 |
| `moguri_move` | 潜地/钻地（moguru）|
| `attack_move` | 攻击 |
| `revival_move` | 复活/回归 |
| `fly_move` | 飞行 |
| `demo_move` | 演出/演示 |
| `hover_move` | 悬停 |
| `pre_catch_move` / `catch_move` | 拘束前摇 / 拘束 |
