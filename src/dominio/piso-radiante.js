// Piso radiante eléctrico: cuánta potencia necesita el ambiente y qué llave
// térmica recomendarle al cliente.
//
// No es un diseño eléctrico completo — eso lo tiene que firmar un electricista
// para la instalación real — pero le da al vendedor un número con el que
// hablar en vez de adivinar.

import * as bd from '../core/bd.js';

export const RECETA_BASE = 'piso_radiante';

const POR_DEFECTO = {
  // Manta calefactora típica: 150-160 W/m² para piso cerámico/porcelanato.
  potenciaPorM2: 150,
};

// Llaves termomagnéticas estándar en el mercado peruano.
const LLAVES_DISPONIBLES = [10, 15, 20, 25, 32, 40, 50, 63];

// Voltaje monofásico residencial en Perú.
const VOLTAJE = 220;

// Margen de seguridad sobre la carga calculada, como pide el código eléctrico.
const MARGEN_SEGURIDAD = 1.25;

export function potenciaPorM2() {
  const cfg = bd.config('pisoRadiante', {});
  const n = Number(cfg.potenciaPorM2);
  return Number.isFinite(n) && n > 0 ? n : POR_DEFECTO.potenciaPorM2;
}

export function guardarPotenciaPorM2(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Potencia inválida' };
  bd.guardarConfig('pisoRadiante', { potenciaPorM2: n });
  return { ok: true };
}

/**
 * @param {number} m2
 * @returns {{watts:number, amperios:number, llaveRecomendada:number}}
 */
export function calcularPotencia(m2) {
  const area = Number(m2) || 0;
  const watts = Math.round(area * potenciaPorM2());
  const amperios = (watts * MARGEN_SEGURIDAD) / VOLTAJE;
  const llaveRecomendada =
    LLAVES_DISPONIBLES.find((a) => a >= amperios) || LLAVES_DISPONIBLES.at(-1);
  return { watts, amperios: Number(amperios.toFixed(1)), llaveRecomendada };
}

/** Un termostato por ambiente, no por m²: se agrega aparte de la receta. */
export const CANTIDADES_FIJAS = { 'termostato-piso-radiante': 1 };
