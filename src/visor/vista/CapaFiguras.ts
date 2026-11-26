import type { FiguraPublica } from '../../compartido/mensajes.js';
import { TarjetaFigura } from './TarjetaFigura.js';
import { deslizar, entrarFigura, salirFigura } from './transiciones.js';

/**
 * Capa 2: la fila de figuras visibles, en orden de activación. Reconcilia por
 * id y anima: las nuevas entran (tras precargar su imagen), las que se van
 * salen, y las que siguen se deslizan a su sitio nuevo (FLIP). Como la capa de
 * escenario, procesa en serie y guarda solo el último objetivo. Es
 * independiente del escenario: cambiar de escenario no la toca.
 */
export class CapaFiguras {
  readonly #fila: HTMLElement;
  readonly #tarjetas = new Map<string, TarjetaFigura>();
  #objetivo: FiguraPublica[] | undefined = undefined;
  #ocupada = false;

  constructor(fila: HTMLElement) {
    this.#fila = fila;
  }

  mostrar(figuras: FiguraPublica[]): void {
    this.#objetivo = figuras;
    if (!this.#ocupada) void this.#procesar();
  }

  async #procesar(): Promise<void> {
    this.#ocupada = true;
    while (this.#objetivo !== undefined) {
      const figuras = this.#objetivo;
      this.#objetivo = undefined;
      try {
        await this.#ir(figuras);
      } catch (error) {
        console.error('Fallo al animar las figuras:', error);
      }
    }
    this.#ocupada = false;
  }

  async #ir(figuras: FiguraPublica[]): Promise<void> {
    const nuevas = figuras.filter((f) => !this.#tarjetas.has(f.id)).map((f) => new TarjetaFigura(f));
    await Promise.all(nuevas.map((t) => t.preparar())); // precarga antes de mostrar nada

    // FLIP, "first": dónde está cada tarjeta antes del cambio.
    const antes = new Map([...this.#tarjetas].map(([id, t]) => [id, t.elemento.getBoundingClientRect()]));
    const animaciones: Promise<unknown>[] = [];

    // Las que salen se sacan del flujo en su sitio: la fila se recoloca mientras se desvanecen.
    const caja = this.#fila.getBoundingClientRect();
    const siguen = new Set(figuras.map((f) => f.id));
    for (const [id, tarjeta] of this.#tarjetas) {
      if (siguen.has(id)) continue;
      const rect = antes.get(id)!;
      tarjeta.elemento.classList.add('saliendo');
      tarjeta.elemento.style.setProperty('left', `${rect.left - caja.left}px`);
      tarjeta.elemento.style.setProperty('top', `${rect.top - caja.top}px`);
      this.#tarjetas.delete(id);
      animaciones.push(salirFigura(tarjeta.elemento).then(() => tarjeta.elemento.remove()));
    }

    for (const tarjeta of nuevas) this.#tarjetas.set(tarjeta.id, tarjeta);
    // append mueve una tarjeta que ya está en la fila: así queda el orden recibido.
    for (const figura of figuras) this.#fila.append(this.#tarjetas.get(figura.id)!.elemento);

    // "last" + "invert" + "play": cada tarjeta que sigue parte de donde estaba.
    for (const figura of figuras) {
      const tarjeta = this.#tarjetas.get(figura.id)!;
      const previo = antes.get(figura.id);
      if (!previo) {
        animaciones.push(entrarFigura(tarjeta.elemento));
        continue;
      }
      const ahora = tarjeta.elemento.getBoundingClientRect();
      const dx = previo.left - ahora.left;
      const dy = previo.top - ahora.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animaciones.push(deslizar(tarjeta.elemento, dx, dy));
      animaciones.push(tarjeta.actualizar(figura));
    }
    await Promise.all(animaciones);
  }
}
