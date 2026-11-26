import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Campana } from '../../servidor/modelo/Campana.js';

function campanaConFiguras(cantidad: number): { campana: Campana; ids: string[] } {
  const campana = Campana.nueva();
  const ids = Array.from({ length: cantidad }, (_, i) =>
    campana.crearFigura(`pnj/figura${i}.png`, 'personaje'),
  );
  return { campana, ids };
}

describe('Figuras', () => {
  test('se crean ocultas, sin carta y con el nombre del archivo', () => {
    const campana = Campana.nueva();
    const id = campana.crearFigura('pnj/posadero.png', 'personaje');
    const dto = campana.aDto();
    assert.deepEqual(dto.figuras, [
      { id, tipo: 'personaje', nombre: 'posadero', imagen: 'pnj/posadero.png', carta: null },
    ]);
    assert.deepEqual(dto.figurasVisibles, []);
  });

  test('las visibles quedan en orden de activación', () => {
    const { campana, ids } = campanaConFiguras(3);
    const [a, b, c] = ids as [string, string, string];
    campana.cambiarVisibilidadFigura(c, true);
    campana.cambiarVisibilidadFigura(a, true);
    campana.cambiarVisibilidadFigura(b, true);
    assert.deepEqual(campana.aDto().figurasVisibles, [c, a, b]);
  });

  test('la quinta figura visible se rechaza sin cambiar el estado', () => {
    const { campana, ids } = campanaConFiguras(5);
    for (const id of ids.slice(0, 4)) campana.cambiarVisibilidadFigura(id, true);
    const antes = campana.aDto();

    assert.throws(() => campana.cambiarVisibilidadFigura(ids[4]!, true), {
      codigo: 'LIMITE_FIGURAS',
    });
    assert.deepEqual(campana.aDto(), antes);
  });

  test('ocultar libera un hueco y volver a mostrar la pone al final', () => {
    const { campana, ids } = campanaConFiguras(5);
    for (const id of ids.slice(0, 4)) campana.cambiarVisibilidadFigura(id, true);
    campana.cambiarVisibilidadFigura(ids[0]!, false);
    campana.cambiarVisibilidadFigura(ids[4]!, true);
    campana.cambiarVisibilidadFigura(ids[1]!, false);
    campana.cambiarVisibilidadFigura(ids[1]!, true);
    assert.deepEqual(campana.aDto().figurasVisibles, [ids[2], ids[3], ids[4], ids[1]]);
  });

  test('mostrar una ya visible u ocultar una oculta no cambia nada', () => {
    const { campana, ids } = campanaConFiguras(2);
    campana.cambiarVisibilidadFigura(ids[0]!, true);
    campana.cambiarVisibilidadFigura(ids[0]!, true);
    campana.cambiarVisibilidadFigura(ids[1]!, false);
    assert.deepEqual(campana.aDto().figurasVisibles, [ids[0]]);
  });

  test('borrar una figura visible la quita de las visibles', () => {
    const { campana, ids } = campanaConFiguras(2);
    campana.cambiarVisibilidadFigura(ids[0]!, true);
    campana.cambiarVisibilidadFigura(ids[1]!, true);
    campana.borrarFigura(ids[0]!);
    const dto = campana.aDto();
    assert.deepEqual(dto.figurasVisibles, [ids[1]]);
    assert.equal(dto.figuras.length, 1);
  });

  test('una figura inexistente da NO_ENCONTRADO', () => {
    const campana = Campana.nueva();
    assert.throws(() => campana.cambiarVisibilidadFigura('nada', true), { codigo: 'NO_ENCONTRADO' });
    assert.throws(() => campana.actualizarFigura('nada', { nombre: 'x' }), { codigo: 'NO_ENCONTRADO' });
    assert.throws(() => campana.borrarFigura('nada'), { codigo: 'NO_ENCONTRADO' });
  });

  test('la carta se pone, se conserva al cambiar de tipo y se quita con null', () => {
    const { campana, ids } = campanaConFiguras(1);
    const id = ids[0]!;
    const carta = { nombre: 'Durnan', descripcion: 'Dueño de la taberna.' };

    campana.actualizarFigura(id, { carta });
    campana.actualizarFigura(id, { tipo: 'objeto', nombre: 'Otro nombre' });
    let figura = campana.aDto().figuras[0]!;
    assert.deepEqual(figura.carta, carta);
    assert.equal(figura.tipo, 'objeto');
    assert.equal(figura.nombre, 'Otro nombre');

    campana.actualizarFigura(id, { carta: null });
    figura = campana.aDto().figuras[0]!;
    assert.equal(figura.carta, null);
  });

  test('cambiar de escenario no altera las figuras visibles', () => {
    const { campana, ids } = campanaConFiguras(2);
    const region = campana.crearEscenario('mapas/costa.png', 'region');
    const zona = campana.crearEscenario('mapas/taberna.png', 'zona');
    campana.cambiarVisibilidadFigura(ids[1]!, true);
    campana.activarEscenario(region);
    campana.activarEscenario(zona);
    assert.deepEqual(campana.aDto().figurasVisibles, [ids[1]]);
  });
});
