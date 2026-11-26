import type { CampanaPanel, MensajePanel } from '../../compartido/mensajes.js';
import { Avisos, type TipoAviso } from './Avisos.js';
import { BarraCampana } from './BarraCampana.js';
import { Dialogo } from './Dialogo.js';
import { buscar } from './dom.js';
import { FormularioEscenario } from './FormularioEscenario.js';
import { FormularioFigura } from './FormularioFigura.js';
import { ListaEntidades } from './ListaEntidades.js';
import { VistaBiblioteca } from './VistaBiblioteca.js';

export interface Seleccion {
  clase: 'escenario' | 'figura';
  id: string;
}

/** Todo lo que el panel dibuja. Lo mantiene el controlador. */
export interface EstadoPanel {
  conectado: boolean;
  urls: readonly string[];
  carpeta: string | null;
  campana: CampanaPanel | null;
  imagenes: readonly string[];
  seleccion: Seleccion | null;
}

/** Lo que la vista pide al controlador cuando el DM actúa. */
export interface AccionesPanel {
  enviar(mensaje: MensajePanel): void;
  abrirCampana(): void;
  seleccionar(seleccion: Seleccion): void;
}

/**
 * Raíz de la vista del panel. Único camino de dibujo: `dibujar` recibe el
 * estado completo y cada parte se pone al día a partir de él.
 */
export class VistaPanel {
  readonly #barra: BarraCampana;
  readonly #biblioteca: VistaBiblioteca;
  readonly #lista: ListaEntidades;
  readonly #formEscenario: FormularioEscenario;
  readonly #formFigura: FormularioFigura;
  readonly #sinSeleccion: HTMLElement;
  readonly #avisos: Avisos;
  readonly #dialogo: Dialogo;

  /** `base`: URL HTTP del servidor (visor integrado y miniaturas). */
  constructor(documento: Document, base: string, acciones: AccionesPanel) {
    this.#dialogo = new Dialogo(buscar(documento, '#dialogo'));
    this.#avisos = new Avisos(buscar(documento, '#avisos'));
    this.#barra = new BarraCampana(buscar(documento, '#barra'), acciones);
    this.#biblioteca = new VistaBiblioteca(buscar(documento, '#biblioteca'), base, acciones);
    this.#lista = new ListaEntidades(
      buscar(documento, '#lista-escenarios'),
      buscar(documento, '#lista-figuras'),
      base,
      acciones,
    );
    this.#formEscenario = new FormularioEscenario(buscar(documento, '#form-escenario'), base, acciones, this.#dialogo);
    this.#formFigura = new FormularioFigura(buscar(documento, '#form-figura'), acciones, this.#dialogo);
    this.#sinSeleccion = buscar(documento, '#sin-seleccion');
    buscar<HTMLIFrameElement>(documento, '#visor').src = `${base}/`;
  }

  dibujar(estado: Readonly<EstadoPanel>): void {
    const { campana, seleccion, imagenes } = estado;
    const disponibles = new Set(imagenes);
    const escenario =
      seleccion?.clase === 'escenario' ? campana?.escenarios.find((e) => e.id === seleccion.id) : undefined;
    const figura = seleccion?.clase === 'figura' ? campana?.figuras.find((f) => f.id === seleccion.id) : undefined;

    this.#barra.dibujar(estado);
    this.#biblioteca.dibujar(campana !== null, imagenes);
    this.#lista.dibujar(campana, seleccion, disponibles);
    this.#formEscenario.dibujar(escenario ?? null, campana, imagenes);
    this.#formFigura.dibujar(figura ?? null, imagenes);
    this.#sinSeleccion.hidden = campana === null || escenario !== undefined || figura !== undefined;
  }

  avisar(tipo: TipoAviso, texto: string, detalles: readonly string[] = []): void {
    this.#avisos.mostrar(tipo, texto, detalles);
  }

  confirmar(texto: string, textoAceptar?: string): Promise<boolean> {
    return this.#dialogo.confirmar(texto, textoAceptar);
  }
}
