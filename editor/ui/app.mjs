// SPDX-License-Identifier: MIT
// Browser UI for the MHGU save core (MHGU/editor/core/*.mjs).
//
// The page reads one file into memory with <input type=file>, edits it through the core
// writers, and exports the edited bytes with a Blob download. It never uploads, never
// writes to disk and never guesses the item-box layout: every item-box call receives the
// layout the user picked explicitly.

import {
  HNT_SIZE,
  SYSTEM_SIZE,
  hunterView,
  openHnt,
  openSystem,
} from '../core/container.mjs';
import {
  LIMITS,
  readGender,
  readGold,
  readHr,
  readName,
  readPlaytime,
  writeGender,
  writeGold,
  writeHr,
  writeName,
  writePlaytime,
} from '../core/header.mjs';
import {
  ITEM_COUNT_MAX,
  ITEM_ID_MAX,
  clearInvalidItemSlots,
  findInvalidItemSlots,
  itemBoxSlotCount,
  readItemBox,
  readItemBoxSlot,
  writeItemBoxSlot,
} from '../core/items.mjs';

const ITEMS_PER_PAGE = 100;

// Stable ids for the rebuilt pager, so focus can be handed back to the control that
// triggered the page change (see restorePagerFocus).
const PAGE_CONTROL_IDS = Object.freeze({
  prev: 'page-prev',
  next: 'page-next',
  select: 'page-select',
});

// Loaded by name: editor/help/index.mjs uses node:fs and cannot run in the browser.
const HELP_FILES = Object.freeze([
  'header.json',
  'items.json',
  'equipment.json',
  'monster.json',
  'palico.json',
  'progress.json',
]);

const CONF_LABELS = Object.freeze({
  A: 'A 已验证',
  B: 'B 文档推断',
  U: 'U 未确认',
});

const AREA_LABELS = Object.freeze({ box: '道具箱', pouch: '口袋' });

const INVALID_KIND_LABELS = Object.freeze({
  ghost: '幽灵槽（ID 为 0、数量非 0）',
  'zero-count': '零数量槽（数量为 0、ID 非 0）',
  'out-of-range': 'ID 或数量超出文档域',
});

const utf8Encoder = new TextEncoder();

const state = {
  fileName: '',
  file: null,
  slotIndex: 0,
  layout: '',
  view: null,
  // Error message of the selected slot when hunterView() rejected it; '' when fine.
  slotError: '',
  help: new Map(),
  page: 0,
};

function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`页面结构错误：缺少 #${id}`);
  return node;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const dom = {
  status: byId('status'),
  fileInput: byId('file-input'),
  fileName: byId('file-name'),
  fileKind: byId('file-kind'),
  fileSize: byId('file-size'),
  download: byId('download'),
  downloadNote: byId('download-note'),
  slotSelect: byId('slot-select'),
  layoutSelect: byId('layout-select'),
  layoutHint: byId('layout-hint'),
  headerFields: byId('header-fields'),
  nameInput: byId('name-input'),
  nameHint: byId('name-hint'),
  nameError: byId('name-error'),
  applyName: byId('apply-name'),
  playtimeInput: byId('playtime-input'),
  playtimeHint: byId('playtime-hint'),
  playtimeError: byId('playtime-error'),
  applyPlaytime: byId('apply-playtime'),
  goldInput: byId('gold-input'),
  goldHint: byId('gold-hint'),
  goldError: byId('gold-error'),
  applyGold: byId('apply-gold'),
  hrInput: byId('hr-input'),
  hrHint: byId('hr-hint'),
  hrError: byId('hr-error'),
  applyHr: byId('apply-hr'),
  genderSelect: byId('gender-select'),
  genderHint: byId('gender-hint'),
  genderError: byId('gender-error'),
  applyGender: byId('apply-gender'),
  invalidSummary: byId('invalid-summary'),
  invalidList: byId('invalid-list'),
  clearInvalid: byId('clear-invalid'),
  clearInvalidError: byId('clear-invalid-error'),
  itemsNote: byId('items-note'),
  itemsBody: byId('items-body'),
  helpStatus: byId('help-status'),
};

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

function setStatus(message) {
  dom.status.textContent = message;
}

function setError(node, message) {
  node.textContent = message ? `错误：${message}` : '';
}

function clearHeaderErrors() {
  setError(dom.nameError, '');
  setError(dom.playtimeError, '');
  setError(dom.goldError, '');
  setError(dom.hrError, '');
  setError(dom.genderError, '');
}

function parseUint(raw, label, max) {
  const text = String(raw).trim();
  if (!/^[0-9]+$/.test(text)) {
    throw new Error(`${label}：请输入 0 到 ${max} 的十进制整数`);
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value > max) {
    throw new Error(`${label}：${text} 超出允许范围 0..${max}`);
  }
  return value;
}

function onEnter(input, handler) {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handler();
  });
}

// Mirrors the header.mjs name rules with Chinese messages; the writer still performs
// the authoritative check.
function validateName(value) {
  if (value.includes('\u0000')) throw new Error('名字不能包含 U+0000');
  let chars = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error('名字里含有未配对的 UTF-16 代理项');
      }
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('名字里含有未配对的 UTF-16 代理项');
    }
    chars += 1;
  }
  if (chars > LIMITS.nameMaxChars) {
    throw new Error(`名字有 ${chars} 个字符，超过 ${LIMITS.nameMaxChars} 个字符的安全上限`);
  }
  const bytes = utf8Encoder.encode(value).length;
  if (bytes > LIMITS.nameMaxBytes) {
    throw new Error(`名字占 ${bytes} 字节，超过 ${LIMITS.nameMaxBytes} 字节的安全上限`);
  }
}

// ---------------------------------------------------------------------------
// Help entries (fetched as static JSON, one file per domain)
// ---------------------------------------------------------------------------

function helpCard(entry) {
  const confLabel = CONF_LABELS[entry.conf] || CONF_LABELS.U;
  const confClass = CONF_LABELS[entry.conf] ? entry.conf : 'U';
  return el('section', { class: 'help-card', 'aria-label': `${entry.title || entry.field} 帮助` }, [
    el('p', { class: 'help-head' }, [
      el('span', { class: `conf conf-${confClass}`, text: confLabel }),
      el('span', { class: 'help-title', text: entry.title || entry.field }),
    ]),
    el('p', { class: 'help-summary', text: entry.summary || '（帮助条目没有摘要）' }),
    el('p', { class: 'help-effect' }, [
      el('strong', { text: '改后影响：' }),
      entry.effect || '（帮助条目未给出）',
    ]),
    entry.risk
      ? el('p', { class: 'help-risk' }, [el('strong', { text: '风险：' }), entry.risk])
      : null,
    el('p', { class: 'help-source', text: `来源：${entry.source || '（未给出）'}` }),
  ]);
}

function renderHelp() {
  for (const holder of document.querySelectorAll('[data-help-field]')) {
    const field = holder.getAttribute('data-help-field');
    const entry = state.help.get(field);
    holder.replaceChildren();
    if (!entry) {
      holder.append(el('p', { class: 'help-missing', text: `（未找到字段 ${field} 的帮助条目）` }));
      continue;
    }
    holder.append(helpCard(entry));
  }
}

async function loadHelp() {
  const entries = new Map();
  const failures = [];
  const duplicates = new Set();

  await Promise.all(
    HELP_FILES.map(async (name) => {
      try {
        const response = await fetch(new URL(`../help/${name}`, import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const list = await response.json();
        if (!Array.isArray(list)) throw new Error('内容不是 JSON 数组');
        for (const entry of list) {
          if (!entry || typeof entry.field !== 'string' || entry.field === '') continue;
          if (entries.has(entry.field)) duplicates.add(entry.field);
          entries.set(entry.field, entry);
        }
      } catch (error) {
        failures.push(`${name}：${error.message}`);
      }
    }),
  );

  state.help = entries;
  renderHelp();

  const notes = [];
  if (failures.length > 0) {
    notes.push(
      `部分帮助数据加载失败：${failures.join('；')}。请确认页面由仓库根目录的静态服务器打开（例如在 G:/omp works/MHGU 运行 python -m http.server）。`,
    );
  }
  if (duplicates.size > 0) {
    notes.push(`帮助数据存在重复字段：${[...duplicates].join('、')}。`);
  }
  dom.helpStatus.textContent = notes.join(' ');
  if (notes.length > 0) setStatus(notes[0]);
}

// ---------------------------------------------------------------------------
// File load, slot selector and layout selector
// ---------------------------------------------------------------------------

function renderFileInfo() {
  if (!state.file) {
    dom.fileName.textContent = '—';
    dom.fileKind.textContent = '—';
    dom.fileSize.textContent = '—';
    return;
  }
  dom.fileName.textContent = state.fileName;
  dom.fileKind.textContent =
    state.file.kind === 'system' ? 'system 容器（3 个槽位）' : '.hnt 单槽文件';
  dom.fileSize.textContent = `${state.file.bytes.length.toLocaleString('zh-CN')} B`;
}

function renderSlotSelect() {
  dom.slotSelect.replaceChildren();
  if (!state.file) {
    dom.slotSelect.append(el('option', { value: '', text: '尚未载入存档' }));
    dom.slotSelect.disabled = true;
    return;
  }
  const count = state.file.slots.length;
  for (let index = 0; index < count; index += 1) {
    const label =
      state.file.kind === 'hnt' ? '单槽（.hnt）' : `槽位 ${index + 1}（索引 ${index}）`;
    dom.slotSelect.append(el('option', { value: String(index), text: label }));
  }
  dom.slotSelect.value = String(state.slotIndex);
  dom.slotSelect.disabled = count <= 1;
}

function updateLayoutHint() {
  if (!state.file) {
    dom.layoutHint.textContent =
      '两种布局没有可判定的字节标志，必须由你按存档来源明确选择。未选择前不显示道具箱，也不会写入任何槽位；选错布局会写到错误的区域。';
    return;
  }
  if (!state.layout) {
    const legacySlots = itemBoxSlotCount('legacy');
    const v7Slots = itemBoxSlotCount('v7');
    dom.layoutHint.textContent =
      `请选择布局：旧布局 ${legacySlots} 槽（${Math.ceil(legacySlots / ITEMS_PER_PAGE)} 页），` +
      `V7 布局 ${v7Slots} 槽（${Math.ceil(v7Slots / ITEMS_PER_PAGE)} 页）。` +
      '未选择前不显示道具箱；选错会写到错误的区域。';
    return;
  }
  const slots = itemBoxSlotCount(state.layout);
  dom.layoutHint.textContent =
    `当前：${state.layout === 'legacy' ? '旧布局 legacy' : 'V7 布局 v7'}，道具箱 ${slots} 槽` +
    `（${Math.ceil(slots / ITEMS_PER_PAGE)} 页）。布局没有字节标志，改选会重新扫描无效槽位。`;
}

function updateItemsNote() {
  if (!state.view) {
    dom.itemsNote.textContent = state.slotError
      ? `槽位 ${state.slotIndex} 无法解析，未显示道具箱。`
      : '载入存档并选择布局后显示道具箱。每页 100 槽。';
    return;
  }
  if (!state.layout) {
    dom.itemsNote.textContent = `道具箱未显示：请先选择存档布局。每页 ${ITEMS_PER_PAGE} 槽；文件槽号即界面槽号。`;
    return;
  }
  const slots = itemBoxSlotCount(state.layout);
  dom.itemsNote.textContent =
    `${slots} 槽，每页 ${ITEMS_PER_PAGE} 槽（共 ${Math.ceil(slots / ITEMS_PER_PAGE)} 页）；` +
    '文件槽号即界面槽号。编辑 ID 与数量后按 Enter、离开输入框或点击「写入」，整对值作为一次 19 位读改写提交。';
}

function renderDownload() {
  const ready = Boolean(state.file);
  dom.download.disabled = !ready;
  dom.downloadNote.textContent = ready
    ? `将导出「${state.fileName}.edited」（${state.file.bytes.length.toLocaleString('zh-CN')} B）。`
    : '导出文件名：<原文件名>.edited。';
}

async function handleFile(file) {
  state.file = null;
  state.view = null;
  state.slotError = '';
  state.slotIndex = 0;
  state.page = 0;
  state.layout = '';
  state.fileName = file.name || 'save';
  dom.layoutSelect.disabled = true;
  renderFileInfo();
  renderSlotSelect();
  renderDownload();
  syncHeaderInputs();
  renderInvalid();
  renderItems();
  updateLayoutHint();
  updateItemsNote();
  clearHeaderErrors();

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    setStatus(`读取文件失败：${error.message}`);
    return;
  }

  let opened;
  try {
    if (bytes.length === SYSTEM_SIZE) {
      opened = openSystem(bytes);
    } else if (bytes.length === HNT_SIZE) {
      opened = openHnt(bytes);
    } else {
      throw new Error(
        `文件大小 ${bytes.length.toLocaleString('zh-CN')} B 既不等于 system 的 ` +
          `${SYSTEM_SIZE.toLocaleString('zh-CN')} B，也不等于 .hnt 的 ` +
          `${HNT_SIZE.toLocaleString('zh-CN')} B，未载入。`,
      );
    }
    state.view = hunterView(opened, 0);
  } catch (error) {
    state.file = null;
    state.view = null;
    renderFileInfo();
    renderSlotSelect();
    renderDownload();
    syncHeaderInputs();
    renderInvalid();
    renderItems();
    updateLayoutHint();
    updateItemsNote();
    setStatus(`载入失败：${error.message}`);
    return;
  }

  state.file = opened;
  state.slotIndex = 0;
  dom.layoutSelect.disabled = false;
  dom.layoutSelect.value = state.layout;
  renderFileInfo();
  renderSlotSelect();
  renderDownload();
  syncHeaderInputs();
  updateLayoutHint();
  updateItemsNote();
  renderInvalid();
  renderItems();
  setStatus(
    `已载入「${state.fileName}」：${
      opened.kind === 'system' ? 'system 容器，3 个槽位' : '.hnt 单槽'
    }。请选择存档布局后才会显示道具箱。文件只在内存中。`,
  );
}

function handleSlotChange() {
  if (!state.file) return;
  const raw = dom.slotSelect.value;
  if (!/^[0-9]+$/.test(raw)) {
    setStatus('请选择有效槽位。');
    return;
  }
  const index = Number(raw);
  if (index >= state.file.slots.length) {
    setStatus(`槽位 ${raw} 不在 0..${state.file.slots.length - 1} 范围内。`);
    return;
  }
  let view;
  try {
    view = hunterView(state.file, index);
  } catch (error) {
    state.view = null;
    state.slotError = error.message;
    state.slotIndex = index;
    state.page = 0;
    syncHeaderInputs();
    renderInvalid();
    renderItems();
    updateItemsNote();
    renderDownload();
    setStatus(`槽位 ${index} 无法解析：${error.message}`);
    return;
  }
  state.view = view;
  state.slotError = '';
  state.slotIndex = index;
  state.page = 0;
  syncHeaderInputs();
  renderInvalid();
  renderItems();
  updateItemsNote();
  renderDownload();
  setStatus(`已切换到槽位索引 ${index}（只改内存）。`);
}

function selectedLayout() {
  const picked = dom.layoutSelect.value;
  return picked === 'legacy' || picked === 'v7' ? picked : '';
}

function handleLayoutChange() {
  state.layout = selectedLayout();
  state.page = 0;
  updateLayoutHint();
  updateItemsNote();
  renderInvalid();
  renderItems();
  setStatus(
    state.layout
      ? `布局已设为 ${state.layout === 'legacy' ? '旧布局（legacy）' : 'V7（v7）'}；已重新扫描无效槽位。`
      : '尚未选择布局。',
  );
}

// ---------------------------------------------------------------------------
// Header fields
// ---------------------------------------------------------------------------

function fillGender(value) {
  dom.genderSelect.replaceChildren();
  for (const optionValue of [0, 1]) {
    dom.genderSelect.append(el('option', { value: String(optionValue), text: String(optionValue) }));
  }
  if (value === null) {
    dom.genderSelect.disabled = true;
    return;
  }
  dom.genderSelect.disabled = false;
  if (value !== 0 && value !== 1) {
    dom.genderSelect.append(
      el('option', {
        value: String(value),
        text: `${value}（游戏产生的值，编辑器不写入）`,
        disabled: true,
      }),
    );
  }
  dom.genderSelect.value = String(value);
}

function syncHeaderInputs() {
  clearHeaderErrors();
  const view = state.view;
  dom.headerFields.disabled = !view;
  if (!view) {
    dom.nameInput.value = '';
    dom.playtimeInput.value = '';
    dom.goldInput.value = '';
    dom.hrInput.value = '';
    fillGender(null);
    return;
  }
  try {
    dom.nameInput.value = readName(view);
  } catch (error) {
    dom.nameInput.value = '';
    setError(dom.nameError, error.message);
  }
  try {
    dom.playtimeInput.value = String(readPlaytime(view));
  } catch (error) {
    dom.playtimeInput.value = '';
    setError(dom.playtimeError, error.message);
  }
  try {
    dom.goldInput.value = String(readGold(view));
  } catch (error) {
    dom.goldInput.value = '';
    setError(dom.goldError, error.message);
  }
  try {
    dom.hrInput.value = String(readHr(view));
  } catch (error) {
    dom.hrInput.value = '';
    setError(dom.hrError, error.message);
  }
  try {
    fillGender(readGender(view));
  } catch (error) {
    fillGender(null);
    setError(dom.genderError, error.message);
  }
}

function applyName() {
  setError(dom.nameError, '');
  if (!state.view) {
    setError(dom.nameError, '请先载入存档并选择槽位');
    return;
  }
  try {
    validateName(dom.nameInput.value);
    writeName(state.view, dom.nameInput.value);
  } catch (error) {
    setError(dom.nameError, error.message);
    return;
  }
  dom.nameInput.value = readName(state.view);
  setStatus('猎人名字已写入内存。');
}

function applyNumericField({ input, errorNode, label, max, writer, reader, describe }) {
  setError(errorNode, '');
  if (!state.view) {
    setError(errorNode, '请先载入存档并选择槽位');
    return;
  }
  let value;
  try {
    value = parseUint(input.value, label, max);
  } catch (error) {
    setError(errorNode, error.message);
    return;
  }
  try {
    writer(state.view, value);
    input.value = String(reader(state.view));
    setStatus(`${describe(value)} 已写入内存。`);
  } catch (error) {
    setError(errorNode, error.message);
  }
}

function applyPlaytime() {
  applyNumericField({
    input: dom.playtimeInput,
    errorNode: dom.playtimeError,
    label: '游戏时间',
    max: LIMITS.playtime,
    writer: writePlaytime,
    reader: readPlaytime,
    describe: (value) => `游戏时间 ${value} 秒`,
  });
}

function applyGold() {
  applyNumericField({
    input: dom.goldInput,
    errorNode: dom.goldError,
    label: '金钱',
    max: LIMITS.gold,
    writer: writeGold,
    reader: readGold,
    describe: (value) => `金钱 ${value} z`,
  });
}

function applyHr() {
  applyNumericField({
    input: dom.hrInput,
    errorNode: dom.hrError,
    label: 'HR',
    max: LIMITS.hr,
    writer: writeHr,
    reader: readHr,
    describe: (value) => `HR ${value}`,
  });
}

function applyGender() {
  setError(dom.genderError, '');
  if (!state.view) {
    setError(dom.genderError, '请先载入存档并选择槽位');
    return;
  }
  const raw = dom.genderSelect.value;
  if (raw !== '0' && raw !== '1') {
    setError(dom.genderError, '性别只能写入 0 或 1；当前是游戏产生的特殊值，保持不变。');
    return;
  }
  const value = Number(raw);
  try {
    writeGender(state.view, value);
    dom.genderSelect.value = String(readGender(state.view));
  } catch (error) {
    setError(dom.genderError, error.message);
    return;
  }
  setStatus(`性别已写入内存：${value}。`);
}

// ---------------------------------------------------------------------------
// Invalid item slots
// ---------------------------------------------------------------------------

function renderInvalid() {
  dom.invalidList.replaceChildren();
  setError(dom.clearInvalidError, '');

  if (!state.view) {
    dom.invalidSummary.textContent = '载入存档后检查。';
    dom.clearInvalid.disabled = true;
    return;
  }
  if (!state.layout) {
    dom.invalidSummary.textContent = '选择存档布局后检查无效槽位（未选择布局前无法扫描）。';
    dom.clearInvalid.disabled = true;
    return;
  }

  let invalid;
  try {
    invalid = findInvalidItemSlots(state.view, state.layout);
  } catch (error) {
    dom.invalidSummary.textContent = `检查失败：${error.message}`;
    dom.clearInvalid.disabled = true;
    return;
  }

  const clearable = invalid.filter((entry) => entry.kind !== 'out-of-range').length;
  dom.clearInvalid.disabled = clearable === 0;

  if (invalid.length === 0) {
    dom.invalidSummary.textContent = '未发现无效槽位：道具箱与口袋的 ID/数量都在文档域内。';
    return;
  }

  dom.invalidSummary.textContent =
    `发现 ${invalid.length} 个无效槽位，其中 ${clearable} 个可清除、` +
    `${invalid.length - clearable} 个越界槽位需手动处理。`;

  const head = el('thead', {}, [
    el('tr', {}, [
      el('th', { scope: 'col', text: '区域' }),
      el('th', { scope: 'col', text: '槽号' }),
      el('th', { scope: 'col', text: 'ID' }),
      el('th', { scope: 'col', text: '数量' }),
      el('th', { scope: 'col', text: '类型' }),
    ]),
  ]);
  const body = el(
    'tbody',
    {},
    invalid.map((entry) =>
      el('tr', {}, [
        el('td', { text: AREA_LABELS[entry.area] || entry.area }),
        el('td', { text: String(entry.index) }),
        el('td', { text: String(entry.id) }),
        el('td', { text: String(entry.count) }),
        el('td', { text: INVALID_KIND_LABELS[entry.kind] || entry.kind }),
      ]),
    ),
  );
  dom.invalidList.append(
    el('table', { class: 'invalid' }, [
      el('caption', { class: 'visually-hidden', text: '无效槽位列表' }),
      head,
      body,
    ]),
  );

  if (invalid.some((entry) => entry.area === 'pouch')) {
    dom.invalidList.append(
      el('p', {
        class: 'hint',
        text: '口袋槽号按文件顺序编号；它与游戏界面行号的对应关系尚无文档结论。',
      }),
    );
  }
}

function handleClearInvalid() {
  setError(dom.clearInvalidError, '');
  if (!state.view || !state.layout) {
    setError(dom.clearInvalidError, '请先载入存档并选择布局');
    return;
  }
  let cleared;
  let remaining;
  try {
    cleared = clearInvalidItemSlots(state.view, state.layout);
    remaining = findInvalidItemSlots(state.view, state.layout).length;
  } catch (error) {
    setError(dom.clearInvalidError, error.message);
    return;
  }
  renderInvalid();
  renderItems();
  setStatus(
    `已清除 ${cleared} 个无效槽位（内存中）；仍有 ${remaining} 个槽位未处理` +
      `${remaining > 0 ? '，越界槽位需要手动决定' : ''}。`,
  );
}

// ---------------------------------------------------------------------------
// Item box table (100 slots per page)
// ---------------------------------------------------------------------------

function gotoPage(page, focusId) {
  const slots = state.layout ? itemBoxSlotCount(state.layout) : 0;
  const pageCount = Math.max(1, Math.ceil(slots / ITEMS_PER_PAGE));
  state.page = Math.min(Math.max(page, 0), pageCount - 1);
  renderItems();
  restorePagerFocus(focusId);
}

// renderItems() rebuilds the whole items area, so the pager control that was activated
// is gone by the time the page changed. Refocus it by id; a button that reached an end
// page is re-rendered disabled and cannot take focus, so fall back to the page select.
function restorePagerFocus(focusId) {
  if (!focusId) return;
  const target = document.getElementById(focusId);
  if (target && !target.disabled) {
    target.focus();
    return;
  }
  const fallback = document.getElementById(PAGE_CONTROL_IDS.select);
  if (fallback && !fallback.disabled) fallback.focus();
}

function commitSlot(index, idInput, countInput, noteNode, errorNode) {
  setError(errorNode, '');
  if (!state.view || !state.layout) {
    setError(errorNode, '尚未载入存档或未选择布局');
    return;
  }

  let id;
  let count;
  try {
    id = parseUint(idInput.value, `槽位 ${index} 的道具 ID`, ITEM_ID_MAX);
    count = parseUint(countInput.value, `槽位 ${index} 的数量`, ITEM_COUNT_MAX);
    if ((id === 0) !== (count === 0)) {
      throw new Error('ID 与数量必须同时为 0（空槽），或者同时非 0 且在允许范围内');
    }
  } catch (error) {
    setError(errorNode, error.message);
    return;
  }

  try {
    writeItemBoxSlot(state.view, state.layout, index, { id, count });
  } catch (error) {
    setError(errorNode, error.message);
    setStatus(`槽位 ${index} 写入失败：${error.message}`);
    return;
  }

  let slot;
  try {
    slot = readItemBoxSlot(state.view, state.layout, index);
  } catch (error) {
    setError(errorNode, error.message);
    return;
  }
  idInput.value = String(slot.id);
  countInput.value = String(slot.count);
  noteNode.textContent = slot.valid
    ? ''
    : `注意：读取值不在文档域（ID ${slot.id}，数量 ${slot.count}）。`;
  setStatus(`槽位 ${index} 已写入内存：ID ${slot.id}，数量 ${slot.count}。`);
  renderInvalid();
}

function buildItemRow(index, slot) {
  const idInput = el('input', {
    type: 'number',
    min: '0',
    max: String(ITEM_ID_MAX),
    step: '1',
    inputmode: 'numeric',
    value: String(slot.id),
    'aria-label': `槽位 ${index} 的道具 ID`,
  });
  const countInput = el('input', {
    type: 'number',
    min: '0',
    max: String(ITEM_COUNT_MAX),
    step: '1',
    inputmode: 'numeric',
    value: String(slot.count),
    'aria-label': `槽位 ${index} 的数量`,
  });
  const note = el('p', {
    class: 'warning',
    text: slot.valid ? '' : `注意：读取值不在文档域（ID ${slot.id}，数量 ${slot.count}）。`,
  });
  const error = el('p', { class: 'error', role: 'alert' });
  const writeButton = el('button', { type: 'button', class: 'apply', text: '写入' });

  const commit = () => commitSlot(index, idInput, countInput, note, error);
  writeButton.addEventListener('click', commit);
  for (const input of [idInput, countInput]) {
    input.addEventListener('change', commit);
    onEnter(input, commit);
  }

  return el('tr', {}, [
    el('th', { scope: 'row', text: String(index) }),
    el('td', {}, [idInput]),
    el('td', {}, [countInput]),
    el('td', {}, [writeButton]),
    el('td', { class: 'row-status' }, [note, error]),
  ]);
}

function renderItems() {
  dom.itemsBody.replaceChildren();

  if (!state.view) {
    if (state.slotError) {
      dom.itemsBody.append(
        el('p', {
          class: 'error',
          role: 'alert',
          text: `槽位 ${state.slotIndex} 无法解析：${state.slotError}`,
        }),
        el('p', { class: 'empty', text: '请切换到其他槽位或重新选择存档文件。' }),
      );
      return;
    }
    dom.itemsBody.append(el('p', { class: 'empty', text: '请先载入存档文件。' }));
    return;
  }
  if (!state.layout) {
    dom.itemsBody.append(
      el('p', {
        class: 'empty',
        text: '请先在上方选择存档布局（旧布局或 V7）。未选择前不会显示道具箱，也不会写入任何槽位。',
      }),
    );
    return;
  }

  let slots;
  let box;
  try {
    slots = itemBoxSlotCount(state.layout);
    box = readItemBox(state.view, state.layout);
  } catch (error) {
    dom.itemsBody.append(
      el('p', { class: 'error', role: 'alert', text: `读取道具箱失败：${error.message}` }),
    );
    return;
  }

  const pageCount = Math.max(1, Math.ceil(slots / ITEMS_PER_PAGE));
  state.page = Math.min(Math.max(state.page, 0), pageCount - 1);
  const start = state.page * ITEMS_PER_PAGE;
  const end = Math.min(start + ITEMS_PER_PAGE, slots);

  const pageSelect = el('select', { id: PAGE_CONTROL_IDS.select, 'aria-label': '跳转到道具箱页码' });
  for (let page = 0; page < pageCount; page += 1) {
    const from = page * ITEMS_PER_PAGE;
    const to = Math.min(from + ITEMS_PER_PAGE, slots) - 1;
    pageSelect.append(
      el('option', {
        value: String(page),
        text: `第 ${page + 1} / ${pageCount} 页（槽 ${from}–${to}）`,
      }),
    );
  }
  pageSelect.value = String(state.page);
  pageSelect.addEventListener('change', () =>
    gotoPage(Number(pageSelect.value), PAGE_CONTROL_IDS.select),
  );

  const pager = el('div', { class: 'pager' }, [
    el('button', {
      type: 'button',
      class: 'apply',
      id: PAGE_CONTROL_IDS.prev,
      text: '上一页',
      disabled: state.page === 0,
      onclick: () => gotoPage(state.page - 1, PAGE_CONTROL_IDS.prev),
    }),
    el('label', {
      class: 'visually-hidden',
      for: PAGE_CONTROL_IDS.select,
      text: '跳转到道具箱页码',
    }),
    pageSelect,
    el('button', {
      type: 'button',
      class: 'apply',
      id: PAGE_CONTROL_IDS.next,
      text: '下一页',
      disabled: state.page === pageCount - 1,
      onclick: () => gotoPage(state.page + 1, PAGE_CONTROL_IDS.next),
    }),
    el('span', {
      class: 'pager-info',
      text: `第 ${state.page + 1} / ${pageCount} 页 · 槽位 ${start}–${end - 1}（共 ${slots} 槽）`,
    }),
  ]);

  const rows = [];
  for (let index = start; index < end; index += 1) {
    rows.push(buildItemRow(index, box[index]));
  }

  const table = el('table', { class: 'slots' }, [
    el('caption', {
      class: 'visually-hidden',
      text: `道具箱槽位，第 ${state.page + 1} 页，共 ${pageCount} 页`,
    }),
    el('thead', {}, [
      el('tr', {}, [
        el('th', { scope: 'col', text: '槽位' }),
        el('th', { scope: 'col', text: '道具 ID' }),
        el('th', { scope: 'col', text: '数量' }),
        el('th', { scope: 'col', text: '操作' }),
        el('th', { scope: 'col', text: '状态' }),
      ]),
    ]),
    el('tbody', {}, rows),
  ]);

  dom.itemsBody.append(pager, el('div', { class: 'table-scroll' }, [table]));
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

function handleDownload() {
  if (!state.file) return;
  try {
    const blob = new Blob([state.file.bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `${state.fileName}.edited` });
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    setStatus(`已开始下载「${state.fileName}.edited」。原文件未被修改。`);
  } catch (error) {
    dom.downloadNote.textContent = `导出失败：${error.message}`;
    setStatus(`导出失败：${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function initHints() {
  dom.nameInput.maxLength = LIMITS.nameMaxChars;
  dom.playtimeInput.max = String(LIMITS.playtime);
  dom.goldInput.max = String(LIMITS.gold);
  dom.hrInput.max = String(LIMITS.hr);

  dom.nameHint.textContent =
    `安全上限 ${LIMITS.nameMaxChars} 个字符 / ${LIMITS.nameMaxBytes} UTF-8 字节（未确认）；` +
    `字段宽 ${LIMITS.nameFieldBytes} B，超长由核心库拒绝而不是截断。`;
  dom.playtimeHint.textContent =
    `允许 0..${LIMITS.playtime} 秒；游戏侧上限未确认，界面占位参考 ${LIMITS.playtimeUiCap} 秒。`;
  dom.goldHint.textContent =
    `允许 0..${LIMITS.gold}；游戏侧上限未确认，界面占位参考 ${LIMITS.goldUiCap}。` +
    'char_off 10255 的镜像不写。';
  dom.hrHint.textContent =
    `允许 0..${LIMITS.hr}（16 位字段 @0x0028）；游戏侧上限未确认，界面占位参考 ${LIMITS.hrUiCap}。` +
    '编辑 HR 不能当作解锁 HR 门槛任务的手段。';
}

function wireEvents() {
  dom.fileInput.addEventListener('change', () => {
    const file = dom.fileInput.files && dom.fileInput.files[0];
    if (file) void handleFile(file);
  });
  dom.slotSelect.addEventListener('change', handleSlotChange);
  dom.layoutSelect.addEventListener('change', handleLayoutChange);
  dom.download.addEventListener('click', handleDownload);
  dom.clearInvalid.addEventListener('click', handleClearInvalid);

  dom.applyName.addEventListener('click', applyName);
  dom.applyPlaytime.addEventListener('click', applyPlaytime);
  dom.applyGold.addEventListener('click', applyGold);
  dom.applyHr.addEventListener('click', applyHr);
  dom.applyGender.addEventListener('click', applyGender);

  onEnter(dom.nameInput, applyName);
  onEnter(dom.playtimeInput, applyPlaytime);
  onEnter(dom.goldInput, applyGold);
  onEnter(dom.hrInput, applyHr);
}

function init() {
  initHints();
  wireEvents();
  state.layout = selectedLayout();
  renderFileInfo();
  renderSlotSelect();
  syncHeaderInputs();
  renderDownload();
  renderInvalid();
  renderItems();
  updateLayoutHint();
  updateItemsNote();
  setStatus('请选择存档文件（system 或 .hnt）。');
  void loadHelp();
}

init();
