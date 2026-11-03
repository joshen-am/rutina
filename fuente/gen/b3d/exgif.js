const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const list = process.argv[2].split(","), N = +(process.argv[3] || 24);
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8796, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 }, deviceScaleFactor: 1 });
  await pg.goto('http://localhost:8796/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  fs.mkdirSync(path.join(__dirname, 'gif'), { recursive: true });
  for (const k of list) {
    const total = await pg.evaluate((k) => window.Body3D.loopLen(k), k);
    for (let i = 0; i < N; i++) { await pg.evaluate(([k, t]) => window.Body3D.debug(k, t), [k, total * i / N]); await pg.locator('.body3d').screenshot({ path: path.join(__dirname, 'gif', `${k}-${String(i).padStart(2, '0')}.png`) }); }
  }
  await br.close(); srv.close(); console.log('ok');
});
