import type { CuadriculaDto } from '../../compartido/modelo.js';
import type { EscenarioPublico } from '../../compartido/mensajes.js';
import { aparecer, desvanecer } from './transiciones.js';
import { urlDeImagen } from './urlImagen.js';

const SVG = 'http://www.w3.org/2000/svg';
// Con un tamaño de celda minúsculo sobre una imagen grande saldrían cientos de
// miles de líneas y la página se congelaría. Por encima de esto no se dibuja.
const MAXIMO_LINEAS = 2000;

/**
 * Un escenario dibujado: fondo, cuadrícula y pines dentro de una caja con la
 * proporción de la imagen. Todo va en la misma caja para que las transiciones
 * la muevan junta. La imagen no cambia: otra imagen es otro lienzo (fundido).
 */
export class Lienzo {
  readonly elemento = document.createElement('div');
  readonly #imagen = document.createElement('img');
  readonly #cuadricula = document.createElementNS(SVG, 'svg');
  readonly #lineas = document.createElementNS(SVG, 'path');
  readonly #pines = document.createElement('div');
  // Marcadores en pantalla por posición "x,y" (los pines no tienen id).
  #marcadores = new Map<string, HTMLElement[]>();
  #escenario: EscenarioPublico;
  // Tamaño natural de la imagen: la cuadrícula usa sus píxeles. 0 hasta que carga.
  #ancho = 0;
  #alto = 0;
  // Durante el fundido de salida la cuadrícula aún se ve, pero ya cuenta como oculta.
  #ocultandoCuadricula = false;

  constructor(escenario: EscenarioPublico) {
    this.#escenario = escenario;
    this.elemento.className = 'lienzo';
    this.#imagen.className = 'fondo';
    this.#imagen.alt = '';
    this.#cuadricula.classList.add('cuadricula');
    this.#cuadricula.setAttribute('preserveAspectRatio', 'none');
    this.#cuadricula.setAttribute('hidden', ''); // hasta conocer el tamaño de la imagen
    this.#cuadricula.append(this.#lineas);
    this.#pines.className = 'pines';
    this.elemento.append(this.#imagen, this.#cuadricula, this.#pines);

    this.#imagen.src = urlDeImagen(escenario.imagen);
    this.#dibujarPines(false);
  }

  get escenario(): EscenarioPublico {
    return this.#escenario;
  }

  /** Espera a que la imagen esté cargada y decodificada; si no carga, queda el fondo neutro. */
  async preparar(): Promise<void> {
    try {
      await this.#imagen.decode();
      this.#medirImagen();
    } catch {
      this.elemento.classList.add('imagen-faltante');
    }
    this.#dibujarCuadricula(false);
  }

  /** Mismo escenario e imagen con datos nuevos (cuadrícula o pines). */
  actualizar(escenario: EscenarioPublico): void {
    this.#escenario = escenario;
    this.#dibujarCuadricula(true);
    this.#dibujarPines(true);
  }

  #medirImagen(): void {
    this.#ancho = this.#imagen.naturalWidth;
    this.#alto = this.#imagen.naturalHeight;
    this.elemento.style.setProperty('--ancho', String(this.#ancho));
    this.elemento.style.setProperty('--alto', String(this.#alto));
    this.#cuadricula.setAttribute('viewBox', `0 0 ${this.#ancho} ${this.#alto}`);
  }

  // Mostrar u ocultar la cuadrícula es un fundido; tamaño y desplazamiento cambian directamente.
  #dibujarCuadricula(animar: boolean): void {
    const { cuadricula } = this.#escenario;
    const visible = cuadricula.visible && this.#ancho > 0;
    if (visible) this.#lineas.setAttribute('d', trazarCuadricula(this.#ancho, this.#alto, cuadricula));
    const estabaVisible = !this.#cuadricula.hasAttribute('hidden') && !this.#ocultandoCuadricula;
    if (visible === estabaVisible) return;
    if (visible) {
      this.#ocultandoCuadricula = false;
      this.#cuadricula.removeAttribute('hidden');
      if (animar) aparecer(this.#cuadricula);
    } else if (animar) {
      this.#ocultandoCuadricula = true;
      desvanecer(this.#cuadricula, () => {
        this.#ocultandoCuadricula = false;
        this.#cuadricula.setAttribute('hidden', '');
      });
    } else {
      this.#cuadricula.setAttribute('hidden', '');
    }
  }

  // Reconcilia por posición: el pin que sigue no se toca, el nuevo aparece y el quitado se desvanece.
  #dibujarPines(animar: boolean): void {
    const anteriores = this.#marcadores;
    this.#marcadores = new Map();
    for (const pin of this.#escenario.pines) {
      const clave = `${pin.x},${pin.y}`;
      let marcador = anteriores.get(clave)?.shift();
      if (!marcador) {
        marcador = document.createElement('span');
        marcador.className = 'pin';
        marcador.style.setProperty('left', `${pin.x * 100}%`);
        marcador.style.setProperty('top', `${pin.y * 100}%`);
        this.#pines.append(marcador);
        if (animar) aparecer(marcador, 'translate(-50%, -50%)', true);
      }
      this.#marcadores.set(clave, [...(this.#marcadores.get(clave) ?? []), marcador]);
    }
    for (const marcador of [...anteriores.values()].flat()) {
      desvanecer(marcador, () => marcador.remove());
    }
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
