import type { MensajeAlVisor } from '../compartido/mensajes.js';

const ESPERA_MAXIMA_S = 5;

/**
 * WebSocket del visor con reconexión automática: 1 s, 2 s, ... hasta 5 s entre
 * intentos. Al reconectar, el servidor vuelve a enviar el estado completo.
 */
export class ConexionVisor {
  /** Los asigna la capa superior (el controlador). */
  alRecibir: ((mensaje: MensajeAlVisor) => void) | null = null;
  alCambiarEstado: ((conectada: boolean) => void) | null = null;

  readonly #url: string;
  #intentosFallidos = 0;

  constructor(url: string) {
    this.#url = url;
  }

  conectar(): void {
    const socket = new WebSocket(this.#url);
    socket.addEventListener('open', () => {
      this.#intentosFallidos = 0;
      this.alCambiarEstado?.(true);
    });
    socket.addEventListener('message', (evento) => {
      let mensaje: MensajeAlVisor;
      try {
        mensaje = JSON.parse(String(evento.data)) as MensajeAlVisor;
      } catch {
        return;
      }
      this.alRecibir?.(mensaje);
    });
    // 'close' llega tanto si se cae una conexión abierta como si no se pudo abrir.
    socket.addEventListener('close', () => {
      this.alCambiarEstado?.(false);
      this.#intentosFallidos++;
      const segundos = Math.min(this.#intentosFallidos, ESPERA_MAXIMA_S);
      setTimeout(() => this.conectar(), segundos * 1000);
    });
  }
}
