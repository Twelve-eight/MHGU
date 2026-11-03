// seeds-from-strings.mjs — label functions from the strings they demonstrably reference.
//
// Channel: stringxref.tsv proves that a function materialises the address of a given string (register-tracked ldr [pc]
// plus rodata table entries, no guessing). The label then comes from the string's own vocabulary, not from a guess about
// the function. Two guards keep the channel honest:
//   1. dominance — the winning label must cover >= 60% of the function's labelled references, so a generic serialiser that
//      mentions one item field among ten save fields is not called item code;
//   2. specificity — a token rule must be a name that states its subsystem (nvn = NVN graphics API, nn::nex = Nintendo
//      NEX, uShell = shell UI, cWeaponNN = weapon data, emUniqueAct = monster action). No bare /Mt/, no single letters.
// Output: attr-strings2.tsv plus a review sample printed to stdout.
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:/omp works/MHGU";
const SRC = path.join(ROOT, "docs/analysis/code/inventory/stringxref.tsv");
const OUT = path.join(ROOT, "docs/analysis/code/inventory/attr-strings2.tsv");
const SAMPLE = path.join(ROOT, "docs/analysis/code/inventory/strings2-review.tsv");

const RULES = [
  ["render-gfx", /^nvn[A-Z]/, "NVN graphics API entry points (nvnDevice*, nvnCommandBuffer*)"],
  ["online-nex", /^(?:Nex(?!t)|nn::nex|nn::pia|nFestaNetwork|FestaNetwork)/, "Nintendo NEX/PIA and the Festa online service symbols"],
  ["ui", /^uShell[A-Z]/, "uShell* shell UI resource and setup-param names"],
  ["item", /^mItem/, "item-slot field names (mItem[0], mItemNum, mItemPackPrizeNo)"],
  ["weapon-wp", /^cWeapon\d\d/, "cWeaponNN data/message class names"],
  ["monster-em", /^em(?:UniqueAct|XXX|\d\d\d)/, "monster action symbols (emUniqueActMain, emXXXFwMove)"],
  ["save-data", /^mSaveData|^SaveData::/, "save-data field names"],
  ["quest", /^mQuest|^QuestData::|^uQuest/, "quest record field names"],
  // second wave: families whose own spelling names the subsystem, each with the counter-example that keeps it honest
  ["render-gfx", /^(?:nDraw|nvn|nScreenShot|mLight(?:Pos|Dir|Cone|Spread|Color)|rCloud|rFog|rLight|rShadow|rShader|rModel)/, "draw/light/shader symbols (nDraw::*, mLight*, rShader*)"],
  ["online-nex", /^(?:RendezVous|nn::(?:nex|pia)|N2nn3(?:nex|pia)|Nex[A-Z][a-z]|net_|mParam\.net_|Matchmake|Ngs)/, "RendezVous/NEX/PIA symbols and net_* member paths"],
  ["weapon-wp", /^(?:rSquatshot|cInsect|rInsect|cWeapon|rWeapon|cBowgun|rBowgun|cChargeAx|rChargeAx)/, "weapon data families (rSquatshot = bowgun squat shot, cInsect = kinsect)"],
  ["item", /^(?:cCoinTrade|rCoinTrade|rEquipShop|cShop|rShop|cItemBox|mItemBox)/, "shop/trade/item-box families"],
  ["audio", /^(?:cSe(?!tup|tPara)|rSe[A-Z]|sSe[A-Z]|Ase[A-Z]|Wwise|bgm|BGM)/, "Se/Ase/Wwise/bgm sound symbols (cSet* is setup code and is excluded)"],
  ["monster-em", /^(?:em->|emXXX|rEm|rMonster[A-Z]|cEm[A-Z])/, "monster instance/member paths and rEm* resources"],
  ["physics-math", /^(?:mPointPos|mRadius|mMinRadius|mCapsule|mSphere|mPlane|Collision|rCollision)/, "collision/math parameter names"],
  ["save-data", /^(?:mSaveData|SaveData::|mSave[A-Z])/, "save record field names"],
];

function labelOf(str) {
  for (const [label, re, why] of RULES) if (re.test(str)) return { label, why };
  return null;
}

const byFn = new Map();
for (const l of fs.readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean).slice(1)) {
  const [start, str] = l.split("\t");
  if (!byFn.has(start)) byFn.set(start, []);
  byFn.get(start).push(str);
}

const out = [["start", "label", "conf", "evidence"]];
const review = [["start", "label", "labelled/total", "strings"]];
let accepted = 0;
const perLabel = new Map();
for (const [start, strs] of byFn) {
  const votes = new Map();
  for (const s of strs) {
    const h = labelOf(s);
    if (!h) continue;
    const v = votes.get(h.label) || { n: 0, why: h.why, ex: [] };
    v.n++;
    if (v.ex.length < 3) v.ex.push(s);
    votes.set(h.label, v);
  }
  if (!votes.size) continue;
  const [label, v] = [...votes].sort((a, b) => b[1].n - a[1].n)[0];
  // Dominance is measured against every string the function references, not only the ones a rule happens to label: a
  // village-record serialiser mentions six item fields among thirty village fields and is not item code.
  const namespaceKey = /^nvn[A-Z]|^Nex(?!t)|^nn::(?:nex|pia)|^uShell[A-Z]|^cWeapon\d\d/.test(v.ex[0]);
  if (namespaceKey) {
    if (v.n < 1) continue;
  } else {
    if (v.n / strs.length < 0.4 || v.n < 3) continue;
  }
  void label;
  accepted++;
  perLabel.set(label, (perLabel.get(label) || 0) + 1);
  out.push([start, label, "A", `${v.n} of ${strs.length} referenced strings are ${v.why}: ${v.ex.join(" | ")}`]);
  review.push([start, label, `${v.n}/${strs.length}`, v.ex.join(" | ")]);
}
fs.writeFileSync(OUT, out.map((r) => r.join("\t")).join("\n") + "\n");
fs.writeFileSync(SAMPLE, review.map((r) => r.join("\t")).join("\n") + "\n");
console.log(`accepted ${accepted} functions:`, [...perLabel].sort((a, b) => b[1] - a[1]).map((x) => x.join(":")).join(" "));
console.log(`review sample -> ${path.relative(ROOT, SAMPLE)}`);
