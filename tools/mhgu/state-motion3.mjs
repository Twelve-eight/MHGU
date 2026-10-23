import fs from 'node:fs';
const buf=fs.readFileSync('G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin');
const rd=v=>{const o=v+0x100;if(o<0||o+4>buf.length)return 0;return buf.readUInt32LE(o)>>>0;};
const TE=0x13F1DEC, END=buf.length-0x100;
const isPrologue=v=>v>=0x100&&v<TE&&(((rd(v)&0xFFFF4000)>>>0)===0xE92D4000);
function strAt(v){const o=v+0x100;if(o<0||o>=buf.length)return null;let e=o;while(e<buf.length&&buf[e]>=32&&buf[e]<127&&e-o<100)e++;return (e-o>=4&&buf[e]===0)?buf.slice(o,e).toString('ascii'):null;}
function stringsIn(s,e){const out=new Set();
  for(let a=s;a<e;a+=4){const w=rd(a);
    if(((w&0xFFFFF000)>>>0)===0xE59F0000){const imm=w&0xFFF,lit=(a+8+imm)>>>0;
      if(lit+4<=END){const V=rd(lit);const s1=strAt(lit);if(s1)out.add(s1);
        for(let b=a+4;b<Math.min(a+0x20,e);b+=4){const w2=rd(b);
          if((((w2&0x0FFF0FF0)>>>0)===0x008F0000)&&(w2&15)===((w>>>12)&15)){const s2=strAt((b+8+V)>>>0);if(s2)out.add(s2);break;}}
        if(V<TE){const s3=strAt(V);if(s3)out.add(s3);}}}
    if(((w&0x0FFF0000)>>>0)===0x028F0000){const s4=strAt((a+8+(w&0xFFF))>>>0);if(s4)out.add(s4);}
  }return [...out];}
// function end = first pop{..,pc} scanning forward (bounded)
function fnEnd(s){for(let q=s;q<s+0x1000;q+=4){const w=rd(q);if(((w>>>16)===0xE8BD)&&(w&0x8000))return q+4;}return s+0x1000;}
const disp=[];
for(let a=0x100;a<TE;a+=4){const w=rd(a);
  if((((w&0x0FFF0000)>>>0)===0x03070000)){const imm=((w>>>4)&0xF000)|(w&0xFFF); if(imm!==0x73e0)continue;
    let N=null,tb=null;
    for(let b=a;b<a+0x30;b+=4){const w2=rd(b);
      if((((w2&0x0FFFF000)>>>0)===0x03500000))N=(w2&0xFFF)|((w2>>>4)&0xF000);
      if((((w2&0x0FFF0000)>>>0)===0x028F0000)){tb=(b+8+(w2&0xFFF))>>>0;break;}}
    if(N!==null&&tb!==null&&N<=64)disp.push({a,N,tb});}}
const seen=new Set(); const U=disp.filter(d=>{if(seen.has(d.tb))return false;seen.add(d.tb);return true;});
const PAT=/^(ems?\d{3}_\d\d)?[A-Za-z_]*?(move|Move|Loop|Start|Change|Attack|Fwd|Demo|Fly|Hover|Catch|Turn|Wait|Run|Down|Up|Jump|Guard|Escape|Sleep|Angry|Rest)/;
const lines=['# 怪物动作状态机：state → handler → motion','',
'> 生成：`tools/mhgu/state-motion3.mjs`（可复现）。**修正版**：每个 handler 只在 `[handler, 下一个 handler 起点)` 窗口内取名字，',
'> 若窗口内无名字则**只跟一层尾调用**到 target 再取；仍无则写 `—`。**每个状态最多保留 1 个名字**（避免窗口污染）。',''];
let good=0;
for(const d of U){
  const raw=[];
  for(let k=0;k<=d.N;k++){
    const off=rd(d.tb+4*k); if(!off&&off!==0){raw.push(null);continue;}
    let h=(d.tb+off)>>>0;
    if(h<TE&&h>=0x100&&(h&3)===0) raw.push(h); else raw.push(null);
  }
  const hs=[...new Set(raw.filter(Boolean))].sort((x,y)=>x-y);
  const named={};
  for(const h of hs){
    const nxt=hs.find(x=>x>h) ?? fnEnd(h);
    let names=stringsIn(h,nxt).filter(x=>PAT.test(x));
    if(!names.length){
      // follow one tail call: last instruction in window that is b <tgt>
      let tgt=null;
      for(let a=h;a<nxt;a+=4){const w=rd(a);
        if(((w>>>24)===0xEA)&&(((w>>>25)&7)===5)){let i=w&0xFFFFFF;if(i&0x800000)i-=0x1000000;tgt=(a+8+(i<<2))>>>0;}}
      if(tgt&&tgt<TE&&isPrologue(tgt)){
        const e2=fnEnd(tgt);
        names=stringsIn(tgt,e2).filter(x=>PAT.test(x));
      }
    }
    const uniq=[...new Set(names)];
    named[h]=uniq.length===1?uniq[0]:(uniq.length>1?uniq[0]+' (+'+(uniq.length-1)+')':null);
  }
  const st=raw.map(h=>h?{h,n:named[h]}:{h:null,n:null});
  const all=st.map(x=>x&&x.n).filter(Boolean);
  const namedCount=st.filter(x=>x&&x.n).length;
  if(namedCount) good++;
  const unit=(all.join(' ').match(/ems?\d{3}_\d\d/)||[''])[0];
  lines.push('## 派发器 `0x'+d.a.toString(16)+'` — 状态 0..'+d.N+'，有名字 '+namedCount+'/'+(d.N+1)+(unit?'，单位 `'+unit+'`':''));
  lines.push('','| state | handler | motion |','|---|---|---|');
  st.forEach((x,k)=>lines.push('| '+k+' | '+(x.h?'`0x'+x.h.toString(16)+'`':'—')+' | '+(x.n||'—')+' |'));
  lines.push('');
}
fs.writeFileSync('G:/omp works/MHGU/docs/mechanics/monster-state-machine.md',lines.join('\n'));
console.log('dispatchers kept:',U.length,' with >=1 named state:',good);
