// Funciona sin conexión: guarda la app en el teléfono y la actualiza cuando hay internet.
const CACHE = 'rutina-v30';
const FILES = ["./", "index.html", "manifest.webmanifest", "vendor/morphdom-umd.min.js", "fonts/Geist-Variable.woff2", "fonts/GeistMono-Variable.woff2", "img/orb-plata.png", "img/orb-s1.png", "img/orb-s2.png", "img/orb-s3.png", "img/orb-s4.png", "img/orb-s5.png", "img/p/angeles-1.svg", "img/p/angeles-2.svg", "img/p/angeles-2s.svg", "img/p/balanceo_pierna-1.svg", "img/p/balanceo_pierna-1s.svg", "img/p/bird_dog-1.svg", "img/p/bird_dog-2.svg", "img/p/bird_dog-2s.svg", "img/p/boxeo-1.svg", "img/p/boxeo-2.svg", "img/p/boxeo-2s.svg", "img/p/bulgara-1.svg", "img/p/bulgara-2.svg", "img/p/bulgara-2s.svg", "img/p/chin_tuck-1.svg", "img/p/chin_tuck-2.svg", "img/p/chin_tuck-2s.svg", "img/p/circulos_brazos-1.svg", "img/p/circulos_brazos-1s.svg", "img/p/circulos_cadera-1.svg", "img/p/circulos_cadera-1s.svg", "img/p/crunch_invertido-1.svg", "img/p/crunch_invertido-2.svg", "img/p/crunch_invertido-2s.svg", "img/p/curl-1.svg", "img/p/curl-2.svg", "img/p/curl-2s.svg", "img/p/curl_isquios-1.svg", "img/p/curl_isquios-2.svg", "img/p/curl_isquios-2s.svg", "img/p/curl_martillo-1.svg", "img/p/curl_martillo-2.svg", "img/p/curl_martillo-2s.svg", "img/p/deadbug-1.svg", "img/p/deadbug-2.svg", "img/p/deadbug-2s.svg", "img/p/elev_piernas-1.svg", "img/p/elev_piernas-2.svg", "img/p/elev_piernas-2s.svg", "img/p/escalador-1.svg", "img/p/escalador-2.svg", "img/p/escalador-2s.svg", "img/p/escapular_pared-1.svg", "img/p/escapular_pared-2.svg", "img/p/escapular_pared-2s.svg", "img/p/esfinge-1.svg", "img/p/flex_banco-1.svg", "img/p/flex_banco-2.svg", "img/p/flex_banco-2s.svg", "img/p/flex_meson-1.svg", "img/p/flex_meson-2.svg", "img/p/flex_meson-2s.svg", "img/p/flex_pared-1.svg", "img/p/flex_pared-2.svg", "img/p/flex_pared-2s.svg", "img/p/flex_pica-1.svg", "img/p/flex_pica-2.svg", "img/p/flex_pica-2s.svg", "img/p/flex_rodillas-1.svg", "img/p/flex_rodillas-2.svg", "img/p/flex_rodillas-2s.svg", "img/p/flex_suelo-1.svg", "img/p/flex_suelo-2.svg", "img/p/flex_suelo-2s.svg", "img/p/flexor_cadera-1.svg", "img/p/flexor_cadera-1s.svg", "img/p/fondo_suelo-1.svg", "img/p/fondo_suelo-2.svg", "img/p/fondo_suelo-2s.svg", "img/p/gato_vaca-1.svg", "img/p/gato_vaca-2.svg", "img/p/gato_vaca-2s.svg", "img/p/hip_thrust-1.svg", "img/p/hip_thrust-2.svg", "img/p/hip_thrust-2s.svg", "img/p/hollow-1.svg", "img/p/hollow_completo-1.svg", "img/p/jalon_suelo-1.svg", "img/p/jalon_suelo-2.svg", "img/p/jalon_suelo-2s.svg", "img/p/laterales-1.svg", "img/p/laterales-2.svg", "img/p/laterales-2s.svg", "img/p/marcha-1.svg", "img/p/marcha-1s.svg", "img/p/pecho_marco-1.svg", "img/p/pistol_marco-1.svg", "img/p/pistol_marco-2.svg", "img/p/pistol_marco-2s.svg", "img/p/plancha-1.svg", "img/p/plancha_lateral-1.svg", "img/p/pm_rumano-1.svg", "img/p/pm_rumano-2.svg", "img/p/pm_rumano-2s.svg", "img/p/puente-1.svg", "img/p/puente-2.svg", "img/p/puente-2s.svg", "img/p/puente_isquios-1.svg", "img/p/puente_isquios-2.svg", "img/p/puente_isquios-2s.svg", "img/p/puente_isquios_una-1.svg", "img/p/puente_una2-1.svg", "img/p/puente_una2-2.svg", "img/p/puente_una2-2s.svg", "img/p/remo_australiano-1.svg", "img/p/remo_australiano-2.svg", "img/p/remo_australiano-2s.svg", "img/p/remo_marco-1.svg", "img/p/remo_marco-2.svg", "img/p/remo_marco-2s.svg", "img/p/remo_marco_cerca-1.svg", "img/p/remo_marco_cerca-2.svg", "img/p/remo_marco_cerca-2s.svg", "img/p/sentadilla-1.svg", "img/p/sentadilla-2.svg", "img/p/sentadilla-2s.svg", "img/p/sentadilla_libre-1.svg", "img/p/sentadilla_pared-1.svg", "img/p/sentadilla_silla-1.svg", "img/p/sentadilla_silla-2.svg", "img/p/sentadilla_silla-2s.svg", "img/p/sentadilla_talones-1.svg", "img/p/sentadilla_talones-2.svg", "img/p/sentadilla_talones-2s.svg", "img/p/subida_escalon-1.svg", "img/p/subida_escalon-2.svg", "img/p/subida_escalon-2s.svg", "img/p/sumo-1.svg", "img/p/sumo-2.svg", "img/p/sumo-2s.svg", "img/p/talones-1.svg", "img/p/talones-2.svg", "img/p/talones-2s.svg", "img/p/talones_suelo-1.svg", "img/p/talones_suelo-2.svg", "img/p/talones_suelo-2s.svg", "img/p/triceps-1.svg", "img/p/triceps-2.svg", "img/p/triceps-2s.svg", "img/p/ytw-1.svg", "img/p/ytw-2.svg", "img/p/ytw-3.svg", "img/p/zancada_atras-1.svg", "img/p/zancada_atras-2.svg", "img/p/zancada_atras-2s.svg", "img/p/zancada_estatica-1.svg", "img/p/zancada_estatica-2.svg", "img/p/zancada_estatica-2s.svg", "icons/apple-touch-icon-orbe.png", "icons/favicon-192-orbe.png", "icons/favicon-32-orbe.png", "icons/icon-192-orbe.png", "icons/icon-512-orbe.png", "icons/icon-maskable-512-orbe.png", "icons/splash-1170x2532-orbe.png"];
self.addEventListener('install', (e) => {
  // cache: 'reload' salta la caché HTTP del navegador: si no, una versión nueva podía guardar archivos de la anterior
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    body: n.body, tag: n.tag || ('rutina-' + n.type), icon: 'icons/icon-192-orbe.png', badge: 'icons/icon-192-orbe.png',
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
