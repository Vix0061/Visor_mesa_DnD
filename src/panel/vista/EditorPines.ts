import type { EscenarioDto, PinDto } from '../../compartido/modelo.js';
import { buscar, crear, urlDeImagen } from './dom.js';

/**
 * Editor de los pines de una región. Clic sobre la imagen = pin nuevo hacia el
 * destino elegido; cada pin de la lista puede cambiar de destino o quitarse.
 * No envía mensajes: entrega la lista completa nueva a `alCambiar` (el
 * formulario la manda al servidor) y se redibuja cuando llega el estado.
 */
export class EditorPines {
  readonly #base: string;
  readonly #alCambiar: (pines: PinDto[]) => void;
  readonly #lamina: HTMLElement;
  readonly #destinoNuevo: HTMLSelectElement;
  readonly #ayuda: HTMLElement;
  readonly #lista: HTMLElement;
  #pines: readonly PinDto[] = [];
  #destinos: readonly EscenarioDto[] = [];
  /** Lo último dibujado: si no cambia, no se toca el DOM (no cierra un desplegable abierto). */
  #firma = '';
  #firmaImagen = '';

  constructor(raiz: HTMLElement, base: string, alCambiar: (pines: PinDto[]) => void) {
    this.#base = base;
    this.#alCambiar = alCambiar;
    this.#lamina = buscar(raiz, '[data-campo="lamina"]');
    this.#destinoNuevo = buscar(raiz, '[name="destinoNuevo"]');
    this.#ayuda = buscar(raiz, '[data-campo="ayuda"]');
    this.#lista = buscar(raiz, '[data-campo="lista"]');
    this.#lamina.addEventListener('click', (evento) => this.#colocar(evento));
  }

  /** `destinos`: los demás escenarios (cualquier tipo). */
  dibujar(escenario: EscenarioDto, destinos: readonly EscenarioDto[], falta: boolean): void {
    this.#pines = escenario.pines;
    this.#destinos = destinos;
    const firmaImagen = JSON.stringify([escenario.imagen, falta]);
    if (firmaImagen !== this.#firmaImagen) {
      this.#firmaImagen = firmaImagen;
      this.#lamina.replaceChildren(this.#superficie(escenario.imagen, falta));
      this.#firma = ''; // los marcadores se han ido con la lámina
    }
    const firma = JSON.stringify([escenario.pines, destinos.map((d) => [d.id, d.nombre])]);
    if (firma === this.#firma) return;
    this.#firma = firma;

    const elegido = this.#destinoNuevo.value;
    this.#destinoNuevo.replaceChildren(...this.#opcionesDestino());
    if (destinos.some((d) => d.id === elegido)) this.#destinoNuevo.value = elegido;
    this.#destinoNuevo.disabled = destinos.length === 0;
    this.#lamina.classList.toggle('inactiva', destinos.length === 0);
    this.#ayuda.textContent =
      destinos.length === 0
        ? 'Crea otro escenario para poder poner pines hacia él.'
        : 'Haz clic en la imagen para poner un pin hacia el destino elegido.';

    // Marcadores sobre la imagen, numerados como la lista.
    this.#lamina.querySelectorAll('.pin').forEach((pin) => pin.remove());
    this.#pines.forEach((pin, i) => {
      const marcador = crear('span', 'pin', String(i + 1));
      marcador.style.setProperty('--x', String(pin.x));
      marcador.style.setProperty('--y', String(pin.y));
      this.#lamina.append(marcador);
    });

    this.#lista.replaceChildren(...this.#pines.map((pin, i) => this.#fila(pin, i)));
  }

  #superficie(imagen: string, falta: boolean): HTMLElement {
    if (falta) return crear('div', 'sin-imagen superficie');
    const img = crear('img', 'superficie');
    img.src = urlDeImagen(this.#base, imagen);
    img.alt = '';
    img.draggable = false;
    return img;
  }

  #opcionesDestino(): HTMLOptionElement[] {
    return this.#destinos.map(
      (d) => new Option(`${d.nombre || '(sin nombre)'} (${d.tipo === 'region' ? 'región' : 'zona'})`, d.id),
    );
  }

  #fila(pin: PinDto, indice: number): HTMLLIElement {
    const destino = crear('select');
    destino.title = 'Destino del pin';
    destino.append(...this.#opcionesDestino());
    destino.value = pin.destinoId;
    destino.addEventListener('change', () =>
      this.#enviar(this.#pines.map((p, i) => (i === indice ? { ...p, destinoId: destino.value } : { ...p }))),
    );

    const quitar = crear('button', '', '×');
    quitar.type = 'button';
    quitar.title = 'Quitar este pin';
    quitar.addEventListener('click', () => this.#enviar(this.#pines.filter((_, i) => i !== indice).map((p) => ({ ...p }))));

    const fila = crear('li');
    fila.append(crear('span', 'numero', String(indice + 1)), destino, quitar);
    return fila;
  }

  #colocar(evento: MouseEvent): void {
    const superficie = this.#lamina.querySelector('.superficie');
    const destinoId = this.#destinoNuevo.value;
    if (!superficie || !destinoId) return;
    const caja = superficie.getBoundingClientRect();
    // Coordenadas 0..1 sobre la imagen; 4 decimales sobran para cualquier pantalla.
    const relativa = (valor: number, inicio: number, tamano: number) =>
      Math.round(Math.min(1, Math.max(0, (valor - inicio) / tamano)) * 10000) / 10000;
    const nuevo: PinDto = {
      x: relativa(evento.clientX, caja.left, caja.width),
      y: relativa(evento.clientY, caja.top, caja.height),
      destinoId,
    };
    this.#enviar([...this.#pines.map((p) => ({ ...p })), nuevo]);
  }

  #enviar(pines: PinDto[]): void {
    // El siguiente dibujo rehace todo aunque el estado no cambie: si el
    // servidor rechaza el cambio, los controles vuelven a lo guardado.
    this.#firma = '';
    this.#alCambiar(pines);
  }
}
