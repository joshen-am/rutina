
  /* ================================================================ versión 28 ================================================================
     Rutina adaptativa, check-in diario, fotos de progreso con análisis de IA, aspecto, chat con el entrenador e informe mensual. */

  /* ---------- IA: varias imágenes o texto libre (la de Comida acepta una sola imagen) ---------- */

  async aiCallN(prompt, imgs, json, maxTokens, tier) {
    const cfg = this.aiCfg();
    if (!cfg.key) throw new Error('nokey');
    imgs = imgs || [];
    let t;
    if (cfg.provider === 'claude') {
      const content = imgs.map((b) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b } }));
      content.push({ type: 'text', text: prompt });
      t = await this.claudeRun(cfg, content, maxTokens || 2000, tier);
    } else {
      const parts = [{ text: prompt }].concat(imgs.map((b) => ({ inline_data: { mime_type: 'image/jpeg', data: b } })));
      const gen = { temperature: json ? 0.2 : 0.6 };
      if (json) gen.responseMimeType = 'application/json';
      t = await this.geminiRun(cfg, parts, gen, tier);
    }
    return json ? this.parseJSON(t) : this.aiPlain(t);
  }

  aiProviderName() { return this.aiCfg().provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'; }

  aiPhotoNote() {
    return this.aiCfg().provider === 'claude'
      ? 'Las fotos viajan a Anthropic con tu clave solo para este análisis. Anthropic no usa lo que se envía por su API para entrenar sus modelos.'
      : 'Las fotos viajan a Google con tu clave solo para este análisis. Con el plan gratis de Gemini, Google puede usarlas para mejorar sus modelos: para fotos del cuerpo conviene el plan pagado o Claude.';
  }

  /* ---------- contexto para la IA: un resumen corto de tus datos ---------- */

  aiContext() {
    const st = this.state;
    const hp = st.hp || {};
    const T = this.targets();
    const xn = this.exerciseNames();
    const lines = [];
    lines.push('Perfil: ' + [hp.sexo, hp.edad ? hp.edad + ' años' : '', hp.altura ? hp.altura + ' cm' : '', this.peso() + ' kg'].filter(Boolean).join(', ') + '.');
    lines.push('Objetivo: ' + this.goalLabel() + '. Semana ' + this.programWeek() + ' del programa (fase ' + this.programPhase(this.programWeek()) + ').');
    lines.push('Entrena en casa sin equipamiento, salvo una mancuerna de 3 kg y lo que hay en la casa (pared, mesón, silla, sofá, escalón, marco de la puerta).');
    const w0 = this.weekSummary(0), w1 = this.weekSummary(1);
    lines.push('Esta semana: ' + w0.sessions + ' de ' + w0.meta + ' sesiones; la anterior: ' + w1.sessions + '. Hábitos: ' + (w0.habits == null ? 's/d' : w0.habits + ' %') + '. Proteína promedio: ' + (w0.prot == null ? 's/d' : w0.prot + ' g de ' + T.prot + ' g') + '.');
    const xs = Object.keys(st.xlog || {}).map((k) => { const h = st.xlog[k]; const l = h[h.length - 1]; return (xn[k] || k) + ': ' + l.r.join('/') + (l.u === 's' ? ' s' : '') + ' (' + l.d + ')'; });
    if (xs.length) lines.push('Últimas series registradas: ' + xs.slice(0, 14).join('; ') + '.');
    const meas = (st.meas || []).slice(-4).map((m) => m.d + ' ' + ['peso', 'cintura', 'pecho', 'brazo', 'cadera', 'hombros'].filter((f) => m[f] != null).map((f) => f + ' ' + m[f]).join(' '));
    if (meas.length) lines.push('Medidas: ' + meas.join(' | ') + '.');
    const ck = this.checkinAvg(7);
    if (ck) lines.push('Check-in 7 días (1 a 5): sueño ' + ck.sleep + ', energía ' + ck.energy + ', ánimo ' + ck.mood + ', dolor muscular ' + ck.sore + '.');
    const an = this.lastAnalysis();
    if (an) lines.push('Último análisis de fotos (' + an.d + '): ' + an.resumen + (an.grasa ? ' Grasa estimada ' + an.grasa.min + '–' + an.grasa.max + ' %.' : ''));
    if (st.hp) { const ar = this.healthAreas().map((a) => a.name + ' ' + (a.score == null ? 's/d' : a.score)).join(', '); lines.push('Perfil de salud por área (0–100): ' + ar + '.'); }
    return lines.join('\n');
  }

  /* ================================================================ rutina adaptativa ================================================================ */

  goals() {
    return [
      { id: 'general', label: 'General' }, { id: 'grasa', label: 'Bajar grasa' }, { id: 'musculo', label: 'Ganar músculo' },
      { id: 'postura', label: 'Postura' }, { id: 'estetica', label: 'Estética' }
    ];
  }

  goalLabel() { const g = this.state.prefs.goal || 'general'; return (this.goals().find((x) => x.id === g) || this.goals()[0]).label; }

  cycleGoal() {
    const G = this.goals();
    const i = G.findIndex((x) => x.id === (this.state.prefs.goal || 'general'));
    this.sfx('tap');
    this.setPref('goal', G[(i + 1) % G.length].id);
  }

  adapt() {
    const a = this.state.adapt || {};
    return { swaps: a.swaps || {}, sets: a.sets || {}, extras: a.extras || {}, dismissed: a.dismissed || {}, log: a.log || [], skipDeload: a.skipDeload || {}, ai: a.ai || null };
  }

  /* Semana de descarga cada 6 semanas: una serie menos en cada ejercicio, para recuperarse */
  isDeload(week) { return week >= 6 && week % 6 === 0 && !this.adapt().skipDeload[week]; }

  catalog() { return (this.programData().catalog) || {}; }

  /* Los pasos de una rutina con tus cambios: ejercicios reemplazados, series de más o de menos, extras y la semana de descarga */
  adaptedSteps(rid) {
    const base = this.sessionData()[rid] || [];
    const A = this.adapt();
    const week = this.programWeek();
    const deload = this.isDeload(week);
    const memo = rid + '|' + week + '|' + deload + '|' + JSON.stringify([A.swaps[rid], A.sets[rid], A.extras[rid]]);
    this._steps = this._steps || {};
    if (this._steps[rid] && this._steps[rid].memo === memo) return this._steps[rid].steps;
    const cat = this.catalog();
    const sw = A.swaps[rid] || {}, sd = A.sets[rid] || {}, ex = A.extras[rid] || [];
    const fix = (p, delta) => {
      if (!p.sets) return p;
      let n = p.sets + (delta || 0) - (deload ? 1 : 0);
      n = Math.max(1, Math.min(6, n));
      return n === p.sets ? p : Object.assign({}, p, { sets: n, dose: String(p.dose).replace(/^\d+\s*×/, n + ' ×') });
    };
    const out = [];
    let lastMain = -1;
    base.forEach((p) => {
      let q = p;
      if (p.sets && sw[p.k] && cat[sw[p.k]]) q = Object.assign({}, cat[sw[p.k]], { phase: p.phase, from: p.k });
      out.push(fix(q, sd[p.k]));
      if (p.sets) lastMain = out.length - 1;
    });
    if (ex.length && lastMain >= 0) {
      const add = ex.filter((e) => cat[e.k]).map((e) => fix(Object.assign({}, cat[e.k], { phase: 'Ejercicios', added: true }), (e.sets || cat[e.k].sets) - cat[e.k].sets));
      out.splice.apply(out, [lastMain + 1, 0].concat(add));
    }
    this._steps[rid] = { memo: memo, steps: out };
    return out;
  }

  planRids() {
    const p = this.state.plan || {};
    const out = [];
    Object.keys(p).forEach((d) => { if (p[d] && out.indexOf(p[d]) < 0 && p[d] !== 'caminata' && p[d] !== 'cardio') out.push(p[d]); });
    return out;
  }

  adaptPropose() {
    const st = this.state;
    const A = this.adapt();
    const cat = this.catalog();
    const G = this.programData().groups || {};
    const where = {};
    Object.keys(G).forEach((g) => G[g].forEach((k, i) => { where[k] = { g: g, i: i }; }));
    const R = this.routinesById();
    const out = [];
    const seen = {};
    const push = (x) => { if (!A.dismissed[x.id] && !seen[x.id]) { seen[x.id] = 1; out.push(x); } };
    this.planRids().forEach((rid) => {
      const steps = this.adaptedSteps(rid);
      const used = steps.map((p) => p.k);
      steps.forEach((p) => {
        if (!p.sets || p.added) return;
        const info = this.doseInfo(p);
        const h = this.xHist(p.k);
        if (!info || h.length < 2) return;
        const top = (e) => e.r.length >= p.sets && e.r.every((v) => v >= info.hi);
        const w = where[p.k];
        const slot = p.from || p.k;
        if (top(h[h.length - 1]) && top(h[h.length - 2]) && w && G[w.g][w.i + 1] && used.indexOf(G[w.g][w.i + 1]) < 0) {
          const nk = G[w.g][w.i + 1];
          push({ id: 'sube:' + rid + ':' + slot + ':' + nk, kind: 'swap', rid: rid, slot: slot, to: nk,
            title: 'Sube de nivel en ' + (R[rid] || {}).name, text: p.name + ' → ' + cat[nk].name,
            why: 'Llegaste al tope del rango (' + info.hi + ') dos sesiones seguidas.' });
        } else if (h.length >= 3) {
          const tot = h.slice(-3).map((e) => e.r.reduce((a, b) => a + b, 0));
          if (tot[2] <= tot[0] && !top(h[h.length - 1]) && p.sets < 5) {
            push({ id: 'serie:' + rid + ':' + slot + ':' + h[h.length - 1].d, kind: 'sets', rid: rid, slot: slot, delta: 1,
              title: '+1 serie en ' + (R[rid] || {}).name, text: p.name + ': ' + p.sets + ' → ' + (p.sets + 1) + ' series',
              why: 'Tres sesiones sin mejorar: un poco más de volumen suele destrabar.' });
          }
        }
      });
    });
    const goal = st.prefs.goal || 'general';
    const has = (rid, k) => this.adaptedSteps(rid).some((p) => p.k === k);
    const rids = this.planRids();
    const sup = rids.filter((r) => /superior/.test(r)), leg = rids.filter((r) => /piernas/.test(r));
    const setUp = (rid, k, why) => {
      const p = this.adaptedSteps(rid).find((x) => (x.from || x.k) === k);
      if (p && p.sets < 5) push({ id: 'obj:' + goal + ':' + rid + ':' + k, kind: 'sets', rid: rid, slot: k, delta: 1, title: 'Para tu objetivo (' + this.goalLabel().toLowerCase() + ')', text: p.name + ': ' + p.sets + ' → ' + (p.sets + 1) + ' series en ' + (R[rid] || {}).name, why: why });
    };
    const extra = (rid, k, why) => { if (!has(rid, k) && cat[k]) push({ id: 'obj:' + goal + ':' + rid + ':+' + k, kind: 'extra', rid: rid, k: k, title: 'Para tu objetivo (' + this.goalLabel().toLowerCase() + ')', text: 'Suma ' + cat[k].name.toLowerCase() + ' a ' + (R[rid] || {}).name, why: why }); };
    if (goal === 'estetica') sup.forEach((rid) => { setUp(rid, 'laterales', 'Hombros más anchos marcan la forma en V.'); setUp(rid, 'remo_marco', 'Una espalda más ancha también marca la V.'); });
    if (goal === 'musculo') { sup.forEach((rid) => { setUp(rid, 'flex_rodillas', 'Más volumen en los ejercicios grandes es lo que más hace crecer.'); setUp(rid, 'flex_suelo', 'Más volumen en los ejercicios grandes es lo que más hace crecer.'); }); leg.forEach((rid) => { setUp(rid, 'sentadilla', 'Más volumen en los ejercicios grandes es lo que más hace crecer.'); setUp(rid, 'sumo', 'Más volumen en los ejercicios grandes es lo que más hace crecer.'); }); }
    if (goal === 'postura') sup.forEach((rid) => extra(rid, 'ytw', 'La espalda alta fuerte ayuda a no ir con los hombros hacia adelante.'));
    if (goal === 'grasa') rids.forEach((rid) => extra(rid, 'escalador', 'Un final corto e intenso suma gasto sin alargar la sesión.'));
    return out.slice(0, 6);
  }

  adaptApply(p) { this.adaptApplyMany([p]); }

  adaptApplyMany(list) {
    const A = this.adapt();
    const n = { swaps: Object.assign({}, A.swaps), sets: Object.assign({}, A.sets), extras: Object.assign({}, A.extras), dismissed: Object.assign({}, A.dismissed), log: A.log.slice(), skipDeload: A.skipDeload, ai: A.ai };
    list.forEach((p) => {
      if (p.kind === 'swap') { n.swaps[p.rid] = Object.assign({}, n.swaps[p.rid], { [p.slot]: p.to }); }
      if (p.kind === 'sets') { const s = Object.assign({}, n.sets[p.rid]); s[p.slot] = (s[p.slot] || 0) + p.delta; n.sets[p.rid] = s; }
      if (p.kind === 'extra') { n.extras[p.rid] = (n.extras[p.rid] || []).concat([{ k: p.k }]); }
      n.dismissed[p.id] = Date.now();
      n.log.push({ at: Date.now(), text: p.text });
      if (n.ai && n.ai.props) n.ai = Object.assign({}, n.ai, { props: n.ai.props.filter((x) => x.id !== p.id) });
    });
    n.log = n.log.slice(-30);
    this.sfx('yes');
    this.setState({ adapt: n }, () => this.persist());
  }

  adaptDismiss(p) {
    const A = this.adapt();
    const d = Object.assign({}, A.dismissed, { [p.id]: Date.now() });
    const ai = A.ai && A.ai.props ? Object.assign({}, A.ai, { props: A.ai.props.filter((x) => x.id !== p.id) }) : A.ai;
    this.sfx('tap');
    this.setState({ adapt: Object.assign({}, this.state.adapt, { dismissed: d, ai: ai }) }, () => this.persist());
  }

  adaptReset() {
    this.sfx('no');
    this.setState({ adapt: { dismissed: this.adapt().dismissed, log: this.adapt().log.concat([{ at: Date.now(), text: 'Volviste a la rutina original' }]).slice(-30) } }, () => this.persist());
  }

  skipDeload() {
    const A = this.adapt();
    const w = this.programWeek();
    this.sfx('tap');
    this.setState({ adapt: Object.assign({}, this.state.adapt, { skipDeload: Object.assign({}, A.skipDeload, { [w]: true }) }) }, () => this.persist());
  }

  /* Revisión de la rutina con IA: propone cambios dentro del catálogo; nada se aplica sin tu sí */
  async adaptAskAI() {
    if (this.state.adaptBusy) return;
    this.sfx('open');
    this.setState({ adaptBusy: true, adaptErr: '' });
    try {
      const cat = this.catalog();
      const R = this.routinesById();
      const rids = this.planRids();
      const rut = rids.map((rid) => rid + ' (' + (R[rid] || {}).name + '): ' + this.adaptedSteps(rid).filter((p) => p.sets).map((p) => p.k + ' ' + p.dose).join(', ')).join('\n');
      const catTxt = Object.keys(cat).map((k) => k + ' = ' + cat[k].name + ' (' + cat[k].dose + ')').join('\n');
      const prompt = [
        'Eres el entrenador de la app keystone. Revisa la rutina de esta persona y propone como máximo 4 cambios concretos para la próxima semana.',
        this.aiContext(),
        'Rutinas actuales (clave: ejercicio y dosis):', rut,
        'Solo puedes usar ejercicios de este catálogo (clave = nombre):', catTxt,
        'Escaleras de progresión (de fácil a difícil): ' + JSON.stringify(this.programData().groups || {}),
        'Tipos de cambio: "cambiar" (reemplazar un ejercicio de una rutina por otro del catálogo), "series" (sumar o restar 1 serie a un ejercicio), "agregar" (sumar un ejercicio del catálogo a una rutina).',
        'Responde SOLO con JSON válido: {"resumen":"dos frases en español de Chile","cambios":[{"tipo":"cambiar|series|agregar","rutina":"clave de rutina","ejercicio":"clave actual","por":"clave nueva (solo en cambiar o agregar)","delta":1,"motivo":"una frase"}]}',
        'Reglas: nada que requiera equipamiento fuera de la mancuerna de 3 kg y la casa; progresión gradual; si el dolor muscular o el sueño están mal, prioriza recuperación; no propongas lo mismo que ya está.'
      ].join('\n\n');
      const j = await this.aiCallN(prompt, [], true, 1500);
      const props = [];
      (Array.isArray(j.cambios) ? j.cambios : []).slice(0, 4).forEach((c, i) => {
        const rid = String(c.rutina || ''), k = String(c.ejercicio || ''), to = String(c.por || '');
        if (rids.indexOf(rid) < 0) return;
        const steps = this.adaptedSteps(rid);
        const cur = steps.find((p) => p.k === k || p.from === k);
        const base = { id: 'ia:' + Date.now().toString(36) + ':' + i, rid: rid, title: 'Propuesta de la IA', why: String(c.motivo || '').slice(0, 200) };
        if (c.tipo === 'cambiar' && cur && cat[to] && !cur.added) props.push(Object.assign(base, { kind: 'swap', slot: cur.from || cur.k, to: to, text: cur.name + ' → ' + cat[to].name + ' en ' + (R[rid] || {}).name }));
        else if (c.tipo === 'series' && cur && !cur.added) { const dl = Number(c.delta) < 0 ? -1 : 1; props.push(Object.assign(base, { kind: 'sets', slot: cur.from || cur.k, delta: dl, text: cur.name + ': ' + cur.sets + ' → ' + (cur.sets + dl) + ' series en ' + (R[rid] || {}).name })); }
        else if (c.tipo === 'agregar' && cat[to] && !steps.some((p) => p.k === to)) props.push(Object.assign(base, { kind: 'extra', k: to, text: 'Suma ' + cat[to].name.toLowerCase() + ' a ' + (R[rid] || {}).name }));
      });
      const A = this.adapt();
      this.setState({ adaptBusy: false, adapt: Object.assign({}, this.state.adapt, { ai: { at: Date.now(), resumen: String(j.resumen || '').slice(0, 400), props: props } }) }, () => this.persist());
      this.sfx(props.length ? 'done' : 'tap');
    } catch (e) {
      this.setState({ adaptBusy: false, adaptErr: this.aiErrorText(e).replace('analizar tus comidas', 'revisar tu rutina') });
      this.sfx('no');
    }
  }

  /* ================================================================ check-in diario ================================================================ */

  daily(key) { return ((this.state.daily || {})[key || this.keyOf(new Date())]) || {}; }

  dailySet(patch, key) {
    const k = key || this.keyOf(new Date());
    const all = Object.assign({}, this.state.daily || {});
    all[k] = Object.assign({}, all[k] || {}, patch, { at: Date.now() });
    this.setState({ daily: all }, () => this.persist());
  }

  checkinAvg(days) {
    const st = this.state;
    const now = new Date();
    const acc = { sleep: [], energy: [], mood: [], sore: [] };
    for (let i = 0; i < days; i++) {
      const d = st.daily && st.daily[this.keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))];
      if (d) Object.keys(acc).forEach((f) => { if (d[f]) acc[f].push(d[f]); });
    }
    if (!acc.sleep.length && !acc.energy.length) return null;
    const avg = (a) => (a.length ? this.fmtNum(Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10) : 's/d');
    return { sleep: avg(acc.sleep), energy: avg(acc.energy), mood: avg(acc.mood), sore: avg(acc.sore) };
  }

  /* Informe del día: reglas simples y explicables con tu check-in, la recuperación, la comida de ayer y tus hábitos */
  briefing() {
    const st = this.state;
    const now = new Date();
    const today = this.keyOf(now);
    const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const y = this.keyOf(yd);
    const d = this.daily(today);
    const r = this.routineAt(this.todayIdx());
    const out = [];
    const prev = this.daily(y);
    if (prev.better) out.push({ k: 'mejora', text: 'Tu mejora para hoy: ' + prev.better.charAt(0).toLowerCase() + prev.better.slice(1) + '.' });
    const low = (d.sleep && d.sleep <= 2) || (d.energy && d.energy <= 2);
    if (!r || r.id === 'caminata') out.push({ k: 'plan', text: r ? 'Hoy toca caminata: 45 a 60 min a paso firme.' : 'Hoy es descanso: camina 20 a 30 min y estira 5. Recuperar también es parte del plan.' });
    else if (low) out.push({ k: 'plan', text: 'Dormiste mal o estás con poca energía: haz ' + r.name.toLowerCase() + ' con una serie menos por ejercicio, o cámbiala por una caminata.' });
    else if (d.sore >= 4) out.push({ k: 'plan', text: 'Tienes harto dolor muscular: calienta el doble y baja la intensidad. Si duele una articulación, descansa.' });
    else {
      const ready = this.adaptedSteps(r.id).find((p) => p.sets && this.repReady(p, today));
      out.push({ k: 'plan', text: 'Todo en orden: hoy toca ' + r.name.toLowerCase() + '.' + (ready ? ' Llegaste al tope en ' + ready.name.toLowerCase() + ': prueba subir de nivel.' : ' Busca una repetición más que la última vez.') });
    }
    const fat = this.fatigue(st);
    const tired = Object.keys(fat).filter((m) => fat[m].load >= 0.6).sort((a, b) => fat[b].load - fat[a].load)[0];
    if (tired && r && r.id !== 'caminata') out.push({ k: 'recup', text: tired + ' siguen recuperándose (' + Math.round(fat[tired].load * 100) + ' %): cuida la técnica y no fuerces ahí.' });
    const T = this.targets();
    const yt = this.dayTotals(y);
    const ylog = (st.flog || {})[y];
    const hadFood = ylog && Object.keys(ylog).some((m) => (ylog[m] || []).length);
    if (!hadFood) out.push({ k: 'comida', text: 'Ayer no registraste comidas: una foto por comida basta para ver tu proteína.' });
    else if (yt.p < T.prot * 0.8) out.push({ k: 'comida', text: 'Ayer comiste ' + Math.round(yt.p) + ' g de proteína de ' + T.prot + ' g: suma 2 huevos o un yogur griego al desayuno.' });
    const wy = ((st.hlog || {})[y] || {}).agua || 0;
    const wg = this.waterGoal(yd);
    if (hadFood && wy && wy < wg * 0.7) out.push({ k: 'agua', text: 'Ayer tomaste ' + wy + ' de ' + wg + ' vasos de agua: deja una botella a la vista.' });
    return out.slice(0, 3);
  }

  /* Cierre del día: lo que salió bien y una sola mejora para mañana, sugeridas con tus datos */
  closingChips() {
    const st = this.state;
    const now = new Date();
    const key = this.keyOf(now);
    const T = this.targets();
    const t = this.dayTotals(key);
    const e = st.log[key];
    const good = [];
    const better = [];
    if (e && e.status === 'done') good.push('Entrené'); else if (this.routineAt(this.todayIdx())) better.push('Entrenar aunque sea el calentamiento');
    if (t.p >= T.prot * 0.9) good.push('Llegué a la proteína'); else better.push('Proteína en el desayuno');
    const w = ((st.hlog || {})[key] || {}).agua || 0;
    if (w >= this.waterGoal(now)) good.push('Tomé mi agua'); else better.push('Un vaso de agua al despertar');
    const sc = this.dayScore(key, now);
    if (sc != null && sc >= 0.7) good.push('Cumplí mis hábitos');
    const d = this.daily(key);
    if (d.sleep && d.sleep <= 3) better.push('Acostarme 30 min antes');
    better.push('Caminar 10 min después de almorzar');
    good.push('Me cuidé hoy');
    return { good: good.slice(0, 4), better: better.slice(0, 4) };
  }

  async dailyAI() {
    if (this.state.dailyBusy) return;
    this.sfx('open');
    this.setState({ dailyBusy: true, dailyErr: '' });
    try {
      const b = this.briefing().map((x) => '- ' + x.text).join('\n');
      const d = this.daily();
      const prompt = ['Eres el entrenador de la app keystone. Escribe el análisis de hoy en 3 viñetas cortas (máximo 25 palabras cada una), en español de Chile, tuteo, concretas y accionables. Sin saludos ni relleno.',
        this.aiContext(), 'Check-in de hoy (1 a 5): sueño ' + (d.sleep || 's/d') + ', energía ' + (d.energy || 's/d') + ', ánimo ' + (d.mood || 's/d') + ', dolor ' + (d.sore || 's/d') + '.',
        'Lo que ya calculó la app:', b,
        'Responde SOLO con JSON: {"vinetas":["",""]}'].join('\n\n');
      const j = await this.aiCallN(prompt, [], true, 600);
      const v = (Array.isArray(j.vinetas) ? j.vinetas : []).map((x) => String(x).slice(0, 220)).filter(Boolean).slice(0, 4);
      this.dailySet({ ai: v });
      this.setState({ dailyBusy: false });
      this.sfx('done');
    } catch (e) {
      this.setState({ dailyBusy: false, dailyErr: this.aiErrorText(e).replace('analizar tus comidas', 'analizar tu día') });
      this.sfx('no');
    }
  }

  /* ================================================================ fotos de progreso ================================================================ */

  poseDefs() {
    return {
      frente: { label: 'Frente', tip: 'De frente, brazos sueltos a los lados y pies al ancho de la cadera.' },
      perfil: { label: 'Perfil', tip: 'De lado, con el hombro derecho hacia la cámara, brazos sueltos y mirada al frente.' },
      espalda: { label: 'Espalda', tip: 'De espaldas, brazos sueltos y pies al ancho de la cadera.' },
      cara: { label: 'Cara', tip: 'La cara de frente, sin sonreír, con luz pareja y sin flash.' }
    };
  }

  bodySets() { return (this.state.bodyPhotos || []).slice().sort((a, b) => a.at - b.at); }

  lastAnalysis() {
    const s = this.bodySets().filter((x) => x.an);
    return s.length ? Object.assign({ d: s[s.length - 1].d }, s[s.length - 1].an) : null;
  }

  bodyImg(id, pose, thumb) {
    const key = (thumb ? 'bodyT:' : 'body:') + id + ':' + pose;
    this._bp = this._bp || {};
    if (this._bp[key] !== undefined) return this._bp[key];
    this._bp[key] = null;
    this.idbKey('get', key).then((d) => { if (d) { this._bp[key] = d; this.forceUpdate(); } });
    return null;
  }

  photoDue() {
    const s = this.bodySets();
    if (!s.length) return true;
    return Date.now() - s[s.length - 1].at > 6.5 * 864e5;
  }

  openCapture(face) {
    const poses = ['frente', 'perfil', 'espalda'].concat(face ? ['cara'] : []);
    this.sfx('open');
    this.setState({ cap: { i: 0, poses: poses, shots: {}, phase: 'live', count: 0, facing: (this.state.cap && this.state.cap.facing) || 'user', err: '' }, photos: false });
  }

  closeCapture() {
    this.sfx('tap');
    this.stopCam();
    this.setState({ cap: null });
  }

  stopCam() {
    if (this.camTimer) { clearInterval(this.camTimer); this.camTimer = null; }
    if (this._camRaf) { cancelAnimationFrame(this._camRaf); this._camRaf = 0; }
    if (this._stream) { try { this._stream.getTracks().forEach((t) => t.stop()); } catch (e) {} this._stream = null; }
  }

  /* La cámara se prende cuando la pantalla de captura está abierta y en vivo; se apaga al salir */
  syncCam() {
    const cap = this.state.cap;
    const live = cap && (cap.phase === 'live' || cap.phase === 'count');
    if (!live) { if (this._stream && !cap) this.stopCam(); return; }
    const v = document.getElementById('cam');
    if (this._stream && this._streamFacing !== cap.facing) this.stopCam();
    if (!this._stream && !this._camPending) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { if (!cap.err) this.setState({ cap: Object.assign({}, cap, { err: 'nocam' }) }); return; }
      this._camPending = true;
      navigator.mediaDevices.getUserMedia({ video: { facingMode: cap.facing, width: { ideal: 1080 }, height: { ideal: 1440 } }, audio: false })
        .then((s) => { this._camPending = false; if (!this.state.cap) { s.getTracks().forEach((t) => t.stop()); return; } this._stream = s; this._streamFacing = cap.facing; this.forceUpdate(); })
        .catch(() => { this._camPending = false; if (this.state.cap) this.setState({ cap: Object.assign({}, this.state.cap, { err: 'nocam' }) }); });
      return;
    }
    if (!v || !this._stream) return;
    if (!this._camRaf) this._camRaf = requestAnimationFrame(() => this.camDraw());
    if (v.srcObject !== this._stream) {
      // iPhone: el video en vivo solo se reproduce solo si está silenciado y en línea por código; el atributo del HTML
      // no basta. Si no, queda pausado y se ve negro, aunque la foto igual sale.
      v.muted = true; v.defaultMuted = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.srcObject = this._stream;
      const go = () => this.camPlay(v, false);
      v.onloadedmetadata = go;
      go();
      // si a los 1,5 s sigue sin imagen, se pide un toque (iOS a veces exige un gesto para reproducir)
      clearTimeout(this._camCheck);
      this._camCheck = setTimeout(() => {
        const c = this.state.cap, el = document.getElementById('cam');
        if (c && el && (el.paused || el.readyState < 2) && !c.tapPlay && (c.phase === 'live' || c.phase === 'count')) this.setState({ cap: Object.assign({}, c, { tapPlay: true }) });
      }, 1500);
    } else if (v.paused && !(this.state.cap || {}).tapPlay) this.camPlay(v, false);
  }

  /* La vista en vivo se dibuja en un lienzo, cuadro a cuadro, desde el video. En iPhone el video puede estar
     reproduciendo y aun así no pintarse (se veía negro), pero copiarlo a un lienzo funciona: es lo mismo que hace la
     foto. Si el video sí se pinta, el lienzo muestra exactamente lo mismo encima. */
  camDraw() {
    const c = this.state.cap;
    if (!c || !(c.phase === 'live' || c.phase === 'count') || !this._stream) { this._camRaf = 0; return; }
    const v = document.getElementById('cam'), cv = document.getElementById('camcv');
    if (v && cv && v.videoWidth && v.readyState >= 2) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (W && H) {
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        // como object-fit: cover
        const vw = v.videoWidth, vh = v.videoHeight, k = Math.max(W / vw, H / vh);
        const sw = W / k, sh = H / k;
        try { cv.getContext('2d').drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H); } catch (e) {}
      }
    }
    this._camRaf = requestAnimationFrame(() => this.camDraw());
  }

  camPlay(v, tap) {
    v = v || document.getElementById('cam');
    if (!v) return;
    v.muted = true;
    const p = v.play();
    const ok = () => { const c = this.state.cap; if (c && c.tapPlay) this.setState({ cap: Object.assign({}, c, { tapPlay: false }) }); };
    const no = () => { const c = this.state.cap; if (c && !c.tapPlay) this.setState({ cap: Object.assign({}, c, { tapPlay: true }) }); };
    if (p && p.then) p.then(ok, tap ? no : () => {}); else if (!v.paused) ok();
  }

  flipCam() {
    const cap = this.state.cap;
    if (!cap) return;
    this.sfx('tap');
    this.stopCam();
    this.setState({ cap: Object.assign({}, cap, { facing: cap.facing === 'user' ? 'environment' : 'user' }) });
  }

  startCountdown() {
    const cap = this.state.cap;
    if (!cap || cap.phase !== 'live') return;
    this.sfx('tap');
    this.setState({ cap: Object.assign({}, cap, { phase: 'count', count: 5 }) });
    if (this.camTimer) clearInterval(this.camTimer);
    this.camTimer = setInterval(() => {
      const c = this.state.cap;
      if (!c || c.phase !== 'count') { clearInterval(this.camTimer); this.camTimer = null; return; }
      const n = c.count - 1;
      if (n > 0) { this.tone(n <= 2 ? 990 : 660, 0, 0.08, { type: 'triangle', vol: 0.1 }); this.setState({ cap: Object.assign({}, c, { count: n }) }); return; }
      clearInterval(this.camTimer); this.camTimer = null;
      this.snap();
    }, 1000);
  }

  snap() {
    const c = this.state.cap;
    const v = document.getElementById('cam');
    if (!c || !v || !v.videoWidth) { if (c) this.setState({ cap: Object.assign({}, c, { phase: 'live', count: 0 }) }); return; }
    const max = 1280;
    const s = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(v.videoWidth * s); cv.height = Math.round(v.videoHeight * s);
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    const shots = Object.assign({}, c.shots, { [c.poses[c.i]]: cv.toDataURL('image/jpeg', 0.86) });
    this.sfx('pick');
    this.setState({ cap: Object.assign({}, c, { shots: shots, phase: 'review', count: 0 }) });
  }

  async capFile(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    const c = this.state.cap;
    if (!file || !c) return;
    try {
      const r = await this.loadImage(file);
      const url = this.shrink(r.im, 1280, 0.86);
      URL.revokeObjectURL(r.url);
      const shots = Object.assign({}, c.shots, { [c.poses[c.i]]: url });
      this.setState({ cap: Object.assign({}, this.state.cap, { shots: shots, phase: 'review' }) });
    } catch (err) {}
    try { input.value = ''; } catch (err) {}
  }

  capRetake() { const c = this.state.cap; if (!c) return; this.sfx('tap'); this.setState({ cap: Object.assign({}, c, { phase: 'live' }) }); }

  capNext() {
    const c = this.state.cap;
    if (!c) return;
    if (c.i < c.poses.length - 1) { this.sfx('tap'); this.setState({ cap: Object.assign({}, c, { i: c.i + 1, phase: 'live' }) }); return; }
    this.saveBodySet();
  }

  capSkip() { const c = this.state.cap; if (!c) return; if (c.i < c.poses.length - 1) { this.sfx('tap'); this.setState({ cap: Object.assign({}, c, { i: c.i + 1, phase: 'live' }) }); } else this.saveBodySet(); }

  async saveBodySet() {
    const c = this.state.cap;
    if (!c) return;
    const poses = c.poses.filter((p) => c.shots[p]);
    this.stopCam();
    if (!poses.length) { this.setState({ cap: null }); return; }
    const id = 'b' + Date.now().toString(36);
    for (const p of poses) {
      const url = c.shots[p];
      await this.idbKey('put', 'body:' + id + ':' + p, url);
      const im = await new Promise((res) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => res(null); x.src = url; });
      const th = im ? this.shrink(im, 360, 0.75) : url;
      await this.idbKey('put', 'bodyT:' + id + ':' + p, th);
      this._bp = this._bp || {};
      this._bp['body:' + id + ':' + p] = url;
      this._bp['bodyT:' + id + ':' + p] = th;
    }
    const set = { id: id, d: this.keyOf(new Date()), at: Date.now(), poses: poses, an: null };
    this.sfx('done');
    this.setState({ cap: null, bodyPhotos: (this.state.bodyPhotos || []).concat([set]), photos: true, photoSel: id, photoPose: 'frente' }, () => this.persist());
  }

  async deleteBodySet(id) {
    if (this.state.photoDel !== id) { this.sfx('no'); this.setState({ photoDel: id }); return; }
    const s = (this.state.bodyPhotos || []).find((x) => x.id === id);
    if (s) for (const p of s.poses) { await this.idbKey('del', 'body:' + id + ':' + p); await this.idbKey('del', 'bodyT:' + id + ':' + p); }
    this.sfx('tap');
    this.setState({ bodyPhotos: (this.state.bodyPhotos || []).filter((x) => x.id !== id), photoDel: null, photoSel: null }, () => this.persist());
  }

  async analyzeBody(id) {
    const sets = this.bodySets();
    const k = sets.findIndex((x) => x.id === id);
    if (k < 0 || this.state.bodyBusy) return;
    const cur = sets[k];
    const prev = k > 0 ? sets[k - 1] : null;
    this.sfx('open');
    this.setState({ bodyBusy: id, bodyErr: '' });
    try {
      const imgs = [];
      const desc = [];
      const add = async (set, pose, label) => {
        const url = this._bp && this._bp['body:' + set.id + ':' + pose] ? this._bp['body:' + set.id + ':' + pose] : await this.idbKey('get', 'body:' + set.id + ':' + pose);
        if (!url) return;
        const im = await new Promise((res) => { const x = new Image(); x.onload = () => res(x); x.onerror = () => res(null); x.src = url; });
        if (!im) return;
        imgs.push(this.shrink(im, 1024, 0.85).split(',')[1]);
        desc.push('Imagen ' + imgs.length + ': ' + label + ', ' + this.poseDefs()[pose].label.toLowerCase());
      };
      for (const p of cur.poses) await add(cur, p, 'hoy (' + cur.d + ')');
      if (prev) for (const p of prev.poses) if (p !== 'cara') await add(prev, p, 'anterior (' + prev.d + ')');
      const hasFace = cur.poses.indexOf('cara') >= 0;
      const prompt = [
        'Eres un entrenador y especialista en composición corporal. Analiza las fotos de progreso de esta persona con respeto y precisión. No juzgues el atractivo; describe lo observable y da recomendaciones prácticas.',
        this.aiContext(),
        desc.join('\n'),
        prev ? 'Compara hoy con la sesión anterior: describe solo cambios visibles y di cuando no se puede saber por luz o pose.' : 'Es la primera sesión de fotos: describe la línea base.',
        'Estima la grasa corporal como un rango honesto (de 3 a 5 puntos de ancho). Evalúa la postura en el perfil y la espalda (cabeza adelantada, hombros redondeados, inclinación de la pelvis, asimetrías).',
        hasFace ? 'Hay una foto de la cara: comenta solo la piel (textura, enrojecimiento, ojeras) con consejos simples de cuidado y hábitos. Nada de cirugías ni prácticas sin evidencia.' : 'No hay foto de la cara: deja "piel" vacío.',
        'Sé específico: nombra zonas concretas (abdomen bajo, oblicuos, pecho, deltoides, dorsales, trapecio, glúteos, muslos) y lo que se ve en cada una. Nada de frases genéricas que servirían para cualquier persona.',
        'Recomendaciones: la rutina se hace en casa sin equipamiento, salvo una mancuerna de 3 kg; la comida es chilena. Cada recomendación es una acción concreta con números cuando sirvan (series, repeticiones, gramos de proteína, minutos) y se apoya en sus datos. Nada extremo: sin dietas de choque, sustancias ni prácticas sin evidencia.',
        'Los textos van en texto plano, sin Markdown (nada de asteriscos ni almohadillas).',
        'Responde SOLO con JSON válido, en español de Chile y tuteo: {"resumen":"2 frases","grasa":{"min":0,"max":0},"cambios":[{"zona":"","nota":""}],"postura":[{"punto":"","estado":"bien|mejorable","consejo":""}],"simetria":"","piel":"","recomendaciones":{"rutina":[""],"comida":[""],"habitos":[""]},"confianza":"alta|media|baja"}'
      ].join('\n\n');
      const j = await this.aiCallN(prompt, imgs, true, 2500, 'hondo');
      const S = (v, n) => String(v == null ? '' : v).slice(0, n || 240);
      const L = (a, n) => (Array.isArray(a) ? a : []).slice(0, n || 4);
      const g = j.grasa || {};
      const an = {
        at: Date.now(), via: this.aiCfg().provider, vs: prev ? prev.d : null,
        resumen: S(j.resumen, 400),
        grasa: isFinite(+g.min) && isFinite(+g.max) && +g.max > 0 ? { min: Math.round(+g.min), max: Math.round(+g.max) } : null,
        cambios: L(j.cambios, 6).map((x) => ({ zona: S(x.zona, 40), nota: S(x.nota) })).filter((x) => x.nota),
        postura: L(j.postura, 5).map((x) => ({ punto: S(x.punto, 60), ok: /bien/i.test(x.estado), consejo: S(x.consejo) })).filter((x) => x.punto),
        simetria: S(j.simetria), piel: S(j.piel),
        rec: { rutina: L((j.recomendaciones || {}).rutina, 3).map((x) => S(x)), comida: L((j.recomendaciones || {}).comida, 3).map((x) => S(x)), habitos: L((j.recomendaciones || {}).habitos, 3).map((x) => S(x)) },
        conf: S(j.confianza, 10)
      };
      this.setState({ bodyBusy: null, bodyPhotos: (this.state.bodyPhotos || []).map((x) => (x.id === id ? Object.assign({}, x, { an: an }) : x)) }, () => this.persist());
      this.sfx('done');
    } catch (e) {
      this.setState({ bodyBusy: null, bodyErr: this.aiErrorText(e).replace('analizar tus comidas', 'analizar tus fotos').replace('Prueba con otra foto o descríbelo con palabras.', 'Intenta otra vez.') });
      this.sfx('no');
    }
  }

  /* ================================================================ chat con el entrenador ================================================================ */

  async chatSend(text) {
    const t = String(text || '').trim();
    if (!t || this.state.chatBusy) return;
    const msgs = (this.state.chat || []).concat([{ r: 'u', t: t.slice(0, 1200), at: Date.now() }]).slice(-40);
    this.sfx('tap');
    this.setState({ chat: msgs, chatBusy: true, chatDraft: '' });
    try { const el = document.getElementById('chat-in'); if (el) el.value = ''; } catch (e) {}
    try {
      const hist = msgs.slice(-10).map((m) => (m.r === 'u' ? 'Persona: ' : 'Entrenador: ') + m.t).join('\n');
      const prompt = [
        'Eres el entrenador personal de la app keystone: directo, cálido y concreto, en español de Chile y tuteo. Respuestas cortas (máximo 120 palabras), con pasos accionables y números concretos cuando sirvan (series, repeticiones, gramos, minutos). Nada de diagnósticos médicos: si hay dolor fuerte, síntomas o algo médico, sugiere consultar a un profesional.',
        'Formato: texto plano para una burbuja de chat. Sin Markdown: nada de asteriscos, almohadillas, negritas ni títulos. Párrafos cortos; si das pasos, una línea por paso que empiece con «• ». Usa los datos de la persona en vez de consejos genéricos.',
        'Entrena en casa sin equipamiento, salvo una mancuerna de 3 kg. Nada extremo: sin dietas de choque, sustancias ni prácticas sin evidencia.',
        'Datos de la persona:\n' + this.aiContext(),
        'Conversación:\n' + hist,
        'Responde al último mensaje de la persona.'
      ].join('\n\n');
      const a = await this.aiCallN(prompt, [], false, 700);
      this.setState({ chat: (this.state.chat || []).concat([{ r: 'a', t: String(a).slice(0, 2000), at: Date.now() }]).slice(-40), chatBusy: false }, () => this.persist());
      this.sfx('pick');
    } catch (e) {
      this.setState({ chat: (this.state.chat || []).concat([{ r: 'e', t: this.aiErrorText(e).replace('analizar tus comidas', 'conversar con tu entrenador'), at: Date.now() }]).slice(-40), chatBusy: false });
      this.sfx('no');
    }
  }

  /* ================================================================ informe mensual ================================================================ */

  async printReport() {
    this.sfx('open');
    const st = this.state;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const fk = this.keyOf(from);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const logs = Object.keys(st.log).filter((k) => k >= fk && st.log[k] && st.log[k].status === 'done').map((k) => st.log[k].summary).filter(Boolean);
    const mins = logs.reduce((a, s) => a + (s.minutes || 0), 0);
    const prs = [];
    logs.forEach((s) => (s.prs || []).forEach((p) => prs.push(p.name + ': ' + p.val + (p.unit === 's' ? ' s' : '') + ' (antes ' + p.prev + ')')));
    const meas = (st.meas || []).filter((m) => m.d >= fk).sort((a, b) => (a.d < b.d ? -1 : 1));
    const mrow = (f, u) => { const v = meas.filter((m) => m[f] != null); if (!v.length) return ''; const a = v[0][f], b = v[v.length - 1][f]; return '<tr><td>' + f.charAt(0).toUpperCase() + f.slice(1) + '</td><td>' + this.fmtNum(a) + ' ' + u + '</td><td>' + this.fmtNum(b) + ' ' + u + '</td><td>' + this.deltaText(a, b, u) + '</td></tr>'; };
    const sets = this.bodySets().filter((s) => s.d >= fk);
    let imgs = '';
    if (sets.length) {
      const pick = sets.length > 1 ? [sets[0], sets[sets.length - 1]] : [sets[0]];
      for (const s of pick) { const u = await this.idbKey('get', 'bodyT:' + s.id + ':frente'); if (u) imgs += '<figure><img src="' + u + '"><figcaption>' + esc(s.d) + '</figcaption></figure>'; }
    }
    const an = this.lastAnalysis();
    const ov = st.hp ? this.healthOverall(this.healthAreas()) : null;
    const html = '<!doctype html><html lang="es"><meta charset="utf-8"><title>keystone · informe</title><style>body{font:14px/1.45 -apple-system,Helvetica,sans-serif;color:#18181B;margin:32px}h1{font-weight:400;font-size:30px;margin:0 0 4px}h2{font-weight:500;font-size:18px;margin:28px 0 8px}.m{color:#57575F}.k{display:flex;gap:28px}.k b{display:block;font-size:26px;font-weight:400}table{border-collapse:collapse;width:100%}td{border-top:1px solid #E4E4E7;padding:6px 4px}figure{display:inline-block;margin:0 16px 0 0}img{height:220px;border-radius:12px}figcaption{color:#57575F;font-size:12px}li{margin:4px 0}</style>'
      + '<h1>keystone · informe del mes</h1><div class="m">' + esc(this.longDate(from)) + ' al ' + esc(this.longDate(now)) + ' · ' + esc(st.prefs.nombre || '') + '</div>'
      + '<h2>Resumen</h2><div class="k"><div><b>' + logs.length + '</b>sesiones</div><div><b>' + mins + '</b>minutos</div><div><b>' + prs.length + '</b>récords</div><div><b>' + (ov == null ? '—' : ov) + '</b>puntaje de salud</div></div>'
      + (prs.length ? '<h2>Récords</h2><ul>' + prs.slice(0, 12).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '')
      + (meas.length ? '<h2>Medidas</h2><table><tr class="m"><td></td><td>Inicio</td><td>Ahora</td><td>Cambio</td></tr>' + mrow('peso', 'kg') + mrow('cintura', 'cm') + mrow('pecho', 'cm') + mrow('brazo', 'cm') + mrow('cadera', 'cm') + mrow('hombros', 'cm') + '</table>' : '')
      + (imgs ? '<h2>Fotos</h2>' + imgs : '')
      + (an ? '<h2>Último análisis de fotos (' + esc(an.d) + ')</h2><p>' + esc(an.resumen) + (an.grasa ? ' Grasa estimada: ' + an.grasa.min + '–' + an.grasa.max + ' %.' : '') + '</p>' : '')
      + '<p class="m" style="margin-top:32px">Hecho con keystone. Las estimaciones por foto son aproximadas y sirven para ver la tendencia.</p></html>';
    try {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
      document.body.appendChild(f);
      f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 300); };
      f.srcdoc = html;
    } catch (e) {}
  }

  /* ================================================================ valores para las pantallas ================================================================ */

  cuerpoVals(th, c, dark, primary, onPrimary) {
    const st = this.state;
    const now = new Date();
    const key = this.keyOf(now);
    const hasKey = !!this.aiCfg().key;

    /* ---------- check-in, informe y cierre del día ---------- */
    const d = this.daily(key);
    const rowsDef = [
      ['sleep', 'Sueño', 'Mal', 'Muy bien'], ['energy', 'Energía', 'Baja', 'Alta'],
      ['mood', 'Ánimo', 'Bajo', 'Muy bueno'], ['sore', 'Dolor muscular', 'Nada', 'Mucho']
    ];
    const filled = rowsDef.every((r) => !!d[r[0]]);
    const editing = !!st.ckEdit;
    const rows = rowsDef.map((r) => ({
      label: r[1], lo: r[2], hi: r[3],
      opts: [1, 2, 3, 4, 5].map((n) => ({ n: n, on: d[r[0]] === n, bg: d[r[0]] === n ? primary : th.fill, fg: d[r[0]] === n ? onPrimary : th.sub, aria: r[1] + ': ' + n + ' de 5', pick: () => { this.sfx('tap'); this.dailySet({ [r[0]]: n }); } }))
    }));
    const hour = now.getHours();
    const ch = this.closingChips();
    const dy = {
      showCheckin: !filled || editing, showBrief: filled && !editing,
      rows: rows, editDone: () => { this.sfx('tap'); this.setState({ ckEdit: false }); }, edit: () => { this.sfx('tap'); this.setState({ ckEdit: true }); },
      hasEditDone: editing && filled,
      brief: this.briefing().map((x) => ({ text: x.text })),
      ai: (d.ai || []).map((t) => ({ text: t })), hasAi: !!(d.ai && d.ai.length), canAi: hasKey && !(d.ai && d.ai.length),
      aiBusy: !!st.dailyBusy, aiIdle: !st.dailyBusy, aiErr: st.dailyErr || '', hasAiErr: !!st.dailyErr, askAi: () => this.dailyAI(),
      showClose: filled && !editing && hour >= 18 && !(d.good && d.better),
      closed: !!(d.good && d.better), closedText: d.better ? 'Mañana: ' + d.better.charAt(0).toLowerCase() + d.better.slice(1) + '.' : '',
      good: ch.good.map((t) => ({ t: t, bg: d.good === t ? primary : th.fill, fg: d.good === t ? onPrimary : th.text, pick: () => { this.sfx('tap'); this.dailySet({ good: t }); } })),
      better: ch.better.map((t) => ({ t: t, bg: d.better === t ? primary : th.fill, fg: d.better === t ? onPrimary : th.text, pick: () => { this.sfx('tap'); this.dailySet({ better: t }); } }))
    };

    /* ---------- fotos de progreso ---------- */
    const sets = this.bodySets();
    const P = this.poseDefs();
    const pose = st.photoPose || 'frente';
    const withPose = sets.filter((s) => s.poses.indexOf(pose) >= 0);
    const selId = st.photoSel && sets.some((s) => s.id === st.photoSel) ? st.photoSel : (sets.length ? sets[sets.length - 1].id : null);
    const sel = sets.find((s) => s.id === selId) || null;
    const bIdx = withPose.findIndex((s) => s.id === selId);
    const aMode = st.photoA || 'primera';
    const aSet = bIdx > 0 ? (aMode === 'anterior' ? withPose[bIdx - 1] : withPose[0]) : null;
    const lastAt = sets.length ? sets[sets.length - 1].at : null;
    const an = sel && sel.an;
    const fmtL = (a) => a.map((t) => ({ text: t }));
    const ph = {
      open: () => { this.sfx('open'); this.setState({ photos: true }); }, close: () => { this.sfx('tap'); this.setState({ photos: false, photoDel: null }); },
      due: this.photoDue(), count: sets.length, has: sets.length > 0, none: sets.length === 0,
      last: lastAt ? this.agoText(lastAt) : 'Nunca',
      dueText: lastAt ? 'Tu última foto fue ' + this.agoText(lastAt).toLowerCase() + '. Toca la semanal.' : 'Tu primera foto es la línea base: con ella se comparan todas las demás.',
      face: !!st.photoFace, faceTrack: st.photoFace ? th.text : th.segBg, faceKnob: st.photoFace ? 20 : 0,
      toggleFace: () => { this.sfx('tap'); this.setState({ photoFace: !st.photoFace }); },
      take: () => this.openCapture(!!st.photoFace),
      poses: Object.keys(P).filter((p) => sets.some((s) => s.poses.indexOf(p) >= 0)).map((p) => ({ label: P[p].label, bg: p === pose ? th.segSel : 'transparent', weight: p === pose ? 500 : 400, pick: () => { this.sfx('tap'); this.setState({ photoPose: p }); } })),
      timeline: sets.slice().reverse().map((s) => ({ d: this.shortDate(s.d), thumb: s.poses.indexOf(pose) >= 0 ? (this.bodyImg(s.id, pose, true) || '') : (this.bodyImg(s.id, s.poses[0], true) || ''), ring: s.id === selId ? ('inset 0 0 0 2px ' + th.text) : 'none', hasAn: !!s.an, pick: () => { this.sfx('tap'); this.setState({ photoSel: s.id, photoDel: null }); } })),
      hasCompare: !!(aSet && sel && sel.poses.indexOf(pose) >= 0),
      aImg: aSet ? (this.bodyImg(aSet.id, pose) || this.bodyImg(aSet.id, pose, true) || '') : '', bImg: sel && sel.poses.indexOf(pose) >= 0 ? (this.bodyImg(sel.id, pose) || this.bodyImg(sel.id, pose, true) || '') : '',
      aLabel: aSet ? this.shortDate(aSet.d) : '', bLabel: sel ? this.shortDate(sel.d) : '',
      x: st.photoX == null ? 50 : st.photoX, onX: (e) => { const v = Number(e && e.target ? e.target.value : 50); this.setState({ photoX: v }); },
      single: !!(sel && !aSet && sel.poses.indexOf(pose) >= 0),
      aPrimera: { bg: aMode === 'primera' ? th.segSel : 'transparent', pick: () => { this.sfx('tap'); this.setState({ photoA: 'primera' }); } },
      aAnterior: { bg: aMode === 'anterior' ? th.segSel : 'transparent', pick: () => { this.sfx('tap'); this.setState({ photoA: 'anterior' }); } },
      selLabel: sel ? this.longDate(this.dateOf(sel.d)) : '',
      hasAn: !!an, noAn: !!sel && !an, canAn: !!sel && !an && hasKey, needKey: !!sel && !an && !hasKey,
      busy: !!st.bodyBusy && st.bodyBusy === selId, idle: !st.bodyBusy, err: st.bodyErr || '', hasErr: !!st.bodyErr,
      note: this.aiPhotoNote(), provider: this.aiProviderName(), analyze: () => selId && this.analyzeBody(selId), reAnalyze: () => selId && this.analyzeBody(selId),
      an: an ? {
        resumen: an.resumen, hasGrasa: !!an.grasa, grasa: an.grasa ? an.grasa.min + '–' + an.grasa.max + ' %' : '',
        vs: an.vs ? 'Comparado con ' + this.shortDate(an.vs) : 'Línea base', conf: an.conf ? 'Confianza ' + an.conf : '',
        cambios: an.cambios.map((x, i) => ({ zona: x.zona, nota: x.nota, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })), hasCambios: an.cambios.length > 0,
        postura: an.postura.map((x, i) => ({ punto: x.punto, consejo: x.consejo, estado: x.ok ? 'Bien' : 'Mejorable', color: x.ok ? c.constanciaText : c.heatText, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })), hasPostura: an.postura.length > 0,
        simetria: an.simetria, hasSimetria: !!an.simetria, piel: an.piel, hasPiel: !!an.piel,
        rutina: fmtL(an.rec.rutina), comida: fmtL(an.rec.comida), habitos: fmtL(an.rec.habitos),
        hasRutina: an.rec.rutina.length > 0, hasComida: an.rec.comida.length > 0, hasHabitos: an.rec.habitos.length > 0
      } : {},
      del: () => selId && this.deleteBodySet(selId), delLabel: st.photoDel && st.photoDel === selId ? 'Toca otra vez para borrar' : 'Borrar estas fotos',
      thumbLast: sets.length ? (this.bodyImg(sets[sets.length - 1].id, 'frente', true) || '') : '', hasThumbLast: !!(sets.length && sets[sets.length - 1].poses.indexOf('frente') >= 0)
    };

    /* ---------- cámara con guía ---------- */
    const cp = st.cap;
    let cap = { open: false };
    if (cp) {
      const p = cp.poses[cp.i];
      const prevSet = sets.slice().reverse().find((s) => s.poses.indexOf(p) >= 0);
      const shot = cp.shots[p];
      cap = {
        open: true, label: P[p].label, tip: P[p].tip, step: (cp.i + 1) + ' de ' + cp.poses.length,
        live: cp.phase === 'live' && !cp.err, count: cp.phase === 'count', n: cp.count, review: cp.phase === 'review', shot: shot || '',
        camOn: (cp.phase === 'live' || cp.phase === 'count') && !cp.err, noFlip: !((cp.phase === 'live' || cp.phase === 'count') && !cp.err), noCam: cp.err === 'nocam' && cp.phase !== 'review',
        mirror: cp.facing === 'user' ? 'scaleX(-1)' : 'none',
        hasGhost: !!prevSet, ghost: prevSet ? (this.bodyImg(prevSet.id, p) || this.bodyImg(prevSet.id, p, true) || '') : '',
        ghostLabel: prevSet ? 'Tu foto del ' + this.shortDate(prevSet.d) + ' de guía' : '',
        tapPlay: !!cp.tapPlay && (cp.phase === 'live' || cp.phase === 'count') && !cp.err, playCam: () => this.camPlay(null, true),
        start: () => this.startCountdown(), flip: () => this.flipCam(), retake: () => this.capRetake(), next: () => this.capNext(), skip: () => this.capSkip(),
        nextLabel: cp.i < cp.poses.length - 1 ? 'Usar y seguir' : 'Usar y guardar', close: () => this.closeCapture(), file: (e) => this.capFile(e)
      };
    }

    /* ---------- aspecto ---------- */
    const meas = (st.meas || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
    const lastOf = (f) => { for (let i = meas.length - 1; i >= 0; i--) if (meas[i][f] != null) return meas[i][f]; return null; };
    const hom = lastOf('hombros'), cin = lastOf('cintura') || (st.hp && st.hp.cintura) || null;
    const alt = st.hp && st.hp.altura;
    const ans = sets.filter((s) => s.an && s.an.grasa);
    const fat = ans.length ? ans[ans.length - 1].an.grasa : null;
    const fat0 = ans.length > 1 ? ans[0].an.grasa : null;
    const la = this.lastAnalysis();
    const cat = this.habitCatalog();
    const hcfg = this.habitCfg();
    const skin = ['protector', 'piel'].map((id) => { const h = cat.find((x) => x.id === id) || { name: id, desc: '' }; const on = hcfg.on.indexOf(id) >= 0; return { label: h.name, desc: h.desc, on: on, track: on ? th.text : th.segBg, knob: on ? 20 : 0, toggle: () => { this.sfx('tap'); const l = hcfg.on.slice(); const k = l.indexOf(id); if (k >= 0) l.splice(k, 1); else l.push(id); this.setHabitCfg({ on: l }); } }; });
    const sleepAvg = (() => { let s = 0, n = 0; for (let i = 0; i < 7; i++) { const k2 = this.keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)); const v = ((st.hlog || {})[k2] || {}).sueno; if (v) { s += v; n++; } } return n ? Math.round((s / n) * 10) / 10 : null; })();
    const ck = this.checkinAvg(7);
    const supRids = this.planRids().filter((r) => /superior/.test(r));
    const needYtw = supRids.filter((rid) => !this.adaptedSteps(rid).some((p) => p.k === 'ytw'));
    const asp = {
      open: () => { this.sfx('open'); this.setState({ aspecto: true }); }, close: () => { this.sfx('tap'); this.setState({ aspecto: false }); },
      hasFat: !!fat, fat: fat ? fat.min + '–' + fat.max + ' %' : '—', fatTrend: fat && fat0 ? 'Al empezar: ' + fat0.min + '–' + fat0.max + ' %' : (fat ? 'Según tu último análisis de fotos' : 'Analiza tus fotos para estimarla'),
      hasRatio: !!(hom && cin), ratio: hom && cin ? this.fmtNum(Math.round((hom / cin) * 100) / 100) : '—',
      ratioNote: hom && cin ? 'Hombros ' + this.fmtNum(hom) + ' cm y cintura ' + this.fmtNum(cin) + ' cm. La referencia estética clásica ronda 1,6.' : 'Registra el contorno de hombros y la cintura en Salud → Registrar medición.',
      hasWh: !!(alt && cin), wh: alt && cin ? this.fmtNum(Math.round((cin / alt) * 100) / 100) : '—', whNote: alt && cin ? (cin / alt < 0.5 ? 'Bajo 0,5: zona saludable.' : 'Sobre 0,5: bajar cintura mejora salud y aspecto.') : '',
      hasPost: !!(la && la.postura && la.postura.length), post: la && la.postura ? la.postura.map((x, i) => ({ punto: x.punto, consejo: x.consejo, estado: x.ok ? 'Bien' : 'Mejorable', color: x.ok ? c.constanciaText : c.heatText, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })) : [],
      noPost: !(la && la.postura && la.postura.length),
      canYtw: needYtw.length > 0, addYtw: () => this.adaptApplyMany(needYtw.map((rid) => ({ id: 'asp:ytw:' + rid + ':' + Date.now(), kind: 'extra', rid: rid, k: 'ytw', text: 'Suma Y-T-W a ' + ((this.routinesById()[rid] || {}).name || rid) }))),
      skin: skin, hasPiel: !!(la && la.piel), piel: la ? la.piel : '',
      sleep: sleepAvg != null ? this.fmtNum(sleepAvg) + ' h' : (ck ? ck.sleep + ' de 5' : '—'), water: (() => { let s = 0, n = 0; for (let i = 1; i <= 7; i++) { const k2 = this.keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)); const v = ((st.hlog || {})[k2] || {}).agua; if (v) { s += v; n++; } } return n ? this.fmtNum(Math.round((s / n) * 0.25 * 10) / 10) + ' L' : '—'; })()
    };

    /* ---------- chat ---------- */
    const msgs = st.chat || [];
    const chat = {
      open: () => { this.sfx('open'); this.setState({ chatOpen: true }, () => { try { const s = document.getElementById('chat-scroll'); if (s) s.scrollTop = s.scrollHeight; } catch (e) {} }); },
      close: () => { this.sfx('tap'); this.setState({ chatOpen: false }); },
      msgs: msgs.map((m) => ({ t: m.r === 'a' ? this.aiPlain(m.t) : m.t, mine: m.r === 'u', bg: m.r === 'u' ? primary : (m.r === 'e' ? th.fill : th.card), fg: m.r === 'u' ? onPrimary : (m.r === 'e' ? th.sub : th.text), align: m.r === 'u' ? 'flex-end' : 'flex-start', shadow: m.r === 'a' ? th.cardShadow : 'none' })),
      empty: msgs.length === 0, busy: !!st.chatBusy, hasKey: hasKey, noKey: !hasKey, draft: st.chatDraft || '',
      chips: ['¿Cómo voy esta semana?', '¿Qué cambio en mi rutina?', 'Ideas de cena con proteína', 'Me duele un poco la rodilla'].map((t) => ({ t: t, pick: () => this.chatSend(t) })),
      send: () => { const el = document.getElementById('chat-in'); this.chatSend(el ? el.value : st.chatDraft); },
      onDraft: (e) => this.setState({ chatDraft: e && e.target ? e.target.value : '' }),
      clear: () => { this.sfx('tap'); this.setState({ chat: [] }, () => this.persist()); }
    };

    /* ---------- rutina adaptativa (Progreso) ---------- */
    const A = this.adapt();
    const week = this.programWeek();
    const props = this.adaptPropose().concat(A.ai && A.ai.props ? A.ai.props : []);
    const changed = Object.keys(A.swaps).some((r) => Object.keys(A.swaps[r] || {}).length) || Object.keys(A.sets).some((r) => Object.keys(A.sets[r] || {}).length) || Object.keys(A.extras).some((r) => (A.extras[r] || []).length);
    const ad = {
      goal: this.goalLabel(), cycleGoal: () => this.cycleGoal(),
      deload: this.isDeload(week), noDeload: !this.isDeload(week), deloadText: 'Semana ' + week + ': semana de descarga, con una serie menos en cada ejercicio para que el cuerpo se recupere y vuelva más fuerte.',
      skipDeload: () => this.skipDeload(), nextDeload: 'Próxima semana de descarga: la ' + (Math.floor(week / 6) + 1) * 6 + '.',
      props: props.map((p, i) => ({ title: p.title, text: p.text, why: p.why, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none', apply: () => this.adaptApply(p), dismiss: () => this.adaptDismiss(p) })),
      hasProps: props.length > 0, noProps: props.length === 0,
      canAi: hasKey, aiBusy: !!st.adaptBusy, aiIdle: !st.adaptBusy, aiErr: st.adaptErr || '', hasAiErr: !!st.adaptErr, ask: () => this.adaptAskAI(),
      hasAiRes: !!(A.ai && A.ai.resumen), aiRes: A.ai ? A.ai.resumen : '',
      log: A.log.slice(-5).reverse().map((x, i) => ({ text: x.text, when: this.agoText(x.at), line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })), hasLog: A.log.length > 0,
      changed: changed, reset: () => this.adaptReset(), report: () => this.printReport()
    };

    return { dy: dy, ph: ph, cap: cap, asp: asp, chat: chat, ad: ad };
  }

  shortDate(key) {
    const d = this.dateOf(key);
    const m = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return d.getDate() + ' ' + m[d.getMonth()];
  }
