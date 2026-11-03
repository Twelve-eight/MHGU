// Minimal in-repo replacement for the scratch decoder `tools/gu-moves/lib/trees.mjs` used to import from
// `file:///G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs`. That file lived outside the repository (and outside version
// control), so the committed tracer could not even be imported on another machine.
//
// Only the four names trees.mjs needs are provided here:
//   parseEmc / readArc / inflateEntry  - the repo implementations. The scratch module carried private copies;
//     its own header calls the grammar "byte-identical" to tools/mhgu/emc.mjs, and its arc reader has the same
//     0x0C + 80 B entry layout, so nothing is lost by pointing at the repo code. (gu-moves already reads the same
//     enemy arcs through tools/mhgu/arc.mjs in lib/guarc.mjs, so this is also the reader the tool really used.)
//   buildTree  - copied verbatim from the scratch module. The repo decoder does not build a tree, and trees.mjs
//     walks this exact node shape:
//       leaf   { t:'leaf',  op, args, pos }
//       block  { t:'block', op, args, branches, pos }
//       branch { kind:'root'|'then'|'case'|'default'|'blk?', args, body, pos }
import { parseEmc } from '../../mhgu/emc.mjs';
import { readArc, inflateEntry } from '../../mhgu/arc.mjs';

export { parseEmc, readArc, inflateEntry };

const hex = (v, n = 2) => (v >>> 0).toString(16).padStart(n, '0');

// Copied unchanged from G:/tmp/GUAI/GuaiDecomp/emc-tree.mjs buildTree() (read 2026-11-04), including the
// unused second parameter of ensureBody, so a future diff against the original stays mechanical.
export function buildTree(ins) {
  const root = { t: 'block', op: null, args: [], branches: [], pos: -1, synthetic: true };
  const stack = [{ blk: root, outer: null }];
  let cur = null; // current body array (null until the first branch of a block)
  let blk = root;
  const errors = [];
  root.branches.push({ kind: 'root', args: [], body: [] });
  cur = root.branches[0].body;
  const ensureBody = (pos, op) => {
    if (cur !== null) return;
    // `begin` without a following case/default marker opens the block's then-body directly
    // (gate blocks: 61 xx <then> 61 02 <else> 61 ff).
    blk.branches.push({ kind: 'then', args: [], body: [], pos });
    cur = blk.branches[blk.branches.length - 1].body;
  };
  for (const x of ins) {
    if (x.kind === 'end') { if (stack.length !== 1) errors.push(`unclosed block op${hex(blk.op)} at ${blk.pos}`); continue; }
    if (x.kind === 'case' || x.kind === 'default' || x.kind === 'blk?') {
      const br = { kind: x.kind, args: x.args, body: [], pos: x.pos };
      blk.branches.push(br);
      cur = br.body;
      continue;
    }
    if (x.kind === 'endblock') {
      if (stack.length === 1) { errors.push(`endblock op${hex(x.op)} at ${x.pos} without begin`); continue; }
      if (blk.op !== x.op) errors.push(`endblock op${hex(x.op)} at ${x.pos} closes block op${hex(blk.op)} at ${blk.pos}`);
      const fr = stack.pop();
      blk = fr.blk;
      cur = fr.outer;
      continue;
    }
    ensureBody(x.pos, x.op);
    if (x.kind === 'begin') {
      const node = { t: 'block', op: x.op, args: x.args, branches: [], pos: x.pos };
      cur.push(node);
      stack.push({ blk, outer: cur });
      blk = node;
      cur = null;
      continue;
    }
    cur.push({ t: 'leaf', op: x.op, args: x.args, pos: x.pos });
  }
  if (stack.length !== 1) errors.push(`${stack.length - 1} block(s) left open`);
  return { root, errors };
}
