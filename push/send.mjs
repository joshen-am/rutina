// Envía los recordatorios de sprout como notificaciones push.
// Lo ejecuta el workflow .github/workflows/recordatorios.yml cada 10 minutos.
import webpush from 'web-push';
import fs from 'node:fs';

const STATE = '.push-state/last.json';
const raw = process.env.RUTINA_PUSH;
if (!raw) {
  console.log('Falta el secreto RUTINA_PUSH: activa los recordatorios en la app y pega el código en GitHub.');
  process.exit(0);
}
const cfg = JSON.parse(Buffer.from(raw.trim(), 'base64url').toString('utf8'));
webpush.setVapidDetails('https://joshen-am.github.io/rutina/', cfg.pub, cfg.priv);

const now = Date.now();
let last = now - 10 * 60e3;
try { last = JSON.parse(fs.readFileSync(STATE, 'utf8')).last || last; } catch {}
if (now - last > 75 * 60e3) last = now - 75 * 60e3; // tras una pausa larga no se envía una avalancha

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: cfg.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function local(ts) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { wd: WD[p.weekday], min: Number(p.hour) * 60 + Number(p.minute) };
}

const MSG = {
  manana: { title: 'Buenos días', body: 'Elige tus 3 tareas más importantes y sal 10 minutos a la luz.' },
  agua: { title: 'Hora de un vaso de agua', body: 'Abre la app y súmalo a tu día.' },
  entreno: { title: 'Hoy toca entrenar', body: 'Abre la app y toca Iniciar sesión.' },
  lectura: { title: 'Tu momento de lectura', body: 'Aunque sea una página, cuenta.' },
  dormir: { title: 'Hora de desconectarte', body: 'Deja el celular cargando fuera de la pieza.' }
};

const due = new Set();
const r = cfg.rem || {};
const force = process.env.PRUEBA === 'true';
if (force) due.add('prueba');
for (let t = last + 60e3; t <= now; t += 60e3) {
  const { wd, min } = local(t);
  for (const id of ['manana', 'entreno', 'lectura', 'dormir']) {
    const x = r[id];
    if (!x || !x.on || x.at !== min) continue;
    if (id === 'entreno' && !(cfg.days || []).includes(wd)) continue;
    due.add(id);
  }
  const a = r.agua;
  if (a && a.on && min >= a.from && min <= a.to && (min - a.from) % a.every === 0) due.add('agua');
}

let failed = false;
for (const id of due) {
  const m = id === 'prueba' ? { title: 'Recordatorios activos', body: 'Así te llegarán los avisos de sprout.' } : MSG[id];
  const payload = JSON.stringify({ type: id, title: m.title, body: m.body, tag: 'rutina-' + id });
  try {
    await webpush.sendNotification(cfg.sub, payload, { TTL: 3600, urgency: 'high' });
    console.log('enviado', id);
  } catch (e) {
    failed = true;
    console.log('error', id, e.statusCode, e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) console.log('La suscripción venció: en la app, Ajustes > Recordatorios > Activar, y vuelve a copiar el código.');
  }
}
fs.mkdirSync('.push-state', { recursive: true });
fs.writeFileSync(STATE, JSON.stringify({ last: now }));
console.log('revisado', new Date(last).toISOString(), '→', new Date(now).toISOString(), 'avisos:', [...due].join(', ') || 'ninguno');
if (failed && force) process.exit(1);
