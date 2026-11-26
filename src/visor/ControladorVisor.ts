import type { MensajeAlVisor } from '../compartido/mensajes.js';
import type { ConexionVisor } from './ConexionVisor.js';
import type { CapaEscenario } from './vista/CapaEscenario.js';
import type { CapaFiguras } from './vista/CapaFiguras.js';
import type { IndicadorConexion } from './vista/IndicadorConexion.js';

/** Entrega cada mensaje del servidor a la capa de la vista que le corresponde. */
export class ControladorVisor {
  readonly #conexion: ConexionVisor;
  readonly #escenario: CapaEscenario;
  readonly #figuras: CapaFiguras;
  readonly #indicador: IndicadorConexion;

  constructor(conexion: ConexionVisor, escenario: CapaEscenario, figuras: CapaFiguras, indicador: IndicadorConexion) {
    this.#conexion = conexion;
    this.#escenario = escenario;
    this.#figuras = figuras;
    this.#indicador = indicador;
    conexion.alRecibir = (mensaje) => this.#recibir(mensaje);
    conexion.alCambiarEstado = (conectada) => this.#indicador.mostrar(!conectada);
  }

  iniciar(): void {
    this.#conexion.conectar();
  }

  #recibir(mensaje: MensajeAlVisor): void {
    switch (mensaje.tipo) {
      case 'estado':
        this.#escenario.mostrar(mensaje.escenario);
        this.#figuras.mostrar(mensaje.figuras);
        break;
      case 'escenarioActivo':
        this.#escenario.mostrar(mensaje.escenario);
        break;
      case 'figurasVisibles':
        this.#figuras.mostrar(mensaje.figuras);
        break;
      // Cualquier otro mensaje (p. ej. un error) no es para el visor: se ignora.
    }
  }
}
