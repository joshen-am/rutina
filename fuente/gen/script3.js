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

  componentDidMount() {
    let loaded = false;
    let localAt = 0;
    try {
      const raw = window.localStorage.getItem('tracker-rutinas-v3');
      if (raw) {
        const s = JSON.parse(raw);
        this.setState(this.applyData(s));
        localAt = s.savedAt || 1;
        loaded = true;
      }
    } catch (e) {}
    if (!loaded && this.props.datosEjemplo === true) this.setState(this.seedDemo());
    if (!this.state.since) {
      const keys = Object.keys(this.state.log).sort();
      this.setState({ since: keys[0] || this.keyOf(new Date()) }, () => this.persist());
    }
    // Segunda copia en IndexedDB: si localStorage se perdió o quedó atrás, se recupera desde ahí.
    this.idbGet().then((d) => {
      if (d && d.savedAt && d.savedAt > localAt) this.setState(this.applyData(d), () => this.persist());
      else if (loaded) this.idbPut(this.snapshot());
    }).catch(() => {});
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persisted().then((p) => (p ? p : navigator.storage.persist())).then((p) => this.setState({ persisted: !!p })).catch(() => {});
      }
    } catch (e) {}
    this.syncTicker();
    if (this.isNative()) setTimeout(() => this.nativeSchedule(), 1500);
  }

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

  // Resumen que lee el service worker para personalizar las notificaciones
  derived() {
    try {
      const t = new Date();
      const key = this.keyOf(t);
      const d = (this.state.hlog || {})[key] || {};
      const r = this.routineAt(this.todayIdx());
      const names = {};
      for (let i = 0; i < 7; i++) { const rr = this.routineAt(i); if (rr) names[i + 1] = rr.name; }
      const lect = this.habitCatalog().find((h) => h.id === 'lectura');
      return {
        day: key, agua: d.agua || 0, aguaGoal: this.habitGoal({ id: 'agua' }, t), aguaBase: Math.max(8, Math.round((this.peso() * 30) / 250)),
        lectura: d.lectura || 0, lecturaGoal: this.habitGoal(lect, t),
        entreno: r && r.id !== 'caminata' ? r.name : null,
        entrenoHecho: !!(this.state.log[key] && this.state.log[key].status === 'done'), planNames: names
      };
    } catch (e) { return null; }
  }

  idbOpen() {
    if (this._idb) return this._idb;
    this._idb = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open('rutina', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
    return this._idb;
  }

  idbGet() {
    return this.idbOpen().then((db) => new Promise((resolve, reject) => {
      const r = db.transaction('kv', 'readonly').objectStore('kv').get('estado');
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    }));
  }

  idbPut(data) {
    return this.idbOpen().then((db) => new Promise((resolve) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(data, 'estado');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    })).catch(() => false);
  }

  exportBackup() {
    this.sfx('tap');
    const name = 'keystone-respaldo-' + this.keyOf(new Date()) + '.json';
    const json = JSON.stringify({ app: 'rutina', version: 1, exportedAt: new Date().toISOString(), data: this.backupData() });
    const done = () => { this.setPref('lastBackup', Date.now()); this.setState({ backupMsg: 'Respaldo guardado. Guárdalo en Archivos o iCloud Drive.' }); };
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Respaldo de keystone' }).then(done).catch(() => {});
        return;
      }
    } catch (e) {}
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
      done();
    } catch (e) { this.setState({ backupMsg: 'No se pudo crear el respaldo en este navegador.' }); }
  }

  importBackup(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    file.text().then((txt) => {
      const j = JSON.parse(txt);
      if (!j || j.app !== 'rutina' || !j.data || !j.data.log) throw new Error('formato');
      this.setState(Object.assign(this.applyData(j.data), { last: null, screen: 'inicio' }), () => {
        this.persist();
        const n = Object.keys(this.state.log).filter((k) => this.state.log[k].status === 'done').length;
        this.setState({ backupMsg: 'Respaldo restaurado: ' + n + (n === 1 ? ' sesión.' : ' sesiones.') });
        this.sfx('yes');
      });
    }).catch(() => { this.setState({ backupMsg: 'Ese archivo no es un respaldo de keystone.' }); this.sfx('no'); });
    try { input.value = ''; } catch (err) {}
  }

  backupData() {
    const s = this.snapshot();
    s.prefs = Object.assign({}, s.prefs);
    delete s.prefs.ai;
    delete s.prefs.pushKeys;
    return s;
  }

  componentDidUpdate() { this.syncTicker(); }

  componentWillUnmount() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.timer) clearTimeout(this.timer);
    if (this.rt) clearTimeout(this.rt);
    if (this.iv) clearInterval(this.iv);
  }

  persist() {
    const data = this.snapshot();
    try { window.localStorage.setItem('tracker-rutinas-v3', JSON.stringify(data)); } catch (e) {}
    this.idbPut(data);
  }

  fxOn() { return this.state.prefs.efectos !== false; }

  /* ---------- sonido (Web Audio, sintetizado) ---------- */

  sndOn() { return this.state.prefs.sonido !== false; }

  audio() {
    if (!this.sndOn()) return null;
    try {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ac.destination);
      }
      if (this.ac.state === 'suspended') this.ac.resume();
      return this.ac;
    } catch (e) { return null; }
  }

  tone(freq, start, dur, o) {
    const ac = this.audio();
    if (!ac) return;
    o = o || {};
    try {
      const t0 = ac.currentTime + (start || 0);
      const osc = ac.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      const g = ac.createGain();
      const vol = o.vol == null ? 0.15 : o.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  bell(freq, start, vol) {
    this.tone(freq, start, 1.4, { vol: vol });
    this.tone(freq * 2.76, start, 0.7, { vol: vol * 0.35 });
    this.tone(freq * 5.4, start, 0.35, { vol: vol * 0.15 });
  }

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

  seg(t, a, b) {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    // ease-out similar a la curva de iOS
    return 1 - Math.pow(1 - x, 4);
  }

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

  /* ---------- sesión guiada ---------- */

  sessionData() { return %%SESSION%%; }

  stepsFor(rid) { return this.sessionData()[rid] || []; }

  syncTicker() {
    const on = this.nav().screen === 'sesion';
    if (on && !this.iv) this.iv = setInterval(() => this.onTick(), 100);
    if (!on && this.iv) { clearInterval(this.iv); this.iv = null; }
  }

  onTick() {
    const s = this.state.sess;
    const patch = { tick: (this.state.tick + 1) % 100000 };
    if (s && s.restEnd) {
      const left = Math.ceil((s.restEnd - Date.now()) / 1000);
      this.beeped = this.beeped || {};
      if (left <= 3 && left > 0 && !this.beeped[left]) { this.beeped[left] = true; this.tone(880, 0, 0.07, { type: 'triangle', vol: 0.08 }); }
      if (left <= 0) {
        patch.sess = Object.assign({}, s, { restEnd: null });
        this.sfx('bell');
        try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) {}
      }
    }
    this.setState(patch);
  }

  frameSeq(n, poses) {
    this._seq = this._seq || {};
    const key = n + ':' + poses;
    if (this._seq[key]) return this._seq[key];
    const seg = poses > 1 ? Math.round((n - 1) / (poses - 1)) : n;
    const hold = 6;
    const out = [];
    const push = (f) => { out.push(f); if (f % seg === 0) for (let h = 1; h < hold; h++) out.push(f); };
    for (let f = 0; f < n; f++) push(f);
    for (let f = n - 2; f > 0; f--) push(f);
    this._seq[key] = out;
    return out;
  }

  startSession() {
    const si = this.selIdx();
    const r = this.routineAt(si);
    if (!r) return;
    const date = this.keyOf(this.week()[si]);
    const cur = this.state.sess;
    this.sfx('open');
    if (cur && cur.rid === r.id && cur.date === date) { this.go({ screen: 'sesion', menu: false }); return; }
    this.beeped = {};
    this.go({ screen: 'sesion', menu: false, tick: 0, sess: { rid: r.id, date: date, i: 0, sets: {}, start: Date.now(), restEnd: null, restTotal: 0 } }, () => this.enterStep(0));
  }

  enterStep(i) {
    const s = this.state.sess;
    if (!s) return;
    const p = this.stepsFor(s.rid)[i];
    const next = Object.assign({}, s, { i: i, restEnd: null, restTotal: 0 });
    if (p && p.auto) { next.restEnd = Date.now() + p.auto * 1000; next.restTotal = p.auto; }
    this.beeped = {};
    this.setState({ sess: next, tick: 0 }, () => this.persist());
  }

  sesNext() {
    const s = this.state.sess;
    if (!s) return;
    const n = this.stepsFor(s.rid).length;
    if (s.i < n - 1) { this.sfx('tap'); this.enterStep(s.i + 1); } else this.finishSession();
  }

  sesPrev() {
    const s = this.state.sess;
    if (!s || s.i === 0) return;
    this.sfx('tap');
    this.enterStep(s.i - 1);
  }

  markSet(k) {
    const s = this.state.sess;
    if (!s) return;
    const p = this.stepsFor(s.rid)[s.i];
    const done = s.sets[s.i] || 0;
    const sets = Object.assign({}, s.sets);
    const next = Object.assign({}, s, { sets: sets });
    if (k <= done) { sets[s.i] = k - 1; next.restEnd = null; this.sfx('tap'); }
    else {
      sets[s.i] = k;
      this.sfx('pick');
      if (k < p.sets && p.rest) { next.restEnd = Date.now() + p.rest * 1000; next.restTotal = p.rest; this.beeped = {}; }
      else next.restEnd = null;
      if (k >= p.sets) setTimeout(() => this.sfx('done'), 150);
    }
    this.setState({ sess: next }, () => this.persist());
  }

  restAdd() {
    const s = this.state.sess;
    if (!s || !s.restEnd) return;
    this.sfx('tap');
    this.setState({ sess: Object.assign({}, s, { restEnd: s.restEnd + 15000, restTotal: s.restTotal + 15 }) });
  }

  restSkip() {
    const s = this.state.sess;
    if (!s) return;
    this.sfx('tap');
    this.setState({ sess: Object.assign({}, s, { restEnd: null }) }, () => this.persist());
  }

  setTotals(s) {
    const steps = this.stepsFor(s.rid);
    let total = 0, done = 0;
    steps.forEach((p, i) => { if (p.sets) { total += p.sets; done += Math.min(p.sets, s.sets[i] || 0); } });
    return { total: total, done: done };
  }

  finishSession() {
    const s = this.state.sess;
    if (!s) return;
    this.sfx('yes');
    const minutes = Math.max(5, Math.round((Date.now() - s.start) / 60000));
    const tt = this.setTotals(s);
    let series = null;
    if (tt.total && tt.done) {
      const ratio = tt.done / tt.total;
      series = this.seriesOpts().reduce((best, o) => (Math.abs(o.v - ratio) < Math.abs(best - ratio) ? o.v : best), 1);
    }
    this.go({ screen: 'test', quiz: { step: 1, minutes: minutes, intensity: null, series: series, fromSession: true, setsDone: tt.done, setsTotal: tt.total } });
  }

  discardSession() {
    this.sfx('no');
    this.go({ sess: null }, () => this.persist());
  }

  fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
    const mm = h ? String(m).padStart(2, '0') : String(m);
    return (h ? h + ':' : '') + mm + ':' + String(x).padStart(2, '0');
  }

  sessionVals(s, th, c, dark, primary, onPrimary, fx) {
    const steps = this.stepsFor(s.rid);
    const R = this.routinesById()[s.rid] || { name: '' };
    const i = Math.max(0, Math.min(s.i, steps.length - 1));
    const p = steps[i] || { k: 'rest', how: [], n: 0, poses: 0, sets: 0, phase: '', name: '', dose: '' };
    const now = Date.now();
    let f = 0;
    if (p.n > 1) f = fx ? this.frameSeq(p.n, p.poses)[this.state.tick % this.frameSeq(p.n, p.poses).length] : p.n - 1;
    const done = s.sets[i] || 0;
    const left = s.restEnd ? Math.max(0, Math.ceil((s.restEnd - now) / 1000)) : 0;
    const phaseColor = { 'Calentamiento': c.heatText, 'Ejercicios': c.fuerzaText, 'Cierre de postura': c.tecnicaText, 'Postura': c.tecnicaText, 'Cardio': c.resistenciaText, 'Core': c.constanciaText }[p.phase] || th.sub;
    const notes = [['Ojo', p.watch, c.fuerzaText], ['Más fácil', p.easier, c.constanciaText], ['Más difícil', p.harder, c.tecnicaText], ['Consejo', p.tip, c.resistenciaText]]
      .filter((x) => x[1]).map((x, j) => ({ label: x[0], text: x[1], color: x[2], line: j ? ('inset 0 0.5px 0 ' + th.sep) : 'none' }));
    const isRest = p.k === 'rest';
    return {
      title: R.name, num: i + 1, total: steps.length, pct: Math.round(((i + 1) / Math.max(1, steps.length)) * 1000) / 10,
      elapsed: this.fmtClock((now - s.start) / 1000),
      even: i % 2 === 0, odd: i % 2 === 1,
      phase: p.phase, phaseColor: phaseColor, round: p.round || '',
      hasImg: !!p.img, k: p.k || '', img: p.img || '', imgW: Math.max(1, p.n) * 100, shift: p.n ? Math.round((f / p.n) * 100000) / 1000 : 0,
      imgBg: dark ? th.card : '#FFFFFF', imgFilter: dark ? 'invert(0.9) hue-rotate(180deg)' : 'none',
      imgAlt: 'Animación de ' + p.name.toLowerCase(),
      isRestStep: isRest,
      name: p.name, dose: p.dose, hasRest: !!p.rest && !isRest, restLabel: p.rest ? (p.rest >= 60 && p.rest % 60 === 0 ? (p.rest / 60) + ' min' : p.rest + ' s') : '',
      hasWorks: !!p.works, works: p.works || '',
      hasSets: p.sets > 0, sets: p.sets, setsDone: Math.min(done, p.sets),
      setBtns: Array.from({ length: p.sets || 0 }, (_, k) => ({
        n: k + 1, aria: 'Serie ' + (k + 1) + (k < done ? ', hecha' : ''), pressed: k < done, open: k >= done,
        bg: k < done ? primary : th.segBg, fg: k < done ? onPrimary : th.text,
        ring: k === done ? ('inset 0 0 0 2px ' + primary) : 'none',
        pick: () => this.markSet(k + 1)
      })),
      resting: !!s.restEnd && !isRest, restLeft: this.fmtClock(isRest && !s.restEnd ? 0 : left),
      restPct: s.restEnd && s.restTotal ? Math.round((left / s.restTotal) * 1000) / 10 : 0,
      hasSetHint: p.sets > 0 && (done === 0 || done >= p.sets),
      setHint: done >= p.sets ? 'Series completas. Toca Siguiente para continuar.' : 'Toca cada serie al terminarla y empieza el descanso.',
      hasHow: p.how && p.how.length > 0,
      how: (p.how || []).map((h, j) => ({ n: j + 1, text: h, line: j ? ('inset 0 0.5px 0 ' + th.sep) : 'none' })),
      hasNotes: notes.length > 0, notes: notes,
      hasPrev: i > 0, nextLabel: i >= steps.length - 1 ? 'Terminar sesión' : 'Siguiente'
    };
  }


  /* ---------- datos ---------- */

  routinesById() {
    const ex = (name, sets, rest) => ({ name: name, sets: sets, rest: rest || null });
    const fuerza = 'En casa, con calentamiento de 8 min y cierre de postura de 5 min.';
    return {
      superiorA: {
        id: 'superiorA', name: 'Tren superior A', title: 'Pecho, espalda, hombros y brazos', minutes: 55, note: fuerza,
        exercises: [
          ex('Flexión de rodillas', '4 × 6–12', '90 s'),
          ex('Remo en el marco de la puerta', '4 × 8–12 por brazo', '60 s'),
          ex('Elevaciones laterales con 3 kg', '3 × 12–20 por brazo', '60 s'),
          ex('Curl de bíceps con 3 kg', '3 × 12–20 por brazo', '60 s'),
          ex('Extensión de tríceps sobre la cabeza', '3 × 12–20 por brazo', '60 s'),
          ex('Y-T-W boca abajo', '2 × 8 de cada letra', '60 s'),
          ex('Dead bug', '3 × 8 por lado', '45 s'),
          ex('Plancha', '3 × 20–40 s', '45 s')
        ],
        muscles: [
          { name: 'Pecho', w: 1 }, { name: 'Espalda', w: 1 }, { name: 'Hombros', w: 1 },
          { name: 'Bíceps', w: 0.6 }, { name: 'Tríceps', w: 0.6 }, { name: 'Core', w: 0.6 }
        ],
        gains: { fuerza: 2, resistencia: 1, tecnica: 2 }
      },
      piernasA: {
        id: 'piernasA', name: 'Piernas A + core', title: 'Muslos, glúteos y abdomen', minutes: 50, note: fuerza,
        exercises: [
          ex('Sentadilla con pausa', '4 × 10–15', '90 s'),
          ex('Zancada hacia atrás', '3 × 8–12 por pierna', '90 s'),
          ex('Puente de glúteo', '3 × 12–20', '60 s'),
          ex('Peso muerto rumano a una pierna', '3 × 8–12 por pierna', '60 s'),
          ex('Elevación de talones a una pierna', '3 × 12–20 por pierna', '45 s'),
          ex('Plancha lateral', '3 × 20–30 s por lado', '45 s'),
          ex('Bird dog', '3 × 8 por lado', '45 s')
        ],
        muscles: [
          { name: 'Cuádriceps', w: 1 }, { name: 'Glúteos', w: 1 }, { name: 'Isquiotibiales', w: 0.6 },
          { name: 'Gemelos', w: 0.6 }, { name: 'Core', w: 0.8 }
        ],
        gains: { fuerza: 2, resistencia: 2, tecnica: 1 }
      },
      cardio: {
        id: 'cardio', name: 'Cardio + core + postura', title: 'Caminata o intervalos, abdomen y espalda alta', minutes: 55,
        note: 'En la calle y en casa. Desde la semana 5, el cardio son 20 min de intervalos y 15 min caminando.',
        exercises: [
          ex('Caminata rápida o intervalos', '35–40 min'),
          ex('Dead bug', '10, 5 por lado'),
          ex('Crunch invertido', '10'),
          ex('Hollow con rodillas', '20 s'),
          ex('Plancha lateral', '20 s por lado'),
          ex('Chin tuck', '2 × 10'),
          ex('Ángeles en la pared', '2 × 10'),
          ex('Y-T-W boca abajo', '1 × 8 de cada letra'),
          ex('Esfinge', '5 × 5 s'),
          ex('Gato-vaca', '10')
        ],
        muscles: [
          { name: 'Core', w: 1 }, { name: 'Cuádriceps', w: 0.5 }, { name: 'Gemelos', w: 0.5 },
          { name: 'Glúteos', w: 0.45 }, { name: 'Espalda', w: 0.45 }
        ],
        gains: { fuerza: 1, resistencia: 3, tecnica: 1 }
      },
      superiorB: {
        id: 'superiorB', name: 'Tren superior B', title: 'Pecho, hombros, tríceps y espalda', minutes: 55, note: fuerza,
        exercises: [
          ex('Flexión negativa en el suelo', '4 × 3–6', '90 s'),
          ex('Remo en el marco con pausa', '4 × 8–12 por brazo', '60 s'),
          ex('Jalón boca abajo', '3 × 10–12', '60 s'),
          ex('Flexión pica', '3 × 5–8', '90 s'),
          ex('Fondo de tríceps en el suelo', '3 × 10–15', '60 s'),
          ex('Elevación de piernas acostado', '3 × 8–12', '60 s'),
          ex('Elevaciones laterales con 3 kg', '3 × 15–20 por brazo', '45 s')
        ],
        muscles: [
          { name: 'Pecho', w: 1 }, { name: 'Hombros', w: 1 }, { name: 'Tríceps', w: 1 },
          { name: 'Espalda', w: 0.8 }, { name: 'Bíceps', w: 0.45 }, { name: 'Core', w: 0.6 }
        ],
        gains: { fuerza: 3, resistencia: 1, tecnica: 2 }
      },
      piernasB: {
        id: 'piernasB', name: 'Piernas B + brazos', title: 'Muslos, glúteos, brazos y abdomen', minutes: 55, note: fuerza,
        exercises: [
          ex('Zancada estática', '3 × 8–12 por pierna', '90 s'),
          ex('Sentadilla sumo con 3 kg', '3 × 12–20', '60 s'),
          ex('Puente de isquios', '3 × 10–15', '60 s'),
          ex('Puente a una pierna', '3 × 8–12 por pierna', '60 s'),
          ex('Sentadilla isométrica en la pared', '2 × 30–60 s', '60 s'),
          ex('Curl martillo + elevaciones laterales', '2 × 15–20 por brazo', '45 s'),
          ex('Hollow con rodillas dobladas', '3 × 15–30 s', '45 s'),
          ex('Crunch invertido', '3 × 10–15', '45 s')
        ],
        muscles: [
          { name: 'Cuádriceps', w: 1 }, { name: 'Glúteos', w: 1 }, { name: 'Isquiotibiales', w: 0.8 },
          { name: 'Core', w: 0.7 }, { name: 'Bíceps', w: 0.45 }, { name: 'Antebrazos', w: 0.45 }, { name: 'Hombros', w: 0.45 }
        ],
        gains: { fuerza: 2, resistencia: 2, tecnica: 1 }
      },
      caminata: {
        id: 'caminata', name: 'Caminata larga', title: 'Opcional, por la Costanera', minutes: 50,
        note: 'Opcional. Suma minutos de cardio a tu semana.',
        exercises: [ex('Caminata', '45–60 min')],
        muscles: [{ name: 'Cuádriceps', w: 0.5 }, { name: 'Gemelos', w: 0.5 }, { name: 'Glúteos', w: 0.45 }],
        gains: { fuerza: 1, resistencia: 2, tecnica: 1 }
      }
    };
  }

  planOrder() { return ['superiorA', 'piernasA', 'cardio', 'superiorB', 'piernasB', 'caminata', null]; }

  routineAt(i) {
    const id = this.state.plan[i];
    return id ? this.routinesById()[id] : null;
  }

  regionsOf(name) {
    const map = {
      'Pecho': ['chest'], 'Hombros': ['deltF', 'deltB'], 'Deltoides posterior': ['deltB'],
      'Tríceps': ['triceps'], 'Bíceps': ['biceps'], 'Antebrazos': ['forearm'],
      'Core': ['abs', 'lowback'], 'Espalda': ['traps', 'lats', 'lowback'],
      'Cuádriceps': ['quads'], 'Isquiotibiales': ['hams'], 'Glúteos': ['glutes'], 'Gemelos': ['calves']
    };
    return map[name] || [];
  }

  /* Horas para recuperarse tras una sesión dura (cerca del fallo), por grupo muscular.
     Grandes y multiarticulares ~72 h, medianos ~48 h, pequeños ~36 h. */
  recoveryHours() {
    return {
      'Espalda': 72, 'Cuádriceps': 72, 'Isquiotibiales': 72, 'Glúteos': 60,
      'Pecho': 48, 'Hombros': 48, 'Deltoides posterior': 48, 'Tríceps': 42,
      'Bíceps': 36, 'Antebrazos': 36, 'Gemelos': 36, 'Core': 36
    };
  }

  sessionTime(key, s) {
    return s && s.at ? s.at : this.dateOf(key).getTime() + 19 * 3600000;
  }

  // Fatiga de cada músculo en un instante: cada sesión suma fatiga según cuánto trabajó el músculo
  // y la intensidad, y se disipa con una curva suave en el tiempo de recuperación de ese músculo.
  fatigue(st) {
    const RH = this.recoveryHours();
    const TI = { suave: 0.75, moderada: 0.9, dura: 1, limite: 1.2 };
    const now = Date.now();
    const parts = {};
    Object.keys(st.log).forEach((key) => {
      const e = st.log[key];
      if (!e || e.status !== 'done' || !e.summary || !e.summary.muscles) return;
      const t0 = this.sessionTime(key, e.summary);
      const age = (now - t0) / 3600000;
      if (age < 0 || age > 200) return;
      const ti = TI[e.summary.intensityKey] || 0.9;
      e.summary.muscles.forEach((mu) => {
        const w = Math.min(1, mu.w);
        const T = (RH[mu.name] || 48) * ti * (0.6 + 0.4 * w);
        const F = Math.min(1, w * (0.55 + 0.45 * ti));
        (parts[mu.name] = parts[mu.name] || []).push({ age: age, T: T, F: F });
      });
    });
    const at = (list, plus) => Math.min(1, list.reduce((sum, p) => {
      const x = (p.age + plus) / p.T;
      return sum + (x >= 1 ? 0 : p.F * 0.5 * (1 + Math.cos(Math.PI * x)));
    }, 0));
    const out = {};
    Object.keys(parts).forEach((m) => {
      const load = at(parts[m], 0);
      let h = 0;
      while (h < 200 && at(parts[m], h) >= 0.12) h += 1;
      out[m] = { load: load, hours: h };
    });
    return out;
  }

  agoText(ts) {
    const d = Math.floor((Date.now() - ts) / 864e5);
    return d <= 0 ? 'Hoy' : d === 1 ? 'Ayer' : 'Hace ' + d + ' días';
  }

  readyText(h) {
    if (h <= 0) return 'Recuperado';
    if (h < 24) return 'Listo en ' + h + ' h';
    const d = Math.floor(h / 24), r = h % 24;
    const dt = d === 1 ? '1 día' : d + ' días';
    if (r >= 21) return 'Listo en ' + (d + 1) + ' días';
    return r < 3 ? 'Listo en ' + dt : 'Listo en ' + dt + ' y ' + r + ' h';
  }

  regionKeys() {
    return ['chest', 'deltF', 'deltB', 'biceps', 'triceps', 'forearm', 'abs', 'lowback', 'traps', 'lats', 'glutes', 'quads', 'hams', 'calves'];
  }

  intensities() {
    return {
      suave: { label: 'Suave', sub: 'Podía conversar sin problema', met: 3.5, mult: 0.8 },
      moderada: { label: 'Moderada', sub: 'Exigente, pero cómoda', met: 5, mult: 1 },
      dura: { label: 'Dura', sub: 'Me quedaban pocas repeticiones', met: 6, mult: 1.2 },
      limite: { label: 'Al límite', sub: 'Llegué al fallo en varias series', met: 7, mult: 1.4 }
    };
  }

  seriesOpts() {
    return [
      { v: 1, label: 'Todas', sub: 'Terminé la rutina completa' },
      { v: 0.8, label: 'Casi todas', sub: 'Me faltaron una o dos' },
      { v: 0.5, label: 'La mitad', sub: 'Hice más o menos la mitad' },
      { v: 0.3, label: 'Menos de la mitad', sub: 'Fue una sesión corta' }
    ];
  }

  /* Paleta: neutros zinc, un acento cálido y colores de datos sobrios */
  colors(dark) {
    return dark ? {
      fuerza: '#F2555A', resistencia: '#5AB0F0', constancia: '#3CC77F', tecnica: '#A196FF', heat: '#F2555A',
      fuerzaText: '#FF7B80', resistenciaText: '#7DC1F5', constanciaText: '#5AD394', tecnicaText: '#B4ABFF', heatText: '#FF7B80',
      accent: '#FAFAFA', accentText: '#A1A1AA',
      gA: '#3CC77F', gB: '#E2C043', gC: '#FF9F4D', gD: '#F2638E',
      prot: '#5AB0F0', carb: '#E2C043', fat: '#F2638E', fib: '#3CC77F'
    } : {
      fuerza: '#DC3B41', resistencia: '#2A86CF', constancia: '#1F9D62', tecnica: '#6F5FEA', heat: '#DC3B41',
      fuerzaText: '#B42A30', resistenciaText: '#1D6AA8', constanciaText: '#157A4B', tecnicaText: '#5544D6', heatText: '#B42A30',
      accent: '#18181B', accentText: '#71717A',
      gA: '#1F9D62', gB: '#C9A100', gC: '#E8711A', gD: '#DB2E6A',
      prot: '#2A86CF', carb: '#D9A400', fat: '#DB2E6A', fib: '#1F9D62'
    };
  }

  /* Color de salud continuo: 0 rojo → 50 ámbar → 100 verde profundo (interpolación de tono en HSL) */
  healthColor(s, dark) {
    if (s == null || !isFinite(s)) return dark ? '#A1A1AA' : '#71717A';
    const x = Math.max(0, Math.min(100, s)) / 100;
    const h = 2 + 140 * Math.pow(x, 1.05);
    const sat = dark ? 68 : 70;
    let l = dark ? 56 : 46;
    if (x > 0.8) l -= (x - 0.8) / 0.2 * (dark ? 8 : 12);
    return this.hsl(h, sat, l);
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

  /* ---------- fechas ---------- */

  week() {
    const now = new Date();
    const t = (now.getDay() + 6) % 7;
    const out = [];
    for (let i = 0; i < 7; i++) out.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - t + i));
    return out;
  }

  mondayOf(d) {
    const t = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - t);
  }

  keyOf(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  dateOf(key) {
    const p = key.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  todayIdx() { return (new Date().getDay() + 6) % 7; }

  selIdx() { return this.state.sel == null ? this.todayIdx() : this.state.sel; }

  dayNames() { return ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']; }

  monthNames() { return ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; }

  longDate(d) {
    const n = this.dayNames()[(d.getDay() + 6) % 7];
    return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + d.getDate() + ' de ' + this.monthNames()[d.getMonth()];
  }


  peso() {
    const p = Number(this.state.peso ?? this.props.peso ?? 70);
    return p > 0 ? p : 70;
  }

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

  fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

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

  go(patch, cb) {
    const n = this.nav();
    this.setState(Object.assign({ screen: n.screen, tab: n.tab, menu: n.menu }, patch), cb);
  }

  setPref(k, v) {
    const prefs = Object.assign({}, this.state.prefs);
    prefs[k] = v;
    this.setState({ prefs: prefs }, () => this.persist());
  }

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

  quizPick(field, value) {
    this.sfx('pick');
    const q = Object.assign({}, this.state.quiz);
    q[field] = value;
    this.setState({ quiz: q });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (q.step >= 2) this.finish(q);
      else this.setState({ quiz: Object.assign({}, q, { step: q.step + 1 }) });
    }, 220);
  }

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

  moveHome(k, dir) {
    const ord = this.state.prefs.homeOrder.slice();
    const i = ord.indexOf(k), j = i + dir;
    if (i < 0 || j < 0 || j >= ord.length) return;
    this.sfx('tap');
    ord[i] = ord[j]; ord[j] = k;
    this.setPref('homeOrder', ord);
  }

  toggleHome(k) {
    this.sfx('tap');
    const h = Object.assign({}, this.state.prefs.homeHidden || {});
    h[k] = !h[k];
    this.setPref('homeHidden', h);
  }

  setPeso(d) {
    this.sfx('tap');
    const p = Math.max(35, Math.min(180, this.peso() + d));
    this.setState({ peso: p }, () => this.persist());
  }

  setMeta(d) {
    this.sfx('tap');
    this.setPref('meta', Math.max(1, Math.min(7, this.state.prefs.meta + d)));
  }

  cyclePlan(i) {
    this.sfx('tap');
    const order = this.planOrder();
    const cur = this.state.plan[i] || null;
    const nx = order[(order.indexOf(cur) + 1) % order.length];
    const plan = Object.assign({}, this.state.plan);
    if (nx) plan[i] = nx; else delete plan[i];
    this.setState({ plan: plan }, () => this.persist());
  }

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

  /* ---------- hábitos (Hábitos Atómicos: señal clara, empezar pequeño, nunca fallar dos veces) ---------- */

  habitCatalog() {
    return [
      { id: 'entreno', name: 'Entrenar', kind: 'auto', color: 'fuerza', def: true,
        icon: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
        desc: 'Se marca solo al terminar tu sesión del día.',
        cue: 'Cuando llego a casa, me pongo la ropa de entrenar', mini: 'Hacer solo el calentamiento de 8 min' },
      { id: 'agua', name: 'Agua', kind: 'num', unit: 'vasos', step: 1, max: 30, color: 'resistencia', def: true,
        icon: 'M12 3c3.5 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.4 12 3z',
        desc: 'Vasos de 250 ml. La meta sale de tu peso y sube los días de entrenamiento.',
        cue: 'Después de cada comida, tomo un vaso de agua', mini: 'Un vaso grande al despertar' },
      { id: 'sueno', name: 'Sueño', kind: 'num', unit: 'h', goal: 8, step: 0.5, min: 6, max: 10, color: 'tecnica', def: true,
        icon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
        desc: 'Horas que dormiste anoche. Los adultos necesitan 7 a 9.',
        cue: 'A las 22:30 dejo el celular cargando fuera de la pieza', mini: 'Acostarme 15 min antes' },
      { id: 'lectura', name: 'Lectura', kind: 'num', unit: 'min', goal: 20, step: 5, min: 5, max: 120, color: 'heat', def: true,
        icon: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
        desc: 'Minutos de lectura de libros, no redes.',
        cue: 'Después de lavarme los dientes en la noche, leo en la cama', mini: 'Leer una página' },
      { id: 'pasos', name: 'Pasos', kind: 'num', unit: 'mil pasos', step: 1, goal: 8, min: 3, max: 20, color: 'constancia', def: true,
        icon: 'M8 14c-1.7 0-3-1.8-3-4.5S6.3 4 8 4s3 2.8 3 5.5S9.7 14 8 14zM6 17h4M16 20c-1.7 0-3-1.8-3-4.5S14.3 10 16 10s3 2.8 3 5.5-1.3 4.5-3 4.5z',
        desc: 'Revisa el número en la app Salud del iPhone.',
        cue: 'Camino al trabajo y de vuelta', mini: 'Una vuelta de 10 min después de almorzar' },
      { id: 'planificar', name: 'Planificar el día', kind: 'bin', color: 'constancia', def: true,
        icon: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
        desc: 'Elegir las 3 tareas más importantes antes de empezar.',
        cue: 'Después del primer café, escribo mis 3 tareas más importantes', mini: 'Anotar una sola prioridad' },
      { id: 'pantallas', name: 'Sin pantallas antes de dormir', kind: 'bin', color: 'tecnica', def: true,
        icon: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM3 3l18 18',
        desc: 'Una hora sin celular ni pantallas antes de acostarte.',
        cue: 'Una hora antes de dormir, pongo el celular a cargar en otra pieza', mini: '15 min sin pantalla' },
      { id: 'proteina', name: 'Meta de proteína', kind: 'food', color: 'fuerza', def: false,
        icon: 'M12 3c4 0 7 6 7 10a7 7 0 0 1-14 0c0-4 3-10 7-10z',
        desc: 'Se marca sola con lo que registras en Comida.',
        cue: 'En cada comida, me sirvo primero la proteína', mini: 'Una porción en el desayuno' },
      { id: 'meditar', name: 'Meditar o respirar', kind: 'num', unit: 'min', step: 5, goal: 10, min: 5, max: 60, color: 'resistencia', def: false,
        icon: 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7',
        desc: 'Calma la mente y baja el estrés.',
        cue: 'Después de levantarme, me siento y respiro antes de mirar el celular', mini: 'Tres respiraciones profundas' },
      { id: 'luz', name: 'Luz solar en la mañana', kind: 'bin', color: 'heat', def: false,
        icon: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
        desc: '10 minutos de luz natural antes de las 10 ordenan tu reloj interno.',
        cue: 'Después de vestirme, salgo 10 min afuera antes de entrar al trabajo', mini: 'Abrir la cortina y asomarme 2 min' },
      { id: 'habilidad', name: 'Practicar una habilidad', kind: 'num', unit: 'min', step: 5, goal: 30, min: 5, max: 180, color: 'constancia', def: false,
        icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
        desc: 'Diseño, código, un idioma: práctica deliberada cada día.',
        cue: 'Después de cenar, practico en el escritorio con el celular lejos', mini: 'Abrir el proyecto 5 min' },
      { id: 'diario', name: 'Diario o gratitud', kind: 'bin', color: 'tecnica', def: false,
        icon: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
        desc: 'Anotar 3 cosas buenas del día o lo que aprendiste.',
        cue: 'Antes de apagar la luz, escribo 3 cosas buenas del día', mini: 'Escribir una línea' }
    ];
  }

  habitCfg() {
    const p = this.state.prefs;
    const hp = p.habits || {};
    const on = hp.on || this.habitCatalog().filter((h) => h.def).map((h) => h.id);
    return { on: on, goals: hp.goals || {}, cues: hp.cues || {}, minis: hp.minis || {} };
  }

  setHabitCfg(patch) {
    const cfg = this.habitCfg();
    this.setPref('habits', Object.assign({ on: cfg.on, goals: cfg.goals, cues: cfg.cues, minis: cfg.minis }, patch));
  }

  waterGoal(date) {
    // ~30 ml por kg al día en bebidas (los 3,7 L de referencia para hombres incluyen comida) + 500 ml si entrenas.
    const base = Math.max(8, Math.round((this.peso() * 30) / 250));
    const r = this.routineAt((date.getDay() + 6) % 7);
    return base + (r && r.id !== 'caminata' ? 2 : 0);
  }

  habitGoal(h, date) {
    if (h.id === 'agua') return this.habitCfg().goals.agua || this.waterGoal(date);
    return this.habitCfg().goals[h.id] || h.goal || 1;
  }

  // fracción cumplida de un hábito en un día: null = no aplica (descanso), 0..1
  habitFrac(h, key, date) {
    const st = this.state;
    if (h.kind === 'auto') {
      const r = this.routineAt((date.getDay() + 6) % 7);
      const e = st.log[key];
      if (e && e.status === 'done') return 1;
      if (!r || r.id === 'caminata') return null;
      return 0;
    }
    if (h.kind === 'food') { const t = this.targets().prot; return Math.min(1, this.dayTotals(key).p / t); }
    const d = (st.hlog || {})[key] || {};
    const mini = !!d[h.id + '~'];
    let f = h.kind === 'bin' ? (d[h.id] ? 1 : 0) : Math.min(1, (d[h.id] || 0) / this.habitGoal(h, date));
    if (mini && f < 0.5) f = 0.5;
    return f;
  }

  habitMet(h, key, date) {
    const f = this.habitFrac(h, key, date);
    if (f === null) return null;
    const d = ((this.state.hlog || {})[key] || {});
    return f >= 1 || !!d[h.id + '~'];
  }

  dayScore(key, date) {
    const cfg = this.habitCfg();
    const list = this.habitCatalog().filter((h) => cfg.on.indexOf(h.id) >= 0);
    let n = 0, sum = 0;
    list.forEach((h) => { const f = this.habitFrac(h, key, date); if (f !== null) { n++; sum += f; } });
    return n ? sum / n : null;
  }

  habitStreak(h, today0) {
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() - i);
      const m = this.habitMet(h, this.keyOf(d), d);
      if (m === null) continue;
      if (m) streak++;
      else if (i === 0) continue;
      else break;
    }
    return streak;
  }

  setHabit(key, id, v) {
    const hl = Object.assign({}, this.state.hlog || {});
    hl[key] = Object.assign({}, hl[key] || {});
    if (v === null || v === 0 || v === false) delete hl[key][id]; else hl[key][id] = v;
    this.setState({ hlog: hl }, () => this.persist());
  }

  habitDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (this.state.hday || 0));
  }

  fmtNum(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }

  habitValueLabel(h, v, goal) {
    if (h.kind === 'bin') return v ? 'Hecho' : 'Pendiente';
    if (h.id === 'pasos') return this.fmtNum(v) + ' de ' + goal + ' mil pasos';
    return this.fmtNum(v) + ' de ' + this.fmtNum(goal) + ' ' + h.unit;
  }

  habitsVals(th, c, dark, primary, onPrimary) {
    const st = this.state;
    const cfg = this.habitCfg();
    const date = this.habitDate();
    const key = this.keyOf(date);
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = (st.hday || 0) === 0;
    const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    const ykey = this.keyOf(yesterday);
    const d = (st.hlog || {})[key] || {};
    const cat = this.habitCatalog();
    const tint = (k) => c[k] + (dark ? '33' : '24');
    const items = [];
    let done = 0, total = 0;
    cat.filter((h) => cfg.on.indexOf(h.id) >= 0).forEach((h) => {
      const f = this.habitFrac(h, key, date);
      if (f === null) return;
      total++;
      const met = f >= 1;
      if (met) done++;
      if (h.id === 'agua') return;
      const goal = this.habitGoal(h, date);
      const v = d[h.id] || 0;
      const ym = this.habitMet(h, ykey, yesterday);
      const mini = !!d[h.id + '~'];
      const streak = this.habitStreak(h, date);
      const atRisk = ym === false && ykey >= (st.since || key) && !met && !mini;
      const step = h.step || 1;
      let status;
      if (h.kind === 'auto') status = met ? 'Sesión completada' : 'Toca entrenar hoy';
      else if (h.kind === 'food') status = Math.round(this.dayTotals(key).p) + ' de ' + this.targets().prot + ' g';
      else status = this.habitValueLabel(h, v, goal);
      if (mini && !met) status += ', versión mínima';
      items.push({
        id: h.id, name: h.name, icon: h.icon, color: c[h.color], tint: tint(h.color),
        status: status, streakTxt: streak > 1 ? streak + ' días seguidos' : '',
        hasStreak: false, streak: streak, hasBar: h.kind === 'num' || h.kind === 'food',
        isBin: h.kind === 'bin', isNum: h.kind === 'num', isAuto: h.kind === 'auto' || h.kind === 'food',
        met: met, notMet: !met,
        checkBg: met ? th.inv : th.fill, checkFg: met ? th.onInv : th.tertiary,
        pct: Math.round(Math.min(1, f) * 100), barColor: c[h.color],
        cue: cfg.cues[h.id] || h.cue, mini: cfg.minis[h.id] || h.mini,
        atRisk: atRisk,
        line: items.length ? ('inset 0 0.5px 0 ' + th.sep) : 'none',
        toggle: () => { this.sfx(d[h.id] ? 'tap' : 'pick'); this.setHabit(key, h.id, d[h.id] ? null : true); },
        minus: () => { this.sfx('tap'); this.setHabit(key, h.id, Math.max(0, Math.round((v - step) * 10) / 10)); },
        plus: () => { const nv = v < (h.min || 0) ? h.min : Math.round((v + step) * 10) / 10; this.sfx(nv >= goal && v < goal ? 'pick' : 'tap'); this.setHabit(key, h.id, nv); },
        doMini: () => { this.sfx('pick'); this.setHabit(key, h.id + '~', true); },
        valueShort: h.kind === 'num' ? this.fmtNum(v) : ''
      });
    });
    // agua
    const wOn = cfg.on.indexOf('agua') >= 0;
    const wGoal = this.habitGoal({ id: 'agua' }, date);
    const w = d.agua || 0;
    const glasses = [];
    for (let i = 1; i <= Math.max(wGoal, w); i++) {
      const full = i <= w;
      glasses.push({
        aria: 'Vaso ' + i + (full ? ', tomado' : ''),
        fill: full ? c.resistencia : 'none', stroke: full ? c.resistencia : th.tertiary,
        bg: full ? tint('resistencia') : th.segBg,
        pick: () => { this.sfx(full ? 'tap' : 'pick'); this.setHabit(key, 'agua', i === w ? i - 1 : i); }
      });
    }
    const L = (n) => String(Math.round(n * 0.25 * 100) / 100).replace('.', ',');
    const water = {
      on: wOn, count: w, goal: wGoal, liters: L(w), goalL: L(wGoal), glasses: glasses,
      pct: Math.round(Math.min(1, w / wGoal) * 100), met: w >= wGoal,
      left: w >= wGoal ? 'Meta cumplida' : 'Te faltan ' + (wGoal - w) + (wGoal - w === 1 ? ' vaso' : ' vasos'),
      cue: cfg.cues.agua || cat[1].cue,
      add: () => { this.sfx(w + 1 === wGoal ? 'pick' : 'tap'); this.setHabit(key, 'agua', w + 1); },
      add2: () => { this.sfx(w + 2 >= wGoal && w < wGoal ? 'pick' : 'tap'); this.setHabit(key, 'agua', w + 2); },
      sub: () => { this.sfx('tap'); this.setHabit(key, 'agua', Math.max(0, w - 1)); }
    };
    const score = total ? done / total : 0;
    const names = this.dayNames();
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const left = total - done;
    return {
      dayLabel: isToday ? 'Hoy' : ((st.hday || 0) === -1 ? 'Ayer' : cap(names[(date.getDay() + 6) % 7]) + ' ' + date.getDate()),
      dateLabel: this.longDate(date), isToday: isToday, canNext: !isToday, canPrev: (st.hday || 0) > -6,
      nextOp: isToday ? 0.3 : 1, prevOp: (st.hday || 0) > -6 ? 1 : 0.3,
      done: done, total: total, items: items, water: water,
      ringOff: (238.8 * (1 - score)).toFixed(1),
      title: total ? (done === total ? 'Día completo' : 'Vas al ' + Math.round(score * 100) + ' %') : 'Sin hábitos',
      sub: total ? (left === 0 ? 'Cumpliste todos tus hábitos de hoy.' : 'Te faltan ' + left + (left === 1 ? ' hábito' : ' hábitos') + ' para completar el día.') : 'Elige qué hábitos seguir.',
      hasRisk: items.some((x) => x.atRisk),
      prev: () => { this.sfx('tap'); this.setState({ hday: Math.max(-6, (st.hday || 0) - 1) }); },
      next: () => { this.sfx('tap'); this.setState({ hday: Math.min(0, (st.hday || 0) + 1) }); }
    };
  }

  habitEditorVals(th, c, dark, primary) {
    const cfg = this.habitCfg();
    const today = new Date();
    return this.habitCatalog().map((h, i) => {
      const on = cfg.on.indexOf(h.id) >= 0;
      const hasGoal = h.kind === 'num';
      const goal = hasGoal ? this.habitGoal(h, today) : 0;
      const step = h.step || 1;
      const autoWater = h.id === 'agua' && !cfg.goals.agua;
      return {
        id: h.id, name: h.name, desc: h.desc, icon: h.icon, color: c[h.color], tint: c[h.color] + (dark ? '33' : '24'),
        on: on, track: on ? th.text : th.segBg, knob: on ? 20 : 0,
        line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',
        hasGoal: on && hasGoal, goalLabel: (h.id === 'pasos' ? goal + ' mil' : this.fmtNum(goal) + ' ' + h.unit) + (autoWater ? ' (según tu peso)' : ''),
        showCue: on, cue: cfg.cues[h.id] || h.cue, mini: cfg.minis[h.id] || h.mini,
        cueId: 'cue-' + h.id, miniId: 'mini-' + h.id,
        toggle: () => {
          this.sfx('tap');
          const list = cfg.on.slice();
          const k = list.indexOf(h.id);
          if (k >= 0) list.splice(k, 1); else list.push(h.id);
          this.setHabitCfg({ on: list });
        },
        goalMinus: () => { this.sfx('tap'); const g = Object.assign({}, cfg.goals); g[h.id] = Math.max(h.min || step, Math.round((goal - step) * 10) / 10); this.setHabitCfg({ goals: g }); },
        goalPlus: () => { this.sfx('tap'); const g = Object.assign({}, cfg.goals); g[h.id] = Math.min(h.max || 99, Math.round((goal + step) * 10) / 10); this.setHabitCfg({ goals: g }); },
        setCue: (e) => { const x = Object.assign({}, cfg.cues); x[h.id] = (e.target.value || '').slice(0, 120); this.setHabitCfg({ cues: x }); },
        setMini: (e) => { const x = Object.assign({}, cfg.minis); x[h.id] = (e.target.value || '').slice(0, 80); this.setHabitCfg({ minis: x }); }
      };
    });
  }

  /* ---------- recordatorios (web push) ---------- */

  remDefaults() {
    return {
      manana: { on: true, at: 480 }, agua: { on: true, from: 540, to: 1260, every: 120 },
      entreno: { on: true, at: 1080 }, lectura: { on: true, at: 1290 }, dormir: { on: true, at: 1350 }
    };
  }

  remCfg() { return Object.assign({}, this.remDefaults(), this.state.prefs.rem || {}); }

  setRem(id, patch) {
    const r = this.remCfg();
    r[id] = Object.assign({}, r[id], patch);
    const p = Object.assign({}, this.state.prefs, { rem: r, remDirty: !!this.state.prefs.pushSub });
    this.setState({ prefs: p }, () => { this.persist(); if (this.isNative()) this.nativeSchedule(); });
  }

  hhmm(m) { m = ((m % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }

  pushSupported() {
    if (this.isNative()) return true;
    try { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; } catch (e) { return false; }
  }

  isStandalone() {
    if (this.isNative()) return true;
    try { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; }
  }

  b64u(bytes) {
    let s = '';
    bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  fromB64u(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
  }

  async enablePush() {
    if (this.isNative()) return this.nativeEnable();
    // requestPermission tiene que ser lo primero tras el toque (iOS exige el gesto del usuario)
    let perm = 'default';
    try { perm = await Notification.requestPermission(); } catch (e) {}
    this.sfx('tap');
    if (perm !== 'granted') {
      this.setState({ pushMsg: 'Sin permiso. Actívalo en Ajustes del iPhone, Notificaciones, keystone.' });
      return;
    }
    try {
      let keys = this.state.prefs.pushKeys;
      if (!keys) {
        const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
        const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
        keys = { pub: this.b64u(raw), priv: jwk.d };
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const cur = sub.options && sub.options.applicationServerKey ? this.b64u(new Uint8Array(sub.options.applicationServerKey)) : null;
        if (cur && cur !== keys.pub) { await sub.unsubscribe(); sub = null; }
      }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.fromB64u(keys.pub) });
      const p = Object.assign({}, this.state.prefs, { pushKeys: keys, pushSub: sub.toJSON(), remDirty: true });
      this.setState({ prefs: p, pushMsg: 'Activados en este teléfono. Falta el último paso: copia el código y pégalo en GitHub.' }, () => this.persist());
      this.sfx('yes');
    } catch (e) {
      this.setState({ pushMsg: 'No se pudo activar: ' + (e && e.message ? e.message : 'error desconocido') });
    }
  }

  pushCode() {
    const p = this.state.prefs;
    if (!p.pushSub || !p.pushKeys) return '';
    const r = this.remCfg();
    const days = [];
    for (let i = 0; i < 7; i++) { const rr = this.routineAt(i); if (rr && rr.id !== 'caminata') days.push(i + 1); }
    let tz = 'America/Santiago';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
    const cfg = { v: 1, tz: tz, sub: p.pushSub, pub: p.pushKeys.pub, priv: p.pushKeys.priv, rem: r, days: days };
    const json = JSON.stringify(cfg);
    return this.b64u(new TextEncoder().encode(json));
  }

  copyPushCode() {
    const code = this.pushCode();
    if (!code) return;
    this.sfx('tap');
    const ok = () => {
      const p = Object.assign({}, this.state.prefs, { remDirty: false });
      this.setState({ prefs: p, pushMsg: 'Código copiado. Ábrelo en GitHub y pégalo como el secreto RUTINA_PUSH.', showCode: false }, () => this.persist());
    };
    try {
      navigator.clipboard.writeText(code).then(ok).catch(() => this.setState({ showCode: true, pushMsg: 'Copia el código de abajo manualmente.' }));
    } catch (e) { this.setState({ showCode: true, pushMsg: 'Copia el código de abajo manualmente.' }); }
  }

  remVals(th, c) {
    const st = this.state;
    const r = this.remCfg();
    const supported = this.pushSupported() && this.isStandalone();
    const mk = (id, label, desc, times, cycle) => ({
      id: id, label: label, desc: desc, on: r[id].on, track: r[id].on ? th.text : th.segBg, knob: r[id].on ? 20 : 0,
      toggle: () => { this.sfx('tap'); this.setRem(id, { on: !r[id].on }); },
      times: r[id].on ? times : [], hasCycle: !!cycle && r[id].on, cycle: cycle || { label: '', pick: () => {} },
      line: id === 'manana' ? 'none' : ('inset 0 0.5px 0 ' + th.sep)
    });
    const t = (id, field, label) => ({
      label: label, value: this.hhmm(r[id][field]),
      minus: () => { this.sfx('tap'); const o = {}; o[field] = (r[id][field] - 15 + 1440) % 1440; this.setRem(id, o); },
      plus: () => { this.sfx('tap'); const o = {}; o[field] = (r[id][field] + 15) % 1440; this.setRem(id, o); }
    });
    const everyOpts = [60, 90, 120, 180];
    const ev = r.agua.every;
    const items = [
      mk('manana', 'Buenos días', 'Planificar el día y tomar luz', [t('manana', 'at', 'Hora')]),
      mk('agua', 'Agua', 'Te recuerda tomar un vaso', [t('agua', 'from', 'Desde'), t('agua', 'to', 'Hasta')],
        { label: 'Cada ' + (ev % 60 ? this.fmtNum(ev / 60) + ' h' : (ev / 60) + ' h'), pick: () => { this.sfx('tap'); this.setRem('agua', { every: everyOpts[(everyOpts.indexOf(ev) + 1) % everyOpts.length] }); } }),
      mk('entreno', 'Entrenamiento', 'Solo los días con rutina', [t('entreno', 'at', 'Hora')]),
      mk('lectura', 'Lectura', 'Tu momento de leer', [t('lectura', 'at', 'Hora')]),
      mk('dormir', 'Desconectarse', 'Fuera pantallas, a dormir', [t('dormir', 'at', 'Hora')])
    ];
    const nat = this.isNative();
    const active = !!st.prefs.pushSub && (!nat || !!st.prefs.pushSub.native);
    return {
      supported: supported, unsupported: !supported, items: items,
      active: active && !nat, inactive: !active,
      dirty: active && !nat && !!st.prefs.remDirty,
      hasMsg: !!st.pushMsg, msg: st.pushMsg || '',
      showCode: !!st.showCode && active, code: st.showCode ? this.pushCode() : '',
      ghUrl: 'https://github.com/joshen-am/rutina/settings/secrets/actions/new',
      testUrl: 'https://github.com/joshen-am/rutina/actions/workflows/recordatorios.yml',
      enable: () => this.enablePush(),
      copy: () => this.copyPushCode()
    };
  }


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
      kcal: r0(tot.kcal), goal: this.fmt(T.kcal), left: this.fmt(Math.abs(left)), leftLabel: left >= 0 ? 'restantes' : 'sobre tu meta',
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


  mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    const k = Math.max(0, Math.min(1, t));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }

  heatColor(th, c, dark, t) {
    const soft = dark ? '#C9650C' : '#FFC27A';
    if (t <= 0.5) return this.mix(th.muscleOff, soft, t * 2);
    return this.mix(soft, c.heat, (t - 0.5) * 2);
  }

  isDark() {
    const t = this.state.prefs.tema;
    if (t === 'oscuro') return true;
    if (t === 'claro') return false;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }

  theme(dark) {
    return dark ? {
      bg: '#09090B', card: '#161619', raised: '#1E1E22', menu: '#18181B', text: '#FAFAFA', sub: '#A1A1AA', tertiary: '#5C5C66', sep: '#27272A',
      fill: '#232327', btn2: '#232327', segBg: '#232327', segSel: '#3F3F46', bodyBase: '#26262B', muscleOff: '#3F3F46', barOff: '#3F3F46',
      bar: 'rgba(9, 9, 11, 0.82)', scrim: 'rgba(0, 0, 0, 0.6)', shadow: '0 24px 60px rgba(0, 0, 0, 0.6)', danger: '#F87171',
      inv: '#FAFAFA', onInv: '#09090B', line: 'rgba(255, 255, 255, 0.06)', input: '#232327'
    } : {
      bg: '#FFFFFF', card: '#F6F6F7', raised: '#FFFFFF', menu: '#FFFFFF', text: '#18181B', sub: '#71717A', tertiary: '#A1A1AA', sep: '#E4E4E7',
      fill: '#EBEBED', btn2: '#EBEBED', segBg: '#EBEBED', segSel: '#FFFFFF', bodyBase: '#E4E4E7', muscleOff: '#D4D4D8', barOff: '#D4D4D8',
      bar: 'rgba(255, 255, 255, 0.84)', scrim: 'rgba(9, 9, 11, 0.32)', shadow: '0 24px 60px rgba(9, 9, 11, 0.16)', danger: '#DC2626',
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
          ready: this.readyText(Math.round((RH[m.name] || 48) * TI * (0.6 + 0.4 * Math.min(1, m.w)) * 0.66)),
          line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none'
        }))
      },
      vb: vb
    };
  }

  quizVals(primary, onPrimary, th) {
    const q = this.state.quiz;
    const r = this.routineAt(this.selIdx()) || this.routinesById().superiorA;
    let title, hint, opts, isGrid = false;
    if (q.step === 0) {
      title = '¿Cuánto duró?';
      hint = 'La rutina está pensada para unos ' + r.minutes + ' minutos.';
      isGrid = true;
      opts = [30, 45, 60, 75, 90, 120].map((m) => {
        const sel = q.minutes === m;
        return { label: String(m), sub: 'min', selected: sel, bg: sel ? primary : th.card, fg: sel ? onPrimary : th.text, subFg: sel ? onPrimary : th.sub, pick: () => this.quizPick('minutes', m) };
      });
    } else if (q.step === 1) {
      title = '¿Qué tan intensa fue?';
      hint = q.fromSession ? 'Entrenaste ' + q.minutes + ' minutos. La intensidad ajusta la energía estimada y tu recuperación.' : 'Ajusta la energía estimada y tu recuperación.';
      const I = this.intensities();
      opts = Object.keys(I).map((k, i) => ({ label: I[k].label, sub: I[k].sub, selected: q.intensity === k, pick: () => this.quizPick('intensity', k), i: i }));
    } else {
      title = '¿Cuántas series completaste?';
      hint = q.fromSession && q.setsTotal ? 'Marcaste ' + q.setsDone + ' de ' + q.setsTotal + ' series en la sesión. Confirma o ajusta.' : 'Define cuánto trabajó cada músculo.';
      opts = this.seriesOpts().map((o, i) => ({ label: o.label, sub: o.sub, selected: q.series === o.v, pick: () => this.quizPick('series', o.v), i: i }));
    }
    if (!isGrid) {
      opts = opts.map((o) => Object.assign(o, {
        line: o.i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',
        bg: o.selected ? primary : th.card, fg: o.selected ? onPrimary : th.text, subFg: o.selected ? onPrimary : th.sub,
        dotBg: o.selected ? primary : 'transparent',
        dotRing: o.selected ? 'none' : ('inset 0 0 0 1.5px ' + th.tertiary)
      }));
    }
    return {
      num: q.step + 1, title: title, hint: hint, opts: opts, isGrid: isGrid, isList: !isGrid,
      s0: q.step === 0, s1: q.step === 1, s2: q.step === 2,
      bars: [0, 1, 2].map((i) => ({ bg: i <= q.step ? primary : th.fill }))
    };
  }

  renderVals() {
    const st = this.state;
    const n = this.nav();
    const dark = this.isDark();
    const th = this.theme(dark);
    const c = this.colors(dark);
    /* salud primero: su nota tiñe los halos y el acento de toda la app */
    const hv = this.healthVals(th, c, dark);
    hv.noop = () => {};
    const hcol = hv.has ? this.healthColor(hv.overallN, true) : null;
    if (hv.has) { c.accent = this.healthColor(hv.overallN, dark); c.accentText = c.accent; }
    const halo = this.haloCss(hcol);
    /* el orbe de la marca toma el color de tu nota */
    const orb = (() => {
      if (!hv.has) return { k: 'plata', c1: '#1FD38A', c2: '#18C2D8', c3: '#B6F05A', c4: '#2C7BFF', bg: '#0D2A22', glow: 'rgba(31, 211, 138, 0.35)' };
      const x = Math.max(0, Math.min(100, hv.overallN)) / 100, h = 2 + 140 * Math.pow(x, 1.05);
      const H = (d) => (h + d + 360) % 360;
      const c1 = this.hsl(H(0), 74, 50);
      const n = parseInt(c1.slice(1), 16);
      return { k: 's' + Math.min(5, 1 + Math.floor(Math.max(0, Math.min(99.9, hv.overallN)) / 20)), c1: c1, c2: this.hsl(H(26), 78, 52), c3: this.hsl(H(14), 88, 68), c4: this.hsl(H(-20), 70, 46), bg: this.hsl(H(0), 55, 11),
        glow: 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', 0.35)' };
    })();
    const tint = {};
    ['fuerza', 'resistencia', 'constancia', 'tecnica', 'heat'].forEach((k) => { tint[k] = c[k] + (dark ? '2E' : '1F'); });
    const primary = th.inv, onPrimary = th.onInv;
    const fx = this.fxOn();
    const F = this.fonts();

    const days = this.week();
    const ti = this.todayIdx();
    const si = this.selIdx();
    const names = this.dayNames();
    const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const dayVm = days.map((d, i) => {
      const e = st.log[this.keyOf(d)];
      const r = this.routineAt(i);
      const done = !!(e && e.status === 'done');
      const missed = !!(e && e.status === 'missed');
      const selected = i === si;
      let aria = cap(names[i]) + ' ' + d.getDate() + (r ? ', ' + r.name : ', descanso');
      if (done) aria += ', completada';
      if (missed) aria += ', no completada';
      return {
        letter: letters[i], num: d.getDate(), aria: aria, selected: selected,
        isDone: done, isMissed: missed, isPlanned: !!r && !done && !missed,
        bg: selected ? th.inv : th.card, fg: selected ? th.onInv : th.text, sub: selected ? th.onInv : th.sub,
        mark: selected ? th.onInv : c.accent,
        ring: (i === ti && !selected) ? ('inset 0 0 0 1.5px ' + th.text) : 'none',
        pick: () => { this.sfx('tap'); this.go({ sel: i, screen: 'inicio' }); }
      };
    });
    const weekDone = days.filter((d) => st.log[this.keyOf(d)] && st.log[this.keyOf(d)].status === 'done').length;
    const meta = st.prefs.meta;

    const sd = days[si];
    const r0 = this.routineAt(si);
    const entry = st.log[this.keyOf(sd)];
    const isDone = !!(r0 && entry && entry.status === 'done');
    const isMissed = !!(r0 && entry && entry.status === 'missed');
    const isFuture = !!r0 && si > ti && !isDone && !isMissed;
    const r = r0 ? Object.assign({}, r0, {
      note: r0.exercises.length + ' ejercicios, unos ' + r0.minutes + ' minutos. ' + (r0.note || ''),
      exercises: r0.exercises.map((e, i) => ({ n: (i < 9 ? '0' : '') + (i + 1), name: e.name, sub: e.rest ? e.sets + ' · descanso ' + e.rest : e.sets }))
    }) : { name: '', title: '', minutes: 0, note: '', exercises: [] };
    const rc = r0 || this.routinesById().superiorA;

    /* recuperación */
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fat = this.fatigue(st);
    const regionLoad = {};
    this.regionKeys().forEach((k) => { regionLoad[k] = 0; });
    Object.keys(fat).forEach((mn) => { if (fat[mn].load >= 0.05) this.regionsOf(mn).forEach((k) => { regionLoad[k] = Math.max(regionLoad[k], fat[mn].load); }); });
    const hb = {};
    Object.keys(regionLoad).forEach((k) => { hb[k] = this.heatColor(th, c, dark, regionLoad[k]); });
    const top = Object.keys(fat).filter((k) => fat[k].load >= 0.12).sort((a, b) => fat[b].hours - fat[a].hours).map((k) => ({
      name: k, pct: Math.round(fat[k].load * 100), ready: this.readyText(fat[k].hours)
    }));

    /* historial tipo GitHub */
    const mon = this.mondayOf(now);
    const HW = 17;
    const sinceD = st.since ? this.dateOf(st.since) : today0;
    const startMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * (HW - 1));
    const mshort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const items = [];
    const dayCol = (f) => (f <= 0 ? this.mix(th.fill, this.healthColor(0, dark), dark ? 0.42 : 0.3) : this.mix(th.fill, this.healthColor(f * 100, dark), 0.42 + 0.58 * f));
    let hFull = 0, hAny = 0, prevMonth = -1;
    for (let w = 0; w < HW; w++) {
      const col = new Date(startMon.getFullYear(), startMon.getMonth(), startMon.getDate() + 7 * w);
      const mo = col.getMonth();
      items.push({ isLabel: true, isCell: false, text: mo !== prevMonth && (w > 0 || col.getDate() <= 21) ? mshort[mo] : '' });
      prevMonth = mo;
      for (let d = 0; d < 7; d++) {
        const day = new Date(col.getFullYear(), col.getMonth(), col.getDate() + d);
        const isToday = day.getTime() === today0.getTime();
        let bg = th.fill, ring = 'none';
        if (day > today0) { bg = 'transparent'; ring = 'inset 0 0 0 1px ' + th.sep; }
        else if (day >= sinceD) {
          const sc = this.dayScore(this.keyOf(day), day);
          if (sc !== null && !(isToday && sc === 0)) { bg = dayCol(sc); if (sc > 0) hAny++; if (sc >= 1) hFull++; }
        }
        if (isToday) ring = 'inset 0 0 0 1.5px ' + th.text;
        items.push({ isLabel: false, isCell: true, bg: bg, ring: ring });
      }
    }
    const hist = {
      weeks: HW, items: items,
      scale: [0, 0.25, 0.5, 0.75, 1].map((k) => ({ bg: dayCol(k) })),
      summary: hFull + (hFull === 1 ? ' día completo' : ' días completos'),
      aria: 'Historial de las últimas ' + HW + ' semanas'
    };

    /* cuerpo 3D: carga por región (0..1) */
    const R3 = {};
    Object.keys(regionLoad).forEach((k) => { if (regionLoad[k] >= 0.05) R3[k] = Math.round(regionLoad[k] * 100) / 100; });
    const b3 = { rec: JSON.stringify(R3), dark: dark ? '1' : '0', fallback: dark ? 'img/body-dark.png' : 'img/body-light.png', sum: '{}' };

    /* resumen de sesión */
    const summary = st.last || Object.assign(this.buildSummary(rc, { minutes: rc.minutes, intensity: 'dura', series: 0.8, setsDone: 22, setsTotal: 26 }, sd), { weekDone: weekDone, meta: meta });
    const vv = this.summaryVals(summary, st.t, th, c, dark);
    const S3 = {};
    summary.muscles.forEach((mu) => { this.regionsOf(mu.name).forEach((k) => { S3[k] = Math.max(S3[k] || 0, Math.round(Math.min(1, mu.w) * 100) / 100); }); });
    b3.sum = JSON.stringify(S3);

    /* orden de inicio */
    const edit = !!st.editHome;
    const HL = { salud: 'Perfil de salud', hist: 'Historial', habitos: 'Hábitos de hoy', comida: 'Comida de hoy', agua: 'Agua', recup: 'Recuperación muscular', semana: 'Días de la semana', rutina: 'Rutina del día' };
    const ordH = st.prefs.homeOrder;
    const hidH = st.prefs.homeHidden || {};
    const ho = { pad: edit ? '10px' : '0', frame: edit ? ('inset 0 0 0 1px ' + th.sep) : 'none', pe: edit ? 'none' : 'auto', maxH: edit ? '132px' : 'none', ov: edit ? 'hidden' : 'visible' };
    ordH.forEach((k, idx) => {
      const hidden = !!hidH[k];
      ho[k] = {
        label: HL[k], order: idx + 1, hidden: hidden,
        display: hidden && !edit ? 'none' : 'block', opacity: hidden && edit ? 0.35 : 1,
        upOp: idx === 0 ? 0.35 : 1, downOp: idx === ordH.length - 1 ? 0.35 : 1,
        toggleLabel: hidden ? 'Mostrar' : 'Ocultar',
        up: () => this.moveHome(k, -1), down: () => this.moveHome(k, 1), toggle: () => this.toggleHome(k)
      };
    });

    const hdv = this.habitsVals(th, c, dark, primary, onPrimary);
    const score = hdv.total ? hdv.done / hdv.total : 0;
    hdv.ringOff52 = (138.2 * (1 - score)).toFixed(1);
    hdv.ringOff84 = (226.2 * (1 - score)).toFixed(1);

    /* comida e inicio de comida */
    const fdv = this.foodVals(th, c, dark);
    fdv.textOp = fdv.canText ? 1 : 0.4;
    const T = this.targets();
    const tk = this.keyOf(today0);
    const tt = this.dayTotals(tk);
    const pc = (v, g) => Math.round(Math.min(1, g ? v / g : 0) * 1000) / 10;
    const fh = {
      kcal: this.fmt(tt.kcal), goal: this.fmt(T.kcal),
      macros: [['Proteína', tt.p, T.prot, c.prot], ['Carbos', tt.c, T.carb, c.carb], ['Grasa', tt.f, T.fat, c.fat], ['Fibra', tt.fib, T.fib, c.fib]].map((m) => ({ label: m[0], val: Math.round(m[1]), goal: m[2], pct: pc(m[1], m[2]), color: m[3] })),
      add: () => { this.go({ tab: 'comida', screen: 'inicio', menu: false, fday: 0 }); this.openFoodAdd(this.mealNow()); }
    };


    /* sesión */
    const sesForView = st.sess || { rid: rc.id, date: '', i: 9, sets: { 9: 1 }, start: Date.now() - 754000, restEnd: null, restTotal: 0 };
    const ss = this.sessionVals(sesForView, th, c, dark, th.inv, th.onInv, fx);
    const sesToday = st.sess && r0 && st.sess.rid === r0.id && st.sess.date === this.keyOf(sd);

    /* IA */
    const ai = this.aiCfg();
    const isG = ai.provider !== 'claude';
    const aiv = {
      key: ai.key, model: ai.model,
      status: ai.key ? 'Conectada' : 'Sin conectar', stColor: ai.key ? c.constanciaText : th.sub,
      ph: isG ? 'Pega tu clave de Google AI Studio' : 'Pega tu clave de Anthropic (sk-ant-…)',
      modelPh: isG ? 'gemini-flash-latest' : 'claude-haiku-5-5',
      url: isG ? 'https://aistudio.google.com/apikey' : 'https://console.anthropic.com/settings/keys',
      help: isG ? 'Gemini tiene un plan gratis: crea una clave en Google AI Studio y pégala aquí. En el plan gratis Google puede usar las fotos para mejorar sus modelos.' : 'Claude cobra por uso (menos de un peso por foto) y no usa tus datos para entrenar. Crea una clave en la consola de Anthropic.',
      provs: [['gemini', 'Gemini · gratis'], ['claude', 'Claude']].map((p) => {
        const sel = (ai.provider || 'gemini') === p[0];
        return { label: p[1], selected: sel, bg: sel ? th.segSel : 'transparent', weight: sel ? 500 : 400, shadow: sel && !dark ? '0 1px 3px rgba(9, 9, 11, 0.12)' : 'none', pick: () => { this.sfx('tap'); this.setAi({ provider: p[0], model: '' }); this.setState({ aiMsg: '' }); } };
      }),
      setKey: (e) => { this.setAi({ key: ((e && e.target ? e.target.value : '') || '').trim() }); },
      setModel: (e) => { this.setAi({ model: ((e && e.target ? e.target.value : '') || '').trim() }); },
      testLabel: st.aiBusy ? 'Probando…' : 'Probar conexión',
      test: () => this.aiTest(),
      hasMsg: !!st.aiMsg, msg: st.aiMsg || '', msgColor: st.aiOk ? c.constanciaText : c.heatText
    };

    /* pestañas */
    const tabC = {}, tabW = {}, tabGo = {}, tabCur = {};
    ['inicio', 'habitos', 'comida', 'salud', 'ajustes'].forEach((k) => {
      const on = n.tab === k;
      tabC[k] = on ? th.text : th.tertiary;
      tabW[k] = on ? 2 : 1.6;
      tabCur[k] = on ? 'page' : null;
      tabGo[k] = () => { this.sfx('tap'); this.go({ tab: k, screen: 'inicio', menu: false, area: null }); };
    });
    const main = n.screen === 'inicio' || n.screen === 'confirmar' || n.screen === 'area';
    const temas = [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['auto', 'Auto']];
    const hr = now.getHours();
    const nombre = (st.prefs.nombre || '').trim().split(' ')[0];
    const greet = (hr < 5 ? 'Buenas noches' : hr < 12 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches') + (nombre ? ', ' + nombre : '');
    const m = this.metrics(st);

    return {
      th: th, c: c, tint: tint, primary: primary, onPrimary: onPrimary, primaryText: th.text,
      font: F.sans, mono: F.mono, orb: orb, halo: halo, haloEval: this.haloCss(null, 135), b3: b3,
      prefs: st.prefs, initial: (st.prefs.nombre || '?').trim().charAt(0).toUpperCase() || '?',
      greeting: greet, menuSub: hv.has ? 'Salud ' + hv.overall + ' · ' + hv.gLabel.toLowerCase() : 'Sin evaluación de salud',

      showInicio: main && n.tab === 'inicio',
      showComida: main && n.tab === 'comida',
      showSalud: main && n.tab === 'salud',
      showAjustes: main && n.tab === 'ajustes',
      showHabitos: main && n.tab === 'habitos' && !st.habEdit,
      isHabEditor: main && n.tab === 'habitos' && !!st.habEdit,
      isArea: n.screen === 'area' && !!hv.detail,
      isEval: n.screen === 'eval',
      ev: n.screen === 'eval' ? this.evalVals(th, c) : {},
      hd: hdv, he: this.habitEditorVals(th, c, dark, primary), rm: this.remVals(th, c),
      fd: fdv, fh: fh, hs: hv, hv: hv, ai: aiv,
      openHabEditor: () => { this.sfx('open'); this.go({ habEdit: true, tab: 'habitos', screen: 'inicio', menu: false }); },
      closeHabEditor: () => { this.sfx('tap'); this.setState({ habEdit: false }); },
      goHabitos: () => { this.sfx('tap'); this.go({ tab: 'habitos', screen: 'inicio', menu: false, hday: 0 }); },
      goComida: () => { this.sfx('tap'); this.go({ tab: 'comida', screen: 'inicio', menu: false, fday: 0 }); },
      goSalud: () => { this.sfx('tap'); this.go({ tab: 'salud', screen: 'inicio', menu: false, area: null }); },
      goAiSettings: () => { this.sfx('tap'); this.go({ tab: 'ajustes', screen: 'inicio', menu: false }, () => { try { const el = document.getElementById('ia'); const sc = el && el.closest('.scroll'); const t = el && el.firstElementChild; if (sc && t) sc.scrollTop = t.offsetTop - 70; } catch (e) {} }); },
      closeArea: () => { this.sfx('tap'); this.go({ screen: 'inicio', area: null }); },
      showTabs: (main && n.screen !== 'area') && !st.habEdit,
      menuOpen: main && n.menu,
      isConfirm: n.screen === 'confirmar',
      isTest: n.screen === 'test',
      isVictory: n.screen === 'victoria',
      isSesion: n.screen === 'sesion',
      ss: ss, hasSess: !!sesToday,
      startLabel: sesToday ? 'Continuar sesión, paso ' + (st.sess.i + 1) : 'Iniciar sesión',

      dateLabel: this.longDate(sd),
      selName: names[si],
      days: dayVm,
      hasRoutine: !!r0, isRest: !r0, isDone: isDone, isMissed: isMissed, isFuture: isFuture,
      missedLabel: entry && entry.optional ? 'NO LA HICISTE' : 'NO COMPLETADA',
      canFinish: !!r0 && !isDone && !isMissed && !isFuture,
      showBarNow: !!r0 && !edit,
      editHome: edit, ho: ho, editLabel: edit ? 'Listo' : 'Ordenar inicio',
      toggleEdit: () => { this.sfx('tap'); this.go({ editHome: !edit }); },
      editFromSettings: () => { this.sfx('tap'); this.go({ editHome: true, tab: 'inicio', screen: 'inicio', menu: false }); },
      r: r, rc: rc, rcTitle: rc.title,

      hb: hb, hist: hist,
      rec: {
        has: top.length > 0, none: top.length === 0, top: top.slice(0, 4),
        summary: top.length ? (top.length === 1 ? '1 recuperándose' : top.length + ' recuperándose') : 'Todo recuperado'
      },
      persistLabel: st.persisted ? 'Protegido' : 'Activo',
      backupLabel: st.prefs.lastBackup ? this.agoText(st.prefs.lastBackup) : 'Nunca',
      hasBackupMsg: !!st.backupMsg, backupMsg: st.backupMsg || '',
      showBackupNudge: m.sessions >= 3 && Date.now() - (st.prefs.lastBackup || 0) > 14 * 864e5 && Date.now() > (st.prefs.backupSnooze || 0),
      exportBackup: () => this.exportBackup(),
      importBackup: (e) => this.importBackup(e),
      snoozeBackup: () => { this.sfx('tap'); this.setPref('backupSnooze', Date.now() + 7 * 864e5); },

      q: this.quizVals(th.inv, th.onInv, th),
      pesoActual: String(this.peso()).replace('.', ','),
      v: vv.v, vb: vv.vb,
      evalLabel: hv.has ? 'Hecha ' + hv.evalAgo : 'Pendiente',

      temaOpts: temas.map((x) => {
        const sel = st.prefs.tema === x[0];
        return { label: x[1], selected: sel, bg: sel ? th.segSel : 'transparent', weight: sel ? 500 : 400, shadow: sel && !dark ? '0 1px 3px rgba(9, 9, 11, 0.12)' : 'none', pick: () => { this.sfx('tap'); this.setPref('tema', x[0]); } };
      }),
      brand: { ink: th.text, st: th.text, l1: th.text, l2: c.accent },

      planRows: [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const rr = this.routineAt(i);
        return {
          day: cap(names[i]), value: rr ? rr.name : 'Descanso', color: rr ? th.text : th.sub,
          aria: cap(names[i]) + ': ' + (rr ? rr.name : 'descanso') + '. Toca para cambiar',
          pick: () => this.cyclePlan(i)
        };
      }),
      fxTrack: fx ? th.text : th.segBg, fxKnob: fx ? 20 : 0,
      sndTrack: this.sndOn() ? th.text : th.segBg, sndKnob: this.sndOn() ? 20 : 0,
      resetLabel: st.resetArmed ? 'Toca otra vez para borrar todo' : 'Borrar historial',
      resetWeight: st.resetArmed ? 500 : 400,

      tabC: tabC, tabW: tabW, tabGo: tabGo, tabCur: tabCur,

      openMenu: () => { this.sfx('open'); this.go({ menu: true, screen: 'inicio' }); },
      closeMenu: () => this.go({ menu: false }),
      goAjustes: () => { this.sfx('tap'); this.go({ tab: 'ajustes', menu: false, screen: 'inicio' }); },
      startSession: () => this.startSession(),
      discardSession: () => this.discardSession(),
      sesClose: () => { this.sfx('tap'); this.go({ screen: 'inicio' }); },
      sesNext: () => this.sesNext(),
      sesPrev: () => this.sesPrev(),
      restAdd: () => this.restAdd(),
      restSkip: () => this.restSkip(),
      openConfirm: () => { this.sfx('open'); this.go({ screen: 'confirmar', menu: false }); },
      closeConfirm: () => this.go({ screen: 'inicio' }),
      answerYes: () => this.answerYes(),
      answerNo: () => this.answerNo(),
      quizBack: () => {
        this.sfx('tap');
        const q = st.quiz;
        if (q.step === 1 && q.fromSession) { this.go({ screen: 'sesion' }); return; }
        if (q.step > 0) this.setState({ quiz: Object.assign({}, q, { step: q.step - 1 }) });
        else this.go({ screen: 'confirmar' });
      },
      quizSkip: () => this.finish({ minutes: (st.quiz && st.quiz.minutes) || rc.minutes, intensity: 'moderada', series: (st.quiz && st.quiz.series) || 1, setsDone: st.quiz && st.quiz.setsDone, setsTotal: st.quiz && st.quiz.setsTotal }),
      pesoMenos: () => this.setPeso(-1),
      pesoMas: () => this.setPeso(1),
      metaMenos: () => this.setMeta(-1),
      metaMas: () => this.setMeta(1),
      setNombre: (e) => this.setPref('nombre', (e && e.target ? e.target.value : '').slice(0, 24)),
      toggleFx: () => { this.sfx('tap'); this.setPref('efectos', !fx); },
      toggleSnd: () => {
        const on = !this.sndOn();
        this.setPref('sonido', on);
        if (on) setTimeout(() => this.sfx('yes'), 30);
      },
      resetAll: () => this.resetAll(),
      showSummary: () => { if (entry && entry.summary) this.go({ last: Object.assign({ weekDone: weekDone, meta: meta }, entry.summary), screen: 'victoria' }, () => this.startAnim()); },
      goHome: () => { this.sfx('tap'); this.go({ screen: 'inicio', tab: 'inicio' }); }
    };
  }

  async aiTest() {
    const cfg = this.aiCfg();
    if (!cfg.key) { this.setState({ aiMsg: 'Primero pega tu clave.', aiOk: false }); return; }
    this.sfx('tap');
    this.setState({ aiBusy: true, aiMsg: '' });
    try {
      const j = await this.aiJSON('Responde solo este JSON: {"ok":true}', null);
      this.setState({ aiBusy: false, aiOk: !!j.ok, aiMsg: j.ok ? 'Conexión lista. Ya puedes analizar tus comidas.' : 'La IA respondió algo inesperado, pero hay conexión.' });
      this.sfx('done');
    } catch (e) {
      this.setState({ aiBusy: false, aiOk: false, aiMsg: this.aiErrorText(e) });
    }
  }

  /* ---------- app nativa (iOS con Capacitor): recordatorios locales ---------- */

  isNative() {
    try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; }
  }

  ln() {
    if (this._ln === undefined) { try { this._ln = window.Capacitor.registerPlugin('LocalNotifications'); } catch (e) { this._ln = null; } }
    return this._ln;
  }

  async nativeEnable() {
    const L = this.ln();
    if (!L) { this.setState({ pushMsg: 'Esta versión de la app no trae notificaciones. Reinstálala desde Xcode.' }); return; }
    let perm = null;
    try { perm = await L.requestPermissions(); } catch (e) {}
    this.sfx('tap');
    if (!perm || perm.display !== 'granted') { this.setState({ pushMsg: 'Sin permiso. Actívalo en Ajustes del iPhone, Notificaciones, keystone.' }); return; }
    const p = Object.assign({}, this.state.prefs, { pushSub: { native: true }, remDirty: false });
    this.setState({ prefs: p }, () => { this.persist(); this.nativeSchedule(true); });
    this.sfx('yes');
  }

  async nativeSchedule(announce) {
    const L = this.ln();
    const sub = this.state.prefs.pushSub;
    if (!L || !this.isNative() || !sub || !sub.native) return;
    const MSG = {
      manana: ['Buenos días', 'Elige tus 3 tareas más importantes y sal 10 minutos a la luz.'],
      agua: ['Hora de un vaso de agua', 'Abre la app y súmalo a tu día.'],
      entreno: ['Hoy toca entrenar', 'Abre la app y toca Iniciar sesión.'],
      lectura: ['Tu momento de lectura', 'Aunque sea una página, cuenta.'],
      dormir: ['Hora de desconectarte', 'Deja el celular cargando fuera de la pieza.']
    };
    const r = this.remCfg();
    const list = [];
    let id = 100;
    const add = (k, m, weekday) => {
      const on = { hour: Math.floor(m / 60), minute: m % 60 };
      if (weekday) on.weekday = weekday;
      list.push({ id: id++, title: MSG[k][0], body: MSG[k][1], schedule: { on: on, allowWhileIdle: true } });
    };
    ['manana', 'lectura', 'dormir'].forEach((k) => { if (r[k] && r[k].on) add(k, r[k].at); });
    if (r.entreno && r.entreno.on) {
      for (let i = 0; i < 7; i++) { const rr = this.routineAt(i); if (rr && rr.id !== 'caminata') add('entreno', r.entreno.at, ((i + 1) % 7) + 1); }
    }
    if (r.agua && r.agua.on) for (let m = r.agua.from; m <= r.agua.to && list.length < 60; m += r.agua.every) add('agua', m);
    try {
      const pend = await L.getPending();
      if (pend && pend.notifications && pend.notifications.length) await L.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
      if (list.length) await L.schedule({ notifications: list });
      if (announce) this.setState({ pushMsg: 'Listo: ' + list.length + (list.length === 1 ? ' recordatorio programado' : ' recordatorios programados') + ' en este iPhone.' });
    } catch (e) {
      this.setState({ pushMsg: 'No se pudieron programar: ' + (e && e.message ? e.message : 'error desconocido') });
    }
  }

}
