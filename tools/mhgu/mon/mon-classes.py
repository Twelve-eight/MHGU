#!/usr/bin/env python3
# mon-classes.py -- split the rodata name pools into class groups (class header + members)
# and emit ordinal member tables with type hints.
import struct, re
FLAT = r'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin'
B = 0x100
raw = open(FLAT, 'rb').read()
N = len(raw)
def o2v(o): return o - B
def printable(c): return 0x20 <= c <= 0x7e

def strings_between(lo, hi):
    out = []; o = lo + B; end = hi + B
    while o < end:
        if printable(raw[o]):
            e = o
            while e < end and printable(raw[e]): e += 1
            if e < N and raw[e] == 0 and e - o >= 2:
                out.append((o - B, raw[o:e].decode('ascii'))); o = e + 1; continue
        o += 1
    return out

# pools discovered by mon-class-map: block0 0x1551ac6..0x1553421 (enemy/unit names)
REGIONS = [(0x1551ac6, 0x1553421)]
ENEMY = re.compile(r'^(cEm|cEnemy|uEm|uEms|rEm|rEnemy|sEnemy|uEnemy|rMonster|rHitDataEnemy)')
HDR = re.compile(r'^(?:c|u|r|s)[A-Z]')
TYPEHINT = [
    ('Size', 'Size/Scale'), ('Scale', 'Size/Scale'), ('Rate', 'Rate'), ('Time', 'Time'),
    ('Timer', 'Time'), ('Flag', 'Flag'), ('Bit', 'Bitflag'), ('Index', 'Index'),
    ('No', 'Index/No'), ('Type', 'Enum/Type'), ('ID', 'ID'),
    ('Num', 'Count'), ('Level', 'Level'), ('Lv', 'Level'), ('Pos', 'Vector'),
    ('Ofs', 'Offset'), ('Speed', 'Speed'), ('Radius', 'Radius'), ('Damage', 'Damage'),
    ('Data', 'Struct/Ref'), ('Tbl', 'Table'), ('Table', 'Table'), ('List', 'Container'),
    ('Name', 'Name'), ('Prob', 'Probability'), ('Genus', 'Enum/Genus'),
]
def hint(s):
    out = []
    for k, v in TYPEHINT:
        if k in s:
            out.append(v)
    return ','.join(dict.fromkeys(out))

for (lo, hi) in REGIONS:
    ss = strings_between(lo, hi)
    print(f'\n## POOL 0x{lo:x}..0x{hi:x} strings={len(ss)}')
    # split into groups
    groups = []
    cur = ['<POOL-HEAD>', []]
    for (v, s) in ss:
        if HDR.match(s) or (s.startswith('u') and '_' in s and re.match(r'^u[A-Z]', s)):
            groups.append(cur)
            cur = [s, []]
        else:
            cur[1].append((v, s))
    groups.append(cur)
    for (name, mem) in groups:
        if not mem and not ENEMY.match(name):
            continue
        enemies = bool(ENEMY.match(name))
        if not enemies and not any(m[1].lower().startswith(('m', 's')) for m in mem):
            pass
        if not enemies:
            continue
        print(f'\n### CLASS {name}  members={len(mem)}')
        for i, (v, s) in enumerate(mem):
            tag = hint(s)
            print(f'  [{i:2d}] 0x{v:x}  {s:34s} {tag}')

# ---- full enemy-name inventory across all of rodata ----
print('\n## FULL enemy-ish string inventory (all of rodata)')
ENDV = N - B
inv = []
for (v, s) in strings_between(0x13F1DEC, ENDV):
    if re.search(r'cEm|cEnemy|uEm\d|uEms\d|rEm|rEnemy|sEnemy|Monster|EmSize|EmDou|DouMouKa|StaminaSub|Ikari|PartsAura|PartsChange|OtherParts_Bias|SpecificParts', s):
        inv.append((v, s))
print(f'# count = {len(inv)}')
for (v, s) in inv:
    print(f'  0x{v:x}  {s}')

# ---- uEm unit id list ----
print('\n## uEm###_00 / uEms###_00 id inventory')
ids = {}
for (v, s) in strings_between(0x15527d0, 0x1552c10):
    m = re.match(r'^uEms(\d{3})_00$', s)
    if m:
        ids.setdefault('small', []).append((int(m.group(1)), v)); continue
    m = re.match(r'^uEm(\d{3})_00$', s)
    if m:
        ids.setdefault('big', []).append((int(m.group(1)), v))
for k in ('big', 'small'):
    a = sorted(ids.get(k, []))
    print(f'# {k}: n={len(a)} ids={[i for (i, v) in a]}')
print('\n# DONE')
