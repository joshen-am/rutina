"""Turns the built Design artboard (Main.dc.html) into an installable, offline web app."""
import os, re, json, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'canvas', 'Main.dc.html')
OUT = os.path.join(HERE, '..', '..')   # la app publicada vive en la raíz del repo (GitHub Pages)
VEN = os.path.join(HERE, '..', 'vendor')
# lo que no es salida del build y nunca se borra al reconstruir
KEEP = {'.git', '.github', '.gitignore', 'fuente', 'CLAUDE.md', 'brand', 'nativo'}
VERSION = sys.argv[1] if len(sys.argv) > 1 else '1'

src = open(SRC).read()
xdc = re.search(r'<x-dc>([\s\S]*)</x-dc>', src).group(1)
css = re.search(r'<helmet>[\s\S]*?<style>([\s\S]*?)</style>[\s\S]*?</helmet>', xdc).group(1)
tpl = re.sub(r'<helmet>[\s\S]*?</helmet>', '', xdc).strip()
js = re.search(r"data-dc-script data-props='[^']*'>\n([\s\S]*?)</script>", src).group(1)


def rep(s, a, b, n):
    if n is None:
        assert s.count(a) >= 1, (a, 0)
    else:
        assert s.count(a) == n, (a, s.count(a), n)
    return s.replace(a, b)


# fluid, full-screen layout with the iPhone safe areas
tpl = rep(tpl, 'width: 390px; height: 844px;', 'width: 100%; max-width: 640px; margin: 0 auto; height: 100%;', 1)
tpl = rep(tpl, 'padding: 60px 16px', 'padding: calc(env(safe-area-inset-top) + 44px) 16px', None)
tpl = rep(tpl, 'padding: 54px', 'padding: calc(env(safe-area-inset-top) + 30px)', None)
tpl = rep(tpl, 'padding: 12px 16px 34px', 'padding: 12px 16px calc(env(safe-area-inset-bottom) + 12px)', None)
tpl = rep(tpl, 'padding: 10px 16px 34px', 'padding: 10px 16px calc(env(safe-area-inset-bottom) + 14px)', None)
tpl = rep(tpl, 'padding: 12px 20px 34px', 'padding: 12px 20px calc(env(safe-area-inset-bottom) + 12px)', None)
tpl = rep(tpl, 'height: 83px', 'height: calc(49px + env(safe-area-inset-bottom))', 1)
tpl = rep(tpl, 'bottom: 83px', 'bottom: calc(49px + env(safe-area-inset-bottom))', None)
tpl = rep(tpl, 'top: 106px', 'top: calc(env(safe-area-inset-top) + 90px)', 1)
# keep the two alternating step views distinct so their entrance replays
_m = '<div class="push scroll" style="position: absolute; inset: 0;'
assert tpl.count(_m) == 2, tpl.count(_m)
tpl = tpl.replace(_m, '<div id="step-a" class="push scroll" style="position: absolute; inset: 0;', 1)
tpl = tpl.replace(_m, '<div id="step-b" class="push scroll" style="position: absolute; inset: 0;', 1)

# illustrations ship with the app
blobmap = json.load(open(os.path.join(HERE, 'blobmap.json')))
for bid, key in blobmap.items():
    js = js.replace('/_blob/' + bid, 'img/' + key + '.svg')
assert '/_blob/' not in js and '/_blob/' not in tpl

RUNTIME = r'''
(function () {
  'use strict';
  var PROPS = { pantalla: 'inicio', datosEjemplo: false, peso: 70 };
  var appEl = document.getElementById('app');
  var tplRoot = document.getElementById('tpl').content;
  var handlers = [];
  var pending = false;
  var comp = null;
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };

  window.__dc.schedule = function () { schedule(); };

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(render);
  }

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escA(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function interp(str, scope) {
    return str.replace(HOLE, function (m, p) { var v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function hole(str) { var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str); return m ? m[1] : null; }

  function build(node, scope) {
    var out = '';
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var ch = kids[i];
      if (ch.nodeType === 3) { out += esc(interp(ch.textContent, scope)); continue; }
      if (ch.nodeType !== 1) continue;
      var tag = ch.localName;
      if (tag === 'sc-if') { if (lookup(scope, hole(ch.getAttribute('value')))) out += build(ch, scope); continue; }
      if (tag === 'sc-for') {
        var list = lookup(scope, hole(ch.getAttribute('list'))) || [];
        var as = ch.getAttribute('as');
        for (var j = 0; j < list.length; j++) { var s2 = Object.create(scope); s2[as] = list[j]; s2.$index = j; out += build(ch, s2); }
        continue;
      }
      var attrs = '';
      for (var a = 0; a < ch.attributes.length; a++) {
        var at = ch.attributes[a];
        var name = at.name;
        if (name.indexOf('hint-') === 0) continue;
        if (name === 'onclick' || name === 'onchange') {
          var fn = lookup(scope, hole(at.value));
          if (typeof fn === 'function') { handlers.push(fn); attrs += ' data-h' + (name === 'onclick' ? 'c' : 'i') + '="' + (handlers.length - 1) + '"'; }
          continue;
        }
        var raw = at.value;
        var val = interp(raw, scope);
        if (val === '' && raw !== '') continue;
        attrs += ' ' + name + '="' + escA(val) + '"';
      }
      out += '<' + tag + attrs + '>';
      if (!VOID[tag]) out += build(ch, scope) + '</' + tag + '>';
    }
    return out;
  }

  function render() {
    pending = false;
    handlers = [];
    var vals = comp.renderVals();
    var html = build(tplRoot, vals);
    morphdom(appEl, '<div id="app">' + html + '</div>', {
      onBeforeElUpdated: function (from, to) {
        if (from.isEqualNode(to)) return false;
        if (from.classList && from.classList.contains('body3d') && from.getAttribute('data-key') === to.getAttribute('data-key')) {
          for (var ai = 0; ai < to.attributes.length; ai++) { var at = to.attributes[ai]; if (at.name.indexOf('data-') === 0 && from.getAttribute(at.name) !== at.value) from.setAttribute(at.name, at.value); }
          return false;
        }
        if (from === document.activeElement && (from.tagName === 'INPUT' || from.tagName === 'TEXTAREA')) { to.value = from.value; if (from.tagName === 'TEXTAREA') to.textContent = from.value; }
        return true;
      }
    });
    if (vals.th) {
      document.documentElement.style.background = vals.th.bg;
      document.body.style.background = vals.th.bg;
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', vals.th.bg);
    }
    if (comp.componentDidUpdate) comp.componentDidUpdate();
    if (window.Body3D) { try { window.Body3D.sync(); } catch (e) { console.error(e); } }
    var run = window.__dc.cbs; window.__dc.cbs = [];
    run.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }

  appEl.addEventListener('click', function (e) {
    var el = e.target.closest('[data-hc]');
    if (!el || !appEl.contains(el)) return;
    var fn = handlers[+el.getAttribute('data-hc')];
    if (fn) fn(e);
  });
  appEl.addEventListener('change', function (e) {
    var el = e.target.closest('[data-hi]');
    if (!el || el.type !== 'file') return;
    var fn = handlers[+el.getAttribute('data-hi')];
    if (fn) fn(e);
  });
  appEl.addEventListener('input', function (e) {
    var el = e.target.closest('[data-hi]');
    if (el && el.type === 'file') return;
    if (!el) return;
    var fn = handlers[+el.getAttribute('data-hi')];
    if (fn) fn(e);
  });

  // iOS (web app instalada con barra de estado translúcida) resta la barra de estado a 100% y 100vh,
  // lo que deja una franja vacía abajo. Se usa la altura real de la pantalla.
  function fitHeight() {
    var h = window.innerHeight;
    if (window.navigator.standalone) {
      var portrait = window.matchMedia('(orientation: portrait)').matches;
      var sh = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      if (sh > h) h = sh;
    }
    document.documentElement.style.setProperty('--app-h', h + 'px');
  }
  fitHeight();
  window.addEventListener('resize', fitHeight);
  window.addEventListener('orientationchange', function () { setTimeout(fitHeight, 300); });

  comp = new Component();
  comp.props = PROPS;
  render();
  if (comp.componentDidMount) comp.componentDidMount();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule); } catch (e) {}
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
'''

PRELUDE = r'''
window.__dc = { cbs: [], schedule: function () {} };
window.DCLogic = class {
  constructor() { this.props = {}; this.state = {}; }
  setState(patch, cb) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, p);
    if (cb) window.__dc.cbs.push(cb);
    window.__dc.schedule();
  }
  forceUpdate(cb) { if (cb) window.__dc.cbs.push(cb); window.__dc.schedule(); }
};
'''

HTML = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>keystone</title>
<meta name="description" content="Entrenamiento, comida, hábitos y perfil de salud en un solo lugar.">
<meta name="theme-color" content="#FFFFFF">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="keystone">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192-plata.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-plata.png">
<link rel="preload" href="fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="icons/splash-1170x2532-plata.png">
<style>
@font-face{{font-family:'Geist';src:url('fonts/Geist-Variable.woff2') format('woff2');font-weight:100 900;font-display:swap}}
@font-face{{font-family:'Geist Mono';src:url('fonts/GeistMono-Variable.woff2') format('woff2');font-weight:100 900;font-display:swap}}
html,body{{margin:0;height:var(--app-h,100%);overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%;touch-action:manipulation;background:#FFFFFF}}
#app{{position:fixed;top:0;left:0;right:0;height:var(--app-h,100%)}}
input{{-webkit-user-select:text;user-select:text}}
body{{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}}
{css}
body.ex3d-on .ex3d-img{{visibility:hidden}}
</style>
</head>
<body>
<div id="app"></div>
<template id="tpl">
{tpl}
</template>
<script type="importmap">{{"imports":{{"three":"./vendor/three/three.module.min.js"}}}}</script>
<script src="vendor/morphdom-umd.min.js"></script>
<script src="exercises.js"></script>
<script src="exfit.js"></script>
<script src="body3d.js"></script>
<script>
{PRELUDE}
</script>
<script>
{js}
</script>
<script>
{RUNTIME}
</script>
</body>
</html>
'''

if os.path.exists(OUT):
    for name in os.listdir(OUT):
        if name in KEEP:
            continue
        p = os.path.join(OUT, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'vendor'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
shutil.copy(os.path.join(VEN, 'geist', 'Geist-Variable.woff2'), os.path.join(OUT, 'fonts'))
shutil.copy(os.path.join(VEN, 'geist', 'GeistMono-Variable.woff2'), os.path.join(OUT, 'fonts'))
shutil.copy(os.path.join(VEN, 'geist', 'LICENSE.TXT'), os.path.join(OUT, 'fonts', 'Geist-OFL.txt'))
open(os.path.join(OUT, 'index.html'), 'w').write(HTML)
for key in blobmap.values():
    shutil.copy(os.path.join(HERE, 'sprites', key + '.svg'), os.path.join(OUT, 'img', key + '.svg'))
shutil.copy(os.path.join(VEN, 'morphdom', 'morphdom-umd.min.js'), os.path.join(OUT, 'vendor'))
shutil.copy(os.path.join(VEN, 'morphdom', 'LICENSE'), os.path.join(OUT, 'vendor', 'morphdom-LICENSE'))
B3 = os.path.join(HERE, 'b3d')
os.makedirs(os.path.join(OUT, 'vendor', 'three'), exist_ok=True)
for f in ['three.module.min.js', 'body.glb']:
    shutil.copy(os.path.join(B3, f), os.path.join(OUT, 'vendor', 'three', f))
shutil.copy(os.path.join(B3, 'jsm', 'environments', 'RoomEnvironment.js'), os.path.join(OUT, 'vendor', 'three'))
shutil.copy(os.path.join(B3, 'jsm', 'utils', 'BufferGeometryUtils.js'), os.path.join(OUT, 'vendor', 'three'))
open(os.path.join(OUT, 'vendor', 'three', 'GLTFLoader.js'), 'w').write(
    open(os.path.join(B3, 'jsm', 'loaders', 'GLTFLoader.js')).read().replace("'../utils/BufferGeometryUtils.js'", "'./BufferGeometryUtils.js'"))
shutil.copy(os.path.join(VEN, 'three', 'LICENSE'), os.path.join(OUT, 'vendor', 'three', 'LICENSE'))
shutil.copy(os.path.join(B3, 'body3d.js'), os.path.join(OUT, 'body3d.js'))
shutil.copy(os.path.join(B3, 'exercises.js'), os.path.join(OUT, 'exercises.js'))
shutil.copy(os.path.join(B3, 'exfit.js'), os.path.join(OUT, 'exfit.js'))
for f in ['body-light.png', 'body-dark.png']:
    shutil.copy(os.path.join(B3, f), os.path.join(OUT, 'img', f))
ORBS = sorted(os.listdir(os.path.join(HERE, 'orbimg')))
for f in ORBS:
    shutil.copy(os.path.join(HERE, 'orbimg', f), os.path.join(OUT, 'img', f))
for f in os.listdir(os.path.join(HERE, 'icons')):
    shutil.copy(os.path.join(HERE, 'icons', f), os.path.join(OUT, 'icons', f.replace('.png', '-plata.png')))

manifest = {
    'name': 'keystone', 'short_name': 'keystone', 'lang': 'es',
    'description': 'Entrenamiento, comida, hábitos y perfil de salud en un solo lugar.',
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#FAFAFB', 'theme_color': '#FFFFFF',
    'icons': [
        {'src': 'icons/icon-192-plata.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512-plata.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/icon-maskable-512-plata.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
json.dump(manifest, open(os.path.join(OUT, 'manifest.webmanifest'), 'w'), ensure_ascii=False, indent=1)

files = ['./', 'index.html', 'manifest.webmanifest', 'vendor/morphdom-umd.min.js', 'fonts/Geist-Variable.woff2', 'fonts/GeistMono-Variable.woff2',
         'body3d.js', 'exercises.js', 'exfit.js', 'vendor/three/three.module.min.js', 'vendor/three/GLTFLoader.js', 'vendor/three/RoomEnvironment.js',
         'vendor/three/BufferGeometryUtils.js', 'vendor/three/body.glb', 'img/body-light.png', 'img/body-dark.png'] + ['img/' + f for f in ORBS] + \
        ['img/' + k + '.svg' for k in sorted(blobmap.values())] + ['icons/' + f.replace('.png', '-plata.png') for f in sorted(os.listdir(os.path.join(HERE, 'icons')))]
SW = f'''// Funciona sin conexión: guarda la app en el teléfono y la actualiza cuando hay internet.
const CACHE = 'rutina-v{VERSION}';
const FILES = {json.dumps(files)};
self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});
// Notificaciones: cada aviso se personaliza con lo que guardó la app (IndexedDB)
function estado() {{
  return new Promise((resolve) => {{
    try {{
      const req = indexedDB.open('rutina');
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {{
        try {{
          const r = req.result.transaction('kv', 'readonly').objectStore('kv').get('estado');
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = () => resolve(null);
        }} catch (err) {{ resolve(null); }}
      }};
      req.onerror = () => resolve(null);
    }} catch (err) {{ resolve(null); }}
  }});
}}
function hoyKey() {{
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}}
async function personalizar(m) {{
  const s = await estado();
  const d = s && s.derived;
  if (!d) return m;
  const hoy = d.day === hoyKey();
  const wd = ((new Date().getDay() + 6) % 7) + 1;
  if (m.type === 'agua') {{
    const n = hoy ? d.agua : 0;
    const g = hoy ? d.aguaGoal : d.aguaBase;
    if (n >= g) return Object.assign({{}}, m, {{ title: 'Meta de agua cumplida', body: 'Llevas ' + n + ' vasos hoy. Así se hace.' }});
    return Object.assign({{}}, m, {{ body: 'Llevas ' + n + ' de ' + g + ' vasos. Toma uno y súmalo.' }});
  }}
  if (m.type === 'entreno') {{
    const name = (d.planNames || {{}})[wd];
    if (hoy && d.entrenoHecho) return Object.assign({{}}, m, {{ title: 'Entrenamiento listo', body: 'Ya completaste ' + (name || 'tu rutina') + ' hoy.' }});
    if (name) return Object.assign({{}}, m, {{ title: 'Hoy toca ' + name, body: 'Unos 55 minutos. Abre la app y toca Iniciar sesión.' }});
  }}
  if (m.type === 'lectura' && hoy && d.lectura >= d.lecturaGoal) return Object.assign({{}}, m, {{ title: 'Lectura cumplida', body: 'Ya leíste ' + d.lectura + ' minutos hoy.' }});
  return m;
}}
self.addEventListener('push', (e) => {{
  let m = {{ type: 'aviso', title: 'keystone', body: 'Tienes un recordatorio.' }};
  try {{ if (e.data) m = Object.assign(m, e.data.json()); }} catch (err) {{}}
  e.waitUntil(personalizar(m).catch(() => m).then((n) => self.registration.showNotification(n.title, {{
    body: n.body, tag: n.tag || ('rutina-' + n.type), icon: 'icons/icon-192-plata.png', badge: 'icons/icon-192-plata.png',
    data: {{ url: './?aviso=' + n.type }}
  }})));
}});
self.addEventListener('notificationclick', (e) => {{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({{ type: 'window', includeUncontrolled: true }}).then((ws) => {{
    for (const w of ws) {{ if ('focus' in w) return w.focus(); }}
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }}));
}});
self.addEventListener('fetch', (e) => {{
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {{
    e.respondWith(fetch(req).then((r) => {{ const copy = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return r; }})
      .catch(() => caches.match('index.html')));
    return;
  }}
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {{
    if (r.ok && new URL(req.url).origin === location.origin) {{ const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }}
    return r;
  }})));
}});
'''
open(os.path.join(OUT, 'sw.js'), 'w').write(SW)
open(os.path.join(OUT, '.nojekyll'), 'w').write('')
os.makedirs(os.path.join(OUT, 'push'), exist_ok=True)
os.makedirs(os.path.join(OUT, '.github', 'workflows'), exist_ok=True)
shutil.copy(os.path.join(HERE, 'push_src', 'send.mjs'), os.path.join(OUT, 'push', 'send.mjs'))
shutil.copy(os.path.join(HERE, 'push_src', 'package.json'), os.path.join(OUT, 'push', 'package.json'))
shutil.copy(os.path.join(HERE, 'push_src', 'recordatorios.yml'), os.path.join(OUT, '.github', 'workflows', 'recordatorios.yml'))
open(os.path.join(OUT, 'README.md'), 'w').write(
    '# keystone\n\nApp web instalable para entrenamiento, comida, hábitos y salud: sesiones guiadas con ejercicios animados, '
    'registro de comidas con análisis de fotos por IA, hábitos diarios, agua, recordatorios y un perfil de salud con nota por área.\n\n'
    'Tus datos se guardan solo en tu teléfono (almacenamiento local del navegador).\n\n'
    '**Instalar en iPhone:** abre la página en Safari, toca Compartir y luego "Añadir a pantalla de inicio".\n\n'
    'Usa [morphdom](https://github.com/patrick-steele-idem/morphdom) (MIT), la tipografía [Geist](https://github.com/vercel/geist-font) (OFL) y [three.js](https://threejs.org) (MIT). '
    'El cuerpo 3D es el modelo Xbot de Mixamo incluido en los ejemplos de three.js.\n')
print('ok', os.path.getsize(os.path.join(OUT, 'index.html')), len(files), 'files cached')
