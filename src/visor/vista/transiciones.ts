import type { PinDto } from '../../compartido/modelo.js';

// Transiciones entre dos lienzos (Web Animations API, solo transform y opacity).
// El saliente puede ser null (se viene de "sin escenario") y el entrante también
// (se va a "sin escenario"). Cada una termina cuando acaban todas sus animaciones.

const SUAVE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const ACELERA = 'cubic-bezier(0.5, 0, 0.75, 0)';
const FRENA = 'cubic-bezier(0.25, 1, 0.5, 1)';
const ZOOM = 3.5; // cuánto se amplía hacia el pin

const origen = (pin: PinDto) => `${pin.x * 100}% ${pin.y * 100}%`;

async function terminar(animaciones: (Animation | undefined)[]): Promise<void> {
  await Promise.all(animaciones.map((a) => a?.finished));
}

export function fundidoCruzado(saliente: HTMLElement | null, entrante: HTMLElement | null): Promise<void> {
  return terminar([
    saliente?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: SUAVE, fill: 'forwards' }),
    entrante?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: SUAVE }),
  ]);
}

/** Se "entra" por el pin del saliente: zoom hacia el pin y fundido; el entrante se asienta. */
export function zoomHaciaPin(saliente: HTMLElement, entrante: HTMLElement, pin: PinDto): Promise<void> {
  return terminar([
    saliente.animate(
      [
        { transformOrigin: origen(pin), transform: 'scale(1)', opacity: 1 },
        { transformOrigin: origen(pin), opacity: 1, offset: 0.55 },
        { transformOrigin: origen(pin), transform: `scale(${ZOOM})`, opacity: 0 },
      ],
      { duration: 1000, easing: ACELERA, fill: 'forwards' },
    ),
    entrante.animate(
      [
        { transform: 'scale(1.06)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 650, delay: 550, easing: FRENA, fill: 'backwards' },
    ),
  ]);
}

/** Se "sale" hacia el escenario que tiene el pin: el entrante parte ampliado sobre su pin y se aleja. */
export function zoomDesdePin(saliente: HTMLElement, entrante: HTMLElement, pin: PinDto): Promise<void> {
  return terminar([
    saliente.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.94)', opacity: 0 },
      ],
      { duration: 600, easing: SUAVE, fill: 'forwards' },
    ),
    entrante.animate(
      [
        { transformOrigin: origen(pin), transform: `scale(${ZOOM})`, opacity: 0 },
        { transformOrigin: origen(pin), opacity: 1, offset: 0.45 },
        { transformOrigin: origen(pin), transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 1000, easing: FRENA },
    ),
  ]);
}

/** Aparición (pin nuevo, cuadrícula) con escala opcional; `base` es el transform propio del elemento. */
export function aparecer(elemento: Element, base = '', escala = false): void {
  cancelar(elemento);
  const desde = escala ? `${base} scale(0)` : base;
  elemento.animate(
    [
      { transform: desde || 'none', opacity: 0 },
      { transform: base || 'none', opacity: 1 },
    ],
    { duration: 400, easing: FRENA },
  );
}

/** Desvanece y después llama a `alTerminar`, salvo que otra animación lo interrumpa. */
export function desvanecer(elemento: Element, alTerminar: () => void): void {
  cancelar(elemento);
  elemento
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: SUAVE, fill: 'forwards' })
    .finished.then(alTerminar, () => {});
}

// Una animación anterior con fill: 'forwards' seguiría aplicándose al acabar la nueva.
function cancelar(elemento: Element): void {
  for (const animacion of elemento.getAnimations()) animacion.cancel();
}
