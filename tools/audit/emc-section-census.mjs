// emc-section-census.mjs — reproducible counts for the EMC (enemy command table) section question.
//
// Why: the EmcSection report and FOR-SE-REPLY §163 both claimed the interpreter selects "sections 1/8/13/14/15"
// at runtime. Two of those need a re-derivable basis, so this tool prints:
//   (A) every static store into em[0x72fc] (section index) and em[0x72fd] (entry index) in .text, with the
//       value resolved by decoding, plus a positive-control list that must resolve to the known values;
//   (B) per-section occupancy and reset (op 0x00) / delegate (op 0x14) counts over every deduped cmdtbl file,
//       and the states that only sections other than 0/1 name (what a section-1-only reader misses).
//
// Usage:
//   node tools/audit/emc-section-census.mjs --code
//   node tools/audit/emc-section-census.mjs --data <root> [root...]
//   node tools/audit/emc-section-census.mjs --all <root> [root...]
//
// vaddr = flat - 0x100 (same convention as the MHGU MCP tools); image default MHGU-private/main.140.flat.bin.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseEmc } from '../mhgu/emc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMAGE = process.env.MHGU_IMAGE || path.resolve(ROOT, '../MHGU-private/main.140.flat.bin');
const TEXT_START = 0x100;
const TEXT_END = 0x13f1dec;

const rd = (w) => (w >>> 12) & 0xf;
const rn = (w) => (w >>> 16) & 0xf;
const rm = (w) => w & 0xf;
const isMovw = (w) => (w & 0x0ff00000) === 0x03000000;
const movwVal = (w) => (((w >>> 4) & 0xf000) | (w & 0xfff)) >>> 0;
const isMovImm = (w) => (w & 0x0fe00000) === 0x03a00000;
const isMovReg = (w) => (w & 0x0ffffff0) === 0x01a00000;
function movImmVal(w) {
  const imm8 = w & 0xff, rot = ((w >>> 8) & 0xf) * 2;
  if (rot === 0) return imm8;
  return ((imm8 >>> rot) | (imm8 << (32 - rot))) >>> 0;
}
// store/load byte, register offset: bits27-25=011, B=1 (bit22), L selects store(0)/load(1) at bit20, imm5=0
const isStrbReg = (w) => (w & 0x0e500f90) === 0x06400000;
const isLdrbReg = (w) => (w & 0x0e500f90) === 0x06500000;
// store halfword, register offset (extra LS): bits27-24=0001, I=0 (bit22), L=0 (bit20), bits7-4=1011
const isStrhReg = (w) => (w & 0x0f5000f0) === 0x010000b0;
// store byte, imm12 offset: bits27-25=010, P=1, B=1, W=0, L=0 (imm12 == 0 checked by the caller)
const isStrbImm = (w) => ((w >>> 25) & 7) === 2 && ((w >>> 24) & 1) === 1 && ((w >>> 22) & 1) === 1 && ((w >>> 21) & 1) === 0 && ((w >>> 20) & 1) === 0;
const isStrhImm = (w) => ((w >>> 25) & 7) === 0 && ((w >>> 24) & 1) === 1 && ((w >>> 22) & 1) === 1 && ((w >>> 20) & 1) === 0 && ((w >>> 7) & 1) === 1 && ((w >>> 4) & 1) === 1 && (w & 0xf00) === 0 && (w & 0xf) === 0;
// data-processing register form, ADD, no shift: `add rD, rN, rM`
const isAddReg = (w) => ((w >>> 26) & 3) === 0 && ((w >>> 21) & 0xf) === 4 && ((w >>> 20) & 1) === 0 && ((w >>> 4) & 0xff) === 0;
// pre-indexed byte load, register offset: `ldrb rT,[rB,rM]!` — writes its offset register
const isLdrbPre = (w) => (w & 0x0f700f90) === 0x07700000;
// word store to the stack: imm-form store, P=1, L=0, Rn=sp
const isStrSp = (w) => ((w >>> 25) & 7) === 2 && ((w >>> 24) & 1) === 1 && ((w >>> 20) & 1) === 0 && rn(w) === 13;
// post-indexed load/store (P=0, W=0): the base register is rewritten by the access
const isPostIndexed = (w) => ((w >>> 25) & 7) === 3 && ((w >>> 24) & 1) === 0 && ((w >>> 21) & 1) === 0;

function codeCensus() {
  const img = fs.readFileSync(IMAGE);
  const w32 = new Uint32Array(img.buffer, img.byteOffset, img.length >> 2);
  const word = (v) => w32[(v + 0x100) >> 2];

  const findSites = (off) => {
    const out = [];
    for (let v = TEXT_START; v < TEXT_END; v += 4) {
      const w = word(v);
      if (isMovw(w) && movwVal(w) === off) out.push({ v, reg: rd(w) });
    }
    return out;
  };

  const resolve = (site) => {
    const aliases = new Set();   // registers provably holding (em + site.reg)
    const aliasHow = new Map();  // reg -> 'add' | 'post' | 'pre'
    const off = site.reg;        // the register holding the field offset
    let offDead = false;         // the offset register was overwritten or used up
    for (let i = 1; i <= 120; i++) {
      const v = site.v + i * 4;
      const w = word(v);
      // pre-indexed load through the offset register: the base advances by it (alias) and the
      // loaded value overwrites the offset register
      if (isLdrbPre(w) && rm(w) === off) { aliases.add(rn(w)); aliasHow.set(rn(w), 'pre'); offDead = true; continue; }
      // the offset register is reloaded/overwritten with something else: stop attributing stores to it
      if (!offDead && (isMovw(w) || isMovImm(w) || isAddReg(w) || isLdrbReg(w)) && rd(w) === off) offDead = true;
      if (isStrSp(w) && aliases.has(rd(w))) { aliases.delete(rd(w)); aliasHow.delete(rd(w)); }   // base escapes to the stack
      if (isPostIndexed(w) && rm(w) === off) { aliases.add(rn(w)); aliasHow.set(rn(w), 'post'); } // base += offset
      if (!offDead && isAddReg(w) && (rm(w) === off || rn(w) === off)) { aliases.add(rd(w)); aliasHow.set(rd(w), "add"); }
      let hit = false, rt = -1, conf = 'direct';
      const usesOff = (x) => !offDead && x === off;
      if (isStrbReg(w) && (usesOff(rm(w)) || aliases.has(rm(w)))) { hit = true; rt = rd(w); conf = usesOff(rm(w)) ? 'direct' : (aliasHow.get(rm(w)) || 'alias'); }
      if (isStrhReg(w) && (usesOff(rm(w)) || aliases.has(rm(w)))) { hit = true; rt = rd(w); conf = usesOff(rm(w)) ? 'direct' : (aliasHow.get(rm(w)) || 'alias'); }
      if (isStrhImm(w) && aliases.has(rn(w))) { hit = true; rt = rd(w); conf = aliasHow.get(rn(w)) || 'alias'; }
      if (isStrbImm(w) && (w & 0xfff) === 0 && aliases.has(rn(w))) { hit = true; rt = rd(w); conf = aliasHow.get(rn(w)) || 'alias'; }
      if (!hit) continue;
      for (let j = 1; j <= 80; j++) {
        const v2 = v - j * 4, w2 = word(v2);
        if (isLdrbReg(w2) && rd(w2) === rt) return { storeAt: v, conf, value: null, how: "restore (loaded from memory)" };
        if (isMovImm(w2) && rd(w2) === rt) return { storeAt: v, conf, value: movImmVal(w2), how: "mov imm" };
        if (isMovw(w2) && rd(w2) === rt) return { storeAt: v, conf, value: movwVal(w2), how: "movw" };
        if (isMovReg(w2) && rd(w2) === rt) {
          const src = rm(w2);
          for (let k = 1; k <= 80; k++) {
            const w3 = word(v2 - k * 4);
            if (isMovImm(w3) && rd(w3) === src) return { storeAt: v, conf, value: movImmVal(w3), how: `mov imm -> mov r${rt},r${src}` };
            if (isMovw(w3) && rd(w3) === src) return { storeAt: v, conf, value: movwVal(w3), how: `movw -> mov r${rt},r${src}` };
          }
          return { storeAt: v, conf, value: null, how: `mov r${rt},r${src} (source unresolved)` };
        }
      }
      return { storeAt: v, conf, value: null, how: "no immediate before store" };
    }
    return null;
  };

  const census = (off, label) => {
    const sites = findSites(off);
    const byStore = new Map();
    const unresolved = [];
    for (const s of sites) {
      const r = resolve(s);
      if (!r) continue;
      if (r.value === null) { unresolved.push({ site: s.v, ...r }); continue; }
      byStore.set(r.storeAt, { site: s.v, ...r });
    }
    const hist = new Map();
    for (const r of byStore.values()) hist.set(r.value, (hist.get(r.value) || 0) + 1);
    const sorted = [...hist.entries()].sort((a, b) => a[0] - b[0]);
    console.log(`# ${label}: ${sites.length} movw site(s), ${byStore.size} resolved store(s), ${unresolved.length} unresolved`);
    console.log(`  by confidence: ${["direct", "alias", "add", "post", "pre"].map((k) => `${k}:${[...byStore.values()].filter((r) => r.conf === k).length}`).join(" ")}`);
    const directHist = new Map();
    for (const r of byStore.values()) if (r.conf === 'direct') directHist.set(r.value, (directHist.get(r.value) || 0) + 1);
    console.log(`  direct-only values: ${[...directHist.entries()].sort((a, b) => a[0] - b[0]).map(([k, n]) => `0x${k.toString(16)}:${n}`).join(' ') || '(none)'}`);
    console.log(`  values: ${sorted.map(([k, n]) => `0x${k.toString(16)}:${n}`).join(' ') || '(none)'}`);
    for (const u of unresolved) console.log(`    unresolved site 0x${u.site.toString(16)} store 0x${u.storeAt.toString(16)}: ${u.how}`);
    for (const r of [...byStore.values()].filter((x) => x.value >= 0x0c).sort((a, b) => a.value - b.value)) {
      console.log(`    rare-value store 0x${r.storeAt.toString(16)} = 0x${r.value.toString(16)} from site 0x${r.site.toString(16)} [${label}] conf=${r.conf} (${r.how})`);
    }
    return byStore;
  };

  console.log('# (A) static stores into the dispatch fields');
  const sec = census(0x72fc, 'em+0x72fc section index');
  census(0x72fd, 'em+0x72fd entry index');

  // positive control: store sites whose value is fixed by the dispatcher decode and was hand-verified
  const CONTROL = [
    [0x8288c, 0x0d], [0x828f0, 0x08], [0x8292c, 0x0e], [0x82ae4, 0x13],
    [0x82c5c, 0x00], [0x82c94, 0x00], [0x82cc8, 0x09], [0x8b83c, 0x01],
    [0x8f69c, 0x02], [0x8da90, 0x12],
  ];
  let bad = 0;
  for (const [storeAt, want] of CONTROL) {
    const got = sec.get(storeAt);
    const ok = got && got.value === want;
    if (!ok) bad++;
    console.log(`  control ${ok ? 'PASS' : 'FAIL'} store 0x${storeAt.toString(16)} want 0x${want.toString(16)} got ${got ? '0x' + got.value.toString(16) : 'missing'}`);
  }
  if (bad) { console.log(`  CONTROL FAIL: ${bad}`); process.exitCode = 1; }
  const wrote15 = [...sec.values()].some((r) => r.value === 0x0f);
  console.log(`  section 15 written statically: ${wrote15 ? 'YES' : 'no'}`);
  return wrote15;
}

function dataCensus(roots) {
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) { for (const e of fs.readdirSync(p, { withFileTypes: true })) walk(path.join(p, e.name)); }
    else if (/_cmdtbl(\.|$)|\.3aabba02$/.test(path.basename(p))) yieldFile(p);
  };
  const seen = new Map();
  const yieldFile = (f) => {
    const buf = fs.readFileSync(f);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (!seen.has(sha)) seen.set(sha, { file: f, buf });
  };
  for (const r of roots) walk(r);

  console.log('');
  console.log('# (B) corpus census (deduped by sha256)');
  const agg = Array.from({ length: 21 }, (_, s) => ({ sec: s, files: 0, entries: 0, ins: 0, op00: 0, op14: 0, ent00: 0, ent14: 0, states: new Set() }));
  const rows = [];
  let nErr = 0, nOk = 0;
  for (const { file, buf } of seen.values()) {
    let doc;
    try { doc = parseEmc(buf, file); } catch (err) { nErr++; console.log(`  ERROR ${file}: ${err.message}`); continue; }
    nOk++;
    const st = new Map();
    for (const s of doc.sections) for (const e of s.entries) for (const x of e.ins) {
      if (x.kind !== 'cmd' || x.op !== 0x00) continue;
      if (!st.has(x.args[0])) st.set(x.args[0], new Set());
      st.get(x.args[0]).add(s.index);
    }
    const misses = [...st.entries()].filter(([, secs]) => !secs.has(0) && !secs.has(1)).map(([state, secs]) => ({ state, secs: [...secs].sort((a, b) => a - b) }));
    rows.push({ name: path.basename(file).replace(/_cmdtbl.*/, ''), misses });
    for (const s of doc.sections) {
      if (!s.entries.length) continue;
      const a = agg[s.index];
      a.files++;
      a.entries += s.entries.length;
      for (const e of s.entries) {
        a.ins += e.ins.length;
        let c00 = 0, c14 = 0;
        for (const x of e.ins) {
          if (x.kind !== 'cmd') continue;
          if (x.op === 0x00) { c00++; a.op00++; a.states.add(x.args[0]); }
          if (x.op === 0x14) { c14++; a.op14++; }
        }
        if (c00) a.ent00++;
        if (c14) a.ent14++;
      }
    }
  }
  console.log(`  files parsed ${nOk}/${seen.size}, errors ${nErr}`);
  console.log('  sec | files | entries |   ins | op00 | ent00 | op14 | ent14 | distinct states');
  for (const a of agg) {
    if (!a.files) { console.log(`${String(a.sec).padStart(4)} |     0 |       0 |     0 |    0 |     0 |    0 |     0 | 0`); continue; }
    console.log(`${String(a.sec).padStart(4)} | ${String(a.files).padStart(5)} | ${String(a.entries).padStart(7)} | ${String(a.ins).padStart(5)} | ${String(a.op00).padStart(4)} | ${String(a.ent00).padStart(5)} | ${String(a.op14).padStart(4)} | ${String(a.ent14).padStart(5)} | ${a.states.size}`);
  }
  const withMiss = rows.filter((r) => r.misses.length);
  console.log(`  states named ONLY outside sections 0/1: ${withMiss.length} file(s), ${withMiss.reduce((n, r) => n + r.misses.length, 0)} (file,state) pair(s)`);
  for (const r of withMiss.sort((a, b) => b.misses.length - a.misses.length)) {
    console.log(`    ${r.name}: ${r.misses.map((m) => `${m.state}@s${m.secs.join(',')}`).join(' ')}`);
  }
  // positive control: em043_00 names state 16 in section 14 only
  const ctl = rows.find((r) => r.name === 'em043_00');
  const ctlOk = ctl && ctl.misses.some((m) => m.state === 16 && m.secs.length === 1 && m.secs[0] === 14);
  console.log(`  control em043_00 state 16 only in s14: ${ctlOk ? 'PASS' : 'FAIL'}`);
  if (!ctlOk) process.exitCode = 1;
}

const argv = process.argv.slice(2);
const mode = argv[0];
const roots = argv.slice(1);
if (mode === '--code') codeCensus();
else if (mode === '--data') { if (!roots.length) { console.error('need roots'); process.exit(2); } dataCensus(roots); }
else if (mode === '--all') { if (!roots.length) { console.error('need roots'); process.exit(2); } codeCensus(); dataCensus(roots); }
else { console.error('usage: node tools/audit/emc-section-census.mjs --code | --data <root...> | --all <root...>'); process.exit(2); }
