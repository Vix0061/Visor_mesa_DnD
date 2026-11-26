import { crear } from './dom.js';

export type TipoAviso = 'error' | 'aviso';

const MAXIMO_EN_PANTALLA = 4;
const DURACION_ERROR_MS = 8000;

/**
 * Mensajes para el DM bajo la barra. Los errores desaparecen solos; los avisos
 * (p. ej. las reparaciones al abrir) se quedan hasta que el DM los cierra.
 */
export class Avisos {
  readonly #raiz: HTMLElement;

  constructor(raiz: HTMLElement) {
    this.#raiz = raiz;
  }

  mostrar(tipo: TipoAviso, texto: string, detalles: readonly string[] = []): void {
    const caja = crear('div', `aviso ${tipo}`);
    caja.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    caja.append(crear('p', '', texto));
    if (detalles.length > 0) {
      const lista = crear('ul');
      lista.append(...detalles.map((detalle) => crear('li', '', detalle)));
      caja.append(lista);
    }
    const cerrar = crear('button', 'cerrar', '×');
    cerrar.type = 'button';
    cerrar.title = 'Cerrar';
    cerrar.addEventListener('click', () => caja.remove());
    caja.append(cerrar);

    this.#raiz.append(caja);
    while (this.#raiz.childElementCount > MAXIMO_EN_PANTALLA) this.#raiz.firstElementChild?.remove();
    if (tipo === 'error') setTimeout(() => caja.remove(), DURACION_ERROR_MS);
  }
}
