// Cielo raso suspendido con baldosas de 61 × 61 cm.
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

  // Cuánto alambre se gasta en cada punto. Depende de qué tan abajo va el
  // cielo raso respecto de la losa, así que cambia en cada obra.
  cmAlambrePorPunto: 100,

  // Separación de los clavos con fulminante en el ángulo perimetral.
  // Los manuales piden 30 cm como máximo.
  pasoClavos: 30,

  // Un tornillo por cada punto de alambre.
  tornillosPorPunto: 1,

  // Cuántos pares de clavo + fulminante trae un combo. Se cobra por combo.
  paresPorCombo: 100,

  // Piezas sobrantes más cortas que esto no se guardan: no valen el espacio.
  minimoSobranteUtil: 15,

  // Mano de obra por m² instalado. En cero no se cobra instalación.
  manoObraPorM2: 0,
};

/** Precios unitarios en soles. */
export const PRECIOS_POR_DEFECTO = {
  principal: 7.3,
  secundaria: 2.2,
  terciaria: 1.2,
  perimetral: 4,
  baldosa: 0,
  alambre: 8, // por metro
  comboClavos: 20, // combo de 100 pares
  tornillo: 0, // sin precio definido: cárgalo en Ajustes
};

export const NOMBRES = {
  perimetral: 'Ángulo perimetral',
  principal: 'T principal',
  secundaria: 'T secundaria',
  terciaria: 'T terciaria',
  baldosa: 'Baldosa vinílica 61 × 61',
  alambre: 'Alambre galvanizado',
  tornillo: 'Tornillo de fijación',
  comboClavos: 'Combo clavo + fulminante',
};

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
    const n = Number(valor);
    if (Number.isFinite(n) && n > 0) nueva[clave] = n;
  }
  bd.guardarConfig('suspendido', nueva);
  return { ok: true, config: nueva };
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
