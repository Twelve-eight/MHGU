#!/usr/bin/env python3
# mon-offsets.py -- extract {class-member name, byte offset, type code} from the inline
# property builders. Pattern (see fn 0x48698):
#   bl 0x7bb638                       ; new property record
#   ldr r1,[pc,#imm] ; add r1,pc,r1    ; -> name string
#   str r1,[r0,#0]                     ; record->name
#   mov r1,#TYPE                       ; type code
#   stm  r0,{r1,rBASE}
#   add r1,rBASE,#OFFSET               ; <-- member byte offset
#   str r1,[r0,#12]                    ; record->data = instance+OFFSET
import struct, re
from collections import defaultdict
FLAT = r'G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin'
B = 0x100
TEXT_END = 0x13F1DEC
raw = open(FLAT, 'rb').read()
N = len(raw); ENDV = N - B
def v2o(v): return v + B
def u32v(v): return struct.unpack_from('<I', raw, v + B)[0]
def printable(c): return 0x20 <= c <= 0x7e
def strings_between(lo, hi):
    out = []; o = lo + B; end = hi + B
    while o < end:
        if printable(raw[o]):
            e = o
            while e < end and printable(raw[e]): e += 1
            if e < N and raw[e] == 0 and e - o >= 3:
                out.append((o - B, raw[o:e].decode('ascii'))); o = e + 1; continue
        o += 1
    return out
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

POOL_LO, POOL_HI = 0x1552200, 0x1553421
def is_subject(nm, addr):
    if POOL_LO <= addr <= POOL_HI:
        return True
    if re.match(r'^(cEm|cEnemy|rEm|rEnemy|rMonster|rHitDataEnemy|uEm|uEms|sEnemy|uEnemy)', nm):
        return True
    return False

recs = []   # (fn, name, off, typecode, site)
for (s, e) in funcs:
    st = {}            # reg -> const (string ptr / delta)
    last_name = None
    last_addr = -1
    last_type = None
    base_reg = None
    a = s
    while a < min(e, TEXT_END):
        w = u32v(a); dst = None; got = None
        if (w & 0x0F7F0000) == 0x051F0000:              # ldr rd,[pc,#+-imm]
            imm = w & 0xFFF; dst = (w >> 12) & 0xF
            lit = a + 8 + (imm if (w & 0x00800000) else -imm)
            if 0 <= lit < ENDV - 3: got = u32v(lit)
        elif (w & 0x0F7F0000) == 0x071F0000:            # ldr rd,[pc,rm]
            dst = (w >> 12) & 0xF; rm = w & 0xF
            if rm in st:
                lit = a + 8 + st[rm]
                if 0 <= lit < ENDV - 3: got = u32v(lit)
        elif (w & 0x0FFF0FF0) == 0x008F0000:            # add rd,pc,rm -> string ptr
            dst = (w >> 12) & 0xF; rm = w & 0xF
            if rm in st:
                got = (a + 8 + st[rm]) & 0xffffffff
                if got in smap:
                    last_name = smap[got]
                    last_addr = got
        elif (w & 0x0FE00000) == 0x02800000:            # add rd,rn,#imm (any Rn)
            dst = (w >> 12) & 0xF; rn = (w >> 16) & 0xF
            imm = rotimm(w)
            if rn in st:
                got = (st[rn] + imm) & 0xffffffff
            # record builder: add rX, rBASE, #OFF then str rX,[r0,#12]
            if imm < 0x400 and a + 8 < min(e, TEXT_END):
                w2 = u32v(a + 4)
                if (w2 & 0xFFF00FFF) == 0xE580000C:     # str rX,[rY,#12]
                    if last_name and is_subject(last_name, last_addr):
                        recs.append((s, last_name, imm, last_type, a))
        elif (w & 0x0FF00000) == 0x00800000 and (w & 0xFF0) == 0:   # add rd,rn,rm
            dst = (w >> 12) & 0xF; rn = (w >> 16) & 0xF; rm = w & 0xF
            if rn in st and rm in st: got = (st[rn] + st[rm]) & 0xffffffff
        elif (w & 0x0FEF0000) == 0x03A00000:            # mov rd,#imm
            dst = (w >> 12) & 0xF; got = rotimm(w)
            if got <= 0x40: last_type = got
        elif (w & 0x0FF00000) in (0x03000000, 0x03400000):
            dst = (w >> 12) & 0xF
            imm16 = (((w >> 16) & 0xF) << 12) | (w & 0xFFF)
            got = imm16 if (w & 0x0FF00000) == 0x03000000 else ((imm16 << 16) | (st.get(dst, 0) & 0xFFFF))
        if is_branch(w):
            for r in (0, 1, 2, 3, 12): st.pop(r, None)
            a += 4; continue
        if dst is not None:
            if got is not None: st[dst] = got
            else: st.pop(dst, None)
        else:
            if ((w >> 26) & 3) in (0, 1): st.pop((w >> 12) & 0xF, None)
        a += 4

print(f'# records extracted = {len(recs)}')
byfn = defaultdict(list)
for r in recs: byfn[r[0]].append(r)
print(f'# functions with records = {len(byfn)}')
for s in sorted(byfn):
    rs = byfn[s]
    print(f'\n### fn 0x{s:x}  records={len(rs)}')
    for (_, nm, off, ty, site) in rs:
        print(f'   off=0x{off:03x}  type={ty}  {nm}   (site 0x{site:x})')
print('\n# DONE')
