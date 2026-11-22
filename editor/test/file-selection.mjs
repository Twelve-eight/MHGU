// SPDX-License-Identifier: MIT
// Execute the UI's real async handler with deferred synthetic Files and the real
// container parser. Rendering sinks are isolated; browser integration is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as C from '../core/container.mjs';

const source = fs.readFileSync(new URL('../ui/app.mjs', import.meta.url), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, 'UI handler/state boundaries must be available');
  return source.slice(a, b);
}
const stateSource = section('const state = {', '\nfunction byId(');
const handlerSource = section('async function handleFile(file) {', '\nfunction handleSlotChange()');
function harness() {
  const statuses = [];
  const context = {
    Uint8Array, dom: { layoutSelect: { disabled: true, value: '' } },
    SYSTEM_SIZE: C.SYSTEM_SIZE, HNT_SIZE: C.HNT_SIZE,
    openSystem: C.openSystem, openHnt: C.openHnt, hunterView: C.hunterView,
    setStatus: text => statuses.push(text),
  };
  for (const name of ['renderFileInfo', 'renderSlotSelect', 'renderDownload',
    'syncHeaderInputs', 'renderInvalid', 'renderItems', 'updateLayoutHint',
    'updateItemsNote', 'clearHeaderErrors']) context[name] = () => {};
  const actual = vm.runInNewContext(`${stateSource}\n${handlerSource}\n({ state, handleFile })`, context);
  return { ...actual, statuses };
}
function pending(name) {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { file: { name, arrayBuffer: () => promise }, resolve, reject };
}
function image(firstByte) {
  const bytes = new Uint8Array(C.HNT_SIZE);
  bytes[0] = firstByte;
  return bytes.buffer;
}

for (const outcome of ['success', 'read-error', 'invalid-container']) {
  test(`superseded file ${outcome} cannot replace the newest image, view, or status`, async () => {
    const h = harness(), old = pending('old.hnt'), latest = pending('latest.hnt');
    const oldTask = h.handleFile(old.file);
    const latestTask = h.handleFile(latest.file);
    latest.resolve(image(66));
    await latestTask;
    const file = h.state.file, view = h.state.view, status = h.statuses.at(-1);
    if (outcome === 'success') old.resolve(image(65));
    else if (outcome === 'read-error') old.reject(new Error('superseded read failed'));
    else old.resolve(new ArrayBuffer(2));
    await oldTask;
    assert.equal(h.state.fileName, 'latest.hnt');
    assert.equal(h.state.file, file);
    assert.equal(h.state.view, view);
    assert.equal(h.state.file.bytes[0], 66);
    assert.equal(h.statuses.at(-1), status);
  });
}

test('a newly selected invalid file leaves no previous image available for export', async () => {
  const h = harness(), valid = pending('valid.hnt'), invalid = pending('invalid.hnt');
  const first = h.handleFile(valid.file);
  valid.resolve(image(65));
  await first;
  assert.equal(h.state.file.bytes[0], 65);
  const second = h.handleFile(invalid.file);
  assert.equal(h.state.file, null);
  invalid.resolve(new ArrayBuffer(2));
  await second;
  assert.equal(h.state.file, null);
  assert.equal(h.state.view, null);
  assert.equal(h.state.fileName, 'invalid.hnt');
  assert.match(h.statuses.at(-1), /载入失败/);
});

test('a current read failure is reported and cannot restore a superseded pending file', async () => {
  const h = harness(), old = pending('old.hnt'), latest = pending('latest.hnt');
  const first = h.handleFile(old.file), second = h.handleFile(latest.file);
  latest.reject(new Error('latest read failed'));
  await second;
  const failure = h.statuses.at(-1);
  assert.match(failure, /latest read failed/);
  old.resolve(image(65));
  await first;
  assert.equal(h.state.file, null);
  assert.equal(h.state.view, null);
  assert.equal(h.statuses.at(-1), failure);
});
