"""Dibuja cada posición clave de cada ejercicio como un SVG fijo para la tarjeta negra de la sesión.

Escribe poses/<clave>-<n>.svg (n = 1, 2… en el orden del PDF) y, si la última posición trae la
anterior en gris o una flecha, también poses/<clave>-<n>s.svg con esa posición sola. Todas las
posiciones de un ejercicio comparten encuadre, así que al pasar de un paso a otro el cuerpo no salta.
"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'fuente'))
import figs
from ejercicios import EX
import contenido as C

# La tarjeta es negra en los dos temas: cuerpo claro, lado lejano en gris, objetos en grises oscuros
DARK = {
    '#1F2D4A': '#F4F4F5', '#9AA8BE': '#6B6B74', '#E4572E': '#FF9F0A', '#E7EBF1': '#232328', '#B3BDCA': '#8A8A93',
    '#CBD3DE': '#46464E', '#4A5568': '#A1A1AA', '#BAC3CF': '#3A3A41', '#EEF1F5': '#141416', '#F2B7A0': '#7A5446',
    '#DDE4EE': '#2C2C32', '#9AA6B8': '#6B6B74', '#5E6B7E': '#A1A1AA', '#8E99AA': '#6B6B74',
}


def dark(svg):
    svg = svg.replace('fill="#FFFFFF"', 'fill="#0B0B0C"')  # ojo y centro de las mancuernas
    svg = svg.replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg xmlns="http://www.w3.org/2000/svg" width="354" height="300" ', 1)
    for a, b in DARK.items():
        svg = svg.replace(a, b)
    return svg


def poses(key):
    ex = dict(EX[key])
    pans = list(ex['panels'])
    last = pans[-1]
    extra = last.get('ghost') is not None or bool(last.get('arrows'))
    if extra:
        ex['panels'] = pans + [dict(last, ghost=None, arrows=[])]
    svgs = figs.render(ex)
    names = [str(i + 1) for i in range(len(pans))] + ([f'{len(pans)}s'] if extra else [])
    return dict(zip(names, (dark(s) for s in svgs))), len(pans)


keys = []
for lst in (C.WARMUP, C.COOLDOWN, C.LUNES, C.MARTES, C.MIE_INTERVALOS, C.MIE_CORE, C.MIE_POSTURA, C.JUEVES, C.VIERNES):
    for c in lst:
        if c['ex'] not in keys:
            keys.append(c['ex'])
OUT = os.path.join(HERE, 'poses')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
meta = {}
for k in keys:
    files, n = poses(k)
    for name, svg in files.items():
        open(os.path.join(OUT, f'{k}-{name}.svg'), 'w').write(svg)
    meta[k] = {'panels': n, 'ghost': [pn.get('ghost') is not None for pn in EX[k]['panels']], 'files': sorted(files)}
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
print(len(keys), 'ejercicios,', sum(len(m['files']) for m in meta.values()), 'dibujos')
