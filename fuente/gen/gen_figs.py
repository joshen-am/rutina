"""Builds one animated 'film strip' SVG per exercise by interpolating the PDF's poses."""
import sys, os, json, math, copy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'fuente'))
import figs
from ejercicios import EX
import contenido as C

FW, FH = 354, 300  # frame size (aspect 1.18, como el PDF)
STEPS = 7          # cuadros entre dos posiciones

RECOLOR = {
    '#1F2D4A': '#1C1C1E', '#9AA8BE': '#AEAEB2', '#E7EBF1': '#E5E5EA', '#B3BDCA': '#C7C7CC',
    '#CBD3DE': '#D1D1D6', '#4A5568': '#48484A', '#BAC3CF': '#D1D1D6', '#EEF1F5': '#F2F2F7',
    '#DDE4EE': '#E5E5EA', '#E4572E': '#FF9500', '#9AA6B8': '#8E8E93', '#5E6B7E': '#636366',
    '#8E99AA': '#8E8E93', '#F2B7A0': '#FFD3A8',
}


class Fake:
    def __init__(self, prims):
        self._p = prims

    def prims(self):
        return self._p


def same(a, b):
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x['k'] != y['k']:
            return False
        for f in ('p', 'pts'):
            if f in x and len(x[f]) != len(y.get(f, [])):
                return False
    return True


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_pt(p, q, t):
    return (lerp(p[0], q[0], t), lerp(p[1], q[1], t))


def interp(A, B, t):
    out = []
    for x, y in zip(A, B):
        z = dict(x)
        if 'p' in x:
            z['p'] = [lerp_pt(p, q, t) for p, q in zip(x['p'], y['p'])]
        if 'pts' in x:
            z['pts'] = [lerp_pt(p, q, t) for p, q in zip(x['pts'], y['pts'])]
        if x['k'] == 'circle':
            z['c'] = lerp_pt(x['c'], y['c'], t)
        if x['k'] == 'rect':
            for f in ('x0', 'y0', 'x1', 'y1'):
                z[f] = lerp(x[f], y[f], t)
        out.append(z)
    return out


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def frames_for(key):
    ex = EX[key]
    panels = ex['panels']
    seq = []  # list of (pose_prims, props, front, guides)
    if len(panels) == 1 and panels[0].get('ghost') is not None:
        pn = panels[0]
        seq = [(pn['ghost'].prims(), pn.get('props', []), pn.get('front', []), pn.get('guides', [])),
               (pn['pose'].prims(), pn.get('props', []), pn.get('front', []), pn.get('guides', []))]
    else:
        seq = [(pn['pose'].prims(), pn.get('props', []), pn.get('front', []), pn.get('guides', [])) for pn in panels]
    if len(seq) == 1:
        return [seq[0]], 1
    frames = []
    for i in range(len(seq) - 1):
        a, b = seq[i], seq[i + 1]
        ok = same(a[0], b[0]) and same(a[1], b[1]) and same(a[2], b[2])
        for s in range(STEPS):
            t = ease(s / STEPS)
            if ok:
                frames.append((interp(a[0], b[0], t), interp(a[1], b[1], t), interp(a[2], b[2], t), a[3] if t < 0.5 else b[3]))
            else:
                frames.append(a if t < 0.5 else b)
    frames.append(seq[-1])
    return frames, len(seq)


def sprite(key):
    frames, poses = frames_for(key)
    ex = dict(EX[key])
    ex['panels'] = [dict(pose=Fake(f[0]), props=f[1], front=f[2], guides=f[3]) for f in frames]
    svgs = figs.render(ex)
    n = len(svgs)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n * FW} {FH}" width="{n * FW}" height="{FH}">']
    for i, s in enumerate(svgs):
        parts.append(s.replace('<svg xmlns="http://www.w3.org/2000/svg" ', f'<svg x="{i * FW}" y="0" width="{FW}" height="{FH}" ', 1))
    parts.append('</svg>')
    out = ''.join(parts)
    for a, b in RECOLOR.items():
        out = out.replace(a, b)
    return out, n, poses


keys = []
for lst in (C.WARMUP, C.COOLDOWN, C.LUNES, C.MARTES, C.MIE_INTERVALOS, C.MIE_CORE, C.MIE_POSTURA, C.JUEVES, C.VIERNES):
    for c in lst:
        if c['ex'] not in keys:
            keys.append(c['ex'])
meta = {}
os.makedirs(os.path.join(HERE, 'sprites'), exist_ok=True)
for k in keys:
    svg, n, poses = sprite(k)
    open(os.path.join(HERE, 'sprites', k + '.svg'), 'w').write(svg)
    meta[k] = {'frames': n, 'poses': poses}
json.dump(meta, open(os.path.join(HERE, 'sprites', 'meta.json'), 'w'), indent=1)
print(len(keys), 'sprites')
print({k: v['frames'] for k, v in meta.items()})
