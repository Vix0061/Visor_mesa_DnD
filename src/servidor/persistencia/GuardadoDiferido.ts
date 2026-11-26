import type { CampanaDto } from '../../compartido/modelo.js';
import type { RepositorioCampana } from './RepositorioCampana.js';

/**
 * Agrupa cambios seguidos en una sola escritura (debounce). Recibe una copia
 * del estado en cada cambio y solo escribe la última, así la persistencia no
 * necesita llamar al modelo para pedírsela.
 */
export class GuardadoDiferido {
  /**
   * Lo asigna la capa superior. Es la única llamada hacia arriba de la
   * persistencia: el fallo ocurre después de que el cambio ya respondió.
   */
  alFallarGuardado: ((error: unknown) => void) | null = null;

  readonly #repositorio: RepositorioCampana;
  readonly #esperaMs: number;
  #pendiente: { carpeta: string; campana: CampanaDto } | null = null;
  #temporizador: NodeJS.Timeout | null = null;
  // Encadena las escrituras para que nunca haya dos a la vez sobre el mismo archivo.
  #escrituraEnCurso: Promise<void> = Promise.resolve();

  constructor(repositorio: RepositorioCampana, esperaMs = 500) {
    this.#repositorio = repositorio;
    this.#esperaMs = esperaMs;
  }

  programar(carpeta: string, campana: CampanaDto): void {
    this.#pendiente = { carpeta, campana };
    if (this.#temporizador) clearTimeout(this.#temporizador);
    this.#temporizador = setTimeout(() => void this.#escribir(), this.#esperaMs);
  }

  /** Escribe ya lo pendiente y espera a que termine. Para cerrar o cambiar de campaña. */
  volcar(): Promise<void> {
    return this.#escribir();
  }

  #escribir(): Promise<void> {
    if (this.#temporizador) clearTimeout(this.#temporizador);
    this.#temporizador = null;
    const pendiente = this.#pendiente;
    this.#pendiente = null;
    if (pendiente) {
      this.#escrituraEnCurso = this.#escrituraEnCurso
        .then(() => this.#repositorio.guardar(pendiente.carpeta, pendiente.campana))
        .catch((error: unknown) => this.alFallarGuardado?.(error));
    }
    return this.#escrituraEnCurso;
  }
}
