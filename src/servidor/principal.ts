// Raíz de composición del proceso principal de Electron: construye las capas
// de abajo hacia arriba (persistencia -> modelo -> controlador -> transporte),
// arranca el servidor y abre la ventana del panel.
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { leerConfiguracion } from './configuracion.js';
import { ControladorCampana } from './controlador/ControladorCampana.js';
import { SesionCampana } from './modelo/SesionCampana.js';
import { BibliotecaImagenes } from './persistencia/BibliotecaImagenes.js';
import { GuardadoDiferido } from './persistencia/GuardadoDiferido.js';
import { RepositorioCampana } from './persistencia/RepositorioCampana.js';
import { urlsDelVisor } from './transporte/red.js';
import { ServidorHttp } from './transporte/ServidorHttp.js';
import { ServidorWs } from './transporte/ServidorWs.js';

const CARPETA_DIST = path.join(import.meta.dirname, '..');

async function iniciar(): Promise<void> {
  const { configuracion, ruta: rutaConfiguracion } = await leerConfiguracion(app.getPath('userData'));
  const { puerto } = configuracion;
  // Nuevo en cada arranque. Solo lo conoce la ventana del panel, así una página
  // web abierta en este mismo equipo no puede conectarse como panel.
  const token = randomBytes(24).toString('hex');

  const repositorio = new RepositorioCampana();
  const sesion = new SesionCampana(repositorio, new BibliotecaImagenes(), new GuardadoDiferido(repositorio));
  const controlador = new ControladorCampana(sesion, token);
  const http = new ServidorHttp(controlador, path.join(CARPETA_DIST, 'visor'));
  const urls = urlsDelVisor(puerto);
  new ServidorWs(http, controlador, urls);

  try {
    await http.escuchar(puerto);
  } catch (error) {
    const ocupado = (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
    dialog.showErrorBox(
      'No se pudo iniciar el servidor',
      (ocupado ? `El puerto ${puerto} ya está en uso por otro programa.` : String(error)) +
        `\n\nPuedes cambiar el puerto en:\n${rutaConfiguracion}`,
    );
    app.exit(1);
    return;
  }
  console.log(`Visor disponible en:\n  ${urls.join('\n  ')}`);
  if (!app.isPackaged) console.log(`Token del panel (solo en desarrollo): ${token}`);

  // Antes de salir se vuelca el guardado pendiente.
  let cerrando = false;
  app.on('before-quit', (evento) => {
    if (cerrando) return;
    cerrando = true;
    evento.preventDefault();
    void controlador.cerrar().finally(() => app.quit());
  });

  // Único IPC de la app: el panel no tiene Node y el diálogo de carpeta es
  // nativo. La ruta elegida vuelve al panel, que la envía por WS en abrirCampana.
  ipcMain.handle('elegir-carpeta', async (evento) => {
    const ventana = BrowserWindow.fromWebContents(evento.sender);
    const opciones = { title: 'Abrir carpeta de campaña', properties: ['openDirectory' as const] };
    const resultado = ventana ? await dialog.showOpenDialog(ventana, opciones) : await dialog.showOpenDialog(opciones);
    return resultado.canceled ? null : (resultado.filePaths[0] ?? null);
  });

  crearVentanaPanel(puerto, token);
}

function crearVentanaPanel(puerto: number, token: string): void {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Visor mesa D&D - Panel del DM',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(CARPETA_DIST, 'servidor', 'precarga.cjs'),
    },
  });
  void ventana.loadFile(path.join(CARPETA_DIST, 'panel', 'index.html'), {
    query: { puerto: String(puerto), token },
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

// Sin `await` de nivel superior: Electron no emite `ready` hasta que el módulo
// principal termina de evaluarse, así que esperarlo aquí bloquearía el arranque.
void app.whenReady().then(iniciar);
