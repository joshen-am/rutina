// precalcula el ajuste de apoyos de cada ejercicio → exfit.js (así el teléfono no lo calcula al abrir)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8802, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 } });
  await pg.goto('http://localhost:8802/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const keys = await pg.evaluate(() => Object.keys(window.KS_EX)); const out = {};
  for (const k of keys) out[k] = await pg.evaluate(k => window.Body3D.bake(k), k);
  fs.writeFileSync(path.join(__dirname, 'exfit.js'), '/* generado por b3d/bake.js: ajuste de apoyos de cada ejercicio */\nwindow.KS_FIT = ' + JSON.stringify(out) + ';\n');
  console.log('exfit.js', fs.statSync(path.join(__dirname, 'exfit.js')).size, 'bytes'); await br.close(); srv.close(); });
