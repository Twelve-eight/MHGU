import re, struct, collections
FL=open('.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin','rb').read()
def crc32raw(b):
    c=0xFFFFFFFF
    for x in b:
        c^=x
        for _ in range(8):
            c=(c>>1)^0xEDB88320 if (c&1) else c>>1
    return c
# build string -> hash map over all printable runs
strs={}
for m in re.finditer(rb'[ -~]{3,120}\x00', FL):
    s=m.group()[:-1]
    v=m.start()-0x100
    if v<0: continue
    h=crc32raw(s)
    if h not in strs: strs[h]=s.decode('ascii')
print('distinct strings:',len(strs))
# scan data region 0x15dca00..0x15dd800 for 8B records {A,B}
base=0x15dca00; end=0x15dd800
recs=[]
off=base
while off+8<=end:
    a=struct.unpack_from('<I',FL,off+0x100)[0]
    b=struct.unpack_from('<I',FL,off+0x100+4)[0]
    recs.append((off,a,b)); off+=8
annot=[(o,a,b,strs.get(a),strs.get(b)) for o,a,b in recs]
known=[x for x in annot if x[3] or x[4]]
print('records:',len(recs),' annotated:',len(known))
print('\nfirst 40 annotated:')
for o,a,b,na,nb in known[:40]:
    print('  0x%x  A=%-28s B=%-28s'%(o,na or ('?%.8x'%a), nb or ('?%.8x'%b)))
# group by B (class)
g=collections.Counter(x[4] or ('?%.8x'%x[2]) for x in annot)
print('\nclasses by record count (top 25):')
for k,v in g.most_common(25): print('  %-34s %d'%(k,v))
open('.tmp/mhgu/inventory/resource-registry.txt','w',encoding='utf-8').write(
  '\n'.join('0x%x\t%s\t%s'%(o,na or ('?%.8x'%a), nb or ('?%.8x'%b)) for o,a,b,na,nb in annot))
