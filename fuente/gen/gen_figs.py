"""Dibuja cada posición clave de cada ejercicio como un SVG fijo para la tarjeta negra de la sesión.

Escribe poses/<clave>-<n>.svg (n = 1, 2… en el orden del PDF) y, si la última posición trae la
anterior en gris o una flecha, también poses/<clave>-<n>s.svg con esa posición sola. Todas las
posiciones de un ejercicio comparten encuadre, así que al pasar de un paso a otro el cuerpo no salta.
Desde la versión 24 se pintan en el estilo «Escaneo» (fuente/escaneo.py): el cuerpo hecho de puntos.
"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'fuente'))
import escaneo
from ejercicios import EX
import contenido as C


def poses(key):
    ex = dict(EX[key])
    pans = list(ex['panels'])
    last = pans[-1]
    extra = last.get('ghost') is not None or bool(last.get('arrows'))
    if extra:
        ex['panels'] = pans + [dict(last, ghost=None, arrows=[])]
    svgs = escaneo.render(ex)
    names = [str(i + 1) for i in range(len(pans))] + ([f'{len(pans)}s'] if extra else [])
    return dict(zip(names, svgs)), len(pans)


keys = []
for lst in (C.WARMUP, C.COOLDOWN, C.LUNES, C.MARTES, C.MIE_INTERVALOS, C.MIE_CORE, C.MIE_POSTURA, C.JUEVES, C.VIERNES, C.VARIANTES):
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
