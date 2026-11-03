// cmdtbl layer: decompile the monster's enemy\ncmd_tbl\emNNN_00_cmdtbl and expose the decision tree
// facts the tracer needs - op14 leaves with their op02 weight/case node, section-1 entries, reset pairs.
//
// The EMC decoder is the repo one (G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs, byte-identical grammar to
// MHGU/tools/mhgu/emc.mjs); this module only walks the built tree.
import { parseEmc, buildTree, readArc, inflateEntry } from 'file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs';

export { parseEmc, buildTree };

export function cmdtblFromArc(arcBuf, name, label) {
  const arc = readArc(arcBuf, label);
  const want = name.toLowerCase();
  let entry = arc.entries.find(e => e.name.toLowerCase() === want)
    ?? arc.entries.find(e => e.name.toLowerCase().endsWith('_cmdtbl'));
  if (!entry) throw new Error(`${label}: no ${name} / *_cmdtbl entry`);
  const bytes = inflateEntry(arcBuf, entry, label);
  const doc = parseEmc(bytes, `${label}:${entry.name}`);
  return { doc, entry, bytes };
}

const opName = (op) => '0x' + op.toString(16).padStart(2, '0');

// Walk one entry's tree, collecting op14 leaves and reset leaves with their situation path.
// `path` = array of {op, kind, args}; the innermost enclosing op02 block + case is recorded on op14
// leaves as `weight` (the case operand is the case's own percentage; block totals are 100 in every
// shipped table - the matcher accumulates them at run time, the stored operand is the share).
export function entryFacts(ins, secIndex, entIndex) {
  const { root, errors } = buildTree(ins);
  const op14 = [];
  const resets = [];
  const others = [];
  const visit = (body, path) => {
    for (const n of body) {
      if (n.t === 'leaf') {
        const last = path[path.length - 1];
        if (n.op === 0x14) {
          // innermost op02 ancestor (may be several levels up)
          let w = null;
          for (let i = path.length - 1; i >= 0; i--) {
            if (path[i].op === 0x02 && path[i].kind === 'case') { w = path[i]; break; }
          }
          op14.push({
            sec: secIndex, entry: entIndex, pos: n.pos, n: n.args[0],
            weight: w ? w.args[0] : null,
            block: w ? w.blockPos : null,
            blockTotal: w ? w.total : null,
            casePos: w ? w.pos : null,
            path: path.map(segText).join(' > '),
          });
        } else if (n.op === 0x00) {
          resets.push({
            sec: secIndex, entry: entIndex, pos: n.pos,
            state: n.args[0], variant: n.args[1],
            path: path.map(segText).join(' > '),
          });
        } else {
          others.push({ op: n.op, args: n.args, pos: n.pos, sec: secIndex, entry: entIndex });
        }
        continue;
      }
      // block node
      const total = n.op === 0x02
        ? n.branches.reduce((a, b) => a + (b.kind === 'case' ? (b.args[0] ?? 0) : 0), 0)
        : null;
      for (const br of n.branches) {
        visit(br.body, [...path, { op: n.op, kind: br.kind, args: br.args, pos: n.pos, blockPos: n.pos, total }]);
      }
    }
  };
  visit(root.branches[0].body, []);
  return { op14, resets, others, errors };
}

function segText(p) {
  const name = `op${p.op.toString(16)}`;
  if (p.kind === 'case') return `${name}.case(${p.args.join(',')})`;
  if (p.kind === 'default') return `${name}.default`;
  if (p.kind === 'then') return `${name}.then`;
  if (p.kind === 'root') return 'root';
  return `${name}.${p.kind}`;
}

// Whole-table facts over all 21 sections.
export function docFacts(doc) {
  const sections = [];
  for (const s of doc.sections) {
    const entries = [];
    for (const e of s.entries) {
      const f = entryFacts(e.ins, s.index, e.index);
      entries.push({ index: e.index, length: e.length, offset: e.offset, ...f });
    }
    sections.push({ index: s.index, entries });
  }
  // op14 operand -> the call sites that queue it
  const queued = new Map();
  for (const s of sections) for (const e of s.entries) for (const l of e.op14) {
    if (!queued.has(l.n)) queued.set(l.n, []);
    queued.get(l.n).push({ sec: l.sec, entry: l.entry, pos: l.pos, weight: l.weight, block: l.block, path: l.path });
  }
  // reset pairs: every reset leaf anywhere, tagged with whether its entry is queued by an op14
  const resetPairs = [];
  for (const s of sections) for (const e of s.entries) {
    for (const r of e.resets) {
      const reach = s.index === 0 ? true : (queued.get(e.index)?.length ?? 0) > 0;
      resetPairs.push({
        state: r.state, variant: r.variant, sec: s.index, entry: e.index, pos: r.pos,
        reachable: reach,
      });
    }
  }
  return { sections, queued, resetPairs };
}

// weight summary for one section-1 entry index
export function weightSummary(queued, n) {
  const sites = queued.get(n) ?? [];
  if (!sites.length) return { n: 0, max: null, mean: null, sites: [] };
  const ws = sites.map(s => s.weight ?? 0);
  const max = Math.max(...ws);
  const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
  return { n: ws.length, max, mean, sites };
}
