// Demostración del visor sin panel (fases 4 y 7): monta una campaña de prueba
// y recorre una serie de cambios para ver cómo responde el visor. Herramienta
// de desarrollo: se puede borrar cuando el panel (fase 5) permita hacer lo mismo.
//
//   node scripts/demo-visor.mjs <token> <carpeta-de-prueba> [ms-entre-pasos] [puerto]
//
// Usa una carpeta de prueba con al menos 2 imágenes: la 1.ª será una región (y la 3.ª, o la
// 1.ª, la región 2), la 2.ª una zona y las demás las figuras. Las
// entidades que crea llevan el prefijo "demo:" y se borran al volver a ejecutarlo.
import { conectar, pausa } from './cliente-ws.mjs';

const [token, carpeta, msPaso = '3000', puerto = '8080'] = process.argv.slice(2);
if (!token || !carpeta) {
  console.error('Uso: node scripts/demo-visor.mjs <token> <carpeta-de-prueba> [ms-entre-pasos] [puerto]');
  process.exit(1);
}

const panel = await conectar(`ws://127.0.0.1:${puerto}/ws?rol=panel&token=${token}`);
// Los mensajes de bienvenida: así los siguientes "estadoPanel" y "biblioteca" son los de abrir.
await panel.esperar('estadoPanel');
await panel.esperar('biblioteca');

/** Envía una acción y devuelve el estado resultante, o null si el servidor la rechaza. */
async function accion(mensaje) {
  panel.enviar(mensaje);
  const respuesta = await panel.esperar(['estadoPanel', 'error']);
  if (respuesta.tipo === 'error') {
    console.log(`      (rechazado: ${respuesta.codigo} - ${respuesta.mensaje})`);
    return null;
  }
  return respuesta.campana;
}

panel.enviar({ tipo: 'abrirCampana', carpeta, crear: true });
const apertura = await panel.esperar(['estadoPanel', 'error']);
if (apertura.tipo === 'error') {
  console.error(`No se pudo abrir: ${apertura.mensaje}`);
  process.exit(1);
}
const { imagenes } = await panel.esperar('biblioteca');
if (imagenes.length < 2) {
  console.error('La carpeta necesita al menos 2 imágenes.');
  process.exit(1);
}
let campana = apertura.campana;

// Limpieza de una ejecución anterior.
for (const f of campana.figuras.filter((f) => f.nombre.startsWith('demo:'))) {
  campana = (await accion({ tipo: 'borrarFigura', id: f.id })) ?? campana;
}
for (const e of [...campana.escenarios].reverse().filter((e) => e.nombre.startsWith('demo:'))) {
  campana = (await accion({ tipo: 'borrarEscenario', id: e.id })) ?? campana;
}

/** Crea una entidad y devuelve su id (la que no estaba antes). */
async function crear(mensaje, lista, nombre, cambios = {}) {
  const antes = new Set(campana[lista].map((x) => x.id));
  campana = await accion(mensaje);
  const id = campana[lista].find((x) => !antes.has(x.id)).id;
  const tipo = lista === 'escenarios' ? 'actualizarEscenario' : 'actualizarFigura';
  campana = await accion({ tipo, id, cambios: { nombre: `demo: ${nombre}`, ...cambios } });
  return id;
}

const region = await crear({ tipo: 'crearEscenario', imagen: imagenes[0], tipoEscenario: 'region' }, 'escenarios', 'región');
const zona = await crear({ tipo: 'crearEscenario', imagen: imagenes[1], tipoEscenario: 'zona' }, 'escenarios', 'zona');
const region2 = await crear({ tipo: 'crearEscenario', imagen: imagenes[2] ?? imagenes[0], tipoEscenario: 'region' }, 'escenarios', 'región 2');
const imagenFigura = (i) => imagenes[2 + i] ?? imagenes[2] ?? imagenes[0];
const cartas = [
  { nombre: 'Marta la Posadera', descripcion: 'Dueña de El Jabalí Dorado. Sabe más de lo que dice.' },
  null,
  {
    nombre: 'Eldrin el Gris',
    descripcion: 'Mago errante de barba larga. Busca un mapa perdido que, según dice, lleva a la torre de su maestro.',
  },
  { nombre: 'Cofre sellado', descripcion: '' },
];
const figuras = [];
for (const [i, carta] of cartas.entries()) {
  figuras.push(await crear({ tipo: 'crearFigura', imagen: imagenFigura(i), tipoFigura: i === 3 ? 'objeto' : 'personaje' }, 'figuras', `figura ${i + 1}`, { carta }));
}
const pinA = { x: 0.3, y: 0.55, destinoId: zona };
const pinB = { x: 0.72, y: 0.3, destinoId: region2 };
const pinC = { x: 0.5, y: 0.8, destinoId: zona };
await accion({ tipo: 'actualizarEscenario', id: region, cambios: { pines: [pinA] } });
await accion({ tipo: 'actualizarEscenario', id: region2, cambios: { pines: [{ x: 0.2, y: 0.25, destinoId: region }] } });

const activar = (id) => ({ tipo: 'activarEscenario', id });
const pines = (lista) => ({ tipo: 'actualizarEscenario', id: region, cambios: { pines: lista } });
const visibilidad = (i, visible) => ({ tipo: 'cambiarVisibilidadFigura', id: figuras[i], visible });
const cuadricula = (visible, tamanoCelda, desplazamientoX = 0, desplazamientoY = 0) => ({
  tipo: 'actualizarEscenario',
  id: zona,
  cambios: { cuadricula: { visible, tamanoCelda, desplazamientoX, desplazamientoY } },
});

const pasos = [
  ['Región activa con un pin (fundido desde la espera), sin figuras', [activar(region)]],
  ['Aparece "Marta la Posadera" (con carta)', [visibilidad(0, true)]],
  ['Aparece una figura sin carta', [visibilidad(1, true)]],
  ['Aparece "Eldrin el Gris" (descripción larga)', [visibilidad(2, true)]],
  ['Cambia a la zona: zoom hacia el pin; las figuras no se tocan', [activar(zona)]],
  ['Cuadrícula visible (fundido, celda de 100 px)', [cuadricula(true, 100)]],
  ['Cuadrícula: celda de 60 px desplazada 20, 10 (directo)', [cuadricula(true, 60, 20, 10)]],
  ['Sale la figura del medio: la fila se recentra', [visibilidad(1, false)]],
  ['Vuelven a ser 4 visibles (la del medio entra al final)', [visibilidad(3, true), visibilidad(1, true)]],
  ['Cambia la carta de la primera figura', [{ tipo: 'actualizarFigura', id: figuras[0], cambios: { carta: { nombre: 'Marta', descripcion: 'Ahora os mira con desconfianza.' } } }]],
  ['Cambia la imagen de "Eldrin el Gris": fundido breve, la fila no se mueve', [{ tipo: 'actualizarFigura', id: figuras[2], cambios: { imagen: imagenes[0] } }]],
  ['Marta pierde su carta (fundido)', [{ tipo: 'actualizarFigura', id: figuras[0], cambios: { carta: null } }]],
  ['Seguidos: salen Marta y Eldrin y vuelve Marta -> se salta al último estado', [visibilidad(0, false), visibilidad(2, false), visibilidad(0, true)]],
  ['Vuelve a la región: zoom inverso desde su pin', [activar(region)]],
  ['Aparecen dos pines más en la región', [pines([pinA, pinB, pinC])]],
  ['Se quita el último pin (se desvanece)', [pines([pinA, pinB])]],
  ['Se ocultan todas las figuras', figuras.map((_, i) => visibilidad(i, false))],
  ['Va a la región 2: las dos se apuntan, gana el zoom hacia el pin', [activar(region2)]],
  ['Cambia la imagen de la región 2: fundido cruzado', [{ tipo: 'actualizarEscenario', id: region2, cambios: { imagen: imagenes[1] } }]],
  ['Región 2 -> zona, sin pin que las una: fundido cruzado', [activar(zona)]],
  ['Seguidos: región, zona, región 2 -> tras la 1.ª transición salta a la región 2', [activar(region), activar(zona), activar(region2)]],
  ['Vuelve a la zona (fundido cruzado)', [activar(zona)]],
  ['Se oculta la cuadrícula de la zona (fundido)', [cuadricula(false, 60, 20, 10)]],
];

console.log(`Abre el visor en el navegador. Un paso cada ${msPaso} ms:\n`);
for (const [i, [descripcion, mensajes]] of pasos.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${descripcion}`);
  for (const mensaje of mensajes) await accion(mensaje);
  await pausa(Number(msPaso));
}
console.log('\nFin de la demostración.');
panel.cerrar();
process.exit(0);
