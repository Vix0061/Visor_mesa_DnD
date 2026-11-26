import type { MensajeAlPanel, MensajePanel } from '../compartido/mensajes.js';

/**
 * WebSocket del panel. Sin reconexión: el servidor vive en el mismo proceso
 * que esta ventana, así que si la conexión se cierra es que algo ha ido mal
 * (p. ej. token rechazado) y se informa al DM.
 */
export class ConexionPanel {
  /** Los asigna la capa superior (el controlador). */
  alRecibir: ((mensaje: MensajeAlPanel) => void) | null = null;
  alCambiarEstado: ((conectada: boolean) => void) | null = null;

  readonly #url: string;
  #socket: WebSocket | null = null;

  constructor(url: string) {
    this.#url = url;
  }

  conectar(): void {
    const socket = new WebSocket(this.#url);
    this.#socket = socket;
    socket.addEventListener('open', () => this.alCambiarEstado?.(true));
    socket.addEventListener('message', (evento) => {
      let mensaje: MensajeAlPanel;
      try {
        mensaje = JSON.parse(String(evento.data)) as MensajeAlPanel;
      } catch {
        return;
      }
      this.alRecibir?.(mensaje);
    });
    socket.addEventListener('close', () => this.alCambiarEstado?.(false));
  }

  /** false si no hay conexión abierta. */
  enviar(mensaje: MensajePanel): boolean {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(JSON.stringify(mensaje));
    return true;
  }
}
