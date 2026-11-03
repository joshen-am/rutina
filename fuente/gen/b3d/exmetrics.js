const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8794, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 } });
  pg.on('pageerror', e => console.log('err', e.message));
  await pg.goto('http://localhost:8794/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const res = await pg.evaluate(() => Object.keys(window.KS_EX).map(k => [k, window.Body3D.metrics(k)]));
  for (const [k, m] of res) console.log(k.padEnd(18), 'flota', (+m.float).toFixed(3), 'hunde', (+m.pen).toFixed(3), 'ik', (+m.ik).toFixed(3), '@', m.at, m.who, 'recorrido', m.amp, m.ampj, 'apoyo', m.gap == null ? '-' : m.gap.toFixed(3), m.gapWho || '');
  await br.close(); srv.close();
});
