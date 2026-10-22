// V7 builder: V6 + getter + layout shift + preset guards.
// All line addresses = flat file offset (vaddr + 0x100), no offset_shift (yuzu1734 semantics).
const W=(rd,imm)=>{const w=0xE3000000|(((imm>>>12)&0xF)<<16)|((rd&0xF)<<12)|(imm&0xFFF);
  return Array.from(new Uint8Array(new Uint32Array([w]).buffer)).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();};
const CMP=(rn,imm)=>{const w=0xE3500000|((rn&0xF)<<16)|(imm&0xFF);
  return Array.from(new Uint8Array(new Uint32Array([w]).buffer)).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();};
const lines=[];
const A=(vaddr,bytes,note)=>lines.push([(vaddr+0x100).toString(16).padStart(8,'0'),bytes,note]);

// --- V6 original 22 (capacity/search/serialize/preset-count/heap) ---
A(0x198f44,"D62E02E3","rev-scan2 sentinel 0x2406->0x2ED6");
A(0x198f48,"AFCB00E3","rev-scan2 lane 0x8FB->0xBAF");
A(0x198f4c,"B13B00E3","rev-scan2 lane 0x8FD->0xBB1");
A(0x198fa0,"B0CB00E3","fwd bound 0x8FC->0xBB0");
A(0x198fec,"D82E02E3","rev end 0x2408->0x2ED8");
A(0x198ffc,"B02B00E3","rev count 0x8FC->0xBB0");
A(0x19a4f8,"B07B00E3","serializer N");
A(0x19a568,"B05B00E3","deserializer N");
A(0x3e8a10,"B01B00E3","clear loop N");
A(0x19a548,"852900E3","preset blk wlen 0x985");
A(0x19a5c0,"852900E3","preset blk rlen 0x985");
A(0x19ab04,"0E005CE3","preset excl 14");
A(0x19ab4c,"0D0051E3","preset incl 13");
A(0x19abb0,"0E0051E3","preset excl 14");
A(0x19abcc,"0E0051E3","preset excl 14");
A(0x19abe8,"0D0051E3","preset incl 13");
A(0x19a8e4,"C00E02E3","heap alloc 0x2EC0");
A(0x19a8f4,"C02E02E3","heap copy 0x2EC0");
A(0x19aa44,"C02E02E3","heap copy");
A(0x19aa90,"C00E02E3","heap alloc");
A(0x19aa9c,"C02E02E3","heap copy");
A(0x19aab4,"C02E02E3","heap copy");

// --- getter → 30 pages ---
A(0x198f04,"B00B00E3","UI capacity getter movw r0,#0xBB0");
A(0x198f08,"1EFF2FE1","bx lr");

// --- 29 inline capacity constants (e2800ffa -> e3000bb0 = movw r0,#0xBB0) ---
const inlines=[0x198e74,0x198f38,0x1990bc,0x199174,0x19925c,0x1992d8,0x19941c,0x1994f0,0x199618,0x1996a0,0x199718,0x19980c,0x199900,0x199998,0x199a10,0x199ac8,0x199b68,0x199bec,0x199de8,0x199e40,0x199f34,0x199f9c,0x19a020,0x19a1d8,0x19a248,0x19a2c0,0x19a348,0x19a3f0,0x19a464,0x19afc0];
for(const v of inlines)A(v,"B00B00E3","inline capacity movw r0,#0xBB0");

// --- layout shift 0xAD0: obj fields B/C/D/heap/preset/size ---
const shift=[
 [0x199b20,"movw",0,0x2eda,"B base 0x240A->0x2EDA"],
 [0x199c10,"movw",14,0x2eda,"B id base"],
 [0x199c00,"movw",12,0x2edc,"B count base"],
 [0x199d84,"movw",0,0x2eda,"B->A read base"],
 [0x199b04,"movw",0,0x52ca,"C start 0x47FA->0x52CA"],
 // C tail = D start 0x59F2->0x64C2 (10 sites per report)
 // heap ptr 0x62F0->0x6DC0 (8 sites)
 // preset base 0x62F4->0x6DC4 (11 sites)
 // preset fields 0x631D->0x6DED(5),0x631E->0x6DEE(6),0x6320->0x6DF0(8? said 5/6/5)
 // obj size 0x72E4->0x7DB4 (2 sites)
 // memclr len 0x59D8->0x64A8 (2), A+B len 0x47E0->0x52B0 (1)
 // backup src adj 0x62D6->0x6DA6 (1)
];
// Need exact site list — pull from reports:
console.log("V7 generator skeleton — needs full site list from reports");
