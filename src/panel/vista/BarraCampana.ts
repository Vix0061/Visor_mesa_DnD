import type { AccionesPanel, EstadoPanel } from './VistaPanel.js';
import { buscar, crear } from './dom.js';

/** Barra superior: abrir campaña, refrescar biblioteca, carpeta, URLs del visor y conexión. */
export class BarraCampana {
  readonly #abrir: HTMLButtonElement;
  readonly #refrescar: HTMLButtonElement;
  readonly #carpeta: HTMLElement;
  readonly #urls: HTMLElement;
  readonly #conexion: HTMLElement;

  constructor(raiz: HTMLElement, acciones: AccionesPanel) {
    this.#abrir = buscar(raiz, '[name="abrir"]');
    this.#refrescar = buscar(raiz, '[name="refrescar"]');
    this.#carpeta = buscar(raiz, '[data-campo="carpeta"]');
    this.#urls = buscar(raiz, '[data-campo="urls"]');
    this.#conexion = buscar(raiz, '[data-campo="conexion"]');
    this.#abrir.addEventListener('click', () => acciones.abrirCampana());
    this.#refrescar.addEventListener('click', () => acciones.enviar({ tipo: 'refrescarBiblioteca' }));
  }

  dibujar(estado: Readonly<EstadoPanel>): void {
    this.#abrir.disabled = !estado.conectado;
    this.#refrescar.disabled = !estado.conectado || estado.campana === null;
    this.#carpeta.textContent = estado.carpeta ?? 'Ninguna campaña abierta';
    this.#carpeta.title = estado.carpeta ?? '';
    const partes: (string | Node)[] = [];
    estado.urls.forEach((url, i) => partes.push(i === 0 ? 'Visor: ' : '  ·  ', crear('strong', '', url)));
    this.#urls.replaceChildren(...partes);
    this.#conexion.textContent = estado.conectado ? 'Conectado' : 'Sin conexión con el servidor';
    this.#conexion.classList.toggle('conectada', estado.conectado);
  }
}
