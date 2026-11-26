// Convierte el texto recibido del panel en un MensajePanel con forma y tipos
// correctos. Construye objetos nuevos con solo los campos conocidos, así nada
// extra llega al modelo. Los rangos y las reglas los valida el modelo.
import type {
  CambiosEscenario,
  CambiosFigura,
  CartaPresentacionDto,
  CuadriculaDto,
  PinDto,
} from '../../compartido/modelo.js';
import type { MensajePanel } from '../../compartido/mensajes.js';
import { ErrorDominio } from '../modelo/ErrorDominio.js';

type Objeto = Record<string, unknown>;

const TIPOS_ESCENARIO = ['zona', 'region'] as const;
const TIPOS_FIGURA = ['personaje', 'objeto'] as const;

export function interpretarMensaje(entrada: string): MensajePanel {
  let json: unknown;
  try {
    json = JSON.parse(entrada);
  } catch {
    throw invalido('el mensaje no es JSON');
  }
  const m = objeto(json, 'mensaje');
  const tipo = texto(m, 'tipo');

  switch (tipo) {
    case 'abrirCampana':
      return m.crear === undefined
        ? { tipo, carpeta: texto(m, 'carpeta') }
        : { tipo, carpeta: texto(m, 'carpeta'), crear: booleano(m, 'crear') };
    case 'refrescarBiblioteca':
      return { tipo };
    case 'crearEscenario':
      return { tipo, imagen: texto(m, 'imagen'), tipoEscenario: unoDe(m, 'tipoEscenario', TIPOS_ESCENARIO) };
    case 'crearFigura':
      return { tipo, imagen: texto(m, 'imagen'), tipoFigura: unoDe(m, 'tipoFigura', TIPOS_FIGURA) };
    case 'actualizarEscenario':
      return { tipo, id: texto(m, 'id'), cambios: cambiosEscenario(objeto(m.cambios, 'cambios')) };
    case 'actualizarFigura':
      return { tipo, id: texto(m, 'id'), cambios: cambiosFigura(objeto(m.cambios, 'cambios')) };
    case 'borrarEscenario':
    case 'borrarFigura':
    case 'activarEscenario':
    case 'marcarRegionInicial':
      return { tipo, id: texto(m, 'id') };
    case 'cambiarVisibilidadFigura':
      return { tipo, id: texto(m, 'id'), visible: booleano(m, 'visible') };
    default:
      throw invalido(`tipo de mensaje desconocido: ${tipo}`);
  }
}

function cambiosEscenario(c: Objeto): CambiosEscenario {
  const cambios: CambiosEscenario = {};
  if (c.nombre !== undefined) cambios.nombre = texto(c, 'nombre');
  if (c.tipo !== undefined) cambios.tipo = unoDe(c, 'tipo', TIPOS_ESCENARIO);
  if (c.imagen !== undefined) cambios.imagen = texto(c, 'imagen');
  if (c.cuadricula !== undefined) cambios.cuadricula = cuadricula(objeto(c.cuadricula, 'cuadricula'));
  if (c.pines !== undefined) cambios.pines = lista(c.pines, 'pines').map((p) => pin(objeto(p, 'pin')));
  return cambios;
}

function cambiosFigura(c: Objeto): CambiosFigura {
  const cambios: CambiosFigura = {};
  if (c.nombre !== undefined) cambios.nombre = texto(c, 'nombre');
  if (c.tipo !== undefined) cambios.tipo = unoDe(c, 'tipo', TIPOS_FIGURA);
  if (c.imagen !== undefined) cambios.imagen = texto(c, 'imagen');
  if (c.carta !== undefined) cambios.carta = c.carta === null ? null : carta(objeto(c.carta, 'carta'));
  return cambios;
}

function cuadricula(c: Objeto): CuadriculaDto {
  return {
    visible: booleano(c, 'visible'),
    tamanoCelda: numero(c, 'tamanoCelda'),
    desplazamientoX: numero(c, 'desplazamientoX'),
    desplazamientoY: numero(c, 'desplazamientoY'),
  };
}

function pin(p: Objeto): PinDto {
  return { x: numero(p, 'x'), y: numero(p, 'y'), destinoId: texto(p, 'destinoId') };
}

function carta(c: Objeto): CartaPresentacionDto {
  return { nombre: texto(c, 'nombre'), descripcion: texto(c, 'descripcion') };
}

// ---- Comprobaciones básicas ----

function objeto(valor: unknown, campo: string): Objeto {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw invalido(`${campo} debe ser un objeto`);
  }
  return valor as Objeto;
}

function lista(valor: unknown, campo: string): unknown[] {
  if (!Array.isArray(valor)) throw invalido(`${campo} debe ser una lista`);
  return valor;
}

function texto(o: Objeto, campo: string): string {
  if (typeof o[campo] !== 'string') throw invalido(`${campo} debe ser texto`);
  return o[campo];
}

function numero(o: Objeto, campo: string): number {
  if (typeof o[campo] !== 'number') throw invalido(`${campo} debe ser un número`);
  return o[campo];
}

function booleano(o: Objeto, campo: string): boolean {
  if (typeof o[campo] !== 'boolean') throw invalido(`${campo} debe ser true o false`);
  return o[campo];
}

function unoDe<T extends string>(o: Objeto, campo: string, valores: readonly T[]): T {
  const valor = o[campo];
  if (!valores.includes(valor as T)) throw invalido(`${campo} debe ser uno de: ${valores.join(', ')}`);
  return valor as T;
}

function invalido(detalle: string): ErrorDominio {
  return new ErrorDominio('MENSAJE_INVALIDO', `Mensaje inválido: ${detalle}.`);
}
