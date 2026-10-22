#!/usr/bin/env node
// MHGU box bitstream tool — reads/writes item box slots by index.
// Layout: char+0x278, 19bit/slot LSB-first, FORWARD order (file slot k = UI slot k).
// Field may span 3 or 4 bytes depending on bit offset.
// Usage:
//   node box-slot-tool.mjs read <save.hnt> [start] [end]
//   node box-slot-tool.mjs write <save.hnt> <slot> <id> <count>
//   node box-slot-tool.mjs used <save.hnt>
import fs from "fs";
const BASE=0x278, N=2992, BITS=19;
const [,,cmd,file,a,b,c]=process.argv;
const buf=fs.readFileSync(file);
function rd32(byte){return (buf[BASE+byte]|(buf[BASE+byte+1]<<8)|(buf[BASE+byte+2]<<16)|(buf[BASE+byte+3]<<24))>>>0;}
function get(u){
  const bit=u*BITS,by=Math.floor(bit/8),o=bit%8;
  const v=rd32(by)>>>o;
  return{id:v&0xFFF,count:(v>>>12)&0x7F};
}
function put(u,id,count){
  const bit=u*BITS,by=Math.floor(bit/8),o=bit%8;
  let v=rd32(by);
  v=(v&~(0x7FFFF<<o))|((((count&0x7F)<<12|(id&0xFFF))<<o)>>>0);
  buf[BASE+by]=v&0xFF;buf[BASE+by+1]=(v>>>8)&0xFF;buf[BASE+by+2]=(v>>>16)&0xFF;buf[BASE+by+3]=(v>>>24)&0xFF;
}
if(cmd==="read"){
  const s=+(a??0),e=+(b??N);
  for(let u=s;u<e;u++){const t=get(u);if(t.id||t.count)console.log(u,"id="+t.id,"cnt="+t.count);}
}else if(cmd==="write"){
  put(+a,+b,+c);fs.writeFileSync(file,buf);
  const t=get(+a);console.log("wrote slot",+a,"->",{id:t.id,count:t.count});
}else if(cmd==="used"){
  let n=0,lo=N,hi=0;for(let u=0;u<N;u++){const t=get(u);if(t.id||t.count){n++;lo=Math.min(lo,u);hi=Math.max(hi,u);}}
  console.log(`used=${n} range=${lo}..${hi}`);
}else{console.log("usage: read|write|used");}
