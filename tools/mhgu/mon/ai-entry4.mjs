// ai-entry4.mjs — pass 4: resolve PC-relative string references (add/sub rD, pc, rM with movw/movt bias).
// This is the mechanism used by this binary (literal pools are NOT used for these strings).
// Run: node .tmp/mhgu/mon/ai-entry4.mjs > .tmp/mhgu/mon/ai-entry4.out.txt 2>&1
import { buf, rd32, TEXT_END, disasm, functionStarts, nearestFunctionStart } from '../tools/arm32.mjs';

const out = [];
const say = (s = '') => out.push(String(s));
const HDR = (s) => say(`\n\n========== ${s} ==========`);
const hex = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const FILE_END = buf.length - 0x100;
const inText = (v) => v >= 0x100 && v < TEXT_END;
const inAny = (v) => v > 0x100 && v < FILE_END;

function strAt(v, max = 80) {
  if (!inAny(v)) return null;
  let s = '';
  for (let i = 0; i < max; i++) {
    const p = v + 0x100 + i;
    if (p >= buf.length) break;
    const c = buf[p];
    if (c === 0) break;
    if (c < 0x20 || c > 0x7e) return null;
    s += String.fromCharCode(c);
  }
  return s.length >= 2 ? s : null;
}
function movImm(a) {
  const w = rd32(a);
  if ((w >>> 28) !== 0xE) return null;
  if (((w >>> 25) & 1) !== 1) return null;
  if (((w >>> 26) & 3) !== 0) return null;          // data-processing immediate
  const opc = (w >>> 21) & 0xF, S = (w >>> 20) & 1;
  if (S !== 0) return null;
  if (opc !== 8 && opc !== 10) return null;
  return { imm: ((w >>> 4) & 0xF000) | (w & 0xFFF), kind: opc === 8 ? 'w' : 't', rd: (w >>> 12) & 0xF };
}
function writesReg(a, r) {
  const w = rd32(a);
  if ((w >>> 28) !== 0xE) return false;
  const opc = (w >>> 21) & 0xF, S = (w >>> 20) & 1;
  if (S === 1 && opc >= 8 && opc <= 11) return false;         // cmp/tst/teq/cmn
  if ((w & 0x0FFF0000) === 0x058F0000) return false;           // str rX,[pc..]
  if (((w >>> 25) & 1) === 0 && ((w >>> 26) & 3) === 1) {      // single transfer, register offset
    // store if L=0 -> Rt is bits 15:12 but destination is memory
    if (((w >>> 20) & 1) === 0) return false;
  }
  return ((w >>> 12) & 0xF) === r;
}

const starts = functionStarts();
const fnOf = (a) => nearestFunctionStart(a, starts);
const callers = new Map();
for (let a = 0x100; a + 4 <= TEXT_END; a += 4) {
  const w = rd32(a);
  if ((w >>> 28) !== 0xE || ((w >>> 25) & 7) !== 5) continue;
  let off = (w & 0xFFFFFF) << 2;
  if (off & 0x2000000) off -= 0x4000000;
  const t = (a + 8 + off) >>> 0;
  const arr = callers.get(t);
  if (arr) arr.push(a); else callers.set(t, [a]);
}
const callersOf = (t) => callers.get(t) || [];

// ---------- 1. movw+movt pair table ----------
const defAt = new Map();    // movw site -> {value, reg}
let nPair = 0;
for (let a = 0x100; a + 8 < TEXT_END; a += 4) {
  const m = movImm(a);
  if (!m || m.kind !== 'w') continue;
  for (let k = 1; k <= 12; k++) {
    const b = a + k * 4;
    const m2 = movImm(b);
    if (m2 && m2.rd === m.rd) {
      if (m2.kind !== 't') break;
      defAt.set(a, { value: ((m2.imm << 16) | m.imm) >>> 0, reg: m.rd });
      nPair++;
      break;
    }
    if (writesReg(b, m.rd)) break;
  }
}
say(HDR('1. movw+movt pairs'));
say(`pairs=${nPair}`);

// literal-pool loads that can also supply a bias register: ldr rD,[pc,#imm]
const litDefAt = new Map();   // site -> {value, reg}
for (let a = 0x100; a + 4 <= TEXT_END; a += 4) {
  const w = rd32(a);
  if ((w >>> 28) !== 0xE || ((w >>> 26) & 3) !== 1) continue;
  if (((w >>> 25) & 1) !== 0 || ((w >>> 20) & 1) !== 1) continue;
  if (((w >>> 16) & 0xF) !== 15) continue;
  const off = w & 0xFFF;
  const tgt = (a + 8 + ((w >>> 23) & 1 ? off : -off)) >>> 0;
  if (tgt + 4 > FILE_END) continue;
  litDefAt.set(a, { value: rd32(tgt), reg: (w >>> 12) & 0xF });
}
say(`literal defs=${litDefAt.size}`);

// ---------- 2. resolve add/sub rD, pc, rM ----------
const xrefs = new Map();   // target vaddr -> [{site, fn, kind}]
let nPcAdd = 0, nResolved = 0;
for (let a = 0x100; a + 4 <= TEXT_END; a += 4) {
  const w = rd32(a);
  if ((w >>> 28) !== 0xE) continue;
  if (((w >>> 26) & 3) !== 0 || ((w >>> 25) & 1) !== 0) continue;   // data-processing register
  const opc = (w >>> 21) & 0xF;
  if (opc !== 4 && opc !== 2) continue;                            // add / sub
  if (((w >>> 16) & 0xF) !== 15) continue;                         // Rn == pc
  if ((w & 0xFFF) !== 0) continue;                                 // no shift
  const rm = w & 0xF;
  if (rm === 15) continue;
  nPcAdd++;
  const sgn = opc === 4 ? 1 : -1;
  // find def of rm within 14 previous instructions
  for (let k = 1; k <= 14; k++) {
    const b = a - k * 4;
    if (b < 0x100) break;
    const d = defAt.get(b) || litDefAt.get(b);
    if (d && d.reg === rm) {
      let ok = true;
      for (let j = k - 1; j >= 1; j--) if (writesReg(a - j * 4, rm)) { ok = false; break; }
      if (!ok) break;
      const tgt = (a + 8 + sgn * d.value) >>> 0;
      if (inAny(tgt)) {
        const arr = xrefs.get(tgt) || [];
        arr.push({ site: a, fn: fnOf(a), kind: opc === 4 ? 'add' : 'sub' });
        xrefs.set(tgt, arr);
        nResolved++;
      }
      break;
    }
    if (writesReg(b, rm)) break;
  }
}
say(HDR('2. pc-relative resolution'));
say(`add/sub rD,pc,rM sites=${nPcAdd}  resolved-to-data=${nResolved}  distinct targets=${xrefs.size}`);

// ---------- 3. key strings ----------
const KEY = {
  cEmSetList: 0x155681f, cEmSetListXML: 0x15613a8, cEnemyResourceBroker: 0x15527bf,
  cEnemyDebugSetData: 0x155277f, cEmDouMouKa_PartsAura: 0x1552294, cEmSizeCalcTblElement: 0x15526be,
  cEmSizeYureTblElement: 0x1552742, uMonsterUnitConductor: 0x15535dc, uEnemy: 0x15535c9,
  uEnemyCharacter: 0x155358a, actionNo: 0x1553633, uEmXXX: 0x15533c8, emXXXFwMove: 0x15533db,
  uEm001_00: 0x15527d4, uEm088_00: 0x1552ba7, mMonsterIndex: 0x15526d4, mTrueSize: 0x15526e2,
};
say(HDR('3. key-string xrefs (pc-relative)'));
for (const [k, v] of Object.entries(KEY)) {
  const arr = xrefs.get(v) || [];
  say(`\n--- ${k} @ ${hex(v)} refs=${arr.length}`);
  for (const r of arr.slice(0, 6)) {
    say(`   ${r.kind} @${hex(r.site)} fn=${hex(r.fn)}`);
    say(disasm(Math.max(0x100, r.site - 16), 10).split('\n').map((l) => '     ' + l).join('\n'));
    if (r.fn > 0) say(`   callers of fn: ${callersOf(r.fn).slice(0, 6).map(hex).join(', ') || '(none)'}`);
  }
}

// ---------- 4. every monster-related string that IS referenced ----------
say(HDR('4. referenced monster strings (uEm###_00 / em###_##<Motion> / cEm* / m* monster fields)'));
const RE = /^(uEms?\d{3}_00|em\d{3}_\d{2}|ems\d{3}_\d{2}|cEm\w*|cEnemy\w*|mEmType|mAuraType|mVitalTblNo|mAttackTblNo|mStaminaTblNo|mActTblNo|mStepInfo|mAngryFlag|mMonsterIndex|mTrueSize|mScale|actionNo|uMonsterUnitConductor|uEnemy\w*)/;
let nMon = 0;
const byFn = new Map();
for (const [tgt, arr] of xrefs) {
  const s = strAt(tgt, 60);
  if (!s || !RE.test(s)) continue;
  nMon++;
  for (const r of arr) {
    const e = byFn.get(r.fn) || { n: 0, strs: new Set(), sites: [] };
    e.n++;
    e.strs.add(s);
    if (e.sites.length < 3) e.sites.push(r.site);
    byFn.set(r.fn, e);
  }
}
say(`distinct referenced monster strings=${nMon}; functions=${byFn.size}`);
const ranked = [...byFn.entries()].sort((a, b) => b[1].strs.size - a[1].strs.size);
for (const [fn, e] of ranked.slice(0, 40)) {
  say(` fn ${hex(fn)} strings=${e.strs.size} sites=${e.n} callers=${callersOf(fn).length}  e.g. ${[...e.strs].slice(0, 6).join(' | ')}`);
}

// ---------- 5. disassemble the top monster-string functions ----------
say(HDR('5. top monster-string-referencing functions (first 30 insns + callers)'));
for (const [fn, e] of ranked.slice(0, 12)) {
  if (fn <= 0) continue;
  say(`\n--- fn ${hex(fn)}  strings=${[...e.strs].slice(0, 10).join(' | ')}`);
  say(`    callers: ${callersOf(fn).slice(0, 8).map((c) => hex(c) + '@fn' + hex(fnOf(c))).join(', ') || '(none)'}`);
  say(disasm(fn, 30).split('\n').map((l) => '    ' + l).join('\n'));
}

// ---------- 6. all xref targets that are pool strings, histogram by function (who uses the pool at all) ----------
say(HDR('6. which functions reference the name pool at all (any string target)'));
const poolFns = new Map();
for (const [tgt, arr] of xrefs) {
  if (tgt < 0x1500000 || tgt > 0x1590000) continue;
  const s = strAt(tgt, 40);
  if (!s) continue;
  for (const r of arr) poolFns.set(r.fn, (poolFns.get(r.fn) || 0) + 1);
}
const pf = [...poolFns.entries()].sort((a, b) => b[1] - a[1]);
say(`functions referencing pool strings: ${pf.length}`);
for (const [fn, n] of pf.slice(0, 30)) say(` fn ${hex(fn)} refs=${n} callers=${callersOf(fn).length}`);

// ---------- 7. motion-name references ----------
say(HDR('7. motion/animation name references (FwMove|AttackMove|ActionMove|FlyMove|...)'));
const MRE = /(FwMove|MoveMove|AttackMove|ActionMove|FlyMove|HoverMove|SwimMove|MoguriMove|CatchMove|Catch2Move|PreCatchMove|RevivalMove|DemoMove|angry_Loop|tired_Loop|normal_Change)/;
const mFn = new Map();
let nM = 0;
for (const [tgt, arr] of xrefs) {
  const s = strAt(tgt, 60);
  if (!s || !MRE.test(s)) continue;
  nM++;
  for (const r of arr) {
    const e = mFn.get(r.fn) || new Set();
    e.add(s);
    mFn.set(r.fn, e);
  }
}
say(`motion strings referenced=${nM}; functions=${mFn.size}`);
for (const [fn, set] of [...mFn.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 20)) {
  say(` fn ${hex(fn)} motions=${set.size}  ${[...set].slice(0, 8).join(' | ')}`);
}

say(`\n[stats] pcAdd=${nPcAdd} resolved=${nResolved} targets=${xrefs.size} pairs=${nPair}`);
console.log(out.join('\n'));
