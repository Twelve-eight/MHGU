// SPDX-License-Identifier: MIT
// Run against the extracted package: node --test test/serve.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

function request(port, pathname, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('request timeout')));
    req.end();
  });
}

test('extracted editor serves help but cannot serve arbitrary files or accept writes', { timeout: 15000 }, async (t) => {
  const child = spawn(process.execPath, ['--max-old-space-size=64', fileURLToPath(new URL('../serve.mjs', import.meta.url))], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const exited = once(child, 'exit');
  // Consume failures immediately; awaited again during cleanup.
  exited.catch(() => {});
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`server did not become ready: ${output}`)), 5000);
    const append = (chunk) => {
      output += chunk.toString('utf8');
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/ui\/index\.html/.exec(output);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      else if (output.length > 8192) { clearTimeout(timer); reject(new Error('unexpected server output')); }
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited ${code}: ${output}`)); });
  });

  const root = await request(port, '/');
  assert.equal(root.status, 302);
  assert.equal(root.headers.location, '/ui/index.html');
  const page = await request(port, root.headers.location);
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  const head = await request(port, '/ui/index.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), page.body.length);
  const script = await request(port, '/ui/app.mjs');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /^text\/javascript/);
  assert.equal(script.headers['x-content-type-options'], 'nosniff');
  assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/);

  for (const domain of ['header', 'items', 'equipment', 'monster', 'palico', 'progress']) {
    const response = await request(port, `/help/${domain}.json`);
    assert.equal(response.status, 200, domain);
    const entries = JSON.parse(response.body.toString('utf8'));
    assert.ok(entries.some((entry) => typeof entry.field === 'string' && entry.summary), `help content: ${domain}`);
  }
  for (const pathname of ['/README.md', '/test/roundtrip.mjs', '/ui/../README.md', '/%2e%2e/system', '/system', '/ui/']) {
    assert.equal((await request(port, pathname)).status, 404, pathname);
  }
  assert.equal((await request(port, '/ui/index.html', { method: 'POST' })).status, 405);
  assert.equal((await request(port, '/ui/index.html', { headers: { Host: `untrusted.example:${port}` } })).status, 403);
  assert.equal((await request(port, '/ui/index.html', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await request(port, '/ui/index.html', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request(port, '/ui/index.html', { headers: { Origin: `http://127.0.0.1:${port}` } })).status, 200);
});

test('HTTP default port accepts the browser canonical Host and Origin', async () => {
  // Exercise the real handler without reserving privileged/system port 80.
  const createServer = http.createServer;
  let handler;
  http.createServer = (callback) => {
    handler = callback;
    return { address: () => ({ port: 80 }), on() {}, listen() {} };
  };
  try {
    await import(new URL('../serve.mjs?default-port-control', import.meta.url));
  } finally {
    http.createServer = createServer;
  }
  function status(headers) {
    let code;
    handler({ method: 'GET', url: '/ui/index.html', headers }, {
      setHeader() {}, writeHead(value) { code = value; return this; }, end() {},
    });
    return code;
  }
  assert.equal(status({ host: '127.0.0.1', origin: 'http://127.0.0.1' }), 200);
  assert.equal(status({ host: 'untrusted.example', origin: 'http://127.0.0.1' }), 403);
  assert.equal(status({ host: '127.0.0.1', origin: 'https://untrusted.example' }), 403);
});
