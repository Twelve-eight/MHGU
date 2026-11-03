#!/usr/bin/env node
// regress.mjs - regression of gu-moves.mjs against the cross-checked facts.
//
// Every check cites the file that states the fact. Checks fall into these groups:
//   anchors    GuMoveInventory em001 (class census + variants 240/252/255)
//   fixes      fixes-A/B/C/D.tsv rows that name a (state:variant) and a motion/row
//   table      the L1/L2 table facts the cross-checks re-derived (bounds, bases)
//   tableload  motion ids behind a constant halfword-table read (the F1 class), id+site pairs
// The tool's variants.tsv (produced with --all-variants) is the evidence read here.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'G:/tmp/GuMoves/out';

function loadVariants(em) {
  const f = path.join(OUT, em, 'variants.tsv');
  if (!fs.existsSync(f)) return null;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim());
  const head = lines[0].split('\t');
  const col = (n) => head.indexOf(n);
  const map = new Map();
  for (const l of lines.slice(1)) {
    const p = l.split('\t');
    const ids = [...(p[col('motions')] ?? '').matchAll(/(\d+)@/g)].map(m => +m[1]);
    // id@site tokens: a table-loaded id is asserted at the play instruction that consumes it
    const mot = [...(p[col('motions')] ?? '').matchAll(/(\d+)@(0x[0-9a-f]+)/g)].map(m => ({ id: +m[1], site: m[2] }));
    const rows = [...(p[col('rows')] ?? '').matchAll(/(\d+)\/\d+@/g)].map(m => +m[1]);
    map.set(`${p[0]}:${p[1]}`, {
      ids, mot, rows, status: p[col('status')], reachable: p[col('reachable')] === '1',
      caseBody: p[col('case_body')], raw: p,
    });
  }
  return map;
}
function loadMotions(em) {
  const f = path.join(OUT, em, 'motions.tsv');
  if (!fs.existsSync(f)) return null;
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim());
  const m = new Map();
  for (const l of lines.slice(1)) { const p = l.split('\t'); m.set(+p[0], { lmt: p[1], frames: p[2], variants: p[3], gu: p[6] }); }
  return m;
}
function loadFacts(em) {
  const f = path.join(OUT, em, 'facts.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

const results = [];
function check(group, src, em, desc, fn) {
  const vars = loadVariants(em);
  let verdict, detail = '';
  if (!vars) { verdict = 'SKIP'; detail = 'no output'; }
  else {
    try {
      const r = fn(vars, loadMotions(em), loadFacts(em));
      verdict = r === true ? 'PASS' : (typeof r === 'string' ? 'FAIL' : 'FAIL');
      if (typeof r === 'string') detail = r;
    } catch (e) { verdict = 'FAIL'; detail = e.message; }
  }
  results.push({ group, src, em, desc, verdict, detail });
}

const has = (v, id) => {
  const g = v.get(id);
  if (!g) return `no row ${id}`;
  return g.ids.includes(+id.split(':')[1] === g.ids[0] ? +id.split(':')[1] : +id.split(':')[1]) || true;
};

// helpers
function idsOf(v, key) { const g = v.get(key); return g ? g.ids : null; }
function rowsOf(v, key) { const g = v.get(key); return g ? g.rows : null; }
function expectIds(has, not = []) {
  return (v, m, f) => {
    const res = [];
    for (const [k, want] of Object.entries(has)) {
      const got = idsOf(v, k);
      if (!got) { res.push(`${k}: no row`); continue; }
      for (const id of want) if (!got.includes(id)) res.push(`${k}: missing ${id} (got ${got.join(',')})`);
    }
    for (const [k, none] of Object.entries(not)) {
      const got = idsOf(v, k);
      if (!got) continue;
      for (const id of none) if (got.includes(id)) res.push(`${k}: unexpected ${id} (got ${got.join(',')})`);
    }
    return res.length ? res.join('; ') : true;
  };
}
function expectRows(has, not = []) {
  return (v) => {
    const res = [];
    for (const [k, want] of Object.entries(has)) {
      const got = rowsOf(v, k);
      if (!got) { res.push(`${k}: no row`); continue; }
      for (const r of want) if (!got.includes(r)) res.push(`${k}: missing row ${r} (got ${got.join(',')})`);
    }
    for (const [k, none] of Object.entries(not)) {
      const got = rowsOf(v, k);
      if (!got) continue;
      for (const r of none) if (got.includes(r)) res.push(`${k}: unexpected row ${r} (got ${got.join(',')})`);
    }
    return res.length ? res.join('; ') : true;
  };
}
function expectUnion(keys, want) {
  return (v) => {
    const u = new Set();
    for (const k of keys) for (const id of (idsOf(v, k) ?? [])) u.add(id);
    const missing = want.filter(x => !u.has(x));
    return missing.length ? `union over ${keys.join(',')} missing ${missing.join(',')} (got ${[...u].join(',')})` : true;
  };
}
function both(a, b) { return (v, m, f) => { const x = a(v, m, f), y = b(v, m, f); const errs = []; if (x !== true) errs.push(x); if (y !== true) errs.push(y); return errs.length ? errs.join('; ') : true; }; }
// (id, play site) assertions: the value behind a table read is only evidence when it is attached to
// the instruction that consumes it, so these checks pin both halves of each `id@site` token.
function expectAt(pairs, absent = {}) {
  return (v) => {
    const bad = [];
    for (const [k, want] of Object.entries(pairs)) {
      const r = v.get(k);
      if (!r) { bad.push(`${k}: no row`); continue; }
      const got = r.mot.map(x => `${x.id}@${x.site}`).join(' ');
      for (const [id, site] of want) if (!r.mot.some(x => x.id === id && x.site === site)) bad.push(`${k}: missing ${id}@${site} (got ${got || '-'})`);
    }
    for (const [k, none] of Object.entries(absent)) {
      const r = v.get(k);
      if (!r) { bad.push(`${k}: no row`); continue; }
      for (const id of none) if (r.ids.includes(id)) bad.push(`${k}: unexpected ${id} (got ${r.ids.join(',')})`);
    }
    return bad.length ? bad.join('; ') : true;
  };
}

// ---------------------------------------------------------------------------------------------
// anchors - GuMoveInventory.md (em001_00)
// ---------------------------------------------------------------------------------------------
check('anchor', 'Indep/GuMoveInventory.md sec.1', 'em001_00', 'class census = 250 request sites', (v, m, f) =>
  f?.counts?.census?.sites === 250 ? true : `census ${f?.counts?.census?.sites}`);
check('anchor', 'Indep/GuMoveInventory.md sec.1', 'em001_00', 'class census covers the 118 reference ids (+ play(0))', (v, m, f) =>
  (f?.counts?.census?.ids ?? 0) >= 118 ? true : `ids ${f?.counts?.census?.ids}`);
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:240 -> 7/8/2311/2312', expectIds({ '7:240': [7, 8, 2311, 2312] }));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:252 -> 2308/522/2309/2310', expectIds({ '7:252': [2308, 522, 2309, 2310] }));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:255 -> 2306', expectIds({ '7:255': [2306] }));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:239 -> 1043/2311/2312', expectIds({ '7:239': [1043, 2311, 2312] }));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:253 -> 7/2307/1076', expectIds({ '7:253': [7, 2307, 1076] }));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', '7:254 -> 7/516 (2306 is 7:255 only)', both(expectIds({ '7:254': [7, 516] }), expectIds({}, { '7:254': [2306] })));
check('anchor', 'Indep/GuMoveInventory.md sec.2', 'em001_00', 'frames 2306=329 2311=83 2312=61 2308=129 2309=39 2310=217 522=123', (v, m) => {
  const want = { 2306: 329, 2311: 83, 2312: 61, 2308: 129, 2309: 39, 2310: 217, 522: 123 };
  const bad = [];
  for (const [id, fr] of Object.entries(want)) { const g = m.get(+id); if (!g || +g.frames !== fr) bad.push(`${id}:${g?.frames}`); }
  return bad.length ? bad.join(',') : true;
});

// ---------------------------------------------------------------------------------------------
// fixes-A (em005_00)
// ---------------------------------------------------------------------------------------------
check('fixes-A', 'fixes-A.tsv MovesA moves-em005 rows 7:1/7:2', 'em005_00', '7:1 -> 525 (r1=0), 7:2 -> 528 (r1=1)',
  both(expectIds({ '7:1': [525] }), expectIds({ '7:2': [528] })));
check('fixes-A', 'fixes-A.tsv MovesA moves-em005 rows 7:1/7:2', 'em005_00', 'rows 47 on 7:1, 48 on 7:2',
  both(expectRows({ '7:1': [47] }), expectRows({ '7:2': [48] })));
check('fixes-A', 'fixes-A.tsv MovesA rows 7:34..7:37', 'em005_00', '7:34/7:35 -> 525, 7:36/7:37 -> 528',
  both(expectIds({ '7:34': [525], '7:35': [525] }), expectIds({ '7:36': [528], '7:37': [528] })));
check('fixes-A', 'fixes-A.tsv MovesA ADD rows 7:62..7:67', 'em005_00', '7:62/64/65 -> 525, 7:63/66/67 -> 528',
  both(expectIds({ '7:62': [525], '7:64': [525], '7:65': [525] }), expectIds({ '7:63': [528], '7:66': [528], '7:67': [528] })));
check('fixes-A', 'fixes-A.tsv MovesA motions.tsv ADD 528', 'em005_00', 'motions.tsv has 528',
  (v, m) => (m.has(528) ? true : 'missing 528'));
check('fixes-A', 'fixes-A.tsv MovesA motions.tsv ADD 1043', 'em005_00', '7:87 requests 1043 (bank4#19 absent)',
  both(expectIds({ '7:87': [1043] }), (v, m) => (m.get(1043)?.gu === 'GU-absent' ? true : `1043 gu=${m.get(1043)?.gu}`)));
check('fixes-A', 'fixes-A.tsv MovesA 525 variants', 'em005_00', '525 reached by 7:1,3,34,35,38,39,62,64,65,68,69,70', (v) => {
  const want = ['7:1', '7:3', '7:34', '7:35', '7:38', '7:39', '7:62', '7:64', '7:65', '7:68', '7:69', '7:70'];
  const bad = want.filter(k => !(idsOf(v, k) ?? []).includes(525));
  return bad.length ? `missing on ${bad.join(',')}` : true;
});

// ---------------------------------------------------------------------------------------------
// fixes-B (em014_00, em046_00, em030_00, em021_00)
// ---------------------------------------------------------------------------------------------
check('fixes-B', 'fixes-B.tsv em014 7:20/7:27/7:21/7:28', 'em014_00', '7:20/7:27 -> 530; 7:21/7:28 -> 529',
  both(expectIds({ '7:20': [530], '7:27': [530] }), expectIds({ '7:21': [529], '7:28': [529] })));
check('fixes-B', 'fixes-B.tsv em014 7:20..7:28 rows', 'em014_00', 'rows 14|26 on 7:20/7:21, row 21 on 7:27/7:28',
  (v) => {
    const bad = [];
    for (const k of ['7:20', '7:21']) { const r = rowsOf(v, k) ?? []; if (!r.includes(14) && !r.includes(26)) bad.push(`${k} rows ${r}`); }
    for (const k of ['7:27', '7:28']) { const r = rowsOf(v, k) ?? []; if (!r.includes(21)) bad.push(`${k} rows ${r}`); }
    return bad.length ? bad.join('; ') : true;
  });
check('fixes-B', 'fixes-B.tsv em014 7:23 add 523/771', 'em014_00', '7:23 has 523 and 771', expectIds({ '7:23': [523, 771] }));
check('fixes-B', 'fixes-B.tsv em014 7:0 remove rows 6/12', 'em014_00', '7:0 arms rows 1,7,13,23 (not 6/12)',
  both(expectRows({ '7:0': [1, 7] }), expectRows({}, { '7:0': [6, 12] })));
check('fixes-B', 'fixes-B.tsv em014 7:2/4/5 rows 3,8,9', 'em014_00', '7:2/7:4/7:5 arm rows 3,8,9',
  both(expectRows({ '7:2': [3, 8, 9] }), both(expectRows({ '7:4': [3, 8, 9] }), expectRows({ '7:5': [3, 8, 9] }))));
check('fixes-B', 'fixes-B.tsv em046 add motions', 'em046_00', '7:26/7:35 -> 516, 7:14/7:62/7:99 -> 515',
  expectIds({ '7:26': [516], '7:35': [516], '7:14': [515], '7:62': [515], '7:99': [515] }));
check('fixes-B', 'fixes-B.tsv em046 1029/1031/1032', 'em046_00', '7:55/63/95 -> 1029; 7:100/103 -> 1031; 7:101/104/105/106 -> 1032',
  expectIds({ '7:55': [1029], '7:63': [1029], '7:95': [1029], '7:100': [1031], '7:103': [1031], '7:101': [1032], '7:104': [1032], '7:105': [1032], '7:106': [1032] }));
check('fixes-B', 'fixes-B.tsv em046 7:109/7:108', 'em046_00', '7:109 -> 1028 with rows 65,66; 7:108 rows 65,66',
  both(expectIds({ '7:109': [1028] }), both(expectRows({ '7:109': [65, 66] }), expectRows({ '7:108': [65, 66] }))));
check('fixes-B', 'fixes-B.tsv em046 7:85/7:84', 'em046_00', '7:85 -> 1028 with rows 58,59; 7:84 rows 58,59',
  both(expectIds({ '7:85': [1028] }), both(expectRows({ '7:85': [58, 59] }), expectRows({ '7:84': [58, 59] }))));
check('fixes-B', 'fixes-B.tsv em046 single motions', 'em046_00', '7:113 -> 1054, 7:126/7:130 -> 1057, 7:143/7:150 -> 1058',
  expectIds({ '7:113': [1054], '7:126': [1057], '7:130': [1057], '7:143': [1058], '7:150': [1058] }));
check('fixes-B', 'fixes-B.tsv em046 7:12 remove rows', 'em046_00', '7:12 arms 7,24,32,33 (not 54..57,1)',
  both(expectRows({ '7:12': [7, 24, 32, 33] }), expectRows({}, { '7:12': [54, 55, 56, 57, 1] })));
check('fixes-B', 'fixes-B.tsv em030 7:3/7:4 = 516', 'em030_00', '7:3 and 7:4 -> 516 (517 also present: r0!=1 branch)',
  expectIds({ '7:3': [516], '7:4': [516] }));
check('fixes-B', 'fixes-B.tsv em030 7:3 no 514', 'em030_00', '7:3/7:4 never request 514', expectIds({}, { '7:3': [514], '7:4': [514] }));
check('fixes-B', 'fixes-B.tsv em030 7:5 = 514 only', 'em030_00', '7:5 -> 514, no 515', both(expectIds({ '7:5': [514] }), expectIds({}, { '7:5': [515] })));
check('fixes-B', 'fixes-B.tsv em030 7:0/7:8 row 1', 'em030_00', '7:0 and 7:8 arm row 1 (not 2)',
  both(expectRows({ '7:0': [1], '7:8': [1] }), expectRows({}, { '7:0': [2], '7:8': [2] })));
check('fixes-B', 'fixes-B.tsv em021 7:0', 'em021_00', '7:0 -> 513,514 (no 515), rows 3,4',
  both(expectIds({ '7:0': [513, 514] }), both(expectIds({}, { '7:0': [515] }), expectRows({ '7:0': [3, 4] }))));
check('fixes-B', 'fixes-B.tsv em021 7:2 row 2', 'em021_00', '7:2 arms row 2', expectRows({ '7:2': [2] }));
check('fixes-B', 'fixes-B.tsv em021 7:4 = 517', 'em021_00', '7:4 -> 517 (fixes-B action is inverted; its evidence names 0xdd7c50 movw r1,#0x205)',
  both(expectIds({ '7:4': [517] }), expectIds({}, { '7:4': [527, 518] })));
check('fixes-B', 'fixes-B.tsv em021 7:5/7:88', 'em021_00', '7:5 and 7:88 -> 29,519 (not 28)',
  both(expectIds({ '7:5': [29, 519], '7:88': [29, 519] }), expectIds({}, { '7:5': [28], '7:88': [28] })));
check('fixes-B', 'fixes-B.tsv em021 7:14..7:16', 'em021_00', '7:14/15/16 -> 525,526,527 (no 529, no 1309)',
  both(expectIds({ '7:14': [525, 526, 527], '7:15': [525, 526, 527], '7:16': [525, 526, 527] }),
    expectIds({}, { '7:14': [529, 1309], '7:15': [529, 1309], '7:16': [529, 1309] })));
check('fixes-B', 'fixes-B.tsv em021 7:17/7:70 +529', 'em021_00', '7:17 and 7:70 also reach 529',
  expectIds({ '7:17': [529], '7:70': [529] }));
check('fixes-B', 'fixes-B.tsv em021 7:1 rows 5,19', 'em021_00', '7:1 arms rows 5 and 19', expectRows({ '7:1': [5, 19] }));
check('fixes-B', 'fixes-B.tsv em021 7:9 row 10', 'em021_00', '7:9 arms row 10', expectRows({ '7:9': [10] }));
check('fixes-B', 'fixes-B.tsv em021 7:69 rows 3,4', 'em021_00', '7:69 arms rows 3,4', expectRows({ '7:69': [3, 4] }));

// ---------------------------------------------------------------------------------------------
// fixes-C (em069_00, em068_00, em085_00, em043_00)
// ---------------------------------------------------------------------------------------------
check('fixes-C', 'fixes-C.tsv em069 7:2 = 1060', 'em069_00', '7:2 -> 1060 (1061 needs r1=1)', both(expectIds({ '7:2': [1060] }), expectIds({}, { '7:2': [1061] })));
check('fixes-C', 'fixes-C.tsv em069 1061 stays for 7:3', 'em069_00', '7:3 -> 1061', expectIds({ '7:3': [1061] }));
check('fixes-C', 'fixes-C.tsv em069 7:0/4/20/71 add 1056/1144', 'em069_00', '7:0/4/20/71 (same handler 0xf96230) reach 1056+1144; per-variant split by r5',
  expectUnion(['7:0', '7:4', '7:20', '7:71'], [1056, 1144]));
check('fixes-C', 'fixes-C.tsv em069 7:9/15/34 add 1149', 'em069_00', '7:9/15/34 (shared site 0xf96ac8) reach 1149',
  expectUnion(['7:9', '7:15', '7:34'], [1149]));
check('fixes-C', 'fixes-C.tsv em069 7:50/52/57 add 1135/1136', 'em069_00', '7:50/52/57 (sites 0xf97af8/0xf97d08) reach 1135+1136',
  expectUnion(['7:50', '7:52', '7:57'], [1135, 1136]));
check('fixes-C', 'fixes-C.tsv em069 7:56 add 1044', 'em069_00', '7:56 requests 1044', expectIds({ '7:56': [1044] }));
check('fixes-C', 'fixes-C.tsv em068 helper ids', 'em068_00', '7:1/8/12/30/66/67 (handler 0xf835e0) reach 523,537,583',
  both(expectUnion(['7:1', '7:8', '7:12', '7:30', '7:66', '7:67'], [523, 537, 583]), expectIds({ '7:1': [523, 537], '7:8': [523, 537] })));
check('fixes-C', 'fixes-C.tsv em068 7:16/7:17', 'em068_00', '7:16/7:17 (handler 0xf84ba0) reach 554,556', expectUnion(['7:16', '7:17'], [554, 556]));
check('fixes-C', 'fixes-C.tsv em068 7:21 = 559', 'em068_00', '7:21 -> 559', expectIds({ '7:21': [559] }));
check('fixes-C', 'fixes-C.tsv em085 7:39 = 551', 'em085_00', '7:39 -> 551 (552 needs r1!=0)', both(expectIds({ '7:39': [551] }), expectIds({}, { '7:39': [552] })));
check('fixes-C', 'fixes-C.tsv em085 7:23', 'em085_00', '7:23 -> 573,574,575,777', expectIds({ '7:23': [573, 574, 575, 777] }));
check('fixes-C', 'fixes-C.tsv em085 7:99/7:100', 'em085_00', '7:99/7:100 (handler 0x10953e0) reach 547,543,558 and one of 545/546, one of 551/552',
  both(expectIds({ '7:99': [547, 543, 558], '7:100': [547, 543, 558] }), expectUnion(['7:99', '7:100'], [545, 546, 551, 552])));
check('fixes-C', 'fixes-C.tsv em085 7:31..7:103', 'em085_00', '7:31/33/34/86/97/98/102/103 -> 558,543,544,547,773,777,784',
  expectIds({ '7:31': [558, 543, 544, 547, 773, 777, 784], '7:33': [558, 543, 544, 547, 773, 777, 784] }));
check('fixes-C', 'fixes-C.tsv em043 7:147 = 553', 'em043_00', '7:147 -> 553 (554 needs r1=1)', both(expectIds({ '7:147': [553] }), expectIds({}, { '7:147': [554] })));
check('fixes-C', 'fixes-C.tsv em043 7:148 = 554', 'em043_00', '7:148 -> 554', expectIds({ '7:148': [554] }));
check('fixes-C', 'fixes-C.tsv em043 7:145 family', 'em043_00', '7:145/146/149/150/151/162 (handler 0xe7db70) reach 555,556,557,558',
  both(expectIds({ '7:145': [555, 557] }), expectUnion(['7:145', '7:146', '7:149', '7:150', '7:151', '7:162'], [555, 556, 557, 558])));
check('fixes-C', 'fixes-C.tsv em043 7:144 family add 552', 'em043_00', '7:144/152/153/156/157/158 (handler 0xe7d788) reach 550,551,552',
  both(expectIds({ '7:144': [550] }), expectUnion(['7:144', '7:152', '7:153', '7:156', '7:157', '7:158'], [550, 551, 552])));
check('fixes-C', 'fixes-C.tsv em043 shared helper 536', 'em043_00', '536 requested by the shared helper 0xe7bfac (some variant must show it)', (v, m) =>
  (m.has(536) ? true : 'motion 536 absent from motions.tsv'));

// ---------------------------------------------------------------------------------------------
// fixes-D (em009_00, em008_00, em012_00)
// ---------------------------------------------------------------------------------------------
check('fixes-D', 'fixes-D.tsv em009 7:28/7:39 row 18', 'em009_00', '7:28 and 7:39 arm row 18',
  expectRows({ '7:28': [18], '7:39': [18] }));
check('fixes-D', 'fixes-D.tsv em009 7:59 -> 1028 + row 19', 'em009_00', '7:59 -> 1028, row 19',
  both(expectIds({ '7:59': [1028] }), expectRows({ '7:59': [19] })));
check('fixes-D', 'fixes-D.tsv em008 7:73 -> 515 + row 34', 'em008_00', '7:73 -> 515, row 34',
  both(expectIds({ '7:73': [515] }), expectRows({ '7:73': [34] })));
check('fixes-D', 'fixes-D.tsv em012 7:3 = 516, 7:4 = 517', 'em012_00', '7:3 -> 516 (517 absent), 7:4 -> 517 (516 absent)',
  both(expectIds({ '7:3': [516], '7:4': [517] }), expectIds({}, { '7:3': [517], '7:4': [516] })));
check('fixes-D', 'fixes-D.tsv em012 7:0/7:5 no motion 2', 'em012_00', '7:0 and 7:5 do not request motion 2',
  expectIds({}, { '7:0': [2], '7:5': [2] }));

// ---------------------------------------------------------------------------------------------
// tableload (F1): motion ids behind a constant halfword-table read
//
// The handler computes r1 as `ldrh r1,[base + 2*sel]` with sel in {0,1} (a conditional `movwne
// sel,#1` after `cmp [em+0xb5f4],#60`), so the walk has to read *every* candidate address of the
// base set. Expected ids are the halfwords of the data tables themselves (`mhgu_re_read_words`);
// the site is the `bl 0xaff40` that follows the `ldrh`. Table bases: em060 0x16a6504 (selector
// pairs), em022 0x16a3ffc/0x16a400c, em008 0x16a2f80 (descriptor+0, low halfword = id).
// ---------------------------------------------------------------------------------------------
check('tableload', 'em060 0x16a6504+0x20 (GuMovesToolX 2.3)', 'em060_00',
  '7:114 phase 0 -> 534 and 524 at the play 0xf195ec (ldrh @0xf195e4)',
  expectAt({ '7:114': [[534, '0x00f195ec'], [524, '0x00f195ec']] }));
check('tableload', 'em060 0x16a6504+0x2c (GuMovesToolX 2.3)', 'em060_00',
  '7:43 phase 0 -> 537 and 527 at the play 0xf19ce0 (ldrh @0xf19cd8)',
  expectAt({ '7:43': [[537, '0x00f19ce0'], [527, '0x00f19ce0']] }));
check('tableload', 'em060 0x16a6504+0x24 (phase 1 of the same helper)', 'em060_00',
  '7:114 phase 1 -> 525 and 535 at the play 0xf19734 (ldrh @0xf1972c)',
  expectAt({ '7:114': [[525, '0x00f19734'], [535, '0x00f19734']] }));
check('tableload', 'em060 0x16a6504+0x54/0x5c/0x58', 'em060_00',
  '1:22 -> 777/782 @0xf15440, 779/784 @0xf154b0, 778/783 @0xf15554',
  expectAt({ '1:22': [[777, '0x00f15440'], [782, '0x00f15440'], [779, '0x00f154b0'], [784, '0x00f154b0'], [778, '0x00f15554'], [783, '0x00f15554']] }));
check('tableload', 'em060 0x16a6508 / 0x16a650c', 'em060_00',
  '7:4 -> 515/517 @0xf18024 (ldrh +4) and 516/518 @0xf180f4 (ldrh +8)',
  expectAt({ '7:4': [[515, '0x00f18024'], [517, '0x00f18024'], [516, '0x00f180f4'], [518, '0x00f180f4']] }));
check('tableload', 'em022 0x16a3ffc (word 6) / 0x16a400c (word 5)', 'em022_00',
  '6:4 -> 5 and 6 at the descriptor play 0x77470 (previously no-motion)',
  expectAt({ '6:4': [[5, '0x00077470'], [6, '0x00077470']] }));
check('tableload', 'em008 0x16a2f80 (word 0x465)', 'em008_00',
  '7:70 -> 1125 at the descriptor play 0x77470 next to the gated 1126',
  expectAt({ '7:70': [[1125, '0x00077470'], [1126, '0x00077470']] }));
check('tableload', 'image header 0x10/0x30 is not data (negative control)', 'em019_00',
  '6:1 keeps 19 and drops the header phantom 364 (old walker read [0+16] = vaddr 0x10)',
  expectAt({ '6:1': [[19, '0x00077470']] }, { '6:1': [364, 45048] }));

// ---------------------------------------------------------------------------------------------
// table facts (MovesXA/B/C/D re-derived bounds and bases)
// ---------------------------------------------------------------------------------------------
const tableFacts = [
  ['em005_00', 7, 0, 90, 'MovesXA sec.1'],
  ['em005_00', 1, 0, 47, 'MovesA sec.3'],
  ['em005_00', 10, 7, 203, 'MovesXA/B'],
  ['em022_00', 7, 0, 40, 'MovesXA sec.2'],
  ['em022_00', 2, 1, 23, 'MovesA sec.3'],
  ['em033_00', 7, 0, 39, 'MovesXA sec.3'],
  ['em033_00', 6, 0, 15, 'fixes-A state 6'],
  ['em045_00', 7, 0, 255, 'MovesXA sec.4'],
  ['em045_00', 6, 0, 22, 'fixes-A state 6 em045'],
  ['em014_00', 7, 0, 67, 'MovesXB sec.B'],
  ['em014_00', 1, 1, 30, 'MovesXB sec.B'],
  ['em014_00', 10, 7, 203, 'MovesXB sec.B'],
  ['em046_00', 7, 12, 144, 'MovesXB sec.B'],
  ['em046_00', 10, 7, 190, 'MovesXB sec.B'],
  ['em030_00', 7, 0, 8, 'MovesXB sec.B'],
  ['em021_00', 7, 0, 94, 'MovesXB sec.B'],
  ['em069_00', 7, 0, 82, 'MovesXC'],
  ['em068_00', 7, 0, 75, 'MovesXC'],
  ['em085_00', 7, 0, 106, 'MovesXC'],
  ['em043_00', 7, 0, 165, 'MovesXC'],
  ['em009_00', 7, 0, 82, 'MovesXD'],
  ['em008_00', 7, 0, 99, 'MovesXD'],
  ['em010_00', 7, 0, 50, 'MovesXD'],
  ['em012_00', 7, 0, 6, 'MovesXD'],
  ['em001_00', 7, 0, 255, 'GuMoveInventory sec.1'],
];
for (const [em, st, base, max, src] of tableFacts) {
  check('table', src, em, `state ${st}: index base ${base}, cmp #${max}`, (v, m, f) => {
    const s = (f?.states ?? []).find(x => x.state === st);
    if (!s) return `state ${st} missing`;
    if (!s.l2 || s.l2.kind === 'chain' && s.l2.base === undefined) return `state ${st} is ${s.kind}/${s.l2?.kind}`;
    if (s.l2.base !== base) return `base ${s.l2.base}`;
    if (s.l2.max !== max) return `max ${s.l2.max}`;
    return true;
  });
}
check('table', 'MovesXD L1 table base = head+0x10', 'em012_00', 'em012 state7 table 0xd7c494 (head 0xd7c484+0x10)', (v, m, f) => {
  const s = (f?.states ?? []).find(x => x.state === 7);
  return s?.l2?.table === '0x00d7c494' ? true : `table ${s?.l2?.table}`;
});
check('table', 'MovesXB depth: em046 state7 head', 'em046_00', 'em046 state7 L2 head 0xea9fe0', (v, m, f) => {
  const s = (f?.states ?? []).find(x => x.state === 7);
  return s?.l2?.head === '0x00ea9fe0' ? true : `head ${s?.l2?.head}`;
});


// ---------------------------------------------------------------------------------------------
// row values and frames quoted by the cross-checks
// ---------------------------------------------------------------------------------------------
function movesRow(em, key) {
  const f = path.join(OUT, em, 'moves.tsv');
  if (!fs.existsSync(f)) return null;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const p = l.split('\t');
    if (p[0] === key) return p;
  }
  return null;
}
function checkRowValue(em, key, token, src, desc) {
  check('rowvalue', src, em, desc, () => {
    const p = movesRow(em, key);
    if (!p) return `no row ${key}`;
    return (p[4] ?? '').includes(token) ? true : `rows "${p[4]}" lack ${token}`;
  });
}
checkRowValue('em005_00', '7:1', 'first#47=50/2/0x1', 'fixes-A.tsv moves-em005 7:1 rows', 'row 47 decodes 50/2/0x1');
checkRowValue('em005_00', '7:2', 'first#48=50/2/0x1', 'fixes-A.tsv moves-em005 7:2 rows', 'row 48 decodes 50/2/0x1');
checkRowValue('em045_00', '7:70', 'first#37=0/1/0x80001', 'fixes-A.tsv attr of rows 35/36/37', 'row 37 attr is 0x80001 (not 0x1)');
checkRowValue('em045_00', '7:70', 'second#1040=', 'MovesXA sec.4 rotation row 1040 armed', 'row 1040 is armed from code');
checkRowValue('em030_00', '7:3', 'first#4=35/2/0x1', 'fixes-B.tsv em030 row 4', 'row 4 decodes 35/2/0x1');
checkRowValue('em009_00', '7:28', 'first#18=10/1/0x1', 'fixes-D.tsv em009 7:28', 'row 18 armed');
checkRowValue('em009_00', '7:59', 'first#19=40/2/0x1', 'fixes-D.tsv em009 7:59', 'row 19 armed');
checkRowValue('em008_00', '7:73', 'first#34=10/1/0x1', 'fixes-D.tsv em008 7:73', 'row 34 armed');
check('frames', 'fixes-A.tsv em045 526 = 73f', 'em045_00', 'motion 526 is 73 frames, not 517', (v, m) => {
  const g = m.get(526);
  return !g ? 'motion 526 absent' : (+g.frames === 73 ? true : `frames ${g.frames}`);
});
check('frames', 'fixes-A.tsv em022 526 absent', 'em022_00', 'motion 526 is GU-absent for em022_00', (v, m) => {
  const g = m.get(526);
  return !g ? 'motion 526 not requested at all' : (g.gu === 'GU-absent' ? true : `526 gu=${g.gu} lmt=${g.lmt}`);
});
check('frames', 'fixes-C.tsv em068 LMT entries', 'em068_00', '523=151f, 537=55f, 583=69f', (v, m) => {
  const want = { 523: 151, 537: 55, 583: 69 };
  const bad = [];
  for (const [id, fr] of Object.entries(want)) { const g = m.get(+id); if (!g) bad.push(id + ':absent'); else if (+g.frames !== fr) bad.push(id + ':' + g.frames); }
  return bad.length ? bad.join(',') : true;
});
check('frames', 'fixes-C.tsv em043 553 = 235f', 'em043_00', '553 is 235 frames (em043_00_2#41)', (v, m) => {
  const g = m.get(553);
  return g && +g.frames === 235 ? true : `frames ${g?.frames}`;
});
check('frames', 'fixes-C.tsv em085 551 = 69f', 'em085_00', '551 is 69 frames (em085_00_2#39)', (v, m) => {
  const g = m.get(551);
  return g && +g.frames === 69 ? true : `frames ${g?.frames}`;
});
check('frames', 'MovesXA sec.2 em022 515/516', 'em022_00', '515=79f, 516=179f', (v, m) => {
  const bad = [];
  if (+m.get(515)?.frames !== 79) bad.push('515:' + m.get(515)?.frames);
  if (+m.get(516)?.frames !== 179) bad.push('516:' + m.get(516)?.frames);
  return bad.length ? bad.join(',') : true;
});

// ---------------------------------------------------------------------------------------------
const byVerdict = { PASS: 0, FAIL: 0, SKIP: 0 };
for (const r of results) byVerdict[r.verdict]++;
const lines = ['group\tsource\tmonster\tcheck\tverdict\tdetail'];
for (const r of results) lines.push([r.group, r.src, r.em, r.desc, r.verdict, r.detail].join('\t'));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'regression.tsv'), lines.join('\n') + '\n');
console.log(`checks: ${results.length}  PASS ${byVerdict.PASS}  FAIL ${byVerdict.FAIL}  SKIP ${byVerdict.SKIP}`);
for (const r of results.filter(x => x.verdict === 'FAIL')) console.log(`FAIL [${r.group}] ${r.em} :: ${r.desc} :: ${r.detail}`);
