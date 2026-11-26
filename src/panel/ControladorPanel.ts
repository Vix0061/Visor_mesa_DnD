import type { CampanaPanel, MensajeAlPanel, MensajePanel } from '../compartido/mensajes.js';
import type { ConexionPanel } from './ConexionPanel.js';
import type { AccionesPanel, EstadoPanel, Seleccion, VistaPanel } from './vista/VistaPanel.js';

/**
 * Guarda el estado del panel (lo último recibido del servidor más la
 * selección) y lo redibuja entero tras cada mensaje. No es optimista: las
 * acciones del DM se envían y la vista cambia cuando llega el nuevo estado.
 */
export class ControladorPanel implements AccionesPanel {
  readonly #conexion: ConexionPanel;
  readonly #elegirCarpeta: () => Promise<string | null>;
  readonly #vista: VistaPanel;
  readonly #estado: EstadoPanel = {
    conectado: false,
    urls: [],
    carpeta: null,
    campana: null,
    imagenes: [],
    seleccion: null,
  };
  /** Carpeta del último abrirCampana, por si responde CAMPANA_INEXISTENTE. */
  #carpetaPedida: string | null = null;
  /** Tras crear, la entidad nueva queda seleccionada al llegar el estado. */
  #creando: Seleccion['clase'] | null = null;

  constructor(
    conexion: ConexionPanel,
    elegirCarpeta: () => Promise<string | null>,
    crearVista: (acciones: AccionesPanel) => VistaPanel,
  ) {
    this.#conexion = conexion;
    this.#elegirCarpeta = elegirCarpeta;
    this.#vista = crearVista(this);
    conexion.alRecibir = (mensaje) => this.#recibir(mensaje);
    conexion.alCambiarEstado = (conectada) => {
      this.#estado.conectado = conectada;
      if (!conectada) this.#vista.avisar('error', 'Se perdió la conexión con el servidor. Reinicia la aplicación.');
      this.#vista.dibujar(this.#estado);
    };
  }

  iniciar(): void {
    this.#vista.dibujar(this.#estado);
    this.#conexion.conectar();
  }

  // ---- Acciones de la vista ----

  enviar(mensaje: MensajePanel): void {
    if (mensaje.tipo === 'abrirCampana') this.#carpetaPedida = mensaje.carpeta;
    if (mensaje.tipo === 'crearEscenario') this.#creando = 'escenario';
    if (mensaje.tipo === 'crearFigura') this.#creando = 'figura';
    if (!this.#conexion.enviar(mensaje)) this.#vista.avisar('error', 'Sin conexión con el servidor.');
  }

  abrirCampana(): void {
    void this.#elegirCarpeta().then((carpeta) => {
      if (carpeta !== null) this.enviar({ tipo: 'abrirCampana', carpeta });
    });
  }

  seleccionar(seleccion: Seleccion): void {
    this.#estado.seleccion = seleccion;
    this.#vista.dibujar(this.#estado);
  }

  // ---- Mensajes del servidor ----

  #recibir(mensaje: MensajeAlPanel): void {
    switch (mensaje.tipo) {
      case 'infoServidor':
        this.#estado.urls = mensaje.urls;
        break;
      case 'estadoPanel': {
        const otraCarpeta = mensaje.carpeta !== this.#estado.carpeta;
        const anterior = this.#estado.campana;
        this.#estado.carpeta = mensaje.carpeta;
        this.#estado.campana = mensaje.campana;
        this.#estado.seleccion = otraCarpeta ? null : this.#seleccionTras(anterior, mensaje.campana);
        break;
      }
      case 'biblioteca':
        this.#estado.imagenes = mensaje.imagenes;
        break;
      case 'avisoReparaciones':
        this.#vista.avisar(
          'aviso',
          'La campaña tenía datos incoherentes y se repararon al abrirla. El original se copió en campana.json.bak.',
          mensaje.reparaciones,
        );
        break;
      case 'error':
        this.#creando = null;
        if (mensaje.codigo === 'CAMPANA_INEXISTENTE' && this.#carpetaPedida !== null) {
          void this.#ofrecerCrear(this.#carpetaPedida);
        } else {
          this.#vista.avisar('error', mensaje.mensaje);
        }
        break;
    }
    // También tras un error: deshace en los controles lo que el servidor rechazó.
    this.#vista.dibujar(this.#estado);
  }

  async #ofrecerCrear(carpeta: string): Promise<void> {
    const crear = await this.#vista.confirmar(
      `Esta carpeta no tiene una campaña. ¿Crear una nueva aquí?\n\n${carpeta}`,
      'Crear campaña',
    );
    if (crear) this.enviar({ tipo: 'abrirCampana', carpeta, crear: true });
  }

  /** La entidad recién creada si la hay; si no, la selección actual mientras exista. */
  #seleccionTras(anterior: CampanaPanel | null, nueva: CampanaPanel | null): Seleccion | null {
    const creando = this.#creando;
    this.#creando = null;
    if (!nueva) return null;
    if (creando && anterior) {
      const previos = new Set(entidades(anterior, creando).map((e) => e.id));
      const creada = entidades(nueva, creando).find((e) => !previos.has(e.id));
      if (creada) return { clase: creando, id: creada.id };
    }
    const actual = this.#estado.seleccion;
    return actual && entidades(nueva, actual.clase).some((e) => e.id === actual.id) ? actual : null;
  }
}

function entidades(campana: CampanaPanel, clase: Seleccion['clase']): readonly { id: string }[] {
  return clase === 'escenario' ? campana.escenarios : campana.figuras;
}
