const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't');
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8800, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 } });
  await pg.goto('http://localhost:8800/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const out = await pg.evaluate(() => {
    const S = window.Body3D.state, T = S.three; window.Body3D.debug('sentadilla', 0);
    const meshes = []; S.model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
    const want = ['Hips','Spine','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase'];
    const res = {}; want.forEach(n => res[n] = { n: 0, ext: { '+x': 0, '-x': 0, '+y': 0, '-y': 0, '+z': 0, '-z': 0 } });
    const v = new T.Vector3(), jp = {}; want.forEach(n => { jp[n] = new T.Vector3(); S.B[n].getWorldPosition(jp[n]); S.model.worldToLocal(jp[n]); });
    meshes.forEach(m => { const sk = m.skeleton, g = m.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, N = g.attributes.position.count;
      for (let i = 0; i < N; i += 2) { let best = -1, bw = 0; for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > bw) { bw = w; best = si.getComponent(i, c); } }
        const nm = sk.bones[best].name.replace(/^mixamorig:?/, ''); if (!res[nm]) continue;
        m.getVertexPosition(i, v); m.localToWorld(v); S.model.worldToLocal(v); const d = v.clone().sub(jp[nm]); const e = res[nm].ext; res[nm].n++;
        e['+x'] = Math.max(e['+x'], d.x); e['-x'] = Math.max(e['-x'], -d.x); e['+y'] = Math.max(e['+y'], d.y); e['-y'] = Math.max(e['-y'], -d.y); e['+z'] = Math.max(e['+z'], d.z); e['-z'] = Math.max(e['-z'], -d.z); } });
    return want.map(n => n.padEnd(13) + ' ' + Object.entries(res[n].ext).map(([k, x]) => k + ' ' + x.toFixed(3)).join('  ') + '  n' + res[n].n).join('\n');
  });
  console.log(out); await br.close(); srv.close(); });
