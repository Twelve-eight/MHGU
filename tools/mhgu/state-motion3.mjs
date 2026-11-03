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

// A dispatcher site is: movw rX,#imm ; movw rY,#N ; add rZ,pc,#4 ; then ldr [rZ,rX]. imm is 0x73e0 for the first level and
// 0x73e1 for the second level of the same function. The generator used to look for 0x73e0 only, so three functions that
// dispatch twice (11+35, 8+17, 8+62 states) had their second half documented nowhere. Both levels are collected now and
// the second level is emitted with its own offset.
const disp=[];
for(let a=0x100;a<TE;a+=4){const w=rd(a);
  if((((w&0x0FFF0000)>>>0))!==0x03070000)continue;
  const imm=((w>>>4)&0xF000)|(w&0xFFF);
  if(imm!==0x73e0)continue;
  let N=null,tb=null;
  for(let b=a;b<a+0x30;b+=4){const w2=rd(b);
    if((((w2&0x0FFFF000)>>>0)===0x03500000))N=(w2&0xFFF)|((w2>>>4)&0xF000);
    if((((w2&0x0FFF0000)>>>0)===0x028F0000)){tb=(b+8+(w2&0xFFF))>>>0;break;}}
  if(N!==null&&tb!==null&&N<=64)disp.push({a,N,tb,K:0});}

const disp2=[];
for(let a=0x100;a<TE;a+=4){const w=rd(a);
  if((((w&0x0FFF0FFF)>>>0))!==0x030703e1)continue;
  // only the second level of a dispatcher: the same block must have loaded the first field, movw #0x73e0, within the
  // preceding 0x40 bytes. Other functions read 0x73e1 for their own reasons (330 sites in the image).
  let ok=false;
  for(let b=a-4;b>=a-0x40;b-=4){const w4=rd(b);
    if((((w4&0x0FFF0000)>>>0))===0x03070000 && (((w4>>>4)&0xF000)|(w4&0xFFF))===0x73e0){ok=true;break;}}
  if(!ok)continue;
  let N=null,tb=null;
  for(let b=a;b<a+0x30;b+=4){const w2=rd(b);
    if(((w2&0x0FB00000)>>>0)===0x03000000)N=((w2>>>4)&0xF000)|(w2&0xFFF);            // movw rY,#N
    else if(((w2&0x0FF00000)>>>0)===0x03500000)N=w2&0xFF;                            // cmp rX,#N (immediate form)
    if((((w2&0x0FFF0000)>>>0)===0x028F0000)){tb=(b+8+(w2&0xFFF))>>>0;break;}}
  if(N===null||tb===null||N>64)continue;
  // A true second level range-tests: sub rY,rX,#K then cmp rY,#N-1, both right after the load. A function that merely reads
  // 0x73e1 as an ordinary field has no such pair, so requiring it keeps the section count honest (15 raw hits, 3 real).
  let K=null, sawCmp=false;
  for(let b=a+4;b<a+0x20;b+=4){const w3=rd(b);
    if(K===null && ((w3&0x0FF00000)>>>0)===0x02400000) K=w3&0xFF;
    if(K!==null && ((w3&0x0FF00000)>>>0)===0x03500000) sawCmp=true;}
  if(K===null||!sawCmp)continue;
  disp2.push({a,N,tb,K});}

const seen=new Set(); const U=disp.filter(d=>{if(seen.has(d.tb))return false;seen.add(d.tb);return true;});
const seen2=new Set(); const U2=disp2.filter(d=>{if(seen2.has(d.tb))return false;seen2.add(d.tb);return true;});
const PAT=/^(ems?\d{3}_\d\d)?[A-Za-z_]*?(move|Move|Loop|Start|Change|Attack|Fwd|Demo|Fly|Hover|Catch|Turn|Wait|Run|Down|Up|Jump|Guard|Escape|Sleep|Angry|Rest)/;
const lines=['# 怪物动作状态机：state → handler → motion',''];

const STATS={rows:0,named:0,noHandler:0};
function emit(d, note, from){
  from = from || 0;
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
  const unit=(all.join(' ').match(/ems?\d{3}_\d\d/)||[''])[0];
  lines.push('## 派发器 `0x'+d.a.toString(16)+'`'+(note||'')+' — 状态 '+from+'..'+(from+d.N)+'，有名字 '+namedCount+'/'+(d.N+1)+(unit?'，单位 `'+unit+'`':''));
  lines.push('','| state | handler | motion |','|---|---|---|');
  st.forEach((x,k)=>lines.push('| '+(from+k)+' | '+(x.h?'`0x'+x.h.toString(16)+'`':'—')+' | '+(x.n||'—')+' |'));
  STATS.rows += st.length; STATS.named += namedCount; STATS.noHandler += st.filter(x=>!x.h).length;
  lines.push('');
  return namedCount;
}

let good=0;
for(const d of U){ if(emit(d,'',0)) good++; }
let good2=0;
for(const d of U2){ if(emit(d,'（二级）',d.K)) good2++; }

// self-check: the document must contain exactly the rows the emitter produced
const body=lines.join('\n');
const rowCount=(body.match(/^\| \d+ \|/gm)||[]).length;
if(rowCount!==STATS.rows) throw new Error('state row count mismatch: body '+rowCount+' vs emitted '+STATS.rows);
const banner=['> **2026-11-04 关联审计后必须知道的四件事**（横幅由生成器写出，重跑不会丢）：',
'> 1. **本文件的小节数不等于派发器总数**：生成器只保留 `N<=64` 的 `movw #0x73e0` 表，去掉该过滤会多出 `0x5c2cc`（N=225）与 `0x1081408`（N=100）两张非怪物表；',
'> 2. **下面的派发器地址是函数内部地址**（全部不在 `functions-retile.csv.gz` 的函数起点集合里，通常是起点 +8）；',
'> 3. **'+U.length+' 个一级小节 + '+U2.length+' 个二级表，共 '+STATS.rows+' 行状态；其中 '+STATS.noHandler+' 行无 handler、'+STATS.named+' 行有 motion 名（'+(100*STATS.named/STATS.rows).toFixed(1)+'%）**；',
'> 4. **两级派发已单独成节**：检出 '+U2.length+' 个二级表（各带 range-test `sub/cmp` 签名），含审计点名的三处 `0x81ca4`（一级 11 + 二级 35，state 30..64）、`0xd3137c`（8 + 17，5..21）、`0xf48ef0`（8 + 62，2..63）；标题带「（二级）」与起始 state。',
'',
'> 生成：`tools/mhgu/state-motion3.mjs`（可复现）。每个 handler 只在 `[handler, 下一个 handler 起点)` 窗口内取名字，',
'> 若窗口内无名字则只跟一层尾调用到 target 再取；仍无则写 `—`。每个状态最多保留 1 个名字。',''];
lines.splice(2,0,...banner);
fs.writeFileSync('G:/omp works/MHGU/docs/mechanics/monster-state-machine.md',lines.join('\n'));
console.log('dispatchers kept:',U.length,' with >=1 named state:',good,'; second level:',U2.length,' named:',good2);
