import csv,os
tiers={}
for l in open('.tmp/mhgu/inventory/tiers.csv',encoding='utf-8').read().split('\n')[1:]:
    if not l: continue
    s,ins,t,lab=l.split(',')
    tiers[int(s,16)]=(int(ins),t,lab)
rows=[]
for l in open('.tmp/mhgu/inventory/functions4.csv',encoding='utf-8',errors='ignore').read().split('\n')[1:]:
    if not l: continue
    import re
    m=re.match(r'^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$',l)
    if not m: continue
    s=int(m.group(1),16)
    if tiers.get(s,(-1,'',''))[1]!='B': continue
    rows.append((s,int(m.group(3)),int(m.group(4)),m.group(5),m.group(6)))
rows.sort()
print('Tier B functions:',len(rows))
N=14
chunk=(len(rows)+N-1)//N
os.makedirs('.tmp/mhgu/tierB',exist_ok=True)
for k in range(N):
    part=rows[k*chunk:(k+1)*chunk]
    if not part: break
    with open('.tmp/mhgu/tierB/slice-%02d.txt'%(k+1),'w',encoding='utf-8') as f:
        f.write('# Tier B slice %02d — %d functions, addr 0x%x..0x%x\n'%(k+1,len(part),part[0][0],part[-1][0]))
        f.write('# 格式: vaddr\tinsns\tcallers\tcallees\tstrings(最多5条, | 分隔)\n')
        for s,n,cal,calstr,strs in part:
            ss=' | '.join(x for x in strs.split('|')[:5] if x)
            f.write('0x%x\t%d\t%d\t%s\t%s\n'%(s,n,cal,(calstr or '-')[:160],ss[:400]))
    print('  slice-%02d: %d funcs 0x%x..0x%x'%(k+1,len(part),part[0][0],part[-1][0]))
