import { copyFile, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import type { CampanaDto } from '../../compartido/modelo.js';
import { ErrorPersistencia } from './ErrorPersistencia.js';
import { validarEstructura } from './estructuraCampana.js';

export const NOMBRE_ARCHIVO = 'campana.json';

// En Windows, un antivirus o un cliente de sincronización puede tener el
// archivo abierto un instante y hacer fallar el renombrado.
const ERRORES_TRANSITORIOS = new Set(['EPERM', 'EBUSY', 'EACCES']);
const INTENTOS_RENOMBRADO = 5;

export class RepositorioCampana {
  /** Devuelve null si la carpeta no tiene campana.json (campaña nueva). */
  async cargar(carpeta: string): Promise<CampanaDto | null> {
    await comprobarCarpeta(carpeta);
    let texto: string;
    try {
      texto = await readFile(path.join(carpeta, NOMBRE_ARCHIVO), 'utf8');
    } catch (error) {
      if (codigoDeSistema(error) === 'ENOENT') return null;
      throw new ErrorPersistencia('CAMPANA_CORRUPTA', `No se pudo leer ${NOMBRE_ARCHIVO}.`, error);
    }
    let json: unknown;
    try {
      // El Bloc de notas de Windows puede guardar con BOM, que JSON.parse rechaza.
      json = JSON.parse(texto.replace(/^﻿/, ''));
    } catch (error) {
      throw new ErrorPersistencia('CAMPANA_CORRUPTA', `${NOMBRE_ARCHIVO} no es JSON válido.`, error);
    }
    return validarEstructura(json);
  }

  /** Copia campana.json a campana.json.bak, sobrescribiendo la copia anterior. */
  async respaldar(carpeta: string): Promise<void> {
    const original = path.join(carpeta, NOMBRE_ARCHIVO);
    try {
      await copyFile(original, `${original}.bak`);
    } catch (error) {
      throw new ErrorPersistencia(
        'GUARDADO_FALLIDO',
        `No se pudo crear la copia de seguridad ${NOMBRE_ARCHIVO}.bak.`,
        error,
      );
    }
  }

  /** Escritura atómica: temporal en la misma carpeta y renombrado encima. */
  async guardar(carpeta: string, campana: CampanaDto): Promise<void> {
    const destino = path.join(carpeta, NOMBRE_ARCHIVO);
    const temporal = `${destino}.tmp`;
    try {
      await writeFile(temporal, `${JSON.stringify(campana, null, 2)}\n`, 'utf8');
      await renombrarConReintentos(temporal, destino);
    } catch (error) {
      await rm(temporal, { force: true }).catch(() => {});
      throw new ErrorPersistencia('GUARDADO_FALLIDO', `No se pudo guardar ${NOMBRE_ARCHIVO}.`, error);
    }
  }
}

async function comprobarCarpeta(carpeta: string): Promise<void> {
  const info = await stat(carpeta).catch(() => null);
  if (!info?.isDirectory()) {
    throw new ErrorPersistencia('CARPETA_INVALIDA', `La carpeta no existe: ${carpeta}`);
  }
}

async function renombrarConReintentos(origen: string, destino: string): Promise<void> {
  for (let intento = 1; ; intento++) {
    try {
      await rename(origen, destino);
      return;
    } catch (error) {
      const transitorio = ERRORES_TRANSITORIOS.has(codigoDeSistema(error) ?? '');
      if (!transitorio || intento === INTENTOS_RENOMBRADO) throw error;
      await esperar(100 * intento);
    }
  }
}

function codigoDeSistema(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | null)?.code;
}
