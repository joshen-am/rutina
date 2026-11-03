
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
