// Prueba manual de la fase 3 contra la app en marcha (npm start). Herramienta
// de desarrollo: se puede borrar cuando el panel (fase 5) cubra lo mismo.
// Usa el cliente WebSocket y fetch que trae Node 22+.
//
//   node scripts/probar-servidor.mjs <token> <carpeta-de-prueba> [puerto]
//
// El token lo imprime `npm start` en la terminal. La carpeta debe tener al
// menos una imagen; el script crea figuras y las borra al terminar.
import { conectar, pausa } from './cliente-ws.mjs';

const [token, carpeta, puerto = '8080'] = process.argv.slice(2);
if (!token || !carpeta) {
  console.error('Uso: node scripts/probar-servidor.mjs <token> <carpeta-de-prueba> [puerto]');
  process.exit(1);
}
const base = `127.0.0.1:${puerto}`;
let fallos = 0;

function comprobar(condicion, descripcion) {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} ${descripcion}`);
  if (!condicion) fallos++;
}

// ---- Conexiones y autorización ----
console.log('\n# Conexiones');
const visor = await conectar(`ws://${base}/ws?rol=visor`);
const estadoInicial = await visor.esperar('estado');
comprobar(Array.isArray(estadoInicial.figuras), 'el visor recibe "estado" al conectarse');

const intruso = await conectar(`ws://${base}/ws?rol=panel&token=equivocado`);
const rechazo = await intruso.esperar('error');
comprobar(rechazo.codigo === 'NO_AUTORIZADO', 'un panel con token equivocado recibe NO_AUTORIZADO');
comprobar((await intruso.cerrado) === 4001, 'y su conexión se cierra (código 4001)');

const panel = await conectar(`ws://${base}/ws?rol=panel&token=${token}`);
const info = await panel.esperar('infoServidor');
await panel.esperar('estadoPanel');
await panel.esperar('biblioteca');
comprobar(true, `el panel con el token correcto recibe infoServidor, estadoPanel y biblioteca`);
console.log(`      URLs del visor: ${info.urls.join(', ')}`);

const urlLan = info.urls.find((u) => !u.includes('127.0.0.1'));
if (urlLan) {
  // Conectarse a la IP de la LAN desde este mismo equipo hace que el servidor
  // vea esa IP como origen, igual que una conexión desde otra máquina.
  const remoto = await conectar(`${urlLan.replace('http', 'ws')}ws?rol=panel&token=${token}`);
  const error = await remoto.esperar('error');
  comprobar(error.codigo === 'NO_AUTORIZADO', `un panel desde la LAN (${new URL(urlLan).host}) se rechaza aunque tenga el token`);
} else {
  console.log('SALTO  sin IP de LAN: no se puede simular una conexión remota');
}

// ---- Abrir campaña ----
console.log('\n# Campaña');
panel.enviar({ tipo: 'abrirCampana', carpeta, crear: true });
const abierta = await panel.esperar('estadoPanel');
const { imagenes } = await panel.esperar('biblioteca');
await visor.esperar('estado');
comprobar(abierta.carpeta === carpeta && abierta.campana !== null, 'abrirCampana devuelve el estado al panel');
comprobar(true, 'y el visor recibe el estado completo de la nueva campaña');
await pausa(200);
const aviso = panel.pendientes('avisoReparaciones')[0];
if (aviso) console.log(`      Reparaciones al cargar:\n        ${aviso.reparaciones.join('\n        ')}`);
if (imagenes.length === 0) {
  console.error('\nLa carpeta no tiene imágenes; no se pueden probar figuras ni HTTP.');
  process.exit(1);
}
const imagen = imagenes[0];

// ---- Límite de figuras ----
console.log('\n# Figuras');
const idsPrevios = new Set(abierta.campana.figuras.map((f) => f.id));
let estado = abierta;
for (let i = 0; i < 5; i++) {
  panel.enviar({ tipo: 'crearFigura', imagen, tipoFigura: 'personaje' });
  estado = await panel.esperar('estadoPanel');
}
const nuevas = estado.campana.figuras.filter((f) => !idsPrevios.has(f.id)).map((f) => f.id);
comprobar(nuevas.length === 5, 'se crean 5 figuras ocultas');
comprobar(visor.pendientes('figurasVisibles').length === 0, 'crear figuras ocultas no envía nada al visor');

// Si la carpeta ya tenía figuras visibles, solo caben las que faltan hasta 4.
const huecos = 4 - estado.campana.figurasVisibles.length;
for (const id of nuevas.slice(0, huecos)) {
  panel.enviar({ tipo: 'cambiarVisibilidadFigura', id, visible: true });
  await panel.esperar('estadoPanel');
  await visor.esperar('figurasVisibles');
}
comprobar(true, `mostrar ${huecos} figura(s) envía "figurasVisibles" al visor cada vez`);

panel.enviar({ tipo: 'cambiarVisibilidadFigura', id: nuevas[huecos], visible: true });
const limite = await panel.esperar('error');
comprobar(limite.codigo === 'LIMITE_FIGURAS', `la quinta visible se rechaza: "${limite.mensaje}"`);
await pausa(300);
comprobar(visor.pendientes('figurasVisibles').length === 0, 'y el visor no recibe nada');
comprobar(panel.pendientes('estadoPanel').length === 0, 'ni el panel recibe un estado nuevo');

// ---- Mensajes no válidos ----
console.log('\n# Mensajes no válidos');
visor.enviar({ tipo: 'borrarFigura', id: nuevas[0] });
const errorVisor = await visor.esperar('error');
comprobar(errorVisor.codigo === 'NO_AUTORIZADO', 'una acción enviada por un visor da NO_AUTORIZADO');
panel.enviar({ tipo: 'cambiarVisibilidadFigura', id: nuevas[0], visible: 'si' });
const malFormado = await panel.esperar('error');
comprobar(malFormado.codigo === 'MENSAJE_INVALIDO', `un mensaje mal formado da MENSAJE_INVALIDO: "${malFormado.mensaje}"`);
panel.enviar({ tipo: 'actualizarEscenario', id: 'x', cambios: { cuadricula: { visible: true, tamanoCelda: 0, desplazamientoX: 0, desplazamientoY: 0 } } });
const sinEscenario = await panel.esperar('error');
comprobar(sinEscenario.codigo === 'NO_ENCONTRADO', 'una acción sobre un id inexistente da NO_ENCONTRADO');
panel.enviar({ tipo: 'crearFigura', imagen: '../campana.json', tipoFigura: 'objeto' });
const imagenMala = await panel.esperar('error');
comprobar(imagenMala.codigo === 'IMAGEN_INVALIDA', 'una imagen fuera de la biblioteca da IMAGEN_INVALIDA');

// ---- HTTP ----
console.log('\n# HTTP');
const rutaImagen = imagen.split('/').map(encodeURIComponent).join('/');
const respuestaImagen = await fetch(`http://${base}/imagenes/${rutaImagen}`);
comprobar(
  respuestaImagen.ok && respuestaImagen.headers.get('content-type').startsWith('image/'),
  `GET /imagenes/${rutaImagen} -> ${respuestaImagen.status} ${respuestaImagen.headers.get('content-type')}`,
);
const modificado = respuestaImagen.headers.get('last-modified');
const revalidada = await fetch(`http://${base}/imagenes/${rutaImagen}`, { headers: { 'If-Modified-Since': modificado } });
comprobar(revalidada.status === 304, `con If-Modified-Since -> ${revalidada.status} (no cambió)`);
for (const ruta of ['/imagenes/campana.json', '/imagenes/..%2Fcampana.json', '/imagenes/%2e%2e/%2e%2e/package.json', '/../package.json', '/principal.ts']) {
  const respuesta = await fetch(`http://${base}${ruta}`);
  comprobar(respuesta.status === 404, `GET ${ruta} -> ${respuesta.status}`);
}
const pagina = await fetch(`http://${base}/`);
comprobar(pagina.ok && pagina.headers.get('content-type').startsWith('text/html'), `GET / -> ${pagina.status} (página del visor)`);

// ---- Limpieza ----
console.log('\n# Limpieza');
for (const id of nuevas) {
  panel.enviar({ tipo: 'borrarFigura', id });
  estado = await panel.esperar('estadoPanel');
}
await pausa(300);
const visiblesFinal = visor.pendientes('figurasVisibles').at(-1);
comprobar(
  estado.campana.figuras.length === idsPrevios.size,
  `se borran las figuras de prueba${visiblesFinal ? ` y el visor vuelve a ${visiblesFinal.figuras.length} visible(s)` : ''}`,
);

panel.cerrar();
visor.cerrar();
console.log(fallos === 0 ? '\nTodo correcto.' : `\n${fallos} comprobación(es) fallida(s).`);
process.exit(fallos === 0 ? 0 : 1);
