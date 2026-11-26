// Pequeñas ayudas de DOM compartidas por las vistas del panel.

export function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clase = '',
  texto = '',
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

export function buscar<T extends Element = HTMLElement>(raiz: ParentNode, selector: string): T {
  const encontrado = raiz.querySelector<T>(selector);
  if (!encontrado) throw new Error(`Falta ${selector} en index.html`);
  return encontrado;
}

/**
 * Pone el valor de un control salvo que el DM lo esté editando (tiene el foco):
 * así un estado recibido no pisa lo que se está escribiendo. Con `forzar`
 * (otra entidad, o un valor que hay que deshacer) se pone siempre.
 */
export function ponerValor(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  valor: string,
  forzar: boolean,
): void {
  if (forzar || document.activeElement !== control) control.value = valor;
}

/** Opciones de imagen: la biblioteca, más la actual marcada si falta en ella. */
export function rellenarImagenes(
  selector: HTMLSelectElement,
  imagenes: readonly string[],
  actual: string,
  forzar: boolean,
): void {
  if (!forzar && document.activeElement === selector) return;
  const falta = !imagenes.includes(actual);
  const opciones = imagenes.map((ruta) => new Option(ruta, ruta));
  if (falta) opciones.unshift(new Option(`${actual} (imagen faltante)`, actual));
  selector.replaceChildren(...opciones);
  selector.value = actual;
}

/** "mapas/costa de la espada.png" -> "<base>/imagenes/mapas/costa%20de%20la%20espada.png" */
export function urlDeImagen(base: string, ruta: string): string {
  return `${base}/imagenes/${ruta.split('/').map(encodeURIComponent).join('/')}`;
}

/** Miniatura real con carga diferida, o un hueco rayado si la imagen falta. */
export function miniatura(base: string, ruta: string, falta: boolean): HTMLElement {
  if (falta) {
    const hueco = crear('span', 'miniatura falta', '?');
    hueco.title = `Imagen faltante: ${ruta}`;
    return hueco;
  }
  const img = crear('img', 'miniatura');
  img.src = urlDeImagen(base, ruta);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}
