import fs from "fs";
const lines=[];
const A=(off,bytes,note)=>lines.push([off,bytes,note]);
// === V6 base (22) — flat offsets, verified ===
A("00199044","D62E02E3","rev-scan2 sentinel");
A("00199048","AFCB00E3","rev-scan2 lane bound");
A("0019904c","B13B00E3","rev-scan2 lane bound");
A("001990a0","B0CB00E3","fwd slot-search bound");
A("001990ec","D82E02E3","rev scan end");
A("001990fc","B02B00E3","rev scan count");
A("0019a5f8","B07B00E3","save serializer N");
A("0019a668","B05B00E3","save deserializer N");
A("003e8b10","B01B00E3","runtime clear loop N");
A("0019a648","852900E3","preset block write len 2437");
A("0019a6c0","852900E3","preset block read len 2437");
A("0019ac04","0E005CE3","preset bound excl 14");
A("0019ac4c","0D0051E3","preset bound incl 13");
A("0019acb0","0E0051E3","preset bound excl 14");
A("0019accc","0E0051E3","preset bound excl 14");
A("0019ace8","0D0051E3","preset bound incl 13");
A("0019a9e4","C00E02E3","heap alloc 0x2EC0");
A("0019a9f4","C02E02E3","heap copy 0x2EC0");
A("0019ab44","C02E02E3","heap copy 0x2EC0");
A("0019ab90","C00E02E3","heap alloc 0x2EC0");
A("0019ab9c","C02E02E3","heap copy 0x2EC0");
A("0019abb4","C02E02E3","heap copy 0x2EC0");
// === UI capacity getter: movw r0,#0xBB0; bx lr ===
A("00199004","B00B00E3","capacity getter -> 0xBB0");
A("00199008","1EFF2FE1","bx lr");
// === 30 inline capacity (e2800ffa -> movw r0,#0xBB0), CORRECTED flat offsets ===
const inl=["00198f74","00199038","001991bc","00199274","0019935c","001993d8","0019951c","001995f0","00199718","001997a0","00199818","0019990c","00199a00","00199a98","00199b10","00199bc8","00199c68","00199cec","00199ee8","00199f40","0019a034","0019a09c","0019a120","0019a2d8","0019a348","0019a3c0","0019a448","0019a4f0","0019a564","0019b0c0"];
for(const v of inl)A(v,"B00B00E3","inline capacity");
// === 65 layout-shift sites (V7Builder-verified movw sites), re-encoded for the V8 layout ===
// V7 only shifted B/C/D/heap/presets by 0xAD0 and kept B/C/D at 2300 entries, while the 30
// inline-capacity loops above run to 2992: B fill 0xAD0 B past B, C fill 0x568 B past C,
// D fill 0x2B2 B past D into the heap pointer and presets (spec R2). V8 grows each region to
// 2992 entries: B 0x23F0->0x2EC0 (+0xAD0), C 0x11F8->0x1760 (+0x568), D 0x8FE->0xBB2 (+0x2B4,
// keeps the 2 B pad so the heap pointer stays 4-aligned). Every later field moves accordingly.
const V8 = new Map([
  [0x2EDA, 0x2EDA], [0x2EDC, 0x2EDC],          // B base/count: unchanged
  [0x52B0, 0x5D80],                            // A+B clear length
  [0x52CA, 0x5D9A],                            // C base
  [0x64A8, 0x74E0],                            // A+B+C clear length
  [0x64C2, 0x74FA],                            // D base (incl. UI page base)
  [0x6DA6, 0x8092],                            // heap sub-adjust
  [0x6DC0, 0x80AC],                            // A-backup heap pointer
  [0x6DC4, 0x80B0],                            // preset base
  [0x6DED, 0x80D9], [0x6DEE, 0x80DA], [0x6DF0, 0x80DC], [0x6DF2, 0x80DE], // preset record fields
  [0x7DB4, 0x90A0]                             // object size
]);
const S=JSON.parse(fs.readFileSync("G:/omp works/MHGU/tools/v7-shift-65.json"));
for(const [off,bytes,note] of S){
  const w=Buffer.from(bytes,"hex").readUInt32LE(0);
  if((w&0x0FF00000)!==0x03000000) throw new Error(`${off}: not a movw (${bytes})`);
  const imm=((w>>>4)&0xF000)|(w&0xFFF);
  const next=V8.get(imm);
  if(next===undefined) throw new Error(`${off}: unmapped V7 immediate 0x${imm.toString(16)}`);
  const out=Buffer.alloc(4);
  out.writeUInt32LE(((w&0xFFF0F000)|((next&0xF000)<<4)|(next&0xFFF))>>>0);
  A(off,out.toString("hex").toUpperCase(),note.replace(/->#0x[0-9a-f]+/,`->#0x${next.toString(16)}`));
}
// === 4 preset guards ===
A("0019a900","0D0051E3","preset guard r1<14");
A("0019a94c","0D0051E3","preset guard r1<14");
A("0019b21c","0D0054E3","preset guard r4<14");
A("0019b460","0D0051E3","preset guard r1<14");
const hdr=`@nsobid-FB08F1D20FD1204FE7070672777F869B

# MHGU [0100770008DD8000] v1.4.0 - ITEM BOX EXPANSION V8
# N=2992 (0xBB0). box bitstream 7106B @0x278; presets 24->14 @0x1E3A (2437B block).
# V8 = V6 + capacity getter + 30 inline capacity + object layout with B/C/D sized for 2992.
# Layout: B 0x240A/0x240C->0x2EDA/0x2EDC (0x2EC0 B); C 0x47FA->0x5D9A (0x1760 B);
#   D 0x59F2->0x74FA (0xBB2 B); heap 0x62F0->0x80AC; adj 0x62D6->0x8092; preset 0x62F4->0x80B0;
#   rec 0x631D/1E/20/22->0x80D9/DA/DC/DE; obj 0x72E4->0x90A0.
# Save format is identical to V7 (only the runtime object changes); V7 saves load unchanged.
# Lines = flat file offsets (vaddr+0x100), no offset_shift. 0x19B1F4 = known gap.
@flag print_values

@enabled
`;
const body=lines.map(l=>l[0]+" "+l[1]+(l[2]?"   // "+l[2]:"")).join("\n")+"\n@stop\n";
fs.writeFileSync("G:/omp works/MHGU/patch/experimental-v8/1.4.0.pchtxt",hdr+body);
console.log("V8 written:",lines.length,"lines");
