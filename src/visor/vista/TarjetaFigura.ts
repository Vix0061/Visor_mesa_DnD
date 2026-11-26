import type { FiguraPublica } from '../../compartido/mensajes.js';
import { fundir } from './transiciones.js';
import { urlDeImagen } from './urlImagen.js';

/** Una figura visible: su retrato y, si tiene, su carta de presentación. */
export class TarjetaFigura {
  readonly elemento = document.createElement('figure');
  readonly #retrato = document.createElement('div');
  #imagen: HTMLImageElement;
  readonly #carta = document.createElement('figcaption');
  readonly #nombre = document.createElement('h2');
  readonly #descripcion = document.createElement('p');
  #figura: FiguraPublica;

  constructor(figura: FiguraPublica) {
    this.#figura = figura;
    this.elemento.className = 'figura';
    this.#retrato.className = 'retrato';
    this.#carta.className = 'carta';
    this.#imagen = crearImagen(figura.imagen);
    this.#retrato.append(this.#imagen);
    this.#carta.append(this.#nombre, this.#descripcion);
    this.elemento.append(this.#retrato, this.#carta);
    this.#mostrarCarta();
  }

  get id(): string {
    return this.#figura.id;
  }

  /** Precarga: espera a que la imagen esté decodificada; si no carga, el retrato muestra una silueta. */
  async preparar(): Promise<void> {
    this.#retrato.classList.toggle('imagen-faltante', !(await decodificar(this.#imagen)));
  }

  /** Cambio de carta o de imagen: fundido breve, sin mover la tarjeta. Sin cambios, no hace nada. */
  async actualizar(figura: FiguraPublica): Promise<void> {
    const anterior = this.#figura;
    this.#figura = figura;
    await Promise.all([
      figura.imagen !== anterior.imagen && this.#cambiarImagen(),
      JSON.stringify(figura.carta) !== JSON.stringify(anterior.carta) && this.#cambiarCarta(),
    ]);
  }

  async #cambiarImagen(): Promise<void> {
    const nueva = crearImagen(this.#figura.imagen);
    const cargada = await decodificar(nueva); // la nueva se precarga mientras se ve la anterior
    await fundir(this.#retrato, 1, 0);
    this.#imagen.replaceWith(nueva);
    this.#imagen = nueva;
    this.#retrato.classList.toggle('imagen-faltante', !cargada);
    await fundir(this.#retrato, 0, 1);
  }

  async #cambiarCarta(): Promise<void> {
    if (!this.#carta.hidden) await fundir(this.#carta, 1, 0);
    this.#mostrarCarta();
    if (!this.#carta.hidden) await fundir(this.#carta, 0, 1);
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

function crearImagen(ruta: string): HTMLImageElement {
  const imagen = document.createElement('img');
  imagen.alt = '';
  imagen.src = urlDeImagen(ruta);
  return imagen;
}

async function decodificar(imagen: HTMLImageElement): Promise<boolean> {
  try {
    await imagen.decode();
    return true;
  } catch {
    return false;
  }
}
