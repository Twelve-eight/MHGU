#!/usr/bin/env node
// gu-moves.mjs - one canonical GU move tracer: every motion a monster's EMC decision tree can
// select, per (L1 state, L2 variant), with the attack rows, shell spawns and frame counts.
//
//   node G:/tmp/GuMoves/gu-moves.mjs <gu_em_sub> [outdir] [--host emNNN] [--all-variants] [--quiet]
//   (repo copy: G:/omp works/MHGU/tools/gu-moves/gu-moves.mjs - byte-identical)
//
// Pipeline
//   (a) decompile the monster's cmdtbl from its arc (enemy\cmd_tbl\emNNN_SS_cmdtbl):
//       op14 leaves with their op02 weight/case node, section-1 entries, reset(state,variant) pairs
//       per entry, reachability (entries no op14 queues = unreachable);
//   (b) locate the class (KB binding em -> class verified against the binary), its L1 dispatcher
//       (`movw rX,#0x73e0` idiom + 18-word table), the class body [ctor, next ctor) and each
//       state's L2 dispatcher (index base / inclusive bound / table base);
//   (c) per (state, variant) a path-sensitive walk of the case body -> handler that follows bl/b
//       callees inside the class body and shared helpers, resolves r1 at every play-family call to
//       0xafda4/0xaff40/0xaff48/0xaffac (constants, movw/movt, conditional movs with their gate,
//       *every* constant address of a register-held table base, record-table loads with the table
//       index), records attack-row arms (0x7df94 / 0x7dc2c: r1 = kind, r2 = row) and shell spawns
//       (0x48c4f0);
//   (d) frames from the monster's own arc LMTs (motion id = bank*256 + index);
//   (e) attackdata rows decoded with the corrected layout (records at 0x10 + i*0x20).
//
// Outputs: variants.tsv, motions.tsv, moves.tsv, census.tsv, facts.json in <outdir>.
// `handler` is the state's L2 dispatcher head (constant for every variant of that state);
// `case_body` is the per-variant start the walk used (L2 table entry, or `handler` for a
// compare-chain dispatcher) - recompute nothing, the column is the address to disassemble.
// `status` separates "nothing requested" (`no-motion`, `no-motion(stub)` = only the report stub was
// reached) from "a request was seen but its id could not be resolved" (`no-motion(unresolved)`);
// moves.tsv additionally lists up to three `unresolved-motion@<site>` per row.
import fs from 'node:fs';
import path from 'node:path';
import { rd32 } from 'file:///G:/omp works/MHGU/tools/mhgu/arm32.mjs';
import { insAt, hex, parseMem, immVal, regNum } from './lib/arm.mjs';
import { ClassIndex, findL1, findL2, resolveEntryStub } from './lib/classinfo.mjs';
import { docFacts } from './lib/trees.mjs';
import { walk } from './lib/machine.mjs';
import { monsterArcs, loadCmdtbl, loadLmts, loadAttackdata } from './lib/guarc.mjs';

const OUT_ROOT = 'G:/tmp/GuMoves/out';

function parseArgs(argv) {
  const pos = [];
  const opt = { host: null, allVariants: false, quiet: false, maxSteps: 200000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--host') opt.host = argv[++i];
    else if (a === '--all-variants') opt.allVariants = true;
    else if (a === '--quiet') opt.quiet = true;
    else if (a === '--max-steps') opt.maxSteps = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else pos.push(a);
  }
  if (!pos.length) throw new Error('usage: gu-moves.mjs <gu_em_sub> [outdir] [--host emNNN] [--all-variants]');
  return { emSub: pos[0], outdir: pos[1] ?? path.join(OUT_ROOT, pos[0]), opt };
}

// ---------------------------------------------------------------------------------------------
// reset pairs -> one record per (state, variant)
// ---------------------------------------------------------------------------------------------
function pairIndex(facts) {
  const byPair = new Map();
  for (const r of facts.resetPairs) {
    const key = `${r.state}:${r.variant}`;
    let p = byPair.get(key);
    if (!p) byPair.set(key, p = {
      state: r.state, variant: r.variant, entries: [], reachable: false, secs: new Set(),
    });
    p.reachable = p.reachable || r.reachable;
    p.secs.add(r.sec);
    if (r.sec === 1) p.entries.push({ entry: r.entry, pos: r.pos });
  }
  return byPair;
}

function weightsFor(facts, p) {
  // every op14 call site that reaches an entry carrying this reset contributes its weight
  const ws = [];
  const seen = new Set();
  for (const e of p.entries) {
    for (const site of facts.queued.get(e.entry) ?? []) {
      const k = `${site.sec}.${site.entry}@${site.pos}:${site.weight}`;
      if (seen.has(k)) continue;
      seen.add(k);
      ws.push({ entry: e.entry, weight: site.weight ?? 0, sec: site.sec, at: site.pos });
    }
  }
  if (!ws.length) return { n: 0, max: null, mean: null, sites: [], text: '-' };
  ws.sort((a, b) => b.weight - a.weight || a.entry - b.entry);
  const max = ws[0].weight;
  const mean = ws.reduce((a, b) => a + b.weight, 0) / ws.length;
  const text = ws.slice(0, 4).map(w => `op14(${w.entry})=${w.weight}%@s${w.sec}.e${w.entry}`).join(' ');
  return { n: ws.length, max, mean, sites: ws, text };
}

// ---------------------------------------------------------------------------------------------
// per-pair walk
// ---------------------------------------------------------------------------------------------
function traceePair(p, ctx) {
  const { klass, l1, states, facts, opt, lmt } = ctx;
  const out = {
    pair: p, handler: null, handlerKind: null, caseBody: null, motions: [], arms: [], shells: [],
    unresolved: [], unresolvedMotion: [], indirect: [], escaped: [], stub: 0, steps: 0,
    overflow: false, note: [], status: null,
  };
  const st = p.state;
  if (st < 0 || st > 17) { out.status = 'out-of-range-state'; return out; }
  const entry = states.get(st);
  if (!entry) { out.status = 'no-l1-entry'; return out; }
  if (entry.kind === 'shared') { out.status = `l1-shared(${entry.note})`; out.handler = entry.target; return out; }
  const l2 = entry.l2;
  if (!l2) { out.status = 'no-l2'; return out; }
  out.handler = l2.head;
  out.handlerKind = l2.kind;
  let start;
  if (l2.kind === 'table') {
    const idx = p.variant - l2.indexBase;
    if (idx < 0 || idx >= l2.count) { out.status = 'out-of-range-variant'; return out; }
    const w = rd32(l2.tableBase + idx * 4);
    start = (l2.tableBase + w) >>> 0;
    out.caseBody = start;
    if (l2.defaultAddr !== null && start === l2.defaultAddr) out.note.push('l2-default');
  } else {
    start = l2.head;
    out.caseBody = start;
  }
  const events = [];
  const r = walk({ start, klass, state: p.state, variant: p.variant, events, maxSteps: opt.maxSteps });
  out.steps = r.steps;
  out.overflow = r.overflow;
  if (r.overflow) out.note.push(`step-budget(${r.steps})`);
  const motionMap = new Map();
  for (const e of events) {
    if (e.t === 'motion') {
      if (e.id === null) {
        const u = { site: e.site, why: e.src ?? 'r1 unknown', kind: 'motion' };
        out.unresolved.push(u); out.unresolvedMotion.push(u); continue;
      }
      if (!(e.id >= 0 && e.id < 0x1000)) {
        const u = { site: e.site, why: `implausible id 0x${hex(e.id)}`, kind: 'motion' };
        out.unresolved.push(u); out.unresolvedMotion.push(u); continue;
      }
      let m = motionMap.get(e.id);
      if (!m) motionMap.set(e.id, m = { id: e.id, sites: new Set(), gates: new Set(), srcs: new Set() });
      m.sites.add(e.site);
      if (e.gate) m.gates.add(e.gate);
      m.srcs.add(e.src);
    } else if (e.t === 'arm') {
      if (e.row === null || e.kind === null) { out.unresolved.push({ site: e.site, why: 'row/kind unknown' }); continue; }
      out.arms.push(e);
    } else if (e.t === 'shell') {
      out.shells.push(e);
    } else if (e.t === 'unres') {
      out.unresolved.push(e);
    } else if (e.t === 'indirect') {
      out.indirect.push(e);
    } else if (e.t === 'escaped') {
      out.escaped.push(e);
    } else if (e.t === 'stub') {
      out.stub++;
    }
  }
  out.motions = [...motionMap.values()].sort((a, b) => a.id - b.id);
  // dedupe arms by (kind,row,gate) keeping the first site
  const armSeen = new Map();
  for (const a of out.arms) {
    const k = `${a.kind}/${a.row}/${a.gate}`;
    if (!armSeen.has(k)) armSeen.set(k, a);
  }
  out.arms = [...armSeen.values()];
  out.shellSeen = new Map();
  for (const s of out.shells) out.shellSeen.set(s.site, s);
  out.shells = [...out.shellSeen.values()];
  // status
  if (out.status) return out;
  if (!out.motions.length) {
    // F2: "nothing requested" and "request seen but not resolvable" must not share a label
    out.status = out.unresolvedMotion.length ? 'no-motion(unresolved)'
      : out.stub ? 'no-motion(stub)' : 'no-motion';
  }
  else if (out.motions.every(m => !lmt.has(m.id))) out.status = 'GU-absent';
  else if (out.motions.some(m => !lmt.has(m.id))) out.status = 'partial-GU-absent';
  else out.status = 'NEW-missing';
  return out;
}

// ---------------------------------------------------------------------------------------------
// Class-body motion-request census (the GuMoveInventory em001 anchor: 250 sites / 118 ids).
// Plain linear scan of [ctor, nextCtor): every b/bl into the play family, id = nearest preceding
// write to r1 (mov/movw/movt/mov+shift/ldr-literal). This is deliberately *not* path-sensitive -
// it exists to check the per-variant walk against the coarse census.
// ---------------------------------------------------------------------------------------------
function census(klass) {
  const PLAY_T = new Set([0xafda4, 0xaff40, 0xaff48, 0xaffac]);
  const sites = [];
  for (let a = klass.ctor; a < klass.nextCtor; a += 4) {
    const x = insAt(a);
    if (!x) continue;
    if (!((x.mn === 'b' || x.mn === 'bl' || x.mn === 'blx') && /^0x[0-9a-f]+$/.test(x.ops[0] ?? ''))) continue;
    const t = parseInt(x.ops[0], 16);
    if (!PLAY_T.has(t)) continue;
    // nearest preceding write to r1
    let id = null, src = 'none';
    for (let k = 1; k <= 16; k++) {
      const y = insAt(a - 4 * k);
      if (!y) break;
      if (y.mn === 'mov' && regNum(y.ops[0]) === 1) {
        const v = immVal(y.ops[1]);
        if (v !== null) { id = v; src = y.cond ? 'cond' : 'mov'; } else src = 'reg';
        break;
      }
      if (y.mn === 'movw' && regNum(y.ops[0]) === 1) {
        const v = immVal(y.ops[1]);
        if (v !== null) { id = v; src = y.cond ? 'cond' : 'movw'; } else src = 'reg';
        break;
      }
      if (y.mn === 'ldr' && regNum(y.ops[0]) === 1 && y.ops.length === 2) {
        const mm = parseMem(y.ops[1]);
        if (mm && mm.base === 15 && mm.off !== null) { id = rd32(y.addr + 8 + mm.off); src = 'lit'; } else src = 'mem';
        break;
      }
    }
    sites.push({ site: a, fn: t, id, src });
  }
  const ids = new Set(sites.filter(s => s.id !== null && s.id >= 0 && s.id < 0x1000).map(s => s.id));
  for (const s of sites) if (s.id !== null && !(s.id >= 0 && s.id < 0x1000)) s.src += ':implausible';
  return { sites, ids };
}

// ---------------------------------------------------------------------------------------------
function rowText(kind, row, atk) {
  const list = row >= 1000 ? atk.variant : atk.base;
  const idx = row >= 1000 ? row - 1000 : row;
  const tag = row >= 1000 ? 'second' : 'first';
  if (!list) return `${tag}#${row}=?`;
  const rec = list.recs[idx];
  if (!rec) return `${tag}#${row}=out-of-count(${list.count})`;
  if (rec.start === 0xffff) return `${tag}#${row}=separator`;
  return `${tag}#${row}=${rec.dmg}/${rec.react}/0x${(rec.attr >>> 0).toString(16)}`;
}

// ---------------------------------------------------------------------------------------------
// host join (optional): the deployed Rise FSM rows for one host monster
// ---------------------------------------------------------------------------------------------
function loadHost(hostEm) {
  const f = 'G:/omp works/MHRS-private/kb/rise-fsm-state-clip-all.tsv';
  if (!fs.existsSync(f)) return null;
  const lines = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
  const head = lines[0].split('\t');
  const col = (n) => head.indexOf(n);
  const iM = col('monster'), iBank = col('bank'), iMot = col('motion_id'), iFrames = col('frames'), iPath = col('path');
  const rows = [];
  for (const l of lines.slice(1)) {
    const c = l.split('\t');
    if (c[iM] !== hostEm) continue;
    rows.push({ bank: +c[iBank], motion: +c[iMot], frames: +c[iFrames], path: c[iPath] });
  }
  if (!rows.length) return null;
  const bySlot = new Map();
  const byFrames = new Map();
  for (const r of rows) {
    const k = r.bank * 256 + r.motion;
    if (!bySlot.has(k)) bySlot.set(k, r);
    if (r.frames && !byFrames.has(r.frames)) byFrames.set(r.frames, r);
  }
  return { host: hostEm, rows, bySlot, byFrames };
}

function hostStatus(motion, frames, host) {
  if (!host) return { state: '-', slot: '-', status: null };
  const s = host.bySlot.get(motion);
  if (s) return { state: s.path, slot: `${s.bank}:${s.motion}`, status: 'host-slot-occupied' };
  if (frames && host.byFrames.has(frames + 1)) {
    const f = host.byFrames.get(frames + 1);
    return { state: f.path, slot: `${f.bank}:${f.motion}`, status: `host-frames-match(${frames + 1})` };
  }
  return { state: '-', slot: '-', status: 'NEW-missing' };
}

// ---------------------------------------------------------------------------------------------
function main() {
  const { emSub, outdir, opt } = parseArgs(process.argv.slice(2));
  const t0 = Date.now();
  const arcs = monsterArcs(emSub);
  const { doc } = loadCmdtbl(arcs, emSub);
  const facts = docFacts(doc);
  const lmt = loadLmts(arcs, emSub);
  const atk = loadAttackdata(arcs, emSub);
  const idx = new ClassIndex();
  const klass = idx.classFor(emSub);
  const l1 = findL1(klass);
  if (!l1) throw new Error(`${klass.name}: no L1 dispatcher found near 0x${hex(klass.l1disp)}`);
  const states = new Map();
  for (let st = 0; st < 18; st++) {
    const target = (l1.tableBase + rd32(l1.tableBase + st * 4)) >>> 0;
    const resolved = resolveEntryStub(target, klass);
    const inBodyTarget = resolved >= klass.ctor && resolved < klass.nextCtor;
    if (!inBodyTarget) { states.set(st, { target, kind: 'shared', note: `0x${hex(target)}` }); continue; }
    const l2 = findL2(target, klass);
    states.set(st, { target, resolved, kind: l2.kind, l2 });
  }
  const host = opt.host ? loadHost(opt.host) : null;

  const byPair = pairIndex(facts);
  if (opt.allVariants) {
    for (const [st, e] of states) {
      if (e.kind !== 'table') continue;
      for (let v = e.l2.indexBase; v <= e.l2.max; v++) {
        const k = `${st}:${v}`;
        if (!byPair.has(k)) byPair.set(k, { state: st, variant: v, entries: [], reachable: false, secs: new Set() });
      }
    }
  }

  const results = [];
  for (const p of [...byPair.values()].sort((a, b) => a.state - b.state || a.variant - b.variant)) {
    const r = traceePair(p, { klass, l1, states, facts, opt, lmt });
    r.weight = weightsFor(facts, p);
    r.entryList = [...new Set(p.entries.map(e => e.entry))].sort((a, b) => a - b);
    results.push(r);
  }

  // ---- motions.tsv aggregation
  const motionRows = new Map();
  for (const r of results) {
    for (const m of r.motions) {
      let row = motionRows.get(m.id);
      if (!row) motionRows.set(m.id, row = { id: m.id, variants: new Set(), weight: 0, maxw: 0, sites: new Set(), gates: new Set() });
      row.variants.add(`${r.pair.state}:${r.pair.variant}`);
      if (r.weight.max !== null) { row.weight += r.weight.max; row.maxw = Math.max(row.maxw, r.weight.max); }
      for (const s of m.sites) row.sites.add(s);
      for (const g of m.gates) row.gates.add(g);
    }
  }

  // ---- write
  fs.mkdirSync(outdir, { recursive: true });
  const W = (f, rows) => fs.writeFileSync(path.join(outdir, f), rows.join('\n') + '\n');

  const vLines = ['state\tvariant\thandler\tcase_body\tmotions\trows\tshells\treachable\tweight\tstatus\tsteps'];
  for (const r of results) {
    const mot = r.motions.map(m => {
      const tags = [];
      if (m.gates.size) tags.push([...m.gates].join('|'));
      // table-read candidates: show that the id came from a constant data table (em060 0x16a6504)
      const tbl = [...m.srcs].filter(x => x.startsWith('tbl:'));
      if (tbl.length) tags.push('tbl');
      const g = tags.length ? `[${tags.join('|')}]` : '';
      return `${m.id}@0x${hex([...m.sites][0])}${g}`;
    }).join(' ');
    const arms = r.arms.map(a => `${a.row}/${a.kind}@0x${hex(a.site)}${a.gate ? `[${a.gate}]` : ''}`).join(' ');
    const shells = r.shells.map(s => `0x${hex(s.site)}`).join(' ');
    vLines.push([
      r.pair.state, r.pair.variant, r.handler === null ? '-' : `0x${hex(r.handler)}`,
      r.caseBody === null ? '-' : `0x${hex(r.caseBody)}`,
      mot || '-', arms || '-', shells || '-', r.pair.reachable ? 1 : 0,
      r.weight.max === null ? '-' : `max=${r.weight.max}% n=${r.weight.n}`,
      r.status, r.steps,
    ].join('\t'));
  }
  W('variants.tsv', vLines);

  const mLines = ['motion\tlmt\tframes\tvariants\ttotal_weight\tmax_weight\tgu'];
  for (const row of [...motionRows.values()].sort((a, b) => a.id - b.id)) {
    const l = lmt.get(row.id);
    mLines.push([
      row.id, l ? `${l.entry}#${l.index}` : `bank${row.id >> 8}#absent`,
      l ? l.frames : '-', [...row.variants].join(','),
      Math.round(row.weight * 10) / 10, row.maxw, l ? 'shipped' : 'GU-absent',
    ].join('\t'));
  }
  W('motions.tsv', mLines);

  const hdr = ['gu_variant', 'gu_handler', 'gu_motions', 'gu_weight_by_situation', 'gu_damage_rows',
    'gu_shells', 'rise_state', 'rise_slot', 'status', 'source', 'note'];
  const mLines2 = [hdr.join('\t')];
  for (const r of results) {
    const mot = r.motions.map(m => {
      const l = lmt.get(m.id);
      const g = m.gates.size ? `[${[...m.gates].join('|')}]` : '';
      return `${m.id}(${l ? `${l.entry}#${l.index}:${l.frames}f` : 'absent'})${g}`;
    }).join(' ');
    const arms = r.arms.map(a => rowText(a.kind, a.row, atk)).join(' ');
    const hs = r.motions.map(m => hostStatus(m.id, lmt.get(m.id)?.frames, host));
    const riseState = host ? [...new Set(hs.map(h => h.state))].join(' ') : '-';
    const riseSlot = host ? [...new Set(hs.map(h => h.slot))].join(' ') : '-';
    let status = r.status;
    if (host && status === 'NEW-missing') status = hs.map(h => h.status).filter(Boolean).join(' ') || status;
    const src = r.entryList.length ? `op14(${r.entryList.join(',')})@s1` : `s0`;
    const note = [
      `L1 st${r.pair.state}`, r.handlerKind ? `L2 ${r.handlerKind}` : '',
      ...r.note,
      r.unresolvedMotion.length ? `unresolved-motion@${r.unresolvedMotion.slice(0, 3).map(u => '0x' + hex(u.site)).join(',')}` : '',
      r.unresolved.length - r.unresolvedMotion.length > 0 ? `${r.unresolved.length - r.unresolvedMotion.length} unresolved(other)` : '',
      r.indirect.length ? `${r.indirect.length} indirect` : '',
      r.escaped.length ? `${r.escaped.length} escaped` : '',
    ].filter(Boolean).join('; ');
    mLines2.push([
      `${r.pair.state}:${r.pair.variant}`, r.handler === null ? '-' : `0x${hex(r.handler)}`,
      mot || '-', r.weight.text, arms || '-',
      r.shells.length ? r.shells.map(s => `0x${hex(s.site)}`).join(' ') : '-',
      riseState, riseSlot, status, src, note,
    ].join('\t'));
  }
  W('moves.tsv', mLines2);

  const cen = census(klass);
  W('census.tsv', ['site	fn	id	src', ...cen.sites.map(x => [`0x${hex(x.site)}`, `0x${hex(x.fn)}`, x.id ?? '-', x.src].join('\t'))]);

  const factOut = {
    em: emSub, class: klass.name, classBody: klass.body.map(x => '0x' + hex(x)),
    l1: { head: '0x' + hex(l1.head), table: '0x' + hex(l1.tableBase), default: l1.defaultAddr === null ? null : '0x' + hex(l1.defaultAddr) },
    states: [...states.entries()].map(([st, e]) => ({
      state: st, target: '0x' + hex(e.target), kind: e.kind,
      l2: e.l2 && e.l2.kind === 'table' ? { head: '0x' + hex(e.l2.head), base: e.l2.indexBase, max: e.l2.max, count: e.l2.count, table: '0x' + hex(e.l2.tableBase) } : (e.l2 ? { head: '0x' + hex(e.l2.head), kind: e.l2.kind } : null),
    })),
    counts: {
      cmdtblSections: doc.sections.length,
      op14Leaves: [...facts.queued.values()].reduce((a, b) => a + b.length, 0),
      queuedEntries: facts.queued.size,
      resetPairs: facts.resetPairs.length,
      pairsWalked: results.length,
      lmtMotions: lmt.size,
      census: { sites: cen.sites.length, ids: cen.ids.size },
      attackdata: { base: atk.base ? { count: atk.base.count, separator: atk.base.separator } : null, variant: atk.variant ? { count: atk.variant.count } : null },
    },
    arcs: arcs.map(a => a.name),
    ms: 0,
  };
  factOut.ms = Date.now() - t0;
  fs.writeFileSync(path.join(outdir, 'facts.json'), JSON.stringify(factOut, null, 1) + '\n');

  if (!opt.quiet) {
    const motCount = [...motionRows.values()].filter(r => lmt.has(r.id)).length;
    console.log(`${emSub}: class ${klass.name}; ${results.length} (state,variant) pairs; ` +
      `${motionRows.size} motion ids (${motCount} shipped); ${facts.resetPairs.length} reset pairs; ` +
      `census ${cen.sites.length} sites / ${cen.ids.size} ids; ` +
      `${Date.now() - t0} ms -> ${outdir}`);
  }
}

main();
