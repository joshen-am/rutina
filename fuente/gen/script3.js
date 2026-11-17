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
    prefs: { tema: 'auto', nombre: 'Joshen', meta: 5, efectos: true, sonido: true, homeOrder: ['diario', 'salud', 'hoy', 'rutina', 'fotos', 'recup', 'semanal', 'progreso'], homeHidden: {}, lastBackup: 0, backupSnooze: 0, histMode: 'habitos', v3: true, v4: true, v5: true, goal: 'general' },
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
    aiShow: false,
    xlog: {},
    hpHist: [],
    prog: false,
    recAdv: false,
    daily: {},
    bodyPhotos: [],
    adapt: {},
    chat: [],
    cap: null,
    photos: false,
    aspecto: false,
    chatOpen: false,
    dayScores: {}
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
    // guarda el puntaje de los días que ya terminaron, al abrir y al volver a la app (iPhone la deja abierta días)
    setTimeout(() => this.closeDays(), 1200);
    this._onVis = () => { if (!document.hidden) this.closeDays(); };
    document.addEventListener('visibilitychange', this._onVis);
    this.warmAudio();
    this.syncTicker();
    if (this.isNative()) setTimeout(() => this.nativeSchedule(), 1500);
  }

  applyData(s) {
    const next = {};
    ['log', 'peso', 'plan', 'noDemo', 'sess', 'since', 'hlog', 'flog', 'frev', 'hp', 'meas', 'mood', 'xlog', 'hpHist', 'daily', 'bodyPhotos', 'adapt', 'chat', 'dayScores'].forEach((k) => {
      if (s[k] !== undefined && s[k] !== null) next[k] = s[k];
    });
    if (s.prefs) {
      next.prefs = Object.assign({}, this.state.prefs, s.prefs);
      // Inicio desde la versión 27: más corto (hoy, rutina, recuperación, semana y progreso)
      // desde la versión 28 se suman el check-in diario (arriba) y la foto semanal (después de la rutina)
      const known = ['diario', 'salud', 'hoy', 'rutina', 'fotos', 'recup', 'semanal', 'progreso'];
      let ord = (next.prefs.homeOrder || []).filter((k) => known.indexOf(k) >= 0);
      if (!s.prefs.v4) { ord = known.slice(); next.prefs.homeHidden = {}; }
      if (!s.prefs.v5) {
        if (ord.indexOf('diario') < 0) ord.unshift('diario');
        if (ord.indexOf('fotos') < 0) { const r = ord.indexOf('rutina'); ord.splice(r >= 0 ? r + 1 : ord.length, 0, 'fotos'); }
      }
      known.forEach((k) => { if (ord.indexOf(k) < 0) ord.push(k); });
      next.prefs.homeOrder = ord;
      next.prefs.v3 = true;
      next.prefs.v4 = true;
      next.prefs.v5 = true;
      ['clase', 'acento', 'fuente', 'marca'].forEach((k) => { delete next.prefs[k]; });
    }
    return next;
  }

  snapshot() {
    const s = this.state;
    return {
      schema: 4, savedAt: Date.now(),
      log: s.log, peso: s.peso, prefs: s.prefs, plan: s.plan, noDemo: s.noDemo, sess: s.sess, since: s.since,
      hlog: s.hlog, flog: s.flog, frev: s.frev, hp: s.hp, meas: s.meas, mood: s.mood, xlog: s.xlog, hpHist: s.hpHist, daily: s.daily, bodyPhotos: s.bodyPhotos, adapt: s.adapt, chat: s.chat, dayScores: s.dayScores, derived: this.derived()
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

  componentDidUpdate() { this.syncTicker(); this.syncCam(); }

  componentWillUnmount() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.timer) clearTimeout(this.timer);
    if (this.rt) clearTimeout(this.rt);
    if (this.iv) clearInterval(this.iv);
    this.stopCam();
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

  /* Crear el motor de audio cuesta ~250 ms en un teléfono medio: se hace en un momento libre después de abrir,
     no en el primer toque. Queda en pausa hasta que el primer toque lo reanuda (eso sí es instantáneo). */
  warmAudio() {
    if (this.ac || !this.sndOn()) return;
    const go = () => { try { if (!this.ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ac.destination); } } catch (e) {} };
    if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1500);
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

  stepsFor(rid) { return this.adaptedSteps(rid); }

  syncTicker() {
    const on = this.nav().screen === 'sesion';
    if (on && !this.iv) this.iv = setInterval(() => this.onTick(), 100);
    if (!on && this.iv) { clearInterval(this.iv); this.iv = null; }
    this.syncWake(on);
  }

  /* Pantalla encendida mientras dura la sesión. iOS la suelta al salir de la app, así que se vuelve a pedir al volver. */
  syncWake(on) {
    try {
      if (!('wakeLock' in navigator)) return;
      if (!this.wakeVis) {
        this.wakeVis = () => { if (document.visibilityState === 'visible' && this.nav().screen === 'sesion') { this.wake = null; this.syncWake(true); } };
        document.addEventListener('visibilitychange', this.wakeVis);
      }
      if (on && !this.wake) {
        this.wake = 'pidiendo';
        navigator.wakeLock.request('screen').then((w) => { this.wake = w; w.addEventListener('release', () => { if (this.wake === w) this.wake = null; }); if (this.nav().screen !== 'sesion') { w.release(); } }).catch(() => { this.wake = null; });
      } else if (!on && this.wake && this.wake !== 'pidiendo') {
        const w = this.wake; this.wake = null; w.release().catch(() => {});
      }
    } catch (e) {}
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
    this.setState({ sess: next, tick: 0, pg: 0 }, () => this.persist());
  }

  sesNext() {
    const s = this.state.sess;
    if (!s) return;
    const n = this.stepsFor(s.rid).length;
    if (s.i < n - 1) { this.sfx('tap'); this.enterStep(s.i + 1); } else this.finishSession();
  }

  pgGo(k) {
    const s = this.state.sess;
    if (!s) return;
    const p = this.stepsFor(s.rid)[s.i];
    const n = (p && p.pages ? p.pages.length : 0);
    if (n < 2 || k < 0) return;
    this.sfx('tap');
    this.setState({ pg: k % n });
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
    const info = this.doseInfo(p);
    const reps = Object.assign({}, s.reps || {});
    const arr = (reps[s.i] || []).slice();
    if (k <= done) { sets[s.i] = k - 1; arr.length = Math.min(arr.length, k - 1); reps[s.i] = arr; next.reps = reps; next.restEnd = null; this.sfx('tap'); }
    else {
      sets[s.i] = k;
      if (info) {
        const v = this.repValue(p, s.i, Math.min(done, p.sets - 1), s);
        for (let j = done; j < k; j++) arr[j] = v;
        reps[s.i] = arr;
        next.reps = reps;
        const rv = Object.assign({}, s.rv || {});
        delete rv[s.i];
        next.rv = rv;
      }
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
    const p = steps[i] || { k: 'rest', how: [], pages: [], sets: 0, phase: '', name: '', dose: '' };
    const now = Date.now();
    // Dibujo paso a paso: cada página es una posición fija con su indicación
    const pages = p.pages || [];
    const pg = Math.max(0, Math.min(this.state.pg || 0, pages.length - 1));
    const cur = pages[pg] || { lines: [] };
    const big = pages.every((x) => x.lines.join(' ').length <= 110);
    const done = s.sets[i] || 0;
    const left = s.restEnd ? Math.max(0, Math.ceil((s.restEnd - now) / 1000)) : 0;
    const phaseColor = { 'Calentamiento': c.heatText, 'Ejercicios': c.fuerzaText, 'Cierre de postura': c.tecnicaText, 'Postura': c.tecnicaText, 'Cardio': c.resistenciaText, 'Core': c.constanciaText }[p.phase] || th.sub;
    const notes = [['Ojo', p.watch, c.fuerzaText], ['Más fácil', p.easier, c.constanciaText], ['Más difícil', p.harder, c.tecnicaText], ['Consejo', p.tip, c.resistenciaText]]
      .filter((x) => x[1]).map((x, j) => ({ label: x[0], text: x[1], color: x[2], line: j ? ('inset 0 0.5px 0 ' + th.sep) : 'none' }));
    const isRest = p.k === 'rest';
    const info = this.doseInfo(p);
    const last = info ? this.xLast(p.k, s.date) : null;
    const ready = info ? this.repReady(p, s.date) : false;
    const repsDone = (s.reps || {})[i] || [];
    return {
      title: R.name, num: i + 1, total: steps.length, pct: Math.round(((i + 1) / Math.max(1, steps.length)) * 1000) / 10,
      elapsed: this.fmtClock((now - s.start) / 1000),
      even: i % 2 === 0, odd: i % 2 === 1,
      phase: p.phase, phaseColor: phaseColor, round: p.round || '',
      hasPages: pages.length > 0, multiPg: pages.length > 1, pgN: pg + 1, pgCount: pages.length,
      pages: pages.map((x, k) => ({ op: k === pg ? 1 : 0, on: k === pg ? '1' : '0', figs: x.figs.map((src) => ({ src: src })) })),
      pgAlt: (pages.length > 1 ? 'Dibujo del paso ' + (pg + 1) + ': ' : 'Dibujo: ') + cur.lines.join(' '),
      pgLines: cur.lines.map((t) => ({ text: t })), pgSize: big ? 20 : 16, pgLh: big ? 28 : 24,
      pgDots: pages.map((x, k) => ({ w: k === pg ? 18 : 6, bg: k === pg ? '#FAFAFA' : 'rgba(250, 250, 250, 0.28)' })),
      pgFade: fx ? 'opacity 0.3s ease' : 'none', pgDotFx: fx ? 'width 0.25s ease, background 0.25s ease' : 'none',
      pgPrev: () => this.pgGo(pg - 1), pgNext: () => this.pgGo(pg + 1), pgTap: () => this.pgGo(pg + 1),
      pgFirst: pg === 0, prevOp: pg === 0 ? 0.38 : 1, pgCursor: pages.length > 1 ? 'pointer' : 'default',
      pgNextLabel: pg === pages.length - 1 ? 'Volver al primer dibujo' : 'Dibujo siguiente',
      hasView: !!p.view, view: p.view || '',
      isRestStep: isRest,
      name: p.name, dose: p.dose, hasRest: !!p.rest && !isRest, restLabel: p.rest ? (p.rest >= 60 && p.rest % 60 === 0 ? (p.rest / 60) + ' min' : p.rest + ' s') : '',
      hasWorks: !!p.works, works: p.works || '',
      hasSets: p.sets > 0, sets: p.sets, setsDone: Math.min(done, p.sets),
      hasReps: !!info && done < p.sets, repLabel: info && info.unit === 's' ? 'Segundos' : 'Repeticiones', repEach: info ? info.each : '', hasEach: !!(info && info.each),
      repVal: info ? this.repValue(p, i, Math.min(done, (p.sets || 1) - 1), s) : '', repMinus: () => this.repAdj(-1), repPlus: () => this.repAdj(1),
      hasLast: !!last, lastLine: last ? 'La última vez: ' + last.r.join(' · ') + (info && info.unit === 's' ? ' s' : '') : '',
      hasReady: ready, readyText: ready ? (p.harder ? 'Llegaste al tope del rango la última vez. Si te sentiste firme, sube de nivel: ' + p.harder : 'Llegaste al tope del rango la última vez. Si te sentiste firme, hazlo más lento o suma una serie.') : '',
      setBtns: Array.from({ length: p.sets || 0 }, (_, k) => ({
        n: k + 1, val: repsDone[k] != null ? String(repsDone[k]) : '', hasVal: k < done && repsDone[k] != null, noVal: k < done && repsDone[k] == null,
        aria: 'Serie ' + (k + 1) + (k < done ? ', hecha' + (repsDone[k] != null ? ' con ' + repsDone[k] : '') : ''), pressed: k < done, open: k >= done,
        bg: k < done ? primary : th.segBg, fg: k < done ? onPrimary : th.text,
        ring: k === done ? ('inset 0 0 0 2px ' + primary) : 'none',
        pick: () => this.markSet(k + 1)
      })),
      resting: !!s.restEnd && !isRest, restLeft: this.fmtClock(isRest && !s.restEnd ? 0 : left),
      restPct: s.restEnd && s.restTotal ? Math.round((left / s.restTotal) * 1000) / 10 : 0,
      hasSetHint: p.sets > 0 && (done === 0 || done >= p.sets),
      setHint: done >= p.sets ? 'Series completas. Toca Siguiente para continuar.' : (info ? 'Ajusta las repeticiones y toca la serie al terminarla: empieza el descanso.' : 'Toca cada serie al terminarla y empieza el descanso.'),
      hasHow: p.how && p.how.length > 0 && !pages.length,
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
    const dkey = this.keyOf(days[si]);
    // repeticiones de la sesión → historial de cada ejercicio, récords e hitos
    let xlog = st.xlog || {};
    if (st.sess && st.sess.rid === r.id && st.sess.reps) {
      const rr = this.recordReps(st.sess, dkey);
      xlog = rr.xlog;
      if (rr.prs.length) s.prs = rr.prs;
    }
    log[dkey] = { status: 'done', summary: s };
    s.weekDone = days.filter((d) => log[this.keyOf(d)] && log[this.keyOf(d)].status === 'done').length;
    const total = Object.keys(log).filter((k) => log[k] && log[k].status === 'done').length;
    const ms = this.milestoneOf(total);
    if (ms) s.milestone = ms;
    this.go({ log: log, xlog: xlog, sess: null, last: s, screen: 'victoria' }, () => { this.persist(); this.startAnim(); });
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
      log: {}, hlog: {}, flog: {}, xlog: {}, hpHist: [], daily: {}, dayScores: {}, frev: null, last: null, resetArmed: false, noDemo: true, tab: 'inicio', sel: null, sess: null, since: this.keyOf(new Date())
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
        cue: 'Antes de apagar la luz, escribo 3 cosas buenas del día', mini: 'Escribir una línea' },
      { id: 'protector', name: 'Protector solar', kind: 'bin', color: 'heat', def: false,
        icon: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
        desc: 'FPS 30 o más cada mañana, aunque esté nublado. Es lo que más cuida la piel a largo plazo.',
        cue: 'Después de lavarme los dientes en la mañana, me pongo protector', mini: 'Solo en la cara' },
      { id: 'piel', name: 'Rutina de piel de noche', kind: 'bin', color: 'tecnica', def: false,
        icon: 'M12 3c3 3.5 6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 3-6.5 6-10zM9.5 13.5a2.5 2.5 0 0 0 2.5 2.5',
        desc: 'Limpiador suave e hidratante antes de dormir. Simple y todos los días.',
        cue: 'Antes de acostarme, me lavo la cara y me pongo hidratante', mini: 'Solo lavarme la cara' }
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

  // para la racha: cumplido, versión mínima o «casi» (75 % o más: dormir 7 de 8 h no corta la racha)
  habitMet(h, key, date) {
    const f = this.habitFrac(h, key, date);
    if (f === null) return null;
    const d = ((this.state.hlog || {})[key] || {});
    return f >= 0.75 || !!d[h.id + '~'];
  }

  // 0..1: el puntaje del día (guardado si el día ya cerró; ver progreso.js)
  dayScore(key, date) {
    const sc = this.scoreFor(key, date);
    return sc ? sc.s / 100 : null;
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
    this.setState({ hlog: hl }, () => { if (key < this.keyOf(new Date())) this.saveScore(key); this.persist(); });
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
      if (h.kind === 'auto') status = met ? 'Sesión completada' : (isToday ? 'Toca entrenar hoy' : 'Sin sesión ese día');
      else if (h.kind === 'food') status = Math.round(this.dayTotals(key).p) + ' de ' + this.targets().prot + ' g';
      else status = this.habitValueLabel(h, v, goal);
      // el avance cuenta aunque no llegues a la meta: 7 de 8 h suman 88 % al puntaje del día
      if (h.kind === 'num' && f > 0 && f < 1) status += ' · ' + Math.round(f * 100) + ' %' + (f >= 0.75 ? ', casi' : '');
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
      left: w >= wGoal ? 'Meta cumplida' : (w ? Math.round((w / wGoal) * 100) + ' % · ' : '') + 'te faltan ' + (wGoal - w) + (wGoal - w === 1 ? ' vaso' : ' vasos'),
      cue: cfg.cues.agua || cat[1].cue,
      add: () => { this.sfx(w + 1 === wGoal ? 'pick' : 'tap'); this.setHabit(key, 'agua', w + 1); },
      add2: () => { this.sfx(w + 2 >= wGoal && w < wGoal ? 'pick' : 'tap'); this.setHabit(key, 'agua', w + 2); },
      add4: () => { this.sfx(w + 4 >= wGoal && w < wGoal ? 'pick' : 'tap'); this.setHabit(key, 'agua', w + 4); },
      sub: () => { this.sfx('tap'); this.setHabit(key, 'agua', Math.max(0, w - 1)); }
    };
    const score = total ? done / total : 0;
    const names = this.dayNames();
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const left = total - done;
    return {
      dayLabel: isToday ? 'Hoy' : ((st.hday || 0) === -1 ? 'Ayer' : cap(names[(date.getDay() + 6) % 7]) + ' ' + date.getDate()),
      dateLabel: this.longDate(date), isToday: isToday, canNext: !isToday, canPrev: (st.hday || 0) > -120,
      nextOp: isToday ? 0.3 : 1, prevOp: (st.hday || 0) > -120 ? 1 : 0.3,
      done: done, total: total, items: items, water: water,
      ringOff: (238.8 * (1 - score)).toFixed(1),
      title: total ? (done === total ? 'Día completo' : 'Vas al ' + Math.round(score * 100) + ' %') : 'Sin hábitos',
      sub: total ? (left === 0 ? 'Cumpliste todos tus hábitos de hoy.' : 'Te faltan ' + left + (left === 1 ? ' hábito' : ' hábitos') + ' para completar el día.') : 'Elige qué hábitos seguir.',
      hasRisk: items.some((x) => x.atRisk),
      prev: () => { this.sfx('tap'); this.setState({ hday: Math.max(-120, (st.hday || 0) - 1) }); },
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
      adv: !!st.recAdv, advRot: st.recAdv ? 90 : 0,
      toggleAdv: () => { this.sfx('tap'); this.setState({ recAdv: !st.recAdv }); },
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
    this.go({ hp: hp, peso: hp.peso, meas: meas, ev: null, screen: 'inicio', tab: 'salud', area: null }, () => {
      const ov = this.healthOverall(this.healthAreas());
      const hh = (this.state.hpHist || []).filter((x) => x.at !== hp.at).concat(ov == null ? [] : [{ at: hp.at, s: ov }]).slice(-24);
      this.setState({ hpHist: hh }, () => this.persist());
    });
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
    this.setState({ msheet: { peso: this.peso(), cintura: L('cintura', 82), fc: L('fc', 68), pas: L('pas', 120), pad: L('pad', 78), pecho: L('pecho', 96), brazo: L('brazo', 32), cadera: L('cadera', 96), hombros: L('hombros', 112), on: { cintura: this.latest('cintura') != null, fc: this.latest('fc') != null, bp: this.latest('pas') != null, pecho: this.latest('pecho') != null, brazo: this.latest('brazo') != null, cadera: this.latest('cadera') != null, hombros: this.latest('hombros') != null } } });
  }

  measStep(f, d) {
    const m = this.state.msheet;
    if (!m) return;
    this.sfx('tap');
    const lim = { peso: [35, 180, 0.1], cintura: [50, 160, 0.5], fc: [35, 130, 1], pas: [80, 220, 1], pad: [40, 140, 1], pecho: [60, 160, 0.5], brazo: [18, 60, 0.5], cadera: [60, 160, 0.5], hombros: [80, 170, 0.5] }[f];
    const n = Object.assign({}, m);
    n[f] = Math.max(lim[0], Math.min(lim[1], Math.round((m[f] + d * lim[2]) * 10) / 10));
    if (['cintura', 'fc', 'pecho', 'brazo', 'cadera', 'hombros'].indexOf(f) >= 0) n.on = Object.assign({}, m.on, { [f]: true });
    if (f === 'pas' || f === 'pad') n.on = Object.assign({}, m.on, { bp: true });
    this.setState({ msheet: n });
  }

  saveMeas() {
    const m = this.state.msheet;
    if (!m) return;
    const d = this.keyOf(new Date());
    const meas = (this.state.meas || []).filter((x) => x.d !== d);
    meas.push({ d: d, peso: m.peso, cintura: m.on.cintura ? m.cintura : null, fc: m.on.fc ? m.fc : null, pas: m.on.bp ? m.pas : null, pad: m.on.bp ? m.pad : null, pecho: m.on.pecho ? m.pecho : null, brazo: m.on.brazo ? m.brazo : null, cadera: m.on.cadera ? m.cadera : null, hombros: m.on.hombros ? m.hombros : null });
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
    /* barra segmentada (como la de biomarcadores de Superpower): cuántas áreas hay en cada nota */
    const GR = ['A', 'B', 'C', 'D'];
    const REP = { A: 92, B: 77, C: 60, D: 30 };
    const segs = GR.map((x, i) => ({ g: x, n: areas.filter((a) => a.score != null && a.grade === x).length, i: i }))
      .filter((x) => x.n > 0)
      .map((x, k) => ({ n: x.n, flex: x.n, color: this.healthColor(REP[x.g], true), label: this.gradeLabel(x.g), delay: 280 + k * 90 }));
    const list = areas.map((x, i) => ({
      id: x.id, name: x.name, icon: x.icon, grade: x.grade, gColor: this.healthColor(x.score, dark), gText: this.healthText(x.score, dark), score: x.score == null ? '—' : x.score, status: x.status,
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
      segs: segs, hasSegs: segs.length > 0,
      has: has, none: !has, overall: overall == null ? '—' : overall, overallN: overall, grade: g, gColor: this.healthColor(overall, true), gLabel: this.gradeLabel(g),
      ringOff: (439.8 * (1 - (overall || 0) / 100)).toFixed(1), areas: list, focus: focus, hasFocus: focus.length > 0,
      evalAgo: has ? this.agoText(st.hp.at).toLowerCase() : '', evalOld: has && Date.now() - st.hp.at > 60 * 864e5,
      startEval: () => this.startEval(),
      detail: detail,
      measOpen: !!ms, mrows: ms ? [mrow('peso', 'Peso', 'kg'), mrow('cintura', 'Cintura', 'cm', 'cintura'), mrow('fc', 'Pulso en reposo', 'lpm', 'fc'), mrow('pas', 'Presión, número alto', 'mmHg', 'bp'), mrow('pad', 'Presión, número bajo', 'mmHg', 'bp'), mrow('hombros', 'Hombros (contorno)', 'cm', 'hombros'), mrow('pecho', 'Pecho', 'cm', 'pecho'), mrow('brazo', 'Brazo', 'cm', 'brazo'), mrow('cadera', 'Cadera', 'cm', 'cadera')] : [],
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

  /* ---------- progreso: repeticiones por serie, progresión, récords y tendencias (versión 27) ---------- */

  /* Rango de la dosis: «4 × 6–12», «3 × 20–40 s», «3 × 8 por lado», «2 × 8 de cada letra» */
  doseInfo(p) {
    if (!p || !p.sets) return null;
    const dose = String(p.dose || '');
    const m = dose.match(/[×x]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(s\b)?/);
    const each = /por pierna/.test(dose) ? 'por pierna' : /por brazo/.test(dose) ? 'por brazo' : /por lado/.test(dose) ? 'por lado' : /de cada letra/.test(dose) ? 'de cada letra' : '';
    if (!m) return { lo: 10, hi: 10, unit: 'r', each: each };
    const lo = +m[1];
    return { lo: lo, hi: m[2] ? +m[2] : lo, unit: m[3] ? 's' : 'r', each: each };
  }

  xHist(k) { return ((this.state.xlog || {})[k] || []); }

  /* Último registro de un ejercicio antes de una fecha (para no compararse con el de hoy) */
  xLast(k, before) {
    const h = this.xHist(k);
    for (let i = h.length - 1; i >= 0; i--) if (!before || h[i].d < before) return h[i];
    return null;
  }

  xBest(k, before) {
    let b = null;
    this.xHist(k).forEach((e) => { if (before && e.d >= before) return; e.r.forEach((v) => { if (v != null && (b === null || v > b)) b = v; }); });
    return b;
  }

  repStep(info) { return info.unit === 's' ? 5 : 1; }

  /* Meta de la serie j: lo de la vez anterior más un paso, sin pasar el tope del rango */
  repTarget(p, j, before) {
    const info = this.doseInfo(p);
    if (!info) return null;
    const last = this.xLast(p.k, before);
    if (!last || !last.r.length) return info.lo;
    const prev = last.r[j] != null ? last.r[j] : last.r[last.r.length - 1];
    if (prev >= info.hi) return info.hi;
    return Math.min(info.hi, prev + this.repStep(info));
  }

  /* La vez anterior todas las series llegaron al tope: toca subir de nivel */
  repReady(p, before) {
    const info = this.doseInfo(p);
    const last = this.xLast(p.k, before);
    if (!info || !last) return false;
    const r = last.r.filter((v) => v != null);
    return r.length >= p.sets && r.every((v) => v >= info.hi);
  }

  repValue(p, i, j, s) {
    const rv = (s.rv || {})[i];
    return rv != null ? rv : this.repTarget(p, j, s.date);
  }

  repAdj(d) {
    const s = this.state.sess;
    if (!s) return;
    const p = this.stepsFor(s.rid)[s.i];
    const info = this.doseInfo(p);
    if (!info) return;
    const done = s.sets[s.i] || 0;
    const j = Math.min(done, p.sets - 1);
    const cur = this.repValue(p, s.i, j, s);
    const st = this.repStep(info);
    const v = Math.max(st, Math.min(info.unit === 's' ? 600 : 200, cur + d * st));
    this.sfx('tap');
    const rv = Object.assign({}, s.rv || {});
    rv[s.i] = v;
    this.setState({ sess: Object.assign({}, s, { rv: rv }) }, () => this.persist());
  }

  /* Al guardar la sesión: pasa las repeticiones al historial de cada ejercicio y detecta récords */
  recordReps(sess, dkey) {
    const xlog = Object.assign({}, this.state.xlog || {});
    const prs = [];
    const steps = this.stepsFor(sess.rid);
    Object.keys(sess.reps || {}).forEach((i) => {
      const p = steps[+i];
      const info = this.doseInfo(p);
      const r = (sess.reps[i] || []).filter((v) => v != null);
      if (!p || !info || !r.length) return;
      const prevBest = this.xBest(p.k, dkey);
      const hist = (xlog[p.k] || []).filter((e) => e.d !== dkey);
      hist.push({ d: dkey, r: r, u: info.unit });
      xlog[p.k] = hist.slice(-40);
      const best = Math.max.apply(null, r);
      if (prevBest != null && best > prevBest) prs.push({ k: p.k, name: p.name, val: best, prev: prevBest, unit: info.unit, each: info.each });
    });
    return { xlog: xlog, prs: prs };
  }

  milestoneOf(n) {
    return [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500].indexOf(n) >= 0 ? n : null;
  }

  repUnit(u, n) { return u === 's' ? 's' : (n === 1 ? 'repetición' : 'repeticiones'); }

  exerciseNames() {
    if (this._xn) return this._xn;
    const out = {};
    const d = this.sessionData();
    Object.keys(d).forEach((day) => d[day].forEach((p) => { if (p.k && p.name && !out[p.k]) out[p.k] = p.name; }));
    this._xn = out;
    return out;
  }

  /* ---------- programa: semana, fase y escalera ---------- */

  programWeek() {
    const st = this.state;
    if (!st.since) return 1;
    const a = this.mondayOf(this.dateOf(st.since));
    const b = this.mondayOf(new Date());
    return Math.max(1, Math.floor((b.getTime() - a.getTime()) / (7 * 864e5) + 0.5) + 1);
  }

  programPhase(w) { return w <= 4 ? 1 : w <= 8 ? 2 : 3; }

  /* ---------- resumen de una semana (lunes a domingo) ---------- */

  weekSummary(offset) {
    const st = this.state;
    const mon = this.mondayOf(new Date());
    const start = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * (offset || 0));
    const now = new Date();
    const T = this.targets();
    let ses = 0, prs = 0, habSum = 0, habN = 0, foodDays = 0, protSum = 0;
    for (let k = 0; k < 7; k++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
      if (d > now) break;
      const key = this.keyOf(d);
      const e = st.log[key];
      if (e && e.status === 'done') { ses++; if (e.summary && e.summary.prs) prs += e.summary.prs.length; }
      const sc = this.dayScore(key, d);
      if (sc !== null && sc !== undefined) { habSum += sc; habN++; }
      const fl = (st.flog || {})[key];
      if (fl && Object.keys(fl).some((m) => (fl[m] || []).length)) { foodDays++; protSum += this.dayTotals(key).p; }
    }
    return {
      start: start, sessions: ses, meta: st.prefs.meta || 5, prs: prs,
      habits: habN ? Math.round((habSum / habN) * 100) : null,
      foodDays: foodDays, prot: foodDays ? Math.round(protSum / foodDays) : null, protGoal: T.prot
    };
  }

  /* ---------- gráficos simples (SVG) ---------- */

  sparkPath(vals, w, h) {
    const v = vals.filter((x) => x != null);
    if (v.length < 2) return { path: '', x: 0, y: 0 };
    let lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = 6;
    const pts = v.map((y, i) => [pad + (i * (w - 2 * pad)) / (v.length - 1), pad + (1 - (y - lo) / (hi - lo)) * (h - 2 * pad)]);
    const path = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const last = pts[pts.length - 1];
    return { path: path, x: Math.round((last[0] / w) * 1000) / 10, y: Math.round((last[1] / h) * 1000) / 10 };
  }

  deltaText(a, b, unit) {
    if (a == null || b == null) return '';
    const d = Math.round((b - a) * 10) / 10;
    if (!d) return 'Sin cambio';
    return (d > 0 ? '+' : '−') + this.fmtNum(Math.abs(d)) + ' ' + unit;
  }

  /* ---------- valores de la pantalla Progreso y de las tarjetas de Inicio ---------- */

  progressVals(th, c, dark) {
    const st = this.state;
    const now = new Date();
    const week = this.programWeek();
    const phase = this.programPhase(week);
    const meta = st.prefs.meta || 5;

    // sesiones por semana, últimas 12
    const mon = this.mondayOf(now);
    const mshort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const s0 = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * w);
      let n = 0;
      for (let k = 0; k < 7; k++) { const e = st.log[this.keyOf(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + k))]; if (e && e.status === 'done') n++; }
      weeks.push({ n: n, label: s0.getDate() + ' ' + mshort[s0.getMonth()], cur: w === 0 });
    }
    const maxN = Math.max(meta, Math.max.apply(null, weeks.map((x) => x.n)));
    const done12 = weeks.reduce((a, x) => a + x.n, 0);
    const bars = weeks.map((x, i) => ({
      h: Math.max(4, Math.round((x.n / maxN) * 1000) / 10), n: x.n,
      bg: x.cur ? c.constancia : (x.n >= meta ? th.text : th.barOff), delay: 120 + i * 30,
      aria: 'Semana del ' + x.label + ': ' + x.n + (x.n === 1 ? ' sesión' : ' sesiones')
    }));
    const metaLine = Math.round((meta / maxN) * 1000) / 10;

    // puntaje de salud a lo largo de las evaluaciones
    const hh = (st.hpHist || []).slice(-12);
    const curScore = st.hp ? this.healthOverall(this.healthAreas()) : null;
    const scoreVals = hh.map((x) => x.s);
    const scoreSpark = this.sparkPath(scoreVals, 300, 72);

    // peso y cintura
    const meas = (st.meas || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
    const pesoV = meas.map((m) => m.peso).filter((v) => v != null).slice(-16);
    const cinV = meas.map((m) => m.cintura).filter((v) => v != null).slice(-16);
    const pesoS = this.sparkPath(pesoV, 300, 64);
    const cinS = this.sparkPath(cinV, 300, 64);

    // carga por músculo: esta semana contra la anterior
    const load = (off) => {
      const out = {};
      const s0 = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * off);
      for (let k = 0; k < 7; k++) {
        const e = st.log[this.keyOf(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + k))];
        if (e && e.status === 'done' && e.summary && e.summary.muscles) e.summary.muscles.forEach((m) => { out[m.name] = (out[m.name] || 0) + m.w; });
      }
      return out;
    };
    const L0 = load(0), L1 = load(1);
    const names = Object.keys(Object.assign({}, L0, L1));
    const maxL = Math.max(1, Math.max.apply(null, names.map((n) => Math.max(L0[n] || 0, L1[n] || 0)).concat([0])));
    const muscles = names.sort((a, b) => (L0[b] || 0) - (L0[a] || 0)).slice(0, 8).map((n, i) => ({
      name: n, w: Math.round(((L0[n] || 0) / maxL) * 1000) / 10, prev: Math.round(((L1[n] || 0) / maxL) * 1000) / 10,
      trend: (L0[n] || 0) > (L1[n] || 0) + 0.05 ? 'Más que la semana pasada' : (L0[n] || 0) < (L1[n] || 0) - 0.05 ? 'Menos que la semana pasada' : 'Igual que la semana pasada',
      line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none'
    }));

    // récords por ejercicio
    const xn = this.exerciseNames();
    const recs = Object.keys(st.xlog || {}).map((k) => {
      const h = st.xlog[k];
      let best = null, bestD = null;
      h.forEach((e) => e.r.forEach((v) => { if (v != null && (best === null || v > best)) { best = v; bestD = e.d; } }));
      const last = h[h.length - 1];
      return { k: k, name: xn[k] || k, best: best, unit: last ? last.u : 'r', d: bestD, lastD: last ? last.d : '' };
    }).filter((x) => x.best != null).sort((a, b) => (a.lastD < b.lastD ? 1 : -1)).slice(0, 8)
      .map((x, i) => ({ name: x.name, val: x.best, unit: this.repUnit(x.unit, x.best), when: x.d ? this.agoText(this.dateOf(x.d).getTime()) : '', line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' }));

    // escalera de progresión
    const P = this.programData();
    const ladder = (P.ladder || []).map((g, i) => ({
      group: g[0], line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',
      steps: [g[1], g[2], g[3]].map((t, j) => ({ text: t, n: j + 1, on: j + 1 === phase, bg: j + 1 === phase ? th.inv : 'transparent', fg: j + 1 === phase ? th.onInv : (j + 1 < phase ? th.sub : th.tertiary), tc: j + 1 === phase ? th.text : (j + 1 < phase ? th.sub : th.tertiary), tw: j + 1 === phase ? 500 : 400 }))
    }));
    const later = (P.later || []).map((x, i) => {
      const m = /semana (\d+)/.exec(x[1]);
      const from = m ? +m[1] : null;
      return { name: x[0], text: x[1].charAt(0).toUpperCase() + x[1].slice(1), lock: from && week < from ? 'Desde la semana ' + from : '', hasLock: !!(from && week < from), line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none' };
    });

    // esta semana y la anterior
    const w0 = this.weekSummary(0), w1 = this.weekSummary(1);
    const wkItems = (w) => [
      { label: 'Sesiones', val: w.sessions + ' de ' + w.meta },
      { label: 'Hábitos', val: w.habits == null ? '—' : w.habits + ' %' },
      { label: 'Días con comida', val: w.foodDays + ' de 7' },
      { label: 'Proteína promedio', val: w.prot == null ? '—' : w.prot + ' g' }
    ];
    const dow = (now.getDay() + 6) % 7;   // 0 lunes … 6 domingo
    const wkShow = dow === 6 ? w0 : dow === 0 ? w1 : null;
    const wkTitle = dow === 6 ? 'Tu semana' : 'Tu semana pasada';
    const wkLine = (w) => w.sessions >= w.meta ? 'Cumpliste tu meta de sesiones.' : (w.meta - w.sessions === 1 ? 'Te faltó una sesión para tu meta.' : 'Te faltaron ' + (w.meta - w.sessions) + ' sesiones para tu meta.');

    return {
      week: week, phase: phase, weekLabel: 'Semana ' + week + ' del programa · fase ' + phase,
      bars: bars, metaLine: metaLine, meta: meta, done12: done12, avg: this.fmtNum(Math.round((done12 / 12) * 10) / 10),
      firstWeek: weeks[0].label, lastWeek: 'Esta semana',
      hasScore: curScore != null, noScore: curScore == null, score: curScore == null ? '—' : curScore, hasScoreLine: scoreVals.length >= 2,
      scorePath: scoreSpark.path, scoreX: scoreSpark.x, scoreY: scoreSpark.y, scoreColor: this.healthColor(curScore, dark),
      scoreNote: curScore == null ? 'Haz la evaluación de salud para empezar a seguir tu puntaje.' : scoreVals.length >= 2 ? (hh.length + ' evaluaciones') : 'Repite la evaluación en unas semanas para ver cómo cambia.',
      hasPeso: pesoV.length > 0, peso: pesoV.length ? this.fmtNum(pesoV[pesoV.length - 1]) : '—', pesoDelta: this.deltaText(pesoV[0], pesoV[pesoV.length - 1], 'kg'),
      hasPesoLine: pesoV.length >= 2, pesoPath: pesoS.path, pesoX: pesoS.x, pesoY: pesoS.y,
      hasCin: cinV.length > 0, cin: cinV.length ? this.fmtNum(cinV[cinV.length - 1]) : '—', cinDelta: this.deltaText(cinV[0], cinV[cinV.length - 1], 'cm'),
      hasCinLine: cinV.length >= 2, cinPath: cinS.path, cinX: cinS.x, cinY: cinS.y,
      measNote: pesoV.length < 2 ? 'Registra tu peso cada semana en Salud para ver la tendencia.' : '',
      hasMeasNote: pesoV.length < 2,
      hasMuscles: muscles.length > 0, muscles: muscles, noMuscles: muscles.length === 0,
      hasRecs: recs.length > 0, recs: recs, noRecs: recs.length === 0,
      ladder: ladder, later: later, hasLater: later.length > 0,
      wk: { show: !!wkShow, title: wkTitle, items: wkShow ? wkItems(wkShow) : [], line: wkShow ? wkLine(wkShow) : '', hasPrs: !!(wkShow && wkShow.prs), prs: wkShow ? (wkShow.prs === 1 ? '1 récord nuevo' : wkShow.prs + ' récords nuevos') : '' },
      now: { items: wkItems(w0), line: wkLine(w0) },
      open: () => { this.sfx('open'); this.setState({ prog: true }); },
      close: () => { this.sfx('tap'); this.setState({ prog: false }); }
    };
  }

  /* ---------- puntaje del día (versión 33) ----------
     De 0 a 100: el promedio de lo que avanzaste en cada hábito activo ese día. El avance cuenta aunque no llegues a la
     meta (1 L de 2,5 L de agua suma 40 %; dormir 7 de 8 h, 88 %). Cuando el día termina, el puntaje queda guardado en
     dayScores: no cambia si después ajustas metas o hábitos, y sí si editas ese día en Hábitos. */

  dayScoreInfo(key, date) {
    const cfg = this.habitCfg();
    const list = this.habitCatalog().filter((h) => cfg.on.indexOf(h.id) >= 0);
    let n = 0, sum = 0, met = 0, part = 0, miss = 0;
    const items = {};
    list.forEach((h) => {
      const f = this.habitFrac(h, key, date);
      if (f === null) return;
      n++; sum += f;
      if (f >= 1) met++; else if (f > 0) part++; else miss++;
      items[h.id] = Math.round(f * 100);
    });
    if (!n) return null;
    return { s: Math.round((sum / n) * 100), n: n, met: met, part: part, miss: miss, items: items };
  }

  scoreFor(key, date) {
    if (key < this.keyOf(new Date())) { const s = (this.state.dayScores || {})[key]; if (s) return s; }
    return this.dayScoreInfo(key, date || this.dateOf(key));
  }

  saveScore(key) {
    const info = this.dayScoreInfo(key, this.dateOf(key));
    const cur = (this.state.dayScores || {})[key];
    if (!info) return;
    if (cur && cur.s === info.s && cur.met === info.met && cur.part === info.part && cur.miss === info.miss) return;
    this.setState({ dayScores: Object.assign({}, this.state.dayScores || {}, { [key]: Object.assign(info, { at: Date.now() }) }) }, () => this.persist());
  }

  // al abrir la app (o volver a ella) se guardan los días que terminaron y no tienen puntaje
  closeDays() {
    const st = this.state;
    const now = new Date();
    const since = st.since || this.keyOf(now);
    const add = {};
    for (let i = 1; i <= 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = this.keyOf(d);
      if (key < since) break;
      if ((st.dayScores || {})[key]) continue;
      const info = this.dayScoreInfo(key, d);
      if (info) add[key] = Object.assign(info, { at: Date.now() });
    }
    if (Object.keys(add).length) this.setState({ dayScores: Object.assign({}, st.dayScores || {}, add) }, () => this.persist());
  }

  scoreGrade(s) {
    return s >= 90 ? 'Día redondo' : s >= 75 ? 'Muy buen día' : s >= 50 ? 'Día a medias' : s > 0 ? 'Día flojo' : 'Sin registro';
  }

  scoreParts(sc) {
    const p = [];
    if (sc.met) p.push(sc.met + (sc.met === 1 ? ' cumplido' : ' cumplidos'));
    if (sc.part) p.push(sc.part + ' con avance');
    if (sc.miss) p.push(sc.miss + ' sin hacer');
    return p.join(' · ');
  }

  // tarjeta del puntaje para Inicio: el de ayer en la mañana y el de hoy desde las 18:00
  scoreCardVals(th, c, dark) {
    const now = new Date();
    const h = now.getHours();
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yk = this.keyOf(y);
    const morning = h < 12 && yk >= (this.state.since || yk);
    const evening = h >= 18;
    const date = morning ? y : now;
    const sc = (morning || evening) ? this.scoreFor(this.keyOf(date), date) : null;
    if (!sc) return { show: false, s: 0, color: th.text, eyebrow: '', grade: '', parts: '', off: '0', open: () => {} };
    return {
      show: true, s: sc.s, color: this.healthText(sc.s, dark), ring: this.healthColor(sc.s, dark),
      off: (138.2 * (1 - sc.s / 100)).toFixed(1),
      eyebrow: morning ? 'Tu día de ayer' : 'Tu día hasta ahora',
      grade: this.scoreGrade(sc.s), parts: this.scoreParts(sc),
      open: () => { this.sfx('tap'); this.go({ tab: 'habitos', screen: 'inicio', menu: false, hday: morning ? -1 : 0 }); }
    };
  }

  programData() { return %%PROGRAM%%; }

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


  mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    const k = Math.max(0, Math.min(1, t));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }

  heatColor(th, c, dark, t) {
    const soft = dark ? '#F7861E' : '#FDBA74';
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
          ready: this.readyText(Math.round((RH[m.name] || 48) * TI * (0.6 + 0.4 * Math.min(1, m.w)) * 0.66)),
          line: i ? ('inset 0 0.5px 0 ' + th.sep) : 'none'
        }))
      },
      vb: vb,
      cele: {
        has: !!((s.prs && s.prs.length) || s.milestone),
        hasPrs: !!(s.prs && s.prs.length),
        prs: (s.prs || []).map((x, i) => ({ name: x.name, val: x.val, unit: this.repUnit(x.unit, x.val) + (x.each ? ' ' + x.each : ''), prev: 'Antes ' + x.prev, line: i ? 'inset 0 0.5px 0 rgba(255, 255, 255, 0.1)' : 'none' })),
        hasMs: !!s.milestone, ms: s.milestone || '', msLabel: s.milestone === 1 ? 'Tu primera sesión' : 'Sesión número ' + s.milestone,
        halo: this.haloCss(c.constancia)
      }
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
    if (hv.has) { c.accent = this.healthColor(hv.overallN, dark); c.accentText = this.healthText(hv.overallN, dark); }
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
    // la lista sale de la rutina adaptada (con tus cambios y la semana de descarga) cuando la rutina tiene series
    const adSteps = r0 ? this.adaptedSteps(r0.id).filter((p) => p.sets) : [];
    const restTxt = (sec) => (sec >= 60 && sec % 60 === 0 ? (sec / 60) + ' min' : sec + ' s');
    const exList = adSteps.length ? adSteps.map((p) => ({ name: p.name + (p.added ? ' · extra' : ''), sets: p.dose, rest: p.rest ? restTxt(p.rest) : null })) : (r0 ? r0.exercises : []);
    const deloadNow = this.isDeload(this.programWeek());
    const r = r0 ? Object.assign({}, r0, {
      note: (deloadNow && adSteps.length ? 'Semana de descarga: una serie menos en cada ejercicio. ' : '') + exList.length + ' ejercicios, unos ' + r0.minutes + ' minutos. ' + (r0.note || ''),
      exercises: exList.map((e, i) => ({ n: (i < 9 ? '0' : '') + (i + 1), name: e.name, sub: e.rest ? e.sets + ' · descanso ' + e.rest : e.sets }))
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
    const dayCol = (f) => (f <= 0 ? th.fill : this.mix(th.fill, c.constancia, 0.22 + 0.78 * f));
    let hFull = 0, hAny = 0, prevMonth = -1;
    for (let w = 0; w < HW; w++) {
      const col = new Date(startMon.getFullYear(), startMon.getMonth(), startMon.getDate() + 7 * w);
      const mo = col.getMonth();
      items.push({ isLabel: true, isCell: false, text: mo !== prevMonth && (w > 0 || col.getDate() <= 21) ? mshort[mo] : '' });
      prevMonth = mo;
      for (let d = 0; d < 7; d++) {
        const day = new Date(col.getFullYear(), col.getMonth(), col.getDate() + d);
        const isToday = day.getTime() === today0.getTime();
        let bg = th.fill, ring = 'none', aria = '', pick = null;
        const off = Math.round((day - today0) / 86400000);
        if (day > today0) { bg = 'transparent'; ring = 'inset 0 0 0 1px ' + th.sep; }
        else if (day >= sinceD) {
          const sc = this.dayScore(this.keyOf(day), day);
          if (sc !== null && !(isToday && sc === 0)) { bg = dayCol(sc); if (sc > 0) hAny++; if (sc >= 1) hFull++; }
          // tocar un día abre Hábitos en ese día, con su puntaje guardado
          if (off >= -120) {
            aria = this.longDate(day) + (sc !== null ? ': puntaje ' + Math.round(sc * 100) : '');
            pick = () => { this.sfx('tap'); this.setState({ prog: false }); this.go({ tab: 'habitos', screen: 'inicio', menu: false, hday: off }); };
          }
        }
        if (isToday) ring = 'inset 0 0 0 1.5px ' + th.text;
        items.push({ isLabel: false, isCell: true, isBtn: !!pick, isPlain: !pick, bg: bg, ring: ring, aria: aria, pick: pick || (() => {}) });
      }
    }
    const hist = {
      weeks: HW, items: items, days: ['', 'L', '', 'M', '', 'V', ''].map((t) => ({ t: t })),
      scale: [0, 0.25, 0.5, 0.75, 1].map((k) => ({ bg: dayCol(k) })),
      summary: hFull + (hFull === 1 ? ' día completo' : ' días completos'),
      aria: 'Historial de las últimas ' + HW + ' semanas'
    };

    /* resumen de sesión */
    const summary = st.last || Object.assign(this.buildSummary(rc, { minutes: rc.minutes, intensity: 'dura', series: 0.8, setsDone: 22, setsTotal: 26 }, sd), { weekDone: weekDone, meta: meta });
    const vv = this.summaryVals(summary, st.t, th, c, dark);

    /* orden de inicio */
    const edit = !!st.editHome;
    const HL = { diario: 'Check-in del día', salud: 'Perfil de salud', hoy: 'Hoy', rutina: 'Rutina del día', fotos: 'Foto semanal', recup: 'Recuperación muscular', semanal: 'Resumen de la semana', progreso: 'Progreso' };
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
    // puntaje del día (0–100, cuenta el avance parcial); en días pasados, el guardado
    const hDate = this.habitDate();
    const hsc = this.scoreFor(this.keyOf(hDate), hDate);
    const score = hsc ? hsc.s / 100 : 0;
    hdv.ringOff52 = (138.2 * (1 - score)).toFixed(1);
    hdv.ringOff84 = (226.2 * (1 - score)).toFixed(1);
    hdv.score = hsc ? String(hsc.s) : '–';
    hdv.ringColor = hsc ? this.healthColor(hsc.s, dark) : th.text;
    hdv.scoreLabel = hdv.isToday ? 'Puntaje de hoy' : 'Puntaje del día';
    hdv.title = hsc ? this.scoreGrade(hsc.s) + (hdv.isToday && hsc.s < 100 ? ' hasta ahora' : '') : 'Sin hábitos';
    hdv.sub = hsc ? this.scoreParts(hsc) : 'Elige qué hábitos seguir.';
    const sk = this.scoreCardVals(th, c, dark);

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

    /* «Hoy» en Inicio: tres anillos (hábitos, comida, agua) que llevan a su pestaña */
    const RC = 188.5;
    const ring3 = (f) => (RC * (1 - Math.max(0, Math.min(1, f)))).toFixed(1);
    const wv = hdv.water;
    const kf = T.kcal ? tt.kcal / T.kcal : 0;
    const ty = {
      habits: { off: ring3(score), center: hsc && hdv.isToday ? String(hsc.s) : '–', label: 'Hábitos', sub: hsc && hdv.isToday ? 'Puntaje de hoy' : 'Sin hábitos', color: c.constancia },
      food: { off: ring3(kf), center: Math.round(Math.min(9.99, kf) * 100) + ' %', label: 'Comida', sub: this.fmt(tt.kcal) + ' kcal', color: c.carb },
      water: { on: !!wv.on, off: ring3(wv.goal ? wv.count / wv.goal : 0), center: wv.liters + ' L', label: 'Agua', sub: 'de ' + wv.goalL + ' L', color: c.resistencia, add: wv.add }
    };
    const pgv = this.progressVals(th, c, dark);
    const cv = this.cuerpoVals(th, c, dark, th.inv, th.onInv);


    /* sesión */
    const sesForView = st.sess || { rid: rc.id, date: '', i: 9, sets: { 9: 1 }, start: Date.now() - 754000, restEnd: null, restTotal: 0 };
    const ss = this.sessionVals(sesForView, th, c, dark, th.inv, th.onInv, fx);
    const sesToday = st.sess && r0 && st.sess.rid === r0.id && st.sess.date === this.keyOf(sd);

    /* IA */
    const ai = this.aiCfg();
    const isG = ai.provider !== 'claude';
    const aiv = {
      key: ai.key, model: ai.model,
      status: !ai.key ? 'Sin conectar' : ai.ok ? 'Conectada' : 'Sin probar', stColor: ai.key && ai.ok ? c.constanciaText : th.sub,
      hasHint: !!ai.key && (isG ? !/^(AIza|AQ\.)/.test(ai.key) : !/^sk-ant-/.test(ai.key)),
      hint: isG ? 'Las claves de Google AI Studio empiezan con AQ. o con AIza. Revisa que copiaste la clave y no otro dato.' : 'Las claves de Anthropic empiezan con sk-ant-. Revisa que copiaste la clave completa.',
      ph: isG ? 'Pega tu clave de Google AI Studio' : 'Pega tu clave de Anthropic (sk-ant-…)',
      modelPh: isG ? 'gemini-flash-latest' : 'claude-haiku-5-5',
      url: isG ? 'https://aistudio.google.com/apikey' : 'https://console.anthropic.com/settings/keys',
      help: isG ? 'Gemini tiene un plan gratis: crea una clave en Google AI Studio y pégala aquí. En el plan gratis Google puede usar las fotos para mejorar sus modelos.' : 'Claude cobra por uso: unos pocos pesos por foto de comida y menos de 100 por análisis del cuerpo. No usa tus datos para entrenar. La suscripción de claude.ai no sirve aquí: crea una clave en la consola de Anthropic y carga crédito.',
      provs: [['gemini', 'Gemini · gratis'], ['claude', 'Claude']].map((p) => {
        const sel = (ai.provider || 'gemini') === p[0];
        return { label: p[1], selected: sel, bg: sel ? th.segSel : 'transparent', weight: sel ? 500 : 400, shadow: sel && !dark ? '0 1px 3px rgba(9, 9, 11, 0.12)' : 'none', pick: () => { this.sfx('tap'); this.setAi({ provider: p[0], model: '' }); this.setState({ aiMsg: '' }); } };
      }),
      setKey: (e) => {
        const el = e && e.target, raw = (el && el.value) || '', k = this.cleanKey(raw);
        if (el && raw !== k) el.value = k;   // lo pegado queda limpio también en el campo
        this.setAi({ key: k });
      },
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
      font: F.sans, mono: F.mono, orb: orb, halo: halo, haloEval: this.haloCss(null, 135), motion: fx ? 'on' : 'off',
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
      fd: fdv, fh: fh, hs: hv, hv: hv, ai: aiv, ty: ty, pg: pgv, sk: sk, hasNoFocusHere: false, isProg: !!st.prog && n.screen !== 'area',
      dy: cv.dy, ph: cv.ph, cap: cv.cap, asp: cv.asp, chat: cv.chat, ad: cv.ad,
      isPhotos: !!st.photos && !st.cap, isCap: !!st.cap, isAspecto: !!st.aspecto, isChat: !!st.chatOpen,
      openHabEditor: () => { this.sfx('open'); this.go({ habEdit: true, tab: 'habitos', screen: 'inicio', menu: false }); },
      closeHabEditor: () => { this.sfx('tap'); this.setState({ habEdit: false }); },
      goHabitos: () => { this.sfx('tap'); this.go({ tab: 'habitos', screen: 'inicio', menu: false, hday: 0 }); },
      goComida: () => { this.sfx('tap'); this.go({ tab: 'comida', screen: 'inicio', menu: false, fday: 0 }); },
      goSalud: () => { this.sfx('tap'); this.go({ tab: 'salud', screen: 'inicio', menu: false, area: null }); },
      goAiSettings: () => { this.sfx('tap'); this.go({ tab: 'ajustes', screen: 'inicio', menu: false }, () => { try { const el = document.getElementById('ia'); const sc = el && el.closest('.scroll'); const t = el && el.firstElementChild; if (sc && t) sc.scrollTop = t.offsetTop - 70; } catch (e) {} }); },
      closeArea: () => { this.sfx('tap'); this.go({ screen: 'inicio', area: null }); },
      showTabs: (main && n.screen !== 'area') && !st.habEdit && !st.prog && !st.photos && !st.cap && !st.aspecto && !st.chatOpen,
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
      showBackupNudge: (m.sessions >= 1 || !!st.hp || Object.keys(st.flog || {}).length > 0 || Object.keys(st.hlog || {}).length > 0) && Date.now() - (st.prefs.lastBackup || 0) > 7 * 864e5 && Date.now() > (st.prefs.backupSnooze || 0),
      exportBackup: () => this.exportBackup(),
      importBackup: (e) => this.importBackup(e),
      snoozeBackup: () => { this.sfx('tap'); this.setPref('backupSnooze', Date.now() + 3 * 864e5); },

      q: this.quizVals(th.inv, th.onInv, th),
      pesoActual: String(this.peso()).replace('.', ','),
      v: vv.v, vb: vv.vb, cele: vv.cele,
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
      this._gm = null;   // vuelve a preguntar a Google qué modelos acepta la clave
      await this.aiJSON('Responde solo este JSON: {"ok":true}', null);
      this.setState({ aiBusy: false, aiOk: true, aiMsg: 'Conexión lista con ' + (this._aiLast || 'la IA') + '. Ya puedes usarla en Comida, Fotos y con tu entrenador.' });
      this.sfx('done');
    } catch (e) {
      // aquí sí va el motivo original: es lo que sirve para saber qué pasa con la clave
      const det = e && e.detail && e.message !== 'otro' ? ' Detalle: ' + e.detail : '';
      this.setState({ aiBusy: false, aiOk: false, aiMsg: this.aiErrorText(e) + det });
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
