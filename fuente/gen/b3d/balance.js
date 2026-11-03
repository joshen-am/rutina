// ¿se sostiene? centro de masa dentro de los apoyos, y apoyos que no tocan
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 't'); const only = process.argv[2] ? process.argv[2].split(',') : null;
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); let p = path.join(root, u);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(p)); }).listen(8799, async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await br.newPage({ viewport: { width: 354, height: 300 } });
  await pg.goto('http://localhost:8799/ex.html'); await pg.waitForFunction(() => window.__b3ready, null, { timeout: 30000 });
  const out = await pg.evaluate((only) => {
    const S = window.Body3D.state, T = S.three, res = [];
    const C = [['LeftToeBase', 0.02], ['RightToeBase', 0.02], ['LeftFoot', 0.08], ['RightFoot', 0.08], ['LeftHand', 0.03], ['RightHand', 0.03], ['LeftForeArm', 0.045], ['RightForeArm', 0.045], ['LeftLeg', 0.06], ['RightLeg', 0.06], ['Head', 0.1], ['Hips', 0.1], ['Spine2', 0.11], ['Spine', 0.1], ['LeftToe_End', 0.01], ['RightToe_End', 0.01]];
    const M = [['Hips', 3], ['Spine', 2], ['Spine2', 3], ['Head', 1], ['LeftUpLeg', 1], ['RightUpLeg', 1], ['LeftLeg', 1.5], ['RightLeg', 1.5], ['LeftFoot', 0.5], ['RightFoot', 0.5], ['LeftArm', 0.5], ['RightArm', 0.5], ['LeftForeArm', 0.4], ['RightForeArm', 0.4], ['LeftHand', 0.2], ['RightHand', 0.2]];
    const HAND = { LeftHand: 'lArm', RightHand: 'rArm' };
    function hull(P) { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (P.length < 3) return P; const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
      for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of P.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      return lo.slice(0, -1).concat(up.slice(0, -1)); }
    function distOut(H, q) { // distancia de q fuera del polígono H (0 si dentro)
      if (H.length === 0) return 9; const segd = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1e-9; let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz); };
      if (H.length === 1) return segd(H[0], H[0]); if (H.length === 2) return segd(H[0], H[1]);
      let inside = true; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < 0) inside = false; }
      if (inside) return 0; let d = 9; for (let i = 0; i < H.length; i++) d = Math.min(d, segd(H[i], H[(i + 1) % H.length])); return d; }
    for (const k of Object.keys(window.KS_EX)) { if (only && !only.includes(k)) continue;
      const tot = window.Body3D.loopLen(k), def = window.KS_EX[k]; let worst = 0, wt = 0, wsup = '', nsup = 9;
      for (let i = 0; i < 24; i++) { const t = tot * i / 24; window.Body3D.debug(k, t); const p = new T.Vector3(); const pos = n => { S.B[n].getWorldPosition(p); S.model.worldToLocal(p); return p.clone(); };
        const fl = S.floorY + (S.matTop || 0); const pts = [], names = [];
        C.forEach(([n, o]) => { if (!S.B[n]) return; const v = pos(n); if (v.y - o - fl < 0.035) { pts.push([v.x, v.z]); names.push(n); } });
        // manos que se sujetan de una pared o marco cuentan como apoyo
        if (def.props && (def.props.wall || def.props.door)) ['LeftHand', 'RightHand'].forEach(n => { const v = pos(n); pts.push([v.x, v.z]); names.push(n + '*'); });
        let cm = [0, 0], w = 0; M.forEach(([n, m]) => { if (!S.B[n]) return; const v = pos(n); cm[0] += v.x * m; cm[1] += v.z * m; w += m; }); cm = [cm[0] / w, cm[1] / w];
        const d = distOut(hull(pts), cm); if (d > worst) { worst = d; wt = t; wsup = names.join(','); } nsup = Math.min(nsup, names.length); }
      res.push(k.padEnd(18) + ' fuera ' + worst.toFixed(2) + ' @' + wt.toFixed(2) + ' apoyos ' + wsup); }
    return res.join('\n'); }, only);
  console.log(out); await br.close(); srv.close(); });
