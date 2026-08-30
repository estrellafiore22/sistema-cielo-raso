// Cielo raso vinil: retícula de T con baldosa vinílica de 61 × 61 cm.
// Medidas y precios base. Todo es editable por el administrador.

import * as bd from '../../core/bd.js';

/** Largos de fábrica, en centímetros. */
export const LARGOS = {
  perimetral: 305, // ángulo perimetral 3050 mm
  principal: 366, // T principal 3660 mm
  secundaria: 122, // T secundaria 1220 mm
  terciaria: 61, // T terciaria 610 mm
  baldosa: 61, // baldosa 610 × 610 mm
};

/** Módulo de la retícula: la baldosa manda. */
export const MODULO = 61;

/** Separación entre T principales: dos módulos. */
export const PASO_PRINCIPAL = 122;

export const CONFIG_POR_DEFECTO = {
  // Separación entre puntos de suspensión, sobre la T principal.
  // 122 cm es lo que exige la ASTM C636 (4 pies) y lo que repiten los
  // manuales de instalación en español.
  pasoAlambre: 122,

  // Cuánto cuelga el cielo raso por debajo de la losa, en centímetros.
  // Cambia en cada obra, así que se edita desde la misma tabla de materiales.
  distanciaLosa: 90,

  // Lo que se gasta de más en cada punto para amarrar el alambre arriba y
  // abajo. El largo por punto es la distancia a la losa más este sobrante.
  sobranteAmarre: 10,

  // Separación de los clavos con fulminante en el ángulo perimetral.
  // Los manuales piden 30 cm como máximo.
  pasoClavos: 30,

  // Un tornillo por cada punto de alambre.
  tornillosPorPunto: 1,

  // Cuántos pares de clavo + fulminante trae un combo. Se cobra por combo.
  paresPorCombo: 100,

  // Piezas sobrantes más cortas que esto no se guardan: no valen el espacio.
  minimoSobranteUtil: 15,

  // Lo que se le cobra al cliente por m² instalado. Es el precio de lista.
  precioM2: 30,

  // Precios especiales que el vendedor puede elegir en vez del de lista.
  promociones: { promo1: 29, promo2: 28, promo3: 27 },

  // Lo que le cuesta a la tienda instalar un m². No se le muestra al cliente.
  manoObraPorM2: 5.5,

  // Cuántos m² alcanza a instalar un trabajador en un día. El calendario lo
  // usa para saber cuántos trabajos le caben.
  m2PorTrabajadorDia: 40,
};

/** Precios unitarios en soles. */
export const PRECIOS_POR_DEFECTO = {
  principal: 7.3,
  secundaria: 2.2,
  terciaria: 1.2,
  perimetral: 4,
  baldosa: 3.5,
  alambre: 8, // por metro
  comboClavos: 20, // combo de 100 pares
  tornillo: 1.5, // fijación tipo L
};

export const NOMBRES = {
  perimetral: 'Ángulo perimetral',
  principal: 'T principal',
  secundaria: 'T secundaria',
  terciaria: 'T terciaria',
  baldosa: 'Baldosa vinílica 61 × 61',
  alambre: 'Alambre galvanizado',
  // El tipo L va clavado a la losa y de ahí cuelga el alambre.
  tornillo: 'Fijación tipo L',
  comboClavos: 'Combo clavo + fulminante',
};

/** Nombre del sistema, tal como lo conoce la tienda. */
export const NOMBRE_TRABAJO = 'Cielo raso vinil';

/**
 * Las medidas se cargan en metros, que es como se miden en obra, pero todo el
 * cálculo trabaja en centímetros.
 */
export function aCentimetros(medidas) {
  return {
    ancho: (Number(medidas?.ancho) || 0) * 100,
    largo: (Number(medidas?.largo) || 0) * 100,
    orientacion: medidas?.orientacion || 'auto',
  };
}

/** Colores del plano. Cada material se distingue por color y grosor. */
export const COLORES = {
  perimetral: '#1b3a5c',
  principal: '#c0392b',
  secundaria: '#1f7a4d',
  terciaria: '#b8860b',
  baldosaCorte: '#e8a0a0',
  cota: '#6b7280',
  cotaRecorte: '#c0392b',
};

export function config() {
  return { ...CONFIG_POR_DEFECTO, ...(bd.config('suspendido', {}) || {}) };
}

export function guardarConfig(cambios) {
  const actual = config();
  const nueva = { ...actual };

  for (const [clave, valor] of Object.entries(cambios)) {
    if (clave === 'promociones') {
      nueva.promociones = { ...actual.promociones, ...numeros(valor) };
      continue;
    }
    const n = Number(valor);
    // La mano de obra puede quedar en cero; las separaciones no.
    if (Number.isFinite(n) && n >= 0) nueva[clave] = n;
  }

  bd.guardarConfig('suspendido', nueva);
  return { ok: true, config: nueva };
}

function numeros(objeto) {
  const salida = {};
  for (const [clave, valor] of Object.entries(objeto || {})) {
    const n = Number(valor);
    if (Number.isFinite(n) && n >= 0) salida[clave] = n;
  }
  return salida;
}

/** Precios que puede elegir el vendedor, con el de lista primero. */
export function tarifasCliente() {
  const cfg = config();
  const promos = cfg.promociones || {};
  return [
    { id: 'lista', nombre: 'Precio de lista', precio: Number(cfg.precioM2) || 0 },
    { id: 'promo1', nombre: 'Promoción 1', precio: Number(promos.promo1) || 0 },
    { id: 'promo2', nombre: 'Promoción 2', precio: Number(promos.promo2) || 0 },
    { id: 'promo3', nombre: 'Promoción 3', precio: Number(promos.promo3) || 0 },
  ].filter((t) => t.id === 'lista' || t.precio > 0);
}

/** Devuelve la tarifa elegida, o la de lista si el id no existe. */
export function tarifaElegida(id) {
  const lista = tarifasCliente();
  return lista.find((t) => t.id === id) || lista[0];
}

export function precios() {
  return { ...PRECIOS_POR_DEFECTO, ...(bd.config('suspendidoPrecios', {}) || {}) };
}

export function guardarPrecios(cambios) {
  const nueva = { ...precios() };
  for (const [clave, valor] of Object.entries(cambios)) {
    const n = Number(valor);
    if (Number.isFinite(n) && n >= 0) nueva[clave] = n;
  }
  bd.guardarConfig('suspendidoPrecios', nueva);
  return { ok: true, precios: nueva };
}
