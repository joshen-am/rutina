import sys, os, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'fuente'))
import contenido as C

URL = dict(
 angeles='423a65b968a80e8c6e7381c115a55196', balanceo_pierna='a334ef6a74cad11257e562f82629c52b', bird_dog='12fd10cf2e66600e5af18f7bfb44f43f',
 boxeo='dc1fbd2219c47a9a9f9a88b436a5e5c4', chin_tuck='411151937fc51529b9ceac8db2821198', circulos_brazos='d51023a93419759626eb39faebd6a429',
 circulos_cadera='fa0e4b974a479875826b88502512a2e2', crunch_invertido='0d47ec4e55036bbcccd68f14d8030127', curl='cd3d071350a9c92bdc323fe7ef51a697',
 curl_martillo='8fe03545672ece8206935661b2077006', deadbug='86600e83c42934cc7c26557938b1f0fa', elev_piernas='12cb86c12adbecee089df9eafa2d1609',
 escalador='4f358430b33b2c49f09043a10708cafc', escapular_pared='18dec31bd4ef841e9e706cc594534c8b', esfinge='fcf58f9f4015445c1254562343fd9628',
 flex_pica='dcf04991a70fda450d243d331beb3d10', flex_rodillas='c436f8de1440fd9ee2d0a22e03b4b2f9', flex_suelo='a9383a03a60fa936b1b2f8252d3a2ac9',
 flexor_cadera='74ab478a9d5483894d51bc56a1599fc3', fondo_suelo='a5290b23e9e861e627cbd66b5b014c80', gato_vaca='ea7ef7defad986cc29784056ca6a0f46',
 hollow='49bc2d6997a6987935915645a68f6184', jalon_suelo='abb8eb1cd1662d423955f94e5f584ff4', laterales='8068272eb72829777275b0350d1d51f8',
 marcha='cdeffaedb67f449e8cd79593528537e8', pecho_marco='7136158b46346bc5480c11d1638f7f07', plancha='847564b2338ccd10c576f6dc2c57b83d',
 plancha_lateral='4745aed7451c49648bdb2f8b4b36eb0f', pm_rumano='c5dde435723405e72ece3ad0dd459915', puente='e56d827e70e0a2bb2fa363b1b8bc3e3a',
 puente_isquios='3bee4826365a03d60640ca15550e46e6', puente_una2='b96d941a9dac2ae345644bff1b8e99a6', remo_marco='c7791d8fc003c6398edb22e607e067c1',
 sentadilla='061043b489ded641bad09cdcfe5a6092', sentadilla_pared='40740c35baa343e453ec5be139185c69', sentadilla_talones='e37afff89356f066bef0c376d2da1d35',
 sumo='365f6b01115fcfdfb72cd9073b7524aa', talones_suelo='d3b7e7de83c2aafd0cc30a4957c1a363', triceps='51e85138d96653a44869d6c522695129',
 ytw='6dd3f6407877022ab6cd9f4b84e689e4', zancada_atras='27cce992ae38b9afe6496e8787c5ba9f', zancada_estatica='5178f42078bc3f4e76e3ccbbbe9d363a')
META = json.load(open(os.path.join(HERE, 'sprites', 'meta.json')))


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


def step(c, phase, main=False, extra=None):
    key = c['ex']
    m = re.match(r'(\d+)\s*×', c['dose'])
    d = {
        'k': key, 'img': '/_blob/' + URL[key], 'n': META[key]['frames'], 'poses': META[key]['poses'],
        'phase': phase, 'name': c['name'], 'dose': c['dose'],
        'rest': secs(c.get('rest')), 'works': c.get('works'),
        'how': [clean(h) for h in c['how']], 'watch': clean(c.get('watch')),
        'easier': clean(c.get('easier')), 'harder': clean(c.get('harder')), 'tip': clean(c.get('tip')),
        'sets': int(m.group(1)) if (main and m) else 0,
    }
    if extra:
        d.update(extra)
    return d


def strength(day, legs):
    w = [step(c, 'Calentamiento') for c in C.WARMUP if legs or c['ex'] != 'balanceo_pierna']
    w = [dict(s, how=[h for h in s['how'] if not h.startswith('Solo los días de piernas')] or s['how']) for s in w]
    mainx = [step(c, 'Ejercicios', main=True) for c in day]
    cool = [step(c, 'Cierre de postura') for c in C.COOLDOWN]
    return w + mainx + cool


cardio = [{
    'k': 'marcha', 'img': '/_blob/' + URL['marcha'], 'n': 1, 'poses': 1, 'phase': 'Cardio',
    'name': 'Caminata rápida', 'dose': '35–40 min', 'rest': None, 'works': 'Corazón y piernas',
    'how': ['Semanas 1 a 4: camina rápido, a un ritmo en que puedes hablar pero no cantar.',
            'Desde la semana 5: 20 min de intervalos y 15 min caminando.',
            'Intervalos: 30 s de trabajo y 30 s de descanso con sentadilla + talones, escalador lento, zancada atrás y boxeo de sombra, en rueda, 4 a 5 vueltas.'],
    'watch': None, 'easier': None, 'harder': 'Desde la semana 9, si tus rodillas van bien, suma saltos.',
    'tip': 'Si ese día grabas casas caminando, también cuenta.', 'sets': 0}]
core = []
for r in range(1, 4):
    for c in C.MIE_CORE:
        core.append(step(c, 'Core', extra={'round': f'Vuelta {r} de 3'}))
    if r < 3:
        core.append({'k': 'rest', 'img': None, 'n': 0, 'poses': 0, 'phase': 'Core', 'name': 'Descanso entre vueltas', 'dose': '1 min',
                     'rest': 60, 'auto': 60, 'works': None, 'how': [], 'watch': None, 'easier': None, 'harder': None,
                     'tip': None, 'sets': 0, 'round': f'Antes de la vuelta {r + 1}'})
postura = [step(c, 'Postura') for c in C.MIE_POSTURA]
walk = [dict(cardio[0], name='Caminata larga', dose='45–60 min', works='Corazón y piernas',
             how=['Camina a paso firme por la Costanera.', 'Es opcional: si no sales, tu racha no cambia.'], harder=None, tip=None)]

S = {
    'superiorA': strength(C.LUNES, False), 'piernasA': strength(C.MARTES, True), 'cardio': cardio + core + postura,
    'superiorB': strength(C.JUEVES, False), 'piernasB': strength(C.VIERNES, True), 'caminata': walk,
}
json.dump(S, open(os.path.join(HERE, 'session.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in S.items()}, os.path.getsize(os.path.join(HERE, 'session.json')))
print(json.dumps(S['superiorA'][8], ensure_ascii=False, indent=1))
