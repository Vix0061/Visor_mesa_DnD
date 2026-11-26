import { buscar } from './dom.js';

/**
 * Confirmación modal con <dialog>. No se usa window.confirm porque en
 * Electron para Windows deja los campos de texto sin poder recibir el foco
 * hasta que la ventana lo pierde y lo recupera.
 */
export class Dialogo {
  readonly #dialogo: HTMLDialogElement;
  readonly #texto: HTMLElement;
  readonly #aceptar: HTMLButtonElement;

  constructor(dialogo: HTMLDialogElement) {
    this.#dialogo = dialogo;
    this.#texto = buscar(dialogo, '[data-campo="texto"]');
    this.#aceptar = buscar(dialogo, '[data-campo="aceptar"]');
  }

  /** true si el DM acepta; Cancelar o Escape dan false. */
  confirmar(texto: string, textoAceptar = 'Aceptar'): Promise<boolean> {
    if (this.#dialogo.open) return Promise.resolve(false);
    this.#texto.textContent = texto;
    this.#aceptar.textContent = textoAceptar;
    this.#dialogo.returnValue = '';
    this.#dialogo.showModal();
    return new Promise((resolver) => {
      this.#dialogo.addEventListener('close', () => resolver(this.#dialogo.returnValue === 'si'), { once: true });
    });
  }
}
