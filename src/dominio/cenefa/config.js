// Cielo raso 3D flotante: medidas por defecto y diseños predeterminados.

import * as bd from '../../core/bd.js';

export const NOMBRE_TRABAJO = 'Cielo raso 3D flotante';

export const FORMAS = { CUADRADA: 'cuadrada', REDONDA: 'redonda' };
export const LED = { ESCONDIDA: 'escondida', VISIBLE: 'visible', NINGUNA: 'ninguna' };

const POR_DEFECTO = {
  anchoBanda: 0.4,
  altoCaida: 0.15,
  manoObraPorM2: 60,
};

export function config() {
  return { ...POR_DEFECTO, ...(bd.config('cenefa', {}) || {}) };
}

export function guardarConfig(cambios) {
  const actual = config();
  const nueva = { ...actual };
  for (const [clave, valor] of Object.entries(cambios || {})) {
    const n = Number(valor);
    if (Number.isFinite(n) && n > 0) nueva[clave] = n;
  }
  bd.guardarConfig('cenefa', nueva);
  return { ok: true, config: nueva };
}

/**
 * Diseños predeterminados: lo único que cambia entre ellos es la forma. El
 * resto (medidas, LED, plancha) lo elige el vendedor igual en cualquier caso.
 */
export const DISENOS = [
  { id: 'cuadrada', nombre: 'Cenefa cuadrada', forma: FORMAS.CUADRADA },
  { id: 'redonda', nombre: 'Cenefa redonda', forma: FORMAS.REDONDA },
];

export function diseno(id) {
  return DISENOS.find((d) => d.id === id) || DISENOS[0];
}
