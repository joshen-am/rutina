# Posturas de cada ejercicio (vista lateral mirando a la derecha, salvo que diga 'front').
import math
from figs import *

EX = {}


def add(key, panels, **kw):
    EX[key] = dict(panels=panels, **kw)


def pn(pose, label=None, **kw):
    d = dict(pose=pose, label=label)
    d.update(kw)
    return d


LEGS = ('a', 270, 270, 0)
HANG = ('a', 270, 270)
HANGF = ('a', 268, 268)


def stand(x=0, **kw):
    kw.setdefault('l1', LEGS)
    return Pose((x, SY), 90, **kw)


def hands_on_hips(hip, bend=-1, dx=3, dy=7):
    return ('ik', (hip[0] + dx, hip[1] + dy), bend)


# ---------------- flexiones (mesón / banco / suelo / rodillas / pared) ----------------

def pushup(Wy, pivot, Lb, hoff, legs_fn, props_fn, dx=20, dz=13, mat_x=None):
    """Abajo el hombro queda un poco delante y encima de las manos; arriba, brazos estirados."""
    SB = (None, Wy + dz)
    SBx = pivot[0] + math.sqrt(Lb ** 2 - (SB[1] - pivot[1]) ** 2)
    SB = (SBx, SB[1])
    W = (SBx - dx, Wy)
    SA = circ_x(pivot, Lb, W, 56, pick=1)
    thA, thB = ang(pivot, SA), ang(pivot, SB)

    def mk(th, bend):
        return Pose(ad(pivot, dv(th), hoff), th, th - 3, a1=('ik', W, bend), l1=legs_fn(th))
    A, B = mk(thA, 1), mk(thB, -1)
    props = props_fn(W) if props_fn else []
    if mat_x is not None:
        props = mat(mat_x, W[0] + 30) + props
    arr = q_arrow(ad(A.S, dv(thA + 90), 26), ad(B.S, dv(thB + 90), 26), bulge=4)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


def toes_pushup(h, props_fn, mat_x=None):
    ank_y = 10.0
    for _ in range(4):
        Wy = h + 4.3
        SBy = Wy + 13
        SBx = math.sqrt(132 ** 2 - (SBy - ank_y) ** 2)
        W = (SBx - 20, Wy)
        thA = ang((0, ank_y), circ_x((0, ank_y), 132, W, 56, pick=1))
        foot = thA + 268
        ank_y = 3.3 - FT * math.sin(foot * D)
    return pushup(h + 4.3, (0, ank_y), 132, 82, lambda th: ('ik', (0, ank_y), 1, foot), props_fn, mat_x=mat_x)


add('flex_meson', toes_pushup(84, lambda W: counter(W[0] - 6, W[0] + 60, 84)))
add('flex_banco', toes_pushup(42, lambda W: bench(W[0] - 8, W[0] + 50, 42)))
add('flex_suelo', toes_pushup(0, None, mat_x=-20))
add('flex_rodillas', pushup(4.3, (0, 5), 92, 42, lambda th: ('a', th + 180, 180, 180), None, mat_x=-55))


def wall_pushup():
    ank = (0, 3.5)
    SB = ad(ank, dv(78), 132)
    W = (SB[0] + 14, SB[1] - 8)
    SA = circ_x(ank, 132, W, 56, pick=1)
    thA, thB = ang(ank, SA), ang(ank, SB)

    def mk(th, bend):
        return Pose(ad(ank, dv(th), 82), th, th - 3, a1=('ik', W, bend), l1=('ik', ank, 1, 0))
    A, B = mk(thA, 1), mk(thB, -1)
    props = wall(W[0] + 4.5, W[0] + 30, edge=W[0] + 4.5)
    arr = q_arrow(ad(A.S, dv(thA + 90), 24), ad(B.S, dv(thB + 90), 24), bulge=4)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('flex_pared', wall_pushup())


# flexión pica
def pike():
    Wr = (0, 4.5)
    ank = (-98, 11.5)
    hipA = circ_x(Wr, 106, ank, 82, pick=-1)
    tA = ang(hipA, Wr)
    A = Pose(hipA, tA, tA - 8, a1=('ik', Wr, 1), l1=('ik', ank, 1, 0), f=1)
    # abajo: cabeza cerca del suelo, delante de las manos
    head_t = (9, 17)
    nB = 292
    SB = ad(head_t, dv(nB), -(NECK + HR))
    hipB = circ_x(SB, 50, ank, 82, pick=-1)
    tB = ang(hipB, SB)
    B = Pose(hipB, tB, nB, a1=('ik', Wr, -1), l1=('ik', ank, 1, 0))
    # pie en punta
    for P_ in (A, B):
        sh = ang(P_.legs[0]['K'], P_.legs[0]['A'])
        P_.legs[0]['fa'] = P_.legs[1]['fa'] = sh + 90
        for l in P_.legs:
            l['T'] = ad(l['A'], dv(sh + 90), FT)
            l['Hl'] = ad(l['A'], dv(sh + 90), -HEEL)
    arr = line_arrow(ad(A.head, (16, 4)), ad(B.head, (16, 4)))
    props = mat(-120, 30)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('flex_pica', pike())


# ---------------- remo en el marco de la puerta ----------------

def door_row(thA=113, thB=95):
    ank = (0, 3.5)
    SA = ad(ank, dv(thA), 132)
    W = ad(SA, dv(5), 56)

    def mk(th):
        return Pose(ad(ank, dv(th), 82), th, th, a1=('ik', W, -1), a2=('a', 262, 272), l1=('ik', ank, 1, 0))
    A, B = mk(thA), mk(thB)
    edge = W[0] + 2
    props = wall(edge, edge + 70, edge=edge)
    arr = q_arrow(ad(A.head, (-4, 22)), ad(B.head, (-4, 22)), bulge=6)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('remo_marco', door_row())


# ---------------- brazos y hombros con 3 kg ----------------

def lateral():
    kw = dict(view='front', eye=False, l1=('a', 267, 270, 180), l2=('a', 273, 270, 0), db=[(1, 'end')])
    A = Pose((0, SY), 90, a1=('a', 264, 266), a2=('a', 276, 274), **kw)
    B = Pose((0, SY), 90, a1=('a', 264, 266), a2=('a', 3, -4), **kw)
    arr = arc_arrow(B.j('Sh2'), 66, 284, 350)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('laterales', lateral())


def curl(style):
    A = stand(a1=('a', 272, 272), a2=HANGF, db=[(0, style)])
    B = stand(a1=('a', 272, 72), a2=HANGF, db=[(0, style)])
    arr = arc_arrow(B.j('E1'), 38, 292, 404)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('curl', curl('end'))
add('curl_martillo', curl('side'))


def triceps():
    A = stand(a1=('a', 97, 262), a2=HANGF, db=[(0, 'end')])
    B = stand(a1=('a', 97, 91), a2=HANGF, db=[(0, 'end')])
    arr = arc_arrow(B.j('E1'), 38, 250, 112)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('triceps', triceps())


def ytw():
    legs = dict(l1=('a', 357, 359, 0), l2=('a', 3, 1, 0))
    m = [rect(-128, -40, 112, 40, fill=MAT, stroke='none', rx=7)]
    Y = Pose((0, 0), 180, view='front', eye=False, a1=('a', 212, 212), a2=('a', 148, 148), **legs)
    T = Pose((0, 0), 180, view='front', eye=False, a1=('a', 270, 270), a2=('a', 90, 90), **legs)
    Wp = Pose((0, 0), 180, view='front', eye=False, a1=('a', 292, 222), a2=('a', 68, 138), **legs)
    return [pn(Y, 'Y', props=m), pn(T, 'T', props=m), pn(Wp, 'W', props=m)]


add('ytw', ytw(), floor=False)


# ---------------- core en el suelo ----------------

def deadbug():
    A = Pose((0, 9), 180, 176, a1=('a', 90, 90), a2=('a', 93, 93), l1=('a', 90, 0, 90), l2=('a', 87, 3, 93))
    B = Pose((0, 9), 180, 176, a1=('a', 90, 90), a2=('a', 171, 173), l1=('a', 11, 9, 99), l2=('a', 87, 3, 93))
    arr = arc_arrow((0, 9), 66, 80, 22) + arc_arrow(B.j('S'), 46, 100, 160)
    props = mat(-95, 100)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('deadbug', deadbug())


def plank():
    E = (64, 5)
    S = (64, 5 + UL)
    ank_y = 15.5
    th = math.degrees(math.asin((S[1] - ank_y) / 132))
    ank = (S[0] - 132 * math.cos(th * D), ank_y)
    A = Pose(ad(ank, dv(th), 82), th, th - 2, a1=('a', 270, 0), l1=('ik', ank, 1, 281))
    up = dv(th + 90)
    g = guide(ad(ad(ank, up, 13), dv(th), -6), ad(ad(A.head, up, 14), dv(th), 4))
    return [pn(A, None, props=mat(ank[0] - 18, S[0] + 40), guides=g)]


add('plancha', plank())


def side_plank():
    def build(t):
        return Pose((0, 0), t, view='front', eye=False, a1=('a', 270, 180, 15), a2=('a', 90, 90),
                    l1=('a', t + 180, t + 180, t + 180 - 50), l2=('a', t + 180, t + 180, t + 180 - 50))
    t = solve(lambda t: build(t).legs[0]['A'][1] - build(t).arms[0]['E'][1] - 0.5, 150, 179)
    p0 = build(t)
    dy = 5 - p0.arms[0]['E'][1]
    p = build(t)
    p.off = (0, dy)
    up = dv(t - 90)
    g = guide(ad(p.j('A2'), up, 11), ad(ad(p.j('head'), up, 4), dv(t), 8))
    return [pn(p, None, props=mat(p.j('W1')[0] - 15, p.j('T1')[0] + 15), guides=g)]


add('plancha_lateral', side_plank())


def quad_pose(curve=0, n=None, a1=HANG, l2=('a', 270, 180, 180)):
    hip = (0, 47)
    t = math.degrees(math.asin((60.5 - 47) / 50))
    return Pose(hip, t, t - 18 if n is None else n, a1=a1, a2=HANG, l1=('a', 270, 180, 180), l2=l2, curve=curve)


def bird_dog():
    A = quad_pose()
    B = quad_pose(a1=('a', 19, 19), l2=('a', 185, 185, 275))
    arr = arc_arrow(B.j('S'), 40, 282, 372) + arc_arrow(B.j('hip'), 38, 258, 196)
    props = mat(-75, 85)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('bird_dog', bird_dog())


def cat_cow():
    t = math.degrees(math.asin((60.5 - 47) / 50))
    A = quad_pose(curve=8, n=t - 62)
    B = quad_pose(curve=-6, n=t + 22)
    props = mat(-75, 85)
    return [pn(A, 'Gato', props=props, arrows=line_arrow((24, 84), (24, 98))),
            pn(B, 'Vaca', props=props, arrows=line_arrow((24, 66), (24, 52)))]


add('gato_vaca', cat_cow())


def glute_bridge(single=False):
    S0 = (-60, 9)
    A = Pose((-10, 9), 180, 177, a1=('a', 358, 0), l1=('ik', (40, 3.5), 1, 0))
    hipB = ad(S0, dv(35), 50)
    tB = ang(hipB, S0)
    if single:
        B = Pose(hipB, tB, 177, a1=('a', 358, 0), l1=('a', 35, 35, 125), l2=('ik', (40, 3.5), 1, 0))
        return [pn(B, None, props=mat(-95, 95))]
    B = Pose(hipB, tB, 177, a1=('a', 358, 0), l1=('ik', (40, 3.5), 1, 0))
    arr = line_arrow((-12, 14), (-17, 31))
    props = mat(-95, 70)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('puente', glute_bridge())
add('puente_una', glute_bridge(single=True))


def hamstring_curl():
    S0 = (-60.4, 9)
    hipA = (-15, 30)
    A = Pose(hipA, ang(hipA, S0), 177, a1=('a', 0, 2), l1=('ik', (61, 7.5), 1, 72))
    hipB = ad(S0, dv(36), 50)
    B = Pose(hipB, ang(hipB, S0), 177, a1=('a', 0, 2), l1=('ik', (29, 7.5), 1, 80))
    tA = towel(52, 72)
    tB = towel(20, 40)
    arr = line_arrow((58, 20), (37, 20))
    return [pn(A, '1', props=mat(-95, 90) + tA), pn(B, '2', ghost=A, props=mat(-95, 90) + tB, arrows=arr)]


add('curl_isquios', hamstring_curl())


def hip_thrust():
    S0 = (-50, 45)
    ank = (44, 3.5)
    hipB = (0, 45)
    hipA = ad(S0, dv(-37), 50)
    A = Pose(hipA, ang(hipA, S0), 150, a1=('a', 186, 180), l1=('ik', ank, 1, 0))
    B = Pose(hipB, 180, 160, a1=('a', 186, 180), l1=('ik', ank, 1, 0))
    props = sofa(-130, -44, 38)
    arr = line_arrow((-4, 17), (0, 30))
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('hip_thrust', hip_thrust())


def hollow(full=False):
    if full:
        p = Pose((0, 9), 158, 146, a1=('a', 164, 164), l1=('a', 19, 19, 26), l2=('a', 21, 21, 28))
    else:
        p = Pose((0, 9), 154, 138, a1=('a', 14, 14), l1=('a', 76, 2, 8), l2=('a', 78, 4, 10))
    return [pn(p, None, props=mat(-110, 100))]


add('hollow', hollow())
add('hollow_completo', hollow(full=True))


def reverse_crunch():
    A = Pose((0, 9), 180, 176, a1=('a', 0, 0), l1=('a', 90, 0, 90), l2=('a', 88, 2, 92))
    B = Pose((5, 16), 187, 176, a1=('a', 0, 0), l1=('a', 120, 30, 120), l2=('a', 118, 32, 122))
    arr = arc_arrow(B.j('hip'), 62, 84, 116)
    props = mat(-95, 70)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('crunch_invertido', reverse_crunch())


def sphinx():
    Ex = math.sqrt(50 ** 2 - 24 ** 2)
    hip = (0, 9)
    t = math.degrees(math.atan2(24, Ex))
    p = Pose(hip, t, 44, a1=('a', 270, 0), l1=('a', 180, 180, 180), curve=-3)
    return [pn(p, None, props=mat(-105, 95))]


add('esfinge', sphinx())


# ---------------- piernas ----------------

def chair_squat():
    A = stand(a1=('a', 0, 0))
    B = Pose((-30, 50), 52, 70, a1=('a', 8, 8), l1=('ik', (0, 3.5), 1, 0))
    props = chair(-14)
    arr = q_arrow((-17, 98), (-43, 66), bulge=-6)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('sentadilla_silla', chair_squat())


def free_squat():
    p = Pose((-24, 46), 50, 66, a1=('a', 6, 6), l1=('ik', (0, 3.5), 1, 0))
    return p


def squat_calf():
    A = free_squat()
    toe = (13, 3.2)
    fa = -48
    ank = ad(toe, dv(fa), -FT)
    B = Pose((ank[0], ank[1] + 82), 90, a1=('a', 6, 6), l1=('a', 270, 270, fa))
    arr = line_arrow((-36, 70), (-28, 104))
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('sentadilla_talones', squat_calf())
add('sentadilla_libre', [pn(free_squat(), None)])


def reverse_lunge():
    A = stand(a1=hands_on_hips((0, SY)))
    hipB = (-8, 50)
    B = Pose(hipB, 90, a1=hands_on_hips(hipB), l1=('ik', (-64, 12), 1, -50), l2=('ik', (26, 3.5), 1, 0))
    arr = q_arrow((-8, 22), (-54, 26), bulge=12)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('zancada_atras', reverse_lunge())


def split_squat():
    back, front = ('ik', (-62, 12), 1, -50), ('ik', (26, 3.5), 1, 0)
    hipA = (-15, 74)
    hipB = (-10, 50)
    A = Pose(hipA, 90, a1=hands_on_hips(hipA), l1=back, l2=front)
    B = Pose(hipB, 90, a1=hands_on_hips(hipB), l1=back, l2=front)
    arr = line_arrow((-38, 104), (-36, 76))
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('zancada_estatica', split_squat())


def bulgarian():
    back = ('ik', (-70, 45), 1, 205)
    front = ('ik', (22, 3.5), 1, 0)
    hipA, hipB = (-13, 77), (-10, 50)
    A = Pose(hipA, 84, a1=hands_on_hips(hipA), l1=back, l2=front)
    B = Pose(hipB, 82, a1=hands_on_hips(hipB), l1=back, l2=front)
    props = sofa(-150, -60, 38, back='left')
    arr = line_arrow((-38, 104), (-35, 76))
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('bulgara', bulgarian())


def single_leg_rdl():
    A = stand(a1=HANG, a2=HANG, db=[(0, 'end')])
    hipB = (-14, 80)
    B = Pose(hipB, 8, 2, a1=HANG, a2=('a', 272, 272), l1=('a', 188, 188, 278), l2=('ik', (0, 3.5), 1, 0), db=[(0, 'end')])
    arr = arc_arrow(hipB, 64, 86, 16)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('pm_rumano', single_leg_rdl())


def calf_raise():
    toe = (9, 21)
    out = []
    poses = []
    for fa in (24, -50):
        ank = ad(toe, dv(fa), -FT)
        poses.append(Pose((ank[0], ank[1] + 82), 90, a1=HANG, l1=('a', 270, 270, fa)))
    A, B = poses
    props = step(1, 48, 18)
    arr = line_arrow(ad(A.j('Hl1'), (-14, 2)), ad(B.j('Hl1'), (-14, 6)))
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('talones', calf_raise())


def step_up():
    props = step(12, 60, 20)
    hipA = (2, 73)
    A = Pose(hipA, 80, a1=hands_on_hips(hipA), l1=('ik', (31, 23.5), 1, 0), l2=('ik', (-16, 3.5), 1, -10))
    hipB = (30, 105)
    B = Pose(hipB, 90, a1=hands_on_hips(hipB), l1=('ik', (31, 23.5), 1, 0), l2=('ik', (37, 23.5), 1, 0))
    arr = q_arrow((-24, 92), (2, 122), bulge=-8)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('subida_escalon', step_up())


def wall_sit():
    p = Pose((0, 43.5), 90, a1=HANG, l1=('a', 0, 270, 0))
    return [pn(p, None, props=wall(-36, -10.5, edge=-10.5))]


add('sentadilla_pared', wall_sit())


def nordic():
    K = (0, 5)
    sof = sofa(-115, -30, 44, back='left', legs=12)

    def mk(th):
        hip = ad(K, dv(th), 42)
        arms = ('a', 300, 62) if th > 80 else ('a', 318, 326)
        return Pose(hip, th, th - 4, a1=arms, l1=('a', th + 180, 180, 180))
    A, B = mk(90), mk(52)
    arr = arc_arrow(K, 108, 86, 58)
    return [pn(A, '1', props=sof + mat(-60, 40)), pn(B, '2', ghost=A, props=sof + mat(-60, 40), arrows=arr)]


add('nordico', nordic())


# ---------------- plaza: barras ----------------
BAR = (0, 207)


def hang_pose(legs=None):
    l1 = legs or ('a', 268, 273, 300)
    return Pose((0, BAR[1] - 2 - 56 - 50), 90, 90, a1=('a', 90, 90), a2=('a', 91, 91), l1=l1, l2=l1)


def frame():
    return [P('line', p=[(-54, 0), (-54, BAR[1])], w=4.5, c=PD, cap='butt'), P('line', p=[(54, 0), (54, BAR[1])], w=4.5, c=PD, cap='butt'),
            P('line', p=[(-56, BAR[1]), (56, BAR[1])], w=4.5, c=PD)]


def dead_hang():
    return [pn(hang_pose(), None, props=frame(), front=bar(BAR))]


add('colgarse', dead_hang())


def pullup(up_first=False):
    W = (0, 205)
    head = (-9, 219)
    nA = 97
    S = ad(head, dv(nA), -(NECK + HR))
    tA = 96
    hip = ad(S, dv(tA), -50)
    legs = ('a', 262, 214, 300)
    top = Pose(hip, tA, nA, a1=('ik', W, -1), a2=('ik', (0.6, 205), -1), l1=legs, l2=('a', 265, 218, 302))
    bot = Pose((0, 98.5), 90, 90, a1=('a', 90, 90), a2=('a', 91, 91), l1=legs, l2=('a', 265, 218, 302))
    fr = bar(BAR)
    if up_first:
        arr = line_arrow((-26, bot.S[1] + 4), (-26, top.S[1] + 2))
        return [pn(bot, '1', props=frame(), front=fr), pn(top, '2', ghost=bot, props=frame(), front=fr, arrows=arr)]
    arr = line_arrow((-26, top.S[1] + 2), (-26, bot.S[1] + 4))
    return [pn(top, '1', props=frame(), front=fr), pn(bot, '2', ghost=top, props=frame(), front=fr, arrows=arr)]


add('dominada_negativa', pullup())
add('dominada', pullup(up_first=True))


def knee_raise():
    A = hang_pose()
    B = hang_pose(('a', 4, 268, 330))
    arr = arc_arrow(B.j('hip'), 34, 276, 352)
    fr = bar(BAR)
    return [pn(A, '1', props=frame(), front=fr), pn(B, '2', ghost=A, props=frame(), front=fr, arrows=arr)]


add('rodillas_colgado', knee_raise())


def aussie_row():
    ank = (0, 6)
    thB = 45
    C = ad(ank, dv(thB), 118)
    W = ad(C, dv(thB + 90), 13.5)
    phi = math.degrees(math.acos((132 ** 2 + dist(ank, W) ** 2 - 56 ** 2) / (2 * 132 * dist(ank, W))))
    thA = ang(ank, W) - phi

    def mk(th, bend):
        return Pose(ad(ank, dv(th), 82), th, th, f=-1, a1=('ik', W, bend), l1=('ik', ank, 1, th + 90))
    A, B = mk(thA, 1), mk(thB, 1)
    back = post(W[0], W[1])
    fr = bar(W)
    arr = q_arrow(ad(A.S, dv(thA - 90), 20), ad(B.S, dv(thB - 90), 20), bulge=-6)
    return [pn(A, '1', props=back, front=fr), pn(B, '2', ghost=A, props=back, front=fr, arrows=arr)]


add('remo_australiano', aussie_row())


def dips(hold=True):
    bar_h = 104
    Wp = (0, bar_h + 2.5 + 4)
    props = pbar(-62, 56, bar_h)
    legs = ('a', 255, 196, 282)
    legs2 = ('a', 259, 199, 284)
    top = Pose(ad(ad(Wp, (0, 1), 56), dv(85), -50), 85, 88, a1=('ik', Wp, 1), a2=('ik', (1, Wp[1]), 1), l1=legs, l2=legs2)
    if hold:
        return [pn(top, None, props=props)]
    SB = (4, Wp[1] + 29)
    hipB = ad(SB, dv(72), -50)
    bot = Pose(hipB, 72, 76, a1=('ik', Wp, -1), a2=('ik', (1, Wp[1]), -1), l1=legs, l2=legs2)
    arr = line_arrow((-30, top.S[1]), (-30, bot.S[1] + 2))
    return [pn(top, '1', props=props), pn(bot, '2', ghost=top, props=props, arrows=arr)]


add('paralelas', dips(True))
add('fondos', dips(False))


# ---------------- calentamiento y cardio ----------------

def march():
    p = stand(a1=('a', 236, 262), a2=('a', 300, 28), l1=('a', 6, 276, 0), l2=LEGS)
    arr = arc_arrow(p.j('hip'), 58, 288, 346)
    return [pn(p, None, arrows=arr)]


add('marcha', march())


def arm_circles():
    p = Pose((0, SY), 90, view='front', eye=False, a1=('a', 180, 180), a2=('a', 0, 0), l1=('a', 267, 270, 180), l2=('a', 273, 270, 0))
    arr = arc_arrow(p.j('W1'), 10, 40, 330) + arc_arrow(p.j('W2'), 10, 140, -150)
    return [pn(p, None, arrows=arr)]


add('circulos_brazos', arm_circles())


def hip_circles():
    hip = (0, SY)
    p = Pose(hip, 90, view='front', eye=False, a1=('ik', (-16, SY + 6), -1), a2=('ik', (16, SY + 6), 1),
             l1=('a', 265, 270, 180), l2=('a', 275, 270, 0))
    arr = arc_arrow((0, SY - 4), 34, 200, 510, ry=11)
    return [pn(p, None, arrows=arr)]


add('circulos_cadera', hip_circles())


def scap_wall():
    ank = (0, 3.5)
    th = 72
    S = ad(ank, dv(th), 132)
    W = ad(S, dv(th - 90), 56)

    def mk(c):
        return Pose(ad(ank, dv(th), 82), th, th - 4, a1=('ik', W, 1), l1=('ik', ank, 1, 0), curve=c)
    A, B = mk(-3), mk(7)
    props = wall(W[0] + 4.5, W[0] + 30, edge=W[0] + 4.5)
    up = ad(ad(ank, dv(th), 82 + 36), dv(th + 90), 16)
    arr = line_arrow(up, ad(up, dv(th + 90), 14))
    arr2 = line_arrow(ad(up, dv(th + 90), 14), up)
    return [pn(A, '1', props=props, arrows=arr2), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('escapular_pared', scap_wall())


def leg_swing():
    wx = 50
    kw = dict(a1=HANG, a2=('ik', (wx - 4, 126), -1))
    B = stand(l1=('a', 316, 316, 46), l2=LEGS, **kw)
    A = stand(l1=('a', 226, 226, 316), l2=LEGS, **kw)
    arr = arc_arrow((0, SY), 72, 232, 308)
    return [pn(B, None, ghost=A, props=wall(wx, wx + 26, edge=wx), arrows=arr)]


add('balanceo_pierna', leg_swing())


def mountain_climber():
    Wr = (62, 4.5)
    S = (62, 60.5)
    ank_y = 15.5
    th = math.degrees(math.asin((S[1] - ank_y) / 132))
    ank = (S[0] - 132 * math.cos(th * D), ank_y)
    hip = ad(ank, dv(th), 82)
    A = Pose(hip, th, th - 6, a1=('a', 270, 270), l1=('ik', ank, 1, 281))
    B = Pose(hip, th, th - 6, a1=('a', 270, 270), l1=('ik', (hip[0] - 2, 21), 1, 250), l2=('ik', ank, 1, 281))
    arr = q_arrow(ad(A.j('K1'), (0, -12)), ad(B.j('K1'), (-4, -12)), bulge=-6)
    props = mat(ank[0] - 18, 85)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('escalador', mountain_climber())


def shadow_box():
    hip = (0, 82)
    legs = dict(l1=('ik', (-21, 3.5), 1, 0), l2=('ik', (21, 3.5), 1, 0))
    guard = ('a', 300, 102)
    A = Pose(hip, 88, 86, a1=guard, a2=('a', 304, 98), **legs)
    B = Pose(hip, 86, 86, a1=('a', 2, 2), a2=('a', 304, 98), **legs)
    arr = line_arrow(ad(A.j('W1'), (4, 14)), ad(B.j('W1'), (-2, 14)))
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('boxeo', shadow_box())


# ---------------- postura y estiramientos ----------------

def chin_tuck():
    A = stand(n=50)
    B = stand(n=96)
    g = guide((0, A.S[1] - 6), (0, A.S[1] + 42))
    arr = line_arrow(ad(A.head, (0, 17)), ad(B.head, (2, 17)))
    vb = (-46, 96, 54, 96 + 100 / ASPECT)
    return [pn(A, '1', guides=g), pn(B, '2', ghost=A, guides=g, arrows=arr)]


add('chin_tuck', chin_tuck(), vb=(-62, 66, 70, 66 + 132 / ASPECT), floor=False)


def wall_angels():
    kw = dict(view='front', eye=False, l1=('a', 267, 270, 180), l2=('a', 273, 270, 0))
    A = Pose((0, SY), 90, a1=('a', 180, 90), a2=('a', 0, 90), **kw)
    B = Pose((0, SY), 90, a1=('a', 124, 104), a2=('a', 56, 76), **kw)
    wl = [rect(-78, 0, 78, 224, fill=PF, stroke='none', rx=0)]
    arr = line_arrow(ad(A.j('W1'), (-10, 4)), ad(B.j('W1'), (-12, -2))) + line_arrow(ad(A.j('W2'), (10, 4)), ad(B.j('W2'), (12, -2)))
    return [pn(A, '1', props=wl), pn(B, '2', ghost=A, props=wl, arrows=arr)]


add('angeles', wall_angels())


def chest_door():
    p = Pose((0, SY), 90, view='front', eye=False, a1=('a', 180, 90), a2=('a', 0, 90), l1=('a', 267, 270, 180), l2=('a', 273, 270, 0))
    return [pn(p, None, props=door_front(47.5))]


add('pecho_marco', chest_door())


def hip_flexor():
    knee = (-10, 5)
    hip = (1.5, 46)
    th = ang(hip, knee)
    p = Pose(hip, 93, 92, a1=hands_on_hips(hip, -1, 4, 8), l1=('a', th, 180, 180), l2=('ik', (44, 3.5), 1, 0))
    arr = line_arrow((hip[0] - 34, hip[1] + 4), (hip[0] - 15, hip[1] + 4))
    return [pn(p, None, props=mat(-70, 70), arrows=arr)]


add('flexor_cadera', hip_flexor())

ORDER = list(EX.keys())

# encuadre ancho para las posturas acostadas de un solo panel
for _k in ('plancha', 'plancha_lateral', 'hollow', 'hollow_completo', 'esfinge', 'puente_una'):
    EX[_k]['aspect'] = 2.2
    EX[_k]['scale'] = 1.3


# ================= versión sin muebles ni barras =================

def squat2():
    A = stand(a1=('a', 0, 0))
    B = Pose((-24, 46), 50, 66, a1=('a', 6, 6), l1=('ik', (0, 3.5), 1, 0))
    arr = q_arrow((-20, 98), (-40, 62), bulge=-6)
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('sentadilla', squat2())


def calf_single():
    toe = (13, 3.2)
    wx = 48
    poses = []
    for fa in (0, -48):
        ank = ad(toe, dv(fa), -FT)
        hip = (ank[0], ank[1] + 82)
        poses.append(Pose(hip, 90, a1=HANG, a2=('ik', (wx - 4, hip[1] + 44), -1),
                          l1=('a', 270, 270, fa), l2=('a', 266, 212, 300)))
    A, B = poses
    props = wall(wx, wx + 26, edge=wx)
    arr = line_arrow(ad(A.j('Hl1'), (-14, 4)), ad(B.j('Hl1'), (-14, 10)))
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('talones_suelo', calf_single())
add('remo_marco_cerca', door_row(126, 100))


def prone_pulldown():
    legs = dict(l1=('a', 357, 359, 0), l2=('a', 3, 1, 0))
    m = [rect(-128, -40, 112, 40, fill=MAT, stroke='none', rx=7)]
    A = Pose((0, 0), 180, view='front', eye=False, a1=('a', 198, 196), a2=('a', 162, 164), **legs)
    B = Pose((0, 0), 180, view='front', eye=False, a1=('a', 292, 222), a2=('a', 68, 138), **legs)
    arr = q_arrow(ad(A.j('W1'), (0, -6)), ad(B.j('E1'), (-4, -8)), bulge=-10) + \
        q_arrow(ad(A.j('W2'), (0, 6)), ad(B.j('E2'), (-4, 8)), bulge=10)
    return [pn(A, '1', props=m), pn(B, '2', ghost=A, props=m, arrows=arr)]


add('jalon_suelo', prone_pulldown(), floor=False)


def floor_dip():
    Wr = (-30, 4.5)
    ank = (54, 3.5)
    SA = ad(Wr, dv(80), 56)
    A = Pose(ad(SA, dv(130), -50), 130, 100, a1=('ik', Wr, -1), l1=('ik', ank, 1, 0))
    SB = (SA[0] - 2, SA[1] - 10)
    B = Pose(ad(SB, dv(132), -50), 132, 100, a1=('ik', Wr, -1), l1=('ik', ank, 1, 0))
    arr = line_arrow((A.hip[0] + 4, A.hip[1] + 30), (B.hip[0] + 4, B.hip[1] + 22))
    props = mat(-60, 75)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('fondo_suelo', floor_dip())


def leg_raise(bent=True):
    if bent:
        A = Pose((0, 9), 180, 176, a1=('a', 356, 0), l1=('a', 14, 6, 96), l2=('a', 15, 7, 97))
        B = Pose((0, 9), 180, 176, a1=('a', 356, 0), l1=('a', 86, 78, 168), l2=('a', 87, 79, 169))
    else:
        A = Pose((0, 9), 180, 176, a1=('a', 356, 0), l1=('a', 10, 10, 100), l2=('a', 11, 11, 101))
        B = Pose((0, 9), 180, 176, a1=('a', 356, 0), l1=('a', 88, 88, 178), l2=('a', 89, 89, 179))
    arr = arc_arrow((0, 9), 70, 22, 76)
    props = mat(-95, 100)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('elev_piernas', leg_raise())


def sumo():
    kw = dict(view='front', eye=False, db=[(0, 'vert')])

    def mk(y, ax):
        S = (0, y + TORSO)
        return Pose((0, y), 90, a1=('ik', (-3, S[1] - 14), -1), a2=('ik', (3, S[1] - 14), 1),
                    l1=('ik', (-ax, 3.5), -1, 210), l2=('ik', (ax, 3.5), 1, 330), **kw)
    ya = 3.5 + math.sqrt(82 ** 2 - 20.5 ** 2) - 1
    A, B = mk(ya, 30), mk(48, 32)
    arr = line_arrow((58, ya + 40), (58, 48 + 40))
    return [pn(A, '1'), pn(B, '2', ghost=A, arrows=arr)]


add('sumo', sumo())


def ham_bridge(single=False):
    S0 = (-60, 9)
    ank = (64, 3.5)
    A = Pose((-10, 9), 180, 177, a1=('a', 358, 0), l1=('ik', ank, 1, 80))
    hipB = ad(S0, dv(22), 50)
    if single:
        B = Pose(hipB, ang(hipB, S0), 177, a1=('a', 358, 0), l1=('a', 22, 22, 112), l2=('ik', ank, 1, 80))
        return [pn(B, None, props=mat(-95, 100))]
    B = Pose(hipB, ang(hipB, S0), 177, a1=('a', 358, 0), l1=('ik', ank, 1, 80))
    arr = line_arrow((-8, 14), (-12, 30))
    props = mat(-95, 100)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('puente_isquios', ham_bridge())
add('puente_isquios_una', ham_bridge(single=True))


def single_bridge2():
    S0 = (-60, 9)
    A = Pose((-10, 9), 180, 177, a1=('a', 358, 0), l1=('a', 40, 40, 130), l2=('ik', (40, 3.5), 1, 0))
    hipB = ad(S0, dv(35), 50)
    B = Pose(hipB, ang(hipB, S0), 177, a1=('a', 358, 0), l1=('a', 35, 35, 125), l2=('ik', (40, 3.5), 1, 0))
    arr = line_arrow((-12, 14), (-17, 31))
    props = mat(-95, 100)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('puente_una2', single_bridge2())


def pistol_frame():
    wx = 56
    props = wall(wx, wx + 30, edge=wx)
    hipA = (0, SY - 0.5)
    A = Pose(hipA, 90, a1=('ik', (wx - 4, 122), -1), l1=LEGS, l2=('a', 326, 326, 56))
    hipB = (-22, 31)
    tB = 62
    SB = ad(hipB, dv(tB), 50)
    B = Pose(hipB, tB, 64, a1=('ik', (wx - 4, SB[1] + 2), -1), l1=('ik', (0, 3.5), 1, 0), l2=('a', 4, 4, 94))
    arr = q_arrow((-26, 90), (-44, 56), bulge=-6)
    return [pn(A, '1', props=props), pn(B, '2', ghost=A, props=props, arrows=arr)]


add('pistol_marco', pistol_frame())

for _k in ('puente_isquios_una',):
    EX[_k]['aspect'] = 2.2
    EX[_k]['scale'] = 1.3
