import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { interpretarMensaje } from '../../servidor/controlador/validacionMensajes.js';

const interpretar = (mensaje: unknown) => interpretarMensaje(JSON.stringify(mensaje));
const invalido = (detalle: RegExp) => ({ codigo: 'MENSAJE_INVALIDO', message: detalle });

const cuadricula = { visible: true, tamanoCelda: 70, desplazamientoX: -3, desplazamientoY: 0 };

describe('Validación de mensajes del panel', () => {
  test('acepta cada tipo de mensaje bien formado', () => {
    const validos = [
      { tipo: 'abrirCampana', carpeta: 'C:\\campañas\\costa' },
      { tipo: 'abrirCampana', carpeta: '/home/dm/costa', crear: true },
      { tipo: 'refrescarBiblioteca' },
      { tipo: 'crearEscenario', imagen: 'mapas/costa.png', tipoEscenario: 'region' },
      { tipo: 'crearFigura', imagen: 'pnj/posadero.png', tipoFigura: 'objeto' },
      { tipo: 'actualizarEscenario', id: 'e1', cambios: {} },
      {
        tipo: 'actualizarEscenario',
        id: 'e1',
        cambios: { nombre: 'Costa', tipo: 'zona', imagen: 'a.png', cuadricula, pines: [{ x: 0, y: 1, destinoId: 'e2' }] },
      },
      { tipo: 'actualizarFigura', id: 'f1', cambios: { carta: null } },
      { tipo: 'actualizarFigura', id: 'f1', cambios: { tipo: 'personaje', carta: { nombre: 'D', descripcion: '' } } },
      { tipo: 'borrarEscenario', id: 'e1' },
      { tipo: 'borrarFigura', id: 'f1' },
      { tipo: 'activarEscenario', id: 'e1' },
      { tipo: 'marcarRegionInicial', id: 'e1' },
      { tipo: 'cambiarVisibilidadFigura', id: 'f1', visible: false },
    ];
    for (const mensaje of validos) assert.deepEqual(interpretar(mensaje), mensaje);
  });

  test('descarta los campos desconocidos', () => {
    const resultado = interpretar({
      tipo: 'actualizarFigura',
      id: 'f1',
      extra: 1,
      cambios: { nombre: 'X', visible: true, carta: { nombre: 'D', descripcion: 'd', html: '<b>' } },
    });
    assert.deepEqual(resultado, {
      tipo: 'actualizarFigura',
      id: 'f1',
      cambios: { nombre: 'X', carta: { nombre: 'D', descripcion: 'd' } },
    });
  });

  test('no valida rangos: eso lo hace el modelo', () => {
    const cambios = { cuadricula: { ...cuadricula, tamanoCelda: -1 }, pines: [{ x: 5, y: -2, destinoId: 'e1' }] };
    assert.deepEqual(interpretar({ tipo: 'actualizarEscenario', id: 'e1', cambios }).tipo, 'actualizarEscenario');
  });

  test('rechaza texto que no es JSON o que no es un objeto', () => {
    assert.throws(() => interpretarMensaje('{roto'), invalido(/no es JSON/));
    assert.throws(() => interpretar([1, 2]), invalido(/mensaje debe ser un objeto/));
    assert.throws(() => interpretar(null), invalido(/mensaje debe ser un objeto/));
  });

  test('rechaza un tipo de mensaje ausente o desconocido', () => {
    assert.throws(() => interpretar({ id: 'e1' }), invalido(/tipo debe ser texto/));
    assert.throws(() => interpretar({ tipo: 'borrarTodo' }), invalido(/desconocido: borrarTodo/));
  });

  test('rechaza campos obligatorios ausentes o con tipo incorrecto', () => {
    const casos: [unknown, RegExp][] = [
      [{ tipo: 'abrirCampana' }, /carpeta debe ser texto/],
      [{ tipo: 'abrirCampana', carpeta: 'c', crear: 'si' }, /crear debe ser true o false/],
      [{ tipo: 'borrarFigura', id: 7 }, /id debe ser texto/],
      [{ tipo: 'cambiarVisibilidadFigura', id: 'f1', visible: 'true' }, /visible debe ser true o false/],
      [{ tipo: 'actualizarFigura', id: 'f1' }, /cambios debe ser un objeto/],
    ];
    for (const [mensaje, detalle] of casos) assert.throws(() => interpretar(mensaje), invalido(detalle));
  });

  test('no permite cambiar entre clases: los tipos válidos dependen de la entidad', () => {
    assert.throws(
      () => interpretar({ tipo: 'crearEscenario', imagen: 'a.png', tipoEscenario: 'personaje' }),
      invalido(/tipoEscenario debe ser uno de: zona, region/),
    );
    assert.throws(
      () => interpretar({ tipo: 'actualizarFigura', id: 'f1', cambios: { tipo: 'region' } }),
      invalido(/tipo debe ser uno de: personaje, objeto/),
    );
    assert.throws(
      () => interpretar({ tipo: 'actualizarEscenario', id: 'e1', cambios: { tipo: 'objeto' } }),
      invalido(/tipo debe ser uno de: zona, region/),
    );
  });

  test('rechaza cuadrícula, pines y carta mal formados', () => {
    const casos: [unknown, RegExp][] = [
      [{ cuadricula: { ...cuadricula, tamanoCelda: '70' } }, /tamanoCelda debe ser un número/],
      [{ cuadricula: { visible: true } }, /tamanoCelda debe ser un número/],
      [{ pines: { x: 0, y: 0, destinoId: 'e2' } }, /pines debe ser una lista/],
      [{ pines: [{ x: 0, y: 0 }] }, /destinoId debe ser texto/],
      [{ pines: [null] }, /pin debe ser un objeto/],
    ];
    for (const [cambios, detalle] of casos) {
      assert.throws(() => interpretar({ tipo: 'actualizarEscenario', id: 'e1', cambios }), invalido(detalle));
    }
    assert.throws(
      () => interpretar({ tipo: 'actualizarFigura', id: 'f1', cambios: { carta: { nombre: 'D' } } }),
      invalido(/descripcion debe ser texto/),
    );
  });
});
