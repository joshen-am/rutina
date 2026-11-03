const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const [k, N] = [process.argv[2], +(process.argv[3] || 8)];
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8798, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 } });
  await pg.goto('http://localhost:8798/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const out = await pg.evaluate(([k, N]) => { const S = window.Body3D.state, T = S.three; const tot = window.Body3D.loopLen(k); const rows = [];
    const names = ['LeftToeBase','LeftFoot','LeftLeg','RightLeg','LeftUpLeg','LeftHand','LeftForeArm','Hips','Spine','Spine2','Head'];
    for (let i = 0; i < N; i++) { window.Body3D.debug(k, tot * i / N); const p = new T.Vector3();
      rows.push((tot*i/N).toFixed(2) + ' ' + names.map(n => { S.B[n].getWorldPosition(p); S.model.worldToLocal(p); return n.replace('Left','L').replace('Right','R').replace('ToeBase','Toe') + ':' + (p.y - S.floorY).toFixed(2); }).join(' ')); }
    return rows.join('\n') + '\nmatTop ' + S.matTop; }, [k, N]);
  console.log(out); await br.close(); srv.close(); });
