"""Estilo «Escaneo» de los dibujos de ejercicios: el cuerpo hecho de puntos, como una lectura de escáner.

Toma las mismas poses y el mismo encuadre de figs.py y solo cambia cómo se pintan:
- el cuerpo se rellena con una trama de puntos blancos (el lado lejano más tenue, la posición anterior casi apagada);
- las mancuernas, en trazo fino blanco, para que no se pierdan entre los puntos;
- paredes, marcos, colchonetas y muebles, en filete fino y casi transparente;
- las flechas, en línea punteada fina con una punta abierta;
- el suelo, una fila de puntos.
Todo va en blanco sobre la tarjeta negra, sin color: el color lo pone el halo de la tarjeta.
"""
import math
import figs
from figs import fy

W = '#FAFAFA'
SCREEN_PITCH = 4.0   # distancia entre puntos en la pantalla (px CSS, la tarjeta mide 354 de ancho)
DOT_RATIO = 0.35     # radio del punto respecto de esa distancia
NEAR, FAR, METAL = figs.NEAR, figs.FAR, figs.METAL
SKIP_FILLS = ('#FFFFFF', '#9AA6B8')   # ojo y centro de las mancuernas
PROP_STROKE = 'rgba(250,250,250,0.2)'
PROP_FILL = 'rgba(250,250,250,0.03)'


def frame(ex):
    """Capas por panel y caja común, con la misma lógica de encuadre que figs.render."""
    panels = ex['panels']
    floor = ex.get('floor', True)
    layers, allp = [], []
    for pn in panels:
        L = [('props', pn.get('props', []))]
        if pn.get('ghost') is not None:
            L.append(('ghost', pn['ghost'].prims()))
        L += [('pose', pn['pose'].prims()), ('front', pn.get('front', [])),
              ('guides', pn.get('guides', [])), ('arrows', pn.get('arrows', []))]
        layers.append(L)
        for name, prs in L:
            if pn.get('fit_ignore_props') and name == 'props':
                continue
            allp += prs
    if ex.get('vb'):
        return layers, tuple(ex['vb']), floor
    bx0, by0, bx1, by1 = figs.bbox(allp)
    w = bx1 - bx0 + 18
    h = by1 - by0 + 22
    asp = ex.get('aspect', figs.ASPECT)
    w = max(w, figs.MIN_W * ex.get('scale', 1.0), h * asp)
    h = w / asp
    cx = (bx0 + bx1) / 2
    x0, x1 = cx - w / 2, cx + w / 2
    y0 = min(-9, by0 - 6) if floor else (by0 + by1) / 2 - h / 2
    y1 = max(y0 + h, by1 + 6)
    return layers, (x0, y0, x1, y1), floor


def _line(a, b, c, w, cap='round', extra=''):
    (x1, y1), (x2, y2) = fy(a), fy(b)
    return (f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{c}" '
            f'stroke-width="{w}" stroke-linecap="{cap}"{extra}/>')


def _pts(pts):
    return ' '.join(f'{x:.2f},{y:.2f}' for x, y in (fy(q) for q in pts))


def _arrow(pts):
    P = [fy(q) for q in pts]
    d = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in P)
    (xa, ya), (xb, yb) = P[-2], P[-1]
    L = math.hypot(xb - xa, yb - ya) or 1
    ux, uy = (xb - xa) / L, (yb - ya) / L
    tip = (xb + ux * 2, yb + uy * 2)
    hd = 5.0
    h1 = (tip[0] - ux * hd - uy * hd * 0.8, tip[1] - uy * hd + ux * hd * 0.8)
    h2 = (tip[0] - ux * hd + uy * hd * 0.8, tip[1] - uy * hd - ux * hd * 0.8)
    return (f'<g opacity="0.85" fill="none" stroke="{W}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="{d}" stroke-dasharray="3 3"/>'
            f'<path d="M{h1[0]:.2f} {h1[1]:.2f} L{tip[0]:.2f} {tip[1]:.2f} L{h2[0]:.2f} {h2[1]:.2f}"/></g>')


def _prop(p):
    k = p['k']
    if k == 'rect':
        return (f'<rect x="{p["x0"]:.2f}" y="{-p["y1"]:.2f}" width="{p["x1"] - p["x0"]:.2f}" height="{p["y1"] - p["y0"]:.2f}" '
                f'rx="{min(p["rx"], 3)}" fill="{PROP_FILL}" stroke="{PROP_STROKE}" stroke-width="1"/>')
    if k == 'line':
        return _line(p['p'][0], p['p'][1], PROP_STROKE, 1, 'butt')
    if k == 'circle':
        x, y = fy(p['c'])
        if p.get('fill') == '#FFFFFF':
            return ''
        return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{p["r"]}" fill="none" stroke="{PROP_STROKE}" stroke-width="1"/>'
    if k == 'poly':
        return f'<polygon points="{_pts(p["pts"])}" fill="none" stroke="{PROP_STROKE}" stroke-width="1" stroke-linejoin="round"/>'
    return ''


def _color(p):
    return p.get('c') if p['k'] in ('line', 'qpath', 'poly') else p.get('fill')


def _body(prs, n, box, opacity):
    """Cuerpo en una máscara rellena con la trama; las mancuernas en trazo fino encima."""
    x0, y0, x1, y1 = box
    mask, metal = [], []
    for p in prs:
        c = _color(p)
        k = p['k']
        if c == METAL:
            if k == 'line':
                metal.append(_line(p['p'][0], p['p'][1], W, 1.2, 'butt', ' opacity="0.9"'))
            elif k == 'poly':
                metal.append(f'<polygon points="{_pts(p["pts"])}" fill="none" stroke="{W}" stroke-width="1.2" opacity="0.9" stroke-linejoin="round"/>')
            continue
        if c in SKIP_FILLS:
            continue
        g = '#FFFFFF' if c == NEAR else '#5A5A5A' if c == FAR else '#B0B0B0'
        if k == 'line':
            mask.append(_line(p['p'][0], p['p'][1], g, p['w'] + 1, p.get('cap', 'round')))
        elif k == 'qpath':
            a, cp, b = [fy(q) for q in p['p']]
            mask.append(f'<path d="M{a[0]:.2f} {a[1]:.2f} Q{cp[0]:.2f} {cp[1]:.2f} {b[0]:.2f} {b[1]:.2f}" fill="none" '
                        f'stroke="{g}" stroke-width="{p["w"] + 1}" stroke-linecap="round"/>')
        elif k == 'circle':
            x, y = fy(p['c'])
            mask.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{p["r"] + 0.5}" fill="{g}"/>')
        elif k == 'poly':
            mask.append(f'<polygon points="{_pts(p["pts"])}" fill="{g}" stroke="{g}" stroke-width="{p.get("sw", 0) + 1}" stroke-linejoin="round"/>')
    out = []
    if mask:
        out.append(f'<mask id="m{n}" maskUnits="userSpaceOnUse" x="{x0:.1f}" y="{-y1:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}">'
                   + ''.join(mask)
                   + f'</mask><rect x="{x0:.1f}" y="{-y1:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" fill="url(#d)" mask="url(#m{n})"'
                   + (f' opacity="{opacity}"' if opacity < 1 else '') + '/>')
    if metal:
        out.append((f'<g opacity="{opacity}">' if opacity < 1 else '<g>') + ''.join(metal) + '</g>')
    return ''.join(out)


def _panel(L, box, floor):
    x0, y0, x1, y1 = box
    # La trama se mide en la pantalla, no en el dibujo: así los puntos tienen el mismo tamaño
    # en todos los ejercicios, aunque unos estén más de cerca que otros.
    pitch = SCREEN_PITCH * (x1 - x0) / 354
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="354" height="300" viewBox="{x0:.1f} {-y1:.1f} {x1 - x0:.1f} {y1 - y0:.1f}" '
           'preserveAspectRatio="xMidYMid meet">',
           f'<defs><pattern id="d" width="{pitch:.3f}" height="{pitch:.3f}" patternUnits="userSpaceOnUse">'
           f'<circle cx="{pitch / 2:.3f}" cy="{pitch / 2:.3f}" r="{pitch * DOT_RATIO:.3f}" fill="{W}"/></pattern></defs>']
    if floor:
        out.append(_line((x0, 0), (x1, 0), W, pitch * 0.4, 'round', f' stroke-dasharray="0.01 {pitch:.3f}" opacity="0.4"'))
    n = 0
    for name, prs in L:
        if not prs:
            continue
        if name in ('props', 'front'):
            out += [_prop(p) for p in prs]
        elif name == 'arrows':
            out += [_arrow(p['pts']) for p in prs]
        elif name == 'guides':
            out += [_line(p['p'][0], p['p'][1], W, 1, 'round', ' stroke-dasharray="1 3" opacity="0.5"') for p in prs]
        else:
            n += 1
            out.append(_body(prs, n, box, 0.3 if name == 'ghost' else 1))
    out.append('</svg>')
    return ''.join(out)


def render(ex):
    """Una lista de SVG (uno por panel), todos con la misma escala y encuadre."""
    layers, box, floor = frame(ex)
    return [_panel(L, box, floor) for L in layers]
