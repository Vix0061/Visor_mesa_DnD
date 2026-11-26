# Visor mesa D&D

Muestra escenarios de D&D en una pantalla (por ejemplo, una tele tumbada sobre la mesa) sobre la que se
colocan las minis físicas. El DM lo controla todo desde su ordenador; la pantalla de los jugadores es un
navegador en la misma red local.

- **Panel del DM**: la aplicación. Abre una campaña, crea escenarios (regiones con pines y zonas) y
  figuras con carta de presentación, y decide qué se ve.
- **Visor**: una página web (`http://<ip-del-DM>:8080/`) que se abre en la tele, un móvil o cualquier
  navegador de la red. Solo muestra; no se puede tocar nada desde ahí.

**¿Primera vez?** Lee la [Guía de uso](GUIA.md): inicio rápido en 5 minutos, todo el panel explicado y
soluciones a los problemas habituales.

## Descarga

En la página [Releases](../../releases) del repositorio:

| Sistema | Archivo | Cómo abrirlo |
|---|---|---|
| Windows | `visor-mesa-dnd-<versión>-windows-portable.exe` | Doble clic. No se instala. |
| Linux | `visor-mesa-dnd-<versión>-linux-x86_64.AppImage` | `chmod +x visor-mesa-dnd-*.AppImage` y doble clic (o `./visor-mesa-dnd-*.AppImage`). |

Solo el DM necesita la aplicación. Los jugadores solo necesitan un navegador.

### Avisos la primera vez

- **Windows SmartScreen** ("Windows protegió su PC"): el ejecutable no está firmado. Pulsa
  *Más información* → *Ejecutar de todas formas*.
- **Firewall de Windows**: al arrancar pide permiso porque la aplicación escucha en la red. **Permítelo en
  redes privadas.** Si lo deniegas, o si tu red está marcada como *pública*, los visores de otros
  dispositivos no podrán conectar (en el propio ordenador sí). Si mueves el `.exe` a otra carpeta, Windows
  puede volver a preguntar. Para revisarlo: *Seguridad de Windows → Firewall y protección de red →
  Permitir una aplicación a través del firewall*.
- **Linux (AppImage)**: necesita FUSE. Si no arranca y menciona `libfuse`, instálalo
  (`sudo apt install libfuse2` en Ubuntu; en Ubuntu 24.04 o superior, `sudo apt install libfuse2t64`).
  Si tienes el cortafuegos `ufw` activo: `sudo ufw allow 8080/tcp`.

## Uso

1. Crea una carpeta para la campaña y pon dentro las imágenes (mapas, retratos, objetos). Puede tener
   subcarpetas. Formatos: png, jpg, jpeg, webp, gif, avif y bmp.
2. Abre la aplicación y pulsa **Abrir campaña** con esa carpeta. Si no tiene campaña, te ofrece crearla:
   se guarda en `campana.json` dentro de la misma carpeta (guardado automático).
3. En la barra superior aparecen las direcciones del visor (`http://192.168.x.x:8080/`). Ábrela en la
   pantalla de la mesa.
4. Elige una imagen de la biblioteca y crea una **región** (puede tener pines hacia otros escenarios),
   una **zona**, un **personaje** o un **objeto**. Con **Mostrar** cambias el escenario del visor y con
   **Visible** muestras hasta 4 figuras a la vez.

Si añades imágenes a la carpeta con la aplicación abierta, pulsa **Refrescar**.

### Tamaño de las imágenes

Para mapas, entre **1920 y 3000 px** de ancho es suficiente para una tele 1080p o 4K. Imágenes mucho
mayores (más de ~4000 px) tardan más en cargar y pueden ir a tirones durante el zoom en televisores o
móviles modestos. Para retratos y objetos bastan unos 800–1000 px de alto; un fondo transparente (png o
webp) queda mejor.

### Cambiar el puerto

Por defecto es el **8080**. Si está ocupado, la aplicación avisa y se cierra. Para cambiarlo, edita
`config.json` (se crea al arrancar por primera vez) y vuelve a abrir la aplicación:

- Windows: `%APPDATA%\visor-mesa-dnd\config.json`
- Linux: `~/.config/visor-mesa-dnd/config.json`

```json
{ "puerto": 8080 }
```

## Desarrollo

Necesita **Node 26**.

```
npm install
npm start        # compila y abre la aplicación (imprime el token del panel para los scripts)
npm test         # tests unitarios del modelo y de las validaciones
```

- En Linux, tras clonar: `bash scripts/preparar-linux.sh` (instala Node 26 con nvm si falta, las
  dependencias y ajusta el sandbox de Electron). Ejecútalo **sin** `sudo`.
- Los scripts de prueba (`demo-visor.mjs`, que recorre todas las transiciones del visor, y
  `probar-servidor.mjs`) están en la rama `herramientas-prueba`.
- `CLAUDE.md` recoge la especificación, la arquitectura y las decisiones del proyecto.

### Empaquetar

```
npm run empaquetar
```

Genera en `paquetes/` el portable de Windows (si se ejecuta en Windows) o el AppImage (si se ejecuta en
Linux). Cada uno se construye en su propio sistema.
