
  /* ---------- salud: evaluación inicial + áreas con nota ---------- */

  evalSteps() {
    return [
      { id: 'sexo', sec: 'Cuerpo', q: 'Sexo biológico', hint: 'Se usa para estimar cuánta energía gastas al día.', type: 'choice', opts: [['hombre', 'Hombre'], ['mujer', 'Mujer']] },
      { id: 'edad', sec: 'Cuerpo', q: '¿Cuántos años tienes?', type: 'num', min: 14, max: 90, step: 1, unit: 'años', def: 28 },
      { id: 'altura', sec: 'Cuerpo', q: '¿Cuánto mides?', type: 'num', min: 140, max: 210, step: 1, unit: 'cm', def: 172 },
      { id: 'peso', sec: 'Cuerpo', q: '¿Cuánto pesas hoy?', type: 'num', min: 35, max: 180, step: 0.5, unit: 'kg', def: 'peso' },
      { id: 'cintura', sec: 'Cuerpo', q: '¿Cuánto mide tu cintura?', hint: 'Con una huincha a la altura del ombligo, de pie y sin apretar.', type: 'num', min: 50, max: 160, step: 1, unit: 'cm', def: 82, optional: true },
      { id: 'ejDias', sec: 'Actividad', q: '¿Cuántos días a la semana haces fuerza o deporte?', type: 'choice', opts: [['0', 'Ninguno'], ['1-2', '1 a 2 días'], ['3-4', '3 a 4 días'], ['5+', '5 o más']] },
      { id: 'cardio', sec: 'Actividad', q: '¿Cuántos minutos de cardio haces a la semana?', hint: 'Caminar rápido, trotar o pedalear: lo que te acelere la respiración.', type: 'choice', opts: [['<30', 'Menos de 30'], ['30-90', '30 a 90'], ['90-150', '90 a 150'], ['150-300', '150 a 300'], ['>300', 'Más de 300']] },
      { id: 'pasos', sec: 'Actividad', q: '¿Cuántos pasos das al día?', hint: 'Lo ves en la app Salud del iPhone.', type: 'choice', opts: [['<4', 'Menos de 4.000'], ['4-7', '4.000 a 7.000'], ['7-10', '7.000 a 10.000'], ['>10', 'Más de 10.000']] },
      { id: 'sentado', sec: 'Actividad', q: '¿Cuántas horas pasas sentado al día?', type: 'choice', opts: [['<6', 'Menos de 6'], ['6-9', '6 a 9'], ['>9', 'Más de 9']] },
      { id: 'suenoH', sec: 'Sueño', q: '¿Cuántas horas duermes por noche?', type: 'num', min: 3, max: 12, step: 0.5, unit: 'h', def: 7 },
      { id: 'suenoQ', sec: 'Sueño', q: '¿Cómo calificarías tu sueño?', type: 'scale', lo: 'Muy malo', hi: 'Excelente' },
      { id: 'descansado', sec: 'Sueño', q: '¿Despiertas descansado?', type: 'choice', opts: [['si', 'Casi siempre'], ['aveces', 'A veces'], ['no', 'Casi nunca']] },
      { id: 'fruver', sec: 'Nutrición', q: '¿Cuántas porciones de fruta y verdura comes al día?', hint: 'Una porción es una fruta mediana o un plato chico de ensalada.', type: 'choice', opts: [['0-1', '0 a 1'], ['2-3', '2 a 3'], ['4-5', '4 a 5'], ['6+', '6 o más']] },
      { id: 'ultra', sec: 'Nutrición', q: '¿Cada cuánto comes comida rápida, snacks o ultraprocesados?', type: 'choice', opts: [['nunca', 'Casi nunca'], ['1-3', '1 a 3 veces por semana'], ['4-7', '4 a 7 veces por semana'], ['diario', 'Más de una vez al día']] },
      { id: 'protQ', sec: 'Nutrición', q: '¿Incluyes proteína en tus comidas?', hint: 'Carne, pollo, pescado, huevos, lácteos, legumbres o tofu.', type: 'choice', opts: [['casi', 'En casi todas'], ['algunas', 'En algunas'], ['rara', 'Rara vez']] },
      { id: 'azucar', sec: 'Nutrición', q: '¿Cuántas bebidas azucaradas o dulces comes al día?', type: 'choice', opts: [['0', 'Ninguno'], ['1', 'Uno'], ['2', 'Dos'], ['3+', 'Tres o más']] },
      { id: 'aguaV', sec: 'Nutrición', q: '¿Cuántos vasos de agua tomas al día?', type: 'num', min: 0, max: 20, step: 1, unit: 'vasos', def: 6 },
      { id: 'estres', sec: 'Mente', q: '¿Cuánto estrés has sentido estas semanas?', type: 'scale', lo: 'Nada', hi: 'Mucho' },
      { id: 'energia', sec: 'Mente', q: '¿Cómo está tu energía durante el día?', type: 'scale', lo: 'Muy baja', hi: 'Muy alta' },
      { id: 'animo', sec: 'Mente', q: '¿Cómo ha estado tu ánimo?', type: 'scale', lo: 'Muy bajo', hi: 'Muy bueno' },
      { id: 'alcohol', sec: 'Hábitos', q: '¿Cuántos tragos de alcohol tomas a la semana?', hint: 'Un trago es una cerveza, una copa de vino o una medida de destilado.', type: 'choice', opts: [['0', 'Ninguno'], ['1-3', '1 a 3'], ['4-7', '4 a 7'], ['8-14', '8 a 14'], ['15+', '15 o más']] },
      { id: 'tabaco', sec: 'Hábitos', q: '¿Fumas o vapeas?', type: 'choice', opts: [['no', 'No'], ['aveces', 'A veces'], ['diario', 'A diario']] },
      { id: 'fc', sec: 'Corazón', q: '¿Cuál es tu pulso en reposo?', hint: 'Sentado y tranquilo, cuenta tus latidos durante 30 segundos y multiplica por 2, o míralo en tu reloj.', type: 'num', min: 35, max: 130, step: 1, unit: 'lpm', def: 68, optional: true },
      { id: 'pas', sec: 'Corazón', q: 'Tu presión arterial: el número alto', hint: 'Es la sistólica. Si no la sabes, sáltala.', type: 'num', min: 80, max: 220, step: 1, unit: 'mmHg', def: 120, optional: true },
      { id: 'pad', sec: 'Corazón', q: 'Tu presión arterial: el número bajo', hint: 'Es la diastólica.', type: 'num', min: 40, max: 140, step: 1, unit: 'mmHg', def: 78, optional: true, skipIf: 'pas' },
      { id: 'objetivo', sec: 'Objetivo', q: '¿Cuál es tu objetivo principal?', hint: 'Ajusta tus metas de comida.', type: 'choice', opts: [['perder', 'Perder grasa'], ['mantener', 'Mantenerme y sentirme mejor'], ['ganar', 'Ganar músculo']] }
    ];
  }

  startEval() {
    this.sfx('open');
    const a = Object.assign({}, this.state.hp || {});
    this.go({ screen: 'eval', menu: false, ev: { i: 0, a: a } });
  }

  evalStep() {
    const S = this.evalSteps();
    const ev = this.state.ev || { i: 0, a: {} };
    return { S: S, ev: ev, s: S[Math.min(ev.i, S.length - 1)] };
  }

  evalDefault(s) {
    if (s.def === 'peso') return this.peso();
    return s.def;
  }

  evalGo(a, dir) {
    const S = this.evalSteps();
    let i = this.state.ev.i + dir;
    while (i >= 0 && i < S.length && S[i].skipIf && a[S[i].skipIf] == null) i += dir;
    if (i >= S.length) { this.finishEval(a); return; }
    if (i < 0) { this.go({ screen: 'inicio', ev: null }); return; }
    this.setState({ ev: { i: i, a: a } });
  }

  evalPick(v) {
    const { ev, s } = this.evalStep();
    this.sfx('pick');
    const a = Object.assign({}, ev.a);
    a[s.id] = v;
    this.setState({ ev: { i: ev.i, a: a } });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.evalGo(a, 1), 220);
  }

  evalNum(d) {
    const { ev, s } = this.evalStep();
    this.sfx('tap');
    const a = Object.assign({}, ev.a);
    const cur = a[s.id] == null ? this.evalDefault(s) : a[s.id];
    a[s.id] = Math.max(s.min, Math.min(s.max, Math.round((cur + d * s.step) * 10) / 10));
    this.setState({ ev: { i: ev.i, a: a } });
  }

  evalNext() {
    const { ev, s } = this.evalStep();
    const a = Object.assign({}, ev.a);
    if (s.type === 'num' && a[s.id] == null) a[s.id] = this.evalDefault(s);
    if ((s.type === 'choice' || s.type === 'scale') && a[s.id] == null) return;
    this.sfx('tap');
    this.evalGo(a, 1);
  }

  evalSkip() {
    const { ev, s } = this.evalStep();
    if (!s.optional) return;
    this.sfx('tap');
    const a = Object.assign({}, ev.a);
    a[s.id] = null;
    this.evalGo(a, 1);
  }

  finishEval(a) {
    const hp = Object.assign({}, a, { at: Date.now(), v: 1 });
    const today = this.keyOf(new Date());
    const meas = (this.state.meas || []).filter((m) => m.d !== today);
    meas.push({ d: today, peso: hp.peso, cintura: hp.cintura == null ? null : hp.cintura, fc: hp.fc == null ? null : hp.fc, pas: hp.pas == null ? null : hp.pas, pad: hp.pad == null ? null : hp.pad });
    this.sfx('done');
    this.go({ hp: hp, peso: hp.peso, meas: meas, ev: null, screen: 'inicio', tab: 'salud', area: null }, () => this.persist());
  }

  /* ---------- puntajes ---------- */

  avgOf(list) { const v = list.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }

  wavg(pairs) {
    let s = 0, w = 0;
    pairs.forEach((p) => { if (p[0] != null && isFinite(p[0])) { s += p[0] * p[1]; w += p[1]; } });
    return w ? Math.round(s / w) : null;
  }

  gradeOf(s) { return s == null ? '–' : s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'D'; }

  gradeLabel(g) { return { A: 'Óptimo', B: 'Bien', C: 'Mejorable', D: 'Requiere atención', '–': 'Sin datos' }[g]; }

  recentKeys(n, from) {
    const out = [];
    const t = from || new Date();
    for (let i = 0; i < n; i++) out.push(this.keyOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i)));
    return out;
  }

  habitAvg(id, n, min) {
    const vals = this.recentKeys(n).map((k) => ((this.state.hlog || {})[k] || {})[id]).filter((v) => typeof v === 'number' && v > 0);
    return vals.length >= (min || 3) ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  latest(field) {
    const m = (this.state.meas || []).filter((x) => x[field] != null);
    if (m.length) return m[m.length - 1][field];
    const v = (this.state.hp || {})[field];
    return v == null ? null : v;
  }

  moodAvg(field) {
    const vals = this.recentKeys(14).map((k) => ((this.state.mood || {})[k] || {})[field]).filter((v) => v);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  weekSeries(fn, weeks) {
    const out = [];
    const mon = this.mondayOf(new Date());
    for (let w = weeks - 1; w >= 0; w--) {
      const s0 = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * w);
      const keys = [];
      for (let i = 0; i < 7; i++) keys.push(this.keyOf(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + i)));
      out.push({ label: w === 0 ? 'Esta' : s0.getDate() + '/' + (s0.getMonth() + 1), v: fn(keys) });
    }
    return out;
  }

  sessionsIn(keys, filter) {
    return keys.filter((k) => { const e = this.state.log[k]; return e && e.status === 'done' && (!filter || filter(e)); }).length;
  }

  healthAreas() {
    const st = this.state;
    const a = st.hp || {};
    const T = this.targets();
    const f1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
    const out = [];
    const ic = {
      sueno: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
      nutricion: 'M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5M17 21V3c-2.2 0-3.5 2.5-3.5 6s1.3 4 3.5 4',
      hidratacion: 'M12 3c3.5 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.4 12 3z',
      fuerza: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
      cardio: 'M3 12h4l2.5-6 4 12 2.5-6H21',
      cuerpo: 'M12 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 9l6-1.5L18 9M12 7.5V14M12 14l-3 8M12 14l3 8',
      corazon: 'M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z',
      mente: 'M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 7 17.5h2.5V4.5zM14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-2.5 4.8h-2.5V4.5z'
    };

    /* Sueño: 7 a 9 h para adultos */
    {
      const rec = this.habitAvg('sueno', 14);
      const h = rec != null ? rec : (a.suenoH == null ? null : a.suenoH);
      const hs = h == null ? null : h >= 7 && h <= 9 ? 100 : h > 9 ? 80 : h >= 6.5 ? 78 : h >= 6 ? 60 : h >= 5 ? 40 : 20;
      const qs = a.suenoQ ? (a.suenoQ - 1) * 25 : null;
      const rs = { si: 100, aveces: 60, no: 25 }[a.descansado];
      const acts = [];
      if (h != null && h < 7) acts.push('Adelanta tu hora de dormir 15 minutos esta semana y mantenla también el fin de semana.');
      acts.push('Una hora antes de dormir, deja el celular cargando fuera de la pieza.');
      if (qs != null && qs < 75) acts.push('Mantén la pieza oscura, fresca y en silencio, y evita cafeína después de las 14:00.');
      acts.push('Sal a la luz natural 10 minutos en la mañana: ordena tu reloj interno.');
      if (rec == null) acts.push('Registra tus horas de sueño en Hábitos para ver tu tendencia real.');
      out.push({
        id: 'sueno', name: 'Sueño', icon: ic.sueno, w: 1.2, score: this.wavg([[hs, 0.5], [qs, 0.25], [rs, 0.25]]),
        what: 'Duración y calidad del descanso. Dormir 7 a 9 horas mejora la recuperación muscular, el apetito y el ánimo.',
        status: h == null ? 'Sin datos' : f1(h) + ' h por noche',
        source: rec != null ? 'Promedio de tus últimos 14 días' : 'Según tu evaluación',
        metrics: [
          { label: 'Horas por noche', value: h == null ? '—' : f1(h) + ' h', ideal: '7 a 9 h', s: hs },
          { label: 'Calidad percibida', value: a.suenoQ ? a.suenoQ + ' de 5' : '—', ideal: '4 o más', s: qs },
          { label: 'Despiertas descansado', value: { si: 'Casi siempre', aveces: 'A veces', no: 'Casi nunca' }[a.descansado] || '—', ideal: 'Casi siempre', s: rs }
        ],
        actions: acts, link: 'habitos', linkLabel: 'Registrar sueño',
        series: { unit: 'h', target: 7, items: this.weekSeries((ks) => this.avgOf(ks.map((k) => ((st.hlog || {})[k] || {}).sueno || null)), 8) }
      });
    }

    /* Nutrición: evaluación + lo que registras en Comida */
    {
      const base = this.wavg([
        [{ '0-1': 20, '2-3': 50, '4-5': 80, '6+': 100 }[a.fruver], 1], [{ nunca: 100, '1-3': 80, '4-7': 50, diario: 20 }[a.ultra], 1],
        [{ casi: 95, algunas: 60, rara: 30 }[a.protQ], 1], [{ '0': 100, '1': 75, '2': 45, '3+': 20 }[a.azucar], 1]
      ]);
      const days = this.recentKeys(7).filter((k) => this.foodEntries(k).length).map((k) => Object.assign({ q: this.dayQuality(k) }, this.dayTotals(k)));
      let rec = null, pA = null, fA = null, kA = null, qA = null;
      if (days.length >= 3) {
        pA = this.avgOf(days.map((d) => Math.min(1, d.p / T.prot) * 100));
        fA = this.avgOf(days.map((d) => Math.min(1, d.fib / T.fib) * 100));
        kA = this.avgOf(days.map((d) => Math.max(0, 100 - Math.abs(d.kcal / T.kcal - 1) * 250)));
        qA = this.avgOf(days.map((d) => (d.q ? d.q * 10 : null)));
        rec = this.wavg([[pA, 0.3], [fA, 0.2], [kA, 0.25], [qA, 0.25]]);
      }
      const avgP = days.length ? this.avgOf(days.map((d) => d.p)) : null;
      const avgF = days.length ? this.avgOf(days.map((d) => d.fib)) : null;
      const avgK = days.length ? this.avgOf(days.map((d) => d.kcal)) : null;
      const acts = [];
      if ((pA != null && pA < 85) || a.protQ === 'algunas' || a.protQ === 'rara') acts.push('Suma proteína al desayuno: huevos, yogur griego o quesillo.');
      if ((fA != null && fA < 70) || a.fruver === '0-1' || a.fruver === '2-3') acts.push('Llena medio plato con verduras en almuerzo y cena, y come legumbres tres veces por semana.');
      if (a.ultra === '4-7' || a.ultra === 'diario') acts.push('Cambia el snack ultraprocesado por fruta, frutos secos o yogur natural.');
      if (a.azucar === '2' || a.azucar === '3+') acts.push('Reemplaza las bebidas azucaradas por agua con limón o versiones sin azúcar.');
      if (days.length < 3) acts.push('Registra tus comidas con foto durante una semana para que este puntaje use datos reales.');
      if (acts.length < 2) acts.push('Mantén lo que estás haciendo: tus comidas van en línea con tus metas.');
      const ds = this.recentKeys(7).reverse();
      const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      out.push({
        id: 'nutricion', name: 'Nutrición', icon: ic.nutricion, w: 1.2,
        score: rec != null ? Math.round(rec * 0.6 + (base == null ? rec : base) * 0.4) : base,
        what: 'Calidad y equilibrio de lo que comes: proteína para tus músculos, fibra, frutas y verduras, y poco ultraprocesado.',
        status: avgP != null ? f1(avgP) + ' g de proteína al día' : (base == null ? 'Sin datos' : 'Según tu evaluación'),
        source: rec != null ? 'Tu evaluación más ' + days.length + ' días registrados en Comida' : 'Según tu evaluación',
        metrics: [
          { label: 'Proteína al día', value: avgP == null ? '—' : this.fmt(avgP) + ' g', ideal: T.prot + ' g', s: pA },
          { label: 'Fibra al día', value: avgF == null ? '—' : this.fmt(avgF) + ' g', ideal: T.fib + ' g', s: fA },
          { label: 'Energía al día', value: avgK == null ? '—' : this.fmt(avgK) + ' kcal', ideal: this.fmt(T.kcal) + ' kcal', s: kA },
          { label: 'Frutas y verduras', value: a.fruver ? a.fruver.replace('-', ' a ') + ' porciones' : '—', ideal: '5 o más', s: { '0-1': 20, '2-3': 50, '4-5': 80, '6+': 100 }[a.fruver] },
          { label: 'Ultraprocesados', value: { nunca: 'Casi nunca', '1-3': '1 a 3 por semana', '4-7': '4 a 7 por semana', diario: 'A diario' }[a.ultra] || '—', ideal: 'Casi nunca', s: { nunca: 100, '1-3': 80, '4-7': 50, diario: 20 }[a.ultra] }
        ],
        actions: acts, link: 'comida', linkLabel: 'Ir a Comida',
        series: { unit: 'g', label: 'Proteína por día', target: T.prot, items: ds.map((k) => { const n = this.foodEntries(k).length; return { label: letters[(this.dateOf(k).getDay() + 6) % 7], v: n ? this.dayTotals(k).p : null }; }) }
      });
    }

    /* Hidratación */
    {
      const goal = this.waterGoal(new Date());
      const rec = this.habitAvg('agua', 14);
      const v = rec != null ? rec : (a.aguaV == null ? null : a.aguaV);
      const s = v == null ? null : Math.round(Math.min(1, v / goal) * 100);
      out.push({
        id: 'hidratacion', name: 'Hidratación', icon: ic.hidratacion, w: 0.6, score: s,
        what: 'Agua que tomas al día. La meta sale de tu peso (unos 30 ml por kilo) y sube los días que entrenas.',
        status: v == null ? 'Sin datos' : f1(v) + ' de ' + goal + ' vasos',
        source: rec != null ? 'Promedio de tus últimos 14 días' : 'Según tu evaluación',
        metrics: [
          { label: 'Vasos al día', value: v == null ? '—' : f1(v), ideal: goal + ' vasos', s: s },
          { label: 'Litros al día', value: v == null ? '—' : f1(v * 0.25) + ' L', ideal: f1(goal * 0.25) + ' L', s: s }
        ],
        actions: ['Deja una botella de 500 ml en tu escritorio y rellénala tres veces.', 'Toma un vaso al despertar y otro con cada comida.', 'Activa los recordatorios de agua en Ajustes.'],
        link: 'habitos', linkLabel: 'Registrar agua',
        series: { unit: 'vasos', target: goal, items: this.weekSeries((ks) => this.avgOf(ks.map((k) => ((st.hlog || {})[k] || {}).agua || null)), 8) }
      });
    }

    /* Fuerza: la OMS pide 2 o más días de fuerza a la semana */
    {
      const since = st.since ? this.dateOf(st.since) : new Date();
      const days = Math.max(0, Math.round((Date.now() - since.getTime()) / 864e5));
      const k28 = this.recentKeys(28);
      const done = this.sessionsIn(k28, (e) => !e.summary || (e.summary.id !== 'caminata' && e.summary.id !== 'cardio'));
      const recent = days >= 14 || done >= 3;
      const perWeek = recent ? done / Math.min(4, Math.max(2, days / 7)) : { '0': 0, '1-2': 1.5, '3-4': 3.5, '5+': 5 }[a.ejDias];
      const s = perWeek == null ? null : perWeek >= 3 ? 100 : perWeek >= 2 ? 85 : perWeek >= 1 ? 55 : perWeek > 0 ? 35 : 10;
      let planned = 0, did = 0;
      k28.forEach((k) => { const d = this.dateOf(k); const r = this.routineAt((d.getDay() + 6) % 7); if (r && r.id !== 'caminata' && d >= since) { planned++; if (st.log[k] && st.log[k].status === 'done') did++; } });
      const adh = planned ? Math.round((did / planned) * 100) : null;
      out.push({
        id: 'fuerza', name: 'Fuerza', icon: ic.fuerza, w: 1, score: s,
        what: 'Entrenamiento de fuerza. Dos o más días por semana protegen tus músculos, huesos y metabolismo.',
        status: perWeek == null ? 'Sin datos' : f1(perWeek) + ' sesiones por semana',
        source: recent ? 'Tus sesiones de las últimas 4 semanas' : 'Según tu evaluación',
        metrics: [
          { label: 'Sesiones por semana', value: perWeek == null ? '—' : f1(perWeek), ideal: '2 o más', s: s },
          { label: 'Tu meta semanal', value: String(st.prefs.meta), ideal: '', s: null },
          { label: 'Cumplimiento del plan', value: adh == null ? '—' : adh + ' %', ideal: '80 % o más', s: adh }
        ],
        actions: [
          perWeek != null && perWeek < 2 ? 'Asegura al menos dos sesiones esta semana: agenda día y hora.' : 'Sigue con tu plan; sube repeticiones o series cuando una rutina se sienta fácil.',
          'Cuando falles un día, no lo recuperes doblando: retoma en la siguiente sesión.',
          'Come 20 a 40 g de proteína en las dos horas después de entrenar.'
        ],
        link: 'inicio', linkLabel: 'Ver rutina',
        series: { unit: 'sesiones', target: Math.min(st.prefs.meta, 5), items: this.weekSeries((ks) => this.sessionsIn(ks), 8) }
      });
    }

    /* Cardio y actividad: 150 a 300 min por semana (OMS) y unos 7.000 pasos al día */
    {
      const cardB = { '<30': 15, '30-90': 40, '90-150': 65, '150-300': 90, '>300': 100 }[a.cardio];
      const k28 = this.recentKeys(28);
      let cmin = 0;
      k28.forEach((k) => { const e = st.log[k]; if (e && e.status === 'done' && e.summary && (e.summary.id === 'cardio' || e.summary.id === 'caminata')) cmin += e.summary.minutes || 0; });
      const cRec = cmin > 0 ? cmin / 4 : null;
      const cS = cRec != null ? (cRec >= 300 ? 100 : cRec >= 150 ? 90 : cRec >= 90 ? 65 : cRec >= 30 ? 40 : 15) : cardB;
      const pRec = this.habitAvg('pasos', 14);
      const pB = { '<4': 25, '4-7': 60, '7-10': 90, '>10': 100 }[a.pasos];
      const pS = pRec != null ? (pRec >= 10 ? 100 : pRec >= 7 ? 90 : pRec >= 5 ? 65 : pRec >= 4 ? 50 : 25) : pB;
      const sS = { '<6': 100, '6-9': 65, '>9': 35 }[a.sentado];
      const cTxt = cRec != null ? Math.round(cRec) + ' min' : ({ '<30': 'Menos de 30 min', '30-90': '30 a 90 min', '90-150': '90 a 150 min', '150-300': '150 a 300 min', '>300': 'Más de 300 min' }[a.cardio] || '—');
      const pTxt = pRec != null ? this.fmt(pRec * 1000) : ({ '<4': 'Menos de 4.000', '4-7': '4.000 a 7.000', '7-10': '7.000 a 10.000', '>10': 'Más de 10.000' }[a.pasos] || '—');
      out.push({
        id: 'cardio', name: 'Cardio y actividad', icon: ic.cardio, w: 1, score: this.wavg([[cS, 0.4], [pS, 0.4], [sS, 0.2]]),
        what: 'Movimiento durante el día y cardio. Unos 7.000 pasos diarios ya se asocian a mucho menor riesgo de enfermedad.',
        status: pRec != null ? this.fmt(pRec * 1000) + ' pasos al día' : cTxt + ' de cardio',
        source: pRec != null || cRec != null ? 'Tus registros recientes y tu evaluación' : 'Según tu evaluación',
        metrics: [
          { label: 'Cardio por semana', value: cTxt, ideal: '150 a 300 min', s: cS },
          { label: 'Pasos al día', value: pTxt, ideal: '7.000 o más', s: pS },
          { label: 'Horas sentado', value: { '<6': 'Menos de 6', '6-9': '6 a 9', '>9': 'Más de 9' }[a.sentado] || '—', ideal: 'Menos de 6', s: sS }
        ],
        actions: ['Camina 10 minutos después de almorzar y de cenar.', cS != null && cS < 65 ? 'Suma una sesión de cardio de 30 minutos a tu semana.' : 'Mantén tu cardio; una salida larga el fin de semana suma mucho.', 'Cada hora sentado, párate y muévete 2 minutos.'],
        link: 'habitos', linkLabel: 'Registrar pasos',
        series: { unit: 'mil pasos', target: 7, items: this.weekSeries((ks) => this.avgOf(ks.map((k) => ((st.hlog || {})[k] || {}).pasos || null)), 8) }
      });
    }

    /* Composición corporal: IMC y cintura/altura (< 0,5 según NICE) */
    {
      const w = this.peso(), h = a.altura;
      const bmi = h ? w / Math.pow(h / 100, 2) : null;
      const bS = bmi == null ? null : bmi < 18.5 ? 60 : bmi < 25 ? 100 : bmi < 27.5 ? 75 : bmi < 30 ? 55 : 30;
      const waist = this.latest('cintura');
      const whtr = waist && h ? waist / h : null;
      const wS = whtr == null ? null : whtr < 0.5 ? 100 : whtr < 0.55 ? 70 : whtr < 0.6 ? 55 : 25;
      const ms = (st.meas || []).filter((m) => m.peso);
      const first = ms.length ? ms[0] : null;
      const delta = first && ms.length > 1 ? Math.round((w - first.peso) * 10) / 10 : null;
      const goal = a.objetivo;
      out.push({
        id: 'cuerpo', name: 'Composición corporal', icon: ic.cuerpo, w: 1, score: this.wavg([[wS, 0.6], [bS, 0.4]]),
        what: 'Peso, índice de masa corporal y la relación entre cintura y altura, que indica mejor la grasa abdominal.',
        status: f1(w) + ' kg' + (delta ? (delta > 0 ? ', +' : ', ') + f1(delta) + ' kg' : ''),
        source: 'Tus mediciones',
        metrics: [
          { label: 'Peso', value: f1(w) + ' kg', ideal: delta == null ? '' : (delta > 0 ? '+' : '') + f1(delta) + ' kg desde el inicio', s: null },
          { label: 'Índice de masa corporal', value: bmi == null ? '—' : f1(bmi), ideal: '18,5 a 24,9', s: bS },
          { label: 'Cintura / altura', value: whtr == null ? '—' : String(Math.round(whtr * 100) / 100).replace('.', ','), ideal: 'Menos de 0,5', s: wS }
        ],
        note: 'El IMC no distingue músculo de grasa. Si entrenas fuerza, mira más la cintura.',
        actions: [
          goal === 'perder' ? 'Apunta a bajar cerca de 0,5 % de tu peso por semana: déficit moderado y proteína alta.' : goal === 'ganar' ? 'Sube de 0,25 a 0,5 % de tu peso al mes con un leve superávit y fuerza tres veces por semana.' : 'Mantén tu peso estable y prioriza fuerza y proteína para mejorar la composición.',
          waist ? 'Vuelve a medir tu cintura una vez al mes.' : 'Mide tu cintura: es el dato que más dice de tu salud metabólica.',
          'Pésate a la misma hora, en ayunas, una vez por semana.'
        ],
        link: 'meas', linkLabel: 'Registrar medición',
        series: { unit: 'kg', target: null, items: ms.slice(-8).map((m) => ({ label: this.dateOf(m.d).getDate() + '/' + (this.dateOf(m.d).getMonth() + 1), v: m.peso })) }
      });
    }

    /* Corazón: pulso en reposo, presión (AHA 2025) y hábitos */
    {
      const fc = this.latest('fc'), pas = this.latest('pas'), pad = this.latest('pad');
      const fS = fc == null ? null : fc < 60 ? 100 : fc < 70 ? 90 : fc < 80 ? 70 : fc < 90 ? 45 : 25;
      let bpCat = null, bS = null;
      if (pas != null && pad != null) {
        if (pas >= 140 || pad >= 90) { bpCat = 'Hipertensión etapa 2'; bS = 15; }
        else if (pas >= 130 || pad >= 80) { bpCat = 'Hipertensión etapa 1'; bS = 45; }
        else if (pas >= 120) { bpCat = 'Elevada'; bS = 75; }
        else { bpCat = 'Normal'; bS = 100; }
      }
      const tS = { no: 100, aveces: 50, diario: 15 }[a.tabaco];
      const aS = { '0': 100, '1-3': 85, '4-7': 65, '8-14': 40, '15+': 15 }[a.alcohol];
      const acts = [];
      if (bS != null && bS <= 45) acts.push('Tu presión está sobre lo normal. Mídela otra vez en reposo y, si se repite, consulta a un médico.');
      if (fc == null || pas == null) acts.push('Agrega tu pulso en reposo y tu presión en Mediciones para completar esta área.');
      if (a.tabaco === 'aveces' || a.tabaco === 'diario') acts.push('Dejar de fumar o vapear es lo que más mejora tu corazón.');
      if (aS != null && aS < 85) acts.push('Baja el alcohol: menos tragos a la semana es mejor para tu presión y tu sueño.');
      acts.push('Usa menos sal: cocina con hierbas y limita embutidos y salsas.');
      out.push({
        id: 'corazon', name: 'Corazón', icon: ic.corazon, w: 1, score: this.wavg([[fS, 0.25], [bS, 0.3], [tS, 0.2], [aS, 0.15]]),
        what: 'Pulso en reposo, presión arterial y hábitos que cuidan tu sistema cardiovascular.',
        status: bpCat ? 'Presión ' + bpCat.toLowerCase() : fc ? fc + ' lpm en reposo' : 'Faltan datos',
        source: fc != null || pas != null ? 'Tus mediciones y tu evaluación' : 'Según tu evaluación',
        metrics: [
          { label: 'Pulso en reposo', value: fc == null ? '—' : fc + ' lpm', ideal: 'Menos de 70', s: fS },
          { label: 'Presión arterial', value: pas == null || pad == null ? '—' : pas + '/' + pad, ideal: 'Menos de 120/80', s: bS },
          { label: 'Tabaco o vapeo', value: { no: 'No', aveces: 'A veces', diario: 'A diario' }[a.tabaco] || '—', ideal: 'No', s: tS },
          { label: 'Alcohol por semana', value: a.alcohol ? (a.alcohol === '0' ? 'Nada' : a.alcohol.replace('-', ' a ') + ' tragos') : '—', ideal: 'Lo menos posible', s: aS }
        ],
        actions: acts.slice(0, 3), link: 'meas', linkLabel: 'Registrar medición',
        series: { unit: 'lpm', target: 70, items: (st.meas || []).filter((m) => m.fc).slice(-8).map((m) => ({ label: this.dateOf(m.d).getDate() + '/' + (this.dateOf(m.d).getMonth() + 1), v: m.fc })) }
      });
    }

    /* Mente: estrés, energía y ánimo (evaluación + chequeos) */
    {
      const e = this.moodAvg('estres') || a.estres, en = this.moodAvg('energia') || a.energia, an = this.moodAvg('animo') || a.animo;
      const eS = e ? (5 - e) * 25 : null, enS = en ? (en - 1) * 25 : null, anS = an ? (an - 1) * 25 : null;
      const acts = [];
      if (e && e >= 3.5) acts.push('Prueba 5 minutos de respiración lenta al despertar: 4 segundos inhalando, 6 exhalando.');
      if (en && en <= 2.5) acts.push('Para la energía: duerme 7 horas o más, toma luz en la mañana y muévete después de comer.');
      acts.push('Antes de dormir, escribe tres cosas buenas del día.');
      acts.push('Sal a caminar al aire libre 20 minutos, sin el celular en la mano.');
      if (an && an <= 2) acts.unshift('Si el ánimo bajo dura más de dos semanas, conversa con un profesional de salud mental. Pedir ayuda funciona.');
      const lab = (v) => (v ? f1(v) + ' de 5' : '—');
      out.push({
        id: 'mente', name: 'Mente', icon: ic.mente, w: 1, score: this.wavg([[eS, 1], [enS, 1], [anS, 1]]),
        what: 'Estrés, energía y ánimo. Haz un chequeo rápido cuando quieras para seguir cómo vas.',
        status: en ? 'Energía ' + f1(en) + ' de 5' : 'Sin datos',
        source: this.moodAvg('estres') ? 'Tus chequeos de las últimas 2 semanas' : 'Según tu evaluación',
        metrics: [
          { label: 'Estrés', value: lab(e), ideal: '2 o menos', s: eS },
          { label: 'Energía', value: lab(en), ideal: '4 o más', s: enS },
          { label: 'Ánimo', value: lab(an), ideal: '4 o más', s: anS }
        ],
        actions: acts.slice(0, 3), link: 'mood', linkLabel: '',
        series: { unit: '', target: null, items: [] }
      });
    }
    out.forEach((x) => { x.grade = this.gradeOf(x.score); });
    return out;
  }

  healthOverall(areas) {
    return this.wavg(areas.map((x) => [x.score, x.w]));
  }

  gradeColor(g, c, th) { return { A: c.gA, B: c.gB, C: c.gC, D: c.gD }[g] || th.tertiary; }

  setMood(field, v) {
    this.sfx('tap');
    const key = this.keyOf(new Date());
    const m = Object.assign({}, this.state.mood || {});
    m[key] = Object.assign({}, m[key] || {}, { [field]: v });
    this.setState({ mood: m }, () => this.persist());
  }

  openMeas() {
    this.sfx('open');
    const L = (f, d) => { const v = this.latest(f); return v == null ? d : v; };
    this.setState({ msheet: { peso: this.peso(), cintura: L('cintura', 82), fc: L('fc', 68), pas: L('pas', 120), pad: L('pad', 78), on: { cintura: this.latest('cintura') != null, fc: this.latest('fc') != null, bp: this.latest('pas') != null } } });
  }

  measStep(f, d) {
    const m = this.state.msheet;
    if (!m) return;
    this.sfx('tap');
    const lim = { peso: [35, 180, 0.1], cintura: [50, 160, 0.5], fc: [35, 130, 1], pas: [80, 220, 1], pad: [40, 140, 1] }[f];
    const n = Object.assign({}, m);
    n[f] = Math.max(lim[0], Math.min(lim[1], Math.round((m[f] + d * lim[2]) * 10) / 10));
    if (f === 'cintura' || f === 'fc') n.on = Object.assign({}, m.on, { [f]: true });
    if (f === 'pas' || f === 'pad') n.on = Object.assign({}, m.on, { bp: true });
    this.setState({ msheet: n });
  }

  saveMeas() {
    const m = this.state.msheet;
    if (!m) return;
    const d = this.keyOf(new Date());
    const meas = (this.state.meas || []).filter((x) => x.d !== d);
    meas.push({ d: d, peso: m.peso, cintura: m.on.cintura ? m.cintura : null, fc: m.on.fc ? m.fc : null, pas: m.on.bp ? m.pas : null, pad: m.on.bp ? m.pad : null });
    this.sfx('yes');
    this.setState({ meas: meas, peso: m.peso, msheet: null }, () => this.persist());
  }

  healthVals(th, c, dark) {
    const st = this.state;
    const has = !!(st.hp && st.hp.at);
    const areas = has ? this.healthAreas() : [];
    const overall = has ? this.healthOverall(areas) : null;
    const g = this.gradeOf(overall);
    const gc = (x) => this.gradeColor(x, c, th);
    const list = areas.map((x, i) => ({
      id: x.id, name: x.name, icon: x.icon, grade: x.grade, gColor: this.healthColor(x.score, dark), score: x.score == null ? '—' : x.score, status: x.status,
      pct: x.score || 0, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',
      open: () => { this.sfx('open'); this.go({ screen: 'area', area: x.id, menu: false }); }
    }));
    const sorted = areas.filter((x) => x.score != null).slice().sort((a, b) => a.score - b.score);
    const focus = sorted.slice(0, 2).map((x) => ({ name: x.name, grade: x.grade, gColor: this.healthColor(x.score, dark), status: x.status, open: () => { this.sfx('open'); this.go({ screen: 'area', area: x.id, menu: false }); } }));
    const ar = areas.find((x) => x.id === st.area) || null;
    let detail = null;
    if (ar) {
      const items = (ar.series.items || []).filter((x) => x.v != null);
      const maxV = Math.max(ar.series.target || 0, ...items.map((x) => x.v), 1);
      const minV = ar.id === 'cuerpo' || ar.id === 'corazon' ? Math.min(...items.map((x) => x.v), ar.series.target || Infinity) * 0.92 : 0;
      const sc = (v) => Math.max(4, Math.round(((v - minV) / Math.max(1e-6, maxV - minV)) * 96));
      const today = (st.mood || {})[this.keyOf(new Date())] || {};
      const moodRow = (field, label, lo, hi) => ({
        label: label, lo: lo, hi: hi,
        opts: [1, 2, 3, 4, 5].map((v) => ({ v: v, sel: today[field] === v, bg: today[field] === v ? th.inv : th.fill, fg: today[field] === v ? th.onInv : th.text, pick: () => this.setMood(field, v) }))
      });
      detail = {
        name: ar.name, icon: ar.icon, grade: ar.grade, gColor: this.healthColor(ar.score, true), halo: this.haloCss(this.healthColor(ar.score, true)), gLabel: this.gradeLabel(ar.grade), score: ar.score == null ? '—' : ar.score,
        ringOff: (276.5 * (1 - (ar.score || 0) / 100)).toFixed(1), what: ar.what, source: ar.source, hasNote: !!ar.note, note: ar.note || '',
        metrics: ar.metrics.map((m, i) => ({ label: m.label, value: m.value, ideal: m.ideal, hasIdeal: !!m.ideal, dot: m.s == null ? 'transparent' : this.healthColor(m.s, dark), line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })),
        actions: ar.actions.slice(0, 3).map((t, i) => ({ n: '0' + (i + 1), text: t, line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })),
        hasSeries: items.length >= 2, seriesLabel: ar.series.label || (ar.id === 'fuerza' ? 'Sesiones por semana' : ar.id === 'cuerpo' ? 'Peso' : ar.id === 'corazon' ? 'Pulso en reposo' : 'Promedio semanal'),
        seriesUnit: ar.series.unit, hasTarget: !!ar.series.target && items.length >= 2, targetPx: ar.series.target ? sc(ar.series.target) : 0,
        targetLabel: ar.series.target ? 'Meta ' + String(ar.series.target).replace('.', ',') + ' ' + ar.series.unit : '',
        bars: (ar.series.items || []).map((x) => ({ h: x.v == null ? 0 : sc(x.v), label: x.label, bg: x.v == null ? 'transparent' : th.text, val: x.v == null ? '' : String(Math.round(x.v * 10) / 10).replace('.', ',') })),
        cols: Math.max(1, (ar.series.items || []).length),
        isMood: ar.id === 'mente', moods: [moodRow('estres', 'Estrés hoy', 'Nada', 'Mucho'), moodRow('energia', 'Energía hoy', 'Baja', 'Alta'), moodRow('animo', 'Ánimo hoy', 'Bajo', 'Bueno')],
        hasLink: !!ar.linkLabel, linkLabel: ar.linkLabel,
        link: () => {
          this.sfx('tap');
          if (ar.link === 'meas') this.openMeas();
          else this.go({ screen: 'inicio', tab: ar.link, area: null, hday: 0, fday: 0 });
        }
      };
    }
    const ms = st.msheet;
    const mrow = (f, label, unit, onKey) => ({ f: f, label: label, unit: unit, val: ms ? (onKey && !ms.on[onKey] ? '—' : String(ms[f]).replace('.', ',')) : '', minus: () => this.measStep(f, -1), plus: () => this.measStep(f, 1) });
    const lastM = (st.meas || []).slice(-1)[0];
    const fc = this.latest('fc'), pas = this.latest('pas'), pad = this.latest('pad'), cin = this.latest('cintura');
    return {
      has: has, none: !has, overall: overall == null ? '—' : overall, overallN: overall, grade: g, gColor: this.healthColor(overall, true), gLabel: this.gradeLabel(g),
      ringOff: (439.8 * (1 - (overall || 0) / 100)).toFixed(1), areas: list, focus: focus, hasFocus: focus.length > 0,
      evalAgo: has ? this.agoText(st.hp.at).toLowerCase() : '', evalOld: has && Date.now() - st.hp.at > 60 * 864e5,
      startEval: () => this.startEval(),
      detail: detail,
      measOpen: !!ms, mrows: ms ? [mrow('peso', 'Peso', 'kg'), mrow('cintura', 'Cintura', 'cm', 'cintura'), mrow('fc', 'Pulso en reposo', 'lpm', 'fc'), mrow('pas', 'Presión, número alto', 'mmHg', 'bp'), mrow('pad', 'Presión, número bajo', 'mmHg', 'bp')] : [],
      openMeas: () => this.openMeas(), saveMeas: () => this.saveMeas(), closeMeas: () => { this.sfx('tap'); this.setState({ msheet: null }); },
      lastMeas: lastM ? this.agoText(this.dateOf(lastM.d).getTime()).toLowerCase() : 'nunca',
      kpis: [
        { label: 'Peso', value: String(this.peso()).replace('.', ','), unit: 'kg' },
        { label: 'Cintura', value: cin == null ? '—' : String(cin).replace('.', ','), unit: cin == null ? '' : 'cm' },
        { label: 'Pulso', value: fc == null ? '—' : String(fc), unit: fc == null ? '' : 'lpm' },
        { label: 'Presión', value: pas == null || pad == null ? '—' : pas + '/' + pad, unit: '' }
      ]
    };
  }

  evalVals(th, c) {
    const { S, ev, s } = this.evalStep();
    const a = ev.a || {};
    const val = a[s.id];
    const secs = [];
    S.forEach((x) => { if (secs.indexOf(x.sec) < 0) secs.push(x.sec); });
    const si = secs.indexOf(s.sec);
    let opts = [];
    if (s.type === 'choice') opts = s.opts.map((o, i) => ({ label: o[1], sel: val === o[0], bg: val === o[0] ? '#FAFAFA' : 'rgba(255, 255, 255, 0.08)', fg: val === o[0] ? '#09090B' : '#FAFAFA', ring: val === o[0] ? 'none' : 'none', pick: () => this.evalPick(o[0]) }));
    if (s.type === 'scale') opts = [1, 2, 3, 4, 5].map((v) => ({ label: String(v), sel: val === v, bg: val === v ? '#FAFAFA' : 'rgba(255, 255, 255, 0.08)', fg: val === v ? '#09090B' : '#FAFAFA', ring: val === v ? 'none' : 'none', pick: () => this.evalPick(v) }));
    const num = val == null ? this.evalDefault(s) : val;
    return {
      sec: s.sec, secNum: '0' + (si + 1), secTotal: '0' + secs.length, q: s.q, hint: s.hint || '', hasHint: !!s.hint,
      isChoice: s.type === 'choice', isScale: s.type === 'scale', isNum: s.type === 'num', opts: opts,
      lo: s.lo || '', hi: s.hi || '',
      num: String(num).replace('.', ','), unit: s.unit || '', optional: !!s.optional,
      canNext: s.type === 'num' || val != null, nextOp: s.type === 'num' || val != null ? 1 : 0.35,
      pct: Math.round(((ev.i + 1) / S.length) * 1000) / 10, step: ev.i + 1, total: S.length,
      minus: () => this.evalNum(-1), plus: () => this.evalNum(1), minus5: () => this.evalNum(-5), plus5: () => this.evalNum(5),
      next: () => this.evalNext(), skip: () => this.evalSkip(), back: () => { this.sfx('tap'); this.evalGo(Object.assign({}, a), -1); },
      close: () => { this.sfx('tap'); this.go({ screen: 'inicio', ev: null }); }
    };
  }
