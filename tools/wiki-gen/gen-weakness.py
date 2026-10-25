# Generate docs/wiki/monster-weakness-cheatsheet.md from mhgu.db exports.
# Inputs (exported from MHGU/docs/data/mhgu.db, tab-separated with header):
#   damage:   _id name class body_part cut impact shot fire water ice thunder dragon ko   (table monster_damage)
#   weakness: _id name state fire water thunder ice dragon poison paralysis sleep ...       (table monster_weakness)
# Chinese names come from docs/data/json/monster-slot-map.json (official monsterName_chS slots).
# usage: py -3.14 gen-weakness.py <damage.tsv> <weakness.tsv> <slot-map.json> <out.md>
import csv, json, re, sys

dmg_path, weak_path, slot_path, out_path = sys.argv[1:5]

def rows(p):
    with open(p, encoding='utf8', newline='') as f:
        return list(csv.DictReader(f, delimiter='\t'))

slots = {s['emid']: s for s in json.load(open(slot_path, encoding='utf8'))}
COVER = {1, 2, 32, 37, 57, 63, 80, 81, 82, 83}  # monster-hitzones.md
ELEM = [('fire', '火'), ('water', '水'), ('thunder', '雷'), ('ice', '冰'), ('dragon', '龙')]
PHYS = [('cut', '切'), ('impact', '打'), ('shot', '弹')]
AIL = [('poison', '毒'), ('paralysis', '麻痹'), ('sleep', '睡眠')]

parts = {}
for r in rows(dmg_path):
    parts.setdefault(int(r['_id']), []).append(r)
weak = {}
for r in rows(weak_path):
    if r['state'] == 'Normal':
        weak[int(r['_id'])] = r

def best(base, col):
    m = max(int(r[col]) for r in base)
    return m, [r['body_part'] for r in base if int(r[col]) == m]

def page(mid):
    if mid in COVER:
        return 'monster-hitzones.md'
    s = slots.get(mid)
    if s is None:
        return '—'
    return 'hitzones-all-a.md' if s['slot'] < 47 else 'hitzones-all-b.md'

out = []
for mid in sorted(parts, key=lambda i: (slots[i]['slot'] if i in slots else 999, i)):
    ps = parts[mid]
    base = [r for r in ps if '(' not in r['body_part']] or ps
    s = slots.get(mid)
    name = f"{s['cn']} {ps[0]['name']}" if s else ps[0]['name']
    # strongest element: max value, ties across elements listed
    vals = [(int(r[c]), z, r['body_part']) for r in base for c, z in ELEM]
    m = max(v for v, _, _ in vals)
    el = {}
    for v, z, p in vals:
        if v == m:
            el.setdefault(z, []).append(p)
    elem = '、'.join(f"{z}{m}（{', '.join(dict.fromkeys(p))}）" for z, p in el.items()) if m > 0 else '—'
    phys = []
    for c, _ in PHYS:
        v, p = best(base, c)
        phys.append(f"{', '.join(dict.fromkeys(p))} {v}")
    w = weak.get(mid)
    if w:
        a = sorted(((int(w[c]), z) for c, z in AIL), key=lambda t: -t[0])
        ail = '、'.join(f"{z}{v}" for v, z in a[:2]) if a[0][0] > 0 else '无数据（全 0）'
        tie = [z for v, z in a[2:] if v == a[1][0] and v > 0]
        if tie:
            ail += f"（{'、'.join(tie)}{a[1][0]} 并列）"
    else:
        ail = '—'
    brk = list(dict.fromkeys(re.sub(r'\s*\(Break\)', '', r['body_part']) for r in ps if 'Break' in r['body_part']))
    out.append(f"| {s['slot'] if s else '—'} | {name} | {mid} | {elem} | {' | '.join(phys)} | {ail} | {', '.join(brk) or '—'} | {page(mid)} |")

head = f"""# MHGU 大型怪物弱点速查表

> 由 `MHGU/tools/wiki-gen/gen-weakness.py` 从 `mhgu.db` 的 `monster_damage`（{sum(len(v) for v in parts.values())} 行）和 `monster_weakness` 导出生成，共 {len(out)} 只怪。数值是 db 值，标 `[I]`；肉质已和 romfs 字节对拍的部分见最后一列的肉质页（那里有逐行 `[C]/[X]` 标记，冲突时以肉质页为准）。
> 中文名取自官方简中文本 `monsterName_chS`（经 `docs/data/json/monster-slot-map.json`），英文名是 db 原文。部位名保留 db 英文。

## 口径

- **主部位**：去掉带括号的状态行（如 `Head (Enraged)`、`Head (Break)`）后的部位。
- **最强属性**：主部位里属性肉质的最大值；同值的属性和部位都列出。
- **切 / 打 / 弹最弱**：该列肉质最大的主部位（数值越大越好打）；同值全部列出。
- **异常前二**：`monster_weakness` 中 `Normal` 状态的毒 / 麻痹 / 睡眠星级（db 的 0–6 级，越大越有效），取前两项，同值第三项注「并列」。
- **破坏部位**：`monster_damage` 里带 `(Break)` 的部位。没有这类行不代表不能破坏，只说明 db 没给破坏后肉质。

| 槽 | 怪物 | db id | 最强属性 | 切最弱 | 打最弱 | 弹最弱 | 异常前二 | 破坏后肉质部位 | 肉质页 |
|---:|---|---:|---|---|---|---|---|---|---|
"""
open(out_path, 'w', encoding='utf8', newline='\n').write(head + '\n'.join(out) + '\n')
print(len(out), 'monsters')
