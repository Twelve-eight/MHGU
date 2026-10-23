import fs from 'node:fs';
const FLAT='G:/omp works/.tmp/mhgu/extract/exefs-0eb5/main.140.flat.bin';
const buf=fs.readFileSync(FLAT);
const rd=v=>buf.readUInt32LE(v+0x100)>>>0;
const TEXT_END=0x13F1DEC, TEXT_START=0x100, END=buf.length-0x100;
const inText=v=>v>=TEXT_START&&v<TEXT_END;
// crc32 (poly 0xEDB88320, init 0xFFFFFFFF, no final xor)
const T=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(c>>>1)^0xEDB88320:(c>>>1);t[i]=c>>>0;}return t;})();
function crc(s){let c=0xFFFFFFFF;for(let i=0;i<s.length;i++)c=(T[(c^s.charCodeAt(i))&0xFF]^(c>>>8))>>>0;return c>>>0;}
// class names from inventory
const names=[];
for(const l of fs.readFileSync('G:/omp works/MHGU/docs/data/class-inventory.tsv','utf8').split('\n').slice(1)){
  const f=l.split('\t'); if(f.length>1&&f[1]) names.push(f[1]);
}
const crc2name=new Map();
for(const n of names) crc2name.set(crc(n),n);
console.log('class names:',names.length,' crc map:',crc2name.size);
// find vtable runs
const runs=[]; let i=TEXT_END;
while(i+4<=END){ if(inText(rd(i))&&(rd(i)&3)===0){ let j=i,c=0;
    while(j+4<=END&&inText(rd(j))&&(rd(j)&3)===0){c++;j+=4;}
    if(c>=6) runs.push({s:i,n:c}); i=j; } else i+=4; }
console.log('vtable runs:',runs.length);
let named=0, methodsCovered=0; const hits=[];
for(const r of runs){
  let found=null;
  for(let d=-0x40; d<=0x40; d+=4){
    const p=r.s+d; if(p<TEXT_END||p+4>END) continue;
    const v=rd(p); const nm=crc2name.get(v);
    if(nm){ found={nm,delta:d,at:p}; break; }
  }
  if(found){ named++; methodsCovered+=r.n; if(hits.length<12) hits.push({vt:r.s,n:r.n,...found}); }
}
console.log('vtables with adjacent class-name crc32:',named,'/',runs.length,' methods covered:',methodsCovered);
console.log('\nsample:');
for(const h of hits) console.log('  vtable 0x'+h.vt.toString(16)+' methods='+h.n+' -> '+h.nm+' (crc at vt'+ (h.delta>=0?'+':'')+h.delta+'=0x'+h.at.toString(16)+')');
