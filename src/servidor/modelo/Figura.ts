import type { CambiosFigura, FiguraDto, TipoFigura } from '../../compartido/modelo.js';
import { CartaPresentacion } from './CartaPresentacion.js';

// La visibilidad no vive aquí: es una propiedad del conjunto (orden y límite)
// y la gestiona Campana.
export class Figura {
  constructor(
    readonly id: string,
    public tipo: TipoFigura,
    public nombre: string,
    public imagen: string,
    public carta: CartaPresentacion | null = null,
  ) {}

  aplicar(cambios: CambiosFigura): void {
    if (cambios.tipo !== undefined) this.tipo = cambios.tipo;
    if (cambios.nombre !== undefined) this.nombre = cambios.nombre;
    if (cambios.imagen !== undefined) this.imagen = cambios.imagen;
    if (cambios.carta !== undefined) {
      this.carta = cambios.carta === null ? null : CartaPresentacion.desdeDto(cambios.carta);
    }
  }

  static desdeDto(dto: FiguraDto): Figura {
    const carta = dto.carta === null ? null : CartaPresentacion.desdeDto(dto.carta);
    return new Figura(dto.id, dto.tipo, dto.nombre, dto.imagen, carta);
  }

  aDto(): FiguraDto {
    return {
      id: this.id,
      tipo: this.tipo,
      nombre: this.nombre,
      imagen: this.imagen,
      carta: this.carta?.aDto() ?? null,
    };
  }
}
