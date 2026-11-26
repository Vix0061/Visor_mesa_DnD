// Comprueba que el JSON leído tenga la forma de CampanaDto (tipos y campos).
// No comprueba reglas del dominio (rangos, referencias, límite de figuras):
// eso lo repara el modelo al cargar.
import type {
  CampanaDto,
  CartaPresentacionDto,
  CuadriculaDto,
  EscenarioDto,
  FiguraDto,
  PinDto,
} from '../../compartido/modelo.js';
import { ErrorPersistencia } from './ErrorPersistencia.js';

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === 'string';
const esNumero = (v: unknown): v is number => typeof v === 'number';
const esTextoONulo = (v: unknown): v is string | null => v === null || esTexto(v);

const esCuadricula = (v: unknown): v is CuadriculaDto =>
  esObjeto(v) &&
  typeof v.visible === 'boolean' &&
  esNumero(v.tamanoCelda) &&
  esNumero(v.desplazamientoX) &&
  esNumero(v.desplazamientoY);

const esPin = (v: unknown): v is PinDto =>
  esObjeto(v) && esNumero(v.x) && esNumero(v.y) && esTexto(v.destinoId);

const esCarta = (v: unknown): v is CartaPresentacionDto =>
  esObjeto(v) && esTexto(v.nombre) && esTexto(v.descripcion);

const esEscenario = (v: unknown): v is EscenarioDto =>
  esObjeto(v) &&
  esTexto(v.id) &&
  (v.tipo === 'zona' || v.tipo === 'region') &&
  esTexto(v.nombre) &&
  esTexto(v.imagen) &&
  esCuadricula(v.cuadricula) &&
  Array.isArray(v.pines) &&
  v.pines.every(esPin);

const esFigura = (v: unknown): v is FiguraDto =>
  esObjeto(v) &&
  esTexto(v.id) &&
  (v.tipo === 'personaje' || v.tipo === 'objeto') &&
  esTexto(v.nombre) &&
  esTexto(v.imagen) &&
  (v.carta === null || esCarta(v.carta));

export function validarEstructura(json: unknown): CampanaDto {
  if (!esObjeto(json)) throw corrupta('el contenido no es un objeto');
  if (json.version !== 1) {
    throw new ErrorPersistencia(
      'CAMPANA_CORRUPTA',
      `campana.json tiene una versión no soportada (${String(json.version)}).`,
    );
  }
  const escenarios = comprobarLista(json.escenarios, 'escenarios', esEscenario);
  const figuras = comprobarLista(json.figuras, 'figuras', esFigura);
  const figurasVisibles = comprobarLista(json.figurasVisibles, 'figurasVisibles', esTexto);
  if (!esTextoONulo(json.regionInicialId)) throw corrupta('regionInicialId no es texto ni null');
  if (!esTextoONulo(json.escenarioActivoId)) throw corrupta('escenarioActivoId no es texto ni null');

  return {
    version: 1,
    escenarios,
    figuras,
    regionInicialId: json.regionInicialId,
    escenarioActivoId: json.escenarioActivoId,
    figurasVisibles,
  };
}

// Señala el primer elemento incorrecto para que el DM pueda corregirlo a mano.
function comprobarLista<T>(valor: unknown, campo: string, esElemento: (v: unknown) => v is T): T[] {
  if (!Array.isArray(valor)) throw corrupta(`${campo} no es una lista`);
  const indice = valor.findIndex((elemento) => !esElemento(elemento));
  if (indice !== -1) throw corrupta(`${campo}[${indice}] tiene una estructura incorrecta`);
  return valor as T[];
}

function corrupta(detalle: string): ErrorPersistencia {
  return new ErrorPersistencia('CAMPANA_CORRUPTA', `campana.json no es válido: ${detalle}.`);
}
