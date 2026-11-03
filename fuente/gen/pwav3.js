const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {};
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.route('https://generativelanguage.googleapis.com/**', async (route) => {
      const body = JSON.parse(route.request().postData());
      const isImg = body.contents[0].parts.length > 1;
      const txt = body.contents[0].parts[0].text;
      let j;
      if (/"ok":true/.test(txt)) j = { ok: true };
      else if (/semana/.test(txt)) j = { resumen: 'Buena base de proteína, pero la fibra quedó corta casi todos los días.', bien: ['Proteína sobre la meta 2 de 3 días.'], mejorar: ['Suma una taza de porotos o lentejas en el almuerzo dos veces por semana.', 'Cambia el pan blanco por integral.'] };
      else j = { titulo: isImg ? 'Huevos con palta y marraqueta' : 'Pollo con arroz y ensalada', items: [
        { nombre: 'Huevos revueltos', porcion: '2 unidades', gramos: 120, kcal: 182, proteina: 12.6, carbohidratos: 1.4, grasa: 13.8, fibra: 0, azucar: 0.8, sodio: 190 },
        { nombre: 'Palta', porcion: '1/2 unidad', gramos: 70, kcal: 112, proteina: 1.4, carbohidratos: 6, grasa: 10.3, fibra: 4.7, azucar: 0.4, sodio: 5 },
        { nombre: 'Marraqueta', porcion: '1 unidad', gramos: 100, kcal: 267, proteina: 8.5, carbohidratos: 55, grasa: 1.2, fibra: 2.4, azucar: 1.5, sodio: 520 }],
        calidad: 7, nota: 'Buen aporte de proteína y grasas saludables. Cambia la marraqueta por pan integral para sumar fibra.', confianza: 'media' };
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(j) }] } }] }) });
    });
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(700);
    await p.evaluate(async () => { localStorage.clear(); await new Promise((r) => { const q = indexedDB.deleteDatabase('rutina'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
    await p.reload(); await p.waitForTimeout(1200);
    const sh = async (n) => p.screenshot({ path: `${out}/v3-${scheme}-${n}.png` });
    await sh('01-home');
    // evaluación
    await p.getByRole('button', { name: /Empezar evaluación/ }).first().click(); await p.waitForTimeout(600);
    await sh('02-eval1');
    const pickAll = async () => {
      for (let i = 0; i < 30; i++) {
        const done = await p.evaluate(() => !document.body.innerText.includes('Continuar'));
        if (done) break;
        const opts = await p.$$('[aria-pressed]');
        const txt = await p.evaluate(() => document.body.innerText);
        if (/Pregunta anterior/.test(await p.content()) && /No lo sé/.test(txt) && i % 2 === 0 && i > 20) { await p.getByRole('button', { name: 'No lo sé' }).click(); await p.waitForTimeout(350); continue; }
        if (opts.length) { await opts[Math.min(1, opts.length - 1)].click(); await p.waitForTimeout(400); }
        else { await p.getByRole('button', { name: 'Continuar' }).click(); await p.waitForTimeout(350); }
        if (i === 9) await sh('03-eval-num');
      }
    };
    await pickAll();
    await p.waitForTimeout(600);
    await sh('04-salud');
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 700)); await p.waitForTimeout(250);
    await sh('05-salud2');
    await p.getByRole('button', { name: /Nutrición/ }).first().click(); await p.waitForTimeout(600);
    await sh('06-area');
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 600)); await p.waitForTimeout(250);
    await sh('07-area2');
    await p.locator('div[style*="z-index: 20"] button').first().click(); await p.waitForTimeout(400);
    // IA en ajustes
    await p.getByRole('button', { name: 'Ajustes' }).last().click(); await p.waitForTimeout(400);
    await p.fill('#aikey', 'AIzaFAKEKEY'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: 'Probar conexión' }).click(); await p.waitForTimeout(800);
    await p.evaluate(() => { const el = document.getElementById('aikey'); el.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(250);
    await sh('08-ajustes-ia');
    // comida
    await p.getByRole('button', { name: 'Comida' }).last().click(); await p.waitForTimeout(500);
    await sh('09-comida');
    await p.getByRole('button', { name: /Registrar comida/ }).last().click(); await p.waitForTimeout(500);
    await sh('10-sheet');
    await p.setInputFiles('input[type=file][accept="image/*"]', out + '/plato.jpg'); await p.waitForTimeout(1500);
    await sh('11-draft');
    await p.getByRole('button', { name: 'Más cantidad' }).first().click(); await p.waitForTimeout(150);
    await p.getByRole('button', { name: 'Guardar' }).click(); await p.waitForTimeout(600);
    await p.getByRole('button', { name: /Agregar a Almuerzo/ }).click(); await p.waitForTimeout(400);
    await p.fill('textarea[aria-label="Describe lo que comiste"]', 'Pechuga de pollo a la plancha con arroz y ensalada'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: 'Analizar descripción' }).click(); await p.waitForTimeout(1200);
    await p.getByRole('button', { name: 'Guardar' }).click(); await p.waitForTimeout(600);
    await sh('12-comida-llena');
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 900)); await p.waitForTimeout(300);
    await sh('13-comida2');
    // detalle
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 300)); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /Huevos con palta/ }).first().click(); await p.waitForTimeout(600);
    await sh('14-detalle');
    await p.getByRole('button', { name: 'Cerrar' }).first().click({ position: { x: 20, y: 20 } }); await p.waitForTimeout(400);
    // análisis semanal
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 99999)); await p.waitForTimeout(300);
    // inicio
    await p.getByRole('button', { name: 'Inicio' }).last().click(); await p.waitForTimeout(500);
    await sh('15-home-full');
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 800)); await p.waitForTimeout(250);
    await sh('16-home2');
    await p.evaluate(() => document.querySelectorAll('.scroll').forEach((e) => e.scrollTop = 1700)); await p.waitForTimeout(250);
    await sh('17-home3');
    // hábitos
    await p.getByRole('button', { name: 'Hábitos' }).last().click(); await p.waitForTimeout(500);
    await sh('18-habitos');
    // sesión
    await p.getByRole('button', { name: 'Inicio' }).last().click(); await p.waitForTimeout(400);
    const hasStart = await p.getByRole('button', { name: /Iniciar sesión/ }).count();
    if (hasStart) {
      await p.getByRole('button', { name: /Iniciar sesión/ }).first().click(); await p.waitForTimeout(800);
      await sh('19-sesion');
      for (let i = 0; i < 9; i++) { await p.getByRole('button', { name: /Siguiente/ }).click(); await p.waitForTimeout(150); }
      await sh('20-sesion2');
      await p.getByRole('button', { name: 'Salir' }).click(); await p.waitForTimeout(500);
      await p.getByRole('button', { name: /Ya la hice/ }).click(); await p.waitForTimeout(500);
      await sh('21-confirm');
      await p.getByRole('button', { name: 'Sí', exact: true }).click(); await p.waitForTimeout(500);
      await p.getByRole('button', { name: /^60/ }).click(); await p.waitForTimeout(500);
      await sh('22-registro');
      await p.getByRole('button', { name: /Dura/ }).click(); await p.waitForTimeout(500);
      await p.getByRole('button', { name: /Casi todas/ }).click(); await p.waitForTimeout(2200);
      await sh('23-resumen');
    }
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('tracker-rutinas-v3')));
    res[scheme] = { errs, flogDays: Object.keys(st.flog || {}).length, entries: Object.values(st.flog || {}).flat().map((e) => e.t + ' ' + e.items.length), hp: !!st.hp, aiKeyInLocal: !!(st.prefs.ai && st.prefs.ai.key), meas: (st.meas || []).length };
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
