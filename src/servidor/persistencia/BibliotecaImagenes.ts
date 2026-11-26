import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { ErrorPersistencia } from './ErrorPersistencia.js';

// SVG queda fuera a propósito: puede contener scripts y se serviría desde el
// mismo origen que el visor.
const EXTENSIONES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp']);

export class BibliotecaImagenes {
  /**
   * Lista las imágenes de la carpeta y sus subcarpetas como rutas relativas con
   * "/" (el formato de campana.json en cualquier sistema), ordenadas.
   * Ignora carpetas y archivos que empiezan por punto.
   */
  async escanear(carpeta: string): Promise<string[]> {
    const imagenes: string[] = [];
    try {
      await recorrer(carpeta, '', imagenes);
    } catch (error) {
      throw new ErrorPersistencia('CARPETA_INVALIDA', `No se pudo leer la carpeta: ${carpeta}`, error);
    }
    return imagenes.sort((a, b) => a.localeCompare(b));
  }

  /** Convierte una ruta relativa de la biblioteca ("mapas/costa.png") en ruta del sistema. */
  rutaAbsoluta(carpeta: string, relativa: string): string {
    return path.join(carpeta, ...relativa.split('/'));
  }
}

async function recorrer(raiz: string, relativa: string, imagenes: string[]): Promise<void> {
  const entradas = await readdir(path.join(raiz, relativa), { withFileTypes: true });
  for (const entrada of entradas) {
    if (entrada.name.startsWith('.')) continue;
    const ruta = relativa === '' ? entrada.name : `${relativa}/${entrada.name}`;
    if (entrada.isDirectory()) {
      await recorrer(raiz, ruta, imagenes);
    } else if (entrada.isFile() && EXTENSIONES.has(path.extname(entrada.name).toLowerCase())) {
      imagenes.push(ruta);
    }
  }
}
