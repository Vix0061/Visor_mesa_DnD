// Punto de entrada del visor: compone vista, controlador y conexión.
import { ConexionVisor } from './ConexionVisor.js';
import { ControladorVisor } from './ControladorVisor.js';
import { CapaEscenario } from './vista/CapaEscenario.js';
import { CapaFiguras } from './vista/CapaFiguras.js';
import { IndicadorConexion } from './vista/IndicadorConexion.js';

function elemento(id: string): HTMLElement {
  const encontrado = document.getElementById(id);
  if (!encontrado) throw new Error(`Falta #${id} en index.html`);
  return encontrado;
}

const conexion = new ConexionVisor(`ws://${location.host}/ws?rol=visor`);
new ControladorVisor(
  conexion,
  new CapaEscenario(elemento('escenario')),
  new CapaFiguras(elemento('figuras')),
  new IndicadorConexion(elemento('conexion')),
).iniciar();
