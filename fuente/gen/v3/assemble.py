import json, os
H = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(H, 'parts.json')))
def rep(s, a, b, n=1):
    assert s.count(a) == n, (a[:80], s.count(a))
    return s.replace(a, b)

# --- parches a bloques reutilizados
P['session'] = rep(P['session'], "this.sfx('shield');", "this.sfx('bell');")
P['session'] = rep(P['session'], "hasImg: !!p.img,", "hasImg: !!p.img, k: p.k || '',")
P['session'] = rep(P['session'], "setTimeout(() => this.sfx('stats'), 150);", "setTimeout(() => this.sfx('done'), 150);")
P['datos'] = rep(P['datos'], "Opcional. Si no sales a caminar, no afecta tu racha.", "Opcional. Suma minutos de cardio a tu semana.")
P['idb'] = rep(P['idb'], "data: this.snapshot() });", "data: this.backupData() });")
P['idb'] = P['idb'] + '''

  backupData() {
    const s = this.snapshot();
    s.prefs = Object.assign({}, s.prefs);
    delete s.prefs.ai;
    delete s.prefs.pushKeys;
    return s;
  }'''
P['quizvals'] = rep(P['quizvals'], "        line: o.i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',",
    "        line: o.i ? ('inset 0 0.5px 0 ' + th.sep) : 'none',\n        bg: o.selected ? primary : th.card, fg: o.selected ? onPrimary : th.text, subFg: o.selected ? onPrimary : th.sub,")
P['quizvals'] = rep(P['quizvals'], "La intensidad ajusta las calorías y la experiencia.' : 'Ajusta las calorías y la experiencia que ganas.'",
    "La intensidad ajusta la energía estimada y tu recuperación.' : 'Ajusta la energía estimada y tu recuperación.'")
P['quizvals'] = rep(P['quizvals'], "subFg: sel ? onPrimary : th.sub, pick", "subFg: sel ? onPrimary : th.sub, pick")

h = P['habits']
h = rep(h, """{ id: 'proteina', name: 'Proteína', kind: 'num', unit: 'comidas', step: 1, goal: 3, min: 1, max: 6, color: 'fuerza', def: false,""",
           """{ id: 'proteina', name: 'Meta de proteína', kind: 'food', color: 'fuerza', def: false,""")
h = rep(h, "desc: 'Comidas con 2 palmas de proteína, como dice tu plan.',", "desc: 'Se marca sola con lo que registras en Comida.',")
h = rep(h, """    const d = (st.hlog || {})[key] || {};
    const mini = !!d[h.id + '~'];""", """    if (h.kind === 'food') { const t = this.targets().prot; return Math.min(1, this.dayTotals(key).p / t); }
    const d = (st.hlog || {})[key] || {};
    const mini = !!d[h.id + '~'];""")
h = rep(h, "      if (h.kind === 'auto') status = met ? 'Sesión completada' : 'Toca entrenar hoy';",
           "      if (h.kind === 'auto') status = met ? 'Sesión completada' : 'Toca entrenar hoy';\n      else if (h.kind === 'food') status = Math.round(this.dayTotals(key).p) + ' de ' + this.targets().prot + ' g';")
h = rep(h, "        hasStreak: streak > 1, streak: streak,", "        hasStreak: false, streak: streak, hasBar: h.kind === 'num' || h.kind === 'food',")
h = rep(h, "isAuto: h.kind === 'auto',", "isAuto: h.kind === 'auto' || h.kind === 'food',")
h = rep(h, "        checkBg: met ? c[h.color] : th.segBg, checkFg: met ? (dark ? '#000000' : '#FFFFFF') : th.tertiary,",
           "        checkBg: met ? th.inv : th.fill, checkFg: met ? th.onInv : th.tertiary,")
h = rep(h, "title: total ? (done === total ? 'Día completo' : 'Vas al ' + Math.round(score * 100) + '%') : 'Sin hábitos',",
           "title: total ? (done === total ? 'Día completo' : 'Vas al ' + Math.round(score * 100) + ' %') : 'Sin hábitos',")
h = rep(h, "sub: total ? (left === 0 ? 'Este día queda en el verde más oscuro del historial.' : 'Te faltan ' + left + (left === 1 ? ' hábito' : ' hábitos') + ' para el verde más oscuro.') : 'Elige qué hábitos seguir.',",
           "sub: total ? (left === 0 ? 'Cumpliste todos tus hábitos de hoy.' : 'Te faltan ' + left + (left === 1 ? ' hábito' : ' hábitos') + ' para completar el día.') : 'Elige qué hábitos seguir.',")
h = rep(h, "on: on, track: on ? c.constancia : th.segBg, knob: on ? 20 : 0,", "on: on, track: on ? th.text : th.segBg, knob: on ? 20 : 0,")
h = rep(h, "id: id, label: label, desc: desc, on: r[id].on, track: r[id].on ? c.constancia : th.segBg,", "id: id, label: label, desc: desc, on: r[id].on, track: r[id].on ? th.text : th.segBg,")

h = rep(h, "  pushSupported() {\n", "  pushSupported() {\n    if (this.isNative()) return true;\n")
h = rep(h, "  isStandalone() {\n", "  isStandalone() {\n    if (this.isNative()) return true;\n")
h = rep(h, "  async enablePush() {\n", "  async enablePush() {\n    if (this.isNative()) return this.nativeEnable();\n")
h = rep(h, "    this.setState({ prefs: p }, () => this.persist());\n  }\n\n  hhmm(", "    this.setState({ prefs: p }, () => { this.persist(); if (this.isNative()) this.nativeSchedule(); });\n  }\n\n  hhmm(")
h = rep(h, "    const active = !!st.prefs.pushSub;\n", "    const nat = this.isNative();\n    const active = !!st.prefs.pushSub && (!nat || !!st.prefs.pushSub.native);\n")
h = rep(h, "      active: active, inactive: !active,\n", "      active: active && !nat, inactive: !active,\n")
h = rep(h, "      dirty: active && !!st.prefs.remDirty,\n", "      dirty: active && !nat && !!st.prefs.remDirty,\n")
P['habits'] = h

P['mount'] = rep(P['mount'], "    this.syncTicker();\n  }", "    this.syncTicker();\n    if (this.isNative()) setTimeout(() => this.nativeSchedule(), 1500);\n  }")
core = open(os.path.join(H, 'core.js')).read()
core = rep(core, "          ready: this.readyText(Math.round((RH[m.name] || 48) * TI * (0.6 + 0.4 * Math.min(1, m.w)) * 0.66)).replace('Listo en', 'Listo en unas'),",
                 "          ready: this.readyText(Math.round((RH[m.name] || 48) * TI * (0.6 + 0.4 * Math.min(1, m.w)) * 0.66)),")
M = {'MOUNT': 'mount', 'DERIVED': 'derived', 'IDB': 'idb', 'PERSIST': 'persist', 'AUDIO': 'audio', 'SEG': 'seg', 'SESSION': 'session',
     'DATOS': 'datos', 'DATES': 'dates', 'PESO': 'peso', 'FMT': 'fmt', 'GOPREF': 'gopref', 'QUIZPICK': 'quizpick', 'HOME': 'home',
     'HABITS': 'habits', 'MIX': 'mix', 'QUIZVALS': 'quizvals'}
for k, v in M.items():
    core = rep(core, '%%' + k + '%%', P[v])
for k, f in (('FOOD', 'food.js'), ('HEALTH', 'health.js'), ('RENDER', 'render.js')):
    core = rep(core, '%%' + k + '%%', open(os.path.join(H, f)).read() + (open(os.path.join(H, 'native.js')).read() if k == 'RENDER' else ''))
assert '%%' not in core.replace('%%SESSION%%', '') or True
core = core.replace('Respaldo de sprout', 'Respaldo de keystone').replace('respaldo de sprout', 'respaldo de keystone').replace('Notificaciones, sprout.', 'Notificaciones, keystone.').replace("'rutina-respaldo-'", "'keystone-respaldo-'")
open(os.path.join(H, '..', 'script3.js'), 'w').write(core)
print('ok', core.count('\n'))
