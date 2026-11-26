import type { EscenarioPublico } from '../../compartido/mensajes.js';
import { Lienzo } from './Lienzo.js';

/**
 * Capa 1: el escenario activo, o la pantalla de espera si no hay ninguno.
 * Si llega el mismo escenario con cambios, actualiza el lienzo existente en
 * vez de rehacerlo (así una reconexión no reinicia lo que ya está en pantalla).
 */
export class CapaEscenario {
  readonly #contenedor: HTMLElement;
  #lienzo: Lienzo | null = null;

  constructor(contenedor: HTMLElement) {
    this.#contenedor = contenedor;
  }

  mostrar(escenario: EscenarioPublico | null): void {
    if (escenario && this.#lienzo?.id === escenario.id) {
      this.#lienzo.actualizar(escenario);
      return;
    }
    this.#lienzo?.elemento.remove();
    this.#lienzo = escenario ? new Lienzo(escenario) : null;
    if (this.#lienzo) this.#contenedor.append(this.#lienzo.elemento);
    this.#contenedor.classList.toggle('con-escenario', this.#lienzo !== null);
  }
}
