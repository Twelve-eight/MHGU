#!/usr/bin/env python3
# mon-final.py -- class registration (name + size) and class/member grouping for the enemy pool.
# 1) every `bl 0x7aedcc` site: materialized r1 name string + r3 size immediate (dataflow)
# 2) class-grouped member tables for 0x1552200..0x1553421 with ordinals and 3-letter tags
# 3) pool boundary bytes
import struct, re, os
from collections import defaultdict, Counter
FLAT = r'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin'
B = 0x100
TEXT_END = 0x13F1DEC
raw = open(FLAT, 'rb').read()
N = len(raw)
def o2v(o): return o - B
def v2o(v): return v + B
def u32v(v): return struct.unpack_from('<I', raw, v + B)[0]
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
ENDV = N - B
smap = dict(strings_between(0x13F1DEC, ENDV))

funcs = []
for ln in open(r'G:/omp works/.tmp/mhgu/inventory/functions.csv', encoding='utf-8'):
    p = ln.strip().split(',')
    if len(p) >= 2 and p[0].startswith('0x'):
        try: funcs.append((int(p[0], 16), int(p[1], 16)))
        except ValueError: pass
print(f'# functions={len(funcs)}')

def rotimm(w):
    imm = w & 0xFF; rot = ((w >> 8) & 0xF) * 2
    return ((imm >> rot) | (imm << (32 - rot))) & 0xffffffff if rot else imm
def is_branch(w): return (w & 0x0E000000) == 0x0A000000
def bl_target(a, w):
    if (w & 0x0F000000) == 0x0B000000:
        o = w & 0xFFFFFF
        if o & 0x800000: o -= 0x1000000
        return (a + 8 + (o << 2)) & 0xffffffff
    return None

REG = 0x7aedcc
print('\n## 1 class registration sites (bl 0x7aedcc): name + size')
rows = []
for (s, e) in funcs:
    st = {}
    a = s
    while a < min(e, TEXT_END):
        w = u32v(a)
        dst = None; got = None
        if (w & 0x0F7F0000) == 0x051F0000:
            imm = w & 0xFFF; dst = (w >> 12) & 0xF
            lit = a + 8 + (imm if (w & 0x00800000) else -imm)
            if 0 <= lit < ENDV - 3: got = u32v(lit)
        elif (w & 0x0F7F0000) == 0x071F0000:
            dst = (w >> 12) & 0xF; rm = w & 0xF
            if rm in st:
                lit = a + 8 + st[rm]
                if 0 <= lit < ENDV - 3: got = u32v(lit)
        elif (w & 0x0FFF0FF0) == 0x008F0000:
            dst = (w >> 12) & 0xF; rm = w & 0xF
            if rm in st: got = (a + 8 + st[rm]) & 0xffffffff
        elif (w & 0x0FBF0000) in (0x02800000, 0x02400000):
            dst = (w >> 12) & 0xF; rn = (w >> 16) & 0xF
            if rn in st:
                got = ((st[rn] + rotimm(w)) if (w & 0x00800000) else (st[rn] - rotimm(w))) & 0xffffffff
        elif (w & 0x0FF00000) == 0x00800000 and (w & 0xFF0) == 0:
            dst = (w >> 12) & 0xF; rn = (w >> 16) & 0xF; rm = w & 0xF
            if rn in st and rm in st: got = (st[rn] + st[rm]) & 0xffffffff
        elif (w & 0x0FEF0000) == 0x03A00000:
            dst = (w >> 12) & 0xF; got = rotimm(w)
        elif (w & 0x0FF00000) in (0x03000000, 0x03400000):
            dst = (w >> 12) & 0xF
            imm16 = (((w >> 16) & 0xF) << 12) | (w & 0xFFF)
            if (w & 0x0FF00000) == 0x03000000: got = imm16
            else: got = (imm16 << 16) | (st.get(dst, 0) & 0xFFFF)
        t = bl_target(a, w)
        if t == REG:
            nm = smap.get(st.get(1, -1), None)
            sz = st.get(3, None)
            rows.append((s, a, nm, sz, st.get(2)))
        if is_branch(w):
            for r in (0, 1, 2, 3, 12): st.pop(r, None)
            a += 4; continue
        if dst is not None:
            if got is not None: st[dst] = got
            else: st.pop(dst, None)
        else:
            if ((w >> 26) & 3) in (0, 1):
                st.pop((w >> 12) & 0xF, None)
        a += 4
print(f'# registration sites = {len(rows)}  with a resolved name = {sum(1 for r in rows if r[2])}')
seen = set()
for (s, a, nm, sz, r2) in sorted(rows, key=lambda r: (r[2] or 'zzz')):
    if not nm: continue
    key = (nm, sz)
    if key in seen: continue
    seen.add(key)
    print(f'  fn=0x{s:x} @0x{a:x}  size={sz if sz is None else hex(sz)}  name={nm}')

print('\n## 2 class/member grouping for enemy pool 0x1552200..0x1553421')
HDR = re.compile(r'^(?:c|u|r|s)[A-Z][a-z0-9]')
TAG = re.compile(r'^[a-z]{2,6}$')
ss = strings_between(0x1552200, 0x1553421)
cur = None; groups = []
for (v, s) in ss:
    if HDR.match(s) or s.startswith('uEm') or s.startswith('uEms') or s.startswith('roEm'):
        cur = (s, v, [])
        groups.append(cur)
    elif cur is not None:
        cur[2].append((v, s))
for (name, v0, mem) in groups:
    if not (name.startswith(('cEm','cEnemy','uEm','uEms','uMH','uEnemy','rEm','rEnemy','rMonster','rHitDataEnemy','rBody','sEnemy','uDemo','roEm'))):
        continue
    print(f'\n### {name} @0x{v0:x}  (n={len(mem)})')
    for i, (v, s) in enumerate(mem):
        print(f'  [{i:2d}] 0x{v:x}  {s}')

print('\n## 3 pool boundary bytes')
def hexdump(lo, hi):
    for base in range(lo, hi, 0x10):
        chunk = raw[v2o(base):v2o(base) + 0x10]
        txt = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'  0x{base:x}  ' + ' '.join(f'{c:02x}' for c in chunk) + '  |' + txt + '|')
hexdump(0x1551a40, 0x1551ae0)
print('  ...tail...')
hexdump(0x15533f0, 0x1553470)
print('\n# DONE')
