// Class layer: locate a monster's GU class, its L1 state dispatcher, the class body bounds
// [ctor, next ctor) and each state's L2 variant dispatcher (index base + bound + table base).
//
// Facts re-derived from the binary; the em -> class and class -> ctor bindings come from the repo KB
// (MHRS-private/kb/gu-em-shared-class.tsv, gu-l1-class-names.tsv) and are *verified* here: the L1
// dispatcher must show the `movw rX,#0x73e0` idiom with an 18-word table, and every table target must
// land inside the class body. When a binding fails verification the tool errors instead of guessing.
import fs from 'node:fs';
import path from 'node:path';
import { insAt, insRange, parseMem, parseRegList, immVal, regNum, hex } from './arm.mjs';
import { rd32, TEXT_END, functionStarts } from 'file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs';

export const KB_DIR = 'G:/omp works/MHRS-private/kb';
export const PLAY = { 0xafda4: 'play', 0xaff40: 'play0', 0xaff48: 'play48', 0xaffac: 'playac' };
export const ARM = { 0x7dc2c: 'arm', 0x7df94: 'arm0' };
export const SHELL = 0x48c4f0;
export const STUB = { 0xca10c: 'stub', 0xca118: 'stub' };
export const TERMINAL = new Map([...Object.entries(PLAY), ...Object.entries(ARM), [SHELL, 'shell'], ...Object.entries(STUB)].map(([a, b]) => [Number(a), b]));

function readTsv(p) {
  const txt = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const lines = txt.split('\n').filter(l => l.trim() !== '');
  const head = lines[0].split('\t');
  return lines.slice(1).map(l => {
    const cells = l.split('\t');
    const o = {};
    head.forEach((h, i) => { o[h] = cells[i]; });
    return o;
  });
}

export class ClassIndex {
  constructor(kbDir = KB_DIR) {
    this.classes = new Map(); // class_name -> {ctor, l1disp, l1fn, size, vtable}
    for (const r of readTsv(path.join(kbDir, 'gu-l1-class-names.tsv'))) {
      this.classes.set(r.class_name, {
        name: r.class_name,
        em: r.em,
        ctor: parseInt(r.ctor, 16),
        l1fn: parseInt(r.l1_fn, 16),
        l1disp: parseInt(r.l1_disp, 16),
        size: parseInt(r.size, 16),
        vtable: parseInt(r.class_vtable, 16),
      });
    }
    const sorted = [...this.classes.values()].sort((a, b) => a.ctor - b.ctor);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].nextCtor = i + 1 < sorted.length ? sorted[i + 1].ctor : sorted[i].ctor + sorted[i].size;
      sorted[i].body = [sorted[i].ctor, sorted[i].nextCtor];
    }
    this.sorted = sorted;
    this.emMap = new Map();
    for (const r of readTsv(path.join(kbDir, 'gu-em-shared-class.tsv'))) {
      if (r.class_reached && r.class_reached !== '-') this.emMap.set(r.em, r.class_reached);
    }
  }

  classFor(guEmSub) {
    // The KB key is normally `<em>_<sub>` (em001_00), but the small-monster rows store the family
    // only (ems001, no sub) because one class serves the whole family. Try the exact key first.
    const name = this.emMap.get(guEmSub) ?? this.emMap.get(String(guEmSub).replace(/_\d\d$/, ''));
    if (!name) throw new Error(`no class binding for ${guEmSub} in gu-em-shared-class.tsv`);
    const c = this.classes.get(name);
    if (!c) throw new Error(`class ${name} not in gu-l1-class-names.tsv`);
    return c;
  }
}

// --- dispatcher parsing ---------------------------------------------------------------------
// Canonical idiom (all 18-state L1 dispatchers and every L2 table seen so far):
//   movw rA, #0x73E0|0x73E1
//   ldrb rB, [rC, rA]
//   [sub rB2, rB, #base]        (index base; optional, L2 only)
//   cmp  rB2, #max              (inclusive bound)
//   bhi  <default>
//   mov  rB2, rB2, lsl #2
//   add  rD, pc, #imm           (table base = addr_of_add + 8 + imm)
//   ldr  rB2, [rB2, rD]
//   add  pc, rB2, rD
export function parseDispatch(headAddr, varOff = 0x73e0) {
  const ins = insRange(headAddr, 24);
  if (ins.length < 8) return null;
  let i = -1;
  for (let k = 0; k < Math.min(ins.length, 8); k++) {
    const x = ins[k];
    if (x.mn === 'movw' && x.ops.length === 2) {
      const v = immVal(x.ops[1]);
      if (v === varOff) { i = k; break; }
    }
  }
  if (i < 0) return null;
  const varReg = regNum(ins[i].ops[0]);
  // ldrb rB, [rC, rVar]
  let k = i + 1;
  while (k < ins.length && !(ins[k].mn === 'ldrb' && ins[k].ops.length >= 2)) k++;
  if (k >= ins.length) return null;
  const mem = parseMem(ins[k].ops[1]);
  if (!mem || mem.idx !== varReg) return null;
  let idxReg = regNum(ins[k].ops[0]);
  let indexBase = 0;
  // optional sub
  const sub = ins[k + 1];
  if (sub && sub.mn === 'sub' && sub.ops.length === 3 && regNum(sub.ops[1]) === idxReg) {
    const n = immVal(sub.ops[2]);
    if (n !== null) { indexBase = n; idxReg = regNum(sub.ops[0]); k++; }
  }
  // cmp idxReg, #max
  let cmp = null, cmpIdx = -1;
  for (let j = k + 1; j < Math.min(ins.length, k + 6); j++) {
    const x = ins[j];
    if (x.mn === 'cmp' && x.ops.length === 2 && regNum(x.ops[0]) === idxReg) {
      const m = immVal(x.ops[1]);
      if (m !== null) { cmp = m; cmpIdx = j; break; }
    }
  }
  if (cmp === null) return null;
  const br = ins[cmpIdx + 1];
  if (!br) return null;
  let defAddr = null;
  if (br.mn === 'b' && br.cond !== '') {
    defAddr = parseInt(br.ops[0], 16);
  } else if (br.mn === 'bx' && br.cond !== '') {
    defAddr = null; // `bx<cond> lr` = out-of-range returns
  } else {
    return null;
  }
  // add rD, pc, #imm  ->  ldr rE, [rE, rD]  ->  add pc, rE, rD
  let tableBase = null, baseReg = -1, wordReg = -1, addPcSeen = false;
  for (let j = cmpIdx + 1; j < Math.min(ins.length, cmpIdx + 8); j++) {
    const x = ins[j];
    if (tableBase === null) {
      if (x.mn === 'add' && x.ops.length === 3 && regNum(x.ops[0]) !== 15 && regNum(x.ops[1]) === 15) {
        const off = immVal(x.ops[2]);
        if (off !== null) { tableBase = (x.addr + 8 + off) >>> 0; baseReg = regNum(x.ops[0]); }
      }
      continue;
    }
    if (wordReg < 0 && x.mn === 'ldr' && x.ops.length === 2) {
      const mm = parseMem(x.ops[1]);
      if (mm && mm.idx === baseReg && mm.off === null) { wordReg = regNum(x.ops[0]); continue; }
    }
    if (x.mn === 'add' && regNum(x.ops[0]) === 15 && regNum(x.ops[2]) === baseReg) { addPcSeen = true; break; }
  }
  if (tableBase === null || wordReg < 0) return null;
  return {
    head: headAddr, varOff, indexBase, max: cmp, count: cmp + 1, tableBase,
    defaultAddr: defAddr, cmpAddr: ins[cmpIdx].addr, baseReg, wordReg, addPcSeen,
  };
}

// --- relaxed L1 parse ---------------------------------------------------------------------------
// `parseDispatch` assumes the dispatcher opens with the literal idiom `movw rX,#0x73E0`. Two classes
// in the KB break that assumption while still being ordinary 18-state table dispatchers (both read
// instruction by instruction from the image; vaddr = flat - 0x100):
//
//   uEm049_00 0xec3b98  no instruction ever holds 0x73E0 - the state byte is read through
//                       base+counter arithmetic and a writeback:
//                         0xec3ba0  movw r0, #0xcaf0
//                         0xec3bac  strb r1, [r5, r0]!   ; r5 = em + 0xcaf0
//                         0xec3bb0  movw r0, #0xa8f0
//                         0xec3bb4  movt r0, #0xffff    ; r0 = 0xffffa8f0
//                         0xec3bb8  ldrb r0, [r5, r0]    ; [em + 0xcaf0 + 0xffffa8f0] = [em + 0x73e0]
//                         0xec3bbc  cmp  r0, #17
//                         0xec3bc0  bhi  0xec3c4c       ; default
//                         0xec3bc8  add  r1, pc, #4     ; table 0xec3bd4, 18 entries
//   uEm058_00 0xf0a6fc  a special-case preamble runs first (0xf0a710 cmp [em+0x73e0],#7,
//                       0xf0a718 movw #0x73e1, ...), so the first `cmp` on the state register is #7
//                       and the real bound + table sit 0x7c bytes further down:
//                         0xf0a774  ldrb r0, [r5]        ; r5 = em + 0x73e0 from 0xf0a70c
//                         0xf0a778  cmp  r0, #17
//                         0xf0a77c  bhi  0xf0a874
//                         0xf0a784  add  r1, pc, #4     ; table 0xf0a790, 18 entries
//
// Both still end in `cmp rS,#max ; bhi <default> ; ... ; add rD,pc,#imm ; ldr rW,[..,rD] ;
// add pc,rW,rD`. This pass tracks base+offset symbolically (so a computed byte address can be
// compared against varOff) and then demands the bound branch and the complete table idiom. It runs
// only after the strict parse failed at every candidate, so a class that parsed before cannot change.
const L1_WINDOW = 96;
const L1_TABLE_WINDOW = 12;

function symAdd(a, b) {
  if (!a || !b) return null;
  if (a.sym === null || b.sym === null) return { sym: a.sym ?? b.sym, off: ((a.off + b.off) >>> 0) };
  if (a.sym === b.sym) return { sym: a.sym, off: ((a.off + b.off) >>> 0) };
  return null;
}

function memAddr(env, mm) {
  if (!mm) return null;
  if (mm.idx !== null) return symAdd(env[mm.base], env[mm.idx]);
  return symAdd(env[mm.base], { sym: null, off: (mm.off ?? 0) >>> 0 });
}

function tableIdiom(ins, from) {
  const end = Math.min(ins.length, from + L1_TABLE_WINDOW);
  let tableBase = null, baseReg = -1, wordReg = -1;
  for (let j = from; j < end; j++) {
    const x = ins[j];
    if (tableBase === null) {
      if (x.mn === 'add' && x.ops.length === 3 && regNum(x.ops[0]) !== 15 && regNum(x.ops[1]) === 15) {
        const off = immVal(x.ops[2]);
        if (off !== null) { tableBase = (x.addr + 8 + off) >>> 0; baseReg = regNum(x.ops[0]); }
      }
      continue;
    }
    if (wordReg < 0 && x.mn === 'ldr' && x.ops.length === 2) {
      const mm = parseMem(x.ops[1]);
      if (mm && mm.off === null && (mm.base === baseReg || mm.idx === baseReg)) wordReg = regNum(x.ops[0]);
      continue;
    }
    if (x.mn === 'add' && regNum(x.ops[0]) === 15 && wordReg >= 0 && regNum(x.ops[2]) === baseReg) {
      return { tableBase, baseReg, wordReg };
    }
  }
  return null;
}

export function parseDispatchL1(headAddr, varOff = 0x73e0) {
  const ins = insRange(headAddr, L1_WINDOW);
  if (ins.length < 8) return null;
  // register env: {sym, off}. Every register starts as its own symbol; r0 is the monster (`this`),
  // so a byte address whose symbol chain roots at r0 and whose offset equals varOff is the state byte.
  const env = Array.from({ length: 16 }, (_, r) => ({ sym: r === 0 ? 'r0' : 'r' + r, off: 0 }));
  let stateReg = -1;
  for (let i = 0; i < ins.length; i++) {
    const x = ins[i];
    const ops = x.ops;
    const rd = ops.length ? regNum(ops[0]) : -1;
    if ((x.mn === 'str' || x.mn === 'strb' || x.mn === 'strh') && ops.length >= 2) {
      const mm = parseMem(ops[1]);
      if (mm && mm.writeback) env[mm.base] = memAddr(env, mm);
      continue;
    }
    if ((x.mn === 'ldr' || x.mn === 'ldrb' || x.mn === 'ldrh' || x.mn === 'ldrsh' || x.mn === 'ldrsb')
      && rd >= 0 && rd < 15 && ops.length >= 2) {
      const mm = parseMem(ops[1]);
      const addr = memAddr(env, mm);
      if (mm && mm.writeback) env[mm.base] = addr;
      const hit = x.mn === 'ldrb' && addr !== null && addr.sym === 'r0' && addr.off === (varOff >>> 0);
      env[rd] = null;
      if (hit) stateReg = rd;
      continue;
    }
    if (x.mn === 'mov' && rd >= 0 && rd < 13) {
      env[rd] = ops.length === 2 && regNum(ops[1]) >= 0 ? (env[regNum(ops[1])] ?? null) : null;
      continue;
    }
    if (x.mn === 'movw' && rd >= 0 && rd < 13) {
      const v = immVal(ops[1] ?? '');
      env[rd] = v === null ? null : { sym: null, off: v, mk: true };
      continue;
    }
    if (x.mn === 'movt' && rd >= 0 && rd < 13) {
      const v = immVal(ops[1] ?? '');
      const cur = env[rd];
      env[rd] = v === null || !cur || cur.sym !== null ? null
        : { sym: null, off: (((v << 16) | (cur.off & 0xffff)) >>> 0) };
      continue;
    }
    if (x.mn === 'add' && rd >= 0 && rd < 13 && ops.length >= 3) {
      const imm = immVal(ops[2]);
      env[rd] = regNum(ops[1]) >= 0 && regNum(ops[1]) !== 15 && imm !== null
        ? symAdd(env[regNum(ops[1])], { sym: null, off: imm }) : null;
      continue;
    }
    if (x.mn === 'sub' && rd >= 0 && rd < 13 && ops.length >= 3) {
      const imm = immVal(ops[2]);
      const a = regNum(ops[1]) >= 0 ? env[regNum(ops[1])] : null;
      env[rd] = a && a.sym !== null && imm !== null ? { sym: a.sym, off: ((a.off - imm) >>> 0) } : null;
      continue;
    }
    if (x.mn === 'bl' || x.mn === 'blx') { for (const r of [0, 1, 2, 3, 12]) env[r] = null; continue; }
    if (x.mn === 'cmp' && stateReg >= 0 && regNum(ops[0]) === stateReg && ops.length === 2) {
      const max = immVal(ops[1]);
      const br = ins[i + 1];
      if (max !== null && br && br.mn === 'b' && br.cond === 'hi') {
        const found = tableIdiom(ins, i + 1);
        if (found) {
          return {
            head: headAddr, varOff, indexBase: 0, max, count: max + 1, tableBase: found.tableBase,
            defaultAddr: parseInt(br.ops[0], 16), cmpAddr: x.addr, baseReg: found.baseReg,
            wordReg: found.wordReg, addPcSeen: true,
          };
        }
      }
    }
  }
  return null;
}

// Locate the class's L1 dispatcher: KB points at (or just before) the head; scan a small window.
// The KB leaves `l1_disp` empty for classes whose dispatcher it could not attribute
// (`verdict: no_l1_dispatcher_at_1f4`, e.g. em049_00, em058_00); parseInt('') is NaN and every
// NaN comparison is false, so the window filter used to pass NaN straight into rd32 and throw
// `RangeError: offset ... Received NaN` from inside the disassembler. Drop non-finite candidates
// and report "no dispatcher" instead.
// The two `no_l1_dispatcher_at_1f4` classes do have a dispatcher at their vtable slot +0x1F4 (read
// back from the class vtables: uEm049_00 0x17cd178 = 0xec3b98, uEm058_00 0x17d3288 = 0xf0a6fc,
// uEm001_00 0x179aeec = 0xcf1550 = its l1_disp, which is what pins the slot); the KB simply could
// not parse their shape. They are recovered by the second pass below.
export function findL1(klass) {
  const starts = [klass.l1disp, klass.l1fn, klass.l1disp - 8, klass.l1fn - 8, klass.l1disp - 16, klass.l1fn - 16]
    .filter(Number.isFinite);
  for (const s of starts) {
    if (s < klass.ctor || s >= klass.nextCtor) continue;
    const d = parseDispatch(s, 0x73e0);
    if (d && d.count === 18) return { ...d, targets: tableTargets(d) };
  }
  for (const s of starts) {
    if (s < klass.ctor || s >= klass.nextCtor) continue;
    const d = parseDispatchL1(s, 0x73e0);
    if (d && d.count === 18) return { ...d, targets: tableTargets(d), relaxed: true };
  }
  return null;
}

export function tableTargets(d) {
  const out = [];
  for (let i = 0; i < d.count; i++) out.push((d.tableBase + rd32(d.tableBase + i * 4)) >>> 0);
  return out;
}

export function inBody(klass, addr) { return addr >= klass.ctor && addr < klass.nextCtor; }

// Follow `b`/`b<cond>` trampolines and `bl`+return stubs to the real body of an L1 table entry.
// A trampoline here is a one-instruction `b target` (the L1 tables point at 2-3 instruction stubs).
export function resolveEntryStub(addr, klass) {
  const seen = new Set();
  let a = addr;
  for (let hop = 0; hop < 8; hop++) {
    if (seen.has(a)) break;
    seen.add(a);
    const x = insAt(a);
    if (!x) break;
    if (x.mn === 'b' && x.cond === '') {
      const t = parseInt(x.ops[0], 16);
      a = t;
      continue;
    }
    break;
  }
  return a;
}

// Resolve the L2 dispatcher of one state.
//   - a direct dispatcher parses immediately (table form, or a compare chain on 0x73E1);
//   - L1 table entries are often 2-instruction stubs (`mov r0,r4` + `bl real` / `b real`), so a
//     *thin* stub (no work besides moving arguments, terminated by one branch) is followed;
//   - anything else is treated as an inline handler that reads 0x73E1 itself (compare chain).
// The thin-stub rule stops at the first terminator so neighbouring table entries (which sit at
// head+4 each) are never mistaken for a callee.
export function findL2(entryAddr, klass) {
  const seen = new Set();
  let a = entryAddr;
  for (let hop = 0; hop < 6; hop++) {
    if (seen.has(a)) break;
    seen.add(a);
    const d = parseDispatch(a, 0x73e1);
    if (d) return { ...d, entryAddr, kind: 'table' };
    // thin stub?
    let target = null;
    let n = 0;
    for (const x of insRange(a, 6)) {
      n++;
      if (x.mn === 'b' && x.cond === '') { target = parseInt(x.ops[0], 16); break; }
      if (x.mn === 'bl' && n <= 3) { target = parseInt(x.ops[0], 16); break; }
      if ((x.mn === 'bx') || (x.mn === 'pop' && parseRegList(x.ops[0] ?? '')?.includes(15))) { target = null; break; }
      // argument moves only
      const ok = x.mn === 'mov' || x.mn === 'add' && regNum(x.ops[1]) !== 15 || x.mn === 'push' || x.mn === 'pop' || x.mn === 'vpush' || x.mn === 'vpop' || x.mn === 'sub' && regNum(x.ops[0]) === 13;
      if (!ok) { target = null; break; }
    }
    if (target === null || target < klass.ctor || target >= klass.nextCtor) break;
    a = target;
  }
  // compare-chain / inline handler: the walker seeds 0x73E1 so the chain resolves per variant
  return { head: entryAddr, entryAddr, kind: 'chain', varOff: 0x73e1, indexBase: 0, max: null, count: null, tableBase: null, defaultAddr: null };
}

// Decide whether a `bl` target outside the class body is a shared helper worth following.
// A helper qualifies when its own body (bounded) contains a direct branch/call to the play, arm or
// shell family - e.g. 0xb0170 forwards r1 to 0xafda4, 0xb04b4 plays one id and hands another to a
// vtable slot. Engine routines that never touch those families (0x6f6d4, 0x78c34, 0xbc8b0, the EMC
// interpreter) are opaque, so the walk cannot wander into them. Two levels of forwarding are allowed
// and everything is memoised, because the check runs at every call site.
const _helperMemo = new Map();
let _starts = null;
function fnStartIndex(addr) {
  if (!_starts) _starts = Int32Array.from(functionStarts()).sort();
  let lo = 0, hi = _starts.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (_starts[mid] <= addr) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}
function fnStartOf(addr) {
  const i = fnStartIndex(addr);
  return i < 0 ? null : _starts[i];
}
function helperReachesTerminal(start, depth, seen = new Set()) {
  if (start === null) return false;
  const memoKey = start + ':' + depth;
  if (_helperMemo.has(memoKey)) return _helperMemo.get(memoKey);
  if (seen.has(start)) return false;
  seen.add(start);
  const end = Math.min(start + 0x1000, TEXT_END);
  const calls = [];
  let found = false;
  for (let a = start; a < end; a += 4) {
    const x = insAt(a);
    if (!x) break;
    if ((x.mn === 'b' || x.mn === 'bl' || x.mn === 'blx') && /^0x[0-9a-f]+$/.test(x.ops[0] ?? '')) {
      const t = parseInt(x.ops[0], 16);
      if (TERMINAL.has(t)) { found = true; break; }
      calls.push(t);
    }
    if (x.mn === 'pop' && (parseRegList(x.ops[0] ?? '') ?? []).includes(15)) break;
    if (x.mn === 'bx' && regNum(x.ops[0]) === 14) break;
  }
  if (!found && depth > 0) {
    for (const t of calls) {
      const fs2 = fnStartOf(t);
      if (fs2 === start) continue;
      if (helperReachesTerminal(fs2, depth - 1, seen)) { found = true; break; }
    }
  }
  _helperMemo.set(memoKey, found);
  return found;
}
export function isRelevantFunction(addr) {
  return helperReachesTerminal(fnStartOf(addr), 2);
}
