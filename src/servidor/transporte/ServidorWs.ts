import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { MensajeAlPanel, MensajeAlVisor, Rol } from '../../compartido/mensajes.js';
import type { ControladorCampana, Respuesta } from '../controlador/ControladorCampana.js';
import { esDireccionLocal } from './red.js';
import type { ServidorHttp } from './ServidorHttp.js';

// Los mensajes del panel son pequeños; el límite por defecto de ws es 100 MB.
const TAMANO_MAXIMO_MENSAJE = 1024 * 1024;
// Códigos de cierre 4000-4999: reservados para la aplicación.
const CIERRE_RECHAZADA = 4001;

/** Conexiones WebSocket en /ws: el rol, la entrega de mensajes y la difusión. */
export class ServidorWs {
  readonly #controlador: ControladorCampana;
  readonly #urls: string[];
  readonly #clientes = new Map<WebSocket, Rol>();

  constructor(http: ServidorHttp, controlador: ControladorCampana, urls: string[]) {
    this.#controlador = controlador;
    this.#urls = urls;
    const servidor = new WebSocketServer({
      server: http.servidor,
      path: '/ws',
      maxPayload: TAMANO_MAXIMO_MENSAJE,
    });
    servidor.on('connection', (socket, peticion) => this.#alConectar(socket, peticion));
    controlador.alFallarGuardado = (respuesta) => this.#enviar(respuesta, null);
  }

  #alConectar(socket: WebSocket, peticion: IncomingMessage): void {
    const parametros = new URL(peticion.url ?? '/', 'http://localhost').searchParams;
    const conexion = this.#controlador.conectar({
      rol: parametros.get('rol'),
      token: parametros.get('token'),
      esLocal: esDireccionLocal(peticion.socket.remoteAddress),
    });

    if (conexion.rol === null) {
      for (const mensaje of conexion.mensajes) enviarA(socket, JSON.stringify(mensaje));
      socket.close(CIERRE_RECHAZADA);
      return;
    }

    const rol = conexion.rol;
    this.#clientes.set(socket, rol);
    socket.on('close', () => this.#clientes.delete(socket));
    socket.on('message', (datos, esBinario) => {
      this.#controlador
        .recibir(rol, esBinario ? '' : datos.toString())
        .then((respuesta) => this.#enviar(respuesta, socket))
        .catch((error: unknown) => console.error('Error inesperado al procesar un mensaje:', error));
    });

    const iniciales: (MensajeAlPanel | MensajeAlVisor)[] =
      rol === 'panel' ? [{ tipo: 'infoServidor', urls: this.#urls }, ...conexion.mensajes] : conexion.mensajes;
    for (const mensaje of iniciales) enviarA(socket, JSON.stringify(mensaje));
  }

  #enviar(respuesta: Respuesta, emisor: WebSocket | null): void {
    // Se serializa una vez por mensaje, no una vez por cliente.
    const porRol: Record<Rol, string[]> = {
      panel: (respuesta.aPaneles ?? []).map((m) => JSON.stringify(m)),
      visor: (respuesta.aVisores ?? []).map((m) => JSON.stringify(m)),
    };
    for (const [socket, rol] of this.#clientes) {
      for (const texto of porRol[rol]) enviarA(socket, texto);
    }
    if (emisor) {
      for (const mensaje of respuesta.alEmisor ?? []) enviarA(emisor, JSON.stringify(mensaje));
    }
  }
}

function enviarA(socket: WebSocket, texto: string): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(texto);
}
