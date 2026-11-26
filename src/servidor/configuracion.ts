import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface Configuracion {
  puerto: number;
}

const POR_DEFECTO: Configuracion = { puerto: 8080 };

/**
 * Lee config.json de la carpeta de datos de la aplicación. Si no existe, lo
 * crea con los valores por defecto para que el DM sepa dónde cambiar el puerto.
 */
export async function leerConfiguracion(
  carpetaDatos: string,
): Promise<{ configuracion: Configuracion; ruta: string }> {
  const ruta = path.join(carpetaDatos, 'config.json');
  let texto: string;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch {
    await mkdir(carpetaDatos, { recursive: true });
    await writeFile(ruta, `${JSON.stringify(POR_DEFECTO, null, 2)}\n`, 'utf8');
    return { configuracion: { ...POR_DEFECTO }, ruta };
  }
  try {
    const { puerto } = JSON.parse(texto.replace(/^﻿/, '')) as Partial<Configuracion>;
    if (Number.isInteger(puerto) && puerto! >= 1 && puerto! <= 65535) {
      return { configuracion: { puerto: puerto! }, ruta };
    }
  } catch {
    // Cae al aviso de abajo.
  }
  console.warn(`${ruta} no es válido; se usa el puerto ${POR_DEFECTO.puerto}.`);
  return { configuracion: { ...POR_DEFECTO }, ruta };
}
