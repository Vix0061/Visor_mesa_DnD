import type { CampanaDto } from '../../compartido/modelo.js';
import type { BibliotecaImagenes } from '../persistencia/BibliotecaImagenes.js';
import { ErrorPersistencia } from '../persistencia/ErrorPersistencia.js';
import type { GuardadoDiferido } from '../persistencia/GuardadoDiferido.js';
import type { RepositorioCampana } from '../persistencia/RepositorioCampana.js';
import { Campana } from './Campana.js';
import { ErrorDominio } from './ErrorDominio.js';

/**
 * La campaña abierta y su biblioteca. Es la única pieza del modelo que habla
 * con la persistencia: carga, guarda después de cada cambio y traduce los
 * errores de persistencia a errores de dominio.
 */
export class SesionCampana {
  /** Lo asigna la capa superior para enterarse de un guardado fallido. */
  alFallarGuardado: ((error: ErrorDominio) => void) | null = null;

  readonly #repositorio: RepositorioCampana;
  readonly #biblioteca: BibliotecaImagenes;
  readonly #guardado: GuardadoDiferido;
  #carpeta: string | null = null;
  #campana: Campana | null = null;
  #imagenes: readonly string[] = [];

  constructor(repositorio: RepositorioCampana, biblioteca: BibliotecaImagenes, guardado: GuardadoDiferido) {
    this.#repositorio = repositorio;
    this.#biblioteca = biblioteca;
    this.#guardado = guardado;
    guardado.alFallarGuardado = (error) => this.alFallarGuardado?.(traducirError(error));
  }

  get carpeta(): string | null {
    return this.#carpeta;
  }

  get imagenes(): readonly string[] {
    return this.#imagenes;
  }

  estado(): CampanaDto | null {
    return this.#campana?.aDto() ?? null;
  }

  /**
   * Abre la carpeta como campaña y devuelve las reparaciones hechas al cargar.
   * Si la carpeta no tiene campana.json, solo la crea con `crear`; si no,
   * responde CAMPANA_INEXISTENTE sin escanear nada (evita recorrer por error
   * una carpeta grande). Si algo falla, la campaña anterior sigue abierta.
   */
  async abrir(carpeta: string, crear: boolean): Promise<string[]> {
    // Primero lo pendiente: si se reabre la misma carpeta, se lee lo último.
    await this.#guardado.volcar();
    const dto = await traducir(this.#repositorio.cargar(carpeta));
    if (!dto && !crear) {
      throw new ErrorDominio('CAMPANA_INEXISTENTE', 'Esta carpeta no tiene una campaña.');
    }
    const { campana, reparaciones } = dto
      ? Campana.desdeDto(dto)
      : { campana: Campana.nueva(), reparaciones: [] };
    // La copia se hace antes de que cualquier guardado pise el original.
    if (reparaciones.length > 0) await traducir(this.#repositorio.respaldar(carpeta));
    const imagenes = await traducir(this.#biblioteca.escanear(carpeta));

    this.#carpeta = carpeta;
    this.#campana = campana;
    this.#imagenes = imagenes;
    if (!dto) this.#programarGuardado(); // crea campana.json en una carpeta nueva
    return reparaciones;
  }

  async refrescarBiblioteca(): Promise<void> {
    const carpeta = this.#carpetaAbierta();
    this.#imagenes = await traducir(this.#biblioteca.escanear(carpeta));
  }

  /** Una imagen nueva para una entidad debe estar en la biblioteca. */
  comprobarImagen(imagen: string): void {
    this.#carpetaAbierta();
    if (!this.#imagenes.includes(imagen)) {
      throw new ErrorDominio('IMAGEN_INVALIDA', `La imagen no está en la biblioteca: ${imagen}`);
    }
  }

  /** Aplica un cambio a la campaña abierta y programa el guardado si tuvo éxito. */
  modificar(cambio: (campana: Campana) => void): void {
    this.#carpetaAbierta();
    cambio(this.#campana!);
    this.#programarGuardado();
  }

  /** Ruta en disco de una imagen, solo si figura en el último escaneo. */
  rutaDeImagen(relativa: string): string | null {
    if (this.#carpeta === null || !this.#imagenes.includes(relativa)) return null;
    return this.#biblioteca.rutaAbsoluta(this.#carpeta, relativa);
  }

  cerrar(): Promise<void> {
    return this.#guardado.volcar();
  }

  #carpetaAbierta(): string {
    if (this.#carpeta === null) throw new ErrorDominio('SIN_CAMPANA', 'No hay ninguna campaña abierta.');
    return this.#carpeta;
  }

  #programarGuardado(): void {
    this.#guardado.programar(this.#carpeta!, this.#campana!.aDto());
  }
}

async function traducir<T>(operacion: Promise<T>): Promise<T> {
  try {
    return await operacion;
  } catch (error) {
    throw error instanceof ErrorPersistencia ? traducirError(error) : error;
  }
}

function traducirError(error: unknown): ErrorDominio {
  if (error instanceof ErrorPersistencia) return new ErrorDominio(error.codigo, error.message);
  return new ErrorDominio('GUARDADO_FALLIDO', 'No se pudo guardar la campaña.');
}
