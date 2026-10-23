import fs from 'node:fs';
const lines=fs.readFileSync('.tmp/mhgu/inventory/functions4.csv','utf8').trim().split('\n').slice(1);
const rows=[],byStart=new Map();
for(const l of lines){const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/);if(!m)continue;
 const r={s:parseInt(m[1]),e:parseInt(m[2]),n:+m[3],cal:m[5]?m[5].split('|').map(x=>parseInt(x)):[],str:m[6]||''};rows.push(r);byStart.set(r.s,r);}
const STR=[['online-nex',/(OnlineCore|Nex[A-Z]|Nex::|InstanceTable|NNC_|RVCID|Matchmake|SessionJob|MeshJob|HostMigration|HTTP)/],
 ['save-data',/(savedata|saveData|SaveData|sSlot|SaveSlot)/],['render-gfx',/(shader|Shader|texture|Texture|render|Render|vfx|Mesh|model|Model|camera)/],
 ['audio',/(\bsnd|Snd|\bSE\b|BGM|bgm|Sound|sound|Music)/],['ui',/(\bMenu|Menu[A-Z]|\bHud|Layout[A-Z]|layout_)/],
 ['monster-em',/(emUniqueAct|uEm\d|cEm|EnemyCharacter|MonsterUnit|mParam\.|actionNo|netEmAction|EmSetList|rEnemyDt)/],
 ['player-pl',/(cPl|uPl|PlayerState|player_)/],['weapon-wp',/(\bwp_|cWp|Weapon|pEquipData)/],
 ['otomo-ot',/(otomo|Otomo|nyanter|Nyanter|netOt[A-Z])/],['quest',/(quest|Quest)/],['item',/(\bitem|ItemData|cItem)/],
 ['filesystem',/(romfs|Romfs|fw_fs|FileSystem|filedev)/],['physics-math',/(MtCollision|rigid|Rigid|Phys)/],
 ['kernel-os',/(MtAllocator|MtArray|MtList|MtTree|MtDti|Thread|Heap|Mutex|BitIO|Archive|Stream)/]];
function lof(s){for(const [k,re] of STR) if(re.test(s))return k;return null;}
const seeds=[]; for(const r of rows){const l=lof(r.str); if(l)seeds.push({r,lab:l});}
const rev=new Map(); for(const r of rows)for(const c of r.cal){if(!rev.has(c))rev.set(c,[]);rev.get(c).push(r.s);}
function run(seedv){
  let st=seedv;const rnd=()=>{st=(st*1103515245+12345)&0x7fffffff;return st/0x7fffffff;};
  const idx=seeds.map((_,i)=>i).sort(()=>rnd()-0.5); const cut=Math.floor(idx.length*0.8);
  const train=idx.slice(0,cut).map(i=>seeds[i]).sort((a,b)=>a.r.s-b.r.s);
  const test=idx.slice(cut).map(i=>seeds[i]);
  const L=new Map(); for(const s of train) L.set(s.r.s,s.lab);
  for(let it=0;it<8;it++){let ch=0;
    for(const r of rows){ if(L.has(r.s))continue;
      const v=new Map();
      for(const c of r.cal){const l=L.get(c);if(l)v.set(l,(v.get(l)||0)+1);}
      for(const p of (rev.get(r.s)||[])){const l=L.get(p);if(l)v.set(l,(v.get(l)||0)+1);}
      if(!v.size)continue; const b=[...v.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(b[1]>=1){L.set(r.s,b[0]);ch++;}}
    if(!ch)break;}
  // address-locality predictor
  const predAddr=s=>{let lo=0,hi=train.length-1,best=null;
    while(lo<=hi){const mid=(lo+hi)>>1;if(train[mid].r.s<=s){best=train[mid];lo=mid+1;}else hi=mid-1;}
    const left=best; const right=train.find(t=>t.r.s>s);
    if(!left)return right?right.lab:null; if(!right)return left.lab;
    return (s-left.r.e)<=(right.r.s-s)?left.lab:right.lab;};
  let agree=0,agreeOk=0,dis=0,disOk=0,cgOnly=0,cgOk=0;
  for(const t of test){
    const a=predAddr(t.r.s), g=L.get(t.r.s);
    if(a&&g&&a===g){agree++; if(a===t.lab)agreeOk++;}
    else if(a&&g){dis++; if(g===t.lab)disOk++;}
    else if(g){cgOnly++; if(g===t.lab)cgOk++;}
  }
  return {agree,agreeOk,dis,disOk,cgOnly,cgOk,n:test.length};
}
const agg={agree:0,agreeOk:0,dis:0,disOk:0,cgOnly:0,cgOk:0,n:0};
for(let k=0;k<10;k++){const r=run(3000+k*104729); for(const k2 of Object.keys(agg)) agg[k2]+=r[k2];}
console.log('10-fold aggregate over',agg.n,'holdout seeds');
console.log('  both predictors agree : %d  correct %d = %.1f%%',agg.agree,agg.agreeOk,(agg.agreeOk/agg.agree*100).toFixed(1));
console.log('  disagree             : %d  callgraph correct %d = %.1f%%',agg.dis,agg.disOk,(agg.disOk/agg.dis*100).toFixed(1));
console.log('  callgraph only       : %d  correct %d = %.1f%%',agg.cgOnly,agg.cgOk,(agg.cgOk/agg.cgOnly*100).toFixed(1));
console.log('  overall              : %d/%d = %.1f%%',agg.agreeOk+agg.disOk+agg.cgOk,agg.n,((agg.agreeOk+agg.disOk+agg.cgOk)/agg.n*100).toFixed(1));
