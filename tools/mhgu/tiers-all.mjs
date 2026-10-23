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
const train=seeds.slice().sort((a,b)=>a.r.s-b.r.s);
const rev=new Map(); for(const r of rows)for(const c of r.cal){if(!rev.has(c))rev.set(c,[]);rev.get(c).push(r.s);}
const L=new Map(); for(const s of seeds) L.set(s.r.s,s.lab);
for(let it=0;it<8;it++){let ch=0;
  for(const r of rows){ if(L.has(r.s))continue;
    const v=new Map();
    for(const c of r.cal){const l=L.get(c);if(l)v.set(l,(v.get(l)||0)+1);}
    for(const p of (rev.get(r.s)||[])){const l=L.get(p);if(l)v.set(l,(v.get(l)||0)+1);}
    if(!v.size)continue; const b=[...v.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(b[1]>=1){L.set(r.s,b[0]);ch++;}}
  if(!ch)break;}
function predAddr(s){let lo=0,hi=train.length-1,best=null;
  while(lo<=hi){const mid=(lo+hi)>>1;if(train[mid].r.s<=s){best=train[mid];lo=mid+1;}else hi=mid-1;}
  const left=best; let right=null;
  for(const t of train){ if(t.r.s>s){right=t;break;} }
  if(!left)return right?right.lab:null; if(!right)return left.lab;
  return (s-left.r.e)<=(right.r.s-s)?left.lab:right.lab;}
let A=0,Ains=0,B=0,Bins=0,C=0,Cins=0;
for(const r of rows){
  const a=predAddr(r.s), g=L.get(r.s);
  if(a&&g&&a===g){A++;Ains+=r.n;}
  else if(a&&g){B++;Bins+=r.n;}
  else {C++;Cins+=r.n;}
}
const tot=rows.length,totIns=rows.reduce((x,r)=>x+r.n,0);
console.log('total functions',tot,'insns',totIns);
console.log('Tier A (both agree)   : %d = %.1f%% funcs, %d insns = %.1f%%',A,A/tot*100,Ains,Ains/totIns*100);
console.log('Tier B (disagree)     : %d = %.1f%% funcs, %d insns = %.1f%%',B,B/tot*100,Bins,Bins/totIns*100);
console.log('Tier C (no pred/one)  : %d = %.1f%% funcs, %d insns = %.1f%%',C,C/tot*100,Cins,Cins/totIns*100);
const c=new Map(); for(const r of rows){const g=L.get(r.s)||'(none)';c.set(g,(c.get(g)||0)+1);}
console.log('\nlabels:'); [...c.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(16)+v));
fs.writeFileSync('.tmp/mhgu/inventory/tiers.csv','start,insns,tier,label\n'+rows.map(r=>{
  const a=predAddr(r.s), g=L.get(r.s);
  const t=(a&&g&&a===g)?'A':((a&&g)?'B':'C');
  return `0x${r.s.toString(16)},${r.n},${t},${g||''}`;}).join('\n'));
