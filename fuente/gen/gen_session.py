import sys, os, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'fuente'))
import contenido as C

POSES = json.load(open(os.path.join(HERE, 'poses', 'meta.json')))

# Qué dibujo acompaña a cada indicación cuando la regla general no calza (1, 2… = posición del PDF;
# '2s' = la última posición sola, sin la anterior en gris ni flecha). Con pares (dibujo, texto) las páginas
# llevan ese texto en vez de las indicaciones, para repartir en varias posiciones una indicación que las junta.
# Regla general: con una sola indicación, la última posición (trae la anterior en gris); con varias, las
# primeras van con la posición 1 y la última con la final.
FIGS = {
    ('LUNES', 'remo_marco'): ['2s', 1, 2],
    ('JUEVES', 'remo_marco'): [2, 1],
    ('LUNES', 'ytw'): [(1, 'Boca abajo en el mat, con la frente apoyada. Levanta los brazos 3–5 cm del suelo formando una Y, con los pulgares hacia arriba.'),
                       (2, 'Luego forma una T.'), (3, 'Y luego una W. Aprieta los omóplatos 2 s en cada letra.')],
    ('MIE_POSTURA', 'ytw'): [(1, 'Brazos en Y, 3–5 cm sobre el suelo.'), (2, 'Luego en T.'), (3, 'Y luego en W.')],
    ('WARMUP', 'gato_vaca'): [(1, 'Redondea la espalda, despacio.'), (2, 'Luego húndela, despacio.')],
    ('MIE_POSTURA', 'gato_vaca'): [(1, 'Redondea la espalda mirando al ombligo.'), (2, 'Luego húndela mirando al frente.')],
    ('LUNES', 'deadbug'): [1, 2, 1],
    ('MARTES', 'sentadilla'): [1, 2, 1],
    ('MARTES', 'zancada_atras'): [2, '2s', 1],
    ('MARTES', 'puente'): [1, 2, '2s'],
    ('MARTES', 'pm_rumano'): [1, 2, '2s'],
    ('MARTES', 'bird_dog'): [1, 2, 1],
    ('JUEVES', 'flex_suelo'): [1, 2, 1],
    ('JUEVES', 'jalon_suelo'): [1, 2, 1],
    ('VIERNES', 'sumo'): [1, 2, 1],
    ('VIERNES', 'puente_isquios'): [1, 2, 1],
}
USED = set()
VIEWS = {'el dibujo es visto desde arriba': 'Vista desde arriba', 'el dibujo es visto de frente': 'Vista de frente'}


def pages_for(key, how, figs=None):
    """Una página por indicación, cada una con su dibujo. Si todas usan el mismo dibujo, queda una sola página."""
    m = POSES[key]
    n, h = m['panels'], len(how)
    if figs is None:
        if h == 1:
            assert n == 1 or m['ghost'][-1], f'{key}: una indicación y {n} posiciones sueltas; elige sus dibujos en FIGS'
            figs = [n]
        else:
            figs = [n if i == h - 1 else (i * (n - 1)) // (h - 1) + 1 for i in range(h)]
    if all(isinstance(f, tuple) for f in figs):
        figs, how = [f[0] for f in figs], [f[1] for f in figs]
    assert len(figs) == len(how), (key, figs, how)
    pages = []
    for r, text in zip(figs, how):
        assert str(r) in m['files'], (key, r)
        pages.append({'figs': [f'img/p/{key}-{r}.svg'], 'lines': [text]})
    if len({tuple(pg['figs']) for pg in pages}) == 1:
        pages = [{'figs': pages[0]['figs'], 'lines': [t for pg in pages for t in pg['lines']]}]
    return pages


def view_of(key):
    """La vista del dibujo (desde arriba, de frente) sale de la nota que trae alguna indicación del ejercicio."""
    for lst in (C.WARMUP, C.COOLDOWN, C.LUNES, C.MARTES, C.MIE_INTERVALOS, C.MIE_CORE, C.MIE_POSTURA, C.JUEVES, C.VIERNES):
        for c in lst:
            if c['ex'] == key:
                for h in c['how']:
                    for k, v in VIEWS.items():
                        if k in h:
                            return v
    return None


def clean(s):
    if not s:
        return None
    s = re.sub(r'\s*\(pág\. \d+\)', '', s)
    s = re.sub(r'\s*\((?:el dibujo|la línea)[^)]*\)', '', s)
    s = s.strip()
    return s[0].upper() + s[1:] if s else None


def secs(rest):
    if not rest:
        return None
    m = re.match(r'(\d+)\s*s', rest)
    return int(m.group(1)) if m else None


def step(c, phase, main=False, extra=None, day=None):
    key = c['ex']
    m = re.match(r'(\d+)\s*×', c['dose'])
    how = [clean(h) for h in c['how']]
    if (day, key) in FIGS:
        USED.add((day, key))
    d = {
        'k': key, 'pages': pages_for(key, how, FIGS.get((day, key))), 'view': view_of(key),
        'phase': phase, 'name': c['name'], 'dose': c['dose'],
        'rest': secs(c.get('rest')), 'works': c.get('works'),
        'how': how, 'watch': clean(c.get('watch')),
        'easier': clean(c.get('easier')), 'harder': clean(c.get('harder')), 'tip': clean(c.get('tip')),
        'sets': int(m.group(1)) if (main and m) else 0,
    }
    if extra:
        d.update(extra)
    return d


def strength(day, legs):
    w = [step(dict(c, how=[h for h in c['how'] if not h.startswith('Solo los días de piernas')] or c['how']), 'Calentamiento', day='WARMUP')
         for c in C.WARMUP if legs or c['ex'] != 'balanceo_pierna']
    mainx = [step(c, 'Ejercicios', main=True, day=day) for c in getattr(C, day)]
    cool = [step(c, 'Cierre de postura', day='COOLDOWN') for c in C.COOLDOWN]
    return w + mainx + cool


cardio = [{
    'k': 'marcha', 'view': None, 'phase': 'Cardio',
    'name': 'Caminata rápida', 'dose': '35–40 min', 'rest': None, 'works': 'Corazón y piernas',
    'how': ['Semanas 1 a 4: camina rápido, a un ritmo en que puedes hablar pero no cantar.',
            'Desde la semana 5: 20 min de intervalos y 15 min caminando.',
            'Intervalos: 30 s de trabajo y 30 s de descanso con sentadilla + talones, escalador lento, zancada atrás y boxeo de sombra, en rueda, 4 a 5 vueltas.'],
    'watch': None, 'easier': None, 'harder': 'Desde la semana 9, si tus rodillas van bien, suma saltos.',
    'tip': 'Si ese día grabas casas caminando, también cuenta.', 'sets': 0}]
cardio[0]['pages'] = pages_for('marcha', cardio[0]['how'])
core = []
for r in range(1, 4):
    for c in C.MIE_CORE:
        core.append(step(c, 'Core', extra={'round': f'Vuelta {r} de 3'}, day='MIE_CORE'))
    if r < 3:
        core.append({'k': 'rest', 'pages': [], 'view': None, 'phase': 'Core', 'name': 'Descanso entre vueltas', 'dose': '1 min',
                     'rest': 60, 'auto': 60, 'works': None, 'how': [], 'watch': None, 'easier': None, 'harder': None,
                     'tip': None, 'sets': 0, 'round': f'Antes de la vuelta {r + 1}'})
postura = [step(c, 'Postura', day='MIE_POSTURA') for c in C.MIE_POSTURA]
_walk = ['Camina a paso firme por la Costanera.', 'Es opcional: si no sales, tu racha no cambia.']
walk = [dict(cardio[0], name='Caminata larga', dose='45–60 min', works='Corazón y piernas',
             how=_walk, pages=pages_for('marcha', _walk), harder=None, tip=None)]

S = {
    'superiorA': strength('LUNES', False), 'piernasA': strength('MARTES', True), 'cardio': cardio + core + postura,
    'superiorB': strength('JUEVES', False), 'piernasB': strength('VIERNES', True), 'caminata': walk,
}
json.dump(S, open(os.path.join(HERE, 'session.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
# escalera de progresión y lo que viene más adelante, para la pantalla Progreso
# catálogo de la rutina adaptativa: cada ejercicio con series (de los días y las variantes) listo para entrar a una sesión
CAT = {}
for day in ('LUNES', 'MARTES', 'JUEVES', 'VIERNES', 'VARIANTES'):
    for c in getattr(C, day):
        if c['ex'] not in CAT:
            CAT[c['ex']] = step(c, 'Ejercicios', main=True, day=day if day != 'VARIANTES' else None)
for g, keys in C.ESCALERAS.items():
    for k in keys:
        assert k in CAT, ('escalera sin ejercicio en el catálogo', g, k)
json.dump({'ladder': [list(x) for x in C.LADDER], 'later': [list(x) for x in C.MAS_ADELANTE], 'catalog': CAT, 'groups': C.ESCALERAS},
          open(os.path.join(HERE, 'program.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in S.items()}, os.path.getsize(os.path.join(HERE, 'session.json')))
print(json.dumps(S['superiorA'][8], ensure_ascii=False, indent=1))
assert USED == set(FIGS), set(FIGS) - USED  # cada elección de FIGS tiene que corresponder a un ejercicio de la sesión
