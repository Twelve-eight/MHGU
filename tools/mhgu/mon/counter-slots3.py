#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
counter-slots3.py -- dump the static 137-entry {EmId, slot} map found at 0x1597ea4
and the secondary run at 0x164f7e4; cross-check against monster-slot-map json.

Run: "G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe" .tmp/mhgu/mon/counter-slots3.py
"""
import json
import os
import struct

ROOT = 'G:/omp works'
FLAT = os.path.join(ROOT, '.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin')
OUT = os.path.join(ROOT, '.tmp/mhgu/mon/counter-slots3.out.txt')
J = os.path.join(ROOT, 'MHGU/docs/data/json')
TEXT_END = 0x13F1DEC
buf = open(FLAT, 'rb').read()
LEN = len(buf)
L = []


def emit(s=''):
    L.append(s)
    print(s)


def rd32(va):
    return struct.unpack_from('<I', buf, va + 0x100)[0]


def rd16(va):
    return struct.unpack_from('<H', buf, va + 0x100)[0]


big = json.load(open(os.path.join(J, 'monster-slot-map.json'), encoding='utf-8'))
small = json.load(open(os.path.join(J, 'monster-slot-map-small.json'), encoding='utf-8'))
name_map = json.load(open(os.path.join(J, 'monster-name-map.json'), encoding='utf-8'))
by_id = {e['db_id']: e for e in big + small}
base_en, base_ja = {}, {}
for en, v in name_map.items():
    base_en[v['id']] = en
    base_ja[v['id']] = v.get('ja', '')

VAR = {0: 'base', 1: 'sub', 2: 'rare', 3: 'v3', 4: 'deviant', 5: 'v5', 6: 'v6', 16: 'small'}


def nm(idv):
    e = by_id.get(idv)
    if e:
        return '%s / %s' % (e['cn'], e['en'])
    if idv >= 4096:
        return 'small#%d' % (idv - 4096)
    v, b = idv >> 8, idv & 0xFF
    return '%s(%d)+%s' % (base_en.get(b, '?'), b, VAR.get(v, 'v%d' % v))


def dump(va, n, title):
    emit('\n## %s  @0x%x .. 0x%x  (%d x 8B)' % (title, va, va + 8 * n, n))
    emit('  before (0x%x..): %s' % (va - 0x20, ' '.join('%08x' % rd32(va - 0x20 + 4 * k) for k in range(8))))
    emit('  after  (0x%x..): %s' % (va + 8 * n, ' '.join('%08x' % rd32(va + 8 * n + 4 * k) for k in range(8))))
    emit('  i    id    0x     slot   ok  name')
    bad = 0
    for i in range(n):
        idv = rd32(va + 8 * i)
        slot = rd32(va + 8 * i + 4)
        oki = (slot == i)
        if not oki:
            bad += 1
        emit('  %3d %6d 0x%04x %6d %4s %s' % (i, idv, idv, slot, 'OK' if oki else 'MISMATCH', nm(idv)))
    emit('  slot!=index count: %d' % bad)
    return [(rd32(va + 8 * i), rd32(va + 8 * i + 4)) for i in range(n)]


m1 = dump(0x1597EA4, 137, 'primary static map (slot==index, 137 entries)')
m2 = dump(0x164F7E4, 112, 'secondary run (112 entries)')

emit('\n## cross-check primary map vs docs/data/json/monster-slot-map.json')
for i, (idv, slot) in enumerate(m1):
    e = by_id.get(slot)
    if e is None:
        emit('  slot %3d: map id %6d (0x%04x)  repo: (none / reserved)   %s' % (slot, idv, idv, nm(idv)))
    elif e['db_id'] != idv:
        emit('  slot %3d: MAP id %6d vs REPO id %6d  %-24s  MISMATCH' % (slot, idv, e['db_id'], e['en']))
emit('  (only mismatches and reserved slots listed above)')

emit('\n## which slots are small monsters (<4096 vs >=4096)')
sm = [i for i, (idv, s) in enumerate(m1) if idv >= 4096]
bg = [i for i, (idv, s) in enumerate(m1) if idv < 4096]
emit('  big-id slots: %d  (range %s..%s)' % (len(bg), bg[0] if bg else '-', bg[-1] if bg else '-'))
emit('  small-id slots: %d  -> %s' % (len(sm), sm))
emit('  ids of small slots: %s' % ' '.join(str(m1[i][0]) for i in sm))
emit('  distinct s: %s' % ' '.join('%d:0x%x' % (s, m1[s][0]) for s in sm))

emit('\n## does the primary map contain ids absent from the 166-entry master table?')
TBL = 0x162BF0C
master = set(rd16(TBL + 2 * i) for i in range(166))
miss = [(i, idv) for i, (idv, s) in enumerate(m1) if idv < 4096 and idv not in master]
emit('  map big ids not in master table: %s' % (miss if miss else 'none'))
extra = sorted(master - set(idv for idv, s in m1))
emit('  master ids with no slot: %d -> %s' % (len(extra), ' '.join(str(v) for v in extra)))
emit('  (these are the ids 0x50b64 must return -1 for, IF the runtime map == this static map)')

emit('\n## xrefs of 0x1597ea4 in .text')
hits = 0
for a in range(0, TEXT_END, 4):
    w = rd32(a)
    if ((w >> 26) & 3) == 1 and ((w >> 25) & 1) == 0 and ((w >> 24) & 1) == 1 and ((w >> 20) & 1) == 1 and ((w >> 16) & 0xF) == 15:
        off = w & 0xFFF
        tgt = (a + 8 + (off if (w >> 23) & 1 else -off)) & 0xFFFFFFFF
        if tgt == 0x1597EA4 - 0 or tgt == 0x1597EA8:
            emit('  literal at 0x%x holds 0x%08x (from 0x%x)' % (tgt, rd32(tgt), a))
            hits += 1
        v = rd32(tgt)
        if v == 0x1597EA4:
            emit('  ldr from 0x%x -> [0x%x]=0x1597ea4  (absolute pointer to the map)' % (a, tgt))
            hits += 1
        if v == (0x1597EA4 - (a + 8)) & 0xFFFFFFFF:
            emit('  ldr from 0x%x -> [0x%x]=0x%08x = 0x1597ea4-(pc)  (pc-relative offset to the map)' % (a, tgt, v))
            hits += 1
emit('  hits: %d' % hits)

emit('\n## words around 0x1597ea4 (structure boundary probe)')
for k in range(-8, 0):
    emit('  %+3d  0x%x: %08x %08x   (%d %d)' % (k, 0x1597EA4 + 8 * k, rd32(0x1597EA4 + 8 * k),
                                                rd32(0x1597EA4 + 8 * k + 4),
                                                rd32(0x1597EA4 + 8 * k), rd32(0x1597EA4 + 8 * k + 4)))
for k in range(137, 145):
    emit('  %+3d  0x%x: %08x %08x   (%d %d)' % (k, 0x1597EA4 + 8 * k, rd32(0x1597EA4 + 8 * k),
                                                rd32(0x1597EA4 + 8 * k + 4),
                                                rd32(0x1597EA4 + 8 * k), rd32(0x1597EA4 + 8 * k + 4)))

open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n[written] ' + OUT)
