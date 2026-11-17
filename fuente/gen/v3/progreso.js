
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
