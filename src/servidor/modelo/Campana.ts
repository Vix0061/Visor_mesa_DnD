import { randomUUID } from 'node:crypto';
import type {
  CambiosEscenario,
  CambiosFigura,
  CampanaDto,
  TipoEscenario,
  TipoFigura,
} from '../../compartido/modelo.js';
import { ErrorDominio } from './ErrorDominio.js';
import { Escenario, MENSAJE_DESTINO_INEXISTENTE } from './Escenario.js';
import { Figura } from './Figura.js';

export const MAXIMO_FIGURAS_VISIBLES = 4;

/**
 * Raíz del modelo: guarda las reglas que involucran a varias entidades
 * (región inicial, escenario activo, límite de figuras, destinos de pines).
 * Invariante: regionInicialId es null si y solo si no hay regiones.
 */
export class Campana {
  #escenarios: Escenario[];
  #figuras: Figura[];
  #regionInicialId: string | null;
  #escenarioActivoId: string | null;
  #figurasVisibles: string[];

  private constructor(
    escenarios: Escenario[],
    figuras: Figura[],
    regionInicialId: string | null,
    escenarioActivoId: string | null,
    figurasVisibles: string[],
  ) {
    this.#escenarios = escenarios;
    this.#figuras = figuras;
    this.#regionInicialId = regionInicialId;
    this.#escenarioActivoId = escenarioActivoId;
    this.#figurasVisibles = figurasVisibles;
  }

  static nueva(): Campana {
    return new Campana([], [], null, null, []);
  }

  /**
   * Construye la campaña leída de campana.json. La persistencia ya garantizó la
   * estructura; aquí se repara lo incoherente con las reglas del modelo en vez
   * de rechazar el archivo, y se devuelve qué se reparó, en texto legible.
   * Sin escenario activo guardado se activa la región inicial (no es reparación).
   */
  static desdeDto(dto: CampanaDto): { campana: Campana; reparaciones: string[] } {
    const reparaciones: string[] = [];

    const escenariosDto = primeroDeCadaId(dto.escenarios, (e) =>
      reparaciones.push(`Se ignoró un escenario repetido: "${e.nombre}" (id ${e.id}).`),
    );
    const idsEscenarios = new Set(escenariosDto.map((e) => e.id));
    const escenarios = escenariosDto.map((e) =>
      Escenario.desdeDtoReparado(e, (id) => idsEscenarios.has(id), reparaciones),
    );
    const figuras = primeroDeCadaId(dto.figuras, (f) =>
      reparaciones.push(`Se ignoró una figura repetida: "${f.nombre}" (id ${f.id}).`),
    ).map(Figura.desdeDto);

    const regiones = escenarios.filter((e) => e.esRegion);
    let regionInicialId = dto.regionInicialId;
    if (!regiones.some((r) => r.id === regionInicialId)) {
      const primera = regiones[0] ?? null;
      if (primera) {
        reparaciones.push(`No había una región inicial válida; ahora es "${primera.nombre}".`);
      } else if (regionInicialId !== null) {
        reparaciones.push('La región inicial guardada no existe; la campaña queda sin región inicial.');
      }
      regionInicialId = primera?.id ?? null;
    }

    let escenarioActivoId = dto.escenarioActivoId;
    if (escenarioActivoId !== null && !idsEscenarios.has(escenarioActivoId)) {
      reparaciones.push('El escenario activo guardado no existe; se vuelve a la región inicial.');
      escenarioActivoId = null;
    }
    escenarioActivoId ??= regionInicialId;

    const figurasPorId = new Map(figuras.map((f) => [f.id, f]));
    const figurasVisibles: string[] = [];
    for (const id of dto.figurasVisibles) {
      const figura = figurasPorId.get(id);
      if (!figura) {
        reparaciones.push(`Se ignoró una figura visible que no existe (id ${id}).`);
      } else if (figurasVisibles.includes(id)) {
        reparaciones.push(`La figura "${figura.nombre}" aparecía repetida entre las visibles.`);
      } else if (figurasVisibles.length === MAXIMO_FIGURAS_VISIBLES) {
        reparaciones.push(
          `Se ocultó "${figura.nombre}": ya había ${MAXIMO_FIGURAS_VISIBLES} figuras visibles.`,
        );
      } else {
        figurasVisibles.push(id);
      }
    }

    const campana = new Campana(escenarios, figuras, regionInicialId, escenarioActivoId, figurasVisibles);
    return { campana, reparaciones };
  }

  aDto(): CampanaDto {
    return {
      version: 1,
      escenarios: this.#escenarios.map((e) => e.aDto()),
      figuras: this.#figuras.map((f) => f.aDto()),
      regionInicialId: this.#regionInicialId,
      escenarioActivoId: this.#escenarioActivoId,
      figurasVisibles: [...this.#figurasVisibles],
    };
  }

  // ---- Escenarios ----

  /** Crear no activa: el DM decide cuándo lo ven los jugadores. */
  crearEscenario(imagen: string, tipo: TipoEscenario): string {
    const escenario = new Escenario(randomUUID(), tipo, nombreDesdeImagen(imagen), imagen);
    this.#escenarios.push(escenario);
    if (escenario.esRegion && this.#regionInicialId === null) {
      this.#regionInicialId = escenario.id;
    }
    return escenario.id;
  }

  actualizarEscenario(id: string, cambios: CambiosEscenario): void {
    const escenario = this.#buscarEscenario(id);
    for (const pin of cambios.pines ?? []) {
      if (!this.#escenarios.some((e) => e.id === pin.destinoId)) {
        throw new ErrorDominio('PIN_INVALIDO', MENSAJE_DESTINO_INEXISTENTE);
      }
    }
    const dejaDeSerInicial = id === this.#regionInicialId && cambios.tipo === 'zona';
    if (dejaDeSerInicial) this.#comprobarQuePuedeDejarDeSerInicial();

    escenario.aplicar(cambios);

    if (dejaDeSerInicial) this.#regionInicialId = null;
    if (escenario.esRegion && this.#regionInicialId === null) {
      this.#regionInicialId = escenario.id;
    }
  }

  borrarEscenario(id: string): void {
    this.#buscarEscenario(id);
    const esInicial = id === this.#regionInicialId;
    if (esInicial) this.#comprobarQuePuedeDejarDeSerInicial();

    this.#escenarios = this.#escenarios.filter((e) => e.id !== id);
    for (const escenario of this.#escenarios) escenario.quitarPinesHacia(id);
    if (esInicial) this.#regionInicialId = null;
    if (id === this.#escenarioActivoId) this.#escenarioActivoId = this.#regionInicialId;
  }

  activarEscenario(id: string): void {
    this.#buscarEscenario(id);
    this.#escenarioActivoId = id;
  }

  marcarRegionInicial(id: string): void {
    const escenario = this.#escenarios.find((e) => e.id === id);
    if (!escenario?.esRegion) {
      throw new ErrorDominio('NO_ENCONTRADO', 'No existe una región con ese id.');
    }
    this.#regionInicialId = id;
  }

  // ---- Figuras ----

  crearFigura(imagen: string, tipo: TipoFigura): string {
    const figura = new Figura(randomUUID(), tipo, nombreDesdeImagen(imagen), imagen);
    this.#figuras.push(figura);
    return figura.id;
  }

  actualizarFigura(id: string, cambios: CambiosFigura): void {
    this.#buscarFigura(id).aplicar(cambios);
  }

  borrarFigura(id: string): void {
    this.#buscarFigura(id);
    this.#figuras = this.#figuras.filter((f) => f.id !== id);
    this.#figurasVisibles = this.#figurasVisibles.filter((v) => v !== id);
  }

  cambiarVisibilidadFigura(id: string, visible: boolean): void {
    this.#buscarFigura(id);
    const yaVisible = this.#figurasVisibles.includes(id);
    if (visible === yaVisible) return;

    if (!visible) {
      this.#figurasVisibles = this.#figurasVisibles.filter((v) => v !== id);
      return;
    }
    if (this.#figurasVisibles.length >= MAXIMO_FIGURAS_VISIBLES) {
      throw new ErrorDominio(
        'LIMITE_FIGURAS',
        `Ya hay ${MAXIMO_FIGURAS_VISIBLES} figuras visibles. Oculta una antes de mostrar otra.`,
      );
    }
    this.#figurasVisibles.push(id);
  }

  // ---- Auxiliares ----

  #buscarEscenario(id: string): Escenario {
    const escenario = this.#escenarios.find((e) => e.id === id);
    if (!escenario) throw new ErrorDominio('NO_ENCONTRADO', 'El escenario no existe.');
    return escenario;
  }

  #buscarFigura(id: string): Figura {
    const figura = this.#figuras.find((f) => f.id === id);
    if (!figura) throw new ErrorDominio('NO_ENCONTRADO', 'La figura no existe.');
    return figura;
  }

  #comprobarQuePuedeDejarDeSerInicial(): void {
    const hayOtrasRegiones = this.#escenarios.some(
      (e) => e.esRegion && e.id !== this.#regionInicialId,
    );
    if (hayOtrasRegiones) {
      throw new ErrorDominio(
        'REGION_INICIAL_REQUERIDA',
        'Marca otra región como inicial antes de quitar esta.',
      );
    }
  }
}

function primeroDeCadaId<T extends { id: string }>(
  lista: readonly T[],
  alRepetir: (elemento: T) => void,
): T[] {
  const vistos = new Set<string>();
  return lista.filter((elemento) => {
    if (vistos.has(elemento.id)) {
      alRepetir(elemento);
      return false;
    }
    vistos.add(elemento.id);
    return true;
  });
}

/** "mapas/taberna.png" -> "taberna" */
function nombreDesdeImagen(imagen: string): string {
  const archivo = imagen.split('/').pop() ?? imagen;
  const punto = archivo.lastIndexOf('.');
  return punto > 0 ? archivo.slice(0, punto) : archivo;
}
