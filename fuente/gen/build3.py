import re, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

OUT = os.path.join(HERE, '..', 'canvas', 'Main.dc.html')
subprocess.run([sys.executable, os.path.join(HERE, 'v3', 'tpl3.py')], check=True, stdout=subprocess.DEVNULL)
subprocess.run([sys.executable, os.path.join(HERE, 'v3', 'assemble.py')], check=True, stdout=subprocess.DEVNULL)

DATA_PROPS = ('{"pantalla":{"editor":"enum","options":["inicio","habitos","comida","salud","area","evaluacion","sesion","confirmar","test","victoria","ajustes","perfil"],"default":"inicio"},'
              '"datosEjemplo":{"editor":"boolean","default":false},'
              '"peso":{"editor":"int","default":70,"min":35,"max":180,"step":1,"unit":"kg"},'
              '"$preview":{"width":390,"height":844}}')

MARK = ('<svg viewBox="250 150 560 690" width="{w}" height="{h}" aria-hidden="true" style="display: block; flex: none">'
        '<g transform="translate(-36 0)"><path d="M512 470 V800" stroke="{st}" stroke-width="58" stroke-linecap="round"></path>'
        '<path d="{lf}" fill="{l1}"></path><path d="{rf}" fill="{l2}"></path></g></svg>')


def mark(h, st, l1, l2):
    import math
    from wordmark import lens
    big = 392; small = big * 0.618
    R = lens((512, 470), (512 + big * math.cos(math.radians(-45)), 470 + big * math.sin(math.radians(-45))), 0.5)
    L = lens((512, 548), (512 + small * math.cos(math.radians(-140)), 548 + small * math.sin(math.radians(-140))), 0.5)
    return MARK.format(w=round(h * 560 / 690, 1), h=h, st=st, l1=l1, l2=l2, lf=L, rf=R)


def brand_footer():
    from orbtpl import orb_tpl
    return ('<div aria-label="keystone" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0 4px">'
            + orb_tpl(44) + '<span style="font-size: 28px; font-weight: 500; letter-spacing: -0.055em; margin-top: 8px">keystone</span>'
            '<span style="font-family: {{ mono }}; font-size: 13px; color: {{ th.tertiary }}">Hecha para {{ prefs.nombre }}</span></div>')


tpl = open(os.path.join(HERE, 'Main3.tpl.html')).read()
script = open(os.path.join(HERE, 'script3.js')).read()
step_html = open(os.path.join(HERE, 'v3', 'session_step.html')).read()
tpl = tpl.replace('%%SESSION_STEPS%%',
    '<sc-if value="{{ ss.even }}" hint-placeholder-val="{{ true }}">\n' + step_html + '</sc-if>\n'
    '<sc-if value="{{ ss.odd }}" hint-placeholder-val="{{ false }}">\n' + step_html + '</sc-if>')
script = script.replace('%%SESSION%%', open(os.path.join(HERE, 'session.json')).read())
rep = {
    '%%BRAND%%': brand_footer(),
    '%%SCRIPT%%': f"<script type=\"text/x-dc\" data-dc-script data-props='{DATA_PROPS}'>\n{script}</script>",
}
for k, v in rep.items():
    assert k in tpl, k
    tpl = tpl.replace(k, v)
assert '%%' not in tpl, re.findall(r'%%\w+%%', tpl)
open(OUT, 'w').write(tpl)
print('ok', len(tpl))
