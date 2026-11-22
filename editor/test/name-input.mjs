// Browser text inputs remove CR/LF. Exercise the real UI guard with that value
// contract and the real header writer; a browser integration check is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as C from '../core/container.mjs';
import * as H from '../core/header.mjs';

const source = fs.readFileSync(new URL('../ui/app.mjs', import.meta.url), 'utf8');
function section(a, b) {
  const start = source.indexOf(a), end = source.indexOf(b, start);
  assert(start >= 0 && end > start);
  return source.slice(start, end);
}
const code = [
  section('const utf8Encoder =', '\nconst state ='),
  section('function validateName(value) {', '\n// ---------------------------------------------------------------------------'),
  section('function syncHeaderInputs() {', '\nfunction applyName()'),
  section('function applyName() {', '\nfunction applyNumericField('),
].join('\n');
function harness(name) {
  const bytes = new Uint8Array(C.HNT_SIZE);
  const view = C.hunterView(C.openHnt(bytes), 0);
  H.writeName(view, name);
  let text = '';
  const dom = { headerFields: {}, nameInput: {
    get value() { return text; }, set value(value) { text = String(value).replace(/[\r\n]/g, ''); },
  }, applyName: {}, nameError: {}, playtimeInput: {}, playtimeError: {}, goldInput: {}, goldError: {}, hrInput: {}, hrError: {}, genderError: {} };
  const state = { view };
  const context = { ...H, state, dom, TextEncoder, TextDecoder,
    setError: (node, value) => { node.text = value; }, clearHeaderErrors() {}, fillGender() {}, setStatus() {} };
  const api = vm.runInNewContext(`${code}\n({ syncHeaderInputs, applyName })`, context);
  return { ...api, dom, bytes, state };
}

test('lossy single-line display blocks name writes without blocking other fields', () => {
  for (const name of ['A\nB', 'A\rB', 'A\r\nB']) {
    const h = harness(name), before = h.bytes.slice();
    h.syncHeaderInputs();
    assert.equal(h.dom.nameInput.value, 'AB');
    assert.equal(h.dom.headerFields.disabled, false);
    assert.equal(h.dom.applyName.disabled, true);
    h.applyName();
    assert.deepEqual(h.bytes, before);
    assert.match(h.dom.nameError.text, /未写入/);
    H.writeName(h.state.view, 'Normal');
    h.syncHeaderInputs();
    assert.equal(h.dom.applyName.disabled, false);
    assert.equal(h.dom.nameInput.disabled, false);
  }
});

test('BOM and supplementary characters are preserved while code-point excess is refused', () => {
  const h = harness('\uFEFFX');
  h.syncHeaderInputs();
  assert.equal(h.dom.nameInput.value, '\uFEFFX');
  const before = h.bytes.slice();
  h.applyName();
  assert.deepEqual(h.bytes, before);
  const valid = '\u{1F600}' + 'a'.repeat(15);
  h.dom.nameInput.value = valid;
  h.applyName();
  assert.equal(H.readName(h.state.view), valid);
  const after = h.bytes.slice();
  h.dom.nameInput.value = valid + 'a';
  h.applyName();
  assert.deepEqual(h.bytes, after);
  assert.match(h.dom.nameError.text, /超过/);
});

test('malformed UTF-8 is not silently rewritten as a replacement character', () => {
  const h = harness('A');
  h.bytes[0] = 0xff;
  const before = h.bytes.slice();
  h.syncHeaderInputs();
  assert.equal(h.dom.applyName.disabled, true);
  h.applyName();
  assert.deepEqual(h.bytes, before);
  H.writeName(h.state.view, '\uFFFD');
  h.syncHeaderInputs();
  assert.equal(h.dom.applyName.disabled, false);
  h.applyName();
  assert.equal(H.readName(h.state.view), '\uFFFD');
});
