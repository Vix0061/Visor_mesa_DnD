// Script de precarga de la ventana del panel. Es CommonJS (.cts -> .cjs)
// porque la ventana tiene sandbox y Electron no admite precargas ESM en ese
// modo. Expone una única función: el diálogo nativo para elegir carpeta.
import electron = require('electron');

electron.contextBridge.exposeInMainWorld('nativo', {
  elegirCarpeta: (): Promise<string | null> => electron.ipcRenderer.invoke('elegir-carpeta'),
});
