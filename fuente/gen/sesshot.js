const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
    await p.getByRole('button', { name: /Iniciar sesión/ }).first().click(); await p.waitForTimeout(800);
    await p.waitForFunction(() => window.__b3ready, null, { timeout: 30000 }).catch(() => errs.push('no3d'));
    for (let i = 0; i < 12; i++) {
      await p.waitForTimeout(i === 0 ? 1500 : 900);
      const info = await p.evaluate(() => { const S = window.Body3D.state; return S.exKey + ' ' + (S.el && S.el.querySelector('canvas') ? 'canvas' : 'none'); });
      if (i % 3 === 0 || i < 2) await p.screenshot({ path: `shots/ex-${scheme}-${i}.png` });
      errs.push(scheme + ' ' + i + ' ' + info);
      await p.getByRole('button', { name: /Siguiente/ }).click(); 
    }
    await ctx.close();
  }
  console.log(errs.join('\n')); await b.close();
})();
