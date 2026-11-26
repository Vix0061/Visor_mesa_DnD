/** "mapas/costa de la espada.png" -> "/imagenes/mapas/costa%20de%20la%20espada.png" */
export function urlDeImagen(ruta: string): string {
  return `/imagenes/${ruta.split('/').map(encodeURIComponent).join('/')}`;
}
