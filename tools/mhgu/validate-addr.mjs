import fs from 'node:fs';
const lines=fs.readFileSync('G:/omp works/.tmp/mhgu/inventory/functions2.csv','utf8').trim().split('\n').slice(1);
const rows=[];
for(const l of lines){const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/);if(!m)continue;
 rows.push({s:parseInt(m[1]),e:parseInt(m[2]),n:+m[3],cal:m[5]?m[5].split('|').map(x=>parseInt(x)):[],str:m[6]||''});}
const RULES=[['online-nex',/(OnlineCore|Nex[A-Z]|Nex::|InstanceTable|NNC_|RVCID|Matchmake|SessionJob|MeshJob|HostMigration|HTTP|Content)/],
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
 ['debug-dev',/(Debug|debug|Assert|assert|printf|_Log|Log_)/]];
for(const r of rows){r.lab=null;for(const [n,re] of RULES) if(re.test(r.str)){r.lab=n;break;}
 if(!r.lab && (r.cal.includes(0x3df2a8)||r.cal.includes(0x3df378)||r.cal.includes(0x3df1b8)||r.cal.includes(0x3df22c))) r.lab='save-io';}
const seeded=rows.filter(r=>r.lab);
let st=99991; const rnd=()=>{st=(st*1103515245+12345)&0x7fffffff;return st/0x7fffffff;};
const idx=seeded.map((_,i)=>i).sort(()=>rnd()-0.5);
const cut=Math.floor(idx.length*0.8);
const train=idx.slice(0,cut).map(i=>seeded[i]).sort((a,b)=>a.s-b.s);
const testSet=new Set(idx.slice(cut).map(i=>seeded[i].s));
const testArr=idx.slice(cut).map(i=>seeded[i]);

// nearest-by-address predictor (both directions, ties -> left)
function nearestAddr(s){
  let lo=0,hi=train.length-1,best=null;
  while(lo<=hi){const mid=(lo+hi)>>1;if(train[mid].s<=s){best=train[mid];lo=mid+1;}else hi=mid-1;}
  const left=best; const right=train.find((t,i)=>i>=0&&t.s>s);
  if(!left)return right?right.lab:null;
  if(!right)return left.lab;
  return (s-left.e)<=(right.s-s)?left.lab:right.lab;
}
let ok=0,dist=[];
for(const t of testArr){const p=nearestAddr(t.s);if(p===t.lab)ok++;dist.push(Math.abs(t.s-(train.find(x=>x.s<=t.s)?.s??0)));}
console.log('=== ADDRESS-LOCALITY baseline ===');
console.log('holdout accuracy:',ok,'/',testArr.length,'=',(ok/testArr.length*100).toFixed(1)+'%');
// window-limited version
for(const W of [0x2000,0x8000,0x20000,0x80000]){
  let o=0,n=0;
  for(const t of testArr){
    // nearest within window
    let bestL=null,bestR=null;
    for(const tr of train){ if(tr.s<=t.s){if(!bestL||tr.s>bestL.s)bestL=tr;} else {if(!bestR||tr.s<bestR.s)bestR=tr;} }
    const dl=bestL?t.s-bestL.e:Infinity, dr=bestR?bestR.s-t.s:Infinity;
    const d=Math.min(dl,dr);
    if(d>W) continue;
    n++; const p=dl<=dr?bestL.lab:bestR.lab; if(p===t.lab)o++;
  }
  if(n)console.log(`window 0x${W.toString(16)}: covered ${n}/${testArr.length}, acc ${(o/n*100).toFixed(1)}%`);
}
