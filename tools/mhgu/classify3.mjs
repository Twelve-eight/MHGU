import fs from 'node:fs';
// 1) class registrar seeds
const reg=new Map(); // fn -> [classNames]
for(const l of fs.readFileSync('.tmp/mhgu/mon/mon-final.out.txt','utf8').split('\n')){
  const m=l.match(/\s+fn=(0x[0-9a-f]+) @(0x[0-9a-f]+)\s+size=(0x[0-9a-f]+)\s+name=(\S+)/);
  if(!m) continue;
  const fn=parseInt(m[1]);
  if(!reg.has(fn)) reg.set(fn,[]);
  reg.get(fn).push(m[4]);
}
const RULES=[
 ['online-nex',/(OnlineCore|Nex[A-Z]|Nex::|InstanceTable|NNC_|RVCID|Matchmake|Session|Mesh|HostMigration|Http|HTTP|Festa.*Network|net[A-Z])/],
 ['save-data',/(sMain|sFestaMain|sEquipBox|sItemBox|sOtomo|sUserInfo|sGuildCard|sPast|Save|sUnit|sRender|sFestaUnit)/],
 ['render-gfx',/(sRender|sShader|sDraw|cDraw|Gfx|Texture|Model|MtCollision|sFestaRender)/],
 ['audio',/(Sound|snd|Se[A-Z]|FueMusic|Music)/],
 ['ui',/(UI|cUI|Gui|Menu|Layout|Hud)/],
 ['monster-em',/(cEm|uEm|uEms|sEnemy|uEnemy|rEnemy|rMonster|DouMouKa|EmSet|EmMain)/],
 ['player-pl',/(cPl|uPl|sPl|Player)/],
 ['weapon-wp',/(cWp|Weapon|Equip|sEquip)/],
 ['otomo-ot',/(Otomo|Nyanter|cOt|uOt|rOt)/],
 ['quest',/(Quest|rQuest)/],
 ['item',/(cItem|Item|rItem)/],
 ['network-lib',/(nn|Nv|Socket|Net)/],
 ['physics-math',/(MtCollision|MtVec|MtMatrix|MtQuat|Phys|Rigid)/],
 ['kernel-os',/(MtAllocator|MtArray|MtList|MtTree|MtFunc|MtDti|Thread|Heap|Mutex|Stream|BitIO|Cipher|Archive)/],
];
function labelOf(names){
  const votes=new Map();
  for(const n of names){ for(const [lab,re] of RULES) if(re.test(n)){votes.set(lab,(votes.get(lab)||0)+1);break;} }
  if(!votes.size) return null;
  return [...votes.entries()].sort((a,b)=>b[1]-a[1])[0][0];
}
const seedFn=new Map();
for(const [fn,names] of reg){ const l=labelOf(names); if(l) seedFn.set(fn,l); }
console.log('registrar functions:',reg.size,' labeled by class names:',seedFn.size);

// 2) load inventory + string seeds
const lines=fs.readFileSync('.tmp/mhgu/inventory/functions2.csv','utf8').trim().split('\n').slice(1);
const rows=[],byStart=new Map();
for(const l of lines){
  const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/); if(!m)continue;
  const r={s:parseInt(m[1]),e:parseInt(m[2]),n:+m[3],cal:m[5]?m[5].split('|').map(x=>parseInt(x)):[],str:m[6]||'',sub:null,src:null};
  rows.push(r);byStart.set(r.s,r);
}
const STR=[['online-nex',/(OnlineCore|Nex[A-Z]|InstanceTable|NNC_|Matchmake|SessionJob|MeshJob|HTTP)/],
 ['save-data',/(savedata|SaveSlot)/],['render-gfx',/(shader|texture|render|vfx|Mesh)/],
 ['audio',/(\bSE\b|BGM|Sound)/],['ui',/(Menu|Layout|Hud)/],
 ['monster-em',/(emUniqueAct|mParam\.|netEmAction|EmSetList)/]];
for(const r of rows){
  if(seedFn.has(r.s)){r.sub=seedFn.get(r.s);r.src='class';continue;}
  for(const [l,re] of STR) if(re.test(r.str)){r.sub=l;r.src='string';break;}
  if(!r.sub&&(r.cal.includes(0x3df2a8)||r.cal.includes(0x3df378))){r.sub='save-io';r.src='prim';}
}
const seeded=rows.filter(r=>r.sub).length;
const bySrc=new Map(); for(const r of rows) if(r.sub) bySrc.set(r.src,(bySrc.get(r.src)||0)+1);
// propagate
const rev=new Map();
for(const r of rows) for(const c of r.cal){ if(!rev.has(c))rev.set(c,[]); rev.get(c).push(r.s); }
for(let it=0;it<8;it++){
  let ch=0;
  for(const r of rows){
    if(r.sub)continue;
    const v=new Map();
    for(const c of r.cal){const o=byStart.get(c);if(o&&o.sub)v.set(o.sub,(v.get(o.sub)||0)+1);}
    for(const p of (rev.get(r.s)||[])){const o=byStart.get(p);if(o&&o.sub)v.set(o.sub,(v.get(o.sub)||0)+1);}
    if(!v.size)continue;
    const b=[...v.entries()].sort((a,b)=>b[1]-a[1])[0];
    if(b[1]>=1){r.sub=b[0];ch++;}
  }
  if(!ch)break;
}
const tot=rows.length, assigned=rows.filter(r=>r.sub).length;
const totIns=rows.reduce((a,r)=>a+r.n,0), asIns=rows.filter(r=>r.sub).reduce((a,r)=>a+r.n,0);
console.log('seeds total:',seeded,' bySource:',JSON.stringify(Object.fromEntries(bySrc)));
console.log('assigned:',assigned,'/',tot,'=',(assigned/tot*100).toFixed(1)+'%  insn-weighted:',(asIns/totIns*100).toFixed(1)+'%');
const c=new Map(); for(const r of rows){const k=r.sub||'(none)';c.set(k,(c.get(k)||0)+1);}
[...c.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(16)+v));
fs.writeFileSync('.tmp/mhgu/inventory/classified3.csv','start,end,insns,subsystem,src\n'+rows.map(r=>`0x${r.s.toString(16)},0x${r.e.toString(16)},${r.n},${r.sub||''},${r.src||'prop'}`).join('\n'));
fs.writeFileSync('.tmp/mhgu/inventory/seeds-class.txt',[...seedFn.entries()].map(([f,l])=>'0x'+f.toString(16)+'\t'+l+'\t'+reg.get(f).slice(0,4).join(',')).join('\n'));
