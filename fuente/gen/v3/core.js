class Component extends DCLogic {
  state = {
    screen: null,
    tab: null,
    menu: null,
    sel: null,
    log: {},
    last: null,
    peso: null,
    quiz: { step: 0, minutes: null, intensity: null, series: null },
    t: 1,
    prefs: { tema: 'auto', nombre: 'Joshen', meta: 5, efectos: true, sonido: true, homeOrder: ['salud', 'hist', 'habitos', 'comida', 'agua', 'recup', 'semana', 'rutina'], homeHidden: {}, lastBackup: 0, backupSnooze: 0, histMode: 'habitos', v3: true },
    plan: { 0: 'superiorA', 1: 'piernasA', 2: 'cardio', 3: 'superiorB', 4: 'piernasB', 5: 'caminata' },
    resetArmed: false,
    noDemo: false,
    sess: null,
    tick: 0,
    since: null,
    editHome: false,
    persisted: false,
    backupMsg: '',
    hlog: {},
    hday: 0,
    habEdit: false,
    pushMsg: '',
    showCode: false,
    flog: {},
    fday: 0,
    fsheet: null,
    fdraft: null,
    fentry: null,
    frev: null,
    hp: null,
    meas: [],
    mood: {},
    ev: null,
    area: null,
    msheet: null,
    aiShow: false
  };

  /* ---------- ciclo de vida y guardado ---------- */

%%MOUNT%%

  applyData(s) {
    const next = {};
    ['log', 'peso', 'plan', 'noDemo', 'sess', 'since', 'hlog', 'flog', 'frev', 'hp', 'meas', 'mood'].forEach((k) => {
      if (s[k] !== undefined && s[k] !== null) next[k] = s[k];
    });
    if (s.prefs) {
      next.prefs = Object.assign({}, this.state.prefs, s.prefs);
      const known = ['salud', 'hist', 'habitos', 'comida', 'agua', 'recup', 'semana', 'rutina'];
      let ord = (next.prefs.homeOrder || []).filter((k) => known.indexOf(k) >= 0);
      if (!s.prefs.v3) ord = known.slice();
      known.forEach((k) => { if (ord.indexOf(k) < 0) ord.push(k); });
      next.prefs.homeOrder = ord;
      next.prefs.v3 = true;
      ['clase', 'acento', 'fuente', 'marca'].forEach((k) => { delete next.prefs[k]; });
    }
    return next;
  }

  snapshot() {
    const s = this.state;
    return {
      schema: 4, savedAt: Date.now(),
      log: s.log, peso: s.peso, prefs: s.prefs, plan: s.plan, noDemo: s.noDemo, sess: s.sess, since: s.since,
      hlog: s.hlog, flog: s.flog, frev: s.frev, hp: s.hp, meas: s.meas, mood: s.mood, derived: this.derived()
    };
  }

%%DERIVED%%

%%IDB%%

%%PERSIST%%

%%AUDIO%%

  sfx(name) {
    if (!this.sndOn()) return;
    switch (name) {
      case 'tap': this.tone(1500, 0, 0.04, { type: 'triangle', vol: 0.045 }); break;
      case 'pick': this.tone(880, 0, 0.08, { type: 'triangle', vol: 0.07 }); this.tone(1320, 0.035, 0.07, { type: 'triangle', vol: 0.04 }); break;
      case 'open': this.tone(420, 0, 0.14, { to: 640, vol: 0.055 }); break;
      case 'yes': this.tone(659.25, 0, 0.2, { type: 'triangle', vol: 0.1 }); this.tone(987.77, 0.08, 0.28, { type: 'triangle', vol: 0.09 }); break;
      case 'no': this.tone(330, 0, 0.26, { to: 230, vol: 0.09 }); break;
      case 'done': this.bell(1046.5, 0, 0.06); this.bell(1567.98, 0.11, 0.045); break;
      case 'bell': this.bell(1318.51, 0, 0.07); this.bell(987.77, 0.12, 0.05); break;
    }
  }

%%SEG%%

  startAnim() {
    if (this.raf) cancelAnimationFrame(this.raf);
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    this.sfx('done');
    if (reduce || !this.fxOn()) { this.setState({ t: 1 }); return; }
    const t0 = performance.now() + 200;
    const dur = 1400;
    this.setState({ t: 0 });
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      this.setState({ t: t });
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

%%SESSION%%

%%DATOS%%

  /* Paleta: neutros zinc en todo lo que es estructura y color vibrante solo en los datos
     (verde neón, amarillo ácido, bermellón y rosa, en la línea de Superpower). Sobre negro van
     a plena intensidad; sobre claro, un paso más profundo para que se vean. */
  colors(dark) {
    return dark ? {
      fuerza: '#FC5F2B', resistencia: '#4DA3FF', constancia: '#00FCA1', tecnica: '#B39DFF', heat: '#FC5F2B',
      fuerzaText: '#FF8A5C', resistenciaText: '#7DBBFF', constanciaText: '#4DF5B5', tecnicaText: '#C4B3FF', heatText: '#FF8A5C',
      accent: '#FAFAFA', accentText: '#A1A1AA',
      gA: '#00FCA1', gB: '#E8FC00', gC: '#FC5F2B', gD: '#FF68DE',
      prot: '#4DA3FF', carb: '#E8FC00', fat: '#FF68DE', fib: '#00FCA1'
    } : {
      fuerza: '#F2541F', resistencia: '#2A7FE0', constancia: '#11C182', tecnica: '#6F5FEA', heat: '#F2541F',
      fuerzaText: '#C2410C', resistenciaText: '#1D63B0', constanciaText: '#0B7A53', tecnicaText: '#5544D6', heatText: '#C2410C',
      accent: '#18181B', accentText: '#71717A',
      gA: '#11C182', gB: '#C8C400', gC: '#F2541F', gD: '#E0368C',
      prot: '#2A7FE0', carb: '#C8C400', fat: '#E0368C', fib: '#11C182'
    };
  }

  /* Color de salud: rosa (0) → bermellón (45) → amarillo ácido (70) → verde neón (85 y más) */
  healthColor(s, dark) {
    if (s == null || !isFinite(s)) return dark ? '#A1A1AA' : '#71717A';
    const x = Math.max(0, Math.min(100, s));
    const A = dark
      ? [[0, '#FF68DE'], [45, '#FC5F2B'], [70, '#E8FC00'], [85, '#00FCA1'], [100, '#00E59A']]
      : [[0, '#E0368C'], [45, '#F2541F'], [70, '#C8C400'], [85, '#11C182'], [100, '#0E9F6E']];
    for (let i = 1; i < A.length; i++) {
      if (x <= A[i][0]) return this.mix(A[i - 1][1], A[i][1], (x - A[i - 1][0]) / (A[i][0] - A[i - 1][0]));
    }
    return A[A.length - 1][1];
  }

  /* El mismo tono, más oscuro, para escribir sobre fondos claros (≥ 4,5:1); en oscuro es el mismo color */
  healthText(s, dark) {
    if (dark || s == null || !isFinite(s)) return this.healthColor(s, dark);
    return this.mix(this.healthColor(s, false), '#000000', 0.45);
  }

  hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
    return '#' + f(0) + f(8) + f(4);
  }

  haloCss(color, at) {
    const c = color || '#A1A1AA';
    return 'radial-gradient(120% 82% at 50% ' + (at || 122) + '%, ' + this.mix(c, '#FFFFFF', 0.35) + ' 0%, ' + c + ' 16%, ' + this.mix(c, '#000000', 0.62) + ' 36%, rgba(11, 11, 12, 0) 66%)';
  }

%%DATES%%

%%PESO%%

  buildSummary(r, q, date) {
    const I = this.intensities()[q.intensity] || this.intensities().moderada;
    const sf = q.series == null ? 1 : q.series;
    const minutes = q.minutes || r.minutes;
    const peso = this.peso();
    // MET (Compendium, entrenamiento con peso corporal) × kg × horas
    const kcal = Math.round((I.met * peso * (minutes / 60)) / 5) * 5;
    return {
      id: r.id, name: r.name, title: r.title, minutes: minutes,
      date: this.keyOf(date || new Date()),
      intensityKey: q.intensity || 'moderada', intensity: I.label, series: sf,
      setsDone: q.setsDone || null, setsTotal: q.setsTotal || null,
      kcal: kcal, peso: peso,
      muscles: r.muscles.map((m) => ({
        name: m.name, role: m.w >= 1 ? 'principal' : 'secundario',
        w: Math.round(m.w * (0.5 + 0.5 * sf) * 100) / 100
      }))
    };
  }

  seedDemo() {
    const R = this.routinesById();
    const plan = this.state.plan;
    const log = {};
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ti = this.todayIdx();
    const quizzes = [[60, 'dura', 1], [45, 'moderada', 0.8], [60, 'limite', 1], [75, 'dura', 1], [45, 'moderada', 1], [60, 'dura', 0.8], [60, 'moderada', 1]];
    let k = 0;
    for (let off = ti + 42; off >= 1; off--) {
      const d = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() - off);
      const rid = plan[(d.getDay() + 6) % 7];
      if (!rid || (rid === 'caminata' && off % 14 > 6)) continue;
      const key = this.keyOf(d);
      if (k === 4 || k === 13) { log[key] = { status: 'missed' }; k++; continue; }
      const q = quizzes[k % quizzes.length];
      log[key] = { status: 'done', summary: this.buildSummary(R[rid], { minutes: q[0], intensity: q[1], series: q[2] }, d) };
      k++;
    }
    return { log: log };
  }

  metrics(st) {
    const m = { sessions: 0, minutes: 0, kcal: 0 };
    Object.keys(st.log).forEach((key) => {
      const e = st.log[key];
      if (!e || e.status !== 'done' || !e.summary) return;
      m.sessions += 1;
      m.minutes += e.summary.minutes || 0;
      m.kcal += e.summary.kcal || 0;
    });
    return m;
  }

%%FMT%%

  /* ---------- acciones ---------- */

  nav() {
    const pv = this.props.pantalla || 'inicio';
    const tabMap = { habitos: 'habitos', comida: 'comida', salud: 'salud', area: 'salud', ajustes: 'ajustes' };
    return {
      screen: this.state.screen ?? (['confirmar', 'test', 'victoria', 'sesion', 'eval', 'area'].indexOf(pv) >= 0 ? pv : pv === 'evaluacion' ? 'eval' : 'inicio'),
      tab: this.state.tab ?? (tabMap[pv] || 'inicio'),
      menu: this.state.menu ?? (pv === 'perfil')
    };
  }

%%GOPREF%%

  answerYes() {
    this.sfx('tap');
    this.go({ screen: 'test', menu: false, quiz: { step: 0, minutes: null, intensity: null, series: null } });
  }

  answerNo() {
    this.sfx('tap');
    const key = this.keyOf(this.week()[this.selIdx()]);
    const log = Object.assign({}, this.state.log);
    if (!log[key]) log[key] = { status: 'missed', optional: (this.routineAt(this.selIdx()) || {}).id === 'caminata' };
    this.go({ log: log, screen: 'inicio' }, () => this.persist());
  }

%%QUIZPICK%%

  finish(q) {
    const R = this.routinesById();
    const si = this.selIdx();
    const r0 = this.routineAt(si);
    const r = r0 || R.superiorA;
    const st = this.state;
    const days = this.week();
    const s = this.buildSummary(r, q, days[si]);
    s.meta = st.prefs.meta;
    s.at = si === this.todayIdx() ? Date.now() : days[si].getTime() + 19 * 3600000;
    if (!r0) { s.weekDone = 0; this.go({ last: s, screen: 'victoria' }, () => this.startAnim()); return; }
    const log = Object.assign({}, st.log);
    log[this.keyOf(days[si])] = { status: 'done', summary: s };
    s.weekDone = days.filter((d) => log[this.keyOf(d)] && log[this.keyOf(d)].status === 'done').length;
    this.go({ log: log, sess: null, last: s, screen: 'victoria' }, () => { this.persist(); this.startAnim(); });
  }

%%HOME%%

  resetAll() {
    if (!this.state.resetArmed) {
      this.sfx('no');
      this.setState({ resetArmed: true });
      if (this.rt) clearTimeout(this.rt);
      this.rt = setTimeout(() => this.setState({ resetArmed: false }), 4000);
      return;
    }
    this.go({
      log: {}, hlog: {}, flog: {}, frev: null, last: null, resetArmed: false, noDemo: true, tab: 'inicio', sel: null, sess: null, since: this.keyOf(new Date())
    }, () => this.persist());
  }

%%HABITS%%

%%FOOD%%

%%HEALTH%%

%%MIX%%

  theme(dark) {
    return dark ? {
      bg: '#09090B', card: '#161619', raised: '#1E1E22', well: '#232327', cardShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)', menu: '#18181B', text: '#FAFAFA', sub: '#A1A1AA', tertiary: '#8A8A93', sep: '#27272A',
      fill: '#232327', btn2: '#232327', segBg: '#232327', segSel: '#3F3F46', bodyBase: '#26262B', muscleOff: '#3F3F46', barOff: '#3F3F46',
      bar: 'rgba(9, 9, 11, 0.82)', scrim: 'rgba(0, 0, 0, 0.6)', shadow: '0 24px 60px rgba(0, 0, 0, 0.6)', danger: '#F87171',
      inv: '#FAFAFA', onInv: '#09090B', line: 'rgba(255, 255, 255, 0.06)', input: '#232327'
    } : {
      bg: '#F4F4F5', card: '#FFFFFF', raised: '#F4F4F5', well: '#F4F4F5', cardShadow: '0 1px 2px rgba(9, 9, 11, 0.04), 0 10px 30px -18px rgba(9, 9, 11, 0.2)', menu: '#FFFFFF', text: '#18181B', sub: '#57575F', tertiary: '#6B6B74', sep: '#E4E4E7',
      fill: '#EBEBED', btn2: '#EBEBED', segBg: '#EBEBED', segSel: '#FFFFFF', bodyBase: '#E4E4E7', muscleOff: '#C2C2C8', barOff: '#D4D4D8',
      bar: 'rgba(255, 255, 255, 0.84)', scrim: 'rgba(9, 9, 11, 0.32)', shadow: '0 24px 60px rgba(9, 9, 11, 0.16)', danger: '#C81E1E',
      inv: '#18181B', onInv: '#FFFFFF', line: 'rgba(9, 9, 11, 0.06)', input: '#FFFFFF'
    };
  }

  fonts() {
    return {
      sans: "'Geist', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      mono: "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    };
  }

  summaryVals(s, t, th, c, dark) {
    const pT = this.seg(t, 0, 0.7), pB = this.seg(t, 0.15, 0.85);
    const body = {};
    this.regionKeys().forEach((k) => { body[k] = 0; });
    s.muscles.forEach((m) => { this.regionsOf(m.name).forEach((k) => { body[k] = Math.max(body[k], m.w); }); });
    const vb = {};
    Object.keys(body).forEach((k) => { vb[k] = this.heatColor(th, c, dark, body[k] * pB); });
    const RH = this.recoveryHours();
    const TI = { suave: 0.75, moderada: 0.9, dura: 1, limite: 1.2 }[s.intensityKey] || 0.9;
    const d = s.date ? this.dateOf(s.date) : new Date();
    return {
      v: {
        dateLine: this.longDate(d), name: s.name, title: s.title,
        minutes: Math.round(s.minutes * pT), kcalNow: this.fmt(s.kcal * pT), intensity: s.intensity || 'Moderada',
        sets: s.setsTotal ? Math.round(s.setsDone * pT) + '/' + s.setsTotal : '—',
        week: s.meta ? (s.weekDone || 0) + ' de ' + s.meta : '—',
        muscles: s.muscles.map((m, i) => ({
          name: m.name, role: m.role, pct: Math.round(m.w * 100 * pB), w: Math.round(m.w * 1000 * pB) / 10,
          ready: this.readyText(Math.round((RH[m.name] || 48) * TI * (0.6 + 0.4 * Math.min(1, m.w)) * 0.66)).replace('Listo en', 'Listo en unas'),
          line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none'
        }))
      },
      vb: vb
    };
  }

%%QUIZVALS%%

%%RENDER%%
}
