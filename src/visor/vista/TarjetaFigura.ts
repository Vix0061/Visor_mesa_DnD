import type { FiguraPublica } from '../../compartido/mensajes.js';
import { urlDeImagen } from './urlImagen.js';

/** Una figura visible: su retrato y, si tiene, su carta de presentación. */
export class TarjetaFigura {
  readonly elemento = document.createElement('figure');
  readonly #retrato = document.createElement('div');
  readonly #imagen = document.createElement('img');
  readonly #carta = document.createElement('figcaption');
  readonly #nombre = document.createElement('h2');
  readonly #descripcion = document.createElement('p');
  #figura: FiguraPublica;

  constructor(figura: FiguraPublica) {
    this.#figura = figura;
    this.elemento.className = 'figura';
    this.#retrato.className = 'retrato';
    this.#imagen.alt = '';
    this.#carta.className = 'carta';
    this.#retrato.append(this.#imagen);
    this.#carta.append(this.#nombre, this.#descripcion);
    this.elemento.append(this.#retrato, this.#carta);

    // Si la imagen no carga, el retrato muestra una silueta (ver visor.css).
    this.#imagen.addEventListener('load', () => this.#retrato.classList.remove('imagen-faltante'));
    this.#imagen.addEventListener('error', () => this.#retrato.classList.add('imagen-faltante'));
    this.#imagen.src = urlDeImagen(figura.imagen);
    this.#mostrarCarta();
  }

  actualizar(figura: FiguraPublica): void {
    const imagenAnterior = this.#figura.imagen;
    this.#figura = figura;
    if (figura.imagen !== imagenAnterior) this.#imagen.src = urlDeImagen(figura.imagen);
    this.#mostrarCarta();
  }

  // textContent, nunca innerHTML: el texto lo escribe el DM y se muestra tal cual.
  #mostrarCarta(): void {
    const { carta } = this.#figura;
    this.#carta.hidden = carta === null;
    this.#nombre.textContent = carta?.nombre ?? '';
    this.#descripcion.textContent = carta?.descripcion ?? '';
    this.#descripcion.hidden = !carta?.descripcion;
  }
}
