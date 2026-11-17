
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

  // Lo que se pega puede traer espacios, saltos de línea, comillas o texto alrededor: se queda solo la clave
  cleanKey(s) {
    s = String(s || '');
    // Google tiene dos formatos: el clásico AIza… y el nuevo AQ.… de AI Studio
    const g = s.match(/AIza[0-9A-Za-z_\-]{20,}|AQ\.[0-9A-Za-z_\-.]{20,}/);
    if (g) return g[0].replace(/\.+$/, '');
    const a = s.match(/sk-ant-[0-9A-Za-z_\-]{10,}/);
    if (a) return a[0];
    return s.replace(/\s+/g, '').replace(/^["'`«»]+|["'`«»]+$/g, '');
  }

  aiCfg() {
    const a = this.state.prefs.ai || {};
    let model = String(a.model || '').trim().replace(/^models\//, '');
    if (/^(AIza|AQ\.|sk-ant-)/.test(model)) model = '';   // una clave pegada en el campo del modelo
    return { provider: a.provider || 'gemini', key: this.cleanKey(a.key), model: model, ok: a.ok || '' };
  }

  setAi(patch) {
    const cur = this.aiCfg();
    const next = Object.assign({}, cur, patch);
    if ('key' in patch) {
      next.key = this.cleanKey(patch.key);
      // la clave dice de quién es: AIza… o AQ.… es de Google y sk-ant-… de Anthropic
      if (/^(AIza|AQ\.)/.test(next.key)) next.provider = 'gemini';
      else if (/^sk-ant-/.test(next.key)) next.provider = 'claude';
    }
    if (next.key !== cur.key || next.provider !== cur.provider || next.model !== cur.model) next.ok = '';
    this.setPref('ai', next);
  }

  // Recuerda el modelo que respondió: Ajustes muestra «Conectada» solo después de una respuesta real
  aiMarkOk(model) {
    this._aiLast = model;
    const a = this.state.prefs.ai || {};
    if (a.ok !== model) this.setPref('ai', Object.assign({}, a, { ok: model }));
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

  // Google cambia y retira modelos: se le pregunta cuáles acepta esta clave y se eligen los Flash, del más nuevo al más viejo
  async geminiModels(cfg) {
    if (cfg.model) return { pro: [], flash: [cfg.model], lite: [], good: {} };
    if (this._gm && this._gm.key === cfg.key) return this._gm;
    let r, d;
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 15000) : 0;
    try {
      r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=' + encodeURIComponent(cfg.key), { signal: ac ? ac.signal : undefined });
      d = await r.json().catch(() => ({}));
    } catch (e) { clearTimeout(timer); throw new Error(e && e.name === 'AbortError' ? 'ocupada' : 'red'); }
    clearTimeout(timer);
    if (!r.ok) throw this.aiErrorFrom(r.status, d);
    const names = (d.models || []).filter((m) => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0)
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((n) => /^gemini-/.test(n) && !/(image|tts|audio|live|embed|thinking|exp|8b|native|robotics|computer|omni|customtools)/.test(n));
    const ver = (n) => { const m = n.match(/^gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
    const score = (n) => (/-latest$/.test(n) ? 1000 : 0) + ver(n) * 10 + (/preview/.test(n) ? 0 : 1) - (/-\d{3}$|\d{2}-\d{2,4}$/.test(n) ? 0.5 : 0);
    const pick = (re, not) => names.filter((n) => re.test(n) && !(not && not.test(n))).sort((a, b) => score(b) - score(a));
    let pro = pick(/-pro/).slice(0, 1), flash = pick(/flash/, /lite/).slice(0, 2), lite = pick(/flash-lite/).slice(0, 2);
    if (!flash.length && !lite.length) { flash = ['gemini-flash-latest']; lite = ['gemini-flash-lite-latest']; }
    this._gm = { key: cfg.key, pro: pro, flash: flash, lite: lite, good: {} };
    return this._gm;
  }

  /* Cada tarea con su modelo:
     - «hondo» (análisis de las fotos del cuerpo, una vez por semana): Pro si tu plan lo incluye (en el gratis responde 429
       en un segundo y sigue), después Flash razonando lo normal, y Flash-Lite si Google está saturado.
     - «foto» (comida): Flash con razonamiento bajo, y Flash-Lite de respaldo.
     - «texto» (chat, informe del día, revisión de rutina): Flash con razonamiento bajo (unos 6 s) y Flash-Lite.
     Respaldo en paralelo: si un modelo no responde en unos segundos (8 en texto, 12 en fotos de comida, 60 en el análisis
     del cuerpo), se le pregunta también al siguiente y gana el primero que conteste. El Flash gratis a veces acepta la
     consulta y tarda más de un minuto; antes eso dejaba la comida «cargando» hasta cuatro minutos. Si un modelo no existe,
     no tiene cuota o está saturado, se pasa al siguiente de inmediato. */
  async geminiRun(cfg, parts, gen, tier) {
    const gm = await this.geminiModels(cfg);
    tier = tier || (parts.length > 1 ? 'foto' : 'texto');
    // el respaldo de un Flash lento es un Flash-Lite (rápido), no otro Flash: suelen ser el mismo modelo y estar igual de saturados
    const mix = [];
    for (let k = 0; k < Math.max(gm.flash.length, gm.lite.length); k++) { if (gm.flash[k]) mix.push(gm.flash[k]); if (gm.lite[k]) mix.push(gm.lite[k]); }
    let models = tier === 'hondo' ? gm.pro.concat(gm.flash, gm.lite) : mix;
    const good = gm.good[tier];
    if (good) models = [good].concat(models.filter((m) => m !== good));
    const limit = (m) => /-pro/.test(m) ? 120000 : /lite/.test(m) ? (tier === 'texto' ? 30000 : 60000) : tier === 'hondo' ? 100000 : tier === 'foto' ? 45000 : 25000;
    const hedge = tier === 'hondo' ? 60000 : tier === 'foto' ? 12000 : 8000;
    const retry = ['modelo', 'limite', 'sincuota', 'ocupada', 'vacio'];
    return new Promise((resolve, reject) => {
      let i = 0, pending = 0, done = false, last = new Error('modelo'), timer = 0;
      const ctrls = [];
      const finish = (ok, val, m) => {
        if (done) return;
        done = true; clearTimeout(timer);
        ctrls.forEach((c) => { try { c.abort(); } catch (e) {} });
        if (ok) { gm.good[tier] = m; this.aiMarkOk(m); resolve(val); } else reject(val);
      };
      const next = () => {
        clearTimeout(timer);
        if (done) return;
        if (i >= models.length) { if (!pending) finish(false, last); return; }
        const m = models[i++];
        const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
        if (ac) ctrls.push(ac);
        pending++;
        this.geminiTry(cfg, m, parts, gen, tier, ac, limit(m)).then((t) => { pending--; finish(true, t, m); }, (e) => {
          pending--;
          if (done) return;
          if (retry.indexOf(e && e.message) >= 0) { last = e; next(); } else finish(false, e);
        });
        timer = setTimeout(next, hedge);   // si tarda, se suma el siguiente modelo sin cortar este
      };
      next();
    });
  }

  // Una consulta a un modelo: devuelve el texto o un Error con el código del motivo
  async geminiTry(cfg, model, parts, gen, tier, ac, wait) {
    const g = Object.assign({}, gen);
    if (!/^gemini-[12]\./.test(model)) {   // Gemini 3 en adelante, y los alias -latest que apuntan a ellos
      delete g.temperature;   // Gemini 3 pide dejar la temperatura por defecto
      // por defecto razona harto (30–45 s); con «low» responde en unos 6 s. El análisis del cuerpo razona lo normal.
      if (tier !== 'hondo' && (!this._noThink || !this._noThink[model])) g.thinkingConfig = { thinkingLevel: 'low' };
    }
    let timedOut = false;
    const timer = ac ? setTimeout(() => { timedOut = true; ac.abort(); }, wait) : 0;
    let r, d;
    try {
      r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(cfg.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac ? ac.signal : undefined,
        body: JSON.stringify({ contents: [{ role: 'user', parts: parts }], generationConfig: g })
      });
      d = await r.json().catch(() => ({}));
    } catch (e) {
      clearTimeout(timer);
      // tardó demasiado (o ganó otro modelo y esta se canceló)
      throw new Error(e && e.name === 'AbortError' ? (timedOut ? 'ocupada' : 'cancelada') : 'red');
    }
    clearTimeout(timer);
    if (!r.ok) {
      // un modelo que no acepta el nivel de razonamiento: se repite sin él
      if (r.status === 400 && g.thinkingConfig && /thinking/i.test(String((d.error || {}).message || ''))) {
        this._noThink = Object.assign({}, this._noThink, { [model]: true });
        return this.geminiTry(cfg, model, parts, gen, tier, ac, wait);
      }
      throw this.aiErrorFrom(r.status, d);
    }
    const c = d.candidates && d.candidates[0];
    const t = c && c.content && c.content.parts ? c.content.parts.filter((p) => !p.thought).map((p) => p.text || '').join('') : '';
    if (!t) {
      const why = (d.promptFeedback && d.promptFeedback.blockReason) || (c && c.finishReason) || '';
      throw new Error(/SAFETY|PROHIBITED|BLOCK|SPII|IMAGE_SAFETY|OTHER/.test(why) ? 'bloqueo' : 'vacio');
    }
    return t;
  }

  async claudeRun(cfg, content, maxTokens, tier) {
    const model = cfg.model || (tier === 'hondo' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5');
    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        // Haiku 5.5 y Sonnet 5.5 razonan antes de responder y ese razonamiento cuenta en max_tokens: con un tope bajo la
        // respuesta salía cortada. Solo se cobra lo que se usa.
        body: JSON.stringify({ model: model, max_tokens: Math.max(maxTokens || 0, 16000), messages: [{ role: 'user', content: content }] })
      });
    } catch (e) { throw new Error('red'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw this.aiErrorFrom(r.status, d);
    const t = (d.content || []).map((x) => x.text || '').join('');
    if (!t) throw new Error(d.stop_reason === 'refusal' ? 'bloqueo' : 'vacio');
    this.aiMarkOk(model);
    return t;
  }

  async callGemini(cfg, prompt, img, json) {
    const parts = [{ text: prompt }];
    if (img) parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } });
    const gen = { temperature: 0.2 };
    if (json) gen.responseMimeType = 'application/json';
    return this.geminiRun(cfg, parts, gen);
  }

  async callClaude(cfg, prompt, img) {
    const content = [];
    if (img) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } });
    content.push({ type: 'text', text: prompt });
    return this.claudeRun(cfg, content, 1500);
  }

  // Lee el motivo que da el proveedor (Google o Anthropic) y lo pasa a un código con su texto en Ajustes
  aiErrorFrom(status, d) {
    const er = (d && d.error) || {};
    const msg = String(er.message || '');
    const det = Array.isArray(er.details) ? er.details : [];
    const reason = String((det.find((x) => x && x.reason) || {}).reason || '');
    const st = String(er.status || er.type || '');
    const all = reason + ' ' + st + ' ' + msg;
    let code;
    if (/EXPIRED|expired/.test(all)) code = 'vencida';
    else if (/API_KEY_INVALID|API key not valid|invalid x-api-key|authentication_error/i.test(all)) code = 'clave';
    else if (/SERVICE_DISABLED|has not been used in project|is disabled/i.test(all)) code = 'servicio';
    else if (/REFERRER_BLOCKED|referer|referrer|_SERVICE_BLOCKED|IP_ADDRESS_BLOCKED|APP_BLOCKED/i.test(all)) code = 'restringida';
    else if (/location is not supported|not available in your country|User location/i.test(all)) code = 'region';
    else if (/credit balance|billing|prepay/i.test(all) && status !== 429) code = 'saldo';
    else if (status === 429 || /RESOURCE_EXHAUSTED|rate_limit_error/.test(st)) code = /limit:\s*0\b|free_tier.*limit: 0/.test(msg) ? 'sincuota' : 'limite';
    else if (status === 404 || /NOT_FOUND|not_found_error/.test(st)) code = 'modelo';
    else if (status === 401 || status === 403) code = 'clave';
    else if (status >= 500 || /overloaded_error|UNAVAILABLE/.test(st)) code = 'ocupada';
    else code = 'otro';
    // si la clave falla, Ajustes deja de decir «Conectada»
    if (['clave', 'vencida', 'servicio', 'restringida', 'region', 'saldo'].indexOf(code) >= 0) {
      const a = this.state.prefs.ai || {};
      if (a.ok) this.setPref('ai', Object.assign({}, a, { ok: '' }));
    }
    const e = new Error(code);
    e.detail = msg.replace(/\s+/g, ' ').slice(0, 220);
    e.status = status;
    return e;
  }

  aiErrorText(e) {
    const m = e && e.message;
    const cfg = this.aiCfg();
    const g = cfg.provider !== 'claude';
    const who = g ? 'Google' : 'Anthropic';
    if (m === 'nokey') return 'Conecta la IA en Ajustes para analizar tus comidas.';
    if (m === 'clave') return g ? 'Google dice que esa clave no es válida. Cópiala de nuevo, completa, desde AI Studio: empieza con AQ. o con AIza.' : 'Anthropic dice que esa clave no es válida. Cópiala de nuevo, completa: empieza con sk-ant-.';
    if (m === 'vencida') return 'Esa clave venció. Crea una nueva en ' + (g ? 'AI Studio' : 'la consola de Anthropic') + ' y pégala en Ajustes.';
    if (m === 'servicio') return 'Esa clave es de un proyecto de Google Cloud sin la API de Gemini activada. Crea la clave en AI Studio, con el botón «Obtener clave».';
    if (m === 'restringida') return 'La clave tiene restricciones (de sitio, app o IP) y ' + who + ' rechaza las llamadas desde keystone. Crea una clave nueva sin restricciones.';
    if (m === 'region') return 'Google no ofrece la API de Gemini desde donde te estás conectando. Prueba sin VPN o usa Claude.';
    if (m === 'sincuota') return 'Tu clave no tiene uso gratis disponible en los modelos Flash. En AI Studio revisa el plan de tu proyecto o activa la facturación, o usa Claude.';
    if (m === 'saldo') return 'Tu cuenta de Anthropic no tiene saldo. Carga crédito en la consola de Anthropic.';
    if (m === 'limite') return 'Llegaste al límite de uso por ahora. Intenta de nuevo en un minuto.';
    if (m === 'ocupada') return 'La IA está saturada en este momento. Intenta de nuevo en unos minutos.';
    if (m === 'bloqueo') return 'La IA no quiso responder por sus filtros de contenido. En las fotos del cuerpo usa ropa deportiva (short y polera ajustada) e intenta otra vez.';
    if (m === 'formato' || m === 'vacio') return 'La IA no devolvió un resultado claro. Prueba con otra foto o descríbelo con palabras.';
    if (m === 'modelo') return cfg.model ? 'El modelo «' + cfg.model + '» no está disponible con tu clave. Deja vacío el campo Modelo en Ajustes.' : 'Ningún modelo de ' + who + ' respondió con tu clave. Revisa la clave en Ajustes.';
    if (m === 'img') return 'No se pudo leer esa imagen.';
    if (m === 'otro') return who + ' rechazó la solicitud' + (e.detail ? ': «' + e.detail + '»' : '.');
    return 'No hay conexión con la IA. Revisa tu internet e intenta otra vez.';
  }

  parseJSON(txt) {
    const s = String(txt || '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('formato');
    const clean = (v) => typeof v === 'string' ? this.aiPlain(v) : Array.isArray(v) ? v.map(clean)
      : v && typeof v === 'object' ? Object.keys(v).reduce((o, k) => { o[k] = clean(v[k]); return o; }, {}) : v;
    return clean(JSON.parse(s.slice(a, b + 1)));
  }

  // Gemini y Claude responden con Markdown (**negritas**, viñetas con *, títulos con #): la app muestra texto plano
  aiPlain(s) {
    return String(s || '')
      .replace(/\r/g, '')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^(\s*)[*+-]\s+/gm, '$1• ')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/__([^_\n]+)__/g, '$1')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/gm, '$1$2')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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
      // si tarda, se avisa: así no parece pegada
      const slow = setTimeout(() => { const f = this.state.fdraft; if (f && f.id === id && f.status === 'loading') this.setState({ fdraft: Object.assign({}, f, { slow: true }) }); }, 8000);
      let j;
      try { j = await this.aiJSON(this.foodPrompt(name, text, !!img), img); } finally { clearTimeout(slow); }
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
            q: e.q || '', hasQ: !!e.q, qColor: this.healthColor(e.q * 10, dark), qText: this.healthText(e.q * 10, dark),
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
      kcal: r0(tot.kcal), goal: this.fmt(T.kcal), left: this.fmt(Math.abs(left)), leftLabel: left >= 0 ? 'Te quedan' : 'Sobre tu meta',
      hasKcal: tot.kcal > 0, noKcal: !(tot.kcal > 0),
      ringOff: (351.9 * (1 - Math.min(1, tot.kcal / T.kcal))).toFixed(1), ringColor: tot.kcal > T.kcal * 1.05 ? c.heat : th.text,
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
      dLoadText: fd && fd.slow ? 'La IA de Google está lenta: le pregunto también a un modelo más rápido…' : 'Identificando alimentos y porciones…',
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
