import type { CampanaPanel, FiguraPanel } from '../../compartido/mensajes.js';
import type { EscenarioDto } from '../../compartido/modelo.js';
import type { AccionesPanel, Seleccion } from './VistaPanel.js';
import { crear, miniatura } from './dom.js';

const NOMBRE_TIPO = { zona: 'Zona', region: 'Región', personaje: 'Personaje', objeto: 'Objeto' } as const;

/** Listas de escenarios y figuras con los controles de juego (mostrar escenario, figura en pantalla). */
export class ListaEntidades {
  readonly #escenarios: HTMLElement;
  readonly #figuras: HTMLElement;
  readonly #base: string;
  readonly #acciones: AccionesPanel;

  constructor(escenarios: HTMLElement, figuras: HTMLElement, base: string, acciones: AccionesPanel) {
    this.#escenarios = escenarios;
    this.#figuras = figuras;
    this.#base = base;
    this.#acciones = acciones;
  }

  dibujar(campana: CampanaPanel | null, seleccion: Seleccion | null, disponibles: ReadonlySet<string>): void {
    if (!campana) {
      this.#escenarios.replaceChildren(crear('p', '', 'Sin campaña abierta.'));
      this.#figuras.replaceChildren();
      return;
    }
    const elegida = (clase: Seleccion['clase'], id: string) => seleccion?.clase === clase && seleccion.id === id;
    this.#escenarios.replaceChildren(
      ...(campana.escenarios.length > 0
        ? campana.escenarios.map((e) => this.#filaEscenario(e, campana, elegida('escenario', e.id), disponibles))
        : [crear('p', '', 'Ninguno todavía: crea uno desde la biblioteca.')]),
    );
    this.#figuras.replaceChildren(
      ...(campana.figuras.length > 0
        ? campana.figuras.map((f) => this.#filaFigura(f, elegida('figura', f.id), disponibles))
        : [crear('p', '', 'Ninguna todavía: crea una desde la biblioteca.')]),
    );
  }

  #filaEscenario(e: EscenarioDto, campana: CampanaPanel, seleccionada: boolean, disponibles: ReadonlySet<string>) {
    const activo = campana.escenarioActivoId === e.id;
    const etiquetas = [etiqueta(NOMBRE_TIPO[e.tipo])];
    if (campana.regionInicialId === e.id) etiquetas.push(etiqueta('Inicial'));
    if (activo) etiquetas.push(etiqueta('En el visor', 'activo'));

    const mostrar = crear('button', '', activo ? 'Mostrado' : 'Mostrar');
    mostrar.type = 'button';
    mostrar.disabled = activo;
    mostrar.title = 'Mostrar este escenario en el visor';
    mostrar.addEventListener('click', () => this.#acciones.enviar({ tipo: 'activarEscenario', id: e.id }));

    return this.#fila({ clase: 'escenario', id: e.id }, e.nombre, e.imagen, seleccionada, disponibles, etiquetas, mostrar);
  }

  #filaFigura(f: FiguraPanel, seleccionada: boolean, disponibles: ReadonlySet<string>) {
    const etiquetas = [etiqueta(NOMBRE_TIPO[f.tipo])];
    if (f.visible) etiquetas.push(etiqueta('En pantalla', 'activo'));

    const casilla = crear('input');
    casilla.type = 'checkbox';
    casilla.checked = f.visible;
    // No se cambia aquí: se envía y la casilla se redibuja con el estado que
    // devuelva el servidor (que puede rechazarlo por el límite de 4).
    casilla.addEventListener('change', () =>
      this.#acciones.enviar({ tipo: 'cambiarVisibilidadFigura', id: f.id, visible: casilla.checked }),
    );
    const control = crear('label');
    control.append(casilla, 'Visible');

    return this.#fila({ clase: 'figura', id: f.id }, f.nombre, f.imagen, seleccionada, disponibles, etiquetas, control);
  }

  #fila(
    seleccion: Seleccion,
    nombre: string,
    imagen: string,
    seleccionada: boolean,
    disponibles: ReadonlySet<string>,
    etiquetas: HTMLElement[],
    control: HTMLElement,
  ): HTMLLIElement {
    const falta = !disponibles.has(imagen);
    if (falta) etiquetas.push(etiqueta('Imagen faltante', 'falta'));

    const elegir = crear('button', 'elegir');
    elegir.type = 'button';
    const texto = crear('span', 'nombre', nombre || '(sin nombre)');
    const lineaEtiquetas = crear('span', 'etiquetas');
    lineaEtiquetas.append(...etiquetas);
    elegir.append(texto, lineaEtiquetas);
    elegir.addEventListener('click', () => this.#acciones.seleccionar(seleccion));

    const fila = crear('li', seleccionada ? 'fila seleccionada' : 'fila');
    fila.append(miniatura(this.#base, imagen, falta), elegir, control);
    return fila;
  }
}

function etiqueta(texto: string, clase = ''): HTMLElement {
  return crear('span', `etiqueta ${clase}`.trim(), texto);
}
