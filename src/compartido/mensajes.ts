// Mensajes WebSocket. Todos llevan `tipo` como discriminante, por eso el tipo
// de entidad al crear viaja como `tipoEscenario` / `tipoFigura`.
import type { CodigoError } from './errores.js';
import type {
  CambiosEscenario,
  CambiosFigura,
  CampanaDto,
  CartaPresentacionDto,
  CuadriculaDto,
  FiguraDto,
  PinDto,
  TipoEscenario,
  TipoFigura,
} from './modelo.js';

export type Rol = 'panel' | 'visor';

// ---- Panel -> servidor ----

export type MensajePanel =
  // Sin crear: true, una carpeta sin campana.json responde CAMPANA_INEXISTENTE.
  | { tipo: 'abrirCampana'; carpeta: string; crear?: boolean }
  | { tipo: 'refrescarBiblioteca' }
  | { tipo: 'crearEscenario'; imagen: string; tipoEscenario: TipoEscenario }
  | { tipo: 'crearFigura'; imagen: string; tipoFigura: TipoFigura }
  | { tipo: 'actualizarEscenario'; id: string; cambios: CambiosEscenario }
  | { tipo: 'actualizarFigura'; id: string; cambios: CambiosFigura }
  | { tipo: 'borrarEscenario'; id: string }
  | { tipo: 'borrarFigura'; id: string }
  | { tipo: 'activarEscenario'; id: string }
  | { tipo: 'marcarRegionInicial'; id: string }
  | { tipo: 'cambiarVisibilidadFigura'; id: string; visible: boolean };

// ---- Servidor -> panel ----

export interface FiguraPanel extends FiguraDto {
  visible: boolean;
}

export interface CampanaPanel extends Omit<CampanaDto, 'figuras'> {
  figuras: FiguraPanel[];
}

export type MensajeAlPanel =
  | { tipo: 'infoServidor'; urls: string[] }
  | { tipo: 'estadoPanel'; carpeta: string | null; campana: CampanaPanel | null }
  | { tipo: 'biblioteca'; imagenes: string[] }
  | { tipo: 'avisoReparaciones'; reparaciones: string[] }
  | { tipo: 'error'; codigo: CodigoError; mensaje: string };

// ---- Servidor -> visor (solo lo público) ----

export interface EscenarioPublico {
  id: string;
  imagen: string;
  cuadricula: CuadriculaDto;
  pines: PinDto[];
}

export interface FiguraPublica {
  id: string;
  imagen: string;
  carta: CartaPresentacionDto | null;
}

export type MensajeAlVisor =
  | { tipo: 'estado'; escenario: EscenarioPublico | null; figuras: FiguraPublica[] }
  | { tipo: 'escenarioActivo'; escenario: EscenarioPublico | null }
  | { tipo: 'figurasVisibles'; figuras: FiguraPublica[] };
