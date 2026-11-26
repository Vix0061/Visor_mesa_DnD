import { networkInterfaces } from 'node:os';

// El servidor escucha en "::" (doble pila), así que una conexión local por
// IPv4 llega como ::ffff:127.0.0.1.
const DIRECCIONES_LOCALES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function esDireccionLocal(direccion: string | undefined): boolean {
  return direccion !== undefined && DIRECCIONES_LOCALES.has(direccion);
}

/** URLs del visor en todas las IPv4 de la LAN (puede haber varias: VPN, máquinas virtuales). */
export function urlsDelVisor(puerto: number): string[] {
  const direcciones = Object.values(networkInterfaces())
    .flatMap((interfaz) => interfaz ?? [])
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  if (direcciones.length === 0) direcciones.push('127.0.0.1');
  return direcciones.map((ip) => `http://${ip}:${puerto}/`);
}
