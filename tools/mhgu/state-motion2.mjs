import fs from 'node:fs';
const buf=fs.readFileSync('G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin');
const rd=v=>{const o=v+0x100; if(o<0||o+4>buf.length) return 0; return buf.readUInt32LE(o)>>>0;};
const TE=0x13F1DEC, END=buf.length-0x100;
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
const disp=[];
for(let a=0x100;a<TE;a+=4){const w=rd(a);
  if((((w&0x0FFF0000)>>>0)===0x03070000)){const imm=((w>>>4)&0xF000)|(w&0xFFF); if(imm!==0x73e0)continue;
    let N=null,tb=null;
    for(let b=a;b<a+0x30;b+=4){const w2=rd(b);
      if((((w2&0x0FFFF000)>>>0)===0x03500000))N=(w2&0xFFF)|((w2>>>4)&0xF000);
      if((((w2&0x0FFF0000)>>>0)===0x028F0000)){tb=(b+8+(w2&0xFFF))>>>0;break;}}
    if(N!==null&&tb!==null)disp.push({a,N,tb});}}
const seen=new Set(); const U=disp.filter(d=>{if(seen.has(d.tb))return false;seen.add(d.tb);return true;});
const lines=['# 怪物动作状态机：state → handler → motion（自动解析）',''];
for(const d of U){
  const st=[];
  for(let k=0;k<=d.N;k++){
    const off=rd(d.tb+4*k); if(off===undefined)break;
    let h=(d.tb+off)>>>0;
    if(h>=TE||h<0x100||(h&3)){st.push({h:null,n:[]});continue;}
    let hops=0;
    while(hops<4){const w=rd(h);
      if(((w>>>24)===0xEA)&&(((w>>>25)&7)===5)){let i=w&0xFFFFFF;if(i&0x800000)i-=0x1000000;h=(h+8+(i<<2))>>>0;hops++;continue;}
      let mv=false;
      for(let q=h;q<h+16;q+=4){const w2=rd(q); if(((w2>>>16)===0xE8BD)){const w3=rd(q+4);
        if(((w3>>>24)===0xEA)){let i=w3&0xFFFFFF;if(i&0x800000)i-=0x1000000;h=(q+8+(i<<2))>>>0;mv=true;}break;}}
      if(!mv)break; hops++;}
    if(h>=TE){st.push({h:null,n:[]});continue;}
    let e=h; for(let q=h;q<h+0x400;q+=4){const w=rd(q); if(((w>>>16)===0xE8BD)&&(w&0x8000)){e=q+4;break;} e=q+4;}
    const pat=/^(ems?\d{3}_\d\d)?[A-Za-z_]*(move|Move|Loop|Start|Change|Attack|Fwd|Demo|Fly|Hover|Catch|Turn|Wait)/;
    let ns=stringsIn(h,e).filter(x=>pat.test(x));
    if(!ns.length){
      // follow direct callees one level for motion names
      const cal=new Set();
      for(let a=h;a<e;a+=4){const w=rd(a);
        if(((w>>>25)&7)===5&&((w>>>24)&1)===1){let i=w&0xFFFFFF;if(i&0x800000)i-=0x1000000;const t=(a+8+(i<<2))>>>0;if(t>=0x100&&t<TE)cal.add(t);}}
      for(const c of [...cal].slice(0,24)){
        let ce=c; for(let q=c;q<c+0x200;q+=4){const w=rd(q);if(((w>>>16)===0xE8BD)&&(w&0x8000)){ce=q+4;break;}ce=q+4;}
        ns=ns.concat(stringsIn(c,ce).filter(x=>pat.test(x)));
        if(ns.length>=3)break;
      }
    }
    st.push({h,n:[...new Set(ns)].slice(0,3)});
  }
  const all=st.flatMap(x=>x.n);
  const unit=(all.find(x=>/^ems?\d{3}_\d\d/.test(x))||'').slice(0,9)||'(unknown)';
  const named=st.filter(x=>x.n.length).length;
  lines.push('## 派发器 `0x'+d.a.toString(16)+'` — 状态 0..'+d.N+'，单位 `'+unit+'`，有名字的状态 '+named+'/'+(d.N+1));
  lines.push('');
  lines.push('| state | handler | motion |');
  lines.push('|---|---|---|');
  st.forEach((x,k)=>lines.push('| '+k+' | '+(x.h?'`0x'+x.h.toString(16)+'`':'—')+' | '+(x.n.length?x.n.join(' / '):'—')+' |'));
  lines.push('');
}
fs.writeFileSync('G:/omp works/MHGU/docs/mechanics/monster-state-machine.md',lines.join('\n'));
const withNames=U.length;
console.log('dispatchers:',U.length,' wrote monster-state-machine.md',lines.length,'lines');
