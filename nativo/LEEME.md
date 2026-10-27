# keystone · app para iPhone

La app nativa abre keystone desde https://joshen-am.github.io/rutina/ y guarda una copia para usarla sin internet.
Cada cambio que se publica en la web llega solo a la app la próxima vez que la abras. Solo hay que reinstalar
para renovar la firma gratis de Apple (cada 7 días), y eso lo hace el Mac solo.

## Primera vez (unos 15 minutos)

1. **Instala Xcode** desde la App Store del Mac y ábrelo una vez para que termine de instalar sus componentes.
2. En Xcode: **Xcode → Settings → Accounts → +** y entra con tu Apple ID.
3. Abre `ios/App/App.xcodeproj` (doble clic).
4. En el panel izquierdo elige **App**, luego la pestaña **Signing & Capabilities**:
   - **Team:** elige tu nombre (Personal Team).
   - Si dice que el *Bundle Identifier* ya existe, cámbialo por algo tuyo, por ejemplo `cl.joshen.keystone2`.
5. Conecta el iPhone por cable. En el iPhone acepta **Confiar en este computador**.
6. Arriba en Xcode elige tu iPhone como destino y aprieta **▶︎**. La primera vez descarga Capacitor; tarda un par de minutos.
7. En el iPhone:
   - **Ajustes → Privacidad y seguridad → Modo de desarrollador → activar** (se reinicia).
   - **Ajustes → General → VPN y gestión de dispositivos →** tu Apple ID **→ Confiar**.
8. Vuelve a apretar **▶︎** en Xcode. keystone se abre en el iPhone.
9. Para no necesitar el cable: **Window → Devices and Simulators**, elige tu iPhone y marca **Connect via network**.

## Renovación automática

En la Terminal, dentro de esta carpeta:

```
bash instalar-renovacion.sh
```

Desde ahí el Mac revisa a las 9:00 y a las 20:00, y cuando pasaron 5 días renueva keystone por Wi-Fi.
Te avisa con una notificación del Mac si se renovó o si algo falló. Para que funcione:
el Mac encendido (o que despierte después), el iPhone en el mismo Wi-Fi y, de preferencia, desbloqueado.

Para renovar a mano en cualquier momento: `bash renovar.sh --ahora` (o abrir Xcode y apretar ▶︎).
El registro queda en `renovar.log`.

## Pasar tus datos

La app nativa guarda sus datos aparte de la versión de Safari. Para traerlos:

1. En la versión de Safari: **Ajustes → Tus datos → Exportar respaldo** y guárdalo en Archivos.
2. En la app nativa: **Ajustes → Tus datos → Restaurar respaldo** y elige ese archivo.

Las fotos de comida y la clave de IA no viajan en el respaldo: vuelve a poner la clave en **Ajustes → IA**.

## Recordatorios

En la app nativa los recordatorios son locales: **Ajustes → Recordatorios → Activar notificaciones**.
No necesitan GitHub ni internet, y se reprograman solos cuando cambias un horario.

## Qué hay en esta carpeta

- `ios/` · el proyecto de Xcode (Capacitor 8).
- `www/sin-conexion.html` · lo que se ve si la app se abre sin internet antes de haber cargado una vez.
- `capacitor.config.json` · la dirección que carga la app y sus ajustes.
- `renovar.sh`, `instalar-renovacion.sh` · la renovación semanal.
- `node_modules/@capacitor/local-notifications` · el módulo de notificaciones que usa Xcode.
