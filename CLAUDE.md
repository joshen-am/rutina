# keystone

App web instalable (PWA) de Joshen para entrenamiento, comida, hábitos y salud. La interfaz y los textos son en español (Chile, tuteo). Se publica con GitHub Pages en https://joshen-am.github.io/rutina/ desde la raíz de la rama `main`.

## Estructura

- **Raíz del repo**: la app ya construida (`index.html`, `sw.js`, `img/` con los dibujos de los ejercicios en `img/p/`, `icons/`, `vendor/` (solo morphdom), `fonts/`, `push/`, `manifest.webmanifest`, `README.md`). Es **salida del build**: no se edita a mano, se regenera.
- **`fuente/`**: todo el código fuente.
  - `gen/build3.py`: arma la plantilla. Corre `v3/tpl3.py` (HTML de cada pantalla) y `v3/assemble.py` (une `v3/core.js`, `render.js`, `food.js`, `health.js`, `native.js` y `parts.json` en `script3.js`), y escribe `fuente/canvas/Main.dc.html`.
  - `gen/build_pwa3.py <versión>`: convierte `Main.dc.html` en la PWA de la raíz, copia recursos y escribe `sw.js` con la caché `rutina-v<versión>`. Borra la salida anterior de la raíz, pero conserva lo que está en `KEEP` (`.git`, `.github`, `fuente`, `CLAUDE.md`, `brand`, `nativo`). Si agregas archivos a la raíz que no salen del build, súmalos a `KEEP`.
  - `gen/fuente/` (`contenido.py`, `ejercicios.py`, `figs.py`): textos, rutinas y figuras de los ejercicios. `gen_figs.py` dibuja cada posición en `poses/` y `gen_session.py` produce `session.json` (ver «Tarjeta paso a paso»).
  - `gen/v3/mapa2d.py`: el mapa de músculos en 2D (ver «Mapa de músculos»).
  - `gen/b3d/`: el cuerpo 3D de antes (three.js). Desde la versión 25 no entra en la app; queda solo como archivo.
  - `gen/push_src/`: envío de recordatorios con GitHub Actions (`.github/workflows/recordatorios.yml`, secreto `RUTINA_PUSH`).
  - `vendor/`: copias de Geist (OFL), morphdom (MIT) y la licencia de three.js.
  - `herramientas/masc.mjs`: el script que generó `body.glb` (modelo Xbot masculinizado). No hace falta para construir.
  - `pruebas/plato.jpg`: foto de ejemplo para la prueba de comida.

## Construir y publicar

```
cd fuente/gen
python3 gen_figs.py && python3 gen_session.py   # solo si cambian los dibujos, los textos o las rutinas
python3 build3.py
python3 build_pwa3.py 26        # sube el número en cada versión publicada (cambia la caché del service worker y el «Versión N» del pie de Ajustes); la última fue 25
cd ../.. && git add -A && git commit && git push   # GitHub Pages publica solo
```

`build3.py` y `build_pwa3.py` corren con Python 3 solo. `uharfbuzz` y `fontTools` los pide únicamente `wordmark.py` (la función `mark()` del logo, que el build no llama). Las pruebas usan Node con `playwright`; si Playwright no tiene su navegador descargado, pon en `CHROMIUM` la ruta de Google Chrome.

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
- `gen_figs.py` dibuja cada posición del PDF (`ejercicios.py`) en `poses/<clave>-<n>.svg`. Si la última posición trae la anterior en gris o una flecha, también deja `<clave>-<n>s.svg` con esa posición sola. Todas las posiciones de un ejercicio comparten encuadre.
- **Estilo «Escaneo»** (desde la versión 24, elegido por Joshen para mantener la vibra premium, misteriosa y de laboratorio; las figuras sólidas con flechas naranjas la rompían): `fuente/escaneo.py` pinta las poses de `figs.py`. El cuerpo es una trama de puntos blancos que mide lo mismo en pantalla en todos los dibujos (`SCREEN_PITCH`, 4 px), el lado lejano va más tenue y la posición anterior al 30 %. Las mancuernas van en trazo fino, los objetos en filete casi transparente, las flechas punteadas y el suelo es una fila de puntos. No lleva color: el color lo pone el halo de la tarjeta. `figs.py` sigue definiendo las poses y el encuadre.
- `gen_session.py` arma `pages` para cada paso de la sesión. Regla: con una indicación, la última posición; con varias, las primeras van con la posición 1 y la última con la final. Si todas usan el mismo dibujo queda una sola página con todas las indicaciones.
- Cuando la regla no calza, se elige en `FIGS` de `gen_session.py`, por día y ejercicio: una lista de posiciones (`['2s', 1, 2]`) o pares `(posición, texto)` para repartir en varias páginas una indicación que junta varias posiciones (gato-vaca, Y-T-W). Un ejercicio con una indicación y varias posiciones sin fantasma tiene que estar en `FIGS`; si no, el generador avisa.
- La nota «(el dibujo es visto desde arriba / de frente)» de una indicación se muestra como «Vista desde arriba» o «Vista de frente» en la esquina del dibujo.
- **Revisa siempre las imágenes**: arma una hoja con cada página (dibujo y texto) y mírala entera antes de publicar.
- Los dibujos se enlazan como `img/p/…`, que existe solo en la app construida: en el lienzo de claude.ai (`Main.dc.html`) no se ven.

## Mapa de músculos (`fuente/gen/v3/mapa2d.py`)

- Desde la versión 25, Joshen pidió quitar el cuerpo 3D y reemplazarlo por una alternativa 2D. Ahora es un cuerpo de frente y otro de espalda hechos de puntos, en la línea de los dibujos «Escaneo», con los rótulos «Frente» y «Espalda». Está en dos lugares: la tarjeta Recuperación de Inicio (128 px, `body_map("hb", 3.6, "128px")`) y «Músculos trabajados» del resumen (`body_map("vb", 2.2)`).
- Se genera al construir. Cada punto cae en una de las 14 regiones de `regionKeys()` o en la base, y cada región es un `<path>` cuyo color se enlaza a `{{ hb.<región> }}` o `{{ vb.<región> }}`. Esos colores los calcula `heatColor`. La base usa `th.muscleOff`, el mismo color de un músculo sin carga.
- Entre músculos vecinos queda una fila de puntos de base, y pecho, abdomen, trapecio, lumbar y glúteos dejan libre el eje del cuerpo: así se lee la anatomía aunque nada tenga carga. Las formas se ajustan en `FRONT`, `BACK` y `BASE`.
- Ya no se publican three.js, `body3d.js` ni el modelo `body.glb` (unos 700 KB menos).

## Cuerpo 3D de antes (`fuente/gen/b3d`, fuera de la app desde la 25)

- `body3d.js` (three.js r170, `body.glb` y RoomEnvironment) pintaba los mapas de músculos: `.body3d` con `data-key="rec"` y `"sum"`, con `data-loads`. Para volver a usarlo habría que recuperar en `build_pwa3.py` lo que sacó la versión 25: copia de three.js y del modelo, importmap, `<script src="body3d.js">`, el caso `.body3d` en morphdom y los archivos del service worker.
- `exercises.js`, `exfit.js` y las pruebas de la animación de los ejercicios también quedaron aquí. Lo que sigue describe ese motor:
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
- **Versión al pie de la página** (pedido de Joshen, desde la 25): al final de Ajustes, bajo «Hecha para…», va «Versión N». `build3.py` deja `__VERSION__` en la plantilla y `build_pwa3.py <N>` lo cambia por el número que se publica, el mismo de la caché `rutina-vN`. En el lienzo de claude.ai se ve el marcador `__VERSION__`.
- El Historial (tipo GitHub) tiene días cuadrados: los rótulos L, M y V van en la misma grilla y cada día lleva `aspect-ratio: 1 / 1`.
- UX/UI (versión 24, con /afinar y /unslop, sin tocar la vibra):
  - El foco con teclado se ve en todo (`:focus-visible` con `!important`, porque los campos traen `outline: none` en línea).
  - El texto pintado con el color de salud sobre fondos claros usa `healthText` (mismo tono, más oscuro, ≥ 4,5:1). Los anillos y puntos siguen con `healthColor`.
  - Los botones de menos de 44 px llevan `class="hit"`, un área de toque invisible de 44.
  - El interlineado base es 1,35. Nada va bajo 12 px, salvo las tarjetas de macros de cinco columnas (11).
  - En la sesión, «Siguiente» es el único botón lleno. Las flechas de la tarjeta son translúcidas y el contador de arriba dice «Ejercicio n de N» (el «Paso n de N» es de los dibujos).
