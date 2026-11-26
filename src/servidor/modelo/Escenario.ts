import type {
  CambiosEscenario,
  CuadriculaDto,
  EscenarioDto,
  PinDto,
  TipoEscenario,
} from '../../compartido/modelo.js';
import { ErrorDominio } from './ErrorDominio.js';
import { MENSAJE_COORDENADAS, Pin } from './Pin.js';

export const MENSAJE_DESTINO_INEXISTENTE = 'El destino del pin no existe.';

export const CUADRICULA_POR_DEFECTO: Readonly<CuadriculaDto> = {
  visible: false,
  tamanoCelda: 70,
  desplazamientoX: 0,
  desplazamientoY: 0,
};

export class Escenario {
  readonly id: string;
  nombre: string;
  imagen: string;
  // Privados porque tienen reglas: tipo y pines juntos ("solo las regiones
  // tienen pines") y la cuadrícula sus rangos. Solo cambian con aplicar().
  #tipo: TipoEscenario;
  #pines: readonly Pin[] = [];
  #cuadricula: CuadriculaDto;

  constructor(
    id: string,
    tipo: TipoEscenario,
    nombre: string,
    imagen: string,
    cuadricula: CuadriculaDto = CUADRICULA_POR_DEFECTO,
  ) {
    comprobarCuadricula(cuadricula);
    this.id = id;
    this.#tipo = tipo;
    this.nombre = nombre;
    this.imagen = imagen;
    this.#cuadricula = { ...cuadricula };
  }

  get tipo(): TipoEscenario {
    return this.#tipo;
  }

  get esRegion(): boolean {
    return this.#tipo === 'region';
  }

  /**
   * Aplica los cambios de forma atómica: valida todo antes de modificar nada.
   * Si pasa a zona, sus pines se descartan. La existencia de los destinos la
   * comprueba Campana, que es quien conoce los demás escenarios.
   */
  aplicar(cambios: CambiosEscenario): void {
    const tipo = cambios.tipo ?? this.#tipo;
    let pines: readonly Pin[];
    if (cambios.pines !== undefined) {
      for (const pin of cambios.pines) {
        const problema = problemaDePin(this.id, tipo, pin);
        if (problema) throw new ErrorDominio('PIN_INVALIDO', problema);
      }
      pines = cambios.pines.map(Pin.desdeDto);
    } else {
      pines = tipo === 'region' ? this.#pines : [];
    }
    if (cambios.cuadricula !== undefined) comprobarCuadricula(cambios.cuadricula);

    this.#tipo = tipo;
    this.#pines = pines;
    if (cambios.nombre !== undefined) this.nombre = cambios.nombre;
    if (cambios.imagen !== undefined) this.imagen = cambios.imagen;
    if (cambios.cuadricula !== undefined) this.#cuadricula = { ...cambios.cuadricula };
  }

  quitarPinesHacia(destinoId: string): void {
    this.#pines = this.#pines.filter((pin) => pin.destinoId !== destinoId);
  }

  /**
   * Construye desde campana.json reparando en vez de rechazar: una cuadrícula
   * inválida vuelve a la de por defecto y los pines inválidos se descartan.
   * Cada reparación se añade, en texto legible, a `reparaciones`.
   */
  static desdeDtoReparado(
    dto: EscenarioDto,
    existeEscenario: (id: string) => boolean,
    reparaciones: string[],
  ): Escenario {
    const etiqueta = `Escenario "${dto.nombre}"`;
    const problemaCuadricula = problemaDeCuadricula(dto.cuadricula);
    if (problemaCuadricula) {
      reparaciones.push(`${etiqueta}: se restableció la cuadrícula por defecto. ${problemaCuadricula}`);
    }
    const escenario = new Escenario(
      dto.id,
      dto.tipo,
      dto.nombre,
      dto.imagen,
      problemaCuadricula ? CUADRICULA_POR_DEFECTO : dto.cuadricula,
    );
    const pines: Pin[] = [];
    for (const pin of dto.pines) {
      const problema =
        problemaDePin(dto.id, dto.tipo, pin) ??
        (existeEscenario(pin.destinoId) ? null : MENSAJE_DESTINO_INEXISTENTE);
      if (problema) reparaciones.push(`${etiqueta}: se descartó un pin. ${problema}`);
      else pines.push(Pin.desdeDto(pin));
    }
    escenario.#pines = pines;
    return escenario;
  }

  aDto(): EscenarioDto {
    return {
      id: this.id,
      tipo: this.#tipo,
      nombre: this.nombre,
      imagen: this.imagen,
      cuadricula: { ...this.#cuadricula },
      pines: this.#pines.map((pin) => pin.aDto()),
    };
  }
}

// Cada regla se escribe una vez como "problema o null"; aplicar() la convierte
// en error y desdeDtoReparado() la usa como filtro.

function problemaDePin(escenarioId: string, tipo: TipoEscenario, pin: PinDto): string | null {
  if (tipo !== 'region') return 'Solo las regiones pueden tener pines.';
  if (pin.destinoId === escenarioId) return 'Un pin no puede apuntar a su propio escenario.';
  if (!Pin.coordenadasValidas(pin.x, pin.y)) return MENSAJE_COORDENADAS;
  return null;
}

// Los desplazamientos pueden ser negativos o mayores que la celda: solo
// desplazan el patrón, así que basta con que sean números finitos.
function problemaDeCuadricula(cuadricula: CuadriculaDto): string | null {
  const { tamanoCelda, desplazamientoX, desplazamientoY } = cuadricula;
  if (!Number.isFinite(tamanoCelda) || tamanoCelda <= 0) {
    return 'El tamaño de celda debe ser mayor que 0.';
  }
  if (!Number.isFinite(desplazamientoX) || !Number.isFinite(desplazamientoY)) {
    return 'Los desplazamientos deben ser números.';
  }
  return null;
}

function comprobarCuadricula(cuadricula: CuadriculaDto): void {
  const problema = problemaDeCuadricula(cuadricula);
  if (problema) throw new ErrorDominio('CUADRICULA_INVALIDA', problema);
}
