// SesionCampana con dobles de la persistencia: comprueba qué decide la sesión,
// no el disco. Las clases de persistencia tienen campos #privados, que en
// TypeScript las hacen nominales; de ahí los `as unknown as`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { CampanaDto } from '../../compartido/modelo.js';
import { SesionCampana } from '../../servidor/modelo/SesionCampana.js';
import type { BibliotecaImagenes } from '../../servidor/persistencia/BibliotecaImagenes.js';
import type { GuardadoDiferido } from '../../servidor/persistencia/GuardadoDiferido.js';
import type { RepositorioCampana } from '../../servidor/persistencia/RepositorioCampana.js';

function crearSesion(archivo: CampanaDto | null) {
  const llamadas = { escanear: 0, programar: 0, respaldar: 0 };
  const repositorio = {
    cargar: async () => archivo,
    respaldar: async () => void llamadas.respaldar++,
  };
  const biblioteca = {
    escanear: async () => (llamadas.escanear++, ['mapas/costa.png']),
  };
  const guardado = {
    alFallarGuardado: null,
    programar: () => void llamadas.programar++,
    volcar: async () => {},
  };
  const sesion = new SesionCampana(
    repositorio as unknown as RepositorioCampana,
    biblioteca as unknown as BibliotecaImagenes,
    guardado as unknown as GuardadoDiferido,
  );
  return { sesion, llamadas };
}

describe('Abrir una carpeta', () => {
  test('sin campana.json y sin crear, responde CAMPANA_INEXISTENTE sin escanear ni crear nada', async () => {
    const { sesion, llamadas } = crearSesion(null);
    await assert.rejects(sesion.abrir('/carpeta', false), { codigo: 'CAMPANA_INEXISTENTE' });
    assert.deepEqual(llamadas, { escanear: 0, programar: 0, respaldar: 0 });
    assert.equal(sesion.carpeta, null);
    assert.equal(sesion.estado(), null);
  });

  test('sin campana.json y con crear, abre una campaña vacía y programa su guardado', async () => {
    const { sesion, llamadas } = crearSesion(null);
    assert.deepEqual(await sesion.abrir('/carpeta', true), []);
    assert.deepEqual(llamadas, { escanear: 1, programar: 1, respaldar: 0 });
    assert.equal(sesion.carpeta, '/carpeta');
    assert.equal(sesion.estado()?.escenarios.length, 0);
    assert.deepEqual(sesion.imagenes, ['mapas/costa.png']);
  });

  test('con campana.json abre igual tenga o no crear, sin reescribirla', async () => {
    const archivo: CampanaDto = {
      version: 1,
      escenarios: [],
      figuras: [],
      regionInicialId: null,
      escenarioActivoId: null,
      figurasVisibles: [],
    };
    for (const crear of [false, true]) {
      const { sesion, llamadas } = crearSesion(archivo);
      await sesion.abrir('/carpeta', crear);
      assert.deepEqual(llamadas, { escanear: 1, programar: 0, respaldar: 0 });
      assert.equal(sesion.carpeta, '/carpeta');
    }
  });

  test('si hay reparaciones, respalda el original antes de abrir', async () => {
    const archivo: CampanaDto = {
      version: 1,
      escenarios: [],
      figuras: [],
      regionInicialId: null,
      escenarioActivoId: 'borrado',
      figurasVisibles: [],
    };
    const { sesion, llamadas } = crearSesion(archivo);
    const reparaciones = await sesion.abrir('/carpeta', false);
    assert.equal(reparaciones.length, 1);
    assert.equal(llamadas.respaldar, 1);
  });

  test('un fallo al abrir deja abierta la campaña anterior', async () => {
    const { sesion } = crearSesion(null);
    await sesion.abrir('/anterior', true);
    await assert.rejects(sesion.abrir('/otra', false), { codigo: 'CAMPANA_INEXISTENTE' });
    assert.equal(sesion.carpeta, '/anterior');
  });
});
