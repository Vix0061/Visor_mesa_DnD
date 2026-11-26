import type { CampanaPanel } from '../../compartido/mensajes.js';
import type { CambiosEscenario, EscenarioDto } from '../../compartido/modelo.js';
import type { Dialogo } from './Dialogo.js';
import { buscar, ponerValor, rellenarImagenes } from './dom.js';
import { EditorPines } from './EditorPines.js';
import type { AccionesPanel } from './VistaPanel.js';

/**
 * Edición de un escenario. Cada campo se envía al confirmarse (evento
 * `change`: al salir del campo o pulsar Intro); lo que se ve después es el
 * estado que devuelve el servidor, que es quien valida las reglas.
 */
export class FormularioEscenario {
  readonly #raiz: HTMLElement;
  readonly #acciones: AccionesPanel;
  readonly #dialogo: Dialogo;
  readonly #titulo: HTMLElement;
  readonly #nombre: HTMLInputElement;
  readonly #tipo: HTMLSelectElement;
  readonly #imagen: HTMLSelectElement;
  readonly #falta: HTMLElement;
  readonly #cuadriculaVisible: HTMLInputElement;
  readonly #tamanoCelda: HTMLInputElement;
  readonly #desplazamientoX: HTMLInputElement;
  readonly #desplazamientoY: HTMLInputElement;
  readonly #seccionPines: HTMLElement;
  readonly #editorPines: EditorPines;
  readonly #inicial: HTMLButtonElement;
  readonly #activar: HTMLButtonElement;
  #escenario: EscenarioDto | null = null;
  #campana: CampanaPanel | null = null;
  #imagenes: readonly string[] = [];

  constructor(raiz: HTMLElement, base: string, acciones: AccionesPanel, dialogo: Dialogo) {
    this.#raiz = raiz;
    this.#acciones = acciones;
    this.#dialogo = dialogo;
    this.#titulo = buscar(raiz, '[data-campo="titulo"]');
    this.#nombre = buscar(raiz, '[name="nombre"]');
    this.#tipo = buscar(raiz, '[name="tipo"]');
    this.#imagen = buscar(raiz, '[name="imagen"]');
    this.#falta = buscar(raiz, '[data-campo="falta"]');
    this.#cuadriculaVisible = buscar(raiz, '[name="cuadriculaVisible"]');
    this.#tamanoCelda = buscar(raiz, '[name="tamanoCelda"]');
    this.#desplazamientoX = buscar(raiz, '[name="desplazamientoX"]');
    this.#desplazamientoY = buscar(raiz, '[name="desplazamientoY"]');
    this.#seccionPines = buscar(raiz, '#editor-pines');
    this.#editorPines = new EditorPines(this.#seccionPines, base, (pines) => this.#actualizar({ pines }));
    this.#inicial = buscar(raiz, '[name="inicial"]');
    this.#activar = buscar(raiz, '[name="activar"]');

    this.#nombre.addEventListener('change', () => this.#actualizar({ nombre: this.#nombre.value }));
    this.#tipo.addEventListener('change', () => void this.#cambiarTipo());
    this.#imagen.addEventListener('change', () => this.#actualizar({ imagen: this.#imagen.value }));
    for (const campo of [this.#cuadriculaVisible, this.#tamanoCelda, this.#desplazamientoX, this.#desplazamientoY]) {
      campo.addEventListener('change', () => this.#cambiarCuadricula());
    }
    this.#inicial.addEventListener('click', () => {
      if (this.#escenario) this.#acciones.enviar({ tipo: 'marcarRegionInicial', id: this.#escenario.id });
    });
    this.#activar.addEventListener('click', () => {
      if (this.#escenario) this.#acciones.enviar({ tipo: 'activarEscenario', id: this.#escenario.id });
    });
    buscar(raiz, '[name="borrar"]').addEventListener('click', () => void this.#borrar());
  }

  dibujar(escenario: EscenarioDto | null, campana: CampanaPanel | null, imagenes: readonly string[]): void {
    const otro = escenario?.id !== this.#escenario?.id;
    this.#escenario = escenario;
    this.#campana = campana;
    this.#imagenes = imagenes;
    this.#raiz.hidden = escenario === null;
    if (!escenario) return;
    this.#rellenar(otro);
  }

  #rellenar(forzar: boolean): void {
    const e = this.#escenario;
    if (!e) return;
    const falta = !this.#imagenes.includes(e.imagen);
    this.#titulo.textContent = e.nombre || '(sin nombre)';
    ponerValor(this.#nombre, e.nombre, forzar);
    ponerValor(this.#tipo, e.tipo, true);
    rellenarImagenes(this.#imagen, this.#imagenes, e.imagen, forzar);
    this.#falta.hidden = !falta;
    this.#cuadriculaVisible.checked = e.cuadricula.visible;
    ponerValor(this.#tamanoCelda, String(e.cuadricula.tamanoCelda), forzar);
    ponerValor(this.#desplazamientoX, String(e.cuadricula.desplazamientoX), forzar);
    ponerValor(this.#desplazamientoY, String(e.cuadricula.desplazamientoY), forzar);

    const esRegion = e.tipo === 'region';
    this.#seccionPines.hidden = !esRegion;
    if (esRegion) {
      this.#editorPines.dibujar(e, this.#campana?.escenarios.filter((o) => o.id !== e.id) ?? [], falta);
    }

    const esInicial = this.#campana?.regionInicialId === e.id;
    this.#inicial.hidden = !esRegion;
    this.#inicial.disabled = esInicial;
    this.#inicial.textContent = esInicial ? 'Es la región inicial' : 'Marcar como región inicial';
    const activo = this.#campana?.escenarioActivoId === e.id;
    this.#activar.disabled = activo;
    this.#activar.textContent = activo ? 'Se está mostrando en el visor' : 'Mostrar en el visor';
  }

  /** Pasar a zona descarta los pines: se avisa antes. Pasar a región no descarta nada. */
  async #cambiarTipo(): Promise<void> {
    const e = this.#escenario;
    const tipo = this.#tipo.value;
    if (!e || (tipo !== 'zona' && tipo !== 'region')) return;
    if (tipo === 'zona' && e.pines.length > 0) {
      const si = await this.#dialogo.confirmar(
        `Al pasar «${e.nombre}» a zona ${seDescartanPines(e.pines.length)}. ¿Continuar?`,
        'Pasar a zona',
      );
      if (!si) {
        this.#rellenar(true);
        return;
      }
    }
    this.#acciones.enviar({ tipo: 'actualizarEscenario', id: e.id, cambios: { tipo } });
  }

  #cambiarCuadricula(): void {
    const tamanoCelda = this.#tamanoCelda.valueAsNumber;
    const desplazamientoX = this.#desplazamientoX.valueAsNumber;
    const desplazamientoY = this.#desplazamientoY.valueAsNumber;
    // Un campo numérico vacío da NaN: no se envía y se vuelve al valor guardado.
    // El rango (celda > 0) lo valida el servidor.
    if (![tamanoCelda, desplazamientoX, desplazamientoY].every(Number.isFinite)) {
      this.#rellenar(true);
      return;
    }
    this.#actualizar({
      cuadricula: { visible: this.#cuadriculaVisible.checked, tamanoCelda, desplazamientoX, desplazamientoY },
    });
  }

  #actualizar(cambios: CambiosEscenario): void {
    if (this.#escenario) this.#acciones.enviar({ tipo: 'actualizarEscenario', id: this.#escenario.id, cambios });
  }

  /** Avisa también de los pines de otras regiones que llevan a este escenario: se borran con él. */
  async #borrar(): Promise<void> {
    const e = this.#escenario;
    if (!e) return;
    const origenes = (this.#campana?.escenarios ?? []).filter((o) => o.pines.some((p) => p.destinoId === e.id));
    const pines = origenes.length
      ? `\n\nTambién se quitarán los pines que llevan a él desde: ${origenes.map((o) => `«${o.nombre}»`).join(', ')}.`
      : '';
    const si = await this.#dialogo.confirmar(`¿Borrar el escenario «${e.nombre}»? No se puede deshacer.${pines}`, 'Borrar');
    if (si) this.#acciones.enviar({ tipo: 'borrarEscenario', id: e.id });
  }
}

function seDescartanPines(n: number): string {
  return n === 1 ? 'se descartará su pin' : `se descartarán sus ${n} pines`;
}
