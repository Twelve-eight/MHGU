// ai-reach-misses.mjs — how many (file,state) reset pairs a section-1-only, op14-reachable reader cannot see.
//
// Why: `MHRS/tools/port/ai.mjs` builds its reset map from `sections[1]` and follows `op 0x14` from
// section-0 leaves only (`resetsOf`, ai.mjs:219-238, depth <= 6). Any state whose only `op 0x00`
// appears (a) in another section, or (b) in a section-1 entry that no section-0 op14 chain reaches,
// is invisible to that model. FOR-SE-REPLY §165/§0 record the count as 104 (file,state) pairs over
// 70 files; this tool is its reproduction (a second, independent implementation agreed with it).
//
// Usage:
//   node MHGU/tools/audit/ai-reach-misses.mjs                 # default: the five corpus roots
//   node MHGU/tools/audit/ai-reach-misses.mjs <root> [root...]
// Prints the totals, the split (other sections / unreachable section-1), a positive control and
// examples. Exit 0 on success, 1 if the positive control fails.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseEmc } from '../mhgu/emc.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WS = path.resolve(ROOT, '..');
const DEFAULT_ROOTS = [
  path.join(WS, '.tmp/scratch-t3/cmd'),
  'G:/tmp/Types/X/B/ext',
  path.join(WS, 'MHGU-private/romfs-extract'),
  path.join(WS, '.tmp/scan'),
  path.join(WS, '.tmp/mhgu-scratch'),
];
const DEPTH_LIMIT = 6;           // ai.mjs's own limit
const CONTROL_FILE = 'em043_00'; // section 1 never names state 16; section 14 does, s0 cannot reach entry 85

const roots = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_ROOTS;
const seen = new Map();
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const e of fs.readdirSync(p, { withFileTypes: true })) walk(path.join(p, e.name)); }
  else if (/_cmdtbl(\.|$)|\.3aabba02$/.test(path.basename(p))) {
    const buf = fs.readFileSync(p);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (!seen.has(sha)) seen.set(sha, { file: p, buf });
  }
}
for (const r of roots) walk(r);

const leaves = (ins) => ins.filter((x) => x.kind === 'cmd');

let files = 0, filesWithPairs = 0, pairsOther = 0, pairsUnreach = 0, parseErrors = 0;
const examples = [];
let controlSeen = false, controlOk = false;

for (const { file, buf } of seen.values()) {
  let doc;
  try { doc = parseEmc(buf, file); } catch { parseErrors++; continue; }
  files++;
  const s0 = doc.sections[0]?.entries ?? [];
  const s1 = doc.sections[1]?.entries ?? [];
  const byIdx = new Map(s1.map((e) => [e.index, e]));
  const reach = new Set();
  const queue = [];
  for (const e of s0) for (const x of leaves(e.ins)) if (x.op === 0x14) queue.push([x.args[0], 0]);
  while (queue.length) {
    const [idx, d] = queue.shift();
    if (reach.has(idx) || !byIdx.has(idx) || d > DEPTH_LIMIT) continue;
    reach.add(idx);
    for (const x of leaves(byIdx.get(idx).ins)) if (x.op === 0x14) queue.push([x.args[0], d + 1]);
  }
  const named = new Map(); // state -> Set('s<sec>' | 's1r' | 's1u')
  for (const s of doc.sections) for (const e of s.entries) {
    for (const x of leaves(e.ins)) {
      if (x.op !== 0x00) continue;
      if (!named.has(x.args[0])) named.set(x.args[0], new Set());
      if (s.index === 1) named.get(x.args[0]).add(reach.has(e.index) ? 's1r' : 's1u');
      else named.get(x.args[0]).add(`s${s.index}`);
    }
  }
  let other = 0, unreach = 0;
  for (const [state, where] of named) {
    if (where.has('s1r')) continue;
    const onlyS1 = [...where].every((w) => w.startsWith('s1'));
    if (onlyS1) unreach++; else other++;
    if (file.includes(CONTROL_FILE)) {
      controlSeen = true;
      const unreachEntry = [...where].includes('s1u');
      if (state === 16 && where.has('s14')) controlOk = unreachEntry || where.size === 1;
    }
  }
  pairsOther += other;
  pairsUnreach += unreach;
  if (other || unreach) filesWithPairs++;
  if (examples.length < 10 && (other || unreach)) {
    examples.push(`${path.basename(file).replace(/_cmdtbl.*/, '')}: otherSections=${other} unreachableS1=${unreach}`);
  }
}

console.log(`files deduped ${seen.size}, parsed ${files}, parse errors ${parseErrors}`);
console.log(`(file,state) pairs invisible to ai.mjs's model:`);
console.log(`  named only by other sections:      ${pairsOther}`);
console.log(`  in section-1 entries it cannot reach: ${pairsUnreach}`);
console.log(`  total:                             ${pairsOther + pairsUnreach}`);
console.log(`files with at least one such pair:   ${filesWithPairs}`);
console.log('examples:');
for (const e of examples) console.log(`  ${e}`);
console.log(`control ${CONTROL_FILE} state 16 named by s14 and not by s1: ${controlSeen && controlOk ? 'PASS' : 'FAIL'}`);
if (!(controlSeen && controlOk)) process.exitCode = 1;
