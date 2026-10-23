import re,glob,os,collections
LABELS={'online-nex','save-data','save-io','render-gfx','audio','ui','monster-em','player-pl','weapon-pw','weapon-wp','otomo-ot','quest','item','filesystem','physics-math','kernel-os','debug-dev','unknown'}
# tiers
tiers={}
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','docs','analysis','code')
for l in open(os.path.join(ROOT,'inventory','tiers.csv'),encoding='utf-8').read().split('\n')[1:]:
    if not l: continue
    s,ins,t,lab=l.split(','); tiers[int(s,16)]=(int(ins),t,lab)
A=[(s,v[0]) for s,v in tiers.items() if v[1]=='A']
B=[(s,v[0]) for s,v in tiers.items() if v[1]=='B']
tot_ins=sum(v[0] for v in tiers.values()); tot_fn=len(tiers)
# tierB adjudications
adj={}
for d,pat in (('tierb-pass3','tierB3-slice-*.md'),('tierb-pass2','tierB2-slice-*.md'),('tierb-pass1','tierB-slice-*.md')):
    for p in sorted(glob.glob(os.path.join(ROOT,d,pat))):
        for l in open(p,encoding='utf-8',errors='ignore'):
            m=re.match(r'\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z\-]+)\s*\|\s*(\w+)\s*\|\s*([ABC])\s*\|\s*(.*?)\s*\|',l)
            if not m: continue
            lab=m.group(2)
            if lab not in LABELS or lab=='unknown': continue
            a=int(m.group(1),16); conf=m.group(4)
            prev=adj.get(a)
            rank={'A':3,'B':2,'C':1}
            if prev is None or rank[conf]>rank[prev[0]]:
                adj[a]=(conf,lab,m.group(5),os.path.basename(p))
confA={a:v for a,v in adj.items() if v[0]=='A'}
confB={a:v for a,v in adj.items() if v[0]=='B'}
print('=== coverage report ===')
print('total: %d functions, %d insns'%(tot_fn,tot_ins))
def pct(x): return '%.1f%%'%(x/tot_ins*100)
Ains=sum(i for _,i in A)
print('Tier A (high conf, 94.7%% measured): %d funcs, %d insns = %s'%(len(A),Ains,pct(Ains)))
BAins=sum(tiers[a][0] for a in confA if a in tiers)
print('Tier B conf=A (disasm/string evidence): %d funcs, %d insns = %s'%(len(confA),BAins,pct(BAins)))
BBins=sum(tiers[a][0] for a in confB if a in tiers)
print('Tier B conf=B (vote only, NOT counted): %d funcs, %d insns = %s'%(len(confB),BBins,pct(BBins)))
print('--- headline: A + B(confA) = %d insns = %s of .text ---'%(Ains+BAins,pct(Ains+BAins)))
print('    function count: %d / %d = %.1f%%'%(len(A)+len(confA),tot_fn,(len(A)+len(confA))/tot_fn*100))
c=collections.Counter(v[1] for v in adj.values())
print('\nTier B adjudicated labels:'); [print('   %-16s %d'%(k,v)) for k,v in c.most_common()]
