# Guía de uso de Visor mesa D&D

Visor mesa D&D pone el mapa de tu partida en una pantalla (por ejemplo, una tele tumbada sobre la mesa) para
que los jugadores coloquen encima sus miniaturas. Tú, como DM, lo controlas todo desde tu ordenador; la
pantalla de la mesa solo muestra lo que tú decides.

> **¿Prisa?** Lee el [Inicio rápido](#2-inicio-rápido-5-minutos) y vuelve aquí cuando lo necesites.

**Contenido**
1. [Cómo funciona](#1-cómo-funciona)
2. [Inicio rápido (5 minutos)](#2-inicio-rápido-5-minutos)
3. [Las palabras que usa la aplicación](#3-las-palabras-que-usa-la-aplicación)
4. [El panel, de un vistazo](#4-el-panel-de-un-vistazo)
5. [Preparar la campaña](#5-preparar-la-campaña)
6. [Escenarios: regiones y zonas](#6-escenarios-regiones-y-zonas)
7. [Pines: viajar entre escenarios](#7-pines-viajar-entre-escenarios)
8. [Figuras y cartas](#8-figuras-y-cartas)
9. [Durante la partida](#9-durante-la-partida)
10. [La pantalla de los jugadores](#10-la-pantalla-de-los-jugadores)
11. [Problemas y soluciones](#11-problemas-y-soluciones)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Cómo funciona

```
  TU ORDENADOR (DM)                         LA MESA (jugadores)
 ┌──────────────────────┐   misma red    ┌──────────────────────┐
 │  Visor mesa D&D      │   wifi / cable │  Navegador web       │
 │  ─ panel de control  │ ─────────────> │  (tele, portátil,    │
 │  ─ tus imágenes      │                │   tablet, móvil…)    │
 └──────────────────────┘                └──────────────────────┘
   aquí editas y decides                    aquí solo se mira
```

- **Solo tú instalas algo.** La pantalla de la mesa abre una dirección web (`http://…:8080/`) en
  cualquier navegador. Puedes abrirla en varias pantallas a la vez.
- **No hace falta internet**, solo que todos los dispositivos estén en la **misma red** (el mismo
  router o wifi).
- **Todo se guarda solo.** No hay botón de guardar.

---

## 2. Inicio rápido (5 minutos)

1. **Descarga** la aplicación desde la página *Releases* del repositorio:
   - Windows: `visor-mesa-dnd-…-windows-portable.exe` → doble clic.
   - Linux: `visor-mesa-dnd-…-linux-x86_64.AppImage` → `chmod +x` y doble clic.

   La primera vez, Windows puede mostrar dos avisos: *SmartScreen* (pulsa **Más información → Ejecutar
   de todas formas**) y el **firewall** (marca **redes privadas** y pulsa **Permitir**). Ver
   [Problemas y soluciones](#11-problemas-y-soluciones) si algo falla.
2. **Crea una carpeta** para tu campaña (por ejemplo `Documentos/Mi campaña`) y copia dentro tus
   imágenes: mapas, retratos de personajes, objetos.
3. En la aplicación pulsa **Abrir campaña…**, elige esa carpeta y acepta **crear una campaña nueva**.
4. En la **barra de arriba** verás algo como `Visor: http://192.168.1.20:8080/`. Escribe esa dirección
   en el navegador de la pantalla de la mesa y ponlo a pantalla completa (tecla **F11**).
5. En la columna **Biblioteca**, haz clic en un mapa y pulsa **+ Región**. En la columna central pulsa
   **Mostrar** junto a él. **¡Ya se ve en la mesa!**
6. Haz clic en un retrato, pulsa **+ Personaje** y marca **Visible**: aparece encima del mapa.

---

## 3. Las palabras que usa la aplicación

| Palabra | Qué es | Ejemplo |
|---|---|---|
| **Campaña** | Una carpeta con tus imágenes. La aplicación guarda dentro su archivo `campana.json`. | `Mi campaña/` |
| **Biblioteca** | Todas las imágenes de esa carpeta (también las de subcarpetas). | `mapas/bosque.png` |
| **Escenario** | Lo que se ve de fondo en la mesa: un mapa. Hay dos tipos ↓ | |
| **Región** | Escenario "grande" que puede tener **pines** hacia otros lugares. | El mapa del reino |
| **Zona** | Escenario "pequeño", sin pines. | El interior de la taberna |
| **Pin** | Punto brillante sobre una región que lleva a otro escenario. Los jugadores lo ven. | La taberna en el mapa del pueblo |
| **Región inicial** | La región que se muestra al abrir la campaña si no había nada mostrado. | |
| **Figura** | Un retrato que aparece **encima** del mapa. Máximo **4 a la vez**. | Un PNJ, un cofre |
| **Personaje / Objeto** | Los dos tipos de figura. Solo sirven para ordenarlas en tu panel. | |
| **Carta** | Rótulo opcional bajo una figura, con nombre y descripción. | "Marta la Posadera" |
| **Nombre (solo lo ves tú)** | Etiqueta interna de cada escenario o figura. **Nunca** sale en la mesa. | "taberna — noche" |

---

## 4. El panel, de un vistazo

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [Abrir campaña…] [Refrescar biblioteca]  …/Mi campaña   Visor: http://…:8080/  ● │ ← barra
├──────────────────────┬───────────────────────────┬───────────────────────────────┤
│ BIBLIOTECA (12)      │ ESCENARIOS                │  Formulario del elemento      │
│ ┌──┐┌──┐┌──┐┌──┐     │ * Bosque  Región Inicial  │  que hayas seleccionado       │
│ └──┘└──┘└──┘└──┘     │           [Mostrado]      │  (nombre, imagen, cuadrícula, │
│ ┌──┐┌──┐┌──┐         │ * Taberna  Zona [Mostrar] │   pines, carta…)              │
│ └──┘└──┘└──┘         │                           │                               │
│                      │ FIGURAS (máx. 4)          │  ┌─────────────────────┐      │
│ mapas/bosque.png     │ * Marta  En pantalla [x]  │  │ Vista del visor     │      │
│ [+ Zona] [+ Región]  │ * Cofre               [ ] │  │ (lo que ve la mesa) │      │
│ [+ Personaje][+ Obj.]│                           │  └─────────────────────┘      │
└──────────────────────┴───────────────────────────┴───────────────────────────────┘
   1. tus imágenes          2. lo que has creado       3. editar y vista previa
```

- **Barra superior**: abrir otra campaña, volver a leer la carpeta, la dirección para la mesa y el
  estado de la conexión (● verde = todo bien).
- **Columna 1, Biblioteca**: haz clic en una imagen y luego en un botón **+** para crear algo con ella.
- **Columna 2**: tus escenarios y figuras. **Haz clic en el nombre** para editarlo a la derecha.
  - **Mostrar** pone ese escenario en la mesa (el que está en la mesa dice **Mostrado**).
  - **Visible** saca o quita esa figura de la mesa.
- **Columna 3**: el formulario del elemento seleccionado y, debajo, **una copia en pequeño de lo que ve
  la mesa**, para que no tengas que girarte.
- **Avisos**: los errores y avisos aparecen bajo la barra. Se cierran solos o con la **×**.

Los cambios de los formularios se guardan **al salir del campo** (o al pulsar Intro en los campos de una
línea). Si algo no se puede hacer, el panel muestra el motivo y deja el valor como estaba.

---

## 5. Preparar la campaña

### La carpeta
- Una carpeta por campaña. Puedes organizarla con subcarpetas (`mapas/`, `retratos/`, `objetos/`…).
- Formatos admitidos: **png, jpg, jpeg, webp, gif, avif, bmp**. (SVG no.)
- Se ignoran archivos y carpetas cuyo nombre empieza por punto.
- La aplicación crea `campana.json` en la carpeta. **No lo borres**: ahí está todo lo que has creado.
  Para hacer una copia de seguridad, copia la carpeta entera.

### Tamaño recomendado de las imágenes
| Tipo | Tamaño | Consejo |
|---|---|---|
| Mapas | 1920–3000 px de ancho | Más de ~4000 px carga lento y puede ir a tirones en teles o móviles. |
| Retratos y objetos | 800–1000 px de alto | Con **fondo transparente** (png o webp) quedan mucho mejor. |

### Abrir la campaña
1. **Abrir campaña…** → elige la carpeta.
2. Si es nueva, confirma **crear una campaña nueva aquí**.
3. Si añades o cambias imágenes con la aplicación abierta, pulsa **Refrescar biblioteca**.

> La aplicación no recuerda la última campaña: ábrela cada vez que la inicies.

---

## 6. Escenarios: regiones y zonas

### Crear uno
Haz clic en una imagen de la Biblioteca → **+ Región** o **+ Zona**. Aparece en la lista *Escenarios* y
queda seleccionado. **Crear no lo muestra en la mesa**: puedes prepararlo con calma.

### Mostrarlo en la mesa
Pulsa **Mostrar** en la lista, o **Mostrar en el visor** en su formulario. La mesa cambia con una
animación (ver [Pines](#7-pines-viajar-entre-escenarios)).

### El formulario del escenario
| Campo | Para qué |
|---|---|
| **Nombre (solo lo ves tú)** | Para reconocerlo en tu lista. Por defecto, el nombre del archivo. |
| **Tipo** | Región o Zona. Al pasar una región a zona se **pierden sus pines** (te avisa antes). |
| **Imagen** | Cambia el mapa sin perder la cuadrícula ni los pines. |
| **Cuadrícula** | **Visible** la muestra en la mesa. **Celda (px)**: tamaño de cada casilla en píxeles *de la imagen original*. **Desplaz. X / Y**: mueve la cuadrícula para que cuadre con el mapa. |
| **Pines** | Solo en regiones. Ver la sección siguiente. |
| **Marcar como región inicial** | Solo en regiones. |
| **Borrar** | Pide confirmación. También quita los pines de otras regiones que llevaban a él. |

**Ajustar la cuadrícula a un mapa que ya trae casillas:** mide en un editor de imágenes cuántos píxeles
ocupa una casilla del mapa y escríbelo en **Celda**. Luego cambia **Desplaz. X / Y** poco a poco hasta
que las líneas coincidan. Lo verás en la vista previa.

### La región inicial
- La **primera región** que creas pasa a ser la inicial automáticamente.
- Es la que se muestra al abrir la campaña si no había ningún escenario mostrado, y a la que se vuelve
  si borras el escenario que estaba en la mesa.
- Para cambiarla: selecciona otra región → **Marcar como región inicial**.
- No puedes borrar la región inicial (ni pasarla a zona) mientras haya otras regiones: marca antes otra
  como inicial.

---

## 7. Pines: viajar entre escenarios

Un pin es un punto brillante sobre una región que indica "aquí hay otro lugar". Además de servir de
pista a los jugadores, **decide la animación** cuando cambias de escenario.

### Poner un pin
1. Selecciona una **región** (necesitas al menos otro escenario creado).
2. En **Pines**, elige el **Destino del pin nuevo** (el lugar al que lleva).
3. **Haz clic sobre la imagen** donde quieras el pin. Aparece numerado en la imagen y en la lista.

En la lista puedes **cambiar el destino** de cada pin o **quitarlo** con la **×**. Los jugadores ven el
pin aparecer o desvanecerse al momento.

### Qué animación verá la mesa
| Pasas de… a… | Se ve |
|---|---|
| Una región **a un lugar al que apunta uno de sus pines** | Zoom hacia ese pin, como si entraras en él. |
| Un lugar **a una región que tiene un pin hacia él** | Zoom inverso: se aleja desde ese pin, como si salieras. |
| Dos escenarios sin pin entre ellos | Fundido suave. |

**Ejemplo:** el mapa del *Pueblo* (región) tiene un pin sobre la *Taberna* (zona). Al mostrar la Taberna,
la mesa hace zoom hacia ese pin; al volver al Pueblo, se aleja desde él. Así los jugadores sienten que
entran y salen de los sitios.

---

## 8. Figuras y cartas

Las figuras son retratos que aparecen **encima del mapa**, en fila y centrados: PNJ, monstruos, objetos
importantes… Pensadas para presentar a alguien o algo, no para mover fichas (para eso están las minis).

### Crear y mostrar
1. Clic en un retrato de la Biblioteca → **+ Personaje** o **+ Objeto**.
2. Marca **Visible** en la lista para que aparezca en la mesa; desmárcala para quitarla.
3. Pueden verse **4 a la vez como máximo**, en el orden en que las hiciste visibles. Para sacar una
   quinta, oculta antes otra.

Cambiar de escenario **no** quita las figuras: siguen en la mesa hasta que las ocultes.

### La carta
En el formulario de la figura, marca **Mostrar carta bajo el retrato** y escribe:
- **Nombre en la carta**: lo que leerán los jugadores (no tiene por qué coincidir con tu nombre interno:
  puedes llamarla "Desconocido encapuchado" y descubrir su nombre más tarde).
- **Descripción**: opcional. **Intro** hace un salto de línea; se guarda al salir del campo.

En la mesa, el nombre se corta con "…" a partir de 2 líneas y la descripción a partir de 4: mejor textos
breves.

---

## 9. Durante la partida

**Antes de empezar:** abre la aplicación, abre la campaña, abre la dirección en la pantalla de la mesa
(F11) y comprueba que se ve la región inicial.

**En la partida:**
- **Cambiar de lugar** → **Mostrar** en el escenario.
- **Presentar a alguien** → marca **Visible** en su figura. Cuando se vaya, desmárcala.
- **Revelar información** → edita la carta en directo (nombre real, una pista nueva…). La mesa la
  actualiza con un fundido.
- **Combate con casillas** → activa la cuadrícula del escenario.
- **Un lugar nuevo improvisado** → copia la imagen a la carpeta, pulsa **Refrescar biblioteca** y créalo.

Si haces varios cambios muy seguidos, la mesa termina la animación en curso y salta al último: no se
queda "encadenando" animaciones.

**Al terminar:** cierra la aplicación. Todo queda guardado; la próxima vez, abre la misma carpeta.

---

## 10. La pantalla de los jugadores

- Abre la dirección que aparece en la barra del panel (`http://<ip>:8080/`) en el navegador de la
  pantalla. Si aparecen varias, usa la que empieza igual que la red de esa pantalla (normalmente
  `192.168.…`).
- Pulsa **F11** (o la opción de pantalla completa del navegador) y desactiva el apagado automático de
  la pantalla o el salvapantallas.
- Si no hay ningún escenario mostrado, verás **"Esperando al DM"**.
- Si la aplicación se cierra o se corta la red, aparece **"Reconectando…"** en una esquina. Al volver,
  la pantalla se pone al día sola, sin recargar.
- El mapa se ajusta a la pantalla **sin recortarse**: si la proporción no coincide, quedan bandas
  oscuras a los lados.
- Desde esa pantalla no se puede cambiar nada.

---

## 11. Problemas y soluciones

| Problema | Solución |
|---|---|
| Windows dice **"Windows protegió su PC"** | El programa no está firmado. **Más información → Ejecutar de todas formas.** |
| **La mesa no conecta** (la página no carga en otro dispositivo) | 1) Que ambos estén en la **misma wifi/red**. 2) Firewall de Windows: *Seguridad de Windows → Firewall y protección de red → Permitir una aplicación a través del firewall* → marca **Visor mesa DnD** en **Privada**. 3) Que la red de Windows esté como **privada**, no pública. 4) En Linux con `ufw`: `sudo ufw allow 8080/tcp`. 5) Prueba otra de las direcciones de la barra. |
| En el propio ordenador funciona pero en otros no | Es casi siempre el firewall o la red pública (ver arriba). |
| **"El puerto 8080 ya está en uso por otro programa"** al arrancar | Otro programa lo usa (o la aplicación ya está abierta). Ciérralo, o cambia el puerto en `config.json` (ver abajo). |
| Una imagen nueva **no aparece** en la Biblioteca | Pulsa **Refrescar biblioteca**. Comprueba el formato (no SVG) y que el nombre no empiece por punto. |
| Un escenario o figura dice **"Imagen faltante"** | Renombraste, moviste o borraste el archivo. Elige otra imagen en su selector **Imagen**, o devuelve el archivo a su sitio y pulsa **Refrescar biblioteca**. La mesa muestra mientras tanto un fondo rayado o una silueta. |
| He **sustituido una imagen** por otra con el mismo nombre y la mesa sigue igual | Muestra otro escenario y vuelve a mostrar ese (o recarga la página de la mesa). Con una figura: ocúltala y vuelve a mostrarla. |
| **"Ya hay 4 figuras visibles"** | Oculta una antes de mostrar otra. |
| **"Marca otra región como inicial antes de quitar esta"** | Selecciona otra región → **Marcar como región inicial**, y luego borra o cambia la primera. |
| **"La campaña tenía datos incoherentes y se repararon…"** | `campana.json` tenía datos incoherentes (por ejemplo, lo editaste a mano). Se arregló lo posible y el original quedó en `campana.json.bak`. |
| **"campana.json no es válido"** (o *no es JSON válido*) al abrir | `campana.json` está dañado o es de una versión más nueva. No se toca nada y sigue abierta la campaña anterior. Si tienes `campana.json.bak` o una copia, restáurala. |
| **"No se pudo guardar la campaña"** | Suele ser un antivirus o una carpeta sincronizada (OneDrive, Dropbox) bloqueando el archivo. Se reintenta con el siguiente cambio. Mejor guarda las campañas en una carpeta local. |
| Linux: el AppImage **no arranca** y menciona `libfuse` | `sudo apt install libfuse2t64` (Ubuntu 24.04 o posterior) o `sudo apt install libfuse2` (anteriores). |
| La animación **va a tirones** en la tele | Imágenes demasiado grandes: redúcelas a ~2000–3000 px de ancho. |

### Cambiar el puerto
Edita `config.json` y vuelve a abrir la aplicación:
- Windows: pega `%APPDATA%\visor-mesa-dnd` en la barra del Explorador de archivos.
- Linux: `~/.config/visor-mesa-dnd/config.json`.

```json
{ "puerto": 8081 }
```
La dirección de la mesa pasará a terminar en `:8081`.

---

## 12. Preguntas frecuentes

**¿Necesito internet?** No. Solo una red local (el router de casa vale aunque no tenga internet).

**¿Los jugadores tienen que instalar algo?** No, solo abrir la dirección en un navegador.

**¿Puedo tener varias pantallas?** Sí: abre la misma dirección en todas. Todas muestran lo mismo.

**¿Dónde se guarda todo?** En `campana.json`, dentro de la carpeta de la campaña. Las imágenes siguen
siendo tuyas y no se modifican.

**¿Puedo mover o copiar la campaña a otro ordenador?** Sí: copia la carpeta entera y ábrela allí con
**Abrir campaña…**.

**¿Puedo tener varias campañas?** Sí, una carpeta para cada una. Solo hay una abierta a la vez.

**¿Puedo usar la misma imagen para varias cosas?** Sí, por ejemplo el mismo mapa como región de día y
de noche con distintos pines o cuadrícula.

**¿Los jugadores ven los nombres de mi lista?** No. Solo ven el mapa, la cuadrícula, los pines, los
retratos y las cartas.

**¿Se puede deshacer?** No hay botón de deshacer. Borrar pide confirmación; para lo demás, vuelve a
cambiar el valor.
