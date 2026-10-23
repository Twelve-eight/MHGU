import fs from 'node:fs';
const FLAT='G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
const buf=fs.readFileSync(FLAT);
const rd=v=>buf.readUInt32LE(v+0x100)>>>0;
const TEXT_END=0x13F1DEC, TEXT_START=0x100, RODATA_END=buf.length-0x100;
const inText=v=>v>=TEXT_START&&v<TEXT_END;
const isPrologue=v=>inText(v)&&(((rd(v)&0xFFFF4000)>>>0)===0xE92D4000);
const starts=new Set(), callers=new Map();
for(let a=TEXT_START;a<TEXT_END;a+=4){
  const w=rd(a);
  if(((w>>>25)&7)===5&&((w>>>24)&1)===1&&((w>>>28)&0xF)!==0xF){
    let o=w&0xFFFFFF;if(o&0x800000)o-=0x1000000;const t=(a+8+(o<<2))>>>0;
    if(inText(t)){starts.add(t);callers.set(t,(callers.get(t)||0)+1);}
  }
}
for(let a=TEXT_START;a<TEXT_END;a+=4){const w=rd(a);if(inText(w)&&(w&3)===0&&!starts.has(w)&&isPrologue(w))starts.add(w);}
const fnStarts=[...starts].sort((x,y)=>x-y);
function strAt(v){const o=v+0x100;if(o<0||o>=buf.length)return null;let e=o;while(e<buf.length&&buf[e]>=32&&buf[e]<127&&e-o<100)e++;return (e-o>=4&&buf[e]===0)?buf.slice(o,e).toString('ascii'):null;}
function strNear(v){ // string may span a small struct; try offsets 0..8
  const s=strAt(v); if(s)return s;
  return null;
}
const rows=[];
for(let i=0;i<fnStarts.length;i++){
  const s=fnStarts[i], e=i+1<fnStarts.length?fnStarts[i+1]:TEXT_END;
  const strs=new Set(), cal=new Set();
  const mv=new Map();    // reg -> {lo, hi, loSite}
  for(let a=s;a<e;a+=4){
    const w=rd(a);
    // BL
    if(((w>>>25)&7)===5&&((w>>>24)&1)===1&&((w>>>28)&0xF)!==0xF){let o=w&0xFFFFFF;if(o&0x800000)o-=0x1000000;const t=(a+8+(o<<2))>>>0;if(inText(t))cal.add(t);}
    // movw
    if(((w&0x0FF00000)>>>0)===0x03000000){const reg=(w>>>12)&15;const imm=((w>>>4)&0xF000)|(w&0xFFF);mv.set(reg,{lo:imm});}
    // movt
    if(((w&0x0FF00000)>>>0)===0x03400000){const reg=(w>>>12)&15;const imm=((w>>>4)&0xF000)|(w&0xFFF);const c=mv.get(reg);if(c&&c.lo!==undefined)mv.set(reg,{lo:c.lo,hi:imm});}
    // add rD, pc, rM  (Rn=15, no shift)
    if((((w&0x0FFF0FF0)>>>0)===0x008F0000)||(((w&0x0FFF0FF0)>>>0)===0x008F0000)){
      const rM=w&15;const c=mv.get(rM);
      if(c&&c.lo!==undefined&&c.hi!==undefined){
        const bias=((c.hi<<16)|c.lo)>>>0;const tgt=(a+8+bias)>>>0;
        const s1=strNear(tgt);if(s1)strs.add(s1);
      }
    } else if(((w&0x0FFF0000)>>>0)===0x008F0000){
      const rM=w&15;const c=mv.get(rM);
      if(c&&c.lo!==undefined&&c.hi!==undefined){const bias=((c.hi<<16)|c.lo)>>>0;const tgt=(a+8+bias)>>>0;const s1=strNear(tgt);if(s1)strs.add(s1);}
    }
    // add rD, pc, #imm  (direct small bias)
    if(((w&0x0FFF0000)>>>0)===0x028F0000){
      const imm=w&0xFFF; const tgt=(a+8+imm)>>>0;
      const s9=strNear(tgt); if(s9)strs.add(s9);
    }
    // ldr rX,[pc,#imm] + add pc,rX
    if(((w&0xFFFFF000)>>>0)===0xE59F0000){
      const imm=w&0xFFF,lit=(a+8+imm)>>>0,reg=(w>>>12)&15;
      if(lit+4<=RODATA_END){
        const direct=strAt(lit);if(direct)strs.add(direct);
        const V=rd(lit);
        for(let b=a+4;b<Math.min(a+0x20,e);b+=4){const w2=rd(b);
          if(((w2&0x0FFF0000)>>>0)===0x008F0000&&(w2&15)===reg){const s2=strAt((b+8+V)>>>0);if(s2)strs.add(s2);break;}}
        if(!inText(V)){const s3=strAt(V);if(s3)strs.add(s3);}
      }
    }
  }
  rows.push({s,e,n:(e-s)/4,callers:callers.get(s)||0,cal:[...cal].slice(0,48),strs:[...strs].slice(0,32)});
}
const out=['start,end,insns,callers,callees,strings'];
for(const r of rows) out.push(`0x${r.s.toString(16)},0x${r.e.toString(16)},${r.n},${r.callers},${r.cal.map(x=>'0x'+x.toString(16)).join('|')},"${r.strs.map(x=>x.replace(/"/g,'""').replace(/,/g,';')).join('|')}"`);
fs.writeFileSync('G:/omp works/.tmp/mhgu/inventory/functions4.csv',out.join('\n'));
console.log('functions:',rows.length,' with strings:',rows.filter(r=>r.strs.length).length,' edges:',rows.reduce((a,r)=>a+r.cal.length,0));
