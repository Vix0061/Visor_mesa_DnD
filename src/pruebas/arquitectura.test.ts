// Comprueba la regla de capas leyendo los `import` del código fuente: cada
// capa del servidor importa solo de sí misma, de su vecina inferior y de
// compartido; los clientes, solo de sí mismos y de compartido.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const SRC = path.join(import.meta.dirname, '..', '..', 'src');

const PERMITIDAS: Record<string, string[]> = {
  'servidor/transporte': ['servidor/transporte', 'servidor/controlador', 'compartido'],
  'servidor/controlador': ['servidor/controlador', 'servidor/modelo', 'compartido'],
  'servidor/modelo': ['servidor/modelo', 'servidor/persistencia', 'compartido'],
  'servidor/persistencia': ['servidor/persistencia', 'compartido'],
  panel: ['panel', 'compartido'],
  visor: ['visor', 'compartido'],
  compartido: ['compartido'],
};

function archivosTs(carpeta: string): string[] {
  return readdirSync(path.join(SRC, carpeta), { recursive: true, encoding: 'utf8' })
    .filter((archivo) => archivo.endsWith('.ts'))
    .map((archivo) => path.join(SRC, carpeta, archivo));
}

/** La entrada de PERMITIDAS a la que pertenece un archivo, o null si es otro (p. ej. principal.ts). */
function grupoDe(archivo: string): string | null {
  const relativa = path.relative(SRC, archivo).split(path.sep).join('/');
  return Object.keys(PERMITIDAS).find((grupo) => relativa.startsWith(`${grupo}/`)) ?? null;
}

describe('Arquitectura', () => {
  for (const [grupo, permitidas] of Object.entries(PERMITIDAS)) {
    test(`${grupo} solo importa de: ${permitidas.join(', ')}`, () => {
      for (const archivo of archivosTs(grupo)) {
        const fuente = readFileSync(archivo, 'utf8');
        for (const [, especificador] of fuente.matchAll(/from\s+'(\.[^']+)'/g)) {
          const destino = grupoDe(path.resolve(path.dirname(archivo), especificador!));
          assert.ok(
            destino !== null && permitidas.includes(destino),
            `${path.relative(SRC, archivo)} importa '${especificador}' (${destino ?? 'fuera de las capas'})`,
          );
        }
      }
    });
  }

  test('compartido solo declara tipos (se compila también para el navegador)', () => {
    for (const archivo of archivosTs('compartido')) {
      const fuente = readFileSync(archivo, 'utf8');
      assert.doesNotMatch(fuente, /^export\s+(const|let|function|class)\b/m, path.relative(SRC, archivo));
    }
  });
});
