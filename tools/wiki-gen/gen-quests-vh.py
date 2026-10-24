# Generator for MHGU/docs/wiki/quests-village-hub.md.
# Inputs: .tmp/mhgu/vh-quests.tsv (db export), .tmp/mhgu/questreq.csv (romfs quest ext scan),
# monster-slot-map.json (en -> cn), mhgu.db monster_to_quest.hyper.
import csv, json, sqlite3, collections
W = 'G:/omp works/'
rows = list(csv.DictReader(open(W + '.tmp/mhgu/vh-quests.tsv', encoding='utf8'), delimiter='\t'))
req = {int(r['id']): r for r in csv.DictReader(open(W + '.tmp/mhgu/questreq.csv', encoding='utf8'))}
sm = json.load(open(W + 'MHGU/docs/data/json/monster-slot-map.json', encoding='utf8'))
cn = {r['en']: r['cn'] for r in (sm['rows'] if isinstance(sm, dict) else sm) if r.get('en')}
db = sqlite3.connect(W + 'MHGU/docs/data/mhgu.db')
hyper = collections.defaultdict(set)
for qid, mname in db.execute("""SELECT mq.quest_id, m.name FROM monster_to_quest mq
                                JOIN monsters m ON m._id = mq.monster_id WHERE mq.hyper = 1"""):
    hyper[qid].add(mname)

def hr(v):
    v = int(v)
    return '—' if v == 0 else ('HR100' if v == 19 else f'HR{v + 1}' if v <= 18 else f'值{v}')

def mons(q):
    out = []
    for part in filter(None, (q['monsters'] or '').split(';')):
        name = part.split('(')[0].split('[')[0]
        tag = '（狞猛）' if name in hyper[int(q['_id'])] else ''
        out.append(f"{cn.get(name, name)}{tag}")
    return '、'.join(out) or '—'
MAPCN = {'Jurassic Frontier': '古代森林', 'Verdant Hills': '山林', 'Arctic Ridge': '雪山', 'Misty Peaks': '溪流',
         'Dunes': '旧沙漠', 'Deserted Island': '孤岛', 'Marshlands': '沼泽', 'Volcano': '火山',
         'Ancestral Steppe': '遗迹平原', 'Volcanic Hollow': '地底火山', 'Primal Forest': '原生林',
         'Frozen Seaway': '冰海', 'Desert': '沙漠', 'Jungle': '密林', 'Ruined Pinnacle': '无人山岭'}
def loc(name):
    night = name.endswith(' (N)'); base = name[:-4] if night else name
    return MAPCN[base] + ('（夜）' if night else '') if base in MAPCN else name

L = []
P = L.append
P('# 村与集会所下位/上位任务全表')
P('')
P('村任务 ★1–★10（含 G 级村★10）与集会所下位 ★1–★3、上位 ★4–★7 的完整清单。G 级集会所任务见 [quests-g-rank.md](quests-g-rank.md)，承接条件的编码规则见 [quest-requirements.md](quest-requirements.md)，任务系统总览见 [quests.md](quests.md)。')
P('')
P('## 0. 出处与标记')
P('')
P('- 任务名、目标、地图、报酬金、HRP、出场怪物：第三方 `mhgu.db` 的 `quests` / `monster_to_quest` / `locations` 表 `[I]`。任务名为英文：中文版没有逐任务的任务名文本（见 `docs/reference/formats/gmd.md`「任务名（中文）」一行）。')
P('- 怪物中文名：`docs/data/json/monster-slot-map.json` 的 `cn` 字段（按英文名对应）。「（狞猛）」= `monster_to_quest.hyper = 1` `[I]`。')
P('- 承接条件：romfs 任务记录 `Requirement1` 字段（扫描结果 `.tmp/mhgu/questreq.csv`），按 quest-requirements.md §2 的规则换算成 HR `[C]`；「—」= 无条件。')
P('- 「romfs 星级」一列：同一任务在 romfs 记录里的星级；与 db 不一致时标 `[X]`。')
P('')
groups = collections.OrderedDict()
order = [('Village', 'LR'), ('Village', 'HR'), ('Village', 'G'), ('Guild', 'LR'), ('Guild', 'HR')]
label = {'Village': '村', 'Guild': '集会所', 'LR': '下位', 'HR': '上位', 'G': 'G 级'}
for q in rows:
    groups.setdefault((q['hub'], q['rank'], int(q['stars'])), []).append(q)
closure = []
sec = 1
missing = 0; xstar = 0
for hub, rank in order:
    keys = sorted(k for k in groups if k[0] == hub and k[1] == rank)
    if not keys: continue
    P(f'## {sec}. {label[hub]}{label[rank]}')
    P('')
    for k in keys:
        qs = groups[k]
        P(f'### {sec}.{k[2]} {label[hub]}{label[rank]} ★{k[2]}（{len(qs)} 条）')
        P('')
        P('| 任务 id | 任务名（db 英文） | 目标 | 地图 | 出场怪物 | 报酬金 | HRP | 承接条件 | romfs 星级 |')
        P('|---:|---|---|---|---|---:|---:|---|---|')
        for q in qs:
            r = req.get(int(q['_id']))
            if r is None:
                missing += 1; cond = '未在 romfs 扫描中'; rs = '—'
            else:
                cond = hr(r['req1'])
                rs = r['stars'] + ('' if r['stars'] == q['stars'] else ' `[X]`')
                if r['stars'] != q['stars']: xstar += 1
            P(f"| {q['_id']} | {q['name']} | {q['goal']} | {loc(q['location'])} | {mons(q)} | {q['reward']} | {q['hrp']} | {cond} | {rs} |")
        P('')
        closure.append((f'{label[hub]}{label[rank]} ★{k[2]}', len(qs)))
    sec += 1
P(f'## {sec}. 闭合')
P('')
P('| 段 | 条数 |')
P('|---|---:|')
for name, n in closure: P(f'| {name} | {n} |')
P(f'| **合计** | **{sum(n for _, n in closure)}** |')
P('')
P(f'- db 导出 {len(rows)} 条，全部列出；其中 {len(rows) - missing} 条在 romfs 任务扫描中找到对应记录，{missing} 条没有；romfs 星级与 db 不一致 {xstar} 条。')
P('- 复现：`tools/wiki-gen/gen-quests-vh.py`（读 `.tmp/mhgu/vh-quests.tsv`、`.tmp/mhgu/questreq.csv`、`mhgu.db`）。')
open(W + 'MHGU/docs/wiki/quests-village-hub.md', 'w', encoding='utf8', newline='\n').write('\n'.join(L) + '\n')
print('rows', len(rows), 'missing', missing, 'xstar', xstar, 'sections', len(closure), 'lines', len(L))
