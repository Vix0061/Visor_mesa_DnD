import type { EscenarioPublico } from '../../compartido/mensajes.js';
import { Lienzo } from './Lienzo.js';
import { fundidoCruzado, zoomDesdePin, zoomHaciaPin } from './transiciones.js';

/**
 * Capa 1: el escenario activo, o la pantalla de espera si no hay ninguno.
 * Procesa los cambios de uno en uno y guarda solo el último objetivo: si llegan
 * varios durante una transición, al acabar se salta directamente al último.
 * El mismo escenario con la misma imagen se actualiza sin rehacer el lienzo
 * (así una reconexión no reinicia lo que ya está en pantalla).
 */
export class CapaEscenario {
  readonly #contenedor: HTMLElement;
  #lienzo: Lienzo | null = null;
  // undefined = no hay nada pendiente; null = ir a "sin escenario".
  #objetivo: EscenarioPublico | null | undefined = undefined;
  #ocupada = false;

  constructor(contenedor: HTMLElement) {
    this.#contenedor = contenedor;
  }

  mostrar(escenario: EscenarioPublico | null): void {
    this.#objetivo = escenario;
    if (!this.#ocupada) void this.#procesar();
  }

  async #procesar(): Promise<void> {
    this.#ocupada = true;
    while (this.#objetivo !== undefined) {
      const escenario = this.#objetivo;
      this.#objetivo = undefined;
      try {
        await this.#ir(escenario);
      } catch (error) {
        console.error('Fallo en la transición del escenario:', error);
      }
    }
    this.#ocupada = false;
  }

  async #ir(escenario: EscenarioPublico | null): Promise<void> {
    const anterior = this.#lienzo;
    if (escenario && anterior?.escenario.id === escenario.id && anterior.escenario.imagen === escenario.imagen) {
      anterior.actualizar(escenario);
      return;
    }
    if (!escenario && !anterior) return;

    const nuevo = escenario ? new Lienzo(escenario) : null;
    await nuevo?.preparar(); // precarga: no se muestra hasta tener la imagen decodificada
    if (nuevo) this.#contenedor.append(nuevo.elemento);
    this.#lienzo = nuevo;
    // La pantalla de espera queda siempre debajo; solo se desvanece (ver visor.css).
    this.#contenedor.classList.toggle('con-escenario', nuevo !== null);

    await transicion(anterior, nuevo);
    anterior?.elemento.remove();
  }
}

/** Elige la transición según los pines que unen los dos escenarios. */
function transicion(anterior: Lienzo | null, nuevo: Lienzo | null): Promise<void> {
  if (anterior && nuevo && anterior.escenario.id !== nuevo.escenario.id) {
    // Si ambos se apuntan gana el zoom hacia el pin; con varios pines al mismo destino, el primero.
    const pinHacia = anterior.escenario.pines.find((p) => p.destinoId === nuevo.escenario.id);
    if (pinHacia) return zoomHaciaPin(anterior.elemento, nuevo.elemento, pinHacia);
    const pinDesde = nuevo.escenario.pines.find((p) => p.destinoId === anterior.escenario.id);
    if (pinDesde) return zoomDesdePin(anterior.elemento, nuevo.elemento, pinDesde);
  }
  return fundidoCruzado(anterior?.elemento ?? null, nuevo?.elemento ?? null);
}
