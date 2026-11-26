import type { TipoEscenario, TipoFigura } from '../../compartido/modelo.js';
import type { AccionesPanel } from './VistaPanel.js';
import { buscar, crear, miniatura } from './dom.js';

/** Las imágenes de la carpeta. Se elige una y se crea con ella un escenario o una figura. */
export class VistaBiblioteca {
  readonly #base: string;
  readonly #acciones: AccionesPanel;
  readonly #total: HTMLElement;
  readonly #rejilla: HTMLElement;
  readonly #elegidaTexto: HTMLElement;
  readonly #botones: HTMLButtonElement[];
  #imagenes: readonly string[] | null = null;
  #abierta = false;
  #elegida: string | null = null;

  constructor(raiz: HTMLElement, base: string, acciones: AccionesPanel) {
    this.#base = base;
    this.#acciones = acciones;
    this.#total = buscar(raiz, '[data-campo="total"]');
    this.#rejilla = buscar(raiz, '[data-campo="imagenes"]');
    this.#elegidaTexto = buscar(raiz, '[data-campo="elegida"]');
    this.#botones = [
      this.#botonEscenario(raiz, 'zona'),
      this.#botonEscenario(raiz, 'region'),
      this.#botonFigura(raiz, 'personaje'),
      this.#botonFigura(raiz, 'objeto'),
    ];
  }

  dibujar(abierta: boolean, imagenes: readonly string[]): void {
    // El controlador solo cambia la lista al recibir `biblioteca`: si es la
    // misma, no se rehacen cientos de miniaturas en cada cambio de estado.
    if (imagenes !== this.#imagenes || abierta !== this.#abierta) {
      this.#imagenes = imagenes;
      this.#abierta = abierta;
      if (this.#elegida !== null && !imagenes.includes(this.#elegida)) this.#elegida = null;
      this.#rehacerRejilla();
    }
    this.#total.textContent = abierta ? `(${imagenes.length})` : '';
    this.#marcarElegida();
  }

  #rehacerRejilla(): void {
    const imagenes = this.#imagenes ?? [];
    if (!this.#abierta) {
      this.#rejilla.replaceChildren(crear('p', '', 'Abre una campaña para ver sus imágenes.'));
      return;
    }
    if (imagenes.length === 0) {
      this.#rejilla.replaceChildren(
        crear('p', '', 'La carpeta no tiene imágenes. Copia algunas en ella y pulsa «Refrescar biblioteca».'),
      );
      return;
    }
    this.#rejilla.replaceChildren(
      ...imagenes.map((ruta) => {
        const boton = crear('button', 'imagen');
        boton.type = 'button';
        boton.title = ruta;
        boton.dataset.ruta = ruta;
        boton.append(miniatura(this.#base, ruta, false), crear('span', '', ruta.split('/').pop() ?? ruta));
        boton.addEventListener('click', () => {
          this.#elegida = ruta;
          this.#marcarElegida();
        });
        return boton;
      }),
    );
  }

  #marcarElegida(): void {
    for (const boton of this.#rejilla.querySelectorAll<HTMLElement>('.imagen')) {
      boton.classList.toggle('elegida', boton.dataset.ruta === this.#elegida);
    }
    this.#elegidaTexto.textContent = this.#elegida ?? 'Elige una imagen para crear con ella:';
    for (const boton of this.#botones) boton.disabled = this.#elegida === null;
  }

  #botonEscenario(raiz: HTMLElement, tipoEscenario: TipoEscenario): HTMLButtonElement {
    const boton = buscar<HTMLButtonElement>(raiz, `[data-crear="${tipoEscenario}"]`);
    boton.addEventListener('click', () => {
      if (this.#elegida) this.#acciones.enviar({ tipo: 'crearEscenario', imagen: this.#elegida, tipoEscenario });
    });
    return boton;
  }

  #botonFigura(raiz: HTMLElement, tipoFigura: TipoFigura): HTMLButtonElement {
    const boton = buscar<HTMLButtonElement>(raiz, `[data-crear="${tipoFigura}"]`);
    boton.addEventListener('click', () => {
      if (this.#elegida) this.#acciones.enviar({ tipo: 'crearFigura', imagen: this.#elegida, tipoFigura });
    });
    return boton;
  }
}
