// Instruction layer for the GU move tracer.
//
// Text comes from the repo decoder (`MHGU/tools/mhgu/arm32.mjs`, same one the mhgu_re_* MCP tools use);
// this module only turns its printed form into a structured record and caches whole windows, because the
// walker asks for instructions in pc order. Nothing here decodes raw words: the printed form is the
// validated representation (see MHGU/docs/reference/re-guide-gu.md section 1).
import { disasm } from 'file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs';

export { disasm };

const BASE = new Set([
  'mov', 'movw', 'movt', 'mvn', 'add', 'sub', 'rsb', 'adc', 'sbc', 'and', 'orr', 'eor', 'bic',
  'cmp', 'cmn', 'tst', 'teq', 'mul', 'mla', 'umull', 'smull',
  'ldr', 'ldrb', 'ldrh', 'ldrsb', 'ldrsh', 'ldrd', 'ldrex',
  'str', 'strb', 'strh', 'strd', 'strex',
  'ldm', 'stm', 'push', 'pop', 'b', 'bl', 'blx', 'bx', 'bxj', 'svc', 'nop', 'adr',
  'vpush', 'vpop', 'vldr', 'vstr', 'vmov', 'vadd', 'vsub', 'vmul', 'vdiv', 'vcmp', 'vcvt',
  'vmrs', 'vmsr', 'vldm', 'vstm', 'vneg', 'vabs', 'vsqrt', 'vcmp', 'vcmpe', 'vmax', 'vmin',
  'ubfx', 'sbfx', 'bfi', 'bfc', 'clz', 'rev', 'rev16', 'revsh', 'sxtb', 'sxth', 'uxtb', 'uxth',
  'sdiv', 'udiv', 'lsl', 'lsr', 'asr', 'ror', 'rrx', 'cps', 'dmb', 'dsb', 'isb', 'wfi', 'wfe',
  'pld', 'pldw', 'swp', 'swpb', 'usat', 'ssat', 'pkhbt', 'pkhtb', 'sel', 'qadd', 'qsub',
]);
const CONDS = ['eq', 'ne', 'cs', 'cc', 'mi', 'pl', 'vs', 'vc', 'hi', 'ls', 'ge', 'lt', 'gt', 'le', 'al', ''];

// One text line -> { addr, word, mn, cond, sets, ops, text }.
// mn = base mnemonic without condition / flag suffix; ops = raw operand strings.
export function parseLine(line) {
  const m = /^([0-9a-f]{8}): ([0-9a-f]{8})  (.*)$/.exec(line);
  if (!m) return null;
  const addr = parseInt(m[1], 16);
  const word = parseInt(m[2], 16) >>> 0;
  let rest = m[3];
  const cut = rest.indexOf(' ; ');
  const text = cut < 0 ? rest : rest.slice(0, cut);
  const sp = text.indexOf(' ');
  const tok = sp < 0 ? text : text.slice(0, sp);
  const operands = sp < 0 ? '' : text.slice(sp + 1);
  let head = tok;
  let cond = '';
  let sets = false;
  let dtype = '';
  const dot = head.indexOf('.');
  if (dot > 0) { dtype = head.slice(dot + 1); head = head.slice(0, dot); }
  for (const c of CONDS) { // "vmov.f32eq"-style does not occur, but "vcmpe.f32" does
    if (!c) continue;
    if (head.endsWith(c) && BASE.has(head.slice(0, -c.length))) { cond = c; head = head.slice(0, -c.length); break; }
  }
  if (!BASE.has(head)) {
    // trailing "s" (flag setting) then a condition suffix, or just a condition
    let h = head;
    if (h.endsWith('s') && BASE.has(h.slice(0, -1))) { sets = true; h = h.slice(0, -1); }
    let found = false;
    for (const c of CONDS) {
      if (!c) continue;
      if (h.endsWith(c) && BASE.has(h.slice(0, -c.length))) { cond = c; h = h.slice(0, -c.length); found = true; break; }
    }
    if (!found) {
      // "movs" without condition was handled above; "vcmpe" style aliases stay as-is
      if (h.endsWith('s') && BASE.has(h.slice(0, -1))) { sets = true; h = h.slice(0, -1); }
      else if (h.endsWith('e') && BASE.has(h.slice(0, -1))) { h = h.slice(0, -1); } // vcmpe -> vcmp
    }
    head = h;
  }
  const ops = operands.trim() === '' ? [] : splitOps(operands);
  return { addr, word, mn: head, cond, sets, ops, text };
}

// split on top-level commas
function splitOps(s) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
  }
  out.push(s.slice(start).trim());
  return out.filter(x => x !== '');
}

const REGRE = /^(r\d+|sp|lr|pc)$/;
export function regNum(s) {
  s = s.trim();
  if (/^r\d+$/.test(s)) return +s.slice(1);
  if (s === 'sp') return 13;
  if (s === 'lr') return 14;
  if (s === 'pc') return 15;
  return -1;
}
export function isReg(s) { return REGRE.test(s.trim()); }

// "#123" | "#0x1f" | "#-1" | "#0xffffffff"
export function immVal(s) {
  s = s.trim();
  if (!s.startsWith('#')) return null;
  let body = s.slice(1);
  let neg = false;
  if (body.startsWith('-')) { neg = true; body = body.slice(1); }
  let v;
  if (/^0x[0-9a-f]+$/i.test(body)) v = parseInt(body, 16);
  else if (/^\d+$/.test(body)) v = parseInt(body, 10);
  else return null;
  if (neg) v = -v;
  return v >>> 0 === v ? v : v | 0;
}

// "[r5, r0, lsl #2]!" -> { base:5, off:null, idx:0, shift:2, writeback:true, post:false }
export function parseMem(s) {
  s = s.trim();
  const m = /^\[(.*)\](!?)$/.exec(s);
  if (!m) return null;
  const writeback = m[2] === '!';
  const inner = m[1];
  const parts = splitOps(inner);
  if (!parts.length) return null;
  const base = regNum(parts[0]);
  if (base < 0) return null;
  let off = null, idx = null, shift = 0;
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const iv = immVal(p);
    if (iv !== null) { off = iv; continue; }
    const rm = regNum(p);
    if (rm >= 0) { idx = rm; continue; }
    const sm = /^(lsl|lsr|asr|ror)\s+(#\d+|#0x[0-9a-f]+|\w+)$/i.exec(p);
    if (sm) {
      const sh = immVal(sm[2]);
      if (sh !== null) shift = sh;
      else shift = { reg: regNum(sm[2]) };
    }
  }
  return { base, off, idx, shift, writeback, post: false };
}

// register list "{r4, r5, r11, lr}" -> [4,5,11,14]
export function parseRegList(s) {
  s = s.trim();
  const m = /^\{(.*)\}$/.exec(s);
  if (!m) return null;
  const out = [];
  for (const p of splitOps(m[1])) {
    const range = /^(r\d+)-(r\d+)$/.exec(p);
    if (range) {
      const a = regNum(range[1]), b = regNum(range[2]);
      for (let r = a; r <= b; r++) out.push(r);
      continue;
    }
    const r = regNum(p);
    if (r >= 0) out.push(r);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// window cache
// ---------------------------------------------------------------------------------------------
const WINDOW = 96;
const cache = new Map(); // addr -> ins

export function insAt(addr, allowMiss = false) {
  let x = cache.get(addr);
  if (x) return x;
  if (addr < 0) return null;
  const txt = disasm(addr, WINDOW);
  if (!txt) return null;
  for (const line of txt.split('\n')) {
    const ins = parseLine(line);
    if (ins) cache.set(ins.addr, ins);
  }
  x = cache.get(addr);
  if (!x && !allowMiss) return null;
  return x ?? null;
}

export function insRange(start, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = insAt(start + i * 4);
    if (!x) break;
    out.push(x);
  }
  return out;
}

export const hex = (v, n = 8) => (v >>> 0).toString(16).padStart(n, '0');
export const v = (x) => '0x' + hex(x);
