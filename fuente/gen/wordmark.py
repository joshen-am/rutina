"""Wordmarks de sprout: glifos reales convertidos a trazos + modificaciones a medida."""
import math
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen

FD = '/tmp/claude-0/-home-claude/760aa4b4-fc1f-5e63-8773-c6c3c47b369b/scratchpad/fonts/'
_cache = {}

def font(fn, loc):
    k = (fn, tuple(sorted(loc.items())))
    if k not in _cache:
        tt = TTFont(FD + fn)
        blob = hb.Blob.from_file_path(FD + fn)
        f = hb.Font(hb.Face(blob))
        f.set_variations(loc)
        _cache[k] = (tt, tt.getGlyphSet(location=loc), f, tt['head'].unitsPerEm)
    return _cache[k]

def lens(p, q, bulge=0.42):
    """Hoja: lente simétrica entre p y q. bulge = ancho/largo."""
    d = math.dist(p, q)
    h = d * bulge / 2          # sagita
    r = (d * d / 4 + h * h) / (2 * h)
    return f'M{p[0]:.1f} {p[1]:.1f} A{r:.1f} {r:.1f} 0 0 1 {q[0]:.1f} {q[1]:.1f} A{r:.1f} {r:.1f} 0 0 1 {p[0]:.1f} {p[1]:.1f} Z'

def shape(text, fn, loc, track=0):
    tt, gs, f, upm = font(fn, loc)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {'kern': True, 'liga': False})
    out, x = [], 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = tt.getGlyphName(info.codepoint)
        out.append((name, x + pos.x_offset, pos.y_offset))
        x += pos.x_advance + track
    return out, x - track, gs, upm

def glyph_d(gs, name):
    p = SVGPathPen(gs); gs[name].draw(p); return p.getCommands()

def word(text, fn, loc, ink, track=0, custom=None):
    """Devuelve (svg_inner_en_unidades_y_arriba, ancho, upm). custom(ch, x, gs, name) -> (svg, dx_extra) o None."""
    glyphs, width, gs, upm = shape(text, fn, loc, track)
    parts, shift = [], 0
    for (name, x, y), ch in zip(glyphs, text):
        res = custom(ch, x + shift, gs, name) if custom else None
        if res:
            svg, extra, pre = res
            shift += pre
            parts.append(svg.replace('@X', f'{x + shift:.1f}'))
            shift += extra
        else:
            parts.append(f'<path transform="translate({x + shift:.1f} {y})" d="{glyph_d(gs, name)}" fill="{ink}"/>')
    return ''.join(parts), width + shift, upm

def to_svg(inner, width, upm, height_px, asc=0.78, desc=0.24, pad=0.06):
    """Envuelve en svg con baseline; height_px corresponde a 1 em."""
    W = width + upm * pad * 2
    top, bot = upm * asc, upm * desc
    vb = f'{-upm*pad:.0f} {-top:.0f} {W:.0f} {top+bot:.0f}'
    h = height_px * (asc + desc)
    w = h * W / (top + bot)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w:.1f}" height="{h:.1f}" style="display:block;overflow:visible"><g transform="scale(1 -1)">{inner}</g></svg>'
