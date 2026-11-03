const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const only = process.argv[2] ? process.argv[2].split(',') : null;
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p));
}).listen(8797, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8797/ex.html');
  await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const keys = await pg.evaluate(() => Object.keys(window.KS_EX).map(k => { const e = window.KS_EX[k]; const n = e.keys.length; const T = e.t || 1;
    const ts = e.loop === 'hold' ? [0] : e.loop === 'cycle' ? e.keys.map((_, i) => i * T) : [0, (e.dwell ? e.dwell[0] : 0) + T * (e.tempo ? e.tempo[0] : 1.12) + 0.01]; return [k, ts]; }));
  fs.mkdirSync(path.join(__dirname, 'exs'), { recursive: true });
  for (const [k, ts] of keys) {
    if (only && !only.includes(k)) continue;
    for (let i = 0; i < ts.length; i++) {
      const ok = await pg.evaluate(([k, t]) => window.Body3D.debug(k, t), [k, ts[i]]);
      await pg.locator('.body3d').screenshot({ path: path.join(__dirname, 'exs', k + '-' + i + '.png') });
    }
  }
  console.log(JSON.stringify(errs.slice(0, 5))); await br.close(); srv.close();
});
