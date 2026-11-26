// Formas de datos del modelo compartidas por servidor, panel y visor.
// Es también la forma en que se guarda campana.json.

export type TipoEscenario = 'zona' | 'region';
export type TipoFigura = 'personaje' | 'objeto';

export interface CuadriculaDto {
  visible: boolean;
  tamanoCelda: number; // en píxeles de la imagen original
  desplazamientoX: number;
  desplazamientoY: number;
}

export interface PinDto {
  x: number; // 0..1 sobre el ancho de la imagen
  y: number; // 0..1 sobre el alto de la imagen
  destinoId: string;
}

export interface CartaPresentacionDto {
  nombre: string;
  descripcion: string;
}

export interface EscenarioDto {
  id: string;
  tipo: TipoEscenario;
  nombre: string;
  imagen: string;
  cuadricula: CuadriculaDto;
  pines: PinDto[];
}

export interface FiguraDto {
  id: string;
  tipo: TipoFigura;
  nombre: string;
  imagen: string;
  carta: CartaPresentacionDto | null;
}

export interface CampanaDto {
  version: 1;
  escenarios: EscenarioDto[];
  figuras: FiguraDto[];
  regionInicialId: string | null;
  escenarioActivoId: string | null;
  figurasVisibles: string[]; // ids en orden de activación
}

// Cambios parciales: un campo ausente no se toca.
export interface CambiosEscenario {
  nombre?: string;
  tipo?: TipoEscenario;
  imagen?: string;
  cuadricula?: CuadriculaDto;
  pines?: readonly PinDto[]; // lista completa
}

export interface CambiosFigura {
  nombre?: string;
  tipo?: TipoFigura;
  imagen?: string;
  carta?: CartaPresentacionDto | null; // null quita la carta
}
