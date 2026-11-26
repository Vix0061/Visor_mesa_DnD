import type { CuadriculaDto } from '../../compartido/modelo.js';
import type { EscenarioPublico } from '../../compartido/mensajes.js';
import { urlDeImagen } from './urlImagen.js';

const SVG = 'http://www.w3.org/2000/svg';
// Con un tamaño de celda minúsculo sobre una imagen grande saldrían cientos de
// miles de líneas y la página se congelaría. Por encima de esto no se dibuja.
const MAXIMO_LINEAS = 2000;

/**
 * Un escenario dibujado: fondo, cuadrícula y pines dentro de una caja con la
 * proporción de la imagen. Todo va en la misma caja para que, al animarla en
 * la fase 7, se mueva junto.
 */
export class Lienzo {
  readonly elemento = document.createElement('div');
  readonly #imagen = document.createElement('img');
  readonly #cuadricula = document.createElementNS(SVG, 'svg');
  readonly #lineas = document.createElementNS(SVG, 'path');
  readonly #pines = document.createElement('div');
  #escenario: EscenarioPublico;
  // Tamaño natural de la imagen: la cuadrícula usa sus píxeles. 0 hasta que carga.
  #ancho = 0;
  #alto = 0;

  constructor(escenario: EscenarioPublico) {
    this.#escenario = escenario;
    this.elemento.className = 'lienzo';
    this.#imagen.className = 'fondo';
    this.#imagen.alt = '';
    this.#cuadricula.classList.add('cuadricula');
    this.#cuadricula.setAttribute('preserveAspectRatio', 'none');
    this.#cuadricula.append(this.#lineas);
    this.#pines.className = 'pines';
    this.elemento.append(this.#imagen, this.#cuadricula, this.#pines);

    this.#imagen.addEventListener('load', () => this.#alCargarImagen());
    this.#imagen.addEventListener('error', () => this.elemento.classList.add('imagen-faltante'));
    this.#imagen.src = urlDeImagen(escenario.imagen);
    this.#dibujarCuadricula();
    this.#dibujarPines();
  }

  get id(): string {
    return this.#escenario.id;
  }

  /** Mismo escenario con datos nuevos (cuadrícula, pines o imagen). */
  actualizar(escenario: EscenarioPublico): void {
    const imagenAnterior = this.#escenario.imagen;
    this.#escenario = escenario;
    if (escenario.imagen !== imagenAnterior) this.#imagen.src = urlDeImagen(escenario.imagen);
    this.#dibujarCuadricula();
    this.#dibujarPines();
  }

  #alCargarImagen(): void {
    this.elemento.classList.remove('imagen-faltante');
    this.#ancho = this.#imagen.naturalWidth;
    this.#alto = this.#imagen.naturalHeight;
    this.elemento.style.setProperty('--ancho', String(this.#ancho));
    this.elemento.style.setProperty('--alto', String(this.#alto));
    this.#cuadricula.setAttribute('viewBox', `0 0 ${this.#ancho} ${this.#alto}`);
    this.#dibujarCuadricula();
  }

  #dibujarCuadricula(): void {
    const { cuadricula } = this.#escenario;
    const visible = cuadricula.visible && this.#ancho > 0;
    this.#cuadricula.toggleAttribute('hidden', !visible);
    if (visible) this.#lineas.setAttribute('d', trazarCuadricula(this.#ancho, this.#alto, cuadricula));
  }

  #dibujarPines(): void {
    this.#pines.replaceChildren(
      ...this.#escenario.pines.map((pin) => {
        const marcador = document.createElement('span');
        marcador.className = 'pin';
        marcador.style.setProperty('left', `${pin.x * 100}%`);
        marcador.style.setProperty('top', `${pin.y * 100}%`);
        return marcador;
      }),
    );
  }
}

/** Un solo <path> con todas las líneas, en píxeles de la imagen original. */
function trazarCuadricula(ancho: number, alto: number, cuadricula: CuadriculaDto): string {
  const { tamanoCelda: celda, desplazamientoX, desplazamientoY } = cuadricula;
  if (ancho / celda + alto / celda > MAXIMO_LINEAS) return '';
  // El desplazamiento puede ser negativo o mayor que la celda: se lleva a [0, celda).
  const inicio = (desplazamiento: number) => ((desplazamiento % celda) + celda) % celda;
  const partes: string[] = [];
  for (let x = inicio(desplazamientoX); x <= ancho; x += celda) partes.push(`M${x} 0V${alto}`);
  for (let y = inicio(desplazamientoY); y <= alto; y += celda) partes.push(`M0 ${y}H${ancho}`);
  return partes.join('');
}
