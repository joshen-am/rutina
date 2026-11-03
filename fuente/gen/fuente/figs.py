# Figuras de ejercicios: muñeco 2D (vista lateral o frontal) dibujado en SVG.
# Coordenadas matemáticas (y hacia arriba, suelo en y=0); se invierten al escribir el SVG.
import math

D = math.pi / 180


def dv(a):
    return (math.cos(a * D), math.sin(a * D))


def ad(p, v, s=1.0):
    return (p[0] + v[0] * s, p[1] + v[1] * s)


def mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def ang(a, b):
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def solve(f, lo, hi, it=80):
    flo = f(lo)
    for _ in range(it):
        m = (lo + hi) / 2
        fm = f(m)
        if (fm > 0) == (flo > 0):
            lo, flo = m, fm
        else:
            hi = m
    return (lo + hi) / 2


def circ_x(c1, r1, c2, r2, pick=1):
    """Intersección de dos círculos; pick=1 toma la de la izquierda del vector c1->c2."""
    d = dist(c1, c2)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, r1 * r1 - a * a))
    ux, uy = (c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d
    px, py = c1[0] + a * ux, c1[1] + a * uy
    return (px - pick * h * uy, py + pick * h * ux)


UL, FL, TH, SH, FT, HEEL = 28, 28, 42, 40, 13, 3.5
TORSO, NECK, HR = 50, 7, 10.5
W_T, W_UA, W_FA, W_TH, W_SH, W_FT, W_NK = 18, 9.5, 8.5, 11.5, 9.5, 6.5, 7
SY = 3.5 + TH + SH  # altura de la cadera de pie

NEAR = '#1F2D4A'
FAR = '#9AA8BE'
ACC = '#E4572E'
PF = '#E7EBF1'      # relleno de objetos
PS = '#B3BDCA'      # borde de objetos
PD = '#CBD3DE'      # superficie / tablero
METAL = '#4A5568'
FLOOR = '#BAC3CF'
GROUND = '#EEF1F5'
TOWEL = '#F2B7A0'
MAT = '#DDE4EE'


def ik(A, C, l1, l2, bend):
    d = dist(A, C)
    d2 = max(min(d, l1 + l2 - 1e-6), abs(l1 - l2) + 1e-6)
    base = math.atan2(C[1] - A[1], C[0] - A[0])
    ca = (l1 * l1 + d2 * d2 - l2 * l2) / (2 * l1 * d2)
    al = math.acos(max(-1, min(1, ca)))
    return (A[0] + l1 * math.cos(base + bend * al), A[1] + l1 * math.sin(base + bend * al))


def P(k, **kw):
    d = dict(k=k)
    d.update(kw)
    return d


class Pose:
    def __init__(self, hip, t, n=None, a1=('a', 270, 270), a2=None, l1=('a', 270, 270, 0), l2=None,
                 curve=0, view='side', f=1, tl=TORSO, eye=True, db=None, off=(0, 0)):
        self.view, self.f, self.curve, self.eye = view, f, curve, eye
        self.t = t
        self.n = t if n is None else n
        self.hip = hip
        self.S = ad(hip, dv(t), tl)
        a2 = a1 if a2 is None else a2
        l2 = l1 if l2 is None else l2
        if view == 'side':
            s1 = s2 = self.S
            h1 = h2 = hip
        else:
            pp = dv(t + 90)
            s1, s2 = ad(self.S, pp, 15), ad(self.S, pp, -15)
            h1, h2 = ad(hip, pp, 9.5), ad(hip, pp, -9.5)
        self.s1, self.s2, self.h1, self.h2 = s1, s2, h1, h2
        self.arms = [self._arm(s1, a1), self._arm(s2, a2)]
        self.legs = [self._leg(h1, l1), self._leg(h2, l2)]
        self.head = ad(self.S, dv(self.n), NECK + HR)
        self.db = db or []
        self.off = off

    def _arm(self, S, sp):
        if sp[0] == 'a':
            fl = sp[3] if len(sp) > 3 else FL
            E = ad(S, dv(sp[1]), UL)
            W = ad(E, dv(sp[2]), fl)
        else:
            E = ik(S, sp[1], UL, FL, sp[2])
            W = ad(E, dv(ang(E, sp[1])), FL)
        return dict(S=S, E=E, W=W)

    def _leg(self, H, sp):
        if sp[0] == 'a':
            K = ad(H, dv(sp[1]), TH)
            A = ad(K, dv(sp[2]), SH)
        else:
            K = ik(H, sp[1], TH, SH, sp[2])
            A = ad(K, dv(ang(K, sp[1])), SH)
        fa = sp[3]
        fl = FT if self.view == 'side' else 8
        T = ad(A, dv(fa), fl)
        Hl = ad(A, dv(fa), -HEEL) if self.view == 'side' else A
        return dict(H=H, K=K, A=A, T=T, Hl=Hl, fa=fa)

    # puntos con el desplazamiento aplicado
    def o(self, p):
        return (p[0] + self.off[0], p[1] + self.off[1])

    def j(self, name):
        m = {'hip': self.hip, 'S': self.S, 'head': self.head}
        if name in m:
            return self.o(m[name])
        part, i = name[:-1], int(name[-1]) - 1
        if part in ('E', 'W'):
            return self.o(self.arms[i][part])
        if part == 'Sh':
            return self.o(self.arms[i]['S'])
        return self.o(self.legs[i][part])

    def prims(self):
        c1 = NEAR
        c2 = FAR if self.view == 'side' else NEAR
        o = self.o
        out = []

        def limb_arm(a, c):
            out.append(P('line', p=[o(a['S']), o(a['E'])], w=W_UA, c=c))
            out.append(P('line', p=[o(a['E']), o(a['W'])], w=W_FA, c=c))

        def limb_leg(l, c):
            out.append(P('line', p=[o(l['H']), o(l['K'])], w=W_TH, c=c))
            out.append(P('line', p=[o(l['K']), o(l['A'])], w=W_SH, c=c))
            out.append(P('line', p=[o(l['Hl']), o(l['T'])], w=W_FT, c=c))

        def dumbbells(idx_list):
            for i, style in self.db:
                if i not in idx_list:
                    continue
                a = self.arms[i]
                Wp = o(a['W'])
                fa = ang(a['E'], a['W'])
                if style == 'end':
                    pts = [ad(Wp, dv(30 + 60 * k), 6.4) for k in range(6)]
                    out.append(P('poly', pts=pts, c=METAL, sw=1.2))
                    out.append(P('circle', c=Wp, r=2.2, fill='#9AA6B8'))
                elif style == 'vert':  # colgando vertical, tomada con las dos manos
                    c = (Wp[0], Wp[1] - 7)
                    pa, pb = (c[0], c[1] + 6.5), (c[0], c[1] - 6.5)
                    out.append(P('line', p=[pa, pb], w=3, c=METAL))
                    for q in (pa, pb):
                        out.append(P('line', p=[(q[0] - 5.5, q[1]), (q[0] + 5.5, q[1])], w=5, c=METAL, cap='butt'))
                else:  # mancuerna vista de lado (agarre neutro)
                    u = dv(fa + 90)
                    pa, pb = ad(Wp, u, 6.5), ad(Wp, u, -6.5)
                    out.append(P('line', p=[pa, pb], w=3, c=METAL))
                    for q in (pa, pb):
                        out.append(P('line', p=[ad(q, dv(fa), -5.5), ad(q, dv(fa), 5.5)], w=5, c=METAL, cap='butt'))

        if self.view == 'side':
            limb_arm(self.arms[1], c2)
            limb_leg(self.legs[1], c2)
            dumbbells([1])
            H, S = o(self.hip), o(self.S)
            if self.curve:
                cp = ad(mid(H, S), dv(self.t + 90 * self.f), self.curve * 2)
                out.append(P('qpath', p=[H, cp, S], w=W_T, c=c1))
            else:
                out.append(P('line', p=[H, S], w=W_T, c=c1))
            out.append(P('line', p=[S, o(self.head)], w=W_NK, c=c1))
            out.append(P('circle', c=o(self.head), r=HR, fill=c1))
            if self.eye:
                out.append(P('circle', c=ad(o(self.head), dv(self.n - 62 * self.f), 5.2), r=1.7, fill='#FFFFFF'))
            limb_leg(self.legs[0], c1)
            limb_arm(self.arms[0], c1)
            dumbbells([0])
        else:
            limb_leg(self.legs[0], c1)
            limb_leg(self.legs[1], c1)
            pts = [o(self.h1), o(self.h2), o(self.s2), o(self.s1)]
            out.append(P('poly', pts=pts, c=c1, sw=7))
            out.append(P('line', p=[o(self.S), o(self.head)], w=W_NK, c=c1))
            out.append(P('circle', c=o(self.head), r=HR, fill=c1))
            limb_arm(self.arms[0], c1)
            limb_arm(self.arms[1], c1)
            dumbbells([0, 1])
        return out


# ---------- objetos ----------

def rect(x0, y0, x1, y1, fill=PF, stroke=PS, sw=1.4, rx=2):
    return P('rect', x0=min(x0, x1), y0=min(y0, y1), x1=max(x0, x1), y1=max(y0, y1), fill=fill, stroke=stroke, sw=sw, rx=rx)


def mat(x0, x1):
    return [rect(x0, -0.5, x1, 2.6, fill=MAT, stroke='none', rx=1.3)]


def wall(x0, x1, h=222, edge=None):
    out = [rect(x0, 0, x1, h, fill=PF, stroke='none', rx=0)]
    if edge is not None:
        out.append(P('line', p=[(edge, 0), (edge, h)], w=3.5, c=PS, cap='butt'))
    return out


def counter(x0, x1, h):
    return [rect(x0, 0, x1, h - 4, rx=1), rect(x0 - 3, h - 5, x1, h, fill=PD, stroke=PS, rx=1.5)]


def bench(x0, x1, h):
    return [P('line', p=[(x0 + 7, 0), (x0 + 7, h - 4)], w=4, c=PS, cap='butt'),
            P('line', p=[(x1 - 7, 0), (x1 - 7, h - 4)], w=4, c=PS, cap='butt'),
            rect(x0, h - 5, x1, h, fill=PD, stroke=PS, rx=1.5)]


def chair(xf, seat=42, depth=40):
    xb = xf - depth
    return [P('line', p=[(xf - 3, 0), (xf - 3, seat - 4)], w=3.2, c=PS, cap='butt'),
            P('line', p=[(xb + 3, 0), (xb + 3, seat + 44)], w=3.2, c=PS, cap='butt'),
            rect(xb, seat - 4, xf, seat, fill=PD, stroke=PS, rx=1.2),
            rect(xb, seat + 18, xb + 5, seat + 46, fill=PD, stroke=PS, rx=1.5)]


def sofa(x0, x1, seat, back='left', legs=0):
    out = [rect(x0, legs, x1, seat, rx=6)]
    if back == 'left':
        out.append(rect(x0, seat - 2, x0 + 20, seat + 36, rx=6))
    else:
        out.append(rect(x1 - 20, seat - 2, x1, seat + 36, rx=6))
    if legs:
        out += [P('line', p=[(x0 + 6, 0), (x0 + 6, legs)], w=4, c=PS, cap='butt'),
                P('line', p=[(x1 - 6, 0), (x1 - 6, legs)], w=4, c=PS, cap='butt')]
    return out


def step(x0, x1, h):
    return [rect(x0, 0, x1, h, rx=1.5)]


def bar(c):
    return [P('circle', c=c, r=5.2, fill='#FFFFFF'), P('circle', c=c, r=4, fill='#5E6B7E')]


def post(x, y1):
    return [P('line', p=[(x, 0), (x, y1)], w=4, c=PD, cap='butt')]


def pbar(x0, x1, h):
    return [P('line', p=[(x0 + 6, 0), (x0 + 6, h)], w=4, c=PS, cap='butt'),
            P('line', p=[(x1 - 6, 0), (x1 - 6, h)], w=4, c=PS, cap='butt'),
            P('line', p=[(x0, h), (x1, h)], w=5, c='#8E99AA')]


def towel(x0, x1):
    return [rect(x0, -0.2, x1, 3, fill=TOWEL, stroke='none', rx=1)]


def door_front(xin, h=206):
    return [rect(-xin - 9, 0, -xin, h, rx=0), rect(xin, 0, xin + 9, h, rx=0), rect(-xin - 9, h, xin + 9, h + 8, rx=0)]


# ---------- flechas ----------

def arc_pts(c, r, a0, a1, n=28, ry=None):
    ry = r if ry is None else ry
    return [(c[0] + r * math.cos((a0 + (a1 - a0) * i / n) * D), c[1] + ry * math.sin((a0 + (a1 - a0) * i / n) * D)) for i in range(n + 1)]


def q_pts(p0, c, p1, n=22):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
                    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]))
    return out


def arrow(pts):
    return [P('arrow', pts=pts)]


def arc_arrow(c, r, a0, a1, ry=None):
    return arrow(arc_pts(c, r, a0, a1, ry=ry))


def q_arrow(p0, p1, bulge=0):
    m = mid(p0, p1)
    cp = ad(m, dv(ang(p0, p1) + 90), bulge)
    return arrow(q_pts(p0, cp, p1))


def line_arrow(p0, p1):
    return arrow([p0, p1])


def guide(p0, p1):
    return [P('dash', p=[p0, p1])]


# ---------- SVG ----------

def fy(p):
    return (p[0], -p[1])


def bbox(prims):
    xs, ys = [], []
    for p in prims:
        k = p['k']
        if k in ('line', 'dash'):
            w = p.get('w', 2) / 2
            for q in p['p']:
                xs += [q[0] - w, q[0] + w]
                ys += [q[1] - w, q[1] + w]
        elif k == 'qpath':
            w = p['w'] / 2
            for q in (p['p'][0], p['p'][2], mid(mid(p['p'][0], p['p'][2]), p['p'][1])):
                xs += [q[0] - w, q[0] + w]
                ys += [q[1] - w, q[1] + w]
        elif k == 'circle':
            xs += [p['c'][0] - p['r'], p['c'][0] + p['r']]
            ys += [p['c'][1] - p['r'], p['c'][1] + p['r']]
        elif k == 'rect':
            xs += [p['x0'], p['x1']]
            ys += [p['y0'], p['y1']]
        elif k == 'poly':
            w = p.get('sw', 0) / 2
            for q in p['pts']:
                xs += [q[0] - w, q[0] + w]
                ys += [q[1] - w, q[1] + w]
        elif k == 'arrow':
            for q in p['pts']:
                xs += [q[0] - 5, q[0] + 5]
                ys += [q[1] - 5, q[1] + 5]
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def prim_svg(p):
    k = p['k']
    if k == 'line':
        (x1, y1), (x2, y2) = fy(p['p'][0]), fy(p['p'][1])
        cap = p.get('cap', 'round')
        return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{p["c"]}" stroke-width="{p["w"]}" stroke-linecap="{cap}"/>'
    if k == 'qpath':
        a, c, b = [fy(q) for q in p['p']]
        return f'<path d="M{a[0]:.2f} {a[1]:.2f} Q{c[0]:.2f} {c[1]:.2f} {b[0]:.2f} {b[1]:.2f}" fill="none" stroke="{p["c"]}" stroke-width="{p["w"]}" stroke-linecap="round"/>'
    if k == 'circle':
        x, y = fy(p['c'])
        return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{p["r"]}" fill="{p["fill"]}"/>'
    if k == 'rect':
        return (f'<rect x="{p["x0"]:.2f}" y="{-p["y1"]:.2f}" width="{p["x1"] - p["x0"]:.2f}" height="{p["y1"] - p["y0"]:.2f}" '
                f'rx="{p["rx"]}" fill="{p["fill"]}" stroke="{p["stroke"]}" stroke-width="{p["sw"]}"/>')
    if k == 'poly':
        pts = ' '.join(f'{x:.2f},{y:.2f}' for x, y in (fy(q) for q in p['pts']))
        return f'<polygon points="{pts}" fill="{p["c"]}" stroke="{p["c"]}" stroke-width="{p.get("sw", 0)}" stroke-linejoin="round"/>'
    if k == 'dash':
        (x1, y1), (x2, y2) = fy(p['p'][0]), fy(p['p'][1])
        return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{ACC}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"/>'
    if k == 'arrow':
        pts = [fy(q) for q in p['pts']]
        d = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts)
        (xa, ya), (xb, yb) = pts[-2], pts[-1]
        L = math.hypot(xb - xa, yb - ya) or 1
        ux, uy = (xb - xa) / L, (yb - ya) / L
        tip = (xb + ux * 3, yb + uy * 3)
        bs = (xb - ux * 5, yb - uy * 5)
        h1 = (bs[0] - uy * 5, bs[1] + ux * 5)
        h2 = (bs[0] + uy * 5, bs[1] - ux * 5)
        return (f'<path d="{d}" fill="none" stroke="{ACC}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<polygon points="{tip[0]:.2f},{tip[1]:.2f} {h1[0]:.2f},{h1[1]:.2f} {h2[0]:.2f},{h2[1]:.2f}" fill="{ACC}"/>')
    raise ValueError(k)


ASPECT = 1.18
MIN_W = 236


def render(ex):
    """Devuelve una lista de SVG (uno por panel) con la misma escala y encuadre."""
    panels = ex['panels']
    floor = ex.get('floor', True)
    layers = []
    allprims = []
    for pn in panels:
        L = []
        back = pn.get('props', [])
        L.append((back, 1))
        if pn.get('ghost') is not None:
            L.append((pn['ghost'].prims(), 0.16))
        L.append((pn['pose'].prims(), 1))
        L.append((pn.get('front', []), 1))
        L.append((pn.get('guides', []), 1))
        L.append((pn.get('arrows', []), 1))
        layers.append(L)
        for prs, _ in L:
            if pn.get('fit_ignore_props') and prs is back:
                continue
            allprims += prs
    if ex.get('vb'):
        x0, y0, x1, y1 = ex['vb']
    else:
        bx0, by0, bx1, by1 = bbox(allprims)
        w = bx1 - bx0 + 18
        h = by1 - by0 + 22
        asp = ex.get('aspect', ASPECT)
        w = max(w, MIN_W * ex.get('scale', 1.0), h * asp)
        h = w / asp
        cx = (bx0 + bx1) / 2
        x0, x1 = cx - w / 2, cx + w / 2
        if floor:
            y0 = min(-9, by0 - 6)
        else:
            y0 = (by0 + by1) / 2 - h / 2
        y1 = y0 + h
        if y1 < by1 + 6:  # no debería pasar, pero por si acaso
            y1 = by1 + 6
    svgs = []
    for L in layers:
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {-y1:.1f} {x1 - x0:.1f} {y1 - y0:.1f}" preserveAspectRatio="xMidYMid meet">']
        if floor:
            out.append(f'<rect x="{x0:.1f}" y="0" width="{x1 - x0:.1f}" height="{-y0:.1f}" fill="{GROUND}"/>')
            out.append(f'<line x1="{x0:.1f}" y1="0" x2="{x1:.1f}" y2="0" stroke="{FLOOR}" stroke-width="1.6"/>')
        for prs, op in L:
            if not prs:
                continue
            if op < 1:
                out.append(f'<g opacity="{op}">')
            out += [prim_svg(p) for p in prs]
            if op < 1:
                out.append('</g>')
        out.append('</svg>')
        svgs.append(''.join(out))
    return svgs
