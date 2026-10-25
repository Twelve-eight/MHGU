#!/usr/bin/env node
// Read-only MCP server (stdio, newline-delimited JSON-RPC 2.0) exposing the MHGU
// reverse-engineering helpers to subagents that have no shell: disassembly, direct-call /
// literal xrefs, function-start heuristic and bounded byte reads of whitelisted local files.
// Zero dependencies. Never writes anything. Heuristic limits are stated in each tool's
// description so callers do not over-read "0 hits".
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'G:/omp works';
const arm = await import(pathToFileURL(path.join(ROOT, 'MHGU/tools/mhgu/arm32.mjs')).href);
// Byte reads are allowed only below these roots. Both sides are compared after realpath, so a
// junction or hard-link target outside the roots is refused. Key material (`.tmp/mhgu/keys`,
// `.tmp/mhgu/prod.keys`) is deliberately not under any root.
const READ_ROOTS = [
  path.join(ROOT, '.tmp/mhgu/extract'),
  path.join(ROOT, '.tmp/mhgu/yure'),
  path.join(ROOT, 'MHGU-private/romfs-extract'),
  path.join(ROOT, 'MHGU/save-snapshots'),
  'G:/mhgu-romfs/romfs',
].flatMap((p) => {
  try {
    return [fs.realpathSync(p).toLowerCase()];
  } catch {
    return []; // root absent on this machine: simply not readable
  }
});
const DENY_NAME = /(^|[\\/])(prod|title|dev)\.keys$|\.keys$/i;

const MAX_INSNS = 400;
const MAX_BYTES = 4096;
const MAX_HITS = 500;
let starts = null; // functionStarts() is a full .text scan; cache it.
const IMAGE_END = arm.buf.length - 0x100; // last readable vaddr + 1

function num(v, name) {
  if (v === '' || v === null || v === undefined) throw new Error(`${name} is required`);
  const n = typeof v === 'string' ? Number(v) : v; // accepts "0x1a2b" and decimals
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer or 0x-hex string`);
  return n;
}
function vaddrIn(v, name, span = 4) {
  const n = num(v, name);
  if (n + span > IMAGE_END) throw new Error(`${name} ${hex(n)} outside image (end ${hex(IMAGE_END)})`);
  return n;
}
function list(v, name) {
  if (!Array.isArray(v) || v.length === 0) throw new Error(`${name} must be a non-empty array`);
  return v.map((x, i) => num(x, `${name}[${i}]`));
}
const hex = (n) => '0x' + (n >>> 0).toString(16);

function allowedPath(p) {
  if (DENY_NAME.test(p)) throw new Error('key files are never readable');
  let r;
  try {
    r = fs.realpathSync(p);
  } catch {
    throw new Error(`no such file: ${p}`);
  }
  const lr = r.toLowerCase();
  if (DENY_NAME.test(lr) || !READ_ROOTS.some((root) => lr === root || lr.startsWith(root + path.sep))) {
    throw new Error(`path not in read whitelist: ${READ_ROOTS.join(', ')}`);
  }
  if (!fs.statSync(r).isFile()) throw new Error(`not a regular file: ${p}`);
  return r;
}

const VADDR = { type: ['string', 'integer'], description: 'vaddr: 0x-hex string or integer' };
const VLIST = { type: 'array', items: VADDR, minItems: 1 };

const TOOLS = {
  disasm: {
    description: 'Linear disassembly of MHGU main (1.4.0, ARMv7, vaddr = flat - 0x100). Returns "vaddr: word  mnemonic" lines.',
    props: { vaddr: VADDR, count: { type: 'integer', minimum: 1, maximum: MAX_INSNS } },
    required: ['vaddr', 'count'],
    run: (a) => arm.disasm(vaddrIn(a.vaddr, 'vaddr'), Math.min(num(a.count, 'count'), MAX_INSNS)),
  },
  read_words: {
    description: 'Read u32 little-endian words from MHGU main at a vaddr (data, literal pools, GOT).',
    props: { vaddr: VADDR, count: { type: 'integer', minimum: 1, maximum: 256 } },
    required: ['vaddr', 'count'],
    run: (a) => {
      const n = Math.min(num(a.count, 'count'), 256);
      const v = vaddrIn(a.vaddr, 'vaddr', 4 * n);
      const out = [];
      for (let i = 0; i < n; i++) out.push(`${hex(v + 4 * i)}: ${arm.rd32(v + 4 * i).toString(16).padStart(8, '0')}`);
      return out.join('\n');
    },
  },
  calls_to: {
    description:
      'Direct calls only: bl / blx-immediate sites in .text targeting the given vaddrs. ' +
      'Does NOT find plain b tail-calls, blx rN, or function-pointer tables; 0 hits does not mean "no caller".',
    props: { targets: VLIST },
    required: ['targets'],
    run: (a) => {
      const hits = arm.findCallsTo(list(a.targets, 'targets'));
      const lines = hits.slice(0, MAX_HITS).map((h) => `${hex(h.from)} -> ${hex(h.to)}`);
      return `${hits.length} direct-call hit(s)${hits.length > MAX_HITS ? `, first ${MAX_HITS} shown` : ''}\n${lines.join('\n')}`;
    },
  },
  literal_loads: {
    description:
      'Code sites that materialise the given u32 constants within [start,end): ldr rX,[pc,#imm] (any condition), ' +
      'vldr [pc,#imm], and movw rX,#lo + movt rX,#hi (movt within 8 insns). Misses constants built by ' +
      'add/orr chains, mov+lsl, or movw/movt split across a branch; 0 hits is not proof of absence.',
    props: { start: VADDR, end: VADDR, values: VLIST },
    required: ['start', 'end', 'values'],
    run: (a) => {
      const start = vaddrIn(a.start, 'start');
      const end = Math.min(num(a.end, 'end'), arm.TEXT_END);
      const hits = arm.findLiteralLoads(start, end, list(a.values, 'values'));
      return `${hits.length} hit(s)\n` + hits.slice(0, MAX_HITS).map((h) => `${hex(h.from)} ${h.kind} ${h.reg} <- ${h.kind === 'movw/movt' ? `movt@${hex(h.lit)}` : `[${hex(h.lit)}]`} = ${hex(h.value)}`).join('\n');
    },
  },
  function_start: {
    description:
      'Heuristic: nearest preceding push {...,lr} for each vaddr. Leaf functions without that prologue ' +
      'are attributed to the previous function; "none" when no prologue precedes.',
    props: { vaddrs: VLIST },
    required: ['vaddrs'],
    run: (a) => {
      starts ??= arm.functionStarts();
      return list(a.vaddrs, 'vaddrs')
        .map((v) => {
          const s = arm.nearestFunctionStart(v, starts);
          return `${hex(v)} in fn ${s < 0 ? 'none' : hex(s)}`;
        })
        .join('\n');
    },
  },
  read_bytes: {
    description: `Hex dump of a whitelisted local file (exefs extract, romfs, private romfs extract, save snapshots, yure scratch; never key files). Max ${MAX_BYTES} bytes.`,
    props: { path: { type: 'string' }, offset: { type: 'integer', minimum: 0 }, length: { type: 'integer', minimum: 1, maximum: MAX_BYTES } },
    required: ['path', 'offset', 'length'],
    run: (a) => {
      const p = allowedPath(String(a.path));
      const off = num(a.offset, 'offset');
      const len = Math.min(num(a.length, 'length'), MAX_BYTES);
      const fd = fs.openSync(p, 'r');
      try {
        const size = fs.fstatSync(fd).size;
        const b = Buffer.alloc(Math.max(0, Math.min(len, size - off)));
        fs.readSync(fd, b, 0, b.length, off);
        const rows = [`size ${size}`];
        for (let i = 0; i < b.length; i += 16) {
          rows.push(`${(off + i).toString(16).padStart(8, '0')}: ${[...b.subarray(i, i + 16)].map((x) => x.toString(16).padStart(2, '0')).join(' ')}`);
        }
        return rows.join('\n');
      } finally {
        fs.closeSync(fd);
      }
    },
  },
};

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    name,
    description: t.description,
    inputSchema: { type: 'object', properties: t.props, required: t.required, additionalProperties: false },
  }));
}

// Protocol versions this server implements; a client asking for anything else gets the latest.
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    const v = PROTOCOLS.includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOLS[0];
    return { protocolVersion: v, capabilities: { tools: {} }, serverInfo: { name: 'mhgu-re', version: '1.5.0' } };
  }
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: toolList() };
  if (method === 'tools/call') {
    const t = TOOLS[params?.name];
    if (!t) throw Object.assign(new Error(`unknown tool ${params?.name}`), { code: -32602 });
    try {
      return { content: [{ type: 'text', text: t.run(params.arguments ?? {}) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `error: ${e.message}` }], isError: true };
    }
  }
  if (id === undefined) return undefined; // notification
  throw Object.assign(new Error(`method not found: ${method}`), { code: -32601 });
}

// Returns the response object for one request, or undefined for notifications.
function respond(msg) {
  if (msg === null || typeof msg !== 'object' || Array.isArray(msg)) {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid request' } };
  }
  try {
    const result = handle(msg);
    return msg.id !== undefined && result !== undefined ? { jsonrpc: '2.0', id: msg.id, result } : undefined;
  } catch (e) {
    return msg.id !== undefined ? { jsonrpc: '2.0', id: msg.id, error: { code: e.code ?? -32603, message: e.message } } : undefined;
  }
}

let pending = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  pending += chunk;
  let nl;
  while ((nl = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, nl).trim();
    pending = pending.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n');
      continue;
    }
    // JSON-RPC batch: answer every request in one array; an all-notification batch gets no reply.
    const out = Array.isArray(msg)
      ? msg.length === 0
        ? { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'empty batch' } }
        : msg.map(respond).filter(Boolean)
      : respond(msg);
    if (out !== undefined && !(Array.isArray(out) && out.length === 0)) process.stdout.write(JSON.stringify(out) + '\n');
  }
});
