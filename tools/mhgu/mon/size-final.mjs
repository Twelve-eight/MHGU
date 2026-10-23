// size-final.mjs — (1) invert the manifest name hash for emsizetbl/emyure by trying path spellings,
//                   (2) join kill/capture counters with size records for both saves.
// Run: node .tmp/mhgu/mon/size-final.mjs > .tmp/mhgu/mon/size-final.out.txt
import fs from 'node:fs';

const hex = n => '0x' + (n >>> 0).toString(16);
function crc32raw(s) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) & 0xFF;
    for (let k = 0; k < 8; k++) c = (c & 1) ? ((c >>> 1) ^ 0xEDB88320) : (c >>> 1);
  }
  return c >>> 0;
}

// ---- 1: name-hash inversion attempts ----
const TARGET = { 0x681b7312: 'emsizetbl resource name', 0x081b9089: 'emyure resource name' };
const bases = ['emsizetbl', 'emyure', 'emSizeCalcTbl', 'emSizeYureTbl', 'em_size_calc_tbl', 'em_yure'];
const prefixes = ['', 'em/', 'em\\', 'data/', 'romfs/', 'em/em', 'em', 'res/', 'system/', 'em/st/'];
const suffixes = ['', '.emsizetbl', '.emyure', '.user', '.xml', '.bin', '.res', '.cro'];
const hits = [];
for (const b of bases) {
  for (const p of prefixes) for (const s of suffixes) {
    for (const c of [b, b.toUpperCase(), b.toLowerCase()]) {
      const str = p + c + s;
      for (const [t, label] of Object.entries(TARGET)) {
        if (crc32raw(str) === Number(t)) hits.push(`MATCH ${hex(Number(t))} = "${str}"  (${label})`);
      }
    }
  }
}
console.log('## F1 name-hash inversion attempts: ' + hits.length);
hits.forEach(h => console.log('   ' + h));
if (!hits.length) console.log('   (none)');
console.log();

// ---- 2: join counters and size records ----
const SYS = 'G:/omp works/MHGU/save-snapshots/20261022-clean-reference/system_CLEAN';
const DRT = 'G:/omp works/MHGU/save-snapshots/20261022-v6-ready/system';
const S = fs.readFileSync(SYS), D = fs.readFileSync(DRT);
for (const [tag, b, base] of [['clean 猎人A slot1', S, 0x2AC560], ['dirty 猎人B slot0', D, 0x18CC9C]]) {
  console.log(`## F2 ${tag}  base=0x${base.toString(16)}`);
  console.log('   block headers: kill@0x5EA2=' + b.slice(base + 0x5EA2, base + 0x5EA6).toString('hex')
    + '  cap@0x5FB4=' + b.slice(base + 0x5FB4, base + 0x5FB8).toString('hex')
    + '  size@0x60C6=' + b.slice(base + 0x60C6, base + 0x60CA).toString('hex'));
  const rows = [];
  for (let i = 0; i < 137; i++) {
    const k = b.readUInt16LE(base + 0x5EA6 + 2 * i);
    const c = b.readUInt16LE(base + 0x5FB8 + 2 * i);
    const mn = b.readUInt16LE(base + 0x60CA + 4 * i);
    const mx = b.readUInt16LE(base + 0x60CA + 4 * i + 2);
    if (k || c || mn || mx) rows.push({ i, k, c, mn, mx });
  }
  const killOnly = rows.filter(r => r.k > 0 && r.mn === 0);
  const sizeOnly = rows.filter(r => r.k === 0 && r.mn > 0);
  const both = rows.filter(r => r.k > 0 && r.mn > 0);
  console.log(`   slots with any data=${rows.length}  kills>0&size>0=${both.length}  kills>0&size==0=${killOnly.length}  kills==0&size>0=${sizeOnly.length}`);
  console.log('   slot | kill | cap | mini | maxi');
  for (const r of rows) console.log(`   ${String(r.i).padStart(4)} | ${String(r.k).padStart(4)} | ${String(r.c).padStart(3)} | ${String(r.mn).padStart(4)} | ${r.mx}`);
  const bad = rows.filter(r => r.mn > r.mx);
  console.log(`   mini>maxi violations: ${bad.length} ${bad.map(r => r.i).join(',')}`);
  console.log();
}
console.log('DONE');
