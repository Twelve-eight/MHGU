import fs from 'node:fs';
const lines=fs.readFileSync('.tmp/mhgu/inventory/functions4.csv','utf8').trim().split('\n').slice(1);
const rows=[],byStart=new Map();
for(const l of lines){const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/);if(!m)continue;
 const r={s:parseInt(m[1]),e:parseInt(m[2]),n:+m[3],cal:m[5]?m[5].split('|').map(x=>parseInt(x)):[],str:m[6]||''};rows.push(r);byStart.set(r.s,r);}
// string-only taxonomy (no bare /UI/ !)
const STR=[
 ['online-nex',/(OnlineCore|Nex[A-Z]|Nex::|InstanceTable|NNC_|RVCID|Matchmake|SessionJob|MeshJob|HostMigration|HTTP)/],
 ['save-data',/(savedata|saveData|SaveData|sSlot|SaveSlot)/],
 ['render-gfx',/(shader|Shader|texture|Texture|render|Render|vfx|Mesh|model|Model|camera)/],
 ['audio',/(\bsnd|Snd|\bSE\b|BGM|bgm|Sound|sound|Music)/],
 ['ui',/(\bMenu|Menu[A-Z]|\bHud|Layout[A-Z]|layout_)/],
 ['monster-em',/(emUniqueAct|uEm\d|cEm|EnemyCharacter|MonsterUnit|mParam\.|actionNo|netEmAction|EmSetList|rEnemyDt)/],
 ['player-pl',/(cPl|uPl|PlayerState|player_)/],
 ['weapon-wp',/(\bwp_|cWp|Weapon|pEquipData)/],
 ['otomo-ot',/(otomo|Otomo|nyanter|Nyanter|netOt[A-Z])/],
 ['quest',/(quest|Quest)/],
 ['item',/(\bitem|ItemData|cItem)/],
 ['filesystem',/(romfs|Romfs|fw_fs|FileSystem|filedev)/],
 ['physics-math',/(MtCollision|rigid|Rigid|Phys)/],
 ['kernel-os',/(MtAllocator|MtArray|MtList|MtTree|MtDti|Thread|Heap|Mutex|BitIO|Archive|Stream)/],
];
function lab(s){for(const [k,re] of STR) if(re.test(s))return k;return null;}
const seeds=[];
for(const r of rows){const l=lab(r.str); if(l) seeds.push({r,lab:l});}
console.log('string seeds:',seeds.length);
const rev=new Map();
for(const r of rows)for(const c of r.cal){if(!rev.has(c))rev.set(c,[]);rev.get(c).push(r.s);}
function run(seedv,thr){
  let st=seedv;const rnd=()=>{st=(st*1103515245+12345)&0x7fffffff;return st/0x7fffffff;};
  const idx=seeds.map((_,i)=>i).sort(()=>rnd()-0.5);
  const cut=Math.floor(idx.length*0.8);
  const train=idx.slice(0,cut).map(i=>seeds[i]);
  const test=idx.slice(cut).map(i=>seeds[i]);
  const L=new Map(); for(const s of train) L.set(s.r.s,s.lab);
  for(let it=0;it<8;it++){let ch=0;
    for(const r of rows){ if(L.has(r.s))continue;
      const v=new Map();
      for(const c of r.cal){const l=L.get(c);if(l)v.set(l,(v.get(l)||0)+1);}
      for(const p of (rev.get(r.s)||[])){const l=L.get(p);if(l)v.set(l,(v.get(l)||0)+1);}
      if(!v.size)continue;
      const b=[...v.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(b[1]>=thr){L.set(r.s,b[0]);ch++;}
    }
    if(!ch)break;}
  let ok=0; for(const t of test) if(L.get(t.r.s)===t.lab) ok++;
  return {acc:ok/test.length, n:test.length, assigned:L.size, ok};
}
for(const thr of [1,2]){
  const res=[];
  for(let k=0;k<10;k++) res.push(run(1000+k*7919,thr));
  const accs=res.map(r=>r.acc*100);
  const mean=accs.reduce((a,b)=>a+b,0)/accs.length;
  const min=Math.min(...accs), max=Math.max(...accs);
  const sd=Math.sqrt(accs.reduce((a,b)=>a+(b-mean)**2,0)/accs.length);
  console.log(`thr>=${thr}: holdout acc mean=${mean.toFixed(1)}% min=${min.toFixed(1)}% max=${max.toFixed(1)}% sd=${sd.toFixed(1)} (n≈${res[0].n}/split, assigned=${res[0].assigned})`);
}
