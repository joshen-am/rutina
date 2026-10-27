// Funciona sin conexión: guarda la app en el teléfono y la actualiza cuando hay internet.
const CACHE = 'rutina-v12';
const FILES = ["./", "index.html", "manifest.webmanifest", "vendor/morphdom-umd.min.js", "fonts/Geist-Variable.woff2", "fonts/GeistMono-Variable.woff2", "body3d.js", "vendor/three/three.module.min.js", "vendor/three/GLTFLoader.js", "vendor/three/RoomEnvironment.js", "vendor/three/BufferGeometryUtils.js", "vendor/three/body.glb", "img/body-light.png", "img/body-dark.png", "img/angeles.svg", "img/balanceo_pierna.svg", "img/bird_dog.svg", "img/boxeo.svg", "img/chin_tuck.svg", "img/circulos_brazos.svg", "img/circulos_cadera.svg", "img/crunch_invertido.svg", "img/curl.svg", "img/curl_martillo.svg", "img/deadbug.svg", "img/elev_piernas.svg", "img/escalador.svg", "img/escapular_pared.svg", "img/esfinge.svg", "img/flex_pica.svg", "img/flex_rodillas.svg", "img/flex_suelo.svg", "img/flexor_cadera.svg", "img/fondo_suelo.svg", "img/gato_vaca.svg", "img/hollow.svg", "img/jalon_suelo.svg", "img/laterales.svg", "img/marcha.svg", "img/pecho_marco.svg", "img/plancha.svg", "img/plancha_lateral.svg", "img/pm_rumano.svg", "img/puente.svg", "img/puente_isquios.svg", "img/puente_una2.svg", "img/remo_marco.svg", "img/sentadilla.svg", "img/sentadilla_pared.svg", "img/sentadilla_talones.svg", "img/sumo.svg", "img/talones_suelo.svg", "img/triceps.svg", "img/ytw.svg", "img/zancada_atras.svg", "img/zancada_estatica.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/splash-1170x2532.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Notificaciones: cada aviso se personaliza con lo que guardó la app (IndexedDB)
function estado() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('rutina');
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        try {
          const r = req.result.transaction('kv', 'readonly').objectStore('kv').get('estado');
          r.onsuccess = () => resolve(r.result || null);
          r.onerror = () => resolve(null);
        } catch (err) { resolve(null); }
      };
      req.onerror = () => resolve(null);
    } catch (err) { resolve(null); }
  });
}
function hoyKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function personalizar(m) {
  const s = await estado();
  const d = s && s.derived;
  if (!d) return m;
  const hoy = d.day === hoyKey();
  const wd = ((new Date().getDay() + 6) % 7) + 1;
  if (m.type === 'agua') {
    const n = hoy ? d.agua : 0;
    const g = hoy ? d.aguaGoal : d.aguaBase;
    if (n >= g) return Object.assign({}, m, { title: 'Meta de agua cumplida', body: 'Llevas ' + n + ' vasos hoy. Así se hace.' });
    return Object.assign({}, m, { body: 'Llevas ' + n + ' de ' + g + ' vasos. Toma uno y súmalo.' });
  }
  if (m.type === 'entreno') {
    const name = (d.planNames || {})[wd];
    if (hoy && d.entrenoHecho) return Object.assign({}, m, { title: 'Entrenamiento listo', body: 'Ya completaste ' + (name || 'tu rutina') + ' hoy.' });
    if (name) return Object.assign({}, m, { title: 'Hoy toca ' + name, body: 'Unos 55 minutos. Abre la app y toca Iniciar sesión.' });
  }
  if (m.type === 'lectura' && hoy && d.lectura >= d.lecturaGoal) return Object.assign({}, m, { title: 'Lectura cumplida', body: 'Ya leíste ' + d.lectura + ' minutos hoy.' });
  return m;
}
self.addEventListener('push', (e) => {
  let m = { type: 'aviso', title: 'keystone', body: 'Tienes un recordatorio.' };
  try { if (e.data) m = Object.assign(m, e.data.json()); } catch (err) {}
  e.waitUntil(personalizar(m).catch(() => m).then((n) => self.registration.showNotification(n.title, {
    body: n.body, tag: n.tag || ('rutina-' + n.type), icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: './?aviso=' + n.type }
  })));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if ('focus' in w) return w.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
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
