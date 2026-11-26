import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { ControladorCampana } from '../controlador/ControladorCampana.js';

const TIPOS_CONTENIDO: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
};
const PREFIJO_IMAGENES = '/imagenes/';

/** Sirve los archivos del visor y, bajo /imagenes/, las imágenes de la campaña. */
export class ServidorHttp {
  readonly servidor: Server;
  readonly #controlador: ControladorCampana;
  readonly #carpetaVisor: string;

  constructor(controlador: ControladorCampana, carpetaVisor: string) {
    this.#controlador = controlador;
    this.#carpetaVisor = path.resolve(carpetaVisor);
    this.servidor = createServer((peticion, respuesta) => void this.#atender(peticion, respuesta));
  }

  /** Escucha en todas las interfaces. Rechaza si el puerto está ocupado. */
  escuchar(puerto: number): Promise<void> {
    return new Promise((resolver, rechazar) => {
      this.servidor.once('error', rechazar);
      this.servidor.listen(puerto, () => {
        this.servidor.off('error', rechazar);
        resolver();
      });
    });
  }

  async #atender(peticion: IncomingMessage, respuesta: ServerResponse): Promise<void> {
    if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
      return terminar(respuesta, 405);
    }
    const ruta = decodificar(new URL(peticion.url ?? '/', 'http://localhost').pathname);
    let archivo: string | null = null;
    if (ruta?.startsWith(PREFIJO_IMAGENES)) {
      archivo = this.#controlador.rutaDeImagen(ruta.slice(PREFIJO_IMAGENES.length));
    } else if (ruta !== null) {
      archivo = this.#archivoDelVisor(ruta);
    }
    if (archivo === null) return terminar(respuesta, 404);
    await enviarArchivo(peticion, respuesta, archivo);
  }

  #archivoDelVisor(ruta: string): string | null {
    const absoluta = path.resolve(this.#carpetaVisor, '.' + (ruta === '/' ? '/index.html' : ruta));
    const dentro = absoluta.startsWith(this.#carpetaVisor + path.sep);
    const extension = path.extname(absoluta);
    // Solo archivos propios del visor: nada de imágenes ni rutas fuera de su carpeta.
    return dentro && ['.html', '.js', '.css', '.map'].includes(extension) ? absoluta : null;
  }
}

async function enviarArchivo(peticion: IncomingMessage, respuesta: ServerResponse, archivo: string): Promise<void> {
  const info = await stat(archivo).catch(() => null);
  if (!info?.isFile()) return terminar(respuesta, 404);

  // no-cache + Last-Modified: el navegador guarda la imagen pero pregunta si
  // cambió, así un archivo reemplazado con el mismo nombre se actualiza.
  const modificado = info.mtime.toUTCString();
  if (peticion.headers['if-modified-since'] === modificado) return terminar(respuesta, 304);

  respuesta.writeHead(200, {
    'Content-Type': TIPOS_CONTENIDO[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Last-Modified': modificado,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  if (peticion.method === 'HEAD') return void respuesta.end();
  // Si el cliente corta la descarga, pipeline rechaza: no hay nada que hacer.
  await pipeline(createReadStream(archivo), respuesta).catch(() => {});
}

function terminar(respuesta: ServerResponse, estado: number): void {
  respuesta.writeHead(estado).end();
}

function decodificar(ruta: string): string | null {
  try {
    return decodeURIComponent(ruta);
  } catch {
    return null;
  }
}
