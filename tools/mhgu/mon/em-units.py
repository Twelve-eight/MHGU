#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""uEm###_00 unit-name table dissection (MHGU main.140).

flat_off = vaddr + 0x100
S1  full string pool dump 0x1552600..0x1552d00 (vaddr, len, text, delta)
S2  every uEm/uEms string anywhere in the image
S3  pointer scan: aligned u32 == uEm string start -> runs -> index|name table
S4  descriptor arrays (stride 8/12/16/20/24) whose field is a uEm string start
S5  .text literal-pool xrefs to uEm strings
S6  index<->id hypothesis tests
"""
import struct, re, collections

FLAT = r"G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin"
B = 0x100
TEXT_END = 0x13F1DEC
raw = open(FLAT, "rb").read()
N = len(raw)

def v2o(v): return v + B
def o2v(o): return o - B
def rd32(v): return struct.unpack_from("<I", raw, v2o(v))[0]
def rd16(v): return struct.unpack_from("<H", raw, v2o(v))[0]

print("# file=%s size=0x%x last_vaddr=0x%x" % (FLAT, N, o2v(N) - 1))

def printable(c):
    return 0x20 <= c <= 0x7e

def str_at(o):
    e = o
    while e < N and printable(raw[e]):
        e += 1
    if e >= N or raw[e] != 0:
        return None
    return raw[o:e].decode("ascii")

# ---------------- S1 pool dump -----------------
LO, HI = 0x1552600, 0x1552d00
print("\n## S1 string pool 0x%x..0x%x" % (LO, HI))
o = v2o(LO)
prev_end = None
pool = {}
while o < v2o(HI):
    s = str_at(o)
    if s is not None and len(s) >= 2:
        v = o2v(o)
        pool[v] = s
        gap = "" if prev_end is None else " gap=0x%x" % (v - prev_end)
        print("  0x%08X len=%-2d%s  %s" % (v, len(s), gap, s))
        prev_end = v + len(s) + 1
        o += len(s) + 1
    else:
        o += 1

# ---------------- S2 all uEm strings -----------------
print("\n## S2 all uEm/uEms strings in image")
em_re = re.compile(r"^uEms?\d+_\d+$")
allem = {}
o = v2o(TEXT_END)
while o < N:
    s = str_at(o)
    if s is not None and len(s) >= 2:
        if em_re.match(s):
            allem[o2v(o)] = s
        o += len(s) + 1
    else:
        o += 1
for v in sorted(allem):
    print("  0x%08X  %s" % (v, allem[v]))
big = sorted({s for s in allem.values() if s.startswith("uEm")})
small = sorted({s for s in allem.values() if s.startswith("uEms")})
print("  unique uEm=%d unique uEms=%d" % (len(big), len(small)))

def numid(s):
    m = re.match(r"^uEms?(\d+)_(\d+)$", s)
    return int(m.group(1)) if m else None

print("  uEm ids:", ",".join("%d" % numid(s) for s in big))
print("  uEms ids:", ",".join("%d" % numid(s) for s in small))

# ---------------- S3 pointer scan -----------------
print("\n## S3 pointer scan (aligned u32 == uEm string start)")
starts = set(allem.keys())
sites = []
for o in range(0, N - 4, 4):
    w = struct.unpack_from("<I", raw, o)[0]
    if w in starts:
        sites.append((o2v(o), w))
print("  total sites = %d" % len(sites))

runs = []
cur = []
for p, w in sites:
    if cur and p == cur[-1][0] + 4:
        cur.append((p, w))
    else:
        if cur: runs.append(cur)
        cur = [(p, w)]
if cur: runs.append(cur)
print("  strict 4-byte runs = %d" % len(runs))
for r in runs:
    if len(r) >= 2:
        names = [allem[w] for p, w in r]
        print("   RUN 0x%08X..0x%08X n=%d" % (r[0][0], r[-1][0], len(r)))
        for k, (p, w) in enumerate(r):
            print("     [%3d] 0x%08X 0x%08X %s" % (k, p, w, allem[w]))
    else:
        p, w = r[0]
        print("   single 0x%08X -> 0x%08X %s" % (p, w, allem[w]))

# ---------------- S4 descriptor arrays -----------------
print("\n## S4 descriptor arrays: constant stride, one field == uEm start")
byregion = collections.defaultdict(list)
for p, w in sites:
    byregion[p & ~0xFFF].append((p, w))
found = 0
for base in sorted(byregion):
    lst = byregion[base]
    for stride in (8, 12, 16, 20, 24, 28, 32):
        # align to stride grid relative to base
        grid = collections.defaultdict(list)
        for p, w in lst:
            grid[p % stride].append((p, w))
        for rem, items in grid.items():
            items.sort()
            # consecutive hits at same stride>=2
            seqs = []
            c = [items[0]]
            for it in items[1:]:
                if it[0] - c[-1][0] == stride:
                    c.append(it)
                else:
                    if len(c) >= 2: seqs.append(c)
                    c = [it]
            if len(c) >= 2: seqs.append(c)
            for s in seqs:
                arr0 = s[0][0] - rem if s[0][0] - rem >= 0 else s[0][0]
                print("   STRIDE=%d field_off=0x%x 0x%08X..0x%08X n=%d" %
                      (stride, rem, s[0][0], s[-1][0], len(s)))
                for k, (p, w) in enumerate(s):
                    print("     [%3d] 0x%08X 0x%08X %s" % (k, p, w, allem[w]))
                found += 1
print("  descriptor arrays found = %d" % found)

# ---------------- S5 text xrefs -----------------
print("\n## S5 .text pc-relative literal xrefs to uEm strings")
lits = {}
o = v2o(TEXT_END) - 4
# literal pools live in .text; scan every aligned word for an address that is
# also loaded by a nearby ldr rX,[pc,#imm]
pool_addr = {}
for o in range(B, v2o(TEXT_END), 4):
    w = struct.unpack_from("<I", raw, o)[0]
    if w in starts:
        pool_addr[o2v(o)] = w
print("  literal-pool words pointing at uEm strings = %d" % len(pool_addr))
xref = collections.defaultdict(list)
for o in range(B, v2o(TEXT_END), 4):
    w = struct.unpack_from("<I", raw, o)[0]
    # ldr rX,[pc,#+/-imm]  encodings: E59Fxxxx (ldr) / E51Fxxxx
    if (w & 0x0F7F0000) == 0x051F0000 or (w & 0x0F7F0000) == 0x051F0000:
        pass
    top = w & 0xFFFF0000
    if top == 0xE59F0000 or top == 0xE51F0000:
        imm = w & 0xFFF
        pc = o2v(o) + 8
        tgt = pc + imm if top == 0xE59F0000 else pc - imm
        if tgt in pool_addr:
            xref[pool_addr[tgt]].append(o2v(o))
print("  uEm strings loaded via literal = %d" % len(xref))
for t in sorted(xref):
    print("   0x%08X %-12s <- %s" % (t, allem[t], " ".join("0x%X" % x for x in xref[t][:6])))

# ---------------- S6 hypothesis -----------------
print("\n## S6 index<->id consistency per strict run")
for r in runs:
    if len(r) < 4:
        continue
    ids = [numid(allem[w]) for p, w in r]
    ok = all(i == k + ids[0] for k, i in enumerate(ids))
    print("   0x%08X n=%d first_id=%d dense=%s ids=%s" %
          (r[0][0], len(r), ids[0], ok, ids[:20]))
print("\n# DONE")
