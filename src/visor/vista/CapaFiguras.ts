import type { FiguraPublica } from '../../compartido/mensajes.js';
import { TarjetaFigura } from './TarjetaFigura.js';

/**
 * Capa 2: la fila de figuras visibles, en orden de activación. Reconcilia por
 * id: conserva las tarjetas que siguen, crea las nuevas y quita las que salen.
 * Es independiente del escenario: cambiar de escenario no la toca.
 */
export class CapaFiguras {
  readonly #fila: HTMLElement;
  readonly #tarjetas = new Map<string, TarjetaFigura>();

  constructor(fila: HTMLElement) {
    this.#fila = fila;
  }

  mostrar(figuras: FiguraPublica[]): void {
    const siguen = new Set(figuras.map((f) => f.id));
    for (const [id, tarjeta] of this.#tarjetas) {
      if (!siguen.has(id)) {
        tarjeta.elemento.remove();
        this.#tarjetas.delete(id);
      }
    }
    for (const figura of figuras) {
      let tarjeta = this.#tarjetas.get(figura.id);
      if (tarjeta) {
        tarjeta.actualizar(figura);
      } else {
        tarjeta = new TarjetaFigura(figura);
        this.#tarjetas.set(figura.id, tarjeta);
      }
      // append mueve un elemento que ya está en la fila: así queda el orden recibido.
      this.#fila.append(tarjeta.elemento);
    }
  }
}
