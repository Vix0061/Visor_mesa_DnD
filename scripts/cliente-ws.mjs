// Cliente WebSocket mínimo para los scripts de prueba manual. Usa el cliente
// WebSocket que trae Node 22+. Guarda los mensajes recibidos y permite esperar
// el siguiente de un tipo (o de cualquiera de varios tipos).
export async function conectar(url) {
  const ws = new WebSocket(url);
  const recibidos = [];
  const esperando = [];
  ws.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(evento.data);
    const i = esperando.findIndex((e) => e.tipos.includes(mensaje.tipo));
    if (i >= 0) esperando.splice(i, 1)[0].resolver(mensaje);
    else recibidos.push(mensaje);
  });
  const cerrado = new Promise((resolver) => ws.addEventListener('close', (e) => resolver(e.code)));
  await new Promise((resolver, rechazar) => {
    ws.addEventListener('open', resolver);
    ws.addEventListener('error', () => rechazar(new Error(`No se pudo conectar a ${url}`)));
  });
  return {
    cerrado,
    enviar: (mensaje) => ws.send(JSON.stringify(mensaje)),
    cerrar: () => ws.close(),
    pendientes: (tipo) => recibidos.filter((m) => m.tipo === tipo),
    /** `tipo` puede ser un texto o una lista de textos. */
    esperar(tipo, ms = 3000) {
      const tipos = [tipo].flat();
      const i = recibidos.findIndex((m) => tipos.includes(m.tipo));
      if (i >= 0) return Promise.resolve(recibidos.splice(i, 1)[0]);
      return new Promise((resolver, rechazar) => {
        const espera = { tipos, resolver };
        esperando.push(espera);
        setTimeout(() => {
          const k = esperando.indexOf(espera);
          if (k >= 0) {
            esperando.splice(k, 1);
            rechazar(new Error(`No llegó "${tipo}" en ${ms} ms`));
          }
        }, ms);
      });
    },
  };
}

export const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
