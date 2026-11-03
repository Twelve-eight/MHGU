// taxonomy.mjs — the subsystem rules, shared by the pipeline and every evidence generator.
//
// Order matters: the first matching rule wins. These patterns are deliberately concrete (class prefixes, file paths,
// API namespaces) because a vague pattern fires on library text and injects the wrong label into the call graph.
export const RULES = [
  ["online-nex", /(_ZN2nn3ldn|_ZN2nn6socket|_ZN2nn4nifm|Nex[A-Z]|Nex::|pia::|_ZN2nn3pia|Matchmake|SessionJob|MeshJob|HostMigration)/],
  ["save-data", /(savedata|saveData|SaveData|SaveSlot|save_slot)/],
  // engine classes were all falling into render-gfx through a bare /Mt/ rule; name them by what they do
  ["physics-math", /(MtCollision|MtGeomCapsule|MtGeomAabb|MtGeomRay)/],
  ["filesystem", /(MtFileStream|MtFileSystem|MtArchive)/],
  ["online-nex", /(MtNet|MtSocket)/],
  ["kernel-os", /(MtAllocator|MtExHeap|MtHeap|MtArray|MtList|MtTree|MtDti|MtThread|MtMutex|MtString)/],
  ["render-gfx", /(_ZN2nn3gfx|_ZN2nn3vi|shader|Shader|texture|Texture|MtRender|MtMesh|MtMaterial|MtGeom)/],
  ["audio", /(_ZN2nn5audio|_ZN2nn5sound|SndPlayer|SndMgr|Sofdec|criWare|\bbgm\b|BGM)/],
  ["ui", /(\bMenu[A-Z]|MenuBase|HudLayout|LayoutHud|gui::|UiLayout)/],
  ["monster-em", /(uEm\d{3}|cEm\d{3}|EnemyCharacter|MonsterUnit|mActionNo|rEnemyDt|emSetList|MhHitObj)/],
  ["player-pl", /(cPl\d{2}|uPl\d{2}|PlayerState|playerClass)/],
  ["weapon-wp", /(weapon\\|cWp\d{2}|Wp\d{2}_|weaponType|pEquipData)/],
  ["otomo-ot", /(otomo|Otomo|nyanter|Nyanter|cOt\d{2}|uOt\d{2})/],
  ["quest", /(questData|QuestData|QuestID|quest_id|rQuest)/],
  ["item", /(cItem|ItemData|_item\b|itmData)/],
  ["filesystem", /(romfs|Romfs|fw_fs|filesystem|FileDevice)/],
  ["physics-math", /(MtCollision|MhCollision|rigidBody|PhysicsWorld)/],
  ["kernel-os", /(_ZN2nn2os|_ZN2nn2fs|_ZN2nn3mem|_ZN2nn4util|MtAllocator|MtArray|MtList|MtTree|MtDti|MtThread|BitIO)/],
];

export const LABELS = new Set(RULES.map(([k]) => k));

export const labelOf = (s) => {
  for (const [k, re] of RULES) if (re.test(s)) return k;
  return null;
};
