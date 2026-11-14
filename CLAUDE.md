# keystone

App web instalable (PWA) de Joshen para entrenamiento, comida, hábitos y salud. La interfaz y los textos son en español (Chile, tuteo). Se publica con GitHub Pages en https://joshen-am.github.io/rutina/ desde la raíz de la rama `main`.

## Estructura

- **Raíz del repo**: la app ya construida (`index.html`, `sw.js`, `body3d.js`, `img/` con los dibujos de los ejercicios en `img/p/`, `icons/`, `vendor/`, `fonts/`, `push/`, `manifest.webmanifest`, `README.md`). Es **salida del build**: no se edita a mano, se regenera.
- **`fuente/`**: todo el código fuente.
  - `gen/build3.py`: arma la plantilla. Corre `v3/tpl3.py` (HTML de cada pantalla) y `v3/assemble.py` (une `v3/core.js`, `render.js`, `food.js`, `health.js`, `native.js` y `parts.json` en `script3.js`), y escribe `fuente/canvas/Main.dc.html`.
  - `gen/build_pwa3.py <versión>`: convierte `Main.dc.html` en la PWA de la raíz, copia recursos y escribe `sw.js` con la caché `rutina-v<versión>`. Borra la salida anterior de la raíz, pero conserva lo que está en `KEEP` (`.git`, `.github`, `fuente`, `CLAUDE.md`, `brand`, `nativo`). Si agregas archivos a la raíz que no salen del build, súmalos a `KEEP`.
  - `gen/fuente/` (`contenido.py`, `ejercicios.py`, `figs.py`): textos, rutinas y figuras de los ejercicios. `gen_figs.py` dibuja cada posición en `poses/` y `gen_session.py` produce `session.json` (ver «Tarjeta paso a paso»).
  - `gen/b3d/`: el cuerpo 3D de los mapas de músculos (ver abajo).
  - `gen/push_src/`: envío de recordatorios con GitHub Actions (`.github/workflows/recordatorios.yml`, secreto `RUTINA_PUSH`).
  - `vendor/`: copias de Geist (OFL), morphdom (MIT) y la licencia de three.js.
  - `herramientas/masc.mjs`: el script que generó `body.glb` (modelo Xbot masculinizado). No hace falta para construir.
  - `pruebas/plato.jpg`: foto de ejemplo para la prueba de comida.

## Construir y publicar

```
cd fuente/gen
python3 gen_figs.py && python3 gen_session.py   # solo si cambian los dibujos, los textos o las rutinas
python3 build3.py
python3 build_pwa3.py 24        # sube el número en cada versión publicada (cambia la caché del service worker); la última fue 23
cd ../.. && git add -A && git commit && git push   # GitHub Pages publica solo
```

Necesita Python 3 con `uharfbuzz` y `fontTools` (`pip install uharfbuzz fonttools`). Las pruebas usan Node con `playwright` y Chromium.

## Probar

- Servir la app: `python3 -m http.server 8765` en la raíz del repo.
- `node fuente/gen/pwav3.js <carpeta>`: recorre la app en modo claro y oscuro. Pon `plato.jpg` dentro de `<carpeta>`. Si Chromium no está donde lo busca playwright, usa la variable `CHROMIUM`.
- `node fuente/gen/sesshot.js`: capturas de una sesión.
- Animación 3D de los ejercicios (ya no está en la app; sirve solo si se retoma): primero `python3 fuente/gen/b3d/preparar.py` (copia el motor y three.js a `b3d/t/`). Después, desde `fuente/gen`:
  - `node b3d/exmetrics.js`: por ejercicio muestra si el cuerpo flota (`flota`), se hunde (`hunde`), si no llega a sus puntos de IK (`ik`), cuánto se mueve (`recorrido`) y la peor separación de un apoyo declarado (`apoyo`). Que flota sea 0, que hunde y apoyo no pasen de unos 2 cm, y que recorrido supere 0.15 m (salvo calistenia corta, como los talones).
  - `node b3d/balance.js`: centro de masa respecto de los apoyos (de pie no debe caer fuera de los pies).
  - `node b3d/exshot.js <lista>`: imágenes de las poses clave en `b3d/exs/`. `node b3d/exgif.js <lista> <N>`: cuadros en `b3d/gif/`.
  - **Revisa siempre las imágenes**, no solo los números: un apoyo mal declarado da números buenos y un cuerpo que flota.

## Tarjeta paso a paso (pantalla del ejercicio)

- Desde la versión 23 el ejercicio se explica con dibujos fijos en una tarjeta negra con halo, como la del inicio: una página por indicación, con su dibujo, «Paso 1 de 3», puntos y flechas (tocar el dibujo también avanza). La animación 3D de los ejercicios salió de la app.
- `gen_figs.py` dibuja cada posición del PDF (`ejercicios.py`) en `poses/<clave>-<n>.svg`, con colores para fondo negro. Si la última posición trae la anterior en gris o una flecha, también deja `<clave>-<n>s.svg` con esa posición sola. Todas las posiciones de un ejercicio comparten encuadre.
- `gen_session.py` arma `pages` para cada paso de la sesión. Regla: con una indicación, la última posición; con varias, las primeras van con la posición 1 y la última con la final. Si todas usan el mismo dibujo queda una sola página con todas las indicaciones.
- Cuando la regla no calza, se elige en `FIGS` de `gen_session.py`, por día y ejercicio: una lista de posiciones (`['2s', 1, 2]`) o pares `(posición, texto)` para repartir en varias páginas una indicación que junta varias posiciones (gato-vaca, Y-T-W). Un ejercicio con una indicación y varias posiciones sin fantasma tiene que estar en `FIGS`; si no, el generador avisa.
- La nota «(el dibujo es visto desde arriba / de frente)» de una indicación se muestra como «Vista desde arriba» o «Vista de frente» en la esquina del dibujo.
- **Revisa siempre las imágenes**: arma una hoja con cada página (dibujo y texto) y mírala entera antes de publicar.
- Los dibujos se enlazan como `img/p/…`, que existe solo en la app construida: en el lienzo de claude.ai (`Main.dc.html`) no se ven.

## Cuerpo 3D (`fuente/gen/b3d`)

- `body3d.js` (three.js r170, `body.glb` y RoomEnvironment) pinta los mapas de músculos: `.body3d` con `data-key="rec"` (recuperación) y `"sum"` (resumen de la sesión), con `data-loads`.
- `exercises.js`, `exfit.js` y las pruebas de la animación quedaron en `b3d/` pero ya no entran en la app. Si Joshen pide volver a la animación, vuelve a cargarlos en `build_pwa3.py` y pon un `.body3d` con `data-ex` en la pantalla del ejercicio. Lo que sigue describe ese motor:
- `exercises.js` define `window.KS_EX`: cada ejercicio tiene poses clave `P({...})` con `p` y `r` de la cadera, `spine`, `head`, `neck`, `sh` y extremidades, sea como `{ik, pole}` o como direcciones `{a, b, w}`.
  - Ejes: y hacia arriba desde el suelo, z hacia adelante, x hacia la izquierda del cuerpo.
  - Opciones: `loop` (`pingpong`, `cycle` con `smooth`, `hold`), `t`, `tempo`, `dwell` (pausa en cada extremo), `pass` (poses de un `cycle` por las que el cuerpo pasa sin detenerse), `view`, `elev`, `focus` (acercar la cámara), `props`, `mat` y `loads` (músculos que se pintan).
  - `props`: `db` (`both`, `left`, `right` o `center`), `wall` (`z` = cara de la pared delante o detrás; con `side: 1` va al costado en `x`) y `door` (`x` = media luz del vano, `z` = plano de la pared, `cx` = corrimiento del vano en x). La pared tiene zócalo y el marco es una pared con su vano, jambas y dintel.
  - Manos: `lHand`/`rHand` en `'flat'` (palma al suelo), `'wall'` (palma contra una pared que está delante), `'wallSide'` (pared al costado) o `[x, y, z]` en grados.
- **Apoyos**: cada pose de suelo declara `touch` (`toes`, `knees`, `hands`, `forearms`, `hips`, `back`, `chest`, `head`, o un hueso con su altura, como `'RightFoot:0.05'`). Un ajuste por Levenberg-Marquardt mueve y gira la cadera para que esos apoyos toquen el suelo. De pie, el ajuste mantiene el centro de masa sobre los pies. Entre dos poses, un apoyo que solo tiene una de ellas se suelta (o se toma) con peso: cuenta entero en su pose y casi nada a medio tramo.
- **`exfit.js` se genera**: después de cambiar `exercises.js` o el solver, corre `python3 b3d/preparar.py`, vacía `b3d/t/exfit.js` (`echo "window.KS_FIT={};" > b3d/t/exfit.js`) y luego `node b3d/bake.js`. Si el ajuste de un ejercicio no coincide con su definición, la app lo recalcula al abrirlo (más lento, pero correcto).
- `edit_ex.py <script.py>` trae `setb(clave, texto)` para reemplazar el bloque entero de un ejercicio.

## Reglas

- Nunca subas claves de API, tokens ni la clave privada VAPID. La clave de IA la pone el usuario en la app y queda solo en su teléfono.
- Los datos del usuario viven en el navegador (`localStorage` `tracker-rutinas-v3` e IndexedDB `rutina`). No rompas su formato sin migrarlo.
- La app nativa (Capacitor/Xcode, carpeta `nativo/`, workflow `app-ios.yml`) quedó abandonada a pedido de Joshen. No la retomes si él no lo pide.
- La marca es keystone, con la esfera cromada plateada (`img/orb-plata.png`). Los íconos salen de la esfera de `brand/icon-1024.png` y se publican con el sufijo `-orbe` (pestaña: `favicon-32`/`favicon-192`, esfera sola; inicio: esfera sobre blanco). Si cambian, cambia el sufijo para que el navegador no muestre los viejos. El color de la esfera cambia según la salud (`orb-s1`…`s5`).
- `fuente/canvas/Main.dc.html` es la misma página que el lienzo de diseño en claude.ai.
