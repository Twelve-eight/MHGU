import fs from 'node:fs';
const FLAT='G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
const buf=fs.readFileSync(FLAT);
const rd=v=>buf.readUInt32LE(v+0x100)>>>0;
const TEXT_END=0x13F1DEC;

function fnStart(v){
  for(let a=v;a>Math.max(0,v-0x3000);a-=4){
    const w=rd(a);
    // push {.., lr} : cond 1110 1001 0010 1101 Rtlist  with bit14 set
    if(((w&0xFFFF4000)>>>0)===0xE92D4000) return a;
  }
  return null;
}
function classify(fn,v){
  let reads=0,writes=0,ldrh=0,strh=0;
  for(let a=fn;a<fn+0x1200;a+=4){
    const w=rd(a);
    const op=(w>>>25)&7;
    // ldrh/strh imm: cond 000 P U I W L Rn Rt imm4H 1011 imm4L
    if(((w&0x0E000090)>>>0)===0x00000090){
      const L=(w>>>20)&1; if(L)ldrh++; else strh++;
    }
    if(((w&0x0C000000)>>>0)===0x04000000){const L=(w>>>20)&1; if(L)reads++; else writes++;}
  }
  return {reads,writes,ldrh,strh};
}
export function cluster(offsetHex){
  const off=offsetHex;
  const sites=[];
  for(let a=0;a<TEXT_END;a+=4){
    const w=rd(a);
    if(((w&0xFFF00000)>>>0)===0xE3000000){
      const imm=((w>>>4)&0xF000)|(w&0xFFF);
      if(imm===off) sites.push(a);
    }
  }
  const byFn=new Map();
  for(const s of sites){
    const f=fnStart(s)??0;
    if(!byFn.has(f))byFn.set(f,[]);
    byFn.get(f).push(s);
  }
  const out=[];
  for(const [f,ss] of [...byFn.entries()].sort((a,b)=>a[0]-b[0])){
    out.push({fn:'0x'+f.toString(16),sites:ss.length,first:'0x'+ss[0].toString(16),...classify(f,ss[0])});
  }
  return out;
}
