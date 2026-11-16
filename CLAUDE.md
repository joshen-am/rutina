# keystone

App web instalable (PWA) de Joshen para entrenamiento, comida, hábitos y salud. La interfaz y los textos son en español (Chile, tuteo). Se publica con GitHub Pages en https://joshen-am.github.io/rutina/ desde la raíz de la rama `main`.

## Estructura

- **Raíz del repo**: la app ya construida (`index.html`, `sw.js`, `img/` con los dibujos de los ejercicios en `img/p/`, `icons/`, `vendor/` (solo morphdom), `fonts/`, `push/`, `manifest.webmanifest`, `README.md`). Es **salida del build**: no se edita a mano, se regenera.
- **`fuente/`**: todo el código fuente.
  - `gen/build3.py`: arma la plantilla. Corre `v3/tpl3.py` (HTML de cada pantalla) y `v3/assemble.py` (une `v3/core.js`, `render.js`, `food.js`, `health.js` + `progreso.js` + `cuerpo.js`, `native.js` y `parts.json` en `script3.js`; las plantillas nuevas de la 28 están en `v3/tpl_cuerpo.py`), inyecta `session.json` y `program.json`, y escribe `fuente/canvas/Main.dc.html`.
  - `gen/build_pwa3.py <versión>`: convierte `Main.dc.html` en la PWA de la raíz, copia recursos y escribe `sw.js` con la caché `rutina-v<versión>`. Borra la salida anterior de la raíz, pero conserva lo que está en `KEEP` (`.git`, `.github`, `.gitignore`, `fuente`, `CLAUDE.md`, `brand`). Si agregas archivos a la raíz que no salen del build, súmalos a `KEEP`.
  - `gen/fuente/` (`contenido.py`, `ejercicios.py`, `figs.py`, `escaneo.py`): textos, rutinas, la escalera de progresión y las figuras de los ejercicios. `gen_figs.py` dibuja cada posición en `poses/` (también las de `VARIANTES`) y `gen_session.py` produce `session.json` y `program.json` (escalera `LADDER`, «Más adelante» `MAS_ADELANTE`, el catálogo de ejercicios y las `ESCALERAS` de la rutina adaptativa).
  - `gen/v3/progreso.js`: repeticiones por serie, progresión, récords, semana del programa, resumen semanal y la pantalla Progreso (ver «Progreso»).
  - `gen/v3/mapa2d.py`: el mapa de músculos en 2D (ver «Mapa de músculos»).
  - `gen/push_src/`: envío de recordatorios con GitHub Actions (`.github/workflows/recordatorios.yml`, secreto `RUTINA_PUSH`).
  - `vendor/`: copias de Geist (OFL) y morphdom (MIT).
  - `pruebas/plato.jpg`: foto de ejemplo para la prueba de comida.
- **Archivo** (rama `archivo/3d-y-app-nativa`, desde la versión 27): el cuerpo 3D (`fuente/gen/b3d`, three.js, `body.glb` y la animación de los ejercicios), `herramientas/masc.mjs`, la app nativa (`nativo/` y el workflow `app-ios.yml`) y `sesshot.js`. Salieron de `main` y quedan ahí por si se retoman.

## Construir y publicar

```
cd fuente/gen
python3 gen_figs.py && python3 gen_session.py   # solo si cambian los dibujos, los textos o las rutinas
python3 build3.py
python3 build_pwa3.py 29        # sube el número en cada versión publicada (cambia la caché del service worker y el «Versión N» del pie de Ajustes); la última fue 28
cd ../.. && git add -A && git commit && git push   # GitHub Pages publica solo
```

`build3.py` y `build_pwa3.py` corren con Python 3 solo. `uharfbuzz` y `fontTools` los pide únicamente `wordmark.py` (la función `mark()` del logo, que el build no llama). Las pruebas usan Node con `playwright`; si Playwright no tiene su navegador descargado, pon en `CHROMIUM` la ruta de Google Chrome.

## Probar

- Servir la app: `python3 -m http.server 8765` en la raíz del repo (o `preview_start keystone`, con `.claude/launch.json`, que es local: está en `.git/info/exclude` y en `KEEP`).
- La cámara se prueba con Chrome y `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`; la IA se simula interceptando `generativelanguage.googleapis.com` (como en `pwav3.js`).
- `node fuente/gen/pwav3.js <carpeta>`: recorre la app en modo claro y oscuro. Pon `plato.jpg` dentro de `<carpeta>`. Si Chromium no está donde lo busca playwright, usa la variable `CHROMIUM`.
- Mide los toques con la CPU frenada 4× (CDP `Emulation.setCPUThrottlingRate`): cada toque debería pintar en menos de 100 ms.
- Ojo con el panel del navegador de Claude: si está oculto no pinta cuadros, y una lectura del DOM justo después de un clic puede ver la pantalla anterior.

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

## Cuerpo 3D de antes (en la rama `archivo/3d-y-app-nativa` desde la 27)

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
- La app nativa (Capacitor/Xcode) quedó abandonada a pedido de Joshen y vive en la rama `archivo/3d-y-app-nativa`. No la retomes si él no lo pide. `v3/native.js` sigue en la app (solo responde «no nativa»).
- La marca es keystone, con la esfera cromada plateada (`img/orb-plata.png`). Los íconos salen de la esfera de `brand/icon-1024.png` y se publican con el sufijo `-orbe` (pestaña: `favicon-32`/`favicon-192`, esfera sola; inicio: esfera sobre blanco). Si cambian, cambia el sufijo para que el navegador no muestre los viejos. El color de la esfera cambia según la salud (`orb-s1`…`s5`).
- `fuente/canvas/Main.dc.html` es la misma página que el lienzo de diseño en claude.ai.
- **Dirección visual (versión 26, pedido de Joshen: «basa tu diseño en Superpower», cara, de alta gama, misteriosa, colores vibrantes)**. Se toman las cualidades de la app de Superpower, no su marca:
  - **Superficies**: la estructura va en neutros zinc. En claro, el lienzo es `#F4F4F5` y las tarjetas blancas con sombra suave (`th.cardShadow`). Lo que va dentro de hojas o tarjetas usa `th.well`, nunca `th.card`, para no quedar blanco sobre blanco. Las tarjetas negras con halo siguen siendo la firma.
  - **Color vibrante solo en los datos**: verde neón, amarillo ácido, bermellón y rosa. `healthColor` es una rampa rosa (0) → bermellón (45) → amarillo (70) → verde (85+), a plena intensidad sobre negro y un paso más profunda sobre claro. El texto de color va con `healthText`. Las notas A–D, los macros, el calor de los músculos y el historial usan la misma familia.
  - **Barra segmentada** en la tarjeta del perfil de salud: cuántas áreas hay en cada nota (Óptimo, Bien, Mejorable, Requiere atención), como la barra de biomarcadores de Superpower.
  - Los títulos grandes van en peso 400.
- **Movimiento** (versión 26). Todo se escribe en la hoja de estilos de `tpl3.py`, entra una sola vez al aparecer y nada queda en bucle:
  - Las curvas son `--ease-out` (`cubic-bezier(0.23,1,0.32,1)`) y la de hojas de iOS. Solo se anima `transform`, `opacity`, `clip-path` y el trazo de los anillos.
  - Las pantallas suben 10 px con 40 ms de desfase (`.scr`). Los halos florecen (`.halo`), los anillos se llenan (`.ring-in`, con `--full`) y las barras crecen (`.bar-in`, `.seg-in`).
  - El dibujo del ejercicio se revela con un barrido de escáner al cambiar de página (`.pg[data-on="1"]`) y el mapa del resumen se escanea de abajo hacia arriba (`reveal=True` en `body_map`).
  - El puntaje de salud y el de cada área cuentan desde 0 (`data-count` y `data-count-id`, en el runtime de `build_pwa3.py`), una vez por apertura de la app y otra solo si cambia.
  - Todo depende de `data-motion` (el interruptor «Animaciones» de Ajustes). Con «reducir movimiento» del sistema queda un fundido corto, sin desplazamientos.
- **Versión al pie de la página** (pedido de Joshen, desde la 25): al final de Ajustes, bajo «Hecha para…», va «Versión N». `build3.py` deja `__VERSION__` en la plantilla y `build_pwa3.py <N>` lo cambia por el número que se publica, el mismo de la caché `rutina-vN`. En el lienzo de claude.ai se ve el marcador `__VERSION__`.
- El Historial (tipo GitHub) tiene días cuadrados: los rótulos L, M y V van en la misma grilla y cada día lleva `aspect-ratio: 1 / 1`.
- UX/UI (versión 24, con /afinar y /unslop, sin tocar la vibra):
  - El foco con teclado se ve en todo (`:focus-visible` con `!important`, porque los campos traen `outline: none` en línea).
  - El texto pintado con el color de salud sobre fondos claros usa `healthText` (mismo tono, más oscuro, ≥ 4,5:1). Los anillos y puntos siguen con `healthColor`.
  - Los botones de menos de 44 px llevan `class="hit"`, un área de toque invisible de 44.
  - El interlineado base es 1,35. Nada va bajo 12 px, salvo las tarjetas de macros de cinco columnas (11).
  - En la sesión, «Siguiente» es el único botón lleno. Las flechas de la tarjeta son translúcidas y el contador de arriba dice «Ejercicio n de N» (el «Paso n de N» es de los dibujos).
- **Escala visual (versión 27)**:
  - Letra: 12 · 13 · 16 · 20 · 28 · 34 · 44 · 72/76, sin tamaños intermedios. Los títulos de tarjeta van en 28/32 y el texto de la tarjeta del ejercicio en 20 (corto) o 16 (largo).
  - Radios en cuatro niveles: píldora (999), 12 para controles, 16 para bloques anidados y 24 para tarjetas. Las hojas siguen en 28 arriba.
- **Inicio (versión 27)**, más corto: perfil de salud compacto (sin «Enfócate en»), «Hoy» con tres anillos (hábitos, comida, agua; cada uno lleva a su pestaña), la semana con la rutina del día, Recuperación, el resumen semanal (solo domingo y lunes) y la tarjeta de Progreso. Las claves de orden son `salud`, `hoy`, `rutina`, `recup`, `semanal` y `progreso`; `prefs.v4` marca la migración desde el Inicio viejo. El Historial y el agua salieron de Inicio: el agua vive en Hábitos y el Historial en Progreso.
- La sesión pide la pantalla encendida (Wake Lock) y la suelta al salir. El motor de audio se crea en un momento libre después de abrir (`warmAudio`), no en el primer toque, que antes tardaba ~290 ms.
- El paso de la sesión va una sola vez en la plantilla, con `id="paso-N"`: morphdom lo reemplaza al avanzar y su animación vuelve a correr.
- El respaldo avisa cada semana («Tu respaldo semanal») y lo guarda en Archivos o iCloud Drive con un toque (menú compartir). Lo técnico de los recordatorios (código y secreto de GitHub) va en «Configuración avanzada».

## Progreso (`fuente/gen/v3/progreso.js`, versión 27)

- **Repeticiones por serie**: en la sesión, cada ejercicio con series tiene un selector (repeticiones o segundos, ±1 o ±5) y cada serie guarda su valor al tocarla (`sess.reps[i]`). Al terminar, pasan a `xlog[clave] = [{ d, r: [..], u: 'r' | 's' }]` (las últimas 40 por ejercicio). `doseInfo` lee el rango de la dosis («4 × 6–12», «3 × 20–40 s», «3 × 8 por lado»).
- **Progresión**: la meta de cada serie es lo de la vez anterior más un paso, sin pasar el tope del rango. Si la vez anterior todas las series llegaron al tope, la sesión dice que toca subir de nivel con el «Más difícil» del ejercicio.
- **Récords e hitos**: si la mejor serie supera la mejor marca anterior del ejercicio, el resumen muestra «Récords de hoy». También marca los hitos de 1, 5, 10, 25, 50, 75, 100, 150, 200, 300 y 500 sesiones.
- **Programa**: la semana se cuenta desde `since` (fases 1, 2 y 3 en las semanas 1–4, 5–8 y 9+). La escalera y «Más adelante» salen de `contenido.py` vía `program.json`.
- **Pantalla Progreso** (superpuesta, desde Inicio y Salud): esta semana, sesiones por semana (12 semanas, con la meta), puntaje de salud por evaluación (`hpHist`, se guarda en cada evaluación), peso y cintura, carga por músculo contra la semana anterior, récords, escalera, «Más adelante» e Historial. Los gráficos se dibujan al entrar (`.line-in` y `.col-in`).
- `xlog` y `hpHist` se guardan con el resto (`applyData` y `snapshot`) y «Borrar historial» los vacía.

## Cuerpo, día y rutina adaptativa (`fuente/gen/v3/cuerpo.js` y `tpl_cuerpo.py`, versión 28)

Pedido de Joshen: fotos para analizar el progreso del cuerpo, análisis diarios, mejoras, aspecto («looksmaxing» con base) y rutinas que se adapten, siempre en casa y sin equipamiento salvo la mancuerna de 3 kg (que puede entrar en cualquier rutina).

- **Check-in diario** (Inicio, sección `diario`, arriba): sueño, energía, ánimo y dolor muscular de 1 a 5 (`daily[fecha]`). Con eso, `briefing()` arma el informe del día con reglas simples: qué entrenar o bajar, recuperación, la proteína y el agua de ayer, y la mejora que elegiste anoche. «Analizar mi día con IA» suma 3 viñetas. Desde las 18:00 aparece el cierre del día: lo que salió bien y una mejora para mañana, con opciones sugeridas por tus datos.
- **Fotos de progreso**: frente, perfil y espalda (la cara es opcional), una vez por semana; la sección `fotos` de Inicio aparece cuando toca.
  - La cámara (`getUserMedia`, con la de la galería como respaldo) muestra la foto anterior de la misma pose al 30 % y líneas guía (cabeza, hombros, cadera y pies). Cuenta 5 s y deja revisar.
  - Las imágenes van solo a IndexedDB (`body:` y `bodyT:` para miniaturas), nunca al respaldo. La lista con fechas y análisis va en `bodyPhotos`.
  - Hay un comparador con deslizador (contra la primera o la anterior) y una línea de tiempo.
- **Análisis con IA** (`analyzeBody`): manda las fotos de hoy y las de la sesión anterior (hasta 7, a 768 px) con un resumen de tus datos (`aiContext`). Devuelve un resumen, grasa estimada como rango, cambios por zona, postura, simetría, piel (solo con foto de cara) y qué hacer en rutina, comida y hábitos. Antes de enviar se avisa a quién viajan las fotos: con Gemini gratis, Google puede usarlas para entrenar.
- **Aspecto** (superpuesta, desde Salud y Progreso):
  - grasa estimada, la relación hombros/cintura (medidas nuevas en Salud: hombros, pecho, brazo y cadera) y cintura/altura;
  - la postura del último análisis, con la opción de sumar Y-T-W;
  - piel y aseo (los hábitos «Protector solar» y «Rutina de piel de noche», apagados por defecto);
  - lo que cambia la cara: grasa, sueño y agua.
  - Nada de prácticas sin evidencia.
- **Rutina adaptativa**:
  - `adaptedSteps(rid)` reemplaza a `sessionData()[rid]` en la sesión y en la tarjeta de rutina. Aplica `adapt.swaps[rid][clave] = variante`, `adapt.sets[rid][clave] = ±n`, `adapt.extras[rid] = [{ k }]` y la semana de descarga: cada 6 semanas, una serie menos (se puede saltar).
  - `adaptPropose()` propone subir un peldaño de la escalera cuando llegas al tope dos sesiones seguidas, +1 serie si te estancas tres, y ajustes por objetivo (`prefs.goal`: general, bajar grasa, ganar músculo, postura, estética).
  - «Pedir una revisión a la IA» propone hasta 4 cambios dentro del catálogo. Nada se aplica sin «Aplicar», y «Volver a la rutina original» lo deshace todo.
- **Chat con el entrenador** (botón al lado del avatar en Inicio): responde con tus datos, en corto. Guarda las últimas 40 líneas en `chat`.
- **Informe del mes** (al final de Progreso): sesiones, récords, medidas, fotos y el último análisis de 30 días, en una página que se imprime o se guarda como PDF.
- `daily`, `bodyPhotos`, `adapt` y `chat` se guardan con el resto; «Borrar historial» vacía `daily`. El orden nuevo de Inicio es `diario`, `salud`, `hoy`, `rutina`, `fotos`, `recup`, `semanal`, `progreso` (`prefs.v5` suma las dos secciones nuevas sin perder tu orden).
