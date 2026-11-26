import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validarEstructura } from '../../servidor/persistencia/estructuraCampana.js';

function valida(): Record<string, unknown> {
  return {
    version: 1,
    regionInicialId: 'r1',
    escenarioActivoId: null,
    figurasVisibles: ['f1'],
    escenarios: [
      {
        id: 'r1',
        tipo: 'region',
        nombre: 'Costa',
        imagen: 'mapas/costa.png',
        cuadricula: { visible: false, tamanoCelda: 70, desplazamientoX: 0, desplazamientoY: 0 },
        pines: [{ x: 0.5, y: 0.5, destinoId: 'r1' }],
      },
    ],
    figuras: [
      {
        id: 'f1',
        tipo: 'personaje',
        nombre: 'Posadero',
        imagen: 'pnj/posadero.png',
        carta: { nombre: 'Durnan', descripcion: 'Posadero.' },
      },
    ],
  };
}

const corrupta = (detalle: RegExp) => ({ codigo: 'CAMPANA_CORRUPTA', message: detalle });

describe('Estructura de campana.json', () => {
  test('acepta una campaña bien formada y devuelve solo los campos conocidos', () => {
    const json = { ...valida(), campoDesconocido: 42 };
    const { campoDesconocido, ...esperado } = json;
    assert.deepEqual(validarEstructura(json), esperado);
  });

  test('no comprueba reglas del dominio (eso lo repara el modelo)', () => {
    // El pin apunta a su propio escenario y la región inicial no existe: estructura válida.
    const json = { ...valida(), regionInicialId: 'no-existe' };
    assert.doesNotThrow(() => validarEstructura(json));
  });

  test('rechaza lo que no es un objeto', () => {
    for (const json of [null, [], 'texto', 3]) {
      assert.throws(() => validarEstructura(json), corrupta(/no es un objeto/));
    }
  });

  test('rechaza versiones distintas de 1, incluidas las superiores', () => {
    for (const version of [2, 0, '1', undefined]) {
      assert.throws(() => validarEstructura({ ...valida(), version }), corrupta(/versión no soportada/));
    }
  });

  test('rechaza listas ausentes o que no son listas', () => {
    for (const campo of ['escenarios', 'figuras', 'figurasVisibles']) {
      assert.throws(
        () => validarEstructura({ ...valida(), [campo]: undefined }),
        corrupta(new RegExp(`${campo} no es una lista`)),
      );
    }
  });

  test('señala el primer elemento con estructura incorrecta', () => {
    const json = valida();
    const escenario = (json.escenarios as Record<string, unknown>[])[0]!;
    json.escenarios = [escenario, { ...escenario, tipo: 'mazmorra' }];
    assert.throws(() => validarEstructura(json), corrupta(/escenarios\[1\]/));
  });

  test('rechaza campos con tipo incorrecto en escenarios, pines, figuras y cartas', () => {
    const casos: [string, (json: Record<string, any>) => void][] = [
      ['escenarios', (j) => (j.escenarios[0].cuadricula.tamanoCelda = '70')],
      ['escenarios', (j) => (j.escenarios[0].cuadricula = null)],
      ['escenarios', (j) => (j.escenarios[0].pines[0].x = null)],
      ['escenarios', (j) => delete j.escenarios[0].imagen],
      ['figuras', (j) => (j.figuras[0].tipo = 'zona')],
      ['figuras', (j) => (j.figuras[0].carta = { nombre: 'Durnan' })],
      ['figuras', (j) => delete j.figuras[0].carta],
      ['figurasVisibles', (j) => (j.figurasVisibles = [1])],
    ];
    for (const [campo, romper] of casos) {
      const json = valida();
      romper(json);
      assert.throws(() => validarEstructura(json), corrupta(new RegExp(`${campo}\\[0\\]`)), romper.toString());
    }
  });

  test('rechaza ids de región inicial o escenario activo que no son texto ni null', () => {
    assert.throws(() => validarEstructura({ ...valida(), regionInicialId: 3 }), corrupta(/regionInicialId/));
    assert.throws(() => validarEstructura({ ...valida(), escenarioActivoId: undefined }), corrupta(/escenarioActivoId/));
  });
});
