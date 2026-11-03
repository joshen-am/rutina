# keystone

App web instalable (PWA) de Joshen para entrenamiento, comida, hábitos y salud. La interfaz y los textos son en español (Chile, tuteo). Se publica con GitHub Pages en https://joshen-am.github.io/rutina/ desde la raíz de la rama `main`.

## Estructura

- **Raíz del repo**: la app ya construida (`index.html`, `sw.js`, `body3d.js`, `exercises.js`, `exfit.js`, `img/`, `icons/`, `vendor/`, `fonts/`, `push/`, `manifest.webmanifest`, `README.md`). Es **salida del build**: no se edita a mano, se regenera.
- **`fuente/`**: todo el código fuente.
  - `gen/build3.py`: arma la plantilla. Corre `v3/tpl3.py` (HTML de cada pantalla) y `v3/assemble.py` (une `v3/core.js`, `render.js`, `food.js`, `health.js`, `native.js` y `parts.json` en `script3.js`), y escribe `fuente/canvas/Main.dc.html`.
  - `gen/build_pwa3.py <versión>`: convierte `Main.dc.html` en la PWA de la raíz, copia recursos y escribe `sw.js` con la caché `rutina-v<versión>`. Borra la salida anterior de la raíz, pero conserva lo que está en `KEEP` (`.git`, `.github`, `fuente`, `CLAUDE.md`, `brand`, `nativo`). Si agregas archivos a la raíz que no salen del build, súmalos a `KEEP`.
  - `gen/fuente/` (`contenido.py`, `ejercicios.py`, `figs.py`): textos, rutinas y figuras de los ejercicios. `gen_session.py` produce `session.json` y `gen_figs.py` los SVG de `sprites/`.
  - `gen/b3d/`: el cuerpo 3D de los ejercicios (ver abajo).
  - `gen/push_src/`: envío de recordatorios con GitHub Actions (`.github/workflows/recordatorios.yml`, secreto `RUTINA_PUSH`).
  - `vendor/`: copias de Geist (OFL), morphdom (MIT) y la licencia de three.js.
  - `herramientas/masc.mjs`: el script que generó `body.glb` (modelo Xbot masculinizado). No hace falta para construir.
  - `pruebas/plato.jpg`: foto de ejemplo para la prueba de comida.

## Construir y publicar

```
cd fuente/gen
python3 build3.py
python3 build_pwa3.py 21        # sube el número en cada versión publicada (cambia la caché del service worker)
cd ../.. && git add -A && git commit && git push   # GitHub Pages publica solo
```

Necesita Python 3 con `uharfbuzz` y `fontTools` (`pip install uharfbuzz fonttools`). Las pruebas usan Node con `playwright` y Chromium.

## Probar

- Servir la app: `python3 -m http.server 8765` en la raíz del repo.
- `node fuente/gen/pwav3.js <carpeta>`: recorre la app en modo claro y oscuro. Pon `plato.jpg` dentro de `<carpeta>`. Si Chromium no está donde lo busca playwright, usa la variable `CHROMIUM`.
- `node fuente/gen/sesshot.js`: capturas de una sesión con los ejercicios 3D.
- Motor 3D: primero `python3 fuente/gen/b3d/preparar.py` (copia el motor y three.js a `b3d/t/`). Después, desde `fuente/gen`:
  - `node b3d/exmetrics.js`: por ejercicio muestra si el cuerpo flota (`flota`), se hunde (`hunde`), si no llega a sus puntos de IK (`ik`), cuánto se mueve (`recorrido`) y la peor separación de un apoyo declarado (`apoyo`). Que flota sea 0, que hunde y apoyo no pasen de unos 2 cm, y que recorrido supere 0.15 m (salvo calistenia corta, como los talones).
  - `node b3d/balance.js`: centro de masa respecto de los apoyos (de pie no debe caer fuera de los pies).
  - `node b3d/exshot.js <lista>`: imágenes de las poses clave en `b3d/exs/`. `node b3d/exgif.js <lista> <N>`: cuadros en `b3d/gif/`.
  - **Revisa siempre las imágenes**, no solo los números: un apoyo mal declarado da números buenos y un cuerpo que flota.

## Cuerpo 3D (`fuente/gen/b3d`)

- `body3d.js`: three.js r170, `body.glb` y RoomEnvironment. En la app, cada `.body3d` con `data-ex="<clave>"` muestra ese ejercicio.
- `exercises.js` define `window.KS_EX`: cada ejercicio tiene poses clave `P({...})` con `p` y `r` de la cadera, `spine`, `head`, `neck`, `sh` y extremidades, sea como `{ik, pole}` o como direcciones `{a, b, w}`.
  - Ejes: y hacia arriba desde el suelo, z hacia adelante, x hacia la izquierda del cuerpo.
  - Opciones: `loop` (`pingpong`, `cycle` con `smooth`, `hold`), `t`, `tempo`, `dwell` (pausa en cada extremo), `view`, `elev`, `focus` (acercar la cámara), `props` (`db`, `wall`, `door`), `mat` y `loads` (músculos que se pintan).
- **Apoyos**: cada pose de suelo declara `touch` (`toes`, `knees`, `hands`, `forearms`, `hips`, `back`, `chest`, `head`, o un hueso con su altura, como `'RightFoot:0.05'`). Un ajuste por Levenberg-Marquardt mueve y gira la cadera para que esos apoyos toquen el suelo. De pie, el ajuste mantiene el centro de masa sobre los pies.
- **`exfit.js` se genera**: después de cambiar `exercises.js` o el solver, corre `python3 b3d/preparar.py`, vacía `b3d/t/exfit.js` (`echo "window.KS_FIT={};" > b3d/t/exfit.js`) y luego `node b3d/bake.js`. Si el ajuste de un ejercicio no coincide con su definición, la app lo recalcula al abrirlo (más lento, pero correcto).
- `edit_ex.py <script.py>` trae `setb(clave, texto)` para reemplazar el bloque entero de un ejercicio.

## Reglas

- Nunca subas claves de API, tokens ni la clave privada VAPID. La clave de IA la pone el usuario en la app y queda solo en su teléfono.
- Los datos del usuario viven en el navegador (`localStorage` `tracker-rutinas-v3` e IndexedDB `rutina`). No rompas su formato sin migrarlo.
- La app nativa (Capacitor/Xcode, carpeta `nativo/`, workflow `app-ios.yml`) quedó abandonada a pedido de Joshen. No la retomes si él no lo pide.
- La marca es keystone, con la esfera cromada plateada (`img/orb-plata.png`, íconos `-plata`). El color de la esfera cambia según la salud (`orb-s1`…`s5`).
- `fuente/canvas/Main.dc.html` es la misma página que el lienzo de diseño en claude.ai.
