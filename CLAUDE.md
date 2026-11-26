# Mesa D&D: estado del proyecto y guía para continuar

Documento de traspaso entre sesiones. Recoge la especificación, todas las decisiones aprobadas por el
usuario, el estado de cada fase y lo que falta. **Léelo entero antes de tocar código.** Lo que no esté
aquí y no se deduzca del código, pregúntalo al usuario antes de decidirlo.

---

## 1. Estado actual (actualízalo al cerrar cada fase)

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Esqueleto: package.json, tsconfigs, scripts, ventana vacía | ✅ Confirmada |
| 1 | Modelo y sus tests | ✅ Confirmada |
| 2 | Persistencia: carga con reparación, escritura atómica, debounce, escaneo | ✅ Confirmada |
| 3 | Sesión, controlador y transporte (HTTP + WS) | ✅ Confirmada |
| 4 | Visor sin animaciones | ✅ Confirmada |
| 5 | Panel básico | ✅ Confirmada (Windows y Linux/Ubuntu) |
| 6 | Editor de pines, cambio de tipo con aviso, región inicial, imagen faltante | ✅ Confirmada (Windows y Linux/Ubuntu) |
| 7a | Animaciones de la capa de escenario y precarga de sus imágenes | ✅ Confirmada |
| 7b | Animaciones de la capa de figuras (entrada, salida, FLIP, cambio de carta/imagen) | ✅ Confirmada |
| 8 | Empaquetado y README | ⏳ **Entregada, pendiente de confirmación** (portable de Windows probado; AppImage lo construye el usuario en Ubuntu) |

**Siguiente paso:** que el usuario construya el AppImage en Ubuntu, lo suba a la release `v0.1.0` y
confirme la fase 8. Con eso el plan queda completo.
`npm test` debe dar `tests 73, pass 73, fail 0`.
El proyecto está en GitHub (repositorio privado `mesa-dnd`, rama `main`).

---

## 2. Forma de trabajar (pedida por el usuario; respetarla siempre)

- El usuario escribe en español; responder en español.
- **Una fase por respuesta.** Al terminar, esperar su confirmación antes de la siguiente.
- **Respetar el plan aprobado.** Cualquier desviación se explica y se pide aprobación *antes* de aplicarla
  (si es inevitable para avanzar, aplicarla y marcarla claramente al final como "necesito tu visto bueno").
- **No pegar archivos completos en el chat**: el usuario los tiene en disco. Señalar los fragmentos clave y
  explicar brevemente por qué están así.
- Cada entrega de fase incluye: (1) qué se construye y qué queda pendiente; (2) archivos nuevos/modificados
  con fragmentos clave; (3) cómo ejecutar y probar en Windows y en Linux; (4) qué debe verse/pasar para dar
  la fase por buena. Terminar listando los puntos que necesitan su visto bueno.
- Código mínimo y directo: nada que la fase actual no necesite (KISS, YAGNI).
- Al usar una librería o API nueva, explicar brevemente qué hace y por qué.
- Comentarios solo donde una decisión no sea obvia. Identificadores en español, **sin "ñ"** (`campana`,
  `tamanoCelda`).
- **Tests: solo unitarios del modelo y de las validaciones, con `node:test`.** (Además existe
  `arquitectura.test.ts`, aprobado en el plan.) El resto se verifica a mano/con scripts.
- Verificar de verdad antes de dar algo por hecho (compilar, tests, lanzar la app, capturas del visor).

---

## 3. La aplicación (especificación resumida)

App cliente-servidor para mostrar escenarios de D&D en una pantalla sobre la que se colocan minis físicas.
La usa un DM en una red local.

- **Panel del DM**: app Electron que también ejecuta el servidor (HTTP + WebSocket). GUI para editar la
  campaña y controlar qué se muestra, más una vista integrada (iframe) del visor real. Es el único que
  modifica el estado.
- **Visor (jugadores)**: página web abierta desde cualquier dispositivo de la LAN. Solo muestra el estado;
  no envía acciones.
- **Campaña** = una carpeta con las imágenes del DM y `campana.json`. Solo una abierta a la vez; al abrir
  otra se reemplaza el estado y se envía el estado completo a todos los visores. Rutas de imagen relativas
  a la carpeta, siempre con `/`. Guardado automático con debounce (500 ms) y escritura atómica
  (temporal + renombrar).
- **Biblioteca**: las imágenes de la carpeta (png, jpg, jpeg, webp, gif, avif, bmp; **SVG excluido**),
  escaneo recursivo ignorando lo que empieza por punto. Se escanea al abrir y con el botón "Refrescar".
- **Escenario** (`zona` | `region`): imagen de fondo, `cuadricula` {visible, tamanoCelda (px de la imagen
  original), desplazamientoX, desplazamientoY}. Solo las regiones tienen **pines** (x, y en 0..1 +
  destinoId hacia otro escenario, incluidas regiones). Los pines son visibles para los jugadores y dirigen
  la animación al cambiar de escenario.
- **Figura** (`personaje` | `objeto`, sin diferencias de atributos; el tipo solo organiza el panel),
  `carta` opcional {nombre, descripcion}. **Máximo 4 visibles**, validado en el servidor; se muestran en
  orden de activación. Cambiar de escenario no altera su visibilidad. La visibilidad es estado, no evento.
- No se permite cambiar entre clases (figura ↔ escenario). Cambiar zona ↔ región sí; al pasar a zona se
  descartan los pines (el panel avisa antes).
- Una imagen puede usarse en varias entidades. Se puede borrar cualquier entidad.
- **Fuera de alcance** (el modelo no debe impedirlos): preview de un escenario desde su pin; posición de
  figuras elegida por el DM; calibración física de la cuadrícula; reabrir la última campaña al arrancar.

### Reglas de región inicial y escenario activo (aprobadas)
- La primera región que se crea en una campaña sin regiones pasa a ser la inicial (también si una zona
  pasa a región sin haber inicial). Invariante: `regionInicialId === null` ⇔ no hay regiones.
- La región inicial no se puede borrar (ni pasar a zona) mientras existan otras regiones sin marcar antes
  otra como inicial → `REGION_INICIAL_REQUERIDA`. Si es la única región, sí se puede.
- Crear un escenario **no** lo activa.
- Si se borra el escenario activo, se vuelve a la región inicial (o a ninguno si no hay).
- Sin regiones no hay escenario activo por defecto, pero el DM puede activar una zona a mano.
- Al cargar: si no hay escenario activo guardado, se activa la región inicial (no cuenta como reparación).
- Marcar como inicial una zona → `NO_ENCONTRADO` ("no existe una región con ese id").
- Sin escenario activo, el visor muestra una pantalla de espera ("Esperando al DM"); las figuras
  visibles siguen encima.

---

## 4. Stack y entorno

- TypeScript 7 en todo el proyecto, **ESM** (`"type": "module"`). Electron 45. Node 26 LTS.
- Dependencia de ejecución: `ws`. Desarrollo: `electron`, `typescript`, `@types/node`, `@types/ws`
  y `electron-builder` (fase 8). Sin empaquetador: `tsc` emite módulos ES que el
  navegador carga directamente (comprobado que funciona desde `file://` en la ventana del panel).
- Scripts npm: `compilar` (limpiar + tsc ×3 + copiar html/css), `start` (compilar + electron .),
  `test` (compilar + `node --test "dist/pruebas/**/*.test.js"`). Multiplataforma: nada de comandos propios
  de un sistema; rutas con `path.join`.
- Servidor en todas las interfaces, puerto en `config.json` de `app.getPath('userData')`
  (`%APPDATA%\mesa-dnd\` / `~/.config/mesa-dnd/`), 8080 por defecto. Puerto ocupado → diálogo con la ruta
  del config y salir.
- Al arrancar imprime las URLs IPv4 de la LAN. En desarrollo (`!app.isPackaged`) imprime también el token
  del panel.

### Notas del entorno de desarrollo (Windows del usuario)
- Node se instaló con winget en `C:\Program Files\nodejs`. En la sesión de Claude puede no estar en el
  PATH: anteponer `$env:Path = "$env:ProgramFiles\nodejs;$env:Path"` en PowerShell.
- Electron 45 descarga su binario en la primera ejecución (no en `npm install`).
- **PowerShell 5.1: no usar `Get-Content -Raw` + `Set-Content` para reescribir archivos del proyecto**:
  lee UTF-8 sin BOM como ANSI y rompe los acentos. Usar las herramientas de edición.
- `app.whenReady().then(...)`, **no** `await` de nivel superior en `principal.ts`: con await la app se
  cuelga sin abrir ventana.

---

## 5. Arquitectura

MVC en capas estrictas y lineales; cada capa habla solo con sus vecinas inmediatas.

```
PANEL (ventana Electron, sin Node)         VISOR (navegador)
Vistas ↔ ControladorPanel ↔ ConexionPanel   Capas ↔ ControladorVisor ↔ ConexionVisor
            │ WebSocket /ws?rol=panel&token=…          │ WebSocket /ws?rol=visor + HTTP
SERVIDOR (proceso principal de Electron)
Transporte ↔ Controlador ↔ Modelo ↔ Persistencia
```

- **Difusión por valor de retorno** (no Observer): cada acción del panel devuelve una
  `Respuesta { alEmisor?, aPaneles?, aVisores? }` que el transporte reparte.
- **Única excepción aprobada (callback hacia arriba)**: el fallo del guardado diferido. Sube de vecina en
  vecina: cada capa asigna la propiedad `alFallarGuardado` de su vecina inferior y traduce el error
  (`ErrorPersistencia` → `ErrorDominio` → `Respuesta` a los paneles). En los clientes, el controlador asigna
  `alRecibir`/`alCambiarEstado` en su conexión (los mensajes llegan desde abajo).
- `principal.ts` es la raíz de composición (construye de abajo arriba) y no es una capa.
- El panel no tiene Node (contextIsolation, sin nodeIntegration, sandbox) y solo importa de `src/panel` y
  `src/compartido`. `src/compartido` contiene **solo tipos**.
- `src/pruebas/arquitectura.test.ts` lee los `import` y falla si una capa importa de algo que no sea ella
  misma, su vecina inferior o `compartido`.
- POO para capas y entidades; DTOs simples para mensajes; composición sobre herencia.

### Estructura actual
```
package.json  tsconfig.base.json  CLAUDE.md  README.md  .gitignore  .gitattributes
scripts/  limpiar.mjs  copiar-estaticos.mjs
          probar-servidor.mjs  demo-visor.mjs  cliente-ws.mjs   (desarrollo; ver §9)
          preparar-linux.sh   (desarrollo en Linux; ver §9)
src/
  compartido/   modelo.ts (DTOs = formato de campana.json, CambiosEscenario/CambiosFigura)
                mensajes.ts (todos los mensajes WS)  errores.ts (CodigoError)
  servidor/     principal.ts  precarga.cts (CommonJS, expone elegirCarpeta)  configuracion.ts  tsconfig.json
    transporte/   ServidorHttp.ts  ServidorWs.ts  red.ts
    controlador/  ControladorCampana.ts  validacionMensajes.ts  proyecciones.ts
    modelo/       SesionCampana.ts  Campana.ts  Escenario.ts  Figura.ts  Pin.ts
                  CartaPresentacion.ts  ErrorDominio.ts
    persistencia/ RepositorioCampana.ts  GuardadoDiferido.ts  BibliotecaImagenes.ts
                  estructuraCampana.ts  ErrorPersistencia.ts
  visor/        index.html  visor.css  principal.ts  ConexionVisor.ts  ControladorVisor.ts  tsconfig.json
    vista/        CapaEscenario.ts  Lienzo.ts  CapaFiguras.ts  TarjetaFigura.ts
                  IndicadorConexion.ts  urlImagen.ts  transiciones.ts
  panel/        index.html  panel.css  principal.ts  ConexionPanel.ts  ControladorPanel.ts  tsconfig.json
    vista/        VistaPanel.ts (raíz; EstadoPanel, AccionesPanel, Seleccion)  BarraCampana.ts
                  VistaBiblioteca.ts  ListaEntidades.ts  FormularioEscenario.ts  FormularioFigura.ts
                  EditorPines.ts  Avisos.ts  Dialogo.ts  dom.ts
  pruebas/      arquitectura.test.ts
    modelo/       figuras.test.ts  escenarios.test.ts  carga.test.ts  sesion.test.ts
    persistencia/ estructuraCampana.test.ts
    controlador/  validacionMensajes.test.ts
```
Los tests viven en `src/pruebas` (aprobado) y los compila el tsconfig del servidor.

---

## 6. Decisiones aprobadas por capa

### Modelo
- `visible` **no** está en Figura: `Campana.figurasVisibles: string[]` (orden de activación, máx. 4).
  El panel recibe `visible` ya derivado en cada figura.
- Escenario y Figura tienen `nombre` **privado** (etiqueta del panel; por defecto el nombre del archivo
  sin extensión). Nunca llega al visor; lo público es la carta.
- Ids con `randomUUID()`.
- **Validaciones de rango en el modelo** (porque campana.json no pasa por el controlador):
  pin x,y finitos en [0,1] → `PIN_INVALIDO`; `tamanoCelda` finito > 0 y desplazamientos finitos
  (cualquier valor, también negativos) → `CUADRICULA_INVALIDA`. Pin hacia sí mismo, en una zona o hacia un
  destino inexistente → `PIN_INVALIDO`.
- Cada regla se escribe una vez como función "problema o null" (`problemaDePin`, `problemaDeCuadricula`):
  las operaciones la convierten en error y la carga la usa como filtro.
- Todas las operaciones validan antes de mutar (atómicas).
- **Carga con reparación** (`Campana.desdeDto` devuelve `{ campana, reparaciones: string[] }`, en texto
  legible): ids repetidos (gana el primero), cuadrícula inválida → por defecto, pines inválidos
  descartados, región inicial inválida → primera región, escenario activo inexistente → región inicial,
  figuras visibles inexistentes/repetidas/sobrantes (más de 4) descartadas. **No es silenciosa.**
- `SesionCampana` es la única pieza del modelo que habla con la persistencia. `modificar(cambio)` es el
  único camino para cambiar la campaña y programa el guardado. `abrir(carpeta, crear)`:
  vuelca lo pendiente → carga → si no hay `campana.json` y `!crear` → `CAMPANA_INEXISTENTE` sin escanear
  ni crear nada → si hubo reparaciones, copia el original a `campana.json.bak` (una sola copia,
  sobrescrita) antes de cualquier guardado → escanea → si era nueva, programa el guardado. Si algo falla,
  sigue abierta la campaña anterior.
- Crear una entidad o cambiarle la imagen exige que esté en la biblioteca → `IMAGEN_INVALIDA`.

### Persistencia
- `estructuraCampana.ts` valida solo forma y tipos (estricta: un campo ausente es estructura rota) →
  `CAMPANA_CORRUPTA` señalando el primer elemento incorrecto. Versión ≠ 1 → `CAMPANA_CORRUPTA`.
- `RepositorioCampana`: no guarda estado (recibe la carpeta). Quita el BOM antes de parsear. Escritura en
  `campana.json.tmp` + `rename` con hasta 5 reintentos ante EPERM/EBUSY/EACCES; borra el temporal si falla.
  Carpeta inexistente → `CARPETA_INVALIDA`.
- `GuardadoDiferido`: recibe una copia del DTO en cada cambio y escribe solo la última; encadena escrituras;
  `volcar()` al cerrar la app o cambiar de campaña.
- `ErrorPersistencia` propio (CARPETA_INVALIDA, CAMPANA_CORRUPTA, GUARDADO_FALLIDO); `SesionCampana` lo
  traduce a `ErrorDominio`.

### Controlador
- `validacionMensajes.ts`: solo forma y tipos → `MENSAJE_INVALIDO`. Construye objetos nuevos con solo los
  campos conocidos. Los valores de `tipo` dependen de la entidad (impide cambiar de clase).
- Acciones en cola, de una en una (abrir es asíncrono).
- Al visor solo se envía la capa que cambió (compara proyecciones antes/después).
- `conectar()`: rol `visor` → estado; rol `panel` exige origen local **y** token correcto; si no, se
  rechaza al conectar (`NO_AUTORIZADO`, cierre 4001). Rol ausente/desconocido → rechazado
  (`MENSAJE_INVALIDO`). Un visor que envía una acción recibe `NO_AUTORIZADO`.
- `avisoReparaciones` se envía solo al panel que abrió la campaña.

### Transporte
- HTTP: `/` y archivos `.html/.js/.css/.map` de `dist/visor`; `/imagenes/<ruta>` **solo si la ruta está en
  el último escaneo** (sin rutas que sanear; una imagen nueva no se sirve hasta "Refrescar"). Imágenes con
  `Cache-Control: no-cache` + `Last-Modified` (304 con `If-Modified-Since`).
- WS en `/ws` sobre el mismo servidor HTTP, `maxPayload` 1 MB. Locales: `127.0.0.1`, `::1`,
  `::ffff:127.0.0.1`. `infoServidor` lo genera el transporte (conoce IPs y puerto).
- **Token por arranque** (`randomBytes(24)`), pasado al panel en la query de su URL junto con el puerto
  (`loadFile(..., { query: { puerto, token } })`). No se usa la cabecera Origin.

### Visor (fase 4)
- `Lienzo` = un escenario dibujado (img + SVG de cuadrícula + pines) en una caja con la proporción de la
  imagen (`aspect-ratio` y `width: min(100vw, 100vh * ancho / alto)` con variables CSS `--ancho/--alto`).
  `CapaEscenario` decide cuál se muestra; mismo id → `actualizar()` sin rehacer.
- Cuadrícula: un `<path>` en píxeles de la imagen (`viewBox`), `vector-effect: non-scaling-stroke`; no se
  dibuja si saldrían más de 2000 líneas.
- `CapaFiguras` reconcilia por id; `TarjetaFigura` = retrato + carta. Huecos fijos 22vw × 40vh; la carta
  cuelga bajo el retrato con `position: absolute` para que la fila se centre por los retratos.
- Imagen faltante: lienzo con fondo rayado neutro; retrato con silueta CSS.
- Reconexión: 1 s, 2 s… hasta 5 s; indicador "Reconectando…". Al reconectar llega el estado completo y se
  reconcilia sin reiniciar lo que hay en pantalla.
- CSP estricta (`'self'`, `ws:`); estilos dinámicos con `style.setProperty`; texto con `textContent`;
  fuentes del sistema (la LAN puede no tener internet).

### Panel (fase 5)
- IPC único `elegir-carpeta` (`ipcMain.handle` en `principal.ts`); `precarga.cts` lo expone como
  `window.nativo.elegirCarpeta()` (`import electron = require('electron')`, obligatorio en CJS con
  `verbatimModuleSyntax`). `principal.ts` del panel se lo pasa al controlador como función.
- `ControladorPanel` guarda `EstadoPanel` (último estado recibido + selección) y llama a
  `VistaPanel.dibujar(estado)` tras **cada** mensaje, también tras un error (así se deshace en los
  controles lo que el servidor rechazó). Las vistas reciben `AccionesPanel { enviar, abrirCampana,
  seleccionar }`; los mensajes de `compartido` los construyen las propias vistas.
- Estructura de la página fija en `index.html` (incluidos los formularios); las vistas la buscan por
  `name`/`data-campo` y solo generan dinámicamente listas, rejilla y avisos.
- Formularios: cada campo se envía en `change` (al salir del campo o con Intro). `ponerValor` no pisa un
  control con el foco salvo al cambiar de entidad. Número vacío (NaN) → no se envía y se restaura; el
  rango lo valida el servidor.
- Tras `crearEscenario`/`crearFigura`, la entidad nueva queda seleccionada (se detecta el id nuevo en el
  siguiente `estadoPanel`). Cambiar de carpeta limpia la selección.
- `VistaBiblioteca` solo rehace la rejilla si cambia la referencia de la lista (`biblioteca`).
- Confirmaciones con `<dialog>` propio (**no** `window.confirm`: en Electron/Windows deja los inputs sin
  foco). Se piden para borrar y para crear campaña en una carpeta sin `campana.json`.
- Avisos: errores se cierran solos a los 8 s; reparaciones quedan hasta cerrarlas; máx. 4 a la vez.
- Sin reconexión en el panel (el servidor vive en el mismo proceso): si se cierra, se avisa.
- **Riesgo aceptado por el usuario**: GUI sin framework; puede complicarse si crece.
- Aprobado: confirmación al borrar. Distribución aprobada (fase 6): 3 columnas (biblioteca | entidades |
  detalle) con el **formulario arriba** y la vista del visor **debajo y pequeña** (máx. 400 px de ancho),
  para que el formulario de una región con pines se vea entero sin desplazarse a 1280×800.
- La descripción de la carta es un `<textarea>`: Intro = salto de línea; se envía solo al salir (`change`).

### Panel (fase 6)
- `EditorPines` aislado (pedido por el usuario), sin dependencias nuevas: solo conoce su `<fieldset>` y
  entrega la lista **completa** nueva de pines por el callback del constructor (`alCambiar`);
  `FormularioEscenario` la envía como `actualizarEscenario {pines}`. Clic sobre la imagen → pin hacia el
  "Destino del pin nuevo" elegido, coordenadas 0..1 con 4 decimales. Cada pin de la lista: cambiar
  destino o quitar. Marcadores numerados como la lista. Destinos: todos los demás escenarios.
  Sin redibujo si no cambian pines/destinos (firma JSON), salvo tras enviar (para deshacer un rechazo).
- Cambio de tipo: región → zona con pines pide confirmación ("se descartarán sus N pines"); cancelar
  restaura el selector. Zona → región y personaje ↔ objeto no descartan nada → sin aviso. La regla de la
  región inicial la valida el servidor (`REGION_INICIAL_REQUERIDA`) y se muestra como error.
- Borrar un escenario avisa de los escenarios cuyos pines llevan a él (se quitan con él, lo hace el modelo).
- Botón "Marcar como región inicial" (solo en regiones; desactivado en la inicial).
- Imagen faltante: etiqueta en la lista, opción "(imagen faltante)" en el selector, aviso bajo el
  selector y lámina rayada en el editor de pines (se pueden poner pines igualmente).
- Aprobado: retoque en el visor (fase 4) → `.carta p { white-space: pre-line }` para que
  los saltos de línea de la descripción se vean.
- Ajuste pedido por el usuario (nombres largos se salían de la carta): en el visor, `.carta h2/p` con
  `overflow-wrap: anywhere` y corte con "…" (`line-clamp`) a **2 líneas el nombre y 4 la descripción**;
  en el panel, `.formulario h2` parte palabras largas (las filas de las listas ya usaban elipsis).

---

### Visor (fase 7a, capa de escenario)
- La fase 7 se dividió (previsto en el plan): 7a = capa de escenario, 7b = capa de figuras.
- `CapaEscenario` guarda solo el último objetivo y procesa en serie (`#procesar`): si llegan cambios durante
  una transición, al acabar salta directamente al último.
- Mismo id **y misma imagen** → `Lienzo.actualizar()` (sin rehacer; la reconexión no anima nada). Otra
  imagen o otro id → lienzo nuevo: `preparar()` hace `img.decode()` antes de insertarlo (si falla, fondo
  rayado) y luego la transición; el saliente se quita al acabar. El `Lienzo` ya no cambia de imagen.
- `transiciones.ts`: `fundidoCruzado` (700 ms), `zoomHaciaPin` (saliente escala ×3,5 con
  `transform-origin` en el pin y se funde; el entrante entra a 1,06→1), `zoomDesdePin` (el entrante parte
  ×3,5 sobre su pin), `aparecer`/`desvanecer` (pines y cuadrícula, 400 ms). Solo `transform`/`opacity`.
  `aparecer`/`desvanecer` cancelan antes las animaciones del elemento (un `fill: 'forwards'` anterior
  seguiría aplicándose).
- Pines reconciliados por posición `"x,y"` (no tienen id): cambiar solo el destino no anima nada.
- Aprobado por el usuario: duraciones (fundido 0,7 s, zoom ~1,2 s, ×3,5) y que un cambio del mismo
  escenario durante una transición espere a que acabe.
- La pantalla de espera queda siempre debajo y se funde con una transición CSS de `opacity`.
  `.capa-escenario` tiene `overflow: hidden` por el zoom.

### Visor (fase 7b, capa de figuras)
- `CapaFiguras` procesa en serie con el último objetivo, igual que la capa de escenario.
- Precarga: las tarjetas nuevas se crean y `preparar()` (`img.decode()`) antes de tocar la fila; si la
  imagen falla, silueta. Una imagen cambiada se precarga mientras se sigue viendo la anterior.
- FLIP: se miden las tarjetas antes del cambio; las que salen pasan a `.figura.saliendo`
  (`position: absolute` con left/top medidos) para que la fila se recoloque mientras se desvanecen
  (opacidad + escala 0,85, 400 ms); las nuevas entran subiendo 4vh con fundido (500 ms); las que siguen
  parten de su posición anterior con `translate` (450 ms). Desplazamientos < 0,5 px no se animan.
- Cambio de carta o de imagen (`TarjetaFigura.actualizar`): fundido de 180 ms de salida y de entrada de
  la carta o del retrato; la carta cuelga fuera del flujo, así que la fila no se mueve. Sin cambios
  (p. ej. al reconectar) no anima nada.
- Aprobado por el usuario: duraciones de la 7b y que un cambio durante una animación espere a que acabe.

### Empaquetado (fase 8)
- `electron-builder` 26, configurado en `package.json` → `build`: `productName` **"Mesa DnD"** (el AppImage
  rechaza "&" en el nombre de archivo; los títulos de ventana siguen siendo "Mesa D&D" porque salen del HTML),
  `files` = `dist/**/*` sin `dist/pruebas` + `package.json` (las dependencias de producción, solo `ws`,
  las añade él solo). Salida en `paquetes/` (ignorada por git). Icono por defecto de Electron.
- `npm run empaquetar` (compilar + `electron-builder`): en Windows → `portable`
  (`mesa-dnd-<v>-windows-portable.exe`), en Linux → `AppImage` (`mesa-dnd-<v>-linux-<arch>.AppImage`).
- userData sigue siendo `mesa-dnd` (el `name` del package.json), también empaquetado: comprobado.
- npm 11 avisa de que `electron-winstaller` tiene un script de instalación sin aprobar: no se usa
  (es para el instalador Squirrel), se ignora.
- Publicado como release `v0.1.0` en GitHub (`gh release`).

## 7. Mensajes WebSocket (definición exacta en `src/compartido/mensajes.ts`)

- **Panel → servidor**: `abrirCampana {carpeta, crear?}`, `refrescarBiblioteca`,
  `crearEscenario {imagen, tipoEscenario}`, `crearFigura {imagen, tipoFigura}`,
  `actualizarEscenario {id, cambios}`, `actualizarFigura {id, cambios}` (carta: null la quita),
  `borrarEscenario`, `borrarFigura`, `activarEscenario`, `marcarRegionInicial` `{id}`,
  `cambiarVisibilidadFigura {id, visible}`. (Al crear, el tipo viaja como `tipoEscenario`/`tipoFigura`
  porque `tipo` es el discriminante.)
- **Servidor → panel**: `infoServidor {urls}`, `estadoPanel {carpeta, campana}` (campaña completa, con
  `visible` en cada figura), `biblioteca {imagenes}`, `avisoReparaciones {reparaciones}`,
  `error {codigo, mensaje}`.
- **Servidor → visor** (solo lo público): `estado {escenario, figuras}` (al conectar y al abrir campaña),
  `escenarioActivo {escenario}`, `figurasVisibles {figuras}`. `EscenarioPublico {id, imagen, cuadricula,
  pines}`, `FiguraPublica {id, imagen, carta}`.
- Códigos de error: NO_AUTORIZADO, MENSAJE_INVALIDO, SIN_CAMPANA, NO_ENCONTRADO, LIMITE_FIGURAS,
  REGION_INICIAL_REQUERIDA, PIN_INVALIDO, CUADRICULA_INVALIDA, IMAGEN_INVALIDA, CARPETA_INVALIDA,
  CAMPANA_INEXISTENTE, CAMPANA_CORRUPTA, GUARDADO_FALLIDO.
- Sin id de petición ni acuse: el panel no es optimista; se redibuja desde el estado recibido.

---

## 8. Lo que falta (compromisos aprobados por fase)

### Fase 7 — Animaciones (dividida: 7a capa de escenario y 7b capa de figuras; ver §6)
- CSS / Web Animations API sobre `transform` y `opacity` únicamente. Las animaciones son exclusivas de la
  vista del cliente; el servidor no envía nada sobre animación: el visor deduce la transición comparando lo
  que tiene en pantalla con lo que llega.
- **Precargar** toda imagen con `img.decode()` antes de mostrarla.
- Cada capa procesa sus cambios en serie y guarda solo el último objetivo: **si llegan cambios durante una
  animación, gana el último** y se saltan los intermedios.
- Capa de escenario:
  | Cambio | Transición |
  |---|---|
  | Otro id y el anterior tiene un pin hacia el nuevo | Zoom del saliente hacia el pin + fundido; el entrante aparece con un leve ajuste de escala |
  | Otro id y el nuevo tiene un pin hacia el anterior | Zoom inverso: el entrante parte ampliado sobre el pin y se aleja |
  | Otro id sin pin que los una, o desde/hacia "sin escenario" | Fundido cruzado |
  | Mismo id, cambia `cuadricula.visible` | Fundido de la cuadrícula |
  | Mismo id, cambia tamaño/desplazamiento | Actualización directa |
  | Mismo id, cambian los pines | Pin nuevo aparece con escala+opacidad; el eliminado se desvanece |
  | Mismo id, cambia la imagen | Fundido cruzado |
  Si ambos se apuntan, gana el zoom de entrada; varios pines al mismo destino → el primero. La pantalla de
  espera es el fondo permanente bajo los lienzos (habrá dos lienzos a la vez durante la transición).
- Capa de figuras: entrada (precarga, opacidad + desplazamiento) y salida (opacidad + escala) animadas; la
  fila se reacomoda con **FLIP**; cambio de carta/imagen → fundido breve sin mover la fila; nunca se
  reinicia al cambiar de escenario.
- `scripts/demo-visor.mjs` recorre todos estos casos para verlos.

### Fase 8 — Empaquetado y README (hecha; ver §6 "Empaquetado")
- `electron-builder`: **Windows portable** y **AppImage**, cada uno construido en su propio sistema.
- `dist/pruebas` debe quedar **fuera** del paquete.
- README: permiso del firewall de Windows (permitir en redes privadas; si la red está marcada como pública
  o se deniega, los visores no conectan; el portable puede volver a pedirlo si se mueve), dónde cambiar el
  puerto (`config.json` en userData), tamaño de imagen recomendado, SmartScreen (ejecutable sin firmar),
  FUSE para AppImage.

---

## 9. Cómo verificar

- **Linux (desarrollo)**: tras clonar, `bash scripts/preparar-linux.sh` (aprobado por el usuario): si falta Node ≥ 26
  lo instala (curl por apt si falta, nvm en ~/.nvm, `nvm install 26`), `npm install`, descarga el binario de Electron (`node node_modules/electron/install.js`),
  pone SUID de root a `chrome-sandbox` (sin eso Ubuntu 24.04+ no arranca Electron sin empaquetar) y pasa
  los tests. Repetirlo si cambian las dependencias. Luego `git pull && npm start`.
- `npm test` → 73 tests (modelo, carga/reparación, sesión, estructura de campana.json, validación de
  mensajes, arquitectura).
- `npm start` imprime URLs y token (en desarrollo). Con la app en marcha:
  - `node scripts/probar-servidor.mjs <token> <carpeta-de-prueba>` → 31 comprobaciones de servidor
    (autorización, límite de 4, mensajes inválidos, HTTP, panel desde la IP de la LAN rechazado).
  - `node scripts/demo-visor.mjs <token> <carpeta-de-prueba> [ms]` → monta entidades con prefijo `demo:` y
    recorre 23 pasos (todas las transiciones de escenario y de figuras de la fase 7); abrir el visor en `http://127.0.0.1:8080/` para verlo.
  - Usar siempre carpetas de prueba (los scripts crean entidades).
- Estos scripts son de desarrollo; se podrán borrar cuando el panel cubra lo mismo (preguntar al usuario).
- Verificación visual automatizada usada en la fase 4 (los scripts estaban en un scratchpad temporal y se
  perdieron; recrearlos si hace falta): lanzar Edge headless
  (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe --headless=new --remote-debugging-port=N
  --user-data-dir=<perfil único por ejecución> --window-size=1280,720`), conectarse por CDP
  (`/json/list` → `webSocketDebuggerUrl`), `Page.navigate`, `Page.captureScreenshot` y `Runtime.evaluate`
  para leer el DOM, mientras corre `demo-visor.mjs`. Edge headless impone ~490 px de ancho mínimo.
  Cerrar con `Browser.close` (matar el proceso deja hijos que bloquean el perfil). Para la ventana del
  panel: lanzar Electron con `--remote-debugging-port` y lo mismo por CDP.
- Verificación del panel (fase 5, 26 comprobaciones; scripts también en un scratchpad temporal):
  `electron --inspect=9229 --remote-debugging-port=9333 .`; el diálogo nativo se sustituye **solo en la
  prueba** desde el inspector del proceso principal:
  `process._linkedBinding('electron_browser_dialog').showOpenDialog = () => Promise.resolve({canceled:false, filePaths:[carpeta]})`;
  luego se pulsan botones y se leen el DOM y capturas por CDP del panel (`file://…/panel/index.html`).
  Imágenes de prueba: PNG generados con `zlib` (sin dependencias).
- Fase 6 (21 comprobaciones): clics reales con `Input.dispatchMouseEvent` sobre la imagen del editor,
  teclas reales con `Input.dispatchKeyEvent`/`Input.insertText`, y `Network.webSocketFrameSent` para
  contar lo que envía el panel. Captura del visor con Edge headless contra `http://127.0.0.1:8080/`.
- Fase 7a: Edge headless en el visor sondeando cada 80 ms `getAnimations()` de cada `.lienzo`, sus pines
  y su cuadrícula (keyframes, `transform-origin`), mientras corre `demo-visor.mjs` con 2500 ms por paso;
  más una captura a mitad de cada transición. Carpeta de prueba: solo `mapas/` y `retratos/`.
- Fase 8: el portable lanzado con `--remote-debugging-port=9333` (los argumentos llegan a Electron):
  visor y sus módulos servidos desde el asar, WS de visor, panel conectado con `window.nativo`, campaña
  abierta por WS (token leído de la URL del panel por CDP) e imagen servida.
- Fase 7b: igual, sondeando `getAnimations({ subtree: true })` de cada `.figura` (clase `saliendo`,
  keyframes de entrada/salida/FLIP, fundidos de carta y retrato) y su posición en reposo.

---

## 10. Riesgos y casos límite aprobados

Casos límite (resueltos con la opción más simple):
1. Imagen faltante: el panel la marca; activarla no se bloquea; el visor muestra fondo neutro / silueta.
2. `campana.json` ilegible o versión superior: se rechaza (`CAMPANA_CORRUPTA`), no se toca el archivo,
   sigue la campaña anterior.
3. Datos incoherentes o rangos inválidos: se reparan al cargar, se avisa al panel y se respalda en `.bak`.
4. Cambios durante una animación: gana el último.
5. Subcarpetas: escaneo recursivo, ignorando lo que empieza por punto.
6. Puerto ocupado: diálogo de error y cierre.
7. Reconexión del visor: 1–5 s, estado completo al volver, indicador discreto.
8. Guardado fallido: aviso a los paneles; se reintenta en el siguiente cambio.
9. Cierre o cambio de campaña con guardado pendiente: se vuelca antes (verificado).
10. Región → zona: se descartan los pines con aviso; si es la inicial, misma regla que al borrar.
11. Pin hacia el propio escenario: rechazado.
12. Borrar una figura visible: sale de la lista y el visor anima su salida.
13. Zonas sin regiones: sin escenario activo por defecto; el DM puede activar una zona.
14. Varios paneles locales: permitidos sin tratamiento especial.

Riesgos: renombrado bloqueado en Windows por antivirus/sincronización (reintentos; campañas en
OneDrive/Dropbox pueden dar conflictos); imágenes muy grandes (>~4000 px) en televisores y móviles durante
el zoom; navegadores antiguos de TV (requieren módulos ES, WAAPI, `img.decode()`); firewall de Windows;
varias IP (VPN/VM: se muestran todas); GUI del panel sin framework si crece; biblioteca enorme en el panel
(miniaturas = imágenes reales con carga diferida); SmartScreen y FUSE en el empaquetado; una imagen
reemplazada con el mismo nombre no se ve hasta volver a mostrarla.

**Mantener este archivo al día al cerrar cada fase** (tabla del §1, decisiones nuevas, pendientes).
