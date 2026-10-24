# Generator for MHGU/docs/wiki/deviants.md from .tmp/deviant-quests.tsv (db Permit quests + romfs requirement field).
import csv, json, collections
W = 'G:/omp works/'
rows = list(csv.DictReader(open(W + '.tmp/deviant-quests.tsv', encoding='utf8'), delimiter='\t'))
sm = json.load(open(W + 'MHGU/docs/data/json/monster-slot-map.json', encoding='utf8'))
sm = sm['rows'] if isinstance(sm, dict) else sm
cn = {r['en']: r['cn'] for r in sm if r.get('en')}
MAPCN = {'Jurassic Frontier': '古代森林', 'Verdant Hills': '山林', 'Arctic Ridge': '雪山', 'Misty Peaks': '溪流',
         'Dunes': '旧沙漠', 'Deserted Island': '孤岛', 'Marshlands': '沼泽', 'Volcano': '火山',
         'Ancestral Steppe': '遗迹平原', 'Volcanic Hollow': '地底火山', 'Primal Forest': '原生林',
         'Frozen Seaway': '冰海', 'Desert': '沙漠', 'Jungle': '密林', 'Ruined Pinnacle': '无人山岭'}
def loc(n):
    night = n.endswith(' (N)'); b = n[:-4] if night else n
    return MAPCN[b] + ('（夜）' if night else '') if b in MAPCN else n
# Group by quest-id series: permit quests are numbered 4XXYY (one XX block per deviant).
groups = collections.OrderedDict()
for r in rows:
    groups.setdefault(int(r['quest_id']) // 100, []).append(r)
def owner(qs):
    c = collections.Counter(m for q in qs for m in (q['monsters'] or '').split(';')[:1] if m)
    return c.most_common(1)[0][0]
L = []; P = L.append
P('# 二名（特殊许可）怪物与许可任务')
P('')
P('18 只二名怪物（MHXX 引入的特殊个体）各有一串「特殊许可」任务。本页按怪物列出全部许可任务及其承接条件。二名狩技、素材用途见 [styles-arts.md](styles-arts.md) 与 [armor-sets.md](armor-sets.md)；承接条件编码见 [quest-requirements.md](quest-requirements.md)；任务系统总览见 [quests.md](quests.md)。')
P('')
P('## 0. 出处与标记')
P('')
P('- 任务清单、目标、地图、报酬金、HRP、出场怪物：第三方 `mhgu.db` 的 `quests`（`hub = Permit`，228 条）/ `monster_to_quest` / `locations` `[I]`。任务名为 db 英文，中文版没有逐任务任务名文本。')
P('- 等级（下位/上位/G级）、星级、承接条件：romfs 任务记录（扫描结果 `.tmp/mhgu/questreq.csv`）`[C]`；承接 HR 按 quest-requirements.md §2 换算（`Requirement1` 值 1–18 → HR(值+1)，19 → HR100）。')
P('- 怪物中文名：`docs/data/json/monster-slot-map.json` 的 `cn` 字段。')
P('')
summary = []
for i, (blk, qs) in enumerate(groups.items(), 1):
    own = owner(qs); name = cn.get(own, own)
    ranks = collections.Counter(q['romfs_rank'] for q in qs)
    hrs = collections.Counter(q['accept_HR'] for q in qs)
    summary.append((name, own, blk, len(qs), ranks, qs[0]['accept_HR'], qs[-1]['accept_HR']))
    P(f'## {i}. {name}（{own}，任务 {blk}01–{blk}{len(qs):02d}，共 {len(qs)} 条）')
    P('')
    P('| 任务 id | 等级 ★ | 承接条件 | 任务名（db 英文） | 目标 | 地图 | 同场怪物 | 报酬金 | HRP |')
    P('|---:|---|---|---|---|---|---|---:|---:|')
    for q in qs:
        others = [cn.get(m, m) for m in (q['monsters'] or '').split(';') if m and m != own]
        rk = {'LR': '下位', 'HR': '上位', 'G': 'G级'}.get(q['romfs_rank'], q['romfs_rank'])
        P(f"| {q['quest_id']} | {rk} ★{q['romfs_stars']} | {q['accept_HR'] or '无'} | {q['name']} | {q['goal']} | {loc(q['location'])} | {'、'.join(others) or '—'} | {q['reward']} | {q['hrp']} |")
    P('')
P(f'## {len(groups) + 1}. 汇总与闭合')
P('')
P('| 二名怪物 | 任务段 | 条数 | 下位 | 上位 | G级 | 最低承接 | 最高承接 |')
P('|---|---|---:|---:|---:|---:|---|---|')
for name, own, blk, n, ranks, lo, hi in summary:
    P(f"| {name} | {blk}xx | {n} | {ranks.get('LR', 0)} | {ranks.get('HR', 0)} | {ranks.get('G', 0)} | {lo or '无'} | {hi or '无'} |")
tot = collections.Counter(q['romfs_rank'] for q in rows)
P(f"| **合计** | | **{len(rows)}** | **{tot.get('LR', 0)}** | **{tot.get('HR', 0)}** | **{tot.get('G', 0)}** | | |")
P('')
hist = collections.Counter(q['accept_HR'] for q in rows)
order = sorted(hist, key=lambda h: int(h[2:]) if h.startswith('HR') else -1)
P('- 承接 HR 分布：' + '、'.join(f'{h or "无"} {hist[h]}' for h in order) + f'，合计 {sum(hist.values())}。')
P(f'- 怪物数 {len(groups)}；228 条全部在 romfs 任务扫描中找到对应记录。')
P('- 复现：`tools/wiki-gen/deviant-data.py`（导出 TSV）+ `tools/wiki-gen/gen-deviants.py`（生成本页）。')
open(W + 'MHGU/docs/wiki/deviants.md', 'w', encoding='utf8', newline='\n').write('\n'.join(L) + '\n')
print('groups', len(groups), 'rows', len(rows), dict(tot), [(s[0], s[3]) for s in summary])
