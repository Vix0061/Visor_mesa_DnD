import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Campana } from '../../servidor/modelo/Campana.js';

const pin = (destinoId: string) => ({ x: 0.5, y: 0.5, destinoId });

describe('Campaña nueva y región inicial', () => {
  test('una campaña nueva no tiene escenarios, región inicial ni escenario activo', () => {
    assert.deepEqual(Campana.nueva().aDto(), {
      version: 1,
      escenarios: [],
      figuras: [],
      regionInicialId: null,
      escenarioActivoId: null,
      figurasVisibles: [],
    });
  });

  test('la primera región pasa a inicial sin activarse; las siguientes no la cambian', () => {
    const campana = Campana.nueva();
    campana.crearEscenario('mapas/taberna.png', 'zona');
    const primera = campana.crearEscenario('mapas/costa.png', 'region');
    campana.crearEscenario('mapas/norte.png', 'region');
    const dto = campana.aDto();
    assert.equal(dto.regionInicialId, primera);
    assert.equal(dto.escenarioActivoId, null);
  });

  test('se crea con cuadrícula oculta, sin pines y con el nombre del archivo', () => {
    const campana = Campana.nueva();
    const id = campana.crearEscenario('mapas/costa.webp', 'region');
    assert.deepEqual(campana.aDto().escenarios[0], {
      id,
      tipo: 'region',
      nombre: 'costa',
      imagen: 'mapas/costa.webp',
      cuadricula: { visible: false, tamanoCelda: 70, desplazamientoX: 0, desplazamientoY: 0 },
      pines: [],
    });
  });

  test('sin regiones se puede activar una zona a mano', () => {
    const campana = Campana.nueva();
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.activarEscenario(zona);
    assert.equal(campana.aDto().escenarioActivoId, zona);
    assert.equal(campana.aDto().regionInicialId, null);
  });

  test('solo una región existente puede marcarse como inicial', () => {
    const campana = Campana.nueva();
    campana.crearEscenario('mapas/costa.png', 'region');
    const segunda = campana.crearEscenario('mapas/norte.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');

    campana.marcarRegionInicial(segunda);
    assert.equal(campana.aDto().regionInicialId, segunda);
    assert.throws(() => campana.marcarRegionInicial(zona), { codigo: 'NO_ENCONTRADO' });
    assert.throws(() => campana.marcarRegionInicial('nada'), { codigo: 'NO_ENCONTRADO' });
  });

  test('activar un escenario inexistente da NO_ENCONTRADO', () => {
    assert.throws(() => Campana.nueva().activarEscenario('nada'), { codigo: 'NO_ENCONTRADO' });
  });
});

describe('Borrado de escenarios', () => {
  test('la región inicial no se borra mientras haya otras regiones', () => {
    const campana = Campana.nueva();
    const inicial = campana.crearEscenario('mapas/costa.png', 'region');
    const otra = campana.crearEscenario('mapas/norte.png', 'region');

    assert.throws(() => campana.borrarEscenario(inicial), { codigo: 'REGION_INICIAL_REQUERIDA' });
    assert.equal(campana.aDto().escenarios.length, 2);

    campana.marcarRegionInicial(otra);
    campana.borrarEscenario(inicial);
    assert.equal(campana.aDto().escenarios.length, 1);
  });

  test('la única región se puede borrar y la campaña queda sin inicial ni activo', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.activarEscenario(region);

    campana.borrarEscenario(region);
    const dto = campana.aDto();
    assert.equal(dto.regionInicialId, null);
    assert.equal(dto.escenarioActivoId, null);
  });

  test('borrar el escenario activo vuelve a la región inicial', () => {
    const campana = Campana.nueva();
    const inicial = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.activarEscenario(zona);

    campana.borrarEscenario(zona);
    assert.equal(campana.aDto().escenarioActivoId, inicial);
  });

  test('borrar un escenario no activo no cambia el activo', () => {
    const campana = Campana.nueva();
    const inicial = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.activarEscenario(inicial);

    campana.borrarEscenario(zona);
    assert.equal(campana.aDto().escenarioActivoId, inicial);
  });

  test('borrar un escenario elimina los pines que apuntaban a él', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const taberna = campana.crearEscenario('mapas/taberna.png', 'zona');
    const cueva = campana.crearEscenario('mapas/cueva.png', 'zona');
    campana.actualizarEscenario(region, { pines: [pin(taberna), pin(cueva)] });

    campana.borrarEscenario(taberna);
    assert.deepEqual(campana.aDto().escenarios[0]!.pines, [pin(cueva)]);
  });
});

describe('Pines', () => {
  test('una región guarda sus pines', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const otraRegion = campana.crearEscenario('mapas/norte.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    const pines = [{ x: 0.42, y: 0.61, destinoId: zona }, pin(otraRegion)];

    campana.actualizarEscenario(region, { pines });
    assert.deepEqual(campana.aDto().escenarios[0]!.pines, pines);
  });

  test('se rechazan pines en zonas, hacia sí mismo o hacia destinos inexistentes', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');

    assert.throws(() => campana.actualizarEscenario(zona, { pines: [pin(region)] }), {
      codigo: 'PIN_INVALIDO',
    });
    assert.throws(() => campana.actualizarEscenario(region, { pines: [pin(region)] }), {
      codigo: 'PIN_INVALIDO',
    });
    assert.throws(() => campana.actualizarEscenario(region, { pines: [pin('nada')] }), {
      codigo: 'PIN_INVALIDO',
    });
  });
});

describe('Rangos', () => {
  const cuadriculaValida = { visible: true, tamanoCelda: 70, desplazamientoX: 0, desplazamientoY: 0 };

  test('se aceptan coordenadas de pin en los extremos 0 y 1', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    const pines = [
      { x: 0, y: 0, destinoId: zona },
      { x: 1, y: 1, destinoId: zona },
    ];
    campana.actualizarEscenario(region, { pines });
    assert.deepEqual(campana.aDto().escenarios[0]!.pines, pines);
  });

  test('se rechazan coordenadas de pin fuera de 0..1 o no finitas', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    for (const [x, y] of [[-0.01, 0.5], [0.5, 1.01], [Number.NaN, 0.5], [0.5, Infinity]]) {
      assert.throws(
        () => campana.actualizarEscenario(region, { pines: [{ x: x!, y: y!, destinoId: zona }] }),
        { codigo: 'PIN_INVALIDO' },
        `x=${x} y=${y}`,
      );
    }
  });

  test('se rechaza un tamaño de celda nulo, negativo o no finito', () => {
    const campana = Campana.nueva();
    const id = campana.crearEscenario('mapas/taberna.png', 'zona');
    for (const tamanoCelda of [0, -10, Number.NaN, Infinity]) {
      assert.throws(
        () => campana.actualizarEscenario(id, { cuadricula: { ...cuadriculaValida, tamanoCelda } }),
        { codigo: 'CUADRICULA_INVALIDA' },
        `tamanoCelda=${tamanoCelda}`,
      );
    }
  });

  test('se rechazan desplazamientos no finitos y se aceptan negativos', () => {
    const campana = Campana.nueva();
    const id = campana.crearEscenario('mapas/taberna.png', 'zona');
    assert.throws(
      () => campana.actualizarEscenario(id, { cuadricula: { ...cuadriculaValida, desplazamientoX: Number.NaN } }),
      { codigo: 'CUADRICULA_INVALIDA' },
    );
    assert.throws(
      () => campana.actualizarEscenario(id, { cuadricula: { ...cuadriculaValida, desplazamientoY: -Infinity } }),
      { codigo: 'CUADRICULA_INVALIDA' },
    );
    const conNegativos = { ...cuadriculaValida, desplazamientoX: -12, desplazamientoY: -8 };
    campana.actualizarEscenario(id, { cuadricula: conNegativos });
    assert.deepEqual(campana.aDto().escenarios[0]!.cuadricula, conNegativos);
  });

  test('una cuadrícula inválida no aplica el resto de cambios', () => {
    const campana = Campana.nueva();
    const id = campana.crearEscenario('mapas/taberna.png', 'zona');
    const antes = campana.aDto();
    assert.throws(
      () => campana.actualizarEscenario(id, { nombre: 'X', cuadricula: { ...cuadriculaValida, tamanoCelda: 0 } }),
      { codigo: 'CUADRICULA_INVALIDA' },
    );
    assert.deepEqual(campana.aDto(), antes);
  });
});

describe('Cambio de tipo de escenario', () => {
  test('pasar de región a zona descarta los pines', () => {
    const campana = Campana.nueva();
    campana.crearEscenario('mapas/costa.png', 'region');
    const segunda = campana.crearEscenario('mapas/norte.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.actualizarEscenario(segunda, { pines: [pin(zona)] });

    campana.actualizarEscenario(segunda, { tipo: 'zona' });
    const escenario = campana.aDto().escenarios[1]!;
    assert.equal(escenario.tipo, 'zona');
    assert.deepEqual(escenario.pines, []);
  });

  test('la región inicial no pasa a zona si hay otras regiones', () => {
    const campana = Campana.nueva();
    const inicial = campana.crearEscenario('mapas/costa.png', 'region');
    campana.crearEscenario('mapas/norte.png', 'region');

    assert.throws(() => campana.actualizarEscenario(inicial, { tipo: 'zona' }), {
      codigo: 'REGION_INICIAL_REQUERIDA',
    });
    assert.equal(campana.aDto().escenarios[0]!.tipo, 'region');
  });

  test('si la única región pasa a zona, la campaña queda sin región inicial', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    campana.actualizarEscenario(region, { tipo: 'zona' });
    assert.equal(campana.aDto().regionInicialId, null);
  });

  test('una zona que pasa a región en una campaña sin regiones se vuelve inicial', () => {
    const campana = Campana.nueva();
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.actualizarEscenario(zona, { tipo: 'region' });
    assert.equal(campana.aDto().regionInicialId, zona);
  });

  test('un cambio inválido no aplica nada (todo o nada)', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.crearEscenario('mapas/norte.png', 'region');
    campana.actualizarEscenario(region, { pines: [pin(zona)] });
    campana.marcarRegionInicial(campana.aDto().escenarios[2]!.id);
    const antes = campana.aDto();

    assert.throws(
      () => campana.actualizarEscenario(region, { tipo: 'zona', nombre: 'X', pines: [pin(zona)] }),
      { codigo: 'PIN_INVALIDO' },
    );
    assert.deepEqual(campana.aDto(), antes);
  });

  test('actualiza nombre, imagen y cuadrícula', () => {
    const campana = Campana.nueva();
    const id = campana.crearEscenario('mapas/taberna.png', 'zona');
    const cuadricula = { visible: true, tamanoCelda: 140, desplazamientoX: 12, desplazamientoY: 8 };
    campana.actualizarEscenario(id, { nombre: 'Taberna', imagen: 'mapas/taberna2.png', cuadricula });
    const escenario = campana.aDto().escenarios[0]!;
    assert.equal(escenario.nombre, 'Taberna');
    assert.equal(escenario.imagen, 'mapas/taberna2.png');
    assert.deepEqual(escenario.cuadricula, cuadricula);
  });
});

describe('Conversión a DTO', () => {
  test('desdeDto(aDto()) reproduce la misma campaña', () => {
    const campana = Campana.nueva();
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.actualizarEscenario(region, { pines: [pin(zona)] });
    campana.activarEscenario(zona);
    const figura = campana.crearFigura('pnj/posadero.png', 'personaje');
    campana.actualizarFigura(figura, { carta: { nombre: 'Durnan', descripcion: 'Posadero.' } });
    campana.cambiarVisibilidadFigura(figura, true);

    const dto = campana.aDto();
    const { campana: cargada, reparaciones } = Campana.desdeDto(dto);
    assert.deepEqual(cargada.aDto(), dto);
    assert.deepEqual(reparaciones, []);
  });

  test('aDto devuelve copias: modificarlas no altera la campaña', () => {
    const campana = Campana.nueva();
    campana.crearEscenario('mapas/costa.png', 'region');
    const dto = campana.aDto();
    dto.escenarios[0]!.cuadricula.tamanoCelda = 1;
    dto.figurasVisibles.push('intruso');
    assert.equal(campana.aDto().escenarios[0]!.cuadricula.tamanoCelda, 70);
    assert.deepEqual(campana.aDto().figurasVisibles, []);
  });
});
