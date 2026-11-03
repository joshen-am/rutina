"""Plantilla v3 de sprout: sistema visual premium (neutros zinc, Geist, acento cálido)."""
import sys as _s, os as _o
_s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), ".."))
from orbtpl import orb_tpl
import os
HERE = os.path.dirname(os.path.abspath(__file__))

B = 'appearance: none; border: 0; margin: 0; font: inherit; cursor: pointer;'
MONO = 'font-family: {{ mono }};'
EYE = MONO + ' font-size: 11px; line-height: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: {{ th.sub }}'
NUM = 'font-variant-numeric: tabular-nums;'
CARD = 'background: {{ th.card }}; border-radius: 22px'
HALO_BG = 'background: #0B0B0C; box-shadow: inset 0 0 0 1px {{ th.line }}'
HALO = ('<span aria-hidden="true" style="position: absolute; inset: 0; pointer-events: none; '
        'background: {{ halo }}; transition: background 0.6s"></span>')


def ico(d, size=20, color='currentColor', sw=1.7, fill='none'):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{d}"></path></svg>')


CHEV = ico('M9 5l7 7-7 7', 14, '{{ th.tertiary }}', 2.2)
PLUS = 'M12 5v14M5 12h14'
MINUS = 'M5 12h14'
CHECK = 'M5 12.5l4.5 4.5L19 7.5'
BACK = 'M15 5l-7 7 7 7'
CLOSE = 'M6 6l12 12M18 6L6 18'
CAMERA = 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
DROP = 'M12 3c3.5 4.4 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.4 12 3z'


def eyebrow(text, color='{{ th.sub }}'):
    return f'<span style="{EYE}; color: {color}">{text}</span>'


def pill(label, fn, kind='primary', extra='', h=52, attrs=''):
    st = {'primary': 'background: {{ th.inv }}; color: {{ th.onInv }}',
          'secondary': 'background: {{ th.fill }}; color: {{ th.text }}',
          'ghost': 'background: transparent; color: {{ th.text }}',
          'light': 'background: #FAFAFA; color: #09090B',
          'glass': 'background: rgba(255, 255, 255, 0.1); color: #FAFAFA'}[kind]
    return (f'<button type="button" onClick="{{{{ {fn} }}}}" {attrs} style="{B} height: {h}px; padding: 0 22px; border-radius: 999px; {st}; '
            f'font-size: 16px; font-weight: 500; letter-spacing: -0.01em; display: flex; align-items: center; justify-content: center; gap: 8px; {extra}">{label}</button>')


def round_btn(fn, d, label, size=40, bg='{{ th.fill }}', color='{{ th.text }}'):
    return (f'<button type="button" onClick="{{{{ {fn} }}}}" aria-label="{label}" style="{B} padding: 0; width: {size}px; height: {size}px; flex: none; '
            f'border-radius: 50%; background: {bg}; color: {color}; display: flex; align-items: center; justify-content: center">{ico(d, 16, "currentColor", 2)}</button>')


AVATAR = (f'<button type="button" onClick="{{{{ openMenu }}}}" aria-label="Perfil y apariencia" style="{B} padding: 0; width: 40px; height: 40px; flex: none; border-radius: 50%; '
          'background: {{ th.fill }}; color: {{ th.text }}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 500">{{ initial }}</button>')


def header(eye, title):
    return ('<header style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 0 4px 4px">\n'
            '<div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">\n'
            f'{eyebrow(eye)}\n'
            f'<h1 style="margin: 0; font-size: 34px; line-height: 38px; font-weight: 500; letter-spacing: -0.04em">{title}</h1>\n'
            f'</div>\n{AVATAR}\n</header>')


def screen(cond, inner, bottom=120, gap=14):
    return (f'<sc-if value="{{{{ {cond} }}}}" hint-placeholder-val="{{{{ false }}}}">\n'
            f'<div id="sc-{cond}" class="scroll" style="position: absolute; inset: 0; overflow-y: auto; box-sizing: border-box; padding: 60px 16px {bottom}px; display: flex; flex-direction: column; gap: {gap}px">\n'
            f'{inner}\n</div>\n</sc-if>')


def sec_title(title, right=''):
    r = f'<span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}; {NUM}">{right}</span>' if right else ''
    return (f'<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 10px 4px 0">'
            f'<h2 style="margin: 0; font-size: 20px; line-height: 26px; font-weight: 500; letter-spacing: -0.025em">{title}</h2>{r}</div>')


def switch(on, track, knob, fn, label_attr):
    return (f'<button type="button" role="switch" aria-checked="{{{{ {on} }}}}" {label_attr} onClick="{{{{ {fn} }}}}" style="{B} padding: 2px; width: 51px; height: 31px; flex: none; '
            f'border-radius: 16px; background: {{{{ {track} }}}}; display: flex; align-items: center; transition: background 0.25s">'
            f'<span style="width: 27px; height: 27px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.18); transform: translateX({{{{ {knob} }}}}px); '
            'transition: transform 0.25s cubic-bezier(.32,.72,0,1)"></span></button>')


def stepper(minus, plus, value, aria_m, aria_p):
    return ('<div style="display: flex; align-items: center; gap: 10px">'
            f'<span style="{MONO} font-size: 15px; {NUM} white-space: nowrap">{value}</span>'
            f'{round_btn(minus, MINUS, aria_m, 36)}{round_btn(plus, PLUS, aria_p, 36)}</div>')


def grade_badge(letter, color, size=30, fs=13):
    return (f'<span style="width: {size}px; height: {size}px; flex: none; border-radius: 50%; box-shadow: inset 0 0 0 1.5px {color}; color: {color}; '
            f'display: flex; align-items: center; justify-content: center; {MONO} font-size: {fs}px; font-weight: 500">{letter}</span>')


def sheet(cond, inner, close_fn, label, top=None):
    pos = f'top: {top}px;' if top else 'max-height: 88%;'
    return (f'<sc-if value="{{{{ {cond} }}}}" hint-placeholder-val="{{{{ false }}}}">\n'
            '<div style="position: absolute; inset: 0; z-index: 30">\n'
            f'<button type="button" aria-label="Cerrar" onClick="{{{{ {close_fn} }}}}" style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0; margin: 0; padding: 0; background: {{{{ th.scrim }}}}; cursor: default; animation: fade 0.25s ease-out both"></button>\n'
            f'<div role="dialog" aria-modal="true" aria-label="{label}" class="scroll" style="position: absolute; left: 0; right: 0; bottom: 0; {pos} overflow-y: auto; box-sizing: border-box; background: {{{{ th.menu }}}}; '
            'border-radius: 28px 28px 0 0; padding: 10px 16px 34px; display: flex; flex-direction: column; gap: 14px; animation: sheet 0.42s cubic-bezier(.32,.72,0,1) both">\n'
            '<span aria-hidden="true" style="align-self: center; width: 36px; height: 5px; border-radius: 3px; background: {{ th.fill }}; margin-bottom: 4px"></span>\n'
            f'{inner}\n</div>\n</div>\n</sc-if>')


# ---------------------------------------------------------------- inicio

def home_section(key, inner):
    return f'''<div style="order: {{{{ ho.{key}.order }}}}; display: {{{{ ho.{key}.display }}}}; border-radius: 26px; padding: {{{{ ho.pad }}}}; box-shadow: {{{{ ho.frame }}}}">
<sc-if value="{{{{ editHome }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 4px 10px">
<span style="font-size: 15px; font-weight: 500">{{{{ ho.{key}.label }}}}</span>
<div style="display: flex; align-items: center; gap: 6px">
{round_btn(f"ho.{key}.up", "M6 15l6-6 6 6", "Subir", 40).replace('style="', 'style="opacity: {{ ho.' + key + '.upOp }}; ', 1)}
{round_btn(f"ho.{key}.down", "M6 9l6 6 6-6", "Bajar", 40).replace('style="', 'style="opacity: {{ ho.' + key + '.downOp }}; ', 1)}
<button type="button" onClick="{{{{ ho.{key}.toggle }}}}" aria-pressed="{{{{ ho.{key}.hidden }}}}" style="{B} height: 40px; min-width: 84px; padding: 0 14px; border-radius: 20px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; font-size: 14px; font-weight: 500">{{{{ ho.{key}.toggleLabel }}}}</button>
</div>
</div>
</sc-if>
<div style="opacity: {{{{ ho.{key}.opacity }}}}; pointer-events: {{{{ ho.pe }}}}; max-height: {{{{ ho.maxH }}}}; overflow: {{{{ ho.ov }}}}; border-radius: 22px; display: flex; flex-direction: column; gap: 14px">
{inner}
</div>
</div>'''


def health_hero(prefix, on_has, on_none):
    """Tarjeta oscura con halo cálido: puntaje general o invitación a la evaluación."""
    return f'''<sc-if value="{{{{ {prefix}.has }}}}" hint-placeholder-val="{{{{ true }}}}">
<button type="button" onClick="{{{{ {on_has} }}}}" style="{B} position: relative; overflow: hidden; width: 100%; text-align: left; {HALO_BG}; color: #FAFAFA; border-radius: 26px; padding: 20px 20px 18px; display: flex; flex-direction: column; gap: 18px; min-height: 236px">
{HALO}
<span style="position: relative; display: flex; justify-content: space-between; align-items: center; gap: 8px">{eyebrow("Perfil de salud", "rgba(250, 250, 250, 0.62)")}<span style="{MONO} font-size: 11px; color: rgba(250, 250, 250, 0.62)">8 ÁREAS</span></span>
<span style="position: relative; display: flex; align-items: flex-end; gap: 14px">
<span style="font-size: 76px; line-height: 70px; font-weight: 400; letter-spacing: -0.06em; {NUM}">{{{{ {prefix}.overall }}}}</span>
<span style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 6px">
<span style="display: flex; align-items: center; gap: 8px">{grade_badge("{{ " + prefix + ".grade }}", "{{ " + prefix + ".gColor }}", 26, 12)}<span style="font-size: 15px; font-weight: 500">{{{{ {prefix}.gLabel }}}}</span></span>
<span style="{MONO} font-size: 12px; color: rgba(250, 250, 250, 0.6)">de 100 · evaluación {{{{ {prefix}.evalAgo }}}}</span>
</span>
</span>
<sc-if value="{{{{ {prefix}.hasFocus }}}}" hint-placeholder-val="{{{{ true }}}}">
<span style="position: relative; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 16px; background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px)">
<span style="{MONO} font-size: 11px; letter-spacing: 0.08em; color: rgba(250, 250, 250, 0.6)">ENFÓCATE EN</span>
<sc-for list="{{{{ {prefix}.focus }}}}" as="fo" hint-placeholder-count="2">
<span style="display: flex; align-items: center; gap: 10px"><span style="width: 8px; height: 8px; border-radius: 50%; background: {{{{ fo.gColor }}}}; flex: none"></span><span style="flex: 1; font-size: 15px">{{{{ fo.name }}}}</span><span style="font-size: 13px; color: rgba(250, 250, 250, 0.62)">{{{{ fo.status }}}}</span></span>
</sc-for>
</span>
</sc-if>
</button>
</sc-if>
<sc-if value="{{{{ {prefix}.none }}}}" hint-placeholder-val="{{{{ false }}}}">
<button type="button" onClick="{{{{ {on_none} }}}}" style="{B} position: relative; overflow: hidden; width: 100%; text-align: left; {HALO_BG}; color: #FAFAFA; border-radius: 26px; padding: 22px 20px 20px; display: flex; flex-direction: column; gap: 14px; min-height: 270px">
{HALO}
<span style="position: relative">{eyebrow("Perfil de salud", "rgba(250, 250, 250, 0.62)")}</span>
<span style="position: relative; font-size: 30px; line-height: 34px; font-weight: 400; letter-spacing: -0.04em; max-width: 290px">Conoce tu punto de partida</span>
<span style="position: relative; font-size: 15px; line-height: 21px; color: rgba(250, 250, 250, 0.72); max-width: 300px">Una evaluación de 3 minutos arma tu perfil y califica 8 áreas: sueño, nutrición, hidratación, fuerza, cardio, cuerpo, corazón y mente.</span>
<span style="position: relative; margin-top: auto; align-self: flex-start; height: 48px; padding: 0 22px; border-radius: 999px; background: #FAFAFA; color: #09090B; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px">Empezar evaluación {ico("M5 12h14M13 6l6 6-6 6", 16, "currentColor", 2)}</span>
</button>
</sc-if>'''


def water_card(idp):
    return f'''<sc-if value="{{{{ hd.water.on }}}}" hint-placeholder-val="{{{{ true }}}}">
<section aria-labelledby="{idp}" style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px">
<div style="display: flex; flex-direction: column; gap: 6px">{eyebrow("Agua")}<h2 id="{idp}" style="margin: 0; font-size: 28px; line-height: 30px; font-weight: 400; letter-spacing: -0.04em; {NUM}">{{{{ hd.water.liters }}}}<span style="font-size: 15px; color: {{{{ th.sub }}}}; letter-spacing: -0.01em"> / {{{{ hd.water.goalL }}}} L</span></h2></div>
<span style="font-size: 13px; color: {{{{ th.sub }}}}; padding-top: 2px">{{{{ hd.water.left }}}}</span>
</div>
<div style="display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 5px">
<sc-for list="{{{{ hd.water.glasses }}}}" as="g" hint-placeholder-count="10">
<button type="button" onClick="{{{{ g.pick }}}}" aria-label="{{{{ g.aria }}}}" style="{B} padding: 0; height: 38px; border-radius: 10px; background: {{{{ g.bg }}}}; display: flex; align-items: center; justify-content: center; transition: background 0.2s">{ico(DROP, 15, "{{ g.stroke }}", 1.6, "{{ g.fill }}")}</button>
</sc-for>
</div>
<div style="display: grid; grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr); gap: 8px">
<button type="button" onClick="{{{{ hd.water.sub }}}}" aria-label="Quitar un vaso" style="{B} height: 44px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; display: flex; align-items: center; justify-content: center">{ico(MINUS, 16, "currentColor", 2)}</button>
<button type="button" onClick="{{{{ hd.water.add }}}}" style="{B} height: 44px; border-radius: 999px; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; font-size: 15px; font-weight: 500">+ Vaso 250 ml</button>
<button type="button" onClick="{{{{ hd.water.add2 }}}}" style="{B} height: 44px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; font-size: 15px; font-weight: 500">+ Botella 500</button>
</div>
<p style="margin: 0; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{{{{ hd.water.cue }}}}</p>
</section>
</sc-if>'''


HIST = f'''<section aria-labelledby="hist" style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px">
<h2 id="hist" style="margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -0.02em">Historial</h2>
<span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}; {NUM}">{{{{ hist.summary }}}}</span>
</div>
<div style="display: flex; gap: 6px">
<div aria-hidden="true" style="display: grid; grid-template-rows: 14px repeat(7, 15px); row-gap: 3px; {MONO} font-size: 9px; line-height: 15px; color: {{{{ th.tertiary }}}}">
<span></span><span>L</span><span></span><span>M</span><span></span><span>V</span><span></span><span></span>
</div>
<div role="img" aria-label="{{{{ hist.aria }}}}" style="flex: 1; min-width: 0; display: grid; grid-template-columns: repeat({{{{ hist.weeks }}}}, minmax(0, 1fr)); grid-template-rows: 14px repeat(7, 15px); grid-auto-flow: column; gap: 3px">
<sc-for list="{{{{ hist.items }}}}" as="hc" hint-placeholder-count="136">
<sc-if value="{{{{ hc.isLabel }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="{MONO} font-size: 9px; line-height: 14px; color: {{{{ th.tertiary }}}}; white-space: nowrap; overflow: visible">{{{{ hc.text }}}}</span></sc-if>
<sc-if value="{{{{ hc.isCell }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="border-radius: 4px; background: {{{{ hc.bg }}}}; box-shadow: {{{{ hc.ring }}}}"></span></sc-if>
</sc-for>
</div>
</div>
<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; color: {{{{ th.sub }}}}">
<span>Hábitos y entrenos de cada día</span>
<span style="display: flex; align-items: center; gap: 3px">Nada
<sc-for list="{{{{ hist.scale }}}}" as="hs" hint-placeholder-count="5"><span style="width: 10px; height: 10px; border-radius: 3px; background: {{{{ hs.bg }}}}"></span></sc-for>
Todo</span>
</div>
</section>'''


def ring(size, r, sw, off_hole, color, dash, track='{{ th.fill }}'):
    c = size / 2
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true">'
            f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"></circle>'
            f'<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-dasharray="{dash}" '
            f'stroke-dashoffset="{off_hole}" transform="rotate(-90 {c} {c})" style="transition: stroke-dashoffset 0.6s cubic-bezier(.32,.72,0,1)"></circle></svg>')


HABITS_HOME = f'''<button type="button" onClick="{{{{ goHabitos }}}}" style="{B} color: inherit; text-align: left; width: 100%; {CARD}; padding: 16px 18px; display: flex; align-items: center; gap: 16px">
<span style="position: relative; width: 52px; height: 52px; flex: none">{ring(52, 22, 5, "{{ hd.ringOff52 }}", "{{ th.text }}", 138.2)}
<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; {MONO} font-size: 12px; {NUM}">{{{{ hd.done }}}}/{{{{ hd.total }}}}</span></span>
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px"><span style="font-size: 17px; font-weight: 500; letter-spacing: -0.02em">Hábitos de hoy</span><span style="font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{{{{ hd.sub }}}}</span></span>
{CHEV}
</button>'''

FOOD_HOME = f'''<div style="{CARD}; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; align-items: center; gap: 14px">
<button type="button" onClick="{{{{ goComida }}}}" style="{B} color: inherit; text-align: left; flex: 1; min-width: 0; padding: 0; background: transparent; display: flex; flex-direction: column; gap: 6px">
{eyebrow("Comida de hoy")}
<span style="font-size: 28px; line-height: 30px; font-weight: 400; letter-spacing: -0.04em; {NUM}">{{{{ fh.kcal }}}}<span style="font-size: 15px; color: {{{{ th.sub }}}}; letter-spacing: -0.01em"> / {{{{ fh.goal }}}} kcal</span></span>
</button>
<button type="button" onClick="{{{{ fh.add }}}}" aria-label="Registrar comida" style="{B} width: 44px; height: 44px; flex: none; border-radius: 50%; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; display: flex; align-items: center; justify-content: center">{ico(CAMERA, 19, "currentColor", 1.8)}</button>
</div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px">
<sc-for list="{{{{ fh.macros }}}}" as="mc" hint-placeholder-count="4">
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
<span style="font-size: 11px; color: {{{{ th.sub }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ mc.label }}}}</span>
<div style="height: 4px; border-radius: 2px; background: {{{{ th.fill }}}}; overflow: hidden"><div style="height: 100%; width: {{{{ mc.pct }}}}%; background: {{{{ mc.color }}}}; border-radius: 2px"></div></div>
<span style="{MONO} font-size: 11px; {NUM}">{{{{ mc.val }}}}<span style="color: {{{{ th.tertiary }}}}">/{{{{ mc.goal }}}}</span></span>
</div>
</sc-for>
</div>
</div>'''

RECUP = f'''<section aria-labelledby="recup" style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px">
<h2 id="recup" style="margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -0.02em">Recuperación</h2>
<span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}">{{{{ rec.summary }}}}</span>
</div>
<div style="display: flex; align-items: center; gap: 12px">
<div id="b3-rec" class="body3d" role="img" aria-label="Cuerpo con la carga de cada músculo" data-loads="{{{{ b3.rec }}}}" data-dark="{{{{ b3.dark }}}}" data-key="rec" style="width: 128px; height: 210px; flex: none; background: url({{{{ b3.fallback }}}}) center / contain no-repeat"></div>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
<sc-if value="{{{{ rec.has }}}}" hint-placeholder-val="{{{{ true }}}}">
<sc-for list="{{{{ rec.top }}}}" as="rt" hint-placeholder-count="3">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 44px; box-shadow: inset 0 -0.5px 0 {{{{ th.sep }}}}">
<span style="display: flex; flex-direction: column; gap: 1px; min-width: 0"><span style="font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ rt.name }}}}</span><span style="font-size: 12px; color: {{{{ th.sub }}}}">{{{{ rt.ready }}}}</span></span>
<span style="{MONO} font-size: 13px; color: {{{{ c.heatText }}}}; {NUM}">{{{{ rt.pct }}}}%</span>
</div>
</sc-for>
</sc-if>
<sc-if value="{{{{ rec.none }}}}" hint-placeholder-val="{{{{ false }}}}">
<p style="margin: 0; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">Todos tus músculos están recuperados. Al terminar una sesión verás cuáles trabajaste y cuándo vuelven a estar listos.</p>
</sc-if>
</div>
</div>
</section>'''

WEEK = f'''<nav aria-label="Semana" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px">
<sc-for list="{{{{ days }}}}" as="d" hint-placeholder-count="7">
<button type="button" onClick="{{{{ d.pick }}}}" aria-label="{{{{ d.aria }}}}" aria-pressed="{{{{ d.selected }}}}" style="{B} padding: 0; height: 72px; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: {{{{ d.bg }}}}; color: {{{{ d.fg }}}}; box-shadow: {{{{ d.ring }}}}">
<span style="{MONO} font-size: 10px; color: {{{{ d.sub }}}}">{{{{ d.letter }}}}</span>
<span style="font-size: 17px; font-weight: 500; {NUM}">{{{{ d.num }}}}</span>
<span style="height: 10px; display: flex; align-items: center; justify-content: center">
<sc-if value="{{{{ d.isDone }}}}" hint-placeholder-val="{{{{ false }}}}">{ico(CHECK, 11, "{{ d.mark }}", 3)}</sc-if>
<sc-if value="{{{{ d.isMissed }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="width: 8px; height: 1.5px; border-radius: 1px; background: {{{{ d.sub }}}}"></span></sc-if>
<sc-if value="{{{{ d.isPlanned }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="width: 4px; height: 4px; border-radius: 50%; background: {{{{ d.sub }}}}"></span></sc-if>
</span>
</button>
</sc-for>
</nav>'''

ROUTINE = f'''<sc-if value="{{{{ hasRoutine }}}}" hint-placeholder-val="{{{{ true }}}}">
<section aria-label="Rutina del día" style="{CARD}; overflow: hidden">
<div style="padding: 18px 18px 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px">
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
{eyebrow("Rutina · {{ r.minutes }} min")}
<h2 style="margin: 0; font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.035em">{{{{ r.name }}}}</h2>
<p style="margin: 0; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">{{{{ r.title }}}}</p>
</div>
<sc-if value="{{{{ isDone }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="flex: none; display: flex; align-items: center; gap: 5px; {MONO} font-size: 11px; padding: 6px 10px; border-radius: 999px; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}">{ico(CHECK, 11, "currentColor", 3)}HECHA</span></sc-if>
<sc-if value="{{{{ isMissed }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="flex: none; {MONO} font-size: 11px; padding: 6px 10px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.sub }}}}">{{{{ missedLabel }}}}</span></sc-if>
</div>
<ol style="list-style: none; margin: 0; padding: 0 0 0 18px">
<sc-for list="{{{{ r.exercises }}}}" as="e" hint-placeholder-count="6">
<li style="display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 8px 18px 8px 0; box-sizing: border-box; border-top: 0.5px solid {{{{ th.sep }}}}">
<span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}; width: 18px; flex: none">{{{{ e.n }}}}</span>
<span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 16px; line-height: 21px">{{{{ e.name }}}}</span><span style="{MONO} font-size: 12px; line-height: 16px; color: {{{{ th.sub }}}}">{{{{ e.sub }}}}</span></span>
</li>
</sc-for>
</ol>
<p style="margin: 0; padding: 12px 18px 16px; border-top: 0.5px solid {{{{ th.sep }}}}; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{{{{ r.note }}}}</p>
</section>
</sc-if>
<sc-if value="{{{{ isRest }}}}" hint-placeholder-val="{{{{ false }}}}">
<section style="{CARD}; padding: 20px 18px; display: flex; flex-direction: column; gap: 6px">
{eyebrow("Rutina")}
<h2 style="margin: 0; font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.035em">Descanso</h2>
<p style="margin: 0; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">No hay rutina programada para este día. Recuperarse también es parte del plan.</p>
</section>
</sc-if>'''

BACKUP_NUDGE = f'''<sc-if value="{{{{ showBackupNudge }}}}" hint-placeholder-val="{{{{ false }}}}">
<section aria-label="Respaldo" style="{CARD}; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px">
<span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 16px; font-weight: 500">Respalda tus datos</span><span style="font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">Guarda una copia en Archivos o iCloud Drive por si cambias de teléfono.</span></span>
<div style="display: flex; gap: 8px">{pill("Respaldar", "exportBackup", "primary", "flex: 1", 44)}{pill("Ahora no", "snoozeBackup", "secondary", "flex: 1", 44)}</div>
</section>
</sc-if>'''


def inicio():
    secs = {
        'salud': health_hero('hs', 'goSalud', 'hs.startEval'),
        'hist': HIST,
        'habitos': HABITS_HOME,
        'comida': FOOD_HOME,
        'agua': water_card('agua-home'),
        'recup': RECUP,
        'semana': WEEK,
        'rutina': ROUTINE,
    }
    body = (f'<header style="display: flex; flex-direction: column; gap: 22px; padding: 0 4px 4px">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px"><span aria-label="keystone" style="display: flex; align-items: center; gap: 8px">{orb_tpl(24)}<span style="font-size: 22px; font-weight: 500; letter-spacing: -0.055em">keystone</span></span>{AVATAR}</div>'
            f'<div style="display: flex; flex-direction: column; gap: 8px">{eyebrow("{{ dateLabel }}")}'
            f'<h1 style="margin: 0; font-size: 34px; line-height: 38px; font-weight: 500; letter-spacing: -0.04em">{{{{ greeting }}}}</h1></div></header>')
    body += '\n' + BACKUP_NUDGE + '\n'
    body += '\n'.join(home_section(k, v) for k, v in secs.items())
    body += f'''
<div style="order: 100; display: flex; justify-content: center; padding-top: 4px">
<button type="button" onClick="{{{{ toggleEdit }}}}" style="{B} height: 40px; padding: 0 16px; border-radius: 999px; background: transparent; color: {{{{ th.sub }}}}; font-size: 14px; display: flex; align-items: center; gap: 6px">{ico("M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3", 15, "currentColor", 1.8)}{{{{ editLabel }}}}</button>
</div>'''
    out = screen('showInicio', body, 210)
    out += f'''
<sc-if value="{{{{ showInicio }}}}" hint-placeholder-val="{{{{ true }}}}">
<sc-if value="{{{{ editHome }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 0; right: 0; bottom: 83px; box-sizing: border-box; padding: 10px 16px 12px; background: {{{{ th.bg }}}}; display: flex; flex-direction: column; gap: 8px">
<p style="margin: 0; text-align: center; font-size: 13px; color: {{{{ th.sub }}}}">Ordena las secciones con las flechas u oculta las que no uses.</p>
{pill("Listo", "toggleEdit")}
</div>
</sc-if>
<sc-if value="{{{{ showBarNow }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="position: absolute; left: 0; right: 0; bottom: 83px; box-sizing: border-box; padding: 18px 16px 4px; background: linear-gradient(180deg, transparent, {{{{ th.bg }}}} 26%); display: flex; flex-direction: column; gap: 2px">
<sc-if value="{{{{ canFinish }}}}" hint-placeholder-val="{{{{ true }}}}">
{pill(ico("M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z", 13, "none", 0, "currentColor") + "{{ startLabel }}", "startSession")}
<div style="display: flex; justify-content: center; gap: 4px">
<button type="button" onClick="{{{{ openConfirm }}}}" style="{B} height: 40px; padding: 0 10px; background: transparent; color: {{{{ th.sub }}}}; font-size: 14px">Ya la hice, solo registrarla</button>
<sc-if value="{{{{ hasSess }}}}" hint-placeholder-val="{{{{ false }}}}"><button type="button" onClick="{{{{ discardSession }}}}" style="{B} height: 40px; padding: 0 10px; background: transparent; color: {{{{ th.danger }}}}; font-size: 14px">Descartar</button></sc-if>
</div>
</sc-if>
<sc-if value="{{{{ isDone }}}}" hint-placeholder-val="{{{{ false }}}}">{pill("Ver resumen", "showSummary", "secondary")}<span style="height: 40px"></span></sc-if>
<sc-if value="{{{{ isMissed }}}}" hint-placeholder-val="{{{{ false }}}}">{pill("Sí la completé", "openConfirm", "secondary")}<span style="height: 40px"></span></sc-if>
<sc-if value="{{{{ isFuture }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="margin: 0; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: {{{{ th.sub }}}}">Programada para el {{{{ selName }}}}</p><span style="height: 40px"></span></sc-if>
</div>
</sc-if>
</sc-if>'''
    return out


# ---------------------------------------------------------------- hábitos

def habitos():
    body = header('{{ hd.dateLabel }}', 'Hábitos') + f'''
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: {{{{ th.card }}}}; border-radius: 999px; padding: 4px">
{round_btn("hd.prev", BACK, "Día anterior", 40, "transparent").replace('style="', 'style="opacity: {{ hd.prevOp }}; ', 1)}
<span style="font-size: 15px; font-weight: 500">{{{{ hd.dayLabel }}}}</span>
{round_btn("hd.next", "M9 5l7 7-7 7", "Día siguiente", 40, "transparent").replace('style="', 'style="opacity: {{ hd.nextOp }}; ', 1)}
</div>
<section aria-label="Resumen del día" style="{CARD}; padding: 18px; display: flex; align-items: center; gap: 18px">
<div style="position: relative; width: 84px; height: 84px; flex: none">{ring(84, 36, 7, "{{ hd.ringOff84 }}", "{{ th.text }}", 226.2)}
<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 400; letter-spacing: -0.04em; {NUM}">{{{{ hd.done }}}}/{{{{ hd.total }}}}</div></div>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 20px; line-height: 25px; font-weight: 500; letter-spacing: -0.03em">{{{{ hd.title }}}}</span><span style="font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">{{{{ hd.sub }}}}</span></div>
</section>
{water_card("agua-h")}
<section aria-label="Hábitos" style="{CARD}; padding: 0 0 0 18px">
<sc-for list="{{{{ hd.items }}}}" as="h" hint-placeholder-count="6">
<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px 18px 16px 0; box-shadow: {{{{ h.line }}}}">
<div style="display: flex; align-items: center; gap: 12px">
<span style="width: 38px; height: 38px; border-radius: 12px; flex: none; background: {{{{ h.tint }}}}; display: flex; align-items: center; justify-content: center">{ico("{{ h.icon }}", 19, "{{ h.color }}", 1.8)}</span>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 500; letter-spacing: -0.015em">{{{{ h.name }}}}</span><span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}; {NUM}">{{{{ h.status }}}}</span></div>
<sc-if value="{{{{ h.isBin }}}}" hint-placeholder-val="{{{{ true }}}}">
<button type="button" onClick="{{{{ h.toggle }}}}" aria-label="{{{{ h.name }}}}" aria-pressed="{{{{ h.met }}}}" style="{B} padding: 0; width: 40px; height: 40px; border-radius: 50%; flex: none; background: {{{{ h.checkBg }}}}; color: {{{{ h.checkFg }}}}; display: flex; align-items: center; justify-content: center; transition: background 0.2s">{ico(CHECK, 18, "currentColor", 2.6)}</button>
</sc-if>
<sc-if value="{{{{ h.isNum }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: center; gap: 6px; flex: none">
{round_btn("h.minus", MINUS, "Restar", 36)}
<span style="min-width: 30px; text-align: center; {MONO} font-size: 15px; {NUM}">{{{{ h.valueShort }}}}</span>
{round_btn("h.plus", PLUS, "Sumar", 36)}
</div>
</sc-if>
<sc-if value="{{{{ h.isAuto }}}}" hint-placeholder-val="{{{{ false }}}}">
<span style="width: 40px; height: 40px; border-radius: 50%; flex: none; background: {{{{ h.checkBg }}}}; color: {{{{ h.checkFg }}}}; display: flex; align-items: center; justify-content: center">{ico(CHECK, 18, "currentColor", 2.6)}</span>
</sc-if>
</div>
<sc-if value="{{{{ h.hasBar }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-left: 50px; height: 3px; border-radius: 2px; background: {{{{ th.fill }}}}; overflow: hidden"><div style="height: 100%; border-radius: 2px; width: {{{{ h.pct }}}}%; background: {{{{ h.barColor }}}}; transition: width 0.3s"></div></div>
</sc-if>
<span style="margin-left: 50px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{{{{ h.cue }}}}</span>
<sc-if value="{{{{ h.atRisk }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="margin-left: 50px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}">
<span style="flex: 1; font-size: 13px; line-height: 18px"><b style="font-weight: 500">Nunca falles dos veces.</b> Ayer no se cumplió: hoy basta con la versión mínima, {{{{ h.mini }}}}.</span>
<button type="button" onClick="{{{{ h.doMini }}}}" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; flex: none; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; font-size: 13px; font-weight: 500">La hice</button>
</div>
</sc-if>
</div>
</sc-for>
</section>
{pill("Elegir y ajustar hábitos", "openHabEditor", "secondary")}
<p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">Cada hábito tiene una señal concreta para empezarlo y una versión mínima para los días difíciles. Lo importante es no fallar dos días seguidos.</p>'''
    out = screen('showHabitos', body, 110)
    out += f'''
<sc-if value="{{{{ isHabEditor }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; background: {{{{ th.bg }}}}; display: flex; flex-direction: column; animation: present 0.45s cubic-bezier(.32,.72,0,1) both">
<div style="padding: 54px 8px 8px; display: grid; grid-template-columns: 80px minmax(0, 1fr) 80px; align-items: center">
<span></span>
<span style="text-align: center; font-size: 16px; font-weight: 500">Tus hábitos</span>
<button type="button" onClick="{{{{ closeHabEditor }}}}" style="{B} justify-self: end; height: 40px; padding: 0 14px; border-radius: 999px; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; font-size: 14px; font-weight: 500">Listo</button>
</div>
<div class="scroll" style="flex: 1; overflow-y: auto; padding: 8px 16px 40px; display: flex; flex-direction: column; gap: 12px">
<p style="margin: 0; padding: 0 4px; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">Empieza con pocos. Escribe la señal como «Después de [algo que ya haces], voy a [hábito]» y una versión mínima para los días sin ganas.</p>
<sc-for list="{{{{ he }}}}" as="e" hint-placeholder-count="12">
<section style="{CARD}; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; align-items: center; gap: 12px">
<span style="width: 38px; height: 38px; border-radius: 12px; flex: none; background: {{{{ e.tint }}}}; display: flex; align-items: center; justify-content: center">{ico("{{ e.icon }}", 19, "{{ e.color }}", 1.8)}</span>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 500">{{{{ e.name }}}}</span><span style="font-size: 13px; line-height: 17px; color: {{{{ th.sub }}}}">{{{{ e.desc }}}}</span></div>
{switch("e.on", "e.track", "e.knob", "e.toggle", 'aria-label="{{ e.name }}"')}
</div>
<sc-if value="{{{{ e.hasGoal }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 0.5px solid {{{{ th.sep }}}}; padding-top: 12px">
<span style="font-size: 15px">Meta diaria</span>
{stepper("e.goalMinus", "e.goalPlus", "{{ e.goalLabel }}", "Bajar meta", "Subir meta")}
</div>
</sc-if>
<sc-if value="{{{{ e.showCue }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 6px; border-top: 0.5px solid {{{{ th.sep }}}}; padding-top: 12px">
<label for="{{{{ e.cueId }}}}" style="{EYE}">Señal</label>
<input id="{{{{ e.cueId }}}}" type="text" autocomplete="off" value="{{{{ e.cue }}}}" onChange="{{{{ e.setCue }}}}" style="appearance: none; border: 0; outline: none; border-radius: 12px; padding: 0 12px; height: 44px; background: {{{{ th.input }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; color: {{{{ th.text }}}}; font: inherit; font-size: 15px">
<label for="{{{{ e.miniId }}}}" style="{EYE}; margin-top: 4px">Versión mínima</label>
<input id="{{{{ e.miniId }}}}" type="text" autocomplete="off" value="{{{{ e.mini }}}}" onChange="{{{{ e.setMini }}}}" style="appearance: none; border: 0; outline: none; border-radius: 12px; padding: 0 12px; height: 44px; background: {{{{ th.input }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; color: {{{{ th.text }}}}; font: inherit; font-size: 15px">
</div>
</sc-if>
</section>
</sc-for>
</div>
</div>
</sc-if>'''
    return out


# ---------------------------------------------------------------- comida

def comida():
    no_ai = f'''<sc-if value="{{{{ fd.noAi }}}}" hint-placeholder-val="{{{{ false }}}}">
<section style="position: relative; overflow: hidden; {HALO_BG}; color: #FAFAFA; border-radius: 26px; padding: 20px; display: flex; flex-direction: column; gap: 12px">
{HALO}
<span style="position: relative">{eyebrow("Análisis con IA", "rgba(250, 250, 250, 0.62)")}</span>
<span style="position: relative; font-size: 24px; line-height: 28px; font-weight: 400; letter-spacing: -0.035em">Saca una foto y obtén calorías, proteína, fibra y más</span>
<span style="position: relative; font-size: 14px; line-height: 20px; color: rgba(250, 250, 250, 0.72)">Conecta una IA una sola vez. Gemini de Google tiene un plan gratis que alcanza de sobra.</span>
<span style="position: relative; align-self: flex-start">{pill("Conectar IA", "goAiSettings", "light", "", 46)}</span>
</section>
</sc-if>'''
    body = header('{{ fd.dateLabel }}', 'Comida') + f'''
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: {{{{ th.card }}}}; border-radius: 999px; padding: 4px">
{round_btn("fd.prev", BACK, "Día anterior", 40, "transparent").replace('style="', 'style="opacity: {{ fd.prevOp }}; ', 1)}
<span style="font-size: 15px; font-weight: 500">{{{{ fd.dayLabel }}}}</span>
{round_btn("fd.next", "M9 5l7 7-7 7", "Día siguiente", 40, "transparent").replace('style="', 'style="opacity: {{ fd.nextOp }}; ', 1)}
</div>
{no_ai}
<section aria-label="Energía del día" style="{CARD}; padding: 20px 18px; display: flex; flex-direction: column; gap: 20px">
<div style="display: flex; align-items: center; gap: 20px">
<div style="position: relative; width: 128px; height: 128px; flex: none">{ring(128, 56, 9, "{{ fd.ringOff }}", "{{ fd.ringColor }}", 351.9)}
<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px"><span style="font-size: 30px; line-height: 32px; font-weight: 400; letter-spacing: -0.05em; {NUM}">{{{{ fd.kcal }}}}</span><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">KCAL</span></div></div>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; flex-direction: column; gap: 4px">{eyebrow("{{ fd.leftLabel }}")}<span style="font-size: 30px; line-height: 32px; font-weight: 400; letter-spacing: -0.05em; {NUM}">{{{{ fd.left }}}}</span></div>
<div style="display: flex; flex-direction: column; gap: 4px">{eyebrow("Meta diaria")}<span style="{MONO} font-size: 15px; {NUM}">{{{{ fd.goal }}}} kcal</span></div>
</div>
</div>
<div style="display: flex; flex-direction: column; gap: 12px">
<sc-for list="{{{{ fd.macros }}}}" as="mc" hint-placeholder-count="4">
<div style="display: flex; flex-direction: column; gap: 7px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><span style="font-size: 14px">{{{{ mc.label }}}}</span><span style="{MONO} font-size: 13px; {NUM}">{{{{ mc.val }}}}<span style="color: {{{{ th.tertiary }}}}"> / {{{{ mc.goal }}}} {{{{ mc.unit }}}}</span></span></div>
<div style="height: 5px; border-radius: 3px; background: {{{{ th.fill }}}}; overflow: hidden"><div style="height: 100%; border-radius: 3px; width: {{{{ mc.pct }}}}%; background: {{{{ mc.color }}}}; transition: width 0.5s cubic-bezier(.32,.72,0,1)"></div></div>
</div>
</sc-for>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{ fd.micro }}}}" as="mi" hint-placeholder-count="2">
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">{{{{ mi.label }}}}</span><span style="{MONO} font-size: 14px; color: {{{{ mi.color }}}}; {NUM}">{{{{ mi.val }}}}</span><span style="font-size: 11px; color: {{{{ th.tertiary }}}}">{{{{ mi.goal }}}}</span></div>
</sc-for>
</div>
</section>
<sc-for list="{{{{ fd.meals }}}}" as="ml" hint-placeholder-count="5">
<section aria-label="{{{{ ml.name }}}}" style="{CARD}; padding: 14px 14px 14px 18px; display: flex; flex-direction: column; gap: 10px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
<span style="display: flex; align-items: baseline; gap: 10px"><span style="font-size: 16px; font-weight: 500; letter-spacing: -0.015em">{{{{ ml.name }}}}</span><span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}; {NUM}">{{{{ ml.kcal }}}}</span></span>
{round_btn("ml.add", PLUS, "Agregar a {{ ml.name }}", 34)}
</div>
<sc-for list="{{{{ ml.entries }}}}" as="en" hint-placeholder-count="1">
<button type="button" onClick="{{{{ en.open }}}}" style="{B} color: inherit; text-align: left; width: 100%; padding: 0; background: transparent; display: flex; align-items: center; gap: 12px">
<sc-if value="{{{{ en.hasPhoto }}}}" hint-placeholder-val="{{{{ false }}}}"><img src="{{{{ en.photo }}}}" alt="" style="width: 52px; height: 52px; border-radius: 14px; object-fit: cover; flex: none"></sc-if>
<sc-if value="{{{{ en.noPhoto }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="width: 52px; height: 52px; border-radius: 14px; flex: none; background: {{{{ th.fill }}}}; display: flex; align-items: center; justify-content: center; color: {{{{ th.tertiary }}}}">{ico("M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5M17 21V3c-2.2 0-3.5 2.5-3.5 6s1.3 4 3.5 4", 20)}</span></sc-if>
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px"><span style="font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ en.title }}}}</span><span style="{MONO} font-size: 12px; color: {{{{ th.sub }}}}; {NUM}">{{{{ en.sub }}}}</span></span>
<sc-if value="{{{{ en.hasQ }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="{MONO} font-size: 12px; padding: 4px 8px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px {{{{ en.qColor }}}}; color: {{{{ en.qColor }}}}; flex: none">{{{{ en.q }}}}/10</span></sc-if>
</button>
</sc-for>
</section>
</sc-for>
<section aria-labelledby="como" style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 4px">
<h2 id="como" style="margin: 0 0 6px; font-size: 17px; font-weight: 500; letter-spacing: -0.02em">Cómo vas</h2>
<sc-for list="{{{{ fd.insights }}}}" as="ins" hint-placeholder-count="2">
<div style="display: flex; gap: 12px; padding: 10px 0; box-shadow: {{{{ ins.line }}}}"><span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}; padding-top: 2px">{{{{ ins.n }}}}</span><span style="font-size: 14px; line-height: 20px">{{{{ ins.text }}}}</span></div>
</sc-for>
</section>
{sec_title("Últimos 7 días", "{{ fd.week.days }} de 7 días con registro")}
<section aria-label="Semana" style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 16px">
<div style="position: relative; height: 104px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; align-items: end">
<div style="position: absolute; left: 0; right: 0; bottom: {{{{ fd.week.targetPx }}}}px; border-top: 1px dashed {{{{ th.tertiary }}}}"></div>
<sc-for list="{{{{ fd.week.bars }}}}" as="wb" hint-placeholder-count="7"><div style="height: {{{{ wb.h }}}}px; min-height: 3px; border-radius: 6px; background: {{{{ wb.bg }}}}"></div></sc-for>
</div>
<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: -8px">
<sc-for list="{{{{ fd.week.bars }}}}" as="wb" hint-placeholder-count="7"><span style="{MONO} font-size: 10px; text-align: center; color: {{{{ wb.lc }}}}">{{{{ wb.label }}}}</span></sc-for>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">Energía promedio</span><span style="{MONO} font-size: 16px; {NUM}">{{{{ fd.week.avgK }}}} kcal</span></div>
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">Proteína promedio</span><span style="{MONO} font-size: 16px; {NUM}">{{{{ fd.week.avgP }}}} g</span></div>
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">Días con meta de proteína</span><span style="{MONO} font-size: 16px; {NUM}">{{{{ fd.week.protDays }}}} de {{{{ fd.week.days }}}}</span></div>
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">Calidad promedio</span><span style="{MONO} font-size: 16px; {NUM}">{{{{ fd.week.avgQ }}}} / 10</span></div>
</div>
<sc-if value="{{{{ fd.hasRev }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 10px; border-top: 0.5px solid {{{{ th.sep }}}}; padding-top: 14px">
<span style="display: flex; justify-content: space-between; gap: 8px">{eyebrow("Análisis de la semana")}<span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}">{{{{ fd.rev.ago }}}}</span></span>
<span style="font-size: 17px; line-height: 23px; letter-spacing: -0.02em">{{{{ fd.rev.resumen }}}}</span>
<sc-if value="{{{{ fd.rev.hasBien }}}}" hint-placeholder-val="{{{{ true }}}}">
<sc-for list="{{{{ fd.rev.bien }}}}" as="rb" hint-placeholder-count="2"><span style="display: flex; gap: 10px; font-size: 14px; line-height: 20px"><span style="color: {{{{ c.gA }}}}; flex: none">{ico(CHECK, 16, "currentColor", 2.4)}</span>{{{{ rb.text }}}}</span></sc-for>
</sc-if>
<sc-for list="{{{{ fd.rev.mejorar }}}}" as="rm2" hint-placeholder-count="3"><span style="display: flex; gap: 12px; font-size: 14px; line-height: 20px"><span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}; padding-top: 2px; flex: none">{{{{ rm2.n }}}}</span>{{{{ rm2.text }}}}</span></sc-for>
</div>
</sc-if>
<sc-if value="{{{{ fd.hasAi }}}}" hint-placeholder-val="{{{{ true }}}}">{pill("{{ fd.revLabel }}", "fd.askReview", "secondary", "", 46)}</sc-if>
<sc-if value="{{{{ fd.hasRevErr }}}}" hint-placeholder-val="{{{{ false }}}}"><p role="status" style="margin: 0; font-size: 13px; line-height: 18px; color: {{{{ c.heatText }}}}">{{{{ fd.revErr }}}}</p></sc-if>
</section>
<p style="margin: 0; padding: 0 4px; font-size: 12px; line-height: 17px; color: {{{{ th.sub }}}}">{{{{ fd.targetsNote }}}} Las estimaciones de la IA pueden variar un 15 a 25 %: úsalas como guía.</p>'''
    out = screen('showComida', body, 200)
    out += f'''
<sc-if value="{{{{ showComida }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; left: 0; right: 0; bottom: 83px; box-sizing: border-box; padding: 18px 16px 12px; background: linear-gradient(180deg, transparent, {{{{ th.bg }}}} 30%)">
{pill(ico(CAMERA, 18, "currentColor", 1.8) + "Registrar comida", "fh.add", "primary", "width: 100%")}
</div>
</sc-if>'''
    # hoja: agregar
    out += '\n' + sheet('fd.sheetOpen', f'''
<div style="display: flex; flex-direction: column; gap: 6px; padding: 0 4px">{eyebrow("Registrar")}<h2 style="margin: 0; font-size: 26px; line-height: 30px; font-weight: 500; letter-spacing: -0.04em">¿Qué comiste?</h2></div>
<div role="group" aria-label="Comida" style="display: flex; flex-wrap: wrap; gap: 6px">
<sc-for list="{{{{ fd.mealOpts }}}}" as="mo" hint-placeholder-count="5">
<button type="button" onClick="{{{{ mo.pick }}}}" aria-pressed="{{{{ mo.selected }}}}" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: {{{{ mo.bg }}}}; color: {{{{ mo.fg }}}}; font-size: 14px; font-weight: 500">{{{{ mo.label }}}}</button>
</sc-for>
</div>
<label style="position: relative; height: 56px; border-radius: 999px; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px; font-weight: 500; cursor: pointer">
{ico(CAMERA, 20, "currentColor", 1.8)}Tomar o elegir foto
<input type="file" accept="image/*" aria-label="Tomar o elegir foto" onChange="{{{{ fd.onPhoto }}}}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer">
</label>
<div style="display: flex; align-items: center; gap: 10px; color: {{{{ th.tertiary }}}}"><span style="flex: 1; height: 0.5px; background: {{{{ th.sep }}}}"></span><span style="{MONO} font-size: 11px; letter-spacing: 0.08em">O DESCRÍBELO</span><span style="flex: 1; height: 0.5px; background: {{{{ th.sep }}}}"></span></div>
<textarea aria-label="Describe lo que comiste" placeholder="Ej: dos huevos revueltos, una marraqueta con palta y un café con leche" onChange="{{{{ fd.onText }}}}" style="appearance: none; border: 0; outline: none; resize: none; height: 96px; border-radius: 18px; padding: 14px; background: {{{{ th.card }}}}; color: {{{{ th.text }}}}; font: inherit; font-size: 15px; line-height: 21px">{{{{ fd.ftext }}}}</textarea>
{pill("Analizar descripción", "fd.analyzeText", "secondary", "opacity: {{ fd.textOp }}")}
<sc-if value="{{{{ fd.noAi }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="margin: 0; text-align: center; font-size: 13px; color: {{{{ c.heatText }}}}">Primero conecta la IA en Ajustes.</p></sc-if>''', 'fd.closeSheet', 'Registrar comida')
    # hoja: borrador
    out += '\n' + sheet('fd.draftOpen', f'''
<sc-if value="{{{{ fd.dHasThumb }}}}" hint-placeholder-val="{{{{ false }}}}"><img src="{{{{ fd.dThumb }}}}" alt="Foto de tu comida" style="width: 100%; height: 210px; object-fit: cover; border-radius: 22px; flex: none"></sc-if>
<sc-if value="{{{{ fd.dLoading }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="position: relative; overflow: hidden; {HALO_BG}; color: #FAFAFA; border-radius: 22px; padding: 22px 20px; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px">
{HALO.replace('pointer-events: none;', 'pointer-events: none; animation: breathe 2.4s ease-in-out infinite;')}
<span style="position: relative">{eyebrow("Analizando", "rgba(250, 250, 250, 0.62)")}</span>
<span style="position: relative; font-size: 20px; line-height: 25px; letter-spacing: -0.03em">Identificando alimentos y porciones…</span>
</div>
</sc-if>
<sc-if value="{{{{ fd.dReady }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 0 4px">
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">{eyebrow("Resultado")}<h2 style="margin: 0; font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.035em">{{{{ fd.dTitle }}}}</h2></div>
<sc-if value="{{{{ fd.dHasQ }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="flex: none; {MONO} font-size: 12px; padding: 6px 10px; border-radius: 999px; background: {{{{ th.card }}}}">Calidad {{{{ fd.dQ }}}}/10</span></sc-if>
</div>
<div style="display: grid; grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr)); gap: 6px">
<div style="background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; opacity: 0.7">KCAL</span><span style="font-size: 20px; letter-spacing: -0.04em; {NUM}">{{{{ fd.dTot.kcal }}}}</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">PROT</span><span style="font-size: 16px; {NUM}">{{{{ fd.dTot.p }}}}</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">CARB</span><span style="font-size: 16px; {NUM}">{{{{ fd.dTot.c }}}}</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">GRASA</span><span style="font-size: 16px; {NUM}">{{{{ fd.dTot.f }}}}</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">FIBRA</span><span style="font-size: 16px; {NUM}">{{{{ fd.dTot.fib }}}}</span></div>
</div>
<section aria-label="Alimentos" style="{CARD}; padding: 0 0 0 16px">
<sc-for list="{{{{ fd.dItems }}}}" as="it" hint-placeholder-count="3">
<div style="display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 0; box-shadow: {{{{ it.line }}}}">
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
<span style="display: flex; justify-content: space-between; gap: 8px"><span style="font-size: 15px">{{{{ it.n }}}}</span><span style="{MONO} font-size: 13px; {NUM}">{{{{ it.kcal }}}}</span></span>
<span style="{MONO} font-size: 11px; color: {{{{ th.sub }}}}">{{{{ it.por }}}} · {{{{ it.macros }}}}</span>
</div>
{round_btn("it.minus", MINUS, "Menos cantidad", 30)}{round_btn("it.plus", PLUS, "Más cantidad", 30)}{round_btn("it.remove", CLOSE, "Quitar", 30, "transparent", "{{ th.sub }}")}
</div>
</sc-for>
</section>
<sc-if value="{{{{ fd.dHasNote }}}}" hint-placeholder-val="{{{{ true }}}}"><p style="margin: 0; padding: 0 4px; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">{{{{ fd.dNote }}}}</p></sc-if>
<sc-if value="{{{{ fd.dLow }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ c.heatText }}}}">La IA no está muy segura. Ajusta las cantidades con − y + si algo no calza.</p></sc-if>
{pill("Guardar", "fd.saveDraft")}
{pill("Descartar", "fd.discardDraft", "ghost", "color: {{ th.sub }}", 44)}
</sc-if>
<sc-if value="{{{{ fd.dError }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 6px; padding: 4px 4px 0">{eyebrow("No se pudo analizar")}<p style="margin: 0; font-size: 16px; line-height: 22px">{{{{ fd.dErr }}}}</p></div>
{pill("Intentar de nuevo", "fd.retryDraft")}
{pill("Cerrar", "fd.discardDraft", "ghost", "color: {{ th.sub }}", 44)}
</sc-if>''', 'fd.discardDraft', 'Análisis de comida', 54)
    # hoja: detalle
    out += '\n' + sheet('fd.entryOpen', f'''
<sc-if value="{{{{ fd.fe.hasPhoto }}}}" hint-placeholder-val="{{{{ false }}}}"><img src="{{{{ fd.fe.photo }}}}" alt="" style="width: 100%; height: 200px; object-fit: cover; border-radius: 22px; flex: none"></sc-if>
<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 0 4px">
<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">{eyebrow("{{ fd.fe.meal }} · {{ fd.fe.time }}")}<h2 style="margin: 0; font-size: 24px; line-height: 28px; font-weight: 500; letter-spacing: -0.035em">{{{{ fd.fe.title }}}}</h2></div>
<sc-if value="{{{{ fd.fe.hasQ }}}}" hint-placeholder-val="{{{{ false }}}}"><span style="flex: none; {MONO} font-size: 12px; padding: 6px 10px; border-radius: 999px; background: {{{{ th.card }}}}">Calidad {{{{ fd.fe.q }}}}/10</span></sc-if>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">
<div style="background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; opacity: 0.7">KCAL</span><span style="font-size: 20px; letter-spacing: -0.04em; {NUM}">{{{{ fd.fe.tot.kcal }}}}</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">PROTEÍNA</span><span style="font-size: 18px; {NUM}">{{{{ fd.fe.tot.p }}}} g</span></div>
<div style="background: {{{{ th.card }}}}; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; color: {{{{ th.sub }}}}">FIBRA</span><span style="font-size: 18px; {NUM}">{{{{ fd.fe.tot.fib }}}} g</span></div>
</div>
<p style="margin: 0; padding: 0 4px; {MONO} font-size: 12px; color: {{{{ th.sub }}}}">Carbohidratos {{{{ fd.fe.tot.c }}}} g · Grasa {{{{ fd.fe.tot.f }}}} g · Azúcar {{{{ fd.fe.tot.sug }}}} g · Sodio {{{{ fd.fe.tot.na }}}} mg</p>
<section aria-label="Alimentos" style="{CARD}; padding: 0 0 0 16px">
<sc-for list="{{{{ fd.fe.items }}}}" as="it" hint-placeholder-count="3">
<div style="display: flex; flex-direction: column; gap: 3px; padding: 12px 16px 12px 0; box-shadow: {{{{ it.line }}}}">
<span style="display: flex; justify-content: space-between; gap: 8px"><span style="font-size: 15px">{{{{ it.n }}}}</span><span style="{MONO} font-size: 13px; {NUM}">{{{{ it.kcal }}}} kcal</span></span>
<span style="{MONO} font-size: 11px; color: {{{{ th.sub }}}}">{{{{ it.por }}}} · {{{{ it.macros }}}}</span>
</div>
</sc-for>
</section>
<sc-if value="{{{{ fd.fe.hasNote }}}}" hint-placeholder-val="{{{{ true }}}}"><p style="margin: 0; padding: 0 4px; font-size: 14px; line-height: 20px; color: {{{{ th.sub }}}}">{{{{ fd.fe.note }}}}</p></sc-if>
{pill("{{ fd.fe.delLabel }}", "fd.fe.del", "ghost", "color: {{ th.danger }}", 44)}''', 'fd.closeEntry', 'Detalle de comida')
    return out


# ---------------------------------------------------------------- salud

def salud():
    body = header('Perfil de salud', 'Salud') + '\n' + health_hero('hv', 'noop', 'hv.startEval') + f'''
<sc-if value="{{{{ hv.has }}}}" hint-placeholder-val="{{{{ true }}}}">
{sec_title("Tus áreas", "A · B · C · D")}
<section aria-label="Áreas" style="{CARD}; padding: 0 0 0 16px">
<sc-for list="{{{{ hv.areas }}}}" as="ar" hint-placeholder-count="8">
<button type="button" onClick="{{{{ ar.open }}}}" style="{B} color: inherit; text-align: left; width: 100%; padding: 14px 16px 14px 0; background: transparent; display: flex; align-items: center; gap: 14px; box-shadow: {{{{ ar.line }}}}">
{grade_badge("{{ ar.grade }}", "{{ ar.gColor }}", 34, 14)}
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px"><span style="font-size: 16px; font-weight: 500; letter-spacing: -0.015em">{{{{ ar.name }}}}</span><span style="font-size: 13px; color: {{{{ th.sub }}}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ ar.status }}}}</span></span>
<span style="{MONO} font-size: 13px; color: {{{{ th.sub }}}}; {NUM}">{{{{ ar.score }}}}</span>
{CHEV}
</button>
</sc-for>
</section>
{sec_title("Mediciones", "Última: {{ hv.lastMeas }}")}
<section aria-label="Mediciones" style="{CARD}; padding: 16px; display: flex; flex-direction: column; gap: 14px">
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{ hv.kpis }}}}" as="kp" hint-placeholder-count="4">
<div style="background: {{{{ th.raised }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; color: {{{{ th.sub }}}}">{{{{ kp.label }}}}</span><span style="font-size: 22px; line-height: 26px; letter-spacing: -0.04em; {NUM}">{{{{ kp.value }}}}<span style="font-size: 13px; color: {{{{ th.sub }}}}; letter-spacing: 0"> {{{{ kp.unit }}}}</span></span></div>
</sc-for>
</div>
{pill("Registrar medición", "hv.openMeas", "secondary", "", 46)}
</section>
{sec_title("Evaluación")}
<section style="{CARD}; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px">
<span style="display: flex; flex-direction: column; gap: 3px"><span style="font-size: 16px; font-weight: 500">Evaluación inicial</span><span style="font-size: 13px; color: {{{{ th.sub }}}}">Hecha {{{{ hv.evalAgo }}}}. Repítela cada 1 o 2 meses.</span></span>
{pill("Repetir", "hv.startEval", "secondary", "flex: none", 40)}
</section>
</sc-if>
<p style="margin: 0; padding: 4px 4px 0; font-size: 12px; line-height: 17px; color: {{{{ th.sub }}}}">Las notas combinan tu evaluación con lo que registras en la app y siguen guías de la OMS, la AHA y NICE. Son una referencia para mejorar hábitos y no reemplazan una evaluación médica.</p>'''
    return screen('showSalud', body, 110)


def area():
    return f'''<sc-if value="{{{{ isArea }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; background: {{{{ th.bg }}}}; display: flex; flex-direction: column; animation: push 0.42s cubic-bezier(.32,.72,0,1) both; z-index: 20">
<div style="padding: 54px 12px 6px; display: flex; align-items: center">
<button type="button" onClick="{{{{ closeArea }}}}" style="{B} height: 40px; padding: 0 14px 0 8px; border-radius: 999px; background: {{{{ th.card }}}}; color: {{{{ th.text }}}}; font-size: 15px; display: flex; align-items: center; gap: 4px">{ico(BACK, 17, "currentColor", 2)}Salud</button>
</div>
<div class="scroll" style="flex: 1; overflow-y: auto; padding: 14px 16px 48px; display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; flex-direction: column; gap: 8px; padding: 0 4px">{eyebrow("Área")}<h1 style="margin: 0; font-size: 34px; line-height: 38px; font-weight: 500; letter-spacing: -0.04em">{{{{ hv.detail.name }}}}</h1></div>
<section style="position: relative; overflow: hidden; {HALO_BG}; color: #FAFAFA; border-radius: 26px; padding: 20px; display: flex; align-items: center; gap: 20px">
{HALO.replace('{{ halo }}', '{{ hv.detail.halo }}')}
<div style="position: relative; width: 104px; height: 104px; flex: none">{ring(104, 44, 6, "{{ hv.detail.ringOff }}", "{{ hv.detail.gColor }}", 276.5, "rgba(255, 255, 255, 0.12)")}
<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; {MONO} font-size: 30px; color: {{{{ hv.detail.gColor }}}}">{{{{ hv.detail.grade }}}}</div></div>
<div style="position: relative; display: flex; flex-direction: column; gap: 4px">
<span style="font-size: 44px; line-height: 44px; font-weight: 400; letter-spacing: -0.05em; {NUM}">{{{{ hv.detail.score }}}}<span style="font-size: 15px; color: rgba(250, 250, 250, 0.6); letter-spacing: 0"> / 100</span></span>
<span style="font-size: 15px; font-weight: 500">{{{{ hv.detail.gLabel }}}}</span>
<span style="{MONO} font-size: 11px; color: rgba(250, 250, 250, 0.6)">{{{{ hv.detail.source }}}}</span>
</div>
</section>
<p style="margin: 0; padding: 0 4px; font-size: 15px; line-height: 22px; color: {{{{ th.sub }}}}">{{{{ hv.detail.what }}}}</p>
<section aria-label="Tus datos" style="{CARD}; padding: 0 0 0 18px">
<sc-for list="{{{{ hv.detail.metrics }}}}" as="me" hint-placeholder-count="3">
<div style="display: flex; align-items: center; gap: 12px; padding: 14px 18px 14px 0; box-shadow: {{{{ me.line }}}}">
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px"><span style="font-size: 15px">{{{{ me.label }}}}</span><sc-if value="{{{{ me.hasIdeal }}}}" hint-placeholder-val="{{{{ true }}}}"><span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}">ÓPTIMO: {{{{ me.ideal }}}}</span></sc-if></span>
<span style="{MONO} font-size: 14px; text-align: right; {NUM}">{{{{ me.value }}}}</span>
<span style="width: 8px; height: 8px; border-radius: 50%; flex: none; background: {{{{ me.dot }}}}"></span>
</div>
</sc-for>
</section>
<sc-if value="{{{{ hv.detail.hasNote }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{{{{ hv.detail.note }}}}</p></sc-if>
<sc-if value="{{{{ hv.detail.isMood }}}}" hint-placeholder-val="{{{{ false }}}}">
{sec_title("Chequeo de hoy")}
<section style="{CARD}; padding: 16px 18px; display: flex; flex-direction: column; gap: 16px">
<sc-for list="{{{{ hv.detail.moods }}}}" as="mo" hint-placeholder-count="3">
<div style="display: flex; flex-direction: column; gap: 8px">
<span style="display: flex; justify-content: space-between; font-size: 14px"><span>{{{{ mo.label }}}}</span><span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}">{{{{ mo.lo }}}} → {{{{ mo.hi }}}}</span></span>
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px">
<sc-for list="{{{{ mo.opts }}}}" as="mv" hint-placeholder-count="5"><button type="button" onClick="{{{{ mv.pick }}}}" aria-pressed="{{{{ mv.sel }}}}" style="{B} height: 40px; border-radius: 12px; background: {{{{ mv.bg }}}}; color: {{{{ mv.fg }}}}; {MONO} font-size: 14px">{{{{ mv.v }}}}</button></sc-for>
</div>
</div>
</sc-for>
</section>
</sc-if>
<sc-if value="{{{{ hv.detail.hasSeries }}}}" hint-placeholder-val="{{{{ false }}}}">
{sec_title("{{ hv.detail.seriesLabel }}", "{{ hv.detail.targetLabel }}")}
<section style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 8px">
<div style="position: relative; height: 104px; display: grid; grid-template-columns: repeat({{{{ hv.detail.cols }}}}, minmax(0, 1fr)); gap: 8px; align-items: end">
<sc-if value="{{{{ hv.detail.hasTarget }}}}" hint-placeholder-val="{{{{ true }}}}"><div style="position: absolute; left: 0; right: 0; bottom: {{{{ hv.detail.targetPx }}}}px; border-top: 1px dashed {{{{ th.tertiary }}}}"></div></sc-if>
<sc-for list="{{{{ hv.detail.bars }}}}" as="bb" hint-placeholder-count="8"><div title="{{{{ bb.val }}}}" style="height: {{{{ bb.h }}}}px; border-radius: 6px; background: {{{{ bb.bg }}}}"></div></sc-for>
</div>
<div style="display: grid; grid-template-columns: repeat({{{{ hv.detail.cols }}}}, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{ hv.detail.bars }}}}" as="bb" hint-placeholder-count="8"><span style="{MONO} font-size: 9px; text-align: center; color: {{{{ th.sub }}}}; white-space: nowrap">{{{{ bb.label }}}}</span></sc-for>
</div>
</section>
</sc-if>
{sec_title("Qué hacer")}
<section style="{CARD}; padding: 4px 18px">
<sc-for list="{{{{ hv.detail.actions }}}}" as="ac" hint-placeholder-count="3">
<div style="display: flex; gap: 14px; padding: 14px 0; box-shadow: {{{{ ac.line }}}}"><span style="{MONO} font-size: 11px; color: {{{{ c.accentText }}}}; padding-top: 3px; flex: none">{{{{ ac.n }}}}</span><span style="font-size: 15px; line-height: 21px">{{{{ ac.text }}}}</span></div>
</sc-for>
</section>
<sc-if value="{{{{ hv.detail.hasLink }}}}" hint-placeholder-val="{{{{ true }}}}">{pill("{{ hv.detail.linkLabel }}", "hv.detail.link", "primary")}</sc-if>
</div>
</div>
</sc-if>'''


def evaluation():
    w = 'rgba(250, 250, 250, 0.62)'
    return f'''<sc-if value="{{{{ isEval }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; {HALO_BG}; color: #FAFAFA; display: flex; flex-direction: column; animation: present 0.5s cubic-bezier(.32,.72,0,1) both; z-index: 25; overflow: hidden">
{HALO.replace('{{ halo }}', '{{ haloEval }}')}
<div style="position: relative; padding: 54px 16px 0; display: flex; align-items: center; gap: 14px">
<button type="button" onClick="{{{{ ev.close }}}}" aria-label="Cerrar evaluación" style="{B} width: 40px; height: 40px; flex: none; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(CLOSE, 16, "currentColor", 2)}</button>
<div style="flex: 1; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.14); overflow: hidden"><div style="height: 100%; width: {{{{ ev.pct }}}}%; background: #FAFAFA; border-radius: 2px; transition: width 0.4s cubic-bezier(.32,.72,0,1)"></div></div>
<span style="{MONO} font-size: 11px; color: {w}; {NUM}">{{{{ ev.step }}}}/{{{{ ev.total }}}}</span>
</div>
<div class="push scroll" style="position: relative; flex: 1; overflow-y: auto; padding: 40px 20px 20px; display: flex; flex-direction: column; gap: 14px">
<span style="{MONO} font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: {w}">{{{{ ev.secNum }}}} / {{{{ ev.secTotal }}}} · {{{{ ev.sec }}}}</span>
<h1 style="margin: 0; font-size: 30px; line-height: 35px; font-weight: 400; letter-spacing: -0.04em">{{{{ ev.q }}}}</h1>
<sc-if value="{{{{ ev.hasHint }}}}" hint-placeholder-val="{{{{ true }}}}"><p style="margin: 0; font-size: 15px; line-height: 21px; color: rgba(250, 250, 250, 0.68)">{{{{ ev.hint }}}}</p></sc-if>
<div style="height: 10px"></div>
<sc-if value="{{{{ ev.isChoice }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: flex; flex-direction: column; gap: 8px">
<sc-for list="{{{{ ev.opts }}}}" as="o" hint-placeholder-count="4">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.sel }}}}" style="{B} min-height: 56px; padding: 0 20px; border-radius: 999px; background: {{{{ o.bg }}}}; color: {{{{ o.fg }}}}; font-size: 16px; text-align: left; display: flex; align-items: center; justify-content: space-between; transition: background 0.15s">{{{{ o.label }}}}<sc-if value="{{{{ o.sel }}}}" hint-placeholder-val="{{{{ false }}}}">{ico(CHECK, 16, "currentColor", 2.4)}</sc-if></button>
</sc-for>
</div>
</sc-if>
<sc-if value="{{{{ ev.isScale }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{ ev.opts }}}}" as="o" hint-placeholder-count="5">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.sel }}}}" style="{B} height: 64px; border-radius: 20px; background: {{{{ o.bg }}}}; color: {{{{ o.fg }}}}; {MONO} font-size: 20px">{{{{ o.label }}}}</button>
</sc-for>
</div>
<div style="display: flex; justify-content: space-between; {MONO} font-size: 11px; color: {w}"><span>{{{{ ev.lo }}}}</span><span>{{{{ ev.hi }}}}</span></div>
</sc-if>
<sc-if value="{{{{ ev.isNum }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0">
<button type="button" onClick="{{{{ ev.minus }}}}" aria-label="Menos" style="{B} width: 56px; height: 56px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(MINUS, 20, "currentColor", 2)}</button>
<span style="display: flex; align-items: baseline; gap: 8px"><span style="font-size: 72px; line-height: 72px; font-weight: 300; letter-spacing: -0.06em; {NUM}">{{{{ ev.num }}}}</span><span style="{MONO} font-size: 14px; color: {w}">{{{{ ev.unit }}}}</span></span>
<button type="button" onClick="{{{{ ev.plus }}}}" aria-label="Más" style="{B} width: 56px; height: 56px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(PLUS, 20, "currentColor", 2)}</button>
</div>
<div style="display: flex; justify-content: center; gap: 8px">
<button type="button" onClick="{{{{ ev.minus5 }}}}" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: #FAFAFA; {MONO} font-size: 12px">−5</button>
<button type="button" onClick="{{{{ ev.plus5 }}}}" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: #FAFAFA; {MONO} font-size: 12px">+5</button>
</div>
</sc-if>
</div>
<div style="position: relative; padding: 12px 20px 34px; display: flex; align-items: center; gap: 10px">
<button type="button" onClick="{{{{ ev.back }}}}" aria-label="Pregunta anterior" style="{B} width: 52px; height: 52px; flex: none; border-radius: 50%; background: rgba(255, 255, 255, 0.1); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(BACK, 18, "currentColor", 2)}</button>
<sc-if value="{{{{ ev.optional }}}}" hint-placeholder-val="{{{{ false }}}}"><button type="button" onClick="{{{{ ev.skip }}}}" style="{B} height: 52px; padding: 0 18px; border-radius: 999px; background: transparent; color: rgba(250, 250, 250, 0.72); font-size: 15px">No lo sé</button></sc-if>
<button type="button" onClick="{{{{ ev.next }}}}" style="{B} flex: 1; height: 52px; border-radius: 999px; background: #FAFAFA; color: #09090B; font-size: 16px; font-weight: 500; opacity: {{{{ ev.nextOp }}}}">Continuar</button>
</div>
</div>
</sc-if>'''


def meas_sheet():
    return sheet('hv.measOpen', f'''
<div style="display: flex; flex-direction: column; gap: 6px; padding: 0 4px">{eyebrow("Hoy")}<h2 style="margin: 0; font-size: 26px; line-height: 30px; font-weight: 500; letter-spacing: -0.04em">Registrar medición</h2></div>
<section style="{CARD}; padding: 0 0 0 16px">
<sc-for list="{{{{ hv.mrows }}}}" as="mr" hint-placeholder-count="5">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding-right: 12px; border-top: 0.5px solid {{{{ th.sep }}}}">
<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px">{{{{ mr.label }}}}</span><span style="{MONO} font-size: 11px; color: {{{{ th.tertiary }}}}">{{{{ mr.unit }}}}</span></span>
{stepper("mr.minus", "mr.plus", "{{ mr.val }}", "Bajar", "Subir")}
</div>
</sc-for>
</section>
<p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">Mide el pulso y la presión sentado, tranquilo, después de 5 minutos de reposo. Lo que dejes en «—» no se guarda.</p>
{pill("Guardar", "hv.saveMeas")}''', 'hv.closeMeas', 'Registrar medición')


# ---------------------------------------------------------------- ajustes

def row_btn(label, fn, right='', color='{{ th.text }}', line=True):
    ln = f'border-top: 0.5px solid {{{{ th.sep }}}};' if line else ''
    return (f'<button type="button" onClick="{{{{ {fn} }}}}" style="{B} color: {color}; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 0 16px 0 0; background: transparent; font-size: 16px; text-align: left; {ln}">'
            f'<span>{label}</span><span style="display: flex; align-items: center; gap: 6px; color: {{{{ th.sub }}}}; font-size: 15px">{right}{CHEV}</span></button>')


def group(title, inner, foot=''):
    f = f'<p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">{foot}</p>' if foot else ''
    return (f'<section style="display: flex; flex-direction: column; gap: 8px"><span style="{EYE}; padding: 0 4px">{title}</span>'
            f'<div style="{CARD}; padding: 0 0 0 16px; overflow: hidden">{inner}</div>{f}</section>')


def ajustes():
    perfil = f'''<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding-right: 16px">
<label for="nombre" style="font-size: 16px">Nombre</label>
<input id="nombre" type="text" autocomplete="off" value="{{{{ prefs.nombre }}}}" onChange="{{{{ setNombre }}}}" style="appearance: none; border: 0; outline: none; background: transparent; font: inherit; font-size: 16px; color: {{{{ th.sub }}}}; text-align: right; min-width: 0; flex: 1; height: 44px">
</div>
{row_btn("Evaluación de salud", "hs.startEval", "{{ evalLabel }}")}
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding-right: 16px; border-top: 0.5px solid {{{{ th.sep }}}}"><span style="font-size: 16px">Peso</span>{stepper("pesoMenos", "pesoMas", "{{ pesoActual }} kg", "Bajar peso", "Subir peso")}</div>'''
    entreno = f'''<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding-right: 16px"><span style="font-size: 16px">Sesiones por semana</span>{stepper("metaMenos", "metaMas", "{{ prefs.meta }}", "Bajar meta", "Subir meta")}</div>
<sc-for list="{{{{ planRows }}}}" as="pr" hint-placeholder-count="7">
<button type="button" onClick="{{{{ pr.pick }}}}" aria-label="{{{{ pr.aria }}}}" style="{B} color: inherit; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 0 16px 0 0; background: transparent; font-size: 16px; border-top: 0.5px solid {{{{ th.sep }}}}">
<span>{{{{ pr.day }}}}</span><span style="display: flex; align-items: center; gap: 6px; color: {{{{ pr.color }}}}; font-size: 15px">{{{{ pr.value }}}}{ico("M8 9l4-4 4 4M8 15l4 4 4-4", 13, "{{ th.tertiary }}", 2)}</span>
</button>
</sc-for>'''
    ia = f'''<div style="padding: 14px 16px 14px 0; display: flex; flex-direction: column; gap: 12px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 16px">Estado</span><span style="display: flex; align-items: center; gap: 6px; font-size: 15px; color: {{{{ ai.stColor }}}}"><span style="width: 7px; height: 7px; border-radius: 50%; background: {{{{ ai.stColor }}}}"></span>{{{{ ai.status }}}}</span></div>
<div role="group" aria-label="Proveedor" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 3px; border-radius: 999px; background: {{{{ th.segBg }}}}">
<sc-for list="{{{{ ai.provs }}}}" as="pv" hint-placeholder-count="2">
<button type="button" onClick="{{{{ pv.pick }}}}" aria-pressed="{{{{ pv.selected }}}}" style="{B} height: 34px; border-radius: 999px; background: {{{{ pv.bg }}}}; color: {{{{ th.text }}}}; box-shadow: {{{{ pv.shadow }}}}; font-size: 13px; font-weight: {{{{ pv.weight }}}}">{{{{ pv.label }}}}</button>
</sc-for>
</div>
<label for="aikey" style="{EYE}">Clave de API</label>
<input id="aikey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="{{{{ ai.ph }}}}" value="{{{{ ai.key }}}}" onChange="{{{{ ai.setKey }}}}" style="appearance: none; border: 0; outline: none; border-radius: 12px; padding: 0 12px; height: 44px; background: {{{{ th.input }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; color: {{{{ th.text }}}}; font: inherit; {MONO} font-size: 13px">
<label for="aimodel" style="{EYE}">Modelo (opcional)</label>
<input id="aimodel" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="{{{{ ai.modelPh }}}}" value="{{{{ ai.model }}}}" onChange="{{{{ ai.setModel }}}}" style="appearance: none; border: 0; outline: none; border-radius: 12px; padding: 0 12px; height: 44px; background: {{{{ th.input }}}}; box-shadow: inset 0 0 0 1px {{{{ th.line }}}}; color: {{{{ th.text }}}}; font: inherit; {MONO} font-size: 13px">
<div style="display: flex; gap: 8px">
<a href="{{{{ ai.url }}}}" target="_blank" rel="noopener" style="flex: 1; height: 44px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; font-size: 14px; font-weight: 500; text-decoration: none; display: flex; align-items: center; justify-content: center">Obtener clave</a>
<button type="button" onClick="{{{{ ai.test }}}}" style="{B} flex: 1; height: 44px; border-radius: 999px; background: {{{{ th.inv }}}}; color: {{{{ th.onInv }}}}; font-size: 14px; font-weight: 500">{{{{ ai.testLabel }}}}</button>
</div>
<sc-if value="{{{{ ai.hasMsg }}}}" hint-placeholder-val="{{{{ false }}}}"><p role="status" style="margin: 0; font-size: 13px; line-height: 18px; color: {{{{ ai.msgColor }}}}">{{{{ ai.msg }}}}</p></sc-if>
</div>'''
    rec = f'''<sc-if value="{{{{ rm.unsupported }}}}" hint-placeholder-val="{{{{ true }}}}"><p style="margin: 0; padding: 14px 16px 14px 0; font-size: 14px; line-height: 20px">Para recibir notificaciones, abre la app desde el ícono de tu pantalla de inicio.</p></sc-if>
<sc-for list="{{{{ rm.items }}}}" as="ri" hint-placeholder-count="5">
<div style="padding-right: 16px; box-shadow: {{{{ ri.line }}}}">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px">
<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px">{{{{ ri.label }}}}</span><span style="font-size: 13px; color: {{{{ th.sub }}}}">{{{{ ri.desc }}}}</span></span>
{switch("ri.on", "ri.track", "ri.knob", "ri.toggle", 'aria-label="{{ ri.label }}"')}
</div>
<sc-for list="{{{{ ri.times }}}}" as="tm" hint-placeholder-count="1">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; border-top: 0.5px solid {{{{ th.sep }}}}"><span style="font-size: 14px; color: {{{{ th.sub }}}}">{{{{ tm.label }}}}</span>{stepper("tm.minus", "tm.plus", "{{ tm.value }}", "Quince minutos antes", "Quince minutos después")}</div>
</sc-for>
<sc-if value="{{{{ ri.hasCycle }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; border-top: 0.5px solid {{{{ th.sep }}}}"><span style="font-size: 14px; color: {{{{ th.sub }}}}">Frecuencia</span><button type="button" onClick="{{{{ ri.cycle.pick }}}}" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; {MONO} font-size: 13px">{{{{ ri.cycle.label }}}}</button></div>
</sc-if>
</div>
</sc-for>'''
    rec_actions = f'''<sc-if value="{{{{ rm.supported }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 8px">
<sc-if value="{{{{ rm.inactive }}}}" hint-placeholder-val="{{{{ true }}}}">{pill("Activar notificaciones", "rm.enable")}</sc-if>
<sc-if value="{{{{ rm.active }}}}" hint-placeholder-val="{{{{ false }}}}">{pill("Copiar código para GitHub", "rm.copy")}
<a href="{{{{ rm.ghUrl }}}}" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; height: 52px; border-radius: 999px; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; font-size: 16px; font-weight: 500; text-decoration: none">Abrir GitHub para pegarlo</a></sc-if>
</div>
</sc-if>
<sc-if value="{{{{ rm.dirty }}}}" hint-placeholder-val="{{{{ false }}}}"><p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ c.heatText }}}}">Cambiaste los horarios: copia el código otra vez y actualiza el secreto RUTINA_PUSH en GitHub.</p></sc-if>
<sc-if value="{{{{ rm.hasMsg }}}}" hint-placeholder-val="{{{{ false }}}}"><p role="status" style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ c.constanciaText }}}}">{{{{ rm.msg }}}}</p></sc-if>
<sc-if value="{{{{ rm.showCode }}}}" hint-placeholder-val="{{{{ false }}}}"><textarea readonly aria-label="Código para GitHub" style="height: 96px; border: 0; border-radius: 14px; padding: 10px; background: {{{{ th.card }}}}; color: {{{{ th.text }}}}; font-size: 11px; {MONO} -webkit-user-select: text; user-select: text">{{{{ rm.code }}}}</textarea></sc-if>'''
    apar = f'''<div style="padding: 12px 16px 12px 0">
<div role="group" aria-label="Tema" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 3px; border-radius: 999px; background: {{{{ th.segBg }}}}">
<sc-for list="{{{{ temaOpts }}}}" as="o" hint-placeholder-count="3">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.selected }}}}" style="{B} height: 34px; border-radius: 999px; background: {{{{ o.bg }}}}; color: {{{{ th.text }}}}; box-shadow: {{{{ o.shadow }}}}; font-size: 13px; font-weight: {{{{ o.weight }}}}">{{{{ o.label }}}}</button>
</sc-for>
</div>
</div>
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding-right: 16px; border-top: 0.5px solid {{{{ th.sep }}}}"><span id="lbl-snd" style="font-size: 16px">Sonidos</span>{switch("prefs.sonido", "sndTrack", "sndKnob", "toggleSnd", 'aria-labelledby="lbl-snd"')}</div>
<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding-right: 16px; border-top: 0.5px solid {{{{ th.sep }}}}"><span id="lbl-fx" style="font-size: 16px">Animaciones</span>{switch("prefs.efectos", "fxTrack", "fxKnob", "toggleFx", 'aria-labelledby="lbl-fx"')}</div>
{row_btn("Ordenar inicio", "editFromSettings")}'''
    datos = f'''<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding-right: 16px"><span style="font-size: 16px">Guardado en este teléfono</span><span style="display: flex; align-items: center; gap: 6px; font-size: 15px; color: {{{{ c.constanciaText }}}}">{ico(CHECK, 15, "currentColor", 2.4)}{{{{ persistLabel }}}}</span></div>
<button type="button" onClick="{{{{ exportBackup }}}}" style="{B} color: inherit; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 0 16px 0 0; background: transparent; font-size: 16px; border-top: 0.5px solid {{{{ th.sep }}}}"><span>Exportar respaldo</span><span style="font-size: 14px; color: {{{{ th.sub }}}}">Último: {{{{ backupLabel }}}}</span></button>
<label style="position: relative; display: flex; align-items: center; min-height: 52px; font-size: 16px; cursor: pointer; border-top: 0.5px solid {{{{ th.sep }}}}">Restaurar respaldo
<input type="file" accept=".json,application/json" onChange="{{{{ importBackup }}}}" style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer"></label>
<button type="button" onClick="{{{{ resetAll }}}}" style="{B} width: 100%; min-height: 52px; padding: 0; background: transparent; color: {{{{ th.danger }}}}; font-size: 16px; text-align: left; font-weight: {{{{ resetWeight }}}}; border-top: 0.5px solid {{{{ th.sep }}}}">{{{{ resetLabel }}}}</button>'''
    body = header('Configuración', 'Ajustes') + '\n'
    body += group('Perfil', perfil) + '\n'
    body += group('Entrenamiento', entreno, 'Toca un día para cambiar su rutina.') + '\n'
    body += f'<div id="ia" style="display: contents">{group("IA para comidas", ia, "{{ ai.help }}")}</div>\n'
    body += group('Recordatorios', rec) + '\n' + rec_actions + '\n'
    body += f'<p style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 18px; color: {{{{ th.sub }}}}">Una sola vez: toca Activar, después Copiar código, y en GitHub crea un secreto llamado RUTINA_PUSH con ese código.</p>\n'
    body += group('Apariencia', apar) + '\n'
    body += group('Tus datos', datos, 'Todo se guarda solo en este teléfono, en dos copias. El respaldo no incluye las fotos ni tu clave de IA.') + '\n'
    body += '%%BRAND%%'
    return screen('showAjustes', body, 110, 24)


# ---------------------------------------------------------------- menú, sesión, confirmación, registro, resumen, pestañas

MENU = f'''<sc-if value="{{{{ menuOpen }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; z-index: 40">
<button type="button" aria-label="Cerrar menú" onClick="{{{{ closeMenu }}}}" style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0; margin: 0; padding: 0; background: {{{{ th.scrim }}}}; cursor: default; animation: fade 0.25s ease-out both"></button>
<div role="dialog" aria-modal="true" aria-label="Perfil y apariencia" style="position: absolute; top: 106px; right: 12px; width: 300px; box-sizing: border-box; background: {{{{ th.menu }}}}; border-radius: 24px; box-shadow: {{{{ th.shadow }}}}; padding: 16px; display: flex; flex-direction: column; gap: 16px; transform-origin: 270px -20px; animation: menu 0.32s cubic-bezier(.32,.72,0,1) both">
<div style="display: flex; align-items: center; gap: 12px">
<span style="width: 44px; height: 44px; border-radius: 50%; flex: none; background: {{{{ th.fill }}}}; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 500">{{{{ initial }}}}</span>
<span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 16px; font-weight: 500">{{{{ prefs.nombre }}}}</span><span style="font-size: 13px; color: {{{{ th.sub }}}}">{{{{ menuSub }}}}</span></span>
</div>
<div role="group" aria-label="Tema" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 3px; border-radius: 999px; background: {{{{ th.segBg }}}}">
<sc-for list="{{{{ temaOpts }}}}" as="o" hint-placeholder-count="3">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.selected }}}}" style="{B} height: 34px; border-radius: 999px; background: {{{{ o.bg }}}}; color: {{{{ th.text }}}}; box-shadow: {{{{ o.shadow }}}}; font-size: 13px; font-weight: {{{{ o.weight }}}}">{{{{ o.label }}}}</button>
</sc-for>
</div>
<div style="display: flex; flex-direction: column; margin: 0 -6px -6px; border-top: 0.5px solid {{{{ th.sep }}}}; padding-top: 6px">
<button type="button" onClick="{{{{ goSalud }}}}" style="{B} color: inherit; display: flex; align-items: center; justify-content: space-between; min-height: 46px; padding: 0 8px; border-radius: 12px; background: transparent; font-size: 16px; text-align: left">Perfil de salud{CHEV}</button>
<button type="button" onClick="{{{{ goAjustes }}}}" style="{B} color: inherit; display: flex; align-items: center; justify-content: space-between; min-height: 46px; padding: 0 8px; border-radius: 12px; background: transparent; font-size: 16px; text-align: left">Ajustes{CHEV}</button>
</div>
</div>
</div>
</sc-if>'''

SESION = f'''<sc-if value="{{{{ isSesion }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; background: {{{{ th.bg }}}}; display: flex; flex-direction: column; animation: present 0.5s cubic-bezier(.32,.72,0,1) both; z-index: 20">
<div style="padding: 54px 12px 0; display: grid; grid-template-columns: 96px minmax(0, 1fr) 96px; align-items: center">
<button type="button" onClick="{{{{ sesClose }}}}" style="{B} justify-self: start; height: 38px; padding: 0 14px 0 10px; border-radius: 999px; display: flex; align-items: center; gap: 4px; background: {{{{ th.card }}}}; color: {{{{ th.text }}}}; font-size: 14px">{ico("M5 9l7 7 7-7", 16, "currentColor", 2)}Salir</button>
<div style="display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; text-align: center">
<span style="max-width: 100%; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{{{ ss.title }}}}</span>
<span style="{MONO} font-size: 11px; color: {{{{ th.sub }}}}; {NUM}">PASO {{{{ ss.num }}}}/{{{{ ss.total }}}}</span>
</div>
<span aria-label="Tiempo de sesión" style="justify-self: end; padding-right: 6px; {MONO} font-size: 15px; {NUM}">{{{{ ss.elapsed }}}}</span>
</div>
<div aria-hidden="true" style="margin: 12px 16px 0; height: 3px; border-radius: 2px; background: {{{{ th.fill }}}}; overflow: hidden"><div style="height: 100%; border-radius: 2px; width: {{{{ ss.pct }}}}%; background: {{{{ c.accent }}}}; transition: width 0.4s cubic-bezier(.32,.72,0,1)"></div></div>
<div style="position: relative; flex: 1; min-height: 0">
%%SESSION_STEPS%%
</div>
<div style="padding: 12px 16px 34px; background: {{{{ th.bar }}}}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; gap: 10px">
<sc-if value="{{{{ ss.hasPrev }}}}" hint-placeholder-val="{{{{ true }}}}">
<button type="button" onClick="{{{{ sesPrev }}}}" aria-label="Paso anterior" style="{B} width: 52px; height: 52px; flex: none; border-radius: 50%; background: {{{{ th.fill }}}}; color: {{{{ th.text }}}}; display: flex; align-items: center; justify-content: center">{ico(BACK, 18, "currentColor", 2)}</button>
</sc-if>
{pill("{{ ss.nextLabel }}", "sesNext", "primary", "flex: 1")}
</div>
</div>
</sc-if>'''

CONFIRM = sheet('isConfirm', f'''
<div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 4px 4px; text-align: center; align-items: center">{eyebrow("{{ rc.name }}")}<h2 style="margin: 0; font-size: 26px; line-height: 30px; font-weight: 500; letter-spacing: -0.04em">¿Completaste la rutina?</h2><p style="margin: 0; font-size: 15px; line-height: 20px; color: {{{{ th.sub }}}}">{{{{ rcTitle }}}}</p></div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">{pill("No", "answerNo", "secondary")}{pill("Sí", "answerYes")}</div>''', 'closeConfirm', '¿Completaste la rutina?')


def quiz_block(cond):
    return f'''<sc-if value="{{{{ {cond} }}}}" hint-placeholder-val="{{{{ {'true' if cond == 'q.s0' else 'false'} }}}}">
<div class="push scroll" style="flex: 1; overflow-y: auto; padding: 32px 16px 24px; display: flex; flex-direction: column; gap: 22px">
<div style="display: flex; flex-direction: column; gap: 10px; padding: 0 4px">{eyebrow("Registro · {{ q.num }} de 3")}<h1 style="margin: 0; font-size: 30px; line-height: 35px; font-weight: 400; letter-spacing: -0.04em">{{{{ q.title }}}}</h1><p style="margin: 0; font-size: 15px; line-height: 21px; color: {{{{ th.sub }}}}">{{{{ q.hint }}}}</p></div>
<sc-if value="{{{{ q.isGrid }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">
<sc-for list="{{{{ q.opts }}}}" as="o" hint-placeholder-count="6">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.selected }}}}" style="{B} height: 80px; border-radius: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: {{{{ o.bg }}}}; color: {{{{ o.fg }}}}; transition: background 0.15s">
<span style="font-size: 28px; line-height: 30px; font-weight: 400; letter-spacing: -0.04em; {NUM}">{{{{ o.label }}}}</span><span style="{MONO} font-size: 10px; color: {{{{ o.subFg }}}}">MIN</span></button>
</sc-for>
</div>
</sc-if>
<sc-if value="{{{{ q.isList }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 8px">
<sc-for list="{{{{ q.opts }}}}" as="o" hint-placeholder-count="4">
<button type="button" onClick="{{{{ o.pick }}}}" aria-pressed="{{{{ o.selected }}}}" style="{B} color: {{{{ o.fg }}}}; width: 100%; min-height: 68px; padding: 10px 20px; border-radius: 24px; display: flex; flex-direction: column; justify-content: center; gap: 2px; text-align: left; background: {{{{ o.bg }}}}; transition: background 0.15s">
<span style="font-size: 16px; font-weight: 500">{{{{ o.label }}}}</span><span style="font-size: 14px; color: {{{{ o.subFg }}}}">{{{{ o.sub }}}}</span></button>
</sc-for>
</div>
</sc-if>
</div>
</sc-if>'''


TEST = f'''<sc-if value="{{{{ isTest }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; background: {{{{ th.bg }}}}; display: flex; flex-direction: column; animation: present 0.5s cubic-bezier(.32,.72,0,1) both; z-index: 20">
<div style="padding: 54px 12px 0; display: flex; justify-content: space-between; align-items: center">
<button type="button" onClick="{{{{ quizBack }}}}" aria-label="Atrás" style="{B} width: 40px; height: 40px; border-radius: 50%; background: {{{{ th.card }}}}; color: {{{{ th.text }}}}; display: flex; align-items: center; justify-content: center">{ico(BACK, 17, "currentColor", 2)}</button>
<div style="display: grid; grid-template-columns: repeat(3, 28px); gap: 6px" aria-hidden="true"><sc-for list="{{{{ q.bars }}}}" as="pb" hint-placeholder-count="3"><div style="height: 3px; border-radius: 2px; background: {{{{ pb.bg }}}}; transition: background 0.3s"></div></sc-for></div>
<button type="button" onClick="{{{{ quizSkip }}}}" style="{B} height: 40px; padding: 0 14px; border-radius: 999px; background: transparent; color: {{{{ th.sub }}}}; font-size: 15px">Omitir</button>
</div>
{quiz_block("q.s0")}
{quiz_block("q.s1")}
{quiz_block("q.s2")}
<div style="padding: 12px 20px 34px; border-top: 0.5px solid {{{{ th.sep }}}}; display: flex; align-items: center; justify-content: space-between; gap: 12px">
<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px">Peso corporal</span><span style="font-size: 13px; color: {{{{ th.sub }}}}">Se usa para estimar la energía</span></span>
{stepper("pesoMenos", "pesoMas", "{{ pesoActual }} kg", "Bajar peso", "Subir peso")}
</div>
</div>
</sc-if>'''

VICTORY = f'''<sc-if value="{{{{ isVictory }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="position: absolute; inset: 0; background: {{{{ th.bg }}}}; animation: present 0.55s cubic-bezier(.32,.72,0,1) both; z-index: 20">
<div class="scroll" style="position: absolute; inset: 0; overflow-y: auto; box-sizing: border-box; padding: 60px 16px 120px; display: flex; flex-direction: column; gap: 14px">
<section style="position: relative; overflow: hidden; {HALO_BG}; color: #FAFAFA; border-radius: 26px; padding: 22px 20px 20px; display: flex; flex-direction: column; gap: 18px; min-height: 250px">
{HALO}
<span style="position: relative">{eyebrow("Sesión completada · {{ v.dateLine }}", "rgba(250, 250, 250, 0.62)")}</span>
<span style="position: relative; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 34px; line-height: 38px; font-weight: 400; letter-spacing: -0.045em">{{{{ v.name }}}}</span><span style="font-size: 15px; color: rgba(250, 250, 250, 0.7)">{{{{ v.title }}}}</span></span>
<span style="position: relative; margin-top: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px">
<span style="display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; letter-spacing: 0.08em; color: rgba(250, 250, 250, 0.6)">DURACIÓN</span><span style="font-size: 30px; line-height: 32px; letter-spacing: -0.05em; {NUM}">{{{{ v.minutes }}}}<span style="font-size: 14px; color: rgba(250, 250, 250, 0.6); letter-spacing: 0"> min</span></span></span>
<span style="display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; letter-spacing: 0.08em; color: rgba(250, 250, 250, 0.6)">ENERGÍA</span><span style="font-size: 30px; line-height: 32px; letter-spacing: -0.05em; {NUM}">{{{{ v.kcalNow }}}}<span style="font-size: 14px; color: rgba(250, 250, 250, 0.6); letter-spacing: 0"> kcal</span></span></span>
<span style="display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; letter-spacing: 0.08em; color: rgba(250, 250, 250, 0.6)">INTENSIDAD</span><span style="font-size: 20px; line-height: 24px; letter-spacing: -0.03em">{{{{ v.intensity }}}}</span></span>
<span style="display: flex; flex-direction: column; gap: 2px"><span style="{MONO} font-size: 10px; letter-spacing: 0.08em; color: rgba(250, 250, 250, 0.6)">SERIES</span><span style="font-size: 20px; line-height: 24px; letter-spacing: -0.03em; {NUM}">{{{{ v.sets }}}}</span></span>
</span>
</section>
<section style="{CARD}; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px"><span style="font-size: 15px">Sesiones esta semana</span><span style="{MONO} font-size: 15px; {NUM}">{{{{ v.week }}}}</span></section>
{sec_title("Músculos trabajados")}
<section style="{CARD}; padding: 18px 18px 4px; display: flex; flex-direction: column; gap: 12px">
<div id="b3-sum" class="body3d" role="img" aria-label="Cuerpo con los músculos trabajados" data-loads="{{{{ b3.sum }}}}" data-dark="{{{{ b3.dark }}}}" data-key="sum" style="width: 100%; height: 320px; background: url({{{{ b3.fallback }}}}) center / contain no-repeat"></div>
<p style="margin: -4px 0 0; text-align: center; {MONO} font-size: 10px; letter-spacing: 0.08em; color: {{{{ th.tertiary }}}}">DESLIZA PARA GIRAR</p>
<ul style="list-style: none; margin: 0 -18px 0 0; padding: 0">
<sc-for list="{{{{ v.muscles }}}}" as="m" hint-placeholder-count="4">
<li style="display: flex; flex-direction: column; justify-content: center; gap: 8px; min-height: 64px; padding-right: 18px; border-top: 0.5px solid {{{{ th.sep }}}}">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px"><span style="font-size: 16px">{{{{ m.name }}}} <span style="font-size: 13px; color: {{{{ th.sub }}}}">{{{{ m.role }}}}</span></span><span style="{MONO} font-size: 13px; color: {{{{ c.heatText }}}}; {NUM}">{{{{ m.pct }}}}%</span></div>
<div style="height: 4px; background: {{{{ th.fill }}}}; border-radius: 2px; overflow: hidden"><div style="height: 100%; border-radius: 2px; background: {{{{ c.heat }}}}; width: {{{{ m.w }}}}%"></div></div>
<span style="font-size: 12px; color: {{{{ th.sub }}}}">{{{{ m.ready }}}}</span>
</li>
</sc-for>
</ul>
</section>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 12px 16px 34px; background: {{{{ th.bar }}}}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex">{pill("Listo", "goHome", "primary", "flex: 1")}</div>
</div>
</sc-if>'''

TAB_ICONS = {
    'inicio': ('Inicio', 'M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z'),
    'habitos': ('Hábitos', 'M4 12.5l3.5 3.5L14 9.5M4 5h16M15 12h5M4 19h16'),
    'comida': ('Comida', 'M7 3v8a2 2 0 0 0 2 2v8M7 3v5M11 3v5M17 21V3c-2.2 0-3.5 2.5-3.5 6s1.3 4 3.5 4'),
    'salud': ('Salud', 'M3 12h4l2.5-6 4 12 2.5-6H21'),
    'ajustes': ('Ajustes', 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'),
}


def tabbar():
    out = ['<nav aria-label="Secciones" style="position: absolute; left: 0; right: 0; bottom: 0; height: 83px; box-sizing: border-box; padding: 6px 8px 0; background: {{ th.bar }}; backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); box-shadow: inset 0 0.5px 0 {{ th.sep }}; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); z-index: 10">']
    for k, (label, d) in TAB_ICONS.items():
        out.append(f'<button type="button" onClick="{{{{ tabGo.{k} }}}}" aria-current="{{{{ tabCur.{k} }}}}" style="{B} padding: 0; height: 49px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: transparent; color: {{{{ tabC.{k} }}}}; font-size: 10px; font-weight: 500; letter-spacing: 0">'
                   f'<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{{{{ tabW.{k} }}}}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{d}"></path></svg><span>{label}</span></button>')
    out.append('</nav>')
    return '\n'.join(out)


def build():
    head = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>keystone</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&amp;family=Geist+Mono:wght@400..600&amp;display=swap">
<style>
body{margin:0}
button{-webkit-tap-highlight-color:transparent;transition:opacity .12s, transform .12s}
button:active{opacity:.7;transform:scale(.985)}
input::placeholder,textarea::placeholder{color:#A1A1AA}
input:focus-visible,button:focus-visible,textarea:focus-visible{outline:2px solid #71717A;outline-offset:2px}
@keyframes present{from{transform:translateY(100%)}to{transform:none}}
@keyframes sheet{from{transform:translateY(105%)}to{transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes menu{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
@keyframes push{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
@keyframes breathe{0%,100%{opacity:.75}50%{opacity:1}}
.scroll>*{flex-shrink:0}
.scroll{scrollbar-width:none}
.scroll::-webkit-scrollbar{display:none}
.push{animation:push .38s cubic-bezier(.32,.72,0,1) both}
@media (prefers-reduced-motion: reduce){.push{animation:none}}
</style>
</helmet>
<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: {{ th.bg }}; color: {{ th.text }}; font-family: {{ font }}; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em">
'''
    parts = [inicio(), habitos(), comida(), salud(), ajustes(),
             f'<sc-if value="{{{{ showTabs }}}}" hint-placeholder-val="{{{{ true }}}}">\n{tabbar()}\n</sc-if>',
             MENU, area(), meas_sheet(), evaluation(), SESION, CONFIRM, TEST, VICTORY]
    tail = '\n</div>\n</x-dc>\n%%SCRIPT%%\n</body>\n</html>\n'
    return head + '\n\n'.join(parts) + tail


if __name__ == '__main__':
    open(os.path.join(HERE, '..', 'Main3.tpl.html'), 'w').write(build())
    print('ok')
