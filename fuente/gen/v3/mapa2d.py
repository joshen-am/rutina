"""Mapa de músculos en 2D (desde la versión 25, reemplaza al cuerpo 3D).

Un cuerpo de frente y otro de espalda hechos de puntos, en la misma línea que los dibujos «Escaneo»
de los ejercicios. Cada punto cae en una región muscular (las 14 de regionKeys() en la app) o en la
base del cuerpo (cabeza, manos, rodillas, pies…). Los puntos de cada región van en un solo <path>
cuyo color se enlaza a la plantilla: {{ <prefijo>.<región> }} (hb en Inicio, v.vb en el resumen), y
la base usa {{ th.muscleOff }}, que es el mismo color de un músculo sin carga.

Coordenadas: x hacia la derecha desde el eje del cuerpo, y hacia abajo desde la coronilla, 200 de alto.
Las formas se definen para el lado derecho (x > 0) y se reflejan.
"""
import math

REGIONS = ['chest', 'deltF', 'deltB', 'biceps', 'triceps', 'forearm', 'abs', 'lowback', 'traps', 'lats',
           'glutes', 'quads', 'hams', 'calves']


# ---------- formas ----------

def ellipse(cx, cy, rx, ry):
    return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def capsule(x1, y1, x2, y2, r):
    def f(x, y):
        dx, dy = x2 - x1, y2 - y1
        t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= r
    return f


def poly(pts):
    def f(x, y):
        inside = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
        return inside
    return f


def mirror(shape_fn_factory):
    """Devuelve una prueba que vale para el lado derecho y su reflejo."""
    f = shape_fn_factory
    return lambda x, y: f(abs(x), y)


# ---------- cuerpo (formas compartidas) ----------

HEAD = ellipse(0, 12, 9, 11.5)
NECK = capsule(0, 21, 0, 29, 5.2)
TORSO = mirror(poly([(0, 26), (17, 29), (20, 36), (19, 47), (16.5, 62), (15, 78), (17, 92), (8, 104), (0, 106)]))
HAND = mirror(ellipse(33.2, 100.5, 3.8, 5.6))
KNEE = mirror(ellipse(11.2, 143, 5.6, 5))
SHIN = mirror(capsule(11.2, 147, 11.8, 181, 4.6))
FOOT = mirror(ellipse(13, 187, 5.2, 3.2))
UPPER_ARM = mirror(capsule(25, 41, 28.2, 66, 5.4))
FOREARM = mirror(capsule(28.6, 69, 32.4, 94, 4.5))
THIGH = mirror(capsule(9.6, 101, 11, 138, 7.2))
DELT = mirror(ellipse(22.4, 35.5, 7.6, 8.6))

# región → forma, en orden de prioridad (lo primero que calza gana)
FRONT = [
    ('deltF', DELT),
    ('chest', mirror(lambda x, y: ellipse(9.6, 40.5, 10.6, 9.2)(x, y) and y >= 30)),
    ('abs', lambda x, y: (abs(x) <= 7.6 and 52 <= y <= 88) or mirror(poly([(8.8, 54), (15.8, 57), (14.8, 79), (9, 86)]))(x, y)),
    ('biceps', UPPER_ARM),
    ('forearm', FOREARM),
    ('quads', THIGH),
    ('traps', mirror(poly([(5, 24), (15, 29.5), (6, 29.5)]))),
]
BACK = [
    ('deltB', DELT),
    ('traps', mirror(poly([(0, 21), (5.5, 23.5), (18, 30.5), (10.5, 40), (4.5, 58), (0, 60)]))),
    ('lats', mirror(poly([(8.5, 43), (19, 40), (17.5, 55), (14.6, 72), (9.5, 80), (5.6, 63)]))),
    ('lowback', mirror(poly([(0, 61), (5.4, 63), (9.2, 80.5), (10.5, 90), (0, 91.5)]))),
    ('triceps', UPPER_ARM),
    ('forearm', FOREARM),
    ('glutes', mirror(ellipse(8.6, 99, 9.2, 9.6))),
    ('hams', mirror(capsule(9.8, 110, 11, 138, 6.8))),
    ('calves', mirror(capsule(11.6, 150, 11.6, 169, 5.6))),
]
BASE = [HEAD, NECK, TORSO, HAND, KNEE, SHIN, FOOT, UPPER_ARM, FOREARM, THIGH, DELT]

VIEW_W = 80          # media separación entre los dos cuerpos
BOX = (-80, -2, 160, 196)   # viewBox: x, y, ancho, alto


CENTERED = {'chest', 'abs', 'lowback', 'traps', 'glutes'}   # llevan la línea del eje del cuerpo


def _region(regions, x, y):
    for i, (name, f) in enumerate(regions):
        if f(x, y):
            return i, name
    return None, None


def dots(pitch):
    """Puntos de la trama, agrupados por región ('base' para el resto del cuerpo).

    Entre dos músculos vecinos queda una fila de puntos de base (la pierde el de menor prioridad),
    y los músculos del centro dejan libre el eje del cuerpo: así se lee la anatomía aunque todo
    tenga el mismo color.
    """
    out = {k: [] for k in REGIONS + ['base']}
    x0, y0, w, h = BOX
    nx, ny = int(w / pitch) + 1, int(h / pitch) + 1
    for regions, cx in ((FRONT, -40), (BACK, 40)):
        for j in range(ny):
            y = y0 + (j + 0.5) * pitch
            for i in range(nx):
                X = x0 + (i + 0.5) * pitch
                x = X - cx
                if abs(x) > 40:
                    continue
                pri, key = _region(regions, x, y)
                if key is not None:
                    if key in CENTERED and abs(x) < pitch * 0.55:
                        key = 'base'
                    else:
                        for dx, dy in ((pitch, 0), (-pitch, 0), (0, pitch), (0, -pitch)):
                            p2, k2 = _region(regions, x + dx, y + dy)
                            if k2 is not None and k2 != key and p2 < pri:
                                key = 'base'
                                break
                elif any(f(x, y) for f in BASE):
                    key = 'base'
                if key:
                    out[key].append((X, y))
    return out


def body_map(prefix, pitch, width='100%', label='Cuerpo de frente y de espalda con la carga de cada músculo',
             base='{{ th.muscleOff }}', caption='{{ th.tertiary }}', mono='{{ mono }}', reveal=False):
    """Mapa con un <path> de puntos por región (su color enlazado a la plantilla) y los rótulos Frente y Espalda."""
    groups = dots(pitch)
    r = pitch * 0.62
    x0, y0, w, h = BOX
    parts = [f'<div role="img" aria-label="{label}" style="width: {width}; flex: none; display: flex; flex-direction: column; gap: 4px">'
             f'<svg viewBox="{x0} {y0} {w} {h}" aria-hidden="true"{' class="bm-reveal"' if reveal else ''} style="display: block; width: 100%; height: auto">'
             f'<g fill="none" stroke-linecap="round" stroke-width="{r:.2f}">']
    for key in ['base'] + REGIONS:
        pts = groups[key]
        if not pts:
            continue
        d = ''.join(f'M{x:.1f} {y:.1f}h0' for x, y in pts)
        color = base if key == 'base' else '{{ ' + prefix + '.' + key + ' }}'
        parts.append(f'<path d="{d}" stroke="{color}"></path>')
    parts.append('</g></svg>'
                 f'<div aria-hidden="true" style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; '
                 f'font-family: {mono}; font-size: 12px; line-height: 16px; color: {caption}"><span>Frente</span><span>Espalda</span></div>'
                 '</div>')
    return ''.join(parts)


if __name__ == '__main__':
    g = dots(3)
    print({k: len(v) for k, v in g.items()})
