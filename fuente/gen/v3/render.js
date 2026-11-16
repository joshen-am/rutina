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

    /* «Hoy» en Inicio: tres anillos (hábitos, comida, agua) que llevan a su pestaña */
    const RC = 188.5;
    const ring3 = (f) => (RC * (1 - Math.max(0, Math.min(1, f)))).toFixed(1);
    const wv = hdv.water;
    const kf = T.kcal ? tt.kcal / T.kcal : 0;
    const ty = {
      habits: { off: ring3(score), center: hdv.done + '/' + hdv.total, label: 'Hábitos', sub: hdv.total ? (hdv.done === hdv.total ? 'Día completo' : 'Te faltan ' + (hdv.total - hdv.done)) : 'Sin hábitos', color: c.constancia },
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
      hasHint: !!ai.key && (isG ? !/^AIza/.test(ai.key) : !/^sk-ant-/.test(ai.key)),
      hint: isG ? 'Las claves de Google AI Studio empiezan con AIza. Revisa que copiaste la clave y no otro dato.' : 'Las claves de Anthropic empiezan con sk-ant-. Revisa que copiaste la clave completa.',
      ph: isG ? 'Pega tu clave de Google AI Studio' : 'Pega tu clave de Anthropic (sk-ant-…)',
      modelPh: isG ? 'gemini-flash-latest' : 'claude-haiku-5-5',
      url: isG ? 'https://aistudio.google.com/apikey' : 'https://console.anthropic.com/settings/keys',
      help: isG ? 'Gemini tiene un plan gratis: crea una clave en Google AI Studio y pégala aquí. En el plan gratis Google puede usar las fotos para mejorar sus modelos.' : 'Claude cobra por uso (menos de un peso por foto) y no usa tus datos para entrenar. Crea una clave en la consola de Anthropic.',
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
      fd: fdv, fh: fh, hs: hv, hv: hv, ai: aiv, ty: ty, pg: pgv, hasNoFocusHere: false, isProg: !!st.prog && n.screen !== 'area',
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
