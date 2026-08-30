// Enrutador por hash (#/pedidos). Sin dependencias y sin configuración de
// servidor: al ser hash, funciona igual abriendo el archivo o en Vercel.

import { registrar, avisarEnPantalla } from './errores.js';
import { puede } from './auth.js';

const rutas = new Map();
let contenedor = null;
let rutaPorDefecto = '/';
let alCambiar = null;

/**
 * @param {string} camino    '/pedidos'
 * @param {object} config
 *   - titulo: string
 *   - permiso: permiso requerido (opcional)
 *   - vista: async (contenedor, parametros) => void
 */
export function registrarRuta(camino, config) {
  rutas.set(camino, config);
}

export function iniciar({ montarEn, porDefecto = '/', alCambiarRuta = null }) {
  contenedor = montarEn;
  rutaPorDefecto = porDefecto;
  alCambiar = alCambiarRuta;
  window.addEventListener('hashchange', () => resolver());
  resolver();
}

export function ir(camino) {
  window.location.hash = '#' + camino;
}

export function rutaActual() {
  return partes().camino;
}

/**
 * Parte el hash en camino y parámetros: '#/pedidos?estado=activos' da
 * {camino: '/pedidos', parametros: {estado: 'activos'}}.
 *
 * El camino sale limpio a propósito: el menú compara contra él para saber qué
 * pestaña marcar, y con la consulta pegada nunca coincidiría.
 */
function partes() {
  const bruto = window.location.hash.replace(/^#/, '') || rutaPorDefecto;
  const corte = bruto.indexOf('?');
  if (corte === -1) return { camino: bruto, parametros: {} };

  const parametros = {};
  for (const par of bruto.slice(corte + 1).split('&')) {
    if (!par) continue;
    const [clave, valor = ''] = par.split('=');
    parametros[decodeURIComponent(clave)] = decodeURIComponent(valor);
  }
  return { camino: bruto.slice(0, corte), parametros };
}

export function rutasVisibles() {
  return Array.from(rutas.entries())
    .filter(([, config]) => !config.permiso || puede(config.permiso))
    .filter(([, config]) => config.enMenu !== false)
    .map(([camino, config]) => ({ camino, ...config }));
}

async function resolver() {
  if (!contenedor) return;

  const { camino, parametros } = partes();
  const config = rutas.get(camino);

  if (!config) {
    mostrarMensaje('Esa pantalla no existe.', 'Volver al inicio');
    return;
  }

  if (config.permiso && !puede(config.permiso)) {
    mostrarMensaje(
      'No tienes permiso para ver esta pantalla.',
      'Volver al inicio',
    );
    return;
  }

  try {
    contenedor.replaceChildren();
    contenedor.setAttribute('aria-busy', 'true');
    await config.vista(contenedor, parametros);
    if (typeof alCambiar === 'function') alCambiar(camino, config);
  } catch (error) {
    // Una vista rota muestra un aviso; el resto del sistema sigue en pie.
    registrar('router:' + camino, error);
    avisarEnPantalla('No se pudo abrir esa pantalla.');
    mostrarMensaje(
      'Ocurrió un error al abrir esta pantalla. El resto del sistema sigue funcionando.',
      'Volver al inicio',
    );
  } finally {
    contenedor.setAttribute('aria-busy', 'false');
  }
}

function mostrarMensaje(texto, textoBoton) {
  contenedor.replaceChildren();
  const caja = document.createElement('div');
  caja.className = 'pantalla-vacia';

  const parrafo = document.createElement('p');
  parrafo.textContent = texto;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton';
  boton.textContent = textoBoton;
  boton.onclick = () => ir(rutaPorDefecto);

  caja.append(parrafo, boton);
  contenedor.appendChild(caja);
}
