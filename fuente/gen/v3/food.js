
  /* ---------- comida: foto o texto → IA → nutrientes ---------- */

  mealDefs() {
    return [
      { id: 'desayuno', name: 'Desayuno' },
      { id: 'almuerzo', name: 'Almuerzo' },
      { id: 'once', name: 'Once' },
      { id: 'cena', name: 'Cena' },
      { id: 'colacion', name: 'Colaciones' }
    ];
  }

  mealNow() {
    const h = new Date().getHours();
    return h < 11 ? 'desayuno' : h < 16 ? 'almuerzo' : h < 19 ? 'once' : h < 23 ? 'cena' : 'colacion';
  }

  foodDate() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + (this.state.fday || 0));
  }

  /* Perfil para las metas: sale de la evaluación inicial; si no existe, valores neutros. */
  hp() {
    return Object.assign({ sexo: null, edad: 28, altura: 172, objetivo: 'mantener', ejDias: '3-4', pasos: '4-7' }, this.state.hp || {}, { peso: this.peso() });
  }

  activityFactor(p) {
    const ej = { '0': 0, '1-2': 1, '3-4': 2, '5+': 3 }[p.ejDias];
    const pa = { '<4': 0, '4-7': 1, '7-10': 2, '>10': 3 }[p.pasos];
    const s = (ej == null ? 2 : ej) + (pa == null ? 1 : pa);
    return [1.2, 1.3, 1.375, 1.45, 1.55, 1.65, 1.725][s];
  }

  /* Gasto con Mifflin-St Jeor × actividad; proteína 1,6 g/kg (2 g/kg si bajas grasa);
     grasa 28 % de la energía; fibra 14 g por cada 1.000 kcal; azúcares libres < 10 %; sodio < 2.000 mg (OMS). */
  targets() {
    const p = this.hp();
    const w = p.peso, h = p.altura, a = p.edad;
    const male = p.sexo !== 'mujer';
    const bmr = 10 * w + 6.25 * h - 5 * a + (male ? 5 : -161);
    const tdee = bmr * this.activityFactor(p);
    const adj = p.objetivo === 'perder' ? 0.85 : p.objetivo === 'ganar' ? 1.08 : 1;
    const kcal = Math.round((tdee * adj) / 10) * 10;
    const prot = Math.round(w * (p.objetivo === 'perder' ? 2 : 1.6));
    const fat = Math.round((kcal * 0.28) / 9);
    const carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
    return {
      kcal: kcal, prot: prot, carb: carb, fat: fat,
      fib: Math.round((kcal / 1000) * 14), sug: Math.round((kcal * 0.1) / 4), na: 2000,
      bmr: Math.round(bmr), tdee: Math.round(tdee), hasProfile: !!(this.state.hp && this.state.hp.sexo)
    };
  }

  foodEntries(key) { return ((this.state.flog || {})[key] || []); }

  sumItems(items) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sug: 0, na: 0 };
    (items || []).forEach((it) => { Object.keys(t).forEach((k) => { t[k] += Number(it[k]) || 0; }); });
    return t;
  }

  dayTotals(key) {
    let items = [];
    this.foodEntries(key).forEach((e) => { items = items.concat(e.items || []); });
    return this.sumItems(items);
  }

  dayQuality(key) {
    let w = 0, s = 0;
    this.foodEntries(key).forEach((e) => { if (e.q) { const k = Math.max(50, this.sumItems(e.items).kcal); w += k; s += e.q * k; } });
    return w ? s / w : null;
  }

  /* ---------- IA ---------- */

  aiCfg() {
    const a = this.state.prefs.ai || {};
    return { provider: a.provider || 'gemini', key: a.key || '', model: a.model || '' };
  }

  setAi(patch) {
    this.setPref('ai', Object.assign({}, this.aiCfg(), patch));
  }

  foodPrompt(meal, text, withImg) {
    const T = this.targets();
    return [
      'Eres un nutricionista que estima nutrientes de comidas. Contexto: Chile, comida "' + meal + '".',
      withImg
        ? 'Analiza la foto. Identifica cada alimento y bebida visible, estima la porción en gramos usando referencias (un plato llano mide unos 26 cm, un tenedor unos 19 cm) y calcula los nutrientes con valores de tablas estándar (USDA o tabla chilena de composición de alimentos).'
        : 'El usuario describe lo que comió. Identifica cada alimento, asume porciones típicas chilenas si no las indica y calcula los nutrientes con valores de tablas estándar.',
      text ? 'Lo que dice el usuario (trátalo como cierto): "' + String(text).slice(0, 400) + '"' : '',
      'Su meta diaria es de ' + T.kcal + ' kcal y ' + T.prot + ' g de proteína.',
      'Responde SOLO con JSON válido, sin texto extra, con esta forma:',
      '{"titulo":"nombre corto del plato","items":[{"nombre":"","porcion":"ej. 1 taza","gramos":0,"kcal":0,"proteina":0,"carbohidratos":0,"grasa":0,"fibra":0,"azucar":0,"sodio":0}],"calidad":7,"nota":"","confianza":"media"}',
      'Reglas: números sin unidades (gramos, kcal, sodio en mg). "calidad" de 1 a 10 según densidad nutricional, nivel de procesamiento y equilibrio. "nota": una o dos frases en español de Chile, directas: qué está bien y una mejora concreta. "confianza": alta, media o baja. Si no hay comida en la imagen, devuelve items vacíos y explica en "nota".'
    ].filter(Boolean).join('\n');
  }

  async callGemini(cfg, prompt, img, json) {
    const models = cfg.model ? [cfg.model] : ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
    const parts = [{ text: prompt }];
    if (img) parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
    const gen = { temperature: 0.2 };
    if (json) gen.responseMimeType = 'application/json';
    const body = JSON.stringify({ contents: [{ role: 'user', parts: parts }], generationConfig: gen });
    let last = new Error('modelo');
    for (let i = 0; i < models.length; i++) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent?key=' + encodeURIComponent(cfg.key);
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
      if (r.status === 404) { last = new Error('modelo'); continue; }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw this.aiError(r.status);
      const c = d.candidates && d.candidates[0];
      const t = c && c.content && c.content.parts ? c.content.parts.map((p) => p.text || '').join('') : '';
      if (!t) throw new Error('vacio');
      return t;
    }
    throw last;
  }

  async callClaude(cfg, prompt, img) {
    const content = [];
    if (img) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } });
    content.push({ type: 'text', text: prompt });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: cfg.model || 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content: content }] })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw this.aiError(r.status);
    return (d.content || []).map((x) => x.text || '').join('');
  }

  aiError(status) {
    return new Error(status === 400 || status === 401 || status === 403 ? 'clave' : status === 429 ? 'limite' : status === 404 ? 'modelo' : 'red');
  }

  aiErrorText(e) {
    const m = e && e.message;
    if (m === 'nokey') return 'Conecta la IA en Ajustes para analizar tus comidas.';
    if (m === 'clave') return 'La clave de IA no funcionó. Revísala en Ajustes.';
    if (m === 'limite') return 'Llegaste al límite de uso por ahora. Intenta de nuevo en un minuto.';
    if (m === 'formato' || m === 'vacio') return 'La IA no devolvió un resultado claro. Prueba con otra foto o descríbelo con palabras.';
    if (m === 'modelo') return 'Ese modelo de IA no está disponible. Deja el campo de modelo vacío en Ajustes.';
    if (m === 'img') return 'No se pudo leer esa imagen.';
    return 'No hay conexión con la IA. Revisa tu internet e intenta otra vez.';
  }

  parseJSON(txt) {
    const s = String(txt || '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('formato');
    return JSON.parse(s.slice(a, b + 1));
  }

  async aiJSON(prompt, img) {
    const cfg = this.aiCfg();
    if (!cfg.key) throw new Error('nokey');
    const txt = cfg.provider === 'claude' ? await this.callClaude(cfg, prompt, img) : await this.callGemini(cfg, prompt, img, true);
    return this.parseJSON(txt);
  }

  normItems(list) {
    const n = (v) => { const x = Number(String(v == null ? 0 : v).replace(',', '.')); return isFinite(x) && x > 0 ? x : 0; };
    return (Array.isArray(list) ? list : []).slice(0, 20).map((it) => ({
      n: String(it.nombre || it.name || 'Alimento').slice(0, 60), por: String(it.porcion || '').slice(0, 40), g: Math.round(n(it.gramos)),
      kcal: Math.round(n(it.kcal)), p: Math.round(n(it.proteina) * 10) / 10, c: Math.round(n(it.carbohidratos) * 10) / 10,
      f: Math.round(n(it.grasa) * 10) / 10, fib: Math.round(n(it.fibra) * 10) / 10, sug: Math.round(n(it.azucar) * 10) / 10,
      na: Math.round(n(it.sodio)), x: 1
    }));
  }

  /* ---------- fotos ---------- */

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => resolve({ im: im, url: url });
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      im.src = url;
    });
  }

  shrink(im, max, q) {
    const s = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
    const w = Math.max(1, Math.round((im.naturalWidth || im.width) * s)), h = Math.max(1, Math.round((im.naturalHeight || im.height) * s));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(im, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', q);
  }

  idbKey(op, key, val) {
    return this.idbOpen().then((db) => new Promise((resolve) => {
      const tx = db.transaction('kv', op === 'get' ? 'readonly' : 'readwrite');
      const os = tx.objectStore('kv');
      if (op === 'get') { const r = os.get(key); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); return; }
      if (op === 'put') os.put(val, key); else os.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    })).catch(() => null);
  }

  photoOf(id) {
    this._photos = this._photos || {};
    if (this._photos[id] !== undefined) return this._photos[id];
    this._photos[id] = null;
    this.idbKey('get', 'foto:' + id).then((d) => { if (d) { this._photos[id] = d; this.forceUpdate(); } });
    return null;
  }

  /* ---------- flujo de registro ---------- */

  openFoodAdd(meal) {
    this.sfx('open');
    this.setState({ fsheet: { meal: meal || this.mealNow() }, ftext: '' });
  }

  async analyzeFood(meal, file, text) {
    const id = 'f' + Date.now().toString(36);
    this.setState({ fsheet: null, fdraft: { id: id, meal: meal, status: 'loading', thumb: null, text: text || '' } });
    try {
      let img = null, thumb = null;
      if (file) {
        const r = await this.loadImage(file);
        img = this.shrink(r.im, 1024, 0.8).split(',')[1];
        thumb = this.shrink(r.im, 480, 0.72);
        URL.revokeObjectURL(r.url);
        this.setState({ fdraft: Object.assign({}, this.state.fdraft, { thumb: thumb }) });
      }
      const name = (this.mealDefs().find((m) => m.id === meal) || {}).name || 'Comida';
      const j = await this.aiJSON(this.foodPrompt(name, text, !!img), img);
      if (!this.state.fdraft || this.state.fdraft.id !== id) return;
      const items = this.normItems(j.items);
      this.setState({
        fdraft: Object.assign({}, this.state.fdraft, {
          status: items.length ? 'ready' : 'empty', items: items,
          t: String(j.titulo || name).slice(0, 60), q: Math.max(1, Math.min(10, Math.round(Number(j.calidad) || 0))) || null,
          note: String(j.nota || '').slice(0, 280), conf: String(j.confianza || '')
        })
      });
      this.sfx(items.length ? 'done' : 'no');
    } catch (e) {
      if (!this.state.fdraft || this.state.fdraft.id !== id) return;
      this.setState({ fdraft: Object.assign({}, this.state.fdraft, { status: 'error', err: this.aiErrorText(e) }) });
      this.sfx('no');
    }
  }

  onFoodPhoto(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    const meal = (this.state.fsheet && this.state.fsheet.meal) || this.mealNow();
    if (file) this.analyzeFood(meal, file, '');
    try { input.value = ''; } catch (err) {}
  }

  draftScale(i, d) {
    const fd = this.state.fdraft;
    if (!fd || !fd.items) return;
    this.sfx('tap');
    const items = fd.items.slice();
    items[i] = Object.assign({}, items[i], { x: Math.max(0.25, Math.min(4, Math.round((items[i].x + d) * 4) / 4)) });
    this.setState({ fdraft: Object.assign({}, fd, { items: items }) });
  }

  draftRemove(i) {
    const fd = this.state.fdraft;
    if (!fd || !fd.items) return;
    this.sfx('tap');
    const items = fd.items.slice();
    items.splice(i, 1);
    this.setState({ fdraft: Object.assign({}, fd, { items: items, status: items.length ? fd.status : 'empty' }) });
  }

  scaled(it) {
    const x = it.x || 1;
    const r1 = (v) => Math.round(v * x * 10) / 10;
    return { n: it.n, por: it.por, g: Math.round(it.g * x), kcal: Math.round(it.kcal * x), p: r1(it.p), c: r1(it.c), f: r1(it.f), fib: r1(it.fib), sug: r1(it.sug), na: Math.round(it.na * x) };
  }

  saveDraft() {
    const fd = this.state.fdraft;
    if (!fd || !fd.items || !fd.items.length) return;
    const key = this.keyOf(this.foodDate());
    const entry = { id: fd.id, meal: fd.meal, at: Date.now(), t: fd.t, items: fd.items.map((it) => this.scaled(it)), q: fd.q || null, note: fd.note || '', foto: !!fd.thumb };
    const fl = Object.assign({}, this.state.flog || {});
    fl[key] = (fl[key] || []).concat([entry]);
    if (fd.thumb) { this._photos = this._photos || {}; this._photos[fd.id] = fd.thumb; this.idbKey('put', 'foto:' + fd.id, fd.thumb); }
    this.sfx('yes');
    this.setState({ flog: fl, fdraft: null }, () => this.persist());
  }

  deleteEntry(key, id) {
    if (this.state.fdelArmed !== id) { this.sfx('no'); this.setState({ fdelArmed: id }); return; }
    const fl = Object.assign({}, this.state.flog || {});
    fl[key] = (fl[key] || []).filter((e) => e.id !== id);
    if (!fl[key].length) delete fl[key];
    this.idbKey('del', 'foto:' + id);
    this.sfx('tap');
    this.setState({ flog: fl, fentry: null, fdelArmed: null }, () => this.persist());
  }

  /* ---------- análisis ---------- */

  foodWeek() {
    const out = [];
    const t = this.foodDate();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i);
      const key = this.keyOf(d);
      const n = this.foodEntries(key).length;
      out.push(Object.assign({ key: key, d: d, n: n, q: this.dayQuality(key) }, this.dayTotals(key)));
    }
    return out;
  }

  foodInsights(tot, T, n, isToday) {
    const out = [];
    const h = new Date().getHours();
    if (!n) { out.push(isToday ? 'Registra tu primera comida del día: saca una foto antes de comer.' : 'No registraste comidas este día.'); return out; }
    const pLeft = Math.round(T.prot - tot.p);
    if (pLeft > T.prot * 0.15) out.push('Te faltan ' + pLeft + ' g de proteína. Ideas: 150 g de pechuga de pollo (unos 45 g), una lata de atún (25 g) o 200 g de yogur griego (20 g).');
    else out.push('Proteína cubierta: ' + Math.round(tot.p) + ' de ' + T.prot + ' g.');
    if (tot.fib < T.fib * 0.6 && (!isToday || h >= 15)) out.push('Fibra baja: ' + Math.round(tot.fib) + ' de ' + T.fib + ' g. Suma legumbres, avena, verduras o una fruta con cáscara.');
    if (tot.kcal > T.kcal * 1.1) out.push('Pasaste tu meta por ' + this.fmt(tot.kcal - T.kcal) + ' kcal. No pasa nada por un día; mira el promedio de la semana.');
    if (tot.sug > T.sug) out.push('Azúcar: ' + Math.round(tot.sug) + ' g, sobre el límite de ' + T.sug + ' g. El agua o las bebidas sin azúcar ayudan.');
    if (tot.na > T.na) out.push('Sodio: ' + this.fmt(tot.na) + ' mg, sobre los ' + this.fmt(T.na) + ' mg recomendados. Ojo con embutidos, salsas y pan.');
    return out.slice(0, 3);
  }

  async aiWeekReview() {
    const T = this.targets();
    const wk = this.foodWeek().filter((d) => d.n);
    if (wk.length < 2) { this.setState({ frevErr: 'Registra al menos dos días de comidas para pedir un análisis.' }); return; }
    this.sfx('tap');
    this.setState({ frevBusy: true, frevErr: '' });
    const lines = wk.map((d) => this.keyOf(d.d) + ': ' + Math.round(d.kcal) + ' kcal, ' + Math.round(d.p) + ' g proteína, ' + Math.round(d.c) + ' g carbohidratos, ' + Math.round(d.f) + ' g grasa, ' + Math.round(d.fib) + ' g fibra, ' + Math.round(d.sug) + ' g azúcar, calidad ' + (d.q ? d.q.toFixed(1) : 's/d') + '/10. Comidas: ' + this.foodEntries(d.key).map((e) => e.t).join('; '));
    const p = this.hp();
    const prompt = [
      'Eres un nutricionista. Revisa la semana de alimentación de esta persona y responde en español de Chile, directo y sin rodeos.',
      'Persona: ' + (p.sexo || 'sexo no indicado') + ', ' + p.edad + ' años, ' + p.peso + ' kg, objetivo: ' + p.objetivo + ', entrena calistenia.',
      'Metas diarias: ' + T.kcal + ' kcal, ' + T.prot + ' g proteína, ' + T.fib + ' g fibra, menos de ' + T.sug + ' g de azúcar.',
      'Días registrados:', lines.join('\n'),
      'Responde SOLO JSON: {"resumen":"una frase con el veredicto de la semana","bien":["máx 2 cosas que van bien"],"mejorar":["máx 3 cambios concretos y fáciles, con alimentos específicos"]}'
    ].join('\n');
    try {
      const j = await this.aiJSON(prompt, null);
      const arr = (a) => (Array.isArray(a) ? a : []).map((x) => String(x).slice(0, 220)).slice(0, 3);
      this.setState({ frev: { at: Date.now(), resumen: String(j.resumen || '').slice(0, 220), bien: arr(j.bien).slice(0, 2), mejorar: arr(j.mejorar) }, frevBusy: false }, () => this.persist());
      this.sfx('done');
    } catch (e) {
      this.setState({ frevBusy: false, frevErr: this.aiErrorText(e) });
    }
  }

  foodVals(th, c, dark) {
    const st = this.state;
    const T = this.targets();
    const date = this.foodDate();
    const key = this.keyOf(date);
    const isToday = (st.fday || 0) === 0;
    const entries = this.foodEntries(key);
    const tot = this.dayTotals(key);
    const pct = (v, g) => Math.round(Math.min(1, g ? v / g : 0) * 1000) / 10;
    const r0 = (v) => this.fmt(Math.round(v));
    const left = T.kcal - tot.kcal;
    const macro = (label, v, g, color, unit) => ({ label: label, val: r0(v), goal: this.fmt(g), unit: unit || 'g', pct: pct(v, g), color: color, over: v > g * 1.05 });
    const meals = this.mealDefs().map((m) => {
      const list = entries.filter((e) => e.meal === m.id);
      const mt = this.sumItems([].concat.apply([], list.map((e) => e.items)));
      return {
        id: m.id, name: m.name, kcal: list.length ? r0(mt.kcal) + ' kcal' : '', has: list.length > 0, none: !list.length,
        add: () => this.openFoodAdd(m.id),
        entries: list.map((e) => {
          const et = this.sumItems(e.items);
          const ph = e.foto ? this.photoOf(e.id) : null;
          return {
            title: e.t || m.name, sub: r0(et.kcal) + ' kcal · ' + r0(et.p) + ' g proteína',
            hasPhoto: !!ph, photo: ph || '', noPhoto: !ph,
            q: e.q || '', hasQ: !!e.q, qColor: this.healthColor(e.q * 10, dark),
            open: () => { this.sfx('open'); this.setState({ fentry: { key: key, id: e.id }, fdelArmed: null }); }
          };
        })
      };
    });
    const wk = this.foodWeek();
    const maxK = Math.max(T.kcal * 1.25, ...wk.map((d) => d.kcal));
    const logged = wk.filter((d) => d.n);
    const avg = (f) => (logged.length ? logged.reduce((s, d) => s + d[f], 0) / logged.length : 0);
    const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const week = {
      bars: wk.map((d) => ({
        h: Math.round((d.kcal / maxK) * 100), label: letters[(d.d.getDay() + 6) % 7],
        bg: !d.n ? th.fill : d.kcal > T.kcal * 1.1 ? c.heat : th.text, cur: d.key === key, lc: d.key === key ? th.text : th.sub
      })),
      targetPx: Math.round((T.kcal / maxK) * 100),
      days: logged.length, avgK: r0(avg('kcal')), avgP: r0(avg('p')), avgFib: r0(avg('fib')),
      protDays: logged.filter((d) => d.p >= T.prot * 0.9).length,
      avgQ: logged.length && logged.some((d) => d.q) ? (logged.filter((d) => d.q).reduce((s, d) => s + d.q, 0) / logged.filter((d) => d.q).length).toFixed(1).replace('.', ',') : '—'
    };
    const fe = st.fentry && st.fentry.key ? this.foodEntries(st.fentry.key).find((e) => e.id === st.fentry.id) : null;
    const fd = st.fdraft;
    const dItems = fd && fd.items ? fd.items.map((it, i) => {
      const s = this.scaled(it);
      return {
        n: it.n, por: (it.x !== 1 ? '×' + String(it.x).replace('.', ',') + ' · ' : '') + (s.g ? s.g + ' g' : it.por), kcal: r0(s.kcal),
        macros: 'P ' + r0(s.p) + ' · C ' + r0(s.c) + ' · G ' + r0(s.f) + ' · Fibra ' + r0(s.fib),
        minus: () => this.draftScale(i, -0.25), plus: () => this.draftScale(i, 0.25), remove: () => this.draftRemove(i),
        line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none'
      };
    }) : [];
    const dTot = fd && fd.items ? this.sumItems(fd.items.map((it) => this.scaled(it))) : { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };
    const cfg = this.aiCfg();
    const names = this.dayNames();
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const rev = st.frev;
    return {
      hasAi: !!cfg.key, noAi: !cfg.key,
      dayLabel: isToday ? 'Hoy' : ((st.fday || 0) === -1 ? 'Ayer' : cap(names[(date.getDay() + 6) % 7]) + ' ' + date.getDate()),
      dateLabel: this.longDate(date), canNext: !isToday, nextOp: isToday ? 0.3 : 1, prevOp: (st.fday || 0) > -30 ? 1 : 0.3,
      prev: () => { this.sfx('tap'); this.setState({ fday: Math.max(-30, (st.fday || 0) - 1) }); },
      next: () => { if (isToday) return; this.sfx('tap'); this.setState({ fday: (st.fday || 0) + 1 }); },
      kcal: r0(tot.kcal), goal: this.fmt(T.kcal), left: this.fmt(Math.abs(left)), leftLabel: left >= 0 ? 'Restantes' : 'Sobre tu meta',
      ringOff: (603.2 * (1 - Math.min(1, tot.kcal / T.kcal))).toFixed(1), ringColor: tot.kcal > T.kcal * 1.05 ? c.heat : th.text,
      macros: [macro('Proteína', tot.p, T.prot, c.prot), macro('Carbohidratos', tot.c, T.carb, c.carb), macro('Grasa', tot.f, T.fat, c.fat), macro('Fibra', tot.fib, T.fib, c.fib)],
      micro: [
        { label: 'Azúcar', val: r0(tot.sug) + ' g', goal: 'máx. ' + T.sug + ' g', over: tot.sug > T.sug },
        { label: 'Sodio', val: this.fmt(tot.na) + ' mg', goal: 'máx. ' + this.fmt(T.na) + ' mg', over: tot.na > T.na }
      ].map((m) => Object.assign(m, { color: m.over ? c.heatText : th.text })),
      meals: meals, count: entries.length,
      insights: this.foodInsights(tot, T, entries.length, isToday).map((t, i) => ({ n: '0' + (i + 1), text: t, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })),
      week: week, T: T, noProfile: !T.hasProfile,
      targetsNote: T.hasProfile ? 'Calculadas con tu evaluación: gasto estimado de ' + this.fmt(T.tdee) + ' kcal al día.' : 'Metas aproximadas. Haz la evaluación de salud para calcularlas con tus datos.',
      rev: rev ? { resumen: rev.resumen, bien: (rev.bien || []).map((t) => ({ text: t })), mejorar: (rev.mejorar || []).map((t, i) => ({ n: '0' + (i + 1), text: t })), ago: this.agoText(rev.at), hasBien: (rev.bien || []).length > 0 } : null,
      hasRev: !!rev, revBusy: !!st.frevBusy, revErr: st.frevErr || '', hasRevErr: !!st.frevErr,
      revLabel: st.frevBusy ? 'Analizando…' : (rev ? 'Actualizar análisis' : 'Analizar mi semana con IA'),
      askReview: () => { if (!st.frevBusy) this.aiWeekReview(); },
      // hoja para agregar
      sheetOpen: !!st.fsheet, sheetMeal: st.fsheet ? ((this.mealDefs().find((m) => m.id === st.fsheet.meal) || {}).name || '') : '',
      mealOpts: this.mealDefs().map((m) => {
        const sel = st.fsheet && st.fsheet.meal === m.id;
        return { label: m.name, selected: sel, bg: sel ? th.inv : th.fill, fg: sel ? th.onInv : th.text, pick: () => { this.sfx('tap'); this.setState({ fsheet: { meal: m.id } }); } };
      }),
      ftext: st.ftext || '', canText: (st.ftext || '').trim().length > 2,
      onText: (e) => this.setState({ ftext: (e && e.target ? e.target.value : '').slice(0, 400) }),
      analyzeText: () => { if ((st.ftext || '').trim().length > 2) this.analyzeFood(st.fsheet.meal, null, st.ftext.trim()); },
      onPhoto: (e) => this.onFoodPhoto(e),
      closeSheet: () => { this.sfx('tap'); this.setState({ fsheet: null }); },
      // borrador analizado
      draftOpen: !!fd, dLoading: !!fd && fd.status === 'loading', dReady: !!fd && fd.status === 'ready', dError: !!fd && (fd.status === 'error' || fd.status === 'empty'),
      dErr: fd ? (fd.status === 'empty' ? (fd.note || 'No encontré comida en la foto.') : fd.err || '') : '',
      dHasThumb: !!(fd && fd.thumb), dThumb: fd && fd.thumb ? fd.thumb : '', dNoThumb: !(fd && fd.thumb),
      dTitle: fd ? (fd.t || 'Analizando…') : '', dItems: dItems, dNote: fd ? fd.note || '' : '', dHasNote: !!(fd && fd.note),
      dQ: fd && fd.q ? fd.q : '', dHasQ: !!(fd && fd.q), dLow: !!(fd && fd.conf === 'baja'),
      dTot: { kcal: r0(dTot.kcal), p: r0(dTot.p), c: r0(dTot.c), f: r0(dTot.f), fib: r0(dTot.fib) },
      saveDraft: () => this.saveDraft(),
      discardDraft: () => { this.sfx('tap'); this.setState({ fdraft: null }); },
      retryDraft: () => { const m = fd ? fd.meal : this.mealNow(); this.setState({ fdraft: null }, () => this.openFoodAdd(m)); },
      // detalle
      entryOpen: !!fe,
      fe: fe ? (() => {
        const et = this.sumItems(fe.items);
        const ph = fe.foto ? this.photoOf(fe.id) : null;
        return {
          title: fe.t, meal: (this.mealDefs().find((m) => m.id === fe.meal) || {}).name || '', time: new Date(fe.at).toTimeString().slice(0, 5),
          hasPhoto: !!ph, photo: ph || '', note: fe.note, hasNote: !!fe.note, q: fe.q || '', hasQ: !!fe.q,
          tot: { kcal: r0(et.kcal), p: r0(et.p), c: r0(et.c), f: r0(et.f), fib: r0(et.fib), sug: r0(et.sug), na: this.fmt(et.na) },
          items: fe.items.map((it, i) => ({ n: it.n, por: (it.g ? it.g + ' g' : it.por), kcal: r0(it.kcal), macros: 'P ' + r0(it.p) + ' · C ' + r0(it.c) + ' · G ' + r0(it.f), line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })),
          delLabel: st.fdelArmed === fe.id ? 'Toca otra vez para borrar' : 'Borrar registro',
          del: () => this.deleteEntry(st.fentry.key, fe.id)
        };
      })() : null,
      closeEntry: () => { this.sfx('tap'); this.setState({ fentry: null, fdelArmed: null }); }
    };
  }
