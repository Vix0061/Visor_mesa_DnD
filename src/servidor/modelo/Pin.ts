import type { PinDto } from '../../compartido/modelo.js';
import { ErrorDominio } from './ErrorDominio.js';

export class Pin {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly destinoId: string,
  ) {
    if (!Pin.coordenadasValidas(x, y)) {
      throw new ErrorDominio('PIN_INVALIDO', MENSAJE_COORDENADAS);
    }
  }

  // Number.isFinite descarta NaN e Infinity, que no fallan en una comparación con < o >.
  static coordenadasValidas(x: number, y: number): boolean {
    const valida = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;
    return valida(x) && valida(y);
  }

  static desdeDto(dto: PinDto): Pin {
    return new Pin(dto.x, dto.y, dto.destinoId);
  }

  aDto(): PinDto {
    return { x: this.x, y: this.y, destinoId: this.destinoId };
  }
}

export const MENSAJE_COORDENADAS = 'Las coordenadas del pin deben estar entre 0 y 1.';
