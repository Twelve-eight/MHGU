// SPDX-License-Identifier: MIT
// Serve only the editor's shipped assets. Saves never pass through this server.
// Usage from the extracted package: node serve.mjs [port] (default: a free port).
import http from 'node:http';
import fs from 'node:fs';

const portArg = process.argv[2] ?? '0';
if (process.argv.length > 3 || !/^\d+$/.test(portArg) || Number(portArg) > 65535) {
  console.error('用法：node serve.mjs [0..65535]；省略端口时自动选择空闲端口。');
  process.exit(2);
}

const paths = [
  'ui/index.html', 'ui/app.mjs', 'ui/style.css',
  'core/container.mjs', 'core/header.mjs', 'core/items.mjs',
  'help/header.json', 'help/items.json', 'help/equipment.json',
  'help/monster.json', 'help/palico.json', 'help/progress.json',
];
const types = {
  html: 'text/html; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
};
const assets = new Map(paths.map((name) => [
  `/${name}`,
  { bytes: fs.readFileSync(new URL(name, import.meta.url)), type: types[name.split('.').at(-1)] },
]));

const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control', 'no-store');
  const port = server.address().port;
  const host = port === 80 ? '127.0.0.1' : `127.0.0.1:${port}`;
  if (req.headers.host !== host ||
      (req.headers.origin && req.headers.origin !== `http://${host}`) ||
      req.headers['sec-fetch-site'] === 'cross-site') {
    res.writeHead(403).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = req.url?.split('?')[0];
  if (pathname === '/') {
    res.writeHead(302, { Location: '/ui/index.html' }).end();
    return;
  }
  const asset = assets.get(pathname);
  if (!asset) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': asset.bytes.length });
  res.end(req.method === 'HEAD' ? undefined : asset.bytes);
});
server.on('error', (error) => {
  console.error(`本机编辑器启动失败：${error.message}`);
  process.exitCode = 1;
});
server.listen(Number(portArg), '127.0.0.1', () => {
  console.log(`MHGU 编辑器：http://127.0.0.1:${server.address().port}/ui/index.html`);
  console.log('仅提供页面和帮助文件；存档只在浏览器内存中处理。按 Ctrl+C 停止。');
});
