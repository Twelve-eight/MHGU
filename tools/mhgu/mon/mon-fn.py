#!/usr/bin/env python3
# mon-fn.py -- full (untruncated) string-materialization lists for the enemy classes' functions,
# and raw word dump of 0x48698 (cEmSizeCalcTblElement member reader) for manual decode.
import struct
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
def rotimm(w):
    imm = w & 0xFF; rot = ((w >> 8) & 0xF) * 2
    return ((imm >> rot) | (imm << (32 - rot))) & 0xffffffff if rot else imm
def is_branch(w): return (w & 0x0E000000) == 0x0A000000

def scan(s, e):
    st = {}; hits = []
    a = s
    while a < min(e, TEXT_END):
        w = u32v(a); dst = None; got = None
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
            got = imm16 if (w & 0x0FF00000) == 0x03000000 else ((imm16 << 16) | (st.get(dst, 0) & 0xFFFF))
        if is_branch(w):
            for r in (0, 1, 2, 3, 12): st.pop(r, None)
            a += 4; continue
        if dst is not None:
            if got is not None:
                st[dst] = got
                if got in smap: hits.append((a, got))
            else: st.pop(dst, None)
        else:
            if ((w >> 26) & 3) in (0, 1): st.pop((w >> 12) & 0xF, None)
        a += 4
    return hits

FNS = [(0x45118, 0x46498), (0x46498, 0x479a0), (0x479a0, 0x48698), (0x48698, 0x48a38),
       (0x4a13c, 0x4a46c), (0x4a46c, 0x4c124), (0x4edec, 0x50ce0), (0x53ea0, 0x56180),
       (0x564bc, 0x596b4), (0x59f30, 0x5a000), (0x5c970, 0x5d760)]
for (s, e) in FNS:
    hits = scan(s, e)
    print(f'\n### fn 0x{s:x}..0x{e:x}  ({len(hits)} string sites)')
    for (a, t) in hits:
        print(f'  0x{a:x} -> 0x{t:x}  {smap[t]}')

print('\n## raw word dump 0x48698..0x48a38 (vaddr, word, then decoded literal if any)')
for a in range(0x48698, 0x48a38, 4):
    w = u32v(a)
    extra = ''
    if (w & 0x0F7F0000) == 0x051F0000:
        imm = w & 0xFFF
        lit = a + 8 + (imm if (w & 0x00800000) else -imm)
        if 0 <= lit < ENDV - 3:
            v = u32v(lit)
            extra = f'  ; lit@0x{lit:x}={v:#010x}'
    print(f'  0x{a:x}  {w:08x}{extra}')
print('\n# DONE')
