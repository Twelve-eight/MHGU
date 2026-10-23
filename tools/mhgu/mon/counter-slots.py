#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
counter-slots.py -- resolve 0x52308c (monster counter accessor), export its
pc-relative u16 table, disassemble 0x50b64, and cross-check against
docs/data/json/monster-slot-map{,-small}.json.

Run:  "G:/omp works/archive/retired/workbuddy-desktop-api/.venv/Scripts/python.exe" .tmp/mhgu/mon/counter-slots.py
Writes: .tmp/mhgu/mon/counter-slots.out.txt  (also echoed to stdout)
"""
import json
import os
import struct
import sys

ROOT = 'G:/omp works'
FLAT = os.path.join(ROOT, '.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin')
OUT = os.path.join(ROOT, '.tmp/mhgu/mon/counter-slots.out.txt')
BIGMAP = os.path.join(ROOT, 'MHGU/docs/data/json/monster-slot-map.json')
SMALLMAP = os.path.join(ROOT, 'MHGU/docs/data/json/monster-slot-map-small.json')

buf = open(FLAT, 'rb').read()
BUF_LEN = len(buf)
TEXT_END = 0x13F1DEC

LINES = []


def emit(s=''):
    LINES.append(s)
    print(s)


def v2o(va):
    return va + 0x100


def ok(va):
    return 0 <= va and va + 4 <= BUF_LEN - 0x100


def rd32(va):
    return struct.unpack_from('<I', buf, va + 0x100)[0]


def rd16(va):
    return struct.unpack_from('<H', buf, va + 0x100)[0]


def rds16(va):
    return struct.unpack_from('<h', buf, va + 0x100)[0]


def rdb(va):
    return buf[va + 0x100]


# --------------------------------------------------------------------------
# ARM32 (ARMv7-A, ARM state) minimal decoder -- port of .tmp/mhgu/tools/arm32.mjs
# --------------------------------------------------------------------------
RN = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'sp', 'lr', 'pc']
COND = ['eq', 'ne', 'cs', 'cc', 'mi', 'pl', 'vs', 'vc', 'hi', 'ls', 'ge', 'lt', 'gt', 'le', '', '']
DPOP = ['and', 'eor', 'sub', 'rsb', 'add', 'adc', 'sbc', 'rsc',
        'tst', 'teq', 'cmp', 'cmn', 'orr', 'mov', 'bic', 'mvn']


def shifter(w):
    if w & 0x10:
        rs = RN[(w >> 8) & 0xF]
        st = (w >> 5) & 3
        return '%s, %s %s' % (RN[w & 0xF], ['lsl', 'lsr', 'asr', 'ror'][st], rs)
    imm5 = (w >> 7) & 0x1F
    st = (w >> 5) & 3
    if imm5 == 0 and st == 0:
        return RN[w & 0xF]
    if imm5 == 0 and st == 1:
        return '%s, lsr #32' % RN[w & 0xF]
    if imm5 == 0 and st == 2:
        return '%s, asr #32' % RN[w & 0xF]
    if imm5 == 0 and st == 3:
        return '%s, rrx' % RN[w & 0xF]
    return '%s, %s #%d' % (RN[w & 0xF], ['lsl', 'lsr', 'asr', 'ror'][st], imm5)


def imm_rot(w):
    imm = w & 0xFF
    rot = ((w >> 8) & 0xF) * 2
    return ((imm >> rot) | (imm << (32 - rot))) & 0xFFFFFFFF


def decode(w, addr):
    cond = (w >> 28) & 0xF
    cc = COND[cond]
    out = None

    if cond == 0xF:
        if (w & 0xFE000000) == 0xFA000000:      # BLX imm
            off = (w & 0xFFFFFF) << 2
            h = (w >> 24) & 1
            if off & 0x2000000:
                off -= 0x4000000
            out = 'blx 0x%x' % ((addr + 8 + off + h * 2) & 0xFFFFFFFF)
        elif (w & 0xFD70F000) == 0xF550F000:
            out = 'pld/pli [%s, #%d]' % (RN[(w >> 16) & 0xF], w & 0xFFF)
        elif (w & 0x0FE00000) == 0x0C400000:
            out = 'mcrr/mrrc'
        else:
            out = '.word 0x%08x' % w
        return out

    b27_26 = (w >> 26) & 3

    if ((w >> 25) & 7) == 4:                    # ldm/stm
        P = (w >> 24) & 1
        U = (w >> 23) & 1
        Wb = (w >> 21) & 1
        L = (w >> 20) & 1
        rn = RN[(w >> 16) & 0xF]
        regs = [RN[i] for i in range(16) if w & (1 << i)]
        rl = '{%s}' % ', '.join(regs)
        if rn == 'sp' and P and not U and Wb and not L:
            return 'push%s %s' % (cc, rl)
        if rn == 'sp' and not P and U and Wb and L:
            return 'pop%s %s' % (cc, rl)
        return 'ldm/stm%s %s%s %s' % (cc, rn, '!' if Wb else '', rl)

    if ((w >> 25) & 7) == 5:                    # b / bl
        off = (w & 0xFFFFFF) << 2
        if off & 0x2000000:
            off -= 0x4000000
        tgt = (addr + 8 + off) & 0xFFFFFFFF
        return ('bl%s' if (w & 0x01000000) else 'b%s') % cc + ' 0x%x' % tgt

    if b27_26 == 1:                             # single data transfer
        I = (w >> 25) & 1
        P = (w >> 24) & 1
        U = (w >> 23) & 1
        B = (w >> 22) & 1
        L = (w >> 20) & 1
        rn = RN[(w >> 16) & 0xF]
        rt = RN[(w >> 12) & 0xF]
        mn = ('ldr' if L else 'str') + ('b' if B else '') + cc
        if I:
            return '%s %s, [%s, %s]' % (mn, rt, rn, shifter(w))
        off = w & 0xFFF
        if rn == 'pc':
            tgt = (addr + 8 + (off if U else -off)) & 0xFFFFFFFF
            lit = ''
            try:
                lit = ' ; [0x%x]=0x%08x' % (tgt, rd32(tgt))
            except Exception:
                pass
            return '%s %s, [pc, #%s%d]%s' % (mn, rt, '' if U else '-', off, lit)
        return '%s %s, [%s, #%s%d]%s' % (mn, rt, rn, '' if U else '-', off,
                                         '' if P else ' (post)')

    if b27_26 == 0:
        bit25 = (w >> 25) & 1
        if bit25 == 1:                          # movw/movt + dp immediate
            opc = (w >> 21) & 0xF
            S = (w >> 20) & 1
            if opc == 8 and S == 0:
                imm = ((w >> 4) & 0xF000) | (w & 0xFFF)
                return 'movw%s %s, #0x%x' % (cc, RN[(w >> 12) & 0xF], imm)
            if opc == 10 and S == 0:
                imm = ((w >> 4) & 0xF000) | (w & 0xFFF)
                return 'movt%s %s, #0x%x' % (cc, RN[(w >> 12) & 0xF], imm)
            rn = RN[(w >> 16) & 0xF]
            rd = RN[(w >> 12) & 0xF]
            imm = imm_rot(w)
            m = DPOP[opc]
            if 8 <= opc <= 11:
                return '%s%s %s, #%d' % (m, cc, rn, imm)
            if opc == 13 or opc == 15:
                return '%s%s %s, #%d' % (m, cc, rd, imm)
            return '%s%s %s, %s, #%d' % (m, cc, rd, rn, imm)
        bits76 = (w >> 6) & 3
        bit4 = (w >> 4) & 1
        if bit4 == 1 and bits76 != 0:           # extra ld/st (halfword etc.)
            P = (w >> 24) & 1
            U = (w >> 23) & 1
            I = (w >> 22) & 1
            L = (w >> 20) & 1
            sh = (w >> 5) & 3
            rn = RN[(w >> 16) & 0xF]
            rt = RN[(w >> 12) & 0xF]
            if sh == 1:
                off = ((w & 0xF) | ((w >> 4) & 0xF0)) if I else (w & 0xFFF)
                return '%s%s %s, [%s, #%s%d]' % ('ldrh' if L else 'strh', cc, rt, rn,
                                                 '' if U else '-', off)
            if sh == 2:
                return '%s%s %s, [%s, #%s%d]' % ('ldrsb' if L else 'ldrd', cc, rt, rn,
                                                 '' if U else '-', w & 0xF)
            if sh == 3:
                return '%s%s %s, [%s, #%s%d]' % ('ldrsh' if L else 'strd', cc, rt, rn,
                                                 '' if U else '-', w & 0xF)
        if bits76 == 0 and bit4 == 0:           # dp register
            opc = (w >> 21) & 0xF
            S = (w >> 20) & 1
            rn = RN[(w >> 16) & 0xF]
            rd = RN[(w >> 12) & 0xF]
            m = DPOP[opc]
            sfx = 's' if S else ''
            if 8 <= opc <= 11:
                return '%s%s%s %s, %s' % (m, sfx, cc, rn, shifter(w))
            if opc == 13 or opc == 15:
                if w == 0xE1A00000:
                    return 'nop'
                return '%s%s%s %s, %s' % (m, sfx, cc, rd, shifter(w))
            return '%s%s%s %s, %s, %s' % (m, sfx, cc, rd, rn, shifter(w))
        if (w & 0x0FFFFFF0) == 0x012FFF10:
            return 'bx%s %s' % (cc, RN[w & 0xF])
        if (w & 0x0FFFFFF0) == 0x012FFF30:
            return 'blx%s %s' % (cc, RN[w & 0xF])
        if (w & 0x0FFF0FF0) == 0x016F0F10:
            return 'clz%s %s, %s' % (cc, RN[(w >> 12) & 0xF], RN[w & 0xF])
        if (w & 0x0FBF0FFF) == 0x010F0000:
            return 'mrs%s %s, cpsr' % (cc, RN[(w >> 12) & 0xF])
        if (w & 0x0FB0FFF0) == 0x0120F000:
            return 'msr%s cpsr, %s' % (cc, RN[w & 0xF])
        if (w & 0x0FF000F0) == 0x01200070:
            return 'bkpt #%d' % (w & 0xFFFF)
        if bit4 == 1 and bits76 == 1:
            return '.word 0x%08x ; (media?)' % w

    if ((w >> 22) & 0x3F) == 0 and ((w >> 4) & 0xF) == 9:   # multiply
        A = (w >> 21) & 1
        S = (w >> 20) & 1
        rd = RN[(w >> 16) & 0xF]
        rn = RN[(w >> 12) & 0xF]
        rs = RN[(w >> 8) & 0xF]
        rm = RN[w & 0xF]
        if A:
            return 'mla%s%s %s, %s, %s, %s' % ('s' if S else '', cc, rd, rm, rs, rn)
        return 'mul%s%s %s, %s, %s' % ('s' if S else '', cc, rd, rm, rs)

    if b27_26 == 3:
        if (w & 0x0F000000) == 0x0F000000:
            return 'svc%s #%d' % (cc, w & 0xFFFFFF)
        return '.word 0x%08x ; coproc' % w

    return '.word 0x%08x' % w


def listing(start, count):
    for i in range(count):
        a = start + i * 4
        if not ok(a):
            emit('%08x: <out of file>' % a)
            break
        w = rd32(a)
        emit('%08x: %08x  %s' % (a, w, decode(w, a)))


# --------------------------------------------------------------------------
# constant / data-flow tracer (only what we need: pc-relative table base)
# --------------------------------------------------------------------------
def is_ldr_imm_pc(w):
    return ((w >> 26) & 3) == 1 and ((w >> 25) & 1) == 0 and ((w >> 24) & 1) == 1 \
        and ((w >> 20) & 1) == 1 and ((w >> 16) & 0xF) == 15


def lit_of(w, addr):
    off = w & 0xFFF
    U = (w >> 23) & 1
    return (addr + 8 + (off if U else -off)) & 0xFFFFFFFF


def is_add_pc(w):
    if ((w >> 26) & 3) != 0 or ((w >> 25) & 1) != 0:
        return False
    if ((w >> 4) & 1) != 0:
        return False
    if ((w >> 6) & 3) != 0:
        return False
    opc = (w >> 21) & 0xF
    rn = (w >> 16) & 0xF
    return opc == 4 and rn == 15


def is_movw(w):
    return ((w >> 26) & 3) == 0 and ((w >> 25) & 1) == 1 and ((w >> 21) & 0xF) == 8 \
        and ((w >> 20) & 1) == 0


def is_movt(w):
    return ((w >> 26) & 3) == 0 and ((w >> 25) & 1) == 1 and ((w >> 21) & 0xF) == 10 \
        and ((w >> 20) & 1) == 0


def trace(start, count):
    """returns list of (addr, text) notes about resolved pc-relative bases"""
    const = {}
    notes = []
    for i in range(count):
        a = start + i * 4
        if not ok(a):
            break
        w = rd32(a)
        if is_ldr_imm_pc(w):
            tgt = lit_of(w, a)
            rt = (w >> 12) & 0xF
            if ok(tgt):
                val = rd32(tgt)
                const[rt] = ('lit', val, tgt)
                notes.append('%08x: ldr %s <- [%08x] = 0x%08x  (literal)' % (a, RN[rt], tgt, val))
        elif is_add_pc(w):
            rd = (w >> 12) & 0xF
            rm = w & 0xF
            base = (a + 8) & 0xFFFFFFFF
            if rm in const:
                kind, val, src = const[rm]
                notes.append('%08x: add %s, pc, %s  =>  0x%x + 0x%x = 0x%x' %
                             (a, RN[rd], RN[rm], base, val, (base + val) & 0xFFFFFFFF))
                const[rd] = ('base', (base + val) & 0xFFFFFFFF, a)
            else:
                notes.append('%08x: add %s, pc, %s  (rm unknown)' % (a, RN[rd], RN[rm]))
        elif is_movw(w):
            rt = (w >> 12) & 0xF
            imm = ((w >> 4) & 0xF000) | (w & 0xFFF)
            const[rt] = ('movw', imm, a)
        elif is_movt(w):
            rt = (w >> 12) & 0xF
            imm = ((w >> 4) & 0xF000) | (w & 0xFFF)
            if rt in const and const[rt][0] in ('movw', 'movt'):
                const[rt] = ('mov32', (const[rt][1] | (imm << 16)) & 0xFFFFFFFF, a)
        else:
            # conservative clobber
            hi = (w >> 25) & 7
            if hi == 5:                                  # b/bl: caller-saved clobber
                for r in (0, 1, 2, 3, 12, 14):
                    const.pop(r, None)
                if (w & 0x01000000) == 0:                # plain b: block ends
                    const.clear()
                continue
            if hi == 4:                                  # ldm/stm
                for r in range(16):
                    if w & (1 << r):
                        const.pop(r, None)
                continue
            if ((w >> 26) & 3) == 1:                     # single data transfer
                L = (w >> 20) & 1
                rt = (w >> 12) & 0xF
                if L:
                    const.pop(rt, None)
                continue
            if ((w >> 26) & 3) == 0 and ((w >> 25) & 1) == 0:
                bits76 = (w >> 6) & 3
                bit4 = (w >> 4) & 1
                if bit4 == 1 and bits76 != 0:
                    continue
                if bits76 == 0 and bit4 == 0:
                    opc = (w >> 21) & 0xF
                    rd = (w >> 12) & 0xF
                    if opc in (8, 9, 10, 11) or opc == 13 or opc == 15:
                        if opc in (8, 9, 10, 11):
                            const.pop((w >> 16) & 0xF, None)
                        if rd != 13:
                            const.pop(rd, None)
    return notes


# --------------------------------------------------------------------------
# calls-to scan
# --------------------------------------------------------------------------
def find_calls_to(targets):
    hits = []
    n = TEXT_END // 4
    words = struct.unpack_from('<%dI' % n, buf, 0x100)
    tset = set(targets)
    for i in range(n):
        w = words[i]
        if (w >> 28) != 0xF and ((w >> 26) & 3) == 2 and (w & 0x01000000):
            off = (w & 0xFFFFFF) << 2
            if off & 0x2000000:
                off -= 0x4000000
            a = i * 4
            tgt = (a + 8 + off) & 0xFFFFFFFF
            if tgt in tset:
                hits.append((a, tgt))
    return hits


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
FN = 0x52308C
emit('# counter-slots.py  flat=%s  size=0x%x  text_end=0x%x' % (FLAT, BUF_LEN, TEXT_END))
emit('')

emit('## A. raw + decoded listing 0x%x .. (110 insns)' % FN)
listing(FN, 110)
emit('')

emit('## B. pc-relative resolution inside 0x%x' % FN)
for n in trace(FN, 110):
    emit('  ' + n)
emit('')

emit('## C. literal pools referenced')
seen = set()
for i in range(110):
    a = FN + i * 4
    w = rd32(a)
    for pat in ('is_ldr_imm_pc',):
        if eval(pat)(w):
            t = lit_of(w, a)
            if t in seen:
                continue
            seen.add(t)
            try:
                emit('  [0x%x] = 0x%08x   (referenced from 0x%x)' % (t, rd32(t), a))
            except Exception:
                emit('  [0x%x] = <outside file>  (referenced from 0x%x)' % (t, a))
emit('')

emit('## D. function 0x50b64 body (raw+decoded, 140 insns)')
listing(0x50B64, 140)
emit('')

emit('## E. callers of 0x50b64 in text')
for a, t in find_calls_to([0x50B64]):
    emit('  bl 0x50b64 from 0x%x' % a)
emit('')

emit('## F. table dump helper')
emit('  (populated in section G after base is known)')
emit('')

# table base is computed from section B manually as well; try auto
bases = []
const = {}
for i in range(110):
    a = FN + i * 4
    w = rd32(a)
    if is_ldr_imm_pc(w):
        tgt = lit_of(w, a)
        const[(w >> 12) & 0xF] = rd32(tgt)
    elif is_add_pc(w):
        rm = w & 0xF
        if rm in const:
            bases.append((a, (a + 8 + const[rm]) & 0xFFFFFFFF))
            const[(w >> 12) & 0xF] = (a + 8 + const[rm]) & 0xFFFFFFFF

emit('## G. auto-detected candidate table bases: %s' % (bases,))
emit('')
emit('## G2. fallback candidates for literal 0x1108e58 + every add-pc site')
for i in range(110):
    a = FN + i * 4
    w = rd32(a)
    if is_add_pc(w):
        emit('  add at 0x%x -> 0x%x + 8 + 0x1108e58 = 0x%x'
             % (a, a, (a + 8 + 0x1108E58) & 0xFFFFFFFF))
        bases.append((a, (a + 8 + 0x1108E58) & 0xFFFFFFFF))
emit('')

big = json.load(open(BIGMAP, encoding='utf-8'))
small = json.load(open(SMALLMAP, encoding='utf-8'))
slotmap = {}
for e in big:
    slotmap[e['slot']] = e
for e in small:
    slotmap[e['slot']] = e
emit('## H. slot maps loaded: big=%d small=%d total=%d' % (len(big), len(small), len(slotmap)))
emit('')

for (a, base) in bases:
    emit('### G-dump base=0x%x (from add at 0x%x)' % (base, a))
    if not (0 <= base < BUF_LEN - 0x100):
        emit('  BASE OUT OF FILE RANGE (file covers 0x0..0x%x)' % (BUF_LEN - 0x100))
        continue
    emit('  raw u16[0..159]:')
    row = []
    for i in range(160):
        v = rd16(base + i * 2)
        row.append('%3d:%5d' % (i, v))
        if len(row) == 8:
            emit('    ' + ' '.join(row))
            row = []
    if row:
        emit('    ' + ' '.join(row))
    emit('')
    emit('  cross-check vs slot map:')
    emit('    i   table_u16   map_db_id  map_en                  match')
    for i in range(137):
        v = rd16(base + i * 2)
        e = slotmap.get(i)
        db = e['db_id'] if e else None
        en = e['en'] if e else '-'
        m = 'OK' if (db is not None and v == db) else ('-' if db is None else 'x')
        emit('    %3d %9d %10s  %-22s %s' % (i, v, db, en[:22], m))
    emit('')
    emit('  base-0x40 .. base+0x20 raw hex (bytes):')
    for off in range(-0x40, 0x20, 16):
        try:
            chunk = buf[v2o(base + off):v2o(base + off) + 16]
            emit('    %+05x  %s' % (off, ' '.join('%02x' % b for b in chunk)))
        except Exception:
            pass
    emit('')

open(OUT, 'w', encoding='utf-8').write('\n'.join(LINES) + '\n')
print('\n[written] ' + OUT)
