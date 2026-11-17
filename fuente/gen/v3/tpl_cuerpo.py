"""Plantillas de la versión 28: check-in diario, foto semanal, cámara con guía, fotos de progreso con análisis,
Aspecto, chat con el entrenador y la rutina adaptativa en Progreso.

Los enlaces a la plantilla se escriben [[ x ]] y al final se convierten a {{ x }}: así no hay que duplicar llaves.
Usa las piezas de tpl3.py (se las pasa make(globals())).
"""


def make(g):
    B, MONO, NUM, CARD = g['B'], g['MONO'], g['NUM'], g['CARD']
    HALO_BG, HALO = g['HALO_BG'], g['HALO']
    eyebrow, pill, ico, sec_title, switch = g['eyebrow'], g['pill'], g['ico'], g['sec_title'], g['switch']
    CHEV, BACK, CLOSE, CAMERA = g['CHEV'], g['BACK'], g['CLOSE'], g['CAMERA']
    ring = g['ring']
    T = lambda s: s.replace('[[', '{{').replace(']]', '}}')
    CHAT = 'M4 5h16v11H9l-5 4z'
    FLIP = 'M4 8h13l-3-3M20 16H7l3 3'
    SEND = 'M12 19V5M6 11l6-6 6 6'
    TRASH = 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'
    SPARK = 'M12 3v4M12 17v4M3 12h4M17 12h4'
    dot = lambda color: f'<span aria-hidden="true" style="flex: none; width: 6px; height: 6px; margin-top: 9px; border-radius: 50%; background: {color}"></span>'

    def back_bar(fn, right=''):
        return (f'<div style="padding: 56px 12px 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px">'
                f'<button type="button" class="hit" onClick="[[ {fn} ]]" style="{B} height: 40px; padding: 0 16px 0 8px; border-radius: 999px; background: [[ th.card ]]; box-shadow: [[ th.cardShadow ]]; color: [[ th.text ]]; font-size: 16px; display: flex; align-items: center; gap: 4px">{ico(BACK, 17, "currentColor", 2)}Volver</button>{right}</div>')

    def overlay(cond, label, fn, inner, right=''):
        return (f'<sc-if value="[[ {cond} ]]" hint-placeholder-val="[[ false ]]">\n'
                f'<div role="dialog" aria-modal="true" aria-label="{label}" style="position: absolute; inset: 0; background: [[ th.bg ]]; display: flex; flex-direction: column; animation: push 0.42s cubic-bezier(.32,.72,0,1) both; z-index: 20">\n'
                f'{back_bar(fn, right)}\n'
                f'<div class="scroll scr" style="flex: 1; overflow-y: auto; padding: 16px 16px 48px; display: flex; flex-direction: column; gap: 12px">\n{inner}\n</div>\n</div>\n</sc-if>')

    def title(eye, h):
        return f'<div style="display: flex; flex-direction: column; gap: 8px; padding: 0 4px">{eyebrow(eye)}<h1 style="margin: 0; font-size: 34px; line-height: 40px; font-weight: 400; letter-spacing: -0.045em">{h}</h1></div>'

    def chips(lst, var):
        return (f'<div style="display: flex; flex-wrap: wrap; gap: 8px"><sc-for list="[[ {lst} ]]" as="{var}" hint-placeholder-count="3">'
                f'<button type="button" class="hit" onClick="[[ {var}.pick ]]" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: [[ {var}.bg ]]; color: [[ {var}.fg ]]; font-size: 13px">[[ {var}.t ]]</button></sc-for></div>')

    def bullets(lst, var, color='[[ c.constancia ]]'):
        return (f'<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px"><sc-for list="[[ {lst} ]]" as="{var}" hint-placeholder-count="2">'
                f'<li style="display: flex; gap: 12px">{dot(color)}<span style="font-size: 16px; line-height: 24px">[[ {var}.text ]]</span></li></sc-for></ul>')

    def link_row(fn, label, sub, line=''):
        return (f'<button type="button" onClick="[[ {fn} ]]" style="{B} color: inherit; text-align: left; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 12px 16px 12px 0; background: transparent; {line}">'
                f'<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 500">{label}</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">{sub}</span></span>{CHEV}</button>')

    # ---------------------------------------------------------------- Inicio: check-in, informe y cierre del día
    DIARIO = T(f'''<section aria-label="Tu día" style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 16px">
<sc-if value="[[ sk.show ]]" hint-placeholder-val="[[ false ]]">
<button type="button" onClick="[[ sk.open ]]" style="{B} color: inherit; text-align: left; width: 100%; display: flex; align-items: center; gap: 16px; padding: 0 0 16px; background: transparent; border-bottom: 0.5px solid [[ th.sep ]]">
<span style="position: relative; width: 52px; height: 52px; flex: none">{ring(52, 22, 5, "[[ sk.off ]]", "[[ sk.ring ]]", 138.2)}<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 400; letter-spacing: -0.04em; {NUM}">[[ sk.s ]]</span></span>
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">{eyebrow("[[ sk.eyebrow ]]")}<span style="font-size: 16px; font-weight: 500">[[ sk.grade ]]</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ sk.parts ]]</span></span>
{CHEV}
</button>
</sc-if>
<sc-if value="[[ dy.showCheckin ]]" hint-placeholder-val="[[ true ]]">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><h2 style="margin: 0; font-size: 20px; font-weight: 500; letter-spacing: -0.02em">¿Cómo amaneciste?</h2><span style="{MONO} font-size: 13px; color: [[ th.sub ]]">20 segundos</span></div>
<sc-for list="[[ dy.rows ]]" as="row" hint-placeholder-count="4">
<div style="display: flex; flex-direction: column; gap: 8px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><span style="font-size: 16px">[[ row.label ]]</span><span style="{MONO} font-size: 12px; color: [[ th.tertiary ]]">[[ row.lo ]] → [[ row.hi ]]</span></div>
<div role="group" aria-label="[[ row.label ]]" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px">
<sc-for list="[[ row.opts ]]" as="o" hint-placeholder-count="5"><button type="button" class="hit" onClick="[[ o.pick ]]" aria-pressed="[[ o.on ]]" aria-label="[[ o.aria ]]" style="{B} height: 40px; border-radius: 12px; background: [[ o.bg ]]; color: [[ o.fg ]]; {MONO} font-size: 16px; {NUM} transition: background 0.2s var(--ease-out)">[[ o.n ]]</button></sc-for>
</div>
</div>
</sc-for>
<sc-if value="[[ dy.hasEditDone ]]" hint-placeholder-val="[[ false ]]">{pill("Listo", "dy.editDone", "primary", "", 44)}</sc-if>
</sc-if>
<sc-if value="[[ dy.showBrief ]]" hint-placeholder-val="[[ false ]]">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><h2 style="margin: 0; font-size: 20px; font-weight: 500; letter-spacing: -0.02em">Tu día</h2><button type="button" class="hit" onClick="[[ dy.edit ]]" style="{B} height: 32px; padding: 0 4px; background: transparent; color: [[ th.sub ]]; {MONO} font-size: 13px">Editar check-in</button></div>
{bullets("dy.brief", "b")}
<sc-if value="[[ dy.hasAi ]]" hint-placeholder-val="[[ false ]]"><div style="display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 16px; background: [[ th.well ]]">{eyebrow("Análisis con IA")}{bullets("dy.ai", "a", "[[ th.text ]]")}</div></sc-if>
<sc-if value="[[ dy.canAi ]]" hint-placeholder-val="[[ false ]]">
<sc-if value="[[ dy.aiBusy ]]" hint-placeholder-val="[[ false ]]"><span role="status" style="{MONO} font-size: 13px; color: [[ th.sub ]]">Analizando tu día…</span></sc-if>
<sc-if value="[[ dy.aiIdle ]]" hint-placeholder-val="[[ true ]]">{pill("Analizar mi día con IA", "dy.askAi", "secondary", "", 44)}</sc-if>
</sc-if>
<sc-if value="[[ dy.hasAiErr ]]" hint-placeholder-val="[[ false ]]"><p role="status" style="margin: 0; font-size: 13px; line-height: 20px; color: [[ c.heatText ]]">[[ dy.aiErr ]]</p></sc-if>
<sc-if value="[[ dy.showClose ]]" hint-placeholder-val="[[ false ]]">
<div style="display: flex; flex-direction: column; gap: 12px; border-top: 0.5px solid [[ th.sep ]]; padding-top: 16px">
<span style="font-size: 16px; font-weight: 500">Cierre del día</span>
<span style="font-size: 13px; color: [[ th.sub ]]">¿Qué salió bien hoy?</span>{chips("dy.good", "gd")}
<span style="font-size: 13px; color: [[ th.sub ]]">Una mejora para mañana</span>{chips("dy.better", "bt")}
</div>
</sc-if>
<sc-if value="[[ dy.closed ]]" hint-placeholder-val="[[ false ]]"><p style="margin: 0; {MONO} font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ dy.closedText ]]</p></sc-if>
</sc-if>
</section>''')

    # ---------------------------------------------------------------- Inicio: foto semanal (solo cuando toca)
    FOTOS_HOME = T(f'''<sc-if value="[[ ph.due ]]" hint-placeholder-val="[[ false ]]">
<section aria-label="Foto semanal" style="{CARD}; padding: 16px 16px 16px 20px; display: flex; align-items: center; gap: 16px">
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 16px; font-weight: 500">Foto semanal</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ ph.dueText ]]</span></span>
<button type="button" onClick="[[ ph.take ]]" style="{B} flex: none; height: 44px; padding: 0 18px; border-radius: 999px; background: [[ th.inv ]]; color: [[ th.onInv ]]; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px">{ico(CAMERA, 16, "currentColor", 1.8)}Tomar</button>
</section>
</sc-if>''')

    CHAT_BTN = T(f'<button type="button" onClick="[[ chat.open ]]" aria-label="Hablar con tu entrenador" style="{B} padding: 0; width: 44px; height: 44px; flex: none; border-radius: 50%; background: [[ th.fill ]]; color: [[ th.text ]]; display: flex; align-items: center; justify-content: center">{ico(CHAT, 18, "currentColor", 1.7)}</button>')

    # ---------------------------------------------------------------- cámara con guía (pantalla completa)
    GUIDE = ('<svg aria-hidden="true" viewBox="0 0 100 133" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none">'
             '<line x1="50" y1="2" x2="50" y2="131" stroke="rgba(250,250,250,0.35)" stroke-width="0.3" stroke-dasharray="1.5 1.5" vector-effect="non-scaling-stroke"></line>'
             + ''.join(f'<line x1="6" y1="{y}" x2="94" y2="{y}" stroke="rgba(250,250,250,0.3)" stroke-width="0.3" stroke-dasharray="1.5 1.5" vector-effect="non-scaling-stroke"></line>' for y in (13, 32, 66, 124))
             + '</svg>'
             + ''.join(f'<span aria-hidden="true" style="position: absolute; left: 12px; top: calc({y / 1.33:.1f}% - 18px); {MONO} font-size: 12px; color: rgba(250,250,250,0.6)">{t}</span>' for y, t in ((13, 'Cabeza'), (32, 'Hombros'), (66, 'Cadera'), (124, 'Pies'))))
    CAPTURA = T(f'''<sc-if value="[[ isCap ]]" hint-placeholder-val="[[ false ]]">
<div role="dialog" aria-modal="true" aria-label="Fotos de progreso" style="position: absolute; inset: 0; z-index: 40; background: #000000; color: #FAFAFA; display: flex; flex-direction: column; animation: fade 0.25s var(--ease-out) both">
<div style="padding: 56px 16px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px">
<button type="button" onClick="[[ cap.close ]]" aria-label="Cerrar" style="{B} width: 44px; height: 44px; flex: none; border-radius: 50%; background: rgba(255, 255, 255, 0.12); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(CLOSE, 16, "currentColor", 2)}</button>
<span style="display: flex; flex-direction: column; align-items: center; gap: 2px"><span style="font-size: 16px; font-weight: 500">[[ cap.label ]]</span><span style="{MONO} font-size: 12px; color: rgba(250, 250, 250, 0.6)">[[ cap.step ]]</span></span>
<sc-if value="[[ cap.camOn ]]" hint-placeholder-val="[[ true ]]"><button type="button" onClick="[[ cap.flip ]]" aria-label="Cambiar de cámara" style="{B} width: 44px; height: 44px; flex: none; border-radius: 50%; background: rgba(255, 255, 255, 0.12); color: #FAFAFA; display: flex; align-items: center; justify-content: center">{ico(FLIP, 16, "currentColor", 2)}</button></sc-if>
<sc-if value="[[ cap.noFlip ]]" hint-placeholder-val="[[ false ]]"><span style="width: 44px"></span></sc-if>
</div>
<div style="position: relative; flex: 1; margin: 0 16px; border-radius: 24px; overflow: hidden; background: #0B0B0C">
<sc-if value="[[ cap.camOn ]]" hint-placeholder-val="[[ true ]]"><video id="cam" autoplay playsinline webkit-playsinline muted style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: [[ cap.mirror ]]"></video>
<canvas id="camcv" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; transform: [[ cap.mirror ]]; pointer-events: none"></canvas>
<sc-if value="[[ cap.hasGhost ]]" hint-placeholder-val="[[ false ]]"><img alt="" src="[[ cap.ghost ]]" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3; pointer-events: none"></sc-if>
{GUIDE}</sc-if>
<sc-if value="[[ cap.tapPlay ]]" hint-placeholder-val="[[ false ]]"><button type="button" onClick="[[ cap.playCam ]]" style="{B} position: absolute; inset: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.55); color: #FAFAFA; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; font-size: 16px">{ico(CAMERA, 28, "currentColor", 1.6)}<span>Toca para ver la cámara</span></button></sc-if>
<sc-if value="[[ cap.count ]]" hint-placeholder-val="[[ false ]]"><div aria-live="assertive" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 120px; line-height: 1; font-weight: 300; letter-spacing: -0.06em; text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6); {NUM}">[[ cap.n ]]</div></sc-if>
<sc-if value="[[ cap.review ]]" hint-placeholder-val="[[ false ]]"><img alt="Tu foto" src="[[ cap.shot ]]" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"></sc-if>
<sc-if value="[[ cap.noCam ]]" hint-placeholder-val="[[ false ]]"><div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; text-align: center">
<span style="font-size: 16px; line-height: 24px; color: rgba(250, 250, 250, 0.8)">No se pudo abrir la cámara aquí. Toma la foto con la cámara del teléfono o elige una de tu galería.</span>
<label style="position: relative; height: 48px; padding: 0 22px; border-radius: 999px; background: #FAFAFA; color: #09090B; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px; cursor: pointer">{ico(CAMERA, 16, "currentColor", 1.8)}Tomar o elegir foto<input type="file" accept="image/*" capture="user" onChange="[[ cap.file ]]" style="position: absolute; inset: 0; opacity: 0; cursor: pointer"></label>
</div></sc-if>
<sc-if value="[[ cap.hasGhost ]]" hint-placeholder-val="[[ false ]]"><sc-if value="[[ cap.camOn ]]" hint-placeholder-val="[[ true ]]"><span style="position: absolute; right: 12px; top: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(0, 0, 0, 0.5); {MONO} font-size: 12px; color: rgba(250, 250, 250, 0.8)">[[ cap.ghostLabel ]]</span></sc-if></sc-if>
</div>
<p style="margin: 0; padding: 12px 24px 0; text-align: center; font-size: 13px; line-height: 20px; color: rgba(250, 250, 250, 0.72)">[[ cap.tip ]] Misma luz, misma hora y el teléfono a 2–3 m, a la altura de la cadera.</p>
<div style="padding: 16px 16px 34px; display: flex; align-items: center; justify-content: center; gap: 16px; min-height: 104px; box-sizing: border-box">
<sc-if value="[[ cap.live ]]" hint-placeholder-val="[[ true ]]">
<button type="button" onClick="[[ cap.skip ]]" style="{B} width: 88px; height: 44px; background: transparent; color: rgba(250, 250, 250, 0.72); font-size: 16px">Saltar</button>
<button type="button" onClick="[[ cap.start ]]" aria-label="Tomar la foto en 5 segundos" style="{B} width: 76px; height: 76px; border-radius: 50%; background: transparent; box-shadow: inset 0 0 0 4px #FAFAFA; display: flex; align-items: center; justify-content: center"><span style="width: 60px; height: 60px; border-radius: 50%; background: #FAFAFA"></span></button>
<span style="width: 88px; text-align: center; {MONO} font-size: 12px; color: rgba(250, 250, 250, 0.6)">5 s</span>
</sc-if>
<sc-if value="[[ cap.count ]]" hint-placeholder-val="[[ false ]]"><span style="font-size: 16px; color: rgba(250, 250, 250, 0.8)">Ponte en posición…</span></sc-if>
<sc-if value="[[ cap.review ]]" hint-placeholder-val="[[ false ]]">{pill("Repetir", "cap.retake", "glass", "flex: 1", 52)}{pill("{{ cap.nextLabel }}", "cap.next", "light", "flex: 1", 52)}</sc-if>
<sc-if value="[[ cap.noCam ]]" hint-placeholder-val="[[ false ]]"><button type="button" onClick="[[ cap.skip ]]" style="{B} height: 44px; padding: 0 16px; background: transparent; color: rgba(250, 250, 250, 0.72); font-size: 16px">Saltar esta pose</button></sc-if>
</div>
</div>
</sc-if>''')

    # ---------------------------------------------------------------- fotos de progreso
    face_row = (f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px">Incluir la cara</span><span style="font-size: 13px; color: [[ th.sub ]]">Para seguir la piel</span></span>'
                + switch("ph.face", "ph.faceTrack", "ph.faceKnob", "ph.toggleFace", 'aria-label="Incluir la cara"') + '</div>')
    an_block = f'''<sc-if value="[[ ph.hasAn ]]" hint-placeholder-val="[[ false ]]">
<section aria-label="Análisis" style="position: relative; overflow: hidden; {HALO_BG}; color: #FAFAFA; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 16px">
{HALO}
<span style="position: relative; display: flex; justify-content: space-between; align-items: baseline; gap: 8px">{eyebrow("Análisis · {{ ph.an.vs }}", "rgba(250, 250, 250, 0.62)")}<span style="{MONO} font-size: 12px; color: rgba(250, 250, 250, 0.6)">[[ ph.an.conf ]]</span></span>
<span style="position: relative; font-size: 20px; line-height: 28px; letter-spacing: -0.02em">[[ ph.an.resumen ]]</span>
<sc-if value="[[ ph.an.hasGrasa ]]" hint-placeholder-val="[[ true ]]"><span style="position: relative; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 44px; line-height: 44px; letter-spacing: -0.05em; {NUM}">[[ ph.an.grasa ]]</span><span style="font-size: 16px; color: rgba(250, 250, 250, 0.7)">grasa estimada</span></span></sc-if>
</section>
<sc-if value="[[ ph.an.hasCambios ]]" hint-placeholder-val="[[ true ]]">{sec_title("Cambios")}<section style="{CARD}; padding: 4px 20px"><sc-for list="[[ ph.an.cambios ]]" as="cb" hint-placeholder-count="3"><div style="display: flex; flex-direction: column; gap: 2px; padding: 14px 0; box-shadow: [[ cb.line ]]"><span style="font-size: 16px; font-weight: 500">[[ cb.zona ]]</span><span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">[[ cb.nota ]]</span></div></sc-for></section></sc-if>
<sc-if value="[[ ph.an.hasPostura ]]" hint-placeholder-val="[[ true ]]">{sec_title("Postura")}<section style="{CARD}; padding: 4px 20px"><sc-for list="[[ ph.an.postura ]]" as="po" hint-placeholder-count="3"><div style="display: flex; flex-direction: column; gap: 2px; padding: 14px 0; box-shadow: [[ po.line ]]"><span style="display: flex; justify-content: space-between; gap: 8px"><span style="font-size: 16px; font-weight: 500">[[ po.punto ]]</span><span style="{MONO} font-size: 13px; color: [[ po.color ]]">[[ po.estado ]]</span></span><span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">[[ po.consejo ]]</span></div></sc-for></section></sc-if>
<sc-if value="[[ ph.an.hasSimetria ]]" hint-placeholder-val="[[ false ]]"><section style="{CARD}; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px">{eyebrow("Simetría")}<span style="font-size: 16px; line-height: 24px">[[ ph.an.simetria ]]</span></section></sc-if>
<sc-if value="[[ ph.an.hasPiel ]]" hint-placeholder-val="[[ false ]]"><section style="{CARD}; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px">{eyebrow("Piel")}<span style="font-size: 16px; line-height: 24px">[[ ph.an.piel ]]</span></section></sc-if>
{sec_title("Qué hacer")}
<section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 16px">
<sc-if value="[[ ph.an.hasRutina ]]" hint-placeholder-val="[[ true ]]"><div style="display: flex; flex-direction: column; gap: 8px">{eyebrow("Rutina")}{bullets("ph.an.rutina", "r1", "[[ c.fuerza ]]")}</div></sc-if>
<sc-if value="[[ ph.an.hasComida ]]" hint-placeholder-val="[[ true ]]"><div style="display: flex; flex-direction: column; gap: 8px">{eyebrow("Comida")}{bullets("ph.an.comida", "r2", "[[ c.carb ]]")}</div></sc-if>
<sc-if value="[[ ph.an.hasHabitos ]]" hint-placeholder-val="[[ true ]]"><div style="display: flex; flex-direction: column; gap: 8px">{eyebrow("Hábitos")}{bullets("ph.an.habitos", "r3", "[[ c.constancia ]]")}</div></sc-if>
</section>
<button type="button" onClick="[[ ph.reAnalyze ]]" style="{B} align-self: center; height: 44px; padding: 0 16px; background: transparent; color: [[ th.sub ]]; font-size: 13px">Volver a analizar</button>
</sc-if>
<sc-if value="[[ ph.canAn ]]" hint-placeholder-val="[[ false ]]">
<section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 12px">
<span style="font-size: 16px; font-weight: 500">Análisis con IA</span>
<span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">Cambios por zona, grasa estimada (como rango), postura, simetría y qué ajustar en tu rutina y tu comida.</span>
<span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ ph.note ]]</span>
<sc-if value="[[ ph.busy ]]" hint-placeholder-val="[[ false ]]"><span role="status" style="{MONO} font-size: 13px; color: [[ th.sub ]]">Analizando tus fotos… puede tardar unos segundos.</span></sc-if>
<sc-if value="[[ ph.idle ]]" hint-placeholder-val="[[ true ]]">{pill("Analizar con {{ ph.provider }}", "ph.analyze", "primary", "", 52)}</sc-if>
</section>
</sc-if>
<sc-if value="[[ ph.needKey ]]" hint-placeholder-val="[[ false ]]"><section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 12px"><span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">Conecta la IA en Ajustes para analizar tus fotos. Usa tu propia clave: las fotos solo viajan cuando tú pides el análisis.</span>{pill("Conectar IA", "goAiSettings", "secondary", "", 44)}</section></sc-if>
<sc-if value="[[ ph.hasErr ]]" hint-placeholder-val="[[ false ]]"><p role="status" style="margin: 0; padding: 0 4px; font-size: 13px; line-height: 20px; color: [[ c.heatText ]]">[[ ph.err ]]</p></sc-if>'''
    FOTOS = T(overlay('isPhotos', 'Fotos de progreso', 'ph.close', f'''{title("Fotos de progreso", "Tu cuerpo")}
<sc-if value="[[ ph.none ]]" hint-placeholder-val="[[ false ]]">
<section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 16px">
<span style="font-size: 16px; line-height: 24px">Frente, perfil y espalda, una vez por semana. La primera sesión es tu línea base: con ella se comparan todas las demás.</span>
<ul style="margin: 0; padding: 0 0 0 18px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 20px; color: [[ th.sub ]]"><li>Misma luz y misma hora: idealmente en la mañana, antes de comer.</li><li>Ropa ajustada o traje de baño, siempre la misma.</li><li>El teléfono apoyado a 2–3 m, a la altura de la cadera. La app cuenta 5 segundos.</li><li>Las fotos quedan solo en tu teléfono.</li></ul>
{face_row}
{pill("Tomar mis primeras fotos", "ph.take", "primary", "", 52)}
</section>
</sc-if>
<sc-if value="[[ ph.has ]]" hint-placeholder-val="[[ true ]]">
<section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><span style="font-size: 16px; font-weight: 500">Foto semanal</span><span style="{MONO} font-size: 13px; color: [[ th.sub ]]">Última: [[ ph.last ]]</span></div>
{face_row}
{pill("Tomar fotos de hoy", "ph.take", "primary", "", 52)}
</section>
<div role="group" aria-label="Pose" style="display: flex; padding: 4px; border-radius: 999px; background: [[ th.segBg ]]"><sc-for list="[[ ph.poses ]]" as="pz" hint-placeholder-count="3"><button type="button" class="hit" onClick="[[ pz.pick ]]" style="{B} flex: 1; height: 36px; border-radius: 999px; background: [[ pz.bg ]]; color: [[ th.text ]]; font-size: 13px; font-weight: [[ pz.weight ]]">[[ pz.label ]]</button></sc-for></div>
<sc-if value="[[ ph.hasCompare ]]" hint-placeholder-val="[[ true ]]">
<div role="img" aria-label="Comparación entre el [[ ph.aLabel ]] y el [[ ph.bLabel ]]" style="position: relative; aspect-ratio: 3 / 4; border-radius: 24px; overflow: hidden; background: #0B0B0C">
<img alt="" src="[[ ph.aImg ]]" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover">
<img alt="" src="[[ ph.bImg ]]" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; clip-path: inset(0 0 0 [[ ph.x ]]%)">
<span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: [[ ph.x ]]%; width: 2px; margin-left: -1px; background: #FAFAFA; box-shadow: 0 0 12px rgba(0, 0, 0, 0.5)"></span>
<span style="position: absolute; left: 12px; top: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(0, 0, 0, 0.55); color: #FAFAFA; {MONO} font-size: 12px">[[ ph.aLabel ]]</span>
<span style="position: absolute; right: 12px; top: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(0, 0, 0, 0.55); color: #FAFAFA; {MONO} font-size: 12px">[[ ph.bLabel ]]</span>
</div>
<input type="range" min="0" max="100" value="[[ ph.x ]]" onChange="[[ ph.onX ]]" aria-label="Deslizar para comparar" style="width: 100%; accent-color: [[ th.text ]]">
<div role="group" aria-label="Comparar con" style="display: flex; padding: 4px; border-radius: 999px; background: [[ th.segBg ]]">
<button type="button" class="hit" onClick="[[ ph.aPrimera.pick ]]" style="{B} flex: 1; height: 36px; border-radius: 999px; background: [[ ph.aPrimera.bg ]]; color: [[ th.text ]]; font-size: 13px">Contra la primera</button>
<button type="button" class="hit" onClick="[[ ph.aAnterior.pick ]]" style="{B} flex: 1; height: 36px; border-radius: 999px; background: [[ ph.aAnterior.bg ]]; color: [[ th.text ]]; font-size: 13px">Contra la anterior</button>
</div>
</sc-if>
<sc-if value="[[ ph.single ]]" hint-placeholder-val="[[ false ]]"><div style="position: relative; aspect-ratio: 3 / 4; border-radius: 24px; overflow: hidden; background: #0B0B0C"><img alt="Tu foto del [[ ph.bLabel ]]" src="[[ ph.bImg ]]" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"><span style="position: absolute; left: 12px; top: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(0, 0, 0, 0.55); color: #FAFAFA; {MONO} font-size: 12px">[[ ph.bLabel ]]</span></div></sc-if>
{sec_title("Sesiones", "{{ ph.count }}")}
<div class="scroll" style="display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 4px">
<sc-for list="[[ ph.timeline ]]" as="tl" hint-placeholder-count="4"><button type="button" onClick="[[ tl.pick ]]" aria-label="Fotos del [[ tl.d ]]" style="{B} flex: none; width: 72px; display: flex; flex-direction: column; gap: 6px; background: transparent; color: inherit"><span style="position: relative; width: 72px; height: 96px; border-radius: 12px; overflow: hidden; background: [[ th.well ]]; box-shadow: [[ tl.ring ]]"><img alt="" src="[[ tl.thumb ]]" style="width: 100%; height: 100%; object-fit: cover; display: block"></span><span style="{MONO} font-size: 12px; color: [[ th.sub ]]; text-align: center">[[ tl.d ]]</span></button></sc-for>
</div>
{an_block}
<button type="button" onClick="[[ ph.del ]]" style="{B} align-self: center; height: 44px; padding: 0 16px; background: transparent; color: [[ th.danger ]]; font-size: 13px">[[ ph.delLabel ]]</button>
</sc-if>'''))

    # ---------------------------------------------------------------- Aspecto
    ASPECTO = T(overlay('isAspecto', 'Aspecto', 'asp.close', f'''{title("Cuerpo y aspecto", "Aspecto")}
<section aria-label="Composición" style="{CARD}; padding: 4px 20px">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 0"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 500">Grasa corporal</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ asp.fatTrend ]]</span></span><span style="font-size: 28px; line-height: 32px; letter-spacing: -0.04em; {NUM}">[[ asp.fat ]]</span></div>
<div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 0; box-shadow: inset 0 0.5px 0 [[ th.sep ]]"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 16px; font-weight: 500">Hombros / cintura</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ asp.ratioNote ]]</span></span><span style="flex: none; font-size: 28px; line-height: 32px; letter-spacing: -0.04em; {NUM}">[[ asp.ratio ]]</span></div>
<sc-if value="[[ asp.hasWh ]]" hint-placeholder-val="[[ true ]]"><div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 0; box-shadow: inset 0 0.5px 0 [[ th.sep ]]"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 500">Cintura / altura</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ asp.whNote ]]</span></span><span style="font-size: 28px; line-height: 32px; letter-spacing: -0.04em; {NUM}">[[ asp.wh ]]</span></div></sc-if>
</section>
{sec_title("Postura")}
<section aria-label="Postura" style="{CARD}; padding: 4px 20px 16px; display: flex; flex-direction: column">
<sc-if value="[[ asp.hasPost ]]" hint-placeholder-val="[[ true ]]"><sc-for list="[[ asp.post ]]" as="po" hint-placeholder-count="3"><div style="display: flex; flex-direction: column; gap: 2px; padding: 14px 0; box-shadow: [[ po.line ]]"><span style="display: flex; justify-content: space-between; gap: 8px"><span style="font-size: 16px; font-weight: 500">[[ po.punto ]]</span><span style="{MONO} font-size: 13px; color: [[ po.color ]]">[[ po.estado ]]</span></span><span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">[[ po.consejo ]]</span></div></sc-for></sc-if>
<sc-if value="[[ asp.noPost ]]" hint-placeholder-val="[[ false ]]"><p style="margin: 0; padding: 16px 0 12px; font-size: 16px; line-height: 24px; color: [[ th.sub ]]">El análisis de tus fotos de perfil y espalda revisa la cabeza, los hombros y la pelvis.</p>{pill("Tomar fotos", "ph.take", "secondary", "", 44)}</sc-if>
<sc-if value="[[ asp.canYtw ]]" hint-placeholder-val="[[ false ]]"><div style="display: flex; flex-direction: column; gap: 12px; padding-top: 12px; border-top: 0.5px solid [[ th.sep ]]; margin-top: 4px"><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">El chin tuck y los ángeles ya están en tu cierre. Para la espalda alta, suma Y-T-W a tus días de tren superior.</span>{pill("Sumar Y-T-W a mis rutinas", "asp.addYtw", "secondary", "", 44)}</div></sc-if>
</section>
{sec_title("Piel y aseo")}
<section aria-label="Piel y aseo" style="{CARD}; padding: 4px 16px 4px 20px">
<sc-for list="[[ asp.skin ]]" as="sk" hint-placeholder-count="2"><div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 72px; box-shadow: inset 0 -0.5px 0 [[ th.sep ]]"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 16px">[[ sk.label ]]</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ sk.desc ]]</span></span>{switch("sk.on", "sk.track", "sk.knob", "sk.toggle", 'aria-label="{{ sk.label }}"')}</div></sc-for>
<sc-if value="[[ asp.hasPiel ]]" hint-placeholder-val="[[ false ]]"><p style="margin: 0; padding: 16px 0; font-size: 16px; line-height: 24px">[[ asp.piel ]]</p></sc-if>
<p style="margin: 0; padding: 16px 0; font-size: 13px; line-height: 20px; color: [[ th.sub ]]">Simple y todos los días le gana a lo complicado: limpiador suave, hidratante y protector solar. Si quieres seguir la piel, activa «Incluir la cara» en tus fotos.</p>
</section>
{sec_title("La cara")}
<section aria-label="La cara" style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 16px">
<span style="font-size: 16px; line-height: 24px">Lo que más cambia la cara es bajar la grasa corporal, dormir bien y la hidratación. Esto es lo tuyo:</span>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
<span style="display: flex; flex-direction: column; gap: 4px"><span style="{MONO} font-size: 12px; color: [[ th.sub ]]">Grasa</span><span style="font-size: 20px; letter-spacing: -0.02em; {NUM}">[[ asp.fat ]]</span></span>
<span style="display: flex; flex-direction: column; gap: 4px"><span style="{MONO} font-size: 12px; color: [[ th.sub ]]">Sueño</span><span style="font-size: 20px; letter-spacing: -0.02em; {NUM}">[[ asp.sleep ]]</span></span>
<span style="display: flex; flex-direction: column; gap: 4px"><span style="{MONO} font-size: 12px; color: [[ th.sub ]]">Agua</span><span style="font-size: 20px; letter-spacing: -0.02em; {NUM}">[[ asp.water ]]</span></span>
</div>
</section>'''))

    # ---------------------------------------------------------------- chat con el entrenador
    CHATO = T(f'''<sc-if value="[[ isChat ]]" hint-placeholder-val="[[ false ]]">
<div role="dialog" aria-modal="true" aria-label="Tu entrenador" style="position: absolute; inset: 0; background: [[ th.bg ]]; display: flex; flex-direction: column; animation: push 0.42s cubic-bezier(.32,.72,0,1) both; z-index: 20">
{back_bar("chat.close", f'<button type="button" class="hit" onClick="[[ chat.clear ]]" aria-label="Borrar la conversación" style="{B} width: 40px; height: 40px; border-radius: 50%; background: transparent; color: [[ th.sub ]]; display: flex; align-items: center; justify-content: center">{ico(TRASH, 16, "currentColor", 1.7)}</button>')}
<div id="chat-scroll" class="scroll" style="flex: 1; overflow-y: auto; padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 10px">
{title("Con tus datos", "Tu entrenador")}
<sc-if value="[[ chat.empty ]]" hint-placeholder-val="[[ true ]]"><p style="margin: 0; padding: 4px; font-size: 16px; line-height: 24px; color: [[ th.sub ]]">Pregúntame por tu rutina, tu comida, tu recuperación o tus fotos. Respondo con lo que la app sabe de ti.</p></sc-if>
<sc-for list="[[ chat.msgs ]]" as="m" hint-placeholder-count="3"><div style="align-self: [[ m.align ]]; max-width: 86%; padding: 12px 16px; border-radius: 18px; background: [[ m.bg ]]; color: [[ m.fg ]]; box-shadow: [[ m.shadow ]]; font-size: 16px; line-height: 24px; white-space: pre-wrap">[[ m.t ]]</div></sc-for>
<sc-if value="[[ chat.busy ]]" hint-placeholder-val="[[ false ]]"><div role="status" style="align-self: flex-start; padding: 12px 16px; border-radius: 18px; background: [[ th.card ]]; box-shadow: [[ th.cardShadow ]]; {MONO} font-size: 13px; color: [[ th.sub ]]">Pensando…</div></sc-if>
<sc-if value="[[ chat.hasKey ]]" hint-placeholder-val="[[ true ]]"><sc-if value="[[ chat.empty ]]" hint-placeholder-val="[[ true ]]"><div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 4px"><sc-for list="[[ chat.chips ]]" as="cq" hint-placeholder-count="3"><button type="button" class="hit" onClick="[[ cq.pick ]]" style="{B} height: 36px; padding: 0 14px; border-radius: 999px; background: [[ th.fill ]]; color: [[ th.text ]]; font-size: 13px">[[ cq.t ]]</button></sc-for></div></sc-if></sc-if>
<sc-if value="[[ chat.noKey ]]" hint-placeholder-val="[[ false ]]"><section style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 12px"><span style="font-size: 16px; line-height: 24px; color: [[ th.sub ]]">Conecta la IA en Ajustes para conversar con tu entrenador.</span>{pill("Conectar IA", "goAiSettings", "secondary", "", 44)}</section></sc-if>
</div>
<div style="padding: 12px 16px 34px; display: flex; align-items: flex-end; gap: 8px; background: [[ th.bar ]]; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid [[ th.sep ]]">
<textarea id="chat-in" rows="1" aria-label="Tu mensaje" placeholder="Escribe tu pregunta" onChange="[[ chat.onDraft ]]" style="appearance: none; border: 0; outline: none; resize: none; flex: 1; min-height: 44px; max-height: 120px; box-sizing: border-box; border-radius: 22px; padding: 11px 16px; background: [[ th.input ]]; box-shadow: inset 0 0 0 1px [[ th.line ]]; color: [[ th.text ]]; font: inherit; font-size: 16px; line-height: 22px">[[ chat.draft ]]</textarea>
<button type="button" onClick="[[ chat.send ]]" aria-label="Enviar" style="{B} width: 44px; height: 44px; flex: none; border-radius: 50%; background: [[ th.inv ]]; color: [[ th.onInv ]]; display: flex; align-items: center; justify-content: center">{ico(SEND, 18, "currentColor", 2)}</button>
</div>
</div>
</sc-if>''')

    # ---------------------------------------------------------------- Progreso: tu rutina (adaptativa) y accesos
    ADAPT = T(f'''{sec_title("Tu rutina", "Semana {{ pg.week }}")}
<section aria-label="Tu rutina" style="{CARD}; padding: 4px 20px 16px; display: flex; flex-direction: column">
<button type="button" onClick="[[ ad.cycleGoal ]]" style="{B} color: inherit; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; background: transparent; font-size: 16px"><span style="display: flex; flex-direction: column; gap: 2px; text-align: left"><span>Objetivo</span><span style="font-size: 13px; color: [[ th.sub ]]">Toca para cambiarlo</span></span><span style="display: flex; align-items: center; gap: 8px; font-weight: 500">[[ ad.goal ]]{ico("M8 9l4-4 4 4M8 15l4 4 4-4", 13, "{{ th.tertiary }}", 2)}</span></button>
<sc-if value="[[ ad.deload ]]" hint-placeholder-val="[[ false ]]"><div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 0; box-shadow: inset 0 0.5px 0 [[ th.sep ]]"><span style="font-size: 16px; line-height: 24px">[[ ad.deloadText ]]</span><button type="button" onClick="[[ ad.skipDeload ]]" style="{B} align-self: flex-start; height: 36px; padding: 0; background: transparent; color: [[ th.sub ]]; font-size: 13px">Saltar la descarga esta semana</button></div></sc-if>
<sc-if value="[[ ad.noDeload ]]" hint-placeholder-val="[[ true ]]"><p style="margin: 0; padding: 12px 0; {MONO} font-size: 13px; color: [[ th.sub ]]; box-shadow: inset 0 0.5px 0 [[ th.sep ]]">[[ ad.nextDeload ]]</p></sc-if>
<sc-if value="[[ ad.hasProps ]]" hint-placeholder-val="[[ true ]]"><sc-for list="[[ ad.props ]]" as="pp" hint-placeholder-count="2">
<div style="display: flex; flex-direction: column; gap: 8px; padding: 16px 0; box-shadow: inset 0 0.5px 0 [[ th.sep ]]">
<span style="{MONO} font-size: 12px; color: [[ th.sub ]]">[[ pp.title ]]</span>
<span style="font-size: 16px; font-weight: 500; line-height: 24px">[[ pp.text ]]</span>
<span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">[[ pp.why ]]</span>
<div style="display: flex; gap: 8px; padding-top: 4px">{pill("Aplicar", "pp.apply", "primary", "flex: 1", 44)}{pill("Ahora no", "pp.dismiss", "secondary", "flex: 1", 44)}</div>
</div>
</sc-for></sc-if>
<sc-if value="[[ ad.noProps ]]" hint-placeholder-val="[[ false ]]"><p style="margin: 0; padding: 14px 0; font-size: 16px; line-height: 24px; color: [[ th.sub ]]; box-shadow: inset 0 0.5px 0 [[ th.sep ]]">Sin cambios por ahora. Cuando llegues al tope de un ejercicio dos veces seguidas, o te estanques, te propongo el ajuste aquí.</p></sc-if>
<sc-if value="[[ ad.hasAiRes ]]" hint-placeholder-val="[[ false ]]"><div style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; margin-top: 4px; border-radius: 16px; background: [[ th.well ]]">{eyebrow("Revisión de la IA")}<span style="font-size: 16px; line-height: 24px">[[ ad.aiRes ]]</span></div></sc-if>
<sc-if value="[[ ad.canAi ]]" hint-placeholder-val="[[ true ]]"><div style="padding-top: 12px">
<sc-if value="[[ ad.aiBusy ]]" hint-placeholder-val="[[ false ]]"><span role="status" style="{MONO} font-size: 13px; color: [[ th.sub ]]">Revisando tu rutina…</span></sc-if>
<sc-if value="[[ ad.aiIdle ]]" hint-placeholder-val="[[ true ]]">{pill("Pedir una revisión a la IA", "ad.ask", "secondary", "", 44)}</sc-if>
</div></sc-if>
<sc-if value="[[ ad.hasAiErr ]]" hint-placeholder-val="[[ false ]]"><p role="status" style="margin: 0; padding-top: 8px; font-size: 13px; line-height: 20px; color: [[ c.heatText ]]">[[ ad.aiErr ]]</p></sc-if>
<sc-if value="[[ ad.hasLog ]]" hint-placeholder-val="[[ false ]]"><div style="display: flex; flex-direction: column; padding-top: 12px">{eyebrow("Cambios aplicados")}<sc-for list="[[ ad.log ]]" as="lg" hint-placeholder-count="2"><div style="display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; box-shadow: [[ lg.line ]]"><span style="font-size: 13px; line-height: 20px">[[ lg.text ]]</span><span style="flex: none; {MONO} font-size: 12px; color: [[ th.tertiary ]]">[[ lg.when ]]</span></div></sc-for></div></sc-if>
<sc-if value="[[ ad.changed ]]" hint-placeholder-val="[[ false ]]"><button type="button" onClick="[[ ad.reset ]]" style="{B} align-self: flex-start; height: 40px; padding: 0; margin-top: 4px; background: transparent; color: [[ th.sub ]]; font-size: 13px">Volver a la rutina original</button></sc-if>
</section>''')

    LINKS = T(f'''<section aria-label="Cuerpo" style="{CARD}; padding: 0 0 0 20px">
{link_row("ph.open", "Fotos de progreso", "Última: {{ ph.last }}. Compara y analiza con IA.")}
{link_row("asp.open", "Aspecto", "Composición, postura, piel y cara.", "box-shadow: inset 0 0.5px 0 {{ th.sep }};")}
</section>''')

    REPORT = T(f'''<section aria-label="Informe del mes" style="{CARD}; padding: 20px; display: flex; flex-direction: column; gap: 12px"><span style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: 16px; font-weight: 500">Informe del mes</span><span style="font-size: 13px; line-height: 20px; color: [[ th.sub ]]">Sesiones, récords, medidas, fotos y el último análisis de los últimos 30 días. En la ventana de imprimir, elige «Guardar como PDF».</span></span>{pill("Crear informe en PDF", "ad.report", "secondary", "", 44)}</section>''')

    GOAL_ROW = T(f'''<button type="button" onClick="[[ ad.cycleGoal ]]" style="{B} color: inherit; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 0 16px 0 0; background: transparent; font-size: 16px; border-top: 0.5px solid [[ th.sep ]]"><span>Objetivo</span><span style="display: flex; align-items: center; gap: 8px; color: [[ th.sub ]]">[[ ad.goal ]]{ico("M8 9l4-4 4 4M8 15l4 4 4-4", 13, "{{ th.tertiary }}", 2)}</span></button>''')

    return {'DIARIO': DIARIO, 'FOTOS_HOME': FOTOS_HOME, 'CHAT_BTN': CHAT_BTN, 'CAPTURA': CAPTURA, 'FOTOS': FOTOS, 'ASPECTO': ASPECTO,
            'CHATO': CHATO, 'ADAPT': ADAPT, 'LINKS': LINKS, 'REPORT': REPORT, 'GOAL_ROW': GOAL_ROW}
