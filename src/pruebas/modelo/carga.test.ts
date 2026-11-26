import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { CampanaDto, EscenarioDto, FiguraDto } from '../../compartido/modelo.js';
import { Campana } from '../../servidor/modelo/Campana.js';

const cuadricula = { visible: true, tamanoCelda: 70, desplazamientoX: 0, desplazamientoY: 0 };

function escenario(id: string, tipo: 'zona' | 'region', extra: Partial<EscenarioDto> = {}): EscenarioDto {
  return { id, tipo, nombre: id, imagen: `${id}.png`, cuadricula, pines: [], ...extra };
}

function figura(id: string): FiguraDto {
  return { id, tipo: 'personaje', nombre: id, imagen: `${id}.png`, carta: null };
}

function campana(extra: Partial<CampanaDto>): CampanaDto {
  return {
    version: 1,
    escenarios: [],
    figuras: [],
    regionInicialId: null,
    escenarioActivoId: null,
    figurasVisibles: [],
    ...extra,
  };
}

function cargar(dto: CampanaDto): { cargada: CampanaDto; reparaciones: string[] } {
  const { campana: resultado, reparaciones } = Campana.desdeDto(dto);
  return { cargada: resultado.aDto(), reparaciones };
}

/** Comprueba que haya exactamente `cantidad` reparaciones y que cada patrón aparezca en alguna. */
function comprobarReparaciones(reparaciones: string[], cantidad: number, ...patrones: RegExp[]): void {
  assert.equal(reparaciones.length, cantidad, reparaciones.join('\n'));
  for (const patron of patrones) {
    assert.ok(reparaciones.some((r) => patron.test(r)), `falta ${patron} en:\n${reparaciones.join('\n')}`);
  }
}

describe('Carga desde campana.json (reparación)', () => {
  test('un archivo coherente se carga sin cambios ni reparaciones', () => {
    const dto = campana({
      escenarios: [
        escenario('r1', 'region', { pines: [{ x: 0.2, y: 0.8, destinoId: 'z1' }] }),
        escenario('z1', 'zona'),
      ],
      figuras: [figura('f1'), figura('f2')],
      regionInicialId: 'r1',
      escenarioActivoId: 'z1',
      figurasVisibles: ['f2', 'f1'],
    });
    const { cargada, reparaciones } = cargar(dto);
    assert.deepEqual(cargada, dto);
    assert.deepEqual(reparaciones, []);
  });

  test('sin escenario activo guardado se activa la región inicial, sin contar como reparación', () => {
    const { cargada, reparaciones } = cargar(
      campana({ escenarios: [escenario('r1', 'region')], regionInicialId: 'r1' }),
    );
    assert.equal(cargada.escenarioActivoId, 'r1');
    assert.deepEqual(reparaciones, []);
  });

  test('un escenario activo inexistente pasa a la región inicial', () => {
    const { cargada, reparaciones } = cargar(
      campana({ escenarios: [escenario('r1', 'region')], regionInicialId: 'r1', escenarioActivoId: 'borrado' }),
    );
    assert.equal(cargada.escenarioActivoId, 'r1');
    comprobarReparaciones(reparaciones, 1, /escenario activo guardado no existe/);
  });

  test('una región inicial inexistente, que es zona o ausente pasa a la primera región', () => {
    const escenarios = [escenario('z1', 'zona'), escenario('r1', 'region'), escenario('r2', 'region')];
    for (const regionInicialId of ['z1', 'x', null]) {
      const { cargada, reparaciones } = cargar(campana({ escenarios, regionInicialId }));
      assert.equal(cargada.regionInicialId, 'r1');
      comprobarReparaciones(reparaciones, 1, /ahora es "r1"/);
    }
  });

  test('sin regiones queda sin región inicial ni escenario activo', () => {
    const { cargada, reparaciones } = cargar(
      campana({ escenarios: [escenario('z1', 'zona')], regionInicialId: 'z1' }),
    );
    assert.equal(cargada.regionInicialId, null);
    assert.equal(cargada.escenarioActivoId, null);
    comprobarReparaciones(reparaciones, 1, /queda sin región inicial/);
  });

  test('las figuras visibles se recortan a 4, sin repetidas ni inexistentes', () => {
    const figuras = ['a', 'b', 'c', 'd', 'e'].map(figura);
    const { cargada, reparaciones } = cargar(
      campana({ figuras, figurasVisibles: ['b', 'x', 'b', 'a', 'c', 'e', 'd'] }),
    );
    assert.deepEqual(cargada.figurasVisibles, ['b', 'a', 'c', 'e']);
    comprobarReparaciones(
      reparaciones,
      3,
      /figura visible que no existe \(id x\)/,
      /"b" aparecía repetida/,
      /Se ocultó "d": ya había 4/,
    );
  });

  test('se descartan pines fuera de rango, hacia sí mismo, rotos o en zonas', () => {
    const dto = campana({
      escenarios: [
        escenario('r1', 'region', {
          pines: [
            { x: 0.5, y: 0.5, destinoId: 'z1' },
            { x: 1.5, y: 0.5, destinoId: 'z1' },
            { x: 0.5, y: Infinity, destinoId: 'z1' },
            { x: 0.5, y: 0.5, destinoId: 'r1' },
            { x: 0.5, y: 0.5, destinoId: 'borrado' },
          ],
        }),
        escenario('z1', 'zona', { pines: [{ x: 0.5, y: 0.5, destinoId: 'r1' }] }),
      ],
      regionInicialId: 'r1',
    });
    const { cargada, reparaciones } = cargar(dto);
    assert.deepEqual(cargada.escenarios[0]!.pines, [{ x: 0.5, y: 0.5, destinoId: 'z1' }]);
    assert.deepEqual(cargada.escenarios[1]!.pines, []);
    comprobarReparaciones(
      reparaciones,
      5,
      /Escenario "r1": se descartó un pin\. Las coordenadas/,
      /Escenario "r1": se descartó un pin\. Un pin no puede apuntar a su propio/,
      /Escenario "r1": se descartó un pin\. El destino del pin no existe/,
      /Escenario "z1": se descartó un pin\. Solo las regiones/,
    );
  });

  test('una cuadrícula fuera de rango vuelve a la de por defecto', () => {
    const dto = campana({
      escenarios: [
        escenario('z1', 'zona', { cuadricula: { ...cuadricula, tamanoCelda: 0 } }),
        escenario('z2', 'zona', { cuadricula: { ...cuadricula, desplazamientoX: Infinity } }),
      ],
    });
    const { cargada, reparaciones } = cargar(dto);
    for (const cargado of cargada.escenarios) {
      assert.deepEqual(cargado.cuadricula, {
        visible: false,
        tamanoCelda: 70,
        desplazamientoX: 0,
        desplazamientoY: 0,
      });
    }
    comprobarReparaciones(
      reparaciones,
      2,
      /Escenario "z1": se restableció la cuadrícula por defecto\. El tamaño de celda/,
      /Escenario "z2": se restableció la cuadrícula por defecto\. Los desplazamientos/,
    );
  });

  test('con ids repetidos se conserva el primero', () => {
    const dto = campana({
      escenarios: [escenario('z1', 'zona', { nombre: 'primero' }), escenario('z1', 'zona', { nombre: 'segundo' })],
      figuras: [{ ...figura('f1'), nombre: 'primera' }, { ...figura('f1'), nombre: 'segunda' }],
    });
    const { cargada, reparaciones } = cargar(dto);
    assert.deepEqual(cargada.escenarios.map((e) => e.nombre), ['primero']);
    assert.deepEqual(cargada.figuras.map((f) => f.nombre), ['primera']);
    comprobarReparaciones(reparaciones, 2, /escenario repetido: "segundo"/, /figura repetida: "segunda"/);
  });
});
