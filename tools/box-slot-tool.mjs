#!/usr/bin/env node
// MHGU item bitstream tool — reads/writes item box or pouch slots by index.
// Layout: 19bit/slot LSB-first, FORWARD order (file slot k = UI slot k).
// Field may span 3 or 4 bytes depending on bit offset.
// Item box:  char+632  (0x278), 2992 slots
// Pouch:     char+10175,        32 slots  (same 19bit codec; id 12bit + count 7bit)
//
// Usage:
//   node box-slot-tool.mjs read <save.hnt> [start] [end] [--base=<charOff>] [--slots=<n>]
//   node box-slot-tool.mjs write <save.hnt> <slot> <id> <count> [--base=<charOff>] [--slots=<n>]
//   node box-slot-tool.mjs used <save.hnt> [--base=<charOff>] [--slots=<n>]
//
// Options:
//   --base=<charOff>  byte offset of the slot field inside the char block (default 632 = 0x278).
//                     Decimal; a 0x prefix is also accepted.
//   --slots=<n>       slot count of the field (default 2992)
//   --pouch           shortcut for --base=10175 --slots=32
//   Later options win, so --pouch --slots=<n> uses the pouch base with n slots.
//
// Output of `read`: only non-empty slots are listed (unchanged legacy behaviour);
// with --pouch every slot of the 32-slot grid is listed, empty ones as id=0 cnt=0.
//
// Examples:
//   node box-slot-tool.mjs read save.hnt                 # item box 0..2991 (non-empty only)
//   node box-slot-tool.mjs read save.hnt --pouch         # pouch, all 32 slots
//   node box-slot-tool.mjs read save.hnt 0 8 --pouch     # pouch slots 0..7, all lines
//   node box-slot-tool.mjs used save.hnt --pouch         # pouch occupancy summary
//   node box-slot-tool.mjs write save.hnt 0 10 10 --pouch
//   node box-slot-tool.mjs write save.hnt 5 10 10 --base=10175 --slots=32
import fs from "fs";

const DEF_BASE=0x278, DEF_N=2992, BITS=19;
const POUCH_BASE=10175, POUCH_N=32;

const argv=process.argv.slice(2);
let BASE=DEF_BASE, N=DEF_N, badFlag=null, pouch=false;
const pos=[];
for(const arg of argv){
  if(arg.startsWith("--")){
    const eq=arg.indexOf("=");
    const name=eq<0?arg:arg.slice(0,eq);
    const val=eq<0?null:arg.slice(eq+1);
    if(name==="--base"){
      const n=Number(val);
      if(val===null||val===""||!Number.isFinite(n)||n<0) badFlag=arg; else BASE=Math.trunc(n);
    }else if(name==="--slots"){
      const n=Number(val);
      if(val===null||val===""||!Number.isFinite(n)||n<0) badFlag=arg; else N=Math.trunc(n);
    }else if(name==="--pouch"){
      BASE=POUCH_BASE; N=POUCH_N; pouch=true;
    }else badFlag=arg;
  }else pos.push(arg);
}
if(badFlag){
  console.error("bad option: "+badFlag);
  console.error("usage: read|write|used <save.hnt> ... [--base=<charOff>] [--slots=<n>] [--pouch]");
  process.exit(2);
}

const [cmd,file,a,b,c]=pos;
if(!file){console.log("usage: read|write|used <save.hnt> [args] [--base=<charOff>] [--slots=<n>] [--pouch]");process.exit(2);}
const buf=fs.readFileSync(file);
const need=BASE+Math.ceil(N*BITS/8);
// reads past EOF decode as 0 (undefined bytes), so only a write needs the guard
if(cmd==="write"&&need>buf.length){
  console.error(`field out of range: base=${BASE} slots=${N} needs ${need} bytes, file is ${buf.length}`);
  process.exit(2);
}
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
  for(let u=s;u<e;u++){const t=get(u);if(pouch||t.id||t.count)console.log(u,"id="+t.id,"cnt="+t.count);}
}else if(cmd==="write"){
  put(+a,+b,+c);fs.writeFileSync(file,buf);
  const t=get(+a);console.log("wrote slot",+a,"->",{id:t.id,count:t.count});
}else if(cmd==="used"){
  let n=0,lo=N,hi=0;for(let u=0;u<N;u++){const t=get(u);if(t.id||t.count){n++;lo=Math.min(lo,u);hi=Math.max(hi,u);}}
  console.log(`used=${n} range=${lo}..${hi}`);
}else{console.log("usage: read|write|used <save.hnt> [args] [--base=<charOff>] [--slots=<n>] [--pouch]");}
