// Punto de entrada del panel del DM (ventana de Electron, sin Node): compone
// vista, controlador y conexión. El puerto y el token llegan en la query de la
// URL desde el proceso principal.
import { ConexionPanel } from './ConexionPanel.js';
import { ControladorPanel } from './ControladorPanel.js';
import { VistaPanel } from './vista/VistaPanel.js';

declare global {
  interface Window {
    /** Lo expone la precarga (src/servidor/precarga.cts). */
    nativo: { elegirCarpeta(): Promise<string | null> };
  }
}

const parametros = new URLSearchParams(location.search);
const puerto = parametros.get('puerto') ?? '';
const token = parametros.get('token') ?? '';

const conexion = new ConexionPanel(`ws://127.0.0.1:${puerto}/ws?rol=panel&token=${encodeURIComponent(token)}`);
new ControladorPanel(
  conexion,
  () => window.nativo.elegirCarpeta(),
  (acciones) => new VistaPanel(document, `http://127.0.0.1:${puerto}`, acciones),
).iniciar();
