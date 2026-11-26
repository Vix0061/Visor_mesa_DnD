import type {
  MensajeAlPanel,
  MensajeAlVisor,
  MensajePanel,
  Rol,
} from '../../compartido/mensajes.js';
import { ErrorDominio } from '../modelo/ErrorDominio.js';
import type { SesionCampana } from '../modelo/SesionCampana.js';
import { escenarioPublico, estadoPanel, figurasPublicas } from './proyecciones.js';
import { interpretarMensaje } from './validacionMensajes.js';

export interface DatosConexion {
  rol: string | null;
  token: string | null;
  esLocal: boolean;
}

export type ResultadoConexion =
  | { rol: 'panel'; mensajes: MensajeAlPanel[] }
  | { rol: 'visor'; mensajes: MensajeAlVisor[] }
  | { rol: null; mensajes: MensajeAlPanel[] }; // rechazada: el error a enviar antes de cerrar

/** Lo que el transporte debe enviar tras una acción, y a quién. */
export interface Respuesta {
  alEmisor?: MensajeAlPanel[];
  aPaneles?: MensajeAlPanel[];
  aVisores?: MensajeAlVisor[];
}

type Accion = Exclude<MensajePanel, { tipo: 'abrirCampana' | 'refrescarBiblioteca' }>;

export class ControladorCampana {
  /** Lo asigna el transporte para difundir el aviso de un guardado fallido. */
  alFallarGuardado: ((respuesta: Respuesta) => void) | null = null;

  readonly #sesion: SesionCampana;
  readonly #token: string;
  // Las acciones se procesan de una en una: abrir una campaña es asíncrono y
  // otra acción intercalada leería un estado a medio cambiar.
  #cola: Promise<unknown> = Promise.resolve();

  constructor(sesion: SesionCampana, token: string) {
    this.#sesion = sesion;
    this.#token = token;
    sesion.alFallarGuardado = (error) =>
      this.alFallarGuardado?.({ aPaneles: [mensajeDeError(error)] });
  }

  /** Decide el rol de una conexión nueva y qué recibe al conectarse. */
  conectar(datos: DatosConexion): ResultadoConexion {
    if (datos.rol === 'visor') {
      return { rol: 'visor', mensajes: [this.#estadoVisor()] };
    }
    if (datos.rol === 'panel') {
      if (!datos.esLocal || datos.token !== this.#token) {
        return { rol: null, mensajes: [error('NO_AUTORIZADO', 'Conexión de panel no autorizada.')] };
      }
      return {
        rol: 'panel',
        mensajes: [this.#estadoPanel(), { tipo: 'biblioteca', imagenes: [...this.#sesion.imagenes] }],
      };
    }
    return { rol: null, mensajes: [error('MENSAJE_INVALIDO', 'La conexión debe declarar rol=panel o rol=visor.')] };
  }

  recibir(rol: Rol, texto: string): Promise<Respuesta> {
    const resultado = this.#cola.then(() => this.#procesar(rol, texto));
    this.#cola = resultado.catch(() => {});
    return resultado;
  }

  rutaDeImagen(relativa: string): string | null {
    return this.#sesion.rutaDeImagen(relativa);
  }

  cerrar(): Promise<void> {
    return this.#sesion.cerrar();
  }

  async #procesar(rol: Rol, texto: string): Promise<Respuesta> {
    try {
      if (rol !== 'panel') throw new ErrorDominio('NO_AUTORIZADO', 'Los visores no envían acciones.');
      const mensaje = interpretarMensaje(texto);

      if (mensaje.tipo === 'abrirCampana') {
        const reparaciones = await this.#sesion.abrir(mensaje.carpeta, mensaje.crear ?? false);
        return {
          aPaneles: [this.#estadoPanel(), this.#biblioteca()],
          aVisores: [this.#estadoVisor()],
          alEmisor: reparaciones.length > 0 ? [{ tipo: 'avisoReparaciones', reparaciones }] : [],
        };
      }
      if (mensaje.tipo === 'refrescarBiblioteca') {
        await this.#sesion.refrescarBiblioteca();
        return { aPaneles: [this.#biblioteca()] };
      }

      // Al visor solo le llega la capa que cambió, comparando antes y después.
      const antes = this.#sesion.estado();
      this.#aplicar(mensaje);
      const despues = this.#sesion.estado();
      const aVisores: MensajeAlVisor[] = [];
      const escenario = escenarioPublico(despues);
      if (!mismoValor(escenarioPublico(antes), escenario)) {
        aVisores.push({ tipo: 'escenarioActivo', escenario });
      }
      const figuras = figurasPublicas(despues);
      if (!mismoValor(figurasPublicas(antes), figuras)) {
        aVisores.push({ tipo: 'figurasVisibles', figuras });
      }
      return { aPaneles: [this.#estadoPanel()], aVisores };
    } catch (e) {
      if (e instanceof ErrorDominio) return { alEmisor: [mensajeDeError(e)] };
      throw e;
    }
  }

  #aplicar(m: Accion): void {
    const sesion = this.#sesion;
    switch (m.tipo) {
      case 'crearEscenario':
        sesion.comprobarImagen(m.imagen);
        return sesion.modificar((c) => void c.crearEscenario(m.imagen, m.tipoEscenario));
      case 'crearFigura':
        sesion.comprobarImagen(m.imagen);
        return sesion.modificar((c) => void c.crearFigura(m.imagen, m.tipoFigura));
      case 'actualizarEscenario':
        if (m.cambios.imagen !== undefined) sesion.comprobarImagen(m.cambios.imagen);
        return sesion.modificar((c) => c.actualizarEscenario(m.id, m.cambios));
      case 'actualizarFigura':
        if (m.cambios.imagen !== undefined) sesion.comprobarImagen(m.cambios.imagen);
        return sesion.modificar((c) => c.actualizarFigura(m.id, m.cambios));
      case 'borrarEscenario':
        return sesion.modificar((c) => c.borrarEscenario(m.id));
      case 'borrarFigura':
        return sesion.modificar((c) => c.borrarFigura(m.id));
      case 'activarEscenario':
        return sesion.modificar((c) => c.activarEscenario(m.id));
      case 'marcarRegionInicial':
        return sesion.modificar((c) => c.marcarRegionInicial(m.id));
      case 'cambiarVisibilidadFigura':
        return sesion.modificar((c) => c.cambiarVisibilidadFigura(m.id, m.visible));
    }
  }

  #estadoPanel(): MensajeAlPanel {
    return estadoPanel(this.#sesion.carpeta, this.#sesion.estado());
  }

  #biblioteca(): MensajeAlPanel {
    return { tipo: 'biblioteca', imagenes: [...this.#sesion.imagenes] };
  }

  #estadoVisor(): MensajeAlVisor {
    const campana = this.#sesion.estado();
    return { tipo: 'estado', escenario: escenarioPublico(campana), figuras: figurasPublicas(campana) };
  }
}

function mensajeDeError(e: ErrorDominio): MensajeAlPanel {
  return error(e.codigo, e.message);
}

function error(codigo: ErrorDominio['codigo'], mensaje: string): MensajeAlPanel {
  return { tipo: 'error', codigo, mensaje };
}

// Las proyecciones se construyen siempre en el mismo orden de campos, así que
// comparar su JSON es suficiente.
function mismoValor(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
