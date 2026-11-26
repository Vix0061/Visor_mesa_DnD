import type { CartaPresentacionDto } from '../../compartido/modelo.js';

export class CartaPresentacion {
  constructor(
    readonly nombre: string,
    readonly descripcion: string,
  ) {}

  static desdeDto(dto: CartaPresentacionDto): CartaPresentacion {
    return new CartaPresentacion(dto.nombre, dto.descripcion);
  }

  aDto(): CartaPresentacionDto {
    return { nombre: this.nombre, descripcion: this.descripcion };
  }
}
