import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main } from './dttune-all.mjs';
import { publishArtifacts } from './publish-artifacts.mjs';

const targets = [
  'G:/omp works/MHGU-private/romfs-extract/dttune-all/em001_00.json',
  'G:/omp works/MHGU-private/romfs-extract/dttune-all/em002_00.json',
  'G:/omp works/MHGU/docs/data/json/monster-dttune-index.json',
  'G:/omp works/.tmp/reports-mhgu/dttune-all.md',
];
const normalize = p => String(p).replaceAll('\\', '/');
function record(arc) {
  return { arc, arc_file: `${arc}.arc`, entry: `${arc}_dttune`, size: 1, hp: arc === 'em001_00' ? 123 : 987,
    layout: 'raw', db_values: null, db_match: { hp: null, meat: null, status: null },
    offsets: { hp: '0x38', meat: null, status: null }, notes: [] };
}
function fixture(t, { missing = [], fault } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dttune-publication-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const paths = targets.map((_, i) => path.join(root, `destination-${i}`, 'value.json'));
  const originals = paths.map((_, i) => Buffer.from(`old generation ${i}\n`));
  originals[3] = Buffer.from('outside-before\n<!-- BEGIN GENERATED dttune-all -->\nold generated\n<!-- END GENERATED dttune-all -->\noutside-after\n');
  for (let i = 0; i < paths.length; i++) {
    fs.mkdirSync(path.dirname(paths[i]));
    if (!missing.includes(i)) fs.writeFileSync(paths[i], originals[i]);
  }
  const unlisted = path.join(path.dirname(paths[0]), 'em003_00.json');
  fs.writeFileSync(unlisted, 'unlisted evidence');
  const mapping = new Map(targets.map((p, i) => [p, paths[i]]));
  const map = p => {
    p = normalize(p);
    if (mapping.has(p)) return mapping.get(p);
    for (let i = 0; i < targets.length; i++) {
      const dir = normalize(path.dirname(targets[i]));
      if (p === dir) return path.dirname(paths[i]);
      // Details share a parent; route its transaction directories under destination-0.
      if (p.startsWith(dir + '/.dttune-publish-')) return path.join(path.dirname(paths[i]), p.slice(dir.length + 1));
    }
    if (p === normalize(root) || p.startsWith(normalize(root) + '/')) return p;
    throw new Error(`Unexpected filesystem path: ${p}`);
  };
  const counts = {}, messages = [];
  const invoke = (op, args, fn) => {
    counts[op] = (counts[op] ?? 0) + 1;
    return fault ? fault({ op, count: counts[op], args, proceed: fn }) : fn();
  };
  const io = {
    readdirSync: () => ['em001_00', 'em002_00'].map(s => ({ name: `${s}.arc`, isFile: () => true })),
    readFileSync(p, ...args) {
      if (p === 'fixture.json') return JSON.stringify({ source: 'independent two-stem synthetic domain', stems: ['em001_00', 'em002_00'] });
      return invoke('read', [map(p)], () => fs.readFileSync(map(p), ...args));
    },
    existsSync: p => fs.existsSync(map(p)),
    mkdirSync: (p, ...args) => invoke('mkdir', [map(p)], () => fs.mkdirSync(map(p), ...args)),
    mkdtempSync: p => invoke('mkdtemp', [map(p)], () => fs.mkdtempSync(map(p))),
    writeFileSync: (p, text, ...args) => invoke('write', [map(p), text], () => fs.writeFileSync(map(p), text, ...args)),
    lstatSync: p => invoke('lstat', [map(p)], () => fs.lstatSync(map(p))),
    renameSync: (a, b) => invoke('rename', [map(a), map(b)], () => fs.renameSync(map(a), map(b))),
    unlinkSync: p => invoke('unlink', [map(p)], () => fs.unlinkSync(map(p))),
    rmSync: (p, ...args) => invoke('rm', [map(p)], () => fs.rmSync(map(p), ...args)),
  };
  const deps = { fs: io, log: { log: s => messages.push(s), error: s => invoke('logError', [s], () => messages.push(s)) },
    loadSlotMap: () => [], loadDb: () => ({ monsters: new Map(), damage: new Map(), status: new Map() }),
    loadNames: () => ({ names: new Map(), source: 'synthetic' }), analyseArc: a => record(a.stem) };
  const run = () => main(['--expected-stems', 'fixture.json'], deps);
  const unchanged = () => paths.forEach((p, i) => {
    if (missing.includes(i)) assert.equal(fs.existsSync(p), false, p);
    else assert.deepEqual(fs.readFileSync(p), originals[i], p);
  });
  const workDirs = () => paths.flatMap(p => fs.readdirSync(path.dirname(p)).filter(n => n.startsWith('.dttune-publish-')).map(n => path.join(path.dirname(p), n)));
  return { run, unchanged, paths, originals, messages, workDirs };
}
const failure = () => Object.assign(new Error('injected synchronous IO failure'), { code: 'ENOSPC' });

function assertGeneration(paths) {
  const expected = [['em001_00', 123], ['em002_00', 987]];
  const details = paths.slice(0, 2).map(p => JSON.parse(fs.readFileSync(p)));
  const index = JSON.parse(fs.readFileSync(paths[2]));
  const report = fs.readFileSync(paths[3], 'utf8');
  assert.deepEqual(details.map(r => [r.arc, r.hp]), expected);
  assert.deepEqual(index.map(r => [r.arc, r.hp]), expected);
  const rows = report.split('\n').filter(l => /^\| [01] \| em/.test(l)).map(l => l.split('|').map(s => s.trim()));
  assert.deepEqual(rows.map(r => [r[2], Number(r[6])]), expected);
  assert(report.startsWith('outside-before\n<!-- BEGIN GENERATED dttune-all -->'));
  assert(report.endsWith('<!-- END GENERATED dttune-all -->\noutside-after\n'));
  assert.equal(fs.readFileSync(path.join(path.dirname(paths[0]), 'em003_00.json'), 'utf8'), 'unlisted evidence');
}

test('actual main publishes matching details, index and report with no temporary leftovers', t => {
  const f = fixture(t);
  f.run();
  assertGeneration(f.paths);
  assert.deepEqual(f.workDirs(), []);
  const index = JSON.parse(fs.readFileSync(f.paths[2]));
  index[1].hp = 123;
  fs.writeFileSync(f.paths[2], JSON.stringify(index));
  assert.throws(() => assertGeneration(f.paths));
});
for (let at = 1; at <= 4; at++) {
  test(`partial stage write ${at} preserves every old output byte`, t => {
    const f = fixture(t, { fault: ({ op, count, args, proceed }) => {
      if (op === 'write' && count === at) { fs.writeFileSync(args[0], 'TRUNCATED'); throw failure(); }
      return proceed();
    } });
    assert.throws(f.run, /injected synchronous/);
    f.unchanged();
    assert.deepEqual(f.workDirs(), []);
  });
}
for (let at = 1; at <= 8; at++) {
  test(`rename failure ${at} restores all old targets`, t => {
    const f = fixture(t, { fault: ({ op, count, proceed }) => {
      if (op === 'rename' && count === at) throw failure();
      return proceed();
    } });
    assert.throws(f.run, /injected synchronous/);
    f.unchanged();
    assert.deepEqual(f.workDirs(), []);
  });
}
test('newly created target is removed on later install failure', t => {
  const f = fixture(t, { missing: [0], fault: ({ op, count, proceed }) => {
    if (op === 'rename' && count === 5) throw failure();
    return proceed();
  } });
  assert.throws(f.run, /injected synchronous/);
  f.unchanged();
  assert.deepEqual(f.workDirs(), []);
});
test('report read failure happens before any destination changes', t => {
  const f = fixture(t, { fault: ({ op, proceed }) => { if (op === 'read') throw failure(); return proceed(); } });
  assert.throws(f.run, /injected synchronous/);
  f.unchanged();
  assert.deepEqual(f.workDirs(), []);
});
test('rollback failure preserves recoverable old bytes and reports their location', t => {
  const f = fixture(t, { fault: ({ op, count, args, proceed }) => {
    if (op === 'rename' && count === 4) throw failure();
    if (op === 'rename' && path.basename(args[0]) === 'old' && args[1].includes('destination-1')) throw failure();
    return proceed();
  } });
  assert.throws(f.run, error => {
    assert(error instanceof AggregateError);
    assert.match(error.message, /rollback incomplete/);
    assert.equal(error.errors[0].code, 'ENOSPC');
    assert.equal(error.errors[1].cause.code, 'ENOSPC');
    const retained = f.workDirs();
    assert.equal(retained.length, 1);
    assert(error.message.includes(path.basename(retained[0])));
    assert.deepEqual(fs.readFileSync(path.join(retained[0], 'old')), f.originals[1]);
    return true;
  });
  assert.deepEqual(fs.readFileSync(f.paths[0]), f.originals[0]);
  assert.deepEqual(fs.readFileSync(f.paths[2]), f.originals[2]);
  assert.deepEqual(fs.readFileSync(f.paths[3]), f.originals[3]);
});
test('backup cleanup failure keeps the committed generation and warns with retained path', t => {
  const f = fixture(t, { fault: ({ op, count, proceed }) => { if (op === 'rm' && count === 1) throw failure(); return proceed(); } });
  f.run();
  assertGeneration(f.paths);
  const retained = f.workDirs();
  assert.equal(retained.length, 1);
  assert(f.messages.some(m => m.includes('publication cleanup retained') && m.includes(retained[0])));
});
test('directory destination is rejected without moving its children or earlier files', t => {
  const f = fixture(t);
  fs.unlinkSync(f.paths[1]); fs.mkdirSync(f.paths[1]);
  fs.writeFileSync(path.join(f.paths[1], 'sentinel'), 'keep');
  assert.throws(f.run, /not a regular file/);
  assert.equal(fs.readFileSync(path.join(f.paths[1], 'sentinel'), 'utf8'), 'keep');
  assert.deepEqual(fs.readFileSync(f.paths[0]), f.originals[0]);
  assert.deepEqual(f.workDirs(), []);
});

test('cleanup diagnostic failure cannot interrupt restoration of earlier files', t => {
  const f = fixture(t, { fault: ({ op, count, args, proceed }) => {
    if (op === 'rename' && count === 4) throw failure();
    if (op === 'rm' && count === 1) throw failure();
    if (op === 'logError' && args[0].startsWith('publication cleanup')) throw new Error('diagnostic channel failed');
    return proceed();
  } });
  assert.throws(f.run, error => {
    assert(error instanceof AggregateError);
    assert.equal(error.errors[0].code, 'ENOSPC');
    assert.match(error.message, /old files restored/);
    return true;
  });
  f.unchanged();
});

test('cleanup diagnostic failure after commit explicitly reports the committed state', t => {
  const f = fixture(t, { fault: ({ op, count, args, proceed }) => {
    if (op === 'rm' && count === 1) throw failure();
    if (op === 'logError' && args[0].startsWith('publication cleanup')) throw new Error('diagnostic channel failed');
    return proceed();
  } });
  assert.throws(f.run, /publication committed/);
  assertGeneration(f.paths);
});

test('shared-parent targets stage beside their destination and restore together', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dttune-same-directory-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const a = path.join(root, 'a.json'), b = path.join(root, 'b.json');
  fs.writeFileSync(a, 'old A'); fs.writeFileSync(b, 'old B');
  let renames = 0;
  const io = { ...fs, renameSync(from, to) {
    renames++;
    if (path.basename(to) === 'old') assert.equal(path.dirname(from), path.dirname(path.dirname(to)));
    if (path.basename(from) === 'new') assert.equal(path.dirname(to), path.dirname(path.dirname(from)));
    if (renames === 4) throw failure();
    return fs.renameSync(from, to);
  } };
  assert.throws(() => publishArtifacts([[a, 'new A'], [b, 'new B']], io, { error() {} }), /injected synchronous/);
  assert.equal(fs.readFileSync(a, 'utf8'), 'old A');
  assert.equal(fs.readFileSync(b, 'utf8'), 'old B');
  assert.deepEqual(fs.readdirSync(root).sort(), ['a.json', 'b.json']);
});
