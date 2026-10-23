import fs from 'node:fs';
const lines=fs.readFileSync('G:/omp works/.tmp/mhgu/inventory/functions2.csv','utf8').trim().split('\n').slice(1);
const rows=[]; const byStart=new Map();
for(const l of lines){
  const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/); if(!m)continue;
  const r={s:parseInt(m[1]),e:parseInt(m[2]),n:+m[3],callers:+m[4],
    cal:m[5]?m[5].split('|').map(x=>parseInt(x)):[],str:m[6]||'',sub:null};
  rows.push(r);byStart.set(r.s,r);
}
const RULES=[
 ['online-nex',/(OnlineCore|Nex[A-Z]|Nex::|InstanceTable|NNC_|RVCID|Matchmake|SessionJob|MeshJob|HostMigration|HTTP|Content)/],
 ['save-data',/(savedata|saveData|SaveData|sSave|mSave|SaveSlot)/],
 ['render-gfx',/(gfx|Gfx|render|Render|shader|Shader|texture|Texture|draw|Draw|mesh|Mesh|Model|model|vfx|camera|Camera)/],
 ['audio',/(\bsnd|Snd|\bSE\b|BGM|bgm|Audio|audio|Sound|sound|FueMusic|Music)/],
 ['ui',/(\bgui|Gui|\bUI\b|\bUi|Menu|menu|hud|Hud|HUD|layout|Layout|Canvas|canvas)/],
 ['monster-em',/(emUniqueAct|uEm\d|cEm|\bems\d|EnemyCharacter|MonsterUnit|mParam\.|actionNo|netEmAction|EmSetList|EnemyResource|rEnemyDt|rMonsterParts)/],
 ['player-pl',/(cPl|uPl|player|Player|cPlayer)/],
 ['weapon-wp',/(\bwp_|cWp|cWeapon|Weapon|weapon|mEquipNo|pEquipData)/],
 ['otomo-ot',/(otomo|Otomo|\bmOt|nyanter|Nyanter|netOt[A-Z])/],
 ['quest',/(quest|Quest|mQuest|cQuest|QuestData)/],
 ['item',/(\bitem|Item|cItem|mItem|ItemData)/],
 ['filesystem',/(romfs|Romfs|fw_fs|FileSystem|filedev)/],
 ['physics-math',/(\bvec|Vec|matrix|Matrix|quat|Quat|rigid|Rigid|Colli|Phys|phys)/],
 ['kernel-os',/(\bnn_|os::|Os::|thread|Thread|heap|Heap|mutex|Mutex|CriticalSection)/],
 ['network-lib',/(\bnet\d|\bNet[A-Z]|Network|network|socket|Socket)/],
 ['debug-dev',/(Debug|debug|Assert|assert|printf|_Log|Log_)/],
];
const SAVE_READ=0x3df2a8,SAVE_WRITE=0x3df378,BITCAP=0x3df1b8,BITRD=0x3df22c;
function seedOf(r){
  for(const [n,re] of RULES) if(re.test(r.str))return n;
  if(r.cal.includes(SAVE_READ)||r.cal.includes(SAVE_WRITE)||r.cal.includes(BITCAP)||r.cal.includes(BITRD))return 'save-io';
  return null;
}
for(const r of rows){r.trueLabel=seedOf(r);}
const seeded=rows.filter(r=>r.trueLabel);
// deterministic shuffle
let st=12345; const rnd=()=>{st=(st*1103515245+12345)&0x7fffffff;return st/0x7fffffff;};
const idx=seeded.map((_,i)=>i).sort(()=>rnd()-0.5);
const cut=Math.floor(idx.length*0.8);
const train=idx.slice(0,cut).map(i=>seeded[i]);
const test=new Set(idx.slice(cut).map(i=>seeded[i].s));

function propagate(edgeMap, seeds, maxIter=8){
  const lab=new Map();
  for(const r of seeds) lab.set(r.s,r.trueLabel);
  for(let it=0;it<maxIter;it++){
    let ch=0;
    for(const r of rows){
      if(lab.has(r.s))continue;
      const v=new Map();
      for(const c of r.cal){const l=lab.get(c);if(l)v.set(l,(v.get(l)||0)+1);}
      for(const p of (edgeMap.get(r.s)||[])){const l=lab.get(p);if(l)v.set(l,(v.get(l)||0)+1);}
      if(!v.size)continue;
      const b=[...v.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(b[1]>=2){lab.set(r.s,b[0]);ch++;}
    }
    if(!ch)break;
  }
  return lab;
}
const rev=new Map();
for(const r of rows)for(const c of r.cal){if(!rev.has(c))rev.set(c,[]);rev.get(c).push(r.s);}

// --- real graph ---
const labReal=propagate(rev,train);
let tp=0,fn=0;const conf=new Map();
for(const r of rows){
  if(!test.has(r.s))continue;
  const p=labReal.get(r.s), t=r.trueLabel;
  if(p===t)tp++;else fn++;
  const k=t+' -> '+(p||'(none)');conf.set(k,(conf.get(k)||0)+1);
}
console.log('=== HOLDOUT VALIDATION (20% seeds held out) ===');
console.log('train seeds:',train.length,' test seeds:',test.size);
console.log('holdout accuracy:',tp,'/',tp+fn,'=',(tp/(tp+fn)*100).toFixed(1)+'%');
console.log('\nconfusion (true -> predicted), top:');
[...conf.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>console.log('  '+k.padEnd(34)+v));

// hop distance to nearest train seed (BFS over undirected graph)
const dist=new Map(); const q=[];
for(const r of train){dist.set(r.s,0);q.push(r.s);}
for(let i=0;i<q.length;i++){
  const u=q[i],d=dist.get(u);
  const nb=[...(byStart.get(u)?.cal||[]),...(rev.get(u)||[])];
  for(const v of nb){ if(!dist.has(v)){dist.set(v,d+1);q.push(v);} }
}
const hist=new Map();
for(const r of rows){const d=dist.has(r.s)?dist.get(r.s):999;hist.set(d,(hist.get(d)||0)+1);}
console.log('\nhop-distance to nearest train seed:');
[...hist.entries()].sort((a,b)=>a[0]-b[0]).forEach(([d,v])=>console.log('  d='+(d===999?'unreached':d)+': '+v));

// --- permuted baseline: shuffle callee lists across functions ---
const allCal=rows.map(r=>r.cal.slice());
for(let i=allCal.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[allCal[i],allCal[j]]=[allCal[j],allCal[i]];}
const revP=new Map();
rows.forEach((r,i)=>{for(const c of allCal[i]){if(!revP.has(c))revP.set(c,[]);revP.get(c).push(r.s);}});
const labP=propagate(revP,train);
let pAssigned=0;for(const r of rows)if(labP.has(r.s))pAssigned++;
let pCorrect=0,pTot=0;
for(const r of rows){if(!test.has(r.s))continue;pTot++;if(labP.get(r.s)===r.trueLabel)pCorrect++;}
console.log('\npermuted baseline: assigned='+pAssigned+'/'+rows.length+'='+(pAssigned/rows.length*100).toFixed(1)+'%, holdout acc='+(pCorrect/pTot*100).toFixed(1)+'%');
console.log('real graph: assigned='+labReal.size+'/'+rows.length+'='+(labReal.size/rows.length*100).toFixed(1)+'%');
