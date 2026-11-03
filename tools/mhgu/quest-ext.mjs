#!/usr/bin/env node
// MHGU quest records: questData_<7d>.ext (369 B = 8 B header + 361 B record) and
// questLink_<7d>.qdl (308 B = 8 B header + 15 x 20 B link slots) -> one normalised JSON/TSV row.
//
// Field layout source: MHGU/docs/data/romfs-tables.md sec. "quest tables" 2 and 3 (community QuestData.h,
// pack(1)); every offset below is re-derived against the extracted corpus in this pass:
//   - 0x000..0x167 closes exactly on 361 B (0x169), 8 + 361 = 369 = every .ext file size [C]
//   - Id @0x004 and QuestTime @0x00E equal mhgu.db.quests._id / time_limit for every extracted record
//     that has a db row (see `verify-db`) [C]
//   - Monsters[5] @0x05C (13 B) reproduces, for quest 40411, the hp/atk/other/size tables of
//     MHRS-private/kb/gu-quest-monsters.tsv:1831 (health_tbl 71, atk_tbl 97, other_tbl 87, size 100,
//     size_tbl 40, stamina_tbl 3, sub_type 0, aura_type 0, restore 1, difficulty 1) [C]
//   - Info[7] @0x0D7 is 7 x {u32 typeHash, char[16] name}; quest 40411 holds <id>_eng/_fre/_ger/_ita/
//     _spa/_chT/_chS in that order (the dossier's [B] claim, confirmed byte-wise) [C]
//   - ClearConditions[2] @0x017 and SubClearCondition @0x021 are {u8 param, u16 value, u16 count};
//     40411 = {2,1025,1} (capture Rathian) with sub {8,1025,1} (break its head), matching
//     mhgu.db.quests.goal "Capture a Dreadqueen Rathian" / sub_goal "Wound ... head" [C]
//   - .qdl 15 slots = BossSet[5] EmSetList[3] RemMain[2] RemAdd[2] RemSub Supp Plus as {u32 typeHash,
//     char[16]}; the five per-kind hashes (boss 0x2553701d, emset 0x32ca92f8, rem 0x5b3c302d,
//     supp 0x54539aee, plus 0x26bec21c) are constant over every extracted .qdl [C] (3 files)
//
// Usage:
//   node MHGU/tools/mhgu/quest-ext.mjs one <file.ext> [--qdl <file.qdl>] [--json]
//   node MHGU/tools/mhgu/quest-ext.mjs row <file.ext> [--qdl <file.qdl>] [--db <mhgu.db>] [--kb <tsv>]
//   node MHGU/tools/mhgu/quest-ext.mjs tsv <file|dir>... [--qdl <file>|--qdl-dir <dir>] [--db <db>] [--kb <tsv>]
//   node MHGU/tools/mhgu/quest-ext.mjs verify-db <file|dir>... [--db <mhgu.db>] [--expect <n>]
//   node MHGU/tools/mhgu/quest-ext.mjs check <file.ext> [--qdl <file.qdl>]
//   node MHGU/tools/mhgu/quest-ext.mjs selftest [--tmp <dir>]
//   --flag                      any mode: keep going, print warnings instead of failing
//
// A directory is walked recursively for questData_<7d>.<anything> (the game ships .ext; extracted
// copies carry the arc entry hash as the suffix) and questLink_<7d>.<anything>; a quest's .qdl is
// paired from --qdl / --qdl-dir / the sibling questLink directory of its own directory.
//
// Library:
//   parseQuestRecord(buf, label) -> {record, warnings}          (361 B record, offsets relative to it)
//   parseQuestExt(buf, label)    -> {record, warnings}          (369 B file: header + record)
//   parseQuestLink(buf, label)   -> {slots, bossSet, ..., plus, warnings}
//   normaliseQuest(record, link, {dbRow, kbRows}) -> {row, warnings}
//   rowToTsv(row, file)                                         (column order TSV_FIELDS)
//
// Exit codes: 0 ok, 1 check failed, 2 usage error.
// License: MIT.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORD_SIZE = 361;
export const HEADER_SIZE = 8;
export const EXT_SIZE = HEADER_SIZE + RECORD_SIZE;     // 369
export const LINK_SIZE = HEADER_SIZE + 15 * 20;        // 308
export const MAGIC = 0x434b0000;

// ---- name tables (romfs-tables.md:76-99 enums) -------------------------------------------------

export const TYPE_NAMES = ['Hunt', 'Slay', 'Capture', 'Gather', 'HuntAThon', 'HuntAThonArena'];
export const SUBTYPE_NAMES = {
  0: 'Training', 1: 'VillageUnlock1', 2: 'VillageUnlock2', 3: 'VillageUnlock3', 4: 'VillageUnlock4',
  5: 'VillageMain1', 6: 'VillageMain2', 7: 'VillageMain3', 8: 'VillageMain4',
  9: 'ProwlerOnly', 10: 'Default', 11: 'SpecialPermit',
};
export const CLEAR_PARAM_NAMES = {
  0: 'None', 1: 'Hunt', 2: 'Capture', 3: 'SlayAllLarge', 4: 'QuestTally', 5: 'Deliver',
  6: 'WycademyPoints', 7: 'PawPassTicket', 8: 'PartBreak', 9: 'Mount',
};
export const LANG_SLOTS = ['eng', 'fre', 'ger', 'ita', 'spa', 'chT', 'chS'];
export const LINK_LAYOUT = [
  ['BossSet', 5], ['EmSetList', 3], ['RemMain', 2], ['RemAdd', 2], ['RemSub', 1], ['Supp', 1], ['Plus', 1],
];
// observed per-kind hashes of the .qdl link slots (3 extracted files, constant per kind)
export const LINK_HASH = {
  BossSet: 0x2553701d, EmSetList: 0x32ca92f8, RemMain: 0x5b3c302d, RemAdd: 0x5b3c302d,
  RemSub: 0x5b3c302d, Supp: 0x54539aee, Plus: 0x26bec21c,
};

// ---- low level --------------------------------------------------------------------------------

const readU16 = (b, o) => b.readUInt16LE(o);
const readS8 = (b, o) => b.readInt8(o);

function cstr(b, off, len) {
  const raw = b.toString('latin1', off, off + len);
  const nul = raw.indexOf('\0');
  return { name: nul < 0 ? raw : raw.slice(0, nul), terminated: nul >= 0 };
}

function needSize(buf, size, label) {
  if (buf.length !== size) throw new Error(`${label}: ${buf.length} B, expected ${size}`);
}

function checkHeader(buf, label) {
  const magic = buf.readUInt32LE(0);
  if (magic !== MAGIC) throw new Error(`${label}: bad magic 0x${magic.toString(16)} (expected 0x${MAGIC.toString(16)})`);
  const count = buf.readInt32LE(4);
  if (count !== 1) throw new Error(`${label}: header count ${count}, expected 1`);
}

// ---- record -----------------------------------------------------------------------------------

/** Parse the 361 B quest record; offsets are relative to the record start (file offset + 8). */
export function parseQuestRecord(rec, label = '<record>') {
  needSize(rec, RECORD_SIZE, label);
  const warnings = [];
  const u8 = (o) => rec[o];
  const cond = (o) => ({ param: rec[o], value: readU16(rec, o + 1), count: readU16(rec, o + 3) });

  const record = {
    Index: rec.readInt32LE(0x000),
    Id: rec.readInt32LE(0x004),
    Type: u8(0x008),
    SubType: u8(0x009),
    Level: u8(0x00a),
    EnemyLevel: u8(0x00b),
    Map: u8(0x00c),
    StartType: u8(0x00d),
    QuestTime: u8(0x00e),
    Faints: u8(0x00f),
    ArenaEquipId: u8(0x010),
    BgmType: u8(0x011),
    Requirement1: u8(0x012),
    Requirement2: u8(0x013),
    ComboRequirement: u8(0x014),
    ClearType: u8(0x015),
    GekitaiHp: u8(0x016),
    ClearConditions: [cond(0x017), cond(0x01c)],
    SubClearCondition: cond(0x021),
    CarveLevel: u8(0x026),
    GatheringLevel: u8(0x027),
    FishingLevel: u8(0x028),
    Fee: rec.readInt32LE(0x029),
    VillagePoints: rec.readInt32LE(0x02d),
    Reward: rec.readInt32LE(0x031),
    SubReward: rec.readInt32LE(0x035),
    ClearVillagePoints: rec.readInt32LE(0x039),
    FailVillagePoints: rec.readInt32LE(0x03d),
    SubVillagePoints: rec.readInt32LE(0x041),
    HunterRankPoints: rec.readInt32LE(0x045),
    SubHunterRankPoints: rec.readInt32LE(0x049),
    RemAddFrame: [readS8(rec, 0x04d), readS8(rec, 0x04e)],
    RemAddLotMax: readS8(rec, 0x04f),
    Supplies: [0, 1].map((i) => {
      const o = 0x050 + 6 * i;
      return { label: readS8(rec, o), type: readS8(rec, o + 1), target: readU16(rec, o + 2), count: readU16(rec, o + 4) };
    }),
    Monsters: [0, 1, 2, 3, 4].map((i) => {
      const o = 0x05c + 13 * i;
      return {
        Id: readU16(rec, o), SubType: rec[o + 2], AuraType: rec[o + 3], Restore: rec[o + 4],
        HealthTbl: rec[o + 5], AtkTbl: rec[o + 6], OtherTbl: rec[o + 7], Difficulty: rec[o + 8],
        Size: readU16(rec, o + 9), SizeTbl: rec[o + 11], StaminaTbl: rec[o + 12],
      };
    }),
    SmallMonsterIndex: { Hp: u8(0x09d), Attack: u8(0x09e), Other: u8(0x09f) },
    EnemySets: [0, 1].map((i) => {
      const o = 0x0a0 + 5 * i;
      return { SetType: readS8(rec, o), TargetId: readU16(rec, o + 1), TargetCount: readU16(rec, o + 3) };
    }),
    BossRushType: readS8(rec, 0x0aa),
    MonsterSpawns: [0, 1, 2, 3, 4].map((i) => {
      const o = 0x0ab + 5 * i;
      return { SpawnType: readS8(rec, o), TargetType: readU16(rec, o + 1), Count: readU16(rec, o + 3) };
    }),
    Stray: { Rand: u8(0x0c4), StartTime: u8(0x0c5), StartRand: u8(0x0c6) },
    StrayLimit345: [readS8(rec, 0x0c7), readS8(rec, 0x0c8), readS8(rec, 0x0c9)],
    StrayRand345: [u8(0x0ca), u8(0x0cb), u8(0x0cc)],
    ExtraTicketCount: u8(0x0cd),
    Icons: [0, 1, 2, 3, 4].map((i) => u8(0x0ce + i)),
    ProgNum: rec.readUInt32LE(0x0d3),
    Info: LANG_SLOTS.map((lang, i) => {
      const o = 0x0d7 + 20 * i;
      const s = cstr(rec, o + 4, 16);
      if (!s.terminated) warnings.push(`Info[${i}] (${lang}) has no NUL in its 16 B name slot`);
      return { lang, typeHash: rec.readUInt32LE(o), name: s.name };
    }),
    VillagePointsG: rec.readInt32LE(0x163),
    Flags: readU16(rec, 0x167),
  };

  // structural invariants (each one is a way the layout can be wrong)
  if (record.Type > 5) warnings.push(`Type ${record.Type} outside 0..5`);
  if (record.SubType > 11) warnings.push(`SubType ${record.SubType} outside 0..11`);
  if (record.Level > 116) warnings.push(`Level ${record.Level} outside 0..116`);
  if (record.QuestTime === 0 || record.QuestTime > 120) warnings.push(`QuestTime ${record.QuestTime} outside 1..120 minutes`);
  if (record.Faints > 9) warnings.push(`Faints ${record.Faints} > 9`);
  for (const [i, m] of record.Monsters.entries()) {
    if (m.Id > 4095) warnings.push(`Monsters[${i}].Id ${m.Id} > 4095 (a 16-bit field is reading garbage)`);
  }
  for (const [i, info] of record.Info.entries()) {
    if (info.name === '') continue;
    if (!new RegExp(`^\\d{7}_${LANG_SLOTS[i]}$`).test(info.name)) {
      warnings.push(`Info[${i}] name ${JSON.stringify(info.name)} is not <7d>_${LANG_SLOTS[i]} (layout or slot order wrong)`);
    }
  }
  return { record, warnings };
}

/** Parse one .ext file (8 B header + 361 B record). */
export function parseQuestExt(buf, label = '<ext>') {
  needSize(buf, EXT_SIZE, label);
  checkHeader(buf, label);
  return parseQuestRecord(buf.subarray(HEADER_SIZE), label);
}

// ---- questLink --------------------------------------------------------------------------------

/** Parse the 308 B .qdl: 8 B header + 15 x {u32 typeHash, char[16] name}. */
export function parseQuestLink(buf, label = '<qdl>') {
  needSize(buf, LINK_SIZE, label);
  checkHeader(buf, label);
  const warnings = [];
  const slots = [];
  for (let i = 0; i < 15; i++) {
    const o = HEADER_SIZE + 20 * i;
    const s = cstr(buf, o + 4, 16);
    if (!s.terminated) warnings.push(`link slot ${i} name fills its 16 B field with no NUL`);
    slots.push({ index: i, typeHash: buf.readUInt32LE(o), name: s.name });
  }
  const byKind = {};
  let at = 0;
  for (const [kind, count] of LINK_LAYOUT) {
    byKind[kind] = slots.slice(at, at + count);
    at += count;
  }
  const kindOf = new Map();
  for (const [kind, list] of Object.entries(byKind)) for (const s of list) kindOf.set(s.index, kind);
  for (const s of slots) {
    if (!s.name) continue;
    const kind = kindOf.get(s.index);
    const want = LINK_HASH[kind];
    if (want !== undefined && s.typeHash !== want) {
      warnings.push(`link slot ${s.index} (${kind}) "${s.name}" typeHash 0x${s.typeHash.toString(16)} != 0x${want.toString(16)} (name/kind mismatch)`);
    }
  }
  const names = (kind) => byKind[kind].map((s) => s.name);
  return {
    slots,
    bossSet: names('BossSet'),
    emSetList: names('EmSetList'),
    remMain: names('RemMain'),
    remAdd: names('RemAdd'),
    remSub: byKind.RemSub[0].name,
    supp: byKind.Supp[0].name,
    plus: byKind.Plus[0].name,
    warnings,
  };
}

// ---- normalised row ---------------------------------------------------------------------------

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function levelRank(level) {
  if (level === 0) return 'training';
  if (level <= 10) return `star-${level}`;
  if (level <= 15) return `G${level - 10}`;
  if (level === 16) return 'EX';
  if (level <= 110) return `deviant-${ROMAN[level - 101] ?? level}`;
  if (level <= 115) return `deviant-G${level - 110}`;
  if (level === 116) return 'deviant-EX';
  return `level-${level}`;
}

/** TSV / JSON column order of the normalised row (`tsv` mode). */
export const TSV_FIELDS = [
  'quest_id', 'file', 'index', 'type', 'type_name', 'sub_type', 'sub_type_name', 'level', 'rank',
  'enemy_level', 'map', 'map_base', 'map_night', 'start_type', 'time_limit', 'faints', 'arena_equip',
  'bgm_type', 'requirement1', 'requirement2', 'combo_requirement', 'clear_type', 'gekitai_hp',
  'cond0_param', 'cond0_value', 'cond0_count', 'cond1_param', 'cond1_value', 'cond1_count',
  'sub_cond_param', 'sub_cond_value', 'sub_cond_count', 'carve_level', 'gathering_level', 'fishing_level',
  'fee', 'village_points', 'reward', 'sub_reward', 'clear_village_points', 'fail_village_points',
  'sub_village_points', 'hrp', 'sub_hrp', 'village_points_g', 'rem_add_frame', 'rem_add_lot_max',
  'supply0', 'supply1', 'monsters', 'small_monster_index', 'enemy_sets', 'boss_rush_type', 'spawns',
  'stray', 'extra_ticket', 'icons', 'prog_num', 'flags', 'text_files',
  'link_boss_set', 'link_em_set', 'link_rem_main', 'link_rem_add', 'link_rem_sub', 'link_supp', 'link_plus',
  'kb_em_arc', 'kb_hp_rate', 'kb_hp_estimate', 'kb_atk_rate', 'kb_boss_set',
  'db_name', 'db_goal', 'db_hub', 'db_rank',
];

const compactMonster = (m) =>
  [m.Id, m.SubType, m.AuraType, m.Restore, m.HealthTbl, m.AtkTbl, m.OtherTbl, m.Difficulty, m.Size, m.SizeTbl, m.StaminaTbl].join('/');

/**
 * Normalise a parsed record (+ optional link, db row, KB row) into one flat JSON row.
 * `opts.dbRow` is a mhgu.db.quests row, `opts.kbRows` the gu-quest-monsters.tsv rows of that quest.
 */
export function normaliseQuest(record, link = null, opts = {}) {
  const night = record.Map >= 100;
  const kbBySlot = new Map((opts.kbRows ?? []).map((r) => [Number(r.slot), r]));
  const warnings = [];
  const monsters = record.Monsters.map((m, slot) => {
    const kb = kbBySlot.get(slot);
    if (m.Id === 0) return { slot, ...m, kb: null };
    if (!kb) {
      if (opts.kbRows) warnings.push(`no gu-quest-monsters.tsv row for slot ${slot} (monster ${m.Id})`);
      return { slot, ...m, kb: null };
    }
    // the KB was produced from the same .ext + dttune, so every shared field must agree
    const pairs = [
      ['HealthTbl', 'health_tbl'], ['AtkTbl', 'atk_tbl'], ['OtherTbl', 'other_tbl'],
      ['Size', 'size_pct'], ['SizeTbl', 'size_tbl'], ['StaminaTbl', 'stamina_tbl'],
      ['SubType', 'sub_type'], ['AuraType', 'aura_type'], ['Restore', 'restore'], ['Difficulty', 'difficulty'],
    ];
    for (const [a, b] of pairs) {
      if (kb[b] === undefined || kb[b] === '') continue;
      if (Number(kb[b]) !== m[a]) warnings.push(`slot ${slot} ${a}: .ext ${m[a]} != KB ${b} ${kb[b]}`);
    }
    if (Number(kb.monster_id) !== m.Id) warnings.push(`slot ${slot} Id: .ext ${m.Id} != KB monster_id ${kb.monster_id}`);
    return {
      slot, ...m,
      kb: {
        em_arc: kb.em_arc, name_en: kb.name_en, base_hp: Number(kb.base_hp), health_tbl: Number(kb.health_tbl),
        hp_rate: Number(kb.hp_rate), hp_estimate: Number(kb.hp_estimate), atk_rate: Number(kb.atk_rate),
        other_rate_b: Number(kb.other_rate_b), boss_set: kb.boss_set, hyper: Number(kb.db_hyper), unstable: Number(kb.db_unstable),
      },
    };
  });

  const db = opts.dbRow ?? null;
  if (db) {
    const checks = [
      ['Id', record.Id, db._id], ['QuestTime', record.QuestTime, db.time_limit],
      ['Fee', record.Fee, db.fee], ['Reward', record.Reward, db.reward],
      ['HunterRankPoints', record.HunterRankPoints, db.hrp],
      ['SubReward', record.SubReward, db.sub_reward], ['SubHunterRankPoints', record.SubHunterRankPoints, db.sub_hrp],
    ];
    for (const [name, got, want] of checks) {
      if (want === null || want === undefined) continue;
      if (got !== want) warnings.push(`${name}: .ext ${got} != mhgu.db ${want}`);
    }
  }

  const cond = (c) => ({ param: c.param, paramName: CLEAR_PARAM_NAMES[c.param] ?? null, value: c.value, count: c.count });
  const row = {
    questId: record.Id,
    index: record.Index,
    type: { value: record.Type, name: TYPE_NAMES[record.Type] ?? null },
    subType: { value: record.SubType, name: SUBTYPE_NAMES[record.SubType] ?? null },
    level: record.Level,
    rank: levelRank(record.Level),
    enemyLevel: record.EnemyLevel,
    map: { value: record.Map, base: night ? record.Map - 100 : record.Map, night },
    startType: record.StartType,
    timeLimitMin: record.QuestTime,
    faints: record.Faints,
    arenaEquipId: record.ArenaEquipId,
    bgmType: record.BgmType,
    requirements: { r1: record.Requirement1, r2: record.Requirement2, combo: record.ComboRequirement },
    clearType: record.ClearType,
    gekitaiHp: record.GekitaiHp,
    conditions: record.ClearConditions.map(cond),
    subCondition: cond(record.SubClearCondition),
    levels: { carve: record.CarveLevel, gathering: record.GatheringLevel, fishing: record.FishingLevel },
    reward: {
      fee: record.Fee, villagePoints: record.VillagePoints, reward: record.Reward, subReward: record.SubReward,
      clearVillagePoints: record.ClearVillagePoints, failVillagePoints: record.FailVillagePoints,
      subVillagePoints: record.SubVillagePoints, hrp: record.HunterRankPoints, subHrp: record.SubHunterRankPoints,
      villagePointsG: record.VillagePointsG,
    },
    remAdd: { frame: record.RemAddFrame, lotMax: record.RemAddLotMax },
    supplies: record.Supplies,
    monsters,
    smallMonsterIndex: record.SmallMonsterIndex,
    enemySets: record.EnemySets,
    bossRushType: record.BossRushType,
    spawns: record.MonsterSpawns,
    stray: { ...record.Stray, limit345: record.StrayLimit345, rand345: record.StrayRand345 },
    extraTicketCount: record.ExtraTicketCount,
    icons: record.Icons,
    progNum: record.ProgNum,
    textFiles: Object.fromEntries(record.Info.map((x) => [x.lang, x.name])),
    flags: record.Flags,
    links: link
      ? {
          bossSet: link.bossSet, emSetList: link.emSetList, remMain: link.remMain, remAdd: link.remAdd,
          remSub: link.remSub, supp: link.supp, plus: link.plus,
        }
      : null,
    db: db
      ? {
          name: db.name, goal: db.goal, subGoal: db.sub_goal, hub: db.hub, rank: db.rank, stars: db.stars,
          locationId: db.location_id, timeLimit: db.time_limit, fee: db.fee, reward: db.reward, hrp: db.hrp,
          permitMonsterId: db.permit_monster_id,
        }
      : null,
  };
  return { row, warnings };
}

/** Flatten a normalised row into the TSV column order. */
export function rowToTsv(row, file = '') {
  const c = (x) => (x === null || x === undefined ? '' : String(x));
  const map = {
    quest_id: row.questId, file, index: row.index,
    type: row.type.value, type_name: c(row.type.name),
    sub_type: row.subType.value, sub_type_name: c(row.subType.name),
    level: row.level, rank: row.rank, enemy_level: row.enemyLevel,
    map: row.map.value, map_base: row.map.base, map_night: row.map.night ? 1 : 0,
    start_type: row.startType, time_limit: row.timeLimitMin, faints: row.faints,
    arena_equip: row.arenaEquipId, bgm_type: row.bgmType,
    requirement1: row.requirements.r1, requirement2: row.requirements.r2, combo_requirement: row.requirements.combo,
    clear_type: row.clearType, gekitai_hp: row.gekitaiHp,
    cond0_param: row.conditions[0].param, cond0_value: row.conditions[0].value, cond0_count: row.conditions[0].count,
    cond1_param: row.conditions[1].param, cond1_value: row.conditions[1].value, cond1_count: row.conditions[1].count,
    sub_cond_param: row.subCondition.param, sub_cond_value: row.subCondition.value, sub_cond_count: row.subCondition.count,
    carve_level: row.levels.carve, gathering_level: row.levels.gathering, fishing_level: row.levels.fishing,
    fee: row.reward.fee, village_points: row.reward.villagePoints, reward: row.reward.reward,
    sub_reward: row.reward.subReward, clear_village_points: row.reward.clearVillagePoints,
    fail_village_points: row.reward.failVillagePoints, sub_village_points: row.reward.subVillagePoints,
    hrp: row.reward.hrp, sub_hrp: row.reward.subHrp, village_points_g: row.reward.villagePointsG,
    rem_add_frame: row.remAdd.frame.join(','), rem_add_lot_max: row.remAdd.lotMax,
    supply0: `${row.supplies[0].label}/${row.supplies[0].type}/${row.supplies[0].target}/${row.supplies[0].count}`,
    supply1: `${row.supplies[1].label}/${row.supplies[1].type}/${row.supplies[1].target}/${row.supplies[1].count}`,
    monsters: row.monsters.filter((m) => m.Id !== 0).map(compactMonster).join(';'),
    small_monster_index: [row.smallMonsterIndex.Hp, row.smallMonsterIndex.Attack, row.smallMonsterIndex.Other].join('/'),
    enemy_sets: row.enemySets.map((e) => `${e.SetType}/${e.TargetId}/${e.TargetCount}`).join(';'),
    boss_rush_type: row.bossRushType,
    spawns: row.spawns.map((s) => `${s.SpawnType}/${s.TargetType}/${s.Count}`).join(';'),
    stray: `${row.stray.Rand}/${row.stray.StartTime}/${row.stray.StartRand}|${row.stray.limit345.join('/')}|${row.stray.rand345.join('/')}`,
    extra_ticket: row.extraTicketCount, icons: row.icons.join(','), prog_num: row.progNum, flags: row.flags,
    text_files: Object.entries(row.textFiles).map(([k, v]) => `${k}=${v}`).join(','),
    link_boss_set: row.links ? row.links.bossSet.join(',') : '',
    link_em_set: row.links ? row.links.emSetList.join(',') : '',
    link_rem_main: row.links ? row.links.remMain.join(',') : '',
    link_rem_add: row.links ? row.links.remAdd.join(',') : '',
    link_rem_sub: row.links ? row.links.remSub : '',
    link_supp: row.links ? row.links.supp : '',
    link_plus: row.links ? row.links.plus : '',
    kb_em_arc: row.monsters[0]?.kb?.em_arc ?? '', kb_hp_rate: row.monsters[0]?.kb?.hp_rate ?? '',
    kb_hp_estimate: row.monsters[0]?.kb?.hp_estimate ?? '', kb_atk_rate: row.monsters[0]?.kb?.atk_rate ?? '',
    kb_boss_set: row.monsters[0]?.kb?.boss_set ?? '',
    db_name: row.db ? row.db.name : '', db_goal: row.db ? row.db.goal : '',
    db_hub: row.db ? row.db.hub : '', db_rank: row.db ? row.db.rank : '',
  };
  return TSV_FIELDS.map((f) => {
    const v = map[f];
    if (v === undefined || v === null) return '';
    return String(v).replace(/[\t\r\n]/g, ' ');
  }).join('\t');
}

// ---- optional inputs: mhgu.db and the gu-quest-monsters.tsv KB --------------------------------

export async function openMhguDb(dbPath) {
  let sqlite;
  try {
    sqlite = await import('node:sqlite');
  } catch (err) {
    throw new Error(`--db ${dbPath} needs node:sqlite (Node >= 22.5 with the built-in module): ${err.message}`);
  }
  if (!fs.existsSync(dbPath)) throw new Error(`--db: no such file ${dbPath}`);
  const db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
  const stmt = db.prepare(
    'SELECT _id, name, goal, sub_goal, hub, rank, stars, location_id, time_limit, fee, reward, hrp, sub_reward, sub_hrp, permit_monster_id FROM quests WHERE _id = ?',
  );
  return {
    close: () => db.close(),
    quest: (id) => stmt.get(id) ?? null,
    count: () => db.prepare('SELECT COUNT(*) AS n FROM quests').get().n,
  };
}

export function readKbTsv(tsvPath) {
  if (!fs.existsSync(tsvPath)) throw new Error(`--kb: no such file ${tsvPath}`);
  const text = fs.readFileSync(tsvPath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length && !l.startsWith('#'));
  const head = lines[0].split('\t');
  const byQuest = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    if (cols.length !== head.length) continue;
    const row = {};
    head.forEach((h, i) => { row[h] = cols[i]; });
    const key = String(row.quest_id).padStart(7, '0');
    if (!byQuest.has(key)) byQuest.set(key, []);
    byQuest.get(key).push(row);
  }
  return { byQuest, rows: lines.length - 1, columns: head };
}

// ---- file discovery ---------------------------------------------------------------------------

export const EXT_RE = /^questData_(\d{7})\.[^\\/]+$/;
export const QDL_RE = /^questLink_(\d{7})\.[^\\/]+$/;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Expand file/dir arguments into quest .ext paths (sorted), plus a qdl map id -> path. */
export function collectQuests(args) {
  const exts = [];
  const qdls = new Map();
  const seen = new Set();
  for (const a of args) {
    const st = fs.statSync(a, { throwIfNoEntry: false });
    if (!st) throw new Error(`no such path ${a}`);
    const files = st.isDirectory() ? walk(a, []) : [a];
    for (const f of files) {
      const base = path.basename(f);
      const em = EXT_RE.exec(base);
      if (em) { if (!seen.has(f)) { seen.add(f); exts.push(f); } continue; }
      const qm = QDL_RE.exec(base);
      if (qm) qdls.set(qm[1], f);
    }
  }
  exts.sort((a, b) => a.localeCompare(b));
  return { exts, qdls };
}

function findQdl(extPath, questId, opts) {
  if (opts.qdl) return fs.existsSync(opts.qdl) ? opts.qdl : null;
  if (opts.qdlDir) {
    const dir = opts.qdlDir;
    const hit = fs.readdirSync(dir).find((n) => QDL_RE.exec(n)?.[1] === questId);
    return hit ? path.join(dir, hit) : null;
  }
  const sibling = path.join(path.dirname(extPath), '..', 'questLink');
  if (fs.existsSync(sibling)) {
    const hit = fs.readdirSync(sibling).find((n) => QDL_RE.exec(n)?.[1] === questId);
    if (hit) return path.join(sibling, hit);
  }
  return null;
}

// ---- CLI --------------------------------------------------------------------------------------

class UsageError extends Error {}

function parseArgs(argv) {
  const out = { _: [], flag: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--flag') out.flag = true;
    else if (a === '--json') out.json = true;
    else if (a === '--qdl') out.qdl = argv[++i];
    else if (a === '--qdl-dir') out.qdlDir = argv[++i];
    else if (a === '--db') out.db = argv[++i];
    else if (a === '--kb') out.kb = argv[++i];
    else if (a === '--tmp') out.tmp = argv[++i];
    else if (a === '--expect') out.expect = Number(argv[++i]);
    else if (a.startsWith('--')) throw new UsageError(`unknown option ${a}`);
    else out._.push(a);
  }
  return out;
}

function buildOpts(args, deps) {
  const opts = { qdl: args.qdl, qdlDir: args.qdlDir, db: deps.db, kb: deps.kb };
  return opts;
}

function loadOne(extPath, questId, opts) {
  const parsed = parseQuestExt(fs.readFileSync(extPath), extPath);
  const qdlPath = findQdl(extPath, questId ?? String(parsed.record.Id).padStart(7, '0'), opts);
  let link = null;
  let linkWarnings = [];
  if (qdlPath) {
    const l = parseQuestLink(fs.readFileSync(qdlPath), qdlPath);
    link = l;
    linkWarnings = l.warnings;
  }
  return { ...parsed, link, qdlPath, warnings: [...parsed.warnings, ...linkWarnings], file: extPath };
}

async function cmdOne(args, deps) {
  const file = args._[0];
  if (!file) throw new UsageError('one takes <file.ext>');
  const loaded = loadOne(file, EXT_RE.exec(path.basename(file))?.[1], buildOpts(args, deps));
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ file, record: loaded.record, links: loaded.link, warnings: loaded.warnings }, null, 2)}\n`);
  } else {
    const r = loaded.record;
    console.log(`${path.basename(file)}  Id=${r.Id} Index=${r.Index} Type=${r.Type}(${TYPE_NAMES[r.Type] ?? '?'}) SubType=${r.SubType}(${SUBTYPE_NAMES[r.SubType] ?? '?'})`);
    console.log(`  Level=${r.Level}(${levelRank(r.Level)}) EnemyLevel=${r.EnemyLevel} Map=${r.Map} StartType=${r.StartType} QuestTime=${r.QuestTime}min Faints=${r.Faints}`);
    console.log(`  ClearType=${r.ClearType} conds=${JSON.stringify(r.ClearConditions)} sub=${JSON.stringify(r.SubClearCondition)}`);
    console.log(`  Fee=${r.Fee} VillagePoints=${r.VillagePoints} Reward=${r.Reward} SubReward=${r.SubReward} HRP=${r.HunterRankPoints} SubHRP=${r.SubHunterRankPoints}`);
    const live = r.Monsters.filter((m) => m.Id !== 0);
    console.log(`  Monsters=${live.length}: ${live.map((m) => `${m.Id}(hp ${m.HealthTbl}/atk ${m.AtkTbl}/oth ${m.OtherTbl}/size ${m.Size}/${m.SizeTbl}/stam ${m.StaminaTbl})`).join(' ')}`);
    console.log(`  Icons=${r.Icons.join(',')} ExtraTicket=${r.ExtraTicketCount} Flags=${r.Flags} VillagePointsG=${r.VillagePointsG}`);
    console.log(`  TextFiles=${r.Info.map((x) => `${x.lang}:${x.name}`).join(' ')}`);
    if (loaded.link) {
      console.log(`  qdl=${path.basename(loaded.qdlPath)} bossSet=${loaded.link.bossSet.filter(Boolean).join(',')} emSet=${loaded.link.emSetList.filter(Boolean).join(',')} remMain=${loaded.link.remMain.filter(Boolean).join(',')} supp=${loaded.link.supp}`);
    } else {
      console.log('  qdl=(not found)');
    }
    for (const w of loaded.warnings) console.log(`  WARN ${w}`);
  }
  return loaded.warnings.length && !args.flag ? 1 : 0;
}

async function cmdRow(args, deps) {
  const file = args._[0];
  if (!file) throw new UsageError('row takes <file.ext>');
  const id = EXT_RE.exec(path.basename(file))?.[1];
  const loaded = loadOne(file, id, buildOpts(args, deps));
  const dbRow = deps.db && id ? deps.db.quest(Number(id)) : null;
  const kbRows = deps.kb && id ? deps.kb.byQuest.get(id) ?? null : null;
  const { row, warnings } = normaliseQuest(loaded.record, loaded.link, { dbRow, kbRows });
  process.stdout.write(`${JSON.stringify({ ...row, warnings: [...loaded.warnings, ...warnings] }, null, 2)}\n`);
  return [...loaded.warnings, ...warnings].length && !args.flag ? 1 : 0;
}

async function cmdTsv(args, deps) {
  if (args._.length === 0) throw new UsageError('tsv takes <file|dir>...');
  const { exts, qdls } = collectQuests(args._);
  if (exts.length === 0) throw new Error('no questData_<7d>.<suffix> file found');
  process.stdout.write(`${TSV_FIELDS.join('\t')}\n`);
  let warned = 0;
  for (const ext of exts) {
    const id = EXT_RE.exec(path.basename(ext))[1];
    const parsed = parseQuestExt(fs.readFileSync(ext), ext);
    const qdlPath = findQdl(ext, id, buildOpts(args, deps)) ?? qdls.get(id) ?? null;
    const link = qdlPath ? parseQuestLink(fs.readFileSync(qdlPath), qdlPath) : null;
    const dbRow = deps.db ? deps.db.quest(Number(id)) : null;
    const kbRows = deps.kb ? deps.kb.byQuest.get(id) ?? null : null;
    const { row, warnings } = normaliseQuest(parsed.record, link, { dbRow, kbRows });
    const all = [...parsed.warnings, ...(link ? link.warnings : []), ...warnings];
    warned += all.length;
    process.stdout.write(`${rowToTsv(row, path.basename(ext))}\n`);
    for (const w of all) process.stderr.write(`WARN ${id}: ${w}\n`);
  }
  process.stderr.write(`tsv: ${exts.length} quest(s), ${warned} warning(s)\n`);
  return warned && !args.flag ? 1 : 0;
}

/**
 * The dossier's acceptance check: Id (record +0x004) and QuestTime (record +0x00E) must equal
 * mhgu.db.quests._id / time_limit for every quest that exists in both. `--expect n` makes the mode
 * fail if fewer than n quests were compared (the dossier's figure is 400).
 */
async function cmdVerifyDb(args, deps) {
  if (!deps.db) throw new UsageError('verify-db needs --db <mhgu.db>');
  const { exts } = collectQuests(args._);
  if (exts.length === 0) throw new Error('no questData_<7d>.<suffix> file found');
  let compared = 0;
  let matched = 0;
  let notInDb = 0;
  const failures = [];
  for (const ext of exts) {
    const id = EXT_RE.exec(path.basename(ext))[1];
    let parsed;
    try {
      parsed = parseQuestExt(fs.readFileSync(ext), ext);
    } catch (err) {
      failures.push(`${id}: parse failed: ${err.message}`);
      continue;
    }
    const dbRow = deps.db.quest(Number(id));
    if (!dbRow) { notInDb++; continue; }
    compared++;
    const errs = [];
    if (parsed.record.Id !== dbRow._id) errs.push(`Id ${parsed.record.Id} != db _id ${dbRow._id}`);
    if (parsed.record.QuestTime !== dbRow.time_limit) errs.push(`QuestTime ${parsed.record.QuestTime} != db time_limit ${dbRow.time_limit}`);
    if (parsed.record.Fee !== dbRow.fee) errs.push(`Fee ${parsed.record.Fee} != db fee ${dbRow.fee}`);
    if (parsed.record.Reward !== dbRow.reward) errs.push(`Reward ${parsed.record.Reward} != db reward ${dbRow.reward}`);
    if (dbRow.hrp !== null && parsed.record.HunterRankPoints !== dbRow.hrp) errs.push(`HRP ${parsed.record.HunterRankPoints} != db hrp ${dbRow.hrp}`);
    if (errs.length) failures.push(`${id}: ${errs.join('; ')}`);
    else matched++;
  }
  const expect = args.expect;
  console.log(`verify-db: ${exts.length} file(s), ${compared} present in mhgu.db, ${matched} fully matching, ${notInDb} not in db, ${failures.length} failing`);
  console.log('compared fields: Id(+0x004), QuestTime(+0x00E), Fee(+0x029), Reward(+0x031), HunterRankPoints(+0x045)');
  for (const f of failures) console.log(`  FAIL ${f}`);
  let code = failures.length ? 1 : 0;
  if (expect !== undefined) {
    if (!Number.isFinite(expect)) throw new UsageError('--expect takes a number');
    if (compared < expect) {
      console.log(`  FAIL only ${compared} quest(s) compared, --expect ${expect}`);
      code = 1;
    }
  }
  return code;
}

async function cmdCheck(args, deps) {
  if (args._.length === 0) throw new UsageError('check takes <file.ext>...');
  let bad = 0;
  for (const file of args._) {
    const id = EXT_RE.exec(path.basename(file))?.[1] ?? null;
    try {
      const loaded = loadOne(file, id, buildOpts(args, deps));
      const nameId = id ? Number(id) : null;
      const errs = [...loaded.warnings];
      if (nameId !== null && loaded.record.Id !== nameId) errs.push(`record Id ${loaded.record.Id} != file id ${nameId}`);
      if (errs.length) {
        bad++;
        console.log(`FAIL ${path.basename(file)}`);
        for (const e of errs) console.log(`  ${e}`);
      } else {
        console.log(`ok   ${path.basename(file)} Id=${loaded.record.Id} QuestTime=${loaded.record.QuestTime}${loaded.link ? ' (+qdl)' : ''}`);
      }
    } catch (err) {
      bad++;
      console.log(`FAIL ${path.basename(file)}: ${err.message}`);
    }
  }
  return bad ? 1 : 0;
}

// ---- self-test --------------------------------------------------------------------------------

/** Build a synthetic 361 B record (valid by construction) for the fixtures. */
export function synthRecord(over = {}) {
  const f = {
    Index: 0, Id: 40411, Type: 2, SubType: 11, Level: 111, EnemyLevel: 5, Map: 23, StartType: 1,
    QuestTime: 50, Faints: 3, ClearType: 0, Fee: 3000, VillagePoints: 0, Reward: 30000, SubReward: 3300,
    HRP: 1920, SubHRP: 190, Flags: 768, ...over,
  };
  const rec = Buffer.alloc(RECORD_SIZE);
  rec.writeInt32LE(f.Index, 0x000);
  rec.writeInt32LE(f.Id, 0x004);
  rec[0x008] = f.Type; rec[0x009] = f.SubType; rec[0x00a] = f.Level; rec[0x00b] = f.EnemyLevel;
  rec[0x00c] = f.Map; rec[0x00d] = f.StartType; rec[0x00e] = f.QuestTime; rec[0x00f] = f.Faints;
  rec[0x015] = f.ClearType;
  const cond = (o, param, value, count) => { rec[o] = param; rec.writeUInt16LE(value, o + 1); rec.writeUInt16LE(count, o + 3); };
  cond(0x017, 2, 1025, 1);
  cond(0x021, 8, 1025, 1);
  rec.writeInt32LE(f.Fee, 0x029); rec.writeInt32LE(f.VillagePoints, 0x02d); rec.writeInt32LE(f.Reward, 0x031);
  rec.writeInt32LE(f.SubReward, 0x035); rec.writeInt32LE(f.HRP, 0x045); rec.writeInt32LE(f.SubHRP, 0x049);
  const mon = (o, m) => {
    rec.writeUInt16LE(m.Id, o); rec[o + 2] = m.SubType ?? 0; rec[o + 3] = m.AuraType ?? 0; rec[o + 4] = m.Restore ?? 1;
    rec[o + 5] = m.HealthTbl ?? 71; rec[o + 6] = m.AtkTbl ?? 97; rec[o + 7] = m.OtherTbl ?? 87;
    rec[o + 8] = m.Difficulty ?? 1; rec.writeUInt16LE(m.Size ?? 100, o + 9); rec[o + 11] = m.SizeTbl ?? 40;
    rec[o + 12] = m.StaminaTbl ?? 3;
  };
  mon(0x05c, { Id: 1025 });
  const info = (i, lang, at) => {
    const o = 0x0d7 + 20 * i;
    rec.writeUInt32LE(0x242bb29a, o);
    rec.write(`${String(f.Id).padStart(7, '0')}_${lang}`, at ?? o + 4, 'latin1');
  };
  LANG_SLOTS.forEach((lang, i) => info(i, lang));
  rec.writeUInt16LE(f.Flags, 0x167);
  rec.layoutInfo = info;
  return rec;
}

function synthExt(rec, over = {}) {
  const buf = Buffer.alloc(EXT_SIZE);
  buf.writeUInt32LE(MAGIC, 0);
  buf.writeInt32LE(over.count ?? 1, 4);
  rec.copy(buf, HEADER_SIZE);
  return buf;
}

function synthQdl(names) {
  const buf = Buffer.alloc(LINK_SIZE);
  buf.writeUInt32LE(MAGIC, 0);
  buf.writeInt32LE(1, 4);
  const kinds = LINK_LAYOUT;
  let at = 0;
  for (const [kind, count] of kinds) {
    for (let i = 0; i < count; i++, at++) {
      const name = names[at] ?? '';
      buf.writeUInt32LE(LINK_HASH[kind], HEADER_SIZE + 20 * at);
      buf.write(name, HEADER_SIZE + 20 * at + 4, 'latin1');
    }
  }
  return buf;
}

async function selftest(args) {
  const tmp = args.tmp ?? path.join(process.env.QUESTEXT_TMP ?? 'G:/tmp', 'quest-ext-selftest');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  let pass = 0;
  let fail = 0;
  const ok = (label, cond, detail = '') => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`); }
  };
  const throws = (label, fn, re) => {
    try { fn(); ok(label, false, 'no error thrown'); }
    catch (err) { ok(label, re.test(err.message), `wrong error: ${err.message}`); }
  };

  console.log('selftest: fixtures');
  const good = synthRecord();
  const goodExt = synthExt(good);
  const goodQdl = synthQdl([
    'b_m23em001_00', 'b_m00em000_00', 'b_m00em000_00', 'b_m00em000_00', 'b_m00em000_00',
    'z_m23d_001', 'z_m00d_000', 'z_m00d_000',
    'rem_210052', 'rem_210001', 'rem_000000', 'rem_000000', 'rem_210051',
    'supp_0040411', '0000',
  ]);
  const extPath = path.join(tmp, 'questData_0040411.ext');
  const qdlPath = path.join(tmp, 'questLink_0040411.qdl');
  fs.writeFileSync(extPath, goodExt);
  fs.writeFileSync(qdlPath, goodQdl);

  // 1. the valid fixture parses and yields the expected values
  {
    const { record, warnings } = parseQuestExt(fs.readFileSync(extPath), 'good');
    ok('valid record: Id 40411', record.Id === 40411, String(record.Id));
    ok('valid record: QuestTime 50', record.QuestTime === 50, String(record.QuestTime));
    ok('valid record: 0 warnings', warnings.length === 0, warnings.join('; '));
    ok('valid record: condition {2,1025,1}', JSON.stringify(record.ClearConditions[0]) === '{"param":2,"value":1025,"count":1}');
    ok('valid record: monster 1025 hp 71', record.Monsters[0].Id === 1025 && record.Monsters[0].HealthTbl === 71);
    ok('valid record: 7 text files', record.Info.filter((x) => x.name).length === 7);
  }
  // 2. KNOWN-BAD: wrong size / magic / count must be rejected
  throws('bad size 368 B is rejected', () => parseQuestExt(goodExt.subarray(0, 368), 'short'), /expected 369/);
  throws('bad size 370 B is rejected', () => parseQuestExt(Buffer.concat([goodExt, Buffer.alloc(1)]), 'long'), /expected 369/);
  {
    const b = Buffer.from(goodExt); b.writeUInt32LE(0x434b0001, 0);
    throws('bad magic is rejected', () => parseQuestExt(b, 'magic'), /bad magic/);
  }
  {
    const b = Buffer.from(goodExt); b.writeInt32LE(2, 4);
    throws('header count 2 is rejected', () => parseQuestExt(b, 'count'), /header count 2/);
  }
  // 3. KNOWN-BAD: an Info slot read 3 B instead of 4 B into the slot (the offset error this
  //    reader was written to exclude) must be reported by the structural check
  {
    const rec = synthRecord();
    for (let i = 0; i < 7; i++) {
      const o = 0x0d7 + 20 * i;
      rec.fill(0, o + 4, o + 20);
      rec.write(`${String(40411).padStart(7, '0')}_${LANG_SLOTS[i]}`.slice(1), o + 3, 'latin1');
    }
    const { warnings } = parseQuestRecord(rec, 'shifted');
    ok('Info slot shifted by 1 B is flagged', warnings.some((w) => /is not <7d>_eng/.test(w)), warnings.join('; '));
  }
  // 4. KNOWN-BAD: field values outside their domain
  {
    const { warnings } = parseQuestRecord(synthRecord({ QuestTime: 200 }), 'time');
    ok('QuestTime 200 is flagged', warnings.some((w) => /QuestTime 200/.test(w)));
    const { warnings: w2 } = parseQuestRecord(synthRecord({ Type: 9 }), 'type');
    ok('Type 9 is flagged', w2.some((w) => /Type 9/.test(w)));
  }
  // 5. KNOWN-BAD: record Id disagreeing with the file name (the check `check` mode performs)
  {
    const p = path.join(tmp, 'questData_0040411.mismatch');
    fs.writeFileSync(p, synthExt(synthRecord({ Id: 40412 })));
    const code = await cmdCheck({ _: [p], flag: false }, { db: null, kb: null });
    ok('Id/filename mismatch fails check', code === 1, `exit ${code}`);
  }
  // 6. qdl
  {
    const link = parseQuestLink(fs.readFileSync(qdlPath), 'good.qdl');
    ok('qdl bossSet[0] = b_m23em001_00', link.bossSet[0] === 'b_m23em001_00');
    ok('qdl remSub = rem_210051', link.remSub === 'rem_210051');
    ok('qdl supp = supp_0040411', link.supp === 'supp_0040411');
    ok('qdl good fixture has 0 warnings', link.warnings.length === 0, link.warnings.join('; '));
    throws('qdl 307 B is rejected', () => parseQuestLink(goodQdl.subarray(0, 307), 'short'), /expected 308/);
    const wrongHash = Buffer.from(goodQdl);
    wrongHash.writeUInt32LE(LINK_HASH.RemMain, HEADER_SIZE);   // boss slot 0 carrying the rem hash
    const l2 = parseQuestLink(wrongHash, 'wronghash');
    ok('qdl kind hash mismatch is flagged', l2.warnings.some((w) => /name\/kind mismatch/.test(w)), l2.warnings.join('; '));
  }
  // 7. KB cross-check: a gu-quest-monsters.tsv row that disagrees with the .ext must warn
  {
    const kbRows = [{ quest_id: '0040411', slot: '0', monster_id: '1025', em_arc: 'em001_04', health_tbl: '70', atk_tbl: '97',
      other_tbl: '87', size_pct: '100', size_tbl: '40', stamina_tbl: '3', sub_type: '0', aura_type: '0', restore: '1',
      difficulty: '1', hp_rate: '2.23', hp_estimate: '11150', atk_rate: '6.2', other_rate_b: '5.2', boss_set: 'b_m23em001_00',
      db_hyper: '0', db_unstable: '0', name_en: 'Dreadqueen Rathian', base_hp: '5000' }];
    const { record } = parseQuestExt(fs.readFileSync(extPath), 'kb');
    const { warnings } = normaliseQuest(record, null, { dbRow: null, kbRows });
    ok('KB health_tbl disagreement is flagged', warnings.some((w) => /HealthTbl: .ext 71 != KB health_tbl 70/.test(w)), warnings.join('; '));
    const agree = [{ ...kbRows[0], health_tbl: '71' }];
    const { warnings: w2 } = normaliseQuest(record, null, { dbRow: null, kbRows: agree });
    ok('KB agreement produces no warning', w2.length === 0, w2.join('; '));
  }
  // 8. verify-db against a synthetic db: matching record passes, then a known-bad one fails
  {
    let sqlite = null;
    try { sqlite = await import('node:sqlite'); } catch { sqlite = null; }
    if (!sqlite) {
      console.log('  skip verify-db (node:sqlite unavailable)');
    } else {
      const dbPath = path.join(tmp, 'fixture.db');
      fs.rmSync(dbPath, { force: true });
      const db = new sqlite.DatabaseSync(dbPath);
      db.exec('CREATE TABLE quests (_id INTEGER PRIMARY KEY, name TEXT, goal TEXT, sub_goal TEXT, hub TEXT, rank TEXT, stars INTEGER, location_id INTEGER, time_limit INTEGER, fee INTEGER, reward INTEGER, hrp INTEGER, sub_reward INTEGER, sub_hrp INTEGER, permit_monster_id INTEGER)');
      db.exec("INSERT INTO quests VALUES (40411,'q','g','s','Permit','G',11,23,50,3000,30000,1920,3300,190,1025)");
      db.close();
      const dir = path.join(tmp, 'dbmatch');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'questData_0040411.ext'), goodExt);
      const depsOk = { db: await openMhguDb(dbPath), kb: null };
      const c1 = await cmdVerifyDb({ _: [dir], flag: false, expect: 1 }, depsOk);
      ok('verify-db: matching record passes (--expect 1)', c1 === 0, `exit ${c1}`);
      const c2 = await cmdVerifyDb({ _: [dir], flag: false, expect: 400 }, depsOk);
      ok('verify-db: --expect 400 fails with 1 compared', c2 === 1, `exit ${c2}`);
      const dir2 = path.join(tmp, 'dbwrong');
      fs.mkdirSync(dir2, { recursive: true });
      fs.writeFileSync(path.join(dir2, 'questData_0040411.ext'), synthExt(synthRecord({ QuestTime: 40 })));
      const c3 = await cmdVerifyDb({ _: [dir2], flag: false }, depsOk);
      ok('verify-db: wrong QuestTime fails', c3 === 1, `exit ${c3}`);
      depsOk.db.close();
    }
  }
  // 9. the real corpus, when present: the dossier's 400/400 Id+QuestTime claim
  const realDir = 'G:/omp works/MHGU-private/romfs-extract/vital/quest/loc/quest/questData';
  const realDb = 'G:/omp works/MHGU/docs/data/mhgu.db';
  if (fs.existsSync(realDir) && fs.existsSync(realDb)) {
    const deps = { db: await openMhguDb(realDb), kb: null };
    const code = await cmdVerifyDb({ _: [realDir], flag: false, expect: 400 }, deps);
    ok('real corpus: >= 400 records match mhgu.db on Id/QuestTime/Fee/Reward/HRP', code === 0, `exit ${code}`);
    deps.db.close();
  } else {
    console.log('  skip real corpus (extract or mhgu.db missing)');
  }

  console.log(`selftest: ${pass} passed, ${fail} failed`);
  return fail ? 1 : 0;
}

// ---- entry point ------------------------------------------------------------------------------

function usageText() {
  return [
    'usage: node quest-ext.mjs <command> [options]',
    '  one <file.ext> [--qdl <file>] [--json]                 print one decoded record',
    '  row <file.ext> [--qdl <file>] [--db <mhgu.db>] [--kb <tsv>]   print one normalised JSON row',
    '  tsv <file|dir>... [--qdl-dir <dir>] [--db <db>] [--kb <tsv>]  one TSV line per quest',
    '  verify-db <file|dir>... --db <mhgu.db> [--expect <n>]  Id/QuestTime/Fee/Reward/HRP vs mhgu.db',
    '  check <file.ext>... [--qdl <file>]                     structural check (exit 1 on any finding)',
    '  selftest [--tmp <dir>]                                 fixtures incl. known-bad samples',
    '  --flag    report warnings without failing the run',
    '',
    'record: 369 B = 8 B header (magic 0x434b0000, count 1) + 361 B pack(1) record',
    'links : 308 B = 8 B header + 15 x {u32 typeHash, char[16]} BossSet[5] EmSetList[3] RemMain[2] RemAdd[2] RemSub Supp Plus',
  ].join('\n');
}

async function main(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(usageText());
    return 0;
  }
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === 'selftest') return selftest(args);
  const deps = { db: null, kb: null };
  if (args.db) deps.db = await openMhguDb(args.db);
  if (args.kb) deps.kb = readKbTsv(args.kb);
  try {
    switch (command) {
      case 'one': return await cmdOne(args, deps);
      case 'row': return await cmdRow(args, deps);
      case 'tsv': return await cmdTsv(args, deps);
      case 'verify-db': return await cmdVerifyDb(args, deps);
      case 'check': return await cmdCheck(args, deps);
      default: throw new UsageError(`unknown command ${command}`);
    }
  } finally {
    if (deps.db) deps.db.close();
  }
}

const invokedDirectly = (() => {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return fs.realpathSync(arg) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();

if (invokedDirectly) {
  try {
    const code = await main(process.argv.slice(2));
    process.exitCode = code;
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`error: ${err.message}`);
      console.error(usageText());
      process.exitCode = 2;
    } else {
      console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  }
}
