// Tier B 切片生成器（干净版）：按指令数降序取 top K，切成每片 NPROC 个函数，每函数带 24 条反汇编头。
// 用法: node tools/mhgu/tierb-gen.mjs <OFF> <COUNT> <NPROC> <OUTDIR>
//   例: node tools/mhgu/tierb-gen.mjs 0 1200 120 .tmp/mhgu/tierB3
// 约定: 文件名编号 = 片序号（OFF/NPROC+1 起），header 用同一 index 变量；生成后打印每片首末 vaddr 自查。
import fs from 'node:fs';
import * as A from './arm32.mjs';
const [OFFa='0', CNTa='1200', NPROCa='120', OUTDIRa='.tmp/mhgu/tierB3']=process.argv.slice(2);
const OFF=+OFFa, CNT=+CNTa, NPROC=+NPROCa;
const ROOT='G:/omp works';
const OUTDIR=OUTDIRa.startsWith('/')||/^[A-Za-z]:/.test(OUTDIRa)?OUTDIRa:ROOT+'/'+OUTDIRa;
const tiers=new Map();
for(const l of fs.readFileSync('G:/omp works/.tmp/mhgu/inventory/tiers.csv','utf8').split('\n').slice(1)){
  if(!l)continue; const [s,ins,t,lab]=l.split(',');
  tiers.set(parseInt(s,16),{ins:+ins,t,lab:lab||''});
}
const rows=[];
for(const l of fs.readFileSync('G:/omp works/.tmp/mhgu/inventory/functions4.csv','utf8').split('\n').slice(1)){
  const m=l.match(/^(0x[0-9a-f]+),(0x[0-9a-f]+),(\d+),(\d+),([^,]*),"(.*)"$/); if(!m)continue;
  const s=parseInt(m[1],16);
  if(tiers.get(s)?.t!=='B')continue;
  rows.push({s,ins:+m[3],cal:m[5]||'',str:m[6]||''});
}
rows.sort((a,b)=>b.ins-a.ins);
const top=rows.slice(OFF,OFF+CNT);
fs.mkdirSync(OUTDIR,{recursive:true});
const base=OFF/NPROC+1;
let idx=base; const report=[];
for(let i=0;i<top.length;i+=NPROC){
  const part=top.slice(i,i+NPROC);
  const out=[`# Tier B slice ${String(idx).padStart(2,'0')} — ${part.length} functions (rank ${OFF+i+1}..${OFF+i+part.length} by insns)`,
    '# 每函数: === vaddr insns=N votes=[...] + callees + strings + 前24条反汇编'];
  for(const r of part){
    const votes=new Map();
    for(const c of r.cal.split('|')){ if(!c)continue; const t=tiers.get(parseInt(c,16)); if(t?.lab)votes.set(t.lab,(votes.get(t.lab)||0)+1); }
    const v=[...votes.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([a,b])=>a+':'+b).join(' ')||'-';
    out.push('',`=== 0x${r.s.toString(16)}  insns=${r.ins}  votes=[${v}]`);
    if(r.cal) out.push('callees: '+r.cal.slice(0,200));
    if(r.str) out.push('strings: '+r.str.split('|').slice(0,4).join(' | ').slice(0,300));
    out.push(A.disasm(r.s,24));
  }
  const f=OUTDIR+'/slice-'+String(idx).padStart(2,'0')+'.txt';
  fs.writeFileSync(f,out.join('\n'));
  report.push({idx,file:f,n:part.length,lo:part[0].s,hi:part[part.length-1].s,out});
  idx++;
}
// 自查
console.log('slices:',report.length,' funcs total:',top.length);
for(const r of report){
  const hdr=r.out[0].match(/slice (\d+)/)[1];
  const ok=hdr===String(r.idx).padStart(2,'0');
  console.log(`  slice-${String(r.idx).padStart(2,'0')} n=${r.n} 0x${r.lo.toString(16)}..0x${r.hi.toString(16)} header=${ok?'OK':'MISMATCH'}`);
}
// 覆盖自查：按 rank 连续、无重叠（切片间是 rank 区间，天然不重叠；这里验证 rank 序列）
let gap=0;
for(let i=1;i<report.length;i++){ if(report[i].lo===report[i-1].hi) gap++; }
console.log('note: 同一 rank 区间内按 insns 排序，切片间**不是地址连续**（地址可交错），合并必须按 vaddr 去重而非按 slice 号。');
