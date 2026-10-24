// Client for the dbgport plugin: node dbg.mjs <command...> [; <command> ...]
// Example: node dbg.mjs "mask" ";" "tap 100 6" ";" "mask"
import net from 'node:net';
const port = Number(process.env.DBGPORT ?? 47100);
const cmds = process.argv.slice(2).join(' ').split(';').map(s => s.trim()).filter(Boolean);
const s = net.connect(port, '127.0.0.1');
let buf = '', i = 0;
const next = () => (i < cmds.length ? s.write(cmds[i] + '\n') : s.end());
s.on('connect', next);
s.on('error', e => { console.error(`dbgport: ${e.code} (is the game running with DbgPort loaded?)`); process.exit(1); });
s.on('data', d => {
  buf += d;
  for (let k; (k = buf.indexOf('\n')) >= 0; buf = buf.slice(k + 1)) { console.log(`${cmds[i]} -> ${buf.slice(0, k)}`); i++; next(); }
});
