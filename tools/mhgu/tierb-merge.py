import re,glob,os,collections
LABELS={'online-nex','save-data','save-io','render-gfx','audio','ui','monster-em','player-pl','weapon-wp','otomo-ot','quest','item','filesystem','physics-math','kernel-os','debug-dev','unknown'}
rows=[]
for p in sorted(glob.glob('.tmp/reports-mhgu/tierB-slice-*.md')):
    for l in open(p,encoding='utf-8',errors='ignore'):
        m=re.match(r'\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z\-]+)\s*\|\s*(leaf|thunk|orchestrator|worker)\s*\|\s*([ABC])\s*\|\s*(.*?)\s*\|',l)
        if not m: continue
        lab=m.group(2)
        if lab not in LABELS: continue
        rows.append((int(m.group(1),16),lab,m.group(3),m.group(4),m.group(5),os.path.basename(p)))
seen={}; 
for r in rows: seen[r[0]]=r
rows=list(seen.values())
print('parsed rows (deduped):',len(rows))
if rows:
    c=collections.Counter(r[1] for r in rows); cc=collections.Counter(r[3] for r in rows)
    unk=sum(1 for r in rows if r[1]=='unknown')
    print('coverage of Tier B: %d / 14863 = %.1f%%'%(len(rows),len(rows)/14863*100))
    print('conf A/B/C: %d/%d/%d'%(cc['A'],cc['B'],cc['C']))
    print('unknown: %d = %.1f%%'%(unk,unk/len(rows)*100))
    print('labels:'); [print('   %-16s %d'%(k,v)) for k,v in c.most_common()]
    with open('.tmp/mhgu/inventory/tierb-labels.csv','w',encoding='utf-8') as f:
        f.write('vaddr,label,role,conf,evidence,src\n')
        for r in sorted(rows): f.write('0x%x,%s,%s,%s,"%s",%s\n'%(r[0],r[1],r[2],r[3],r[4].replace('"',"'"),r[5]))
    print('wrote .tmp/mhgu/inventory/tierb-labels.csv')
