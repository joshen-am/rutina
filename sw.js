// Funciona sin conexión: guarda la app en el teléfono y la actualiza cuando hay internet.
const CACHE = 'rutina-v4';
const FILES = ["./", "index.html", "manifest.webmanifest", "vendor/morphdom-umd.min.js", "img/angeles.svg", "img/balanceo_pierna.svg", "img/bird_dog.svg", "img/boxeo.svg", "img/chin_tuck.svg", "img/circulos_brazos.svg", "img/circulos_cadera.svg", "img/crunch_invertido.svg", "img/curl.svg", "img/curl_martillo.svg", "img/deadbug.svg", "img/elev_piernas.svg", "img/escalador.svg", "img/escapular_pared.svg", "img/esfinge.svg", "img/flex_pica.svg", "img/flex_rodillas.svg", "img/flex_suelo.svg", "img/flexor_cadera.svg", "img/fondo_suelo.svg", "img/gato_vaca.svg", "img/hollow.svg", "img/jalon_suelo.svg", "img/laterales.svg", "img/marcha.svg", "img/pecho_marco.svg", "img/plancha.svg", "img/plancha_lateral.svg", "img/pm_rumano.svg", "img/puente.svg", "img/puente_isquios.svg", "img/puente_una2.svg", "img/remo_marco.svg", "img/sentadilla.svg", "img/sentadilla_pared.svg", "img/sentadilla_talones.svg", "img/sumo.svg", "img/talones_suelo.svg", "img/triceps.svg", "img/ytw.svg", "img/zancada_atras.svg", "img/zancada_estatica.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && new URL(req.url).origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
