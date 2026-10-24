// Run a button macro through the dbgport plugin and optionally screenshot at the end.
//   node macro.mjs "A A wait:2000 Down A" [--shot=name] [--frames=4]
// Tokens: button names (A B X Y L R ZL ZR Plus Minus Left Up Right Down, joined with + for chords,
// e.g. L+Y), wait:<ms>, hold:<bits-hex>:<frames>. Each button token is a tap of --frames game
// updates followed by a 300 ms pause. --shot writes .tmp/mhgu-scratch/<name>.png (640x360).
import net from 'node:net';
import { execFileSync } from 'node:child_process';

const BITS = { A: 0x1, B: 0x2, X: 0x4, Y: 0x8, L: 0x40, R: 0x80, ZL: 0x100, ZR: 0x200, Plus: 0x400, Minus: 0x800,
  Left: 0x1000, Up: 0x2000, Right: 0x4000, Down: 0x8000 };
const args = process.argv.slice(2);
const opt = k => args.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const seq = args.filter(a => !a.startsWith('--')).join(' ').split(/\s+/).filter(Boolean);
const frames = Number(opt('frames') ?? 4);
const SCRATCH = 'G:\\omp works\\.tmp\\mhgu-scratch';

const sock = net.connect(Number(process.env.DBGPORT ?? 47100), '127.0.0.1');
let buf = '';
const waiters = [];
sock.on('data', d => {
  buf += d;
  for (let k; (k = buf.indexOf('\n')) >= 0; buf = buf.slice(k + 1)) waiters.shift()?.(buf.slice(0, k));
});
sock.on('error', e => { console.error(`dbgport: ${e.code}`); process.exit(1); });
const cmd = c => new Promise(r => { waiters.push(r); sock.write(c + '\n'); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

await new Promise(r => sock.on('connect', r));
for (const t of seq) {
  if (t.startsWith('wait:')) { await sleep(Number(t.slice(5))); continue; }
  if (t.startsWith('hold:')) {
    const [, bits, n] = t.split(':');
    console.log(t, await cmd(`tap ${bits} ${n}`));
    await sleep(Number(n) * 17 + 300);
    continue;
  }
  const bits = t.split('+').reduce((m, b) => {
    if (!(b in BITS)) throw new Error(`unknown button ${b}`);
    return m | BITS[b];
  }, 0);
  await cmd(`tap ${bits.toString(16)} ${frames}`);
  await sleep(frames * 17 + 300);
}
const shot = opt('shot');
if (shot) {
  const bmp = `${SCRATCH}\\${shot}.bmp`;
  console.log(await cmd(`shot ${bmp}`));
  execFileSync('py', ['-3.14', '-c', `from PIL import Image; Image.open(r'${bmp}').resize((640,360)).save(r'${SCRATCH}\\${shot}.png')`]);
}
sock.end();
