/** Aviso discreto de que el visor perdió la conexión y está reintentando. */
export class IndicadorConexion {
  readonly #elemento: HTMLElement;

  constructor(elemento: HTMLElement) {
    this.#elemento = elemento;
  }

  mostrar(visible: boolean): void {
    this.#elemento.hidden = !visible;
  }
}
