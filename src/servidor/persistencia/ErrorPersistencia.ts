import type { CodigoError } from '../../compartido/errores.js';

export type CodigoErrorPersistencia = Extract<
  CodigoError,
  'CARPETA_INVALIDA' | 'CAMPANA_CORRUPTA' | 'GUARDADO_FALLIDO'
>;

export class ErrorPersistencia extends Error {
  readonly codigo: CodigoErrorPersistencia;

  constructor(codigo: CodigoErrorPersistencia, mensaje: string, causa?: unknown) {
    super(mensaje, { cause: causa });
    this.name = 'ErrorPersistencia';
    this.codigo = codigo;
  }
}
