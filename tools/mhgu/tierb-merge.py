#!/usr/bin/env python3
"""tierb-merge.py - merge tier B label tables out of the slice reports into one CSV.

Default (no arguments, run from the workspace root) keeps the historical behaviour:
  .tmp/reports-mhgu/tierB-slice-*.md  ->  .tmp/mhgu/inventory/tierb-labels.csv

Extended for W6-P125 (2026-11-06): the slices live in more than one directory and the later
passes name their files tierB2-/tierB3-, which the old glob could not see. Options:

  --dirs        comma list of directories to scan        (default .tmp/reports-mhgu)
  --patterns    comma list of glob patterns per dir      (default tierB-slice-*.md)
  --out         output CSV path                          (default .tmp/mhgu/inventory/tierb-labels.csv)
  --conflicts   optional TSV: vaddr, kept label, other label(s), sources
  --last-wins   on a duplicate vaddr take the LAST row instead of the first (default: first)
  --base        optional CSV to diff against: reports lost rows, label changes and conf changes
                (this is the replacement gate; it used to be quoted from an ad-hoc check)

Conflict policy is explicit on purpose: a duplicate vaddr with two different labels is a
cross-document disagreement (the W6-P123 judgement item), so it is reported, never silently hidden.
"""
import re, glob, os, sys, collections

LABELS = {'online-nex', 'save-data', 'save-io', 'render-gfx', 'audio', 'ui', 'monster-em', 'player-pl',
          'weapon-wp', 'otomo-ot', 'quest', 'item', 'filesystem', 'physics-math', 'kernel-os', 'debug-dev', 'unknown'}
ROW = re.compile(r'\|\s*`?(0x[0-9a-f]+)`?\s*\|\s*([a-z\-]+)\s*\|\s*(leaf|thunk|orchestrator|worker)\s*\|\s*([ABC])\s*\|\s*(.*?)\s*\|')

def opt(name, default):
    if name in sys.argv:
        return sys.argv[sys.argv.index(name) + 1]
    return default

dirs = [d for d in opt('--dirs', '.tmp/reports-mhgu').split(',') if d]
patterns = [p for p in opt('--patterns', 'tierB-slice-*.md').split(',') if p]
out = opt('--out', '.tmp/mhgu/inventory/tierb-labels.csv')
conflicts_out = opt('--conflicts', None)
labels_arg = [x for x in opt('--labels', '').split(',') if x]
base_csv = opt('--base', None)
last_wins = '--last-wins' in sys.argv
policy = opt('--policy', 'last' if last_wins else 'weakest')
if policy not in ('first', 'last', 'weakest'):
    sys.exit('--policy must be first, last or weakest')

if labels_arg and len(labels_arg) != len(dirs):
    sys.exit('--labels needs one name per --dirs entry')
LABEL = {d: (labels_arg[i] if labels_arg else os.path.basename(d)) for i, d in enumerate(dirs)}

paths = []
for d in dirs:
    for pat in patterns:
        paths.extend(glob.glob(os.path.join(d, pat)))
paths = sorted(set(paths))
if not paths:
    sys.exit('no slice files matched %s under %s' % (patterns, dirs))

def read_text(p):
    """Strict UTF-8 first; a slice that is not UTF-8 falls back to GBK with a warning.
    errors='ignore' (the old behaviour) silently dropped bytes, which would corrupt the evidence
    column without any signal - the only human-auditable part of the table."""
    b = open(p, 'rb').read()
    try:
        return b.decode('utf-8')
    except UnicodeDecodeError:
        print('WARN: %s is not UTF-8, decoding as GBK (evidence text may differ from the source)' % p)
        return b.decode('gbk', errors='replace')


rows = []
for p in paths:
    for line in read_text(p).splitlines():
        m = ROW.match(line)
        if not m:
            continue
        lab = m.group(2)
        if lab not in LABELS:
            continue
        # src carries the directory basename: tierB-slice-03/05/08.md exist in BOTH input dirs with
        # different content, so a bare basename cannot identify the origin of a row (2026-11-06).
        src = '%s/%s' % (next(LABEL[d] for d in dirs if p.startswith(d)), os.path.basename(p))
        rows.append((int(m.group(1), 16), lab, m.group(3), m.group(4), m.group(5), src))

# group by vaddr so a disagreement is visible instead of being resolved by file order
by = collections.defaultdict(list)
for r in rows:
    by[r[0]].append(r)
kept, conflicts = {}, []
CONF_RANK = {'A': 0, 'B': 1, 'C': 2}          # A is the strongest claim, C the weakest
for vaddr, group in by.items():
    if last_wins:
        pick = group[-1]
    elif policy == 'first':
        pick = group[0]
    else:
        # Default: the WEAKEST claim wins. Within a file the later row is usually a demotion, and across
        # passes the later pass is the correction, but neither ordering is guaranteed - so publishing the
        # weakest claim is the only choice that cannot resurrect evidence an earlier audit demoted
        # (2026-11-06: first-wins re-promoted 0x18ecb0 to A although pass1 had demoted it to B).
        pick = max(group, key=lambda g: CONF_RANK.get(g[3], 9))
    kept[vaddr] = pick
    labels = {g[1] for g in group}
    confs = {g[3] for g in group}
    if len(labels) > 1 or len(confs) > 1:
        others = sorted(labels - {pick[1]})
        kind = 'both' if (len(labels) > 1 and len(confs) > 1) else ('label' if len(labels) > 1 else 'conf')
        conflicts.append((vaddr, pick[1], others, sorted({g[5] for g in group}), ','.join(sorted(confs)), kind))

rows = list(kept.values())
print('slice files: %d' % len(paths))
print('parsed rows (deduped): %d' % len(rows))
if rows:
    c = collections.Counter(r[1] for r in rows)
    cc = collections.Counter(r[3] for r in rows)
    unk = sum(1 for r in rows if r[1] == 'unknown')
    print('coverage of Tier B: %d / 14863 = %.1f%%' % (len(rows), len(rows) / 14863 * 100))
    print('conf A/B/C: %d/%d/%d' % (cc['A'], cc['B'], cc['C']))
    print('unknown: %d = %.1f%%' % (unk, unk / len(rows) * 100))
    print('label conflicts on the same vaddr: %d' % len(conflicts))
    print('labels:')
    for k, v in c.most_common():
        print('   %-16s %d' % (k, v))
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write('vaddr,label,role,conf,evidence,src\n')
        for r in sorted(rows):
            f.write('0x%x,%s,%s,%s,"%s",%s\n' % (r[0], r[1], r[2], r[3], r[4].replace('"', "'"), r[5]))
    print('wrote ' + out)
    if base_csv:
        import csv as _csv
        old = {}
        with open(base_csv, newline='', encoding='utf-8') as f:
            for row in _csv.DictReader(f):
                v = (row.get('vaddr') or '').strip().lower()
                if v:
                    old[v] = row
        cur = {'0x%x' % r[0]: (r[1], r[3]) for r in rows}
        lost = [v for v in old if v not in cur]
        labch = [(v, old[v]['label'], cur[v][0]) for v in old if v in cur and old[v]['label'] != cur[v][0]]
        confch = [(v, old[v]['conf'], cur[v][1]) for v in old if v in cur and old[v]['conf'] != cur[v][1]]
        print('base %s: %d rows -> lost %d, label changed %d, conf changed %d'
              % (base_csv, len(old), len(lost), len(labch), len(confch)))
        for v, a, b in labch[:10]:
            print('   label %s: %s -> %s' % (v, a, b))
        for v, a, b in confch[:10]:
            print('   conf  %s: %s -> %s' % (v, a, b))
    if conflicts_out:
        with open(conflicts_out, 'w', encoding='utf-8', newline='\n') as f:
            f.write('vaddr\tkept\tother_labels\tsources\tconfs\tkind\n')
            for vaddr, pick, others, srcs, confs, kind in sorted(conflicts):
                f.write('0x%x\t%s\t%s\t%s\t%s\t%s\n' % (vaddr, pick, '|'.join(others), '|'.join(srcs), confs, kind))
        print('wrote ' + conflicts_out)
