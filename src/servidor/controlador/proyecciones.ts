// Convierten el estado del modelo en lo que ve cada rol. El visor recibe solo
// lo público: nada de nombres privados ni de figuras ocultas.
import type { CampanaDto } from '../../compartido/modelo.js';
import type {
  CampanaPanel,
  EscenarioPublico,
  FiguraPublica,
  MensajeAlPanel,
} from '../../compartido/mensajes.js';

export function estadoPanel(carpeta: string | null, campana: CampanaDto | null): MensajeAlPanel {
  return { tipo: 'estadoPanel', carpeta, campana: campana && campanaPanel(campana) };
}

function campanaPanel(campana: CampanaDto): CampanaPanel {
  const visibles = new Set(campana.figurasVisibles);
  return {
    ...campana,
    figuras: campana.figuras.map((f) => ({ ...f, visible: visibles.has(f.id) })),
  };
}

export function escenarioPublico(campana: CampanaDto | null): EscenarioPublico | null {
  const activo = campana?.escenarios.find((e) => e.id === campana.escenarioActivoId);
  if (!activo) return null;
  return { id: activo.id, imagen: activo.imagen, cuadricula: activo.cuadricula, pines: activo.pines };
}

/** En orden de activación. */
export function figurasPublicas(campana: CampanaDto | null): FiguraPublica[] {
  if (!campana) return [];
  return campana.figurasVisibles.flatMap((id) => {
    const figura = campana.figuras.find((f) => f.id === id);
    return figura ? [{ id: figura.id, imagen: figura.imagen, carta: figura.carta }] : [];
  });
}
