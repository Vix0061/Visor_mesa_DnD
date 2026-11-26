import type { FiguraPanel } from '../../compartido/mensajes.js';
import type { CambiosFigura } from '../../compartido/modelo.js';
import type { Dialogo } from './Dialogo.js';
import { buscar, ponerValor, rellenarImagenes } from './dom.js';
import type { AccionesPanel } from './VistaPanel.js';

/** Edición de una figura: nombre, imagen y carta. Mismo funcionamiento que FormularioEscenario. */
export class FormularioFigura {
  readonly #raiz: HTMLElement;
  readonly #acciones: AccionesPanel;
  readonly #dialogo: Dialogo;
  readonly #titulo: HTMLElement;
  readonly #tipo: HTMLSelectElement;
  readonly #falta: HTMLElement;
  readonly #nombre: HTMLInputElement;
  readonly #imagen: HTMLSelectElement;
  readonly #conCarta: HTMLInputElement;
  readonly #cartaNombre: HTMLInputElement;
  readonly #cartaDescripcion: HTMLTextAreaElement;
  #figura: FiguraPanel | null = null;
  #imagenes: readonly string[] = [];

  constructor(raiz: HTMLElement, acciones: AccionesPanel, dialogo: Dialogo) {
    this.#raiz = raiz;
    this.#acciones = acciones;
    this.#dialogo = dialogo;
    this.#titulo = buscar(raiz, '[data-campo="titulo"]');
    this.#tipo = buscar(raiz, '[name="tipo"]');
    this.#falta = buscar(raiz, '[data-campo="falta"]');
    this.#nombre = buscar(raiz, '[name="nombre"]');
    this.#imagen = buscar(raiz, '[name="imagen"]');
    this.#conCarta = buscar(raiz, '[name="conCarta"]');
    this.#cartaNombre = buscar(raiz, '[name="cartaNombre"]');
    this.#cartaDescripcion = buscar(raiz, '[name="cartaDescripcion"]');

    this.#nombre.addEventListener('change', () => this.#actualizar({ nombre: this.#nombre.value }));
    // Personaje <-> objeto no descarta nada (solo organiza el panel): sin aviso.
    this.#tipo.addEventListener('change', () => {
      const tipo = this.#tipo.value;
      if (tipo === 'personaje' || tipo === 'objeto') this.#actualizar({ tipo });
    });
    this.#imagen.addEventListener('change', () => this.#actualizar({ imagen: this.#imagen.value }));
    this.#conCarta.addEventListener('change', () => {
      // Al activar la carta se propone el nombre de la figura.
      if (this.#conCarta.checked && !this.#cartaNombre.value) this.#cartaNombre.value = this.#figura?.nombre ?? '';
      this.#cambiarCarta();
    });
    this.#cartaNombre.addEventListener('change', () => this.#cambiarCarta());
    this.#cartaDescripcion.addEventListener('change', () => this.#cambiarCarta());
    buscar(raiz, '[name="borrar"]').addEventListener('click', () => void this.#borrar());
  }

  dibujar(figura: FiguraPanel | null, imagenes: readonly string[]): void {
    const otra = figura?.id !== this.#figura?.id;
    this.#figura = figura;
    this.#imagenes = imagenes;
    this.#raiz.hidden = figura === null;
    if (!figura) return;
    this.#titulo.textContent = figura.nombre || '(sin nombre)';
    ponerValor(this.#tipo, figura.tipo, true);
    this.#falta.hidden = this.#imagenes.includes(figura.imagen);
    ponerValor(this.#nombre, figura.nombre, otra);
    rellenarImagenes(this.#imagen, this.#imagenes, figura.imagen, otra);
    this.#conCarta.checked = figura.carta !== null;
    this.#cartaNombre.disabled = figura.carta === null;
    this.#cartaDescripcion.disabled = figura.carta === null;
    ponerValor(this.#cartaNombre, figura.carta?.nombre ?? '', otra);
    ponerValor(this.#cartaDescripcion, figura.carta?.descripcion ?? '', otra);
  }

  #cambiarCarta(): void {
    this.#actualizar({
      carta: this.#conCarta.checked
        ? { nombre: this.#cartaNombre.value, descripcion: this.#cartaDescripcion.value }
        : null,
    });
  }

  #actualizar(cambios: CambiosFigura): void {
    if (this.#figura) this.#acciones.enviar({ tipo: 'actualizarFigura', id: this.#figura.id, cambios });
  }

  async #borrar(): Promise<void> {
    const figura = this.#figura;
    if (!figura) return;
    const si = await this.#dialogo.confirmar(`¿Borrar la figura «${figura.nombre}»? No se puede deshacer.`, 'Borrar');
    if (si) this.#acciones.enviar({ tipo: 'borrarFigura', id: figura.id });
  }
}
