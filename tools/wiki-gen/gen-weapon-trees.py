# Generate docs/wiki/weapon-trees.md (final forms of every weapon tree) straight from mhgu.db.
# usage: py -3.14 gen-weapon-trees.py <mhgu.db> <out.md>
import sqlite3, sys

db, out_path = sys.argv[1:3]
c = sqlite3.connect(db)
CN = {'Bow': '弓', 'Charge Blade': '充能斧', 'Dual Blades': '双剑', 'Great Sword': '大剑', 'Gunlance': '铳枪',
      'Hammer': '大锤', 'Heavy Bowgun': '重弩炮', 'Hunting Horn': '狩猎笛', 'Insect Glaive': '操虫棍', 'Lance': '长枪',
      'Light Bowgun': '轻弩炮', 'Long Sword': '太刀', 'Switch Axe': '斩击斧', 'Sword and Shield': '单手剑'}
EL = {'Fire': '火', 'Water': '水', 'Thunder': '雷', 'Ice': '冰', 'Dragon': '龙', 'Poison': '毒',
      'Paralysis': '麻痹', 'Sleep': '睡眠', 'Blastblight': '爆破'}

def esc(s):
    return s.replace('|', '\\|')

def elem(name, val):
    return f'{EL[name]} {val}' if name else ''

rows = c.execute('''select w.wtype, i.name, w.family, w.attack, w.affinity, w.element, w.element_attack,
                    w.element_2, w.element_2_attack, w.awaken, w.awaken_attack, w.num_slots, w.sharpness, i.rarity
                    from weapons w join items i on i._id = w._id where w.final = 1
                    order by w.wtype, w.family, w._id''').fetchall()
by = {}
for r in rows:
    by.setdefault(r[0], []).append(r)

parts = []
for k, wt in enumerate(sorted(by), 1):
    rs = by[wt]
    parts.append(f'## {k}. {CN[wt]}（{wt}，{len(rs)} 终形）\n')
    parts.append('| 终形 | 家族 | 攻击 | 会心 | 属性 | 孔 | 斩味 | 稀有度 |')
    parts.append('|---|---:|---:|---:|---|---:|---|---:|')
    for _, name, fam, atk, aff, e1, v1, e2, v2, aw, awv, slots, sharp, rar in rs:
        el = ' / '.join(x for x in (elem(e1, v1), elem(e2, v2)) if x)
        if aw:
            el = (el + ' / ' if el else '') + f'（觉醒）{EL[aw]} {awv}'
        sh = sharp.split()[-1] if sharp else '—'
        parts.append(f'| {esc(name)} | {fam} | {atk} | {aff} | {el or "—"} | {slots} | {sh} | {rar} |')
    parts.append('')

total = sum(len(v) for v in by.values())
close = '\n'.join(f'| {CN[w]} ({w}) | {len(by[w])} |' for w in sorted(by))
head = f'''# 武器升级树：各武器种最终形态

> 本页列出 14 种武器里每条升级树的末端武器（终形：`weapons.final = 1`）。中间等级不展开。
> 由 `MHGU/tools/wiki-gen/gen-weapon-trees.py` 直接从 `mhgu.db` 生成：`weapons` 表联 `items`（名称、稀有度）。全部数值是 db 值 `[I]`，尚未逐字节对照 romfs。
> 斩味列取 `weapons.sharpness` 三组 7 段里的最后一组（红.橙.黄.绿.青.白.紫）；三组是否依次对应匠 +0/+1/+2 未核对 `[U]`。弓、弩没有斩味，记 `—`。

## 口径

| 列 | 含义 |
|---|---|
| 终形 | `items.name`（db 英文名） |
| 家族 | `weapons.family`（同一条升级树共用） |
| 攻击 | `weapons.attack`（显示值） |
| 会心 | `weapons.affinity`（%） |
| 属性 | `element`/`element_attack`，双属性加 `element_2`；`（觉醒）` = `awaken`/`awaken_attack`；无属性记 `—` |
| 孔 | `weapons.num_slots` |
| 斩味 | 见上 |
| 稀有度 | `items.rarity` |

## 闭合核对

| 武器种 | 终形数 |
|---|---:|
{close}
| 合计 | {total:,} |

'''
open(out_path, 'w', encoding='utf8', newline='\n').write(head + '\n'.join(parts))
print(total, 'final weapons')
